# How to run the tests

A practical guide for running the CEP v2 suite. For what the project is and how it is laid out, see [README.md](README.md).

## 1. Before you start

| Check                                                     | Why                                                                                                                                                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The **Tata ClassEdge School** desktop client is installed | The tests drive the real Electron client, not a browser. The default path is set in `fixtures/electron-app.js`; if yours differs, set `CLASSEDGE_CLIENT_EXE` in `.env`.             |
| `npm install` has been run                                | Installs Playwright and the other tools.                                                                                                                                            |
| `.env` exists and is filled in                            | See the variables below. (`.env.example` is no longer in the repo, so use this list.)                                                                                               |
| The QA server is up                                       | If the app shows errors, check the site first: `curl -s -o /dev/null -w "%{http_code}" <BASE_URL>` should print `200`. The server has returned `503` for several minutes at a time. |
| **No other run is in progress**                           | All tests share ONE client session. Never start a second run while one is executing.                                                                                                |

### `.env` variables

| Variable                                | Used for                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `BASE_URL`                              | The QA teach app URL                                                           |
| `SCHOOL_NAME`, `SCHOOL_SEARCH_TERM`     | The main QA school                                                             |
| `USERNAME`, `PASSWORD`                  | Main account, password sign-in                                                 |
| `VALID_PIN`, `INVALID_PIN`              | Main account PIN sign-in (and a wrong PIN for negative tests)                  |
| `VALID_PIN_2`                           | A second account, for the two-sessions tests (LOG-01-12)                       |
| `NEW_USER_USERNAME`                     | The fresh first-time user for module 02                                        |
| `NEW_USER_NEW_PASSWORD`, `NEW_USER_PIN` | Password and PIN that module 02 sets for that user                             |
| `NEW_USER_SCHOOL_SEARCH_TERM`           | The school of the module 02 user (Velammal), if different from the main school |
| `CLASSEDGE_CLIENT_EXE`                  | Optional: full path to `Tata ClassEdge School.exe`                             |

Optional timing knobs (defaults in brackets) for the long tests: `SESSION_SOAK_MINUTES` [16], `SESSION_IDLE_MINUTES` [3.5], `HEADER_IDLE_MINUTES` [3.5], `NAV_RESTORE_WAIT_MINUTES` [3], `SESSION_WARNING_MINUTES` [6], `SESSION_CAP_MINUTES` [45]. Keep the idle ones under 4: after 4 minutes idle the app shows its sign-out warning. Lower them for a quick pass; keep the defaults for a real verification.

Never commit `.env` or paste its values into chat, reports or docs.

## 2. Running tests

Run these from the project folder. The window is visible by default (the client is a desktop app).

```bash
npm test                                          # everything (about 2 hours, see below)
npx playwright test tests/05-toolbar              # one module (a folder)
npx playwright test tests/05-toolbar/tb-05-eraser.spec.js   # one spec file
npx playwright test --grep "@smoke"               # by tag
npx playwright test --list                        # show what WOULD run, run nothing
```

### Run one test case by its ID

Every test title starts with its ID, so use `-g` (grep):

```bash
npx playwright test -g "TB-05-03:"                # exactly one test case
npx playwright test -g "TB-05-03:|LOG-01-01:"     # several test cases
npx playwright test -g "TB-05-"                   # every case of one story
npx playwright test tests/05-toolbar -g "TB-05-03:"   # faster: only scans that folder
```

- End the ID with `:` when you want exactly one case. `TB-05-0` alone would match TB-05-01 to TB-05-09.
- Add `--list` first if you are unsure what a pattern matches.
- In PowerShell or Git Bash put the pattern in double quotes.

### Tags

Titles carry tags such as `@smoke`, `@functional`, `@negative`, `@regression`, `@edge`, `@concurrency`, `@long`, `@bug`. Example: `npx playwright test --grep "@smoke"`.

### Useful options

| Option             | Effect                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `--headed`         | Already the default here; kept for clarity                                                       |
| `--reporter=list`  | Plain console output, one line per test                                                          |
| `--last-failed`    | Re-run only the tests that failed last time                                                      |
| `--debug`          | Step through a test with the Playwright inspector                                                |
| `RUN_IN_BROWSER=1` | Use Playwright's own browser instead of the desktop client (PowerShell: `$env:RUN_IN_BROWSER=1`) |

Do not change `workers` (it is 1 on purpose).

## 3. How long things take

