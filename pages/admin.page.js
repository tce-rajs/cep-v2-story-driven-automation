// Page Object for the school Admin panel (`<server>/admin/`, "School Admin"). A plain web page, not part of the
// desktop client: specs drive it with Playwright's own browser page.
//
// Sign-in: "Organization Id" is an autocomplete of school names — type the start of the name and pick the school
// from its list (the open list covers the other fields until one is chosen). The session lives in sessionStorage, so
// a reload or a new tab shows the sign-in box again (Admin F-03): navigate by clicking, never by reloading.
//
// Writes (create / edit / reset / extend) are only ever made on teachers whose name starts with "AutoQA ". Every
// helper that writes checks that first.
//
// Credentials come from .env: ADMIN_URL, ADMIN_SCHOOL, ADMIN_USERNAME, ADMIN_PASSWORD.

require('dotenv').config({ quiet: true });

const ADMIN_URL = process.env.ADMIN_URL || 'http://172.18.2.85/admin/';
const AUTOQA = /^AutoQA /;

class AdminPage {
  constructor(page) {
    this.page = page;

    // --- Sign-in box ---
    this.signInInputs = page.locator('input:visible');
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.schoolSuggestions = page.locator('ng-autocomplete li');
    this.signInError = page.getByText(/Incorrect Org Id or User Id or Password/i);

    // --- Header / user menu ---
    this.appVersion = page.locator('.app-version');
    this.userToggle = page.locator('.userToggle');
    this.userNameText = page.locator('.userNameText');
    this.userMenu = page.locator('tce-user-options');
    this.signOutItem = page.locator('li.signOut');
    this.menuBuild = page.locator('.app-build');
    this.buildVersionLink = page.locator('.build-link').getByText('Build Version');

    // --- Dashboard ---
    this.dashboardTitle = page.locator('.planning-header').filter({ hasText: /DashBoard/i });
    this.overviewTab = page
      .locator('nb-action')
      .filter({ hasText: /^\s*overview\s*$/i, visible: true })
      .first();
    this.manageTab = page
      .locator('nb-action')
      .filter({ hasText: /^\s*manage\s*$/i, visible: true })
      .first();
    this.schoolSettingsButton = page.getByText(/^\s*School Settings\s*$/).filter({ visible: true });
    this.quickTiles = page.locator('.quick-action-card-title').filter({ visible: true });

    // --- Modals (ngb-modal) ---
    this.modal = page.locator('ngb-modal-window').last();
    this.modalClose = this.modal.locator('button.close').first();

    // --- Toasts ---
    this.toast = page.locator('.toast-message');

    // --- Lists ---
    this.searchBox = page.locator('#input-search-field').filter({ visible: true }).first();
    this.recordsFoundText = page.getByText(/Records Found/).first();
    this.teacherFilter = page.locator('ng-select.mydropdownNew');
    this.createTeacherButton = page.locator('.general-buttons').filter({ hasText: 'Create Teacher' });
    this.importTeacherButton = page.locator('.general-buttons').filter({ hasText: 'Import Teacher' });
    this.exportTeacherButton = page.locator('.general-buttons').filter({ hasText: 'Export Teacher' });
    this.schoolRowMenuButton = page.locator('#dropdownBasic1').first();
  }

  static get configured() {
    return Boolean(
      process.env.ADMIN_SCHOOL && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && process.env.ADMIN_URL
    );
  }

  static get url() {
    return ADMIN_URL;
  }

  /** Form control by its Angular formcontrolname, inside the open modal when there is one. */
  fc(name) {
    return this.page.locator(`[formcontrolname="${name}"]`).filter({ visible: true }).first();
  }

  // ---------------------------------------------------------------- sign in / out

  async openSignIn() {
    await this.page.goto(ADMIN_URL, { waitUntil: 'load', timeout: 60000 });
    await this.signInInputs.first().waitFor({ timeout: 30000 });
  }

  /** Fill the three fields. `school` is picked from the autocomplete when it is offered; an unknown school is typed
   * as it is (nothing to pick). */
  async fillSignIn({ school = process.env.ADMIN_SCHOOL, user = process.env.ADMIN_USERNAME, password } = {}) {
    if (password === undefined) password = process.env.ADMIN_PASSWORD;
    const inputs = this.signInInputs;
    if (school) {
      await inputs.nth(0).click();
      await inputs.nth(0).pressSequentially(school.slice(0, 8), { delay: 30 });
      const pick = this.schoolSuggestions.filter({ hasText: school }).first();
      if (
        await pick.waitFor({ timeout: 8000 }).then(
          () => true,
          () => false
        )
      )
        await pick.click();
      else {
        await inputs.nth(0).pressSequentially(school.slice(8), { delay: 10 });
        await this.page.keyboard.press('Escape');
      }
    }
    if (user) {
      await inputs.nth(1).focus();
      await inputs.nth(1).fill(user);
    }
    if (password) {
      await inputs.nth(2).focus();
      await inputs.nth(2).fill(password);
    }
  }

