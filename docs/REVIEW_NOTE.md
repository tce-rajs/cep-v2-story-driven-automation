# CEP v2 automation — project review note (10 Oct 2026)

For the owner to review before sign-off. Scope: every user story, test case and test file, the tooling, and the
folder structure. Method: an automated checker (`npm run review:project` → `report/review/REVIEW_FINDINGS.json`),
then each flagged item read by hand (the checker over-flags; only confirmed items are listed below).

## 1. Verdict

| Area               | Result                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User stories (215) | Meet the agile standard: every story has "As a … I want … so that …", acceptance criteria and test cases. 2 reworded (XC-03, ADM-17).                                                                                                             |
| Test cases (1,925) | Meet common practice (ISO/IEC/IEEE 29119-3 essentials): unique ID, one expected result in "To check …" form, type, suite, **priority (new)**, automation status with reason, **traceability to the test file (new)**, last result. Backlog below. |
| Automation         | 1,655 of 1,925 automated; **0 left to automate** — every other case has a recorded reason (improvement 99, out of scope 53, manual 9, skipped 109).                                                                                               |
| Test code          | 0 lint errors. No `test.only`, no `test.fail`, no test without an assertion (all 22 the checker flagged assert through helpers), no hard-coded secrets.                                                                                           |
| Folder structure   | Reorganised (section 4). Every config, script and link updated; all test lists load.                                                                                                                                                              |

## 2. Mistakes found and fixed

| #   | Mistake                                                                                                                             | Fix                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Exploration probes lived in `tests/_probe`, so a plain `npx playwright test` also ran them (some create data, e.g. Revision Tests). | Moved to `tools/exploration/`; run only with `npm run explore -- <file>` (`playwright.explore.config.js`).                                                               |
| 2   | `npm run core` never started on Windows (the `                                                                                      | ` in the tag filter was read as a pipe).                                                                                                                                 | Filters quoted (`scripts/run-core.js`). |
| 3   | Module 02 PIN typing dropped digits; NEW-02-02/03 passed while the PIN was not saved (false pass).                                  | Each box tapped and checked; NEW-02-03 signs out first. Passes 8/8 on a fresh teacher.                                                                                   |
| 4   | Learning Shorts failures were filed as ENVIRONMENT, hiding a real product failure (nothing records over http).                      | Reported as a product failure.                                                                                                                                           |
| 5   | The suite used one class per feature and missed failures in the teacher's other classes (Homework 5/9, Attendance 3/9).             | Every-class tests (`tests/00-flows/flow-17-19-every-class.spec.js`).                                                                                                     |
| 6   | Class-switch clicks had 4 s time-outs; under load 45 tests failed in set-up, not on the feature.                                    | Raised to 15 s (`pages/navigation.page.js`); 22 of those then passed.                                                                                                    |
| 7   | Desktop-client tests waited a fixed 4 s for the teach window.                                                                       | Poll up to 30 s; all 12 pass.                                                                                                                                            |
| 8   | Checkpoint tests reported FAILED when every student had already used the running checkpoint.                                        | Reported as DATA MISSING; fresh Revision Test helper added.                                                                                                              |
| 9   | 8 Teach↔Plan round-trip cases still marked "excluded from automation" although Plan Mode is now in scope.                           | 6 automated (all pass: `tests/07-class-navigation/nav-teach-plan-roundtrip.spec.js`); HDR-05-05 and PL-05-02 marked with reasons.                                        |
| 10  | 456 case lines not in the expected-result form; outdated notes ("Plan Mode, excluded from automation"); "on a image".               | Normalised to "[Prefix: ]To check …"; notes removed; grammar fixed.                                                                                                      |
| 11  | Admin ↔ classroom checks (ADM-18-05/10, FLOW-24-05) not automated.                                                                  | Automated (`tests/00-flows/flow-24-admin-vs-classroom.spec.js`); ADM-18-05 finds a real mismatch ("Early Childhood Education" offered in Teach Mode, absent from Admin). |
| 12  | `tools/` was not linted; ANSI-colour regex tripped the linter.                                                                      | Added to `eslint.config.js`; regex documented.                                                                                                                           |
| 13  | AIR card (owner: out of scope) still tested.                                                                                        | PLR-01-02/14/23 marked out of scope; tests and helper removed.                                                                                                           |

## 3. Open items (recommendations, not blockers)

| Item                            | Detail                                                                                                                                                                                     | Suggestion                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Vague wording                   | 97 cases say "displays correctly / properly" although their tests check precise things. List: `report/review/REVIEW_FINDINGS.json`.                                                        | Reword to the precise expected result in one pass.                                  |
| Long cases                      | 20 cases may check two results in one line.                                                                                                                                                | Split when next touched (one case = one result).                                    |
| Stories without a negative case | 18, mostly read-only screens (Admin dashboard/reports, build version, playlist list).                                                                                                      | Add one negative where an input exists (ADM-05/06/13, PL-03, HDR-06, RSL-04/06/07). |
| Loose check                     | AIN-03-02 accepts "Send disabled" OR "current class stays ticked".                                                                                                                         | Decide the intended behaviour, then assert only that.                               |
| Two tests, one ID               | FLOW-03-03 runs a wrong-PIN and a wrong-password test under one ID.                                                                                                                        | Split the case into FLOW-03-03a/b.                                                  |
| New tests run once              | Flows, resilience, desktop client, cross-cutting, Plan Mode, Checkpoints, Admin tests were written and first run on 9–10 Oct. Part of their 204 "confirmed" failures can be test mistakes. | Triage before reporting them as product bugs (about 2–3 h).                         |
| Test data on real topics        | Earlier runs left uploads (board-photo, worksheet-3-pages, DropIt-*) on 9A Science 4.1 and AutoTest Revision Tests on 10A Science 3.4 (cannot be deleted, known #16).                      | Clean the playlist uploads; use a dedicated topic for created data.                 |

## 4. Folder structure (after the review)

```
CEPV2_Stories/   stories + cases per module, PROCESS.md, CEPV2_TestCases.xlsx (now with Priority and Spec file)
tests/           00-flows + one folder per module (01…22) — the suite
client-automation/  desktop-client shell tests
pages/ fixtures/ config/   page objects, fixtures, class map
scripts/         run, re-run failures, workbook, review page, bug list, project review
tools/exploration/  probes (never in a normal run)
docs/            HOW_TO_RUN.md, REVIEW_NOTE.md, handoff/agent-brief.md
report/          bugs/ (BUG_LIST.html + screenshots), exploration/, review/, signoff/, stories/, TEST_CASES_REVIEW.html
test-results/    core/ (current runs), archive/ (older runs) — not in git
```

## 5. Where to look

- Bugs with screenshots: `report/bugs/BUG_LIST.html` (14 hand-found, 204 confirmed twice, 82 seen once).
- Every case, filterable, with suggestion boxes: `report/TEST_CASES_REVIEW.html`; workbook `CEPV2_Stories/CEPV2_TestCases.xlsx`.
- How to run: `docs/HOW_TO_RUN.md`. History and decisions: `PROGRESS.md`.

Nothing is committed yet (waiting for the owner's approval).
