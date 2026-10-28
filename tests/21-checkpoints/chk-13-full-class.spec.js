// CHK-13 — The whole class (30 students) takes a test, and every report shows every student
// Source: CEPV2_Stories/21_Checkpoints.md
// Runs a fresh Revision Test (made by CHK-13-01) of the 'compassRevisionTest' topic (Class 10A Science) with every
// student of the class: the teacher starts it, all 30 students take it on the student test site (a few at a time, each with a
// different answer pattern), the teacher ends it, and the principal's Revision report is read. Each student's expected
// score is the sum of the marks the student site itself recorded for their answers. Everything measured is saved to a
// file and written into report/FULL_CLASS_TEST_<date>.html, with screenshots in report/full-class/.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('../../fixtures');
const { getClassMap } = require('../../config/moduleClassMap');
const { startCheckpoint, endCheckpoint, rosterCounts, openStudentSite } = require('./chk-helpers');
const { createFreshRevisionTest } = require('./fresh-revision-test');

// Run options (environment): FULL_CLASS_KIND = revision (Compass Revision Test, default) or baseline (a checkpoint
// in the Playlist); FULL_CLASS_PATTERN = mixed (default; each student a different pattern) or bands (a third answer
// everything right, a third half right, a third everything wrong); FULL_CLASS_NAME names the report;
// FULL_CLASS_PRINCIPAL_TRIES = how many times to check the principal's report, 2 minutes apart (default 15).
const KIND = process.env.FULL_CLASS_KIND || 'revision';
const PATTERN = process.env.FULL_CLASS_PATTERN || 'mixed';
const NAME = process.env.FULL_CLASS_NAME || '';
const PRINCIPAL_TRIES = Number(process.env.FULL_CLASS_PRINCIPAL_TRIES || 15);
const CLASS_KEY = KIND === 'baseline' ? 'checkpoints' : 'compassRevisionTest';
const RT_CLASS = getClassMap(CLASS_KEY);
const GRADE = RT_CLASS.grade;
const DIVISION = `Division ${RT_CLASS.division}`;
const CLASS_SIZE = 30;
const PARALLEL = Number(process.env.FULL_CLASS_PARALLEL || 5);
// The test the run uses: FULL_CLASS_TITLE (and FULL_CLASS_QUESTIONS) name one; otherwise a revision run creates a
// fresh Revision Test in CHK-13-01 (tests/21-checkpoints/fresh-revision-test.js), so no student has signed in to it yet.
const NAMED_CARD = process.env.FULL_CLASS_TITLE
  ? { title: process.env.FULL_CLASS_TITLE, questions: process.env.FULL_CLASS_QUESTIONS || "4 Q'S" }
  : null;
/** The run's test card: the named one, the fresh one CHK-13-01 made, or (baseline runs) the "Test" checkpoint. */
const testCard = () => NAMED_CARD || readState().test || { title: 'Test', questions: "4 Q'S" };

const ROOT = path.join(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'report', 'full-class', NAME);
const STATE = path.join(os.tmpdir(), `chk-13-full-class${NAME ? '-' + NAME : ''}.json`);
const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { students: [] });
const writeState = (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 2));
/** A student who took the test in this run (not refused, not one who took it in an earlier run). */
const tookIt = (x) => !x.error && !x.earlier;
const flat = (t) => t.replace(/\s+/g, ' ').trim();

