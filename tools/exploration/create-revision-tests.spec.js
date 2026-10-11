// Set-up (browser, main account): create fresh Revision Tests in Plan Mode on 10A Science 3.4, for the next build's
// full-class run. Titles come from REVISION_TITLES (comma separated).
const { test, expect } = require('../../fixtures');
test.describe.configure({ timeout: 600000 });
const log = (k, v) => console.log(`PROBE ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);

test('create Revision Tests', async ({ app, page }) => {
  const titles = (process.env.REVISION_TITLES || '').split(',').filter(Boolean);
  await app.guest.open();
  await app.signIn(process.env.VALID_PIN);
  await app.nav.resetToClass('Class 10', 'A', 'Science');
  await app.nav.goToChapterTopic(2, 3);
  const { switched } = await app.compass.switchToPlanningMode();
  expect(switched).toBe(true);
  await page.waitForTimeout(6000);
  for (const title of titles) {
    await app.plan.openSection('Question Bank');
    await page.waitForTimeout(3000);
    await app.plan.createRevisionTestBtn.click();
    await page.waitForTimeout(2500);
    const boxes = app.plan.selectionCheckboxes;
    const pick = Math.min(3, Math.floor((await boxes.count()) / 2));
    for (let i = 0; i < pick; i++) await boxes.nth(i * 2).click({ force: true });
    await page.waitForTimeout(1000);
    const bars = page.getByText(/Create Revision Test/).filter({ visible: true });
    let target = bars.first();
    let lowest = -1;
    for (let i = 0; i < (await bars.count()); i++) {
      const b = await bars.nth(i).boundingBox();
      if (b && b.y > lowest) {
        lowest = b.y;
        target = bars.nth(i);
      }
    }
    await target.click({ force: true });
    await page.waitForTimeout(3000);
    await page.locator('input#quizTitle').fill(title);
    const saved = page
      .waitForResponse((r) => r.request().method() === 'POST' && /compass\/test/.test(r.url()), { timeout: 30000 })
      .catch(() => null);
    await page.getByRole('button', { name: /Save Revision Test/i }).click();
    const r = await saved;
    log(`${title}`, r ? `${r.status()} (${pick} questions)` : 'no save request');
    await page.waitForTimeout(3000);
  }
});
