# Test data added to the QA server

Where the automated tests put data on the QA server (`ce-qa-school.devstudi.com`), and whether they remove it
again. Last updated 2026-09-26 (the gap-fill pass on branch `improve/reference-driven-coverage` and the bug-video
runs).

Class, chapter and topic come from `config/moduleClassMap.js` and the `resetToClass(...)` calls in the specs. Topic
names are the ones shown in the app in the 2026-09-26 recordings (`bug-evidence/`).

## Accounts used

| Account                                        | Used by                                                |
| ---------------------------------------------- | ------------------------------------------------------ |
| Main QA account, `raj.shinde` (`VALID_PIN`)    | Almost every module                                    |
| Second QA account (`VALID_PIN_2`)              | Playlist, Players, Resources Create, Quiz, AI Homework |
| Spare account, `android.test` (`DISPOSABLE_*`) | Profile: Change Password / Change PIN only             |

## Summary by class and topic

| Where                                                                              | What the tests add                                                                                                                                                                                                       | Removed afterwards?                                                                                                   |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Class 12A Physics, 1.1 "Big Idea: Electric Charges and Fields"** (main account)  | Whiteboard: the text "Photosynthesis is important" (AI Notices), Gallery images (horse and other animals, RES-03), pen strokes and shapes (Header, Minimap, Whiteboard, Toolbar tests when the account is on this class) | Partly. Tests that count objects clear the board **before** they start, so the last test's content stays on the board |
| Class 12A Physics, 1.1                                                             | Sent **notices** titled `AutoTest notice <time>` and `AutoTest double-send <time>` (sent twice, because of bug AIN-03-04)                                                                                                | No. Sent notices are real and stay with the class                                                                     |
| Class 12A Physics, 1.1                                                             | **Learning Shorts**: `AutoTest short <time>` and `AutoTest tiny <time>` saved to the Playlist, `AutoTest revision <time>` saved as a revision, one short sent to the first class in the list                             | No                                                                                                                    |
| Class 12A Physics, 1.1                                                             | **Attendance** submitted for the day (all present). Submitted twice by ATT-03-03 (double-click bug)                                                                                                                      | No. It stays as that day's attendance                                                                                 |
| Class 12A Physics, 1.1                                                             | DropIt uploads (files and text sent from the "paired device")                                                                                                                                                            | Yes (`removeOwnedAsset`)                                                                                              |
| Class 12A Physics, 1.1 and 1.2                                                     | Whiteboard content added by WB-06 (strokes, text, images, named `classswitch<time>` and similar)                                                                                                                         | No. Kept on purpose to check that it persists                                                                         |
| Class 12A Physics, chapter 1, topic 1.5 (`librarySuggestions`)                     | Library items added to the Playlist (RES-02), AI Assist questions added to the Playlist (RES-05, created as "`<topic>` FlashCard" assets)                                                                                | Yes for Library items. AI Assist: one test removes its asset; others may leave "FlashCard" assets behind              |
| Class 12A Computer Science, 14.1 "Approaches for Solving Project" (second account) | Custom resources `AutoTest-<time>` and `AutoTest-image-<time>` (Create), uploads `AutoTest-malformed-<time>` and `AutoTest-unsupported-<time>`, pen annotations over players                                             | Resources: yes (`removeOwnedAsset`). Annotations: no                                                                  |
| Class 11A Mathematics (second account)                                             | **AI Homework** really assigned: `AutoTest homework <time>` (1 day), `AutoTest homework 3 days <time>`                                                                                                                   | No. Real homework assigned to Class 11A                                                                               |
| Class 11A Mathematics (main account)                                               | Gallery images and lines seen on the board in the recordings                                                                                                                                                             | No                                                                                                                    |
| Class 11A Accountancy, 3.1 "Source Documents and Preparation…" (second account)    | Quiz attempts (answers submitted), pen lines on the board                                                                                                                                                                | No                                                                                                                    |
| Class 8R Mathematics, "Foundation Checkpoint"                                      | Checkpoint `testR-25.08.26` **launched, started and paused** (PLR-09-03)                                                                                                                                                 | No. Launching cannot be undone, and each launch uses up one of the account's checkpoints (owner-approved)             |
| Class 5A Mathematics, 1.1 "Reading and Writing Large Numbers" (main account)       | Toolbar tests' rectangles, pen strokes, text boxes and widgets. These tests use whatever class the account was last on; in the 2026-09-26 recordings that was Class 5A Mathematics                                       | Board cleared before each Toolbar test; the last test's content stays                                                 |
| Class 9A Hindi Language                                                            | Nothing added. Only used to switch away and back                                                                                                                                                                         | –                                                                                                                     |
| Spare account `android.test`                                                       | Password changed and changed back (PRF-04-07), PIN changed and changed back (PRF-05)                                                                                                                                     | Yes. The test restores the original and fails loudly if it can't                                                      |

