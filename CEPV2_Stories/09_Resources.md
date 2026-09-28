# 09 — Resources (Add Resource)

Covers Create Resource, the resource Library, Gallery, DropIt, and AI Assist. Module
code: `RES`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a
**test case** belonging to that story.

### RES-01 — Create Resource

1. RES-01-01 — To check creating a new custom resource and saving it makes it available to add to a lesson
2. RES-01-02 — To check attempting to save with required fields empty is blocked with a message
3. RES-01-03 — To check a created custom resource is only available for the grades/subjects it was assigned to
4. RES-01-04 — Negative: a zero-byte file upload is rejected server-side, not just client-side
5. RES-01-05 — Negative: a file over the 10MB limit is rejected server-side, not just client-side
6. RES-01-06 — Performance: uploading to an account with 200+ accumulated resources doesn't degrade the resource list
7. RES-01-07 — To check a resource added via Add Resource appears correctly in the Playlist
8. RES-01-08 — To check opening that added asset from the Playlist loads it correctly — if it doesn't load, that's an issue
9. RES-01-09 — Negative: to check a title shorter than 3 characters shows an error while typing, and 3 or more clears it
10. RES-01-10 — To check Grade & Subject and Chapter & Topic are filled in from the current topic and can't be changed
11. RES-01-11 — To check Share is on by default, and a resource created with Share off is saved with Share off
12. RES-01-12 — To check Cancel closes the form without creating anything
13. RES-01-13 — Negative: to check a file of an unsupported type is rejected with a message
14. RES-01-14 — Regression: double-clicking Submit creates the resource only once
15. RES-01-15 — Edge: to check a file whose name has emoji and 150 characters doesn't break the form
16. RES-01-16 — Edge: to check a file of exactly 10MB is accepted

### RES-02 — Library

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

### RES-03 — Gallery

1. RES-03-01 — To check opening the gallery from a topic shows images filtered to that chapter/subject
2. RES-03-02 — To check searching within the gallery filters the results correctly
3. RES-03-03 — To check selecting an image inserts it onto the whiteboard
4. RES-03-04 — To check the inserted image is selectable via the toolbar
5. RES-03-05 — Regression: repeat opening the gallery picker 5-10x in a row and record the actual failure rate — don't accept a single clean pass as proof it's fixed
6. RES-03-06 — To check the inserted image is selectable and movable via the arrow keys
7. RES-03-07 — To check changing the category filters changes the images shown
8. RES-03-08 — To check the scroll buttons move through more images in the category
9. RES-03-09 — Negative: to check a search with no matches shows a message, not an empty grid
10. RES-03-10 — Regression: double-clicking an image adds it to the whiteboard only once
11. RES-03-11 — Regression: every image thumbnail in the gallery loads, with no broken-image placeholders
12. RES-03-12 — To check the gallery's close button closes it

### RES-04 — DropIt

Flow: opening DropIt shows a QR code with a default pairing status; scanning the QR
code pairs the device; once paired, the user can share a link or a file, which should
then open correctly when accessed.

1. RES-04-01 — To check opening DropIt displays a QR code
2. RES-04-02 — To check the default pairing status is shown correctly before the QR code is scanned
3. RES-04-03 — To check scanning the QR code successfully pairs the device
4. RES-04-04 — To check a paired session allows sharing a link, and the shared link opens correctly when accessed
5. RES-04-05 — To check a paired session allows sharing a file, and the shared file opens correctly when accessed
6. RES-04-06 — Regression: DropIt's "success shown but resource missing" failure mode doesn't recur — the shared link/file must actually open, not just show a success message
7. RES-04-07 — To check Close exits DropIt cleanly
8. RES-04-08 — Edge: to check opening and closing DropIt 8 times leaves no stuck or duplicated panel
9. RES-04-09 — Regression: switching class straight after opening DropIt leaves no DropIt panel behind
10. RES-04-10 — Regression: DropIt's Close button doesn't cover the Add Resource button
11. RES-04-11 — Regression: sharing text from the paired device works (Zoho TCN-I16701)
12. RES-04-12 — Negative: to check a file type DropIt doesn't support is rejected with a clear message

