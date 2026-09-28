// AIN-02 — Write and edit the notice
// Source: CEPV2_Stories/13_AINotices.md

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default', cleanBoard: true });

test.describe('AIN-02 Write and edit the notice', () => {
  test.beforeEach(async ({ user }) => {
    await user.aiNotices.openComposer(user);
  });

  test.afterEach(async ({ app }) => {
    await app.aiNotices.closeAll();
  });

  test(
    'AIN-02-01: Send is blocked while the title is empty and allowed once a title is entered',
    { tag: ['@functional'] },
    async ({ user }) => {
      const n = user.aiNotices;
      await n.titleInput.fill('');
      await expect(n.sendBtn, 'Ready to Send disabled with an empty title').toBeDisabled();
      await n.titleInput.fill('Science club meeting');
      await expect(n.sendBtn, 'Ready to Send enabled with a title').toBeEnabled();
    }
  );

  test(
    'AIN-02-02: Backspace and Delete remove characters from the notice title (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const n = user.aiNotices;
      await n.titleInput.fill('Holiday notice');
      await n.titleInput.click();
      await page.keyboard.press('End');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await expect(n.titleInput, 'Backspace removed two characters').toHaveValue('Holiday noti');
      await page.keyboard.press('Home');
      await page.keyboard.press('Delete');
      await expect(n.titleInput, 'Delete removed the first character').toHaveValue('oliday noti');
    }
  );

  test(
    'AIN-02-03: Bold formatting in the body shows as bold text',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const n = user.aiNotices;
      await n.bodyEditor.click();
      await page.keyboard.press('Control+A');
      await n.boldBtn.click({ force: true });
      await expect(n.bodyEditor.locator('strong, b').first(), 'selected text wrapped in bold').toBeVisible();
      const weight = await n.bodyEditor
        .locator('strong, b')
        .first()
        .evaluate((el) => Number(getComputedStyle(el).fontWeight));
      expect(weight, 'rendered bold').toBeGreaterThanOrEqual(600);
    }
  );

  test('AIN-02-04: a very long title does not break the composer layout', { tag: ['@edge'] }, async ({ user }) => {
    const n = user.aiNotices;
    const before = await n.titleInput.boundingBox();
    await n.titleInput.fill('Annual science exhibition and parent meeting '.repeat(8));
    const after = await n.titleInput.boundingBox();
    expect(after.width, 'title field keeps its width').toBeCloseTo(before.width, 0);
    await expect(n.sendBtn).toBeInViewport();
    await expect(n.closeBtn).toBeInViewport();
  });

  test(
    'AIN-02-05: pasting a large block of formatted text into the body is accepted',
    { tag: ['@edge'] },
    async ({ user }) => {
      const n = user.aiNotices;
      const html =
        '<p><b>Important</b> <i>notice</i></p><ul>' +
        '<li>Bring your lab record and calculator.</li>'.repeat(60) +
        '</ul>';
      await n.bodyEditor.click();
      await n.bodyEditor.evaluate((el, markup) => {
        const dt = new DataTransfer();
        dt.setData('text/html', markup);
        dt.setData('text/plain', markup.replace(/<[^>]+>/g, ' '));
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      }, html);
      await expect(n.bodyEditor).toContainText('Bring your lab record');
      expect((await n.bodyEditor.innerText()).length, 'the large paste is kept').toBeGreaterThan(1500);
      await expect(n.sendBtn).toBeInViewport();
    }
  );

  test(
    'AIN-02-06: Recapture replaces the title and body with a fresh capture',
    { tag: ['@functional'] },
    async ({ user }) => {
      const n = user.aiNotices;
      await n.titleInput.fill('My own edited title');
      await n.recaptureBtn.click({ force: true });
      await expect(n.captureBanner, 'back in capture mode').toBeVisible({ timeout: 10000 });
      const box = await user.toolbar.wbSvg.boundingBox();
      await n.dragSelect(box, { x: 250, y: 270 }, { x: 650, y: 345 });
      await n.approveBtn.click({ force: true });
      await n.titleInput.waitFor({ state: 'visible', timeout: 30000 });
      await expect(n.titleInput, 'title comes from the new capture, not the earlier edit').not.toHaveValue(
        'My own edited title',
        {
          timeout: 15000,
        }
      );
      await expect(n.bodyEditor).toContainText(/photosynthesis/i);
    }
  );
});
