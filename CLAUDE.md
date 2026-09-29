# CEP v2 automation — project handoff

Read this first, then [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md), which holds the full history, conventions, current status,
known bugs and the list of skipped tests. [HOW_TO_RUN.md](HOW_TO_RUN.md) explains running tests and reports.

## What this project is

Playwright (JavaScript, CommonJS) end-to-end tests for Tata ClassEdge **CEP v2**'s teach webapp, written from the
client-facing stories in `CEPV2_Stories/` (one file per module; `PROCESS.md` there is the method; `INDEX.md` the map).
Tests drive the real **Tata ClassEdge School desktop client** (Electron) against the target server
(`http://172.18.2.85/teach/`, school C P Goenka International School; owner, 2026-09-28 -- the old QA server
`ce-qa-school.devstudi.com` is disabled and must not be used: its profile is `config/environments/qa.env.disabled`). `RUN_IN_BROWSER=1` runs the same specs in a normal browser instead.

This repo is the story-driven suite (stories, then test cases, then automation). The earlier approach, about 1,000 tests
automated directly from the test-case workbooks, lives in the old repo (`tce-rajs/client-playwright-automation`, branch
`main`) and is not part of this repo.

## Where things stand (2026-09-29)

Committed on `improve/reference-driven-coverage` (not pushed). Target server **172.18.2.85 only**.

- **Full end-to-end run on .85 (922 tests):** 603 work, 94 known bugs still present, 24 skipped with a reason,
  1 known bug did not reproduce, 200 new failures. Almost all of the 200 were test data that does not exist on .85
  (Players topics without images/web links, no Compass Revision Tests, Attendance and AI Homework only in some classes).
  `config/moduleClassMap.js` now points at .85 topics that have the data (each entry carries a `server85` note);
  data that .85 has nowhere fails as `DATA MISSING ON THIS SERVER`. **Those modules still need a rerun.**
- **Learning Shorts cannot record on .85:** the server is plain http, so the browser gives the app no screen capture
  (`getDisplayMedia` is undefined). Reported as ENVIRONMENT, not a product bug; needs https.
- **Boards are never cleared** (see "Data these tests change"). Whiteboard module after the change: 65 passed; the
  rerun of the failures confirmed WB-02-04 and WB-09-07. WB-10-11 (finger tap) worked three times in a row: probably
  fixed on .85.
- **Long whiteboard data for manual checks** (PIN 89632, Mandar A, Class 12A Computer Science): 7.2 has 800 words plus
  a 1,003-word lesson with images, diagrams and pen changes (2,992 strokes, 4 images); 8.1 has the same lesson
  written in the desktop client (1,390 strokes, 4 images). 7 sign-out checks lost nothing.
  [CLIENT_VS_BROWSER_TIMING.md](CLIENT_VS_BROWSER_TIMING.md): the client took about 2x as long as the browser.
- **Waiting on the owner:** how to test the Clear button; whether a single failed token renewal should sign the teacher
  out (LOG-06-04); the idle popup timing (~11-14 min); autosave shows no "Whiteboard Saved!" while writing (WB-08-11).
- **Next:** rerun the data-gap modules on .85, the long whiteboard tests, WB-02-01 and WB-06-16.

## Where things stood (2026-09-27)

**IN PROGRESS as this was written** -- a second gap-fill pass, still on branch `improve/reference-driven-coverage`
(not yet committed), adding real touch/stylus input and long-session whiteboard-writing coverage on top of the
2026-09-26 pass below. New this pass:

- **Real touch, stylus and mouse input** via Chrome DevTools Protocol (`pages/touch-input.js`), not `page.mouse` --
  finger taps/drags, two-finger pan, pinch-zoom, a stylus with pen pressure, and a palm resting on the screen while
  writing. `pages/lib/handwriting.js` turns a word count into human-like pen strokes (one joined stroke per word plus
  dots/crosses, lines that slope a little) for realistic writing tests instead of straight test lines.
- **New whiteboard modules:** WB-08 (a long session, ~800 words, autosave/offline/closing-mid-save), WB-09 (data
  integrity: Clear+Undo, erase, zoom/pan persistence, class-switch bleed, a long text box), WB-10 (touch/stylus,
  including 150-word finger and stylus writing sessions), WB-11 (a teacher's day across sign-out/relaunch on a board
  that is **never cleared** -- the `longSession` class-map key, owner's explicit request 2026-09-27: a real
  classroom board is never empty).
- **PLR-13** (multi-click on every asset type) and **PLR-14** (annotating on every asset type: write, zoom+write+pan,
  every tool, close/reopen persistence, video play/seek/pause, two assets at once) -- both requested directly.
