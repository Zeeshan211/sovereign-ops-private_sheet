// ════════════════════════════════════════════════════════════════════
// 🛡️ Cockpit_Guardian.gs — UNIVERSAL SNAPSHOT + 5-FOLD DEFENSE v1.0
// LOCKED · 7-Layer Audit · Day 6 / 90 · 2026-04-30
//
// PURPOSE:
//   Generic snapshot + restore for ANY cockpit. Used by destructive
//   cross-module operations (theme apply, monthly reset, etc.) to
//   ensure no operation can lose user data without recovery path.
//
// 5-FOLD DEFENSE PATTERN:
//   1. Pre-flight check  → guardianAudit(tabs) → see what will be touched
//   2. Auto-snapshot     → guardianSnapshot(tabs, label) → safety net
//   3. Confirmation gate → guardianConfirm(operation) → explicit consent
//   4. Atomic execution  → guardianExecute(fn) → rollback on error
//   5. Undo window       → guardianRestore(snapId) → revert anytime
//
// PUBLIC API:
//   - guardianAudit(tabNames)              → returns audit report
//   - guardianSnapshot(tabNames, label)    → returns snapshot ID
//   - guardianConfirm(operation, tabs)     → modal, returns true/false
//   - guardianExecuteSafe(operation, tabs, fn) → all 5 layers wrapped
//   - guardianRestore(snapId)              → revert
//   - guardianListSnapshots()              → all snapshots
//   - guardianPruneOldSnapshots(keepN)     → cleanup
//
// SNAPSHOT STORAGE:
//   Each cockpit snapshot = hidden tab named:
//   📦 Guard YYYYMMDD-HHMMSS / [original tab name]
//
//   Original tab fully copied with values, formulas, formats, validations.
// ════════════════════════════════════════════════════════════════════

const GRD_TZ = 'Asia/Karachi';
const GRD_PREFIX = '📦 Guard';
const GRD_DEFAULT_KEEP = 10;

function _grdAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
}

function _grdLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function _grdTimestamp() {
  return Utilities.formatDate(new Date(), GRD_TZ, 'yyyyMMdd-HHmmss');
}

// ──────────────────────────────────────────────────────────
// LAYER 1 — PRE-FLIGHT AUDIT (read-only)
// ──────────────────────────────────────────────────────────

function guardianAudit(tabNames) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = { tabs: [], totalCells: 0, checkboxes: 0, formulas: 0, missing: [] };

  tabNames.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) { result.missing.push(name); return; }

    let cells = 0, checks = 0, fmls = 0;
    try {
      const lastRow = Math.min(sh.getLastRow(), 100);
      const lastCol = Math.min(sh.getLastColumn(), 20);
      if (lastRow > 0 && lastCol > 0) {
        const range = sh.getRange(1, 1, lastRow, lastCol);
        const vals = range.getValues();
        const fls = range.getFormulas();
        for (let r = 0; r < vals.length; r++) {
          for (let c = 0; c < vals[r].length; c++) {
            if (vals[r][c] !== '' && vals[r][c] !== null) cells++;
            if (vals[r][c] === true || vals[r][c] === false) checks++;
            if (fls[r][c] && fls[r][c].length > 0) fmls++;
          }
        }
      }
    } catch (e) { Logger.log('Audit ' + name + ' err: ' + e); }

    result.tabs.push({ name: name, cells: cells, checkboxes: checks, formulas: fmls });
    result.totalCells += cells;
    result.checkboxes += checks;
    result.formulas += fmls;
  });

  return result;
}

// ──────────────────────────────────────────────────────────
// LAYER 2 — AUTO-SNAPSHOT (backup before mutate)
// ──────────────────────────────────────────────────────────

