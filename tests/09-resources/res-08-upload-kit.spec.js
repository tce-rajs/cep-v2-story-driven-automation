// RES-08 — Uploading real teacher files, good and bad (the upload test-data kit)
// Source: CEPV2_Stories/09_Resources.md
//
// Files come from test-data/ (build them with `node scripts/make-test-data.js`; test-data/manifest.json says what each
// file is). Every file goes through Add Resource -> Create in 'playersDefault' (Class 12A Computer Science 14.1).
//   - A file a teacher should be able to use must be accepted AND open properly: an image shows at its real size, a
//     video loads and plays, a PDF shows all its pages, an Office/text file shows its content.
//   - A broken, wrong or unsupported file must be refused with a message that says why -- never accepted with
//     "Successfully added resource!" only to fail when the teacher opens it in front of the class.
// Every resource created is removed again (the page is reloaded first, because an open player can cover the card).
//
// Known product bugs (CONFIRMED LIVE 2026-09-27, v 0.0.232, all 50 files run and recorded, test-evidence/upload-kit/)
// are recorded per file below with test.fail(), so each stays visible and flips to "unexpectedly passed" when fixed.

const fs = require('fs');
const path = require('path');
const { test, expect } = require('../../fixtures');

const ROOT = path.join(__dirname, '..', '..', 'test-data');
const MANIFEST = path.join(ROOT, 'manifest.json');
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : [];

const OFFICE_UNSUPPORTED =
  'The form accepts this type and says "Successfully added resource!", but opening it shows "UNSUPPORTED FILE"';
const ACCEPTED_BROKEN =
  'A broken file is accepted with "Successfully added resource!"; the teacher only finds out when opening it in class';
const KNOWN = {
  'positive/lesson-plan.docx': OFFICE_UNSUPPORTED,
  'positive/class-slides.pptx': OFFICE_UNSUPPORTED,
  'positive/marks-sheet.xlsx': `${OFFICE_UNSUPPORTED} (the older .xls and .ods formats DO open)`,
  'positive/lesson-plan.odt': OFFICE_UNSUPPORTED,
  'positive/class-slides.odp': OFFICE_UNSUPPORTED,
  'positive/notes-plain.txt': OFFICE_UNSUPPORTED,
  'positive/notes-unicode-hindi-emoji.txt': OFFICE_UNSUPPORTED,
  'positive/पाठ योजना - विद्युत आवेश.pdf':
    'A PDF with a Hindi file name is rejected by the server (HTTP 400) with no message; the resource is silently not created',
  'negative/Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name.pdf':
    'A ~250-character file name is rejected by the server (HTTP 400) with no message',
  'negative/empty-0-bytes.pdf': `${ACCEPTED_BROKEN} (opens as a blank worksheet with no message)`,
  'negative/empty-0-bytes.png': `${ACCEPTED_BROKEN} ("Unable to load the image!")`,
  'negative/empty-0-bytes.mp4': `${ACCEPTED_BROKEN} (the video player shows a media error)`,
  'negative/corrupt-random-bytes.png': `${ACCEPTED_BROKEN} ("Unable to load the image!")`,
  'negative/corrupt-header-only.pdf': `${ACCEPTED_BROKEN} (opens as a blank worksheet with no message)`,
  'negative/corrupt-not-a-zip.docx': `${ACCEPTED_BROKEN} ("UNSUPPORTED FILE")`,
  'negative/image-renamed.mp4': `${ACCEPTED_BROKEN} (the video player shows a media error)`,
  'negative/video-renamed.png': `${ACCEPTED_BROKEN} ("Unable to load the image!")`,
  'negative/program-renamed.pdf': `${ACCEPTED_BROKEN} (a Windows program named .pdf opens as a blank worksheet)`,
  'negative/rtf-renamed.doc': `${ACCEPTED_BROKEN} ("UNSUPPORTED FILE")`,
  // A video cut off part-way still plays the part that arrived (browsers are tolerant) -- accepted and usable, so it is
  // not treated as a bug here; the test records how much plays.
};
const TOLERATED = { 'negative/corrupt-truncated.mp4': 'plays the part that arrived' };

const pdfPages = { 'worksheet-3-pages': 3, 'textbook-chapter-80-pages': 80 };

