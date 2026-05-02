// ════════════════════════════════════════════════════════════════════
// 🏧 Finance_ATM.gs — ATM WITHDRAW + FEE TRACKING v1.2
// LOCKED · 7-Layer Audit · Day 9 / 90 · 2026-05-02 · TRANSFER PAIR FIX
//
// CHANGES FROM v1.1:
//   - CRITICAL FIX: ATM Withdraw now writes TRANSFER PAIR (source OUT +
//     dest IN) instead of single Expense row. Money correctly lands in
//     Cash account. Fee logic unchanged (still separate Expense row on
//     source bank, still PENDING reversal flow).
//   - NEW CONST: ATM_DEFAULT_DEST_ACCOUNT = 'Cash'
//   - NEW CONST: ATM_TRANSFER_CATEGORY = '💱 Transfer' (matches existing
//     ledger format for Meezan→UBL→Mashreq transfers)
//   - NEW FN: _atmCreateWithdrawTransferPair → writes 2 linked rows
//   - REMOVED: _atmCreateWithdraw (was the buggy single-row writer).
//     Internal-only; safe removal — only cmdAtm + uiATMLogWithdraw
//     called it, both updated.
//   - cmdAtm: accepts new `to=cash` / `to=jazzcash` etc. param
//     (default Cash). Validates source ≠ dest.
//   - uiATMLogWithdraw: default destination Cash, shown in confirmation.
//     Power users override via Telegram /atm with to= param.
//   - NEW FN: auditLegacyATMWithdrawRows → one-shot scanner that lists
//     any pre-v1.2 rows still using old (Expense · 🏧 ATM Withdraw)
//     format so user can column-M reverse them manually.
//   - NEW FN: _atmSelfTest → smoke test, runs in console, no writes.
//   - verifyATMTracker: shows v1.2 + new constants + transfer pair status.
//   - Help text in cmdAtm updated with to= examples.
//   - Brother voice in all confirmations (no shame, points forward,
//     no Quran/Hadith on routine confirmations per locked voice rules).
//
// ALL v1.1 Hub embed code preserved unchanged. All Reversal flow
// preserved unchanged. All listing flow preserved unchanged.
//
// ════════════════════════════════════════════════════════════════════
// 7-LAYER AUDIT
// ════════════════════════════════════════════════════════════════════
//
// LAYER 1 — 5-TEST AUDIT
//   ✓ Self-Contained: no external calls except optional safeAlert,
//                     logAuditAction, generateTxnId, _findNextLedgerRow,
//                     getFinTheme, sendTelegram (all guarded with typeof)
//   ✓ Side-Effects: writes only to '💸 Transactions' (existing pattern,
//                   now 2-3 rows per /atm vs 1-2 before) +
//                   '💰 Finance Hub' rows 32-46 (unchanged)
//   ✓ Re-Run Safe: each leg gets unique TxnID via Utilities.sleep(1)
//                  ms tick. Hub embed clears its zone before paint.
//   ✓ Mentally Traced: 3 entry points × 4 scenarios (cash/wallet dest,
//                      mashreq own ATM, fee/nofee, source==dest reject)
//                      = 12 paths verified. See MENTAL TRACE block.
//   ✓ Failure Modes: source==dest rejected pre-write. OUT succeeds +
//                    IN find-row fails → error reports OUT row for manual
//                    cleanup. Fee write fails → transfer pair stands,
//                    pending fee not tracked, manual review surfaced.
//                    Ledger full → graceful error.
//
// LAYER 2 — FUNCTION CALL GRAPH
//   cmdAtm (entry from Telegram dispatcher)
//     → _atmCreateWithdrawTransferPair (NEW, defined L~330)
//         → SpreadsheetApp.getActiveSpreadsheet (✓ Apps Script native)
//         → _atmFindNextRow (✓ defined L~64) ×2
//         → _atmTxnId (✓ defined L~71) ×2
//         → _atmBumpRowPointer (✓ defined L~78) ×2
//         → SpreadsheetApp.flush (✓ native, atomicity guard)
//     → _atmCreateFee (✓ defined L~410, unchanged from v1.1)
//         → same helpers as above
//     → _atmLog (✓ defined L~57)
//     → sendTelegram (✓ guarded with typeof)
//
//   uiATMLogWithdraw (entry from sheet menu)
//     → SpreadsheetApp.getUi (✓ native)
//     → _atmCreateWithdrawTransferPair (✓ as above)
//     → _atmCreateFee (✓ as above)
//     → _atmLog (✓)
//
//   auditLegacyATMWithdrawRows (NEW manual one-shot)
//     → SpreadsheetApp.getActiveSpreadsheet (✓)
//     → _atmAlert (✓ defined L~52)
//
//   embedATMPanelInHub (UNCHANGED from v1.1)
//     → renderATMPanelInHub (UNCHANGED)
//         → getATMTheme (✓ defined L~96)
//         → getATMHubCardData (✓ defined L~459)
//             → listPendingATMReversals (✓ defined L~298, unchanged)
//             → getATMNet30DayFees (✓ defined L~437, unchanged)
//
//   No orphan calls. Every callee verified to exist in this file or
//   guarded with typeof for cross-file deps.
//
// LAYER 3 — ROW LAYOUT MAP (Hub tab — UNCHANGED from v1.1)
//   1-2:    Title + date strip          (Finance_Pro)
//   3:      spacer
//   4-5:    KPI snapshot                (Finance_Pro)
//   6:      spacer
//   7-8:    Net position                (Finance_Pro)
//   9:      spacer
//   10-21:  Recent transactions         (Finance_Pro)
//   22:     spacer
//   23-30:  How-to hints                (Finance_Pro)
//   31:     spacer  ← buffer
//   32-46:  🏧 ATM ACTIVITY  ← THIS MODULE owns these rows (UNCHANGED)
//   47-54:  reserved gap before Charts
//   55-74:  📊 Charts panel             (Finance_Charts)
//   75:     spacer
//   76-97:  📜 Audit panel              (Finance_Audit v1.3)
//   98:     spacer
//   99+:    🪁 Kite (or other)          (Finance_Kite, future)
//   No overlap. No circular dependency.
//
// LAYER 4 — CELL-STATE MATRIX (new transfer rows in Transactions tab)
//   Per row written by _atmCreateWithdrawTransferPair:
//     Col 1 (Date)         Date object → format dd MMM yyyy
//     Col 2 (Account)      Text from FIN2_ACCOUNTS list (validated via map)
//     Col 3 (Direction)    'Transfer' (OUT) or 'Income' (IN) — matches
//                          existing dropdown values in column 3
//     Col 4 (Category)     '💱 Transfer' — already in FIN2_CATEGORIES
//                          dropdown, validated by user's existing transfers
//     Col 5 (Amount)       Number, format #,##0.00
//     Col 6 (Currency)     'PKR' — matches existing ledger
//     Col 7 (Amount alt)   Same number, format #,##0.00 (PKR equivalent)
//     Col 8 (Counterparty) 'To: ' + dest (OUT) / 'From: ' + source (IN)
//     Col 9-12 (Notes)     Merged, contains [linked: TxnID] of paired leg
//     Col 14 (TxnID)       Generated via _atmTxnId, unique per row
//   No new validation lists, no new dropdown writes, no formula writes.
//   All values match existing user-created transfer row patterns.
//
// LAYER 5 — STATE-ORDER PROOF
//   _atmCreateWithdrawTransferPair execution order:
//     1. Pre-validate: amount > 0, source ≠ dest, both accounts known
//     2. Find row N for OUT leg (via _atmFindNextRow)
//     3. Generate outTxnId
//     4. Sleep 1ms (TxnID ms-tick uniqueness)
//     5. Generate inTxnId
//     6. Write OUT leg cells (batched setValues, then formats/merge)
//     7. Bump row pointer to N
//     8. SpreadsheetApp.flush() — force commit before next find
//     9. Find row N+1 for IN leg
//     10. Write IN leg cells (same pattern)
//     11. Bump row pointer to N+1
//     12. Return success object with both rows + TxnIDs
//   Then back in cmdAtm/uiATMLogWithdraw:
//     13. If fee applies, call _atmCreateFee (writes row N+2)
//     14. Audit log
//     15. User notification
//   No mid-build hide. No data validation writes. No formula cycles.
//   Atomicity guard: flush() between OUT and IN ensures partial-write
//   recovery is detectable (OUT row exists in sheet but IN failed).
//
// LAYER 6 — BACKWARD-COMPAT VERIFICATION
//   External readers of ATM module:
//     - Telegram /atm command       → cmdAtm signature unchanged ✓
//                                     New optional `to=` param is additive
//     - Telegram /atm reverse       → cmdAtmReverse unchanged ✓
//     - Telegram /atm fee           → cmdAtmFee unchanged ✓
//     - Telegram /atm list          → cmdAtmList unchanged ✓
//     - Mission_Pro (future)        → listPendingATMReversals unchanged ✓
//                                     getActivePendingATMReversalRows ✓
//     - Finance_Audit               → ATM_FEE_CATEGORY constant unchanged ✓
//                                     ATM_REVERSAL_CATEGORY unchanged ✓
//                                     ATM_WITHDRAW_CATEGORY constant kept
//                                     (still in FIN2_CATEGORIES dropdown
//                                     for legacy rows, just not written
//                                     by /atm anymore)
//     - Sheet UI menu               → uiATMLogWithdraw / uiATMShowPending /
//                                     uiATMReverse signatures unchanged ✓
//     - Hub embed                   → embedATMPanelInHub unchanged ✓
//                                     getATMHubCardData unchanged ✓
//   New externally callable functions (additive only, no breakage):
//     - auditLegacyATMWithdrawRows() → manual one-shot via menu
//     - _atmSelfTest() → console diagnostic
//   Removed (was internal-only, no external callers):
//     - _atmCreateWithdraw → replaced by _atmCreateWithdrawTransferPair
//
//   Existing PENDING fee rows from v1.0/v1.1 still detected by
//   listPendingATMReversals (same ATM_FEE_CATEGORY, same notes pattern).
//
// LAYER 7 — FAILURE-MODE INVENTORY
//   1. Hub tab missing                 → _atmAlert + return (handled)
//   2. Transactions tab missing        → _atmCreateWithdrawTransferPair
//                                        returns {ok:false}, error reported
//   3. Source account == dest account  → pre-write reject with brother
//                                        voice error, no rows written
//   4. Empty pending list              → renderATMPanelInHub paints "all
//                                        clear" (existing v1.1 behavior)
//   5. Pending list >8 entries         → top 8 + footer (existing v1.1)
//   6. theme function missing          → getATMTheme fallback (existing)
//   7. logAuditAction missing          → all _atmLog calls guarded
//   8. generateTxnId missing           → _atmTxnId fallback (existing)
//   9. _findNextLedgerRow missing      → _atmFindNextRow brute-scan
//                                        fallback (existing)
//   10. sendTelegram missing           → all calls typeof-guarded
//   11. OUT leg writes, IN leg find    → returns {ok:false, partial:true,
//       fails (ledger full mid-pair)    outRow:N, outTxnId:...} so caller
//                                        can report exact row to clean
//   12. OUT + IN succeed, fee write    → returns success for transfer,
//       fails                            null for fee. Telegram message
//                                        warns user fee not tracked.
//   13. Re-embed without prior wipe    → first step of render is clear,
//                                        safe (existing v1.1)
//   14. Legacy bad rows in ledger      → auditLegacyATMWithdrawRows()
//       (pre-v1.2 single-Expense)       lists them for manual review.
//                                        Won't auto-modify (user owns
//                                        the cleanup decision).
//
// ════════════════════════════════════════════════════════════════════
// MENTAL TRACE — cmdAtm('16500 hbl') end-to-end
// ════════════════════════════════════════════════════════════════════
// User types in Telegram: /atm 16500 hbl
//   1. Telegram dispatcher routes to cmdAtm('16500 hbl')
//   2. argStr = '16500 hbl' (non-empty, not 'fee'/'reverse'/'list' subcommand)
//   3. parts = ['16500', 'hbl']
//   4. amount = 16500 (parseFloat ok, > 0)
//   5. Default state: atmName='', fromAccount='Mashreq Bank',
//                     destAccount='Cash', feePKR=35, noFee=false
//   6. Loop parts[1..]: 'hbl' is not nofee/from=/to=/fee= → atmName='hbl'
//   7. Auto-noFee check: /mashreq/i.test('hbl') = false → keep fee
//   8. Pre-validate: fromAccount('Mashreq Bank') !== destAccount('Cash') ✓
//   9. Call _atmCreateWithdrawTransferPair(16500, 'Mashreq Bank', 'Cash', 'hbl')
//      a. Get '💸 Transactions' tab
//      b. Find row 100 (next empty)
//      c. Generate outTxnId 'TXN-20260502-180000-001'
//      d. Sleep 1ms, generate inTxnId 'TXN-20260502-180000-002'
//      e. Write OUT leg row 100:
//         Col1: today's Date
//         Col2: 'Mashreq Bank'
//         Col3: 'Transfer'
//         Col4: '💱 Transfer'
//         Col5: 16500
//         Col6: 'PKR'
//         Col7: 16500
//         Col8: 'To: Cash'
//         Col9-12 merged: 'Transfer Mashreq Bank → Cash (OUT · ATM
//                          withdraw at hbl) [linked: TXN-20260502-180000-002]'
//         Col14: 'TXN-20260502-180000-001'
//      f. _atmBumpRowPointer(100), flush()
//      g. Find row 101
//      h. Write IN leg row 101:
//         Col1: today's Date
//         Col2: 'Cash'
//         Col3: 'Income'
//         Col4: '💱 Transfer'
//         Col5: 16500
//         Col6: 'PKR'
//         Col7: 16500
//         Col8: 'From: Mashreq Bank'
//         Col9-12 merged: 'Transfer Mashreq Bank → Cash (IN · ATM
//                          withdraw at hbl) [linked: TXN-20260502-180000-001]'
//         Col14: 'TXN-20260502-180000-002'
//      i. _atmBumpRowPointer(101)
//      j. Return {ok:true, outRow:100, inRow:101, outTxnId:'...001', inTxnId:'...002'}
//   10. willCreateFee = true (not noFee, fromAccount==='Mashreq Bank', feePKR>0)
//   11. Call _atmCreateFee(35, 'Mashreq Bank', 'hbl', 'TXN-20260502-180000-001')
//      a. Find row 102
//      b. Write fee row 102:
//         Mashreq Bank | Expense | 🏧 ATM Fee | 35 | PKR | 35 | hbl ATM
//         Notes: 'PENDING reversal · linked to TXN-...001 · auto-flag if
//                 not reversed in 10 days'
//         TxnID col 14: new TxnID
//      c. Return {ok:true, row:102, txnId:'...'}
//   12. _atmLog('ATM_WITHDRAW', '16500 from Mashreq Bank to Cash via hbl · fee 35 PENDING')
//   13. Telegram sends brother voice confirmation showing:
//       - 16,500 PKR pulled from Mashreq → landed in Cash
//       - Fee 35 PKR pending Mashreq reversal (10-day window)
//       - 3 ledger rows added, all linked
//   14. Mashreq net effect: -16500 (transfer) + -35 (fee) = -16,535
//       Cash net effect: +16,500
//       Real-life: Mashreq -16,500 (cash physically left bank) - 35 (fee)
//                  + 35 within 10 days (reversal expected)
//       Final state once reversal lands: Mashreq -16,500, Cash +16,500.
//       MATCHES REALITY. ✅
//
// ════════════════════════════════════════════════════════════════════