  /** Sign In is greyed out by a class (signInDisable), not always by the disabled attribute. */
  async isSignInEnabled() {
    const cls = (await this.signInButton.getAttribute('class')) || '';
    return (await this.signInButton.isEnabled()) && !/signInDisable|disabled/i.test(cls);
  }

  async signIn(creds = {}) {
    await this.openSignIn();
    await this.fillSignIn(creds);
    await this.dismissKeyboard();
    await this.signInButton.click();
    await this.dashboardTitle.first().waitFor({ timeout: 30000 });
  }

  async isSignedIn() {
    return this.userToggle.isVisible().catch(() => false);
  }

  /** Sign in again if the session was lost (reload, timeout); otherwise go back to the Dashboard. */
  async ensureSignedIn() {
    await this.closeAllModals();
    if (!(await this.isSignedIn())) await this.signIn();
    else await this.goDashboard();
  }

  async openUserMenu() {
    if (!(await this.userMenu.isVisible().catch(() => false))) await this.userToggle.click();
    await this.userMenu.waitFor({ timeout: 5000 });
  }

  async closeUserMenu() {
    if (await this.userMenu.isVisible().catch(() => false)) await this.userToggle.click();
  }

  async signOut() {
    await this.openUserMenu();
    await this.signOutItem.click();
    await this.signInButton.waitFor({ timeout: 20000 });
  }

  // ---------------------------------------------------------------- navigation

  /** The on-screen keyboard opens with every focused field and covers the buttons at the bottom of a form: turn it
   * off with its own "Disable Virtual Keyboard" option whenever it shows. */
  async dismissKeyboard() {
    const off = this.page.locator('.keyboard-wrapper .disable').filter({ visible: true });
    if (await off.count()) await off.first().click({ timeout: 3000 }).catch(() => {});
  }

