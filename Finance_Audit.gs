// ════════════════════════════════════════════════════════════════════
// 📜 Finance_Audit.gs — FULL AUDIT TRAIL VIEWER v1.3
// LOCKED · 7-Layer Audit · Self-Contained
//
// CHANGES FROM v1.2 (2026-04-29 RE-AUDIT Finding 6):
//   - FIXED: FIN_AUDIT_HUB_CLEAR_ROWS reduced 25 → 22
//     v1.2 cleared rows 76-100 which destroyed kite section header at row 99
//     on every audit panel refresh. v1.3 clears only 76-97 (panel zone +
//     1 buffer row), preserves rows 98+ for downstream panels.
//
// CHANGES FROM v1.2 (carried forward):
//   - Whitelist 27 actions across 8 visual groups
// ════════════════════════════════════════════════════════════════════

const FIN_AUDIT_TAB = '📜 Finance Audit';
const FIN_AUDIT_SOURCE = 'Audit Log';
const FIN_AUDIT_TZ = 'Asia/Karachi';
const FIN_AUDIT_MAX_ROWS = 500;
const FIN_AUDIT_HUB_PANEL_ROWS = 20;
const FIN_AUDIT_HUB_START_ROW = 76;
const FIN_AUDIT_HUB_CLEAR_ROWS = 22;  // v1.3: was 25 → collided with kite row 99

const FIN_AUDIT_ACTION_CATEGORIES = {
  'TXN_LOGGED':            { type: '💸 Transaction', color: '#16A34A' },
  'TXN_REVERSED':          { type: '↩️ Reversal',    color: '#D97706' },
  'TRANSFER':              { type: '💱 Transfer',    color: '#2563EB' },
  'BILL_PAID':             { type: '📅 Bill',        color: '#7C3AED' },
  'GOAL_ALLOCATE':         { type: '🎯 Goal',        color: '#7C3AED' },
  'DEBT_PAYMENT':          { type: '💳 Debt Out',    color: '#EA580C' },
  'RECEIVABLE_RECEIVED':   { type: '💰 Receivable',  color: '#16A34A' },
  'CREDITOR_ADDED':        { type: '➕ Creditor',    color: '#7C3AED' },
  'RECEIVABLE_ADDED':      { type: '➕ Receivable',  color: '#7C3AED' },
  'OPENING_BALANCE':       { type: '🏁 Opening',     color: '#64748B' },
  'CC_OPENING':            { type: '🏁 CC Opening',  color: '#64748B' },
  'LEDGER_WIPED':          { type: '🧹 Wipe',        color: '#DC2626' },
  'FIN_SNAPSHOT':          { type: '📦 Snapshot',    color: '#94A3B8' },
  'FIN_RESTORE':           { type: '🔄 Restore',     color: '#94A3B8' },
  'FIN_SNAP_PRUNE':        { type: '📦 Prune',       color: '#94A3B8' },
  'FIN_SNAP_DELETE':       { type: '🗑 Snap Del',    color: '#94A3B8' },
  'FIN_HANDLER_REINSTALL': { type: '🔧 System',      color: '#64748B' },
  'FINANCE_REBUILD':       { type: '🔄 Rebuild',     color: '#64748B' },
  'DEBTS_REBUILD':         { type: '🔄 Rebuild',     color: '#64748B' },
  'TABS_ORGANIZED':        { type: '🎨 Tabs',        color: '#64748B' },
  'TABS_SHOWN_ALL':        { type: '🎨 Tabs',        color: '#64748B' },
  'SALARY_REBUILD':        { type: '🔄 Sal Rebuild', color: '#64748B' },
  'SALARY_AUTO_DETECTED':  { type: '🤖 Sal Detect',  color: '#0EA5E9' },
  'SALARY_LOGGED':         { type: '💰 Salary',      color: '#16A34A' },
  'KITE_LOGGED':           { type: '🪁 Kite',        color: '#D97706' },
  'KITE_TRACKER_REBUILD':  { type: '🔄 Kite Build',  color: '#64748B' },
  'FIN_AUDIT_EXPORTED':    { type: '💾 Audit Export', color: '#94A3B8' }
};

const FIN_AUDIT_WHITELIST = Object.keys(FIN_AUDIT_ACTION_CATEGORIES);

