// Probe (read-only), part 2: teacher row menu, filter, class page, Master Structure, monthly report, terminal search,
// downloads. node tools/exploration/admin-dom-dump2.js <outDir>
const fs = require('fs');
const path = require('path');
const { signIn } = require('./admin-explore-lib');

const out = process.argv[2] || path.join(__dirname, '..', '..', 'test-results-agent-admin', 'dom');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const { browser, page } = await signIn();
  const dump = async (name) => {
    await page.waitForTimeout(1500);
    const html = await page.evaluate(() => {
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script, style, .simple-keyboard').forEach((e) => e.remove());
      return clone.innerHTML.replace(/<!--[^>]*-->/g, '');
    });
    fs.writeFileSync(path.join(out, `${name}.html`), html);
    fs.writeFileSync(path.join(out, `${name}.txt`), await page.locator('body').innerText());
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true }).catch(() => {});
  };
  const tryStep = async (name, fn) => {
    try {
      await fn();
      await dump(name);
    } catch (e) {
      fs.writeFileSync(path.join(out, `${name}.error.txt`), e.message);
      await page.keyboard.press('Escape').catch(() => {});
    }
  };
  const clickText = (re) => page.getByText(re).filter({ visible: true }).first().click();
  const tile = async (name) => {
    await page.locator('nb-action').filter({ hasText: /manage/i }).click();
    await page.waitForTimeout(800);
    await page.locator('.quick-action-card-title').filter({ hasText: name }).click();
    await page.waitForTimeout(2500);
  };
  const save = async (name, dl) => {
    const d = await dl;
    const p = path.join(out, `${name}-${d.suggestedFilename()}`);
    await d.saveAs(p);
    return p;
  };
  await tile('Manage Teacher');
  await tryStep('20-teacher-menu', async () => {
    await page.locator('tr').filter({ hasText: 'raj.shinde' }).locator('#context-menu').click();
  });
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 500);
  await tryStep('21-filter', async () => {
    await page.locator('ng-select.mydropdownNew').click();
  });
  await page.keyboard.press('Escape');
  await tryStep('22-export', async () => {
    const dl = page.waitForEvent('download', { timeout: 20000 });
    await page.locator('.general-buttons').filter({ hasText: 'Export Teacher' }).click();
    await save('export', dl);
  });
  await tryStep('23-import-sample', async () => {
    await page.locator('.general-buttons').filter({ hasText: 'Import Teacher' }).click();
    await page.waitForTimeout(1000);
    const dl = page.waitForEvent('download', { timeout: 20000 });
    await clickText(/Download Sample CSV/);
    await save('sample', dl);
  });
  await tryStep('24-import-nofile', async () => {
    await page.getByRole('button', { name: /^\s*Import\s*$/ }).filter({ visible: true }).click();
    await page.waitForTimeout(1500);
  });
  await page.keyboard.press('Escape');
  await tryStep('25-academic-10A', async () => {
    await tile('Academic Details');
    await page
      .locator('div[fxlayout="row"]')
      .filter({ has: page.locator('.all-classes-list__grade', { hasText: /^\s*Class 10\s*$/ }) })
      .locator('mat-card')
      .filter({ hasText: 'Division A' })
      .first()
      .click();
    await page.waitForTimeout(4000);
  });
  await tryStep('26-master-structure', async () => {
    await tile('Academic Details');
    await clickText(/^\s*Master Structure\s*$/);
    await page.waitForTimeout(3000);
  });
  await tryStep('27-terminal-search', async () => {
    await page.locator('nb-action').filter({ hasText: /overview/i }).click();
    await clickText(/School Settings/);
    await clickText(/^\s*Terminal Settings\s*$/);
    await page.waitForTimeout(1500);
  });
  await tryStep('28-terminal-info', async () => {
    await page.locator('.fa-info-circle').first().click();
  });
  await tryStep('29-terminal-download', async () => {
    const dl = page.waitForEvent('download', { timeout: 20000 });
    await page.locator('.fa-download').first().click();
    await save('terminals', dl);
  });
  await page.keyboard.press('Escape');
  await page.locator('ngb-modal-window .close').first().click().catch(() => {});
  await tryStep('30-monthly', async () => {
    await tile('Manage School');
    await page.locator('#dropdownBasic1').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Monthly' }).click();
    await page.waitForTimeout(15000);
  });
  await browser.close();
})();
