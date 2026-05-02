// ════════════════════════════════════════════════════════════════════
// 🔍 Inspector_AlfalahCC.gs — READ-ONLY LEDGER COMPARE
// LOCKED · 7-Layer Audit · Day 6 / 90 · 2026-04-30
// SAFE: read-only. Never modifies anything.
// ════════════════════════════════════════════════════════════════════

function inspectAlfalahCC() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const txn = ss.getSheetByName('💸 Transactions');
  if (!txn) { Logger.log('Transactions tab not found'); return; }

  // Find ledger boundaries — assume FIN2_LEDGER_START_ROW exists from Finance_Pro
  const startRow = (typeof FIN2_LEDGER_START_ROW !== 'undefined') ? FIN2_LEDGER_START_ROW : 14;
  const endRow = (typeof FIN2_LEDGER_END_ROW !== 'undefined') ? FIN2_LEDGER_END_ROW : 213;

  const numCols = txn.getLastColumn();
  const data = txn.getRange(startRow, 1, endRow - startRow + 1, numCols).getValues();

  // Identify column positions by reading header row (row 13 typically)
  const headerRow = startRow - 1;
  const headers = txn.getRange(headerRow, 1, 1, numCols).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => {
    if (h) colMap[String(h).trim().toLowerCase()] = i;
  });

  Logger.log('Headers found: ' + JSON.stringify(headers));
  Logger.log('ColMap: ' + JSON.stringify(colMap));

  // Common header variations
  const dateIdx = colMap['date'] !== undefined ? colMap['date'] : 0;
  const accountIdx = colMap['account'] !== undefined ? colMap['account'] : 1;
  const typeIdx = colMap['type'] !== undefined ? colMap['type'] : 2;
  const categoryIdx = colMap['category'] !== undefined ? colMap['category'] : 3;
  const amountIdx = colMap['amount'] !== undefined ? colMap['amount'] : 4;
  const counterpartyIdx = colMap['counterparty'] !== undefined ? colMap['counterparty'] : 6;
  const notesIdx = colMap['notes'] !== undefined ? colMap['notes'] : 7;
  const txnIdIdx = colMap['txnid'] !== undefined ? colMap['txnid'] : (colMap['txn id'] !== undefined ? colMap['txn id'] : numCols - 1);

  // Filter to Alfalah CC, last 35 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 35);

  const ccEntries = [];
  let totalCredits = 0;
  let totalDebits = 0;

  data.forEach((row, idx) => {
    const rowNum = startRow + idx;
    const acct = String(row[accountIdx] || '').toLowerCase();

    // Match Alfalah CC variations
    if (acct.indexOf('alfalah') === -1 && acct.indexOf('alfa') === -1 && acct.indexOf('cc') === -1) return;
    if (acct.indexOf('alfalah cc') === -1 && acct.indexOf('alfa cc') === -1 && acct !== 'cc') return;

    const date = row[dateIdx];
    if (!(date instanceof Date)) return;
    if (date < cutoff) return;

    const amount = parseFloat(row[amountIdx]) || 0;
    const type = String(row[typeIdx] || '').trim();
    const category = String(row[categoryIdx] || '').trim();
    const counterparty = String(row[counterpartyIdx] || '').trim();
    const notes = String(row[notesIdx] || '').trim();
    const txnId = String(row[txnIdIdx] || '').trim();

    const dateStr = Utilities.formatDate(date, 'Asia/Karachi', 'MMM dd');
    const isCredit = amount > 0;
    if (isCredit) totalCredits += amount; else totalDebits += Math.abs(amount);

    ccEntries.push({
      row: rowNum,
      date: dateStr,
      amount: amount,
      type: type,
      category: category,
      counterparty: counterparty,
      notes: notes,
      txnId: txnId
    });
  });

  // Sort by date
  ccEntries.sort((a, b) => a.date.localeCompare(b.date));

  let report = '🔍 ALFALAH CC LEDGER · last 35 days\n\n';
  report += 'Entries found: ' + ccEntries.length + '\n';
  report += 'Total credits (+): ' + totalCredits.toFixed(2) + ' PKR\n';
  report += 'Total debits (-):  ' + totalDebits.toFixed(2) + ' PKR\n';
  report += 'Net change: ' + (totalCredits - totalDebits).toFixed(2) + ' PKR\n\n';
  report += '── ENTRIES ──\n';

  ccEntries.forEach(e => {
    const sign = e.amount > 0 ? '+' : '';
    report += '[Row ' + e.row + '] ' + e.date + 
              ' · ' + sign + e.amount.toFixed(2) + 
              ' · ' + e.type + 
              ' · ' + e.category + 
              ' · ' + (e.counterparty || '—') + 
              ' · ' + (e.notes || '—') + 
              ' · ID:' + (e.txnId || '—') + '\n';
  });

  Logger.log(report);
  return { entries: ccEntries, totalCredits: totalCredits, totalDebits: totalDebits };
}
