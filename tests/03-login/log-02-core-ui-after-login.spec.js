// LOG-02 — All core UI components load after a valid login
// Source: CEPV2_Stories/03_Login.md
// One test per component and per check (split 2026-09-28), so one failing piece cannot hide behind the others.

const { test, expect } = require('../../fixtures');
const { TOOL_IDS } = require('../../pages/toolbar.page');
const { HeaderPage } = require('../../pages/header.page');

/** The element is in the top-left corner of the window. */
const expectTopLeft = async (header, el) => {
  const { width, height } = await header.viewportSize();
  const box = await el.boundingBox();
  expect(box.x, 'left of centre').toBeLessThan(width * 0.15);
  expect(box.y, 'top of screen').toBeLessThan(height * 0.2);
};

/** The calendar is in the top-right corner; returns what it shows next to the app's own clock. */
const readCalendar = async (header) => {
  await expect(header.calendar).toBeVisible();
  const { width, height } = await header.viewportSize();
  const box = await header.calendar.boundingBox();
  expect(box.x + box.width, 'right edge near right of screen').toBeGreaterThan(width * 0.9);
  expect(box.y, 'top of screen').toBeLessThan(height * 0.15);
  return header.readDateTime();
};

test.describe('LOG-02 All core UI components load after a valid login', () => {
  test(
    'LOG-02-01: the full toolbar, including Magnet, is visible',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      for (const id of TOOL_IDS) {
        await expect.soft(user.toolbar.tool(id), id).toBeVisible();
      }
      // Unlike signed-out (PRE-03-02), Magnet exists.
      await expect(user.magnet.tool).toBeVisible();
    }
  );

  test('LOG-02-09: Magnet opens its menu', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    // Class 12A Physics is a class where Magnet lists its entries.
    await user.nav.applyClassMap('default');
    await user.magnet.open();
    await expect(user.magnet.noticeItem).toBeVisible();
  });

  test(
    'LOG-02-02: class / curriculum navigation (class, chapter and topic buttons) is visible',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await expect(user.nav.currentClassBtn).toBeVisible();
      await expect(user.nav.currentChapterTopicBtn).toBeVisible();
    }
  );

  test(
    'LOG-02-10: the class button opens the class list (Recent and All My Classes)',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.nav.openClassPopup();
      try {
        await expect(user.nav.recentClassesTab).toBeVisible();
        await expect(user.nav.allMyClassesTab).toBeVisible();
      } finally {
        await user.nav.openClassPopup(); // toggles closed
      }
    }
  );

  test(
    'LOG-02-11: the chapter/topic button opens the chapter list, and a chapter shows its topics',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.nav.openChaptersPopup();
      await expect(user.nav.chapterItems.first()).toBeVisible();
      await user.nav.chapterItems.first().click({ timeout: 10000 });
      await expect(user.nav.topicItems.first()).toBeVisible();
    }
  );

  test('LOG-02-03: Playlist is visible', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await user.playlist.ensureDrawerVisible();
    await expect(user.playlist.contentsTile).toBeVisible();
    await expect(user.playlist.optionsMenuBtn).toBeVisible();
  });

  test('LOG-02-12: the Playlist options menu opens', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await user.playlist.ensureDrawerVisible();
    await user.playlist.openOptionsMenu();
    try {
      await expect(user.playlist.filterOptions.first()).toBeVisible();
    } finally {
      await user.playlist.closeOptionsMenu();
    }
  });

  test('LOG-02-04: Add Resource is visible and functional', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await expect(user.addResource.addResourcesTrigger).toBeVisible();
    await user.addResource.openPickerReliably(user.addResource.actions.create);

    for (const [name, action] of Object.entries(user.addResource.actions)) {
      await expect.soft(action, `Add Resource option: ${name}`).toBeVisible();
    }
  });

  test(
    'LOG-02-05: the header logo displays in the top-left corner',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const header = user.header;
      await expect(header.logoContainer).toBeVisible();
      await expect(header.logoImage).toBeVisible();
      await expectTopLeft(header, header.logoContainer);
    }
  );

  test(
    'LOG-02-13: the header version number displays in the top-left corner',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const header = user.header;
      await expect(header.versionText).toHaveText(/^v\s*\d+\.\d+\.\d+/);
      await expectTopLeft(header, header.versionText);
    }
  );

  test(
    'LOG-02-06: the header shows the current time in the top-right corner',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const shown = await readCalendar(user.header);
      expect(shown.shownMinutes, `time in "${shown.shown}"`).not.toBeNull();
      expect(HeaderPage.minuteGap(shown.shownMinutes, shown.nowMinutes)).toBeLessThanOrEqual(2);
    }
  );

  test(
    'LOG-02-14: the header shows the current date in the top-right corner',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const shown = await readCalendar(user.header);
      expect(shown.shownDate, `date in "${shown.shown}"`).toBe(shown.nowDate);
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
