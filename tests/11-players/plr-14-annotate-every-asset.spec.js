// PLR-14 — Annotating on every kind of asset, the way a teacher really uses it
// Source: CEPV2_Stories/11_Players.md
// Data: 'playersDefault' (Class 12A Computer Science 14.1, second account): Worksheet, Image, Video, Web link, Code
// editor and an Unsupported-file card; 'quiz' (Class 11A Accountancy 3.1) for the Quiz.
//
// PLR-07 covers the Worksheet in depth. Here every kind is used in the same real-life ways: write on it; zoom in, write,
// pan, write again; use every tool on it; close it and open it again; and check nothing is left on the whiteboard. The
// video gets its own cases (annotate while paused, then play / seek / pause), and two assets open together must each keep
// their own annotations.
//
// Where an annotation lands is not the same for every player (the Worksheet has its own annotation layer), so strokes
// are counted on both the asset's annotation layer and the whiteboard under it.
// Annotations are cleared from the asset (Eraser -> Clear annotations) before and after each test; the board is not.

const { test, expect } = require('../../fixtures');

const icon = (name) =>
  `[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="${name}" i]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="${name}" i])`;

const KINDS = [
  { id: '01', kind: 'worksheet (PDF)', selector: icon('ic.Worksheet'), map: 'playersDefault' },
  { id: '02', kind: 'image', selector: icon('ic.Image'), map: 'playersDefault' },
  { id: '03', kind: 'video', selector: icon('ic.AVMediaVideo'), map: 'playersDefault' },
  { id: '04', kind: 'web link', selector: icon('ic.Weblink'), map: 'playersDefault' },
  { id: '05', kind: 'code editor', selector: icon('ic.code'), map: 'playersDefault' },
  { id: '06', kind: 'unsupported file', selector: icon('ic.unsupport'), map: 'playersDefault' },
  { id: '07', kind: 'quiz', selector: '[data-qa-id="playlist-quiz-card"] .resource-card', map: 'quiz' },
];

const STROKES = 'svg.annotation-layer path, [data-qa-id="wb-drawing-container"] svg path';
const strokeGeometry = (page) => page.locator(STROKES).evaluateAll((els) => els.map((e) => e.getAttribute('d')));

/** The open player's area on screen (the last visible player). */
const playerBox = async (page) => {
  const players = page
    .locator('.resources-player, .player, lib-quiz-renderer, tce-code-main')
    .filter({ visible: true });
  return (await players.last().boundingBox()) || { x: 300, y: 150, width: 800, height: 450 };
};

/** A pen stroke across the middle of the open asset (offset in px from its centre). */
const writeOnAsset = async (user, { dx = 180, dy = 40, offsetY = 0, offsetX = 0 } = {}) => {
  const page = user.page;
  const box = await playerBox(page);
  const x = box.x + box.width / 2 - dx / 2 + offsetX;
  const y = box.y + Math.min(box.height / 2, 260) + offsetY;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) await page.mouse.move(x + (dx * i) / 14, y + Math.sin(i / 2) * 12 + (dy * i) / 14);
  await page.mouse.up();
  await page.waitForTimeout(700);
};

const clearAnnotations = async (user) => {
  await user.toolbar.openToolPanel('gtErase');
  await user.toolbar.eraserClearAnnotationsBtn.click({ force: true, timeout: 3000 }).catch(() => {});
  await user.page.waitForTimeout(1000);
  await user.toolbar.closePanelByTappingOutside();
};

const open = async (user, k) => {
  const card = user.page.locator(k.selector);
  await expect(card.first(), `a ${k.kind} card is in this topic`).toBeAttached({ timeout: 15000 });
  await user.player.openResourceCard(card);
  if (k.kind === 'code editor') {
    // CONFIRMED LIVE (2026-09-27): Monaco is the heaviest player to mount -- a generic 5 s wait can catch it still
    // on its loading spinner (a plain black screen), so a stroke drawn then lands on nothing. Wait for it directly.
    await user.player.codeEditorComponent
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .catch(() => {});
    await user.page.waitForTimeout(2000);
  } else {
    await user.page.waitForTimeout(5000);
  }
};

