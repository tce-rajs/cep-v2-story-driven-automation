// LOG-02 — All core UI components load after a valid login
// Source: CEPV2_Stories/03_Login.md
// Each component is asserted on its own so one failing piece cannot hide behind the others.

const { test, expect } = require('../../fixtures');
const { TOOL_IDS } = require('../../pages/toolbar.page');
const { HeaderPage } = require('../../pages/header.page');

test.describe('LOG-02 All core UI components load after a valid login', () => {
  test(
    'LOG-02-01: the full toolbar, including Magnet, is visible and functional',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      // Class 12A Physics is a class where Magnet lists its entries.
      await user.nav.applyClassMap('default');

      for (const id of TOOL_IDS) {
        await expect.soft(user.toolbar.tool(id), id).toBeVisible();
      }
      // Unlike signed-out (PRE-03-02), Magnet exists and opens a menu.
      await expect(user.magnet.tool).toBeVisible();
      await user.magnet.open();
      await expect(user.magnet.noticeItem).toBeVisible();
    }
  );

  test(
    'LOG-02-02: class / curriculum navigation (grade, chapter, topic) is visible and functional',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await expect(user.nav.currentClassBtn).toBeVisible();
      await expect(user.nav.currentChapterTopicBtn).toBeVisible();

      await user.nav.openClassPopup();
      await expect(user.nav.recentClassesTab).toBeVisible();
      await expect(user.nav.allMyClassesTab).toBeVisible();
      await user.nav.openClassPopup(); // toggles closed

      await user.nav.openChaptersPopup();
      await expect(user.nav.chapterItems.first()).toBeVisible();
      await user.nav.chapterItems.first().click({ timeout: 10000 });
      await expect(user.nav.topicItems.first()).toBeVisible();
    }
  );

  test('LOG-02-03: Playlist is visible and functional', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await user.playlist.ensureDrawerVisible();
    await expect(user.playlist.contentsTile).toBeVisible();
    await expect(user.playlist.optionsMenuBtn).toBeVisible();

    await user.playlist.openOptionsMenu();
    await expect(user.playlist.filterOptions.first()).toBeVisible();
    await user.playlist.closeOptionsMenu();
  });

  test('LOG-02-04: Add Resource is visible and functional', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await expect(user.addResource.addResourcesTrigger).toBeVisible();
    await user.addResource.openPickerReliably(user.addResource.actions.create);

    for (const [name, action] of Object.entries(user.addResource.actions)) {
      await expect.soft(action, `Add Resource option: ${name}`).toBeVisible();
    }
  });

  test(
    'LOG-02-05: the header logo and version display in the top-left corner',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const header = user.header;
      await expect(header.logoContainer).toBeVisible();
      await expect(header.logoImage).toBeVisible();
      await expect(header.versionText).toHaveText(/^v\s*\d+\.\d+\.\d+/);

      const { width, height } = await header.viewportSize();
      const box = await header.logoContainer.boundingBox();
      expect(box.x).toBeLessThan(width * 0.15);
      expect(box.y).toBeLessThan(height * 0.2);
    }
  );

  test(
    'LOG-02-06: the header date and time display in the top-right corner',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const header = user.header;
      await expect(header.calendar).toBeVisible();

      const { width, height } = await header.viewportSize();
      const box = await header.calendar.boundingBox();
      expect(box.x + box.width).toBeGreaterThan(width * 0.9);
      expect(box.y).toBeLessThan(height * 0.15);

      const shown = await header.readDateTime();
      expect(shown.shownMinutes, `time in "${shown.shown}"`).not.toBeNull();
      expect(HeaderPage.minuteGap(shown.shownMinutes, shown.nowMinutes)).toBeLessThanOrEqual(2);
      expect(shown.shownDate).toBe(shown.nowDate);
    }
  );

  test('LOG-02-07: the whiteboard loads and is usable', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await expect(user.toolbar.wbSvg).toBeVisible();
    const before = await user.toolbar.waitForBoardToSettle();
    await user.toolbar.penStroke({ x: 300, y: 300 }, { x: 600, y: 350 });
    expect(await user.toolbar.pathCount()).toBeGreaterThan(before);
  });

  test(
    'LOG-02-08: if one component fails to load, the rest of the UI stays usable',
    { tag: ['@negative', '@edge'] },
    async ({ app, page }) => {
      // Make the Playlist's data calls fail, then sign in. The Playlist may show nothing or an error,
      // but the header, toolbar and whiteboard must all still come up and work.
      await page.route(/playlist|resources?\b/i, (route) =>
        ['fetch', 'xhr'].includes(route.request().resourceType()) ? route.abort() : route.continue()
      );
      await app.signIn();

      await expect(app.header.logoContainer).toBeVisible();
      await expect(app.header.calendar).toBeVisible();
      await expect(app.toolbar.container).toBeVisible();
      const before = await app.toolbar.waitForBoardToSettle();
      await app.toolbar.penStroke({ x: 300, y: 300 }, { x: 600, y: 350 });
      expect(await app.toolbar.pathCount()).toBeGreaterThan(before);
      await expect(app.login.avatar).toBeVisible();
    }
  );
});
