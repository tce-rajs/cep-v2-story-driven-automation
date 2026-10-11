# 16 — Attendance

Covers taking the class's attendance (Magnet → Attendance): opening the roster, marking students, submitting and
editing, leaving part-way through, and Play Attendance's roll call. Module code: `ATT`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

`ATTENDANCE_MAIN_PIN` account. Marks are real: they create today's attendance record for that class and a marked
student can't be put back to "unmarked".

### ATT-01 — Open the attendance register

**User story:** As a teacher, I want to open today's attendance register, so that I can take attendance.

**Acceptance criteria:**

- AC1: Magnet shows Attendance with today's status
- AC2: The roster opens (no endless spinner), once
- AC3: Switching class while loading leaves nothing stuck

1. ATT-01-01 — To check the Magnet menu shows Attendance with today's status badge ("Pending" before attendance is taken)
2. ATT-01-02 — Regression: to check opening Attendance shows the class roster, instead of hanging on a loading spinner with no way out
3. ATT-01-03 — Edge: to check opening Attendance twice in quick succession opens only one register
4. ATT-01-04 — Regression: to check switching class while Attendance is still loading doesn't leave the register stuck over the new class
5. ATT-01-05 — Negative: to check Attendance is not offered in Magnet for a class where the teacher is not the class teacher

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
6. ATT-02-06 — To check tapping an absent student marks them present again
7. ATT-02-07 — Edge: to check that with every student marked absent, the summary shows nobody present
8. ATT-02-08 — Negative: to check tapping the same student twice brings them back to their first state

### ATT-03 — Submit and edit attendance

**User story:** As a teacher, I want to submit and later edit attendance, so that the record is right.

**Acceptance criteria:**

- AC1: Submit saves once and the badge stops showing Pending
- AC2: Edit reopens with the saved marks

1. ATT-03-01 — To check Submit saves the attendance, and reopening the register shows the same marks
2. ATT-03-02 — To check after submitting, Edit Attendance reopens the register with the previous marks already filled in
3. ATT-03-03 — Regression: to check double-clicking Submit records the attendance only once _(improvement: a double click sends, submits or generates once)_
4. ATT-03-04 — Regression: to check after submitting, the Magnet badge no longer shows "Pending"
5. ATT-03-05 — Concurrency: to check two teachers submitting attendance for the same class at the same time end with one record, and the second is told
6. ATT-03-06 — Concurrency: to check attendance submitted on the panel shows as submitted when the register is opened on a laptop
7. ATT-03-07 — Negative: to check Submit is not possible before the register is reviewed

### ATT-04 — Leave before submitting

**User story:** As a teacher, I want to leave the register safely before submitting, so that I don't lose or corrupt marks.

**Acceptance criteria:**

- AC1: Closing asks first and Cancel keeps the marks
- AC2: Reload or class switch leaves one clean, working register

1. ATT-04-01 — To check closing the register as the class teacher asks for confirmation first
2. ATT-04-02 — To check Cancel in that confirmation keeps the register open with the marks untouched
3. ATT-04-03 — Regression: to check confirming the close part-way through shows no error
4. ATT-04-04 — To check reloading the app before submitting brings Attendance back to one clean, usable state
5. ATT-04-05 — To check switching class before submitting leaves no register behind _(improvement: panels close when the class is switched)_
6. ATT-04-06 — Regression: to check after confirming the close part-way through, the register opens normally again
7. ATT-04-07 — To check that after switching class before submitting, the original class's Attendance still opens normally
8. ATT-04-08 — Negative: to check cancelling the close confirmation keeps the register open with every mark

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
4. ATT-05-04 — To check closing Play Attendance part-way through leaves no carousel behind and the register still works
5. ATT-05-05 — Negative: to check pausing Play Attendance stops the roll call on the current student

### ATT-06 — Submitting attendance when the network fails

**User story:** As a teacher, I want to be told when attendance fails to submit, so that I can submit it again.

**Acceptance criteria:**

- AC1: A failed submit says so and the register stays open with my marks
- AC2: Retrying submits exactly once

1. ATT-06-01 — Negative: to check a failed submit tells the teacher it was not submitted
2. ATT-06-02 — Negative/Regression: to check after a failed submit, submitting again once the network is back submits exactly once
3. ATT-06-03 — Negative: to check after a failed submit the register stays open (it does not close as if submitted)
4. ATT-06-04 — Negative: to check after a failed submit the marks the teacher made are kept

