# 00 — End-to-End Flows

How every part of CEP v2 should work from start to finish, the way teachers, students, principals and school admins
really use it. Users do not follow one fixed path: they reach a feature from any screen, in any order, and leave it
half way. So each story follows one feature through its whole life — every way in, using it, where its result shows
up elsewhere, whether it is kept (reload, sign out, another device) — and names the places where it can break.

The module stories (01–22) check each screen in detail; these flows check that the screens work together.

Where something leaves CEP (notices, homework, shorts, shared resources), the teacher receives it in the Crystal
project. Those hand-off cases are marked _Hand-off_ and are completed when the Crystal details are shared.

### FLOW-01 — From Guest Mode to the teacher's own board

**User story:** As a teacher who walks up to a classroom panel, I want to use the board straight away and then sign
in, so that I can start teaching before or after signing in.

**Acceptance criteria:**

- AC1: Guest Mode works fully without signing in
- AC2: Signing in from Guest Mode opens the teacher's own class and board
- AC3: Guest writing and the teacher's saved boards never mix

1. FLOW-01-01 — To check the panel opens in Guest Mode with a usable board, toolbar and header
2. FLOW-01-02 — To check writing, a shape and a widget work in Guest Mode
3. FLOW-01-03 — To check Sign In opens from Guest Mode and signs the teacher in
4. FLOW-01-04 — To check after sign-in the teacher's last class and topic open with their saved board
5. FLOW-01-05 — Negative: to check guest writing does not appear on the teacher's saved board
6. FLOW-01-06 — To check signing out returns to Guest Mode with an empty guest board
7. FLOW-01-07 — Negative: to check the teacher's board is not visible in Guest Mode after sign out

### FLOW-02 — A new teacher's first day (Admin to classroom)

**User story:** As a new teacher, I want the account the school admin made for me to work the first time I sign in,
so that I can teach from day one.

**Acceptance criteria:**

- AC1: A teacher created in Admin can sign in on the panel
- AC2: The first sign-in forces a new password, then a PIN, then the welcome and class choice
- AC3: The teacher lands on a board for a class they teach

_Uses only a teacher the automation creates in Admin ("AutoQA <date-time>")._

1. FLOW-02-01 — To check a teacher created in Admin appears in the teacher list as ACTIVE
2. FLOW-02-02 — To check the new teacher can sign in on the panel after the school syncs
3. FLOW-02-03 — To check the first sign-in with the default password asks for a new password
4. FLOW-02-04 — Negative: to check the new password cannot be the default password
5. FLOW-02-05 — To check a PIN is set up after the new password
6. FLOW-02-06 — To check the welcome screen lets the teacher choose a class
7. FLOW-02-07 — To check the chosen class shows the subjects given in Admin
8. FLOW-02-08 — To check the next sign-in goes straight to the board with the PIN (no first-time steps again)

### FLOW-03 — Signing in and out on a shared classroom panel

**User story:** As one of several teachers who use the same panel, I want to sign in quickly, stay signed in while I
teach and leave nothing behind for the next teacher, so that every lesson starts with my own work.

**Acceptance criteria:**

- AC1: PIN and password sign-in both work
- AC2: The session stays alive while the teacher works and warns before ending when idle
- AC3: The next teacher sees only their own classes and boards

1. FLOW-03-01 — To check signing in with user name and PIN opens Teach Mode
2. FLOW-03-02 — To check signing in with user name and password opens Teach Mode
3. FLOW-03-03 — Negative: to check a wrong PIN or password shows a message and does not sign in
4. FLOW-03-04 — To check a teacher who keeps working is not signed out after the session time
5. FLOW-03-05 — To check an idle teacher sees the Sign Out / Continue message, and Continue keeps the session
6. FLOW-03-06 — To check an idle teacher who does not answer is signed out, and their writing is saved
7. FLOW-03-07 — To check a second teacher signing in on the same panel sees their own class and board
8. FLOW-03-08 — Negative: to check the second teacher sees nothing of the first teacher's board, notices or resources
9. FLOW-03-09 — To check the first teacher signing in again finds their work as they left it

### FLOW-04 — Getting to the lesson

**User story:** As a teacher, I want to reach today's class, chapter and topic from wherever I am, so that the right
board and resources are ready.

**Acceptance criteria:**

- AC1: Class, chapter and topic can be changed from any screen
- AC2: The board, playlist and lesson plan always belong to the chosen topic
- AC3: The last topic is restored after sign-in, on any device

