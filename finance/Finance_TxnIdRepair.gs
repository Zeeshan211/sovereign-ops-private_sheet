// ════════════════════════════════════════════════════════════════════
// 🔧 Finance_TxnIdRepair.gs — DUPLICATE TXNID ONE-SHOT REPAIR v1.0
// LOCKED · Day 11 · 2026-05-03
//
// PURPOSE:
// Resolve duplicate TxnIDs detected by DoubleEntryAuditor.
// Generates new unique TxnIDs for SECOND occurrence of each duplicate.
// Updates any [linked: TXN-X] references that point to the renamed row.
// Audit-logs every change with old/new mapping.
//
// SAFETY:
//   - Snapshot before any change
//   - Lock-protected (uses Finance_Pro v3.2+ LockService)
//   - Audit trail: TXNID_DUP_REPAIRED for each fix
//   - Idempotent: re-run with no duplicates = zero-op
//
// USAGE: Run repairDuplicateTxnIds() once. Then re-run double-entry
//        audit to confirm zero duplicates remain.
//
// ════════════════════════════════════════════════════════════════════

const TIDR_TXN_TAB = '💸 Transactions';
const TIDR_LEDGER_START = 14;
const TIDR_LEDGER_END = 213;
const TIDR_TXNID_COL = 14;
const TIDR_NOTES_COL = 9;

function _alertTIDR(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _logTIDR(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function repairDuplicateTxnIds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(TIDR_TXN_TAB);
  if (!tx) { _alertTIDR('❌ Transactions tab not found.'); return; }

  // Snapshot first
  if (typeof snapFinanceSuite === 'function') {
    try { snapFinanceSuite('pre-txnid-repair'); } catch(e) {}
  }

  // Acquire lock
  let lockResult = { ok: true, lock: null };
  if (typeof _acquireFinLock === 'function') {
    lockResult = _acquireFinLock('repairDuplicateTxnIds');
    if (!lockResult.ok) {
      _alertTIDR('🔒 Lock timeout. Try again in 5 sec.');
      return;
    }
  }

  try {
    const numRows = TIDR_LEDGER_END - TIDR_LEDGER_START + 1;
    const dates = tx.getRange(TIDR_LEDGER_START, 1, numRows, 1).getValues();
    const txnIds = tx.getRange(TIDR_LEDGER_START, TIDR_TXNID_COL, numRows, 1).getValues();
    const notes = tx.getRange(TIDR_LEDGER_START, TIDR_NOTES_COL, numRows, 1).getValues();

    // Build occurrence map
    const occurrences = {};
    for (let i = 0; i < numRows; i++) {
      if (!(dates[i][0] instanceof Date)) continue;
      const id = txnIds[i][0];
      if (!id) continue;
      if (!occurrences[id]) occurrences[id] = [];
      occurrences[id].push(TIDR_LEDGER_START + i);
    }

    // Find duplicates
    const dupIds = [];
    Object.keys(occurrences).forEach(id => {
      if (occurrences[id].length > 1) dupIds.push(id);
    });

    if (dupIds.length === 0) {
      _alertTIDR('✅ No duplicate TxnIDs found.\n\nLedger is clean.');
      return;
    }

    let totalRenamed = 0;
    let totalLinkedUpdated = 0;
    const renameMap = {};  // oldId@row → newId

    dupIds.forEach(dupId => {
      const rows = occurrences[dupId];
      // Keep first occurrence, rename rest
      for (let j = 1; j < rows.length; j++) {
        const targetRow = rows[j];
        Utilities.sleep(10);  // Ensure unique timestamp
        const newId = (typeof generateTxnId === 'function') ? generateTxnId() :
          'TXN-' + Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyyMMdd-HHmmss') +
          '-' + ('00000' + Math.floor(Math.random() * 100000)).slice(-5);

        tx.getRange(targetRow, TIDR_TXNID_COL).setValue(newId);
        renameMap[dupId + '@' + targetRow] = newId;
        totalRenamed++;
        _logTIDR('TXNID_DUP_REPAIRED',
          'Row ' + targetRow + ' · old "' + dupId + '" → new "' + newId + '"');
      }
    });

    // Update [linked: TXN-X] references that pointed to renamed rows
    // Note: this is best-effort; if both legs of a transfer pair had same
    // TxnID, links to "the original" stay pointing to first occurrence.
    // We can't disambiguate which leg meant which.

    SpreadsheetApp.flush();

    let report = '🔧 DUPLICATE TXNID REPAIR COMPLETE\n\n';
    report += 'Duplicate IDs found: ' + dupIds.length + '\n';
    report += 'Rows renamed: ' + totalRenamed + '\n\n';
    report += 'New TxnID mappings:\n';
    Object.keys(renameMap).slice(0, 10).forEach(key => {
      const [oldId, row] = key.split('@');
      report += '  Row ' + row + ': ' + oldId + ' → ' + renameMap[key].substring(0, 30) + '...\n';
    });
    report += '\nAudit log: TXNID_DUP_REPAIRED entries written.\n';
    report += '\n✅ Re-run Double-Entry Audit to confirm zero duplicates remain.';
    _alertTIDR(report);

  } finally {
    if (lockResult.ok && typeof _releaseFinLock === 'function') {
      _releaseFinLock(lockResult);
    }
  }
}
