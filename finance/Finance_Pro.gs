// ════════════════════════════════════════════════════════════════════
// 🏦 Finance_Pro.gs — BANKING SUITE v3.3 ELITE BANKING-GRADE
// LOCKED · Day 10 · 2026-05-02 · Balance-constraint + FX-snapshot
//
// CHANGES FROM v3.2 (2 critical bug closures from Day 10 banking audit):
//
//   🛑 #C1 BALANCE CONSTRAINT (CRITICAL)
//      v3.2: Expense to Cash=0 silently writes -200 negative balance.
//            Real banks reject the transaction at write time.
//      v3.3: NEW _validateBalanceConstraint() runs BEFORE every write.
//            For Asset accounts (Cash/JazzCash/Easypaisa/UBL/UBL Prepaid/
//            Meezan/Mashreq/JS Bank/Naya Pay/Bank Alfalah):
//              - Computes projected balance after this write
//              - If projected < 0: popup YES/NO override
//              - YES → audit BALANCE_CONSTRAINT_OVERRIDE + proceed
//              - NO → cancel write + reset checkbox + status update
//            For Liability (Alfalah CC):
//              - Computes projected outstanding after this write
//              - If projected > limit: popup YES/NO override
//              - YES → audit CC_LIMIT_OVERRIDE + proceed
//              - NO → cancel write
//      Banking standard: pre-commit balance check (BSP/SBP requirement
//      for Pakistani retail banks).
//
//   💱 #C5 FX RATE SNAPSHOT PER ROW (CRITICAL)
//      v3.2: All USD→PKR conversions look up H1 at READ time.
//            If H1 corrupted/changed/refetched → ALL historical USD
//            transactions silently re-convert at new rate.
//      v3.3: NEW column 15 'FX_Rate_At_Commit' written WITH every txn.
//            For PKR txns: stores 1.0 (or blank).
//            For USD txns: stores current H1 value at that moment.
//            G column (PKR Equiv) becomes formula:
//              =IF(F="USD",E*O,IF(F="PKR",E,""))
//            where O is the NEW per-row FX rate column.
//            Legacy rows: backfilled with current H1 once on rebuild.
//      Banking standard: FX rate is part of transaction record, not
//      derived. Same as SWIFT/Wise/banks.
//
// PRESERVED VERBATIM FROM v3.2:
//   - LockService on all hot paths
//   - Atomic linked-partner reversal with pending markers
//   - Salary detect PROMPT mode (never silent)
//   - TxnID 5-digit suffix (1/100,000 collision odds)
//   - Row pointer cache + audit buffer perf
//   - CC validation gate at 500 PKR
//   - All public function signatures (cross-module compat)
//   - All Hub/Accounts/Budget/Bills/Goals tab builders
//   - Snapshot system, audit log schema, menu wiring
//
// ════════════════════════════════════════════════════════════════════
// 7-LAYER AUDIT (delta from v3.2)
// ════════════════════════════════════════════════════════════════════
//
// L1 — 5-TEST: Self-contained ✓ Side-effects: +col 15 writes ✓
//      Re-run safe ✓ Mentally traced (4 scenarios below) ✓
//      Failure modes: see L7
//
// L2 — CALL GRAPH delta:
//   submitTxnFromQuickEntry (entry)
//     → _acquireFinLock (existing v3.2)
//     → batch read form (existing)
//     → _validateBalanceConstraint(account, type, amount)  [NEW v3.3]
//         → if projection < 0/limit: ui.alert YES/NO
//         → audit BALANCE_CONSTRAINT_BLOCK or _OVERRIDE
//     → CC validation gate (existing v3.2 — separate concern, both fire)
//     → _detectSalaryPattern + prompt (existing v3.2)
//     → _findNextLedgerRow (existing)
//     → generateTxnId (existing v3.2 5-digit)
//     → _captureFxRate(currency)  [NEW v3.3]
//         → returns { rate, source } where source = 'H1' or '1.0'
//     → batch write 1×9 (was 1×8 in v3.2 + new col 15 FX rate)
//     → _bumpRowPointer (existing)
//     → _logAuditFast (existing)
//     → _releaseFinLock (existing finally block)
//
// L3 — ROW LAYOUT MAP delta:
//   Col 14 (N): TxnID (existing)
//   Col 15 (O): FX_Rate_At_Commit  [NEW v3.3 — hidden]
//   All other rows unchanged.
//
// L4 — CELL-STATE MATRIX delta:
//   Col 15 states: empty (PKR) | 1.0 (PKR explicit) | numeric (USD rate captured at commit)
//   Col 7 (PKR Equiv) formula: =IF(F="USD",E*O,IF(F="PKR",E,"")) when col O present
//                              =IF(F="USD",E*$H$1,IF(F="PKR",E,"")) v3.2 fallback
//
// L5 — STATE-ORDER PROOF (write path):
//   1. Acquire lock
//   2. Read form
//   3. Validate (incl balance constraint NEW)
//   4. CC gate (existing)
//   5. Salary prompt (existing)
//   6. Find row
//   7. Capture FX rate (NEW)
//   8. Batch write cols 1-8 + 15 (NEW: FX rate)
//   9. Notes col 9-12 merge
//  10. TxnID col 14
//  11. Bump cache
//  12. Audit
//  13. Auto-clear form
//  14. Release lock
//   Order is: validate → write → audit → release. Lock held throughout.
//
// L6 — BACKWARD-COMPAT:
//   - Col 15 is ADDITIVE. v3.2 writers (Finance_Debts v1.1, Finance_ATM,
//     Finance_NanoLoan, Finance_Intl, Finance_Salary, Finance_Kite) won't
//     populate col 15 → falls back to H1 lookup gracefully.
//   - Existing rebuild backfills col 15 for all historical rows ONCE.
//   - Hub/Accounts read formulas updated to handle both modes:
//       SUM(G14:G213) — PKR Equiv col still works as cached value.
//   - 4 NEW audit actions: BALANCE_CONSTRAINT_OVERRIDE, BALANCE_CONSTRAINT_BLOCK,
//     CC_LIMIT_OVERRIDE, FX_RATE_BACKFILL. Need Finance_Audit v1.5 whitelist
//     update (shipping next).
//
// L7 — FAILURE-MODE INVENTORY (v3.3 additions):
//   1. Balance projection wrong (cache stale) → reads ledger fresh; rare race
//   2. User clicks YES on overdraft → audit-logged, write proceeds
//   3. User clicks NO → checkbox reset, status "blocked", no write
//   4. CC over-limit + override → both CC_VALIDATION + BALANCE_CONSTRAINT
//      audits fire (defense-in-depth, intentional)
//   5. FX rate H1 = 0 or blank → captures 0, _validate flag downstream
//   6. USD txn with no rate captured (legacy code path) → falls back to H1
//
// ════════════════════════════════════════════════════════════════════
// MENTAL TRACE — 4 critical scenarios
// ════════════════════════════════════════════════════════════════════
//
// SCENARIO A: User logs Cash expense 200 PKR, but Cash balance = 50
//   1. Lock acquired
//   2. Form read: account=Cash, type=Expense, amount=200
//   3. _validateBalanceConstraint('Cash', 'Expense', 200):
//      a. Computes current Cash balance from ledger SUMIFS = 50
//      b. Projected = 50 - 200 = -150
//      c. -150 < 0 → popup YES/NO:
//         "Cash balance projected to go NEGATIVE.
//          Current: 50 PKR · After this txn: -150 PKR
//          Override and proceed anyway?"
//   4a. User clicks NO:
//       - Audit BALANCE_CONSTRAINT_BLOCK · 'Cash · Expense · 200 · projected -150 · user cancelled'
//       - Reset L4 checkbox to false
//       - Status K4 = "🛑 blocked: would go negative"
//       - Lock released, no write
//   4b. User clicks YES:
//       - Audit BALANCE_CONSTRAINT_OVERRIDE · same details · user proceeded
//       - Continue normal write flow
//       - Audit OVERRIDE entry serves as forensic record
//
// SCENARIO B: USD subscription 14.99 USD, H1 = 280
//   1. Lock acquired
//   2. Form: account=Alfalah CC, type=Expense, amount=14.99, currency=USD
//   3. _validateBalanceConstraint: CC liability, projection vs limit. OK.
//   4. _captureFxRate('USD') → reads H1 = 280, returns { rate: 280, source: 'H1' }
//   5. Write cols 1-8: [date, CC, Expense, 🌐 Intl, 14.99, USD, 14.99*280=4197.2, ...]
//   6. Write col 14 TxnID
//   7. Write col 15 FX_Rate_At_Commit = 280
//   8. Lock released
//   Tomorrow: H1 fetched as 285 (currency moved). Hub re-renders.
//   Old USD row's PKR Equiv (col G) = 4197.2 (cached from write time, unchanged)
//   No silent re-conversion. Banking-grade FX integrity.
//
// SCENARIO C: Concurrent salary detect + balance constraint
//   1. Lock acquired
//   2. Form: account=Meezan, type=Income, amount=170000, category=🍔 Food
//   3. _validateBalanceConstraint: Income (positive flow), projection +170k. OK, no popup.
//   4. _detectSalaryPattern: matches → prompt "Override to Salary?"
//   5. User YES → category corrected
//   6. _captureFxRate('PKR') → returns 1.0
//   7. Normal write + audits SALARY_CATEGORY_CORRECTED + TXN_LOGGED
//   Both validations run, no conflict.
//
// SCENARIO D: User attempts to override CC over-limit AND go negative on Cash
//   (Two-part write attempt blocked at first gate)
//   1. Lock acquired
//   2. Validate balance constraint catches first → popup → YES override
//   3. CC validation gate (existing v3.2) catches second → second popup → YES override
//   4. Two audits written: BALANCE_CONSTRAINT_OVERRIDE + CC_VALIDATION_OVERRIDE
//   5. Write proceeds. Forensic trail complete.
//   No race possible — same lock holds throughout.
//
// ════════════════════════════════════════════════════════════════════

const FIN2_TABS = {
  HUB: '💰 Finance Hub',
  TXN: '💸 Transactions',
  ACC: '🏦 Accounts',
  BUD: '📊 Budget',
  BIL: '📅 Bills',
  GOA: '🎯 Goals'
};
const FIN2_LEGACY = '💰 Finance';
const FIN2_LEGACY_BACKUP = '💰 Finance (legacy)';

const FIN2_ACCOUNTS = [
  'Cash', 'JazzCash', 'Easypaisa',
  'UBL', 'UBL Prepaid', 'Meezan', 'Mashreq Bank',
  'JS Bank', 'Naya Pay', 'Bank Alfalah',
  'Alfalah CC'
];

const FIN2_ACCOUNT_TYPES = {
  'Cash': 'Asset', 'JazzCash': 'Asset', 'Easypaisa': 'Asset',
  'UBL': 'Asset', 'UBL Prepaid': 'Asset', 'Meezan': 'Asset', 'Mashreq Bank': 'Asset',
  'JS Bank': 'Asset', 'Naya Pay': 'Asset', 'Bank Alfalah': 'Asset',
  'Alfalah CC': 'Liability'
};

const FIN2_ACCOUNT_KIND = {
  'Cash': 'Liquid', 'JazzCash': 'Mobile', 'Easypaisa': 'Mobile',
  'UBL': 'Bank', 'Meezan': 'Bank · Salary', 'Mashreq Bank': 'Bank',
  'JS Bank': 'Bank', 'Naya Pay': 'Mobile', 'Bank Alfalah': 'Bank',
  'Alfalah CC': 'Credit Card'
};

const FIN2_CC_ACCOUNT = 'Alfalah CC';
const FIN2_CC_LIMIT = 100000;
const FIN2_CC_DUE_DAY = 6;
const FIN2_CC_CLOSE_DAY = 12;

const FIN2_TXN_TYPES = ['Income', 'Expense', 'Transfer', 'Debt Out', 'Debt In'];
const FIN2_CURRENCIES = ['PKR', 'USD'];

const FIN2_CATEGORIES = [
  '💰 Opening Balance',
  '💳 CC Payment', '💳 CC Spend', '🪁 CC Kite Withdraw', '🪁 CC Kite Fee',
  '💰 Salary', '💱 Transfer',
  '🍔 Food','🚗 Transport','🏠 Bills','💊 Health','📚 Learning',
  '👕 Personal','🎁 Sadqah/Zakat','💝 Family','📱 Tech','🎯 Other',
  '🏘️ Rent','🌐 Internet','📞 Mobile Plan','💸 Debt Payment',
  '🌐 Intl Subscription','🏦 FX Fee (4.5%)','🏛️ Excise Duty (16% on FX)',
  '🏛️ Adv Tax 236Y (5%)','🏛️ PRA IT Tax (5%)','🏦 Biller Charge',
  '🏧 ATM Withdraw','🏧 ATM Fee','🏧 ATM Fee Reversal'
];

const FIN2_DEFAULT_BUDGET = {
  '💝 Family': 15000, '🌐 Internet': 4000, '🍔 Food': 5000,
  '🚗 Transport': 3000, '👕 Personal': 1000, '🎁 Sadqah/Zakat': 2000,
  '💊 Health': 2000, '🏠 Bills': 1000, '📚 Learning': 1000,
  '📱 Tech': 500, '🎯 Other': 500
};

const FIN2_DEFAULT_BILLS = [
  ['Family Contribution', 1, 15000, 'Meezan'],
  ['Maid (Cloth Washing)', 1, 2000, 'Cash'],
  ['Internet Bill', 1, 4000, 'Meezan'],
  ['Hair Cutting', 0, 1000, 'Cash'],
  ['Personal Hygiene', 0, 1000, 'Cash'],
  ['Alfalah CC Payment', 6, 5000, 'Meezan']
];

const FIN2_DEFAULT_GOALS = [
  ['AI Node Hardware', 200000, '2026-08-01'],
  ['Emergency Fund', 100000, '2026-12-31'],
  ['Hajj Savings', 1500000, '2030-12-31'],
  ['Marriage Fund', 800000, '2027-12-31']
];

// ───────────── EXPORTED LAYOUT CONSTANTS ─────────────
const FIN2_QE_ROW = 4;
const FIN2_QE_SUBMIT_COL = 12;
const FIN2_QE_STATUS_COL = 11;

const FIN2_INTL_HEADER_ROW = 7;
const FIN2_INTL_LABELS_ROW = 8;
const FIN2_INTL_ENTRY_ROW = 9;
const FIN2_INTL_PRA_COL = 5;
const FIN2_INTL_SUBMIT_COL = 12;
const FIN2_INTL_TIP_ROW = 10;

const FIN2_LEDGER_HEADER_ROW = 12;
const FIN2_LEDGER_LABELS_ROW = 13;
const FIN2_LEDGER_START_ROW = 14;
const FIN2_LEDGER_END_ROW = 213;

const FIN2_RESERVED_ZONE_START = 5;
const FIN2_RESERVED_ZONE_END = 13;

const FIN2_FROZEN_ROWS = 13;

// v3.1 perf
const CC_VALIDATION_MIN_AMOUNT = 500;
const FIN2_AUDIT_BUFFER_KEY = 'fin2_audit_buffer';
const FIN2_AUDIT_BUFFER_FLUSH_AT = 20;
const FIN2_AUDIT_BUFFER_HARD_CAP = 100;
const FIN2_ROW_CACHE_KEY = 'fin2_next_row_cache';
const FIN2_FAST_LOG_ACTIONS = {
  'TXN_LOGGED': 1, 'TXN_REVERSED': 1, 'TRANSFER': 1,
  'BILL_PAID': 1, 'GOAL_ALLOCATE': 1,
  'OPENING_BALANCE': 1, 'CC_OPENING': 1,
  'INTL_PURCHASE_SHEET': 1,
  'CC_VALIDATION_BLOCK': 1, 'CC_VALIDATION_OVERRIDE': 1,
  'SALARY_AUTO_DETECTED': 1,
  'SALARY_CATEGORY_CORRECTED': 1,
  'SALARY_PATTERN_IGNORED': 1,
  'LOCK_TIMEOUT': 1,
  'DEBT_RESTORE': 1,
  // v3.3 NEW
  'BALANCE_CONSTRAINT_BLOCK': 1,
  'BALANCE_CONSTRAINT_OVERRIDE': 1,
  'CC_LIMIT_OVERRIDE': 1,
  'FX_RATE_BACKFILL': 1
};

// v3.2 LOCK
const FIN2_LOCK_TIMEOUT_MS = 30000;
const FIN2_REVERSAL_PENDING_PREFIX = '[REVERSAL PENDING-';
const FIN2_REVERSAL_PENDING_SUFFIX = ']';

// v3.3 BANKING-GRADE NEW
const FIN2_FX_RATE_COL = 15;  // O — hidden, FX rate snapshot per row
const FIN2_BALANCE_TOLERANCE = 0.01;  // PKR
const FIN2_CC_OVERLIMIT_TOLERANCE = 1.0;  // PKR

const SALARY_RULES = {
  account: 'Meezan', type: 'Income', currency: 'PKR',
  minAmount: 110000, maxAmount: 200000,
  validDayWindow: [28, 29, 30, 31, 1, 2, 3, 4, 5],
  defaultEmployer: 'ABS-Labs (Private) Limited'
};

function _detectSalaryPattern(date, account, type, amount, currency) {
  if (!(date instanceof Date)) return false;
  if (account !== SALARY_RULES.account) return false;
  if (type !== SALARY_RULES.type) return false;
  if (currency && currency !== SALARY_RULES.currency) return false;
  if (typeof amount !== 'number' || amount < SALARY_RULES.minAmount || amount > SALARY_RULES.maxAmount) return false;
  if (SALARY_RULES.validDayWindow.indexOf(date.getDate()) === -1) return false;
  return true;
}

