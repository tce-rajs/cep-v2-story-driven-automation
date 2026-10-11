# How to run the CEP v2 suite

## One-time setup

1. Node 20+, then `npm install` and `npx playwright install chromium`.
2. The Tata ClassEdge desktop client installed (tests drive it; it opens the server link itself).
3. Copy `.env.example` to `.env` and fill in the accounts (main teacher PIN, second teacher, Plan Mode teacher,
   principal, disposable account, Admin). Never commit `.env`.

## Everyday runs

| Goal                                                 | Command                                                   | Time               |
| ---------------------------------------------------- | --------------------------------------------------------- | ------------------ |
| Core suite, everything (client + browser)            | `npm run core`                                            | ~8 h on one client |
| Core suite, desktop client only                      | `npm run core:client`                                     | ~7 h               |
| Core suite, two desktop clients in parallel (faster) | `bash scripts/run-client-shards.sh`                       | ~4 h               |
| Plan Mode + Checkpoints + reports (browser)          | `npm run core:browser`                                    | ~1.5–3 h           |
| Desktop client shell (launch, profiles, settings)    | `npm run test:client`                                     | ~5 min             |
| One module                                           | `npx playwright test tests/05-toolbar`                    |                    |
| One case                                             | `npx playwright test --grep "TB-09-01"`                   |                    |
| Browser instead of client (Plan Mode, Checkpoints)   | `RUN_IN_BROWSER=1 npx playwright test tests/10-plan-mode` |                    |

"Core" = tags `@smoke|@functional|@negative|@regression`; deep cases (`@long|@edge|@concurrency|@interruption|@performance`)
are left out. To run them: `npx playwright test --grep "@edge"` (etc.).

## Reading the results

- Each run writes `RESULT-SUMMARY.md` and JSON under `test-results/core/<stamp>/`. Buckets: FAILED (product broken),
  ENVIRONMENT (server/network), DATA MISSING (test data used up), SKIPPED, PASSED.
- Re-run only what failed, over three clients:
  `node scripts/failed-tests.js 3 <run>/*.json > left.txt` then `bash scripts/run-remaining-groups.sh <out> left.txt`.
  A case that fails twice is a real failure.
- Update the workbook and review page: `node scripts/build-workbook.js` and `npm run review:page`.

## Runs that need fresh data

- **Module 02 (new teacher) and FLOW-02:** needs a brand-new teacher. Create one in Admin
  (`node tools/exploration/explore-flow-23b-admin-teacher.js` creates "AutoQA <letters>"), then set in `.env`:
  `NEW_USER_USERNAME`, `NEW_USER_NEW_PASSWORD` and a NEW 5-digit `NEW_USER_PIN` that no one uses.
- **Checkpoint student tests:** each 10A student can sign in once per running checkpoint. When they are used up the
  tests say DATA MISSING; start a fresh Revision Test (helper in `tests/10-plan-mode`) and run again.
- **Learning Shorts:** cannot record on an http server (finding S1); those tests fail until the server uses https.

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
