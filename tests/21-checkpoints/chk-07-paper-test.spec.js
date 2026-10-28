// CHK-07 — Run a checkpoint as a paper test
// Source: CEPV2_Stories/21_Checkpoints.md
// Uses a checkpoint of the topic that has never been launched online. The workflow unlocks step by step: Generate PDF
// lists the paper under "Previously generated paper"; downloading that paper unlocks Conduct Assessment; Conduct
// Assessment offers the Excel register template; the filled register is uploaded in the last step.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { test, expect } = require('../../fixtures');
const { CP } = require('./chk-helpers');

test.describe('CHK-07 Run a checkpoint as a paper test', () => {
  test.use({ classMap: 'checkpoints' });
  test.describe.configure({ timeout: 180000 });

  const STEPS = [
    'Download Question Paper',
    'Conduct Assessment',
    'Download Student Register',
    'Upload Evaluated Register',
  ];
  const workflow = (user) => user.page.getByText('Paper Test Workflow', { exact: true });
  const generatePdfBtn = (user) => user.page.getByRole('button', { name: /Generate PDF/i }).first();
  const previousPaper = (user) => user.page.getByText(/PREVIOUSLY GENERATED PAPER/i).locator('xpath=..');
  const templateBtn = (user) => user.page.getByRole('button', { name: /Download Excel Template/i });

  /** Open a checkpoint that has not been launched online and choose Paper Test. */
  const openPaperTest = async (user) => {
    const fresh = user.playlist.resourceCards
      .filter({ hasText: 'CREATED' })
      .filter({ hasNotText: CP.checkpointTitle })
      .first();
    test.skip(!(await fresh.count()), 'Needs a checkpoint in the topic that has never been launched');
    await user.player.openResourceCard(fresh);
    // A checkpoint already part-way through the paper workflow opens on it; otherwise the mode choice shows.
    await expect(user.player.checkpointModeOfflineBtn.or(workflow(user)).first()).toBeVisible({ timeout: 20000 });
    if (await user.player.checkpointModeOfflineBtn.isVisible()) await user.player.checkpointModeOfflineBtn.click();
    await expect(workflow(user)).toBeVisible({ timeout: 15000 });
  };

  /** Make sure a paper has been generated, then download it; returns the download. */
  const downloadPaper = async (user) => {
    if (
      !(await previousPaper(user)
        .isVisible()
        .catch(() => false))
    ) {
      await generatePdfBtn(user).click();
      await expect(previousPaper(user), 'the generated paper is listed').toBeVisible({ timeout: 30000 });
    }
    const download = user.page.waitForEvent('download', { timeout: 30000 });
    await previousPaper(user).locator('button').last().click();
    return download;
  };

  test.afterEach(async ({ app }) => {
    await app.player.checkpointCloseBtn.click({ force: true, timeout: 3000 }).catch(() => {});
  });

  test(
    'CHK-07-01: Paper Test shows the four workflow steps in order',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await openPaperTest(user);
      const text = (await user.page.locator('body').innerText()).replace(/\s+/g, ' ');
      const positions = STEPS.map((s) => text.indexOf(s));
      positions.forEach((p, i) => expect(p, STEPS[i]).toBeGreaterThan(-1));
      expect(
        [...positions].sort((a, b) => a - b),
        'in order'
      ).toEqual(positions);
    }
  );

  test('CHK-07-02: Generate PDF downloads the question paper as a PDF', { tag: ['@functional'] }, async ({ user }) => {
    await openPaperTest(user);
    await generatePdfBtn(user).click();
    await expect(previousPaper(user), 'the generated paper is listed').toBeVisible({ timeout: 30000 });
    await expect(previousPaper(user)).toContainText(/\d+ Questions/);
    const download = await downloadPaper(user);
    expect(download.suggestedFilename(), 'a PDF file').toMatch(/\.pdf$/i);
  });

  test(
    'CHK-07-06: the later steps stay locked until the earlier steps are done',
    { tag: ['@negative'] },
    async ({ user }) => {
      await openPaperTest(user);
      if (
        await templateBtn(user)
          .isVisible()
          .catch(() => false)
      ) {
        test.skip(true, 'This checkpoint is already past the question paper step');
      }
      await expect(templateBtn(user), 'no register template before the paper is downloaded').toHaveCount(0);
      await expect(user.page.locator('input[type=file]').filter({ visible: true }), 'no upload yet').toHaveCount(0);
    }
  );

  test('CHK-07-03: the Student Register downloads as an Excel file', { tag: ['@functional'] }, async ({ user }) => {
    await openPaperTest(user);
    if (
      !(await templateBtn(user)
        .isVisible()
        .catch(() => false))
    ) {
      await downloadPaper(user);
      await user.page.getByText('Conduct Assessment', { exact: true }).click();
    }
    await expect(templateBtn(user), 'Conduct Assessment offers the register template').toBeVisible({ timeout: 15000 });
    const download = user.page.waitForEvent('download', { timeout: 30000 });
    await templateBtn(user).click();
    expect((await download).suggestedFilename(), 'an Excel file').toMatch(/\.xlsx?$/i);
  });

  test(
    'CHK-07-04: uploading a file that is not an Excel register is refused with a message',
    { tag: ['@negative'] },
    async ({ user }) => {
      await openPaperTest(user);
      if (
        !(await templateBtn(user)
          .isVisible()
          .catch(() => false))
      ) {
        await downloadPaper(user);
        await user.page.getByText('Conduct Assessment', { exact: true }).click();
      }
      const download = user.page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
      await templateBtn(user).click();
      await download;
      await user.page.getByText('Upload Evaluated Register', { exact: true }).click();
      const input = user.page.locator('input[type=file]').last();
      await expect(input, 'an upload field').toBeAttached({ timeout: 15000 });
      const file = path.join(os.tmpdir(), 'not-a-register.txt');
      fs.writeFileSync(file, 'this is not an evaluated register');
      await input.setInputFiles(file);
      await expect(
        user.page.getByText(/invalid|not supported|only .*xls|excel|wrong file|format/i).first(),
        'refused with a message'
      ).toBeVisible({ timeout: 15000 });
    }
  );

  test(
    'CHK-07-05: Back returns to the In-Lab Assessment / Paper Test choice',
    { tag: ['@functional'] },
    async ({ user }) => {
      await openPaperTest(user);
      const back = user.page.getByRole('button', { name: 'Back' });
      test.skip(
        !(await back.isVisible().catch(() => false)),
        'Back is offered only before the paper test is conducted'
      );
      await back.click();
      await expect(user.player.checkpointModeOnlineBtn).toBeVisible({ timeout: 10000 });
      await expect(user.player.checkpointModeOfflineBtn).toBeVisible();
    }
  );
});
