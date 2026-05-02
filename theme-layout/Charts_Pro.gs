// ════════════════════════════════════════════════════════════════════
// 📊 Charts_Pro.gs — UNIFIED DASHBOARD v1.1 · THEME-AWARE
// LOCKED · 7-Layer Audit · Self-Contained
//
// CHANGES FROM v1.0 (2026-04-28 Session 1):
//   - _questDayC fallback now timezone-safe (PKT calendar dates instead of
//     local server timezone). Only matters if Code.gs missing.
//   - Finance data sources REPOINTED from legacy '💰 Finance!G66:G115'
//     (which contained debt summary, not transactions) to '💸 Transactions'
//     ledger from Finance_Pro v2.0. Affects:
//       * buildChartsDataArea Income/Expense (rows 121-122)
//       * buildChartsDataArea Category breakdown (rows 131-142)
//       * buildOverallScoreCards SPENT card + NET card
//       * buildFinanceZone account balance bars (7 accounts)
//     Schema mapping: A=Date · B=Account · C=Type · D=Category · G=PKR Equiv
//   - All other behavior preserved.
//
// READS FROM: 📋 Habits, 🕌 Salah, 💸 Transactions tabs
// WRITES TO:  📊 Charts tab (creates if missing)
// ════════════════════════════════════════════════════════════════════

const CHARTSPRO_SHEET_NAME = '📊 Charts';
const CHARTSPRO_HABITS_TAB = '📋 Habits';
const CHARTSPRO_SALAH_TAB  = '🕌 Salah';
const CHARTSPRO_FINANCE_TAB = '💸 Transactions';
const CHARTSPRO_QUEST_START = '2026-04-25';

const CHARTSPRO_ACCOUNTS = ['Alfalah CC', 'Cash', 'JazzCash', 'Easypaisa', 'UBL', 'Meezan', 'Mashreq Bank'];
const CHARTSPRO_CATEGORIES = [
  '🍔 Food', '🚗 Transport', '🏠 Bills', '💊 Health', '📚 Learning',
  '👕 Personal', '🎁 Sadqah/Zakat', '💝 Family', '📱 Tech', '🎯 Other',
  '🏘️ Rent', '🌐 Internet', '📞 Mobile Plan'
];

function getChartsTheme() {
  if (typeof getTheme === 'function') return getTheme();
  return {
    bgPanel: '#0F172A', bgRow: '#1E293B', bgHeader: '#334155', bgSection: '#854D0E',
    accent: '#FBBF24', textBright: '#F1F5F9', textMuted: '#CBD5E1', textDim: '#94A3B8',
    textGhost: '#64748B', success: '#16A34A', warning: '#CA8A04', danger: '#DC2626',
    critical: '#7F1D1D', info: '#2563EB', purple: '#7C3AED', orange: '#D97706'
  };
}

function _alertC(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
}

function _questDayC() {
  if (typeof getQuestDay === 'function') return getQuestDay();
  // Timezone-safe fallback: compute days using PKT calendar dates
  const tz = 'Asia/Karachi';
  const todayPKT = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const tParts = todayPKT.split('-').map(Number);
  const sParts = CHARTSPRO_QUEST_START.split('-').map(Number);
  const tDate = new Date(Date.UTC(tParts[0], tParts[1] - 1, tParts[2]));
  const sDate = new Date(Date.UTC(sParts[0], sParts[1] - 1, sParts[2]));
  return Math.max(1, Math.floor((tDate - sDate) / 86400000) + 1);
}

// ──────────────────────────────────────────────────────────
// MAIN ENTRY
// ──────────────────────────────────────────────────────────

function rebuildChartsCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(CHARTSPRO_SHEET_NAME);
  if (!s) s = ss.insertSheet(CHARTSPRO_SHEET_NAME);

  const T = getChartsTheme();

  // Remove existing charts FIRST (avoid duplicates on rebuild)
  s.getCharts().forEach(c => s.removeChart(c));

  s.clear();
  s.clearConditionalFormatRules();
  s.clearNotes();
  s.getRange(1, 1, 200, 12).clearDataValidations();
  s.showRows(1, s.getMaxRows());
  s.getRange(1, 1, 200, 12).setBackground(T.bgPanel);

  for (let c = 1; c <= 12; c++) s.setColumnWidth(c, 95);

  buildChartsDataArea(s);  // hidden formulas FIRST so charts have data
  buildChartsChrome(s, T);
  buildOverallScoreCards(s, T);
  buildHabitsZone(s, T);
  buildSalahZone(s, T);
  buildFinanceZone(s, T);

  // Hide data rows 100-200
  try { s.hideRows(100, 100); } catch(e) { Logger.log('Hide rows skipped: ' + e); }

  s.setFrozenRows(3);
  appendChartsMenu();

  const themeName = (typeof getActiveThemeName === 'function') ? getActiveThemeName() : 'fallback';
  _alertC('✅ Charts cockpit v1.1 built.\n\nTheme: ' + themeName + '\n\n' +
          '5 native charts + formula visualizations.\nAll read live from Habits, Salah, 💸 Transactions tabs.');
}

// ──────────────────────────────────────────────────────────
// HIDDEN DATA AREA (rows 100-200) — feeds the native charts
// ──────────────────────────────────────────────────────────

function buildChartsDataArea(s) {
  // Rows 100-107: Habits 7-day trend
  s.getRange('A100').setValue('Day');
  s.getRange('B100').setValue('Completed');
  for (let i = 0; i < 7; i++) {
    const r = 101 + i;
    const offset = 6 - i;
    s.getRange(r, 1).setFormula('=TODAY()-' + offset).setNumberFormat('dd MMM');
    s.getRange(r, 2).setFormula(
      '=IFERROR(IF(MONTH(TODAY()-' + offset + ')=MONTH(TODAY()),' +
      'COUNTIF(INDEX(\'' + CHARTSPRO_HABITS_TAB + '\'!C7:AG22,0,DAY(TODAY()-' + offset + ')),1),0),0)'
    );
  }

  // Rows 110-114: Salah location distribution
  s.getRange('A110').setValue('Location');
  s.getRange('B110').setValue('Count');
  const locs = [
    { name: 'Masjid',  short: 'M', full: 'Masjid' },
    { name: 'Jamaat',  short: 'J', full: 'Jamaat' },
    { name: 'Home',    short: 'H', full: 'Home'   },
    { name: 'Work',    short: 'W', full: 'Work'   },
    { name: 'Qaza',    short: 'Q', full: 'Qaza'   }
  ];
  for (let i = 0; i < locs.length; i++) {
    const r = 111 + i;
    s.getRange(r, 1).setValue(locs[i].name);
    s.getRange(r, 2).setFormula(
      '=IFERROR(COUNTIF(\'' + CHARTSPRO_SALAH_TAB + '\'!C6:H36,"' + locs[i].short + '")+' +
      'COUNTIF(\'' + CHARTSPRO_SALAH_TAB + '\'!C6:H36,"' + locs[i].full + '"),0)'
    );
  }

  // Rows 120-122: Income vs Expense MTD (REPOINTED to 💸 Transactions)
  s.getRange('A120').setValue('Type');
  s.getRange('B120').setValue('Amount (PKR)');
  s.getRange('A121').setValue('Income');
  s.getRange('B121').setFormula(
    '=IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),\'' + CHARTSPRO_FINANCE_TAB + '\'!A:A,"<="&EOMONTH(TODAY(),0),\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Income"),0)'
  );
  s.getRange('A122').setValue('Expense');
  s.getRange('B122').setFormula(
    '=IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),\'' + CHARTSPRO_FINANCE_TAB + '\'!A:A,"<="&EOMONTH(TODAY(),0),\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Expense"),0)'
  );

  // Rows 130-142: Spending by category MTD (REPOINTED to 💸 Transactions)
  s.getRange('A130').setValue('Category');
  s.getRange('B130').setValue('Spent (PKR)');
  for (let i = 0; i < CHARTSPRO_CATEGORIES.length; i++) {
    const r = 131 + i;
    s.getRange(r, 1).setValue(CHARTSPRO_CATEGORIES[i]);
    s.getRange(r, 2).setFormula(
      '=IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),\'' + CHARTSPRO_FINANCE_TAB + '\'!A:A,"<="&EOMONTH(TODAY(),0),\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Expense",\'' + CHARTSPRO_FINANCE_TAB + '\'!D:D,"' + CHARTSPRO_CATEGORIES[i] + '"),0)'
    );
  }

  // Rows 150-181: Salah 30-day score trend (UNCHANGED)
  s.getRange('A150').setValue('Date');
  s.getRange('B150').setValue('Score');
  for (let i = 0; i < 31; i++) {
    const r = 151 + i;
    const day = i + 1;
    s.getRange(r, 1).setFormula('=IFERROR(DATE(YEAR(TODAY()),MONTH(TODAY()),' + day + '),"")').setNumberFormat('dd MMM');
    s.getRange(r, 2).setFormula('=IFERROR(\'' + CHARTSPRO_SALAH_TAB + '\'!L' + (5 + day) + ',0)');
  }
}

