// Page Object for AI Homework (Magnet -> Homework).
//
// CONFIRMED LIVE (probe, 2026-09-26, v 0.0.232):
// - Builder: ai-homework-option-select-chapter-btn, ai-homework-option-homework-select (Objective counter
//   -minus / -input (default 15) / -plus), ai-homework-option-revise-select (Objective 10, Subjective 5 counters),
//   ai-homework-option-generate-btn (disabled until a chapter is set), ai-homework-option-discard-btn,
//   ai-homework-option-next-btn (disabled until questions exist).
// - Chapter picker: ai-homework-topics-grade-select / -subject-select (ng-select), ai-homework-topics-chapter-{i},
//   ai-homework-topics-update-btn, ai-homework-topics-close-btn.
// From the reference suite (confirmed live there): generated questions are ai-homework-builder-{scq|mcq|subjective}-
// question-{i} with -swipe-left-{i} / -swipe-right-{i}, ai-homework-option-regenerate-btn; the assign step is
// ai-homework-assign-title-input, -class-option-{i} / -class-checkbox-{i}, -due-option-{i} / -due-radio-{i},
// -previous-btn, -discard-btn, -send-btn. Generation is a real AI call taking 20-30 s.

const { AiNoticesPage } = require('./ai-notices.page');

class AiHomeworkPage {
  constructor(page) {
    this.page = page;
    const id = (name) => page.locator(`[data-qa-id="ai-homework-${name}"]`);

    this.selectChapterBtn = id('option-select-chapter-btn');
    this.homeworkCard = id('option-homework-select');
    this.reviseCard = id('option-revise-select');
    this.hwObjMinus = id('option-homework-objective-minus');
    this.hwObjInput = id('option-homework-objective-input');
    this.hwObjPlus = id('option-homework-objective-plus');
    this.revObjInput = id('option-revise-objective-input');
    this.revSubjInput = id('option-revise-subjective-input');
    this.generateBtn = id('option-generate-btn');
    this.regenerateBtn = id('option-regenerate-btn');
    this.discardBtn = id('option-discard-btn');
    this.nextBtn = id('option-next-btn');

    this.topicsGradeSelect = id('topics-grade-select');
    this.topicsSubjectSelect = id('topics-subject-select');
    this.topicsChapters = page.locator('[data-qa-id^="ai-homework-topics-chapter-"]:not([data-qa-id*="checkbox"])');
    this.topicsChapter = (i) => id(`topics-chapter-${i}`);
    this.topicsUpdateBtn = id('topics-update-btn');
    this.topicsCloseBtn = id('topics-close-btn');

    this.questions = page.locator(
      '[data-qa-id^="ai-homework-builder-scq-question-"], [data-qa-id^="ai-homework-builder-mcq-question-"], [data-qa-id^="ai-homework-builder-subjective-question-"]'
    );
    this.visibleQuestion = this.questions.filter({ visible: true }).first();
    this.swipeLeftBtns = page.locator('[data-qa-id*="ai-homework-builder-"][data-qa-id*="-swipe-left-"]');
    this.swipeRightBtns = page.locator('[data-qa-id*="ai-homework-builder-"][data-qa-id*="-swipe-right-"]');
    this.deleteQuestionBtns = page.locator(
      '[data-qa-id^="ai-homework-builder-"][data-qa-id*="delete"], [data-qa-id^="ai-homework-builder-"][data-qa-id*="remove"]'
    );
    this.generatingText = page.getByText(/please wait while our ai generates/i);
    this.wrongSubjectBanner = page.getByText(/grade or class you selected seems incorrect/i);

    this.assignTitleInput = id('assign-title-input');
    this.assignClassOptions = page.locator('[data-qa-id^="ai-homework-assign-class-option-"]');
    this.assignClassCheckboxes = page.locator('[data-qa-id^="ai-homework-assign-class-checkbox-"]');
    this.assignClassOption = (i) => id(`assign-class-option-${i}`);
    this.assignClassCheckbox = (i) => id(`assign-class-checkbox-${i}`);
    this.assignDueOptions = page.locator('[data-qa-id^="ai-homework-assign-due-option-"]');
    this.assignDueRadio = (i) => id(`assign-due-radio-${i}`);
    this.assignDueOption = (i) => id(`assign-due-option-${i}`);
    this.assignPreviousBtn = id('assign-previous-btn');
    this.assignDiscardBtn = id('assign-discard-btn');
    this.assignSendBtn = id('assign-send-btn');

    this.snackbar = page.locator(
      'mat-snack-bar-container, .mat-mdc-snack-bar-container, .toast-container, [role="alert"]'
    );
  }

