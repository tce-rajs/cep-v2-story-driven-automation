# 07 — Class Navigation

Covers Grade/Class selection, Chapter search/listing, Topic listing, and
last-accessed-topic restoration. Module code: `NAV`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

### NAV-01 — Select Grade

**User story:** As a teacher, I want to choose my grade, division and subject, so that the app shows my class's content.

**Acceptance criteria:**

- AC1: The class window shows Recent Classes and All My Classes
- AC2: Choosing a class sets its division and subjects and switches at once
- AC3: Recent Classes keeps my latest classes on top
- AC4: Closing without choosing, or fast clicks, never leave the wrong class

Flow: clicking into the existing/current class opens two sections — "Recent Classes"
and "All My Classes." Recent Classes shows the most recently selected class(es); All My
Classes shows the complete list. Selecting a class sets its Division, and the Subjects
shown update according to that Division.

1. NAV-01-01 — To check clicking on the existing class opens two sections: "Recent Classes" and "All My Classes"
2. NAV-01-02 — To check "Recent Classes" shows the class(es) most recently selected
3. NAV-01-03 — To check "All My Classes" shows the complete list of classes
4. NAV-01-04 — To check selecting a class from either section sets the correct Division for that class
5. NAV-01-05 — To check the Subjects shown update correctly based on the selected class's Division
6. NAV-01-06 — Regression (Plan Mode, excluded from automation): grade selection carries over correctly across a Teach↔Plan switch
7. NAV-01-07 — To check choosing a class from Recent Classes switches to it
8. NAV-01-08 — To check a grade with only one division selects that division automatically
9. NAV-01-09 — To check choosing a subject switches class straight away, with no separate confirm step
10. NAV-01-10 — To check changing the grade after a subject is chosen clears the subject choice
11. NAV-01-11 — To check closing the class window without choosing anything leaves the current class unchanged
12. NAV-01-12 — Edge: to check clicking several grades quickly ends on the last grade clicked
13. NAV-01-13 — Edge: to check switching quickly between Recent Classes and All My Classes always shows the selected tab's list
14. NAV-01-14 — Edge: to check opening the class window and then the chapter window at once never leaves both open
15. NAV-01-15 — To check a class chosen from Recent Classes moves to the top of the list _(split from NAV-01-07, 2026-09-28)_

### NAV-02 — Search Chapter

**User story:** As a teacher, I want to search for a chapter, so that I can find it quickly in a long list.

**Acceptance criteria:**

- AC1: Matching chapters are found
- AC2: No match shows a message
- AC3: Special characters, spaces or very long text do not break it
- AC4: Clearing brings the full list back

1. NAV-02-01 — To check searching for a chapter returns accurate results
2. NAV-02-02 — Negative: to check a search with zero matching results shows an appropriate empty-state message
3. NAV-02-03 — Edge: to check searching with special characters doesn't break the search
4. NAV-02-04 — Regression: clearing the search brings the full chapter list back, instead of leaving it empty
5. NAV-02-05 — Edge: to check a search of only spaces is treated as no match, not ignored
6. NAV-02-06 — Edge: to check searching with a very long (2,000-character) query doesn't break the search _(split from NAV-02-03, 2026-09-28)_

### NAV-03 — List Chapters

**User story:** As a teacher, I want the chapters of my subject listed correctly, so that I can pick the right one.

**Acceptance criteria:**

- AC1: The list shows the subject's chapters with correct names and content
- AC2: Chapters are listed in book order (1, 2, 3 ...)
- AC3: The subject is always visible

1. NAV-03-01 — To check the chapter list displays correctly for a selected grade/subject
2. NAV-03-02 — To check adjacent/easily-confused chapters show the correct content, not a neighbor's
3. NAV-03-03 — Regression: "subject not visible" doesn't recur
4. NAV-03-04 — To check chapters are listed in number order _(seen live 2026-09-30 on 12A Physics: 1, 2, 5, 3, 4, 8, 6, 7, 9, 10, 11, 13, 12, 14)_ _(added 2026-09-30 for the acceptance criteria)_

### NAV-04 — List Topics

**User story:** As a teacher, I want the topics of a chapter listed, so that I can open the one I am teaching.

**Acceptance criteria:**

- AC1: Every topic has a title and they are in order
- AC2: A chapter with no topics shows a message
- AC3: Choosing a topic makes it current

1. NAV-04-01 — To check the topic list displays correctly for a selected chapter, every topic with a title
2. NAV-04-02 — Negative: to check a chapter with zero topics shows an appropriate empty state
3. NAV-04-03 — To check choosing a topic from the list makes it the current topic _(split from NAV-04-01, 2026-09-28)_
4. NAV-04-04 — To check topics are listed in number order (1.1, 1.2, 1.3 ...) _(added 2026-09-30 for the acceptance criteria)_

