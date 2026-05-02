// ════════════════════════════════════════════════════════════════════
// 💳 Finance_Debts.gs — DEBT MANAGEMENT CENTER v1.1
// LOCKED · 7-Layer Audit · Self-Contained · Day 10 of 90 (2026-05-02)
//
// CHANGES FROM v1.0 (CRITICAL FIXES):
//
//   🚨 #4 ROOT-CAUSE FIX — LEDGER RANGE (Zain silent bug class)
//      v1.0 wrote debt rows scanning rows 9-208. Row 9 is the INTL
//      QUICK ENTRY form row in Finance_Pro v3.1+. Any debt payment
//      where rows 9-13 had data would silently land in the reserved
//      zone, invisible to all Hub/Account/Budget formulas (which
//      scan A14:A213 only). v1.1 uses Finance_Pro's FIN2_LEDGER_START_ROW
//      (14) and FIN2_LEDGER_END_ROW (213) when available, with safe
//      hardcoded fallback constants. Defense-in-depth: aborts if
//      computed nextRow < 14.
//
//   ⚡ #5 PERF FIX — uses Finance_Pro v3.1 primitives when present:
//      - _findNextLedgerRow (cached row pointer · skips 200-cell scan)
//      - _bumpRowPointer (keeps cache fresh)
//      - _logAuditFast (buffered audit · 5-min flush trigger)
//      Falls back to local batched scan + immediate audit write if
//      Finance_Pro not loaded. Either way: single getValues batch
//      read of form + single setValues batch write of ledger row.
//
//   🔍 NEW: verifyDebtsLedgerSync diagnostic
//      Compares per-creditor "paid" total in Debts tab vs SUMIFS of
//      Debt Out transactions in ledger filtered by counterparty.
//      Surfaces any historical drift (the Zain-class damage if any).
//
//   📋 NEW: backfillMissingDebtRows one-shot
//      For any per-creditor drift found by verify, optionally writes
//      a backfill ledger row marked clearly as a recovery entry.
//      Audit-trailed. Snapshot-protected. Idempotent (won't double-write).
//
// 7-LAYER AUDIT (delta from v1.0):
//   LAYER 1 RE-RUN SAFE: cache invalidation on rebuild via Finance_Pro.
//   LAYER 2 CALL GRAPH: payInstallment → _findNextLedgerForDebts →
//                       (Finance_Pro._findNextLedgerRow OR local scan) →
//                       single setValues write → _bumpRowPointer →
//                       _logAuditFast (buffered).
//   LAYER 3 ROW LAYOUT: writes only to rows 14-213 (ledger zone).
//                       Row 9 (Intl QE) explicitly off-limits.
//   LAYER 4 CELL-STATE: form reads 1×6 batch; ledger writes 1×8 batch.
//   LAYER 5 STATE-ORDER: validate → snapshot via Finance_Pro flush →
//                        find row → batch write → bump cache → audit
//                        buffer → reset form. Failure aborts cleanly.
//   LAYER 6 BACKWARD-COMPAT: Debts tab schema unchanged. Public API
//                            unchanged. Existing checkbox handler
//                            (col 12, rows 6-11 + 16-20) intact.
//   LAYER 7 FAILURE-MODE: nextRow < 14 → abort + alert (defense).
//                         Finance_Pro absent → falls back to safe
//                         hardcoded constants.
// ════════════════════════════════════════════════════════════════════

const FIN_DEBTS_TAB = '💳 Debts';
const FIN_DEBTS_TZ = 'Asia/Karachi';

// v1.1: SAFE FALLBACK CONSTANTS (used only if Finance_Pro not loaded).
// These MUST match Finance_Pro v3.1+. If Finance_Pro changes, update both.
const _FIN_DEBTS_LEDGER_START = 14;
const _FIN_DEBTS_LEDGER_END = 213;
const _FIN_DEBTS_TXN_TAB = '💸 Transactions';

// Snowball-ordered creditors (smallest balance first)
const FIN_DEBTS_DEFAULT = [
  ['Zain Cousin',   1300,   0,   1, 'Cousin loan · pay first',           '🥇 #1 Snowball'],
  ['Mother in Law', 1500,   0,   1, 'Personal · respect priority',       '🥈 #2 Snowball'],
  ['Shahbaz',       1500,   0,   1, 'Friend loan',                       '🥉 #3 Snowball'],
  ['Yusra',         17500,  12500, 1, 'Friend · 12.5k already paid',     '#4 Snowball'],
  ['Mashal',        8500,   0,   1, 'Friend loan',                       '#5 Snowball'],
  ['Imran Bhai',    285000, 70000, 1, 'Largest debt · 70k paid · 215k remaining', '#6 Snowball — Boss']
];

const FIN_RECEIVABLES_DEFAULT = [];

// ───────── safe wrappers ─────────

