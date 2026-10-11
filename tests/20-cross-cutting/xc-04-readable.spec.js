// XC-04 — Readable on a classroom panel
// Source: CEPV2_Stories/20_CrossCutting.md
// Runs in the desktop client. Strokes go on fresh space of the default board (9A Science 4.1), nothing erased; the
// board background and the theme are put back as they were. "Clearly visible" is the WCAG contrast of 3:1 for
// graphics (WhiteboardContent.inkContrast). Screen sizes are shown to the page through DevTools screen emulation
// (tests/19-desktop-client/cli-lib.js), cleared afterwards.

const { test, expect } = require('../../fixtures');
const { emulateScreen } = require('../19-desktop-client/cli-lib');

/** Is the board in dark mode? (the avatar menu's Dark Mode toggle) */
async function isDark(user) {
  await user.userMenu.openProfileMenu();
  const on = await user.userMenu.darkModeToggle.isChecked().catch(() => null);
  await user.page.keyboard.press('Escape');
  return on;
}
async function setDark(user, on) {
  if ((await isDark(user)) === on) return;
  await user.userMenu.openProfileMenu();
  await user.userMenu.darkModeToggle.click({ force: true });
  await user.page.waitForTimeout(1000);
  await user.page.keyboard.press('Escape');
}

/** One stroke in pen colour `i`; returns its locator (by outline, so it survives re-renders). */
async function strokeInColour(user, i, at) {
  const tb = user.toolbar;
  await tb.openToolPanel('gtPen');
  await tb.penColorOptions.nth(i).click({ force: true });
  await tb.closePanelByTappingOutside();
  await tb.drawStroke(at, { x: at.x, y: at.y + 90 }, 8);
  const d = await tb.paths.last().getAttribute('d');
  return tb.wbContainer.locator(`svg path[d="${d}"]`).first();
}

