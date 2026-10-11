// Phase 1 — FLOW-23 Admin, discovery pass (read-only): sign in, open Manage Teacher, open Create Teacher, record the
// controls of both steps, close without Submit. Also opens a teacher row menu and the school's View Sync Status.
// node tools/exploration/explore-flow-23a-admin-forms.js
const { signIn, evidence, describeControls } = require('./admin-explore-lib');

(async () => {
  const ev = evidence('flow-23');
  const { browser, page } = await signIn();
  try {
    await ev.shot(page, 'a-dashboard');
    ev.note('a-dashboard', { url: page.url() });

    // Manage Teacher
    await page
      .getByText(/^\s*MANAGE\s*$/i)
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(1000);
    await page
      .getByText(/Manage Teacher/i)
      .first()
      .click();
    await page.waitForTimeout(3000);
    await ev.shot(page, 'b-teacher-list');
    ev.note('b-teacher-list', {
      url: page.url(),
      rows: (await page.locator('tr, mat-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).slice(0, 20),
      controls: await describeControls(page),
    });

    // Create Teacher: step 1
    await page.getByText('Create Teacher', { exact: true }).click();
    await page.waitForTimeout(2000);
    await ev.shot(page, 'c-create-step1');
    ev.note('c-create-step1', { controls: await describeControls(page) });
    // Step 2 needs valid step-1 details: fill test values, look at step 2, then close WITHOUT Submit.
    const fc = (name) => page.locator(`[formcontrolname="${name}"]`).first();
    await fc('title').selectOption({ label: 'Mr' });
    await fc('first_name').fill('AutoQA');
    await fc('last_name').fill('Probe');
    await fc('email').fill('autoqa.probe@example.com');
    await fc('contact').fill('9876543210');
    // Subjects: pick the first offered subject.
    await fc('subjects').click();
    await page.waitForTimeout(800);
    const subjects = await page.locator('.ng-dropdown-panel .ng-option').allInnerTexts();
    await page
      .locator('.ng-dropdown-panel .ng-option')
      .first()
      .click()
      .catch(() => {});
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    await ev.shot(page, 'c-create-step1-filled');
    ev.note('c-create-step1-filled', {
      subjectsOffered: subjects.slice(0, 60),
      controls: await describeControls(page),
    });
    const next = page.getByRole('button', { name: /^\s*Next\s*$/ }).first();
    if (await next.isEnabled().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(1500);
      await ev.shot(page, 'c-create-step2');
      ev.note('c-create-step2', { controls: await describeControls(page) });
    } else ev.note('c-create-step2', { nextEnabled: false });

    // Close without submitting
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    const close = page.getByRole('button', { name: /close|cancel/i }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
    await page.waitForTimeout(1000);

    // Manage School → row menu → View Sync Status (read-only)
    await page
      .getByText(/DashBoard/i)
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(1000);
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
    await page.waitForTimeout(3000);
    await ev.shot(page, 'd-school-list');
    ev.note('d-school-list', {
      rows: (await page.locator('tr, mat-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).slice(0, 5),
      controls: await describeControls(page),
    });
  } catch (e) {
    ev.note('error', { error: e.message.split('\n')[0] });
    await ev.shot(page, 'error');
  } finally {
    await browser.close();
  }
})();
