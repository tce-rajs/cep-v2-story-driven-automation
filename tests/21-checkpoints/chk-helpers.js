// Shared steps for the checkpoint specs (21-checkpoints). The teacher side uses the desktop-client fixture by default
// with the main account on the 'checkpoints' class map entry; students use the student test site in their own browser
// contexts. Set RUN_IN_BROWSER=1 to run the teacher side in a browser.

const { expect } = require('../../fixtures');
const { getClassMap } = require('../../config/moduleClassMap');
const { StudentTestPage } = require('../../pages/student-test.page');
const { App } = require('../../pages/app');
const { BASE_URL } = require('../../config/env');
const { autoName, openPlanModeOnRevisionTopic } = require('../10-plan-mode/plan-helpers');

const CP = getClassMap('checkpoints');
const GRADE = CP.grade; // "Class 10"
const DIVISION = `Division ${CP.division}`; // "Division A"

/** Create a fresh Baseline Test for the Checkpoint class without launching or submitting it. */
async function createCheckpointBaselineTest(browser) {
  const context = await browser.newContext({ baseURL: BASE_URL });
  try {
    const app = new App(await context.newPage());
    await openPlanModeOnRevisionTopic(app);
    await app.plan.openSection('Check Point');
    await app.plan.filterCheckPoint(GRADE, CP.subject);
    await expect(app.plan.createTestBtn, 'set-up: Create Test is offered for the Checkpoint class').toBeEnabled({
      timeout: 15000,
    });

    const title = autoName('BT CHK');
    const saved = await app.plan.createBaselineTest(title, 1);
    expect(saved.ok(), `set-up: the server accepts the Baseline Test (HTTP ${saved.status()})`).toBe(true);
    await app.plan.checkPointSearch.fill(title);
    await expect(
      app.page.getByText(title, { exact: true }).first(),
      `set-up: "${title}" is listed in Check Point`
    ).toBeVisible({ timeout: 15000 });
    return title;
  } finally {
    await context.close();
  }
}

/** The checkpoint the tests use by default: the class map's checkpointTitle. */
const DEFAULT_CHECKPOINT = { title: CP.checkpointTitle };

/**
 * The Playlist card of a checkpoint, matched by its title and, when given, its question count (e.g. { title: 'test 2',
 * questions: '10 Q' }), since several checkpoints share a title.
 */
const checkpointCard = (user, which = DEFAULT_CHECKPOINT) => {
  let cards = user.playlist.resourceCards.filter({ hasText: which.title });
  if (which.questions) cards = cards.filter({ hasText: which.questions });
  return cards.first();
};

/** Open a checkpoint (by default the class map's checkpointTitle) from the Playlist and wait for its panel. */
async function openCheckpoint(user, which = DEFAULT_CHECKPOINT) {
  const card = checkpointCard(user, which);
  await expect(card, `set-up: the checkpoint "${which.title}" is in the Playlist`).toBeAttached({ timeout: 20000 });
  await user.player.openResourceCard(card);
  // Never launched: the mode choice; paused: a results summary with Resume Test; launched: the roster with its badge.
  const p = user.player;
  await expect(p.checkpointTimerBadge.or(p.checkpointResumeBtn).or(p.checkpointModeOnlineBtn).first()).toBeVisible({
    timeout: 20000,
  });
}

/** The start-up timer overlay covers the page for a while after Start; hide it if it shows. */
async function hideTimerOverlay(user) {
  const hide = user.page.getByText('Hide Timer', { exact: true });
  if (
    await hide
      .waitFor({ state: 'visible', timeout: 6000 })
      .then(() => true)
      .catch(() => false)
  )
    await hide.click({ force: true });
}

/** From whatever state the open checkpoint is in, get it Started in the given mode ('online' or 'offline'). */
async function startCheckpoint(user, mode = 'online') {
  const p = user.player;
  if (await p.checkpointEndBtn.isVisible().catch(() => false)) return;
  if (await p.checkpointResumeBtn.isVisible().catch(() => false)) await p.checkpointResumeBtn.click({ force: true });
  const modeBtn = mode === 'online' ? p.checkpointModeOnlineBtn : p.checkpointModeOfflineBtn;
  if (await modeBtn.isVisible({ timeout: 3000 }).catch(() => false)) await modeBtn.click({ force: true });
  await p.checkpointStartBtn.click({ force: true, timeout: 10000 }).catch(() => {});
  // A class can run one test at a time: another test of the class still running stops the start with a message.
  const onlyOne = user.page.getByText(/Only one test can be started for a class at a time/i);
  if (
    await onlyOne
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false)
  )
    throw new Error(
      'set-up: another test of this class is still running ("Only one test can be started for a class at a time"); ' +
        'endStartedTests() ends it'
    );
  await hideTimerOverlay(user);
  await expect(p.checkpointEndBtn, 'checkpoint Started ("End Checkpoint" offered)').toBeAttached({ timeout: 20000 });
}

