# 19 — Desktop client (Tata ClassEdge School, Windows)

Covers the Windows desktop client itself, around the web app it shows: installing and starting it, the server setting,
its window on classroom panels and projectors, closing it, updates, and the devices it uses (camera, microphone,
touch, pen). Module code: `CLI`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a **test
case**. Added 2026-09-30: until now the client was only the place the other modules ran, and nothing tested the client
itself. Many cases here are manual (installing, hardware, second screens).

### CLI-01 — Install and start the client

**User story:** As a school IT person, I want to install the client and point it at our server, so that teachers can start using it on the classroom panels.

**Acceptance criteria:**

- AC1: The installer installs the client with a working shortcut
- AC2: The first start opens the board in Guest Mode on the configured server
- AC3: A wrong or unreachable server gives a clear message that says what to fix

1. CLI-01-01 — (manual) To check the installer installs the client and creates a Start menu / desktop shortcut that opens it
2. CLI-01-02 — To check the first start opens the whiteboard in Guest Mode on the server set in `tce_settings.json`
3. CLI-01-03 — Negative: to check a wrong server address in the settings shows a clear message ("Unable to connect ClassEdge server" / "No web URLs available") that says what to fix, not a blank window
4. CLI-01-04 — Negative: to check starting the client with no network shows a clear message and recovers once the network is back, without a restart
5. CLI-01-05 — Performance: to check the time from starting the client to a usable board is recorded (compare with the browser)
6. CLI-01-06 — Edge: to check starting the client twice (double-clicking the shortcut again) does not open two copies that fight over one session
7. CLI-01-07 — To check the client opens its single profile's link itself, with its client settings attached (`tceclient=1`, `webdrop`, `erasersize`, `gesturemode`) _(checked by the test fixture on every launch since 2026-09-30)_
8. CLI-01-08 — Negative: to check a settings file with two profiles shows the profile chooser, and the teacher can pick one _(the automation itself always runs with exactly one profile)_

### CLI-02 — The client window on panels and projectors

**User story:** As a teacher, I want the client window to fit the classroom panel or projector, so that the whole board and toolbar are always visible.

**Acceptance criteria:**

- AC1: Full screen, minimise and restore keep the lesson as it was
- AC2: The layout works at the usual screen sizes and Windows scaling
- AC3: Moving the window to a second screen or projector keeps it usable

1. CLI-02-01 — To check minimising and restoring the client keeps the topic, board and open panels as they were
2. CLI-02-02 — To check full screen and leaving full screen keep everything visible and working
3. CLI-02-03 — To check the layout at 1920×1080, 3840×2160 (4K panel) and 1366×768 (laptop): toolbar, Playlist and header all reachable, nothing cut off
4. CLI-02-04 — To check the layout at Windows scaling 100%, 125% and 150%
5. CLI-02-05 — (manual) To check dragging the client to a second screen or projector keeps writing in the right place under the pen
6. CLI-02-06 — Edge: to check resizing the window while writing does not move or distort the writing

### CLI-03 — Closing the client

**User story:** As a teacher, I want closing the client to be safe, so that I don't lose work or leave my account open.

**Acceptance criteria:**

- AC1: Closing with unsaved writing saves it first or warns
- AC2: Closing signs the teacher out (by design) and the next start is clean
- AC3: Closing with a player, an upload or a Magnet panel open leaves nothing broken

1. CLI-03-01 — Negative: to check closing the client with writing still in the save countdown saves it first or warns _(losing it is WB-08-04)_
2. CLI-03-02 — To check reopening after a close starts signed out, on Guest Mode _(LOG-01-14)_
3. CLI-03-03 — Interruption: to check closing during an upload leaves no half-created resource
4. CLI-03-04 — Interruption: to check closing with a video playing and a notice composer open, the next start is clean and usable

### CLI-04 — Updates to a new build

**User story:** As a school, I want new builds to arrive without losing teachers' work, so that updating is safe during the school year.

**Acceptance criteria:**

- AC1: After the server is updated, the client shows the new version
- AC2: Boards, Playlists, preferences, recent classes and the last topic are unchanged by the update
- AC3: A teacher who is signed in during the update keeps their work and is told if they must sign in again

1. CLI-04-01 — To check that after a server update the header and User menu show the new build number _(seen 30 Sep: v0.0.232 → v0.0.236)_
2. CLI-04-02 — Regression: to check boards have the same stroke count after the update as before it (compare Whiteboard History)
3. CLI-04-03 — Regression: to check Playlists (order, own resources), preferred resource types, subjects and recent classes are unchanged after the update
4. CLI-04-04 — Interruption: to check a teacher writing while the update is deployed keeps the writing and is told what happened _(see RSL-03-01/02)_
5. CLI-04-05 — Negative: to check an old client with a new server (or the reverse) shows a clear message if they don't work together

### CLI-05 — Client and browser behave the same

**User story:** As a teacher, I want the same features to work in the client as in a browser, so that it doesn't matter where I open ClassEdge.

**Acceptance criteria:**

- AC1: Every feature available in the browser works in the client
- AC2: Where the client differs (downloads, file pickers, permissions), it behaves sensibly

1. CLI-05-01 — To check a file picker (Create, Gallery) opens and returns the chosen file in the client
2. CLI-05-02 — To check Download on an unsupported file saves it and tells the teacher where
3. CLI-05-03 — To check "Watch on YouTube" and other external links open in the default browser from the client
4. CLI-05-04 — To check Learning Shorts can record the screen in the client even though the server is plain http _(the browser cannot: no screen capture on http)_
5. CLI-05-05 — Performance: to check the client is not much slower than the browser for sign-in, topic switch and opening a board _(measured: about 2× slower, report/CLIENT_VS_BROWSER_TIMING.md)_

### CLI-06 — Camera, microphone, touch and pen

**User story:** As a teacher, I want the client to use the panel's camera, microphone, touch screen and pen properly, so that quizzes, recordings and writing work in class.

**Acceptance criteria:**

- AC1: The quiz finds the camera, and Learning Shorts finds the microphone
- AC2: Refusing or missing a device gives a clear message
- AC3: Touch, stylus and the stylus eraser end work as on a whiteboard _(finger gestures are not supported: owner 2026-09-30)_

1. CLI-06-01 — (manual) To check the quiz opens the panel camera
2. CLI-06-02 — Negative (manual): to check a panel with no camera shows a clear message when a quiz is opened, not a frozen quiz
3. CLI-06-03 — (manual) To check Learning Shorts records the microphone
4. CLI-06-04 — (manual) To check the stylus writes and the stylus's eraser end erases _(stylus eraser not erasing: WB-10-10)_
5. CLI-06-05 — (manual) To check unplugging the camera during a quiz shows a message and the quiz can continue or close cleanly
