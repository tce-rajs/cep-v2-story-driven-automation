# 14 — Learning Shorts

Covers recording a short screen video from the whiteboard (Magnet → Learning Shorts), completing its details,
saving or sending it to classes, and watching one from the Playlist. Module code: `LS`. Each `### <ID> — <Title>` is a
**story**; each numbered line under it is a **test case** belonging to that story.

Added 2026-09-26 from the reference suite (`new approch playwright`, Learning Shorts workbook, 27 cases, and Zoho
bugs). Recording needs camera/screen permission; the suite launches with Chromium's fake media stream so it can
record without a real device. Sending is a real action (approved by the owner, 2026-09-26). A second entry point
exists: an owned Video card's overflow menu → Send opens the same composer with that video attached.

### LS-01 — Open the Learning Shorts recorder

**User story:** As a teacher, I want to open and exit the Learning Shorts recorder, so that I can record when I am ready.

**Acceptance criteria:**

- AC1: Magnet opens the recorder with Record and Exit
- AC2: Exit without recording closes it and creates nothing

1. LS-01-01 — Regression: Magnet → Learning Shorts opens the recording panel with Record and Exit controls, rather than doing nothing (Zoho CWR-I678)
2. LS-01-02 — To check Exit without recording closes the recorder panel cleanly, with no error
3. LS-01-03 — Edge: to check opening and exiting the recorder 5 times leaves one clean panel
4. LS-01-04 — To check Exit without recording opens no composer and produces no video _(split from LS-01-02, 2026-09-28)_

### LS-02 — Record a short

**User story:** As a teacher, I want to record a short of my board, so that students can watch the explanation again.

**Acceptance criteria:**

- AC1: Record shows recording in progress and Stop opens the composer
- AC2: Very short or repeated recordings are handled
- AC3: Refused permissions give a message (manual)

1. LS-02-01 — To check Record starts a recording and the panel shows that recording is in progress
2. LS-02-02 — To check stopping the recording opens the composer with the recording attached
3. LS-02-03 — Edge: to check starting and stopping several times quickly doesn't leave the recorder stuck
4. LS-02-04 — Negative: to check stopping immediately after starting (a near-empty recording) is either rejected with a clear message or saved as a playable video — never a broken attachment
5. LS-02-05 — Negative (manual-only: permission prompts are outside automation's control): to check refusing camera/screen permission shows a clear message

### LS-03 — Complete the details and share

**User story:** As a teacher, I want to title, save and send the short, so that my classes receive it.

**Acceptance criteria:**

- AC1: Save and Send need a title
- AC2: Attachment can be deleted or recaptured
- AC3: Save to Playlist, Save Revision and Send are separate and act once
- AC4: Leaving part-way warns first

1. LS-03-01 — To check Save and Send are blocked while the title is empty
2. LS-03-02 — To check Delete Attachment removes the video and Recapture attaches a new one
3. LS-03-03 — To check "Share with" lets the teacher pick one or more of their classes
4. LS-03-04 — To check Save to Playlist stores the short in the Playlist without sending it
5. LS-03-05 — To check Save Revision and Save to Playlist are separate actions (two different buttons)
6. LS-03-06 — To check Send delivers the short to the chosen classes with a success message
7. LS-03-07 — Edge: to check a very long title with emoji doesn't break the composer or the class list below it
8. LS-03-08 — Regression: clicking Save to Playlist and Save Revision in immediate succession triggers only one save
9. LS-03-09 — Negative: to check leaving the composer part-way through warns before discarding the work
10. LS-03-10 — To check Save and Send are allowed once a title is entered _(split from LS-03-01, 2026-09-28)_
11. LS-03-11 — To check Save Revision confirms what it did (Save to Playlist: LS-03-04) _(split from LS-03-05, 2026-09-28)_
12. LS-03-12 — To check the Learning Shorts composer closes after sending _(split from LS-03-06, 2026-09-28)_

### LS-04 — Watch and reuse Learning Shorts

**User story:** As a teacher, I want to watch and resend Learning Shorts from the Playlist, so that I can reuse them.

**Acceptance criteria:**

- AC1: A Learning Shorts card plays
- AC2: Send from a video card opens the composer with it attached

1. LS-04-01 — To check a Learning Shorts card in the Playlist opens a video player that plays it
2. LS-04-02 — To check Send from an owned Video card's overflow menu opens the Learning Shorts composer with that video attached

### LS-05 — Saving and sending a short when the network fails (added 2026-09-30)

**User story:** As a teacher, I want to be told when a short fails to save or send and to keep my recording, so that I can try again without recording it again.

**Acceptance criteria:**

- AC1: A failed save or send says so and shows no success message
- AC2: The composer keeps the title, classes and recording
- AC3: Trying again once the network is back saves or sends exactly once

1. LS-05-01 — Interruption: to check a failed Send tells the teacher the short was not sent, with no success message
2. LS-05-02 — Interruption: to check a failed Save to Playlist tells the teacher it was not saved, and no card appears in the Playlist
3. LS-05-03 — Interruption: to check after a failure the composer still has the title, the chosen classes and the recording
4. LS-05-04 — Interruption: to check sending again once the network is back sends the short exactly once