### NAV-05 — Last-accessed topic is restored

**User story:** As a teacher, I want to come back to the topic I was last on, so that I can continue where I stopped.

**Acceptance criteria:**

- AC1: Signing back in, at once or later, opens my last topic
- AC2: Teach/Plan switching keeps the topic (manual)

Not a content check (that's `06_Whiteboard.md`, WB-06) — this is purely about whether
the app puts the user back where they were, e.g. Science, Grade 8A, Topic 1.6.

1. NAV-05-01 — To check that signing out and signing back in **immediately** returns the user to the exact topic they were on before signing out — landing anywhere else is a bug
2. NAV-05-02 — To check that signing out and signing back in **after some time has passed** still returns the user to that same last-accessed topic
3. NAV-05-03 — Regression (Plan Mode, excluded from automation): to check switching from Teach Mode to Plan Mode and back returns to the same topic the user was on before switching
4. NAV-05-04 — Regression (Plan Mode, excluded from automation): to check switching from Plan Mode to Teach Mode and back returns to the same topic the user was on before switching

### NAV-06 — Switching class while other work is open

**User story:** As a teacher, I want switching class to close what belonged to the old class, so that the new class starts clean.

**Acceptance criteria:**

- AC1: Players, videos and Magnet panels close
- AC2: The Playlist shows only the new class's resources
- AC3: Fast subject clicks end on the last one
- AC4: Opening other panels does not change the class

Added 2026-09-26 from the reference suite (Grade/Subject/Division workbook, NAV-E2E-01/02, NAV-EXP-04/07, NAV-STATE-02) and Zoho bugs.

1. NAV-06-01 — To check switching class closes an open player
2. NAV-06-02 — To check switching class while a Magnet panel is open leaves no panel behind
3. NAV-06-03 — Regression: after switching class, the Playlist shows only the new class's resources, not the previous class's (Zoho CWR-I768, TCN-I15324)
4. NAV-06-04 — Edge: to check clicking several subjects quickly loads the last subject clicked, not an earlier one
5. NAV-06-05 — To check opening and closing other panels leaves the current class, chapter and topic unchanged
6. NAV-06-06 — To check switching class stops any video that is playing _(split from NAV-06-01, 2026-09-28)_

### NAV-07 — Fast and repeated class switching (added 2026-09-27)

**User story:** As a teacher, I want double clicks and fast switching to end on the class I chose, so that I never teach from the wrong class.

**Acceptance criteria:**

- AC1: A double click switches once and loads the new Playlist
- AC2: Five fast switches end on the last class
- AC3: An upload in progress stays in its own class

1. NAV-07-01 — Edge: double-clicking a subject switches to that class, and the class label shows it
2. NAV-07-02 — Negative: switching class while a resource is still uploading keeps the resource in the class it was uploaded to (never in the class switched to)
3. NAV-07-03 — Regression: switching class five times in a row quickly ends on the last class chosen and stays there (a late answer from an earlier switch does not switch it back)
4. NAV-07-04 — Edge: after double-clicking a subject, the class window is closed and not reopened _(split from NAV-07-01, 2026-09-28)_
5. NAV-07-05 — Edge: after double-clicking a subject, the new class's Playlist loads _(split from NAV-07-01, 2026-09-28)_

### NAV-08 — Topic lesson plan (added 2026-09-30)

**User story:** As a teacher, I want to read a topic's lesson plan from the chapter list, so that I can prepare without leaving the lesson.

**Acceptance criteria:**

- AC1: The document icon opens the lesson plan of the topic clicked
- AC2: It shows its sections and scrolls to the end
- AC3: Closing it returns to the unchanged board and topic

Seen live on the Ultra server (v 0.0.232): in the Chapters list each topic has a document icon. Clicking it opens that
topic's lesson plan over the board (chapter and topic name, Objectives, Introduction / Coverage, Resources Available,
Media, Worksheet) without changing the current topic.

1. NAV-08-01 — To check the document icon next to a topic opens that topic's lesson plan
2. NAV-08-02 — To check the lesson plan shows the chapter and topic names of the icon clicked, not the current topic
3. NAV-08-03 — To check the lesson plan shows its sections (Objectives, Introduction, Resources Available)
4. NAV-08-04 — To check a long lesson plan scrolls to its end
5. NAV-08-05 — To check closing the lesson plan returns to the board with the topic and board unchanged
6. NAV-08-06 — To check opening a lesson plan does not switch the current topic
7. NAV-08-07 — Edge: to check opening lesson plans of three topics one after another always shows the one clicked
