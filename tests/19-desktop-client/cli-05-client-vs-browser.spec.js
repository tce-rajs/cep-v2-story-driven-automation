// CLI-05 — Client and browser behave the same
// Source: CEPV2_Stories/19_DesktopClient.md
// Desktop client only (each case is about what the client does differently from a browser). Resources a test makes
// are removed again; a recorded Learning Short is discarded, never saved or sent. "Watch on YouTube" is followed by
// watching the client's own hand-over to the system browser (Electron's shell.openExternal, recorded and not
// actually opened). CLI-05-05 measures the same steps in a separate browser on the same server.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { BASE_URL } = require('../../config/env');
const { App } = require('../../pages/app');
const { pinForModule } = require('../../config/moduleClassMap');

const timed = async (fn) => {
  const t0 = Date.now();
  await fn();
  return Date.now() - t0;
};

/** Sign in, switch topic and open a board, timing each step. */
async function stepTimes(app) {
  const t = {};
  t.signIn = await timed(() => app.signIn());
  await app.nav.applyClassMap('default');
  t.topicSwitch = await timed(async () => {
    await app.nav.goToChapterTopic(3, 1);
    await expect(app.nav.currentChapterTopicBtn).toHaveText(/^\s*4\.2\s/, { timeout: 30000 });
  });
  t.openBoard = await timed(async () => {
    await app.nav.goToChapterTopic(3, 0);
    await app.toolbar.waitForBoardToSettle();
  });
  return t;
}

