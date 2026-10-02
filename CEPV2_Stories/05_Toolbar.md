# 05 — Toolbar

Covers the toolbar and everything launched from it: Select/Pan tools, Background, Pen,
Eraser, Shapes, Undo/Redo, the Magnet quick-access menu, and the User menu. Module
code: `TB`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a
**test case** belonging to that story.

### TB-01 — Select Tool

**User story:** As a teacher, I want to select things on the board, so that I can move or change them.

**Acceptance criteria:**

- AC1: Clicking an object selects it and shows its handles
- AC2: Clicking empty board deselects
- AC3: A selected object can be moved and stays where I leave it

1. TB-01-01 — To check the Select tool selects objects on the canvas correctly
2. TB-01-02 — Edge: to check clicking empty canvas while an object is selected deselects it
3. TB-01-03 — To check a selected stroke can be dragged to a new place and is still there after a reload _(added 2026-09-30 for the acceptance criteria)_
4. TB-01-04 — To check dragging a box with Select selects several objects at once _(added 2026-09-30 for the acceptance criteria)_

### TB-02 — Pan Tool

**User story:** As a teacher, I want to pan the board, so that I can reach fresh space or earlier writing.

**Acceptance criteria:**

- AC1: Pan moves the view, not the content
- AC2: Panning far does not glitch the view

1. TB-02-01 — To check the Pan tool moves the canvas without affecting content placement
2. TB-02-02 — Edge: to check panning to the extreme edge of the canvas doesn't glitch or break the view

### TB-03 — Background

**User story:** As a teacher, I want to choose a board background (lines, grids, green or blue board), so that it suits the lesson.

**Acceptance criteria:**

- AC1: Each background can be chosen and "No Background" restores plain
- AC2: Existing content and the rest of the screen stay visible and usable
- AC3: Fast switching does not freeze
- AC4: The chosen background is kept after a reload

1. TB-03-01 — To check choosing a whiteboard background makes it the active background
2. TB-03-02 — To check selecting a background at random, then verifying every UI element (toolbar, header, playlist, etc.) is still visible against it — not just that the background itself rendered
3. TB-03-03 — Regression: changing the background rapidly, many times in a row, doesn't crash or freeze the toolbar
4. TB-03-04 — To check "No Background" puts back a plain background
5. TB-03-05 — To check changing the whiteboard background doesn't affect existing content _(split from TB-03-01, 2026-09-28)_
6. TB-03-06 — To check that on a background chosen at random the board can still be drawn on _(split from TB-03-02, 2026-09-28)_
7. TB-03-07 — To check the chosen background is still set after the app reloads _(added 2026-09-30 for the acceptance criteria)_

### TB-04 — Pen (Draw / Size / Color)

**User story:** As a teacher, I want to write with the pen in any colour and thickness, so that my writing is clear and highlighted where needed.

**Acceptance criteria:**

- AC1: A stroke follows the pen exactly, curves stay curved and long strokes have no breaks
- AC2: Each of the 25 colours and 4 thicknesses draws as chosen
- AC3: The chosen colour and thickness stay chosen when I switch tool and come back
- AC4: Switching to the eraser mid-stroke leaves no stray line

1. TB-04-01 — To check selecting the pencil and dragging across the canvas draws a stroke following the drag path
2. TB-04-02 — To check drawing with each available pen color renders that color correctly
3. TB-04-03 — To check drawing with each available pen thickness renders that thickness correctly
4. TB-04-04 — Regression: a 2000-character text object renders correctly in a text box
5. TB-04-05 — Regression: switching from Pen to Eraser part-way through a drag leaves no stray half-drawn stroke
6. TB-04-06 — Regression: curved strokes are drawn as curves, not straight lines (Zoho TCN-I16705)
7. TB-04-07 — Regression: a long continuous stroke is drawn without breaks (Zoho TCN-I15837)
8. TB-04-08 — Regression: emoji text renders correctly in a text box _(split from TB-04-04, 2026-09-28)_
9. TB-04-09 — Regression: right-to-left (Arabic/Hebrew) text renders correctly in a text box _(split from TB-04-04, 2026-09-28)_
10. TB-04-10 — Regression: after switching from Pen to Eraser part-way through a drag, the board still works _(split from TB-04-05, 2026-09-28)_
11. TB-04-11 — To check the chosen pen colour and thickness stay selected after switching to another tool and back _(added 2026-09-30 for the acceptance criteria)_