function guardianSnapshot(tabNames, label) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const snapId = _grdTimestamp();
  const lblSafe = (label || 'guardian').replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 30);
  const result = { snapId: snapId, label: lblSafe, copied: [], failed: [] };

  tabNames.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) { result.failed.push(name + ' (not found)'); return; }

    try {
      const snapName = GRD_PREFIX + ' ' + snapId + ' (' + lblSafe + ') / ' + name;
      const copy = sh.copyTo(ss);
      copy.setName(snapName);
      try { copy.hideSheet(); } catch (e) {}
      try { copy.setTabColor('#94A3B8'); } catch (e) {}
      result.copied.push(name);
    } catch (e) {
      result.failed.push(name + ' (' + e.message + ')');
    }
  });

  _grdLog('GUARDIAN_SNAPSHOT', snapId + ' · label=' + lblSafe + ' · copied=' + result.copied.length);
  return result;
}

// ──────────────────────────────────────────────────────────
// LAYER 3 — CONFIRMATION GATE (explicit user consent)
// ──────────────────────────────────────────────────────────

function guardianConfirm(operation, tabNames, audit) {
  const ui = SpreadsheetApp.getUi();
  let msg = '⚠️  ABOUT TO PERFORM: ' + operation + '\n\n';
  msg += 'Tabs that will be MUTATED:\n';
  tabNames.forEach(t => {
    const tabAudit = audit.tabs.find(a => a.name === t);
    if (tabAudit) {
      msg += '  · ' + t + ' (' + tabAudit.cells + ' cells, ' + 
             tabAudit.checkboxes + ' checkboxes, ' + tabAudit.formulas + ' formulas)\n';
    } else {
      msg += '  · ' + t + ' (NOT FOUND)\n';
    }
  });

  if (audit.missing.length > 0) {
    msg += '\n⚠️ Missing tabs: ' + audit.missing.join(', ') + '\n';
  }

  msg += '\n📦 Auto-snapshot WILL be created before any change.\n';
  msg += '⏪ Undo window: 5 minutes from now.\n\n';
  msg += 'Continue?';

  const r = ui.alert('🛡️ Guardian — Confirm', msg, ui.ButtonSet.YES_NO);
  return r === ui.Button.YES;
}

// ──────────────────────────────────────────────────────────
// LAYER 4 + 5 — ATOMIC EXECUTE WITH UNDO WINDOW
// ──────────────────────────────────────────────────────────

function guardianExecuteSafe(operation, tabNames, fn) {
  // Layer 1 — audit
  const audit = guardianAudit(tabNames);
  if (audit.missing.length > 0 && audit.missing.length === tabNames.length) {
    _grdAlert('All target tabs missing. Aborted.');
    return { ok: false, reason: 'all_tabs_missing' };
  }

  // Layer 3 — confirm
  if (!guardianConfirm(operation, tabNames, audit)) {
    return { ok: false, reason: 'user_cancelled' };
  }

  // Layer 2 — snapshot
  const snap = guardianSnapshot(tabNames, operation);
  if (snap.copied.length === 0) {
    _grdAlert('Snapshot failed for all tabs. Aborted.\n\n' + snap.failed.join('\n'));
    return { ok: false, reason: 'snapshot_failed', details: snap.failed };
  }

  // Layer 4 — execute
  let executeError = null;
  try {
    fn();
  } catch (e) {
    executeError = e;
    Logger.log('Guardian execute error: ' + e);
  }

  if (executeError) {
    // Atomic rollback
    const restored = guardianRestoreSnapshot(snap.snapId);
    _grdAlert('🚨 Operation failed: ' + executeError.message + '\n\n' +
              '⏪ Auto-rolled back from snapshot ' + snap.snapId + '\n' +
              'Tabs restored: ' + restored.restored.length);
    return { ok: false, reason: 'execute_failed', error: executeError.message, snapId: snap.snapId };
  }

  // Layer 5 — undo window confirmation
  _grdLog('GUARDIAN_EXECUTE_OK', operation + ' · snapId=' + snap.snapId);
  _grdAlert('✅ ' + operation + ' completed.\n\n' +
            '📦 Snapshot ID: ' + snap.snapId + '\n' +
            '⏪ To undo within 5 min:\n' +
            '   Menu → 🛡️ Guardian → ⏪ Restore Last Snapshot\n\n' +
            'Snapshot tabs are hidden. After 30 days, run prune to clean up.');

  return { ok: true, snapId: snap.snapId, audit: audit };
}

