// Phase 1 exploration — FLOW-23 on the panel: after Admin reset the AutoQA teacher's PIN and password, the old PIN
// and the old password must fail, and the default password must force a new password and a new PIN.
// Evidence: report/exploration/flow-02/log-c.json.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');
const { NewUserPage } = require('../../pages/new-user.page');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-02');
const LOG = path.join(OUT, 'log-c.json');
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
};
const NEXT_PASSWORD = process.env.NEW_USER_NEXT_PASSWORD || 'AutoQa@9xafm';

test.setTimeout(10 * 60 * 1000);

test('explore FLOW-23 resets as the teacher sees them', async ({ app, page }) => {
  const { pin, newPassword } = NewUserPage.credentials;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const isIn = () => app.login.avatar.isVisible().catch(() => false);
  const visible = (re) =>
    page
      .getByText(re)
      .first()
      .isVisible()
      .catch(() => false);

  // A. Old PIN
  await app.login.open();
  await app.login.openSignIn();
  await page.waitForTimeout(1500);
  await app.login.enterPin(pin);
  await page.waitForTimeout(5000);
  await shot('F-old-pin');
  note('F-old-pin', { signedIn: await isIn(), invalidPin: await visible(/invalid pin/i) });
  await page.keyboard.press('Escape');

  // B. Old password
  await app.newUser.signInWithPassword(newPassword).catch(() => {});
  await page.waitForTimeout(5000);
  await shot('G-old-password');
  note('G-old-password', {
    signedIn: await isIn(),
    message: (await page.locator('.error, .alert, [class*="error"]').filter({ visible: true }).allInnerTexts()).join(
      ' | '
    ),
  });
  await page.keyboard.press('Escape');

  // C. Default password → forced new password → new PIN
  await app.newUser.signInWithPassword(NewUserPage.defaultPassword);
  await page.waitForTimeout(5000);
  await shot('H-default-password');
  const forced = await app.newUser.setPasswordHeading.isVisible().catch(() => false);
  note('H-default-password', { forcedNewPassword: forced, signedIn: await isIn() });
  if (forced) {
    await app.newUser.setNewPassword(NEXT_PASSWORD);
    await page.waitForTimeout(5000);
    await shot('H-after-new-password');
    note('H-after-new-password', {
      pinSetupAsked: await app.newUser.pinInputs
        .first()
        .isVisible()
        .catch(() => false),
      signedIn: await isIn(),
    });
  }
});
