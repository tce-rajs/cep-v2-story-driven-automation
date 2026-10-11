// ATT-02 — Mark students present or absent
// Source: CEPV2_Stories/16_Attendance.md
// These tests mark but do not submit; each ends by closing the register (confirming the discard if asked).

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'attendance' });

test.describe('ATT-02 Mark students present or absent', () => {
  test.beforeEach(async ({ user }) => {
    await user.attendance.open(user.magnet);
    await user.attendance.startMarking();
  });

  test.afterEach(async ({ app }) => {
    await app.attendance.closeAll();
  });

  // Tapping a present student marks them absent (ATT-02-01); tapping again marks them present (ATT-02-06) -- one test
  // each.
  test(
    'ATT-02-01: tapping a present student marks them absent',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.markAllPresent();
      await expect.poll(() => att.cellState(0), { message: 'set-up: present' }).toBe('present');
      await att.tap(0);
      await expect.poll(() => att.cellState(0), { message: 'tap marks absent' }).toBe('absent');
    }
  );

  test('ATT-02-06: tapping an absent student marks them present again', { tag: ['@functional'] }, async ({ user }) => {
    const att = user.attendance;
    await att.markAllPresent();
    await att.tap(0);
    await expect.poll(() => att.cellState(0), { message: 'set-up: absent' }).toBe('absent');
    await att.tap(0);
    await expect.poll(() => att.cellState(0), { message: 'tap again marks present' }).toBe('present');
  });

  test('ATT-02-02: Mark All Present marks every student present', { tag: ['@functional'] }, async ({ user }) => {
    const att = user.attendance;
    await att.markAllPresent();
    await expect
      .poll(async () => (await att.gridCounts()).present, { message: 'every cell present' })
      .toBe(await att.cells.count());
  });

  test(
    'ATT-02-03: dragging a finger across the roll numbers marks every student dragged over as present',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { TouchInput } = require('../../pages/touch-input');
      const touch = new TouchInput(user.page);
      const att = user.attendance;
      try {
        const n = Math.min(8, await att.cells.count());
        const first = await att.cells.first().boundingBox();
        const last = await att.cells.nth(n - 1).boundingBox();
        const pts = Array.from({ length: 31 }, (_, i) => ({
          x: first.x + first.width / 2 + ((last.x - first.x) * i) / 30,
          y: first.y + first.height / 2 + ((last.y - first.y) * i) / 30,
        }));
        await touch.fingerStroke(pts, 25);
        await user.page.waitForTimeout(1500);
        const states = await Promise.all(Array.from({ length: n }, (_, i) => att.cellState(i)));
        expect(states, 'every student the finger passed over is present').toEqual(Array(n).fill('present'));
      } finally {
        await touch.dispose();
      }
    }
  );

  test(
    "ATT-02-04: the summary's present and absent counts match the roster marks",
    { tag: ['@functional'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.markAllPresent();
      for (const i of [1, 4, 9]) await att.tap(i);
      const grid = await att.gridCounts();
      const s = await att.summary();
      expect(s.boys.p + s.girls.p, `present in summary (${s.text})`).toBe(grid.present);
      expect(s.boys.ab + s.girls.ab, 'absent in summary').toBe(grid.absent);
      expect(s.boys.t + s.girls.t, 'boys + girls = roster').toBe(grid.total);
    }
  );

  // Marking every student absent: the register accepts it (ATT-02-05), and the summary shows it (ATT-02-07) -- one test
  // each.
  /** Mark everyone present, then tap each student once; returns how many students there are. */
  const markEveryoneAbsent = async (att) => {
    await att.markAllPresent();
    const total = await att.cells.count();
    for (let i = 0; i < total; i++) await att.cells.nth(i).click({ force: true });
    return total;
  };

  test('ATT-02-05: every student can be marked absent', { tag: ['@edge'] }, async ({ user }) => {
    test.setTimeout(240000);
    const att = user.attendance;
    const total = await markEveryoneAbsent(att);
    await expect.poll(async () => (await att.gridCounts()).absent, { timeout: 15000 }).toBe(total);
  });

  test(
    'ATT-02-07: with every student marked absent, the summary shows nobody present',
    { tag: ['@edge'] },
    async ({ user }) => {
      test.setTimeout(240000);
      const att = user.attendance;
      const total = await markEveryoneAbsent(att);
      await expect
        .poll(async () => (await att.gridCounts()).absent, { message: 'set-up: all absent', timeout: 15000 })
        .toBe(total);
      const s = await att.summary();
      expect(s.boys.p + s.girls.p, 'nobody present').toBe(0);
      expect(s.boys.ab + s.girls.ab, 'everyone absent').toBe(total);
    }
  );

  test(
    'ATT-02-08: tapping the same student twice brings them back to their first state',
    { tag: ['@negative'] },
    async ({ user }) => {
      const att = user.attendance;
      await att.markAllPresent();
      await expect.poll(() => att.cellState(1), { message: 'set-up: present' }).toBe('present');
      const others = async () => (await att.gridCounts()).present;
      const presentBefore = await others();
      await att.tap(1);
      await att.tap(1);
      await expect.poll(() => att.cellState(1), { message: 'back to present' }).toBe('present');
      expect(await others(), 'nobody else changed').toBe(presentBefore);
    }
  );
});
