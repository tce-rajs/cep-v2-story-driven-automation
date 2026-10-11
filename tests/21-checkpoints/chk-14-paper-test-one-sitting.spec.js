// CHK-14 — A paper test from start to finish in one sitting
// Source: CEPV2_Stories/21_Checkpoints.md
// The paper-test register steps disappear once the panel is closed (see CHK-12-01), so this runs the whole paper test
// without closing it: on a never-launched Revision Test of 10A Science 3.4 (PAPER_TITLE / PAPER_QUESTIONS if set,
// otherwise a fresh one each test makes, see fresh-revision-test.js) choose Paper Test, generate and download the
// question paper, Conduct Assessment, download the register, fill it with known marks, upload and submit.
// Then the teacher's summary and the principal's Revision report are compared with the marks entered.
// Marks: rolls 1-10 every question right, 11-20 half right, 21-30 none right.

const fs = require('fs');
const os = require('os');
const path = require('path');
const XLSX = require('xlsx');
const { test, expect } = require('../../fixtures');
const { BROWSER_ONLY } = require('./chk-helpers');
const { createFreshRevisionTest } = require('./fresh-revision-test');

// A named never-launched Revision Test, or null: each test then makes a fresh one.
const NAMED_PAPER = process.env.PAPER_TITLE
  ? { title: process.env.PAPER_TITLE, questions: process.env.PAPER_QUESTIONS || "2 Q'S" }
  : null;
const WORK = path.join(os.tmpdir(), 'chk-14-paper');
const STATE = path.join(WORK, 'state.json');
const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const writeState = (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 2));
const SHOTS = path.join(__dirname, '..', '..', 'report', 'paper-test');
const flat = (t) => t.replace(/\s+/g, ' ').trim();

// Register layout (from the template): question headers on row 3 from column C, students from row 5.
const HEADER_ROW = 2;
const FIRST_STUDENT_ROW = 4;
const FIRST_MARK_COL = 2;
const marksFor = (roll, questions) =>
  Array.from({ length: questions }, (_, q) => (roll <= 10 ? 1 : roll <= 20 ? (q % 2 === 0 ? 1 : 0) : 0));

