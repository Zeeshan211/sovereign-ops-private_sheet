// ════════════════════════════════════════════════════════════════════
// 🛡️ Audit_Guardian.gs · v1.1 · 02 May 2026 · Day 10/90
// BANKING-CLASS AUDIT GAP PROTECTION
//
// CHANGES FROM v1.0:
//   ✅ #1 FIX: onAuditGuardianEdit now excludes col 12 (FIN2_QE_SUBMIT_COL)
//      AND col 13 (reversal). Was logging DIRECT_EDIT_DETECTED on every
//      Quick Entry submit → audit bloat. v1.1 silences QE submit ticks.
//   ✅ #2 FIX: _agIsLikelyPhantom expanded exclusion list. Was flagging
//      Bills/Kite/Salary/Debt Payment rows that legitimately have blank
//      counterparty+notes. v1.1 excludes 7 known-legit categories.
//   ✅ #15 FIX: dailyIntegrityScan no longer writes INTEGRITY_SCAN audit
//      entry when phantoms=0. Eliminates 90 noise rows over the quest.
//
// 7-LAYER AUDIT (delta from v1.0):
//   LAYER 4 CELL-STATE: col 12 now treated identically to col 13 (silent).
//                       Both are intentional UI affordances.
//   LAYER 6 BACKWARD-COMPAT: _agIsLikelyPhantom signature unchanged;
//                            internal logic-only change. Daily scan
//                            output schema unchanged.
//   LAYER 7 FAILURE-MODE #6 updated: zero-phantom scan now no-op (no
//                            audit write, no Telegram, no alert).
//
// MENTAL TRACE (QE submit, v1.1):
//   1. User types amount in E4, clicks L4 checkbox.
//   2. _financeOnEdit fires (in Finance_Pro) → submits txn.
//   3. onAuditGuardianEdit ALSO fires → checks col=12 in [12,13] → SKIP.
//   4. No DIRECT_EDIT_DETECTED entry. Audit log clean.
// ════════════════════════════════════════════════════════════════════

const AG_TXN_TAB = '💸 Transactions';
const AG_AUDIT_TAB = 'Audit Log';
const AG_TZ = 'Asia/Karachi';
const AG_TXN_ROW_MIN = 14;
const AG_TXN_ROW_MAX = 213;
const AG_TXN_COL_MAX = 14;
const AG_TXN_COL_QE_SUBMIT = 12;   // v1.1: NEW — Quick Entry submit checkbox
const AG_TXN_COL_REVERSAL = 13;    // existing — reversal checkbox
const AG_TXN_COL_TXNID = 14;
const AG_DAILY_SCAN_HOUR = 23;
const AG_BASELINE_KEY = 'AG_GUARDIAN_BASELINE_TS';
const AG_KNOWN_250_TXN_ID = 'TXN-20260502-180127-435';

// v1.1: expanded exclusion list — categories that legitimately produce
// rows with blank counterparty AND blank notes (auto-logged by modules)
const AG_PHANTOM_SAFE_CATEGORIES = [
  '💰 Opening Balance',   // setOpeningBalances + setCCOpeningBalance
  '💱 Transfer',          // submitTransferFromForm (notes auto-set but defensive)
  '💳 CC Payment',        // CC transfer special case
  '💸 Debt Payment',      // Finance_Debts auto-write (counterparty IS set,
                          // but defensive in case of future edge case)
  '🏠 Bills',             // markBillPaid (counterparty = bill name, but
                          // user-edited bills may leave it blank)
  '🪁 Kite',              // Kite tracker auto-rows
  '💰 Salary'             // SALARY_AUTO_DETECTED
];

// ───────── helpers ─────────

function _agAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _agUser() {
  try { return Session.getActiveUser().getEmail() || '(unknown)'; }
  catch(e) { return '(unknown)'; }
}

function _agTs() {
  return Utilities.formatDate(new Date(), AG_TZ, 'yyyy-MM-dd HH:mm:ss');
}

