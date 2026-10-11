// CLI-02 — The client window on panels and projectors
// Source: CEPV2_Stories/19_DesktopClient.md
// Desktop client only. The window is minimised, restored, made full screen and resized from the client's own main
// process (Electron's BrowserWindow) and always put back as it was. Screen sizes and Windows scaling are shown to the
// teach page through DevTools screen emulation (cli-lib.js emulateScreen), which is cleared afterwards. Writing: on
// fresh space of the default board (9A Science 4.1), nothing erased. Dragging to a second screen (CLI-02-05) is manual.

const { test, expect } = require('../../fixtures');
const { whereAmI } = require('../00-flows/flow-helpers');
const { allStrokes } = require('../18-resilience/resilience-lib');
const { emulateScreen, layoutProblems } = require('./cli-lib');

const sorted = (a) => [...a].sort();

/** The client's main window state, and helpers to change it (run in the client's main process). */
const win = {
  state: (w) =>
    w.app.evaluate(({ BrowserWindow }) => {
      const x = BrowserWindow.getAllWindows().find((b) => b.isVisible()) || BrowserWindow.getAllWindows()[0];
      return {
        bounds: x.getBounds(),
        maximized: x.isMaximized(),
        fullScreen: x.isFullScreen(),
        minimized: x.isMinimized(),
      };
    }),
  minimize: (w) =>
    w.app.evaluate(({ BrowserWindow }) => {
      const x = BrowserWindow.getAllWindows().find((b) => b.isVisible()) || BrowserWindow.getAllWindows()[0];
      x.minimize();
    }),
  restore: (w) =>
    w.app.evaluate(({ BrowserWindow }) => {
      for (const x of BrowserWindow.getAllWindows()) if (x.isMinimized()) x.restore();
    }),
  fullScreen: (w, on) =>
    w.app.evaluate(({ BrowserWindow }, value) => {
      const x = BrowserWindow.getAllWindows().find((b) => b.isVisible()) || BrowserWindow.getAllWindows()[0];
      x.setFullScreen(value);
    }, on),
  resize: (w, size) =>
    w.app.evaluate(({ BrowserWindow }, s) => {
      const x = BrowserWindow.getAllWindows().find((b) => b.isVisible()) || BrowserWindow.getAllWindows()[0];
      if (x.isFullScreen()) x.setFullScreen(false);
      if (x.isMaximized()) x.unmaximize();
      x.setBounds({ x: 0, y: 0, width: s.width, height: s.height });
    }, size),
  /** Put the window back as `s` (from state()). */
  put: (w, s) =>
    w.app.evaluate(({ BrowserWindow }, st) => {
      const x = BrowserWindow.getAllWindows().find((b) => b.isVisible()) || BrowserWindow.getAllWindows()[0];
      if (x.isMinimized()) x.restore();
      if (st.fullScreen) x.setFullScreen(true);
      else {
        if (x.isFullScreen()) x.setFullScreen(false);
        if (st.maximized) x.maximize();
        else x.setBounds(st.bounds);
      }
    }, s),
};

/** The teacher's lesson as it stands: class, topic and every stroke. */
const lesson = async (user) => ({ ...(await whereAmI(user)), board: sorted(await allStrokes(user)) });