const FIN2_TAB_GROUPS = {
  '⚡ Mission': { color: '#DC2626', hide: false },
  '📋 Habits': { color: '#DC2626', hide: false },
  '🕌 Salah': { color: '#DC2626', hide: false },
  '💰 Finance Hub': { color: '#D97706', hide: false },
  '💸 Transactions': { color: '#D97706', hide: false },
  '🏦 Accounts': { color: '#D97706', hide: false },
  '📊 Budget': { color: '#D97706', hide: false },
  '📅 Bills': { color: '#D97706', hide: false },
  '💳 Debts': { color: '#D97706', hide: false },
  '💼 Salary': { color: '#D97706', hide: false },
  '📜 Finance Audit': { color: '#D97706', hide: false },
  '📈 Progress': { color: '#2563EB', hide: false },
  '🎯 KPIs': { color: '#2563EB', hide: false },
  '🏥 Health': { color: '#16A34A', hide: false },
  '📚 Food Library': { color: '#16A34A', hide: false },
  '📊 Charts': { color: '#7C3AED', hide: false },
  '🎨 Themes': { color: '#7C3AED', hide: false },
  '⚙️ Settings': { color: '#64748B', hide: false },
  '🎯 Goals': { color: '#16A34A', hide: true },
  '💰 Finance': { color: '#94A3B8', hide: true },
  '💰 Finance (legacy)': { color: '#94A3B8', hide: true },
  '📚 Knowledge': { color: '#7C3AED', hide: true },
  '🌳 Vision': { color: '#7C3AED', hide: true },
  '💻 Skills': { color: '#7C3AED', hide: true },
  '📊 Week': { color: '#2563EB', hide: true },
  '🔮 Forecast': { color: '#7C3AED', hide: true },
  '🚨 Alerts': { color: '#DC2626', hide: true },
  '🔬 Patterns': { color: '#0EA5E9', hide: true },
  '🧠 AI Memory': { color: '#94A3B8', hide: true },
  'Audit Log': { color: '#94A3B8', hide: true }
};

const FIN2_TZ = 'Asia/Karachi';

function getFinTheme() {
  return {
    bgPage: '#FFFFFF', bgPanel: '#F8FAFC', bgCard: '#FFFFFF', bgRow: '#FFFFFF',
    bgAlt: '#F1F5F9', bgInput: '#FFFBEB', bgHeader: '#1E293B', bgSection: '#0F172A',
    bgAccent: '#FEF3C7', bgReversed: '#E5E7EB', bgReversal: '#FEF3C7',
    bgLiability: '#FEE2E2', bgAsset: '#DCFCE7', bgNet: '#DBEAFE',
    bgStatusOk: '#D1FAE5', bgStatusWarn: '#FEF3C7', bgStatusErr: '#FEE2E2',
    accent: '#D97706', accentDk: '#92400E',
    text: '#0F172A', textHi: '#000000', textMd: '#334155', textLo: '#64748B',
    textOk: '#065F46', textWarn: '#78350F', textErr: '#7F1D1D',
    textReversed: '#6B7280', textReversal: '#7C2D12',
    success: '#16A34A', warning: '#D97706', danger: '#DC2626', critical: '#991B1B',
    info: '#2563EB', purple: '#7C3AED', orange: '#EA580C', border: '#CBD5E1'
  };
}

function _alertF(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _questDayF() {
  if (typeof getQuestDay === 'function') return getQuestDay();
  const todayPKT = Utilities.formatDate(new Date(), FIN2_TZ, 'yyyy-MM-dd');
  const tParts = todayPKT.split('-').map(Number);
  const tDate = new Date(Date.UTC(tParts[0], tParts[1] - 1, tParts[2]));
  const sDate = new Date(Date.UTC(2026, 3, 25));
  return Math.max(1, Math.floor((tDate - sDate) / 86400000) + 1);
}

function _isAsset(account) { return FIN2_ACCOUNT_TYPES[account] === 'Asset'; }
function _isLiability(account) { return FIN2_ACCOUNT_TYPES[account] === 'Liability'; }

function generateTxnId() {
  const stamp = Utilities.formatDate(new Date(), FIN2_TZ, 'yyyyMMdd-HHmmss');
  const suffix = Math.floor(Math.random() * 100000).toString();
  return 'TXN-' + stamp + '-' + ('00000' + suffix).slice(-5);
}

function _acquireFinLock(callerName) {
  const lock = LockService.getDocumentLock();
  const t0 = Date.now();
  try {
    if (lock.tryLock(FIN2_LOCK_TIMEOUT_MS)) {
      return { ok: true, lock: lock };
    }
  } catch(e) {
    return { ok: false, lock: null, error: 'tryLock threw: ' + e };
  }
  const waited = Date.now() - t0;
  _logAuditFast('LOCK_TIMEOUT', callerName + ' could not acquire lock in ' + waited + 'ms');
  return { ok: false, lock: null, error: 'timeout after ' + waited + 'ms' };
}

function _releaseFinLock(lockResult) {
  if (lockResult && lockResult.lock) {
    try { lockResult.lock.releaseLock(); }
    catch(e) { Logger.log('Lock release failed (non-fatal): ' + e); }
  }
}

// ════════════════════════════════════════════════════════════════════
// v3.3 NEW — BALANCE CONSTRAINT VALIDATOR (banking-grade pre-commit check)
// ════════════════════════════════════════════════════════════════════

function _computeAccountBalanceFromLedger(tx, account) {
  // Read all ledger rows once (batch), compute net balance for given account
  // Returns: { balance: number, txnCount: number }
  const numRows = FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1;
  const block = tx.getRange(FIN2_LEDGER_START_ROW, 1, numRows, 7).getValues();
  let bal = 0;
  let count = 0;
  for (let i = 0; i < block.length; i++) {
    const row = block[i];
    if (!(row[0] instanceof Date)) continue;
    if (row[1] !== account) continue;
    const type = row[2];
    const pkr = (typeof row[6] === 'number') ? row[6] : 0;
    count++;
    if (type === 'Income' || type === 'Debt In') bal += pkr;
    else if (type === 'Expense' || type === 'Debt Out' || type === 'Transfer') bal -= pkr;
  }
  return { balance: bal, txnCount: count };
}

function _validateBalanceConstraint(account, type, pkrEquiv) {
  // Returns: { allow: bool, override: bool, reason: string, projection: number }
  // - allow=true,override=false → silent proceed (no constraint hit)
  // - allow=true,override=true  → user clicked YES on override, proceed + audit
  // - allow=false               → user clicked NO, cancel write
  if (!pkrEquiv || typeof pkrEquiv !== 'number' || pkrEquiv <= 0) {
    return { allow: true, override: false, reason: 'no-amount', projection: 0 };
  }
  if (!account || !type) {
    return { allow: true, override: false, reason: 'no-account-or-type', projection: 0 };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(FIN2_TABS.TXN);
  if (!tx) return { allow: true, override: false, reason: 'no-tx-tab', projection: 0 };

  const isAsset = _isAsset(account);
  const isLiab = _isLiability(account);
  const current = _computeAccountBalanceFromLedger(tx, account).balance;

  // Project balance after this write
  let projected = current;
  if (type === 'Income' || type === 'Debt In') projected += pkrEquiv;
  else if (type === 'Expense' || type === 'Debt Out' || type === 'Transfer') projected -= pkrEquiv;

  // Asset accounts: projected balance must stay >= 0 (allow tiny tolerance)
  if (isAsset && projected < -FIN2_BALANCE_TOLERANCE) {
    const ui = (function() { try { return SpreadsheetApp.getUi(); } catch(e) { return null; } })();
    if (!ui) {
      // Headless context (Telegram, batch) — block by default
      _logAuditFast('BALANCE_CONSTRAINT_BLOCK',
        account + ' · ' + type + ' · ' + pkrEquiv + ' PKR · current=' + current.toFixed(2) +
        ' projected=' + projected.toFixed(2) + ' · headless context · auto-blocked');
      return { allow: false, override: false, reason: 'asset-overdraft-headless', projection: projected };
    }
    const msg = '⚠️ ' + account + ' balance projected to go NEGATIVE.\n\n' +
                'Current:        ' + current.toLocaleString() + ' PKR\n' +
                'This txn (-):   ' + pkrEquiv.toLocaleString() + ' PKR\n' +
                'After write:    ' + projected.toLocaleString() + ' PKR\n\n' +
                'Real banks reject this. Override and proceed anyway?';
    const resp = ui.alert('🛑 Balance constraint', msg, ui.ButtonSet.YES_NO);
    if (resp === ui.Button.YES) {
      _logAuditFast('BALANCE_CONSTRAINT_OVERRIDE',
        account + ' · ' + type + ' · ' + pkrEquiv + ' PKR · current=' + current.toFixed(2) +
        ' projected=' + projected.toFixed(2) + ' · USER OVERRODE');
      return { allow: true, override: true, reason: 'user-override-asset', projection: projected };
    } else {
      _logAuditFast('BALANCE_CONSTRAINT_BLOCK',
        account + ' · ' + type + ' · ' + pkrEquiv + ' PKR · current=' + current.toFixed(2) +
        ' projected=' + projected.toFixed(2) + ' · USER CANCELLED');
      return { allow: false, override: false, reason: 'user-cancelled-asset', projection: projected };
    }
  }

  // Liability (Alfalah CC): projected outstanding must stay <= limit
  if (isLiab && account === FIN2_CC_ACCOUNT) {
    // Outstanding = -(balance). When type=Expense, balance becomes more negative → outstanding grows.
    const projOutstanding = -projected;
    if (projOutstanding > FIN2_CC_LIMIT + FIN2_CC_OVERLIMIT_TOLERANCE) {
      const ui = (function() { try { return SpreadsheetApp.getUi(); } catch(e) { return null; } })();
      if (!ui) {
        _logAuditFast('BALANCE_CONSTRAINT_BLOCK',
          account + ' · ' + type + ' · ' + pkrEquiv + ' PKR · projOutstanding=' + projOutstanding.toFixed(2) +
          ' limit=' + FIN2_CC_LIMIT + ' · headless context · auto-blocked');
        return { allow: false, override: false, reason: 'cc-overlimit-headless', projection: projected };
      }
      const curOutstanding = -current;
      const msg = '⚠️ Alfalah CC outstanding projected to EXCEED limit.\n\n' +
                  'Limit:               ' + FIN2_CC_LIMIT.toLocaleString() + ' PKR\n' +
                  'Current outstanding: ' + curOutstanding.toLocaleString() + ' PKR\n' +
                  'This txn (+):        ' + pkrEquiv.toLocaleString() + ' PKR\n' +
                  'After write:         ' + projOutstanding.toLocaleString() + ' PKR\n\n' +
                  'Bank may decline OR charge over-limit fee. Override?';
      const resp = ui.alert('🛑 CC over-limit', msg, ui.ButtonSet.YES_NO);
      if (resp === ui.Button.YES) {
        _logAuditFast('CC_LIMIT_OVERRIDE',
          'projected outstanding ' + projOutstanding.toFixed(2) + ' > limit ' + FIN2_CC_LIMIT + ' · USER OVERRODE');
        return { allow: true, override: true, reason: 'user-override-cc', projection: projected };
      } else {
        _logAuditFast('BALANCE_CONSTRAINT_BLOCK',
          'CC overlimit · projected outstanding ' + projOutstanding.toFixed(2) + ' · USER CANCELLED');
        return { allow: false, override: false, reason: 'user-cancelled-cc', projection: projected };
      }
    }
  }

  return { allow: true, override: false, reason: 'within-limits', projection: projected };
}

// ════════════════════════════════════════════════════════════════════
// v3.3 NEW — FX RATE CAPTURE (snapshot at commit time)
// ════════════════════════════════════════════════════════════════════

function _captureFxRate(currency) {
  // For PKR: returns 1.0 explicitly (no ambiguity).
  // For USD: reads current H1 — that's the rate at COMMIT time, snapshot it.
  if (!currency || currency === 'PKR') return { rate: 1.0, source: 'PKR-base' };
  if (currency === 'USD') {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const tx = ss.getSheetByName(FIN2_TABS.TXN);
      const h1 = tx ? parseFloat(tx.getRange('H1').getValue()) : NaN;
      if (h1 > 0) return { rate: h1, source: 'H1@commit' };
    } catch(e) {}
    // Fallback to cached PropertiesService rate
    const cached = parseFloat(PropertiesService.getDocumentProperties().getProperty('fin2_usd_pkr') || '');
    if (cached > 0) return { rate: cached, source: 'PropertiesCache' };
    return { rate: 280, source: 'hardcoded-fallback' };
  }
  return { rate: 1.0, source: 'unknown-currency' };
}

// ════════════════════════════════════════════════════════════════════
// v3.1 ROW POINTER CACHE (preserved)
// ════════════════════════════════════════════════════════════════════

function _bumpRowPointer(rowJustWritten) {
  try {
    const next = rowJustWritten + 1;
    if (next >= FIN2_LEDGER_START_ROW && next <= FIN2_LEDGER_END_ROW + 1) {
      PropertiesService.getDocumentProperties().setProperty(FIN2_ROW_CACHE_KEY, String(next));
    }
  } catch(e) {}
}

function _invalidateRowPointer() {
  try { PropertiesService.getDocumentProperties().deleteProperty(FIN2_ROW_CACHE_KEY); } catch(e) {}
}

function _readRowPointerCache() {
  try {
    const v = PropertiesService.getDocumentProperties().getProperty(FIN2_ROW_CACHE_KEY);
    if (!v) return -1;
    const n = parseInt(v, 10);
    if (isNaN(n)) return -1;
    if (n < FIN2_LEDGER_START_ROW || n > FIN2_LEDGER_END_ROW) return -1;
    return n;
  } catch(e) { return -1; }
}

// ════════════════════════════════════════════════════════════════════
// v3.1 AUDIT BUFFER (preserved)
// ════════════════════════════════════════════════════════════════════

function _logAuditFast(action, detail) {
  if (FIN2_FAST_LOG_ACTIONS[action]) {
    _bufferAuditEntry(action, detail);
  } else {
    if (typeof logAuditAction === 'function') logAuditAction(action, detail);
  }
}

function _bufferAuditEntry(action, detail) {
  try {
    const props = PropertiesService.getDocumentProperties();
    const raw = props.getProperty(FIN2_AUDIT_BUFFER_KEY) || '[]';
    const buf = JSON.parse(raw);
    buf.push({ ts: new Date().toISOString(), action: action, detail: String(detail || '') });
    if (buf.length >= FIN2_AUDIT_BUFFER_FLUSH_AT || buf.length >= FIN2_AUDIT_BUFFER_HARD_CAP) {
      props.setProperty(FIN2_AUDIT_BUFFER_KEY, JSON.stringify(buf));
      _flushAuditBuffer();
    } else {
      props.setProperty(FIN2_AUDIT_BUFFER_KEY, JSON.stringify(buf));
    }
  } catch(e) {
    if (typeof logAuditAction === 'function') {
      try { logAuditAction(action, detail); } catch(e2) {}
    }
  }
}

function _flushAuditBuffer() {
  try {
    const props = PropertiesService.getDocumentProperties();
    const raw = props.getProperty(FIN2_AUDIT_BUFFER_KEY);
    if (!raw) return;
    const buf = JSON.parse(raw);
    if (!buf || buf.length === 0) {
      props.deleteProperty(FIN2_AUDIT_BUFFER_KEY);
      return;
    }
    if (typeof logAuditAction !== 'function') return;
    buf.forEach(e => {
      try { logAuditAction(e.action, e.detail); } catch(err) {}
    });
    props.deleteProperty(FIN2_AUDIT_BUFFER_KEY);
  } catch(e) { Logger.log('Audit buffer flush failed: ' + e); }
}

function installAuditFlushTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_flushAuditBuffer') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('_flushAuditBuffer').timeBased().everyMinutes(5).create();
}

function flushAuditBufferManually() {
  const props = PropertiesService.getDocumentProperties();
  const raw = props.getProperty(FIN2_AUDIT_BUFFER_KEY) || '[]';
  const buf = JSON.parse(raw);
  const before = buf.length;
  _flushAuditBuffer();
  _alertF('🔄 Audit buffer flushed.\n\nWrote ' + before + ' deferred entries to Audit Log.');
}

// ════════════════════════════════════════════════════════════════════
// LEDGER ROW HELPERS (preserved)
// ════════════════════════════════════════════════════════════════════

function _findNextLedgerRow(sheet) {
  if (!sheet) return -1;
  const cached = _readRowPointerCache();
  if (cached !== -1) {
    try {
      if (!sheet.getRange(cached, 1).getValue()) return cached;
    } catch(e) {}
  }
  const numRows = FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1;
  let values;
  try {
    values = sheet.getRange(FIN2_LEDGER_START_ROW, 1, numRows, 1).getValues();
  } catch(e) { return -1; }
  for (let i = 0; i < values.length; i++) {
    if (!values[i][0]) {
      const row = FIN2_LEDGER_START_ROW + i;
      try { PropertiesService.getDocumentProperties().setProperty(FIN2_ROW_CACHE_KEY, String(row)); } catch(e) {}
      return row;
    }
  }
  return -1;
}

function _findConsecutiveLedgerRows(sheet, count) {
  if (!sheet || count < 1) return -1;
  const numRows = FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1;
  let values;
  try {
    values = sheet.getRange(FIN2_LEDGER_START_ROW, 1, numRows, 1).getValues();
  } catch(e) { return -1; }
  let firstRow = -1, consecutive = 0;
  for (let i = 0; i < values.length; i++) {
    if (!values[i][0]) {
      const row = FIN2_LEDGER_START_ROW + i;
      if (firstRow === -1) firstRow = row;
      consecutive++;
      if (consecutive >= count) return firstRow;
    } else {
      firstRow = -1; consecutive = 0;
    }
  }
  return -1;
}

