// TB-10 — Text box
// Source: CEPV2_Stories/05_Toolbar.md
// The text formatting panel (toolbar-text-menu-*) appears while a text box is selected; confirmed live 2026-09-26.

const { test, expect } = require('../../fixtures');

test.use({ freshSpace: true });

test.describe('TB-10 Text box', () => {
  /** Type a text box and commit it; returns its locator. */
  async function addText(user, text, x = 400, y = 400) {
    const box = await user.whiteboard.insertTextAndType(x, y, text);
    await user.page.keyboard.press('Escape');
    await user.page.waitForTimeout(600);
    return box;
  }

  /** Select a committed text box with the Select tool. */
  async function selectText(user, textBox) {
    await user.toolbar.selectTool('gtSelect');
    await textBox.click({ force: true });
    await expect(user.toolbar.textMenuDeleteBtn, 'text panel open').toBeVisible({ timeout: 5000 });
  }

  // Split 2026-09-28: where the box is created (TB-10-01) and that the text stays (TB-10-07); the formatting panel
  // (TB-10-02) and a colour applied from it (TB-10-08); To Back (TB-10-03), To Front (TB-10-09), Duplicate (TB-10-10) and
  // Delete (TB-10-11).
  test(
    'TB-10-01: the Text tool creates a text box centred where the whiteboard is clicked',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const wb = user.whiteboard;
      const before = await wb.textObjects.count();
      const box = await addText(user, 'Newton first law', 500, 350);
      await expect(wb.textObjects, 'set-up: a text box created').toHaveCount(before + 1);
      const canvas = await user.toolbar.wbSvg.boundingBox();
      const b = await box.boundingBox();
      // CONFIRMED LIVE: the box (300x100) is centred on the click point.
      expect(Math.abs(b.x + b.width / 2 - (canvas.x + 500)), 'centred where clicked (x)').toBeLessThan(20);
      expect(Math.abs(b.y + b.height / 2 - (canvas.y + 350)), 'centred where clicked (y)').toBeLessThan(20);
    }
  );

  test(
    'TB-10-07: text typed in a text box stays on the board after clicking away',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const box = await addText(user, 'Newton first law', 500, 350);
      // Click away on empty board with the Select tool (with the Text tool still on, a click would add another box).
      await user.toolbar.selectTool('gtSelect');
      const canvas = await user.toolbar.wbSvg.boundingBox();
      await user.page.mouse.click(canvas.x + canvas.width - 300, canvas.y + canvas.height - 250);
      await user.page.waitForTimeout(600);
      await expect(box).toContainText('Newton first law');
    }
  );

  test(
    'TB-10-02: selecting a text box opens its formatting panel with a colour palette',
    { tag: ['@functional'] },
    async ({ user }) => {
      const box = await addText(user, 'Colour me');
      await selectText(user, box);
      await expect(user.toolbar.textMenuBoldBtn).toBeVisible();
      await expect
        .poll(() => user.toolbar.textMenuColorSwatches.filter({ visible: true }).count(), {
          message: 'a palette of colours',
        })
        .toBeGreaterThan(10);
    }
  );

  test('TB-10-08: choosing a colour from the palette colours the text', { tag: ['@functional'] }, async ({ user }) => {
    const box = await addText(user, 'Colour me');
    await selectText(user, box);
    await user.toolbar.textMenuColorSwatches.filter({ visible: true }).nth(4).click({ force: true });
    const color = await box.locator('.text-input-container').evaluate((el) => getComputedStyle(el).color);
    expect(color, 'colour applied to the text').not.toBe('rgb(0, 0, 0)');
  });

  /** A pen stroke with a text box on top of it; returns whether the text is currently stacked above the stroke. */
  const textOverStroke = async (user) => {
    const tb = user.toolbar;
    await tb.penStroke({ x: 380, y: 390 }, { x: 560, y: 410 }); // something to stack against
    const box = await addText(user, 'Stack me', 400, 380);
    const strokeD = await tb.paths.last().getAttribute('d');
    // Stacking order = document order. Compare the text box with the pen stroke itself (selection outlines are paths too).
    const textAboveStroke = () =>
      user.whiteboard.wbSvg.evaluate((svg, d) => {
        const els = [...svg.querySelectorAll('path, foreignObject')];
        return els.findIndex((e) => e.tagName === 'foreignObject') > els.findIndex((e) => e.getAttribute('d') === d);
      }, strokeD);
    return { box, textAboveStroke };
  };

  test(
    'TB-10-03: To Back puts a text box below the content it overlaps',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { box, textAboveStroke } = await textOverStroke(user);
      await selectText(user, box);
      await user.toolbar.textMenuToBackBtn.click({ force: true });
      await expect.poll(textAboveStroke, { message: 'To Back puts the text below the stroke' }).toBe(false);
    }
  );

  test(
    'TB-10-09: To Front puts a text box above the content it overlaps',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { box, textAboveStroke } = await textOverStroke(user);
      await selectText(user, box);
      await user.toolbar.textMenuToBackBtn.click({ force: true });
      await expect.poll(textAboveStroke, { message: 'set-up: the text is below the stroke' }).toBe(false);
      await selectText(user, user.whiteboard.textObjects.last());
      await user.toolbar.textMenuToFrontBtn.click({ force: true });
      await expect.poll(textAboveStroke, { message: 'To Front puts the text above the stroke' }).toBe(true);
    }
  );

  test('TB-10-10: Duplicate copies a text box', { tag: ['@functional'] }, async ({ user, page }) => {
    const wb = user.whiteboard;
    const box = await addText(user, 'Copy me');
    const count = await wb.textObjects.count();
    await selectText(user, box);
    await user.toolbar.textMenuDuplicateBtn.click({ force: true });
    await expect(wb.textObjects).toHaveCount(count + 1);
    await page.keyboard.press('Escape');
  });

  test('TB-10-11: Delete removes a text box', { tag: ['@functional'] }, async ({ user, page }) => {
    const wb = user.whiteboard;
    const box = await addText(user, 'Delete me');
    const count = await wb.textObjects.count();
    await selectText(user, box);
    await user.toolbar.textMenuDeleteBtn.click({ force: true });
    await expect(wb.textObjects).toHaveCount(count - 1);
    await page.keyboard.press('Escape');
  });

  test(
    'TB-10-04: a text box left empty leaves nothing behind after clicking away',
    { tag: ['@negative', '@bug'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): an empty text box is kept on the board as an invisible
      // object after clicking away (text object count goes up by one).
      test.fail(true, 'An empty text box is kept on the board after clicking away');
      const wb = user.whiteboard;
      const before = await wb.textObjects.count();
      await wb.insertTextAt(600, 450);
      await page.keyboard.press('Escape');
      await user.toolbar.closePanelByTappingOutside();
      await page.waitForTimeout(800);
      await expect(wb.textObjects, 'no empty text box kept').toHaveCount(before);
    }
  );

  test(
    'TB-10-05: Bold makes the selected text visibly bold (regression)',
    { tag: ['@regression'] },
    async ({ user }) => {
      const box = await addText(user, 'Make me bold');
      await selectText(user, box);
      const weight = () =>
        box.locator('.text-input-container').evaluate((el) => Number(getComputedStyle(el).fontWeight) || 400);
      const before = await weight();
      await user.toolbar.textMenuBoldBtn.click({ force: true });
      await expect.poll(weight, { message: 'computed font weight is bold' }).toBeGreaterThanOrEqual(600);
      expect(before).toBeLessThan(600);
    }
  );

  test(
    'TB-10-06: text that has already been typed can be opened and edited again (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      // NOT APPLICABLE (owner 2026-10-06): committed text not reopening for editing is the expected flow, not a bug.
      // The story marks this case not applicable, so the outOfScope fixture skips it; the steps stay for reference.
      const box = await addText(user, 'First draft');
      await user.toolbar.selectTool('gtSelect');
      await box.dblclick({ force: true });
      const editor = box.locator('.text-input-container[contenteditable="true"]');
      await expect(editor, 'editable again').toBeVisible({ timeout: 5000 });
      await page.keyboard.press('End');
      await page.keyboard.type(' edited');
      await page.keyboard.press('Escape');
      await expect(box).toContainText('First draft edited');
    }
  );
});
