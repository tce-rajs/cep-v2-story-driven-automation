const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const FLOW = (...names) => names.map((name) => path.join('tests', '00-flows', name));

const TEACH_MODULES = [
  '01-without-login',
  '03-login',
  '04-header',
  '05-toolbar',
  '06-whiteboard',
  '07-class-navigation',
  '08-playlist',
  '09-resources',
  '11-players',
  '12-minimap',
  '13-ai-notices',
  '14-learning-shorts',
  '15-ai-homework',
  '16-attendance',
  '17-profile',
  '18-resilience',
  '19-desktop-client',
  '20-cross-cutting',
].map((name) => path.join('tests', name));

const FRESH_USER_MODULE = [path.join('tests', '02-new-user-flow')];
const TEACH_JOURNEYS = FLOW(
  'flow-01-guest-to-own-board.spec.js',
  'flow-03-shared-panel.spec.js',
  'flow-04-getting-to-the-lesson.spec.js',
  'flow-05-teaching-on-the-whiteboard.spec.js',
  'flow-06-widgets-and-magnet.spec.js',
  'flow-07-playlist-resources.spec.js',
  'flow-08-quiz-in-class.spec.js',
  'flow-09-own-resources.spec.js',
  'flow-11-share-a-resource.spec.js',
  'flow-16-notices.spec.js',
  'flow-17-19-every-class.spec.js',
  'flow-17-ai-homework.spec.js',
  'flow-18-learning-shorts.spec.js',
  'flow-19-attendance.spec.js',
  'flow-20-profile-changes.spec.js',
  'flow-21-header-modes-compass.spec.js',
  'flow-22-minimap.spec.js',
  'flow-25-any-order.spec.js',
  'flow-26-failures-mid-flow.spec.js',
  'flow-27-desktop-client.spec.js'
);

const PLAN_MODULES = [path.join('tests', '10-plan-mode'), path.join('tests', '21-checkpoints')];
const PLAN_JOURNEYS = FLOW('flow-12-15-plan.spec.js');
const DROPIT_PHONE_JOURNEYS = FLOW('flow-10-dropit-from-phone.spec.js');
const REFERENCE_RECORDINGS = [path.join('tests', '99-journeys')];
const BROWSER_ONLY_HEAVY_BOARDS = [
  path.join('tests', '06-whiteboard', 'wb-13-heavy-boards.spec.js'),
  path.join('tests', '18-resilience', 'rsl-06-heavy-boards.spec.js'),
];
const ADMIN_MODULES = [path.join('tests', '22-admin')];
const ADMIN_JOURNEYS = FLOW(
  'flow-02-new-teacher-first-day.spec.js',
  'flow-23-admin-teacher.spec.js',
  'flow-24-admin-settings.spec.js',
  'flow-24-admin-vs-classroom.spec.js'
);
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const RECORD_VIDEO_DIR = path.join(ROOT, 'evidence', 'tmp', `suite-${runStamp}`);

const listOnly = process.argv.includes('--list');
const suiteArg = process.argv.find((arg) => arg.startsWith('--suite='));
const suiteIndex = process.argv.indexOf('--suite');
const suiteName = suiteArg ? suiteArg.slice('--suite='.length) : suiteIndex >= 0 ? process.argv[suiteIndex + 1] : null;

