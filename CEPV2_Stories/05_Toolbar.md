# 05 — Toolbar

Covers the toolbar and everything launched from it: Select/Pan tools, Background, Pen,
Eraser, Shapes, Undo/Redo, the Magnet quick-access menu, and the User menu. Module
code: `TB`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a
**test case** belonging to that story.

### TB-01 — Select Tool

1. TB-01-01 — To check the Select tool selects objects on the canvas correctly
2. TB-01-02 — Edge: to check clicking empty canvas while an object is selected deselects it

### TB-02 — Pan Tool

1. TB-02-01 — To check the Pan tool moves the canvas without affecting content placement
2. TB-02-02 — Edge: to check panning to the extreme edge of the canvas doesn't glitch or break the view

### TB-03 — Background

1. TB-03-01 — To check changing the whiteboard background updates it without affecting existing content
2. TB-03-02 — To check selecting a background at random, then verifying every UI element (toolbar, header, playlist, etc.) is still visible and usable against it — not just that the background itself rendered
3. TB-03-03 — Regression: changing the background rapidly, many times in a row, doesn't crash or freeze the toolbar
4. TB-03-04 — To check "No Background" puts back a plain background

### TB-04 — Pen (Draw / Size / Color)

1. TB-04-01 — To check selecting the pencil and dragging across the canvas draws a stroke following the drag path
2. TB-04-02 — To check drawing with each available pen color renders that color correctly
3. TB-04-03 — To check drawing with each available pen thickness renders that thickness correctly
4. TB-04-04 — Regression: a 2000-character text object and emoji/RTL text render correctly in a text box
5. TB-04-05 — Regression: switching from Pen to Eraser part-way through a drag leaves no stray half-drawn stroke
6. TB-04-06 — Regression: curved strokes are drawn as curves, not straight lines (Zoho TCN-I16705)
7. TB-04-07 — Regression: a long continuous stroke is drawn without breaks (Zoho TCN-I15837)

### TB-05 — Eraser (Type / Size / Clear)

1. TB-05-01 — To check the eraser removes only the stroke segment dragged over
2. TB-05-02 — To check drawing a word, then erasing just one letter of it, removes only that letter and leaves the rest of the word intact
3. TB-05-03 — To check drawing a sentence, then erasing one word of it, removes only that word and leaves the rest of the sentence intact
4. TB-05-04 — To check changing the eraser size changes how much is removed per pass
5. TB-05-05 — To check the free/broad eraser mode removes content wherever it's dragged, without needing to precisely trace over each stroke
6. TB-05-06 — To check "Clear" removes all whiteboard content, with a confirmation step first
7. TB-05-07 — Regression: the eraser doesn't leave small fragments behind after a single drag pass
8. TB-05-08 — Regression: the eraser removes a long stroke (over about 700 pixels) completely
9. TB-05-09 — Regression: cleared content stays cleared after the app reloads (Zoho TCN-I16689, Clear failing with a 404)

### TB-06 — Shapes (Choose / Draw / Symbols)

1. TB-06-01 — To check selecting a shape and dragging draws the expected shape (rectangle/circle/line)
2. TB-06-02 — To check the symbols picker inserts the selected symbol onto the canvas
3. TB-06-03 — Regression: drawing 50+ shape objects on one canvas doesn't degrade responsiveness
4. TB-06-04 — Negative: to check clicking with the Shapes tool without dragging doesn't add an invisible, zero-size shape

### TB-07 — Undo / Redo

1. TB-07-01 — To check Undo reverses the most recent drawing/text/shape action
2. TB-07-02 — To check Redo reapplies an undone action
3. TB-07-03 — Regression: rapid repeated Undo/Redo clicking doesn't skip steps or crash
4. TB-07-04 — To check Undo and Redo step through at least 3 actions in the exact order they were made
5. TB-07-05 — Edge: to check Redo with nothing to redo does nothing and causes no error
6. TB-07-06 — Edge: to check 20 actions in a row can all be undone
7. TB-07-07 — Regression: Undo after moving an object puts the object back, instead of skipping the move and undoing an older action

