// ════════════════════════════════════════════════════════════════════
// 💼 Finance_Salary.gs — PAYSLIP-ACCURATE LIVE FORECAST v1.6
// LOCKED · 7-Layer Audit · Self-Contained
//
// CHANGES FROM v1.5 (2026-04-28 hotfix v6):
//   - FIXED: 5 description cells (D13, D20, D21, D23, D24) showed #ERROR! because
//            strings starting with "=" were parsed as formulas. Replaced "=" with "≡"
//   - FIXED: Auto-detect was too narrow. Now MULTI-ANCHOR matching:
//            anchor 1 = forecast Net B24 (bonus months)
//            anchor 2 = lean baseline (Contract Base + WFH - tax)  for no-bonus months
//            anchor 3 = March 2026 historical Net 123,851 for payslip-shape credits
//            Tolerance widened 5% → 10% per anchor.
//   - Audit log enriched: now logs which anchor matched (1/2/3) + variance
//
// CHANGES FROM v1.4 (carried forward):
//   - FIN_SAL_ROW constant map = single source of truth for row numbers
//   - Tax Tracker LIVE (5 formulas tied to forecast)
//   - _salaryOnEdit auto-tag handler
//   - logSalaryFromForecast menu helper
// ════════════════════════════════════════════════════════════════════

const FIN_SAL_TAB = '💼 Salary';
const FIN_SAL_TZ = 'Asia/Karachi';
const FIN_SAL_LANDS_IN = 'Meezan';

const FIN_SAL_EMPLOYEE_ID = '113389';
const FIN_SAL_DESIGNATION = 'Technical Support Specialist · CSP · Lahore';
const FIN_SAL_JOIN_DATE = '14 Apr 2025';
const FIN_SAL_PAY_DAY = 1;

// ─── A3 v1.6: Multi-anchor auto-detection ───
const FIN_SAL_TXN_TAB = '💸 Transactions';
const FIN_SAL_AUTODETECT_ACCOUNT = 'Meezan';
const FIN_SAL_AUTODETECT_TOLERANCE = 0.10; // ±10% per anchor (was 5%)
const FIN_SAL_FY_REMAINING_MONTHS = 3;

const FIN_SAL_ROW = {
  basic: 9, hra: 10, medical: 11, utility: 12,
  contractBase: 13,
  wfh: 14,
  ot: 15,
  mbo: 16, referral: 17, spot: 18, kitty: 19,
  variable: 20, totalGross: 21,
  taxRate: 22, tax: 23, net: 24
};

const FIN_SAL_INPUT_CELLS = {
  basic:    'B' + FIN_SAL_ROW.basic,
  hra:      'B' + FIN_SAL_ROW.hra,
  medical:  'B' + FIN_SAL_ROW.medical,
  utility:  'B' + FIN_SAL_ROW.utility,
  wfh:      'B' + FIN_SAL_ROW.wfh,
  otDays:   'B' + FIN_SAL_ROW.ot,
  otRate:   'C' + FIN_SAL_ROW.ot,
  mbo:      'B' + FIN_SAL_ROW.mbo,
  referral: 'B' + FIN_SAL_ROW.referral,
  spot:     'B' + FIN_SAL_ROW.spot,
  kitty:    'B' + FIN_SAL_ROW.kitty,
  taxRate:  'B' + FIN_SAL_ROW.taxRate
};

const FIN_SAL_MARCH_2026 = {
  basic: 74226, hra: 25979, medical: 7423, utility: 3705,
  contractBase: 111333,
  wfh: 8377, overtime: 7183,
  grossTotal: 126893,
  taxIncome: 930, taxVariable: 1712, eobi: 400,
  deductionsTotal: 3042, net: 123851
};

const FIN_SAL_DEFAULTS = {
  basic: 74226, hra: 25979, medical: 7423, utility: 3705,
  wfh: 8377,
  otDays: 3, otRate: 7000,
  mbo: 37500, referral: 0, spot: 0, kitty: 0,
  taxRatePct: 2.75
};

const FIN_SAL_FY_TAXABLE = 1526636;
const FIN_SAL_FY_TAX_TOTAL = 41930;
const FIN_SAL_FY_TAX_PAID = 39139;
const FIN_SAL_FY_TAX_REMAINING = 2791;
const FIN_SAL_FY_EFFECTIVE_PCT = Math.round((FIN_SAL_FY_TAX_TOTAL / FIN_SAL_FY_TAXABLE) * 10000) / 100;

const FIN_SAL_YTD = {
  grossTotal: 1281713,
  mbo: 94856, referral: 30000, spot: 6182, overtime: 72837
};

const FIN_SAL_BONUSES = [
  ['Referral Bonus',        30000, 'Nov 2025',     'one-time'],
  ['Spot Bonus',             6182, 'Oct 2025',     'one-time'],
  ['MBO Q1 (Jul 25)',       23046, 'Jul 2025',     'quarterly'],
  ['MBO Q2 (Oct 25)',       37909, 'Oct 2025',     'quarterly'],
  ['MBO Q3 (Jan 26)',       33901, 'Jan 2026',     'quarterly'],
  ['Overtime YTD',          72837, 'monthly variable', 'recurring variable']
];

// ──────────────────────────────────────────────────────────
// SAFE WRAPPERS
// ──────────────────────────────────────────────────────────

function _alertS(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}
function _logS(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}
function getSalaryTheme() {
  if (typeof getFinTheme === 'function') return getFinTheme();
  return {
    bgPage: '#FFFFFF', bgPanel: '#F8FAFC', bgRow: '#FFFFFF',
    bgAlt: '#F1F5F9', bgInput: '#FFFBEB', bgHeader: '#1E293B',
    bgSection: '#0F172A', bgAccent: '#FEF3C7', bgAsset: '#DCFCE7', bgNet: '#DBEAFE',
    text: '#0F172A', textHi: '#000000', textMd: '#334155', textLo: '#64748B',
    success: '#16A34A', warning: '#D97706', danger: '#DC2626',
    info: '#2563EB', purple: '#7C3AED', orange: '#EA580C'
  };
}

