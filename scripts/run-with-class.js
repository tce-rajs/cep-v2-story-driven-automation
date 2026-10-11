// Runner script: execute tests for a module using a dynamic class override and custom credentials (PIN)
// Usage:
//   node scripts/run-with-class.js --module=aiHomework --grade="Class 10" --division="B" --subject="Mathematics" --pin=74125
//   node scripts/run-with-class.js --module=attendance --class="Class 9A Science" --headed

require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const params = {};
args.forEach((arg) => {
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=');
    params[k] = v || true;
  }
});

const moduleKey = params.module || 'default';
const pin = params.pin || process.env[params.account] || process.env.VALID_PIN;
const grade =
  params.grade || (params.class ? params.class.split(' ')[0] + ' ' + params.class.split(' ')[1] : undefined);
const division = params.division || (params.class ? params.class.split(' ')[1]?.slice(-1) : undefined);
const subject = params.subject || (params.class ? params.class.split('|')[1]?.trim() : undefined);
const isHeaded = params.headed || false;

// Spec map for quick module resolution
const MODULE_SPEC_MAP = {
  aiHomework: 'tests/15-ai-homework/aih-01-open.spec.js',
  aiNotices: 'tests/13-ai-notices/ain-01-capture.spec.js',
  learningShorts: 'tests/14-learning-shorts/ls-01-recorder.spec.js',
  attendance: 'tests/16-attendance/att-01-open.spec.js',
  checkpoints: 'tests/21-checkpoints/chk-01-04-checkpoint-flow.spec.js',
  planMode: 'tests/10-plan-mode/pln-01-open.spec.js',
  scratchBoard: 'tests/06-whiteboard/wb-01-canvas.spec.js',
  playersDefault: 'tests/11-players/plr-15-every-player.spec.js',
  playlistGeneral: 'tests/08-playlist/pl-01-open.spec.js',
  default: 'tests/07-class-navigation/nav-class-manager.spec.js',
};

const specFile = MODULE_SPEC_MAP[moduleKey] || `tests/**/${moduleKey}*.spec.js`;

console.log('====================================================');
console.log(' CEP v2 Test Runner — Custom Class & Credentials');
console.log('====================================================');
console.log(`Module Key  : ${moduleKey}`);
console.log(`Spec File   : ${specFile}`);
console.log(`Teacher PIN : ${pin ? '****** (' + pin + ')' : 'Default VALID_PIN'}`);
if (grade || subject) {
  console.log(`Class Target: ${grade || ''} ${division || ''} | ${subject || ''}`);
} else {
  console.log(`Class Target: Baseline Mapped Class`);
}
console.log('====================================================\n');

// Configure environment
const env = { ...process.env };
if (pin) env.OVERRIDE_PIN = pin;
if (grade || division || subject) {
  env.CLASS_OVERRIDE = JSON.stringify({
    grade: grade || 'Class 9',
    division: division || 'A',
    subject: subject || 'Science',
    pin,
  });
}

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const playwrightArgs = ['playwright', 'test', specFile];
if (isHeaded) playwrightArgs.push('--headed');

const result = spawnSync(npxCmd, playwrightArgs, {
  env,
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..'),
});

process.exit(result.status ?? 0);
