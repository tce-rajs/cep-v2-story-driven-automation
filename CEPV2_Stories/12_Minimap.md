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
4. MM-01-04 — Edge: to check opening and closing the Minimap 8 times in quick succession leaves one clean, closed panel, not a stuck or duplicated one
5. MM-01-05 — Regression: switching class while the Minimap is open closes it, instead of leaving it stuck over the new class's whiteboard
6. MM-01-06 — Edge: to check that after opening and closing it 8 times quickly, the Minimap still opens normally _(split from MM-01-04, 2026-09-28)_

### MM-02 — See where the current view is on the board

1. MM-02-01 — To check the Minimap shows a marker for content that is already on the whiteboard
2. MM-02-02 — To check zooming the main canvas updates the Minimap's zoom percentage to match
3. MM-02-03 — To check panning the main canvas moves the Minimap's viewport rectangle with it
4. MM-02-04 — Edge: to check opening the Minimap on an empty whiteboard shows an empty overview without an error
5. MM-02-05 — Edge: to check rapid zoom in/out on the main canvas while the Minimap is open leaves the Minimap's percentage matching the real zoom
6. MM-02-06 — Edge: to check that at the maximum zoom the viewport rectangle stays inside the Minimap frame
7. MM-02-07 — To check zooming in on the main canvas shrinks the Minimap's viewport rectangle _(split from MM-02-02, 2026-09-28)_
8. MM-02-08 — Edge: to check that at the minimum zoom the viewport rectangle stays inside the Minimap frame _(split from MM-02-06, 2026-09-28)_

### MM-03 — Move around the board from the Minimap

1. MM-03-01 — To check clicking a point inside the Minimap pans the main canvas to that point
2. MM-03-02 — To check Reset View restores 100% zoom after zooming and panning away
3. MM-03-03 — Edge: to check double-clicking Reset View quickly causes no error or visual glitch
4. MM-03-04 — Edge: to check clicking 10 different points in the Minimap in quick succession ends on the last point clicked
5. MM-03-05 — Negative: to check panning far past the content from the Minimap can always be recovered with Reset View
6. MM-03-06 — To check Reset View brings the original content back into view after zooming and panning away _(split from MM-03-02, 2026-09-28)_
7. MM-03-07 — Edge: to check that after clicking 10 points in the Minimap quickly, the canvas still takes a stroke _(split from MM-03-04, 2026-09-28)_

### MM-04 — Minimap alongside other panels

1. MM-04-01 — To check the Minimap's Players toggle takes an open player out of the Minimap overview (it only has an effect while a player is open). _(Story said "hides and shows an open player"; confirmed live 2026-09-26 it switches the player in the overview only, the window stays open -- owner to decide story or app.)_
2. MM-04-02 — Edge: to check the open Minimap does not cover the Add Resource button, which still responds
3. MM-04-03 — To check pressing the Players toggle again puts the open player back in the Minimap overview _(split from MM-04-01, 2026-09-28)_
4. MM-04-04 — To check the Players toggle leaves the player window itself open _(split from MM-04-01, 2026-09-28)_
5. MM-04-05 — Edge: to check the open Minimap does not cover the Playlist strip _(split from MM-04-02, 2026-09-28)_