test.describe('CHK-13 The whole class takes a test', () => {
  test.use({ classMap: CLASS_KEY });

  const card = (user) =>
    user.compass.revisionTestCards.filter({ hasText: testCard().title }).filter({ hasText: testCard().questions });

  const openTest = async (user) => {
    if (KIND === 'baseline') {
      const playlistCard = user.playlist.resourceCards
        .filter({ hasText: testCard().title })
        .filter({ hasText: testCard().questions })
        .first();
      await expect(playlistCard, `set-up: checkpoint "${testCard().title}" (${testCard().questions})`).toBeAttached({
        timeout: 20000,
      });
      await user.player.openResourceCard(playlistCard);
      const pl = user.player;
      await expect(
        pl.checkpointTimerBadge.or(pl.checkpointResumeBtn).or(pl.checkpointModeOnlineBtn).first()
      ).toBeVisible({ timeout: 20000 });
      return;
    }
    const { opened } = await user.compass.openTrigger();
    expect(opened, 'set-up: the Compass menu opened').toBe(true);
    await user.compass.revisionTestsItem.click({ force: true });
    // Two cards can share the title; the question count tells them apart.
    const match = card(user).filter({ hasNotText: 'Test2' });
    await expect(match.first(), `set-up: Revision Test "${testCard().title}" (${testCard().questions})`).toBeVisible({
      timeout: 20000,
    });
    await match.first().click({ force: true });
    const p = user.player;
    await expect(p.checkpointTimerBadge.or(p.checkpointResumeBtn).or(p.checkpointModeOnlineBtn).first()).toBeVisible({
      timeout: 20000,
    });
  };

  const reloadTeacher = async (user) => {
    await user.page.reload();
    await expect(user.login.avatar).toBeVisible({ timeout: 30000 });
    await user.nav.applyClassMap(CLASS_KEY);
  };

  /** The marks the student site recorded for an answer (from the ATTEMPT request it sends). */
  const marksOf = (response) => {
    const event = JSON.parse(response.request().postData() || '{}');
    return Number(JSON.parse(event.answerMetadata || '{}').marksObtained) || 0;
  };

  /** Answer the current question right (want = 1) or wrong (want = 0), trying options until the site agrees. */
  const answerAs = async (student, want, options) => {
    for (let o = 0; o < options; o++) {
      const got = marksOf(await student.answer(o)) > 0 ? 1 : 0;
      if (got === want) return;
    }
  };

  /** What the student in this position of the class aims for on question i: 1 right, 0 wrong, null = pattern. */
  const aim = (roll, i) => {
    if (PATTERN === 'allpass') return 1;
    if (PATTERN === 'allfail') return 0;
    if (PATTERN !== 'bands') return null;
    if (roll <= CLASS_SIZE / 3) return 1;
    if (roll <= (2 * CLASS_SIZE) / 3) return i % 2 === 0 ? 1 : 0;
    return 0;
  };

  /** One student (by roll number) takes the test with the run's answer pattern. */
  const takeAsStudent = async (browser, roll) => {
    const { context, student } = await openStudentSite(browser);
    const marks = new Map();
    student.page.on('request', (r) => {
      const body = r.postData() || '';
      if (!/client\/attempts/.test(r.url()) || !/"ATTEMPT"/.test(body)) return;
      const event = JSON.parse(body);
      const meta = JSON.parse(event.answerMetadata || '{}');
      marks.set(event.questionId, Number(meta.marksObtained) || 0);
    });
    const row = { roll };
    try {
      await student.chooseClass(GRADE, DIVISION);
      const r = await student.checkRoll(roll);
      if (!r.ok) {
        const why = r.body.errorMessage || String(r.status);
        if (/already/i.test(why)) row.earlier = why;
        else row.error = `sign-in refused: ${why}`;
        return row;
      }
      await student.studentName.filter({ hasText: /\S/ }).waitFor({ timeout: 10000 });
      row.name = (await student.studentName.innerText()).trim();
      await student.startMission();
      let total = 0;
      for (let i = 0; i < 50; i++) {
        total++;
        const options = await student.answerOptions.count();
        const want = aim(roll, i);
        if (want === null) await student.answer((roll + i) % Math.max(options, 1));
        else await answerAs(student, want, options);
        if (!(await student.nextQuestionBtn.isVisible())) break;
        await student.nextQuestionBtn.click();
        await student.page.waitForTimeout(800);
      }
      await student.endMission();
      await expect(student.resultScore).toBeVisible({ timeout: 30000 });
      row.shown = flat(await student.resultScore.innerText());
      row.total = total;
      row.expected = [...marks.values()].reduce((a, b) => a + b, 0);
      const m = row.shown.match(/Score:\s*(\d+)\s*\/\s*(\d+)/);
      row.screenScore = m ? Number(m[1]) : null;
      row.screenOutOf = m ? Number(m[2]) : null;
      if (roll === 1) await student.page.screenshot({ path: path.join(SHOTS, 'student-result-roll-1.png') });
    } catch (e) {
      row.error = e.message.split('\n')[0];
    } finally {
      await context.close();
    }
    return row;
  };

  test('CHK-13-01: the teacher starts the test for the class', { tag: ['@functional'] }, async ({ user }) => {
    test.setTimeout(360000);
    fs.rmSync(STATE, { force: true });
    fs.mkdirSync(SHOTS, { recursive: true });
    if (!NAMED_CARD && KIND === 'revision') writeState({ test: await createFreshRevisionTest(user) });
    await openTest(user);
    await startCheckpoint(user, 'online');
    await expect(user.player.checkpointEndBtn).toBeAttached();
    writeState({ startedAt: new Date().toISOString(), test: testCard() });
  });

  test(
    'CHK-13-02: all 30 students take the test and see their own correct score',
    { tag: ['@regression'] },
    async ({ browser }) => {
      test.setTimeout(40 * 60 * 1000);
      const rolls = Array.from({ length: CLASS_SIZE }, (_, i) => i + 1);
      const students = [];
      for (let i = 0; i < rolls.length; i += PARALLEL) {
        const batch = await Promise.all(rolls.slice(i, i + PARALLEL).map((r) => takeAsStudent(browser, r)));
        students.push(...batch);
        writeState({ students });
      }
      const failed = students.filter((s) => s.error);
      const wrong = students.filter((s) => tookIt(s) && (s.screenScore !== s.expected || s.screenOutOf !== s.total));
      expect(
        failed.map((s) => `${s.roll}: ${s.error}`),
        'every student could take the test'
      ).toEqual([]);
      expect(
        wrong.map((s) => `${s.roll} ${s.name}: screen ${s.shown}, expected ${s.expected}/${s.total}`),
        'every student sees the score their answers earned'
      ).toEqual([]);
    }
  );

  // While the test is still running: a student who has submitted signs in again.
  test('CHK-13-05: no student can take the test twice', { tag: ['@negative'] }, async ({ browser }) => {
    const took = readState().students.filter(tookIt);
    test.skip(!took.length, 'Needs a student who took the test in CHK-13-02');
    const { context, student } = await openStudentSite(browser);
    try {
      await student.chooseClass(GRADE, DIVISION);
      const again = await student.checkRoll(took[0].roll);
      expect(again.ok, `roll ${took[0].roll} (${took[0].name}) is refused a second time`).toBe(false);
    } finally {
      await context.close();
    }
  });

  test(
    'CHK-13-03: the teacher’s roster shows all 30 submitted, and the summary counts all 30',
    { tag: ['@regression'] },
    async ({ user }) => {
      test.setTimeout(240000);
      const { students } = readState();
      const took = students.filter(tookIt).length;
      await openTest(user);
      // The roster can fill in over a few seconds; wait up to a minute, then record it and end the test either way,
      // so a wrong count is reported without leaving the test running.
      await expect
        .poll(async () => (await rosterCounts(user))?.submitted ?? -1, { timeout: 60000 })
        .toBe(took)
        .catch(() => {});
      const roster = await rosterCounts(user);
      writeState({ roster });
      await user.page.screenshot({ path: path.join(SHOTS, 'teacher-roster.png') });
      expect.soft(roster && roster.submitted, 'the roster shows every student who took it as Submitted').toBe(took);
      await endCheckpoint(user);
      await reloadTeacher(user);
      await openTest(user);
      await expect(user.page.getByText(/\d+\s*\/\s*\d+\s*Students/).first()).toBeVisible({ timeout: 30000 });
      await user.page.waitForTimeout(3000);
      const text = flat(await user.page.locator('body').innerText());
      await user.page.screenshot({ path: path.join(SHOTS, 'teacher-summary.png') });
      const attempted = text.match(/(\d+)\s*\/\s*(\d+)\s*Students/);
      const avg = text.match(/AVG\.?\s*SCORE:\s*(\d+)%/i);
      const concepts = [...text.matchAll(/([A-Z][^%]{2,60}?)\s+\d+\s+STUDENTS MASTERED\s+(\d+)%/g)].map((m) => ({
        concept: m[1].trim(),
        percent: Number(m[2]),
      }));
      writeState({
        teacher: {
          attempted: attempted && attempted[1],
          of: attempted && attempted[2],
          avg: avg && Number(avg[1]),
          concepts,
        },
      });
      expect(Number(attempted[1]), 'the summary counts every student who took it').toBe(took);
      const expectedAvg =
        students.filter(tookIt).reduce((a, s) => a + (100 * s.expected) / s.total, 0) / Math.max(took, 1);
      expect(
        Math.abs(Number(avg[1]) - expectedAvg),
        `teacher average ${avg[1]}%, expected ${expectedAvg.toFixed(1)}%`
      ).toBeLessThanOrEqual(1);
    }
  );

  test(
    'CHK-13-04: the principal’s Revision report lists all 30 students with their own percentages',
    { tag: ['@regression'] },
    async ({ app }) => {
      test.setTimeout(40 * 60 * 1000);
      const { students } = readState();
      const took = students.filter(tookIt);
      await app.guest.open();
      await app.signIn(process.env.PRINCIPAL_PIN);
      await app.compass.switchToPlanningMode();
      await app.page.waitForTimeout(5000);
      await app.plan.openReport('Assessment for Learning');
      const read = async () => {
        await (KIND === 'baseline' ? app.plan.aflBaselineBtn : app.plan.aflRevisionBtn).click();
        await app.page.waitForTimeout(2500);
        await app.plan.aflGradeSelect.selectOption({ label: GRADE });
        await app.page.waitForTimeout(2500);
        await app.plan.aflClassSelect.selectOption({ label: DIVISION });
        await app.page.waitForTimeout(2500);
        await app.plan.aflSubjectSelect.selectOption({ label: RT_CLASS.subject });
        await app.page.waitForTimeout(3000);
        // Several revision assessments can share the title: choose each until one lists these students.
        const options = await app.plan.optionsOf(app.plan.aflAssessmentSelect);
        let best = null;
        for (let i = 0; i < options.length; i++) {
          if (options[i] !== testCard().title) continue;
          await app.plan.aflAssessmentSelect.selectOption({ index: (i + 1) % options.length });
          await app.page.waitForTimeout(2000);
          await app.plan.aflAssessmentSelect.selectOption({ index: i });
          await app.page.waitForTimeout(5000);
          // Only some performance bands are open, and a band's open state is kept when the assessment changes: toggle
          // each band and keep whichever reading lists the most students.
          // Rows read "Name Section 10A 50%"; the Advanced band shows cards laid out differently, so anything short
          // between the name and the first percentage is accepted.
          const countListed = (t) => took.filter((s) => new RegExp(`${s.name}[^%]{0,60}?\\d+%`).test(t)).length;
          let text = flat(await app.page.locator('body').innerText());
          for (const band of ['Needs Support', 'Developing', 'Proficient', 'Advanced']) {
            if (countListed(text) >= took.length) break;
            await app.page
              .getByText(new RegExp(`^\\s*${band}\\s*$`))
              .first()
              .click({ force: true, timeout: 3000 })
              .catch(() => {});
            await app.page.waitForTimeout(800);
            const now = flat(await app.page.locator('body').innerText());
            if (countListed(now) >= countListed(text)) text = now;
            else {
              // That click closed an open band: open it again.
              await app.page
                .getByText(new RegExp(`^\\s*${band}\\s*$`))
                .first()
                .click({ force: true, timeout: 3000 })
                .catch(() => {});
              await app.page.waitForTimeout(800);
            }
          }
          // Read once more with every band in its final state.
          const final = flat(await app.page.locator('body').innerText());
          if (countListed(final) >= countListed(text)) text = final;
          const listed = countListed(text);
          // Several assessments can share the title and the same students: keep the one whose students' percentages
          // best match the scores measured in this run.
          if (listed > 0) {
            const misses = took.filter((s) => {
              const m = text.match(new RegExp(`${s.name}[^%]{0,60}?(\\d+)%`));
              return !m || Math.abs(Number(m[1]) - Math.round((100 * s.expected) / s.total)) > 1;
            }).length;
            if (!best || misses < best.misses) best = { text, listed, misses };
          }
        }
        return best ? { text: best.text, listed: best.listed } : { text: '', listed: 0 };
      };
      // The Revision report can take a while to fill in after the students submit: check again every 2 minutes.
      let result = { text: '', listed: 0 };
      for (let attempt = 0; attempt < PRINCIPAL_TRIES && result.listed < took.length; attempt++) {
        if (attempt) {
          await app.page.waitForTimeout(120000);
          // A short server outage only skips this check; the next one tries again.
          const reloaded = await app.page
            .reload({ timeout: 60000 })
            .then(() => true)
            .catch(() => false);
          if (!reloaded) continue;
          await app.page.waitForTimeout(6000);
          const opened = await app.plan
            .openReport('Assessment for Learning')
            .then(() => true)
            .catch(() => false);
          if (!opened) continue;
        }
        result = await read().catch(() => result);
      }
      await app.page.screenshot({ path: path.join(SHOTS, 'principal-report.png'), fullPage: true });
      const principal = took.map((s) => {
        const m = result.text.match(new RegExp(`${s.name}[^%]{0,60}?(\\d+)%`));
        return { roll: s.roll, percent: m ? Number(m[1]) : null };
      });
      const learners = result.text.match(/(\d+)\s+learners/);
      const overall = result.text.match(/OVERALL MASTERY\s+\S+\s+(\d+)\s*%/);
      writeState({
        principal,
        principalLearners: learners && Number(learners[1]),
        principalOverall: overall && Number(overall[1]),
      });
      expect(
        principal.filter((p) => p.percent === null).map((p) => p.roll),
        'every student is in the principal report'
      ).toEqual([]);
      const off = took.filter((s, i) => Math.abs(principal[i].percent - Math.round((100 * s.expected) / s.total)) > 1);
      expect(
        off.map((s) => s.roll),
        'every student’s percentage matches their score'
      ).toEqual([]);
    }
  );

  test.afterAll(async () => {
    // Write the report from whatever was measured, even if a step above failed.
    const s = readState();
    if (!s.students || !s.students.length) return;
    const esc = (t) =>
      String(t ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;');
    const pct = (st) => (st.total ? Math.round((100 * st.expected) / st.total) : null);
    const rows = s.students
      .map((st) => {
        const p = (s.principal || []).find((x) => x.roll === st.roll);
        const screenOk = tookIt(st) && st.screenScore === st.expected && st.screenOutOf === st.total;
        const principalOk = p && p.percent !== null && Math.abs(p.percent - pct(st)) <= 1;
        return `<tr><td>${st.roll}</td><td>${esc(st.name || '')}</td><td>${tookIt(st) ? `${st.expected} / ${st.total}` : '—'}</td><td>${esc(st.error || (st.earlier ? `Took it in an earlier run (${st.earlier})` : st.shown))}</td><td class="${screenOk ? 'ok' : 'bad'}">${screenOk ? 'Match' : 'Mismatch'}</td><td>${p && p.percent !== null ? `${p.percent}%` : 'Not listed'}</td><td class="${principalOk ? 'ok' : 'bad'}">${principalOk ? 'Match' : 'Mismatch'}</td></tr>`;
      })
      .join('\n');
    const t = s.teacher || {};
    const took = s.students.filter(tookIt);
    const expectedAvg = took.length ? took.reduce((a, x) => a + (100 * x.expected) / x.total, 0) / took.length : 0;
    const img = (f) =>
      fs.existsSync(path.join(SHOTS, f))
        ? `<figure><img src="full-class/${NAME ? NAME + '/' : ''}${f}" alt="${f}"><figcaption>${f}</figcaption></figure>`
        : '';
    const date = new Date().toISOString().slice(0, 10);
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Full class test ${date}</title><style>
:root{--bg:#f7f7f5;--card:#fff;--text:#1d1d1f;--muted:#666;--line:#e3e3e0;--ok:#1f7a3a;--bad:#b3261e;--head:#f0f0ec}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141414;--card:#1e1e1e;--text:#eee;--muted:#aaa;--line:#333;--ok:#5cc27a;--bad:#ff7b72;--head:#262626}}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1100px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:26px 0 8px}.sub{color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}.card b{display:block;font-size:20px}.card span{color:var(--muted);font-size:13px}
.wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);font-size:14px}th,td{text-align:left;padding:6px 9px;border-bottom:1px solid var(--line)}th{background:var(--head);font-size:12px;color:var(--muted);text-transform:uppercase}
.ok{color:var(--ok);font-weight:600}.bad{color:var(--bad);font-weight:600}figure{margin:12px 0}img{max-width:100%;border:1px solid var(--line);border-radius:8px}figcaption{color:var(--muted);font-size:12px}
</style></head><body><main>
<h1>Full class test — Class 10A Science, ${KIND === 'baseline' ? 'checkpoint' : 'Revision Test'} “${esc(s.test && s.test.title)}” (${esc(s.test && s.test.questions)})</h1>
<div class="sub">Combination: ${{ bands: 'rolls 1–10 answer every question right, 11–20 about half right, 21–30 every question wrong', allpass: 'every student attempts and answers every question right', allfail: 'every student attempts and answers every question wrong' }[PATTERN] || 'each student a different answer pattern'}${s.students.some((x) => x.earlier) ? '; students who took it in an earlier run are shown as such' : ''} · Build v0.0.236 · Ultra server 172.18.2.85 · teacher raj.shinde · principal satyajit.p · started ${esc(s.startedAt)}</div>
<div class="cards">
<div class="card"><b>${took.length} / ${s.students.length}</b><span>Students who took the test</span></div>
<div class="card"><b>${s.students.filter((x) => tookIt(x) && x.screenScore === x.expected).length} / ${took.length}</b><span>Student screens with the correct score</span></div>
<div class="card"><b>${t.attempted ?? '—'} / ${t.of ?? '—'}</b><span>Teacher summary: attempted</span></div>
<div class="card"><b>${t.avg ?? '—'}% (expected ${expectedAvg.toFixed(1)}%)</b><span>Teacher average score</span></div>
<div class="card"><b>${(s.principal || []).filter((p) => p.percent !== null).length} / ${took.length}</b><span>Students in the principal’s report</span></div>
<div class="card"><b>${s.principalLearners ?? '—'} learners, ${s.principalOverall ?? '—'}%</b><span>Principal: learners and overall mastery</span></div>
</div>
<h2>Every student</h2>
<p class="sub">Expected score = the marks the student site recorded for the student’s own answers. Each student answered with a different pattern.</p>
<div class="wrap"><table><tr><th>Roll</th><th>Name</th><th>Expected</th><th>Student result screen</th><th>Screen</th><th>Principal report</th><th>Principal</th></tr>
${rows}
</table></div>
${t.concepts && t.concepts.length ? `<h2>Teacher’s concept mastery</h2><div class="wrap"><table><tr><th>Concept</th><th>Mastery</th></tr>${t.concepts.map((c) => `<tr><td>${esc(c.concept)}</td><td>${c.percent}%</td></tr>`).join('')}</table></div>` : ''}
<h2>Screenshots</h2>
${img('student-result-roll-1.png')}${img('teacher-roster.png')}${img('teacher-summary.png')}${img('principal-report.png')}
</main></body></html>`;
    fs.writeFileSync(path.join(ROOT, 'report', `FULL_CLASS_TEST_${NAME || date}.html`), html);
  });
});
