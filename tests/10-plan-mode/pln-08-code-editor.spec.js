// PLN-08 — Code Editor
// Source: CEPV2_Stories/10_PlanMode.md
// Plan Mode account, Class 12 Physics 1.1. The editor is a Python editor by default; Run shows the program's output
// beside it, a program that reads input asks for it in a small dialog, and Save stores the code as a resource of the
// current topic ("python-<date>-<time>"), shown in that topic's Teach Mode Playlist. Every saved program is removed
// again from the Playlist at the end of the test.

const { test, expect } = require('../../fixtures');
const { openPlanMode, quizCardInTeach, removeQuiz } = require('./plan-helpers');

const marker = () => `AutoTest code ${Date.now() % 1000000}`;
/** The title the app gave saved code (from the save request). */
const savedTitle = (response) => JSON.parse(response.request().postData() || '{}').title;

test.describe('PLN-08 Code Editor', () => {
  test.describe.configure({ timeout: 240000 });

  test.beforeEach(async ({ app }) => {
    await openPlanMode(app);
    await app.plan.openSection('Code Editor');
    await expect(app.plan.codeEditor, 'set-up: the editor is shown').toBeVisible({ timeout: 15000 });
  });

  test('PLN-08-01: the Code Editor section opens', { tag: ['@functional'] }, async ({ page }) => {
    await expect(page.getByText('Code Editor', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  });

  test(
    'PLN-08-02: a template program runs and shows its output',
    { tag: ['@smoke', '@functional'] },
    async ({ app }) => {
      await app.plan.setCode('print("Hello from AutoTest")');
      expect(await app.plan.runCode(), 'the output of the program').toContain('Hello from AutoTest');
    }
  );

  test(
    'PLN-08-03: code saved in Plan Mode appears in Teach Mode for that topic',
    { tag: ['@functional'] },
    async ({ app }) => {
      const text = marker();
      await app.plan.setCode(`print("${text}")`);
      const saved = await app.plan.saveCode();
      expect(saved && saved.ok(), 'set-up: the code is saved').toBe(true);
      const title = savedTitle(saved);
      try {
        const card = await quizCardInTeach(app, title);
        await expect(card, `"${title}" is in the topic's Playlist`).toHaveCount(1, { timeout: 20000 });
      } finally {
        await removeQuiz(app, title);
      }
    }
  );

  test(
    'PLN-08-04: each language offered can run a simple program and shows its output',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      // A simple program per language the Code Editor names (the side panel lists Block-based Coding, Python, HTML,
      // CSS, JavaScript, MySQL and Java), with the text its output must show.
      const programs = {
        Python: ['print(6 * 7)', '42'],
        JavaScript: ['console.log(6 * 7)', '42'],
        Java: ['public class Main { public static void main(String[] a) { System.out.println(6 * 7); } }', '42'],
        HTML: ['<h1>AutoTest 42</h1>', 'AutoTest 42'],
        MySQL: ['SELECT 6 * 7 AS answer;', '42'],
      };
      // The settings button sits right of Save in the editor's bar.
      await app.plan.saveCodeBtn.scrollIntoViewIfNeeded();
      const save = await app.plan.saveCodeBtn.boundingBox();
      await page.mouse.click(save.x + save.width + 25, save.y + save.height / 2);
      await page.waitForTimeout(1500);
      const offered = [];
      for (const name of Object.keys(programs))
        if (await page.getByText(name, { exact: true }).filter({ visible: true }).count()) offered.push(name);
      expect(offered.length, 'the editor offers more than one language to choose').toBeGreaterThan(1);
      const failures = [];
      for (const name of offered) {
        await page.getByText(name, { exact: true }).filter({ visible: true }).first().click();
        await page.waitForTimeout(2000);
        await app.plan.setCode(programs[name][0]);
        const out = await app.plan.runCode();
        if (!out.includes(programs[name][1])) failures.push(`${name}: "${out.slice(0, 80)}"`);
        await app.plan.saveCodeBtn.scrollIntoViewIfNeeded();
        const s = await app.plan.saveCodeBtn.boundingBox();
        await page.mouse.click(s.x + s.width + 25, s.y + s.height / 2);
        await page.waitForTimeout(1500);
      }
      expect(failures, `every language runs its program (offered: ${offered.join(', ')})`).toEqual([]);
    }
  );

  test(
    'PLN-08-05: a program with a syntax error shows the error, not a blank output',
    { tag: ['@negative'] },
    async ({ app }) => {
      await app.plan.setCode('print("unclosed"');
      const out = await app.plan.runCode();
      expect(out, 'the output names the error').toMatch(/error/i);
    }
  );

  test(
    'PLN-08-06: a program that never ends (an endless loop) can be stopped or times out with a message',
    { tag: ['@edge'] },
    async ({ app }) => {
      await app.plan.setCode('while True:\n    pass');
      let out = await app.plan.runCode(60000);
      if (!/stopped|time.?out|exceeded|terminated|interrupted/i.test(out)) {
        await app.plan.forceStopBtn.click({ force: true });
        await app.page.waitForTimeout(3000);
        out = (await app.plan.codeOutput.innerText()).trim();
      }
      expect(out, 'a message says the program was stopped').toMatch(
        /stopped|time.?out|exceeded|terminated|interrupted/i
      );
    }
  );

  test('PLN-08-07: a program that reads input can be given input', { tag: ['@functional'] }, async ({ app }) => {
    await app.plan.setCode('name = input()\nprint("Hello " + name)');
    await app.plan.runCode();
    await expect(app.plan.codeInputField, 'the editor asks for the input').toBeVisible({ timeout: 15000 });
    await app.plan.codeInputField.fill('AutoTest');
    await app.plan.codeInputSubmitBtn.click();
    await expect(app.plan.codeOutput, 'the program used the input').toContainText('Hello AutoTest', { timeout: 15000 });
  });

  test(
    'PLN-08-08: saved code opens again with the same text after a reload',
    { tag: ['@regression'] },
    async ({ app, page }) => {
      const text = marker();
      await app.plan.setCode(`print("${text}")`);
      const saved = await app.plan.saveCode();
      expect(saved && saved.ok(), 'set-up: the code is saved').toBe(true);
      const title = savedTitle(saved);
      try {
        await page.reload();
        await page.waitForTimeout(5000);
        const card = await quizCardInTeach(app, title);
        await expect(card, 'set-up: the saved code is in the Playlist').toHaveCount(1, { timeout: 20000 });
        await app.player.openResourceCard(card);
        await expect(
          page.getByText(text, { exact: false }).filter({ visible: true }).first(),
          'the saved code opens with its text'
        ).toBeVisible({ timeout: 30000 });
      } finally {
        await app.player.closePlayer().catch(() => {});
        await removeQuiz(app, title);
      }
    }
  );

  test('PLN-08-09: code cannot be saved without a name', { tag: ['@negative'] }, async ({ app }) => {
    await app.plan.setCode(`print("${marker()}")`);
    const saved = await app.plan.saveCode();
    try {
      // Saving must ask for a name first: nothing may be stored until the teacher has given one.
      expect(saved, `nothing is saved without a name${saved ? ` (saved as "${savedTitle(saved)}")` : ''}`).toBeNull();
    } finally {
      if (saved && saved.ok()) await removeQuiz(app, savedTitle(saved));
    }
  });

  test('PLN-08-10: saved code can be deleted', { tag: ['@functional'] }, async ({ app, page }) => {
    await app.plan.setCode(`print("${marker()}")`);
    const saved = await app.plan.saveCode();
    expect(saved && saved.ok(), 'set-up: the code is saved').toBe(true);
    const title = savedTitle(saved);
    await removeQuiz(app, title);
    await page.reload();
    await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
    const card = await quizCardInTeach(app, title);
    await expect(card, 'the saved code is gone').toHaveCount(0, { timeout: 15000 });
  });
});
