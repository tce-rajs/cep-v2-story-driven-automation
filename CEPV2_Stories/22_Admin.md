# 22 — Admin panel

Covers the school Admin panel (`<server>/admin/`, "TATA ClassEdge Admin"): signing in, the dashboard, school settings
(grades, subjects, subject types, terminals, miscellaneous), the school's details, sync and usage reports, managing
teachers and the class structure, and that what the admin sees matches what teachers, students and the principal see.
Module code: `ADM`. Each `### <ID> — <Title>` is a **story**; each numbered line under it is a **test case** belonging
to that story.

`ADMIN_*` account (`support.admin`). The school is live and shared: tests only read, open forms and close them without
saving. Anything that saves, deletes, resets, imports or syncs is marked _(not applicable: needs a disposable school)_.

This file holds the **core** cases (main positive and main negative paths). Edge-case ideas for the later deep phase
are in report/exploration/admin-stories.md.

### ADM-01 — Sign in and sign out

**User story:** As a school admin, I want to sign in with my school, user ID and password and sign out when done, so
that only I can manage the school.

**Acceptance criteria:**

- AC1: Correct school name, user ID and password open the Dashboard
- AC2: Wrong or missing details are refused with a clear message
- AC3: Sign Out ends the session and Back does not return to the panel
- AC4: Admin pages are not shown without signing in

1. ADM-01-01 — To check signing in with the school name, user ID and password opens the Dashboard
2. ADM-01-02 — To check the header shows the signed-in admin's name after sign-in
3. ADM-01-03 — Negative: to check Sign In stays disabled while any of the three fields is empty
4. ADM-01-04 — Negative: to check an unknown school name shows "Incorrect Org Id or User Id or Password"
5. ADM-01-05 — Negative: to check an unknown user ID shows "Incorrect Org Id or User Id or Password"
6. ADM-01-06 — Negative: to check a wrong password shows "Incorrect Org Id or User Id or Password" _(not applicable: needs a disposable school — repeated wrong passwords may lock the shared admin account)_
7. ADM-01-07 — Negative: to check a teacher's credentials do not open the Admin panel
8. ADM-01-08 — To check Sign Out returns to the sign-in box
9. ADM-01-09 — Negative: to check pressing Back after Sign Out does not show any admin page
10. ADM-01-10 — Negative: to check opening the admin URL in a new browser without signing in shows the sign-in box
11. ADM-01-11 — Regression: to check reloading the page keeps the admin signed in
12. ADM-01-12 — To check the user menu shows the admin build number

### ADM-02 — Dashboard overview

**User story:** As a school admin, I want an overview of my school, so that I can confirm the board, curriculum and
terminals at a glance.

**Acceptance criteria:**

- AC1: Overview shows the school, board and curriculum the school bought
- AC2: Terminal numbers are shown and labelled
- AC3: OVERVIEW and MANAGE switch views

1. ADM-02-01 — To check OVERVIEW shows the school name "C P Goenka International School"
2. ADM-02-02 — To check OVERVIEW shows board "CBSE"
3. ADM-02-03 — To check OVERVIEW shows the curriculum "CBSE_CE Crystal Sales Curriculum"
4. ADM-02-04 — To check OVERVIEW shows the classroom terminal allowance that View School shows
5. ADM-02-05 — To check OVERVIEW shows the teacher terminal allowance that View School shows
6. ADM-02-06 — To check MANAGE shows the three Quick Action tiles: Manage School, Manage Teacher, Academic Details
7. ADM-02-07 — Regression: to check the Quick Action tiles show only their titles, without internal names such as "manage-school"
8. ADM-02-08 — To check School Settings opens the School Settings window on School Grades

### ADM-03 — School details and licence

**User story:** As the customer, I want to see my school's account details, modules and licence end date, so that I
know what was bought and until when.

**Acceptance criteria:**

- AC1: The school list shows the school with curriculum, state and last sync time
- AC2: View School shows the account details, active modules and end date
- AC3: Search finds the school by name

1. ADM-03-01 — To check Manage School lists "C P Goenka International School" with curriculum, state and Last Sync On
2. ADM-03-02 — To check searching the school list by part of the name finds the school
3. ADM-03-03 — Negative: to check searching the school list for a name that does not exist shows an empty list
4. ADM-03-04 — To check the row menu offers View School, Settings, Sync, View Sync Status, View Daily Report and View Monthly Report
5. ADM-03-05 — To check View School shows the school's name, address, state, city and pincode
6. ADM-03-06 — To check View School shows the active modules ClassEdge, Widgets(S) Gold, Student Test, Attendance and EarlyEdge
7. ADM-03-07 — To check View School shows the licence end date 04-05-2027
8. ADM-03-08 — To check closing View School returns to the school list with nothing changed
9. ADM-03-09 — To check Settings from the row menu opens the same School Settings window as the Dashboard button

