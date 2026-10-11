# 21 — Checkpoints and Student Tests

Covers a checkpoint end to end: the teacher launches it from the topic's Playlist in Teach Mode, students take it on the
student test site (`/student-test/`), the teacher watches progress and ends it, and the principal sees the results in
Plan Mode → Reports & Analytics → Assessment for Learning. Module code: `CHK`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

These cases run in the browser: the teacher with the main account (`VALID_PIN`), students on the student test site, the
principal with `PRINCIPAL_PIN`. A checkpoint a test starts is always ended again by the same test.

### CHK-01 — Launch a checkpoint

**User story:** As a teacher, I want to launch a checkpoint for my class as an online or a paper test, so that I can check what the class has understood.

**Acceptance criteria:**

- AC1: Opening a checkpoint that has never been launched offers In-Lab Assessment (online) and Paper Test (offline); a paused one resumes with Start Checkpoint
- AC2: Starting an online checkpoint shows a running timer, the student roster and "Students now begin the test through the student portal"
- AC3: Only one checkpoint can run in a class at a time

1. CHK-01-01 — To check opening a checkpoint card offers In-Lab Assessment and Paper Test
2. CHK-01-02 — To check choosing In-Lab Assessment and Start starts the checkpoint with a running timer
3. CHK-01-03 — To check a started online checkpoint tells the teacher students begin through the student portal
4. CHK-01-04 — To check a started checkpoint lists the class's students
5. CHK-01-05 — To check choosing Paper Test opens the Paper Test workflow instead of starting an online test
6. CHK-01-06 — Negative: to check a second checkpoint can't be started in the class while one is running
7. CHK-01-07 — To check reloading the app and reopening the card shows the checkpoint still running

### CHK-02 — Student signs in to the test

**User story:** As a student, I want to sign in to the student test site with my grade, class and roll number, so that I can take the test my teacher started.

**Acceptance criteria:**

- AC1: The site asks for grade, class and roll number, and checking the roll number shows the student's name
- AC2: An unknown roll number is refused with a message
- AC3: With a checkpoint running for the class, Start opens the test; with none running the student is told so
- AC4: The site shows today's date and time

1. CHK-02-01 — To check the student test site opens on the sign-in page
2. CHK-02-02 — To check the grade list offers the school's grades
3. CHK-02-03 — To check the class list offers the chosen grade's classes
4. CHK-02-04 — To check checking a valid roll number shows the student's name
5. CHK-02-05 — Negative: to check an unknown roll number is refused with a message
6. CHK-02-06 — Negative: to check Start is not possible before the roll number is checked
7. CHK-02-07 — To check Start opens the running checkpoint's test
8. CHK-02-08 — Negative: to check a student whose class has no running checkpoint is told there is no test
9. CHK-02-09 — To check the site header shows today's date and the current time

### CHK-03 — Student takes the test

**User story:** As a student, I want to answer every question and submit, so that my teacher gets my answers.

**Acceptance criteria:**

- AC1: The test shows its questions one at a time with a way to move between them
- AC2: An answer can be chosen and changed
- AC3: Submit sends the answers once and tells the student the test is submitted
- AC4: A submitted student cannot take the same test again

1. CHK-03-01 — To check the test shows the first question with its options
2. CHK-03-02 — To check a student can choose an answer and change it
3. CHK-03-03 — To check Next and Previous move between questions
4. CHK-03-04 — To check Submit sends the answers and confirms the test is submitted
5. CHK-03-05 — Negative: to check a student who has submitted cannot start the same test again
6. CHK-03-06 — To check reloading the page mid-test keeps the answers given so far

### CHK-04 — Teacher follows progress and ends the checkpoint

**User story:** As a teacher, I want to see who has started and finished, then end the checkpoint, so that I know when the class is done.

**Acceptance criteria:**

- AC1: The roster shows every roll number and counts Not Logged-In, Logged-In, Attempting and Submitted as students take the test
- AC2: End Checkpoint finishes it; students can no longer start it
- AC3: After ending, the checkpoint shows as finished in the Playlist

1. CHK-04-01 — To check a student who has started appears as in progress on the teacher's roster
2. CHK-04-02 — To check a student who has submitted appears as completed on the teacher's roster
3. CHK-04-03 — To check End Checkpoint finishes the checkpoint
4. CHK-04-04 — Negative: to check a student can't start a checkpoint after the teacher has ended it
5. CHK-04-05 — To check an ended checkpoint is no longer running after a reload