1. FLOW-04-01 — To check changing the class shows that class's subjects and chapters
2. FLOW-04-02 — To check searching a chapter by name finds it
3. FLOW-04-03 — To check choosing a topic opens its board, playlist and lesson plan
4. FLOW-04-04 — To check the board, playlist and lesson plan change together when the topic changes
5. FLOW-04-05 — To check signing out and in again opens the last topic
6. FLOW-04-06 — To check the last topic is restored when the teacher signs in on another device
7. FLOW-04-07 — Negative: to check switching class fast several times ends on the last chosen class with its own board
8. FLOW-04-08 — Negative: to check switching class while a player, notice or recorder is open does not lose work or leave the old panel open
9. FLOW-04-09 — To check every class lists its chapters in order, with topic numbers that match the chapter
10. FLOW-04-10 — Negative: to check no test or placeholder chapters and topics (e.g. "dddd", "Test New Chapter Added") are shown to teachers

### FLOW-05 — Teaching on the whiteboard

**User story:** As a teacher, I want to write, draw and arrange my lesson on the board with every tool, so that what I
teach is on the board exactly as I made it, every time I come back.

**Acceptance criteria:**

- AC1: Every toolbar tool works and its result shows on the board
- AC2: Everything on the board is saved and comes back the same after reload, sign out and on another device
- AC3: Undo, Redo, Eraser and Clear are saved exactly as seen

_Writing happens in fresh space below the teacher's content; teacher boards are never cleared._

1. FLOW-05-01 — To check the board saved earlier for the topic is shown, unchanged
2. FLOW-05-02 — To check pen writing in a chosen colour and size shows on the board
3. FLOW-05-03 — To check a shape and a symbol can be drawn, selected and moved
4. FLOW-05-04 — To check a text box keeps its typed text, including Hindi and Marathi
5. FLOW-05-05 — To check the eraser removes only what it passes over
6. FLOW-05-06 — To check Undo and Redo step back and forward through the changes
7. FLOW-05-07 — To check changing the background keeps the writing on top
8. FLOW-05-08 — To check the right-click menu actions (copy, delete, order) work on a board object
9. FLOW-05-09 — To check zoom and pan move the view without changing the content
10. FLOW-05-10 — To check everything added is still there after a reload
11. FLOW-05-11 — To check everything added is still there after sign out and sign in
12. FLOW-05-12 — To check the same board shows on another device for the same teacher
13. FLOW-05-13 — Negative: to check writing done in the last seconds before leaving the board is not lost
14. FLOW-05-14 — Negative: to check an undone stroke does not come back after a reload
15. FLOW-05-15 — To check Whiteboard History shows earlier versions of the board
16. FLOW-05-16 — To check the board can be saved to the Playlist and as a PDF, and the saved copy matches the board

### FLOW-06 — Widgets and the Magnet menu

**User story:** As a teacher, I want to bring widgets and Magnet tools onto the board while I teach, so that I can
explain with timers, calculators and other aids without leaving the board.

**Acceptance criteria:**

- AC1: Every widget opens, works and closes
- AC2: Widgets and Magnet tools do not change or hide the writing
- AC3: The board is the same after they are closed

1. FLOW-06-01 — To check each widget opens from the toolbar on the board
2. FLOW-06-02 — To check each widget does its job (e.g. the timer counts, the calculator calculates)
3. FLOW-06-03 — To check a widget can be moved and closed
4. FLOW-06-04 — To check each Magnet tool opens and works on the board
5. FLOW-06-05 — Negative: to check the writing under a widget is unchanged after the widget is closed
6. FLOW-06-06 — Negative: to check a widget left open does not stay on screen after the class or topic changes

### FLOW-07 — Using the lesson's resources from the Playlist

**User story:** As a teacher, I want to open any resource in the topic's playlist, use it, annotate on it and go back
to my board, so that resources and board work as one lesson.

**Acceptance criteria:**

- AC1: Every asset type opens in its player and can be used
- AC2: Annotations on an asset are kept when it is opened again
- AC3: Closing a player returns to the board as it was