  /** Open the builder (Magnet -> Homework). */
  async open(magnet) {
    await magnet.choose('homework');
    await this.selectChapterBtn.waitFor({ state: 'visible', timeout: 15000 });
  }

  async count(input) {
    return Number(await input.inputValue());
  }

  /** Set the Homework card's objective count to `target` with the -/+ buttons. */
  async setHomeworkCount(target) {
    for (let i = 0; i < 40; i++) {
      const now = await this.count(this.hwObjInput);
      if (now === target) return;
      await (now > target ? this.hwObjMinus : this.hwObjPlus).click();
    }
  }

  /** Click Generate and wait for the real AI call (20-30 s) to put questions in the builder. */
  async generate(timeout = 90000) {
    await this.generateBtn.click();
    await this.questions.first().waitFor({ state: 'attached', timeout });
    await this.page.waitForFunction(
      () => {
        const next = document.querySelector('[data-qa-id="ai-homework-option-next-btn"]');
        return next && !next.disabled;
      },
      null,
      { timeout: 30000 }
    );
  }

  /** CONFIRMED LIVE (2026-09-26): questions first appear with raw LaTeX ("$i^{35}$") and are typeset about 2 s later.
   * Wait for that before reading question text. */
  async waitForMathRendered(timeout = 15000) {
    await this.page
      .waitForFunction(
        () =>
          [...document.querySelectorAll('[data-qa-id^="ai-homework-builder-"][data-qa-id*="-question-"]')].every(
            (q) => !/\$[^$]+\$/.test(q.textContent)
          ),
        null,
        { timeout }
      )
      .catch(() => {});
  }

  /** The chapter shown in the builder's header ("Class 11 | Mathematics | Chapter 5. Complex Numbers" -> "Complex Numbers"). */
  async headerChapter() {
    const text = await this.page
      .getByText(/Class\s*\d+\s*\|\s*[^|]+\|/)
      .first()
      .innerText();
    return (text.split('|').pop() || '').replace(/Chapter\s*\d+\.?/i, '').trim();
  }

  /** Builder -> Next -> assignment form. */
  async goToAssign() {
    await this.nextBtn.click();
    await this.assignTitleInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  async isOpen() {
    return (
      (await this.selectChapterBtn.isVisible().catch(() => false)) ||
      (await this.assignTitleInput.isVisible().catch(() => false))
    );
  }

  /** Leave the builder from whichever step it is on. */
  async closeAll() {
    if (await this.assignDiscardBtn.isVisible().catch(() => false))
      await this.assignDiscardBtn.click({ force: true }).catch(() => {});
    if (await this.discardBtn.isVisible().catch(() => false))
      await this.discardBtn.click({ force: true }).catch(() => {});
    await this.page
      .locator('mat-dialog-container button, [role="dialog"] button')
      .filter({ hasText: /discard|yes|confirm/i })
      .first()
      .click({ timeout: 1500 })
      .catch(() => {});
  }

  async checkedClassCount() {
    return this.assignClassCheckboxes.evaluateAll((els) => els.filter((e) => e.checked).length);
  }

  /** Typing in the title opens the on-screen keyboard over Previous / Ready to Send (seen on video 2026-09-26); close
   * it first -- same control as in the notice composer. */
  async hideKeyboard() {
    await AiNoticesPage.prototype.hideKeyboard.call(this);
  }
}

module.exports = { AiHomeworkPage };
