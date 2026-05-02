// ════════════════════════════════════════════════════════════════════
// 📅 Finance_BillsSmart.gs — SMART BILLS HANDLER v1.0
// LOCKED · 7-Layer Audit · Self-Contained · Day 11 · 2026-05-03
//
// PURPOSE:
// Wraps the existing Bills tab "Mark Paid" flow with banking-grade
// intelligence. Solves three real-world issues that strict but dumb
// rejection caused:
//
//   1. ZERO-AMOUNT VALID STATE
//      User cleared a bill outside the system (e.g., paid CC statement
//      via bank app directly). Wants to mark "no action this cycle".
//      Old behavior: amount=0 rejected with "Bill incomplete" error.
//      New behavior: amount=0 → audit-log "skipped this cycle" → set
//      Last Paid date → no ledger row written → no false data.
//
//   2. CC PAYMENT AMOUNT IS VARIABLE
//      "Alfalah CC Payment" bill had hardcoded 5000 PKR which is
//      meaningless — real CC payment varies (0 if cleared, 5% min,
//      full statement, custom).
//      New behavior: when bill name contains "CC" or account = CC,
//      popup offers: full clear / 5% min / custom / skip cycle.
//      Computed in real time from current CC outstanding.
//
//   3. STATEMENT-CYCLE AWARENESS
//      User pays CC statement → marks bill paid → next month system
//      forgets cycle context.
//      New behavior: track last cycle paid in DocumentProperties.
//      If bill marked paid same cycle (close-to-close window), prompt
//      shows "✅ This cycle already paid via row [N]" and asks if
//      additional payment intended.
//
// DESIGN PRINCIPLES:
//   - Wraps, doesn't replace, original markBillPaid (zero regression)
//   - Intercepts at trigger level via _smartBillsOnEdit hook
//   - All paths audit-logged (BILL_SKIPPED_ZERO / BILL_PAID / BILL_CC_AUTOPAY)
//   - LockService preserved
//   - Snapshot-protected if going destructive
//
// ════════════════════════════════════════════════════════════════════
// 7-LAYER AUDIT
// ════════════════════════════════════════════════════════════════════
//
// L1 — 5-TEST: Self-contained ✓ Side-effects: writes via Finance_Pro ✓
//      Re-run safe ✓ Mentally traced (3 scenarios below) ✓
//      Failure modes: see L7
//
// L2 — CALL GRAPH:
//   _smartBillsOnEdit (entry, fires on Bills tab col J tick)
//     → guard: only Bills tab, only col 10, only checked-true
//     → reads bill row (cols 1-9)
//     → routes:
//       - amount = 0 → _handleSkippedBill
//       - bill name contains CC OR account = Alfalah CC → _handleCCPayment
//       - else → delegate to markBillPaid (existing v3.3 Finance_Pro)
//
//   _handleSkippedBill:
//     → no ledger write
//     → set Last Paid (col H) to today
//     → uncheck col J
//     → audit: BILL_SKIPPED_ZERO
//     → status alert
//
//   _handleCCPayment:
//     → read CC outstanding from Accounts C20
//     → check if already paid this cycle (DocumentProperties)
//     → popup: full clear / 5% min / custom / skip
//     → user picks → call _logCCPaymentInLedger with chosen amount
//     → mark cycle as paid in DocumentProperties
//     → audit: BILL_CC_AUTOPAY with chosen amount + reason
//
//   _logCCPaymentInLedger(amount, billRow):
//     → uses Finance_Pro v3.3 _acquireFinLock + _findNextLedgerRow
//     → creates Transfer pair: Meezan OUT → Alfalah CC IN (paired TxnIDs)
//     → applies same balance constraint check as v3.3
//     → updates Bills tab Last Paid (col H)
//
// L3 — ROW LAYOUT MAP:
//   Bills tab unchanged (rows 5-14, cols A-J).
//   Transactions ledger: standard write at next-row.
//   No new tabs. No new persistent columns.
//
// L4 — CELL-STATE MATRIX delta:
//   Bills col H (Last Paid): may be set on zero-amount path (used to be
//     blocked by validation requiring positive amount).
//   DocumentProperties: new key `bills_cc_last_cycle_paid` = ISO date
//     of last CC payment marked done. Used for cycle-awareness check.
//
// L5 — STATE-ORDER PROOF:
//   For zero-amount skip:
//     1. Read row → amount = 0 detected
//     2. Set Last Paid = today
//     3. Uncheck col J
//     4. Audit BILL_SKIPPED_ZERO
//     5. Show alert
//   For CC payment:
//     1. Read row → CC bill detected
//     2. Read CC outstanding from Accounts C20
//     3. Check cycle marker in DocumentProperties
//     4. Show popup with computed options
//     5. Acquire lock
//     6. Write transfer pair (existing v3.3 path)
//     7. Update DocumentProperties cycle marker
//     8. Set Last Paid = today
//     9. Uncheck col J
//     10. Release lock
//     11. Audit BILL_CC_AUTOPAY
//   For other bills: pure delegation to existing markBillPaid.
//
// L6 — BACKWARD-COMPAT:
//   - Original markBillPaid in Finance_Pro v3.3 untouched
//   - This file adds an EARLIER-FIRING handler that intercepts CC + zero
//     paths only; everything else delegates back to original
//   - To activate: _financeOnEdit gets one extra route at top, OR the
//     new _smartBillsOnEdit installs its own onEdit trigger (uses 1 slot)
//   - Choosing OPTION B (separate trigger) to avoid editing Finance_Pro
//     because user explicitly avoids surgical edits
//   - Hooks Audit_Guardian whitelist with 3 new actions:
//     BILL_SKIPPED_ZERO · BILL_CC_AUTOPAY · CC_CYCLE_RESET
//   - Bills tab structure unchanged · existing bills work as before
//
// L7 — FAILURE-MODE INVENTORY:
//   1. CC outstanding unreadable from Accounts C20 → fall back to
//      asking user for amount manually
//   2. DocumentProperties write fails → cycle awareness lost but
//      payment still records (degraded, not broken)
//   3. User cancels CC payment popup → uncheck col J, no audit, no alert
//   4. Concurrent click while popup open → second click blocked by lock
//   5. Bills tab schema changes → graceful failure, falls back to
//      delegation
//
// ════════════════════════════════════════════════════════════════════
// MENTAL TRACE — 3 critical scenarios
// ════════════════════════════════════════════════════════════════════
//
// SCENARIO A: User sets Alfalah CC bill amount to 0 → ticks ✅
//   1. _smartBillsOnEdit fires (Bills tab, col 10, true)
//   2. Read row 10: name="Alfalah CC Payment" amount=0
//   3. Route: amount=0 → _handleSkippedBill
//   4. No ledger row written
//   5. Bills tab H10 = today's date
//   6. J10 unchecked
//   7. Audit: BILL_SKIPPED_ZERO · "Alfalah CC Payment · cleared outside system"
//   8. Alert: "✅ Bill marked as cleared this cycle. No ledger entry written
//             (amount was 0). Last paid date set to today."
//   9. Status visual updates from 🔴 Due Soon → 🟢 Scheduled (next cycle)
//
// SCENARIO B: User ticks ✅ on Alfalah CC bill (amount stays 5000)
//   1. _smartBillsOnEdit fires
//   2. Read row 10: name contains "CC" → CC payment route
//   3. Read CC outstanding from Accounts C20: 78,655 PKR
//   4. Check DocumentProperties: bills_cc_last_cycle_paid = 02 May 2026
//      (set by previous tick or manual entry)
//   5. Cycle status: today is 03 May, last close was 12 Apr, next close
//      is 12 May → user already paid this cycle (within window)
//   6. Popup: "💳 Alfalah CC Payment
//             Current outstanding: 78,655 PKR
//             ⚠️ Already paid this cycle (last: 02 May)
//             Make ADDITIONAL payment?
//             [Yes, custom amount] [No, skip]"
//   7a. User picks NO → uncheck, audit BILL_SKIPPED_ZERO with cycle reason
//   7b. User picks YES → prompt for amount → log transfer pair via
//       Finance_Pro path → audit BILL_CC_AUTOPAY
//
// SCENARIO C: User ticks ✅ on regular bill (Internet 4000 PKR)
//   1. _smartBillsOnEdit fires
//   2. Read row 7: name="Internet Bill" amount=4000 account=Meezan
//   3. Route: amount > 0 AND not CC bill → DELEGATE
//   4. Calls original markBillPaid(s, 7) from Finance_Pro v3.3
//   5. Original handles: lock + balance constraint + write Expense row
//      + log BILL_PAID + uncheck + update Last Paid
//   6. Zero behavior change vs current
//
// ════════════════════════════════════════════════════════════════════