function _readExistingForecast(s) {
  if (!s) return null;
  const result = {};
  Object.keys(FIN_SAL_INPUT_CELLS).forEach(key => {
    try {
      const v = s.getRange(FIN_SAL_INPUT_CELLS[key]).getValue();
      if (typeof v === 'number' && !isNaN(v)) result[key] = v;
    } catch(e) {}
  });
  return result;
}

// ══════════════════════════════════════════════════════════
// MAIN ENTRY
// ══════════════════════════════════════════════════════════

function buildSalaryTabUI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (typeof snapFinanceSuite === 'function') {
    try { snapFinanceSuite('pre-salary-rebuild'); } catch(e) {}
  }
  buildSalaryTab(ss);
  _logS('SALARY_REBUILD', 'v1.6 multi-anchor + cosmetic fix');
  _alertS('✅ 💼 Salary tab built (v1.6).\n\n' +
          '🔧 FIXED: #ERROR! cells in column D (rows 13/20/21/23/24)\n\n' +
          '🤖 NEW Multi-Anchor Auto-Detect:\n' +
          '  Anchor 1: Forecast Net (B24) · bonus months\n' +
          '  Anchor 2: Lean baseline (Contract Base + WFH - tax) · no-bonus months\n' +
          '  Anchor 3: March 2026 historical (123,851) · payslip-shape credits\n' +
          '  Tolerance: ±10% per anchor (matches if ANY anchor matches)\n\n' +
          '💡 Test: Meezan + Income + 123,851 → matches anchor 3 → auto-tags.');
}

function refreshSalaryTab() {
  buildSalaryTab(SpreadsheetApp.getActiveSpreadsheet());
  _alertS('✅ Salary tab refreshed (v1.6).\n\nEdits to yellow cells preserved. #ERROR! cosmetic fixed. Multi-anchor auto-detect active.');
}

function buildSalaryTab(ss) {
  const T = getSalaryTheme();
  let s = ss.getSheetByName(FIN_SAL_TAB);

  const existing = _readExistingForecast(s);

  if (!s) s = ss.insertSheet(FIN_SAL_TAB);
  try { s.setTabColor('#D97706'); } catch(e) {}

  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());

  const widths = [220, 130, 130, 140, 140, 140];
  widths.forEach((w, i) => s.setColumnWidth(i + 1, w));
  s.getRange(1, 1, 95, 6).setBackground(T.bgPage);

  s.getRange('A1:F1').merge()
    .setValue('💼 SALARY TRACKER v1.6 — payslip-accurate · live formulas · live tax tracker · multi-anchor auto-detect')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);
  s.getRange('A2:F2').merge()
    .setValue('👤 Employee ' + FIN_SAL_EMPLOYEE_ID + ' · ' + FIN_SAL_DESIGNATION + ' · Joined ' + FIN_SAL_JOIN_DATE + ' · Lands in ' + FIN_SAL_LANDS_IN + ' on 1st')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(2, 24);
  s.setRowHeight(3, 8);

  _buildPaydayCountdownSection(s, T);
  _buildLiveForecastSection(s, T, existing);

  let row = 26;
  s.setRowHeight(25, 8);
  row = _buildPayslipBreakdownSection(s, row, T);
  row = _buildYtdSummarySection(s, row, T);
  row = _buildTaxTrackerSection(s, row, T);
  row = _buildBonusHistorySection(s, row, T);

  s.getRange(row, 1, 1, 6).merge()
    .setValue('💡 v1.6 LIVE: Tax Tracker auto-recalcs · 🤖 Multi-anchor salary auto-detect (Net · Lean baseline · March historical · ±10% per anchor)')
    .setBackground(T.bgPanel).setFontColor(T.textLo).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center').setWrap(true);
  s.setRowHeight(row, 44);

  s.setFrozenRows(2);

  installSalaryEditHandler(true);
}

// ══════════════════════════════════════════════════════════
// SECTION 1: PAYDAY COUNTDOWN
// ══════════════════════════════════════════════════════════

function _buildPaydayCountdownSection(s, T) {
  s.getRange('A4:F4').merge().setValue('📅 PAYDAY COUNTDOWN')
    .setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(4, 28);

  s.getRange('A5:B5').merge().setValue('Days till next salary')
    .setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('C5').setFormula(
    '=IF(DAY(TODAY())<=' + FIN_SAL_PAY_DAY + ',' + FIN_SAL_PAY_DAY + '-DAY(TODAY()),DAY(EOMONTH(TODAY(),0))-DAY(TODAY())+' + FIN_SAL_PAY_DAY + ')'
  ).setNumberFormat('0').setBackground(T.bgAccent).setFontColor(T.textHi).setFontWeight('bold')
   .setFontSize(20).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('D5:F5').merge().setFormula(
    '="days · expected " & TEXT(IF(DAY(TODAY())<=' + FIN_SAL_PAY_DAY + ',DATE(YEAR(TODAY()),MONTH(TODAY()),' + FIN_SAL_PAY_DAY + '),DATE(YEAR(TODAY()),MONTH(TODAY())+1,' + FIN_SAL_PAY_DAY + ')),"dd MMM yyyy") & " in ' + FIN_SAL_LANDS_IN + '"'
  ).setBackground(T.bgPanel).setFontColor(T.textMd).setFontWeight('bold')
   .setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(5, 36);
  s.setRowHeight(6, 8);
}

// ══════════════════════════════════════════════════════════
// SECTION 2: LIVE FORECAST (v1.6: 5 description strings prefix-fixed)
// ══════════════════════════════════════════════════════════

