# 12 — Minimap

Covers the whiteboard's Minimap overview: opening it from the Zoom control, reading where the current view sits on
the board, and jumping around the board from it. Module code: `MM`. Each `### <ID> — <Title>` is a **story**; each
numbered line under it is a **test case** belonging to that story.

Added 2026-09-26 from the reference suite (`new approch playwright`, Minimap workbook, 25 cases). Entry point
confirmed live there: Zoom tool (`toolbar-tool-gtZoom`) → Minimap button (`toolbar-zoom-minimap-btn`). The panel
(`minimap-container`) is always in the DOM — open/closed is its `.visible` class, not whether the element exists.

### MM-01 — Open and close the Minimap

1. MM-01-01 — To check the Minimap opens from the Zoom control and shows a scaled overview, a viewport rectangle, the zoom percentage, Reset View and Close
2. MM-01-02 — To check Close hides the Minimap and leaves nothing behind on the whiteboard
3. MM-01-03 — To check the Minimap is closed again after the app reloads, not restored open
4. MM-01-04 — Edge: to check opening and closing the Minimap 8 times in quick succession leaves one clean panel, not a stuck or duplicated one
5. MM-01-05 — Regression: switching class while the Minimap is open closes it, instead of leaving it stuck over the new class's whiteboard

### MM-02 — See where the current view is on the board

1. MM-02-01 — To check the Minimap shows a marker for content that is already on the whiteboard
2. MM-02-02 — To check zooming the main canvas resizes the viewport rectangle and updates the Minimap's zoom percentage to match
3. MM-02-03 — To check panning the main canvas moves the Minimap's viewport rectangle with it
4. MM-02-04 — Edge: to check opening the Minimap on an empty whiteboard shows an empty overview without an error
5. MM-02-05 — Edge: to check rapid zoom in/out on the main canvas while the Minimap is open leaves the Minimap's percentage matching the real zoom
6. MM-02-06 — Edge: to check that at the minimum and maximum zoom the viewport rectangle stays inside the Minimap frame

### MM-03 — Move around the board from the Minimap

1. MM-03-01 — To check clicking a point inside the Minimap pans the main canvas to that point
2. MM-03-02 — To check Reset View restores 100% zoom and brings the original content back into view after zooming and panning away
3. MM-03-03 — Edge: to check double-clicking Reset View quickly causes no error or visual glitch
4. MM-03-04 — Edge: to check clicking 10 different points in the Minimap in quick succession keeps the canvas responsive and ends on the last point
5. MM-03-05 — Negative: to check panning far past the content from the Minimap can always be recovered with Reset View

### MM-04 — Minimap alongside other panels

1. MM-04-01 — To check the Minimap's Players toggle hides and shows an open player (it only has an effect while a player is open)
2. MM-04-02 — Edge: to check the open Minimap does not cover the Playlist strip or the Add Resource button