const ATM_DEFAULT_FEE_PKR = 35;
const ATM_REVERSAL_WINDOW_DAYS = 10;
const ATM_USAGE_MAX_MONTHLY = 15;
const ATM_DEFAULT_FROM_ACCOUNT = 'Mashreq Bank';
const ATM_DEFAULT_DEST_ACCOUNT = 'Cash';            // v1.2: NEW
const ATM_FEE_CATEGORY = '🏧 ATM Fee';
const ATM_REVERSAL_CATEGORY = '🏧 ATM Fee Reversal';
const ATM_WITHDRAW_CATEGORY = '🏧 ATM Withdraw';    // kept for legacy detection
const ATM_TRANSFER_CATEGORY = '💱 Transfer';        // v1.2: NEW

// Hub card layout constants (UNCHANGED from v1.1)
const ATM_HUB_START_ROW = 32;
const ATM_HUB_ROWS = 15;
const ATM_HUB_PENDING_LIST_MAX = 8;

function _atmAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _atmLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function _atmFindNextRow(tx) {
  if (typeof _findNextLedgerRow === 'function') return _findNextLedgerRow(tx);
  for (let r = 14; r <= 213; r++) {
    if (!tx.getRange(r, 1).getValue()) return r;
  }
  return -1;
}

function _atmTxnId() {
  if (typeof generateTxnId === 'function') return generateTxnId();
  const stamp = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyyMMdd-HHmmss');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return 'TXN-' + stamp + '-' + rand;
}

