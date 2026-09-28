// PLR-13 — Multiple clicks on every kind of asset
// Source: CEPV2_Stories/11_Players.md
// Data: 'playersDefault' (Class 12A Computer Science 14.1) holds a Video, Worksheet (PDF), Image, Web link, Code editor
// and an Unsupported-file card; 'quiz' (Class 11A Accountancy 3.1) holds the Quiz. Nothing is created or removed.
//
// Teachers double- and triple-tap on interactive panels (touch screens register a slow tap as two). Each asset kind is
// checked the same four ways: a double click and a triple click on its Playlist card must open exactly ONE player;
// double-clicking the player's own close button must close it cleanly; and opening/closing it five times fast must leave
// nothing behind. PLR-12-03 (six quick opens of one card) and PLR-05-08 (double-click a video) cover the earlier cases.

const { test, expect } = require('../../fixtures');

const icon = (name) =>
  `[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="${name}" i]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="${name}" i])`;

const KINDS = [
  { id: '01', kind: 'video', selector: icon('ic.AVMediaVideo'), map: 'playersDefault' },
  { id: '02', kind: 'worksheet (PDF)', selector: icon('ic.Worksheet'), map: 'playersDefault' },
  { id: '03', kind: 'image', selector: icon('ic.Image'), map: 'playersDefault' },
  { id: '04', kind: 'web link', selector: icon('ic.Weblink'), map: 'playersDefault' },
  { id: '05', kind: 'code editor', selector: icon('ic.code'), map: 'playersDefault' },
  { id: '06', kind: 'unsupported file', selector: icon('ic.unsupport'), map: 'playersDefault' },
  { id: '07', kind: 'quiz', selector: '[data-qa-id="playlist-quiz-card"] .resource-card', map: 'quiz' },
];

/** Real pointer clicks on the card (a DOM click would not produce a double-click). */
const clickCard = async (user, card, clickCount) => {
  await card.first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await card.first().click({ clickCount, delay: 40, force: true });
};

// The code editor opens as its own component (tce-code-main) without the usual close icon; the other players show one
// close icon per open player.
// The quiz shows two buttons in the close-icon style (close and split screen), so it is counted by its renderer.
const playerSignal = (user, k) =>
  k.kind === 'code editor'
    ? user.player.codeEditorComponent.filter({ visible: true })
    : k.kind === 'quiz'
      ? user.player.quizRenderer.filter({ visible: true })
      : user.player.closeIcon;
const openCount = (user, k) => playerSignal(user, k).count();
const closeButton = (user, k) => (k.kind === 'quiz' ? user.player.quizCloseBtn : user.player.closeIcon.first());

for (const k of KINDS) {
  test.describe(`PLR-13-${k.id} Multiple clicks on a ${k.kind}`, () => {
    test.use({ classMap: k.map });

    test.beforeEach(async ({ user }) => {
      await expect(user.page.locator(k.selector).first(), `a ${k.kind} card is in this topic`).toBeAttached({
        timeout: 15000,
      });
    });

    test.afterEach(async ({ app }) => {
      for (let i = 0; i < 4; i++) await app.player.closePlayer().catch(() => {});
      await app.page.keyboard.press('Escape').catch(() => {});
    });

    // CONFIRMED LIVE (same class as PlayerPage.openCodeEditorCard's own note): a click on the code editor's card can
    // silently not open it on the first attempt (it is the heaviest player to mount) -- retry the same click count
    // once before treating "no player" as the real result being tested.
    const clickAndConfirm = async (user, card, clickCount) => {
      await clickCard(user, card, clickCount);
      let opened = await playerSignal(user, k)
        .first()
        .isVisible({ timeout: 20000 })
        .catch(() => false);
      if (!opened) {
        await clickCard(user, card, clickCount);
        opened = await playerSignal(user, k)
          .first()
          .isVisible({ timeout: 20000 })
          .catch(() => false);
      }
      return opened;
    };

    test(
      `PLR-13-${k.id}a: double-clicking a ${k.kind} card opens exactly one player`,
      { tag: ['@edge'] },
      async ({ user, page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const opened = await clickAndConfirm(user, page.locator(k.selector), 2);
        expect(opened, 'a player opened').toBe(true);
        await page.waitForTimeout(3000);
        expect(await openCount(user, k), 'exactly one player, not two').toBe(1);
        expect(errors, 'no script errors').toEqual([]);
      }
    );

    test(
      `PLR-13-${k.id}b: triple-clicking a ${k.kind} card opens exactly one player`,
      { tag: ['@edge'] },
      async ({ user, page }) => {
        const opened = await clickAndConfirm(user, page.locator(k.selector), 3);
        expect(opened, 'a player opened').toBe(true);
        await page.waitForTimeout(3000);
        expect(await openCount(user, k), 'exactly one player, not three').toBe(1);
      }
    );

    test(
      `PLR-13-${k.id}c: double-clicking the ${k.kind} player's close button closes it cleanly`,
      { tag: ['@edge'] },
      async ({ user, page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await user.player.openResourceCard(page.locator(k.selector));
        await expect(playerSignal(user, k).first()).toBeVisible({ timeout: 20000 });
        await page.waitForTimeout(2000);
        await closeButton(user, k).click({ clickCount: 2, delay: 40, force: true });
        await page.waitForTimeout(2500);
        expect(await openCount(user, k), 'the player is gone and nothing else opened or closed by mistake').toBe(0);
        expect(errors, 'no script errors').toEqual([]);
        // The Playlist still works afterwards: the same card opens again.
        await user.player.openResourceCard(page.locator(k.selector));
        await expect(playerSignal(user, k).first(), 'the card opens again afterwards').toBeVisible({ timeout: 20000 });
      }
    );

    test(
      `PLR-13-${k.id}d: opening and closing a ${k.kind} five times fast leaves nothing behind`,
      { tag: ['@edge', '@regression'] },
      async ({ user, page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        for (let i = 0; i < 5; i++) {
          await user.player.openResourceCard(page.locator(k.selector));
          await playerSignal(user, k)
            .first()
            .waitFor({ state: 'visible', timeout: 20000 })
            .catch(() => {});
          // Retried like PlayerPage.closePlayer(): an ngx-spinner-overlay can intercept the very next click after
          // opening, so a single close attempt can miss.
          for (let attempt = 0; attempt < 3 && (await openCount(user, k)) > 0; attempt++) {
            await closeButton(user, k)
              .click({ force: true, timeout: 3000 })
              .catch(() => {});
            await page.waitForTimeout(500);
          }
        }
        await page.waitForTimeout(4000);
        expect(await openCount(user, k), 'no leftover players after 5 fast open/close cycles').toBe(0);
        expect(errors, 'no script errors').toEqual([]);
      }
    );
  });
}