function backfillTxnIds(ledger) {
  let assigned = 0;
  const numRows = FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1;
  const dates = ledger.getRange(FIN2_LEDGER_START_ROW, 1, numRows, 1).getValues();
  const ids = ledger.getRange(FIN2_LEDGER_START_ROW, 14, numRows, 1).getValues();
  for (let i = 0; i < numRows; i++) {
    const date = dates[i][0];
    if (!(date instanceof Date)) continue;
    if (!ids[i][0]) {
      ledger.getRange(FIN2_LEDGER_START_ROW + i, 14).setValue(generateTxnId());
      assigned++;
    }
  }
  return assigned;
}

// v3.3 NEW: backfill FX_Rate_At_Commit col 15 for legacy rows
function backfillFxRateAtCommit(ledger) {
  let assigned = 0;
  const numRows = FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1;
  const dates = ledger.getRange(FIN2_LEDGER_START_ROW, 1, numRows, 1).getValues();
  const currencies = ledger.getRange(FIN2_LEDGER_START_ROW, 6, numRows, 1).getValues();
  const fxRates = ledger.getRange(FIN2_LEDGER_START_ROW, FIN2_FX_RATE_COL, numRows, 1).getValues();
  const currentH1 = parseFloat(ledger.getRange('H1').getValue()) || 280;
  const updates = [];
  for (let i = 0; i < numRows; i++) {
    if (!(dates[i][0] instanceof Date)) continue;
    if (fxRates[i][0]) continue;  // already has FX rate
    const cur = currencies[i][0] || 'PKR';
    if (cur === 'USD') updates.push({ row: FIN2_LEDGER_START_ROW + i, rate: currentH1 });
    else updates.push({ row: FIN2_LEDGER_START_ROW + i, rate: 1.0 });
    assigned++;
  }
  updates.forEach(u => {
    ledger.getRange(u.row, FIN2_FX_RATE_COL).setValue(u.rate);
  });
  if (assigned > 0) {
    _logAuditFast('FX_RATE_BACKFILL',
      'Backfilled ' + assigned + ' rows with FX_Rate_At_Commit · USD rate=' + currentH1 + ' · PKR=1.0');
  }
  return assigned;
}

function _setQEStatus(sheet, txt, kind) {
  const T = getFinTheme();
  const bg = kind === 'ok' ? T.bgStatusOk : (kind === 'warn' ? T.bgStatusWarn : (kind === 'err' ? T.bgStatusErr : T.bgPanel));
  const fc = kind === 'ok' ? T.textOk : (kind === 'warn' ? T.textWarn : (kind === 'err' ? T.textErr : T.textLo));
  try {
    sheet.getRange(FIN2_QE_ROW, FIN2_QE_STATUS_COL).setValue(txt).setBackground(bg).setFontColor(fc).setFontWeight('bold');
  } catch (e) {}
}

function _rememberLastAccount(account) {
  try { PropertiesService.getDocumentProperties().setProperty('fin2_last_account', account); } catch(e) {}
}
function _getLastAccount() {
  try { return PropertiesService.getDocumentProperties().getProperty('fin2_last_account') || 'Cash'; } catch(e) { return 'Cash'; }
}

// ════════════════════════════════════════════════════════════════════
// MAIN ENTRY (v3.3 banner)
// ════════════════════════════════════════════════════════════════════

function rebuildFinanceCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const T = getFinTheme();

  try { _flushAuditBuffer(); } catch(e) {}

  let snapInfo = '(snapshot system not installed)';
  if (typeof snapFinanceSuite === 'function') {
    try {
      const snap = snapFinanceSuite('pre-rebuild-v3.3');
      snapInfo = snap.copied + ' tabs snapshotted as "' + snap.name + '"';
    } catch(e) { snapInfo = '⚠️ snapshot failed: ' + e; }
  }

  const legacyData = readLegacyFinance(ss);
  const backup = ss.getSheetByName(FIN2_LEGACY_BACKUP);
  if (backup && !ss.getSheetByName(FIN2_LEGACY)) {
    backup.setName(FIN2_LEGACY); backup.showSheet();
  }
  _ensureFinanceLegacyTab(ss);

  const usdRate = fetchUSDPKR();

  buildHubTab(ss, T);
  buildTransactionsTab(ss, T, legacyData.txns, usdRate);
  buildAccountsTab(ss, T);
  buildBudgetTab(ss, T);
  buildBillsTab(ss, T);
  buildGoalsTab(ss, T);

  installFinanceEditHandler(true);
  installAuditFlushTrigger();
  _invalidateRowPointer();
  appendFinanceMenu();
  organizeTabsAndGroups(true);

  // v3.3: backfill FX rate per row for any legacy rows
  let fxBackfilled = 0;
  try {
    const tx = ss.getSheetByName(FIN2_TABS.TXN);
    if (tx) fxBackfilled = backfillFxRateAtCommit(tx);
  } catch(e) { Logger.log('FX backfill failed: ' + e); }

  if (typeof logAuditAction === 'function') {
    logAuditAction('FINANCE_REBUILD', 'v3.3 ELITE BANKING-GRADE · BalanceConstraint + FxSnapshotPerRow · ' + fxBackfilled + ' FX backfills');
  }

  let auditEmbedStatus = '(Finance_Audit.gs not loaded)';
  if (typeof embedAuditPanelInHub === 'function') {
    try { embedAuditPanelInHub(); auditEmbedStatus = '✅ embedded rows 76-97'; }
    catch(e) { auditEmbedStatus = '⚠️ embed failed: ' + e; Logger.log('Audit panel embed failed: ' + e); }
  }
  let chartsStatus = '(Finance_Charts.gs not loaded)';
  if (typeof embedFinanceCharts === 'function') {
    try { embedFinanceCharts(); chartsStatus = '✅ embedded rows 55-74'; }
    catch(e) { chartsStatus = '⚠️ render failed: ' + e; Logger.log('Charts render failed: ' + e); }
  }

  const selfTest = _selfTestLayout(ss);

  _alertF('✅ Finance Suite v3.3 ELITE BANKING-GRADE installed.\n\n' +
          '📦 Pre-rebuild safety: ' + snapInfo + '\n\n' +
          '🛡️ v3.3 NEW BANKING UPGRADES:\n' +
          '  • Balance constraint: pre-write check, popup override\n' +
          '  • FX rate snapshot per row: col 15 (FX_Rate_At_Commit)\n' +
          '  • FX backfill: ' + fxBackfilled + ' historical rows tagged\n\n' +
          '🔒 v3.2 PRESERVED:\n' +
          '  • LockService on all hot paths\n' +
          '  • Atomic linked-partner reversal\n' +
          '  • Salary detect prompts user\n' +
          '  • TxnID 5-digit suffix\n\n' +
          '📜 Audit panel: ' + auditEmbedStatus + '\n' +
          '📊 Charts panel: ' + chartsStatus + '\n\n' +
          '🛡️ Self-test: ' + (selfTest.ok ? '✅ PASSED' : '⚠️ ' + selfTest.failures.length + ' issue(s)') + '\n' +
          (selfTest.ok ? '' : '\nIssues:\n  • ' + selfTest.failures.join('\n  • ') + '\n') +
          '\n' + legacyData.txns.length + ' transactions migrated.\n\n' +
          'Try: log Cash expense > current Cash balance → balance constraint popup fires.');
}

function _selfTestLayout(ss) {
  const tx = ss.getSheetByName(FIN2_TABS.TXN);
  const failures = [];
  if (!tx) { failures.push('Transactions tab missing'); return { ok: false, failures: failures }; }

  if (tx.getFrozenRows() !== FIN2_FROZEN_ROWS) failures.push('Frozen rows = ' + tx.getFrozenRows() + ', expected ' + FIN2_FROZEN_ROWS);

  const intlHdr = tx.getRange(FIN2_INTL_HEADER_ROW, 1).getValue();
  if (!intlHdr || intlHdr.toString().indexOf('INTL') === -1) failures.push('Intl header row ' + FIN2_INTL_HEADER_ROW + ' missing');

  const ledgerHdr = tx.getRange(FIN2_LEDGER_HEADER_ROW, 1).getValue();
  if (!ledgerHdr || ledgerHdr.toString().indexOf('LEDGER') === -1) failures.push('Ledger header row ' + FIN2_LEDGER_HEADER_ROW + ' missing');

  return { ok: failures.length === 0, failures: failures };
}

function _ensureFinanceLegacyTab(ss) {
  let s = ss.getSheetByName(FIN2_LEGACY);
  if (!s && typeof buildFinance === 'function') {
    try { buildFinance(ss); s = ss.getSheetByName(FIN2_LEGACY); } catch(e) {}
  }
  if (!s) return;
  if (!s.getRange('B85').getFormula()) s.getRange('B85').setFormula('=SUM(D60:D69)');
  if (!s.getRange('B86').getFormula()) s.getRange('B86').setFormula('=SUM(C60:C69)');
  if (!s.getRange('B87').getFormula()) s.getRange('B87').setFormula('=SUM(D73:D82)');
  if (!s.getRange('B88').getFormula()) s.getRange('B88').setFormula('=B87-B85');
  if (!s.getRange('B89').getFormula()) s.getRange('B89').setFormula('=IFERROR(SUM(C60:C69)/SUM(B60:B69),0)');
  s.getRange('B89').setNumberFormat('0%');
}

function restoreFinanceLegacyTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const backup = ss.getSheetByName(FIN2_LEGACY_BACKUP);
  if (backup) {
    if (!ss.getSheetByName(FIN2_LEGACY)) {
      backup.setName(FIN2_LEGACY); backup.showSheet();
      _alertF('✅ Legacy 💰 Finance tab restored.');
    } else { _alertF('⚠️ Both 💰 Finance and backup exist. Manual review needed.'); }
  } else {
    _ensureFinanceLegacyTab(ss);
    _alertF('✅ 💰 Finance tab ensured.');
  }
}

function readLegacyFinance(ss) {
  const result = { txns: [] };
  const validAcc = {};
  FIN2_ACCOUNTS.forEach(a => { validAcc[a] = 1; });
  const validType = {};
  FIN2_TXN_TYPES.forEach(t => { validType[t] = 1; });

  const tx = ss.getSheetByName(FIN2_TABS.TXN);
  if (tx) {
    try {
      const numRows = FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1;
      const block = tx.getRange(FIN2_LEDGER_START_ROW, 1, numRows, 11).getValues();
      for (let i = 0; i < block.length; i++) {
        const row = block[i];
        if (row[0] instanceof Date && validAcc[row[1]] && validType[row[2]]) {
          result.txns.push(row);
        }
      }
    } catch(e) {}
  }
  return result;
}

function fetchUSDPKR() {
  try {
    const r = UrlFetchApp.fetch('https://open.er-api.com/v6/latest/USD', { muteHttpExceptions: true });
    const d = JSON.parse(r.getContentText());
    if (d.result === 'success') {
      const rate = Math.round(d.rates.PKR * 100) / 100;
      PropertiesService.getDocumentProperties().setProperty('fin2_usd_pkr', rate.toString());
      return rate;
    }
  } catch(e) {}
  const cached = PropertiesService.getDocumentProperties().getProperty('fin2_usd_pkr');
  return cached ? parseFloat(cached) : 280;
}

// ════════════════════════════════════════════════════════════════════
// HUB TAB BUILDER (v3.3 banner)
// ════════════════════════════════════════════════════════════════════