### TB-05 — Eraser (Type / Size / Clear)

**User story:** As a teacher, I want to erase exactly what I choose, or clear the board when I really mean to, so that I can correct mistakes without losing the rest.

**Acceptance criteria:**

- AC1: The eraser removes only what it passes over, with no fragments left
- AC2: Eraser size and free mode change how much is erased
- AC3: Clear All Annotations and Clear Whiteboard are separate and ask for confirmation
- AC4: Cleared content stays cleared after a reload

1. TB-05-01 — To check the eraser removes only the stroke segment dragged over
2. TB-05-02 — To check drawing a word, then erasing just one letter of it, removes only that letter and leaves the rest of the word intact
3. TB-05-03 — To check drawing a sentence, then erasing one word of it, removes only that word and leaves the rest of the sentence intact
4. TB-05-04 — To check changing the eraser size changes how much is removed per pass
5. TB-05-05 — To check the free/broad eraser mode removes content wherever it's dragged, without needing to precisely trace over each stroke
6. TB-05-06 — To check "Clear" asks for confirmation first, and removes nothing before it is confirmed
7. TB-05-07 — Regression: the eraser doesn't leave small fragments behind after a single drag pass
8. TB-05-08 — Regression: the eraser removes a long stroke (over about 700 pixels) completely
9. TB-05-09 — Regression: cleared content stays cleared after the app reloads (Zoho TCN-I16689, Clear failing with a 404)
10. TB-05-10 — To check confirming "Clear" removes all whiteboard content _(split from TB-05-06, 2026-09-28)_
11. TB-05-11 — To check the Eraser panel offers two separate clears, "Clear All Annotations" and "Clear Whiteboard" _(added 2026-09-30: seen live, the stories named only one "Clear")_
12. TB-05-12 — To check "Clear All Annotations" removes only the pen/shape annotations and leaves text boxes, images and widgets _(added 2026-09-30; destructive -- same owner decision as TB-05-09/10)_

### TB-06 — Shapes (Choose / Draw / Symbols)

**User story:** As a teacher, I want to draw shapes and insert symbols, so that diagrams look neat.

**Acceptance criteria:**

- AC1: Each shape draws the shape chosen
- AC2: Symbols insert onto the board
- AC3: A click without dragging adds nothing
- AC4: A drawn shape can be moved and resized
- AC5: Many shapes do not slow the board

1. TB-06-01 — To check selecting a shape and dragging draws the expected shape (rectangle/circle/line)
2. TB-06-02 — To check the symbols picker inserts the selected symbol onto the canvas
3. TB-06-03 — Regression: drawing 50+ shape objects on one canvas doesn't degrade responsiveness
4. TB-06-04 — Negative: to check clicking with the Shapes tool without dragging doesn't add an invisible, zero-size shape
5. TB-06-05 — To check a drawn shape can be moved and resized with Select _(added 2026-09-30 for the acceptance criteria)_

### TB-07 — Undo / Redo

**User story:** As a teacher, I want Undo and Redo, so that I can step back and forward through my changes.

**Acceptance criteria:**

- AC1: Undo reverses the last action of any kind (stroke, text, shape, move) in reverse order
- AC2: Redo puts undone actions back in order
- AC3: Rapid clicks undo/redo exactly as many actions as clicked
- AC4: Redo with nothing to redo does nothing

1. TB-07-01 — To check Undo reverses the most recent drawing
2. TB-07-02 — To check Redo reapplies an undone action
3. TB-07-03 — Regression: five rapid Undo clicks remove exactly five strokes, no more and no fewer
4. TB-07-04 — To check Undo steps back through 3 actions in the exact reverse order they were made
5. TB-07-05 — Edge: to check Redo with nothing to redo does nothing and causes no error
6. TB-07-06 — Edge: to check 20 actions in a row can all be undone
7. TB-07-07 — Regression: Undo after moving an object puts the object back, instead of skipping the move and undoing an older action
8. TB-07-08 — To check Undo reverses the most recent text box _(split from TB-07-01, 2026-09-28)_
9. TB-07-09 — To check Undo reverses the most recent shape _(split from TB-07-01, 2026-09-28)_
10. TB-07-10 — Regression: five rapid Redo clicks bring back exactly the five undone strokes _(split from TB-07-03, 2026-09-28)_
11. TB-07-11 — Regression: a burst of mixed rapid Undo/Redo clicks leaves a consistent state and causes no error _(split from TB-07-03, 2026-09-28)_
12. TB-07-12 — To check Redo steps forward through 3 undone actions in the exact order they were made _(split from TB-07-04, 2026-09-28)_

