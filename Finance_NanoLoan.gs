// ════════════════════════════════════════════════════════════════════
// 📱 Finance_NanoLoan.gs — NANO LOAN TRACKER + IN-SHEET FORM v1.1
// LOCKED · 7-Layer Audit · Day 7 / 90 · 2026-05-01 · Phase 3 Option A
//
// CHANGES FROM v1.0:
//   - Added in-sheet Quick Entry form on 📱 Nano Loans tab rows 4-6
//   - Added "⚡ Push Today's Loans to CC" button at row 7 (single combined
//     1-Bill payment for all loans logged today that aren't yet pushed)
//   - Added _nanoLoanOnEdit handler watching:
//       row 5 col K (loan submit checkbox) → submitLoanFromQuickEntry
//       row 7 col K (push CC checkbox)     → pushTodaysLoansToCC
//   - Added installNanoLoanEditHandler trigger registration
//   - All other rows shifted +5 to make room (KPI 8-9 was 4-5,
//     active section 11-32 was 7-28, closed section 34-53 was 30-49)
//   - Wizard preserved (openBatchLoopWizard unchanged)
//
// ════════════════════════════════════════════════════════════════════
// 7-LAYER AUDIT
// ════════════════════════════════════════════════════════════════════
//
// LAYER 1 — 5-TEST AUDIT
//   ✓ Self-Contained: typeof-guarded externals only
//   ✓ Side-Effects: writes to 📱 Nano Loans tab + 💸 Transactions
//                   (existing pattern) + 💰 Finance Hub rows 47-54
//   ✓ Re-Run Safe: rebuildNanoLoansTab clears + rebuilds. On-edit
//                  handler is idempotent (re-installable). All form
//                  submissions auto-clear after success.
//   ✓ Mentally Traced: see Layer 2.
//   ✓ Failure Modes: missing tabs, full ledger, invalid form input,
//                    no loans-today for push button — all handled.
//
// LAYER 2 — FUNCTION CALL GRAPH
//   _nanoLoanOnEdit (auto-fired by Apps Script on any cell edit)
//     → guard: only act if sheet=📱 Nano Loans + K5/K7 checkbox=TRUE
//     → submitLoanFromQuickEntry (row 5 K=TRUE)
//         → batch read row 5 cells A-G (1 call)
//         → validate inputs
//         → _logNanoLoanIn (writes Loan tab Active row + ledger Income row)
//         → auto-clear row 5 form
//         → _setNanoStatus
//     → pushTodaysLoansToCC (row 7 K=TRUE)
//         → batch read all Active rows
//         → filter to today's loans not yet pushed
//         → confirm via popup
//         → _logCCPaymentFromSource (3 ledger rows: Out + In + 1-Bill fee)
//         → mark each pushed loan with [PUSHED] tag in notes
//         → summary alert
//   submitLoanFromQuickEntry → _logNanoLoanIn → _findNextLedgerRow ✓
//   pushTodaysLoansToCC → getBillerFeeForAmount ✓ (Finance_Intl v1.1)
//
// LAYER 3 — ROW LAYOUT MAP (📱 Nano Loans tab v1.1)
//   1:      Title
//   2:      Subtitle
//   3:      spacer
//   4:      🪄 QUICK ADD LOAN section header
//   5:      FORM ROW: Date · App · Principal · Cool-Off · Shape · Source · Notes · Status · ✅ Submit
//   6:      hint
//   7:      ⚡ PUSH TODAY'S LOANS TO CC: Status · Pending count · ✅ Push
//   8:      spacer
//   9:      📊 LOAN STATE section header
//   10:     KPI strip (3 cards)
//   11:     spacer
//   12:     🟢 ACTIVE LOANS section header
//   13:     Active column headers
//   14-33:  Active loans (20 rows)
//   34:     spacer
//   35:     ⚪ RECENTLY CLOSED section header
//   36:     Closed column headers
//   37-56:  Closed loans (20 rows)
//   57:     spacer
//   58-59:  Footer hints
//   No overlap. Form lives in form zone (4-7), data lives in data zone (12-56).
//
// LAYER 4 — CELL-STATE MATRIX
//   Form row 5: K5 = checkbox (FALSE initially, set TRUE on submit, auto-cleared)
//   Push row 7: K7 = checkbox (same pattern)
//   Form A5 = date (date validation)
//   Form B5 = app dropdown (NL_APPS names)
//   Form C5 = principal (number)
//   Form D5 = cool-off (number)
//   Form E5 = shape dropdown (A or B)
//   Form F5 = source dropdown (FIN2_ACCOUNTS or fallback list)
//   Form G5:I5 = notes (merged text)
//   J5 = status (auto-updated)
//   Active rows 14-33: same dropdowns as v1.0 (date/app/status/shape)
//
// LAYER 5 — STATE-ORDER PROOF
//   1. clear → 2. clearFormat → 3. clearDataValidations
//   4. setBackground base → 5. write static layout (titles, headers, sections)
//   6. write form defaults (row 5) including checkboxes K5/K7
//   7. write data rows (active + closed restore)
//   8. apply ALL dropdowns LAST (form + active + closed in batch)
//   9. setFrozenRows
//
// LAYER 6 — BACKWARD-COMPAT VERIFICATION
//   listActiveNanoLoans / listClosedNanoLoans / getNanoLoopFeesMTD /
//   getCurrentCCOutstanding signatures unchanged → Hub embed reads
//   from new row layout via _readActiveLoansFromTab which now
//   scans rows 14-33 (was 9-28 in v1.0). Compatible.
//   Wizard openBatchLoopWizard signature unchanged.
//   Hub embed renderNanoLoanPanelInHub unchanged.
//
// LAYER 7 — FAILURE-MODE INVENTORY
//   1. Form K5 ticked but row 5 incomplete → status shows ⚠ + uncheck
//   2. Form principal not a number → status shows ⚠ + uncheck
//   3. Active loans tab full (20 rows) → status shows ⚠ + uncheck
//   4. Push K7 ticked with no today's loans → alert "nothing to push" + uncheck
//   5. Push amount 0 (after filtering) → alert + uncheck
//   6. Push CC payment fails mid-write → partial state alert with row numbers
//   7. _nanoLoanOnEdit handler not installed → form doesn't submit;
//      menu item "🔧 Re-install Handler" fixes
//   8. User edits row 5 cells but never ticks K5 → no auto-submit (correct)
//   9. User pre-loaded loans before installing handler → wizard or
//      single-loan menu still works as fallback

const NL_TAB = '📱 Nano Loans';
const NL_TZ = 'Asia/Karachi';

const NL_APPS = [
  { code: 'SQ', name: 'Smart Qarza',  defaultShape: 'B' },
  { code: 'PA', name: 'Paisayaar',    defaultShape: 'A' },
  { code: 'BW', name: 'Barwaqt',      defaultShape: 'A' },
  { code: 'EL', name: 'EasyLoan',     defaultShape: 'A' },
  { code: 'FP', name: 'FinjaPay',     defaultShape: 'A' },
  { code: 'SR', name: 'Sarmaya',      defaultShape: 'A' }
];

const NL_SHAPES = {
  'A': { label: 'A · Refinance Loop',     desc: 'Repay via HBL Pay funded by CC' },
  'B': { label: 'B · Salary-Redeemed',    desc: 'Repay via salary cash' }
};

const NL_STATUSES = ['Active', 'Closed', 'Defaulted'];

const NL_CATEGORIES = {
  IN:     '📱 Nano Loan In',
  REPAY:  '📱 Nano Loan Repay',
  FEE:    '📱 Nano Loop Fee'
};

const NL_HUB_START_ROW = 47;
const NL_HUB_ROWS = 8;

const NL_DEFAULT_SOURCE_ACCOUNT = 'Easypaisa';
const NL_CC_ACCOUNT = 'Alfalah CC';

// v1.1: Form layout constants
const NL_FORM_ROW = 5;
const NL_FORM_SUBMIT_COL = 11;       // K5
const NL_FORM_STATUS_COL = 10;       // J5
const NL_PUSH_ROW = 7;
const NL_PUSH_SUBMIT_COL = 11;       // K7

