// Playwright reporter (used only for its onEnd hook) that drops a short
// README.md into each run's archived report folder, once the html reporter
// listed before it in playwright.config.js has finished writing that
// folder's files.
const fs = require('fs');
const path = require('path');

class ArchiveReadmeReporter {
  constructor(options = {}) {
    this.outputFolder = options.outputFolder;
    // Every run adds one more timestamped folder here with nothing to ever
    // remove one -- cap it so the archive doesn't grow unbounded. 20 keeps
    // several weeks of typical usage without needing manual cleanup.
    this.keep = options.keep ?? 20;
    this.sawRealExecution = false;
  }

  // `npx playwright test --list` (used constantly for sanity checks -- does
  // this file/config still resolve every test with no import errors?) still
  // runs every reporter, including this one and the html reporter, even
  // though ZERO tests actually execute -- every test comes through with
  // outcome "skipped" and an empty results array. Confirmed live: this was
  // silently filling the archive with reports that have no real pass/fail
  // data at all, and at high enough volume (many --list calls between real
  // runs) even pushed genuine completed-run reports out past the retention
  // cap above. A real test always reports a nonzero duration; --list never
  // does, for any test -- that's the actual signal, more robust than
  // sniffing `--list` off argv (which would miss e.g. a --grep matching
  // zero tests, another zero-execution case worth skipping the same way).
  onTestEnd(test, result) {
    if (result && result.duration > 0) this.sawRealExecution = true;
  }

  onEnd() {
    if (!this.outputFolder || !this.sawRealExecution) return;
    const readme =
      `# Archived test report\n\n` +
      `This is a saved copy of one run's HTML report -- it is never\n` +
      `overwritten by later runs (see playwright.config.js).\n\n` +
      `## How to open it\n\n` +
      `Report files must be served, not opened directly as a file://\n` +
      `URL, so double-clicking index.html will not work. Run:\n\n` +
      `    npx playwright show-report "${this.outputFolder.replace(/\\/g, '/')}"\n\n` +
      `That starts a local server and opens the report in your browser.\n`;
    fs.mkdirSync(this.outputFolder, { recursive: true });
    fs.writeFileSync(path.join(this.outputFolder, 'README.md'), readme);
    this._pruneOldReports();
  }

  // Folder names are `report_<sortable timestamp>`, so lexicographic order
  // is chronological order -- no need to parse dates.
  _pruneOldReports() {
    const parentDir = path.dirname(this.outputFolder);
    let entries;
    try {
      entries = fs
        .readdirSync(parentDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith('report_'))
        .map((e) => e.name)
        .sort();
    } catch {
      return; // parent dir doesn't exist yet -- nothing to prune
    }
    const toRemove = entries.slice(0, Math.max(0, entries.length - this.keep));
    for (const name of toRemove) {
      fs.rmSync(path.join(parentDir, name), { recursive: true, force: true });
    }
  }
}

module.exports = ArchiveReadmeReporter;