test.describe('CLI-05 Client and browser behave the same', () => {
  test.skip(!!process.env.RUN_IN_BROWSER, 'compares the desktop client with a browser');
  test.describe.configure({ timeout: 300000 });

  test.describe('in a topic', () => {
    test.use({ classMap: 'default' });

    test(
      'CLI-05-01: a file picker (Create, Gallery) opens and returns the chosen file in the client',
      { tag: ['@functional'] },
      async ({ user, page }) => {
        const ar = user.addResource;
        await ar.openAction('create');
        await ar.createForm.waitFor({ state: 'visible', timeout: 10000 });
        const [chooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 10000 }),
          ar.fileInput.evaluate((el) => el.click()),
        ]);
        await chooser.setFiles({ name: 'picked-in-client.txt', mimeType: 'text/plain', buffer: Buffer.from('picked') });
        await expect(ar.createForm, 'Create: the chosen file is returned to the form').toContainText(
          'picked-in-client',
          {
            timeout: 10000,
          }
        );
        await ar.cancelBtn.click({ force: true }).catch(() => {});
        // The Gallery: its own file picker, where it has one.
        await ar.openAction('gallery');
        const galleryInput = page
          .locator('app-gallery input[type="file"], [class*="gallery"] input[type="file"]')
          .first();
        if (await galleryInput.count()) {
          const [g] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 10000 }),
            galleryInput.evaluate((el) => el.click()),
          ]);
          expect(g, 'Gallery: the file picker opens').toBeTruthy();
          await g.setFiles([]);
        } else {
          test.info().annotations.push({ type: 'note', description: 'The Gallery has no file picker of its own.' });
        }
        await ar.galleryCloseBtn.click({ force: true }).catch(() => {});
      }
    );

    test(
      'CLI-05-05: the client is not much slower than the browser for sign-in, topic switch and opening a board',
      { tag: ['@performance'] },
      async ({ user }) => {
        await user.userMenu.signOut();
        const client = await stepTimes(user);
        const browser = await chromium.launch();
        let web;
        try {
          const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1920, height: 1080 } });
          web = await stepTimes(new App(await context.newPage()));
        } finally {
          await browser.close();
        }
        test.info().annotations.push({
          type: 'note',
          description: `Client ${JSON.stringify(client)} ms; browser ${JSON.stringify(web)} ms.`,
        });
        // "Not much slower": at most 50% slower plus 3 s for each step.
        const slower = Object.keys(client).filter((k) => client[k] > web[k] * 1.5 + 3000);
        expect(slower, 'no step much slower in the client').toEqual([]);
      }
    );
  });

  test.describe('an unsupported file', () => {
    test.use({ classMap: 'tceUnsupported' });

    test(
      'CLI-05-02: Download on an unsupported file saves it and tells the teacher where',
      { tag: ['@functional'] },
      async ({ user, page, workerApp }) => {
        // Record every download the client starts (Electron's will-download), with where it is saved.
        await workerApp.app.evaluate(({ session, webContents }) => {
          global.__downloads = [];
          const sessions = new Set([session.defaultSession, ...webContents.getAllWebContents().map((w) => w.session)]);
          for (const s of sessions)
            s.on('will-download', (e, item) => {
              const entry = { name: item.getFilename(), path: '' };
              global.__downloads.push(entry);
              item.once('done', (ev, state) => {
                entry.path = item.getSavePath();
                entry.state = state;
              });
            });
        });
        await user.playlist.ensureDrawerVisible();
        const title = `AutoTest-download-${Date.now()}`;
        await user.addResource.createTextAsset(title);
        const card = user.playlist.resourceCards.filter({ hasText: title });
        try {
          await expect(card, 'set-up: an own unsupported-file resource').toBeVisible({ timeout: 15000 });
          await user.player.openResourceCard(card);
          await expect(page.getByText(/unsupported file/i).first(), 'set-up: "Unsupported file"').toBeVisible({
            timeout: 15000,
          });
          await page
            .getByRole('button', { name: /download/i })
            .or(page.getByText(/^\s*download\s*$/i))
            .first()
            .click();
          await expect
            .poll(
              () => workerApp.app.evaluate(() => global.__downloads.filter((d) => d.state === 'completed').length),
              {
                message: 'the file is saved',
                timeout: 30000,
              }
            )
            .toBeGreaterThan(0);
          const saved = await workerApp.app.evaluate(() => global.__downloads);
          test.info().annotations.push({ type: 'note', description: `Downloads: ${JSON.stringify(saved)}` });
          await expect(
            page
              .getByText(/download(ed)?|saved|folder|location/i)
              .filter({ visible: true })
              .first(),
            'the teacher is told where it was saved'
          ).toBeVisible({ timeout: 10000 });
        } finally {
          await user.player.closePlayer().catch(() => {});
          await user.playlist.ensureDrawerVisible();
          await user.playlist.removeOwnedAsset(card).catch(() => {});
        }
      }
    );
  });

  test.describe('a web link', () => {
    test.use({ classMap: 'playersWeblink' });

    test(
      'CLI-05-03: "Watch on YouTube" and other external links open in the default browser from the client',
      { tag: ['@functional'] },
      async ({ user, page, workerApp }) => {
        await user.playlist.ensureDrawerVisible();
        // The client's hand-over to the system browser, recorded instead of opening a browser on the test machine.
        await workerApp.app.evaluate(({ shell }) => {
          global.__external = [];
          global.__openExternal = global.__openExternal || shell.openExternal;
          shell.openExternal = async (url) => {
            global.__external.push(url);
          };
        });
        const windowsBefore = workerApp.app.windows().length;
        try {
          if (!(await user.player.weblinkCards.count()))
            throw new Error('DATA MISSING ON THIS SERVER: no web link in the playersWeblink topic');
          await user.player.openResourceCard(user.player.weblinkCards);
          await expect(user.player.weblinkWrapper, 'set-up: the web link is open').toBeVisible({ timeout: 20000 });
          const teachUrl = page.url();
          await user.player.weblinkWatchOnYoutubeBtn.click({ timeout: 20000 });
          await expect
            .poll(() => workerApp.app.evaluate(() => global.__external), {
              message: 'the link is handed to the default browser',
              timeout: 15000,
            })
            .toEqual([expect.stringMatching(/youtube\.com|youtu\.be/)]);
          expect(page.url(), 'the client itself stays on the lesson').toBe(teachUrl);
          expect(workerApp.app.windows().length, 'no extra window inside the client').toBe(windowsBefore);
        } finally {
          await workerApp.app
            .evaluate(({ shell }) => {
              if (global.__openExternal) shell.openExternal = global.__openExternal;
            })
            .catch(() => {});
          await user.player.closePlayer().catch(() => {});
        }
      }
    );
  });

  test(
    'CLI-05-04: Learning Shorts can record the screen in the client even though the server is plain http',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.signIn(pinForModule('default'));
      await app.nav.applyClassMap('default');
      const ls = app.learningShorts;
      try {
        await ls.openRecorder(app.magnet);
        await ls.record(4);
        await expect(ls.titleInput, 'a recording was made: the composer opens with it').toBeVisible();
      } finally {
        await ls.closeAll();
      }
    }
  );
});