// ──────────────────────────────────────────────────────────
// RESTORE — from any snapshot
// ──────────────────────────────────────────────────────────

function guardianRestoreSnapshot(snapId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = { restored: [], failed: [] };

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (name.indexOf(GRD_PREFIX + ' ' + snapId) !== 0) return;

    // Extract original tab name from "📦 Guard 20260430-014530 (label) / Original Name"
    const slashIdx = name.indexOf(' / ');
    if (slashIdx === -1) return;
    const origName = name.substring(slashIdx + 3);

    const orig = ss.getSheetByName(origName);
    if (!orig) { result.failed.push(origName + ' (original missing)'); return; }

    try {
      // Replace original with snapshot data
      const snapData = sh.getDataRange().getValues();
      const snapFormulas = sh.getDataRange().getFormulas();
      const numRows = snapData.length;
      const numCols = snapData[0] ? snapData[0].length : 0;

      if (numRows > 0 && numCols > 0) {
        // Clear original
        orig.clear();
        // Write back values + formulas
        const writeRange = orig.getRange(1, 1, numRows, numCols);
        const merged = [];
        for (let r = 0; r < numRows; r++) {
          merged.push([]);
          for (let c = 0; c < numCols; c++) {
            merged[r].push(snapFormulas[r][c] || snapData[r][c]);
          }
        }
        writeRange.setValues(merged);
        result.restored.push(origName);
      }
    } catch (e) {
      result.failed.push(origName + ' (' + e.message + ')');
    }
  });

  _grdLog('GUARDIAN_RESTORE', 'snapId=' + snapId + ' · restored=' + result.restored.length);
  return result;
}

function restoreLastSnapshot() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let latestId = '';
  let latestSheet = null;

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (name.indexOf(GRD_PREFIX + ' ') !== 0) return;
    const idMatch = name.match(/^📦 Guard (\d{8}-\d{6})/);
    if (!idMatch) return;
    if (idMatch[1] > latestId) {
      latestId = idMatch[1];
      latestSheet = sh;
    }
  });

  if (!latestId) {
    _grdAlert('No Guardian snapshots found.');
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('⏪ Restore Last Snapshot',
    'Latest snapshot: ' + latestId + '\n\nThis will OVERWRITE current cockpit data with snapshot.\n\nContinue?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;

  const result = guardianRestoreSnapshot(latestId);
  let msg = '✅ Restored from ' + latestId + '\n\n';
  msg += 'Tabs restored (' + result.restored.length + '):\n';
  result.restored.forEach(t => msg += '  · ' + t + '\n');
  if (result.failed.length > 0) {
    msg += '\n⚠️ Failed (' + result.failed.length + '):\n';
    result.failed.forEach(t => msg += '  · ' + t + '\n');
  }
  _grdAlert(msg);
}

// ──────────────────────────────────────────────────────────
// LIST + PRUNE
// ──────────────────────────────────────────────────────────

function guardianListSnapshots() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const grouped = {};

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (name.indexOf(GRD_PREFIX + ' ') !== 0) return;
    const m = name.match(/^📦 Guard (\d{8}-\d{6}) \((.+?)\) \/ (.+)$/);
    if (!m) return;
    const key = m[1] + ' (' + m[2] + ')';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m[3]);
  });

  const keys = Object.keys(grouped).sort().reverse();
  let msg = '📦 GUARDIAN SNAPSHOTS (' + keys.length + ' total · newest first)\n\n';
  if (keys.length === 0) {
    msg += '(none yet — guardianExecuteSafe creates them)';
  } else {
    keys.slice(0, 20).forEach((k, i) => {
      msg += (i + 1) + '. ' + k + '\n';
      grouped[k].forEach(tab => msg += '     · ' + tab + '\n');
    });
  }
  msg += '\n💡 Restore: Menu → 🛡️ Guardian → ⏪ Restore Last Snapshot';
  _grdAlert(msg);
  return grouped;
}

