// NAV-07 — Fast and repeated class switching
// Source: CEPV2_Stories/07_ClassNavigation.md
// Data: 'playersDefault' (second account: Class 12A Computer Science 14.1 and Class 11A Accountancy). NAV-07-02 uploads
// one resource and removes it again.

const { test, expect } = require('../../fixtures');

test.describe('NAV-07 Fast class switching', () => {
  test.use({ classMap: 'playersDefault' });

  // Double-clicking a subject: the label shows the chosen class (NAV-07-01), the class window closes and is not reopened
  // (NAV-07-04), and the new class's Playlist loads (NAV-07-05) -- one test each.
  const doubleClickSubject = async (user, page) => {
    const nav = user.nav;
    await nav.openClassPopup();
    await page.waitForTimeout(800);
    await nav.allMyClassesTab.click();
    await nav.gradeButton('Class 11').click();
    await nav.divisionButton('A').click();
    await nav.subjectButton('Accountancy').dblclick({ delay: 40 });
    await expect(nav.currentClassBtn, 'the label shows the chosen class').toContainText('Accountancy', {
      timeout: 30000,
    });
  };

  test(
    'NAV-07-01: double-clicking a subject switches to that class, and the class label shows it',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await doubleClickSubject(user, page);
      expect(errors, 'no script errors').toEqual([]);
    }
  );

  test(
    'NAV-07-04: after double-clicking a subject, the class window is closed and not reopened',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await doubleClickSubject(user, page);
      await page.waitForTimeout(3000);
      await expect(user.nav.allMyClassesTab, 'the class popup is closed, not re-opened').toBeHidden();
    }
  );

  test(
    'NAV-07-05: after double-clicking a subject, the new class’s Playlist loads',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await doubleClickSubject(user, page);
      await expect(user.playlist.resourceCards.first(), 'the new class’s Playlist loaded').toBeAttached({
        timeout: 20000,
      });
    }
  );

  test(
    'NAV-07-02: switching class while a resource is still uploading keeps it in the class it was uploaded to',
    { tag: ['@negative', '@regression'] },
    async ({ user, page }) => {
      test.setTimeout(300000);
      const ar = user.addResource;
      const title = `AutoTest-switch-upload-${Date.now()}`;
      const uploadRoute = /content\/package/;
      let releaseUpload;
      const uploadHeld = new Promise((resolve) => {
        releaseUpload = resolve;
      });
      let signalUploadStarted;
      let uploadWasStarted = false;
      const uploadStarted = new Promise((resolve) => {
        signalUploadStarted = resolve;
      });
      await page.route(uploadRoute, async (route) => {
        if (route.request().method() === 'POST') {
          uploadWasStarted = true;
          signalUploadStarted();
          await uploadHeld;
        }
        await route.continue();
      });
      let uploadResponse;

      const mine = user.playlist.resourceCards.filter({ hasText: title });
      try {
        await ar.openAction('create');
        await ar.createForm.waitFor({ state: 'visible', timeout: 10000 });
        await ar.titleInput.fill(title);
        await ar.fileInput.setInputFiles({
          name: 'upload-in-progress.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('A small valid file used to exercise an upload in progress.'),
        });
        uploadResponse = page.waitForResponse(
          (response) => response.request().method() === 'POST' && /content\/package/.test(response.url()),
          { timeout: 300000 }
        );
        await ar.submitBtn.click();
        await uploadStarted;

        // Hold the valid upload at the network boundary while the teacher switches classes.
        await user.nav.resetToClass('Class 11', 'A', 'Accountancy');
        releaseUpload();
        const response = await uploadResponse;
        expect(response.ok(), `the resource upload succeeds (HTTP ${response.status()})`).toBe(true);
        await user.playlist.ensureDrawerVisible();
        await expect(
          user.playlist.resourceCards.filter({ hasText: title }),
          'the upload did not land in the class the teacher switched to'
        ).toHaveCount(0);

        await user.nav.applyClassMap('playersDefault');
        await user.playlist.ensureDrawerVisible();
        await expect(mine, 'the upload is in the topic it was made in (or the teacher was told it failed)').toHaveCount(
          1,
          {
            timeout: 30000,
          }
        );
      } finally {
        releaseUpload();
        if (uploadResponse) {
          if (uploadWasStarted) await uploadResponse.catch(() => {});
          else uploadResponse.catch(() => {});
        }
        await page.unroute(uploadRoute);
        await user.nav.applyClassMap('playersDefault').catch(() => {});
        await user.playlist.ensureDrawerVisible().catch(() => {});
        if ((await mine.count()) > 0) await user.playlist.removeOwnedAsset(mine).catch(() => {});
      }
    }
  );

  test(
    'NAV-07-03: switching class five times in a row quickly ends on the last class chosen, with its own Playlist',
    { tag: ['@edge', '@regression'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const order = [
        ['Class 11', 'A', 'Accountancy'],
        ['Class 12', 'A', 'Computer Science'],
        ['Class 11', 'A', 'Accountancy'],
        ['Class 12', 'A', 'Computer Science'],
        ['Class 11', 'A', 'Accountancy'],
      ];
      for (const [g, d, s] of order) {
        await user.nav.openClassPopup().catch(() => {});
        await page.waitForTimeout(400);
        await user.nav.allMyClassesTab.click({ timeout: 5000 }).catch(() => {});
        await user.nav
          .gradeButton(g)
          .click({ timeout: 5000 })
          .catch(() => {});
        await user.nav
          .divisionButton(d)
          .click({ timeout: 5000 })
          .catch(() => {});
        await user.nav
          .subjectButton(s)
          .click({ timeout: 5000 })
          .catch(() => {});
      }
      await expect(user.nav.currentClassBtn, 'ends on the last class chosen').toContainText('Accountancy', {
        timeout: 30000,
      });
      await page.waitForTimeout(5000);
      await expect(user.nav.currentClassBtn, 'and stays there (a late response did not switch it back)').toContainText(
        'Accountancy'
      );
      expect(errors, 'no script errors').toEqual([]);
    }
  );
});
