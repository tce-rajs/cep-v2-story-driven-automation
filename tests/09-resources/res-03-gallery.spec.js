// RES-03 — Gallery
// Source: CEPV2_Stories/09_Resources.md
// CONFIRMED LIVE in the previous suite: choosing a Gallery image puts it on the whiteboard canvas and creates NO
// Playlist card; the Add Resource picker intermittently renders unclickable (handled by openAction()).

const { test, expect } = require('../../fixtures');

test.describe('RES-03 Gallery', () => {
  test.use({ classMap: 'default' });

  // Gallery images inserted onto the whiteboard persist for the topic, so leave the board as found.
  test.afterEach(async ({ user }) => {
    await user.toolbar.clearBoard(user.whiteboard).catch(() => {});
  });

  const openGallery = async (user) => {
    await user.addResource.openAction('gallery');
    await expect(user.addResource.galleryImageCards.first()).toBeVisible({ timeout: 15000 });
  };

  test(
    'RES-03-01: opening the gallery from a topic shows images filtered to that chapter/subject',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const subject = ((await user.nav.currentClassBtn.innerText()) || '')
        .replace(/^.*\|\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
      await openGallery(user);

      expect(await user.addResource.galleryImageCards.count(), 'images are shown').toBeGreaterThan(0);
      const filter = ((await user.addResource.gallerySubjectSelect.innerText()) || '').replace(/\s+/g, ' ').trim();
      test.info().annotations.push({
        type: 'note',
        description: `Class subject="${subject}" | Gallery subject filter="${filter}"`,
      });
      expect(filter.toLowerCase(), 'the subject filter follows the current class’s subject').toContain(
        subject.toLowerCase().split(' ')[0]
      );
    }
  );

  test(
    'RES-03-02: searching within the gallery filters the results correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openGallery(user);
      const ar = user.addResource;
      // The grid fills in as it loads (a count taken too early reads 1), so wait until it has stopped growing.
      let baseline = -1;
      for (let i = 0; i < 15; i++) {
        const now = await ar.galleryImageCards.count();
        if (now > 1 && now === baseline) break;
        baseline = now;
        await user.page.waitForTimeout(700);
      }

      // A real term, taken from the first image itself. CONFIRMED LIVE: a gallery tile is a div with a background image
      // (no <img>), and its name is the tile's text ("Horse", "Chameleon", ...).
      const label = ((await ar.galleryImageCards.first().innerText()) || '').replace(/\s+/g, ' ').trim();
      const term = (label.match(/\p{L}{3,}/u) || ['a'])[0];
      await ar.gallerySearchInput.fill(term);
      await ar.gallerySearchBtn.click({ force: true });
      await user.page.waitForTimeout(2000);
      const matched = await ar.galleryImageCards.count();
      expect(matched, `"${term}" finds images`).toBeGreaterThan(0);
      expect(matched, 'and narrows the grid').toBeLessThanOrEqual(baseline);

      // A term that cannot match anything empties it.
      await ar.gallerySearchInput.fill('zzzqqqxxx999');
      await ar.gallerySearchBtn.click({ force: true });
      await user.page.waitForTimeout(2000);
      await expect(ar.galleryImageCards).toHaveCount(0);
    }
  );

  test(
    'RES-03-03: selecting an image inserts it onto the whiteboard',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const before = await user.toolbar.objectCount();
      await user.content.addGalleryImage();
      expect(await user.toolbar.objectCount(), 'an image object was added to the canvas').toBeGreaterThan(before);
    }
  );

  test(
    'RES-03-04: the inserted image is selectable via the toolbar',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await user.content.addGalleryImage();
      const image = user.toolbar.wbSvg.locator('image').last();
      await expect(image).toBeAttached();

      // Via the toolbar: Select tool, then click the image. CONFIRMED LIVE: a selected image shows its own menu
      // (toolbar-image-menu-*: to front / to back / duplicate / delete), not the stroke/shape (path) menu.
      await user.toolbar.selectTool('gtSelect');
      const box = await image.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(800);
      await expect(
        page.locator('[data-qa-id="toolbar-image-menu-delete"]'),
        'selecting shows the image object menu'
      ).toBeVisible();
      await expect(page.locator('[data-qa-id="toolbar-image-menu-duplicate"]')).toBeVisible();
    }
  );

  test(
    'RES-03-06: the inserted image is selectable and movable via the arrow keys',
    { tag: ['@functional', '@bug'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223): the arrow keys do nothing to the image -- they neither select it
      // (with nothing selected, no image menu appears) nor move it when it is selected (x unchanged after pressing and
      // after holding ArrowRight). Tracked as expected-to-fail so it isn't masked; the story wording ("selectable via
      // arrow keys") needs a product decision on what the keys are meant to do.
      test.fail(true, 'Arrow keys neither select nor move an inserted image');
      await user.content.addGalleryImage();
      const image = user.toolbar.wbSvg.locator('image').last();
      await expect(image).toBeAttached();

      await user.toolbar.selectTool('gtSelect');
      const box = await image.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(800);
      const before = await image.boundingBox();
      for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      const after = await image.boundingBox();
      expect(after.x, 'ArrowRight moved the image right').toBeGreaterThan(before.x);
    }
  );

  test(
    'RES-03-05: opening the gallery picker 5-10x in a row — the actual failure rate is recorded and must be zero',
    { tag: ['@regression'] },
    async ({ user }) => {
      test.setTimeout(6 * 60 * 1000);
      const attempts = 10;
      const failures = [];

      for (let i = 1; i <= attempts; i++) {
        try {
          await user.addResource.openAction('gallery');
          await expect(user.addResource.galleryImageCards.first()).toBeVisible({ timeout: 10000 });
          await user.addResource.galleryCloseBtn.click({ force: true });
          await expect(user.addResource.galleryImageCards.first()).toBeHidden({ timeout: 5000 });
        } catch (err) {
          failures.push(`attempt ${i}: ${String(err.message).split('\n')[0]}`);
          await user.page.reload().catch(() => {});
          await user.login.avatar.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
        }
      }

      test.info().annotations.push({
        type: 'note',
        description: `Gallery open failure rate: ${failures.length}/${attempts}${failures.length ? ' — ' + failures.join(' | ') : ''}`,
      });
      expect(failures, `failed ${failures.length} of ${attempts} opens`).toEqual([]);
    }
  );
});