function _buildLiveForecastSection(s, T, existing) {
  const get = (key) => (existing && typeof existing[key] === 'number') ? existing[key] : FIN_SAL_DEFAULTS[key];
  const R = FIN_SAL_ROW;

  s.getRange('A7:F7').merge().setValue('💰 NEXT SALARY FORECAST — LIVE EDITABLE · payslip-accurate structure')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(7, 28);

  s.getRange(8, 1, 1, 6).setValues([['Component', 'Amount (PKR)', 'Calc / Detail', 'Notes', '', '']])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(8, 26);

  const writeInputRow = (rowNum, label, value, color, note) => {
    s.getRange(rowNum, 1).setValue(label).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    s.getRange(rowNum, 2).setValue(value).setNumberFormat('#,##0')
      .setBackground(T.bgInput).setFontColor(color).setFontWeight('bold')
      .setFontSize(12).setHorizontalAlignment('right');
    s.getRange(rowNum, 3).setValue('').setBackground(T.bgRow);
    s.getRange(rowNum, 4, 1, 3).merge().setValue(note).setBackground(T.bgPanel)
      .setFontColor(T.textMd).setFontStyle('italic').setFontSize(10)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.setRowHeight(rowNum, 26);
  };

  writeInputRow(R.basic,   'Basic Salary',  get('basic'),   T.text, 'Locked from contract');
  writeInputRow(R.hra,     'HRA',           get('hra'),     T.text, 'House Rent Allowance');
  writeInputRow(R.medical, 'Medical',       get('medical'), T.text, 'Medical (NON-TAXABLE per FY 2025-26)');
  writeInputRow(R.utility, 'Utility',       get('utility'), T.text, 'Utility allowance');

  s.getRange(R.contractBase, 1).setValue('═══ CONTRACT BASE ═══')
    .setBackground(T.bgAccent).setFontColor(T.textHi).setFontWeight('bold').setFontSize(12);
  s.getRange(R.contractBase, 2).setFormula('=SUM(B' + R.basic + ':B' + R.utility + ')').setNumberFormat('#,##0')
    .setBackground(T.bgAccent).setFontColor(T.textHi).setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('right');
  s.getRange(R.contractBase, 3).setValue('').setBackground(T.bgAccent);
  // v1.6 FIX: prefix ≡ instead of = to avoid Sheets formula parsing
  s.getRange(R.contractBase, 4, 1, 3).merge().setValue('≡ SUM(B9:B12) Basic+HRA+Medical+Utility · matches payslip "Gross Salary 111,333"')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(R.contractBase, 30);

  writeInputRow(R.wfh, '🏠 WFH Allowance', get('wfh'), T.info, '30 USD × ~280 PKR · permanent contract · set 0 if month skipped');

  s.getRange(R.ot, 1).setValue('⏰ Overtime (days × rate)')
    .setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
  s.getRange(R.ot, 2).setValue(get('otDays')).setNumberFormat('0')
    .setBackground(T.bgInput).setFontColor(T.orange).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.getRange(R.ot, 3).setValue(get('otRate')).setNumberFormat('#,##0')
    .setBackground(T.bgInput).setFontColor(T.orange).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.getRange(R.ot, 4).setFormula('=B' + R.ot + '*C' + R.ot).setNumberFormat('#,##0')
    .setBackground(T.bgAccent).setFontColor(T.orange).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('right');
  // v1.6 FIX
  s.getRange(R.ot, 5, 1, 2).merge().setValue('≡ Days × Rate · Eid 3×7,000 default · edit either to recalc')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(R.ot, 28);

  writeInputRow(R.mbo,      '🎁 MBO Bonus',      get('mbo'),      T.warning, 'Quarterly · Q1 23k · Q2 38k · Q3 34k · Q4 expected May 2026');
  writeInputRow(R.referral, '🤝 Referral Bonus', get('referral'), T.purple,  'One-time · received 30k Nov 2025 · set 0 if none expected');
  writeInputRow(R.spot,     '⭐ Spot Bonus',     get('spot'),     T.purple,  'One-time · received 6,182 Oct 2025 · set 0 if none expected');
  writeInputRow(R.kitty,    '💰 Kitty Cash',     get('kitty'),    T.purple,  'Variable per company event · set 0 if none expected');

  s.getRange(R.variable, 1).setValue('═══ VARIABLE TOTAL ═══')
    .setBackground(T.bgAccent).setFontColor(T.textHi).setFontWeight('bold').setFontSize(12);
  s.getRange(R.variable, 2).setFormula(
    '=B' + R.wfh + '+D' + R.ot + '+B' + R.mbo + '+B' + R.referral + '+B' + R.spot + '+B' + R.kitty
  ).setNumberFormat('#,##0')
    .setBackground(T.bgAccent).setFontColor(T.warning).setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('right');
  s.getRange(R.variable, 3).setValue('').setBackground(T.bgAccent);
  // v1.6 FIX
  s.getRange(R.variable, 4, 1, 3).merge().setValue('≡ WFH + OT Total + MBO + Referral + Spot + Kitty')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(R.variable, 30);

  s.getRange(R.totalGross, 1).setValue('═══ TOTAL GROSS ═══')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(12);
  s.getRange(R.totalGross, 2).setFormula('=B' + R.contractBase + '+B' + R.variable).setNumberFormat('#,##0')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(14).setHorizontalAlignment('right');
  s.getRange(R.totalGross, 3).setValue('').setBackground(T.bgSection);
  // v1.6 FIX
  s.getRange(R.totalGross, 4, 1, 3).merge().setValue('≡ Contract Base (B13) + Variable Total (B20)')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(R.totalGross, 32);

  s.getRange(R.taxRate, 1).setValue('💸 Tax Rate (effective %)')
    .setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
  s.getRange(R.taxRate, 2).setValue(get('taxRatePct') / 100).setNumberFormat('0.00%')
    .setBackground(T.bgInput).setFontColor(T.danger).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('right');
  s.getRange(R.taxRate, 3).setFormula(
    '=IF(B' + R.totalGross + '*12<=600000,"0% (under 600k)",' +
    'IF(B' + R.totalGross + '*12<=1200000,"5% (600k-1.2M)",' +
    'IF(B' + R.totalGross + '*12<=2200000,"~5% effective",' +
    'IF(B' + R.totalGross + '*12<=3200000,"~9% effective",' +
    'IF(B' + R.totalGross + '*12<=4100000,"~14% effective","~17% effective")))))'
  ).setBackground(T.bgPanel).setFontColor(T.textLo).setFontSize(10).setHorizontalAlignment('center');
  s.getRange(R.taxRate, 4, 1, 3).merge().setValue('FY YTD effective = ' + FIN_SAL_FY_EFFECTIVE_PCT + '% · override per actual payslip')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(R.taxRate, 28);

  s.getRange(R.tax, 1).setValue('💸 Estimated Tax')
    .setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
  s.getRange(R.tax, 2).setFormula('=ROUND(B' + R.totalGross + '*B' + R.taxRate + ',0)*-1').setNumberFormat('#,##0')
    .setBackground(T.bgInput).setFontColor(T.danger).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('right');
  s.getRange(R.tax, 3).setValue('').setBackground(T.bgRow);
  // v1.6 FIX
  s.getRange(R.tax, 4, 1, 3).merge().setValue('≡ Total Gross × Tax Rate · negative value')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(R.tax, 26);

  s.getRange(R.net, 1).setValue('🏆 NET LANDING in ' + FIN_SAL_LANDS_IN)
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13);
  s.getRange(R.net, 2).setFormula('=B' + R.totalGross + '+B' + R.tax).setNumberFormat('#,##0')
    .setBackground(T.bgAsset).setFontColor(T.success).setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('right');
  s.getRange(R.net, 3).setValue('PKR').setBackground(T.bgAsset).setFontColor(T.success)
    .setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  // v1.6 FIX
  s.getRange(R.net, 4, 1, 3).merge().setValue('≡ Total Gross - Estimated Tax · expected ' + FIN_SAL_PAY_DAY + 'st of next month · 🤖 multi-anchor auto-detect watches Meezan deposits')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(R.net, 36);
}