### CHK-05 — Principal views the results

**User story:** As a principal, I want to see checkpoint results in Plan Mode's reports, so that I can follow learning across the school.

**Acceptance criteria:**

- AC1: The principal's Plan Mode has Reports & Analytics, with the tabs Principal Dashboard, School Usage, Content Statistics and Assessment for Learning
- AC2: Assessment for Learning has Baseline and Revision, and Grade, Class, Subject and Assessment filters; grades are listed in order
- AC3: Baseline lists the class's checkpoints; the report of a checkpoint shows overall mastery, concept mastery and the students grouped by performance band
- AC4: A student who submitted a checkpoint appears in its report with their score
- AC5: The report always matches the assessment selected
- AC6: A teacher's Plan Mode has no Reports & Analytics

1. CHK-05-01 — To check the principal's Plan Mode shows Reports & Analytics
2. CHK-05-02 — To check Reports & Analytics has the tabs Principal Dashboard, School Usage, Content Statistics and Assessment for Learning
3. CHK-05-03 — To check Assessment for Learning offers Baseline and Revision, and Grade, Class, Subject and Assessment filters
4. CHK-05-04 — To check the Grade list is in order (Nursery, Junior KG, Senior KG, Class 1 to Class 12)
5. CHK-05-05 — To check Baseline lists the chosen class's checkpoints
6. CHK-05-06 — To check a checkpoint's report shows overall mastery, concept mastery and students by performance band
7. CHK-05-07 — To check a student who submitted the checkpoint appears in its report with their score
8. CHK-05-08 — To check the report shown when the page opens matches the assessment selected
9. CHK-05-09 — To check the student search finds a student in the report
10. CHK-05-10 — Negative: to check a teacher's Plan Mode does not show Reports & Analytics

### CHK-06 — Edge cases and interruptions during a checkpoint

**User story:** As a teacher running a checkpoint with a real class, I want it to behave sensibly when students skip questions, close the browser, use the same roll number twice, or when I end the test while some are still answering, so that no student's work is lost and no result is counted twice.

**Acceptance criteria:**

- AC1: Ending with unanswered questions warns the student before submitting
- AC2: Ending the checkpoint while a student is answering saves that student's answers and tells the student the test has ended
- AC3: A student who logs out or loses the browser mid-test can continue
- AC4: The same roll number cannot take the test on two devices at once
- AC5: Submitting twice in quick succession submits once
- AC6: Roll number input is checked sensibly (empty, leading zero, spaces)
- AC7: Moving between questions keeps answers; skipped questions are shown as not attempted
- AC8: Resuming a paused checkpoint keeps the students who already submitted as Submitted

1. CHK-06-01 — Negative: to check End Mission with unanswered questions warns how many are unanswered
2. CHK-06-02 — Interruption: to check the teacher ending the checkpoint while a student is answering saves the student's answers
3. CHK-06-03 — Interruption: to check a student answering when the teacher ends the checkpoint is told the test has ended
4. CHK-06-04 — Interruption: to check a student who logs out mid-test can sign in again and continue
5. CHK-06-05 — Concurrency: to check the same roll number cannot sign in on a second device while the first is taking the test
6. CHK-06-06 — Edge: to check double-clicking Confirm on End Mission submits once
7. CHK-06-07 — Negative: to check the roll number tick is disabled while the roll number is empty
8. CHK-06-08 — Edge: to check a roll number with a leading zero or spaces is treated as the same roll number or refused with a clear message
9. CHK-06-09 — To check going back to an answered question shows the answer chosen
10. CHK-06-10 — To check the question number buttons jump to that question
11. CHK-06-11 — To check a skipped question is shown as Not Attempted in the question panel
12. CHK-06-12 — To check resuming a paused checkpoint keeps students who submitted as Submitted

### CHK-07 — Run a checkpoint as a paper test

**User story:** As a teacher without a computer lab, I want to run a checkpoint on paper and upload the marks, so that the class still gets a checkpoint report.

**Acceptance criteria:**

- AC1: Paper Test shows a four-step workflow: Download Question Paper, Conduct Assessment, Download Student Register, Upload Evaluated Register
- AC2: Generate PDF gives a printable question paper
- AC3: The student register downloads as an Excel file listing the class
- AC4: Uploading a file that is not the filled register is refused with a message
- AC5: Back returns to the mode choice without launching the checkpoint

