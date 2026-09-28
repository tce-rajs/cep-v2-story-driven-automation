// Page Object for Attendance (Magnet -> Attendance).
//
// CONFIRMED LIVE (probe, 2026-09-26, v 0.0.232, primary account, Class 12A Physics):
// - The Magnet entry reads "Attendance" + a status badge ("Pending" before today's attendance is taken).
// - Opening shows today's date, "Tap Play to start taking attendance, or select Mark Attendance to complete it
//   quickly.", a Play Attendance button (.btn-start), Close and Mark Attendance. The old "hangs on its loading
//   spinner" bug no longer reproduces.
// - Mark Attendance shows the summary table (rows Boys / Girls / Total; columns P, Ab, T -- e.g.
//   "Boys 0 0 85 Girls 0 0 65 Total 150"), "Drag all the roll numbers to mark all as present. Tap on a roll number to
//   mark 'absent'.", a grid of .grid-cell roll numbers (150), and Close / Mark All Present / Done.
// - From the reference suites: after submitting, the buttons change to Edit Attendance / Submit Attendance; Edit
//   re-opens the register with the previous marks; a cell's state is its `present` / `absent` class; the class
//   teacher gets an attendance-close-dialog-* confirmation on Close.
// Everything here is real: marks and submits create today's attendance record (owner-approved 2026-09-26).

class AttendancePage {
  constructor(page) {
    this.page = page;
    this.container = page.locator('[data-qa-id="attendance-container"]');
    const btn = (text) => this.container.locator('button').filter({ hasText: text });

    this.playBtn = this.container.locator('.btn-start');
    this.markAttendanceBtn = btn(/^\s*Mark Attendance\s*$/);
    this.closeBtn = btn(/^\s*Close\s*$/);
    this.markAllPresentBtn = btn(/Mark All Present/);
    this.doneBtn = btn(/^\s*Done\s*$/);
    this.submitBtn = btn(/Submit Attendance/);
    this.editBtn = btn(/Edit Attendance/);
    this.resumeBtn = btn(/^\s*Resume\s*$/);
    this.resumeCancelBtn = btn(/^\s*Cancel\s*$/);
    this.fastForwardBtn = this.container.locator('button').filter({ hasText: 'fast_forward' });

    this.cells = this.container.locator('.attendance-grid .grid-cell, .grid-cell');
    this.summaryTable = this.container.locator('.attendance-summary-table');
    this.dragText = this.container.locator('.drag-text');
    this.spinner = this.container.locator('.spinner, .loader-container');

    this.carouselItems = this.container.locator('.carousel-item');
    this.activeCarouselItem = this.container.locator('.carousel-item.active, .carousel-item.current').first();
    this.progressRing = this.container.locator('.progress-ring');
    this.speedSelector = this.container.locator('.speed-selector');
    this.speedDisplay = this.container.locator('.speed-display');
    this.birthdayText = this.container.getByText(/birthday/i);

    this.closeDialogConfirmBtn = page.locator('[data-qa-id="attendance-close-dialog-confirm-btn"]');
    this.closeDialogCancelBtn = page.locator('[data-qa-id="attendance-close-dialog-cancel-btn"]');
    this.closeDialog = page.locator('[data-qa-id^="attendance-close-dialog"]').first();
  }