// ══════════════════════════════════════════════════════════
// SECTION 3: MARCH PAYSLIP (UNCHANGED)
// ══════════════════════════════════════════════════════════

function _buildPayslipBreakdownSection(s, row, T) {
  s.getRange(row, 1, 1, 6).merge().setValue('📋 MARCH 2026 PAYSLIP — locked historical actuals')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(row, 28); row++;

  s.getRange(row, 1, 1, 6).setValues([['Component', 'Earnings (PKR)', 'Deductions (PKR)', 'Notes', '', '']])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(row, 26); row++;

  const m = FIN_SAL_MARCH_2026;
  const breakdown = [
    ['Basic Salary',         m.basic,    null, 'Core base'],
    ['HRA',                  m.hra,      null, 'House Rent'],
    ['Medical',              m.medical,  null, 'Non-taxable'],
    ['Utility',              m.utility,  null, 'Utility'],
    ['─── Contract Base ───', m.contractBase, null, 'Matches payslip "Gross Salary 111,333"'],
    ['WFH Allowance',        m.wfh,      null, '30 USD × ~280 PKR · permanent'],
    ['Overtime',             m.overtime, null, 'March OT (variable)'],
    ['─── GROSS ───',        m.grossTotal, null, 'Sum of all earnings'],
    ['Income Tax',           null, m.taxIncome, 'Monthly income tax'],
    ['Tax on Variable',      null, m.taxVariable, 'Higher rate on overtime'],
    ['EOBI',                 null, m.eobi,    'Pension contribution'],
    ['─── DEDUCTIONS ───',   null, m.deductionsTotal, 'Sum of deductions'],
    ['NET in ' + FIN_SAL_LANDS_IN, m.net, null, 'Final landing']
  ];

  breakdown.forEach((b, i) => {
    const isHi = (b[0].indexOf('Contract') !== -1 || b[0].indexOf('GROSS') !== -1 ||
                  b[0].indexOf('DEDUCTIONS') !== -1 || b[0].indexOf('NET') !== -1);
    const bg = isHi ? T.bgAccent : (i % 2 === 0 ? T.bgRow : T.bgAlt);
    s.getRange(row, 1).setValue(b[0]).setBackground(bg).setFontColor(T.textHi)
      .setFontWeight(isHi ? 'bold' : 'normal').setFontSize(isHi ? 12 : 11);
    if (b[1] != null) {
      s.getRange(row, 2).setValue(b[1]).setNumberFormat('#,##0').setBackground(bg)
        .setFontColor(b[0].indexOf('NET') !== -1 ? T.success : T.textHi)
        .setFontWeight('bold').setFontSize(isHi ? 12 : 11).setHorizontalAlignment('right');
    } else { s.getRange(row, 2).setValue('').setBackground(bg); }
    if (b[2] != null) {
      s.getRange(row, 3).setValue(b[2]).setNumberFormat('#,##0').setBackground(bg)
        .setFontColor(T.danger).setFontWeight('bold').setFontSize(isHi ? 12 : 11).setHorizontalAlignment('right');
    } else { s.getRange(row, 3).setValue('').setBackground(bg); }
    s.getRange(row, 4, 1, 3).merge().setValue(b[3]).setBackground(bg).setFontColor(T.textMd)
      .setFontStyle('italic').setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.setRowHeight(row, isHi ? 28 : 22); row++;
  });

  s.setRowHeight(row, 8); row++;
  return row;
}

