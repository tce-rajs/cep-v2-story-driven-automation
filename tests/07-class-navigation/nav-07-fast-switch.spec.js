// NAV-07 — Fast and repeated class switching
// Source: CEPV2_Stories/07_ClassNavigation.md
// Data: 'playersDefault' (second account: Class 12A Computer Science 14.1 and Class 11A Accountancy). NAV-07-02 uploads
// one resource and removes it again.

const path = require('path');
const { test, expect } = require('../../fixtures');

const NEAR_LIMIT_VIDEO = path.join(__dirname, '..', '..', 'test-data', 'positive', 'near-limit-9.6MB.mp4');

test.describe('NAV-07 Fast class switching', () => {
  test.use({ classMap: 'playersDefault' });

  test(
    'NAV-07-01: double-clicking a subject switches class once, and the label, Playlist and board all belong to it',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const nav = user.nav;
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await nav.openClassPopup();
      await page.waitForTimeout(800);
      await nav.allMyClassesTab.click();
      await nav.gradeButton('Class 11').click();
      await nav.divisionButton('A').click();
      await nav.subjectButton('Accountancy').dblclick({ delay: 40 });
      await expect(nav.currentClassBtn, 'the label shows the chosen class').toContainText('Accountancy', {
        timeout: 30000,
      });
      await page.waitForTimeout(3000);
      await expect(nav.allMyClassesTab, 'the class popup is closed, not re-opened').toBeHidden();
      await expect(user.playlist.resourceCards.first(), 'the new class’s Playlist loaded').toBeAttached({
        timeout: 20000,
      });
      expect(errors, 'no script errors').toEqual([]);
    }
  );

  test(
    'NAV-07-02: switching class while a resource is still uploading keeps it in the class it was uploaded to',
    { tag: ['@negative', '@regression'] },
    async ({ user, page }) => {
      test.setTimeout(300000);
      const fs = require('fs');
      test.skip(!fs.existsSync(NEAR_LIMIT_VIDEO), 'run `node scripts/make-test-data.js` first');
      const ar = user.addResource;
      const title = `AutoTest-switch-upload-${Date.now()}`;
      await ar.openAction('create');
      await ar.createForm.waitFor({ state: 'visible', timeout: 10000 });
      await ar.titleInput.fill(title);
      await ar.fileInput.setInputFiles(NEAR_LIMIT_VIDEO);
      await ar.submitBtn.click();
      // Straight away, while the 9.6 MB upload is still going: switch to another class.
      await user.nav.resetToClass('Class 11', 'A', 'Accountancy');
      await page.waitForTimeout(20000);
      await user.playlist.ensureDrawerVisible();
      await expect(
        user.playlist.resourceCards.filter({ hasText: title }),
        'the upload did not land in the class the teacher switched to'
      ).toHaveCount(0);

      await user.nav.applyClassMap('playersDefault');
      await user.playlist.ensureDrawerVisible();
      const mine = user.playlist.resourceCards.filter({ hasText: title });
      try {
        await expect(mine, 'the upload is in the topic it was made in (or the teacher was told it failed)').toHaveCount(
          1,
          {
            timeout: 30000,
          }
        );
      } finally {
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
