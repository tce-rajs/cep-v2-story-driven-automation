// HDR-05 — Compass (Explore It / Analyse It)
// Source: CEPV2_Stories/04_Header.md
// Not automated (per PROCESS.md, Plan Mode is manual-only): HDR-05-05, HDR-05-08 (needs Plan Mode to author
// the triggering content).
// Blocked (see HDR-05-07's own fixme comment): the popup's modal backdrop blocks reaching Sign Out at all
// while it's open, so that bug's exact repro can't currently be driven through the UI.
//
// Fixtures (config/moduleClassMap.js): 'compassBaseline' = Class 12A Physics chapter 1, where AnalyseIt and
// Revision Tests render; 'compassExploreIt' = the same class, chapter 4, where ExploreIt widgets render too;
// 'compassNoAnalyseIt' = Class 11A Mathematics, where AnalyseIt never does.

const { test, expect } = require('../../fixtures');

test.describe('HDR-05 Compass (Explore It / Analyse It)', () => {
  test.beforeEach(async ({ user }) => {
    await user.nav.applyClassMap('compassBaseline');
  });

  // "Explore It" (HDR-05-01) and "Analyse It" (HDR-05-15) are one test each (split 2026-09-28). Explore It only renders
  // where the chapter has widgets, so both use the ExploreIt fixture, not the baseline.
  test(
    'HDR-05-01: the Compass icon opens with the "Explore It" option visible',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.nav.applyClassMap('compassExploreIt');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'set-up: Compass menu opened').toBe(true);
      await expect(
        user.page
          .locator('.compass-menu.open')
          .getByText(/explore\s*it/i)
          .first()
      ).toBeVisible();
    }
  );

  test(
    'HDR-05-15: the Compass icon opens with the "Analyse It" option visible',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.nav.applyClassMap('compassExploreIt');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'set-up: Compass menu opened').toBe(true);
      await expect(user.compass.analyseItItem).toBeVisible();
    }
  );

  test(
    'HDR-05-02: Compass shows a "Revision Test" section for topics that have one',
    { tag: ['@functional'] },
    async ({ user }) => {
      // Needs a topic with a Revision Test: 'compassRevisionTest' (none on 172.18.2.85 yet -- fails as DATA MISSING).
      await user.nav.applyClassMap('compassRevisionTest');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);
      await expect(user.compass.revisionTestsItem).toBeVisible();
    }
  );

  test(
    'HDR-05-03: Compass shows a "Homework" section for topics that have one',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);
      // Homework lives under Analyse It: it lists assignments, or reads "No Homework" when there are none.
      await expect(user.compass.analyseItItem).toBeVisible();
      await expect(user.page.locator('.compass-menu.open')).toContainText(/homework/i);
    }
  );

  // Conditional per topic: absent from the DOM entirely, not just hidden. One test per section (split 2026-09-28).
  test(
    'HDR-05-04: a topic without Homework does not show the Homework (Analyse It) section',
    { tag: ['@negative'] },
    async ({ user }) => {
      await user.nav.applyClassMap('compassNoAnalyseIt');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'set-up: Compass menu opened').toBe(true);
      await expect(user.compass.analyseItItem).toHaveCount(0);
    }
  );

  test(
    'HDR-05-16: a topic without a Revision Test does not show the Revision Test section',
    { tag: ['@negative'] },
    async ({ user }) => {
      await user.nav.applyClassMap('compassNoAnalyseIt');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'set-up: Compass menu opened').toBe(true);
      await expect(user.compass.revisionTestsItem).toHaveCount(0);
    }
  );

  test(
    'HDR-05-06: Revision Test card text does not overlap its own info line/icon (regression)',
    { tag: ['@regression'] },
    async ({ user }) => {
      // Needs Revision Test cards: 'compassRevisionTest' (none on 172.18.2.85 yet -- fails as DATA MISSING).
      await user.nav.applyClassMap('compassRevisionTest');
      // Zoho TCN-I16045: a card's title text overlapped other card text, making the details unreadable.
      // compassBaseline's real, existing cards already include one titled "testing title overlap issue" --
      // reused here rather than creating fresh content, since authoring a Revision Test happens in Plan
      // Mode, out of this suite's automation scope (PROCESS.md).
      //
      // CONFIRMED LIVE: `.title` is deliberately laid out ON TOP of `.image` (a darkened thumbnail, by
      // design -- a caption-on-image card, not a bug), so that pair is not checked here. `.checkpoint-
      // description` (the "30 MIN, 6 Q'S" / date / status info block) and `.type-icon` are real, separate
      // text/graphic elements the title should never visually collide with, including when a long title
      // wraps to 2 lines (as "testing title overlap issue" does, confirmed live).
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);
      await user.compass.revisionTestsItem.click({ force: true });

      const cards = user.compass.revisionTestCards;
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
      const count = await cards.count();
      expect(count, 'at least one Revision Test card to check').toBeGreaterThan(0);

      const intersects = (a, b) =>
        !(a.x + a.width <= b.x || a.x >= b.x + b.width || a.y + a.height <= b.y || a.y >= b.y + b.height);

      for (let i = 0; i < count; i++) {
        const card = cards.nth(i);
        const titleBox = await card.locator('.title').boundingBox();
        const descBox = await card.locator('.checkpoint-description').boundingBox();
        const iconBox = await card.locator('.type-icon').boundingBox();
        expect(titleBox, `card ${i} has a title box`).toBeTruthy();
        if (descBox) expect(intersects(titleBox, descBox), `card ${i}: title overlaps its info line`).toBe(false);
        if (iconBox) expect(intersects(titleBox, iconBox), `card ${i}: title overlaps its type icon`).toBe(false);
      }
    }
  );

  test.fixme('HDR-05-07: the Revision Test popup does not persist after signing out and back in (regression)', async () => {
    // Zoho TCN-I16051: opening a Revision Test's popup and then signing out (without closing it first)
    // left the popup visible on screen even after signing back in.
    //
    // BLOCKED: CONFIRMED LIVE (2026-09-25) the popup's own modal backdrop (cdk-overlay-backdrop, Angular
    // Material, disableClose -- Escape does not dismiss it either) blocks ALL other UI interaction,
    // including opening the toolbar's profile menu -- clicking the avatar while this popup is open does
    // nothing (toolbar-profile-trigger stays hidden, force:true click included). So the bug's own repro
    // ("without closing the popup, sign out") cannot currently be reached through the UI at all, which
    // may mean this was already fixed at the point of entry rather than the exit this ticket describes.
    // Worth a manual re-check against the original repro before writing this off.
  });

  // --- Added 2026-09-26 (gap-fill from the reference suite's Compass workbook and Zoho bugs) ---

  test("HDR-05-09: Explore It lists the chapter's widgets, each named", { tag: ['@functional'] }, async ({ user }) => {
    await user.nav.applyClassMap('compassExploreIt');
    const { opened } = await user.compass.openTrigger();
    expect(opened, 'set-up: Compass menu opened').toBe(true);
    await expect(user.compass.exploreItWidgets.first(), 'Explore It lists widgets').toBeVisible();
    const label = (await user.compass.exploreItWidgets.first().locator('.widget-label').innerText()).trim();
    expect(label.length, 'each widget is named').toBeGreaterThan(3);
  });

  test(
    'HDR-05-17: opening a widget from Explore It shows that widget',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.nav.applyClassMap('compassExploreIt');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'set-up: Compass menu opened').toBe(true);
      await expect(user.compass.exploreItWidgets.first(), 'set-up: Explore It lists widgets').toBeVisible();
      const shown = () =>
        page
          .locator('iframe, [class*="widget-container"], [class*="widget-player"], [class*="widget-wrapper"]')
          .filter({ visible: true })
          .count();
      const before = await shown();
      await user.compass.exploreItWidgets.first().click();
      try {
        await expect.poll(shown, { message: 'the widget opened', timeout: 20000 }).toBeGreaterThan(before);
      } finally {
        await user.player.closePlayer().catch(() => {});
      }
    }
  );

  test(
    'HDR-05-10: Explore It\'s "Open Widgets" link opens the full widget browser',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.nav.applyClassMap('compassExploreIt');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);
      await user.compass.exploreItOpenWidgetsLink.click();
      await expect(user.toolbar.widgetDisciplineSelect, 'widget browser shown').toBeVisible({ timeout: 15000 });
      expect(
        await page.locator('[data-qa-id^="toolbar-widget-tool-"]').filter({ visible: true }).count(),
        'widgets listed'
      ).toBeGreaterThan(0);
      await user.toolbar.widgetCloseBtn.click({ force: true }).catch(() => page.keyboard.press('Escape'));
    }
  );

  test(
    'HDR-05-11: Analyse It shows a "no homework" message when the topic has none',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'set-up: Compass menu opened').toBe(true);
      await expect(user.compass.analyseItItem).toContainText(/no homework/i);
      await expect(user.compass.noHomeworkMessage).toBeVisible({ timeout: 15000 });
      await expect(user.compass.noHomeworkMessage).toContainText(/no homework available/i);
    }
  );

  test(
    'HDR-05-18: when the topic has no homework, Analyse It offers a link to create homework',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'set-up: Compass menu opened').toBe(true);
      await expect(user.compass.noHomeworkMessage, 'set-up: the no-homework view').toBeVisible({ timeout: 15000 });
      await expect(user.compass.noHomeworkCreateLink, 'a link to create homework').toContainText(/homework/i);
    }
  );

  /** Open Analyse It's details, or skip when the topic has no homework to show (see HDR-05-11). */
  const openAnalyseItDetails = async (user) => {
    const { opened } = await user.compass.openTrigger();
    expect(opened, 'set-up: Compass menu opened').toBe(true);
    // The Analyse It entry itself reads "No Homework" when the topic has none (confirmed live 2026-09-26).
    const noHomework = /no homework/i.test(await user.compass.analyseItItem.innerText());
    test.skip(noHomework, 'Needs a topic whose Analyse It lists homework; this class/topic has none (see HDR-05-11).');
    await user.compass.analyseItItem.click({ force: true });
  };

  test(
    'HDR-05-12: in Analyse It, "View Questions" opens the questions view (regression, Zoho TCN-I16623)',
    { tag: ['@regression'] },
    async ({ user }) => {
      await openAnalyseItDetails(user);
      await user.compass.detailViewQuestionsBtn.click();
      await expect(user.compass.questionToggleAnswerBtn.first(), 'questions view opened').toBeVisible({
        timeout: 15000,
      });
    }
  );

  test(
    'HDR-05-19: in Analyse It, "View Last 5 Homework" opens the list (regression, Zoho TCN-I16623)',
    { tag: ['@regression'] },
    async ({ user }) => {
      await openAnalyseItDetails(user);
      await user.compass.detailViewListBtn.click();
      await expect(user.compass.listCancelBtn, 'last-5-homework list opened').toBeVisible({ timeout: 15000 });
    }
  );

  test(
    'HDR-05-13: clicking the Compass button 6 times quickly never opens more than one Compass window',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await expect(user.compass.triggerBtn).toBeVisible({ timeout: 15000 });
      for (let i = 0; i < 6; i++) await user.compass.triggerBtn.click({ force: true });
      await page.waitForTimeout(1500);
      expect(
        await user.compass.menu.filter({ visible: true }).count(),
        'at most one Compass window'
      ).toBeLessThanOrEqual(1);
    }
  );

  /** Open Compass's details view, then reload the app. */
  const reloadWithDetailsOpen = async (user, page) => {
    const { opened } = await user.compass.openTrigger();
    expect(opened, 'set-up: Compass menu opened').toBe(true);
    await user.compass.analyseItItem.click({ force: true });
    await page.waitForTimeout(2000);
    await page.reload();
    await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
  };

  test(
    'HDR-05-14: Compass opens normally again after the app reloads with its details view open',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await reloadWithDetailsOpen(user, page);
      const again = await user.compass.openTrigger();
      expect(again.opened, 'Compass opens again').toBe(true);
      await expect(user.compass.analyseItItem).toBeVisible();
    }
  );

  test(
    'HDR-05-20: after the app reloads with the Compass details view open, no stale Compass window is left',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await reloadWithDetailsOpen(user, page);
      await expect(user.compass.menu, 'no stale Compass window after reload').toBeHidden();
    }
  );
});
