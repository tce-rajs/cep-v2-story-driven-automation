// Runs once before the whole client-automation suite. An interrupted test run
// (a hard timeout, a killed process) can skip a test's own afterEach restore and leave tce_settings.json with
// leftover profiles from a previous run -- which then makes EVERY test's single-profile assumption wrong from
// the very first launch. Force known-good single-profile state here, once, regardless of whatever the last run
// left behind, rather than trusting every individual test's cleanup to have completed.

const { backupSettingsRaw, forceSingleProfile, restoreSettingsRaw } = require('./fixtures/shell');

module.exports = async () => {
  const originalSettings = backupSettingsRaw();
  forceSingleProfile({ title: 'QA-V2', url: 'http://172.18.2.85/teach/' });

  return async () => {
    restoreSettingsRaw(originalSettings);
  };
};
