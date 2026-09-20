# CEP v2 automation — project handoff

Read this first, then [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md), which holds the full history, conventions, current status,
known bugs and the list of skipped tests. [HOW_TO_RUN.md](HOW_TO_RUN.md) explains running tests and reports.

## What this project is

Playwright (JavaScript, CommonJS) end-to-end tests for Tata ClassEdge **CEP v2**'s teach webapp, written from the
client-facing stories in `CEPV2_Stories/` (one file per module; `PROCESS.md` there is the method; `INDEX.md` the map).
Tests drive the real **Tata ClassEdge School desktop client** (Electron) against the QA server
(`https://ce-qa-school.devstudi.com/teach/`). `RUN_IN_BROWSER=1` runs the same specs in a normal browser instead.

This repo is the story-driven suite (stories, then test cases, then automation). The earlier approach, about 1,000 tests
automated directly from the test-case workbooks, lives in the old repo (`tce-rajs/client-playwright-automation`, branch
`main`) and is not part of this repo.

## Where things stand (2026-09-20)

**Every automatable module is written and has been verified live**, including Module 02 (against a fresh user) and a
complete end-to-end run of all 249 tests. Result of that run: 209 passed, 18 known product bugs (recorded as expected
failures, counted green), 20 skipped or not run, 2 failed. The two failures were then fixed or turned into a documented
skip, and two skipped tests were enabled, so the expected state is **212 passed, 18 known bugs, 19 skipped, 0 failed**.
That was confirmed test by test, not in one further full run: do a full run to confirm.

