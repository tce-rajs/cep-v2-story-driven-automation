# CEP v2 story-driven automation: project overview

Read this first. It is written for anyone joining the project, a new engineer or a new AI agent, and gives the full
context: what this is, why it exists, how it was built, where it stands and what is left. Last updated **2026-09-20**.

Other documents: [README.md](README.md) (layout and setup) · [HOW_TO_RUN.md](HOW_TO_RUN.md) (running tests, reports,
troubleshooting) · [CLAUDE.md](CLAUDE.md) (working agreements for AI agents) · [CEPV2_Stories/](CEPV2_Stories/) (the
stories and the process behind them).

---

## 1. What this project is

Automated end-to-end tests for **Tata ClassEdge CEP v2**, the teacher-facing "teach" web app (QA server
`https://ce-qa-school.devstudi.com/teach/`).

- The tests drive the real **Tata ClassEdge School Windows desktop client** (an Electron app), not a browser. A browser
  mode exists (`RUN_IN_BROWSER=1`) but the client is the reference.
- Stack: **Playwright, JavaScript (CommonJS)**, Page Object Model, one worker (all tests share one live session).
- The suite is written **from user stories**: every test traces to a test-case ID, and every test case to a story.

## 2. The two approaches (why this repo exists)

|                | First approach (old repo)                                         | This approach (this repo)                                |
| -------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| Starting point | Existing test-case workbooks (Excel)                              | **User stories** written first                           |
| Flow           | Automate the workbook cases directly, module by module            | Stories → test cases → automation → live verification    |
| Size           | About 1,000 tests                                                 | About 270 test cases (249 automated tests)               |
| IDs            | Workbook IDs (for example `NAV-CHP-07`)                           | Story IDs (for example `NAV-04-02`: module, story, case) |
| Where          | `github.com/tce-rajs/client-playwright-automation`, branch `main` | This repo                                                |

The two are different suites with different structure, IDs and coverage, so they live in separate repos. The old suite is
reference material and is not run from here. Some old findings (Zoho bug regressions, CEP v1 behaviour) were used as
hints when writing stories and are recorded in the specs where relevant.

## 3. Our approach

1. **Stories first.** One file per module in `CEPV2_Stories/` (`NN_Name.md`). Each `###` heading is a story
   (`PRE-01`, `LOG-02`, `TB-05`, ...); each numbered line under it is a test case (`TB-05-03`). `INDEX.md` is the map and
   `PROCESS.md` is the method.
2. **Test cases reviewed as a list.** `CEPV2_Stories/CEPV2_TestCases.xlsx` is a reviewer-friendly one-sheet export
   (273 cases, module by module) meant to be sent to reviewers for comments.
3. **Automation.** One spec file per story under `tests/NN-module/`, one `test()` per case, and the test title starts with
   the case ID, so `-g "TB-05-03:"` runs exactly that case.
4. **Live verification, one module at a time.** Every test was run against the real app. When the story and the app
   disagree, the app is the truth: the test records what is actually observed and the mismatch is reported (see the
   conventions below). Stories can be wrong about the app.
5. **Nothing is silently skipped.** Every test ends as a pass, a documented failure, or a skip with a written reason.
6. **Manual-only by design:** Module 10 (Sidebar / Plan Mode) and every Plan Mode or cross-mode case are documented but not
   automated. Each spec's header lists the IDs it leaves out.

## 4. Repository layout

```
CEPV2_Stories/     stories (md, one per module), INDEX.md, PROCESS.md, CEPV2_TestCases.xlsx
config/            env.js (BASE_URL etc.), moduleClassMap.js (confirmed class/chapter/topic per module)
fixtures/          electron-app.js (launches and resets the client), index.js (the `test` every spec imports)
pages/             page objects: locators and actions only, no assertions; pages/app.js exposes them all
tests/             01-without-login  02-new-user-flow  03-login  04-header  05-toolbar  06-whiteboard
                   07-class-navigation  08-playlist  09-resources  11-players   (no 10: manual only)
scripts/           Playwright reporter helper (archives each run's HTML report)
```

Specs import `test`/`expect` from `fixtures` and reach the app only through page objects. `fixtures/index.js` gives every
test two ready-made entry points:

- `app`: the client, signed out (a fresh Guest Mode baseline for each test).
- `user`: the client signed in on the main QA account, already on the class/chapter/topic chosen with
  `test.use({ classMap: '<key>' })` (keys live in `config/moduleClassMap.js`). `test.use({ cleanBoard: true })` clears the
  whiteboard first.

## 5. Conventions

