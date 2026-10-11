// Builds report/CLASS_MAP.html:
// An advanced, modern, minimal, and beautiful interactive dashboard for CEP v2 ClassMap orchestration.
// Allows QA engineers to inspect all module-to-class mappings, test modules with alternative classes,
// track previous vs new classes, generate Playwright snippets, and trigger 1-click baseline resets.

const fs = require('fs');
const path = require('path');
const { MODULE_CLASS_MAP } = require('../config/moduleClassMap');

const ROOT = path.join(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'report');
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const entries = Object.entries(MODULE_CLASS_MAP).map(([key, item]) => ({
  key,
  label: item.label || key,
  account: item.account || 'VALID_PIN',
  grade: item.grade || 'Class 9',
  division: item.division || 'A',
  subject: item.subject || 'Science',
  chapterIndex: item.chapterIndex ?? 0,
  chapterName: item.chapterName || '',
  topicIndex: item.topicIndex ?? 0,
  topicLabel: item.topicLabel || '',
  notes: item.notes || '',
  unavailable: item.unavailable || '',
}));

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CEP v2 — ClassMap Manager & Orchestrator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #0c0e14;
      --bg-card: rgba(22, 27, 38, 0.75);
      --bg-card-hover: rgba(30, 37, 52, 0.85);
      --bg-input: #111520;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-hover: rgba(99, 102, 241, 0.4);
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-light: rgba(99, 102, 241, 0.15);
      --accent: #8b5cf6;
      --success: #10b981;
      --success-light: rgba(16, 185, 129, 0.15);
      --warning: #f59e0b;
      --warning-light: rgba(245, 158, 11, 0.15);
      --danger: #ef4444;
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.25);
      --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.45);
      --glass-blur: blur(16px);
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', Consolas, monospace;
    }

    [data-theme="light"] {
      --bg-base: #f8fafc;
      --bg-card: rgba(255, 255, 255, 0.85);
      --bg-card-hover: rgba(255, 255, 255, 0.98);
      --bg-input: #ffffff;
      --border-subtle: rgba(0, 0, 0, 0.08);
      --border-hover: rgba(99, 102, 241, 0.4);
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-dim: #94a3b8;
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
      --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.08);
      --glass-blur: blur(12px);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-sans);
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.06) 0px, transparent 50%);
      background-attachment: fixed;
    }

    /* Container */
    .app-container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 32px 24px 64px;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      gap: 20px;
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-badge {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
      color: #fff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .title-group h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .version-tag {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      background: var(--primary-light);
      color: var(--primary);
      border-radius: 99px;
      border: 1px solid var(--border-hover);
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 3px;
    }

    /* Header Actions */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-card);
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.2s ease;
      backdrop-filter: var(--glass-blur);
    }
    .btn:hover {
      border-color: var(--border-hover);
      transform: translateY(-1px);
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #fff;
      border: none;
      box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
    }
    .btn-primary:hover {
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.45);
    }
    .btn-danger-ghost {
      color: var(--danger);
      border-color: rgba(239, 68, 68, 0.25);
    }
    .btn-danger-ghost:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--danger);
    }

    /* Metrics Bar */
    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .metric-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      backdrop-filter: var(--glass-blur);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .metric-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }
    .metric-title {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-val {
      font-size: 26px;
      font-weight: 700;
      margin-top: 4px;
      color: var(--text-main);
    }
    .metric-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Testing Playground Panel */
    .playground-panel {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: var(--shadow-sm);
      backdrop-filter: var(--glass-blur);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .panel-header h2 {
      font-size: 17px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-live {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    .playground-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1.2fr;
      gap: 20px;
    }
    @media (max-width: 1024px) {
      .playground-grid { grid-template-columns: 1fr; }
    }

    .form-group {
      margin-bottom: 14px;
    }
    .form-group label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .input-field, .select-field {
      width: 100%;
      padding: 9px 12px;
      font-family: inherit;
      font-size: 13px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-input);
      color: var(--text-main);
      outline: none;
      transition: border-color 0.2s ease;
    }
    .input-field:focus, .select-field:focus {
      border-color: var(--primary);
    }

    .card-preview {
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .preview-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding-bottom: 6px;
      border-bottom: 1px dashed var(--border-subtle);
    }
    .preview-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .preview-label {
      color: var(--text-dim);
    }
    .preview-value {
      font-weight: 600;
      color: var(--text-main);
    }

    .code-box {
      background: #090b10;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      position: relative;
      font-family: var(--font-mono);
      font-size: 12px;
      color: #a5b4fc;
      overflow-x: auto;
      white-space: pre;
      line-height: 1.6;
    }
    .copy-btn-inside {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 4px 10px;
      font-size: 11px;
      font-family: var(--font-sans);
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
    }
    .copy-btn-inside:hover {
      background: var(--primary);
      border-color: var(--primary);
    }

    /* Filter & Search Bar */
    .controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .search-wrap {
      flex: 1;
      min-width: 280px;
      position: relative;
    }
    .search-input {
      width: 100%;
      padding: 10px 16px 10px 40px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      background: var(--bg-card);
      color: var(--text-main);
      font-size: 13px;
      outline: none;
      backdrop-filter: var(--glass-blur);
    }
    .search-input:focus {
      border-color: var(--primary);
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-dim);
      pointer-events: none;
    }
    .filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-pill {
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 500;
      border-radius: 99px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-card);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .filter-pill.active, .filter-pill:hover {
      background: var(--primary-light);
      border-color: var(--border-hover);
      color: var(--primary);
      font-weight: 600;
    }

    /* Mappings Grid */
    .mappings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
      gap: 16px;
    }
    .class-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;
      backdrop-filter: var(--glass-blur);
      position: relative;
    }
    .class-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .module-key {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 600;
      color: var(--primary);
      background: var(--primary-light);
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .module-key:hover {
      text-decoration: underline;
    }
    .account-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 99px;
      background: rgba(148, 163, 184, 0.1);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
    }
    .account-badge.alt {
      background: var(--warning-light);
      color: var(--warning);
      border-color: rgba(245, 158, 11, 0.3);
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-main);
    }
    .card-meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }
    .pill-item {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
    }
    .pill-item.grade { color: #38bdf8; background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.2); }
    .pill-item.subject { color: #a78bfa; background: rgba(167, 139, 250, 0.1); border-color: rgba(167, 139, 250, 0.2); }
    .card-notes {
      font-size: 12px;
      color: var(--text-dim);
      line-height: 1.45;
      margin-bottom: 14px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
    }
    .quick-test-btn {
      font-size: 12px;
      color: var(--primary);
      background: transparent;
      border: none;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .quick-test-btn:hover {
      text-decoration: underline;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      background: #1e293b;
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      gap: 10px;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 9999;
    }
    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      z-index: 1000;
      padding: 16px;
    }
    .modal-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }
    .modal-box {
      width: 100%;
      max-width: 520px;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-lg);
      backdrop-filter: var(--glass-blur);
    }
    .modal-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .modal-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- Header -->
    <header>
      <div class="brand">
        <div class="logo-badge">CM</div>
        <div class="title-group">
          <h1>ClassMap Orchestrator <span class="version-tag">CEP v2</span></h1>
          <p class="subtitle">Unified class navigation engine, test overrides, account PIN router & baseline resets</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-danger-ghost" id="globalResetBtn" title="Resets everything to baseline Class 9A Science">
          ↺ Reset All to Baseline
        </button>
        <button class="btn" id="openAddModalBtn">+ Add New Class</button>
        <button class="btn" id="themeToggleBtn">Theme 🌓</button>
      </div>
    </header>

    <!-- Metrics -->
    <div class="metrics-bar">
      <div class="metric-card">
        <div class="metric-title">Total Mappings</div>
        <div class="metric-val" id="totalCount">${entries.length}</div>
        <div class="metric-sub">Automated modules mapped</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Active Baseline</div>
        <div class="metric-val" style="color: var(--success); font-size: 20px; margin-top: 8px;">Class 9A Science</div>
        <div class="metric-sub">Zero-pollution fallback target</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Accounts in Use</div>
        <div class="metric-val">2</div>
        <div class="metric-sub">VALID_PIN & VALID_PIN_2</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Grades Covered</div>
        <div class="metric-val">Classes 9 – 12</div>
        <div class="metric-sub">Science, CS, Hindi, Physics, Math</div>
      </div>
    </div>

    <!-- Interactive Testing Console -->
    <div class="playground-panel">
      <div class="panel-header">
        <h2><span class="badge-live"></span> Test Module in Another Class (Dynamic Override)</h2>
        <span style="font-size: 12px; color: var(--text-dim);">Changes applied here generate instant Playwright code</span>
      </div>
      <div class="playground-grid">
        <!-- Col 1: Select Module -->
        <div>
          <div class="form-group">
            <label for="moduleSelector">Target Module</label>
            <select id="moduleSelector" class="select-field">
              ${entries.map((e) => `<option value="${e.key}">${e.key} — ${e.label}</option>`).join('')}
            </select>
          </div>
          <div class="card-preview">
            <div class="preview-row">
              <span class="preview-label">Mapped Class</span>
              <span class="preview-value" id="currentMappedClass">Loading...</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Account / PIN</span>
              <span class="preview-value" id="currentMappedAccount">VALID_PIN</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Chapter / Topic</span>
              <span class="preview-value" id="currentMappedTopic">Ch 0 · Topic 0</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">Current State</span>
              <span class="preview-value" id="stateLabel" style="color: var(--success);">Baseline Registered</span>
            </div>
          </div>
        </div>

        <!-- Col 2: New Override Settings -->
        <div>
          <div class="form-group">
            <label>Test in Alternative Class</label>
            <input type="text" id="overrideGrade" class="input-field" placeholder="e.g. Class 8 or Class 10" value="Class 10">
          </div>
          <div style="display: flex; gap: 8px;">
            <div class="form-group" style="flex: 1;">
              <label>Section</label>
              <input type="text" id="overrideDiv" class="input-field" placeholder="A" value="B">
            </div>
            <div class="form-group" style="flex: 2;">
              <label>Subject</label>
              <input type="text" id="overrideSubj" class="input-field" placeholder="Mathematics" value="Mathematics">
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 6px;">
            <button class="btn btn-primary" id="applyOverrideBtn" style="flex: 1;">Apply Override</button>
            <button class="btn btn-danger-ghost" id="resetModuleBtn" style="flex: 1;">Reset to Baseline</button>
          </div>
        </div>

        <!-- Col 3: Generated Playwright Code -->
        <div>
          <div class="form-group">
            <label>Playwright Test Snippet</label>
            <div class="code-box" id="codeSnippetBox">
              <button class="copy-btn-inside" id="copySnippetBtn">Copy</button>
              <span id="codeContent">// Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="controls-bar">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="search" id="searchInput" class="search-input" placeholder="Search modules, subjects, grades, accounts, notes…">
      </div>
      <div class="filter-pills">
        <button class="filter-pill active" data-filter="all">All</button>
        <button class="filter-pill" data-filter="Class 9">Class 9</button>
        <button class="filter-pill" data-filter="Class 10">Class 10</button>
        <button class="filter-pill" data-filter="Class 11">Class 11</button>
        <button class="filter-pill" data-filter="Class 12">Class 12</button>
        <button class="filter-pill" data-filter="VALID_PIN_2">Account 2</button>
      </div>
    </div>

    <!-- Grid of Classes -->
    <div class="mappings-grid" id="mappingsGrid">
      <!-- Generated via JS -->
    </div>
  </div>

  <!-- Add Custom Class Modal -->
  <div class="modal-backdrop" id="addModal">
    <div class="modal-box">
      <h3 class="modal-title">+ Add New Class Target</h3>
      <div class="form-group">
        <label>Configuration Key ID</label>
        <input type="text" id="newKey" class="input-field" placeholder="e.g. customBioLab">
      </div>
      <div class="form-group">
        <label>Label</label>
        <input type="text" id="newLabel" class="input-field" placeholder="e.g. Class 10 Biology Lab">
      </div>
      <div class="modal-grid">
        <div class="form-group">
          <label>Grade</label>
          <input type="text" id="newGrade" class="input-field" placeholder="Class 10">
        </div>
        <div class="form-group">
          <label>Division</label>
          <input type="text" id="newDiv" class="input-field" placeholder="A">
        </div>
      </div>
      <div class="modal-grid">
        <div class="form-group">
          <label>Subject</label>
          <input type="text" id="newSubject" class="input-field" placeholder="Biology">
        </div>
        <div class="form-group">
          <label>Account</label>
          <select id="newAccount" class="select-field">
            <option value="VALID_PIN">Primary (VALID_PIN)</option>
            <option value="VALID_PIN_2">Secondary (VALID_PIN_2)</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" id="closeAddModalBtn">Cancel</button>
        <button class="btn btn-primary" id="saveCustomClassBtn">Save Configuration</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast">Copied to clipboard!</div>

  <script>
    const INITIAL_ENTRIES = ${JSON.stringify(entries)};
    let activeEntries = [...INITIAL_ENTRIES];
    let customEntries = [];
    try {
      const stored = localStorage.getItem('cepv2_custom_classes');
      if (stored) {
        customEntries = JSON.parse(stored);
        activeEntries = [...customEntries, ...INITIAL_ENTRIES];
      }
    } catch (e) {}

    const grid = document.getElementById('mappingsGrid');
    const searchInput = document.getElementById('searchInput');
    const moduleSelector = document.getElementById('moduleSelector');
    const toast = document.getElementById('toast');
    let activeFilter = 'all';

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function renderGrid() {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = activeEntries.filter(item => {
        const matchesFilter = 
          activeFilter === 'all' || 
          item.grade.includes(activeFilter) || 
          item.account.includes(activeFilter);
        const matchesSearch = 
          !q || 
          item.key.toLowerCase().includes(q) || 
          item.subject.toLowerCase().includes(q) || 
          item.grade.toLowerCase().includes(q) || 
          item.label.toLowerCase().includes(q) || 
          item.notes.toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
      });

      grid.innerHTML = filtered.map(item => \`
        <div class="class-card">
          <div>
            <div class="card-top">
              <span class="module-key" onclick="selectAndTest('\${item.key}')" title="Click to test in custom class">
                \${item.key} ↗
              </span>
              <span class="account-badge \${item.account === 'VALID_PIN_2' ? 'alt' : ''}">
                \${item.account}
              </span>
            </div>
            <div class="card-title">\${item.label}</div>
            <div class="card-meta-pills">
              <span class="pill-item grade">\${item.grade} \${item.division}</span>
              <span class="pill-item subject">\${item.subject}</span>
              <span class="pill-item">Ch \${item.chapterIndex + 1} · Tp \${item.topicIndex + 1}</span>
            </div>
            <div class="card-notes">\${item.notes || 'Curriculum mapping for module verification.'}</div>
          </div>
          <div class="card-footer">
            <button class="quick-test-btn" onclick="selectAndTest('\${item.key}')">Test with New Class →</button>
            <button class="btn" style="padding: 3px 8px; font-size: 11px;" onclick="copyCodeFor('\${item.key}')">Copy Use</button>
          </div>
        </div>
      \`).join('');

      document.getElementById('totalCount').textContent = activeEntries.length;
    }

    function updatePlayground() {
      const selectedKey = moduleSelector.value;
      const item = activeEntries.find(e => e.key === selectedKey) || activeEntries[0];
      if (!item) return;

      document.getElementById('currentMappedClass').textContent = \`\${item.grade} \${item.division} | \${item.subject}\`;
      document.getElementById('currentMappedAccount').textContent = item.account;
      document.getElementById('currentMappedTopic').textContent = \`Chapter \${item.chapterIndex + 1} · Topic \${item.topicIndex + 1}\`;

      const g = document.getElementById('overrideGrade').value.trim() || item.grade;
      const d = document.getElementById('overrideDiv').value.trim() || item.division;
      const s = document.getElementById('overrideSubj').value.trim() || item.subject;

      const code = \`test.use({\\n  classMap: '\${item.key}',\\n  classOverride: {\\n    grade: '\${g}',\\n    division: '\${d}',\\n    subject: '\${s}'\\n  },\\n  autoResetClass: true\\n});\`;

      document.getElementById('codeContent').textContent = code;
    }

    window.selectAndTest = function(key) {
      moduleSelector.value = key;
      updatePlayground();
      window.scrollTo({ top: 180, behavior: 'smooth' });
      showToast(\`Loaded "\${key}" into Testing Console\`);
    };

    window.copyCodeFor = function(key) {
      const item = activeEntries.find(e => e.key === key);
      const code = \`test.use({ classMap: '\${key}' });\`;
      navigator.clipboard.writeText(code);
      showToast(\`Copied: test.use({ classMap: '\${key}' })\`);
    };

    moduleSelector.addEventListener('change', updatePlayground);
    document.getElementById('overrideGrade').addEventListener('input', updatePlayground);
    document.getElementById('overrideDiv').addEventListener('input', updatePlayground);
    document.getElementById('overrideSubj').addEventListener('input', updatePlayground);

    document.getElementById('copySnippetBtn').addEventListener('click', () => {
      const code = document.getElementById('codeContent').textContent;
      navigator.clipboard.writeText(code);
      showToast('Playwright snippet copied to clipboard!');
    });

    document.getElementById('applyOverrideBtn').addEventListener('click', () => {
      showToast('Override preview applied! Copy code into your test file.');
      document.getElementById('stateLabel').textContent = 'Custom Override Active';
      document.getElementById('stateLabel').style.color = 'var(--warning)';
    });

    document.getElementById('resetModuleBtn').addEventListener('click', () => {
      document.getElementById('overrideGrade').value = 'Class 9';
      document.getElementById('overrideDiv').value = 'A';
      document.getElementById('overrideSubj').value = 'Science';
      updatePlayground();
      document.getElementById('stateLabel').textContent = 'Reset to Baseline (9A Science)';
      document.getElementById('stateLabel').style.color = 'var(--success)';
      showToast('Reset to Baseline complete! Nothing to memorize.');
    });

    document.getElementById('globalResetBtn').addEventListener('click', () => {
      moduleSelector.value = 'default';
      document.getElementById('overrideGrade').value = 'Class 9';
      document.getElementById('overrideDiv').value = 'A';
      document.getElementById('overrideSubj').value = 'Science';
      updatePlayground();
      showToast('All settings reset to baseline: Class 9A Science 4.1');
    });

    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('cepv2_theme', next);
    });
    const savedTheme = localStorage.getItem('cepv2_theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

    // Search and filters
    searchInput.addEventListener('input', renderGrid);
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderGrid();
      });
    });

    // Modal
    const addModal = document.getElementById('addModal');
    document.getElementById('openAddModalBtn').addEventListener('click', () => addModal.classList.add('open'));
    document.getElementById('closeAddModalBtn').addEventListener('click', () => addModal.classList.remove('open'));
    document.getElementById('saveCustomClassBtn').addEventListener('click', () => {
      const key = document.getElementById('newKey').value.trim();
      const label = document.getElementById('newLabel').value.trim() || key;
      const grade = document.getElementById('newGrade').value.trim() || 'Class 9';
      const division = document.getElementById('newDiv').value.trim() || 'A';
      const subject = document.getElementById('newSubject').value.trim() || 'General';
      const account = document.getElementById('newAccount').value;

      if (!key) { alert('Please provide a key ID'); return; }

      const newEntry = { key, label, grade, division, subject, chapterIndex: 0, topicIndex: 0, account, notes: 'Custom registered class' };
      customEntries.unshift(newEntry);
      activeEntries = [...customEntries, ...INITIAL_ENTRIES];
      localStorage.setItem('cepv2_custom_classes', JSON.stringify(customEntries));

      addModal.classList.remove('open');
      renderGrid();
      showToast(\`Added custom class "\${key}"\`);
    });

    // Initial render
    renderGrid();
    updatePlayground();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(REPORT_DIR, 'CLASS_MAP.html'), html, 'utf8');
console.log(`Successfully built report/CLASS_MAP.html with ${entries.length} module class mappings.`);