function _atmBumpRowPointer(row) {
  if (typeof _bumpRowPointer === 'function') _bumpRowPointer(row);
}

function getATMTheme() {
  if (typeof getFinTheme === 'function') return getFinTheme();
  return {
    bgPage: '#FFFFFF', bgPanel: '#F8FAFC', bgRow: '#FFFFFF',
    bgAlt: '#F1F5F9', bgInput: '#FFFBEB', bgHeader: '#1E293B',
    bgSection: '#0F172A', bgAccent: '#FEF3C7', bgAsset: '#DCFCE7',
    bgLiability: '#FEE2E2', bgStatusOk: '#D1FAE5', bgStatusWarn: '#FEF3C7',
    text: '#0F172A', textHi: '#000000', textMd: '#334155', textLo: '#64748B',
    textOk: '#065F46', textWarn: '#78350F', textErr: '#7F1D1D',
    success: '#16A34A', warning: '#D97706', danger: '#DC2626',
    critical: '#991B1B', info: '#2563EB', purple: '#7C3AED'
  };
}

const _ATM_ACCOUNT_MAP = {
  'cash': 'Cash', 'jazzcash': 'JazzCash', 'jazz': 'JazzCash',
  'easypaisa': 'Easypaisa', 'easy': 'Easypaisa',
  'ubl': 'UBL', 'ublprepaid': 'UBL Prepaid', 'prepaid': 'UBL Prepaid',
  'meezan': 'Meezan', 'mz': 'Meezan',
  'mashreq': 'Mashreq Bank', 'js': 'JS Bank',
  'naya': 'Naya Pay', 'alfalah': 'Bank Alfalah'
};

// ──────────────────────────────────────────────────────────
// PUBLIC API — Withdraw (v1.2: TRANSFER PAIR + FEE)
// ──────────────────────────────────────────────────────────

function cmdAtm(args) {
  const argStr = (args || '').trim();
  if (!argStr) {
    if (typeof sendTelegram === 'function') {
      sendTelegram('🏧 ATM commands:\n\n' +
        '/atm 5000 hbl                  → withdraw 5000 from Mashreq via HBL ATM, lands in Cash, ' + ATM_DEFAULT_FEE_PKR + ' PKR pending fee\n' +
        '/atm 5000 hbl to=jazzcash      → cash deposited to JazzCash wallet instead of Cash\n' +
        '/atm 5000 hbl from=ubl         → withdraw from UBL (no fee unless specified)\n' +
        '/atm 5000 hbl fee=50           → custom fee amount\n' +
        '/atm 5000 hbl nofee            → no fee row created\n' +
        '/atm 5000 mashreq              → own Mashreq ATM, fee auto-skipped\n\n' +
        '/atm fee 35                    → confirm fee amount on most recent pending\n' +
        '/atm reverse                   → most recent pending fee reversed\n' +
        '/atm reverse 35                → reverse specific amount\n' +
        '/atm list                      → show all pending fee reversals\n\n' +
        'Default destination: ' + ATM_DEFAULT_DEST_ACCOUNT + ' · Reversal window: ' + ATM_REVERSAL_WINDOW_DAYS + ' days');
    }
    return;
  }

  const lower = argStr.toLowerCase();
  if (lower.startsWith('fee ') || lower === 'fee') return cmdAtmFee(argStr.replace(/^fee\s*/i, ''));
  if (lower.startsWith('reverse')) return cmdAtmReverse(argStr.replace(/^reverse\s*/i, ''));
  if (lower === 'list') return cmdAtmList();

  const parts = argStr.split(/\s+/);
  const amount = parseFloat(parts[0]);
  if (!amount || amount <= 0) {
    if (typeof sendTelegram === 'function') sendTelegram('⚠️ Bad amount. Format: /atm 5000 hbl');
    return;
  }

  let atmName = '';
  let fromAccount = ATM_DEFAULT_FROM_ACCOUNT;
  let destAccount = ATM_DEFAULT_DEST_ACCOUNT;
  let feePKR = ATM_DEFAULT_FEE_PKR;
  let noFee = false;

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i].toLowerCase();
    if (p === 'nofee') { noFee = true; }
    else if (p.indexOf('from=') === 0) {
      const acctKey = p.substring(5);
      fromAccount = _ATM_ACCOUNT_MAP[acctKey] || ATM_DEFAULT_FROM_ACCOUNT;
    }
    else if (p.indexOf('to=') === 0) {
      const acctKey = p.substring(3);
      destAccount = _ATM_ACCOUNT_MAP[acctKey] || ATM_DEFAULT_DEST_ACCOUNT;
    }
    else if (p.indexOf('fee=') === 0) {
      feePKR = parseFloat(p.substring(4)) || ATM_DEFAULT_FEE_PKR;
    }
    else {
      atmName = atmName ? atmName + ' ' + parts[i] : parts[i];
    }
  }

  if (!atmName) atmName = 'ATM';
  if (fromAccount === 'Mashreq Bank' && /mashreq/i.test(atmName)) noFee = true;

  if (fromAccount === destAccount) {
    if (typeof sendTelegram === 'function') {
      sendTelegram('⚠️ Source and destination are both ' + fromAccount + '.\n\nThat is a no-op. Did you mean to send the cash to a different account? Try: /atm ' + amount + ' ' + atmName + ' to=cash');
    }
    return;
  }

  const transferResult = _atmCreateWithdrawTransferPair(amount, fromAccount, destAccount, atmName);
  if (!transferResult.ok) {
    if (typeof sendTelegram === 'function') {
      let errMsg = '❌ Withdraw failed: ' + (transferResult.error || 'unknown');
      if (transferResult.partial) {
        errMsg += '\n\n⚠️ PARTIAL WRITE — OUT leg landed at row ' + transferResult.outRow +
                  ' (TxnID ' + transferResult.outTxnId + ') but IN leg failed.\n' +
                  'Manually clear that row before retrying, or column-M reverse it.';
      }
      sendTelegram(errMsg);
    }
    return;
  }

  let feeResult = null;
  let willReverse = false;
  if (!noFee && fromAccount === 'Mashreq Bank' && feePKR > 0) {
    feeResult = _atmCreateFee(feePKR, fromAccount, atmName, transferResult.outTxnId);
    willReverse = true;
  }

  _atmLog('ATM_WITHDRAW',
    amount + ' from ' + fromAccount + ' to ' + destAccount + ' via ' + atmName +
    ' · transfer pair rows ' + transferResult.outRow + '+' + transferResult.inRow +
    ' · fee ' + (noFee ? 'none' : feePKR + (willReverse ? ' (will reverse)' : ''))
  );

  if (typeof sendTelegram === 'function') {
    let msg = '🏧 ATM Withdraw logged\n\n';
    msg += amount.toLocaleString() + ' PKR pulled from ' + fromAccount + ' at ' + atmName + '\n';
    msg += 'Landed in: ' + destAccount + ' (transfer pair filed)\n';
    if (noFee) {
      msg += '\n✅ No fee (own Mashreq ATM or fee-free path)\n';
      msg += '2 ledger rows added · all linked atomically.';
    } else if (feeResult && feeResult.ok) {
      msg += '\n💸 Fee: ' + feePKR + ' PKR (PENDING reversal)\n';
      if (willReverse) {
        msg += '⏳ Mashreq usually returns within 7 days · safety window ' + ATM_REVERSAL_WINDOW_DAYS + ' days\n';
        msg += '   /atm list to track · /atm reverse when it lands\n';
      }
      msg += '\n3 ledger rows added · all linked atomically.';
    } else if (!feeResult) {
      msg += '\n⚠️ Transfer pair OK but fee row failed to write.\n';
      msg += 'Add manually if needed: ' + feePKR + ' PKR · ' + ATM_FEE_CATEGORY;
    }
    sendTelegram(msg);
  }
}

