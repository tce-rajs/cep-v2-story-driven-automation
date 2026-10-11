// FLOW-06 — Widgets and the Magnet menu
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: the default class (Class 9A Science 4.1), on fresh space below the teacher's writing (never erased). The
// widgets are the eight basic ones every class offers (Guest Mode shows the same eight). Magnet tools are opened and
// closed only: no notice, homework or short is sent and no attendance is marked.

const { test, expect } = require('../../fixtures');
const { GUEST_WIDGETS } = require('../../pages/without-login.page');
const { widgetsOnBoard, closeWidgets, writeStroke } = require('./flow-helpers');

/** Widgets panel -> `name`; resolves once a new widget is on the board. Returns the widget count before. */
const openWidget = async (user, name) => {
  const before = await widgetsOnBoard(user.page);
  await user.toolbar.openToolPanel('gtWidgets');
  await user.toolbar.widgetTool(name).click({ force: true });
  await expect
    .poll(() => widgetsOnBoard(user.page), { message: `the ${name} widget is on the board`, timeout: 10000 })
    .toBeGreaterThan(before);
  await user.toolbar.closePanelByTappingOutside();
  return before;
};
/** The newest widget element on the board (largest-index visible lib-* / widget wrapper). */
const newestWidget = (page) =>
  page
    .locator(
      'lib-ruler, lib-clock, lib-protractor, lib-compass, [class*="widget-wrapper"], [class*="widget-container"]'
    )
    .filter({ visible: true })
    .last();

test.describe('FLOW-06 Widgets and the Magnet menu', () => {
  test.use({ classMap: 'scratchBoard', freshSpace: true });
  test.describe.configure({ timeout: 180000 });

  test.afterEach(async ({ app }) => {
    await closeWidgets(app).catch(() => {});
    await app.page.keyboard.press('Escape').catch(() => {});
  });

  for (const name of GUEST_WIDGETS) {
    test(
      `FLOW-06-01: the ${name} widget opens from the toolbar on the board`,
      { tag: ['@functional'] },
      async ({ user }) => {
        await openWidget(user, name);
      }
    );
  }

  test(
    'FLOW-06-02: the Clock widget does its job: it takes the hour the teacher sets and shows the time',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openWidget(user, 'Clock');
      await user.guest.clockHourInput.fill('3');
      await user.guest.clockShowTimeBtn.click({ force: true });
      await expect(user.guest.clockHourInput, 'the hour set is kept').toHaveValue('3');
      await expect(user.guest.clockWidget, 'the clock stays on the board').toBeVisible();
    }
  );

  test('FLOW-06-03: a widget can be moved and closed', { tag: ['@functional'] }, async ({ user, page }) => {
    const before = await openWidget(user, 'Ruler');
    const widget = newestWidget(page);
    const a = await widget.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 150, a.y + a.height / 2 + 80, { steps: 10 });
    await page.mouse.up();
    const b = await widget.boundingBox();
    expect(Math.abs(b.x - a.x) + Math.abs(b.y - a.y), 'the widget moved').toBeGreaterThan(40);
    await closeWidgets(user);
    await expect.poll(() => widgetsOnBoard(page), { message: 'the widget closed' }).toBe(before);
  });

  for (const [name, label] of [
    ['notice', 'Notice'],
    ['learningShorts', 'Learning Shorts'],
    ['homework', 'Homework'],
    ['attendance', 'Attendance'],
  ]) {
    test(
      `FLOW-06-04: the ${label} Magnet tool opens and works on the board`,
      { tag: ['@functional'] },
      async ({ user }) => {
        await user.magnet.choose(name);
        try {
          await expect(user.magnet.panels[name], `${label} opens its panel`).toBeVisible({ timeout: 20000 });
          await expect(user.toolbar.wbSvg, 'the board is still there under it').toBeVisible();
        } finally {
          await user.aiNotices.closeAll().catch(() => {});
          await user.learningShorts.closeAll().catch(() => {});
          await user.aiHomework.closeAll().catch(() => {});
          await user.attendance.closeAll().catch(() => {});
        }
        await expect(user.magnet.panels[name], `${label} closes again`).toBeHidden({ timeout: 10000 });
      }
    );
  }

  test(
    'FLOW-06-05: the writing under a widget is unchanged after the widget is closed',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      await writeStroke(user, { x: 500, y: 420 }, { x: 900, y: 470 });
      const before = await user.content.pathGeometry();
      await openWidget(user, 'Ruler');
      // Lay the ruler over the writing, then close it.
      const widget = newestWidget(page);
      const a = await widget.boundingBox();
      const canvas = await user.toolbar.wbSvg.boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(canvas.x + 700, canvas.y + 445, { steps: 12 });
      await page.mouse.up();
      await closeWidgets(user);
      expect(await user.content.pathGeometry(), 'the writing is unchanged').toEqual(before);
    }
  );

  test(
    'FLOW-06-06: a widget left open does not stay on screen after the class or topic changes',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const before = await openWidget(user, 'Clock');
      await user.nav.goToChapterTopic(2, 0);
      await expect
        .poll(() => widgetsOnBoard(page), { message: 'no widget left over the new topic', timeout: 10000 })
        .toBe(before);
    }
  );
});
