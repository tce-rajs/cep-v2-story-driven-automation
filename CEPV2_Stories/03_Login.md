# 03 — Login

Covers signing in as an existing user, including failure states, session behavior, and
Plan Mode edge cases. Module code: `LOG`. Each `### <ID> — <Title>` is a **story**;
each numbered line under it is a **test case** belonging to that story.

### LOG-01 — Login

**User story:** As a teacher, I want to sign in reliably and be told clearly when I can't, so that I can start class without confusion.

**Acceptance criteria:**

- AC1: A valid sign-in shows a welcome message that goes away by itself
- AC2: Wrong password, unknown account, expired profile or licence each show their own clear message
- AC3: A reset PIN works and the old one is refused
- AC4: The session is not ended early or mixed with another account

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

**User story:** As a teacher, I want everything I need on screen right after signing in, so that I can teach without hunting for tools.

**Acceptance criteria:**

- AC1: Toolbar with Magnet, class/topic navigation, Playlist, Add Resource, header and whiteboard all load
- AC2: Each one opens and works
- AC3: One part failing to load does not make the rest unusable

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

**User story:** As a teacher, I want to sign in with my 5-digit PIN, by keyboard or the on-screen keypad, so that signing in on the classroom panel is fast.

**Acceptance criteria:**

- AC1: Exactly five boxes that take digits only
- AC2: An incomplete PIN does not sign in
- AC3: The on-screen keypad types, deletes and submits
- AC4: Pasting a PIN works and a double tap sends one sign-in

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

**User story:** As a teacher, I want to sign in with my school, User ID and password, so that I can sign in when I don't have my PIN.

**Acceptance criteria:**

- AC1: School, User ID and Password fields in that order, with school search
- AC2: Sign In is enabled only when every field is filled
- AC3: Valid details sign in (User ID in any letter case), and a double click submits once
- AC4: I can switch back to the PIN view

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

**User story:** As a teacher, I want to stay signed in while I am teaching and be asked before an idle session ends, so that I am not signed out in the middle of a lesson.

**Acceptance criteria:**

- AC1: A reload keeps me signed in
- AC2: When idle, a Sign Out / Continue popup appears with a 1-minute countdown
- AC3: Continue keeps me signed in; Sign Out or no answer signs me out
- AC4: No network or a server error during sign-in gives a clear message

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
11. LOG-05-11 — Interruption: to check a sign-in on a very slow network (10 s to answer) shows progress, and pressing again does not sign in twice _(added 2026-09-30, gap analysis)_

### LOG-06 — Session length and token extension (added 2026-09-28)

**User story:** As a teacher, I want my session renewed silently while I keep working and my writing kept when the session ends, so that a long lesson is never lost.

**Acceptance criteria:**

- AC1: While I work the token is renewed with no popup
- AC2: The session ends at about 40 minutes (45 at most)
- AC3: Nothing written before the end is lost, and I am warned before it ends
- AC4: One failed renewal does not end the session

From the session rules above. One session of continuous use (a pen stroke every 30 seconds) is run once, for up to
50 minutes; the cases after the first check one more result on the same session.

1. LOG-06-01 — To check that while the teacher keeps using the app, the token is renewed silently before each 5-minute token expires
2. LOG-06-02 — To check that continuous use ends in a forced sign-out at about 40 minutes, never later than 45, even while the teacher is active
3. LOG-06-03 — Regression: to check nothing the teacher wrote before that forced sign-out is lost
4. LOG-06-04 — Negative: to check one failed token renewal (a network blip) does not end the session while the teacher is active _(the expected behaviour is this case's assumption; the owner's flow does not state it)_
5. LOG-06-05 — To check a teacher who keeps interacting is never shown the Sign Out / Continue popup
6. LOG-06-06 — Regression: writing done in the last minutes before the app's forced sign-out (about 40-45 min) is on the board after signing back in _(added 2026-09-30 from the long writing runs: about 10 lines were lost at each of 4 forced sign-outs)_
7. LOG-06-07 — To check the teacher is warned before the forced sign-out, so unsaved writing is not lost silently _(added 2026-09-30)_
8. LOG-06-08 — To check that signing out yourself at 40 minutes keeps everything written in that session _(added 2026-09-30: 3 of 3 sessions fully saved)_

### LOG-07 — Sign In panel (added 2026-09-30)

**User story:** As a teacher who has not signed in, I want a Sign In panel I can expand, close and read the terms from, so that I know what I agree to and can get it out of the way.

**Acceptance criteria:**

- AC1: The arrow expands and collapses the panel
- AC2: The close button returns to Guest Mode
- AC3: Terms and Privacy Policy links open
- AC4: The keyboard button opens the on-screen keypad on both forms

Seen live on the Ultra server (v 0.0.232): signed out, the Sign In panel sits at the bottom with an arrow to expand it.
Expanded, it shows a news picture on the left ("Clearest Image Of The Moon ..."), a close (X) button, and "By signing
in, you agree to the TCE Terms & Privacy Policy" links under the form. The keyboard button opens the on-screen keypad.

1. LOG-07-01 — To check the arrow expands the Sign In panel and shows the news picture beside the PIN form
2. LOG-07-02 — To check the arrow collapses the expanded panel again, and the PIN boxes still work
3. LOG-07-03 — To check the close (X) button closes the Sign In panel and leaves the board in Guest Mode
4. LOG-07-04 — To check the Terms link opens the Terms page (in a way the teacher can return from)
5. LOG-07-05 — To check the Privacy Policy link opens the Privacy Policy page
6. LOG-07-06 — To check the keyboard button on the PIN form opens the on-screen keypad (1-9, 0, Backspace, Enter)
7. LOG-07-07 — To check the keyboard button on the password form opens the on-screen keyboard too
