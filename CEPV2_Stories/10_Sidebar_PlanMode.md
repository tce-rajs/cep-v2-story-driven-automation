# 10 — Sidebar (Plan Mode)

Covers Content Library, Question Bank, Code Editor, Checkpoint, and Reports & Usage.
Module code: `SB`. **Out of scope for automation entirely.** This module isn't
automated or tested in its own right — its only role going forward is as the Plan Mode
side of a Teach↔Plan switching check (e.g. `04_Header.md` HDR-07, or the Cross-Mode
round-trip cases in other modules). Kept here as manual-only reference documentation,
per [PROCESS.md](PROCESS.md)'s "Automation scope" section. Each `### <ID> — <Title>` is
a **story**; each numbered line under it is a **test case** belonging to that story.

### SB-01 — Content Library

**User story:** As a teacher planning a lesson, I want to browse the Content Library, so that I can pick resources for the topic.

**Acceptance criteria:**

- AC1: The library lists the topic's content
- AC2: An empty topic shows a message

1. SB-01-01 — To check the Content Library panel opens and lists available content correctly
2. SB-01-02 — Negative: to check a topic with no available content shows an appropriate empty state, not a blank panel

### SB-02 — Question Bank

**User story:** As a teacher planning a lesson, I want to build a quiz from the question bank, so that I can test my class.

**Acceptance criteria:**

- AC1: Questions from several topics are collected under View Selected, once each
- AC2: A titled quiz appears in the Playlist
- AC3: An empty quiz is blocked

1. SB-02-01 — To check selecting questions from the bank across multiple chapters/topics adds them under "view selected"
2. SB-02-02 — To check assigning a title to a quiz built from selected questions displays that title in Playlist
3. SB-02-03 — To check attempting to confirm a quiz with zero questions selected is blocked with a message
4. SB-02-04 — To check deselecting a previously selected question removes it from "view selected"
5. SB-02-05 — Negative: to check selecting the same question twice doesn't add a duplicate entry under "view selected"

_(Attempting and reviewing the quiz this builds is covered in `11_Players.md`, PLR-01 — this story is only about building it.)_

### SB-03 — Code Editor

**User story:** As a teacher planning a lesson, I want a Code Editor with templates, so that I can prepare coding examples.

**Acceptance criteria:**

- AC1: A template runs and my code is saved
- AC2: The code appears in Teach Mode too
- AC3: Large code and double Run are handled

1. SB-03-01 — To check the Code Editor is present for every chapter and a template executes correctly
2. SB-03-02 — To check written code saves/generates correctly
3. SB-03-03 — Regression: Code Editor content created in Plan Mode appears correctly in Teach Mode, and vice versa
4. SB-03-04 — Performance: pasting several thousand lines into the Code Editor doesn't crash it
5. SB-03-05 — Regression: double-clicking Run/Rerun doesn't cause a duplicate execution

### SB-04 — Checkpoint

**User story:** As a teacher planning a lesson, I want to create a checkpoint test when one is assigned, so that I can assess the topic.

**Acceptance criteria:**

- AC1: Create Test is enabled only when a checkpoint is assigned
- AC2: The test appears in Teach Mode too

1. SB-04-01 — To check the "Create Test" button is enabled when a checkpoint is properly assigned
2. SB-04-02 — To check "Create Test" is correctly disabled for unassigned/no-checkpoint cases
3. SB-04-03 — Regression: a Checkpoint test created in Plan Mode appears correctly in Teach Mode, and vice versa

### SB-05 — Reports & Usage (for principal/Admin, incl. AFL report)

**User story:** As a principal or admin, I want usage and AFL reports, so that I can follow teaching and learning in the school.

**Acceptance criteria:**

- AC1: Report values match the source data
- AC2: Teachers cannot open the admin view
- AC3: No activity shows an empty state

1. SB-05-01 — To check a generated AFL report's values match the source assessment/attendance data
2. SB-05-02 — To check the AFL report is reachable and correct from both Compass and the Magnet entry point
3. SB-05-03 — Regression: "Reports-Usage/Dashboard" issues don't recur
4. SB-05-04 — Negative: a teacher (non-admin) account cannot access the principal/admin usage view — blocked, not just visually deemphasized
5. SB-05-05 — To check a school with zero recorded activity shows an appropriate empty state, not an error
