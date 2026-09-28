// RES-06 — Add Resource menu
// Source: CEPV2_Stories/09_Resources.md
// The "+" picker intermittently renders unclickable (pointer-events: none); AddResourcePage.openPickerReliably handles it.

const { test, expect } = require('../../fixtures');

test.describe('RES-06 Add Resource menu', () => {
  test.use({ classMap: 'default' });

  const ACTIONS = ['create', 'library', 'gallery', 'dropit', 'aiAssist', 'whiteboard'];

  /** What each option opens, and how to close it again. */
  const screens = (ar) => ({
    create: { shown: ar.createForm, close: ar.cancelBtn },
    library: { shown: ar.libraryPopup, close: ar.libraryCloseBtn },
    gallery: { shown: ar.gallerySearchInput, close: ar.galleryCloseBtn },
    dropit: { shown: ar.dropitQrCanvas, close: ar.dropitCloseBtn },
    aiAssist: { shown: ar.aiAssistTabExercise, close: ar.aiAssistCloseBtn },
    whiteboard: {
      shown: ar.whiteboardSavePlaylistBtn.or(ar.whiteboardDownloadPdfBtn).first(),
      close: ar.addResourcesCloseBtn,
    },
  });

  test(
    'RES-06-01: the "+" button opens the Add Resource menu with all 6 options',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const { stillStuck } = await user.addResource.openPickerReliably(user.addResource.actions.create);
      expect(stillStuck, 'menu became usable').toBeFalsy();
      for (const name of ACTIONS) await expect(user.addResource.actions[name], name).toBeVisible();
      await user.addResource.addResourcesCloseBtn.click({ force: true }).catch(() => {});
    }
  );

  for (const name of ACTIONS) {
    test(
      `RES-06-02: each of the 6 options opens its own screen (${name})`,
      { tag: ['@functional'] },
      async ({ user }) => {
        const s = screens(user.addResource)[name];
        await user.addResource.openAction(name);
        await expect(s.shown, `${name} screen shown`).toBeVisible({ timeout: 20000 });
        await s.close.click({ force: true }).catch(() => {});
      }
    );
  }

  test(
    "RES-06-03: closing an option's screen returns cleanly to the whiteboard",
    { tag: ['@functional'] },
    async ({ user }) => {
      for (const name of ['create', 'library', 'gallery']) {
        const s = screens(user.addResource)[name];
        await user.addResource.openAction(name);
        await expect(s.shown).toBeVisible({ timeout: 20000 });
        await s.close.click({ force: true });
        await expect(s.shown, `${name} closed`).toBeHidden({ timeout: 10000 });
        await expect(user.addResource.actions.create, 'no menu left open').toBeHidden();
      }
      // The whiteboard is usable again.
      const before = await user.toolbar.pathCount();
      await user.toolbar.penStroke({ x: 400, y: 400 }, { x: 600, y: 420 });
      expect(await user.toolbar.pathCount()).toBeGreaterThan(before);
      await user.toolbar.tool('gtUndo').click({ force: true });
    }
  );

  test(
    'RES-06-04: pressing "+" while an option\'s screen is open does not open a second menu on top (regression)',
    { tag: ['@bug', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; the reference suite's ADD-CORE-03 / GAL-XCUT-01):
      // pressing "+" while Gallery is open opens a second Add Resource menu on top of it.
      test.fail(true, 'Pressing "+" while an Add Resource option is open stacks a second menu');
      await user.addResource.openAction('gallery');
      await expect(user.addResource.gallerySearchInput).toBeVisible({ timeout: 20000 });
      await user.addResource.addResourcesTrigger.click({ force: true });
      await page.waitForTimeout(1500);
      const menus = user.addResource.actions.create.filter({ visible: true });
      await expect(menus, 'no Add Resource menu stacked over the open Gallery').toHaveCount(0);
      await user.addResource.galleryCloseBtn.click({ force: true }).catch(() => {});
    }
  );

  test(
    'RES-06-05: clicking an option the moment the menu opens opens that option, not a different one',
    { tag: ['@edge'] },
    async ({ user }) => {
      const ar = user.addResource;
      await ar.addResourcesTrigger.click({ force: true });
      await ar.actions.gallery.click({ force: true, timeout: 5000 });
      await expect(ar.gallerySearchInput, 'Gallery opened').toBeVisible({ timeout: 20000 });
      await expect(ar.createForm, 'not Create').toBeHidden();
      await expect(ar.libraryPopup, 'not Library').toBeHidden();
      await ar.galleryCloseBtn.click({ force: true });
    }
  );
});
