// ADM-15 Daily usage report, ADM-16 Monthly usage report, ADM-17 Build version (Admin panel, read-only).
// Source: CEPV2_Stories/22_Admin.md
const fs = require('fs');
const XLSX = require('xlsx');
const { test, expect, AdminPage } = require('./admin-helpers');

const SELECTED = 'rgb(0, 0, 0)';

async function openDaily(admin) {
  await admin.openSchoolList();
  await admin.schoolMenu('Daily');
  await admin.page.locator('#totalUsers').waitFor({ timeout: 60000 });
  await admin.page.waitForTimeout(2000);
}

/** Names in the daily timeline (first column of the chart's data table). */
const timelineNames = (admin) =>
  admin.page
    .locator('#myTimeLine table tbody tr td:first-child')
    .evaluateAll((tds) => [...new Set(tds.map((td) => td.textContent.trim()))]);

async function openMonthly(admin) {
  await admin.openSchoolList();
  await admin.schoolMenu('Monthly');
  await admin.page.locator('#main-header-month').waitFor({ timeout: 60000 });
  await admin.page.getByText('School Usage Data').waitFor({ timeout: 60000 });
  await admin.page.waitForTimeout(3000);
}

/** Section of the monthly report under a chart title. */
const monthlySection = (admin, title) =>
  admin.page
    .locator('.component-header-title', { hasText: title })
    .first()
    .locator('xpath=ancestor::*[.//*[contains(@class,"apexcharts-canvas")]][1]');

const monthLabel = (s) => {
  const [mon, year] = s.trim().split('-');
  return new Date(`${mon} 1, ${year}`).getTime();
};

