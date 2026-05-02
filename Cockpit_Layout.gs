// ════════════════════════════════════════════════════════════════════
// 🎯 Cockpit_Layout.gs — UNIVERSAL COLUMN WIDTH CONFIG v1.0
// LOCKED · 7-Layer Audit · Day 6 · 2026-04-30
//
// PURPOSE:
//   ONE place to control column widths for every cockpit. Change a
//   number here → run apply → all tabs reflow to that width.
//
// SAFETY:
//   This file is INCAPABLE of destroying data.
//   - Only calls setColumnWidth() (pure visual operation)
//   - Never touches cell values, formulas, formats, or validations
//   - Never calls any rebuild function
//   - Idempotent — running 100x = running 1x
//
// USAGE:
//   1. Edit numbers in LAYOUT_CONFIG below to taste
//   2. Sheet menu → 🎯 Layout → 🎯 Apply All Widths
//   3. Diagnose anytime → 🎯 Layout → 🔍 Show Current Widths (read-only)
// ════════════════════════════════════════════════════════════════════

// Target total width — the "comfortable no-scroll" target on your screen
// Per memory: monitor 1920×1200, usable ~1500px after Chrome chrome
const LAYOUT_TARGET_WIDTH = 1500;

// Per-cockpit config:
//   cols           — total column count for that tab
//   defaultWidth   — width in px for each col (auto-computed if omitted)
//   overrides      — { col_number: width_px } for specific cols
//
// To change a tab's look:
//   - Bump defaultWidth higher → wider feel, may scroll
//   - Lower defaultWidth → narrower feel, more compact
//   - Add overrides for specific cols (e.g. wider Notes col)
const LAYOUT_CONFIG = {
  '⚡ Mission':       { cols: 12, defaultWidth: 125 },
  '📈 Progress':      { cols: 12, defaultWidth: 125,
    overrides: { 1: 90, 12: 140 } },  // narrower DATE, wider NOTES

  '💰 Finance Hub':   { cols: 12, defaultWidth: 125 },
  '💸 Transactions':  { cols: 14, defaultWidth: 100,
    overrides: { 8: 150, 9: 150, 14: 120 } },  // wider Counterparty/Notes/TxnID
  '🏦 Accounts':      { cols: 10, defaultWidth: 150 },
  '📊 Budget':        { cols: 11, defaultWidth: 135 },
  '📅 Bills':         { cols: 10, defaultWidth: 150 },
  '💳 Debts':         { cols: 12, defaultWidth: 125 },

  '🎨 Themes':        { cols: 12, defaultWidth: 125 },
  '📋 Habits':        { cols: 12, defaultWidth: 125 },
  '🕌 Salah':         { cols: 11, defaultWidth: 135 },
  '🏥 Health':        { cols: 10, defaultWidth: 150 },
  '📚 Food Library':  { cols: 8,  defaultWidth: 185 },

  '🎯 KPIs':          { cols: 9,  defaultWidth: 165 },
  '⚙️ Settings':      { cols: 6,  defaultWidth: 250 }
};

const LAYOUT_TZ = 'Asia/Karachi';

function _layAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
}

function _layLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

// ──────────────────────────────────────────────────────────
// APPLY — to single tab
// ──────────────────────────────────────────────────────────

function applyLayoutToCockpit(tabName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(tabName);
  if (!sh) return { ok: false, name: tabName, reason: 'tab not found' };

  const cfg = LAYOUT_CONFIG[tabName];
  if (!cfg) return { ok: false, name: tabName, reason: 'no config entry' };

  const cols = cfg.cols;
  const defaultW = cfg.defaultWidth || Math.floor(LAYOUT_TARGET_WIDTH / cols);
  const overrides = cfg.overrides || {};

  let totalWidth = 0;
  for (let c = 1; c <= cols; c++) {
    const w = overrides[c] || defaultW;
    try {
      sh.setColumnWidth(c, w);
      totalWidth += w;
    } catch (e) {
      Logger.log('setColumnWidth ' + tabName + ' col ' + c + ' err: ' + e);
    }
  }

  return { ok: true, name: tabName, cols: cols, defaultWidth: defaultW, totalWidth: totalWidth };
}

// ──────────────────────────────────────────────────────────
// APPLY — to all configured tabs
// ──────────────────────────────────────────────────────────

