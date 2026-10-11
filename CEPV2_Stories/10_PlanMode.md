# 10 — Plan Mode

Covers Planning ("Classroom Mode" → Planning): the Question Bank, creating questions, quizzes and Revision Tests,
Check Point (Assessment for Learning, including Baseline Tests), the Content Library, the Code Editor, and how what is
made in Plan Mode reaches Teach Mode. Module code: `PLN`. Each `### <ID> — <Title>` is a **story**; each numbered line
under it is a **test case** belonging to that story.

Plan Mode is a separate app (`/plan/#/canvas`) reached from the User menu. These cases run in the browser with the
Plan Mode account (`PLAN_PIN` in `.env`). Anything a test creates is titled "AutoTest …" and removed again where the
app allows it.

### PLN-01 — Open Plan Mode and move around it

**User story:** As a teacher, I want to switch to Planning and move between its sections, so that I can prepare my lessons in the same app I teach with.

**Acceptance criteria:**

- AC1: Classroom Mode → Planning opens Plan Mode on my current class and subject
- AC2: The sidebar offers Content Library, Question Bank, Code Editor and Check Point, and each opens its section
- AC3: Switching back to Teaching returns to the board

1. PLN-01-01 — To check Classroom Mode → Planning opens Plan Mode
2. PLN-01-02 — To check Plan Mode opens on the teacher's current class and subject
3. PLN-01-03 — To check the sidebar offers Content Library, Question Bank, Code Editor and Check Point
4. PLN-01-04 — To check Question Bank opens from the sidebar
5. PLN-01-05 — To check Check Point opens from the sidebar
6. PLN-01-06 — To check Content Library opens from the sidebar
7. PLN-01-07 — To check Code Editor opens from the sidebar
8. PLN-01-08 — To check switching back to Teaching returns to the whiteboard
9. PLN-01-09 — Negative: to check a plain teacher account does not see Reports & Analytics in Plan Mode

### PLN-02 — Question Bank

**User story:** As a teacher planning a lesson, I want to browse the question bank by chapter and topic, so that I can find questions for my class.

**Acceptance criteria:**

- AC1: The bank shows the questions of the chosen chapter and topic
- AC2: Each question shows its type and its class, chapter and topic
- AC3: Choosing another topic changes the list

1. PLN-02-01 — To check the Question Bank lists questions for the current chapter and topic
2. PLN-02-02 — To check each question card shows its question type
3. PLN-02-03 — To check each question card shows its class, chapter and topic
4. PLN-02-04 — To check choosing another topic changes the questions listed
5. PLN-02-05 — To check the Question Bank offers Create Question, Create Quiz and Create Revision Test
6. PLN-02-06 — Negative: to check a topic with no questions shows a message, not a blank Question Bank

### PLN-03 — Create a quiz from the question bank

**User story:** As a teacher planning a lesson, I want to build a quiz from questions in the bank, so that I can run a quick quiz in class.

**Acceptance criteria:**

- AC1: Create Quiz lets me tick questions, and a counter shows how many are ticked
- AC2: The quiz form is filled in with my class, chapter and topic; it needs a title
- AC3: Add Quiz creates the quiz, and it appears in that topic's Playlist in Teach Mode
- AC4: Cancel creates nothing; a quiz with no questions cannot be made
- AC5: A quiz I made can be removed again

1. PLN-03-01 — To check Create Quiz shows a checkbox on every question
2. PLN-03-02 — To check the Create Quiz counter shows how many questions are ticked
3. PLN-03-03 — To check unticking a question lowers the counter
4. PLN-03-04 — Negative: to check a quiz cannot be started with no questions ticked
5. PLN-03-05 — To check the quiz form shows the ticked questions
6. PLN-03-06 — To check the quiz form is filled in with the current class and subject
7. PLN-03-07 — To check the quiz form is filled in with the current chapter and topic
8. PLN-03-08 — Negative: to check Add Quiz does not create a quiz without a title
9. PLN-03-09 — To check Add Quiz creates the quiz (the server accepts it)
10. PLN-03-10 — To check a created quiz appears in that topic's Playlist in Teach Mode, under its title
11. PLN-03-11 — To check a created quiz opens in Teach Mode with the questions that were ticked
12. PLN-03-12 — To check Cancel on the quiz form creates nothing
13. PLN-03-13 — To check a quiz made in Plan Mode can be removed from the Playlist
14. PLN-03-14 — To check a success message confirms the quiz was created

### PLN-04 — Create a Revision Test

**User story:** As a teacher, I want to make a Revision Test from single-choice questions, so that my students can revise a topic before an exam.

**Acceptance criteria:**

- AC1: A topic without single-choice questions explains that a Revision Test needs them
- AC2: On a topic with single-choice questions, I can tick them and create the test
- AC3: The test is listed in Check Point and reaches Teach Mode (Compass → Revision Tests)

1. PLN-04-01 — Negative: to check Create Revision Test on a topic without single-choice questions says a Revision Test needs single-choice (SCQ) questions
2. PLN-04-02 — To check Create Revision Test lists only single-choice questions to tick
3. PLN-04-03 — To check a Revision Test can be created from ticked single-choice questions
4. PLN-04-04 — To check a created Revision Test is listed in Check Point as a Revision Assessment
5. PLN-04-05 — To check a created Revision Test appears in Teach Mode under Compass → Revision Tests for that topic

