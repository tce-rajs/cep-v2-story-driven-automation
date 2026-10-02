# 09 — Resources (Add Resource)

Covers Create Resource, the resource Library, Gallery, DropIt, and AI Assist. Module
code: `RES`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a
**test case** belonging to that story.

### RES-01 — Create Resource

**User story:** As a teacher, I want to create a resource by uploading a file with a title, so that my own material is in the lesson.

**Acceptance criteria:**

- AC1: The form is pre-filled with the current class and topic (not editable) and Share is on
- AC2: Title and file are checked (length, type, 10 MB limit) with messages
- AC3: Create adds exactly one card that opens properly
- AC4: Cancel creates nothing

1. RES-01-01 — To check creating a new custom resource and saving it makes it available to add to a lesson
2. RES-01-02 — To check attempting to save with required fields empty is blocked with a message
3. RES-01-03 — To check a created custom resource is only available for the grades/subjects it was assigned to
4. RES-01-04 — Negative: a zero-byte file upload is rejected server-side, not just client-side
5. RES-01-05 — Negative: a file over the 10MB limit is rejected server-side, not just client-side
6. RES-01-06 — Performance: uploading to an account with 200+ accumulated resources shows the new card promptly (within 30 seconds)
7. RES-01-07 — To check a resource added via Add Resource appears correctly in the Playlist
8. RES-01-08 — To check opening that added asset from the Playlist loads it correctly — if it doesn't load, that's an issue
9. RES-01-09 — Negative: to check a title shorter than 3 characters shows an error while typing
10. RES-01-10 — To check Grade & Subject and Chapter & Topic are filled in from the current topic
11. RES-01-11 — To check Share is on by default
12. RES-01-12 — To check Cancel closes the form without creating anything
13. RES-01-13 — Negative: to check a file of an unsupported type is rejected with a message
14. RES-01-14 — Regression: double-clicking Submit creates the resource only once
15. RES-01-15 — Edge: to check a file whose name has emoji and 150 characters doesn't break the form
16. RES-01-16 — Edge: to check a file of exactly 10MB is accepted
17. RES-01-17 — Performance: uploading to an account with 200+ accumulated resources adds exactly one card and loses none _(split from RES-01-06, 2026-09-28)_
18. RES-01-18 — To check typing a title of 3 or more characters clears the error _(split from RES-01-09, 2026-09-28)_
19. RES-01-19 — To check Grade & Subject and Chapter & Topic can't be changed _(split from RES-01-10, 2026-09-28)_
20. RES-01-20 — To check a resource created with Share turned off is saved with Share off _(split from RES-01-11, 2026-09-28)_

### RES-02 — Library

**User story:** As a teacher, I want to search the Library for the topic's resources and preview them, so that I can add good material quickly.

**Acceptance criteria:**

- AC1: The search starts with the topic name and needs 3+ characters
- AC2: Results preview by type with their own controls
- AC3: Open to Whiteboard and Save to Playlist work once each
- AC4: No result shows a message

Flow: the search box defaults to searching the current topic name automatically and
suggests matching assets if any exist, or shows "No result found" if not. Clicking an
asset from the results opens a preview specific to that asset's type, with two options
— "Open to Whiteboard" and "Save to Playlist" — and supports navigating or performing
the asset's own actions (e.g. play/pause for video, page navigation for PDF) from
inside that preview.

1. RES-02-01 — To check the search box defaults to searching the current topic name automatically on open
2. RES-02-02 — To check matching assets are suggested when available for that topic
3. RES-02-03 — To check a "No result found" message shows when no assets match
4. RES-02-04 — To check clicking an asset from the results opens a preview specific to that asset's type
5. RES-02-05 — To check the preview shows both "Open to Whiteboard" and "Save to Playlist" options
6. RES-02-06 — To check "Open to Whiteboard" inserts/opens the asset onto the whiteboard
7. RES-02-07 — To check "Save to Playlist" adds the asset to the Playlist
8. RES-02-08 — To check the preview supports the asset's own actions — e.g. play/pause for video, page navigation for PDF/ebook — without leaving the preview
9. RES-02-09 — Regression: rapid forward-clicking through a 200+ page PDF preview to a distant page doesn't crash the browser
10. RES-02-10 — Regression: "content not loading" doesn't recur
11. RES-02-11 — Regression: "content/images not visible" doesn't recur
12. RES-02-12 — Regression: a topic name containing an apostrophe (e.g. "Coulomb's Law") is searched as typed, not shown as an HTML entity (`&#39;`)
13. RES-02-13 — To check Search is disabled while the search box is empty or has fewer than 3 characters
14. RES-02-14 — To check Clear empties the search box
15. RES-02-15 — To check closing a preview changes nothing
16. RES-02-16 — Regression: double-clicking "Save to Playlist" adds the resource only once
17. RES-02-17 — Edge: to check typing a search quickly, letter by letter, searches for the full text typed
18. RES-02-18 — Regression: an Exercise resource's preview shows its answers, not blanks (Zoho TCN-I6380)
19. RES-02-19 — Interruption: to check Save to Playlist while the network is down shows a message and adds nothing _(added 2026-09-30, gap analysis)_

