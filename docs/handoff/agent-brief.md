# Shared brief for automation agents (CEP v2 suite) — read fully before writing code

Repo: D:\Projects\verification\cep-v2-story-driven-automation (Playwright JS, CommonJS). Server: Ultra server http://172.18.2.85.
Goal: automate the user-story test cases whose workbook status is "To automate", for YOUR assigned scope only.

## Read first
- CEPV2_Stories/PROCESS.md (phase 3 rules: pass = works, fail = broken; no false pass/fail; never hide a bug in a test).
- The story file(s) for your scope in CEPV2_Stories/ (each case line: `N. ID — [Prefix:] To check …`).
- 2–3 existing specs in the same module folder under tests/ and the page objects in pages/ (reuse them; add methods to page objects only if needed, keep their style).
- fixtures/index.js (`user` = signed-in App on the module's classMap; `app` = not signed in; `test.use({ classMap: '<key>' })`, `freshSpace: true` to write below a teacher's content), config/moduleClassMap.js.
- report/exploration/flows.md and report/exploration/PHASE1_SUMMARY.md for what the app really does (selectors, known bugs).
- tools/exploration/*.js — exploration scripts with working selectors (Admin sign-in with the school autocomplete, calendar date picking, AI notices capture, every-class loops, attendance, etc.).

## How to write tests
- One test per case; title starts with the exact case ID: `'ADM-10-14: …'`. Tags: `@smoke` (main happy path), `@functional`, `@negative` (cases prefixed Negative:), `@regression`; Deep cases (Edge/Interruption/Concurrency/Performance) get `@edge`/`@interruption`/… and are lower priority.
- Assert the expected result of the case, nothing looser. A known product bug must make the test FAIL (no test.fail, no skipping because of a bug).
- Missing test data → throw an Error whose message starts with `DATA MISSING ON THIS SERVER:`. Server unreachable → `ENVIRONMENT:` only for real network errors.
- Cases marked `_(improvement…)_`, `_(not applicable…)_`, Manual, or _Hand-off_ (Crystal) are NOT automated.
- Match surrounding code: comment density, naming, idiom. Run `npx prettier --write <files>` and `npx eslint <files>` (0 errors).
- Verify with `npx playwright test <your files> --list` (titles listed, no load errors).

## Safety rules (hard)
- NEVER clear or erase a teacher board. Write only with `freshSpace: true` (below existing content) or on the scratch boards (classMap scratchBoard / scratchBoard2 = 9A Science 8.2 / 9.2). Never write on 12A Physics 1.2/1.6–1.10, 7A Value Education 1.1, 7A Mathematics 1.1, 12A CS 7.2/8.1/8.2.
- Admin panel is a live school: create/edit/reset/extend ONLY on teachers your test creates (names starting "AutoQA "); never touch other users; Sync is allowed (watch it to the end); Add/Delete terminal, import, delete grades/subjects: NOT automated (manual).
- Change password/PIN only on the disposable account (DISPOSABLE_* in .env) or an AutoQA teacher. PINs are school-wide unique: generate a unique 5-digit PIN per run.
- No security/abuse testing. Never print or commit .env values. Do not commit or push. Do not edit PROGRESS.md, the workbook, or files outside your scope (except adding page-object methods).

## Running tests
- The desktop client has ONE profile and is in use by the coordinator. Do NOT run client tests (default mode).
- Browser-only areas (Plan Mode tests/10, Checkpoints tests/21, Admin tests/22) may be run with `RUN_IN_BROWSER=1 npx playwright test <files> --output=test-results-agent-<name>` — always a separate --output folder; never start runs with `&`; at most one run at a time per agent.
- Admin tests are plain browser pages: you may use `test` from '@playwright/test' with your own sign-in helper (copy the working logic from tools/exploration/admin-explore-lib.js into a page object pages/admin.page.js).

## Report back (final message)
List of files created/changed, number of tests per case ID range, which you ran and their results (pass/fail with one-line reason), and anything you could not automate (with why).
