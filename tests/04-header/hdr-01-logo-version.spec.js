// HDR-01 — Logo & Version
// Source: CEPV2_Stories/04_Header.md
// HDR-01-02 also names Plan Mode; the Plan Mode half is manual-only (PROCESS.md), Teach Mode is checked here.

const { test, expect } = require('../../fixtures');

test.describe('HDR-01 Logo & Version', () => {
  test('HDR-01-01: the logo displays correctly in the header', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await expect(user.header.logoContainer).toBeVisible();
    await expect(user.header.logoImage).toBeVisible();

    const box = await user.header.logoImage.boundingBox();
    expect(box.width, 'logo has real width').toBeGreaterThan(20);
    expect(box.height, 'logo has real height').toBeGreaterThan(20);
    // The logo is drawn as a CSS background image: confirm one is actually applied.
    const background = await user.header.logoImage.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(background).not.toBe('none');
  });

  test(
    'HDR-01-02: the header shows the correct build/version number',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      // The build is the same before and after signing in, so the header must show the identical value
      // in Guest Mode and once signed in.
      await app.login.open();
      await expect(app.header.versionText).toBeVisible();
      const guestVersion = (await app.header.versionText.innerText()).trim();
      expect(guestVersion).toMatch(/^v\s*\d+\.\d+\.\d+/);

      await app.signIn();
      await expect(app.header.versionText).toBeVisible();
      expect((await app.header.versionText.innerText()).trim()).toBe(guestVersion);
    }
  );

  test(
    'HDR-01-03: tapping the logo keeps the teacher on the board with their writing in place',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await user.content.startOnFreshSpace();
      await user.toolbar.penStroke({ x: 600, y: 400 }, { x: 860, y: 470 });
      const before = await user.toolbar.pathCount();
      await user.header.logoImage.click({ force: true });
      await page.waitForTimeout(3000);
      await expect(page, 'still on the board').toHaveURL(/\/teach\/whiteboard/);
      await expect(user.login.avatar, 'still signed in').toBeVisible();
      expect(await user.toolbar.pathCount(), 'the writing is still there').toBe(before);
    }
  );

  test(
    'HDR-01-04: the version shown is never blank and matches the version in the User menu',
    { tag: ['@negative'] },
    async ({ user, page }) => {
      const headerVersion = ((await user.header.versionText.innerText()) || '').replace(/^v\s*/i, '').trim();
      expect(headerVersion, 'the header version is not blank').not.toBe('');
      expect(headerVersion, 'a real version number').toMatch(/^\d+\.\d+\.\d+/);
      await user.userMenu.openProfileMenu();
      await user.userMenu.buildInfoBtn.click({ force: true });
      // The User menu's Build Version (release notes, in a Shadow DOM component) shows the same number.
      await expect(page.getByText(headerVersion).first(), `the User menu shows ${headerVersion}`).toBeVisible({
        timeout: 10000,
      });
    }
  );
});
