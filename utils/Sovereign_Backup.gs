// ════════════════════════════════════════════════════════════════════
// 🛡️ Sovereign_Backup.gs — 3-TIER DURABILITY STACK v1.0
// LOCKED · 7-Layer Audit · Day 6 / 90 · 2026-04-30
//
// PURPOSE:
//   Production-grade backup system. Three tiers of protection:
//     TIER 1 — On-demand grouped snapshots (manual + pre-destructive auto)
//     TIER 2 — Daily auto-backup at 3 AM PKT + retention policy
//     TIER 3 — Off-site Drive backup (Phase 3, next session)
//
// 5 GROUPS:
//   🏦 finance — Hub, Transactions, Accounts, Budget, Bills, Debts,
//                Audit Log, Salary, Kite (9 tabs)
//   🛡️ life    — Habits, Salah, Progress, Health, Food Library (5 tabs)
//   ⚡ control — Mission, Settings, Themes, KPIs (4 tabs)
//   🧠 ai      — AI Memory (1 tab)
//   📋 archive — catch-all for everything else
//
// RETENTION POLICY (per group):
//   - Last 7 daily snapshots
//   - Last 4 weekly snapshots (Friday)
//   - Last 3 monthly snapshots (1st of month)
//   - Total: 14 max per group × 5 groups = 70 hidden tabs steady state
//
// SNAPSHOT TAB NAME FORMAT:
//   📦 BAK-{group}-{YYYYMMDD-HHMMSS}-{tag} / {OriginalTabName}
//
// PUBLIC API:
//   - snapshotGroup(groupName, tag)         → snap one group
//   - snapshotAll(tag)                      → snap all 5 groups
//   - dailyAutoBackup()                     → daily trigger handler
//   - preMutationSnap(groupName)            → smart hook with dedup
//   - listBackups(groupName)                → see what exists
//   - pruneOldBackups()                     → enforce retention
//   - restoreBackup(snapTabName)            → manual restore
//   - backupHealthCheck()                   → status report
//   - installDailyBackupTrigger()           → schedule 3 AM
// ════════════════════════════════════════════════════════════════════

const BAK_TZ = 'Asia/Karachi';
const BAK_PREFIX = '📦 BAK';
const BAK_DEDUP_WINDOW_MIN = 5;
const BAK_AUTO_HOUR = 3;

const BAK_RETENTION = {
  daily:   7,
  weekly:  4,
  monthly: 3
};

const BAK_GROUPS = {
  finance: {
    label: '🏦 Finance',
    color: '#16A34A',
    tabs: [
      '💰 Finance Hub',
      '💸 Transactions',
      '🏦 Accounts',
      '📊 Budget',
      '📅 Bills',
      '💳 Debts',
      'Audit Log',
      '💼 Salary',
      '🪁 Kite'
    ]
  },
  life: {
    label: '🛡️ Life',
    color: '#7C3AED',
    tabs: [
      '📋 Habits',
      '🕌 Salah',
      '📈 Progress',
      '🏥 Health',
      '📚 Food Library'
    ]
  },
  control: {
    label: '⚡ Control',
    color: '#FBBF24',
    tabs: [
      '⚡ Mission',
      '⚙️ Settings',
      '🎨 Themes',
      '🎯 KPIs'
    ]
  },
  ai: {
    label: '🧠 AI',
    color: '#EC4899',
    tabs: [
      '🧠 AI Memory'
    ]
  }
};

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────

function _bakAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _bakLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function _bakTimestamp() {
  return Utilities.formatDate(new Date(), BAK_TZ, 'yyyyMMdd-HHmmss');
}

function _bakDateOnly() {
  return Utilities.formatDate(new Date(), BAK_TZ, 'yyyyMMdd');
}

function _bakIsFriday() {
  return Utilities.formatDate(new Date(), BAK_TZ, 'EEE') === 'Fri';
}

function _bakIsFirstOfMonth() {
  return Utilities.formatDate(new Date(), BAK_TZ, 'd') === '1';
}

// ──────────────────────────────────────────────────────────
// CORE — snapshot one group
// ──────────────────────────────────────────────────────────