// ══════════════════════════════════════════════════════════
// SECTION 4: YTD SUMMARY (UNCHANGED)
// ══════════════════════════════════════════════════════════

function _buildYtdSummarySection(s, row, T) {
  s.getRange(row, 1, 1, 6).merge().setValue('📊 YEAR-TO-DATE — FY 2025-26 (Jul 2025 – Mar 2026)')
    .setBackground(T.purple).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(row, 28); row++;

  const ytdVar = FIN_SAL_YTD.mbo + FIN_SAL_YTD.referral + FIN_SAL_YTD.spot + FIN_SAL_YTD.overtime;
  const stats = [
    ['Annual taxable income', FIN_SAL_FY_TAXABLE, 'Cumulative gross taxable'],
    ['Variable income YTD', ytdVar, 'MBO + Referral + Spot + OT'],
    ['Gross income YTD', FIN_SAL_YTD.grossTotal, 'All earnings to date'],
    ['Months elapsed', 9, 'Jul 2025 → Mar 2026']
  ];

  for (let i = 0; i < 2; i++) {
    const left = stats[i * 2];
    const right = stats[i * 2 + 1];
    s.getRange(row, 1).setValue(left[0]).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    s.getRange(row, 2).setValue(left[1]).setNumberFormat('#,##0').setBackground(T.bgAccent)
      .setFontColor(T.textHi).setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
    s.getRange(row, 3).setValue(left[2]).setBackground(T.bgPanel).setFontColor(T.textMd)
      .setFontStyle('italic').setFontSize(10).setVerticalAlignment('middle');
    s.getRange(row, 4).setValue(right[0]).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    s.getRange(row, 5).setValue(right[1]).setNumberFormat('#,##0').setBackground(T.bgAccent)
      .setFontColor(T.textHi).setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
    s.getRange(row, 6).setValue(right[2]).setBackground(T.bgPanel).setFontColor(T.textMd)
      .setFontStyle('italic').setFontSize(10).setVerticalAlignment('middle');
    s.setRowHeight(row, 30); row++;
  }
  s.setRowHeight(row, 8); row++;
  return row;
}

// ══════════════════════════════════════════════════════════
// SECTION 5: TAX TRACKER (UNCHANGED — already live in v1.5)
// ══════════════════════════════════════════════════════════

function _buildTaxTrackerSection(s, row, T) {
  const R = FIN_SAL_ROW;
  const M = FIN_SAL_FY_REMAINING_MONTHS;

  s.getRange(row, 1, 1, 6).merge()
    .setValue('💸 TAX TRACKER — LIVE · driven by forecast cells (B' + R.totalGross + ' Gross / B' + R.tax + ' Tax)')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(row, 28); row++;

  s.getRange(row, 1, 1, 6).setValues([['Tax Metric', 'Amount', 'Notes', '', '', '']])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(row, 26); row++;

  const w = (label, valOrFormula, isFormula, fmt, bgVal, fcVal, note) => {
    s.getRange(row, 1).setValue(label)
      .setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    const valCell = s.getRange(row, 2);
    if (isFormula) valCell.setFormula(valOrFormula);
    else valCell.setValue(valOrFormula);
    valCell.setNumberFormat(fmt).setBackground(bgVal).setFontColor(fcVal)
      .setFontWeight('bold').setFontSize(13).setHorizontalAlignment('right');
    s.getRange(row, 3, 1, 4).merge().setValue(note)
      .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.setRowHeight(row, 26); row++;
  };

  w('Tax paid YTD (Jul-Mar)', FIN_SAL_FY_TAX_PAID, false, '#,##0', T.bgAsset, T.success,
    '🔒 9 months actual · locked from payslips');
  w('Annual taxable YTD', FIN_SAL_FY_TAXABLE, false, '#,##0', T.bgPanel, T.textHi,
    '🔒 Cumulative gross taxable Jul-Mar · locked');
  w('Effective rate YTD', FIN_SAL_FY_EFFECTIVE_PCT, false, '0.00"%"', T.bgPanel, T.textHi,
    '🔒 Tax paid / taxable · locked YTD');

  w('🔴 Forecast tax this month',
    '=IFERROR(ABS(B' + R.tax + '),0)', true, '#,##0', T.bgInput, T.danger,
    '🔴 LIVE = |B' + R.tax + '| · auto-recalcs when you edit forecast cells above');

  w('🔴 Projected tax remaining FY',
    '=IFERROR(ABS(B' + R.tax + ')*' + M + ',0)', true, '#,##0', T.bgInput, T.danger,
    '🔴 LIVE = forecast tax × ' + M + ' months (Apr · May · Jun)');

  w('🔴 Projected FY total tax',
    '=IFERROR(' + FIN_SAL_FY_TAX_PAID + '+ABS(B' + R.tax + ')*' + M + ',' + FIN_SAL_FY_TAX_PAID + ')',
    true, '#,##0', T.bgAccent, T.textHi,
    '🔴 LIVE = paid YTD + (forecast × ' + M + ')');

  w('🔴 Variance vs original estimate',
    '=IFERROR(' + FIN_SAL_FY_TAX_PAID + '+ABS(B' + R.tax + ')*' + M + '-' + FIN_SAL_FY_TAX_TOTAL + ',0)',
    true, '+#,##0;-#,##0', T.bgInput, T.warning,
    '🔴 LIVE · positive = under-estimated · negative = over-estimated · original ' + FIN_SAL_FY_TAX_TOTAL.toLocaleString());

  w('🔴 Projected effective rate FY',
    '=IFERROR((' + FIN_SAL_FY_TAX_PAID + '+ABS(B' + R.tax + ')*' + M + ')/(' + FIN_SAL_FY_TAXABLE + '+B' + R.totalGross + '*' + M + '),0)',
    true, '0.00%', T.bgInput, T.warning,
    '🔴 LIVE = projected total tax / projected annual taxable');

  w('Original FY estimate (locked)', FIN_SAL_FY_TAX_TOTAL, false, '#,##0', T.bgPanel, T.textLo,
    '🔒 Original FY 2025-26 tax estimate · compare vs projected above');

  s.setRowHeight(row, 8); row++;
  return row;
}