test.describe('CHK-14 A paper test from start to finish in one sitting', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.use({ classMap: 'compassRevisionTest' });

  const openPaperCard = async (user, paper) => {
    const { opened } = await user.compass.openTrigger();
    expect(opened, 'set-up: the Compass menu opened').toBe(true);
    await user.compass.revisionTestsItem.click({ force: true });
    const card = user.compass.revisionTestCards.filter({ hasText: paper.title }).filter({ hasText: paper.questions });
    await expect(card.first(), `set-up: Revision Test "${paper.title}"`).toBeVisible({ timeout: 20000 });
    await card.first().click({ force: true });
  };

  /**
   * On a never-launched Revision Test: Paper Test, generate and download the question paper, Conduct Assessment and
   * download the register template into `dir`. Returns the template's path.
   */
  const conductAndDownloadRegister = async (user, paper, dir) => {
    const page = user.page;
    const p = user.player;
    await openPaperCard(user, paper);
    await expect(p.checkpointModeOfflineBtn, 'set-up: a never-launched test offers Paper Test').toBeVisible({
      timeout: 20000,
    });
    await p.checkpointModeOfflineBtn.click();
    await expect(p.checkpointPaperWorkflow).toBeVisible({ timeout: 15000 });

    // Step 1: question paper.
    const previous = page.getByText(/PREVIOUSLY GENERATED PAPER/i).locator('xpath=..');
    await page
      .getByRole('button', { name: /Generate PDF/i })
      .first()
      .click();
    await expect(previous, 'the generated paper is listed').toBeVisible({ timeout: 30000 });
    const paperDl = page.waitForEvent('download', { timeout: 30000 });
    await previous.locator('button').last().click();
    expect((await paperDl).suggestedFilename(), 'the question paper is a PDF').toMatch(/\.pdf$/i);

    // Step 2-3: conduct, then the register template.
    await page.getByText('Conduct Assessment', { exact: true }).click();
    await expect(p.checkpointPaperTemplateBtn, 'the register is offered').toBeVisible({ timeout: 15000 });
    const templateDl = page.waitForEvent('download', { timeout: 30000 });
    await p.checkpointPaperTemplateBtn.click();
    const template = path.join(dir, 'template.xlsx');
    await (await templateDl).saveAs(template);
    return template;
  };

  test(
    'CHK-14-01: a paper test can be conducted and its marks uploaded in one sitting, and the summary matches the marks',
    { tag: ['@regression'] },
    async ({ user }) => {
      test.setTimeout(15 * 60 * 1000);
      const page = user.page;
      const p = user.player;
      fs.rmSync(WORK, { recursive: true, force: true });
      fs.mkdirSync(WORK, { recursive: true });
      fs.mkdirSync(SHOTS, { recursive: true });

      // Steps 1-3: question paper, Conduct Assessment, the register template.
      const paper = NAMED_PAPER || (await createFreshRevisionTest(user, { prefix: 'AutoTest paper' }));
      writeState({ paper, title: paper.title });
      const template = await conductAndDownloadRegister(user, paper, WORK);
      await page.screenshot({ path: path.join(SHOTS, '1-register-offered.png') });

      // Fill the register with the planned marks, keeping the template's layout.
      const wb = XLSX.readFile(template, { cellFormula: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      const questions = (rows[HEADER_ROW] || []).slice(FIRST_MARK_COL).filter((h) => h && /^Q/i.test(String(h))).length;
      const students = [];
      rows.slice(FIRST_STUDENT_ROW).forEach((row, i) => {
        const roll = Number(row[0]);
        if (!roll) return;
        const marks = marksFor(roll, questions);
        marks.forEach((m, q) => {
          sheet[XLSX.utils.encode_cell({ r: FIRST_STUDENT_ROW + i, c: FIRST_MARK_COL + q })] = { t: 'n', v: m };
        });
        students.push({ roll, name: String(row[1] || '').trim(), marks: marks.reduce((a, b) => a + b, 0), questions });
      });
      const filled = path.join(WORK, 'register-filled.xlsx');
      XLSX.writeFile(wb, filled);
      writeState({ students, questions });
      expect(students.length, 'the register lists the class').toBeGreaterThan(0);

      // Step 4: upload, preview, submit.
      await page
        .getByText('Upload Evaluated Register', { exact: true })
        .click()
        .catch(() => {});
      await p.checkpointPaperUploadInput.setInputFiles(filled);
      await expect(p.checkpointMarksPreview, 'the marks preview opens').toBeVisible({ timeout: 20000 });
      await expect(p.checkpointMarksPreviewSummary).toContainText(`${students.length} students`);
      await expect(p.checkpointMarksInvalidNote, 'no invalid cells').toHaveCount(0);
      await page.screenshot({ path: path.join(SHOTS, '2-marks-preview.png') });
      const upload = page.waitForResponse((r) => /upload-answers/.test(r.url()), { timeout: 60000 });
      await p.checkpointMarksSubmitBtn.click();
      const uploaded = await upload;
      writeState({ uploadStatus: uploaded.status() });
      expect(uploaded.ok(), 'the marks are accepted by the server').toBe(true);
      await page.waitForTimeout(3000);
      const message = flat(await page.locator('body').innerText());
      writeState({ afterSubmit: (message.match(/[^.!]*(submitted|paused|success)[^.!]*[.!]/i) || [''])[0] });
      await page.screenshot({ path: path.join(SHOTS, '3-after-submit.png') });
      await p.checkpointMessageOkBtn.click({ timeout: 5000 }).catch(() => {});

      // Teacher summary.
      await page.reload();
      await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
      await user.nav.applyClassMap('compassRevisionTest');
      await openPaperCard(user, paper);
      await expect(page.getByText(/\d+\s*\/\s*\d+\s*Students/).first()).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(4000);
      const summary = flat(await page.locator('body').innerText());
      await page.screenshot({ path: path.join(SHOTS, '4-teacher-summary.png') });
      const attempted = summary.match(/(\d+)\s*\/\s*(\d+)\s*Students/);
      const avg = summary.match(/AVG\.?\s*SCORE:\s*(\d+)%/i);
      const expectedAvg = students.reduce((a, s) => a + (100 * s.marks) / s.questions, 0) / students.length;
      writeState({
        teacher: { attempted: attempted && attempted[1], of: attempted && attempted[2], avg: avg && Number(avg[1]) },
        expectedAvg,
      });
      expect(Number(attempted && attempted[1]), 'every student in the register is counted').toBe(students.length);
      expect(
        Math.abs(Number(avg && avg[1]) - expectedAvg),
        `average ${avg && avg[1]}%, expected ${expectedAvg.toFixed(1)}%`
      ).toBeLessThanOrEqual(1);
    }
  );

  test(
    'CHK-14-02: the principal’s Revision report shows each student with the percentage from the uploaded marks',
    { tag: ['@regression'] },
    async ({ app }) => {
      test.setTimeout(20 * 60 * 1000);
      const { students, title } = readState();
      test.skip(!students || !students.length, 'Needs the marks uploaded in CHK-14-01');
      await app.guest.open();
      await app.signIn(process.env.PRINCIPAL_PIN);
      await app.compass.switchToPlanningMode();
      await app.page.waitForTimeout(5000);
      let text = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt) await app.page.waitForTimeout(120000);
        await app.page.reload().catch(() => {});
        await app.page.waitForTimeout(5000);
        await app.plan.openReport('Assessment for Learning').catch(() => {});
        await app.plan.aflRevisionBtn.click().catch(() => {});
        await app.page.waitForTimeout(2500);
        await app.plan.aflGradeSelect.selectOption({ label: 'Class 10' }).catch(() => {});
        await app.page.waitForTimeout(2500);
        await app.plan.aflClassSelect.selectOption({ label: 'Division A' }).catch(() => {});
        await app.page.waitForTimeout(2500);
        await app.plan.aflSubjectSelect.selectOption({ label: 'Science' }).catch(() => {});
        await app.page.waitForTimeout(3000);
        await app.plan.aflAssessmentSelect.selectOption({ label: title }).catch(() => {});
        await app.page.waitForTimeout(5000);
        for (const band of ['Developing', 'Proficient', 'Advanced']) {
          await app.page
            .getByText(new RegExp(`^\\s*${band}\\s*$`))
            .first()
            .click({ force: true, timeout: 3000 })
            .catch(() => {});
          await app.page.waitForTimeout(600);
        }
        text = flat(await app.page.locator('body').innerText());
        if (students.filter((s) => new RegExp(`${s.name}[^%]{0,60}?\\d+%`).test(text)).length === students.length)
          break;
      }
      await app.page.screenshot({ path: path.join(SHOTS, '5-principal-report.png'), fullPage: true });
      const principal = students.map((s) => {
        const m = text.match(new RegExp(`${s.name}[^%]{0,60}?(\\d+)%`));
        return {
          roll: s.roll,
          name: s.name,
          expected: Math.round((100 * s.marks) / s.questions),
          shown: m ? Number(m[1]) : null,
        };
      });
      const overall = text.match(/OVERALL MASTERY\s+\S+\s+(\d+)\s*%/);
      writeState({ principal, principalOverall: overall && Number(overall[1]) });
      expect(
        principal.filter((x) => x.shown === null).map((x) => x.roll),
        'every student is in the report'
      ).toEqual([]);
      expect(
        principal
          .filter((x) => Math.abs(x.shown - x.expected) > 1)
          .map((x) => `${x.roll}: ${x.shown}% vs ${x.expected}%`)
      ).toEqual([]);
    }
  );

  // Its own fresh Revision Test (the register steps of CHK-14-01's test are gone once its panel closed): the register
  // is filled correctly except for one mark of 2; the marks must not reach the server.
  test(
    'CHK-14-03: a register with a mark other than 0 or 1 cannot be submitted',
    { tag: ['@negative'] },
    async ({ user }) => {
      test.setTimeout(10 * 60 * 1000);
      const page = user.page;
      const p = user.player;
      const dir = path.join(WORK, 'invalid');
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const paper = await createFreshRevisionTest(user, { prefix: 'AutoTest paper' });
      const template = await conductAndDownloadRegister(user, paper, dir);

      const wb = XLSX.readFile(template, { cellFormula: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      const questions = (rows[HEADER_ROW] || []).slice(FIRST_MARK_COL).filter((h) => h && /^Q/i.test(String(h))).length;
      rows.slice(FIRST_STUDENT_ROW).forEach((row, i) => {
        if (!Number(row[0])) return;
        for (let q = 0; q < questions; q++)
          sheet[XLSX.utils.encode_cell({ r: FIRST_STUDENT_ROW + i, c: FIRST_MARK_COL + q })] = { t: 'n', v: 1 };
      });
      sheet[XLSX.utils.encode_cell({ r: FIRST_STUDENT_ROW, c: FIRST_MARK_COL })] = { t: 'n', v: 2 };
      const file = path.join(dir, 'register-mark-2.xlsx');
      XLSX.writeFile(wb, file);

      const uploads = [];
      page.on('request', (r) => /upload-answers/.test(r.url()) && uploads.push(r.url()));
      page.on('dialog', (d) => d.dismiss().catch(() => {}));
      await page
        .getByText('Upload Evaluated Register', { exact: true })
        .click()
        .catch(() => {});
      await p.checkpointPaperUploadInput.setInputFiles(file);
      await expect(p.checkpointMarksPreview.or(p.checkpointMessageText).first())
        .toBeVisible({ timeout: 20000 })
        .catch(() => {});
      // Try to send the marks anyway, if the preview lets the button be pressed.
      if (await p.checkpointMarksSubmitBtn.isEnabled().catch(() => false))
        await p.checkpointMarksSubmitBtn.click().catch(() => {});
      await page.waitForTimeout(5000);
      expect(uploads, 'the register with a mark of 2 is not sent').toEqual([]);
    }
  );
});