test.describe('XC-04 Readable on a classroom panel', () => {
  test.describe.configure({ timeout: 300000 });

  test.describe('on the board', () => {
    test.use({ freshSpace: true });

    let themeBefore;
    test.beforeEach(async ({ user }) => {
      themeBefore = await isDark(user);
    });
    test.afterEach(async ({ app }) => {
      if (themeBefore !== null) await setDark(app, themeBefore).catch(() => {});
    });

    test(
      'XC-04-01: every pen colour shows clearly on each background in dark mode',
      { tag: ['@functional'] },
      async ({ user }) => {
        const tb = user.toolbar;
        await setDark(user, true);
        const colours = await tb.penColorOptions.count();
        const strokes = [];
        for (let i = 0; i < colours; i++) strokes.push(await strokeInColour(user, i, { x: 300 + i * 60, y: 400 }));
        await tb.openToolPanel('gtBackground');
        const backgrounds = await tb.backgroundOptions.evaluateAll((els) =>
          els.map((e) => e.getAttribute('data-qa-id'))
        );
        const original = await tb.backgroundActive
          .first()
          .getAttribute('data-qa-id')
          .catch(() => null);
        await tb.closePanelByTappingOutside();
        const unclear = [];
        try {
          for (const id of backgrounds) {
            await tb.chooseBackground(id.replace('toolbar-background-', ''));
            for (let i = 0; i < strokes.length; i++) {
              const c = await user.content.inkContrast(strokes[i]);
              if (c.ratio < 3) unclear.push(`${id}: colour ${i + 1} ${c.ink} on ${c.board} (${c.ratio}:1)`);
            }
          }
        } finally {
          if (original) await tb.chooseBackground(original.replace('toolbar-background-', '')).catch(() => {});
        }
        expect(unclear, 'every colour is clearly visible on every background (3:1)').toEqual([]);
      }
    );

    test(
      'XC-04-02: writing in white on the dark board is still visible in light mode, and black on light in dark mode',
      { tag: ['@negative'] },
      async ({ user }) => {
        const tb = user.toolbar;
        /** The pen colour whose stroke is closest to `rgb` (white / black). */
        const pickColour = async (target) => {
          await tb.openToolPanel('gtPen');
          const n = await tb.penColorOptions.count();
          let best = 0;
          let bestDist = Infinity;
          for (let i = 0; i < n; i++) {
            const bg = await tb.penColorOptions.nth(i).evaluate((e) => {
              const cs = getComputedStyle(e);
              return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : cs.color;
            });
            const [r, g, b] = (bg.match(/\d+/g) || [0, 0, 0]).map(Number);
            const dist = Math.abs(r - target) + Math.abs(g - target) + Math.abs(b - target);
            if (dist < bestDist) [best, bestDist] = [i, dist];
          }
          await tb.closePanelByTappingOutside();
          return best;
        };
        const results = {};
        for (const [startDark, target, name] of [
          [true, 255, 'white written in dark mode, seen in light mode'],
          [false, 0, 'black written in light mode, seen in dark mode'],
        ]) {
          await setDark(user, startDark);
          const stroke = await strokeInColour(user, await pickColour(target), { x: startDark ? 400 : 600, y: 400 });
          await setDark(user, !startDark);
          results[name] = await user.content.inkContrast(stroke);
        }
        test.info().annotations.push({ type: 'note', description: JSON.stringify(results) });
        for (const [name, c] of Object.entries(results))
          expect.soft(c.ratio, `${name}: still clearly visible (${c.ink} on ${c.board})`).toBeGreaterThanOrEqual(3);
      }
    );
  });

  test(
    'XC-04-03: the sign-in form and main dialogs can be used with the keyboard alone (Tab, Enter, Escape)',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      /** Press Tab until `locator` has the focus (at most `max` times). */
      const tabTo = async (locator, max = 60) => {
        for (let i = 0; i < max; i++) {
          if (
            await locator
              .evaluate((el) => el === document.activeElement || el.contains(document.activeElement))
              .catch(() => false)
          )
            return true;
          await page.keyboard.press('Tab');
        }
        return false;
      };
      expect(await tabTo(app.login.toggleButton), 'Tab reaches Sign In').toBe(true);
      await page.keyboard.press('Enter');
      await expect.poll(() => app.login.isSignInOpen(), { message: 'Enter opens Sign In' }).toBe(true);
      expect(await tabTo(app.login.pinDigitBox(0), 20), 'Tab reaches the PIN').toBe(true);
      await page.keyboard.type(String(process.env.VALID_PIN), { delay: 80 });
      await expect(app.login.avatar, 'signed in with the keyboard alone').toBeVisible({ timeout: 20000 });
      // A main dialog: the class chooser opens with Enter and closes with Escape.
      expect(await tabTo(app.nav.currentClassBtn), 'Tab reaches the class button').toBe(true);
      await page.keyboard.press('Enter');
      await expect(
        app.nav.recentClassesTab.or(app.nav.allMyClassesTab).first(),
        'Enter opens the class chooser'
      ).toBeVisible({
        timeout: 10000,
      });
      await page.keyboard.press('Escape');
      await expect(app.nav.allMyClassesTab, 'Escape closes it').toBeHidden({ timeout: 5000 });
    }
  );

  test(
    'XC-04-04: text on buttons and messages is readable at 1366×768 and on a 4K panel',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const MIN_PX = 11; // the smallest text that is readable from a classroom (CSS px at the screen's scaling)
      const small = {};
      // A 4K panel runs at Windows' recommended 150% scaling.
      for (const screen of [
        { name: '1366×768', width: 1366, height: 768, scale: 1 },
        { name: '4K panel', width: 2560, height: 1440, scale: 1.5 },
      ]) {
        const undo = await emulateScreen(page, screen);
        try {
          await user.magnet.open(); // a menu with buttons, as well as the toolbar, header and class bar
          small[screen.name] = await page.evaluate((min) => {
            const out = [];
            for (const e of document.querySelectorAll(
              'button, [role="button"], a, label, [data-qa-id], mat-snack-bar-container, .toast-container'
            )) {
              const r = e.getBoundingClientRect();
              const text = (e.innerText || '').trim();
              if (!text || r.width === 0 || r.bottom < 0 || r.top > innerHeight) continue;
              const size = parseFloat(getComputedStyle(e).fontSize);
              if (size < min) out.push(`${text.slice(0, 30)} (${size}px)`);
            }
            return [...new Set(out)].slice(0, 20);
          }, MIN_PX);
          await page.keyboard.press('Escape');
        } finally {
          await undo();
        }
      }
      for (const [name, list] of Object.entries(small))
        expect.soft(list, `${name}: no button or message text under ${MIN_PX}px`).toEqual([]);
    }
  );
});
