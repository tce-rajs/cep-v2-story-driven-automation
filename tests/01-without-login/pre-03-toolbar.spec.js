// PRE-03 — Toolbar is available, except Magnet
// Source: CEPV2_Stories/01_WithoutLogin.md

const { test, expect } = require('../../fixtures/electron-app');
const { WithoutLoginPage, GUEST_TOOL_IDS, GUEST_WIDGETS } = require('../../pages/without-login.page');

test.describe('PRE-03 Toolbar is available, except Magnet', () => {
  test.beforeEach(async ({ page }) => {
    await new WithoutLoginPage(page).open();
  });

  // The story's PRE-03-01 listed the whole toolbar plus the User menu in one case. Split (2026-09-28) into one case per
  // tool: every tool is visible (PRE-03-04), each works on its own (PRE-03-05..13), and the User menu (PRE-03-01).
  test(
    'PRE-03-04: every toolbar tool (Select, Pan, Background, Pen, Text, Eraser, Shapes, Undo, Redo) is visible without logging in',
    { tag: ['@smoke', '@functional'] },
    async ({ page }) => {
      const tb = new WithoutLoginPage(page).toolbar;
      for (const id of GUEST_TOOL_IDS) await expect.soft(tb.tool(id), id).toBeVisible();
    }
  );

  // Tools that switch the active mode.
  for (const [cid, id, name] of [
    ['PRE-03-05', 'gtSelect', 'Select'],
    ['PRE-03-06', 'gtPan', 'Pan'],
    ['PRE-03-07', 'gtPen', 'Pen'],
    ['PRE-03-08', 'gtInserttext', 'Text'],
  ]) {
    test(
      `${cid}: the ${name} tool activates when clicked, without logging in`,
      { tag: ['@functional'] },
      async ({ page }) => {
        const tb = new WithoutLoginPage(page).toolbar;
        await tb.selectTool(id);
        await expect(tb.isToolActive(id), id).toHaveCount(1);
      }
    );
  }

  // Tools that open an options panel on double-tap.
  for (const [cid, id, name, marker] of [
    ['PRE-03-09', 'gtBackground', 'Background', /choose a background/i],
    ['PRE-03-10', 'gtErase', 'Eraser', /clear whiteboard/i],
    ['PRE-03-11', 'gtShapes', 'Shapes', /choose a shape/i],
  ]) {
    test(
      `${cid}: the ${name} tool opens its options panel, without logging in`,
      { tag: ['@functional'] },
      async ({ page }) => {
        const tb = new WithoutLoginPage(page).toolbar;
        await tb.openToolPanel(id);
        try {
          await expect(tb.panel, id).toBeVisible();
          await expect(tb.panel, id).toContainText(marker);
        } finally {
          await tb.closePanelByTappingOutside();
        }
      }
    );
  }

  test('PRE-03-12: Undo removes a drawn stroke, without logging in', { tag: ['@functional'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    const tb = app.toolbar;
    const before = await tb.pathCount();
    await app.draw();
    expect(await tb.pathCount(), 'set-up: a stroke drawn').toBe(before + 1);
    await tb.tool('gtUndo').click({ force: true });
    await expect.poll(() => tb.pathCount()).toBe(before);
  });

  test('PRE-03-13: Redo puts an undone stroke back, without logging in', { tag: ['@functional'] }, async ({ page }) => {
    const app = new WithoutLoginPage(page);
    const tb = app.toolbar;
    const before = await tb.pathCount();
    await app.draw();
    await tb.tool('gtUndo').click({ force: true });
    await expect.poll(() => tb.pathCount(), { message: 'set-up: the stroke undone' }).toBe(before);
    await tb.tool('gtRedo').click({ force: true });
    await expect.poll(() => tb.pathCount()).toBe(before + 1);
  });

  test(
    'PRE-03-01: the User menu is not visible without logging in',
    { tag: ['@functional', '@negative'] },
    async ({ page }) => {
      // Owner decision (2026-09-29): the User menu must NOT be visible signed-out -- the app is right and the story was
      // wrong (it listed "User menu" among the tools visible before login). Signed-out there is no avatar, and the
      // profile trigger (toolbar-profile-trigger) is in the DOM but hidden; both appear only after signing in.
      const app = new WithoutLoginPage(page);
      await expect(app.userAvatar).toBeHidden({ timeout: 3000 });
      await expect(app.userMenuTrigger).toBeHidden();
    }
  );

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
