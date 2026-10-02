// Page Object for the header bar (logo, version, date/time) and the toolbar dock toggle.
// Locators confirmed live in Module 01 (signed-out) and in the previous suite (signed-in).

class HeaderPage {
  constructor(page) {
    this.page = page;

    this.logoContainer = page.locator('[data-qa-id="wb-header-logo-container"]');
    this.logoImage = page.locator('[data-qa-id="wb-header-logo-image"]');
    this.versionText = page.locator('[data-qa-id="wb-header-version-text"]');
    this.calendar = page.locator('[data-qa-id="wb-header-calendar-container"]');

    // --- Toolbar dock (left/right) ---
    this.dockToggle = page.locator('.leftRightBtn.left button, .leftRightBtn.right button').first();
    this.toolbarDockedLeft = page.locator('.toolbar-container.left');
    this.toolbarDockedRight = page.locator('.toolbar-container.right');
  }

  async viewportSize() {
    return this.page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  }

  /** "Sat, Sep 19" style date and "08:10 PM" style time as currently displayed, plus the
   * app's own idea of now (same machine clock), for comparing the two. */
  async readDateTime() {
    const shown = (await this.calendar.innerText()).replace(/\s+/g, ' ').trim();
    const time = shown.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)/i);
    const date = shown.match(/([A-Za-z]{3}),\s*([A-Za-z]{3})\s+(\d{1,2})/);
    const now = await this.page.evaluate(() => {
      const d = new Date();
      return {
        minutes: d.getHours() * 60 + d.getMinutes(),
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      };
    });
    let shownMinutes = null;
    if (time) {
      let hours = Number(time[1]) % 12;
      if (time[3].toUpperCase() === 'PM') hours += 12;
      shownMinutes = hours * 60 + Number(time[2]);
    }
    return {
      shown,
      shownMinutes,
      // The header pads the day ("Oct 01"); the clock's format does not ("Oct 1"). Compare the day as a number
      // (seen 2026-10-01: the first single-digit day this suite ran on).
      shownDate: date ? `${date[1]}, ${date[2]} ${Number(date[3])}` : null,
      nowMinutes: now.minutes,
      nowDate: now.date,
    };
  }

  /** Minutes between the displayed time and the real clock, wrapping around midnight. */
  static minuteGap(a, b) {
    const gap = Math.abs(a - b);
    return Math.min(gap, 1440 - gap);
  }

  async toggleDock() {
    await this.dockToggle.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  /** 'left' | 'right' | 'ambiguous' (neither or both docked -- a broken state). */
  async dockedSide() {
    const left = await this.toolbarDockedLeft.isVisible().catch(() => false);
    const right = await this.toolbarDockedRight.isVisible().catch(() => false);
    if (left && !right) return 'left';
    if (right && !left) return 'right';
    return 'ambiguous';
  }
}

module.exports = { HeaderPage };
