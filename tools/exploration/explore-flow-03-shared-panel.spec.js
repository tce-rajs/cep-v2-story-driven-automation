// Phase 1 exploration — FLOW-03 two teachers on one classroom panel. Not part of any suite. Read-only: nothing is
// written. Teacher A (VALID_PIN, raj.shinde) signs in and out, then teacher B (VALID_PIN_2), then A again.
// Checks that B sees only B's name, classes and resources. Evidence: report/exploration/flow-03/.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');

const OUT = path.join(__dirname, '..', '..', 'report', 'exploration', 'flow-03');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const note = (step, data) => {
  log.push({ step, ...data });
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
};

test.setTimeout(15 * 60 * 1000);

test('explore FLOW-03 shared panel', async ({ app, page }) => {
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
  const who = async (label) => {
    await app.userMenu.openProfileMenu();
    const name = (await app.userMenu.signedInAsRow.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    await page.keyboard.press('Escape');
    await app.nav.currentClassBtn.click({ force: true });
    await page.waitForTimeout(1500);
    const recent = (await app.nav.recentClassButtons.allInnerTexts().catch(() => [])).map((t) =>
      t.replace(/\s+/g, ' ').trim()
    );
    await shot(`${label}-recent`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    const cards = (await app.playlist.cardTitles().catch(() => [])).slice(0, 15);
    return {
      name,
      classLabel: (await app.nav.currentClassBtn.innerText().catch(() => '')).replace(/\s+/g, ' '),
      topic: (await app.nav.currentChapterTopicBtn.innerText().catch(() => '')).replace(/\s+/g, ' '),
      recent,
      playlistCards: cards,
    };
  };

  await app.login.open();
  await app.signIn(process.env.VALID_PIN);
  await page.waitForTimeout(4000);
  const a1 = await who('A1');
  note('A1-teacher-A', a1);
  await app.userMenu.signOut();
  await page.waitForTimeout(3000);

  await app.signIn(process.env.VALID_PIN_2);
  await page.waitForTimeout(4000);
  const b = await who('B');
  note('B-teacher-B', b);
  note('B-leak-check', {
    sameName: a1.name === b.name,
    recentClassesSharedWithA: b.recent.filter((r) => a1.recent.includes(r)),
    samePlaylistCards:
      a1.topic === b.topic ? b.playlistCards.filter((c) => a1.playlistCards.includes(c)) : '(different topic)',
  });
  await app.userMenu.signOut();
  await page.waitForTimeout(3000);

  await app.signIn(process.env.VALID_PIN);
  await page.waitForTimeout(4000);
  const a2 = await who('A2');
  note('A2-teacher-A-again', {
    ...a2,
    sameClassAsBefore: a2.classLabel === a1.classLabel,
    sameTopicAsBefore: a2.topic === a1.topic,
  });
});
