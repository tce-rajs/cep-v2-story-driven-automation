# 08 — Playlist

Covers opening assets from Playlist, Ebook access specifically, the Resource List, the
Playlist menu (Edit/Reset/Filter), Navigation, and Pin. Module code: `PL`. Each
`### <ID> — <Title>` is a **story**; each numbered line under it is a **test case**
belonging to that story.

### PL-01 — Open assets from Playlist

**User story:** As a teacher, I want to open any resource from the Playlist, so that I can show it to the class.

**Acceptance criteria:**

- AC1: PDF, quiz, video and other assets open
- AC2: The Playlist lists every added asset
- AC3: Opening several in a row works
- AC4: A broken asset shows an error
- AC5: Closing an asset returns to the unchanged board

Assets = PDF, Quiz, Video, and other resource types added to the playlist (Ebook is
covered separately in PL-02, since it has its own navigation behavior).

1. PL-01-01 — To check opening a PDF asset from Playlist loads it correctly
2. PL-01-02 — To check opening a Quiz asset from Playlist loads it correctly
3. PL-01-03 — To check opening a Video asset from Playlist loads it correctly
4. PL-01-04 — To check the Playlist always shows the assets that have been added to it — it isn't empty when assets exist
5. PL-01-05 — To check the user can open multiple assets in sequence from the Playlist without one interfering with the next
6. PL-01-06 — Negative: to check attempting to open an asset that failed to load or is corrupted shows an error, not a silent failure
7. PL-01-07 — To check closing an opened asset returns to the board with the board unchanged

### PL-02 — Open & navigate Ebook (from Playlist)

**User story:** As a teacher, I want to open and navigate the ebook from the Playlist, so that I can teach from the textbook.

**Acceptance criteria:**

- AC1: The ebook opens
- AC2: Chapters, pages, contents and linked resources work
- AC3: Jumping and scrolling always land on the chapter chosen

1. PL-02-01 — To check opening an ebook from Playlist loads it correctly
2. PL-02-02 — To check navigating chapters/pages within the opened ebook works correctly
3. PL-02-03 — To check the ebook's contents panel opens and closes correctly
4. PL-02-04 — Regression: to check jumping between ebook chapters (forward, to the end, back to the start) always lands on the chapter chosen — CEP v1's recurring ebook navigation weak spot
5. PL-02-05 — To check the ebook's linked-resources panel opens and closes correctly
6. PL-02-06 — Regression: to check scrolling through an ebook keeps one chapter selected and causes no error
7. PL-02-07 — Negative: to check closing the ebook leaves no blank panel and returns to the board

### PL-03 — Resource List

**User story:** As a teacher, I want the resource list to stay usable around open players, so that I can keep moving through the lesson.

**Acceptance criteria:**

- AC1: Controls stay visible after closing a preview
- AC2: The list does not overlap a split-screen quiz

1. PL-03-01 — Regression: to check the Playlist strip/Contents/Add-Resource controls don't become invisible after closing a resource preview (one test per preview type: PDF, video, image, web link)
2. PL-03-02 — To check the resource list doesn't overlap a split-screen quiz panel

### PL-04 — Playlist Menu (Edit / Reset / Filter)

**User story:** As a teacher, I want to edit, reset and filter my Playlist, so that it shows the resources I need in the order I want.

**Acceptance criteria:**

- AC1: Edit saves changes and finishing without changes changes nothing
- AC2: Reset asks first and Cancel changes nothing
- AC3: Type filters show only the ticked types, with a message when nothing is ticked
- AC4: The filter resets on a new topic

