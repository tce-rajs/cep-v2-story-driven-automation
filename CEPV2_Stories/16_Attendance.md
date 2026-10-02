# 16 — Attendance

Covers taking the class's attendance (Magnet → Attendance): opening the roster, marking students, submitting and
editing, leaving part-way through, and Play Attendance's roll call. Module code: `ATT`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

Added 2026-09-26 from the reference suite (`new approch playwright`, Attendance workbook, 36 cases; Attendance also
has the most Zoho bugs: 91). Attendance only appears for a class teacher, so these cases use the
`ATTENDANCE_MAIN_PIN` account. Marks are real: they create today's attendance record for that class and a marked
student can't be put back to "unmarked" (approved by the owner, 2026-09-26).

### ATT-01 — Open the attendance register

**User story:** As a teacher, I want to open today's attendance register, so that I can take attendance.

**Acceptance criteria:**

- AC1: Magnet shows Attendance with today's status
- AC2: The roster opens (no endless spinner), once
- AC3: Switching class while loading leaves nothing stuck

1. ATT-01-01 — To check the Magnet menu shows Attendance with today's status badge ("Pending" before attendance is taken)
2. ATT-01-02 — Regression: opening Attendance shows the class roster, instead of hanging on a loading spinner with no way out
3. ATT-01-03 — Edge: to check opening Attendance twice in quick succession opens only one register
4. ATT-01-04 — Regression: switching class while Attendance is still loading doesn't leave the register stuck over the new class

### ATT-02 — Mark students present or absent

**User story:** As a teacher, I want to mark students present or absent quickly, so that attendance takes seconds.

**Acceptance criteria:**

- AC1: Tapping toggles a student
- AC2: Mark All Present and dragging across roll numbers mark present
- AC3: The summary counts match the marks

1. ATT-02-01 — To check tapping a present student marks them absent
2. ATT-02-02 — To check Mark All Present marks every student present
3. ATT-02-03 — To check dragging a finger (or the mouse) across the roll numbers marks every student dragged over as present, as the on-screen hint says
4. ATT-02-04 — To check the summary table's present and absent counts match the marks on the roster
5. ATT-02-05 — Edge: to check every student can be marked absent
6. ATT-02-06 — To check tapping an absent student marks them present again _(split from ATT-02-01, 2026-09-28)_
7. ATT-02-07 — Edge: to check that with every student marked absent, the summary shows nobody present _(split from ATT-02-05, 2026-09-28)_

### ATT-03 — Submit and edit attendance

**User story:** As a teacher, I want to submit and later edit attendance, so that the record is right.

**Acceptance criteria:**

- AC1: Submit saves once and the badge stops showing Pending
- AC2: Edit reopens with the saved marks

1. ATT-03-01 — To check Submit saves the attendance, and reopening the register shows the same marks
2. ATT-03-02 — To check after submitting, Edit Attendance reopens the register with the previous marks already filled in
3. ATT-03-03 — Regression: double-clicking Submit records the attendance only once
4. ATT-03-04 — Regression: after submitting, the Magnet badge no longer shows "Pending" (Zoho TCN-I15965, TCN-I15969)
5. ATT-03-05 — Concurrency: to check two teachers submitting attendance for the same class at the same time end with one record, and the second is told _(added 2026-09-30, gap analysis)_
6. ATT-03-06 — Concurrency: to check attendance submitted on the panel shows as submitted when the register is opened on a laptop _(added 2026-09-30, gap analysis)_

### ATT-04 — Leave before submitting

**User story:** As a teacher, I want to leave the register safely before submitting, so that I don't lose or corrupt marks.

**Acceptance criteria:**

- AC1: Closing asks first and Cancel keeps the marks
- AC2: Reload or class switch leaves one clean, working register

1. ATT-04-01 — To check closing the register as the class teacher asks for confirmation first
2. ATT-04-02 — To check Cancel in that confirmation keeps the register open with the marks untouched
3. ATT-04-03 — Regression: confirming the close part-way through shows no error (Zoho TCN-I16577)
4. ATT-04-04 — To check reloading the app before submitting brings Attendance back to one clean, usable state
5. ATT-04-05 — To check switching class before submitting leaves no register behind
6. ATT-04-06 — Regression: after confirming the close part-way through, the register opens normally again (Zoho TCN-I16577) _(split from ATT-04-03, 2026-09-28)_
7. ATT-04-07 — To check that after switching class before submitting, the original class's Attendance still opens normally _(split from ATT-04-05, 2026-09-28)_

### ATT-05 — Play Attendance (roll call)

**User story:** As a teacher, I want Play Attendance to call students one by one, so that roll call is engaging.

**Acceptance criteria:**

- AC1: Students are called in turn with a progress ring
- AC2: Speed can be changed
- AC3: Birthdays get a popup
- AC4: Stopping part-way leaves nothing behind

1. ATT-05-01 — To check Play Attendance calls students one by one in the carousel, with the progress ring moving forward
2. ATT-05-02 — To check changing the speed changes how fast students are called
3. ATT-05-03 — To check a student whose birthday is today gets a birthday popup during the roll call (needs a student with today's birthday)
4. ATT-05-04 — To check closing Play Attendance part-way through leaves no carousel behind and the register still works _(added 2026-09-30 for the acceptance criteria)_

### ATT-06 — Submitting attendance when the network fails (added 2026-09-27)

**User story:** As a teacher, I want to be told when attendance fails to submit, so that I can submit it again.

**Acceptance criteria:**

- AC1: A failed submit says so and the register stays open with my marks
- AC2: Retrying submits exactly once

1. ATT-06-01 — Negative: a failed submit tells the teacher it was not submitted
2. ATT-06-02 — Negative/Regression: after a failed submit, submitting again once the network is back submits exactly once
3. ATT-06-03 — Negative: after a failed submit the register stays open (it does not close as if submitted) _(split from ATT-06-01, 2026-09-28)_
4. ATT-06-04 — Negative: after a failed submit the marks the teacher made are kept _(split from ATT-06-01, 2026-09-28)_
