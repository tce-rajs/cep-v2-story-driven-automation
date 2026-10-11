// Phase 1 — FLOW-07/08/21/22 in every class (read-only): every asset type in each class's current topic opens in
// its player and closes; Compass and Minimap open. Evidence: report/exploration/flow-07/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-07');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
};
const CLASSES = [
  ['Class 9', 'A', 'Science'],
  ['Class 10', 'A', 'Science'],
  ['Class 12', 'A', 'Computer Science'],
  ['Class 12', 'A', 'Physics'],
  ['Class 5', 'A', 'Mathematics'],
  ['Class 10', 'A', 'Mathematics'],
  ['Class 11', 'A', 'Mathematics'],
  ['Class 10', 'A', 'Sanskrit Literature'],
  ['Class 10', 'A', 'Political Science'],
  ['Class 10', 'A', 'Science Practicals'],
];

test.use({ classMap: 'default' });
test.setTimeout(60 * 60 * 1000);

test('explore assets, compass, minimap in every class', async ({ user, page }) => {
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${n}.png`) }).catch(() => {});
  for (const [g, d, s] of CLASSES) {
    const key = `${g}-${d}-${s}`.replace(/\s+/g, '-');
    try {
      await user.nav.resetToClass(g, d, s);
      await page.waitForTimeout(2500);
      await user.playlist.ensureDrawerVisible().catch(() => {});
      const types = await user.playlist.cardTypes().catch(() => []);
      const titles = await user.playlist.cardTitles().catch(() => []);
      const done = new Set();
      const results = [];
      for (let i = 0; i < titles.length; i++) {
        const type = types[i] || 'unknown';
        if (done.has(type)) continue;
        done.add(type);
        const card = user.playlist.resourceCards.nth(i);
        const t0 = Date.now();
        let opened = false;
        let leaked = '';
        try {
          await user.player.openResourceCard(card);
          opened = await user.player.isPlayerOpen(20000);
          leaked = await user.player.leakedText().catch(() => '');
        } catch (e) {
          leaked = `open error: ${e.message.split('\n')[0]}`;
        }
        if (!opened) await shot(`${key}-${type}-not-opened`);
        results.push({ type, title: titles[i], opened, seconds: Math.round((Date.now() - t0) / 1000), leaked });
        await user.player.closePlayer().catch(() => page.keyboard.press('Escape'));
        await page.waitForTimeout(1200);
      }
      // Compass (FLOW-21) and Minimap (FLOW-22)
      let compass = 'n/a';
      try {
        await user.compass.openTrigger();
        compass = 'opened';
        await page.keyboard.press('Escape');
      } catch (e) {
        compass = `error: ${e.message.split('\n')[0]}`;
      }
      let minimap = 'n/a';
      try {
        await user.minimap.open(user.toolbar);
        minimap = (await user.minimap.isOpen()) ? 'opened' : 'not open';
        await user.minimap.close();
      } catch (e) {
        minimap = `error: ${e.message.split('\n')[0]}`;
      }
      note(key, { cards: titles.length, types: [...new Set(types)], results, compass, minimap });
    } catch (e) {
      note(key, { error: e.message.split('\n')[0] });
      await shot(`${key}-error`);
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
});
