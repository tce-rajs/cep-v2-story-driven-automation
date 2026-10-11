// Phase 1 exploration — FLOW-02, second pass: set the new teacher's PIN once, watching the network, then sign out and
// sign in with that PIN. Account: the AutoQA teacher created in Admin (NEW_USER_* in .env). Evidence: flow-02/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');
const { NewUserPage } = require('../../pages/new-user.page');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-02');
const LOG = path.join(OUT, 'log-b.json');
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
};

test.setTimeout(10 * 60 * 1000);

test('explore FLOW-02 set the PIN and use it', async ({ app, page }) => {
  const { pin, newPassword } = NewUserPage.credentials;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const calls = [];
  page.on('response', async (r) => {
    if (r.request().method() === 'GET') return;
    let body = '';
    try {
      body = (await r.text()).slice(0, 200);
    } catch {
      body = '';
    }
    calls.push(
      `${r.request().method()} ${r.status()} ${r
        .url()
        .replace(/^https?:\/\/[^/]+/, '')
        .slice(0, 100)} ${body}`
    );
  });
  const isIn = () => app.login.avatar.isVisible().catch(() => false);

  // A. Password → Set PIN → Verify PIN
  await app.newUser.signInWithPassword(newPassword);
  await app.newUser.pinInputs.first().waitFor({ state: 'visible', timeout: 20000 });
  calls.length = 0;
  // Type one digit per box like a teacher: tap the box, press the key, check it landed.
  const typeSlowly = async (boxes, step) => {
    const seen = [];
    for (let i = 0; i < pin.length; i++) {
      await boxes.nth(i).click();
      await page.keyboard.press(pin[i]);
      await page.waitForTimeout(400);
      seen.push(await boxes.evaluateAll((els) => els.map((e) => e.value).join('')));
    }
    note(`${step}-typing`, { afterEachKey: seen });
  };
  await typeSlowly(app.newUser.pinInputs, 'D-set');
  await page.waitForTimeout(1500);
  await shot('D-verify-pin');
  if (await app.newUser.pinVerifyInputs.first().isVisible().catch(() => false))
    await typeSlowly(app.newUser.pinVerifyInputs, 'D-verify');
  await page.waitForTimeout(1500);
  if (await app.newUser.pinSetBtn.isVisible().catch(() => false)) await app.newUser.pinSetBtn.click({ force: true });
  await page.waitForTimeout(6000);
  await shot('D-after-set-pin');
  note('D-set-pin', {
    signedIn: await isIn(),
    pinStillAsked: await app.newUser.pinInputs
      .first()
      .isVisible()
      .catch(() => false),
    text: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300),
    calls: calls.slice(0, 20),
  });

  // B. Sign out, then sign in with the new PIN
  if (await isIn()) {
    await app.userMenu.signOut().catch((e) => note('E-signout-error', { error: e.message.split('\n')[0] }));
    await page.waitForTimeout(3000);
  }
  calls.length = 0;
  await app.login.openSignIn().catch(() => {});
  await page.waitForTimeout(1500);
  await app.login.enterPin(pin);
  await page.waitForTimeout(6000);
  await shot('E-signin-with-pin');
  note('E-signin-with-pin', {
    signedIn: await isIn(),
    invalidPin: await page
      .getByText(/invalid pin/i)
      .isVisible()
      .catch(() => false),
    welcome: await app.newUser.welcomeMessage.isVisible().catch(() => false),
    calls: calls.slice(0, 20),
  });
});
