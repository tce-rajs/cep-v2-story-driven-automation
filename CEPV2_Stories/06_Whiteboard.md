# 06 — Whiteboard

Covers the whiteboard surface itself: Canvas, Zoom, Pan, Background, Theme, Annotation
persistence, and Eraser precision. Module code: `WB`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

### WB-01 — Canvas

1. WB-01-01 — To check the canvas loads and accepts drawing input correctly
2. WB-01-02 — Edge: to check resizing the browser window doesn't lose or misalign existing canvas content

### WB-02 — Zoom

1. WB-02-01 — To check zooming in changes the canvas view without distorting existing content
2. WB-02-02 — Edge: to check zooming to the maximum limit doesn't break the canvas
3. WB-02-03 — To check zooming out changes the canvas view without distorting existing content _(split from WB-02-01, 2026-09-28)_
4. WB-02-04 — Edge: to check zooming to the minimum limit doesn't break the canvas _(split from WB-02-02, 2026-09-28)_

### WB-03 — Pan

1. WB-03-01 — To check panning the canvas moves the view without affecting content placement
2. WB-03-02 — Edge: to check panning to the extreme edge of the canvas doesn't clip or lose content near the boundary
3. WB-03-03 — Regression: opening an asset from the Playlist doesn't pan the whiteboard by itself (Zoho TCN-I16253)
4. WB-03-04 — Regression: an asset opened from the Playlist appears where the teacher is working, not at the top of the board (Zoho TCN-I15241)

### WB-04 — Background

1. WB-04-01 — To check changing the whiteboard background doesn't affect existing content

_(The background-change control itself, including its rapid-toggle regression case, is
covered more thoroughly in `05_Toolbar.md`, TB-03 — this story only checks the effect
from the whiteboard-content side.)_

### WB-05 — Theme

1. WB-05-01 — To check changing the whiteboard theme applies correctly without breaking existing content
2. WB-05-02 — Edge: to check switching theme while annotations exist doesn't alter their colors unexpectedly

### WB-06 — Annotation

Each topic has its own independent whiteboard — topic 1.1's whiteboard and its saved
data are entirely separate from topic 1.2's, and either can be empty or hold previously
created annotations/images/shapes. Autosave is confirmed by a **success message at the
top-center of the screen**, not a fixed countdown — every scenario below waits for that
message before navigating away, not an arbitrary timer. Three content types autosave
independently and must each be checked the same way: (a) a few typed/drawn lines or
sentences, (b) an image inserted from Gallery, (c) a drawn shape.

1. WB-06-01 — To check each topic has its own separate whiteboard: content created on topic 1.1 does not appear on topic 1.2, and each shows only its own data — empty if nothing was ever added, or the exact content previously created there
2. WB-06-02 — To check each content type (lines/sentences, a Gallery image, a shape) is still there after a refresh
3. WB-06-03 — **Topic switch round-trip.** Steps: (1) add content to the current topic — repeat for each of the 3 content types; (2) wait for the top-center success message confirming the save; (3) switch to a different topic; (4) switch back to the original topic; (5) verify the content is still there exactly as left
4. WB-06-04 — **Logout/login round-trip.** Steps: (1) add content to the current topic — repeat for each of the 3 content types; (2) wait for the top-center success message; (3) log out; (4) log back in; (5) verify the added content is still present. _(Whether the app lands back on the same topic at all is a separate check — see `07_ClassNavigation.md`, NAV-05. This case only covers whether the content itself survived, assuming you navigate back to that topic.)_
5. WB-06-05 — **Class switch round-trip.** Steps: (1) add content to a topic in the current class — repeat for each of the 3 content types; (2) wait for the top-center success message; (3) switch to a different class; (4) switch back to the original class and topic; (5) verify the content is still there
6. WB-06-06 — Regression (Plan Mode, excluded from automation): **Teach↔Plan Mode round-trip.** Steps: (1) add content in Teach Mode — repeat for each of the 3 content types; (2) wait for the top-center success message; (3) switch to Plan Mode; (4) switch back to Teach Mode; (5) verify the content is still there. _(Whether the app lands back on the same topic is a separate check — see `07_ClassNavigation.md`, NAV-05.)_
7. WB-06-07 — Regression: switching topics rapidly, several times, before the previous switch finishes loading doesn't corrupt content
8. WB-06-08 — Regression: erased shapes/annotations don't reappear after a topic switch
9. WB-06-09 — Regression: navigating away before the save's success message has appeared doesn't lose content
10. WB-06-10 — Regression: adding a large volume of content to one topic in one session doesn't crash the browser
11. WB-06-11 — Regression: 500+ rapid pen strokes in one session don't crash or freeze the canvas
12. WB-06-12 — Concurrency: the same account drawing in two tabs at once doesn't lose either tab's strokes on reload
13. WB-06-13 — Concurrency: the same account open in two tabs/windows at once, both actively used, doesn't destabilize either
14. WB-06-14 — Regression: a stroke drawn just before switching class and back is still there
15. WB-06-15 — Regression: reloading the app part-way through drawing a stroke leaves no broken half-stroke behind
16. WB-06-16 — To check each content type (lines/sentences, a Gallery image, a shape) triggers the top-center success message on save _(split from WB-06-02, 2026-09-28)_
17. WB-06-17 — Regression: after reloading part-way through drawing a stroke, the board still takes new strokes _(split from WB-06-15, 2026-09-28)_

