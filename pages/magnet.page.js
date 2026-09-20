// Page Object for the Magnet quick-access menu and the panels it opens
// (Notice, Learning Shorts, Homework, Attendance).
//
// CONFIRMED LIVE in the previous suite: Magnet only exists after login, and WHICH items
// it lists is gated per class/subject (e.g. Attendance is absent on Class 11A Accountancy
// but present on Class 12A Physics/Mathematics) -- see the `attendance` and `compassBaseline`
// entries in config/moduleClassMap.js. Magnet-menu item ids: toolbar-magnet-gtAIWorksheet
// (Homework), toolbar-magnet-gtAttendance. CONFIRMED LIVE (v 0.0.223): Learning Shorts is
// toolbar-magnet-gtScreenRecord (NOT gtLearningShorts) and Notice is toolbar-magnet-gtAINotices.

class MagnetPage {
  constructor(page) {
    this.page = page;

    this.tool = page.locator('[data-qa-id="toolbar-tool-gtMagnet"]');

    // Menu items
    this.noticeItem = page.locator('[data-qa-id="toolbar-magnet-gtAINotices"]');
    this.learningShortsItem = page.locator('[data-qa-id="toolbar-magnet-gtScreenRecord"]');
    this.homeworkItem = page.locator('[data-qa-id="toolbar-magnet-gtAIWorksheet"]');
    this.attendanceItem = page.locator('[data-qa-id="toolbar-magnet-gtAttendance"]');

    // What each item opens
    this.noticeCaptureBanner = page.getByText(/capture the text area/i); // AI Notices drag-select mode
    this.learningShortsExitBtn = page.locator('[data-qa-id="learning-shorts-exit-btn"]'); // Learning Shorts recorder (CONFIRMED LIVE v 0.0.223; was exitBtn)
    this.homeworkSelectChapterBtn = page.locator('[data-qa-id="ai-homework-option-select-chapter-btn"]');
    this.attendanceContainer = page.locator('[data-qa-id="attendance-container"]');
  }

  async open() {
    await this.tool.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  /** Every menu entry the Magnet is expected to list, in the order the story names them. */
  get items() {
    return {
      notice: this.noticeItem,
      learningShorts: this.learningShortsItem,
      homework: this.homeworkItem,
      attendance: this.attendanceItem,
    };
  }

  /** What appears once each entry has been chosen. */
  get panels() {
    return {
      notice: this.noticeCaptureBanner,
      learningShorts: this.learningShortsExitBtn,
      homework: this.homeworkSelectChapterBtn,
      attendance: this.attendanceContainer,
    };
  }

  /** Open the menu and choose an entry ('notice' | 'learningShorts' | 'homework' | 'attendance').
   * CONFIRMED LIVE: the Homework item can take a few seconds to appear after the menu opens;
   * one re-open is attempted before giving up. */
  async choose(name) {
    const item = this.items[name];
    await this.open();
    let ready = await item.isVisible({ timeout: 5000 }).catch(() => false);
    if (!ready) {
      await this.tool.click({ force: true });
      await this.page.waitForTimeout(600);
      await this.tool.click({ force: true });
      ready = await item.isVisible({ timeout: 8000 }).catch(() => false);
    }
    await item.click({ force: true, timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { MagnetPage };
