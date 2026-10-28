// Module -> class / division / subject / chapter / topic map.
//
// Each entry names the place in the curriculum that holds the data a module's tests need, and the account
// (VALID_PIN, VALID_PIN_2, DATA_PIN or PLAN_PIN in .env) that data belongs to. Specs pick an entry with `test.use({ classMap: '<key>' })`;
// the `user` fixture signs in with that entry's account and opens its class and topic.
//
// An entry with `unavailable` names data this server does not have: tests using it fail with "DATA MISSING ON THIS
// SERVER" instead of a locator timeout.
//
// When a test needs data in a new place, add or update an entry here rather than hard-coding a class in the spec.

const MODULE_CLASS_MAP = {
  default: {
    label: 'Default (general-purpose fallback)',
    account: 'VALID_PIN',
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 3,
    topicIndex: 0,
    notes:
      'General-purpose class (9A Science, Chapter 4, first topic: a fresh board). The `user` fixture brings every test that names no class here first.',
  },
  scratchBoard: {
    label: 'Scratch board for Clear / Delete Whiteboard',
    account: 'VALID_PIN',
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 7,
    topicIndex: 1,
    topicLabel: '8.2',
    notes:
      'An empty topic (9A Science 8.2) reserved for the tests that clear the board: they write a little sample content, clear it, and leave the board empty. No other test writes here.',
  },
  scratchBoard2: {
    label: 'Second scratch board (must stay untouched by a clear on the first)',
    account: 'VALID_PIN',
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 8,
    topicIndex: 1,
    topicLabel: '9.2',
    notes: 'An empty topic (9A Science 9.2) used only to check that clearing one topic leaves another untouched.',
  },
  defaultAccount2: {
    label: 'Default (general-purpose fallback, second account)',
    account: 'VALID_PIN_2',
    grade: 'Class 12',
    division: 'A',
    subject: 'Computer Science',
    chapterIndex: 13,
    topicIndex: 0,
    notes: 'General-purpose class on the second account.',
  },
  whiteboardReference: {
    label: 'Whiteboard reference lesson (dedicated account)',
    account: 'VALID_PIN_2',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 5,
    notes:
      'WB-14 reference lesson: “Properties of Electric Charge” on Class 12A Physics, live topic 1.6 (Electric Field Lines, Electric Flux).',
  },
  navigationBoundary: {
    label: 'Navigation -- boundary/first-last-chapter checks',
    account: 'VALID_PIN',
    grade: 'Class 9',
    division: 'A',
    subject: 'Hindi Language',
    chapterIndex: null,
    topicIndex: null,
    notes: 'The subject with the most chapters (29), for first/last chapter and scrolling checks.',
  },
  navigationGeneral: {
    label: 'Navigation -- general cascade/state checks',
    account: 'VALID_PIN',
    grade: 'Class 5',
    division: 'A',
    subject: 'Mathematics',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'A second class, used to make a real class switch away from the default class.',
  },
  navigationAccountancy: {
    label: 'Navigation -- Accountancy-specific checks (subject list order)',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Accountancy',
    chapterIndex: 2,
    topicIndex: 0,
    notes: 'Accountancy is the first subject in the Class 11 subject list.',
  },
  attendance: {
    label: 'Attendance',
    account: 'VALID_PIN',
    grade: 'Class 10',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Magnet lists Attendance and the register has students. Submitting attendance is a real action.',
  },
  attendanceReadOnly: {
    label: 'Attendance -- a teacher who is not the class teacher (read-only register)',
    account: 'VALID_PIN_2',
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Magnet lists Attendance; the register opens with Mark All Present and Done disabled.',
  },
  attendanceNoStudents: {
    label: 'Attendance -- a class whose register lists no students for this account',
    account: 'VALID_PIN_2',
    grade: 'Class 10',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Magnet lists Attendance; the register says "No students found".',
  },
  compassBaseline: {
    label: 'Compass -- AnalyseIt ("No Homework") renders, alongside ExploreIt',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Mathematics',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Compass shows AnalyseIt ("No Homework") here.',
  },
  librarySuggestions: {
    label: 'Library -- the topic name itself returns library suggestions',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 4,
    notes: 'The Library returns suggestions for this topic name.',
  },
  libraryApostropheTopic: {
    label: 'Library -- topic name containing an apostrophe',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 4,
    notes: "A topic whose name contains an apostrophe (1.5 Coulomb's Law on this server).",
  },
  compassExploreIt: {
    label: 'Compass -- ExploreIt widgets render alongside AnalyseIt',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Mathematics',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Compass shows ExploreIt widgets alongside AnalyseIt here.',
  },
  compassNoAnalyseIt: {
    label: 'Compass -- confirmed to have ZERO AnalyseIt presence (negative case)',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 1,
    topicIndex: 0,
    notes: 'Compass shows ExploreIt only; used for the case where AnalyseIt is absent.',
  },
  compassRevisionTest: {
    label: 'Compass -- a topic with a Revision Test',
    account: 'VALID_PIN',
    grade: 'Class 10',
    division: 'A',
    subject: 'Science',
    chapterIndex: 2,
    topicIndex: 3,
    notes: 'This topic has a Revision Test (3.6 "Common Salts", chapterIndex 2 topicIndex 5, has one too).',
  },
  checkpoints: {
    label: 'Checkpoints Player',
    account: 'VALID_PIN',
    grade: 'Class 10',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    checkpointTitle: 'Test - 3',
    scoreCheckpointTitle: 'Test 4',
    // Never-launched checkpoints reserved per job; a card is matched by its title and its question count.
    timerCheckpoint: { title: 'test 2', questions: '10 Q' },
    edgeCheckpoint: { title: 'Science Baseline Assessment', questions: '74 Q' },
    paperCheckpoint: { title: 'Science Baseline Assessment', questions: '10 Q' },
    notes: 'Holds ten Checkpoint resources; "Test - 3" is the one the tests start, pause and resume.',
  },
  quiz: {
    label: 'Quiz Player',
    account: 'VALID_PIN_2',
    grade: 'Class 11',
    division: 'A',
    subject: 'Accountancy',
    chapterIndex: 2,
    topicIndex: 0,
    notes: 'Holds Quiz resources.',
  },
  codeEditor: {
    label: 'Code Editor Player',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Computer Science',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Holds a Code resource.',
  },
  playersDefault: {
    label: 'Players -- Video/Worksheet/Image/Code (shared default topic)',
    account: 'VALID_PIN_2',
    grade: 'Class 12',
    division: 'A',
    subject: 'Computer Science',
    chapterIndex: 1,
    topicIndex: 1,
    notes: 'Holds Video, Worksheet, Image, Code and Quiz resources in one topic.',
  },
  playersWeblink: {
    label: 'Players -- a Web link together with Worksheet/Image/Video (primary account)',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Holds a Web link together with Worksheet, Image and Video resources.',
  },
  playersInteractive: {
    label: 'Players -- HTML5 content: Interactivity, Keywords, Concept Map, simulations, lab, lecture note, 3D video',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 1,
    notes:
      'Holds Interactivity/Keywords/Concept Map activities, PhET simulations (John Travoltage), a lab, a lecture note and 3D videos. Open-only: never write on this board.',
  },
  playersUnsupported: {
    label: 'Players -- unsupported-file resources',
    account: 'VALID_PIN_2',
    grade: 'Class 12',
    division: 'A',
    subject: 'Computer Science',
    chapterIndex: 13,
    topicIndex: 0,
    notes: 'Holds resources of a type the players do not support.',
  },
  ebook: {
    label: 'Ebook Player',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Mathematics',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Holds an e-book resource.',
  },
  tceUnsupported: {
    label: 'TCE Player / Unsupported Player',
    account: 'VALID_PIN',
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'The tests create their own asset, so any class works.',
  },
  flashcard: {
    unavailable: 'Class 8 division R ("Foundation Checkpoint") does not exist on this server',
    label: 'Flashcard Player',
    account: 'VALID_PIN',
    grade: 'Class 8',
    division: 'R',
    subject: 'Mathematics',
    chapterName: 'Foundation Checkpoint',
    notes: 'Chapter selected by name; the "Baseline Test" topic under it is found by name.',
  },
  devanagari: {
    label: 'Hindi and Marathi (Devanagari) typing and handwriting -- XC-01',
    account: 'VALID_PIN',
    grade: 'Class 7',
    division: 'A',
    subject: 'Hindi Language',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'XC-01 types Hindi/Marathi in a text box and writes Marathi handwriting here, below existing content.',
  },
  longSession: {
    label: 'Whiteboard -- long multi-session teaching (never cleared)',
    account: 'VALID_PIN',
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 2,
    topicIndex: 0,
    notes: 'Only WB-11 writes here. Content accumulates on purpose; never clear this board.',
  },
  toolbarGeneral: {
    label: 'Toolbar / Whiteboard drawing',
    account: 'VALID_PIN',
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 3,
    topicIndex: 0,
    notes: 'Drawing on the whiteboard; does not depend on curriculum content.',
  },
  toolbarRapidSwitch: {
    label: 'Toolbar -- rapid subject-switch checks',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Accountancy',
    notes: 'Used where a test needs to know which subject is first in the list (see navigationAccountancy).',
  },
  aiHomework: {
    label: 'AI Homework',
    account: 'VALID_PIN',
    grade: 'Class 10',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'The homework builder can generate for this class. "Ready to Send" assigns real homework.',
  },
  aiNotices: {
    label: 'AI Notices',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Mathematics',
    notes: 'Magnet lists Notice and the composer lists the classes. Sending a notice is a real action.',
  },
  playlistGeneral: {
    label: 'Playlist -- general (Show/Hide/Pin, Filter, Chapter/Topic nav)',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'General Playlist checks.',
  },
};