### WB-07 — Eraser

1. WB-07-01 — To check erasing a stroke after zooming in removes only the dragged-over portion
2. WB-07-02 — To check erasing near another annotation after panning doesn't remove the neighboring annotation
3. WB-07-03 — Negative: to check erasing over an empty area (no stroke under the cursor) does nothing and doesn't error

### WB-08 — Long teaching session (added 2026-09-27)

A teacher fills the board during a lesson: handwritten sentences, line after line, and when the visible board is full
they pan to fresh space and keep writing. Autosave must keep up with a whole lesson's writing, nothing may be lost on a
reload, and the board must stay as responsive at the end of the lesson as at the start. Written with a human-like hand
(one joined-up stroke per word plus the dots and crosses, lines that slope a little), not straight test lines.

The sessions build up: 50 words (WB-08-07/08), then 150 (WB-08-09/10), then the long one of about 800 (WB-08-01 and
the cases after it), so a problem shows up in a few minutes before an hour is spent on the long session. Each session
is written once; its first case checks that every stroke lands, and each case after it checks one more result on the
same session. (Split 2026-09-28 so each case checks one result; the new cases carry the next free IDs.)

Two rules from the owner (2026-09-28): writing on a board that already holds content always starts by panning below
it, so new writing never lands on top of old; and how long a teacher writes cannot be predicted, so autosave is checked
at several points of one continuous session (10, 15, 20, 25, 30, 35 minutes -- under the ~40-minute forced sign-out).

1. WB-08-01 — **Long session, about 800 words.** On an empty board, handwrite about 800 words, panning to fresh board space each time the visible area is full; if the forced sign-out comes (~40 min, LOG-06-02), sign back in, pan below what is already written and carry on. Expected: every stroke written while signed in lands on the board
2. WB-08-02 — Performance: writing the last 100 words of the 800-word session is not much slower than writing the first 100 (the board does not bog down as it fills up)
3. WB-08-03 — Negative: the network drops while the teacher keeps writing. Expected: everything written offline stays on the board
4. WB-08-04 — Negative: the teacher closes the app straight after the last word, before the autosave countdown ends. Expected: the last words are not lost when the app is opened again
5. WB-08-05 — Edge: Undo right after a long passage removes only the last stroke (not the whole word, line or page)
6. WB-08-06 — Edge: switching to another topic and back after the 800-word session brings back the full board, every stroke, without a partial load
7. WB-08-07 — Short session: handwrite about 50 words with panning. Expected: every stroke lands on the board
8. WB-08-08 — Short session: after the 50 words, a reload brings every stroke back with exactly the same shape
9. WB-08-09 — Medium session: handwrite about 150 words with panning. Expected: every stroke lands on the board
10. WB-08-10 — Medium session: after the 150 words, a reload brings every stroke back with exactly the same shape
11. WB-08-11 — During the 800-word session, autosave runs as the teacher writes, not only at the end (how far it keeps up is WB-08-21..26)
12. WB-08-12 — A "Whiteboard Saved!" message follows the last word of the 800-word session
13. WB-08-13 — After the 800-word session, a reload brings every stroke back with exactly the same shape
14. WB-08-14 — Performance: after the 800-word session, a reload shows the full board within 20 seconds
15. WB-08-15 — Negative: while the network is down, the app does not claim "Whiteboard Saved!"
16. WB-08-16 — Negative: once the network is back, autosave resumes
17. WB-08-17 — Negative: after the network is back and the app is reloaded, nothing written offline (before or during the outage) is lost
18. WB-08-18 — Edge: Redo after that Undo puts the same stroke back
19. WB-08-19 — Negative: what the teacher writes after the network comes back is still there after a reload _(split from WB-08-17, 2026-09-28)_
20. WB-08-20 — Regression: across the forced sign-out during the 800-word session, nothing already written is lost (the teacher signs back in and pans below it before writing on)
21. WB-08-21 — Autosave while writing continuously: after 10 minutes, everything written in the first 5 minutes is already saved on the server (read through a second session)
22. WB-08-22 — Autosave while writing continuously: after 15 minutes, everything written in the first 10 minutes is already saved
23. WB-08-23 — Autosave while writing continuously: after 20 minutes, everything written in the first 15 minutes is already saved
24. WB-08-24 — Autosave while writing continuously: after 25 minutes, everything written in the first 20 minutes is already saved
25. WB-08-25 — Autosave while writing continuously: after 30 minutes, everything written in the first 25 minutes is already saved
26. WB-08-26 — Autosave while writing continuously: after 35 minutes, everything written in the first 30 minutes is already saved

### WB-09 — Data integrity: what the teacher sees is what is saved (added 2026-09-27)

