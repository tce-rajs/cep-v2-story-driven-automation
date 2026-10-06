# 20 — Cross-cutting: languages, dates, roles, readability and messages

Covers checks that cut across every module rather than belonging to one: Indian-language text, dates and times,
different kinds of teachers and school data, readability on a classroom panel, and the messages teachers see. Module
code: `XC`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a **test case**. Added
2026-09-30 from a gap analysis of all modules. Security and abuse cases stay out (owner, 2026-09-26).

### XC-01 — Hindi and Marathi everywhere

**User story:** As a teacher who teaches in Hindi or Marathi, I want Devanagari text to work everywhere I type or write, so that I can teach in my language.

**Acceptance criteria:**

- AC1: Devanagari can be typed and is shown correctly in every text field
- AC2: It is saved and comes back unchanged
- AC3: Search finds Devanagari names
- AC4: Devanagari handwriting is saved exactly _(seen: 1.8 and 7A essays saved correctly)_

1. XC-01-01 — To check Marathi typed in a whiteboard text box is shown correctly (joined letters, matras) and is unchanged after a reload
2. XC-01-02 — To check a Hindi notice title and body are sent and shown correctly
3. XC-01-03 — To check a Marathi homework title is saved and shown correctly
4. XC-01-04 — To check a Hindi resource title in Create is saved and shown on the card
5. XC-01-05 — To check chapter search finds a Hindi chapter name in Class 9A Hindi Language
6. XC-01-06 — Negative: to check a file with a Hindi name is accepted, or refused with a message _(seen: silently rejected, RES-08)_
7. XC-01-07 — To check the on-screen keyboard can type Devanagari, or it is clear that it cannot
8. XC-01-08 — To check Marathi handwriting is saved exactly: every stroke comes back after a reload _(added 2026-10-05: covers AC4)_

### XC-02 — Dates and times

**User story:** As a teacher, I want dates and times to be right around midnight, month ends and wrong clocks, so that attendance and homework dates are correct.

**Acceptance criteria:**

- AC1: The header date changes at midnight without a reload
- AC2: Attendance "today" and homework due dates follow the calendar correctly
- AC3: A wrong computer clock does not break sign-in or saving

1. XC-02-01 — Edge: to check the header date changes at midnight while the app is open
2. XC-02-02 — Edge: to check Attendance taken just before midnight is recorded for that day, and the register shows Pending again after midnight
3. XC-02-03 — Edge: to check homework set on the last day of a month with "Due in 3 days" shows the right date in the next month
4. XC-02-04 — Negative: to check a computer clock 1 hour or 1 day wrong does not stop sign-in, token renewal or autosave
5. XC-02-05 — Edge: to check Whiteboard History times match the real save times

### XC-03 — Different teachers and school data

**User story:** As any kind of teacher, I want the app to work for my classes and data, so that it works for a class teacher, a subject teacher, a new teacher and a busy one alike.

**Acceptance criteria:**

- AC1: Class-teacher-only features appear only for class teachers
- AC2: A teacher with one class, many classes or no data can use the app
- AC3: Unusual data (no topics, no resources, very long names) is handled

1. XC-03-01 — To check Attendance appears in Magnet only for classes where the teacher is the class teacher _(seen: 74125 has it on 10A/11A, not 12A)_
2. XC-03-02 — To check a teacher with one class can switch topics and use every feature
3. XC-03-03 — Performance: to check a teacher with 10+ classes and subjects gets a usable class window and quick switching
4. XC-03-04 — Negative: to check a subject with no chapters, and a topic with no resources, show clear empty messages
5. XC-03-05 — Edge: to check very long chapter, topic and resource names are shortened neatly everywhere they appear
6. XC-03-06 — To check test or junk topics in the curriculum (e.g. "dddd", "Testing - New Topic Added" in 12A Physics chapter 1) are reported to content owners _(data finding, seen 2026-09-30)_

### XC-04 — Readable on a classroom panel

**User story:** As a teacher, I want writing and screens to be readable from the back of the classroom in either theme, so that every student can see.

**Acceptance criteria:**

- AC1: Every pen colour is visible on every background in both themes
- AC2: Switching theme never makes existing writing invisible
- AC3: Main controls can be used with the keyboard

1. XC-04-01 — To check every pen colour shows clearly on each background in dark mode
2. XC-04-02 — Negative: to check writing done in white on the dark board is still visible after switching to light mode (and black on light after switching to dark)
3. XC-04-03 — To check the sign-in form and main dialogs can be used with the keyboard alone (Tab, Enter, Escape)
4. XC-04-04 — To check text on buttons and messages is readable at 1366×768 and on a 4K panel

### XC-05 — Messages teachers see

**User story:** As a teacher, I want every message to be in plain language and tell me what to do, so that I am never confused by an error.

**Acceptance criteria:**

- AC1: No raw codes, debug text or technical errors are shown to teachers
- AC2: Every failure (network, server, AI service) shows a message that says what happened and what to do
- AC3: Success messages appear only when the action really succeeded

1. XC-05-01 — Negative: to check the autosave message does not show debug text _(seen: "Saving whiteboard E:10652 / N:264 s in 8s")_
2. XC-05-02 — Negative: to check a server error (500) in each module (Notice, Homework, Attendance, Library, AI Assist, Create) shows a plain message, not a blank panel or endless spinner
3. XC-05-03 — Negative: to check AI Assist that fails to load shows a message _(seen: AI Assist not loading at all, RES-05-01/15)_
4. XC-05-04 — Negative: to check no success message appears for an action that failed, in every module that shows one
5. XC-05-05 — To check a feature not available on this server (Learning Shorts screen capture on plain http) says so, instead of failing silently
