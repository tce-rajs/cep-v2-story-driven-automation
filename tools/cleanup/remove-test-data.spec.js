// Removes ONLY the Playlist items the automation itself added, from every class/topic the suite uses
// (config/moduleClassMap.js). An item is removed only when BOTH are true:
//   1. it is an owned asset card (data-qa-id="playlist-asset-card" — uploaded / created by the account, never
//      curriculum or library content), and
//   2. its title is a name the tests give: starts with AutoTest / AutoQA / Explore short / DropIt-, or is exactly the
//      name of one of the suite's upload files in test-data/ (board-photo, worksheet-3-pages, …).
// Dry run by default (lists what would be removed). Remove with CLEANUP_APPLY=1.
// npx playwright test --config=playwright.explore.config.js tools/cleanup/remove-test-data.spec.js
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');
const { MODULE_CLASS_MAP } = require('../../config/moduleClassMap');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.env.CLEANUP_APPLY === '1';
const LOG = path.join(ROOT, 'report', 'cleanup', `cleanup-${APPLY ? 'applied' : 'dry-run'}.json`);
fs.mkdirSync(path.dirname(LOG), { recursive: true });
const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : [];
const save = () => fs.writeFileSync(LOG, JSON.stringify(log, null, 2));

// Names of the suite's upload files, without extension.
const uploadNames = new Set();
for (const dir of ['positive', 'negative']) {
  const p = path.join(ROOT, 'test-data', dir);
  if (fs.existsSync(p)) for (const f of fs.readdirSync(p)) uploadNames.add(f.replace(/\.[^.]+$/, '').toLowerCase());
}
const isTestItem = (title) => {
  const t = title.trim();
  return /^(AutoTest|AutoQA|Explore short|DropIt-)/i.test(t) || uploadNames.has(t.toLowerCase());
};

// One entry per distinct place (account + class + topic) the tests use.
const places = new Map();
for (const [key, v] of Object.entries(MODULE_CLASS_MAP)) {
  if (!v || !v.grade) continue;
  const id = [v.account, v.grade, v.division, v.subject, v.chapterIndex ?? '-', v.topicIndex ?? '-'].join('|');
  if (!places.has(id)) places.set(id, key);
}

// A card added by the OTHER test account shows in this account's Playlist but has no remove control. CLEANUP_SWAP=1
// visits the same places signed in as the other account (VALID_PIN ↔ VALID_PIN_2), via temporary class-map entries
// that exist only in this run.
if (process.env.CLEANUP_SWAP === '1') {
  const swapped = new Map();
  for (const [place, key] of places) {
    const entry = MODULE_CLASS_MAP[key];
    const other = entry.account === 'VALID_PIN_2' ? 'VALID_PIN' : 'VALID_PIN_2';
    MODULE_CLASS_MAP[`${key}__as_other`] = { ...entry, account: other };
    swapped.set(`${place} (as ${other})`, `${key}__as_other`);
  }
  places.clear();
  for (const [p, k] of swapped) places.set(p, k);
}

test.setTimeout(10 * 60 * 1000);

for (const [place, key] of places) {
  test.describe(`clean ${key}`, () => {
    test.use({ classMap: key });
    test(`remove test-added Playlist items — ${place}`, async ({ user, page }) => {
      await user.playlist.ensureDrawerVisible().catch(() => {});
      await page.waitForTimeout(2000);
      const topic = ((await user.nav.currentChapterTopicBtn.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      const cards = user.playlist.resourceCards;
      const found = [];
      const n = await cards.count();
      for (let i = 0; i < n; i++) {
        const card = cards.nth(i);
        const owned = (await card.getAttribute('data-qa-id').catch(() => '')) === 'playlist-asset-card';
        const title = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (owned && isTestItem(title)) found.push(title);
      }
      const removed = [];
      if (APPLY) {
        for (const title of found) {
          const card = cards
            .filter({ hasText: title })
            .filter({ has: page.locator('[data-qa-id]') })
            .first();
          try {
            // Cards far along the strip are off-screen: bring the card into view first, then remove it.
            await user.playlist.enterEditMode();
            await card.scrollIntoViewIfNeeded({ timeout: 10000 });
            await user.playlist.removeAssetCard(card);
            await page.waitForTimeout(1000);
            const finish = page.locator('button:visible', { hasText: /finish editing/i });
            if (
              await finish
                .last()
                .isVisible()
                .catch(() => false)
            )
              await finish.last().click({ timeout: 10000 });
            await page.waitForTimeout(1500);
            removed.push(title);
          } catch (e) {
            log.push({ place, topic, title, error: e.message.split('\n')[0] });
          }
        }
      }
      log.push({ place, key, topic, cardsOnTopic: n, testItems: found, removed });
      save();
    });
  });
}
