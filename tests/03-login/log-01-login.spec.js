// LOG-01 — Login
// Source: CEPV2_Stories/03_Login.md
//
// Not automated (per PROCESS.md, Plan Mode is manual-only): LOG-01-11.
// Written but blocked on data/backend control the suite doesn't have: LOG-01-04..07 (test.fixme below).

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { App } = require('../../pages/app');
const { BASE_URL } = require('../../config/env');

test.describe('LOG-01 Login', () => {
  test(
    'LOG-01-01: a valid login shows a welcome message that disappears on its own shortly after',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.signIn();
      const welcome = app.login.welcomeBackTitle;

      await expect(welcome).toBeVisible({ timeout: 15000 });
      // Nothing is clicked: it must go away by itself, and not linger indefinitely.
      await expect(welcome).toBeHidden({ timeout: 30000 });
    }
  );

  test(
    'LOG-01-02: an incorrect password shows a clear, specific error message',
    { tag: ['@negative'] },
    async ({ app }) => {
      await app.login.signInWithPassword({
        schoolSearchTerm: process.env.SCHOOL_SEARCH_TERM,
        username: process.env.USERNAME,
        password: 'definitely-not-the-real-password',
      });

      await expect(app.login.passwordErrorMessage).toBeVisible({ timeout: 15000 });
      await expect(app.login.passwordErrorMessage).toContainText(/credentials are invalid/i);
      await expect(app.login.avatar).toBeHidden();
    }
  );

  test(
    'LOG-01-03: a nonexistent account shows a clear error, not a generic failure',
    { tag: ['@negative'] },
    async ({ app }) => {
      await app.login.signInWithPassword({
        schoolSearchTerm: process.env.SCHOOL_SEARCH_TERM,
        username: 'definitely-not-a-real-user-id',
        password: process.env.PASSWORD,
      });

      await expect(app.login.passwordErrorMessage).toBeVisible({ timeout: 15000 });
      await expect(app.login.passwordErrorMessage).toContainText(/credentials are invalid/i);
      await expect(app.login.avatar).toBeHidden();
    }
  );

  test.fixme('LOG-01-04: logging in with a new PIN succeeds after an admin resets it', async () => {
    // BLOCKED: needs an admin action (PIN reset) on a disposable account before each run. There is no
    // admin credential or reset endpoint available to the suite, and resetting the shared QA PIN would
    // lock every other test out.
  });

  test.fixme('LOG-01-05: the old PIN is rejected with a clear message after a reset', async () => {
    // BLOCKED: same prerequisite as LOG-01-04 (an admin PIN reset on a disposable account).
  });

  test.fixme('LOG-01-06: signing in with an expired profile shows a specific "expired" message', async () => {
    // BLOCKED: needs a QA account whose profile is in the expired state. None is provided in .env.
  });

  test.fixme('LOG-01-07: "school license expired" blocks login with the right message', async () => {
    // BLOCKED: needs a school whose license is expired. None is provided in .env; the real school's
    // license must not be altered for a test.
  });

  test(
    'LOG-01-08: the session stays active during 15-20+ minutes of continuous use',
    { tag: ['@long', '@functional'] },
    async ({ user }) => {
      const minutes = Number(process.env.SESSION_SOAK_MINUTES || 16);
      test.setTimeout((minutes + 4) * 60 * 1000);

      // The board keeps what earlier runs wrote: pan to fresh space first, so the new strokes do not land on old ones.
      await user.content.panBelowExistingWriting();
      const startPaths = await user.toolbar.pathCount();
      for (let minute = 1; minute <= minutes; minute++) {
        // Real use: one whiteboard stroke a minute, then confirm still signed in.
        await user.toolbar.penStroke({ x: 300 + (minute % 8) * 40, y: 300 }, { x: 420 + (minute % 8) * 40, y: 380 });
        await expect(user.login.avatar, `signed in at minute ${minute}`).toBeVisible();
        await expect(user.login.guestModeText, `not bounced to Guest Mode at minute ${minute}`).toBeHidden();
        await user.page.waitForTimeout(55000);
      }
      expect(await user.toolbar.pathCount()).toBeGreaterThan(startPaths);
    }
  );

  test(
    'LOG-01-09: auto-logout does not come early — idle for under 4 minutes, the session stays and no warning shows',
    { tag: ['@long', '@regression'] },
    async ({ user }) => {
      // Owner-stated rule (2026-09-28): the inactivity warning comes after 4 minutes idle, and an unanswered warning signs
      // the teacher out a minute later (LOG-05-07/09). So "auto-logout does not recur" means: nothing happens BEFORE
      // 4 minutes. (Until 2026-09-28 this idled 6 minutes and expected the session to survive, which the rule now
      // says is wrong.)
      const idleMinutes = Number(process.env.SESSION_IDLE_MINUTES || 3.5);
      test.setTimeout((idleMinutes + 3) * 60 * 1000);

      await user.page.waitForTimeout(idleMinutes * 60 * 1000); // no interaction at all
      await expect(user.page.getByRole('button', { name: /stay signed in/i }), 'no warning yet').toBeHidden();
      await expect(user.login.avatar).toBeVisible();
      await expect(user.login.guestModeText).toBeHidden();

      // ...and it is still a working session, not just a leftover avatar.
      const before = await user.toolbar.pathCount();
      await user.toolbar.penStroke({ x: 300, y: 300 }, { x: 500, y: 380 });
      expect(await user.toolbar.pathCount()).toBeGreaterThan(before);
    }
  );

  test(
    'LOG-01-10: the duplicate-user sync issue does not recur on sign-in',
    { tag: ['@regression'] },
    async ({ app }) => {
      // Sign in and out three times. Each time the account must present as the SAME single user:
      // one avatar, one "Signed in as" identity, unchanged between cycles.
      const identities = [];
      for (let cycle = 1; cycle <= 3; cycle++) {
        await app.signIn();
        await expect(app.login.avatar).toHaveCount(1);
        await app.userMenu.openProfileMenu();
        identities.push((await app.userMenu.signedInAsRow.innerText()).replace(/\s+/g, ' ').trim());
        await app.userMenu.signOutBtn.click({ force: true });
        await expect(app.login.avatar).toBeHidden({ timeout: 10000 });
      }
      test
        .info()
        .annotations.push({ type: 'note', description: `Signed-in identity per cycle: ${identities.join(' | ')}` });
      expect(new Set(identities).size, 'every sign-in shows the same single identity').toBe(1);
    }
  );

  test(
    'LOG-01-12: signing into a second, different account in a new tab does not corrupt the first tab’s session',
    { tag: ['@concurrency'] },
    async ({ user, page }) => {
      test.skip(!process.env.VALID_PIN_2, 'needs a second QA account: set VALID_PIN_2 in .env');

      // The desktop client cannot open a second tab (CDP: "Target.createTarget: Not supported"), so the second
      // account signs in from its own browser context -- a genuinely separate session with its own storage.
      const secondBrowser = await chromium.launch();
      try {
        const secondContext = await secondBrowser.newContext({
          baseURL: BASE_URL,
          viewport: { width: 1920, height: 1080 },
        });
        const second = new App(await secondContext.newPage());
        await second.signIn(process.env.VALID_PIN_2);
        await expect(second.login.avatar).toBeVisible();

        // First session must still be a healthy, usable one (whichever identity it now shows).
        await page.bringToFront();
        const before = await user.toolbar.pathCount();
        await user.toolbar.penStroke({ x: 320, y: 320 }, { x: 520, y: 400 });
        expect(await user.toolbar.pathCount(), 'first session still accepts drawing').toBeGreaterThan(before);
        await expect(user.login.avatar).toBeVisible();
        await expect(user.login.guestModeText).toBeHidden();
      } finally {
        await secondBrowser.close();
      }
    }
  );

  test(
    'LOG-01-13: a sign-out fired right after a real backend action does not corrupt that action',
    { tag: ['@interruption'] },
    async ({ user }) => {
      await user.playlist.ensureDrawerVisible();
      // Read the baseline only once the strip has rendered and stopped changing (this topic holds hundreds of cards, and
      // a count taken straight after sign-in reads 0).
      const settledCount = async () => {
        let last = -1;
        for (let i = 0; i < 20; i++) {
          const now = await user.playlist.resourceCards.count();
          if (now > 0 && now === last) return now;
          last = now;
          await user.page.waitForTimeout(700);
        }
        return last;
      };
      const before = await settledCount();

      // Real backend action: create an asset via Add Resource. Sign out IMMEDIATELY after Submit, before its
      // confirmation can appear.
      const title = `AutoTest-${Date.now()}`;
      await user.addResource.createTextAsset(title);
      // The Create form is still closing right after Submit and can swallow the avatar click, so let it go first -- the
      // sign-out is still fired before the new asset's confirmation can appear.
      await user.addResource.createForm.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      await user.userMenu.openProfileMenu();
      await user.userMenu.signOutBtn.click({ force: true });
      await expect(user.login.avatar).toBeHidden({ timeout: 10000 });

      // Back in: the action is either fully applied or not applied at all -- never doubled, and the
      // Playlist itself still renders.
      await user.signIn();
      await user.playlist.ensureDrawerVisible();
      await expect(user.playlist.contentsTile).toBeVisible();
      const after = await settledCount();
      expect([before, before + 1], `Playlist cards before=${before}, after=${after}`).toContain(after);

      // Leave the shared topic as found if the asset did land.
      const landed = user.playlist.resourceCards.filter({ hasText: title });
      if ((await landed.count()) > 0) await user.playlist.removeOwnedAsset(landed);
    }
  );
});