function _agEnsureAuditLogTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let log = ss.getSheetByName(AG_AUDIT_TAB);
  if (log) return log;
  log = ss.insertSheet(AG_AUDIT_TAB);
  log.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Action', 'Detail', 'User']])
    .setBackground('#0F172A').setFontColor('#FBBF24').setFontWeight('bold');
  log.setFrozenRows(1);
  try { log.hideSheet(); } catch(e) {}
  return log;
}

function _agLog(action, detail) {
  if (typeof logAuditAction === 'function') {
    try { logAuditAction(action, detail); return; } catch(e) {}
  }
  const log = _agEnsureAuditLogTab();
  log.appendRow([_agTs(), action, detail, _agUser()]);
  SpreadsheetApp.flush();
}

// ───────── installable trigger handler ─────────

function onAuditGuardianEdit(e) {
  try {
    if (!e || !e.range) return;
    const sh = e.range.getSheet();
    if (!sh || sh.getName() !== AG_TXN_TAB) return;
    const row = e.range.getRow();
    const col = e.range.getColumn();
    if (row < AG_TXN_ROW_MIN || row > AG_TXN_ROW_MAX) return;
    if (col < 1 || col > AG_TXN_COL_MAX) return;
    // v1.1: silence both QE submit (col 12) AND reversal (col 13) checkboxes
    if (col === AG_TXN_COL_QE_SUBMIT) return;
    if (col === AG_TXN_COL_REVERSAL) return;

    const oldVal = (e.oldValue !== undefined && e.oldValue !== null) ?
                   String(e.oldValue) : '(empty)';
    const newVal = (e.value !== undefined && e.value !== null) ?
                   String(e.value) : '(empty)';
    let txnId = '(no txn id at row)';
    try { txnId = String(sh.getRange(row, AG_TXN_COL_TXNID).getValue() || '(blank)'); } catch(_) {}

    const detail = 'Direct cell edit detected · Row=' + row + ' Col=' + col +
                   ' Before=' + oldVal + ' After=' + newVal +
                   ' TxnID=' + txnId +
                   ' · Edit bypassed normal writers (Quick Entry / Telegram / menu actions). ' +
                   'Verify whether row is legitimate or candidate for review.';
    _agLog('DIRECT_EDIT_DETECTED', detail);
  } catch (err) {
    Logger.log('Audit Guardian onEdit error: ' + err);
  }
}

// ───────── trigger install / uninstall ─────────

function installAuditGuardian() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const removed = [];
  const created = [];
  let errs = [];

  try {
    const existing = ScriptApp.getProjectTriggers();
    existing.forEach(t => {
      const fn = t.getHandlerFunction();
      if (fn === 'onAuditGuardianEdit' || fn === 'dailyIntegrityScan') {
        try { ScriptApp.deleteTrigger(t); removed.push(fn); }
        catch(e) { errs.push('delete ' + fn + ': ' + e); }
      }
    });
  } catch(e) { errs.push('list triggers: ' + e); }

  try {
    ScriptApp.newTrigger('onAuditGuardianEdit')
      .forSpreadsheet(ss).onEdit().create();
    created.push('onAuditGuardianEdit (installable onEdit)');
  } catch(e) { errs.push('install onEdit: ' + e); }

  try {
    ScriptApp.newTrigger('dailyIntegrityScan')
      .timeBased().atHour(AG_DAILY_SCAN_HOUR).nearMinute(55).everyDays(1).create();
    created.push('dailyIntegrityScan (daily 23:55 PKT)');
  } catch(e) { errs.push('install daily: ' + e); }

  try {
    PropertiesService.getScriptProperties().setProperty(AG_BASELINE_KEY, _agTs());
  } catch(e) { errs.push('set baseline: ' + e); }

  _agLog('GUARDIAN_INSTALL',
    'Audit Guardian v1.1 installed · removed=' + removed.length +
    ' created=' + created.length +
    (errs.length ? ' errors=' + errs.length + ' (' + errs.join(' | ') + ')' : ''));

  let msg = '🛡️ AUDIT GUARDIAN v1.1 INSTALLED\n\n';
  msg += 'Removed prior AG triggers: ' + removed.length + '\n';
  msg += 'Created new triggers: ' + created.length + '\n';
  created.forEach(c => msg += '  ✓ ' + c + '\n');
  if (errs.length) {
    msg += '\n⚠️ Errors:\n';
    errs.forEach(e => msg += '  · ' + e + '\n');
  }
  msg += '\nv1.1 IMPROVEMENTS:\n';
  msg += '  · Quick Entry submit (col 12) no longer logs noise\n';
  msg += '  · Phantom scanner skips 7 known-legit auto-row categories\n';
  msg += '  · Zero-phantom daily scans no longer write audit entry\n\n';
  msg += 'Next: 🛡️ Guardian → Run Phantom Scan Now → expect clean result.';
  _agAlert(msg);
}

