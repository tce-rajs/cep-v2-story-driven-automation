// Page Object for CEP v2 Class Map & Navigation orchestration.
// Extends NavigationPage with high-level, modern, and minimal helper methods
// for dynamic class switching, memory tracking, and baseline resets.

const { NavigationPage } = require('./navigation.page');
const {
  getBaselineClass,
  resolveClassConfig,
  registerClassMapping,
  pinForModule,
} = require('../config/classNavigationManager');

class ClassMapPage extends NavigationPage {
  constructor(page) {
    super(page);
  }

  /**
   * Retrieves active class information currently shown on the screen.
   * @returns {Promise<{rawClassLabel: string, rawTopicLabel: string, grade: string, division: string, subject: string, capturedAt: string}>}
   */
  async getCurrentClass() {
    return await this.getCurrentClassInfo();
  }

  /**
   * Returns previously recorded class before the last switch.
   * @returns {object|null}
   */
  getPreviousClass() {
    return this.previousClass;
  }

  /**
   * Switches to a new class or module key.
   * Automatically captures current class into history before switching.
   *
   * @param {string|object} target Module key or { grade, division, subject, chapterIndex, topicIndex }
   * @param {object} [options]
   */
  async switchTo(target, options = {}) {
    return await this.switchToClass(target, options);
  }

  /**
   * Resets the application back to the standard baseline (Class 9A Science).
   * Safe to call at the end of any test run so nothing leaks.
   */
  async reset(options = {}) {
    return await this.resetToBaseline(options);
  }

  /**
   * Reverts back to whatever class was active before the last switchTo call.
   */
  async revert(options = {}) {
    return await this.resetToPreviousClass(options);
  }

  /**
   * Helper to register a new temporary class mapping dynamically.
   */
  register(key, config) {
    return registerClassMapping(key, config);
  }

  /**
   * Resolves the PIN associated with a module key or custom class.
   */
  getPin(moduleKeyOrConfig) {
    return pinForModule(moduleKeyOrConfig);
  }

  /**
   * Returns the system default baseline configuration.
   */
  getBaseline() {
    return getBaselineClass();
  }

  /**
   * Resolves target configuration with optional overrides.
   */
  resolve(moduleKeyOrConfig, overrides = {}) {
    return resolveClassConfig(moduleKeyOrConfig, overrides);
  }
}

module.exports = { ClassMapPage };