// v1.1: Active loans now live at rows 14-33 (was 9-28 in v1.0)
const NL_ACTIVE_START_ROW = 14;
const NL_ACTIVE_END_ROW = 33;
// v1.1: Closed loans now at 37-56 (was 32-51)
const NL_CLOSED_START_ROW = 37;
const NL_CLOSED_END_ROW = 56;

// ──────────────────────────────────────────────────────────
// SAFE WRAPPERS
// ──────────────────────────────────────────────────────────

function _nlAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}
function _nlLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}
function _nlTxnId() {
  if (typeof generateTxnId === 'function') return generateTxnId();
  const stamp = Utilities.formatDate(new Date(), NL_TZ, 'yyyyMMdd-HHmmss');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return 'TXN-' + stamp + '-' + rand;
}
function _nlFindNextRow(tx) {
  if (typeof _findNextLedgerRow === 'function') return _findNextLedgerRow(tx);
  for (let r = 14; r <= 213; r++) { if (!tx.getRange(r, 1).getValue()) return r; }
  return -1;
}
function _nlBumpPointer(row) {
  if (typeof _bumpRowPointer === 'function') _bumpRowPointer(row);
}
function _nlInvalidatePointer() {
  if (typeof _invalidateRowPointer === 'function') _invalidateRowPointer();
}
function _nlBillerFee(amount) {
  if (typeof getBillerFeeForAmount === 'function') return getBillerFeeForAmount(amount);
  return { base: 25, fed: 6.25, total: 31.25, tier: 'fallback', amount: amount };
}
function _nlTheme() {
  if (typeof getFinTheme === 'function') return getFinTheme();
  return {
    bgPage: '#FFFFFF', bgPanel: '#F8FAFC', bgRow: '#FFFFFF',
    bgAlt: '#F1F5F9', bgInput: '#FFFBEB', bgHeader: '#1E293B',
    bgSection: '#0F172A', bgAccent: '#FEF3C7', bgAsset: '#DCFCE7',
    bgLiability: '#FEE2E2', bgStatusOk: '#D1FAE5', bgStatusWarn: '#FEF3C7',
    bgStatusErr: '#FEE2E2',
    text: '#0F172A', textHi: '#000000', textMd: '#334155', textLo: '#64748B',
    textOk: '#065F46', textWarn: '#78350F', textErr: '#7F1D1D',
    success: '#16A34A', warning: '#D97706', danger: '#DC2626',
    info: '#2563EB', purple: '#7C3AED', orange: '#EA580C'
  };
}
function _nlAccountsList() {
  if (typeof FIN2_ACCOUNTS !== 'undefined') return FIN2_ACCOUNTS;
  return ['Cash', 'JazzCash', 'Easypaisa', 'UBL', 'UBL Prepaid', 'Meezan',
          'Mashreq Bank', 'JS Bank', 'Naya Pay', 'Bank Alfalah', 'Alfalah CC'];
}