  async closeAllModals() {
    await this.dismissKeyboard();
    await this.closeUserMenu().catch(() => {});
    for (let i = 0; i < 4; i++) {
      const open = this.page.locator('ngb-modal-window');
      if (!(await open.count())) return;
      const close = open
        .last()
        .locator('button.close, button:has-text("Close"), button:has-text("Back")')
        .filter({ visible: true });
      // A toast or the calendar can cover the button: never wait long, fall back to Escape and a forced click.
      const clicked = await close
        .first()
        .click({ timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        await this.page.keyboard.press('Escape');
        await close
          .first()
          .click({ timeout: 2000, force: true })
          .catch(() => {});
      }
      await this.page.waitForTimeout(600);
    }
  }

  async goDashboard() {
    await this.page.locator('.menu-title').filter({ hasText: 'DashBoard' }).click();
    await this.overviewTab.waitFor({ timeout: 15000 });
  }

  async openOverview() {
    await this.overviewTab.click();
    await this.page.getByText('School Statistics').waitFor({ timeout: 15000 });
  }

  async openManage() {
    await this.manageTab.click();
    await this.quickTiles.first().waitFor({ timeout: 15000 });
  }

  /** Quick Action tile: 'Manage School', 'Manage Teacher' or 'Academic Details'. */
  async openTile(name) {
    await this.openManage();
    await this.quickTiles.filter({ hasText: name }).click();
    await this.page.waitForTimeout(1500);
  }

  async openSchoolList() {
    await this.openTile('Manage School');
    await this.page.getByText('School’s List').waitFor({ timeout: 15000 });
  }

  async openTeachers() {
    await this.openTile('Manage Teacher');
    await this.page.getByText('Teacher’s List').waitFor({ timeout: 15000 });
    await this.recordsFoundText.waitFor({ timeout: 15000 });
  }

  async openAcademicDetails() {
    await this.openTile('Academic Details');
    await this.page.getByText(/Class Structure for Academic Year/).waitFor({ timeout: 20000 });
  }

  async openBuildVersion() {
    await this.buildVersionLink.click();
    await this.modal.getByText('Build Version').waitFor({ timeout: 15000 });
  }

  /** School Settings window from the Dashboard OVERVIEW, on the given tab. */
  async openSchoolSettings(tab = 'School Grades') {
    await this.openOverview();
    await this.schoolSettingsButton.click();
    await this.settingsTab(tab);
  }

  async settingsTab(tab) {
    await this.modal.getByRole('tab', { name: tab }).click();
    await this.page.waitForTimeout(1500);
  }

  /** School list row menu item: View School, Settings, Sync, View Sync Status, View Daily Report, View Monthly
   * Report. */
  async schoolMenu(item) {
    await this.schoolRowMenuButton.click();
    const items = this.page.locator('.dropdown-menu.show .dropdown-item');
    await items.first().waitFor({ timeout: 5000 });
    if (item) await items.filter({ hasText: item }).first().click();
    return items;
  }

  /** Whole text of View School, including the values of its (disabled) fields. Closes it again. */
  async viewSchoolText() {
    await this.openSchoolList();
    await this.schoolMenu('View School');
    await this.modal.getByText(/School Detail/).waitFor({ timeout: 15000 });
    await this.page.waitForTimeout(1000);
    const text = await this.modal.evaluate((m) =>
      [m.innerText, ...[...m.querySelectorAll('input, textarea')].map((e) => e.value)].join(' ')
    );
    await this.closeAllModals();
    return text.replace(/\s+/g, ' ');
  }

  // ---------------------------------------------------------------- tables

  /** Text of every body row of the visible table in `scope` (default: the open modal or the page), cells trimmed. */
  async tableRows(scope) {
    const root = scope || ((await this.page.locator('ngb-modal-window').count()) ? this.modal : this.page);
    const rows = root.locator('table tbody tr').filter({ visible: true });
    const out = [];
    for (const text of await rows.evaluateAll((trs) =>
      trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()))
    ))
      if (text.some((t) => t)) out.push(text);
    return out;
  }

  /** Rows of every page of a paged table (ngb-pagination), going back to page 1 first. */
  async allPagesRows(scope) {
    const root = scope || this.modal;
    const pager = root.locator('ngb-pagination');
    const pageLinks = pager.locator('a.page-link').filter({ hasText: /^\s*\d+\s*/ });
    const count = (await pager.count()) ? await pageLinks.count() : 0;
    if (!count) return this.tableRows(root);
    const all = [];
    for (let i = 0; i < count; i++) {
      await pageLinks.nth(i).click();
      await this.page.waitForTimeout(800);
      all.push(...(await this.tableRows(root)));
    }
    return all;
  }

  // ---------------------------------------------------------------- teachers

  async recordsFound() {
    const t = await this.recordsFoundText.innerText();
    return Number((t.match(/\d+/) || [NaN])[0]);
  }

  /** [fullName, username, teacherStatus, loginStatus] per listed row. */
  async teacherRows() {
    await this.page.waitForTimeout(800);
    return (await this.tableRows(this.page)).map((r) => r.slice(0, 4));
  }

  /** Type into Search key by key, as an admin does (the search runs on key-up). */
  async searchTeachers(text) {
    await this.searchBox.click();
    await this.searchBox.fill('');
    if (text) await this.searchBox.pressSequentially(text, { delay: 40 });
    await this.page.waitForTimeout(2500);
  }

  async filterTeachers(option) {
    await this.teacherFilter.click();
    await this.page
      .locator('.ng-dropdown-panel .ng-option')
      .filter({ hasText: new RegExp(`^\\s*${option}\\s*$`) })
      .click();
    await this.page.waitForTimeout(2500);
  }

  teacherRow(usernameOrName) {
    return this.page.locator('table tbody tr').filter({ hasText: usernameOrName }).first();
  }

  /** Open a teacher's row menu; with `item` also choose it (Edit, Reset Password, Reset PIN, Version History). */
  async teacherMenu(usernameOrName, item) {
    const row = this.teacherRow(usernameOrName);
    await row.waitFor({ timeout: 15000 });
    await row.locator('#context-menu').click();
    const items = this.page.locator('.contextMenuItem').filter({ visible: true });
    await items.first().waitFor({ timeout: 5000 });
    if (item)
      await items
        .filter({ hasText: new RegExp(`^\\s*${item}\\s*$`) })
        .first()
        .click();
    await this.page.waitForTimeout(1200);
    return items;
  }

  /** Find a teacher in the list via Search (the list may be longer than one screen). */
  async findTeacher(text) {
    await this.openTeachers();
    await this.searchTeachers(text);
    await this.teacherRow(text).waitFor({ timeout: 15000 });
  }

  static assertAutoQA(fullName) {
    if (!AUTOQA.test(fullName))
      throw new Error(`Refusing to change "${fullName}": only AutoQA teachers may be changed`);
  }

  /** Letters-only stamp unique per minute (names refuse digits): minutes since 2026-01-01 in base 26 + a random
   * letter. */
  static stamp() {
    let n = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 60000);
    let s = '';
    do {
      s = String.fromCharCode(97 + (n % 26)) + s;
      n = Math.floor(n / 26);
    } while (n > 0);
    s += String.fromCharCode(97 + Math.floor(Math.random() * 26));
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /** Step 1 of Create User / Edit User. Only the given fields are changed. */
  async fillUserDetails({ title, first, middle, last, email, contact, subject } = {}) {
    if (title) await this.fc('title').selectOption({ label: title });
    if (first !== undefined) await this.fc('first_name').fill(first);
    if (middle !== undefined) await this.fc('middle_name').fill(middle);
    if (last !== undefined) await this.fc('last_name').fill(last);
    if (email !== undefined) await this.fc('email').fill(email);
    if (contact !== undefined) await this.fc('contact').fill(contact);
    if (subject) {
      await this.fc('subjects').click();
      await this.page
        .locator('.ng-dropdown-panel .ng-option')
        .filter({ hasText: new RegExp(`^\\s*${subject}\\s*$`) })
        .first()
        .click();
      await this.page.keyboard.press('Escape');
    }
    // Leave the last field so its validation message shows.
    await this.modal.locator('h3').filter({ visible: true }).first().click();
    await this.dismissKeyboard();
  }

  get nextButton() {
    return this.modal.getByRole('button', { name: /^\s*Next\s*$/ });
  }

  get previousButton() {
    return this.modal.getByRole('button', { name: /^\s*Previous\s*$/ });
  }

  get submitButton() {
    return this.modal.getByRole('button', { name: /^\s*(Submit|Update|Save)\s*$/ }).first();
  }

  async openCreateTeacher() {
    await this.openTeachers();
    await this.createTeacherButton.click();
    await this.modal.getByText('Create User').waitFor({ timeout: 10000 });
  }

  /** Open Edit on an AutoQA teacher `d` ({ username, first, last }), apply step-1 `details` and step-2 `expiry` /
   * `active`, then Submit. Returns the toast text. */
  async editTeacher(d, { details = {}, expiry, active } = {}) {
    await this.openEdit(d.username, `${d.first} ${d.last}`);
    if (Object.keys(details).length) await this.fillUserDetails(details);
    await this.dismissKeyboard();
    await this.nextButton.click();
    await this.fc('username').waitFor({ timeout: 10000 });
    if (active !== undefined) await this.setLoginDetails({ active });
    if (expiry) await this.pickExpiryDate(expiry);
    await this.dismissKeyboard();
    await this.submitButton.click();
    const message = await this.toastText();
    await this.closeAllModals();
    return message;
  }

  /** Step 2: online access Allowed, status Active / In Active. */
  async setLoginDetails({ active = true } = {}) {
    await this.page.locator('[formcontrolname="online_access"]').first().check({ force: true });
    await this.page
      .locator('[formcontrolname="user_status"]')
      .nth(active ? 0 : 1)
      .check({ force: true });
  }

  /** The expiry field is read-only: choose the date in its calendar (ngb-datepicker with month + year lists and day
   * cells labelled like "Saturday, November 7, 2026"), as an admin would. */
  async openExpiryCalendar() {
    await this.fc('expiry_date').locator('xpath=following::button[1]').click();
    const dp = this.page.locator('ngb-datepicker').first();
    await dp.waitFor({ timeout: 10000 });
    return dp;
  }

  static dayLabel(d) {
    return `${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
  }

  async pickExpiryDate(date) {
    const dp = await this.openExpiryCalendar();
    const years = await dp.locator('select[title="Select year"] option').allInnerTexts();
    if (!years.map((y) => y.trim()).includes(String(date.getFullYear())))
      throw new Error(`Year ${date.getFullYear()} is not offered by the calendar`);
    await dp.locator('select[title="Select year"]').selectOption(String(date.getFullYear()));
    await dp.locator('select[title="Select month"]').selectOption(String(date.getMonth() + 1));
    await dp
      .locator(`[role="gridcell"][aria-label*="${AdminPage.dayLabel(date)}"]`)
      .first()
      .click();
    await this.page.waitForTimeout(500);
  }

  /** Create a teacher through both steps and Submit. Returns { username, message }. */
  async createTeacher({ first, last, email, contact = '9876543210', subject = 'Science', expiry, active = true }) {
    AdminPage.assertAutoQA(`${first} ${last}`);
    await this.openCreateTeacher();
    await this.fillUserDetails({ title: 'Mr', first, last, email, contact, subject });
    await this.dismissKeyboard();
    await this.nextButton.click();
    await this.fc('username').waitFor({ timeout: 10000 });
    await this.setLoginDetails({ active });
    await this.pickExpiryDate(expiry);
    const username = await this.fc('username').inputValue();
    await this.dismissKeyboard();
    await this.submitButton.click();
    const message = await this.toastText();
    await this.closeAllModals();
    return { username, message };
  }

  /** Validation messages shown in the open form. */
  async formMessages() {
    return (
      await this.modal
        .locator('.text-danger, .invalid-feedback, .error, .error-msg, small')
        .filter({ visible: true })
        .allInnerTexts()
        .catch(() => [])
    )
      .map((t) => t.trim())
      .filter(Boolean);
  }

  /** Text of the newest toast (waits for one). */
  async toastText(timeout = 10000) {
    await this.toast
      .first()
      .waitFor({ timeout })
      .catch(() => {});
    return (await this.toast.allInnerTexts().catch(() => [])).map((t) => t.trim()).join(' | ');
  }

  /** Open Edit for an AutoQA teacher (or read-only for any teacher when `readOnly`). */
  async openEdit(usernameOrName, fullName, { readOnly = false } = {}) {
    if (!readOnly) AdminPage.assertAutoQA(fullName);
    await this.findTeacher(usernameOrName);
    await this.teacherMenu(usernameOrName, 'Edit');
    await this.modal.getByText(/Edit User/).waitFor({ timeout: 10000 });
  }

  /** Confirm dialog of Reset PIN / Reset Password: returns its text, then presses Reset. */
  async resetFromMenu(usernameOrName, fullName, item) {
    AdminPage.assertAutoQA(fullName);
    await this.findTeacher(usernameOrName);
    await this.teacherMenu(usernameOrName, item);
    const dialog = this.page.locator('.modal-content').filter({ visible: true }).last();
    await dialog.waitFor({ timeout: 10000 });
    const text = (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    await dialog.getByRole('button', { name: /^\s*Reset\s*$/i }).click();
    const message = await this.toastText();
    await this.closeAllModals();
    return { dialog: text, message };
  }

  /** Version History rows (all pages): [version, operation, date, user]. */
  async versionHistory(usernameOrName) {
    await this.findTeacher(usernameOrName);
    await this.teacherMenu(usernameOrName, 'Version History');
    await this.modal.getByText(/Version Hist/).waitFor({ timeout: 10000 });
    return this.allPagesRows(this.modal);
  }

  /** Save a download started by `trigger` and return { path, name, text }. */
  async download(trigger, dir) {
    const fs = require('fs');
    const path = require('path');
    const wait = this.page.waitForEvent('download', { timeout: 30000 });
    await trigger();
    const dl = await wait;
    const file = path.join(dir, dl.suggestedFilename().replace(/[^\w.-]+/g, '_'));
    await dl.saveAs(file);
    const text = /\.(csv|txt)$/i.test(file) ? fs.readFileSync(file, 'utf8') : '';
    return { path: file, name: dl.suggestedFilename(), text };
  }

  async exportTeachers(dir) {
    await this.openTeachers();
    return this.download(() => this.exportTeacherButton.click(), dir);
  }

  // ---------------------------------------------------------------- sync

  /** View Sync Status rows: [[part, status], …]. Leaves the window open. */
  async syncStatus() {
    await this.closeAllModals();
    await this.schoolMenu('View Sync Status');
    await this.modal.getByText('Synchronization Status').waitFor({ timeout: 15000 });
    await this.page.waitForTimeout(1000);
    return (await this.tableRows(this.modal)).map((r) => r.slice(0, 2));
  }

  async lastSyncOn() {
    await this.openSchoolList();
    const row = await this.tableRows(this.page);
    return row[0][4];
  }
}

/** "09-10-2026 18:33:44:686" → Date. */
AdminPage.parseSyncDate = (s) => {
  const m = String(s).match(/(\d{1,2})-(\d{1,2})-(\d{4}) (\d{1,2}):(\d{2}):(\d{2})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]) : null;
};

/** Parse a CSV (quoted fields allowed) into an array of objects keyed by the header row. */
AdminPage.parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== '')) rows.push(row);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
};

module.exports = { AdminPage, ADMIN_URL };
