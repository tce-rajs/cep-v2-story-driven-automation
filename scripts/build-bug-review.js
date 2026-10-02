// Builds the owner's bug review sheet: report/BUG_REVIEW.xlsx and report/BUG_REVIEW.md.
// One row per confirmed bug in plain words: what was checked (should happen), what actually happens, severity,
// confidence, video evidence, and empty columns for the owner's decision. Sources: BUG_LIST.md (confirmed section),
// each test's own test.fail() reason, the upload-kit KNOWN tables, and the plain texts below for rows whose failure
// was only recorded as a raw assertion. Run: node scripts/build-bug-review.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const root = path.join(__dirname, '..');
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

// --- test.fail() reasons, per test --------------------------------------------------------------------------------
const reasons = {};
for (const f of walk(path.join(root, 'tests')).filter((f) => f.endsWith('.spec.js'))) {
  const s = fs.readFileSync(f, 'utf8');
  for (const part of s.split(/\n\s*(?=test\(|test\.describe\()/)) {
    const id = (part.match(/['`]\s*([A-Z]+-\d+[\w-]*)\s*:/) || [])[1];
    const r = part.match(/test\.fail\(\s*[^,]+,\s*(['`])([\s\S]*?)\1\s*\)/);
    if (id && r && !reasons[id]) reasons[id] = r[2].replace(/\s+/g, ' ').trim();
  }
}

// --- plain texts for rows recorded only as a raw assertion (read from each run's failure) ---------------------------
const OFFICE = 'Accepted with "Successfully added resource!", but opening it shows "UNSUPPORTED FILE"';
const BROKEN =
  'A broken file is accepted with "Successfully added resource!"; the teacher only finds out when opening it in class';
const PLAIN = {
  'WB-08-01':
    'Autosave works during a long session, but no "Whiteboard Saved!" message appears until the teacher stops (on 172.18.2.85 the strokes were saved; only the message is missing -- owner to decide)',
  'WB-08-03': 'After the network drops and comes back, autosave does not start again',
  'WB-10-15':
    'In a 150-word finger session far more strokes land than were written (2,119 for 276): extra lines from the touch gestures',
  'WB-10-16':
    'In a 150-word stylus session with the palm resting and two-finger panning, far more strokes land than were written (2,946 for 276): the palm and the pan draw',
  'RES-02-17': 'Typing a Library search quickly shows results for a part of the word, not the full word typed',
  'RES-08-21':
    'A PDF with a Hindi file name is rejected by the server with no message; the resource is silently not created',
  'RES-08-23': OFFICE,
  'RES-08-24': OFFICE,
  'RES-08-25': OFFICE,
  'RES-08-26': OFFICE,
  'RES-08-27': `${OFFICE} (older .xls and .ods do open)`,
  'RES-08-30': OFFICE,
  'RES-08-31': OFFICE,
  'RES-08-32': `${BROKEN} (opens as a blank worksheet)`,
  'RES-08-33': `${BROKEN} ("Unable to load the image!")`,
  'RES-08-34': `${BROKEN} (video player shows a media error)`,
  'RES-08-35': `${BROKEN} ("Unable to load the image!")`,
  'RES-08-37': `${BROKEN} (opens as a blank worksheet)`,
  'RES-08-38': `${BROKEN} ("UNSUPPORTED FILE")`,
  'RES-08-39': `${BROKEN} (video player shows a media error)`,
  'RES-08-40': `${BROKEN} ("Unable to load the image!")`,
  'RES-08-41': 'A Windows program renamed to .pdf is accepted as a resource and opens as a blank worksheet',
  'RES-08-49': `${BROKEN} ("UNSUPPORTED FILE")`,
  'RES-08-50': 'A file with a ~250-character name is rejected by the server with no message',
  'RES-09-05': 'A broken PDF is accepted by DropIt and opens as a blank worksheet with no message',
  'RES-09-06': 'A Windows program renamed to .pdf is accepted by DropIt and opens as a blank worksheet',
  'RES-09-07': 'An MP4 renamed to .png is accepted by DropIt; opening it shows "Unable to load the image!"',
  'RES-09-08': 'DropIt has no file-size limit: a 13.9 MB PDF is accepted (Create stops at 10 MB)',
  'RES-09-09': 'A PDF with a Hindi file name is silently rejected by DropIt with no message',
  'PLR-03-04': '"Go to Page" with the up/down buttons stays on page 1 instead of jumping to the chosen page',
  'PLR-13-01a': 'Double-clicking a video card opens no player at all',
  'PLR-13-01b': 'Triple-clicking a video card opens no player at all',
  'PLR-13-05a': 'Double-clicking a code-editor card opens no player at all',
  'PLR-13-05b': 'Triple-clicking a code-editor card opens no player at all',
  'PLR-13-05c': "After double-clicking the code editor's close button, the code editor does not open again",
  'PLR-13-07a': 'Double-clicking a quiz card opens no player at all',
  'PLR-13-07b': 'Triple-clicking a quiz card opens no player at all',
  'PLR-14-01c': 'On an open worksheet (PDF), drawing a shape adds nothing',
  'PLR-14-02c': 'On an open image, drawing a shape adds nothing',
  'PLR-14-03a': 'Writing with the pen on an open video adds no stroke',
  'PLR-14-03b': 'On a video, the zoom-write-pan-write sequence never finds the written stroke (no stroke is added)',
  'PLR-14-03c': 'On an open video, the pen adds nothing (so no tool can be checked)',
  'PLR-14-03d': 'Video annotations cannot be checked after close/reopen: the first stroke is never added',
  'PLR-14-03e':
    'Video: the first stroke is never added, so "nothing left on the whiteboard after closing" cannot be checked',
  'PLR-14-04c': 'On an open web link, drawing a shape adds nothing',
  'PLR-14-05a': 'Writing with the pen on an open code editor adds no stroke',
  'PLR-14-05b':
    'On a code editor, the zoom-write-pan-write sequence never finds the written stroke (no stroke is added)',
  'PLR-14-05c': 'On an open code editor, the pen adds nothing (so no tool can be checked)',
  'PLR-14-05d': 'Code-editor annotations cannot be checked after close/reopen: the first stroke is never added',
  'PLR-14-05e': 'Code editor: the first stroke is never added, so "nothing left after closing" cannot be checked',
  'PLR-14-06c': 'On an unsupported-file card, drawing a shape adds nothing',
  'PLR-14-07c': 'On an open quiz, drawing a shape adds nothing',
  'PLR-14-V1': 'On a paused video the annotation is never added, so it cannot stay when the video plays',
  'PLR-14-V2': 'On a paused video the annotation is never added (seek and pause case)',
  'PLR-14-V3': 'After playing and pausing a video, a new annotation is not added',
  'PLR-14-M1':
    "With an image open over an annotated worksheet, closing the image leaves the image's annotation behind on the board",
  'RES-04-06': 'Not a confirmed product bug: the test ran out of time because the app window closed mid-test -- rerun',
  'PLR-13-05d': 'Not a confirmed product bug: the test ran out of time because the app window closed mid-test -- rerun',
  'ATT-05-02': 'Changing the speed in Play Attendance does not change it (stays "Speed: 1x")',
  'ATT-03-04':
    'After submitting attendance the register stays open, so the Magnet badge cannot be checked ("Pending" check not reached)',
  'ATT-06-02': 'After a failed submit and a retry, the register stays open instead of closing as submitted',
};

// Rows found after BUG_LIST.md was written (on 172.18.2.85), plus their plain texts.
const EXTRA = [
  {
    id: 'CLIENT-01',
    title: 'The desktop client opens a topic whose board holds one long handwritten lesson',
    actual:
      'The desktop client crashes ("Target crashed") when it opens a board with ~8,400+ strokes (12A Physics 1.7: 8,418; 1.8: ~12,700) -- 3 of 3 launches. A board with 2,751 strokes opens normally, and the browser opens all of them without trouble. After sign-in the client reopens the last topic, so the teacher cannot get past it. 30 Sep.',
    found: '.85 desktop client (30 Sep)',
    rerun: 'tests/_probe/probe-class-popup.spec.js with PIN 74125 last on 12A Physics 1.7 or 1.8',
  },
  {
    id: 'LOG-06-06',
    title: 'Writing done shortly before the forced sign-out (40-45 min) is saved',
    actual:
      "Not saved when the session runs into the app's forced sign-out: about 10 lines written just before it are lost, while the app still looks signed in (4 of 4 forced sign-outs during long writing, 30 Sep; ~10,400 of 31,500 strokes lost on 1.7/1.8). Signing out yourself at 40 min keeps everything: a 40-min session on 1.9 saved 6,632/6,632 strokes, minutes 35-40 included. Evidence: report/screenshots/marathi-essay-whole-1.png (gap where lines 19-28 were). No automated test yet.",
    found: '.85 (30 Sep, long writing)',
    rerun: 'scratchpad write-lesson-font.js on 12A Physics 1.7 / 1.8 (automated test to be added)',
  },
  {
    id: 'WB-08-04',
    title: 'Closing the app straight after writing, before the 10-second autosave, loses nothing',
    actual: 'Closing the app during the autosave countdown loses everything written since the last save',
    found: '.85 + QA',
    rerun: 'npx playwright test tests/06-whiteboard/wb-08-04-close-app.spec.js',
  },
  {
    id: 'WB-09-09',
    title: 'Reloading within 10 seconds of writing loses nothing',
    actual:
      'Reloading during the autosave countdown loses everything written since the last save (31 of 31 strokes, twice)',
    found: '.85',
    rerun: 'npx playwright test tests/06-whiteboard/wb-09-integrity.spec.js -g "WB-09-09"',
  },
  {
    id: 'WB-08-19',
    title: 'Writing done after the network comes back is still there after a reload',
    actual:
      'Autosave does not resume after the network comes back, so writing done after reconnecting is lost on reload',
    found: '.85 + QA',
    rerun: 'npx playwright test tests/06-whiteboard/wb-08-long-session.spec.js -g "WB-08-19"',
  },
  {
    id: 'LOG-06-04',
    title: 'One failed token renewal (a network blip) does not end the session while the teacher is active',
    actual: 'With one renewal request failing, the teacher was signed out while writing',
    found: '.85',
    rerun: 'npx playwright test tests/03-login/log-06-session-length.spec.js -g "LOG-06-04"',
    review: 'Owner to decide: bug or intended?',
  },
  {
    id: 'TB-09-01',
    title:
      'The User menu lists Profile, Account, Classroom Mode, Theme, Feedback, Build Version, Virtual Keyboard and Logout',
    actual: 'On 172.18.2.85 (build 0.0.232) there is no Feedback entry; the menu has Whiteboard History instead',
    found: '.85',
    rerun: 'npx playwright test tests/05-toolbar/tb-09-user-menu.spec.js -g "TB-09-01"',
    review: 'Owner: Feedback shows a QR code somewhere -- which build/client?',
  },
];

// Owner review so far (29 Sep 2026).
const REVIEW = {
  'LOG-04-08': 'Reviewed: password sign-in (not PIN); 2 sign-in requests, sign-in still works',
  'HDR-04-01': 'Owner to decide: moving the toolbar closes an open tool panel -- acceptable?',
  'TB-09-06': 'Owner: Feedback opens a QR code, not a form -- test expectation to change once confirmed where',
  'TB-09-10': 'Owner: Feedback opens a QR code, not a form -- test expectation to change once confirmed where',
  'TB-07-07': 'Reviewed: moving with Select is a feature; the bug is that Undo does not undo the move',
  'WB-10-09': 'Reviewed: moving with Select is a feature; the bug is that a finger drag does not move the stroke',
  'WB-08-01': 'Owner to decide (with WB-08-11): is saving without a message acceptable?',
  'WB-10-11': 'Probably fixed: one finger tap opened the card 3 runs in a row on 172.18.2.85',
};

// Owner scope decisions (29 Sep 2026). Finger/touch gestures are not supported on the product, so those findings are
// dropped; quiz score and drawing tools/shapes on assets are out of scope and listed as improvements instead.
const NOT_SUPPORTED = new Set(['WB-10-04', 'WB-10-05', 'WB-10-06', 'WB-10-09', 'WB-10-11', 'WB-10-15', 'WB-10-16']);
const IMPROVEMENT = {
  'PLR-02-01': 'Show the score after "Quiz Complete!"',
  'PLR-14-01c': 'Drawing tools (shapes etc.) on a worksheet',
  'PLR-14-02c': 'Drawing tools (shapes etc.) on an image',
  'PLR-14-03c': 'Drawing tools on a video',
  'PLR-14-04c': 'Drawing tools (shapes etc.) on a web link',
  'PLR-14-05c': 'Drawing tools on a code editor',
  'PLR-14-06c': 'Drawing tools (shapes etc.) on an unsupported-file card',
  'PLR-14-07c': 'Drawing tools (shapes etc.) on a quiz',
};
// Re-check on the Ultra server (Windows) after the build update: report/revalidation.json, written by the rerun.
const revalPath = path.join(root, 'report', 'revalidation.json');
const REVAL = fs.existsSync(revalPath) ? JSON.parse(fs.readFileSync(revalPath, 'utf8')) : { results: {} };

const HIGH = new Set([
  'CLIENT-01',
  'LOG-06-06',
  'WB-08-03',
  'WB-08-04',
  'WB-09-09',
  'WB-08-19',
  'WB-10-04',
  'WB-10-05',
  'WB-10-06',
  'WB-10-15',
  'WB-10-16',
  'RES-08-41',
  'RES-09-06',
  'RES-09-08',
  'ATT-03-03',
  'AIN-03-04',
  'RES-04-11',
  'LOG-06-04',
  'PLR-02-01',
]);
const LOW = new Set([
  'PLR-10-06',
  'NAV-02-02',
  'PL-08-05',
  'RES-03-09',
  'TB-10-04',
  'LOG-03-05',
  'TB-09-13',
  'RES-02-12',
  'PRF-02-04',
]);
// Failures seen in one sweep only (no recorded bug reason in the test): recheck before reporting.
const RECHECK = (id) => /^(PLR-13-|PLR-14-|PLR-03-04|RES-02-17|ATT-05-02|ATT-03-04|ATT-06-02|RES-04-06)/.test(id);

const AREA = {
  PRE: 'Before sign-in',
  LOG: 'Sign-in & session',
  HDR: 'Header',
  TB: 'Toolbar',
  WB: 'Whiteboard',
  NAV: 'Class navigation',
  PL: 'Playlist',
  RES: 'Add Resource / DropIt / Upload',
  PLR: 'Players & annotation',
  MM: 'Minimap',
  AIN: 'AI Notices',
  LS: 'Learning Shorts',
  AIH: 'AI Homework',
  ATT: 'Attendance',
  PRF: 'Profile',
  CLIENT: 'Desktop client',
};
const evidenceDirs = ['bug-evidence', 'test-evidence']
  .filter((d) => fs.existsSync(path.join(root, d)))
  .flatMap((d) => fs.readdirSync(path.join(root, d)));
const hasEvidence = (id) =>
  evidenceDirs.some(
    (n) =>
      n === id ||
      n.startsWith(`${id}`) ||
      n.toLowerCase().startsWith(
        id
          .toLowerCase()
          .replace(/-\d+[a-z]?$/, '')
          .replace('-', '')
          .toLowerCase()
      )
  );

// --- confirmed rows from BUG_LIST.md ------------------------------------------------------------------------------
const lines = fs.readFileSync(path.join(root, 'BUG_LIST.md'), 'utf8').split('\n');
const end = lines.findIndex((l) => l.startsWith('## Excluded'));
const rows = [];
for (const l of lines.slice(0, end)) {
  if (!/^\| [A-Z]+-\d/.test(l)) continue;
  const c = l.split('|').map((x) => x.trim());
  const id = c[1];
  const listed =
    c[3] && !/^(error:|\(see run log\)|expected to fail|timeout)/i.test(c[3]) && !/expect\(|attachment #/i.test(c[3])
      ? c[3]
      : '';
  rows.push({
    id,
    title: c[2].replace(/^(positive|negative)\//, ''),
    actual: PLAIN[id] || reasons[id] || listed,
    found: 'QA sweep (27 Sep)',
    rerun: c[4].replace(/`/g, ''),
  });
}
rows.push(...EXTRA);

const improvements = rows
  .filter((r) => IMPROVEMENT[r.id])
  .map((r) => ({ 'Bug ID': r.id, Improvement: IMPROVEMENT[r.id], 'Seen today': r.actual || '' }));
const inScope = rows.filter((r) => !NOT_SUPPORTED.has(r.id) && !IMPROVEMENT[r.id]);
const recheckLabel = `Ultra server re-check${REVAL.date ? ` (${REVAL.date}, build ${REVAL.build || '?'})` : ''}`;

const out = inScope.map((r, i) => {
  const prefix = r.id.split('-')[0];
  return {
    '#': i + 1,
    Area: AREA[prefix] || prefix,
    'Bug ID': r.id,
    'What we checked (should happen)': r.title.charAt(0).toUpperCase() + r.title.slice(1),
    'What actually happens': r.actual || '(see the rerun command)',
    Severity: HIGH.has(r.id) ? 'High' : LOW.has(r.id) ? 'Low' : 'Medium',
    Confidence: RECHECK(r.id) ? 'Seen once - recheck' : 'Confirmed',
    'Video / screenshot': hasEvidence(r.id) ? 'Yes' : 'No',
    'Found on': r.found,
    [recheckLabel]: REVAL.results[r.id] || 'Not re-run yet',
    'Your review': r.review || REVIEW[r.id] || '',
    Comments: '',
    'How to rerun': r.rerun,
  };
});
const order = { High: 0, Medium: 1, Low: 2 };
out.sort(
  (a, b) =>
    a.Area.localeCompare(b.Area) || order[a.Severity] - order[b.Severity] || a['Bug ID'].localeCompare(b['Bug ID'])
);
out.forEach((r, i) => (r['#'] = i + 1));

fs.mkdirSync(path.join(root, 'report'), { recursive: true });
const ws = XLSX.utils.json_to_sheet(out);
ws['!cols'] = [4, 22, 11, 60, 70, 9, 18, 10, 16, 26, 40, 30, 60].map((w) => ({ wch: w }));
ws['!autofilter'] = { ref: ws['!ref'] };
const count = (k, v) => out.filter((r) => r[k] === v).length;
const summary = XLSX.utils.aoa_to_sheet([
  ['Bug review sheet', ''],
  ['Built', new Date().toISOString().slice(0, 10)],
  ['Total bugs', out.length],
  [
    'High / Medium / Low',
    `${count('Severity', 'High')} / ${count('Severity', 'Medium')} / ${count('Severity', 'Low')}`,
  ],
  [
    'Confirmed / Seen once - recheck',
    `${count('Confidence', 'Confirmed')} / ${count('Confidence', 'Seen once - recheck')}`,
  ],
  ['With video or screenshot', count('Video / screenshot', 'Yes')],
  ['', ''],
  [
    'How to read',
    'Each row: what the test checked (what should happen) and what actually happens. Fill "Your review" with Bug / Not a bug / Discuss.',
  ],
  [
    'Severity',
    'High = teacher loses data, or a harmful/oversized file is accepted, or an action runs twice. Low = wording, empty-state messages, cosmetic.',
  ],
  [
    'Confidence',
    '"Seen once - recheck" = failed in one sweep with no recorded bug reason yet; rerun before reporting.',
  ],
  [
    'Not included',
    'The 29 "excluded" rows of BUG_LIST.md (test account/environment problems) and the 3 "unverified" ones. PRE-03-01 was removed after review (not a bug).',
  ],
  [
    'Owner scope (29 Sep)',
    `Finger/touch gestures are not supported: ${[...NOT_SUPPORTED].join(', ')} removed. Quiz score and drawing tools on assets are improvements (sheet "Improvements").`,
  ],
  ['Server', 'Ultra server (Windows): http://172.18.2.85/teach/'],
]);
summary['!cols'] = [{ wch: 32 }, { wch: 120 }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, summary, 'Summary');
XLSX.utils.book_append_sheet(wb, ws, 'Bugs');
const imp = XLSX.utils.json_to_sheet(improvements);
imp['!cols'] = [{ wch: 12 }, { wch: 50 }, { wch: 90 }];
XLSX.utils.book_append_sheet(wb, imp, 'Improvements');
// The IDs to re-run on the Ultra server, for the revalidation run.
fs.writeFileSync(path.join(root, 'report', 'recheck-ids.txt'), out.map((r) => r['Bug ID']).join('\n'));
XLSX.writeFile(wb, path.join(root, 'report', 'BUG_REVIEW.xlsx'));

// Markdown copy, grouped by area.
const md = [
  '# Bug review',
  '',
  `${out.length} bugs -- High ${count('Severity', 'High')}, Medium ${count('Severity', 'Medium')}, Low ${count('Severity', 'Low')}. "Recheck" = seen in one sweep only.`,
  '',
];
for (const area of [...new Set(out.map((r) => r.Area))]) {
  md.push(
    `## ${area}`,
    '',
    '| # | ID | Should happen | What actually happens | Sev | Conf | Review |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  );
  for (const r of out.filter((x) => x.Area === area))
    md.push(
      `| ${r['#']} | ${r['Bug ID']} | ${r['What we checked (should happen)'].replace(/\|/g, '/')} | ${r['What actually happens'].replace(/\|/g, '/')} | ${r.Severity} | ${r.Confidence === 'Confirmed' ? 'Confirmed' : 'Recheck'} | ${r['Your review']} |`
    );
  md.push('');
}
fs.writeFileSync(path.join(root, 'report', 'BUG_REVIEW.md'), md.join('\n'));
console.log(
  `${out.length} bugs -> report/BUG_REVIEW.xlsx + report/BUG_REVIEW.md; missing "actual": ${out.filter((r) => r['What actually happens'].startsWith('(')).length}`
);
