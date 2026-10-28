# 06 — Whiteboard

Covers the whiteboard surface itself: Canvas, Zoom, Pan, Background, Theme, Annotation
persistence, and Eraser precision. Module code: `WB`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

### WB-01 — Canvas

**User story:** As a teacher, I want a canvas that takes my writing at once, so that teaching is not interrupted.

**Acceptance criteria:**

- AC1: The canvas loads and accepts strokes
- AC2: Resizing the window keeps content in place

1. WB-01-01 — To check the canvas loads and accepts drawing input correctly
2. WB-01-02 — Edge: to check resizing the browser window doesn't lose or misalign existing canvas content
3. WB-01-03 — Negative: to check the board never opens blank or grey when the topic has content

### WB-02 — Zoom

**User story:** As a teacher, I want to zoom in and out, so that small details and the whole board are both visible.

**Acceptance criteria:**

- AC1: Zoom in and out change the view without distorting content
- AC2: The zoom limits are reached without breaking the board

1. WB-02-01 — To check zooming in changes the canvas view without distorting existing content
2. WB-02-02 — Edge: to check zooming to the maximum limit doesn't break the canvas
3. WB-02-03 — To check zooming out changes the canvas view without distorting existing content
4. WB-02-04 — Edge: to check zooming to the minimum limit doesn't break the canvas
5. WB-02-05 — Negative: to check zooming past the maximum or minimum does nothing and leaves the board usable

### WB-03 — Pan

**User story:** As a teacher, I want to pan to any part of the board, so that I can use a large board.

**Acceptance criteria:**

- AC1: Panning moves the view, not content
- AC2: Far edges keep their content
- AC3: Opening a Playlist asset does not pan the board and opens where I am working

1. WB-03-01 — To check panning the canvas moves the view without affecting content placement
2. WB-03-02 — Edge: to check panning to the extreme edge of the canvas doesn't clip or lose content near the boundary
3. WB-03-03 — Regression: to check opening an asset from the Playlist doesn't pan the whiteboard by itself
4. WB-03-04 — Regression: to check an asset opened from the Playlist appears where the teacher is working, not at the top of the board
5. WB-03-05 — Negative: to check panning to the far edge and back never loses content

### WB-04 — Background

**User story:** As a teacher, I want to change the background without affecting what I have written, so that I can change it mid-lesson.

**Acceptance criteria:**

- AC1: Existing content is unchanged after a background change

1. WB-04-01 — To check changing the whiteboard background doesn't affect existing content _(the same check as TB-03-05, kept here for the whiteboard side)_
2. WB-04-02 — Negative: to check a background change never changes the colour of existing strokes

_(The background-change control itself, including its rapid-toggle regression case, is
covered more thoroughly in `05_Toolbar.md`, TB-03 — this story only checks the effect
from the whiteboard-content side.)_

### WB-05 — Theme

**User story:** As a teacher, I want a light or dark theme, so that the board is readable in my classroom.

**Acceptance criteria:**

- AC1: The theme applies to the whole board
- AC2: Annotation colours are not changed unexpectedly

1. WB-05-01 — To check changing the whiteboard theme applies correctly without breaking existing content
2. WB-05-02 — Edge: to check switching theme while annotations exist doesn't alter their colors unexpectedly
3. WB-05-03 — Negative: to check a theme change never makes existing writing invisible

### WB-06 — Annotation

**User story:** As a teacher, I want each topic's board saved on its own and brought back exactly, so that I can continue a lesson on another day.

**Acceptance criteria:**

- AC1: Each topic has its own board
- AC2: Lines, images and shapes are saved and a success message confirms it
- AC3: Content comes back after refresh, topic switch, class switch and sign-out
- AC4: Fast switching, heavy use or two tabs never lose or mix content

Each topic has its own independent whiteboard — topic 1.1's whiteboard and its saved
data are entirely separate from topic 1.2's, and either can be empty or hold previously
created annotations/images/shapes. Autosave is confirmed by a **success message at the
top-center of the screen**, not a fixed countdown — every scenario below waits for that
message before navigating away, not an arbitrary timer. Three content types autosave
independently and must each be checked the same way: (a) a few typed/drawn lines or
sentences, (b) an image inserted from Gallery, (c) a drawn shape.

