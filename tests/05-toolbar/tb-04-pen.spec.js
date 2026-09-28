// TB-04 — Pen (Draw / Size / Color)
// Source: CEPV2_Stories/05_Toolbar.md

const { test, expect } = require('../../fixtures');

test.use({ cleanBoard: true });

const THICKNESS_LABELS = ['Thin', 'Normal', 'Thick', 'Strong'];

test.describe('TB-04 Pen (Draw / Size / Color)', () => {
  test(
    'TB-04-01: selecting the pencil and dragging across the canvas draws a stroke following the drag path',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const canvas = await tb.wbSvg.boundingBox();
      const from = { x: 400, y: 400 };
      const to = { x: 700, y: 520 };
      const before = await tb.pathCount();

      await tb.penStroke(from, to);

      expect(await tb.pathCount()).toBe(before + 1);
      const box = await tb.lastPathBox();
      // The stroke's extent matches the drag: starts near `from`, ends near `to`.
      const tolerance = 25;
      expect(Math.abs(box.x - (canvas.x + from.x))).toBeLessThan(tolerance);
      expect(Math.abs(box.y - (canvas.y + from.y))).toBeLessThan(tolerance);
      expect(Math.abs(box.x + box.width - (canvas.x + to.x))).toBeLessThan(tolerance);
      expect(Math.abs(box.y + box.height - (canvas.y + to.y))).toBeLessThan(tolerance);
    }
  );

  test(
    'TB-04-02: drawing with each available pen colour renders that colour correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      // One stroke per colour takes just over 90 s in a full run (timed out there 2026-09-26), so allow more.
      test.setTimeout(240000);
      const tb = user.toolbar;
      await tb.openToolPanel('gtPen');
      const colours = await tb.penColorOptions.count();
      expect(colours, 'more than one pen colour offered').toBeGreaterThan(1);
      await tb.closePanelByTappingOutside();

      const rendered = [];
      const swatches = [];
      for (let i = 0; i < colours; i++) {
        await tb.openToolPanel('gtPen');
        const option = tb.penColorOptions.nth(i);
        const swatch = await option.evaluate((el) => getComputedStyle(el).backgroundColor);
        swatches.push(swatch);
        await option.click({ force: true });
        await tb.closePanelByTappingOutside();

        const before = await tb.pathCount();
        await tb.drawStroke({ x: 300 + i * 40, y: 300 }, { x: 300 + i * 40, y: 420 }, 8);
        expect(await tb.pathCount(), `colour ${i + 1} drew a stroke`).toBe(before + 1);

        const { color } = await tb.strokeOf(tb.paths.last());
        rendered.push(color);
        if (swatch !== 'rgba(0, 0, 0, 0)') {
          expect(color, `stroke colour matches swatch ${i + 1}`).toBe(swatch);
        }
      }
      // CONFIRMED LIVE: the palette lists white twice ("default" and "white-19" are both rgb(255, 255, 255)), so 25
      // options are only 24 distinct colours. Every DISTINCT swatch must render as its own distinct colour.
      const distinctSwatches = new Set(swatches).size;
      if (distinctSwatches < colours) {
        test.info().annotations.push({
          type: 'note',
          description: `${colours} pen colour options but only ${distinctSwatches} distinct swatches (duplicate white)`,
        });
      }
      expect(new Set(rendered).size, 'every distinct colour renders as a distinct colour').toBe(distinctSwatches);
    }
  );

  test(
    'TB-04-03: drawing with each available pen thickness renders that thickness correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const widths = [];
      for (let i = 0; i < THICKNESS_LABELS.length; i++) {
        await tb.openToolPanel('gtPen');
        await tb.panel.getByText(THICKNESS_LABELS[i], { exact: true }).click({ force: true });
        await tb.closePanelByTappingOutside();

        const before = await tb.pathCount();
        await tb.drawStroke({ x: 300 + i * 50, y: 500 }, { x: 300 + i * 50, y: 620 }, 8);
        expect(await tb.pathCount(), `${THICKNESS_LABELS[i]} drew a stroke`).toBe(before + 1);
        widths.push((await tb.strokeOf(tb.paths.last())).width);
      }
      test.info().annotations.push({
        type: 'note',
        description: `Stroke widths (${THICKNESS_LABELS.join('/')}): ${widths.join(', ')}`,
      });
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i], `${THICKNESS_LABELS[i]} is thicker than ${THICKNESS_LABELS[i - 1]}`).toBeGreaterThan(
          widths[i - 1]
        );
      }
    }
  );

  test(
    'TB-04-04: a 2000-character text object and emoji/RTL text render correctly in a text box',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const wb = user.whiteboard;
      const cases = {
        long: 'The quick brown fox jumps over the lazy dog. '.repeat(45).slice(0, 2000),
        emoji: 'Great work 😀👍🎉',
        rtl: 'مرحبا بالعالم שלום עולם',
      };
      let x = 300;
      for (const [name, text] of Object.entries(cases)) {
        const before = await wb.textObjects.count();
        const box = await wb.insertTextAndType(x, 300, text);
        await page.waitForTimeout(500);

        await expect(wb.textObjects, `${name}: a text object was created`).toHaveCount(before + 1);
        const rendered = (await box.textContent()) || '';
        expect(rendered, `${name}: full text present`).toContain(text.trim());
        if (name === 'long') expect(rendered.length).toBeGreaterThanOrEqual(2000);
        await user.toolbar.selectTool('gtSelect');
        x += 350;
      }
    }
  );

  // --- Added 2026-09-26 (gap-fill from the reference suite's Toolbar workbook and Zoho bugs) ---

  test(
    'TB-04-05: switching from Pen to Eraser part-way through a drag leaves no stray half-drawn stroke (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const tb = user.toolbar;
      await tb.selectTool('gtPen');
      const before = await tb.pathCount();
      const box = await tb.wbSvg.boundingBox();
      await page.mouse.move(box.x + 400, box.y + 400);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + 400 + i * 15, box.y + 400);
      await tb.tool('gtErase').dispatchEvent('click');
      for (let i = 9; i <= 16; i++) await page.mouse.move(box.x + 400 + i * 15, box.y + 400);
      await page.mouse.up();
      await page.waitForTimeout(800);
      const added = (await tb.pathCount()) - before;
      expect(added, 'at most the one stroke that was being drawn').toBeLessThanOrEqual(1);
      if (added === 1) {
        const b = await tb.lastPathBox();
        expect(b.width, 'no tiny stray fragment').toBeGreaterThan(20);
      }
      // The board still works.
      await tb.penStroke({ x: 400, y: 550 }, { x: 600, y: 560 });
      expect(await tb.pathCount()).toBeGreaterThan(before + added);
      expect(errors).toEqual([]);
    }
  );

  test(
    'TB-04-06: curved strokes are drawn as curves, not straight lines (regression, Zoho TCN-I16705)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      await tb.selectTool('gtPen');
      const before = await tb.pathCount();
      const box = await tb.wbSvg.boundingBox();
      const cx = box.x + 600,
        cy = box.y + 450,
        r = 150;
      await page.mouse.move(cx - r, cy);
      await page.mouse.down();
      for (let a = 180; a >= 0; a -= 6) {
        const rad = (a * Math.PI) / 180;
        await page.mouse.move(cx + r * Math.cos(rad), cy - r * Math.sin(rad));
      }
      await page.mouse.up();
      await page.waitForTimeout(700);
      expect(await tb.pathCount()).toBe(before + 1);
      // How far the drawn path bows away from the straight line between its ends.
      const bow = await tb.paths.last().evaluate((p) => {
        const len = p.getTotalLength();
        const a = p.getPointAtLength(0),
          b = p.getPointAtLength(len);
        let max = 0;
        for (let i = 1; i < 40; i++) {
          const q = p.getPointAtLength((len * i) / 40);
          const d =
            Math.abs((b.y - a.y) * q.x - (b.x - a.x) * q.y + b.x * a.y - b.y * a.x) / Math.hypot(b.y - a.y, b.x - a.x);
          max = Math.max(max, d);
        }
        return max;
      });
      expect(bow, 'the stroke keeps its curve').toBeGreaterThan(60);
    }
  );

  test(
    'TB-04-07: a long continuous stroke is drawn without breaks (regression, Zoho TCN-I15837)',
    { tag: ['@regression'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const before = await tb.pathCount();
      await tb.selectTool('gtPen');
      await tb.drawStroke({ x: 200, y: 300 }, { x: 1100, y: 600 }, 90);
      expect(await tb.pathCount(), 'one stroke, not several pieces').toBe(before + 1);
      const length = await tb.paths.last().evaluate((p) => p.getTotalLength());
      expect(length, 'the whole drag was drawn').toBeGreaterThan(0.85 * Math.hypot(900, 300));
    }
  );
});
