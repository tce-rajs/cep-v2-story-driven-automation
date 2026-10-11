# 11 — Players

New module — not named in the client's 7-section checklist, which covers _building_ a
quiz (Sidebar's Question Bank) but never names where _attempting/scoring_ it, or
playing a worksheet/ebook/video/image, actually lives. Added because that playback
behavior is real and is a distinct set of user goals from building content. Module
code: `PLR`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a
**test case** belonging to that story.

### PLR-01 — Attempt a quiz

**User story:** As a teacher, I want to run a quiz with the class, so that students can answer on the board.

**Acceptance criteria:**

- AC1: The quiz opens with text and image questions and options (the AIR card is out of scope)
- AC2: One answer per question; Submit only after choosing; wrong answers and the correct answer are shown
- AC3: Question navigation and the numbered dots go to the right question
- AC4: Double clicks open or submit once and no question repeats

Flow: clicking the quiz loads the quiz player; an AIR card popup appears first and
takes ~5 seconds to disappear before the first question loads. Questions, and their
options, can each be text or an image. The user navigates back and forward across
multiple questions, selects an answer, then submits.

1. PLR-01-01 — To check clicking on the quiz loads the quiz player
2. PLR-01-02 — To check the AIR card popup appears and goes away by itself after ~5 seconds _(not applicable: AIR card is out of scope — owner, 10 Oct 2026)_
3. PLR-01-03 — To check a text-based question renders correctly
4. PLR-01-04 — To check an image-based question renders correctly
5. PLR-01-05 — To check text-based options render correctly
6. PLR-01-06 — To check image-based options render correctly
7. PLR-01-07 — To check navigating backward through multiple questions works correctly
8. PLR-01-08 — To check navigating forward through multiple questions works correctly
9. PLR-01-09 — To check selecting an answer and submitting it registers correctly
10. PLR-01-10 — Cross-Mode: to check split-screen quiz view stays in sync between the teacher's and student's screens _(not applicable: needs a student's screen — manual check)_
11. PLR-01-11 — Regression: to check double-clicking Submit doesn't create a duplicate submission
12. PLR-01-12 — Negative: to check a class with zero enrolled students attempting to launch a Student Test is handled gracefully
13. PLR-01-13 — Performance: to check a very large quiz doesn't degrade responsiveness
14. PLR-01-14 — Regression: to check in AIR card mode, navigating back to question 1 shows question 1 again (not the question just left) _(not applicable: AIR card is out of scope — owner, 10 Oct 2026)_
15. PLR-01-15 — To check Submit Answer stays disabled until an option is chosen
16. PLR-01-16 — To check choosing a second option clears the first (one answer per question)
17. PLR-01-17 — To check a wrong answer is marked wrong
18. PLR-01-18 — To check Show Answer reveals the correct option
19. PLR-01-19 — Regression: to check the numbered dots jump straight to that question, every time
20. PLR-01-20 — To check closing and reopening the quiz starts again from question 1 _(improvement: reopening a quiz restarts it)_
21. PLR-01-21 — Regression: to check double-clicking a quiz card opens only one quiz
22. PLR-01-22 — Regression: to check no question appears more than once in the quiz
23. PLR-01-23 — To check the first question only loads once the AIR card popup is gone _(not applicable: AIR card is out of scope — owner, 10 Oct 2026)_
24. PLR-01-24 — To check that after a wrong answer, the correct answer is shown
25. PLR-01-25 — Interruption: to check a network drop during a quiz keeps the answers already given, and the quiz can continue once it is back

### PLR-02 — Review quiz results

**User story:** As a teacher, I want to see the quiz results, so that I know how the class did.

**Acceptance criteria:**

- AC1: Right and wrong answers can be reviewed after submitting
- AC2: Results are not shown before submitting
- AC3: Score display is an improvement request

1. PLR-02-01 — To check the score displays correctly immediately after submitting _(improvement)_
2. PLR-02-02 — To check reviewing the quiz shows which specific answers were right or wrong
3. PLR-02-03 — Negative: to check attempting to review results before submitting the quiz is not accessible, or shows an appropriate message

### PLR-03 — Complete a worksheet (PDF)

**User story:** As a teacher, I want to open and work through a PDF worksheet, so that the class can solve it together.

**Acceptance criteria:**

- AC1: The worksheet opens and pages forward, back and to a chosen page
- AC2: Zoom, orientation and the answer key work
- AC3: Out-of-range pages and broken files are handled
- AC4: It works alongside a web link

Worksheet = a PDF. It opens and loads; the user navigates backward/forward, or jumps
to a specific page using "Go to Page" with its up/down buttons.

1. PLR-03-01 — To check opening a worksheet loads the PDF correctly
2. PLR-03-02 — To check navigating backward through the PDF works correctly
3. PLR-03-03 — To check navigating forward through the PDF works correctly
4. PLR-03-04 — To check jumping to a specific page using "Go to Page" with the up/down buttons works correctly
5. PLR-03-05 — Negative: to check an out-of-range page number in "Go to Page" is handled gracefully
6. PLR-03-06 — Regression: to check a malformed/zero-page worksheet resource is handled without crashing
7. PLR-03-07 — Performance: to check a very large/long worksheet doesn't degrade responsiveness
8. PLR-03-08 — Concurrency: to check a Weblink opens properly while a Worksheet is already open
9. PLR-03-09 — To check the zoom buttons change the worksheet's zoom
10. PLR-03-10 — To check the answer key button shows the answers, on a worksheet that has one
11. PLR-03-11 — To check the orientation button changes the page orientation
12. PLR-03-12 — Negative: to check Next on the last page stays on the last page
13. PLR-03-13 — To check closing the worksheet exits cleanly
14. PLR-03-14 — Concurrency: to check with a Weblink open over it, the Worksheet still turns pages
15. PLR-03-15 — To check pressing the answer key button again hides the answers
16. PLR-03-16 — Interruption: to check a large worksheet on a slow network shows loading progress, not a blank player

### PLR-04 — Navigate an ebook

**User story:** As a teacher, I want to move through the ebook's chapters and pages, so that I can follow the textbook.

**Acceptance criteria:**

- AC1: Chapters and pages open as chosen
- AC2: Scrolling never changes the chapter by itself
- AC3: Linked resources close cleanly

1. PLR-04-01 — To check opening a chapter-specific ebook resource and navigating to a new chapter works
2. PLR-04-02 — To check scrolling/paginating through ebook pages works correctly
3. PLR-04-03 — To check closing a linked resource from the ebook closes it cleanly
4. PLR-04-04 — Regression: to check jumping between ebook chapters, back and forth, always lands on the chapter chosen (CEP v1's recurring ebook navigation weak spot)
5. PLR-04-05 — Regression: to check scrolling an ebook neither changes chapter by itself nor causes an error
6. PLR-04-06 — Negative: to check a missing or unavailable ebook page shows a message, not a blank player

### PLR-05 — Play a video resource

**User story:** As a teacher, I want to play, pause, seek and annotate a video, so that I can explain as it plays.

**Acceptance criteria:**

- AC1: Play, pause, seek, volume and mute work
- AC2: I can annotate over the video
- AC3: Opening something else stops it; a double click opens one player

1. PLR-05-01 — To check a video resource opens and plays correctly
2. PLR-05-02 — To check pausing the video works correctly
3. PLR-05-03 — To check closing the video works correctly
4. PLR-05-04 — Regression: to check the hybrid-player crash on Video doesn't recur
5. PLR-05-05 — To check seeking a video moves playback to the chosen point
6. PLR-05-06 — Regression: to check the teacher can annotate over a playing video _(improvement: drawing over a playing video)_
7. PLR-05-07 — To check opening something else stops the video
8. PLR-05-08 — Regression: to check double-clicking a video card opens only one player
9. PLR-05-09 — To check a video's volume can be changed and muted
10. PLR-05-10 — Interruption: to check a network drop while a video plays shows a message
11. PLR-05-11 — Interruption: to check playback can resume once the network is back after a drop
12. PLR-05-12 — Negative: to check a video that cannot be played shows a message, not an endless spinner

### PLR-06 — View an image resource

**User story:** As a teacher, I want to open, zoom and pan an image, so that the class can see details.

**Acceptance criteria:**

- AC1: The image opens and renders
- AC2: Zoom and pan work
- AC3: A failed image shows an error

1. PLR-06-01 — To check an image resource opens correctly
2. PLR-06-02 — To check the image renders correctly
3. PLR-06-03 — Regression: to check the hybrid-player crash on Image doesn't recur
4. PLR-06-04 — Negative: to check an image that fails to load shows an error, not a blank player
5. PLR-06-05 — To check zooming and panning work on an open image

### PLR-07 — Annotate on Playlist assets

**User story:** As a teacher, I want to write on an opened asset, so that I can explain on top of it.

**Acceptance criteria:**

- AC1: Writing in any colour and thickness lands on the asset
- AC2: Panning keeps annotations in place
- AC3: Erasing removes them; erasing nothing does nothing

Applies to any asset type opened from the Playlist (quiz, worksheet, ebook, video,
image, etc.) — not just the whiteboard.

1. PLR-07-01 — To check the user can write an annotation on an asset opened from the Playlist
2. PLR-07-02 — To check annotating with different colors works correctly
3. PLR-07-03 — To check annotating with different thicknesses works correctly
4. PLR-07-04 — To check panning the asset while annotations exist doesn't affect their placement
5. PLR-07-05 — To check erasing an annotation on an asset removes it correctly
6. PLR-07-06 — Negative: to check erasing on an asset with no existing annotation does nothing and doesn't error

### PLR-08 — Open a web link

**User story:** As a teacher, I want to open a web link resource, so that I can show online material.

**Acceptance criteria:**

- AC1: A preview card shows
- AC2: YouTube links open outside the app; other links open their page
- AC3: Close exits cleanly

1. PLR-08-01 — To check a web link resource shows a preview card
2. PLR-08-02 — To check "Watch on YouTube" opens the video outside the app
3. PLR-08-03 — To check closing the web link exits cleanly
4. PLR-08-04 — To check a non-YouTube web link opens its page in the player
5. PLR-08-05 — Negative: to check a web link that cannot load shows a message, not a blank player

### PLR-09 — Run a checkpoint

**User story:** As a teacher, I want to run a checkpoint with the class, so that I can check understanding.

**Acceptance criteria:**

- AC1: The topic's checkpoints are listed with a summary
- AC2: Starting shows the roster; only one can run at a time
- AC3: End finishes it for good

1. PLR-09-01 — To check the checkpoint list shows the current topic's checkpoints
2. PLR-09-02 — To check a checkpoint's details show its summary
3. PLR-09-03 — To check launching and starting a checkpoint moves it to Started, with the student roster shown
4. PLR-09-04 — Negative: to check a second checkpoint can't be started in the class while one is already running
5. PLR-09-05 — To check End on a started checkpoint finishes it, and after a reload it is no longer running

### PLR-10 — Use the Code Editor

**User story:** As a teacher, I want to run code in the Code Editor, so that I can demonstrate programs.

**Acceptance criteria:**

- AC1: Code runs with one click and shows output or a clear error
- AC2: The language can be switched
- AC3: Labels are spelled correctly

1. PLR-10-01 — To check a Code Editor resource opens the editor
2. PLR-10-02 — To check running Python code shows its output
3. PLR-10-03 — Negative: to check code with a syntax error shows a clear error
4. PLR-10-04 — Regression: to check one click on Run shows the output
5. PLR-10-05 — To check switching language changes the editor
6. PLR-10-06 — Regression: to check after expanding, the button reads "Collapse All" (not the misspelt "Collpase All")

### PLR-11 — Flashcards and unsupported files

**User story:** As a teacher, I want flashcards to page through and unsupported files to say so, so that nothing fails silently.

**Acceptance criteria:**

- AC1: Flashcards page through
- AC2: Unsupported files show a message with Download

1. PLR-11-01 — To check a flashcard resource pages through its cards
2. PLR-11-02 — Negative: to check a file type the app can't play shows "Unsupported file" with a Download option

### PLR-12 — Players in general

**User story:** As a teacher, I want players to open and close cleanly however fast I click, so that the board never gets stuck.

**Acceptance criteria:**

- AC1: Opening several players quickly opens each cleanly
- AC2: Closing at once leaves nothing
- AC3: Six quick clicks open one player

1. PLR-12-01 — Edge: to check opening 3 different kinds of player quickly one after another opens each one cleanly (several players can be open at once by design)
2. PLR-12-02 — Edge: to check closing a player the moment it opens leaves nothing behind
3. PLR-12-03 — Edge: to check opening the same resource card 6 times quickly opens it only once
4. PLR-12-04 — Negative: to check closing any player leaves no blank panel or stray close icon behind

### PLR-13 — Multiple clicks on every kind of asset

**User story:** As a teacher, I want a double or repeated click on any kind of asset to open it once, so that the board is never cluttered.

**Acceptance criteria:**

- AC1: Each asset type opens exactly one player however it is clicked

Teachers double- and triple-tap on interactive panels; a slow tap on a touch screen can register as two clicks. Each
asset kind (video, worksheet/PDF, image, web link, code editor, unsupported file, quiz) is checked the same four ways:

One case per asset kind and check (xx = 01 video, 02
worksheet, 03 image, 04 web link, 05 code editor, 06 unsupported file, 07 quiz):

1. PLR-13-01a — To check double-clicking a video card opens exactly one player
2. PLR-13-01b — To check triple-clicking a video card opens exactly one player
3. PLR-13-01c — To check double-clicking the video player's close button closes it cleanly
4. PLR-13-01d — To check opening and closing a video five times fast leaves nothing behind
5. PLR-13-02a — To check double-clicking a worksheet (PDF) card opens exactly one player
6. PLR-13-02b — To check triple-clicking a worksheet (PDF) card opens exactly one player
7. PLR-13-02c — To check double-clicking the worksheet (PDF) player's close button closes it cleanly
8. PLR-13-02d — To check opening and closing a worksheet (PDF) five times fast leaves nothing behind
9. PLR-13-03a — To check double-clicking a image card opens exactly one player
10. PLR-13-03b — To check triple-clicking a image card opens exactly one player
11. PLR-13-03c — To check double-clicking the image player's close button closes it cleanly
12. PLR-13-03d — To check opening and closing a image five times fast leaves nothing behind
13. PLR-13-04a — To check double-clicking a web link card opens exactly one player
14. PLR-13-04b — To check triple-clicking a web link card opens exactly one player
15. PLR-13-04c — To check double-clicking the web link player's close button closes it cleanly
16. PLR-13-04d — To check opening and closing a web link five times fast leaves nothing behind
17. PLR-13-05a — To check double-clicking a code editor card opens exactly one player
18. PLR-13-05b — To check triple-clicking a code editor card opens exactly one player
19. PLR-13-05c — To check double-clicking the code editor player's close button closes it cleanly
20. PLR-13-05d — To check opening and closing a code editor five times fast leaves nothing behind
21. PLR-13-06a — To check double-clicking a unsupported file card opens exactly one player
22. PLR-13-06b — To check triple-clicking a unsupported file card opens exactly one player
23. PLR-13-06c — To check double-clicking the unsupported file player's close button closes it cleanly
24. PLR-13-06d — To check opening and closing a unsupported file five times fast leaves nothing behind
25. PLR-13-07a — To check double-clicking a quiz card opens exactly one player
26. PLR-13-07b — To check triple-clicking a quiz card opens exactly one player
27. PLR-13-07c — To check double-clicking the quiz player's close button closes it cleanly
28. PLR-13-07d — To check opening and closing a quiz five times fast leaves nothing behind

### PLR-14 — Annotating on every kind of asset, as a teacher really uses it

**User story:** As a teacher, I want to annotate on every kind of asset as I really teach, so that my notes stay with the asset.

**Acceptance criteria:**

- AC1: Writing, zoom+write+pan and every tool work on each asset type
- AC2: Annotations persist after close and reopen
- AC3: Video annotations survive play, seek and pause
- AC4: Two open assets keep their own annotations

Each asset kind (worksheet/PDF, image, video, web link, code editor, unsupported file, quiz) is used the same real-life ways:

One case per asset kind and check, one case per tool: xxc shape, xxf text box, xxg eraser, xxh Undo, xxi Redo -- the pen is xxa; xx = 01
worksheet, 02 image, 03 video, 04 web link, 05 code editor, 06 unsupported file, 07 quiz):

1. PLR-14-01a — To check the teacher can write on an open worksheet (PDF), and the stroke is on the asset
2. PLR-14-01b — To check zoom in, write, pan, write again on a worksheet (PDF): both strokes stay, none lost to the zoom or the pan
3. PLR-14-01c — To check a shape can be drawn on a worksheet (PDF) _(improvement)_
4. PLR-14-01d — To check annotations on a worksheet (PDF) are still there after closing and opening it again
5. PLR-14-01e — To check after closing a worksheet (PDF), its annotations are not left on the whiteboard
6. PLR-14-01f — To check a text box can be added on a worksheet (PDF)
7. PLR-14-01g — To check the eraser removes a stroke on a worksheet (PDF)
8. PLR-14-01h — To check undo brings back a stroke erased on a worksheet (PDF)
9. PLR-14-01i — To check redo erases the stroke on a worksheet (PDF) again after Undo
10. PLR-14-02a — To check the teacher can write on an open image, and the stroke is on the asset
11. PLR-14-02b — To check zoom in, write, pan, write again on an image: both strokes stay, none lost to the zoom or the pan
12. PLR-14-02c — To check a shape can be drawn on an image _(improvement)_
13. PLR-14-02d — To check annotations on an image are still there after closing and opening it again
14. PLR-14-02e — To check after closing a image, its annotations are not left on the whiteboard
15. PLR-14-02f — To check a text box can be added on an image
16. PLR-14-02g — To check the eraser removes a stroke on an image
17. PLR-14-02h — To check undo brings back a stroke erased on an image
18. PLR-14-02i — To check redo erases the stroke on an image again after Undo
19. PLR-14-03a — To check the teacher can write on an open video, and the stroke is on the asset
20. PLR-14-03b — To check zoom in, write, pan, write again on a video: both strokes stay, none lost to the zoom or the pan
21. PLR-14-03c — To check a shape can be drawn on a video _(improvement)_
22. PLR-14-03d — To check annotations on a video are still there after closing and opening it again
23. PLR-14-03e — To check after closing a video, its annotations are not left on the whiteboard
24. PLR-14-03f — To check a text box can be added on a video
25. PLR-14-03g — To check the eraser removes a stroke on a video
26. PLR-14-03h — To check undo brings back a stroke erased on a video
27. PLR-14-03i — To check redo erases the stroke on a video again after Undo
28. PLR-14-04a — To check the teacher can write on an open web link, and the stroke is on the asset
29. PLR-14-04b — To check zoom in, write, pan, write again on a web link: both strokes stay, none lost to the zoom or the pan
30. PLR-14-04c — To check a shape can be drawn on a web link _(improvement)_
31. PLR-14-04d — To check annotations on a web link are still there after closing and opening it again
32. PLR-14-04e — To check after closing a web link, its annotations are not left on the whiteboard
33. PLR-14-04f — To check a text box can be added on a web link
34. PLR-14-04g — To check the eraser removes a stroke on a web link
35. PLR-14-04h — To check undo brings back a stroke erased on a web link
36. PLR-14-04i — To check redo erases the stroke on a web link again after Undo
37. PLR-14-05a — To check the teacher can write on an open code editor, and the stroke is on the asset
38. PLR-14-05b — To check zoom in, write, pan, write again on a code editor: both strokes stay, none lost to the zoom or the pan
39. PLR-14-05c — To check a shape can be drawn on a code editor _(improvement)_
40. PLR-14-05d — To check annotations on a code editor are still there after closing and opening it again
41. PLR-14-05e — To check after closing a code editor, its annotations are not left on the whiteboard
42. PLR-14-05f — To check a text box can be added on a code editor
43. PLR-14-05g — To check the eraser removes a stroke on a code editor
44. PLR-14-05h — To check undo brings back a stroke erased on a code editor
45. PLR-14-05i — To check redo erases the stroke on a code editor again after Undo
46. PLR-14-06a — To check the teacher can write on an open unsupported file, and the stroke is on the asset
47. PLR-14-06b — To check zoom in, write, pan, write again on a unsupported file: both strokes stay, none lost to the zoom or the pan
48. PLR-14-06c — To check a shape can be drawn on a unsupported file _(improvement)_
49. PLR-14-06d — To check annotations on a unsupported file are still there after closing and opening it again
50. PLR-14-06e — To check after closing a unsupported file, its annotations are not left on the whiteboard
51. PLR-14-06f — To check a text box can be added on a unsupported file
52. PLR-14-06g — To check the eraser removes a stroke on a unsupported file
53. PLR-14-06h — To check undo brings back a stroke erased on a unsupported file
54. PLR-14-06i — To check redo erases the stroke on a unsupported file again after Undo
55. PLR-14-07a — To check the teacher can write on an open quiz, and the stroke is on the asset
56. PLR-14-07b — To check zoom in, write, pan, write again on a quiz: both strokes stay, none lost to the zoom or the pan
57. PLR-14-07c — To check a shape can be drawn on a quiz _(improvement)_
58. PLR-14-07d — To check annotations on a quiz are still there after closing and opening it again
59. PLR-14-07e — To check after closing a quiz, its annotations are not left on the whiteboard
60. PLR-14-07f — To check a text box can be added on a quiz
61. PLR-14-07g — To check the eraser removes a stroke on a quiz
62. PLR-14-07h — To check undo brings back a stroke erased on a quiz
63. PLR-14-07i — To check redo erases the stroke on a quiz again after Undo

Video, while it plays, and two assets open at once:

64. PLR-14-M1 — To check with an image and a worksheet open and both annotated, closing the image keeps the worksheet’s annotation
65. PLR-14-M2 — To check with an image and a worksheet open and both annotated, closing the image takes the image’s annotation with it
66. PLR-14-V1 — To check an annotation drawn on a paused video stays when the video is played
67. PLR-14-V2 — To check the annotation stays when the teacher seeks to another point and pauses
68. PLR-14-V3 — To check the teacher can annotate again after playing and pausing

### PLR-15 — Every player opens, renders and can be used

**User story:** As a teacher, I want every kind of resource to open, show its content and respond when I use it, so that no lesson stalls on a blank or dead player.

**Acceptance criteria:**

- AC1: Each player type opens at a real size, with its content drawn (question and options, video picture, PDF page, image, web page, HTML5 activity)
- AC2: Each can be used: a quiz is answered through to "Quiz Complete!", a video plays to its end and again, a PDF pages quickly, an activity, simulation, keyword list, concept map and lecture note react to the teacher
- AC3: Double clicks, instant close, a class switch and a cut network leave no duplicate, leftover or silently blank player
- AC4: No player shows "undefined", "null" or raw keys

Data: quiz and lecture note -- Class 11A Accountancy 3.1; video and worksheet -- Class 12A Computer Science 2.2; image,
web link and flashcards -- Class 12A Physics 1.1; Interactivity, Keywords, Concept Map, PhET simulation, lab, lecture note
and 3D video -- Class 12A Physics 1.2 (open only; nothing is written there).

1. PLR-15-01 — To check the quiz renders its question text and its options
2. PLR-15-02 — To check submitting an answer shows right/wrong feedback and a Next Question button
3. PLR-15-03 — To check Next Question shows the next, different question
4. PLR-15-04 — To check answering every question finishes the quiz with "Quiz Complete!"
5. PLR-15-05 — Negative: to check moving on without answering leaves that question unanswered
6. PLR-15-06 — To check changing the answer before submitting scores the last choice
7. PLR-15-07 — Edge: to check after finishing, the quiz reopens and shows a question
8. PLR-15-08 — To check no question of the quiz shows "undefined", "null" or raw keys
9. PLR-15-09 — To check the lecture note opens and renders its slides
10. PLR-15-10 — To check the video renders a frame and shows its length
11. PLR-15-11 — Edge: to check a video played to its end stops cleanly and can be played again
12. PLR-15-12 — To check the worksheet (PDF) draws its page content
13. PLR-15-13 — Edge: to check very fast Next presses land on a valid page with the player still up
14. PLR-15-14 — Edge: to check very fast Next then Previous presses come back to page 1
15. PLR-15-15 — To check an image renders at its natural size
16. PLR-15-16 — To check a web link loads its page inside the player
17. PLR-15-17 — To check a flashcard shows its card and the arrow moves it on
18. PLR-15-18 — To check an Interactivity opens and renders its content
19. PLR-15-19 — To check an Interactivity responds to dragging an object to a drop zone
20. PLR-15-20 — To check a Keywords activity opens and renders its content
21. PLR-15-21 — To check choosing a keyword shows its meaning
22. PLR-15-22 — To check a Concept Map opens and renders its content
23. PLR-15-23 — To check the Concept Map zooms in
24. PLR-15-24 — To check a PhET simulation opens and renders its content
25. PLR-15-25 — To check a PhET simulation responds to the teacher
26. PLR-15-26 — To check a lab opens and renders its content
27. PLR-15-27 — To check a lecture note moves to its next slide
28. PLR-15-28 — To check a 3D animation video plays
29. PLR-15-29 — Regression: to check double-clicking an Interactivity card opens one player
30. PLR-15-30 — Edge: to check closing an Interactivity the moment it opens leaves nothing behind
31. PLR-15-31 — Edge: to check switching class with a player open closes it
32. PLR-15-32 — Interruption: to check opening content with the network cut shows a message, not a blank player