function uninstallAuditGuardian() {
  let count = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === 'onAuditGuardianEdit' || fn === 'dailyIntegrityScan') {
      try { ScriptApp.deleteTrigger(t); count++; } catch(e) {}
    }
  });
  _agLog('GUARDIAN_UNINSTALL', 'Removed ' + count + ' triggers');
  _agAlert('🛡️ Guardian uninstalled. Removed ' + count + ' trigger(s).');
}

// ───────── phantom scanner (v1.1: expanded exclusion) ─────────

function _agIsLikelyPhantom(row) {
  const counterparty = String(row[7] || '').trim();
  const notes = String(row[8] || '').trim();
  const category = String(row[3] || '').trim();
  // v1.1: skip all known-legit auto-row categories
  if (AG_PHANTOM_SAFE_CATEGORIES.indexOf(category) !== -1) return false;
  if (counterparty === '' && notes === '') return true;
  return false;
}

function _agScanForPhantoms() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(AG_TXN_TAB);
  if (!tx) return { scanned: 0, phantoms: [] };

  const numRows = AG_TXN_ROW_MAX - AG_TXN_ROW_MIN + 1;
  const data = tx.getRange(AG_TXN_ROW_MIN, 1, numRows, AG_TXN_COL_MAX).getValues();
  const phantoms = [];
  let scanned = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    scanned++;
    if (_agIsLikelyPhantom(row)) {
      phantoms.push({
        row: AG_TXN_ROW_MIN + i,
        date: row[0],
        account: row[1] || '?',
        direction: row[2] || '?',
        category: row[3] || '?',
        amount: row[4] || 0,
        counterparty: row[7] || '',
        notes: row[8] || '',
        txnId: row[13] || '(no id)'
      });
    }
  }
  return { scanned: scanned, phantoms: phantoms };
}

function dailyIntegrityScan() {
  const r = _agScanForPhantoms();
  // v1.1: only log audit entry when there's something to report
  if (r.phantoms.length > 0) {
    _agLog('INTEGRITY_SCAN',
      'Daily scan · rows=' + r.scanned + ' phantoms=' + r.phantoms.length +
      ' candidates: ' + r.phantoms.map(p => p.txnId).join(' | '));
    if (typeof sendTelegram === 'function') {
      try {
        sendTelegram('🛡️ Audit Guardian · daily scan flagged ' + r.phantoms.length +
                     ' potential phantom row(s). Open menu 🛡️ Guardian → Run Scan Now to review.');
      } catch(e) {}
    }
  }
  // Zero-phantom scan: silent. No audit write, no telegram, no alert.
}

function runIntegrityScanNow() {
  const r = _agScanForPhantoms();
  let msg = '🔍 PHANTOM INTEGRITY SCAN (v1.1)\n\n';
  msg += 'Rows scanned: ' + r.scanned + '\n';
  msg += 'Suspicious phantom candidates: ' + r.phantoms.length + '\n';
  if (r.phantoms.length === 0) {
    msg += '\n✅ Ledger is clean. No untraceable rows.';
  } else {
    msg += '\nFlagged rows (counterparty + notes both blank, NOT in safe-category list):\n\n';
    r.phantoms.forEach((p, i) => {
      const dateStr = (p.date instanceof Date) ?
        Utilities.formatDate(p.date, AG_TZ, 'dd MMM yyyy') : String(p.date);
      msg += (i + 1) + '. Row ' + p.row + ' · ' + dateStr + '\n';
      msg += '   ' + p.account + ' · ' + p.direction + ' · ' + p.category +
             ' · ' + p.amount + ' PKR\n';
      msg += '   TxnID: ' + p.txnId + '\n\n';
    });
    msg += 'TO PURGE one: open Apps Script → Run\n';
    msg += '  purgePhantomWithAuditTrail("TXN-...", "your reason here")\n\n';
    msg += 'For the known 250: 🛡️ Guardian → Purge Known 250 Phantom';
  }
  _agAlert(msg);
}

