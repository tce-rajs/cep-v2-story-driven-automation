// Phase 1 exploration — FLOW-16 AI Notices, end to end, in the desktop client. Not part of any suite (tools/exploration).
// Writes only in fresh space below the teacher's content; never sends a notice. Every step is screenshotted and logged
// to report/exploration/flow-16/log.json so the findings can be written up from evidence.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');
const { layoutHandwriting } = require('../../pages/lib/handwriting');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-16');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
};

test.use({ classMap: 'default', freshSpace: true });
test.setTimeout(15 * 60 * 1000);

test('explore FLOW-16 AI Notices', async ({ user, page }) => {
  const n = user.aiNotices;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const body = () => n.bodyEditor.innerText().catch(() => '(no body)');
  const title = () => n.titleInput.inputValue().catch(() => '(no title)');
  const composerButtons = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-qa-id^="ai-notices"]')]
        .filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => `${e.getAttribute('data-qa-id')}|${(e.innerText || e.value || '').trim().slice(0, 40)}`)
    );
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      note(name, { error: e.message.split('\n')[0] });
      await shot(`${name}-error`);
      await n.closeAll().catch(() => {});
    }
  };

  // A. Magnet menu: what it offers (is there any list of sent notices?)
  await step('A-magnet-menu', async () => {
    await user.magnet.open();
    await shot('A-magnet-menu');
    const items = await page.evaluate(() =>
      [...document.querySelectorAll('[data-qa-id^="toolbar-magnet-"]')]
        .filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => `${e.getAttribute('data-qa-id')}|${e.innerText.trim()}`)
    );
    note('A-magnet-menu', { items });
    await page.keyboard.press('Escape');
  });

  // B. Capture real handwriting (pen strokes, as a teacher writes), not a text box
  await step('B-handwriting', async () => {
    const box = await user.toolbar.wbSvg.boundingBox();
    const pages = layoutHandwriting(
      'plants need sunlight and water',
      { x: 270, y: 270, width: 400, height: 90 },
      {
        xHeight: 20,
        seed: 5,
      }
    );
    await user.content.writeHandwriting(pages);
    await page.keyboard.press('Escape');
    await user.magnet.choose('notice');
    await n.captureBanner.waitFor({ state: 'visible', timeout: 10000 });
    await n.dragSelect(box, { x: 250, y: 255 }, { x: 700, y: 380 });
    await shot('B-handwriting-selected');
    await n.approveBtn.click({ force: true });
    const opened = await n.titleInput.waitFor({ state: 'visible', timeout: 30000 }).then(
      () => true,
      () => false
    );
    await page.waitForTimeout(3000);
    await shot('B-handwriting-result');
    note('B-handwriting', {
      composerOpened: opened,
      title: await title(),
      body: await body(),
      unableToProcess: await n.unableToProcessToast.isVisible().catch(() => false),
    });
    await n.closeAll();
  });

  // C. Hindi + Marathi text box capture
  await step('C-hindi', async () => {
    await user.whiteboard.insertTextAndType(300, 480, 'कल विद्यालय बंद रहेगा उद्या शाळा बंद राहील');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    await user.magnet.choose('notice');
    await n.captureBanner.waitFor({ state: 'visible', timeout: 10000 });
    const box = await user.toolbar.wbSvg.boundingBox();
    await n.dragSelect(box, { x: 250, y: 450 }, { x: 900, y: 530 });
    await n.approveBtn.click({ force: true });
    await n.titleInput.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(3000);
    await shot('C-hindi-result');
    note('C-hindi', { title: await title(), body: await body() });
    // keep this composer open for D
  });

  // D. Composer tools: every visible control, then translate / paraphrase / grammar one by one
  await step('D-tools', async () => {
    if (!(await n.isComposerOpen())) await n.openComposer(user, 'Parents meeting on Saturday at ten');
    await n.hideKeyboard();
    note('D-controls', { controls: await composerButtons() });
    for (const kind of ['paraphrase', 'translate', 'grammar']) {
      const btn = page.locator(`[data-qa-id*="${kind}"]`).filter({ visible: true }).first();
      if (!(await btn.count())) {
        note(`D-${kind}`, { present: false });
        continue;
      }
      const before = await body();
      await btn.click({ force: true });
      await page.waitForTimeout(6000);
      await shot(`D-${kind}`);
      const menu = await page.evaluate(() =>
        [...document.querySelectorAll('[role="menuitem"], mat-option, .mat-mdc-menu-item, li')]
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => e.innerText.trim())
          .filter(Boolean)
          .slice(0, 20)
      );
      note(`D-${kind}`, { present: true, before, after: await body(), visibleOptions: menu });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  // E. Reload with the composer open and edited: is the draft kept, or warned about?
  await step('E-reload', async () => {
    if (!(await n.isComposerOpen())) await n.openComposer(user, 'Sports day is on Monday');
    await n.titleInput.fill('Draft notice before reload');
    await page.reload();
    await page.waitForTimeout(8000);
    await shot('E-after-reload');
    note('E-reload', {
      composerOpenAfterReload: await n.isComposerOpen(),
      draftTextOnScreen: await page
        .getByText('Draft notice before reload')
        .isVisible()
        .catch(() => false),
    });
  });

  // F. Change class with the composer open and edited
  await step('F-class-switch', async () => {
    await n.openComposer(user, 'Science exhibition next week');
    await n.titleInput.fill('Draft before class switch');
    await n.hideKeyboard();
    await user.whiteboard.currentClassBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await shot('F-class-popup');
    note('F-class-switch', {
      composerStillOpen: await n.isComposerOpen(),
      warningShown: await page
        .getByText(/discard|unsaved|lose/i)
        .first()
        .isVisible()
        .catch(() => false),
    });
    await page.keyboard.press('Escape');
    await n.closeAll();
  });
});