function _alertA(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _logA(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function getAuditTheme() {
  if (typeof getFinTheme === 'function') return getFinTheme();
  return {
    bgPage: '#FFFFFF', bgPanel: '#F8FAFC', bgRow: '#FFFFFF',
    bgAlt: '#F1F5F9', bgHeader: '#1E293B', bgSection: '#0F172A',
    bgAccent: '#FEF3C7',
    text: '#0F172A', textHi: '#000000', textMd: '#334155', textLo: '#64748B',
    success: '#16A34A', warning: '#D97706', danger: '#DC2626'
  };
}

function _ensureAuditLogTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let log = ss.getSheetByName(FIN_AUDIT_SOURCE);
  if (!log) {
    log = ss.insertSheet(FIN_AUDIT_SOURCE);
    log.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Action', 'Detail', 'User']])
      .setBackground('#0F172A').setFontColor('#FBBF24').setFontWeight('bold');
    try { log.hideSheet(); } catch(e) {}
  }
  return log;
}

function _readAuditEntries(limit) {
  const log = _ensureAuditLogTab();
  const lastRow = log.getLastRow();
  if (lastRow <= 1) return [];

  const data = log.getRange(2, 1, lastRow - 1, 4).getValues();
  const filtered = data.filter(row => {
    if (!row[0]) return false;
    const action = (row[1] || '').toString();
    return FIN_AUDIT_WHITELIST.indexOf(action) !== -1;
  });

  filtered.sort((a, b) => {
    const ta = a[0] instanceof Date ? a[0].getTime() : 0;
    const tb = b[0] instanceof Date ? b[0].getTime() : 0;
    return tb - ta;
  });

  if (limit && filtered.length > limit) return filtered.slice(0, limit);
  if (filtered.length > FIN_AUDIT_MAX_ROWS) return filtered.slice(0, FIN_AUDIT_MAX_ROWS);
  return filtered;
}

function buildFinanceAuditTabUI() {
  buildFinanceAuditTab(SpreadsheetApp.getActiveSpreadsheet());
  _alertA('✅ 📜 Finance Audit tab built (v1.3).\n\n' +
          'Whitelist tracks ' + FIN_AUDIT_WHITELIST.length + ' action types.\n' +
          'Hub clear zone reduced 25→22 rows (no longer collides with kite at row 99).\n\n' +
          'Hidden source: Audit Log tab.');
}

function buildFinanceAuditTab(ss) {
  const T = getAuditTheme();
  let s = ss.getSheetByName(FIN_AUDIT_TAB);
  if (!s) s = ss.insertSheet(FIN_AUDIT_TAB);

  try { s.setTabColor('#D97706'); } catch(e) {}

  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());

  const widths = [150, 90, 180, 400, 200, 180, 130];
  widths.forEach((w, i) => s.setColumnWidth(i + 1, w));

  s.getRange('A1:G1').merge()
    .setValue('📜 FINANCE AUDIT v1.3 — full timestamped history of every action')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);

  s.getRange('A2:G2').merge()
    .setValue('📋 Read-only · Auto-populated from Audit Log · Newest first · Max ' + FIN_AUDIT_MAX_ROWS + ' rows · Tracks ' + FIN_AUDIT_WHITELIST.length + ' action types')
    .setBackground(T.bgAccent).setFontColor(T.text).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(2, 24);
  s.setRowHeight(3, 8);

  const hdr = ['Timestamp (PKT)', 'Date', 'Action', 'Detail', 'TxnID (parsed)', 'User', 'Type'];
  s.getRange(4, 1, 1, 7).setValues([hdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center');
  s.setRowHeight(4, 28);

  const entries = _readAuditEntries();

  if (entries.length === 0) {
    s.getRange(5, 1, 1, 7).merge()
      .setValue('📭 No finance actions logged yet.')
      .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
      .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(5, 32);
  } else {
    for (let i = 0; i < entries.length; i++) {
      const r = 5 + i;
      const row = entries[i];
      const ts = row[0];
      const action = (row[1] || '').toString();
      const detail = (row[2] || '').toString();
      const user = (row[3] || '').toString();
      const cat = FIN_AUDIT_ACTION_CATEGORIES[action] || { type: '—', color: '#94A3B8' };

      s.getRange(r, 1).setValue(ts).setNumberFormat('dd MMM yyyy HH:mm:ss').setFontFamily('Courier New').setFontSize(10);
      s.getRange(r, 2).setValue(ts).setNumberFormat('dd MMM').setFontSize(10);
      s.getRange(r, 3).setValue(action).setFontWeight('bold').setFontSize(10).setBackground(cat.color).setFontColor('#FFFFFF').setHorizontalAlignment('center');
      s.getRange(r, 4).setValue(detail.length > 500 ? detail.substring(0, 497) + '...' : detail).setFontSize(10).setWrap(true).setVerticalAlignment('middle');
      const txnMatch = detail.match(/TXN-[\d-]+/);
      s.getRange(r, 5).setValue(txnMatch ? txnMatch[0] : '').setFontFamily('Courier New').setFontSize(9).setFontColor(T.textLo);
      s.getRange(r, 6).setValue(user).setFontSize(9).setFontColor(T.textLo);
      s.getRange(r, 7).setValue(cat.type).setFontSize(10).setFontWeight('bold').setBackground(cat.color).setFontColor('#FFFFFF').setHorizontalAlignment('center');

      const bg = (i % 2 === 0) ? T.bgRow : T.bgAlt;
      [1, 2, 4, 5, 6].forEach(c => s.getRange(r, c).setBackground(bg));
      s.getRange(r, 1).setHorizontalAlignment('left');
      s.getRange(r, 4).setHorizontalAlignment('left');
      s.setRowHeight(r, 24);
    }

    const footRow = 5 + entries.length + 1;
    s.getRange(footRow, 1, 1, 7).merge()
      .setValue('📊 Total: ' + entries.length + ' finance actions · ' + FIN_AUDIT_WHITELIST.length + ' types tracked')
      .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
      .setFontSize(10).setHorizontalAlignment('center');
    s.setRowHeight(footRow, 28);
  }

  s.setFrozenRows(4);

  const log = ss.getSheetByName(FIN_AUDIT_SOURCE);
  if (log && !log.isSheetHidden()) {
    try { log.hideSheet(); } catch(e) {}
  }
}

function embedAuditPanelInHub() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hub = ss.getSheetByName('💰 Finance Hub');
  if (!hub) {
    _alertA('❌ Finance Hub tab not found.');
    return;
  }
  renderAuditPanelInHub(hub, FIN_AUDIT_HUB_START_ROW);
}

