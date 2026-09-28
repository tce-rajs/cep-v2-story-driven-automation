// PRF-01 — Open the profile; PRF-02 — Choose preferred resource types; PRF-03 — Manage teaching subjects
// Source: CEPV2_Stories/17_Profile.md
// Runs on the primary account; every change is undone before the test ends.

const { test, expect } = require('../../fixtures');

test.describe('PRF-01 Open the profile', () => {
  test.afterEach(async ({ app }) => {
    await app.profile.closeWindow().catch(() => {});
  });

  test(
    'PRF-01-01: the "Signed in as" chevron opens User Profile with Account and Profile tabs',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.profile.open();
      await expect(user.profile.accountTab).toBeVisible();
      await expect(user.profile.profileTab).toBeVisible();
      await expect(user.profile.preferredResourceTypeDropdown, 'Account tab content').toBeVisible();
    }
  );

  test(
    'PRF-01-02: switching quickly between Account and Profile always shows the selected tab',
    { tag: ['@edge'] },
    async ({ user }) => {
      const p = user.profile;
      await p.open();
      for (let i = 0; i < 5; i++) {
        await p.profileTab.click({ force: true });
        await p.accountTab.click({ force: true });
      }
      await expect(p.preferredResourceTypeDropdown, 'ended on Account: its content shows').toBeVisible();
      await expect(p.openChangePasswordLink, 'no Profile-tab content left behind').toBeHidden();
      await p.profileTab.click({ force: true });
      await expect(p.openChangePasswordLink).toBeVisible();
      await expect(p.preferredResourceTypeDropdown).toBeHidden();
    }
  );

  test(
    'PRF-01-03: clicking the avatar 6 times quickly never opens more than one menu',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      for (let i = 0; i < 6; i++) await user.profile.avatarTrigger.click({ force: true });
      await page.waitForTimeout(1000);
      expect(
        await user.profile.drilldownTrigger.filter({ visible: true }).count(),
        'at most one menu'
      ).toBeLessThanOrEqual(1);
    }
  );
});

test.describe('PRF-02 Choose preferred resource types', () => {
  test.afterEach(async ({ app }) => {
    await app.profile.closeWindow().catch(() => {});
  });

  test(
    'PRF-02-01: the Account tab shows the currently preferred resource types',
    { tag: ['@functional'] },
    async ({ user }) => {
      await user.profile.open();
      const text = (await user.profile.preferredResourceTypeDropdown.innerText()).trim();
      expect(text, 'preferred types listed').toMatch(/video|worksheet|audio|image|interactivity|learning shorts/i);
    }
  );

  test(
    'PRF-02-02: a preferred resource type can be taken out of the list (mouse or finger)',
    { tag: ['@functional', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232): a type's remove button never becomes usable -- not by mouse
      // (hover, 2026-09-26) and not by a real finger tap on a touch panel (its box stays empty after the tap), so a
      // teacher cannot take a type out of the list. The list also shows "Interactivity" twice.
      test.fail(true, 'A preferred resource type cannot be removed (its remove button never appears, mouse or touch)');
      const { TouchInput } = require('../../pages/touch-input');
      const touch = new TouchInput(user.page);
      const p = user.profile;
      try {
        await p.open();
        const before = (await p.preferredResourceTypeDropdown.innerText()).replace(/s+/g, ' ');
        const drop = await p.preferredResourceTypeDropdown.boundingBox();
        await touch.tap(drop.x + drop.width / 2, drop.y + drop.height / 2);
        await user.page.waitForTimeout(1500);
        const chip = await p.filterOptions.first().boundingBox();
        await touch.tap(chip.x + chip.width / 2, chip.y + chip.height / 2);
        await user.page.waitForTimeout(700);
        const close = await p.filterOptions
          .first()
          .locator('button.closeBtn')
          .boundingBox()
          .catch(() => null);
        expect(close, 'a tapped chip shows its remove button').not.toBeNull();
        await touch.tap(close.x + close.width / 2, close.y + close.height / 2);
        await user.page.waitForTimeout(1500);
        const after = (await p.preferredResourceTypeDropdown.innerText()).replace(/s+/g, ' ');
        expect(after, 'the type was taken out of the list').not.toBe(before);
      } finally {
        await touch.dispose();
        await user.page.keyboard.press('Escape');
      }
    }
  );

  test(
    'PRF-02-04: the preferred resource type list has no duplicates',
    { tag: ['@edge', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-27, v 0.0.232): "Interactivity" appears twice in the list.
      test.fail(true, 'The preferred resource type list shows "Interactivity" twice');
      await user.profile.open();
      const names = (await user.profile.preferredResourceTypeDropdown.innerText())
        .replace(/keyboard_arrow_down/g, '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      expect(
        names.filter((n, i) => names.indexOf(n) !== i),
        'no type listed twice'
      ).toEqual([]);
    }
  );

  test.fixme('PRF-02-03: applying with no types selected is blocked with a message', async () => {
    // BLOCKED, CONFIRMED LIVE (2026-09-26, v 0.0.232): a type cannot be taken out of the preferred list in automation --
    // neither clicking its chip nor its hover-only remove button (button.closeBtn) changes the list, and Apply then saves the
    // unchanged list (PUT .../tce-auth-api/1/api/1/admin/user/details). Check by hand whether this is a product defect or a
    // control that needs a real touch; the reference suite (USR-RES-01) did deselect "Whiteboard" this way on an older build.
  });
});

