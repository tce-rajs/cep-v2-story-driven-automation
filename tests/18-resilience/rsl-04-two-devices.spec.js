// RSL-04 — The same teacher on two devices
// Source: CEPV2_Stories/18_Resilience.md
// The panel is the desktop client (`user`); the laptop is a separate browser session with its own storage, signed in
// to the same account (openLaptop). Board: 'toolbarGeneral' (9A Science 4.1), on fresh space below the existing
// writing on both devices (nothing erased). RSL-04-05 clears, so it runs on the scratch board (9A Science 8.2) and
// leaves it empty. RSL-04-06 uses two resources it creates itself (Add Resource -> Create) and removes them again.

const { test, expect } = require('../../fixtures');
const { getClassMap } = require('../../config/moduleClassMap');
const {
  BOARD,
  allStrokes,
  writeStrokes,
  boardHas,
  signInToBoard,
  waitForSave,
  offline,
  openLaptop,
  openScratchBoard,
  emptyScratch,
} = require('./resilience-lib');

const sorted = (a) => [...a].sort();

/** Reload a device and wait for its board. */
async function reloadBoard(app) {
  await app.page.reload();
  await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
  await app.toolbar.wbSvg.waitFor({ state: 'visible', timeout: 30000 });
  await app.page.waitForTimeout(2500);
  await app.toolbar.waitForBoardToSettle();
}

/** Drag `card` in front of the card two places to its left (Playlist Edit mode; as PL-09-02). */
async function dragForward(app, card) {
  const page = app.page;
  await app.playlist.enterEditMode();
  const titles = await app.playlist.cardTitles();
  const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
  const index = titles.findIndex((t) => t === text);
  await card.scrollIntoViewIfNeeded();
  const from = await card.boundingBox();
  const target = await app.playlist.resourceCards.nth(Math.max(0, index - 2)).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 - 8, from.y + from.height / 2, { steps: 4 });
  await page.waitForTimeout(300);
  await page.mouse.move(target.x + target.width / 3, target.y + target.height / 2, { steps: 30 });
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  await app.playlist.finishEditing();
}

