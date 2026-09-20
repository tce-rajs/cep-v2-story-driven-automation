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
});
