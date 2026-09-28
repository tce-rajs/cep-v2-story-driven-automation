// PRE-03 — Toolbar is available, except Magnet
// Source: CEPV2_Stories/01_WithoutLogin.md

const { test, expect } = require('../../fixtures/electron-app');
const { WithoutLoginPage, GUEST_TOOL_IDS, GUEST_WIDGETS } = require('../../pages/without-login.page');

test.describe('PRE-03 Toolbar is available, except Magnet', () => {
  test.beforeEach(async ({ page }) => {
    await new WithoutLoginPage(page).open();
  });

  test(
    // Split from the story's own PRE-03-01 (which also covers the User menu, see PRE-03-01 below) so the two halves
    // -- the working toolbar, and the User-menu mismatch -- aren't both reported under one ID.
    'PRE-03-01a: the toolbar (Select, Pan, Background, Pen, Eraser, Shapes, Undo/Redo) is visible and functional without logging in',
    { tag: ['@smoke', '@functional'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      const tb = app.toolbar;

      await test.step('every tool is visible', async () => {
        for (const id of GUEST_TOOL_IDS) {
          await expect.soft(tb.tool(id), id).toBeVisible();
        }
      });

      // Tools that switch the active mode.
      for (const id of ['gtSelect', 'gtPan', 'gtPen', 'gtInserttext']) {
        await test.step(`${id} activates when clicked`, async () => {
          await tb.selectTool(id);
          await expect.soft(tb.isToolActive(id), id).toHaveCount(1);
        });
      }

      // Tools that open an options panel on double-tap.
      for (const [id, marker] of [
        ['gtBackground', /choose a background/i],
        ['gtErase', /clear whiteboard/i],
        ['gtShapes', /choose a shape/i],
      ]) {
        await test.step(`${id} opens its panel`, async () => {
          await tb.openToolPanel(id);
          await expect.soft(tb.panel, id).toBeVisible();
          await expect.soft(tb.panel, id).toContainText(marker);
          await tb.closePanelByTappingOutside();
        });
      }

      await test.step('Undo/Redo work on a drawn stroke', async () => {
        const before = await tb.pathCount();
        await app.draw();
        expect(await tb.pathCount()).toBe(before + 1);
        await tb.tool('gtUndo').click({ force: true });
        await expect.poll(() => tb.pathCount()).toBe(before);
        await tb.tool('gtRedo').click({ force: true });
        await expect.poll(() => tb.pathCount()).toBe(before + 1);
      });
    }
  );

  test('PRE-03-01: the User menu is visible without logging in', { tag: ['@functional', '@bug'] }, async ({ page }) => {
    // MISMATCH, CONFIRMED LIVE (v 0.0.223): the story lists "User menu" among the tools
    // visible before login, but signed-out there is no user avatar and the profile menu
    // trigger (toolbar-profile-trigger) exists in the DOM but is hidden. Both only appear
    // after a PIN login. Either the story is wrong or the pre-login build is missing it --
    // needs a product decision. Tracked as expected-to-fail so it isn't masked.
    test.fail(true, 'User menu (avatar / profile trigger) is not visible in Guest Mode');
    const app = new WithoutLoginPage(page);
    await expect(app.userAvatar.or(app.userMenuTrigger).first()).toBeVisible({ timeout: 3000 });
  });

  test(
    'PRE-03-02: the Magnet menu is not available without login',
    { tag: ['@smoke', '@negative'] },
    async ({ page }) => {
      const app = new WithoutLoginPage(page);
      // Guard against a vacuous pass: the rest of the toolbar must actually be rendered.
      await expect(app.toolbar.allTools).toHaveCount(GUEST_TOOL_IDS.length);
      await expect(app.magnetTool).toHaveCount(0);
    }
  );

  test(
    'PRE-03-03: the Widgets entry only shows the basic widget set, not the full logged-in set',
    { tag: ['@functional'] },
    async ({ page }) => {
      // NOTE: the story words this as showing only "Open Widgets". CONFIRMED LIVE: there is no
      // "Open Widgets" entry in the panel itself; what it shows signed-out is a fixed set of
      // eight basic tools. Signed in, the same panel adds 20+ subject widgets after these
      // eight (Blood Vessel, DNA, Microscope, ...). The intent -- "not the full logged-in
      // set" -- holds, so that is what is asserted.
      test.info().annotations.push({
        type: 'note',
        description: 'Story says "Open Widgets"; live panel lists 8 basic widgets and no such entry.',
      });
      const app = new WithoutLoginPage(page);
      await app.openWidgets();

      await expect(app.widgetTools).toHaveCount(GUEST_WIDGETS.length);
      expect(await app.widgetTools.evaluateAll((els) => els.map((e) => e.textContent.trim()))).toEqual(GUEST_WIDGETS);
      await expect(app.toolbar.panel).not.toContainText(/DNA|Microscope|Blood Vessel/);
    }
  );
});
