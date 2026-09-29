// WB-10 — Touch and stylus on the classroom panel
// Source: CEPV2_Stories/06_Whiteboard.md
//
// Classroom panels are touch screens used with fingers and a pen. Every other whiteboard test uses the mouse; these
// send real touch and pen input through Chrome DevTools Protocol (pages/touch-input.js), the same way a panel's
// digitiser does, so the app receives genuine pointerType "touch"/"pen" events.
// Data: 'toolbarGeneral' (Class 12A Physics, 1.1), cleared before each test and at the end.

const fs = require('fs');
const path = require('path');
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
  // Fresh space below the teacher's writing; nothing is erased before or after (owner rule 2026-09-29).
  test.use({ classMap: 'toolbarGeneral', freshSpace: true });

  let touch;

  test.beforeEach(async ({ user }) => {
    touch = new TouchInput(user.page);
  });

  test.afterEach(async () => {
    await touch.dispose();
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

  /** Handwrite 30 words fast with the stylus; returns how many strokes were written. */
  const stylusWrite30 = async (user) => {
    const c = await canvas(user);
    const area = await user.content.writingArea();
    const pages = layoutHandwriting(lessonText(30), area, { seed: 41 });
    const strokes = pages.flatMap((p) => p.words.flatMap((w) => w.strokes));
    await user.toolbar.selectTool('gtPen');
    for (const s of strokes) await touch.penStroke(densify(s).map((p) => ({ x: c.x + p.x, y: c.y + p.y })));
    await user.page.waitForTimeout(1500);
    return strokes.length;
  };

  test(
    'WB-10-03: fast stylus handwriting (30 words) keeps every stroke',
    { tag: ['@regression'] },
    async ({ user }) => {
      test.setTimeout(8 * 60 * 1000);
      const written = await stylusWrite30(user);
      expect(await user.toolbar.pathCount(), 'no pen stroke was dropped').toBe(written);
    }
  );

  test(
    'WB-10-18: fast stylus handwriting (30 words) comes back exactly after a reload',
    { tag: ['@regression'] },
    async ({ user }) => {
      test.setTimeout(8 * 60 * 1000);
      await stylusWrite30(user);
      const geometry = await user.content.pathGeometry();
      await user.page.waitForTimeout(15000); // autosave
      await reload(user);
      expect(await user.content.pathGeometry(), 'pen handwriting is saved exactly').toEqual(geometry);
    }
  );

  /** Draw one stroke with the mouse, select the Pen, then run `gesture`; returns the board's state around it. The
   * teacher's stroke is measured by its index, not as "the last path": if the gesture draws, the new path is last. */
  const aroundGesture = async (user, gesture) => {
    const c = await canvas(user);
    await user.toolbar.penStroke({ x: 500, y: 400 }, { x: 700, y: 440 });
    const before = await user.toolbar.pathCount();
    const mine = () => user.toolbar.paths.nth(before - 1).boundingBox();
    const boxBefore = await mine();
    const zoomBefore = await user.content.zoomPercent();
    await user.toolbar.selectTool('gtPen');
    await gesture(c);
    await user.page.waitForTimeout(1000);
    return { before, boxBefore, boxAfter: await mine(), zoomBefore, zoomAfter: await user.content.zoomPercent() };
  };
  const twoFingerDrag = (c) => touch.twoFingerPan(c.x + 600, c.y + 500, -250, -150);
  const pinchOut = (c) => touch.pinch(c.x + 600, c.y + 420, 2);

  test(
    'WB-10-04: a two-finger drag pans the board, even with the Pen selected',
    { tag: ['@functional'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): A two-finger drag does not pan the board -- it draws a stroke instead, even with the Pen selected
      test.fail(true, 'A two-finger drag does not pan the board -- it draws a stroke instead');
      const { boxBefore, boxAfter } = await aroundGesture(user, twoFingerDrag);
      expect(Math.abs(boxAfter.x - boxBefore.x) + Math.abs(boxAfter.y - boxBefore.y), 'the view moved').toBeGreaterThan(
        50
      );
    }
  );

  test(
    'WB-10-19: a two-finger drag draws nothing, even with the Pen selected',
    { tag: ['@functional'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): A two-finger drag draws a stroke on the board
      test.fail(true, 'A two-finger drag draws a stroke on the board');
      const { before } = await aroundGesture(user, twoFingerDrag);
      expect(await user.toolbar.pathCount(), 'no stroke drawn by the two fingers').toBe(before);
    }
  );

  test('WB-10-05: pinching out zooms in', { tag: ['@functional'] }, async ({ user }) => {
    // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): Pinching does not zoom -- one finger draws a stroke on the board instead
    test.fail(true, 'Pinching does not zoom');
    const { boxBefore, boxAfter, zoomBefore, zoomAfter } = await aroundGesture(user, pinchOut);
    test.info().annotations.push({
      type: 'note',
      description: `zoom ${zoomBefore}% -> ${zoomAfter}%, width ${boxBefore.width} -> ${boxAfter.width}`,
    });
    expect(boxAfter.width, 'content got bigger (zoomed in)').toBeGreaterThan(boxBefore.width * 1.2);
  });

  test('WB-10-20: pinching draws nothing', { tag: ['@functional'] }, async ({ user }) => {
    // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): during a pinch, one finger draws a stroke on the board
    test.fail(true, 'During a pinch, one finger draws a stroke on the board');
    const { before } = await aroundGesture(user, pinchOut);
    expect(await user.toolbar.pathCount(), 'no stroke drawn by the pinch').toBe(before);
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

  test('WB-10-09: a finger drag with Select moves a stroke', { tag: ['@functional'] }, async ({ user }) => {
    // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): A finger drag with Select does not move the selected stroke (it stays where it was)
    test.fail(true, 'A finger drag with Select does not move the selected stroke (it stays where it was)');
    await user.toolbar.penStroke({ x: 500, y: 400 }, { x: 700, y: 400 });
    const box = await user.toolbar.lastPathBox();
    const index = (await user.toolbar.pathCount()) - 1;
    await user.toolbar.selectTool('gtSelect');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await touch.tap(cx, cy);
    await user.page.waitForTimeout(500);
    await touch.fingerStroke(line(cx, cy, cx + 150, cy + 120, 25), 12);
    await user.page.waitForTimeout(1000);
    // The selection handles are drawn as paths too, so the stroke is found by its index, not as "the last path" (and
    // "draws nothing new" cannot be told apart from the handles, so it is not part of this case).
    const moved = await user.toolbar.paths.nth(index).boundingBox();
    expect(moved.x - box.x, 'the stroke moved with the finger').toBeGreaterThan(80);
  });

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

  /** The centre of the first Playlist card, scrolled into view. */
  const firstCard = async (user) => {
    await user.playlist.ensureDrawerVisible();
    const card = user.playlist.resourceCards.first();
    await card.scrollIntoViewIfNeeded();
    return center(card);
  };

  test(
    'WB-10-11: one finger tap on a Playlist card opens it, every time',
    { tag: ['@regression'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP): A single finger tap on a Playlist card does not always open it
      // The bug is intermittent (2026-09-28: one tap in one run opened the card), so a single tap cannot tell; tap it
      // several times, closing the player in between, and every tap must open it.
      test.fail(true, 'A single finger tap on a Playlist card does not always open it');
      const TAPS = 6;
      const results = [];
      for (let i = 0; i < TAPS; i++) {
        const p = await firstCard(user);
        await touch.tap(p.x, p.y);
        const opened = await user.player.closeIcon
          .first()
          .waitFor({ state: 'visible', timeout: 10000 })
          .then(() => true)
          .catch(() => false);
        results.push(opened);
        if (opened) await user.player.closePlayer().catch(() => {});
      }
      test.info().annotations.push({ type: 'note', description: `Taps that opened the card: ${results.join(', ')}` });
      expect(results.filter(Boolean), `every one of ${TAPS} taps opened the card`).toHaveLength(TAPS);
    }
  );

  test(
    'WB-10-21: a finger tap that opens a Playlist card opens exactly one player (no ghost second tap)',
    { tag: ['@regression'] },
    async ({ user }) => {
      const p = await firstCard(user);
      // Whether the first tap opens the card is WB-10-11 (it does not always): tap again, up to three times, until it opens.
      for (let i = 0; i < 3 && !(await user.player.closeIcon.first().isVisible()); i++) {
        await touch.tap(p.x, p.y);
        await user.player.closeIcon
          .first()
          .waitFor({ state: 'visible', timeout: 8000 })
          .catch(() => {});
      }
      await expect(user.player.closeIcon.first(), 'set-up: the card opened').toBeVisible();
      try {
        await user.page.waitForTimeout(3000);
        await expect(user.player.closeIcon, 'exactly one player').toHaveCount(1);
      } finally {
        await user.player.closePlayer();
      }
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

  /** Swipe the Playlist strip right-to-left with a finger; returns the first card's x before and after. */
  const swipeStrip = async (user) => {
    await user.playlist.ensureDrawerVisible();
    const strip = await user.playlist.resourceCards.first().boundingBox();
    await touch.fingerStroke(
      line(strip.x + 600, strip.y + strip.height / 2, strip.x + 100, strip.y + strip.height / 2, 20),
      16
    );
    await user.page.waitForTimeout(1500);
    return { firstX: strip.x, afterX: (await user.playlist.resourceCards.first().boundingBox()).x };
  };

  test('WB-10-13: swiping the Playlist strip with a finger scrolls it', { tag: ['@functional'] }, async ({ user }) => {
    const { firstX, afterX } = await swipeStrip(user);
    expect(firstX - afterX, 'the strip scrolled').toBeGreaterThan(50);
  });

  test(
    'WB-10-22: swiping the Playlist strip with a finger does not open a card',
    { tag: ['@functional'] },
    async ({ user }) => {
      await swipeStrip(user);
      await expect(user.player.closeIcon, 'the swipe did not open a card').toHaveCount(0);
    }
  );

  /** Long-press the board with the Pen selected; returns the stroke count before and after. */
  const longPressBoard = async (user) => {
    const c = await canvas(user);
    await user.toolbar.selectTool('gtPen');
    const before = await user.toolbar.pathCount();
    await touch.longPress(c.x + 600, c.y + 450, 1200);
    await user.page.waitForTimeout(1000);
    return { before, after: await user.toolbar.pathCount() };
  };

  test(
    'WB-10-14: a long press on the board with the Pen leaves at most a dot',
    { tag: ['@edge'] },
    async ({ user }) => {
      const { before, after } = await longPressBoard(user);
      test.info().annotations.push({ type: 'note', description: `strokes ${before} -> ${after}` });
      expect(after - before, 'at most a single dot').toBeLessThanOrEqual(1);
    }
  );

  test(
    'WB-10-23: a long press on the board with the Pen opens no menu or anything unexpected',
    { tag: ['@edge'] },
    async ({ user }) => {
      await longPressBoard(user);
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
  //
  // Each 150-word session is written once, by its first test, which checks only that every stroke landed. The tests
  // after it each check one more result on the same session: nothing written earlier is lost, a save message follows
  // the last word, and a reload brings the board back exactly. The writing test saves what they need to a file in this
  // run's output folder (emptied by Playwright at the start of every run); run without it, they skip with that reason.
  // The palm-resting session (WB-10-17) is only checked for extra strokes: with no palm rejection (bug WB-10-06) every
  // pen stroke also draws a palm line, and its other results are the plain stylus session's.

  const sessionFile = (how) =>
    path.join(test.info().project.outputDir, `wb-10-session-${how.replace(/\W+/g, '-')}.json`);
  const needSession = (how, writer) => {
    let session = null;
    try {
      session = JSON.parse(fs.readFileSync(sessionFile(how), 'utf8'));
    } catch {
      // no session this run
    }
    test.skip(!session, `needs the ${how} session that ${writer} writes earlier in the same run (run the whole file)`);
    return session;
  };

  /** Pan below what earlier sessions wrote, handwrite 150 words `how`, and save the session's record. */
  const handwritingSession = async (user, how) => {
    fs.rmSync(sessionFile(how), { force: true });
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
    // Wait (up to a minute) for the save message, so the reload test starts from a saved board.
    const deadline = Date.now() + 60000;
    let finalSave = false;
    while (!finalSave && Date.now() < deadline) {
      finalSave = (await user.content.savedMessages()).some((m) => m.at > finished && /saved/i.test(m.text));
      if (!finalSave) await user.page.waitForTimeout(1000);
    }
    const session = { before, geometry, expected, finalSave };
    fs.mkdirSync(path.dirname(sessionFile(how)), { recursive: true });
    fs.writeFileSync(sessionFile(how), JSON.stringify(session));
    test.info().annotations.push({
      type: 'note',
      description: `${how}: 150 words, ${expected} strokes in ${Math.round((finished - started) / 1000)} s over ${pages.length} pages; ${before.length} strokes were already on the board, ${geometry.length} after; save message after the last word: ${finalSave}`,
    });
    return session;
  };

  const landsTest = (id, how, title) =>
    test(`${id}: ${title}`, { tag: ['@long', '@regression'] }, async ({ user }) => {
      test.setTimeout(30 * 60 * 1000);
      const s = await handwritingSession(user, how);
      expect(s.geometry, `every ${how} stroke landed (none dropped, none extra)`).toHaveLength(
        s.before.length + s.expected
      );
    });

  const keptTest = (id, how, writer) =>
    test(
      `${id}: the ${how} session does not lose anything written on the board before it`,
      { tag: ['@long', '@regression'] },
      async () => {
        const s = needSession(how, writer);
        expect(
          s.before.filter((d) => !s.geometry.includes(d)),
          'nothing written before this session is lost'
        ).toEqual([]);
      }
    );

  const savedTest = (id, how, writer) =>
    test(
      `${id}: a "Whiteboard Saved!" message follows the last word of the ${how} session`,
      { tag: ['@long', '@regression'] },
      async () => {
        const s = needSession(how, writer);
        expect(s.finalSave, 'a save message within a minute of the last word').toBe(true);
      }
    );

  const reloadTest = (id, how, writer) =>
    test(
      `${id}: after the ${how} session, a reload brings the board back exactly`,
      { tag: ['@long', '@regression'] },
      async ({ user }) => {
        test.setTimeout(5 * 60 * 1000);
        const s = needSession(how, writer);
        await reload(user);
        expect(await user.content.pathGeometry(), `the ${how} handwriting is back exactly after a reload`).toEqual(
          s.geometry
        );
      }
    );

  landsTest('WB-10-15', 'finger', 'a teacher handwrites 150 words with a finger, and every stroke lands');
  keptTest('WB-10-24', 'finger', 'WB-10-15');
  savedTest('WB-10-25', 'finger', 'WB-10-15');
  reloadTest('WB-10-26', 'finger', 'WB-10-15');

  landsTest('WB-10-16', 'stylus', 'a teacher handwrites 150 words with a stylus, and every stroke lands');
  keptTest('WB-10-27', 'stylus', 'WB-10-16');
  savedTest('WB-10-28', 'stylus', 'WB-10-16');
  reloadTest('WB-10-29', 'stylus', 'WB-10-16');

  test(
    'WB-10-17: a teacher handwrites 150 words with a stylus, the palm resting on the screen, and only the pen strokes land',
    { tag: ['@long', '@regression', '@negative'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232, real touch input via CDP; single stroke: WB-10-06): with the palm resting on the screen, every pen stroke also draws a line from the palm (no palm rejection)
      test.fail(true, 'With the palm resting on the screen, every pen stroke also draws a line from the palm');
      test.setTimeout(30 * 60 * 1000);
      const s = await handwritingSession(user, 'stylus with palm');
      expect(s.geometry, 'only the pen strokes landed, no marks from the palm').toHaveLength(
        s.before.length + s.expected
      );
    }
  );
});