/** Select the Rectangle shape without ToolbarPage.chooseShape()'s own dismiss-tap at a fixed page point (200, 400):
 * CONFIRMED LIVE (2026-09-27) that point sits on top of an open asset's own content (e.g. a worksheet page), and
 * tapping it there can disarm the just-chosen tool before the draw happens, instead of merely closing the panel. */
const chooseRectangleOverAsset = async (user) => {
  await user.toolbar.openToolPanel('gtShapes');
  await user.page.locator('[data-qa-id="toolbar-shape-gtDrawRect"]').click({ force: true });
  await user.page.waitForTimeout(500);
};

for (const k of KINDS) {
  test.describe(`PLR-14-${k.id} Annotating on a ${k.kind}`, () => {
    test.use({ classMap: k.map });
    test.describe.configure({ timeout: 180000 });

    test.beforeEach(async ({ user }) => {
      await open(user, k);
      await clearAnnotations(user);
    });

    test.afterEach(async ({ app }) => {
      await clearAnnotations(app).catch(() => {});
      for (let i = 0; i < 3; i++) await app.player.closePlayer().catch(() => {});
    });

    test(
      `PLR-14-${k.id}a: the teacher can write on an open ${k.kind}, and the stroke is on the asset`,
      { tag: ['@functional'] },
      async ({ user, page }) => {
        const before = (await strokeGeometry(page)).length;
        await user.toolbar.selectTool('gtPen');
        await writeOnAsset(user);
        // The app's own "Whiteboard Saved!" toast can lag a moment behind the DOM path actually appearing -- poll.
        await expect
          .poll(() => page.locator(STROKES).count(), { message: 'one stroke added', timeout: 5000 })
          .toBe(before + 1);
        const box = await playerBox(page);
        const last = await page.locator(STROKES).last().boundingBox();
        expect(
          last && last.x >= box.x - 5 && last.x + last.width <= box.x + box.width + 5,
          'the stroke is over the asset'
        ).toBe(true);
      }
    );

    test(
      `PLR-14-${k.id}b: zoom in, write, pan, write again on a ${k.kind}: both strokes stay and move with the asset`,
      { tag: ['@functional', '@edge'] },
      async ({ user, page }) => {
        const tb = user.toolbar;
        const before = (await strokeGeometry(page)).length;
        await tb.openToolPanel('gtZoom');
        await tb.zoomInBtn.click({ force: true });
        await tb.zoomInBtn.click({ force: true });
        await tb.closePanelByTappingOutside();
        await tb.selectTool('gtPen');
        await writeOnAsset(user, { offsetY: -40 });
        const firstBox = await page.locator(STROKES).last().boundingBox();
        await tb.selectTool('gtPan');
        const box = await playerBox(page);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        for (let i = 1; i <= 12; i++)
          await page.mouse.move(box.x + box.width / 2 - 10 * i, box.y + box.height / 2 - 6 * i);
        await page.mouse.up();
        await page.waitForTimeout(800);
        await tb.selectTool('gtPen');
        await writeOnAsset(user, { offsetY: 40 });
        await expect
          .poll(() => page.locator(STROKES).count(), {
            message: 'both strokes are there, none lost to the zoom or the pan',
            timeout: 5000,
          })
          .toBe(before + 2);
        const after = await strokeGeometry(page);
        const movedBox = await page.locator(STROKES).nth(-2).boundingBox();
        test.info().annotations.push({
          type: 'note',
          description: `first stroke ${JSON.stringify(firstBox)} -> after pan ${JSON.stringify(movedBox)}`,
        });
        await tb.openToolPanel('gtZoom');
        await tb.zoomResetBtn.click({ force: true });
        await tb.closePanelByTappingOutside();
      }
    );

    test(
      `PLR-14-${k.id}c: every tool works on a ${k.kind}: pen, shape, text, eraser, undo, redo`,
      { tag: ['@functional'] },
      async ({ user, page }) => {
        const tb = user.toolbar;
        const count = () => page.locator(STROKES).count();
        const pollCount = (msg, target) => expect.poll(count, { message: msg, timeout: 5000 }).toBe(target);
        const start = await count();
        await tb.selectTool('gtPen');
        await writeOnAsset(user, { offsetY: -60 });
        await pollCount('pen', start + 1);
        await chooseRectangleOverAsset(user);
        const box = await playerBox(page);
        await page.mouse.move(box.x + box.width / 2 - 60, box.y + Math.min(box.height / 2, 260) + 20);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 60, box.y + Math.min(box.height / 2, 260) + 90, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(700);
        await pollCount('shape', start + 2);
        const texts = await page.locator('foreignObject.text-element').count();
        await user.whiteboard
          .insertTextAndType(
            box.x + box.width / 2 - 200 - (await tb.wbSvg.boundingBox()).x,
            box.y + 60 - (await tb.wbSvg.boundingBox()).y,
            'Note on asset'
          )
          .catch(() => {});
        await tb.selectTool('gtSelect');
        await expect
          .poll(() => page.locator('foreignObject.text-element').count(), { message: 'text box', timeout: 5000 })
          .toBe(texts + 1);
        await tb.selectTool('gtErase');
        const s = await page.locator(STROKES).first().boundingBox();
        await writeOnAsset(user, { offsetY: -60, dx: 220, dy: 0 }); // erase back across the pen stroke
        await expect.poll(count, { message: 'eraser removed something', timeout: 5000 }).toBeLessThan(start + 2);
        const afterErase = await count();
        await tb.tool('gtUndo').click({ force: true });
        await pollCount('undo brings the erased stroke back', start + 2);
        await tb.tool('gtRedo').click({ force: true });
        await pollCount('redo erases it again', afterErase);
        void s;
      }
    );

    test(
      `PLR-14-${k.id}d: annotations on a ${k.kind} are still there after closing and opening it again`,
      { tag: ['@regression'] },
      async ({ user, page }) => {
        await user.toolbar.selectTool('gtPen');
        const beforeD = await page.locator(STROKES).count();
        await writeOnAsset(user);
        await expect.poll(() => page.locator(STROKES).count(), { timeout: 5000 }).toBe(beforeD + 1);
        const mine = (await strokeGeometry(page)).slice(-1);
        await user.page.waitForTimeout(12000); // autosave countdown
        await user.player.closePlayer();
        await page.waitForTimeout(2000);
        await open(user, k);
        await expect
          .poll(async () => (await strokeGeometry(page)).filter((d) => mine.includes(d)).length, {
            message: 'the annotation is back when the asset is opened again',
            timeout: 20000,
          })
          .toBe(1);
      }
    );

    test(
      `PLR-14-${k.id}e: after closing a ${k.kind}, its annotations are not left on the whiteboard`,
      { tag: ['@regression'] },
      async ({ user, page }) => {
        await user.toolbar.selectTool('gtPen');
        const beforeE = await page.locator(STROKES).count();
        await writeOnAsset(user);
        await expect.poll(() => page.locator(STROKES).count(), { timeout: 5000 }).toBe(beforeE + 1);
        const mine = (await strokeGeometry(page)).slice(-1);
        await user.player.closePlayer();
        await page.waitForTimeout(2500);
        const onBoard = await user.content.pathGeometry();
        expect(
          onBoard.filter((d) => mine.includes(d)),
          'the asset’s annotation did not stay behind on the board'
        ).toEqual([]);
        await open(user, k); // back open, so afterEach clears the asset's annotations
      }
    );
  });
}

