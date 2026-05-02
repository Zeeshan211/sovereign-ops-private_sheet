// ════════════════════════════════════════════════════════════════════
// 📦 Finance_Snapshot.gs — AUTO-BACKUP + ROLLBACK SYSTEM v1.0
// LOCKED · 7-Layer Audit · Self-Contained
//
// PURPOSE:
//   Bank-grade safety net for Finance suite. Auto-snapshots all 6 Finance
//   tabs before any rebuild. Provides rollback via menu. Auto-prunes old
//   snapshots per retention policy.
//
// USAGE:
//   - snapFinanceSuite('pre-rebuild')  → called by Finance_Pro v2.3+ before any rebuild
//   - showSnapshotsMenu()              → user-facing list of all snapshots
//   - restoreFinanceSnapshot()         → prompts for snapshot name, restores
//   - pruneFinanceSnapshots()          → cleanup (auto-called after each snap)
//
// RETENTION POLICY:
//   - Last 5 snapshots: ALWAYS kept regardless of age
//   - Older snapshots: keep ONE per calendar month
//   - Everything else: deleted
//
// ARCHIVE NAMING:
//   📦 Snap YYYYMMDD-HHMM (label) / TAB_NAME
//   Example: 📦 Snap 20260428-2247 (pre-rebuild) / 💸 Transactions
// ════════════════════════════════════════════════════════════════════

const FINSNAP_PREFIX = '📦 Snap';
const FINSNAP_TABS = [
  '💰 Finance Hub',
  '💸 Transactions',
  '🏦 Accounts',
  '📊 Budget',
  '📅 Bills',
  '🎯 Goals'
];
const FINSNAP_MAX_RECENT = 5;
const FINSNAP_TZ = 'Asia/Karachi';

// ──────────────────────────────────────────────────────────
// SAFE WRAPPERS
// ──────────────────────────────────────────────────────────

function _alertSnap(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _logSnapAudit(action, detail) {
  if (typeof logAuditAction === 'function') {
    logAuditAction(action, detail);
  }
}

// ══════════════════════════════════════════════════════════
// CORE: snapFinanceSuite — creates timestamped backup
// Called automatically by Finance_Pro before any rebuild
// Can also be called manually: Menu → Finance → 📦 Snapshot Now
// ══════════════════════════════════════════════════════════

function snapFinanceSuite(label) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stamp = Utilities.formatDate(new Date(), FINSNAP_TZ, 'yyyyMMdd-HHmm');
  const labelSuffix = label ? ' (' + label + ')' : '';
  const groupName = FINSNAP_PREFIX + ' ' + stamp + labelSuffix;

  let copied = 0;
  let failed = 0;
  const errors = [];

  FINSNAP_TABS.forEach(name => {
    const src = ss.getSheetByName(name);
    if (!src) {
      errors.push(name + ': source tab missing');
      failed++;
      return;
    }
    try {
      const copy = src.copyTo(ss);
      // Sheet name max 100 chars (Google limit)
      const fullName = (groupName + ' / ' + name).substring(0, 100);
      copy.setName(fullName);
      copy.hideSheet();
      try { copy.setTabColor('#94A3B8'); } catch(e) {}
      copied++;
    } catch(e) {
      errors.push(name + ': ' + e);
      failed++;
    }
  });

  // Prune AFTER snapshotting (so we never delete the snap we just made)
  pruneFinanceSnapshots();

  _logSnapAudit('FIN_SNAPSHOT', groupName + ' · ' + copied + ' tabs' + (failed > 0 ? ' · ' + failed + ' failed' : ''));

  if (errors.length > 0) {
    Logger.log('Snapshot errors: ' + errors.join('; '));
  }

  return { name: groupName, copied: copied, failed: failed };
}

function snapFinanceManual() {
  const result = snapFinanceSuite('manual');
  _alertSnap('📦 Manual snapshot saved.\n\n' +
             'Name: ' + result.name + '\n' +
             'Tabs: ' + result.copied + ' copied' +
             (result.failed > 0 ? ' · ' + result.failed + ' failed' : '') + '\n\n' +
             'View all: Menu → 💰 Finance → 📦 Show Snapshots');
}

