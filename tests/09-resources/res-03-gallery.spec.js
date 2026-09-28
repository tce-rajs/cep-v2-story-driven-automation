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

  // --- Added 2026-09-26 (gap-fill from the reference suite's Gallery workbook) ---

  // CONFIRMED LIVE (2026-09-26): gallery thumbnails are CSS background images on each gallery-image-card-<Name>; the
  // category filter is a native <select>; paging is the unlabelled .upbutton / .downbutton pair.
  const cardNames = (user) =>
    user.addResource.galleryImageCards
      .filter({ visible: true })
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-qa-id')));
  const downBtn = (page) =>
    page
      .locator('.scroll-wrapper')
      .locator('..')
      .locator('button.downbutton')
      .or(page.locator('button.downbutton'))
      .filter({ visible: true })
      .first();
  const boardImages = (user) => user.toolbar.wbSvg.locator('image').count();

  test(
    'RES-03-07: changing the category filters changes the images shown',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openGallery(user);
      const before = await cardNames(user);
      const select = user.addResource.galleryFilterSelect;
      const current = await select.inputValue();
      const other = await select.evaluate(
        (s, cur) => [...s.options].map((o) => o.value).find((v) => v && v !== cur),
        current
      );
      expect(other, 'another category to choose').toBeTruthy();
      await select.selectOption(other);
      await expect
        .poll(() => cardNames(user), { message: 'a different set of images', timeout: 15000 })
        .not.toEqual(before);
    }
  );

  test(
    'RES-03-08: the scroll buttons move through more images in the category',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      await openGallery(user);
      // The cards scroll inside the Gallery grid (window positions barely change), so read the grid's own scroll offset.
      const scrollTop = () =>
        user.addResource.galleryImageCards.first().evaluate((el) => {
          let p = el.parentElement;
          while (p && !(p.scrollHeight > p.clientHeight && /auto|scroll/.test(getComputedStyle(p).overflowY)))
            p = p.parentElement;
          return p ? p.scrollTop : -1;
        });
      // The grid fills in over a second or two after opening; count once it has.
      await expect
        .poll(() => user.addResource.galleryImageCards.count(), { timeout: 10000 })
        .toBeGreaterThanOrEqual(4)
        .catch(() => {});
      const total = await user.addResource.galleryImageCards.count();
      test.skip(total < 4, `The category has only ${total} images, too few to scroll.`);
      const start = await scrollTop();
      expect(start, 'the grid scrolls').toBeGreaterThanOrEqual(0);
      await downBtn(page).click();
      await expect.poll(scrollTop, { message: 'further images shown', timeout: 10000 }).toBeGreaterThan(start);
      await page.locator('button.upbutton').filter({ visible: true }).first().click();
      await expect.poll(scrollTop, { message: 'and back up' }).toBeLessThanOrEqual(start + 1);
    }
  );

  test(
    'RES-03-09: a search with no matches shows a message, not an empty grid',
    { tag: ['@bug', '@negative'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; the reference suite's ADD-GAL-03): a Gallery search with
      // no matches leaves an empty grid with no message.
      test.fail(true, 'A Gallery search with no matches shows an empty grid, no "no results" message');
      await openGallery(user);
      await user.addResource.gallerySearchInput.fill('zzqxwvv');
      await user.addResource.gallerySearchBtn.click();
      await expect(user.addResource.galleryImageCards).toHaveCount(0, { timeout: 15000 });
      await expect(
        page
          .getByText(/no (image|result|match)|not found/i)
          .filter({ visible: true })
          .first(),
        'a no-results message'
      ).toBeVisible();
    }
  );

  test(
    'RES-03-10: double-clicking an image adds it to the whiteboard only once (regression)',
    { tag: ['@bug', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; the reference suite's GAL-BOUND-01): double-clicking a
      // Gallery thumbnail puts TWO copies of the image on the whiteboard.
      test.fail(true, 'Double-clicking a Gallery image inserts it twice');
      const before = await boardImages(user);
      await openGallery(user);
      await user.addResource.galleryImageCards.first().dblclick({ force: true });
      await page.waitForTimeout(3000);
      expect(await boardImages(user), 'one image added, not two').toBe(before + 1);
    }
  );

  test(
    'RES-03-11: every image thumbnail in the gallery loads, with no broken-image placeholders (regression)',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      await openGallery(user);
      await page.waitForTimeout(4000);
      const urls = await user.addResource.galleryImageCards.evaluateAll((els) =>
        els.map((e) => (getComputedStyle(e).backgroundImage.match(/url\("?(.*?)"?\)/) || [])[1]).filter(Boolean)
      );
      expect(urls.length, 'thumbnails listed').toBeGreaterThan(0);
      const broken = await page.evaluate(
        (list) =>
          Promise.all(
            list.map(
              (u) =>
                new Promise((res) => {
                  const i = new Image();
                  i.onload = () => res(i.naturalWidth > 0 ? null : u);
                  i.onerror = () => res(u);
                  i.src = u;
                })
            )
          ).then((r) => r.filter(Boolean)),
        urls
      );
      expect(broken, 'no broken thumbnails').toEqual([]);
    }
  );

  test("RES-03-12: the gallery's close button closes it", { tag: ['@functional'] }, async ({ user }) => {
    await openGallery(user);
    await user.addResource.galleryCloseBtn.click();
    await expect(user.addResource.galleryImageCards.first()).toBeHidden({ timeout: 10000 });
    await expect(user.addResource.gallerySearchInput).toBeHidden();
  });
});
