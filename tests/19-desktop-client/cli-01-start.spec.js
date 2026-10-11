// CLI-01 — Install and start the client
// Source: CEPV2_Stories/19_DesktopClient.md
// Desktop client only. Every test here starts a client: the worker's own (closed and started again: a fresh start is
// signed out by design) or one of the test's own (cli-lib.js withOwnClient), with the settings file put back exactly
// as it was afterwards. Installing (CLI-01-01) is manual.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { BASE_URL } = require('../../config/env');
const { App } = require('../../pages/app');
const { restartClient } = require('../18-resilience/resilience-lib');
const { shell, webviewDo, setClientOffline, clientText, withOwnClient, waitForBoard } = require('./cli-lib');

const connectionMessage = /unable to connect|no web urls|no (internet|network|connection)|offline|server/i;

test.describe('CLI-01 Install and start the client', () => {
  test.skip(!!process.env.RUN_IN_BROWSER, 'the desktop client has no browser equivalent');
  test.describe.configure({ timeout: 300000 });

  test(
    'CLI-01-02: the first start opens the whiteboard in Guest Mode on the server set in tce_settings.json',
    { tag: ['@smoke', '@functional'] },
    async ({ workerApp }) => {
      // The fixture refuses to start unless the settings' one profile is BASE_URL (assertClientProfile).
      const server = BASE_URL;
      const app = await restartClient(workerApp);
      expect(app.page.url().toLowerCase(), 'on the server set in the settings').toContain(
        server.replace(/\/+$/, '').toLowerCase()
      );
      await expect(app.toolbar.wbSvg, 'the whiteboard').toBeVisible({ timeout: 20000 });
      await expect(app.login.guestModeText, 'in Guest Mode').toBeVisible({ timeout: 15000 });
    }
  );

  test(
    'CLI-01-03: a wrong server address in the settings shows a clear message that says what to fix, not a blank window',
    { tag: ['@negative'] },
    async ({ workerApp }) => {
      await withOwnClient(
        workerApp,
        { mutate: (s) => (s.profiles[0].path = 'http://127.0.0.1:9/teach/') },
        async ({ app }) => {
          await expect
            .poll(() => clientText(app), { message: 'a message, not a blank window', timeout: 60000 })
            .toMatch(/unable to connect|no web urls|cannot reach|could not connect/i);
          const text = await clientText(app);
          test.info().annotations.push({ type: 'note', description: `Shown: ${text.slice(0, 300)}` });
          expect(text, 'it says what to fix (the server address / settings)').toMatch(/server|settings|url|address/i);
        }
      );
    }
  );

  test(
    'CLI-01-04: starting the client with no network shows a clear message and recovers once the network is back, without a restart',
    { tag: ['@negative'] },
    async ({ workerApp }) => {
      await withOwnClient(workerApp, {}, async ({ app }) => {
        // No network from the start of the teach page: offline, then the page loads again as at start-up.
        await setClientOffline(app, true);
        await webviewDo(app, 'reload');
        await app.windows()[0].waitForTimeout(15000);
        const offlineText = await clientText(app);
        test.info().annotations.push({ type: 'note', description: `With no network: ${offlineText.slice(0, 300)}` });
        expect(offlineText, 'a clear message').toMatch(connectionMessage);
        await setClientOffline(app, false);
        const ui = await waitForBoard(app, 90000);
        expect(ui, 'the board comes up by itself once the network is back (no restart)').not.toBeNull();
        await expect(ui.login.guestModeText, 'ready in Guest Mode').toBeVisible({ timeout: 15000 });
      });
    }
  );

  test(
    'CLI-01-05: the time from starting the client to a usable board is recorded (compared with the browser)',
    { tag: ['@performance'] },
    async ({ workerApp }) => {
      const LIMIT = Number(process.env.CLIENT_START_SECONDS || 60);
      let clientSeconds;
      await withOwnClient(workerApp, {}, async ({ app }) => {
        // launchShell already waited ~3 s for the shell; count from the start of the launch.
        const t0 = Date.now() - 3000;
        const ui = await waitForBoard(app, LIMIT * 1000);
        if (ui) await ui.login.guestModeText.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
        clientSeconds = ui ? (Date.now() - t0) / 1000 : null;
      });
      const browser = await chromium.launch();
      let browserSeconds;
      try {
        const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
        const t0 = Date.now();
        await page.goto(BASE_URL);
        const ui = new App(page);
        await ui.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 60000 });
        await ui.login.guestModeText.waitFor({ state: 'visible', timeout: 20000 });
        browserSeconds = (Date.now() - t0) / 1000;
      } finally {
        await browser.close();
      }
      test.info().annotations.push({
        type: 'note',
        description: `Start to a usable board: client ${clientSeconds} s, browser ${browserSeconds} s.`,
      });
      expect(clientSeconds, `the client gets to a usable board within ${LIMIT} s`).not.toBeNull();
      expect(clientSeconds).toBeLessThanOrEqual(LIMIT);
    }
  );

  test(
    'CLI-01-06: starting the client twice does not open two copies that fight over one session',
    { tag: ['@edge'] },
    async ({ workerApp }) => {
      // The worker's client is running; the teacher double-clicks the shortcut again.
      let second = null;
      try {
        second = await shell.launchShell().catch(() => null);
        await new Promise((resolve) => setTimeout(resolve, 15000));
        const alive = second && second.app.process().exitCode === null && second.app.windows().length > 0;
        const secondTeach = alive ? shell.teachWindowOf(second.app) : undefined;
        test.info().annotations.push({
          type: 'note',
          description: `Second start: ${second ? (alive ? `still running, teach window ${secondTeach ? 'open' : 'not open'}` : 'closed itself') : 'did not start'}`,
        });
        expect(!!secondTeach, 'no second copy of ClassEdge is open').toBe(false);
      } finally {
        if (second) await second.app.close().catch(() => {});
      }
      expect(workerApp.teachWindow.isClosed(), 'the first copy is still open').toBe(false);
      await expect(new App(workerApp.teachWindow).toolbar.wbSvg, 'and still working').toBeVisible({ timeout: 15000 });
    }
  );

  test(
    "CLI-01-07: the client opens its single profile's link itself, with its client settings attached",
    { tag: ['@functional'] },
    async ({ workerApp }) => {
      const app = await restartClient(workerApp);
      const url = new URL(app.page.url());
      for (const [key, pattern] of [
        ['tceclient', /^1$/],
        ['webdrop', /./],
        ['erasersize', /^\d+$/],
        ['gesturemode', /./],
      ])
        expect.soft(url.searchParams.get(key) || '', `the client setting ${key} is attached`).toMatch(pattern);
    }
  );

  test(
    'CLI-01-08: a settings file with two profiles shows the profile chooser, and the teacher can pick one',
    { tag: ['@negative'] },
    async ({ workerApp }) => {
      let first;
      await withOwnClient(
        workerApp,
        {
          mutate: (s) => {
            first = s.profiles[0].title;
            s.profiles = [s.profiles[0], { ...s.profiles[0], title: 'AutoQA-Second' }];
          },
        },
        async ({ app, shell: shellWindow }) => {
          expect(await shell.isOnProfileChooser(shellWindow), 'the profile chooser is shown').toBe(true);
          await shellWindow.getByText(first, { exact: true }).first().click({ force: true });
          const ui = await waitForBoard(app, 60000);
          expect(ui, 'picking a profile opens ClassEdge').not.toBeNull();
          expect(ui.page.url().toLowerCase(), 'on that profile’s server').toContain(new URL(BASE_URL).host);
        }
      );
    }
  );
});
