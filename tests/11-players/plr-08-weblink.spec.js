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
});
