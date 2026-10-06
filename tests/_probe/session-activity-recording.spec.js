// Recorded session (owner request 2026-10-06): a teacher kept continuously active -- handwriting on the board, opening a
// worksheet / video / image and writing on them, playing the video -- until the app's forced sign-out, to find the
// EXACT time of the forced sign-out. Every action, token request and the sign-out moment are timestamped (minutes and
// seconds from sign-in) and saved, with an uncut video of the whole client session.
// Run (one client launch = one uncut video):
//   RECORD_VIDEO_DIR=report/session-video/<stamp> VALID_PIN=<pin> npx playwright test tests/_probe/session-activity-recording.spec.js
// Writing goes below anything already on the board (never cleared) and only on assets / a non-data topic.
const fs = require('fs');
const path = require('path');
const { test } = require('../../fixtures');

const OUT = process.env.RECORD_VIDEO_DIR || path.join('report', 'session-video', 'latest');
const MAX_MINUTES = 60;
const icon = (name) =>
  `[data-qa-id="playlist-resource-card"]:has(img.type-icon[src*="${name}" i]), [data-qa-id="playlist-asset-card"]:has(img.type-icon[src*="${name}" i])`;

test('Recorded session: continuous activity until the forced sign-out', async ({ app, page }) => {
  test.setTimeout((MAX_MINUTES + 15) * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  const events = [];
  let t0 = 0;
  const stamp = () => {
    const s = t0 ? (Date.now() - t0) / 1000 : 0;
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };
  const log = (what) => {
    const e = { at: stamp(), clock: new Date().toLocaleTimeString('en-GB'), what };
    events.push(e);
    console.log(`[${e.at} | ${e.clock}] ${what}`);
  };

  // Token / sign-in / sign-out requests, with their answers.
  page.on('response', (r) => {
    const u = r.url();
    if (r.request().method() !== 'GET' && /sso\/(token|extend|logout)|logout|signout/i.test(u))
      log(`network: ${r.request().method()} ${u.replace(/^https?:\/\/[^/]+/, '')} -> ${r.status()}`);
  });

  await app.signIn(process.env.VALID_PIN);
  t0 = Date.now();
  log(`signed in as PIN ${process.env.VALID_PIN} (time zero)`);

  // The forced sign-out: the avatar disappears. Watched continuously in the background.
  let signedOutAt = null;
  const watcher = app.login.avatar
    .waitFor({ state: 'hidden', timeout: MAX_MINUTES * 60 * 1000 })
    .then(() => {
      signedOutAt = stamp();
      log('FORCED SIGN-OUT: the app signed the teacher out (avatar gone)');
    })
    .catch(() => {});
  const popup = page.getByText(/continue session|are you still there|session.*expire/i).first();

  // Where to work: a topic with a worksheet, a video and an image (12A Computer Science 2.2), not a data board.
  await app.nav.resetToClass('Class 12', 'A', 'Computer Science');
  await app.nav.goToChapterTopic(1, 1);
  await app.playlist.ensureDrawerVisible().catch(() => {});
  await page.waitForTimeout(3000);
  log(
    `working on ${(await app.nav.currentClassBtn.innerText()).replace(/\s+/g, ' ')} / ${(await app.nav.currentChapterTopicBtn.innerText()).replace(/\s+/g, ' ')}`
  );
  log(`board already had ${await app.toolbar.allPaths.count()} strokes (left untouched; writing goes below them)`);
  await app.content.panBelowExistingWriting().catch(() => {});

  const alive = () => !signedOutAt;
  const pen = async () => {
    await app.toolbar.selectTool('gtPen');
  };
  const wavy = async (x, y, w = 220) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 18; i++) await page.mouse.move(x + (w * i) / 18, y + Math.sin(i / 2) * 14);
    await page.mouse.up();
    await page.waitForTimeout(400);
  };
  let line = 0;
  const writeOnBoard = async () => {
    const area = await app.content.writingArea();
    await pen();
    const y = area.y + 40 + (line % 8) * 60;
    for (let k = 0; k < 4; k++) await wavy(area.x + 40 + k * 250, y, 200);
    line++;
    if (line % 8 === 0) {
      await app.toolbar.selectTool('gtSelect');
      await app.content.panBelowExistingWriting().catch(() => {});
    }
    log(`wrote a line of 4 strokes on the board`);
  };
  const playerBox = async () =>
    (await page.locator('.resources-player, .player').filter({ visible: true }).last().boundingBox()) || {
      x: 400,
      y: 200,
      width: 800,
      height: 450,
    };
  const writeOnAsset = async (label) => {
    await pen();
    const b = await playerBox();
    await wavy(b.x + b.width / 2 - 100, b.y + Math.min(b.height / 2, 250), 200);
    log(`wrote on the ${label}`);
  };
  const openAsset = async (label, selector) => {
    const card = page.locator(selector).first();
    if (!(await card.count())) return log(`no ${label} card on this topic -- skipped`);
    await app.player.openResourceCard(page.locator(selector));
    await page.waitForTimeout(4000);
    log(`opened the ${label}`);
    return true;
  };
  const close = async (label) => {
    await app.toolbar.selectTool('gtSelect').catch(() => {});
    await app.player.closePlayer().catch(() => {});
    await page.waitForTimeout(1500);
    log(`closed the ${label}`);
  };

  const steps = [
    async () => writeOnBoard(),
    async () => {
      if (await openAsset('worksheet', icon('ic.Worksheet'))) {
        await writeOnAsset('worksheet');
        await writeOnAsset('worksheet');
        await close('worksheet');
      }
    },
    async () => writeOnBoard(),
    async () => {
      if (await openAsset('video', icon('ic.AVMediaVideo'))) {
        await app.player.toggleVideoPlayback().catch(() => {});
        log('pressed play on the video');
        await page.waitForTimeout(15000);
        await writeOnAsset('video (while playing)');
        await app.player.toggleVideoPlayback().catch(() => {});
        log('paused the video');
        await writeOnAsset('video (paused)');
        await close('video');
      }
    },
    async () => writeOnBoard(),
    async () => {
      if (await openAsset('image', icon('ic.Image'))) {
        await writeOnAsset('image');
        await close('image');
      }
    },
  ];

  let i = 0;
  while (alive() && Date.now() - t0 < MAX_MINUTES * 60 * 1000) {
    try {
      await steps[i % steps.length]();
    } catch (e) {
      if (alive()) log(`step failed (continuing): ${String(e.message).split('\n')[0]}`);
    }
    if (await popup.isVisible().catch(() => false)) log('a session popup is showing');
    i++;
  }
  await watcher;
  if (signedOutAt) {
    await page.waitForTimeout(8000); // let the screen after the sign-out show in the video
    await page.screenshot({ path: path.join(OUT, 'after-forced-signout.png') });
  } else {
    log(`no forced sign-out within ${MAX_MINUTES} minutes`);
  }

  const lastActions = events.filter((e) => !/network|FORCED/.test(e.what)).slice(-5);
  const summary = [
    '# Recorded session -- continuous activity until the forced sign-out',
    '',
    `- Account: PIN ${process.env.VALID_PIN}, desktop client, ${new Date(t0).toLocaleString('en-GB')}`,
    `- Activity: handwriting on the board, worksheet / video / image opened and written on, video played -- without a pause`,
    `- **Forced sign-out at: ${signedOutAt ? `${signedOutAt} (mm:ss after sign-in)` : `none within ${MAX_MINUTES} min`}**`,
    `- Token requests: ${events.filter((e) => /network/.test(e.what)).length} (listed below)`,
    `- Actions done: ${events.filter((e) => !/network|FORCED|signed in|working on|board already/.test(e.what)).length}`,
    `- Last actions before the sign-out: ${lastActions.map((e) => `${e.at} ${e.what}`).join('; ')}`,
    '- Video: the .webm file in this folder (the whole client window, from launch to after the sign-out, uncut).',
    '',
    '| Time after sign-in | Clock | What happened |',
    '| --- | --- | --- |',
    ...events.map((e) => `| ${e.at} | ${e.clock} | ${e.what.replace(/\|/g, '/')} |`),
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'SESSION-TIMELINE.md'), summary + '\n');
  fs.writeFileSync(path.join(OUT, 'session-timeline.json'), JSON.stringify({ signedOutAt, events }, null, 1));
});