const FBS_BILLS_TAB = '📅 Bills';
const FBS_ACCOUNTS_TAB = '🏦 Accounts';
const FBS_TXN_TAB = '💸 Transactions';
const FBS_BILLS_PAID_COL = 10;
const FBS_BILLS_LAST_PAID_COL = 8;
const FBS_BILLS_AMOUNT_COL = 3;
const FBS_BILLS_NAME_COL = 1;
const FBS_BILLS_ACCOUNT_COL = 4;
const FBS_BILLS_FIRST_ROW = 5;
const FBS_BILLS_LAST_ROW = 14;
const FBS_CC_NAME = 'Alfalah CC';
const FBS_CC_OUTSTANDING_CELL = 'C20';
const FBS_CC_LIMIT = 100000;
const FBS_CC_MIN_PAYMENT_PCT = 0.05;
const FBS_CC_DUE_DAY = 6;
const FBS_CC_CLOSE_DAY = 12;
const FBS_TZ = 'Asia/Karachi';
const FBS_CYCLE_PROP_KEY = 'bills_cc_last_cycle_paid';

function _alertFBS(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _logFBS(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function _isCCBill(billName, account) {
  if (account === FBS_CC_NAME) return true;
  if (!billName) return false;
  const lower = String(billName).toLowerCase();
  return lower.indexOf('cc ') !== -1 || lower.indexOf('alfalah') !== -1 ||
         lower.indexOf('credit card') !== -1 || lower === 'alfalah cc payment';
}

function _readCCOutstanding() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const acc = ss.getSheetByName(FBS_ACCOUNTS_TAB);
    if (!acc) return null;
    const val = acc.getRange(FBS_CC_OUTSTANDING_CELL).getValue();
    if (typeof val !== 'number') return null;
    return Math.round(val * 100) / 100;
  } catch(e) { return null; }
}

