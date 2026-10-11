// Phase 1 — FLOW-23 Admin, discovery (read-only): how the Create User expiry-date calendar works. Fills step 1 with
// test values, opens step 2's calendar, records its controls, then closes the window WITHOUT Submit.
// node tools/exploration/explore-flow-23c-admin-datepicker.js
const { signIn, evidence } = require('./admin-explore-lib');

(async () => {
  const ev = evidence('flow-23/datepicker');
  const { browser, page } = await signIn();
  const fc = (name) => page.locator(`[formcontrolname="${name}"]`).first();
  try {
    await page.getByText(/^\s*MANAGE\s*$/i).first().click();
    await page.waitForTimeout(800);
    await page.getByText(/Manage Teacher/i).first().click();
    await page.waitForTimeout(2500);
    await page.getByText('Create Teacher', { exact: true }).click();
    await page.waitForTimeout(1500);
    await fc('title').selectOption({ label: 'Mr' });
    await fc('first_name').fill('AutoQA');
    await fc('last_name').fill('Probe');
    await fc('email').fill('autoqa.probe@example.com');
    await fc('contact').fill('9876543210');
    await fc('subjects').click();
    await page.waitForTimeout(800);
    await page.locator('.ng-dropdown-panel .ng-option').first().click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^\s*Next\s*$/ }).click();
    await page.waitForTimeout(1500);
    ev.note('expiry-input', {
      readonly: await fc('expiry_date').evaluate((e) => e.readOnly),
      outer: await fc('expiry_date').evaluate((e) => e.outerHTML.slice(0, 300)),
    });
    // The calendar button sits right after the input.
    await fc('expiry_date').locator('xpath=following::button[1]').click();
    await page.waitForTimeout(1200);
    await ev.shot(page, 'calendar-open');
    ev.note('calendar', {
      html: await page
        .locator('ngb-datepicker, .ngb-dp, bs-datepicker-container, .mat-datepicker-content, .datepicker, [role="dialog"] table')
        .first()
        .evaluate((e) => e.outerHTML.slice(0, 2500))
        .catch(() => '(no known calendar element)'),
      selects: await page.locator('ngb-datepicker select').evaluateAll((els) => els.map((e) => e.getAttribute('title') || e.className)).catch(() => []),
    });
  } catch (e) {
    ev.note('error', { error: e.message.split('\n')[0] });
    await ev.shot(page, 'error');
  } finally {
    await browser.close(); // nothing submitted
  }
})();
