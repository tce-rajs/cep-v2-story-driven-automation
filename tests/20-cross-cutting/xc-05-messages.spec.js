// XC-05 — Messages teachers see
// Source: CEPV2_Stories/20_CrossCutting.md
// Runs in the desktop client, in 10A Science 1.1 ('aiHomework': the class of the Homework and Attendance tests).
// Server errors and network failures are made with page.route on the app's own calls (fetch / xhr) only while the
// module is used; nothing reaches the server while they are on, so no notice, homework or attendance is ever sent.
// Writing (the notice capture's text box, the autosave check) goes on fresh space; nothing is erased.

const { test, expect } = require('../../fixtures');
const { uniqueCopy } = require('../00-flows/flow-helpers');

const PLAIN =
  /went wrong|try again|unable|could ?n.?t|failed|not available|error|no (internet|network|connection)|offline/i;
const RAW = /internal server error|status code|\b(500|503)\b|undefined|\[object|exception|stack|null\b/i;
const SUCCESS = /success|saved!|submitted|sent|added|created|uploaded/i;

const isCall = (route) => ['fetch', 'xhr'].includes(route.request().resourceType());
const serverError = (route) =>
  isCall(route)
    ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Internal Server Error"}' })
    : route.continue();
const networkDown = (route) => (isCall(route) ? route.abort('internetdisconnected') : route.continue());

/** What the teacher sees within `ms`: a plain message, raw error text, a spinner still turning. */
async function feedback(page, ms = 20000) {
  await page.waitForTimeout(ms);
  return page.evaluate(
    ({ plain, raw }) => {
      const visible = (e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
      };
      const text = document.body.innerText;
      const spinner = [
        ...document.querySelectorAll(
          '.spinner, .loader-container, .ngx-spinner-overlay, mat-spinner, mat-progress-spinner, [class*="loading" i]'
        ),
      ].some(visible);
      return {
        plain: new RegExp(plain, 'i').test(text),
        raw: (text.match(new RegExp(raw, 'i')) || [null])[0],
        spinner,
      };
    },
    { plain: PLAIN.source, raw: RAW.source }
  );
}

test.describe('XC-05 Messages teachers see', () => {
  test.use({ classMap: 'aiHomework', freshSpace: true });
  test.describe.configure({ timeout: 480000 });

  test.afterEach(async ({ app }) => {
    await app.page.unroute('**/*').catch(() => {});
    await app.aiNotices.closeAll().catch(() => {});
    await app.aiHomework.closeAll().catch(() => {});
    await app.attendance.closeAll().catch(() => {});
    await app.page.keyboard.press('Escape').catch(() => {});
  });

  test(
    'XC-05-02: a server error (500) in each module shows a plain message, not a blank panel or endless spinner',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const ar = user.addResource;
      // Each module: the step before the server is needed (normal network), then the step that needs it (500).
      const modules = {
        Notice: {
          before: () => user.aiNotices.captureText(user, 'Science fair tomorrow'),
          act: () => user.aiNotices.approveBtn.click({ force: true }),
          after: () => user.aiNotices.closeAll(),
        },
        Homework: {
          before: async () => {
            await user.aiHomework.open(user.magnet);
            await user.aiHomework.setHomeworkCount(5);
          },
          act: () => user.aiHomework.generateBtn.click(),
          after: () => user.aiHomework.closeAll(),
        },
        Attendance: { act: () => user.magnet.choose('attendance'), after: () => user.attendance.closeAll() },
        Library: {
          before: async () => {
            await ar.openAction('library');
            await ar.librarySearchInput.fill('science');
          },
          act: () => ar.librarySearchBtn.click({ force: true }),
          after: () => ar.libraryCloseBtn.click({ force: true }),
        },
        'AI Assist': { act: () => ar.openAction('aiAssist'), after: () => ar.aiAssistCloseBtn.click({ force: true }) },
        Create: {
          before: async () => {
            await ar.openAction('create');
            await ar.titleInput.fill(`AutoTest-500-${Date.now()}`);
            await ar.fileInput.setInputFiles({ name: 'err.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
          },
          act: () => ar.submitBtn.click(),
          after: () => ar.cancelBtn.click({ force: true }),
        },
      };
      const seen = {};
      for (const [name, m] of Object.entries(modules)) {
        try {
          if (m.before) await m.before();
          await page.route('**/*', serverError);
          await m.act();
          seen[name] = await feedback(page);
        } catch (e) {
          seen[name] = { error: String(e.message).split('\n')[0] };
        } finally {
          await page.unroute('**/*', serverError).catch(() => {});
          await m.after().catch(() => {});
          await page.keyboard.press('Escape').catch(() => {});
        }
      }
      test.info().annotations.push({ type: 'note', description: JSON.stringify(seen) });
      for (const [name, s] of Object.entries(seen))
        expect.soft(s, `${name}: a plain message, no raw error text, no endless spinner`).toEqual({
          plain: true,
          raw: null,
          spinner: false,
        });
    }
  );

  test('XC-05-03: AI Assist that fails to load shows a message', { tag: ['@negative'] }, async ({ user, page }) => {
    await page.route('**/*', networkDown);
    try {
      await user.addResource.openAction('aiAssist');
      await expect(
        user.addResource.aiAssistErrorScreen.or(page.getByText(PLAIN).filter({ visible: true })).first(),
        'a message that AI Assist could not load'
      ).toBeVisible({ timeout: 30000 });
    } finally {
      await page.unroute('**/*', networkDown);
      await user.addResource.aiAssistCloseBtn.click({ force: true }).catch(() => {});
    }
  });

  test(
    'XC-05-04: no success message appears for an action that failed, in every module that shows one',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const ar = user.addResource;
      const shown = {};
      // Each action fails (network down from the moment it is pressed); collect every message that appears.
      // `close` runs while the network is still down, so nothing can be sent once it is back.
      const watch = async (name, act, close = async () => {}, ms = 20000) => {
        await user.content.startSaveLog().catch(() => {});
        const seen = new Set();
        const toast = page.locator(
          'mat-snack-bar-container, .mat-mdc-snack-bar-container, .toast-container, [role="alert"]'
        );
        await page.route('**/*', networkDown);
        try {
          await act();
          const end = Date.now() + ms;
          while (Date.now() < end) {
            for (const t of await toast.allInnerTexts().catch(() => [])) if (t.trim()) seen.add(t.trim());
            await page.waitForTimeout(500);
          }
          for (const m of await user.content.savedMessages().catch(() => [])) seen.add(m.text);
        } finally {
          await close().catch(() => {});
          await page.unroute('**/*', networkDown);
        }
        shown[name] = [...seen].filter((t) => SUCCESS.test(t) && !/not|fail|unable|error/i.test(t));
      };
      await watch(
        'Whiteboard autosave',
        () => user.toolbar.penStroke({ x: 520, y: 420 }, { x: 760, y: 480 }),
        undefined,
        25000
      );
      await ar.openAction('create');
      await ar.titleInput.fill(`AutoTest-nosuccess-${Date.now()}`);
      await ar.fileInput.setInputFiles(uniqueCopy('positive/notes-plain.txt'));
      await watch(
        'Create',
        () => ar.submitBtn.click(),
        () => ar.cancelBtn.click({ force: true })
      );
      await page.keyboard.press('Escape');
      const att = user.attendance;
      await att.open(user.magnet);
      await att.startMarking();
      await att.markAllPresent();
      await att.done();
      await watch(
        'Attendance',
        () => att.submitBtn.filter({ visible: true }).first().click({ force: true }),
        () => att.closeAll()
      );
      await user.aiNotices.openComposer(user, 'Science fair tomorrow');
      await user.aiNotices.hideKeyboard();
      await watch(
        'Notice',
        () => user.aiNotices.sendBtn.click({ force: true }),
        () => user.aiNotices.closeAll()
      );
      test.info().annotations.push({ type: 'note', description: JSON.stringify(shown) });
      for (const [name, list] of Object.entries(shown))
        expect.soft(list, `${name}: no success message for the failed action`).toEqual([]);
    }
  );

  test(
    'XC-05-05: a feature not available on this server (Learning Shorts screen capture on plain http) says so',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const ls = user.learningShorts;
      try {
        await ls.openRecorder(user.magnet);
        await ls.recordStartBtn.click({ force: true });
        await page.waitForTimeout(5000);
        if (await ls.recordStopBtn.isVisible().catch(() => false)) await ls.recordStopBtn.click({ force: true });
        const recorded = await ls.titleInput
          .waitFor({ state: 'visible', timeout: 15000 })
          .then(() => true)
          .catch(() => false);
        const told = await page
          .getByText(/https|secure|not (available|supported)|cannot record|can.?t record|permission/i)
          .filter({ visible: true })
          .first()
          .isVisible()
          .catch(() => false);
        test.info().annotations.push({ type: 'note', description: `Recorded: ${recorded}; message shown: ${told}` });
        expect(recorded || told, 'it records, or says it cannot on this server (not a silent failure)').toBe(true);
      } finally {
        await ls.closeAll();
      }
    }
  );
});