// ══════════════════════════════════════════════════════════
// LIST: enumerate all snapshot groups (newest first)
// ══════════════════════════════════════════════════════════

function listFinanceSnapshots() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const groupSet = {};

  ss.getSheets().forEach(s => {
    const name = s.getName();
    if (name.indexOf(FINSNAP_PREFIX) === 0) {
      const groupKey = name.split(' / ')[0];
      groupSet[groupKey] = true;
    }
  });

  return Object.keys(groupSet).sort().reverse();
}

function showSnapshotsMenu() {
  const groups = listFinanceSnapshots();

  if (groups.length === 0) {
    _alertSnap('📦 NO SNAPSHOTS YET\n\n' +
               'Snapshots auto-create before each Finance rebuild.\n' +
               'You can also manually snapshot via Menu → 💰 Finance → 📦 Snapshot Now.');
    return;
  }

  let msg = '📦 FINANCE SNAPSHOTS (' + groups.length + ' total · newest first)\n\n';
  groups.forEach((g, i) => {
    msg += (i + 1) + '. ' + g + '\n';
  });
  msg += '\n💡 To restore: Menu → 💰 Finance → 🔄 Restore Snapshot\n' +
         '   (or run restoreFinanceSnapshot in Apps Script editor)\n\n' +
         'Snapshot tabs are hidden by default. To view raw archive:\n' +
         'right-click any tab → Show Hidden → select snapshot.';

  _alertSnap(msg);
}

// ══════════════════════════════════════════════════════════
// PRUNE: keep last 5 + monthly + delete rest
// ══════════════════════════════════════════════════════════

function pruneFinanceSnapshots() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const groups = listFinanceSnapshots(); // sorted desc (newest first)

  if (groups.length <= FINSNAP_MAX_RECENT) return; // nothing to prune

  // Always keep the most recent N
  const protectedGroups = new Set(groups.slice(0, FINSNAP_MAX_RECENT));

  // Among older groups, keep ONE per calendar month (the newest of that month)
  const monthSeen = {};
  groups.slice(FINSNAP_MAX_RECENT).forEach(group => {
    const match = group.match(/(\d{8})/); // YYYYMMDD pattern
    if (!match) return;
    const yearMonth = match[1].substring(0, 6); // YYYYMM
    if (!monthSeen[yearMonth]) {
      monthSeen[yearMonth] = true;
      protectedGroups.add(group);
    }
  });

  // Now delete every snapshot tab whose group is NOT in protectedGroups
  let deleted = 0;
  ss.getSheets().forEach(s => {
    const name = s.getName();
    if (name.indexOf(FINSNAP_PREFIX) === 0) {
      const groupKey = name.split(' / ')[0];
      if (!protectedGroups.has(groupKey)) {
        try {
          ss.deleteSheet(s);
          deleted++;
        } catch(e) {
          Logger.log('Failed to delete snapshot ' + name + ': ' + e);
        }
      }
    }
  });

  if (deleted > 0) {
    _logSnapAudit('FIN_SNAP_PRUNE', deleted + ' archived tabs deleted');
  }
}

// ══════════════════════════════════════════════════════════
// RESTORE: roll back to a named snapshot
// Always snapshots CURRENT state first as 'pre-restore' for safety
// ══════════════════════════════════════════════════════════

