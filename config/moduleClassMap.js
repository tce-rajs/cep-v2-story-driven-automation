// Module -> confirmed-working Class/Division/Subject/Chapter/Topic map.
//
// Reference: D:\Projects\automation-cep-cypress\cypress\config\moduleClassMap.json
// (a flat, single-account JSON of grade/division/subject/chapterIndex/
// topicIndex per module, built by that Cypress suite). This is the "next
// level" version for this project, built FROM this project's own actual
// code (every resetToClass/goToChapterTopic(ByName) call across tests/,
// extracted live rather than typed from memory) rather than duplicating
// the reference by hand. Two structural upgrades over the reference:
//
//   1. TWO accounts, not one. This project uses two real, independent
//      teacher logins (VALID_PIN and VALID_PIN_2, see .env) to allow
//      parallel work without state collisions -- every entry below
//      records which account it was actually confirmed against, since a
//      combo confirmed on one account says nothing about the other.
//   2. `knownIssues`, not just a free-text `notes` string. Real,
//      reproducible findings tied to a SPECIFIC class/module combo
//      (crashes, popups that misbehave, data that doesn't render) are
//      recorded as a structured list here, so a future test/agent can
//      check `knownIssues.length > 0` programmatically instead of having
//      to re-read prose to notice a landmine.
//
// Usage:
//   const { applyClassMap } = require('../../config/moduleClassMap');
//   await applyClassMap(nav, 'quiz'); // logs in is NOT done here -- callers
//                                      // still do pl.loginWithPin() first,
//                                      // since the map only owns navigation.
//
// Keep this file in sync by construction, not by memory: whenever a test
// discovers a new confirmed-working (or confirmed-BROKEN) class/chapter/
// topic combo for a module, add/update the entry here rather than letting
// another hardcoded resetToClass(...) call drift out of sync with this map.