1. CHK-07-01 — To check Paper Test shows the four workflow steps in order
2. CHK-07-02 — To check Generate PDF downloads the question paper as a PDF
3. CHK-07-03 — To check the Student Register downloads as an Excel file
4. CHK-07-04 — Negative: to check uploading a file that is not an Excel register is refused with a message
5. CHK-07-05 — To check Back returns to the In-Lab Assessment / Paper Test choice
6. CHK-07-06 — To check the later steps stay locked until the earlier steps are done

### CHK-08 — Principal reports are complete and correct

**User story:** As a principal, I want every report in Reports & Analytics to load, filter, download and add up correctly, so that I can rely on it to follow usage and learning across the school.

**Acceptance criteria:**

- AC1: Every tab opens with its own content, survives switching tabs and a reload, and never shows "undefined", "null" or "NaN"
- AC2: The Principal Dashboard totals agree with each other and with the user and classroom lists; its date, toggles, bars and Refresh work
- AC3: Download Report and Export Usage Report give complete workbooks; an export without dates is refused
- AC4: School Usage and Content Statistics show every month and view with readable labels, and their downloads work
- AC5: Assessment for Learning filters reset sensibly; band counts, band filters and summary numbers agree with the students listed; search, concept details, Print and band groups work
- AC6: The principal's report of a checkpoint matches the teacher's summary of it
- AC7: Teacher accounts have no Reports & Analytics
- AC8: The right-panel cards (Real-time Dashboard, Custom Reports, Data Export) each open their feature or say clearly what they offer
- AC9: Export Usage Report refuses a date range that ends before it starts, and gives a valid report for one day or a long range (or refuses it with a message)
- AC10: Each concept's mastery and the Revision report agree with the teacher's results and add up

1. CHK-08-01 — To check every Reports & Analytics tab opens with its content and no undefined, null or NaN text
2. CHK-08-02 — To check switching between the report tabs and back shows each tab's own content
3. CHK-08-03 — To check reloading the browser on the reports keeps Reports & Analytics available
4. CHK-08-04 — To check the dashboard totals agree (current ≤ total, Current Users rows = current users)
5. CHK-08-05 — To check All Users lists every user of the school
6. CHK-08-06 — To check Classroom wise lists the installed classrooms with their names
7. CHK-08-07 — To check Download Report downloads the day's usage workbook listing every user
8. CHK-08-08 — To check the downloaded usage workbook shows clean user names and complete school details
9. CHK-08-09 — Negative: to check Export Usage Report without dates is refused with a message
10. CHK-08-10 — To check Cancel on the Export Report dialog closes it without exporting
11. CHK-08-11 — To check Export Usage Report for a date range offers the report to download
12. CHK-08-12 — To check choosing a past date on the dashboard loads that day's usage
13. CHK-08-13 — Negative: to check a future date cannot be chosen on the dashboard
14. CHK-08-14 — To check Refresh reloads the dashboard and restarts the countdown
15. CHK-08-15 — To check the countdown and hours are shown with two-digit minutes and seconds
16. CHK-08-16 — To check clicking a bar shows the content the teacher accessed
17. CHK-08-17 — To check School Usage Download gives the month's usage report
18. CHK-08-18 — To check choosing another month in School Usage shows that month without NaN values
19. CHK-08-19 — To check every School Usage view opens with its chart and readable labels
20. CHK-08-20 — To check Content Statistics Download Report gives a workbook with every book in the table
21. CHK-08-21 — To check changing the Grade updates Class, Subject and the report heading
22. CHK-08-22 — Negative: to check a grade with no assessments shows "No reports" and no report from before
23. CHK-08-23 — To check the performance band counts add up to the number of learners
24. CHK-08-24 — To check the summary numbers agree with the students listed
25. CHK-08-25 — To check each band filter shows only students in that band and the filters add up to All
26. CHK-08-26 — To check the student search matches part of a name in any case, says when nothing matches, and clearing restores the list
27. CHK-08-27 — To check tapping a concept shows its topic breakdown and tapping it again hides it
28. CHK-08-28 — To check Print on concept mastery asks the browser to print
29. CHK-08-29 — To check a performance band group can be collapsed and expanded
30. CHK-08-30 — To check the principal's report of a checkpoint matches the teacher's summary
31. CHK-08-31 — Negative: to check the main teacher account has no Reports & Analytics, even after a reload in Plan Mode
32. CHK-08-32 — Negative: to check a plain teacher account has no Reports & Analytics, even after a reload in Plan Mode
33. CHK-08-33 — To check a tab chosen while the dashboard is still loading shows its own content
34. CHK-08-34 — To check the Real-time Dashboard card in the right panel opens the dashboard or says what it offers
35. CHK-08-35 — To check the Custom Reports card in the right panel opens custom reports or says what it offers
36. CHK-08-36 — To check the Data Export card in the right panel opens the export or says what it offers
37. CHK-08-37 — Negative: to check Export Usage Report with the end date before the start date is refused with a message
38. CHK-08-38 — Edge: to check Export Usage Report with the same start and end date gives the day's report
39. CHK-08-39 — Edge: to check Export Usage Report for a very long range is refused with a message or gives a valid report
40. CHK-08-40 — To check each concept's mastery in the principal's report matches the teacher's summary for a checkpoint all but one of the class took
41. CHK-08-41 — To check each concept's mastery in the principal's report matches the teacher's summary for a checkpoint only a few students took
42. CHK-08-42 — To check the Revision report of a revision test lists its students with percentages from 0 to 100 and band counts that add up to the learners

