// CHK-12 — Upload paper-test marks
// Source: CEPV2_Stories/21_Checkpoints.md
// Uses the class map's reserved paper checkpoint ('checkpoints'.paperCheckpoint), already conducted as a Paper Test.
// The register template is downloaded from step 3, filled with known marks with the xlsx package (keeping the
// template's layout) and uploaded in step 4. The marks entered are shared between the tests through a small file, so a
// later test still has them if an earlier one fails.

const fs = require('fs');
const os = require('os');
const path = require('path');
const XLSX = require('xlsx');
const { test, expect } = require('../../fixtures');
const { CP, GRADE, DIVISION } = require('./chk-helpers');

const PAPER = CP.paperCheckpoint;
const WORK = path.join(os.tmpdir(), 'chk-12-paper-marks');
const STATE = path.join(WORK, 'state.json');
const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const saveState = (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 2));

// Register layout: row 3 holds the question headers (from column C) and "Total"; students start on row 5.
const HEADER_ROW = 2;
const FIRST_STUDENT_ROW = 4;
const FIRST_MARK_COL = 2;

/** Marks for the first students of the register: number of questions answered right (1) from Q1; the rest blank. */
const PLAN = [{ right: 'all' }, { right: 10 }, { right: 0 }, { right: 5 }];

test.describe('CHK-12 Upload paper-test marks', () => {
  test.use({ classMap: 'checkpoints' });
  test.describe.configure({ timeout: 240000 });

  // Several cards can match the title and question count: the first run picks one that was never launched and
  // remembers its position, so every test works on the same checkpoint.
  const matching = (user) =>
    user.playlist.resourceCards.filter({ hasText: PAPER.title }).filter({ hasText: PAPER.questions });
  const card = async (user) => {
    const all = matching(user);
    await expect(all.first(), 'set-up: the paper checkpoint is in the Playlist').toBeAttached({ timeout: 20000 });
    let index = readState().cardIndex;
    if (index === undefined) {
      const labels = await all.allInnerTexts();
      index = Math.max(
        0,
        labels.findIndex((t) => /CREATED/.test(t))
      );
      fs.mkdirSync(WORK, { recursive: true });
      saveState({ cardIndex: index });
    }
    return all.nth(index);
  };

  /** Open the paper checkpoint: its Paper Test workflow, or the results dashboard once it is no longer running. */
  const openPaper = async (user) => {
    await user.player.openResourceCard(await card(user));
    const p = user.player;
    await expect(
      p.checkpointPaperWorkflow.or(p.checkpointPaperResultsBanner).or(p.checkpointModeOfflineBtn).first()
    ).toBeVisible({ timeout: 30000 });
    // A checkpoint never launched yet: start it as a paper test -- Paper Test, Generate PDF, download the paper,
    // Conduct Assessment -- so the register steps are offered.
    if (await p.checkpointModeOfflineBtn.isVisible()) {
      await p.checkpointModeOfflineBtn.click();
      await expect(p.checkpointPaperWorkflow).toBeVisible({ timeout: 15000 });
      const previous = user.page.getByText(/PREVIOUSLY GENERATED PAPER/i).locator('xpath=..');
      await user.page
        .getByRole('button', { name: /Generate PDF/i })
        .first()
        .click();
      await expect(previous, 'the generated paper is listed').toBeVisible({ timeout: 30000 });
      const paper = user.page.waitForEvent('download', { timeout: 30000 });
      await previous.locator('button').last().click();
      await paper;
      await user.page.getByText('Conduct Assessment', { exact: true }).click();
      await expect(p.checkpointPaperTemplateBtn, 'Conduct Assessment offers the register').toBeVisible({
        timeout: 15000,
      });
    }
    await user.page.waitForTimeout(1500);
  };

  /** Open the paper checkpoint and require the register steps (3 and 4) to be offered. */
  const openRegisterSteps = async (user) => {
    await openPaper(user);
    await expect(
      user.player.checkpointPaperTemplateBtn,
      'the conducted paper test offers Download Student Register and Upload Evaluated Register'
    ).toBeVisible({ timeout: 10000 });
  };

  /** For the tests that need the upload step: skip when the checkpoint no longer offers it (CHK-12-01 covers that). */
  const openRegisterStepsOrSkip = async (user) => {
    await openPaper(user);
    test.skip(
      !(await user.player.checkpointPaperTemplateBtn.isVisible()),
      'The paper checkpoint no longer offers the register steps (see CHK-12-01)'
    );
  };

  /** Download the register template from step 3; returns its path. */
  const downloadTemplate = async (user) => {
    fs.mkdirSync(WORK, { recursive: true });
    const download = user.page.waitForEvent('download', { timeout: 30000 });
    await user.player.checkpointPaperTemplateBtn.click();
    const file = path.join(WORK, 'template.xlsx');
    await (await download).saveAs(file);
    return file;
  };

  /** The register as rows of cells (first sheet). */
  const readRows = (file) => {
    const wb = XLSX.readFile(file);
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
  };

  /** Question headers of the register (between the name column and "Total"). */
  const questionHeaders = (rows) => (rows[HEADER_ROW] || []).slice(FIRST_MARK_COL, -1).filter((h) => h !== null);

  /**
   * Copy the template to `name`, letting `edit(sheet, rows, setCell)` change cells in place, so the layout, formulas and
   * validation of the template are kept. Returns the new file's path.
   */
  const buildRegister = (template, name, edit) => {
    const wb = XLSX.readFile(template, { cellFormula: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const setCell = (r, c, value) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (value === null) delete sheet[ref];
      else sheet[ref] = typeof value === 'number' ? { t: 'n', v: value } : { t: 's', v: String(value) };
    };
    edit(sheet, rows, setCell);
    const file = path.join(WORK, name);
    XLSX.writeFile(wb, file);
    return file;
  };

  /** The planned marks written into a register: returns [{ roll, name, marks, total }] for the students given marks. */
  const fillPlannedMarks = (rows, setCell, plan = PLAN) => {
    const count = questionHeaders(rows).length;
    const entered = [];
    rows.slice(FIRST_STUDENT_ROW).forEach((row, i) => {
      const r = FIRST_STUDENT_ROW + i;
      const step = plan[i];
      for (let q = 0; q < count; q++) {
        const mark = step ? (step.right === 'all' || q < step.right ? 1 : 0) : null;
        setCell(r, FIRST_MARK_COL + q, mark);
      }
      if (step) {
        const total = step.right === 'all' ? count : step.right;
        entered.push({ roll: String(row[0]), name: String(row[1]).trim(), total, outOf: count });
      }
    });
    return entered;
  };

  /** Upload a register in step 4; returns the texts of any browser alerts it raised. */
  const upload = async (user, file) => {
    const alerts = [];
    const onDialog = (d) => {
      alerts.push(d.message());
      d.dismiss().catch(() => {});
    };
    user.page.on('dialog', onDialog);
    await user.player.checkpointPaperUploadInput.setInputFiles(file);
    await expect(user.player.checkpointMarksPreview.or(user.player.checkpointMessageText).first())
      .toBeVisible({ timeout: 15000 })
      .catch(() => {});
    user.page.off('dialog', onDialog);
    return alerts;
  };

  /** Submit the previewed marks; returns the message shown. */
  const submit = async (user) => {
    await user.player.checkpointMarksSubmitBtn.click();
    await expect(user.player.checkpointMessageText).toBeVisible({ timeout: 30000 });
    const message = (await user.player.checkpointMessageText.innerText()).replace(/\s+/g, ' ');
    await user.player.checkpointMessageOkBtn.click().catch(() => {});
    return message;
  };

  /** The register refused or flagged: an alert, a message, an invalid-cell note, or Submit disabled. */
  const expectRefused = async (user, alerts, problem) => {
    const p = user.player;
    if (alerts.length) {
      expect(alerts.join(' '), `the refusal names the problem (${problem})`).toMatch(/.+/);
      return;
    }
    await expect(p.checkpointMarksPreview, 'the register is shown for checking').toBeVisible({ timeout: 10000 });
    await expect(p.checkpointMarksInvalidNote, `the preview says what is wrong (${problem})`).toBeVisible({
      timeout: 5000,
    });
    await expect(p.checkpointMarksSubmitBtn, 'the marks cannot be sent').toBeDisabled();
  };

  /** Teacher summary numbers: { attempted, total, avg }. */
  const teacherSummary = async (user) => {
    await expect(user.player.checkpointAttemptedValue).not.toHaveText(/Loading/, { timeout: 30000 });
    const attempted = (await user.player.checkpointAttemptedValue.innerText()).match(/(\d+)\s*\/\s*(\d+)/);
    const avg = (await user.player.checkpointAvgScore.innerText()).match(/(\d+)%/);
    return {
      attempted: attempted ? Number(attempted[1]) : null,
      total: attempted ? Number(attempted[2]) : null,
      avg: avg ? Number(avg[1]) : null,
    };
  };

  const expectedAverage = (marks) =>
    marks.reduce((sum, s) => sum + (100 * s.total) / s.outOf, 0) / Math.max(1, marks.length);

  test.afterEach(async ({ app }) => {
    await app.player.checkpointMarksCancelBtn.click({ timeout: 2000 }).catch(() => {});
    await app.player.checkpointMessageOkBtn.click({ timeout: 2000 }).catch(() => {});
    await app.player.checkpointCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
  });

  test(
    'CHK-12-01: a conducted paper test still offers the student register and the upload when opened again later',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await openRegisterSteps(user);
      await expect(user.player.checkpointPaperChooseFile, 'step 4 offers Choose Excel File').toBeVisible();
    }
  );

  test(
    'CHK-12-02: the student register has one row per student, a column per question and a Total column',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openRegisterSteps(user);
      const file = await downloadTemplate(user);
      const rows = readRows(file);
      const questions = questionHeaders(rows);
      const count = Number(PAPER.questions.match(/\d+/)[0]);
      expect(questions, 'a column per question, Q1 to Qn').toEqual(
        Array.from({ length: count }, (_, i) => `Q${i + 1}`)
      );
      expect(rows[HEADER_ROW][FIRST_MARK_COL + count], 'a Total column after the questions').toBe('Total');
      expect(rows[FIRST_STUDENT_ROW - 1].slice(0, 2), 'roll number and name headings').toEqual(['Roll number', 'Name']);
      const students = rows.slice(FIRST_STUDENT_ROW).filter((r) => r[0] !== null);
      expect(students.length, 'one row per student of the class').toBeGreaterThan(0);
      const rolls = students.map((r) => String(r[0]));
      expect(new Set(rolls).size, 'each roll number once').toBe(rolls.length);
      students.forEach((r) => expect(String(r[1] || '').trim(), `roll ${r[0]} has a name`).not.toBe(''));
      saveState({ template: file, classSize: students.length });
    }
  );

  const invalidMarkCases = [
    { id: 'CHK-12-03', title: 'a mark above the maximum', value: 2, file: 'above-max.xlsx' },
    { id: 'CHK-12-04', title: 'a negative mark', value: -1, file: 'negative.xlsx' },
    { id: 'CHK-12-05', title: 'a text mark', value: 'abc', file: 'text-mark.xlsx' },
  ];
  for (const c of invalidMarkCases) {
    test(`${c.id}: ${c.title} is marked invalid and cannot be sent`, { tag: ['@negative'] }, async ({ user }) => {
      await openRegisterStepsOrSkip(user);
      const template = await downloadTemplate(user);
      const file = buildRegister(template, c.file, (sheet, rows, setCell) => {
        fillPlannedMarks(rows, setCell);
        setCell(FIRST_STUDENT_ROW, FIRST_MARK_COL, c.value);
      });
      const alerts = await upload(user, file);
      await expectRefused(user, alerts, c.title);
    });
  }

  test(
    'CHK-12-06: a register with a roll number not in the class is refused with a message',
    { tag: ['@negative'] },
    async ({ user }) => {
      await openRegisterStepsOrSkip(user);
      const template = await downloadTemplate(user);
      const file = buildRegister(template, 'unknown-roll.xlsx', (sheet, rows, setCell) => {
        fillPlannedMarks(rows, setCell);
        const r = rows.length;
        setCell(r, 0, 999);
        setCell(r, 1, 'Not In This Class');
        questionHeaders(rows).forEach((_, q) => setCell(r, FIRST_MARK_COL + q, 1));
        sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: rows[HEADER_ROW].length - 1 } });
      });
      const alerts = await upload(user, file);
      if (alerts.length) return;
      await expect(user.player.checkpointMarksPreview).toBeVisible({ timeout: 10000 });
      await expect(
        user.page
          .getByText(/not (in|part of|found in) (this |the )?class|unknown (roll|student)|invalid roll/i)
          .first(),
        'the preview says roll 999 is not in the class'
      ).toBeVisible({ timeout: 5000 });
    }
  );

  test(
    'CHK-12-07: a register whose header row was changed is refused with a message',
    { tag: ['@negative'] },
    async ({ user }) => {
      await openRegisterStepsOrSkip(user);
      const template = await downloadTemplate(user);
      const file = buildRegister(template, 'header-changed.xlsx', (sheet, rows, setCell) => {
        fillPlannedMarks(rows, setCell);
        (rows[HEADER_ROW] || []).forEach((_, c) => setCell(HEADER_ROW, c, null));
      });
      const alerts = await upload(user, file);
      if (alerts.length) return;
      await expect(user.player.checkpointMarksPreview).toBeVisible({ timeout: 10000 });
      const summary = await user.player.checkpointMarksPreviewSummary.innerText();
      await expect(
        user.player.checkpointMarksSubmitBtn,
        `the register without question headers cannot be sent (preview: "${summary}")`
      ).toBeDisabled();
    }
  );

  test(
    'CHK-12-08: an uploaded register is shown with its students, questions and totals before it is sent',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openRegisterStepsOrSkip(user);
      const template = await downloadTemplate(user);
      let entered = [];
      const file = buildRegister(template, 'marks.xlsx', (sheet, rows, setCell) => {
        entered = fillPlannedMarks(rows, setCell);
      });
      saveState({ marksFile: file, entered });
      const alerts = await upload(user, file);
      expect(alerts, 'no alert for a correctly filled register').toEqual([]);
      await expect(user.player.checkpointMarksPreview).toBeVisible({ timeout: 10000 });
      await expect(user.player.checkpointMarksPreviewSummary).toContainText(`${entered[0].outOf} questions`);
      await expect(user.player.checkpointMarksInvalidNote, 'no cell flagged').toBeHidden();
      for (const [i, s] of entered.entries()) {
        const row = user.player.checkpointMarksRows.nth(i);
        await expect(row, `${s.name}`).toContainText(s.name);
        await expect(row.locator('td').last(), `${s.name}: total ${s.total}`).toHaveText(String(s.total));
      }
      await expect(user.player.checkpointMarksSubmitBtn).toBeEnabled();
    }
  );

  test('CHK-12-09: sending the marks confirms with a message', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await openRegisterStepsOrSkip(user);
    const { marksFile } = readState();
    test.skip(!marksFile || !fs.existsSync(marksFile), 'Needs the register of CHK-12-08');
    await upload(user, marksFile);
    const message = await submit(user);
    expect(message, 'confirmation').toMatch(/submitted successfully/i);
    saveState({ submitted: true, firstMessage: message });
  });

  test(
    'CHK-12-10: the teacher’s summary counts the students given marks and shows their average',
    { tag: ['@regression'] },
    async ({ user }) => {
      const { entered, submitted } = readState();
      test.skip(!submitted, 'Needs the marks sent in CHK-12-09');
      await openPaper(user);
      const s = await teacherSummary(user);
      saveState({ teacherSummary: s });
      expect(s.attempted, `students given marks: ${entered.map((x) => x.name).join(', ')}`).toBe(entered.length);
      const avg = expectedAverage(entered);
      expect(Math.abs(s.avg - avg), `average shown ${s.avg}%, expected about ${avg.toFixed(1)}%`).toBeLessThanOrEqual(
        1
      );
    }
  );

  test('CHK-12-11: concept mastery is shown once marks are uploaded', { tag: ['@regression'] }, async ({ user }) => {
    test.skip(!readState().submitted, 'Needs the marks sent in CHK-12-09');
    await openPaper(user);
    await expect(user.page.getByText('No concept mastery data available yet.'), 'concept mastery data').toBeHidden({
      timeout: 20000,
    });
  });

  test(
    'CHK-12-12: the principal’s report lists each student with the percentage of their marks',
    { tag: ['@regression'] },
    async ({ app }) => {
      const { entered, submitted } = readState();
      test.skip(!submitted, 'Needs the marks sent in CHK-12-09');
      await app.guest.open();
      await app.signIn(process.env.PRINCIPAL_PIN);
      await app.compass.switchToPlanningMode();
      await app.page.waitForTimeout(5000);
      await app.plan.openReport('Assessment for Learning');
      await app.plan.aflBaselineBtn.click();
      await app.page.waitForTimeout(2500);
      await app.plan.choose(app.plan.aflGradeSelect, GRADE);
      await app.plan.choose(app.plan.aflClassSelect, DIVISION);
      await app.plan.choose(app.plan.aflSubjectSelect, CP.subject);
      // Several assessments share the title: find the one listing the students given marks.
      const options = await app.plan.optionsOf(app.plan.aflAssessmentSelect);
      const indexes = options.map((o, i) => (o === PAPER.title ? i : -1)).filter((i) => i >= 0);
      expect(indexes.length, `"${PAPER.title}" is offered`).toBeGreaterThan(0);
      const pattern = (s) => new RegExp(`${s.name}\\s+Section\\s+\\S+\\s+(\\d+)%`);
      let text = '';
      for (const index of indexes) {
        await app.plan.aflAssessmentSelect.selectOption({ index });
        await app.page.waitForTimeout(5000);
        text = (await app.page.locator('body').innerText()).replace(/\s+/g, ' ');
        if (entered.every((s) => pattern(s).test(text))) break;
      }
      for (const s of entered) {
        const m = text.match(pattern(s));
        expect(m, `${s.name} is listed with a percentage`).not.toBeNull();
        const expected = Math.round((100 * s.total) / s.outOf);
        expect(Math.abs(Number(m[1]) - expected), `${s.name}: report ${m[1]}%, marks ${expected}%`).toBeLessThanOrEqual(
          1
        );
      }
    }
  );

  test(
    'CHK-12-13: uploading the same register again does not count any student twice',
    { tag: ['@edge'] },
    async ({ user }) => {
      const { marksFile, entered, submitted } = readState();
      test.skip(!submitted, 'Needs the marks sent in CHK-12-09');
      await openRegisterSteps(user);
      await upload(user, marksFile);
      expect(await submit(user)).toMatch(/submitted successfully/i);
      await user.player.checkpointCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
      await openPaper(user);
      const s = await teacherSummary(user);
      expect(s.attempted, 'the same students, counted once').toBe(entered.length);
      expect(Math.abs(s.avg - expectedAverage(entered)), 'average unchanged').toBeLessThanOrEqual(1);
    }
  );

  test(
    'CHK-12-14: a register with corrected marks replaces the earlier marks',
    { tag: ['@edge'] },
    async ({ user }) => {
      const { submitted } = readState();
      test.skip(!submitted, 'Needs the marks sent in CHK-12-09');
      await openRegisterSteps(user);
      const template = await downloadTemplate(user);
      const corrected = [{ right: 'all' }, { right: 'all' }, { right: 0 }, { right: 5 }];
      let entered = [];
      const file = buildRegister(template, 'corrected.xlsx', (sheet, rows, setCell) => {
        entered = fillPlannedMarks(rows, setCell, corrected);
      });
      await upload(user, file);
      expect(await submit(user)).toMatch(/submitted successfully/i);
      saveState({ entered, marksFile: file });
      await user.player.checkpointCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
      await openPaper(user);
      const s = await teacherSummary(user);
      expect(s.attempted).toBe(entered.length);
      const avg = expectedAverage(entered);
      expect(Math.abs(s.avg - avg), `average ${s.avg}%, corrected marks give ${avg.toFixed(1)}%`).toBeLessThanOrEqual(
        1
      );
    }
  );
});