### TB-08 — Magnet menu

1. TB-08-01 — To check opening Magnet shows the expected set of quick-access tools
2. TB-08-02 — To check selecting Notice from Magnet opens AI Notices correctly
3. TB-08-03 — To check selecting Learning Shorts from Magnet opens it correctly
4. TB-08-04 — To check selecting Homework from Magnet opens AI Homework correctly
5. TB-08-05 — To check selecting Attendance from Magnet opens it correctly
6. TB-08-06 — Regression: clicking two different Magnet items back-to-back, before the first panel opens, doesn't leave the UI broken
7. TB-08-07 — Edge: to check opening and closing Magnet 6 times quickly never leaves its menu stuck open or duplicated

### TB-09 — User menu

1. TB-09-01 — To check opening the User menu shows Profile, Account, Classroom Mode, Theme, Feedback, Build Version, Virtual Keyboard, and Logout
2. TB-09-02 — To check Profile opens and displays current settings
3. TB-09-03 — To check Account shows the correct signed-in account details
4. TB-09-04 — To check Classroom Mode toggles correctly
5. TB-09-05 — To check Theme changes the app's visual theme
6. TB-09-06 — To check Feedback opens a working submission form
7. TB-09-07 — To check Build Version displays the correct value
8. TB-09-08 — To check that with Virtual Keyboard ON, clicking any text input box opens the on-screen keyboard, visible inside the window
9. TB-09-09 — To check Logout (from this menu) signs out correctly, same as the header's Logout control
10. TB-09-10 — Negative: to check closing/canceling the Feedback form without submitting doesn't send anything
11. TB-09-11 — To check keys pressed on the on-screen keyboard type into the focused input box
12. TB-09-12 — To check the on-screen keyboard opens for other kinds of input box too (e.g. a whiteboard text box, the Add Resource title), not only the chapter search
13. TB-09-13 — Negative: to check that with Virtual Keyboard OFF, clicking a text input box does not open the on-screen keyboard
14. TB-09-14 — Edge: to check switching Theme 10 times in a row ends on the expected theme, with no flicker left behind

### TB-10 — Text box

Added 2026-09-26 from the reference suite (Toolbar workbook, TB-TXT-01..06, TB-CYP-08/09, TB-EXP-04).

1. TB-10-01 — To check the Text tool creates a text box where the whiteboard is clicked, and typed text stays on the board after clicking away
2. TB-10-02 — To check selecting a text box opens its formatting panel with a colour palette
3. TB-10-03 — To check To Front, To Back, Duplicate and Delete work on a text box
4. TB-10-04 — Negative: to check a text box left empty leaves nothing behind after clicking away
5. TB-10-05 — Regression: Bold makes the selected text visibly bold
6. TB-10-06 — Regression: text that has already been typed can be opened and edited again

### TB-11 — Widgets

Added 2026-09-26 from the reference suite (Toolbar workbook, TB-WIDGET-01..04, TB-EXP-13) and Zoho bugs.

1. TB-11-01 — To check the Widgets panel lists the teaching widgets
2. TB-11-02 — To check the Discipline filter changes which widgets are listed
3. TB-11-03 — To check inserting the Ruler places a ruler on the board that can be moved
4. TB-11-04 — To check closing a widget removes it from the board
5. TB-11-05 — Edge: to check a widget dragged onto the board lands where it was dropped
6. TB-11-06 — Regression: opening a widget doesn't show a small widget screen on the toolbar (Zoho CWR-I754)

### TB-12 — Right-click menu on board objects

Added 2026-09-26 from the reference suite (Toolbar workbook, TB-CTX-01, TB-OBJ-01/02).

1. TB-12-01 — To check right-clicking an object on the board opens its menu
2. TB-12-02 — To check clicking an inserted image selects it and shows its controls
3. TB-12-03 — To check Delete from the menu removes the object
