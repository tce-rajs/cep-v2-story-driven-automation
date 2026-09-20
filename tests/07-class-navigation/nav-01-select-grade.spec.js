// NAV-01 — Select Grade
// Source: CEPV2_Stories/07_ClassNavigation.md
// Not automated (per PROCESS.md, Plan Mode is manual-only): NAV-01-06.
//
// Known data on the primary QA account (config/moduleClassMap.js): Class 12A = Physics / Computer Science /
// Mathematics, Class 11A = Accountancy / Mathematics, Class 9A = Hindi Language, Class 5A = Mathematics.

const { test, expect } = require('../../fixtures');

const classText = async (user) => ((await user.nav.currentClassBtn.innerText()) || '').replace(/\s+/g, ' ').trim();

/** Subject pills offered after choosing a grade and division in All My Classes. */
const subjectsFor = async (user, grade, division) => {
  await user.nav.allMyClassesTab.click({ timeout: 10000 });
  await user.nav.gradeButton(grade).click({ timeout: 10000 });
  await user.nav.divisionButton(division).click({ timeout: 10000 });
  await user.nav.subjectButtons.first().waitFor({ state: 'visible', timeout: 10000 });
  return (await user.nav.subjectButtons.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
};

test.describe('NAV-01 Select Grade', () => {
  test(
    'NAV-01-01: clicking the existing class opens two sections, "Recent Classes" and "All My Classes"',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.nav.openClassPopup();
      await expect(user.nav.recentClassesTab).toBeVisible();
      await expect(user.nav.allMyClassesTab).toBeVisible();
    }
  );

  test(
    'NAV-01-02: "Recent Classes" shows the class(es) most recently selected',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.resetToClass('Class 9', 'A', 'Hindi Language');
      await user.nav.resetToClass('Class 12', 'A', 'Physics'); // the most recent selection

      await user.nav.openClassPopup();
      await user.nav.recentClassesTab.click({ timeout: 5000 });
      await expect(user.nav.recentClassButtons.first()).toBeVisible();
      await expect(user.nav.recentClassButtons.first(), 'most recent first').toContainText(/Physics/i);
      // The list holds several classes (and more than one Hindi class), so the previous selection is checked by
      // position: it is listed right after the most recent one.
      await expect(user.nav.recentClassButtons.nth(1), 'the previous class is listed next').toContainText(
        /Class 9\s*\|\s*A\s*\|\s*Hindi/i
      );
    }
  );

  test('NAV-01-03: "All My Classes" shows the complete list of classes', { tag: ['@functional'] }, async ({ user }) => {
    await user.nav.openClassPopup();
    await user.nav.allMyClassesTab.click({ timeout: 10000 });
    await expect(user.nav.gradeButtons.first()).toBeVisible();

    const grades = (await user.nav.gradeButtons.allInnerTexts()).map((t) => t.trim());
    test.info().annotations.push({ type: 'note', description: `Grades listed: ${grades.join(', ')}` });
    for (const grade of ['Class 5', 'Class 9', 'Class 11', 'Class 12']) {
      expect(grades, `${grade} is listed`).toContain(grade);
    }
  });

  test(
    'NAV-01-04: selecting a class from either section sets the correct Division for that class',
    { tag: ['@functional'] },
    async ({ user }) => {
      // From All My Classes.
      await user.nav.resetToClass('Class 11', 'A', 'Mathematics');
      expect(await classText(user), 'division A set from All My Classes').toMatch(/11\s*A\b/i);

      // From Recent Classes: choose the other recent class and its division must follow.
      await user.nav.resetToClass('Class 12', 'A', 'Physics');
      await user.nav.openClassPopup();
      await user.nav.recentClassesTab.click({ timeout: 5000 });
      await user.nav.recentClassButtons
        .filter({ hasText: /Mathematics/i })
        .first()
        .click({ timeout: 10000 });
      await expect(user.nav.currentClassBtn).toContainText(/Mathematics/i);
      expect(await classText(user), 'division follows the class chosen from Recent Classes').toMatch(/11\s*A\b/i);
    }
  );

  test(
    'NAV-01-05: the Subjects shown update correctly based on the selected class’s Division',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.openClassPopup();
      const class12 = await subjectsFor(user, 'Class 12', 'A');
      const class5 = await subjectsFor(user, 'Class 5', 'A');
      test
        .info()
        .annotations.push({ type: 'note', description: `12A: ${class12.join(', ')} | 5A: ${class5.join(', ')}` });

      expect(class12.join(' ')).toMatch(/Physics/i);
      expect(class5.join(' ')).toMatch(/Mathematics/i);
      expect(class12, 'subjects differ between classes — the list follows the selection').not.toEqual(class5);
    }
  );
});
