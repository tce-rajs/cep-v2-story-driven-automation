// Phase 1 exploration — FLOW-16 AI Notices, second pass: Hindi capture, the paraphrase/translate/grammar tools, and
// the "Share with" list against the teacher's own classes. Never sends. Evidence: report/exploration/flow-16/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-16');
const LOG = path.join(OUT, 'log-b.json');
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
};

test.use({ classMap: 'default', freshSpace: true });
test.setTimeout(15 * 60 * 1000);

test('explore FLOW-16 AI Notices, second pass', async ({ user, page }) => {
  const n = user.aiNotices;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const body = () => n.bodyEditor.innerText().catch(() => '(no body)');
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      note(name, { error: e.message.split('\n')[0] });
      await shot(`${name}-error`);
      await n.closeAll().catch(() => {});
    }
  };

  // G. The teacher's own classes (All My Classes) — to compare with the notice's "Share with" list
  await step('G-my-classes', async () => {
    await user.whiteboard.currentClassBtn.click({ force: true });
    await page.waitForTimeout(1500);
    const recent = await page
      .locator('[role="tabpanel"]')
      .filter({ visible: true })
      .first()
      .innerText()
      .catch(() => '');
    await page.getByRole('tab', { name: 'All My Classes' }).click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    await shot('G-all-my-classes');
    const all = await page
      .locator('[role="tabpanel"]')
      .filter({ visible: true })
      .first()
      .innerText()
      .catch(() => '');
    note('G-my-classes', { recent: recent.replace(/\s+/g, ' '), all: all.replace(/\s+/g, ' ') });
    await page.keyboard.press('Escape');
    await page.mouse.click(960, 200);
    await page.waitForTimeout(800);
  });

  // H. Hindi + Marathi text: capture it by dragging around the text box wherever it landed
  await step('H-hindi', async () => {
    const box = await user.toolbar.wbSvg.boundingBox();
    const textObj = await user.whiteboard.insertTextAndType(
      box.width / 2 - 300,
      box.height / 2,
      'कल विद्यालय बंद रहेगा उद्या शाळा बंद राहील'
    );
    await page.mouse.click(box.x + 200, box.y + box.height - 250); // leave the text box
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    const t = await textObj.boundingBox();
    await user.magnet.choose('notice');
    await n.captureBanner.waitFor({ state: 'visible', timeout: 10000 });
    await n.dragSelect({ x: 0, y: 0 }, { x: t.x - 30, y: t.y - 30 }, { x: t.x + t.width + 30, y: t.y + t.height + 30 });
    await shot('H-hindi-selected');
    await n.approveBtn.click({ force: true });
    await n.titleInput.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(3000);
    await shot('H-hindi-result');
    note('H-hindi', {
      title: await n.titleInput.inputValue(),
      body: await body(),
      shareWith: await n.classOptions.allInnerTexts(),
      ticked: await n.classCheckboxes.evaluateAll((els) => els.map((e) => e.checked)),
    });
  });

  // I. Where the paraphrase / translate / grammar tools are, and what they do with the body text selected
  await step('I-tools', async () => {
    if (!(await n.isComposerOpen())) await n.openComposer(user, 'parents meeting on saturday at ten');
    await n.hideKeyboard();
    const where = await page.evaluate(() =>
      ['paraphrase', 'translate', 'grammar'].map((k) => {
        const e = document.querySelector(`[data-qa-id="ai-notices-${k}-btn"]`);
        if (!e) return { k, present: false };
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return {
          k,
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          display: s.display,
          visibility: s.visibility,
          opacity: s.opacity,
        };
      })
    );
    note('I-where', { where });
    for (const k of ['paraphrase', 'translate', 'grammar']) {
      await n.bodyEditor.click();
      await page.keyboard.press('Control+A');
      await page.waitForTimeout(800);
      await shot(`I-${k}-selected`);
      const btn = page.locator(`[data-qa-id="ai-notices-${k}-btn"]`);
      const visible = await btn.isVisible().catch(() => false);
      const before = await body();
      if (visible) await btn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(8000);
      await shot(`I-${k}-after`);
      note(`I-${k}`, { visibleWithSelection: visible, before, after: await body() });
      await page.keyboard.press('Escape');
    }
  });

  await n.closeAll().catch(() => {});
});