1. WB-06-01 — To check each topic has its own separate whiteboard: content created on topic 1.1 does not appear on topic 1.2, and each shows only its own data — empty if nothing was ever added, or the exact content previously created there
2. WB-06-02 — To check each content type (lines/sentences, a Gallery image, a shape) is still there after a refresh
3. WB-06-03 — To check **Topic switch round-trip.** Steps: (1) add content to the current topic — repeat for each of the 3 content types; (2) wait for the top-center success message confirming the save; (3) switch to a different topic; (4) switch back to the original topic; (5) verify the content is still there exactly as left
4. WB-06-04 — To check **Logout/login round-trip.** Steps: (1) add content to the current topic — repeat for each of the 3 content types; (2) wait for the top-center success message; (3) log out; (4) log back in; (5) verify the added content is still present. _(Whether the app lands back on the same topic at all is a separate check — see `07_ClassNavigation.md`, NAV-05. This case only covers whether the content itself survived, assuming you navigate back to that topic.)_
5. WB-06-05 — To check **Class switch round-trip.** Steps: (1) add content to a topic in the current class — repeat for each of the 3 content types; (2) wait for the top-center success message; (3) switch to a different class; (4) switch back to the original class and topic; (5) verify the content is still there
6. WB-06-06 — Regression: to check **Teach↔Plan Mode round-trip.** Steps: (1) add content in Teach Mode — repeat for each of the 3 content types; (2) wait for the top-center success message; (3) switch to Plan Mode; (4) switch back to Teach Mode; (5) verify the content is still there. _(Whether the app lands back on the same topic is a separate check — see `07_ClassNavigation.md`, NAV-05.)_
7. WB-06-07 — Regression: to check switching topics rapidly, several times, before the previous switch finishes loading doesn't corrupt content
8. WB-06-08 — Regression: to check erased shapes/annotations don't reappear after a topic switch
9. WB-06-09 — Regression: to check navigating away before the save's success message has appeared doesn't lose content
10. WB-06-10 — Regression: to check adding a large volume of content to one topic in one session doesn't crash the browser
11. WB-06-11 — Regression: to check 500+ rapid pen strokes in one session don't crash or freeze the canvas
12. WB-06-12 — Concurrency: to check the same account drawing in two tabs at once doesn't lose either tab's strokes on reload
13. WB-06-13 — Concurrency: to check the same account open in two tabs/windows at once, both actively used, doesn't destabilize either
14. WB-06-14 — Regression: to check a stroke drawn just before switching class and back is still there
15. WB-06-15 — Regression: to check reloading the app part-way through drawing a stroke leaves no broken half-stroke behind
16. WB-06-16 — To check each content type (lines/sentences, a Gallery image, a shape) triggers the top-center success message on save
17. WB-06-17 — Regression: to check after reloading part-way through drawing a stroke, the board still takes new strokes
18. WB-06-18 — Negative: to check content written on one topic never appears on another topic of the same class

### WB-07 — Eraser

**User story:** As a teacher, I want the eraser to be precise when zoomed or panned, so that I only remove what I mean to.

**Acceptance criteria:**

- AC1: Only the dragged-over part is erased at any zoom
- AC2: Neighbouring writing stays
- AC3: Erasing empty space does nothing

1. WB-07-01 — To check erasing a stroke after zooming in removes only the dragged-over portion
2. WB-07-02 — To check erasing near another annotation after panning doesn't remove the neighboring annotation
3. WB-07-03 — Negative: to check erasing over an empty area (no stroke under the cursor) does nothing and doesn't error

### WB-08 — Long teaching session

**User story:** As a teacher, I want to write a whole long lesson on one board, so that a full period of notes is kept.

**Acceptance criteria:**

- AC1: Every stroke of a 50, 150 and 800-word session lands and comes back exactly after a reload
- AC2: Autosave keeps up while I write and "Whiteboard Saved!" follows
- AC3: Writing offline, closing the app or a forced sign-out loses nothing
- AC4: The board does not slow down as it fills

A teacher fills the board during a lesson: handwritten sentences, line after line, and when the visible board is full
they pan to fresh space and keep writing. Autosave must keep up with a whole lesson's writing, nothing may be lost on a
reload, and the board must stay as responsive at the end of the lesson as at the start. Written with a human-like hand
(one joined-up stroke per word plus the dots and crosses, lines that slope a little), not straight test lines.

