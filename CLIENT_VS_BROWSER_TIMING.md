# Writing a long lesson: desktop client vs browser

Measured 29 Sep 2026 on server `172.18.2.85`, PIN 89632 (Mandar A), Class 12A Computer Science.

## What was done (the same in both)

The same script wrote the same **1,003-word Binary Search lesson** on the whiteboard:

- 13 sections, each with a heading.
- The pen colour and size change between sections.
- 4 Gallery images and 5 drawn diagrams (array boxes, circles, arrows).
- Everything is written below existing writing. Nothing is cleared and nothing overlaps.
- **Sign-out check** after about every 250 words and at the end: wait 10 s, sign out, sign back in, compare every stroke and image.

|          | Browser                                   | Desktop client                                            |
| -------- | ----------------------------------------- | --------------------------------------------------------- |
| Where    | Headless Chrome (no window)               | Tata ClassEdge School app (visible window)                |
| Topic    | 7.2 Binary Search (already had 800 words) | 8.1 Data and its Types (empty)                            |
| Window   | 1920 x 1080                               | 1536 x 864                                                |
| Finished | All 13 sections                           | 12 sections; stopped at 17:34 during section 13, as asked |

## Time per section (seconds)

The time of a section includes the sign-out check that ran just before it.

| Section                                  | Browser         | Client           |
| ---------------------------------------- | --------------- | ---------------- |
| 1 Binary search                          | 143             | 451              |
| 2 Why the list must be sorted (+ image)  | 145             | 406              |
| 3 The three pointers (+ diagram)         | 188             | 436              |
| 4 A worked example (+ diagram)           | 180             | 336              |
| 5 Searching for a missing item (+ image) | 174             | 394              |
| 6 Counting the comparisons (+ diagram)   | 179             | 422              |
| 7 Writing it as a program                | 135             | 382              |
| 8 Common mistakes (+ image)              | 169             | 397              |
| 9 Recursive binary search (+ diagram)    | 185             | 334              |
| 10 Compared with linear search           | 141             | 300              |
| 11 Where binary search is used (+ image) | 150             | 224              |
| 12 Finding the first match (+ diagram)   | 213             | 281              |
| 13 Homework                              | 166             | stopped part-way |
| **Sections 1-12**                        | **33 min 21 s** | **72 min 28 s**  |
| **All 13 + final check**                 | **36 min 39 s** | -                |

For the same 12 sections the **client took 2.2x as long** (about 6 min a section against 2.8 min). The client was slowest at the start (6-7.5 min a section) and faster towards the end (4-5 min).

## Data kept after signing out

| Check                     | Browser (7.2)                         | Client (8.1)                  |
| ------------------------- | ------------------------------------- | ----------------------------- |
| After ~314 words          | 2,000 -> 2,000 strokes, images 1 -> 1 | 520 -> 520, images 1 -> 1     |
| After ~533 words          | 2,301 -> 2,301, images 2 -> 2         | 819 -> 820, images 2 -> 2     |
| After ~823 words          | 2,621 -> 2,621, images 4 -> 4         | 1,140 -> 1,140, images 4 -> 4 |
| End (1,003 words)         | 2,992 -> 2,992, images 4 -> 4         | (stopped before the end)      |
| **Strokes / images lost** | **0 / 0**                             | **0 / 0**                     |

- **Saved on the server afterwards:** 7.2 has 2,992 strokes and 4 images; 8.1 has 1,390 strokes and 4 images, including part of section 13.
- **Browser counts** include the 800 words already on 7.2 (1,480 strokes). The lesson itself added about the same number of strokes in both.
- **Client check after ~533 words:** one _extra_ stroke appeared after signing back in (819 -> 820). Nothing was lost; it may have been a stroke still being saved. It is worth watching.
- **Stopping the client:** the writing was stopped first, then the app was given 30 s to finish its autosave before it was closed.

## Why the client takes longer

- **Smaller window** (1536 x 864 against 1920 x 1080). Fewer words fit on a line and fewer lines on a screen, so the client has to pan to fresh space more often for the same text.
- **It really draws on screen.** The client renders every stroke in a visible window; headless Chrome does not paint to a screen.
- **No forced sign-out happened in either run:** each sign-out check starts a fresh session.

## Conclusion

- **Data is safe in both.** 7 sign-out checks (4 browser, 3 client) kept every stroke and every image.
- **The client is about 2x slower** for the same lesson, partly because of its smaller window. It got faster as the session went on.
