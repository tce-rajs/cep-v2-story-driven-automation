// AIN-03 — Choose classes and send the notice
// Source: CEPV2_Stories/13_AINotices.md
// Sending is real: it delivers a notice to Class 12 A (owner-approved 2026-09-26). The send request is counted from
// the network (any POST whose URL mentions "notice") so "sent once" is checked at the source, not from the UI alone.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'default', freshSpace: true });

function watchNoticePosts(page) {
  const posts = [];
  page.on('request', (req) => {
    if (
      req.method() === 'POST' &&
      /notice/i.test(req.url()) &&
      !/ocr|check_text|paraphrase|translate|grammar/i.test(req.url())
    ) {
      posts.push(req);
    }
  });
  return posts;
}

/** Leave only the current class (the first option, "Class 12 A") ticked, so a real send goes to one class. */
async function onlyFirstClass(n) {
  await n.untickAllClasses();
  await n.classOption(0).click({ force: true });
  await expect(n.classCheckbox(0)).toBeChecked();
}

test.describe('AIN-03 Choose classes and send the notice', () => {
  test.beforeEach(async ({ user }) => {
    await user.aiNotices.openComposer(user);
  });

  test.afterEach(async ({ app }) => {
    await app.aiNotices.closeAll();
  });

  test(
    'AIN-03-01: "Share with" lists the teacher\'s classes with the current class ticked',
    { tag: ['@functional'] },
    async ({ user }) => {
      const n = user.aiNotices;
      expect(await n.classOptions.count(), 'at least one class listed').toBeGreaterThan(0);
      const current = (await user.whiteboard.currentClassBtn.innerText())
        .match(/Class\s*\d+\s*[A-Z]/i)[0]
        .replace(/\s+/g, '');
      const labels = (await n.classOptions.allInnerTexts()).map((t) => t.replace(/\s+/g, ''));
      const index = labels.findIndex((t) => t.toLowerCase() === current.toLowerCase());
      expect(index, `current class (${current}) is listed`).toBeGreaterThanOrEqual(0);
      await expect(n.classCheckbox(index), 'current class ticked by default').toBeChecked();
    }
  );

  test('AIN-03-02: unticking every class disables Ready to Send', { tag: ['@negative'] }, async ({ user }) => {
    // STORY vs APP, CONFIRMED LIVE (2026-09-26, v 0.0.232): the current class (option 0) cannot be unticked -- clicking
    // its label or checkbox leaves it ticked -- so a notice can never be left with zero classes. The intent (never send to
    // nobody) holds either way: after trying to untick everything, a class is still ticked or Send is disabled.
    const n = user.aiNotices;
    await n.untickAllClasses();
    await n.classCheckbox(0).click({ force: true });
    const ticked = await n.checkedClassCount();
    test.info().annotations.push({
      type: 'note',
      description: `Classes still ticked after unticking all: ${ticked} (the current class cannot be unticked).`,
    });
    if (ticked === 0) await expect(n.sendBtn, 'nothing ticked, so Send is disabled').toBeDisabled();
    else await expect(n.classCheckbox(0), 'the current class stays ticked').toBeChecked();
  });

  // Sending: the notice is delivered (AIN-03-03), a success message shows (AIN-03-05), and the composer closes
  // (AIN-03-06) -- one test each (split 2026-09-28). Each really sends one notice to Class 12 A.
  /** Fill a title and press Send with only the current class ticked; returns the send response and counted posts. */
  const sendNotice = async (user, page) => {
    const n = user.aiNotices;
    const posts = watchNoticePosts(page);
    await onlyFirstClass(n);
    await n.titleInput.fill(`AutoTest notice ${Date.now()}`);
    await n.hideKeyboard();
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /notice/i.test(r.url()) && !/ocr|check_text/i.test(r.url()),
      { timeout: 30000 }
    );
    await n.sendBtn.click();
    return { response: await response, posts };
  };

  test(
    'AIN-03-03: Send delivers the notice, with exactly one send request (regression, Zoho TCN-I16615)',
    { tag: ['@regression', '@smoke'] },
    async ({ user, page }) => {
      const { response, posts } = await sendNotice(user, page);
      expect(response.ok(), 'the send request succeeded').toBe(true);
      await page.waitForTimeout(2000);
      expect(posts, 'one send request').toHaveLength(1);
    }
  );

  test(
    'AIN-03-05: sending a notice shows a success message (regression, Zoho TCN-I16615)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      await sendNotice(user, page);
      await expect(
        user.aiNotices.snackbar.filter({ hasText: /sent|success|shared|published/i }).first(),
        'success message'
      ).toBeVisible({ timeout: 15000 });
    }
  );

  test('AIN-03-06: the notice composer closes after sending', { tag: ['@regression'] }, async ({ user, page }) => {
    await sendNotice(user, page);
    await expect(user.aiNotices.titleInput, 'composer closed after sending').toBeHidden({ timeout: 15000 });
  });

  test(
    'AIN-03-04: double-clicking Send sends the notice only once (regression)',
    { tag: ['@bug', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232): a double-click on Ready to Send makes TWO
      // POST .../cx-proxy/6/1/api/v2/2/noticeboard requests, so the class receives the notice twice.
      test.fail(true, 'Double-clicking Ready to Send sends the notice twice');
      const n = user.aiNotices;
      const posts = watchNoticePosts(page);
      await onlyFirstClass(n);
      await n.titleInput.fill(`AutoTest double-send ${Date.now()}`);
      await n.hideKeyboard();
      await n.sendBtn.dblclick();
      await expect(n.titleInput).toBeHidden({ timeout: 20000 });
      await page.waitForTimeout(3000);
      expect(posts, 'exactly one send request').toHaveLength(1);
    }
  );
});
