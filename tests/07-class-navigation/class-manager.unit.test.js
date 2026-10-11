// Test suite for ClassNavigationManager & NavigationPage state management
// Tests:
// - Dynamic registration of new classes
// - Runtime class overrides (testing same module in different class)
// - PIN resolution (custom PIN, account PIN, fallback)
// - State tracking (previous class memory and history)
// - Reset functionality (reset to previous class & reset to baseline)
// - Parsing of UI class labels

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  registerClassMapping,
  clearDynamicClassRegistry,
  resolveClassConfig,
  getClassMap,
  pinForModule,
  getBaselineClass,
} = require('../../config/classNavigationManager');
const { NavigationPage } = require('../../pages/navigation.page');

describe('ClassNavigationManager - Core Engine', () => {
  it('resolves baseline class correctly', () => {
    const baseline = getBaselineClass();
    assert.equal(baseline.grade, 'Class 9');
    assert.equal(baseline.division, 'A');
    assert.equal(baseline.subject, 'Science');
  });

  it('allows registering and resolving a custom class', () => {
    clearDynamicClassRegistry();
    registerClassMapping('customEnglishClass', {
      grade: 'Class 8',
      division: 'B',
      subject: 'English',
      chapterIndex: 2,
      topicIndex: 1,
      account: 'VALID_PIN',
      pin: '99999',
    });

    const resolved = getClassMap('customEnglishClass');
    assert.equal(resolved.grade, 'Class 8');
    assert.equal(resolved.division, 'B');
    assert.equal(resolved.subject, 'English');
    assert.equal(resolved.pin, '99999');
  });

  it('allows dynamic overrides of existing module configurations', () => {
    const overridden = resolveClassConfig('aiHomework', {
      grade: 'Class 11',
      division: 'B',
      subject: 'Mathematics',
    });

    assert.equal(overridden.grade, 'Class 11');
    assert.equal(overridden.division, 'B');
    assert.equal(overridden.subject, 'Mathematics');
    // Keeps original account if not overridden
    assert.equal(overridden.account, 'VALID_PIN');
  });

  it('resolves PINs correctly (custom PIN, account PIN, default PIN)', () => {
    process.env.VALID_PIN = '12345';
    process.env.VALID_PIN_2 = '67890';

    // Explicit PIN override
    const explicitPin = pinForModule('default', '55555');
    assert.equal(explicitPin, '55555');

    // Entry with custom PIN in config
    const configWithPin = { grade: 'Class 10', division: 'A', subject: 'Math', pin: '88888' };
    assert.equal(pinForModule(configWithPin), '88888');

    // Entry referencing VALID_PIN_2 account
    const configWithAcc2 = { grade: 'Class 12', division: 'A', subject: 'CS', account: 'VALID_PIN_2' };
    assert.equal(pinForModule(configWithAcc2), '67890');
  });

  it('throws descriptive error on unknown class key', () => {
    assert.throws(() => getClassMap('nonExistentKey123'), /ClassNavigationManager: no entry for "nonExistentKey123"/);
  });
});

function createMockPage() {
  const mockLocator = {
    filter: () => mockLocator,
    last: () => mockLocator,
    first: () => mockLocator,
    getByText: () => mockLocator,
    innerText: async () => '',
    waitFor: async () => {},
  };
  return {
    locator: () => mockLocator,
    getByRole: () => mockLocator,
    waitForTimeout: async () => {},
  };
}

describe('NavigationPage - State Tracking & Reset Logic', () => {
  it('parses UI class button text correctly', async () => {
    const page = createMockPage();
    const nav = new NavigationPage(page);

    nav.currentClassBtn = {
      innerText: async () => 'Class 9A | Science',
    };
    nav.currentChapterTopicBtn = {
      innerText: async () => '4.1 Introduction to Cells',
    };

    const info = await nav.getCurrentClassInfo();
    assert.equal(info.grade, 'Class 9');
    assert.equal(info.division, 'A');
    assert.equal(info.subject, 'Science');
    assert.equal(info.rawClassLabel, 'Class 9A | Science');
    assert.equal(info.rawTopicLabel, '4.1 Introduction to Cells');
  });

  it('saves current class to previousClass and history', async () => {
    const page = createMockPage();
    const nav = new NavigationPage(page);
    nav.currentClassBtn = {
      innerText: async () => 'Class 10B | Mathematics',
    };
    nav.currentChapterTopicBtn = {
      innerText: async () => '1.2 Quadratic Equations',
    };

    assert.equal(nav.previousClass, null);
    assert.equal(nav.classHistory.length, 0);

    const saved = await nav.saveCurrentClass();
    assert.equal(saved.grade, 'Class 10');
    assert.equal(saved.division, 'B');
    assert.equal(saved.subject, 'Mathematics');

    assert.notEqual(nav.previousClass, null);
    assert.equal(nav.previousClass.grade, 'Class 10');
    assert.equal(nav.classHistory.length, 1);
  });

  it('resets to previous class when requested', async () => {
    const page = createMockPage();
    const nav = new NavigationPage(page);
    nav.previousClass = {
      grade: 'Class 12',
      division: 'A',
      subject: 'Physics',
    };

    let resetCalledWith = null;
    nav.resetToClass = async (grade, division, subject) => {
      resetCalledWith = { grade, division, subject };
    };

    const reverted = await nav.resetToPreviousClass();
    assert.deepEqual(resetCalledWith, {
      grade: 'Class 12',
      division: 'A',
      subject: 'Physics',
    });
    assert.equal(reverted.grade, 'Class 12');
  });

  it('falls back to baseline if no previous class was recorded', async () => {
    const page = createMockPage();
    const nav = new NavigationPage(page);
    nav.previousClass = null;

    let resetCalledWith = null;
    nav.resetToClass = async (grade, division, subject) => {
      resetCalledWith = { grade, division, subject };
    };
    nav.goToChapterTopic = async () => {};

    const baseline = await nav.resetToPreviousClass();
    assert.equal(resetCalledWith.grade, 'Class 9');
    assert.equal(resetCalledWith.division, 'A');
    assert.equal(resetCalledWith.subject, 'Science');
    assert.equal(baseline.grade, 'Class 9');
  });
});
