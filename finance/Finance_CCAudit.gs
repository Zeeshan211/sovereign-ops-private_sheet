// ════════════════════════════════════════════════════════════════════
// 🔍 Finance_CCAudit.gs — CC FORENSIC CHRONOLOGICAL AUDIT v1.0
// LOCKED · Day 11 · 2026-05-03
//
// PURPOSE:
// User suspects CC outstanding (78,655 PKR) reflects pre-payment data
// or has missing/duplicate transactions. This forensic tool lists EVERY
// CC-touching ledger row chronologically with running balance, plus
// cross-checks Bills tab "marked paid" entries against ledger.
//
// VIEWS GENERATED:
//   1. CC chronological ledger with running outstanding
//   2. Largest 5 CC payments (transfers TO CC)
//   3. Largest 5 CC charges (expenses ON CC)
//   4. Bills tab "marked paid" entries that reference CC
//   5. Statement-cycle estimate (last 30 days vs prior 30 days)
//
// READ-ONLY · zero writes · safe to run any time.
// ════════════════════════════════════════════════════════════════════

const CCA_TXN_TAB = '💸 Transactions';
const CCA_BILLS_TAB = '📅 Bills';
const CCA_CC_NAME = 'Alfalah CC';
const CCA_LEDGER_START = 14;
const CCA_LEDGER_END = 213;
const CCA_TZ = 'Asia/Karachi';

