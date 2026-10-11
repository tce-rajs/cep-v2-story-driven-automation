// Shared helpers for the Admin panel exploration scripts (tools/exploration/explore-flow-23-*.js). Plain Playwright in
// Chromium (the Admin panel is a web page, not part of the desktop client). Credentials come from .env only.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ADMIN_URL = process.env.ADMIN_URL || 'http://172.18.2.85/admin/';

function evidence(dir) {
  const out = path.join(__dirname, '..', '..', 'report', 'exploration', dir);
  fs.mkdirSync(out, { recursive: true });
  const log = [];
  const logFile = path.join(out, 'log.json');
  return {
    out,
    note(step, data) {
      log.push({ step, at: new Date().toISOString(), ...data });
      fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
    },
    shot: (page, name) => page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true }).catch(() => {}),
  };
}

/** Every visible form control with what identifies it, to learn a form before filling it. */
const describeControls = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('input, select, textarea, mat-select, ng-select, button, [role="combobox"]')]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map((e) => {
        const label =
          (e.id && document.querySelector(`label[for="${e.id}"]`)?.innerText) ||
          e.closest('mat-form-field, .form-group, .mb-3, div')?.querySelector('label, mat-label')?.innerText ||
          '';
        return [
          e.tagName.toLowerCase(),
          e.type || '',
          e.getAttribute('formcontrolname') || e.name || e.id || '',
          e.getAttribute('placeholder') || '',
          label.replace(/\s+/g, ' ').trim().slice(0, 40),
          (e.innerText || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 40),
          e.disabled ? 'disabled' : '',
        ].join(' | ');
      })
  );

async function signIn() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(ADMIN_URL, { waitUntil: 'load', timeout: 60000 });
  await page.locator('input:visible').first().waitFor({ timeout: 30000 });
  const inputs = page.locator('input:visible');
  // Organization Id is an autocomplete: type the start of the school name and pick the suggestion (its open list
  // covers the other fields until one is chosen).
  await inputs.nth(0).click();
  await inputs.nth(0).pressSequentially(process.env.ADMIN_SCHOOL.slice(0, 8), { delay: 30 });
  await page
    .locator('ng-autocomplete li')
    .filter({ hasText: process.env.ADMIN_SCHOOL })
    .first()
    .click({ timeout: 15000 });
  await inputs.nth(1).focus();
  await inputs.nth(1).fill(process.env.ADMIN_USERNAME);
  await inputs.nth(2).focus();
  await inputs.nth(2).fill(process.env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page
    .getByText(/dashboard/i)
    .first()
    .waitFor({ timeout: 30000 });
  return { browser, context, page };
}

module.exports = { signIn, evidence, describeControls, ADMIN_URL };
