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

  // One test per option, so one option failing does not hide the others: the screen closes, no menu
  // is left open, and the whiteboard takes a stroke again.
  for (const name of ['create', 'library', 'gallery']) {
    test(
      `RES-06-03: closing an option's screen returns cleanly to the whiteboard (${name})`,
      { tag: ['@functional'] },
      async ({ user }) => {
        const s = screens(user.addResource)[name];
        await user.addResource.openAction(name);
        await expect(s.shown, 'set-up: the screen opened').toBeVisible({ timeout: 20000 });
        await s.close.click({ force: true });
        await expect(s.shown, `${name} closed`).toBeHidden({ timeout: 10000 });
        await expect(user.addResource.actions.create, 'no menu left open').toBeHidden();
        const before = await user.toolbar.pathCount();
        await user.toolbar.penStroke({ x: 400, y: 400 }, { x: 600, y: 420 });
        expect(await user.toolbar.pathCount(), 'the whiteboard is usable again').toBeGreaterThan(before);
        await user.toolbar.tool('gtUndo').click({ force: true });
      }
    );
  }

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

  // Escape (one way) and a click away on the board (the other): the menu closes and adds nothing.
  for (const [how, close] of [
    ['pressing Escape', (user) => user.page.keyboard.press('Escape')],
    [
      'clicking away',
      async (user) => {
        const box = await user.toolbar.wbSvg.boundingBox();
        await user.page.mouse.click(box.x + box.width / 2, box.y + 250);
      },
    ],
  ]) {
    test(
      `RES-06-06: ${how} closes the Add Resource menu and adds nothing`,
      { tag: ['@negative'] },
      async ({ user }) => {
        const ar = user.addResource;
        await user.toolbar.selectTool('gtSelect'); // a click on the board then draws nothing
        const board = await user.toolbar.objectCount();
        const cards = await user.playlist.cardTitles();
        const { stillStuck } = await ar.openPickerReliably(ar.actions.create);
        expect(stillStuck, 'set-up: the menu is open').toBeFalsy();
        await close(user);
        const open = () =>
          ar.actions.create
            .evaluate((el) => {
              const r = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              return (
                cs.pointerEvents !== 'none' &&
                cs.visibility !== 'hidden' &&
                r.width > 0 &&
                r.bottom > 0 &&
                r.top < innerHeight
              );
            })
            .catch(() => false);
        await expect.poll(open, { message: 'the menu closed', timeout: 5000 }).toBe(false);
        await user.page.waitForTimeout(1000);
        for (const [name, screen] of [
          ['Create', ar.createForm],
          ['Library', ar.libraryPopup],
          ['Gallery', ar.gallerySearchInput],
        ])
          await expect(screen, `${name} did not open`).toBeHidden();
        expect(await user.toolbar.objectCount(), 'nothing added to the board').toBe(board);
        expect(await user.playlist.cardTitles(), 'nothing added to the Playlist').toEqual(cards);
      }
    );
  }
});
