// TB-11 — Widgets
// Source: CEPV2_Stories/05_Toolbar.md
// Widget entries are toolbar-widget-tool-<Name> (e.g. Ruler, Clock); the signed-in panel adds a Discipline filter
// (toolbar-widget-discipline-select) to the 8 basic widgets Guest Mode shows.

const { test, expect } = require('../../fixtures');

test.use({ freshSpace: true });

const onBoard = (page) =>
  page
    .locator('lib-ruler, lib-clock, lib-protractor, [class*="widget-wrapper"], [class*="widget-container"]')
    .filter({ visible: true });

test.describe('TB-11 Widgets', () => {
  test.afterEach(async ({ app }) => {
    await app.toolbar.widgetCloseBtn
      .filter({ visible: true })
      .first()
      .click({ force: true, timeout: 2000 })
      .catch(() => {});
    await app.page.keyboard.press('Escape').catch(() => {});
  });

  test(
    'TB-11-01: the Widgets panel lists the teaching widgets',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      await user.toolbar.openToolPanel('gtWidgets');
      const tools = page.locator('[data-qa-id^="toolbar-widget-tool-"]').filter({ visible: true });
      await expect(tools.first()).toBeVisible();
      expect(await tools.count()).toBeGreaterThanOrEqual(8);
      await expect(user.toolbar.widgetTool('Ruler')).toBeVisible();
    }
  );

  test(
    'TB-11-02: the Discipline filter changes which widgets are listed',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.toolbar.openToolPanel('gtWidgets');
      // The Discipline filter swaps the subject widgets: .gallery-grid-item tiles WITHOUT a data-qa-id (the 8 basic widgets,
      // which have one, never change). Confirmed live 2026-09-26: Biology (Blood Vessel, DNA, ...) -> Mathematics (3D Shapes, ...).
      const names = () =>
        page.locator('.gallery-grid-item:not([data-qa-id])').filter({ visible: true }).allTextContents();
      const select = user.toolbar.widgetDisciplineSelect;
      await expect(select, 'Discipline filter shown when signed in').toBeVisible({ timeout: 10000 });
      const before = await names();
      expect(before.length, 'subject widgets listed').toBeGreaterThan(0);
      // A native <select> (Biology, Chemistry, ..., Mathematics, Physics, Science).
      const current = await select.inputValue();
      const other = await select.evaluate(
        (s, cur) => [...s.options].map((o) => o.value).find((v) => v !== cur),
        current
      );
      await select.selectOption(other);
      await expect.poll(names, { message: 'a different set of widgets' }).not.toEqual(before);
    }
  );

  // Inserting the Ruler (TB-11-03) and moving it (TB-11-07): one test each (split 2026-09-28).
  const insertRuler = async (user, page) => {
    await user.toolbar.openToolPanel('gtWidgets');
    const before = await onBoard(page).count();
    await user.toolbar.widgetTool('Ruler').click({ force: true });
    await expect.poll(() => onBoard(page).count(), { message: 'ruler on the board' }).toBeGreaterThan(before);
  };

  test(
    'TB-11-03: inserting the Ruler places a ruler on the board',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await insertRuler(user, page);
      await expect(onBoard(page).last()).toBeVisible();
    }
  );

  test('TB-11-07: a Ruler placed on the board can be moved', { tag: ['@functional'] }, async ({ user, page }) => {
    await insertRuler(user, page);
    const ruler = onBoard(page).last();
    const a = await ruler.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 150, a.y + a.height / 2 + 80, { steps: 10 });
    await page.mouse.up();
    const b = await ruler.boundingBox();
    expect(Math.abs(b.x - a.x) + Math.abs(b.y - a.y), 'the ruler moved').toBeGreaterThan(40);
  });

  test('TB-11-04: closing a widget removes it from the board', { tag: ['@functional'] }, async ({ user, page }) => {
    await user.toolbar.openToolPanel('gtWidgets');
    const before = await onBoard(page).count();
    await user.toolbar.widgetTool('Clock').click({ force: true });
    await expect.poll(() => onBoard(page).count()).toBeGreaterThan(before);
    await page
      .locator('lib-clock .mycloseClock')
      .or(user.toolbar.widgetCloseBtn)
      .filter({ visible: true })
      .first()
      .click({ force: true });
    await expect.poll(() => onBoard(page).count(), { message: 'widget removed' }).toBe(before);
  });

  test(
    'TB-11-05: a widget dragged onto the board lands where it was dropped',
    { tag: ['@edge', '@bug'] },
    async ({ user, page }) => {
      // STORY vs APP, CONFIRMED LIVE (2026-09-26, v 0.0.232): widget tiles are not draggable (no draggable attribute);
      // dragging one onto the board places nothing -- only a click inserts it. Owner to decide: story or app.
      test.fail(true, 'Dragging a widget from the panel onto the board places nothing (only clicking inserts)');
      await user.toolbar.openToolPanel('gtWidgets');
      const source = await user.toolbar.widgetTool('Ruler').boundingBox();
      const canvas = await user.toolbar.wbSvg.boundingBox();
      const drop = { x: canvas.x + 700, y: canvas.y + 500 };
      await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await page.mouse.down();
      await page.mouse.move(drop.x, drop.y, { steps: 20 });
      await page.mouse.up();
      await expect(onBoard(page).last()).toBeVisible({ timeout: 5000 });
      const w = await onBoard(page).last().boundingBox();
      expect(drop.x >= w.x - 60 && drop.x <= w.x + w.width + 60, 'dropped near the drop point (x)').toBe(true);
      expect(drop.y >= w.y - 60 && drop.y <= w.y + w.height + 60, 'dropped near the drop point (y)').toBe(true);
    }
  );

  test(
    "TB-11-06: opening a widget doesn't show a small widget screen on the toolbar (regression, Zoho CWR-I754)",
    { tag: ['@regression'] },
    async ({ user, page }) => {
      await user.toolbar.openToolPanel('gtWidgets');
      await user.toolbar.widgetTool('Clock').click({ force: true });
      await expect.poll(() => onBoard(page).count()).toBeGreaterThan(0);
      const toolbarBox = await user.toolbar.container.boundingBox();
      const inside = await onBoard(page).evaluateAll(
        (els, tb) =>
          els.filter((e) => {
            const r = e.getBoundingClientRect();
            return r.left >= tb.x && r.right <= tb.x + tb.width && r.top >= tb.y && r.bottom <= tb.y + tb.height;
          }).length,
        toolbarBox
      );
      expect(inside, 'no widget rendered inside the toolbar').toBe(0);
    }
  );
});
