# CEP v2 — Modules & Stories

Rebuilt from the client's actual row-level checklist data
(`../Manual_Testing/CEPV2_WebV2_Feature_List_FINAL_CHECKLIST.xlsx`, "Final Checklist"
sheet, verified cell-by-cell). Story format matches CEP v1's actual suites: short
title, numbered "To check..." list, `Regression:`/`Negative:`/`Cross-Mode:`/etc. prefix
only where there's a specific known bug or failure mode to call out. Process in
[PROCESS.md](PROCESS.md).

**Differentiator:** every `### <ID> — <Title>` heading is a **story**. Every numbered
line under it (`<ID>-<NN>`) is a **test case** belonging to that story — the heading
level and the ID pattern are what tell them apart, not just position on the page.

| #   | Module                                                                                    | File                                             |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 01  | Without Login                                                                             | [01_WithoutLogin.md](01_WithoutLogin.md)         |
| 02  | New User Flow                                                                             | [02_NewUserFlow.md](02_NewUserFlow.md)           |
| 03  | Login                                                                                     | [03_Login.md](03_Login.md)                       |
| 04  | Header                                                                                    | [04_Header.md](04_Header.md)                     |
| 05  | Toolbar                                                                                   | [05_Toolbar.md](05_Toolbar.md)                   |
| 06  | Whiteboard                                                                                | [06_Whiteboard.md](06_Whiteboard.md)             |
| 07  | Class Navigation (Grade/Class, Chapter/Topic selection + last-accessed-topic restoration) | [07_ClassNavigation.md](07_ClassNavigation.md)   |
| 08  | Playlist                                                                                  | [08_Playlist.md](08_Playlist.md)                 |
| 09  | Resources (Add Resource)                                                                  | [09_Resources.md](09_Resources.md)               |
| 10  | Sidebar (Plan Mode — excluded from automation)                                            | [10_Sidebar_PlanMode.md](10_Sidebar_PlanMode.md) |
| 11  | Players                                                                                   | [11_Players.md](11_Players.md)                   |

Modules 01, 04-10 come straight from the client's checklist (their single "Without
Login" section is split three ways here — Without Login, New User Flow, and Login are
genuinely different flows, not one; the checklist calls module 07 "Curriculum" —
renamed to "Class Navigation" since it now also owns last-accessed-topic restoration,
which isn't curriculum content). **Module 11 (Players) was added, not in that checklist** —
it covers attempting/scoring a quiz, completing a worksheet, navigating an ebook, and
playing video/image resources, which the checklist names as being _built_ (Sidebar's
Question Bank) but never names where they're actually _played_. Flagged as an addition
rather than silently folded in.

Gallery's full 20-case pilot decomposition stays in
`../CEPV1_Reference/CEPV2_PILOT_GALLERY.md`, referenced from `09_Resources.md` rather
than duplicated.
