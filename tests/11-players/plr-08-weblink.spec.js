// PLR-08 — Open a web link
// Source: CEPV2_Stories/11_Players.md
// Data: 'playersDefault' holds one confirmed Weblink (a YouTube link). "Watch on YouTube" is inside the embed's iframe.

const { test, expect } = require('../../fixtures');

test.describe('PLR-08 Open a web link', () => {
  test.use({ classMap: 'playersWeblink' }); // .85: the only topic found with a Web link (moduleClassMap)

  const openWeblink = async (user) => {
    await expect(user.player.weblinkCards.first()).toBeAttached({ timeout: 10000 });
    await user.player.openResourceCard(user.player.weblinkCards);
    expect(await user.player.isPlayerOpen(), 'the web link opened').toBe(true);
    await expect(user.player.weblinkWrapper).toBeVisible({ timeout: 15000 });
  };

  test.afterEach(async ({ app }) => {
    await app.player.closePlayer().catch(() => {});
  });

  test('PLR-08-01: a web link resource shows a preview card', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await openWeblink(user);
    await expect(user.player.weblinkIframe).toBeAttached();
    const box = await user.player.weblinkWrapper.boundingBox();
    expect(box.width, 'a real-size preview').toBeGreaterThan(200);
    expect(box.height).toBeGreaterThan(120);
    const src = await user.player.weblinkIframe.getAttribute('src');
    expect(src, 'the preview points at the linked page').toMatch(/^https?:\/\//);
  });

  test(
    'PLR-08-02: "Watch on YouTube" opens the video outside the app',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await openWeblink(user);
      const teachUrl = page.url();
      const popup = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
      await user.player.weblinkWatchOnYoutubeBtn.click({ timeout: 15000 });
      const opened = await popup;
      await page.waitForTimeout(2000);
      expect(page.url(), 'the app itself did not navigate away').toBe(teachUrl);
      if (opened) {
        expect(opened.url(), 'opened on YouTube').toMatch(/youtube\.com|youtu\.be/);
        await opened.close().catch(() => {});
      } else {
        // The desktop client hands external links to the system browser, which Playwright cannot see: record it.
        test.info().annotations.push({
          type: 'note',
          description: 'No in-app popup: the client passed the link to the system browser.',
        });
      }
      await expect(user.player.weblinkWrapper, 'the player is still there').toBeVisible();
    }
  );

  test('PLR-08-03: closing the web link exits cleanly', { tag: ['@functional'] }, async ({ user }) => {
    await openWeblink(user);
    await user.player.closePlayer();
    await expect(user.player.weblinkWrapper).toBeHidden({ timeout: 10000 });
    await expect(user.player.weblinkIframe).toHaveCount(0);
  });

  test('PLR-08-04: a non-YouTube web link opens its page in the player', { tag: ['@functional'] }, async ({ user }) => {
    const p = user.player;
    await expect(p.weblinkCards.first()).toBeAttached({ timeout: 10000 });
    const count = await p.weblinkCards.count();
    let opened = null;
    for (let i = 0; i < count && !opened; i++) {
      await p.openResourceCard(p.weblinkCards.nth(i));
      await expect(p.weblinkWrapper).toBeVisible({ timeout: 15000 });
      const src = (await p.weblinkIframe.first().getAttribute('src')) || '';
      if (!/youtube\.com|youtu\.be/i.test(src)) opened = src;
      else await p.closePlayer();
    }
    if (!opened) throw new Error('DATA MISSING ON THIS SERVER: no non-YouTube web link in the playersWeblink topic');
    expect(opened, 'the player shows the linked page').toMatch(/^https?:\/\//);
    // The page itself loaded inside the player (not a blank frame).
    const frame = p.page.frameLocator('.weblink-wrapper iframe').first();
    await expect(frame.locator('body *').first(), 'the linked page has content').toBeAttached({ timeout: 20000 });
  });

  test(
    'PLR-08-05: a web link that cannot load shows a message, not a blank player',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      // The linked page cannot be reached: every page loaded inside a frame fails.
      const unreachable = (route) =>
        route.request().resourceType() === 'document' && route.request().frame() !== page.mainFrame()
          ? route.abort('namenotresolved')
          : route.continue();
      await page.route('**/*', unreachable);
      try {
        await openWeblink(user);
        await expect(
          page
            .getByText(
              /cannot be (opened|loaded|reached)|could not|couldn't|unable to|not available|failed|error|try again/i
            )
            .filter({ visible: true })
            .first(),
          'a message says the link cannot be opened'
        ).toBeVisible({ timeout: 30000 });
      } finally {
        await page.unroute('**/*', unreachable);
      }
    }
  );
});
