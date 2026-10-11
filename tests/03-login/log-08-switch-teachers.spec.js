// LOG-08 — Teachers switching on a shared classroom panel
// Source: CEPV2_Stories/03_Login.md
// Teacher A is the main account (VALID_PIN), teacher B the second one (VALID_PIN_2). Teacher A writes one stroke on
// fresh space of the default class's board (nothing existing is touched); the checks look for that exact stroke.

const { test, expect } = require('../../fixtures');

const TEACHER_A = process.env.VALID_PIN;
const TEACHER_B = process.env.VALID_PIN_2;

/** Teacher A signs in, opens the default class, writes one stroke on fresh space, waits for it to save and signs
 * out. Returns the stroke's outline (its `d` attribute), which identifies it on any board. */
const teacherAWritesAndSignsOut = async (app, page) => {
  await app.signIn(TEACHER_A);
  await app.nav.applyClassMap('default');
  await app.content.startOnFreshSpace();
  await app.toolbar.penStroke({ x: 640, y: 420 }, { x: 910, y: 505 });
  const stroke = await app.toolbar.paths.last().getAttribute('d');
  await page.waitForTimeout(12000); // past the autosave countdown
  await app.userMenu.signOut();
  await page.waitForTimeout(3000);
  return stroke;
};

const strokesOnBoard = (app) => app.toolbar.allPaths.evaluateAll((ps) => ps.map((p) => p.getAttribute('d')));

test.describe('LOG-08 Teachers switching on a shared classroom panel', () => {
  test.describe.configure({ timeout: 240000 });
  test.skip(!TEACHER_B, 'needs a second teacher account: set VALID_PIN_2 in .env');

  test.beforeEach(async ({ app }) => {
    await app.guest.open();
  });

  test(
    "LOG-08-01: after a teacher signs out, the board shows none of that teacher's writing",
    { tag: ['@functional'] },
    async ({ app, page }) => {
      const stroke = await teacherAWritesAndSignsOut(app, page);
      expect(await strokesOnBoard(app), "teacher A's stroke is not on the signed-out board").not.toContain(stroke);
    }
  );

  test(
    "LOG-08-02: after a teacher signs out, none of that teacher's classes or Playlist is shown",
    { tag: ['@functional'] },
    async ({ app, page }) => {
      await teacherAWritesAndSignsOut(app, page);
      await expect(app.guest.classButton.filter({ visible: true }), 'no class').toHaveCount(0);
      await expect(app.guest.chapterTopicButton.filter({ visible: true }), 'no chapter or topic').toHaveCount(0);
      await expect(app.guest.playlistElements.filter({ visible: true }), 'no Playlist').toHaveCount(0);
    }
  );

  test(
    'LOG-08-03: the next teacher to sign in sees their own name in the User menu',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.signIn(TEACHER_A);
      await app.userMenu.openProfileMenu();
      const nameA = (await app.userMenu.drilldownTrigger.innerText()).replace(/\s+/g, ' ').trim();
      await app.page.keyboard.press('Escape');
      await app.userMenu.signOut();
      await app.signIn(TEACHER_B);
      await app.userMenu.openProfileMenu();
      const nameB = (await app.userMenu.drilldownTrigger.innerText()).replace(/\s+/g, ' ').trim();
      await app.page.keyboard.press('Escape');
      expect(nameB, "teacher B's own name, not teacher A's").not.toBe(nameA);
      await app.userMenu.signOut();
    }
  );

  test(
    "LOG-08-04: the next teacher's board on the same class does not show the previous teacher's writing",
    { tag: ['@functional'] },
    async ({ app, page }) => {
      const stroke = await teacherAWritesAndSignsOut(app, page);
      await app.signIn(TEACHER_B);
      await app.nav.applyClassMap('default');
      await app.toolbar.waitForBoardToSettle();
      expect(await strokesOnBoard(app), "teacher A's stroke is not on teacher B's board").not.toContain(stroke);
      await app.userMenu.signOut();
    }
  );
});
