// PLR-10 — Use the Code Editor
// Source: CEPV2_Stories/11_Players.md
// Data: 'codeEditor' = Class 12A Computer Science, "2. Exception Handling in Python", which holds a Code resource.

const { test, expect } = require('../../fixtures');

test.describe('PLR-10 Use the Code Editor', () => {
  test.use({ classMap: 'codeEditor' });

  const codeCards = (user) =>
    user.playlist.resourceCards.filter({ has: user.page.locator('img.type-icon[src*="code" i]') });

  const openEditor = async (user) => {
    await expect(codeCards(user).first()).toBeAttached({ timeout: 15000 });
    await user.player.openCodeEditorCard(codeCards(user));
    await expect(user.player.monacoEditor).toBeVisible({ timeout: 20000 });
  };

  const setCode = async (user, code) => {
    await user.player.monacoEditor.click();
    await user.page.keyboard.press('Control+A');
    await user.page.keyboard.press('Delete');
    await user.player.typeInCodeEditor(code);
  };

  test.afterEach(async ({ app }) => {
    await app.player.closePlayer().catch(() => {});
  });

  test('PLR-10-01: a Code Editor resource opens the editor', { tag: ['@smoke', '@functional'] }, async ({ user }) => {
    await openEditor(user);
    // tce-code-main itself is an inline, zero-size wrapper (confirmed live 2026-09-26): check the editor inside it.
    await expect(user.player.monacoEditor).toBeVisible();
    await expect(user.player.codeRunBtn).toBeVisible();
  });

  test('PLR-10-02: running Python code shows its output', { tag: ['@functional'] }, async ({ user }) => {
    await openEditor(user);
    await setCode(user, 'print(6 * 7)');
    await user.player.codeRunBtn.click();
    await expect
      .poll(() => user.player.codeOutputPaneText(), { message: 'output shows 42', timeout: 20000 })
      .toContain('42');
  });

  test('PLR-10-03: code with a syntax error shows a clear error', { tag: ['@negative'] }, async ({ user }) => {
    await openEditor(user);
    await setCode(user, 'print("unclosed"');
    await user.player.codeRunBtn.click();
    await expect
      .poll(() => user.player.codeOutputPaneText(), { message: 'a syntax error is reported', timeout: 20000 })
      .toMatch(/syntax\s*error|invalid syntax|was never closed|unexpected eof/i);
  });

  test('PLR-10-04: one click on Run shows the output (regression)', { tag: ['@regression'] }, async ({ user }) => {
    await openEditor(user);
    await setCode(user, 'print("ran once")');
    await user.player.codeRunBtn.click();
    await expect
      .poll(() => user.player.codeOutputPaneText(), { message: 'output after a single click', timeout: 15000 })
      .toContain('ran once');
  });

  test('PLR-10-05: switching language changes the editor', { tag: ['@functional'] }, async ({ user }) => {
    await openEditor(user);
    const tabs = user.player.codeLanguageTabs;
    const n = await tabs.count();
    test.skip(n < 2, 'This Code resource offers a single language.');
    const lang = () => user.player.monacoEditor.getAttribute('data-mode-id').catch(() => null);
    const before = await lang();
    const text = await user.player.monacoViewLines.innerText();
    await tabs.nth(1).click();
    await expect
      .poll(async () => (await lang()) !== before || (await user.player.monacoViewLines.innerText()) !== text, {
        message: 'a different language editor',
      })
      .toBe(true);
  });

  test(
    'PLR-10-06: after expanding, the button reads "Collapse All", not the misspelt "Collpase All" (regression)',
    { tag: ['@bug', '@regression'] },
    async ({ user, page }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (2026-09-26, v 0.0.232; the reference suite's PLR-CODE-13): after Expand All the
      // settings panel's button reads "Collpase All".
      test.fail(true, 'The Code Editor settings button is misspelt "Collpase All" after expanding');
      await openEditor(user);
      // "Expand All" lives in the editor's settings panel (the gear), confirmed live 2026-09-26.
      await user.player.codeSettingsGear.click();
      const expand = page.getByText(/^\s*expand all\s*$/i).first();
      await expect(expand).toBeVisible({ timeout: 10000 });
      await expand.click();
      await expect(page.getByText(/collpase all/i), 'no misspelling').toHaveCount(0);
      await expect(page.getByText(/^\s*collapse all\s*$/i).first()).toBeVisible();
    }
  );
});
