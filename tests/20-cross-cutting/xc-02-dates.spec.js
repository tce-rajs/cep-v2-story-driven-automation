// XC-02 — Dates and times
// Source: CEPV2_Stories/20_CrossCutting.md
// Runs in the desktop client. A different date or time is shown to the teach page with Playwright's clock (the page's
// own Date and timers; the server keeps the real time). The clock stays on the window, so every test that sets it
// closes the worker's client at the end and the next test starts a fresh one.
// XC-02-02 needs the real midnight: it runs only when started between 23:50 and 23:57 (it submits today's attendance
// for the 'attendance' class, as the Attendance tests do every run). XC-02-03 stops the homework at Send: every request
// it would send is captured and cancelled, so nothing is assigned. Writing: fresh space only, nothing erased.

const { test, expect } = require('../../fixtures');
const { allStrokes, writeStrokes, restartClient } = require('../18-resilience/resilience-lib');
const { waitForAutosave } = require('../00-flows/flow-helpers');
const { pinForModule } = require('../../config/moduleClassMap');

const dayLabel = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** A clean client for the next test (the clock cannot be taken off a window). */
const dropClock = (workerApp) => workerApp.app.close().catch(() => {});

test.describe('XC-02 Dates and times', () => {
  test.describe.configure({ timeout: 300000 });

  test(
    'XC-02-01: the header date changes at midnight while the app is open',
    { tag: ['@edge'] },
    async ({ app, page, workerApp }) => {
      try {
        const now = new Date();
        const late = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 30);
        await page.clock.install({ time: late });
        await expect
          .poll(async () => (await app.header.readDateTime()).shownDate, { message: 'set-up: today in the header' })
          .toBe(dayLabel(late));
        await page.clock.runFor(60000); // past midnight, with the app open
        const tomorrow = new Date(late.getTime() + 60000);
        await expect
          .poll(async () => (await app.header.readDateTime()).shownDate, {
            message: 'the header shows the new day',
            timeout: 30000,
          })
          .toBe(dayLabel(tomorrow));
      } finally {
        await dropClock(workerApp);
      }
    }
  );

  test.describe('at the real midnight', () => {
    test.use({ classMap: 'attendance' });

    test(
      'XC-02-02: attendance taken just before midnight is recorded for that day, and the register shows Pending again after midnight',
      { tag: ['@edge', '@long'] },
      async ({ user, page }) => {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        test.skip(
          minutes < 23 * 60 + 50 || minutes > 23 * 60 + 57,
          'needs the real midnight: start between 23:50 and 23:57'
        );
        test.setTimeout(20 * 60 * 1000);
        const att = user.attendance;
        await att.recordAttendance(user.magnet, [2, 4]);
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 30);
        await page.waitForTimeout(Math.max(0, midnight - Date.now()));
        await page.reload();
        await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 }).catch(async () => {
          await user.signIn(pinForModule('attendance'));
          await user.nav.applyClassMap('attendance');
        });
        await user.magnet.open();
        await expect(user.magnet.attendanceItem, 'Pending again on the new day').toContainText(/pending/i, {
          timeout: 15000,
        });
        await page.keyboard.press('Escape');
        // Yesterday (the day before midnight) holds the attendance taken just before it.
        await att.open(user.magnet);
        await att.prevDayBtn.click({ force: true });
        await expect
          .poll(() => att.absentRolls(), { message: 'recorded for that day', timeout: 20000 })
          .toEqual([2, 4]);
        await att.closeAll();
      }
    );
  });

  test.describe('homework at the end of a month', () => {
    test.use({ classMap: 'aiHomework' });

    test(
      'XC-02-03: homework set on the last day of a month with "Due in 3 days" gets the right date in the next month',
      { tag: ['@edge'] },
      async ({ user, page, workerApp }) => {
        const hw = user.aiHomework;
        const sent = [];
        const capture = (route) => {
          const r = route.request();
          if (['POST', 'PUT', 'PATCH'].includes(r.method()) && ['fetch', 'xhr'].includes(r.resourceType())) {
            sent.push(r.postData() || '');
            return route.abort('failed');
          }
          return route.continue();
        };
        try {
          await hw.open(user.magnet);
          await hw.setHomeworkCount(5);
          await hw.generate();
          await hw.goToAssign();
          // The last day of this month, 10:00.
          const now = new Date();
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 10, 0, 0);
          await page.clock.install({ time: monthEnd });
          const last = (await hw.assignDueOptions.count()) - 1;
          await expect(hw.assignDueOption(last), 'set-up: the 3-day option').toContainText(/3\s*day/i);
          await hw.assignDueOption(last).click();
          await hw.hideKeyboard();
          // From here every request the page sends is captured and cancelled: nothing is assigned.
          await page.route('**/*', capture);
          await hw.assignSendBtn.click({ force: true });
          await expect
            .poll(() => sent.length, { message: 'set-up: the homework was about to be sent' })
            .toBeGreaterThan(0);
          const due = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + 3);
          const sameDay = (v) => {
            const d = typeof v === 'number' && v > 1e12 ? new Date(v) : typeof v === 'string' ? new Date(v) : null;
            return !!d && !Number.isNaN(d.getTime()) && d.toDateString() === due.toDateString();
          };
          const values = [];
          for (const body of sent)
            try {
              JSON.parse(body, (k, v) => {
                values.push(v);
                return v;
              });
            } catch {
              values.push(...body.split(/[&=,"]/));
            }
          test
            .info()
            .annotations.push({ type: 'note', description: `Sent: ${sent.map((s) => s.slice(0, 400)).join(' | ')}` });
          expect(values.some(sameDay), `the due date is ${due.toDateString()}`).toBe(true);
        } finally {
          await page.unroute('**/*', capture).catch(() => {});
          await dropClock(workerApp);
        }
      }
    );
  });

  test(
    'XC-02-04: a computer clock 1 hour or 1 day wrong does not stop sign-in, token renewal or autosave',
    { tag: ['@negative', '@long'] },
    async ({ app, page, workerApp }) => {
      test.setTimeout(30 * 60 * 1000);
      const results = {};
      let ui = app;
      let win = page;
      try {
        for (const [label, offset] of [
          ['1 hour ahead', 3600e3],
          ['1 day ahead', 86400e3],
        ]) {
          await win.clock.install({ time: new Date(Date.now() + offset) });
          await ui.signIn();
          await ui.nav.applyClassMap('default');
          await ui.content.startOnFreshSpace();
          await writeStrokes(ui, 1);
          const firstSave = await waitForAutosave(ui, 60000)
            .then(() => true)
            .catch(() => false);
          // Through the token renewal (checked at minute 4), writing now and then.
          for (let i = 0; i < 6; i++) {
            await win.waitForTimeout(60000);
            if (!(await ui.login.avatar.isVisible().catch(() => false))) break;
            await writeStrokes(ui, 1, { x: 220 + i * 50, y: 380 });
          }
          const stillSignedIn = await ui.login.avatar.isVisible().catch(() => false);
          const laterSave = stillSignedIn
            ? await waitForAutosave(ui, 60000)
                .then(() => true)
                .catch(() => false)
            : false;
          results[label] = { firstSave, stillSignedIn, laterSave, strokes: (await allStrokes(ui)).length > 0 };
          ui = await restartClient(workerApp); // a clean client (and clock) for the next case
          win = ui.page;
        }
      } finally {
        test.info().annotations.push({ type: 'note', description: JSON.stringify(results) });
      }
      for (const label of Object.keys(results))
        expect.soft(results[label], `clock ${label}: signed in, renewed and saving`).toMatchObject({
          firstSave: true,
          stillSignedIn: true,
          laterSave: true,
        });
    }
  );

  test.describe('Whiteboard History', () => {
    test.use({ freshSpace: true });

    test('XC-02-05: Whiteboard History times match the real save times', { tag: ['@edge'] }, async ({ user }) => {
      await writeStrokes(user, 1);
      await waitForAutosave(user);
      const savedAt = new Date();
      await user.userMenu.openProfileMenu();
      await user.userMenu.wbHistoryBtn.click({ force: true });
      const rows = await user.userMenu.wbHistoryRows();
      await user.userMenu.wbHistoryPanel
        .getByText('✕', { exact: true })
        .first()
        .click({ force: true })
        .catch(() => {});
      expect(rows.length, 'set-up: History lists the versions').toBeGreaterThan(0);
      // "11:00:25 07/10" -> a date this year.
      const [time, date] = rows[0].time.split(' ');
      const [h, m, s] = time.split(':').map(Number);
      const [d, mo] = date.split('/').map(Number);
      const shown = new Date(savedAt.getFullYear(), mo - 1, d, h, m, s);
      test.info().annotations.push({
        type: 'note',
        description: `Newest version ${rows[0].time}; saved at ${savedAt.toTimeString().slice(0, 8)}.`,
      });
      expect(
        Math.abs(shown - savedAt) / 1000,
        'the newest version’s time is the save time (within a minute)'
      ).toBeLessThanOrEqual(60);
    });
  });
});