### ATT-07 — Attendance data is correct and kept

**User story:** As a teacher, I want the attendance I submit to be exactly what I marked, and to stay that way, so that
the school's record is right.

**Acceptance criteria:**

- AC1: The summary and absent list match the students marked, roll by roll
- AC2: Submitted marks come back the same after reopening and after an app reload
- AC3: An edit after submitting replaces the record once, with nothing duplicated
- AC4: Closing part-way through never changes the record without Submit; a draft resumes with its marks

1. ATT-07-01 — To check marking rolls 3, 7 and 15 absent shows 27 present / 3 absent and the absent list names exactly rolls 3, 7 and 15
2. ATT-07-02 — To check after Submit, reopening the register shows exactly the same students absent (review view and Edit Attendance)
3. ATT-07-03 — To check after a full app reload the submitted marks are still there
4. ATT-07-04 — To check editing after submit (one student changed) keeps the change, sends one submit, and still lists 30 students
5. ATT-07-05 — To check Mark All Present, then tapping students absent and tapping again, keeps the summary equal to the grid at every step
6. ATT-07-06 — Regression: to check closing part-way through an edit (Close -> Confirm) does not change the submitted attendance (the dialog promises "You can resume later for final submission")
7. ATT-07-07 — Regression: to check resuming a draft keeps the absent marks made before closing, also after the roll call passes those students (needs a day not yet submitted)
8. ATT-07-08 — Negative: to check a student marked absent never shows as present after a reload

### ATT-08 — Attendance across subjects and days

**User story:** As a teacher, I want to know which register I am taking and see earlier days, so that I don't take it
twice or change a past day by mistake.

**Acceptance criteria:**

- AC1: The register is one per class per day, shared by every subject of that class
- AC2: Earlier days open read-only; there is no future day

1. ATT-08-01 — To check attendance is one register per class per day: marks submitted in Science show in Mathematics' register for the same day
2. ATT-08-02 — To check the previous-day arrow shows yesterday's attendance read-only (locked notice, buttons disabled, taps change nothing)
3. ATT-08-03 — Negative: to check on today the next-day arrow is disabled, and coming back from yesterday shows today's marks again

### ATT-09 — Edge cases and interruptions

**User story:** As a teacher, I want attendance to stay correct when I do something unusual, so that an accident does not
corrupt the record.

**Acceptance criteria:**

- AC1: All-absent and rapid taps give consistent, correct counts
- AC2: Switching class or signing out part-way does not change the submitted record
- AC3: No placeholder or debug text in the register

1. ATT-09-01 — Edge: to check every student absent can be submitted, and reopens as 0 present / 30 absent
2. ATT-09-02 — Edge: to check rapid taps on one roll number end in a consistent state that the summary agrees with
3. ATT-09-03 — Edge: to check switching class part-way through an edit leaves the submitted attendance unchanged
4. ATT-09-04 — Edge: to check signing out part-way through an edit and back in leaves the submitted attendance unchanged
5. ATT-09-05 — To check no "undefined", "null", NaN or raw text keys appear anywhere in the register (entry, grid, review, close dialog, previous day)
6. ATT-09-06 — To check the absent notice reads correctly for a single student ("1 student", not "1 students")
7. ATT-09-07 — To check the register shows no build/version stamp to the teacher
8. ATT-09-08 — Negative: to check marking every student absent is allowed and shows 0 present

### ATT-10 — Attendance for a teacher who is not the class teacher

**User story:** As a subject teacher who is not the class teacher, I want the register to be clearly read-only, so that I
know why I cannot mark it.

**Acceptance criteria:**

- AC1: The register opens read-only and taps change nothing
- AC2: The teacher is told why marking is not available
- AC3: A class with no register for this teacher does not open an empty one

`VALID_PIN_2` account (Class 9A Science, Class 10A Science). Nothing is marked or submitted.

1. ATT-10-01 — Negative: to check the register opens read-only (Mark All Present and Done disabled) and tapping a roll number changes nothing
2. ATT-10-02 — To check the read-only register tells the teacher why marking is not available
3. ATT-10-03 — Negative: to check choosing Attendance in a class this teacher cannot take opens a register or says why, never nothing (and never an empty "No students found" register)