function applyLayoutToAll() {
  const results = [];
  Object.keys(LAYOUT_CONFIG).forEach(name => {
    const r = applyLayoutToCockpit(name);
    results.push(r);
  });

  let okCount = results.filter(r => r.ok).length;
  let failCount = results.filter(r => !r.ok).length;

  let msg = '🎯 LAYOUT APPLIED · ' + okCount + ' tabs · ' + failCount + ' skipped\n\n';
  msg += 'Target: ' + LAYOUT_TARGET_WIDTH + 'px (your screen width)\n\n';

  results.forEach(r => {
    if (r.ok) {
      const fit = r.totalWidth <= LAYOUT_TARGET_WIDTH ? '✓' : '⚠️';
      msg += fit + ' ' + r.name + '   ·   ' + r.cols + '×' + r.defaultWidth + 
             ' = ' + r.totalWidth + 'px\n';
    } else {
      msg += '✗ ' + r.name + '   ·   ' + r.reason + '\n';
    }
  });

  msg += '\n💡 ⚠️ = exceeds your screen — may scroll. Lower defaultWidth in code.\n';
  msg += '✓ = fits comfortably.\n\n';
  msg += '⏪ This was non-destructive (only column widths changed).\n';
  msg += 'No data touched. Run again anytime.';

  _layLog('LAYOUT_APPLY_ALL', okCount + ' applied · ' + failCount + ' skipped');
  _layAlert(msg);
}

// ──────────────────────────────────────────────────────────
// DIAGNOSE — read-only inspection of current widths
// ──────────────────────────────────────────────────────────

function diagnoseLayout() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabs = Object.keys(LAYOUT_CONFIG);
  let msg = '🔍 CURRENT COLUMN WIDTHS (read-only)\n';
  msg += 'Target: ' + LAYOUT_TARGET_WIDTH + 'px\n\n';

  tabs.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) {
      msg += '✗ ' + name + ' (tab missing)\n';
      return;
    }
    const cfg = LAYOUT_CONFIG[name];
    let total = 0;
    let widths = [];
    for (let c = 1; c <= cfg.cols; c++) {
      try {
        const w = sh.getColumnWidth(c);
        widths.push(w);
        total += w;
      } catch (e) {}
    }
    const fit = total <= LAYOUT_TARGET_WIDTH ? '✓' : '⚠️';
    const targetTotal = (cfg.defaultWidth || Math.floor(LAYOUT_TARGET_WIDTH / cfg.cols)) * cfg.cols;
    const drift = total !== targetTotal ? ' (config says ' + targetTotal + ')' : '';
    msg += fit + ' ' + name + '   ·   ' + cfg.cols + ' cols · current ' + total + 'px' + drift + '\n';
  });

  msg += '\n✓ = fits screen · ⚠️ = scrolls · drift = config differs from sheet';
  _layAlert(msg);
}

// ──────────────────────────────────────────────────────────
// QUICK PRESETS — for tweaking from menu without editing code
// ──────────────────────────────────────────────────────────

function applyLayoutCompact() {
  // Tighter layout — 1300px target
  Object.keys(LAYOUT_CONFIG).forEach(name => {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!sh) return;
    const cfg = LAYOUT_CONFIG[name];
    const compactW = Math.floor(1300 / cfg.cols);
    for (let c = 1; c <= cfg.cols; c++) {
      try { sh.setColumnWidth(c, compactW); } catch (e) {}
    }
  });
  _layAlert('✓ Compact layout applied (1300px target).\nRun "Apply All Widths" to revert to your config.');
}

function applyLayoutSpacious() {
  // Wider layout — 1700px target (will scroll on most screens)
  Object.keys(LAYOUT_CONFIG).forEach(name => {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!sh) return;
    const cfg = LAYOUT_CONFIG[name];
    const wideW = Math.floor(1700 / cfg.cols);
    for (let c = 1; c <= cfg.cols; c++) {
      try { sh.setColumnWidth(c, wideW); } catch (e) {}
    }
  });
  _layAlert('✓ Spacious layout applied (1700px target).\nMay cause horizontal scroll. Use "Apply All Widths" to revert.');
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendLayoutMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🎯 Layout')
      .addItem('🎯 Apply All Widths (from config)', 'applyLayoutToAll')
      .addItem('🔍 Show Current Widths (read-only)', 'diagnoseLayout')
      .addSeparator()
      .addItem('📐 Quick: Compact (1300px)', 'applyLayoutCompact')
      .addItem('📐 Quick: Standard (1500px) — same as Apply All', 'applyLayoutToAll')
      .addItem('📐 Quick: Spacious (1700px)', 'applyLayoutSpacious')
      .addToUi();
  } catch (e) { Logger.log('Layout menu add failed: ' + e); }
}