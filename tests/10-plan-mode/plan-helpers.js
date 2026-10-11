// Shared set-up for the Plan Mode specs (10-plan-mode). Plan Mode runs in the browser with the Plan Mode account
// (PLAN_PIN), so the desktop-client runs are never touched; in a client run these specs skip with that reason.

const { expect } = require('../../fixtures');

const BROWSER_ONLY = 'Plan Mode is checked in the browser: run with RUN_IN_BROWSER=1';
const QUIZ_CLASS = { grade: 'Class 12', division: 'A', subject: 'Physics', chapter: 0, topic: 0 };

/** Sign in with the Plan Mode account on its quiz class and switch to Planning. */
async function openPlanMode(app) {
  await app.guest.open();
  await app.signIn(process.env.PLAN_PIN);
  await app.nav.resetToClass(QUIZ_CLASS.grade, QUIZ_CLASS.division, QUIZ_CLASS.subject);
  await app.nav.goToChapterTopic(QUIZ_CLASS.chapter, QUIZ_CLASS.topic);
  const { switched } = await app.compass.switchToPlanningMode();
  expect(switched, 'set-up: Plan Mode opened').toBe(true);
  await app.page.waitForTimeout(5000);
}

/** Question Bank -> Create Quiz, tick the first `n` questions (2 by default). */
async function startQuiz(app, n = 2) {
  await app.plan.openSection('Question Bank');
  await expect(app.plan.questionTypeLabels.first(), 'set-up: the bank lists questions').toBeVisible({ timeout: 15000 });
  await app.plan.createQuizBtn.click();
  await expect(app.plan.selectionCheckboxes.first(), 'set-up: questions can be ticked').toBeVisible({ timeout: 10000 });
  for (let i = 0; i < n; i++) await app.plan.selectionCheckboxes.nth(i * 2).click({ force: true });
}

/** Create a quiz titled `title` from two ticked questions; returns the server's answer to the create request. */
async function createQuiz(app, title) {
  await startQuiz(app);
  await app.plan.pressQuizBar();
  await expect(app.plan.quizTitleInput, 'set-up: the quiz form is open').toBeVisible({ timeout: 10000 });
  await app.plan.quizTitleInput.fill(title);
  const created = app.page.waitForResponse((r) => r.request().method() === 'POST' && /custom\/quiz/i.test(r.url()), {
    timeout: 20000,
  });
  await app.plan.addQuizBtn.click();
  return created;
}

/** In Teach Mode, the Playlist card of the quiz class's topic with this title. */
async function quizCardInTeach(app, title) {
  if (app.page.url().includes('/plan/')) await app.compass.switchToTeachingMode();
  await app.page.waitForTimeout(4000);
  await app.nav.resetToClass(QUIZ_CLASS.grade, QUIZ_CLASS.division, QUIZ_CLASS.subject);
  await app.nav.goToChapterTopic(QUIZ_CLASS.chapter, QUIZ_CLASS.topic);
  await app.playlist.ensureDrawerVisible();
  await app.page.waitForTimeout(2000);
  return app.playlist.resourceCards.filter({ hasText: title });
}

/** Remove a quiz made by a test from the Teach Mode Playlist (best effort; used in clean-up). */
async function removeQuiz(app, title) {
  const card = await quizCardInTeach(app, title);
  if (!(await card.count())) return;
  await app.playlist.enterEditMode().catch(() => {});
  await app.playlist.removeCard(card.first()).catch(() => {});
  await app.playlist.finishEditingBtn
    .last()
    .click({ timeout: 5000 })
    .catch(() => {});
}

const autoTitle = () => `AutoTest quiz ${Date.now() % 1000000}`;
/** A unique name for something a test creates ("AutoTest <what> <number>"). */
const autoName = (what) => `AutoTest ${what} ${Date.now() % 1000000}`;

// The main account's topic with single-choice questions (10A Science 3.4): Revision Tests are made here. Revision
// Tests cannot be deleted in the app, so every one a test makes stays in that topic's Compass list.
const RT_CLASS = { grade: 'Class 10', division: 'A', subject: 'Science', chapter: 2, topic: 3 };

/**
 * From Teach Mode, switch to Planning on the given class (the teacher is already on it). Plan Mode opens on the class
 * the app last saved as current for the account; right after a class switch that can still be the previous class, and
 * another session of the same account (e.g. a desktop-client run) can change it too, so the switch is made again (up
 * to three more times) while Plan Mode shows another class.
 */
async function switchToPlanningOn(app, grade, subject, goToClass) {
  for (let attempt = 1; ; attempt++) {
    await app.page.waitForTimeout(4000);
    const { switched } = await app.compass.switchToPlanningMode();
    expect(switched, 'set-up: Plan Mode opened').toBe(true);
    await app.page.waitForTimeout(5000);
    const shown = await app.plan.classSubjectHeading.innerText().catch(() => '');
    if (new RegExp(`${grade}\\s*\\|\\s*${subject}`).test(shown)) return;
    if (attempt === 4) throw new Error(`set-up: Plan Mode opened on "${shown}", not on ${grade} ${subject}`);
    await app.compass.switchToTeachingMode();
    await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
    await goToClass();
    await app.page.waitForTimeout(4000);
  }
}

/** Sign in with the main account on the Revision Test topic and switch to Planning. */
async function openPlanModeOnRevisionTopic(app) {
  await app.guest.open();
  await app.signIn(process.env.VALID_PIN);
  const goToClass = async () => {
    await app.nav.resetToClass(RT_CLASS.grade, RT_CLASS.division, RT_CLASS.subject);
    await app.nav.goToChapterTopic(RT_CLASS.chapter, RT_CLASS.topic);
  };
  await goToClass();
  await switchToPlanningOn(app, RT_CLASS.grade, RT_CLASS.subject, goToClass);
}

/** In Teach Mode, the chapter names of the current class (from the chapter popup, which is closed again). */
async function teachChapterNames(app) {
  if (app.page.url().includes('/plan/')) await app.compass.switchToTeachingMode();
  await app.page.waitForTimeout(3000);
  await app.nav.resetToClass(QUIZ_CLASS.grade, QUIZ_CLASS.division, QUIZ_CLASS.subject);
  await app.nav._openUntil(app.nav.currentChapterTopicBtn, app.nav.chapterItems.first());
  await app.page.waitForTimeout(1000);
  const names = (await app.nav.chapterItems.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  await app.nav._closeChaptersPopupIfOpen();
  return names;
}

module.exports = {
  BROWSER_ONLY,
  QUIZ_CLASS,
  RT_CLASS,
  openPlanMode,
  openPlanModeOnRevisionTopic,
  switchToPlanningOn,
  teachChapterNames,
  autoName,
  startQuiz,
  createQuiz,
  quizCardInTeach,
  removeQuiz,
  autoTitle,
};
