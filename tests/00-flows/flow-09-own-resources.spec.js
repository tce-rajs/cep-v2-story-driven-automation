// FLOW-09 — Adding the teacher's own resources
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: 'playersDefault' (second account, Class 12A Computer Science 2.2) for Create / upload / edit / remove;
// 'librarySuggestions' (Class 12A Physics 1.5) for the Library and AI Assist; the default class for the Gallery, which
// puts the image on the board (fresh space, never erased). Every resource a test adds is removed again; FLOW-09-08
// removes one curriculum card and brings it back with Reset.

const { test, expect } = require('../../fixtures');
const { pinForModule } = require('../../config/moduleClassMap');
const { uniqueCopy, signOutAndIn } = require('./flow-helpers');

const unique = (what = 'res') => `AutoTest-${what}-${Date.now()}`;
const cardOf = (user, title) => user.playlist.resourceCards.filter({ hasText: title });
/** Remove a resource the test added (best effort, clean-up). */
const removeIfThere = async (user, title) => {
  await user.player.closePlayer().catch(() => {});
  await user.playlist.ensureDrawerVisible().catch(() => {});
  const card = cardOf(user, title);
  if (await card.count().catch(() => 0)) await user.playlist.removeOwnedAsset(card).catch(() => {});
};
const fieldOrToastError = (user) =>
  user.addResource.createForm
    .locator('.invalid-file, mat-error, .error, [class*="error"]')
    .filter({ visible: true })
    .or(user.page.locator('mat-snack-bar-container, [role="alert"]').filter({ visible: true }))
    .first();

