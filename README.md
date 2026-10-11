# CEP v2 automation suite

Playwright (JavaScript) end-to-end suite for Tata ClassEdge CEP v2: Teach Mode in the desktop client, Plan Mode,
Checkpoints and the student test site, principal reports, and (last) the school Admin panel. Target: the Ultra server
`http://172.18.2.85`.

**A pass means the feature works for the customer; a fail means it is broken.** Known product bugs make their tests
fail (they are never hidden); missing test data is reported as DATA MISSING, network trouble as ENVIRONMENT.

## Where things are

| What                                                    | Where                                                                                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| User stories and test cases (source of truth)           | `CEPV2_Stories/` — `00_EndToEndFlows.md` (every feature end to end) and modules `01`–`22`; process in `CEPV2_Stories/PROCESS.md` |
| Master workbook (one row per case, status, last result) | `CEPV2_Stories/CEPV2_TestCases.xlsx` (`node scripts/build-workbook.js`)                                                          |
| Review page (filter cases, add suggestions)             | `report/TEST_CASES_REVIEW.html` (`npm run review:page`; suggestions back with `npm run review:merge -- <file>`)                  |
| Tests                                                   | `tests/00-flows` (end-to-end flows), `tests/01-…` to `tests/21-…` (modules), `client-automation/` (desktop client shell)         |
| Page objects and helpers                                | `pages/`, `fixtures/`, `config/moduleClassMap.js` (which class each module uses)                                                 |
| Exploration findings (phase 1)                          | `report/exploration/PHASE1_SUMMARY.md`, `report/exploration/flows.md`, screenshots `evidence/issues/`                            |
| Progress, decisions, handoff                            | `PROGRESS.md` (read first)                                                                                                       |

How to run: see [HOW_TO_RUN.md](docs/HOW_TO_RUN.md).

## Folder structure

```
CEPV2_Stories/          user stories and test cases per module (source of truth), PROCESS.md, CEPV2_TestCases.xlsx
tests/                  automated tests — 00-flows (end-to-end), 01…22 one folder per module
client-automation/      desktop-client shell tests (launch, profiles, settings)
pages/                  page objects (one per screen / feature) and pages/lib helpers
fixtures/               Playwright fixtures (desktop client launch, signed-in user, fresh board space)
config/                 environment and class map (which class/account each module uses)
scripts/                tooling: run core suite, re-run failures, build workbook / review page / bug list, review
tools/exploration/      one-off exploration probes (never part of a normal run; `npm run explore -- <file>`)
test-data/              upload files used by the Resources / DropIt tests (generated; not in git)
docs/                   HOW_TO_RUN.md, REVIEW_NOTE.md, handoff/ (brief for anyone continuing the work)
report/                 local reports (not in git): bugs/ (BUG_LIST.html + screenshots, failure lists),
                        exploration/, review/, signoff/, stories/, TEST_CASES_REVIEW.html
evidence/issues/        issue screenshots (not in git)
test-results/           run output (not in git): core/ (current runs), archive/ (older runs)
PROGRESS.md             decisions, work log and handoff — read first
```

## Rules the suite keeps (do not break them)

- Never clear or erase a teacher's board. Tests write below the existing content (`freshSpace`) or on the scratch
  boards 9A Science 8.2 / 9.2.
- Admin panel is a live school: tests change only teachers they create ("AutoQA …"); Sync is allowed; terminals,
  import and deletions stay manual.
- Password / PIN changes only on the disposable account or AutoQA teachers. PINs are unique across the school.
- `.env` holds accounts and passwords: never commit or print it (`.env.example` lists the keys).