function _setNanoStatus(s, txt, kind) {
  const T = _nlTheme();
  const bg = kind === 'ok' ? T.bgStatusOk : (kind === 'warn' ? T.bgStatusWarn : (kind === 'err' ? T.bgStatusErr : T.bgPanel));
  const fc = kind === 'ok' ? T.textOk : (kind === 'warn' ? T.textWarn : (kind === 'err' ? T.textErr : T.textLo));
  try {
    s.getRange(NL_FORM_ROW, NL_FORM_STATUS_COL).setValue(txt).setBackground(bg).setFontColor(fc).setFontWeight('bold');
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════════════
// TAB BUILD (v1.1: form rows added at top)
// ════════════════════════════════════════════════════════════════════

function rebuildNanoLoansTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const T = _nlTheme();

  if (typeof snapFinanceSuite === 'function') {
    try { snapFinanceSuite('pre-nanoloan-rebuild-v1.1'); } catch(e) {}
  }

  let s = ss.getSheetByName(NL_TAB);
  const existingActive = s ? _readActiveLoansFromTab(s) : [];
  const existingClosed = s ? _readClosedLoansFromTab(s) : [];

  if (!s) s = ss.insertSheet(NL_TAB);
  try { s.setTabColor('#7C3AED'); } catch(e) {}

  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());

  const widths = [110, 120, 100, 90, 90, 110, 100, 100, 100, 110, 110];
  widths.forEach((w, i) => s.setColumnWidth(i + 1, w));

  s.getRange(1, 1, 65, 11).setBackground(T.bgPage);

  // ROW 1 — Title
  s.getRange('A1:K1').merge()
    .setValue('📱 NANO LOANS — Smart Qarza · Paisayaar · others · loop-aware tracking')
    .setBackground(T.purple).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);

  // ROW 2 — Subtitle
  s.getRange('A2:K2').merge()
    .setValue('Shape A = Refinance Loop (CC bounce) · Shape B = Salary-Redeemed (real paydown) · 1-Bill fees auto-tiered')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(2, 22);
  s.setRowHeight(3, 8);

  // ROW 4 — Quick Add header (v1.1 NEW)
  s.getRange('A4:K4').merge()
    .setValue('🪄 QUICK ADD LOAN — fill row 5 → ✅ submit in K5 · ~1-3 sec')
    .setBackground(T.bgAccent).setFontColor(T.text).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(4, 24);

  // ROW 5 — Form (v1.1 NEW)
  // Cols: A=Date, B=App, C=Principal, D=Cool-Off, E=Shape, F=Source, G:I=Notes(merged), J=Status, K=Submit
  s.getRange(NL_FORM_ROW, 1).setValue(new Date()).setNumberFormat('dd MMM yyyy');
  s.getRange(NL_FORM_ROW, 2).setValue('Paisayaar');
  s.getRange(NL_FORM_ROW, 3).setValue('').setNumberFormat('#,##0.00');
  s.getRange(NL_FORM_ROW, 4).setValue('').setNumberFormat('#,##0.00');
  s.getRange(NL_FORM_ROW, 5).setValue('A');
  s.getRange(NL_FORM_ROW, 6).setValue(NL_DEFAULT_SOURCE_ACCOUNT);
  s.getRange(NL_FORM_ROW, 7, 1, 3).merge().setValue('');
  s.getRange(NL_FORM_ROW, NL_FORM_STATUS_COL).setValue('ready');
  s.getRange(NL_FORM_ROW, NL_FORM_SUBMIT_COL).insertCheckboxes();

  s.getRange(NL_FORM_ROW, 1, 1, 6).setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(NL_FORM_ROW, 7, 1, 3).setBackground(T.bgInput).setFontColor(T.text).setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.getRange(NL_FORM_ROW, NL_FORM_STATUS_COL).setBackground(T.bgPanel).setFontColor(T.textLo)
    .setFontStyle('italic').setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(NL_FORM_ROW, NL_FORM_SUBMIT_COL).setBackground(T.success).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(NL_FORM_ROW, 36);

  // ROW 6 — hint
  s.getRange('A6:K6').merge()
    .setValue('💡 Date · App · Principal · Cool-Off Fee · Shape (A=loop B=salary) · Source (where loan lands) · Notes')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(6, 22);

  // ROW 7 — Push button (v1.1 NEW)
  s.getRange(NL_PUSH_ROW, 1, 1, 4).merge()
    .setValue('⚡ PUSH TODAY\'S LOANS TO CC')
    .setBackground(T.warning).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(NL_PUSH_ROW, 5, 1, 6).merge()
    .setFormula('=LET(today,TODAY(),principalSum,SUMIFS(F' + NL_ACTIVE_START_ROW + ':F' + NL_ACTIVE_END_ROW + ',A' + NL_ACTIVE_START_ROW + ':A' + NL_ACTIVE_END_ROW + ',today),notesScan,COUNTIF(J' + NL_ACTIVE_START_ROW + ':J' + NL_ACTIVE_END_ROW + ',"*PUSHED*"),IF(principalSum=0,"No loans logged today","Today\'s principal: "&TEXT(principalSum,"#,##0")&" PKR · click ✅ to push as ONE 1-Bill payment"))')
    .setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(NL_PUSH_ROW, NL_PUSH_SUBMIT_COL).insertCheckboxes();
  s.getRange(NL_PUSH_ROW, NL_PUSH_SUBMIT_COL).setBackground(T.warning).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(NL_PUSH_ROW, 30);
  s.setRowHeight(8, 8);

  // ROW 9 — Loan State header
  s.getRange('A9:K9').merge().setValue('📊 LOAN STATE')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(9, 24);

  // ROW 10 — KPI strip
  s.getRange('A10:D10').merge()
    .setFormula('="🟢 ACTIVE\n"&COUNTIF(C' + NL_ACTIVE_START_ROW + ':C' + NL_ACTIVE_END_ROW + ',"Active")&" loans"')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.getRange('E10:H10').merge()
    .setFormula('="💰 OWED TOTAL\n"&TEXT(SUMIF(C' + NL_ACTIVE_START_ROW + ':C' + NL_ACTIVE_END_ROW + ',"Active",F' + NL_ACTIVE_START_ROW + ':F' + NL_ACTIVE_END_ROW + '),"#,##0")&" PKR"')
    .setBackground(T.warning).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.getRange('I10:K10').merge()
    .setFormula('="📅 LOOP FEES MTD\n"&TEXT(IFERROR(SUMIFS(\'💸 Transactions\'!G:G,\'💸 Transactions\'!D:D,"' + NL_CATEGORIES.FEE + '",\'💸 Transactions\'!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1)),0),"#,##0")&" PKR"')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(10, 50);
  s.setRowHeight(11, 8);

  // ROW 12 — Active section header
  s.getRange('A12:K12').merge().setValue('🟢 ACTIVE LOANS — submitted via form OR wizard')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(12, 26);

  // ROW 13 — Active column headers
  const activeHdr = ['Date', 'App', 'Status', 'Shape', 'Principal', 'Total Owed', 'Cool-Off Due', 'Source Acct', 'TxnID In', 'Notes', ''];
  s.getRange(13, 1, 1, 11).setValues([activeHdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(13, 24);

  // Restore existing active loans (rows 14-33)
  for (let i = 0; i < Math.min(existingActive.length, 20); i++) {
    const r = NL_ACTIVE_START_ROW + i;
    const e = existingActive[i];
    s.getRange(r, 1, 1, 11).setValues([e]);
    s.getRange(r, 1).setNumberFormat('dd MMM yyyy');
    s.getRange(r, 5).setNumberFormat('#,##0.00');
    s.getRange(r, 6).setNumberFormat('#,##0.00');
    s.getRange(r, 7).setNumberFormat('dd MMM yyyy');
  }

  for (let r = NL_ACTIVE_START_ROW; r <= NL_ACTIVE_END_ROW; r++) {
    const bg = (r % 2 === 0) ? T.bgRow : T.bgAlt;
    s.getRange(r, 1, 1, 11).setBackground(bg).setFontColor(T.text).setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(r, 24);
  }

  s.setRowHeight(34, 8);

  // ROW 35 — Closed section header
  s.getRange('A35:K35').merge().setValue('⚪ RECENTLY CLOSED / DEFAULTED')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(35, 24);

  // ROW 36 — Closed column headers
  const closedHdr = ['Date In', 'App', 'Status', 'Shape', 'Principal', 'Repaid', 'Closed Date', 'Source Acct', 'TxnID In', 'Notes', ''];
  s.getRange(36, 1, 1, 11).setValues([closedHdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(36, 22);

  for (let i = 0; i < Math.min(existingClosed.length, 20); i++) {
    const r = NL_CLOSED_START_ROW + i;
    const e = existingClosed[i];
    s.getRange(r, 1, 1, 11).setValues([e]);
    s.getRange(r, 1).setNumberFormat('dd MMM yyyy');
    s.getRange(r, 5).setNumberFormat('#,##0.00');
    s.getRange(r, 6).setNumberFormat('#,##0.00');
    s.getRange(r, 7).setNumberFormat('dd MMM yyyy');
  }
  for (let r = NL_CLOSED_START_ROW; r <= NL_CLOSED_END_ROW; r++) {
    const bg = (r % 2 === 1) ? T.bgRow : T.bgAlt;
    s.getRange(r, 1, 1, 11).setBackground(bg).setFontColor(T.textLo).setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(r, 22);
  }

  s.setRowHeight(57, 8);
  s.getRange('A58:K58').merge().setValue('💡 Quick log: fill row 5 → ✅ K5 (1-3 sec, no popups)')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(58, 22);
  s.getRange('A59:K59').merge().setValue('💡 Batch day (4+ loans): 🎛️ Sovereign → 📱 Nano Loans → 🪄 Batch Loop Wizard')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(59, 22);

  // Apply ALL dropdowns LAST
  applyNanoLoanDropdowns(s);

  s.setFrozenRows(7);

  // Install on-edit handler
  installNanoLoanEditHandler(true);

  _nlLog('NANOLOAN_TAB_REBUILD', 'v1.1 form-enabled · active=' + existingActive.length + ' · closed=' + existingClosed.length);
  _nlAlert('✅ 📱 Nano Loans tab built (v1.1 — in-sheet form).\n\n' +
           'Active loans restored: ' + existingActive.length + '\n' +
           'Closed loans restored: ' + existingClosed.length + '\n\n' +
           '🪄 Quick log: fill row 5 → ✅ K5 (1-3 sec)\n' +
           '⚡ Push today: ✅ K7 (combined 1-Bill payment)\n' +
           '🎛️ Wizard still available for big batch days');
}

function applyNanoLoanDropdowns(s) {
  const dateDV = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
  const appDV = SpreadsheetApp.newDataValidation().requireValueInList(NL_APPS.map(a => a.name), true).setAllowInvalid(true).build();
  const statusDV = SpreadsheetApp.newDataValidation().requireValueInList(NL_STATUSES, true).setAllowInvalid(true).build();
  const shapeDV = SpreadsheetApp.newDataValidation().requireValueInList(['A', 'B'], true).setAllowInvalid(true).build();
  const accDV = SpreadsheetApp.newDataValidation().requireValueInList(_nlAccountsList(), true).setAllowInvalid(true).build();

  // Form row 5
  s.getRange(NL_FORM_ROW, 1).setDataValidation(dateDV);
  s.getRange(NL_FORM_ROW, 2).setDataValidation(appDV);
  s.getRange(NL_FORM_ROW, 5).setDataValidation(shapeDV);
  s.getRange(NL_FORM_ROW, 6).setDataValidation(accDV);

  // Active rows
  s.getRange(NL_ACTIVE_START_ROW, 1, NL_ACTIVE_END_ROW - NL_ACTIVE_START_ROW + 1, 1).setDataValidation(dateDV);
  s.getRange(NL_ACTIVE_START_ROW, 2, NL_ACTIVE_END_ROW - NL_ACTIVE_START_ROW + 1, 1).setDataValidation(appDV);
  s.getRange(NL_ACTIVE_START_ROW, 3, NL_ACTIVE_END_ROW - NL_ACTIVE_START_ROW + 1, 1).setDataValidation(statusDV);
  s.getRange(NL_ACTIVE_START_ROW, 4, NL_ACTIVE_END_ROW - NL_ACTIVE_START_ROW + 1, 1).setDataValidation(shapeDV);
  s.getRange(NL_ACTIVE_START_ROW, 7, NL_ACTIVE_END_ROW - NL_ACTIVE_START_ROW + 1, 1).setDataValidation(dateDV);

  // Closed rows
  s.getRange(NL_CLOSED_START_ROW, 1, NL_CLOSED_END_ROW - NL_CLOSED_START_ROW + 1, 1).setDataValidation(dateDV);
  s.getRange(NL_CLOSED_START_ROW, 2, NL_CLOSED_END_ROW - NL_CLOSED_START_ROW + 1, 1).setDataValidation(appDV);
  s.getRange(NL_CLOSED_START_ROW, 3, NL_CLOSED_END_ROW - NL_CLOSED_START_ROW + 1, 1).setDataValidation(statusDV);
  s.getRange(NL_CLOSED_START_ROW, 4, NL_CLOSED_END_ROW - NL_CLOSED_START_ROW + 1, 1).setDataValidation(shapeDV);
  s.getRange(NL_CLOSED_START_ROW, 7, NL_CLOSED_END_ROW - NL_CLOSED_START_ROW + 1, 1).setDataValidation(dateDV);
}

function _readActiveLoansFromTab(s) {
  if (!s) return [];
  const numRows = NL_ACTIVE_END_ROW - NL_ACTIVE_START_ROW + 1;
  const block = s.getRange(NL_ACTIVE_START_ROW, 1, numRows, 11).getValues();
  return block.filter(row => row[0] instanceof Date && row[2] === 'Active');
}
function _readClosedLoansFromTab(s) {
  if (!s) return [];
  const numRows = NL_CLOSED_END_ROW - NL_CLOSED_START_ROW + 1;
  const block = s.getRange(NL_CLOSED_START_ROW, 1, numRows, 11).getValues();
  return block.filter(row => row[0] instanceof Date && (row[2] === 'Closed' || row[2] === 'Defaulted'));
}

// ════════════════════════════════════════════════════════════════════
// PUBLIC HELPERS for Hub / Recon (UNCHANGED signatures)
// ════════════════════════════════════════════════════════════════════

function listActiveNanoLoans() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(NL_TAB);
  if (!s) return [];
  return _readActiveLoansFromTab(s);
}

function listClosedNanoLoans() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(NL_TAB);
  if (!s) return [];
  return _readClosedLoansFromTab(s);
}

function getNanoLoopFeesMTD() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) return 0;
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  let total = 0;
  const block = tx.getRange(14, 1, 200, 7).getValues();
  for (let i = 0; i < block.length; i++) {
    const date = block[i][0];
    if (!(date instanceof Date) || date < monthStart) continue;
    const cat = block[i][3];
    if (cat === NL_CATEGORIES.FEE) total += parseFloat(block[i][4]) || 0;
  }
  return total;
}