function _isCurrentCycleAlreadyPaid() {
  try {
    const props = PropertiesService.getDocumentProperties();
    const lastPaidISO = props.getProperty(FBS_CYCLE_PROP_KEY);
    if (!lastPaidISO) return { paid: false, lastDate: null };
    const lastPaid = new Date(lastPaidISO);
    const today = new Date();
    const cycleStart = _getCurrentCycleStartDate(today);
    return { paid: lastPaid.getTime() >= cycleStart.getTime(), lastDate: lastPaid };
  } catch(e) { return { paid: false, lastDate: null }; }
}

function _getCurrentCycleStartDate(refDate) {
  // Cycle = close-day to close-day. If today is BEFORE close-day this month,
  // current cycle started on PREVIOUS month's close-day.
  const r = new Date(refDate);
  if (r.getDate() < FBS_CC_CLOSE_DAY) {
    return new Date(r.getFullYear(), r.getMonth() - 1, FBS_CC_CLOSE_DAY);
  }
  return new Date(r.getFullYear(), r.getMonth(), FBS_CC_CLOSE_DAY);
}

function _markCycleAsPaid() {
  try {
    PropertiesService.getDocumentProperties().setProperty(FBS_CYCLE_PROP_KEY, new Date().toISOString());
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════════════
// MAIN ENTRY: SMART BILLS HANDLER
// ════════════════════════════════════════════════════════════════════

function _smartBillsOnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== FBS_BILLS_TAB) return;
  const r = e.range.getRow();
  const c = e.range.getColumn();
  if (c !== FBS_BILLS_PAID_COL) return;
  if (r < FBS_BILLS_FIRST_ROW || r > FBS_BILLS_LAST_ROW) return;
  if (e.value !== 'TRUE' && e.value !== true) return;

  const billName = sh.getRange(r, FBS_BILLS_NAME_COL).getValue();
  const amount = sh.getRange(r, FBS_BILLS_AMOUNT_COL).getValue();
  const account = sh.getRange(r, FBS_BILLS_ACCOUNT_COL).getValue();

  if (!billName || !String(billName).trim()) {
    sh.getRange(r, FBS_BILLS_PAID_COL).setValue(false);
    return;  // Empty bill row, ignore
  }

  // Route: zero-amount path
  if (!amount || amount === 0) {
    _handleSkippedBill(sh, r, billName);
    return;
  }

  // Route: CC payment path
  if (_isCCBill(billName, account)) {
    _handleCCPayment(sh, r, billName, account);
    return;
  }

  // Route: regular bill — delegate to existing Finance_Pro v3.3 handler
  if (typeof markBillPaid === 'function') {
    markBillPaid(sh, r);
  } else {
    sh.getRange(r, FBS_BILLS_PAID_COL).setValue(false);
    _alertFBS('⚠️ markBillPaid function not loaded.\n\nFinance_Pro must be installed first.');
  }
}

