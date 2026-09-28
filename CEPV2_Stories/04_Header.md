# 04 — Header

Covers the header bar, tested in both Teach and Plan Mode contexts. Module code: `HDR`.
Each `### <ID> — <Title>` is a **story**; each numbered line under it is a **test
case** belonging to that story.

### HDR-01 — Logo & Version

1. HDR-01-01 — To check the logo displays correctly in the header
2. HDR-01-02 — To check the header shows the correct build/version number, in both Teach and Plan Mode

### HDR-02 — Date & Time

1. HDR-02-01 — Regression: the header's Date & Time display shows a correct, non-blank value
2. HDR-02-02 — To check the date/time stays accurate after being idle for several minutes
3. HDR-02-03 — To check the time in the header moves forward on its own, without reloading
4. HDR-02-04 — To check the date and time shown match the computer's clock

### HDR-03 — Logout

1. HDR-03-01 — To check clicking the header's Logout control signs out correctly, in both Teach and Plan Mode
2. HDR-03-02 — Edge: to check double-clicking Logout doesn't cause an error or attempt a double sign-out/navigation

### HDR-04 — Toolbar Position

1. HDR-04-01 — To check toggling the toolbar's left/right position moves it without breaking any open panel
2. HDR-04-02 — Regression: toggling the position rapidly, many times in a row, doesn't crash or freeze the toolbar

### HDR-05 — Compass (Explore It / Analyse It)

1. HDR-05-01 — To check the Compass icon opens with both "Explore It" and "Analyse It" options visible
2. HDR-05-02 — To check Compass shows a "Revision Test" section for topics that have one
3. HDR-05-03 — To check Compass shows a "Homework" section for topics that have one
4. HDR-05-04 — Negative: to check a topic without a Revision Test or Homework doesn't show those sections — they're conditional per topic, not always present
5. HDR-05-05 — Regression (Plan Mode, excluded from automation): re-verify the existing Plan Mode Compass test cases still pass — a verify pass, not a discovery pass
6. HDR-05-06 — Regression: a Revision Test card's title text doesn't overlap its info line/type icon
7. HDR-05-07 — Regression (blocked, see spec): the Revision Test popup doesn't persist after signing out (and back in) without closing it first
8. HDR-05-08 — Manual-only (needs Plan Mode to author the triggering content): Compass stays visible in Teach Mode alongside Magnet after a Revision Test is created in Plan Mode for that class/topic
9. HDR-05-09 — To check Explore It shows the chapter's widgets, and opening one shows that widget
10. HDR-05-10 — To check Explore It's "Open Widgets" link opens the full widget browser
11. HDR-05-11 — To check Analyse It shows a "no homework" message with a link to create homework when the topic has none
12. HDR-05-12 — Regression: in Analyse It, "View Questions" and "View Last 5 Homework" open their views (Zoho TCN-I16623)
13. HDR-05-13 — Edge: to check clicking the Compass button 6 times quickly never opens more than one Compass window
14. HDR-05-14 — To check Compass opens normally again after the app reloads with its details view open

### HDR-06 — Profile (Plan Mode)

1. HDR-06-01 — Regression (Plan Mode, excluded from automation): the header's Profile entry point opens correctly in Plan Mode

### HDR-07 — Switch Mode

1. HDR-07-01 — To check clicking Switch Mode actually changes between Teach Mode and Plan Mode and updates the UI accordingly
2. HDR-07-02 — To check clicking Switch Mode while an unsaved action is in progress (mid-draw, mid-quiz) warns before switching, not a silent discard
3. HDR-07-03 — Edge: to check rapid repeated Switch Mode clicking doesn't leave the app stuck between modes
4. HDR-07-04 — Negative: to check attempting to switch mode with no network connection shows an appropriate error, not a silent failure or crash
