// Phase 1 exploration — FLOW-01 Guest Mode → the teacher's own board → sign out. Not part of any suite.
// Writes only on the Guest Mode board (a unique text marker); the teacher's board is only read.
// Evidence: report/exploration/flow-01/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-01');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
};

test.setTimeout(10 * 60 * 1000);

test('explore FLOW-01 guest to own board', async ({ app, page }) => {
  const marker = `GUEST-${Date.now().toString(36)}`;
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const onBoard = (text) =>
    page.evaluate(
      (t) =>
        [...document.querySelectorAll('svg text, .text-input-container, foreignObject')].some((e) =>
          (e.textContent || '').includes(t)
        ),
      text
    );
  const isIn = () => app.login.avatar.isVisible().catch(() => false);

  // A. Guest Mode as the panel starts
  await app.login.open();
  await page.waitForTimeout(3000);
  await shot('A-guest');
  note('A-guest', {
    signedIn: await isIn(),
    guestText: await app.login.guestModeText.isVisible().catch(() => false),
    toolbarTools: await page.evaluate(() =>
      [...document.querySelectorAll('[data-qa-id^="toolbar-tool-"]')]
        .filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => e.getAttribute('data-qa-id').replace('toolbar-tool-', ''))
    ),
  });

  // B. Write a marker on the guest board
  const box = await app.toolbar.wbSvg.boundingBox();
  await app.whiteboard.insertTextAndType(box.width / 2 - 200, box.height / 2 - 100, marker);
  await page.mouse.click(box.x + 150, box.y + box.height - 250);
  await page.waitForTimeout(1500);
  await shot('B-guest-marker');
  note('B-guest-marker', { marker, onGuestBoard: await onBoard(marker) });

  // C. Sign in from Guest Mode
  await app.signIn();
  await page.waitForTimeout(5000);
  await shot('C-signed-in');
  note('C-signed-in', {
    signedIn: await isIn(),
    classLabel: (await app.nav.currentClassBtn.innerText().catch(() => '')).replace(/\s+/g, ' '),
    topic: (await app.nav.currentChapterTopicBtn.innerText().catch(() => '')).replace(/\s+/g, ' '),
    guestMarkerOnTeacherBoard: await onBoard(marker),
  });

  // D. Sign out → back to Guest Mode
  await app.userMenu.signOut();
  await page.waitForTimeout(4000);
  await shot('D-after-signout');
  note('D-after-signout', {
    signedIn: await isIn(),
    guestText: await app.login.guestModeText.isVisible().catch(() => false),
    guestMarkerStill: await onBoard(marker),
    textObjectsOnBoard: await page.locator('.text-input-container').count(),
  });

  // E. Reload in Guest Mode: is the guest board kept or wiped?
  await page.reload();
  await page.waitForTimeout(6000);
  await shot('E-guest-after-reload');
  note('E-guest-after-reload', { guestMarkerAfterReload: await onBoard(marker), signedIn: await isIn() });
});
