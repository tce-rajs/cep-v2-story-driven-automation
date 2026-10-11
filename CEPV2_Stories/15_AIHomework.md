# 15 — AI Homework

Covers building homework with AI (Magnet → Homework): choosing the type and number of questions, generating and
reviewing the questions, and assigning the homework to classes. Module code: `AIH`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

Physics confirmed; History shows a "grade or class seems incorrect" banner). Sending is a real action: it assigns
real homework to the chosen class.

### AIH-01 — Open the homework builder

**User story:** As a teacher, I want to open the homework builder for my class, so that I can set homework quickly.

**Acceptance criteria:**

- AC1: It opens with Homework and Revise, counters, chapter and Generate, for the current class
- AC2: Unsupported subjects get a message
- AC3: Repeated opening leaves one builder

1. AIH-01-01 — To check Magnet → Homework opens the builder with the Homework and Revise cards, question counters, Select Chapter and Generate
2. AIH-01-02 — To check the builder's header shows the current class, subject and chapter
3. AIH-01-03 — Negative: to check a subject that isn't supported shows the "grade or class seems incorrect" message and does not generate
4. AIH-01-04 — Edge: to check opening and closing the builder 5 times leaves exactly one clean builder
5. AIH-01-05 — Regression: to check opening Homework while another Magnet panel is open doesn't leave two Magnet panels open at once _(improvement: only one Magnet panel at a time)_

### AIH-02 — Choose the homework type and number of questions

**User story:** As a teacher, I want to choose the homework type, chapter and number of questions, so that the homework fits the class.

**Acceptance criteria:**

- AC1: Homework defaults to 15 objective questions; Revise offers 10 + 5
- AC2: + and − change counts by one, also when clicked fast
- AC3: Select Chapter changes the chapter

1. AIH-02-01 — To check Homework is selected by default with 15 objective questions
2. AIH-02-02 — To check the + button raises a question count by one
3. AIH-02-03 — Regression: to check a fast double-click on + adds two questions, not zero
4. AIH-02-04 — Edge: to check clicking + and − alternately 20 times returns the count to where it started
5. AIH-02-05 — Edge: to check the lowest allowed count still generates exactly that many questions
6. AIH-02-06 — To check Select Chapter changes the chapter shown in the builder's header
7. AIH-02-07 — To check Revise can be selected and offers 10 objective and 5 subjective questions
8. AIH-02-08 — To check the − button lowers a question count by one
9. AIH-02-09 — Negative: to check the builder does not offer Generate until a chapter is chosen

### AIH-03 — Generate and review the questions

**User story:** As a teacher, I want to generate and review questions, so that I only send good questions.

**Acceptance criteria:**

- AC1: Generate makes the chosen number of questions on the chapter, once
- AC2: I can move through them and regenerate
- AC3: No blank questions or stray symbols

1. AIH-03-01 — To check Generate produces the chosen number of questions, each with text
2. AIH-03-02 — To check moving between the generated questions works, and going past the first or last question doesn't wrap or error
3. AIH-03-03 — To check Regenerate replaces the generated questions _(the app regenerates the whole set: there is no per-question Regenerate)_
4. AIH-03-04 — Regression: to check removing a generated question doesn't leave a blank question behind
5. AIH-03-05 — Regression: to check double-clicking Generate starts only one generation _(improvement: a double click sends, submits or generates once)_
6. AIH-03-06 — Regression: to check generated question text doesn't show stray "$" symbols
7. AIH-03-07 — To check regenerated questions are still there after going Next and back again
8. AIH-03-08 — To check the generated questions are about the selected chapter
9. AIH-03-09 — Interruption: to check switching class while questions are being generated leaves no half-built homework behind
10. AIH-03-10 — Negative: to check moving before the first or after the last generated question does nothing

### AIH-04 — Assign the homework to classes

**User story:** As a teacher, I want to assign the homework to classes with a due date, so that students know what to do by when.

**Acceptance criteria:**

- AC1: The form has a title, the current class and "Due in" 1 day
- AC2: Sending needs a title and a class, and shows success
- AC3: Previous keeps my work; Discard starts fresh
- AC4: Homework I assign shows up under the topic's Compass → Analyse It

1. AIH-04-01 — To check Next opens the assignment form with a pre-filled title
2. AIH-04-02 — Negative: to check sending is blocked while the homework title is empty
3. AIH-04-03 — Negative: to check sending is blocked when no class is ticked
4. AIH-04-04 — To check Previous returns to the generated questions with nothing lost
5. AIH-04-05 — To check Discard closes the homework builder
6. AIH-04-06 — To check Ready to Send assigns the homework
7. AIH-04-07 — Edge: to check the longest "Due in" option (3 days) is accepted when sending
8. AIH-04-08 — To check the assignment form has the current class ticked
9. AIH-04-09 — To check the assignment form has "Due in" set to 1 day
10. AIH-04-10 — To check that after Previous and Next the assignment form keeps the edited title _(improvement: Previous then Next keeps the edited homework title)_
11. AIH-04-11 — To check that after Discard, opening the builder again starts fresh
12. AIH-04-12 — To check assigning homework shows a success message
13. AIH-04-13 — To check the assignment form closes after sending
14. AIH-04-14 — To check homework assigned for a topic then appears in that topic's Compass → Analyse It ("View Last 5 Homework")

### AIH-05 — AI Homework when the network or the AI service fails
**User story:** As a teacher, I want to be told when generating or sending homework fails, so that I can try again.

**Acceptance criteria:**

- AC1: Failures say so, stop the spinner and show no success
- AC2: My title is kept
- AC3: Trying again works

1. AIH-05-01 — Negative: to check when generation fails, the teacher is told
2. AIH-05-02 — Negative: to check when sending fails, no success message appears
3. AIH-05-03 — Negative: to check when generation fails, the spinner stops
4. AIH-05-04 — Negative: to check after generation fails, pressing Generate again generates the questions
5. AIH-05-06 — Negative: to check when sending fails, the teacher is told it was not sent
6. AIH-05-07 — Negative: to check when sending fails, the form stays open with the teacher's title
7. AIH-05-08 — Negative: to check after a failed send, sending again once the network is back sends the homework exactly once