const suites = {
  full: [
    { name: 'Teach modules', paths: TEACH_MODULES },
    {
      name: 'Fresh teacher first-login module',
      paths: FRESH_USER_MODULE,
      provisionNewUser: true,
      extra: ['--workers=1'],
    },
    { name: 'Teach user journeys', paths: TEACH_JOURNEYS },
    { name: 'Plan Mode and Checkpoints modules', paths: PLAN_MODULES, client: true },
    {
      name: 'Plan Mode user journeys',
      paths: PLAN_JOURNEYS,
      client: true,
      extra: ['--grep-invert', 'FLOW-15 Reports'],
    },
    { name: 'DropIt phone journeys (browser)', paths: DROPIT_PHONE_JOURNEYS, browser: true },
    {
      name: 'Reference recordings',
      paths: REFERENCE_RECORDINGS,
      recording: true,
      extra: ['--workers=1'],
    },
    {
      name: 'High-load whiteboard tests (browser)',
      paths: BROWSER_ONLY_HEAVY_BOARDS,
      browser: true,
      extra: ['--grep', '"WB-13-|RSL-06-0[3-7]"'],
    },
  ],
  teach: [
    { name: 'Teach modules', paths: TEACH_MODULES },
    {
      name: 'Fresh teacher first-login module',
      paths: FRESH_USER_MODULE,
      provisionNewUser: true,
      extra: ['--workers=1'],
    },
  ],
  journeys: [
    { name: 'Teach user journeys', paths: TEACH_JOURNEYS },
    {
      name: 'Plan Mode user journeys',
      paths: PLAN_JOURNEYS,
      client: true,
      extra: ['--grep-invert', 'FLOW-15 Reports'],
    },
    { name: 'DropIt phone journeys (browser)', paths: DROPIT_PHONE_JOURNEYS, browser: true },
    { name: 'Reference recordings', paths: REFERENCE_RECORDINGS, recording: true, extra: ['--workers=1'] },
  ],
  plan: [
    { name: 'Plan Mode and Checkpoints modules', paths: PLAN_MODULES, client: true },
    {
      name: 'Plan Mode user journeys',
      paths: PLAN_JOURNEYS,
      client: true,
      extra: ['--grep-invert', 'FLOW-15 Reports'],
    },
    {
      name: 'High-load whiteboard tests (browser)',
      paths: BROWSER_ONLY_HEAVY_BOARDS,
      browser: true,
      extra: ['--grep', '"WB-13-|RSL-06-0[3-7]"'],
    },
  ],
  admin: [
    { name: 'Admin modules', paths: ADMIN_MODULES, browser: true },
    { name: 'Admin user journeys', paths: ADMIN_JOURNEYS, browser: true, provisionNewUser: true },
  ],
  'full-admin': [
    { name: 'Teach modules', paths: TEACH_MODULES },
    {
      name: 'Fresh teacher first-login module',
      paths: FRESH_USER_MODULE,
      provisionNewUser: true,
      extra: ['--workers=1'],
    },
    { name: 'Teach user journeys', paths: TEACH_JOURNEYS },
    { name: 'Plan Mode and Checkpoints modules', paths: PLAN_MODULES, client: true },
    {
      name: 'Plan Mode user journeys',
      paths: PLAN_JOURNEYS,
      client: true,
      extra: ['--grep-invert', 'FLOW-15 Reports'],
    },
    { name: 'DropIt phone journeys (browser)', paths: DROPIT_PHONE_JOURNEYS, browser: true },
    { name: 'Reference recordings', paths: REFERENCE_RECORDINGS, recording: true, extra: ['--workers=1'] },
    { name: 'Admin modules', paths: ADMIN_MODULES, browser: true },
    {
      name: 'Admin user journeys',
      paths: ADMIN_JOURNEYS,
      browser: true,
      provisionNewUser: true,
      extra: ['--grep', '"FLOW-02|FLOW-23|FLOW-24"'],
    },
    { name: 'Plan Mode report journey', paths: PLAN_JOURNEYS, client: true, extra: ['--grep', 'FLOW-15'] },
  ],
};

