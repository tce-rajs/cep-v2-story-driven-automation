// FLOW-22 — Moving around a big board with the Minimap
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: the default class (Class 9A Science 4.1): a long board with earlier writing. Each test writes one stroke on
// fresh space below it (never erased). The viewport rectangle and content markers are painted on the Minimap canvas
// (MinimapPage.readCanvas).

const { test, expect } = require('../../fixtures');
const { writeStroke } = require('./flow-helpers');

const zoom = async (user, clicksIn) => {
  await user.toolbar.openToolPanel('gtZoom');
  for (let i = 0; i < clicksIn; i++) await user.toolbar.zoomInBtn.click({ force: true });
  await user.toolbar.closePanelByTappingOutside();
};

test.use({ classMap: 'scratchBoard', freshSpace: true });

test.describe('FLOW-22 Moving around a big board with the Minimap', () => {
  test.describe.configure({ timeout: 180000 });

  test.afterEach(async ({ app }) => {
    await app.minimap.resetBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await app.minimap.close().catch(() => {});
    await app.toolbar.openToolPanel('gtZoom').catch(() => {});
    await app.toolbar.zoomResetBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await app.toolbar.closePanelByTappingOutside().catch(() => {});
  });

  test(
    "FLOW-22-01: the Minimap opens and shows the board's content",
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const overview = () => user.minimap.canvas.evaluate((c) => c.toDataURL());
      await user.minimap.open(user.toolbar);
      expect(await user.minimap.isShown(), 'the Minimap opens').toBe(true);
      const before = await overview();
      await user.minimap.close();
      await writeStroke(user, { x: 420, y: 400 }, { x: 760, y: 480 });
      await user.minimap.open(user.toolbar);
      expect((await user.minimap.readCanvas()).content, 'the board’s content is drawn').toBeGreaterThan(20);
      await expect.poll(overview, { message: 'including the newest writing' }).not.toBe(before);
    }
  );

  test('FLOW-22-02: the Minimap marks the current view', { tag: ['@functional'] }, async ({ user }) => {
    await writeStroke(user);
    await zoom(user, 2);
    await user.minimap.open(user.toolbar);
    const { rect, width, height } = await user.minimap.readCanvas();
    expect(rect, 'a rectangle marks the current view').not.toBeNull();
    expect(rect.width, 'smaller than the whole board when zoomed in').toBeLessThan(width);
    expect(rect.height).toBeLessThanOrEqual(height);
  });

  test(
    'FLOW-22-03: clicking in the Minimap moves the board to that place',
    { tag: ['@functional'] },
    async ({ user }) => {
      const stroke = await writeStroke(user);
      const mine = user.page.locator(`[data-qa-id="wb-drawing-container"] svg path[d="${stroke}"]`);
      await zoom(user, 2);
      await user.minimap.open(user.toolbar);
      const strokeBefore = await mine.boundingBox();
      const { width, height, rect } = await user.minimap.readCanvas();
      const target = { x: 0.8, y: 0.75 };
      const distance = (r) => Math.hypot(r.x + r.width / 2 - width * target.x, r.y + r.height / 2 - height * target.y);
      await user.minimap.clickAt(target.x, target.y);
      await expect
        .poll(async () => distance((await user.minimap.readCanvas()).rect), {
          message: 'the view moves towards the place clicked',
        })
        .toBeLessThan(distance(rect) - 2);
      const strokeAfter = await mine.boundingBox();
      expect(strokeAfter.x !== strokeBefore.x || strokeAfter.y !== strokeBefore.y, 'the board moved').toBe(true);
    }
  );

  test(
    'FLOW-22-04: the Minimap follows when the board is panned or zoomed',
    { tag: ['@functional'] },
    async ({ user }) => {
      await writeStroke(user);
      await user.minimap.open(user.toolbar);
      const pct = await user.minimap.zoomPercent();
      const before = (await user.minimap.readCanvas()).rect;
      await zoom(user, 2);
      await expect.poll(() => user.minimap.zoomPercent(), { message: 'it follows the zoom' }).toBeGreaterThan(pct);
      expect(await user.minimap.zoomPercent(), 'showing the board’s zoom').toBe(await user.content.zoomPercent());
      const zoomed = (await user.minimap.readCanvas()).rect;
      expect(zoomed.width, 'the view rectangle shrinks with the zoom').toBeLessThan(before.width);
      await user.toolbar.selectTool('gtPan');
      await user.toolbar.drawStroke({ x: 900, y: 600 }, { x: 500, y: 400 }, 12);
      await expect
        .poll(
          async () => {
            const r = (await user.minimap.readCanvas()).rect;
            return r.x !== zoomed.x || r.y !== zoomed.y;
          },
          { message: 'it follows the pan' }
        )
        .toBe(true);
    }
  );

  test(
    'FLOW-22-05: the Minimap does not cover other panels or stay open after the topic changes',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      await user.minimap.open(user.toolbar);
      await user.playlist.ensureDrawerVisible();
      // The Add Resource button and the Playlist strip stay reachable (nothing on top of them).
      for (const [name, el] of [
        ['Add Resource', user.addResource.addResourcesTrigger],
        ['the Playlist', user.playlist.contentsTile],
      ]) {
        const b = await el.boundingBox();
        const onTop = await page.evaluate(
          ({ x, y }) => !document.elementFromPoint(x, y)?.closest('[data-qa-id="minimap-container"]'),
          { x: b.x + b.width / 2, y: b.y + b.height / 2 }
        );
        expect(onTop, `the Minimap does not cover ${name}`).toBe(true);
      }
      await user.nav.goToChapterTopic(2, 0);
      await expect
        .poll(() => user.minimap.isShown(), { message: 'closed after the topic changes', timeout: 10000 })
        .toBe(false);
    }
  );
});
