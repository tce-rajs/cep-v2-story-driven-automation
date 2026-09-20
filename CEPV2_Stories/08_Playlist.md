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
3. PL-02-03 — To check the ebook's panels (contents, linked resources) open and close correctly
4. PL-02-04 — Regression: chapter-jump, pagination, and scroll don't reproduce CEP v1's recurring ebook navigation weak spot

### PL-03 — Resource List

1. PL-03-01 — Regression: the Playlist strip/Contents/Add-Resource controls don't become invisible after closing certain resource previews
2. PL-03-02 — To check the resource list doesn't overlap a split-screen quiz panel

### PL-04 — Playlist Menu (Edit / Reset / Filter)

1. PL-04-01 — To check editing the playlist saves changes correctly
2. PL-04-02 — To check resetting the playlist reverts it to the expected state
3. PL-04-03 — To check filtering the playlist shows only matching resources
4. PL-04-04 — Negative: to check filtering with a term that matches nothing shows an appropriate empty state, not a blank panel

### PL-05 — Navigation

1. PL-05-01 — Regression: switching topics/chapters rapidly, several times, before the previous one finishes loading doesn't corrupt Playlist state
2. PL-05-02 — Regression (Plan Mode, excluded from automation): a custom chapter/topic/resource created in Plan Mode appears correctly in Teach Mode Playlist, and vice versa

### PL-06 — Pin

1. PL-06-01 — To check pinning a resource keeps it fixed at the top of the playlist
2. PL-06-02 — To check unpinning removes that fixed placement
3. PL-06-03 — Edge: to check pinning multiple resources keeps them all fixed at the top in a consistent order
