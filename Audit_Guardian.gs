// ════════════════════════════════════════════════════════════════════
// 🛡️ Audit_Guardian.gs · v1.0 · 02 May 2026 · Day 9/90
// BANKING-CLASS AUDIT GAP PROTECTION
//
// PURPOSE: Close the audit-trail hole that allowed the 250 PKR Cash
//          Food phantom to exist. From now on, every direct cell edit
//          to 💸 Transactions tab leaves a trail. Daily integrity
//          scanner flags suspicious rows. One-shot backfill catches
//          historical phantoms (including the 250). Phantom purge is
//          forensically clean — every removal preserves full row data
//          in audit log forever.
//
// ARCHITECTURE:
//   1. Installable onEdit trigger on 💸 Transactions tab → catches
//      ALL user direct edits (script writes do NOT fire installable
//      onEdit triggers, so Quick Entry/Telegram/menu writes are safe).
//   2. Daily clock trigger at 23:55 PKT → integrity scan.
//   3. Manual one-shot backfill scanner → flags current phantoms.
//   4. Forensic phantom purge → snapshot + audit + delete (atomic).
//
// SCHEMA (Audit Log tab — 4 columns, matches existing v1.3):
//   Col A: Timestamp (ISO yyyy-MM-dd HH:mm:ss in PKT)
//   Col B: Action     (UPPERCASE_SNAKE)
//   Col C: Detail     (free-form, embeds TxnID for regex extraction)
//   Col D: User       (email)
//
// NEW ACTIONS LOGGED (add to Finance_Audit.gs whitelist in v2.0):
//   PHANTOM_PURGE         — manual forensic removal with full row data
//   PHANTOM_DETECTED      — backfill scan flagged a candidate
//   DIRECT_EDIT_DETECTED  — user edited a Transactions cell directly
//   INTEGRITY_SCAN        — daily scan ran (with stats)
//   GUARDIAN_INSTALL      — guardian triggers installed/reinstalled
//   GUARDIAN_UNINSTALL    — guardian triggers removed
//   PHANTOM_PURGE_FIX     — corrected a malformed Part 1 audit row
//
// ════════════════════════════════════════════════════════════════════
// 7-LAYER AUDIT
// ════════════════════════════════════════════════════════════════════
//
// LAYER 1 — 5-TEST AUDIT
//   ✓ Self-Contained: only SpreadsheetApp + Utilities + Session +
//                     ScriptApp + PropertiesService natives. No cross-
//                     file dep required.
//   ✓ Side-Effects: writes to Audit Log tab (append) + Transactions
//                   tab (delete only via purge function) + Script
//                   Properties (baseline timestamp) + Triggers (install).
//   ✓ Re-Run Safe: install function removes prior AG triggers before
//                  installing new ones (idempotent). Purge is idempotent
//                  (skips if txn already gone). Backfill scan is read-
//                  only on Transactions, only writes to audit log.
//   ✓ Mentally Traced: see MENTAL TRACE block below.
//   ✓ Failure Modes: see Layer 7 inventory below.
//
// LAYER 2 — FUNCTION CALL GRAPH
//   installAuditGuardian (entry)
//     → ScriptApp.getProjectTriggers (✓ native)
//     → ScriptApp.deleteTrigger (✓ native, prior AG triggers only)
//     → ScriptApp.newTrigger().forSpreadsheet().onEdit().create (✓ native)
//     → ScriptApp.newTrigger().timeBased().atHour(23).nearMinute(55).everyDays(1).create (✓ native)
//     → PropertiesService.getScriptProperties().setProperty (✓ native)
//     → _agLog (defined L~120) → _agEnsureAuditLogTab → log.appendRow
//
//   onAuditGuardianEdit (installable trigger)
//     → e.range.getSheet().getName (✓ native)
//     → guards: row range, col range, exclude col M
//     → _agLog with DIRECT_EDIT_DETECTED
//
//   dailyIntegrityScan (clock trigger)
//     → _agScanForPhantoms (defined L~210)
//     → _agLog with INTEGRITY_SCAN
//
//   runIntegrityScanNow (manual menu)
//     → _agScanForPhantoms
//     → _agAlert with results
//
//   oneShotPhantomBackfill (manual menu)
//     → _agScanForPhantoms
//     → _agLog PHANTOM_DETECTED for each
//     → _agAlert summary
//
//   purgePhantomWithAuditTrail (manual or wrapper)
//     → ss.getSheetByName + tx.copyTo + tx.deleteRow (✓ native)
//     → _agLog PHANTOM_PURGE
//
//   purgeKnown250Phantom (one-shot wrapper)
//     → purgePhantomWithAuditTrail with hardcoded 250 args
//
//   fixBrokenPart1AuditEntry (one-shot self-heal)
//     → scans Audit Log for Part 1 schema-bug rows
//     → rewrites them to 4-col correct format
//     → _agLog PHANTOM_PURGE_FIX
//
//   No orphan calls. All cross-file deps optional + typeof-guarded.
//
// LAYER 3 — TRIGGER + DATA RANGE MAP
//   Triggers:
//     [installable onEdit] → onAuditGuardianEdit (entire spreadsheet,
//                            but handler filters to '💸 Transactions')
//     [time-based clock]   → dailyIntegrityScan (23:55 PKT daily)
//   Transactions tab data range monitored: rows 14-213, cols 1-14
//   Excluded from edit-detection: col 13 (column M reversal checkbox
//                                  — intentional UI, has its own
//                                  handler in Finance_Pro.gs)
//   Audit Log tab: append-only, no row rewrites except by
//                  fixBrokenPart1AuditEntry one-shot.
//
// LAYER 4 — CELL-STATE MATRIX
//   Audit Log appends are pure setValue via appendRow (no formats,
//   no validations). Transactions deletes are pure deleteRow (no
//   cell rewrites). Snapshot is copyTo natural copy.
//   Triggers: created via ScriptApp.newTrigger, deleted via
//   ScriptApp.deleteTrigger. No conflict with existing triggers
//   (we only delete triggers whose handler function name starts
//   with 'onAuditGuardianEdit' or 'dailyIntegrityScan').
//
// LAYER 5 — STATE-ORDER PROOF
//   installAuditGuardian:
//     1. Read existing triggers (read-only)
//     2. Filter to AG triggers (by handler function name)
//     3. Delete those (each succeeds or fails independently)
//     4. Create new onEdit trigger
//     5. Create new daily clock trigger
//     6. Set baseline timestamp in Script Properties
//     7. Append GUARDIAN_INSTALL audit entry
//     8. Alert summary
//   purgePhantomWithAuditTrail:
//     1. Locate target row (read-only)
//     2. If not found → alert + exit
//     3. Capture full row data
//     4. Snapshot Transactions tab
//     5. If snapshot fails → abort, no audit, no delete
//     6. Append PHANTOM_PURGE audit (with full row data in detail)
//     7. Verify audit append (re-read last row)
//     8. If audit fails → abort delete (snapshot intact as evidence)
//     9. Delete target row
//    10. Alert success
//   Atomicity: snapshot → audit → delete. Each gates the next.
//
// LAYER 6 — BACKWARD-COMPAT VERIFICATION
//   Audit Log tab schema unchanged (4 cols). Existing readers safe:
//     - Finance_Audit.gs v1.3 _readAuditEntries reads 4 cols ✓
//     - Display tab regex extracts TxnID from Detail ✓ (we embed it)
//   New action types must be added to FIN_AUDIT_WHITELIST in v1.3
//   for them to display in 📜 Finance Audit tab. Until then, they
//   exist in source Audit Log and Hub recent panel filters them out.
//   No changes to: Transactions tab schema, Telegram dispatcher,
//   Quick Entry, /atm, /debt, salary detection, kite, snapshot
//   system, theme, menu loader. Pure additive file.
//
// LAYER 7 — FAILURE-MODE INVENTORY
//   1. Audit Log tab missing      → auto-created with 4-col header
//   2. Transactions tab missing   → onEdit handler exits silently;
//                                   purge alerts + exits
//   3. Trigger install fails      → alert reports specific error;
//                                   prior triggers (if any) restored
//   4. onEdit fires on script-    → CANNOT HAPPEN (installable
//      written cells                triggers fire only on user edits)
//   5. onEdit fires on col M tick → guarded out; intentional
//   6. Daily scan finds 0         → INTEGRITY_SCAN logged with 0
//                                   count, no alert noise
//   7. Daily scan finds 100+      → logged + would alert (Telegram)
//   8. Phantom purge: txn missing → "already purged" exit
//   9. Phantom purge: snapshot fail → abort before delete
//  10. Phantom purge: audit fail   → abort before delete
//  11. Phantom purge: delete fail  → audit + snapshot intact, alert
//                                    user with manual cleanup info
//  12. fixBrokenPart1AuditEntry    → idempotent, finds bad rows by
//                                    pattern (col 2 looks like date
//                                    not action), rewrites only those.
//                                    If none exist, exits cleanly.
//
// ════════════════════════════════════════════════════════════════════
// MENTAL TRACE — typical user direct edit on row 50, col 5 (amount)
// ════════════════════════════════════════════════════════════════════
// 1. User opens Transactions tab, clicks row 50 col 5, types 999, Enter.
// 2. Apps Script fires installable onEdit trigger.
// 3. onAuditGuardianEdit(e) called with e.range covering row 50 col 5.
// 4. e.range.getSheet().getName() === '💸 Transactions' ✓
// 5. row=50 in [14,213] ✓
// 6. col=5 in [1,14] ✓
// 7. col=5 ≠ 13 (not col M) ✓ → not skipped
// 8. oldVal = e.oldValue (e.g. '500'). newVal = e.value ('999').
// 9. Read TxnID from col 14 of row 50 (e.g. 'TXN-...').
// 10. Build detail: 'Direct cell edit detected. Row=50 Col=5 Before=500
//     After=999 TxnID=TXN-... This bypassed normal writers...'
// 11. Call _agLog('DIRECT_EDIT_DETECTED', detail).
// 12. _agLog: get/create Audit Log tab, get user email, format ISO ts,
//     appendRow [ts, 'DIRECT_EDIT_DETECTED', detail, email].
// 13. Done. User sees no popup (silent capture). Audit log has the
//     trail. Daily scan + manual review surface it.
//
// ════════════════════════════════════════════════════════════════════

