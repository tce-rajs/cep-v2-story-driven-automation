// TB-05 — Eraser: Clear Whiteboard (Delete Whiteboard) and Clear All Annotations
// Source: CEPV2_Stories/05_Toolbar.md
// These run only on the scratch board (class map 'scratchBoard', an empty topic): each test writes a little sample
// content, clears it, and leaves the board empty. The Eraser panel's "Clear Whiteboard" is the app's Delete Whiteboard.

const { test, expect } = require('../../fixtures');
const { getClassMap } = require('../../config/moduleClassMap');
const { expectOnScratchBoard, writeSample, emptyScratchBoard } = require('./scratch-board');

test.describe('TB-05 Clear Whiteboard on the scratch board', () => {
  test.use({ classMap: 'scratchBoard' });
  test.describe.configure({ timeout: 180000 });

  test.beforeEach(async ({ user }) => {
    await emptyScratchBoard(user);
  });

  test.afterEach(async ({ user }) => {
    await user.page.keyboard.press('Escape').catch(() => {});
    await emptyScratchBoard(user).catch(() => {});
  });

  const reloadOnScratch = async (user, key = 'scratchBoard') => {
    await user.page.reload();
    await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
    await user.nav.applyClassMap(key);
    await user.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 30000 });
    await user.page.waitForTimeout(3000);
    await user.toolbar.waitForBoardToSettle();
  };

  test('TB-05-10: confirming "Clear" removes all whiteboard content', { tag: ['@functional'] }, async ({ user }) => {
    await expectOnScratchBoard(user);
    await writeSample(user);
    await user.toolbar.pressClearWhiteboard(user.whiteboard);
    await expect.poll(() => user.toolbar.allPaths.count(), 'no strokes').toBe(0);
    await expect(user.whiteboard.textObjects, 'no text boxes').toHaveCount(0);
  });

  test('TB-05-09: cleared content stays cleared after the app reloads', { tag: ['@regression'] }, async ({ user }) => {
    await expectOnScratchBoard(user);
    await writeSample(user);
    await user.content.waitForSaved();
    await user.toolbar.pressClearWhiteboard(user.whiteboard);
    await expect(user.toolbar.allPaths).toHaveCount(0);
    await user.page.waitForTimeout(12000); // let the clear autosave
    await reloadOnScratch(user);
    await expect(user.toolbar.allPaths, 'no strokes come back').toHaveCount(0);
    await expect(user.whiteboard.textObjects, 'no text boxes come back').toHaveCount(0);
  });

  test(
    'TB-05-12: "Clear All Annotations" removes only the pen/shape annotations and leaves text boxes, images and widgets',
    { tag: ['@functional'] },
    async ({ user }) => {
      await expectOnScratchBoard(user);
      await writeSample(user);
      const texts = await user.whiteboard.textObjects.count();
      await user.toolbar.openToolPanel('gtErase');
      await user.toolbar.eraserClearAnnotationsBtn.click({ force: true });
      await user.page
        .getByRole('button', { name: /clear|confirm|yes/i })
        .last()
        .click({ timeout: 5000 })
        .catch(() => {});
      await user.toolbar.closePanelByTappingOutside();
      await expect.poll(() => user.toolbar.allPaths.count(), 'pen strokes removed').toBe(0);
      await expect(user.whiteboard.textObjects, 'the text box stays').toHaveCount(texts);
    }
  );

  test(
    'TB-05-13: Delete Whiteboard asks for confirmation before deleting',
    { tag: ['@functional'] },
    async ({ user }) => {
      await expectOnScratchBoard(user);
      await writeSample(user);
      const before = await user.toolbar.pathCount();
      await user.toolbar.openToolPanel('gtErase');
      await user.whiteboard.clearWhiteboardBtn.click({ force: true });
      await expect(user.whiteboard.clearConfirmDialogConfirmBtn, 'a confirmation is asked').toBeVisible({
        timeout: 5000,
      });
      expect(await user.toolbar.pathCount(), 'nothing removed before confirming').toBe(before);
      await user.whiteboard.clearConfirmDialogCancelBtn.click({ force: true });
    }
  );

  test('TB-05-14: cancelling Delete Whiteboard keeps the board as it was', { tag: ['@negative'] }, async ({ user }) => {
    await expectOnScratchBoard(user);
    await writeSample(user);
    const strokes = await user.toolbar.pathCount();
    const texts = await user.whiteboard.textObjects.count();
    await user.toolbar.openToolPanel('gtErase');
    await user.whiteboard.clearWhiteboardBtn.click({ force: true });
    await user.whiteboard.clearConfirmDialogCancelBtn.click({ force: true, timeout: 5000 });
    await user.toolbar.closePanelByTappingOutside();
    expect(await user.toolbar.pathCount(), 'strokes kept').toBe(strokes);
    await expect(user.whiteboard.textObjects, 'text kept').toHaveCount(texts);
  });

  test(
    "TB-05-15: confirming Delete Whiteboard removes the board's content, and it stays removed after a reload",
    { tag: ['@functional'] },
    async ({ user }) => {
      await expectOnScratchBoard(user);
      await writeSample(user);
      await user.content.waitForSaved();
      await user.toolbar.pressClearWhiteboard(user.whiteboard);
      await expect(user.toolbar.allPaths).toHaveCount(0);
      await user.page.waitForTimeout(12000);
      await reloadOnScratch(user);
      await expect(user.toolbar.allPaths, 'still empty after reload').toHaveCount(0);
    }
  );

  test(
    "TB-05-16: Delete Whiteboard on one topic leaves other topics' boards untouched",
    { tag: ['@regression'] },
    async ({ user }) => {
      // Sample content on the second scratch board, then clear the first.
      const other = getClassMap('scratchBoard2');
      await user.nav.applyClassMap('scratchBoard2');
      await expectOnScratchBoard(user, 'scratchBoard2');
      await emptyScratchBoard(user, 'scratchBoard2');
      await writeSample(user);
      const otherStrokes = await user.toolbar.pathCount();
      await user.content.waitForSaved();
      await user.nav.applyClassMap('scratchBoard');
      await expectOnScratchBoard(user);
      await writeSample(user);
      await user.toolbar.pressClearWhiteboard(user.whiteboard);
      await user.page.waitForTimeout(12000);
      await user.nav.applyClassMap('scratchBoard2');
      await expectOnScratchBoard(user, 'scratchBoard2');
      await user.toolbar.waitForBoardToSettle();
      expect(await user.toolbar.pathCount(), `topic ${other.topicLabel} keeps its strokes`).toBe(otherStrokes);
      await emptyScratchBoard(user, 'scratchBoard2'); // clean-up: both scratch boards empty
      await user.nav.applyClassMap('scratchBoard');
    }
  );
});
