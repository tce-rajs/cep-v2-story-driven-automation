// Runs once before the whole client-automation suite. CONFIRMED LIVE (2026-09-23): an interrupted test run
// (a hard timeout, a killed process) can skip a test's own afterEach restore and leave tce_settings.json with
// leftover profiles from a previous run -- which then makes EVERY test's single-profile assumption wrong from
// the very first launch. Force known-good single-profile state here, once, regardless of whatever the last run
// left behind, rather than trusting every individual test's cleanup to have completed.

const { forceSingleProfile } = require('./fixtures/shell');

module.exports = async () => {
  forceSingleProfile({ title: 'QA-V2', url: 'https://ce-qa-school.devstudi.com/teach/' });
};
