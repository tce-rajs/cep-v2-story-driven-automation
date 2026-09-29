// PLR-09 — Run a checkpoint
// Source: CEPV2_Stories/11_Players.md
// Data: 'checkpoints' = Class 8R Mathematics, chapter "Foundation Checkpoint". The resource's status drifts as it is
// tested (CREATED -> PAUSED -> LAUNCHED), so every step reads what is on screen. Launching is irreversible and uses up
// one of the account's checkpoints (owner-approved, 2026-09-26).

const { test, expect } = require('../../fixtures');

test.describe('PLR-09 Run a checkpoint', () => {
  test.use({ classMap: 'checkpoints' });
  test.describe.configure({ timeout: 180000 });

  const checkpointCards = (user) =>
    user.playlist.resourceCards
      .filter({ has: user.page.locator('img.type-icon[src*="heckpoint" i], img.type-icon[src*="assessment" i]') })
      .or(user.playlist.resourceCards.filter({ hasText: /testR-|checkpoint/i }));

  // The known checkpoint named in config/moduleClassMap.js; other cards in the topic sit in other states.
  const target = (user) => user.playlist.resourceCards.filter({ hasText: 'testR-25.08.26' }).first();
  const openFirst = async (user) => {
    await expect(target(user)).toBeAttached({ timeout: 15000 });
    await user.player.openResourceCard(target(user));
    await expect(user.player.checkpointCloseBtn).toBeVisible({ timeout: 20000 });
  };

  /** From whichever state the checkpoint is in, get it to Started. CONFIRMED LIVE (2026-09-26): the timer badge already
   * shows on a merely LAUNCHED checkpoint; Started is when the "End Checkpoint" button (player-checkpoint-end-btn)
   * replaces "Start". */
  const reachStarted = async (user) => {
    const p = user.player;
    if (await p.checkpointEndBtn.isVisible().catch(() => false)) return;
    if (await p.checkpointResumeBtn.isVisible().catch(() => false)) await p.checkpointResumeBtn.click({ force: true });
    if (await p.checkpointModeOnlineBtn.isVisible({ timeout: 3000 }).catch(() => false))
      await p.checkpointModeOnlineBtn.click({ force: true });
    await p.checkpointStartBtn.click({ force: true, timeout: 10000 }).catch(() => {});
    const hide = user.page.getByText('Hide Timer', { exact: true });
    if (await hide.isVisible({ timeout: 3000 }).catch(() => false)) await hide.click({ force: true });
    await expect(p.checkpointEndBtn, 'checkpoint Started ("End Checkpoint" offered)').toBeVisible({ timeout: 20000 });
  };

  test.afterEach(async ({ app }) => {
    await app.player.checkpointCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await app.page.keyboard.press('Escape').catch(() => {});
  });

  test(
    "PLR-09-01: the checkpoint list shows the current topic's checkpoints",
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      expect(await checkpointCards(user).count(), 'at least one checkpoint in this topic').toBeGreaterThan(0);
      const titles = await checkpointCards(user).allInnerTexts();
      titles.forEach((t) => expect(t.trim().length, 'each checkpoint is named').toBeGreaterThan(2));
    }
  );

  test("PLR-09-02: a checkpoint's details show its summary", { tag: ['@functional'] }, async ({ user }) => {
    await openFirst(user);
    const dialog = user.player.checkpointDialog.first();
    await expect(dialog).toBeVisible();
    await expect(dialog, 'summary: questions / duration / concepts').toContainText(/question|min|concept|marks/i);
  });

  // Starting a checkpoint (PLR-09-03) and ending it (PLR-09-05): one test each (split 2026-09-28), in this order -- the
  // checkpoint is real, shared data: PLR-09-03 leaves it Started and PLR-09-05 ends it again.
  test(
    'PLR-09-03: launching and starting a checkpoint moves it to Started, with the student roster shown',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openFirst(user);
      await reachStarted(user);
      await expect(user.player.checkpointStudentRows.first(), 'student roster shown').toBeVisible({ timeout: 15000 });
    }
  );

  test(
    'PLR-09-05: End on a started checkpoint finishes it, and after a reload it is no longer running',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openFirst(user);
      await reachStarted(user); // set-up: from whatever state PLR-09-03 left it in
      // CONFIRMED LIVE (2026-09-26): End -> "N of M students submitted ... Lock the current Test?" (Lock Test) -> "Lock Test?"
      // confirmation (player-checkpoint-confirm-pause-btn). A timer overlay sits over End, so it is clicked in the DOM.
      // The start-up timer overlay (with its Hide Timer link) can appear a few seconds after Start and covers the page.
      const hideTimer = user.page.getByText('Hide Timer', { exact: true });
      if (
        await hideTimer
          .waitFor({ state: 'visible', timeout: 6000 })
          .then(() => true)
          .catch(() => false)
      )
        await hideTimer.click({ force: true });
      await expect(hideTimer).toBeHidden({ timeout: 5000 });
      await user.player.checkpointEndBtn.evaluate((el) => el.click());
      await user.player.checkpointLockTestBtn.click({ force: true, timeout: 10000 });
      const confirm = user.page.getByRole('dialog').getByRole('button', { name: 'Confirm' });
      await expect(confirm).toBeVisible({ timeout: 10000 });
      await expect(async () => {
        await confirm.click({ timeout: 3000 });
        await expect(confirm).toBeHidden({ timeout: 3000 });
      }).toPass({ timeout: 20000 });
      await expect(user.page.getByText(/test paused/i).first(), 'the checkpoint is paused').toBeVisible({
        timeout: 15000,
      });
      await expect(user.player.checkpointCloseBtn, 'the player closes by itself').toBeHidden({ timeout: 30000 });
      // CONFIRMED LIVE (2026-09-26): without a reload the card keeps reading STARTED (still so 30 s later; the app's own
      // message says "Open the Test from Playlist to see Test status"). Record that, then judge the real status after a
      // reload.
      await user.playlist.ensureDrawerVisible();
      const withoutReload = (await target(user).innerText()).replace(/\s+/g, ' ');
      test.info().annotations.push({
        type: 'note',
        description: `Card label right after pausing, no reload: "${withoutReload}"`,
      });
      await user.page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await user.nav.applyClassMap('checkpoints');
      await user.playlist.ensureDrawerVisible();
      await expect(target(user), 'the checkpoint is no longer running after a reload').not.toContainText(/STARTED/, {
        timeout: 20000,
      });
    }
  );

  test(
    'PLR-09-04: a second checkpoint cannot be started in the class while one is already running',
    { tag: ['@negative'] },
    async ({ user }) => {
      const count = await checkpointCards(user).count();
      test.skip(count < 2, `Needs two checkpoints in the topic; this one has ${count}.`);
      await openFirst(user);
      await reachStarted(user);
      await user.player.checkpointCloseBtn.click({ force: true });
      await user.player.openResourceCard(checkpointCards(user).nth(1));
      await expect(user.player.checkpointCloseBtn).toBeVisible({ timeout: 20000 });
      if (await user.player.checkpointModeOnlineBtn.isVisible({ timeout: 3000 }).catch(() => false))
        await user.player.checkpointModeOnlineBtn.click({ force: true });
      if (await user.player.checkpointStartBtn.isVisible({ timeout: 3000 }).catch(() => false))
        await user.player.checkpointStartBtn.click({ force: true });
      await expect(
        user.page.getByText(/already (running|started|in progress)|another checkpoint|one .* at a time/i).first(),
        'refused with a message'
      ).toBeVisible({
        timeout: 15000,
      });
      await expect(user.player.checkpointTimerBadge, 'the second one did not start').toBeHidden();
    }
  );
});