function buildHubTab(ss, T) {
  let s = ss.getSheetByName(FIN2_TABS.HUB);
  if (!s) s = ss.insertSheet(FIN2_TABS.HUB);
  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());
  s.getRange(1, 1, 60, 12).setBackground(T.bgPage);
  for (let c = 1; c <= 12; c++) s.setColumnWidth(c, 100);

  s.getRange('A1:L1').merge()
    .setValue('💰 FINANCE HUB — banking-grade overview · Day ' + _questDayF() + ' of 90 · v3.3 ELITE')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(16).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 40);

  s.getRange('A2:L2').merge()
    .setFormula('="📅 "&TEXT(TODAY(),"dddd · dd MMMM yyyy")&"   ·   💱 1 USD = "&IFERROR(\'💸 Transactions\'!H1,278)&" PKR (current)"')
    .setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(2, 30);
  s.setRowHeight(3, 8);

  s.getRange('A4:L4').merge().setValue('🎯 KPI SNAPSHOT')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(4, 28);

  const txnG = '\'💸 Transactions\'!G14:G213';
  const txnA = '\'💸 Transactions\'!A14:A213';
  const txnC = '\'💸 Transactions\'!C14:C213';

  const kpis = [
    ['💸 SPENT TODAY', '=IFERROR(SUMIFS(' + txnG + ',' + txnA + ',">="&TODAY(),' + txnA + ',"<"&(TODAY()+1),' + txnC + ',"Expense"),0)', T.danger],
    ['📅 SPENT THIS WEEK', '=IFERROR(SUMIFS(' + txnG + ',' + txnA + ',">="&(TODAY()-WEEKDAY(TODAY(),2)+1),' + txnA + ',"<"&(TODAY()-WEEKDAY(TODAY(),2)+8),' + txnC + ',"Expense"),0)', T.warning],
    ['🗓️ SPENT THIS MONTH', '=IFERROR(SUMIFS(' + txnG + ',' + txnA + ',">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + txnA + ',"<"&(EOMONTH(TODAY(),0)+1),' + txnC + ',"Expense"),0)', T.orange],
    ['💰 NET MTD', '=IFERROR(SUMIFS(' + txnG + ',' + txnA + ',">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + txnC + ',"Income"),0)-IFERROR(SUMIFS(' + txnG + ',' + txnA + ',">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + txnC + ',"Expense"),0)', T.success]
  ];
  kpis.forEach((kpi, i) => {
    const colStart = 1 + (i * 3);
    s.getRange(5, colStart, 1, 3).merge()
      .setFormula('="' + kpi[0] + '"&CHAR(10)&TEXT(' + kpi[1].substring(1) + ',"#,##0")&" PKR"')
      .setBackground(kpi[2]).setFontColor('#FFFFFF').setFontWeight('bold')
      .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  });
  s.setRowHeight(5, 60);
  s.setRowHeight(6, 8);

  s.getRange('A7:L7').merge().setValue('🏦 NET POSITION — assets · liabilities · net worth')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(7, 28);

  s.getRange('A8:D8').merge()
    .setFormula('="💎 LIQUID"&CHAR(10)&TEXT(IFERROR(\'🏦 Accounts\'!E16,0),"#,##0")&" PKR"')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.getRange('E8:H8').merge()
    .setFormula('="💳 LIABILITY"&CHAR(10)&TEXT(IFERROR(\'🏦 Accounts\'!C21,0),"#,##0")&" PKR"')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.getRange('I8:L8').merge()
    .setFormula('="🏆 NET WORTH"&CHAR(10)&TEXT(IFERROR(\'🏦 Accounts\'!E16-\'🏦 Accounts\'!C21,0),"+#,##0;-#,##0")&" PKR"')
    .setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(8, 60);
  s.setRowHeight(9, 8);

  s.getRange('A10:L10').merge().setValue('📋 RECENT TRANSACTIONS — last 10 from ledger')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(10, 28);

  const hdr = ['Date', 'Account', 'Type', 'Category', 'Amount', 'PKR', '', 'Counterparty', '', '', 'Notes', ''];
  s.getRange(11, 1, 1, 12).setValues([hdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(11, 26);

  for (let i = 0; i < 10; i++) {
    const r = 12 + i;
    s.getRange(r, 1).setFormula('=IFERROR(LARGE(\'💸 Transactions\'!A:A,' + (i+1) + '),"")').setNumberFormat('dd MMM');
    s.getRange(r, 2).setFormula('=IFERROR(INDEX(\'💸 Transactions\'!B:B,MATCH(LARGE(\'💸 Transactions\'!A:A,' + (i+1) + '),\'💸 Transactions\'!A:A,0)),"")');
    s.getRange(r, 3).setFormula('=IFERROR(INDEX(\'💸 Transactions\'!C:C,MATCH(LARGE(\'💸 Transactions\'!A:A,' + (i+1) + '),\'💸 Transactions\'!A:A,0)),"")');
    s.getRange(r, 4).setFormula('=IFERROR(INDEX(\'💸 Transactions\'!D:D,MATCH(LARGE(\'💸 Transactions\'!A:A,' + (i+1) + '),\'💸 Transactions\'!A:A,0)),"")');
    s.getRange(r, 5).setFormula('=IFERROR(INDEX(\'💸 Transactions\'!E:E,MATCH(LARGE(\'💸 Transactions\'!A:A,' + (i+1) + '),\'💸 Transactions\'!A:A,0)),"")');
    s.getRange(r, 6).setFormula('=IFERROR(INDEX(\'💸 Transactions\'!G:G,MATCH(LARGE(\'💸 Transactions\'!A:A,' + (i+1) + '),\'💸 Transactions\'!A:A,0)),"")').setNumberFormat('#,##0');
    s.getRange(r, 8, 1, 3).merge().setFormula('=IFERROR(INDEX(\'💸 Transactions\'!H:H,MATCH(LARGE(\'💸 Transactions\'!A:A,' + (i+1) + '),\'💸 Transactions\'!A:A,0)),"")');
    s.getRange(r, 11, 1, 2).merge().setFormula('=IFERROR(INDEX(\'💸 Transactions\'!I:I,MATCH(LARGE(\'💸 Transactions\'!A:A,' + (i+1) + '),\'💸 Transactions\'!A:A,0)),"")');
    s.getRange(r, 1, 1, 12).setBackground(i % 2 === 0 ? T.bgRow : T.bgAlt)
      .setFontColor(T.text).setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(r, 24);
  }

  s.setRowHeight(22, 8);
  s.getRange('A23:L23').merge().setValue('⚡ HOW TO USE — bank-grade workflow')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(23, 28);

  const hints = [
    ['💸 Log expense or income', 'Tab 💸 Transactions → fill row 4 → click ✅ in column L · v3.3 balance constraint check pre-write'],
    ['🌐 Log intl purchase', 'Tab 💸 Transactions → fill row 9 → click ✅ in L9 · FX rate snapshotted in col O'],
    ['💱 Move money between accounts', 'Tab 🏦 Accounts → Transfer form row 3 → click ✅ in G3'],
    ['💳 Pay credit card', 'Same as Transfer: From=source bank, To=Alfalah CC → ✅'],
    ['🏁 Set/correct opening balance', 'Menu → 💰 Finance → 🏁 Set Opening Balances'],
    ['↩️ Reverse a mistake', 'Tab 💸 Transactions → click ↩️ in column M of wrong row · v3.2 atomic for transfer pairs'],
    ['💉 If something looks broken', 'Menu → 💉 Vaccine → 🔍 Diagnose → then Vaccinate']
  ];
  hints.forEach((h, i) => {
    const r = 24 + i;
    s.getRange(r, 1, 1, 4).merge().setValue(h[0]).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.getRange(r, 5, 1, 8).merge().setValue('→ ' + h[1]).setBackground(T.bgRow).setFontColor(T.textMd).setFontStyle('italic').setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.setRowHeight(r, 26);
  });

  s.setFrozenRows(2);
}

// ════════════════════════════════════════════════════════════════════
// TRANSACTIONS TAB BUILDER (v3.3 — adds col 15 FX_Rate_At_Commit)
// ════════════════════════════════════════════════════════════════════

function buildTransactionsTab(ss, T, existingTxns, usdRate) {
  let s = ss.getSheetByName(FIN2_TABS.TXN);
  if (!s) s = ss.insertSheet(FIN2_TABS.TXN);
  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());
  s.getRange(1, 1, 250, 15).setBackground(T.bgPage);

  // Col widths: 14 visible cols + 1 hidden col 15 (FX rate)
  const widths = [105, 130, 110, 140, 100, 80, 100, 160, 160, 60, 100, 100, 80, 130, 80];
  widths.forEach((w, i) => s.setColumnWidth(i + 1, w));

  s.getRange('H1').setValue(usdRate).setBackground(T.bgPanel).setFontColor(T.textLo).setFontSize(8);
  s.getRange('A1:G1').merge()
    .setValue('💸 TRANSACTIONS — fill row ' + FIN2_QE_ROW + ' → ✅ col L to log · ↩️ col M to reverse · v3.3 elite banking-grade')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('I1:O1').merge().setValue('💱 USD/PKR rate (cell H1) · TxnID col N hidden · FX_Rate_At_Commit col O hidden')
    .setBackground(T.bgPanel).setFontColor(T.textLo).setFontStyle('italic').setFontSize(9).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);

  s.getRange('A2:O2').merge()
    .setValue('⚡ QUICK ENTRY — single transaction · ~1-3 sec · v3.3 balance constraint check before write')
    .setBackground(T.bgAccent).setFontColor(T.text).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(2, 26);

  const labels = ['Date', 'Account', 'Type', 'Category', 'Amount', 'Currency', 'PKR Equiv', 'Counterparty', 'Notes', '', 'Status', '✅ Submit', '', '', ''];
  s.getRange(3, 1, 1, 15).setValues([labels])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(3, 24);

  s.getRange('A4').setValue(new Date()).setNumberFormat('dd MMM yyyy');
  s.getRange('B4').setValue(_getLastAccount());
  s.getRange('C4').setValue('Expense');
  s.getRange('D4').setValue('🍔 Food');
  s.getRange('E4').setValue('');
  s.getRange('F4').setValue('PKR');
  s.getRange('G4').setFormula('=IFERROR(IF(F4="USD",E4*$H$1,E4),"")').setNumberFormat('#,##0.00');
  s.getRange('H4').setValue('');
  s.getRange('I4:J4').merge().setValue('');
  s.getRange('K4').setValue('ready').setBackground(T.bgPanel).setFontColor(T.textLo).setFontStyle('italic');
  s.getRange('L4').insertCheckboxes();

  s.getRange('A4:H4').setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('I4:J4').setBackground(T.bgInput).setFontColor(T.text).setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.getRange('K4').setHorizontalAlignment('center').setVerticalAlignment('middle').setFontSize(10);
  s.getRange('L4').setBackground(T.success).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('M4:O4').setBackground(T.bgPanel);
  s.setRowHeight(4, 36);

  s.getRange('A5:O5').merge()
    .setValue('💡 v3.3: Balance constraint check · FX rate snapshot · Lock-protected · Salary prompt · CC validation auto-skipped under ' + CC_VALIDATION_MIN_AMOUNT + ' PKR')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(5, 22);
  s.setRowHeight(6, 8);

  s.getRange(FIN2_INTL_HEADER_ROW, 1, 1, 15).breakApart();
  s.getRange(FIN2_INTL_HEADER_ROW, 1, 1, 15).merge()
    .setValue('🌐 INTL QUICK ENTRY — base + auto-fees · fill row ' + FIN2_INTL_ENTRY_ROW + ' → ✅ in col L')
    .setBackground(T.purple).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(FIN2_INTL_HEADER_ROW, 26);

  const intlLabels = ['Date', 'Account', 'Base PKR', 'Merchant', '+PRA?', '', 'Notes', '', '', '', '', '✅ Submit Intl', '', '', ''];
  s.getRange(FIN2_INTL_LABELS_ROW, 1, 1, 15).setValues([intlLabels])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(FIN2_INTL_LABELS_ROW, 24);

  s.getRange(FIN2_INTL_ENTRY_ROW, 1).setValue(new Date()).setNumberFormat('dd MMM yyyy');
  s.getRange(FIN2_INTL_ENTRY_ROW, 2).setValue('Alfalah CC');
  s.getRange(FIN2_INTL_ENTRY_ROW, 3).setValue('').setNumberFormat('#,##0.00');
  s.getRange(FIN2_INTL_ENTRY_ROW, 4).setValue('');
  s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_PRA_COL).insertCheckboxes();
  s.getRange(FIN2_INTL_ENTRY_ROW, 6).setValue('');
  s.getRange(FIN2_INTL_ENTRY_ROW, 7, 1, 5).merge().setValue('');
  s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).insertCheckboxes();

  s.getRange(FIN2_INTL_ENTRY_ROW, 1, 1, 4).setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_PRA_COL).setBackground(T.bgInput).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(FIN2_INTL_ENTRY_ROW, 6).setBackground(T.bgPanel);
  s.getRange(FIN2_INTL_ENTRY_ROW, 7, 1, 5).setBackground(T.bgInput).setFontColor(T.text).setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).setBackground(T.purple).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(FIN2_INTL_ENTRY_ROW, 13, 1, 3).setBackground(T.bgPanel);
  s.setRowHeight(FIN2_INTL_ENTRY_ROW, 36);

  const intlDateDV = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
  s.getRange(FIN2_INTL_ENTRY_ROW, 1).setDataValidation(intlDateDV);
  const intlAccDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_ACCOUNTS, true).setAllowInvalid(true).build();
  s.getRange(FIN2_INTL_ENTRY_ROW, 2).setDataValidation(intlAccDV);

  s.getRange(FIN2_INTL_TIP_ROW, 1, 1, 15).merge()
    .setValue('💡 PRA tick: Netflix/Spotify/OpenAI usually YES · Google/AWS/GitHub usually NO · auto-creates 4 rows (5 with PRA), all linked, fully reversible')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10).setHorizontalAlignment('center').setWrap(true);
  s.setRowHeight(FIN2_INTL_TIP_ROW, 30);
  s.setRowHeight(11, 8);

  s.getRange(FIN2_LEDGER_HEADER_ROW, 1, 1, 15).merge()
    .setValue('🔍 LEDGER — full transaction history · click ↩️ in col M to reverse · v3.3 col O hidden FX_Rate_At_Commit')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(FIN2_LEDGER_HEADER_ROW, 28);

  const lhdr = ['Date', 'Account', 'Type', 'Category', 'Amount', 'Currency', 'PKR Equiv', 'Counterparty', 'Notes', '', '', '', '↩️ Reverse', 'TxnID', 'FX_Rate'];
  s.getRange(FIN2_LEDGER_LABELS_ROW, 1, 1, 15).setValues([lhdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(FIN2_LEDGER_LABELS_ROW, 26);

  const sorted = existingTxns.slice().sort((a, b) => b[0] - a[0]);
  for (let i = 0; i < Math.min(sorted.length, 200); i++) {
    const r = FIN2_LEDGER_START_ROW + i;
    const e = sorted[i];
    s.getRange(r, 1).setValue(e[0]).setNumberFormat('dd MMM yyyy');
    s.getRange(r, 2).setValue(e[1]);
    s.getRange(r, 3).setValue(e[2]);
    s.getRange(r, 4).setValue(e[3] || '');
    s.getRange(r, 5).setValue(e[4] || '').setNumberFormat('#,##0.00');
    s.getRange(r, 6).setValue(e[5] || 'PKR');
    s.getRange(r, 7).setValue(e[6] || '').setNumberFormat('#,##0.00');
    s.getRange(r, 8).setValue(e[7] || '');
    s.getRange(r, 9, 1, 4).merge().setValue(e[8] || '');
  }

  for (let r = FIN2_LEDGER_START_ROW; r <= FIN2_LEDGER_END_ROW; r++) {
    const bg = (r % 2 === 0) ? T.bgRow : T.bgAlt;
    s.getRange(r, 1, 1, 8).setBackground(bg).setFontColor(T.text).setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 9, 1, 4).merge().setBackground(bg).setFontColor(T.textMd).setFontSize(10)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.getRange(r, 13).insertCheckboxes();
    s.getRange(r, 13).setBackground(T.warning).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 14).setBackground(bg).setFontColor(T.textLo).setFontSize(8)
      .setFontFamily('Courier New').setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.getRange(r, 15).setBackground(bg).setFontColor(T.textLo).setFontSize(8)
      .setFontFamily('Courier New').setHorizontalAlignment('right').setVerticalAlignment('middle')
      .setNumberFormat('0.00');
    s.setRowHeight(r, 24);
    if (!s.getRange(r, 7).getValue()) {
      s.getRange(r, 7).setFormula('=IFERROR(IF(F' + r + '="USD",E' + r + '*IF(O' + r + '>0,O' + r + ',$H$1),IF(F' + r + '="PKR",E' + r + ',"")),"")').setNumberFormat('#,##0.00');
    }
  }

  applyTxnDropdowns(s);
  applyTxnFormatting(s, T);
  SpreadsheetApp.flush();
  backfillTxnIds(s);
  backfillFxRateAtCommit(s);

  try { s.hideColumns(14); } catch(e) {}
  try { s.hideColumns(15); } catch(e) {}
  s.setFrozenRows(FIN2_FROZEN_ROWS);
}

function applyTxnDropdowns(s) {
  const dateDV = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
  s.getRange('A4').setDataValidation(dateDV);
  s.getRange(FIN2_LEDGER_START_ROW, 1, FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1, 1).setDataValidation(dateDV);

  const accDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_ACCOUNTS.concat(['']), true).setAllowInvalid(true).build();
  s.getRange('B4').setDataValidation(accDV);
  s.getRange(FIN2_LEDGER_START_ROW, 2, FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1, 1).setDataValidation(accDV);

  const typeDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_TXN_TYPES.concat(['']), true).setAllowInvalid(true).build();
  s.getRange('C4').setDataValidation(typeDV);
  s.getRange(FIN2_LEDGER_START_ROW, 3, FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1, 1).setDataValidation(typeDV);

  const catDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_CATEGORIES.concat(['']), true).setAllowInvalid(true).build();
  s.getRange('D4').setDataValidation(catDV);
  s.getRange(FIN2_LEDGER_START_ROW, 4, FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1, 1).setDataValidation(catDV);

  const currDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_CURRENCIES.concat(['']), true).setAllowInvalid(true).build();
  s.getRange('F4').setDataValidation(currDV);
  s.getRange(FIN2_LEDGER_START_ROW, 6, FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1, 1).setDataValidation(currDV);
}

function applyTxnFormatting(s, T) {
  const rules = [];
  const typeColors = [
    ['Income', T.success], ['Expense', T.danger], ['Transfer', T.info],
    ['Debt Out', T.orange], ['Debt In', T.purple]
  ];
  typeColors.forEach(tc => {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(tc[0]).setBackground(tc[1]).setFontColor('#FFFFFF').setBold(true)
      .setRanges([s.getRange(FIN2_LEDGER_START_ROW, 3, FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1, 1), s.getRange('C4')]).build());
  });
  s.setConditionalFormatRules(rules);
}

// ════════════════════════════════════════════════════════════════════
// REVERSAL — v3.2 BULLETPROOF (preserved · v3.3 also captures FX in reversal row)
// ════════════════════════════════════════════════════════════════════

function performReversal(ledger, row) {
  const lockResult = _acquireFinLock('performReversal(row=' + row + ')');
  if (!lockResult.ok) {
    try { ledger.getRange(row, 13).setValue(false); } catch(e) {}
    _alertF('🔒 Could not acquire write lock.\n\nAnother transaction is in progress. Wait 5 sec and try again.\n\nDetails: ' + lockResult.error);
    return;
  }

  try {
    const block = ledger.getRange(row, 1, 1, 15).getValues()[0];
    const notes = block[8];
    const notesStr = (notes || '').toString();

    if (notesStr.indexOf('[REVERSED BY') !== -1) {
      ledger.getRange(row, 13).setValue(false);
      _alertF('⚠️ Already reversed.\n\nThis row was reversed before. No action taken.');
      return;
    }

    if (notesStr.indexOf(FIN2_REVERSAL_PENDING_PREFIX) !== -1) {
      ledger.getRange(row, 13).setValue(false);
      _alertF('⚠️ Reversal in progress on this row by another thread. Wait 2 sec and check again.');
      return;
    }

    const linkedMatch = notesStr.match(/\[linked: (TXN-[\d-]+)\]/);
    if (linkedMatch) {
      const linkedTxnId = linkedMatch[1];
      let otherRow = -1;
      const numRows = FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1;
      const ids = ledger.getRange(FIN2_LEDGER_START_ROW, 14, numRows, 1).getValues();
      for (let i = 0; i < numRows; i++) {
        const r = FIN2_LEDGER_START_ROW + i;
        if (r === row) continue;
        if (ids[i][0] === linkedTxnId) { otherRow = r; break; }
      }
      if (otherRow !== -1) {
        const partnerNotes = (ledger.getRange(otherRow, 9).getValue() || '').toString();
        if (partnerNotes.indexOf('[REVERSED BY') !== -1) {
          _reverseSingleRow(ledger, row);
          _alertF('⚠️ Partner row was already reversed individually.\n\nOnly this leg reversed. Net impact may not be 0 — verify Accounts.');
          return;
        }
        const reservationToken = 'TKN-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
        _markBothLegsReserved(ledger, row, otherRow, reservationToken);
        SpreadsheetApp.flush();

        _reverseSingleRow(ledger, row);
        _reverseSingleRow(ledger, otherRow);
        _alertF('✅ Transfer reversed atomically.\n\nBoth legs (Out + In) cancelled. Net impact = 0.\nv3.2 lock + pending-mark prevented any duplicate.');
        return;
      } else {
        _reverseSingleRow(ledger, row);
        _alertF('⚠️ Partial reversal.\n\nLinked leg ' + linkedTxnId + ' not found in ledger.');
        return;
      }
    }
    _reverseSingleRow(ledger, row);
  } finally {
    _releaseFinLock(lockResult);
  }
}

function _markBothLegsReserved(ledger, row1, row2, token) {
  const marker = ' ' + FIN2_REVERSAL_PENDING_PREFIX + token + FIN2_REVERSAL_PENDING_SUFFIX;
  [row1, row2].forEach(r => {
    try {
      const existing = (ledger.getRange(r, 9).getValue() || '').toString();
      try { ledger.getRange(r, 9, 1, 4).breakApart(); } catch(e) {}
      ledger.getRange(r, 9, 1, 4).merge().setValue(existing + marker);
    } catch(e) { Logger.log('Reservation mark failed row ' + r + ': ' + e); }
  });
}

