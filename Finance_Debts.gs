// ════════════════════════════════════════════════════════════════════
// 💳 Finance_Debts.gs — DEBT MANAGEMENT CENTER v1.0
// LOCKED · 7-Layer Audit · Self-Contained
//
// PURPOSE:
//   Personal debt visibility + snowball payment workflow.
//   "I Owe" cards + "Owed to Me" cards + ✅ Pay Installment per debt.
//   Auto-creates Debt Out / Debt In txn in 💸 Transactions.
//   Tracks remaining + days till due + cleared status per creditor.
//
// SNOWBALL ORDER (smallest first — psychological win pattern):
//   Zain Cousin 1,300 → MIL 1,500 → Shahbaz 1,500 → Yusra 5,000 →
//   Mashal 8,500 → Imran Bhai 215,000
//
// MENU LIVES SEPARATELY: "💳 Debts" (added by appendDebtsMenu)
// ════════════════════════════════════════════════════════════════════

const FIN_DEBTS_TAB = '💳 Debts';
const FIN_DEBTS_TZ = 'Asia/Karachi';

// Snowball-ordered creditors (smallest balance first)
// [Creditor, Original, Paid, DueDay (1-31), Notes, Priority]
const FIN_DEBTS_DEFAULT = [
  ['Zain Cousin',   1300,  0,  1, 'Cousin loan · pay first',           '🥇 #1 Snowball'],
  ['Mother in Law', 1500,  0,  1, 'Personal · respect priority',        '🥈 #2 Snowball'],
  ['Shahbaz',       1500,  0,  1, 'Friend loan',                        '🥉 #3 Snowball'],
  ['Yusra',         17500, 12500, 1, 'Friend · 12.5k already paid',     '#4 Snowball'],
  ['Mashal',        8500,  0,  1, 'Friend loan',                        '#5 Snowball'],
  ['Imran Bhai',    285000, 70000, 1, 'Largest debt · 70k paid · 215k remaining', '#6 Snowball — Boss']
];

// Receivables (people who owe me)
// [Debtor, Expected, Received, ExpectedDate, Notes]
const FIN_RECEIVABLES_DEFAULT = [
  // Sehat Kahani fully paid as of 28 Apr 2026 — NO open receivables
  // Use Menu → 💳 Debts → ➕ Add Receivable to add new ones
];

// ──────────────────────────────────────────────────────────
// SAFE WRAPPERS
// ──────────────────────────────────────────────────────────

