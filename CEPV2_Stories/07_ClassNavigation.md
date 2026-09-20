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

### NAV-02 — Search Chapter

1. NAV-02-01 — To check searching for a chapter returns accurate results
2. NAV-02-02 — Negative: to check a search with zero matching results shows an appropriate empty-state message
3. NAV-02-03 — Edge: to check searching with special characters or a very long query string doesn't break the search

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