function oneShotPhantomBackfill() {
  const r = _agScanForPhantoms();
  r.phantoms.forEach(p => {
    const dateStr = (p.date instanceof Date) ?
      Utilities.formatDate(p.date, AG_TZ, 'dd MMM yyyy') : String(p.date);
    _agLog('PHANTOM_DETECTED',
      'Backfill scan flagged candidate · Row=' + p.row +
      ' TxnID=' + p.txnId + ' Date=' + dateStr +
      ' Account=' + p.account + ' Dir=' + p.direction +
      ' Cat=' + p.category + ' Amount=' + p.amount + ' PKR' +
      ' · Counterparty AND notes both blank → may be untraceable orphan ·' +
      ' Awaiting manual review/purge.');
  });
  runIntegrityScanNow();
}

// ───────── forensic phantom purge ─────────

function purgePhantomWithAuditTrail(targetTxnId, reasonText) {
  if (!targetTxnId) {
    _agAlert('❌ purgePhantomWithAuditTrail requires a TxnID argument.');
    return;
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(AG_TXN_TAB);
  if (!tx) { _agAlert('❌ ' + AG_TXN_TAB + ' tab not found.'); return; }

  const numRows = AG_TXN_ROW_MAX - AG_TXN_ROW_MIN + 1;
  const data = tx.getRange(AG_TXN_ROW_MIN, 1, numRows, AG_TXN_COL_MAX).getValues();
  let targetRow = -1, targetData = null;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][13]).trim() === targetTxnId) {
      targetRow = AG_TXN_ROW_MIN + i;
      targetData = data[i];
      break;
    }
  }
  if (targetRow === -1) {
    _agAlert('✅ Already purged.\n\nTxnID ' + targetTxnId + ' is not in Transactions. Nothing to do.');
    return;
  }

  const stamp = Utilities.formatDate(new Date(), AG_TZ, 'yyyyMMdd-HHmmss');
  const snapName = '📦 Snap ' + stamp + ' (pre-phantom-purge) Transactions';
  let snapOk = false;
  try { tx.copyTo(ss).setName(snapName).hideSheet(); snapOk = !!ss.getSheetByName(snapName); }
  catch(e) { snapOk = false; }
  if (!snapOk) {
    _agAlert('❌ Snapshot creation FAILED. Aborting purge — no destructive action taken.');
    return;
  }

  const dateStr = (targetData[0] instanceof Date) ?
    Utilities.formatDate(targetData[0], AG_TZ, 'dd MMM yyyy') : String(targetData[0] || '');
  const detail =
    'PHANTOM PURGE · TxnID=' + targetTxnId + ' · ' +
    'ORIGINAL ROW: Date=' + dateStr +
    ' Account=' + (targetData[1] || '') +
    ' Direction=' + (targetData[2] || '') +
    ' Category=' + (targetData[3] || '') +
    ' Amount=' + (targetData[4] || '') + ' ' + (targetData[5] || '') +
    ' Counterparty=' + (targetData[7] || '(blank)') +
    ' Notes=' + (targetData[8] || '(blank)') +
    ' · REASON: ' + (reasonText || '(no reason given)') +
    ' · SNAPSHOT: ' + snapName +
    ' · Audit trail preserves full row data forever.';

  const log = _agEnsureAuditLogTab();
  const beforeRow = log.getLastRow();
  try {
    _agLog('PHANTOM_PURGE', detail);
    SpreadsheetApp.flush();
  } catch(e) {
    _agAlert('❌ Audit log append FAILED. Aborting purge.\nSnapshot preserved: ' + snapName + '\n\n' + e);
    return;
  }
  if (log.getLastRow() < beforeRow + 1) {
    _agAlert('❌ Audit log did not register the entry. Aborting purge.\nSnapshot: ' + snapName);
    return;
  }

  try { tx.deleteRow(targetRow); }
  catch(e) {
    _agAlert('⚠️ Audit written but row delete FAILED.\nManual cleanup needed at row ' + targetRow + '.\nSnapshot: ' + snapName + '\n\n' + e);
    return;
  }

  _agAlert('✅ PHANTOM PURGED · forensic trail preserved\n\n' +
           'TxnID: ' + targetTxnId + '\n' +
           'Reason: ' + (reasonText || '(none given)') + '\n' +
           'Snapshot (recoverable): ' + snapName + '\n' +
           'Audit Log: PHANTOM_PURGE entry with full original row data\n\n' +
           'Verify 💼 Accounts balances next.');
}

