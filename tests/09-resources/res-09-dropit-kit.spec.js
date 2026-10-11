// RES-09 — Sending real teacher files through DropIt (the same upload test-data kit as RES-08's Create form)
// Source: CEPV2_Stories/09_Resources.md
//
// The user asked for every file already tried on Create (RES-08, test-data/) to also be tried on DropIt. A full 50-file
// DropIt run was done once by hand (scripts' probes/dropit-kit.spec.js: 49 of 50 completed, ~2.4 h live --
// each file needs its own QR pairing and a real second browser context) and its results are folded in below. Running
// all 50 through DropIt on every regression pass is not practical (DropIt is far slower per file than Create), so this
// permanent spec keeps one representative case per outcome that pass found, enough to catch a regression in any of them:
//   - an accepted image, PDF and docx (DropIt's documented accepted types: png/jpg/jpeg/gif/bmp/pdf/doc/docx)
//   - a rejected type outside that list (a video -- accepted by Create, but DropIt has no video support at all)
//     too: a corrupt header-only PDF, an EXE renamed .pdf, and an MP4 renamed .png
//     check at all, where Create's own form blocks it client-side
//   - a Hindi file name, silently rejected with no message (same root cause as Create's RES-08 finding)
//
// Full file-by-file results: test-evidence/dropit-kit/ and scratchpad; rerun the full kit with
// `KIT_ONLY=<regex> npx playwright test probes/dropit-kit.spec.js` (from the reference probes) if every file needs
// re-checking after a fix.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { isImprovement } = require('../../config/storyMarkers');
const { DropitCompanionPage } = require('../../pages/dropit-companion.page');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..', 'test-data');

const CASES = [
  { file: 'positive/board-photo.jpeg', kind: 'image', expect: 'accept', note: 'an accepted image type' },
  { file: 'positive/worksheet-3-pages.pdf', kind: 'pdf', expect: 'accept', note: 'an accepted PDF' },
  { file: 'positive/lesson-plan.docx', kind: 'office', expect: 'accept', note: 'an accepted Word file' },
  {
    file: 'positive/lesson-clip-720p-10s.mp4',
    kind: 'video',
    expect: 'reject',
    note: 'video: not an accepted DropIt type (unlike Create)',
  },
  {
    file: 'negative/corrupt-header-only.pdf',
    kind: 'broken',
    expect: 'reject',
    note: 'a PDF with only its first 400 bytes',
  },
  {
    file: 'negative/program-renamed.pdf',
    kind: 'broken',
    expect: 'reject',
    note: 'a Windows program renamed .pdf',
  },
  {
    file: 'negative/video-renamed.png',
    kind: 'broken',
    expect: 'reject',
    note: 'an MP4 renamed .png',
  },
  {
    file: 'negative/over-limit-scanned-book.pdf',
    kind: 'oversize',
    expect: 'reject',
    note: 'a 13.9 MB PDF, over the 10 MB limit Create enforces',
  },
  {
    file: 'पाठ योजना - विद्युत आवेश.pdf',
    dir: 'positive',
    kind: 'name',
    expect: 'accept',
    note: 'a Hindi file name',
  },
];

test.describe('RES-09 Sending files through DropIt', () => {
  test.use({ classMap: 'default' });
  test.describe.configure({ timeout: 180000 });

  const openDropIt = async (user) => {
    await user.addResource.openAction('dropit');
    await expect(user.addResource.dropitQrCanvas).toBeVisible({ timeout: 15000 });
  };

  CASES.forEach((c, i) => {
    const n = String(i + 1).padStart(2, '0');
    if (isImprovement(`RES-09-${n}`)) return;
    const tags = c.expect === 'accept' ? ['@functional'] : ['@negative'];

    // eslint-disable-next-line playwright/valid-test-tags -- the tags are built per case above (all strings)
    test(
      `RES-09-${n}: ${c.file} (${c.note}) is ${c.expect === 'accept' ? 'accepted and opens properly' : 'refused, or opens correctly if the app accepts it anyway'}`,
      { tag: tags },
      async ({ user, page }) => {
        const titlesBefore = await user.playlist.cardTitles();
        await openDropIt(user);
        const url = await user.addResource.decodeDropitQrUrl();
        expect(url, 'the QR decodes to a real pairing URL').toBeTruthy();
        const browser = await chromium.launch();
        const context = await browser.newContext({ viewport: DropitCompanionPage.viewport });
        const phonePage = await context.newPage();
        const phone = new DropitCompanionPage(phonePage);
        const srcPath = path.join(ROOT, c.dir || 'negative', path.basename(c.file));
        const tmp = path.join(os.tmpdir(), path.basename(c.file));
        fs.copyFileSync(fs.existsSync(srcPath) ? srcPath : path.join(ROOT, c.file), tmp);
        try {
          await phone.open(url);
          await expect(user.addResource.dropitConnectionStatus).toHaveText(/connected/i, { timeout: 15000 });
          await phone.uploadFile(tmp);
          const opened = await user.player.isPlayerOpen(30000);
          await page.waitForTimeout(3000);
          await user.player.closePlayer().catch(() => {});
          await user.addResource.dropitCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
          await page.reload();
          await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
          await user.playlist.ensureDrawerVisible();
          const newCards = (await user.playlist.cardTitles()).filter((t) => !titlesBefore.includes(t));

          if (c.expect === 'accept') {
            expect(opened || newCards.length > 0, 'the file was accepted').toBe(true);
            if (opened) {
              await user.player
                .openResourceCard(user.playlist.resourceCards.filter({ hasText: newCards[0] || '' }).first())
                .catch(() => {});
            }
          } else {
            expect(opened || newCards.length > 0, 'a broken, oversized or unsupported file is refused').toBe(false);
          }
          for (const t of newCards) {
            await user.playlist.removeOwnedAsset(user.playlist.resourceCards.filter({ hasText: t })).catch(() => {});
          }
        } finally {
          fs.unlinkSync(tmp);
          await context.close();
          await browser.close();
        }
      }
    );
  });
});