### ADM-04 — School grades

**User story:** As a school admin, I want to see and maintain the school's grades, so that classes match the school.

**Acceptance criteria:**

- AC1: All grades are listed in school order with category, divisions and order number
- AC2: Paging shows every grade once
- AC3: Adding/editing/deleting a grade validates input and asks before deleting

1. ADM-04-01 — To check School Grades lists all 16 grades across its pages, each once
2. ADM-04-02 — To check every grade row shows grade name, ClassEdge grade, category, number of divisions and order number
3. ADM-04-03 — Regression: to check all 10 rows of a page are visible without a hidden inner scroll
4. ADM-04-04 — To check grades are listed in school order (Nursery, Junior KG, Senior KG, Class 1 … Class 12)
5. ADM-04-05 — To check the number of divisions of each grade matches the divisions shown in Academic Details
6. ADM-04-06 — To check Add New Grade opens a form, and closing it adds nothing
7. ADM-04-07 — Negative: to check Add New Grade refuses an empty grade name with a message _(not applicable: needs a disposable school if the form saves on submit)_
8. ADM-04-08 — To check adding a grade "AutoTest Grade" lists it, and deleting it removes it _(not applicable: needs a disposable school)_
9. ADM-04-09 — To check deleting a grade asks for confirmation first _(not applicable: needs a disposable school)_

### ADM-05 — Subjects per grade

**User story:** As a school admin, I want to see and set which subjects each grade has, so that teachers get the
right books.

**Acceptance criteria:**

- AC1: Each grade shows its subjects
- AC2: The subjects match what teachers see for that grade
- AC3: Adding/removing a subject is confirmed and reversible

1. ADM-05-01 — To check School Subjects lists every grade with its subjects
2. ADM-05-02 — To check Class 10 lists the 13 subjects raj.shinde sees for 10A in Teach Mode
3. ADM-05-03 — To check the subject dropdown of a grade offers only subjects not already chosen
4. ADM-05-04 — To check removing a subject from a grade asks for confirmation first _(not applicable: needs a disposable school)_
5. ADM-05-05 — To check a subject added to a grade appears in Teach Mode for that grade's classes _(not applicable: needs a disposable school)_

### ADM-06 — Subject types

**User story:** As a school admin, I want to mark each subject as Core, Language, Optional or Co-Curricular, so that
reports group subjects correctly.

**Acceptance criteria:**

- AC1: Every school subject is listed with its type
- AC2: The type can be chosen from the four types

1. ADM-06-01 — Regression: to check Subject Settings lists all the school's subjects (35), not an empty table
2. ADM-06-02 — To check each subject shows its current type ("Not Assigned" when none is set)
3. ADM-06-03 — To check the type choices are Core Subject, Language Subject, Optional Subject and Co-Curricular Subject
4. ADM-06-04 — To check a changed subject type is still shown after closing and reopening School Settings _(not applicable: needs a disposable school)_

### ADM-07 — Terminals

**User story:** As a school admin, I want to see and register the school's classroom and teacher terminals, so that
only the school's panels can be used and the licence count is respected.

**Acceptance criteria:**

- AC1: Terminals are listed with type, IP and location, with paging and search
- AC2: The allotted totals are shown
- AC3: Adding beyond the allowance or a wrong IP is refused

1. ADM-07-01 — To check Terminal Settings lists each terminal with type, IP and location
2. ADM-07-02 — To check paging shows all terminals (6) across the pages, each once
3. ADM-07-03 — To check the line "Total allotted classroom Terminal: 10 and Teacher Terminal: 1" matches View School
4. ADM-07-04 — To check searching by an existing terminal IP shows only that terminal
5. ADM-07-05 — Negative: to check searching for an IP that is not registered shows an empty list
6. ADM-07-06 — To check the download button saves a file listing the same terminals as the screen
7. ADM-07-07 — To check the location info icon shows the terminal's details
8. ADM-07-08 — Negative: to check adding a terminal with an invalid IP (e.g. "999.1.1") is refused with a message _(not applicable: needs a disposable school)_
9. ADM-07-09 — Negative: to check adding more classroom terminals than the allowance is refused _(not applicable: needs a disposable school)_
10. ADM-07-10 — To check deleting a terminal asks for confirmation first _(not applicable: needs a disposable school)_

### ADM-08 — School days, timing, attendance cut-off and logo