test.describe('RSL-04 The same teacher on two devices', () => {
  test.describe.configure({ timeout: 360000 });

  test.describe('on the board', () => {
    test.use({ classMap: BOARD, freshSpace: true });

    test(
      'RSL-04-01: writing on the panel, then opening the topic on the laptop shows the writing',
      { tag: ['@concurrency'] },
      async ({ user }) => {
        const written = await writeStrokes(user, 3);
        await waitForSave(user);
        const { laptop, close } = await openLaptop();
        try {
          const { missing } = await boardHas(laptop, written);
          expect(missing, 'the laptop shows all of the panel’s writing').toBe(0);
        } finally {
          await close();
        }
      }
    );

    test(
      'RSL-04-02: writing on both devices on the same topic at the same time, a reload on each shows both sets of strokes, each once',
      { tag: ['@concurrency'] },
      async ({ user }) => {
        const { laptop, close } = await openLaptop();
        try {
          await laptop.content.startOnFreshSpace();
          const [onPanel, onLaptop] = await Promise.all([
            writeStrokes(user, 5),
            writeStrokes(laptop, 5, { x: 240, y: 520 }),
          ]);
          await Promise.all([waitForSave(user), waitForSave(laptop)]);
          await Promise.all([reloadBoard(user), reloadBoard(laptop)]);
          const both = [...onPanel, ...onLaptop];
          const panel = await boardHas(user, both);
          const lap = await boardHas(laptop, both);
          expect({ panel, laptop: lap }, 'both sets of strokes, each once, on both devices').toEqual({
            panel: { missing: 0, doubled: 0 },
            laptop: { missing: 0, doubled: 0 },
          });
        } finally {
          await close();
        }
      }
    );

    test(
      'RSL-04-03: the laptop writes offline while the panel writes online; after the laptop reconnects, both sets of strokes are kept',
      { tag: ['@concurrency'] },
      async ({ user }) => {
        const { laptop, close } = await openLaptop();
        try {
          await laptop.content.startOnFreshSpace();
          await laptop.page.route('**/*', offline);
          let onLaptop;
          try {
            onLaptop = await writeStrokes(laptop, 4, { x: 240, y: 520 });
            const onPanel = await writeStrokes(user, 4);
            await waitForSave(user);
            await laptop.page.waitForTimeout(15000); // the laptop's autosave fails meanwhile
            await laptop.page.unroute('**/*', offline);
            await waitForSave(laptop, 90000);
            await Promise.all([reloadBoard(user), reloadBoard(laptop)]);
            const both = [...onPanel, ...onLaptop];
            const panel = await boardHas(user, both);
            const lap = await boardHas(laptop, both);
            expect({ panel: panel.missing, laptop: lap.missing }, 'both sets kept on both devices').toEqual({
              panel: 0,
              laptop: 0,
            });
          } finally {
            await laptop.page.unroute('**/*').catch(() => {});
          }
        } finally {
          await close();
        }
      }
    );

    test(
      "RSL-04-04: signing in on a second device while writing on the first; the first device's writing is saved whatever happens to its session",
      { tag: ['@concurrency'] },
      async ({ user }) => {
        const written = await writeStrokes(user, 3);
        const { laptop, close } = await openLaptop();
        try {
          // The panel keeps writing straight after the laptop signed in.
          if (await user.login.avatar.isVisible().catch(() => false)) written.push(...(await writeStrokes(user, 2)));
          await user.page.waitForTimeout(20000);
          const panelSignedIn = await user.login.avatar.isVisible().catch(() => false);
          const laptopSignedIn = await laptop.login.avatar.isVisible().catch(() => false);
          test.info().annotations.push({
            type: 'note',
            description: `After the laptop signed in: panel signed in = ${panelSignedIn}, laptop signed in = ${laptopSignedIn}.`,
          });
          const { missing } = await boardHas(laptop, written, 30000).then(async (r) => {
            if (r.missing === 0) return r;
            await reloadBoard(laptop);
            return boardHas(laptop, written);
          });
          expect(missing, `all ${written.length} strokes written on the panel are saved`).toBe(0);
        } finally {
          await close();
        }
      }
    );

    test(
      'RSL-04-07: the last-opened topic after using two devices is the one used last, not an older one',
      { tag: ['@concurrency'] },
      async ({ user }) => {
        const { chapterIndex, topicIndex } = getClassMap(BOARD);
        const { laptop, close } = await openLaptop();
        try {
          // The laptop is used last, on the next topic.
          await laptop.nav.goToChapterTopic(chapterIndex, topicIndex + 1);
          await expect(laptop.nav.currentChapterTopicBtn, 'set-up: the laptop is on the next topic').toHaveText(
            new RegExp(`^\\s*${chapterIndex + 1}\\.${topicIndex + 2}\\s`),
            { timeout: 30000 }
          );
          await laptop.page.waitForTimeout(3000); // the choice reaches the server
        } finally {
          await close();
        }
        try {
          await user.userMenu.signOut();
          await user.signIn();
          await expect(
            user.nav.currentChapterTopicBtn,
            'the panel opens the topic used last (on the laptop)'
          ).toHaveText(new RegExp(`^\\s*${chapterIndex + 1}\\.${topicIndex + 2}\\s`), { timeout: 30000 });
        } finally {
          await user.nav.goToChapterTopic(chapterIndex, topicIndex).catch(() => {});
        }
      }
    );
  });

  test(
    'RSL-04-05: clearing the board on one device while the other is writing; the result after a reload is the same on both',
    { tag: ['@concurrency'] },
    async ({ app }) => {
      await openScratchBoard(app);
      const { laptop, close } = await openLaptop('scratchBoard');
      try {
        const { expectOnScratchBoard } = require('../05-toolbar/scratch-board');
        await expectOnScratchBoard(laptop);
        await writeStrokes(app, 4);
        await waitForSave(app);
        // The laptop writes while the panel clears.
        await Promise.all([
          writeStrokes(laptop, 4, { x: 240, y: 520 }),
          app.toolbar.pressClearWhiteboard(app.whiteboard),
        ]);
        await Promise.all([waitForSave(app), waitForSave(laptop)]);
        await Promise.all([reloadBoard(app), reloadBoard(laptop)]);
        const onPanel = sorted(await allStrokes(app));
        const onLaptop = sorted(await allStrokes(laptop));
        test.info().annotations.push({
          type: 'note',
          description: `After the reload: ${onPanel.length} strokes on the panel, ${onLaptop.length} on the laptop.`,
        });
        expect(onLaptop, 'the same board on both devices').toEqual(onPanel);
      } finally {
        await close();
        await emptyScratch(app).catch(() => {});
      }
    }
  );

  test(
    'RSL-04-06: reordering the Playlist on one device and removing a card on the other; both devices show the same Playlist after a reload',
    { tag: ['@concurrency'] },
    async ({ app }) => {
      const KEY = 'playersDefault';
      await signInToBoard(app, KEY);
      await app.playlist.ensureDrawerVisible();
      const stamp = Date.now();
      const [a, b] = [`AutoTest-two-dev-A-${stamp}`, `AutoTest-two-dev-B-${stamp}`];
      const card = (dev, title) => dev.playlist.resourceCards.filter({ hasText: title }).first();
      for (const title of [a, b]) {
        await app.addResource.createTextAsset(title);
        await expect(card(app, title), `set-up: ${title} in the Playlist`).toBeVisible({ timeout: 20000 });
        await app.page.keyboard.press('Escape');
      }
      const { laptop, close } = await openLaptop(KEY);
      try {
        await laptop.playlist.ensureDrawerVisible();
        await expect(card(laptop, b), 'set-up: the laptop has both new cards').toBeAttached({ timeout: 20000 });
        // Panel: move A forward. Laptop (still showing the old order): remove B.
        await dragForward(app, card(app, a));
        await laptop.playlist.removeOwnedAsset(card(laptop, b));
        await laptop.page.waitForTimeout(3000);
        await Promise.all([reloadBoard(app), reloadBoard(laptop)]);
        await app.playlist.ensureDrawerVisible();
        await laptop.playlist.ensureDrawerVisible();
        const onPanel = await app.playlist.cardTitles();
        const onLaptop = await laptop.playlist.cardTitles();
        expect(onLaptop, 'the same Playlist on both devices').toEqual(onPanel);
      } finally {
        await close();
        for (const title of [a, b])
          if (await card(app, title).count()) await app.playlist.removeOwnedAsset(card(app, title)).catch(() => {});
      }
    }
  );
});
