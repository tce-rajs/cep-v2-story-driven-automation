// TB-10 — Text box
// Source: CEPV2_Stories/05_Toolbar.md
// The text formatting panel (toolbar-text-menu-*) appears while a text box is selected.

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

  // Split: where the box is created (TB-10-01) and that the text stays (TB-10-07); the formatting panel
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
      // The box (300x100) is centred on the click point.
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

  // Font size (TB-10-13), Italic (TB-10-14), Underline (TB-10-15) and Centre alignment (TB-10-16): one test each.
  const styleOf = (box, prop) =>
    box.locator('.text-input-container').evaluate((el, p) => getComputedStyle(el)[p], prop);

  test('TB-10-13: raising the font size makes the text bigger', { tag: ['@functional'] }, async ({ user }) => {
    const box = await addText(user, 'Bigger text');
    await selectText(user, box);
    const size = async () => parseFloat(await styleOf(box, 'fontSize'));
    const before = await size();
    // The Material slider only takes real pointer input: click near its top end.
    await user.toolbar.setSlider(user.toolbar.textMenuFontSlider, 0.9);
    await expect.poll(size, { message: 'the font size grew' }).toBeGreaterThan(before);
  });

  test('TB-10-14: Italic makes the selected text italic', { tag: ['@functional'] }, async ({ user }) => {
    const box = await addText(user, 'Slanted text');
    await selectText(user, box);
    await user.toolbar.textMenuItalicBtn.click({ force: true });
    await expect.poll(() => styleOf(box, 'fontStyle'), { message: 'the text is italic' }).toBe('italic');
  });

  test('TB-10-15: Underline underlines the selected text', { tag: ['@functional'] }, async ({ user }) => {
    const box = await addText(user, 'Underlined text');
    await selectText(user, box);
    await user.toolbar.textMenuUnderlineBtn.click({ force: true });
    await expect
      .poll(() => styleOf(box, 'textDecorationLine'), { message: 'the text is underlined' })
      .toContain('underline');
  });

  test('TB-10-16: Centre alignment centres the text in its box', { tag: ['@functional'] }, async ({ user }) => {
    const box = await addText(user, 'Centred text');
    await selectText(user, box);
    await user.toolbar.textMenuAlignCenterBtn.click({ force: true });
    await expect.poll(() => styleOf(box, 'textAlign'), { message: 'the text is centred' }).toBe('center');
  });

  test(
    'TB-10-06: text that has already been typed can be opened and edited again (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
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

  test(
    'TB-10-12: a typed text box is still there, with its text, after the app reloads',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const text = `Lesson note ${Date.now() % 100000}`;
      await addText(user, text);
      await page.waitForTimeout(12000); // past the autosave countdown
      await page.reload();
      await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
      await user.toolbar.waitForBoardToSettle();
      await expect(
        user.toolbar.wbContainer.locator('foreignObject.text-element').filter({ hasText: text }),
        'the text box is back with its text'
      ).toHaveCount(1, { timeout: 15000 });
    }
  );

  test(
    'TB-10-17: a text box cannot be created outside the board area (on the toolbar or header)',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const all = page.locator('[data-qa-id="wb-drawing-container"] foreignObject.text-element');
      const before = await all.count();
      for (const [name, target] of [
        ['header date and time', user.header.calendar],
        ['header logo', user.header.logoContainer],
        ['toolbar', user.toolbar.container],
      ]) {
        await user.toolbar.tool('gtInserttext').click({ force: true });
        await page.waitForTimeout(500);
        const b = await target.boundingBox();
        // The middle of a header item; the toolbar's own bottom edge, below its buttons.
        const y = name === 'toolbar' ? b.y + b.height - 4 : b.y + b.height / 2;
        await page.mouse.click(b.x + b.width / 2, y);
        await page.waitForTimeout(800);
        await expect(all, `no text box created by a click on the ${name}`).toHaveCount(before);
        await expect(user.whiteboard.textEditor, `no text editor open after a click on the ${name}`).toHaveCount(0);
      }
      await user.toolbar.selectTool('gtSelect');
    }
  );
});
