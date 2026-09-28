// WB-10 — Touch and stylus on the classroom panel
// Source: CEPV2_Stories/06_Whiteboard.md
//
// Classroom panels are touch screens used with fingers and a pen. Every other whiteboard test uses the mouse; these
// send real touch and pen input through Chrome DevTools Protocol (pages/touch-input.js), the same way a panel's
// digitiser does, so the app receives genuine pointerType "touch"/"pen" events.
// Data: 'toolbarGeneral' (Class 12A Physics, 1.1), cleared before each test and at the end.

const { test, expect } = require('../../fixtures');
const { TouchInput } = require('../../pages/touch-input');
const { layoutHandwriting, lessonText, densify } = require('../../pages/lib/handwriting');

const line = (x1, y1, x2, y2, n = 20) =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / n, y: y1 + ((y2 - y1) * i) / n }));
const wave = (x, y, w, n = 30) =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: x + (w * i) / n, y: y + Math.sin(i / 3) * 18 }));

const canvas = async (user) => user.toolbar.wbSvg.boundingBox();
const center = async (locator) => {
  const b = await locator.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const reload = async (user) => {
  await user.page.reload();
  await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
  await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 20000 });
  await user.page.waitForTimeout(3000);
  await user.toolbar.waitForBoardToSettle();
};

