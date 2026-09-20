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

### RES-03 — Gallery

1. RES-03-01 — To check opening the gallery from a topic shows images filtered to that chapter/subject
2. RES-03-02 — To check searching within the gallery filters the results correctly
3. RES-03-03 — To check selecting an image inserts it onto the whiteboard
4. RES-03-04 — To check the inserted image is selectable via the toolbar
5. RES-03-05 — Regression: repeat opening the gallery picker 5-10x in a row and record the actual failure rate — don't accept a single clean pass as proof it's fixed
6. RES-03-06 — To check the inserted image is selectable and movable via the arrow keys

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
