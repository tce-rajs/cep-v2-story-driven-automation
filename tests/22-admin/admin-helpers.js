// Shared set-up for the Admin specs (tests/22-admin, tests/00-flows/flow-23/24): a signed-in Admin page kept for the
// whole worker (a reload signs the admin out, so every test starts from the Dashboard by clicking), a Teach Mode page
// for checking what a teacher can do after an Admin change, and a small state file that carries the AutoQA teacher a
// spec created from test to test (a failed test restarts the worker, which would lose plain variables).
//
// The Admin panel is a web page; Teach Mode is opened in the same browser engine here because the desktop client's
// one profile is in use by the client runs (the sign-in screens are the same web app).
const fs = require('fs');
const os = require('os');
const path = require('path');
const base = require('@playwright/test');
const { AdminPage } = require('../../pages/admin.page');
const { LoginPage } = require('../../pages/login.page');
const { NewUserPage, DEFAULT_PASSWORD } = require('../../pages/new-user.page');
const { BASE_URL } = require('../../config/env');

const test = base.test.extend({
  // One signed-in Admin page per worker.
  adminWorker: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
      const page = await context.newPage();
      const admin = new AdminPage(page);
      await admin.signIn();
      await use(admin);
      await context.close();
    },
    { scope: 'worker' },
  ],
  // Per test: back on the Dashboard, signed in (again if the session was lost).
  admin: async ({ adminWorker }, use) => {
    await adminWorker.ensureSignedIn();
    await use(adminWorker);
  },
});

// Browser options are not set here with test.use(): a helper shared by several spec files that calls test.use()
// at load time makes Playwright reject the run ("inconsistent test.use() options"). Headless is the default.

// ---------------------------------------------------------------- AutoQA teacher state

const statePath = (name) => path.join(os.tmpdir(), `cepv2-admin-${name}.json`);

const state = {
  reset(name) {
    fs.rmSync(statePath(name), { force: true });
  },
  get(name) {
    try {
      return JSON.parse(fs.readFileSync(statePath(name), 'utf8'));
    } catch {
      return null;
    }
  },
  set(name, values) {
    const next = { ...(state.get(name) || {}), ...values };
    fs.writeFileSync(statePath(name), JSON.stringify(next, null, 2));
    return next;
  },
  /** The teacher created earlier in this run, or a DATA MISSING error. */
  teacher(name) {
    const t = state.get(name);
    if (!t || !t.username)
      throw new Error(
        'DATA MISSING ON THIS SERVER: no AutoQA teacher was created in this run (the create test failed or was not run)'
      );
    return t;
  },
};

/** A new AutoQA teacher's details (letters-only names, unique per run). */
function newTeacherDetails() {
  const last = AdminPage.stamp();
  const digits = String(Date.now()).slice(-4);
  return {
    first: 'AutoQA',
    last,
    fullName: `AutoQA ${last}`,
    email: `autoqa.${last.toLowerCase()}@example.com`,
    password1: `Autoqa@${digits}1`,
    password2: `Autoqa@${digits}2`,
    // PINs are unique across the school: a fresh 5-digit PIN per run (not starting with 0).
    pin1: String(10000 + Math.floor(Math.random() * 89999)),
    pin2: String(10000 + Math.floor(Math.random() * 89999)),
  };
}

const daysFromNow = (days) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "30-9-2026" / "31-10-2026" (export) → "2026-09-30". */
const exportDateToIso = (s) => {
  const m = String(s).match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};

// ---------------------------------------------------------------- Teach Mode (teacher side)

async function openTeach(browser) {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  return { context, page, login: new LoginPage(page), newUser: new NewUserPage(page) };
}

/**
 * After a sign-in attempt: which screen the teacher reached.
 * 'set-password' | 'set-pin' | 'signed-in' | 'error' (with the message) | 'nothing'.
 */
