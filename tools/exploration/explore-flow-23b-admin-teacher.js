// Phase 1 — FLOW-23 Admin, the owner's core flow (approved 9 Oct): create a NEW teacher, reset that teacher's PIN and
// password, extend that teacher's expiry, check Version History, then Sync and watch it to the end.
// Every write is on the teacher this script creates ("AutoQA <letters>"); no other user is touched.
// node tools/exploration/explore-flow-23b-admin-teacher.js
const fs = require('fs');
const path = require('path');
const { signIn, evidence, describeControls } = require('./admin-explore-lib');

// Letters-only stamp (names may refuse digits): minutes since 2026-01-01 in base 26.
const stamp = (() => {
  let n = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 60000);
  let s = '';
  do {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  } while (n > 0);
  return s.charAt(0).toUpperCase() + s.slice(1);
})();
const FIRST = 'AutoQA';
const LAST = stamp;
const isoDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

(async () => {
  const ev = evidence(`flow-23/run-${stamp}`);
  const { browser, page } = await signIn();
  const messages = [];
  const collectMessages = async () => {
    const t = await page
      .locator('.toast-container, .toast-message, mat-snack-bar-container, [role="alert"], .swal2-popup, .modal-body')
      .allInnerTexts()
      .catch(() => []);
    const clean = t.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
    messages.push(...clean);
    return clean;
  };
  const responses = [];
  page.on('response', (r) => {
    if (r.request().method() !== 'GET')
      responses.push(`${r.request().method()} ${r.status()} ${r.url().slice(0, 140)}`);
  });
  const fc = (name) => page.locator(`[formcontrolname="${name}"]`).first();
  /** The expiry field is read-only: choose the date in its calendar (ngb-datepicker: month + year lists, day cells
   * labelled like "Saturday, November 7, 2026"), as an admin would. */
  const pickDate = async (daysAhead) => {
    const d = new Date(Date.now() + daysAhead * 86400000);
    await fc('expiry_date').locator('xpath=following::button[1]').click();
    const dp = page.locator('ngb-datepicker').first();
    await dp.waitFor({ timeout: 10000 });
    await dp.locator('select[title="Select year"]').selectOption(String(d.getFullYear()));
    await dp.locator('select[title="Select month"]').selectOption(String(d.getMonth() + 1));
    const label = `${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
    await dp.locator(`[role="gridcell"][aria-label*="${label}"]`).first().click();
    await page.waitForTimeout(500);
  };
  const openTeachers = async () => {
    await page
      .getByText(/^\s*MANAGE\s*$/i)
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(800);
    await page
      .getByText(/Manage Teacher/i)
      .first()
      .click();
    await page.waitForTimeout(2500);
  };
  const recordsFound = async () =>
    Number(
      ((
        await page
          .getByText(/Records Found/)
          .first()
          .innerText()
          .catch(() => '')
      ).match(/\d+/) || [NaN])[0]
    );
  const myRow = () =>
    page
      .locator('tr')
      .filter({ hasText: `${FIRST} ${LAST}` })
      .first();
  const rowMenu = async (item) => {
    await myRow().locator('td').last().locator('*').last().click({ force: true });
    await page.waitForTimeout(800);
    await ev.shot(page, `menu-${item.replace(/\W+/g, '-')}`);
    await page
      .getByText(new RegExp(`^\\s*${item}\\s*$`, 'i'))
      .filter({ visible: true })
      .first()
      .click();
    await page.waitForTimeout(1500);
  };
  const confirmIfAsked = async (name) => {
    await ev.shot(page, `${name}-dialog`);
    const dialogText = await page
      .locator('.modal-content, mat-dialog-container, .swal2-popup, [role="dialog"]')
      .filter({ visible: true })
      .first()
      .innerText()
      .catch(() => '');
    const yes = page.getByRole('button', { name: /^\s*(yes|confirm|ok|reset|submit)\s*$/i }).filter({ visible: true });
    const asked = (await yes.count()) > 0;
    if (asked) await yes.first().click();
    await page.waitForTimeout(2500);
    await ev.shot(page, `${name}-after`);
    return {
      dialogText: dialogText.replace(/\s+/g, ' ').slice(0, 400),
      confirmationAsked: asked,
      messages: await collectMessages(),
    };
  };
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      ev.note(name, { error: e.message.split('\n')[0] });
      await ev.shot(page, `${name}-error`);
      await page.keyboard.press('Escape').catch(() => {});
    }
  };

  ev.note('start', { teacher: `${FIRST} ${LAST}` });

  // 1. Create the teacher
  await step('1-create', async () => {
    await openTeachers();
    const before = await recordsFound();
    await page.getByText('Create Teacher', { exact: true }).click();
    await page.waitForTimeout(1500);
    await fc('title').selectOption({ label: 'Mr' });
    await fc('first_name').fill(FIRST);
    await fc('last_name').fill(LAST);
    await fc('email').fill(`autoqa.${stamp.toLowerCase()}@example.com`);
    await fc('contact').fill('9876543210');
    await fc('subjects').click();
    await page.waitForTimeout(800);
    await page
      .locator('.ng-dropdown-panel .ng-option')
      .filter({ hasText: /^\s*Science\s*$/ })
      .first()
      .click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^\s*Next\s*$/ }).click();
    await page.waitForTimeout(1500);
    await page.locator('[formcontrolname="online_access"]').first().check({ force: true });
    await page.locator('[formcontrolname="user_status"]').first().check({ force: true });
    await pickDate(30);
    const username = await fc('username').inputValue();
    await ev.shot(page, '1-create-step2');
    ev.note('1-create-step2', {
      username,
      expiry: await fc('expiry_date').inputValue(),
      controls: await describeControls(page),
    });
    await page.getByRole('button', { name: /^\s*Submit\s*$/ }).click();
    await page.waitForTimeout(4000);
    const msgs = await collectMessages();
    await ev.shot(page, '1-create-after');
    await page.keyboard.press('Escape');
    await openTeachers();
    const after = await recordsFound();
    ev.note('1-create', {
      messages: msgs,
      recordsBefore: before,
      recordsAfter: after,
      row: (
        await myRow()
          .innerText()
          .catch(() => '(not in list)')
      ).replace(/\s+/g, ' '),
    });
  });

  // 2. Reset PIN, 3. Reset Password (on the new teacher only)
  await step('2-reset-pin', async () => {
    await rowMenu('Reset PIN');
    ev.note('2-reset-pin', await confirmIfAsked('2-reset-pin'));
    await page.keyboard.press('Escape');
  });
  await step('3-reset-password', async () => {
    await rowMenu('Reset Password');
    ev.note('3-reset-password', await confirmIfAsked('3-reset-password'));
    await page.keyboard.press('Escape');
  });

  // 4. Extend the expiry date (+90 days) through Edit, then reopen Edit to read it back
  await step('4-extend-expiry', async () => {
    await rowMenu('Edit');
    await ev.shot(page, '4-edit-step1');
    await page.getByRole('button', { name: /^\s*Next\s*$/ }).click();
    await page.waitForTimeout(1500);
    const before = await fc('expiry_date').inputValue();
    await pickDate(90);
    await ev.shot(page, '4-edit-step2');
    await page
      .getByRole('button', { name: /^\s*(Submit|Update|Save)\s*$/ })
      .first()
      .click();
    await page.waitForTimeout(4000);
    const msgs = await collectMessages();
    await page.keyboard.press('Escape');
    await openTeachers();
    await rowMenu('Edit');
    await page.getByRole('button', { name: /^\s*Next\s*$/ }).click();
    await page.waitForTimeout(1500);
    const reread = await fc('expiry_date').inputValue();
    await ev.shot(page, '4-edit-reread');
    ev.note('4-extend-expiry', { before, wanted: isoDate(90), afterReopen: reread, messages: msgs });
    await page.keyboard.press('Escape');
    const close = page.getByRole('button', { name: /^\s*(Close|Cancel)\s*$/ }).filter({ visible: true });
    if (await close.count()) await close.first().click();
  });

  // 5. Version History
  await step('5-version-history', async () => {
    await openTeachers();
    await rowMenu('Version History');
    await ev.shot(page, '5-version-history');
    ev.note('5-version-history', {
      rows: (await page.locator('.modal-content tr, mat-dialog-container tr, [role="dialog"] tr').allInnerTexts()).map(
        (t) => t.replace(/\s+/g, ' ')
      ),
    });
    await page.keyboard.press('Escape');
    const close = page.getByRole('button', { name: /^\s*Close\s*$/ }).filter({ visible: true });
    if (await close.count()) await close.first().click();
  });

  // 6. Sync, then watch View Sync Status until every part finishes (max 12 min)
  await step('6-sync', async () => {
    await page
      .getByText(/DashBoard/i)
      .first()
      .click()
      .catch(() => {});
    await page
      .getByText(/^\s*MANAGE\s*$/i)
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(800);
    await page
      .getByText(/Manage School/i)
      .first()
      .click();
    await page.waitForTimeout(2500);
    const lastSync = async () => (await page.locator('tr').nth(1).innerText()).replace(/\s+/g, ' ');
    const before = await lastSync();
    const kebab = page.locator('#dropdownBasic1').first();
    await kebab.click();
    await page.waitForTimeout(800);
    await ev.shot(page, '6-school-menu');
    await page
      .getByText(/^\s*Sync\s*$/)
      .filter({ visible: true })
      .first()
      .click();
    await page.waitForTimeout(2000);
    const started = await confirmIfAsked('6-sync');
    ev.note('6-sync-start', { lastSyncBefore: before, ...started });
    const t0 = Date.now();
    for (let i = 0; Date.now() - t0 < 12 * 60000; i++) {
      await page.keyboard.press('Escape').catch(() => {});
      await kebab.click();
      await page.waitForTimeout(600);
      await page
        .getByText(/View Sync Status/)
        .filter({ visible: true })
        .first()
        .click();
      await page.waitForTimeout(2500);
      const status = (
        await page
          .locator('.modal-content, mat-dialog-container, [role="dialog"]')
          .filter({ visible: true })
          .first()
          .innerText()
          .catch(() => '')
      )
        .replace(/\s+/g, ' ')
        .slice(0, 800);
      ev.note(`6-sync-status-${i}`, { minute: Math.round((Date.now() - t0) / 6000) / 10, status });
      if (i === 0) await ev.shot(page, '6-sync-status-first');
      const busy = /in progress|inprogress|pending|running|started|queued/i.test(status);
      if (!busy && i > 0) {
        await ev.shot(page, '6-sync-status-final');
        break;
      }
      await page
        .getByRole('button', { name: /^\s*Close\s*$/ })
        .filter({ visible: true })
        .first()
        .click()
        .catch(() => page.keyboard.press('Escape'));
      await page.waitForTimeout(30000);
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page
      .getByRole('button', { name: /^\s*Close\s*$/ })
      .filter({ visible: true })
      .first()
      .click()
      .catch(() => {});
    await page.reload();
    ev.note('6-sync-end', { note: 'Last Sync On read after re-sign-in in the next run (reload signs the admin out)' });
  });

  ev.note('end', { messages, writes: responses.filter((r) => !/sso\/extend/.test(r)).slice(0, 60) });
  fs.writeFileSync(path.join(ev.out, 'teacher.json'), JSON.stringify({ first: FIRST, last: LAST, stamp }, null, 2));
  await browser.close();
})();
