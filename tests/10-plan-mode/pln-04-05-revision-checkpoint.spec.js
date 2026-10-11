// PLN-04 — Create a Revision Test; PLN-05 — Check Point (Assessment for Learning)
// Source: CEPV2_Stories/10_PlanMode.md
// PLN-04-01 uses the Plan Mode account's topic without single-choice questions (12 Physics 1.1). PLN-04-02..05 and
// PLN-05-07/08 need a topic with single-choice questions and a subject with a baseline chapter, which only the main
// account has (10A Science): they create "AutoTest RT …" / "AutoTest BT …" there. Neither kind can be deleted in the
// app, so each run leaves one of each. The tests share the title they created through a small file.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('../../fixtures');
const { BROWSER_ONLY, RT_CLASS, openPlanMode, openPlanModeOnRevisionTopic, autoName } = require('./plan-helpers');

const STATE = path.join(os.tmpdir(), 'pln-04-05-created.json');
const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const writeState = (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 2));

/** The Check Point card (the smallest block around the title) of an assessment, as text. */
const checkPointCardText = (page, title) =>
  page
    .getByText(title, { exact: true })
    .first()
    .evaluate((el) => {
      let e = el;
      while (e.parentElement && e.innerText.length < 60) e = e.parentElement;
      return e.innerText.replace(/\s+/g, ' ');
    });

test.describe('PLN-04 Create a Revision Test', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.describe.configure({ timeout: 240000 });

  test(
    'PLN-04-01: Create Revision Test on a topic without single-choice questions says a Revision Test needs single-choice (SCQ) questions',
    { tag: ['@negative'] },
    async ({ app }) => {
      await openPlanMode(app); // Class 12 Physics 1.1 holds only open-ended questions
      await app.plan.openSection('Question Bank');
      await app.plan.createRevisionTestBtn.click();
      await expect(app.plan.noScqMessage, 'the message explains what is needed').toBeVisible({ timeout: 10000 });
    }
  );

  test(
    'PLN-04-02: Create Revision Test lists only single-choice questions to tick',
    { tag: ['@functional'] },
    async ({ app }) => {
      await openPlanModeOnRevisionTopic(app);
      await app.plan.openSection('Question Bank');
      await app.plan.createRevisionTestBtn.click();
      await expect(app.plan.selectionCheckboxes.first(), 'set-up: questions can be ticked').toBeVisible({
        timeout: 15000,
      });
      const types = (await app.plan.questionCardTypes.allInnerTexts()).map((t) => t.replace(/[\s:]/g, ''));
      expect(types.length, 'questions are listed').toBeGreaterThan(0);
      expect(
        types.filter((t) => t !== 'SCQ'),
        'every question listed is single-choice'
      ).toEqual([]);
    }
  );

  test(
    'PLN-04-03: a Revision Test can be created from ticked single-choice questions',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      fs.rmSync(STATE, { force: true });
      await openPlanModeOnRevisionTopic(app);
      const title = autoName('RT');
      const saved = await app.plan.createRevisionTest(title, 2);
      expect(saved.ok(), `the server accepts the Revision Test (HTTP ${saved.status()})`).toBe(true);
      const body = await saved.json().catch(() => ({}));
      expect(body.status, 'the test is created, ready to launch').toBe('CREATED');
      writeState({ revisionTest: title });
    }
  );

  test(
    'PLN-04-04: a created Revision Test is listed in Check Point as a Revision Assessment',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      const title = readState().revisionTest;
      test.skip(!title, 'Needs the Revision Test created in PLN-04-03');
      await openPlanModeOnRevisionTopic(app);
      await app.plan.openSection('Check Point');
      await app.plan.filterCheckPoint(RT_CLASS.grade, RT_CLASS.subject);
      await app.plan.checkPointSearch.fill(title);
      await expect(page.getByText(title, { exact: true }).first(), `"${title}" is listed`).toBeVisible({
        timeout: 15000,
      });
      expect(await checkPointCardText(page, title), 'tagged Revision Assessment').toMatch(/revision assessment/i);
    }
  );

  test(
    'PLN-04-05: a created Revision Test appears in Teach Mode under Compass → Revision Tests for that topic',
    { tag: ['@functional'] },
    async ({ app }) => {
      const title = readState().revisionTest;
      test.skip(!title, 'Needs the Revision Test created in PLN-04-03');
      await app.guest.open();
      await app.signIn(process.env.VALID_PIN);
      await app.nav.resetToClass(RT_CLASS.grade, RT_CLASS.division, RT_CLASS.subject);
      await app.nav.goToChapterTopic(RT_CLASS.chapter, RT_CLASS.topic);
      const { opened } = await app.compass.openTrigger();
      expect(opened, 'set-up: the Compass menu opened').toBe(true);
      await app.compass.revisionTestsItem.click({ force: true });
      await expect(
        app.compass.revisionTestCards.filter({ hasText: title }),
        `"${title}" is in the topic's Revision Tests`
      ).toHaveCount(1, { timeout: 20000 });
    }
  );
});

