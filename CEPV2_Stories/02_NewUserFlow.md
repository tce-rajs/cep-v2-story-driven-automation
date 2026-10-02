# 02 — New User Flow

Covers first-time setup, before a user has an established account/session: the forced
password reset on first login, PIN setup, and the welcome/first-class-selection screen
that follows. Module code: `NEW`. Each `### <ID> — <Title>` is a **story**; each
numbered line under it is a **test case** belonging to that story.

### NEW-01 — First login: default password forces a password reset

**User story:** As a new teacher, I want to be made to replace the default password on my first sign-in, so that my account is secure from day one.

**Acceptance criteria:**

- AC1: The default password leads to a forced "set new password" step
- AC2: After setting it I am sent back to sign in
- AC3: The new password works and the default one no longer does

Steps for the happy path: (1) go to sign in — school is either pre-selected by default
or chosen manually; (2) enter the given username; (3) enter the first-time default
password `classedge`; (4) on submit, the system requires setting a new password rather
than logging straight in; (5) set the new password; (6) after setting it, the user is
returned to the sign-in page — not auto-logged-in; (7) sign in again with the username
and the newly-set password.

1. NEW-01-01 — To check that with the school as pre-selected (if at all), the username field is reachable
2. NEW-01-02 — To check entering the given username and the default password `classedge` triggers a forced "set new password" step, not a normal login
3. NEW-01-03 — To check setting the new password succeeds and returns the user to the sign-in page, rather than logging them in directly
4. NEW-01-04 — To check signing in again with the username and the newly-set password succeeds
5. NEW-01-05 — Negative: to check the old default password (`classedge`) no longer works once the new password is set
6. NEW-01-06 — To check choosing the school by hand shows the chosen school and the username field is reachable _(split from NEW-01-01, 2026-09-28)_

### NEW-02 — PIN setup on first successful password login

**User story:** As a new teacher, I want to set a 5-digit PIN after my first password sign-in, so that I can sign in quickly in class.

**Acceptance criteria:**

- AC1: PIN setup appears before entering the app
- AC2: A valid PIN is saved and signs me in next time
- AC3: Short PINs, letters and a mismatched confirmation are refused

1. NEW-02-01 — To check that successfully signing in with the new password (immediately after NEW-01) presents a PIN setup page before entering the app
2. NEW-02-02 — To check setting a new PIN completes successfully
3. NEW-02-03 — To check the user can subsequently log in using the PIN, as an alternative to the password
4. NEW-02-04 — Negative: to check a PIN that is too short (3 digits) cannot be submitted, not a silent rejection
5. NEW-02-05 — Negative: to check letters are not accepted into the PIN boxes _(split from NEW-02-04, 2026-09-28)_
6. NEW-02-06 — Negative: to check a different PIN in the confirmation step is refused with a clear message _(added 2026-09-30 for the acceptance criteria)_

### NEW-03 — Welcome screen and first-time class selection

**User story:** As a new teacher, I want to choose my first class on a welcome screen, so that the app opens on my own class and subject.

**Acceptance criteria:**

- AC1: A welcome message with "Choose Class" shows on the first sign-in
- AC2: Choosing a class opens the normal app
- AC3: Leaving without choosing shows the prompt again next time

1. NEW-03-01 — To check that logging in for the first time after setup (via either PIN or password) shows a welcome message with a "Choose Class" option centered on the page
2. NEW-03-02 — To check selecting a class for the first time completes correctly and proceeds into the normal app flow
3. NEW-03-03 — Edge: to check closing or navigating away before selecting a class means the "Choose Class" prompt reappears on the next login, rather than being silently skipped
