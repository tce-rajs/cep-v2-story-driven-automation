# 07 — Class Navigation

Covers Grade/Class selection, Chapter search/listing, Topic listing, and
last-accessed-topic restoration. Module code: `NAV`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

### NAV-01 — Select Grade

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
7. NAV-01-07 — To check choosing a class from Recent Classes switches to it and moves it to the top of the list
8. NAV-01-08 — To check a grade with only one division selects that division automatically
9. NAV-01-09 — To check choosing a subject switches class straight away, with no separate confirm step
10. NAV-01-10 — To check changing the grade after a subject is chosen clears the subject choice
11. NAV-01-11 — To check closing the class window without choosing anything leaves the current class unchanged
12. NAV-01-12 — Edge: to check clicking several grades quickly ends on the last grade clicked
13. NAV-01-13 — Edge: to check switching quickly between Recent Classes and All My Classes always shows the selected tab's list
14. NAV-01-14 — Edge: to check opening the class window and then the chapter window at once never leaves both open

### NAV-02 — Search Chapter

1. NAV-02-01 — To check searching for a chapter returns accurate results
2. NAV-02-02 — Negative: to check a search with zero matching results shows an appropriate empty-state message
3. NAV-02-03 — Edge: to check searching with special characters or a very long query string doesn't break the search
4. NAV-02-04 — Regression: clearing the search brings the full chapter list back, instead of leaving it empty
5. NAV-02-05 — Edge: to check a search of only spaces is treated as no match, not ignored

### NAV-03 — List Chapters

1. NAV-03-01 — To check the chapter list displays correctly for a selected grade/subject
2. NAV-03-02 — To check adjacent/easily-confused chapters show the correct content, not a neighbor's
3. NAV-03-03 — Regression: "subject not visible" doesn't recur

### NAV-04 — List Topics

1. NAV-04-01 — To check the topic list displays correctly for a selected chapter
2. NAV-04-02 — Negative: to check a chapter with zero topics shows an appropriate empty state

### NAV-05 — Last-accessed topic is restored

Not a content check (that's `06_Whiteboard.md`, WB-06) — this is purely about whether
the app puts the user back where they were, e.g. Science, Grade 8A, Topic 1.6.

1. NAV-05-01 — To check that signing out and signing back in **immediately** returns the user to the exact topic they were on before signing out — landing anywhere else is a bug
2. NAV-05-02 — To check that signing out and signing back in **after some time has passed** still returns the user to that same last-accessed topic
3. NAV-05-03 — Regression (Plan Mode, excluded from automation): to check switching from Teach Mode to Plan Mode and back returns to the same topic the user was on before switching
4. NAV-05-04 — Regression (Plan Mode, excluded from automation): to check switching from Plan Mode to Teach Mode and back returns to the same topic the user was on before switching

### NAV-06 — Switching class while other work is open

Added 2026-09-26 from the reference suite (Grade/Subject/Division workbook, NAV-E2E-01/02, NAV-EXP-04/07, NAV-STATE-02) and Zoho bugs.

1. NAV-06-01 — To check switching class closes an open player and stops any video that is playing
2. NAV-06-02 — To check switching class while a Magnet panel is open leaves no panel behind
3. NAV-06-03 — Regression: after switching class, the Playlist shows only the new class's resources, not the previous class's (Zoho CWR-I768, TCN-I15324)
4. NAV-06-04 — Edge: to check clicking several subjects quickly loads the last subject clicked, not an earlier one
5. NAV-06-05 — To check opening and closing other panels leaves the current class, chapter and topic unchanged

### NAV-07 — Fast and repeated class switching (added 2026-09-27)

1. NAV-07-01 — Edge: double-clicking a subject switches class once; the label, Playlist and board all belong to the chosen class
2. NAV-07-02 — Negative: switching class while a resource is still uploading keeps the resource in the class it was uploaded to (never in the class switched to)
3. NAV-07-03 — Regression: switching class five times in a row quickly ends on the last class chosen and stays there (a late answer from an earlier switch does not switch it back)
