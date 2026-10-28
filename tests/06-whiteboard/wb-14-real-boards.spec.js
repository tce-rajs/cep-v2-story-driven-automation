// WB-14 — A board as teachers really write
// Source: CEPV2_Stories/06_Whiteboard.md
// Each test writes real-looking content on fresh space of the dedicated reference class's board (nothing is erased): handwriting
// traced from a handwriting font in a separate plain browser page and sent as pen strokes, plus pen-drawn arrows,
// circles, lines and boxes. It then checks that every stroke it wrote comes back exactly (same outline, same order)
// after a reload or after signing out and back in.
// Writing over an opened worksheet is covered by PLR-14-01a/d. WB-14-08 writes one marker on each of 3 x 3 screens
// of fresh space and reaches each from the Minimap.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { pinForWhiteboard } = require('../../config/moduleClassMap');
const { textToStrokes } = require('../../pages/lib/font-strokes');

test.use({ classMap: 'whiteboardReference', freshSpace: true });

// --- Shapes as pen strokes (canvas-relative px) ---
const line = (a, b) => [a, b];
const arrow = (a, b) => {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const head = (d) => ({ x: b.x - 18 * Math.cos(ang + d), y: b.y - 18 * Math.sin(ang + d) });
  return [line(a, b), [head(0.5), b, head(-0.5)]];
};
const circle = (c, rx, ry = rx) =>
  Array.from({ length: 41 }, (_, i) => ({
    x: c.x + rx * Math.cos((i / 40) * 2 * Math.PI),
    y: c.y + ry * Math.sin((i / 40) * 2 * Math.PI),
  }));
const box = (x, y, w, h) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
  { x, y },
];

