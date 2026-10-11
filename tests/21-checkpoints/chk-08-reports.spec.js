// CHK-08 — Principal reports are complete and correct
// Source: CEPV2_Stories/21_Checkpoints.md
// Runs in the browser with the principal account (PRINCIPAL_PIN) on Plan Mode -> Reports & Analytics. The teacher
// comparison reads the paused summary of the class map's checkpoint (Class 10A Science, "Test - 3") with the main
// account and never resumes, starts or ends it.

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { test, expect } = require('../../fixtures');
const { App } = require('../../pages/app');
const { BASE_URL } = require('../../config/env');
const { BROWSER_ONLY, CP, GRADE, DIVISION, openCheckpoint } = require('./chk-helpers');

const TABS = ['Principal Dashboard', 'School Usage', 'Content Statistics', 'Assessment for Learning'];
const BAD_TEXT = /\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]|\{\{/;
const BANDS = [
  ['Needs Support', 0, 40],
  ['Developing', 41, 65],
  ['Proficient', 66, 80],
  ['Advanced', 81, 100],
];

const evidence = (name) => path.join(__dirname, '..', '..', 'evidence', 'issues', `reports-${name}.png`);
const flat = (s) => s.replace(/\s+/g, ' ');

/** Sign in as the principal and open Plan Mode. */
async function openPlanAsPrincipal(app) {
  await app.guest.open();
  await app.signIn(process.env.PRINCIPAL_PIN);
  const { switched } = await app.compass.switchToPlanningMode();
  expect(switched, 'set-up: Plan Mode opened').toBe(true);
  await app.page.waitForTimeout(4000);
}

/** The text of the open report area (the page body, whitespace collapsed). */
const bodyText = async (page) => flat(await page.locator('body').innerText());

/** The Principal Dashboard totals line as numbers. */
async function dashTotals(page) {
  const m = (await bodyText(page)).match(
    /Total users: (\d+) Eligible users: (\d+) Current users: (\d+) Installed Classrooms: (\d+) Current Classrooms: (\d+)/
  );
  if (!m) return null;
  const [total, eligible, current, installed, currentRooms] = m.slice(1).map(Number);
  return { total, eligible, current, installed, currentRooms };
}

/** The names in the dashboard's timeline (the rows before the hour axis). */
async function timelineRows(page) {
  const text = await page.locator('body').innerText();
  const block = text.split(/Current (?:Users|Rooms)\s*All (?:Users|Rooms)/)[1] || '';
  return block
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((_, i, all) => i < all.findIndex((s) => /^\d\d:\d\d [AP]M$/.test(s)));
}

/** Wait for a download started by `trigger`; returns { name, file, size } or null. */
async function catchDownload(page, trigger, timeout = 30000) {
  const pending = page.waitForEvent('download', { timeout }).catch(() => null);
  await trigger();
  const download = await pending;
  if (!download) return null;
  const file = test.info().outputPath(download.suggestedFilename());
  await download.saveAs(file);
  return { name: download.suggestedFilename(), file, size: fs.statSync(file).size };
}

/** Assessment for Learning -> Baseline -> Class 10 / Division A / Science, optionally an assessment. */
async function openAfl(app, assessment) {
  await openPlanAsPrincipal(app);
  await app.plan.openReport('Assessment for Learning');
  await app.plan.aflBaselineBtn.click();
  await app.page.waitForTimeout(3000);
  await app.plan.choose(app.plan.aflGradeSelect, GRADE);
  await app.plan.choose(app.plan.aflClassSelect, DIVISION);
  await app.plan.choose(app.plan.aflSubjectSelect, CP.subject);
  await app.page.waitForTimeout(2000);
  if (assessment) {
    await app.plan.aflAssessmentSelect.selectOption({ label: assessment });
    await expect(app.page.getByText('OVERALL MASTERY').first()).toBeVisible({ timeout: 20000 });
    await app.page.waitForTimeout(3000);
  }
}

/** The report's numbers: learners, overall %, on track, need support, band counts and the listed students. */
async function aflNumbers(page) {
  const t = await bodyText(page);
  const num = (re) => Number((t.match(re) || [])[1] ?? NaN);
  const students = [...t.matchAll(/\b[A-Z]{2} ([A-Z][\w.'-]*(?: [A-Z][\w.'-]*)*) Section \w+ (\d+)%/g)].map((m) => ({
    name: m[1],
    pct: Number(m[2]),
  }));
  const bands = Object.fromEntries(BANDS.map(([b]) => [b, num(new RegExp(`${b} \\d+–\\d+% (\\d+)`))]));
  return {
    learners: num(/(\d+) (?:total )?learners/),
    overall: num(/OVERALL MASTERY \w+ (\d+) %/),
    onTrack: num(/LEARNERS ON TRACK (\d+)/),
    needSupport: num(/NEED SUPPORT (\d+)/),
    bands,
    students,
  };
}

/** The teacher's paused summary of a checkpoint: { attempted, avg, concepts: { name: % } }. Read only, then closed. */
async function teacherConcepts(app, title) {
  const card = app.playlist.resourceCards.filter({ hasText: title }).first();
  await expect(card, `set-up: "${title}" is in the Playlist`).toBeAttached({ timeout: 20000 });
  await app.player.openResourceCard(card);
  const p = app.player;
  await expect(p.checkpointTimerBadge.or(p.checkpointResumeBtn).or(p.checkpointModeOnlineBtn).first()).toBeVisible({
    timeout: 20000,
  });
  await expect(app.page.getByText('Concept Mastery Breakdown').first()).toBeVisible({ timeout: 20000 });
  await app.page.waitForTimeout(2000);
  const t = await bodyText(app.page);
  await p.checkpointCloseBtn.click({ force: true, timeout: 5000 }).catch(() => {});
  const section = (t.match(/Concept Mastery Breakdown AVG\. SCORE: \d+% (.*?) Needs Attention/) || [])[1] || '';
  const concepts = Object.fromEntries(
    [...section.matchAll(/(.+?) \d+ STUDENTS MASTERED (\d+)%\s*/g)].map((m) => [m[1].trim(), Number(m[2])])
  );
  return {
    attempted: Number((t.match(/ATTEMPTED (\d+) \/ \d+ Students/) || [])[1] ?? NaN),
    avg: Number((t.match(/AVG\. SCORE: (\d+)%/) || [])[1] ?? NaN),
    concepts,
  };
}

/** The principal's concept mastery list of the open report: { name: % }. */
async function principalConcepts(page) {
  const t = await bodyText(page);
  const section = (t.match(/CONCEPT MASTERY BELOW 40% (.*?) Students Grouped/) || [])[1] || '';
  return Object.fromEntries(
    [...section.matchAll(/▶ (.+?) (\d+)% \d+ \/ \d+ students below 40%/g)].map((m) => [m[1].trim(), Number(m[2])])
  );
}

test.describe('CHK-08 Principal reports are complete and correct', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.describe.configure({ timeout: 240000 });

  // ---------------------------------------------------------------- every tab
  test(
    'CHK-08-01: every Reports & Analytics tab opens with its content and no undefined, null or NaN text',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      const expected = {
        'Principal Dashboard': 'Realtime usage data',
        'School Usage': 'School Usage Data',
        'Content Statistics': 'TP Count (Expected)',
        'Assessment for Learning': 'ASSESSMENTS',
      };
      const problems = [];
      for (const tab of TABS) {
        await app.plan.openReport(tab);
        await app.page.waitForTimeout(3000);
        await expect(app.page.getByText(expected[tab]).first(), `${tab} content`).toBeVisible({ timeout: 20000 });
        const bad = (await bodyText(app.page)).match(BAD_TEXT);
        if (bad) problems.push(`${tab}: "${bad[0]}"`);
      }
      expect(problems, 'tabs showing placeholder text').toEqual([]);
    }
  );

  test(
    'CHK-08-02: switching between the report tabs and back shows each tab’s own content',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      for (const [tab, marker] of [
        ['Assessment for Learning', 'ASSESSMENTS'],
        ['Principal Dashboard', 'Realtime usage data'],
        ['Content Statistics', 'TP Count (Expected)'],
        ['School Usage', 'School Usage Data'],
        ['Assessment for Learning', 'ASSESSMENTS'],
      ]) {
        await app.plan.openReport(tab);
        await expect(app.page.getByText(marker).first(), `${tab} after switching`).toBeVisible({ timeout: 20000 });
      }
    }
  );

  test(
    'CHK-08-03: reloading the browser on the reports keeps Reports & Analytics available',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('School Usage');
      await app.page.reload();
      await app.page.waitForTimeout(6000);
      await expect(app.plan.reportsLink.first(), 'Reports & Analytics after reload').toBeAttached({ timeout: 30000 });
      await app.plan.openReport('Content Statistics');
      await expect(app.page.getByText('TP Count (Expected)').first()).toBeVisible({ timeout: 20000 });
    }
  );

  test(
    'CHK-08-33: a tab chosen while the dashboard is still loading shows its own content',
    { tag: ['@regression'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.reportsLink.first().click({ force: true });
      await app.plan.reportTab('School Usage').waitFor({ timeout: 20000 });
      await app.plan.reportTab('School Usage').click();
      await app.page.waitForTimeout(15000);
      const active = (await app.page.locator('.reportmenutab.active').innerText()).trim();
      const showsUsage = await app.page.getByText('School Usage Data').first().isVisible();
      if (active === 'School Usage' && !showsUsage)
        await app.page.screenshot({ path: evidence('school-usage-tab-shows-dashboard') });
      expect({ active, showsUsage }, 'the highlighted tab and the content agree').toEqual({
        active: 'School Usage',
        showsUsage: true,
      });
    }
  );

  // ---------------------------------------------------------------- Principal Dashboard
  test(
    'CHK-08-04: the dashboard totals agree (current ≤ total, Current Users rows = current users)',
    { tag: ['@regression'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(4000);
      const t = await dashTotals(app.page);
      expect(t, 'totals line').not.toBeNull();
      expect(t.current, 'current users ≤ total users').toBeLessThanOrEqual(t.total);
      expect(t.currentRooms, 'current classrooms ≤ installed classrooms').toBeLessThanOrEqual(t.installed);
      await app.plan.dashToggle('Current Users').click();
      await app.page.waitForTimeout(2000);
      const rows = await timelineRows(app.page);
      expect(rows.length, `Current Users rows: ${rows.join(', ')}`).toBe(t.current);
    }
  );

  test('CHK-08-05: All Users lists every user of the school', { tag: ['@regression'] }, async ({ app }) => {
    await openPlanAsPrincipal(app);
    await app.plan.openReport('Principal Dashboard');
    await app.page.waitForTimeout(4000);
    const t = await dashTotals(app.page);
    await app.plan.dashToggle('All Users').click();
    await app.page.waitForTimeout(3000);
    const rows = await timelineRows(app.page);
    expect(rows.length, `All Users rows: ${rows.join(', ')}`).toBe(t.total);
    expect(
      rows.filter((r) => /^-?$/.test(r)),
      'rows without a name'
    ).toEqual([]);
  });

  test(
    'CHK-08-06: Classroom wise lists the installed classrooms with their names',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(4000);
      const t = await dashTotals(app.page);
      await app.plan.dashToggle('Classroom wise').click();
      await app.page.waitForTimeout(3000);
      await app.plan.dashToggle('All Rooms').click();
      await app.page.waitForTimeout(2000);
      const rooms = await timelineRows(app.page);
      expect(rooms.length, `rooms: ${rooms.join(', ')}`).toBe(t.installed);
      for (const r of rooms) expect(r, 'room shown as "name - IP"').toMatch(/\S+ - \d+\.\d+\.\d+\.\d+/);
    }
  );

  test(
    'CHK-08-07: Download Report downloads the day’s usage workbook listing every user',
    { tag: ['@regression'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(4000);
      const t = await dashTotals(app.page);
      const date = (await app.plan.dashDateInput.inputValue()).replace(/\//g, '-');
      const dl = await catchDownload(app.page, () => app.plan.dashDownloadBtn.click());
      expect(dl, 'a file is downloaded').not.toBeNull();
      expect(dl.name, 'file name carries the date').toBe(`UsageReport-${date}.xlsx`);
      expect(dl.size, 'file size').toBeGreaterThan(0);
      const wb = XLSX.readFile(dl.file);
      expect(wb.SheetNames, 'sheets').toEqual(
        expect.arrayContaining(['School', 'User Summary', 'Terminal Summary', 'Usage Details'])
      );
      const users = XLSX.utils.sheet_to_json(wb.Sheets['User Summary'], { header: 1 }).slice(1);
      expect(users.length, 'one User Summary row per user').toBe(t.total);
      const terminals = XLSX.utils.sheet_to_json(wb.Sheets['Terminal Summary'], { header: 1 }).slice(1);
      expect(terminals.length, 'one Terminal Summary row per installed classroom').toBe(t.installed);
    }
  );

  test(
    'CHK-08-08: the downloaded usage workbook shows clean user names and complete school details',
    { tag: ['@regression'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(4000);
      const dl = await catchDownload(app.page, () => app.plan.dashDownloadBtn.click());
      expect(dl, 'a file is downloaded').not.toBeNull();
      const wb = XLSX.readFile(dl.file);
      const known = XLSX.utils
        .sheet_to_json(wb.Sheets['User Summary'], { header: 1 })
        .slice(1)
        .map((r) => r[0]);
      const detailNames = [
        ...new Set(
          XLSX.utils
            .sheet_to_json(wb.Sheets['Usage Details'], { header: 1 })
            .slice(1)
            .map((r) => r[0])
            .filter(Boolean)
        ),
      ];
      expect(
        detailNames.filter((n) => !known.includes(n)),
        'Usage Details names that are not a user'
      ).toEqual([]);
      const [header, row] = XLSX.utils.sheet_to_json(wb.Sheets.School, { header: 1 });
      const missing = header.filter((h, i) => row[i] === undefined || row[i] === null || row[i] === '');
      expect(missing, 'School sheet columns without a value').toEqual([]);
    }
  );

  test(
    'CHK-08-09: Negative: Export Usage Report without dates is refused with a message',
    { tag: ['@negative'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(3000);
      await app.plan.openExportForm();
      await expect(app.plan.exportDateInputs).toHaveCount(2);
      await app.plan.exportGoAheadBtn.click();
      await app.page.waitForTimeout(3000);
      if (!(await app.plan.exportDateInputs.first().isVisible())) {
        // The export went ahead: let it finish so the result it gives is on screen.
        await app.page
          .getByText(/available for download|Exported Successfully/)
          .first()
          .waitFor({ timeout: 120000 })
          .catch(() => {});
        await app.page.screenshot({ path: evidence('export-without-dates-nan') });
      }
      expect(await bodyText(app.page), 'no report is made from empty dates').not.toMatch(
        /NaN|Exported Successfully|Generating Report/
      );
      await expect(app.plan.exportDateInputs.first(), 'the date form stays open').toBeVisible();
    }
  );

  test(
    'CHK-08-10: Cancel on the Export Report dialog closes it without exporting',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(3000);
      await app.plan.openExportForm();
      await app.plan.exportCancelBtn.click();
      await expect(app.plan.exportDialogTitle).toHaveCount(0, { timeout: 5000 });
    }
  );

  test(
    'CHK-08-11: Export Usage Report for a date range offers the report to download',
    { tag: ['@regression'] },
    async ({ app }) => {
      test.setTimeout(300000);
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(3000);
      await app.plan.openExportForm();
      await app.plan.exportDateInputs.nth(0).fill('2026-10-01');
      await app.plan.exportDateInputs.nth(1).fill('2026-10-07');
      const done = app.page.getByText(/Exported Successfully|available for download/).first();
      let autoDownload = null;
      app.page.once('download', (d) => (autoDownload = d));
      await app.plan.exportGoAheadBtn.click();
      await expect(done, 'the report is made').toBeVisible({ timeout: 180000 });
      await app.page.waitForTimeout(5000);
      let dl = null;
      if (autoDownload) {
        const file = test.info().outputPath(autoDownload.suggestedFilename());
        await autoDownload.saveAs(file);
        dl = { name: autoDownload.suggestedFilename(), file, size: fs.statSync(file).size };
      } else {
        // No file came with the success message: the report is offered when the dialog is opened again.
        await app.plan.closeExportDialog();
        await app.plan.exportUsageBtn.click();
        const offer = app.page.getByText(/report-.*\.xlsx.*available for download/);
        const visible = await offer
          .waitFor({ timeout: 30000 })
          .then(() => true)
          .catch(() => false);
        if (!visible) await app.page.screenshot({ path: evidence('export-success-no-download') });
        expect(visible, 'the exported report is offered for download').toBe(true);
        expect(await offer.innerText(), 'file name carries the dates').toMatch(/2026.*2026/);
        dl = await catchDownload(app.page, () =>
          app.page.getByText('Download', { exact: true }).filter({ visible: true }).last().click()
        );
      }
      expect(dl, 'a file is downloaded').not.toBeNull();
      expect(dl.size).toBeGreaterThan(0);
      expect(XLSX.readFile(dl.file).SheetNames.length, 'the workbook has sheets').toBeGreaterThan(0);
    }
  );

  test(
    'CHK-08-12: choosing a past date on the dashboard loads that day’s usage',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(4000);
      await app.plan.dashDateInput.click({ force: true });
      await expect(app.plan.dashCalendar, 'a calendar opens').toBeVisible({ timeout: 5000 });
      await app.plan.dashPrevMonth.click();
      await app.page.waitForTimeout(800);
      // 29 September had classroom use (School Usage's daily trend).
      const request = app.page.waitForRequest(/usage\/report\/principal\/.*selectedDate=29-09-2026/, {
        timeout: 20000,
      });
      await app.plan.dashCalendar.getByText('29', { exact: true }).last().click();
      await request;
      await app.page.waitForTimeout(5000);
      await expect(app.plan.dashDateInput).toHaveValue('29/09/2026');
      expect(await dashTotals(app.page), 'totals for the chosen day').not.toBeNull();
      expect(await bodyText(app.page)).not.toMatch(BAD_TEXT);
    }
  );

  test(
    'CHK-08-13: Negative: a future date cannot be chosen on the dashboard',
    { tag: ['@negative'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(4000);
      const today = await app.plan.dashDateInput.inputValue();
      await app.plan.dashDateInput.click({ force: true });
      await expect(app.plan.dashCalendar).toBeVisible({ timeout: 5000 });
      const canGoForward = await app.plan.dashNextMonth.isVisible().catch(() => false);
      if (canGoForward) {
        await app.plan.dashNextMonth.click();
        await app.page.waitForTimeout(800);
        await app.plan.dashCalendar.getByText('15', { exact: true }).first().click({ force: true });
        await app.page.waitForTimeout(4000);
      }
      const value = await app.plan.dashDateInput.inputValue();
      if (value !== today) await app.page.screenshot({ path: evidence('dashboard-future-date') });
      expect(value, 'the date stays on or before today').toBe(today);
    }
  );

  test(
    'CHK-08-14: Refresh reloads the dashboard and restarts the countdown',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(15000);
      const countdown = async () => {
        const m = (await bodyText(app.page)).match(/refreshed in (\d+):(\d+) min/);
        return m ? Number(m[1]) * 60 + Number(m[2]) : null;
      };
      const before = await countdown();
      const request = app.page.waitForRequest(/usage\/report\/principal\/user\/console/, { timeout: 15000 });
      await app.plan.dashRefreshBtn.click();
      await request;
      await app.page.waitForTimeout(1500);
      const after = await countdown();
      expect(after, `countdown before ${before}s, after ${after}s`).toBeGreaterThan(before);
    }
  );

  test(
    'CHK-08-15: the countdown and hours are shown with two-digit minutes and seconds',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      const seen = new Set();
      for (let i = 0; i < 12; i++) {
        const t = await bodyText(app.page);
        for (const m of t.matchAll(/(\d+:\d+) (min|hrs)/g)) seen.add(`${m[1]} ${m[2]}`);
        await app.page.waitForTimeout(1000);
      }
      const bad = [...seen].filter((s) => !/^\d+:\d\d /.test(s));
      if (bad.length) await app.page.screenshot({ path: evidence('dashboard-time-format') });
      expect(bad, 'times without two-digit minutes/seconds').toEqual([]);
    }
  );

  test(
    'CHK-08-16: clicking a bar shows the content the teacher accessed',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.page.waitForTimeout(5000);
      const before = await bodyText(app.page);
      const bar = app.page.locator('svg rect[fill^="#"]:not([fill="#ffffff"]):not([fill="#e6e6e6"])').first();
      await bar.click({ force: true });
      await app.page.waitForTimeout(3000);
      const after = await bodyText(app.page);
      const added = after.replace(before, '');
      expect(after.length, 'details appear after clicking a bar').toBeGreaterThan(before.length);
      expect(added, 'details name a resource').toMatch(/whiteboard|feature|tools|media|print|question|quiz/i);
    }
  );

  // ---------------------------------------------------------------- right-panel cards
  for (const [id, card] of [
    ['CHK-08-34', 'Real-time Dashboard'],
    ['CHK-08-35', 'Custom Reports'],
    ['CHK-08-36', 'Data Export'],
  ]) {
    test(
      `${id}: the ${card} card in the right panel opens its feature or says what it offers`,
      { tag: ['@functional'] },
      async ({ app }) => {
        await openPlanAsPrincipal(app);
        await app.plan.openReport('School Usage');
        const title = app.page.getByText(card, { exact: true }).filter({ visible: true });
        await expect(title.first(), 'the card is shown').toBeVisible({ timeout: 10000 });
        const panelText = flat(await title.first().locator('xpath=..').innerText());
        expect(panelText, 'the card has a readable description').not.toMatch(BAD_TEXT);
        const url = app.page.url();
        const active = async () => (await app.page.locator('.reportmenutab.active').innerText()).trim();
        const tabBefore = await active();
        const popup = app.page
          .context()
          .waitForEvent('page', { timeout: 5000 })
          .catch(() => null);
        const download = app.page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await title.first().click();
        const [opened, file] = await Promise.all([popup, download]);
        await app.page.waitForTimeout(2000);
        const response = {
          newWindow: !!opened,
          download: !!file,
          navigated: app.page.url() !== url,
          tabChanged: (await active()) !== tabBefore,
          message: await app.page
            .locator('[role=dialog], [role=alert], .toast-container > *, .modal.show')
            .filter({ visible: true })
            .count()
            .then((n) => n > 0),
          shownAgain: (await title.count()) > 1,
        };
        if (opened) await opened.close();
        if (!Object.values(response).some(Boolean))
          await app.page.screenshot({ path: evidence(`card-${card.toLowerCase().replace(/\W+/g, '-')}-does-nothing`) });
        expect(
          Object.values(response).some(Boolean),
          `clicking "${card}" opens something or shows a message: ${JSON.stringify(response)}`
        ).toBe(true);
      }
    );
  }

  // ---------------------------------------------------------------- Export Usage Report date ranges
  test(
    'CHK-08-37: Negative: Export Usage Report with the end date before the start date is refused with a message',
    { tag: ['@negative'] },
    async ({ app }) => {
      test.setTimeout(300000);
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.plan.openExportForm();
      await app.plan.exportDateInputs.nth(0).fill('2026-10-07');
      await app.plan.exportDateInputs.nth(1).fill('2026-10-01');
      let file = null;
      app.page.on('download', (d) => (file = d));
      const request = app.page.waitForRequest(/excelReport/, { timeout: 6000 }).catch(() => null);
      await app.plan.exportGoAheadBtn.click();
      await expect(
        app.page.getByText(/end date is not before the start date/i).first(),
        'a message about the order of the dates'
      ).toBeVisible({ timeout: 10000 });
      expect(await request, 'no report is requested').toBeNull();
      expect(file, 'no file is downloaded').toBeNull();
      await expect(app.plan.exportDateInputs.first(), 'the date form stays open').toBeVisible();
    }
  );

  test(
    'CHK-08-38: Edge: Export Usage Report with the same start and end date gives the day’s report',
    { tag: ['@functional'] },
    async ({ app }) => {
      test.setTimeout(360000);
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.plan.openExportForm();
      await app.plan.exportDateInputs.nth(0).fill('2026-10-05');
      await app.plan.exportDateInputs.nth(1).fill('2026-10-05');
      const pending = app.page.waitForEvent('download', { timeout: 240000 }).catch(() => null);
      await app.plan.exportGoAheadBtn.click();
      await expect(app.page.getByText('Report Exported Successfully!').first(), 'the report is made').toBeVisible({
        timeout: 240000,
      });
      const download = await pending;
      if (!download) await app.page.screenshot({ path: evidence('export-same-day-no-file') });
      expect(download, 'the report is downloaded').not.toBeNull();
      expect(download.suggestedFilename(), 'the file name carries the day').toMatch(/2026-10-05-to-2026-10-05/);
      const file = test.info().outputPath(download.suggestedFilename());
      await download.saveAs(file);
      expect(fs.statSync(file).size, 'file size').toBeGreaterThan(0);
      expect(XLSX.readFile(file).SheetNames.length, 'the workbook has sheets').toBeGreaterThan(0);
    }
  );

  test(
    'CHK-08-39: Edge: Export Usage Report for a very long range is refused with a message or gives a valid report',
    { tag: ['@negative'] },
    async ({ app }) => {
      test.setTimeout(300000);
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Principal Dashboard');
      await app.plan.openExportForm();
      await app.plan.exportDateInputs.nth(0).fill('2024-01-01');
      await app.plan.exportDateInputs.nth(1).fill('2026-10-07');
      const request = app.page.waitForRequest(/excelReport/, { timeout: 6000 }).catch(() => null);
      await app.plan.exportGoAheadBtn.click();
      const refused = app.page.getByText(/31 days or less/i).first();
      const made = app.page.getByText('Report Exported Successfully!').first();
      await expect(refused.or(made).first(), 'a refusal message or a report').toBeVisible({ timeout: 240000 });
      if (await refused.isVisible()) {
        expect(await request, 'no report is requested for a refused range').toBeNull();
        await expect(app.plan.exportDateInputs.first(), 'the date form stays open').toBeVisible();
      }
      expect(await bodyText(app.page)).not.toMatch(BAD_TEXT);
    }
  );

  // ---------------------------------------------------------------- School Usage
  test('CHK-08-17: School Usage Download gives the month’s usage report', { tag: ['@regression'] }, async ({ app }) => {
    await openPlanAsPrincipal(app);
    await app.plan.openReport('School Usage');
    await app.page.waitForTimeout(4000);
    await app.page.evaluate(() => {
      window.__printCalls = 0;
      window.print = () => {
        window.__printCalls += 1;
      };
    });
    const popup = app.page
      .context()
      .waitForEvent('page', { timeout: 15000 })
      .catch(() => null);
    const dl = await catchDownload(app.page, () => app.plan.usageDownloadBtn.click(), 15000);
    const printed = await app.page.evaluate(() => window.__printCalls);
    const opened = await popup;
    if (!dl && !printed && !opened) await app.page.screenshot({ path: evidence('school-usage-download-nothing') });
    expect(
      { downloaded: !!dl && dl.size > 0, printDialog: printed > 0, newWindow: !!opened },
      'Download gives a file, a print dialog or a new window'
    ).not.toEqual({ downloaded: false, printDialog: false, newWindow: false });
  });

  test(
    'CHK-08-18: choosing another month in School Usage shows that month without NaN values',
    { tag: ['@regression'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('School Usage');
      await app.page.waitForTimeout(4000);
      const months = await app.plan.optionsOf(app.plan.usageMonthSelect);
      const problems = [];
      for (const month of months.slice(0, 3)) {
        await app.plan.choose(app.plan.usageMonthSelect, month);
        await app.page.waitForTimeout(3000);
        const t = await bodyText(app.page);
        expect(t, `${month}: Report Month`).toContain(`Report Month ${month}`);
        const info = (t.match(/C P Goenka[\s\S]*?Report Month \S+/) || [''])[0];
        if (BAD_TEXT.test(info)) problems.push(`${month}: ${info}`);
      }
      if (problems.length) await app.page.screenshot({ path: evidence('school-usage-nan') });
      expect(problems, 'months whose school details show NaN').toEqual([]);
    }
  );

  test(
    'CHK-08-19: every School Usage view opens with its chart and readable labels',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('School Usage');
      await app.page.waitForTimeout(4000);
      const problems = [];
      for (const view of [
        'Monthly Usage Trend',
        'Daily Usage Trend',
        'Feature & Contribution Index',
        'User wise Trends',
        'Capacity Utilization',
        'Content Usage',
      ]) {
        await app.plan.usageSubTab(view).click();
        await app.page.waitForTimeout(2500);
        const t = await bodyText(app.page);
        if (BAD_TEXT.test(t)) problems.push(`${view}: placeholder text`);
        const raw = t.match(/\blogDay\b|\bCasset \w+|\bCquiz\b|\bCquestion\b|\bcPrint\b/);
        if (raw) problems.push(`${view}: raw label "${raw[0]}"`);
      }
      if (problems.length) await app.page.screenshot({ path: evidence('school-usage-raw-labels') });
      expect(problems, 'views with placeholder text or raw labels').toEqual([]);
    }
  );

  // ---------------------------------------------------------------- Content Statistics
  test(
    'CHK-08-20: Content Statistics Download Report gives a workbook with every book in the table',
    { tag: ['@regression'] },
    async ({ app }) => {
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Content Statistics');
      await expect(app.page.getByText('TP Count (Expected)').first()).toBeVisible({ timeout: 20000 });
      const shown = await app.plan.statsRows.count();
      const dl = await catchDownload(app.page, () => app.plan.dashDownloadBtn.click());
      expect(dl, 'a file is downloaded').not.toBeNull();
      expect(dl.name).toMatch(/content_statistics.*\.xlsx$/);
      const wb = XLSX.readFile(dl.file);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).filter((r) => r.length);
      const books = rows.filter((r) => /^\d+$/.test(String(r[0] ?? '').trim()) || r.length >= 6).length;
      expect(books, `workbook rows (table shows ${shown})`).toBeGreaterThanOrEqual(shown);
    }
  );

  // ---------------------------------------------------------------- Assessment for Learning
  test(
    'CHK-08-21: changing the Grade updates Class, Subject and the report heading',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openAfl(app);
      await expect(app.plan.aflHeaderLine).toContainText(`Class 10 · ${CP.subject}`);
      await app.plan.choose(app.plan.aflGradeSelect, 'Nursery');
      await app.page.waitForTimeout(2000);
      await expect(app.plan.aflHeaderLine).toContainText('Nursery');
      const subjects = await app.plan.optionsOf(app.plan.aflSubjectSelect);
      expect(subjects, 'Nursery subjects').not.toContain('Political Science');
      expect(await app.plan.aflClassSelect.inputValue(), 'a class is chosen').not.toBe('');
    }
  );

  test(
    'CHK-08-22: a grade with no assessments shows "No reports" and no report from before',
    { tag: ['@negative'] },
    async ({ app }) => {
      await openAfl(app, CP.checkpointTitle);
      await app.plan.choose(app.plan.aflGradeSelect, 'Nursery');
      await app.page.waitForTimeout(3000);
      await expect(app.plan.aflNoReports, 'No reports message').toBeVisible({ timeout: 15000 });
      await expect(app.page.getByText('OVERALL MASTERY'), 'no stale report').toHaveCount(0);
    }
  );

  test(
    'CHK-08-23: the performance band counts add up to the number of learners',
    { tag: ['@regression'] },
    async ({ app }) => {
      await openAfl(app, CP.checkpointTitle);
      const n = await aflNumbers(app.page);
      const sum = Object.values(n.bands).reduce((a, b) => a + b, 0);
      if (sum !== n.learners) await app.page.screenshot({ path: evidence('afl-band-counts-short') });
      expect(sum, `bands ${JSON.stringify(n.bands)} vs ${n.learners} learners`).toBe(n.learners);
      expect(n.students.length, 'students listed').toBe(n.learners);
    }
  );

  test('CHK-08-24: the summary numbers agree with the students listed', { tag: ['@regression'] }, async ({ app }) => {
    await openAfl(app, CP.checkpointTitle);
    const n = await aflNumbers(app.page);
    expect(n.onTrack + n.needSupport, 'on track + need support ≤ learners').toBeLessThanOrEqual(n.learners);
    expect(n.overall).toBeGreaterThanOrEqual(0);
    expect(n.overall).toBeLessThanOrEqual(100);
    for (const s of n.students) {
      expect(s.pct, s.name).toBeGreaterThanOrEqual(0);
      expect(s.pct, s.name).toBeLessThanOrEqual(100);
    }
    expect(n.needSupport, 'need support = students below 40%').toBe(n.students.filter((s) => s.pct < 40).length);
    expect(n.onTrack, 'on track = students at 66% or more').toBe(n.students.filter((s) => s.pct >= 66).length);
    const avg = n.students.reduce((a, s) => a + s.pct, 0) / (n.students.length || 1);
    expect(Math.abs(n.overall - avg), `overall ${n.overall}% vs students' average ${avg.toFixed(1)}%`).toBeLessThan(1);
  });

  test(
    'CHK-08-25: each band filter shows only students in that band and the filters add up to All',
    { tag: ['@regression'] },
    async ({ app }) => {
      await openAfl(app, CP.checkpointTitle);
      const all = (await aflNumbers(app.page)).students.length;
      const ranges = { Weak: [0, 40], Moderate: [41, 65], Strong: [66, 100] };
      let total = 0;
      for (const [chip, [lo, hi]] of Object.entries(ranges)) {
        await app.plan.aflBandChip(chip).click();
        await app.page.waitForTimeout(2500);
        const { students } = await aflNumbers(app.page);
        total += students.length;
        const outside = students.filter((s) => s.pct < lo || s.pct > hi);
        expect(outside, `${chip}: students outside ${lo}–${hi}%`).toEqual([]);
      }
      await app.plan.aflBandChip('All').click();
      await app.page.waitForTimeout(2500);
      expect(total, 'Weak + Moderate + Strong = All').toBe(all);
    }
  );

  test(
    'CHK-08-26: the student search matches part of a name in any case, says when nothing matches, and clearing restores the list',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openAfl(app, CP.checkpointTitle);
      const { students } = await aflNumbers(app.page);
      test.skip(!students.length, 'Needs students in the report');
      const name = students[0].name;
      const part = name.split(' ')[0].slice(0, 3).toLowerCase();
      await app.plan.aflStudentSearch.fill(part);
      await app.page.waitForTimeout(2000);
      const found = (await aflNumbers(app.page)).students;
      expect(
        found.map((s) => s.name),
        `"${part}"`
      ).toContain(name);
      expect(
        found.every((s) => s.name.toLowerCase().includes(part)),
        'only matching students'
      ).toBe(true);
      await app.plan.aflStudentSearch.fill('zzqxw');
      await app.page.waitForTimeout(2000);
      expect((await aflNumbers(app.page)).students, 'no students for a name that does not exist').toEqual([]);
      await expect(
        app.page.getByText(/no (students|learners|results|match)/i).first(),
        'a no-match message'
      ).toBeVisible();
      await app.plan.aflStudentSearch.fill('');
      await app.page.waitForTimeout(2000);
      expect((await aflNumbers(app.page)).students.length, 'list restored').toBe(students.length);
    }
  );

  test(
    'CHK-08-27: tapping a concept shows its topic breakdown and tapping it again hides it',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openAfl(app, CP.checkpointTitle);
      const concept = app.page
        .getByText(/students below 40%/)
        .filter({ visible: true })
        .first();
      const breakdown = app.page.getByText('TOPIC BREAKDOWN').filter({ visible: true });
      await expect(breakdown, 'no breakdown before a tap').toHaveCount(0);
      await concept.click();
      await expect(breakdown.first(), 'the concept summary with its topics').toBeVisible({ timeout: 10000 });
      expect(await bodyText(app.page)).toMatch(/\d+ topics? below 40% TOPIC BREAKDOWN .+ \d+%/);
      await concept.click();
      await expect(breakdown, 'the summary closes again').toHaveCount(0, { timeout: 10000 });
    }
  );

  test('CHK-08-28: Print on concept mastery asks the browser to print', { tag: ['@functional'] }, async ({ app }) => {
    // Every frame's print() only counts the call, so no real print dialog opens.
    await app.page.context().addInitScript(() => {
      window.print = () => {
        window.top.__printCalls = (window.top.__printCalls || 0) + 1;
      };
    });
    await openAfl(app, CP.checkpointTitle);
    const popup = app.page
      .context()
      .waitForEvent('page', { timeout: 8000 })
      .catch(() => null);
    await app.plan.aflPrintBtn.click();
    const opened = await popup;
    let printed = await app.page.evaluate(() => window.__printCalls || 0);
    if (opened) printed += await opened.evaluate(() => (typeof window.print === 'function' ? 1 : 0)).catch(() => 0);
    if (opened) await opened.close();
    expect(printed, 'a print was requested').toBeGreaterThan(0);
  });

  test(
    'CHK-08-29: a performance band group can be collapsed and expanded',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openAfl(app, CP.checkpointTitle);
      const { students } = await aflNumbers(app.page);
      test.skip(!students.length, 'Needs students in the report');
      const header = app.page.getByText('Needs Support', { exact: true }).filter({ visible: true }).first();
      const first = app.page.getByText(students[0].name, { exact: true }).first();
      const startOpen = await first.isVisible();
      await header.click();
      await app.page.waitForTimeout(1500);
      expect(await first.isVisible(), 'the group toggles').toBe(!startOpen);
      await header.click();
      await app.page.waitForTimeout(1500);
      expect(await first.isVisible(), 'and toggles back').toBe(startOpen);
    }
  );

  test(
    'CHK-08-42: the Revision report of a revision test lists its students with percentages from 0 to 100 and band counts that add up to the learners',
    { tag: ['@regression'] },
    async ({ app }) => {
      test.setTimeout(360000);
      await openPlanAsPrincipal(app);
      await app.plan.openReport('Assessment for Learning');
      await app.plan.aflRevisionBtn.click();
      await app.page.waitForTimeout(3000);
      await app.plan.choose(app.plan.aflGradeSelect, GRADE);
      await app.plan.choose(app.plan.aflClassSelect, DIVISION);
      await app.plan.choose(app.plan.aflSubjectSelect, CP.subject);
      const assessments = await app.plan.optionsOf(app.plan.aflAssessmentSelect);
      test.skip(!assessments.length, 'Needs a revision test taken in the class');
      const section = `${GRADE.replace(/\D/g, '')}${CP.division}`;
      const summaries = [];
      // The report shown on first load does not always match the assessment selected, so every assessment is chosen
      // by a real change of selection.
      if (assessments.length > 1) {
        await app.plan.aflAssessmentSelect.selectOption({ index: assessments.length - 1 });
        await app.page.waitForTimeout(3000);
      }
      for (let i = 0; i < assessments.length; i++) {
        await app.plan.aflAssessmentSelect.selectOption({ index: i });
        await app.page.waitForTimeout(4000);
        await expect(app.page.getByText('OVERALL MASTERY').or(app.plan.aflNoReports).first()).toBeVisible({
          timeout: 20000,
        });
        const label = `${assessments[i]} (#${i + 1})`;
        if (await app.plan.aflNoReports.isVisible()) {
          // A revision test nobody has taken yet has no report.
          summaries.push(`${label}: no results yet`);
          continue;
        }
        // The report first shows empty numbers while it loads.
        await expect
          .poll(async () => (await aflNumbers(app.page)).learners, { timeout: 20000 })
          .toBeGreaterThan(0)
          .catch(() => {});
        await app.page.waitForTimeout(2000);
        let n = await aflNumbers(app.page);
        // Only the first band group starts open: open every other group that has students.
        for (const [band] of BANDS.slice(1)) {
          if (!n.bands[band]) continue;
          const before = n.students.length;
          const header = app.page.getByText(band, { exact: true }).filter({ visible: true }).first();
          await header.click();
          await app.page.waitForTimeout(1500);
          n = await aflNumbers(app.page);
          if (n.students.length <= before) {
            await header.click();
            await app.page.waitForTimeout(1500);
            n = await aflNumbers(app.page);
          }
        }
        const raw = await bodyText(app.page);
        const sections = [...raw.matchAll(/\b[A-Z]{2} [A-Z][\w.' -]*? Section (\w+) \d+%/g)].map((m) => m[1]);
        const sum = Object.values(n.bands).reduce((a, b) => a + b, 0);
        summaries.push(
          `${label}: ${n.learners} learners, bands ${JSON.stringify(n.bands)}, listed ${n.students
            .map((s) => `${s.name} ${s.pct}%`)
            .join(', ')}`
        );
        const problems = [];
        if (!sum) problems.push('a report with no students in any band');
        if (sum !== n.learners) problems.push(`bands add up to ${sum}, learners ${n.learners}`);
        if (n.students.length !== sum) problems.push(`${n.students.length} students listed, bands ${sum}`);
        const outOfRange = n.students.filter((s) => s.pct < 0 || s.pct > 100);
        if (outOfRange.length) problems.push(`% outside 0–100: ${JSON.stringify(outOfRange)}`);
        const wrongSection = sections.filter((s) => s !== section);
        if (wrongSection.length) problems.push(`students shown in section ${[...new Set(wrongSection)].join(', ')}`);
        if (BAD_TEXT.test(raw)) problems.push('placeholder text');
        if (problems.length) await app.page.screenshot({ path: evidence(`revision-report-${i + 1}`), fullPage: true });
        expect.soft(problems, summaries.at(-1)).toEqual([]);
      }
      test.info().annotations.push({ type: 'revision', description: summaries.join(' | ') });
      expect(
        summaries.some((s) => !s.endsWith('no results yet')),
        `a revision test with results: ${summaries.join(' | ')}`
      ).toBe(true);
    }
  );

  // ---------------------------------------------------------------- teacher vs principal
  test(
    'CHK-08-30: the principal’s report of a checkpoint matches the teacher’s summary',
    { tag: ['@regression'] },
    async ({ app, browser }) => {
      await app.signIn(process.env.VALID_PIN);
      await app.nav.applyClassMap('checkpoints');
      await app.playlist.ensureDrawerVisible();
      await openCheckpoint(app);
      await app.page.waitForTimeout(3000);
      const teacher = await bodyText(app.page);
      await app.player.checkpointCloseBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      const attempted = teacher.match(/(\d+)\s*\/\s*(\d+)\s*Students/);
      const avg = teacher.match(/AVG\.?\s*SCORE:?\s*(\d+)%/i);
      test.skip(!attempted || !avg, 'Needs the paused summary of the checkpoint (not running)');

      const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1600, height: 900 } });
      try {
        const principal = new App(await context.newPage());
        await openAfl(principal, CP.checkpointTitle);
        const n = await aflNumbers(principal.page);
        const info = `teacher: ${attempted[0]}, avg ${avg[1]}%; principal: ${n.learners} learners, overall ${n.overall}%, ${n.students.length} listed`;
        test.info().annotations.push({ type: 'comparison', description: info });
        expect.soft(n.students.length, `students listed = attempted (${info})`).toBe(Number(attempted[1]));
        expect.soft(Math.abs(n.overall - Number(avg[1])), `overall mastery ≈ average (${info})`).toBeLessThanOrEqual(1);
      } finally {
        await context.close();
      }
    }
  );

  for (const [id, key, label] of [
    ['CHK-08-40', 'checkpointTitle', 'all but one of the class took'],
    ['CHK-08-41', 'scoreCheckpointTitle', 'only a few students took'],
  ]) {
    test(
      `${id}: each concept’s mastery in the principal’s report matches the teacher’s summary for a checkpoint ${label}`,
      { tag: ['@regression'] },
      async ({ app, browser }) => {
        const title = CP[key];
        await app.signIn(process.env.VALID_PIN);
        await app.nav.applyClassMap('checkpoints');
        await app.playlist.ensureDrawerVisible();
        const teacher = await teacherConcepts(app, title);
        expect(Object.keys(teacher.concepts).length, 'set-up: the teacher summary lists concepts').toBeGreaterThan(0);

        const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1600, height: 900 } });
        try {
          const principal = new App(await context.newPage());
          await openAfl(principal, title);
          const shown = await principalConcepts(principal.page);
          const n = await aflNumbers(principal.page);
          const rows = Object.entries(teacher.concepts).map(([name, pct]) => ({
            name,
            teacher: pct,
            principal: shown[name] ?? null,
          }));
          const info = `"${title}": teacher avg ${teacher.avg}% (${teacher.attempted} attempted), principal overall ${n.overall}% (${n.learners} learners); ${rows.map((r) => `${r.name} ${r.teacher}% vs ${r.principal}%`).join('; ')}`;
          test.info().annotations.push({ type: 'comparison', description: info });
          const off = rows.filter((r) => r.principal === null || Math.abs(r.principal - r.teacher) > 1);
          if (off.length || Math.abs(n.overall - teacher.avg) > 1)
            await principal.page.screenshot({
              path: evidence(`concept-mastery-${title.toLowerCase().replace(/\W+/g, '-')}`),
              fullPage: true,
            });
          expect.soft(Object.keys(shown).sort(), 'the same concepts').toEqual(Object.keys(teacher.concepts).sort());
          expect.soft(off, `concepts whose % differ by more than 1 (${info})`).toEqual([]);
          expect
            .soft(Math.abs(n.overall - teacher.avg), `overall mastery ≈ average score (${info})`)
            .toBeLessThanOrEqual(1);
        } finally {
          await context.close();
        }
      }
    );
  }

  // ---------------------------------------------------------------- roles
  for (const [id, pinVar, who] of [
    ['CHK-08-31', 'VALID_PIN', 'the main teacher account'],
    ['CHK-08-32', 'PLAN_PIN', 'a plain teacher account'],
  ]) {
    test(
      `${id}: Negative: ${who} has no Reports & Analytics, even after a reload in Plan Mode`,
      { tag: ['@negative'] },
      async ({ app }) => {
        await app.guest.open();
        await app.signIn(process.env[pinVar]);
        const { switched } = await app.compass.switchToPlanningMode();
        expect(switched, 'set-up: Plan Mode opened').toBe(true);
        await expect(app.plan.sidebarLink('Content Library'), 'set-up: Plan Mode sidebar').toBeAttached({
          timeout: 20000,
        });
        await expect(app.plan.reportsLink).toHaveCount(0);
        await expect(app.plan.reportTabs).toHaveCount(0);
        await app.page.reload();
        await app.page.waitForTimeout(6000);
        await expect(app.plan.reportsLink, 'after a reload').toHaveCount(0);
        await expect(app.page.getByText('Realtime usage data')).toHaveCount(0);
      }
    );
  }
});
