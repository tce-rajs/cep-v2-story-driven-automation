// Phase 1 — FLOW-23 Admin: Reset PIN and Reset Password on the AutoQA teacher (NEW_USER_USERNAME in .env), now that
// the teacher has set a password and a PIN on the panel. Only that teacher is touched.
// node tools/exploration/explore-flow-23d-admin-resets.js
const { signIn, evidence } = require('./admin-explore-lib');

const USERNAME = process.env.NEW_USER_USERNAME;

(async () => {
  if (!/^autoqa\./i.test(USERNAME || '')) throw new Error('NEW_USER_USERNAME must be an AutoQA teacher');
  const ev = evidence('flow-23/resets');
  const { browser, page } = await signIn();
  const calls = [];
  page.on('response', async (r) => {
    if (r.request().method() === 'GET' || /sso\/(token|extend)/.test(r.url())) return;
    let body = '';
    try {
      body = (await r.text()).slice(0, 200);
    } catch {
      body = '';
    }
    calls.push(`${r.request().method()} ${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} ${body}`);
  });
  const row = () => page.locator('tr').filter({ hasText: USERNAME }).first();
  const openTeachers = async () => {
    await page
      .getByText(/^\s*MANAGE\s*$/i)
      .first()
      .click();
    await page.waitForTimeout(800);
    await page
      .getByText(/Manage Teacher/i)
      .first()
      .click();
    await page.waitForTimeout(2500);
  };
  const reset = async (item) => {
    await openTeachers();
    await row().locator('td').last().locator('*').last().click({ force: true });
    await page.waitForTimeout(800);
    await page
      .getByText(new RegExp(`^\\s*${item}\\s*$`, 'i'))
      .filter({ visible: true })
      .first()
      .click();
    await page.waitForTimeout(1200);
    const dialog = (
      await page
        .locator('.modal-content')
        .filter({ visible: true })
        .first()
        .innerText()
        .catch(() => '')
    ).replace(/\s+/g, ' ');
    calls.length = 0;
    await page
      .getByRole('button', { name: /^\s*Reset\s*$/i })
      .filter({ visible: true })
      .first()
      .click();
    await page.waitForTimeout(3000);
    const toast = (
      await page
        .locator('.toast-message')
        .allInnerTexts()
        .catch(() => [])
    ).map((t) => t.trim());
    await ev.shot(page, `reset-${item.replace(/\W+/g, '-')}`);
    ev.note(item, {
      dialog,
      toast,
      calls: calls.slice(),
      rowAfter: (
        await row()
          .innerText()
          .catch(() => '')
      ).replace(/\s+/g, ' '),
    });
    await page.keyboard.press('Escape');
  };
  try {
    ev.note('teacher', { username: USERNAME });
    await reset('Reset PIN');
    await reset('Reset Password');
    await openTeachers();
    ev.note('list-after', {
      row: (
        await row()
          .innerText()
          .catch(() => '')
      ).replace(/\s+/g, ' '),
    });
  } catch (e) {
    ev.note('error', { error: e.message.split('\n')[0] });
    await ev.shot(page, 'error');
  } finally {
    await browser.close();
  }
})();