function purgeKnown250Phantom() {
  purgePhantomWithAuditTrail(
    AG_KNOWN_250_TXN_ID,
    'No TXN_ADDED audit entry. No counterparty. No notes. No reversal partner. ' +
    'User confirmed has not had cash for a long time. Untraceable orphan, ' +
    'forensically resolved on Day 9/90 (02 May 2026).'
  );
}

// ───────── one-shot self-heal: fix Part 1 broken audit row ─────────

function fixBrokenPart1AuditEntry() {
  const log = _agEnsureAuditLogTab();
  const last = log.getLastRow();
  if (last <= 1) { _agAlert('Audit Log empty. Nothing to fix.'); return; }

  const data = log.getRange(2, 1, last - 1, 6).getValues();
  const dateLike = /^\d{1,2}\s+[A-Za-z]{3}/;
  const knownActions = ['PHANTOM_PURGE', 'PHANTOM_DETECTED', 'DIRECT_EDIT_DETECTED',
                        'INTEGRITY_SCAN', 'GUARDIAN_INSTALL', 'GUARDIAN_UNINSTALL'];
  let fixed = 0;
  const fixes = [];

  for (let i = 0; i < data.length; i++) {
    const r = i + 2;
    const c2 = String(data[i][1] || '').trim();
    const c3 = String(data[i][2] || '').trim();
    const c4 = String(data[i][3] || '').trim();
    const c5 = String(data[i][4] || '').trim();
    const c6 = String(data[i][5] || '').trim();

    if (dateLike.test(c2) && knownActions.indexOf(c3) !== -1) {
      const newAction = c3;
      const newDetail = c4 + (c5 ? ' · TxnID=' + c5 : '');
      const newUser = c6 || '';

      log.getRange(r, 2).setValue(newAction);
      log.getRange(r, 3).setValue(newDetail);
      log.getRange(r, 4).setValue(newUser);
      log.getRange(r, 5).setValue('');
      log.getRange(r, 6).setValue('');
      fixed++;
      fixes.push('row ' + r + ' → ' + newAction);
    }
  }

  _agLog('PHANTOM_PURGE_FIX',
    'Self-healed ' + fixed + ' broken Part 1 audit row(s) · ' +
    (fixes.length ? fixes.join(' | ') : 'none'));

  _agAlert('🔧 Audit Log self-heal complete\n\n' +
           'Rows fixed: ' + fixed + '\n' +
           (fixed ? 'Details:\n  ' + fixes.join('\n  ') : 'No broken rows found. Audit Log clean.'));
}

// ───────── menu ─────────

function appendAuditGuardianMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🛡️ Guardian')
      .addItem('⚙️ Install / Re-install Guardian', 'installAuditGuardian')
      .addItem('🛑 Uninstall Guardian', 'uninstallAuditGuardian')
      .addSeparator()
      .addItem('🔍 Run Phantom Scan Now', 'runIntegrityScanNow')
      .addItem('📋 One-Shot Backfill (log all phantoms)', 'oneShotPhantomBackfill')
      .addSeparator()
      .addItem('🧨 Purge Known 250 Phantom', 'purgeKnown250Phantom')
      .addSeparator()
      .addItem('🔧 Self-heal broken Part 1 audit rows', 'fixBrokenPart1AuditEntry')
      .addItem('🔬 Self-Test', '_agSelfTest')
      .addToUi();
  } catch(e) { Logger.log('Guardian menu add failed: ' + e); }
}