function restoreFinanceSnapshot(snapshotGroupName) {
  const ui = SpreadsheetApp.getUi();

  // If not passed in, prompt user
  if (!snapshotGroupName) {
    const groups = listFinanceSnapshots();
    if (groups.length === 0) {
      _alertSnap('📦 No snapshots available to restore.');
      return;
    }
    let listMsg = 'Available snapshots (newest first):\n\n';
    groups.slice(0, 10).forEach((g, i) => listMsg += (i + 1) + '. ' + g + '\n');
    if (groups.length > 10) listMsg += '... +' + (groups.length - 10) + ' older\n';
    listMsg += '\nPaste FULL snapshot group name to restore:';

    const prompt = ui.prompt('🔄 Restore Finance Snapshot', listMsg, ui.ButtonSet.OK_CANCEL);
    if (prompt.getSelectedButton() !== ui.Button.OK) return;
    snapshotGroupName = prompt.getResponseText().trim();
    if (!snapshotGroupName) {
      _alertSnap('⚠️ No snapshot name entered. Cancelled.');
      return;
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Verify snapshot exists
  const exists = ss.getSheets().some(s => s.getName().indexOf(snapshotGroupName) === 0);
  if (!exists) {
    _alertSnap('❌ Snapshot not found: ' + snapshotGroupName + '\n\n' +
               'Run "📦 Show Snapshots" to see available names.');
    return;
  }

  // Confirm destructive action
  const confirm = ui.alert('🔄 Confirm Restore',
    'Restore from:\n' + snapshotGroupName + '\n\n' +
    'This OVERWRITES your current Finance tabs.\n\n' +
    'A safety snapshot of CURRENT state will be saved first as "(pre-restore)".\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  // Step 1: SAFETY — snapshot current state before overwriting
  const safety = snapFinanceSuite('pre-restore');

  // Step 2: Restore each tab
  let restored = 0;
  let failed = 0;
  const errors = [];

  ss.getSheets().forEach(s => {
    const name = s.getName();
    if (name.indexOf(snapshotGroupName) === 0 && name.indexOf(' / ') !== -1) {
      const targetTabName = name.split(' / ')[1];
      const target = ss.getSheetByName(targetTabName);
      if (!target) {
        errors.push(targetTabName + ': target tab missing');
        failed++;
        return;
      }
      try {
        const snapData = s.getDataRange().getValues();
        target.clear();
        if (snapData.length > 0 && snapData[0].length > 0) {
          target.getRange(1, 1, snapData.length, snapData[0].length).setValues(snapData);
        }
        restored++;
      } catch(e) {
        errors.push(targetTabName + ': ' + e);
        failed++;
      }
    }
  });

  _logSnapAudit('FIN_RESTORE', snapshotGroupName + ' · ' + restored + ' tabs restored · safety: ' + safety.name);

  if (errors.length > 0) Logger.log('Restore errors: ' + errors.join('; '));

  _alertSnap('✅ RESTORED FROM SNAPSHOT\n\n' +
             'Source: ' + snapshotGroupName + '\n' +
             'Tabs restored: ' + restored + '\n' +
             (failed > 0 ? 'Failed: ' + failed + '\n' : '') +
             '\n📦 Safety snapshot saved as: ' + safety.name + '\n' +
             '(use this to undo the restore if needed)\n\n' +
             '⚠️ NOTE: Restored cells contain values only (formulas evaluated at snapshot time).\n' +
             'Run "Menu → 💰 Finance → 🔄 Rebuild Suite" to re-establish live formulas.');
}

// ══════════════════════════════════════════════════════════
// DELETE specific snapshot (manual cleanup)
// ══════════════════════════════════════════════════════════

function deleteFinanceSnapshot() {
  const ui = SpreadsheetApp.getUi();
  const groups = listFinanceSnapshots();

  if (groups.length === 0) {
    _alertSnap('No snapshots to delete.');
    return;
  }

  let listMsg = 'Available snapshots:\n\n';
  groups.forEach((g, i) => listMsg += (i + 1) + '. ' + g + '\n');
  listMsg += '\nPaste FULL snapshot group name to DELETE:';

  const prompt = ui.prompt('🗑 Delete Snapshot', listMsg, ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const target = prompt.getResponseText().trim();
  if (!target) return;

  const confirm = ui.alert('Delete?', 'PERMANENTLY delete:\n' + target + '\n\nCannot be undone.', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let deleted = 0;
  ss.getSheets().forEach(s => {
    if (s.getName().indexOf(target) === 0) {
      try { ss.deleteSheet(s); deleted++; } catch(e) {}
    }
  });

  _logSnapAudit('FIN_SNAP_DELETE', target + ' · ' + deleted + ' tabs');
  _alertSnap('🗑 Deleted ' + deleted + ' snapshot tabs from: ' + target);
}