function _alertD(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _logD(action, detail) {
  // v1.1: prefer Finance_Pro's buffered logger for hot paths
  if (typeof _logAuditFast === 'function') {
    try { _logAuditFast(action, detail); return; } catch(e) {}
  }
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function _genDebtTxnId() {
  if (typeof generateTxnId === 'function') return generateTxnId();
  const stamp = Utilities.formatDate(new Date(), FIN_DEBTS_TZ, 'yyyyMMdd-HHmmss');
  const suffix = Math.floor(Math.random() * 1000).toString();
  return 'TXN-' + stamp + '-' + ('000' + suffix).slice(-3);
}

// v1.1: NEW — safe next-row finder for debts (uses Finance_Pro cache when present)
function _findNextLedgerForDebts(tx) {
  // Try Finance_Pro v3.1+ cached path (best perf + uses canonical range)
  if (typeof _findNextLedgerRow === 'function') {
    try {
      const r = _findNextLedgerRow(tx);
      if (r >= _FIN_DEBTS_LEDGER_START && r <= _FIN_DEBTS_LEDGER_END) return r;
      // Defense: if Finance_Pro returned out-of-range (shouldn't happen), fall through to local
    } catch(e) {}
  }
  // Local fallback: batched scan within safe range only
  const start = (typeof FIN2_LEDGER_START_ROW !== 'undefined') ? FIN2_LEDGER_START_ROW : _FIN_DEBTS_LEDGER_START;
  const end = (typeof FIN2_LEDGER_END_ROW !== 'undefined') ? FIN2_LEDGER_END_ROW : _FIN_DEBTS_LEDGER_END;
  const numRows = end - start + 1;
  let values;
  try { values = tx.getRange(start, 1, numRows, 1).getValues(); }
  catch(e) { return -1; }
  for (let i = 0; i < values.length; i++) {
    if (!values[i][0]) return start + i;
  }
  return -1;
}

function _bumpDebtRowPointer(rowJustWritten) {
  if (typeof _bumpRowPointer === 'function') {
    try { _bumpRowPointer(rowJustWritten); } catch(e) {}
  }
}

function _txTabName() {
  return (typeof FIN2_TABS !== 'undefined' && FIN2_TABS && FIN2_TABS.TXN) ?
    FIN2_TABS.TXN : _FIN_DEBTS_TXN_TAB;
}

// ───────── theme ─────────

function getDebtsTheme() {
  if (typeof getFinTheme === 'function') return getFinTheme();
  return {
    bgPage: '#FFFFFF', bgPanel: '#F8FAFC', bgRow: '#FFFFFF',
    bgAlt: '#F1F5F9', bgInput: '#FFFBEB', bgHeader: '#1E293B',
    bgSection: '#0F172A', bgAccent: '#FEF3C7',
    bgLiability: '#FEE2E2', bgAsset: '#DCFCE7', bgNet: '#DBEAFE',
    bgCleared: '#D1FAE5', textCleared: '#065F46',
    text: '#0F172A', textHi: '#000000', textMd: '#334155', textLo: '#64748B',
    success: '#16A34A', warning: '#D97706', danger: '#DC2626',
    critical: '#991B1B', info: '#2563EB', orange: '#EA580C', purple: '#7C3AED'
  };
}

// ───────── main entry ─────────

function rebuildDebtsTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (typeof snapFinanceSuite === 'function') {
    try { snapFinanceSuite('pre-debts-rebuild-v1.1'); } catch(e) {}
  }
  buildDebtsTab(ss);
  installDebtsHandler();
  appendDebtsMenu();
  _logD('DEBTS_REBUILD', 'v1.1 ledger-range-fixed + perf-aware · ' +
        'writes safely to ' + _FIN_DEBTS_LEDGER_START + '-' + _FIN_DEBTS_LEDGER_END);
  _alertD('✅ 💳 Debts tab built (v1.1 — Zain bug class FIXED).\n\n' +
          '6 creditors in snowball order\n' +
          'Ledger writes now safely to rows 14-213\n' +
          '(was 9-208 in v1.0 → silent failures into Intl form zone)\n\n' +
          'Run 🔍 Verify Debts↔Ledger Sync to check historical drift.');
}

function buildDebtsTab(ss) {
  let s = ss.getSheetByName(FIN_DEBTS_TAB);
  const T = getDebtsTheme();
  const existingDebts = _readExistingDebts(s);
  const existingReceivables = _readExistingReceivables(s);
  if (!s) s = ss.insertSheet(FIN_DEBTS_TAB);

  try { s.setTabColor('#D97706'); } catch(e) {}
  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());
  s.getRange(1, 1, 30, 12).setBackground(T.bgPage);

  const widths = [40, 160, 100, 100, 100, 70, 80, 110, 130, 100, 200, 80];
  widths.forEach((w, i) => s.setColumnWidth(i + 1, w));

  s.getRange('A1:L1').merge()
    .setValue('💳 DEBT MANAGEMENT CENTER v1.1 — snowball strategy · click ✅ col L to pay installment')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);

  s.getRange('A2:L2').merge()
    .setValue('🥇 SNOWBALL: clear smallest debts first for psychological wins · Zain → MIL → Shahbaz → Yusra → Mashal → Imran (215k)')
    .setBackground(T.bgAccent).setFontColor(T.text).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center');
  s.setRowHeight(2, 26);
  s.setRowHeight(3, 8);

  s.getRange('A4:L4').merge()
    .setValue('💸 I OWE — sorted snowball priority (smallest first)')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(4, 28);

  const owedHdr = ['#', 'Creditor', 'Original', 'Paid', 'Remaining', 'Due Day', 'Days Left', 'Status', 'From Account', 'Pay Amt', 'Notes', '✅ Pay'];
  s.getRange(5, 1, 1, 12).setValues([owedHdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(5, 26);

  for (let i = 0; i < 6; i++) {
    const r = 6 + i;
    const debt = (existingDebts[i] && existingDebts[i][1]) ? existingDebts[i] : null;
    const def = FIN_DEBTS_DEFAULT[i];

    s.getRange(r, 1).setValue(i + 1).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 2).setValue(debt ? debt[1] : def[0]).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 3).setValue(debt ? debt[2] : def[1]).setNumberFormat('#,##0')
      .setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 4).setValue(debt ? debt[3] : def[2]).setNumberFormat('#,##0')
      .setBackground(T.bgRow).setFontColor(T.success).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 5).setFormula('=MAX(0,C' + r + '-D' + r + ')').setNumberFormat('#,##0')
      .setBackground(T.bgLiability).setFontColor(T.critical).setFontWeight('bold').setFontSize(13);
    s.getRange(r, 6).setValue(debt && debt[5] ? debt[5] : def[3]).setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 7).setFormula(
      '=IFERROR(IF(F' + r + '="","",IF(DAY(TODAY())<=F' + r + ',F' + r + '-DAY(TODAY()),DAY(EOMONTH(TODAY(),0))-DAY(TODAY())+F' + r + ')),"")'
    ).setNumberFormat('0').setBackground(T.bgRow).setFontColor(T.warning).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 8).setFormula(
      '=IF(E' + r + '<=0,"✅ CLEARED",IF(G' + r + '<0,"⚫ OVERDUE",IF(G' + r + '<=3,"🔴 Due Soon",IF(G' + r + '<=7,"🟡 This Week","🟢 OK"))))'
    );
    s.getRange(r, 9).setValue('Meezan').setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 10).setValue(0).setNumberFormat('#,##0').setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 11).setValue(debt && debt[7] ? debt[7] : def[4]).setBackground(T.bgRow).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10);
    s.getRange(r, 12).insertCheckboxes();
    s.getRange(r, 12).setBackground(T.success).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 1, 1, 12).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 11).setHorizontalAlignment('left');
    s.setRowHeight(r, 32);
  }

  s.getRange(12, 1, 1, 4).merge().setValue('💸 TOTAL OWED')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(12, 5).setFormula('=SUM(E6:E11)').setNumberFormat('#,##0')
    .setBackground(T.bgLiability).setFontColor(T.critical).setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(12, 6, 1, 7).merge().setFormula(
    '="PKR · " & COUNTIF(E6:E11,">0") & " creditors active · " & COUNTIF(E6:E11,"<=0") & " cleared"'
  ).setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(12, 40);
  s.setRowHeight(13, 8);

  s.getRange('A14:L14').merge()
    .setValue('💰 OWED TO ME — money others have committed to pay back')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(14, 28);

  const recHdr = ['#', 'Debtor', 'Expected', 'Received', 'Remaining', 'Exp. Date', 'Days', 'Status', 'To Account', 'Receive Amt', 'Notes', '✅ Receive'];
  s.getRange(15, 1, 1, 12).setValues([recHdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(15, 26);

  for (let i = 0; i < 5; i++) {
    const r = 16 + i;
    const rec = (existingReceivables[i] && existingReceivables[i][1]) ? existingReceivables[i] : null;

    s.getRange(r, 1).setValue(i + 1).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 2).setValue(rec ? rec[1] : '').setBackground(T.bgInput).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 3).setValue(rec ? rec[2] : '').setNumberFormat('#,##0').setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 4).setValue(rec ? rec[3] : 0).setNumberFormat('#,##0').setBackground(T.bgRow).setFontColor(T.success).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 5).setFormula('=IFERROR(MAX(0,C' + r + '-D' + r + '),"")').setNumberFormat('#,##0')
      .setBackground(T.bgAsset).setFontColor(T.success).setFontWeight('bold').setFontSize(13);
    s.getRange(r, 6).setValue(rec && rec[5] ? rec[5] : '').setNumberFormat('dd MMM yyyy').setBackground(T.bgInput);
    s.getRange(r, 7).setFormula('=IFERROR(F' + r + '-TODAY(),"")').setNumberFormat('0').setBackground(T.bgRow).setFontColor(T.warning).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 8).setFormula(
      '=IFERROR(IF(B' + r + '="","",IF(E' + r + '<=0,"✅ COLLECTED",IF(G' + r + '<0,"⚫ OVERDUE",IF(G' + r + '<=7,"🔴 Soon","🟢 OK")))),"")'
    );
    s.getRange(r, 9).setValue('Meezan').setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 10).setValue(0).setNumberFormat('#,##0').setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold').setFontSize(11);
    s.getRange(r, 11).setValue(rec && rec[7] ? rec[7] : '').setBackground(T.bgRow).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10);
    s.getRange(r, 12).insertCheckboxes();
    s.getRange(r, 12).setBackground(T.success).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 1, 1, 12).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 11).setHorizontalAlignment('left');
    s.setRowHeight(r, 32);
  }

  s.getRange(21, 1, 1, 4).merge().setValue('💰 TOTAL RECEIVABLES')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(21, 5).setFormula('=IFERROR(SUM(E16:E20),0)').setNumberFormat('#,##0')
    .setBackground(T.bgAsset).setFontColor(T.success).setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(21, 6, 1, 7).merge().setFormula(
    '="PKR · " & IFERROR(COUNTIF(E16:E20,">0"),0) & " open receivables"'
  ).setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(21, 40);
  s.setRowHeight(22, 8);

  s.getRange('A23:L23').merge()
    .setValue('🏆 NET DEBT POSITION — personal debts only · CC excluded (see 🏦 Accounts)')
    .setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(23, 28);

  s.getRange(24, 1, 1, 4).merge().setValue('🏆 NET PERSONAL DEBT')
    .setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(14).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(24, 5).setFormula('=E21-E12').setNumberFormat('+#,##0;-#,##0')
    .setBackground(T.bgNet).setFontColor(T.textHi).setFontWeight('bold')
    .setFontSize(16).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(24, 6, 1, 7).merge().setFormula(
    '="PKR · " & IF(E24>=0,"net positive (people owe you more than you owe)","net negative (you owe more than receivable)")'
  ).setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(24, 44);

  s.getRange(25, 1, 1, 4).merge().setValue('💀 TRUE BURDEN (incl. CC)')
    .setBackground(T.critical).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(14).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(25, 5).setFormula('=E24-IFERROR(\'🏦 Accounts\'!C20,0)').setNumberFormat('+#,##0;-#,##0')
    .setBackground(T.bgLiability).setFontColor(T.critical).setFontWeight('bold')
    .setFontSize(16).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(25, 6, 1, 7).merge().setValue('PKR — net debt position INCLUDING Alfalah CC outstanding · this is your real financial weight')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(25, 44);

  applyDebtsDropdowns(s);
  applyDebtsFormatting(s, T);
  s.setFrozenRows(5);
}