- **PL-10** (Playlist multi-click), **NAV-07** (fast/mid-upload class switching), **AIN-05/AIH-05/ATT-06** (each
  feature's own send/submit request failing over the network, then retried).
- **RES-08**: the upload test-data kit (`scripts/make-test-data.js` builds `test-data/`, gitignored -- 29 real-teacher
  files and 21 broken/wrong/oversized/unsupported ones) run through Add Resource -> Create, one case per file.
- **RES-09**: the same kit sent through DropIt (representative cases; a full 50-file DropIt run was done once by hand,
  ~2.4 h, since DropIt needs its own QR pairing per file -- see `TEST_DATA_ADDED.md`).
- Fast pen/finger input matters: sending a whole stroke as one CDP burst makes the app draw a jagged, simplified
  line and drops most points -- points must go one at a time (see `touch-input.js`'s own comments; this cost a
  wasted ~1 h run on 2026-09-27 before being caught).
- Full before/after video evidence for every new bug this pass, converted to MP4 (`scripts/to-mp4.js`, the bundled
  ffmpeg only writes WebM) plus a picture-strip PNG (`scripts/frame-strip.js`) so it opens on any device.

New bugs found this pass (video evidence in `test-evidence/`) include: closing the app during the autosave countdown
loses everything written since the last save; autosave does not resume after a network drop; a pen stroke with the
palm resting on the screen also draws a line from the palm; a two-finger drag draws instead of panning, and a pinch
draws instead of zooming; the stylus eraser does not erase; a finger tap does not always open a Playlist card; the
web link player can be left open after fast open/close; dragging to mark attendance present does nothing (mouse or
finger); a preferred resource type cannot be removed and "Interactivity" is listed twice; DropIt has no file-size
limit at all (Create's 10 MB limit is not enforced); several upload-kit findings shared between Create and DropIt
(a broken/mislabelled file is accepted as a success; a Hindi or very long file name is silently rejected with no
message; Word/PowerPoint/`.xlsx`/ODF/`.txt` are accepted but show "UNSUPPORTED FILE" when opened). The full list with
video for each is the deliverable at the end of this pass -- see the chat/task history for the final tally once the
live reruns below have finished; do not treat the numbers in this note as final.

## Where things stood (2026-09-26)

**Gap-fill pass on branch `improve/reference-driven-coverage` (not yet committed).** The stories were compared with the
reference suite (`D:\Projects\new approch playwright`: 20 module workbooks + the Zoho Teach Mode bug list) and every gap
was filled: **six new modules** (12 Minimap, 13 AI Notices, 14 Learning Shorts, 15 AI Homework, 16 Attendance,
17 Profile) and new stories/cases in every existing module. **582 cases** in `CEPV2_Stories/` (was 273); every
automatable case has a spec, each module was verified live, then the whole suite was run end to end.

**Full run (2026-09-26, Module 02 and `tests/_probe` excluded, 550 tests, 5 h):** 511 passed (known product bugs recorded
with `test.fail` count as passed), 29 skipped with reasons, 10 failed. Of the 10: 6 were fixed or passed on rerun (timing/data),
1 became a recorded bug (PLR-12-02); still open: RES-05-15 and RES-05-01 (AI Assist was not loading at all on the QA server
at the end of the session -- rerun), ATT-03-01 (intermittent: Submit Attendance sometimes leaves the panel open), RES-02-17
(intermittent Library search race, left asserting the correct result). Details, bugs and mismatches: PROJECT_OVERVIEW.md
section 9.

Module 02 was not rerun: it needs a brand-new user (`raj.test` was onboarded 2026-09-22). Module 10 (Sidebar) and every
Plan Mode / Cross-Mode case stay **manual-only by design** (`PROCESS.md`, "Automation scope").

**Owner decisions for this pass (2026-09-26):** real actions allowed on QA (send notices / homework / shorts, submit
attendance); Change Password / PIN only on the spare account (`DISPOSABLE_*` in `.env`); no security/abuse tests.
`config/moduleClassMap.js` was restored to its QA values (the previous commit had left it on the 172.18.2.85 server's
school).

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
4. `C:\Users\Public\tce_settings.json` must have `"path": "http://172.18.2.85/teach/"` (one profile only;
   `npm run set-env new-server` sets it). If the client
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
`SESSION_SOAK_MINUTES` (16), `SESSION_IDLE_MINUTES` (3.5), `HEADER_IDLE_MINUTES` (3.5), `NAV_RESTORE_WAIT_MINUTES` (3).

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

## Data these tests change (shared account — be careful)

Tests create then remove their own Playlist assets and restore theme, dock side and background. They **do** draw on real
topic whiteboards (persisted) but **never clear them** (owner rule 2026-09-29): every writing test moves below the
existing writing and counts only its own strokes, so the boards only grow. Boards written (PIN 74125, Class 12A
Physics): **1.1** (most whiteboard/toolbar tests), **2.1** (WB-06's second topic), **3.1** (WB-11, a teacher's day).
The four tests about the Clear button itself (TB-05-09/10, WB-09-01/02) are `fixme` until the owner decides how Clear
may be tested. Module 02 is one-shot per user: it changes the fresh test user (default password `classedge`
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
