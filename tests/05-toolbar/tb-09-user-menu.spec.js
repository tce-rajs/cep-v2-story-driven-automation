// TB-09 — User menu
// Source: CEPV2_Stories/05_Toolbar.md
// Menu map (confirmed live in the previous suite): the avatar opens an outer menu — "Signed in as" row (drills into
// Profile / Account tabs), Classroom Mode switcher, Dark Mode toggle (Theme), Virtual Keyboard toggle, Feedback,
// Build (release notes) and Sign Out. Feedback is never SUBMITTED here: that would send real mail from the QA account.

const { test, expect } = require('../../fixtures');

test.describe('TB-09 User menu', () => {
  test(
    'TB-09-01: opening the User menu shows Profile, Account, Classroom Mode, Theme, Virtual Keyboard, Whiteboard History, Feedback, Build Version and Sign Out',
    { tag: ['@smoke', '@functional', '@bug'] },
    async ({ user, page }) => {
      // Every other item is there; only Feedback is missing (v 0.0.236, see FEEDBACK_MISSING below).
      test.fail(true, 'The User menu has no Feedback option (expected by the owner, 2026-10-05) -- v 0.0.236');
      const menu = user.userMenu;
      await menu.openProfileMenu();

      // Whiteboard History is new on the Ultra server build; Feedback is expected in the menu (owner, 2026-10-05).
      await expect.soft(menu.classroomModeSwitcher, 'Classroom Mode').toBeVisible();
      await expect.soft(menu.darkModeToggle, 'Theme').toBeVisible();
      await expect.soft(menu.wbHistoryBtn, 'Whiteboard History').toBeVisible();
      await expect
        .soft(
          page
            .locator('[data-qa-id="toolbar-profile-feedback-btn"]')
            .or(page.getByText(/feedback/i))
            .filter({ visible: true })
            .first(),
          'Feedback'
        )
        .toBeVisible();
      await expect.soft(menu.buildInfoBtn, 'Build Version').toBeVisible();
      await expect.soft(menu.virtualKeyboardToggle, 'Virtual Keyboard').toBeVisible();
      await expect.soft(menu.signOutBtn, 'Logout').toBeVisible();

      // Profile and Account sit one level in, behind the "Signed in as" row.
      await expect(menu.signedInAsRow).toBeVisible();
      await menu.drilldownTrigger.click({ force: true });
      await expect.soft(menu.profileTab, 'Profile').toBeVisible({ timeout: 10000 });
      await expect.soft(menu.accountTab, 'Account').toBeVisible();
    }
  );

  test('TB-09-02: Profile opens and displays current settings', { tag: ['@functional'] }, async ({ user, page }) => {
    const menu = user.userMenu;
    await menu.openAccountTab();
    await menu.profileTab.click({ force: true });
    await page.waitForTimeout(800);

    await expect(menu.profileTabItem).toHaveAttribute('aria-selected', 'true');
    // CONFIRMED LIVE: the Profile content (Change Password / Change PIN) is not inside the role=tabpanel element,
    // which stays empty, so the content is asserted directly.
    await expect(menu.profileContent, 'the Profile tab shows its settings').toBeVisible();
    await expect(page.getByText(/change pin/i).first()).toBeVisible();
  });

  test(
    'TB-09-03: Account shows the correct signed-in account details',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const menu = user.userMenu;
      await menu.openProfileMenu();
      const signedInAs = ((await menu.signedInAsRow.innerText()) || '')
        .replace(/signed in as/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      expect(signedInAs.length, 'the menu names the signed-in user').toBeGreaterThan(0);

      await menu.drilldownTrigger.click({ force: true });
      await menu.accountTab.click({ force: true });
      await page.waitForTimeout(800);

      await expect(menu.accountTabItem).toHaveAttribute('aria-selected', 'true');
      // The drilled-in view repeats the signed-in user's name above the tabs (the role=tabpanel itself is empty).
      await expect(
        page.getByText(signedInAs.split(' ')[0]).first(),
        'Account view shows the same user the menu names'
      ).toBeVisible();
    }
  );

  // Classroom Mode: to Planning (TB-09-04) and back to Teaching (TB-09-15) -- one test each (split 2026-09-28).
  test('TB-09-04: Classroom Mode switches to Planning', { tag: ['@functional'] }, async ({ user, page }) => {
    await user.userMenu.openProfileMenu();
    await expect(user.userMenu.classroomModeSwitcher).toBeVisible();
    await page.keyboard.press('Escape');
    try {
      const toPlan = await user.compass.switchToPlanningMode();
      expect(toPlan.switched, 'switched to Planning').toBe(true);
      await expect(page).toHaveURL(/\/plan\//);
    } finally {
      if (page.url().includes('/plan/')) await user.compass.switchToTeachingMode().catch(() => {});
    }
  });

  test(
    'TB-09-15: Classroom Mode switches back from Planning to Teaching',
    { tag: ['@functional'] },
    async ({ user, page }) => {
      const toPlan = await user.compass.switchToPlanningMode();
      expect(toPlan.switched, 'set-up: in Planning').toBe(true);
      const toTeach = await user.compass.switchToTeachingMode();
      expect(toTeach.switched, 'switched back to Teaching').toBe(true);
      await expect(page).toHaveURL(/\/teach\//);
    }
  );

  test('TB-09-05: Theme changes the app’s visual theme', { tag: ['@functional'] }, async ({ user, page }) => {
    const look = () =>
      page.evaluate(() => {
        const root = document.documentElement;
        return [root.className, document.body.className, getComputedStyle(document.body).backgroundColor].join('|');
      });
    await user.userMenu.openProfileMenu();
    const before = await look();

    await user.userMenu.darkModeToggle.click({ force: true });
    await page.waitForTimeout(1000);
    const after = await look();
    test.info().annotations.push({ type: 'note', description: `Theme signature before="${before}" after="${after}"` });
    expect(after, 'the visual theme changed').not.toBe(before);

    // Put it back so later tests run in the theme the account started in.
    await user.userMenu.darkModeToggle.click({ force: true });
  });

  // Feedback (owner, 2026-10-05): the User menu has a Feedback option, and it opens a QR code for sending feedback --
  // a QR code is the expected behaviour, not a form. TB-09-06 (opens a QR code), TB-09-16 (the QR code can be read),
  // TB-09-10 (closing it changes nothing). Seen 2026-09-30 in the browser on v 0.0.232: no Feedback option in the menu.
  // PRODUCT FINDING, seen in the desktop client on v 0.0.236 (2026-10-05): the menu has no Feedback option at all.
  const FEEDBACK_MISSING =
    'The User menu has no Feedback option (expected: Feedback opening a QR code, owner 2026-10-05) -- v 0.0.236';
  const feedbackOption = (page) =>
    page
      .locator('[data-qa-id="toolbar-profile-feedback-btn"]')
      .or(page.getByText(/feedback/i))
      .filter({ visible: true })
      .first();
  const feedbackQr = (page) =>
    page.locator('canvas, img[src*="qr" i], [class*="qr" i] img, [class*="qr" i] canvas, svg[class*="qr" i]').filter({
      visible: true,
    });
  const openFeedbackQr = async (user, page) => {
    await user.userMenu.openProfileMenu();
    await expect(feedbackOption(page), 'the User menu has a Feedback option').toBeVisible({ timeout: 10000 });
    await feedbackOption(page).click({ force: true });
    await expect(feedbackQr(page).first(), 'Feedback shows a QR code').toBeVisible({ timeout: 15000 });
    return feedbackQr(page).first();
  };

  test(
    'TB-09-06: Feedback opens a QR code for sending feedback',
    { tag: ['@functional', '@bug'] },
    async ({ user, page }) => {
      test.fail(true, FEEDBACK_MISSING);
      await openFeedbackQr(user, page);
    }
  );

  test(
    'TB-09-16: the Feedback QR code can be read (it decodes to a feedback link)',
    { tag: ['@functional', '@bug'] },
    async ({ user, page }) => {
      test.fail(true, FEEDBACK_MISSING);
      const qr = await openFeedbackQr(user, page);
      // Decode the QR code from a screenshot of it, with jsQR (the same decoder the DropIt tests use).
      const png = await qr.screenshot();
      await page.addScriptTag({ path: require.resolve('jsqr/dist/jsQR.js') });
      const decoded = await page.evaluate(async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const code = window.jsQR(data.data, c.width, c.height);
        return code ? code.data : null;
      }, png.toString('base64'));
      test.info().annotations.push({ type: 'note', description: `Feedback QR decodes to: ${decoded}` });
      expect(decoded, 'the QR code decodes to a link').toMatch(/^https?:\/\//);
    }
  );

  test('TB-09-07: Build Version displays the correct value', { tag: ['@functional'] }, async ({ user, page }) => {
    const headerVersion = ((await user.header.versionText.innerText()) || '').replace(/^v\s*/i, '').trim();
    expect(headerVersion).toMatch(/^\d+\.\d+\.\d+/);

    await user.userMenu.openProfileMenu();
    await user.userMenu.buildInfoBtn.click({ force: true });
    // The release-notes content lives in a Shadow DOM component; Playwright's text locators pierce open shadow roots.
    await expect(page.getByText(headerVersion).first(), `build ${headerVersion} shown`).toBeVisible({ timeout: 10000 });
  });

  // Virtual Keyboard in the chapter search box: it is on screen (TB-09-08), and typing on it fills the box (TB-09-17) --
  // one test each (split 2026-09-28).
  // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223, screenshot-verified): with Virtual Keyboard on and the CHAPTER SEARCH box
  // focused, the keyboard is in the DOM but NOT on screen -- it is drawn entirely below the visible window (top = window
  // height, 230px tall). Other boxes are fine: the whiteboard text box and the Add Resource title show it on screen
  // (TB-09-12/18), so this is specific to the search box inside the Chapters popup. A teacher sees no keyboard there.
  // Tracked as expected-to-fail so it isn't masked; needs a product decision.
  const CHAPTER_SEARCH_KEYBOARD = 'Virtual Keyboard is rendered below the visible window for the chapter search box';

  /** Turn Virtual Keyboard on, focus the chapter search box, run `body(keyboard)`, then restore the setting. */
  const withChapterSearchKeyboard = async (user, page, body) => {
    const menu = user.userMenu;
    const isOn = () => menu.virtualKeyboardToggle.evaluate((el) => el.checked);
    // The toggle is ON by default: put it in a known state (on) rather than blindly flipping it, and restore the
    // account's original setting afterwards.
    await menu.openProfileMenu();
    const wasOn = await isOn();
    if (!wasOn) await menu.virtualKeyboardToggle.click({ force: true });
    await page.keyboard.press('Escape');
    try {
      await user.nav.openChaptersPopup();
      await user.nav.chapterTpSearchToggle.click({ force: true });
      await user.nav.chapterTpSearchInput.click({ force: true });
      // The keyboard is the inner .simple-keyboard (its .keyboard-wrapper parent has zero height).
      await body(page.locator('.simple-keyboard').filter({ hasText: 'Tab' }));
    } finally {
      await page.keyboard.press('Escape').catch(() => {});
      await menu.openProfileMenu().catch(() => {});
      if ((await isOn().catch(() => wasOn)) !== wasOn)
        await menu.virtualKeyboardToggle.click({ force: true }).catch(() => {});
    }
  };

  test(
    'TB-09-08: with Virtual Keyboard on, the on-screen keyboard opens inside the window for the chapter search box',
    { tag: ['@functional', '@bug'] },
    async ({ user, page }) => {
      test.fail(true, CHAPTER_SEARCH_KEYBOARD);
      await withChapterSearchKeyboard(user, page, async (keyboard) => {
        await expect(keyboard, 'the on-screen keyboard is inside the visible window').toBeInViewport({
          timeout: 10000,
        });
      });
    }
  );

  test(
    'TB-09-17: typing on the on-screen keyboard fills the chapter search box',
    { tag: ['@functional', '@bug'] },
    async ({ user, page }) => {
      test.fail(true, `${CHAPTER_SEARCH_KEYBOARD}, so its keys cannot be pressed`);
      await withChapterSearchKeyboard(user, page, async (keyboard) => {
        await keyboard.getByText('a', { exact: true }).first().click({ timeout: 10000 });
        await keyboard.getByText('b', { exact: true }).first().click();
        await expect(user.nav.chapterTpSearchInput).toHaveValue(/ab/i);
      });
    }
  );

  test(
    'TB-09-09: Logout from this menu signs out correctly, same as the header’s Logout',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.userMenu.signOut();
      await expect(user.login.avatar).toBeHidden();
      await expect(user.login.guestModeText).toBeVisible();
    }
  );

  test(
    'TB-09-10: closing the Feedback QR code returns to the app with nothing changed',
    { tag: ['@negative', '@bug'] },
    async ({ user, page }) => {
      test.fail(true, FEEDBACK_MISSING);
      const before = await user.nav.currentChapterTopicBtn.innerText();
      const qr = await openFeedbackQr(user, page);
      const close = page
        .getByRole('button', { name: /close|cancel|done/i })
        .filter({ visible: true })
        .first();
      if (await close.isVisible().catch(() => false)) await close.click({ force: true });
      else await page.keyboard.press('Escape');
      await expect(qr, 'the QR code closes').toBeHidden({ timeout: 10000 });
      await expect(user.nav.currentChapterTopicBtn, 'same topic as before').toHaveText(before);
    }
  );

  // ---------------------------------------------------------------------------------------------------------------------
  // Virtual Keyboard, beyond the chapter search box (TB-09-11..13). CONFIRMED LIVE (v 0.0.223), by input box:
  //   toggle ON : chapter search -> keyboard drawn BELOW the window (TB-09-08); whiteboard text box -> shown; Add Resource
  //               title -> shown.
  //   toggle OFF: chapter search -> off-screen; whiteboard text box -> hidden; Add Resource title -> STILL shown.
  // The setting resets to ON after a reload, so every test sets it explicitly.
  // ---------------------------------------------------------------------------------------------------------------------
  test.describe('Virtual Keyboard across input boxes', () => {
    // Fresh space below the teacher's writing; nothing is erased before or after (owner rule 2026-09-29).
    test.use({ classMap: 'default', freshSpace: true });

    const setKeyboard = async (user, on) => {
      const { userMenu, page } = user;
      await userMenu.openProfileMenu();
      const isOn = await userMenu.virtualKeyboardToggle.evaluate((el) => el.checked);
      if (isOn !== on) await userMenu.virtualKeyboardToggle.click({ force: true });
      await page.keyboard.press('Escape');
      await page.mouse.click(200, 400);
      await page.waitForTimeout(500);
    };
    /** The on-screen keyboard counts as shown only if it is actually inside the window. */
    const keyboardShown = (user) =>
      user.page.evaluate(() => {
        const k = document.querySelector('.simple-keyboard');
        if (!k) return false;
        const r = k.getBoundingClientRect();
        return r.height > 0 && r.top < window.innerHeight - 20 && r.bottom > 0;
      });
    const focusWhiteboardText = async (user) => {
      await user.toolbar.selectTool('gtInserttext');
      await user.page.mouse.click(600, 400);
      await user.page.waitForTimeout(1500);
    };
    const focusAddResourceTitle = async (user) => {
      await user.addResource.openAction('create');
      await user.addResource.createForm.waitFor({ state: 'visible', timeout: 10000 });
      await user.addResource.titleInput.click({ force: true });
      await user.page.waitForTimeout(1500);
    };
    const closeAddResource = async (user) => {
      await user.addResource.cancelBtn.click({ force: true, timeout: 3000 }).catch(() => {});
      await user.page.waitForTimeout(500);
    };

    test('TB-09-11: keys pressed on the on-screen keyboard type into the focused input box', async ({ user, page }) => {
      await setKeyboard(user, true);
      await focusAddResourceTitle(user);
      await expect.poll(() => keyboardShown(user), { message: 'the keyboard is on screen', timeout: 8000 }).toBe(true);

      for (const key of ['a', 'b', 'c'])
        await page.locator(`.simple-keyboard .hg-button[data-skbtn="${key}"]`).first().click();
      await expect(user.addResource.titleInput, 'the keys were typed into the box').toHaveValue(/abc/i);
      await closeAddResource(user);
    });

    // One input box per test (split 2026-09-28): the whiteboard text box and the Add Resource title, with the keyboard ON
    // (TB-09-12, TB-09-18) and OFF (TB-09-19, TB-09-13).
    test('TB-09-12: with Virtual Keyboard on, the on-screen keyboard opens for a whiteboard text box', async ({
      user,
    }) => {
      await setKeyboard(user, true);
      await focusWhiteboardText(user);
      await expect
        .poll(() => keyboardShown(user), { message: 'whiteboard text box: the keyboard is on screen', timeout: 8000 })
        .toBe(true);
      await user.page.keyboard.press('Escape');
    });

    test('TB-09-18: with Virtual Keyboard on, the on-screen keyboard opens for the Add Resource title', async ({
      user,
    }) => {
      await setKeyboard(user, true);
      await focusAddResourceTitle(user);
      try {
        await expect
          .poll(() => keyboardShown(user), { message: 'Add Resource title: the keyboard is on screen', timeout: 8000 })
          .toBe(true);
      } finally {
        await closeAddResource(user);
      }
    });

    test(
      'TB-09-19: with Virtual Keyboard OFF, clicking a whiteboard text box does not open the on-screen keyboard',
      { tag: ['@negative'] },
      async ({ user }) => {
        await setKeyboard(user, false);
        await focusWhiteboardText(user);
        expect(await keyboardShown(user), 'whiteboard text box: no keyboard').toBe(false);
        await user.page.keyboard.press('Escape');
      }
    );

    test(
      'TB-09-13: with Virtual Keyboard OFF, clicking the Add Resource title does not open the on-screen keyboard',
      { tag: ['@negative', '@bug'] },
      async ({ user }) => {
        // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223): OFF is honoured by the whiteboard text box (keyboard hidden, TB-09-19)
        // but NOT by the Add Resource title, which still opens the keyboard. Tracked as expected-to-fail so it isn't masked.
        test.fail(true, 'Virtual Keyboard OFF is ignored by the Add Resource title box');
        await setKeyboard(user, false);
        await focusAddResourceTitle(user);
        try {
          expect(await keyboardShown(user), 'Add Resource title: no keyboard').toBe(false);
        } finally {
          await closeAddResource(user);
        }
      }
    );
  });

  test(
    'TB-09-14: switching Theme 10 times in a row ends on the expected theme, with no flicker left behind',
    { tag: ['@edge'] },
    async ({ user, page }) => {
      const look = () =>
        page.evaluate(() =>
          [
            document.documentElement.className,
            document.body.className,
            getComputedStyle(document.body).backgroundColor,
          ].join('|')
        );
      await user.userMenu.openProfileMenu();
      const startChecked = await user.userMenu.darkModeToggle.isChecked();
      const before = await look();
      for (let i = 0; i < 10; i++) await user.userMenu.darkModeToggle.click({ force: true });
      await page.waitForTimeout(1500);
      await expect(user.userMenu.darkModeToggle, 'toggle back where it started').toBeChecked({ checked: startChecked });
      expect(await look(), 'theme back where it started').toBe(before);
      await page.waitForTimeout(1500);
      expect(await look(), 'and it stays there (no flicker)').toBe(before);
    }
  );
});
