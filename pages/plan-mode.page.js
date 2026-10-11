// Page Object for Plan Mode (User menu -> Classroom Mode -> Planning), a separate app at /plan/#/canvas.
// It has no data-qa-ids: elements are found by their visible text, form labels and stable class names.
//   Sidebar: Content Library, Question Bank, Code Editor, Check Point (a Nebular sidebar; the labels are hidden spans
//   while it is compacted, so the links are matched on their text content).
//   Question Bank: chapter and topic selects, question cards, and Create Question / Create Quiz (span.newQuizBtn) /
//   Create Revision Test (span.newStudentBtn). Create Quiz puts a checkbox on every card and a bottom bar
//   "Create Quiz (n)"; the bar opens the quiz form (Quiz Title*, Grade & Subject*, Chapter & Topic*, Cancel, Add Quiz).
//   Create Question: a Quill form (question, answer options with a correct-answer marker, Submit Question); each card
//   has a ⋮ menu (Edit Question, Delete Question). Create Revision Test ticks single-choice questions only.
//   Check Point: "Assessment for Learning (AfL)", six filter selects (academic year, class, section, subject, status,
//   type), a search box and Create Test (a Baseline Test: title and concepts, Assign Test).
//   Content Library: the book (chapters, topics, resources) with custom chapters, topics and resources.
//   Code Editor: a Monaco editor with Run, Force Stop and Save (the code is saved as a resource of the topic).

