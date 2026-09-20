# CEP v2 Playwright Automation

Playwright (JavaScript / CommonJS) end-to-end tests for Tata ClassEdge CEP v2's teach
webapp (`https://ce-qa-school.devstudi.com/teach/`), written page-object-model (POM) style
and organised by the CEP v2 stories, one module at a time.

Tests drive the real **Tata ClassEdge School** Windows desktop client (Electron), not a
browser, so the client must be installed and its profile pointed at the QA URL.

## Structure

```
CEPV2_Stories/              the stories the tests are written from (one file per module)
config/
  env.js                    BASE_URL and other env-derived settings
  moduleClassMap.js         confirmed class/chapter/topic (and account) for modules that need specific data
fixtures/
  electron-app.js           launches the desktop client; supplies `page`
  index.js                  the `test` every spec imports: adds `app` (signed out) and `user` (signed in)
pages/                      page objects: locators + actions, no assertions; pages/app.js exposes them all
tests/                      one folder per CEP v2 module, one spec file per story
  01-without-login/  02-new-user-flow/  03-login/  04-header/  05-toolbar/
  06-whiteboard/  07-class-navigation/  08-playlist/  09-resources/  11-players/
scripts/                    Playwright reporter helper
```

Specs import `test`/`expect` from `fixtures` (Module 01: `fixtures/electron-app`) and reach the app only through
page objects. Story/test IDs (`PRE-01-01`, `LOG-02-03`, ...) are in the test titles. Module 10 (Sidebar) and every
Plan Mode / Cross-Mode case are manual-only by design; cases blocked on data the suite doesn't have are `test.fixme`
with the reason in the spec.

## Setup

```
npm install
cp .env.example .env   # fill in real values
```

## Running

```
npm test                                   # everything in tests/
npx playwright test tests/05-toolbar       # one module
RUN_IN_BROWSER=1 npx playwright test --headed   # in a normal browser instead of the desktop client
npx playwright test --grep "@smoke"        # by tag
npm run report                             # open the last HTML report
npm run lint
```

Keep `--workers=1` (the config default): every test shares one live app session.

## Documentation

- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md): the full context: the approach, conventions, environment facts, current status,
  known bugs and skipped tests. Read this first if you are new (engineer or AI agent).
- [HOW_TO_RUN.md](HOW_TO_RUN.md): running everything or a single test case by its ID, reports, troubleshooting.
- [CLAUDE.md](CLAUDE.md): working agreements for AI agents.
- [CEPV2_Stories/](CEPV2_Stories/): the stories, the method (`PROCESS.md`) and the reviewer workbook (`CEPV2_TestCases.xlsx`).

The earlier approach (about 1,000 tests automated directly from test-case workbooks) lives in the older repo,
`tce-rajs/client-playwright-automation` (branch `main`). It is not part of this repo.