test.describe('ADM-15 Daily usage report', () => {
  test.describe.configure({ timeout: 180000 });
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    "ADM-15-01: View Daily Report opens on today's date with User wise selected",
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      await openDaily(admin);
      const date = await admin.page.locator('.pd_header_calendar input').inputValue();
      const d = new Date();
      const day = String(d.getDate());
      const month = [String(d.getMonth() + 1), d.toLocaleString('en-US', { month: 'short' })];
      expect(date, `date shown "${date}"`).toMatch(new RegExp(`\\b0?${day}\\b`));
      expect(
        month.some((m) => new RegExp(`\\b0?${m}\\b`, 'i').test(date)),
        `date shown "${date}" is this month`
      ).toBe(true);
      expect(date).toContain(String(d.getFullYear()));
      await expect(admin.page.locator('#pd-userWisechatTypeBtn')).toHaveCSS('background-color', SELECTED);
    }
  );

  test(
    'ADM-15-02: the totals line shows Total users, Eligible users, Current users, Installed Classrooms and Current Classrooms',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openDaily(admin);
      const line = (await admin.page.locator('#userSummary').innerText()).replace(/\s+/g, ' ');
      for (const label of [
        'Total users',
        'Eligible users',
        'Current users',
        'Installed Classrooms',
        'Current Classrooms',
      ])
        expect(line).toMatch(new RegExp(`${label}:\\s*\\d+`));
    }
  );

  test('ADM-15-03: every user row has a name (no "-")', { tag: ['@functional'] }, async ({ admin }) => {
    await openDaily(admin);
    const names = await timelineNames(admin);
    expect(names.length).toBeGreaterThan(0);
    expect(
      names.filter((n) => !n || n === '-'),
      'rows without a name (Admin F-08)'
    ).toEqual([]);
  });

  test(
    'ADM-15-04: durations are shown as hours:minutes with two-digit minutes (e.g. 2:09 hrs)',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openDaily(admin);
      const text = await admin.page.locator('#pd-chartview-main-container').innerText();
      const durations = text.match(/\d+:\d+ hrs/g) || [];
      expect(durations.length).toBeGreaterThan(0);
      expect(
        durations.filter((t) => !/^\d+:\d{2} hrs$/.test(t)),
        'Admin F-08'
      ).toEqual([]);
    }
  );

  test(
    'ADM-15-05: Classroom wise lists every registered terminal by location and IP',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Terminal Settings');
      const terminals = (await admin.allPagesRows()).filter((r) => r.length >= 4 && /\d+\.\d+\.\d+\.\d+/.test(r[2]));
      await admin.closeAllModals();
      await openDaily(admin);
      await admin.page.locator('#pd-classRoomWiseBtn').click();
      await admin.page.waitForTimeout(4000);
      const text = await admin.page.locator('#pd-chartview-main-container').innerText();
      const missing = terminals
        .filter(([, , ip, loc]) => !text.includes(ip) && !text.includes(loc))
        .map((r) => `${r[3]} ${r[2]}`);
      expect(missing, 'terminals missing from Classroom wise').toEqual([]);
    }
  );

  test(
    'ADM-15-06: Download Report downloads an Excel file for the chosen date',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openDaily(admin);
      const file = await admin.download(() => admin.page.locator('#pd_exportBtn').click(), test.info().outputDir);
      expect(file.name).toMatch(/\.xlsx?$/i);
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      expect(file.name, 'file named for the chosen date').toContain(`${dd}-${mm}-${d.getFullYear()}`);
    }
  );

  test(
    'ADM-15-07: the downloaded report has the same users as the screen',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openDaily(admin);
      const names = (await timelineNames(admin)).filter((n) => n && n !== '-');
      const file = await admin.download(() => admin.page.locator('#pd_exportBtn').click(), test.info().outputDir);
      const wb = XLSX.read(fs.readFileSync(file.path));
      const text = wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n');
      expect(
        names.filter((n) => !text.includes(n.replace(/^(Mr|Miss|Mrs|Ms)\.?\s+/, ''))),
        'users missing from the file'
      ).toEqual([]);
    }
  );

  test('ADM-15-08: Refresh reloads the data', { tag: ['@functional'] }, async ({ admin }) => {
    await openDaily(admin);
    const reload = admin.page.waitForResponse(
      (r) => r.request().method() !== 'OPTIONS' && /usage|report/i.test(r.url()),
      {
        timeout: 20000,
      }
    );
    await admin.page.locator('#pd_refeshBtn').click();
    expect((await reload).ok()).toBe(true);
    await expect(admin.page.locator('#totalUsers')).toContainText(/\d+/, { timeout: 30000 });
  });

  test('ADM-15-09: Back closes the report', { tag: ['@functional'] }, async ({ admin }) => {
    await openDaily(admin);
    await admin.modal.getByRole('button', { name: /Back/ }).click();
    await expect(admin.page.locator('ngb-modal-window')).toHaveCount(0);
    await expect(admin.page.getByText('School’s List')).toBeVisible();
  });
});