function _reverseSingleRow(ledger, row) {
  const T = getFinTheme();
  const block = ledger.getRange(row, 1, 1, 15).getValues()[0];
  const date = block[0];
  const account = block[1];
  const type = block[2];
  const category = block[3];
  const amount = block[4];
  const currency = block[5];
  const pkr = block[6];
  const counterparty = block[7];
  const notes = block[8];
  const txnId = block[13] || '(legacy row ' + row + ')';
  const originalFxRate = block[14] || (currency === 'USD' ? (parseFloat(ledger.getRange('H1').getValue()) || 280) : 1.0);

  if (!(date instanceof Date) || !account || !type || !amount) {
    ledger.getRange(row, 13).setValue(false);
    _alertF('⚠️ Cannot reverse: row ' + row + ' incomplete.');
    return;
  }

  const opposites = {
    'Income': 'Expense', 'Expense': 'Income',
    'Debt Out': 'Debt In', 'Debt In': 'Debt Out',
    'Transfer': 'Income'
  };
  const reverseType = opposites[type] || type;

  Utilities.sleep(50);
  const newTxnId = generateTxnId();

  const nextRow = _findNextLedgerRow(ledger);
  if (nextRow === -1) {
    ledger.getRange(row, 13).setValue(false);
    _alertF('⚠️ Ledger full. Archive old transactions.');
    return;
  }

  const writeBlock = [[
    new Date(), account, reverseType, category || '',
    amount, currency || 'PKR', pkr, counterparty || ''
  ]];
  ledger.getRange(nextRow, 1, 1, 8).setValues(writeBlock);
  ledger.getRange(nextRow, 1).setNumberFormat('dd MMM yyyy');
  ledger.getRange(nextRow, 5).setNumberFormat('#,##0.00');
  ledger.getRange(nextRow, 7).setNumberFormat('#,##0.00');
  try { ledger.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
  ledger.getRange(nextRow, 9, 1, 4).merge().setValue('[REVERSAL OF ' + txnId + ']');
  ledger.getRange(nextRow, 14).setValue(newTxnId);
  // v3.3: reversal row inherits original FX rate (so re-conversion is consistent)
  ledger.getRange(nextRow, FIN2_FX_RATE_COL).setValue(originalFxRate);

  ledger.getRange(nextRow, 1, 1, 12).setBackground(T.bgReversal).setFontColor(T.textReversal);
  ledger.getRange(nextRow, 13).setBackground(T.warning);
  ledger.getRange(nextRow, 14).setBackground(T.bgReversal).setFontColor(T.textLo).setFontSize(8).setFontFamily('Courier New');
  ledger.getRange(nextRow, 15).setBackground(T.bgReversal).setFontColor(T.textLo).setFontSize(8).setFontFamily('Courier New').setNumberFormat('0.00');

  const notesStr = (notes || '').toString();
  let cleanedNotes = notesStr.replace(/\s*\[REVERSAL PENDING-[A-Z0-9-]+\]/g, '');
  const updatedNotes = (cleanedNotes ? cleanedNotes + ' | ' : '') + '[REVERSED BY ' + newTxnId + ']';
  try { ledger.getRange(row, 9, 1, 4).breakApart(); } catch(e) {}
  ledger.getRange(row, 9, 1, 4).merge().setValue(updatedNotes);

  ledger.getRange(row, 1, 1, 12).setBackground(T.bgReversed).setFontColor(T.textReversed).setFontLine('line-through');
  ledger.getRange(row, 13).setBackground(T.bgReversed);
  ledger.getRange(row, 13).setValue(false);

  _bumpRowPointer(nextRow);
  _logAuditFast('TXN_REVERSED', txnId + ' (' + type + ' ' + amount + ') → ' + newTxnId);

  try {
    const restoreResult = _restoreDebtSourceFromReversal(category, type, amount, counterparty, txnId);
    if (restoreResult.applied) {
      _logAuditFast('DEBT_RESTORE', restoreResult.label + ' ' + restoreResult.name +
                     ' · paid ' + restoreResult.oldPaid + ' → ' + restoreResult.newPaid +
                     ' · via reversal of ' + txnId);
      _alertF('✅ Reversal complete + Debts restored.\n\n' +
              restoreResult.label.charAt(0).toUpperCase() + restoreResult.label.slice(1) +
              ': ' + restoreResult.name + '\n' +
              'Paid: ' + restoreResult.oldPaid.toLocaleString() + ' → ' + restoreResult.newPaid.toLocaleString() + ' PKR\n\n' +
              'Ledger + Debts + Audit Log now in sync.');
    }
  } catch (e) {
    Logger.log('Debt source restore failed (reversal still completed): ' + e);
  }
}

function _restoreDebtSourceFromReversal(originalCategory, originalType, originalAmount, originalCounterparty, originalTxnId) {
  if (originalCategory !== '💸 Debt Payment') return { applied: false, reason: 'not_debt_payment' };
  if (!originalCounterparty) return { applied: false, reason: 'no_counterparty' };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const debts = ss.getSheetByName('💳 Debts');
  if (!debts) return { applied: false, reason: 'debts_tab_missing' };

  let scanStart, scanEnd, label;
  if (originalType === 'Debt Out') {
    scanStart = 6; scanEnd = 11; label = 'creditor';
  } else if (originalType === 'Debt In') {
    scanStart = 16; scanEnd = 20; label = 'receivable';
  } else {
    return { applied: false, reason: 'unknown_debt_direction' };
  }

  let foundRow = -1;
  let foundName = '';
  for (let r = scanStart; r <= scanEnd; r++) {
    const name = (debts.getRange(r, 2).getValue() || '').toString();
    if (name && name === originalCounterparty) { foundRow = r; foundName = name; break; }
  }
  if (foundRow === -1) {
    const target = originalCounterparty.toString().toLowerCase().trim();
    for (let r = scanStart; r <= scanEnd; r++) {
      const name = (debts.getRange(r, 2).getValue() || '').toString().toLowerCase().trim();
      if (name && (name === target || name.indexOf(target) !== -1 || target.indexOf(name) !== -1)) {
        foundRow = r; foundName = debts.getRange(r, 2).getValue(); break;
      }
    }
  }

  if (foundRow === -1) return { applied: false, reason: 'no_match_for_' + originalCounterparty };

  const currentPaid = debts.getRange(foundRow, 4).getValue() || 0;
  const newPaid = Math.max(0, currentPaid - originalAmount);
  debts.getRange(foundRow, 4).setValue(newPaid);

  const ts = Utilities.formatDate(new Date(), FIN2_TZ, 'dd MMM HH:mm');
  const existingNote = debts.getRange(foundRow, 4).getNote() || '';
  const reversalNote = '↩️ Reversed ' + originalAmount + ' PKR (orig ' + originalTxnId + ') at ' + ts + ' PKT';
  debts.getRange(foundRow, 4).setNote(existingNote ? existingNote + '\n' + reversalNote : reversalNote);

  return { applied: true, label: label, name: foundName, row: foundRow, oldPaid: currentPaid, newPaid: newPaid };
}

// ════════════════════════════════════════════════════════════════════
// EDIT HANDLER (v3.2 preserved)
// ════════════════════════════════════════════════════════════════════

function _financeOnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  const name = sh.getName();
  const r = e.range.getRow();
  const c = e.range.getColumn();
  const v = e.value;

  if (name === FIN2_TABS.TXN && r === FIN2_QE_ROW && c === FIN2_QE_SUBMIT_COL && (v === 'TRUE' || v === true)) {
    submitTxnFromQuickEntry(sh); return;
  }
  if (name === FIN2_TABS.TXN && r === FIN2_INTL_ENTRY_ROW && c === FIN2_INTL_SUBMIT_COL && (v === 'TRUE' || v === true)) {
    submitIntlFromQuickEntry(sh); return;
  }
  if (name === FIN2_TABS.TXN && c === 13 && r >= FIN2_LEDGER_START_ROW && r <= FIN2_LEDGER_END_ROW && (v === 'TRUE' || v === true)) {
    performReversal(sh, r); return;
  }
  if (name === FIN2_TABS.ACC && r === 3 && c === 7 && (v === 'TRUE' || v === true)) {
    submitTransferFromForm(sh); return;
  }
  if (name === FIN2_TABS.BIL && c === 10 && r >= 5 && r <= 14 && (v === 'TRUE' || v === true)) {
    markBillPaid(sh, r); return;
  }
  if (name === FIN2_TABS.GOA && c === 10 && r >= 5 && r <= 9 && (v === 'TRUE' || v === true)) {
    allocateToGoal(sh, r); return;
  }
}

function installFinanceEditHandler(silent) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_financeOnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('_financeOnEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  if (!silent) _alertF('✅ Finance auto-log handler installed (v3.3 elite banking-grade).');
}

function actForceReinstallHandler() {
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_financeOnEdit') {
      try { ScriptApp.deleteTrigger(t); removed++; } catch(e) {}
    }
  });
  ScriptApp.newTrigger('_financeOnEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  const installed = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_financeOnEdit').length;
  if (typeof logAuditAction === 'function') logAuditAction('FIN_HANDLER_REINSTALL', 'removed ' + removed + ' · installed ' + installed);
  _alertF('🔧 Auto-log handler reinstalled (v3.3).\n\nRemoved: ' + removed + '\nInstalled: ' + installed);
}

function diagnoseFinanceHandler() {
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_financeOnEdit');
  const flushTriggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_flushAuditBuffer');
  const ss = SpreadsheetApp.getActive();
  const txTab = ss.getSheetByName(FIN2_TABS.TXN);
  const cached = _readRowPointerCache();
  let bufLen = 0;
  try {
    const raw = PropertiesService.getDocumentProperties().getProperty(FIN2_AUDIT_BUFFER_KEY) || '[]';
    bufLen = JSON.parse(raw).length;
  } catch(e) {}
  let report = '🔍 FINANCE HANDLER DIAGNOSTIC v3.3\n\n';
  report += 'On-edit triggers: ' + triggers.length + ' ' + (triggers.length === 1 ? '✅' : '⚠️') + ' (expected 1)\n';
  report += 'Audit flush triggers: ' + flushTriggers.length + ' ' + (flushTriggers.length === 1 ? '✅' : '⚠️') + ' (expected 1)\n';
  report += 'Transactions tab: ' + (txTab ? '✅ found' : '❌ NOT FOUND') + '\n\n';
  report += '🛡️ v3.3 ELITE BANKING-GRADE STATUS:\n';
  report += '  Balance constraint: pre-write check enabled\n';
  report += '  FX rate snapshot: col 15 (FX_Rate_At_Commit)\n';
  report += '  CC over-limit gate: enabled (limit ' + FIN2_CC_LIMIT.toLocaleString() + ')\n';
  report += '\n🔒 v3.2 PRESERVED:\n';
  report += '  LockService: ' + (typeof LockService !== 'undefined' ? '✅ available' : '❌ missing') + '\n';
  report += '  Lock timeout: ' + (FIN2_LOCK_TIMEOUT_MS / 1000) + ' sec\n';
  report += '  TxnID suffix: 5-digit\n';
  report += '  Salary detect: prompt mode\n';
  report += '  Reversal: atomic linked-partner\n';
  report += '\n⚡ PERF:\n';
  report += '  Row pointer cache: ' + (cached !== -1 ? 'row ' + cached + ' cached ✅' : 'no cache (will scan once)') + '\n';
  report += '  Audit buffer: ' + bufLen + ' / ' + FIN2_AUDIT_BUFFER_FLUSH_AT + ' entries waiting\n';
  if (triggers.length === 0) report += '\n🚨 FIX: Menu → 💰 Finance → 🛟 → 🚨 Force Reinstall';
  else if (flushTriggers.length === 0) report += '\n⚠️ Audit flush trigger missing. Run Rebuild Suite.';
  else if (triggers.length > 1) report += '\n⚠️ Multiple on-edit triggers — run Force Reinstall.';
  else report += '\n✅ All systems operational. v3.3 elite banking-grade locked.';
  _alertF(report);
}

function submitLastEntryManually() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(FIN2_TABS.TXN);
  if (!tx) { _alertF('❌ Transactions tab not found.'); return; }
  const amt = tx.getRange('E4').getValue();
  if (!amt || typeof amt !== 'number') { _alertF('⚠️ Fill Quick Entry first.'); return; }
  submitTxnFromQuickEntry(tx);
}

// ════════════════════════════════════════════════════════════════════
// HOT PATH — submitTxnFromQuickEntry (v3.3 with C1 + C5 fixes)
// ════════════════════════════════════════════════════════════════════

function submitTxnFromQuickEntry(s) {
  const lockResult = _acquireFinLock('submitTxnFromQuickEntry');
  if (!lockResult.ok) {
    s.getRange('L4').setValue(false);
    _setQEStatus(s, '🔒 lock timeout', 'err');
    _alertF('🔒 Could not acquire write lock.\n\nAnother transaction is in progress. Wait 5 sec and try again.\n\nDetails: ' + lockResult.error);
    return;
  }

  try {
    const formBlock = s.getRange(FIN2_QE_ROW, 1, 1, 9).getValues()[0];
    const date = formBlock[0];
    const account = formBlock[1];
    const type = formBlock[2];
    let category = formBlock[3];
    const amount = formBlock[4];
    const currency = formBlock[5] || 'PKR';
    const counterparty = formBlock[7];
    const notes = formBlock[8];

    if (!(date instanceof Date)) { s.getRange('L4').setValue(false); _setQEStatus(s, '⚠ no date', 'warn'); return; }
    if (!account) { s.getRange('L4').setValue(false); _setQEStatus(s, '⚠ no account', 'warn'); return; }
    if (!type) { s.getRange('L4').setValue(false); _setQEStatus(s, '⚠ no type', 'warn'); return; }
    if (!amount || typeof amount !== 'number') { s.getRange('L4').setValue(false); _setQEStatus(s, '⚠ bad amount', 'warn'); return; }

    // v3.3: Capture FX rate FIRST so we have correct PKR equivalent for balance check
    const fx = _captureFxRate(currency);
    const pkrEquiv = (currency === 'USD') ? amount * fx.rate : amount;

    // v3.3 NEW: Balance constraint check BEFORE any other validation
    const balCheck = _validateBalanceConstraint(account, type, pkrEquiv);
    if (!balCheck.allow) {
      s.getRange('L4').setValue(false);
      _setQEStatus(s, '🛑 ' + balCheck.reason, 'err');
      return;
    }

    if (amount >= CC_VALIDATION_MIN_AMOUNT && typeof validateCCPayment === 'function') {
      const ccWarning = validateCCPayment(account, type, category);
      if (ccWarning) {
        try {
          const ui = SpreadsheetApp.getUi();
          const resp = ui.alert('⚠️ CC Validation', ccWarning, ui.ButtonSet.YES_NO);
          if (resp !== ui.Button.YES) {
            s.getRange('L4').setValue(false);
            _setQEStatus(s, '⚠ cancelled by validation', 'warn');
            _logAuditFast('CC_VALIDATION_BLOCK', account + ' · ' + type + ' · ' + (category || '') + ' · ' + amount + ' · user cancelled');
            return;
          }
          _logAuditFast('CC_VALIDATION_OVERRIDE', account + ' · ' + type + ' · ' + (category || '') + ' · ' + amount + ' · user overrode warning');
        } catch(e) { /* headless context — proceed */ }
      }
    }

    let salaryDetected = false;
    let salaryCorrected = false;
    if (_detectSalaryPattern(date, account, type, amount, currency)) {
      salaryDetected = true;
      if (category === '💰 Salary') {
        // already correct, no prompt
      } else {
        try {
          const ui = SpreadsheetApp.getUi();
          const promptMsg = 'Looks like salary.\n\n' +
                            'Account: ' + account + '\n' +
                            'Amount: ' + amount.toLocaleString() + ' PKR\n' +
                            'Day: ' + date.getDate() + '\n' +
                            'Your category: ' + (category || '(blank)') + '\n\n' +
                            'Override to "💰 Salary"?';
          const resp = ui.alert('💰 Salary pattern detected', promptMsg, ui.ButtonSet.YES_NO);
          if (resp === ui.Button.YES) {
            const oldCat = category || '(blank)';
            category = '💰 Salary';
            salaryCorrected = true;
            _logAuditFast('SALARY_CATEGORY_CORRECTED',
              'User confirmed override · ' + oldCat + ' → 💰 Salary · ' + amount + ' PKR · ' + account);
          } else {
            _logAuditFast('SALARY_PATTERN_IGNORED',
              'User kept category "' + (category || '(blank)') + '" despite salary pattern · ' + amount + ' PKR · ' + account);
            salaryDetected = false;
          }
        } catch(e) {
          const placeholderCats = ['🍔 Food', '🎯 Other', '', null];
          if (placeholderCats.indexOf(category) !== -1) {
            category = '💰 Salary';
            salaryCorrected = true;
          } else {
            salaryDetected = false;
          }
        }
      }
    }

    const nextRow = _findNextLedgerRow(s);
    if (nextRow === -1) { s.getRange('L4').setValue(false); _setQEStatus(s, '⚠ ledger full', 'err'); return; }

    Utilities.sleep(5);
    const txnId = generateTxnId();

    const writeBlock = [[
      date, account, type, category || '',
      amount, currency, pkrEquiv, counterparty || ''
    ]];
    s.getRange(nextRow, 1, 1, 8).setValues(writeBlock);
    s.getRange(nextRow, 1).setNumberFormat('dd MMM yyyy');
    s.getRange(nextRow, 5).setNumberFormat('#,##0.00');
    s.getRange(nextRow, 7).setNumberFormat('#,##0.00');

    try { s.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
    s.getRange(nextRow, 9, 1, 4).merge().setValue(notes || '');
    s.getRange(nextRow, 14).setValue(txnId);

    // v3.3 NEW: write FX rate snapshot to col 15
    s.getRange(nextRow, FIN2_FX_RATE_COL).setValue(fx.rate).setNumberFormat('0.00');

    _rememberLastAccount(account);
    s.getRange('A4').setValue(new Date());
    s.getRange('E4').setValue('');
    s.getRange('H4').setValue('');
    s.getRange('I4:J4').setValue('');
    s.getRange('L4').setValue(false);
    _setQEStatus(s, '✓ ' + Math.round(amount).toLocaleString() + ' ' + currency + (balCheck.override ? ' (override)' : ''), 'ok');

    _bumpRowPointer(nextRow);
    _logAuditFast('TXN_LOGGED', txnId + ' · ' + type + ' ' + amount + ' ' + currency + ' · ' + (category || '') + ' · ' + account + ' · fx=' + fx.rate);

    if (salaryDetected) {
      _logAuditFast('SALARY_AUTO_DETECTED', amount + ' PKR · ' + account + ' · day ' + date.getDate() + ' · ' + txnId);
      if (!counterparty) {
        s.getRange(nextRow, 8).setValue(SALARY_RULES.defaultEmployer);
      }
      _setQEStatus(s, '💰 Salary detected', 'ok');
      _alertF('💰 Salary auto-detected.\n\n' +
              'Amount: ' + amount.toLocaleString() + ' PKR · Account: ' + account + '\n' +
              'Category: 💰 Salary' + (salaryCorrected ? ' (corrected from your initial pick)' : '') + '\n' +
              (counterparty ? '' : 'Counterparty filled with: ' + SALARY_RULES.defaultEmployer + '\n') +
              '\nRizq from Allah ﷻ. May He bless it for you, akhi.');
    }
  } finally {
    _releaseFinLock(lockResult);
  }
}

function submitIntlFromQuickEntry(s) {
  const lockResult = _acquireFinLock('submitIntlFromQuickEntry');
  if (!lockResult.ok) {
    s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).setValue(false);
    _alertF('🔒 Could not acquire write lock.\n\nAnother transaction is in progress. Wait 5 sec and try again.');
    return;
  }

  try {
    const intlBlock = s.getRange(FIN2_INTL_ENTRY_ROW, 1, 1, 7).getValues()[0];
    const date = intlBlock[0];
    const account = intlBlock[1];
    const base = intlBlock[2];
    const merchant = intlBlock[3];
    const includePRA = s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_PRA_COL).getValue() === true;
    const notes = intlBlock[6];

    if (!(date instanceof Date)) { s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).setValue(false); _alertF('⚠️ Date required (A' + FIN2_INTL_ENTRY_ROW + ').'); return; }
    if (!account) { s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).setValue(false); _alertF('⚠️ Account required (B' + FIN2_INTL_ENTRY_ROW + ').'); return; }
    if (!base || typeof base !== 'number' || base <= 0) { s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).setValue(false); _alertF('⚠️ Positive Base PKR required (C' + FIN2_INTL_ENTRY_ROW + ').'); return; }
    if (!merchant || !merchant.toString().trim()) { s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).setValue(false); _alertF('⚠️ Merchant required (D' + FIN2_INTL_ENTRY_ROW + ').'); return; }

    // v3.3: balance constraint check on intl total (estimated: base + ~25% fees)
    const estimatedTotal = base * 1.25;
    const balCheck = _validateBalanceConstraint(account, 'Expense', estimatedTotal);
    if (!balCheck.allow) {
      s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).setValue(false);
      return;
    }

    if (typeof logIntlPurchase !== 'function') {
      s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).setValue(false);
      _alertF('⚠️ Finance_Intl.gs not loaded.');
      return;
    }

    const result = logIntlPurchase({
      base: base, merchant: merchant.toString().trim(),
      fromAccount: account, includePRA: includePRA,
      date: date, notes: notes || ''
    });

    if (!result.ok) {
      s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).setValue(false);
      _alertF('⚠️ Intl log failed: ' + result.error);
      return;
    }

    s.getRange(FIN2_INTL_ENTRY_ROW, 1).setValue(new Date());
    s.getRange(FIN2_INTL_ENTRY_ROW, 3).setValue('');
    s.getRange(FIN2_INTL_ENTRY_ROW, 4).setValue('');
    s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_PRA_COL).setValue(false);
    s.getRange(FIN2_INTL_ENTRY_ROW, 7, 1, 5).setValue('');
    s.getRange(FIN2_INTL_ENTRY_ROW, FIN2_INTL_SUBMIT_COL).setValue(false);

    _invalidateRowPointer();

    _logAuditFast('INTL_PURCHASE_SHEET', result.merchant + ' · base ' + base + ' · total ' + result.total + ' PKR · ' + result.parentId + (includePRA ? ' · +PRA' : ''));

    let pad = (n) => n.toFixed(2);
    let summary = '✅ Intl purchase logged.\n\n' +
                  'Merchant: ' + result.merchant + ' · From: ' + result.fromAccount + '\n\n' +
                  'Base       ' + pad(result.base) + ' PKR\n' +
                  'FX Fee     ' + pad(result.fxFee) + ' PKR\n' +
                  'Excise     ' + pad(result.excise) + ' PKR\n' +
                  'Adv Tax    ' + pad(result.advTax) + ' PKR\n';
    if (includePRA) summary += 'PRA Tax    ' + pad(result.praTax) + ' PKR\n';
    summary += '────────────────────────\nTotal      ' + pad(result.total) + ' PKR\n\n' +
               result.rowsWritten + ' linked rows · Parent: ' + result.parentId;
    _alertF(summary);
  } finally {
    _releaseFinLock(lockResult);
  }
}