### RES-03 — Gallery

**User story:** As a teacher, I want to insert images from the Gallery, so that I can illustrate the lesson.

**Acceptance criteria:**

- AC1: The gallery shows the subject's images by category, with search
- AC2: Every thumbnail loads
- AC3: An image is inserted once and can be selected and moved
- AC4: Close closes it

1. RES-03-01 — To check opening the gallery from a topic shows images filtered to that chapter/subject
2. RES-03-02 — To check searching within the gallery filters the results correctly
3. RES-03-03 — To check selecting an image inserts it onto the whiteboard
4. RES-03-04 — To check the inserted image is selectable via the toolbar
5. RES-03-05 — Regression: repeat opening the gallery picker 5-10x in a row and record the actual failure rate — don't accept a single clean pass as proof it's fixed
6. RES-03-06 — To check a selected inserted image moves with the arrow keys _(selecting it is RES-03-04; clarified 2026-09-28)_
7. RES-03-07 — To check changing the category filters changes the images shown
8. RES-03-08 — To check the scroll buttons move through more images in the category
9. RES-03-09 — Negative: to check a search with no matches shows a message, not an empty grid
10. RES-03-10 — Regression: double-clicking an image adds it to the whiteboard only once
11. RES-03-11 — Regression: every image thumbnail in the gallery loads, with no broken-image placeholders
12. RES-03-12 — To check the gallery's close button closes it
13. RES-03-13 — Interruption: to check gallery images that fail to load on a slow network show a message or retry, not an empty grid _(added 2026-09-30, gap analysis)_

### RES-04 — DropIt

**User story:** As a teacher, I want to send a file or link from my phone with DropIt, so that I can show material I have on my phone.

**Acceptance criteria:**

- AC1: DropIt shows a QR code and pairing status
- AC2: A shared link, file or text becomes a working resource
- AC3: Unsupported files are refused with a message
- AC4: Close closes it cleanly every time

Flow: opening DropIt shows a QR code with a default pairing status; scanning the QR
code pairs the device; once paired, the user can share a link or a file, which should
then open correctly when accessed.

1. RES-04-01 — To check opening DropIt displays a QR code
2. RES-04-02 — To check the default pairing status is shown correctly before the QR code is scanned
3. RES-04-03 — To check scanning the QR code successfully pairs the device
4. RES-04-04 — To check a link shared from a paired device opens correctly from the Playlist
5. RES-04-05 — To check a file shared from a paired device opens correctly
6. RES-04-06 — Regression: DropIt's "success shown but resource missing" failure mode doesn't recur — sharing a link genuinely creates a Playlist resource, not just a success message
7. RES-04-07 — To check Close exits DropIt cleanly
8. RES-04-08 — Edge: to check that opening and closing DropIt 8 times, every Close really closes it (no stuck panel)
9. RES-04-09 — Regression: switching class straight after opening DropIt leaves no DropIt panel behind
10. RES-04-10 — Regression: DropIt's Close button doesn't cover the Add Resource button
11. RES-04-11 — Regression: sharing text from the paired device works (Zoho TCN-I16701)
12. RES-04-12 — Negative: to check a file type DropIt doesn't support is rejected with a clear message
13. RES-04-13 — Regression: DropIt's "success shown but resource missing" failure mode doesn't recur — sharing a file genuinely creates a Playlist resource _(split from RES-04-06, 2026-09-28)_
14. RES-04-14 — Edge: to check that after opening and closing DropIt 8 times, opening it again shows exactly one panel _(split from RES-04-08, 2026-09-28)_