// ══════════════════════════════════════════════════════════
// SECTION 6: BONUS HISTORY (UNCHANGED)
// ══════════════════════════════════════════════════════════

function _buildBonusHistorySection(s, row, T) {
  s.getRange(row, 1, 1, 6).merge().setValue('🎁 VARIABLE INCOME HISTORY — FY 2025-26 to date')
    .setBackground(T.orange).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(row, 28); row++;

  s.getRange(row, 1, 1, 6).setValues([['Type', 'Amount (PKR)', 'Period', 'Pattern', '', '']])
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(row, 26); row++;

  let total = 0;
  FIN_SAL_BONUSES.forEach((b, i) => {
    s.getRange(row, 1).setValue(b[0]).setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold').setFontSize(11);
    s.getRange(row, 2).setValue(b[1]).setNumberFormat('#,##0').setBackground(i % 2 === 0 ? T.bgRow : T.bgAlt)
      .setFontColor(T.success).setFontWeight('bold').setFontSize(11).setHorizontalAlignment('right');
    s.getRange(row, 3).setValue(b[2]).setBackground(i % 2 === 0 ? T.bgRow : T.bgAlt).setFontColor(T.textMd).setFontSize(10).setHorizontalAlignment('center');
    s.getRange(row, 4, 1, 3).merge().setValue(b[3]).setBackground(i % 2 === 0 ? T.bgRow : T.bgAlt)
      .setFontColor(T.textMd).setFontStyle('italic').setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.setRowHeight(row, 24);
    total += b[1]; row++;
  });

  s.getRange(row, 1).setValue('🏆 TOTAL VARIABLE YTD')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
  s.getRange(row, 2).setValue(total).setNumberFormat('#,##0')
    .setBackground(T.bgAsset).setFontColor(T.success).setFontWeight('bold').setFontSize(13).setHorizontalAlignment('right');
  s.getRange(row, 3, 1, 4).merge().setValue('Sum of bonuses + overtime received Jul 2025 → Mar 2026')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(row, 30); row++;

  s.setRowHeight(row, 8); row++;
  return row;
}

// ══════════════════════════════════════════════════════════
// A3 v1.6: MULTI-ANCHOR SALARY AUTO-DETECT
// ══════════════════════════════════════════════════════════

function _salaryOnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== FIN_SAL_TXN_TAB) return;

  const r = e.range.getRow();
  const c = e.range.getColumn();

  if (c !== 2 && c !== 3 && c !== 5) return;
  if (r !== 4 && (r < 9 || r > 208)) return;

  const account = sh.getRange(r, 2).getValue();
  const type = sh.getRange(r, 3).getValue();
  const amount = sh.getRange(r, 5).getValue();

  if (account !== FIN_SAL_AUTODETECT_ACCOUNT) return;
  if (type !== 'Income') return;
  if (typeof amount !== 'number' || amount <= 0) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sal = ss.getSheetByName(FIN_SAL_TAB);
  if (!sal) return;

  const R = FIN_SAL_ROW;

  // ─── v1.6 MULTI-ANCHOR: build 3 anchors ───
  const forecastNet = sal.getRange('B' + R.net).getValue();
  const contractBase = sal.getRange('B' + R.contractBase).getValue();
  const wfh = sal.getRange('B' + R.wfh).getValue();
  const tax = sal.getRange('B' + R.tax).getValue(); // negative number

  const anchors = [];

  // Anchor 1: Forecast Net (current planned salary, bonus months)
  if (typeof forecastNet === 'number' && forecastNet > 0) {
    anchors.push({ id: 1, label: 'Forecast Net', value: forecastNet });
  }

  // Anchor 2: Lean baseline = Contract Base + WFH - |tax for base only|
  // Approximation: contract base + WFH - 2.75% of (contract base + WFH)
  if (typeof contractBase === 'number' && contractBase > 0) {
    const baseSum = contractBase + (typeof wfh === 'number' ? wfh : 0);
    const leanTax = baseSum * 0.0275;
    const leanNet = baseSum - leanTax;
    if (leanNet > 0) {
      anchors.push({ id: 2, label: 'Lean baseline', value: leanNet });
    }
  }

  // Anchor 3: March 2026 historical Net (locked)
  if (FIN_SAL_MARCH_2026.net > 0) {
    anchors.push({ id: 3, label: 'March historical', value: FIN_SAL_MARCH_2026.net });
  }

  if (anchors.length === 0) return;

  // ─── Find best matching anchor (smallest variance) ───
  let bestMatch = null;
  for (let i = 0; i < anchors.length; i++) {
    const variance = Math.abs(amount - anchors[i].value) / anchors[i].value;
    if (variance <= FIN_SAL_AUTODETECT_TOLERANCE) {
      if (!bestMatch || variance < bestMatch.variance) {
        bestMatch = { anchor: anchors[i], variance: variance };
      }
    }
  }

  if (!bestMatch) return; // no anchor matched

  // ─── MATCH — auto-tag if cell is empty/default ───
  const currentCat = sh.getRange(r, 4).getValue();
  const catEmptyOrDefault = !currentCat || currentCat === '' || currentCat === '🍔 Food';

  if (catEmptyOrDefault) {
    sh.getRange(r, 4).setValue('💰 Salary');
  }

  const currentNotes = sh.getRange(r, 9).getValue();
  if (!currentNotes || currentNotes === '') {
    const variancePct = (bestMatch.variance * 100).toFixed(1);
    const monthLabel = Utilities.formatDate(new Date(), FIN_SAL_TZ, 'MMM yyyy');
    const note = '🤖 Auto-detected payslip credit · ' + monthLabel +
                 ' · matched ' + bestMatch.anchor.label + ' (' + variancePct + '%)';
    sh.getRange(r, 9).setValue(note);
  }

  if (typeof logAuditAction === 'function') {
    logAuditAction('SALARY_AUTO_DETECTED',
      'Row ' + r + ' · ' + amount.toLocaleString() + ' PKR · anchor=' + bestMatch.anchor.id +
      ' (' + bestMatch.anchor.label + ') · variance=' + (bestMatch.variance * 100).toFixed(1) + '%');
  }
}