## Added 2026-09-27

| Where                                                                                                  | What the tests add                                                                                                                                                                                                                                       | Removed afterwards?                                                                           |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Class 12A Physics, 3.1 "Big Idea: Current Electricity"** (main account, class-map key `longSession`) | Handwriting from the long-session tests (WB-10-15/16 finger and stylus, WB-11 teacher's day, the stylus demo): each run pans below what is there and writes more. Also stray lines from the two-finger-pan and palm bugs (they draw instead of panning). | **No, on purpose** (owner's request: a real board is never cleared). It grows with every run. |
| Class 12A Physics, 1.1                                                                                 | WB-08 (800 words, offline, Undo), WB-09 (integrity) and WB-10 (touch) writing                                                                                                                                                                            | Yes: those tests clear the board at the end (WB-08/09/10 short cases only)                    |
| Class 12A Computer Science, 14.1 (second account)                                                      | Upload kit (RES-08 and the probe): one `AutoTest-kit-<time>` resource per file, 50 files                                                                                                                                                                 | Yes (each is removed right after it is checked)                                               |
| Class 12A Computer Science, 14.1                                                                       | PL-10-01: `AutoTest-remove-a/b-<time>`; NAV-07-02: `AutoTest-switch-upload-<time>` (a 9.6 MB video)                                                                                                                                                      | Yes                                                                                           |
| Class 12A Physics, 1.1                                                                                 | DropIt kit run: one resource per file DropIt accepts                                                                                                                                                                                                     | Yes (compared with the Playlist before, and removed)                                          |
| Class 12A Physics, 1.1                                                                                 | AIN-05-02: one real notice `AutoTest retry-send <time>` to the current class                                                                                                                                                                             | No (real send)                                                                                |
| Class 12A Physics, 1.1                                                                                 | ATT-06-02: today's attendance submitted once more                                                                                                                                                                                                        | No (real submit)                                                                              |

**Leftovers found 2026-09-27:** Class 12A Computer Science 14.1 still had older `AutoTest-<time>` / `AutoTest-<time>-edited`
cards (unsupported type) from earlier runs whose clean-up failed; the 2026-09-27 kit run removed its own cards.

**DropIt full-kit run (2026-09-27, Class 12A Physics 1.1):** all 50 test-data files sent through DropIt (one real QR
pairing + a second browser context per file, ~2.4 h). 49 completed (1 timed out on its very first pairing attempt of the
run and was not retried); of those, images/PDF/docx accepted through DropIt were removed again after being checked.
DropIt's own accepted-type list (png/jpg/jpeg/gif/bmp/pdf/doc/docx) held: every video, audio, ODF, `.xlsx`/`.xls`/`.txt`
and other outside that list was correctly refused with no card created. Kept as **RES-09** (9 representative cases,
picked from these 50, so a full regression run does not need 2.4 hours every time).

## Things on the board that are NOT from this suite

The Class 12A Physics 1.1 Playlist also shows cards such as `OR002 Asset …`, `OR005 Asset …`,
`Playlist Remove Test …`, `Database Transactions` and `Database Management…`. Nothing in this project creates them.
They come from the older suites (the reference projects), which ran against the same QA account.

## Notes

- Test data names always start with `AutoTest` (or `classswitch`, `Homework reminder`) followed by a timestamp, so
  they are easy to find and delete by hand.
- If you want a clean board or Playlist before a demo, delete by those name prefixes in the classes above.
- Keep this file up to date when a spec starts creating data in a new place.
