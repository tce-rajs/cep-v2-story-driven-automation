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
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
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
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics or Mathematics',
    chapterIndex: 0,
    topicIndex: 0,
    notes:
      "Magnet tool (toolbar-tool-gtMagnet) is per-account+class-teacher-assignment gated, not universal -- confirmed available on this account's Class 12A.",
    knownIssues: [
      'CRITICAL, reproduced across multiple subjects: the Attendance panel hangs indefinitely on its own loading spinner and never renders the roster -- no known workaround, no way to exit from inside the panel.',
    ],
  },

  // --- Compass ---
  compassBaseline: {
    label: 'Compass -- AnalyseIt + Revision Tests render (no ExploreIt widgets)',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 0,
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
    topicIndex: 2,
    notes:
      'CONFIRMED LIVE (2026-09-20): "1.3 | Coulomb\'s Law" -- the Library\'s pre-filled search box shows the HTML entity (Coulomb&#39;s Law) instead of the apostrophe, so it finds nothing.',
    knownIssues: [{ summary: 'Library search box shows &#39; for an apostrophe in the topic name', module: 'library' }],
  },
  compassExploreIt: {
    label: 'Compass -- ExploreIt widgets render alongside AnalyseIt',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 3,
    topicIndex: 1,
    notes:
      'CONFIRMED LIVE (2026-09-19): the Compass menu shows AnalyseIt AND an "Exploreit" section ("Force Between Current-Carrying W..." widget with Open Widget). Chapters 2 and 4 (topics 1-2) show it too; chapter 0 has none. The menu label is "Exploreit" (one word) and its item carries no data-qa-id, so match on text.',
    knownIssues: [],
  },
  compassNoAnalyseIt: {
    label: 'Compass -- confirmed to have ZERO AnalyseIt presence (negative case)',
    account: 'VALID_PIN',
    grade: 'Class 11',
    division: 'A',
    subject: 'Mathematics',
    chapterIndex: 0,
    topicIndex: 0,
    notes:
      'CONFIRMED LIVE (5/5 repro, including after a full reload): this combo never renders an AnalyseIt entry at all -- only ExploreIt. Useful specifically as a negative-case fixture; do NOT use this combo for any AnalyseIt-dependent test.',
    knownIssues: [
      'compass-analyseit-item is entirely absent from the DOM on this combo, not just hidden -- a test written assuming "it\'s just empty" instead of "it doesn\'t exist" will hang on a locator wait.',
    ],
  },

  // --- Checkpoints (Players) ---
  checkpoints: {
    label: 'Checkpoints Player',
    account: 'VALID_PIN', // CORRECTED 2026-09-09 re-scan: flashcard.spec.js (see its own `flashcard` entry) also uses VALID_PIN for this same chapter, not VALID_PIN_2 as previously noted here.
    grade: 'Class 8',
    division: 'R',
    subject: 'Mathematics',
    chapterName: 'Foundation Checkpoint', // selected by NAME, not index -- position varies
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
    chapterIndex: 1,
    topicIndex: 0,
    notes: '"2. Exception Handling in Python" -- confirmed to hold a real Code-type resource.',
    knownIssues: [
      'Editor settings (font size/theme) were found NOT to persist across a reload in one verification pass, contradicting an earlier positive finding recorded for this same combo -- treat as flaky/needs re-confirmation, not settled either way.',
    ],
  },
  playersDefault: {
    label: 'Players -- Video/Worksheet/Image/Weblink (shared default topic)',
    account: 'VALID_PIN_2',
    grade: 'Class 12',
    division: 'A',
    subject: 'Computer Science',
    chapterIndex: 13,
    topicIndex: 0,
    notes:
      '"14. Project Based Learning" -- one confirmed Image/Video/Worksheet/Weblink resource each, all in the same topic. Shared across video.spec.js, worksheet.spec.js, image.spec.js, weblink.spec.js.',
    knownIssues: [
      'A worksheet, once closed, was observed leaving 13 stale close-icon elements behind in the DOM in one pass -- possible stacking/cleanup bug, flagged for re-confirmation, not yet settled as a hard finding.',
    ],
  },
  ebook: {
    label: 'Ebook Player',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 13,
    topicIndex: 0,
    notes: 'Confirmed 1 linked e-book resource: "(CE Crystal) NCERT Physics Class 12".',
    knownIssues: [
      'Both the chapter-drawer and resource-drawer toggle buttons are confirmed non-functional (verified via DOM computed-style + screenshot, display:none before and after click).',
    ],
  },
  tceUnsupported: {
    label: 'TCE Player / Unsupported Player',
    account: 'VALID_PIN_2', // CORRECTED 2026-09-09 re-scan: both consuming files (tce.spec.js, unsupported.spec.js) actually log in with VALID_PIN_2, not VALID_PIN as this entry previously said.
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
    chapterIndex: 0,
    topicIndex: 0,
    notes: 'Unsupported Player creates its own throwaway asset per test and works on any class.',
    knownIssues: [],
  },
  flashcard: {
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
  toolbarGeneral: {
    label: 'Toolbar / Whiteboard drawing',
    account: 'VALID_PIN',
    grade: 'Class 12',
    division: 'A',
    subject: 'Physics',
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
    account: 'VALID_PIN_2',
    grade: 'Class 11',
    division: 'A',
    subject: 'Mathematics',
    notes:
      'Magnet-gated. The Objective counter\'s real floor is 0, not 1 -- a generate-and-wait helper assuming "at least 1" will hang on a genuine 0-question request.',
    knownIssues: [
      '"Ready to Send" is a REAL send action -- never click it in automation (documented via test.fail(), not executed).',
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
  return process.env[entry.account] || process.env.VALID_PIN;
}

module.exports = { MODULE_CLASS_MAP, getClassMap, applyClassMap, pinForModule };