function installSalaryEditHandler(silent) {
  try {
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === '_salaryOnEdit') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('_salaryOnEdit')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onEdit().create();
    if (!silent) _alertS('✅ Salary auto-detect handler installed (v1.6 multi-anchor).\n\nWatching ' + FIN_SAL_TXN_TAB + ' for Meezan Income matching ANY of 3 anchors within ±' + (FIN_SAL_AUTODETECT_TOLERANCE * 100) + '%:\n\n  1. Forecast Net (B24)\n  2. Lean baseline (Contract Base + WFH - tax)\n  3. March 2026 historical (123,851)');
  } catch(e) {
    Logger.log('Salary handler install failed: ' + e);
    if (!silent) _alertS('⚠️ Salary handler install failed.\n\n' + e + '\n\nMay be a quota issue. Try again later or check Triggers UI.');
  }
}

function diagnoseSalaryHandler() {
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_salaryOnEdit');
  const ss = SpreadsheetApp.getActive();
  const sal = ss.getSheetByName(FIN_SAL_TAB);
  const tx = ss.getSheetByName(FIN_SAL_TXN_TAB);

  let report = '🤖 SALARY AUTO-DETECT DIAGNOSTIC v1.6\n\n';
  report += 'Triggers installed: ' + triggers.length + '\n';
  report += (triggers.length === 1 ? '✅' : '⚠️') + ' (expected exactly 1)\n\n';
  report += '💼 Salary tab: ' + (sal ? '✅ found' : '❌ NOT FOUND') + '\n';
  report += '💸 Transactions tab: ' + (tx ? '✅ found' : '❌ NOT FOUND') + '\n';

  if (sal) {
    const R = FIN_SAL_ROW;
    const tol = FIN_SAL_AUTODETECT_TOLERANCE;
    const forecastNet = sal.getRange('B' + R.net).getValue() || 0;
    const contractBase = sal.getRange('B' + R.contractBase).getValue() || 0;
    const wfh = sal.getRange('B' + R.wfh).getValue() || 0;
    const baseSum = contractBase + wfh;
    const leanNet = baseSum - baseSum * 0.0275;
    const marchNet = FIN_SAL_MARCH_2026.net;

    report += '\n🎯 ANCHOR MATCH RANGES (±' + (tol * 100) + '%):\n';
    if (forecastNet > 0) {
      report += '  1. Forecast Net:     ' + Math.round(forecastNet * (1-tol)).toLocaleString() + ' – ' + Math.round(forecastNet * (1+tol)).toLocaleString() + ' (anchor ' + Math.round(forecastNet).toLocaleString() + ')\n';
    } else {
      report += '  1. Forecast Net:     ⚠️ B24 is 0/empty\n';
    }
    if (leanNet > 0) {
      report += '  2. Lean baseline:    ' + Math.round(leanNet * (1-tol)).toLocaleString() + ' – ' + Math.round(leanNet * (1+tol)).toLocaleString() + ' (anchor ' + Math.round(leanNet).toLocaleString() + ')\n';
    }
    report += '  3. March historical: ' + Math.round(marchNet * (1-tol)).toLocaleString() + ' – ' + Math.round(marchNet * (1+tol)).toLocaleString() + ' (anchor ' + marchNet.toLocaleString() + ')\n';
  }

  if (triggers.length === 0) report += '\n🚨 FIX: Menu → 🎛️ Sovereign → 💼 Salary → 🔧 Re-install Auto-Detect Handler';
  else if (triggers.length > 1) report += '\n⚠️ Run Re-install to clean up duplicates.';
  else report += '\n✅ Auto-detect operational. Match if amount falls in ANY of the 3 ranges above.';
  _alertS(report);
}

// ══════════════════════════════════════════════════════════
// ONE-CLICK LOG SALARY FROM FORECAST (UNCHANGED from v1.5)
// ══════════════════════════════════════════════════════════