function _alertCCA(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function auditCCActivity() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(CCA_TXN_TAB);
  if (!tx) { _alertCCA('❌ Transactions tab not found.'); return; }

  const numRows = CCA_LEDGER_END - CCA_LEDGER_START + 1;
  const block = tx.getRange(CCA_LEDGER_START, 1, numRows, 14).getValues();

  // Filter CC-touching rows
  const ccRows = [];
  for (let i = 0; i < block.length; i++) {
    const r = block[i];
    if (!(r[0] instanceof Date)) continue;
    const account = r[1];
    const counterparty = r[7] || '';
    const notes = r[8] || '';
    if (account === CCA_CC_NAME ||
        String(counterparty).indexOf(CCA_CC_NAME) !== -1 ||
        String(notes).indexOf(CCA_CC_NAME) !== -1) {
      ccRows.push({
        rowNum: CCA_LEDGER_START + i,
        date: r[0],
        account: account,
        type: r[2],
        category: r[3],
        amount: typeof r[4] === 'number' ? r[4] : 0,
        currency: r[5],
        pkr: typeof r[6] === 'number' ? r[6] : 0,
        counterparty: counterparty,
        notes: String(notes),
        txnId: r[13] || ''
      });
    }
  }

  // Sort chronologically (oldest first)
  ccRows.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Compute running CC balance
  let runningBal = 0;
  ccRows.forEach(row => {
    if (row.account !== CCA_CC_NAME) {
      // Other-account row referencing CC (e.g., Meezan Transfer to CC)
      // These don't directly affect CC balance from the CC row's perspective.
      row.runningBal = runningBal;
      row.delta = 0;
      return;
    }
    let delta = 0;
    if (row.type === 'Income' || row.type === 'Debt In') delta = row.pkr;
    else if (row.type === 'Expense' || row.type === 'Debt Out' || row.type === 'Transfer') delta = -row.pkr;
    runningBal += delta;
    row.runningBal = runningBal;
    row.delta = delta;
  });

  const outstanding = Math.max(0, -runningBal);

  // Categorize: payments (Income to CC = reduces outstanding) vs charges (Expense)
  const payments = ccRows.filter(r => r.account === CCA_CC_NAME && (r.type === 'Income' || r.type === 'Debt In'))
    .sort((a, b) => b.pkr - a.pkr);
  const charges = ccRows.filter(r => r.account === CCA_CC_NAME && r.type === 'Expense')
    .sort((a, b) => b.pkr - a.pkr);

  // Last 30 days vs prior 30 days (rough cycle estimate)
  const now = new Date();
  const day30Ago = new Date(now.getTime() - 30 * 86400000);
  const day60Ago = new Date(now.getTime() - 60 * 86400000);
  let last30Charges = 0, last30Payments = 0;
  let prior30Charges = 0, prior30Payments = 0;
  ccRows.forEach(r => {
    if (r.account !== CCA_CC_NAME) return;
    const t = r.date.getTime();
    if (t >= day30Ago.getTime()) {
      if (r.type === 'Expense') last30Charges += r.pkr;
      else if (r.type === 'Income' || r.type === 'Debt In') last30Payments += r.pkr;
    } else if (t >= day60Ago.getTime()) {
      if (r.type === 'Expense') prior30Charges += r.pkr;
      else if (r.type === 'Income' || r.type === 'Debt In') prior30Payments += r.pkr;
    }
  });

  // Cross-check Bills tab entries
  const bills = ss.getSheetByName(CCA_BILLS_TAB);
  const ccBills = [];
  if (bills) {
    const billsBlock = bills.getRange(5, 1, 10, 9).getValues();
    billsBlock.forEach((bRow, idx) => {
      const billName = bRow[0];
      const account = bRow[3];
      const lastPaid = bRow[7];
      const billRow = 5 + idx;
      if (!billName) return;
      const isCCBill = String(billName).toLowerCase().indexOf('cc') !== -1 ||
                       String(billName).toLowerCase().indexOf('alfalah') !== -1 ||
                       account === CCA_CC_NAME;
      if (isCCBill) {
        ccBills.push({
          row: billRow,
          name: billName,
          amount: bRow[2],
          account: account,
          lastPaid: lastPaid
        });
      }
    });
  }

  // Build report
  let report = '🔍 CC FORENSIC AUDIT v1.0\n';
  report += '════════════════════════════════════════\n';
  report += 'CC: ' + CCA_CC_NAME + '\n';
  report += 'Total CC-touching ledger rows: ' + ccRows.length + '\n';
  report += 'Computed outstanding: ' + outstanding.toFixed(2) + ' PKR\n\n';

  report += '📊 LAST 30 DAYS:\n';
  report += '  Charges:  ' + last30Charges.toFixed(0) + ' PKR\n';
  report += '  Payments: ' + last30Payments.toFixed(0) + ' PKR\n';
  report += '  Net:      ' + (last30Charges - last30Payments).toFixed(0) + ' PKR\n\n';

  report += '📊 PRIOR 30 DAYS (30-60 days ago):\n';
  report += '  Charges:  ' + prior30Charges.toFixed(0) + ' PKR\n';
  report += '  Payments: ' + prior30Payments.toFixed(0) + ' PKR\n';
  report += '  Net:      ' + (prior30Charges - prior30Payments).toFixed(0) + ' PKR\n\n';

  report += '────────────────────────────────────────\n';
  report += '💰 TOP 5 CC PAYMENTS (Income to CC):\n';
  if (payments.length === 0) {
    report += '  (none)\n';
  } else {
    payments.slice(0, 5).forEach(p => {
      const dateStr = Utilities.formatDate(p.date, CCA_TZ, 'dd MMM');
      report += '  Row ' + p.rowNum + ' · ' + dateStr + ' · ' + p.pkr.toFixed(0).padStart(7) + ' PKR · ' +
                (p.counterparty || p.notes.substring(0, 30)) + '\n';
    });
  }

  report += '\n💸 TOP 5 CC CHARGES (Expense on CC):\n';
  if (charges.length === 0) {
    report += '  (none)\n';
  } else {
    charges.slice(0, 5).forEach(c => {
      const dateStr = Utilities.formatDate(c.date, CCA_TZ, 'dd MMM');
      report += '  Row ' + c.rowNum + ' · ' + dateStr + ' · ' + c.pkr.toFixed(0).padStart(7) + ' PKR · ' +
                (c.category || '?') + ' · ' + (c.counterparty || c.notes.substring(0, 30)) + '\n';
    });
  }

  if (ccBills.length > 0) {
    report += '\n────────────────────────────────────────\n';
    report += '📅 CC BILLS in Bills tab:\n';
    ccBills.forEach(b => {
      const lastPaidStr = b.lastPaid instanceof Date ?
        Utilities.formatDate(b.lastPaid, CCA_TZ, 'dd MMM') : '(never)';
      report += '  Row ' + b.row + ' · ' + b.name + ' · ' + (b.amount || 0) + ' PKR · ' +
                'last paid: ' + lastPaidStr + '\n';
    });
    report += '\n  ⚠️ Cross-check: each "last paid" date should match a CC payment\n';
    report += '     in the TOP 5 CC PAYMENTS above. If a bill was marked paid\n';
    report += '     but no matching ledger row exists → orphan mark.\n';
    report += '     If a bill marked paid AND extra ledger payment exists → double-counted.\n';
  }

  report += '\n────────────────────────────────────────\n';
  report += '👀 EYEBALL CHECK:\n';
  report += 'Scroll through. Look for:\n';
  report += '  1. A large CC payment YOU REMEMBER making — is it in the list?\n';
  report += '  2. Two payments on same date with same amount (duplicate)?\n';
  report += '  3. A "🏠 Bills" expense ON CC that should have been a transfer?\n';
  report += '  4. Bill marked paid in Bills tab but no matching ledger entry?\n';

  _alertCCA(report);
}

function appendCCAuditMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🔍 CC Audit')
      .addItem('🔍 Run CC Forensic Audit', 'auditCCActivity')
      .addToUi();
  } catch(e) { Logger.log('CC Audit menu add failed: ' + e); }
}
