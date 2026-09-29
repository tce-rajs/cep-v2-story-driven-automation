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
9. LOG-01-09 — Regression: auto-logout doesn't come early — idle for under 4 minutes, the teacher stays signed in and no warning shows _(reworded 2026-09-28 to the session rules in LOG-05: until then it expected a 6-minute idle session to survive)_
10. LOG-01-10 — Regression: duplicate-user sync issue doesn't recur on sign-in
11. LOG-01-11 — Regression (Plan Mode, excluded from automation): sign-in state and grade/subject context survive a Teach↔Plan switch
12. LOG-01-12 — Concurrency: signing into a second, different account in a new tab doesn't corrupt the first tab's session
13. LOG-01-13 — Interruption: a sign-out fired immediately after a real backend action (e.g. right after Add to Playlist, before its confirmation toast) doesn't corrupt that action
14. LOG-01-14 — Regression: closing and reopening the client signs the previous user out, instead of restoring their session

### LOG-02 — All core UI components load after a valid login

Deliberately itemized rather than one "landing UI looks right" line, so each piece is
independently verified instead of assumed from the others working.

Split 2026-09-28 so each case checks one result; the new cases carry the next free IDs.

1. LOG-02-01 — To check the full toolbar, including Magnet, is visible after a valid login (unlike the without-login state, where Magnet is unavailable — see `01_WithoutLogin.md`, PRE-03)
2. LOG-02-02 — To check class/curriculum navigation (the class and the chapter/topic buttons) is visible after a valid login
3. LOG-02-03 — To check Playlist is visible after a valid login
4. LOG-02-04 — To check Add Resource is visible and functional after a valid login
5. LOG-02-05 — To check the header's logo displays correctly in the top-left corner after a valid login
6. LOG-02-06 — To check the header shows the current time in the top-right corner after a valid login
7. LOG-02-07 — To check the whiteboard loads and is usable after a valid login
8. LOG-02-08 — Edge: to check that if one component fails to load, the rest of the UI doesn't become unusable — partial-failure resilience, not an all-or-nothing landing screen
9. LOG-02-09 — To check Magnet opens its menu after a valid login _(split from LOG-02-01)_
10. LOG-02-10 — To check the class button opens the class list (Recent and All My Classes) after a valid login _(split from LOG-02-02)_
11. LOG-02-11 — To check the chapter/topic button opens the chapter list, and a chapter shows its topics, after a valid login _(split from LOG-02-02)_
12. LOG-02-12 — To check the Playlist options menu opens after a valid login _(split from LOG-02-03)_
13. LOG-02-13 — To check the header's version number displays correctly in the top-left corner after a valid login _(split from LOG-02-05)_
14. LOG-02-14 — To check the header shows the current date in the top-right corner after a valid login _(split from LOG-02-06)_

_(Whether login returns the user to their last-accessed topic is a separate check —
see `07_ClassNavigation.md`, NAV-05.)_

### LOG-03 — Sign in with a PIN

Added 2026-09-26 from the reference suite (Authentication workbook, PIN-01..23, AUTH-GAP-03/04).

1. LOG-03-01 — To check the PIN view shows the Sign In heading, the welcome and the instruction text
2. LOG-03-02 — Negative: to check a partly filled PIN (fewer than five digits) does not sign in
3. LOG-03-03 — Negative: to check the PIN boxes accept digits only
4. LOG-03-04 — To check the on-screen keypad's digit keys type into the PIN boxes
5. LOG-03-05 — To check "Disable Virtual Keyboard" hides the on-screen keypad
6. LOG-03-06 — To check pasting a five-digit PIN fills the boxes
7. LOG-03-07 — Edge: to check that after switching to the password view and back part-way through typing, the PIN still signs in
8. LOG-03-08 — Regression: tapping the fifth PIN box twice quickly sends only one sign-in
9. LOG-03-09 — To check the PIN view shows exactly five PIN boxes _(split from LOG-03-01, 2026-09-28)_
10. LOG-03-10 — To check the on-screen keypad's Backspace key clears a digit _(split from LOG-03-04, 2026-09-28)_
11. LOG-03-11 — To check a PIN entered on the on-screen keypad signs in (with Enter if needed) _(split from LOG-03-04, 2026-09-28)_
12. LOG-03-12 — Edge: to check that after typing part of a PIN, the password view opens and its fields can be filled _(split from LOG-03-07, 2026-09-28)_
13. LOG-03-13 — Regression: tapping the fifth PIN box twice quickly shows no error _(split from LOG-03-08, 2026-09-28)_

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

**Session rules (stated by the owner, 2026-09-28):** the access token lives **5 minutes**, and the app checks the
session at **minute 4** of each token (the last minute is kept for the teacher to answer). If the teacher interacted
recently (any interaction, pen strokes included), the token is **renewed silently, with no popup**. If not, a **Sign Out /
Continue Session popup** appears with a **1-minute** window: Continue renews the token, Sign Out signs out, and no
answer **signs the teacher out automatically**. The first two checks renew automatically, so idle from sign-in the popup comes at the third check (about
11-14 minutes; seen live 2026-09-29 -- no popup within 6 minutes); after a spell of activity it never comes sooner than
4 minutes after the last interaction (seen live: 9.5 minutes). After continuous use the teacher is signed out even while active: at about **40 minutes**, **45 at the most** (LOG-06). Not yet known: when the
next popup comes after Continue (measured by LOG-05-05, not asserted).

1. LOG-05-01 — To check the user is still signed in after the app reloads
2. LOG-05-02 — To check the inactivity warning shows its 1-minute countdown
3. LOG-05-03 — Negative: to check signing in with no network shows a clear error, not a hang
4. LOG-05-04 — Negative: to check a server error during sign-in shows a clear message
5. LOG-05-05 — To check Continue Session on the inactivity warning keeps the session going (and record when the next popup comes) _(split from LOG-05-02, 2026-09-28)_
6. LOG-05-06 — Negative: to check that after a server error during sign-in, trying again signs in once the server is back _(split from LOG-05-04, 2026-09-28)_
7. LOG-05-07 — To check that idle from sign-in, the Sign Out / Continue popup appears at the third session check, about 11-14 minutes (the first two checks renew automatically) _(timing seen live 2026-09-29; owner to confirm)_
8. LOG-05-08 — To check Sign Out on the popup signs the teacher out _(added 2026-09-28)_
9. LOG-05-09 — To check that with no answer to the popup, the teacher is signed out automatically after its 1 minute _(added 2026-09-28)_
10. LOG-05-10 — To check that after a spell of activity, the popup never comes sooner than 4 minutes after the last interaction, and comes within about 13 (seen live: 9.5 min) _(added 2026-09-28)_

### LOG-06 — Session length and token extension (added 2026-09-28)

From the session rules above. One session of continuous use (a pen stroke every 30 seconds) is run once, for up to
50 minutes; the cases after the first check one more result on the same session.

1. LOG-06-01 — To check that while the teacher keeps using the app, the token is renewed silently before each 5-minute token expires
2. LOG-06-02 — To check that continuous use ends in a forced sign-out at about 40 minutes, never later than 45, even while the teacher is active
3. LOG-06-03 — Regression: to check nothing the teacher wrote before that forced sign-out is lost
4. LOG-06-04 — Negative: to check one failed token renewal (a network blip) does not end the session while the teacher is active _(the expected behaviour is this case's assumption; the owner's flow does not state it)_
5. LOG-06-05 — To check a teacher who keeps interacting is never shown the Sign Out / Continue popup
