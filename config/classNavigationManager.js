// Class & Context Navigation Manager (ClassMap Engine)
//
// Extends static module-to-class mappings with dynamic class switching,
// runtime overrides, account PIN resolution, and state tracking (remembering
// previous class and resetting back to baseline so tests don't leave dirty state).

// In-memory registry for dynamically registered class configurations
const DYNAMIC_CLASS_REGISTRY = new Map();

function getModuleClassMap() {
  return require('./moduleClassMap').MODULE_CLASS_MAP || {};
}

/**
 * Returns the default baseline class (Class 9A Science, fresh board space).
 */
function getBaselineClass() {
  const map = getModuleClassMap();
  return { ...map.default };
}

/**
 * Register or update a class configuration dynamically at runtime.
 * @param {string} key Unique identifier for this class configuration
 * @param {object} config { grade, division, subject, chapterIndex, chapterName, topicIndex, account, pin, label, notes }
 */
function registerClassMapping(key, config) {
  if (!key || typeof key !== 'string') {
    throw new Error('registerClassMapping requires a valid string key');
  }
  if (!config || !config.grade || !config.division || !config.subject) {
    throw new Error(`registerClassMapping for "${key}" requires at least grade, division, and subject`);
  }
  DYNAMIC_CLASS_REGISTRY.set(key, { ...config });
  return config;
}

/**
 * Clear all dynamically registered class configurations.
 */
function clearDynamicClassRegistry() {
  DYNAMIC_CLASS_REGISTRY.clear();
}

/**
 * Resolves a class configuration from either a module key string or a config object.
 * Applies any optional overrides (e.g. testing the same module in a different class).
 *
 * @param {string|object} moduleKeyOrConfig
 * @param {object} [overrides] Optional overrides { grade, division, subject, chapterIndex, topicIndex, pin, account }
 * @returns {object} Normalized class configuration
 */
function resolveClassConfig(moduleKeyOrConfig, overrides = {}) {
  let baseConfig;

  const moduleMap = getModuleClassMap();

  if (typeof moduleKeyOrConfig === 'string') {
    if (DYNAMIC_CLASS_REGISTRY.has(moduleKeyOrConfig)) {
      baseConfig = { ...DYNAMIC_CLASS_REGISTRY.get(moduleKeyOrConfig) };
    } else if (moduleMap[moduleKeyOrConfig]) {
      baseConfig = { ...moduleMap[moduleKeyOrConfig] };
    } else {
      const known = [...Object.keys(moduleMap), ...DYNAMIC_CLASS_REGISTRY.keys()];
      throw new Error(`ClassNavigationManager: no entry for "${moduleKeyOrConfig}" -- known keys: ${known.join(', ')}`);
    }
  } else if (moduleKeyOrConfig && typeof moduleKeyOrConfig === 'object') {
    baseConfig = { ...moduleKeyOrConfig };
  } else {
    baseConfig = getBaselineClass();
  }

  if (baseConfig.unavailable) {
    throw new Error(
      `DATA MISSING ON THIS SERVER (${baseConfig.label || moduleKeyOrConfig}): ${baseConfig.unavailable}`
    );
  }

  // Merge overrides
  const resolved = { ...baseConfig, ...overrides };

  // Set default fallbacks if missing
  resolved.account = resolved.account || 'VALID_PIN';
  if (resolved.chapterIndex === undefined && !resolved.chapterName) {
    resolved.chapterIndex = 0;
  }
  if (resolved.topicIndex === undefined) {
    resolved.topicIndex = 0;
  }

  return resolved;
}

/**
 * Returns the raw map entry for a module key (or resolves a config object).
 * Throws if unknown or marked unavailable.
 */
function getClassMap(moduleKeyOrConfig) {
  return resolveClassConfig(moduleKeyOrConfig);
}

/**
 * Resolves the PIN to sign in with for a module key or class config.
 * Handles explicit PIN overrides, .env accounts, and ONLY_PRIMARY_ACCOUNT flag.
 */
function pinForModule(moduleKeyOrConfig, overridePin) {
  if (overridePin) return overridePin;
  if (process.env.ONLY_PRIMARY_ACCOUNT) return process.env.VALID_PIN;

  const entry = resolveClassConfig(moduleKeyOrConfig);
  if (entry.pin) return entry.pin;
  if (entry.account && process.env[entry.account]) {
    return process.env[entry.account];
  }
  return process.env.VALID_PIN;
}

/**
 * Navigates an already logged-in session to the target class/chapter/topic.
 * Automatically saves the current class into history before switching unless opts.savePrevious === false.
 *
 * @param {NavigationPage} nav NavigationPage instance
 * @param {string|object} moduleKeyOrConfig Module key or custom class target
 * @param {object} [opts] Navigation options { chapterNav, override, savePrevious }
 */
async function applyClassMap(nav, moduleKeyOrConfig, opts = {}) {
  const { chapterNav = true, override, savePrevious = true } = opts;
  const target = resolveClassConfig(moduleKeyOrConfig, override);

  // Save current class state to previousClass if navigation object supports it
  if (savePrevious && typeof nav.saveCurrentClass === 'function') {
    await nav.saveCurrentClass().catch(() => {});
  }

  await nav.resetToClass(target.grade, target.division, target.subject);

  if (chapterNav) {
    if (target.chapterName) {
      await nav.goToChapterTopicByName(target.chapterName, target.topicIndex ?? 0);
    } else if (typeof target.chapterIndex === 'number') {
      await nav.goToChapterTopic(target.chapterIndex, target.topicIndex ?? 0);
    }
  }

  return target;
}

module.exports = {
  get MODULE_CLASS_MAP() {
    return getModuleClassMap();
  },
  DYNAMIC_CLASS_REGISTRY,
  getBaselineClass,
  registerClassMapping,
  clearDynamicClassRegistry,
  resolveClassConfig,
  getClassMap,
  pinForModule,
  applyClassMap,
};
