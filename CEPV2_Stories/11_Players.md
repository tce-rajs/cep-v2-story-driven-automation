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

### PLR-06 — View an image resource

1. PLR-06-01 — To check an image resource opens correctly
2. PLR-06-02 — To check the image renders correctly
3. PLR-06-03 — Regression: the hybrid-player crash on Image doesn't recur
4. PLR-06-04 — Negative: an image that fails to load shows an error, not a blank player

### PLR-07 — Annotate on Playlist assets

Applies to any asset type opened from the Playlist (quiz, worksheet, ebook, video,
image, etc.) — not just the whiteboard.

1. PLR-07-01 — To check the user can write an annotation on an asset opened from the Playlist
2. PLR-07-02 — To check annotating with different colors works correctly
3. PLR-07-03 — To check annotating with different thicknesses works correctly
4. PLR-07-04 — To check panning the asset while annotations exist doesn't affect their placement
5. PLR-07-05 — To check erasing an annotation on an asset removes it correctly
6. PLR-07-06 — Negative: to check erasing on an asset with no existing annotation does nothing and doesn't error