// ──────────────────────────────────────────────────────────
// CHROME (rows 1-3)
// ──────────────────────────────────────────────────────────

function buildChartsChrome(s, T) {
  s.getRange('A1:L1').merge()
    .setValue('📊 CHARTS COCKPIT — unified visual dashboard · Day ' + _questDayC() + ' of 90')
    .setBackground(T.bgPanel).setFontColor(T.accent).setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);

  s.getRange('A2:L2').merge()
    .setValue('💡 Live data from Habits + Salah + 💸 Transactions · Updates instantly · Theme: ' +
              ((typeof getActiveThemeName === 'function') ? getActiveThemeName() : 'default'))
    .setBackground(T.bgRow).setFontColor(T.textMuted).setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(2, 24);

  s.setRowHeight(3, 8);
}

// ──────────────────────────────────────────────────────────
// OVERALL SCORE CARDS (rows 4-6)
// ──────────────────────────────────────────────────────────

function buildOverallScoreCards(s, T) {
  s.getRange('A4:L4').merge()
    .setValue('🎯 TODAY\'S OVERALL SCORE — at-a-glance vitals')
    .setBackground(T.bgSection).setFontColor(T.accent).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(4, 28);

  // Card 1: Habits %
  s.getRange('A5:C5').merge()
    .setFormula('="📋 HABITS"&CHAR(10)&TEXT(IFERROR(COUNTIF(INDEX(\'' + CHARTSPRO_HABITS_TAB + '\'!C7:AG22,0,DAY(TODAY())),1)/16,0),"0%")')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  // Card 2: Salah Score
  s.getRange('D5:F5').merge()
    .setFormula('="🕌 SALAH"&CHAR(10)&TEXT(IFERROR(VLOOKUP(TODAY(),\'' + CHARTSPRO_SALAH_TAB + '\'!A6:L36,12,FALSE),0),"0.0")&" pts"')
    .setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  // Card 3: Today's Spending (REPOINTED to 💸 Transactions)
  s.getRange('G5:I5').merge()
    .setFormula('="💸 SPENT"&CHAR(10)&TEXT(IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!A:A,TODAY(),\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Expense"),0),"#,##0")&" PKR"')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  // Card 4: Today's Net (Income - Expense) (REPOINTED to 💸 Transactions)
  s.getRange('J5:L5').merge()
    .setFormula('="💰 NET"&CHAR(10)&TEXT(IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!A:A,TODAY(),\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Income"),0)-IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!A:A,TODAY(),\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Expense"),0),"+#,##0;-#,##0")&" PKR"')
    .setBackground(T.warning).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  s.setRowHeight(5, 60);
  s.setRowHeight(6, 8);
}

// ──────────────────────────────────────────────────────────
// HABITS ZONE (rows 7-30) — UNCHANGED
// ──────────────────────────────────────────────────────────

