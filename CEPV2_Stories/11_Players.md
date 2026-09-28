# 11 — Players

New module — not named in the client's 7-section checklist, which covers _building_ a
quiz (Sidebar's Question Bank) but never names where _attempting/scoring_ it, or
playing a worksheet/ebook/video/image, actually lives. Added because that playback
behavior is real and is a distinct set of user goals from building content. Module
code: `PLR`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a
**test case** belonging to that story.

### PLR-01 — Attempt a quiz

Flow: clicking the quiz loads the quiz player; an AIR card popup appears first and
takes ~5 seconds to disappear before the first question loads. Questions, and their
options, can each be text or an image. The user navigates back and forward across
multiple questions, selects an answer, then submits.

1. PLR-01-01 — To check clicking on the quiz loads the quiz player
2. PLR-01-02 — To check the AIR card popup appears and disappears after ~5 seconds, with the question only loading once it's gone
3. PLR-01-03 — To check a text-based question renders correctly
4. PLR-01-04 — To check an image-based question renders correctly
5. PLR-01-05 — To check text-based options render correctly
6. PLR-01-06 — To check image-based options render correctly
7. PLR-01-07 — To check navigating backward through multiple questions works correctly
8. PLR-01-08 — To check navigating forward through multiple questions works correctly
9. PLR-01-09 — To check selecting an answer and submitting it registers correctly
10. PLR-01-10 — Cross-Mode: split-screen quiz view stays in sync between the teacher's and student's screens
11. PLR-01-11 — Regression: double-clicking Submit doesn't create a duplicate submission
12. PLR-01-12 — Negative: a class with zero enrolled students attempting to launch a Student Test is handled gracefully
13. PLR-01-13 — Performance: a very large quiz doesn't degrade responsiveness
14. PLR-01-14 — Regression: in AIR card mode, navigating back to question 1 shows question 1 again (not the question just left)
15. PLR-01-15 — To check Submit Answer stays disabled until an option is chosen
16. PLR-01-16 — To check choosing a second option clears the first (one answer per question)
17. PLR-01-17 — To check a wrong answer is marked wrong and the correct answer is shown
18. PLR-01-18 — To check Show Answer reveals the correct option
19. PLR-01-19 — Regression: the numbered dots jump straight to that question, every time (Zoho TCN-I15835)
20. PLR-01-20 — To check closing and reopening the quiz starts again from question 1
21. PLR-01-21 — Regression: double-clicking a quiz card opens only one quiz
22. PLR-01-22 — Regression: no question appears more than once in the quiz (Zoho TCN-I16397)

### PLR-02 — Review quiz results

1. PLR-02-01 — To check the score displays correctly immediately after submitting
2. PLR-02-02 — To check reviewing the quiz shows which specific answers were right or wrong
3. PLR-02-03 — Negative: to check attempting to review results before submitting the quiz is not accessible, or shows an appropriate message

### PLR-03 — Complete a worksheet (PDF)

Worksheet = a PDF. It opens and loads; the user navigates backward/forward, or jumps
to a specific page using "Go to Page" with its up/down buttons.

1. PLR-03-01 — To check opening a worksheet loads the PDF correctly
2. PLR-03-02 — To check navigating backward through the PDF works correctly
3. PLR-03-03 — To check navigating forward through the PDF works correctly
4. PLR-03-04 — To check jumping to a specific page using "Go to Page" with the up/down buttons works correctly
5. PLR-03-05 — Negative: an out-of-range page number in "Go to Page" is handled gracefully
6. PLR-03-06 — Regression: a malformed/zero-page worksheet resource is handled without crashing
7. PLR-03-07 — Performance: a very large/long worksheet doesn't degrade responsiveness
8. PLR-03-08 — Concurrency: a Worksheet and a different player type (e.g. a Weblink) open simultaneously don't conflict
9. PLR-03-09 — To check the zoom buttons change the worksheet's zoom
10. PLR-03-10 — To check the answer key button shows and hides the answers, on a worksheet that has one
11. PLR-03-11 — To check the orientation button changes the page orientation
12. PLR-03-12 — Negative: to check Next on the last page stays on the last page
13. PLR-03-13 — To check closing the worksheet exits cleanly

### PLR-04 — Navigate an ebook

1. PLR-04-01 — To check opening a chapter-specific ebook resource and navigating to a new chapter works
2. PLR-04-02 — To check scrolling/paginating through ebook pages works correctly
3. PLR-04-03 — To check closing a linked resource from the ebook closes it cleanly
4. PLR-04-04 — Regression: chapter-jump, pagination, and scroll don't reproduce CEP v1's recurring ebook navigation weak spot

### PLR-05 — Play a video resource

1. PLR-05-01 — To check a video resource opens and plays correctly
2. PLR-05-02 — To check pausing the video works correctly
3. PLR-05-03 — To check closing the video works correctly
4. PLR-05-04 — Regression: the hybrid-player crash on Video doesn't recur
5. PLR-05-05 — To check seeking and volume work
6. PLR-05-06 — Regression: the teacher can annotate over a playing video (Zoho TCN-I15547)
7. PLR-05-07 — To check opening something else stops the video
8. PLR-05-08 — Regression: double-clicking a video card opens only one player

### PLR-06 — View an image resource

1. PLR-06-01 — To check an image resource opens correctly
2. PLR-06-02 — To check the image renders correctly
3. PLR-06-03 — Regression: the hybrid-player crash on Image doesn't recur
4. PLR-06-04 — Negative: an image that fails to load shows an error, not a blank player
5. PLR-06-05 — To check zooming and panning work on an open image

### PLR-07 — Annotate on Playlist assets

Applies to any asset type opened from the Playlist (quiz, worksheet, ebook, video,
image, etc.) — not just the whiteboard.

1. PLR-07-01 — To check the user can write an annotation on an asset opened from the Playlist
2. PLR-07-02 — To check annotating with different colors works correctly
3. PLR-07-03 — To check annotating with different thicknesses works correctly
4. PLR-07-04 — To check panning the asset while annotations exist doesn't affect their placement
5. PLR-07-05 — To check erasing an annotation on an asset removes it correctly
6. PLR-07-06 — Negative: to check erasing on an asset with no existing annotation does nothing and doesn't error

### PLR-08 — Open a web link

Added 2026-09-26 from the reference suite (Players workbook, PLR-WL-01..07).

1. PLR-08-01 — To check a web link resource shows a preview card
2. PLR-08-02 — To check "Watch on YouTube" opens the video outside the app
3. PLR-08-03 — To check closing the web link exits cleanly

### PLR-09 — Run a checkpoint

Added 2026-09-26 from the reference suite (Players workbook, PLR-CHK-01..12). Launching a checkpoint can't be undone and uses up one of the account's checkpoints (real actions approved by the owner, 2026-09-26).

1. PLR-09-01 — To check the checkpoint list shows the current topic's checkpoints
2. PLR-09-02 — To check a checkpoint's details show its summary
3. PLR-09-03 — To check launching and starting a checkpoint moves it to Started, and End finishes it
4. PLR-09-04 — Negative: to check a second checkpoint can't be started in the class while one is already running

### PLR-10 — Use the Code Editor

Added 2026-09-26 from the reference suite (Players workbook, PLR-CODE-02..16).

1. PLR-10-01 — To check a Code Editor resource opens the editor
2. PLR-10-02 — To check running Python code shows its output
3. PLR-10-03 — To check code with a syntax error shows a clear error
4. PLR-10-04 — Regression: one click on Run shows the output
5. PLR-10-05 — To check switching language changes the editor
6. PLR-10-06 — Regression: after expanding, the button reads "Collapse All" (not the misspelt "Collpase All")

### PLR-11 — Flashcards and unsupported files

Added 2026-09-26 from the reference suite (Players workbook, PLR-FLASH-01, PLR-UNS-01/02).

1. PLR-11-01 — To check a flashcard resource pages through its cards
2. PLR-11-02 — To check a file type the app can't play shows "Unsupported file" with a Download option

### PLR-12 — Players in general

Added 2026-09-26 from the reference suite (Players workbook, PLR-BREAK-01/02/04, PLR-EXP-25).

1. PLR-12-01 — Edge: to check opening 3 different kinds of player quickly one after another opens each one cleanly (several players can be open at once by design; corrected 2026-09-26 after a live check)
2. PLR-12-02 — Edge: to check closing a player the moment it opens leaves nothing behind
3. PLR-12-03 — Edge: to check opening the same resource card 6 times quickly opens it only once

### PLR-13 — Multiple clicks on every kind of asset (added 2026-09-27)

Teachers double- and triple-tap on interactive panels; a slow tap on a touch screen can register as two clicks. Each
asset kind (video, worksheet/PDF, image, web link, code editor, unsupported file, quiz) is checked the same four ways:

1. PLR-13-xxa — Edge: double-clicking the asset's Playlist card opens exactly one player
2. PLR-13-xxb — Edge: triple-clicking the asset's Playlist card opens exactly one player
3. PLR-13-xxc — Edge: double-clicking the player's close button closes it cleanly, with no script error, and the card opens again afterwards
4. PLR-13-xxd — Regression: opening and closing the asset five times fast leaves no player behind and no script error

(xx = 01 video, 02 worksheet, 03 image, 04 web link, 05 code editor, 06 unsupported file, 07 quiz.)

### PLR-14 — Annotating on every kind of asset, as a teacher really uses it (added 2026-09-27)

Each asset kind (worksheet/PDF, image, video, web link, code editor, unsupported file, quiz) is used the same real-life ways:

1. PLR-14-xxa — The teacher can write on the open asset, and the stroke is on the asset
2. PLR-14-xxb — Edge: zoom in, write, pan, write again: both strokes stay (none lost to the zoom or the pan) and move with the asset
3. PLR-14-xxc — Every tool works on the asset: pen, shape, text box, eraser, Undo, Redo
4. PLR-14-xxd — Regression: annotations on the asset are still there after closing it and opening it again
5. PLR-14-xxe — Regression: after closing the asset, its annotations are not left behind on the whiteboard

Video, while it plays:

6. PLR-14-V1 — Regression: an annotation drawn on a paused video stays when the video is played
7. PLR-14-V2 — Regression: the annotation stays when the teacher seeks to another point and pauses
8. PLR-14-V3 — The teacher can annotate again after playing and pausing

Two assets open at once:

9. PLR-14-M1 — Edge: with an image and a worksheet open, each keeps its own annotation, and closing one keeps the other's

(xx = 01 worksheet, 02 image, 03 video, 04 web link, 05 code editor, 06 unsupported file, 07 quiz.)
