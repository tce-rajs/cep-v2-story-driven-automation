// Probe (read-only): sign in to Admin and save the HTML + visible text of every screen, to write page-object
// selectors. node tools/exploration/admin-dom-dump.js <outDir>
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
      clone.querySelectorAll('script, style, svg path, .simple-keyboard, app-virtual-keyboard').forEach((e) => e.remove());
      return clone.innerHTML.replace(/<!--[^>]*-->/g, '').replace(/_ngcontent-[a-z0-9-]+=""/g, '');
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
  const closeModal = async () => {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
  };
  await dump('01-dashboard');
  await tryStep('02-manage', () => clickText(/^\s*MANAGE\s*$/i));
  await tryStep('03-overview', () => clickText(/^\s*OVERVIEW\s*$/i));
  await tryStep('04-settings-grades', () => clickText(/School Settings/i));
  for (const tab of ['School Subjects', 'Subject Settings', 'Terminal Settings', 'Miscellaneous Settings']) {
    await tryStep(`05-settings-${tab.replace(/\W+/g, '-')}`, () => clickText(new RegExp(`^\\s*${tab}\\s*$`, 'i')));
  }
  await closeModal();
  await tryStep('06-usermenu', async () => {
    await page.locator('.userToggle').click();
  });
  await page.locator('.userToggle').click();
  await tryStep('07-school-list', async () => {
    await clickText(/^\s*MANAGE\s*$/i).catch(() => {});
    await page.waitForTimeout(800);
    await clickText(/Manage School/i);
  });
  await tryStep('08-school-menu', () => page.locator('#dropdownBasic1').first().click());
  await tryStep('09-view-school', () => clickText(/^\s*View School\s*$/));
  await closeModal();
  await tryStep('10-sync-status', async () => {
    await page.locator('#dropdownBasic1').first().click();
    await clickText(/View Sync Status/);
  });
  await closeModal();
  await tryStep('11-daily', async () => {
    await page.locator('#dropdownBasic1').first().click();
    await clickText(/View Daily Report/);
    await page.waitForTimeout(15000);
  });
  await page.getByRole('button', { name: /Back/ }).filter({ visible: true }).first().click().catch(() => {});
  await tryStep('12-teachers', async () => {
    await clickText(/DashBoard/i).catch(() => {});
    await page.waitForTimeout(800);
    await clickText(/^\s*MANAGE\s*$/i).catch(() => {});
    await page.waitForTimeout(800);
    await clickText(/Manage Teacher/i);
    await page.waitForTimeout(2500);
  });
  await tryStep('13-teacher-menu', () =>
    page.locator('tr').filter({ hasText: 'raj.shinde' }).first().locator('td').last().locator('*').last().click({ force: true })
  );
  await tryStep('14-version-history', () => clickText(/^\s*Version Hist/i));
  await closeModal();
  await tryStep('15-import', () => clickText(/^\s*Import Teacher\s*$/));
  await closeModal();
  await tryStep('16-create', () => page.getByText('Create Teacher', { exact: true }).click());
  await closeModal();
  await tryStep('17-academic', async () => {
    await clickText(/DashBoard/i).catch(() => {});
    await page.waitForTimeout(800);
    await clickText(/^\s*MANAGE\s*$/i).catch(() => {});
    await page.waitForTimeout(800);
    await clickText(/Academic Details/i);
    await page.waitForTimeout(3000);
  });
  await tryStep('18-build', async () => {
    await clickText(/Build Version/i);
    await page.waitForTimeout(3000);
  });
  await tryStep('19-monthly', async () => {
    await clickText(/DashBoard/i).catch(() => {});
    await page.waitForTimeout(800);
    await clickText(/^\s*MANAGE\s*$/i).catch(() => {});
    await page.waitForTimeout(800);
    await clickText(/Manage School/i);
    await page.waitForTimeout(2000);
    await page.locator('#dropdownBasic1').first().click();
    await clickText(/View Monthly Report/);
    await page.waitForTimeout(15000);
  });
  fs.writeFileSync(path.join(out, 'url.txt'), page.url());
  await browser.close();
})();