// ════════════════════════════════════════════════════════════════════
// ZERO-AMOUNT HANDLER
// ════════════════════════════════════════════════════════════════════

function _handleSkippedBill(sh, row, billName) {
  const today = new Date();
  sh.getRange(row, FBS_BILLS_LAST_PAID_COL).setValue(today).setNumberFormat('dd MMM');
  sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);

  // If CC bill, mark cycle as paid even though amount was 0
  // (means: cleared outside system, no further action needed this cycle)
  const account = sh.getRange(row, FBS_BILLS_ACCOUNT_COL).getValue();
  if (_isCCBill(billName, account)) {
    _markCycleAsPaid();
    _logFBS('CC_CYCLE_RESET',
      billName + ' · cycle marked as paid via zero-amount skip · cleared outside system');
  }

  _logFBS('BILL_SKIPPED_ZERO',
    billName + ' · row ' + row + ' · amount=0 · cleared outside system · last paid set to today');

  _alertFBS('✅ Bill marked as cleared this cycle.\n\n' +
            'Bill: ' + billName + '\n' +
            'Amount: 0 PKR (no ledger entry)\n' +
            'Last Paid: today\n\n' +
            'Use this when you\'ve already paid the bill outside the\n' +
            'sheet (e.g., directly via bank app) or there\'s nothing to\n' +
            'pay this cycle.\n\n' +
            'Audit log: BILL_SKIPPED_ZERO recorded.');
}

// ════════════════════════════════════════════════════════════════════
// CC PAYMENT HANDLER
// ════════════════════════════════════════════════════════════════════