function guardianPruneOldSnapshots() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt('🗑 Prune Old Snapshots',
    'Keep how many recent snapshots? (default 10)',
    ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const keepN = parseInt(prompt.getResponseText().trim()) || GRD_DEFAULT_KEEP;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const snapsBy = {};
  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    const m = name.match(/^📦 Guard (\d{8}-\d{6})/);
    if (!m) return;
    if (!snapsBy[m[1]]) snapsBy[m[1]] = [];
    snapsBy[m[1]].push(sh);
  });

  const sortedIds = Object.keys(snapsBy).sort().reverse();
  const toDelete = sortedIds.slice(keepN);
  let deleted = 0;

  toDelete.forEach(id => {
    snapsBy[id].forEach(sh => {
      try { ss.deleteSheet(sh); deleted++; } catch (e) {}
    });
  });

  _grdLog('GUARDIAN_PRUNE', 'kept=' + keepN + ' · deleted=' + deleted);
  _grdAlert('🗑 Pruned ' + deleted + ' snapshot tab(s).\nKept ' + 
            Math.min(sortedIds.length, keepN) + ' most recent.');
}

// ──────────────────────────────────────────────────────────
// QUICK PRESETS — common destructive operations wrapped safely
// ──────────────────────────────────────────────────────────

function safeApplyTheme(themeId) {
  // Guardian-protected theme apply for any of the 6 themes
  const targetTabs = ['🎨 Themes', '⚡ Mission', '📈 Progress', '💰 Finance Hub'];
  const themeName = themeId || 'Active Theme';

  guardianExecuteSafe('Apply ' + themeName, targetTabs, function() {
    if (themeId && typeof applyTheme === 'function') {
      applyTheme(themeId);
    } else if (typeof applyThemeToAll === 'function') {
      applyThemeToAll();
    } else {
      throw new Error('Theme functions not loaded');
    }
  });
}

function safeApplyMidnightGold() { safeApplyTheme('midnight_gold'); }
function safeApplyRoyalIndigo()  { safeApplyTheme('royal_indigo'); }
function safeApplyForestSage()   { safeApplyTheme('forest_sage'); }
function safeApplySunsetCoral()  { safeApplyTheme('sunset_coral'); }
function safeApplyOceanCyan()    { safeApplyTheme('ocean_cyan'); }
function safeApplyStoneMarble()  { safeApplyTheme('stone_marble'); }



function safeRebuildAllPro() {
  // Snapshot all Pro cockpits, then rebuild all
  const targetTabs = ['⚡ Mission', '📈 Progress', '📋 Habits', '🕌 Salah', 
                       '💰 Finance Hub', '💸 Transactions', '🏥 Health'];

  guardianExecuteSafe('Rebuild ALL Pro Cockpits', targetTabs, function() {
    const fns = ['rebuildMissionCockpit', 'rebuildProgressCockpit', 
                 'rebuildHabitsCockpit', 'rebuildSalahCockpit',
                 'rebuildFinanceCockpit', 'rebuildHealthCockpit'];
    fns.forEach(fn => {
      try {
        if (eval('typeof ' + fn) === 'function') eval(fn + '()');
      } catch (e) { Logger.log(fn + ' failed: ' + e); }
    });
  });
}



// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendGuardianMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('🛡️ Guardian')
      .addSubMenu(ui.createMenu('🎨 Safe Apply Theme')
        .addItem('🌙 Midnight Gold', 'safeApplyMidnightGold')
        .addItem('👑 Royal Indigo', 'safeApplyRoyalIndigo')
        .addItem('🌲 Forest Sage', 'safeApplyForestSage')
        .addItem('🌅 Sunset Coral', 'safeApplySunsetCoral')
        .addItem('🌊 Ocean Cyan', 'safeApplyOceanCyan')
        .addItem('🏛️ Stone Marble', 'safeApplyStoneMarble'))
      .addItem('🛡️ Safe Rebuild ALL Pro Cockpits', 'safeRebuildAllPro')
      .addSeparator()
      .addItem('⏪ Restore Last Snapshot', 'restoreLastSnapshot')
      .addItem('📋 List All Snapshots', 'guardianListSnapshots')
      .addItem('🗑 Prune Old Snapshots', 'guardianPruneOldSnapshots')
      .addToUi();
  } catch (e) { Logger.log('Guardian menu add failed: ' + e); }
}