1. FLOW-07-01 — To check the playlist lists the topic's resources
2. FLOW-07-02 — To check a video plays, pauses and seeks
3. FLOW-07-03 — To check an ebook opens and pages can be turned
4. FLOW-07-04 — To check a PDF worksheet opens and can be written on
5. FLOW-07-05 — To check an image opens and can be zoomed
6. FLOW-07-06 — To check a web link opens
7. FLOW-07-07 — To check flashcards open and turn
8. FLOW-07-08 — To check annotations on an asset are there when the asset is opened again
9. FLOW-07-09 — To check closing a player returns to the board with its content
10. FLOW-07-10 — To check Pin keeps a resource at hand and Contents jumps to the right part
11. FLOW-07-11 — To check the Playlist filter shows only the chosen resource types
12. FLOW-07-12 — Negative: to check double-clicking a resource opens it once
13. FLOW-07-13 — Negative: to check a file the player cannot show gives a clear message, not a blank screen

### FLOW-08 — A quiz in class

**User story:** As a teacher, I want the class to attempt a quiz from the playlist and see the results, so that I
know what the class understood.

**Acceptance criteria:**

- AC1: The quiz opens on the first question and every question can be answered
- AC2: Submit shows the result, and the answers can be reviewed
- AC3: A quiz made in Plan Mode can be attempted the same way

1. FLOW-08-01 — To check a quiz opens in the quiz player on the first question
2. FLOW-08-02 — To check each question type can be answered and changed
3. FLOW-08-03 — To check moving between questions keeps the answers
4. FLOW-08-04 — To check submitting shows the result screen
5. FLOW-08-05 — To check the review shows each answer as right or wrong with the correct answer
6. FLOW-08-06 — Negative: to check submitting with unanswered questions warns the teacher first
7. FLOW-08-07 — Negative: to check closing the quiz half way and opening it again does not show the wrong state
8. FLOW-08-08 — To check a quiz made in Plan Mode opens and is attempted the same way

### FLOW-09 — Adding the teacher's own resources

**User story:** As a teacher, I want to add my own material from my files, the Library, the Gallery or AI Assist, so
that my playlist has everything I need.

**Acceptance criteria:**

- AC1: A resource added any way appears in the topic's playlist and opens
- AC2: It can be edited and removed, and is then gone everywhere
- AC3: Bad files are refused with a clear message

1. FLOW-09-01 — To check a resource created in Add Resource appears in the playlist and opens
2. FLOW-09-02 — To check an uploaded file (PDF, image, video, document) appears in the playlist and opens
3. FLOW-09-03 — To check a resource added from the Library appears in the playlist
4. FLOW-09-04 — To check an image added from the Gallery appears in the playlist
5. FLOW-09-05 — To check AI Assist creates a resource that appears in the playlist
6. FLOW-09-06 — To check an added resource is still in the playlist after sign out and sign in
7. FLOW-09-07 — To check editing a resource's title shows the new title in the playlist
8. FLOW-09-08 — To check removing a resource takes it out of the playlist, and Reset brings back the original playlist
9. FLOW-09-09 — Negative: to check a file that is too large or of the wrong type is refused with a message
10. FLOW-09-10 — Negative: to check a resource added to one topic does not appear in another topic

### FLOW-10 — Sending a file from a phone with DropIt

**User story:** As a teacher, I want to send a photo or file from my phone to the panel, so that I can show students
something I prepared outside school.

**Acceptance criteria:**

- AC1: DropIt shows how to connect a phone
- AC2: A file sent from the phone appears on the panel and can be added to the playlist
- AC3: A bad file is refused with a message

1. FLOW-10-01 — To check DropIt opens with the code or link to connect a phone
2. FLOW-10-02 — To check a photo sent from the phone appears on the panel
3. FLOW-10-03 — To check a PDF sent from the phone appears on the panel
4. FLOW-10-04 — To check a received file can be added to the playlist and opens from there
5. FLOW-10-05 — Negative: to check a file of the wrong type or size is refused with a message on the phone
6. FLOW-10-06 — Negative: to check a file sent to one teacher's panel does not appear for another teacher

### FLOW-11 — Sharing a resource

**User story:** As a teacher, I want to share a resource from its card, so that students or other teachers get it.

**Acceptance criteria:**

- AC1: Share is offered on resource cards and shows who it can go to
- AC2: A shared resource reaches the people chosen

1. FLOW-11-01 — To check Share opens from a resource card
2. FLOW-11-02 — To check the teacher can choose who to share with and send
3. FLOW-11-03 — Negative: to check sending with nobody chosen is not possible
4. FLOW-11-04 — _Hand-off:_ to check the shared resource is received in Crystal _(not applicable: Crystal hand-off — waits for the Crystal project details)_
### FLOW-12 — Planning a quiz in Plan Mode and using it in class