function getCurrentCCOutstanding() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const acc = ss.getSheetByName('🏦 Accounts');
  if (!acc) return null;
  try { return parseFloat(acc.getRange('C20').getValue()) || 0; } catch(e) { return null; }
}

// ════════════════════════════════════════════════════════════════════
// ON-EDIT HANDLER (v1.1 NEW)
// ════════════════════════════════════════════════════════════════════

function _nanoLoanOnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== NL_TAB) return;

  const r = e.range.getRow();
  const c = e.range.getColumn();
  const v = e.value;

  // Loan submit checkbox K5
  if (r === NL_FORM_ROW && c === NL_FORM_SUBMIT_COL && (v === 'TRUE' || v === true)) {
    submitLoanFromQuickEntry(sh);
    return;
  }
  // Push today's loans to CC checkbox K7
  if (r === NL_PUSH_ROW && c === NL_PUSH_SUBMIT_COL && (v === 'TRUE' || v === true)) {
    pushTodaysLoansToCC(sh);
    return;
  }
}

function installNanoLoanEditHandler(silent) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_nanoLoanOnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('_nanoLoanOnEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  if (!silent) _nlAlert('✅ Nano Loan auto-log handler installed.');
}

function diagnoseNanoLoanHandler() {
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_nanoLoanOnEdit');
  let report = '🔍 NANO LOAN HANDLER DIAGNOSTIC v1.1\n\n';
  report += 'On-edit triggers: ' + triggers.length + ' ' + (triggers.length === 1 ? '✅' : '⚠️') + ' (expected 1)\n';
  if (triggers.length === 0) report += '\n🚨 FIX: 🎛️ Sovereign → 📱 Nano Loans → 🔧 Re-install Handler';
  else if (triggers.length > 1) report += '\n⚠️ Duplicate triggers — run Re-install to clean up.';
  else report += '\n✅ Operational. Form K5 + Push K7 will auto-fire.';
  _nlAlert(report);
}

// ════════════════════════════════════════════════════════════════════
// HOT PATH — submitLoanFromQuickEntry (v1.1 NEW)
// ════════════════════════════════════════════════════════════════════

function submitLoanFromQuickEntry(s) {
  // Batch read row 5 cols 1-9
  const formBlock = s.getRange(NL_FORM_ROW, 1, 1, 9).getValues()[0];
  const date = formBlock[0];
  const app = formBlock[1];
  const principal = formBlock[2];
  const coolOffFee = formBlock[3];
  const shape = formBlock[4];
  const sourceAcct = formBlock[5];
  const notes = formBlock[6];

  if (!(date instanceof Date)) {
    s.getRange(NL_FORM_ROW, NL_FORM_SUBMIT_COL).setValue(false);
    _setNanoStatus(s, '⚠ no date', 'warn');
    return;
  }
  if (!app) {
    s.getRange(NL_FORM_ROW, NL_FORM_SUBMIT_COL).setValue(false);
    _setNanoStatus(s, '⚠ no app', 'warn');
    return;
  }
  if (!principal || typeof principal !== 'number' || principal <= 0) {
    s.getRange(NL_FORM_ROW, NL_FORM_SUBMIT_COL).setValue(false);
    _setNanoStatus(s, '⚠ bad principal', 'warn');
    return;
  }
  const coolOff = (typeof coolOffFee === 'number' && coolOffFee >= 0) ? coolOffFee : 0;
  const shapeVal = (shape === 'A' || shape === 'B') ? shape :
                   (NL_APPS.find(a => a.name === app) || {defaultShape: 'A'}).defaultShape;
  const sourceVal = sourceAcct || NL_DEFAULT_SOURCE_ACCOUNT;

  const result = _logNanoLoanIn({
    date: date, app: app, principal: principal,
    coolOffFee: coolOff, shape: shapeVal, sourceAccount: sourceVal,
    notes: notes || ''
  });

  if (!result.ok) {
    s.getRange(NL_FORM_ROW, NL_FORM_SUBMIT_COL).setValue(false);
    _setNanoStatus(s, '⚠ ' + result.error, 'err');
    _nlAlert('❌ Loan log failed: ' + result.error);
    return;
  }

  // Auto-clear form (preserve date as today, app as last-used, source as last)
  s.getRange(NL_FORM_ROW, 1).setValue(new Date());
  s.getRange(NL_FORM_ROW, 3).setValue('');
  s.getRange(NL_FORM_ROW, 4).setValue('');
  s.getRange(NL_FORM_ROW, 7, 1, 3).setValue('');
  s.getRange(NL_FORM_ROW, NL_FORM_SUBMIT_COL).setValue(false);
  _setNanoStatus(s, '✓ ' + app + ' ' + Math.round(principal).toLocaleString(), 'ok');
}

// ════════════════════════════════════════════════════════════════════
// HOT PATH — pushTodaysLoansToCC (v1.1 NEW)
// ════════════════════════════════════════════════════════════════════

