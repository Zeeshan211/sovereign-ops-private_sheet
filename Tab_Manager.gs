// @ts-nocheck
/**
 * Tab_Manager.gs v1.3 — Verified Strings (7 visible tabs)
 * 
 * VISIBLE WHITELIST (7):
 *   ⚡ Mission · 📋 Habits · 🕌 Salah · 💰 Finance Hub
 *   💸 Transactions · 💳 Debts · 📈 Progress
 * 
 * AUTO-HIDDEN: all other tabs (active + snapshots + zombies).
 * Hidden ≠ deleted. Fully reversible via showAllTabs().
 * 
 * Self-contained. Idempotent. Safe to re-run.
 * 
 * @version 1.3
 * @date    2026-04-29
 */

const _TM_WHITELIST = [
  '⚡ Mission',
  '📋 Habits',
  '🕌 Salah',
  '💰 Finance Hub',
  '💸 Transactions',
  '💳 Debts',
  '📈 Progress',
    '🏥 Health',
  '📚 Food Library'
];

const _TM_COLORS = {
  '⚡ Mission':      '#7c3aed',
  '📈 Progress':     '#7c3aed',
  '📋 Habits':       '#16a34a',
  '🕌 Salah':        '#f59e0b',
  '💰 Finance Hub':  '#2563eb',
  '💸 Transactions': '#3b82f6',
  '💳 Debts':        '#dc2626',
  '🏥 Health':       '#16a34a',
  '📚 Food Library': '#16a34a'
};

/**
 * Main entry: enforces the 7-tab whitelist.
 */
function applyTabVisibility() {
  const ss = SpreadsheetApp.getActive();
  let shown = 0, hidden = 0, colored = 0, errors = 0, snapHidden = 0;

  // PASS 1: show + color whitelisted tabs
  _TM_WHITELIST.forEach(function(name) {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      try {
        sheet.showSheet();
        shown++;
        if (_TM_COLORS[name]) {
          sheet.setTabColor(_TM_COLORS[name]);
          colored++;
        }
      } catch (e) {
        errors++;
      }
    }
  });

  // ABORT-GUARD: never hide everything
  if (shown === 0) {
    const warn = '⚠️ Aborted: zero whitelisted tabs found.\n\n' +
                 'Expected:\n  ' + _TM_WHITELIST.join('\n  ');
    _tabAlert(warn);
    return;
  }

  // PASS 2: hide non-whitelisted tabs (track snapshots separately)
  ss.getSheets().forEach(function(sheet) {
    const name = sheet.getName();
    if (_TM_WHITELIST.indexOf(name) === -1) {
      try {
        sheet.hideSheet();
        if (name.indexOf('📦 Snap') === 0) snapHidden++;
        else hidden++;
      } catch (e) {
        errors++;
      }
    }
  });

  const msg = '✅ Tab visibility applied.\n\n' +
              'Visible:    ' + shown + ' / 7 whitelisted\n' +
              'Hidden:     ' + hidden + ' active tabs\n' +
              'Snapshots:  ' + snapHidden + ' hidden\n' +
              'Colored:    ' + colored + '\n' +
              'Errors:     ' + errors;
  _tabAlert(msg);
}

/**
 * Emergency unhide: shows ALL hidden tabs.
 */
function showAllTabs() {
  const ss = SpreadsheetApp.getActive();
  let unhidden = 0;

  ss.getSheets().forEach(function(sheet) {
    if (sheet.isSheetHidden()) {
      try {
        sheet.showSheet();
        unhidden++;
      } catch (e) {}
    }
  });

  const msg = '🙈 → 👀 All tabs unhidden.\n\n' +
              'Total unhidden: ' + unhidden + '\n\n' +
              'Run applyTabVisibility() to re-enforce the 7-tab whitelist.';
  _tabAlert(msg);
}

/**
 * Menu-callable: unhide ONE specific tab and switch to it.
 */
function showSpecificTab(tabName) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    _tabAlert('❌ Tab not found: ' + tabName);
    return;
  }
  sheet.showSheet();
  ss.setActiveSheet(sheet);
}

/**
 * Menu-callable: re-hide all non-whitelisted tabs (alias).
 */
function rehideAllNonWhitelisted() {
  applyTabVisibility();
}

/**
 * Internal alert helper. Falls back to native UI if safeAlert undefined.
 */
function _tabAlert(msg) {
  if (typeof safeAlert === 'function') {
    safeAlert(msg);
  } else {
    try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  }
}