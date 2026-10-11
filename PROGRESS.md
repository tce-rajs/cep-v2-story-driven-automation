# Progress — CEP v2 sign-off, build v0.0.236

> **This is the single tracking file** (owner, 8 Oct): every plan, decision, step done and next step is recorded here.
> Newest work first in "Work log". Read this file first in every session.

## HANDOFF — READ THIS FIRST (state at 9 Oct 2026, 11:25; any AI or person can continue from here)

**Owner's orders (in force):** complete EVERYTHING (no scope cut), work fast with multiple agents (max ~3 test runs
at once on this machine), deadline 5–7 h from 10:10 on 9 Oct. **Admin panel LAST** — only after the rest of CEP v2
is automated and run. Reports stay local in report/ (never publish). Commit only with the owner's approval.

**Where we are:** Phase 1 (explore 27 flows) DONE → `report/exploration/PHASE1_SUMMARY.md`, details `flows.md`.
Phase 2 (stories) DONE → `CEPV2_Stories/00_EndToEndFlows.md` + module files; workbook 1,925 cases.
Phase 3 (automate the ~590 "To automate" cases) IN PROGRESS. Phase 4 (runs) IN PROGRESS. Phase 5 (hand-over) TODO.

**Running at handoff time (they die if the session ends — restart them):**
1. Full client core run, two desktop clients in parallel: `bash scripts/run-client-shards.sh`
   (output folder in `test-results-core/client-latest.txt`; shard-1.log / shard-2.log / *.json). Shard 2 was slow;
   plan was to split its remainder over a third client once the browser run ends.
2. Browser core run (Plan Mode + Checkpoints): `npm run core:browser` → log `test-results-explore/core-browser.log`.
   Checkpoint student failures there = test data used up (fix already in pages/student-test.page.js → now reports
   DATA MISSING; needs a fresh Revision Test per run).
3. Three agents writing tests (brief: `docs/handoff/agent-brief.md`):
   - A: Plan Mode + Checkpoints To-automate cases + FLOW-12..15 → tests/10-plan-mode, tests/21-checkpoints,
     tests/00-flows/flow-12-15-plan.spec.js, plus a "fresh Revision Test per run" helper.
   - B: client end-to-end flows FLOW-01..11, 16..22, 25..27 → tests/00-flows/flow-NN-*.spec.js (write + lint only).
   - C: remaining module cases 01–20 incl. new tests/18-resilience, tests/19-desktop-client (write + lint only).
   If the session ended: check which of those files exist (`git status`), run `npx playwright test <folder> --list`
   and eslint, then continue the missing case IDs (compare `--list` with the story files).

