# 15 — AI Homework

Covers building homework with AI (Magnet → Homework): choosing the type and number of questions, generating and
reviewing the questions, and assigning the homework to classes. Module code: `AIH`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

Added 2026-09-26 from the reference suite (`new approch playwright`, AI Homework workbook, 30 cases, and Zoho bugs).
Generation is a real AI call that takes 20–30 seconds. It only works for supported subjects (Mathematics and
Physics confirmed; History shows a "grade or class seems incorrect" banner). Sending is a real action: it assigns
real homework to the chosen class (approved by the owner, 2026-09-26).

### AIH-01 — Open the homework builder

1. AIH-01-01 — To check Magnet → Homework opens the builder with the Homework and Revise cards, question counters, Select Chapter and Generate
2. AIH-01-02 — To check the builder's header shows the current class, subject and chapter
3. AIH-01-03 — Negative: to check a subject that isn't supported shows the "grade or class seems incorrect" message and does not generate
4. AIH-01-04 — Edge: to check opening and closing the builder 5 times leaves exactly one clean builder
5. AIH-01-05 — Regression: opening Homework while another Magnet panel is open doesn't leave two Magnet panels open at once (Zoho TCN-I15361)

### AIH-02 — Choose the homework type and number of questions

1. AIH-02-01 — To check Homework is selected by default with 15 objective questions, and Revise offers 10 objective and 5 subjective
2. AIH-02-02 — To check the + and − buttons change a question count by one each click
3. AIH-02-03 — Regression: a fast double-click on + adds two questions, not zero
4. AIH-02-04 — Edge: to check clicking + and − alternately 20 times returns the count to where it started
5. AIH-02-05 — Edge: to check the lowest allowed count still generates exactly that many questions
6. AIH-02-06 — To check Select Chapter changes the chapter shown in the builder's header

### AIH-03 — Generate and review the questions

1. AIH-03-01 — To check Generate produces the chosen number of questions, all about the selected chapter
2. AIH-03-02 — To check moving between the generated questions works, and going past the first or last question doesn't wrap or error
3. AIH-03-03 — To check Regenerate replaces a single question, and the new question is still there after moving away and back
4. AIH-03-04 — Regression: removing a generated question doesn't leave a blank question behind (Zoho TCN-I15460)
5. AIH-03-05 — Regression: double-clicking Generate starts only one generation
6. AIH-03-06 — Regression: generated question text doesn't show stray "$" symbols (Zoho TCN-I15320)

### AIH-04 — Assign the homework to classes

1. AIH-04-01 — To check Next opens the assignment form with a pre-filled title, the current class ticked, and "Due in" set to 1 day
2. AIH-04-02 — Negative: to check sending is blocked while the homework title is empty
3. AIH-04-03 — Negative: to check sending is blocked when no class is ticked
4. AIH-04-04 — To check Previous returns to the questions with nothing lost, and going forward again keeps the form as filled
5. AIH-04-05 — To check Discard closes the builder, and opening it again starts fresh
6. AIH-04-06 — To check Ready to Send assigns the homework and shows a success message
7. AIH-04-07 — Edge: to check the longest "Due in" option (3 days) is accepted when sending

### AIH-05 — AI Homework when the network or the AI service fails (added 2026-09-27)

1. AIH-05-01 — Negative: when generation fails, the teacher is told, the spinner stops, and pressing Generate again works
2. AIH-05-02 — Negative: when sending fails, no success message appears and the form stays open with the teacher's title
