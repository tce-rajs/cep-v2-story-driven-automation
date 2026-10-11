// Teach ↔ Plan round trips — cases that were excluded while Plan Mode was out of scope (review, 10 Oct 2026):
// LOG-01-11, HDR-06-01, WB-06-06, NAV-01-06, NAV-05-03, NAV-05-04.
// Source: CEPV2_Stories/03_Login.md, 04_Header.md, 06_Whiteboard.md, 07_ClassNavigation.md.
// Writing happens in fresh space below the teacher's content (WB-06-06); nothing is erased.

const { test, expect } = require('../../fixtures');
const { layoutHandwriting } = require('../../pages/lib/handwriting');

test.use({ classMap: 'default' });

const label = async (user) => ({
  cls: ((await user.nav.currentClassBtn.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim(),
  topic: ((await user.nav.currentChapterTopicBtn.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim(),
});

/** Teach → Plan → Teach; fails the test if either switch does not happen. */
async function roundTrip(user) {
  const toPlan = await user.compass.switchToPlanningMode();
  expect(toPlan.switched, 'switched to Plan Mode').toBe(true);
  const toTeach = await user.compass.switchToTeachingMode();
  expect(toTeach.switched, 'switched back to Teach Mode').toBe(true);
  await user.nav.currentClassBtn.waitFor({ state: 'visible', timeout: 30000 });
  await user.page.waitForTimeout(1500);
}

test.describe('Teach ↔ Plan round trips', () => {
  test(
    'LOG-01-11: sign-in state and grade/subject context survive a Teach↔Plan switch',
    { tag: ['@regression'] },
    async ({ user }) => {
      const before = await label(user);
      await roundTrip(user);
      await expect(user.login.avatar, 'still signed in').toBeVisible();
      expect((await label(user)).cls, 'same grade and subject').toBe(before.cls);
    }
  );

  test(
    'NAV-01-06: grade selection carries over across a Teach↔Plan switch',
    { tag: ['@regression'] },
    async ({ user }) => {
      const before = await label(user);
      await roundTrip(user);
      expect((await label(user)).cls, 'the chosen grade is kept').toBe(before.cls);
    }
  );

  test(
    'NAV-05-03: switching from Teach Mode to Plan Mode and back returns to the same topic',
    { tag: ['@regression'] },
    async ({ user }) => {
      const before = await label(user);
      await roundTrip(user);
      expect((await label(user)).topic, 'same topic').toBe(before.topic);
    }
  );

  test(
    'NAV-05-04: switching from Plan Mode to Teach Mode and back returns to the same Plan Mode page',
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const toPlan = await user.compass.switchToPlanningMode();
      expect(toPlan.switched, 'set-up: in Plan Mode').toBe(true);
      await page.waitForTimeout(3000);
      const planUrl = page.url().split('?')[0];
      const toTeach = await user.compass.switchToTeachingMode();
      expect(toTeach.switched, 'switched to Teach Mode').toBe(true);
      const back = await user.compass.switchToPlanningMode();
      expect(back.switched, 'switched back to Plan Mode').toBe(true);
      await page.waitForTimeout(3000);
      expect(page.url().split('?')[0], 'the same Plan Mode page').toBe(planUrl);
      await user.compass.switchToTeachingMode().catch(() => {});
    }
  );

  test(
    "HDR-06-01: the header's Profile entry point opens in Plan Mode",
    { tag: ['@regression'] },
    async ({ user, page }) => {
      const toPlan = await user.compass.switchToPlanningMode();
      expect(toPlan.switched, 'set-up: in Plan Mode').toBe(true);
      try {
        await page.waitForTimeout(3000);
        // The Plan Mode header shows the teacher's photo and name with a dropdown arrow (top right).
        const profile = page.locator('img.userImg').filter({ visible: true }).first();
        await expect(profile, 'a Profile entry point in the Plan Mode header').toBeVisible({ timeout: 15000 });
        await profile.click();
        await expect(
          page
            .getByText(/profile|change password|change pin|sign out/i)
            .filter({ visible: true })
            .first(),
          'the Profile menu opens'
        ).toBeVisible({ timeout: 10000 });
      } finally {
        await page.keyboard.press('Escape').catch(() => {});
        await user.compass.switchToTeachingMode().catch(() => {});
      }
    }
  );

  test.describe('board content', () => {
    test.use({ freshSpace: true });

    test(
      'WB-06-06: content added in Teach Mode is still there after a Teach↔Plan round trip',
      { tag: ['@regression'] },
      async ({ user }) => {
        const area = await user.content.writingArea();
        await user.content.writeHandwriting(layoutHandwriting('round trip', { ...area, height: 120 }, { seed: 33 }));
        await user.content.waitForSaved().catch(() => {});
        const before = await user.content.pathGeometry();
        await roundTrip(user);
        const after = await user.content.pathGeometry();
        const missing = before.filter((p) => !after.includes(p));
        expect(missing.length, 'every stroke written before the round trip is still on the board').toBe(0);
      }
    );
  });
});
