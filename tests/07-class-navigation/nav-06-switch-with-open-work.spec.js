// NAV-06 — Switching class while other work is open
// Source: CEPV2_Stories/07_ClassNavigation.md
// Data: 'playersDefault' (Class 12A Computer Science, ch 14) holds a Video; 'default' (Class 12A Physics) has Magnet.

const { test, expect } = require('../../fixtures');

test.describe('NAV-06 Switching class while other work is open', () => {
  // With a video playing, switching class: the player closes (NAV-06-01), and the video stops (NAV-06-06) -- one test
  // each (split 2026-09-28).
  const switchClassWithVideoPlaying = async (user, page) => {
    await user.nav.applyClassMap('playersDefault');
    await user.playlist.ensureDrawerVisible();
    await user.player.openResourceCard(user.player.videoCards);
    expect(await user.player.isPlayerOpen(), 'set-up: video player open').toBe(true);
    const video = page.locator('video').filter({ visible: true }).first();
    await video.evaluate((v) => v.play().catch(() => {})).catch(() => {});
    await user.nav.resetToClass('Class 12', 'A', 'Physics');
  };

  test('NAV-06-01: switching class closes an open player', { tag: ['@functional'] }, async ({ user, page }) => {
    await switchClassWithVideoPlaying(user, page);
    await expect(user.player.closeIcon.first(), 'player closed').toBeHidden({ timeout: 10000 });
  });

  test('NAV-06-06: switching class stops a playing video', { tag: ['@functional'] }, async ({ user, page }) => {
    await switchClassWithVideoPlaying(user, page);
    await expect
      .poll(() => page.locator('video').evaluateAll((vs) => vs.filter((v) => !v.paused && !v.ended).length), {
        message: 'no video still playing',
        timeout: 10000,
      })
      .toBe(0);
  });

  test(
    'NAV-06-02: switching class while a Magnet panel is open leaves no panel behind',
    { tag: ['@functional', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; same as the reference suite's AIH-BREAK-01): while the
      // Homework panel is open, its container (playlist-grade-subject-chapter-tp-wrapper) sits over the Current Class
      // control and intercepts every click, so the class cannot be switched until the panel is closed.
      test.fail(true, 'Current Class cannot be clicked while a Magnet panel (Homework) is open');
      await user.nav.applyClassMap('default');
      await user.magnet.choose('homework');
      await expect(user.magnet.panels.homework).toBeVisible({ timeout: 15000 });
      await user.nav.applyClassMap('navigationGeneral');
      await expect(user.whiteboard.currentClassBtn).toContainText('Class 5');
      for (const [name, panel] of Object.entries(user.magnet.panels))
        await expect(panel, `${name} panel gone`).toBeHidden();
    }
  );

  test(
    "NAV-06-03: after switching class, the Playlist shows only the new class's resources (regression, Zoho CWR-I768, TCN-I15324)",
    { tag: ['@regression'] },
    async ({ user }) => {
      await user.nav.applyClassMap('playersDefault');
      await user.playlist.ensureDrawerVisible();
      await expect(user.playlist.resourceCards.first()).toBeAttached({ timeout: 15000 });
      const csTitles = await user.playlist.cardTitles();
      await user.nav.applyClassMap('navigationGeneral');
      await user.playlist.ensureDrawerVisible();
      await user.page.waitForTimeout(3000);
      const mathTitles = await user.playlist.cardTitles();
      // Generic labels shared by every card of a type ("Play Quiz") are not evidence of a leftover card.
      const generic = /^(play quiz|flashcard|my exercise|whiteboard)$/i;
      const leftovers = mathTitles.filter((t) => t && t.length > 12 && csTitles.includes(t) && !generic.test(t));
      expect(leftovers, 'no Computer Science cards left in the Class 5 Mathematics Playlist').toEqual([]);
    }
  );

  test(
    'NAV-06-04: clicking several subjects quickly loads the last subject clicked',
    { tag: ['@edge'] },
    async ({ user }) => {
      const pick = async (subject) => {
        if (!(await user.nav.allMyClassesTab.isVisible().catch(() => false))) await user.nav.openClassPopup();
        await user.nav.allMyClassesTab.click({ timeout: 10000 });
        await user.nav.gradeButton('Class 12').click();
        await user.nav.divisionButton('A').click();
        await user.nav.subjectButton(subject).click();
      };
      await user.nav.resetToClass('Class 11', 'A', 'Accountancy');
      // Physics, then Computer Science, then Mathematics, each chosen before the previous one has finished loading.
      for (const s of ['Physics', 'Computer Science', 'Mathematics']) await pick(s);
      await expect(user.whiteboard.currentClassBtn).toContainText('Mathematics', { timeout: 15000 });
      await user.page.waitForTimeout(3000);
      await expect(user.whiteboard.currentClassBtn, 'still Mathematics once everything has loaded').toContainText(
        'Mathematics'
      );
      await user.nav.openChaptersPopup();
      const chapters = (await user.nav.chapterItems.allInnerTexts()).join(' ');
      expect(chapters, 'the chapters are Mathematics chapters').toMatch(
        /relation|function|matri|integral|probab|differential|vector/i
      );
      expect(chapters, 'not Physics or Computer Science chapters').not.toMatch(
        /electric charge|python|exception handling/i
      );
    }
  );

  test(
    'NAV-06-05: opening and closing other panels leaves the current class, chapter and topic unchanged',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.nav.applyClassMap('default');
      const flat = async (loc) => (await loc.innerText()).replace(/\s+/g, '');
      const cls = await flat(user.whiteboard.currentClassBtn);
      const topic = await flat(user.whiteboard.currentChapterTopicBtn);
      // Minimap, Add Resource, the Playlist options menu and the User menu, each opened and closed.
      await user.minimap.open(user.toolbar);
      await user.minimap.close();
      await user.playlist.addResourcesTrigger.click();
      await user.playlist.addResourcesCloseBtn.click({ force: true });
      await user.playlist.openOptionsMenu();
      await user.playlist.closeOptionsMenu();
      await user.userMenu.openProfileMenu();
      await user.page.keyboard.press('Escape');
      expect(await flat(user.whiteboard.currentClassBtn), 'class unchanged').toBe(cls);
      expect(await flat(user.whiteboard.currentChapterTopicBtn), 'chapter/topic unchanged').toBe(topic);
    }
  );
});