1. WB-09-01 — Regression: after Clear Whiteboard and a reload, nothing comes back
2. WB-09-02 — Edge: Undo straight after Clear Whiteboard leaves the saved board matching what is on screen (no difference after a reload)
3. WB-09-03 — Regression: handwriting rubbed out with the eraser stays erased after a reload
4. WB-09-04 — Edge: handwriting written while zoomed in comes back in exactly the same place and size after a reload
5. WB-09-05 — Edge: handwriting written far away after a long pan comes back in the same place after a reload
6. WB-09-06 — Negative: switching class straight after writing (before the autosave) never puts the strokes on the other class's board
7. WB-09-07 — Edge: a text box with 1,500 characters is saved in full
8. WB-09-08 — After switching class straight after writing, the strokes are on their own board when the teacher comes back _(split from WB-09-06, 2026-09-28)_

### WB-10 — Touch and stylus on the classroom panel (added 2026-09-27)

Classroom panels are touch screens used with fingers and a pen. These cases use real touch and pen input. (Split
2026-09-28 so each case checks one result; the new cases carry the next free IDs. The 150-word sessions are each
written once, and the cases after the writing case check one more result on the same session.)

1. WB-10-01 — A finger stroke with the Pen draws exactly one stroke where the finger went
2. WB-10-02 — A stylus stroke with the Pen draws exactly one stroke
3. WB-10-03 — Regression: fast stylus handwriting (30 words) keeps every stroke
4. WB-10-04 — A two-finger drag pans the board, even with the Pen selected
5. WB-10-05 — Pinching out zooms in
6. WB-10-06 — Negative: with the palm resting on the screen, the pen writes one stroke and the palm draws nothing
7. WB-10-07 — A finger tap on a toolbar tool selects it
8. WB-10-08 — Regression: one finger tap on Undo undoes exactly one stroke (no ghost double tap)
9. WB-10-09 — A finger drag with Select moves a stroke _(whether it also draws nothing new cannot be told apart from the selection handles, which are drawn as strokes too)_
10. WB-10-10 — The stylus eraser rubs out what it passes over
11. WB-10-11 — Regression: one finger tap on a Playlist card opens it, every time (tapped several times, since the failure is intermittent)
12. WB-10-12 — Regression: one finger tap on "+" opens the Add Resource menu and it stays open
13. WB-10-13 — Swiping the Playlist strip with a finger scrolls it
14. WB-10-14 — Edge: a long press on the board with the Pen leaves at most a dot
15. WB-10-15 — Regression: a teacher handwrites about 150 words with a finger, panning to fresh space with the Pan tool; every stroke lands (none dropped, none extra)
16. WB-10-16 — Regression: a teacher handwrites about 150 words with a stylus, panning to fresh space with the Pan tool; every pen stroke lands (none dropped, none extra). _(Panning uses the Pan tool, not two fingers, because a two-finger drag draws instead of panning (WB-10-04).)_
17. WB-10-17 — Negative: the same 150-word stylus session with the palm resting on the screen; only the pen strokes land (no extra marks from the palm)
18. WB-10-18 — Regression: fast stylus handwriting (30 words) comes back exactly after a reload
19. WB-10-19 — A two-finger drag draws nothing, even with the Pen selected
20. WB-10-20 — Pinching draws nothing
21. WB-10-21 — Regression: a finger tap that opens a Playlist card opens exactly one player (no ghost second tap)
22. WB-10-22 — Swiping the Playlist strip with a finger does not open a card
23. WB-10-23 — Edge: a long press on the board with the Pen opens no menu or anything unexpected
24. WB-10-24 — The 150-word finger session does not lose anything written on the board before it
25. WB-10-25 — A "Whiteboard Saved!" message follows the last word of the 150-word finger session
26. WB-10-26 — After the 150-word finger session, a reload brings the board back exactly
27. WB-10-27 — The 150-word stylus session does not lose anything written on the board before it
28. WB-10-28 — A "Whiteboard Saved!" message follows the last word of the 150-word stylus session
29. WB-10-29 — After the 150-word stylus session, a reload brings the board back exactly

### WB-11 — A teacher's day on one topic (added 2026-09-27)

Uses a topic whose board is never cleared (Class 12A Physics, 3.1), so writing accumulates the way a real classroom
board fills up over days.

The day runs as five cases in order (split 2026-09-28 so each case checks one result). Each case notes the board as it
finds it, so none depends on another having passed.

1. WB-11-01 — Regression: in the morning the teacher pans to fresh space and handwrites about 100 words with the stylus; the board keeps everything from before (this run and earlier days) exactly once, plus exactly the new strokes
2. WB-11-02 — Regression: after signing out and back in, everything on the board is still there, exactly once
3. WB-11-03 — Regression: after signing in again the teacher pans to fresh space and handwrites about 100 words with a finger; the board keeps everything from before exactly once, plus exactly the new strokes
4. WB-11-04 — Regression: after closing and reopening the app, everything on the board is still there, exactly once
5. WB-11-05 — Regression: at the end of the day, a reload brings back every stroke of every session exactly, once
