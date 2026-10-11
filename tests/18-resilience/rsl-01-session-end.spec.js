// RSL-01 — Writing survives the end of a session
// Source: CEPV2_Stories/18_Resilience.md
// Board: 'toolbarGeneral', on fresh space below the existing writing (nothing erased). A session's strokes are recorded
// by their outlines and looked for, one by one, after signing back in.

const { test, expect } = require('../../fixtures');
const { BOARD, writeStrokes, boardHas, signInToBoard } = require('./resilience-lib');

const isExtend = (url) => /extend|refresh/i.test(url);

test.describe('RSL-01 Writing survives the end of a session', () => {
  test.use({ classMap: BOARD, freshSpace: true });

  test(
    'RSL-01-03: writing, then pressing the quick Sign Out button at once, the writing is saved',
    { tag: ['@negative'] },
    async ({ user }) => {
      test.setTimeout(180000);
      const written = await writeStrokes(user, 5);
      await user.login.floatingSignOut.click({ force: true });
      await expect(user.login.avatar, 'set-up: signed out when the countdown ends').toBeHidden({ timeout: 20000 });
      await signInToBoard(user);
      const { missing, doubled } = await boardHas(user, written);
      expect({ missing, doubled }, `all ${written.length} strokes are back, once`).toEqual({ missing: 0, doubled: 0 });
    }
  );

  test(
    'RSL-01-04: blocking one token renewal while writing, the teacher stays signed in and nothing is lost',
    { tag: ['@long', '@interruption'] },
    async ({ user, page }) => {
      // The first renewal (the check at minute 4) fails; the teacher writes a stroke every 30 s through the next one.
      test.setTimeout(16 * 60 * 1000);
      let blocked = 0;
      const blockFirst = (route) => (blocked++ === 0 ? route.abort('internetdisconnected') : route.continue());
      await page.route((url) => isExtend(url.toString()), blockFirst);
      const written = [];
      try {
        const end = Date.now() + 11 * 60 * 1000;
        for (let i = 0; Date.now() < end; i++) {
          if (!(await user.login.avatar.isVisible().catch(() => false))) break;
          written.push(
            ...(await writeStrokes(user, 1, { x: 220 + (i % 20) * 50, y: 260 + (Math.floor(i / 20) % 8) * 60 }))
          );
          await page.waitForTimeout(30000);
        }
      } finally {
        await page.unroute((url) => isExtend(url.toString()), blockFirst).catch(() => {});
      }
      expect(blocked, 'set-up: a renewal was attempted and the first one failed').toBeGreaterThan(0);
      await expect(user.login.avatar, 'still signed in after the failed renewal').toBeVisible();
      await page.waitForTimeout(15000); // past the last autosave countdown
      await user.userMenu.signOut();
      await signInToBoard(user);
      const { missing } = await boardHas(user, written);
      expect(missing, `none of the ${written.length} strokes is lost`).toBe(0);
    }
  );

  test(
    'RSL-01-06: signing out yourself at 40 minutes, every stroke of the session is saved',
    { tag: ['@long', '@interruption'] },
    async ({ user, page }) => {
      // Signs out just before the forced sign-out (expected at about 40 min, never before ~39: LOG-06-02).
      const SIGN_OUT_AT = Number(process.env.SELF_SIGN_OUT_MINUTES || 38.5);
      test.setTimeout((SIGN_OUT_AT + 10) * 60 * 1000);
      const start = Date.now();
      const written = [];
      for (let i = 0; Date.now() - start < SIGN_OUT_AT * 60000; i++) {
        if (!(await user.login.avatar.isVisible().catch(() => false))) break;
        written.push(
          ...(await writeStrokes(user, 1, { x: 220 + (i % 20) * 50, y: 260 + (Math.floor(i / 20) % 8) * 60 }))
        );
        await page.waitForTimeout(30000);
      }
      await expect(user.login.avatar, 'set-up: still signed in, to sign out myself').toBeVisible();
      await user.userMenu.signOut();
      await signInToBoard(user);
      const { missing, doubled } = await boardHas(user, written);
      test.info().annotations.push({
        type: 'note',
        description: `${written.length} strokes over ${Math.round((Date.now() - start) / 60000)} min; ${missing} missing, ${doubled} doubled.`,
      });
      expect({ missing, doubled }, 'every stroke of the session is saved, once').toEqual({ missing: 0, doubled: 0 });
    }
  );
});
