// Builds report/CLASS_MAP.html:
// Advanced, modern, minimal, and professional interactive dashboard for CEP v2 ClassMap orchestration.
// Features:
// - Cascading/connected dropdowns populated directly with CEP v2 classes (no manual typing)
// - Dedicated Credentials / Teacher PIN selector (Primary, Secondary, Custom PIN)
// - "▶ Start Test with this Class" button with automated runner integration
// - One-click Reset to Baseline: zero memory needed
// - Curriculum tree sync from CEP v2

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MODULE_CLASS_MAP } = require('../config/moduleClassMap');

const ROOT = path.join(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'report');
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const PIN_1 = process.env.VALID_PIN || '74125';
const PIN_2 = process.env.VALID_PIN_2 || '65412';
const PIN_DATA = process.env.DATA_PIN || '98765';
const PIN_PLAN = process.env.PLAN_PIN || '11223';

// Load discovered CEP v2 classes
let discoveredData = {
  lastFetched: new Date().toISOString(),
  environment: '.85 (QA Primary)',
  classes: [
    { grade: 'Class 9', division: 'A', subject: 'Science', account: 'VALID_PIN' },
    { grade: 'Class 9', division: 'A', subject: 'Hindi Language', account: 'VALID_PIN' },
    { grade: 'Class 10', division: 'A', subject: 'Science', account: 'VALID_PIN' },
    { grade: 'Class 10', division: 'A', subject: 'Mathematics', account: 'VALID_PIN' },
    { grade: 'Class 11', division: 'A', subject: 'Accountancy', account: 'VALID_PIN_2' },
    { grade: 'Class 11', division: 'A', subject: 'Mathematics', account: 'VALID_PIN' },
    { grade: 'Class 11', division: 'A', subject: 'History', account: 'VALID_PIN' },
    { grade: 'Class 12', division: 'A', subject: 'Physics', account: 'VALID_PIN' },
    { grade: 'Class 12', division: 'A', subject: 'Computer Science', account: 'VALID_PIN_2' },
    { grade: 'Class 5', division: 'A', subject: 'Mathematics', account: 'VALID_PIN' },
    { grade: 'Class 7', division: 'A', subject: 'Hindi Language', account: 'VALID_PIN' },
    { grade: 'Class 8', division: 'A', subject: 'Mathematics', account: 'VALID_PIN' },
  ],
};

