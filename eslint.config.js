// ESLint flat config (ESLint 9+). Scoped to this project's actual style —
// CommonJS, no TypeScript, no framework — rather than a generic starter.
const js = require('@eslint/js');
const playwright = require('eslint-plugin-playwright');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'playwright-report/**',
      'playwright-report-archive/**',
      'test-results/**',
      'blob-report/**',
      'playwright/.cache/**',
      '.agents/**',
    ],
  },
  js.configs.recommended,
  {
    files: [
      '*.js',
      'tests/**/*.js',
      'pages/**/*.js',
      'utils/**/*.js',
      'fixtures/**/*.js',
      'config/**/*.js',
      'scripts/**/*.js',
      'client-automation/**/*.js',
    ],
    languageOptions: {
      sourceType: 'commonjs',
      // Both sets are needed in the same files: top-level code runs in
      // Node (require/process/__dirname), but page.evaluate(() => ...)
      // callbacks throughout tests/ and pages/ run in the browser (or the
      // Electron webview) and reference document/window/PointerEvent/etc.
      // ESLint can't tell the two apart by scope, so both globals sets are
      // allowed everywhere in these files.
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      // Playwright/Node style choices, not correctness bugs -- turned off
      // rather than left to warn-spam across 87 existing spec files.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Playwright's own custom-fixture signature is `async ({}, use) => {}`
      // when a fixture needs no other fixtures -- an empty destructuring
      // pattern is the idiomatic, required form here, not a mistake (see
      // fixtures/electron-app.js).
      'no-empty-pattern': 'off',
    },
  },
  {
    files: ['tests/**/*.spec.js', 'client-automation/tests/**/*.spec.js'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // This suite deliberately uses console.log to surface live findings
      // into CI/terminal output (see AUTOMATION_REVIEW.md) -- revisit once
      // that's migrated to test.info() annotations, not before.
      'no-console': 'off',
      // A handful of tests intentionally assert equality/negation via
      // expect(x).toBe(true/false) after a manual boolean check (adversarial
      // tests probing genuinely uncertain live behavior) -- don't fail the
      // whole suite over the existing backlog of these; tighten later.
      'playwright/prefer-web-first-assertions': 'warn',
      // Existing suite relies on conditional test.fail() to mark confirmed,
      // still-open app bugs as expected failures -- this is a deliberate
      // project convention (see AUTOMATION_REVIEW.md), not a mistake.
      'playwright/no-conditional-expect': 'off',
      'playwright/no-conditional-in-test': 'off',
    },
  },
  prettier,
];