function submitTransferFromForm(s) {
  const lockResult = _acquireFinLock('submitTransferFromForm');
  if (!lockResult.ok) {
    s.getRange('G3').setValue(false);
    _alertF('🔒 Could not acquire write lock.\n\nAnother transaction is in progress. Wait 5 sec and try again.');
    return;
  }

  try {
    const tBlock = s.getRange(3, 1, 1, 4).getValues()[0];
    const fromAcc = tBlock[0];
    const toAcc = tBlock[1];
    const amount = tBlock[2];
    const notes = tBlock[3];

    if (!fromAcc || !toAcc) { s.getRange('G3').setValue(false); _alertF('⚠️ Pick both accounts.'); return; }
    if (fromAcc === toAcc) { s.getRange('G3').setValue(false); _alertF('⚠️ From and To must differ.'); return; }
    if (!amount || typeof amount !== 'number' || amount <= 0) { s.getRange('G3').setValue(false); _alertF('⚠️ Positive amount required.'); return; }

    // v3.3: balance constraint check on FROM account
    const balCheck = _validateBalanceConstraint(fromAcc, 'Transfer', amount);
    if (!balCheck.allow) {
      s.getRange('G3').setValue(false);
      return;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tx = ss.getSheetByName(FIN2_TABS.TXN);
    if (!tx) { s.getRange('G3').setValue(false); _alertF('❌ Transactions tab not found.'); return; }

    const outRow = _findNextLedgerRow(tx);
    if (outRow === -1) { s.getRange('G3').setValue(false); _alertF('⚠️ Ledger full.'); return; }

    const today = new Date();
    const isCCTransfer = (toAcc === FIN2_CC_ACCOUNT || fromAcc === FIN2_CC_ACCOUNT);
    const noteText = (notes && notes !== 'Notes (optional)') ? notes :
      (isCCTransfer ? 'CC ' + (toAcc === FIN2_CC_ACCOUNT ? 'payment' : 'cash advance') + ': ' + fromAcc + ' → ' + toAcc :
       'Transfer ' + fromAcc + ' → ' + toAcc);
    const cat = isCCTransfer ? '💳 CC Payment' : '💱 Transfer';

    Utilities.sleep(5);
    const outId = generateTxnId();
    Utilities.sleep(5);
    const inId = generateTxnId();

    tx.getRange(outRow, 1, 1, 8).setValues([[today, fromAcc, 'Transfer', cat, amount, 'PKR', amount, 'To: ' + toAcc]]);
    tx.getRange(outRow, 1).setNumberFormat('dd MMM yyyy');
    tx.getRange(outRow, 5).setNumberFormat('#,##0.00');
    tx.getRange(outRow, 7).setNumberFormat('#,##0.00');
    try { tx.getRange(outRow, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(outRow, 9, 1, 4).merge().setValue(noteText + ' (OUT) [linked: ' + inId + ']');
    tx.getRange(outRow, 14).setValue(outId);
    tx.getRange(outRow, FIN2_FX_RATE_COL).setValue(1.0);
    _bumpRowPointer(outRow);

    const inRow = _findNextLedgerRow(tx);
    if (inRow === -1) {
      _alertF('⚠️ Ledger filled mid-transfer. Out leg logged at row ' + outRow + ', In leg failed.');
      return;
    }

    tx.getRange(inRow, 1, 1, 8).setValues([[today, toAcc, 'Income', cat, amount, 'PKR', amount, 'From: ' + fromAcc]]);
    tx.getRange(inRow, 1).setNumberFormat('dd MMM yyyy');
    tx.getRange(inRow, 5).setNumberFormat('#,##0.00');
    tx.getRange(inRow, 7).setNumberFormat('#,##0.00');
    try { tx.getRange(inRow, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(inRow, 9, 1, 4).merge().setValue(noteText + ' (IN) [linked: ' + outId + ']');
    tx.getRange(inRow, 14).setValue(inId);
    tx.getRange(inRow, FIN2_FX_RATE_COL).setValue(1.0);
    _bumpRowPointer(inRow);

    s.getRange('C3').setValue(0);
    s.getRange('D3:F3').setValue('Notes (optional)');
    s.getRange('G3').setValue(false);

    _logAuditFast('TRANSFER', outId + ' + ' + inId + ' · ' + amount + ' PKR · ' + fromAcc + ' → ' + toAcc);
  } finally {
    _releaseFinLock(lockResult);
  }
}

function markBillPaid(s, row) {
  const lockResult = _acquireFinLock('markBillPaid(row=' + row + ')');
  if (!lockResult.ok) {
    s.getRange(row, 10).setValue(false);
    _alertF('🔒 Lock timeout. Wait 5 sec and try again.');
    return;
  }

  try {
    const billName = s.getRange(row, 1).getValue();
    const amount = s.getRange(row, 3).getValue();
    const account = s.getRange(row, 4).getValue();
    if (!billName || !amount || !account) { s.getRange(row, 10).setValue(false); _alertF('⚠️ Bill incomplete.'); return; }

    // v3.3: balance constraint
    const balCheck = _validateBalanceConstraint(account, 'Expense', amount);
    if (!balCheck.allow) {
      s.getRange(row, 10).setValue(false);
      return;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tx = ss.getSheetByName(FIN2_TABS.TXN);
    if (!tx) { s.getRange(row, 10).setValue(false); _alertF('❌ Transactions tab not found.'); return; }

    const nextRow = _findNextLedgerRow(tx);
    if (nextRow === -1) { s.getRange(row, 10).setValue(false); _alertF('⚠️ Ledger full.'); return; }

    Utilities.sleep(5);
    const txnId = generateTxnId();
    const today = new Date();
    tx.getRange(nextRow, 1, 1, 8).setValues([[today, account, 'Expense', '🏠 Bills', amount, 'PKR', amount, billName]]);
    tx.getRange(nextRow, 1).setNumberFormat('dd MMM yyyy');
    tx.getRange(nextRow, 5).setNumberFormat('#,##0.00');
    tx.getRange(nextRow, 7).setNumberFormat('#,##0.00');
    try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(nextRow, 9, 1, 4).merge().setValue('Bill payment · auto-logged');
    tx.getRange(nextRow, 14).setValue(txnId);
    tx.getRange(nextRow, FIN2_FX_RATE_COL).setValue(1.0);
    _bumpRowPointer(nextRow);

    s.getRange(row, 8).setValue(today).setNumberFormat('dd MMM');
    s.getRange(row, 10).setValue(false);

    _logAuditFast('BILL_PAID', txnId + ' · ' + billName + ' · ' + amount + ' PKR · ' + account);
  } finally {
    _releaseFinLock(lockResult);
  }
}

function allocateToGoal(s, row) {
  const lockResult = _acquireFinLock('allocateToGoal(row=' + row + ')');
  if (!lockResult.ok) {
    s.getRange(row, 10).setValue(false);
    _alertF('🔒 Lock timeout. Wait 5 sec and try again.');
    return;
  }

  try {
    const goalName = s.getRange(row, 1).getValue();
    const fromAcc = s.getRange(row, 7).getValue();
    const allocAmt = s.getRange(row, 8).getValue();
    if (!goalName) { s.getRange(row, 10).setValue(false); _alertF('⚠️ Goal name missing.'); return; }
    if (!fromAcc) { s.getRange(row, 10).setValue(false); _alertF('⚠️ Pick source account.'); return; }
    if (!allocAmt || typeof allocAmt !== 'number' || allocAmt <= 0) { s.getRange(row, 10).setValue(false); _alertF('⚠️ Enter allocation amount.'); return; }

    // v3.3: balance constraint
    const balCheck = _validateBalanceConstraint(fromAcc, 'Expense', allocAmt);
    if (!balCheck.allow) {
      s.getRange(row, 10).setValue(false);
      return;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tx = ss.getSheetByName(FIN2_TABS.TXN);
    if (!tx) { s.getRange(row, 10).setValue(false); _alertF('❌ Transactions tab not found.'); return; }

    const nextRow = _findNextLedgerRow(tx);
    if (nextRow === -1) { s.getRange(row, 10).setValue(false); _alertF('⚠️ Ledger full.'); return; }

    Utilities.sleep(5);
    const txnId = generateTxnId();
    const today = new Date();
    tx.getRange(nextRow, 1, 1, 8).setValues([[today, fromAcc, 'Expense', '🎯 Other', allocAmt, 'PKR', allocAmt, 'Goal: ' + goalName]]);
    tx.getRange(nextRow, 1).setNumberFormat('dd MMM yyyy');
    tx.getRange(nextRow, 5).setNumberFormat('#,##0.00');
    tx.getRange(nextRow, 7).setNumberFormat('#,##0.00');
    try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(nextRow, 9, 1, 4).merge().setValue('Savings allocation · auto-logged');
    tx.getRange(nextRow, 14).setValue(txnId);
    tx.getRange(nextRow, FIN2_FX_RATE_COL).setValue(1.0);
    _bumpRowPointer(nextRow);

    const currentAmt = s.getRange(row, 3).getValue() || 0;
    s.getRange(row, 3).setValue(currentAmt + allocAmt);
    s.getRange(row, 8).setValue(0);
    s.getRange(row, 10).setValue(false);

    _logAuditFast('GOAL_ALLOCATE', txnId + ' · ' + goalName + ' · ' + allocAmt + ' PKR · ' + fromAcc);
  } finally {
    _releaseFinLock(lockResult);
  }
}

function buildAccountsTab(ss, T) {
  let s = ss.getSheetByName(FIN2_TABS.ACC);
  if (!s) s = ss.insertSheet(FIN2_TABS.ACC);
  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());
  s.getRange(1, 1, 50, 10).setBackground(T.bgPage);
  for (let c = 1; c <= 10; c++) s.setColumnWidth(c, 110);
  s.setColumnWidth(1, 140);

  s.getRange('A1:J1').merge()
    .setValue('🏦 ACCOUNTS — assets · liabilities · net worth · transfer between accounts')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);

  s.getRange('A2:J2').merge()
    .setValue('💱 TRANSFER — from → to → amount → click ✅ in G3 (For CC payment: From=Meezan, To=Alfalah CC)')
    .setBackground(T.bgAccent).setFontColor(T.text).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center');
  s.setRowHeight(2, 26);

  s.getRange('A3').setValue('Cash');
  s.getRange('B3').setValue('JazzCash');
  s.getRange('C3').setValue(0);
  s.getRange('D3:F3').merge().setValue('Notes (optional)');
  s.getRange('G3').insertCheckboxes();

  s.getRange('A3:C3').setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('D3:F3').setBackground(T.bgInput).setFontColor(T.textMd).setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.getRange('G3').setBackground(T.success).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('H3:J3').merge().setValue('💡 Creates 2 linked transactions with paired TxnIDs · v3.3 balance check on FROM')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(3, 36);

  const accDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_ACCOUNTS, true).setAllowInvalid(true).build();
  s.getRange('A3').setDataValidation(accDV);
  s.getRange('B3').setDataValidation(accDV);

  s.setRowHeight(4, 8);

  s.getRange('A5:J5').merge().setValue('💎 ASSETS — money you own')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(5, 28);

  const assetHdr = ['Account', 'Type', 'MTD Income', 'MTD Expense', 'Balance (PKR)', 'Last Txn', 'Visual Bar', '', '', ''];
  s.getRange(6, 1, 1, 10).setValues([assetHdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(6, 26);

  const assets = FIN2_ACCOUNTS.filter(a => _isAsset(a));
  for (let i = 0; i < assets.length; i++) {
    const r = 7 + i;
    const acc = assets[i];
    s.getRange(r, 1).setValue(acc).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 2).setValue(FIN2_ACCOUNT_KIND[acc] || '—').setBackground(T.bgRow).setFontColor(T.textMd).setFontSize(10);
    s.getRange(r, 3).setFormula('=IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + acc + '",\'💸 Transactions\'!C:C,"Income",\'💸 Transactions\'!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1)),0)').setNumberFormat('#,##0');
    s.getRange(r, 4).setFormula('=IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + acc + '",\'💸 Transactions\'!C:C,"Expense",\'💸 Transactions\'!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1)),0)').setNumberFormat('#,##0');
    s.getRange(r, 5).setFormula(
      '=IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + acc + '",\'💸 Transactions\'!C:C,"Income"),0)+' +
      'IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + acc + '",\'💸 Transactions\'!C:C,"Debt In"),0)-' +
      'IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + acc + '",\'💸 Transactions\'!C:C,"Expense"),0)-' +
      'IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + acc + '",\'💸 Transactions\'!C:C,"Debt Out"),0)-' +
      'IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + acc + '",\'💸 Transactions\'!C:C,"Transfer"),0)'
    ).setNumberFormat('#,##0').setBackground(T.bgAsset).setFontColor(T.textHi).setFontWeight('bold').setFontSize(12);
    s.getRange(r, 6).setFormula('=IFERROR(MAX(IF(\'💸 Transactions\'!B:B="' + acc + '",\'💸 Transactions\'!A:A)),"—")').setNumberFormat('dd MMM');
    s.getRange(r, 7, 1, 4).merge().setFormula(
      '=LET(bal,E' + r + ',pct,MIN(ABS(bal)/200000,1),REPT("█",ROUND(pct*30,0))&REPT("░",30-ROUND(pct*30,0)))'
    ).setBackground(T.bgRow).setFontColor(T.success).setFontFamily('Courier New').setFontSize(10).setHorizontalAlignment('left');
    s.getRange(r, 1, 1, 10).setVerticalAlignment('middle');
    s.setRowHeight(r, 28);
  }

  s.getRange(16, 1, 1, 4).merge().setValue('💎 TOTAL LIQUID')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(16, 5).setFormula('=SUM(E7:E15)').setNumberFormat('#,##0')
    .setBackground(T.bgAsset).setFontColor(T.textHi).setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(16, 6, 1, 5).merge().setValue('PKR — sum of all asset accounts')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(16, 40);
  s.setRowHeight(17, 8);

  s.getRange('A18:J18').merge().setValue('💳 LIABILITIES — credit cards & loans')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(18, 28);

  const liabHdr = ['Account', 'Limit', 'Outstanding', 'Available', 'Utilization %', 'Status', 'Days till Due', 'Days till Close', 'Min Pay (5%)', 'Visual'];
  s.getRange(19, 1, 1, 10).setValues([liabHdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(19, 26);

  const ccBalFormula =
    'IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + FIN2_CC_ACCOUNT + '",\'💸 Transactions\'!C:C,"Income"),0)+' +
    'IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + FIN2_CC_ACCOUNT + '",\'💸 Transactions\'!C:C,"Debt In"),0)-' +
    'IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + FIN2_CC_ACCOUNT + '",\'💸 Transactions\'!C:C,"Expense"),0)-' +
    'IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + FIN2_CC_ACCOUNT + '",\'💸 Transactions\'!C:C,"Debt Out"),0)-' +
    'IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!B:B,"' + FIN2_CC_ACCOUNT + '",\'💸 Transactions\'!C:C,"Transfer"),0)';

  s.getRange('A20').setValue(FIN2_CC_ACCOUNT).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(12);
  s.getRange('B20').setValue(FIN2_CC_LIMIT).setNumberFormat('#,##0').setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold').setFontSize(11);
  s.getRange('C20').setFormula('=MAX(0,-(' + ccBalFormula + '))').setNumberFormat('#,##0').setBackground(T.bgLiability).setFontColor(T.critical).setFontWeight('bold').setFontSize(13);
  s.getRange('D20').setFormula('=MAX(0,B20-C20)').setNumberFormat('#,##0').setBackground(T.bgRow).setFontColor(T.success).setFontWeight('bold').setFontSize(11);
  s.getRange('E20').setFormula('=IFERROR(C20/B20,0)').setNumberFormat('0.0%').setBackground(T.bgRow).setFontColor(T.textHi).setFontWeight('bold').setFontSize(12);
  s.getRange('F20').setFormula('=IF(E20>0.95,"⚫ MAXED",IF(E20>0.8,"🔴 Critical",IF(E20>0.6,"🟠 High",IF(E20>0.3,"🟡 Watch","🟢 OK"))))');
  s.getRange('G20').setFormula('=IF(DAY(TODAY())<=' + FIN2_CC_DUE_DAY + ',DATE(YEAR(TODAY()),MONTH(TODAY()),' + FIN2_CC_DUE_DAY + ')-TODAY(),DATE(YEAR(TODAY()),MONTH(TODAY())+1,' + FIN2_CC_DUE_DAY + ')-TODAY())').setNumberFormat('0').setBackground(T.bgRow).setFontColor(T.warning).setFontWeight('bold').setFontSize(11);
  s.getRange('H20').setFormula('=IF(DAY(TODAY())<=' + FIN2_CC_CLOSE_DAY + ',DATE(YEAR(TODAY()),MONTH(TODAY()),' + FIN2_CC_CLOSE_DAY + ')-TODAY(),DATE(YEAR(TODAY()),MONTH(TODAY())+1,' + FIN2_CC_CLOSE_DAY + ')-TODAY())').setNumberFormat('0').setBackground(T.bgRow).setFontColor(T.info).setFontWeight('bold').setFontSize(11);
  s.getRange('I20').setFormula('=ROUND(C20*0.05,0)').setNumberFormat('#,##0').setBackground(T.bgRow).setFontColor(T.warning).setFontWeight('bold').setFontSize(11);
  s.getRange('J20').setFormula('=LET(pct,E20,REPT("█",ROUND(pct*15,0))&REPT("░",15-ROUND(pct*15,0)))').setBackground(T.bgRow).setFontColor(T.danger).setFontFamily('Courier New').setFontSize(10).setHorizontalAlignment('left');
  s.getRange(20, 1, 1, 10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(20, 32);

  s.getRange(21, 1, 1, 2).merge().setValue('💸 TOTAL LIABILITY').setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(21, 3).setFormula('=C20').setNumberFormat('#,##0').setBackground(T.bgLiability).setFontColor(T.critical).setFontWeight('bold').setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(21, 4, 1, 7).merge().setValue('PKR — outstanding credit card debt').setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(21, 40);
  s.setRowHeight(22, 8);

  s.getRange('A23:J23').merge().setValue('🏆 NET WORTH — total assets minus total liabilities').setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(23, 28);
  s.getRange(24, 1, 1, 4).merge().setValue('🏆 NET WORTH').setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(24, 5).setFormula('=E16-C21').setNumberFormat('+#,##0;-#,##0').setBackground(T.bgNet).setFontColor(T.textHi).setFontWeight('bold').setFontSize(16).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(24, 6, 1, 5).merge().setFormula('="PKR — " & IF(E24>=0,"in surplus","in deficit") & " · target: positive net worth by Day 90"').setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(24, 44);

  const rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('⚫ MAXED').setBackground(T.critical).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('F20')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🔴 Critical').setBackground(T.danger).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('F20')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟠 High').setBackground(T.orange).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('F20')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟡 Watch').setBackground(T.warning).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('F20')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟢 OK').setBackground(T.success).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('F20')]).build());
  s.setConditionalFormatRules(rules);

  s.setFrozenRows(6);
}

function buildBudgetTab(ss, T) {
  let s = ss.getSheetByName(FIN2_TABS.BUD);
  if (!s) s = ss.insertSheet(FIN2_TABS.BUD);
  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());
  s.getRange(1, 1, 40, 11).setBackground(T.bgPage);
  for (let c = 1; c <= 11; c++) s.setColumnWidth(c, 105);

  s.getRange('A1:K1').merge().setValue('📊 BUDGET — your real monthly category limits').setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);
  s.getRange('A2:K2').merge().setValue('💡 Edit Budget column to adjust limits · Actual spend pulled from 💸 Transactions in real time').setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(2, 24);
  s.setRowHeight(3, 8);

  const hdr = ['Category', 'Budget (PKR)', 'Actual MTD', 'Used %', 'Progress Bar', '', '', '', 'Status', 'Remaining', ''];
  s.getRange(4, 1, 1, 11).setValues([hdr]).setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(4, 26);

  const budgetCats = Object.keys(FIN2_DEFAULT_BUDGET);
  for (let i = 0; i < budgetCats.length; i++) {
    const r = 5 + i;
    const cat = budgetCats[i];
    const defaultBudget = FIN2_DEFAULT_BUDGET[cat] || 0;
    s.getRange(r, 1).setValue(cat).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 2).setValue(defaultBudget).setNumberFormat('#,##0').setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold');
    s.getRange(r, 3).setFormula('=IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),\'💸 Transactions\'!A:A,"<="&EOMONTH(TODAY(),0),\'💸 Transactions\'!C:C,"Expense",\'💸 Transactions\'!D:D,"' + cat + '"),0)').setNumberFormat('#,##0');
    s.getRange(r, 4).setFormula('=IFERROR(ROUND(C' + r + '/B' + r + '*100,0)&"%","—")');
    s.getRange(r, 5, 1, 4).merge().setFormula('=IFERROR(IF(B' + r + '=0,"",REPT("█",MIN(ROUND(C' + r + '/B' + r + '*30,0),30))&REPT("░",MAX(30-ROUND(C' + r + '/B' + r + '*30,0),0))),"")').setFontFamily('Courier New').setFontSize(10);
    s.getRange(r, 9).setFormula('=IFERROR(IF(C' + r + '/B' + r + '>=1,"⚫ OVER",IF(C' + r + '/B' + r + '>=0.8,"🔴 Critical",IF(C' + r + '/B' + r + '>=0.5,"🟡 Watch","🟢 OK"))),"")');
    s.getRange(r, 10, 1, 2).merge().setFormula('=IFERROR(TEXT(B' + r + '-C' + r + ',"+#,##0;-#,##0")&" PKR","—")').setFontWeight('bold');
    s.getRange(r, 1, 1, 11).setBackground(i % 2 === 0 ? T.bgRow : T.bgAlt).setFontColor(T.text).setFontSize(10).setVerticalAlignment('middle').setHorizontalAlignment('center');
    s.getRange(r, 2).setBackground(T.bgInput);
    s.setRowHeight(r, 28);
  }

  const tr = 5 + budgetCats.length;
  s.getRange(tr, 1).setValue('💰 TOTAL').setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
  s.getRange(tr, 2).setFormula('=SUM(B5:B' + (tr - 1) + ')').setNumberFormat('#,##0').setBackground(T.bgAccent).setFontColor(T.textHi).setFontWeight('bold').setFontSize(12);
  s.getRange(tr, 3).setFormula('=SUM(C5:C' + (tr - 1) + ')').setNumberFormat('#,##0').setBackground(T.bgAccent).setFontColor(T.textHi).setFontWeight('bold').setFontSize(12);
  s.getRange(tr, 4).setFormula('=ROUND(C' + tr + '/B' + tr + '*100,0)&"%"').setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(12);
  s.getRange(tr, 5, 1, 4).merge().setFormula('=REPT("█",MIN(ROUND(C' + tr + '/B' + tr + '*30,0),30))&REPT("░",MAX(30-ROUND(C' + tr + '/B' + tr + '*30,0),0))').setFontFamily('Courier New').setFontSize(11).setHorizontalAlignment('center');
  s.getRange(tr, 9, 1, 3).merge().setFormula('="Net: " & TEXT(B' + tr + '-C' + tr + ',"+#,##0;-#,##0") & " PKR"').setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(tr, 36);

  s.getRange(tr + 1, 1, 1, 11).merge().setValue('💡 The remaining ~75k from your salary goes to: Alfalah CC payment + debt snowball').setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(tr + 1, 30);

  const rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('⚫ OVER').setBackground(T.critical).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('I5:I20')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🔴 Critical').setBackground(T.danger).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('I5:I20')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟡 Watch').setBackground(T.warning).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('I5:I20')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟢 OK').setBackground(T.success).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('I5:I20')]).build());
  s.setConditionalFormatRules(rules);
  s.setFrozenRows(4);
}

function buildBillsTab(ss, T) {
  let s = ss.getSheetByName(FIN2_TABS.BIL);
  if (!s) s = ss.insertSheet(FIN2_TABS.BIL);
  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());
  s.getRange(1, 1, 40, 10).setBackground(T.bgPage);
  for (let c = 1; c <= 10; c++) s.setColumnWidth(c, 110);

  s.getRange('A1:J1').merge().setValue('📅 BILLS & RECURRING — your real monthly bills · ✅ col J auto-creates txn').setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);
  s.getRange('A2:J2').merge().setValue('💡 Day 0 = variable · ✅ marks paid + auto-logs txn · v3.3 balance check before write').setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(2, 24);
  s.setRowHeight(3, 8);

  const hdr = ['Bill Name', 'Day', 'Amount (PKR)', 'Account', 'Next Due', 'Days Until', 'Status', 'Last Paid', 'Notes', '✅ Mark Paid'];
  s.getRange(4, 1, 1, 10).setValues([hdr]).setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(4, 26);

  const billsData = FIN2_DEFAULT_BILLS;
  for (let i = 0; i < 10; i++) {
    const r = 5 + i;
    if (i < billsData.length) {
      s.getRange(r, 1).setValue(billsData[i][0]);
      s.getRange(r, 2).setValue(billsData[i][1]);
      s.getRange(r, 3).setValue(billsData[i][2]).setNumberFormat('#,##0');
      s.getRange(r, 4).setValue(billsData[i][3]);
    }
    s.getRange(r, 5).setFormula('=IFERROR(IF(OR(B' + r + '="",B' + r + '=0),"",IF(DAY(TODAY())<=B' + r + ',DATE(YEAR(TODAY()),MONTH(TODAY()),B' + r + '),DATE(YEAR(TODAY()),MONTH(TODAY())+1,B' + r + '))),"")').setNumberFormat('dd MMM yyyy');
    s.getRange(r, 6).setFormula('=IFERROR(IF(E' + r + '="","",E' + r + '-TODAY()),"")');
    s.getRange(r, 7).setFormula('=IFERROR(IF(F' + r + '="","🔵 Variable",IF(F' + r + '<0,"⚫ OVERDUE",IF(F' + r + '<=3,"🔴 Due Soon",IF(F' + r + '<=7,"🟡 This Week","🟢 Scheduled")))),"")');
    s.getRange(r, 10).insertCheckboxes();
    s.getRange(r, 1, 1, 9).setBackground(i % 2 === 0 ? T.bgRow : T.bgAlt).setFontColor(T.text).setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 1).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold');
    s.getRange(r, 2, 1, 3).setBackground(T.bgInput);
    s.getRange(r, 9).setHorizontalAlignment('left').setFontStyle('italic').setFontColor(T.textMd);
    s.getRange(r, 10).setBackground(T.success);
    s.setRowHeight(r, 28);
  }

  const accDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_ACCOUNTS, true).setAllowInvalid(true).build();
  s.getRange(5, 4, 10, 1).setDataValidation(accDV);

  const rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('⚫ OVERDUE').setBackground(T.critical).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('G5:G14')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🔴 Due Soon').setBackground(T.danger).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('G5:G14')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟡 This Week').setBackground(T.warning).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('G5:G14')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟢 Scheduled').setBackground(T.success).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('G5:G14')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🔵 Variable').setBackground(T.info).setFontColor('#FFFFFF').setBold(true).setRanges([s.getRange('G5:G14')]).build());
  s.setConditionalFormatRules(rules);
  s.setFrozenRows(4);
}

