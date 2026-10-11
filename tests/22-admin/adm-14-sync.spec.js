// ADM-14 — Sync status (Admin panel) — the owner's core flow: press Sync and watch it to the end.
// Source: CEPV2_Stories/22_Admin.md
//
// Sync is pressed once per run (ADM-14-04); the later cases read what was watched (saved in the state file). Every
// part must end "completed", none may fail, none may run longer than 10 minutes.
const {
  test,
  expect,
  AdminPage,
  state,
  runSync,
  isDone,
  isFailed,
  openTeach,
  passwordSignIn,
} = require('./admin-helpers');

const KEY = 'adm-sync';
const TEACHER = 'adm-teacher';

test.describe('ADM-14 Sync status', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-14-01: View Sync Status lists every sync part with its status',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      // First test of the run: forget an earlier run's sync.
      state.reset(KEY);
      await admin.openSchoolList();
      const rows = await admin.syncStatus();
      expect(rows.length).toBeGreaterThan(1);
      for (const [part, status] of rows) {
        expect(part, 'part name').toMatch(/\S/);
        expect(status, `${part}: status`).toMatch(/\S/);
      }
      expect(rows.map((r) => r[0])).toContain('overall');
    }
  );

  test('ADM-14-02: Refresh in View Sync Status reloads the statuses', { tag: ['@functional'] }, async ({ admin }) => {
    await admin.openSchoolList();
    await admin.syncStatus();
    const reload = admin.page.waitForResponse((r) => /sync/i.test(r.url()) && r.request().method() === 'GET', {
      timeout: 15000,
    });
    await admin.modal
      .getByText(/Refresh/)
      .first()
      .click();
    const response = await reload;
    expect(response.ok(), `status reload answered ${response.status()}`).toBe(true);
    await admin.page.waitForTimeout(1000);
    expect((await admin.tableRows(admin.modal)).length).toBeGreaterThan(1);
  });

  test(
    'ADM-14-03: the school list shows a Last Sync On date and time that is not in the future',
    { tag: ['@functional'] },
    async ({ admin }) => {
      const shown = await admin.lastSyncOn();
      const when = AdminPage.parseSyncDate(shown);
      expect(when, `Last Sync On "${shown}"`).not.toBeNull();
      expect(when.getTime(), `Last Sync On "${shown}" is not in the future`).toBeLessThanOrEqual(Date.now() + 60000);
    }
  );

  test('ADM-14-04: Sync updates Last Sync On', { tag: ['@smoke', '@functional'] }, async ({ admin }) => {
    test.setTimeout(16 * 60000);
    const s = await runSync(admin, KEY);
    const before = AdminPage.parseSyncDate(s.lastBefore);
    const after = AdminPage.parseSyncDate(s.lastAfter);
    expect(after, `Last Sync On after Sync: "${s.lastAfter}"`).not.toBeNull();
    expect(after.getTime(), `Last Sync On "${s.lastBefore}" → "${s.lastAfter}"`).toBeGreaterThan(before.getTime());
    expect(after.getTime()).toBeGreaterThanOrEqual(s.startedAt - 120000);
  });

  test(
    'ADM-14-05: after Sync every part in View Sync Status ends as completed',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      test.setTimeout(16 * 60000);
      const s = await runSync(admin, KEY);
      const notDone = s.final.filter(([, st]) => !isDone(st)).map(([p, st]) => `${p}: ${st}`);
      expect(s.final.length).toBeGreaterThan(1);
      expect(notDone, `after ${s.minutes} min`).toEqual([]);
    }
  );

  test('ADM-14-06: after Sync no part shows Failed or an error', { tag: ['@negative'] }, async ({ admin }) => {
    test.setTimeout(16 * 60000);
    const s = await runSync(admin, KEY);
    const failed = s.snapshots.flatMap((snap) =>
      snap.rows.filter(([, st]) => isFailed(st)).map(([p, st]) => `${p}: ${st} at ${snap.seconds}s`)
    );
    expect(failed).toEqual([]);
  });

  test(
    'ADM-14-07: no part stays in progress for more than 10 minutes after Sync (sync stopped midway)',
    { tag: ['@negative'] },
    async ({ admin }) => {
      test.setTimeout(16 * 60000);
      const s = await runSync(admin, KEY);
      const long = Object.entries(s.busyMs)
        .filter(([, ms]) => ms > 10 * 60000)
        .map(([p, ms]) => `${p}: ${Math.round(ms / 60000)} min`);
      const stillRunning = s.final.filter(([, st]) => !isDone(st) && !isFailed(st)).map(([p, st]) => `${p}: ${st}`);
      expect(long, 'parts running longer than 10 minutes').toEqual([]);
      expect(stillRunning, `parts still running after ${s.minutes} min`).toEqual([]);
    }
  );

  test(
    'ADM-14-08: the overall status matches the parts (completed only when every part is completed)',
    { tag: ['@functional'] },
    async ({ admin }) => {
      test.setTimeout(16 * 60000);
      const s = await runSync(admin, KEY);
      const wrong = s.snapshots
        .filter((snap) => {
          const overall = snap.rows.find(([p]) => p === 'overall');
          const parts = snap.rows.filter(([p]) => p !== 'overall');
          return overall && isDone(overall[1]) !== parts.every(([, st]) => isDone(st));
        })
        .map((snap) => `${snap.seconds}s: ${snap.rows.map((r) => r.join('=')).join(', ')}`);
      expect(wrong).toEqual([]);
    }
  );

  test(
    'ADM-14-09: a teacher created in Admin can sign in on the panel after the Sync completes',
    { tag: ['@functional'] },
    async ({ admin, browser }) => {
      test.setTimeout(16 * 60000);
      const s = await runSync(admin, KEY);
      expect(
        s.final.every(([, st]) => isDone(st)),
        'the Sync completed'
      ).toBe(true);
      const d = state.teacher(TEACHER);
      if (!d.password)
        throw new Error('DATA MISSING ON THIS SERVER: the AutoQA teacher has no password set (ADM-10-14 failed)');
      const t = await openTeach(browser);
      try {
        const o = await passwordSignIn(t, d.username, d.password);
        expect(['signed-in', 'set-pin'], `sign-in after Sync: ${o.message}`).toContain(o.screen);
      } finally {
        await t.context.close();
      }
    }
  );
});