The sessions build up: 50 words (WB-08-07/08), then 150 (WB-08-09/10), then the long one of about 800 (WB-08-01 and
the cases after it), so a problem shows up in a few minutes before an hour is spent on the long session. Each session
is written once; its first case checks that every stroke lands, and each case after it checks one more result on the
same session.

Two rules: writing on a board that already holds content always starts by panning below
it, so new writing never lands on top of old; and how long a teacher writes cannot be predicted, so autosave is checked
at several points of one continuous session (10, 15, 20, 25, 30, 35 minutes -- under the ~40-minute forced sign-out).

1. WB-08-01 — To check **Long session, about 800 words.** On an empty board, handwrite about 800 words, panning to fresh board space each time the visible area is full; if the forced sign-out comes (~40 min, LOG-06-02), sign back in, pan below what is already written and carry on. Expected: every stroke written while signed in lands on the board
2. WB-08-02 — Performance: to check writing the last 100 words of the 800-word session is not much slower than writing the first 100 (the board does not bog down as it fills up)
3. WB-08-03 — Negative: to check the network drops while the teacher keeps writing. Expected: everything written offline stays on the board
4. WB-08-04 — Negative: to check the teacher closes the app straight after the last word, before the autosave countdown ends. Expected: the last words are not lost when the app is opened again
5. WB-08-05 — Edge: to check undo right after a long passage removes only the last stroke (not the whole word, line or page)
6. WB-08-06 — Edge: to check switching to another topic and back after the 800-word session brings back the full board, every stroke, without a partial load
7. WB-08-07 — To check short session: handwrite about 50 words with panning. Expected: every stroke lands on the board
8. WB-08-08 — To check short session: after the 50 words, a reload brings every stroke back with exactly the same shape
9. WB-08-09 — To check medium session: handwrite about 150 words with panning. Expected: every stroke lands on the board
10. WB-08-10 — To check medium session: after the 150 words, a reload brings every stroke back with exactly the same shape
11. WB-08-11 — To check during the 800-word session, autosave runs as the teacher writes, not only at the end (how far it keeps up is WB-08-21..26)
12. WB-08-12 — To check a "Whiteboard Saved!" message follows the last word of the 800-word session
13. WB-08-13 — To check after the 800-word session, a reload brings every stroke back with exactly the same shape
14. WB-08-14 — Performance: to check after the 800-word session, a reload shows the full board within 20 seconds
15. WB-08-15 — Negative: to check while the network is down, the app does not claim "Whiteboard Saved!"
16. WB-08-16 — Negative: to check once the network is back, autosave resumes _(improvement: autosave resumes after a network drop)_
17. WB-08-17 — Negative: to check after the network is back and the app is reloaded, nothing written offline (before or during the outage) is lost
18. WB-08-18 — Edge: to check redo after that Undo puts the same stroke back
19. WB-08-19 — Negative: to check what the teacher writes after the network comes back is still there after a reload _(improvement: autosave resumes after a network drop)_
20. WB-08-20 — Regression: to check across the forced sign-out during the 800-word session, nothing already written is lost (the teacher signs back in and pans below it before writing on) _(improvement: writing before the forced sign-out is kept)_
21. WB-08-21 — To check autosave while writing continuously: after 10 minutes, everything written in the first 5 minutes is already saved on the server (read through a second session)
22. WB-08-22 — To check autosave while writing continuously: after 15 minutes, everything written in the first 10 minutes is already saved
23. WB-08-23 — To check autosave while writing continuously: after 20 minutes, everything written in the first 15 minutes is already saved
24. WB-08-24 — To check autosave while writing continuously: after 25 minutes, everything written in the first 20 minutes is already saved
25. WB-08-25 — To check autosave while writing continuously: after 30 minutes, everything written in the first 25 minutes is already saved
26. WB-08-26 — To check autosave while writing continuously: after 35 minutes, everything written in the first 30 minutes is already saved

### WB-09 — Data integrity: what the teacher sees is what is saved

**User story:** As a teacher, I want what I see on the board to be exactly what is saved, so that I can trust it.

**Acceptance criteria:**

- AC1: Clear, Undo and erase are saved as seen
- AC2: Zoomed or far-away writing comes back in the same place
- AC3: Switching class, reloading or signing out straight after writing loses nothing and never puts strokes on another board
- AC4: Long text boxes are saved in full