/** The roster legend counts: { notLoggedIn, loggedIn, attempting, submitted }. */
async function rosterCounts(user) {
  const text = (await user.page.locator('body').innerText()).replace(/\s+/g, ' ');
  const m = text.match(/(\d+) Not Logged-In (\d+) Logged-In (\d+) Attempting (\d+) Submitted/);
  if (!m) return null;
  const [notLoggedIn, loggedIn, attempting, submitted] = m.slice(1).map(Number);
  return { notLoggedIn, loggedIn, attempting, submitted };
}

/** End (pause) the open, started checkpoint: End -> Lock Test -> Confirm. */
async function endCheckpoint(user) {
  await hideTimerOverlay(user);
  await user.player.checkpointEndBtn.evaluate((el) => el.click());
  await user.player.checkpointLockTestBtn.click({ force: true, timeout: 10000 });
  const confirm = user.page.getByRole('dialog').getByRole('button', { name: 'Confirm' });
  await expect(confirm).toBeVisible({ timeout: 10000 });
  await expect(async () => {
    await confirm.click({ timeout: 3000 });
    await expect(confirm).toBeHidden({ timeout: 3000 });
  }).toPass({ timeout: 20000 });
}

/** If the checkpoint is running, end it, so a test starts from a known state. Leaves the panel closed. */
async function endIfRunning(user, which = DEFAULT_CHECKPOINT) {
  await openCheckpoint(user, which);
  if (await user.player.checkpointEndBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await endCheckpoint(user);
    await expect(user.player.checkpointEndBtn).toBeHidden({ timeout: 30000 });
  }
  await user.player.checkpointCloseBtn.click({ force: true, timeout: 5000 }).catch(() => {});
}

/**
 * A class can run only one test at a time, so a test left running (e.g. by a run that was stopped part-way) blocks
 * every other start. End every test of the class still STARTED: the Checkpoints in the checkpoint topic's Playlist and
 * the Revision Tests in the Revision Test topic's Compass list. Then go back to the class map entry `back`.
 */
async function endStartedTests(user, back) {
  const p = user.player;
  const endOpened = async () => {
    await expect(p.checkpointEndBtn, 'set-up: the running test offers End').toBeAttached({ timeout: 20000 });
    await endCheckpoint(user);
    await expect(p.checkpointEndBtn).toBeHidden({ timeout: 30000 });
    await p.checkpointCloseBtn.click({ force: true, timeout: 5000 }).catch(() => {});
    await user.page.waitForTimeout(2000);
  };

  await user.nav.applyClassMap('checkpoints');
  await user.playlist.ensureDrawerVisible();
  await expect(user.playlist.resourceCards.first(), 'set-up: the checkpoint topic lists its tests').toBeAttached({
    timeout: 20000,
  });
  await user.page.waitForTimeout(3000);
  const startedCheckpoints = user.playlist.resourceCards.filter({ hasText: /STARTED/ });
  for (let left = await startedCheckpoints.count(); left > 0; left--) {
    await p.openResourceCard(startedCheckpoints.first());
    await endOpened();
  }

  await user.nav.applyClassMap('compassRevisionTest');
  await user.page.waitForTimeout(3000);
  for (let tries = 0; tries < 5; tries++) {
    const { opened } = await user.compass.openTrigger();
    expect(opened, 'set-up: the Compass menu opened').toBe(true);
    await user.compass.revisionTestsItem.click({ force: true });
    await user.page.waitForTimeout(3000);
    const started = user.compass.revisionTestCards.filter({ hasText: /STARTED/ });
    if (!(await started.count())) {
      await user.compass.listCancelBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      await user.page.keyboard.press('Escape');
      break;
    }
    await started.first().click({ force: true });
    await endOpened();
  }

  if (back) await user.nav.applyClassMap(back);
}

/** A student's own browser context on the student test site, on the checkpoint class's sign-in page. */
async function openStudentSite(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const student = new StudentTestPage(await context.newPage());
  await student.open();
  return { context, student };
}

module.exports = {
  CP,
  GRADE,
  DIVISION,
  createCheckpointBaselineTest,
  DEFAULT_CHECKPOINT,
  checkpointCard,
  openCheckpoint,
  startCheckpoint,
  endCheckpoint,
  endIfRunning,
  endStartedTests,
  rosterCounts,
  hideTimerOverlay,
  openStudentSite,
};