// ───────── self-test ─────────

function _agSelfTest() {
  const checks = [];
  const push = (lbl, ok, det) => checks.push((ok ? '✅' : '❌') + ' ' + lbl + (det ? ' · ' + det : ''));

  push('AG_TXN_TAB defined', !!AG_TXN_TAB, AG_TXN_TAB);
  push('AG_AUDIT_TAB defined', !!AG_AUDIT_TAB, AG_AUDIT_TAB);
  push('AG_KNOWN_250_TXN_ID defined', !!AG_KNOWN_250_TXN_ID, AG_KNOWN_250_TXN_ID);
  push('AG_TXN_COL_QE_SUBMIT defined (v1.1)', AG_TXN_COL_QE_SUBMIT === 12, 'col ' + AG_TXN_COL_QE_SUBMIT);
  push('AG_PHANTOM_SAFE_CATEGORIES populated (v1.1)',
       Array.isArray(AG_PHANTOM_SAFE_CATEGORIES) && AG_PHANTOM_SAFE_CATEGORIES.length === 7,
       AG_PHANTOM_SAFE_CATEGORIES.length + ' categories');

  push('installAuditGuardian exists', typeof installAuditGuardian === 'function');
  push('uninstallAuditGuardian exists', typeof uninstallAuditGuardian === 'function');
  push('onAuditGuardianEdit exists', typeof onAuditGuardianEdit === 'function');
  push('dailyIntegrityScan exists', typeof dailyIntegrityScan === 'function');
  push('runIntegrityScanNow exists', typeof runIntegrityScanNow === 'function');
  push('oneShotPhantomBackfill exists', typeof oneShotPhantomBackfill === 'function');
  push('purgePhantomWithAuditTrail exists', typeof purgePhantomWithAuditTrail === 'function');
  push('purgeKnown250Phantom exists', typeof purgeKnown250Phantom === 'function');
  push('fixBrokenPart1AuditEntry exists', typeof fixBrokenPart1AuditEntry === 'function');
  push('appendAuditGuardianMenu exists', typeof appendAuditGuardianMenu === 'function');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  push('Transactions tab exists', !!ss.getSheetByName(AG_TXN_TAB));
  push('Audit Log tab exists or will be created', true);

  let hasEdit = false, hasDaily = false;
  try {
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === 'onAuditGuardianEdit') hasEdit = true;
      if (t.getHandlerFunction() === 'dailyIntegrityScan') hasDaily = true;
    });
  } catch(e) {}
  push('onEdit trigger installed', hasEdit, hasEdit ? '' : 'run installAuditGuardian to create');
  push('Daily scan trigger installed', hasDaily, hasDaily ? '' : 'run installAuditGuardian to create');

  push('SpreadsheetApp', typeof SpreadsheetApp !== 'undefined');
  push('ScriptApp', typeof ScriptApp !== 'undefined');
  push('PropertiesService', typeof PropertiesService !== 'undefined');
  push('logAuditAction (Code.gs) available', typeof logAuditAction === 'function');
  push('safeAlert (Code.gs) available', typeof safeAlert === 'function');
  push('sendTelegram (Telegram.gs) available', typeof sendTelegram === 'function');

  Logger.log('═══════════════════════════════════════════════════════');
  Logger.log('🛡️ Audit_Guardian.gs v1.1 SELF-TEST');
  Logger.log('═══════════════════════════════════════════════════════');
  checks.forEach(c => Logger.log(c));
  Logger.log('═══════════════════════════════════════════════════════');
  const fails = checks.filter(c => c.indexOf('❌') === 0).length;
  Logger.log(fails === 0 ? '✅ ALL CHECKS PASSED · v1.1 ready' : '❌ ' + fails + ' checks failed');
  return { passed: checks.length - fails, failed: fails };
}