test.describe('PRF-03 Manage teaching subjects', () => {
  test.afterEach(async ({ app }) => {
    await app.profile.subjectMenuCloseBtn.click({ force: true, timeout: 1500 }).catch(() => {});
    await app.profile.closeWindow().catch(() => {});
  });

  /** Add a subject that isn't on the account yet; returns its name. */
  async function addSubject(p) {
    await p.waitForSpinner();
    await p.addSubjectsBtn.click();
    await expect(p.subjectPickerOptions.first()).toBeVisible({ timeout: 10000 });
    const option = p.subjectPickerOptions.first();
    const name = (await option.getAttribute('data-qa-id')).replace('user-profile-subject-add-', '');
    await option.click({ force: true });
    await p.subjectMenuCloseBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    return name;
  }

  test(
    'PRF-03-01: Add Subjects adds the chosen subject as a chip straight away',
    { tag: ['@functional'] },
    async ({ user }) => {
      const p = user.profile;
      await p.open();
      const name = await addSubject(p);
      try {
        await expect(p.subjectChipRemove(name), `${name} chip added`).toBeVisible({ timeout: 10000 });
      } finally {
        await p
          .subjectChipRemove(name)
          .click({ force: true })
          .catch(() => {});
      }
    }
  );

  test(
    'PRF-03-02: a subject already added is not offered again in Add Subjects',
    { tag: ['@functional'] },
    async ({ user }) => {
      const p = user.profile;
      await p.open();
      // The primary account has no subjects of its own (confirmed live 2026-09-26): add one, check, then remove it.
      const added = await addSubject(p);
      const existing = await p.subjectNames();
      expect(existing, 'the added subject is on the account').toContain(added);
      await p.waitForSpinner();
      await p.addSubjectsBtn.click();
      await expect(p.subjectPickerOptions.first()).toBeVisible({ timeout: 10000 });
      for (const name of existing)
        await expect(
          p.page.locator(`[data-qa-id="user-profile-subject-add-${name}"]`),
          `${name} not offered`
        ).toHaveCount(0);
      await p.subjectMenuCloseBtn.click({ force: true }).catch(() => {});
      await p
        .subjectChipRemove(added)
        .click({ force: true })
        .catch(() => {});
    }
  );

  test('PRF-03-03: removing a subject chip removes only that subject', { tag: ['@functional'] }, async ({ user }) => {
    const p = user.profile;
    await p.open();
    const name = await addSubject(p);
    const before = await p.subjectNames();
    await p.removeSubject(name);
    await expect(p.subjectChipRemove(name)).toHaveCount(0, { timeout: 10000 });
    expect(await p.subjectNames()).toEqual(before.filter((s) => s !== name));
  });

  test(
    'PRF-03-04: removing the last remaining subject is blocked or clearly explained',
    { tag: ['@negative'] },
    async ({ user }) => {
      // Needs an account with a single subject; the shared accounts have several, and stripping them is not safe.
      const p = user.profile;
      await p.open();
      const subjects = await p.subjectNames();
      test.skip(
        subjects.length !== 1,
        `Needs an account with exactly one subject (this one has ${subjects.length}); removing subjects down to one on the shared account is not safe.`
      );
      await p.subjectChipRemove(subjects[0]).click({ force: true });
      const stillThere = await p
        .subjectChipRemove(subjects[0])
        .isVisible()
        .catch(() => false);
      if (!stillThere)
        await expect(p.errorText.or(p.snackbar).first(), 'removal of the last subject explained').toBeVisible({
          timeout: 5000,
        });
    }
  );

  test(
    "PRF-03-05: double-clicking a chip's remove icon removes only that subject",
    { tag: ['@edge'] },
    async ({ user }) => {
      const p = user.profile;
      await p.open();
      const name = await addSubject(p);
      const before = await p.subjectNames();
      await p
        .subjectChipRemove(name)
        .hover()
        .catch(() => {});
      await p.subjectChipRemove(name).evaluate((el) => {
        el.click();
        el.click();
      });
      await expect(p.subjectChipRemove(name)).toHaveCount(0, { timeout: 10000 });
      expect(await p.subjectNames(), 'only one subject removed').toEqual(before.filter((s) => s !== name));
    }
  );
});