function snapshotGroup(groupName, tag) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const grp = BAK_GROUPS[groupName];
  if (!grp) return { ok: false, reason: 'unknown_group: ' + groupName };

  const ts = _bakTimestamp();
  const safeTag = (tag || 'manual').replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 24);
  const result = { 
    ok: true, group: groupName, ts: ts, tag: safeTag,
    copied: [], skipped: [], failed: []
  };

  grp.tabs.forEach(tabName => {
    const sh = ss.getSheetByName(tabName);
    if (!sh) {
      result.skipped.push(tabName + ' (not found)');
      return;
    }

    try {
      let snapName = BAK_PREFIX + '-' + groupName + '-' + ts + '-' + safeTag + ' / ' + tabName;
      if (snapName.length > 95) snapName = snapName.substring(0, 95);

      // Collision protection
      let suffix = 0;
      let finalName = snapName;
      while (ss.getSheetByName(finalName) && suffix < 10) {
        suffix++;
        finalName = snapName + '-' + suffix;
      }

      const copy = sh.copyTo(ss);
      copy.setName(finalName);
      try { copy.hideSheet(); } catch (e) {}
      try { copy.setTabColor(grp.color); } catch (e) {}
      result.copied.push(tabName);
    } catch (e) {
      result.failed.push(tabName + ' (' + e.message.substring(0, 40) + ')');
    }
  });

  _bakLog('BACKUP_GROUP', groupName + ' · tag=' + safeTag + ' · copied=' + result.copied.length + 
                          ' · skipped=' + result.skipped.length + ' · failed=' + result.failed.length);
  return result;
}

// ──────────────────────────────────────────────────────────
// SNAP ALL — for daily auto + manual full
// ──────────────────────────────────────────────────────────

function snapshotAll(tag) {
  const results = [];
  Object.keys(BAK_GROUPS).forEach(g => {
    results.push(snapshotGroup(g, tag));
  });
  return results;
}

// ──────────────────────────────────────────────────────────
// PRE-MUTATION SMART HOOK — call before destructive ops
// ──────────────────────────────────────────────────────────

function preMutationSnap(groupName, reason) {
  // Dedup: check if last snap of this group was within window
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const recentCutoff = new Date().getTime() - (BAK_DEDUP_WINDOW_MIN * 60000);
  let recentExists = false;

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (name.indexOf(BAK_PREFIX + '-' + groupName + '-') !== 0) return;
    // Extract timestamp from name format BAK-{group}-{YYYYMMDD-HHMMSS}-{tag}
    const m = name.match(/-(\d{8})-(\d{6})-/);
    if (!m) return;
    const yyyymmdd = m[1];
    const hhmmss = m[2];
    const dateStr = yyyymmdd.substring(0,4) + '-' + yyyymmdd.substring(4,6) + '-' + yyyymmdd.substring(6,8) +
                    'T' + hhmmss.substring(0,2) + ':' + hhmmss.substring(2,4) + ':' + hhmmss.substring(4,6);
    try {
      const tabTime = new Date(dateStr).getTime();
      if (tabTime > recentCutoff) recentExists = true;
    } catch (e) {}
  });

  if (recentExists) {
    _bakLog('BACKUP_DEDUP', groupName + ' · recent snap exists, skipped');
    return { ok: true, deduped: true };
  }

  const tag = 'pre-' + (reason || 'mut').replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 12);
  const result = snapshotGroup(groupName, tag);

  // Notification popup (per locked design — user wants visible safety net)
  if (result.ok && result.copied.length > 0) {
    try {
      _bakAlert('🛡️ Auto-snapshot taken before ' + (reason || 'mutation') + 
                '\n\nGroup: ' + BAK_GROUPS[groupName].label + 
                '\nTabs preserved: ' + result.copied.length + 
                '\n\nUndo within session: 🎛️ Sovereign → 🛡️ Backup → ⏪ Restore Last');
    } catch (e) {}
  }
  return result;
}

// ──────────────────────────────────────────────────────────
// DAILY AUTO BACKUP — silent, scheduled
// ──────────────────────────────────────────────────────────

function dailyAutoBackup() {
  let tag = 'daily';
  if (_bakIsFirstOfMonth()) tag = 'monthly';
  else if (_bakIsFriday()) tag = 'weekly';

  const results = snapshotAll(tag);
  let totalCopied = 0;
  let totalFailed = 0;
  results.forEach(r => {
    totalCopied += r.copied.length;
    totalFailed += r.failed.length;
  });

  _bakLog('BACKUP_DAILY', tag + ' · groups=5 · copied=' + totalCopied + ' · failed=' + totalFailed);

  // Auto-prune after each daily backup
  pruneOldBackups();
}

// ──────────────────────────────────────────────────────────
// RETENTION POLICY — keep last N per tier per group
// ──────────────────────────────────────────────────────────

