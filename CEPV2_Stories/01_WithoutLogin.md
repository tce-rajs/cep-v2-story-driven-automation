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

1. PRE-02-01 — To check the logo and version number display in the top-left corner
2. PRE-02-02 — To check the date and time display in the top-right corner

### PRE-03 — Toolbar is available, except Magnet

1. PRE-03-01 — To check the whole toolbar — Select Tool, Pan Tool, Background, Pen, Eraser, Shapes, Undo/Redo, User menu — is visible and functional without logging in
2. PRE-03-02 — Negative: to check the Magnet menu is **not** available without login
3. PRE-03-03 — To check the Widgets entry only shows "Open Widgets" — not the full logged-in widget set

### PRE-04 — Whiteboard is usable for all core actions

1. PRE-04-01 — To check the user can draw on the whiteboard
2. PRE-04-02 — To check the user can erase drawn content
3. PRE-04-03 — To check the user can add a shape
4. PRE-04-04 — To check the user can add a text box
5. PRE-04-05 — To check the user can open and use a widget
6. PRE-04-06 — Negative: to check none of these actions trigger an unexpected login prompt