1. WB-09-01 — Regression: to check after Clear Whiteboard and a reload, nothing comes back
2. WB-09-02 — Edge: to check undo straight after Clear Whiteboard leaves the saved board matching what is on screen (no difference after a reload)
3. WB-09-03 — Regression: to check handwriting rubbed out with the eraser stays erased after a reload
4. WB-09-04 — Edge: to check handwriting written while zoomed in comes back in exactly the same place and size after a reload
5. WB-09-05 — Edge: to check handwriting written far away after a long pan comes back in the same place after a reload
6. WB-09-06 — Negative: to check switching class straight after writing (before the autosave) never puts the strokes on the other class's board
7. WB-09-07 — Edge: to check a text box with 1,500 characters is saved in full
8. WB-09-08 — To check after switching class straight after writing, the strokes are on their own board when the teacher comes back
9. WB-09-09 — Negative: to check reloading the app within 10 seconds of writing (before the autosave countdown ends) loses nothing _(improvement: a reload in the autosave countdown keeps the writing)_
10. WB-09-10 — Negative: to check signing out within 10 seconds of writing (before the autosave countdown ends) loses nothing

### WB-10 — Touch and stylus on the classroom panel

**User story:** As a teacher on a touch panel, I want finger and stylus input to write, pan and zoom naturally, so that I can teach as on a real board.

**Acceptance criteria:**

- AC1: A finger or stylus stroke draws exactly one stroke, and fast handwriting keeps every stroke
- AC2: Finger input and gestures (two-finger pan, pinch zoom, finger taps and writing) are not supported; those cases are kept only as a record
- AC3: The palm resting on the screen draws nothing
- AC4: Taps on tools and cards act once

Classroom panels are touch screens used with fingers and a pen. These cases use real touch and pen input. The 150-word
sessions are each written once, and the cases after the writing case check one more result on the same session.

1. WB-10-01 — To check a finger stroke with the Pen draws exactly one stroke where the finger went _(not supported: finger input/gestures are not supported)_
2. WB-10-02 — To check a stylus stroke with the Pen draws exactly one stroke
3. WB-10-03 — Regression: to check fast stylus handwriting (30 words) keeps every stroke
4. WB-10-04 — To check a two-finger drag pans the board, even with the Pen selected _(not supported: finger input/gestures are not supported)_
5. WB-10-05 — To check pinching out zooms in _(not supported: finger input/gestures are not supported)_
6. WB-10-06 — Negative: to check with the palm resting on the screen, the pen writes one stroke and the palm draws nothing _(improvement: palm rejection)_
7. WB-10-07 — To check a finger tap on a toolbar tool selects it _(not supported: finger input/gestures are not supported)_
8. WB-10-08 — Regression: to check one finger tap on Undo undoes exactly one stroke (no ghost double tap) _(not supported: finger input/gestures are not supported)_
9. WB-10-09 — To check a finger drag with Select moves a stroke _(whether it also draws nothing new cannot be told apart from the selection handles, which are drawn as strokes too)_ _(not supported: finger input/gestures are not supported)_
10. WB-10-10 — To check the stylus eraser rubs out what it passes over
11. WB-10-11 — Regression: to check one finger tap on a Playlist card opens it, every time (tapped several times, since the failure is intermittent) _(not supported: finger input/gestures are not supported)_
12. WB-10-12 — Regression: to check one finger tap on "+" opens the Add Resource menu and it stays open _(not supported: finger input/gestures are not supported)_
13. WB-10-13 — To check swiping the Playlist strip with a finger scrolls it _(not supported: finger input/gestures are not supported)_
14. WB-10-14 — Edge: to check a long press on the board with the Pen leaves at most a dot
15. WB-10-15 — Regression: to check a teacher handwrites about 150 words with a finger, panning to fresh space with the Pan tool; every stroke lands (none dropped, none extra) _(not supported: finger input/gestures are not supported)_
16. WB-10-16 — Regression: to check a teacher handwrites about 150 words with a stylus, panning to fresh space with the Pan tool; every pen stroke lands (none dropped, none extra). _(Panning uses the Pan tool, not two fingers, because a two-finger drag draws instead of panning (WB-10-04).)_ _(not supported: finger input/gestures are not supported)_
17. WB-10-17 — Negative: to check the same 150-word stylus session with the palm resting on the screen; only the pen strokes land (no extra marks from the palm) _(improvement: palm rejection)_
18. WB-10-18 — Regression: to check fast stylus handwriting (30 words) comes back exactly after a reload
19. WB-10-19 — To check a two-finger drag draws nothing, even with the Pen selected _(not supported: finger input/gestures are not supported)_
20. WB-10-20 — To check pinching draws nothing _(not supported: finger input/gestures are not supported)_
21. WB-10-21 — Regression: to check a finger tap that opens a Playlist card opens exactly one player (no ghost second tap) _(not supported: finger input/gestures are not supported)_
22. WB-10-22 — To check swiping the Playlist strip with a finger does not open a card _(not supported: finger input/gestures are not supported)_
23. WB-10-23 — Edge: to check a long press on the board with the Pen opens no menu or anything unexpected
24. WB-10-24 — To check the 150-word finger session does not lose anything written on the board before it _(not supported: finger input/gestures are not supported)_
25. WB-10-25 — To check a "Whiteboard Saved!" message follows the last word of the 150-word finger session _(not supported: finger input/gestures are not supported)_
26. WB-10-26 — To check after the 150-word finger session, a reload brings the board back exactly _(not supported: finger input/gestures are not supported)_
27. WB-10-27 — To check the 150-word stylus session does not lose anything written on the board before it
28. WB-10-28 — To check a "Whiteboard Saved!" message follows the last word of the 150-word stylus session
29. WB-10-29 — To check after the 150-word stylus session, a reload brings the board back exactly