class PlanModePage {
  constructor(page) {
    this.page = page;

    // --- Sidebar and sections ---
    this.sidebarLinks = page.locator('nb-sidebar a, nb-menu a');
    this.sidebarLink = (name) => this.sidebarLinks.filter({ hasText: name }).first();
    this.sectionHeading = (name) =>
      page.locator('h1, h2, h3').filter({ hasText: name }).filter({ visible: true }).first();
    this.classSubjectHeading = page
      .getByText(/Class \d+\s*\|\s*\S+/)
      .filter({ visible: true })
      .first();

    // --- Question Bank ---
    this.chapterSelect = page.locator('select').filter({ visible: true }).nth(0);
    this.topicSelect = page.locator('select').filter({ visible: true }).nth(1);
    this.questionTypeLabels = page.getByText(/^\s*CUSTOM/).filter({ visible: true });
    this.createQuestionBtn = page
      .locator('span')
      .filter({ hasText: /^\s*Create Question\s*$/ })
      .filter({ visible: true })
      .first();
    this.createQuizBtn = page.locator('span.newQuizBtn').first();
    this.createRevisionTestBtn = page.locator('span.newStudentBtn').first();
    this.selectionCheckboxes = page.locator('input[type=checkbox]').filter({ visible: true });
    this.noScqMessage = page.getByText(/requires SCQ questions only/i);

    // --- Quiz form ---
    // The form fields have stable ids.
    this.quizTitleInput = page.locator('input#quizTitle');
    this.quizGradeInput = page.locator('input#gradeSubject');
    this.quizChapterInput = page.locator('input#chapterTopic');
    this.addQuizBtn = page.getByRole('button', { name: 'Add Quiz' });
    this.quizCancelBtn = page.locator(
      'xpath=//button[normalize-space()="Add Quiz"]/preceding::button[normalize-space()="Cancel"][1]'
    );
    // The "Selected Questions" panel beside the form: the questions are the panel heading's following elements.
    this.selectedQuestionTypes = page.locator(
      'xpath=//*[normalize-space()="Selected Questions"]/following::*[starts-with(normalize-space(), "CUSTOM")][following::*[normalize-space()="Quiz Title*"]]'
    );

    // --- Question cards (each a .question-card: type label "CUSTOM" + ":SCQ", text in .questionData, ⋮ menu) ---
    this.questionCards = page.locator('.question-card').filter({ visible: true });
    this.questionCardTypes = page.locator('.question-card .templateType').filter({ visible: true });
    this.questionCardByText = (text) => page.locator('.question-card').filter({ hasText: text });

    // --- Create Question form (a Quill editor: the first editor is the question, each later one an answer option) ---
    this.questionEditors = page.locator('.ql-editor').filter({ visible: true });
    this.questionTypeBtn = page.locator('#questionTypeId');
    this.addOptionBtn = page.getByText('Add Option', { exact: true });
    // "Done" turns the first typed option into an option row; Add Option adds the next ones.
    this.optionDoneBtn = page.getByText('Done', { exact: true }).filter({ visible: true }).last();
    // The round marker in front of each option marks it as the correct answer.
    this.correctOptionMarks = page.locator('label.normal-checkbox').filter({ visible: true });
    this.submitQuestionBtn = page.getByRole('button', { name: /submit question/i });
    this.questionFormCancelBtn = page.getByText('Cancel', { exact: true }).filter({ visible: true }).last();

    // --- Create Revision Test (the quiz form's title field, then Save Revision Test) ---
    this.saveRevisionTestBtn = page.getByRole('button', { name: /Save Revision Test/i });

    // --- Check Point ---
    this.checkPointHeading = page.getByText('Assessment for Learning (AfL)', { exact: true });
    this.checkPointSelects = page.locator('select').filter({ visible: true });
    this.checkPointSearch = page.getByPlaceholder('Search assessments...');
    this.createTestBtn = page.getByRole('button', { name: /create test/i }).first();
    this.noBaselineMessage = page.getByText(/No Baseline Chapter found/i);
    // Create Test (Baseline): Test Title, a concept list ("1. Mitochondria" …) and Assign Test.
    this.baselineTitleInput = page.getByText('Test Title', { exact: true }).locator('xpath=following::input[1]');
    this.baselineConcepts = page.getByText(/^\s*\d+\.\s+\S/).filter({ visible: true });
    this.assignTestBtn = page.getByRole('button', { name: 'Assign Test' });

    // --- Content Library ---
    this.saveBtn = page.getByRole('button', { name: 'Save', exact: true });
    this.syncBookBtn = page.getByRole('button', { name: /Update Book \(Sync\)/i });
    // Book Navigation: one subject row (folded at first) holding the chapters; each chapter row has a +/− to show its
    // topics, a ⋮ menu (Edit, Delete, Hide) and "Click to Add chapter" below it; a custom chapter has ADD TOPIC.
    // A topic row has a chevron that shows its resources (ADD RESOURCE, CREATE QUIZ). Adding a chapter, topic or
    // resource is saved at once; Save keeps the order of things.
    this.bookRoot = page.locator('li.subjectList').first();
    this.bookRow = (name) => page.locator('li.cdk-drag').filter({ hasText: name }).last();
    this.addChapterLinks = page.locator('.chapterButton');
    this.newNameInput = page.getByPlaceholder('name').filter({ visible: true });
    this.addChapterBtn = page.getByRole('button', { name: 'Add chapter' });
    this.addTopicBtn = page.getByRole('button', { name: /^\s*Add topic\s*$/i });
    this.addResourceBtn = page
      .getByText(/^\s*add resource\s*$/i)
      .filter({ visible: true })
      .first();
    this.menuItem = (name) => page.getByText(name, { exact: true }).filter({ visible: true }).first();
    // Add Resource form.
    this.resourceFileInput = page.locator('input[type=file]').first();
    this.resourceNameInput = page
      .getByText('Resource Name', { exact: true })
      .last()
      .locator('xpath=following::input[1]');
    this.resourceTypeSelect = page
      .getByText('Resource Type', { exact: true })
      .last()
      .locator('xpath=following::select[1]');
    this.resourcePrivacySelect = page
      .getByText('Resource Privacy', { exact: true })
      .last()
      .locator('xpath=following::select[1]');
    this.resourceDescription = page.getByPlaceholder(/Describe yourself/).last();
    this.resourceTagsInput = page
      .getByText('Resource Tags', { exact: true })
      .last()
      .locator('xpath=following::input[1]');
    this.resourceRows = page.locator('li.resourceTitle').filter({ visible: true });
    this.resourceRow = (name) => page.locator('li.resourceTitle').filter({ hasText: name });

    // --- Code Editor (Monaco editor, an output pane, and a bar: AI Assist, Run/Rerun, Force Stop, Save, settings) ---
    this.codeEditor = page.locator('.monaco-editor').first();
    this.codeOutput = page.locator('.output').first();
    this.runCodeBtn = page
      .getByText(/^\s*(Run|Rerun)\s*$/)
      .filter({ visible: true })
      .first();
    this.forceStopBtn = page.getByText('Force Stop', { exact: true }).filter({ visible: true }).first();
    this.saveCodeBtn = page.getByText('Save', { exact: true }).filter({ visible: true }).last();
    // A program that reads input asks for it in a small dialog.
    this.codeInputField = page.getByPlaceholder('Enter a value');
    this.codeInputSubmitBtn = page.getByRole('button', { name: 'Submit', exact: true });

    // --- Reports & Analytics (principal only) ---
    this.reportsLink = page.locator(
      'nb-sidebar a[title="Reports & Analytics"], nb-menu a[title="Reports & Analytics"]'
    );
    this.reportTabs = page.locator('.reportmenutab');
    this.reportTab = (name) => this.reportTabs.filter({ hasText: name }).first();
    this.aflHeading = page.getByText('Assessment for Learning', { exact: true }).filter({ visible: true }).last();
    this.aflGradeSelect = page.locator('select').filter({ visible: true }).nth(0);
    this.aflClassSelect = page.locator('select').filter({ visible: true }).nth(1);
    this.aflSubjectSelect = page.locator('select').filter({ visible: true }).nth(2);
    this.aflAssessmentSelect = page.locator('select').filter({ visible: true }).nth(3);
    this.aflBaselineBtn = page.getByText('Baseline', { exact: true }).filter({ visible: true }).first();
    this.aflRevisionBtn = page.getByText('Revision', { exact: true }).filter({ visible: true }).first();
    this.aflStudentSearch = page.getByPlaceholder(/Search students/);
    this.aflNoReports = page.getByText('No reports available or found');
    this.aflBandChip = (name) => page.locator('button.band-chip-btn').filter({ hasText: name }).first();
    this.aflPrintBtn = page.locator('button.table-print-btn').filter({ visible: true }).first();
    this.aflHeaderLine = page
      .getByText(/· Academic Year/)
      .filter({ visible: true })
      .first();

    // Principal Dashboard: its controls are plain elements (no buttons), found by their text.
    this.dashDateInput = page.locator('.pd_header_calendar input, input.input').first();
    this.dashCalendar = page.locator('.calendar-container').filter({ visible: true }).first();
    this.dashPrevMonth = this.dashCalendar.locator('.prev-month');
    this.dashNextMonth = this.dashCalendar.locator('.next-month');
    this.dashDownloadBtn = page.getByText('Download Report').filter({ visible: true }).first();
    this.dashRefreshBtn = page.getByText('Refresh', { exact: true }).filter({ visible: true }).first();
    this.dashToggle = (name) => page.getByText(name, { exact: true }).filter({ visible: true }).first();
    this.exportUsageBtn = page.getByText('Export Usage Report').filter({ visible: true }).first();
    this.exportDialogTitle = page.getByText('Export Report', { exact: true }).filter({ visible: true });
    this.exportDateInputs = page.locator('input[type=date]').filter({ visible: true });
    this.exportGoAheadBtn = page.getByText('Go ahead', { exact: true }).filter({ visible: true });
    this.exportCancelBtn = page.getByText('Cancel, as classes are underway').filter({ visible: true });
    this.exportCloseBtn = page.getByText('Close', { exact: true }).filter({ visible: true });
    this.exportAnotherBtn = page.getByText('Export Another Report', { exact: true }).filter({ visible: true });

    // School Usage and Content Statistics.
    this.usageDownloadBtn = page.getByText('Download', { exact: true }).filter({ visible: true }).first();
    this.usageMonthSelect = page
      .locator('select')
      .filter({ hasText: /[A-Z][a-z]{2}-\d{4}/ })
      .first();
    this.usageSubTab = (name) => page.getByText(name, { exact: true }).filter({ visible: true }).first();
    this.statsRows = page.locator('table tbody tr').filter({ visible: true });
  }