**User story:** As a teacher, I want to build a quiz in Plan Mode from the Question Bank or my own questions, so that it
is ready in the classroom.

**Acceptance criteria:**

- AC1: Plan Mode opens for the teacher's class and topic, and Teach Mode is one switch away
- AC2: A quiz made from the Question Bank or new questions is saved in the topic
- AC3: The quiz shows in Teach Mode and can be attempted

1. FLOW-12-01 — To check switching to Plan Mode opens planning for the same class and topic
2. FLOW-12-02 — To check the Question Bank lists the topic's questions and can be filtered
3. FLOW-12-03 — To check a new question created by the teacher is saved in the Question Bank
4. FLOW-12-04 — To check a quiz made from chosen questions is saved in the topic
5. FLOW-12-05 — To check switching back to Teach Mode shows the new quiz in the playlist
6. FLOW-12-06 — To check the class can attempt the new quiz (FLOW-08)
7. FLOW-12-07 — Negative: to check a quiz with no questions cannot be saved
8. FLOW-12-08 — To check the quiz can be removed and is then gone from Teach Mode

### FLOW-13 — A Revision Test or Checkpoint with the class

**User story:** As a teacher, I want to run a test where every student answers on their own device, follow their
progress and see the scores, so that I know who needs help.

**Acceptance criteria:**

- AC1: The test is created in Plan Mode and launched from Teach Mode
- AC2: Students sign in on the test site, answer and submit
- AC3: The teacher sees progress live and ends the test
- AC4: Scores are correct for the teacher, the student and the principal

1. FLOW-13-01 — To check a Revision Test created in Plan Mode is ready to launch in Teach Mode
2. FLOW-13-02 — To check launching shows the code students need to join
3. FLOW-13-03 — To check a student signs in on the test site with the code and sees the questions
4. FLOW-13-04 — To check the teacher sees each student's progress as they answer
5. FLOW-13-05 — To check ending the test stops students from answering
6. FLOW-13-06 — To check each student's score is correct for their answers
7. FLOW-13-07 — To check the same scores show in the teacher's results and the principal's report
8. FLOW-13-08 — To check a test run on paper accepts each student's marks and shows them in the report
9. FLOW-13-09 — Negative: to check a student with a wrong code cannot join
10. FLOW-13-10 — Negative: to check a student who loses the network mid-test can continue with their answers kept
11. FLOW-13-11 — Negative: to check the test ends on its own when the time runs out and keeps the answers given

### FLOW-14 — Content Library and Code Editor in Plan Mode

**User story:** As a teacher, I want to browse ready content and try code in Plan Mode, so that I can prepare richer
lessons.

**Acceptance criteria:**

- AC1: The Content Library opens and its content can be previewed and added to a topic
- AC2: The Code Editor runs code and shows the output

1. FLOW-14-01 — To check the Content Library lists content for the class and subject
2. FLOW-14-02 — To check content can be previewed
3. FLOW-14-03 — To check content added to a topic shows in that topic's playlist in Teach Mode
4. FLOW-14-04 — To check the Code Editor runs a small program and shows its output
5. FLOW-14-05 — Negative: to check code with an error shows the error, not a blank output

### FLOW-15 — Reports: what happened in class reaches the principal and the admin

**User story:** As a principal or school admin, I want reports that show what teachers and classes really did, so that
I can trust them for decisions.

**Acceptance criteria:**

- AC1: Tests, attendance and usage done in class show in the principal's reports
- AC2: Usage shows in the Admin daily and monthly reports
- AC3: Numbers agree across reports

1. FLOW-15-01 — To check the principal sees the test the teacher ran, with each student's score
2. FLOW-15-02 — To check the principal's band view puts each student in the right band
3. FLOW-15-03 — To check the teacher's usage today shows in the Admin daily report
4. FLOW-15-04 — To check the month's usage shows in the Admin monthly report
5. FLOW-15-05 — To check attendance submitted in class shows in the reports
6. FLOW-15-06 — Negative: to check the same number (students, terminals, tests) is the same on every report that shows it

### FLOW-16 — An AI notice from the board to the classes

**User story:** As a teacher, I want to turn what I wrote on the board into a notice and send it to my classes, so
that students and parents get it without retyping.

**Acceptance criteria:**