| Situation                      | What the test looks like                                                                                                                                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmed product mismatch     | `test.fail(true, '<what is wrong>')` and the `@bug` tag, with the live evidence in a comment. The run stays green and the finding stays visible. If the product is fixed, the test fails with "expected to fail but passed": remove the `test.fail`. |
| Blocked by data or hardware    | `test.fixme(...)` or `test.skip(cond, 'reason')`, with the reason (and what was tried) written in the spec                                                                                                                                           |
| Needs a one-shot account state | Documented in the spec header (see Module 02 below)                                                                                                                                                                                                  |
| Test-created data              | Titled `AutoTest-<timestamp>` and always removed by the test that made it                                                                                                                                                                            |
| Tags                           | `@smoke @functional @negative @edge @regression @concurrency @interruption @performance @long @bug`                                                                                                                                                  |

Rules of thumb: page objects hold locators and actions, specs hold assertions; prefer `data-qa-id` locators; wait for a
condition, not a fixed delay; never leave the shared QA data changed.

## 6. Environment facts that cost time to find

- **Window size:** the client window is 1536×864 CSS px (screenshots are 1920×1080). Coordinates beyond 1536 wide miss.
- **Reload:** `page.reload()` destroys the client's webview. The fixture patches it to navigate to the same URL again.
- **Offline:** `context.setOffline()` does nothing in the client; use `page.route(..., abort)`.
- **Second tab:** the client cannot open one (`Target.createTarget` unsupported). Two-session tests use a separate Chromium
  browser context.
- **`isVisible({ timeout })`** ignores the timeout: use `waitFor`.
- **Shared state:** whiteboard content persists per topic; the app remembers the last class; the session is shared. Run one
  test run at a time, never two.
- **QA server:** it can return 503 for several minutes. Check with `curl` before debugging tests.
- **`test-results/`** is wiped at the start of every run; copy any evidence you need first.
- **Default topic data:** the main account's default topic (Class 12A Physics 1.1) holds hundreds of stale Playlist cards left
  by other automation. Do not bulk-delete them. Use a cleaner topic (`librarySuggestions`, Physics 1.5) for count-based tests.
- **Quiz:** the AIR-card popup counts down and falls into attempt mode (what PLR-01/02 test); "Launch AIR Card" opens camera
  mode.
- **Shell pitfall:** regex backslashes get lost when code is written through shell heredocs (`/\s+/g` became `/s+/g`, which
  strips the letter "s"). Write scripts with a file tool, and if a string-cleaning regex behaves oddly, check for this.

## 7. Accounts

Credentials live only in a local `.env` (gitignored; see `.env.example`). Never commit or paste real values.

- **Main QA account** (PIN and password): most tests. A **second account** is used for the two-session tests.
- **Fresh new-user account** for Module 02, in a different school (Velammal). It is **one-shot**:

| Tests                                       | Account state they need                         |
| ------------------------------------------- | ----------------------------------------------- |
| NEW-01 (first login, forced password reset) | still on the default password `classedge`       |
| NEW-02 (PIN setup)                          | password set, PIN not set (NEW-01 leaves it so) |
| NEW-03 (welcome screen, first class)        | PIN set and **no class ever chosen**            |

A password/PIN reset does not undo "class already chosen": NEW-03 then skips with that reason. It needs a genuinely new user.
Do not probe the PIN screen by hand on that account: typing five characters twice sets the PIN and uses up the state.

## 8. What was done, in order

1. Wrote the stories and the test-case list (modules 01-11).
2. Wrote the specs, page objects and fixtures for every automatable module.
3. Verified live, module by module (branch `newapproch-dell`), fixing tests and page objects and recording product bugs.
4. Added extra cases the team asked for (for example Virtual Keyboard across input boxes, TB-09-11 to 13).
5. Ran the complete suite end to end (2026-09-20, 2 h 11 min, 249 tests) and fixed what it showed.
6. Exported the reviewer list (`CEPV2_TestCases.xlsx`) and moved the work into this fresh repo.

## 9. Current status (2026-09-20)

**Full end-to-end run:** 249 tests. 209 passed, 18 known product bugs (expected failures, counted green), 20 skipped or not
run, 2 failed. Both failures were then dealt with: `RES-03-02` was a test defect (fixed, passes) and `NEW-03-01` needed a
fresh user (now skips with a reason). Two skipped tests were also enabled (`RES-01-06`, `PL-04-04`). That should now read
**212 passed, 18 known bugs, 19 skipped, 0 failed**, but this was confirmed test by test, not in one further full run. Do
a full run to confirm.

