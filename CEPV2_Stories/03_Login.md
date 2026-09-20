# 03 — Login

Covers signing in as an existing user, including failure states, session behavior, and
Plan Mode edge cases. Module code: `LOG`. Each `### <ID> — <Title>` is a **story**;
each numbered line under it is a **test case** belonging to that story.

### LOG-01 — Login

1. LOG-01-01 — To check every valid login shows a welcome message that appears and then disappears on its own shortly after — not a message that has to be dismissed manually, and not one that lingers
2. LOG-01-02 — To check an incorrect password shows a clear, specific error message
3. LOG-01-03 — To check a nonexistent account shows a clear error, not a generic failure
4. LOG-01-04 — To check logging in with a new PIN succeeds after an admin resets it
5. LOG-01-05 — To check the old PIN is rejected with a clear message after a reset
6. LOG-01-06 — To check signing in with an expired profile shows a specific "expired" message
7. LOG-01-07 — Regression: "school license expired" blocks login with the right message
8. LOG-01-08 — To check the session stays active during 15-20+ minutes of continuous use
9. LOG-01-09 — Regression: auto-logout doesn't recur
10. LOG-01-10 — Regression: duplicate-user sync issue doesn't recur on sign-in
11. LOG-01-11 — Regression (Plan Mode, excluded from automation): sign-in state and grade/subject context survive a Teach↔Plan switch
12. LOG-01-12 — Concurrency: signing into a second, different account in a new tab doesn't corrupt the first tab's session
13. LOG-01-13 — Interruption: a sign-out fired immediately after a real backend action (e.g. right after Add to Playlist, before its confirmation toast) doesn't corrupt that action

### LOG-02 — All core UI components load after a valid login

Deliberately itemized rather than one "landing UI looks right" line, so each piece is
independently verified instead of assumed from the others working.

1. LOG-02-01 — To check the full toolbar, including Magnet, is visible and functional after a valid login (unlike the without-login state, where Magnet is unavailable — see `01_WithoutLogin.md`, PRE-03)
2. LOG-02-02 — To check class/curriculum navigation (grade, chapter, topic) is visible and functional after a valid login
3. LOG-02-03 — To check Playlist is visible and functional after a valid login
4. LOG-02-04 — To check Add Resource is visible and functional after a valid login
5. LOG-02-05 — To check the header's logo and version display correctly in the top-left corner after a valid login
6. LOG-02-06 — To check the header's date and time display correctly in the top-right corner after a valid login
7. LOG-02-07 — To check the whiteboard loads and is usable after a valid login
8. LOG-02-08 — Edge: to check that if one component fails to load, the rest of the UI doesn't become unusable — partial-failure resilience, not an all-or-nothing landing screen

_(Whether login returns the user to their last-accessed topic is a separate check —
see `07_ClassNavigation.md`, NAV-05.)_
