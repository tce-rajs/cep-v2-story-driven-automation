// LOG-06 — Session length and token extension
// Source: CEPV2_Stories/03_Login.md
//
// Owner-stated flow (2026-09-28): the access token lives 5 minutes and the app checks the session at minute 4 of each
// token. While the teacher interacts (any interaction, pen strokes included) the token is renewed silently at each check,
// with no Sign Out / Continue popup; after 45 minutes of continuous use the teacher is signed out even while active.
// (The idle side -- the popup -- is LOG-05.)
//
// One session of continuous use (a pen stroke every 30 s, on 'toolbarGeneral' = Class 12A Physics 1.1) is run once, by
// LOG-06-01, for up to SESSION_CAP_MINUTES + 5 minutes (default 45 + 5). It records every token-renewal request, every
// time the popup was seen, when the teacher was signed out, and every stroke written. The tests after it each check one
// more result on that record, read from a file in this run's output folder (emptied by Playwright at the start of every
// run); run without LOG-06-01 they skip with that reason.
// The extension endpoint is recognised by /extend|refresh/ in the URL -- the same pattern the sign-in tests already
// exclude as "not a sign-in" (log-03/log-04). Every auth-looking request is also listed in a note, so the first live run
// shows the real endpoint if the pattern needs adjusting.

const fs = require('fs');
const path = require('path');
const { test, expect } = require('../../fixtures');

const CAP_MINUTES = Number(process.env.SESSION_CAP_MINUTES || 45); // the latest a forced sign-out may come
const IDEAL_MINUTES = 40; // when it is meant to come (owner, 2026-09-28)
const TOKEN_MINUTES = 5; // a renewal must come before each token expires (checks are at minute 4)
const popupBtn = (page) => page.getByRole('button', { name: /stay signed in|continue( session)?/i });
const isExtend = (url) => /extend|refresh/i.test(url);
const isAuthish = (url) => /auth|token|sso|session|extend|refresh/i.test(url);

const sessionFile = () => path.join(test.info().project.outputDir, 'log-06-session.json');
const needSession = () => {
  let session = null;
  try {
    session = JSON.parse(fs.readFileSync(sessionFile(), 'utf8'));
  } catch {
    // no session this run
  }
  test.skip(!session, 'needs the continuous-use session that LOG-06-01 records earlier in the same run');
  return session;
};
const minutesSince = (start, at) => Math.round(((at - start) / 60000) * 10) / 10;

