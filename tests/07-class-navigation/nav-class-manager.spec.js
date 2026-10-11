// NAV-CM — Class Manager: dynamic class switching, previous class memory, and reset
// Verifies that:
// 1. Tests can use dynamic class overrides without editing static files
// 2. Previous class state is tracked and remembered
// 3. Reset to previous class and reset to baseline work reliably

const { test, expect } = require('../../fixtures');

test.describe('Class Navigation Manager - Dynamic Class Switching & Reset', () => {
  test.use({ classMap: 'default', autoResetClass: true });

  test('NAV-CM-01: captures current class info and switches to new class with previousClass memory', async ({
    user,
  }) => {
    const nav = user.nav;

    // 1. Verify baseline starting state
    const initialInfo = await nav.getCurrentClassInfo();
    expect(initialInfo.rawClassLabel).toContain('Science');

    // 2. Switch to another known class (Class 9A Hindi Language)
    await nav.switchToClass({
      grade: 'Class 9',
      division: 'A',
      subject: 'Hindi Language',
      chapterIndex: 0,
      topicIndex: 0,
    });

    // 3. Confirm new class is active
    const switchedInfo = await nav.getCurrentClassInfo();
    expect(switchedInfo.subject).toBe('Hindi Language');

    // 4. Confirm previousClass was stored automatically
    expect(nav.previousClass).not.toBeNull();
    expect(nav.previousClass.subject).toBe('Science');

    // 5. Reset to previous class
    await nav.resetToPreviousClass();
    const revertedInfo = await nav.getCurrentClassInfo();
    expect(revertedInfo.subject).toBe('Science');
  });

  test('NAV-CM-02: resetToBaseline restores standard Class 9A Science topic', async ({ user }) => {
    const nav = user.nav;

    // Switch to another class
    await nav.switchToClass({
      grade: 'Class 9',
      division: 'A',
      subject: 'Hindi Language',
    });

    const midInfo = await nav.getCurrentClassInfo();
    expect(midInfo.subject).toBe('Hindi Language');

    // Reset to baseline
    const baseline = await nav.resetToBaseline();
    expect(baseline.subject).toBe('Science');

    const finalInfo = await nav.getCurrentClassInfo();
    expect(finalInfo.subject).toBe('Science');
  });
});

test.describe('Class Navigation Manager - Fixture Override', () => {
  // Test starting directly in an overridden class
  test.use({
    classMap: 'default',
    classOverride: {
      grade: 'Class 9',
      division: 'A',
      subject: 'Hindi Language',
    },
    autoResetClass: true,
  });

  test('NAV-CM-03: test boots directly in overridden class via classOverride fixture', async ({ user }) => {
    const current = await user.nav.getCurrentClassInfo();
    expect(current.subject).toBe('Hindi Language');
  });
});
