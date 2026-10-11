// Probe: why a test-added card cannot be removed (11A Mathematics 1.1, "AutoTest-1790055927940"). Read-only.
const path = require('path');
const fs = require('fs');
const { test } = require('../../fixtures');

test.use({ classMap: 'compassBaseline' });
test('probe leftover card', async ({ user, page }) => {
  const out = path.join(__dirname, '..', '..', 'report', 'cleanup');
  await user.playlist.ensureDrawerVisible().catch(() => {});
  await page.waitForTimeout(2000);
  const card = user.playlist.resourceCards.filter({ hasText: 'AutoTest-1790055927940' }).first();
  const info = await card.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      qa: el.getAttribute('data-qa-id'),
      box: [r.x, r.y, r.width, r.height],
      display: cs.display,
      visibility: cs.visibility,
      buttons: [...el.querySelectorAll('[data-qa-id]')].map((b) => b.getAttribute('data-qa-id')),
      html: el.outerHTML.slice(0, 600),
    };
  });
  await user.playlist.enterEditMode().catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(out, 'leftover-card.png') });
  const inEdit = await card.evaluate((el) => [...el.querySelectorAll('[data-qa-id]')].map((b) => b.getAttribute('data-qa-id')));
  fs.writeFileSync(path.join(out, 'leftover-card.json'), JSON.stringify({ info, inEdit }, null, 2));
});
