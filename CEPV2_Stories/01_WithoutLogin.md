# 01 — Without Login

Covers what's checkable before any login happens: opening the app straight into the
whiteboard, the header, which parts of the toolbar are (and aren't) available, and
whether the whiteboard is actually usable pre-login. Module code: `PRE`. Each
`### <ID> — <Title>` is a **story**; each numbered line under it is a **test case**
belonging to that story.

### PRE-01 — Whiteboard loads by default without logging in

**User story:** As a teacher who has not signed in, I want the app to open straight on a usable whiteboard, so that I can start teaching at once.

**Acceptance criteria:**

- AC1: The whiteboard opens by default in Guest Mode
- AC2: No sign-in prompt or redirect blocks the board
- AC3: No class, chapter, topic or Playlist is shown before sign-in

1. PRE-01-01 — To check opening the app without logging in loads the whiteboard by default
2. PRE-01-02 — Negative: to check no login prompt or redirect interrupts the load
3. PRE-01-03 — Negative: to check no class, chapter, topic or Playlist is shown before signing in

### PRE-02 — Header displays correctly

**User story:** As a teacher who has not signed in, I want to see the ClassEdge logo, version, date and time, so that I know the app and the time at a glance.

**Acceptance criteria:**

- AC1: Logo and version show at the top left
- AC2: The current date and time show at the top right
- AC3: The time keeps updating while the app is open

1. PRE-02-01 — To check the logo displays in the top-left corner
2. PRE-02-02 — To check the current time displays in the top-right corner
3. PRE-02-03 — To check the version number displays in the top-left corner
4. PRE-02-04 — To check the current date displays in the top-right corner
5. PRE-02-05 — To check the time shown moves on to the next minute while the app stays open
6. PRE-02-06 — Negative: to check the header never shows a blank, "undefined" or placeholder value for the version, date or time

### PRE-03 — Toolbar is available, except Magnet

**User story:** As a teacher who has not signed in, I want the drawing tools available but not the signed-in features, so that I can use the board without an account while my classes stay private.

**Acceptance criteria:**

- AC1: Every drawing tool is visible and works
- AC2: Magnet and the User menu are not shown; the User menu appears only after sign-in
- AC3: Widgets offers only the basic widgets

1. PRE-03-01 — Negative: to check the User menu is **not** visible without logging in
2. PRE-03-02 — Negative: to check the Magnet menu is **not** available without login
3. PRE-03-03 — To check the Widgets panel shows only the 8 basic widgets (Compass, Clock, Ruler, Protractor, Set Square 30, Set Square 45, Curtain, Split Screen), not the signed-in subject widgets
4. PRE-03-04 — To check every toolbar tool (Select, Pan, Background, Pen, Text, Eraser, Shapes, Undo, Redo) is visible without logging in
5. PRE-03-05 — To check the Select tool activates when clicked, without logging in
6. PRE-03-06 — To check the Pan tool activates when clicked, without logging in
7. PRE-03-07 — To check the Pen tool activates when clicked, without logging in
8. PRE-03-08 — To check the Text tool activates when clicked, without logging in
9. PRE-03-09 — To check the Background tool opens its options panel, without logging in
10. PRE-03-10 — To check the Eraser tool opens its options panel, without logging in
11. PRE-03-11 — To check the Shapes tool opens its options panel, without logging in
12. PRE-03-12 — To check Undo removes a drawn stroke, without logging in
13. PRE-03-13 — To check Redo puts an undone stroke back, without logging in

### PRE-04 — Whiteboard is usable for all core actions

**User story:** As a teacher who has not signed in, I want to draw, erase, add shapes, text and widgets, so that I can teach a quick lesson without signing in.

**Acceptance criteria:**

- AC1: Draw, erase, shapes, text and widgets all work
- AC2: None of these asks me to sign in
- AC3: Guest-mode work is not mixed into a teacher's saved board after signing in
- AC4: The pen colour can be changed and the board can be zoomed
- AC5: Nothing is saved without signing in: a reload starts a clean board

1. PRE-04-01 — To check the user can draw on the whiteboard
2. PRE-04-02 — To check the user can erase drawn content
3. PRE-04-03 — To check the user can add a shape
4. PRE-04-04 — To check the user can add a text box
5. PRE-04-05 — To check the user can open a widget
6. PRE-04-06 — Negative: to check none of these actions trigger an unexpected login prompt
7. PRE-04-07 — To check the user can use an open widget
8. PRE-04-08 — To check the user can close an open widget
9. PRE-04-09 — Negative: to check guest-mode drawing is not added to the teacher's own topic board after signing in
10. PRE-04-10 — To check a pen colour picked in the Pen panel is used for the next stroke
11. PRE-04-11 — To check Zoom In enlarges the board and Reset returns it to 100%
12. PRE-04-12 — To check drawing done in Guest Mode is not kept after the app reloads (nothing is saved without signing in)

### PRE-05 — Open Sign In from Guest Mode

**User story:** As a teacher in Guest Mode, I want to open and close the Sign In window, so that I can sign in when I am ready without losing what is on the board.

**Acceptance criteria:**

- AC1: Guest Mode is shown until I sign in
- AC2: Sign In opens on the PIN view
- AC3: The window can be closed and opened again
- AC4: The board is unchanged by opening and closing it

1. PRE-05-01 — To check the Guest Mode message is visible before signing in
2. PRE-05-02 — To check clicking Sign in opens the PIN sign-in view by default
3. PRE-05-03 — To check the Sign In window can be closed
4. PRE-05-04 — Edge: to check content drawn on the whiteboard in Guest Mode is unchanged after opening and closing the Sign In window
5. PRE-05-05 — To check the Sign In window can be opened again after closing it
6. PRE-05-06 — Negative: to check closing Sign In without entering a PIN leaves the app in Guest Mode with no one signed in

### PRE-06 — Guest Mode keeps working without a network

**User story:** As a teacher whose classroom network is down, I want the board to keep working in Guest Mode, so that the lesson can go on.

**Acceptance criteria:**

- AC1: Drawing and erasing work with no network
- AC2: No error message covers or interrupts the board
- AC3: Every tool panel (Pen, Eraser, Shapes, Background, Widgets) shows its options, even if it is opened for the first time after the network has gone

1. PRE-06-01 — Interruption: to check drawing works with no network
2. PRE-06-02 — Interruption: to check erasing works with no network
3. PRE-06-03 — Negative: to check no error message appears on the board while there is no network
4. PRE-06-04 — Interruption: to check the Pen panel shows its colours when it is first opened with no network
5. PRE-06-05 — Interruption: to check the Eraser panel shows its options when it is first opened with no network
6. PRE-06-06 — Interruption: to check the Shapes panel shows its shapes when it is first opened with no network
7. PRE-06-07 — Interruption: to check the Background panel shows its backgrounds when it is first opened with no network
8. PRE-06-08 — Interruption: to check the Widgets panel shows its widgets when it is first opened with no network
