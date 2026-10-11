const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { DropitCompanionPage } = require('../../pages/dropit-companion.page');
const fs = require('fs');
const path = require('path');
const os = require('os');

test('probe corrupted image upload', async ({ user }) => {
  test.setTimeout(90000);
  await user.addResource.openAction('dropit');
  await expect(user.addResource.dropitQrCanvas).toBeVisible({ timeout: 15000 });
  const url = await user.addResource.decodeDropitQrUrl();

  const browser = await chromium.launch({
    headless: !process.env.DROPIT_HEADED,
    slowMo: process.env.DROPIT_HEADED ? 400 : 0,
  });
  const context = await browser.newContext({ viewport: DropitCompanionPage.viewport });
  const phone = new DropitCompanionPage(await context.newPage());
  await phone.open(url);
  await expect(user.addResource.dropitConnectionStatus).toHaveText(/connected/i, { timeout: 15000 });

  // A real PNG magic-byte header followed by garbage instead of real image data -- a genuinely corrupted
  // file, not just an unsupported format (extension/mimetype both say PNG, decoding it would fail).
  const corruptedPng = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // valid PNG signature
    Buffer.from('this is not real PNG chunk data, totally corrupted garbage bytes follow'.repeat(20)),
  ]);
  const tmpFile = path.join(os.tmpdir(), 'corrupted-test.png');
  fs.writeFileSync(tmpFile, corruptedPng);

  const before = await user.playlist.resourceCards.count();
  try {
    await phone.uploadFile(tmpFile);
    await user.page.waitForTimeout(3000);
    console.log(
      'upload status text:',
      await user.addResource.dropitUploadStatus.innerText().catch(() => '(not found)')
    );
    console.log(
      'transfer status text:',
      await user.addResource.dropitTransferStatus.innerText().catch(() => '(not found)')
    );
    console.log(
      'connection status text:',
      await user.addResource.dropitConnectionStatus.innerText().catch(() => '(not found)')
    );
    console.log('player open:', await user.player.isPlayerOpen().catch(() => 'n/a'));
    const after = await user.playlist.resourceCards.count();
    console.log('playlist before/after:', before, after);
    await user.page.screenshot({ path: 'scratch_corrupted_upload_1.png' });
    await user.page.waitForTimeout(3000);
    await user.page.screenshot({ path: 'scratch_corrupted_upload_2.png' });
  } finally {
    fs.unlinkSync(tmpFile);
    await browser.close();
  }
});