### TB-08 — Magnet menu

**User story:** As a teacher, I want Magnet to give me quick access to Notice, Learning Shorts, Homework and Attendance, so that classroom tasks are one tap away.

**Acceptance criteria:**

- AC1: Magnet lists the entries enabled for the current class only
- AC2: Each entry opens its own panel
- AC3: Fast or double clicks never leave the menu stuck or two panels open

1. TB-08-01 — To check opening Magnet shows the expected set of quick-access tools
2. TB-08-02 — To check selecting Notice from Magnet opens AI Notices correctly
3. TB-08-03 — To check selecting Learning Shorts from Magnet opens it correctly
4. TB-08-04 — To check selecting Homework from Magnet opens AI Homework correctly
5. TB-08-05 — To check selecting Attendance from Magnet opens it correctly
6. TB-08-06 — Regression: clicking two different Magnet items back-to-back, before the first panel opens, doesn't leave the UI broken
7. TB-08-07 — Edge: to check that after opening and closing Magnet 6 times quickly, its menu is closed, not stuck open
8. TB-08-08 — Edge: to check that after opening and closing Magnet 6 times quickly, opening it again shows exactly one menu _(split from TB-08-07, 2026-09-28)_
9. TB-08-09 — To check Magnet lists only the entries enabled for the current class (Attendance is not offered where the class has none) _(added 2026-09-30 for the acceptance criteria)_

### TB-09 — User menu

**User story:** As a teacher, I want a User menu for my profile, theme, keyboard, mode, board history and sign out, so that my settings are in one place.

**Acceptance criteria:**

- AC1: The menu lists the Signed-in-as row, Dark Mode, Virtual Keyboard, Classroom Mode, Whiteboard History, Sign Out and Build
- AC2: Each item does what it says
- AC3: Virtual Keyboard on/off controls the on-screen keyboard everywhere
- AC4: Theme switching settles on the chosen theme

