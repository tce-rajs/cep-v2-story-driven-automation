// The student test site (/student-test/), where students take a checkpoint the teacher has started.
// It is a separate app with no data-qa-ids; it runs in its own browser window, never in the desktop client.
//
// Sign-in: grade and class are radio-button tiles (label.grade-option); the roll number is checked with the tick
// button, which signs the student in and shows the name; Start then opens the mission. Each question's answers are
// Material checkboxes (.option-content), and the last question has End Mission (then Cancel / Confirm) in place of
// Next Question.

const STUDENT_TEST_URL = new URL('/student-test/', process.env.BASE_URL || 'http://172.18.2.85/teach/').href;

class StudentTestPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // --- Sign-in ---
    this.gradeLabel = page.getByText('Select Grade', { exact: true });
    this.gradeTiles = page.locator('form .grade-grid').first().locator('label.grade-option');
    this.classTiles = page.locator('form .grade-grid').nth(1).locator('label.grade-option');
    this.selectGradeFirstHint = page.getByText('Please select a grade first');
    this.rollNumberInput = page.locator('#rollno');
    this.checkRollBtn = page.locator('button.check');
    this.studentName = page.locator('.student span');
    this.startBtn = page.locator('button.start-btn');
    this.messageDialog = page.locator('mat-dialog-container, .cdk-overlay-pane').filter({ hasText: 'Message' });
    this.messageOkBtn = page.getByRole('button', { name: 'OK' });
    this.clockTime = page.locator('h1.mat-body-2');
    this.clockDate = page.locator('p.mat-body-2');

    // --- Mission ---
    this.subjectMission = page.getByText('Your Missions');
    this.readyToBegin = page.getByText('Ready to begin?');
    this.startMissionBtn = page.getByText('Start Mission', { exact: true });
    this.timeRemaining = page.getByText('Time Remaining');
    this.questionText = page.locator('.qb-qstem-text');
    this.answerOptions = page.locator('.option-content');
    this.answerLabels = page.locator('.option-content label.mdc-label');
    this.nextQuestionBtn = page.getByRole('button', { name: 'Next Question' });
    this.endMissionBtn = page.getByRole('button', { name: 'End Mission' });
    this.confirmBtn = page.getByRole('button', { name: 'Confirm' });
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' });
    this.pageButtons = page.locator('app-nav-pagination li button');
    this.logOutBtn = page.getByRole('button', { name: 'Log Out' });

    // --- Result ---
    this.resultScore = page.getByText(/Score:\s*\d+\/\d+/);
    this.returnHomeBtn = page.getByRole('button', { name: 'Return Home' });
  }

  async open() {
    await this.page.goto(STUDENT_TEST_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await this.gradeLabel.waitFor({ timeout: 30000 });
  }

  /** Choose the grade and class tiles whose text matches (e.g. "Class 10", "Division A"). */
  async chooseClass(grade, division) {
    await this.gradeTiles.filter({ hasText: grade }).first().click();
    await this.classTiles.first().waitFor({ timeout: 15000 });
    await this.classTiles.filter({ hasText: division }).first().click();
  }

  /**
   * Type a roll number and press the tick. Returns the server's answer: { ok, status, body }.
   * A successful check signs the student in (the same roll number then answers "Already logged In.").
   */
  async checkRoll(roll) {
    await this.rollNumberInput.fill(String(roll));
    const response = this.page.waitForResponse((r) => /sso\/token/.test(r.url()), { timeout: 20000 });
    await this.checkRollBtn.click();
    const r = await response;
    return { ok: r.ok(), status: r.status(), body: await r.json().catch(() => ({})) };
  }

  /**
   * Sign in the first roll number from `from` up that has not signed in to this test yet; returns that roll number
   * and the student's name. Each roll number can sign in only once per test, so every test that takes the test
   * uses a new student.
   */
  async signInNextStudent(grade, division, from = 1, to = 40) {
    const answers = [];
    for (let roll = from; roll <= to; roll++) {
      const r = await this.checkRoll(roll);
      if (r.ok) {
        await this.studentName.filter({ hasText: /\S/ }).waitFor({ timeout: 10000 });
        return { roll, name: (await this.studentName.innerText()).trim() };
      }
      answers.push(JSON.stringify(r.body));
      await this.messageOkBtn.click().catch(() => {});
    }
    // Every student who exists has already signed in to the running checkpoint (each may sign in once per test):
    // the test needs a fresh checkpoint, which is missing data, not a product failure.
    const used = answers.filter((a) => /already logged/i.test(a)).length;
    if (used > 0 && answers.every((a) => /already logged|not found|invalid|no student/i.test(a)))
      throw new Error(
        `DATA MISSING ON THIS SERVER: all ${used} students of ${grade} ${division} have already signed in to the running checkpoint; start a fresh checkpoint for this run.`
      );
    throw new Error(
      `No student in ${grade} ${division} between roll ${from} and ${to} could sign in: ${answers.slice(0, 3).join(' | ')}`
    );
  }

  /** Start, then Start Mission; waits for the first question. */
  async startMission() {
    await this.startBtn.click();
    await this.startMissionBtn.click({ timeout: 20000 });
    await this.questionText.first().waitFor({ timeout: 20000 });
  }

  /** Tick answer `index` (0 = A) on the current question; resolves with the ATTEMPT request the site sends. */
  async answer(index = 0) {
    const saved = this.page.waitForResponse(
      (r) => /client\/attempts/.test(r.url()) && /"ATTEMPT"/.test(r.request().postData() || ''),
      { timeout: 15000 }
    );
    await this.answerLabels.nth(index).click({ force: true });
    return saved;
  }

  /** End Mission -> Confirm; resolves with the END request the site sends. */
  async endMission() {
    await this.endMissionBtn.click();
    const ended = this.page.waitForResponse(
      (r) => /client\/attempts/.test(r.url()) && /"END"/.test(r.request().postData() || ''),
      { timeout: 20000 }
    );
    await this.confirmBtn.click();
    return ended;
  }

  /** Answer every question with option `index` and end the mission; returns the number of questions answered. */
  async answerAllAndEnd(index = 0) {
    let answered = 0;
    for (let i = 0; i < 60; i++) {
      await this.answer(index);
      answered++;
      if (!(await this.nextQuestionBtn.isVisible())) break;
      await this.nextQuestionBtn.click();
      await this.page.waitForTimeout(1000);
    }
    await this.endMission();
    return answered;
  }
}

module.exports = { StudentTestPage, STUDENT_TEST_URL };