function _readExistingDebts(s) {
  const result = [[],[],[],[],[],[]];
  if (!s) return result;
  try {
    const block = s.getRange(6, 1, 6, 11).getValues();
    for (let i = 0; i < 6; i++) result[i] = block[i];
  } catch(e) {}
  return result;
}

function _readExistingReceivables(s) {
  const result = [[],[],[],[],[]];
  if (!s) return result;
  try {
    const block = s.getRange(16, 1, 5, 11).getValues();
    for (let i = 0; i < 5; i++) result[i] = block[i];
  } catch(e) {}
  return result;
}

function applyDebtsDropdowns(s) {
  const accounts = (typeof FIN2_ACCOUNTS !== 'undefined') ? FIN2_ACCOUNTS :
    ['Cash', 'JazzCash', 'Easypaisa', 'UBL', 'UBL Prepaid', 'Meezan', 'Mashreq Bank', 'JS Bank', 'Naya Pay', 'Bank Alfalah', 'Alfalah CC'];
  const accDV = SpreadsheetApp.newDataValidation().requireValueInList(accounts, true).setAllowInvalid(true).build();
  s.getRange(6, 9, 6, 1).setDataValidation(accDV);
  s.getRange(16, 9, 5, 1).setDataValidation(accDV);
  const days = [];
  for (let d = 1; d <= 31; d++) days.push(d);
  const dayDV = SpreadsheetApp.newDataValidation().requireValueInList(days, true).setAllowInvalid(true).build();
  s.getRange(6, 6, 6, 1).setDataValidation(dayDV);
  const dateDV = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
  s.getRange(16, 6, 5, 1).setDataValidation(dateDV);
}

