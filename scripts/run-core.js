// Runs the CORE suite: the positive and main negative cases of every module (tags @smoke, @functional, @negative,
// @regression), leaving out the deep cases (@long, @edge, @concurrency, @interruption, @performance).
// Teach modules run in the desktop client; Plan Mode, Checkpoints and the principal's reports run in the browser.
// The two streams run at the same time, each with its own output folder.
//
//   npm run core                 both streams
//   npm run core -- client       only the desktop-client stream
//   npm run core -- browser      only the browser stream
//   npm run core -- client tests/05-toolbar     one module (any Playwright arguments after the stream)
const { spawn } = require('child_process');
const path = require('path');

const CORE = '@smoke|@functional|@negative|@regression';
const DEEP = '@long|@edge|@concurrency|@interruption|@performance';
const BROWSER_FOLDERS = ['tests/10-plan-mode', 'tests/21-checkpoints', 'tests/22-admin'];
const CLIENT_FOLDERS = [
  'tests/01-without-login',
  'tests/03-login',
  'tests/04-header',
  'tests/05-toolbar',
  'tests/06-whiteboard',
  'tests/07-class-navigation',
  'tests/08-playlist',
  'tests/09-resources',
  'tests/11-players',
  'tests/12-minimap',
  'tests/13-ai-notices',
  'tests/14-learning-shorts',
  'tests/15-ai-homework',
  'tests/16-attendance',
  'tests/17-profile',
  'tests/20-cross-cutting',
];

const [stream = 'all', ...extra] = process.argv.slice(2);
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const root = path.join(__dirname, '..');
const fs = require('fs');

const run = (name, folders, env) =>
  new Promise((resolve) => {
    const out = path.join('test-results/core', stamp, name);
    const args = [
      'playwright',
      'test',
      ...(extra.length ? extra : folders.filter((f) => fs.existsSync(path.join(root, f)))),
      '--grep',
      `"${CORE}"`,
      '--grep-invert',
      `"${DEEP}"`,
      '--reporter=list,json',
      `--output=${out}`,
    ];
    console.log(`[${name}] npx ${args.join(' ')}`);
    const child = spawn('npx', args, {
      cwd: root,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, ...env, PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(out, '..', `${name}.json`) },
    });
    child.on('exit', (code) => resolve({ name, code }));
  });

(async () => {
  const jobs = [];
  if (stream === 'all' || stream === 'client') jobs.push(run('client', CLIENT_FOLDERS, {}));
  if (stream === 'all' || stream === 'browser') jobs.push(run('browser', BROWSER_FOLDERS, { RUN_IN_BROWSER: '1' }));
  const results = await Promise.all(jobs);
  console.log(`Core run finished: ${results.map((r) => `${r.name} exit ${r.code}`).join(', ')}`);
  console.log(`Results: test-results/core/${stamp}/  (client.json, browser.json)`);
  process.exit(results.some((r) => r.code !== 0) ? 1 : 0);
})();