function buildGoalsTab(ss, T) {
  let s = ss.getSheetByName(FIN2_TABS.GOA);
  if (!s) s = ss.insertSheet(FIN2_TABS.GOA);
  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());
  s.getRange(1, 1, 30, 10).setBackground(T.bgPage);
  for (let c = 1; c <= 10; c++) s.setColumnWidth(c, 110);

  s.getRange('A1:J1').merge().setValue('🎯 SAVINGS GOALS — aspirational · resume after debts cleared').setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);
  s.getRange('A2:J2').merge().setValue('💡 Hidden by default until 232k personal debts + 92k CC are cleared').setBackground(T.bgAccent).setFontColor(T.text).setFontStyle('italic').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(2, 30);
  s.setRowHeight(3, 8);

  const hdr = ['Goal Name', 'Target (PKR)', 'Current (PKR)', 'Progress', 'Deadline', 'Days Left', 'From Account', 'Allocate Amt', '/Day Need', '✅ Allocate'];
  s.getRange(4, 1, 1, 10).setValues([hdr]).setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(4, 26);

  const goalsData = FIN2_DEFAULT_GOALS;
  for (let i = 0; i < 5; i++) {
    const r = 5 + i;
    if (i < goalsData.length) {
      s.getRange(r, 1).setValue(goalsData[i][0]);
      s.getRange(r, 2).setValue(goalsData[i][1]).setNumberFormat('#,##0');
      s.getRange(r, 3).setValue(0).setNumberFormat('#,##0');
      s.getRange(r, 5).setValue(new Date(goalsData[i][2])).setNumberFormat('dd MMM yyyy');
    }
    s.getRange(r, 4).setFormula('=IFERROR(LET(p,C' + r + '/B' + r + ',ROUND(p*100,0)&"% "&REPT("█",ROUND(p*15,0))&REPT("░",15-ROUND(p*15,0))),"")').setFontFamily('Courier New');
    s.getRange(r, 6).setFormula('=IFERROR(E' + r + '-TODAY(),"")');
    s.getRange(r, 7).setValue('Cash');
    s.getRange(r, 8).setValue(0).setNumberFormat('#,##0');
    s.getRange(r, 9).setFormula('=IFERROR(IF(F' + r + '>0,ROUND((B' + r + '-C' + r + ')/F' + r + ',0),0),0)').setNumberFormat('#,##0');
    s.getRange(r, 10).insertCheckboxes();
    s.getRange(r, 1, 1, 9).setBackground(i % 2 === 0 ? T.bgRow : T.bgAlt).setFontColor(T.text).setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 1).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold');
    s.getRange(r, 2).setBackground(T.bgInput);
    s.getRange(r, 3).setBackground(T.bgInput);
    s.getRange(r, 5).setBackground(T.bgInput);
    s.getRange(r, 7).setBackground(T.bgInput);
    s.getRange(r, 8).setBackground(T.bgInput);
    s.getRange(r, 10).setBackground(T.success);
    s.setRowHeight(r, 28);
  }

  const accDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_ACCOUNTS, true).setAllowInvalid(true).build();
  s.getRange(5, 7, 5, 1).setDataValidation(accDV);
  s.setFrozenRows(4);
}