function buildHabitsZone(s, T) {
  s.getRange('A7:L7').merge()
    .setValue('📋 HABITS — 7-day completion trend + top 3 / bottom 3 this month')
    .setBackground(T.bgSection).setFontColor(T.accent).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(7, 28);

  // Native LINE chart for 7-day trend (anchors row 8)
  const trendChart = s.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(s.getRange('A100:B107'))
    .setPosition(8, 1, 0, 0)
    .setOption('title', 'Habits Completed — Last 7 Days (out of 16)')
    .setOption('width', 850)
    .setOption('height', 280)
    .setOption('backgroundColor', T.bgRow)
    .setOption('titleTextStyle', {color: T.accent, fontSize: 14, bold: true})
    .setOption('legend', {position: 'none'})
    .setOption('hAxis', {textStyle: {color: T.textMuted}, format: 'MMM dd'})
    .setOption('vAxis', {textStyle: {color: T.textMuted}, viewWindow: {min: 0, max: 16}})
    .setOption('colors', [T.success])
    .setOption('lineWidth', 3)
    .setOption('pointSize', 8)
    .build();
  s.insertChart(trendChart);

  for (let r = 8; r <= 22; r++) s.setRowHeight(r, 22);

  // Top 3 / Bottom 3 habits MTD (rows 23-26)
  s.getRange('A23:F23').merge()
    .setValue('🏆 STRONGEST (top 3 MTD)')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.getRange('G23:L23').merge()
    .setValue('⚠️ WEAKEST (bottom 3 MTD)')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(23, 24);

  for (let i = 0; i < 3; i++) {
    const r = 24 + i;
    const rank = i + 1;

    // LEFT side — Top N
    s.getRange(r, 1, 1, 3).merge()
      .setFormula('=IFERROR(INDEX(\'' + CHARTSPRO_HABITS_TAB + '\'!A7:A22, MATCH(LARGE(\'' + CHARTSPRO_HABITS_TAB + '\'!AH7:AH22,' + rank + '),\'' + CHARTSPRO_HABITS_TAB + '\'!AH7:AH22,0)),"—")')
      .setBackground(T.bgRow).setFontColor(T.textBright).setFontSize(10).setFontWeight('bold')
      .setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.getRange(r, 4).setFormula('=IFERROR(LARGE(\'' + CHARTSPRO_HABITS_TAB + '\'!AH7:AH22,' + rank + ')&"/"&DAY(TODAY()),"—")')
      .setBackground(T.bgRow).setFontColor(T.accent).setFontSize(10).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 5, 1, 2).merge()
      .setFormula('=IFERROR(REPT("█",ROUND(LARGE(\'' + CHARTSPRO_HABITS_TAB + '\'!AH7:AH22,' + rank + ')/DAY(TODAY())*10,0))&REPT("░",10-ROUND(LARGE(\'' + CHARTSPRO_HABITS_TAB + '\'!AH7:AH22,' + rank + ')/DAY(TODAY())*10,0)),"")')
      .setBackground(T.bgRow).setFontColor(T.success).setFontFamily('Courier New').setFontSize(10)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');

    // RIGHT side — Bottom N
    s.getRange(r, 7, 1, 3).merge()
      .setFormula('=IFERROR(INDEX(\'' + CHARTSPRO_HABITS_TAB + '\'!A7:A22, MATCH(SMALL(\'' + CHARTSPRO_HABITS_TAB + '\'!AH7:AH22,' + rank + '),\'' + CHARTSPRO_HABITS_TAB + '\'!AH7:AH22,0)),"—")')
      .setBackground(T.bgRow).setFontColor(T.textBright).setFontSize(10).setFontWeight('bold')
      .setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.getRange(r, 10).setFormula('=IFERROR(SMALL(\'' + CHARTSPRO_HABITS_TAB + '\'!AH7:AH22,' + rank + ')&"/"&DAY(TODAY()),"—")')
      .setBackground(T.bgRow).setFontColor(T.accent).setFontSize(10).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 11, 1, 2).merge()
      .setFormula('=IFERROR(REPT("█",ROUND(SMALL(\'' + CHARTSPRO_HABITS_TAB + '\'!AH7:AH22,' + rank + ')/DAY(TODAY())*10,0))&REPT("░",10-ROUND(SMALL(\'' + CHARTSPRO_HABITS_TAB + '\'!AH7:AH22,' + rank + ')/DAY(TODAY())*10,0)),"")')
      .setBackground(T.bgRow).setFontColor(T.danger).setFontFamily('Courier New').setFontSize(10)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');

    s.setRowHeight(r, 24);
  }

  for (let r = 27; r <= 30; r++) s.setRowHeight(r, 8);
}

// ──────────────────────────────────────────────────────────
// SALAH ZONE (rows 31-58) — UNCHANGED
// ──────────────────────────────────────────────────────────