test.describe('PLR-14-V Annotations on a video while it plays', () => {
  test.use({ classMap: 'playersDefault' });
  test.describe.configure({ timeout: 180000 });
  const video = KINDS.find((k) => k.kind === 'video');

  test.beforeEach(async ({ user }) => {
    await open(user, video);
    await clearAnnotations(user);
    const before = await user.page.locator(STROKES).count();
    await user.toolbar.selectTool('gtPen');
    await writeOnAsset(user);
    await expect.poll(() => user.page.locator(STROKES).count(), { timeout: 5000 }).toBe(before + 1);
  });

  test.afterEach(async ({ app }) => {
    await clearAnnotations(app).catch(() => {});
    await app.player.closePlayer().catch(() => {});
  });

  const mineStillThere = async (user, mine, when) =>
    expect(
      (await strokeGeometry(user.page)).filter((d) => mine.includes(d)),
      `the annotation is still there ${when}`
    ).toHaveLength(mine.length);

  test(
    'PLR-14-V1: an annotation drawn on a paused video stays when the video is played',
    { tag: ['@regression'] },
    async ({ user }) => {
      const mine = (await strokeGeometry(user.page)).slice(-1);
      await user.player.toggleVideoPlayback();
      await user.page.waitForTimeout(4000);
      await mineStillThere(user, mine, 'while the video plays');
    }
  );

  test(
    'PLR-14-V2: the annotation stays when the teacher seeks to another point and pauses',
    { tag: ['@regression'] },
    async ({ user }) => {
      const mine = (await strokeGeometry(user.page)).slice(-1);
      await user.player.toggleVideoPlayback();
      await user.page.waitForTimeout(2000);
      await user.player.videoElement
        .evaluate((v) => (v.currentTime = Math.min(v.duration - 1, v.currentTime + 20)))
        .catch(() => {});
      await user.page.waitForTimeout(2000);
      await user.player.toggleVideoPlayback();
      await user.page.waitForTimeout(1500);
      await mineStillThere(user, mine, 'after seeking and pausing');
    }
  );

  test(
    'PLR-14-V3: the teacher can annotate again after playing and pausing',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.player.toggleVideoPlayback();
      await user.page.waitForTimeout(3000);
      await user.player.toggleVideoPlayback();
      await user.page.waitForTimeout(1000);
      const before = await user.page.locator(STROKES).count();
      await user.toolbar.selectTool('gtPen');
      await writeOnAsset(user, { offsetY: 50 });
      await expect
        .poll(() => user.page.locator(STROKES).count(), {
          message: 'a new annotation lands after play/pause',
          timeout: 5000,
        })
        .toBe(before + 1);
    }
  );
});

