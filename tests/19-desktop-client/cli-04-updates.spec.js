// CLI-04 — Updates to a new build
// Source: CEPV2_Stories/19_DesktopClient.md
// CLI-04-01 checks the client shows the build the server serves (read from the server's own main script, as
// scripts/server-version.js does). CLI-04-02/03 are before/after checks around an update: run them just BEFORE the
// server is updated (they record a baseline for the build being served and stop, saying so) and again right AFTER it
// (on a new build they compare with that baseline). Nothing else should run in between: other tests change Playlists
// and recent classes. The baseline file is UPDATE_BASELINE_FILE (default: the system temp folder).
// The boards compared are read in a separate browser (12A Physics 1.2, 1.6, 1.7: boards nobody writes on; 1.7 is too
// heavy for the client), and the account is left on 1.1. Nothing is written or changed.
// CLI-04-04 (writing while the update is deployed) and CLI-04-05 (an old client with a new server) are not automated:
// they need a deployment at that moment, or an old client build.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('../../fixtures');
const { BASE_URL } = require('../../config/env');
const { openSecondDevice } = require('../00-flows/flow-helpers');

const BASELINE = process.env.UPDATE_BASELINE_FILE || path.join(os.tmpdir(), 'cep-v2-update-baseline.json');
const BOARDS = [1, 5, 6]; // 12A Physics chapter 1, topics 1.2, 1.6, 1.7 (0-based topic index)

/** The Teach build the server serves (e.g. 0.0.236), read from its main script. */
async function serverBuild() {
  const base = BASE_URL.replace(/\/?$/, '/');
  const html = await (await fetch(base)).text();
  const main = (html.match(/src="(main[^"]+\.js)"/) || [])[1];
  if (!main) throw new Error(`ENVIRONMENT: the server's main script was not found at ${base}`);
  const js = await (await fetch(base + main)).text();
  return [...js.matchAll(/["'](0\.0\.\d+)["']/g)]
    .map((m) => m[1])
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
}

const readBaseline = () => {
  try {
    return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  } catch {
    return {};
  }
};

/** Compare `now` with the baseline recorded under `key` on an older build; on the same build (or none yet), record
 * `now` and stop the test, saying to run it again after the update. Returns the baseline to compare with. */
function againstBaseline(key, build, now) {
  const all = readBaseline();
  const before = all[key];
  if (!before || before.build === build) {
    all[key] = { build, at: new Date().toISOString(), data: now };
    fs.writeFileSync(BASELINE, JSON.stringify(all, null, 2));
    test.skip(true, `baseline recorded for build ${build} (${BASELINE}); run again after the server is updated`);
  }
  test
    .info()
    .annotations.push({ type: 'note', description: `Compared build ${build} with ${before.build} (${before.at})` });
  return before.data;
}

test.describe('CLI-04 Updates to a new build', () => {
  test.describe.configure({ timeout: 600000 });

  test(
    'CLI-04-01: the header and User menu show the build number the server serves',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const build = await serverBuild();
      await expect(user.header.versionText, `the header shows ${build}`).toContainText(build);
      await user.userMenu.openProfileMenu();
      await user.userMenu.buildInfoBtn.click({ force: true });
      await expect(page.getByText(build).first(), `the User menu shows ${build}`).toBeVisible({ timeout: 10000 });
      await page.keyboard.press('Escape');
    }
  );

  test(
    'CLI-04-02: boards have the same stroke count after the update as before it',
    { tag: ['@regression'] },
    async () => {
      const build = await serverBuild();
      const second = await openSecondDevice(process.env.VALID_PIN);
      const counts = {};
      try {
        await second.app.nav.resetToClass('Class 12', 'A', 'Physics');
        for (const t of BOARDS) {
          await second.app.nav.goToChapterTopic(0, t);
          await expect(second.app.nav.currentChapterTopicBtn).toHaveText(new RegExp(`^\\s*1\\.${t + 1}\\s`), {
            timeout: 30000,
          });
          await second.app.page.waitForTimeout(5000);
          counts[`1.${t + 1}`] = await second.app.toolbar.waitForBoardToSettle(30);
        }
      } finally {
        await second.app.nav.goToChapterTopic(0, 0).catch(() => {});
        await second.close();
      }
      const before = againstBaseline('boards', build, counts);
      expect(counts, 'every board has the same number of strokes as before the update').toEqual(before);
    }
  );

  test(
    'CLI-04-03: Playlists, preferred resource types, subjects and recent classes are unchanged after the update',
    { tag: ['@regression'] },
    async ({ user }) => {
      const build = await serverBuild();
      const now = {};
      // Recent classes.
      await user.nav.openClassPopup();
      await user.nav.recentClassesTab.click({ timeout: 5000 }).catch(() => {});
      now.recentClasses = (await user.nav.recentClassButtons.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
      await user.nav.currentClassBtn.click();
      // A Playlist no test changes: 9A Hindi Language, chapter 1, first topic (read by the navigation tests only).
      await user.nav.resetToClass('Class 9', 'A', 'Hindi Language');
      await user.nav.goToChapterTopic(0, 0);
      await user.playlist.ensureDrawerVisible();
      await user.page.waitForTimeout(3000);
      now.playlist = await user.playlist.cardTitles();
      // Subjects and the preferred resource types (User menu -> Account).
      await user.userMenu.openAccountTab();
      now.subjects = (await user.userMenu.subjectChips.allInnerTexts())
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .sort();
      now.preferredTypes = ((await user.userMenu.preferredResourceTypeDropdown.innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim();
      await user.page.keyboard.press('Escape');
      const before = againstBaseline('account', build, now);
      expect.soft(now.playlist, 'the Playlist (order and resources)').toEqual(before.playlist);
      expect.soft(now.preferredTypes, 'the preferred resource types').toBe(before.preferredTypes);
      expect.soft(now.subjects, 'the subjects').toEqual(before.subjects);
      expect.soft(now.recentClasses, 'the recent classes').toEqual(before.recentClasses);
    }
  );
});
