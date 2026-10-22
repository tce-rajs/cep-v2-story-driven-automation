# Project Work Log

This file records project-analysis and follow-up work performed in this branch. Add a dated entry whenever work
starts or reaches a meaningful checkpoint so the project history is easy to resume.

## Current work

- **Date:** 2026-10-22
- **Branch:** `work/project-analysis-log`
- **Goal:** Analyze the CEP v2 automation project and record findings before making further changes.
- **Status:** Initial analysis complete; no application or test code changed.

### Work completed

1. Read the project overview, setup guide, test-process documentation, progress handoff, and review note.
2. Inspected the main Playwright configuration, Electron-client fixture, shared test fixture, class map, and core-run script.
3. Enumerated the Playwright suites:
   - Main suite: 1,843 tests in 202 spec files.
   - Desktop-client shell suite: 12 tests in 8 spec files.
4. Ran `npm run lint`: it completed with 0 errors and 1,774 warnings.
5. Confirmed that the worktree was clean before starting this work.

### Initial assessment

- The project has a story-driven test design, shared page objects and fixtures, and a separate suite for the desktop
  client shell.
- The main suite normally operates against a live QA server and shared accounts/data. It should only be run with
  appropriate environment configuration and awareness of the safeguards in `README.md` and `docs/HOW_TO_RUN.md`.
- The project status documents are dated October 9–10, 2026, and contain different automation totals. They should be
  checked against the current workbook and current run results before being treated as authoritative.
- ESLint currently reports a large warning count despite passing without errors. Warnings should be triaged before
  attempting broad cleanup; some flagged tests may assert through helpers or intentionally use special interactions.
- The test-list and lint checks do not establish that the live product currently passes. No live product tests were run
  during this analysis.

## Follow-up

- [ ] Reconcile current automation totals across the stories, workbook, and status documentation.
- [ ] Review recent run artifacts, if available, and update the project status with verified results.
- [ ] Triage lint warnings by category and prioritize meaningful reliability issues over bulk suppression.
- [ ] Make any follow-up changes on this branch and record each change and its validation below.

## Work entries

### 2026-10-22 — Stop Minimap run and address client startup popups

- Stopped the in-progress desktop-client Minimap run on request. It had reached the first 20 of 28 tests; multiple
  cases failed with the 404 overlay appearing during the run, so this was not a complete module pass/fail result.
- Tried a different `.exe` startup route without Playwright's Electron launcher: start the executable directly with a
  CDP port and connect to that port. No CDP endpoint became available within 45 seconds, so the experiment was
  terminated. The installed client remains controlled through Playwright's Electron launcher for now; no settings
  were changed and no browser run was used.
- Updated `fixtures/electron-app.js`: a visible 404 at client startup now closes that process and tries a fresh
  Electron process (up to three attempts). It no longer reloads the webview in the same process, which cannot clear
  the client's latched error overlay. Persistent startup failure is reported explicitly.
- Added volume-panel detection at launch and around each desktop-client test, capture of clicks on the shell's Volume
  control, and a close action if the panel is unexpectedly open. The diagnostic reports captured click events instead
  of silently hiding the widget.
- Added a cold-launch regression case in `client-automation/tests/05-volume.spec.js` to require one volume slider
  element and verify it is hidden by default.
- Validation: desktop-client test discovery succeeds (13 tests); targeted ESLint has 0 errors (three pre-existing
  `force: true` warnings in the volume interaction test); `git diff --check` passes. No client was launched to validate
  the new behavior after editing.

### 2026-10-22 — 404 overlay and volume widget investigation

- Compared the supplied screenshot with the desktop-client fixture and client-shell volume test.
- Inspected the installed client v26.9.15 bundle read-only. Its webview `did-fail-load` handler retries a failed
  main-frame navigation after two seconds; if the retry promise rejects, it assigns a non-null error message. The
  template renders a fixed “ERROR #404” overlay whenever `errorMessage` is non-null. This is not evidence that the
  HTTP response status was 404: any qualifying load failure uses the same generic overlay.
- The same bundle's `did-finish-load` handler only logs; it does not clear `errorMessage`. A later successful
  navigation can therefore show the sign-in screen underneath an overlay left behind by an earlier transient failure.
  This explains the screenshot more specifically than the earlier “latched startup error” description.
