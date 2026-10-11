// FLOW-26 — When things go wrong in the middle of a flow
// Source: CEPV2_Stories/00_EndToEndFlows.md
// Data: the default class (Class 9A Science 4.1), writing one stroke on fresh space below the teacher's writing (never
// erased); 'playersDefault' (Class 12A Computer Science 2.2) for the resource that fails to open.
// The network is cut with page.route (context.setOffline has no effect in the client). FLOW-26-03/04 close or kill the
// desktop client itself and start it again (the worker's client is replaced; a fresh start is signed out by design).
// FLOW-26-02 waits in real time for the session to end (@long).

const { test, expect } = require('../../fixtures');
const {
  whereAmI,
  boardStrokes,
  waitForAutosave,
  writeStroke,
  reloadSignedIn,
  openSecondDevice,
  relaunchClient,
  clientApp,
} = require('./flow-helpers');

const WARNING_MINUTES = Number(process.env.SESSION_WARNING_MINUTES || 16);
const stayBtn = (page) => page.getByRole('button', { name: /stay signed in|continue( session)?/i });

/** Sign in on the client, open the default class, write a stroke on fresh space and let it save. */
const writeAndSave = async (app) => {
  await app.signIn();
  await app.nav.applyClassMap('default');
  await app.content.startOnFreshSpace();
  const stroke = await writeStroke(app);
  await waitForAutosave(app);
  return { stroke, place: await whereAmI(app) };
};

test.describe('FLOW-26 When things go wrong in the middle of a flow', () => {
  test.describe.configure({ timeout: 300000 });

  test.describe('on the default board', () => {
    test.use({ classMap: 'scratchBoard', freshSpace: true });

    test(
      'FLOW-26-01: writing done while the network is down is saved when it comes back',
      { tag: ['@interruption'] },
      async ({ user, page }) => {
        await user.guest.cutNetwork();
        let stroke;
        try {
          stroke = await writeStroke(user);
          await page.waitForTimeout(15000); // the autosave fails while the network is down
        } finally {
          await user.guest.restoreNetwork();
        }
        await waitForAutosave(user, 60000);
        await reloadSignedIn(user);
        expect(await boardStrokes(user), 'the writing done offline is on the board').toContain(stroke);
      }
    );

    test(
      'FLOW-26-02: a session that ends mid-lesson keeps the writing and the next sign-in shows it',
      { tag: ['@interruption', '@long'] },
      async ({ user, page }) => {
        test.setTimeout((WARNING_MINUTES + 8) * 60 * 1000);
        const stroke = await writeStroke(user);
        await waitForAutosave(user);
        await expect(stayBtn(page), 'set-up: the session is about to end').toBeVisible({
          timeout: WARNING_MINUTES * 60 * 1000,
        });
        await expect(user.login.avatar, 'set-up: the session ended').toBeHidden({ timeout: 3 * 60 * 1000 });
        await user.signIn();
        await user.nav.applyClassMap('default');
        await user.toolbar.waitForBoardToSettle();
        expect(await boardStrokes(user), 'the writing is there at the next sign-in').toContain(stroke);
      }
    );

    test(
      'FLOW-26-06: the same teacher on two devices ends with the same board on both',
      { tag: ['@interruption'] },
      async ({ user }) => {
        const second = await openSecondDevice(process.env.VALID_PIN, 'default');
        try {
          await second.app.content.panBelowExistingWriting();
          const a = await writeStroke(user, { x: 420, y: 380 }, { x: 700, y: 430 });
          const b = await writeStroke(second.app, { x: 420, y: 560 }, { x: 700, y: 610 });
          await Promise.all([waitForAutosave(user), waitForAutosave(second.app)]);
          await reloadSignedIn(user);
          await second.app.page.reload();
          await second.app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
          await second.app.toolbar.waitForBoardToSettle();
          const onClient = (await boardStrokes(user)).sort();
          const onSecond = (await boardStrokes(second.app)).sort();
          expect(onClient, 'the client has both devices’ writing').toEqual(expect.arrayContaining([a, b]));
          expect(onSecond, 'the same board on both devices').toEqual(onClient);
        } finally {
          await second.close();
        }
      }
    );
  });

  test.describe('a resource that fails to open', () => {
    test.use({ classMap: 'playersDefault', freshSpace: true });

    test(
      'FLOW-26-05: a server error while opening a resource shows a message and the board still works',
      { tag: ['@interruption'] },
      async ({ user, page }) => {
        const fail = (route) => route.fulfill({ status: 500, body: 'Internal Server Error' });
        await page.route(/fileservice\//i, fail);
        try {
          await expect(user.player.worksheetCards.first(), 'set-up: a worksheet in the topic').toBeAttached({
            timeout: 15000,
          });
          await user.player.openResourceCard(user.player.worksheetCards);
          await expect(
            page.getByText(/unable to|couldn.?t (load|open)|failed to load|error|not available|try again/i).first(),
            'a message that the resource could not be opened'
          ).toBeVisible({ timeout: 20000 });
        } finally {
          await page.unroute(/fileservice\//i, fail);
        }
        await user.player.closePlayer();
        const before = await user.toolbar.pathCount();
        await user.toolbar.penStroke({ x: 520, y: 420 }, { x: 760, y: 480 });
        expect(await user.toolbar.pathCount(), 'the board still works').toBe(before + 1);
      }
    );
  });

  test.describe('the client closes or crashes', () => {
    test.skip(!!process.env.RUN_IN_BROWSER, 'closing and restarting the desktop client has no browser equivalent');

    test(
      'FLOW-26-03: closing the client mid-lesson and starting it again restores the class, topic and board',
      { tag: ['@interruption'] },
      async ({ workerApp }) => {
        const before = await writeAndSave(await clientApp(workerApp));
        const app = await relaunchClient(workerApp);
        await app.signIn();
        await expect(app.nav.currentClassBtn, 'the class').toHaveText(before.place.cls, { timeout: 30000 });
        expect((await whereAmI(app)).topic, 'the topic').toBe(before.place.topic);
        await app.toolbar.waitForBoardToSettle();
        expect(await boardStrokes(app), 'the board').toContain(before.stroke);
      }
    );

    test(
      "FLOW-26-04: the client recovering from a crash restores the teacher's work",
      { tag: ['@interruption'] },
      async ({ workerApp }) => {
        const before = await writeAndSave(await clientApp(workerApp));
        const app = await relaunchClient(workerApp, { crash: true });
        await app.signIn();
        await expect(app.nav.currentClassBtn, 'the class').toHaveText(before.place.cls, { timeout: 30000 });
        expect((await whereAmI(app)).topic, 'the topic').toBe(before.place.topic);
        await app.toolbar.waitForBoardToSettle();
        expect(await boardStrokes(app), 'the writing done before the crash').toContain(before.stroke);
      }
    );
  });
});