test.describe('ADM-16 Monthly usage report', () => {
  test.describe.configure({ timeout: 180000 });
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-16-01: View Monthly Report shows the latest month by default',
    { tag: ['@smoke', '@functional'] },
    async ({ admin }) => {
      await openMonthly(admin);
      const select = admin.page.locator('#main-header-month');
      const options = (await select.locator('option').allInnerTexts()).map((t) => t.trim());
      const chosen = await select.evaluate((s) => s.options[s.selectedIndex].text.trim());
      const latest = [...options].sort((a, b) => monthLabel(b) - monthLabel(a))[0];
      expect(chosen).toBe(latest);
    }
  );

  test(
    'ADM-16-02: choosing another month updates the report month shown',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openMonthly(admin);
      const select = admin.page.locator('#main-header-month');
      const options = (await select.locator('option').allInnerTexts()).map((t) => t.trim());
      const chosen = await select.evaluate((s) => s.options[s.selectedIndex].text.trim());
      const other = options.find((o) => o !== chosen);
      await select.selectOption({ label: other });
      await admin.page.waitForTimeout(5000);
      const summary = (await admin.page.getByText('School Usage Data').locator('xpath=..').innerText()).replace(
        /\s+/g,
        ' '
      );
      expect(summary).toMatch(new RegExp(`Report Month\\s*${other}`));
    }
  );

  test(
    'ADM-16-03: the school summary shows location, content coverage, assets available and terminals',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openMonthly(admin);
      const text = (await admin.page.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(text).toMatch(/Location\s+\S+/);
      expect(text).toMatch(/Content Coverage\s+[\d.]+ ?%/);
      expect(text).toMatch(/Assets Available\s+\d+/);
      expect(text).toMatch(/No\. of Classroom Terminals\s+\d+/);
      expect(text).toMatch(/No\. of Teacher Terminals\s+\d+/);
    }
  );

  test(
    'ADM-16-04: each tab (Monthly Usage Trend, Daily Usage Trend, Feature & Contribution Index, User wise Trends, Capacity Utilization, Content Usage) opens with a chart',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openMonthly(admin);
      const tabs = {
        'monthly-usage-trend-tab': 'Monthly Usage Trend',
        'daily-usage-trend-tab': 'Daily Usage Trend',
        'contribution-index-tab': 'Feature & Contribution Index',
        'user-wise-trends-tab': 'User wise Trends',
        'terminal-summary-tab': 'Capacity Utilization',
        'content-usage-tab': 'Content Usage',
      };
      const noChart = [];
      for (const [id, name] of Object.entries(tabs)) {
        await admin.page.locator(`#${id}`).click();
        await admin.page.waitForTimeout(2500);
        await expect(admin.page.locator(`#${id}`)).toHaveClass(/active/);
        const charts = await admin.page
          .locator('.apexcharts-canvas, google-chart svg, canvas')
          .filter({ visible: true })
          .count();
        if (!charts) noChart.push(name);
      }
      expect(noChart, 'tabs without a chart').toEqual([]);
    }
  );

  test(
    'ADM-16-05: Daily Usage Trend shows only the days of the chosen month (30 for September)',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openMonthly(admin);
      const select = admin.page.locator('#main-header-month');
      const sep = (await select.locator('option').allInnerTexts()).map((t) => t.trim()).find((o) => /^Sep-/.test(o));
      if (!sep) throw new Error('DATA MISSING ON THIS SERVER: no September in the month list');
      await select.selectOption({ label: sep });
      await admin.page.waitForTimeout(5000);
      await admin.page.locator('#daily-usage-trend-tab').click();
      await admin.page.waitForTimeout(2500);
      const labels = await monthlySection(admin, 'Daily Usage Trend')
        .locator('.apexcharts-xaxis-label')
        .allTextContents();
      const days = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
      expect(days.length, `x-axis days: ${days.join(' ')}`).toBe(30);
      expect(days.filter((d) => !/^(\d{1,2})$/.test(d) || Number(d) > 30)).toEqual([]);
    }
  );

  test(
    'ADM-16-06: User wise Trends lists only school users (not the support admin)',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await openMonthly(admin);
      await admin.page.locator('#user-wise-trends-tab').click();
      await admin.page.waitForTimeout(3000);
      const text = await monthlySection(admin, 'User wise')
        .innerText()
        .catch(() => admin.page.locator('body').innerText());
      expect(text, 'Admin F-09').not.toMatch(/Support\s+Admin/i);
    }
  );

  test('ADM-16-07: User wise Trends labels do not overlap', { tag: ['@functional'] }, async ({ admin }) => {
    await openMonthly(admin);
    await admin.page.locator('#user-wise-trends-tab').click();
    await admin.page.waitForTimeout(3000);
    const overlaps = await admin.page.evaluate(() => {
      const labels = [...document.querySelectorAll('.apexcharts-datalabel, .apexcharts-data-labels text')]
        .filter((e) => e.getBoundingClientRect().width > 0 && e.textContent.trim())
        .map((e) => ({ t: e.textContent.trim(), r: e.getBoundingClientRect() }));
      const out = [];
      for (let i = 0; i < labels.length; i++)
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i].r;
          const b = labels[j].r;
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1)
            out.push(`${labels[i].t} / ${labels[j].t}`);
        }
      return out;
    });
    expect(overlaps, 'overlapping labels (Admin F-18)').toEqual([]);
  });

  test(
    "ADM-16-08: Capacity Utilization lists the school's classroom terminals",
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openSchoolSettings('Terminal Settings');
      const terminals = (await admin.allPagesRows()).filter((r) => r.length >= 4 && /\d+\.\d+\.\d+\.\d+/.test(r[2]));
      await admin.closeAllModals();
      await openMonthly(admin);
      await admin.page.locator('#terminal-summary-tab').click();
      await admin.page.waitForTimeout(3000);
      const text = await admin.page.locator('body').innerText();
      const missing = terminals
        .filter(([, , ip, loc]) => !text.includes(ip) && !text.includes(loc))
        .map((r) => `${r[3]} ${r[2]}`);
      expect(missing, 'terminals missing from Capacity Utilization').toEqual([]);
    }
  );

  test('ADM-16-09: Download saves the monthly report', { tag: ['@functional'] }, async ({ admin }) => {
    await openMonthly(admin);
    const file = await admin.download(
      () =>
        admin.page.locator('i.fa-download, .fa-download').filter({ visible: true }).first().locator('xpath=..').click(),
      test.info().outputDir
    );
    expect(fs.statSync(file.path).size).toBeGreaterThan(0);
  });

  test(
    'ADM-16-10: no internal names (e.g. "logDay", "Cquiz", "Tp") are shown',
    { tag: ['@regression'] },
    async ({ admin }) => {
      await openMonthly(admin);
      const shown = new Set();
      for (const id of [
        'monthly-usage-trend-tab',
        'daily-usage-trend-tab',
        'contribution-index-tab',
        'user-wise-trends-tab',
        'terminal-summary-tab',
        'content-usage-tab',
      ]) {
        await admin.page.locator(`#${id}`).click();
        await admin.page.waitForTimeout(1500);
        const text = await admin.modal.innerText();
        for (const raw of text.match(/\b(logDay|Cquiz|Cquestion|Casset \w+|Tp|cPrint)\b/g) || []) shown.add(raw);
      }
      expect([...shown], 'internal names on screen (Admin F-16)').toEqual([]);
    }
  );
});