- AC1: Text captured from the board appears in the notice
- AC2: The notice can be edited and sent to chosen classes
- AC3: Leaving without sending sends nothing

1. FLOW-16-01 — To check capturing a part of the board puts its text into the notice
2. FLOW-16-02 — To check the AI-written notice can be edited
3. FLOW-16-03 — To check one or more classes can be chosen
4. FLOW-16-04 — To check sending shows a confirmation
5. FLOW-16-05 — Negative: to check sending with no class chosen is not possible
6. FLOW-16-06 — Negative: to check closing the composer without sending sends nothing
7. FLOW-16-07 — Negative: to check a network failure while sending shows a message and does not send twice
8. FLOW-16-08 — _Hand-off:_ to check the notice is received in Crystal _(not applicable: Crystal hand-off — waits for the Crystal project details)_
9. FLOW-16-09 — To check Hindi and Marathi text captured from the board appears in the notice as written
10. FLOW-16-10 — To check the paraphrase, translate and grammar tools are visible and change the notice text
11. FLOW-16-11 — To check "Share with" ticks the class the teacher is in, and no other class

### FLOW-17 — AI Homework from building to assigning

**User story:** As a teacher, I want AI to build homework for the topic, review it and assign it, so that homework is
set in minutes.

**Acceptance criteria:**

- AC1: Type and number of questions can be chosen and questions are generated for the topic
- AC2: Questions can be reviewed and changed before assigning
- AC3: Homework is assigned to the chosen classes

1. FLOW-17-01 — To check the homework builder opens for the current topic
2. FLOW-17-02 — To check the chosen type and number of questions are generated
3. FLOW-17-03 — To check the generated questions belong to the topic
4. FLOW-17-04 — To check a question can be changed or removed before assigning
5. FLOW-17-05 — To check homework can be assigned to chosen classes with a due date
6. FLOW-17-06 — Negative: to check assigning with no class chosen is not possible
7. FLOW-17-07 — Negative: to check an AI or network failure shows a message and keeps what was built
8. FLOW-17-08 — _Hand-off:_ to check the homework is received in Crystal _(not applicable: Crystal hand-off — waits for the Crystal project details)_
9. FLOW-17-09 — To check homework can be generated in every class and subject the teacher teaches, or the builder says plainly that the subject is not supported
10. FLOW-17-10 — To check the chapter in the homework builder is the chapter of the topic the teacher is on

### FLOW-18 — Learning Shorts from recording to sharing

**User story:** As a teacher, I want to record a short explanation, describe it and share it, so that students can
watch it again later.

**Acceptance criteria:**

- AC1: The recorder records the board with sound
- AC2: The short gets a title and details and is shared
- AC3: Shorts can be watched and reused

1. FLOW-18-01 — To check the recorder opens and starts recording
2. FLOW-18-02 — To check stopping shows a preview of the recording
3. FLOW-18-03 — To check title and details can be filled in and the short shared
4. FLOW-18-04 — To check the shared short is listed and plays
5. FLOW-18-05 — To check a short can be reused in a lesson
6. FLOW-18-06 — Negative: to check leaving the recorder without saving asks before discarding
7. FLOW-18-07 — Negative: to check a network failure while sharing keeps the recording
8. FLOW-18-08 — _Hand-off:_ to check the short is received in Crystal _(not applicable: Crystal hand-off — waits for the Crystal project details)_
9. FLOW-18-09 — Negative: to check that when recording is not possible, the teacher is told before recording, not after

### FLOW-19 — Taking attendance

**User story:** As a teacher, I want to mark who is present, submit and correct it, so that the school has the right
attendance every day.

**Acceptance criteria:**

- AC1: The register shows the class roster
- AC2: Attendance can be marked by hand or by roll call, submitted and edited
- AC3: The submitted attendance is kept and shows in reports
- AC4: The school's cut-off time from Admin is respected

