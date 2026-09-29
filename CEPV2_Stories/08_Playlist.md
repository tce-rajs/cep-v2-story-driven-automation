# 08 — Playlist

Covers opening assets from Playlist, Ebook access specifically, the Resource List, the
Playlist menu (Edit/Reset/Filter), Navigation, and Pin. Module code: `PL`. Each
`### <ID> — <Title>` is a **story**; each numbered line under it is a **test case**
belonging to that story.

### PL-01 — Open assets from Playlist

Assets = PDF, Quiz, Video, and other resource types added to the playlist (Ebook is
covered separately in PL-02, since it has its own navigation behavior).

1. PL-01-01 — To check opening a PDF asset from Playlist loads it correctly
2. PL-01-02 — To check opening a Quiz asset from Playlist loads it correctly
3. PL-01-03 — To check opening a Video asset from Playlist loads it correctly
4. PL-01-04 — To check the Playlist always shows the assets that have been added to it — it isn't empty when assets exist
5. PL-01-05 — To check the user can open multiple assets in sequence from the Playlist without one interfering with the next
6. PL-01-06 — Negative: to check attempting to open an asset that failed to load or is corrupted shows an error, not a silent failure

### PL-02 — Open & navigate Ebook (from Playlist)

1. PL-02-01 — To check opening an ebook from Playlist loads it correctly
2. PL-02-02 — To check navigating chapters/pages within the opened ebook works correctly
3. PL-02-03 — To check the ebook's contents panel opens and closes correctly
4. PL-02-04 — Regression: jumping between ebook chapters (forward, to the end, back to the start) always lands on the chapter chosen — CEP v1's recurring ebook navigation weak spot
5. PL-02-05 — To check the ebook's linked-resources panel opens and closes correctly _(split from PL-02-03, 2026-09-28)_
6. PL-02-06 — Regression: scrolling through an ebook keeps one chapter selected and causes no error _(split from PL-02-04, 2026-09-28)_

### PL-03 — Resource List

1. PL-03-01 — Regression: the Playlist strip/Contents/Add-Resource controls don't become invisible after closing a resource preview (one test per preview type: PDF, video, image, web link)
2. PL-03-02 — To check the resource list doesn't overlap a split-screen quiz panel

### PL-04 — Playlist Menu (Edit / Reset / Filter)

1. PL-04-01 — To check editing the playlist saves changes correctly
2. PL-04-02 — To check resetting the playlist reverts it to the expected state
3. PL-04-03 — To check filtering the playlist shows only matching resources
4. PL-04-04 — Negative: to check filtering with a term that matches nothing shows an appropriate empty state, not a blank panel
5. PL-04-05 — To check unticking the main Filter Resources box hides every resource card
6. PL-04-06 — To check unticking one resource type hides only cards of that type
7. PL-04-07 — To check the filter goes back to showing everything after switching topic
8. PL-04-08 — To check Reset asks for confirmation first
9. PL-04-09 — To check entering Edit and finishing without changes leaves the Playlist exactly as it was
10. PL-04-10 — Edge: to check turning every filter off and on 3 times quickly ends with every card showing
11. PL-04-11 — To check ticking Filter Resources again brings every card back _(split from PL-04-05, 2026-09-28)_
12. PL-04-12 — To check cancelling Reset changes nothing _(split from PL-04-08, 2026-09-28)_

### PL-05 — Navigation

1. PL-05-01 — Regression: switching topics/chapters rapidly, several times, before the previous one finishes loading doesn't corrupt Playlist state
2. PL-05-02 — Regression (Plan Mode, excluded from automation): a custom chapter/topic/resource created in Plan Mode appears correctly in Teach Mode Playlist, and vice versa
3. PL-05-03 — To check the Playlist shows the same resources after the app reloads

### PL-06 — Pin

1. PL-06-01 — To check pinning a resource keeps it fixed at the top of the playlist
2. PL-06-02 — To check unpinning removes that fixed placement
3. PL-06-03 — Edge: to check pinning multiple resources keeps them all fixed at the top in a consistent order

### PL-07 — Playlist strip

Added 2026-09-26 from the reference suite (Playlist workbook, PL-CORE-01..05, PL-EXP-07/09).

1. PL-07-01 — To check the strip shows the E-Books tile
2. PL-07-02 — To check the Contents tile shows the current chapter and topic
3. PL-07-03 — To check the arrows scroll the strip when there are more cards than fit
4. PL-07-04 — Edge: to check a topic with 20 or more resources keeps the strip usable
5. PL-07-05 — To check the strip shows the Contents tile _(split from PL-07-01, 2026-09-28)_
6. PL-07-06 — To check the strip shows the resource cards, each card with its type icon _(split from PL-07-01, 2026-09-28)_

### PL-08 — Contents (table of contents)

Added 2026-09-26 from the reference suite (Playlist workbook, PL-TOC-01..09, PL-CHP-01..06).

1. PL-08-01 — To check Contents opens the chapter and topic list
2. PL-08-02 — To check choosing a topic from Contents changes the current topic
3. PL-08-03 — To check searching Contents finds topics regardless of letter case
4. PL-08-04 — To check Cancel brings back the full list after a search
5. PL-08-05 — Negative: to check a search with no matches shows a message, not a blank panel
6. PL-08-06 — Edge: to check a very long search is handled without error
7. PL-08-07 — To check the current topic is highlighted in Contents _(split from PL-08-01, 2026-09-28)_
8. PL-08-08 — To check choosing a topic from Contents reloads the Playlist for that topic _(split from PL-08-02, 2026-09-28)_

### PL-09 — Manage resources in the Playlist

Added 2026-09-26 from the reference suite (Playlist workbook, PL-STATE-02, PL-GAP-01, PL-CYP-02, PL-EXP-05) and Zoho bugs.

1. PL-09-01 — To check removing a resource asks for confirmation before it disappears
2. PL-09-02 — To check a new order made by dragging cards is kept after the app reloads
3. PL-09-03 — To check Edit in a card's menu appears only on resources the teacher created
4. PL-09-04 — Regression: saving changes to a teacher-created resource shows the right success message (Zoho TCN-I16558)
5. PL-09-05 — Edge: to check adding a resource that's already in the Playlist doesn't create a confusing duplicate

### PL-10 — Multiple clicks and fast actions on the Playlist (added 2026-09-27)

1. PL-10-01 — Regression/Negative: double-clicking Remove's confirm button removes only the chosen resource, not the next one as well
2. PL-10-02 — Edge: fast clicks on the strip's right arrow reach the last card and never leave the strip blank
3. PL-10-03 — Edge: double-clicking a topic in Contents opens that topic, and the current-topic label shows it
4. PL-10-04 — Edge: toggling Edit mode on and off five times fast leaves the Playlist in normal mode
5. PL-10-05 — Edge: after scrolling to the end, fast clicks on the strip's left arrow come back to the first card _(split from PL-10-02, 2026-09-28)_
6. PL-10-06 — Edge: fast scrolling to both ends of the strip loses or duplicates no card _(split from PL-10-02, 2026-09-28)_
7. PL-10-07 — Edge: after double-clicking a topic in Contents, the Contents window is closed and not reopened _(split from PL-10-03, 2026-09-28)_
8. PL-10-08 — Edge: toggling Edit mode on and off five times fast loses or duplicates no card _(split from PL-10-04, 2026-09-28)_
9. PL-10-09 — Edge: after toggling Edit mode on and off five times fast, cards still open normally _(split from PL-10-04, 2026-09-28)_