const MODULE_CLASS_MAP = {
  default: {
    label: 'Default (general-purpose fallback)',
    account: 'VALID_PIN',
    // DECIDED 2026-10-05 (owner: whiteboard tests use a class and topic not used before): Class 9A Science, all
    // boards empty when checked (1.1, 2.1, 3.1), Notice/Learning Shorts/Homework/Attendance in Magnet, a video on
    // each topic. The `user` fixture also brings every test that names no class here first (fixtures/index.js).
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    notes:
      "This suite's general-purpose class on the primary account -- used by any module with no specific data dependency.",
    knownIssues: [],
  },
  defaultAccount2: {
    label: 'Default (general-purpose fallback, second account)',
    account: 'VALID_PIN_2',
    grade: 'Class 12',
    division: 'A',
    subject: 'Computer Science',
    chapterIndex: 13,
    topicIndex: 0,
    notes:
      '"14. Project Based Learning" -- confirmed to hold Image/Video/Worksheet/Weblink resources, used across most Players sub-modules on the second account.',
    knownIssues: [],
  },

  // --- Navigation / Grade-Subject-Division ---
  navigationBoundary: {
    label: 'Navigation -- boundary/first-last-chapter checks',
    account: 'VALID_PIN',
    grade: 'Class 9',
    division: 'A',
    subject: 'Hindi Language',
    chapterIndex: null,
    topicIndex: null, // 29 chapters total, used for first/last-index boundary tests
    notes:
      '29 chapters -- the widest chapter list confirmed on this account, used wherever a test needs "many chapters" (boundary/scroll checks).',
    knownIssues: [
      "The true LAST chapter (29) and the one before it (28) do not show a browsable topics list the same way earlier chapters do -- the popup jumps straight to a single topic instead of listing options. Not a bug; just don't assume every chapter behaves identically when writing a new boundary test here.",
    ],
  },
  navigationGeneral: {
    label: 'Navigation -- general cascade/state checks',
    account: 'VALID_PIN',
    grade: 'Class 5',
    division: 'A',
    subject: 'Mathematics',
    chapterIndex: 0,
    topicIndex: 0,
    notes:
      'Secondary known-good combo, used to force a genuine class-switch transition (away from Class 9A/Class 11A) in tests that need to prove a real navigation event occurred.',
    knownIssues: [],
  },
  navigationAccountancy: {
    label: 'Navigation -- Accountancy-specific checks (subject list order)',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Accountancy',
    chapterIndex: 2,
    topicIndex: 0,
    notes:
      'Accountancy is the alphabetically-FIRST subject in Class 11\'s real subject list on this account -- used wherever a test needs "the first subject pill" specifically (e.g. Toolbar/User-Journeys rapid-switch tests).',
    knownIssues: [],
  },

  // --- Attendance (Magnet-gated) ---
  attendance: {
    label: 'Attendance',
    account: 'VALID_PIN',
    grade: 'Class 10',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    server85:
      'SCANNED LIVE 2026-09-29 on 172.18.2.85: Magnet lists Attendance only for this account (74125) on Class 11A and 10A (not 12A, not on 96325). Class 10A Science also has working AI Homework, so both modules share it.',
    notes:
      "Magnet tool (toolbar-tool-gtMagnet) is per-account+class-teacher-assignment gated, not universal -- confirmed available on this account's Class 12A.",
    knownIssues: [],
    // CONFIRMED LIVE 2026-09-26 (v 0.0.232): the old 'panel hangs on its loading spinner' issue no longer reproduces --
    // Attendance opens on Play Attendance / Mark Attendance, with a 150-student roster (85 boys, 65 girls). Marks and
    // submits are real (owner-approved 2026-09-26) and create today's attendance record for this class.
  },

  // --- Compass ---
  compassBaseline: {
    label: 'Compass -- AnalyseIt ("No Homework") renders, alongside ExploreIt',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Mathematics',
    chapterIndex: 0,
    topicIndex: 0,
    server85:
      'SCANNED LIVE 2026-09-29 on 172.18.2.85: "1.1 | Big Idea – Sets" -- Compass shows Analyseit (No Homework) and Exploreit (Operations on Sets, Venn Diagrams, Open Widgets). The old QA combo (Class 12A Physics 1.1) shows no Compass at all on .85.',
    notes:
      'CONFIRMED LIVE (2026-09-19): AnalyseIt (with "No Homework") and Revision Tests render here, but ExploreIt does NOT -- it only renders where the chapter has widgets (see compassExploreIt).',
    knownIssues: [],
  },
  librarySuggestions: {
    label: 'Library -- the topic name itself returns library suggestions',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 4,
    notes:
      'CONFIRMED LIVE (2026-09-20): "1.5 | Electric Field" -- the Library auto-searches the topic name on open and returns 40 results. Most topics return "No result found" for their full name (e.g. the default 1.1 "Big Idea: Electric Charges and Fields"), so use this for any Library test that needs suggestions. "1.4 Forces Between Multiple Charges" returns 3.',
    knownIssues: [],
  },
  libraryApostropheTopic: {
    label: 'Library -- topic name containing an apostrophe',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    // DECIDED 2026-10-05: two test topics ("dddd", "Testing - New Topic Added") were inserted at 1.3/1.4 on the Ultra
    // server, so "Coulomb's Law" moved from index 2 to index 4 (1.5).
    topicIndex: 4,
    notes:
      'CONFIRMED LIVE (2026-09-20): "1.3 | Coulomb\'s Law" -- the Library\'s pre-filled search box shows the HTML entity (Coulomb&#39;s Law) instead of the apostrophe, so it finds nothing.',
    knownIssues: [{ summary: 'Library search box shows &#39; for an apostrophe in the topic name', module: 'library' }],
  },
  compassExploreIt: {
    label: 'Compass -- ExploreIt widgets render alongside AnalyseIt',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Mathematics',
    chapterIndex: 0,
    topicIndex: 0,
    server85:
      'SCANNED LIVE 2026-09-29 on 172.18.2.85: same topic as compassBaseline -- the only place found with BOTH Exploreit and Analyseit (Class 12A Physics shows Exploreit alone).',
    notes:
      'CONFIRMED LIVE (2026-09-19): the Compass menu shows AnalyseIt AND an "Exploreit" section ("Force Between Current-Carrying W..." widget with Open Widget). Chapters 2 and 4 (topics 1-2) show it too; chapter 0 has none. The menu label is "Exploreit" (one word) and its item carries no data-qa-id, so match on text.',
    knownIssues: [],
  },
  compassNoAnalyseIt: {
    label: 'Compass -- confirmed to have ZERO AnalyseIt presence (negative case)',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 1,
    topicIndex: 0,
    server85:
      'SCANNED LIVE 2026-09-29 on 172.18.2.85: "2.1" -- Compass shows Exploreit (Capacitor, Open Widget) only; no Analyseit, no Revision Test. (Class 11A Mathematics 1.1 DOES show Analyseit on .85.)',
    notes:
      'CONFIRMED LIVE (5/5 repro, including after a full reload): this combo never renders an AnalyseIt entry at all -- only ExploreIt. Useful specifically as a negative-case fixture; do NOT use this combo for any AnalyseIt-dependent test.',
    knownIssues: [
      'compass-analyseit-item is entirely absent from the DOM on this combo, not just hidden -- a test written assuming "it\'s just empty" instead of "it doesn\'t exist" will hang on a locator wait.',
    ],
  },

  // Revision Tests are authored in Plan Mode (manual-only here); none exist on .85.
  compassRevisionTest: {
    label: 'Compass -- a topic with a Revision Test',
    account: 'VALID_PIN',
    // DECIDED 2026-10-05: the owner created Revision Tests on Class 10A Science "Acids, Bases and Salts" (3rd in the
    // chapter list): 3.4 "Importance of pH in Everyday Life" (used here) and 3.6 "Common Salts". Checked live in the
    // client: Compass shows "Revision Test - 3 tests available" for this account (not for 96325).
    grade: 'Class 10',
    division: 'A',
    subject: 'Science',
    chapterIndex: 2,
    topicIndex: 3,
    notes: 'Second topic with the same Revision Tests: chapterIndex 2, topicIndex 5 (3.6 Common Salts).',
    knownIssues: [],
  },

  // --- Checkpoints (Players) ---
  checkpoints: {
    label: 'Checkpoints Player',
    account: 'VALID_PIN',
    // DECIDED 2026-10-05: Class 8R does not exist on the Ultra server; the owner created baseline tests on Class 10A
    // Science 1.1 "Baseline Test" (checked live: "Science Baseline Assessment" x3 created 2026-10-05, plus "test 1"
    // (paused) and "Test 4"). To confirm in the next run that the checkpoint tests (PLR-09) drive these cards.
    grade: 'Class 10',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    notes:
      'Resource card "testR-25.08.26". Chapter must be selected by NAME (goToChapterTopicByName), not a fixed index -- its position in the chapter list is not stable.',
    knownIssues: [
      "This resource's real status (CREATED / PAUSED / LAUNCHED) drifts as a direct side-effect of testing it -- any new test against this resource must check current on-screen state rather than assuming one fixed flow.",
      'Clicking the checkpointEndBtn control reliably crashes the page (reproduced twice) -- never call it as a cleanup step.',
    ],
  },

  // --- Players (Quiz/Video/Worksheet/etc., mostly on the second account) ---
  quiz: {
    label: 'Quiz Player',
    account: 'VALID_PIN_2',
    grade: 'Class 11',
    division: 'A',
    subject: 'Accountancy',
    chapterIndex: 2,
    topicIndex: 0,
    notes: '',
    knownIssues: [
      'The Playlist strip can render fully COLLAPSED on this account -- every resource-card click silently no-ops until the drawer is explicitly re-expanded first (see PlaylistPage.ensureDrawerVisible()).',
      '"Launch AIR Card" genuinely requires real camera hardware access -- not a bug, not automatable headlessly (resolves the old PLR-QZ-RECONCILE-01 open question definitively).',
    ],
  },
  codeEditor: {
    label: 'Code Editor Player',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Computer Science',
    chapterIndex: 0, // DECIDED 2026-10-05: Raj's 12A CS 1.1 holds the Code resource (checked live); his 2.1 is a custom topic "T1"
    topicIndex: 0,
    notes: '"2. Exception Handling in Python" -- confirmed to hold a real Code-type resource.',
    knownIssues: [
      'Editor settings (font size/theme) were found NOT to persist across a reload in one verification pass, contradicting an earlier positive finding recorded for this same combo -- treat as flaky/needs re-confirmation, not settled either way.',
    ],
  },
  playersDefault: {
    label: 'Players -- Video/Worksheet/Image/Code (shared default topic)',
    account: 'VALID_PIN_2',
    grade: 'Class 12',
    division: 'A',
    subject: 'Computer Science',
    chapterIndex: 1,
    topicIndex: 1,
    server85:
      'SCANNED LIVE 2026-09-29 on 172.18.2.85 (all 73 Class 12A Computer Science topics): "2.2 | Raising Exceptions and Need for Exception Handling" -- Worksheet x3, Code x1, Video x1, Image x3, Quiz x1. No topic here has a Web link with the rest: web-link cases use playersWeblink; unsupported files use playersUnsupported. (The old combo, 14.1, has no Image or Web link on .85.)',
    notes:
      '"14. Project Based Learning" -- one confirmed Image/Video/Worksheet/Weblink resource each, all in the same topic. Shared across video.spec.js, worksheet.spec.js, image.spec.js, weblink.spec.js.',
    knownIssues: [
      'A worksheet, once closed, was observed leaving 13 stale close-icon elements behind in the DOM in one pass -- possible stacking/cleanup bug, flagged for re-confirmation, not yet settled as a hard finding.',
    ],
  },
  playersWeblink: {
    label: 'Players -- a Web link together with Worksheet/Image/Video (primary account)',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 0,
    server85:
      'SCANNED LIVE 2026-09-29 on 172.18.2.85: "1.1 | Big Idea: Electric Charges and Fields" -- Video x1, Worksheet x11, Image x4, Web link x1, Quiz x19.',
    notes: 'Same topic as toolbarGeneral/default (its board is cleared by whiteboard tests; its Playlist is shared).',
    knownIssues: [],
  },
  playersUnsupported: {
    label: 'Players -- unsupported-file resources',
    account: 'VALID_PIN_2',
    grade: 'Class 12',
    division: 'A',
    subject: 'Computer Science',
    chapterIndex: 13,
    topicIndex: 0,
    server85:
      'SCANNED LIVE 2026-09-29 on 172.18.2.85: "14.1 | Approaches for Solving Project" -- Unsupported x2, Video, Worksheet, Quiz.',
    notes: '',
    knownIssues: [],
  },
  ebook: {
    label: 'Ebook Player',
    account: 'VALID_PIN',
    // DECIDED 2026-10-05 (checked live in the client): Raj's 12A Physics shows no E-Books tile at all on the Ultra
    // server; his Class 11A Mathematics 1.1 does.
    grade: 'Class 11',
    division: 'A',
    subject: 'Mathematics',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Confirmed 1 linked e-book resource: "(CE Crystal) NCERT Physics Class 12".',
    knownIssues: [
      'Both the chapter-drawer and resource-drawer toggle buttons are confirmed non-functional (verified via DOM computed-style + screenshot, display:none before and after click).',
    ],
  },
  tceUnsupported: {
    label: 'TCE Player / Unsupported Player',
    // DECIDED 2026-10-05: creates and removes its own throwaway asset, so it runs on the primary account in the
    // whiteboard test class instead of the second account.
    account: 'VALID_PIN',
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Unsupported Player creates its own throwaway asset per test and works on any class.',
    knownIssues: [],
  },
  flashcard: {
    unavailable: 'Class 8 division R ("Foundation Checkpoint") does not exist on 172.18.2.85 (2026-09-29)',
    label: 'Flashcard Player',
    account: 'VALID_PIN', // CORRECTED 2026-09-09 re-scan: flashcard.spec.js's own comment explains VALID_PIN_2 does not have Class 8/Division R reachable at all on this account -- it deliberately uses VALID_PIN instead (the SAME account checkpoints.spec.js uses for this same chapter).
    grade: 'Class 8',
    division: 'R',
    subject: 'Mathematics',
    chapterName: 'Foundation Checkpoint',
    notes:
      'Shares the Checkpoints module\'s chapter (selected by name) -- see the `checkpoints` entry\'s own known issues, which also apply here. The real topic under this chapter ("Baseline Test") is only known by name, not a stable index -- the consuming file searches topic indices 0..4 itself rather than using a single fixed topicIndex, so this entry intentionally carries no topicIndex/chapterNav-search logic of its own.',
    knownIssues: [],
  },

  // --- Toolbar / Whiteboard drawing surface ---
  // A teacher's board that is NEVER cleared (owner's request, 2026-09-27): long multi-session writing tests add to it
  // day after day, the way a real classroom board fills up, and verify everything written before is still there.
  devanagari: {
    label: 'Hindi and Marathi (Devanagari) typing and handwriting -- XC-01',
    account: 'VALID_PIN',
    // DECIDED 2026-10-05: a board of its own, away from the whiteboard tests and the data boards. Checked live: 1.1
    // "भाषा और व्याकरण" and 2.1 "स्वर और व्यंजन" empty, Hindi resources (video, worksheet, quiz), Notice in Magnet.
    grade: 'Class 7',
    division: 'A',
    subject: 'Hindi Language',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'XC-01 types Marathi/Hindi in a text box and writes Marathi handwriting here, below anything already there.',
    knownIssues: [],
  },

  longSession: {
    label: 'Whiteboard -- long multi-session teaching (never cleared)',
    account: 'VALID_PIN',
    // DECIDED 2026-10-05: whiteboard-writing tests run in Class 9A Science (see `default`), which holds none of the
    // data boards. Never write on: 12A Physics 1.2/1.6-1.10, 7A Value Education 1.1, 7A Mathematics 1.1 (Raj);
    // 12A CS 7.2/8.1/8.2 (Mandar).
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 2,
    topicIndex: 0,
    notes:
      'Only WB-11 writes here. Content accumulates on purpose; do not add cleanBoard or Clear Whiteboard to any test using this key.',
    knownIssues: [],
  },

  toolbarGeneral: {
    label: 'Toolbar / Whiteboard drawing',
    account: 'VALID_PIN',
    // DECIDED 2026-10-05: Class 9A Science, see `default` and `longSession`.
    grade: 'Class 9',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    notes:
      "Draws directly on the Whiteboard canvas -- works on any class; most Toolbar tests don't depend on curriculum content at all.",
    knownIssues: [
      'A fixed header/logo covers roughly the top-left 90x90px of the canvas -- any coordinate helper must clamp to a minimum of ~120px in both axes or risk silently clicking the header instead of the canvas.',
      'The Shapes tool needs Rectangle re-selected from a freshly reopened panel before EVERY individual insertion -- it is not "armed" for multiple inserts in a row.',
    ],
  },
  toolbarRapidSwitch: {
    label: 'Toolbar -- rapid subject-switch checks',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Accountancy',
    notes:
      'Used specifically where a test needs to click "the first subject pill" and know which one that is (see navigationAccountancy).',
    knownIssues: [],
  },

  // --- AI Homework / AI Notices / Learning Shorts (Magnet-gated) ---
  aiHomework: {
    label: 'AI Homework',
    account: 'VALID_PIN',
    grade: 'Class 10',
    division: 'A',
    subject: 'Science',
    chapterIndex: 0,
    topicIndex: 0,
    server85:
      'SCANNED LIVE 2026-09-29 on 172.18.2.85: Class 10A Science is the only class found where Generate is enabled. Class 12A Physics/Mathematics/Chemistry, 11A Mathematics, 9A Mathematics, 8A Science and 6A Mathematics all show "The grade or class you selected seems incorrect" (the old QA class, 11A Mathematics, included).',
    notes:
      'Magnet-gated. The Objective counter\'s real floor is 0, not 1 -- a generate-and-wait helper assuming "at least 1" will hang on a genuine 0-question request.',
    knownIssues: [
      '"Ready to Send" is a REAL send action. Owner-approved 2026-09-26: AIH-04-06 really sends (assigns real homework to Class 11A).',
    ],
  },
  aiNotices: {
    label: 'AI Notices',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Mathematics',
    notes:
      "Magnet-gated, same class as aiHomework's VALID_PIN_2 entry but confirmed independently on the primary account.",
    knownIssues: [
      "3 of the compose dialog's AI-assist buttons (paraphrase etc.) are confirmed dead code.",
      'The Title field has a real Backspace/Delete key handling bug.',
      'Closing the composer silently discards a draft with no confirmation.',
    ],
  },

  // --- Playlist ---
  playlistGeneral: {
    label: 'Playlist -- general (Show/Hide/Pin, Filter, Chapter/Topic nav)',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 0,
    notes: '',
    knownIssues: [],
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
 * shouldn't silently make. Logs any knownIssues to the console so they
 * surface in a test's own output, not just buried in this file.
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
  if (entry.knownIssues && entry.knownIssues.length > 0) {
    console.log(
      `[moduleClassMap:${moduleKey}] ${entry.knownIssues.length} known issue(s) on this combo:`,
      entry.knownIssues
    );
  }
  return entry;
}

/** The PIN to sign in with for a module's map entry. Entries record which of the
 * two QA accounts (VALID_PIN / VALID_PIN_2) the combo was confirmed on; if that
 * account's PIN isn't set in .env, fall back to VALID_PIN so the run still starts
 * (the combo may then simply not hold the expected data -- see the entry's notes). */
function pinForModule(moduleKey) {
  const entry = getClassMap(moduleKey);
  // ONLY_PRIMARY_ACCOUNT=1: every entry signs in with the primary account (owner, 2026-10-01: use Raj's account).
  if (process.env.ONLY_PRIMARY_ACCOUNT) return process.env.VALID_PIN;
  return process.env[entry.account] || process.env.VALID_PIN;
}

module.exports = { MODULE_CLASS_MAP, getClassMap, applyClassMap, pinForModule };