| Module              | Tests | Passed | Known bugs | Skipped / not run            |
| ------------------- | ----- | ------ | ---------- | ---------------------------- |
| 01 Without Login    | 14    | 13     | 1          | 0                            |
| 02 New User Flow    | 12    | 9      | 0          | 3 (NEW-03, needs a new user) |
| 03 Login            | 20    | 16     | 0          | 4                            |
| 04 Header           | 16    | 13     | 3          | 0                            |
| 05 Toolbar          | 45    | 41     | 4          | 0                            |
| 06 Whiteboard       | 26    | 26     | 0          | 0                            |
| 07 Class Navigation | 15    | 13     | 1          | 1                            |
| 08 Playlist         | 20    | 18     | 1          | 1                            |
| 09 Resources        | 39    | 27     | 6          | 6                            |
| 11 Players          | 42    | 36     | 2          | 4                            |

(Module 02 also includes NEW-01 and NEW-02, which passed in the full run. NEW-01/02 need the account reset first.)

### Known product bugs (tests that record them)

| Test                    | What is wrong                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| PRE-03-01               | User menu (avatar / profile trigger) is not visible in Guest Mode                                                         |
| HDR-04-01               | Moving the toolbar closes the open tool panel                                                                             |
| HDR-07-02               | Switch Mode mid-draw switches with no warning (silent discard)                                                            |
| HDR-07-04               | Switch Mode with no network drops to a browser error page instead of an in-app error                                      |
| TB-09-06, TB-09-10      | Feedback opens nothing when clicked                                                                                       |
| TB-09-08                | Virtual Keyboard is rendered below the visible window for the chapter search box                                          |
| TB-09-13                | Virtual Keyboard OFF is ignored by the Add Resource title box                                                             |
| NAV-02-02               | A search with zero matches shows a blank popup, no empty-state message                                                    |
| PL-01-06                | A PDF that fails to load leaves a blank loader with no error message                                                      |
| RES-01-04               | A zero-byte file upload is accepted and creates an empty resource                                                         |
| RES-02-12               | The Library search box shows `&#39;` instead of an apostrophe                                                             |
| RES-03-06               | Arrow keys neither select nor move an inserted image                                                                      |
| RES-05-03, 05-04, 05-05 | AI Assist "Add to Playlist" creates a "<topic> FlashCard" asset, not "My Exercise", and a second add makes a second asset |
| PLR-01-14               | AIR card mode: going back to question 1 updates the pager but not the question shown                                      |
| PLR-02-01               | Finishing the quiz shows "Quiz Complete!" and per-answer marks but no score                                               |

Two further observations, recorded in the specs but not raised as failures: the PIN screen shows no text message for a too-short
PIN (only a disabled Next button), and five letters typed into the PIN boxes were accepted as a PIN (NEW-02-04 notes).

### Skipped tests and what would unblock them

| Tests             | Why skipped                                                           | To unblock                                              |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| NEW-03-01, 02, 03 | The account already chose its first class                             | A brand-new user (never chose a class)                  |
| LOG-01-04, 05     | Need an admin PIN reset on a disposable account                       | An admin action or reset endpoint                       |
| LOG-01-06         | Needs an account with an expired profile                              | Such an account                                         |
| LOG-01-07         | Needs a school whose license is expired                               | Such a school                                           |
| NAV-04-02         | No chapter with zero topics found in the 17 subjects scanned (of 169) | Data, or a full scan (about 3 h)                        |
| PL-06-03          | This build has no per-card pin, only a strip-level pin                | Product change                                          |
| RES-02-08, 09     | Library previews are iframes and an opaque PDF viewer                 | A way into the preview                                  |
| RES-04-03 to 06   | DropIt needs a paired phone; the QR content could not be read         | A second device or a QR-decoder plus the phone-side URL |
| PLR-01-04, 06     | No quiz with image questions or options found                         | A quiz that has them                                    |
| PLR-01-12         | No class-strength / Student Test launch in this build                 | Product change                                          |
| PLR-04-03         | The ebook used has no linked resources                                | An ebook that has them                                  |

## 10. What a new agent or engineer should do next

1. Read the stories index and this file, then skim one spec and one page object to see the style.
2. Set up `.env` from `.env.example`, then follow [HOW_TO_RUN.md](HOW_TO_RUN.md). Start with one module or one case.
3. Do a full end-to-end run to confirm the status in section 9 (about 2 hours; needs a reset Module 02 user).
4. Work down the skipped table as data or devices become available.
5. When you find a mismatch with the app, record it with `test.fail(true, ...)` and `@bug`, and add it to section 9.

## 11. Working agreements (carry these over)

- **One run at a time.** All specs share one client session. Never start a second run, even a probe, while one runs.
- **One module at a time** when verifying: verify, report, then move on.
- **Verify live** rather than assume; the stories can be wrong about the app.
- **Ask before deleting** files or shared QA data, and **commit or push only when asked**.
- **Report faithfully:** if something fails or is skipped, say so with the reason. Correct earlier claims that turn out wrong.
- Keep chat updates short and plain, with a table per module when a module finishes.