async function signInOutcome(t, timeout = 25000) {
  const { page, login, newUser } = t;
  const checks = [
    ['set-pin', newUser.pinInputs.first()],
    ['set-password', newUser.setPasswordHeading],
    ['signed-in', login.avatar],
    ['signed-in', newUser.welcomeMessage],
    ['signed-in', newUser.chooseClassBtn.first()],
    ['error', login.passwordErrorMessage.filter({ hasText: /\S/ })],
    ['error', login.pinErrorMessage.filter({ hasText: /\S/ })],
  ];
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    for (const [name, loc] of checks) {
      if (await loc.isVisible().catch(() => false)) {
        const message = name === 'error' ? (await loc.innerText().catch(() => '')).trim() : '';
        return { screen: name, message };
      }
    }
    await page.waitForTimeout(500);
  }
  return { screen: 'nothing', message: '' };
}

const teachSchool = () => process.env.SCHOOL_SEARCH_TERM;

async function passwordSignIn(t, username, password) {
  await t.login.signInWithPassword({ schoolSearchTerm: teachSchool(), username, password });
  return signInOutcome(t);
}

async function pinSignIn(t, pin) {
  await t.page.goto('./');
  await t.page.waitForTimeout(2000);
  await t.login.signOutLeftoverFirstTimeSession();
  await t.login.toggleButton.click({ timeout: 30000 });
  await t.login.enterPin(pin);
  return signInOutcome(t);
}

/** From the default password: set `password`, then sign in with it and set `pin`. Returns the final outcome. */
async function firstSignIn(t, username, password, pin) {
  let o = await passwordSignIn(t, username, DEFAULT_PASSWORD);
  if (o.screen !== 'set-password') return { step: 'default password', ...o };
  await t.newUser.setNewPassword(password);
  await t.page.waitForTimeout(3000);
  o = await passwordSignIn(t, username, password);
  if (o.screen === 'set-pin') {
    await t.newUser.enterPin(pin);
    await t.newUser.confirmPin(pin);
    await t.page.waitForTimeout(3000);
    o = await signInOutcome(t, 20000);
  }
  return { step: 'new password', ...o };
}

// ---------------------------------------------------------------- Sync (watched to the end)

const SYNC_MAX_MS = 12 * 60000;
const isDone = (status) => /^completed$/i.test(status);
const isFailed = (status) => /fail|error/i.test(status);

/**
 * Press Sync once per `key` and run, then open View Sync Status every 15 s until no part is still running (at most
 * 12 minutes). Saved to the state file: Last Sync On before/after, every snapshot, and how long each part ran.
 */
async function runSync(admin, key) {
  const done = state.get(key);
  if (done && done.finished) return done;
  const lastBefore = await admin.lastSyncOn();
  const startedAt = Date.now();
  await admin.schoolMenu('Sync');
  await admin.page.waitForTimeout(2000);
  const snapshots = [];
  const busySince = {};
  const busyMs = {};
  while (Date.now() - startedAt < SYNC_MAX_MS) {
    const rows = await admin.syncStatus();
    const at = Date.now();
    snapshots.push({ seconds: Math.round((at - startedAt) / 1000), rows });
    for (const [part, status] of rows) {
      if (!isDone(status) && !isFailed(status)) busySince[part] = busySince[part] || at;
      if (busySince[part]) busyMs[part] = at - busySince[part];
    }
    await admin.closeAllModals();
    if (rows.length && rows.every(([, s]) => isDone(s) || isFailed(s)) && snapshots.length > 1) break;
    await admin.page.waitForTimeout(15000);
  }
  const lastAfter = await admin.lastSyncOn();
  const final = snapshots[snapshots.length - 1]?.rows || [];
  return state.set(key, {
    finished: true,
    startedAt,
    lastBefore,
    lastAfter,
    snapshots,
    busyMs,
    final,
    minutes: Math.round((Date.now() - startedAt) / 6000) / 10,
  });
}

module.exports = {
  test,
  runSync,
  isDone,
  isFailed,
  expect: base.expect,
  AdminPage,
  state,
  newTeacherDetails,
  daysFromNow,
  isoDate,
  exportDateToIso,
  openTeach,
  signInOutcome,
  passwordSignIn,
  pinSignIn,
  firstSignIn,
  DEFAULT_PASSWORD,
};