function _alertD(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _logD(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function _genDebtTxnId() {
  if (typeof generateTxnId === 'function') return generateTxnId();
  // Fallback if Finance_Pro not loaded
  const stamp = Utilities.formatDate(new Date(), FIN_DEBTS_TZ, 'yyyyMMdd-HHmmss');
  const suffix = Math.floor(Math.random() * 1000).toString();
  return 'TXN-' + stamp + '-' + ('000' + suffix).slice(-3);
}

// ──────────────────────────────────────────────────────────
// THEME (matches Finance_Pro banking theme)
// ──────────────────────────────────────────────────────────

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

// ══════════════════════════════════════════════════════════
// MAIN ENTRY — REBUILD DEBTS TAB
// ══════════════════════════════════════════════════════════

function rebuildDebtsTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // SAFETY: snapshot before rebuild
  if (typeof snapFinanceSuite === 'function') {
    try { snapFinanceSuite('pre-debts-rebuild'); } catch(e) {}
  }

  buildDebtsTab(ss);
  installDebtsHandler();
  appendDebtsMenu();

  _logD('DEBTS_REBUILD', 'v1.0 debts tab installed');
  _alertD('✅ 💳 Debts tab built (v1.0).\n\n' +
          '6 creditors in snowball order\n' +
          'Total owed: 232,800 PKR\n' +
          'Click ✅ in column L to pay an installment.\n\n' +
          'Tab is in gold group with other Finance tabs.');
}

function buildDebtsTab(ss) {
  let s = ss.getSheetByName(FIN_DEBTS_TAB);
  const T = getDebtsTheme();

  // Read existing values to preserve user updates if rebuild
  const existingDebts = _readExistingDebts(s);
  const existingReceivables = _readExistingReceivables(s);

  if (!s) s = ss.insertSheet(FIN_DEBTS_TAB);

  // Try to color tab gold (Finance domain)
  try { s.setTabColor('#D97706'); } catch(e) {}

  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());
  s.getRange(1, 1, 30, 12).setBackground(T.bgPage);

  // Column widths
  const widths = [40, 160, 100, 100, 100, 70, 80, 110, 130, 100, 200, 80];
  widths.forEach((w, i) => s.setColumnWidth(i + 1, w));

  // Row 1: Title
  s.getRange('A1:L1').merge()
    .setValue('💳 DEBT MANAGEMENT CENTER — snowball strategy · click ✅ col L to pay installment')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);

  // Row 2: Strategy banner
  s.getRange('A2:L2').merge()
    .setValue('🥇 SNOWBALL: clear smallest debts first for psychological wins · Zain → MIL → Shahbaz → Yusra → Mashal → Imran (215k)')
    .setBackground(T.bgAccent).setFontColor(T.text).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center');
  s.setRowHeight(2, 26);
  s.setRowHeight(3, 8);

  // Row 4: I OWE section header
  s.getRange('A4:L4').merge()
    .setValue('💸 I OWE — sorted snowball priority (smallest first)')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(4, 28);

  // Row 5: Headers
  const owedHdr = ['#', 'Creditor', 'Original', 'Paid', 'Remaining', 'Due Day', 'Days Left', 'Status', 'From Account', 'Pay Amt', 'Notes', '✅ Pay'];
  s.getRange(5, 1, 1, 12).setValues([owedHdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(5, 26);

  // Rows 6-11: 6 creditor cards (use existing values if any, otherwise defaults)
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

  // Row 12: TOTAL OWED summary
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

  // Row 14: OWED TO ME section header
  s.getRange('A14:L14').merge()
    .setValue('💰 OWED TO ME — money others have committed to pay back')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(14, 28);

  // Row 15: Receivables headers
  const recHdr = ['#', 'Debtor', 'Expected', 'Received', 'Remaining', 'Exp. Date', 'Days', 'Status', 'To Account', 'Receive Amt', 'Notes', '✅ Receive'];
  s.getRange(15, 1, 1, 12).setValues([recHdr])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(15, 26);

  // Rows 16-20: 5 receivable slots
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

  // Row 21: TOTAL RECEIVABLES summary
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

  // Row 23: NET PERSONAL DEBT section header
  s.getRange('A23:L23').merge()
    .setValue('🏆 NET DEBT POSITION — personal debts only · CC excluded (see 🏦 Accounts)')
    .setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(23, 28);

  // Row 24: Net Personal Debt
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

  // Row 25: TRUE BURDEN (combined personal + CC)
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

  // Apply dropdowns
  applyDebtsDropdowns(s);

  // Apply conditional formatting (status colors + cleared rows)
  applyDebtsFormatting(s, T);

  s.setFrozenRows(5);
}

function _readExistingDebts(s) {
  const result = [[],[],[],[],[],[]];
  if (!s) return result;
  try {
    for (let i = 0; i < 6; i++) {
      const r = 6 + i;
      const row = s.getRange(r, 1, 1, 11).getValues()[0];
      // [#, Creditor, Original, Paid, Remaining, DueDay, DaysLeft, Status, FromAcc, PayAmt, Notes]
      result[i] = row;
    }
  } catch(e) {}
  return result;
}

function _readExistingReceivables(s) {
  const result = [[],[],[],[],[]];
  if (!s) return result;
  try {
    for (let i = 0; i < 5; i++) {
      const r = 16 + i;
      const row = s.getRange(r, 1, 1, 11).getValues()[0];
      result[i] = row;
    }
  } catch(e) {}
  return result;
}

function applyDebtsDropdowns(s) {
  // Account dropdowns (col 9 — From/To Account)
  const accounts = (typeof FIN2_ACCOUNTS !== 'undefined') ? FIN2_ACCOUNTS :
    ['Cash', 'JazzCash', 'Easypaisa', 'UBL', 'Meezan', 'Mashreq Bank', 'JS Bank', 'Naya Pay', 'Bank Alfalah', 'Alfalah CC'];

  const accDV = SpreadsheetApp.newDataValidation().requireValueInList(accounts, true).setAllowInvalid(true).build();
  s.getRange(6, 9, 6, 1).setDataValidation(accDV);   // I owe — From Account
  s.getRange(16, 9, 5, 1).setDataValidation(accDV);  // Owed to me — To Account

  // Due Day dropdown 1-31 (col 6)
  const days = [];
  for (let d = 1; d <= 31; d++) days.push(d);
  const dayDV = SpreadsheetApp.newDataValidation().requireValueInList(days, true).setAllowInvalid(true).build();
  s.getRange(6, 6, 6, 1).setDataValidation(dayDV);

  // Receivable Expected Date — date type
  const dateDV = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
  s.getRange(16, 6, 5, 1).setDataValidation(dateDV);
}

function applyDebtsFormatting(s, T) {
  const rules = [];

  // I owe status colors (col H = 8, rows 6-11)
  const owedRange = s.getRange('H6:H11');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('✅ CLEARED').setBackground(T.bgCleared).setFontColor(T.textCleared).setBold(true).setRanges([owedRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('⚫ OVERDUE').setBackground(T.critical).setFontColor('#FFFFFF').setBold(true).setRanges([owedRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🔴 Due Soon').setBackground(T.danger).setFontColor('#FFFFFF').setBold(true).setRanges([owedRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟡 This Week').setBackground(T.warning).setFontColor('#FFFFFF').setBold(true).setRanges([owedRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟢 OK').setBackground(T.success).setFontColor('#FFFFFF').setBold(true).setRanges([owedRange]).build());

  // Receivables status colors (col H = 8, rows 16-20)
  const recRange = s.getRange('H16:H20');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('✅ COLLECTED').setBackground(T.bgCleared).setFontColor(T.textCleared).setBold(true).setRanges([recRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('⚫ OVERDUE').setBackground(T.critical).setFontColor('#FFFFFF').setBold(true).setRanges([recRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🔴 Soon').setBackground(T.danger).setFontColor('#FFFFFF').setBold(true).setRanges([recRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('🟢 OK').setBackground(T.success).setFontColor('#FFFFFF').setBold(true).setRanges([recRange]).build());

  // Cleared row strikethrough (when Remaining = 0)
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$E6=0')
    .setBackground(T.bgCleared).setFontColor(T.textCleared)
    .setRanges([s.getRange('A6:L11')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($B16<>"",$E16=0)')
    .setBackground(T.bgCleared).setFontColor(T.textCleared)
    .setRanges([s.getRange('A16:L20')]).build());

  s.setConditionalFormatRules(rules);
}

// ══════════════════════════════════════════════════════════
// PAY INSTALLMENT (creates Debt Out txn + reduces remaining)
// ══════════════════════════════════════════════════════════

function payInstallment(s, row) {
  const creditor = s.getRange(row, 2).getValue();
  const original = s.getRange(row, 3).getValue() || 0;
  const paid = s.getRange(row, 4).getValue() || 0;
  const remaining = s.getRange(row, 5).getValue() || 0;
  const fromAcc = s.getRange(row, 9).getValue();
  const payAmt = s.getRange(row, 10).getValue();

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

  // Allow overpayment but warn
  let overpayNote = '';
  if (payAmt > remaining) {
    overpayNote = ' (overpayment: ' + (payAmt - remaining) + ' PKR — keep credit note)';
  }

  // Find next empty row in 💸 Transactions
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) {
    s.getRange(row, 12).setValue(false);
    _alertD('❌ 💸 Transactions tab not found.');
    return;
  }

  let nextRow = 9;
  for (let r = 9; r <= 208; r++) {
    if (!tx.getRange(r, 1).getValue()) { nextRow = r; break; }
  }
  if (nextRow > 208) {
    s.getRange(row, 12).setValue(false);
    _alertD('⚠️ Ledger full. Archive transactions first.');
    return;
  }

  Utilities.sleep(50);
  const txnId = _genDebtTxnId();
  const today = new Date();

  // Append Debt Out transaction
  tx.getRange(nextRow, 1).setValue(today).setNumberFormat('dd MMM yyyy');
  tx.getRange(nextRow, 2).setValue(fromAcc);
  tx.getRange(nextRow, 3).setValue('Debt Out');
  tx.getRange(nextRow, 4).setValue('💸 Debt Payment');
  tx.getRange(nextRow, 5).setValue(payAmt).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 6).setValue('PKR');
  tx.getRange(nextRow, 7).setValue(payAmt).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 8).setValue(creditor);
  try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(nextRow, 9, 1, 4).merge().setValue('Debt installment to ' + creditor + overpayNote + ' · auto-logged from 💳 Debts');
  tx.getRange(nextRow, 14).setValue(txnId);

  // Increment Paid column (Remaining auto-updates via formula)
  s.getRange(row, 4).setValue(paid + payAmt);

  // Reset Pay Amount and checkbox
  s.getRange(row, 10).setValue(0);
  s.getRange(row, 12).setValue(false);

  // Audit
  _logD('DEBT_PAYMENT', txnId + ' · ' + creditor + ' · ' + payAmt + ' PKR from ' + fromAcc + ' · paid ' + (paid + payAmt) + '/' + original);

  const newRemaining = Math.max(0, original - (paid + payAmt));
  if (newRemaining <= 0) {
    _alertD('🎉 ' + creditor + ' CLEARED!\n\n' +
            'Total paid: ' + (paid + payAmt).toLocaleString() + ' / ' + original.toLocaleString() + ' PKR\n\n' +
            'Snowball win — momentum continues. 🥇');
  } else {
    _alertD('✅ Installment logged.\n\n' +
            'Creditor: ' + creditor + '\n' +
            'Paid: ' + payAmt.toLocaleString() + ' PKR from ' + fromAcc + '\n' +
            'Remaining: ' + newRemaining.toLocaleString() + ' PKR\n' +
            (overpayNote ? '\n⚠️ Overpayment: keep credit note for next interaction\n' : '') +
            '\nTxnID: ' + txnId);
  }
}

// ══════════════════════════════════════════════════════════
// RECEIVE FROM DEBTOR (creates Debt In txn)
// ══════════════════════════════════════════════════════════

function payReceivable(s, row) {
  const debtor = s.getRange(row, 2).getValue();
  const expected = s.getRange(row, 3).getValue() || 0;
  const received = s.getRange(row, 4).getValue() || 0;
  const remaining = s.getRange(row, 5).getValue() || 0;
  const toAcc = s.getRange(row, 9).getValue();
  const recAmt = s.getRange(row, 10).getValue();

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
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) {
    s.getRange(row, 12).setValue(false);
    _alertD('❌ 💸 Transactions tab not found.');
    return;
  }

  let nextRow = 9;
  for (let r = 9; r <= 208; r++) {
    if (!tx.getRange(r, 1).getValue()) { nextRow = r; break; }
  }
  if (nextRow > 208) {
    s.getRange(row, 12).setValue(false);
    _alertD('⚠️ Ledger full.');
    return;
  }

  Utilities.sleep(50);
  const txnId = _genDebtTxnId();
  const today = new Date();

  tx.getRange(nextRow, 1).setValue(today).setNumberFormat('dd MMM yyyy');
  tx.getRange(nextRow, 2).setValue(toAcc);
  tx.getRange(nextRow, 3).setValue('Debt In');
  tx.getRange(nextRow, 4).setValue('💸 Debt Payment');
  tx.getRange(nextRow, 5).setValue(recAmt).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 6).setValue('PKR');
  tx.getRange(nextRow, 7).setValue(recAmt).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 8).setValue(debtor);
  try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(nextRow, 9, 1, 4).merge().setValue('Debt repayment from ' + debtor + ' · auto-logged from 💳 Debts');
  tx.getRange(nextRow, 14).setValue(txnId);

  s.getRange(row, 4).setValue(received + recAmt);
  s.getRange(row, 10).setValue(0);
  s.getRange(row, 12).setValue(false);

  _logD('RECEIVABLE_RECEIVED', txnId + ' · ' + debtor + ' · ' + recAmt + ' PKR to ' + toAcc);

  const newRemaining = Math.max(0, expected - (received + recAmt));
  if (newRemaining <= 0) {
    _alertD('🎉 ' + debtor + ' COLLECTED in full!\n\nTotal received: ' + (received + recAmt).toLocaleString() + ' PKR');
  } else {
    _alertD('✅ Receipt logged.\n\nDebtor: ' + debtor + '\nReceived: ' + recAmt.toLocaleString() + ' PKR to ' + toAcc + '\nRemaining: ' + newRemaining.toLocaleString() + ' PKR\n\nTxnID: ' + txnId);
  }
}

// ══════════════════════════════════════════════════════════
// MANUAL ADD: new creditor or receivable
// ══════════════════════════════════════════════════════════

function manualAddCreditor() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(FIN_DEBTS_TAB);
  if (!s) { _alertD('❌ Debts tab not found.'); return; }

  // Find first empty creditor row (rows 6-11)
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
  s.getRange(emptyRow, 6).setValue(1);  // default due day 1st
  s.getRange(emptyRow, 9).setValue('Meezan');
  s.getRange(emptyRow, 10).setValue(0);
  s.getRange(emptyRow, 11).setValue('Added manually ' + Utilities.formatDate(new Date(), FIN_DEBTS_TZ, 'dd MMM yyyy'));

  _logD('CREDITOR_ADDED', name + ' · ' + amt + ' PKR');
  _alertD('✅ Creditor added in row ' + emptyRow + '.\n\n' + name + ' · ' + amt.toLocaleString() + ' PKR\n\nEdit other fields (Due Day, From Account, Notes) inline.');
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
  if (emptyRow === -1) {
    _alertD('⚠️ All 5 receivable slots full.');
    return;
  }

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

// ══════════════════════════════════════════════════════════
// ON-EDIT HANDLER (separate from Finance_Pro)
// ══════════════════════════════════════════════════════════

function _debtsOnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== FIN_DEBTS_TAB) return;

  const r = e.range.getRow();
  const c = e.range.getColumn();
  const v = e.value;

  // Pay Installment checkbox (col 12, rows 6-11)
  if (c === 12 && r >= 6 && r <= 11 && (v === 'TRUE' || v === true)) {
    payInstallment(sh, r);
    return;
  }
  // Receive checkbox (col 12, rows 16-20)
  if (c === 12 && r >= 16 && r <= 20 && (v === 'TRUE' || v === true)) {
    payReceivable(sh, r);
    return;
  }
}

function installDebtsHandler() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_debtsOnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('_debtsOnEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
}

// ══════════════════════════════════════════════════════════
// VERIFY + MENU
// ══════════════════════════════════════════════════════════

function verifyDebtsCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(FIN_DEBTS_TAB);
  if (!s) { _alertD('❌ 💳 Debts tab missing.\n\nRun Menu → 💳 Debts → 🔄 Rebuild.'); return; }

  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_debtsOnEdit');
  let activeCount = 0;
  for (let r = 6; r <= 11; r++) {
    if (s.getRange(r, 2).getValue()) activeCount++;
  }

  let report = '🔍 💳 DEBTS COCKPIT v1.0 INTEGRITY\n\n';
  report += (s ? '✅' : '❌') + ' Tab present\n';
  report += (triggers.length === 1 ? '✅' : '⚠️') + ' Pay handler installed (' + triggers.length + '/1)\n';
  report += '✓ Active creditors: ' + activeCount + '/6\n';
  report += '✓ Total owed: ' + (s.getRange('E12').getValue() || 0).toLocaleString() + ' PKR\n';
  report += '✓ Net personal debt: ' + (s.getRange('E24').getValue() || 0).toLocaleString() + ' PKR\n';
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
      .addItem('🔧 Reinstall Pay Handler', 'installDebtsHandler')
      .addItem('🔍 Verify Debts Tab', 'verifyDebtsCockpit')
      .addToUi();
  } catch(e) { Logger.log('Debts menu add failed: ' + e); }
}