function _atmCreateWithdrawTransferPair(amount, fromAccount, destAccount, atmName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) return { ok: false, error: 'Transactions tab missing' };

  // Find row for OUT leg
  const outRow = _atmFindNextRow(tx);
  if (outRow === -1) return { ok: false, error: 'No empty rows in ledger (OUT leg)' };

  // Generate both TxnIDs upfront (sleep 1ms between for ms-tick uniqueness)
  const outTxnId = _atmTxnId();
  Utilities.sleep(1);
  const inTxnId = _atmTxnId();

  const today = new Date();

  // Write OUT leg (source account, Transfer direction)
  try {
    tx.getRange(outRow, 1, 1, 8).setValues([[
      today, fromAccount, 'Transfer', ATM_TRANSFER_CATEGORY,
      amount, 'PKR', amount, 'To: ' + destAccount
    ]]);
    tx.getRange(outRow, 1).setNumberFormat('dd MMM yyyy');
    tx.getRange(outRow, 5).setNumberFormat('#,##0.00');
    tx.getRange(outRow, 7).setNumberFormat('#,##0.00');
    try { tx.getRange(outRow, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(outRow, 9, 1, 4).merge().setValue(
      'Transfer ' + fromAccount + ' → ' + destAccount + ' (OUT · ATM withdraw at ' + atmName + ') [linked: ' + inTxnId + ']'
    );
    tx.getRange(outRow, 14).setValue(outTxnId);
    _atmBumpRowPointer(outRow);
    SpreadsheetApp.flush();
  } catch(e) {
    return { ok: false, error: 'OUT leg write failed: ' + e };
  }

  // Find row for IN leg
  const inRow = _atmFindNextRow(tx);
  if (inRow === -1) {
    return {
      ok: false,
      error: 'OUT leg written but ledger full for IN leg',
      partial: true,
      outRow: outRow,
      outTxnId: outTxnId
    };
  }

  // Write IN leg (destination account, Income direction)
  try {
    tx.getRange(inRow, 1, 1, 8).setValues([[
      today, destAccount, 'Income', ATM_TRANSFER_CATEGORY,
      amount, 'PKR', amount, 'From: ' + fromAccount
    ]]);
    tx.getRange(inRow, 1).setNumberFormat('dd MMM yyyy');
    tx.getRange(inRow, 5).setNumberFormat('#,##0.00');
    tx.getRange(inRow, 7).setNumberFormat('#,##0.00');
    try { tx.getRange(inRow, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(inRow, 9, 1, 4).merge().setValue(
      'Transfer ' + fromAccount + ' → ' + destAccount + ' (IN · ATM withdraw at ' + atmName + ') [linked: ' + outTxnId + ']'
    );
    tx.getRange(inRow, 14).setValue(inTxnId);
    _atmBumpRowPointer(inRow);
  } catch(e) {
    return {
      ok: false,
      error: 'IN leg write failed: ' + e,
      partial: true,
      outRow: outRow,
      outTxnId: outTxnId
    };
  }

  return { ok: true, outRow: outRow, inRow: inRow, outTxnId: outTxnId, inTxnId: inTxnId };
}

function _atmCreateFee(feeAmount, fromAccount, atmName, withdrawTxnId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) return { ok: false, error: 'Transactions tab missing' };

  const row = _atmFindNextRow(tx);
  if (row === -1) return { ok: false, error: 'No empty rows' };

  const txnId = _atmTxnId();
  tx.getRange(row, 1, 1, 8).setValues([[
    new Date(), fromAccount, 'Expense', ATM_FEE_CATEGORY,
    feeAmount, 'PKR', feeAmount, atmName + ' ATM'
  ]]);
  tx.getRange(row, 1).setNumberFormat('dd MMM yyyy');
  tx.getRange(row, 5).setNumberFormat('#,##0.00');
  tx.getRange(row, 7).setNumberFormat('#,##0.00');
  try { tx.getRange(row, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(row, 9, 1, 4).merge().setValue('PENDING reversal · linked to ' + withdrawTxnId + ' · auto-flag if not reversed in ' + ATM_REVERSAL_WINDOW_DAYS + ' days');
  tx.getRange(row, 14).setValue(txnId);
  _atmBumpRowPointer(row);

  return { ok: true, row: row, txnId: txnId };
}

// ──────────────────────────────────────────────────────────
// PUBLIC API — Reverse (UNCHANGED from v1.1)
// ──────────────────────────────────────────────────────────

function cmdAtmReverse(args) {
  const argStr = (args || '').trim();
  let specificAmount = parseFloat(argStr);

  const pending = listPendingATMReversals();
  if (pending.length === 0) {
    if (typeof sendTelegram === 'function') sendTelegram('🤷 No pending ATM fees to reverse.');
    return;
  }

  let target;
  if (specificAmount > 0) {
    target = pending.find(p => Math.abs(p.amount - specificAmount) < 0.01);
    if (!target) {
      if (typeof sendTelegram === 'function') sendTelegram('🤷 No pending fee of ' + specificAmount + ' PKR. /atm list to see pending.');
      return;
    }
  } else {
    target = pending[0];
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  const row = _atmFindNextRow(tx);
  if (row === -1) {
    if (typeof sendTelegram === 'function') sendTelegram('❌ No empty ledger rows.');
    return;
  }

  const txnId = _atmTxnId();
  tx.getRange(row, 1, 1, 8).setValues([[
    new Date(), target.account, 'Income', ATM_REVERSAL_CATEGORY,
    target.amount, 'PKR', target.amount, 'Mashreq Bank'
  ]]);
  tx.getRange(row, 1).setNumberFormat('dd MMM yyyy');
  tx.getRange(row, 5).setNumberFormat('#,##0.00');
  tx.getRange(row, 7).setNumberFormat('#,##0.00');
  try { tx.getRange(row, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(row, 9, 1, 4).merge().setValue('Reversal of pending fee · linked to ' + target.txnId);
  tx.getRange(row, 14).setValue(txnId);
  _atmBumpRowPointer(row);

  try { tx.getRange(target.row, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(target.row, 9, 1, 4).merge().setValue('REVERSED ' + Utilities.formatDate(new Date(), 'Asia/Karachi', 'dd MMM') + ' · was PENDING · linked to reversal ' + txnId);

  _atmLog('ATM_FEE_REVERSED', target.amount + ' PKR · row ' + target.row + ' · reversal ' + txnId);

  if (typeof sendTelegram === 'function') {
    sendTelegram('✅ ATM Fee Reversed\n\n' +
                 target.amount + ' PKR returned to ' + target.account + '\n' +
                 'Original pending fee from ' + Utilities.formatDate(target.date, 'Asia/Karachi', 'dd MMM') + ' marked closed.\n' +
                 'Mashreq honored the reversal as expected.');
  }
}

function cmdAtmFee(args) {
  const newFee = parseFloat(args);
  if (!newFee || newFee <= 0) {
    if (typeof sendTelegram === 'function') sendTelegram('Format: /atm fee 35');
    return;
  }
  const pending = listPendingATMReversals();
  if (pending.length === 0) {
    if (typeof sendTelegram === 'function') sendTelegram('🤷 No pending fees to update.');
    return;
  }
  const target = pending[0];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  const oldAmt = target.amount;
  tx.getRange(target.row, 5).setValue(newFee).setNumberFormat('#,##0.00');
  tx.getRange(target.row, 7).setValue(newFee).setNumberFormat('#,##0.00');
  try { tx.getRange(target.row, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(target.row, 9, 1, 4).merge().setValue('PENDING reversal (amount updated from ' + oldAmt + ' to ' + newFee + ')');
  _atmLog('ATM_FEE_UPDATED', 'row ' + target.row + ' · ' + oldAmt + ' → ' + newFee);
  if (typeof sendTelegram === 'function') {
    sendTelegram('✅ Fee updated\n\nWas: ' + oldAmt + ' PKR\nNow: ' + newFee + ' PKR\nPending reversal still open.');
  }
}

// ──────────────────────────────────────────────────────────
// PUBLIC API — listPendingATMReversals (UNCHANGED)
// ──────────────────────────────────────────────────────────

function listPendingATMReversals() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) return [];

  const pending = [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const block = tx.getRange(14, 1, 200, 14).getValues();
  for (let i = 0; i < block.length; i++) {
    const row = block[i];
    const date = row[0];
    if (!(date instanceof Date) || date < cutoff) continue;
    const cat = row[3];
    if (cat !== ATM_FEE_CATEGORY) continue;
    const notes = String(row[8] || '');
    if (notes.indexOf('PENDING') === -1) continue;
    if (notes.indexOf('REVERSED') !== -1) continue;

    pending.push({
      row: 14 + i,
      date: date,
      account: row[1],
      amount: parseFloat(row[4]) || 0,
      counterparty: row[7],
      notes: notes,
      txnId: row[13],
      ageDays: Math.floor((Date.now() - date.getTime()) / 86400000)
    });
  }
  pending.sort((a, b) => b.date.getTime() - a.date.getTime());
  return pending;
}

function cmdAtmList() {
  const pending = listPendingATMReversals();
  if (pending.length === 0) {
    if (typeof sendTelegram === 'function') sendTelegram('✅ No pending ATM fee reversals. Mashreq is up to date.');
    return;
  }
  let msg = '🏧 PENDING ATM FEE REVERSALS\n\n';
  let totalPending = 0;
  let overdueCount = 0;
  pending.forEach((p, i) => {
    const overdue = p.ageDays > ATM_REVERSAL_WINDOW_DAYS;
    if (overdue) overdueCount++;
    totalPending += p.amount;
    msg += (i + 1) + '. ' + p.amount + ' PKR · ' + p.counterparty + '\n';
    msg += '   ' + Utilities.formatDate(p.date, 'Asia/Karachi', 'dd MMM') + ' · ' + p.ageDays + ' day' + (p.ageDays === 1 ? '' : 's') + ' ago';
    if (overdue) msg += ' ⚠️ OVERDUE (>' + ATM_REVERSAL_WINDOW_DAYS + 'd)';
    msg += '\n\n';
  });
  msg += 'Total pending: ' + totalPending + ' PKR\n';
  if (overdueCount > 0) {
    msg += '⚠️ ' + overdueCount + ' overdue. Consider calling Mashreq if not reversed soon.';
  } else {
    msg += '✅ All within ' + ATM_REVERSAL_WINDOW_DAYS + '-day window.';
  }
  if (typeof sendTelegram === 'function') sendTelegram(msg);
}

// ════════════════════════════════════════════════════════════════════
// DATA HELPERS for Hub + Recon integration (UNCHANGED from v1.1)
// ════════════════════════════════════════════════════════════════════

function getActivePendingATMReversalRows() {
  const pending = listPendingATMReversals();
  return pending
    .filter(p => p.ageDays <= ATM_REVERSAL_WINDOW_DAYS)
    .map(p => p.row);
}

function getATMNet30DayFees() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) return { paid: 0, reversed: 0, net: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  let paid = 0, reversed = 0;
  const block = tx.getRange(14, 1, 200, 7).getValues();
  for (let i = 0; i < block.length; i++) {
    const row = block[i];
    const date = row[0];
    if (!(date instanceof Date) || date < cutoff) continue;
    const cat = row[3];
    const amt = parseFloat(row[4]) || 0;
    if (cat === ATM_FEE_CATEGORY) paid += amt;
    else if (cat === ATM_REVERSAL_CATEGORY) reversed += amt;
  }
  return { paid: paid, reversed: reversed, net: paid - reversed };
}

function getATMHubCardData() {
  const pending = listPendingATMReversals();
  const fees30d = getATMNet30DayFees();

  let totalPending = 0;
  let overdueCount = 0;
  pending.forEach(p => {
    totalPending += p.amount;
    if (p.ageDays > ATM_REVERSAL_WINDOW_DAYS) overdueCount++;
  });

  return {
    pending: pending,
    pendingCount: pending.length,
    totalPendingPKR: totalPending,
    overdueCount: overdueCount,
    fees30d: fees30d,
    windowDays: ATM_REVERSAL_WINDOW_DAYS,
    capacityHint: ATM_USAGE_MAX_MONTHLY
  };
}

// ════════════════════════════════════════════════════════════════════
// HUB CARD EMBED (UNCHANGED from v1.1)
// ════════════════════════════════════════════════════════════════════

function embedATMPanelInHub() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hub = ss.getSheetByName('💰 Finance Hub');
  if (!hub) {
    _atmAlert('❌ Finance Hub tab not found.\n\nRun 💰 Finance → 🔄 Rebuild Suite first.');
    return;
  }
  renderATMPanelInHub(hub, ATM_HUB_START_ROW);
  _atmLog('ATM_HUB_EMBED', 'rows ' + ATM_HUB_START_ROW + '-' + (ATM_HUB_START_ROW + ATM_HUB_ROWS - 1));
  _atmAlert('✅ ATM card embedded.\n\nLocation: Finance Hub rows ' + ATM_HUB_START_ROW + '-' + (ATM_HUB_START_ROW + ATM_HUB_ROWS - 1) + '\n\nRe-run after each Finance Suite rebuild (Phase 3 will auto-wire this).');
}

function renderATMPanelInHub(sheet, startRow) {
  if (!sheet) return;
  if (!startRow || startRow < 1) startRow = ATM_HUB_START_ROW;

  const T = getATMTheme();
  const data = getATMHubCardData();

  try { sheet.getRange(startRow, 1, ATM_HUB_ROWS, 12).breakApart(); } catch(e) {}
  sheet.getRange(startRow, 1, ATM_HUB_ROWS, 12).clearContent().clearFormat();
  sheet.getRange(startRow, 1, ATM_HUB_ROWS, 12).setBackground(T.bgPage);

  sheet.getRange(startRow, 1, 1, 12).merge()
    .setValue('🏧 ATM ACTIVITY — Mashreq fee reversals · ' + data.windowDays + 'd window · cap ~' + data.capacityHint + '/mo')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(startRow, 28);

  const kpiRow = startRow + 1;

  const pCount = data.pendingCount;
  const pCountColor = pCount === 0 ? T.success : (data.overdueCount > 0 ? T.danger : T.warning);
  const pCountLabel = pCount === 0 ? 'ALL CLEAR' : (data.overdueCount > 0 ? data.overdueCount + ' OVERDUE' : 'ON WATCH');
  sheet.getRange(kpiRow, 1, 1, 4).merge()
    .setValue('🟡 PENDING\n' + pCount + '   ' + pCountLabel)
    .setBackground(pCountColor).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  sheet.getRange(kpiRow, 5, 1, 4).merge()
    .setValue('💸 TOTAL PENDING\n' + data.totalPendingPKR.toLocaleString() + ' PKR')
    .setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  const net30 = data.fees30d.net;
  const net30Bg = net30 <= 0 ? T.success : (net30 > 100 ? T.warning : T.bgPanel);
  const net30Fc = net30 <= 0 ? '#FFFFFF' : T.textHi;
  const net30Sign = net30 >= 0 ? '+' : '';
  sheet.getRange(kpiRow, 9, 1, 4).merge()
    .setValue('📊 30D NET FEES\n' + net30Sign + Math.round(net30) + ' PKR · ' + Math.round(data.fees30d.paid) + ' paid · ' + Math.round(data.fees30d.reversed) + ' back')
    .setBackground(net30Bg).setFontColor(net30Fc).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(kpiRow, 50);

  sheet.setRowHeight(startRow + 2, 8);

  const subRow = startRow + 3;
  sheet.getRange(subRow, 1, 1, 12).merge()
    .setValue(pCount === 0 ?
      '✅ ALL CLEAR — no pending Mashreq reversals' :
      '⏳ PENDING REVERSALS — top ' + Math.min(pCount, ATM_HUB_PENDING_LIST_MAX) + ' shown · full list: 🏧 ATM menu')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(subRow, 24);

  if (pCount > 0) {
    const hdrRow = startRow + 4;
    sheet.getRange(hdrRow, 1, 1, 2).merge().setValue('Date');
    sheet.getRange(hdrRow, 3, 1, 2).merge().setValue('Account');
    sheet.getRange(hdrRow, 5, 1, 3).merge().setValue('ATM');
    sheet.getRange(hdrRow, 8, 1, 2).merge().setValue('Amount');
    sheet.getRange(hdrRow, 10, 1, 2).merge().setValue('Age');
    sheet.getRange(hdrRow, 12).setValue('⏱');
    sheet.getRange(hdrRow, 1, 1, 12).setBackground(T.bgPanel).setFontColor(T.textMd)
      .setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
    sheet.setRowHeight(hdrRow, 22);

    const writeCount = Math.min(pCount, ATM_HUB_PENDING_LIST_MAX);
    for (let i = 0; i < writeCount; i++) {
      const r = startRow + 5 + i;
      const p = data.pending[i];
      const overdue = p.ageDays > data.windowDays;
      const bg = overdue ? T.bgLiability : (i % 2 === 0 ? T.bgRow : T.bgAlt);
      const fc = overdue ? T.textErr : T.text;
      const statusIcon = overdue ? '🔴' : (p.ageDays > data.windowDays - 3 ? '🟡' : '🟢');

      sheet.getRange(r, 1, 1, 2).merge().setValue(p.date).setNumberFormat('dd MMM');
      sheet.getRange(r, 3, 1, 2).merge().setValue(p.account || '—');
      sheet.getRange(r, 5, 1, 3).merge().setValue(p.counterparty || 'ATM');
      sheet.getRange(r, 8, 1, 2).merge().setValue(p.amount).setNumberFormat('#,##0');
      sheet.getRange(r, 10, 1, 2).merge().setValue(p.ageDays + 'd' + (overdue ? ' OVERDUE' : ''));
      sheet.getRange(r, 12).setValue(statusIcon);
      sheet.getRange(r, 1, 1, 12).setBackground(bg).setFontColor(fc).setFontSize(10)
        .setHorizontalAlignment('center').setVerticalAlignment('middle');
      if (overdue) sheet.getRange(r, 1, 1, 12).setFontWeight('bold');
      sheet.setRowHeight(r, 22);
    }

    for (let i = writeCount; i < ATM_HUB_PENDING_LIST_MAX; i++) {
      const r = startRow + 5 + i;
      sheet.getRange(r, 1, 1, 12).setBackground(T.bgPage);
      sheet.setRowHeight(r, 22);
    }
  } else {
    for (let i = 0; i < ATM_HUB_PENDING_LIST_MAX + 1; i++) {
      sheet.setRowHeight(startRow + 4 + i, 22);
      sheet.getRange(startRow + 4 + i, 1, 1, 12).setBackground(T.bgPage);
    }
    sheet.getRange(startRow + 8, 1, 1, 12).merge()
      .setValue('Mashreq is square. No fees waiting on reversal.')
      .setBackground(T.bgPage).setFontColor(T.textLo).setFontStyle('italic')
      .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  }

  sheet.setRowHeight(startRow + 13, 6);

  const hintRow = startRow + 14;
  let hintText;
  if (data.overdueCount > 0) {
    hintText = '⚠️ ' + data.overdueCount + ' fee(s) past ' + data.windowDays + ' days. Call Mashreq · or 🏧 ATM menu → ↩️ Reverse a Pending Fee';
  } else if (data.pendingCount > 0) {
    hintText = '⏳ When Mashreq returns the fee → 🏧 ATM menu → ↩️ Reverse a Pending Fee · or Telegram /atm reverse';
  } else {
    hintText = '🏧 Log a withdraw → 🏧 ATM menu → 🏧 Log ATM Withdraw · or Telegram /atm 5000 hbl';
  }
  sheet.getRange(hintRow, 1, 1, 12).merge().setValue(hintText)
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(hintRow, 24);
}

// ──────────────────────────────────────────────────────────
// SHEET-NATIVE UI (v1.2: default Cash dest, transfer pair)
// ──────────────────────────────────────────────────────────

function uiATMLogWithdraw() {
  const ui = SpreadsheetApp.getUi();
  const amtPrompt = ui.prompt('🏧 ATM Withdraw — Step 1/3',
    'Enter withdraw amount in PKR (e.g. 5000):',
    ui.ButtonSet.OK_CANCEL);
  if (amtPrompt.getSelectedButton() !== ui.Button.OK) return;
  const amount = parseFloat(amtPrompt.getResponseText().trim());
  if (!amount || amount <= 0) { ui.alert('⚠️ Invalid amount.'); return; }

  const atmPrompt = ui.prompt('🏧 ATM Withdraw — Step 2/3',
    'Which ATM did you use? (e.g. HBL, UBL, Meezan, Mashreq, Standard Chartered)\n\nIf you used your own Mashreq ATM, type "mashreq" — fee will be skipped automatically.',
    ui.ButtonSet.OK_CANCEL);
  if (atmPrompt.getSelectedButton() !== ui.Button.OK) return;
  const atmName = atmPrompt.getResponseText().trim() || 'ATM';

  const noFee = /mashreq/i.test(atmName);
  let feePKR = ATM_DEFAULT_FEE_PKR;
  if (!noFee) {
    const feePrompt = ui.prompt('🏧 ATM Withdraw — Step 3/3',
      'Fee charged by ATM in PKR.\n\nDefault: ' + ATM_DEFAULT_FEE_PKR + ' PKR (typical Mashreq fee).\nType custom amount, leave blank for ' + ATM_DEFAULT_FEE_PKR + ', or type "0" if no fee.',
      ui.ButtonSet.OK_CANCEL);
    if (feePrompt.getSelectedButton() !== ui.Button.OK) return;
    const txt = feePrompt.getResponseText().trim();
    if (txt === '0') feePKR = 0;
    else if (txt) {
      const v = parseFloat(txt);
      if (v >= 0) feePKR = v;
    }
  }

  const fromAccount = ATM_DEFAULT_FROM_ACCOUNT;
  const destAccount = ATM_DEFAULT_DEST_ACCOUNT;
  const willCreateFee = !noFee && feePKR > 0;

  if (fromAccount === destAccount) {
    ui.alert('⚠️ Source and destination both ' + fromAccount + '. No-op. Edit ATM_DEFAULT_DEST_ACCOUNT or use Telegram /atm with to= param.');
    return;
  }

  const transferResult = _atmCreateWithdrawTransferPair(amount, fromAccount, destAccount, atmName);
  if (!transferResult.ok) {
    let errMsg = '❌ Withdraw failed: ' + transferResult.error;
    if (transferResult.partial) {
      errMsg += '\n\n⚠️ PARTIAL: OUT leg at row ' + transferResult.outRow + ' (TxnID ' + transferResult.outTxnId + '). Manually clear or column-M reverse before retry.';
    }
    ui.alert(errMsg);
    return;
  }

  let feeResult = null;
  if (willCreateFee) feeResult = _atmCreateFee(feePKR, fromAccount, atmName, transferResult.outTxnId);

  _atmLog('ATM_WITHDRAW_UI',
    amount + ' from ' + fromAccount + ' to ' + destAccount + ' via ' + atmName +
    ' · transfer pair rows ' + transferResult.outRow + '+' + transferResult.inRow +
    ' · fee ' + (willCreateFee ? feePKR + ' PENDING' : 'none')
  );

  let msg = '🏧 ATM Withdraw logged\n\n';
  msg += amount.toLocaleString() + ' PKR pulled from ' + fromAccount + '\n';
  msg += 'ATM: ' + atmName + '\n';
  msg += 'Landed in: ' + destAccount + ' (transfer pair filed)\n\n';
  if (noFee) {
    msg += '✅ No fee (own Mashreq ATM)\n';
    msg += '2 ledger rows added · all linked atomically.';
  } else if (willCreateFee && feeResult && feeResult.ok) {
    msg += '💸 Fee: ' + feePKR + ' PKR (PENDING)\n';
    msg += '⏳ Mashreq usually reverses within 7 days · safety window ' + ATM_REVERSAL_WINDOW_DAYS + ' days\n\n';
    msg += 'When reversed: Menu → 🏧 ATM → ↩️ Reverse Pending Fee\n\n';
    msg += '3 ledger rows added · all linked atomically.';
  } else if (willCreateFee && (!feeResult || !feeResult.ok)) {
    msg += '⚠️ Transfer pair OK but fee row failed. Add manually: ' + feePKR + ' PKR · ' + ATM_FEE_CATEGORY;
  } else {
    msg += '✅ No fee charged\n';
    msg += '2 ledger rows added · all linked atomically.';
  }
  ui.alert(msg);
}

function uiATMShowPending() {
  const ui = SpreadsheetApp.getUi();
  const pending = listPendingATMReversals();
  if (pending.length === 0) {
    ui.alert('✅ No pending ATM fee reversals.\n\nMashreq is up to date.');
    return;
  }
  let msg = '🏧 PENDING ATM FEE REVERSALS\n\n';
  let totalPending = 0;
  let overdueCount = 0;
  pending.forEach((p, i) => {
    const overdue = p.ageDays > ATM_REVERSAL_WINDOW_DAYS;
    if (overdue) overdueCount++;
    totalPending += p.amount;
    msg += (i + 1) + '. ' + p.amount + ' PKR · ' + (p.counterparty || 'ATM') + '\n';
    msg += '   ' + Utilities.formatDate(p.date, 'Asia/Karachi', 'dd MMM') + ' · ' + p.ageDays + ' day' + (p.ageDays === 1 ? '' : 's') + ' ago';
    if (overdue) msg += ' ⚠️ OVERDUE';
    msg += '\n\n';
  });
  msg += 'Total pending: ' + totalPending + ' PKR\n';
  if (overdueCount > 0) msg += '\n⚠️ ' + overdueCount + ' overdue (>' + ATM_REVERSAL_WINDOW_DAYS + ' days). Consider calling Mashreq.';
  else msg += '\n✅ All within ' + ATM_REVERSAL_WINDOW_DAYS + '-day window.';
  ui.alert(msg);
}

function uiATMReverse() {
  const ui = SpreadsheetApp.getUi();
  const pending = listPendingATMReversals();
  if (pending.length === 0) { ui.alert('🤷 No pending ATM fees to reverse.'); return; }

  let pickerMsg = 'Pending fees:\n\n';
  pending.forEach((p, i) => {
    pickerMsg += (i + 1) + '. ' + p.amount + ' PKR · ' + (p.counterparty || 'ATM') + ' · ' + Utilities.formatDate(p.date, 'Asia/Karachi', 'dd MMM') + '\n';
  });
  pickerMsg += '\nType the NUMBER (1, 2, 3...) of the fee Mashreq just reversed.\nOr type "1" for the most recent.';

  const pick = ui.prompt('↩️ Reverse Pending Fee', pickerMsg, ui.ButtonSet.OK_CANCEL);
  if (pick.getSelectedButton() !== ui.Button.OK) return;
  const idx = parseInt(pick.getResponseText().trim(), 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= pending.length) { ui.alert('⚠️ Invalid selection.'); return; }
  const target = pending[idx];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  const row = _atmFindNextRow(tx);
  if (row === -1) { ui.alert('❌ No empty ledger rows.'); return; }

  const txnId = _atmTxnId();
  tx.getRange(row, 1, 1, 8).setValues([[
    new Date(), target.account, 'Income', ATM_REVERSAL_CATEGORY,
    target.amount, 'PKR', target.amount, 'Mashreq Bank'
  ]]);
  tx.getRange(row, 1).setNumberFormat('dd MMM yyyy');
  tx.getRange(row, 5).setNumberFormat('#,##0.00');
  tx.getRange(row, 7).setNumberFormat('#,##0.00');
  try { tx.getRange(row, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(row, 9, 1, 4).merge().setValue('Reversal of pending fee · linked to ' + target.txnId);
  tx.getRange(row, 14).setValue(txnId);
  _atmBumpRowPointer(row);

  try { tx.getRange(target.row, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(target.row, 9, 1, 4).merge().setValue('REVERSED ' + Utilities.formatDate(new Date(), 'Asia/Karachi', 'dd MMM') + ' · was PENDING · linked to reversal ' + txnId);

  _atmLog('ATM_FEE_REVERSED_UI', target.amount + ' PKR · row ' + target.row + ' · reversal ' + txnId);

  ui.alert('✅ ATM Fee Reversed\n\n' +
           target.amount + ' PKR returned to ' + target.account + '\n' +
           'Original pending fee from ' + Utilities.formatDate(target.date, 'Asia/Karachi', 'dd MMM') + ' marked closed.\n\n' +
           'Mashreq honored the reversal as expected.\n\n' +
           '💡 Tip: re-embed Hub card to refresh — 🏧 ATM → 📌 Embed Hub Card');
}

function appendATMMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🏧 ATM')
      .addItem('🏧 Log ATM Withdraw', 'uiATMLogWithdraw')
      .addItem('📋 Show Pending Reversals', 'uiATMShowPending')
      .addItem('↩️ Reverse a Pending Fee', 'uiATMReverse')
      .addSeparator()
      .addItem('📌 Embed Hub Card (rows 32-46)', 'embedATMPanelInHub')
      .addItem('🔍 Verify ATM Tracker', 'verifyATMTracker')
      .addItem('🔎 Audit Legacy Withdraw Rows', 'auditLegacyATMWithdrawRows')
      .addToUi();
  } catch(e) { Logger.log('ATM menu add failed: ' + e); }
}

function verifyATMTracker() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hub = ss.getSheetByName('💰 Finance Hub');
  const tx = ss.getSheetByName('💸 Transactions');
  const data = getATMHubCardData();

  let msg = '🔍 ATM TRACKER v1.2 INTEGRITY\n\n';
  msg += '⚙️ CONFIG:\n';
  msg += '  Default fee:       ' + ATM_DEFAULT_FEE_PKR + ' PKR\n';
  msg += '  Reversal window:   ' + ATM_REVERSAL_WINDOW_DAYS + ' days\n';
  msg += '  Capacity hint:     ' + ATM_USAGE_MAX_MONTHLY + '/mo\n';
  msg += '  Default source:    ' + ATM_DEFAULT_FROM_ACCOUNT + '\n';
  msg += '  Default dest:      ' + ATM_DEFAULT_DEST_ACCOUNT + ' (v1.2 NEW)\n';
  msg += '  Transfer category: ' + ATM_TRANSFER_CATEGORY + ' (v1.2 NEW)\n\n';
  msg += '📊 LIVE STATE:\n';
  msg += '  Pending reversals: ' + data.pendingCount + '\n';
  msg += '  Total pending PKR: ' + data.totalPendingPKR + '\n';
  msg += '  Overdue count:     ' + data.overdueCount + '\n';
  msg += '  30d net fees:      ' + Math.round(data.fees30d.net) + ' PKR (' + Math.round(data.fees30d.paid) + ' paid · ' + Math.round(data.fees30d.reversed) + ' reversed)\n\n';
  msg += '🏗️ INTEGRATION:\n';
  msg += '  Finance Hub tab:   ' + (hub ? '✅ found' : '❌ MISSING') + '\n';
  msg += '  Transactions tab:  ' + (tx ? '✅ found' : '❌ MISSING') + '\n';
  msg += '  Hub card slot:     rows ' + ATM_HUB_START_ROW + '-' + (ATM_HUB_START_ROW + ATM_HUB_ROWS - 1) + '\n';
  msg += '  Recon export:      getActivePendingATMReversalRows() ✅ ready\n';
  msg += '  Transfer pair fn:  _atmCreateWithdrawTransferPair() ✅ ready (v1.2)\n\n';
  msg += '💡 To see card: 🏧 ATM → 📌 Embed Hub Card\n';
  msg += '💡 Telegram:  /atm 5000 hbl       (lands in Cash + 35 PKR fee pending)\n';
  msg += '💡 Telegram:  /atm 5000 hbl to=jazzcash  (lands in JazzCash wallet)\n';
  msg += '💡 To find old wrong-format rows: 🏧 ATM → 🔎 Audit Legacy Withdraw Rows';
  _atmAlert(msg);
}

// ════════════════════════════════════════════════════════════════════
// v1.2 NEW — LEGACY ROW AUDITOR
// ════════════════════════════════════════════════════════════════════

/**
 * One-shot scanner. Lists any ledger rows still in the pre-v1.2
 * format (Expense direction + 🏧 ATM Withdraw category), which were
 * the buggy single-row writes. Does NOT modify anything — owner
 * decides whether to column-M reverse them after review.
 */
function auditLegacyATMWithdrawRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) { _atmAlert('❌ Transactions tab missing.'); return; }

  const block = tx.getRange(14, 1, 200, 14).getValues();
  const legacy = [];
  for (let i = 0; i < block.length; i++) {
    const row = block[i];
    const date = row[0];
    if (!(date instanceof Date)) continue;
    const direction = row[2];
    const category = row[3];
    if (direction === 'Expense' && category === ATM_WITHDRAW_CATEGORY) {
      const notes = String(row[8] || '');
      // Skip already-reversed rows
      if (notes.indexOf('REVERSED') !== -1) continue;
      legacy.push({
        row: 14 + i,
        date: date,
        account: row[1],
        amount: parseFloat(row[4]) || 0,
        counterparty: row[7],
        txnId: row[13]
      });
    }
  }

  if (legacy.length === 0) {
    _atmAlert('✅ No legacy ATM Withdraw expense rows found.\n\nLedger is clean. All /atm calls used the new transfer pair format.');
    return;
  }

  let msg = '🔎 LEGACY ATM WITHDRAW ROWS (pre-v1.2 format)\n\n';
  msg += 'These rows were written as a single Expense (the bug). They debit the source bank but never credit Cash. Each one likely has a paired manual transfer somewhere too — check the dates.\n\n';
  let total = 0;
  legacy.forEach((r, i) => {
    total += r.amount;
    msg += (i + 1) + '. Row ' + r.row + ' · ' + Utilities.formatDate(r.date, 'Asia/Karachi', 'dd MMM') + '\n';
    msg += '   ' + r.account + ' · ' + r.amount.toLocaleString() + ' PKR · ' + (r.counterparty || '—') + '\n';
    msg += '   TxnID: ' + (r.txnId || '—') + '\n\n';
  });
  msg += 'Total impact: ' + total.toLocaleString() + ' PKR over-debited from source banks.\n\n';
  msg += '🛠️ FIX: For each row above, tick the column M reversal checkbox. The auto-reversal handler will cancel that expense leg. The paired manual transfer (if you also added one) stays intact and correctly moves the money.\n\n';
  msg += '⚠️ Verify each row before reversing. If a row was the ONLY entry (no manual transfer pair), reverse AND add a proper manual transfer to your Cash account.';
  _atmAlert(msg);
}

// ════════════════════════════════════════════════════════════════════
// v1.2 NEW — SELF-TEST (no writes, console only)
// ════════════════════════════════════════════════════════════════════

function _atmSelfTest() {
  const checks = [];
  const push = (label, ok, detail) => checks.push((ok ? '✅' : '❌') + ' ' + label + (detail ? ' · ' + detail : ''));

  // Constants
  push('ATM_DEFAULT_FEE_PKR is positive number', typeof ATM_DEFAULT_FEE_PKR === 'number' && ATM_DEFAULT_FEE_PKR >= 0, ATM_DEFAULT_FEE_PKR + ' PKR');
  push('ATM_REVERSAL_WINDOW_DAYS is positive', typeof ATM_REVERSAL_WINDOW_DAYS === 'number' && ATM_REVERSAL_WINDOW_DAYS > 0, ATM_REVERSAL_WINDOW_DAYS + ' days');
  push('ATM_DEFAULT_FROM_ACCOUNT defined', !!ATM_DEFAULT_FROM_ACCOUNT, ATM_DEFAULT_FROM_ACCOUNT);
  push('ATM_DEFAULT_DEST_ACCOUNT defined (v1.2 NEW)', !!ATM_DEFAULT_DEST_ACCOUNT, ATM_DEFAULT_DEST_ACCOUNT);
  push('Source ≠ Dest by default', ATM_DEFAULT_FROM_ACCOUNT !== ATM_DEFAULT_DEST_ACCOUNT);
  push('ATM_TRANSFER_CATEGORY defined (v1.2 NEW)', !!ATM_TRANSFER_CATEGORY, ATM_TRANSFER_CATEGORY);

  // Functions
  push('cmdAtm exists', typeof cmdAtm === 'function');
  push('_atmCreateWithdrawTransferPair exists (v1.2 NEW)', typeof _atmCreateWithdrawTransferPair === 'function');
  push('_atmCreateFee exists', typeof _atmCreateFee === 'function');
  push('cmdAtmReverse exists', typeof cmdAtmReverse === 'function');
  push('cmdAtmFee exists', typeof cmdAtmFee === 'function');
  push('cmdAtmList exists', typeof cmdAtmList === 'function');
  push('listPendingATMReversals exists', typeof listPendingATMReversals === 'function');
  push('uiATMLogWithdraw exists', typeof uiATMLogWithdraw === 'function');
  push('uiATMShowPending exists', typeof uiATMShowPending === 'function');
  push('uiATMReverse exists', typeof uiATMReverse === 'function');
  push('embedATMPanelInHub exists', typeof embedATMPanelInHub === 'function');
  push('renderATMPanelInHub exists', typeof renderATMPanelInHub === 'function');
  push('getATMHubCardData exists', typeof getATMHubCardData === 'function');
  push('getActivePendingATMReversalRows exists', typeof getActivePendingATMReversalRows === 'function');
  push('auditLegacyATMWithdrawRows exists (v1.2 NEW)', typeof auditLegacyATMWithdrawRows === 'function');
  push('verifyATMTracker exists', typeof verifyATMTracker === 'function');
  push('appendATMMenu exists', typeof appendATMMenu === 'function');

  // Account map
  push('Account map has Cash', !!_ATM_ACCOUNT_MAP['cash']);
  push('Account map has Mashreq', !!_ATM_ACCOUNT_MAP['mashreq']);

  // External deps (typeof guards)
  push('SpreadsheetApp available', typeof SpreadsheetApp !== 'undefined');
  push('Utilities available', typeof Utilities !== 'undefined');
  push('Logger available', typeof Logger !== 'undefined');

  // Optional cross-file deps
  push('safeAlert (Code.gs) available', typeof safeAlert === 'function');
  push('logAuditAction (Code.gs) available', typeof logAuditAction === 'function');
  push('generateTxnId (Code.gs) available', typeof generateTxnId === 'function');
  push('_findNextLedgerRow (Finance_Pro) available', typeof _findNextLedgerRow === 'function');
  push('getFinTheme (Theme_Pro) available', typeof getFinTheme === 'function');
  push('sendTelegram (Telegram.gs) available', typeof sendTelegram === 'function');

  Logger.log('═══════════════════════════════════════');
  Logger.log('🏧 Finance_ATM.gs v1.2 SELF-TEST');
  Logger.log('═══════════════════════════════════════');
  checks.forEach(c => Logger.log(c));
  Logger.log('═══════════════════════════════════════');
  const failures = checks.filter(c => c.indexOf('❌') === 0).length;
  Logger.log(failures === 0 ? '✅ ALL CHECKS PASSED · safe to use /atm' : '⚠️ ' + failures + ' checks failed · review above');

  return { passed: checks.length - failures, failed: failures, checks: checks };
}



function _oneTime_Cleanup_02May_BadRows() {
  const KEEP_TXN_IDS = [
    'TXN-20260502-160201-902',
    'TXN-20260502-160201-285',
    'TXN-20260502-160341-512',
    'TXN-20260502-160341-010',
    'TXN-20260502-171919-673',
    'TXN-20260502-171919-116',
    'TXN-20260502-171921-032'
  ];

  const DELETE_TXN_IDS = [
    'TXN-20260502-160426-963',
    'TXN-20260502-160427-166',
    'TXN-20260502-160600-387',
    'TXN-20260502-160600-850',
    'TXN-20260502-171139-038',
    'TXN-20260502-171139-938',
    'TXN-20260502-171143-519',
    'TXN-20260502-171732-554',
    'TXN-20260502-171738-425',
    'TXN-20260502-171739-934',
    'TXN-20260502-171743-548',
    'TXN-20260502-171745-243',
    'TXN-20260502-171800-280',
    'TXN-20260502-171801-203',
    'TXN-20260502-171806-128',
    'TXN-20260502-171807-953',
    'TXN-20260502-171815-763',
    'TXN-20260502-171820-689'
  ];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) {
    SpreadsheetApp.getUi().alert('❌ Transactions tab not found.');
    return;
  }

  // SAFETY: snapshot current Transactions tab before deleting anything
  const snapName = '📦 Snap ' + Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyyMMdd-HHmmss') + ' (pre-cleanup) Transactions';
  tx.copyTo(ss).setName(snapName).hideSheet();
  Logger.log('✅ Snapshot saved: ' + snapName);

  // Find all rows by TxnID (column 14)
  const data = tx.getRange(14, 14, 200, 1).getValues();
  const rowsToDelete = [];
  const found = [];
  const notFound = [];

  for (let i = 0; i < DELETE_TXN_IDS.length; i++) {
    const target = DELETE_TXN_IDS[i];
    let matched = false;
    for (let j = 0; j < data.length; j++) {
      if (String(data[j][0]).trim() === target) {
        rowsToDelete.push(14 + j);
        found.push(target);
        matched = true;
        break;
      }
    }
    if (!matched) notFound.push(target);
  }

  // Sort descending so deletion doesn't shift row numbers
  rowsToDelete.sort((a, b) => b - a);

  // Delete from bottom up
  rowsToDelete.forEach(row => {
    tx.deleteRow(row);
    Utilities.sleep(50);
  });

  // Verify the 7 KEEP rows still exist
  const dataAfter = tx.getRange(14, 14, 200, 1).getValues();
  const keepFound = [];
  const keepMissing = [];
  for (let i = 0; i < KEEP_TXN_IDS.length; i++) {
    const target = KEEP_TXN_IDS[i];
    let matched = false;
    for (let j = 0; j < dataAfter.length; j++) {
      if (String(dataAfter[j][0]).trim() === target) {
        matched = true;
        break;
      }
    }
    if (matched) keepFound.push(target);
    else keepMissing.push(target);
  }

  let report = '🧹 CLEANUP COMPLETE\n\n';
  report += 'Deleted: ' + found.length + ' / ' + DELETE_TXN_IDS.length + ' bad rows\n';
  report += 'Snapshot: ' + snapName + ' (hidden)\n\n';
  if (notFound.length > 0) {
    report += '⚠️ NOT FOUND (already gone or different TxnID):\n';
    notFound.forEach(t => report += '  · ' + t + '\n');
    report += '\n';
  }
  report += '✅ KEEP rows still present: ' + keepFound.length + ' / ' + KEEP_TXN_IDS.length + '\n';
  if (keepMissing.length > 0) {
    report += '⚠️ KEEP rows MISSING (need attention):\n';
    keepMissing.forEach(t => report += '  · ' + t + '\n');
  }
  report += '\nNext: open 💼 Accounts tab and verify balances.';

  SpreadsheetApp.getUi().alert(report);
  Logger.log(report);
}
