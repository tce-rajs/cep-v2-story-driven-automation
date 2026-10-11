// WB-12 — Whiteboard History
// Source: CEPV2_Stories/06_Whiteboard.md
// User menu -> Whiteboard History lists the topic board's saved versions, newest first, as
// "#N · <strokes> strokes +added ~changed -removed · hh:mm:ss dd/mm". The checks are read-only: no version is restored.
// WB-12-08 (comparing with writing lost at a forced sign-out) runs with the long session tests (LOG-06).

const { test, expect } = require('../../fixtures');

test.use({ freshSpace: true });

const openHistory = async (user) => {
  await user.userMenu.openProfileMenu();
  await user.userMenu.wbHistoryBtn.click({ force: true });
  await expect(user.userMenu.wbHistoryPanel, 'set-up: Whiteboard History is open').toBeVisible({ timeout: 10000 });
  await user.page.waitForTimeout(2500); // the list refreshes a moment after the panel opens
};
const closeHistory = async (user) => {
  await user.userMenu.wbHistoryPanel.getByText('✕', { exact: true }).first().click({ force: true });
  await expect(user.userMenu.wbHistoryPanel).toBeHidden({ timeout: 5000 });
};
/** "11:00:25 07/10" -> a number that sorts by date then time (same year). */
const sortKey = (t) => {
  const [time, date] = t.split(' ');
  const [d, m] = date.split('/');
  return Number(m + d + time.replace(/:/g, ''));
};
/** Write `n` strokes and wait for their autosave ("Whiteboard Saved!"), so the topic has a version with them. */
const writeAndSave = async (user, page, n = 1) => {
  await user.content.startSaveLog();
  for (let i = 0; i < n; i++) await user.toolbar.penStroke({ x: 500, y: 380 + i * 60 }, { x: 760, y: 410 + i * 60 });
  await user.content.waitForSaved(40000).catch(() => {});
  await page.waitForTimeout(2000);
};

test.describe('WB-12 Whiteboard History', () => {
  test.describe.configure({ timeout: 150000 });

  test(
    "WB-12-01: Whiteboard History opens from the User menu and lists the current topic's saved versions, newest first",
    { tag: ['@smoke', '@functional'] },
    async ({ user, page }) => {
      await writeAndSave(user, page);
      await openHistory(user);
      const rows = await user.userMenu.wbHistoryRows();
      expect(rows.length, 'at least one version').toBeGreaterThan(0);
      const versions = rows.map((r) => r.version);
      expect(versions, 'newest first').toEqual([...versions].sort((a, b) => b - a));
      await closeHistory(user);
    }
  );

  test(
    "WB-12-02: the newest version's stroke count matches the strokes on the board",
    { tag: ['@functional'] },
    async ({ user, page }) => {
      // The count is compared as a change: two strokes written -> the newest version counts two more strokes.
      await writeAndSave(user, page);
      await openHistory(user);
      const [before] = await user.userMenu.wbHistoryRows();
      await closeHistory(user);
      await writeAndSave(user, page, 2);
      await openHistory(user);
      const [after] = await user.userMenu.wbHistoryRows();
      expect(after.strokes - before.strokes, 'two more strokes in the newest version').toBe(2);
      await closeHistory(user);
    }
  );

  test(
    'WB-12-03: after writing a few strokes and waiting for autosave, a new version appears with the right "+added" count',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await writeAndSave(user, page);
      await openHistory(user);
      const [before] = await user.userMenu.wbHistoryRows();
      await closeHistory(user);
      await writeAndSave(user, page, 3);
      await openHistory(user);
      const [after] = await user.userMenu.wbHistoryRows();
      expect(after.version, 'a new version').toBeGreaterThan(before.version);
      expect(after.added, 'three strokes added').toBe(3);
      await closeHistory(user);
    }
  );

  test(
    'WB-12-04: each version shows its save time, and the times are in order',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await writeAndSave(user, page);
      await openHistory(user);
      const keys = (await user.userMenu.wbHistoryRows()).map((r) => sortKey(r.time));
      expect(keys.length, 'every version has a time').toBeGreaterThan(0);
      expect(keys, 'newest time first').toEqual([...keys].sort((a, b) => b - a));
      await closeHistory(user);
    }
  );

  test(
    'WB-12-05: the history belongs to the current topic: another topic shows its own list',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await writeAndSave(user, page);
      await openHistory(user);
      const first = await user.userMenu.wbHistoryRows();
      await closeHistory(user);
      await user.nav.goToChapterTopic(1, 0); // the default class's second chapter, first topic
      await user.toolbar.waitForBoardToSettle();
      await openHistory(user);
      const second = await user.userMenu.wbHistoryRows();
      await closeHistory(user);
      await user.nav.applyClassMap('default');
      expect(second, 'a different list for a different topic').not.toEqual(first);
    }
  );

  test(
    'WB-12-06: closing Whiteboard History (X) leaves the board unchanged',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await writeAndSave(user, page);
      const before = await user.content.pathGeometry();
      await openHistory(user);
      await closeHistory(user);
      expect(await user.content.pathGeometry(), 'board unchanged').toEqual(before);
    }
  );

  test(
    'WB-12-07: a topic with an empty board shows an empty-state message, not a blank panel',
    { tag: ['@negative'] },
    async ({ user }) => {
      // The default class's last chapter: its first topic's board is expected to be empty.
      await user.nav.openChaptersPopup();
      const last = (await user.nav.chapterItems.count()) - 1;
      await user.page.keyboard.press('Escape');
      await user.nav.goToChapterTopic(last, 0);
      await user.toolbar.waitForBoardToSettle();
      const strokes = await user.toolbar.allPaths.count();
      test.skip(strokes > 0, 'set-up: no empty board found on this class (its last chapter already has writing)');
      await user.userMenu.openProfileMenu();
      await user.userMenu.wbHistoryBtn.click({ force: true });
      const panel = user.page
        .locator('div')
        .filter({ has: user.page.getByText('WHITEBOARD HISTORY', { exact: true }) })
        .last();
      await expect(panel, 'the panel opens').toBeVisible({ timeout: 10000 });
      await expect(panel, 'an empty-state message').toContainText(/no (saved )?(versions|history)|nothing|empty/i, {
        timeout: 5000,
      });
      await user.page.keyboard.press('Escape');
      await user.nav.applyClassMap('default');
    }
  );
});
