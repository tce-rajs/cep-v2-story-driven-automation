// FLOW-05 — Teaching on the whiteboard
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: the default class (Class 9A Science 4.1). Writing happens on fresh space below the teacher's content; the
// board is never cleared. Each test checks only what it wrote itself (strokes are compared by their outline, which is
// in board coordinates and the same after a pan, zoom or reload). A board saved to the Playlist is removed again.

const { test, expect } = require('../../fixtures');
const {
  boardStrokes,
  boardTexts,
  onBoard,
  waitForAutosave,
  writeStroke,
  writeSample,
  reloadSignedIn,
  signOutAndIn,
  openSecondDevice,
} = require('./flow-helpers');

const sorted = (a) => [...a].sort();
const expectSampleOn = async (app, sample, where) => {
  const strokes = await boardStrokes(app);
  for (const d of sample.strokes) expect(strokes, `${where}: every stroke and shape is there`).toContain(d);
  expect(await onBoard(app, sample.text), `${where}: the text box is there`).toBe(true);
};

test.describe('FLOW-05 Teaching on the whiteboard', () => {
  test.use({ classMap: 'scratchBoard', freshSpace: true });
  test.describe.configure({ timeout: 240000 });

  test(
    'FLOW-05-01: the board saved earlier for the topic is shown, unchanged',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const strokes = sorted(await boardStrokes(user));
      const texts = sorted(await boardTexts(user));
      expect(strokes.length + texts.length, 'set-up: the topic has a saved board').toBeGreaterThan(0);
      await reloadSignedIn(user);
      expect(sorted(await boardStrokes(user)), 'the same strokes').toEqual(strokes);
      expect(sorted(await boardTexts(user)), 'the same text').toEqual(texts);
    }
  );

  test(
    'FLOW-05-02: pen writing in a chosen colour and size shows on the board',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      await tb.openToolPanel('gtPen');
      const option = tb.penColorOptions.nth(3);
      const swatch = await option.evaluate((el) => getComputedStyle(el).backgroundColor);
      await option.click({ force: true });
      await tb.panel.getByText('Thin', { exact: true }).click({ force: true });
      await tb.closePanelByTappingOutside();
      await tb.drawStroke({ x: 400, y: 380 }, { x: 650, y: 430 }, 10);
      const thin = await tb.strokeOf(tb.paths.last());

      await tb.openToolPanel('gtPen');
      await tb.panel.getByText('Strong', { exact: true }).click({ force: true });
      await tb.closePanelByTappingOutside();
      await tb.drawStroke({ x: 400, y: 480 }, { x: 650, y: 530 }, 10);
      const strong = await tb.strokeOf(tb.paths.last());

      expect(strong.color, 'the chosen colour').toBe(swatch);
      expect(strong.width, 'the chosen size (Strong is thicker than Thin)').toBeGreaterThan(thin.width);
    }
  );

  test(
    'FLOW-05-03: a shape and a symbol can be drawn, selected and moved',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      await tb.chooseShape('gtDrawRect');
      await tb.drawStroke({ x: 450, y: 380 }, { x: 650, y: 500 }, 10);
      const before = await tb.boardCentres();
      await tb.selectTool('gtSelect');
      const box = await tb.lastPathBox();
      await page.mouse.click(box.x + box.width / 2, box.y + 2);
      await expect(tb.pathMenuDeleteBtn, 'the shape is selected').toBeVisible({ timeout: 5000 });
      await page.mouse.move(box.x + box.width / 2, box.y + 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 160, box.y + 82, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(800);
      const after = await tb.boardCentres();
      expect(after.at(-1), 'the shape moved').not.toEqual(before.at(-1));

      const objects = await tb.wbSvg.locator('*').count();
      await tb.openToolPanel('gtShapes');
      await page.locator('[data-qa-id="toolbar-shape-gtMoreShapes"]').click({ force: true });
      await page.locator('[data-qa-id^="toolbar-advance-shape-"]').first().click({ force: true });
      const canvas = await tb.wbSvg.boundingBox();
      await page.mouse.click(canvas.x + 900, canvas.y + 450);
      await page.waitForTimeout(1000);
      expect(await tb.wbSvg.locator('*').count(), 'the symbol is on the board').toBeGreaterThan(objects);
    }
  );

  for (const [lang, text] of [
    ['English', 'Plants make food by photosynthesis'],
    ['Hindi', 'पौधे प्रकाश संश्लेषण से भोजन बनाते हैं'],
    ['Marathi', 'वनस्पती प्रकाशसंश्लेषणाने अन्न तयार करतात'],
  ]) {
    test(`FLOW-05-04: a text box keeps its typed text (${lang})`, { tag: ['@functional'] }, async ({ user, page }) => {
      await user.whiteboard.insertTextAndType(420, 400, text);
      await page.keyboard.press('Escape');
      await user.toolbar.selectTool('gtSelect');
      expect(await onBoard(user, text), 'the text as typed').toBe(true);
      await waitForAutosave(user);
      await reloadSignedIn(user);
      expect(await onBoard(user, text), 'kept after a reload').toBe(true);
    });
  }

  test('FLOW-05-05: the eraser removes only what it passes over', { tag: ['@functional'] }, async ({ user }) => {
    const tb = user.toolbar;
    const xs = await tb.drawLetters(3, { x: 420, y: 400, gap: 140 });
    const drawn = await tb.pathData();
    await tb.eraseDrag({ x: xs[1] - 30, y: 430 }, { x: xs[1] + 30, y: 430 });
    await expect.poll(async () => (await tb.pathData()).filter((d) => drawn.includes(d)).length).toBe(2);
    const left = await tb.pathData();
    expect(left, 'the first stroke is untouched').toContain(drawn[0]);
    expect(left, 'the third stroke is untouched').toContain(drawn[2]);
    expect(left, 'the middle stroke was cut').not.toContain(drawn[1]);
  });

  test(
    'FLOW-05-06: Undo and Redo step back and forward through the changes',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const tb = user.toolbar;
      const steps = [];
      for (let i = 0; i < 3; i++) {
        await tb.penStroke({ x: 380 + i * 120, y: 400 }, { x: 440 + i * 120, y: 470 });
        steps.push(await tb.pathData());
      }
      await tb.tool('gtUndo').click({ force: true });
      await expect.poll(() => tb.pathData(), { message: 'one step back' }).toEqual(steps[1]);
      await tb.tool('gtUndo').click({ force: true });
      await expect.poll(() => tb.pathData(), { message: 'two steps back' }).toEqual(steps[0]);
      await tb.tool('gtRedo').click({ force: true });
      await expect.poll(() => tb.pathData(), { message: 'one step forward' }).toEqual(steps[1]);
      await tb.tool('gtRedo').click({ force: true });
      await expect.poll(() => tb.pathData(), { message: 'back to the latest' }).toEqual(steps[2]);
    }
  );

  test(
    'FLOW-05-07: changing the background keeps the writing on top',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const stroke = await writeStroke(user, { x: 420, y: 420 }, { x: 760, y: 420 });
      try {
        await tb.chooseBackground('gtGraphCms');
        const mine = page.locator(`[data-qa-id="wb-drawing-container"] svg path[d="${stroke}"]`);
        await expect(mine, 'the writing is still there').toHaveCount(1);
        const b = await mine.boundingBox();
        const onTop = await page.evaluate(
          ({ x, y, d }) => {
            for (const el of document.elementsFromPoint(x, y)) {
              if (el.tagName.toLowerCase() === 'path' && el.getAttribute('d') === d) return true;
              if (el.closest('[data-qa-id="wb-drawing-container"]') && el.tagName.toLowerCase() !== 'g') return false;
            }
            return false;
          },
          { x: b.x + b.width / 2, y: b.y + b.height / 2, d: stroke }
        );
        expect(onTop, 'the writing is drawn above the background').toBe(true);
      } finally {
        await tb.chooseBackground('gtBlankPage');
      }
    }
  );

  test(
    'FLOW-05-08: the right-click menu actions (copy, delete, order) work on a board object',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const openMenu = async () => {
        await tb.selectTool('gtSelect');
        const b = await tb.lastPathBox();
        await page.mouse.click(b.x + b.width / 2, b.y + 2, { button: 'right' });
        await expect(tb.pathMenuDeleteBtn, 'the object menu').toBeVisible({ timeout: 5000 });
      };
      await tb.chooseShape('gtDrawRect');
      await tb.drawStroke({ x: 450, y: 380 }, { x: 650, y: 500 }, 10);
      const count = await tb.pathCount();

      await openMenu();
      await tb.pathMenuDuplicateBtn.click({ force: true });
      await expect.poll(() => tb.pathCount(), { message: 'copy adds a second one' }).toBe(count + 1);

      const order = async () => tb.paths.evaluateAll((els) => els.map((e) => e.getAttribute('d')));
      await openMenu();
      const last = (await order()).at(-1);
      await tb.pathMenuToBackBtn.click({ force: true });
      await expect.poll(async () => (await order()).at(-1), { message: 'To Back changes the order' }).not.toBe(last);
      await openMenu();
      await tb.pathMenuToFrontBtn.click({ force: true });
      await page.waitForTimeout(800);

      await openMenu();
      await tb.pathMenuDeleteBtn.click({ force: true });
      await expect.poll(() => tb.pathCount(), { message: 'delete removes one' }).toBe(count);
    }
  );

  test(
    'FLOW-05-09: zoom and pan move the view without changing the content',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const tb = user.toolbar;
      const stroke = await writeStroke(user);
      // Measured by its own outline: the Zoom panel adds an icon path to the board's svg, which "the last path" can pick.
      const mine = page.locator(`[data-qa-id="wb-drawing-container"] svg path[d="${stroke}"]`);
      const content = await user.content.pathGeometry();
      const percent = await user.content.zoomPercent();
      try {
        await tb.openToolPanel('gtZoom');
        await tb.zoomInBtn.click({ force: true });
        await tb.zoomInBtn.click({ force: true });
        await tb.closePanelByTappingOutside();
        expect(await user.content.zoomPercent(), 'the view zoomed').toBeGreaterThan(percent);
        const box = await mine.boundingBox();
        await tb.selectTool('gtPan');
        await tb.drawStroke({ x: 900, y: 600 }, { x: 700, y: 450 }, 12);
        const moved = await mine.boundingBox();
        expect(moved.x !== box.x || moved.y !== box.y, 'the view panned').toBe(true);
        expect(await user.content.pathGeometry(), 'the content itself is unchanged').toEqual(content);
      } finally {
        await tb.openToolPanel('gtZoom');
        await tb.zoomResetBtn.click({ force: true });
        await tb.closePanelByTappingOutside();
      }
    }
  );

  test(
    'FLOW-05-10: everything added is still there after a reload',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const sample = await writeSample(user, `FLOW05-reload-${Date.now()}`);
      await waitForAutosave(user);
      await reloadSignedIn(user);
      await expectSampleOn(user, sample, 'after a reload');
    }
  );

  test(
    'FLOW-05-11: everything added is still there after sign out and sign in',
    { tag: ['@functional'] },
    async ({ user }) => {
      const sample = await writeSample(user, `FLOW05-signout-${Date.now()}`);
      await waitForAutosave(user);
      await signOutAndIn(user, process.env.VALID_PIN, 'default');
      await expectSampleOn(user, sample, 'after signing in again');
    }
  );

  test(
    'FLOW-05-12: the same board shows on another device for the same teacher',
    { tag: ['@functional'] },
    async ({ user }) => {
      const sample = await writeSample(user, `FLOW05-device-${Date.now()}`);
      await waitForAutosave(user);
      const second = await openSecondDevice(process.env.VALID_PIN, 'default');
      try {
        await expectSampleOn(second.app, sample, 'on the other device');
      } finally {
        await second.close();
      }
    }
  );

  test(
    'FLOW-05-13: writing done in the last seconds before leaving the board is not lost',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const stroke = await writeStroke(user);
      // Straight to another topic, inside the autosave countdown, as a teacher moving on.
      await user.nav.goToChapterTopic(2, 0);
      await page.waitForTimeout(12000);
      await user.nav.applyClassMap('default');
      await user.toolbar.waitForBoardToSettle();
      expect(await boardStrokes(user), 'the last stroke is on its board').toContain(stroke);
    }
  );

  test('FLOW-05-14: an undone stroke does not come back after a reload', { tag: ['@negative'] }, async ({ user }) => {
    const stroke = await writeStroke(user);
    await waitForAutosave(user);
    await user.toolbar.tool('gtUndo').click({ force: true });
    await expect.poll(async () => boardStrokes(user), { message: 'set-up: undone' }).not.toContain(stroke);
    await waitForAutosave(user);
    await reloadSignedIn(user);
    expect(await boardStrokes(user), 'the undone stroke stays gone').not.toContain(stroke);
  });

  test(
    'FLOW-05-15: Whiteboard History shows earlier versions of the board',
    { tag: ['@functional'] },
    async ({ user }) => {
      await writeStroke(user);
      await waitForAutosave(user);
      await writeStroke(user, { x: 520, y: 520 }, { x: 820, y: 580 });
      await waitForAutosave(user);
      await user.userMenu.openProfileMenu();
      await user.userMenu.wbHistoryBtn.click({ force: true });
      await expect(user.userMenu.wbHistoryPanel, 'Whiteboard History opens').toBeVisible({ timeout: 10000 });
      try {
        const rows = await user.userMenu.wbHistoryRows();
        expect(rows.length, 'earlier versions are listed').toBeGreaterThanOrEqual(2);
        const versions = rows.map((r) => r.version);
        expect(versions, 'newest first').toEqual([...versions].sort((a, b) => b - a));
        expect(rows[0].strokes, 'the earlier version is the board before the latest stroke').toBeGreaterThan(
          rows[1].strokes
        );
      } finally {
        await user.userMenu.wbHistoryPanel
          .getByText('✕', { exact: true })
          .first()
          .click({ force: true })
          .catch(() => {});
      }
    }
  );

  test(
    'FLOW-05-16: the board can be saved to the Playlist, and the saved copy matches the board',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const stroke = await writeStroke(user);
      await waitForAutosave(user);
      await user.addResource.openAction('whiteboard');
      await user.whiteboard.addResourceWhiteboardSaveBtn.click({ force: true });
      await expect(user.whiteboard.saveBoardDialog, 'set-up: the Save dialog').toBeVisible({ timeout: 10000 });
      const title = `AutoTest-board-${Date.now()}`;
      await user.whiteboard.saveBoardTitleInput.fill(title);
      await user.whiteboard.saveBoardConfirmBtn.click({ force: true });
      const card = user.playlist.resourceCards.filter({ hasText: title });
      try {
        await expect(card, 'the board is in the Playlist').toHaveCount(1, { timeout: 20000 });
        await card.first().click({ force: true });
        const panel = page
          .locator('mat-dialog-container, [role=dialog], .cdk-overlay-pane')
          .filter({ hasText: `Whiteboard: ${title}` })
          .first();
        await expect(panel, 'the saved copy opens').toBeVisible({ timeout: 15000 });
        const copy = await panel.locator('svg path').evaluateAll((els) => els.map((e) => e.getAttribute('d')));
        expect(copy, 'the saved copy holds the board’s latest stroke').toContain(stroke);
        await page.keyboard.press('Escape');
      } finally {
        await reloadSignedIn(user);
        await user.playlist.ensureDrawerVisible();
        const left = user.playlist.resourceCards.filter({ hasText: title });
        if (await left.count()) await user.playlist.removeOwnedAsset(left.first()).catch(() => {});
      }
    }
  );

  test('FLOW-05-16: the board can be saved as a PDF', { tag: ['@functional'] }, async ({ user, workerApp }) => {
    test.skip(!workerApp || !workerApp.app, 'needs the desktop client: the download is caught in the client');
    await workerApp.app.evaluate(({ session }) => {
      global.__boardDownloads = [];
      session.defaultSession.removeAllListeners('will-download');
      session.defaultSession.on('will-download', (e, item) => {
        const target = require('path').join(require('os').tmpdir(), `board-${Date.now()}-${item.getFilename()}`);
        item.setSavePath(target);
        item.once('done', (ev, state) =>
          global.__boardDownloads.push({ name: item.getFilename(), state, bytes: item.getReceivedBytes() })
        );
      });
    });
    await writeStroke(user);
    await waitForAutosave(user);
    await user.addResource.openAction('whiteboard');
    await user.whiteboard.addResourceWhiteboardDownloadBtn.click({ force: true });
    await expect
      .poll(() => workerApp.app.evaluate(() => global.__boardDownloads), {
        message: 'a PDF of the board is saved',
        timeout: 30000,
      })
      .toContainEqual(
        expect.objectContaining({
          state: 'completed',
          name: expect.stringMatching(/\.pdf$/i),
          bytes: expect.any(Number),
        })
      );
    const [pdf] = await workerApp.app.evaluate(() => global.__boardDownloads);
    expect(pdf.bytes, 'the PDF is not empty').toBeGreaterThan(1000);
  });
});