function pushTodaysLoansToCC(s) {
  // Find today's loans not yet pushed
  const todayStr = Utilities.formatDate(new Date(), NL_TZ, 'yyyy-MM-dd');
  const numRows = NL_ACTIVE_END_ROW - NL_ACTIVE_START_ROW + 1;
  const block = s.getRange(NL_ACTIVE_START_ROW, 1, numRows, 11).getValues();

  const todaysLoans = [];
  for (let i = 0; i < block.length; i++) {
    const row = block[i];
    const date = row[0];
    const status = row[2];
    const principal = row[4];
    const notes = String(row[9] || '');
    if (!(date instanceof Date) || status !== 'Active' || !principal) continue;
    const dateStr = Utilities.formatDate(date, NL_TZ, 'yyyy-MM-dd');
    if (dateStr !== todayStr) continue;
    if (notes.indexOf('[PUSHED]') !== -1) continue;
    todaysLoans.push({
      sheetRow: NL_ACTIVE_START_ROW + i,
      app: row[1],
      principal: parseFloat(principal),
      sourceAcct: row[7]
    });
  }

  if (todaysLoans.length === 0) {
    s.getRange(NL_PUSH_ROW, NL_PUSH_SUBMIT_COL).setValue(false);
    _nlAlert('🤷 No unpushed loans logged today.\n\n' +
             'Either:\n  • You have no loans dated today\n  • All today\'s loans already pushed (have [PUSHED] tag in notes)');
    return;
  }

  // Group by source account (in case of mixed sources)
  const groupedBySource = {};
  todaysLoans.forEach(l => {
    if (!groupedBySource[l.sourceAcct]) groupedBySource[l.sourceAcct] = [];
    groupedBySource[l.sourceAcct].push(l);
  });

  const sources = Object.keys(groupedBySource);
  let preview = '⚡ PUSH TODAY\'S LOANS TO CC — review\n\n';
  let totalPrincipal = 0;
  sources.forEach(src => {
    const grp = groupedBySource[src];
    let grpSum = 0;
    grp.forEach(l => { grpSum += l.principal; });
    preview += '📥 From ' + src + ': ' + grpSum.toLocaleString() + ' PKR\n';
    grp.forEach(l => { preview += '   • ' + l.app + ' · ' + l.principal.toLocaleString() + '\n'; });
    totalPrincipal += grpSum;
  });

  const ccBefore = getCurrentCCOutstanding();
  const totalFee = sources.reduce((sum, src) => {
    let grpSum = 0;
    groupedBySource[src].forEach(l => { grpSum += l.principal; });
    return sum + _nlBillerFee(grpSum).total;
  }, 0);

  preview += '\n💳 1-Bill fees (tiered, salary-coverable): ' + totalFee.toFixed(2) + ' PKR\n';
  if (ccBefore !== null) {
    const ccAfter = ccBefore - totalPrincipal + totalFee;
    preview += '\n📊 CC IMPACT:\n';
    preview += '  Before: ' + ccBefore.toLocaleString() + ' PKR\n';
    preview += '  After:  ' + ccAfter.toLocaleString() + ' PKR' + (ccAfter <= 0 ? ' ✅ GRACE EARNED' : '') + '\n';
  }
  preview += '\nProceed? Each source group = 1 combined CC payment.';

  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert('⚡ Push Today\'s Loans', preview, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) {
    s.getRange(NL_PUSH_ROW, NL_PUSH_SUBMIT_COL).setValue(false);
    return;
  }

  // Execute one combined payment per source
  let pushedTotal = 0;
  let feesTotal = 0;
  let errors = [];
  const pushedRowsAll = [];

  sources.forEach(src => {
    const grp = groupedBySource[src];
    let grpSum = 0;
    grp.forEach(l => { grpSum += l.principal; });

    const ccr = _logCCPaymentFromSource({
      amount: grpSum, sourceAccount: src,
      notes: 'Push today\'s loans (' + grp.length + ' from ' + src + ')'
    });

    if (ccr.ok) {
      pushedTotal += grpSum;
      feesTotal += ccr.feeAmount;
      grp.forEach(l => {
        // Mark loan with [PUSHED] tag in notes
        const currentNotes = s.getRange(l.sheetRow, 10).getValue() || '';
        const newNotes = (currentNotes ? currentNotes + ' · ' : '') + '[PUSHED ' + Utilities.formatDate(new Date(), NL_TZ, 'dd MMM HH:mm') + ' txn ' + ccr.outId + ']';
        s.getRange(l.sheetRow, 10).setValue(newNotes);
        pushedRowsAll.push(l.sheetRow);
      });
    } else {
      errors.push(src + ': ' + ccr.error);
    }
  });

  s.getRange(NL_PUSH_ROW, NL_PUSH_SUBMIT_COL).setValue(false);

  const ccAfter = getCurrentCCOutstanding();
  let summary = '✅ PUSH COMPLETE\n\n';
  summary += '📥 Pushed: ' + pushedTotal.toLocaleString() + ' PKR (' + pushedRowsAll.length + ' loans)\n';
  summary += '💸 1-Bill fees: ' + feesTotal.toFixed(2) + ' PKR\n';
  if (ccBefore !== null && ccAfter !== null) {
    summary += '\n📊 CC: ' + ccBefore.toLocaleString() + ' → ' + ccAfter.toLocaleString() + ' PKR';
    if (ccAfter <= 0) summary += '   ✅ GRACE EARNED';
    summary += '\n';
  }
  if (errors.length > 0) {
    summary += '\n⚠️ ERRORS:\n';
    errors.forEach(e => { summary += '  ' + e + '\n'; });
  }
  summary += '\n💡 Loans tagged [PUSHED]. They\'re safe from re-push.';

  _nlLog('NANO_PUSH_TODAY', pushedTotal + ' PKR · ' + pushedRowsAll.length + ' loans · fees ' + feesTotal + ' · errors=' + errors.length);
  ui.alert(summary);
}

// ════════════════════════════════════════════════════════════════════
// CORE WRITE: log loan IN (UNCHANGED from v1.0 except active row range)
// ════════════════════════════════════════════════════════════════════

function _logNanoLoanIn(opts) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  const lt = ss.getSheetByName(NL_TAB);
  if (!tx) return { ok: false, error: 'transactions_tab_missing' };
  if (!lt) return { ok: false, error: 'nano_loans_tab_missing — run Rebuild Tab' };

  const date = opts.date || new Date();
  const app = opts.app;
  const principal = parseFloat(opts.principal);
  const coolOffFee = parseFloat(opts.coolOffFee) || 0;
  const shape = opts.shape || 'A';
  const sourceAccount = opts.sourceAccount || NL_DEFAULT_SOURCE_ACCOUNT;
  const totalOwed = principal + coolOffFee;
  const coolOffDue = opts.coolOffDue || (function() {
    const d = new Date(date.getTime()); d.setHours(d.getHours() + 24); return d;
  })();
  const notes = opts.notes || '';

  if (!app) return { ok: false, error: 'app_required' };
  if (!principal || principal <= 0) return { ok: false, error: 'invalid_principal' };

  const ledgerRow = _nlFindNextRow(tx);
  if (ledgerRow === -1) return { ok: false, error: 'ledger_full' };
  const txnId = _nlTxnId();

  tx.getRange(ledgerRow, 1, 1, 8).setValues([[
    date, sourceAccount, 'Income', NL_CATEGORIES.IN,
    principal, 'PKR', principal, app
  ]]);
  tx.getRange(ledgerRow, 1).setNumberFormat('dd MMM yyyy');
  tx.getRange(ledgerRow, 5).setNumberFormat('#,##0.00');
  tx.getRange(ledgerRow, 7).setNumberFormat('#,##0.00');
  try { tx.getRange(ledgerRow, 9, 1, 4).breakApart(); } catch(e) {}
  const noteText = 'Loan from ' + app + ' · shape ' + shape + ' · cool-off ' + coolOffFee + ' due ' +
                   Utilities.formatDate(coolOffDue, NL_TZ, 'dd MMM HH:mm') + (notes ? ' · ' + notes : '');
  tx.getRange(ledgerRow, 9, 1, 4).merge().setValue(noteText);
  tx.getRange(ledgerRow, 14).setValue(txnId);
  _nlBumpPointer(ledgerRow);

  let nextLoanRow = -1;
  for (let r = NL_ACTIVE_START_ROW; r <= NL_ACTIVE_END_ROW; r++) {
    if (!lt.getRange(r, 1).getValue()) { nextLoanRow = r; break; }
  }
  if (nextLoanRow === -1) {
    return { ok: false, error: 'loan_tab_full_20_active_max', txnId: txnId, ledgerRow: ledgerRow };
  }

  lt.getRange(nextLoanRow, 1, 1, 11).setValues([[
    date, app, 'Active', shape, principal, totalOwed,
    coolOffDue, sourceAccount, txnId, notes, ''
  ]]);
  lt.getRange(nextLoanRow, 1).setNumberFormat('dd MMM yyyy');
  lt.getRange(nextLoanRow, 5).setNumberFormat('#,##0.00');
  lt.getRange(nextLoanRow, 6).setNumberFormat('#,##0.00');
  lt.getRange(nextLoanRow, 7).setNumberFormat('dd MMM yyyy HH:mm');

  _nlLog('NANO_LOAN_IN', app + ' · ' + principal + ' PKR + ' + coolOffFee + ' fee · shape ' + shape + ' · ' + txnId);

  return { ok: true, txnId: txnId, ledgerRow: ledgerRow, loanTabRow: nextLoanRow,
           principal: principal, coolOffFee: coolOffFee, totalOwed: totalOwed };
}

// ════════════════════════════════════════════════════════════════════
// CORE WRITE: log CC payment from source (UNCHANGED from v1.0)
// ════════════════════════════════════════════════════════════════════