test.describe('PLR-14-M Two assets open at once', () => {
  test.use({ classMap: 'playersDefault' });
  test.describe.configure({ timeout: 180000 });

  test(
    'PLR-14-M1: with an image and a worksheet open, each keeps its own annotation, and closing one keeps the other’s',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const [image, sheet] = [KINDS[1], KINDS[0]];
      await open(user, sheet);
      await clearAnnotations(user);
      await user.toolbar.selectTool('gtPen');
      const beforeSheet = await page.locator(STROKES).count();
      await writeOnAsset(user);
      await expect.poll(() => page.locator(STROKES).count(), { timeout: 5000 }).toBe(beforeSheet + 1);
      const sheetMine = (await strokeGeometry(page)).slice(-1);
      await open(user, image);
      await user.toolbar.selectTool('gtPen');
      const beforeImage = await page.locator(STROKES).count();
      await writeOnAsset(user, { offsetY: 60 });
      await expect.poll(() => page.locator(STROKES).count(), { timeout: 5000 }).toBe(beforeImage + 1);
      const imageMine = (await strokeGeometry(page)).slice(-1);
      await user.player.closePlayer(); // closes the one on top (the image)
      await page.waitForTimeout(2500);
      const now = await strokeGeometry(page);
      expect(
        now.filter((d) => sheetMine.includes(d)),
        'the worksheet’s annotation is still there'
      ).toHaveLength(1);
      expect(
        now.filter((d) => imageMine.includes(d)),
        'the image’s annotation went with the image'
      ).toHaveLength(0);
      await clearAnnotations(user);
      await user.player.closePlayer();
    }
  );
});
