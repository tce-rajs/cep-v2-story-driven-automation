// The scratch boards (class map 'scratchBoard' and 'scratchBoard2'): empty topics reserved for the tests that clear
// a board. A test may clear only while one of them is on screen; it writes a little sample content first and leaves
// the board empty again.

const { expect } = require('../../fixtures');
const { getClassMap } = require('../../config/moduleClassMap');

/** Fail unless the topic on screen is the given scratch board, so a clear can never touch a teacher's board. */
async function expectOnScratchBoard(user, key = 'scratchBoard') {
  const { topicLabel } = getClassMap(key);
  await expect(user.nav.currentChapterTopicBtn, `on the scratch board (topic ${topicLabel})`).toHaveText(
    new RegExp(`^\\s*${topicLabel.replace('.', '\\.')}\\s*\\|`),
    { timeout: 15000 }
  );
}

/** A little sample content: three handwritten letters and a text box. */
async function writeSample(user) {
  await user.toolbar.drawLetters(3, { x: 400, y: 400, gap: 100 });
  await user.whiteboard.insertTextAndType(700, 300, 'Sample text');
  await user.page.keyboard.press('Escape');
  await user.page.waitForTimeout(600);
  expect(await user.toolbar.pathCount(), 'set-up: sample strokes drawn').toBeGreaterThanOrEqual(3);
  await expect(user.whiteboard.textObjects, 'set-up: sample text box').not.toHaveCount(0);
}

/** Leave the scratch board empty. */
async function emptyScratchBoard(user, key = 'scratchBoard') {
  await expectOnScratchBoard(user, key);
  const content = (await user.toolbar.allPaths.count()) + (await user.whiteboard.textObjects.count());
  if (content > 0) await user.toolbar.pressClearWhiteboard(user.whiteboard);
}

module.exports = { expectOnScratchBoard, writeSample, emptyScratchBoard };
