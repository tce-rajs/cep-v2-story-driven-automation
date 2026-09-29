# 01 — Without Login

Covers what's checkable before any login happens: opening the app straight into the
whiteboard, the header, which parts of the toolbar are (and aren't) available, and
whether the whiteboard is actually usable pre-login. Module code: `PRE`. Each
`### <ID> — <Title>` is a **story**; each numbered line under it is a **test case**
belonging to that story.

### PRE-01 — Whiteboard loads by default without logging in

1. PRE-01-01 — To check opening the app without logging in loads the whiteboard by default
2. PRE-01-02 — Negative: to check no login prompt or redirect interrupts the load

### PRE-02 — Header displays correctly

1. PRE-02-01 — To check the logo displays in the top-left corner
2. PRE-02-02 — To check the current time displays in the top-right corner
3. PRE-02-03 — To check the version number displays in the top-left corner _(split from PRE-02-01, 2026-09-28)_
4. PRE-02-04 — To check the current date displays in the top-right corner _(split from PRE-02-02, 2026-09-28)_

### PRE-03 — Toolbar is available, except Magnet

The story's first case listed the whole toolbar and the User menu together; it was split (2026-09-28) into one case per
tool, and PRE-03-01 now covers only the User menu.

1. PRE-03-01 — To check the User menu is visible without logging in
2. PRE-03-02 — Negative: to check the Magnet menu is **not** available without login
3. PRE-03-03 — To check the Widgets entry only shows "Open Widgets" — not the full logged-in widget set
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

1. PRE-04-01 — To check the user can draw on the whiteboard
2. PRE-04-02 — To check the user can erase drawn content
3. PRE-04-03 — To check the user can add a shape
4. PRE-04-04 — To check the user can add a text box
5. PRE-04-05 — To check the user can open a widget
6. PRE-04-06 — Negative: to check none of these actions trigger an unexpected login prompt
7. PRE-04-07 — To check the user can use an open widget _(split from PRE-04-05, 2026-09-28)_
8. PRE-04-08 — To check the user can close an open widget _(split from PRE-04-05, 2026-09-28)_

### PRE-05 — Open Sign In from Guest Mode

Added 2026-09-26 from the reference suite (Authentication workbook, ENT-01..06).

1. PRE-05-01 — To check the Guest Mode message is visible before signing in
2. PRE-05-02 — To check clicking Sign in opens the PIN sign-in view by default
3. PRE-05-03 — To check the Sign In window can be closed
4. PRE-05-04 — Edge: to check content drawn on the whiteboard in Guest Mode is unchanged after opening and closing the Sign In window
5. PRE-05-05 — To check the Sign In window can be opened again after closing it _(split from PRE-05-03, 2026-09-28)_
