// Reference recordings: one end-to-end teacher journey per module, recorded in the desktop client for each build.
// Run on a new build:   RECORD_VIDEO_DIR=evidence/tmp JOURNEYS=1 npx playwright test tests/99-journeys
// Each journey launches its own client as the journey account (VALID_PIN_2, melville.coutinho), walks the module's main
// flow, and saves to evidence/builds/<build>/:
//   NN-<module>.webm and .mp4   the uncut video        NN-<module>-frames.png   six frames at a glance
//   NN-<module>-trace.zip       a Playwright trace (npx playwright show-trace <file>): every step with a screenshot
//   INDEX.md                    one line per journey: result, length and files
// Journeys add one stroke on fresh board space at most; nothing is erased or sent. The suite runner selects them
// explicitly; direct Playwright runs remain opt-in.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { test, expect } = require('@playwright/test');
const { launchWithRetry } = require('../../fixtures/electron-app');
const { App } = require('../../pages/app');
const { pinForModule } = require('../../config/moduleClassMap');
const { createQuiz, quizCardInTeach, removeQuiz, autoTitle } = require('../10-plan-mode/plan-helpers');

const ROOT = path.join(__dirname, '..', '..');
const PIN = process.env.VALID_PIN_2;
let buildDir = null;

test.describe.configure({ timeout: 300000 });
test.skip(
  !process.env.JOURNEYS,
  'Reference recordings require JOURNEYS=1 (the suite runner sets it for its recording group)'
);
test.skip(!process.env.RECORD_VIDEO_DIR, 'Set RECORD_VIDEO_DIR (e.g. evidence/tmp) so the client is recorded');

/** Launch a recorded client, run `journey(app)`, then save the video, trace and frames under the build folder. */
async function record(id, name, journey) {
  const started = Date.now();
  const { app: electronApp, teachWindow } = await launchWithRetry();
  const app = new App(teachWindow);
  await electronApp.context().tracing.start({ screenshots: true, snapshots: false });
  let status = 'passed';
  let error = '';
  try {
    const version = (await app.header.versionText.innerText().catch(() => 'unknown')).replace(/^v\s*/i, '').trim();
    // JOURNEY_BUILD names the folder when the build label did not change between deployments.
    buildDir = buildDir || path.join(ROOT, 'evidence', 'builds', process.env.JOURNEY_BUILD || `v${version}`);
    fs.mkdirSync(buildDir, { recursive: true });
    await journey(app, teachWindow);
  } catch (e) {
    status = 'failed';
    error = String(e.message).split('\n')[0];
  }
  const base = path.join(buildDir || path.join(ROOT, 'evidence', 'builds', 'unknown'), `${id}-${name}`);
  fs.mkdirSync(path.dirname(base), { recursive: true });
  await electronApp
    .context()
    .tracing.stop({ path: `${base}-trace.zip` })
    .catch(() => {});
  const video = teachWindow.video();
  await electronApp.close().catch(() => {});
  if (video) {
    const src = await video.path().catch(() => null);
    if (src && fs.existsSync(src)) {
      fs.copyFileSync(src, `${base}.webm`);
      for (const script of ['to-mp4.js', 'frame-strip.js'])
        try {
          execFileSync('node', [path.join(ROOT, 'scripts', script), `${base}.webm`], {
            stdio: 'ignore',
            timeout: 600000,
          });
        } catch {
          // a missing MP4 or strip does not fail the journey; the WebM is the record
        }
      // Keep one video: the MP4 plays everywhere; the WebM stays only if the MP4 could not be made.
      if (fs.existsSync(`${base}.mp4`)) fs.rmSync(`${base}.webm`);
    }
  }
  const result = { id, name, status, error, seconds: Math.round((Date.now() - started) / 1000) };
  fs.appendFileSync(path.join(path.dirname(base), 'results.jsonl'), JSON.stringify(result) + '\n');
  writeIndex(path.dirname(base));
  expect(error, `${name} journey`).toBe('');
}

