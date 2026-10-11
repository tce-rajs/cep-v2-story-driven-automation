// RSL-03 — Writing survives network and server failures
// Source: CEPV2_Stories/18_Resilience.md
// Board: 'toolbarGeneral' (9A Science 4.1), on fresh space below the existing writing (nothing erased).
// The network is cut with page.route (context.setOffline has no effect in the client): `offline` fails the app's own
// calls while the page stays loaded; RSL-03-08 also fails the page itself, as a client started with no network would.
// A slow network is the app's own calls held back by a fixed delay each.

const { test, expect } = require('../../fixtures');
const { BOARD, writeStrokes, boardHas, signInToBoard, waitForSave, offline } = require('./resilience-lib');

/** A teacher writing one stroke every `everyMs` until `ms` have passed (stops early if signed out). */
async function writeFor(app, ms, everyMs = 30000, start = 0) {
  const written = [];
  const end = Date.now() + ms;
  for (let i = start; Date.now() < end; i++) {
    if (!(await app.login.avatar.isVisible().catch(() => false))) break;
    written.push(...(await writeStrokes(app, 1, { x: 220 + (i % 20) * 50, y: 260 + (Math.floor(i / 20) % 8) * 60 })));
    await app.page.waitForTimeout(Math.max(0, Math.min(everyMs, end - Date.now())));
  }
  return written;
}

/** Sign out, sign back in and compare the board with what was written. */
async function backAfterSignIn(app, written) {
  await app.userMenu.signOut();
  await signInToBoard(app);
  return boardHas(app, written);
}