**Next steps, in order:**
1. Let the runs finish; collect failures from the shard JSONs + browser log.
2. Run the agents' new tests in the client (`npx playwright test tests/00-flows tests/18-resilience
   tests/19-desktop-client …`, one client per run, or use run-client-shards.sh), fix TEST mistakes only; a product
   bug must stay a FAIL.
3. Re-run only the failures once (separates flaky from real). Run Module 02 with a fresh AutoQA teacher
   (create one: `node tools/exploration/explore-flow-23b-admin-teacher.js`, then set NEW_USER_USERNAME,
   NEW_USER_NEW_PASSWORD and a NEW unique 5-digit NEW_USER_PIN in .env).
4. Rebuild: `node scripts/build-workbook.js`, `node scripts/build-review-page.js`; write the final issue list
   (report/) from flows.md + run failures.
5. Hand-over docs: README.md + HOW_TO_RUN.md (commands: `npm run core`, `core:client`, `core:browser`,
   `bash scripts/run-client-shards.sh`, `npm run test:client`, review page, Module 02 needs a fresh AutoQA teacher).
6. THEN Admin: brief scope "Module 22 Admin — all To-automate ADM cases + FLOW-23/24"; working code in
   tools/exploration/admin-explore-lib.js and explore-flow-23a..d (school autocomplete, calendar date, resets, sync).
7. Ask the owner before committing. Crystal project waits for the owner's details (hand-off cases marked _Hand-off_).

**Hard rules:** never clear/erase teacher boards (write with freshSpace or on scratch boards 9A Science 8.2/9.2);
Admin writes only on "AutoQA …" teachers; Sync allowed; terminals/import manual; password/PIN changes only on the
disposable account or AutoQA teachers; no security testing; never print/commit .env; Bash heredocs strip regex
backslashes — write scripts with an editor tool; never start Playwright with `&` (use background jobs).

## AUTONOMOUS RUN — RESUME HERE

Owner, 9 Oct: "Now start. Do not stop; work continues one phase after another. If the session limit ends, start again
automatically." An hourly resume job (session-only, expires after 7 days) re-enters here. Always continue at the first
row not marked done. Phases: 1 Explore → 2 Correct stories → 3 Automate → 4 Run and triage (two matching runs) →
5 Hand-over docs (commit only on owner approval). Then Crystal (waits for the owner's details).

Phase 1: walk each flow live (stories in CEPV2_Stories/00_EndToEndFlows.md). Findings → report/exploration/flows.md,
screenshots → evidence/issues/. Done = walked fully, story matches the app, findings recorded.

| Flow | Area | Phase 1 explored | Story corrected | Automated |
| --- | --- | --- | --- | --- |
| (phase 3 to-do found while exploring — see list below the table) | | | | |
| FLOW-16 | AI Notices | done 9 Oct (N1 High known #22, N4 High, N5 Med, N2 N3 Low) | +3 cases | |
| FLOW-17 | AI Homework | done 9 Oct (H1 High: blocked in 5 of 9 classes; H2 Low) | +2 cases | |
| FLOW-18 | Learning Shorts | done 9 Oct (S1 High: nothing records over http) — re-explore when fixed | +1 case | |
| FLOW-19 | Attendance | done 9 Oct (A1 High: 3 classes HTTP 500; A2 High: locked empty day) | +3 cases | |
| FLOW-23 | Admin: teachers + sync | done 9 Oct (works; D1–D3 Low; sync OK in 35 s) | ok | |
| FLOW-02 | New teacher's first day | done 9 Oct (works; D4 D5 Low; T1 false pass in NEW-02) | ok | |
| FLOW-01 | Guest Mode → own board | done 9 Oct (no findings) | ok | |
| FLOW-03 | Shared panel sign-in/out | done 9 Oct (no leak; test-data clutter noted) | ok | |
| FLOW-04 | Getting to the lesson | done 9 Oct (C1 C3 Medium: chapter order, test content; C2 Low) | +2 cases | |
| FLOW-05 | Whiteboard | done 9 Oct via suite (13 fails listed) | ok | |
| FLOW-06 | Widgets + Magnet | done 9 Oct via suite (0 fails) | ok | |
| FLOW-07 | Playlist assets | done 9 Oct (P1 Medium: video stuck loading) | ok | |
| FLOW-08 | Quiz in class | done 9 Oct (opens in all classes; attempt via suite) | ok | |
| FLOW-09 | Own resources | done 9 Oct via suite (12 fails) | ok | |
| FLOW-10 | DropIt | done 9 Oct via suite (3 fails) | ok | |
| FLOW-11 | Share a resource | done 9 Oct via suite (share options fail) | ok | |
| FLOW-12 | Plan a quiz | done 9 Oct (35/36 pass; PLN-03-04) | ok | |
| FLOW-13 | Revision Test / Checkpoint | done (earlier deep walks + today; T8) | ok | |
| FLOW-14 | Content Library + Code Editor | done (F6) | ok | |
| FLOW-15 | Reports | done (earlier report findings) | ok | |
| FLOW-20 | Profile | done 9 Oct via suite (9 fails) | ok | |
| FLOW-21 | Header, modes, Compass | done 9 Oct (suite: 6 fails; Compass opens everywhere) | ok | |
| FLOW-22 | Minimap | done 9 Oct (opens everywhere) | ok | |
| FLOW-24 | Admin settings → classroom | done 9 Oct (4 mismatches F-06 F-09 F-10 F-11) | ok | |
| FLOW-25 | Any order | done 9 Oct via suite (1 fail) | ok | |
| FLOW-26 | Failures mid-flow | done 9 Oct via suite (writing lost on close/reload/network) | ok | |
| FLOW-27 | Desktop client | done 9 Oct (12 client tests pass after wait fix) | ok | |

Phase 3 to-do found while exploring (fix in the suite, not just note):
- T1: DONE 9 Oct — PIN typing taps each box and checks each digit (pages/new-user.page.js); NEW-02-03 signs out first. Needs a fresh AutoQA teacher to re-run Module 02.
- T2: DONE 9 Oct (tests/00-flows/flow-17-19-every-class.spec.js: 8 fail = H1 + A1, 10 pass). Every Magnet feature must be checked in EVERY class the teacher teaches (Homework blocked in 5/9, Attendance HTTP 500 in 3/9 — the suite used one class and missed both).
- T3: Learning Shorts failures were filed as ENVIRONMENT (hidden). Relabelled as product failures in pages/learning-shorts.page.js (done 9 Oct).
- T4: DONE 9 Oct (tests/00-flows/flow-16-notices.spec.js: 3 fail = N4, N5, N1). AI Notices: add Hindi/Marathi capture, AI tools, default class = current class (FLOW-16-09..11).
- T5: Admin automation (none yet): sign-in helper with the school autocomplete + calendar date picking exist in tools/exploration/admin-explore-lib.js and explore-flow-23b; each core run creates its own AutoQA teacher and feeds Module 02 (NEW_USER_* in .env).
- T6: Attendance: a locked day must show marks (FLOW-19-12).
- T7: DONE 9 Oct — client-automation multi-profile tests waited a fixed 4 s for the teach window; now poll up to 30 s (all 12 client tests pass).
- T8: DONE 9 Oct — checkpoint tests report DATA MISSING when every 10 A student already signed in to the running checkpoint (pages/student-test.page.js). Still needed: a fresh checkpoint per run.
- T9: AutoQA PIN must be unique per run (PINs are school-wide; "Pin is already taken").

## Work log (newest first)

### 11 Oct, 00:50 — Complete CEP v2 run queued after pass 3 (owner)
- Owner: "once these tests end, start the complete cepv2 test and generate report".
- Pass 3: 4 of 5 streams finished by 23:23; Admin stream stuck since 21:46 (ADM-18-09). A waiter stops only that Admin tree at 01:30 if still stuck, then starts `bash scripts/run-full.sh` (log: test-results/full-run-waiter.log).
- New scripts/run-full.sh: 3 desktop clients (00-flows, 01, 03–09, 11–20; 1,193 tests) + browser Plan Mode/Checkpoints and Admin (356 tests); deep tags, Module 02 and journeys left out. Output test-results/full/<stamp>/.
- New scripts/full-run-report.js → report/runs/FULL_RUN_<stamp>.md (+ .json): totals, per module, every failure with error line and screenshot.
- If the session dies: check test-results/full/latest.txt; if the run ended, run `node scripts/full-run-report.js`.

### 10 Oct, 20:30 — Pass 2 compared; test mistakes fixed; pass 3 running
- Pass 1 vs 2 (scripts/compare-passes.js → report/review/PASS_COMPARISON.json): 232 pass always, 37 flaky, 189 fail always, 83 not run.
- Causes fixed: (a) 7 flow files wrote on the default board 9A Science 4.1, which grows every run → freshSpace set-up >90 s; moved to the scratch board. (b) tests/22-admin/admin-helpers.js called test.use() at load → "inconsistent test.use() options"; removed (Admin files pass 18/18).
- Real failures confirmed again: Learning Shorts (S1), Homework classes (H1), Attendance classes (A1), Admin F-findings.
- Pass 3: scripts/run-new-tests.sh 3 → test-results/new-tests/pass-3. Then compare 3 passes, rebuild BUG_LIST, npm run cleanup:apply.

### 10 Oct — Remove test-added data; new tests run repeatedly (owner)
- tools/cleanup/remove-test-data.spec.js (npm run cleanup:dry / cleanup:apply): removes ONLY owned Playlist items named like the tests name them (AutoTest*, AutoQA*, DropIt-*, Explore short*, test-data file names) in every class-map place. Dry run found 81; removed 66. 15 left show no remove control for either test account (12A CS 2.2, 11A Maths 1.1, 9A Science 2.0) — manual removal by their owner. Logs: report/cleanup/.
- New tests: pass 1 = 9–10 Oct runs; pass 2 running (scripts/run-new-tests.sh 2 → test-results/new-tests/pass-2). Then pass 3, compare: fails every pass = real (or a test mistake to fix), mixed = flaky.

### 10 Oct, afternoon — Project review + professional folder structure
- Review note: docs/REVIEW_NOTE.md (13 mistakes found and fixed, open recommendations). Checker: npm run review:project.
- Folder moves: tests/_probe → tools/exploration (npm run explore); HOW_TO_RUN.md + handoff → docs/; report/ grouped (bugs/, signoff/, stories/); run output → test-results/core + test-results/archive (two locked old folders stay at the root, ignored by git).
- Workbook gains Priority (P1 210 / P2 1,349 / P3 366) and Spec file (traceability). 1,655 automated, 0 to automate.
- Teach↔Plan round trips automated (6 pass); Admin↔classroom checks automated (ADM-18-05 real mismatch).
- Bug list now at report/bugs/BUG_LIST.html (287 screenshots).

### 10 Oct, ~05:30 — Module-wise verification; AIR card removed (owner)
- AIR card OUT OF SCOPE (owner, 10 Oct): PLR-01-02/14/23 marked not applicable in 11_Players.md; tests removed from tests/11-players/plr-01-attempt-quiz.spec.js; startAirCardQuiz + airQuestion removed from pages/player.page.js.
- New tests/00-flows/flow-24-admin-vs-classroom.spec.js (ADM-18-05, ADM-18-10, FLOW-24-05; Admin in a browser + teacher in the client): 4 pass, ADM-18-05 FAILS — Teach Mode offers grade "Early Childhood Education" that Admin Academic Details does not list (real mismatch).
- Remaining non-automatable cases marked with reasons (Crystal hand-offs, cut-off unit undefined F-21, sleep, 2 GB upload, deployment, old build, student screen).
- Workbook: 1,925 cases — Automated 1,649, Skipped 109, Manual 17, Out of scope 51, Improvement 99, To automate 0.

### 10 Oct, 04:55 — ALL RUNS COMPLETE (CEP v2 + Admin)
- Checkpoints + Plan flows: 81 pass, 49 fail, 28 skipped. Final report/bugs/BUG_LIST.html: 14 hand-found bugs, 204 confirmed (failed twice), 82 single-run failures, 287 screenshots.
- Workbook: 1,649 of 1,925 cases automated; 15 left (reasons in agent reports).
- REMAINING: (1) triage failures of the agent-written tests (flows, 18/19/20, Admin, Plan) — fix TEST mistakes, keep product failures; re-run; rebuild BUG_LIST.html. (2) Owner approval to commit. (3) Crystal project when the owner shares details.

### 10 Oct, 03:50 — All runs done except Checkpoints
- Flows/new modules: first run 76+35 failed; re-run of failures 106 failed again, 16 passed. Plan Mode 57 pass / 17 fail.
- report/bugs/BUG_LIST.html rebuilt: 14 hand-found bugs, 204 confirmed (failed twice), 34 single-run. CAUTION: the new flow/resilience/desktop/cross-cutting tests were written by agents without a live run first — part of their confirmed failures can be TEST mistakes; triage them before reporting as product bugs.
- Checkpoints still running (test-results-final/chk.*, ~87/158), ETA ~07:00; then rebuild BUG_LIST.html.
- NEXT: triage new-test failures (fix test mistakes, keep product fails), final rebuild, ask owner before commit.

### 10 Oct, 01:30 — Admin run complete; bug page built
- report/bugs/BUG_LIST.html (scripts/build-bug-report.js; images in report/bugs/bug-images/): 14 flow bugs + confirmed + single-run failures, each with screenshot. Rebuild after each run.
- Admin (test-results-final/admin*.json): first run 59 pass / 42 fail / 50 did not run; re-run of failures 16 fail again, 6 pass; the 50: 26 pass, 17 fail.
- Running: flow failures re-run on 3 clients (<run>/flows/rerun), Plan Mode (test-results-final/plan.*, ~02:30), Checkpoints (chk.*, ~07:00).
- Final rebuild of BUG_LIST.html: pass first-run JSONs -- rerun JSONs -- single-run JSONs (incl. admin-notrun, plan, chk).

### 10 Oct, 00:20 — Agents stopped at the usage limit again; coordinator runs the rest
- Admin agent wrote tests/22-admin (11 spec files + admin-helpers.js, pages/admin.page.js), lint clean; Plan agent finished tests/10-plan-mode + 21 changes. Both runs now by the coordinator in the browser → test-results-final/admin.* and plan.*.
- Flows: rest/group-1 15 failed 14 passed 15 skipped; rest/group-2 20 failed 16 passed 14 skipped; shard-2 still running.
- Final list so far: report/bugs/FINAL_FAILURES_2026-10-09.md (95 real, 27 marked time-out).

### 9 Oct, 21:30 — Owner: include Admin now; finish EVERYTHING by ~01:30
- Admin agent started (scope: all ADM To-automate + FLOW-23/24; core flow first; runs in browser only; writes only on AutoQA teachers). Report due ~00:30.
- Running: setup-rerun (45 cases), flows+18/19/20 on two clients (~01:00), Plan agent (browser).
- Final steps by 01:30: merge all results into report/bugs/FINAL_FAILURES_<date>.md (scripts/final-issue-list.js), rebuild workbook + review page, send list.

### 9 Oct, 20:50 — Re-run done; final failure list drafted
- Re-run of 157 failed tests: 111 failed again, 46 passed (parallel clash). report/bugs/FINAL_FAILURES_2026-10-09.md (scripts/final-issue-list.js).
- Of the 111: 66 fail on the actual check (strong real-bug candidates); 45 died in set-up (class-switch clicks had 4 s timeouts under 3-client load) → raised to 15 s in pages/navigation.page.js and re-running → <run>/setup-rerun/.
- Running (detached): tests/00-flows + 18/19/20 on two clients → <run>/flows/shard-1/2.log (~2.5 h). Plan agent still running in the browser.
- README.md + HOW_TO_RUN.md written.
- NEXT: merge setup-rerun into the final list; add flows results; send the list; then Admin.

### 9 Oct, 19:20 — Full client core run done; failures re-running
- Usage limit 16:00–19:00 stopped work. Full client core run (697 tests, shards + 2 groups): 511 passed, 158 failed, 28 skipped. Results: test-results-core/client-2026-10-09-10-47 (shard-1, group-1, group-2 .json/.log).
- New RSL/CLI/XC tests (53 core): 20 passed, 31 failed — triage needed (new, unproven selectors) → test-results-core/client-2026-10-09-10-47/new/.
- Re-running every failed case once over 3 clients → test-results-core/client-2026-10-09-10-47/rerun/ (scripts/failed-tests.js + run-remaining-groups.sh).
- Plan/Checkpoint agent restarted (third time) to finish helper + run in browser.
- NEXT: compare rerun vs first run (fail twice = real), triage the 31 new failures, run tests/00-flows (client), final issue list, README/HOW_TO_RUN, then Admin.

### 9 Oct, 14:55 — Agent B done: Resilience / Desktop Client / Cross-cutting
- 85 new tests (RSL 37, CLI 24, XC 19, leftovers 5): tests/18-resilience/*, tests/19-desktop-client/* (+cli-lib.js), tests/20-cross-cutting/xc-02..05, one test each in hdr-07, wb-13, wb-14, pl-11, att-03. Lint 0 errors; NOT run yet. Long ones (RSL-03-05, 06-04, 07-01/02, XC-02-04) are deep-tagged (core skips them).
- Not automated (reasons in report): RSL-02-06 (sleep), RSL-09-02 (2 GB upload), CLI-04-04/05 (deployment, old build), PLR-01-10 (Cross-Mode, manual), FLOW-19-09 (cut-off unit undefined, F-21).
- Gated / data: PL-11-04 needs SHARE_REAL=1; XC-02-02 runs only 23:50–23:57; CLI-04-02/03 before/after an update; RSL-09-05 needs RSL_100_RESOURCES_TOPIC; XC-03-02 needs ONE_CLASS_PIN; RSL-06-03..07 + WB-13-04 browser only.
- Watch in first run: DevTools emulation, Electron network emulation, shell.openExternal stub, clock, new selectors.
- Auto-resume: session cron every 10 min (idle only) re-enters the HANDOFF section.

### 9 Oct, 14:10 — Agents stopped at the usage limit (11:30–14:00); resumed
- First 3 agents wrote 21 flow files (tests/00-flows/flow-01..27) and ~70 module test edits before stopping; lint clean, 1,561 tests (was 1,199). Workbook: Automated 1,349, To automate 340 (153 Admin).
- Browser core run finished (93 passed, 20 skipped, rest failed — mostly checkpoint student data used up).
- Restarted 2 agents: (A) Plan Mode 41 + Checkpoints 3 + FLOW-12..15; (B) Resilience 39 + Desktop Client 26 + Cross-cutting 19 + leftovers. Admin still LAST.
- Client shards at ~520/795.

### 9 Oct, ~10:15 — Owner: 5–7 h, no scope cut, use multiple agents; Admin LAST
- 3 agents writing the remaining To-automate cases (Plan+Checkpoints; client flows 00; modules 01–20). Admin agent stopped on the owner's word: Admin is automated only after the rest of CEP v2 is complete (partial files, if any: tests/22-admin, pages/admin.page.js).
- Coordinator runs the client suite (two client profiles in parallel via CLIENT_USER_DATA_DIR) and verifies agent work.

### 9 Oct, 10:00 — PHASE 1 COMPLETE (27/27 flows)
- Summary: report/exploration/PHASE1_SUMMARY.md (7 High, 5 Medium new). Stories updated as found (00_EndToEndFlows.md, 1,925 cases).
- Phase 3 started: T1, T2, T3, T4, T7, T8 done; npm run core quoting fixed. NEXT: phase 3 — Admin automation (T5), fresh checkpoint per run, unique AutoQA PIN (T9), then automate remaining core cases.

### 9 Oct — Owner's core flows turned into stories
- Owner described daily use (saved in report/review/USAGE_NOTES.md). Decisions: Admin write flows run on a teacher the
  automation creates itself ("AutoQA <date-time>"), never on real teachers; Sync is pressed and watched to the end
  (every part completed, none failed or stuck midway); Add terminal stays manual (not approved).
- Owner correction: users take any path, so stories must cover EVERY feature end to end (not 3 fixed journeys).
  New module `00_EndToEndFlows.md`: FLOW-01..27, 212 cases (every way in, use, where the result shows elsewhere, kept
  after reload/sign-out/other device, where it breaks, any-order mixing, interruptions). 00_CoreJourneys.md removed.
  Crystal hand-off cases (notice, homework, short, shared resource) marked _Hand-off_; owner shares Crystal details next.
- 22_Admin.md: 8 cases un-marked (ADM-10-11..13, ADM-11-06..09, ADM-14-04); 16 added (ADM-10-14..16, ADM-11-10..17,
  ADM-14-05..09). Workbook: 1,914 cases / 215 stories, 584 to automate.
- NEXT: walk each flow live to find where it breaks (log findings), owner reviews flows, then Crystal details.

### 8 Oct, late — Improvements kept as records only; review page for the owner
- Improvement cases are no longer automated: 55 tests removed (`scripts/remove-improvement-tests.js --apply`); loop specs
  (RES-08, RES-09, PLR-14-0Xc) skip them via `config/storyMarkers.js`. tb-09-user-menu.spec.js rebuilt by hand after the
  script damaged it (lint clean). `--list`: 1,199 tests, 0 improvements left, no automated case lost.
- Workbook: improvements now show "Not automated (improvement)" (99 cases); totals 1,686 cases / 188 stories.
- New `report/TEST_CASES_REVIEW.html` (`npm run review:page`): all cases in an Excel-like table with filters, a
  suggestion box per row and a "How I use the application" box; Export suggestions → JSON →
  `npm run review:merge -- <file>` writes them into the workbook's Review comments (kept on rebuild) and the usage text
  into report/review/USAGE_NOTES.md.

### 8 Oct, ~23:00 — Admin module added (step 1)
- Admin exploration done (nothing changed on the server). Sign-in: Organization Id = full school name
  "C P Goenka International School", user support.admin; Admin build v-1.1.45. Map + 23 findings in
  report/exploration/admin.md; issue screenshots evidence/issues/admin-*.png (9).
- New story file CEPV2_Stories/22_Admin.md (ADM-01..ADM-18, 152 cases: 129 core, 23 "needs a disposable school");
  INDEX.md updated; workbook rebuilt: 1,686 cases / 188 stories. 12 Admin stories still need a labelled negative case.
- Main Admin findings (to be confirmed by tests): teacher search with no match shows all teachers (old results kept);
  Subject Settings tab empty; reload / second tab signs the admin out; expired accounts shown ACTIVE (explains
  sushant.mokal); user, subject and terminal counts disagree between screens; 10A has no students in Admin; raw text,
  typos, overlapping chart numbers.

### 8 Oct, ~22:40 — exploration notes saved, data check
- Plan/Checkpoints exploration agent stopped early: 6 findings (F1 Medium: a Revision Assessment card in Check Point
  offers "End Baseline Test"; F2 Low: chapter numbers "8." vs "09."; F3 Plan Mode version stamp v1.0.111; F4 academic
  year "Sep 26 - Sep 27"; F5 Revision Test cannot be deleted; F6 Content Library opens folded) + draft stories PLN-10,
  PLN-11, CHK-15, CHK-16 in report/exploration/plan-checkpoints-reports*.md (for the deep phase).
- Teach exploration agent stopped early: 3 new Low findings (Chapters popup cut off at 1024×768; "+" covers the last
  Playlist card; keyboard focus on hidden controls) + draft stories CLI-07, XC-06; screenshots to recapture.
- Data check, 10A Science 3.4 Revision Tests: no untitled test was created. Two "AutoTest NB4" exist (duplicate runs):
  one PAUSED, one CREATED = a spare fresh test. The app accepts duplicate test names.

### 8 Oct, evening — stable core suite, step 1 (stories and test cases)
- New process: CEPV2_Stories/PROCESS.md (explore → stories & cases → automate for trust → run & triage → hand over).
- Admin panel added to scope: http://172.18.2.85/admin/ (creds in .env ADMIN_*); Admin exploration agent running
  (output: report/exploration/admin.md, admin-stories.md -> new module 22).
- Exploration of Teach and Plan/Checkpoints stopped early on the owner's change of priority; notes kept in
  report/exploration/ (teach.md, teach-stories.md; plan agent pending) for the later deep phase.
- Known-bug registry deleted on the owner's request (start fresh); result summary now: FAILED / ENVIRONMENT
  (server not reachable) / DATA MISSING / SKIPPED / PASSED.
- `npm run core` (scripts/run-core.js): core = @smoke/@functional/@negative/@regression minus deep tags; client stream
  858 tests, browser stream 161 tests (+ tests/22-admin when it exists).
- Story coverage check: `node scripts/story-coverage.js` -> report/STORY_COVERAGE.md.
- Marked the team-agreed improvements in the stories: 91 cases in 40 groups get _(improvement: …)_ and skip.
- Negative cases: labelled 15 existing unlabelled negatives, added 65 new negative cases (one per core story that had
  none). Remaining 15 stories without a negative case are deep/manual stories (heavy boards, touch, two devices,
  full day, client closing/devices, timer, multi-click/annotate-all, network-failure stories) — left for the deep phase.
- Backup of the story files before these edits: session scratchpad `stories-backup`.
- Workbook now has a Suite column: 1,534 cases = Core 1,194 / Deep 201 / Manual 19 / Improvement 99 / Out of scope 21.
  Core: 979 automated, 156 to automate (Plan Mode 39, Desktop client 19, Cross-cutting 13, Toolbar 12, Whiteboard 11,
  Playlist 10, Resilience 10, others few), 59 skipped (reasons to review during stabilisation).
- Review page sent to the owner: report/STORY_CHANGES.html (`node scripts/story-changes.js <earlier copy>`).
- Next: merge Admin stories (module 22) when the Admin agent reports; owner review; then step 2 = automate the 156
  core cases module by module (directly, no agents unless needed).



Last updated: 2026-10-08. Read this first when a new session starts; it says where the work stopped and what comes next.

## Where we are

Sign-off testing of build **v0.0.236** on the Ultra server **http://172.18.2.85** is complete apart from the gaps listed
under "Next". Nothing is committed: all changes are uncommitted on branch `cepv2-stabilization-tests` (commit only when
the owner asks).

**Deliverables (latest, send these to the owner):**

| File | What |
| --- | --- |
| `report/FINAL_ISSUE_LIST_v0.0.236.html` / `.xlsx` | Final issue list: 53 issues (7 High, 26 Medium, 20 Low) + 15 to clarify. Built from the sign-off report with `node scripts/build-issue-list.js v0.0.236` |
| `report/SIGNOFF_v0.0.236.html` | Full sign-off report: phases, results, bugs by module with a "Your verdict" column |
| `evidence/issues/*.png` | Screenshot for each issue |
| `evidence/builds/v0.0.236/` | Positive-flow video (MP4 + picture strip + trace) of every module, `INDEX.md` |
| `CEPV2_Stories/CEPV2_TestCases.xlsx` | Master workbook, 1,423 cases (`node scripts/build-workbook.js`) |

To change the issue list: edit the bug rows in `report/SIGNOFF_v0.0.236.html` (section "Bugs by module"), then rerun
`node scripts/build-issue-list.js v0.0.236`. Rows tagged High/Medium/Low are issues; any other tag (Question, Needs
check, Doubt, Environment) goes to "To clarify".

## Owner decisions in force

- **Excluded as improvements (agreed with the team, 2026-10-08):** 47 items, including writing lost on session end /
  app close / reload, autosave after network drop, server restart scribbles, large-board crash, Switch Mode without
  warning, Change Password does nothing, every double-click/double-submit (notice, attendance, AI generate, Sign In),
  DropIt size limit and broken files, no Feedback option, PIN keypad and virtual keyboard off screen, PIN paste, toolbar
  move closes panel, Undo of a move, empty text box, palm rejection, panels staying open after class switch (Attendance,
  Minimap, DropIt), two Magnet panels, homework title reset, Learning Shorts re-record/discard, quiz reopen, drawing
  over video, 0-byte file, DropIt Close over +, DropIt text, + stacking menus, gallery double insert, Office files,
  empty search results (chapter, contents, gallery), long emoji file name, `&#39;` in Library search, Interactivity
  listed twice, short password / same PIN messages, autosave debug text. They are NOT in the issue list. (Their tests
  still assert the original behaviour; the owner was asked whether to mark them "improvement" in the stories so they
  skip — no answer yet.)
- **Skipped:** CEPV1 → CEPV2 migration; Phase 3 long tests (40-minute session, writing lost on reload / app close);
  Content Library and Code Editor automation (stories written, not a priority); Module 02 (needs a fresh user).
- **Delete Whiteboard / Clear:** allowed only on the scratch boards (class map `scratchBoard` = 9A Science 8.2,
  `scratchBoard2` = 9A Science 9.2): write a little sample content, clear it, leave the board empty. Every clear test
  checks it is on a scratch board first. All 9 pass in browser and client.
- Plan Mode, checkpoints, student test site and principal reports run in the **browser** (`RUN_IN_BROWSER=1`, always with
  its own `--output=<folder>`); Teach Mode runs in the **desktop client**.
- Share a screenshot for every issue or doubt (SendUserFile) and keep it in `evidence/issues/`.
- Never clear or write on teacher boards (see CLAUDE.md list); no security/abuse tests; ask before deleting files.

## Accounts (`.env`, gitignored)

| Key | Account | Use |
| --- | --- | --- |
| `VALID_PIN` 74125 | raj.shinde (main) | Teach Mode, checkpoints (10A Science), attendance (10A, all 13 subjects), AI features |
| `VALID_PIN_2` | melville | Players data; not class teacher of 10A (attendance read-only in 9A, nothing opens in 10A) |
| `PLAN_PIN` 12589 | sonam | Plan Mode (teaches no class) |
| `DISPOSABLE_*` | mandar | Change Password / PIN only |
| `PRINCIPAL_PIN` 25896 | satyajit.p | Plan Mode → Reports & Analytics |

sejal is no longer used (credentials removed; its Revision Test "AutoTest revision 60723" on 12A Physics cannot be
deleted from the app). sushant.mokal's PIN does not sign in.

## Data state on the server (matters for the next runs)

- **Checkpoints, 10A Science, topic "1.1 Baseline Test":** "Test - 3" (class map `checkpointTitle`) is paused and all 30
  students of 10A have signed in to it, so no new student can take it. "Test 4" (`scoreCheckpointTitle`) was taken by
  rolls 1–3 and is paused. One never-launched checkpoint ("Science Baseline Assessment", 19 Q) was used for the paper
  test (paper copy generated and conducted). Never-launched checkpoints still left: "test 2", "Science Baseline
  Assessment" (74 Q, 10 Q, 10 Q) — use one of these for any new student run (put its title in the class map).
- **Attendance 10A:** submitted several times on 8 Oct (final record probably roll 3 absent). One register per class per
  day, shared by all subjects.
- **Student test site:** http://172.18.2.85/student-test/ — a grade is listed only while a checkpoint is running for it.
  A roll number can sign in once per checkpoint ("Already logged In." / "You have already submitted this test").
- 12A Physics topic names are being edited on the server by someone (1.3 is now "dddd").

## What was tested this session (all live)

- Phases 0–2 for every module (Phase 2: 17 test fixes, rest are bugs); module videos for 01, 03–17.
- **Checkpoints (module 21, `tests/21-checkpoints/`):** CHK-01..04 flow (25/27 pass), CHK-05 principal report,
  CHK-06 edge cases (11/13), CHK-07 paper test (6/6), CHK-08 principal reports deep test (agent), CHK-09 score
  accuracy (6/6: student screen, teacher summary and principal report agree).
- **Attendance:** ATT-07..ATT-10 (agent) — data correctness, edit, reload, days, edge cases, non-class-teacher.
- **Players:** PLR-15 every player type (32 cases): 28/32 browser, 29/32 client.
- **Clear / Delete Whiteboard:** TB-05-09/10/12/13–16, WB-09-01/02 on scratch boards (9/9).

## CURRENT GOAL (owner, latest): a STABLE CORE SUITE first, deep edge cases later

Owner: first hand over a stable suite that tells whether everything works — pass = feature works, fail = it is broken —
with positive AND main negative cases; then go deep for edge cases. Start fresh (no known-bug list).
Core = tests tagged @smoke/@functional/@negative/@regression, excluding @long/@edge/@concurrency/@interruption/
@performance: 848 tests today + new Admin core tests (module 22, Admin panel http://172.18.2.85/admin/, creds .env ADMIN_*).
Steps: 1 define core (npm run core; mark the 47 team-agreed improvements in the stories so they skip) → 2 repeatable
(checkpoint tests create a fresh Revision Test per run; clean-up; server time-outs = environment) → 3 stabilise
(run core on 2 clients + browser; fix test problems; real app bugs stay failing with screenshot; flaky -> fix or out of
core with reason; repeat until two runs match) → 4 handover (README, HOW_TO_RUN, results page; commit on approval)
→ 5 later: edge/interruption/concurrency + exploration (notes in report/exploration/).
Open question to owner: should real app bugs fail in the core run (truthful) or be listed separately so core is green?
Process: CEPV2_Stories/PROCESS.md (new). Exploration agents for Teach and Plan were stopped early (notes saved);
Admin agent refocused on core admin stories.

## New deployment tested (8 Oct 18:46–20:05): build 0.0.236-WUQCZSIL — NO new issues

The version label stayed 0.0.236 but the Teach files changed (main-WUQCZSIL.js, 8 Oct 12:03 IST); `scripts/server-version.js`
now prints label + fingerprint. Final list: `report/FINAL_ISSUE_LIST_v0.0.236-WUQCZSIL.html/.xlsx` (13 still present,
1 no longer reproduces, 49 not retested) and `report/NEW_BUILD_CHECK_0.0.236-WUQCZSIL.html` (71 passed, 19 failed, all
known or timing). Checkpoint end to end works (twice); Plan Mode 35/36; reports all failures known; Teach smoke 15/15.
Paper test NOT rechecked on this build (its fresh test "AutoTest NB4" was started by a duplicate run). Fresh tests
left: none ("AutoTest NB1"–"NB4" all used) — create new ones with tools/exploration/create-revision-tests.spec.js
(REVISION_TITLES="…"). Lesson: never start Playwright with `&` inside a Bash call (orphans keep running); use
run_in_background, and check for leftover node playwright processes before rerunning.
Module journeys for this build were still running in the client (evidence/builds/v0.0.236-WUQCZSIL/).

## Paper test with real marks: DONE (CHK-14, `tests/21-checkpoints/chk-14-paper-test-one-sitting.spec.js`)

On "AutoTest NB2" in one sitting: upload accepted, teacher 30/30 avg 50%, principal 30 listed 50% overall — all match.
Screenshots in `report/paper-test/`. Needs a never-launched test each run (set PAPER_TITLE / PAPER_QUESTIONS).

## READY FOR THE NEXT BUILD (owner: about 30 minutes to test it; priority checkpoints, Teach + Plan, every report)

When the new build is on the server, run ONE command (takes ~30 min, three browser streams in parallel):

```
bash scripts/new-build-check.sh "AutoTest NB1" "2 Q'S"
```

- Stream 1 — checkpoint end to end on the fresh Revision Test "AutoTest NB1" (10A Science 3.4, raj.shinde): teacher
  starts it, all 30 students take it, roster + summary, principal report (CHK-13).
  Spare fresh test: "AutoTest NB3" (2 Q) — use it if NB1 is already used ("AutoTest NB2" was used for the paper test).
- Stream 2 — principal reports: CHK-05 + CHK-08 (every tab, downloads, filters, AfL Baseline/Revision).
- Stream 3 — Plan Mode: tests/10-plan-mode.
- Result: `report/NEW_BUILD_CHECK_<version>.html` (failures marked "known bug" if their test ID is already in the
  issue list, otherwise "NEW on this build") + `report/FULL_CLASS_TEST_newbuild-<version>.html`. Send both to the owner.
- `scripts/server-version.js` prints the build on the server (check it changed before running).
- A dry run of streams 2 and 3 on v0.0.236 is in `test-results-newbuild/dryrun` (baseline for comparison).

## Done: full-class reports (owner priority, 8 Oct afternoon)

Sent to the owner: `report/FULL_CLASS_TEST_2026-10-08.html` (1: mixed, 30 students, all match),
`..._2-revision-bands.html` (2: 10 pass / 10 half / 10 fail, all match), `..._4-all-pass.html` (4: 29 at 100%; principal
overall 97% because it divides by 30), `..._5-all-fail.html` (5: 29 at 0%). Created for 4 and 5: Revision Tests
"AutoTest All Pass" and "AutoTest All Fail" (2 Q each) on 10A Science 3.4 (raj.shinde). All 10A Science revision tests
and baseline checkpoints are now used by every student. New issues: concurrent student sign-in sometimes HTTP 500;
roster slow to show a submission. Spec options: FULL_CLASS_KIND / PATTERN (mixed, bands, allpass, allfail) / NAME /
TITLE / QUESTIONS / PRINCIPAL_TRIES / PARALLEL. Report 3 (baseline "test 2", remaining students) was not run.

### Original plan

All 30 students of Class 10A take the never-launched Revision Test "Test" (4 Q) in 10A Science 3.4 (raj.shinde),
then the teacher roster/summary and the principal's Revision report are compared per student. Spec:
`tests/21-checkpoints/chk-13-full-class.spec.js` (CHK-13); output `test-results-fullclass`; the report is written to
`report/FULL_CLASS_TEST_<date>.html` with screenshots in `report/full-class/` (its afterAll writes it even if a step
fails). Measured data: `chk-13-full-class.json` in the OS temp folder. If the session ends: rerun with
`RUN_IN_BROWSER=1 npx playwright test tests/21-checkpoints/chk-13-full-class.spec.js --output=test-results-fullclass --reporter=list`
(CHK-13-01/02 only once per test: each roll number can take a test once).

## Final status, 12:35 8 Oct — all agents reported; final issue list sent

- **Final issue list: 61 issues (8 High, 31 Medium, 22 Low), 18 to clarify** (`report/FINAL_ISSUE_LIST_v0.0.236.*`).
- Agent A: Revision Test (CHK-10, 10/11; principal Revision report shows 0 learners for 10–20 min, data appeared
  later), timer expiry (CHK-11: students not told time is up, checkpoint does not end itself; scores exact), CHK-06-02
  rerun on "test 2" passed (answers saved and counted) and CHK-06-03 reconfirmed the no-message bug (run with
  `CHK06_CHECKPOINT="title|questions"` to pick a checkpoint that still has free roll numbers; the class map's
  `edgeCheckpoint` (74 Q) is actually a started paper test and must be repointed). All 10A Science 1.1 checkpoints are
  now used; "test 2" still has about 23 free roll numbers. CHK-11 has a fix that was not run live (needs ~35 min on a fresh checkpoint).
- Data state now: Revision "Test2" (10A Science 3.4) PAUSED, rolls 1–3 submitted; "test 2" PAUSED; all 10A Science 1.1
  checkpoints used. New student runs need a new checkpoint (create one in Plan Mode or on another topic).
- raj.shinde and satyajit.p released for the owner after 12:30.

## Status at 12:15, 8 Oct

- Issue list: 57 issues (8 High, 28 Medium, 21 Low), 18 to clarify. Agents B (paper test) and C (reports) reported;
  their findings are in the list. Agent A (Revision Test, timer, CHK-06 rerun) asked to report by 12:25.
- Paper test: `checkpoints.paperCheckpoint` now points at a 10 Q "Science Baseline Assessment"; both 10 Q ones and the
  19 Q one are now conducted paper tests stuck without the register steps (the High bug), so no paper checkpoint is
  left for CHK-12 until the bug is fixed. CHK-12 spec can start a never-launched checkpoint itself.
- Two desktop clients can run side by side: set `CLIENT_USER_DATA_DIR` for the second one (fixtures/electron-app.js).
- The machine (8 cores, 16 GB) saturates with three browser agents; do not add more parallel runs than that.
- The owner was told raj.shinde and satyajit.p are in use until 12:30; release them after.

## In progress (started 2026-10-08, owner approved; three agents in parallel, browser only)

| Agent | Output folder | Work | Reserved data |
| --- | --- | --- | --- |
| A | `test-results-agentA` | Revision Test end to end (new CHK-10, `chk-10-revision-test.spec.js`), then timer expiry (CHK-11, `chk-11-timer.spec.js`, ~35 min wait), then CHK-06-02/03 rerun on a fresh checkpoint | `compassRevisionTest` (10A Science 3.4 / 3.6); `checkpoints.timerCheckpoint` ("test 2", 10 Q); `checkpoints.edgeCheckpoint` ("Science Baseline Assessment", 74 Q). Only agent A runs live checkpoints in 10A |
| B | `test-results-agentB` | Paper test with real marks: fill and upload the Excel register, check the teacher summary and the principal report, plus negative uploads (new CHK-12, `chk-12-paper-marks.spec.js`) | `checkpoints.paperCheckpoint` ("Science Baseline Assessment", 19 Q, already conducted) |
| C | `test-results-agentC` | Reports gaps: right-panel cards, invalid export date ranges, concept % teacher vs principal ("Test - 3", "Test 4", read only), rerun CHK-08-11/27, Revision tab once agent A has data (CHK-08-34 onwards) | Read only |

The reserved checkpoints are recorded in `config/moduleClassMap.js` ('checkpoints' entry). When an agent reports back:
add its new bugs to the bug tables in `report/SIGNOFF_v0.0.236.html` (with screenshots in `evidence/issues/`), run
`node scripts/build-issue-list.js v0.0.236` and `node scripts/build-workbook.js`, send the owner the updated issue
list, and update this file (data state: which checkpoints were launched / ended). If the session ended before the
agents reported, rerun their specs (`RUN_IN_BROWSER=1 npx playwright test tests/21-checkpoints/chk-1[0-2]*
--output=test-results-chk`) and check `evidence/issues/` for new screenshots from them.

## Next (after the agents)

Remaining checkpoint and report gaps (now being done by the agents above):

1. Revision Test checkpoint end to end (Teach Mode Compass → Revision Tests; class map `compassRevisionTest` = 10
   Science 2.3), students, teacher result, principal report "Revision" tab.
2. Paper test steps 3–4 with real marks: fill the downloaded Excel register, upload it, check teacher and principal
   results.
3. Timer expiry: what happens to students still answering when the checkpoint time ends.
4. Rerun CHK-06-02 on a fresh checkpoint.
5. Reports: right-panel cards (Real-time Dashboard, Custom Reports, Data Export); "Export Another Report" with end date
   before start date; concept % teacher vs principal; rerun CHK-08-11 and CHK-08-27.

Also waiting on the owner:

- Verdicts on the issue list (the "Your verdict" column).
- Whether to mark the 47 improvements as "improvement" in the stories (so their tests skip).
- Questions in "To clarify": one attendance register per class per day; build stamp in the attendance panel; no close
  button while a checkpoint runs; whether AI Assist staying open after a class switch is covered by the excluded item.
- When to commit.

## How to run (quick)

```
npx playwright test tests/16-attendance                                         # Teach Mode, desktop client
RUN_IN_BROWSER=1 npx playwright test tests/21-checkpoints --output=test-results-chk   # browser, own output folder
node scripts/build-issue-list.js v0.0.236                                        # regenerate the issue list
node scripts/build-workbook.js                                                   # regenerate the master workbook
```

Gotchas: only one desktop-client run at a time; each concurrent browser run needs its own `--output`; bash heredocs
strip backslashes from regexes — write files with the Write/Edit tools; `isVisible()` does not wait (use
`expect(...).toBeVisible()` or `waitFor`); after a test failure Playwright starts a new worker, so tests must not rely
on variables set by earlier tests (CHK-09 shares state through a temp JSON file instead).