### RES-05 — AI Assist

**User story:** As a teacher, I want AI Assist to suggest exercises, videos and teaching tips for the topic, so that I can enrich the lesson quickly.

**Acceptance criteria:**

- AC1: Exercise, Videos and Teaching Tips tabs switch with one click
- AC2: Add to Playlist needs a selected question and adds it once
- AC3: Minimize, Maximize and Close work
- AC4: Switching class closes it

Flow: AI Assist loads with three tabs — Exercise, Videos, and Teaching Tips. Selecting
a question and clicking "Add to Playlist" adds (or updates) a "My Exercise" asset in
the Playlist.

1. RES-05-01 — To check AI Assist loads and displays three tabs: Exercise, Videos, and Teaching Tips
2. RES-05-02 — To check switching to the Videos tab shows its video thumbnails in place of the questions
3. RES-05-03 — To check selecting a question and clicking "Add to Playlist" adds a "My Exercise" asset to the Playlist
4. RES-05-04 — To check opening the "My Exercise" asset shows the added question marked as selected
5. RES-05-05 — To check adding another question via AI Assist, when a "My Exercise" asset already exists, increases the question count within that same asset rather than creating a separate new one
6. RES-05-06 — Negative: to check "Add to Playlist" is disabled or blocked when no question is selected
7. RES-05-07 — Regression: each "Add to Playlist" creates its own "<topic> FlashCard" asset containing the chosen question (observed behaviour, pinned)
8. RES-05-08 — Regression: one click on a tab switches to that tab's content
9. RES-05-09 — To check the Videos tab shows videos for the current topic
10. RES-05-10 — To check Teaching Tips shows Activities, Explanation and Real Life Example
11. RES-05-11 — To check Minimize slides AI Assist down out of the way
12. RES-05-12 — To check Close exits AI Assist cleanly
13. RES-05-13 — Regression: double-clicking "Add to Playlist" adds the exercise only once
14. RES-05-14 — Edge: to check opening and closing AI Assist 5 times leaves exactly one AI Assist window
15. RES-05-15 — Edge: to check switching class while AI Assist is open closes it cleanly
16. RES-05-16 — To check switching to the Teaching Tips tab shows teaching tips in place of the videos _(split from RES-05-02, 2026-09-28)_
17. RES-05-17 — To check switching back to the Exercise tab shows the questions again _(split from RES-05-02, 2026-09-28)_
18. RES-05-18 — To check Maximize brings a minimized AI Assist back up _(split from RES-05-11, 2026-09-28)_

### RES-06 — Add Resource menu

**User story:** As a teacher, I want one "+" menu for every way of adding a resource, so that adding material is simple.

**Acceptance criteria:**

- AC1: "+" shows all 6 options and each opens its screen
- AC2: Closing returns to the board
- AC3: Pressing "+" again never stacks menus

Added 2026-09-26 from the reference suite (Add Resource workbook, ADD-CORE-01..04, AR-BREAK-04, ADD-EXP-07).

1. RES-06-01 — To check the "+" button opens the Add Resource menu with all 6 options
2. RES-06-02 — To check each of the 6 options opens its own screen
3. RES-06-03 — To check closing an option's screen returns cleanly to the whiteboard (one test per option: Create, Library, Gallery)
4. RES-06-04 — Regression: pressing "+" while an option's screen is open doesn't open a second Add Resource menu on top
5. RES-06-05 — Edge: to check clicking an option the moment the menu opens opens that option, not a different one

### RES-08 — Uploading real teacher files, good and bad (added 2026-09-27)

**User story:** As a teacher, I want real teacher files to upload correctly and bad files to be refused clearly, so that my resources always open.

**Acceptance criteria:**

- AC1: Every supported file is accepted and opens properly
- AC2: Broken, wrong, oversized or unsupported files are refused with a message
- AC3: No file is accepted and then fails to open

Uses the upload test-data kit (`node scripts/make-test-data.js` builds `test-data/`: 29 files a teacher would upload and
21 broken, wrong, oversized or unsupported ones; `test-data/manifest.json` describes each).

What each group of files is expected to do:

