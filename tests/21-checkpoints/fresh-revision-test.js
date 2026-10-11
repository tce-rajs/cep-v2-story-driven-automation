// A fresh Revision Test for each run. Every student of 10A may sign in to a running test only once, so a run that
// reuses an old test soon has no students left ("DATA MISSING ... all students have already signed in"). A spec that
// needs students calls createFreshRevisionTest() in its first test, keeps the title in its state file and uses that
// test for the rest of the run.
//
// The test is made in Plan Mode with the main account on the 'compassRevisionTest' topic (10A Science 3.4, the topic
// with single-choice questions), from its first `questions` single-choice questions (the topic has two). Revision
// Tests cannot be deleted in the app (known issue), so each one stays in the topic's Compass list as "AutoTest RT …".

const { expect } = require('../../fixtures');
const { getClassMap } = require('../../config/moduleClassMap');
const { switchToPlanningOn } = require('../10-plan-mode/plan-helpers');
const { endStartedTests } = require('./chk-helpers');

/**
 * Create a fresh Revision Test and come back to the topic in Teach Mode. `user` is signed in with the main account
 * on the 'compassRevisionTest' class map entry. Returns { title, questions } in the form the Compass card shows them
 * (e.g. { title: 'AutoTest RT 123456', questions: "2 Q'S" }).
 */
async function createFreshRevisionTest(user, { questions = 2, prefix = 'AutoTest RT' } = {}) {
  const title = `${prefix} ${Date.now() % 1000000}`;
  const rt = getClassMap('compassRevisionTest');
  // A class runs one test at a time: end any test of 10A left running, so the new one can be started.
  await endStartedTests(user, 'compassRevisionTest');
  await switchToPlanningOn(user, rt.grade, rt.subject, () => user.nav.applyClassMap('compassRevisionTest'));
  const saved = await user.plan.createRevisionTest(title, questions);
  expect(saved.ok(), `set-up: the fresh Revision Test "${title}" was saved (HTTP ${saved.status()})`).toBe(true);
  await user.page.waitForTimeout(2000);
  await user.compass.switchToTeachingMode();
  await expect(user.login.avatar, 'set-up: back in Teach Mode').toBeVisible({ timeout: 30000 });
  await user.page.waitForTimeout(3000);
  await user.nav.applyClassMap('compassRevisionTest');
  return { title, questions: `${questions} Q'S` };
}

/** Compass -> Revision Tests -> the card of `test` ({ title, questions }); waits for its panel to open. */
async function openRevisionTestCard(user, test) {
  const { opened } = await user.compass.openTrigger();
  expect(opened, 'set-up: the Compass menu opened').toBe(true);
  await user.compass.revisionTestsItem.click({ force: true });
  const card = user.compass.revisionTestCards.filter({ hasText: test.title }).filter({ hasText: test.questions });
  await expect(card.first(), `set-up: the Revision Test "${test.title}" is listed`).toBeVisible({ timeout: 20000 });
  await card.first().click({ force: true });
  const p = user.player;
  await expect(p.checkpointTimerBadge.or(p.checkpointResumeBtn).or(p.checkpointModeOnlineBtn).first()).toBeVisible({
    timeout: 20000,
  });
}

module.exports = { createFreshRevisionTest, openRevisionTestCard };
