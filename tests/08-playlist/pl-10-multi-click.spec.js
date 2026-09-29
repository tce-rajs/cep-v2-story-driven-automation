// PL-10 — Multiple clicks and fast actions on the Playlist
// Source: CEPV2_Stories/08_Playlist.md
// Data: 'playersDefault' (Class 12A Computer Science 14.1, second account). PL-10-01 creates two small text resources
// and removes them again; the others only read.

const { test, expect } = require('../../fixtures');

const unique = (tag) => `AutoTest-${tag}-${Date.now()}`;

test.describe('PL-10 Multiple clicks on the Playlist', () => {
  test.use({ classMap: 'playersDefault' });

  test(
    'PL-10-01: double-clicking Remove’s confirm button removes only the chosen resource',
    { tag: ['@regression', '@negative'] },
    async ({ user, page }) => {
      test.setTimeout(240000);
      const pl = user.playlist;
      const a = unique('remove-a');
      const b = unique('remove-b');
      await user.addResource.createTextAsset(a);
      await expect(pl.resourceCards.filter({ hasText: a })).toBeVisible({ timeout: 20000 });
      await user.addResource.createTextAsset(b);
      await expect(pl.resourceCards.filter({ hasText: b })).toBeVisible({ timeout: 20000 });
      const before = await pl.resourceCards.count();
      try {
        await pl.enterEditMode();
        const card = pl.resourceCards.filter({ hasText: a });
        await card.first().hover();
        await card.first().locator('[data-qa-id="playlist-asset-overflow-icon-btn"]').click();
        if (
          await pl.assetRemoveBtn
            .first()
            .isVisible({ timeout: 2500 })
            .catch(() => false)
        )
          await pl.assetRemoveBtn.first().click();
        await pl.assetRemoveConfirmBtn.first().dblclick({ delay: 40 });
        await page.waitForTimeout(3000);
        await pl.finishEditing().catch(() => {});
        await expect(pl.resourceCards.filter({ hasText: a }), 'the chosen resource is gone').toHaveCount(0);
        await expect(pl.resourceCards.filter({ hasText: b }), 'the other new resource is still there').toHaveCount(1);
        await expect(pl.resourceCards, 'exactly one card was removed').toHaveCount(before - 1);
        await page.reload();
        await user.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
        await pl.ensureDrawerVisible();
        await expect(pl.resourceCards.filter({ hasText: b }), 'and it is still there after a reload').toHaveCount(1);
      } finally {
        for (const t of [a, b]) {
          const left = pl.resourceCards.filter({ hasText: t });
          if ((await left.count()) > 0) await pl.removeOwnedAsset(left).catch(() => {});
        }
      }
    }
  );

  // Fast clicks on the strip's scroll arrows: the right arrow reaches the last card without the strip going blank
  // (PL-10-02), the left arrow comes back to the first card (PL-10-05), and no card is lost or duplicated (PL-10-06) --
  // one test each (split 2026-09-28).
  // This topic has many cards: keep clicking fast until the strip stops moving (converged), as an impatient teacher
  // would, up to 100 clicks. Checked every 5 clicks, not every click, so 100 clicks fits the timeout.
  const clickUntilConverged = async (btn, tracked) => {
    let lastX = null;
    for (let i = 0; i < 100; i++) {
      await btn.click({ force: true, timeout: 3000 }).catch(() => {});
      if (i % 5 !== 4) continue;
      const box = await tracked.boundingBox().catch(() => null);
      const x = box && box.x;
      if (x !== null && x === lastX) return;
      lastX = x;
    }
  };
  const scrollRightToEnd = async (pl, page) => {
    await clickUntilConverged(pl.rightScrollBtn, pl.resourceCards.last());
    await page.waitForTimeout(1500);
  };
  const scrollLeftToStart = async (pl, page) => {
    await clickUntilConverged(pl.leftScrollBtn, pl.resourceCards.first());
    await page.waitForTimeout(1500);
  };

  test(
    'PL-10-02: fast clicks on the strip’s right arrow reach the last card and never leave the strip blank',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      test.setTimeout(180000);
      const pl = user.playlist;
      await scrollRightToEnd(pl, page);
      const visibleAtEnd = await pl.resourceCards.filter({ visible: true }).count();
      expect(visibleAtEnd, 'cards are still showing after scrolling right past the end').toBeGreaterThan(0);
      await expect(pl.resourceCards.last(), 'the last card can be reached').toBeInViewport({ timeout: 5000 });
    }
  );

  test(
    'PL-10-05: after scrolling to the end, fast clicks on the left arrow come back to the first card',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      test.setTimeout(240000);
      const pl = user.playlist;
      await scrollRightToEnd(pl, page);
      await scrollLeftToStart(pl, page);
      await expect(pl.resourceCards.first(), 'the first card again').toBeInViewport({ timeout: 5000 });
    }
  );

  test(
    'PL-10-06: fast scrolling to both ends of the strip loses or duplicates no card',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      test.setTimeout(240000);
      const pl = user.playlist;
      const total = await pl.resourceCards.count();
      await scrollRightToEnd(pl, page);
      await scrollLeftToStart(pl, page);
      await expect(pl.resourceCards, 'no card lost or duplicated by scrolling').toHaveCount(total);
    }
  );

  // Double-clicking a topic in Contents: the label shows the chosen topic (PL-10-03), and the Contents window closes and
  // is not reopened by the second click (PL-10-07) -- one test each (split 2026-09-28).
  /** Double-click the second topic of the current chapter in Contents; returns the topic's text. */
  const doubleClickSecondTopic = async (user, page) => {
    const nav = user.nav;
    await nav.openChaptersPopup();
    await page.waitForTimeout(500);
    // The popup can open with the current chapter's topics already listed; otherwise pick the chapter first.
    if (
      !(await nav.topicItems
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false))
    )
      await nav.chapterItems.first().click();
    await nav.topicItems.first().waitFor({ state: 'visible', timeout: 10000 });
    const count = await nav.topicItems.count();
    test.skip(count < 2, 'needs a chapter with at least two topics');
    const topicText = ((await nav.topicItems.nth(1).innerText()) || '').replace(/\s+/g, ' ').trim();
    await nav.topicItems.nth(1).dblclick({ delay: 40 });
    await page.waitForTimeout(3000);
    return topicText;
  };

  test(
    'PL-10-03: double-clicking a topic in Contents opens that topic, and the current-topic label shows it',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const topicText = await doubleClickSecondTopic(user, page);
      const label = ((await user.nav.currentChapterTopicBtn.innerText()) || '').replace(/\s+/g, ' ');
      const number = (topicText.match(/\d+(\.\d+)?/) || [''])[0];
      expect(label, 'the current-topic label shows the chosen topic').toContain(number);
      expect(errors, 'no script errors').toEqual([]);
    }
  );

  test(
    'PL-10-07: after double-clicking a topic in Contents, the Contents window is closed and not reopened',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await doubleClickSecondTopic(user, page);
      await expect(
        user.nav.chapterTpPopup,
        'the Contents popup closed (not re-opened by the second click)'
      ).toBeHidden();
    }
  );

  // Toggling Edit mode on and off five times fast: not stuck in Edit mode (PL-10-04), no card lost or duplicated
  // (PL-10-08), and cards still open normally (PL-10-09) -- one test each (split 2026-09-28).
  const toggleEditFiveTimes = async (user, page) => {
    const pl = user.playlist;
    for (let i = 0; i < 5; i++) {
      await pl.enterEditMode().catch(() => {});
      await pl.finishEditing().catch(() => {});
    }
    await page.waitForTimeout(2000);
  };

  test(
    'PL-10-04: toggling Edit mode on and off five times fast leaves the Playlist in normal mode',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await toggleEditFiveTimes(user, page);
      await expect(user.playlist.finishEditingBtn, 'not stuck in Edit mode').toBeHidden();
    }
  );

  test(
    'PL-10-08: toggling Edit mode on and off five times fast loses or duplicates no card',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const total = await user.playlist.resourceCards.count();
      await toggleEditFiveTimes(user, page);
      await expect(user.playlist.resourceCards, 'no card lost or duplicated').toHaveCount(total);
    }
  );

  test(
    'PL-10-09: after toggling Edit mode on and off five times fast, cards still open normally',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      await toggleEditFiveTimes(user, page);
      await user.player.openResourceCard(user.playlist.resourceCards.first());
      await expect(user.player.closeIcon.first(), 'cards still open normally').toBeVisible({ timeout: 20000 });
      await user.player.closePlayer();
    }
  );
});
