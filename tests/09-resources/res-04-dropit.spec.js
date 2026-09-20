// RES-04 — DropIt
// Source: CEPV2_Stories/09_Resources.md
// DropIt pairs a phone with the classroom screen via a QR code. Everything after the pairing step needs a real second
// device scanning that code, which an automated run does not have — those cases are written as fixme with the reason.

const { test, expect } = require('../../fixtures');

test.describe('RES-04 DropIt', () => {
  test.use({ classMap: 'default' });

  const openDropIt = async (user) => {
    await user.addResource.openAction('dropit');
    await expect(user.addResource.dropitQrCanvas).toBeVisible({ timeout: 15000 });
  };

  test('RES-04-01: opening DropIt displays a QR code', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await openDropIt(user);
    const box = await user.addResource.dropitQrCanvas.boundingBox();
    expect(box.width, 'a real, scannable-size code').toBeGreaterThan(80);
    expect(box.height).toBeGreaterThan(80);
  });

  test(
    'RES-04-02: the default pairing status is shown correctly before the QR code is scanned',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openDropIt(user);
      const status = user.addResource.dropitConnectionStatus;
      await expect(status).toBeVisible();
      const text = ((await status.innerText()) || '').replace(/\s+/g, ' ').trim();
      test.info().annotations.push({ type: 'note', description: `Default pairing status: "${text}"` });

      expect(text.length).toBeGreaterThan(0);
      expect(text, 'reads as not-yet-paired').toMatch(/waiting|not connected|disconnected|scan|connect/i);
      expect(text, 'and not as already paired').not.toMatch(/^connected$|paired successfully/i);
    }
  );

  test.fixme('RES-04-03: scanning the QR code successfully pairs the device', async () => {
    // BLOCKED: needs a second device (a phone running the DropIt companion) to scan the on-screen code. There is
    // none in an automated run. To automate: give the run a second browser context that opens the pairing URL the
    // QR encodes, and expose that URL (or a test hook) so the suite can read it.
    // TRIED 2026-09-20 (v 0.0.223): the QR is a plain 200x200 <canvas> with no data attribute carrying its content, the
    // client's Chromium has no BarcodeDetector, and no QR-decoder library is installed (none could be fetched here), so the
    // pairing URL could not be read. Pairing runs over Firestore, so the phone side is not a page this suite can open either.
  });

  test.fixme('RES-04-04: a paired session allows sharing a link, and the shared link opens correctly when accessed', async () => {
    // BLOCKED: needs a paired device (see RES-04-03).
  });

  test.fixme('RES-04-05: a paired session allows sharing a file, and the shared file opens correctly when accessed', async () => {
    // BLOCKED: needs a paired device (see RES-04-03).
  });

  test.fixme('RES-04-06: DropIt’s "success shown but resource missing" failure mode does not recur', async () => {
    // BLOCKED: needs a paired device (see RES-04-03). When automated, it must assert the shared link/file actually
    // OPENS, not merely that a success message appeared.
  });
});