### CHK-09 — Scores are correct everywhere

**User story:** As a teacher and a principal, I want every screen to show the same, correct score for each student, so that I can trust the checkpoint results.

**Acceptance criteria:**

- AC1: A student's result screen shows the score their answers earned
- AC2: The teacher's summary counts every student who took the test and shows their average
- AC3: The principal's report lists the same students with the same percentages
- AC4: A student who answers only some questions is scored on all of them

1. CHK-09-01 — To check a student who answers every question sees the score their answers earned
2. CHK-09-02 — To check a second student with different answers sees their own correct score
3. CHK-09-03 — To check a student who answers only some questions is scored out of all the questions
4. CHK-09-04 — To check the teacher's summary counts every student who took the test
5. CHK-09-05 — To check the teacher's average score matches the students' scores
6. CHK-09-06 — To check the principal's report lists each student with the percentage they scored
7. CHK-09-07 — Negative: to check a student who answers nothing is scored 0, not left out of the totals

### CHK-10 — Run a Revision Test with the class

**User story:** As a teacher, I want to launch a topic's Revision Test from Compass and have the class take it on the student test site, so that the class revises the topic and the principal sees how it went.

**Acceptance criteria:**

- AC1: Compass in Teach Mode lists the topic's Revision Tests with their duration and number of questions
- AC2: Opening a Revision Test offers In-Lab Assessment and Paper Test; starting it online shows the timer and the class roster
- AC3: Students take it on the student test site and see the score their answers earned
- AC4: The teacher's roster and summary count every student who submitted, with the right average; ending it stops new students
- AC5: The principal's Assessment for Learning → Revision report lists each student with the percentage they scored

1. CHK-10-01 — To check Compass lists the topic's Revision Tests with their duration and question count
2. CHK-10-02 — To check opening a Revision Test offers In-Lab Assessment and Paper Test
3. CHK-10-03 — To check starting the Revision Test online shows the running timer and the class roster
4. CHK-10-04 — To check a student who answers every question sees the score their answers earned
5. CHK-10-05 — To check a second student with different answers sees their own correct score
6. CHK-10-06 — To check a student who answers only some questions is scored out of all the questions
7. CHK-10-07 — To check the teacher's roster shows the students who submitted as Submitted
8. CHK-10-08 — To check End Checkpoint ends the Revision Test and its summary counts every student who took it
9. CHK-10-09 — To check the teacher's average score matches the students' scores
10. CHK-10-10 — Negative: to check a student cannot start the Revision Test after the teacher has ended it
11. CHK-10-11 — To check the principal's Revision report lists each student with the percentage they scored

### CHK-11 — The checkpoint time runs out

**User story:** As a teacher, I want a checkpoint to finish cleanly when its time runs out, so that students still answering keep the marks for the answers they gave and the results are complete.

**Acceptance criteria:**