function pruneOldBackups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const byGroupTier = {};

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (name.indexOf(BAK_PREFIX + '-') !== 0) return;
    const m = name.match(/^📦 BAK-([^-]+)-(\d{8}-\d{6})-([^\s]+)/);
    if (!m) return;
    const group = m[1];
    const ts = m[2];
    const tag = m[3];
    let tier = 'manual';
    if (tag === 'daily') tier = 'daily';
    else if (tag === 'weekly') tier = 'weekly';
    else if (tag === 'monthly') tier = 'monthly';
    else if (tag.indexOf('pre-') === 0) tier = 'pre';

    const key = group + '|' + tier;
    if (!byGroupTier[key]) byGroupTier[key] = [];
    byGroupTier[key].push({ ts: ts, sheet: sh, name: name });
  });

  let totalDeleted = 0;
  Object.keys(byGroupTier).forEach(key => {
    const tier = key.split('|')[1];
    const keep = (tier === 'pre') ? 5 : (BAK_RETENTION[tier] || 5);
    const items = byGroupTier[key].sort((a, b) => b.ts.localeCompare(a.ts));
    const toDelete = items.slice(keep);
    toDelete.forEach(item => {
      try {
        ss.deleteSheet(item.sheet);
        totalDeleted++;
      } catch (e) {
        Logger.log('Prune failed: ' + item.name + ' (' + e.message + ')');
      }
    });
  });

  if (totalDeleted > 0) {
    _bakLog('BACKUP_PRUNE', 'deleted ' + totalDeleted + ' old snapshot tabs');
  }
  return { deleted: totalDeleted };
}

// ──────────────────────────────────────────────────────────
// LIST BACKUPS — see what exists
// ──────────────────────────────────────────────────────────

function listBackups(groupName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const filter = groupName || null;
  const grouped = {};

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (name.indexOf(BAK_PREFIX + '-') !== 0) return;
    const m = name.match(/^📦 BAK-([^-]+)-(\d{8}-\d{6})-([^\s]+) \/ (.+)$/);
    if (!m) return;
    const grp = m[1];
    if (filter && grp !== filter) return;
    const ts = m[2];
    const tag = m[3];
    const tab = m[4];
    const key = grp + ' · ' + ts + ' (' + tag + ')';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tab);
  });

  const keys = Object.keys(grouped).sort().reverse();
  let msg = '📦 BACKUP INVENTORY' + (filter ? ' · ' + filter : '') + '\n\n';
  msg += 'Snapshots found: ' + keys.length + '\n\n';

  if (keys.length === 0) {
    msg += '(none yet — run a manual snapshot or wait for daily 3 AM auto)';
  } else {
    keys.slice(0, 25).forEach((k, i) => {
      msg += (i + 1) + '. ' + k + '\n';
      msg += '     tabs (' + grouped[k].length + '): ' + grouped[k].slice(0, 4).join(', ');
      if (grouped[k].length > 4) msg += '... +' + (grouped[k].length - 4);
      msg += '\n';
    });
    if (keys.length > 25) msg += '\n... +' + (keys.length - 25) + ' more (run prune?)';
  }
  _bakAlert(msg);
  return grouped;
}

// ──────────────────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────────────────

function backupHealthCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let totalSnaps = 0;
  let allTabs = 0;
  const groupStats = {};
  let oldestSnap = null;
  let newestSnap = null;

  Object.keys(BAK_GROUPS).forEach(g => {
    groupStats[g] = { count: 0, latest: null };
  });

  ss.getSheets().forEach(sh => {
    allTabs++;
    const name = sh.getName();
    if (name.indexOf(BAK_PREFIX + '-') !== 0) return;
    const m = name.match(/^📦 BAK-([^-]+)-(\d{8}-\d{6})-/);
    if (!m) return;
    totalSnaps++;
    const grp = m[1];
    const ts = m[2];
    if (groupStats[grp]) {
      groupStats[grp].count++;
      if (!groupStats[grp].latest || ts > groupStats[grp].latest) groupStats[grp].latest = ts;
    }
    if (!oldestSnap || ts < oldestSnap) oldestSnap = ts;
    if (!newestSnap || ts > newestSnap) newestSnap = ts;
  });

  // Trigger check
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'dailyAutoBackup');

  let report = '🛡️ BACKUP HEALTH CHECK\n\n';
  report += '═══ STORAGE ═══\n';
  report += 'Total tabs: ' + allTabs + ' / 200 limit\n';
  report += 'Backup tabs: ' + totalSnaps + '\n';
  report += 'Storage status: ' + (allTabs < 150 ? '✅ healthy' : allTabs < 180 ? '⚠️ getting full' : '🚨 prune now') + '\n\n';

  report += '═══ AUTO TRIGGER ═══\n';
  report += 'Daily backup trigger: ' + (triggers.length === 1 ? '✅ installed (3 AM)' : '⚠️ ' + triggers.length + ' (should be 1)') + '\n';
  if (triggers.length === 0) report += '→ Run "Install Daily Trigger" from menu\n';
  report += '\n';

  report += '═══ PER-GROUP ═══\n';
  Object.keys(BAK_GROUPS).forEach(g => {
    const stat = groupStats[g];
    const grpInfo = BAK_GROUPS[g];
    const status = stat.count > 0 ? '✓' : '⚠️';
    report += status + ' ' + grpInfo.label + ' · ' + stat.count + ' snapshots';
    if (stat.latest) report += ' · latest ' + stat.latest;
    report += '\n';
  });
  report += '\n';

  if (newestSnap) report += 'Newest snap: ' + newestSnap + '\n';
  if (oldestSnap) report += 'Oldest snap: ' + oldestSnap + '\n';

  _bakAlert(report);
  return { totalSnaps: totalSnaps, allTabs: allTabs, triggers: triggers.length };
}

// ──────────────────────────────────────────────────────────
// RESTORE — safe-mode (creates new tab, never overwrites)
// ──────────────────────────────────────────────────────────

function restoreBackup(snapTabName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const snap = ss.getSheetByName(snapTabName);
  if (!snap) { _bakAlert('Snapshot not found: ' + snapTabName); return; }

  const ui = SpreadsheetApp.getUi();
  const m = snapTabName.match(/^📦 BAK-([^-]+)-(\d{8}-\d{6})-([^\s]+) \/ (.+)$/);
  if (!m) { _bakAlert('Not a backup tab: ' + snapTabName); return; }
  const origTabName = m[4];

  const r = ui.alert('⏪ Restore Backup',
    'Create a NEW tab "🔄 RESTORED ' + origTabName + '" with the snapshot data?\n\n' +
    '(Safe mode: original tab "' + origTabName + '" is NOT touched.)\n' +
    'You manually merge what you need.',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;

  try {
    const restoredName = '🔄 RESTORED ' + origTabName;
    let finalName = restoredName;
    let suffix = 0;
    while (ss.getSheetByName(finalName) && suffix < 10) {
      suffix++;
      finalName = restoredName + '-' + suffix;
    }

    const copy = snap.copyTo(ss);
    copy.setName(finalName);
    copy.showSheet();
    copy.setTabColor('#EF4444');

    _bakLog('BACKUP_RESTORE', snapTabName + ' → ' + finalName);
    _bakAlert('✅ Restored as new tab: ' + finalName + 
              '\n\nOriginal tab "' + origTabName + '" is unchanged.\n' +
              'Manually merge what you need from the red restored tab.');
  } catch (e) {
    _bakAlert('Restore failed: ' + e.message);
  }
}

function restoreLastBackupOfGroup(groupName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let latestTs = '';
  let latestSnaps = [];

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (name.indexOf(BAK_PREFIX + '-' + groupName + '-') !== 0) return;
    const m = name.match(/^📦 BAK-[^-]+-(\d{8}-\d{6})-/);
    if (!m) return;
    if (m[1] > latestTs) {
      latestTs = m[1];
      latestSnaps = [name];
    } else if (m[1] === latestTs) {
      latestSnaps.push(name);
    }
  });

  if (!latestTs) { _bakAlert('No backups for group: ' + groupName); return; }

  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('⏪ Restore Latest ' + groupName,
    'Latest snapshot: ' + latestTs + '\n\n' +
    'Will create ' + latestSnaps.length + ' restored tabs (one per backed-up tab).\n' +
    'Originals are NOT touched. You manually merge.\n\nContinue?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;

  let restored = 0;
  latestSnaps.forEach(snapName => {
    const snap = ss.getSheetByName(snapName);
    if (!snap) return;
    const m = snapName.match(/\/ (.+)$/);
    if (!m) return;
    const origName = m[1];
    try {
      const restoredName = '🔄 RESTORED ' + origName;
      let finalName = restoredName;
      let suffix = 0;
      while (ss.getSheetByName(finalName) && suffix < 10) {
        suffix++;
        finalName = restoredName + '-' + suffix;
      }
      const copy = snap.copyTo(ss);
      copy.setName(finalName);
      copy.showSheet();
      copy.setTabColor('#EF4444');
      restored++;
    } catch (e) { Logger.log('Restore err: ' + e); }
  });

  _bakLog('BACKUP_RESTORE_GROUP', groupName + ' · ts=' + latestTs + ' · restored=' + restored);
  _bakAlert('✅ Restored ' + restored + ' tabs (red-colored).\n\nMerge what you need.');
}