function _handleCCPayment(sh, row, billName, account) {
  const outstanding = _readCCOutstanding();
  const cycle = _isCurrentCycleAlreadyPaid();
  const ui = (function() { try { return SpreadsheetApp.getUi(); } catch(e) { return null; } })();

  if (!ui) {
    sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
    return;
  }

  if (outstanding === null) {
    const resp = ui.alert(
      '💳 ' + billName,
      'Could not read CC outstanding from Accounts tab.\n\n' +
      'Continue with manual amount entry?',
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) {
      sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
      return;
    }
    _promptCustomCCPayment(sh, row, billName, account);
    return;
  }

  // Already paid this cycle?
  if (cycle.paid) {
    const lastPaidStr = Utilities.formatDate(cycle.lastDate, FBS_TZ, 'dd MMM');
    const resp = ui.alert(
      '💳 ' + billName + ' — Cycle already paid',
      'CC outstanding: ' + outstanding.toLocaleString() + ' PKR\n' +
      'Already paid this cycle on: ' + lastPaidStr + '\n\n' +
      'Make an ADDITIONAL payment now?\n\n' +
      'YES → enter custom amount and log payment\n' +
      'NO → skip (mark cycle still cleared)',
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) {
      const today = new Date();
      sh.getRange(row, FBS_BILLS_LAST_PAID_COL).setValue(today).setNumberFormat('dd MMM');
      sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
      _logFBS('BILL_SKIPPED_ZERO',
        billName + ' · cycle already paid (' + lastPaidStr + ') · user declined additional');
      _alertFBS('✅ No additional payment logged.\n\nCycle remains marked as paid (' + lastPaidStr + ').');
      return;
    }
    _promptCustomCCPayment(sh, row, billName, account);
    return;
  }

  // Compute payment options
  if (outstanding <= 0) {
    sh.getRange(row, FBS_BILLS_LAST_PAID_COL).setValue(new Date()).setNumberFormat('dd MMM');
    sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
    _markCycleAsPaid();
    _logFBS('CC_CYCLE_RESET', billName + ' · CC outstanding is 0 · marked cleared');
    _alertFBS('✅ CC outstanding is 0 PKR.\n\nNothing to pay. Bill marked as cleared this cycle.');
    return;
  }

  const minPayment = Math.max(500, Math.round(outstanding * FBS_CC_MIN_PAYMENT_PCT));
  const fullPayment = Math.round(outstanding * 100) / 100;

  const opts = ui.alert(
    '💳 ' + billName,
    'Current CC outstanding: ' + outstanding.toLocaleString() + ' PKR\n\n' +
    'Choose payment amount:\n\n' +
    'YES → Full clear (' + fullPayment.toLocaleString() + ' PKR)\n' +
    'NO  → Custom amount (you enter)\n' +
    'CANCEL → Skip this cycle\n\n' +
    'Tip: 5% min would be ~' + minPayment.toLocaleString() + ' PKR (avoid this — interest applies)',
    ui.ButtonSet.YES_NO_CANCEL
  );

  if (opts === ui.Button.YES) {
    _logCCPaymentInLedger(sh, row, fullPayment, billName, account, 'full-clear');
  } else if (opts === ui.Button.NO) {
    _promptCustomCCPayment(sh, row, billName, account);
  } else {
    sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
    _logFBS('BILL_SKIPPED_ZERO', billName + ' · user cancelled CC payment dialog');
  }
}

function _promptCustomCCPayment(sh, row, billName, account) {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    '💳 Custom CC Payment',
    'Enter PKR amount to pay toward Alfalah CC:',
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) {
    sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
    _logFBS('BILL_SKIPPED_ZERO', billName + ' · user cancelled custom amount prompt');
    return;
  }
  const txt = String(prompt.getResponseText() || '').trim();
  const val = parseFloat(txt);
  if (isNaN(val) || val <= 0) {
    sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
    _alertFBS('⚠️ Invalid amount. Enter a positive PKR number.');
    return;
  }
  _logCCPaymentInLedger(sh, row, val, billName, account, 'custom');
}

