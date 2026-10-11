// NAV-03 — List Chapters
// Source: CEPV2_Stories/07_ClassNavigation.md

const { test, expect } = require('../../fixtures');

const topicNames = async (user) =>
  (await user.nav.topicItems.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());

test.describe('NAV-03 List Chapters', () => {
  test(
    'NAV-03-01: the chapter list displays correctly for a selected grade/subject',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.nav.resetToClass('Class 9', 'A', 'Hindi Language');
      await user.nav.openChaptersPopup();
      await expect(user.nav.chapterItems.first()).toBeVisible();
      const hindi = await user.nav.chapterItems.allInnerTexts();
      await user.nav.openChaptersPopup(); // close

      await user.nav.resetToClass('Class 12', 'A', 'Physics');
      await user.nav.openChaptersPopup();
      await expect(user.nav.chapterItems.first()).toBeVisible();
      const physics = await user.nav.chapterItems.allInnerTexts();

      test
        .info()
        .annotations.push({ type: 'note', description: `Chapters: Hindi=${hindi.length}, Physics=${physics.length}` });
      expect(hindi, 'Class 9A Hindi has its 29 chapters').toHaveLength(29);
      expect(physics.length).toBeGreaterThan(0);
      expect(hindi, 'the list follows the selected subject').not.toEqual(physics);
    }
  );

  test(
    'NAV-03-02: adjacent chapters show their own content, not a neighbour’s',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.resetToClass('Class 12', 'A', 'Physics');

      // A chapter's topics show once it is the current chapter (see NavigationPage.showTopicsOf).
      await user.nav.showTopicsOf(0);
      const first = await topicNames(user);
      await user.nav.showTopicsOf(1);
      const second = await topicNames(user);
      expect(first.length).toBeGreaterThan(0);
      expect(second.length).toBeGreaterThan(0);
      expect(second, 'chapter 2 does not show chapter 1’s topics').not.toEqual(first);

      // Going back shows chapter 1's own topics again — stable, not leftover state.
      await user.nav.showTopicsOf(0);
      expect(await topicNames(user)).toEqual(first);
    }
  );

  test('NAV-03-03: "subject not visible" does not recur', { tag: ['@regression'] }, async ({ user }) => {
    const expectations = [
      ['Class 12', 'A', 'Physics'],
      ['Class 12', 'A', 'Computer Science'],
      ['Class 11', 'A', 'Accountancy'],
      ['Class 9', 'A', 'Hindi Language'],
      ['Class 5', 'A', 'Mathematics'],
    ];
    await user.nav.openClassPopup();
    await user.nav.allMyClassesTab.click({ timeout: 10000 });
    for (const [grade, division, subject] of expectations) {
      await user.nav.gradeButton(grade).click({ timeout: 10000 });
      await user.nav.divisionButton(division).click({ timeout: 10000 });
      await expect(user.nav.subjectButton(subject), `${grade} ${division}: ${subject} is visible`).toBeVisible({
        timeout: 10000,
      });
    }
  });

  /** The leading chapter/topic number of each label ("3. Current Electricity" -> [3], "1.2 | Coulomb" -> [1, 2]). */
  const numbersOf = (labels) => labels.map((t) => (t.match(/(\d+)/) || []).slice(1).map(Number)); // "Chapter 3. Current Electricity" -> [3]
  const inOrder = (nums) =>
    nums.every(
      (n, i) => i === 0 || n[0] > nums[i - 1][0] || (n[0] === nums[i - 1][0] && (n[1] || 0) > (nums[i - 1][1] || 0))
    );

  test('NAV-03-04: chapters are listed in number order', { tag: ['@functional'] }, async ({ user }) => {
    await user.nav.resetToClass('Class 12', 'A', 'Physics');
    await user.nav.openChaptersPopup();
    await expect(user.nav.chapterItems.first()).toBeVisible();
    const labels = await user.nav.chapterItems.allInnerTexts();
    await user.nav.openChaptersPopup(); // close
    const nums = numbersOf(labels);
    test
      .info()
      .annotations.push({ type: 'note', description: `Chapter order: ${nums.map((n) => n.join('.')).join(', ')}` });
    expect(
      nums.every((n) => n.length > 0),
      'every chapter is numbered'
    ).toBe(true);
    expect(inOrder(nums), `chapters in number order (${nums.map((n) => n.join('.')).join(', ')})`).toBe(true);
  });

  test('NAV-03-05: no chapter is listed twice or with an empty name', { tag: ['@negative'] }, async ({ user }) => {
    const problems = [];
    for (const [grade, division, subject] of [
      ['Class 12', 'A', 'Physics'],
      ['Class 9', 'A', 'Hindi Language'],
      ['Class 11', 'A', 'Accountancy'],
      ['Class 5', 'A', 'Mathematics'],
    ]) {
      await user.nav.resetToClass(grade, division, subject);
      await user.nav.openChaptersPopup();
      await expect(user.nav.chapterItems.first(), `${grade}${division} ${subject}: chapters listed`).toBeVisible();
      const names = (await user.nav.chapterItems.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
      await user.nav.openChaptersPopup(); // close
      // The name itself, without its number ("3. Light" -> "Light").
      const bare = names.map((n) => n.replace(/^\d+\s*[.)-]?\s*/, '').trim());
      bare.forEach((n, i) => {
        if (!n) problems.push(`${grade}${division} ${subject}: chapter ${i + 1} has no name ("${names[i]}")`);
      });
      const seen = new Set();
      for (const n of names) {
        if (seen.has(n)) problems.push(`${grade}${division} ${subject}: "${n}" listed twice`);
        seen.add(n);
      }
    }
    expect(problems, 'every chapter is listed once, with a name').toEqual([]);
  });
});
