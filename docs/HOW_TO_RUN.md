# How to run the CEP v2 suite

## One-time setup

1. Node 20+, then `npm install` and `npx playwright install chromium`.
2. The Tata ClassEdge desktop client installed (tests drive it; it opens the server link itself).
3. Copy `.env.example` to `.env` and fill in the accounts (main teacher PIN, second teacher, Plan Mode teacher,
   principal, disposable account, Admin). The whiteboard module uses the separate `VALID_PIN_2` teacher by default;
   set `WHITEBOARD_PIN` only to use a different dedicated whiteboard teacher. Never commit `.env`.
4. Run `node scripts/make-test-data.js` if `test-data/` is missing; the script generates the ignored local upload
   fixtures needed by file, DropIt and resource tests.

## Everyday runs

| Goal                                                 | Command                                                                                                   | Time               |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------ |
| Choose a suite (default: Teach, then Plan; no Admin) | `npm run suite`                                                                                           |                    |
| Run full suite without the menu                      | `npm run suite -- --suite=full`                                                                           |                    |
| Run full suite and include Admin                     | `npm run suite -- --suite=full-admin`                                                                     |                    |
| Run user journeys only                               | `npm run suite -- --suite=journeys`                                                                       |                    |
| Core suite, everything (client + browser)            | `npm run core`                                                                                            | ~8 h on one client |
| Core suite, desktop client only                      | `npm run core:client`                                                                                     | ~7 h               |
| Core suite, two desktop clients in parallel (faster) | `bash scripts/run-client-shards.sh`                                                                       | ~4 h               |
| Admin modules (browser)                              | `npm run core:browser`                                                                                    |                    |
| Desktop client shell (launch, profiles, settings)    | `npm run test:client`                                                                                     | ~5 min             |
| One module                                           | `npx playwright test tests/05-toolbar`                                                                    |                    |
| One case                                             | `npx playwright test --grep "TB-09-01"`                                                                   |                    |
| Plan Mode module suite (desktop client)              | `npm run suite -- --suite=plan`                                                                           |                    |
| DropIt phone rejection (browser)                     | `RUN_IN_BROWSER=1 npx playwright test tests/00-flows/flow-10-dropit-from-phone.spec.js --grep FLOW-10-05` |                    |

"Core" = tags `@smoke|@functional|@negative|@regression`; deep cases (`@long|@edge|@concurrency|@interruption|@performance`)
are left out. To run them: `npx playwright test --grep "@edge"` (etc.).

The suite menu runs Teach first and Plan Mode/Checkpoints second. Admin is not included unless you choose the Admin
option or `full-admin`. Module tests and user-journey specs run as separate groups. Add `--list` to a suite command to
discover the selected tests without executing them, for example `npm run suite -- --suite=full --list`.
Plan Mode and Checkpoint teacher workflows run in the desktop client by default; their student and principal pages
still use separate browser contexts. They can also be run in browser mode with `RUN_IN_BROWSER=1`. Directly running
their specs without mode flags uses the default desktop-client fixture and does not skip them. High-load whiteboard
tests and all DropIt phone journeys run in browser mode because they
exercise browser-only surfaces. To run only the wrong-file refusal check, add `--grep FLOW-10-05` to the Playwright
command in the table. The `full`, `journeys` and `full-admin` suites also include reference recordings; their videos
and `videos.jsonl` are stored under a timestamped `evidence/tmp/suite-*` directory, while journey summaries and clips
are written under `evidence/builds/<build>/`. Each group runs sequentially and the final suite summary reports every
group's exit status.

## Reading the results

- Each run writes `RESULT-SUMMARY.md` and JSON under `test-results/core/<stamp>/`. Buckets: FAILED (product broken),
  ENVIRONMENT (server/network), DATA MISSING (test data used up), SKIPPED, PASSED.
- Re-run only what failed, over three clients:
  `node scripts/failed-tests.js 3 <run>/*.json > left.txt` then `bash scripts/run-remaining-groups.sh <out> left.txt`.
  A case that fails twice is a real failure.
- Update the workbook and review page: `node scripts/build-workbook.js` and `npm run review:page`.

## Runs that need fresh data

- **Module 02 (new teacher) and FLOW-02:** suite runs provision one fresh AutoQA teacher through the Admin UI before
  each first-login workflow block, then passes its credentials privately to that block. This requires valid Admin
  credentials and creates persistent teacher accounts; it does not create one teacher per individual test. Module 02
  uses one account across its serial tests and runs in one worker so the three files execute in order; FLOW-02 gets its
  own fresh account when included.
- **Checkpoint student tests:** each 10A student can sign in once per running checkpoint. When they are used up the
  tests say DATA MISSING; start a fresh Revision Test (helper in `tests/10-plan-mode`) and run again.
- **Learning Shorts recording:** run against the Ultra server configured in `BASE_URL`, using the desktop client.
  HTTP on Ultra is supported for this workflow; do not use the QA server for recording checks. The LS-02-01 smoke
  recording was verified live on Ultra in desktop-client mode. Browser-mode recording against the same Ultra URL did
  not enter the recording state, so do not use browser mode for this check.

## Machine limits

At most about three test runs at a time (8 cores, 16 GB). Each extra desktop client needs its own folder:
`CLIENT_USER_DATA_DIR=C:/Users/<you>/AppData/Local/cep-qa-client2`. Never start Playwright with `&` in a shell;
run it in a separate terminal or background job.

## After every run: remove what the tests added

Tests that create Playlist items name them "AutoTest…", "DropIt-…" or after a test-data file. Remove exactly those
(owned items only; curriculum, library and teacher content are never touched):

- `npm run cleanup:dry` lists what would be removed (`report/cleanup/cleanup-dry-run.json`)
- `npm run cleanup:apply` removes it (`report/cleanup/cleanup-applied.json`)
- An item added by the other test account has no remove control for this one: run once more with `CLEANUP_SWAP=1`.