function buildSalahZone(s, T) {
  s.getRange('A31:L31').merge()
    .setValue('🕌 SALAH — 30-day score trend + location distribution')
    .setBackground(T.bgSection).setFontColor(T.accent).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(31, 28);

  // 30-day score LINE chart (anchors row 32)
  const scoreChart = s.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(s.getRange('A150:B181'))
    .setPosition(32, 1, 0, 0)
    .setOption('title', 'Salah Daily Score — Current Month')
    .setOption('width', 850)
    .setOption('height', 280)
    .setOption('backgroundColor', T.bgRow)
    .setOption('titleTextStyle', {color: T.accent, fontSize: 14, bold: true})
    .setOption('legend', {position: 'none'})
    .setOption('hAxis', {textStyle: {color: T.textMuted}, format: 'MMM dd'})
    .setOption('vAxis', {textStyle: {color: T.textMuted}})
    .setOption('colors', [T.info])
    .setOption('lineWidth', 3)
    .setOption('pointSize', 6)
    .build();
  s.insertChart(scoreChart);

  for (let r = 32; r <= 46; r++) s.setRowHeight(r, 24);

  // Location PIE chart (anchors row 47)
  const pieChart = s.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(s.getRange('A110:B114'))
    .setPosition(48, 1, 0, 0)
    .setOption('title', 'Salah Locations — All Logged This Month')
    .setOption('width', 850)
    .setOption('height', 280)
    .setOption('backgroundColor', T.bgRow)
    .setOption('titleTextStyle', {color: T.accent, fontSize: 14, bold: true})
    .setOption('legend', {position: 'right', textStyle: {color: T.textMuted}})
    .setOption('pieSliceTextStyle', {color: '#FFFFFF', fontSize: 11, bold: true})
    .setOption('colors', [T.success, T.info, T.purple, T.orange, T.danger])
    .setOption('pieHole', 0.3)
    .build();
  s.insertChart(pieChart);

  for (let r = 47; r <= 58; r++) s.setRowHeight(r, 26);
  s.setRowHeight(58, 8);
}

// ──────────────────────────────────────────────────────────
// FINANCE ZONE (rows 59-93) — REPOINTED to 💸 Transactions
// ──────────────────────────────────────────────────────────

function buildFinanceZone(s, T) {
  s.getRange('A59:L59').merge()
    .setValue('💰 FINANCE — income vs expense, category breakdown, account balances')
    .setBackground(T.bgSection).setFontColor(T.accent).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(59, 28);

  // Income vs Expense COLUMN chart
  const ieChart = s.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(s.getRange('A120:B122'))
    .setPosition(60, 1, 0, 0)
    .setOption('title', 'Income vs Expense — Month to Date')
    .setOption('width', 850)
    .setOption('height', 280)
    .setOption('backgroundColor', T.bgRow)
    .setOption('titleTextStyle', {color: T.accent, fontSize: 14, bold: true})
    .setOption('legend', {position: 'none'})
    .setOption('hAxis', {textStyle: {color: T.textMuted}})
    .setOption('vAxis', {textStyle: {color: T.textMuted}, format: '#,##0'})
    .setOption('colors', [T.success])
    .build();
  s.insertChart(ieChart);

  for (let r = 60; r <= 72; r++) s.setRowHeight(r, 24);

  // Category PIE chart
  const catPie = s.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(s.getRange('A130:B142'))
    .setPosition(74, 1, 0, 0)
    .setOption('title', 'Spending by Category — Month to Date')
    .setOption('width', 850)
    .setOption('height', 320)
    .setOption('backgroundColor', T.bgRow)
    .setOption('titleTextStyle', {color: T.accent, fontSize: 14, bold: true})
    .setOption('legend', {position: 'right', textStyle: {color: T.textMuted}})
    .setOption('pieSliceTextStyle', {color: '#FFFFFF', fontSize: 10, bold: true})
    .setOption('pieHole', 0.3)
    .build();
  s.insertChart(catPie);

  for (let r = 73; r <= 85; r++) s.setRowHeight(r, 26);

  // Account balance bars (rows 86-93) — REPOINTED to 💸 Transactions
  s.getRange('A86:L86').merge()
    .setValue('🏦 ACCOUNT BALANCES — live from 💸 Transactions ledger')
    .setBackground(T.bgHeader).setFontColor(T.accent).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center');
  s.setRowHeight(86, 24);

  for (let i = 0; i < CHARTSPRO_ACCOUNTS.length; i++) {
    const r = 87 + i;
    const acc = CHARTSPRO_ACCOUNTS[i];

    s.getRange(r, 1, 1, 3).merge().setValue(acc)
      .setBackground(T.bgRow).setFontColor(T.textBright).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');

    const balExpr =
      'IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!B:B,"' + acc + '",\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Income"),0)+' +
      'IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!B:B,"' + acc + '",\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Debt In"),0)-' +
      'IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!B:B,"' + acc + '",\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Expense"),0)-' +
      'IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!B:B,"' + acc + '",\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Debt Out"),0)-' +
      'IFERROR(SUMIFS(\'' + CHARTSPRO_FINANCE_TAB + '\'!G:G,\'' + CHARTSPRO_FINANCE_TAB + '\'!B:B,"' + acc + '",\'' + CHARTSPRO_FINANCE_TAB + '\'!C:C,"Transfer"),0)';

    s.getRange(r, 4, 1, 2).merge()
      .setFormula('=TEXT(' + balExpr + ',"#,##0")&" PKR"')
      .setBackground(T.bgRow).setFontColor(T.accent).setFontSize(10).setFontWeight('bold')
      .setHorizontalAlignment('right').setVerticalAlignment('middle');

    s.getRange(r, 6, 1, 7).merge()
      .setFormula('=LET(bal,' + balExpr + ',pct,MIN(ABS(bal)/200000,1),REPT("█",ROUND(pct*30,0))&REPT("░",30-ROUND(pct*30,0)))')
      .setBackground(T.bgRow).setFontColor(T.accent).setFontFamily('Courier New').setFontSize(10)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');

    s.setRowHeight(r, 24);
  }
}

