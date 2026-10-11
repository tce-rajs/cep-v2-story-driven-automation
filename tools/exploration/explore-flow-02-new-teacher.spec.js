// Phase 1 exploration — FLOW-02 new teacher (account created in Admin by explore-flow-23b). Not part of any suite.
// After Module 02 ran: does the new PIN sign in? What does the first screen show? Evidence: report/exploration/flow-02/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');
const { NewUserPage } = require('../../pages/new-user.page');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-02');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
};

test.setTimeout(10 * 60 * 1000);

test('explore FLOW-02 new teacher sign-in', async ({ app, page }) => {
  const { pin, newPassword } = NewUserPage.credentials;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const failed = [];
  page.on('response', (r) => {
    if (/auth|login|pin|token/i.test(r.url()) && r.request().method() !== 'GET')
      failed.push(`${r.request().method()} ${r.status()} ${r.url().slice(0, 120)}`);
  });

  // A. PIN, one attempt, watched closely
  await app.login.open();
  await app.login.openSignIn();
  await page.waitForTimeout(1500);
  await shot('A-signin');
  await app.login.enterPin(pin);
  await page.waitForTimeout(6000);
  await shot('A-after-pin');
  note('A-pin', {
    signedIn: await app.login.avatar.isVisible().catch(() => false),
    invalidPin: await page
      .getByText(/invalid pin/i)
      .isVisible()
      .catch(() => false),
    welcome: await app.newUser.welcomeMessage.isVisible().catch(() => false),
    chooseClass: await app.newUser.chooseClassBtn
      .first()
      .isVisible()
      .catch(() => false),
    authCalls: failed.slice(),
  });

  // B. If the PIN did not work, the password
  if (
    !(await app.login.avatar.isVisible().catch(() => false)) &&
    !(await app.newUser.chooseClassBtn
      .first()
      .isVisible()
      .catch(() => false))
  ) {
    await page.keyboard.press('Escape');
    await app.newUser
      .signInWithPassword(newPassword)
      .catch((e) => note('B-error', { error: e.message.split('\n')[0] }));
    await page.waitForTimeout(6000);
    await shot('B-after-password');
    note('B-password', {
      signedIn: await app.login.avatar.isVisible().catch(() => false),
      pinSetupShown: await app.newUser.pinInputs
        .first()
        .isVisible()
        .catch(() => false),
      welcome: await app.newUser.welcomeMessage.isVisible().catch(() => false),
      chooseClass: await app.newUser.chooseClassBtn
        .first()
        .isVisible()
        .catch(() => false),
      text: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400),
      authCalls: failed.slice(),
    });
  }

  // C. What a signed-in new teacher sees first
  await page.waitForTimeout(2000);
  await shot('C-first-screen');
  note('C-first-screen', {
    classLabel: await app.nav.currentClassBtn.innerText().catch(() => null),
    text: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400),
  });
});