### RES-05 — AI Assist

Flow: AI Assist loads with three tabs — Exercise, Videos, and Teaching Tips. Selecting
a question and clicking "Add to Playlist" adds (or updates) a "My Exercise" asset in
the Playlist.

1. RES-05-01 — To check AI Assist loads and displays three tabs: Exercise, Videos, and Teaching Tips
2. RES-05-02 — To check switching between the three tabs shows the correct content for each
3. RES-05-03 — To check selecting a question and clicking "Add to Playlist" adds a "My Exercise" asset to the Playlist
4. RES-05-04 — To check opening the "My Exercise" asset shows the added question marked as selected
5. RES-05-05 — To check adding another question via AI Assist, when a "My Exercise" asset already exists, increases the question count within that same asset rather than creating a separate new one
6. RES-05-06 — Negative: to check "Add to Playlist" is disabled or blocked when no question is selected
7. RES-05-07 — Regression: each "Add to Playlist" creates its own "<topic> FlashCard" asset containing the chosen question (observed behaviour, pinned)
8. RES-05-08 — Regression: one click on a tab switches to that tab's content
9. RES-05-09 — To check the Videos tab shows videos for the current topic
10. RES-05-10 — To check Teaching Tips shows Activities, Explanation and Real Life Example
11. RES-05-11 — To check Minimize and Maximize work
12. RES-05-12 — To check Close exits AI Assist cleanly
13. RES-05-13 — Regression: double-clicking "Add to Playlist" adds the exercise only once
14. RES-05-14 — Edge: to check opening and closing AI Assist 5 times leaves exactly one AI Assist window
15. RES-05-15 — Edge: to check switching class while AI Assist is open closes it cleanly

### RES-06 — Add Resource menu

Added 2026-09-26 from the reference suite (Add Resource workbook, ADD-CORE-01..04, AR-BREAK-04, ADD-EXP-07).

1. RES-06-01 — To check the "+" button opens the Add Resource menu with all 6 options
2. RES-06-02 — To check each of the 6 options opens its own screen
3. RES-06-03 — To check closing an option's screen returns cleanly to the whiteboard
4. RES-06-04 — Regression: pressing "+" while an option's screen is open doesn't open a second Add Resource menu on top
5. RES-06-05 — Edge: to check clicking an option the moment the menu opens opens that option, not a different one

### RES-08 — Uploading real teacher files, good and bad (added 2026-09-27)

Uses the upload test-data kit (`node scripts/make-test-data.js` builds `test-data/`: 29 files a teacher would upload and
21 broken, wrong, oversized or unsupported ones; `test-data/manifest.json` describes each). One case per file:

1. RES-08-xx — Positive: an image (PNG/JPG/JPEG, tiny, 12 MP, very tall, transparent, upper-case extension) is accepted and shows at its real size
2. RES-08-xx — Positive: an MP4 video (landscape, portrait, 1 second, silent, just under 10 MB) is accepted, loads and plays
3. RES-08-xx — Positive: a PDF (3 pages, 80 pages, upper-case .PDF, special characters or a Hindi file name) is accepted and shows all its pages
4. RES-08-xx — Positive: an Office or text file of an accepted type (.docx .pptx .xlsx .xls .odt .odp .ods .txt) is accepted and shows its content
5. RES-08-xx — Negative: a file of a type the form does not accept (.webp .webm .weba .wav .svg .bmp .zip .exe, double extension, no extension) or over 10 MB is refused with a message saying why
6. RES-08-xx — Negative: an empty, corrupt or mislabelled file (0 bytes, random bytes, cut-off, header only, not-a-zip, image named .mp4, video named .png, program named .pdf, RTF named .doc) is refused with a message -- not accepted as "Successfully added resource!" and discovered broken only when opened in class
7. RES-08-xx — Edge: a file name of about 250 characters is either accepted or refused with a message, never silently lost

### RES-09 — Sending real teacher files through DropIt (added 2026-09-27)

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