Checked live 2026-09-30 (Ultra server, v 0.0.232): the menu shows the "Signed in as" row (its chevron opens the Account
and Profile tabs), Dark Mode, Virtual Keyboard, Classroom Mode (Teaching / Planning), **Whiteboard History** (new),
Sign Out and the Build line. **Feedback is no longer in the menu** in the browser; the owner saw Feedback open a QR code,
not a form (TB-09-06/10/16 wait for the owner's decision). Whiteboard History is covered in `06_Whiteboard.md`, WB-12.

1. TB-09-01 — To check opening the User menu shows the Signed-in-as row (Profile, Account), Classroom Mode, Dark Mode (Theme), Virtual Keyboard, Whiteboard History, Build Version and Sign Out _(corrected 2026-09-30: Feedback removed, Whiteboard History added)_
2. TB-09-02 — To check Profile opens and displays current settings
3. TB-09-03 — To check Account shows the correct signed-in account details
4. TB-09-04 — To check Classroom Mode switches to Planning
5. TB-09-05 — To check Theme changes the app's visual theme
6. TB-09-06 — To check Feedback opens a submission form with a message field _(owner 2026-09-30: Feedback shows a QR code, not a form -- story to be confirmed)_
7. TB-09-07 — To check Build Version displays the correct value
8. TB-09-08 — To check that with Virtual Keyboard ON, clicking the chapter search box opens the on-screen keyboard, visible inside the window
9. TB-09-09 — To check Sign Out (from this menu) signs out correctly, same as the quick Sign Out button _(corrected 2026-09-30: there is no header Logout)_
10. TB-09-10 — Negative: to check closing/canceling the Feedback form without submitting doesn't send anything
11. TB-09-11 — To check keys pressed on the on-screen keyboard type into the focused input box
12. TB-09-12 — To check the on-screen keyboard opens for a whiteboard text box too, not only the chapter search
13. TB-09-13 — Negative: to check that with Virtual Keyboard OFF, clicking the Add Resource title does not open the on-screen keyboard
14. TB-09-14 — Edge: to check switching Theme 10 times in a row ends on the expected theme, with no flicker left behind
15. TB-09-15 — To check Classroom Mode switches back from Planning to Teaching _(split from TB-09-04, 2026-09-28)_
16. TB-09-16 — To check the Feedback form accepts a message and offers a way to submit it _(split from TB-09-06, 2026-09-28)_
17. TB-09-17 — To check typing on the on-screen keyboard fills the chapter search box _(split from TB-09-08, 2026-09-28)_
18. TB-09-18 — To check the on-screen keyboard opens for the Add Resource title too _(split from TB-09-12, 2026-09-28)_
19. TB-09-19 — Negative: to check that with Virtual Keyboard OFF, clicking a whiteboard text box does not open the on-screen keyboard _(split from TB-09-13, 2026-09-28)_

### TB-10 — Text box

**User story:** As a teacher, I want to type text boxes and format them, so that I can add neat typed notes.

**Acceptance criteria:**

- AC1: Clicking with Text creates a text box where I click
- AC2: Text can be formatted (colour, bold), edited again, moved to front/back, duplicated and deleted
- AC3: An empty text box leaves nothing behind
- AC4: Typed text is kept after clicking away and after a reload

Added 2026-09-26 from the reference suite (Toolbar workbook, TB-TXT-01..06, TB-CYP-08/09, TB-EXP-04).

1. TB-10-01 — To check the Text tool creates a text box centred where the whiteboard is clicked
2. TB-10-02 — To check selecting a text box opens its formatting panel with a colour palette
3. TB-10-03 — To check To Back puts a text box below the content it overlaps
4. TB-10-04 — Negative: to check a text box left empty leaves nothing behind after clicking away
5. TB-10-05 — Regression: Bold makes the selected text visibly bold
6. TB-10-06 — Regression: text that has already been typed can be opened and edited again
7. TB-10-07 — To check typed text stays on the board after clicking away _(split from TB-10-01, 2026-09-28)_
8. TB-10-08 — To check choosing a colour from the palette colours the text _(split from TB-10-02, 2026-09-28)_
9. TB-10-09 — To check To Front puts a text box above the content it overlaps _(split from TB-10-03, 2026-09-28)_
10. TB-10-10 — To check Duplicate copies a text box _(split from TB-10-03, 2026-09-28)_
11. TB-10-11 — To check Delete removes a text box _(split from TB-10-03, 2026-09-28)_
12. TB-10-12 — To check a typed text box is still there, with its text, after the app reloads _(added 2026-09-30 for the acceptance criteria)_

### TB-11 — Widgets

**User story:** As a teacher, I want teaching widgets (ruler, protractor, compass, clock, subject simulations), so that I can demonstrate on the board.

**Acceptance criteria:**

- AC1: The panel lists the widgets and the Discipline filter changes the list
- AC2: A widget opens where I drop it and can be moved
- AC3: Closing removes it and leaves no stray window

Added 2026-09-26 from the reference suite (Toolbar workbook, TB-WIDGET-01..04, TB-EXP-13) and Zoho bugs.

1. TB-11-01 — To check the Widgets panel lists the teaching widgets
2. TB-11-02 — To check the Discipline filter changes which widgets are listed
3. TB-11-03 — To check inserting the Ruler places a ruler on the board
4. TB-11-04 — To check closing a widget removes it from the board
5. TB-11-05 — Edge: to check a widget dragged onto the board lands where it was dropped
6. TB-11-06 — Regression: opening a widget doesn't show a small widget screen on the toolbar (Zoho CWR-I754)
7. TB-11-07 — To check a Ruler placed on the board can be moved _(split from TB-11-03, 2026-09-28)_

### TB-12 — Right-click menu on board objects

**User story:** As a teacher, I want a right-click menu on board objects, so that I can act on one object quickly.

**Acceptance criteria:**

- AC1: Right-click opens the object menu and clicking an image selects it
- AC2: Delete removes the object
- AC3: Escape or clicking away closes the menu and changes nothing

Added 2026-09-26 from the reference suite (Toolbar workbook, TB-CTX-01, TB-OBJ-01/02).

1. TB-12-01 — To check right-clicking an object on the board opens its menu
2. TB-12-02 — To check clicking an inserted image selects it and shows its controls
3. TB-12-03 — To check Delete from the menu removes the object
4. TB-12-04 — To check Escape or clicking away closes the right-click menu without changing anything _(added 2026-09-30 for the acceptance criteria)_