test.describe('WB-10 Touch and stylus', () => {
  test.use({ classMap: 'toolbarGeneral', cleanBoard: true });

  let touch;

  test.beforeEach(async ({ user }) => {
    touch = new TouchInput(user.page);
  });

  test.afterEach(async ({ app }) => {
    await touch.dispose();
    await app.toolbar.clearBoard(app.whiteboard).catch(() => {});
  });

  test(
    'WB-10-01: a finger stroke with the Pen draws exactly one stroke where the finger went',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const c = await canvas(user);
      await user.toolbar.selectTool('gtPen');
      const before = await user.toolbar.pathCount();
      await touch.fingerStroke(wave(c.x + 400, c.y + 400, 300));
      await user.page.waitForTimeout(800);
      expect(await user.toolbar.pathCount(), 'one stroke from one finger drag').toBe(before + 1);
      const box = await user.toolbar.lastPathBox();
      expect(box.x, 'drawn where the finger was').toBeGreaterThan(c.x + 380);
      expect(box.x + box.width, 'and as long as the finger moved').toBeGreaterThan(c.x + 650);
    }
  );

  test(
    'WB-10-02: a stylus stroke with the Pen draws exactly one stroke',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const c = await canvas(user);
      await user.toolbar.selectTool('gtPen');
      const before = await user.toolbar.pathCount();
      await touch.penStroke(wave(c.x + 400, c.y + 400, 300));
      await user.page.waitForTimeout(800);
      expect(await user.toolbar.pathCount(), 'one stroke from one pen stroke').toBe(before + 1);
    }
  );

  test(
    'WB-10-03: fast stylus handwriting (30 words) keeps every stroke, and they survive a reload',
    { tag: ['@regression'] },
    async ({ user }) => {
      test.setTimeout(8 * 60 * 1000);
      const c = await canvas(user);
      const area = await user.content.writingArea();
      const pages = layoutHandwriting(lessonText(30), area, { seed: 41 });
      const strokes = pages.flatMap((p) => p.words.flatMap((w) => w.strokes));
      await user.toolbar.selectTool('gtPen');
      for (const s of strokes) await touch.penStroke(densify(s).map((p) => ({ x: c.x + p.x, y: c.y + p.y })));
      await user.page.waitForTimeout(1500);
      expect(await user.toolbar.pathCount(), 'no pen stroke was dropped').toBe(strokes.length);
      const geometry = await user.content.pathGeometry();
      await user.page.waitForTimeout(15000); // autosave
      await reload(user);
      expect(await user.content.pathGeometry(), 'pen handwriting is saved exactly').toEqual(geometry);
    }
  );

  test(
    'WB-10-04: a two-finger drag pans the board and draws nothing, even with the Pen selected',
    { tag: ['@functional'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): A two-finger drag does not pan the board -- it draws a stroke instead, even with the Pen selected
      test.fail(
        true,
        'A two-finger drag does not pan the board -- it draws a stroke instead, even with the Pen selected'
      );
      const c = await canvas(user);
      await user.toolbar.penStroke({ x: 500, y: 400 }, { x: 700, y: 440 });
      const before = await user.toolbar.pathCount();
      const boxBefore = await user.toolbar.lastPathBox();
      await user.toolbar.selectTool('gtPen');
      await touch.twoFingerPan(c.x + 600, c.y + 500, -250, -150);
      await user.page.waitForTimeout(1000);
      expect(await user.toolbar.pathCount(), 'no stroke drawn by the two fingers').toBe(before);
      const boxAfter = await user.toolbar.lastPathBox();
      expect(Math.abs(boxAfter.x - boxBefore.x) + Math.abs(boxAfter.y - boxBefore.y), 'the view moved').toBeGreaterThan(
        50
      );
    }
  );

  test('WB-10-05: pinching out zooms in and draws nothing', { tag: ['@functional'] }, async ({ user }) => {
    // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): Pinching does not zoom -- one finger draws a stroke on the board instead
    test.fail(true, 'Pinching does not zoom -- one finger draws a stroke on the board instead');
    const c = await canvas(user);
    await user.toolbar.penStroke({ x: 500, y: 400 }, { x: 700, y: 440 });
    const before = await user.toolbar.pathCount();
    const zoomBefore = await user.content.zoomPercent();
    const widthBefore = (await user.toolbar.lastPathBox()).width;
    await user.toolbar.selectTool('gtPen');
    await touch.pinch(c.x + 600, c.y + 420, 2);
    await user.page.waitForTimeout(1000);
    expect(await user.toolbar.pathCount(), 'no stroke drawn by the pinch').toBe(before);
    const zoomAfter = await user.content.zoomPercent();
    const widthAfter = (await user.toolbar.lastPathBox()).width;
    test.info().annotations.push({
      type: 'note',
      description: `zoom ${zoomBefore}% -> ${zoomAfter}%, width ${widthBefore} -> ${widthAfter}`,
    });
    expect(widthAfter, 'content got bigger (zoomed in)').toBeGreaterThan(widthBefore * 1.2);
  });

  test(
    'WB-10-06: with the palm resting on the screen, the pen writes one stroke and the palm draws nothing',
    { tag: ['@negative'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): With the palm resting on the screen, the pen stroke also draws a second stroke from the palm to the pen (no palm rejection)
      test.fail(
        true,
        'With the palm resting on the screen, the pen stroke also draws a second stroke from the palm to the pen (no palm rejection)'
      );
      const c = await canvas(user);
      await user.toolbar.selectTool('gtPen');
      const before = await user.toolbar.pathCount();
      await touch.penStrokeWithPalm(wave(c.x + 400, c.y + 350, 300), { x: c.x + 760, y: c.y + 520 });
      await user.page.waitForTimeout(1000);
      expect(await user.toolbar.pathCount(), 'only the pen stroke, no mark from the palm').toBe(before + 1);
    }
  );

  test('WB-10-07: a finger tap on a toolbar tool selects it', { tag: ['@functional'] }, async ({ user }) => {
    const pan = await center(user.toolbar.tool('gtPan'));
    await touch.tap(pan.x, pan.y);
    await expect(user.toolbar.isToolActive('gtPan'), 'Pan selected by a tap').toHaveCount(1, { timeout: 5000 });
    const pen = await center(user.toolbar.tool('gtPen'));
    await touch.tap(pen.x, pen.y);
    await expect(user.toolbar.isToolActive('gtPen'), 'Pen selected by a tap').toHaveCount(1, { timeout: 5000 });
  });

  test(
    'WB-10-08: one finger tap on Undo undoes exactly one stroke (no ghost double tap)',
    { tag: ['@regression'] },
    async ({ user }) => {
      await user.toolbar.penStroke({ x: 400, y: 400 }, { x: 600, y: 420 });
      await user.toolbar.penStroke({ x: 400, y: 500 }, { x: 600, y: 520 });
      await user.toolbar.penStroke({ x: 400, y: 600 }, { x: 600, y: 620 });
      const before = await user.content.pathGeometry();
      const undo = await center(user.toolbar.tool('gtUndo'));
      await touch.tap(undo.x, undo.y);
      await user.page.waitForTimeout(1500);
      expect(await user.content.pathGeometry(), 'exactly the last stroke undone').toEqual(before.slice(0, -1));
    }
  );

  test(
    'WB-10-09: a finger drag with Select moves a stroke and draws nothing new',
    { tag: ['@functional'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): A finger drag with Select does not move the selected stroke (it stays where it was)
      test.fail(true, 'A finger drag with Select does not move the selected stroke (it stays where it was)');
      const c = await canvas(user);
      await user.toolbar.penStroke({ x: 500, y: 400 }, { x: 700, y: 400 });
      const box = await user.toolbar.lastPathBox();
      const count = await user.toolbar.pathCount();
      await user.toolbar.selectTool('gtSelect');
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await touch.tap(cx, cy);
      await user.page.waitForTimeout(500);
      await touch.fingerStroke(line(cx, cy, cx + 150, cy + 120, 25), 12);
      await user.page.waitForTimeout(1000);
      // (The selection handles are drawn as paths too, so the stroke count is not compared while something is selected.)
      void count;
      const moved = await user.toolbar.lastPathBox();
      expect(moved.x - box.x, 'the stroke moved with the finger').toBeGreaterThan(80);
      void c;
    }
  );

  test('WB-10-10: the stylus eraser rubs out what it passes over', { tag: ['@functional'] }, async ({ user }) => {
    // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): The stylus eraser does not erase what it passes over
    test.fail(true, 'The stylus eraser does not erase what it passes over');
    const c = await canvas(user);
    await user.toolbar.drawLetters(4, { x: 400, y: 400 });
    const before = await user.toolbar.pathCount();
    await user.toolbar.selectTool('gtErase');
    await touch.penStroke(line(c.x + 380, c.y + 430, c.x + 520, c.y + 430, 30));
    await user.page.waitForTimeout(1000);
    expect(await user.toolbar.pathCount(), 'the pen eraser removed the strokes it crossed').toBeLessThan(before);
  });

  test(
    'WB-10-11: one finger tap on a Playlist card opens exactly one player',
    { tag: ['@regression'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): A single finger tap on a Playlist card does not always open it
      test.fail(true, 'A single finger tap on a Playlist card does not always open it');
      await user.playlist.ensureDrawerVisible();
      const card = user.playlist.resourceCards.first();
      await card.scrollIntoViewIfNeeded();
      const p = await center(card);
      await touch.tap(p.x, p.y);
      await expect(user.player.closeIcon.first(), 'a player opened from a tap').toBeVisible({ timeout: 20000 });
      await user.page.waitForTimeout(3000);
      await expect(user.player.closeIcon, 'exactly one player (no ghost second tap)').toHaveCount(1);
      await user.player.closePlayer();
    }
  );

  test(
    'WB-10-12: one finger tap on "+" opens the Add Resource menu and it stays open',
    { tag: ['@regression'] },
    async ({ user }) => {
      const plus = await center(user.addResource.addResourcesTrigger);
      await touch.tap(plus.x, plus.y);
      await user.page.waitForTimeout(1500);
      await expect(
        user.addResource.actions.create,
        'the menu is open after a tap (not opened and closed again)'
      ).toBeVisible();
      await touch.tap(plus.x, plus.y);
    }
  );

  test(
    'WB-10-13: swiping the Playlist strip with a finger scrolls it and does not open a card',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.playlist.ensureDrawerVisible();
      const strip = await user.playlist.resourceCards.first().boundingBox();
      const firstX = strip.x;
      await touch.fingerStroke(
        line(strip.x + 600, strip.y + strip.height / 2, strip.x + 100, strip.y + strip.height / 2, 20),
        16
      );
      await user.page.waitForTimeout(1500);
      await expect(user.player.closeIcon, 'the swipe did not open a card').toHaveCount(0);
      const after = await user.playlist.resourceCards.first().boundingBox();
      expect(firstX - after.x, 'the strip scrolled').toBeGreaterThan(50);
    }
  );

  test(
    'WB-10-14: a long press on the board with the Pen does not leave a stray dot or open anything unexpected',
    { tag: ['@edge'] },
    async ({ user }) => {
      const c = await canvas(user);
      await user.toolbar.selectTool('gtPen');
      const before = await user.toolbar.pathCount();
      await touch.longPress(c.x + 600, c.y + 450, 1200);
      await user.page.waitForTimeout(1000);
      const after = await user.toolbar.pathCount();
      test.info().annotations.push({ type: 'note', description: `strokes ${before} -> ${after}` });
      expect(after - before, 'at most a single dot').toBeLessThanOrEqual(1);
      await expect(
        user.page.locator('.mat-mdc-menu-panel, [role="menu"]').filter({ visible: true }),
        'no menu popped up'
      ).toHaveCount(0);
    }
  );
});