- Confirmed Playwright's installed Electron launcher adds `--inspect=0` and `--remote-debugging-port=0`, and the
  currently observed Electron main process had both flags. The repo's existing investigation records the associated
  `GUEST_VIEW_MANAGER_CALL: ERR_FAILED (-2)` and repeated manual-vs-Playwright A/B observations
  (`fixtures/electron-app.js`). This supports the startup webview guest-attachment race as the automation-only
  trigger. The current packaged `main.log` had no matching failure signature, so the exact failure event for this
  screenshot was not independently captured.
- The installed bundle initializes `myApp.volume.show` to `false`; the volume template uses `ng-show` on that value.
  The only app-owned code path found that opens it is `showVolume`, which toggles the value from the volume control;
  the close control sets it back to false. It is not a saved `tce_settings.json` preference. Therefore it is not
  opened by default by the packaged app code. The screenshot's exact toggle source cannot be determined from the
  available main-process log; a prior volume-menu click or an interrupted volume-control test are possibilities,
  not verified causes. The Minimap test itself contains no volume-menu action.
- Resolution recommendation: in the client source, gate the first webview navigation on guest-view attachment/readiness,
  keep a bounded retry, and clear `errorMessage` after a successful main-frame load (with Angular digest/update).
  In the automation harness, continue to report an overlay rather than hiding it; a fresh retry can recover content
  but cannot reliably clear the app's own error state. Add a cold-launch assertion that the volume panel is hidden
  before investigating any reproducible exception.
- No client settings, executable, or shared school data were changed during this investigation.
- No client settings, executable, or shared school data were changed during this investigation.

### 2026-10-22 — Live Minimap verification

- Selected `MM-01-02` from `tests/12-minimap/mm-01-open-close.spec.js`. It opens and closes the Minimap and checks
  that the panel is hidden; it does not draw on or otherwise change the whiteboard.
- The default desktop-client run was blocked before client launch because the external
  `C:\Users\Public\tce_settings.json` contains three profiles; this project requires exactly one. No profile settings
  were changed.
- Re-ran the same case with `RUN_IN_BROWSER=1` against the configured `BASE_URL`. **Result: passed** (1 test, 19.0 s).
- Run output: `test-results/live-minimap-browser-2026-10-22/`.
- This verifies the selected case in browser mode on the configured live server; it does not verify the Electron-client
  launch path or the rest of the Minimap module.

### 2026-10-22 — Project analysis and work-log setup

- Created branch `work/project-analysis-log` from `main`.
- Added this work log to preserve the analysis and serve as the record for follow-up work.
- Validation at analysis time: `npx playwright test --list` and client-suite `--list` succeeded; `npm run lint`
  succeeded with warnings.
- No live application run, test-data mutation, or source-code change was performed.

### 2026-10-22 — Live diagnosis and desktop-client verification

- Re-ran `MM-01-02` through the `.exe` client, not browser mode. The first attempt reached the client but failed after
  three launches because the 404 overlay was visible each time. The screenshot showed the sign-in/Guest Mode app
  underneath the overlay. No client process remained after the failed run.
- A read-only `HEAD` request to the configured `BASE_URL` returned HTTP 200. In a controlled `.exe` launch, the
  teach webview reached `/teach/whiteboard`, while the visible shell `.uiverse` overlay's Angular scope reported
  `errorMessage === null`. This confirms the overlay can be stale/inconsistent with a successfully rendered app;
  it does not prove every prior overlay was false or identify the exact first failed network event.
- The volume panel was visible on cold launch with `myApp.volume.show === false`, no `ng-hide` class, and no Volume
  control clicks recorded. Clicking its close icon had not hidden it in the earlier diagnostic. This points to a
  packaged-client Angular/template rendering problem, not a saved volume preference or a Minimap action.
- Updated `fixtures/electron-app.js` to hide the connection overlay only when the shell error value is null and the
  teach webview is on the configured server with rendered content; otherwise the existing bounded fresh-process
  recovery still applies. The volume panel is hidden only in the desktop automation shell when it is unexpectedly
  visible, with its state and click evidence logged. These are harness workarounds; the installed client bundle is
  outside this repository, so its product-level rendering defect is not fixed here.
- Re-ran `MM-01-02` through the `.exe` client after the workaround: **passed** (1 test, 19.6 s). The live log
  confirmed both the stale 404 overlay and unexpected volume panel were detected and hidden. No browser mode was
  used, and the saved client profile file was read-only.
- Validation: changed-file ESLint completed with 0 errors and 3 existing `force: true` warnings; main test discovery
  found 1,843 tests in 202 files; desktop-shell discovery found 13 tests in 8 files; `git diff --check` passed.
- The newly added shell cold-launch assertion was listed but not executed; its fixture changes external profile
  settings, so it was not run during this verification.