test.describe('RSL-03 Writing survives network and server failures', () => {
  test.use({ classMap: BOARD, freshSpace: true });

  test.afterEach(async ({ page }) => {
    await page.unroute('**/*').catch(() => {});
  });

  test(
    'RSL-03-05: the network drops for 15 minutes while writing; the teacher is not silently signed out and the writing is kept',
    { tag: ['@long', '@interruption'] },
    async ({ user, page }) => {
      test.setTimeout(30 * 60 * 1000);
      const OUTAGE = Number(process.env.LONG_OUTAGE_MINUTES || 15) * 60000;
      await page.route('**/*', offline);
      let written;
      try {
        written = await writeFor(user, OUTAGE);
      } finally {
        await page.unroute('**/*', offline);
      }
      const signedIn = await user.login.avatar.isVisible().catch(() => false);
      const told = await page
        .getByText(/session (has )?(expired|ended)|signed out|sign in again|log ?in again/i)
        .first()
        .isVisible()
        .catch(() => false);
      test.info().annotations.push({
        type: 'note',
        description: `After ${OUTAGE / 60000} min offline: signed in = ${signedIn}, told about the session = ${told}; ${written.length} strokes written.`,
      });
      expect(signedIn || told, 'still signed in, or clearly told the session ended (not silently signed out)').toBe(
        true
      );
      if (signedIn) await waitForSave(user, 60000);
      else await signInToBoard(user);
      const { missing } = signedIn ? await backAfterSignIn(user, written) : await boardHas(user, written);
      expect(missing, `none of the ${written.length} strokes written offline is lost`).toBe(0);
    }
  );

  test(
    'RSL-03-06: a slow network (3G speed) while writing a whole page; every stroke is saved and the pen does not lag',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      test.setTimeout(10 * 60 * 1000);
      // About 3G: every call of the app held back 750 ms before it goes out.
      const slow = async (route) => {
        if (['fetch', 'xhr'].includes(route.request().resourceType()))
          await new Promise((resolve) => setTimeout(resolve, 750));
        await route.continue().catch(() => {});
      };
      await page.route('**/*', slow);
      const lags = [];
      let written;
      try {
        written = [];
        for (let i = 0; i < 40; i++) {
          const t0 = Date.now();
          written.push(
            ...(await writeStrokes(user, 1, { x: 220 + (i % 20) * 50, y: 260 + (Math.floor(i / 20) % 8) * 60 }))
          );
          lags.push(Date.now() - t0);
        }
        await waitForSave(user, 90000);
      } finally {
        await page.unroute('**/*', slow);
      }
      const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
      test.info().annotations.push({
        type: 'note',
        description: `Per stroke (draw + appear on the board): median ${median(lags)} ms, worst ${Math.max(...lags)} ms.`,
      });
      // A stroke takes about 1.5 s here (the test's own settling waits); the network must not add to it.
      expect(median(lags), 'the pen does not lag on a slow network').toBeLessThan(3000);
      const { missing, doubled } = await backAfterSignIn(user, written);
      expect({ missing, doubled }, `all ${written.length} strokes are saved, once`).toEqual({ missing: 0, doubled: 0 });
    }
  );

  test(
    'RSL-03-07: the network drops and comes back 5 times in 2 minutes while writing; nothing lost or duplicated',
    { tag: ['@interruption'] },
    async ({ user, page }) => {
      test.setTimeout(10 * 60 * 1000);
      const written = [];
      for (let drop = 0; drop < 5; drop++) {
        await page.route('**/*', offline);
        written.push(...(await writeFor(user, 12000, 4000, drop * 6)));
        await page.unroute('**/*', offline);
        written.push(...(await writeFor(user, 12000, 4000, drop * 6 + 3)));
      }
      await waitForSave(user, 90000);
      const { missing, doubled } = await backAfterSignIn(user, written);
      expect({ missing, doubled }, `all ${written.length} strokes are saved, each once`).toEqual({
        missing: 0,
        doubled: 0,
      });
    }
  );

  test(
    'RSL-03-08: the app opened with no network shows a clear message, and the board works once the network is back',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      test.setTimeout(5 * 60 * 1000);
      // Everything fails, the page itself too: what a teacher sees when the client starts with the Wi-Fi off.
      await page.route('**/*', (route) => route.abort('internetdisconnected'));
      try {
        await page.reload({ timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(10000);
        // In the client, the window around the board (its shell) shows its own connection message.
        const text = (p) => p.evaluate(() => (document.body ? document.body.innerText.trim() : '')).catch(() => '');
        const shell = page
          .context()
          .pages()
          .find((p) => p.url().includes('app.asar'));
        const shown = `${await text(page)}\n${shell ? await text(shell) : ''}`;
        const message = /no (internet|network|connection)|offline|unable to connect|check your (network|connection)/i;
        expect(shown, 'a clear "no network" message, not a blank or frozen screen').toMatch(message);
      } finally {
        await page.unroute('**/*');
      }
      // Network back: the board works again without the teacher restarting anything.
      await expect(user.toolbar.wbSvg, 'the board comes back').toBeVisible({ timeout: 90000 });
      await user.toolbar.waitForBoardToSettle();
      const before = await user.toolbar.allPaths.count();
      await user.toolbar.penStroke({ x: 520, y: 420 }, { x: 760, y: 480 });
      expect(await user.toolbar.allPaths.count(), 'and the pen writes').toBe(before + 1);
    }
  );

  test(
    'RSL-03-09: during a server outage the "Saving whiteboard" message does not count down as if it will save',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      // The server is down: every call of the app comes back 503.
      const down = (route) =>
        ['fetch', 'xhr'].includes(route.request().resourceType())
          ? route.fulfill({ status: 503, body: 'Service Unavailable' })
          : route.continue();
      await user.content.startSaveLog();
      const since = Date.now();
      await page.route('**/*', down);
      try {
        await writeStrokes(user, 2);
        await page.waitForTimeout(30000); // longer than the autosave countdown
      } finally {
        await page.unroute('**/*', down);
      }
      const during = (await user.content.savedMessages()).filter((m) => m.at >= since).map((m) => m.text);
      test.info().annotations.push({
        type: 'note',
        description: `Autosave messages during the outage: ${JSON.stringify(during)}`,
      });
      expect(
        during.filter((t) => /saving whiteboard.*\d+\s*s/i.test(t) || /saved/i.test(t)),
        'no save countdown (or "Saved") while the server cannot be reached'
      ).toEqual([]);
    }
  );
});
