# 06 — Whiteboard

Covers the whiteboard surface itself: Canvas, Zoom, Pan, Background, Theme, Annotation
persistence, and Eraser precision. Module code: `WB`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

### WB-01 — Canvas

1. WB-01-01 — To check the canvas loads and accepts drawing input correctly
2. WB-01-02 — Edge: to check resizing the browser window doesn't lose or misalign existing canvas content

### WB-02 — Zoom

1. WB-02-01 — To check zooming in/out changes the canvas view without distorting existing content
2. WB-02-02 — Edge: to check zooming to the maximum or minimum limit doesn't break the canvas

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
2. WB-06-02 — To check each content type (lines/sentences, a Gallery image, a shape) triggers the top-center success message on save, and the content is still there after a refresh
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

### WB-07 — Eraser

1. WB-07-01 — To check erasing a stroke after zooming in removes only the dragged-over portion
2. WB-07-02 — To check erasing near another annotation after panning doesn't remove the neighboring annotation
3. WB-07-03 — Negative: to check erasing over an empty area (no stroke under the cursor) does nothing and doesn't error

### WB-08 — Long teaching session (added 2026-09-27)

A teacher fills the board during a lesson: handwritten sentences, line after line, and when the visible board is full
they pan to fresh space and keep writing. Autosave must keep up with a whole lesson's writing, nothing may be lost on a
reload, and the board must stay as responsive at the end of the lesson as at the start. Written with a human-like hand
(one joined-up stroke per word plus the dots and crosses, lines that slope a little), not straight test lines.

1. WB-08-01 — **Long session, about 800 words.** Steps: (1) on an empty board, handwrite about 800 words, panning to fresh board space each time the visible area is full; (2) watch the autosave messages during the session; (3) wait for the final "Whiteboard Saved!"; (4) reload the app. Expected: autosave runs during the session, not only at the end; the final save covers the last word; after the reload every stroke is back with exactly the same shape, and the board loads it within a reasonable time
2. WB-08-02 — Performance: writing the last 100 words of the session is not much slower than writing the first 100 (the board does not bog down as it fills up)
3. WB-08-03 — Negative: the network drops while the teacher keeps writing. Expected: the teacher is told the work is not being saved (or it is kept safely), and once the network is back everything written offline is saved; nothing is lost after a reload
4. WB-08-04 — Negative: the teacher closes the app straight after the last word, before the autosave countdown ends. Expected: the last words are not lost when the app is opened again
5. WB-08-05 — Edge: Undo right after a long passage removes only the last stroke (not the whole word, line or page), and Redo puts it back
6. WB-08-06 — Edge: switching to another topic and back after a long session brings back the full board, every stroke, without a partial load

### WB-09 — Data integrity: what the teacher sees is what is saved (added 2026-09-27)

1. WB-09-01 — Regression: after Clear Whiteboard and a reload, nothing comes back
2. WB-09-02 — Edge: Undo straight after Clear Whiteboard leaves the saved board matching what is on screen (no difference after a reload)
3. WB-09-03 — Regression: handwriting rubbed out with the eraser stays erased after a reload
4. WB-09-04 — Edge: handwriting written while zoomed in comes back in exactly the same place and size after a reload
5. WB-09-05 — Edge: handwriting written far away after a long pan comes back in the same place after a reload
6. WB-09-06 — Negative: switching class straight after writing (before the autosave) never puts the strokes on the other class's board, and they are on their own board when the teacher comes back
7. WB-09-07 — Edge: a text box with 1,500 characters is saved in full

### WB-10 — Touch and stylus on the classroom panel (added 2026-09-27)

Classroom panels are touch screens used with fingers and a pen. These cases use real touch and pen input.

1. WB-10-01 — A finger stroke with the Pen draws exactly one stroke where the finger went
2. WB-10-02 — A stylus stroke with the Pen draws exactly one stroke
3. WB-10-03 — Regression: fast stylus handwriting (30 words) keeps every stroke, and they survive a reload
4. WB-10-04 — A two-finger drag pans the board and draws nothing, even with the Pen selected
5. WB-10-05 — Pinching out zooms in and draws nothing
6. WB-10-06 — Negative: with the palm resting on the screen, the pen writes one stroke and the palm draws nothing
7. WB-10-07 — A finger tap on a toolbar tool selects it
8. WB-10-08 — Regression: one finger tap on Undo undoes exactly one stroke (no ghost double tap)
9. WB-10-09 — A finger drag with Select moves a stroke and draws nothing new
10. WB-10-10 — The stylus eraser rubs out what it passes over
11. WB-10-11 — Regression: one finger tap on a Playlist card opens exactly one player
12. WB-10-12 — Regression: one finger tap on "+" opens the Add Resource menu and it stays open
13. WB-10-13 — Swiping the Playlist strip with a finger scrolls it and does not open a card
14. WB-10-14 — Edge: a long press on the board with the Pen leaves at most a dot and opens nothing unexpected
15. WB-10-15 — Regression: a teacher handwrites about 150 words with a finger; every stroke lands, autosaves and is back exactly after a reload
16. WB-10-16 — Regression: a teacher handwrites about 150 words with a stylus, the palm resting on the screen, panning to fresh space with two fingers; every pen stroke lands (no extra marks from the palm or the pan), autosaves and is back exactly after a reload

### WB-11 — A teacher's day on one topic (added 2026-09-27)

Uses a topic whose board is never cleared (Class 12A Physics, 3.1), so writing accumulates the way a real classroom
board fills up over days.

1. WB-11-01 — Regression: a teacher writes about 100 words with the stylus and signs out; signs in again, finds everything, pans to fresh space and writes about 100 words with a finger; the app is closed and reopened, everything is still there, they pan and write about 100 words more with the stylus; after a final reload every stroke of every session (and of earlier days) is present exactly once, unchanged