function chooseSuite() {
  if (suiteName) return Promise.resolve(suiteName);
  if (!process.stdin.isTTY) {
    return Promise.resolve(null);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nChoose the CEP v2 suite to run:');
  console.log('  1. Full suite (Teach, then Plan/Checkpoints; Admin excluded)');
  console.log('  2. Teach modules only');
  console.log('  3. User journeys only (Teach, then Plan)');
  console.log('  4. Plan Mode and Checkpoints only');
  console.log('  5. Admin only');
  console.log('  6. Full suite including Admin');

  return new Promise((resolve) => {
    rl.question('Enter 1-6 [1]: ', (answer) => {
      rl.close();
      const selected = answer.trim() || '1';
      resolve(
        {
          1: 'full',
          2: 'teach',
          3: 'journeys',
          4: 'plan',
          5: 'admin',
          6: 'full-admin',
        }[selected] || ''
      );
    });
  });
}

function provisionNewUser() {
  const credentialsPath = path.join(os.tmpdir(), `cep-new-user-${process.pid}-${Date.now()}.json`);
  const scriptPath = path.join(ROOT, 'scripts', 'provision-new-user.js');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, credentialsPath], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    child.on('error', (error) => {
      fs.rmSync(credentialsPath, { force: true });
      reject(new Error(`Could not start new-user provisioning: ${error.message}`));
    });
    child.on('exit', (code) => {
      if (code !== 0) {
        fs.rmSync(credentialsPath, { force: true });
        reject(new Error(`New-user provisioning failed with exit code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(fs.readFileSync(credentialsPath, 'utf8')));
      } catch (error) {
        reject(new Error(`New-user provisioning did not return credentials: ${error.message}`));
      } finally {
        fs.rmSync(credentialsPath, { force: true });
      }
    });
  });
}

async function runGroup(group) {
  const env = { ...process.env };
  if (group.browser) env.RUN_IN_BROWSER = '1';
  else delete env.RUN_IN_BROWSER;
  if (group.client) env.RUN_IN_CLIENT = '1';
  else delete env.RUN_IN_CLIENT;
  if (group.recording) {
    if (!listOnly) fs.mkdirSync(RECORD_VIDEO_DIR, { recursive: true });
    env.JOURNEYS = '1';
    env.RECORD_VIDEO_DIR = RECORD_VIDEO_DIR;
  } else {
    delete env.JOURNEYS;
    delete env.RECORD_VIDEO_DIR;
  }

  if (group.provisionNewUser && !listOnly) {
    try {
      Object.assign(env, await provisionNewUser());
      console.log('Provisioned a fresh AutoQA teacher for this first-login workflow block.');
    } catch (error) {
      console.error(`Could not prepare ${group.name}: ${error.message}`);
      return { name: group.name, code: 1 };
    }
  }

  const paths = group.paths.map((testPath) => testPath.replace(/\\/g, '/'));
  const args = ['playwright', 'test', ...paths, ...(group.extra || []), ...(listOnly ? ['--list'] : [])];
  const mode = group.client ? 'desktop client' : group.browser ? 'browser' : 'desktop client';
  console.log(`\n=== ${group.name} (${mode}) ===`);

  return new Promise((resolve) => {
    const child = spawn('npx', args, {
      cwd: ROOT,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      env,
    });

    child.on('error', (error) => {
      console.error(`Could not start ${group.name}: ${error.message}`);
      resolve({ name: group.name, code: 1 });
    });
    child.on('exit', (code) => resolve({ name: group.name, code: code === null ? 1 : code }));
  });
}

(async () => {
  const selected = await chooseSuite();
  if (!selected) {
    console.error('Choose a suite with --suite=<full|teach|journeys|plan|admin|full-admin>.');
    process.exitCode = 2;
    return;
  }

  if (!suites[selected]) {
    console.error(`Unknown suite "${selected}". Choose one of: ${Object.keys(suites).join(', ')}.`);
    process.exitCode = 2;
    return;
  }

  const results = [];
  for (const group of suites[selected]) results.push(await runGroup(group));

  console.log('\nSuite results:');
  for (const result of results) console.log(`  ${result.code === 0 ? 'PASS' : 'FAIL'}  ${result.name}`);
  if (results.some((result) => result.code !== 0)) process.exitCode = 1;
})();
