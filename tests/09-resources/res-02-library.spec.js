// RES-02 — Library
// Source: CEPV2_Stories/09_Resources.md
// The Library is the "TCE search library" option of the Add Resource picker. Results open a type-specific preview
// with "Open to Whiteboard" and "Save to Playlist".

const { test, expect } = require('../../fixtures');

test.describe('RES-02 Library', () => {
  // The Library auto-searches the current topic's name, and most topics' full names match nothing (the default
  // 1.1 "Big Idea..." returns "No result found"), so the tests that need suggestions use a topic that has them.
  test.use({ classMap: 'librarySuggestions' });

  const openLibrary = async (user) => {
    await user.addResource.openAction('library');
    await expect(user.addResource.libraryPopup).toBeVisible({ timeout: 10000 });
  };
  const openFirstResult = async (user) => {
    await expect(user.addResource.libraryResults.first()).toBeVisible({ timeout: 15000 });
    await user.addResource.libraryResults.first().click({ force: true });
    await user.page.waitForTimeout(2000);
  };
  // CONFIRMED LIVE (v 0.0.223): the preview's buttons read "Open in whiteboard" and "Add to playlist"; the story words
  // them "Open to Whiteboard" and "Save to Playlist". Both wordings are accepted.
  const openToWhiteboard = (user) =>
    user.page
      .getByRole('button', { name: /open (to|in) whiteboard/i })
      .or(user.page.getByText(/open (to|in) whiteboard/i))
      .first();
  const saveToPlaylist = (user) =>
    user.addResource.libraryPdfAddToPlaylistBtn
      .or(user.page.getByRole('button', { name: /(save|add) to playlist/i }))
      .or(user.page.getByText(/(save|add) to playlist/i))
      .first();

  test(
    'RES-02-01: the search box defaults to searching the current topic name automatically on open',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const topic = ((await user.nav.currentChapterTopicBtn.innerText()) || '')
        .replace(/^\s*\d+(\.\d+)*\s*\|?\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
      await openLibrary(user);

      const searched = (await user.addResource.librarySearchInput.inputValue()).trim();
      test
        .info()
        .annotations.push({ type: 'note', description: `Current topic="${topic}" | search box="${searched}"` });
      expect(searched.length, 'the search box is pre-filled').toBeGreaterThan(0);
      expect(topic.toLowerCase(), 'with the current topic').toContain(searched.toLowerCase().slice(0, 12));
    }
  );

  test(
    'RES-02-02: matching assets are suggested when available for that topic',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openLibrary(user);
      await expect(user.addResource.libraryResults.first(), 'suggested assets appear').toBeVisible({ timeout: 15000 });
      expect(await user.addResource.libraryResults.count()).toBeGreaterThan(0);
    }
  );

  test(
    'RES-02-03: a "No result found" message shows when no assets match',
    { tag: ['@negative'] },
    async ({ user }) => {
      await openLibrary(user);
      // Let the automatic topic search finish first: its late response would otherwise overwrite this manual search.
      await expect(
        user.addResource.libraryResults.first().or(user.addResource.libraryPopup.getByText(/no result found/i))
      ).toBeVisible({ timeout: 20000 });
      await user.addResource.librarySearchInput.fill('zzzqqqxxx999nomatch');
      await user.addResource.librarySearchBtn.click({ force: true });

      await expect(user.addResource.libraryPopup.getByText(/no result found/i)).toBeVisible({ timeout: 15000 });
      await expect(user.addResource.libraryResults).toHaveCount(0);
    }
  );

  test(
    'RES-02-04: clicking an asset from the results opens a preview specific to that asset’s type',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openLibrary(user);
      await openFirstResult(user);

      // Whatever the type, a preview opened over the results with its own content and a way out.
      const typeSpecific = user.page
        .locator(
          '.vjs-play-control, .pdf-header, .worksheet-header, .player.image-player, .image-gallery, iframe, canvas'
        )
        .first();
      await expect(typeSpecific, 'a type-specific preview (video / PDF / image / web) is showing').toBeVisible({
        timeout: 15000,
      });
    }
  );

  test(
    'RES-02-05: the preview shows both "Open to Whiteboard" and "Save to Playlist" options',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openLibrary(user);
      await openFirstResult(user);
      await expect(openToWhiteboard(user)).toBeVisible({ timeout: 10000 });
      await expect(saveToPlaylist(user)).toBeVisible();
    }
  );

  test(
    'RES-02-06: "Open to Whiteboard" inserts/opens the asset onto the whiteboard',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openLibrary(user);
      await openFirstResult(user);
      const before = await user.toolbar.objectCount();

      await openToWhiteboard(user).click({ force: true });

      // CONFIRMED LIVE: the asset shows up as an embedded player (a child frame) for only ~1-2 seconds after the click,
      // so the check has to start polling immediately and often; waiting first misses it entirely.
      const landed = () => user.toolbar.objectCount().then((n) => n > before || user.page.frames().length > 1);
      await expect
        .poll(landed, { message: 'the asset landed on the whiteboard', timeout: 15000, intervals: [150, 150, 250] })
        .toBe(true);

      // ...and the Library popup has closed behind it.
      await expect(user.addResource.libraryPopup).toBeHidden({ timeout: 10000 });
    }
  );

  test('RES-02-07: "Save to Playlist" adds the asset to the Playlist', { tag: ['@functional'] }, async ({ user }) => {
    test.setTimeout(3 * 60 * 1000);
    await user.playlist.ensureDrawerVisible();
    const inPlaylist = (await user.playlist.cardTitles()).map((t) => t.toLowerCase());
    const before = inPlaylist.length;

    // CONFIRMED LIVE: the Library's suggestions for the current topic are the resources the topic's Playlist already
    // holds, and adding one of those changes nothing (the toast says it was added, the count stays put). So search
    // more broadly and take a result that is not in the Playlist yet.
    await openLibrary(user);
    await expect(
      user.addResource.libraryResults.first().or(user.addResource.libraryPopup.getByText(/no result found/i))
    ).toBeVisible({ timeout: 20000 });
    await user.addResource.librarySearchInput.fill('force');
    await user.addResource.librarySearchBtn.click({ force: true });
    await expect(user.addResource.libraryResults.first()).toBeVisible({ timeout: 20000 });

    const results = user.addResource.libraryResults;
    const total = Math.min(await results.count(), 20);
    let pick = -1;
    let pickTitle = '';
    for (let i = 0; i < total; i++) {
      const title = ((await results.nth(i).innerText()) || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)[0];
      if (title && !inPlaylist.some((e) => e.includes(title.toLowerCase()) || title.toLowerCase().includes(e))) {
        pick = i;
        pickTitle = title;
        break;
      }
    }
    test.skip(pick < 0, "every library result is already in this topic's Playlist, so there is nothing new to add");

    await results.nth(pick).click({ force: true });
    await user.page.waitForTimeout(2500);
    await saveToPlaylist(user).click({ force: true });
    await user.page.waitForTimeout(2500);
    if (await user.addResource.libraryCloseBtn.isVisible().catch(() => false)) {
      await user.addResource.libraryCloseBtn.click({ force: true });
    }

    await expect(user.playlist.resourceCards, `"${pickTitle}" was added`).toHaveCount(before + 1, { timeout: 20000 });
    // A library-added item is a regular resource card (not a custom asset), so it is removed through the general path.
    await user.playlist.enterEditMode();
    await user.playlist.removeCard(user.playlist.resourceCards.filter({ hasText: pickTitle }));
    const finish = user.playlist.finishEditingBtn.last();
    if (await finish.isVisible().catch(() => false)) await finish.click({ timeout: 10000 });
  });

  test.fixme('RES-02-08: the preview supports the asset’s own actions without leaving the preview', async () => {
    // BLOCKED (checked live, v 0.0.223): every Library preview renders inside an iframe -- an interactive activity, a
    // video or a PDF viewer -- and its controls (play/pause, page next) are not addressable from here: the "Lecture
    // Note" previews are nested frames with an empty DOM (an embedded viewer), and no video.js controls were found in
    // any of the first 10 results. Needs per-type selectors from the app team, or a known video / PDF library asset
    // to build against.
  });

  test.fixme('RES-02-09: rapid forward-clicking through a long PDF preview to a distant page does not crash the browser', async () => {
    // BLOCKED: same cause as RES-02-08 -- the PDF preview is an opaque embedded viewer, so its page controls cannot be
    // clicked from here, and no 200+ page library PDF is identified to test against.
  });

  test('RES-02-10: "content not loading" does not recur', { tag: ['@regression'] }, async ({ user }) => {
    await openLibrary(user);
    await openFirstResult(user);
    // The preview must actually load its content: no stuck spinner, no load-error text.
    await user.page.waitForTimeout(3000);
    await expect(
      user.page.getByText(/unable to load|failed to load|couldn.?t load|content not (available|found)/i)
    ).toHaveCount(0);
    await expect(
      user.page.locator('mat-spinner, .spinner, [class*="loading" i]').filter({ visible: true })
    ).toHaveCount(0, { timeout: 15000 });
  });

  test('RES-02-11: "content/images not visible" does not recur', { tag: ['@regression'] }, async ({ user }) => {
    await openLibrary(user);
    await expect(user.addResource.libraryResults.first()).toBeVisible({ timeout: 15000 });
    await user.page.waitForTimeout(2000);

    const thumbs = user.addResource.libraryResults.locator('img');
    const broken = await thumbs.evaluateAll(
      (imgs) => imgs.filter((img) => !(img.complete && img.naturalWidth > 0)).length
    );
    expect(broken, `${broken} of ${await thumbs.count()} result thumbnails failed to render`).toBe(0);
  });

  test(
    'RES-02-12: a topic name containing an apostrophe is searched as typed, not as an HTML entity',
    { tag: ['@regression', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223): for "1.3 | Coulomb's Law" the pre-filled search box reads
      // "Coulomb&#39;s Law" (the raw HTML entity), so the automatic search can never match. Same for "Ohm's Law".
      // Tracked as expected-to-fail so it isn't masked.
      test.fail(true, 'The Library search box shows &#39; instead of an apostrophe');
      await user.nav.applyClassMap('libraryApostropheTopic');
      await openLibrary(user);
      await expect(user.addResource.librarySearchInput).toHaveValue("Coulomb's Law");
    }
  );
});