**User story:** As a school admin, I want to set school days, timings, breaks, the attendance cut-off and the school
logo, so that the product follows the school's day.

**Acceptance criteria:**

- AC1: Saved settings are shown when the tab is opened
- AC2: Times are validated (end after start, period within the day)
- AC3: The logo upload accepts images only

1. ADM-08-01 — To check Miscellaneous Settings shows the saved school days, start time, end time and period duration
2. ADM-08-02 — To check the attendance cut-off list offers values 1 to 10 and says what unit they are in
3. ADM-08-03 — Negative: to check an end time earlier than the start time is refused with a message _(not applicable: needs a disposable school)_
4. ADM-08-04 — Negative: to check a non-image file is refused by the logo upload _(not applicable: needs a disposable school)_
5. ADM-08-05 — To check saved settings are still shown after closing and reopening School Settings _(not applicable: needs a disposable school)_

### ADM-09 — Teacher list, search and filter

**User story:** As a school admin, I want to find any teacher or principal quickly, so that I can help them.

**Acceptance criteria:**

- AC1: The list shows every user with name, username, status and login status, and a correct count
- AC2: Search by name finds matching users and shows an empty list when none match
- AC3: The role and status filter shows only matching users

1. ADM-09-01 — To check Teacher's List shows every user (13) with full name, username, teacher status and login status
2. ADM-09-02 — To check "Records Found" equals the number of rows listed
3. ADM-09-03 — To check typing part of a first name (e.g. "raj") lists only matching users (Raj Shinde, Raj test)
4. ADM-09-04 — To check typing part of a last name (e.g. "Shinde") lists only Raj Shinde
5. ADM-09-05 — To check search ignores upper and lower case
6. ADM-09-06 — Negative: to check a search with no match shows an empty list and "Records Found: 0"
7. ADM-09-07 — Negative: to check a search after a previous search shows only the new results, not the previous ones
8. ADM-09-08 — To check pasting a name into Search filters the list like typing it
9. ADM-09-09 — To check clearing Search shows all users again
10. ADM-09-10 — To check filter Principal shows only principals (satyajit.p, sushant.mokal, namita.shetty)
11. ADM-09-11 — To check filter Teacher shows only teachers (10)
12. ADM-09-12 — To check filter Supervisor with no supervisors shows an empty list
13. ADM-09-13 — To check filter InActive shows only inactive users
14. ADM-09-14 — To check a user whose expiry date has passed is not shown as ACTIVE
15. ADM-09-15 — To check the row menu offers Edit, Reset Password, Reset PIN and Version History

### ADM-10 — Create a teacher

**User story:** As a school admin, I want to create a teacher account, so that a new teacher can start using ClassEdge.

**Acceptance criteria:**

- AC1: Mandatory fields are marked and Next/Submit stay disabled until they are valid
- AC2: Invalid email and phone are refused with a message
- AC3: The user name is built from the names and is valid
- AC4: A created teacher can sign in

_Core flow (owner). Every run creates its own teacher ("AutoQA <date-time>"); real teachers are never changed._

1. ADM-10-01 — To check Create Teacher opens "Create User" on step 1 (User Details)
2. ADM-10-02 — To check Next stays disabled while a mandatory field (title, first name, last name, email, contact number) is empty
3. ADM-10-03 — Negative: to check an invalid email shows "Invalid Email ID."
4. ADM-10-04 — Negative: to check letters in the contact number show "Invalid mobile number."
5. ADM-10-05 — To check valid details enable Next and open step 2 (User Login Details)
6. ADM-10-06 — To check step 2 suggests a user name built from first and last name
7. ADM-10-07 — Negative: to check a user name with spaces, Hindi letters or emoji is refused with a message
8. ADM-10-08 — Negative: to check a first name longer than the allowed length is refused
9. ADM-10-09 — To check Previous returns to step 1 with the entered details kept
10. ADM-10-10 — To check closing the window without Submit creates no user (Records Found unchanged)
11. ADM-10-11 — Negative: to check Submit without an expiry date is refused with a message
12. ADM-10-12 — Negative: to check creating a user name that already exists is refused
13. ADM-10-13 — To check a created teacher appears in the list and can sign in on the panel
14. ADM-10-14 — To check a created teacher can sign in to Teach Mode with the new user name and password
15. ADM-10-15 — To check a created teacher shows ACTIVE / ACTIVE in the teacher list
16. ADM-10-16 — To check Records Found goes up by one after a teacher is created

### ADM-11 — Edit a teacher, reset password/PIN, history

**User story:** As a school admin, I want to correct a teacher's details, reset a forgotten password or PIN and see
what changed, so that teachers are never locked out.

**Acceptance criteria:**