1. FLOW-19-01 — To check the register lists every student of the class
2. FLOW-19-02 — To check students can be marked present or absent, and all at once
3. FLOW-19-03 — To check Play Attendance (roll call) marks students one by one
4. FLOW-19-04 — To check submitting saves the attendance and shows a confirmation
5. FLOW-19-05 — To check the submitted attendance shows the same when opened again
6. FLOW-19-06 — To check a submitted attendance can be edited and the change is kept
7. FLOW-19-07 — To check attendance shows in the reports (FLOW-15)
8. FLOW-19-08 — Negative: to check leaving before submitting warns that nothing was saved
9. FLOW-19-09 — Negative: to check attendance after the cut-off time set in Admin behaves as the school set it _(not applicable: expected result undefined: the Admin attendance cut-off has no stated unit (Admin F-21))_
10. FLOW-19-10 — Negative: to check a network failure while submitting shows a message and does not lose the marks
11. FLOW-19-11 — To check Attendance opens its register in every class whose Magnet menu lists it, or says why it cannot
12. FLOW-19-12 — Negative: to check a submitted, locked day shows who was present and absent (never an empty locked register)
13. FLOW-19-13 — _Hand-off:_ to check a change made in the Teacher application shows in the panel's register _(not applicable: Crystal hand-off — waits for the Crystal project details)_
### FLOW-20 — The teacher's profile changes how ClassEdge works for them

**User story:** As a teacher, I want my profile choices to take effect everywhere, so that ClassEdge fits how I teach.

**Acceptance criteria:**

- AC1: Preferred resource types change what the playlist shows
- AC2: Teaching subjects change the classes and subjects offered
- AC3: A new password and PIN work at the next sign-in

_Password and PIN are changed only on the disposable account._

1. FLOW-20-01 — To check the profile shows the teacher's details
2. FLOW-20-02 — To check changing preferred resource types changes the playlist
3. FLOW-20-03 — To check changing teaching subjects changes the subjects offered in class navigation
4. FLOW-20-04 — To check a changed password signs in, and the old one does not
5. FLOW-20-05 — To check a changed PIN signs in, and the old one does not
6. FLOW-20-06 — Negative: to check a new password that breaks the rules is refused with a message

### FLOW-21 — Header, modes and the Compass

**User story:** As a teacher, I want the header controls to work from any screen, so that I can switch mode, move the
toolbar or sign out without losing my place.

**Acceptance criteria:**

- AC1: Switching Teach ↔ Plan keeps the class and topic
- AC2: The toolbar can be moved to either side
- AC3: The Compass opens Explore It and Analyse It

1. FLOW-21-01 — To check the header shows logo, build version, date and time
2. FLOW-21-02 — To check switching to Plan Mode and back keeps the class, topic and board
3. FLOW-21-03 — To check moving the toolbar to the other side keeps it there after a reload
4. FLOW-21-04 — To check Compass opens Explore It and Analyse It and closes back to the board
5. FLOW-21-05 — To check the theme and Virtual Keyboard settings work across screens
6. FLOW-21-06 — To check Sign Out from the header asks first and signs out on confirm

### FLOW-22 — Moving around a big board with the Minimap

**User story:** As a teacher with a long board, I want the Minimap to show where I am and take me anywhere on it, so
that I can go back to earlier writing quickly.

**Acceptance criteria:**

- AC1: The Minimap shows the whole board and the current view
- AC2: Clicking or dragging in the Minimap moves the board there

1. FLOW-22-01 — To check the Minimap opens and shows the board's content
2. FLOW-22-02 — To check the Minimap marks the current view
3. FLOW-22-03 — To check clicking in the Minimap moves the board to that place
4. FLOW-22-04 — To check the Minimap follows when the board is panned or zoomed
5. FLOW-22-05 — Negative: to check the Minimap does not cover other panels or stay open after the topic changes

### FLOW-23 — The school admin looks after teachers

**User story:** As a school admin, I want to create teachers, reset their sign-in, extend their access and sync, so
that every teacher can use ClassEdge without waiting for support.

**Acceptance criteria:**

- AC1: A created teacher can sign in on the panel
- AC2: Reset PIN and Reset Password take effect on the panel
- AC3: Extending the expiry date lets the teacher keep signing in; an expired teacher cannot
- AC4: Sync finishes for every part without failing or stopping midway

_Uses only the teacher the automation creates; real teachers are never changed. Adding a terminal stays manual._