| Scope           | Roughly                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A single test   | 10–60 seconds                                                                                                                                                    |
| A module        | 3–25 minutes                                                                                                                                                     |
| The whole suite | About 2 hours 10 minutes                                                                                                                                         |
| Slowest files   | `03-login/log-01-login.spec.js` (~23 min, session-soak tests), `06-whiteboard/wb-06-annotation.spec.js` (~15 min), `04-header/hdr-02-date-time.spec.js` (~5 min) |

For a long run, start it in the background and keep the output in a file so it can be read later, for example `npx playwright test > run.txt 2>&1`.

## 4. Module 02 (New User Flow) needs a fresh account

Module 02 walks a **brand-new user** through first login, so it works only once per account state:

| Tests                                       | The account must be…                                          |
| ------------------------------------------- | ------------------------------------------------------------- |
| NEW-01 (first login, forced password reset) | on the default password `classedge`                           |
| NEW-02 (PIN setup)                          | password already set, PIN not set (NEW-01 leaves it that way) |
| NEW-03 (welcome screen, first class)        | PIN set, and **no class chosen yet**                          |

- Run the three files in order: `npx playwright test tests/02-new-user-flow`.
- Before each full pass, have the user's **password and PIN reset**. That alone is not enough for NEW-03: it also needs an account that has never chosen a class, i.e. a genuinely new user (or an admin clearing the last-accessed class). If the account already has a class, NEW-03 skips with that reason.
- Don't probe the PIN screen by hand on this account. Typing five characters twice sets the PIN and uses up the one-shot state.

## 5. Reading the results

The console (list reporter) marks each test:

| Mark | Meaning                                                                                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ok` | Passed                                                                                                                            |
| `x`  | Failed. **Or** a known product bug that is _expected_ to fail (see below). Check the `@bug` tag and the summary lines at the end. |
| `-`  | Skipped, or did not run                                                                                                           |

The summary at the end (`N passed`, `N failed`, `N skipped`) is the real verdict. A known product bug counts as **passed** there.

### Known bugs and blocked cases

- **Known product bug:** the test is written with `test.fail(true, 'reason')` and tagged `@bug`. It is expected to fail, so the run stays green while the bug stays visible. If the product gets fixed, that test starts failing with "expected to fail but passed", which is the signal to remove `test.fail`.
- **Blocked by data or hardware:** the test is `test.fixme` (or `test.skip`) with the reason in the spec, usually a `// BLOCKED: …` comment.

## 6. Reports

Every run writes:

| Where                                             | What                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `playwright-report/`                              | HTML report of the **latest** run (overwritten each run)                          |
| `playwright-report-archive/report_<date>_<time>/` | A permanent copy per run, with its own `README.md`                                |
| `test-results/`                                   | Screenshots, videos and traces for failed tests (wiped at the start of every run) |

Open a report (it must be served, so double-clicking `index.html` will not work):

```bash
npm run report                                                        # latest run
npx playwright show-report "playwright-report-archive/report_<date>_<time>"   # a saved run
```

Open a failure's trace with `npx playwright show-trace test-results/<test folder>/trace.zip`.

## 7. Common problems

| Symptom                                                   | What to do                                                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test can't find the Sign In button                        | The previous run left the app mid-flow. The fixture signs out between tests; if it still fails, close any leftover _Tata ClassEdge School_ window and re-run. |
| Many tests fail at once                                   | Check the server (`curl`, see section 1) before debugging tests.                                                                                              |
| A test passes alone but fails in a full run               | Usually left-over state from an earlier test (whiteboard strokes, open panels). Re-run it alone, then look at the tests before it.                            |
| Whiteboard counts look wrong                              | The whiteboard keeps content per topic; specs that count strokes use the `cleanBoard` option to clear it first.                                               |
| The Playlist of the default topic holds hundreds of cards | These belong to other automation. Do not bulk-delete them; tests only remove assets they created themselves (titles start with `AutoTest-`).                  |
| `Client not found` error                                  | Set `CLASSEDGE_CLIENT_EXE` in `.env`.                                                                                                                         |

## 8. Before committing

```bash
npm run lint          # must show 0 errors (warnings are known)
npm run format        # prettier
```

A commit hook (husky) runs lint-staged on staged `.js` files.

## 9. The stories and test-case list

- Stories: `CEPV2_Stories/*.md`, one file per module. Process notes: `CEPV2_Stories/PROCESS.md`.
- Test-case list for review: `CEPV2_Stories/CEPV2_TestCases.xlsx` (one sheet, module-wise).