function renderAuditPanelInHub(sheet, startRow) {
  if (!sheet) {
    Logger.log('renderAuditPanelInHub: no sheet provided');
    return startRow;
  }
  if (!startRow || startRow < 1) startRow = FIN_AUDIT_HUB_START_ROW;

  const T = getAuditTheme();
  const entries = _readAuditEntries(FIN_AUDIT_HUB_PANEL_ROWS);

  // v1.3: clearRows reduced 25 → 22 (clears 76-97, leaves 98+ untouched)
  const clearRows = FIN_AUDIT_HUB_CLEAR_ROWS;
  try { sheet.getRange(startRow, 1, clearRows, 12).breakApart(); } catch(e) {}
  sheet.getRange(startRow, 1, clearRows, 12).clearContent().clearFormat();
  sheet.getRange(startRow, 1, clearRows, 12).setBackground(T.bgPage);

  sheet.getRange(startRow, 1, 1, 12).merge()
    .setValue('📜 RECENT AUDIT TRAIL — last ' + FIN_AUDIT_HUB_PANEL_ROWS + ' finance actions (full log: 📜 Finance Audit tab)')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(startRow, 28);

  const hdrRow = startRow + 1;
  sheet.getRange(hdrRow, 1, 1, 3).merge().setValue('When').setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  sheet.getRange(hdrRow, 4, 1, 2).merge().setValue('Action').setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  sheet.getRange(hdrRow, 6, 1, 7).merge().setValue('Detail').setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  sheet.setRowHeight(hdrRow, 26);

  const firstEntryRow = startRow + 2;

  if (entries.length === 0) {
    sheet.getRange(firstEntryRow, 1, 1, 12).merge()
      .setValue('📭 No finance actions logged yet.')
      .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
      .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(firstEntryRow, 28);
    return firstEntryRow + 1;
  }

  const writeCount = Math.min(entries.length, FIN_AUDIT_HUB_PANEL_ROWS);
  for (let i = 0; i < writeCount; i++) {
    const r = firstEntryRow + i;
    const row = entries[i];
    const ts = row[0];
    const action = (row[1] || '').toString();
    const detail = (row[2] || '').toString();
    const cat = FIN_AUDIT_ACTION_CATEGORIES[action] || { type: '—', color: '#94A3B8' };

    sheet.getRange(r, 1, 1, 3).merge().setValue(ts).setNumberFormat('dd MMM HH:mm').setFontFamily('Courier New').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.getRange(r, 4, 1, 2).merge().setValue(action).setFontSize(10).setFontWeight('bold').setBackground(cat.color).setFontColor('#FFFFFF').setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.getRange(r, 6, 1, 7).merge().setValue(detail.length > 100 ? detail.substring(0, 97) + '...' : detail).setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');

    const bg = (i % 2 === 0) ? T.bgRow : T.bgAlt;
    sheet.getRange(r, 1, 1, 3).setBackground(bg);
    sheet.getRange(r, 6, 1, 7).setBackground(bg);
    sheet.setRowHeight(r, 22);
  }

  return firstEntryRow + writeCount;
}