1. PL-04-01 — To check editing the playlist saves changes correctly
2. PL-04-02 — To check resetting the playlist reverts it to the expected state
3. PL-04-03 — To check filtering the playlist shows only matching resources
4. PL-04-04 — Negative: to check that unticking every resource type shows an empty-state message ("No resources found!"), not a blank panel
5. PL-04-05 — To check unticking the main Filter Resources box hides every resource card
6. PL-04-06 — To check unticking one resource type hides only cards of that type
7. PL-04-07 — To check the filter goes back to showing everything after switching topic
8. PL-04-08 — To check Reset asks for confirmation first
9. PL-04-09 — To check entering Edit and finishing without changes leaves the Playlist exactly as it was
10. PL-04-10 — Edge: to check turning every filter off and on 3 times quickly ends with every card showing
11. PL-04-11 — To check ticking Filter Resources again brings every card back
12. PL-04-12 — To check cancelling Reset changes nothing
13. PL-04-13 — Interruption: to check Reset while the network is down shows a message and changes nothing

### PL-05 — Navigation

**User story:** As a teacher, I want the Playlist to follow the topic I am on, so that I always see the right resources.

**Acceptance criteria:**

- AC1: Fast topic switching never mixes resources
- AC2: A reload shows the same resources
- AC3: Plan Mode resources appear in Teach Mode (manual)

1. PL-05-01 — Regression: to check switching topics/chapters rapidly, several times, before the previous one finishes loading doesn't corrupt Playlist state
2. PL-05-02 — Regression: to check a custom chapter/topic/resource created in Plan Mode appears correctly in Teach Mode Playlist, and vice versa _(not applicable: would add custom chapters/topics to the live school curriculum — manual check on a test school)_
3. PL-05-03 — To check the Playlist shows the same resources after the app reloads
4. PL-05-04 — Negative: to check switching topic never shows the previous topic's resources in the strip

### PL-06 — Pin

**User story:** As a teacher, I want to pin the Playlist strip open, so that it stays visible while I teach.

**Acceptance criteria:**

- AC1: The pin icon keeps the strip shown while I draw or open a player
- AC2: Unpinning lets the strip hide again

1. PL-06-01 — To check the pin icon keeps the Playlist strip shown while the teacher draws or opens a player
2. PL-06-02 — To check unpinning lets the Playlist strip hide again
3. PL-06-03 — Edge: to check pinning multiple resources keeps them all fixed at the top in a consistent order _(not applicable: there is no per-card pin in the app; the test skips)_
4. PL-06-04 — Negative: to check unpinning never hides a card that is being opened

### PL-07 — Playlist strip

**User story:** As a teacher, I want the Playlist strip to show E-Books, Contents and resource cards clearly, so that I can find a resource at a glance.

**Acceptance criteria:**

- AC1: E-Books and Contents tiles show, Contents with the current topic
- AC2: Each card has its type icon
- AC3: Arrows scroll a long strip, even with 20+ cards

1. PL-07-01 — To check the strip shows the E-Books tile
2. PL-07-02 — To check the Contents tile shows the current chapter and topic
3. PL-07-03 — To check the arrows scroll the strip when there are more cards than fit
4. PL-07-04 — Edge: to check a topic with 20 or more resources keeps the strip usable
5. PL-07-05 — To check the strip shows the Contents tile
6. PL-07-06 — To check the strip shows the resource cards, each card with its type icon
7. PL-07-07 — Negative: to check no card shows a missing (broken) type icon or an empty title

### PL-08 — Contents (table of contents)

**User story:** As a teacher, I want Contents to list chapters and topics and let me search them, so that I can jump to any topic.

**Acceptance criteria:**

- AC1: Contents opens with the current topic highlighted
- AC2: Choosing a topic makes it current and reloads the Playlist
- AC3: Search ignores case, Cancel restores the list, no match shows a message

1. PL-08-01 — To check Contents opens the chapter and topic list
2. PL-08-02 — To check choosing a topic from Contents changes the current topic
3. PL-08-03 — To check searching Contents finds topics regardless of letter case
4. PL-08-04 — To check Cancel brings back the full list after a search
5. PL-08-05 — Negative: to check a search with no matches shows a message, not a blank panel _(improvement: empty search results show a message)_
6. PL-08-06 — Edge: to check a very long search is handled without error
7. PL-08-07 — To check the current topic is highlighted in Contents
8. PL-08-08 — To check choosing a topic from Contents reloads the Playlist for that topic
9. PL-08-09 — Negative: to check a Contents search with no match shows a message and Cancel restores the full list

