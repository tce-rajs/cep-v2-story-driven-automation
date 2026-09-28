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
14. LOG-01-14 — Regression: closing and reopening the client signs the previous user out, instead of restoring their session

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

### LOG-03 — Sign in with a PIN

Added 2026-09-26 from the reference suite (Authentication workbook, PIN-01..23, AUTH-GAP-03/04).

1. LOG-03-01 — To check the PIN view shows the Sign In heading, the welcome and instruction text, and five PIN boxes
2. LOG-03-02 — Negative: to check a partly filled PIN (fewer than five digits) does not sign in
3. LOG-03-03 — Negative: to check the PIN boxes accept digits only
4. LOG-03-04 — To check the on-screen keypad's digit, Backspace and Enter keys work in the PIN boxes
5. LOG-03-05 — To check "Disable Virtual Keyboard" hides the on-screen keypad
6. LOG-03-06 — To check pasting a five-digit PIN fills the boxes
7. LOG-03-07 — Edge: to check switching to the password view and back part-way through typing leaves both forms usable
8. LOG-03-08 — Regression: tapping the fifth PIN box twice quickly signs in once, without an error

### LOG-04 — Sign in with a password

Added 2026-09-26 from the reference suite (Authentication workbook, PWD-01..20). Uses the spare account
(`DISPOSABLE_*` in `.env`) for the successful sign-in, since the main account's stored password is currently rejected.

1. LOG-04-01 — To check "Sign in with Password" shows the School, User ID and Password fields in that order
2. LOG-04-02 — To check typing part of a school name lists matching schools
3. LOG-04-03 — Negative: to check a school name that matches nothing shows "No items found"
4. LOG-04-04 — To check the clear (x) button empties the School field
5. LOG-04-05 — To check Sign In stays disabled until every field is filled
6. LOG-04-06 — To check signing in with a valid school, User ID and password succeeds
7. LOG-04-07 — Edge: to check a User ID typed in a different letter case signs in the same way
8. LOG-04-08 — Regression: double-clicking Sign In submits only once
9. LOG-04-09 — To check "Sign in with Pin" switches back to the PIN view

### LOG-05 — Stay signed in

Added 2026-09-26 from the reference suite (Authentication workbook, SESS-01, AUTH-GAP-01, NET-01/02).

1. LOG-05-01 — To check the user is still signed in after the app reloads
2. LOG-05-02 — To check the inactivity warning shows a countdown, and "Stay Signed In" keeps the session going
3. LOG-05-03 — Negative: to check signing in with no network shows a clear error, not a hang
4. LOG-05-04 — Negative: to check a server error during sign-in shows a clear message and the user can try again