test.describe('CLI-02 The client window on panels and projectors', () => {
  test.skip(!!process.env.RUN_IN_BROWSER, 'the desktop client window has no browser equivalent');
  test.use({ freshSpace: true });
  test.describe.configure({ timeout: 240000 });

  let original;
  test.beforeEach(async ({ workerApp }) => {
    original = await win.state(workerApp);
  });
  test.afterEach(async ({ workerApp }) => {
    await win.put(workerApp, original).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 1500));
  });

  test(
    'CLI-02-01: minimising and restoring the client keeps the topic, board and open panels as they were',
    { tag: ['@functional'] },
    async ({ user, workerApp, page }) => {
      await user.toolbar.penStroke({ x: 500, y: 400 }, { x: 760, y: 450 });
      await user.toolbar.openToolPanel('gtPen');
      await expect(user.toolbar.panel, 'set-up: the Pen panel is open').toBeVisible();
      const before = await lesson(user);
      await win.minimize(workerApp);
      await expect
        .poll(async () => (await win.state(workerApp)).minimized, { message: 'set-up: minimised' })
        .toBe(true);
      await page.waitForTimeout(3000);
      await win.restore(workerApp);
      await expect.poll(async () => (await win.state(workerApp)).minimized, { message: 'restored' }).toBe(false);
      await page.waitForTimeout(1500);
      expect(await lesson(user), 'the same class, topic and board').toEqual(before);
      await expect(user.toolbar.panel, 'the Pen panel is still open').toBeVisible();
      await user.toolbar.closePanelByTappingOutside();
    }
  );

  test(
    'CLI-02-02: full screen and leaving full screen keep everything visible and working',
    { tag: ['@functional'] },
    async ({ user, workerApp, page }) => {
      for (const on of [true, false]) {
        await win.fullScreen(workerApp, on);
        await expect
          .poll(async () => (await win.state(workerApp)).fullScreen, { message: `set-up: full screen ${on}` })
          .toBe(on);
        await page.waitForTimeout(2000);
        expect
          .soft(await layoutProblems(user), `${on ? 'in' : 'out of'} full screen: every control on screen`)
          .toEqual([]);
        const count = await user.toolbar.pathCount();
        await user.toolbar.penStroke({ x: 500, y: on ? 380 : 480 }, { x: 760, y: on ? 420 : 520 });
        expect
          .soft(await user.toolbar.pathCount(), `${on ? 'in' : 'out of'} full screen: the pen writes`)
          .toBe(count + 1);
      }
    }
  );

  test(
    'CLI-02-03: the layout at 1920×1080, 3840×2160 and 1366×768 keeps the toolbar, Playlist and header reachable',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      for (const size of [
        { width: 1920, height: 1080 },
        { width: 3840, height: 2160 },
        { width: 1366, height: 768 },
      ]) {
        const undo = await emulateScreen(page, size);
        try {
          expect.soft(await layoutProblems(user), `${size.width}×${size.height}: nothing cut off`).toEqual([]);
        } finally {
          await undo();
        }
      }
    }
  );

  test(
    'CLI-02-04: the layout at Windows scaling 100%, 125% and 150%',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      // A 1920×1080 panel at each scaling: the page gets 1920/scale × 1080/scale CSS pixels.
      for (const scale of [1, 1.25, 1.5]) {
        const undo = await emulateScreen(page, {
          width: Math.round(1920 / scale),
          height: Math.round(1080 / scale),
          scale,
        });
        try {
          expect.soft(await layoutProblems(user), `${scale * 100}% scaling: nothing cut off`).toEqual([]);
        } finally {
          await undo();
        }
      }
    }
  );

  test(
    'CLI-02-06: resizing the window while writing does not move or distort the writing',
    { tag: ['@edge'] },
    async ({ user, workerApp, page }) => {
      await user.toolbar.penStroke({ x: 500, y: 400 }, { x: 760, y: 450 });
      const earlier = await user.toolbar.paths.last().getAttribute('d');
      const sizeOf = async (d) =>
        user.toolbar.allPaths.evaluateAll((els, want) => {
          const r = els.find((e) => e.getAttribute('d') === want).getBoundingClientRect();
          return { width: Math.round(r.width), height: Math.round(r.height) };
        }, d);
      const earlierSize = await sizeOf(earlier);
      // A stroke under way while the window is made smaller.
      const box = await user.toolbar.wbSvg.boundingBox();
      await user.toolbar.selectTool('gtPen');
      const before = new Set(await allStrokes(user));
      await page.mouse.move(box.x + 420, box.y + 540);
      await page.mouse.down();
      for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 420 + i * 20, box.y + 540 + i * 3);
      await win.resize(workerApp, { width: 1366, height: 768 });
      await page.waitForTimeout(1500);
      for (let i = 11; i <= 20; i++) await page.mouse.move(box.x + 420 + i * 20, box.y + 540 + i * 3);
      await page.mouse.up();
      await page.waitForTimeout(1000);
      const added = (await allStrokes(user)).filter((d) => !before.has(d));
      expect.soft(added.length, 'the stroke under way is one stroke').toBe(1);
      expect.soft((await allStrokes(user)).includes(earlier), 'the earlier stroke is unchanged').toBe(true);
      expect.soft(await sizeOf(earlier), 'and not stretched or squashed').toEqual(earlierSize);
    }
  );

  test(
    'CLI-02-07: minimising and restoring never loses the open topic or board',
    { tag: ['@negative'] },
    async ({ user, workerApp, page }) => {
      await user.toolbar.penStroke({ x: 500, y: 400 }, { x: 760, y: 450 });
      await user.content.waitForSaved(40000).catch(() => {});
      const before = await lesson(user);
      // Minimised for a full minute (long enough for Windows to throttle a hidden window), three times.
      for (let i = 0; i < 3; i++) {
        await win.minimize(workerApp);
        await page.waitForTimeout(i === 0 ? 60000 : 5000);
        await win.restore(workerApp);
        await page.waitForTimeout(2000);
      }
      await expect(user.login.avatar, 'still signed in').toBeVisible();
      expect(await lesson(user), 'the same topic and board').toEqual(before);
    }
  );
});