### WB-11 — A teacher's day on one topic

**User story:** As a teacher, I want a board I use all day, across sign-outs and restarts, to keep everything exactly once, so that my board is like a real classroom board.

**Acceptance criteria:**

- AC1: Writing is added below earlier writing and nothing earlier changes
- AC2: Sign-out, app restart and reload bring everything back exactly once

Uses a topic whose board is never cleared (Class 12A Physics, 3.1), so writing accumulates the way a real classroom
board fills up over days.

The day runs as five cases in order. Each case notes the board as it
finds it, so none depends on another having passed.

1. WB-11-01 — Regression: to check in the morning the teacher pans to fresh space and handwrites about 100 words with the stylus; the board keeps everything from before (this run and earlier days) exactly once, plus exactly the new strokes
2. WB-11-02 — Regression: to check after signing out and back in, everything on the board is still there, exactly once
3. WB-11-03 — Regression: to check after signing in again the teacher pans to fresh space and handwrites about 100 words with a finger; the board keeps everything from before exactly once, plus exactly the new strokes
4. WB-11-04 — Regression: to check after closing and reopening the app, everything on the board is still there, exactly once
5. WB-11-05 — Regression: to check at the end of the day, a reload brings back every stroke of every session exactly, once
6. WB-11-06 — Negative: to check signing out and back in never shows writing twice

### WB-12 — Whiteboard History

**User story:** As a teacher, I want to see my board's saved versions, so that I can check when and what was saved.

**Acceptance criteria:**

- AC1: Whiteboard History lists the topic's versions, newest first, with stroke counts, changes and times
- AC2: The newest version matches the board and a new save adds a version
- AC3: Each topic has its own history; closing it changes nothing

User menu → Whiteboard History opens a panel listing the topic board's saved versions, newest first, each as
"#N · <strokes> strokes", "+added −removed" and the save time. The checks are read-only: a version is never restored on
a teacher's board, because restoring replaces the board's current content.

1. WB-12-01 — To check Whiteboard History opens from the User menu and lists the current topic's saved versions, newest first
2. WB-12-02 — To check the newest version's stroke count matches the strokes on the board
3. WB-12-03 — To check that after writing a few strokes and waiting for autosave, a new version appears with the right "+added" count
4. WB-12-04 — To check each version shows its save time, and the times are in order
5. WB-12-05 — To check the history belongs to the current topic: another topic shows its own list
6. WB-12-06 — To check closing Whiteboard History (X) leaves the board unchanged
7. WB-12-07 — Negative: to check a topic with an empty board shows an empty-state message, not a blank panel
8. WB-12-08 — Regression: to check writing lost before a forced sign-out (LOG-06-06) is absent from the history too, which shows the loss is on the server, not only on screen _(improvement: writing before the forced sign-out is kept)_

