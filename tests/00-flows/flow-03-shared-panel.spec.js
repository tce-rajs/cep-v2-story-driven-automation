// FLOW-03 — Signing in and out on a shared classroom panel
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Teacher A is the main account (VALID_PIN, raj.shinde), teacher B the second one (VALID_PIN_2, melville.coutinho);
// the password sign-in uses the spare account (DISPOSABLE_* in .env). Writing is one stroke on fresh space below the
// teacher's writing (never erased); FLOW-03-08 adds one own resource to teacher A's default topic and removes it again.
// FLOW-03-04/05/06 wait in real time for the session checks (@long): Playwright's fake clock has no effect in the client.

const { test, expect } = require('../../fixtures');
const { whereAmI, boardStrokes, waitForAutosave, writeStroke, switchTeacher } = require('./flow-helpers');

const TEACHER_A = process.env.VALID_PIN;
const TEACHER_B = process.env.VALID_PIN_2;
const stayBtn = (page) => page.getByRole('button', { name: /stay signed in|continue( session)?/i });
const WARNING_MINUTES = Number(process.env.SESSION_WARNING_MINUTES || 16);

const signedInName = async (app) => {
  await app.userMenu.openProfileMenu();
  const name = (await app.userMenu.drilldownTrigger.innerText()).replace(/\s+/g, ' ').trim();
  await app.page.keyboard.press('Escape');
  return name;
};