Module 10 (Sidebar) and every Plan Mode / Cross-Mode case are **manual-only by design** (`PROCESS.md`, "Automation
scope"). The 19 skipped tests need data, devices or product changes the suite does not have; each has its reason in the
spec, and [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) section 9 lists them with what would unblock each.

## How the owner wants to work (carry these over)

- **One module at a time.** Verify a module live, then **stop and tell the owner it's done** with the findings. Do not
  roll on to the next module unprompted.
- **Module 02 last.** It permanently changes the fresh test user (see below) and can run once per fresh user.
- **One agent, working directly.** No parallel or background sub-agents unless the owner explicitly asks.
- **Nothing is silently skipped.** Every test ends as pass, fail with a documented reason, or `fixme` with a reason.
- **Ask before deleting** files, and **commit/push only when asked**.
- Verify live against the real app rather than assuming. The stories can be wrong about the app (see below).

## Setup on a new machine

1. Node 20+, and the Tata ClassEdge School desktop client installed.
2. `git clone <this repo>`, then `npm ci`.
3. `cp .env.example .env` and fill it in (`.env` is gitignored): `VALID_PIN`, `VALID_PIN_2`, `INVALID_PIN`,
   `SCHOOL_NAME`, `SCHOOL_SEARCH_TERM`, `USERNAME`, `PASSWORD`, and for Module 02 `NEW_USER_USERNAME`,
   `NEW_USER_NEW_PASSWORD`, `NEW_USER_PIN`.
4. `C:\Users\Public\tce_settings.json` must have `"path": "https://ce-qa-school.devstudi.com/teach/"`. If the client
   shows "No web URLs available" / "Unable to connect ClassEdge server", this is why.
5. If the client is not at the default install path, set `CLASSEDGE_CLIENT_EXE` in `.env`.

## Running

```
npx playwright test tests/03-login                       # one module (client opens and is driven; don't click in it)
npx playwright test tests/03-login --grep-invert @long   # skip the slow soak/idle tests first
RUN_IN_BROWSER=1 npx playwright test tests/03-login --headed   # normal browser instead of the client
npm run report                                           # last HTML report
npm run lint
```

`workers` is 1 on purpose: every test shares one live account/session. Tags: `@smoke @functional @negative @edge
@regression @concurrency @interruption @performance @long @bug`. `@long` tests wait minutes; shorten them with
`SESSION_SOAK_MINUTES` (16), `SESSION_IDLE_MINUTES` (6), `HEADER_IDLE_MINUTES` (5), `NAV_RESTORE_WAIT_MINUTES` (3).

## Next steps

1. A full end-to-end run to confirm the status above (about 2 hours; Module 02 needs a reset user, and NEW-03 needs a user
   who has never chosen a class).
2. Work down the skipped list as data or devices become available.
3. Keep the stories, the reviewer workbook (`CEPV2_Stories/CEPV2_TestCases.xlsx`) and the status here in step when cases change.

## How to handle a failure

For each failing test decide which of three it is, and do the matching thing:

1. **Locator / flow is wrong (test bug):** fix it in the **page object** (`pages/`), not in each spec. Most page
   objects reuse locators confirmed live in the previous suite; the ones that are guesses are listed below.
2. **Real app bug:** keep the test asserting the _correct_ behaviour and mark it
   `test.fail(true, '<what is wrong>')` with a comment (the project convention; see PRE-03-01), so it stays visible
   and does not go green by accident.
3. **The story is wrong about the app:** assert the intent, add a `note` annotation, and **tell the owner** — it's
   their call whether the story or the app should change. Module 01 found two: PRE-03-01 (story says the User menu is
   visible signed-out; it is not) and PRE-03-03 (story says "Open Widgets"; the panel lists 8 basic widgets instead).

## Areas that were guesses and are now settled

The areas listed here in earlier versions (Pin, symbol picker, quiz score, Module 02 screens, gallery image, upload
checks) were checked live. Outcomes are in the specs' comments and in PROJECT_OVERVIEW.md: there is no per-card pin
(PL-06-03 skips); the Module 02 PIN screen is a two-step five-box flow (see `pages/new-user.page.js`); the quiz score is
missing after "Quiz Complete!" (PLR-02-01 records it as a bug).

## Facts about the app worth knowing (confirmed live in the previous suite)

- Signed out, the app opens on `/teach/whiteboard` in "Guest Mode" (v0.0.223 when last seen). PIN login: avatar
  `toolbar-user-avatar`. Sign out has no confirmation dialog.
- **Magnet's entries are gated per class/subject.** Class 12A Physics lists Notice, Learning Shorts, Homework and
  Attendance; Class 11A Accountancy has no Attendance. `config/moduleClassMap.js` records the class/chapter/topic (and
  which QA account) that holds the data each module needs — use it (`test.use({ classMap: '...' })`) rather than
  hard-coding classes.
- **The Add Resource "+" picker intermittently renders with `pointer-events: none`** and is unclickable; only a reload
  clears it. `AddResourcePage.openAction()` / `openPickerReliably()` already handle this.
- **Whiteboard "Save to Playlist" does not work**; use Add Resource → Create (`createTextAsset` / `createImageAsset`)
  to get an asset the test owns, and `PlaylistPage.removeOwnedAsset()` to remove it again.
- The Playlist strip can be collapsed on some accounts (`ensureDrawerVisible()` re-expands it). The quiz needs a camera.
  A fixed header/logo covers roughly the top-left 120×120px of the canvas — don't draw there.
- Each topic has its own whiteboard, and its content persists on the server across runs, so tests compare snapshots and
  counts _before vs after_, never absolute numbers.
- Planning ("Classroom Mode") is a separate app at `/plan/` with no `data-qa-id`s.

## Data these tests change (shared QA account — be careful)

Tests create then remove their own Playlist assets and restore theme, dock side and background. They **do** draw on real
topic whiteboards (persisted), and TB-05-06 uses **Clear Whiteboard** on the current topic. WB-06 tests add content to
topics 1 and 2 of Class 12A Physics. Module 02 is one-shot per user: it changes the fresh test user (default password `classedge`
→ new password → PIN → first class). Re-running needs an admin to reset that user or a fresh user.

## Code map

```
CEPV2_Stories/          stories + PROCESS.md (source of truth for what to test)
config/env.js           BASE_URL      config/moduleClassMap.js   class/chapter/topic/account per module
fixtures/electron-app.js   launches the client, supplies `page`
fixtures/index.js          the `test` specs import (Modules 03+): fixtures `app` (signed out), `user` (signed in),
                           option `classMap` (sign in with that key's account and land on its class/topic)
pages/                  page objects; pages/app.js exposes them all (login, header, toolbar, whiteboard, userMenu,
                        magnet, nav, playlist, addResource, player, compass, content, newUser, guest)
tests/NN-module/        one spec file per story; test titles carry the story IDs (e.g. `TB-05-03`)
```

Specs reach the app only through page objects; page objects contain locators and actions, not assertions. Module 01
specs import `fixtures/electron-app` directly; later modules import `fixtures`. Formatting is Prettier and lint is
ESLint (0 errors expected; the warnings are `force`/`waitForTimeout` style, as in the old suite). A commit hook runs
lint-staged.