function logSalaryFromForecast() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sal = ss.getSheetByName(FIN_SAL_TAB);
  if (!sal) { _alertS('❌ Salary tab not found.'); return; }

  const net = sal.getRange('B' + FIN_SAL_ROW.net).getValue();
  if (typeof net !== 'number' || net <= 0) {
    _alertS('⚠️ Forecast Net (B' + FIN_SAL_ROW.net + ') is not a valid number.\n\nFill in the forecast cells first.');
    return;
  }

  const tx = ss.getSheetByName(FIN_SAL_TXN_TAB);
  if (!tx) { _alertS('❌ ' + FIN_SAL_TXN_TAB + ' tab not found.'); return; }

  const ui = SpreadsheetApp.getUi();
  const monthLabel = Utilities.formatDate(new Date(), FIN_SAL_TZ, 'MMM yyyy');
  const confirm = ui.alert('💰 Log Salary from Forecast',
    'Create a salary income transaction with these details?\n\n' +
    'Account: ' + FIN_SAL_LANDS_IN + '\n' +
    'Type: Income\n' +
    'Category: 💰 Salary\n' +
    'Amount: ' + net.toLocaleString() + ' PKR\n' +
    'Notes: Salary · ' + monthLabel + ' · auto-logged from forecast\n\n' +
    'Proceed?', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  let nextRow = 9;
  for (let r = 9; r <= 208; r++) {
    if (!tx.getRange(r, 1).getValue()) { nextRow = r; break; }
  }

  const today = new Date();
  let txnId;
  if (typeof generateTxnId === 'function') {
    txnId = generateTxnId();
  } else {
    const stamp = Utilities.formatDate(today, FIN_SAL_TZ, 'yyyyMMdd-HHmmss');
    txnId = 'TXN-' + stamp + '-SAL';
  }

  tx.getRange(nextRow, 1).setValue(today).setNumberFormat('dd MMM yyyy');
  tx.getRange(nextRow, 2).setValue(FIN_SAL_LANDS_IN);
  tx.getRange(nextRow, 3).setValue('Income');
  tx.getRange(nextRow, 4).setValue('💰 Salary');
  tx.getRange(nextRow, 5).setValue(net).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 6).setValue('PKR');
  tx.getRange(nextRow, 7).setValue(net).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 8).setValue('Salary');
  try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(nextRow, 9, 1, 4).merge()
    .setValue('Salary · ' + monthLabel + ' · auto-logged from forecast');
  tx.getRange(nextRow, 14).setValue(txnId);

  if (typeof logAuditAction === 'function') {
    logAuditAction('SALARY_LOGGED', txnId + ' · ' + net.toLocaleString() + ' PKR · ' + monthLabel + ' · from forecast');
  }
  _alertS('✅ Salary logged.\n\n' +
          'Row ' + nextRow + ' in ' + FIN_SAL_TXN_TAB + '\n' +
          'Amount: ' + net.toLocaleString() + ' PKR\n' +
          'TxnID: ' + txnId);
}

// ══════════════════════════════════════════════════════════
// VERIFY (extended for v1.6)
// ══════════════════════════════════════════════════════════

function verifySalaryTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(FIN_SAL_TAB);
  let report = '🔍 💼 SALARY TRACKER v1.6 INTEGRITY\n\n';
  report += (s ? '✅' : '❌') + ' Tab present\n';

  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_salaryOnEdit');
  const handlerOk = triggers.length === 1;
  report += (handlerOk ? '✅' : '⚠️') + ' Auto-detect handler: ' + triggers.length + '/1 installed\n';

  if (s) {
    const R = FIN_SAL_ROW;
    const v = (cell) => s.getRange(cell).getValue() || 0;

    const basic = v('B' + R.basic);
    const hra = v('B' + R.hra);
    const med = v('B' + R.medical);
    const util = v('B' + R.utility);
    const contractBase = v('B' + R.contractBase);
    const wfh = v('B' + R.wfh);
    const otTotal = v('D' + R.ot);
    const variable = v('B' + R.variable);
    const totalGross = v('B' + R.totalGross);
    const tax = v('B' + R.tax);
    const net = v('B' + R.net);

    const expectedBase = basic + hra + med + util;
    const baseOk = (Math.abs(contractBase - expectedBase) < 1);
    const expectedGross = contractBase + variable;
    const grossOk = (Math.abs(totalGross - expectedGross) < 1);
    const expectedNet = totalGross + tax;
    const netOk = (Math.abs(net - expectedNet) < 1);

    report += '\n📊 LIVE FORECAST:\n';
    report += '  Contract Base (B' + R.contractBase + '): ' + contractBase.toLocaleString() + (baseOk ? ' ✅' : ' ❌') + '\n';
    report += '  Variable (B' + R.variable + '): ' + variable.toLocaleString() + '\n';
    report += '  Total Gross (B' + R.totalGross + '): ' + totalGross.toLocaleString() + (grossOk ? ' ✅' : ' ❌') + '\n';
    report += '  Tax (B' + R.tax + '): ' + tax.toLocaleString() + '\n';
    report += '  NET (B' + R.net + '): ' + net.toLocaleString() + ' PKR ' + (netOk ? '✅' : '❌') + '\n';

    // v1.6: anchor ranges
    const tol = FIN_SAL_AUTODETECT_TOLERANCE;
    const baseSum = contractBase + wfh;
    const leanNet = baseSum - baseSum * 0.0275;
    report += '\n🎯 ANCHOR MATCH RANGES (±' + (tol * 100) + '%):\n';
    if (net > 0) report += '  1. Forecast Net:     ' + Math.round(net * (1-tol)).toLocaleString() + ' – ' + Math.round(net * (1+tol)).toLocaleString() + '\n';
    if (leanNet > 0) report += '  2. Lean baseline:    ' + Math.round(leanNet * (1-tol)).toLocaleString() + ' – ' + Math.round(leanNet * (1+tol)).toLocaleString() + '\n';
    report += '  3. March historical: ' + Math.round(FIN_SAL_MARCH_2026.net * (1-tol)).toLocaleString() + ' – ' + Math.round(FIN_SAL_MARCH_2026.net * (1+tol)).toLocaleString() + '\n';
  }
  _alertS(report);
}

// ══════════════════════════════════════════════════════════
// MENU (UNCHANGED from v1.5)
// ══════════════════════════════════════════════════════════

function appendSalaryMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('💼 Salary')
      .addItem('🔄 Refresh (preserves edits)', 'refreshSalaryTab')
      .addItem('🔄 Rebuild from defaults', 'buildSalaryTabUI')
      .addSeparator()
      .addItem('💰 Log Salary from Forecast', 'logSalaryFromForecast')
      .addSeparator()
      .addItem('🔧 Re-install Auto-Detect Handler', 'installSalaryEditHandler')
      .addItem('🤖 Diagnose Auto-Detect', 'diagnoseSalaryHandler')
      .addSeparator()
      .addItem('🔍 Verify + Show Live Values', 'verifySalaryTab')
      .addToUi();
  } catch(e) { Logger.log('Salary menu add failed: ' + e); }
}