- AC1: Edit shows the teacher's saved details
- AC2: Resets ask for confirmation and take effect
- AC3: Version History lists the changes with date and who made them
- AC4: Extending a user's expiry date saves and lets the user keep signing in

_Core flow (owner). Resets, edits and expiry changes run only on the teacher the automation created (ADM-10)._

1. ADM-11-01 — To check Edit opens "Edit User: <title> <name>" with the saved name, email, contact number, user name, role and expiry date
2. ADM-11-02 — To check the Subjects field of a teacher shows no empty entries
3. ADM-11-03 — To check closing Edit without saving leaves the teacher unchanged
4. ADM-11-04 — To check Version History lists the user's changes with version, operation, date and user
5. ADM-11-05 — To check Version History's Close returns to the list
6. ADM-11-06 — To check Reset Password asks for confirmation before resetting
7. ADM-11-07 — To check after Reset PIN the teacher is asked to set a new PIN on the panel
8. ADM-11-08 — To check setting a user In Active stops them signing in on the panel
9. ADM-11-09 — To check an edited name shows in Teach Mode after the teacher signs in again
10. ADM-11-10 — To check after Reset Password the teacher signs in with the new password
11. ADM-11-11 — Negative: to check after Reset Password the old password no longer signs in
12. ADM-11-12 — Negative: to check after Reset PIN the old PIN no longer signs in
13. ADM-11-13 — To check extending a user's expiry date saves and Edit shows the new date
14. ADM-11-14 — To check the exported teacher file shows the extended expiry date
15. ADM-11-15 — To check a user whose expiry was extended can still sign in to Teach Mode
16. ADM-11-16 — Negative: to check an expiry date in the past cannot be saved
17. ADM-11-17 — To check Version History lists the reset and the expiry change with date and admin name

### ADM-12 — Import and export teachers

**User story:** As a school admin, I want to export the teacher list and import many teachers from a file, so that I
can set up or audit the school quickly.

**Acceptance criteria:**

- AC1: Export downloads a file with every user shown in the list
- AC2: The sample file can be downloaded
- AC3: A wrong file is refused with a clear message

1. ADM-12-01 — To check Export Teacher downloads a CSV with one row per user in the list (13)
2. ADM-12-02 — To check the export's names, usernames, roles and statuses match the list
3. ADM-12-03 — To check the export's subject column has no empty entries
4. ADM-12-04 — To check Import Teacher opens a window with file chooser, Download Sample CSV, Close and Import
5. ADM-12-05 — To check Download Sample CSV downloads the sample file
6. ADM-12-06 — Negative: to check Import with no file chosen shows a message and imports nothing
7. ADM-12-07 — Negative: to check importing a file that is not CSV is refused _(not applicable: needs a disposable school)_
8. ADM-12-08 — To check importing the sample file with one "AutoTest" teacher adds that teacher _(not applicable: needs a disposable school)_

### ADM-13 — Class structure and class details

**User story:** As a school admin, I want to see every class and division with its subjects, books and teachers, so
that I can check the timetable is covered.

**Acceptance criteria:**

- AC1: All grades and divisions of the academic year are listed under their section
- AC2: A division shows its allocated subjects, books, teachers and students
- AC3: The back arrow returns to All Classes

1. ADM-13-01 — To check All Classes shows the class structure for the current academic year
2. ADM-13-02 — To check every grade in School Grades appears in All Classes
3. ADM-13-03 — To check grades are grouped under their section (Pre-primary, Primary, Secondary, Higher Secondary), none under "Unknown"
4. ADM-13-04 — To check opening Class 10 – Division A shows its subjects with book and teacher
5. ADM-13-05 — To check Class 10 – Division A lists the same subjects raj.shinde sees for 10A in Teach Mode
6. ADM-13-06 — To check the Teachers count of Class 10 – Division A matches the teachers listed
7. ADM-13-07 — To check the class page shows the number of students in 10A (30)
8. ADM-13-08 — To check the back arrow returns to All Classes
9. ADM-13-09 — To check Master Structure opens and shows the structure of the school

### ADM-14 — Sync status

**User story:** As a school admin, I want to know the school's data is in sync with ClassEdge, so that content and
users are up to date.

**Acceptance criteria:**

- AC1: Sync status lists each part with its status
- AC2: Last Sync On is shown
- AC3: A Sync finishes for every part; no part fails or stops midway

_Core flow (owner): press Sync and watch it to the end._