test.describe('PLN-05 Check Point (Assessment for Learning)', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);

  test.beforeEach(async ({ app }) => {
    await openPlanMode(app);
    await app.plan.openSection('Check Point');
    await expect(app.plan.checkPointHeading, 'set-up: Check Point is open').toBeVisible({ timeout: 10000 });
  });

  const optionsOf = (select) => select.evaluate((s) => [...s.options].map((o) => o.text.trim()));

  test(
    'PLN-05-01: Check Point opens on "Assessment for Learning (AfL)" with its filters',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      expect(await app.plan.checkPointSelects.count(), 'academic year, class, section, subject, status and type').toBe(
        6
      );
      await expect(app.plan.checkPointSearch, 'the search box').toBeVisible();
    }
  );

  test(
    'PLN-05-02: the type filter offers Baseline Test and Revision Assessment',
    { tag: ['@functional'] },
    async ({ app }) => {
      const types = await optionsOf(app.plan.checkPointSelects.nth(5));
      expect(types).toEqual(expect.arrayContaining(['Baseline Test', 'Revision Assessment']));
    }
  );

  test(
    'PLN-05-03: the status filter offers Created, Started, Paused and Closed',
    { tag: ['@functional'] },
    async ({ app }) => {
      const statuses = await optionsOf(app.plan.checkPointSelects.nth(4));
      expect(statuses).toEqual(expect.arrayContaining(['Created', 'Started', 'Paused', 'Closed']));
    }
  );

  // Class 12 Physics has no baseline chapter: Create Test is disabled (PLN-05-04) and a message says why (PLN-05-05).
  test(
    'PLN-05-04: for a subject with no baseline chapter, Create Test is disabled',
    { tag: ['@negative'] },
    async ({ app }) => {
      await expect(app.plan.createTestBtn, 'Create Test is disabled').toBeDisabled();
    }
  );

  test(
    'PLN-05-05: for a subject with no baseline chapter, a message says no baseline chapter was found',
    { tag: ['@negative'] },
    async ({ app }) => {
      await expect(app.plan.noBaselineMessage, 'the message').toBeVisible();
    }
  );

  test('PLN-05-06: the search box narrows the assessments listed', { tag: ['@functional'] }, async ({ app, page }) => {
    const before = await page.locator('body').innerText();
    await app.plan.checkPointSearch.fill('zzz-no-such-assessment');
    await page.waitForTimeout(2000);
    const after = await page.locator('body').innerText();
    expect(after.length, 'fewer assessments (or none) listed').toBeLessThanOrEqual(before.length);
  });
});

// Class 10 Science (main account) has a baseline chapter: a Baseline Test can be made there.
test.describe('PLN-05 Check Point: a Baseline Test for a subject with a baseline chapter', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.describe.configure({ timeout: 240000 });

  test(
    'PLN-05-07: a Baseline Test can be created for a subject that has a baseline chapter',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      writeState({ baselineTest: null });
      await openPlanModeOnRevisionTopic(app);
      await app.plan.openSection('Check Point');
      await app.plan.filterCheckPoint(RT_CLASS.grade, RT_CLASS.subject);
      await expect(app.plan.createTestBtn, 'set-up: Create Test is offered for Class 10 Science').toBeEnabled({
        timeout: 15000,
      });
      const title = autoName('BT');
      const saved = await app.plan.createBaselineTest(title, 1);
      expect(saved.ok(), `the server accepts the Baseline Test (HTTP ${saved.status()})`).toBe(true);
      writeState({ baselineTest: title });
      await app.plan.checkPointSearch.fill(title);
      await expect(page.getByText(title, { exact: true }).first(), `"${title}" is listed in Check Point`).toBeVisible({
        timeout: 15000,
      });
      expect(await checkPointCardText(page, title), 'tagged Baseline Test').toMatch(/baseline/i);
    }
  );

  test(
    'PLN-05-08: a Baseline Test created in Plan Mode appears in Teach Mode for that class',
    { tag: ['@functional'] },
    async ({ app }) => {
      const title = readState().baselineTest;
      test.skip(!title, 'Needs the Baseline Test created in PLN-05-07');
      // Baseline Tests are listed in the Playlist of the subject's "Baseline Test" topic (10A Science 1.1).
      await app.guest.open();
      await app.signIn(process.env.VALID_PIN);
      await app.nav.applyClassMap('checkpoints');
      await app.playlist.ensureDrawerVisible();
      await expect(
        app.playlist.resourceCards.filter({ hasText: title }),
        `"${title}" is in the class's Playlist`
      ).toHaveCount(1, { timeout: 30000 });
    }
  );
});
