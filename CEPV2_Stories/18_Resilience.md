# 18 — Resilience: where the app can break or lose whiteboard data

Covers what happens when things go wrong around the teacher: the session ends, the network or server fails, the app
is closed or crashes, the same teacher uses two devices, boards grow very large, or the app is used hard for a whole
day. Module code: `RSL`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a **test case**.

Added 2026-09-30 from the long writing runs on the Ultra server (about 60,000 strokes of real handwriting on builds
v0.0.232 and v0.0.236). Cases already covered elsewhere are referenced, not repeated. **How to judge data loss:** read
the board from a second session or after signing back in, and compare stroke by stroke; Whiteboard History shows
whether a loss is on the server or only on screen. Test only on spare topics, below existing writing.

### RSL-01 — Writing survives the end of a session

**User story:** As a teacher, I want everything I write to be saved however my session ends, so that I never lose part of a lesson.

**Acceptance criteria:**

- AC1: Writing up to the forced sign-out (40-45 min) is all saved _(LOG-06-06, seen: ~10 lines lost each time)_
- AC2: Writing just before the idle popup, a quick Sign Out, or an automatic sign-out is saved
- AC3: A failed token renewal never loses writing
- AC4: The teacher is warned before the session ends

1. RSL-01-01 — Regression: writing one short line every 30 s from sign-in until the forced sign-out, every line is on the board after signing back in; the report names the first line that is missing, if any
2. RSL-01-02 — Negative: writing just before leaving the board idle, then not answering the Sign Out / Continue popup, the writing is saved after the automatic sign-out
3. RSL-01-03 — Negative: writing, then pressing the quick Sign Out button at once, the writing is saved (see also HDR-03-06)
4. RSL-01-04 — Interruption: blocking one token renewal while writing, the teacher stays signed in and nothing is lost (see LOG-06-04)
5. RSL-01-05 — To check a warning appears a few minutes before the forced sign-out (see LOG-06-07)
6. RSL-01-06 — Interruption: signing out yourself at 40 minutes, every stroke of the session is saved (control case; seen: 6 of 6 checked sessions at 100%)

### RSL-02 — Writing survives leaving the board within seconds

**User story:** As a teacher, I want the last thing I wrote to be kept even if I leave the board straight away, so that a quick move never costs me writing.

**Acceptance criteria:**

- AC1: Reload, closing the app, a crash or a power cut within 10 s of writing loses nothing (or at most what the app clearly warns about)
- AC2: Switching topic, class or mode within 10 s keeps the writing on its own board

1. RSL-02-01 — Negative: writing, then ending the client process within 10 s (as a power cut would), the writing is on the board after restarting _(reload: WB-09-09; closing: WB-08-04)_
2. RSL-02-02 — Negative: writing, then ending the client process 60 s later, everything is saved
3. RSL-02-03 — Negative: writing, then switching topic within 10 s, the writing is on the original topic and not on the new one _(class switch: WB-09-06/08)_
4. RSL-02-04 — Negative (manual, Plan Mode): writing, then switching to Planning within 10 s, the writing is kept
5. RSL-02-05 — Negative: writing, then opening a Playlist asset full-screen within 10 s, the board writing is kept
6. RSL-02-06 — Negative: writing, then Windows sleep or the panel switched off within 10 s, the writing is on the board after wake-up

### RSL-03 — Writing survives network and server failures

**User story:** As a teacher, I want the app to keep my writing through Wi-Fi drops and server restarts and to tell me what is happening, so that I can keep teaching.

**Acceptance criteria:**

- AC1: While offline or while the server is down, the app says so
- AC2: Writing done meanwhile is kept and saved once the connection is back
- AC3: Strokes are drawn normally (not joined into long lines) while the connection is failing
- AC4: Nothing is claimed as saved when it is not