- Positive: an image (PNG/JPG/JPEG, tiny, 12 MP, very tall, transparent, upper-case extension) is accepted and shows at its real size
- Positive: an MP4 video (landscape, portrait, 1 second, silent, just under 10 MB) is accepted, loads and plays
- Positive: a PDF (3 pages, 80 pages, upper-case .PDF, special characters or a Hindi file name) is accepted and shows all its pages
- Positive: an Office or text file of an accepted type (.docx .pptx .xlsx .xls .odt .odp .ods .txt) is accepted and shows its content
- Negative: a file of a type the form does not accept (.webp .webm .weba .wav .svg .bmp .zip .exe, double extension, no extension) or over 10 MB is refused with a message saying why
- Negative: an empty, corrupt or mislabelled file (0 bytes, random bytes, cut-off, header only, not-a-zip, image named .mp4, video named .png, program named .pdf, RTF named .doc) is refused with a message -- not accepted as "Successfully added resource!" and discovered broken only when opened in class
- Edge: a file name of about 250 characters is either accepted or refused with a message, never silently lost

One case per file (listed 2026-09-28 so the workbook has one row per test; the expected result is the one the
test asserts -- a known product bug is recorded on the test, not changed here):

1. RES-08-01 — Positive: `diagram-1920x1080.png` (Full-HD diagram, PNG) is accepted and opens properly
2. RES-08-02 — Positive: `classroom-photo-4000x3000.jpg` (Phone-camera sized JPEG (12 MP)) is accepted and opens properly
3. RES-08-03 — Positive: `board-photo.jpeg` (.jpeg extension) is accepted and opens properly
4. RES-08-04 — Positive: `PHOTO-UPPERCASE.JPG` (Upper-case extension, as Windows cameras save it) is accepted and opens properly
5. RES-08-05 — Positive: `tiny-icon-16x16.png` (Very small image) is accepted and opens properly
6. RES-08-06 — Positive: `tall-infographic-800x8000.png` (Very tall image (1:10)) is accepted and opens properly
7. RES-08-07 — Positive: `transparent-logo.png` (PNG with transparency) is accepted and opens properly
8. RES-08-08 — Negative: `photo.webp` (WebP is not in the accepted list) is refused with a reason
9. RES-08-09 — Positive: `lesson-clip-720p-10s.mp4` (1280x720, 10 s, with sound) is accepted and opens properly
10. RES-08-10 — Positive: `very-short-1s.mp4` (1-second clip) is accepted and opens properly
11. RES-08-11 — Positive: `portrait-720x1280.mp4` (Portrait phone video) is accepted and opens properly
12. RES-08-12 — Positive: `silent-no-audio.mp4` (Video with no audio track) is accepted and opens properly
13. RES-08-13 — Positive: `near-limit-9.6MB.mp4` (Just under the 10 MB limit) is accepted and opens properly
14. RES-08-14 — Negative: `over-limit-11MB.mp4` (Over the 10 MB limit) is refused with a reason
15. RES-08-15 — Negative: `lesson-clip.webm` (WebM is not in the accepted list (only .mp4)) is refused with a reason
16. RES-08-16 — Negative: `voice-note.weba` (Audio file: not an accepted type) is refused with a reason
17. RES-08-17 — Positive: `worksheet-3-pages.pdf` (3-page worksheet) is accepted and opens properly
18. RES-08-18 — Positive: `textbook-chapter-80-pages.pdf` (80 pages) is accepted and opens properly
19. RES-08-19 — Positive: `worksheet.PDF` (Upper-case .PDF extension) is accepted and opens properly
20. RES-08-20 — Positive: `Lesson #1` (final) & notes.pdf (Spaces and # ( ) & in the file name) is accepted and opens properly
21. RES-08-21 — Positive: `पाठ योजना - विद्युत आवेश.pdf` (Hindi file name) is accepted and opens properly
22. RES-08-22 — Negative: `over-limit-scanned-book.pdf` (Scanned-style PDF over 10 MB (checked below)) is refused with a reason
23. RES-08-23 — Positive: `lesson-plan.docx` (Word) is accepted and opens properly
24. RES-08-24 — Positive: `class-slides.pptx` (PowerPoint, 3 slides) is accepted and opens properly
25. RES-08-25 — Positive: `lesson-plan.odt` (OpenDocument text) is accepted and opens properly
26. RES-08-26 — Positive: `class-slides.odp` (OpenDocument slides) is accepted and opens properly
27. RES-08-27 — Positive: `marks-sheet.xlsx` (Excel) is accepted and opens properly
28. RES-08-28 — Positive: `marks-sheet-legacy.xls` (Excel 97-2003 (.xls)) is accepted and opens properly
29. RES-08-29 — Positive: `marks-sheet.ods` (OpenDocument spreadsheet) is accepted and opens properly
30. RES-08-30 — Positive: `notes-plain.txt` (Plain text) is accepted and opens properly
31. RES-08-31 — Positive: `notes-unicode-hindi-emoji.txt` (UTF-8 with Hindi, symbols and emoji) is accepted and opens properly
32. RES-08-32 — Negative: `empty-0-bytes.pdf` (Zero-byte PDF) is refused with a reason
33. RES-08-33 — Negative: `empty-0-bytes.png` (Zero-byte image) is refused with a reason
34. RES-08-34 — Negative: `empty-0-bytes.mp4` (Zero-byte video) is refused with a reason
35. RES-08-35 — Negative: `corrupt-random-bytes.png` (Random bytes with a .png name) is refused with a reason
36. RES-08-36 — Negative: `corrupt-truncated.mp4` (Real MP4 cut off at 20% (interrupted copy)) is accepted and opens properly
37. RES-08-37 — Negative: `corrupt-header-only.pdf` (PDF with only its first 400 bytes) is refused with a reason
38. RES-08-38 — Negative: `corrupt-not-a-zip.docx` (.docx that is not a zip) is refused with a reason
39. RES-08-39 — Negative: `image-renamed.mp4` (A PNG renamed to .mp4 (content does not match the extension)) is refused with a reason
40. RES-08-40 — Negative: `video-renamed.png` (An MP4 renamed to .png) is refused with a reason
41. RES-08-41 — Negative: `program-renamed.pdf` (A Windows program (MZ header) renamed to .pdf) is refused with a reason
42. RES-08-42 — Negative: `worksheet.pdf.exe` (Double extension ending in .exe) is refused with a reason
43. RES-08-43 — Negative: `worksheet-no-extension` (A real PDF with no extension) is refused with a reason
44. RES-08-44 — Negative: `setup.exe` (Program file) is refused with a reason
45. RES-08-45 — Negative: `bundle.zip` (Zip archive) is refused with a reason
46. RES-08-46 — Negative: `drawing.svg` (SVG image: not in the accepted list) is refused with a reason
47. RES-08-47 — Negative: `bitmap.bmp` (BMP image: not in the accepted list) is refused with a reason
48. RES-08-48 — Negative: `tone.wav` (WAV audio: not an accepted type) is refused with a reason
49. RES-08-49 — Negative: `rtf-renamed.doc` (RTF content with a .doc name (common in schools)) is refused with a reason
50. RES-08-50 — Negative: `Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name-Very-long-lesson-file-name.pdf` (File name of about 250 characters) is refused with a reason

### RES-09 — Sending real teacher files through DropIt (added 2026-09-27)

**User story:** As a teacher, I want DropIt to handle my files the same way as Create, so that sending from my phone is just as safe.

**Acceptance criteria:**

- AC1: Supported files open properly
- AC2: Broken, wrong-type and oversized files are refused
- AC3: A failed file is reported, never silently lost

The same upload test-data kit as RES-08, tried through DropIt instead of Create (a full 50-file run was done once by
hand; this keeps one representative case per outcome it found, since DropIt is far slower per file than Create):

1. RES-09-01 — Positive: an accepted image type opens properly
2. RES-09-02 — Positive: an accepted PDF opens properly
3. RES-09-03 — Positive: an accepted Word file opens properly
4. RES-09-04 — Negative: a video is refused (DropIt has no video support at all, unlike Create)
5. RES-09-05 — Negative: a broken (header-only) PDF is refused, not accepted as if it were a real file
6. RES-09-06 — Negative: a Windows program renamed .pdf is refused
7. RES-09-07 — Negative: an MP4 renamed .png is refused
8. RES-09-08 — Negative: a PDF over the 10 MB limit is refused
9. RES-09-09 — Negative: a Hindi file name is accepted, or the teacher is told it failed (not silently lost)