test.describe('FLOW-09 Adding the teacher’s own resources', () => {
  test.describe.configure({ timeout: 240000 });

  test.describe('Create and upload', () => {
    test.use({ classMap: 'playersDefault' });

    test(
      'FLOW-09-01: a resource created in Add Resource appears in the playlist and opens',
      { tag: ['@smoke', '@functional'] },
      async ({ user }) => {
        const title = unique('create');
        await user.addResource.createImageAsset(title);
        try {
          await expect(cardOf(user, title), 'it is in the playlist').toHaveCount(1, { timeout: 20000 });
          await user.player.openResourceCard(cardOf(user, title));
          expect(await user.player.isPlayerOpen(20000), 'it opens').toBe(true);
        } finally {
          await removeIfThere(user, title);
        }
      }
    );

    for (const [kind, file] of [
      ['PDF', 'positive/worksheet-3-pages.pdf'],
      ['image', 'positive/diagram-1920x1080.png'],
      ['video', 'positive/lesson-clip-720p-10s.mp4'],
      ['document', 'positive/lesson-plan.docx'],
    ]) {
      test(
        `FLOW-09-02: an uploaded ${kind} file appears in the playlist and opens`,
        { tag: ['@functional'] },
        async ({ user }) => {
          const title = unique(kind);
          await user.addResource.createAsset(title, uniqueCopy(file));
          try {
            await expect(cardOf(user, title), 'it is in the playlist').toHaveCount(1, { timeout: 60000 });
            await user.player.openResourceCard(cardOf(user, title));
            expect(await user.player.isPlayerOpen(30000), 'it opens').toBe(true);
            await expect(user.page.getByText(/unsupported file/i), 'shown, not "Unsupported file"').toHaveCount(0);
          } finally {
            await removeIfThere(user, title);
          }
        }
      );
    }

    test(
      'FLOW-09-06: an added resource is still in the playlist after sign out and sign in',
      { tag: ['@functional'] },
      async ({ user }) => {
        const title = unique('kept');
        await user.addResource.createTextAsset(title);
        try {
          await expect(cardOf(user, title), 'set-up: it is in the playlist').toHaveCount(1, { timeout: 20000 });
          await signOutAndIn(user, pinForModule('playersDefault'), 'playersDefault');
          await user.playlist.ensureDrawerVisible();
          await expect(cardOf(user, title), 'still there after signing in again').toHaveCount(1, { timeout: 20000 });
        } finally {
          await removeIfThere(user, title);
        }
      }
    );

    test(
      "FLOW-09-07: editing a resource's title shows the new title in the playlist",
      { tag: ['@functional'] },
      async ({ user, page }) => {
        const title = unique('edit');
        const edited = `${title}-edited`;
        await user.addResource.createTextAsset(title);
        try {
          const card = cardOf(user, title);
          await expect(card, 'set-up: it is in the playlist').toHaveCount(1, { timeout: 20000 });
          await user.playlist.enterEditMode();
          await card.first().scrollIntoViewIfNeeded();
          await card.first().hover();
          await card.first().locator('[data-qa-id="playlist-asset-overflow-icon-btn"]').click({ force: true });
          await page.locator('[data-qa-id="playlist-asset-edit-btn"]').filter({ visible: true }).first().click();
          await user.addResource.titleInput.fill(edited);
          await user.addResource.submitBtn.click();
          await user.playlist.finishEditing().catch(() => {});
          await expect(cardOf(user, edited), 'the new title is shown').toHaveCount(1, { timeout: 20000 });
        } finally {
          await removeIfThere(user, title);
        }
      }
    );

    test('FLOW-09-08: removing a resource takes it out of the playlist', { tag: ['@functional'] }, async ({ user }) => {
      const title = unique('remove');
      await user.addResource.createTextAsset(title);
      await expect(cardOf(user, title), 'set-up: it is in the playlist').toHaveCount(1, { timeout: 20000 });
      await user.playlist.removeOwnedAsset(cardOf(user, title));
      await expect(cardOf(user, title), 'it is gone').toHaveCount(0, { timeout: 15000 });
      await user.page.reload();
      await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
      await user.playlist.ensureDrawerVisible();
      await expect(cardOf(user, title), 'and stays gone after a reload').toHaveCount(0);
    });

    test('FLOW-09-08: Reset brings back the original playlist', { tag: ['@functional'] }, async ({ user }) => {
      const pl = user.playlist;
      const curriculum = user.page.locator('[data-qa-id="playlist-resource-card"]');
      expect(await curriculum.count(), 'set-up: curriculum resources in the topic').toBeGreaterThan(0);
      const original = await pl.cardTitles();
      const removedTitle = (await curriculum.first().innerText()).replace(/\s+/g, ' ').trim();
      await pl.enterEditMode();
      await pl.removeCard(curriculum.first());
      await pl.finishEditing().catch(() => {});
      await expect
        .poll(async () => (await pl.cardTitles()).filter((t) => t === removedTitle).length, {
          message: 'set-up: removed',
        })
        .toBeLessThan(original.filter((t) => t === removedTitle).length);
      await pl.resetPlaylist();
      await expect
        .poll(async () => (await pl.cardTitles()).filter((t) => t === removedTitle).length, {
          message: 'Reset brings the removed resource back',
          timeout: 20000,
        })
        .toBe(original.filter((t) => t === removedTitle).length);
    });

    test('FLOW-09-09: a file that is too large is refused with a message', { tag: ['@negative'] }, async ({ user }) => {
      const title = unique('large');
      const before = await user.playlist.resourceCards.count();
      await user.addResource.openAction('create');
      await user.addResource.createForm.waitFor({ state: 'visible', timeout: 10000 });
      await user.addResource.titleInput.fill(title);
      await user.addResource.fileInput.setInputFiles(uniqueCopy('negative/over-limit-11MB.mp4'));
      try {
        await expect(fieldOrToastError(user), 'a message says the file is too large').toBeVisible({ timeout: 8000 });
        if (await user.addResource.submitBtn.isEnabled()) await user.addResource.submitBtn.click();
        await user.page.waitForTimeout(4000);
        expect(await user.playlist.resourceCards.count(), 'nothing is added').toBe(before);
      } finally {
        await user.addResource.cancelBtn.click({ timeout: 3000 }).catch(() => {});
        await removeIfThere(user, title);
      }
    });

    test('FLOW-09-09: a file of the wrong type is refused with a message', { tag: ['@negative'] }, async ({ user }) => {
      const title = unique('type');
      const before = await user.playlist.resourceCards.count();
      await user.addResource.openAction('create');
      await user.addResource.createForm.waitFor({ state: 'visible', timeout: 10000 });
      await user.addResource.titleInput.fill(title);
      await user.addResource.fileInput.setInputFiles(uniqueCopy('negative/setup.exe'));
      try {
        if (await user.addResource.submitBtn.isEnabled()) await user.addResource.submitBtn.click();
        await expect(fieldOrToastError(user), 'a message says the type is not allowed').toBeVisible({ timeout: 8000 });
        await user.page.waitForTimeout(3000);
        expect(await user.playlist.resourceCards.count(), 'nothing is added').toBe(before);
      } finally {
        await user.addResource.cancelBtn.click({ timeout: 3000 }).catch(() => {});
        await removeIfThere(user, title);
      }
    });

    test(
      'FLOW-09-10: a resource added to one topic does not appear in another topic',
      { tag: ['@negative'] },
      async ({ user }) => {
        const title = unique('topic');
        await user.addResource.createTextAsset(title);
        try {
          await expect(cardOf(user, title), 'set-up: it is in this topic').toHaveCount(1, { timeout: 20000 });
          await user.nav.goToChapterTopic(1, 0);
          await user.playlist.ensureDrawerVisible();
          await user.page.waitForTimeout(2000);
          await expect(cardOf(user, title), 'not in another topic').toHaveCount(0);
        } finally {
          await user.nav.applyClassMap('playersDefault').catch(() => {});
          await removeIfThere(user, title);
        }
      }
    );
  });

  test.describe('Library and AI Assist', () => {
    test.use({ classMap: 'librarySuggestions' });

    test(
      'FLOW-09-03: a resource added from the Library appears in the playlist',
      { tag: ['@functional'] },
      async ({ user }) => {
        const ar = user.addResource;
        const pl = user.playlist;
        const inPlaylist = (await pl.cardTitles()).map((t) => t.toLowerCase());
        await ar.openAction('library');
        await expect(ar.libraryPopup, 'the Library opens').toBeVisible({ timeout: 10000 });
        await ar.librarySearchInput.fill('force');
        await ar.librarySearchBtn.click({ force: true });
        await expect(ar.libraryResults.first(), 'set-up: Library results').toBeVisible({ timeout: 20000 });
        let pickTitle = '';
        for (let i = 0; i < Math.min(await ar.libraryResults.count(), 20) && !pickTitle; i++) {
          const t = ((await ar.libraryResults.nth(i).innerText()) || '')
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)[0];
          if (t && !inPlaylist.some((e) => e.includes(t.toLowerCase()))) {
            pickTitle = t;
            await ar.libraryResults.nth(i).click({ force: true });
          }
        }
        expect(pickTitle, 'set-up: a Library resource not yet in the playlist').not.toBe('');
        await user.page.waitForTimeout(2500);
        await ar.libraryPdfAddToPlaylistBtn
          .or(user.page.getByRole('button', { name: /(save|add) to playlist/i }))
          .or(user.page.getByText(/(save|add) to playlist/i))
          .first()
          .click({ force: true });
        await user.page.waitForTimeout(2500);
        if (await ar.libraryCloseBtn.isVisible().catch(() => false)) await ar.libraryCloseBtn.click({ force: true });
        const added = pl.resourceCards.filter({ hasText: pickTitle });
        try {
          await expect(added.first(), `"${pickTitle}" is in the playlist`).toBeVisible({ timeout: 20000 });
        } finally {
          if (await added.count()) {
            await pl.enterEditMode().catch(() => {});
            await pl.removeCard(added.first()).catch(() => {});
            await pl.finishEditingBtn
              .last()
              .click({ timeout: 5000 })
              .catch(() => {});
          }
        }
      }
    );

    test(
      'FLOW-09-05: AI Assist creates a resource that appears in the playlist',
      { tag: ['@functional'] },
      async ({ user, page }) => {
        const ar = user.addResource;
        const made = () => user.playlist.resourceCards.filter({ hasText: /my exercise|flashcard/i });
        await user.playlist.ensureDrawerVisible();
        const before = await made().count();
        await ar.openAction('aiAssist');
        await expect(ar.aiAssistTabExercise, 'AI Assist opens').toBeVisible({ timeout: 20000 });
        await ar.selectExercise(0);
        await ar.aiAssistAddToPlaylistBtn.click({ force: true });
        await page.waitForTimeout(4000);
        await ar.aiAssistCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
        await user.playlist.ensureDrawerVisible();
        try {
          await expect
            .poll(() => made().count(), { message: 'AI Assist’s resource is in the playlist', timeout: 15000 })
            .toBeGreaterThan(before);
        } finally {
          for (let i = 0; i < 6 && (await made().count()) > before; i++) {
            await user.playlist.removeOwnedAsset(made().last()).catch(() => {});
            await page.waitForTimeout(1000);
            await user.playlist.ensureDrawerVisible();
          }
        }
      }
    );
  });

  test.describe('Gallery', () => {
    test.use({ classMap: 'scratchBoard', freshSpace: true });

    test(
      'FLOW-09-04: an image added from the Gallery appears in the playlist',
      { tag: ['@functional'] },
      async ({ user }) => {
        await user.playlist.ensureDrawerVisible();
        const before = await user.playlist.cardTitles();
        await user.content.addGalleryImage();
        await user.playlist.ensureDrawerVisible();
        await expect
          .poll(async () => (await user.playlist.cardTitles()).length, {
            message: 'the Gallery image is added to the playlist',
            timeout: 15000,
          })
          .toBeGreaterThan(before.length);
        const added = (await user.playlist.cardTitles()).filter((t) => !before.includes(t));
        if (added.length) await user.playlist.removeOwnedAsset(cardOf(user, added[0])).catch(() => {});
      }
    );
  });
});