function refreshFinanceAudit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  buildFinanceAuditTab(ss);
  try { embedAuditPanelInHub(); } catch(e) { Logger.log('Hub panel embed failed: ' + e); }
  const entries = _readAuditEntries();
  _alertA('✅ Audit refreshed (v1.3).\n\nTotal: ' + entries.length + ' actions · ' + FIN_AUDIT_WHITELIST.length + ' types tracked.\nHub panel uses 22-row clear zone (kite header at row 99 preserved).');
}

function exportAuditToCSV() {
  const entries = _readAuditEntries();
  if (entries.length === 0) {
    _alertA('📭 No audit entries to export.');
    return;
  }

  let csv = 'Timestamp,Action,Detail,User,Type\n';
  entries.forEach(row => {
    const ts = row[0] instanceof Date ?
      Utilities.formatDate(row[0], FIN_AUDIT_TZ, 'yyyy-MM-dd HH:mm:ss') :
      (row[0] || '').toString();
    const action = (row[1] || '').toString();
    const detail = (row[2] || '').toString().replace(/"/g, '""');
    const user = (row[3] || '').toString();
    const cat = FIN_AUDIT_ACTION_CATEGORIES[action] || { type: '—' };
    csv += '"' + ts + '","' + action + '","' + detail + '","' + user + '","' + cat.type + '"\n';
  });

  const stamp = Utilities.formatDate(new Date(), FIN_AUDIT_TZ, 'yyyyMMdd-HHmm');
  const filename = 'Sovereign-Finance-Audit-' + stamp + '.csv';
  const blob = Utilities.newBlob(csv, 'text/csv', filename);
  const file = DriveApp.createFile(blob);

  _logA('FIN_AUDIT_EXPORTED', filename + ' · ' + entries.length + ' rows');
  _alertA('✅ Audit exported.\n\nFilename: ' + filename + '\nRows: ' + entries.length + '\n\nOpen: ' + file.getUrl());
}

function verifyFinanceAudit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const auditTab = ss.getSheetByName(FIN_AUDIT_TAB);
  const sourceTab = ss.getSheetByName(FIN_AUDIT_SOURCE);
  const entries = _readAuditEntries();

  let report = '🔍 📜 FINANCE AUDIT v1.3 INTEGRITY\n\n';
  report += (auditTab ? '✅' : '❌') + ' Audit tab present\n';
  report += (sourceTab ? '✅' : '❌') + ' Audit Log source present\n';
  report += '✓ Filtered finance actions: ' + entries.length + '\n';
  report += '✓ Action types tracked: ' + FIN_AUDIT_WHITELIST.length + '\n';
  report += '✓ Hub panel anchor row: ' + FIN_AUDIT_HUB_START_ROW + '\n';
  report += '✓ Hub clear rows: ' + FIN_AUDIT_HUB_CLEAR_ROWS + ' (was 25 in v1.2 → kite collision fixed)\n';

  if (typeof getSettingBool === 'function') {
    const enabled = getSettingBool('PRO_AUDIT_LOG_ENABLED');
    report += (enabled ? '✅' : '⚠️') + ' Audit logging enabled: ' + (enabled ? 'YES' : 'NO');
  }

  if (auditTab && entries.length > 0) report += '\n\n✅ All systems operational.';
  else if (entries.length === 0) report += '\n\n⚠️ Zero entries — log a transaction to test.';
  _alertA(report);
}

function appendFinanceAuditMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📜 Audit')
      .addItem('🔄 Refresh Audit Tab + Hub Panel', 'refreshFinanceAudit')
      .addItem('🔄 Rebuild Audit Tab Only', 'buildFinanceAuditTabUI')
      .addItem('💾 Export to CSV (Drive)', 'exportAuditToCSV')
      .addSeparator()
      .addItem('🔍 Verify Audit Integrity', 'verifyFinanceAudit')
      .addToUi();
  } catch(e) { Logger.log('Audit menu add failed: ' + e); }
}