1. ADM-14-01 — To check View Sync Status lists every sync part with its status
2. ADM-14-02 — To check Refresh in View Sync Status reloads the statuses
3. ADM-14-03 — To check the school list shows a Last Sync On date and time that is not in the future
4. ADM-14-04 — To check Sync updates Last Sync On
5. ADM-14-05 — To check after Sync every part in View Sync Status ends as completed
6. ADM-14-06 — Negative: to check after Sync no part shows Failed or an error
7. ADM-14-07 — Negative: to check no part stays in progress for more than 10 minutes after Sync (sync stopped midway)
8. ADM-14-08 — To check the overall status matches the parts (completed only when every part is completed)
9. ADM-14-09 — To check a teacher created in Admin can sign in on the panel after the Sync completes

### ADM-15 — Daily usage report

**User story:** As a school admin or customer, I want to see who used ClassEdge today and for how long, so that I can
follow adoption.

**Acceptance criteria:**

- AC1: The report shows totals, a timeline per user and per classroom, and hours per user
- AC2: Every row is named and durations are readable
- AC3: The download has the same data

1. ADM-15-01 — To check View Daily Report opens on today's date with User wise selected
2. ADM-15-02 — To check the totals line shows Total users, Eligible users, Current users, Installed Classrooms and Current Classrooms
3. ADM-15-03 — To check every user row has a name (no "-")
4. ADM-15-04 — To check durations are shown as hours:minutes with two-digit minutes (e.g. 2:09 hrs)
5. ADM-15-05 — To check Classroom wise lists every registered terminal by location and IP
6. ADM-15-06 — To check Download Report downloads an Excel file for the chosen date
7. ADM-15-07 — To check the downloaded report has the same users as the screen
8. ADM-15-08 — To check Refresh reloads the data
9. ADM-15-09 — To check Back closes the report

### ADM-16 — Monthly usage report

**User story:** As a customer, I want a monthly usage report, so that I can see whether the school uses what it bought.

**Acceptance criteria:**

- AC1: A month can be chosen and the report shows that month
- AC2: All six tabs show data with readable labels
- AC3: The report can be downloaded

1. ADM-16-01 — To check View Monthly Report shows the latest month by default
2. ADM-16-02 — To check choosing another month updates the report month shown
3. ADM-16-03 — To check the school summary shows location, content coverage, assets available and terminals
4. ADM-16-04 — To check each tab (Monthly Usage Trend, Daily Usage Trend, Feature & Contribution Index, User wise Trends, Capacity Utilization, Content Usage) opens with a chart
5. ADM-16-05 — To check Daily Usage Trend shows only the days of the chosen month (30 for September)
6. ADM-16-06 — To check User wise Trends lists only school users (not the support admin)
7. ADM-16-07 — To check User wise Trends labels do not overlap
8. ADM-16-08 — To check Capacity Utilization lists the school's classroom terminals
9. ADM-16-09 — To check Download saves the monthly report
10. ADM-16-10 — To check no internal names (e.g. "logDay", "Cquiz", "Tp") are shown

### ADM-17 — Build version

**User story:** As a support engineer, I want to see the version of every part of the server, so that I can report problems
precisely.

**Acceptance criteria:**

- AC1: Build Version lists every service with version and update date

1. ADM-17-01 — To check Build Version lists each service with type, version and update date
2. ADM-17-02 — To check dates in Build Version use one format
3. ADM-17-03 — To check the admin build in the user menu matches the CE-Admin row in Build Version

### ADM-18 — Admin data matches what users see

**User story:** As the customer, I want the admin panel to agree with what teachers, students and the principal see,
so that I can trust every number.

**Acceptance criteria:**

- AC1: Users, classes, subjects, students and terminals agree across admin, Teach Mode and principal reports

1. ADM-18-01 — To check the number of users in the Teacher's List equals "Total users" on the principal's dashboard
2. ADM-18-02 — To check the number of users in the Teacher's List equals "Total users" in the Daily Report
3. ADM-18-03 — To check "Registered Users" in the Monthly report equals the number of school users in the Teacher's List
4. ADM-18-04 — To check the subjects of Class 10 in School Subjects equal the subjects raj.shinde sees for 10A
5. ADM-18-05 — To check the classes in Academic Details equal the classes teachers can choose in Teach Mode
6. ADM-18-06 — To check a teacher signed in on the panel today appears in the Daily Report
7. ADM-18-07 — To check the number of classroom terminals in Terminal Settings equals "Installed Classrooms" in the Daily Report
8. ADM-18-08 — To check "No. of Classroom Terminals" in the Monthly report equals the terminals in Terminal Settings
9. ADM-18-09 — To check a principal in the Teacher's List can open Reports & Analytics, and a teacher cannot
10. ADM-18-10 — To check the active modules in View School match the features teachers see (e.g. Attendance, Student Test)