  /** Magnet -> Attendance, then wait until the register shows one of its entry states.
   * CONFIRMED LIVE (2026-09-26, v 0.0.232) -- the register opens in one of three states:
   *  - fresh day: Play Attendance / Mark Attendance;
   *  - a draft in progress (closed part-way): a "Resume Attendance -- resume marking from where you left off" prompt with
   *    Cancel / Resume. Resume always continues in Play Attendance (even if the draft was started with Mark Attendance);
   *    Cancel closes the whole panel and keeps the draft, so the prompt returns every time until the draft is submitted;
   *  - already submitted today: Edit Attendance / Submit Attendance. */
  async open(magnet) {
    await magnet.choose('attendance');
    await this.container.waitFor({ state: 'visible', timeout: 15000 });
    await this.markAttendanceBtn
      .or(this.editBtn)
      .or(this.submitBtn)
      .or(this.resumeBtn)
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });
  }

  async hasDraft() {
    return this.resumeBtn.isVisible().catch(() => false);
  }

  /** From whatever state the register opened in, get to a screen where students can be marked (the roster grid).
   * A draft is resumed and its roll call skipped to the end, which lands on the roster with Submit Attendance. */
  async startMarking() {
    if (await this.hasDraft()) {
      await this.resumeBtn.click();
      await this.fastForwardBtn.or(this.cells.first()).first().waitFor({ state: 'visible', timeout: 15000 });
      if (await this.fastForwardBtn.isVisible().catch(() => false)) await this.fastForwardBtn.click({ force: true });
    } else if (await this.editBtn.isVisible().catch(() => false)) {
      await this.editBtn.click({ force: true });
    } else if (await this.markAttendanceBtn.isVisible().catch(() => false)) {
      await this.markAttendanceBtn.click({ force: true });
    }
    await this.cells.first().waitFor({ state: 'visible', timeout: 20000 });
  }

  /** Mark everyone present, whichever marking screen is showing (Mark All Present, or tap the absent ones). */
  async markAllPresent() {
    if (await this.markAllPresentBtn.isVisible().catch(() => false)) {
      await this.markAllPresentBtn.click({ force: true });
      return;
    }
    const n = await this.cells.count();
    for (let i = 0; i < n; i++)
      if ((await this.cellState(i)) !== 'present') await this.cells.nth(i).click({ force: true });
  }

  async cellState(i) {
    const cls = (await this.cells.nth(i).getAttribute('class')) || '';
    if (/\babsent\b/.test(cls)) return 'absent';
    if (/\bpresent\b/.test(cls)) return 'present';
    return 'unmarked';
  }

  async tap(i) {
    await this.cells.nth(i).click({ force: true });
    await this.page.waitForTimeout(400);
  }

  /** Summary numbers: { boys: {p, ab, t}, girls: {...}, total: {...} } (Total may carry only T -- see the workbook). */
  async summary() {
    const text = (await this.summaryTable.innerText()).replace(/\s+/g, ' ');
    const row = (label) => {
      const m = text.match(new RegExp(`${label}\\s+(\\d+)(?:\\s+(\\d+))?(?:\\s+(\\d+))?`, 'i'));
      if (!m) return null;
      const nums = m
        .slice(1)
        .filter((x) => x !== undefined)
        .map(Number);
      return nums.length === 3 ? { p: nums[0], ab: nums[1], t: nums[2] } : { t: nums[nums.length - 1] };
    };
    return { boys: row('Boys'), girls: row('Girls'), total: row('Total'), text };
  }

  /** Counts of cells in each state, read from the grid itself. */
  async gridCounts() {
    return this.cells.evaluateAll((els) => {
      const out = { present: 0, absent: 0, unmarked: 0, total: els.length };
      for (const el of els) {
        if (el.classList.contains('absent')) out.absent++;
        else if (el.classList.contains('present')) out.present++;
        else out.unmarked++;
      }
      return out;
    });
  }

  /** Drag across the roster grid from the first cell to the last visible one. */
  async dragAcrossRoster() {
    const first = await this.cells.first().boundingBox();
    const cellsVisible = await this.cells.evaluateAll(
      (els) =>
        els.filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.bottom <= window.innerHeight && r.top >= 0;
        }).length
    );
    const last = await this.cells.nth(Math.max(0, cellsVisible - 1)).boundingBox();
    await this.page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(last.x + last.width / 2, last.y + last.height / 2, { steps: 30 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(800);
    return cellsVisible;
  }

  /** Done -> Submit Attendance. CONFIRMED LIVE (2026-09-26): Done shows the locked view (Edit Attendance / Submit
   * Attendance); Submit sends one POST .../tce-repo-api/1/res/v1/content/file and closes the whole panel. Reopening
   * then offers Edit Attendance. */
  async submit() {
    if (await this.doneBtn.isVisible().catch(() => false)) await this.doneBtn.click({ force: true });
    await this.submitBtn.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await this.submitBtn.filter({ visible: true }).first().click({ force: true });
    await this.container.waitFor({ state: 'hidden', timeout: 20000 });
  }

  async isOpen() {
    return this.container.isVisible().catch(() => false);
  }

  /** Close whatever attendance screen is open, confirming the close dialog if one appears. */
  async closeAll() {
    for (let i = 0; i < 3 && (await this.isOpen()); i++) {
      await this.closeBtn
        .first()
        .click({ force: true, timeout: 3000 })
        .catch(() => {});
      await this.closeDialogConfirmBtn.click({ force: true, timeout: 2000 }).catch(() => {});
      await this.page.waitForTimeout(800);
    }
  }
}

module.exports = { AttendancePage };