test.describe('FLOW-03 Signing in and out on a shared classroom panel', () => {
  test.describe.configure({ timeout: 300000 });

  test('FLOW-03-01: signing in with user name and PIN opens Teach Mode', { tag: ['@smoke'] }, async ({ app }) => {
    await app.signIn(TEACHER_A);
    await expect(app.login.avatar, 'signed in').toBeVisible();
    await expect(app.toolbar.wbSvg, 'Teach Mode board').toBeVisible();
    await expect(app.magnet.tool, 'Teach Mode tools').toBeVisible();
    await expect(app.nav.currentClassBtn, 'the teacher’s class').toContainText(/Class/i, { timeout: 20000 });
  });

  test(
    'FLOW-03-02: signing in with user name and password opens Teach Mode',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      test.skip(!process.env.DISPOSABLE_USERNAME, 'needs the spare account (DISPOSABLE_* in .env)');
      await app.login.signInWithPassword({
        schoolSearchTerm: process.env.DISPOSABLE_SCHOOL_SEARCH_TERM || process.env.SCHOOL_SEARCH_TERM,
        username: process.env.DISPOSABLE_USERNAME,
        password: process.env.DISPOSABLE_PASSWORD,
      });
      await expect(app.login.avatar, 'signed in').toBeVisible({ timeout: 20000 });
      await expect(app.toolbar.wbSvg, 'Teach Mode board').toBeVisible();
      await expect(app.magnet.tool, 'Teach Mode tools').toBeVisible();
    }
  );

  test('FLOW-03-03: a wrong PIN shows a message and does not sign in', { tag: ['@negative'] }, async ({ app }) => {
    await app.guest.open();
    await app.login.openSignIn();
    await app.login.enterPin(process.env.INVALID_PIN || '00000');
    await expect(app.login.pinErrorMessage, 'a message').toBeVisible({ timeout: 15000 });
    await expect(app.login.avatar, 'not signed in').toBeHidden();
  });

  test('FLOW-03-03: a wrong password shows a message and does not sign in', { tag: ['@negative'] }, async ({ app }) => {
    await app.login.signInWithPassword({
      schoolSearchTerm: process.env.SCHOOL_SEARCH_TERM,
      username: process.env.USERNAME,
      password: `wrong-${Date.now()}`,
    });
    await expect(app.login.passwordErrorMessage, 'a message').toBeVisible({ timeout: 15000 });
    await expect(app.login.avatar, 'not signed in').toBeHidden();
  });

  test.describe('the session while teaching', () => {
    test.use({ freshSpace: true });

    test(
      'FLOW-03-04: a teacher who keeps working is not signed out after the session time',
      { tag: ['@functional', '@long'] },
      async ({ user, page }) => {
        // A token lasts 5 minutes and is renewed at each check while the teacher works: 7 minutes of writing (a stroke
        // every 30 s) runs past the first token's end.
        test.setTimeout(12 * 60 * 1000);
        const until = Date.now() + 7 * 60 * 1000;
        for (let i = 0; Date.now() < until; i++) {
          await user.toolbar.penStroke({ x: 260 + (i % 20) * 50, y: 440 }, { x: 290 + (i % 20) * 50, y: 480 });
          await expect(stayBtn(page), 'no Sign Out / Continue popup while working').toBeHidden();
          await expect(user.login.avatar, 'still signed in').toBeVisible();
          await page.waitForTimeout(30000);
        }
        await expect(user.login.avatar, 'still signed in after the session time').toBeVisible();
      }
    );

    test(
      'FLOW-03-05: an idle teacher sees the Sign Out / Continue message, and Continue keeps the session',
      { tag: ['@functional', '@long'] },
      async ({ user, page }) => {
        test.setTimeout((WARNING_MINUTES + 4) * 60 * 1000);
        await expect(stayBtn(page), 'the Sign Out / Continue message after idling').toBeVisible({
          timeout: WARNING_MINUTES * 60 * 1000,
        });
        await stayBtn(page).click();
        await expect(stayBtn(page), 'the message closes').toBeHidden({ timeout: 5000 });
        await page.waitForTimeout(90000); // past the message's own 1-minute window
        await expect(user.login.avatar, 'Continue kept the session').toBeVisible();
        const before = await user.toolbar.pathCount();
        await user.toolbar.penStroke({ x: 600, y: 420 }, { x: 800, y: 470 });
        expect(await user.toolbar.pathCount(), 'and the board still works').toBe(before + 1);
      }
    );

    test(
      'FLOW-03-06: an idle teacher who does not answer is signed out, and their writing is saved',
      { tag: ['@functional', '@long'] },
      async ({ user, page }) => {
        test.setTimeout((WARNING_MINUTES + 8) * 60 * 1000);
        const stroke = await writeStroke(user);
        await waitForAutosave(user);
        await expect(stayBtn(page), 'set-up: the Sign Out / Continue message').toBeVisible({
          timeout: WARNING_MINUTES * 60 * 1000,
        });
        await expect(user.login.avatar, 'signed out when nobody answers').toBeHidden({ timeout: 3 * 60 * 1000 });
        await user.signIn();
        await user.nav.applyClassMap('default');
        await user.toolbar.waitForBoardToSettle();
        expect(await boardStrokes(user), 'the writing is on the board after signing in again').toContain(stroke);
      }
    );
  });

  test.describe('two teachers, one panel', () => {
    test.skip(!TEACHER_B, 'needs a second teacher account: set VALID_PIN_2 in .env');

    test(
      'FLOW-03-07: a second teacher signing in on the same panel sees their own class and board',
      { tag: ['@functional'] },
      async ({ app }) => {
        // Teacher B's own place: B's general class (Class 12A Computer Science) with B's board as it is now.
        await switchTeacher(app, TEACHER_B, 'defaultAccount2');
        const ownPlace = await whereAmI(app);
        const ownBoard = (await boardStrokes(app)).sort();
        const nameB = await signedInName(app);
        // Teacher A uses the panel in between.
        await switchTeacher(app, TEACHER_A, 'default');
        const nameA = await signedInName(app);
        await app.userMenu.signOut();

        await switchTeacher(app, TEACHER_B);
        expect(await signedInName(app), 'teacher B’s own name').toBe(nameB);
        expect(nameB, 'not teacher A’s').not.toBe(nameA);
        await expect(app.nav.currentClassBtn, 'teacher B’s own class').toHaveText(ownPlace.cls, { timeout: 30000 });
        expect((await whereAmI(app)).topic, 'teacher B’s own topic').toBe(ownPlace.topic);
        expect((await boardStrokes(app)).sort(), 'teacher B’s own board').toEqual(ownBoard);
      }
    );

    test(
      "FLOW-03-08: the second teacher sees nothing of the first teacher's board, notices or resources",
      { tag: ['@negative'] },
      async ({ app, page }) => {
        // Teacher A writes a stroke and adds an own resource in the default topic (Class 9A Science 4.1).
        await switchTeacher(app, TEACHER_A, 'default');
        await app.content.startOnFreshSpace();
        const stroke = await writeStroke(app);
        await waitForAutosave(app);
        const title = `AutoTest-teacherA-${Date.now()}`;
        await app.addResource.createTextAsset(title);
        await expect(app.playlist.resourceCards.filter({ hasText: title }), 'set-up: A’s resource').toHaveCount(1, {
          timeout: 20000,
        });
        try {
          await app.userMenu.signOut();
          await switchTeacher(app, TEACHER_B, 'default');
          await app.playlist.ensureDrawerVisible();
          expect(await boardStrokes(app), 'none of A’s writing on B’s board').not.toContain(stroke);
          expect(
            (await app.playlist.cardTitles()).filter((t) => t.includes(title)),
            'none of A’s resources in B’s Playlist'
          ).toEqual([]);
          // Notices: the suite never sends one from A, so B's Magnet must open B's own (empty) notice capture only.
          await app.magnet.open();
          await expect(page.getByText(title), 'nothing of A’s anywhere on B’s screen').toHaveCount(0);
          await page.keyboard.press('Escape');
        } finally {
          await switchTeacher(app, TEACHER_A, 'default').catch(() => {});
          await app.playlist.ensureDrawerVisible().catch(() => {});
          const mine = app.playlist.resourceCards.filter({ hasText: title });
          if (await mine.count().catch(() => 0)) await app.playlist.removeOwnedAsset(mine).catch(() => {});
        }
      }
    );

    test(
      'FLOW-03-09: the first teacher signing in again finds their work as they left it',
      { tag: ['@functional'] },
      async ({ app }) => {
        await switchTeacher(app, TEACHER_A, 'default');
        await app.content.startOnFreshSpace();
        const stroke = await writeStroke(app);
        await waitForAutosave(app);
        const left = await whereAmI(app);
        await app.userMenu.signOut();

        await switchTeacher(app, TEACHER_B);
        await app.userMenu.signOut();

        await switchTeacher(app, TEACHER_A);
        await expect(app.nav.currentClassBtn, 'the class A left on').toHaveText(left.cls, { timeout: 30000 });
        expect((await whereAmI(app)).topic, 'the topic A left on').toBe(left.topic);
        expect(await boardStrokes(app), 'A’s writing is there').toContain(stroke);
      }
    );
  });
});
