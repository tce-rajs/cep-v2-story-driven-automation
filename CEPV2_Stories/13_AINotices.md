# 13 — AI Notices

Covers creating a class notice from text on the whiteboard: capturing a region with Magnet → Notice, editing the
AI-filled notice, choosing classes and sending it. Module code: `AIN`. Each `### <ID> — <Title>` is a **story**; each
numbered line under it is a **test case** belonging to that story.

Added 2026-09-26 from the reference suite (`new approch playwright`, AI Notices workbook, 26 cases, and Zoho bugs).
Magnet is only shown for classes where the signed-in teacher has it enabled (Class 12A Physics on the QA account).
Sending is a real action: it delivers a real notice to the chosen class (approved by the owner, 2026-09-26).

### AIN-01 — Capture text from the whiteboard into a notice

1. AIN-01-01 — To check Magnet → Notice switches the whiteboard into capture mode with the instruction "Capture the text area to add as your notice's description"
2. AIN-01-02 — To check dragging over the whiteboard draws a selection with Approve and Discard controls
3. AIN-01-03 — To check Discard removes the selection
4. AIN-01-04 — To check approving a selection over real text opens the composer with an AI-written title
5. AIN-01-05 — Negative: to check approving a selection over an empty area shows "Unable to process. Please try again" instead of hanging
6. AIN-01-06 — Edge: to check approving a selection that holds both text and an image gives a usable result, not an error
7. AIN-01-07 — To check Discard leaves capture mode without opening the composer _(split from AIN-01-03, 2026-09-28)_
8. AIN-01-08 — To check approving a selection over real text puts the captured text in the notice body _(split from AIN-01-04, 2026-09-28)_

### AIN-02 — Write and edit the notice

1. AIN-02-01 — To check Send is blocked while the title is empty
2. AIN-02-02 — Regression: Backspace removes characters from the notice title
3. AIN-02-03 — To check Bold formatting applied in the body editor shows as bold text
4. AIN-02-04 — Edge: to check a very long title does not break the composer's layout
5. AIN-02-05 — Edge: to check pasting a large block of formatted text into the body is accepted without breaking the composer
6. AIN-02-06 — To check Recapture replaces an edited title with one from the fresh capture (observed behaviour: earlier edits are not kept)
7. AIN-02-07 — To check Send is allowed once a title is entered _(split from AIN-02-01, 2026-09-28)_
8. AIN-02-08 — Regression: Delete removes characters from the notice title _(split from AIN-02-02, 2026-09-28)_
9. AIN-02-09 — To check Recapture fills the body with the freshly captured text _(split from AIN-02-06, 2026-09-28)_

### AIN-03 — Choose classes and send the notice

1. AIN-03-01 — To check "Share with" lists the teacher's classes with the current class ticked by default
2. AIN-03-02 — Negative: to check unticking every class disables Ready to Send
3. AIN-03-03 — Regression: Send delivers the notice, with exactly one send request (Zoho TCN-I16615, "Send Notice is not working")
4. AIN-03-04 — Regression: double-clicking Send sends the notice only once
5. AIN-03-05 — Regression: sending a notice shows a success message (Zoho TCN-I16615) _(split from AIN-03-03, 2026-09-28)_
6. AIN-03-06 — To check the notice composer closes after sending _(split from AIN-03-03, 2026-09-28)_

### AIN-04 — Leave the notice composer

1. AIN-04-01 — Negative: to check closing the composer with unsent edits warns before discarding them
2. AIN-04-02 — Edge: to check opening and closing the composer 5 times leaves exactly one clean composer
3. AIN-04-03 — Regression: while the composer is open, clicking Current Class doesn't break the app
4. AIN-04-04 — Regression: opening Notice while another Magnet panel (Homework) is open doesn't stack two Magnet panels (Zoho TCN-I15361)
5. AIN-04-05 — Regression: after clicking Current Class with the composer open, class switching works normally once the composer is closed _(split from AIN-04-03, 2026-09-28)_

### AIN-05 — Sending a notice when the network fails (added 2026-09-27)

1. AIN-05-01 — Negative: when the send fails, the teacher is told the notice was not sent
2. AIN-05-02 — Negative/Regression: after a failed send, sending again once the network is back sends the notice exactly once (no duplicate from the failed attempt)
3. AIN-05-03 — Negative: when the send fails, no success message appears _(split from AIN-05-01, 2026-09-28)_
4. AIN-05-04 — Negative: when the send fails, the composer stays open with the teacher's text _(split from AIN-05-01, 2026-09-28)_
