// Probe: what the Plan Mode header offers (for HDR-06-01). Not part of any suite.
const path = require('path');
const fs = require('fs');
const { test } = require('../../fixtures');

test.use({ classMap: 'default' });
test('probe Plan Mode header', async ({ user, page }) => {
  const out = path.join(__dirname, '..', '..', 'report', 'exploration', 'plan-header');
  fs.mkdirSync(out, { recursive: true });
  await user.compass.switchToPlanningMode();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(out, 'plan-header.png') });
  const items = await page.evaluate(() =>
    [...document.querySelectorAll('button, a, img, [role="button"], [data-qa-id]')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.top < 120;
      })
      .map((e) => `${e.tagName}|${e.getAttribute('data-qa-id') || ''}|${(e.className || '').toString().slice(0, 40)}|${(e.innerText || e.alt || '').trim().slice(0, 30)}`)
  );
  fs.writeFileSync(path.join(out, 'header.json'), JSON.stringify(items, null, 2));
  await user.compass.switchToTeachingMode().catch(() => {});
});
