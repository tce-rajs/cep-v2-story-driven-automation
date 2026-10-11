// ADM-18-05 / ADM-18-10 / FLOW-24-05 — what the school admin set up is what the teacher gets in the classroom.
// Source: CEPV2_Stories/22_Admin.md, CEPV2_Stories/00_EndToEndFlows.md.
// The teacher side runs in the desktop client (raj.shinde); the Admin side in a separate browser (Admin is a web page).
// Read-only on both sides.

const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { AdminPage } = require('../../pages/admin.page');

test.use({ classMap: 'default' });

/** Sign in to Admin in its own browser, run `fn(admin)`, close the browser. */
async function withAdmin(fn) {
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
    const admin = new AdminPage(page);
    await admin.signIn();
    return await fn(admin);
  } finally {
    await browser.close();
  }
}

/** The grades the teacher can choose (All My Classes), e.g. ["Class 1", …, "Early Childhood Education"]. */
async function teacherGrades(user) {
  await user.nav.currentClassBtn.click({ force: true });
  await user.nav.allMyClassesTab.click({ timeout: 15000 });
  await user.nav.gradeButtons.first().waitFor({ timeout: 15000 });
  const grades = (await user.nav.gradeButtons.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  await user.page.keyboard.press('Escape');
  return grades;
}

test.describe('Admin set-up matches the classroom', () => {
  test.skip(!AdminPage.configured, 'set ADMIN_URL, ADMIN_SCHOOL, ADMIN_USERNAME and ADMIN_PASSWORD in .env');

  test(
    'ADM-18-05: the classes in Academic Details equal the classes teachers can choose in Teach Mode',
    { tag: ['@functional'] },
    async ({ user }) => {
      const adminText = await withAdmin(async (admin) => {
        await admin.openAcademicDetails();
        return (await admin.page.locator('body').innerText()).replace(/\s+/g, ' ');
      });
      const grades = await teacherGrades(user);
      // Every grade the teacher can open must exist in the school's class structure.
      const missing = grades.filter((g) => !adminText.toLowerCase().includes(g.toLowerCase()));
      expect(missing, 'grades offered in Teach Mode but absent from Academic Details').toEqual([]);
    }
  );

  // Active modules (View School) against what the teacher sees: Attendance → Magnet "Attendance"; Widgets → toolbar
  // Widgets tool. One test per module.
  for (const [module, label, probe] of [
    [
      'Attendance',
      'the Attendance entry in Magnet',
      async (user) => {
        await user.magnet.open();
        const shown = await user.magnet.attendanceItem.isVisible().catch(() => false);
        await user.page.keyboard.press('Escape');
        return shown;
      },
    ],
    [
      'Widgets',
      'the Widgets tool in the toolbar',
      async (user) =>
        user.page
          .locator('[data-qa-id="toolbar-tool-gtWidgets"]')
          .isVisible()
          .catch(() => false),
    ],
  ]) {
    for (const id of ['ADM-18-10', 'FLOW-24-05']) {
      test(
        `${id}: the ${module} module's state in View School matches ${label}`,
        { tag: ['@functional'] },
        async ({ user }) => {
          const view = await withAdmin((admin) => admin.viewSchoolText());
          const active = new RegExp(module, 'i').test((view.match(/Active Modules(.*?)(SPOC|$)/i) || [])[1] || '');
          const shown = await probe(user);
          expect(
            shown,
            `${module} is ${active ? 'active' : 'not active'} in Admin, so the teacher ${active ? 'has' : 'does not have'} ${label}`
          ).toBe(active);
        }
      );
    }
  }
});