function _logCCPaymentFromSource(opts) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) return { ok: false, error: 'transactions_tab_missing' };

  const amount = parseFloat(opts.amount);
  const sourceAccount = opts.sourceAccount || NL_DEFAULT_SOURCE_ACCOUNT;
  const date = opts.date || new Date();
  const notes = opts.notes || '';

  if (!amount || amount <= 0) return { ok: false, error: 'invalid_amount' };

  const outRow = _nlFindNextRow(tx);
  if (outRow === -1) return { ok: false, error: 'ledger_full' };
  const outId = _nlTxnId();
  Utilities.sleep(50);
  const inId = _nlTxnId();

  tx.getRange(outRow, 1, 1, 8).setValues([[date, sourceAccount, 'Transfer', '💳 CC Payment',
                                            amount, 'PKR', amount, 'To: ' + NL_CC_ACCOUNT]]);
  tx.getRange(outRow, 1).setNumberFormat('dd MMM yyyy');
  tx.getRange(outRow, 5).setNumberFormat('#,##0.00');
  tx.getRange(outRow, 7).setNumberFormat('#,##0.00');
  try { tx.getRange(outRow, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(outRow, 9, 1, 4).merge().setValue('CC paydown via 1-Bill (OUT) [linked: ' + inId + ']' + (notes ? ' · ' + notes : ''));
  tx.getRange(outRow, 14).setValue(outId);
  _nlBumpPointer(outRow);

  const inRow = _nlFindNextRow(tx);
  if (inRow === -1) return { ok: false, error: 'ledger_full_mid_payment', outRow: outRow };
  tx.getRange(inRow, 1, 1, 8).setValues([[date, NL_CC_ACCOUNT, 'Income', '💳 CC Payment',
                                           amount, 'PKR', amount, 'From: ' + sourceAccount]]);
  tx.getRange(inRow, 1).setNumberFormat('dd MMM yyyy');
  tx.getRange(inRow, 5).setNumberFormat('#,##0.00');
  tx.getRange(inRow, 7).setNumberFormat('#,##0.00');
  try { tx.getRange(inRow, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(inRow, 9, 1, 4).merge().setValue('CC paydown via 1-Bill (IN) [linked: ' + outId + ']' + (notes ? ' · ' + notes : ''));
  tx.getRange(inRow, 14).setValue(inId);
  _nlBumpPointer(inRow);

  const feeCalc = _nlBillerFee(amount);
  const feeRow = _nlFindNextRow(tx);
  if (feeRow === -1) return { ok: false, error: 'ledger_full_mid_fee' };
  const feeId = _nlTxnId();

  tx.getRange(feeRow, 1, 1, 8).setValues([[date, NL_CC_ACCOUNT, 'Expense', NL_CATEGORIES.FEE,
                                            feeCalc.total, 'PKR', feeCalc.total, '1-Biller (Alfalah CC)']]);
  tx.getRange(feeRow, 1).setNumberFormat('dd MMM yyyy');
  tx.getRange(feeRow, 5).setNumberFormat('#,##0.00');
  tx.getRange(feeRow, 7).setNumberFormat('#,##0.00');
  try { tx.getRange(feeRow, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(feeRow, 9, 1, 4).merge().setValue('1-Bill incoming fee · tier ' + feeCalc.tier +
                                                 ' on ' + amount.toLocaleString() + ' PKR · base ' +
                                                 feeCalc.base + ' + FED ' + feeCalc.fed +
                                                 ' · salary-coverable [linked: ' + outId + ']');
  tx.getRange(feeRow, 14).setValue(feeId);
  _nlBumpPointer(feeRow);

  _nlLog('NANO_CC_PAYMENT', amount + ' PKR · ' + sourceAccount + ' → CC · 1-Bill fee ' + feeCalc.total + ' (tier ' + feeCalc.tier + ')');

  return { ok: true, outId: outId, inId: inId, feeId: feeId, amount: amount,
           feeAmount: feeCalc.total, feeTier: feeCalc.tier };
}

// ════════════════════════════════════════════════════════════════════
// SINGLE-LOAN PROMPT FLOWS (legacy menu-driven, kept as fallback)
// ════════════════════════════════════════════════════════════════════

function logSingleNanoLoan() {
  const ui = SpreadsheetApp.getUi();
  let appsList = NL_APPS.map((a, i) => (i + 1) + '. ' + a.name + (a.defaultShape === 'B' ? ' (shape B default)' : ''));
  const appPrompt = ui.prompt('📱 Log Nano Loan — 1/4',
    'Pick app by number:\n' + appsList.join('\n'), ui.ButtonSet.OK_CANCEL);
  if (appPrompt.getSelectedButton() !== ui.Button.OK) return;
  const appIdx = parseInt(appPrompt.getResponseText().trim(), 10) - 1;
  if (isNaN(appIdx) || appIdx < 0 || appIdx >= NL_APPS.length) { ui.alert('⚠️ Invalid app.'); return; }
  const app = NL_APPS[appIdx];

  const pPrompt = ui.prompt('📱 Log Nano Loan — 2/4',
    'Principal amount in PKR:', ui.ButtonSet.OK_CANCEL);
  if (pPrompt.getSelectedButton() !== ui.Button.OK) return;
  const principal = parseFloat(pPrompt.getResponseText().trim());
  if (!principal || principal <= 0) { ui.alert('⚠️ Invalid principal.'); return; }

  const fPrompt = ui.prompt('📱 Log Nano Loan — 3/4',
    'Cooling-off fee (104 PA / 206.80 SQ).\nLeave blank for 0.', ui.ButtonSet.OK_CANCEL);
  if (fPrompt.getSelectedButton() !== ui.Button.OK) return;
  const coolOffFee = parseFloat(fPrompt.getResponseText().trim()) || 0;

  const sPrompt = ui.prompt('📱 Log Nano Loan — 4/4',
    'Shape A or B (default ' + app.defaultShape + '):', ui.ButtonSet.OK_CANCEL);
  if (sPrompt.getSelectedButton() !== ui.Button.OK) return;
  let shape = sPrompt.getResponseText().trim().toUpperCase();
  if (!shape) shape = app.defaultShape;
  if (shape !== 'A' && shape !== 'B') { ui.alert('⚠️ Invalid shape.'); return; }

  const result = _logNanoLoanIn({
    app: app.name, principal: principal, coolOffFee: coolOffFee, shape: shape,
    sourceAccount: NL_DEFAULT_SOURCE_ACCOUNT
  });
  if (!result.ok) { ui.alert('❌ Failed: ' + result.error); return; }
  ui.alert('✅ Logged.\n\n' + app.name + ' · ' + principal.toLocaleString() + ' PKR\nTxnID: ' + result.txnId);
}

function logSingleNanoRepay() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lt = ss.getSheetByName(NL_TAB);
  if (!lt) { ui.alert('❌ Run Rebuild Tab first.'); return; }
  const active = _readActiveLoansFromTab(lt);
  if (active.length === 0) { ui.alert('🤷 No active loans.'); return; }

  let pickerMsg = 'Active loans:\n\n';
  active.forEach((loan, i) => {
    pickerMsg += (i + 1) + '. ' + loan[1] + ' · ' + loan[5].toLocaleString() + ' PKR · shape ' + loan[3] +
                 ' · ' + Utilities.formatDate(loan[0], NL_TZ, 'dd MMM') + '\n';
  });
  pickerMsg += '\nType the NUMBER:';
  const pick = ui.prompt('↩️ Repay Loan — 1/3', pickerMsg, ui.ButtonSet.OK_CANCEL);
  if (pick.getSelectedButton() !== ui.Button.OK) return;
  const idx = parseInt(pick.getResponseText().trim(), 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= active.length) { ui.alert('⚠️ Invalid pick.'); return; }
  const loan = active[idx];

  const sourcePrompt = ui.prompt('↩️ Repay — 2/3',
    'Source account (default ' + loan[7] + '):', ui.ButtonSet.OK_CANCEL);
  if (sourcePrompt.getSelectedButton() !== ui.Button.OK) return;
  const repaySource = sourcePrompt.getResponseText().trim() || loan[7];

  const amtPrompt = ui.prompt('↩️ Repay — 3/3',
    'Total repay (incl HBL Pay charges if applicable). Loan owed: ' + loan[5].toLocaleString(),
    ui.ButtonSet.OK_CANCEL);
  if (amtPrompt.getSelectedButton() !== ui.Button.OK) return;
  const repayAmount = parseFloat(amtPrompt.getResponseText().trim());
  if (!repayAmount || repayAmount <= 0) { ui.alert('⚠️ Invalid.'); return; }

  const tx = ss.getSheetByName('💸 Transactions');
  const repayRow = _nlFindNextRow(tx);
  if (repayRow === -1) { ui.alert('⚠️ Ledger full.'); return; }
  const repayTxnId = _nlTxnId();

  tx.getRange(repayRow, 1, 1, 8).setValues([[new Date(), repaySource, 'Expense', NL_CATEGORIES.REPAY,
                                              repayAmount, 'PKR', repayAmount, loan[1]]]);
  tx.getRange(repayRow, 1).setNumberFormat('dd MMM yyyy');
  tx.getRange(repayRow, 5).setNumberFormat('#,##0.00');
  tx.getRange(repayRow, 7).setNumberFormat('#,##0.00');
  try { tx.getRange(repayRow, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(repayRow, 9, 1, 4).merge().setValue('Repay ' + loan[1] + ' · linked to ' + loan[8] + ' · shape ' + loan[3]);
  tx.getRange(repayRow, 14).setValue(repayTxnId);
  _nlBumpPointer(repayRow);

  let activeRowNum = -1;
  for (let r = NL_ACTIVE_START_ROW; r <= NL_ACTIVE_END_ROW; r++) {
    const txnIdInRow = lt.getRange(r, 9).getValue();
    if (txnIdInRow === loan[8]) { activeRowNum = r; break; }
  }
  if (activeRowNum !== -1) {
    let nextClosedRow = -1;
    for (let r = NL_CLOSED_START_ROW; r <= NL_CLOSED_END_ROW; r++) {
      if (!lt.getRange(r, 1).getValue()) { nextClosedRow = r; break; }
    }
    if (nextClosedRow !== -1) {
      lt.getRange(nextClosedRow, 1, 1, 11).setValues([[
        loan[0], loan[1], 'Closed', loan[3], loan[4], repayAmount,
        new Date(), loan[7], loan[8], loan[9] + ' · repaid via ' + repaySource, ''
      ]]);
      lt.getRange(nextClosedRow, 1).setNumberFormat('dd MMM yyyy');
      lt.getRange(nextClosedRow, 5).setNumberFormat('#,##0.00');
      lt.getRange(nextClosedRow, 6).setNumberFormat('#,##0.00');
      lt.getRange(nextClosedRow, 7).setNumberFormat('dd MMM yyyy');
    }
    lt.getRange(activeRowNum, 1, 1, 11).clearContent();
  }

  _nlLog('NANO_LOAN_REPAY', loan[1] + ' · ' + repayAmount + ' PKR from ' + repaySource);
  ui.alert('✅ Repaid.\nTxnID: ' + repayTxnId);
}

// ════════════════════════════════════════════════════════════════════
// BATCH LOOP WIZARD (UNCHANGED from v1.0)
// ════════════════════════════════════════════════════════════════════

function openBatchLoopWizard() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(NL_TAB)) {
    ui.alert('⚠️ Run Rebuild Tab first.');
    return;
  }

  const ccBefore = getCurrentCCOutstanding();
  const ccBeforeStr = ccBefore !== null ? ccBefore.toLocaleString() + ' PKR' : 'unknown';

  const intro = ui.prompt('🪄 Batch Loop Wizard',
    'For taking N loans + ONE combined CC payment in single flow.\n\n' +
    '🚨 Current CC: ' + ccBeforeStr + '\n\n' +
    'How many loans? (1-6)', ui.ButtonSet.OK_CANCEL);
  if (intro.getSelectedButton() !== ui.Button.OK) return;
  const N = parseInt(intro.getResponseText().trim(), 10);
  if (isNaN(N) || N < 1 || N > 6) { ui.alert('⚠️ 1-6 only.'); return; }

  const loans = [];
  let combinedPrincipal = 0;
  for (let i = 0; i < N; i++) {
    let appsList = NL_APPS.map((a, idx) => (idx + 1) + '. ' + a.name + (a.defaultShape === 'B' ? ' (B)' : ''));
    const appPrompt = ui.prompt('🪄 Loan ' + (i + 1) + '/' + N + ' — App',
      appsList.join('\n'), ui.ButtonSet.OK_CANCEL);
    if (appPrompt.getSelectedButton() !== ui.Button.OK) { ui.alert('Cancelled.'); return; }
    const appIdx = parseInt(appPrompt.getResponseText().trim(), 10) - 1;
    if (isNaN(appIdx) || appIdx < 0 || appIdx >= NL_APPS.length) { ui.alert('⚠️ Invalid.'); return; }
    const app = NL_APPS[appIdx];

    const pPrompt = ui.prompt('🪄 Loan ' + (i + 1) + '/' + N + ' — Principal',
      app.name + ' principal:', ui.ButtonSet.OK_CANCEL);
    if (pPrompt.getSelectedButton() !== ui.Button.OK) { ui.alert('Cancelled.'); return; }
    const principal = parseFloat(pPrompt.getResponseText().trim());
    if (!principal || principal <= 0) { ui.alert('⚠️ Invalid.'); return; }

    const fPrompt = ui.prompt('🪄 Loan ' + (i + 1) + '/' + N + ' — Cool-Off',
      'Cool-off fee (104 PA / 206.80 SQ / 0):', ui.ButtonSet.OK_CANCEL);
    if (fPrompt.getSelectedButton() !== ui.Button.OK) { ui.alert('Cancelled.'); return; }
    const coolOff = parseFloat(fPrompt.getResponseText().trim()) || 0;

    loans.push({ app: app.name, shape: app.defaultShape, principal: principal, coolOff: coolOff });
    combinedPrincipal += principal;
  }

  const feeCalc = _nlBillerFee(combinedPrincipal);
  let preview = '🪄 LOOP PLAN\n\n';
  loans.forEach((l, i) => {
    preview += (i + 1) + '. ' + l.app + ' · ' + l.principal.toLocaleString() + ' PKR (cool-off ' + l.coolOff + ')\n';
  });
  preview += '\nCombined push: ' + combinedPrincipal.toLocaleString() + ' PKR\n';
  preview += '1-Bill fee tier ' + feeCalc.tier + ': ' + feeCalc.total + ' PKR\n';
  if (ccBefore !== null) {
    const ccAfter = ccBefore - combinedPrincipal + feeCalc.total;
    preview += '\nCC: ' + ccBefore.toLocaleString() + ' → ' + ccAfter.toLocaleString() + (ccAfter <= 0 ? ' ✅ GRACE' : '') + '\n';
  }
  preview += '\nProceed?';

  const confirm = ui.alert('Commit?', preview, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) { ui.alert('Cancelled.'); return; }

  const results = { loansLogged: [], errors: [] };
  for (let i = 0; i < loans.length; i++) {
    const l = loans[i];
    const r = _logNanoLoanIn({
      app: l.app, principal: l.principal, coolOffFee: l.coolOff, shape: l.shape,
      sourceAccount: NL_DEFAULT_SOURCE_ACCOUNT,
      notes: 'Wizard ' + (i + 1) + '/' + loans.length
    });
    if (r.ok) results.loansLogged.push({ app: l.app, txnId: r.txnId });
    else results.errors.push('Loan ' + (i + 1) + ': ' + r.error);
  }

  let ccr = null;
  if (results.loansLogged.length === loans.length) {
    ccr = _logCCPaymentFromSource({
      amount: combinedPrincipal, sourceAccount: NL_DEFAULT_SOURCE_ACCOUNT,
      notes: 'Wizard combined ' + loans.length + ' loans'
    });
    if (!ccr.ok) results.errors.push('CC: ' + ccr.error);
  }

  const ccAfter = getCurrentCCOutstanding();
  let summary = '✅ WIZARD COMPLETE\n\n';
  summary += 'Loans: ' + results.loansLogged.length + '/' + loans.length + '\n';
  if (ccr && ccr.ok) summary += 'CC payment: ' + combinedPrincipal.toLocaleString() + ' (fee ' + ccr.feeAmount + ')\n';
  if (ccBefore !== null && ccAfter !== null) summary += '\nCC: ' + ccBefore.toLocaleString() + ' → ' + ccAfter.toLocaleString() + (ccAfter <= 0 ? ' ✅' : '');
  if (results.errors.length) summary += '\n⚠️ Errors:\n' + results.errors.join('\n');
  _nlLog('NANO_BATCH_WIZARD', N + ' loans · ' + combinedPrincipal + ' PKR · errors=' + results.errors.length);
  ui.alert(summary);
}

// ════════════════════════════════════════════════════════════════════
// HUB CARD EMBED (UNCHANGED from v1.0)
// ════════════════════════════════════════════════════════════════════

function embedNanoLoanPanelInHub() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hub = ss.getSheetByName('💰 Finance Hub');
  if (!hub) { _nlAlert('❌ Finance Hub tab not found.'); return; }
  renderNanoLoanPanelInHub(hub, NL_HUB_START_ROW);
  _nlLog('NANO_HUB_EMBED', 'rows ' + NL_HUB_START_ROW + '-' + (NL_HUB_START_ROW + NL_HUB_ROWS - 1));
  _nlAlert('✅ Nano Loan card embedded at Hub rows ' + NL_HUB_START_ROW + '-' + (NL_HUB_START_ROW + NL_HUB_ROWS - 1));
}

function renderNanoLoanPanelInHub(sheet, startRow) {
  if (!sheet) return;
  if (!startRow) startRow = NL_HUB_START_ROW;

  const T = _nlTheme();
  const active = listActiveNanoLoans();
  const feesMTD = getNanoLoopFeesMTD();
  let totalOwed = 0;
  active.forEach(loan => { totalOwed += parseFloat(loan[5]) || 0; });

  try { sheet.getRange(startRow, 1, NL_HUB_ROWS, 12).breakApart(); } catch(e) {}
  sheet.getRange(startRow, 1, NL_HUB_ROWS, 12).clearContent().clearFormat();
  sheet.getRange(startRow, 1, NL_HUB_ROWS, 12).setBackground(T.bgPage);

  sheet.getRange(startRow, 1, 1, 12).merge()
    .setValue('📱 NANO LOANS — active count · owed total · loop fees this month')
    .setBackground(T.purple).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  sheet.setRowHeight(startRow, 28);

  const card1Bg = active.length === 0 ? T.success : T.warning;
  sheet.getRange(startRow + 1, 1, 1, 4).merge()
    .setValue('🟢 ACTIVE\n' + active.length + ' loan' + (active.length === 1 ? '' : 's'))
    .setBackground(card1Bg).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.getRange(startRow + 1, 5, 1, 4).merge()
    .setValue('💰 OWED TOTAL\n' + totalOwed.toLocaleString() + ' PKR')
    .setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.getRange(startRow + 1, 9, 1, 4).merge()
    .setValue('📅 LOOP FEES MTD\n' + Math.round(feesMTD).toLocaleString() + ' PKR')
    .setBackground(feesMTD > 500 ? T.danger : T.bgPanel).setFontColor(feesMTD > 500 ? '#FFFFFF' : T.textHi).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(startRow + 1, 50);

  sheet.setRowHeight(startRow + 2, 6);

  if (active.length === 0) {
    sheet.getRange(startRow + 3, 1, 3, 12).merge().setValue('✅ No active nano loans.')
      .setBackground(T.bgPage).setFontColor(T.textLo).setFontStyle('italic')
      .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
    for (let i = 0; i < 3; i++) sheet.setRowHeight(startRow + 3 + i, 22);
  } else {
    const top3 = active.slice(0, 3);
    for (let i = 0; i < 3; i++) {
      const r = startRow + 3 + i;
      if (i < top3.length) {
        const loan = top3[i];
        const dateStr = Utilities.formatDate(loan[0], NL_TZ, 'dd MMM');
        const ageDays = Math.floor((Date.now() - loan[0].getTime()) / 86400000);
        sheet.getRange(r, 1, 1, 12).merge()
          .setValue('🟢 ' + dateStr + ' · ' + loan[1] + ' · ' + loan[5].toLocaleString() + ' PKR · shape ' + loan[3] + ' · age ' + ageDays + 'd')
          .setBackground(i % 2 === 0 ? T.bgRow : T.bgAlt).setFontColor(T.text)
          .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
      } else {
        sheet.getRange(r, 1, 1, 12).merge().setValue('').setBackground(T.bgPage);
      }
      sheet.setRowHeight(r, 22);
    }
  }

  sheet.setRowHeight(startRow + 6, 6);

  let hint;
  if (active.length === 0) hint = '🪄 Quick log: 📱 Nano Loans tab → fill row 5 → ✅ K5';
  else if (active.length > 3) hint = 'Showing top 3 of ' + active.length + '. Tab: 📱 Nano Loans · Repay: 🎛️ Sovereign → ↩️';
  else hint = 'Repay: 🎛️ Sovereign → 📱 Nano Loans → ↩️ Log Repayment';
  sheet.getRange(startRow + 7, 1, 1, 12).merge().setValue(hint)
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(startRow + 7, 22);
}

// ════════════════════════════════════════════════════════════════════
// VERIFY (v1.1: handler check + form check added)
// ════════════════════════════════════════════════════════════════════

function verifyNanoLoanModule() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lt = ss.getSheetByName(NL_TAB);
  const hub = ss.getSheetByName('💰 Finance Hub');
  const tx = ss.getSheetByName('💸 Transactions');
  const intlOk = (typeof getBillerFeeForAmount === 'function');
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_nanoLoanOnEdit');

  let report = '🔍 NANO LOAN MODULE v1.1 INTEGRITY\n\n';
  report += '📑 TABS:\n';
  report += '  📱 Nano Loans:        ' + (lt ? '✅' : '❌ run Rebuild Tab') + '\n';
  report += '  💰 Finance Hub:       ' + (hub ? '✅' : '❌') + '\n';
  report += '  💸 Transactions:      ' + (tx ? '✅' : '❌') + '\n';
  report += '\n🔌 DEPENDENCIES:\n';
  report += '  Finance_Intl v1.1+:   ' + (intlOk ? '✅ tiered fees' : '⚠️ flat 31.25 fallback') + '\n';
  report += '  On-edit handler:      ' + (triggers.length === 1 ? '✅ installed' : '⚠️ ' + triggers.length + '/1 (run Re-install)') + '\n';
  report += '\n📊 STATE:\n';
  if (lt) {
    const active = listActiveNanoLoans();
    const closed = listClosedNanoLoans();
    let totalOwed = 0;
    active.forEach(l => { totalOwed += parseFloat(l[5]) || 0; });
    report += '  Active loans:         ' + active.length + '\n';
    report += '  Total owed:           ' + totalOwed.toLocaleString() + ' PKR\n';
    report += '  Closed loans:         ' + closed.length + '\n';
    report += '  Loop fees MTD:        ' + Math.round(getNanoLoopFeesMTD()).toLocaleString() + ' PKR\n';
  }
  const cc = getCurrentCCOutstanding();
  report += '\n💳 CC OUTSTANDING:    ' + (cc !== null ? cc.toLocaleString() + ' PKR' : 'unknown') + '\n';

  report += '\n🎯 1-BILL FEE TIERS:\n';
  if (intlOk) {
    [10000, 50000, 99400, 150000, 500000].forEach(amt => {
      const calc = getBillerFeeForAmount(amt);
      report += '  ' + amt.toLocaleString().padStart(8) + ' → ' + calc.total + ' (tier ' + calc.tier + ')\n';
    });
  }
  report += '\n💡 Quick: 📱 Nano Loans tab → row 5 → ✅ K5 (1-3 sec)\n';
  report += '💡 Push: 📱 Nano Loans tab → ✅ K7 (combined)\n';
  report += '💡 Wizard: 🎛️ Sovereign → 📱 Nano Loans → 🪄 Wizard';
  _nlAlert(report);
}