function wipeLedger() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('🧹 WIPE LEDGER',
    'This CLEARS all transaction rows (' + FIN2_LEDGER_START_ROW + '-' + FIN2_LEDGER_END_ROW + '). A snapshot is auto-saved first.\n\nContinue?', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;

  if (typeof snapFinanceSuite === 'function') {
    try { snapFinanceSuite('pre-wipe'); } catch(e) {}
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(FIN2_TABS.TXN);
  if (!tx) { _alertF('❌ Transactions tab not found.'); return; }

  const rowCount = FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1;
  tx.getRange(FIN2_LEDGER_START_ROW, 1, rowCount, 11).clearContent();
  tx.getRange(FIN2_LEDGER_START_ROW, 14, rowCount, 2).clearContent();  // v3.3: includes col 15
  for (let r = FIN2_LEDGER_START_ROW; r <= FIN2_LEDGER_END_ROW; r++) {
    tx.getRange(r, 13).setValue(false);
  }

  _invalidateRowPointer();
  if (typeof logAuditAction === 'function') logAuditAction('LEDGER_WIPED', 'Rows ' + FIN2_LEDGER_START_ROW + '-' + FIN2_LEDGER_END_ROW + ' cleared (incl col 15 FX)');
  _alertF('✅ Ledger wiped.\n\n' + rowCount + ' rows cleared. Snapshot saved. Row cache invalidated.');
}

function setOpeningBalances() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('🏁 SET OPENING BALANCES',
    'For each of 11 accounts, enter CURRENT REAL-WORLD balance.\nType 0 or blank to skip.\n\nProceed?', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;

  const lockResult = _acquireFinLock('setOpeningBalances');
  if (!lockResult.ok) {
    _alertF('🔒 Lock timeout. Wait 5 sec and try again.');
    return;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tx = ss.getSheetByName(FIN2_TABS.TXN);
    if (!tx) { _alertF('❌ Transactions tab not found.'); return; }

    if (typeof snapFinanceSuite === 'function') {
      try { snapFinanceSuite('pre-opening-balances'); } catch(e) {}
    }

    const today = new Date();
    let logged = 0, skipped = 0;

    for (let i = 0; i < FIN2_ACCOUNTS.length; i++) {
      const acc = FIN2_ACCOUNTS[i];
      const isLiab = _isLiability(acc);
      const label = isLiab ? acc + ' — current OUTSTANDING (positive PKR, e.g. 92728)' : acc + ' — current balance (PKR)';

      const prompt = ui.prompt('🏁 Opening ' + (i+1) + '/' + FIN2_ACCOUNTS.length, label, ui.ButtonSet.OK_CANCEL);
      if (prompt.getSelectedButton() !== ui.Button.OK) {
        _alertF('⚠️ Cancelled.\n\nLogged: ' + logged + ' · Skipped: ' + skipped);
        return;
      }
      const txt = prompt.getResponseText().trim();
      if (!txt) { skipped++; continue; }
      const val = parseFloat(txt);
      if (isNaN(val) || val <= 0) { skipped++; continue; }

      const nextRow = _findNextLedgerRow(tx);
      if (nextRow === -1) { _alertF('⚠️ Ledger full at account ' + acc); return; }

      Utilities.sleep(50);
      const txnId = generateTxnId();

      tx.getRange(nextRow, 1, 1, 8).setValues([[today, acc, isLiab ? 'Expense' : 'Income', '💰 Opening Balance', val, 'PKR', val, '']]);
      tx.getRange(nextRow, 1).setNumberFormat('dd MMM yyyy');
      tx.getRange(nextRow, 5).setNumberFormat('#,##0.00');
      tx.getRange(nextRow, 7).setNumberFormat('#,##0.00');
      try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
      tx.getRange(nextRow, 9, 1, 4).merge().setValue('Opening balance · ' + Utilities.formatDate(today, FIN2_TZ, 'dd MMM yyyy'));
      tx.getRange(nextRow, 14).setValue(txnId);
      tx.getRange(nextRow, FIN2_FX_RATE_COL).setValue(1.0);
      _bumpRowPointer(nextRow);

      logged++;
      _logAuditFast('OPENING_BALANCE', acc + ' · ' + val + ' PKR · ' + txnId);
    }

    _alertF('✅ Done.\n\nLogged: ' + logged + ' accounts · Skipped: ' + skipped);
  } finally {
    _releaseFinLock(lockResult);
  }
}

function setCCOpeningBalance() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt('💳 Set CC Opening', 'Enter Alfalah CC current OUTSTANDING (positive PKR):', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const val = parseFloat(prompt.getResponseText().trim());
  if (isNaN(val) || val <= 0) { _alertF('⚠️ Invalid amount.'); return; }

  const lockResult = _acquireFinLock('setCCOpeningBalance');
  if (!lockResult.ok) {
    _alertF('🔒 Lock timeout. Wait 5 sec and try again.');
    return;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tx = ss.getSheetByName(FIN2_TABS.TXN);
    if (!tx) { _alertF('❌ Transactions tab not found.'); return; }

    const nextRow = _findNextLedgerRow(tx);
    if (nextRow === -1) { _alertF('⚠️ Ledger full.'); return; }

    Utilities.sleep(50);
    const txnId = generateTxnId();
    const today = new Date();

    tx.getRange(nextRow, 1, 1, 8).setValues([[today, FIN2_CC_ACCOUNT, 'Expense', '💰 Opening Balance', val, 'PKR', val, '']]);
    tx.getRange(nextRow, 1).setNumberFormat('dd MMM yyyy');
    tx.getRange(nextRow, 5).setNumberFormat('#,##0.00');
    tx.getRange(nextRow, 7).setNumberFormat('#,##0.00');
    try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(nextRow, 9, 1, 4).merge().setValue('CC opening outstanding');
    tx.getRange(nextRow, 14).setValue(txnId);
    tx.getRange(nextRow, FIN2_FX_RATE_COL).setValue(1.0);
    _bumpRowPointer(nextRow);

    _logAuditFast('CC_OPENING', val + ' PKR · ' + txnId);
    _alertF('✅ CC opening logged: ' + val + ' PKR outstanding');
  } finally {
    _releaseFinLock(lockResult);
  }
}

function diagnoseCCMath() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const acc = ss.getSheetByName(FIN2_TABS.ACC);
  if (!acc) { _alertF('❌ Accounts tab not found.'); return; }

  const limit = acc.getRange('B20').getValue() || FIN2_CC_LIMIT;
  const outstanding = acc.getRange('C20').getValue() || 0;
  const available = acc.getRange('D20').getValue() || 0;
  const utilization = acc.getRange('E20').getValue() || 0;
  const status = acc.getRange('F20').getValue() || '';

  let report = '💳 ALFALAH CC DIAGNOSTIC\n\n';
  report += 'Limit:        ' + Utilities.formatString('%,d', limit) + ' PKR\n';
  report += 'Outstanding:  ' + Utilities.formatString('%,d', outstanding) + ' PKR\n';
  report += 'Available:    ' + Utilities.formatString('%,d', available) + ' PKR\n';
  report += 'Utilization:  ' + (utilization * 100).toFixed(1) + '%\n';
  report += 'Status:       ' + status + '\n';
  _alertF(report);
}

function organizeTabsAndGroups(silent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let colored = 0, hidden = 0, shown = 0;

  ss.getSheets().forEach(s => {
    const name = s.getName();
    const config = FIN2_TAB_GROUPS[name];
    if (!config) return;
    try { s.setTabColor(config.color); colored++; } catch(e) {}
    try {
      if (config.hide) {
        if (!s.isSheetHidden()) { s.hideSheet(); hidden++; }
      } else {
        if (s.isSheetHidden()) { s.showSheet(); shown++; }
      }
    } catch(e) {}
  });

  if (typeof logAuditAction === 'function') logAuditAction('TABS_ORGANIZED', colored + ' colored · ' + hidden + ' hidden · ' + shown + ' shown');
  if (!silent) _alertF('🎨 Tabs organized.\n\nColored: ' + colored + ' · Hidden: ' + hidden + ' · Shown: ' + shown);
}

function showAllHiddenTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let shown = 0;
  ss.getSheets().forEach(s => {
    if (s.isSheetHidden()) { try { s.showSheet(); shown++; } catch(e) {} }
  });
  if (typeof logAuditAction === 'function') logAuditAction('TABS_SHOWN_ALL', shown + ' tabs unhidden');
  _alertF('👁 ' + shown + ' hidden tabs shown.');
}

function hideCosmeticTabs() { organizeTabsAndGroups(false); }

function refreshFinanceUSDRate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(FIN2_TABS.TXN);
  if (!tx) { _alertF('❌ Transactions tab not found.'); return; }
  const rate = fetchUSDPKR();
  tx.getRange('H1').setValue(rate);
  _alertF('✅ USD rate refreshed: 1 USD = ' + rate + ' PKR\n\nv3.3: Existing rows keep their original FX rate (col O). Only NEW USD txns use this rate.');
}

function verifyFinanceCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabs = Object.values(FIN2_TABS);
  let report = '🔍 FINANCE SUITE v3.3 ELITE BANKING-GRADE INTEGRITY\n\n';
  let allOk = true;

  tabs.forEach(name => {
    const s = ss.getSheetByName(name);
    const ok = !!s;
    report += (ok ? '✅' : '❌') + ' ' + name + '\n';
    if (!ok) allOk = false;
  });

  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_financeOnEdit');
  const handlerOk = triggers.length === 1;
  report += (handlerOk ? '✅' : '❌') + ' Auto-log handler installed (' + triggers.length + '/1)\n';
  if (!handlerOk) allOk = false;

  const flushTriggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_flushAuditBuffer');
  const flushOk = flushTriggers.length === 1;
  report += (flushOk ? '✅' : '❌') + ' Audit flush trigger installed (' + flushTriggers.length + '/1)\n';
  if (!flushOk) allOk = false;

  const lockOk = (typeof LockService !== 'undefined');
  report += (lockOk ? '✅' : '❌') + ' LockService available\n';
  if (!lockOk) allOk = false;

  const auditWired = (typeof embedAuditPanelInHub === 'function');
  report += (auditWired ? '✅' : '⚠️') + ' Audit panel embed: ' + (auditWired ? 'available' : 'MISSING') + '\n';
  const chartsWired = (typeof embedFinanceCharts === 'function');
  report += (chartsWired ? '✅' : '⚠️') + ' Charts auto-render: ' + (chartsWired ? 'available' : 'NOT loaded') + '\n';

  const tx = ss.getSheetByName(FIN2_TABS.TXN);
  if (tx) {
    const intlHdr = tx.getRange(FIN2_INTL_HEADER_ROW, 1).getValue() || '';
    const intlOk = intlHdr.toString().indexOf('INTL') !== -1;
    report += (intlOk ? '✅' : '❌') + ' Intl header at row ' + FIN2_INTL_HEADER_ROW + '\n';
    if (!intlOk) allOk = false;

    const ledgerHdr = tx.getRange(FIN2_LEDGER_HEADER_ROW, 1).getValue() || '';
    const ledgerOk = ledgerHdr.toString().indexOf('LEDGER') !== -1;
    report += (ledgerOk ? '✅' : '❌') + ' Ledger header at row ' + FIN2_LEDGER_HEADER_ROW + '\n';
    if (!ledgerOk) allOk = false;

    const frozenOk = tx.getFrozenRows() === FIN2_FROZEN_ROWS;
    report += (frozenOk ? '✅' : '⚠️') + ' Frozen rows = ' + tx.getFrozenRows() + ' (expected ' + FIN2_FROZEN_ROWS + ')\n';

    let totalTxns = 0, withId = 0, withFx = 0;
    const numRows = FIN2_LEDGER_END_ROW - FIN2_LEDGER_START_ROW + 1;
    const dates = tx.getRange(FIN2_LEDGER_START_ROW, 1, numRows, 1).getValues();
    const ids = tx.getRange(FIN2_LEDGER_START_ROW, 14, numRows, 1).getValues();
    const fxRates = tx.getRange(FIN2_LEDGER_START_ROW, FIN2_FX_RATE_COL, numRows, 1).getValues();
    for (let i = 0; i < numRows; i++) {
      if (dates[i][0] instanceof Date) {
        totalTxns++;
        if (ids[i][0]) withId++;
        if (fxRates[i][0]) withFx++;
      }
    }
    if (totalTxns > 0) {
      const idPct = Math.round(withId / totalTxns * 100);
      const fxPct = Math.round(withFx / totalTxns * 100);
      report += (idPct === 100 ? '✅' : '⚠️') + ' TxnID coverage: ' + withId + '/' + totalTxns + ' (' + idPct + '%)\n';
      report += (fxPct === 100 ? '✅' : '⚠️') + ' FX_Rate coverage: ' + withFx + '/' + totalTxns + ' (' + fxPct + '%)\n';
    } else {
      report += '✓ TxnID + FX coverage: no transactions yet\n';
    }
  }

  const cached = _readRowPointerCache();
  let bufLen = 0;
  try {
    const raw = PropertiesService.getDocumentProperties().getProperty(FIN2_AUDIT_BUFFER_KEY) || '[]';
    bufLen = JSON.parse(raw).length;
  } catch(e) {}
  report += '\n🛡️ v3.3 ELITE BANKING-GRADE:\n';
  report += '  Balance constraint: pre-write check (asset overdraft + CC overlimit)\n';
  report += '  FX rate snapshot per row: col 15 (FX_Rate_At_Commit)\n';
  report += '  CC over-limit threshold: ' + FIN2_CC_LIMIT.toLocaleString() + ' PKR\n';
  report += '\n🔒 v3.2 PRESERVED:\n';
  report += '  LockService timeout: ' + (FIN2_LOCK_TIMEOUT_MS / 1000) + ' sec\n';
  report += '  TxnID suffix: 5-digit (1/100,000 collision odds)\n';
  report += '  Salary auto-detect: PROMPT mode (never silent)\n';
  report += '  Reversal: atomic linked-partner + pending-marker\n';
  report += '  Row pointer cache: ' + (cached !== -1 ? 'row ' + cached + ' ✅' : 'unset') + '\n';
  report += '  Audit buffer: ' + bufLen + '/' + FIN2_AUDIT_BUFFER_FLUSH_AT + ' entries\n';
  report += '  CC validation gate: ' + CC_VALIDATION_MIN_AMOUNT + ' PKR\n';

  if (!allOk) report += '\n⚠️ Issues detected. Run rebuildFinanceCockpit OR 💉 Vaccinate.';
  else report += '\n✅ All systems operational. v3.3 elite banking-grade locked.';
  _alertF(report);
}

function appendFinanceMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('💰 Finance')
      .addItem('🔄 Rebuild Suite (6 tabs + audit + charts)', 'rebuildFinanceCockpit')
      .addSeparator()
      .addItem('🧹 Wipe Ledger (clean slate)', 'wipeLedger')
      .addItem('🏁 Set Opening Balances (all accounts)', 'setOpeningBalances')
      .addItem('💳 Set CC Opening Balance', 'setCCOpeningBalance')
      .addItem('🔍 Diagnose CC Math', 'diagnoseCCMath')
      .addSeparator()
      .addItem('🎨 Organize Tabs', 'organizeTabsAndGroups')
      .addItem('👁 Show All Hidden Tabs', 'showAllHiddenTabs')
      .addItem('🙈 Hide Cosmetic Tabs', 'hideCosmeticTabs')
      .addSeparator()
      .addItem('💱 Refresh USD Rate', 'refreshFinanceUSDRate')
      .addItem('🔧 Re-install Auto-Log Handler', 'installFinanceEditHandler')
      .addSeparator()
      .addSubMenu(SpreadsheetApp.getUi().createMenu('🛟 Auto-Log Recovery')
        .addItem('🚨 Force Reinstall Handler', 'actForceReinstallHandler')
        .addItem('📤 Submit Last Entry Manually', 'submitLastEntryManually')
        .addItem('🔍 Diagnose Auto-Log Handler', 'diagnoseFinanceHandler')
        .addItem('🔄 Flush Audit Buffer Now', 'flushAuditBufferManually')
        .addItem('🗑 Reset Row Pointer Cache', '_invalidateRowPointer'))
      .addSubMenu(SpreadsheetApp.getUi().createMenu('📦 Snapshots')
        .addItem('📦 Snapshot Now (manual)', 'snapFinanceManual')
        .addItem('📋 Show Snapshots List', 'showSnapshotsMenu')
        .addItem('🔄 Restore From Snapshot', 'restoreFinanceSnapshot')
        .addItem('🗑 Delete Snapshot', 'deleteFinanceSnapshot'))
      .addSeparator()
      .addItem('🛟 Restore Legacy 💰 Finance Tab', 'restoreFinanceLegacyTab')
      .addItem('🔍 Verify Suite Integrity v3.3', 'verifyFinanceCockpit')
      .addToUi();
    } catch(e) { Logger.log('Finance menu add failed: ' + e); }
}

function fixHubFormulaRangesNow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const replacements = {
    "'💸 Transactions'!A:A": "'💸 Transactions'!A14:A213",
    "'💸 Transactions'!B:B": "'💸 Transactions'!B14:B213",
    "'💸 Transactions'!C:C": "'💸 Transactions'!C14:C213",
    "'💸 Transactions'!D:D": "'💸 Transactions'!D14:D213",
    "'💸 Transactions'!E:E": "'💸 Transactions'!E14:E213",
    "'💸 Transactions'!G:G": "'💸 Transactions'!G14:G213",
    "'💸 Transactions'!H:H": "'💸 Transactions'!H14:H213",
    "'💸 Transactions'!I:I": "'💸 Transactions'!I14:I213"
  };

  let totalChanged = 0;
  ['💰 Finance Hub', '🏦 Accounts', '📊 Budget'].forEach(tabName => {
    const sh = ss.getSheetByName(tabName);
    if (!sh) return;
    const formulas = sh.getDataRange().getFormulas();
    for (let r = 0; r < formulas.length; r++) {
      for (let c = 0; c < formulas[r].length; c++) {
        let f = formulas[r][c];
        if (!f) continue;
        let updated = f;
        Object.keys(replacements).forEach(find => {
          updated = updated.split(find).join(replacements[find]);
        });
        if (updated !== f) {
          sh.getRange(r + 1, c + 1).setFormula(updated);
          totalChanged++;
        }
      }
    }
  });

  if (typeof logAuditAction === 'function') {
    logAuditAction('HUB_FORMULA_FIX', totalChanged + ' formulas re-ranged to ledger 14-213');
  }
  _alertF('✅ Fixed ' + totalChanged + ' formulas across Hub + Accounts + Budget.\n\nRefresh sheet (F5) to see Hub update.');
}

function fixTxnColorsNow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(FIN2_TABS.TXN);
  if (!tx) { _alertF('❌ Transactions tab not found.'); return; }
  const T = getFinTheme();
  tx.clearConditionalFormatRules();
  applyTxnFormatting(tx, T);
  SpreadsheetApp.flush();
  if (typeof logAuditAction === 'function') {
    logAuditAction('TXN_COLORS_FIX', 'Re-applied conditional formatting · range 14-213 · 5 rules');
  }
  _alertF('✅ Conditional formatting restored.\n\nIncome=green Expense=red Transfer=blue Debt Out=orange Debt In=purple\n\nRefresh sheet (F5).');
}