test.describe('RES-08 Uploading real teacher files', () => {
  test.use({ classMap: 'playersDefault' });
  test.describe.configure({ timeout: 240000 });
  test.skip(manifest.length === 0, 'run `node scripts/make-test-data.js` first');

  manifest.forEach((m, i) => {
    const n = String(i + 1).padStart(2, '0');
    const shouldWork = m.expect === 'accept' || TOLERATED[m.file];
    const tags = m.group === 'positive' ? ['@functional'] : ['@negative'];
    if (KNOWN[m.file]) tags.push('@bug');

    // eslint-disable-next-line playwright/valid-test-tags -- the tags are built per file above (all strings)
    test(
      `RES-08-${n}: ${m.file} (${m.note}) is ${shouldWork ? 'accepted and opens properly' : 'refused with a reason'}`,
      { tag: tags },
      async ({ user, page }) => {
        if (KNOWN[m.file]) test.fail(true, KNOWN[m.file]);
        const ar = user.addResource;
        const title = `AutoTest-kit-${Date.now()}`;
        const card = user.playlist.resourceCards.filter({ hasText: title });
        const posts = [];
        page.on(
          'response',
          (r) => r.request().method() === 'POST' && /content\/package/.test(r.url()) && posts.push(r.status())
        );

        await ar.openAction('create');
        await ar.createForm.waitFor({ state: 'visible', timeout: 10000 });
        await ar.titleInput.fill(title);
        await ar.fileInput.setInputFiles(path.join(ROOT, m.file));
        await page.waitForTimeout(800);
        const blocked = await ar.submitBtn.isDisabled();
        try {
          if (!shouldWork) {
            if (blocked) {
              await expect(
                ar.createForm.locator('.invalid-file, mat-error, .error').filter({ visible: true }).first(),
                'the form says why the file cannot be used'
              ).toBeVisible({ timeout: 5000 });
              return;
            }
            await ar.submitBtn.click();
            await page.waitForTimeout(6000);
            await expect(card, 'the broken/unsupported file was not turned into a resource').toHaveCount(0);
            // Only real message areas count (a Playlist card titled "Unsupported Player Test" is not a message).
            await expect(
              page
                .locator(
                  'mat-snack-bar-container, simple-snack-bar, [role="alert"], .toast-message, .invalid-file, mat-error'
                )
                .filter({
                  hasText: /invalid|not supported|unsupported|corrupt|cannot|could not|failed|error|too long/i,
                })
                .first(),
              'and the teacher is told why'
            ).toBeVisible();
            return;
          }

          expect(blocked, 'the form accepts the file').toBe(false);
          await ar.submitBtn.click();
          await expect(card.first(), 'the resource appears in the Playlist').toBeVisible({ timeout: 60000 });
          test.info().annotations.push({ type: 'note', description: `Upload responses: ${JSON.stringify(posts)}` });
          await user.player.openResourceCard(card);
          await expect(user.player.closeIcon.first(), 'a player opens').toBeVisible({ timeout: 20000 });
          await page.waitForTimeout(6000);
          await expect(
            page
              .locator('.resources-player, .player')
              .getByText(/unsupported file|unable to load|could not be loaded/i)
              .first(),
            'no error in the player'
          ).toBeHidden();

          if (m.kind === 'image') {
            const size = await page.evaluate(() =>
              [...document.querySelectorAll('.player img, .image-gallery img')]
                .filter(
                  (i) =>
                    i.getBoundingClientRect().width > 0 && i.naturalWidth > 0 && i.classList.contains('g-image-item')
                )
                .map((i) => `${i.naturalWidth}x${i.naturalHeight}`)
            );
            expect(size.length, 'the image is shown').toBeGreaterThan(0);
          } else if (m.kind === 'video') {
            let state = null;
            for (const frame of page.frames()) {
              const found = await frame
                .evaluate(async () => {
                  const el = document.querySelector('video');
                  if (!el) return null;
                  el.muted = true;
                  await el.play().catch(() => {});
                  const t = el.currentTime;
                  await new Promise((r) => setTimeout(r, 2500));
                  return {
                    readyState: el.readyState,
                    duration: el.duration,
                    advanced: el.currentTime > t,
                    error: el.error && el.error.code,
                  };
                })
                .catch(() => null);
              if (found) state = found;
            }
            expect(state, 'a video element is in the player').not.toBeNull();
            test.info().annotations.push({ type: 'note', description: `Video: ${JSON.stringify(state)}` });
            expect(state.error, 'no media error').toBeNull();
            expect(state.advanced, 'the video plays').toBe(true);
          } else if (m.kind === 'pdf' || m.kind === 'office' || m.kind === 'text') {
            const pages = page.locator('.page, .pdf-page, [data-page-number]');
            const expected = Object.entries(pdfPages).find(([k]) => m.file.includes(k));
            await expect
              .poll(() => pages.count(), { message: 'the document shows its pages', timeout: 15000 })
              .toBeGreaterThan(0);
            if (expected) await expect(pages, `all ${expected[1]} pages`).toHaveCount(expected[1]);
          }
        } finally {
          await ar.cancelBtn.click({ timeout: 2000 }).catch(() => {});
          if ((await card.count()) > 0) {
            await user.player.closePlayer().catch(() => {});
            await page.reload();
            await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
            await user.playlist.ensureDrawerVisible();
            await user.playlist.removeOwnedAsset(card).catch(() => {});
          }
        }
      }
    );
  });
});