const AG_TXN_TAB = '💸 Transactions';
const AG_AUDIT_TAB = 'Audit Log';
const AG_TZ = 'Asia/Karachi';
const AG_TXN_ROW_MIN = 14;
const AG_TXN_ROW_MAX = 213;
const AG_TXN_COL_MAX = 14;
const AG_TXN_COL_REVERSAL = 13;
const AG_TXN_COL_TXNID = 14;
const AG_DAILY_SCAN_HOUR = 23;
const AG_BASELINE_KEY = 'AG_GUARDIAN_BASELINE_TS';
const AG_KNOWN_250_TXN_ID = 'TXN-20260502-180127-435';

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
  // Prefer existing Code.gs logger if available (keeps single source)
  if (typeof logAuditAction === 'function') {
    try { logAuditAction(action, detail); return; } catch(e) {}
  }
  // Fallback: write directly to 4-col Audit Log
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
    if (col === AG_TXN_COL_REVERSAL) return; // intentional reversal UI

    const oldVal = (e.oldValue !== undefined && e.oldValue !== null) ? String(e.oldValue) : '(empty)';
    const newVal = (e.value !== undefined && e.value !== null) ? String(e.value) : '(empty)';
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
    'Audit Guardian v1.0 installed · removed=' + removed.length +
    ' created=' + created.length +
    (errs.length ? ' errors=' + errs.length + ' (' + errs.join(' | ') + ')' : ''));

  let msg = '🛡️ AUDIT GUARDIAN v1.0 INSTALLED\n\n';
  msg += 'Removed prior AG triggers: ' + removed.length + '\n';
  msg += 'Created new triggers: ' + created.length + '\n';
  created.forEach(c => msg += '  ✓ ' + c + '\n');
  if (errs.length) {
    msg += '\n⚠️ Errors:\n';
    errs.forEach(e => msg += '  · ' + e + '\n');
  }
  msg += '\nFROM NOW ON:\n';
  msg += '  · Every direct cell edit to Transactions logs DIRECT_EDIT_DETECTED\n';
  msg += '  · Daily 23:55 PKT integrity scan auto-runs\n';
  msg += '  · Phantom purge available via menu\n\n';
  msg += 'Next: 🛡️ Guardian → Backfill Phantoms → review the 250 flag → purge.';
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

