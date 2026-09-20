// HDR-05 — Compass (Explore It / Analyse It)
// Source: CEPV2_Stories/04_Header.md
// Not automated (per PROCESS.md, Plan Mode is manual-only): HDR-05-05.
//
// Fixtures (config/moduleClassMap.js): 'compassBaseline' = Class 12A Physics chapter 1, where AnalyseIt and
// Revision Tests render; 'compassExploreIt' = the same class, chapter 4, where ExploreIt widgets render too;
// 'compassNoAnalyseIt' = Class 11A Mathematics, where AnalyseIt never does.

const { test, expect } = require('../../fixtures');

test.describe('HDR-05 Compass (Explore It / Analyse It)', () => {
  test.beforeEach(async ({ user }) => {
    await user.nav.applyClassMap('compassBaseline');
  });

  test(
    'HDR-05-01: the Compass icon opens with both "Explore It" and "Analyse It" options visible',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      // ExploreIt only renders where the chapter has widgets, so this needs the ExploreIt fixture, not the baseline.
      await user.nav.applyClassMap('compassExploreIt');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);

      await expect(user.compass.analyseItItem).toBeVisible();
      await expect(
        user.page
          .locator('.compass-menu.open')
          .getByText(/explore\s*it/i)
          .first()
      ).toBeVisible();
    }
  );

  test(
    'HDR-05-02: Compass shows a "Revision Test" section for topics that have one',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);
      await expect(user.compass.revisionTestsItem).toBeVisible();
    }
  );

  test(
    'HDR-05-03: Compass shows a "Homework" section for topics that have one',
    { tag: ['@functional'] },
    async ({ user }) => {
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);
      // Homework lives under Analyse It: it lists assignments, or reads "No Homework" when there are none.
      await expect(user.compass.analyseItItem).toBeVisible();
      await expect(user.page.locator('.compass-menu.open')).toContainText(/homework/i);
    }
  );

  test(
    'HDR-05-04: a topic without a Revision Test or Homework does not show those sections',
    { tag: ['@negative'] },
    async ({ user }) => {
      await user.nav.applyClassMap('compassNoAnalyseIt');
      const { opened } = await user.compass.openTrigger();
      expect(opened, 'Compass menu opened').toBe(true);

      // Conditional per topic: absent from the DOM entirely, not just hidden.
      await expect(user.compass.analyseItItem).toHaveCount(0);
      await expect(user.compass.revisionTestsItem).toHaveCount(0);
    }
  );
});
