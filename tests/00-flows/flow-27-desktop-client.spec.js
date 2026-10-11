// FLOW-27 — The desktop client from install to update
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Runs on the worker's desktop client (no `page` / `user` fixture): several tests close the client and start it again,
// replacing the worker's client (a fresh start is signed out by design). The client's settings file
// (C:\Users\Public\tce_settings.json) is only read. Installing the client and installing a new build are manual
// (CLI-01-01, CLI-04); FLOW-27-04 checks what an update must leave behind: the build the server serves is the one
// shown, and the teacher's board is unchanged after the client restarts. Writing: one stroke on fresh space of the
// default board (never erased).

const fs = require('fs');
const { test, expect } = require('../../fixtures');
const { BASE_URL } = require('../../config/env');
const {
  whereAmI,
  boardStrokes,
  waitForAutosave,
  writeStroke,
  openSecondDevice,
  relaunchClient,
  clientApp,
} = require('./flow-helpers');

const SETTINGS = process.env.TCE_SETTINGS_PATH || 'C:\\Users\\Public\\tce_settings.json';
const sorted = (a) => [...a].sort();

/** The Teach build the server serves (e.g. 0.0.236), read from its main script, as scripts/server-version.js does. */
async function serverBuild() {
  const base = BASE_URL.replace(/\/?$/, '/');
  const html = await (await fetch(base)).text();
  const main = (html.match(/src="(main[^"]+\.js)"/) || [])[1];
  if (!main) throw new Error(`ENVIRONMENT: the server's main script was not found at ${base}`);
  const js = await (await fetch(base + main)).text();
  return [...js.matchAll(/["'](0\.0\.\d+)["']/g)]
    .map((m) => m[1])
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
}

test.describe('FLOW-27 The desktop client from install to update', () => {
  test.skip(!!process.env.RUN_IN_BROWSER, 'the desktop client has no browser equivalent');
  test.describe.configure({ timeout: 300000 });

  test(
    "FLOW-27-01: the client starts and opens ClassEdge for the school's server",
    { tag: ['@smoke', '@functional'] },
    async ({ workerApp }) => {
      const app = await relaunchClient(workerApp);
      const url = workerApp.teachWindow.url();
      expect(url.toLowerCase(), 'the school’s server').toContain(BASE_URL.replace(/\/?$/, '').toLowerCase());
      expect(url, 'opened as the ClassEdge client').toMatch(/[?&]tceclient=1\b/);
      await expect(app.toolbar.wbSvg, 'ClassEdge is up: the board').toBeVisible({ timeout: 20000 });
      await expect(app.login.guestModeText, 'ready in Guest Mode').toBeVisible({ timeout: 15000 });
    }
  );

  test(
    "FLOW-27-02: the client's settings are kept after it is closed and started again",
    { tag: ['@functional'] },
    async ({ workerApp }) => {
      const settingsBefore = fs.readFileSync(SETTINGS, 'utf8');
      const urlBefore = new URL(workerApp.teachWindow.url());
      await relaunchClient(workerApp);
      expect(fs.readFileSync(SETTINGS, 'utf8'), 'the settings file is unchanged').toBe(settingsBefore);
      const urlAfter = new URL(workerApp.teachWindow.url());
      expect(urlAfter.origin + urlAfter.pathname, 'the same server').toBe(urlBefore.origin + urlBefore.pathname);
      const params = (u) => sorted([...u.searchParams.entries()].map(([k, v]) => `${k}=${v}`));
      expect(params(urlAfter), 'the same client settings (eraser size, gestures, DropIt ...)').toEqual(
        params(urlBefore)
      );
    }
  );

  test(
    'FLOW-27-03: the client fills the panel or projector screen correctly',
    { tag: ['@functional'] },
    async ({ workerApp }) => {
      const win = await workerApp.app.evaluate(({ BrowserWindow, screen }) => {
        const w = BrowserWindow.getAllWindows().find((x) => x.isVisible()) || BrowserWindow.getAllWindows()[0];
        const bounds = w.getBounds();
        return { bounds, area: screen.getDisplayMatching(bounds).bounds, full: w.isFullScreen() || w.isMaximized() };
      });
      const covers = Math.abs(win.bounds.width - win.area.width) <= 16 && win.bounds.height >= win.area.height - 60;
      expect(win.full || covers, `the window fills the screen (${JSON.stringify(win)})`).toBe(true);
      const app = await clientApp(workerApp);
      const view = await app.page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      const board = await app.toolbar.wbSvg.boundingBox();
      expect(board.width, 'the board spans the window').toBeGreaterThan(view.w * 0.9);
      expect(board.height, 'top to bottom').toBeGreaterThan(view.h * 0.8);
      for (const [name, el] of [
        ['toolbar', app.toolbar.container],
        ['header', app.header.logoImage],
      ]) {
        const b = await el.boundingBox();
        expect(
          b && b.x >= 0 && b.y >= 0 && b.x + b.width <= view.w + 1 && b.y + b.height <= view.h + 1,
          `the ${name} is fully on screen`
        ).toBe(true);
      }
    }
  );

  test(
    "FLOW-27-04: a new build is shown after the update and the teacher's boards are unchanged",
    { tag: ['@functional'] },
    async ({ workerApp }) => {
      let app = await clientApp(workerApp);
      const build = await serverBuild();
      await expect(app.header.versionText, 'the client shows the build the server serves').toContainText(build);
      await app.signIn();
      await app.nav.applyClassMap('default');
      await app.toolbar.waitForBoardToSettle();
      const board = sorted(await boardStrokes(app));
      app = await relaunchClient(workerApp);
      await expect(app.header.versionText, 'still that build after a restart').toContainText(build);
      await app.signIn();
      await app.nav.applyClassMap('default');
      await app.toolbar.waitForBoardToSettle();
      expect(sorted(await boardStrokes(app)), 'the teacher’s board is unchanged').toEqual(board);
    }
  );

  test(
    'FLOW-27-05: closing the client signs nothing out unexpectedly and loses no writing',
    { tag: ['@functional'] },
    async ({ workerApp }) => {
      let app = await clientApp(workerApp);
      const second = await openSecondDevice(process.env.VALID_PIN);
      try {
        await app.signIn();
        await app.nav.applyClassMap('default');
        await app.content.startOnFreshSpace();
        const stroke = await writeStroke(app);
        await waitForAutosave(app);
        app = await relaunchClient(workerApp);
        await second.app.page.reload();
        await expect(second.app.login.avatar, 'the teacher’s other session is still signed in').toBeVisible({
          timeout: 30000,
        });
        await app.signIn();
        await app.nav.applyClassMap('default');
        await app.toolbar.waitForBoardToSettle();
        expect(await boardStrokes(app), 'no writing lost').toContain(stroke);
      } finally {
        await second.close();
      }
    }
  );

  test(
    'FLOW-27-06: the client and a browser show the same class, topic and board for the same teacher',
    { tag: ['@functional'] },
    async ({ workerApp }) => {
      const app = await clientApp(workerApp);
      await app.signIn();
      await app.nav.applyClassMap('default');
      await app.page.waitForTimeout(3000); // the class choice reaches the server
      await app.toolbar.waitForBoardToSettle();
      const onClient = { ...(await whereAmI(app)), board: sorted(await boardStrokes(app)) };
      const second = await openSecondDevice(process.env.VALID_PIN);
      try {
        await expect(second.app.nav.currentClassBtn, 'the same class').toHaveText(onClient.cls, { timeout: 30000 });
        expect((await whereAmI(second.app)).topic, 'the same topic').toBe(onClient.topic);
        await second.app.toolbar.waitForBoardToSettle();
        expect(sorted(await boardStrokes(second.app)), 'the same board').toEqual(onClient.board);
      } finally {
        await second.close();
      }
    }
  );
});