/** Returns the raw map entry for a module key (throws if unknown, so a
 * typo'd key fails loudly at the call site rather than navigating
 * somewhere unintended). */
function getClassMap(moduleKey) {
  const entry = MODULE_CLASS_MAP[moduleKey];
  if (!entry) {
    throw new Error(
      `moduleClassMap: no entry for "${moduleKey}" -- known keys: ${Object.keys(MODULE_CLASS_MAP).join(', ')}`
    );
  }
  // The data this key needs is not on the current server: fail with a clear, recognisable reason (the result summary
  // lists these as DATA MISSING) rather than a confusing locator timeout -- never a silent skip.
  if (entry.unavailable) throw new Error(`DATA MISSING ON THIS SERVER (${moduleKey}): ${entry.unavailable}`);
  return entry;
}

/** Navigates an already-logged-in page (via its NavigationPage instance)
 * to a module's confirmed class/chapter/topic. Does NOT log in -- callers
 * still sign in themselves first (see pinForModule),
 * since which account to log into is a test-setup decision this helper
 * shouldn't silently make.
 *
 * `opts.chapterNav` (default true) lets a caller reuse an entry's
 * grade/division/subject WITHOUT also triggering its chapter/topic
 * navigation -- needed because several real call sites only ever called
 * resetToClass() and never goToChapterTopic(ByName), even though the
 * entry they match also happens to record a confirmed chapterIndex for
 * OTHER callers that do navigate chapters. Passing
 * `{ chapterNav: false }` keeps this a pure 1:1 behavior-preserving
 * refactor for those call sites -- it must never silently add a
 * navigation step that wasn't there before. */