test.describe('ADM-17 Build version', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_* in .env');

  test(
    'ADM-17-01: Build Version lists each service with type, version and update date',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openBuildVersion();
      const rows = await admin.tableRows(admin.modal);
      expect(rows.length).toBeGreaterThan(0);
      for (const [host, type, service, date, version] of rows) {
        expect(host, `${service}: host`).toMatch(/\S/);
        expect(type, `${service}: type`).toMatch(/\S/);
        expect(service).toMatch(/\S/);
        expect(date, `${service}: update date`).toMatch(/\d/);
        expect(version, `${service}: version`).toMatch(/\d/);
      }
    }
  );

  test('ADM-17-02: dates in Build Version use one format', { tag: ['@functional'] }, async ({ admin }) => {
    await admin.openBuildVersion();
    const dates = (await admin.tableRows(admin.modal)).map((r) => `${r[2]}: ${r[3]}`);
    const odd = dates.filter((d) => !/: \d{2}-\d{2}-\d{4}$/.test(d));
    expect(odd, 'dates not in dd-mm-yyyy like the others (Admin F-17)').toEqual([]);
  });

  test(
    'ADM-17-03: the admin build in the user menu matches the CE-Admin row in Build Version',
    { tag: ['@functional'] },
    async ({ admin }) => {
      await admin.openUserMenu();
      const menu = (await admin.menuBuild.innerText()).match(/Build:\s*([\d.]+)/)[1];
      await admin.closeUserMenu();
      await admin.openBuildVersion();
      const row = (await admin.tableRows(admin.modal)).find((r) => r[2] === 'CE-Admin');
      expect(row, 'a CE-Admin row').toBeTruthy();
      expect(row[4].replace(/\D/g, ''), `menu ${menu} vs Build Version ${row[4]} (${row[3]})`).toBe(
        menu.replace(/\D/g, '')
      );
    }
  );
});