  /** Principal Dashboard: if the Export Report dialog is open (in any state), close it. */
  async closeExportDialog() {
    for (const btn of [this.exportCloseBtn, this.exportCancelBtn])
      if (await btn.isVisible().catch(() => false)) await btn.click({ timeout: 5000 }).catch(() => {});
  }

  /** Principal Dashboard: open Export Usage Report on its date form (a finished export is shown first). */
  async openExportForm() {
    await this.exportUsageBtn.click();
    await this.exportDialogTitle.first().waitFor({ timeout: 10000 });
    // An export still being generated is shown first; wait for its result (or the date form).
    await this.exportDateInputs.first().or(this.exportAnotherBtn).first().waitFor({ timeout: 180000 });
    await this.page.waitForTimeout(1000);
    if (await this.exportAnotherBtn.isVisible().catch(() => false)) {
      await this.exportAnotherBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /** Principal: Reports & Analytics -> the named tab (e.g. "Assessment for Learning"). */
  async openReport(tab) {
    await this.reportsLink.first().click({ force: true });
    await this.reportTab(tab).waitFor({ timeout: 20000 });
    // The dashboard keeps loading for a few seconds and puts itself back over a tab chosen too early, so the tab is
    // chosen again until its own content shows.
    const marker = {
      'Principal Dashboard': 'Realtime usage data',
      'School Usage': 'School Usage Data',
      'Content Statistics': 'TP Count (Expected)',
    }[tab];
    const content =
      tab === 'Assessment for Learning'
        ? this.aflBaselineBtn
        : marker
          ? this.page.getByText(marker).filter({ visible: true }).first()
          : this.reportTab(tab);
    for (let i = 0; i < 6; i++) {
      await this.reportTab(tab).click({ force: true });
      if (
        await content
          .waitFor({ state: 'visible', timeout: 5000 })
          .then(() => true)
          .catch(() => false)
      )
        break;
    }
    await this.page.waitForTimeout(2000);
  }

  /** The option labels of a native select. */
  async optionsOf(select) {
    return select.evaluate((x) => [...x.options].map((o) => o.text.trim()));
  }

  /** Open a sidebar section and wait for it to settle. */
  async openSection(name) {
    await this.sidebarLink(name).click({ force: true });
    await this.page.waitForTimeout(3000);
  }

  /** The number shown on the "Create Quiz (n)" bar. */
  async quizCount() {
    const text = await this.page
      .getByText(/^\s*\(\s*\d+\s*\)\s*$/)
      .filter({ visible: true })
      .last()
      .innerText();
    return Number(text.replace(/\D/g, ''));
  }

  /** Press the "Create Quiz (n)" bar at the bottom of the bank (the lowest "Create Quiz" text on screen). */
  async pressQuizBar() {
    await this.pressBottomBar('Create Quiz');
  }

  /** Press the lowest on-screen text `label` (the bottom bar of Create Quiz / Create Revision Test). */
  async pressBottomBar(label) {
    const labels = this.page.getByText(label, { exact: true }).filter({ visible: true });
    const boxes = [];
    for (let i = 0; i < (await labels.count()); i++) boxes.push(await labels.nth(i).boundingBox());
    const bar = boxes.filter(Boolean).sort((a, b) => b.y - a.y)[0];
    await this.page.mouse.click(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await this.page.waitForTimeout(2500);
  }

  // --- Question Bank: Create Question ---

  /** Create Question: open the form. */
  async openCreateQuestion() {
    await this.createQuestionBtn.click();
    await this.submitQuestionBtn.waitFor({ timeout: 10000 });
  }

  /**
   * Fill the open question form: the question text, the answer options (each its own option row) and, when given, the
   * index of the correct option.
   */
  async fillQuestion({ text = '', options = [], correct = null }) {
    if (text) {
      await this.questionEditors.nth(0).click();
      await this.page.keyboard.type(text);
    }
    for (const [i, option] of options.entries()) {
      if (i > 0) {
        await this.addOptionBtn.click();
        await this.page.waitForTimeout(600);
      }
      await this.questionEditors.last().click();
      await this.page.keyboard.type(option);
      if (i === 0) await this.optionDoneBtn.click();
    }
    if (correct !== null) await this.correctOptionMarks.nth(correct).click();
  }

  /** Press Submit Question; resolves with the save request's response, or null when nothing was sent. */
  async submitQuestion() {
    const saved = this.page
      .waitForResponse((r) => r.request().method() === 'POST' && /serve\/custom\/qb/.test(r.url()), { timeout: 10000 })
      .catch(() => null);
    await this.submitQuestionBtn.click();
    return saved;
  }

  /** Delete a question from the bank by its text (card ⋮ -> Delete Question); resolves with the DELETE response. */
  async deleteQuestion(text) {
    const card = this.questionCardByText(text).first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    const deleted = this.page.waitForResponse(
      (r) => r.request().method() === 'DELETE' && /serve\/custom\/qb/.test(r.url()),
      { timeout: 15000 }
    );
    await card.locator('img.customMoreIcon').click({ force: true });
    await this.menuItem('Delete Question').click();
    return deleted;
  }

  // --- Revision Test ---

  /**
   * Question Bank -> Create Revision Test: tick the first `count` single-choice questions of the current topic, title
   * the test and save it. Resolves with the save request's response (POST compass/test).
   */
  async createRevisionTest(title, count = 2) {
    await this.openSection('Question Bank');
    await this.createRevisionTestBtn.click();
    await this.selectionCheckboxes.first().waitFor({ timeout: 15000 });
    // Each card carries two checkboxes; the first of each pair ticks the question.
    for (let i = 0; i < count; i++) await this.selectionCheckboxes.nth(i * 2).click({ force: true });
    await this.pressBottomBar('Create Revision Test');
    await this.quizTitleInput.fill(title);
    const saved = this.page.waitForResponse((r) => r.request().method() === 'POST' && /compass\/test$/.test(r.url()), {
      timeout: 30000,
    });
    await this.saveRevisionTestBtn.click();
    return saved;
  }

  // --- Check Point ---

  /** Set the Check Point class and subject filters (by their labels). */
  async filterCheckPoint(grade, subject) {
    await this.choose(this.checkPointSelects.nth(1), grade);
    await this.choose(this.checkPointSelects.nth(3), subject);
  }

  /**
   * Create Test (Baseline) for the filtered class and subject: title it, tick the first `concepts` concepts and press
   * Assign Test. Resolves with the first POST the page sends after Assign Test.
   */
  async createBaselineTest(title, concepts = 1) {
    await this.createTestBtn.click();
    await this.assignTestBtn.waitFor({ timeout: 15000 });
    await this.baselineTitleInput.fill(title);
    for (let i = 0; i < concepts; i++) await this.baselineConcepts.nth(i).click();
    const saved = this.page.waitForResponse((r) => r.request().method() === 'POST' && /compass\/test/.test(r.url()), {
      timeout: 30000,
    });
    await this.assignTestBtn.click();
    return saved;
  }

  // --- Content Library ---

  /** Open the Content Library and unfold the book to its chapters. */
  async openBook() {
    await this.openSection('Content Library');
    await this.bookRoot.waitFor({ timeout: 15000 });
    if (!(await this.addChapterLinks.count())) await this.bookRoot.click({ force: true });
    await this.addChapterLinks.first().waitFor({ state: 'attached', timeout: 15000 });
  }

  /** The chapter titles of the book, top to bottom (each follows its "CHAPTER n" label). */
  async bookChapters() {
    const lines = (await this.bookRoot.innerText()).split(/\n/).map((l) => l.trim());
    return lines.filter((l, i) => i > 0 && /^CHAPTER \d+$/i.test(lines[i - 1]));
  }

  /** Unfold a chapter row (its + icon) to show its topics. */
  async expandChapter(name) {
    const plus = this.bookRow(name).locator('nb-icon[icon="plus-outline"]').first();
    if (await plus.count()) await plus.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  /** Unfold a topic row (its chevron) to show its resources. */
  async expandTopic(name) {
    const chevron = this.bookRow(name).locator('nb-icon[icon="chevron-down-outline"]').first();
    if (await chevron.count()) await chevron.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  /** Add a custom chapter at the end of the book; resolves with the create request's response. */
  async addChapter(name) {
    const last = this.addChapterLinks.last();
    await last.scrollIntoViewIfNeeded();
    await last.click({ force: true });
    await this.newNameInput.fill(name);
    const saved = this.page.waitForResponse(
      (r) => r.request().method() === 'POST' && /serve\/custom\/chp/.test(r.url()),
      { timeout: 20000 }
    );
    await this.addChapterBtn.click();
    const r = await saved;
    await this.page.waitForTimeout(1500);
    return r;
  }

  /** Add a topic to a custom chapter (its ADD TOPIC); resolves with the create request's response. */
  async addTopic(chapter, name) {
    await this.bookRow(chapter)
      .getByText(/ADD TOPIC/i)
      .first()
      .click({ force: true });
    await this.newNameInput.fill(name);
    const saved = this.page.waitForResponse(
      (r) => r.request().method() === 'POST' && /serve\/custom\/tp/.test(r.url()),
      { timeout: 20000 }
    );
    await this.addTopicBtn.click();
    const r = await saved;
    await this.page.waitForTimeout(1500);
    return r;
  }

  /**
   * Add a resource to an unfolded topic: ADD RESOURCE, the file (a Playwright file payload), its name, type
   * (e.g. 'Images', 'Worksheets') and a tag. Resolves with the create request's response.
   */
  async addResource(file, name, type) {
    await this.addResourceBtn.click({ force: true });
    await this.resourceFileInput.setInputFiles(file);
    await this.resourceNameInput.fill(name);
    await this.resourceTypeSelect.selectOption(type);
    await this.resourcePrivacySelect.selectOption({ index: 1 });
    await this.resourceDescription.fill('AutoTest resource');
    const saved = this.page.waitForResponse(
      (r) => r.request().method() === 'POST' && /serve\/custom\/asset/.test(r.url()),
      { timeout: 30000 }
    );
    // Enter in the tags field adds the tag and creates the resource.
    await this.resourceTagsInput.fill('autotest');
    await this.page.keyboard.press('Enter');
    const r = await saved;
    await this.page.waitForTimeout(2500);
    return r;
  }

  /** Delete a chapter or topic row (⋮ -> Delete); resolves with the DELETE response. */
  async deleteBookRow(name) {
    const row = this.bookRow(name);
    await row.scrollIntoViewIfNeeded();
    const deleted = this.page.waitForResponse(
      (r) => r.request().method() === 'DELETE' && /serve\/custom\/(chp|tp)/.test(r.url()),
      { timeout: 20000 }
    );
    await row.locator('img.moreOption').first().click({ force: true });
    await this.menuItem('Delete').click();
    const r = await deleted;
    await this.page.waitForTimeout(1500);
    return r;
  }

  /** Delete a resource of an unfolded topic (its ⋮ -> Delete); resolves with the DELETE response. */
  async deleteResource(name) {
    const row = this.resourceRow(name).first();
    await row.scrollIntoViewIfNeeded();
    await row.hover();
    const deleted = this.page.waitForResponse(
      (r) => r.request().method() === 'DELETE' && /serve\/custom\/asset/.test(r.url()),
      { timeout: 20000 }
    );
    await row.locator('img.three-dot-filter-menu').click({ force: true });
    await this.menuItem('Delete').click();
    const r = await deleted;
    await this.page.waitForTimeout(1500);
    return r;
  }

  /** Drag one resource row onto another (the rows are a drag-and-drop list). */
  async dragResource(from, to) {
    const a = await this.resourceRow(from).first().boundingBox();
    const b = await this.resourceRow(to).first().boundingBox();
    await this.page.mouse.move(a.x + 20, a.y + a.height / 2);
    await this.page.mouse.down();
    for (let i = 1; i <= 10; i++)
      await this.page.mouse.move(a.x + 20, a.y + a.height / 2 + ((b.y - a.y - 5) * i) / 10, { steps: 2 });
    await this.page.waitForTimeout(300);
    await this.page.mouse.up();
    await this.page.waitForTimeout(1000);
  }

  /** The resource names of the unfolded topics, top to bottom. */
  async resourceNames() {
    return (await this.resourceRows.allInnerTexts()).map((t) => t.trim());
  }

  // --- Code Editor ---

  /** Replace the editor's text with `code` (pasted as is, without the editor's auto-indent or bracket closing). */
  async setCode(code) {
    await this.codeEditor.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Delete');
    await this.page.keyboard.insertText(code);
  }

  /** Run the program and return the output pane's text once it has stopped changing (up to `timeout` ms). */
  async runCode(timeout = 30000) {
    const before = await this.codeOutput.innerText().catch(() => '');
    await this.runCodeBtn.scrollIntoViewIfNeeded();
    await this.runCodeBtn.click({ force: true });
    const end = Date.now() + timeout;
    let last = before;
    let stableSince = Date.now();
    while (Date.now() < end) {
      await this.page.waitForTimeout(1000);
      if (await this.codeInputField.isVisible().catch(() => false)) break;
      const now = await this.codeOutput.innerText().catch(() => '');
      if (now !== last) {
        last = now;
        stableSince = Date.now();
      } else if (now !== before && now.trim() !== 'output' && Date.now() - stableSince > 2500) break;
    }
    return (await this.codeOutput.innerText().catch(() => '')).trim();
  }

  /** Press the Code Editor's Save; resolves with the save request's response, or null when nothing was sent. */
  async saveCode() {
    const saved = this.page
      .waitForResponse((r) => r.request().method() === 'POST' && /serve\/custom\/asset/.test(r.url()), {
        timeout: 15000,
      })
      .catch(() => null);
    await this.saveCodeBtn.scrollIntoViewIfNeeded();
    await this.saveCodeBtn.click({ force: true });
    return saved;
  }

  /** Choose an option of a <select> by its visible label and wait for the screen to update. */
  async choose(select, label) {
    await select.selectOption({ label });
    await this.page.waitForTimeout(2500);
  }
}

module.exports = { PlanModePage };
