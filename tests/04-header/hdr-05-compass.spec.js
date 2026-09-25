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

  test(
    'HDR-05-01: the Compass icon opens with both "Explore It" and "Analyse It" options visible',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      // ExploreIt only renders where the chapter has widgets, so this needs the ExploreIt fixture, not the baseline.
      await user.nav.applyClassMap('compassExploreIt');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);

      await expect(user.compass.analyseItItem).toBeVisible();
      await expect(
        user.page
          .locator('.compass-menu.open')
          .getByText(/explore\s*it/i)
          .first()
      ).toBeVisible();
    }
  );

  test(
    'HDR-05-02: Compass shows a "Revision Test" section for topics that have one',
    { tag: ['@functional'] },
    async ({ user }) => {
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

  test(
    'HDR-05-04: a topic without a Revision Test or Homework does not show those sections',
    { tag: ['@negative'] },
    async ({ user }) => {
      await user.nav.applyClassMap('compassNoAnalyseIt');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);

      // Conditional per topic: absent from the DOM entirely, not just hidden.
      await expect(user.compass.analyseItItem).toHaveCount(0);
      await expect(user.compass.revisionTestsItem).toHaveCount(0);
    }
  );

  test(
    'HDR-05-06: Revision Test card text does not overlap its own info line/icon (regression)',
    { tag: ['@regression'] },
    async ({ user }) => {
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
});