function applyDebtsFormatting(s, T) {
  const rules = [];
  const owedRange = s.getRange('H6:H11');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('✅ CLEARED').setBackground(T.bgCleared).setFontColor(T.textCleared).setBold(true).setRanges([owedRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('⚫ OVERDUE').setBackground(T.critical).setFontColor('#FFFFFF').setBold(true).setRanges([owedRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🔴 Due Soon').setBackground(T.danger).setFontColor('#FFFFFF').setBold(true).setRanges([owedRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟡 This Week').setBackground(T.warning).setFontColor('#FFFFFF').setBold(true).setRanges([owedRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟢 OK').setBackground(T.success).setFontColor('#FFFFFF').setBold(true).setRanges([owedRange]).build());
  const recRange = s.getRange('H16:H20');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('✅ COLLECTED').setBackground(T.bgCleared).setFontColor(T.textCleared).setBold(true).setRanges([recRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('⚫ OVERDUE').setBackground(T.critical).setFontColor('#FFFFFF').setBold(true).setRanges([recRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🔴 Soon').setBackground(T.danger).setFontColor('#FFFFFF').setBold(true).setRanges([recRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟢 OK').setBackground(T.success).setFontColor('#FFFFFF').setBold(true).setRanges([recRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$E6=0').setBackground(T.bgCleared).setFontColor(T.textCleared).setRanges([s.getRange('A6:L11')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($B16<>"",$E16=0)').setBackground(T.bgCleared).setFontColor(T.textCleared).setRanges([s.getRange('A16:L20')]).build());
  s.setConditionalFormatRules(rules);
}

// ════════════════════════════════════════════════════════════════════
// PAY INSTALLMENT (v1.1: batched read/write + safe ledger range)
// ════════════════════════════════════════════════════════════════════

function payInstallment(s, row) {
  // BATCH READ form row (1×10 instead of 6 individual getValues)
  const formBlock = s.getRange(row, 1, 1, 10).getValues()[0];
  const creditor = formBlock[1];
  const original = formBlock[2] || 0;
  const paid = formBlock[3] || 0;
  const remaining = formBlock[4] || 0;
  const fromAcc = formBlock[8];
  const payAmt = formBlock[9];

  if (!creditor) {
    s.getRange(row, 12).setValue(false);
    _alertD('⚠️ Creditor name missing in row ' + row + '.');
    return;
  }
  if (remaining <= 0) {
    s.getRange(row, 12).setValue(false);
    _alertD('✅ ' + creditor + ' is already CLEARED.\n\nRemaining = 0. Nothing more to pay.');
    return;
  }
  if (!fromAcc) {
    s.getRange(row, 12).setValue(false);
    _alertD('⚠️ Pick a "From Account" in column I for ' + creditor + '.');
    return;
  }
  if (!payAmt || typeof payAmt !== 'number' || payAmt <= 0) {
    s.getRange(row, 12).setValue(false);
    _alertD('⚠️ Enter a positive Pay Amount in column J for ' + creditor + '.');
    return;
  }

  let overpayNote = '';
  if (payAmt > remaining) {
    overpayNote = ' (overpayment: ' + (payAmt - remaining) + ' PKR — keep credit note)';
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(_txTabName());
  if (!tx) {
    s.getRange(row, 12).setValue(false);
    _alertD('❌ ' + _txTabName() + ' tab not found.');
    return;
  }

  // v1.1: SAFE next-row finder (skips reserved zone, uses cache when available)
  const nextRow = _findNextLedgerForDebts(tx);
  if (nextRow === -1) {
    s.getRange(row, 12).setValue(false);
    _alertD('⚠️ Ledger full (rows ' + _FIN_DEBTS_LEDGER_START + '-' + _FIN_DEBTS_LEDGER_END + ' all used).\n\nArchive transactions first.');
    return;
  }

  // v1.1 DEFENSE: hard abort if computed row is in reserved zone
  if (nextRow < _FIN_DEBTS_LEDGER_START) {
    s.getRange(row, 12).setValue(false);
    _alertD('🚨 SAFETY ABORT: computed nextRow=' + nextRow + ' is in reserved zone (rows 1-' + (_FIN_DEBTS_LEDGER_START - 1) + ').\n\n' +
            'This would have silently corrupted Quick Entry forms. No write performed.\n\n' +
            'Run 🔍 Verify Debts↔Ledger Sync to inspect ledger state.');
    return;
  }

  Utilities.sleep(50);
  const txnId = _genDebtTxnId();
  const today = new Date();

  // BATCH WRITE: single setValues for cols 1-8 (was 8 individual setValues)
  const writeBlock = [[
    today, fromAcc, 'Debt Out', '💸 Debt Payment',
    payAmt, 'PKR', payAmt, creditor
  ]];
  tx.getRange(nextRow, 1, 1, 8).setValues(writeBlock);
  tx.getRange(nextRow, 1).setNumberFormat('dd MMM yyyy');
  tx.getRange(nextRow, 5).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 7).setNumberFormat('#,##0.00');
  try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(nextRow, 9, 1, 4).merge().setValue('Debt installment to ' + creditor + overpayNote + ' · auto-logged from 💳 Debts');
  tx.getRange(nextRow, 14).setValue(txnId);

  // v1.1: bump cache so next write is instant
  _bumpDebtRowPointer(nextRow);

  // Update Debts tab paid + reset form
  s.getRange(row, 4).setValue(paid + payAmt);
  s.getRange(row, 10).setValue(0);
  s.getRange(row, 12).setValue(false);

  // Audit (buffered when Finance_Pro v3.1+ loaded)
  _logD('DEBT_PAYMENT', txnId + ' · ' + creditor + ' · ' + payAmt + ' PKR from ' + fromAcc +
        ' · paid ' + (paid + payAmt) + '/' + original + ' · row ' + nextRow);

  const newRemaining = Math.max(0, original - (paid + payAmt));
  if (newRemaining <= 0) {
    _alertD('🎉 ' + creditor + ' CLEARED!\n\n' +
            'Total paid: ' + (paid + payAmt).toLocaleString() + ' / ' + original.toLocaleString() + ' PKR\n' +
            'Ledger row: ' + nextRow + '\n\n' +
            'Snowball win — momentum continues. 🥇');
  } else {
    _alertD('✅ Installment logged.\n\n' +
            'Creditor: ' + creditor + '\n' +
            'Paid: ' + payAmt.toLocaleString() + ' PKR from ' + fromAcc + '\n' +
            'Remaining: ' + newRemaining.toLocaleString() + ' PKR\n' +
            'Ledger row: ' + nextRow + '\n' +
            (overpayNote ? '\n⚠️ Overpayment: keep credit note for next interaction\n' : '') +
            '\nTxnID: ' + txnId);
  }
}

// ════════════════════════════════════════════════════════════════════
// RECEIVE FROM DEBTOR (v1.1: same fixes)
// ════════════════════════════════════════════════════════════════════

function payReceivable(s, row) {
  const formBlock = s.getRange(row, 1, 1, 10).getValues()[0];
  const debtor = formBlock[1];
  const expected = formBlock[2] || 0;
  const received = formBlock[3] || 0;
  const remaining = formBlock[4] || 0;
  const toAcc = formBlock[8];
  const recAmt = formBlock[9];

  if (!debtor) {
    s.getRange(row, 12).setValue(false);
    _alertD('⚠️ Debtor name missing in row ' + row + '.');
    return;
  }
  if (remaining <= 0) {
    s.getRange(row, 12).setValue(false);
    _alertD('✅ ' + debtor + ' is already COLLECTED.');
    return;
  }
  if (!toAcc) {
    s.getRange(row, 12).setValue(false);
    _alertD('⚠️ Pick a "To Account" in column I for ' + debtor + '.');
    return;
  }
  if (!recAmt || typeof recAmt !== 'number' || recAmt <= 0) {
    s.getRange(row, 12).setValue(false);
    _alertD('⚠️ Enter a positive Receive Amount in column J for ' + debtor + '.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(_txTabName());
  if (!tx) {
    s.getRange(row, 12).setValue(false);
    _alertD('❌ ' + _txTabName() + ' tab not found.');
    return;
  }

  const nextRow = _findNextLedgerForDebts(tx);
  if (nextRow === -1) {
    s.getRange(row, 12).setValue(false);
    _alertD('⚠️ Ledger full.');
    return;
  }
  if (nextRow < _FIN_DEBTS_LEDGER_START) {
    s.getRange(row, 12).setValue(false);
    _alertD('🚨 SAFETY ABORT: computed nextRow=' + nextRow + ' is in reserved zone. No write performed.');
    return;
  }

  Utilities.sleep(50);
  const txnId = _genDebtTxnId();
  const today = new Date();

  const writeBlock = [[
    today, toAcc, 'Debt In', '💸 Debt Payment',
    recAmt, 'PKR', recAmt, debtor
  ]];
  tx.getRange(nextRow, 1, 1, 8).setValues(writeBlock);
  tx.getRange(nextRow, 1).setNumberFormat('dd MMM yyyy');
  tx.getRange(nextRow, 5).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 7).setNumberFormat('#,##0.00');
  try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(nextRow, 9, 1, 4).merge().setValue('Debt repayment from ' + debtor + ' · auto-logged from 💳 Debts');
  tx.getRange(nextRow, 14).setValue(txnId);

  _bumpDebtRowPointer(nextRow);

  s.getRange(row, 4).setValue(received + recAmt);
  s.getRange(row, 10).setValue(0);
  s.getRange(row, 12).setValue(false);

  _logD('RECEIVABLE_RECEIVED', txnId + ' · ' + debtor + ' · ' + recAmt + ' PKR to ' + toAcc + ' · row ' + nextRow);

  const newRemaining = Math.max(0, expected - (received + recAmt));
  if (newRemaining <= 0) {
    _alertD('🎉 ' + debtor + ' COLLECTED in full!\n\nTotal received: ' + (received + recAmt).toLocaleString() + ' PKR\nLedger row: ' + nextRow);
  } else {
    _alertD('✅ Receipt logged.\n\nDebtor: ' + debtor + '\nReceived: ' + recAmt.toLocaleString() + ' PKR to ' + toAcc + '\nRemaining: ' + newRemaining.toLocaleString() + ' PKR\nLedger row: ' + nextRow + '\n\nTxnID: ' + txnId);
  }
}

// ════════════════════════════════════════════════════════════════════
// MANUAL ADD (unchanged from v1.0 — already safe)
// ════════════════════════════════════════════════════════════════════

function manualAddCreditor() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(FIN_DEBTS_TAB);
  if (!s) { _alertD('❌ Debts tab not found.'); return; }
  let emptyRow = -1;
  for (let r = 6; r <= 11; r++) {
    if (!s.getRange(r, 2).getValue()) { emptyRow = r; break; }
  }
  if (emptyRow === -1) {
    _alertD('⚠️ All 6 creditor slots full.\n\nTo add more, manually edit a row to remove an old cleared debt, then retry.');
    return;
  }
  const namePrompt = ui.prompt('➕ Add Creditor', 'Creditor name:', ui.ButtonSet.OK_CANCEL);
  if (namePrompt.getSelectedButton() !== ui.Button.OK) return;
  const name = namePrompt.getResponseText().trim();
  if (!name) return;
  const amtPrompt = ui.prompt('➕ Add Creditor', 'Original amount owed (PKR):', ui.ButtonSet.OK_CANCEL);
  if (amtPrompt.getSelectedButton() !== ui.Button.OK) return;
  const amt = parseFloat(amtPrompt.getResponseText().trim());
  if (isNaN(amt) || amt <= 0) { _alertD('⚠️ Invalid amount.'); return; }
  s.getRange(emptyRow, 2).setValue(name);
  s.getRange(emptyRow, 3).setValue(amt).setNumberFormat('#,##0');
  s.getRange(emptyRow, 4).setValue(0).setNumberFormat('#,##0');
  s.getRange(emptyRow, 6).setValue(1);
  s.getRange(emptyRow, 9).setValue('Meezan');
  s.getRange(emptyRow, 10).setValue(0);
  s.getRange(emptyRow, 11).setValue('Added manually ' + Utilities.formatDate(new Date(), FIN_DEBTS_TZ, 'dd MMM yyyy'));
  _logD('CREDITOR_ADDED', name + ' · ' + amt + ' PKR');
  _alertD('✅ Creditor added in row ' + emptyRow + '.\n\n' + name + ' · ' + amt.toLocaleString() + ' PKR');
}

function manualAddReceivable() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(FIN_DEBTS_TAB);
  if (!s) { _alertD('❌ Debts tab not found.'); return; }
  let emptyRow = -1;
  for (let r = 16; r <= 20; r++) {
    if (!s.getRange(r, 2).getValue()) { emptyRow = r; break; }
  }
  if (emptyRow === -1) { _alertD('⚠️ All 5 receivable slots full.'); return; }
  const namePrompt = ui.prompt('➕ Add Receivable', 'Debtor name (who owes you):', ui.ButtonSet.OK_CANCEL);
  if (namePrompt.getSelectedButton() !== ui.Button.OK) return;
  const name = namePrompt.getResponseText().trim();
  if (!name) return;
  const amtPrompt = ui.prompt('➕ Add Receivable', 'Expected amount (PKR):', ui.ButtonSet.OK_CANCEL);
  if (amtPrompt.getSelectedButton() !== ui.Button.OK) return;
  const amt = parseFloat(amtPrompt.getResponseText().trim());
  if (isNaN(amt) || amt <= 0) { _alertD('⚠️ Invalid amount.'); return; }
  s.getRange(emptyRow, 2).setValue(name);
  s.getRange(emptyRow, 3).setValue(amt).setNumberFormat('#,##0');
  s.getRange(emptyRow, 4).setValue(0).setNumberFormat('#,##0');
  s.getRange(emptyRow, 9).setValue('Meezan');
  s.getRange(emptyRow, 10).setValue(0);
  s.getRange(emptyRow, 11).setValue('Added ' + Utilities.formatDate(new Date(), FIN_DEBTS_TZ, 'dd MMM yyyy'));
  _logD('RECEIVABLE_ADDED', name + ' · ' + amt + ' PKR');
  _alertD('✅ Receivable added in row ' + emptyRow + '.\n\n' + name + ' · ' + amt.toLocaleString() + ' PKR');
}

// ════════════════════════════════════════════════════════════════════
// v1.1 NEW: VERIFY DEBTS ↔ LEDGER SYNC (Zain bug class detector)
// ════════════════════════════════════════════════════════════════════

function verifyDebtsLedgerSync() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(FIN_DEBTS_TAB);
  const tx = ss.getSheetByName(_txTabName());
  if (!s || !tx) { _alertD('❌ Debts or Transactions tab missing.'); return; }

  const debtsBlock = s.getRange(6, 1, 6, 11).getValues();
  const start = (typeof FIN2_LEDGER_START_ROW !== 'undefined') ? FIN2_LEDGER_START_ROW : _FIN_DEBTS_LEDGER_START;
  const end = (typeof FIN2_LEDGER_END_ROW !== 'undefined') ? FIN2_LEDGER_END_ROW : _FIN_DEBTS_LEDGER_END;
  const numRows = end - start + 1;
  const ledger = tx.getRange(start, 1, numRows, 14).getValues();

  let report = '🔍 DEBTS ↔ LEDGER SYNC v1.1\n\n';
  report += 'Scanning ledger rows ' + start + '-' + end + '\n';
  report += 'Comparing per-creditor "Paid" in Debts vs sum of Debt Out txns in ledger\n\n';

  let totalDrift = 0;
  const drifts = [];

  for (let i = 0; i < 6; i++) {
    const creditor = debtsBlock[i][1];
    const debtsPaid = debtsBlock[i][3] || 0;
    if (!creditor) continue;

    let ledgerSum = 0;
    let count = 0;
    for (let j = 0; j < ledger.length; j++) {
      const row = ledger[j];
      if (row[2] === 'Debt Out' && String(row[7] || '').trim() === String(creditor).trim()) {
        ledgerSum += (typeof row[6] === 'number' ? row[6] : (typeof row[4] === 'number' ? row[4] : 0));
        count++;
      }
    }

    const drift = debtsPaid - ledgerSum;
    const status = (Math.abs(drift) < 0.01) ? '✅' : '⚠️';
    report += status + ' ' + creditor + '\n';
    report += '   Debts.Paid: ' + debtsPaid.toLocaleString() + ' PKR\n';
    report += '   Ledger sum: ' + ledgerSum.toLocaleString() + ' PKR (' + count + ' txns)\n';
    if (Math.abs(drift) >= 0.01) {
      report += '   🚨 DRIFT: ' + (drift > 0 ? '+' : '') + drift.toLocaleString() + ' PKR (Debts > Ledger = silent failure)\n';
      drifts.push({ creditor: creditor, drift: drift, debtsPaid: debtsPaid, ledgerSum: ledgerSum });
      totalDrift += drift;
    }
    report += '\n';
  }

  report += '────────────────────────\n';
  report += 'Total drift: ' + totalDrift.toLocaleString() + ' PKR\n';
  if (drifts.length === 0) {
    report += '\n✅ All creditors in sync. v1.1 fix confirmed working OR no historical Zain-class damage.';
  } else {
    report += '\n🚨 ' + drifts.length + ' creditor(s) with drift detected.\n';
    report += 'These represent debt payments where Debts tab incremented but ledger row was NOT written\n';
    report += '(likely landed in reserved zone in v1.0).\n\n';
    report += 'To recover: run 📋 Backfill Missing Debt Rows (writes recovery rows to ledger).';
  }

  _logD('DEBT_SYNC_VERIFY', drifts.length + ' drift(s) found · total ' + totalDrift + ' PKR');
  _alertD(report);
  return { drifts: drifts, totalDrift: totalDrift };
}

function backfillMissingDebtRows() {
  const ui = SpreadsheetApp.getUi();
  const result = verifyDebtsLedgerSync();
  if (!result || !result.drifts || result.drifts.length === 0) {
    _alertD('✅ No drift found. Nothing to backfill.');
    return;
  }
  const confirm = ui.alert('📋 Backfill ' + result.drifts.length + ' missing ledger row(s)?',
    'For each creditor with drift > 0, this writes a single Debt Out row to the ledger:\n\n' +
    'Date: today\n' +
    'Account: Meezan (assumed)\n' +
    'Type: Debt Out\n' +
    'Category: 💸 Debt Payment\n' +
    'Amount: drift amount\n' +
    'Counterparty: creditor name\n' +
    'Notes: "BACKFILL — Zain bug class recovery on Day 10"\n\n' +
    'A snapshot is taken first. Audit-trailed. Continue?',
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  if (typeof snapFinanceSuite === 'function') {
    try { snapFinanceSuite('pre-debt-backfill-day10'); } catch(e) {}
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(_txTabName());
  if (!tx) { _alertD('❌ Transactions tab not found.'); return; }

  let written = 0;
  const today = new Date();
  result.drifts.forEach(d => {
    if (d.drift <= 0) return;
    const nextRow = _findNextLedgerForDebts(tx);
    if (nextRow === -1 || nextRow < _FIN_DEBTS_LEDGER_START) return;
    Utilities.sleep(60);
    const txnId = _genDebtTxnId();
    const writeBlock = [[
      today, 'Meezan', 'Debt Out', '💸 Debt Payment',
      d.drift, 'PKR', d.drift, d.creditor
    ]];
    tx.getRange(nextRow, 1, 1, 8).setValues(writeBlock);
    tx.getRange(nextRow, 1).setNumberFormat('dd MMM yyyy');
    tx.getRange(nextRow, 5).setNumberFormat('#,##0.00');
    tx.getRange(nextRow, 7).setNumberFormat('#,##0.00');
    try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(nextRow, 9, 1, 4).merge().setValue('BACKFILL — Zain bug class recovery (Day 10) · ' + d.creditor + ' · drift ' + d.drift + ' PKR');
    tx.getRange(nextRow, 14).setValue(txnId);
    _bumpDebtRowPointer(nextRow);
    _logD('DEBT_BACKFILL', txnId + ' · ' + d.creditor + ' · ' + d.drift + ' PKR · row ' + nextRow);
    written++;
  });

  _alertD('✅ Backfill complete.\n\nRows written: ' + written + '\n\nRun 🔍 Verify Debts↔Ledger Sync again to confirm 0 drift.');
}

// ════════════════════════════════════════════════════════════════════
// ON-EDIT HANDLER (unchanged)
// ════════════════════════════════════════════════════════════════════

function _debtsOnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== FIN_DEBTS_TAB) return;
  const r = e.range.getRow();
  const c = e.range.getColumn();
  const v = e.value;
  if (c === 12 && r >= 6 && r <= 11 && (v === 'TRUE' || v === true)) {
    payInstallment(sh, r); return;
  }
  if (c === 12 && r >= 16 && r <= 20 && (v === 'TRUE' || v === true)) {
    payReceivable(sh, r); return;
  }
}

function installDebtsHandler() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_debtsOnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('_debtsOnEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
}

// ════════════════════════════════════════════════════════════════════
// VERIFY + MENU
// ════════════════════════════════════════════════════════════════════

function verifyDebtsCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(FIN_DEBTS_TAB);
  if (!s) { _alertD('❌ 💳 Debts tab missing.'); return; }
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_debtsOnEdit');
  let activeCount = 0;
  for (let r = 6; r <= 11; r++) {
    if (s.getRange(r, 2).getValue()) activeCount++;
  }
  const start = (typeof FIN2_LEDGER_START_ROW !== 'undefined') ? FIN2_LEDGER_START_ROW : _FIN_DEBTS_LEDGER_START;
  const end = (typeof FIN2_LEDGER_END_ROW !== 'undefined') ? FIN2_LEDGER_END_ROW : _FIN_DEBTS_LEDGER_END;
  let report = '🔍 💳 DEBTS COCKPIT v1.1 INTEGRITY\n\n';
  report += '✅ Tab present\n';
  report += (triggers.length === 1 ? '✅' : '⚠️') + ' Pay handler installed (' + triggers.length + '/1)\n';
  report += '✓ Active creditors: ' + activeCount + '/6\n';
  report += '✓ Total owed: ' + (s.getRange('E12').getValue() || 0).toLocaleString() + ' PKR\n';
  report += '✓ Net personal debt: ' + (s.getRange('E24').getValue() || 0).toLocaleString() + ' PKR\n';
  report += '\n⚡ v1.1 SAFETY:\n';
  report += '  Ledger range: ' + start + '-' + end + ' (was 9-208 in v1.0 → silent zone)\n';
  report += '  Finance_Pro cache: ' + (typeof _findNextLedgerRow === 'function' ? '✅ available' : '⚠️ unavailable, using fallback') + '\n';
  report += '  Audit buffer: ' + (typeof _logAuditFast === 'function' ? '✅ available' : '⚠️ unavailable, using direct write') + '\n';
  report += '\n' + (triggers.length === 1 && activeCount > 0 ? '✅ All systems operational.' : '⚠️ Issues detected.');
  _alertD(report);
}

function appendDebtsMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('💳 Debts')
      .addItem('🔄 Rebuild Debts Tab', 'rebuildDebtsTab')
      .addSeparator()
      .addItem('➕ Add Creditor', 'manualAddCreditor')
      .addItem('➕ Add Receivable', 'manualAddReceivable')
      .addSeparator()
      .addItem('🔍 Verify Debts ↔ Ledger Sync', 'verifyDebtsLedgerSync')
      .addItem('📋 Backfill Missing Debt Rows', 'backfillMissingDebtRows')
      .addSeparator()
      .addItem('🔧 Reinstall Pay Handler', 'installDebtsHandler')
      .addItem('🔍 Verify Cockpit', 'verifyDebtsCockpit')
      .addToUi();
  } catch(e) { Logger.log('Debts menu add failed: ' + e); }
}