1. FLOW-23-01 — To check the admin signs in with school name, user ID and password and sees the Dashboard
2. FLOW-23-02 — To check a new teacher is created and shows ACTIVE in the list
3. FLOW-23-03 — To check after Reset PIN the teacher must set a new PIN on the panel, and the old PIN fails
4. FLOW-23-04 — To check after Reset Password the new password signs in and the old one fails
5. FLOW-23-05 — To check extending the expiry date saves and Edit shows the new date
6. FLOW-23-06 — Negative: to check a teacher whose expiry date has passed cannot sign in and is not shown as ACTIVE
7. FLOW-23-07 — To check setting a teacher In Active stops them signing in
8. FLOW-23-08 — To check every change shows in Version History with date and admin name
9. FLOW-23-09 — To check Sync completes: every part ends as completed and Last Sync On updates
10. FLOW-23-10 — Negative: to check no sync part shows Failed or stays in progress for more than 10 minutes
11. FLOW-23-11 — To check exported teachers match the list, including the new teacher and the new expiry date

### FLOW-24 — School settings from Admin show in the classroom

**User story:** As a school admin, I want the school's grades, subjects, classes, days and logo set in Admin to be what
teachers see, so that the school is set up once, correctly.

**Acceptance criteria:**

- AC1: Grades, subjects and class structure in Admin match what teachers see
- AC2: School days, timing and attendance cut-off apply in the classroom
- AC3: Counts agree between Admin screens and what users see

1. FLOW-24-01 — To check the grades in Admin are the grades teachers can choose
2. FLOW-24-02 — To check a class's subjects in Admin are the subjects the teacher sees for that class
3. FLOW-24-03 — To check the number of students in a class in Admin matches the attendance register
4. FLOW-24-04 — To check the attendance cut-off in Admin is the one the register uses _(not applicable: expected result undefined: the Admin attendance cut-off has no stated unit (Admin F-21))_
5. FLOW-24-05 — To check the licence end date and active modules in Admin match the features teachers can use
6. FLOW-24-06 — Negative: to check the counts of teachers, classes and terminals agree across Admin screens

### FLOW-25 — Any feature, in any order

**User story:** As a teacher, I want to jump between features in whatever order the lesson needs, so that nothing I
was doing is lost or left broken.

**Acceptance criteria:**

- AC1: Opening one feature while another is open never loses work
- AC2: The board and the open feature are both correct afterwards

1. FLOW-25-01 — Negative: to check opening a playlist asset while writing keeps the writing
2. FLOW-25-02 — Negative: to check switching to Plan Mode with a player open and back keeps the board
3. FLOW-25-03 — Negative: to check opening attendance in the middle of a quiz keeps the quiz answers
4. FLOW-25-04 — Negative: to check opening AI Notices while the recorder runs keeps the recording or warns first
5. FLOW-25-05 — Negative: to check changing class with a notice or homework half written warns before discarding
6. FLOW-25-06 — Negative: to check signing out with a player, widget or composer open saves the board and closes them
7. FLOW-25-07 — Negative: to check using Undo after closing a player undoes board writing only

### FLOW-26 — When things go wrong in the middle of a flow

**User story:** As a teacher, I want ClassEdge to recover when the network, the session or the client fails in the
middle of my work, so that I never lose what I did.

**Acceptance criteria:**

- AC1: Work in progress is kept or clearly reported when something fails
- AC2: The teacher can continue where they stopped

1. FLOW-26-01 — Interruption: to check writing done while the network is down is saved when it comes back
2. FLOW-26-02 — Interruption: to check a session that ends mid-lesson keeps the writing and the next sign-in shows it
3. FLOW-26-03 — Interruption: to check closing the client mid-lesson and starting it again restores the class, topic and board
4. FLOW-26-04 — Interruption: to check the client recovering from a crash restores the teacher's work
5. FLOW-26-05 — Interruption: to check a server error while opening a resource shows a message and the board still works
6. FLOW-26-06 — Interruption: to check the same teacher on two devices ends with the same board on both

### FLOW-27 — The desktop client from install to update

**User story:** As a school, I want the ClassEdge client to install, start, update and close cleanly on every classroom
panel, so that teachers never wait for IT.

**Acceptance criteria:**

- AC1: The client starts and loads the school's ClassEdge
- AC2: Settings (server, volume, screen) are kept
- AC3: A new build is picked up without losing teacher data

1. FLOW-27-01 — To check the client starts and opens ClassEdge for the school's server
2. FLOW-27-02 — To check the client's settings are kept after it is closed and started again
3. FLOW-27-03 — To check the client fills the panel or projector screen correctly
4. FLOW-27-04 — To check a new build is shown after the update and the teacher's boards are unchanged
5. FLOW-27-05 — To check closing the client signs nothing out unexpectedly and loses no writing
6. FLOW-27-06 — To check the client and a browser show the same class, topic and board for the same teacher