/** Measure handwriting for each { text, x, y, size } in a separate browser page; returns words for writeHandwriting. */
const handwriting = async (items) => {
  const browser = await chromium.launch();
  try {
    const drawing = await (await browser.newContext()).newPage();
    const words = [];
    for (const {
      text,
      x,
      y,
      size = 0.45,
      weight,
      font,
      fontSize = 90,
      maxWidth = 4000,
      lineHeight = 1.45,
      continuous,
      fitWidth,
      fitHeight,
    } of items) {
      const selectedFont = font || (/[\u0900-\u097f]/.test(text) ? 'Kalam' : 'Segoe Print');
      const selectedWeight = weight === undefined ? (selectedFont === 'Segoe Print' ? 400 : 300) : weight;
      const traceContinuously = continuous === undefined ? selectedFont === 'Segoe Print' : continuous;
      const res = await textToStrokes(drawing, text, {
        font: selectedFont,
        fontSize,
        maxWidth,
        lineHeight,
        weight: selectedWeight,
        continuous: traceContinuously,
      });
      const bounds = res.strokes.reduce(
        (box, stroke) => {
          for (const point of stroke) {
            box.left = Math.min(box.left, point.x);
            box.right = Math.max(box.right, point.x);
            box.top = Math.min(box.top, point.y);
            box.bottom = Math.max(box.bottom, point.y);
          }
          return box;
        },
        { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
      );
      if (!Number.isFinite(bounds.left)) throw new Error(`Font tracing produced no strokes for "${text}".`);
      const scaleX = Math.min(size, fitWidth ? fitWidth / (bounds.right - bounds.left) : size);
      const scaleY = Math.min(size, fitHeight ? fitHeight / (bounds.bottom - bounds.top) : size);
      words.push({
        text,
        strokes: res.strokes.map((s) => s.map((p) => ({ x: x + p.x * scaleX, y: y + p.y * scaleY }))),
        lineCount: res.lines,
        bounds: {
          width: (bounds.right - bounds.left) * scaleX,
          height: (bounds.bottom - bounds.top) * scaleY,
        },
      });
    }
    return words;
  } finally {
    await browser.close();
  }
};

/** Write `words` with the Pen; returns the outlines (`d`) of the strokes this call added, in board order. */
const write = async (user, page, words, { step = 3 } = {}) => {
  const before = await user.toolbar.allPaths.count();
  await user.content.writeHandwriting([{ words }], { step });
  await page.waitForTimeout(1000);
  return user.toolbar.allPaths.evaluateAll((els, from) => els.slice(from).map((e) => e.getAttribute('d')), before);
};

const writePages = async (user, pages, { step = 5 } = {}) => {
  const before = await user.toolbar.allPaths.count();
  const expected = pages.reduce((n, p) => n + p.words.reduce((m, w) => m + w.strokes.length, 0), 0);
  await user.content.writeHandwriting(pages, { step });
  await expect
    .poll(() => user.toolbar.allPaths.count(), { message: 'every handwritten stroke was drawn' })
    .toBe(before + expected);
  return user.toolbar.allPaths.evaluateAll((els, from) => els.slice(from).map((e) => e.getAttribute('d')), before);
};

/** Pick the n-th pen colour. */
const penColour = async (user, n) => {
  await user.toolbar.openToolPanel('gtPen');
  await user.toolbar.penColorOptions.nth(n).click({ force: true });
  await user.toolbar.closePanelByTappingOutside();
};

/** Wait for the autosave, then come back to the board: by reloading, or by signing out and in again. */
const comeBack = async (user, page, how) => {
  await user.content.waitForSaved(180000);
  if (how === 'sign-out') {
    await user.userMenu.signOut();
    await user.signIn(pinForWhiteboard());
    await user.nav.applyClassMap('whiteboardReference');
  } else {
    await page.reload();
    await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
  }
  await user.toolbar.waitForBoardToSettle();
  await page.waitForTimeout(3000);
};

const boardOutlines = (user) => user.toolbar.allPaths.evaluateAll((els) => els.map((e) => e.getAttribute('d')));
const expectAllBack = async (user, written, what) => {
  const onBoard = new Set(await boardOutlines(user));
  const missing = written.filter((d) => !onBoard.has(d));
  expect(missing, `every stroke of ${what} is back (${written.length} written)`).toHaveLength(0);
};

test.describe('WB-14 A board as teachers really write', () => {
  test.describe.configure({ timeout: 300000 });

  test(
    'WB-14-01: the electric-charge lesson from the reference board is saved and comes back exactly after sign-out and sign-in',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      test.setTimeout(600000);
      await expect(user.nav.currentClassBtn).toContainText('Class 12A | Physics');
      await expect(user.nav.currentChapterTopicBtn).toContainText(/1\.6\s*\|\s*Electric Field Lines, Electric Flux/);
      const a = await user.content.writingArea();
      const title = await handwriting([
        {
          text: 'Properties of Electric Charge',
          x: a.x - 30,
          y: a.y - 30,
          size: 0.44,
          weight: 400,
          font: 'Segoe Print',
          fontSize: 120,
          maxWidth: 4000,
          continuous: true,
          fitWidth: 760,
          fitHeight: 80,
        },
      ]);
      await penColour(user, 3);
      const titleStrokes = await writePages(user, [{ words: title }], { step: 20 });
      const underline = await write(user, page, [
        { text: 'underline', strokes: [line({ x: a.x - 30, y: a.y + 45 }, { x: a.x + 720, y: a.y + 45 })] },
      ]);

      const notes = [
        '1. Charge is of two kinds, positive and negative. Like charges',
        'repel each other and unlike charges attract. 2. Charge is',
        'conserved. It is never created or destroyed; it only moves from',
        'one body to another. 3. Charge is quantised. Every charge is a',
        'whole number multiple of the charge on one electron. 4.',
        'Charge is additive. The total charge of a body is the sum of',
        'all the charges on it. When we rub a glass rod with silk,',
        'electrons move from the glass to the silk, so the rod becomes',
        'positive, and the silk becomes negative.',
      ];
      const body = await handwriting([
        {
          text: notes.join('\n'),
          x: a.x - 42,
          y: a.y + 68,
          size: 0.45,
          weight: 400,
          font: 'Segoe Print',
          fontSize: 120,
          maxWidth: 4000,
          lineHeight: 1.05,
          continuous: true,
          fitWidth: a.width + 22,
          fitHeight: a.height - 88,
        },
      ]);
      expect(body[0].lineCount, 'the note line breaks match the reference layout').toBe(notes.length);
      expect(body[0].bounds.width, 'the handwritten notes fit within the board width').toBeLessThanOrEqual(
        a.width + 22
      );
      expect(body[0].bounds.height, 'the handwritten notes fit below the title').toBeLessThanOrEqual(a.height - 88);
      await penColour(user, 0);
      const bodyStrokes = await writePages(user, [{ words: body }], { step: 20 });
      const written = [...titleStrokes, ...underline, ...bodyStrokes];
      expect(written.length, 'set-up: the reference lesson was written').toBeGreaterThan(100);
      await test.info().attach('reference-board-pen-writing', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
      await comeBack(user, page, 'sign-out');
      await expectAllBack(user, written, 'the reference lesson');
    }
  );

  test(
    'WB-14-02: a word crossed out and rewritten beside it is saved as written (both the crossing-out and the new word)',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const a = await user.content.writingArea();
      const [wrong, right] = await handwriting([
        { text: 'mitocondria', x: a.x, y: a.y + 40 },
        { text: 'mitochondria', x: a.x + 330, y: a.y + 40 },
      ]);
      const cross = {
        text: 'crossing-out',
        strokes: [line({ x: a.x - 5, y: a.y + 62 }, { x: a.x + 290, y: a.y + 58 })],
      };
      const written = await write(user, page, [wrong, cross, right]);
      await comeBack(user, page, 'reload');
      await expectAllBack(user, written, 'the crossed-out and rewritten word');
    }
  );

  test(
    'WB-14-03: highlighting a line with a second colour over existing writing is saved in the right order',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const a = await user.content.writingArea();
      const words = await handwriting([{ text: 'Energy is conserved', x: a.x, y: a.y + 40 }]);
      const writing = await write(user, page, words);
      await penColour(user, 12); // a yellow
      const highlight = await write(user, page, [
        { text: 'highlight', strokes: [line({ x: a.x - 10, y: a.y + 60 }, { x: a.x + 420, y: a.y + 60 })] },
      ]);
      await penColour(user, 0);
      await comeBack(user, page, 'reload');
      const order = await boardOutlines(user);
      await expectAllBack(user, [...writing, ...highlight], 'the line and its highlight');
      const lastWriting = Math.max(...writing.map((d) => order.indexOf(d)));
      expect(order.indexOf(highlight[0]), 'the highlight is still drawn over the writing').toBeGreaterThan(lastWriting);
    }
  );

  test(
    'WB-14-04: fractions, powers (x²), subscripts (H₂O), units and a small hand-drawn table are saved exactly',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const a = await user.content.writingArea();
      const words = await handwriting([
        { text: '3', x: a.x + 20, y: a.y },
        { text: '4', x: a.x + 20, y: a.y + 70 },
        { text: 'x', x: a.x + 120, y: a.y + 35 },
        { text: '2', x: a.x + 150, y: a.y + 15, size: 0.28 },
        { text: 'H', x: a.x + 230, y: a.y + 35 },
        { text: '2', x: a.x + 262, y: a.y + 60, size: 0.28 },
        { text: 'O', x: a.x + 285, y: a.y + 35 },
        { text: '9.8 m/s', x: a.x + 380, y: a.y + 35 },
        { text: 'Mass', x: a.x + 10, y: a.y + 170, size: 0.35 },
        { text: '5 kg', x: a.x + 170, y: a.y + 170, size: 0.35 },
      ]);
      const shapes = [
        { text: 'fraction bar', strokes: [line({ x: a.x + 10, y: a.y + 62 }, { x: a.x + 70, y: a.y + 62 })] },
        {
          text: 'table',
          strokes: [
            box(a.x, a.y + 150, 320, 100),
            line({ x: a.x + 160, y: a.y + 150 }, { x: a.x + 160, y: a.y + 250 }),
            line({ x: a.x, y: a.y + 200 }, { x: a.x + 320, y: a.y + 200 }),
          ],
        },
      ];
      const written = await write(user, page, [...words, ...shapes]);
      await comeBack(user, page, 'reload');
      await expectAllBack(user, written, 'the notation and the table');
    }
  );

  test(
    'WB-14-05: a labelled diagram (shapes, arrows and handwritten labels) keeps its labels in place after a reload',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const a = await user.content.writingArea();
      const labels = await handwriting([
        { text: 'Sun', x: a.x + 20, y: a.y + 10, size: 0.4 },
        { text: 'Leaf', x: a.x + 330, y: a.y + 150, size: 0.4 },
      ]);
      const shapes = [
        { text: 'sun', strokes: [circle({ x: a.x + 60, y: a.y + 90 }, 40)] },
        { text: 'rays', strokes: arrow({ x: a.x + 110, y: a.y + 100 }, { x: a.x + 300, y: a.y + 170 }) },
        { text: 'leaf', strokes: [circle({ x: a.x + 380, y: a.y + 220 }, 70, 35)] },
      ];
      const written = await write(user, page, [...shapes, ...labels]);
      const centres = await user.toolbar.boardCentres();
      await comeBack(user, page, 'reload');
      await expectAllBack(user, written, 'the diagram');
      const after = await user.toolbar.boardCentres();
      for (const c of centres.slice(-labels.length))
        expect(
          after.some((p) => Math.abs(p.x - c.x) <= 3 && Math.abs(p.y - c.y) <= 3),
          'each label is where it was written'
        ).toBe(true);
    }
  );

  test(
    'WB-14-06: an English heading, a Marathi explanation and a formula on one board all come back after sign-out',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const a = await user.content.writingArea();
      const words = await handwriting([
        { text: 'Water Cycle', x: a.x, y: a.y, size: 0.55 },
        { text: 'पाण्याचे चक्र निसर्गात सतत चालू असते', x: a.x, y: a.y + 90 },
        { text: 'H2O + heat → vapour', x: a.x, y: a.y + 170 },
      ]);
      const written = await write(user, page, words);
      await comeBack(user, page, 'sign-out');
      await expectAllBack(user, written, 'the English, Marathi and formula');
    }
  );

  test(
    'WB-14-09: Hindi or Marathi text on the board never comes back as boxes or question marks after sign-out',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const id = Date.now() % 100000;
      const sentences = [`कक्षा सात की सूचना ${id}`, `पाण्याचे चक्र ${id}`];
      const a = await user.content.writingArea();
      const box = await user.whiteboard.wbSvg.boundingBox();
      for (let i = 0; i < sentences.length; i++) {
        await user.whiteboard.insertTextAndType(a.x - box.x + 40, a.y - box.y + 60 + i * 90, sentences[i]);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);
      }
      await comeBack(user, page, 'sign-out');
      for (const s of sentences) {
        const back = user.whiteboard.wbContainer.locator('foreignObject.text-element').filter({ hasText: String(id) });
        await expect(back.filter({ hasText: s }), `"${s}" is back exactly as typed`).toHaveCount(1, {
          timeout: 30000,
        });
      }
      const texts = await user.whiteboard.wbContainer
        .locator('foreignObject.text-element')
        .filter({ hasText: String(id) })
        .allTextContents();
      expect(texts.join(' '), 'no question marks, boxes or replacement characters').not.toMatch(/[?�□▯]/);
    }
  );

  test(
    'WB-14-08: each screen of a 9-screen board can be reached from the Minimap, and the viewport box matches what is shown',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      test.setTimeout(300000);
      const tb = user.toolbar;
      const svgBox = await tb.wbSvg.boundingBox();
      /** Drag the board with the Pan tool so the view moves right by `dx` and down by `dy` (screen px). */
      const pan = async (dx, dy) => {
        await tb.selectTool('gtPan');
        // In drags of at most a third of the board, each starting on the side it moves away from.
        const parts = Math.ceil(Math.max(Math.abs(dx) / (svgBox.width / 3), Math.abs(dy) / (svgBox.height / 3), 1));
        for (let p = 0; p < parts; p++) {
          const [mx, my] = [dx / parts, dy / parts];
          const x = svgBox.x + svgBox.width / 2 + Math.sign(mx) * (svgBox.width / 6);
          const y = svgBox.y + svgBox.height / 2 + Math.sign(my) * (svgBox.height / 6);
          await page.mouse.move(x, y);
          await page.mouse.down();
          for (let i = 1; i <= 15; i++) await page.mouse.move(x - (mx * i) / 15, y - (my * i) / 15);
          await page.mouse.up();
          await page.waitForTimeout(400);
        }
      };
      // Board coordinates: the visible part of the board, and the centre of a stroke (by its outline).
      const inBoard = (fn, arg) =>
        page.evaluate(
          ([source, a]) => {
            const svg = document.querySelector('[data-qa-id="wb-drawing-container"] svg');
            const g = svg.querySelector('g.svg-pan-zoom_viewport, #panGroup') || svg;
            const toBoard = g.getScreenCTM().inverse();
            const at = (x, y) => new DOMPoint(x, y).matrixTransform(toBoard);
            return new Function('svg', 'at', 'a', `return (${source})(svg, at, a);`)(svg, at, a);
          },
          [fn.toString(), arg]
        );
      const view = () =>
        inBoard((svg, at) => {
          const r = svg.getBoundingClientRect();
          const a = at(r.left, r.top);
          const b = at(r.right, r.bottom);
          return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
        });
      const centreOf = (d) =>
        inBoard((svg, at, want) => {
          const p = [...svg.querySelectorAll('path')].find((e) => e.getAttribute('d') === want);
          const r = p.getBoundingClientRect();
          return {
            board: at(r.x + r.width / 2, r.y + r.height / 2),
            screen: { x: r.x + r.width / 2, y: r.y + r.height / 2 },
          };
        }, d);

      // 3 x 3 screens on fresh space: one marker stroke in the middle of each, panning one screen at a time.
      const step = { x: svgBox.width, y: svgBox.height };
      const markers = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (col > 0) await pan(step.x, 0);
          await tb.penStroke(
            { x: svgBox.width / 2 - 60, y: svgBox.height / 2 },
            { x: svgBox.width / 2 + 60, y: svgBox.height / 2 + 30 }
          );
          markers.push({ screen: `${row + 1}.${col + 1}`, d: await tb.paths.last().getAttribute('d') });
        }
        if (row < 2) await pan(-2 * step.x, step.y);
      }
      try {
        await user.minimap.open(tb);
        // Where the board is on the Minimap: from the viewport box and the part of the board on screen now.
        const rect0 = (await user.minimap.readCanvas()).rect;
        const view0 = await view();
        const sx = rect0.width / view0.width;
        const sy = rect0.height / view0.height;
        const toMap = (p) => ({ x: rect0.x + (p.x - view0.x) * sx, y: rect0.y + (p.y - view0.y) * sy });
        const { width, height } = await user.minimap.readCanvas();
        const problems = [];
        for (const m of markers) {
          const target = toMap((await centreOf(m.d)).board);
          await user.minimap.clickAt(target.x / width, target.y / height);
          await page.waitForTimeout(800);
          const { screen } = await centreOf(m.d);
          const shown =
            screen.x > svgBox.x &&
            screen.x < svgBox.x + svgBox.width &&
            screen.y > svgBox.y &&
            screen.y < svgBox.y + svgBox.height;
          const v = await view();
          const expected = toMap({ x: v.x, y: v.y });
          const rect = (await user.minimap.readCanvas()).rect;
          const boxMatches = !!rect && Math.abs(rect.x - expected.x) <= 8 && Math.abs(rect.y - expected.y) <= 8;
          if (!shown) problems.push(`screen ${m.screen}: not in view after clicking it on the Minimap`);
          if (!boxMatches)
            problems.push(
              `screen ${m.screen}: viewport box ${JSON.stringify(rect)} vs the view at ${JSON.stringify(expected)}`
            );
        }
        expect(problems, 'every screen reached, and the viewport box shows where the view is').toEqual([]);
      } finally {
        await user.minimap.resetBtn.click({ force: true, timeout: 3000 }).catch(() => {});
        await user.minimap.close().catch(() => {});
      }
    }
  );
});