- AC1: A student still answering when the time runs out is told the time is up
- AC2: That student's answers are submitted automatically
- AC3: The checkpoint stops running on the teacher's side
- AC4: The teacher's summary and the principal's report count that student with the marks of the answers given

1. CHK-11-01 — To check a student still answering when the time runs out is told the time is up
2. CHK-11-02 — To check the answers of a student still answering are submitted when the time runs out
3. CHK-11-03 — To check the checkpoint is no longer running on the teacher's side once the time is up
4. CHK-11-04 — To check the teacher's summary counts the student whose time ran out
5. CHK-11-05 — To check the teacher's average counts the student whose time ran out with the marks of their answers
6. CHK-11-06 — To check the principal's report scores the student whose time ran out on the answers given

### CHK-12 — Upload paper-test marks

**User story:** As a teacher, I want to enter the marks of a paper test in the downloaded student register and upload it, so that the class results, concept mastery and the principal's report show how the class did.

**Acceptance criteria:**

- AC1: A conducted paper test still offers Download Student Register and Upload Evaluated Register when the teacher opens it again later, also after the test's duration has passed
- AC2: The register has one row per student of the class (roll number and name), a column per question and a Total column
- AC3: An uploaded register is shown for checking (students, questions, totals) before it is sent; sending it confirms with a message
- AC4: The teacher's summary, concept mastery and the principal's report show the marks that were uploaded
- AC5: A register with a mark above the maximum, a negative mark, a text mark, an unknown roll number or a changed header row is refused with a message that names the problem
- AC6: Uploading the same register twice does not count students twice; a corrected register replaces the earlier marks

1. CHK-12-01 — To check a conducted paper test still offers the student register and the upload when it is opened again later
2. CHK-12-02 — To check the student register has one row per student of the class, a column per question and a Total column
3. CHK-12-03 — Negative: to check a mark above the maximum is marked invalid and cannot be sent
4. CHK-12-04 — Negative: to check a negative mark is marked invalid and cannot be sent
5. CHK-12-05 — Negative: to check a text mark is marked invalid and cannot be sent
6. CHK-12-06 — Negative: to check a register with a roll number not in the class is refused with a message
7. CHK-12-07 — Negative: to check a register whose header row was changed is refused with a message
8. CHK-12-08 — To check an uploaded register is shown with its students, questions and each student's total before it is sent
9. CHK-12-09 — To check sending the marks confirms with a message
10. CHK-12-10 — To check the teacher's summary counts the students who were given marks and shows their average score
11. CHK-12-11 — To check concept mastery is shown once marks are uploaded
12. CHK-12-12 — To check the principal's report lists each student with the percentage of their marks
13. CHK-12-13 — To check uploading the same register again does not count any student twice
14. CHK-12-14 — To check a register with corrected marks replaces the earlier marks

### CHK-13 — The whole class takes a test

**User story:** As a teacher and a principal, I want every student of the class to be able to take a test at the same time and to appear with their own result in every report, so that I can use the results for the whole class.

**Acceptance criteria:**

- AC1: All 30 students can sign in and take the test at the same time
- AC2: Each student's result screen shows the score their answers earned
- AC3: The teacher's roster and summary count all 30, with the right average
- AC4: The principal's report lists all 30 students with their own percentages

1. CHK-13-01 — To check the teacher can start the test for the class
2. CHK-13-02 — To check all 30 students can take the test and each sees the score their answers earned
3. CHK-13-03 — To check the teacher's roster shows all 30 submitted and the summary counts all 30 with the right average
4. CHK-13-04 — To check the principal's report lists all 30 students with the percentage each scored
5. CHK-13-05 — Negative: to check no student can take the test twice

### CHK-14 — A paper test from start to finish in one sitting

**User story:** As a teacher, I want to run a paper test and upload the marked register, so that the class's paper results show for me and the principal.

**Acceptance criteria:**

- AC1: After Conduct Assessment, the register downloads, can be filled and uploaded, and the marks are accepted
- AC2: The teacher's summary counts every student in the register with the right average and per-question results
- AC3: The principal's report lists every student with the percentage from the uploaded marks

1. CHK-14-01 — To check a paper test can be conducted and its marks uploaded in one sitting, and the teacher's summary matches the marks
2. CHK-14-02 — To check the principal's report shows each student with the percentage from the uploaded marks
3. CHK-14-03 — Negative: to check a register with a mark other than 0 or 1 cannot be submitted