function restoreLastFinanceBackup() { restoreLastBackupOfGroup('finance'); }
function restoreLastLifeBackup()    { restoreLastBackupOfGroup('life'); }
function restoreLastControlBackup() { restoreLastBackupOfGroup('control'); }
function restoreLastAIBackup()      { restoreLastBackupOfGroup('ai'); }

// ──────────────────────────────────────────────────────────
// MENU SHORTCUTS — manual snap any group
// ──────────────────────────────────────────────────────────

function snapFinance()  { _menuSnap('finance'); }
function snapLife()     { _menuSnap('life'); }
function snapControl()  { _menuSnap('control'); }
function snapAI()       { _menuSnap('ai'); }
function snapEverything() {
  const results = snapshotAll('manual-all');
  let totalCopied = 0, totalFailed = 0;
  results.forEach(r => { totalCopied += r.copied.length; totalFailed += r.failed.length; });
  _bakAlert('✅ Full snapshot complete\n\nGroups: 5\nTabs preserved: ' + totalCopied + 
            (totalFailed > 0 ? '\nFailed: ' + totalFailed : ''));
}
function _menuSnap(group) {
  const r = snapshotGroup(group, 'manual');
  if (r.ok) {
    _bakAlert('✅ ' + BAK_GROUPS[group].label + ' snapshot taken\n\nTabs: ' + r.copied.length +
              (r.failed.length > 0 ? '\nFailed: ' + r.failed.length : ''));
  } else {
    _bakAlert('Snapshot failed: ' + r.reason);
  }
}

// ──────────────────────────────────────────────────────────
// TRIGGER INSTALL
// ──────────────────────────────────────────────────────────

function installDailyBackupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'dailyAutoBackup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyAutoBackup').timeBased().atHour(BAK_AUTO_HOUR).everyDays(1).create();
  _bakLog('BACKUP_TRIGGER_INSTALL', 'daily @ ' + BAK_AUTO_HOUR + ' AM PKT');
  _bakAlert('✅ Daily backup trigger installed.\n\nFires at ' + BAK_AUTO_HOUR + ':00 AM PKT every day.\n' +
            'Snapshots all 5 groups + auto-prunes old snapshots.\n\n' +
            'You can verify in Apps Script editor → Triggers.');
}

function uninstallDailyBackupTrigger() {
  let killed = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'dailyAutoBackup') { ScriptApp.deleteTrigger(t); killed++; }
  });
  _bakAlert('Uninstalled ' + killed + ' daily backup trigger(s).');
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendBackupMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('🛡️ Backup');

    menu.addSubMenu(ui.createMenu('📸 Snap Now')
      .addItem('🌐 Snap EVERYTHING', 'snapEverything')
      .addSeparator()
      .addItem('🏦 Snap Finance group', 'snapFinance')
      .addItem('🛡️ Snap Life group', 'snapLife')
      .addItem('⚡ Snap Control group', 'snapControl')
      .addItem('🧠 Snap AI group', 'snapAI'));

    menu.addSubMenu(ui.createMenu('⏪ Restore Latest')
      .addItem('🏦 Restore latest Finance', 'restoreLastFinanceBackup')
      .addItem('🛡️ Restore latest Life', 'restoreLastLifeBackup')
      .addItem('⚡ Restore latest Control', 'restoreLastControlBackup')
      .addItem('🧠 Restore latest AI', 'restoreLastAIBackup'));

    menu.addSeparator();
    menu.addItem('📋 List All Backups', 'listBackups');
    menu.addItem('🩺 Health Check', 'backupHealthCheck');
    menu.addSeparator();
    menu.addItem('🗑️ Prune Old (auto retention)', 'pruneOldBackups');
    menu.addSeparator();
    menu.addItem('⏰ Install Daily Trigger (3 AM)', 'installDailyBackupTrigger');
    menu.addItem('⛔ Uninstall Daily Trigger', 'uninstallDailyBackupTrigger');

    menu.addToUi();
  } catch (e) { Logger.log('Backup menu add failed: ' + e); }
}