// ══════════════════════════════════════════════════════════
// VERIFY + MENU
// ══════════════════════════════════════════════════════════

function verifyChartsCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(CHARTSPRO_SHEET_NAME);
  if (!s) { _alertC('❌ Charts tab missing.'); return; }

  const checks = [
    { row: 1,  col: 1, label: 'Title',         test: v => v.toString().indexOf('CHARTS COCKPIT') !== -1 },
    { row: 4,  col: 1, label: 'Score header',  test: v => v.toString().indexOf('OVERALL SCORE') !== -1 },
    { row: 7,  col: 1, label: 'Habits zone',   test: v => v.toString().indexOf('HABITS') !== -1 },
    { row: 31, col: 1, label: 'Salah zone',    test: v => v.toString().indexOf('SALAH') !== -1 },
    { row: 59, col: 1, label: 'Finance zone',  test: v => v.toString().indexOf('FINANCE') !== -1 },
    { row: 86, col: 1, label: 'Account bars',  test: v => v.toString().indexOf('ACCOUNT') !== -1 }
  ];

  let report = '🔍 CHARTS COCKPIT v1.1 INTEGRITY\n\n';
  let allOk = true;
  checks.forEach(c => {
    const ok = c.test(s.getRange(c.row, c.col).getValue());
    report += (ok ? '✅' : '❌') + ' ' + c.label + '\n';
    if (!ok) allOk = false;
  });

  const chartCount = s.getCharts().length;
  report += '✓ Native charts: ' + chartCount + ' (expected 5)\n';

  // Verify 💸 Transactions tab exists (Charts depends on it for Finance zone)
  const txTab = ss.getSheetByName(CHARTSPRO_FINANCE_TAB);
  report += (txTab ? '✓' : '⚠️') + ' ' + CHARTSPRO_FINANCE_TAB + ' tab ' + (txTab ? 'exists' : 'MISSING — Finance charts will show zeros') + '\n';

  const themeName = (typeof getActiveThemeName === 'function') ? getActiveThemeName() : 'fallback';
  report += '✓ Active theme: ' + themeName + '\n';

  if (!allOk) report += '\n⚠️ Run rebuildChartsCockpit() to fix.';
  else report += '\n✅ All systems operational.';
  _alertC(report);
}

function appendChartsMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📊 Charts')
      .addItem('🔄 Rebuild Cockpit', 'rebuildChartsCockpit')
      .addSeparator()
      .addItem('🔍 Verify Cockpit', 'verifyChartsCockpit')
      .addToUi();
  } catch (e) { Logger.log('Charts menu failed: ' + e); }
}
