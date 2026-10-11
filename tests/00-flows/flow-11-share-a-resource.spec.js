// FLOW-11 — Sharing a resource
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: 'playlistGeneral' (Class 12A Physics 1.1). Each test shares a resource it creates itself (Add Resource ->
// Create) and removes it again. Sharing really sends the resource to other people, so FLOW-11-02 presses Send only
// with SHARE_REAL=1 (as PL-11-04); otherwise it stops with that reason. FLOW-11-04 (received in Crystal) is a hand-off.

const { test, expect } = require('../../fixtures');

test.use({ classMap: 'playlistGeneral' });

/** Create an own resource and return its card (own resources carry the share icon). */
const ownCard = async (user) => {
  const title = `AutoTest-share-${Date.now()}`;
  await user.addResource.createTextAsset(title);
  const card = user.playlist.resourceCards.filter({ hasText: title }).first();
  await expect(card, 'set-up: the own resource is in the Playlist').toBeVisible({ timeout: 20000 });
  await user.page.keyboard.press('Escape');
  await user.header.calendar.click({ force: true }); // closes an on-screen keyboard left over the strip
  await user.page.waitForTimeout(800);
  return card;
};
const shareDialog = (page) =>
  page.locator('mat-dialog-container, [role=dialog], .cdk-overlay-pane').filter({ hasText: /share/i }).last();
const recipients = (dialog) => dialog.locator('input[type=checkbox], mat-checkbox, [role=checkbox]');
const sendBtn = (dialog) => dialog.getByRole('button', { name: /^\s*(share|send)\b/i }).last();
const isTicked = (box) =>
  box.evaluate((e) =>
    e.matches('input') ? e.checked : !!e.querySelector('input:checked') || e.getAttribute('aria-checked') === 'true'
  );

test.describe('FLOW-11 Sharing a resource', () => {
  test.describe.configure({ timeout: 180000 });

  test('FLOW-11-01: Share opens from a resource card', { tag: ['@smoke', '@functional'] }, async ({ user, page }) => {
    const card = await ownCard(user);
    try {
      await expect(user.playlist.shareIconOf(card), 'the card offers Share').toBeVisible();
      await user.playlist.shareIconOf(card).click({ force: true });
      await expect(shareDialog(page), 'Share opens').toBeVisible({ timeout: 10000 });
      expect(await recipients(shareDialog(page)).count(), 'it shows who it can go to').toBeGreaterThan(0);
      await page.keyboard.press('Escape');
    } finally {
      await user.playlist.removeOwnedAsset(card).catch(() => {});
    }
  });

  test(
    'FLOW-11-02: the teacher can choose who to share with and send',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const card = await ownCard(user);
      try {
        await user.playlist.shareIconOf(card).click({ force: true });
        const dialog = shareDialog(page);
        await expect(dialog, 'set-up: Share is open').toBeVisible({ timeout: 10000 });
        const boxes = recipients(dialog);
        await boxes.first().click({ force: true });
        await expect.poll(() => isTicked(boxes.first()), { message: 'a recipient can be chosen' }).toBe(true);
        await expect(sendBtn(dialog), 'Send is available once someone is chosen').toBeEnabled();
        test.skip(!process.env.SHARE_REAL, 'pressing Send really shares the resource: run with SHARE_REAL=1');
        await sendBtn(dialog).click();
        await expect(
          page
            .locator('mat-snack-bar-container, [role="alert"]')
            .filter({ hasText: /shared|sent|success/i })
            .first(),
          'the share is confirmed'
        ).toBeVisible({ timeout: 15000 });
      } finally {
        await page.keyboard.press('Escape').catch(() => {});
        await user.playlist.removeOwnedAsset(card).catch(() => {});
      }
    }
  );

  test('FLOW-11-03: sending with nobody chosen is not possible', { tag: ['@negative'] }, async ({ user, page }) => {
    const card = await ownCard(user);
    const shares = [];
    page.on('request', (r) => ['POST', 'PUT'].includes(r.method()) && /share/i.test(r.url()) && shares.push(r.url()));
    try {
      await user.playlist.shareIconOf(card).click({ force: true });
      const dialog = shareDialog(page);
      await expect(dialog, 'set-up: Share is open').toBeVisible({ timeout: 10000 });
      const boxes = recipients(dialog);
      for (let i = 0; i < (await boxes.count()); i++)
        if (await isTicked(boxes.nth(i))) await boxes.nth(i).click({ force: true });
      const send = sendBtn(dialog);
      if (await send.isEnabled().catch(() => false)) await send.click({ force: true });
      await page.waitForTimeout(3000);
      // Not possible: Send is disabled, or pressing it sends nothing.
      expect(shares, 'nothing is sent with nobody chosen').toEqual([]);
    } finally {
      await page.keyboard.press('Escape').catch(() => {});
      await user.playlist.removeOwnedAsset(card).catch(() => {});
    }
  });
});