/** INDEX.md from results.jsonl (the latest result per module). */
function writeIndex(dir) {
  const byModule = new Map();
  for (const line of fs.readFileSync(path.join(dir, 'results.jsonl'), 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(line);
    byModule.set(r.id, r);
  }
  const results = [...byModule.values()].sort((a, b) => a.id.localeCompare(b.id));
  const lines = [
    `# Reference journeys — build ${path.basename(dir)}`,
    '',
    `Recorded ${new Date().toISOString().slice(0, 16).replace('T', ' ')} in the desktop client (journey account: VALID_PIN_2).`,
    '',
    '| Module | Result | Length | Files |',
    '| --- | --- | --- | --- |',
    ...results.map(
      (r) =>
        `| ${r.id} ${r.name} | ${r.status}${r.error ? `: ${r.error.replace(/\|/g, '/')}` : ''} | ${r.seconds}s | ${r.id}-${r.name}.mp4, -frames.png, -trace.zip |`
    ),
    '',
  ];
  fs.writeFileSync(path.join(dir, 'INDEX.md'), lines.join('\n'));
}

/** Sign in with the journey account, or with `pin` where the module's data is on another account. */
const signIn = async (app, pin = PIN) => {
  await app.signIn(pin);
  await expect(app.login.avatar).toBeVisible({ timeout: 20000 });
};

test('01 Without Login: Guest Mode board, drawing and a widget', async () => {
  await record('01', 'without-login', async (app) => {
    await app.guest.open();
    await app.guest.draw();
    await app.guest.openWidgets();
    await app.toolbar.widgetTool('Clock').click({ force: true });
    await expect(app.guest.clockWidget).toBeVisible();
    await app.guest.clockCloseBtn.click({ force: true });
  });
});

test('03 Login: PIN sign-in, signed-in screen, sign out', async () => {
  await record('03', 'login', async (app) => {
    await app.guest.open();
    await signIn(app);
    await expect(app.magnet.tool).toBeVisible();
    await app.userMenu.signOut();
    await expect(app.login.guestModeText).toBeVisible();
  });
});

test('04 Header: logo, version, date and time, toolbar side, quick Sign Out cancelled', async () => {
  await record('04', 'header', async (app) => {
    await app.guest.open();
    await signIn(app);
    await expect(app.header.logoImage).toBeVisible();
    await app.header.toggleDock();
    await app.page.waitForTimeout(1500);
    await app.header.toggleDock();
    await app.login.floatingSignOut.click({ force: true });
    await expect(app.login.floatingSignOutCountdown).toBeVisible({ timeout: 5000 });
    await app.login.floatingSignOutCountdown.click({ force: true });
    await app.page.waitForTimeout(3000);
    await expect(app.login.avatar).toBeVisible();
  });
});

test('05 Toolbar: pen in a colour, a text box, a shape, Undo and Redo', async () => {
  await record('05', 'toolbar', async (app) => {
    await app.guest.open();
    await signIn(app);
    await app.content.startOnFreshSpace();
    await app.toolbar.openToolPanel('gtPen');
    await app.toolbar.penColorOptions.nth(5).click({ force: true });
    await app.toolbar.closePanelByTappingOutside();
    await app.toolbar.penStroke({ x: 400, y: 380 }, { x: 650, y: 430 });
    await app.whiteboard.insertTextAndType(420, 520, 'Reference journey');
    await app.page.keyboard.press('Escape');
    await app.toolbar.chooseShape('gtDrawRect');
    await app.toolbar.drawStroke({ x: 750, y: 380 }, { x: 900, y: 480 }, 10);
    await app.toolbar.selectTool('gtUndo');
    await app.toolbar.selectTool('gtRedo');
  });
});

test('06 Whiteboard: a line of handwriting, zoom, pan, and it is still there after a reload', async () => {
  await record('06', 'whiteboard', async (app) => {
    await app.guest.open();
    await signIn(app);
    await app.content.startOnFreshSpace();
    await app.toolbar.penStroke({ x: 420, y: 400 }, { x: 700, y: 440 });
    const strokes = await app.toolbar.allPaths.count();
    await app.toolbar.openToolPanel('gtZoom');
    await app.toolbar.zoomInBtn.click({ force: true });
    await app.toolbar.zoomResetBtn.click({ force: true });
    await app.page.keyboard.press('Escape');
    await app.page.waitForTimeout(12000);
    await app.page.reload();
    await app.login.avatar.waitFor({ state: 'visible', timeout: 30000 });
    await app.toolbar.waitForBoardToSettle();
    expect(await app.toolbar.allPaths.count()).toBeGreaterThanOrEqual(strokes);
  });
});

test('07 Class Navigation: change class, chapter and topic, open a lesson plan', async () => {
  await record('07', 'class-navigation', async (app) => {
    await app.guest.open();
    await signIn(app);
    await app.nav.resetToClass('Class 9', 'A', 'Science');
    // The first chapter is "Foundation Checkpoint" (a Baseline Test, no lesson plan): use Chapter 2.
    await app.nav.goToChapterTopic(1, 1);
    await app.nav.showTopicsOf(1);
    await app.nav.topicItems.first().locator('[data-qa-id="playlist-tp-lesson-plan-btn"]').click({ force: true });
    await expect(app.nav.lessonPlan).toBeVisible({ timeout: 15000 });
    await app.header.calendar.click({ force: true });
  });
});

test('08 Playlist: open a resource from the strip and close it', async () => {
  await record('08', 'playlist', async (app) => {
    await app.guest.open();
    await signIn(app);
    await app.nav.applyClassMap('playersDefault');
    await app.playlist.ensureDrawerVisible();
    await app.player.openResourceCard(app.playlist.resourceCards.first());
    await app.page.waitForTimeout(4000);
    await app.player.closePlayer();
  });
});

test('09 Resources: create a resource, see it in the Playlist, remove it', async () => {
  await record('09', 'resources', async (app) => {
    await app.guest.open();
    await signIn(app);
    const title = `AutoTest-journey-${Date.now() % 100000}`;
    await app.addResource.createTextAsset(title);
    const card = app.playlist.resourceCards.filter({ hasText: title });
    await expect(card).toHaveCount(1, { timeout: 20000 });
    await app.page.keyboard.press('Escape');
    await app.playlist.removeOwnedAsset(card.first());
  });
});

test('11 Players: play and pause a video', async () => {
  await record('11', 'players', async (app) => {
    await app.guest.open();
    await signIn(app);
    await app.nav.applyClassMap('playersDefault');
    await app.player.openResourceCard(app.player.videoCards);
    await app.page.waitForTimeout(5000);
    await app.player.toggleVideoPlayback();
    await app.page.waitForTimeout(5000);
    await app.player.toggleVideoPlayback();
    await app.player.closePlayer();
  });
});

test('12 Minimap: open it, move the view from it, close it', async () => {
  await record('12', 'minimap', async (app) => {
    await app.guest.open();
    await signIn(app);
    await app.minimap.open(app.toolbar);
    await app.page.waitForTimeout(2000);
    await app.minimap.close();
  });
});

test('10 Plan Mode: create a quiz from the Question Bank, see it in Teach Mode, remove it', async () => {
  await record('10', 'plan-mode', async (app) => {
    await app.guest.open();
    await signIn(app, process.env.PLAN_PIN);
    await app.nav.resetToClass('Class 12', 'A', 'Physics');
    await app.nav.goToChapterTopic(0, 0);
    await app.compass.switchToPlanningMode();
    await app.page.waitForTimeout(5000);
    const title = autoTitle();
    const response = await createQuiz(app, title);
    expect(response.ok()).toBe(true);
    const card = await quizCardInTeach(app, title);
    await expect(card).toHaveCount(1, { timeout: 20000 });
    await removeQuiz(app, title);
  });
});

test('13 AI Notices: capture text, write the notice, choose classes, close without sending', async () => {
  await record('13', 'ai-notices', async (app) => {
    await app.guest.open();
    await signIn(app);
    await app.nav.applyClassMap('aiNotices');
    await app.aiNotices.openComposer(app, 'Science fair on Friday');
    await app.aiNotices.titleInput.fill('Science fair on Friday');
    await app.page.waitForTimeout(2000);
    await app.aiNotices.close();
  });
});

test('14 Learning Shorts: open the recorder and leave it', async () => {
  await record('14', 'learning-shorts', async (app) => {
    await app.guest.open();
    await signIn(app);
    await app.nav.applyClassMap('aiNotices');
    await app.learningShorts.openRecorder(app.magnet);
    await app.page.waitForTimeout(3000);
    await app.learningShorts.closeAll();
  });
});

test('15 AI Homework: generate questions and open the assignment form, without sending', async () => {
  await record('15', 'ai-homework', async (app) => {
    await app.guest.open();
    await signIn(app, pinForModule('aiHomework'));
    await app.nav.applyClassMap('aiHomework');
    await app.aiHomework.open(app.magnet);
    await app.aiHomework.generate();
    await app.aiHomework.goToAssign();
    await app.page.waitForTimeout(2000);
    await app.aiHomework.closeAll();
  });
});

test('16 Attendance: open the register and see the class roster', async () => {
  await record('16', 'attendance', async (app) => {
    await app.guest.open();
    await signIn(app, process.env.DATA_PIN);
    await app.nav.applyClassMap('attendance');
    await app.attendance.open(app.magnet);
    await app.page.waitForTimeout(3000);
    await app.page.keyboard.press('Escape');
  });
});

test('17 Profile: open the profile and its Account and Profile tabs', async () => {
  await record('17', 'profile', async (app) => {
    await app.guest.open();
    await signIn(app);
    await app.profile.open();
    await app.page.waitForTimeout(1500);
    await app.profile.openProfileTab();
    await app.page.waitForTimeout(1500);
    await app.profile.closeWindow();
  });
});