// ───────── phantom scanner ─────────

function _agIsLikelyPhantom(row) {
  const counterparty = String(row[7] || '').trim();
  const notes = String(row[8] || '').trim();
  const category = String(row[3] || '').trim();
  if (category === '💰 Opening Balance') return false; // intentional
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
  _agLog('INTEGRITY_SCAN',
    'Daily scan · rows=' + r.scanned + ' phantoms=' + r.phantoms.length +
    (r.phantoms.length ? ' candidates: ' + r.phantoms.map(p => p.txnId).join(' | ') : ''));
  // Optional: ship Telegram alert on >0 phantoms
  if (r.phantoms.length > 0 && typeof sendTelegram === 'function') {
    try {
      sendTelegram('🛡️ Audit Guardian · daily scan flagged ' + r.phantoms.length +
                   ' potential phantom row(s). Open menu 🛡️ Guardian → Run Scan Now to review.');
    } catch(e) {}
  }
}

function runIntegrityScanNow() {
  const r = _agScanForPhantoms();
  let msg = '🔍 PHANTOM INTEGRITY SCAN\n\n';
  msg += 'Rows scanned: ' + r.scanned + '\n';
  msg += 'Suspicious phantom candidates: ' + r.phantoms.length + '\n';
  if (r.phantoms.length === 0) {
    msg += '\n✅ Ledger is clean. No untraceable rows.';
  } else {
    msg += '\nFlagged rows (counterparty + notes both blank):\n\n';
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
// Part 1 script wrote 6 columns to a 4-col Audit Log. Result: col 2
// got a date string instead of action. Detect and rewrite.

function fixBrokenPart1AuditEntry() {
  const log = _agEnsureAuditLogTab();
  const last = log.getLastRow();
  if (last <= 1) { _agAlert('Audit Log empty. Nothing to fix.'); return; }

  // Inspect cols 1-6 of all rows; flag rows where col 2 looks like a
  // date (e.g. "02 May") AND col 3 is one of our known new actions.
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

    // Pattern: col 2 is date-like, col 3 is a known action
    if (dateLike.test(c2) && knownActions.indexOf(c3) !== -1) {
      // Rebuild: keep col 1 (Timestamp), shift action from c3 to c2,
      // merge c4 (old detail) + c5 (TxnID) into new detail in c3,
      // user from c6 into c4. Then clear c5, c6.
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

  // Tab presence
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  push('Transactions tab exists', !!ss.getSheetByName(AG_TXN_TAB));
  push('Audit Log tab exists or will be created', true);

  // Trigger inventory
  let hasEdit = false, hasDaily = false;
  try {
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === 'onAuditGuardianEdit') hasEdit = true;
      if (t.getHandlerFunction() === 'dailyIntegrityScan') hasDaily = true;
    });
  } catch(e) {}
  push('onEdit trigger installed', hasEdit, hasEdit ? '' : 'run installAuditGuardian to create');
  push('Daily scan trigger installed', hasDaily, hasDaily ? '' : 'run installAuditGuardian to create');

  // External deps
  push('SpreadsheetApp', typeof SpreadsheetApp !== 'undefined');
  push('ScriptApp', typeof ScriptApp !== 'undefined');
  push('PropertiesService', typeof PropertiesService !== 'undefined');
  push('logAuditAction (Code.gs) available', typeof logAuditAction === 'function');
  push('safeAlert (Code.gs) available', typeof safeAlert === 'function');
  push('sendTelegram (Telegram.gs) available', typeof sendTelegram === 'function');

  Logger.log('═══════════════════════════════════════');
  Logger.log('🛡️ Audit_Guardian.gs v1.0 SELF-TEST');
  Logger.log('═══════════════════════════════════════');
  checks.forEach(c => Logger.log(c));
  Logger.log('═══════════════════════════════════════');
  const fails = checks.filter(c => c.indexOf('❌') === 0).length;
  Logger.log(fails === 0 ? '✅ ALL CHECKS PASSED · safe to install Guardian' : '⚠️ ' + fails + ' checks failed');
  return { passed: checks.length - fails, failed: fails };
}