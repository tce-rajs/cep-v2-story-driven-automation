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

  // --- Added 2026-09-26 (gap-fill from the reference suite's Grade/Subject/Division workbook) ---

  const isOn = (locator) =>
    locator.evaluate((el) =>
      /active|selected|mdc-chip-selected|checked/i.test(
        el.className + ' ' + (el.getAttribute('aria-selected') || '') + ' ' + (el.getAttribute('aria-pressed') || '')
      )
    );

  // Choosing the second Recent class: it switches to it (NAV-01-07), and it moves to the top of the list (NAV-01-15) --
  // one test each (split 2026-09-28).
  /** Choose the second class in Recent Classes; returns its label ("Class 12 | A | Physics") and subject. */
  const chooseSecondRecent = async (user) => {
    await user.nav.ensureRecentClasses(3);
    await user.nav.openClassPopup();
    await user.nav.recentClassesTab.click({ timeout: 5000 });
    const second = user.nav.recentClassButtons.nth(1);
    const label = (await second.innerText()).replace(/\s+/g, ' ').trim();
    await second.click();
    return { label, subject: label.split('|').pop().trim() };
  };

  test('NAV-01-07: choosing a class from Recent Classes switches to it', { tag: ['@functional'] }, async ({ user }) => {
    const { subject } = await chooseSecondRecent(user);
    await expect(user.nav.currentClassBtn, 'switched to the chosen class').toContainText(subject, { timeout: 10000 });
  });

  test(
    'NAV-01-15: a class chosen from Recent Classes moves to the top of the list',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { label, subject } = await chooseSecondRecent(user);
      await expect(user.nav.currentClassBtn, 'set-up: switched').toContainText(subject, { timeout: 10000 });
      await user.nav.openClassPopup();
      await user.nav.recentClassesTab.click({ timeout: 5000 });
      const top = user.nav.recentClassButtons.first();
      await expect(top, 'moved to the top').toContainText(subject);
      await expect(top).toContainText(label.split('|')[0].trim());
    }
  );

  test(
    'NAV-01-08: a grade with only one division selects that division automatically',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.openClassPopup();
      await user.nav.allMyClassesTab.click({ timeout: 10000 });
      await user.nav.gradeButton('Class 5').click({ timeout: 10000 });
      await expect(user.nav.divisionButtons).toHaveCount(1);
      expect(await isOn(user.nav.divisionButtons.first()), 'the only division is already selected').toBe(true);
      await expect(user.nav.subjectButtons.first(), 'subjects shown without choosing a division').toBeVisible({
        timeout: 5000,
      });
    }
  );

  test(
    'NAV-01-09: choosing a subject switches class straight away, with no separate confirm step',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.resetToClass('Class 12', 'A', 'Physics');
      await user.nav.openClassPopup();
      await user.nav.allMyClassesTab.click({ timeout: 10000 });
      await user.nav.gradeButton('Class 9').click();
      await user.nav.divisionButton('A').click();
      await user.nav.subjectButton('Hindi Language').click();
      await expect(user.nav.currentClassBtn).toContainText('Hindi Language', { timeout: 10000 });
      await expect(user.nav.allMyClassesTab, 'popup closed by itself').toBeHidden({ timeout: 5000 });
    }
  );

  test(
    'NAV-01-10: changing the grade after a subject is chosen clears the subject choice',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.resetToClass('Class 12', 'A', 'Physics');
      await user.nav.openClassPopup();
      await user.nav.allMyClassesTab.click({ timeout: 10000 });
      await user.nav.gradeButton('Class 12').click();
      await user.nav.divisionButton('A').click();
      await user.nav.gradeButton('Class 9').click();
      await user.nav.page.waitForTimeout(800);
      const selected = await user.nav.subjectButtons.evaluateAll((els) =>
        els.filter((el) => /active|selected/i.test(el.className)).map((el) => el.innerText.trim())
      );
      expect(selected, 'no subject still selected from the previous grade').toEqual([]);
    }
  );

  test(
    'NAV-01-11: closing the class window without choosing anything leaves the current class unchanged',
    { tag: ['@functional'] },
    async ({ user }) => {
      const before = await classText(user);
      await user.nav.openClassPopup();
      await user.nav.allMyClassesTab.click({ timeout: 10000 });
      await user.nav.gradeButton('Class 9').click();
      await user.nav.currentClassBtn.click(); // toggles the popup closed
      await expect(user.nav.allMyClassesTab).toBeHidden({ timeout: 5000 });
      expect(await classText(user)).toBe(before);
    }
  );

  test(
    'NAV-01-12: clicking several grades quickly ends on the last grade clicked',
    { tag: ['@edge'] },
    async ({ user }) => {
      await user.nav.openClassPopup();
      await user.nav.allMyClassesTab.click({ timeout: 10000 });
      for (const grade of ['Class 12', 'Class 9', 'Class 11', 'Class 5'])
        await user.nav.gradeButton(grade).click({ force: true });
      await expect
        .poll(() => isOn(user.nav.gradeButton('Class 5').first()), { message: 'Class 5 selected' })
        .toBe(true);
      for (const other of ['Class 12', 'Class 9', 'Class 11'])
        expect(await isOn(user.nav.gradeButton(other).first()), `${other} not selected`).toBe(false);
      await expect(user.nav.subjectButton('Mathematics')).toBeVisible({ timeout: 5000 });
    }
  );

  test(
    "NAV-01-13: switching quickly between Recent Classes and All My Classes always shows the selected tab's list",
    { tag: ['@edge'] },
    async ({ user }) => {
      await user.nav.openClassPopup();
      for (let i = 0; i < 5; i++) {
        await user.nav.allMyClassesTab.click({ force: true });
        await user.nav.recentClassesTab.click({ force: true });
      }
      await expect(user.nav.recentClassButtons.first(), 'Recent list shown').toBeVisible();
      await expect(user.nav.gradeButtons.first(), 'All My Classes list not shown').toBeHidden();
      await user.nav.allMyClassesTab.click();
      await expect(user.nav.gradeButtons.first()).toBeVisible();
    }
  );

  test(
    'NAV-01-14: opening the class window and then the chapter window at once never leaves both open',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await user.nav.currentClassBtn.click();
      await user.nav.currentChapterTopicBtn.click({ force: true });
      await page.waitForTimeout(1500);
      const classOpen = await user.nav.allMyClassesTab.isVisible().catch(() => false);
      const chapterOpen = await user.nav.chapterTpPopup.isVisible().catch(() => false);
      expect(classOpen && chapterOpen, 'not both windows open').toBe(false);
    }
  );
});