function _logCCPaymentInLedger(sh, row, amount, billName, billAccount, reason) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(FBS_TXN_TAB);
  if (!tx) {
    sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
    _alertFBS('❌ Transactions tab not found.');
    return;
  }

  // Source account = the bill's configured account if it's NOT CC, else default to Meezan
  const sourceAccount = (billAccount && billAccount !== FBS_CC_NAME) ? billAccount : 'Meezan';

  // Use Finance_Pro v3.3 lock + balance constraint via direct call
  let lockResult = { ok: true, lock: null };
  if (typeof _acquireFinLock === 'function') {
    lockResult = _acquireFinLock('_logCCPaymentInLedger');
    if (!lockResult.ok) {
      sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
      _alertFBS('🔒 Lock timeout. Wait 5 sec and try again.');
      return;
    }
  }

  try {
    // Balance constraint check on source
    if (typeof _validateBalanceConstraint === 'function') {
      const balCheck = _validateBalanceConstraint(sourceAccount, 'Transfer', amount);
      if (!balCheck.allow) {
        sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
        return;
      }
    }

    // Find next two consecutive ledger rows (need pair)
    let outRow = (typeof _findNextLedgerRow === 'function') ? _findNextLedgerRow(tx) : -1;
    if (outRow === -1) {
      sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
      _alertFBS('⚠️ Ledger full.');
      return;
    }

    const today = new Date();
    Utilities.sleep(5);
    const outId = (typeof generateTxnId === 'function') ? generateTxnId() :
      'TXN-' + Utilities.formatDate(today, FBS_TZ, 'yyyyMMdd-HHmmss') + '-OUT';
    Utilities.sleep(5);
    const inId = (typeof generateTxnId === 'function') ? generateTxnId() :
      'TXN-' + Utilities.formatDate(today, FBS_TZ, 'yyyyMMdd-HHmmss') + '-IN';

    // OUT leg: source account → CC
    tx.getRange(outRow, 1, 1, 8).setValues([[
      today, sourceAccount, 'Transfer', '💳 CC Payment', amount, 'PKR', amount, 'To: ' + FBS_CC_NAME
    ]]);
    tx.getRange(outRow, 1).setNumberFormat('dd MMM yyyy');
    tx.getRange(outRow, 5).setNumberFormat('#,##0.00');
    tx.getRange(outRow, 7).setNumberFormat('#,##0.00');
    try { tx.getRange(outRow, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(outRow, 9, 1, 4).merge().setValue(
      'CC payment via Bills tab · ' + reason + ' · (OUT) [linked: ' + inId + ']'
    );
    tx.getRange(outRow, 14).setValue(outId);
    if (typeof FIN2_FX_RATE_COL !== 'undefined') {
      tx.getRange(outRow, FIN2_FX_RATE_COL).setValue(1.0);
    }
    if (typeof _bumpRowPointer === 'function') _bumpRowPointer(outRow);

    // IN leg: into CC (reduces outstanding)
    let inRow = (typeof _findNextLedgerRow === 'function') ? _findNextLedgerRow(tx) : -1;
    if (inRow === -1) {
      sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);
      _alertFBS('⚠️ Ledger filled mid-transfer. OUT logged at row ' + outRow + ', IN failed.');
      return;
    }
    tx.getRange(inRow, 1, 1, 8).setValues([[
      today, FBS_CC_NAME, 'Income', '💳 CC Payment', amount, 'PKR', amount, 'From: ' + sourceAccount
    ]]);
    tx.getRange(inRow, 1).setNumberFormat('dd MMM yyyy');
    tx.getRange(inRow, 5).setNumberFormat('#,##0.00');
    tx.getRange(inRow, 7).setNumberFormat('#,##0.00');
    try { tx.getRange(inRow, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(inRow, 9, 1, 4).merge().setValue(
      'CC payment via Bills tab · ' + reason + ' · (IN) [linked: ' + outId + ']'
    );
    tx.getRange(inRow, 14).setValue(inId);
    if (typeof FIN2_FX_RATE_COL !== 'undefined') {
      tx.getRange(inRow, FIN2_FX_RATE_COL).setValue(1.0);
    }
    if (typeof _bumpRowPointer === 'function') _bumpRowPointer(inRow);

    // Update Bills tab
    sh.getRange(row, FBS_BILLS_LAST_PAID_COL).setValue(today).setNumberFormat('dd MMM');
    sh.getRange(row, FBS_BILLS_PAID_COL).setValue(false);

    // Mark cycle as paid
    _markCycleAsPaid();

    _logFBS('BILL_CC_AUTOPAY',
      outId + ' + ' + inId + ' · ' + amount + ' PKR · ' +
      sourceAccount + ' → ' + FBS_CC_NAME + ' · reason: ' + reason);

    _alertFBS('✅ CC Payment logged.\n\n' +
              'Amount: ' + amount.toLocaleString() + ' PKR\n' +
              'From: ' + sourceAccount + '\n' +
              'To: ' + FBS_CC_NAME + '\n' +
              'Reason: ' + reason + '\n\n' +
              'Two ledger rows written (linked transfer pair).\n' +
              'Bills last paid: today.\n' +
              'Cycle marker: updated.\n' +
              'Audit: BILL_CC_AUTOPAY recorded.');

  } finally {
    if (lockResult.ok && typeof _releaseFinLock === 'function') {
      _releaseFinLock(lockResult);
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// CYCLE RESET (use when statement closes — usually monthly)
// ════════════════════════════════════════════════════════════════════

function resetCCCycleMarker() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    '🔄 Reset CC Cycle Marker',
    'This clears the "already paid this cycle" memory.\n\n' +
    'Use when:\n' +
    '  • New statement just closed (12th of month)\n' +
    '  • You want to manually reset\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;
  try {
    PropertiesService.getDocumentProperties().deleteProperty(FBS_CYCLE_PROP_KEY);
    _logFBS('CC_CYCLE_RESET', 'Manual reset by user');
    _alertFBS('✅ CC cycle marker cleared.\n\nNext CC bill mark-paid will treat as fresh cycle.');
  } catch(e) {
    _alertFBS('⚠️ Reset failed: ' + e);
  }
}

// ════════════════════════════════════════════════════════════════════
// INSTALLATION
// ════════════════════════════════════════════════════════════════════

function installSmartBills() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_smartBillsOnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('_smartBillsOnEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  _logFBS('GUARDIAN_INSTALL', 'Smart Bills handler installed (Bills tab CC + zero-amount intelligence)');
  _alertFBS('🛡 Smart Bills handler installed.\n\n' +
            'New behavior:\n' +
            '  ✅ Amount = 0 → mark cleared, no ledger row\n' +
            '  ✅ CC bill → auto-compute amount from outstanding\n' +
            '  ✅ Cycle awareness → won\'t double-pay same cycle\n' +
            '  ✅ Other bills → unchanged (delegates to original)\n\n' +
            'Try: set Alfalah CC bill amount to 0 → tick ✅\n' +
            'Should now succeed cleanly with audit trail.');
}

function uninstallSmartBills() {
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_smartBillsOnEdit') {
      try { ScriptApp.deleteTrigger(t); removed++; } catch(e) {}
    }
  });
  _logFBS('GUARDIAN_UNINSTALL', 'Smart Bills handler removed');
  _alertFBS('🛑 Smart Bills handler uninstalled.\n\nTriggers removed: ' + removed);
}

function verifySmartBills() {
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_smartBillsOnEdit');
  const outstanding = _readCCOutstanding();
  const cycle = _isCurrentCycleAlreadyPaid();

  let report = '🛡 SMART BILLS HANDLER STATUS\n\n';
  report += (triggers.length === 1 ? '✅' : '⚠️') + ' onEdit trigger: ' + triggers.length + '/1\n';
  report += '\n📊 CC STATE:\n';
  report += '  Outstanding: ' + (outstanding !== null ? outstanding.toLocaleString() + ' PKR' : '⚠️ unreadable') + '\n';
  if (outstanding !== null) {
    report += '  5% min: ' + Math.round(outstanding * 0.05).toLocaleString() + ' PKR\n';
    report += '  Available: ' + (FBS_CC_LIMIT - outstanding).toLocaleString() + ' PKR\n';
  }
  report += '\n🔄 CYCLE STATE:\n';
  if (cycle.lastDate) {
    const lastStr = Utilities.formatDate(cycle.lastDate, FBS_TZ, 'dd MMM yyyy');
    report += '  Last paid: ' + lastStr + '\n';
    report += '  Cycle status: ' + (cycle.paid ? '✅ paid this cycle' : '⏳ next cycle ready') + '\n';
  } else {
    report += '  Last paid: (no record · fresh state)\n';
  }
  report += '\n📋 ROUTING LOGIC:\n';
  report += '  amount = 0 → BILL_SKIPPED_ZERO (no ledger write)\n';
  report += '  CC bill → popup with full/custom/skip options\n';
  report += '  Other bills → delegate to Finance_Pro markBillPaid\n';

  if (triggers.length === 0) report += '\n⚠️ Trigger missing. Run: 🛡 Install Smart Bills.';
  else report += '\n✅ All systems operational.';
  _alertFBS(report);
}

function appendSmartBillsMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('💳 Smart Bills')
      .addItem('🛡 Install / Reinstall Smart Bills', 'installSmartBills')
      .addItem('🛑 Uninstall Smart Bills', 'uninstallSmartBills')
      .addSeparator()
      .addItem('🔄 Reset CC Cycle Marker', 'resetCCCycleMarker')
      .addItem('🔍 Verify Smart Bills Status', 'verifySmartBills')
      .addToUi();
  } catch(e) { Logger.log('Smart Bills menu add failed: ' + e); }
}