### WB-13 — Heavy boards

**User story:** As a teacher, I want a board with thousands of strokes to open and work smoothly, so that a full term of notes stays usable.

**Acceptance criteria:**

- AC1: A board of about 10,000 strokes opens without crashing, in the client and the browser
- AC2: Signing in onto a heavy board works
- AC3: Writing, zoom and pan stay smooth, and switching away and back keeps it complete

From the long writing runs on the Ultra server: 12A Physics 1.7 (~8,400 strokes), 1.8 (~12,700) and 1.9 (~14,200). The
desktop client crashes ("Target crashed") when it opens a board of about 8,400+ strokes (5,190 opened fine), and the
account then crashes again at every sign-in because it reopens the last topic (CLIENT-01). Read-only on existing boards.

1. WB-13-01 — Regression: to check the desktop client opens a board of about 10,000 strokes without crashing _(improvement: very large boards open without a crash)_
2. WB-13-02 — Regression: to check signing in when the last topic is a heavy board does not crash the app _(improvement: very large boards open without a crash)_
3. WB-13-03 — Performance: to check a board of about 10,000 strokes opens within an agreed time (browser and client)
4. WB-13-04 — Performance: to check writing, zoom and pan stay smooth on a heavy board
5. WB-13-05 — To check switching from a heavy board to another topic and back works, and the heavy board is complete
6. WB-13-06 — To check Whiteboard History and the Minimap open on a heavy board

### WB-14 — A board as teachers really write

**User story:** As a teacher, I want everything I normally do on a board (headings, points, arrows, circling, crossing out, formulas, diagrams, two languages, writing over a PDF) to be saved exactly, so that the board is a true record of the lesson.

**Acceptance criteria:**

- AC1: Mixed content (headings, bullet points, arrows, circles, crossed-out and rewritten words, colour highlights) is saved exactly
- AC2: Maths and science notation (fractions, powers, subscripts, units, labelled diagrams, a small table) is saved exactly
- AC3: English, Hindi/Marathi and formulas on one board all come back after sign-out
- AC4: Writing over an opened PDF or image stays on it after closing and reopening (covered by PLR-14)
- AC5: A long board can be navigated with the Minimap

1. WB-14-01 — To check the “Properties of Electric Charge” lesson on Class 12A Physics topic 1.6, with a purple underlined heading and white numbered notes, is saved and comes back exactly after sign-out and sign-in
2. WB-14-02 — To check a word crossed out and rewritten beside it is saved as written (both the crossing-out and the new word)
3. WB-14-03 — To check highlighting a line with a second colour over existing writing is saved in the right order (highlight under or over, as drawn)
4. WB-14-04 — To check fractions, powers (x²), subscripts (H₂O), units and a small hand-drawn table are saved exactly
5. WB-14-05 — To check a labelled diagram (shapes, arrows and handwritten labels) keeps its labels in place after a reload
6. WB-14-06 — To check an English heading, a Marathi explanation and a formula on one board all come back after sign-out
7. WB-14-08 — To check each screen of a 9-screen board can be reached from the Minimap, and the viewport box matches what is shown
8. WB-14-09 — Negative: to check Hindi or Marathi text on the board never comes back as boxes or question marks after sign-out

### WB-15 — Save the board to the Playlist or as a PDF

**User story:** As a teacher, I want to save my board to the topic's Playlist or download it as a PDF, so that I can reopen it in a later lesson or share the notes with my students.

**Acceptance criteria:**

- AC1: Add Resource → Whiteboard offers Add to Playlist and Download PDF
- AC2: Add to Playlist asks for a title (filled in for me), and Discard adds nothing
- AC3: The saved board is in the topic's Playlist and opens in its own panel
- AC4: Download PDF saves a PDF of the board

1. WB-15-01 — To check the Whiteboard card offers Add to Playlist and Download PDF
2. WB-15-02 — To check Add to Playlist opens a Save dialog with a board title already filled in
3. WB-15-03 — To check saving adds the board to the topic Playlist under its title
4. WB-15-04 — Negative: to check Discard closes the Save dialog and adds nothing
5. WB-15-05 — To check a saved board opens from the Playlist in its own panel, with Open in Whiteboard
6. WB-15-06 — To check Download PDF saves a PDF of the board