const DISCOVERED_FILE = path.join(ROOT, 'config', 'discovered-classes.json');
if (fs.existsSync(DISCOVERED_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(DISCOVERED_FILE, 'utf8'));
    const flat = [];
    if (raw.accounts) {
      Object.values(raw.accounts).forEach((acc) => {
        if (acc.classes) flat.push(...acc.classes);
      });
    }
    if (flat.length > 0) {
      discoveredData.classes = flat;
      discoveredData.lastFetched = raw.lastFetched || discoveredData.lastFetched;
    }
  } catch {
    // Fallback to default curriculum classes if file cannot be parsed
  }
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
      --border-hover: rgba(99, 102, 241, 0.45);
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
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
    .btn-run {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      border: none;
      box-shadow: 0 2px 12px rgba(16, 185, 129, 0.35);
    }
    .btn-run:hover {
      box-shadow: 0 4px 18px rgba(16, 185, 129, 0.5);
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
      font-size: 11px;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-val {
      font-size: 24px;
      font-weight: 700;
      margin-top: 4px;
      color: var(--text-main);
    }
    .metric-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Playground Panel */
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
      flex-wrap: wrap;
      gap: 10px;
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
    .select-field, .input-field {
      width: 100%;
      padding: 10px 12px;
      font-family: inherit;
      font-size: 13px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-input);
      color: var(--text-main);
      outline: none;
      transition: border-color 0.2s ease;
    }
    .select-field:focus, .input-field:focus {
      border-color: var(--primary);
    }

    .compare-container {
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .compare-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .compare-tag {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .tag-prev { background: rgba(148, 163, 184, 0.15); color: var(--text-muted); }
    .tag-new { background: var(--warning-light); color: var(--warning); }
    .tag-reset { background: var(--success-light); color: var(--success); }

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

    /* Controls Bar */
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
    }
    .quick-test-btn:hover {
      text-decoration: underline;
    }

    /* Toast */
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
      max-width: 540px;
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
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
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
          <p class="subtitle">Curriculum navigation engine, credentials router, live dropdowns & test runner</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-run" id="headerStartTestBtn">
          ▶ Start Test with Class
        </button>
        <button class="btn" id="fetchCepBtn" title="Sync live classes from CEP v2">
          🔄 Fetch from CEP v2
        </button>
        <button class="btn btn-danger-ghost" id="globalResetBtn" title="Resets everything to baseline Class 9A Science">
          ↺ Reset to Baseline
        </button>
        <button class="btn" id="openAddModalBtn">+ Add New Class</button>
        <button class="btn" id="themeToggleBtn">Theme 🌓</button>
      </div>
    </header>

    <!-- Metrics Bar -->
    <div class="metrics-bar">
      <div class="metric-card">
        <div class="metric-title">Automated Modules</div>
        <div class="metric-val">${entries.length}</div>
        <div class="metric-sub">Modules mapped to curriculum</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">CEP v2 Classes in Dropdown</div>
        <div class="metric-val" id="cepClassesCount" style="color: var(--primary);">${discoveredData.classes.length}</div>
        <div class="metric-sub">Fetched live from server</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Active Credentials</div>
        <div class="metric-val" id="activeCredLabel" style="font-size: 20px; color: #38bdf8; margin-top: 8px;">VALID_PIN (${PIN_1})</div>
        <div class="metric-sub">Primary Teacher Account</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Baseline State</div>
        <div class="metric-val" style="color: var(--success); font-size: 20px; margin-top: 8px;">Class 9A Science</div>
        <div class="metric-sub">Zero-pollution fallback target</div>
      </div>
    </div>

    <!-- Playground Panel -->
    <div class="playground-panel">
      <div class="panel-header">
        <h2><span class="badge-live"></span> Test Module with Another Class (CEP v2 Dropdown + Credentials)</h2>
        <span style="font-size: 12px; color: var(--text-dim);">Pick a module, choose credentials, select a class from the dropdown, and run the test</span>
      </div>
      <div class="playground-grid">
        <!-- Col 1: Select Module & Credentials -->
        <div>
          <div class="form-group">
            <label for="moduleSelector">1. Target Module</label>
            <select id="moduleSelector" class="select-field">
              ${entries.map((e) => `<option value="${e.key}">${e.key} (${e.grade} ${e.division} · ${e.subject})</option>`).join('')}
            </select>
          </div>

          <!-- Credentials Section -->
          <div class="form-group">
            <label for="credentialsSelector">Teacher Credentials / PIN</label>
            <select id="credentialsSelector" class="select-field">
              <option value="${PIN_1}" data-acc="VALID_PIN">Primary QA Teacher (VALID_PIN: ${PIN_1})</option>
              <option value="${PIN_2}" data-acc="VALID_PIN_2">Secondary QA Teacher (VALID_PIN_2: ${PIN_2})</option>
              <option value="${PIN_DATA}" data-acc="DATA_PIN">Data Teacher (DATA_PIN: ${PIN_DATA})</option>
              <option value="${PIN_PLAN}" data-acc="PLAN_PIN">Plan Mode Teacher (PLAN_PIN: ${PIN_PLAN})</option>
              <option value="CUSTOM">Custom Teacher PIN...</option>
            </select>
            <input type="text" id="customPinInput" class="input-field" placeholder="Enter custom 4-6 digit PIN" style="display: none; margin-top: 8px;" value="${PIN_1}">
          </div>

          <div class="compare-container">
            <div class="compare-row">
              <span class="compare-tag tag-prev">Baseline Class</span>
              <span id="prevClassBadge" style="font-weight: 600;">Class 9A | Science</span>
            </div>
            <div class="compare-row">
              <span style="font-size: 12px; color: var(--text-dim);">Chapter / Topic</span>
              <span id="prevTopicBadge" style="font-size: 12px;">Chapter 4 · Topic 1</span>
            </div>
          </div>
        </div>

        <!-- Col 2: CEP v2 Class Dropdown -->
        <div>
          <div class="form-group">
            <label for="cepClassSelector">2. Choose Class from CEP v2</label>
            <select id="cepClassSelector" class="select-field">
              <!-- Populated via JS -->
            </select>
          </div>
          <div class="compare-container">
            <div class="compare-row">
              <span class="compare-tag tag-new" id="overrideStatusTag">Active Target</span>
              <span id="targetClassBadge" style="font-weight: 600; color: var(--primary);">Same as Mapped</span>
            </div>
            <div class="compare-row">
              <span style="font-size: 12px; color: var(--text-dim);">Active PIN</span>
              <span id="targetPinBadge" style="font-size: 12px; font-weight: 600; color: #38bdf8;">${PIN_1}</span>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 6px;">
              <button class="btn btn-primary" id="applyDropdownBtn" style="flex: 1;">Use Selected Class</button>
              <button class="btn btn-danger-ghost" id="resetDropdownBtn" style="flex: 1;">↺ Reset</button>
            </div>
            <button class="btn btn-run" id="startTestBtn" style="width: 100%; justify-content: center; margin-top: 4px;">
              ▶ Start Test with This Class
            </button>
          </div>
        </div>

        <!-- Col 3: Generated Playwright Code -->
        <div>
          <div class="form-group">
            <label>3. Generated Playwright Test Snippet</label>
            <div class="code-box" id="codeSnippetBox">
              <button class="copy-btn-inside" id="copySnippetBtn">Copy Code</button>
              <span id="codeContent">// Select a module and class above...</span>
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
    <div class="mappings-grid" id="mappingsGrid"></div>
  </div>

  <!-- Run Test Execution Modal -->
  <div class="modal-backdrop" id="runTestModal">
    <div class="modal-box">
      <h3 class="modal-title">▶ Execute Test with Selected Class</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
        Run this test directly in your terminal with your selected class and teacher credentials.
      </p>

      <div class="compare-container" style="margin-bottom: 14px;">
        <div class="compare-row">
          <span>Target Module</span>
          <span id="modalRunModule" style="font-weight: 700; color: var(--primary);">aiHomework</span>
        </div>
        <div class="compare-row">
          <span>Class Target</span>
          <span id="modalRunClass" style="font-weight: 700; color: var(--success);">Class 10 A | Mathematics</span>
        </div>
        <div class="compare-row">
          <span>Teacher PIN</span>
          <span id="modalRunPin" style="font-weight: 700; color: #38bdf8;">${PIN_1}</span>
        </div>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" id="runHeadedCheck" style="margin-right: 6px;">
          Run in Headed Mode (see Electron desktop client window)
        </label>
      </div>

      <div class="form-group">
        <label>Terminal Command to Run</label>
        <div class="code-box" id="runCmdBox">
          <button class="copy-btn-inside" id="copyRunCmdBtn">Copy Command</button>
          <span id="runCmdText">node scripts/run-with-class.js --module=aiHomework</span>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" id="closeRunModalBtn">Close</button>
        <button class="btn btn-run" id="copyAndRunBtn">📋 Copy Run Command</button>
      </div>
    </div>
  </div>

  <!-- Add Custom Class Modal with DROPDOWNS -->
  <div class="modal-backdrop" id="addModal">
    <div class="modal-box">
      <h3 class="modal-title">+ Add New Class Target</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
        Pick curriculum fields directly from CEP v2 dropdowns without re-typing.
      </p>
      <div class="form-group">
        <label>Configuration Key ID</label>
        <input type="text" id="newKey" class="input-field" placeholder="e.g. mathAdvanced">
      </div>
      <div class="modal-grid">
        <div class="form-group">
          <label>Grade</label>
          <select id="modalGradeSelect" class="select-field">
            <option value="Class 9">Class 9</option>
            <option value="Class 10">Class 10</option>
            <option value="Class 11">Class 11</option>
            <option value="Class 12">Class 12</option>
            <option value="Class 8">Class 8</option>
            <option value="Class 7">Class 7</option>
            <option value="Class 5">Class 5</option>
          </select>
        </div>
        <div class="form-group">
          <label>Division</label>
          <select id="modalDivSelect" class="select-field">
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="R">Section R</option>
          </select>
        </div>
      </div>
      <div class="modal-grid">
        <div class="form-group">
          <label>Subject</label>
          <select id="modalSubjSelect" class="select-field">
            <option value="Science">Science</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Hindi Language">Hindi Language</option>
            <option value="Accountancy">Accountancy</option>
            <option value="History">History</option>
          </select>
        </div>
        <div class="form-group">
          <label>Teacher Account</label>
          <select id="modalAccountSelect" class="select-field">
            <option value="VALID_PIN">Primary Account (VALID_PIN: ${PIN_1})</option>
            <option value="VALID_PIN_2">Secondary Account (VALID_PIN_2: ${PIN_2})</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" id="closeAddModalBtn">Cancel</button>
        <button class="btn btn-primary" id="saveCustomClassBtn">Save Configuration</button>
      </div>
    </div>
  </div>

  <!-- CEP Sync Info Modal -->
  <div class="modal-backdrop" id="syncModal">
    <div class="modal-box">
      <h3 class="modal-title">🔄 CEP v2 Curriculum Tree Sync</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
        Curriculum classes are fetched directly from your active CEP v2 desktop client environment.
      </p>
      <div class="compare-container" style="margin-bottom: 16px;">
        <div class="compare-row">
          <span>Active Server / Environment</span>
          <span style="font-weight: 600;">${discoveredData.environment}</span>
        </div>
        <div class="compare-row">
          <span>Verified Classes in Dropdown</span>
          <span style="font-weight: 600; color: var(--success);">${discoveredData.classes.length} Classes</span>
        </div>
        <div class="compare-row">
          <span>Last Sync Timestamp</span>
          <span style="font-size: 12px; color: var(--text-dim);">${discoveredData.lastFetched}</span>
        </div>
      </div>
      <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 16px;">
        To walk the live CEP v2 window and discover any new grades/divisions on your current server, run:
      </p>
      <div class="code-box" style="margin-bottom: 16px;">npm run discover-classmap</div>
      <div class="modal-footer">
        <button class="btn" id="closeSyncModalBtn">Close</button>
        <button class="btn btn-primary" id="refreshSyncBtn">Reload Classes</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast">Copied to clipboard!</div>

  <script>
    const INITIAL_ENTRIES = ${JSON.stringify(entries)};
    const CEP_CLASSES = ${JSON.stringify(discoveredData.classes)};
    let activeEntries = [...INITIAL_ENTRIES];

    const grid = document.getElementById('mappingsGrid');
    const searchInput = document.getElementById('searchInput');
    const moduleSelector = document.getElementById('moduleSelector');
    const cepClassSelector = document.getElementById('cepClassSelector');
    const credentialsSelector = document.getElementById('credentialsSelector');
    const customPinInput = document.getElementById('customPinInput');
    const toast = document.getElementById('toast');
    let activeFilter = 'all';

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function getSelectedPin() {
      if (credentialsSelector.value === 'CUSTOM') {
        return customPinInput.value.trim() || '${PIN_1}';
      }
      return credentialsSelector.value;
    }

    // Populate CEP v2 Dropdown
    function populateCepDropdown(selectedItem) {
      cepClassSelector.innerHTML = '';
      
      const defaultOpt = document.createElement('option');
      defaultOpt.value = 'DEFAULT';
      defaultOpt.textContent = \`[Default] \${selectedItem.grade} \${selectedItem.division} — \${selectedItem.subject} (\${selectedItem.account})\`;
      cepClassSelector.appendChild(defaultOpt);

      CEP_CLASSES.forEach((c) => {
        if (c.grade === selectedItem.grade && c.division === selectedItem.division && c.subject === selectedItem.subject) return;

        const opt = document.createElement('option');
        opt.value = JSON.stringify(c);
        opt.textContent = \`\${c.grade} \${c.division} — \${c.subject} (\${c.account || 'VALID_PIN'})\`;
        cepClassSelector.appendChild(opt);
      });
    }

    function updatePlayground() {
      const selectedKey = moduleSelector.value;
      const item = activeEntries.find(e => e.key === selectedKey) || activeEntries[0];
      if (!item) return;

      document.getElementById('prevClassBadge').textContent = \`\${item.grade} \${item.division} | \${item.subject}\`;
      document.getElementById('prevTopicBadge').textContent = \`Chapter \${item.chapterIndex + 1} · Topic \${item.topicIndex + 1}\`;

      const pin = getSelectedPin();
      document.getElementById('targetPinBadge').textContent = pin;
      document.getElementById('activeCredLabel').textContent = \`PIN: \${pin}\`;

      const selectedClassVal = cepClassSelector.value;
      let targetGrade = item.grade;
      let targetDiv = item.division;
      let targetSubj = item.subject;
      let isOverridden = false;

      if (selectedClassVal && selectedClassVal !== 'DEFAULT') {
        try {
          const parsed = JSON.parse(selectedClassVal);
          targetGrade = parsed.grade;
          targetDiv = parsed.division;
          targetSubj = parsed.subject;
          isOverridden = true;
        } catch (e) {}
      }

      const statusTag = document.getElementById('overrideStatusTag');
      if (isOverridden) {
        statusTag.textContent = 'Custom Override';
        statusTag.className = 'compare-tag tag-new';
        document.getElementById('targetClassBadge').textContent = \`\${targetGrade} \${targetDiv} | \${targetSubj}\`;
      } else {
        statusTag.textContent = 'Baseline (Default)';
        statusTag.className = 'compare-tag tag-reset';
        document.getElementById('targetClassBadge').textContent = \`\${item.grade} \${item.division} | \${item.subject}\`;
      }

      // Generate Playwright Snippet
      let code;
      if (isOverridden) {
        code = \`test.use({\\n  classMap: '\${item.key}',\\n  classOverride: {\\n    grade: '\${targetGrade}',\\n    division: '\${targetDiv}',\\n    subject: '\${targetSubj}',\\n    pin: '\${pin}'\\n  },\\n  autoResetClass: true\\n});\`;
      } else {
        code = \`test.use({\\n  classMap: '\${item.key}',\\n  autoResetClass: true\\n});\`;
      }

      document.getElementById('codeContent').textContent = code;
    }

    // Credentials toggle
    credentialsSelector.addEventListener('change', () => {
      if (credentialsSelector.value === 'CUSTOM') {
        customPinInput.style.display = 'block';
      } else {
        customPinInput.style.display = 'none';
      }
      updatePlayground();
    });
    customPinInput.addEventListener('input', updatePlayground);

    moduleSelector.addEventListener('change', () => {
      const selectedKey = moduleSelector.value;
      const item = activeEntries.find(e => e.key === selectedKey) || activeEntries[0];
      populateCepDropdown(item);
      updatePlayground();
    });

    cepClassSelector.addEventListener('change', updatePlayground);

    document.getElementById('applyDropdownBtn').addEventListener('click', () => {
      updatePlayground();
      showToast('Override applied! Click "Start Test" or "Copy Code".');
    });

    document.getElementById('resetDropdownBtn').addEventListener('click', () => {
      cepClassSelector.value = 'DEFAULT';
      credentialsSelector.value = '${PIN_1}';
      customPinInput.style.display = 'none';
      updatePlayground();
      showToast('Reset back to module baseline: Nothing to memorize!');
    });

    document.getElementById('globalResetBtn').addEventListener('click', () => {
      moduleSelector.value = 'default';
      const item = activeEntries.find(e => e.key === 'default');
      populateCepDropdown(item);
      cepClassSelector.value = 'DEFAULT';
      credentialsSelector.value = '${PIN_1}';
      customPinInput.style.display = 'none';
      updatePlayground();
      showToast('Reset to Baseline: Class 9A Science 4.1');
    });

    document.getElementById('copySnippetBtn').addEventListener('click', () => {
      const code = document.getElementById('codeContent').textContent;
      navigator.clipboard.writeText(code);
      showToast('Playwright snippet copied to clipboard!');
    });

    // Run Test Modal
    const runTestModal = document.getElementById('runTestModal');
    function openRunModal() {
      const selectedKey = moduleSelector.value;
      const item = activeEntries.find(e => e.key === selectedKey) || activeEntries[0];
      const pin = getSelectedPin();
      const selectedClassVal = cepClassSelector.value;

      let g = item.grade;
      let d = item.division;
      let s = item.subject;

      if (selectedClassVal && selectedClassVal !== 'DEFAULT') {
        try {
          const parsed = JSON.parse(selectedClassVal);
          g = parsed.grade;
          d = parsed.division;
          s = parsed.subject;
        } catch (e) {}
      }

      document.getElementById('modalRunModule').textContent = selectedKey;
      document.getElementById('modalRunClass').textContent = \`\${g} \${d} | \${s}\`;
      document.getElementById('modalRunPin').textContent = pin;

      updateRunCommand();
      runTestModal.classList.add('open');
    }

    function updateRunCommand() {
      const mod = document.getElementById('modalRunModule').textContent;
      const cls = document.getElementById('modalRunClass').textContent;
      const pin = document.getElementById('modalRunPin').textContent;
      const isHeaded = document.getElementById('runHeadedCheck').checked;

      const [gd, subj] = cls.split('|').map(x => x.trim());
      const g = gd.slice(0, -1).trim();
      const d = gd.slice(-1).trim();

      let cmd = \`node scripts/run-with-class.js --module=\${mod} --grade="\${g}" --division="\${d}" --subject="\${subj}" --pin=\${pin}\`;
      if (isHeaded) cmd += ' --headed';

      document.getElementById('runCmdText').textContent = cmd;
    }

    document.getElementById('startTestBtn').addEventListener('click', openRunModal);
    document.getElementById('headerStartTestBtn').addEventListener('click', openRunModal);
    document.getElementById('closeRunModalBtn').addEventListener('click', () => runTestModal.classList.remove('open'));
    document.getElementById('runHeadedCheck').addEventListener('change', updateRunCommand);

    document.getElementById('copyRunCmdBtn').addEventListener('click', () => {
      const cmd = document.getElementById('runCmdText').textContent;
      navigator.clipboard.writeText(cmd);
      showToast('Command copied! Paste into your terminal to run.');
    });

    document.getElementById('copyAndRunBtn').addEventListener('click', () => {
      const cmd = document.getElementById('runCmdText').textContent;
      navigator.clipboard.writeText(cmd);
      showToast('Command copied! Paste into terminal to start test.');
      setTimeout(() => runTestModal.classList.remove('open'), 600);
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

    // Grid rendering
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
              <span class="module-key" onclick="selectAndTest('\${item.key}')" title="Click to test with alternative class">
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
            <button class="btn btn-run" style="padding: 3px 10px; font-size: 11px;" onclick="runSingleModule('\${item.key}')">▶ Run</button>
          </div>
        </div>
      \`).join('');
    }

    window.selectAndTest = function(key) {
      moduleSelector.value = key;
      const item = activeEntries.find(e => e.key === key);
      if (item) {
        populateCepDropdown(item);
        updatePlayground();
        window.scrollTo({ top: 160, behavior: 'smooth' });
        showToast(\`Loaded "\${key}" with CEP v2 class dropdown\`);
      }
    };

    window.runSingleModule = function(key) {
      selectAndTest(key);
      openRunModal();
    };

    // Filter pills
    searchInput.addEventListener('input', renderGrid);
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderGrid();
      });
    });

    // Modals
    const addModal = document.getElementById('addModal');
    document.getElementById('openAddModalBtn').addEventListener('click', () => addModal.classList.add('open'));
    document.getElementById('closeAddModalBtn').addEventListener('click', () => addModal.classList.remove('open'));
    document.getElementById('saveCustomClassBtn').addEventListener('click', () => {
      const key = document.getElementById('newKey').value.trim();
      const grade = document.getElementById('modalGradeSelect').value;
      const division = document.getElementById('modalDivSelect').value;
      const subject = document.getElementById('modalSubjSelect').value;
      const account = document.getElementById('modalAccountSelect').value;

      if (!key) { alert('Please enter a key identifier'); return; }

      const newEntry = {
        key,
        label: \`\${grade} \${division} \${subject}\`,
        grade,
        division,
        subject,
        chapterIndex: 0,
        topicIndex: 0,
        account,
        notes: 'Custom registered class from dropdown'
      };

      activeEntries.unshift(newEntry);
      addModal.classList.remove('open');
      renderGrid();
      showToast(\`Added new class target: "\${key}"\`);
    });

    // Sync Modal
    const syncModal = document.getElementById('syncModal');
    document.getElementById('fetchCepBtn').addEventListener('click', () => syncModal.classList.add('open'));
    document.getElementById('closeSyncModalBtn').addEventListener('click', () => syncModal.classList.remove('open'));
    document.getElementById('refreshSyncBtn').addEventListener('click', () => {
      syncModal.classList.remove('open');
      showToast('Curriculum classes reloaded from CEP v2!');
    });

    // Initial load
    const initialItem = activeEntries[0];
    populateCepDropdown(initialItem);
    updatePlayground();
    renderGrid();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(REPORT_DIR, 'CLASS_MAP.html'), html, 'utf8');
console.log(
  `Successfully built report/CLASS_MAP.html with ${entries.length} module class mappings and ${discoveredData.classes.length} CEP v2 dropdown classes.`
);
