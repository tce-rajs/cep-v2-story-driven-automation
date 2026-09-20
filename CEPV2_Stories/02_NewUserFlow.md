# 02 — New User Flow

Covers first-time setup, before a user has an established account/session: the forced
password reset on first login, PIN setup, and the welcome/first-class-selection screen
that follows. Module code: `NEW`. Each `### <ID> — <Title>` is a **story**; each
numbered line under it is a **test case** belonging to that story.

### NEW-01 — First login: default password forces a password reset

Steps for the happy path: (1) go to sign in — school is either pre-selected by default
or chosen manually; (2) enter the given username; (3) enter the first-time default
password `classedge`; (4) on submit, the system requires setting a new password rather
than logging straight in; (5) set the new password; (6) after setting it, the user is
returned to the sign-in page — not auto-logged-in; (7) sign in again with the username
and the newly-set password.

1. NEW-01-01 — To check the school is either pre-selected by default or can be selected manually, and both paths reach the username field
2. NEW-01-02 — To check entering the given username and the default password `classedge` triggers a forced "set new password" step, not a normal login
3. NEW-01-03 — To check setting the new password succeeds and returns the user to the sign-in page, rather than logging them in directly
4. NEW-01-04 — To check signing in again with the username and the newly-set password succeeds
5. NEW-01-05 — Negative: to check the old default password (`classedge`) no longer works once the new password is set

### NEW-02 — PIN setup on first successful password login

1. NEW-02-01 — To check that successfully signing in with the new password (immediately after NEW-01) presents a PIN setup page before entering the app
2. NEW-02-02 — To check setting a new PIN completes successfully
3. NEW-02-03 — To check the user can subsequently log in using the PIN, as an alternative to the password
4. NEW-02-04 — Negative: to check setting a PIN that doesn't meet format requirements (too short, non-numeric) shows a validation error, not a silent rejection

### NEW-03 — Welcome screen and first-time class selection

1. NEW-03-01 — To check that logging in for the first time after setup (via either PIN or password) shows a welcome message with a "Choose Class" option centered on the page
2. NEW-03-02 — To check selecting a class for the first time completes correctly and proceeds into the normal app flow
3. NEW-03-03 — Edge: to check closing or navigating away before selecting a class means the "Choose Class" prompt reappears on the next login, rather than being silently skipped
