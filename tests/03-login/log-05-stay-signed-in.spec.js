// LOG-05 — Stay signed in
// Source: CEPV2_Stories/03_Login.md
// LOG-05-02/05/07/08/09 wait in real time for the 4-minute inactivity warning (@long). LOG-05-03/04 fake the network failure with page.route (the whole network / only the sign-in request).

const { test, expect } = require('../../fixtures');

const isAuthUrl = (url) => /auth|login|sso|token/i.test(url);

test.describe('LOG-05 Stay signed in', () => {
  test(
    'LOG-05-01: the user is still signed in after the app reloads',
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      await page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await expect(user.login.toggleButton, 'no Sign In button').toBeHidden();
    }
  );

  // The Sign Out / Continue Session popup. Owner's written flow (2026-09-28): the access token lives 5 minutes and the
  // app checks the session at minute 4 of each token (renewals seen live every ~3.9 min, /sso/extend). The first two
  // checks renew automatically; at the third check (~12-13 min) an idle teacher gets the popup with a 1-minute window:
  // Continue renews the token, Sign Out signs out, no answer signs the teacher out automatically.
  // SEEN LIVE (2026-09-29): idle from sign-in, NO popup within 6 minutes (so not "popup at 4 min", an earlier answer);
  // active for 6 min then idle, the popup came 9.5 min after the last interaction. Both fit the written flow, so the
  // expected time idle from sign-in is the third check: 11-14 minutes (owner to confirm).
  // One test per result: idle from sign-in (LOG-05-07), active then idle (LOG-05-10), the countdown (LOG-05-02),
  // Continue (LOG-05-05), Sign Out (LOG-05-08), no answer (LOG-05-09).
  // CONFIRMED LIVE (2026-09-26): Playwright's fake clock (page.clock) has no effect inside the desktop client, so these
  // wait in real time. SESSION_WARNING_MINUTES caps the wait for the popup (default 16).
  const FIRST_POPUP_MINUTES = [11, 14]; // idle from sign-in: the third ~4-minute check
  const IDLE_WARNING_MINUTES = 4; // never sooner than this after the last interaction
  // "Continue Session" in the owner's description; "Stay Signed In" was the label seen live on 2026-09-26.
  const stayBtn = (page) => page.getByRole('button', { name: /stay signed in|continue( session)?/i });
  /** Sit idle until the inactivity warning shows; returns how many minutes that took. */
  const waitForInactivityWarning = async (page, extraMinutes = 3) => {
    const maxMinutes = Number(process.env.SESSION_WARNING_MINUTES || 16);
    test.setTimeout((maxMinutes + extraMinutes) * 60 * 1000);
    const idleFrom = Date.now();
    await expect(stayBtn(page), 'inactivity warning with "Stay Signed In"').toBeVisible({
      timeout: maxMinutes * 60 * 1000,
    });
    return (Date.now() - idleFrom) / 60000;
  };

  // `user: _signedIn` only asks for the signed-in fixture.
  test(
    'LOG-05-07: idle from sign-in, the Sign Out / Continue popup appears at the third session check (about 11-14 minutes)',
    { tag: ['@functional', '@long'] },
    async ({ user: _signedIn, page }) => {
      const minutes = await waitForInactivityWarning(page);
      try {
        test.info().annotations.push({ type: 'note', description: `Warning after ${minutes.toFixed(1)} min idle.` });
        expect(minutes, 'not before the third check').toBeGreaterThanOrEqual(FIRST_POPUP_MINUTES[0]);
        expect(minutes, 'and not later than it').toBeLessThanOrEqual(FIRST_POPUP_MINUTES[1]);
      } finally {
        await stayBtn(page)
          .click()
          .catch(() => {});
      }
    }
  );

  test(
    'LOG-05-10: after a spell of activity, the warning comes at the next check with no activity, never under 4 minutes after the last interaction',
    { tag: ['@functional', '@long'] },
    async ({ user, page }) => {
      test.setTimeout(20 * 60 * 1000);
      // Active for 6 minutes (a stroke every 30 s, through the first check at minute 4): no popup may appear meanwhile.
      // Pan to fresh space first, so the strokes do not land on what earlier runs left on this board.
      await user.content.panBelowExistingWriting();
      const activeUntil = Date.now() + 6 * 60 * 1000;
      for (let i = 0; Date.now() < activeUntil; i++) {
        await user.toolbar.penStroke({ x: 250 + (i % 20) * 50, y: 450 }, { x: 280 + (i % 20) * 50, y: 490 });
        await expect(stayBtn(page), 'set-up: no popup while the teacher is active').toBeHidden();
        await page.waitForTimeout(30000);
      }
      const lastActivity = Date.now();
      await expect(stayBtn(page), 'the popup at the next check with no activity').toBeVisible({
        timeout: 10 * 60 * 1000,
      });
      const after = (Date.now() - lastActivity) / 60000;
      try {
        test.info().annotations.push({
          type: 'note',
          description: `Popup ${after.toFixed(1)} min after the last interaction.`,
        });
        expect(after, 'not before 4 minutes without activity').toBeGreaterThanOrEqual(IDLE_WARNING_MINUTES - 0.5);
        expect(after, 'and within three checks (~12 min)').toBeLessThanOrEqual(13);
      } finally {
        await stayBtn(page)
          .click()
          .catch(() => {});
      }
    }
  );

  test(
    'LOG-05-02: the inactivity warning shows a countdown',
    { tag: ['@functional', '@long'] },
    async ({ user: _signedIn, page }) => {
      await waitForInactivityWarning(page);
      try {
        await expect(
          page
            .getByText(/\d+\s*(s|sec|seconds)\b|\d{1,2}:\d{2}/i)
            .filter({ visible: true })
            .first(),
          'a countdown is shown'
        ).toBeVisible();
      } finally {
        await stayBtn(page)
          .click()
          .catch(() => {});
      }
    }
  );

  test(
    'LOG-05-08: "Sign out" on the inactivity warning signs the teacher out',
    { tag: ['@functional', '@long'] },
    async ({ user, page }) => {
      await waitForInactivityWarning(page);
      await page
        .getByRole('button', { name: /sign out|log ?out/i })
        .filter({ visible: true })
        .first()
        .click();
      await expect(user.login.avatar, 'signed out').toBeHidden({ timeout: 15000 });
      await expect(user.login.guestModeText, 'back in Guest Mode').toBeVisible();
    }
  );

  test(
    'LOG-05-09: with no answer to the inactivity warning, the teacher is signed out automatically after its 1 minute',
    { tag: ['@functional', '@long'] },
    async ({ user, page }) => {
      await waitForInactivityWarning(page, 5);
      const shownAt = Date.now();
      // No answer: wait out the 1-minute countdown (plus a margin).
      await expect(user.login.avatar, 'signed out automatically').toBeHidden({ timeout: 2 * 60 * 1000 });
      const after = (Date.now() - shownAt) / 60000;
      test
        .info()
        .annotations.push({ type: 'note', description: `Signed out ${after.toFixed(1)} min after the warning.` });
      expect(after, 'not before the 1-minute countdown ends').toBeGreaterThanOrEqual(0.8);
      await expect(user.login.guestModeText, 'back in Guest Mode').toBeVisible();
    }
  );

  test(
    'LOG-05-05: Continue Session on the inactivity warning keeps the session going',
    { tag: ['@functional', '@long'] },
    async ({ user, page }) => {
      await waitForInactivityWarning(page, 13);
      const stay = stayBtn(page);
      await stay.click();
      const continuedAt = Date.now();
      await page.waitForTimeout(5000);
      await expect(stay).toBeHidden();
      await expect(user.login.avatar, 'still signed in after Continue').toBeVisible();
      await expect(user.login.toggleButton, 'not bounced to Sign In').toBeHidden();
      // Still usable afterwards, not a signed-in-looking shell.
      await user.nav.openClassPopup();
      await expect(user.nav.recentClassesTab).toBeVisible({ timeout: 10000 });
      await user.nav.openClassPopup(); // toggles closed

      // OPEN QUESTION (owner not sure, 2026-09-28): when does the next popup come after Continue? Measured, not asserted:
      // stay idle up to 10 minutes and record when (or whether) it comes back.
      const again = await stay
        .waitFor({ state: 'visible', timeout: 10 * 60 * 1000 })
        .then(() => ((Date.now() - continuedAt) / 60000).toFixed(1))
        .catch(() => null);
      test.info().annotations.push({
        type: 'note',
        description: again
          ? `After Continue, the next popup came ${again} min later (idle).`
          : 'After Continue, no popup came back within 10 min idle.',
      });
      await stay.click().catch(() => {});
    }
  );

  test(
    'LOG-05-03: signing in with no network shows a clear error, not a hang',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      await app.guest.open();
      await app.login.openSignIn();
      await expect(app.login.pinDigitBox(0)).toBeVisible({ timeout: 10000 });
      await page.route('**/*', (route) => route.abort('internetdisconnected'));
      try {
        await app.login.enterPin(process.env.VALID_PIN);
        await expect(
          app.login.pinErrorMessage
            .or(page.getByText(/network|connection|offline|unable|try again/i).filter({ visible: true }))
            .first(),
          'a clear error'
        ).toBeVisible({ timeout: 20000 });
        await expect(app.login.avatar).toBeHidden();
      } finally {
        await page.unroute('**/*');
      }
    }
  );

  /** Open the PIN view and sign in while the server answers the sign-in with a 500; returns the message locator. */
  const signInAgainstServerError = async (app, page) => {
    await app.guest.open();
    await app.login.openSignIn();
    await expect(app.login.pinDigitBox(0)).toBeVisible({ timeout: 10000 });
    const failSignIn = (route) =>
      route.request().method() === 'POST' && isAuthUrl(route.request().url())
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Internal Server Error"}' })
        : route.continue();
    await page.route('**/*', failSignIn);
    try {
      await app.login.enterPin(process.env.VALID_PIN);
      const message = app.login.pinErrorMessage
        .or(page.getByText(/error|went wrong|unable|try again/i).filter({ visible: true }))
        .first();
      await message.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
      return message;
    } finally {
      await page.unroute('**/*', failSignIn);
    }
  };

  test(
    'LOG-05-04: a server error during sign-in shows a clear message',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      const message = await signInAgainstServerError(app, page);
      await expect(message, 'a clear message').toBeVisible();
    }
  );

  test(
    'LOG-05-06: after a server error during sign-in, trying again signs in once the server is back',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      await signInAgainstServerError(app, page);
      await app.signIn(process.env.VALID_PIN);
      await expect(app.login.avatar).toBeVisible();
    }
  );
});