test.describe('LOG-06 Session length and token extension', () => {
  // No freshSpace fixture here: LOG-06-03 has to read the board LOG-06-01 wrote. The tests that write move to fresh
  // space below the teacher's writing themselves; the board is never cleared (owner rule 2026-09-29).
  test.use({ classMap: 'toolbarGeneral' });

  test(
    'LOG-06-01: while the teacher keeps using the app, the token is renewed before each 5-minute token expires',
    { tag: ['@long', '@functional'] },
    async ({ user, page }) => {
      test.setTimeout((CAP_MINUTES + 10) * 60 * 1000);
      await user.content.startOnFreshSpace();
      fs.rmSync(sessionFile(), { force: true });
      const start = Date.now();
      const extends_ = [];
      const authish = new Map();
      page.on('response', (r) => {
        const url = r.url();
        if (isAuthish(url)) authish.set(url.replace(/\?.*$/, ''), (authish.get(url.replace(/\?.*$/, '')) || 0) + 1);
        if (isExtend(url)) extends_.push({ at: Date.now(), status: r.status(), url: url.replace(/\?.*$/, '') });
      });

      // Continuous use: a pen stroke every 30 s, checking each time whether the teacher is still signed in.
      const strokes = [];
      const popups = [];
      let loggedOutAt = null;
      const end = start + (CAP_MINUTES + 5) * 60 * 1000;
      for (let i = 0; Date.now() < end; i++) {
        const signedIn = await user.login.avatar.isVisible().catch(() => false);
        if (!signedIn) {
          loggedOutAt = Date.now();
          break;
        }
        // An active teacher should never be asked; if the popup shows anyway, record it and answer Continue so the
        // session carries on towards the 45-minute cap (that it showed at all is LOG-06-05's check).
        if (
          await popupBtn(page)
            .isVisible()
            .catch(() => false)
        ) {
          popups.push(Date.now());
          await popupBtn(page)
            .click()
            .catch(() => {});
        }
        const x = 200 + (i % 20) * 50;
        const y = 250 + (Math.floor(i / 20) % 8) * 60;
        await user.toolbar.penStroke({ x, y }, { x: x + 30, y: y + 35 });
        strokes.push({ at: Date.now(), d: await user.toolbar.paths.last().getAttribute('d') });
        await page.waitForTimeout(30000);
      }
      const session = { start, end: Date.now(), loggedOutAt, extends: extends_, strokes, popups };
      fs.mkdirSync(path.dirname(sessionFile()), { recursive: true });
      fs.writeFileSync(sessionFile(), JSON.stringify(session));
      test.info().annotations.push(
        {
          type: 'note',
          description: `Signed out after ${loggedOutAt ? `${minutesSince(start, loggedOutAt)} min` : 'never (within the run)'}; ${strokes.length} strokes; popups at (min): ${popups.map((at) => minutesSince(start, at)).join(', ') || 'none'}; renewal requests at (min): ${extends_.map((e) => `${minutesSince(start, e.at)}[${e.status}]`).join(', ') || 'none'}`,
        },
        {
          type: 'note',
          description: `Auth-looking requests seen: ${[...authish].map(([u, n]) => `${u} x${n}`).join(' | ')}`,
        }
      );

      // One result here: while signed in, a successful renewal came before each token expired (never 5+ min without).
      const ok = extends_.filter((e) => e.status < 400).map((e) => e.at);
      const until = loggedOutAt || session.end;
      let longestGap = 0;
      let prev = start;
      for (const at of [...ok, until]) {
        longestGap = Math.max(longestGap, at - prev);
        prev = at;
      }
      expect(ok.length, 'successful token-renewal requests while active').toBeGreaterThan(0);
      expect(
        minutesSince(0, longestGap),
        `never ${TOKEN_MINUTES} min or more without a successful renewal while active`
      ).toBeLessThan(TOKEN_MINUTES);
    }
  );

  test(
    'LOG-06-05: a teacher who keeps interacting is never shown the Sign Out / Continue popup',
    { tag: ['@long', '@functional'] },
    async () => {
      const s = needSession();
      const at = s.popups.map((p) => minutesSince(s.start, p));
      test.info().annotations.push({ type: 'note', description: `Popups seen at (min): ${at.join(', ') || 'none'}` });
      expect(at, 'minutes at which the popup appeared while the teacher was active').toEqual([]);
    }
  );

  test(
    'LOG-06-02: continuous use ends in a forced sign-out at about 40 minutes, never later than 45, even while active',
    { tag: ['@long', '@functional'] },
    async () => {
      // Owner (2026-09-28): about 40 minutes is the intended time, 45 the maximum. Earlier than ~39 is too early.
      const s = needSession();
      expect(s.loggedOutAt, `signed out within ${CAP_MINUTES + 5} min of continuous use`).not.toBeNull();
      const at = minutesSince(s.start, s.loggedOutAt);
      test
        .info()
        .annotations.push({ type: 'note', description: `Forced out after ${at} min (ideal ~${IDEAL_MINUTES}).` });
      expect(at, `not before about ${IDEAL_MINUTES} min`).toBeGreaterThanOrEqual(IDEAL_MINUTES - 1);
      expect(at, `no later than ${CAP_MINUTES} min`).toBeLessThanOrEqual(CAP_MINUTES);
    }
  );

  test(
    'LOG-06-03: nothing the teacher wrote before the forced logout is lost',
    { tag: ['@long', '@regression'] },
    async ({ user }) => {
      test.setTimeout(5 * 60 * 1000);
      const s = needSession();
      test.skip(!s.loggedOutAt, 'no forced logout happened in LOG-06-01, so there is no "before the logout" to check');
      try {
        // Signed in again by the fixture, on the same topic: every stroke written before the logout must be there.
        // The whole board (the teacher's writing is still on it -- never cleared), searched for LOG-06-01's strokes.
        await expect
          .poll(() => user.toolbar.allPaths.count(), { message: 'the board loaded', timeout: 60000 })
          .toBeGreaterThanOrEqual(s.strokes.length);
        const board = await user.toolbar.allPaths.evaluateAll((els) => els.map((e) => e.getAttribute('d')));
        const lost = s.strokes.filter((st) => !board.includes(st.d));
        test.info().annotations.push({
          type: 'note',
          description: `${s.strokes.length} strokes written; ${lost.length} missing; last written ${Math.round((s.loggedOutAt - (s.strokes.at(-1) || { at: s.loggedOutAt }).at) / 1000)} s before the logout.`,
        });
        expect(lost, 'strokes written before the forced logout that are missing afterwards').toHaveLength(0);
      } finally {
        fs.rmSync(sessionFile(), { force: true });
      }
    }
  );

  test(
    'LOG-06-04: one failed token renewal (a network blip) does not end the session while the teacher is active',
    { tag: ['@long', '@negative'] },
    async ({ user, page }) => {
      // The first renewal request (the check at minute 4) is made to fail; the teacher keeps writing through the next
      // one. The owner's flow does not say what should happen here -- "the session survives a single blip" is this
      // case's expectation, so a failure is a finding to confirm with the owner, not an automatic bug.
      // SEEN LIVE (2026-09-29): with the one /sso/extend at ~3.8 min aborted, the teacher was signed out while writing.
      test.setTimeout((TOKEN_MINUTES * 2 + 6) * 60 * 1000);
      await user.content.startOnFreshSpace();
      let blocked = 0;
      await page.route(
        (url) => isExtend(url.toString()),
        (route) => (blocked++ === 0 ? route.abort('internetdisconnected') : route.continue())
      );
      try {
        const end = Date.now() + (TOKEN_MINUTES * 2 + 2) * 60 * 1000;
        for (let i = 0; Date.now() < end; i++) {
          await user.toolbar.penStroke({ x: 250 + (i % 20) * 50, y: 400 }, { x: 280 + (i % 20) * 50, y: 440 });
          await page.waitForTimeout(30000);
        }
        test
          .info()
          .annotations.push({ type: 'note', description: `Extension requests seen: ${blocked} (first one failed).` });
        expect(blocked, 'set-up: an extension was attempted and the first one failed').toBeGreaterThan(0);
        await expect(user.login.avatar, 'still signed in after a failed extension').toBeVisible();
        const before = await user.toolbar.pathCount();
        await user.toolbar.penStroke({ x: 600, y: 600 }, { x: 700, y: 640 });
        expect(await user.toolbar.pathCount(), 'and the board still works').toBeGreaterThan(before);
      } finally {
        await page.unroute((url) => isExtend(url.toString())).catch(() => {});
      }
    }
  );
});