1. RSL-03-01 — Interruption: the server is restarted (e.g. a new build deployed) while the teacher writes; the app shows it cannot save _(seen 30 Sep 19:23: no message)_
2. RSL-03-02 — Interruption: writing during a server restart is saved once the server is back _(seen: ~5 lines lost)_
3. RSL-03-03 — Regression: while the server is failing, each pen stroke is drawn on its own, not joined to the next by a long straight line _(seen 30 Sep: strokes joined into scribbles on screen)_
4. RSL-03-04 — Interruption: the network drops for 1 minute while writing; everything is saved after it comes back _(autosave not resuming: WB-08-16)_
5. RSL-03-05 — Interruption: the network drops for 15 minutes (longer than a token) while writing; the teacher is not silently signed out and the writing is kept
6. RSL-03-06 — Interruption: a slow network (3G speed) while writing a whole page; every stroke is saved and the pen does not lag
7. RSL-03-07 — Interruption: the network drops and comes back 5 times in 2 minutes while writing; nothing lost or duplicated
8. RSL-03-08 — Negative: the app is opened with no network at all; a clear message, not a blank or frozen screen, and the board works once the network is back
9. RSL-03-09 — Negative: during a server outage the "Saving whiteboard" message does not count down as if it will save

### RSL-04 — The same teacher on two devices

**User story:** As a teacher who moves between the classroom panel and a laptop, I want my board and Playlist to stay correct on both, so that nothing I did on one device is lost on the other.

**Acceptance criteria:**

- AC1: Writing on one device appears on the other after opening the topic
- AC2: Writing on both devices on the same topic keeps both sets of strokes
- AC3: Offline changes on one device never overwrite the other's work
- AC4: Signing in on a second device is handled as the product decides, with no writing lost

1. RSL-04-01 — Concurrency: writing on the panel, then opening the topic on the laptop shows the writing
2. RSL-04-02 — Concurrency: writing on both devices on the same topic at the same time, a reload on each shows both sets of strokes, each once
3. RSL-04-03 — Concurrency: the laptop writes offline while the panel writes online; after the laptop reconnects, both sets of strokes are kept
4. RSL-04-04 — Concurrency: signing in on a second device while writing on the first; the first device's writing is saved whatever happens to its session (record the behaviour)
5. RSL-04-05 — Concurrency: clearing the board on one device while the other is writing; the result after a reload is the same on both
6. RSL-04-06 — Concurrency: reordering the Playlist on one device and removing a card on the other; both devices show the same Playlist after a reload
7. RSL-04-07 — Concurrency: the last-opened topic after using two devices is the one used last, not an older one

### RSL-05 — Undo, erase and clear are saved exactly as seen

**User story:** As a teacher, I want what I undo, erase or clear to stay that way after a save, and a mistaken clear to be recoverable, so that the saved board always matches my screen.

**Acceptance criteria:**

- AC1: After a long Undo and an autosave, the saved board matches the screen
- AC2: Erasing inside dense writing removes only what was erased
- AC3: A mistaken Clear can be undone, or the board recovered from Whiteboard History

1. RSL-05-01 — Edge: write 200 strokes, Undo 150, wait for autosave, reload; exactly 50 strokes remain
2. RSL-05-02 — Edge: Undo 150 and Redo 150, wait for autosave, reload; all 200 strokes, each once
3. RSL-05-03 — Edge: erasing one word in the middle of a 5,000-stroke page removes only that word after a reload
4. RSL-05-04 — Negative: after a mistaken Clear Whiteboard and a reload, the board can be recovered (Undo, or a version in Whiteboard History) _(record whether any recovery exists)_
5. RSL-05-05 — Edge: after Undo straight after an autosave, a reload does not bring the undone stroke back

### RSL-06 — Heavy boards keep working

**User story:** As a teacher who writes on the same topic all year, I want a board with thousands of strokes to open and work in the desktop client and the browser, so that my notes stay usable.

**Acceptance criteria:**

- AC1: Boards of 10,000 and 20,000 strokes open in the client and the browser without crashing
- AC2: Signing in when the last topic is heavy does not crash (no crash loop)
- AC3: Writing, zoom, pan and autosave stay usable; autosave finishes within its countdown