async function applyClassMap(nav, moduleKey, opts = {}) {
  const entry = getClassMap(moduleKey);
  const { chapterNav = true } = opts;
  await nav.resetToClass(entry.grade, entry.division, entry.subject);
  if (chapterNav) {
    if (entry.chapterName) {
      await nav.goToChapterTopicByName(entry.chapterName, entry.topicIndex ?? 0);
    } else if (typeof entry.chapterIndex === 'number') {
      await nav.goToChapterTopic(entry.chapterIndex, entry.topicIndex ?? 0);
    }
  }
  return entry;
}

/** The PIN to sign in with for a module's map entry: the entry's account (VALID_PIN / VALID_PIN_2), or VALID_PIN
 * when that account's PIN is not set in .env. */
function pinForModule(moduleKey) {
  const entry = getClassMap(moduleKey);
  // ONLY_PRIMARY_ACCOUNT=1: every entry signs in with the primary account.
  if (process.env.ONLY_PRIMARY_ACCOUNT) return process.env.VALID_PIN;
  return process.env[entry.account] || process.env.VALID_PIN;
}

function pinForWhiteboard() {
  const pin = process.env.WHITEBOARD_PIN || process.env.VALID_PIN_2;
  if (!pin) throw new Error('Whiteboard tests need a separate teacher account: set WHITEBOARD_PIN or VALID_PIN_2.');
  if (pin === process.env.VALID_PIN)
    throw new Error(
      'Whiteboard tests must use an account different from VALID_PIN; set WHITEBOARD_PIN or VALID_PIN_2.'
    );
  return pin;
}

module.exports = { MODULE_CLASS_MAP, getClassMap, applyClassMap, pinForModule, pinForWhiteboard };