### PLN-05 — Check Point (Assessment for Learning)

**User story:** As a teacher, I want Check Point to list my assessments and let me create a Baseline Test where the subject has one, so that I can check what my students already know.

**Acceptance criteria:**

- AC1: Check Point lists assessments and filters them by academic year, class, section, subject, status and type
- AC2: The type filter offers Baseline Test and Revision Assessment
- AC3: Where the subject has no baseline chapter, Create Test is disabled and a message says so
- AC4: Where it has one, a Baseline Test can be created and reaches Teach Mode

1. PLN-05-01 — To check Check Point opens on "Assessment for Learning (AfL)" with its filters
2. PLN-05-02 — To check the type filter offers Baseline Test and Revision Assessment
3. PLN-05-03 — To check the status filter offers Created, Started, Paused and Closed
4. PLN-05-04 — Negative: to check that for a subject with no baseline chapter, Create Test is disabled
5. PLN-05-05 — Negative: to check that for a subject with no baseline chapter, a message says no baseline chapter was found
6. PLN-05-06 — To check the search box narrows the assessments listed
7. PLN-05-07 — To check a Baseline Test can be created for a subject that has a baseline chapter
8. PLN-05-08 — To check a Baseline Test created in Plan Mode appears in Teach Mode for that class

### PLN-06 — Create a question

**User story:** As a teacher, I want to add my own questions to the question bank, so that quizzes and tests can use them.

**Acceptance criteria:**

- AC1: Create Question opens a form for the question, its type, options and answer
- AC2: A saved question appears in the bank for its chapter and topic
- AC3: Required fields are checked before saving

1. PLN-06-01 — To check Create Question opens the question form
2. PLN-06-02 — To check a single-choice question with four options and one answer can be saved
3. PLN-06-03 — To check a saved question appears in the Question Bank for its chapter and topic
4. PLN-06-04 — Negative: to check a question without text cannot be saved
5. PLN-06-05 — Negative: to check a single-choice question without a marked answer cannot be saved

### PLN-07 — Content Library

**User story:** As a teacher planning a lesson, I want the Content Library for my class and subject, so that I can arrange the topic's resources before class.

**Acceptance criteria:**

- AC1: The library shows the book navigation for the current class and subject
- AC2: Save and Update Book (Sync) are offered

1. PLN-07-01 — To check the Content Library shows the current class and subject
2. PLN-07-02 — To check the Content Library offers Save and Update Book (Sync)
3. PLN-07-03 — Negative: to check a topic with no available content shows an empty-state message, not a blank panel
4. PLN-07-04 — To check Book Navigation lists the chapters and topics of the class and subject in order
5. PLN-07-05 — To check choosing a topic in Book Navigation shows that topic's resources
6. PLN-07-06 — To check a custom chapter can be created with a name
7. PLN-07-07 — To check a custom topic can be created inside a chapter
8. PLN-07-08 — Negative: to check a custom chapter or topic cannot be saved with an empty name
9. PLN-07-09 — Edge: to check a very long or Hindi chapter name is saved and shown correctly
10. PLN-07-10 — To check a resource (video, image, PDF) can be added to a topic
11. PLN-07-11 — To check the resources of a topic can be reordered
12. PLN-07-12 — To check a resource can be removed from a topic
13. PLN-07-13 — To check Save keeps the changes after a reload
14. PLN-07-14 — To check leaving with unsaved changes warns before discarding them
15. PLN-07-15 — To check after Save, the custom chapter, topic and resources appear in Teach Mode for that class
16. PLN-07-16 — To check Update Book (Sync) brings the book up to date without losing custom chapters and topics
17. PLN-07-17 — To check a custom chapter and topic can be deleted, and disappear from Teach Mode

### PLN-08 — Code Editor

**User story:** As a teacher planning a lesson, I want a Code Editor, so that I can prepare coding examples for class.

**Acceptance criteria:**

- AC1: The Code Editor opens and runs a program
- AC2: Code saved in Plan Mode appears in Teach Mode

1. PLN-08-01 — To check the Code Editor section opens
2. PLN-08-02 — To check a template program runs and shows its output
3. PLN-08-03 — To check code saved in Plan Mode appears in Teach Mode for that topic
4. PLN-08-04 — To check each language offered can run a simple program and shows its output
5. PLN-08-05 — Negative: to check a program with a syntax error shows the error, not a blank output
6. PLN-08-06 — Edge: to check a program that never ends (an endless loop) can be stopped or times out with a message
7. PLN-08-07 — To check a program that reads input can be given input
8. PLN-08-08 — To check saved code opens again with the same text after a reload
9. PLN-08-09 — Negative: to check code cannot be saved without a name
10. PLN-08-10 — To check saved code can be deleted

### PLN-09 — Reports & Usage (principal)

**User story:** As a principal, I want usage and Assessment for Learning reports, so that I can follow teaching and learning in the school.

**Acceptance criteria:**

- AC1: A principal can open the reports; a teacher cannot
- AC2: A school with no activity shows an empty-state message

1. PLN-09-01 — To check a principal account can open Reports & Usage
2. PLN-09-02 — Negative: to check a teacher account cannot open the principal's usage view
3. PLN-09-03 — To check an empty report shows an empty-state message, not an error