1. RSL-06-01 — Regression: the desktop client opens a 10,000-stroke board without "Target crashed" _(CLIENT-01: crashes at 8,418, opens at 5,190)_
2. RSL-06-02 — Regression: with a heavy last topic, signing in on the client does not crash, and the teacher can reach another topic _(seen: crash on every sign-in until moved from a browser)_
3. RSL-06-03 — Performance: opening two heavy boards one after another in the browser does not crash the tab _(seen once: "Page crashed")_
4. RSL-06-04 — Performance: a board grown to 20,000 strokes still opens, and its open time is recorded (compare 1,000 / 5,000 / 10,000 / 20,000)
5. RSL-06-05 — Performance: on a 10,000-stroke board, a new line of writing is saved within one autosave countdown
6. RSL-06-06 — Performance: writing while zoomed out to 25% on a heavy board saves the strokes in the right place and size
7. RSL-06-07 — Performance: ten widgets on a 10,000-stroke board stay usable
8. RSL-06-08 — Edge: one pen stroke held down for 60 s (a long diagram line) is saved as one complete stroke

### RSL-07 — A full school day without restarting

**User story:** As a teacher, I want the app to stay fast and stable through a whole day of classes, so that I don't have to restart it between periods.

**Acceptance criteria:**

- AC1: Six periods of normal use (class switches, writing, videos, PDFs, quizzes) do not slow the app down or crash it
- AC2: Memory use stays roughly level
- AC3: Many open players and fast clicking never freeze the app

1. RSL-07-01 — Performance: a scripted 6-hour day (6 classes, each: open topic, write a page, play a video, open a PDF, run a quiz); no crash, and each step is no slower at the end than at the start
2. RSL-07-02 — Performance: the client's memory use is recorded every period; it does not keep growing
3. RSL-07-03 — Edge: a video, a PDF, an image, a web link, a quiz and a code editor open at once, each annotated; all stay usable and each keeps its own annotation
4. RSL-07-04 — Edge: double and triple clicks on every main button (Magnet items, cards, Submit, Send, class and topic) each act once _(most covered in PL-10, PLR-13, NAV-07)_

### RSL-08 — Recovering after a crash

**User story:** As a teacher, I want to get straight back to my lesson after the app crashes, so that a crash costs me as little as possible.

**Acceptance criteria:**

- AC1: The client can be restarted and signed into after a crash
- AC2: The board is intact up to the last save, and the app says if anything was not saved
- AC3: A crash never corrupts the saved board

1. RSL-08-01 — Interruption: after the client is killed mid-lesson, it restarts and the teacher can sign in _(the session is signed out by design: LOG-01-14)_
2. RSL-08-02 — Interruption: after a crash mid-autosave, the board opens with a complete earlier version (no half-saved, broken board)
3. RSL-08-03 — Negative: after a crash, the teacher is told that the last few seconds of writing may not have been saved, if so

### RSL-09 — Large and bad input does not take the app down

**User story:** As a teacher, I want very large or broken files and very long text to be refused or handled, so that one bad item never breaks my lesson.

**Acceptance criteria:**

- AC1: DropIt and Create both enforce the same file-size limit with a message
- AC2: A file that fails part-way through upload leaves no broken resource
- AC3: Very long text anywhere is handled without breaking the layout or crashing

1. RSL-09-01 — Negative: a 500 MB file sent through DropIt is refused with a size message _(seen: DropIt has no size limit)_
2. RSL-09-02 — Negative: a 2 GB video sent through DropIt does not slow down or crash the app
3. RSL-09-03 — Interruption: the network drops half-way through a 10 MB upload in Create; a clear message, no half-uploaded resource in the Playlist
4. RSL-09-04 — Interruption: the phone loses Wi-Fi half-way through a DropIt send; the teacher is told, and no broken resource appears
5. RSL-09-05 — Edge: a topic with 100 resources keeps the Playlist strip and Library usable
6. RSL-09-06 — Edge: 10,000 characters pasted into a text box, a notice body and a homework title are handled without a crash
