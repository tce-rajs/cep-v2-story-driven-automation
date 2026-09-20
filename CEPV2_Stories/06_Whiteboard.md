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

### WB-07 — Eraser

1. WB-07-01 — To check erasing a stroke after zooming in removes only the dragged-over portion
2. WB-07-02 — To check erasing near another annotation after panning doesn't remove the neighboring annotation
3. WB-07-03 — Negative: to check erasing over an empty area (no stroke under the cursor) does nothing and doesn't error
