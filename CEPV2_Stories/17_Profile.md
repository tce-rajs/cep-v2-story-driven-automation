# 17 — Profile (Account settings, Change Password, Change PIN)

Covers the User Profile window reached from the User menu: the Account tab (preferred resource types, subjects) and
the Profile tab (Change Password, Change PIN). The User menu itself is covered in `05_Toolbar.md`, TB-09. Module
code: `PRF`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a **test case** belonging to that
story.

Added 2026-09-26 from the reference suite (`new approch playwright`, User Profile workbook, 50 cases). Account-tab
changes are undone at the end of each test. Change Password and Change PIN use the spare account (`DISPOSABLE_*` in
`.env`), never the main QA account, and set the original password/PIN back afterwards (owner's decision,
2026-09-26).

### PRF-01 — Open the profile

1. PRF-01-01 — To check the chevron on the "Signed in as" row opens User Profile with Account and Profile tabs
2. PRF-01-02 — Edge: to check switching quickly between Account and Profile always shows the selected tab's content
3. PRF-01-03 — Edge: to check clicking the avatar 6 times quickly never opens more than one menu

### PRF-02 — Choose preferred resource types

1. PRF-02-01 — To check the Account tab shows the currently preferred resource types
2. PRF-02-02 — To check a type can be taken out of the preferred list with the mouse or a finger tap (and the change is still in effect after a reload)
3. PRF-02-03 — Negative: to check applying with no types selected is blocked with a message
4. PRF-02-04 — Edge: to check the preferred resource type list shows each type only once (added 2026-09-27)

### PRF-03 — Manage teaching subjects

1. PRF-03-01 — To check Add Subjects adds the chosen subject as a chip straight away
2. PRF-03-02 — To check a subject already added is not offered again in Add Subjects
3. PRF-03-03 — To check removing a subject chip removes only that subject
4. PRF-03-04 — Negative: to check removing the last remaining subject is blocked or clearly explained
5. PRF-03-05 — Edge: to check double-clicking a chip's remove icon removes only that one subject

### PRF-04 — Change password

1. PRF-04-01 — To check Change Password shows Current, New and Repeat New Password fields and the password rules
2. PRF-04-02 — Negative: to check a new password shorter than 8 characters shows an error while typing
3. PRF-04-03 — Negative: to check different New and Repeat New Password values show a mismatch message
4. PRF-04-04 — Negative: to check a wrong current password is rejected, so the password stays the same
5. PRF-04-05 — Negative: to check a new password identical to the current one is rejected
6. PRF-04-06 — To check Cancel closes the form without changing anything
7. PRF-04-07 — To check a successful change lets the user sign in with the new password
8. PRF-04-08 — Regression: Change Password and Change PIN can't both be open at once
9. PRF-04-09 — To check Change Password opens with Save disabled _(split from PRF-04-01, 2026-09-28)_
10. PRF-04-10 — Negative: to check that with different New and Repeat New Password values Save stays blocked _(split from PRF-04-03, 2026-09-28)_
11. PRF-04-11 — Negative: to check a wrong current password shows a clear error _(split from PRF-04-04, 2026-09-28)_
12. PRF-04-12 — To check that after a successful change the old password is rejected _(split from PRF-04-07, 2026-09-28)_

### PRF-05 — Change PIN

1. PRF-05-01 — To check Change PIN shows Current, New and Repeat New PIN boxes, Auto-Generate PIN, Cancel and Save
2. PRF-05-02 — Negative: to check the PIN boxes accept digits only
3. PRF-05-03 — To check Auto-Generate PIN fills in the New PIN
4. PRF-05-04 — Negative: to check different New and Repeat New PIN values block Save
5. PRF-05-05 — Negative: to check a new PIN identical to the current one is rejected with a clear message
6. PRF-05-06 — To check Cancel closes the form without changing the PIN
7. PRF-05-07 — To check a successful change lets the user sign in with the new PIN
8. PRF-05-08 — To check that after a successful change the old PIN is rejected _(split from PRF-05-07, 2026-09-28)_
