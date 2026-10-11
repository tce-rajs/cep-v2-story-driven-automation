# CEP v2 — Testing process

How this suite is built and kept. Goal: **a customer never meets an issue we could have found**, and **every result can
be trusted — a pass means it works, a fail means it is broken.**

Scope: all of CEP v2 — Teach Mode (desktop client), Plan Mode, Checkpoints and the student test site, the principal's
Reports & Analytics, and the Admin panel (`<server>/admin/`).

## The five phases

### 1. Explore as the real users
Walk through every screen as each person who uses it, and as the customer who bought it:

| Persona | Typical day |
| --- | --- |
| Teacher | Signs in at the panel, teaches from the board and Playlist, runs a checkpoint, takes attendance, sends a notice or homework, signs out |
| Student | Signs in on the student test site with a roll number, takes a checkpoint, sees the result |
| Principal | Opens Plan Mode → Reports & Analytics, follows usage and Assessment for Learning |
| School admin | Manages the school in the Admin panel: users, classes, subjects, settings |
| Customer | Checks that what was promised works end to end, with real school data and real habits |

Write every finding in the exploration log (`report/exploration/<area>.md`) with a screenshot in `evidence/issues/`.

**Look for what nobody thinks to test** (the bug-hunting checklist):
- **Timing:** act at the worst moment — during a save, an upload, a countdown, a class switch, a sign-out.
- **Repetition:** double and triple clicks, the same action twice, the same student twice, two tabs.
- **Order:** steps out of order, Back in the middle, reload mid-flow, closing and reopening.
- **Data:** empty, one, many (30, 100, 10,000), very long text, Hindi/Marathi, emoji, special characters, leading zeros.
- **Consistency:** the same number on every screen that shows it (student, teacher, principal, admin, downloads).
- **State:** what survives a reload, a sign-out, a new day, another device, a new build.
- **Roles:** a user without the right (non-class teacher, plain teacher in reports, student), a deleted or changed user.
- **Network:** offline, slow, dropping in the middle, a server error, the server restarting.
- **Time:** midnight, month end, a wrong computer clock, a long session.
- **Feedback:** every failure tells the user; nothing claims success that did not happen; no raw text, `undefined`, `NaN`.

### 2. Write user stories and test cases
- One file per module in `CEPV2_Stories/` (`NN_Module.md`), listed in `INDEX.md`.
- A **story** is `### <ID> — <Title>` with a user story ("As a …, I want …, so that …") and acceptance criteria.
- A **test case** is a numbered line under its story: `N. <ID>-NN — To check …`, prefixed `Negative:`, `Edge:`,
  `Interruption:`, `Concurrency:`, `Regression:` or `Performance:` where it applies.
- **One test case = one expected result.** If a case says "and", split it.
- Cases out of scope say so at the end: `_(improvement: …)_`, `_(not supported: …)_`, `_(not applicable: …)_`.
- No dates, owners or bug notes in story files; bugs live in the issue list.
- Rebuild the workbook after every change: `node scripts/build-workbook.js`.

### 3. Automate — built for trust
- One spec per story (`tests/NN-module/<story>.spec.js`); test titles start with the case ID.
- Locators and actions live in page objects (`pages/`); specs hold the steps and assertions only.
- **No false pass:** assert the real outcome — the data saved (after a reload), the server's response, the same value
  on every screen — never only that a button is visible.
- **No false fail:**
  - each run creates its own data (fresh tests, scratch boards) and cleans up;
  - waits are on conditions, never on fixed sleeps alone;
  - server time-outs are reported as *environment*, not as app bugs.
- **Prove each new test:** before a test is accepted, show it fails when the behaviour is broken (run it against a known
  bug, a blocked request, or a deliberately wrong expected value) and passes when it works.
- **Bugs stay visible:** a test always asserts the correct behaviour; a failure is never hidden or marked expected in
  the spec, so a fix turns it green on its own.
- What cannot be automated safely becomes a manual case with clear steps (`manual` in the workbook).
- Safety: never clear a teacher's board (scratch topics only), real actions only on agreed accounts, no security or
  abuse testing.

### 4. Run, triage, report
- Daily: smoke + journeys + critical flows (checkpoint end to end, reports). Release: full regression in parallel
  (two desktop clients + browser).
- Every failure is one of: **app bug** (screenshot to `evidence/issues/`, added to the issue list) or **environment**
  (server not reachable; rerun).
- A run is trusted when two runs in a row on the same build give the same result.
- Outputs: results page, final issue list (HTML + Excel), build-labelled videos.

### 5. Hand over and maintain
- The QA handbook (`README.md`, `HOW_TO_RUN.md`) lets a new team member set up and run the suite alone.
- Keep stories, workbook, specs and the issue list in step; commit only on approval.
