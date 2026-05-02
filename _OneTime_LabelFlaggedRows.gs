// ════════════════════════════════════════════════════════════════════
// 🏷️ _OneTime_LabelFlaggedRows.gs · v1.0 · 02 May 2026 · Day 9/90
//
// PURPOSE: Walk through each phantom-flagged row and prompt for
//          counterparty + notes in popups. Updates row, logs each
//          edit to Audit Log as ROW_LABELED. After all 4, re-runs
//          phantom scan to confirm 0 flags remain.
//
// SAFETY:  Read-only first (locates rows). Cancellable per row.
//          Skips rows already labeled. Audit-trail every edit.
//
// ONE-TIME: Run once. Delete file after.
// ════════════════════════════════════════════════════════════════════

function labelFlaggedRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) { ui.alert('❌ Transactions tab not found.'); return; }

  // Re-scan live (don't trust stale popup data)
  const data = tx.getRange(14, 1, 200, 14).getValues();
  const flagged = [];
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (!r[0]) continue;
    const cp = String(r[7] || '').trim();
    const nt = String(r[8] || '').trim();
    const cat = String(r[3] || '').trim();
    if (cat === '💰 Opening Balance') continue;
    if (cp === '' && nt === '') {
      flagged.push({
        row: 14 + i,
        date: r[0],
        account: r[1],
        direction: r[2],
        category: r[3],
        amount: r[4],
        txnId: r[13]
      });
    }
  }

  if (flagged.length === 0) {
    ui.alert('✅ No flagged rows. Ledger is clean.');
    return;
  }

  let labeled = 0, skipped = 0, cancelled = false;

  for (let i = 0; i < flagged.length; i++) {
    const f = flagged[i];
    const dateStr = (f.date instanceof Date) ?
      Utilities.formatDate(f.date, 'Asia/Karachi', 'dd MMM yyyy') : String(f.date);

    const header = '🏷️ Row ' + (i+1) + ' of ' + flagged.length + '\n\n' +
      dateStr + ' · ' + f.account + ' · ' + f.direction + '\n' +
      f.category + ' · ' + f.amount + ' PKR\n' +
      'TxnID: ' + f.txnId + '\n\n';

    // Counterparty prompt
    const cpResp = ui.prompt(
      header + 'COUNTERPARTY (who/where the money went):',
      'e.g. "Jazz", "Pharmacy", "Careem", "1-Biller", or leave blank to skip',
      ui.ButtonSet.OK_CANCEL
    );
    if (cpResp.getSelectedButton() !== ui.Button.OK) { cancelled = true; break; }
    const cp = cpResp.getResponseText().trim();

    if (cp === '') { skipped++; continue; }

    // Notes prompt (optional, defaults if empty)
    const ntResp = ui.prompt(
      header + 'NOTES (optional context):',
      'e.g. "Monthly recharge", "Doctor visit", or press OK with blank for default',
      ui.ButtonSet.OK_CANCEL
    );
    if (ntResp.getSelectedButton() !== ui.Button.OK) { cancelled = true; break; }
    let nt = ntResp.getResponseText().trim();
    if (nt === '') nt = 'Labeled retroactively · ' + Utilities.formatDate(new Date(), 'Asia/Karachi', 'dd MMM');

    // Write counterparty (col 8)
    tx.getRange(f.row, 8).setValue(cp);

    // Write notes (col 9, merged 9-12)
    try { tx.getRange(f.row, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(f.row, 9, 1, 4).merge().setValue(nt);

    // Audit log entry
    if (typeof logAuditAction === 'function') {
      logAuditAction('ROW_LABELED',
        'Row ' + f.row + ' · TxnID=' + f.txnId +
        ' · Counterparty=' + cp + ' · Notes=' + nt +
        ' · Retroactive label by user (was phantom-flagged).');
    } else {
      // Fallback direct append
      const log = ss.getSheetByName('Audit Log');
      if (log) {
        log.appendRow([
          Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd HH:mm:ss'),
          'ROW_LABELED',
          'Row ' + f.row + ' · TxnID=' + f.txnId + ' · Counterparty=' + cp + ' · Notes=' + nt,
          Session.getActiveUser().getEmail() || '(unknown)'
        ]);
      }
    }

    labeled++;
    SpreadsheetApp.flush();
  }

  let summary = '🏷️ LABELING COMPLETE\n\n';
  summary += 'Labeled: ' + labeled + '\n';
  summary += 'Skipped: ' + skipped + '\n';
  summary += 'Total flagged: ' + flagged.length + '\n';
  if (cancelled) summary += '\n⚠️ Cancelled mid-way.\n';
  summary += '\nNext: 🛡️ Guardian → 🔍 Run Phantom Scan Now → confirm clean.';
  ui.alert(summary);
}