// --- A teacher writing a lesson by hand, on the teacher's board that is never cleared ('longSession', Class 12A
// Physics 3.1, owner's request 2026-09-27): each session pans below what earlier sessions wrote and checks that old and
// new writing are all there after a reload. ---
test.describe('WB-10 Handwriting by finger and stylus', () => {
  test.use({ classMap: 'longSession' });

  let touch;

  test.beforeEach(async ({ user }) => {
    touch = new TouchInput(user.page);
  });

  test.afterEach(async () => {
    await touch.dispose();
  });

  // --- A teacher writing a lesson by hand: finger; stylus; stylus with the palm resting ---
  // The palm-resting session is its own case (WB-10-17): with no palm rejection (bug WB-10-06) every pen stroke also
  // draws a palm line, which would otherwise make the plain stylus session fail for a reason that is not its own.

  const handwritingSession = async (user, how) => {
    test.setTimeout(30 * 60 * 1000);
    const c = await canvas(user);
    const area = await user.content.writingArea();
    // A bit larger letters than with a mouse, as people write bigger with a finger.
    const pages = layoutHandwriting(lessonText(150), area, {
      seed: { finger: 51, stylus: 52, 'stylus with palm': 53 }[how],
      xHeight: how === 'finger' ? 20 : 16,
    });
    // The board is never cleared: note what is already there, and pan below it to fresh space.
    const before = await user.content.pathGeometry();
    // Fresh space with the Pan tool: a two-finger drag draws lines instead of panning (bug, WB-10-04), which would
    // spoil the writing test, so that bug is left to its own case.
    await user.content.panBelowExistingWriting();
    const expected = pages.reduce((n, p) => n + p.words.reduce((m, w) => m + w.strokes.length, 0), 0);
    const palm = { x: c.x + Math.min(c.width - 300, area.x + area.width + 60), y: c.y + area.y + area.height - 40 };
    await user.content.startSaveLog();
    const started = Date.now();
    const draw = {
      finger: (pts) => touch.fingerStroke(pts, 0),
      stylus: (pts) => touch.penStroke(pts),
      'stylus with palm': (pts) => touch.penStrokeWithPalm(pts, palm),
    }[how];
    await user.content.writeHandwriting(pages, {
      draw,
      nextPage: () => user.content.panUp(area.height + 40),
    });
    const finished = Date.now();
    const geometry = await user.content.pathGeometry();
    await expect
      .poll(async () => (await user.content.savedMessages()).some((m) => m.at > finished && /saved/i.test(m.text)), {
        message: 'a "Whiteboard Saved!" follows the last word',
        timeout: 60000,
      })
      .toBe(true);
    const saves = (await user.content.savedMessages()).filter((m) => /saved/i.test(m.text));
    test.info().annotations.push({
      type: 'note',
      description: `${how}: 150 words, ${expected} strokes in ${Math.round((finished - started) / 1000)} s over ${pages.length} pages; ${before.length} strokes were already on the board, ${geometry.length} after; saves: ${saves.map((s) => `${Math.round((s.at - started) / 1000)}s "${s.text}"`).join(' | ')}`,
    });
    expect(geometry, `every ${how} stroke landed (none dropped, none extra from the palm or the pan)`).toHaveLength(
      before.length + expected
    );
    expect(
      before.filter((d) => !geometry.includes(d)),
      'nothing written before this session is lost'
    ).toEqual([]);
    await reload(user);
    expect(await user.content.pathGeometry(), `the ${how} handwriting is back exactly after a reload`).toEqual(
      geometry
    );
  };

  test(
    'WB-10-15: a teacher handwrites 150 words with a finger; every stroke is kept and saved',
    { tag: ['@long', '@regression'] },
    async ({ user }) => {
      await handwritingSession(user, 'finger');
    }
  );

  test(
    'WB-10-16: a teacher handwrites 150 words with a stylus; every stroke is kept and saved',
    { tag: ['@long', '@regression'] },
    async ({ user }) => {
      await handwritingSession(user, 'stylus');
    }
  );

  test(
    'WB-10-17: a teacher handwrites 150 words with a stylus, the palm resting on the screen; only the pen strokes are kept and saved',
    { tag: ['@long', '@regression', '@negative'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP; single stroke: WB-10-06): with the palm resting on the screen, every pen stroke also draws a line from the palm (no palm rejection)
      test.fail(true, 'With the palm resting on the screen, every pen stroke also draws a line from the palm');
      await handwritingSession(user, 'stylus with palm');
    }
  );
});
