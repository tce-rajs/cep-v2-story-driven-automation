// Live-fetches the REAL grade/division/subject tree for whichever environment is currently active (via
// npm run set-env), by signing in and walking the app's own class picker -- then cross-checks every entry in
// config/moduleClassMap.js against it, flagging any whose grade/division/subject no longer exist.
//
// This does NOT verify chapter/topic-level data (which resource types a topic holds, known issues, etc.) --
// that needs a much longer scan (the project's own docs put a full one at ~3 hours) and depends on judgment
// this script can't make (e.g. "is this a good fixture for a Library-suggestions test?"). It also does NOT
// auto-edit moduleClassMap.js: that file carries hand-written `notes`/`knownIssues` from real findings (e.g.
// "the Attendance panel hangs indefinitely") that a scan has no way to know about -- this is a reference tool
// for deciding what to fix by hand, not a replacement for doing so.
//
// Usage:
//   npm run discover-classmap                 (uses .env's current VALID_PIN account)
//   npm run discover-classmap -- --account=2  (uses VALID_PIN_2 instead)

require('dotenv').config();
const { _electron: electron } = require('@playwright/test');
const { App } = require('../pages/app');
const { MODULE_CLASS_MAP } = require('../config/moduleClassMap');
const { BASE_URL } = require('../config/env');

const CLIENT_EXE_PATH =
  process.env.CLASSEDGE_CLIENT_EXE ||
  'C:\\Users\\v_crystalQA3\\AppData\\Local\\Programs\\tceclient\\Tata ClassEdge School.exe';

// The Electron window has no baseURL context, so a relative page.goto('./...') (used throughout the page
// objects this script reuses) throws "Cannot navigate to invalid URL" -- same fix fixtures/electron-app.js
// applies for the main suite.
function resolveUrl(url) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : new URL(url, BASE_URL).toString();
}

async function launchAndSignIn(pin) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    executablePath: CLIENT_EXE_PATH,
    args: ['--env=qa', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    env,
  });
  await app.firstWindow();
  const deadline = Date.now() + 30000;
  let teachWindow;
  while (Date.now() < deadline) {
    teachWindow = app.windows().find((w) => w.url().includes('/teach/'));
    if (teachWindow) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!teachWindow) throw new Error('Teach window not found within 30s -- is the current environment reachable?');
  await teachWindow.waitForTimeout(3000);

  const originalGoto = teachWindow.goto.bind(teachWindow);
  teachWindow.goto = (url, options) => originalGoto(resolveUrl(url), options);

  const webapp = new App(teachWindow);
  await webapp.signIn(pin);
  await webapp.nav.currentClassBtn.waitFor({ state: 'visible', timeout: 20000 });
  return { app, webapp };
}

/** Walks Grade -> Division -> Subject via the real class picker. Does not touch chapters/topics. */
async function discoverTree(webapp) {
  await webapp.nav.openClassPopup();
  await webapp.nav.allMyClassesTab.click({ timeout: 10000 });
  await webapp.nav.gradeButtons.first().waitFor({ state: 'visible', timeout: 10000 });

  const gradeCount = await webapp.nav.gradeButtons.count();
  const grades = (await webapp.nav.gradeButtons.allInnerTexts()).map((t) => t.trim());

  const reopenAt = async (gi) => {
    const alreadyOpen = await webapp.nav.allMyClassesTab.isVisible().catch(() => false);
    if (!alreadyOpen) await webapp.nav.openClassPopup();
    await webapp.nav.allMyClassesTab.click({ timeout: 10000 });
    await webapp.page.waitForTimeout(500);
    await webapp.nav.gradeButtons.nth(gi).click({ timeout: 10000 });
    await webapp.page.waitForTimeout(500);
  };

  const tree = {};
  for (let gi = 0; gi < gradeCount; gi++) {
    await reopenAt(gi);
    const divisionCount = await webapp.nav.divisionButtons.count();
    const divisions = (await webapp.nav.divisionButtons.allInnerTexts()).map((t) => t.trim());
    tree[grades[gi]] = {};
    for (let di = 0; di < divisionCount; di++) {
      await webapp.nav.divisionButtons.nth(di).click({ timeout: 10000 });
      await webapp.page.waitForTimeout(500);
      const subjects = (await webapp.nav.subjectButtons.allInnerTexts()).map((t) => t.trim());
      tree[grades[gi]][divisions[di]] = subjects;
      if (di < divisionCount - 1) await reopenAt(gi);
    }
  }
  return tree;
}

function checkEntry(entry, tree) {
  if (!entry.grade) return { status: 'SKIP', reason: 'no grade/division/subject to check (e.g. name-only lookup)' };
  const division = tree[entry.grade];
  if (!division) return { status: 'STALE', reason: `grade "${entry.grade}" not found` };
  const subjects = division[entry.division];
  if (!subjects) return { status: 'STALE', reason: `division "${entry.division}" not found under "${entry.grade}"` };
  const subjectMatch = subjects.some((s) =>
    s.toLowerCase().includes(String(entry.subject).toLowerCase().split(' or ')[0])
  );
  if (!subjectMatch)
    return { status: 'STALE', reason: `subject "${entry.subject}" not found under "${entry.grade} ${entry.division}"` };
  return { status: 'OK' };
}

async function main() {
  const account = process.argv.includes('--account=2') ? 'VALID_PIN_2' : 'VALID_PIN';
  const pin = process.env[account];
  if (!pin) {
    console.error(`discover-classmap: ${account} is not set in .env for the current environment.`);
    process.exit(1);
  }

  console.log(`Signing in with ${account} on ${process.env.BASE_URL} ...`);
  const { app, webapp } = await launchAndSignIn(pin);
  try {
    console.log('Walking the real grade/division/subject tree ...');
    const tree = await discoverTree(webapp);

    console.log('\n=== LIVE TREE ===');
    for (const [grade, divisions] of Object.entries(tree)) {
      for (const [division, subjects] of Object.entries(divisions)) {
        console.log(`  ${grade} ${division}: ${subjects.join(', ')}`);
      }
    }

    console.log('\n=== moduleClassMap.js entries confirmed against this account ===');
    let staleCount = 0;
    for (const [key, entry] of Object.entries(MODULE_CLASS_MAP)) {
      if (entry.account && entry.account !== account) continue; // this entry belongs to the other account
      const result = checkEntry(entry, tree);
      if (result.status === 'STALE') staleCount++;
      const label = result.status === 'OK' ? 'OK   ' : result.status === 'STALE' ? 'STALE' : 'SKIP ';
      console.log(`  [${label}] ${key}${result.reason ? ` -- ${result.reason}` : ''}`);
    }

    console.log(
      `\n${staleCount} entr${staleCount === 1 ? 'y' : 'ies'} flagged stale. This only checked grade/division/` +
        `subject -- a STALE result means the combo definitely doesn't exist; an OK result only means the ` +
        `grade/division/subject exists, not that its chapter/topic index or resource data still matches.`
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(`\ndiscover-classmap failed: ${err.message}`);
  process.exit(1);
});