### PL-09 — Manage resources in the Playlist

**User story:** As a teacher, I want to remove, reorder and edit my own resources, so that the Playlist fits my lesson.

**Acceptance criteria:**

- AC1: Remove asks for confirmation
- AC2: Dragged order is kept after a reload
- AC3: Edit appears only on my own resources and saving confirms
- AC4: Adding an existing resource does not duplicate it confusingly

1. PL-09-01 — To check removing a resource asks for confirmation before it disappears
2. PL-09-02 — To check a new order made by dragging cards is kept after the app reloads
3. PL-09-03 — To check Edit in a card's menu appears only on resources the teacher created
4. PL-09-04 — Regression: to check saving changes to a teacher-created resource shows the right success message
5. PL-09-05 — Edge: to check adding a resource that's already in the Playlist doesn't create a confusing duplicate
6. PL-09-06 — Interruption: to check removing a resource while the network is down shows a message, and the card is still there after a reload
7. PL-09-07 — Interruption: to check a drag reorder made while the network is down is either saved once the network is back or clearly reported as not saved
8. PL-09-08 — Negative: to check cancelling Remove keeps the resource in the Playlist

### PL-10 — Multiple clicks and fast actions on the Playlist
**User story:** As a teacher, I want double clicks and fast actions on the Playlist to act once, so that I don't remove or open the wrong thing.

**Acceptance criteria:**

- AC1: A double confirm removes only one resource
- AC2: Fast arrow clicks reach both ends without losing cards
- AC3: Fast Edit toggling ends in normal mode with every card

1. PL-10-01 — Regression/Negative: to check double-clicking Remove's confirm button removes only the chosen resource, not the next one as well
2. PL-10-02 — Edge: to check fast clicks on the strip's right arrow reach the last card and never leave the strip blank
3. PL-10-03 — Edge: to check double-clicking a topic in Contents opens that topic, and the current-topic label shows it
4. PL-10-04 — Edge: to check toggling Edit mode on and off five times fast leaves the Playlist in normal mode
5. PL-10-05 — Edge: to check after scrolling to the end, fast clicks on the strip's left arrow come back to the first card
6. PL-10-06 — Edge: to check fast scrolling to both ends of the strip loses or duplicates no card
7. PL-10-07 — Edge: to check after double-clicking a topic in Contents, the Contents window is closed and not reopened
8. PL-10-08 — Edge: to check toggling Edit mode on and off five times fast loses or duplicates no card
9. PL-10-09 — Edge: to check after toggling Edit mode on and off five times fast, cards still open normally
10. PL-10-10 — Negative: to check a double click on a card opens only one player

### PL-11 — Share a resource from its card
**User story:** As a teacher, I want to share a resource I added with my other classes, so that I don't upload it twice.

**Acceptance criteria:**

- AC1: Only my own resources show a share icon
- AC2: The icon opens the share options without opening the resource
- AC3: Cancel shares nothing; sharing adds it to the chosen class

Cards for resources the teacher added (images, handouts, test assets) carry a
share icon in the corner; built-in resources do not.

1. PL-11-01 — To check a resource the teacher added shows the share icon on its card, and built-in resources do not
2. PL-11-02 — To check the share icon opens the share options (which classes to share with) without opening the resource
3. PL-11-03 — To check cancelling the share options shares nothing
4. PL-11-04 — To check a resource shared with another class appears in that class's Playlist
5. PL-11-05 — To check a resource created with Share off (RES-01-20) shows it as not shared
6. PL-11-06 — Negative: to check a resource that is not mine shows no share icon
