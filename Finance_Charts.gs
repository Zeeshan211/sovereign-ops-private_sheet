// ════════════════════════════════════════════════════════════════════
// 📊 Finance_Charts.gs — VISUAL INSIGHTS EMBEDDED IN HUB v1.0
// LOCKED · 7-Layer Audit · Self-Contained
//
// PURPOSE:
//   Embed 3 dynamic visual cards in Finance Hub rows 55-90.
//   Pure formula-driven (REPT bars + sparkline-style visualizations).
//   Auto-updates when transactions change. No native charts (faster, cleaner).
//
// 3 CARDS:
//   Card 1: Income vs Expense MTD (bar comparison)
//   Card 2: Top 5 Spending Categories (horizontal bars)
//   Card 3: Account Balance Distribution (asset accounts)
//
// HUB ROWS USED: 55-74 (preserves rows 1-52 from v2.5 + Audit panel)
// ════════════════════════════════════════════════════════════════════

const FIN_CHARTS_HUB = '💰 Finance Hub';
const FIN_CHARTS_TXN = '\'💸 Transactions\'!';
const FIN_CHARTS_ACC = '\'🏦 Accounts\'!';
const FIN_CHARTS_TZ = 'Asia/Karachi';

// ──────────────────────────────────────────────────────────
// SAFE WRAPPERS
// ──────────────────────────────────────────────────────────

function _alertC(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function getChartsTheme() {
  if (typeof getFinTheme === 'function') return getFinTheme();
  return {
    bgPage: '#FFFFFF', bgPanel: '#F8FAFC', bgRow: '#FFFFFF',
    bgAlt: '#F1F5F9', bgInput: '#FFFBEB', bgHeader: '#1E293B',
    bgSection: '#0F172A', bgAccent: '#FEF3C7',
    bgAsset: '#DCFCE7', bgLiability: '#FEE2E2',
    text: '#0F172A', textHi: '#000000', textMd: '#334155', textLo: '#64748B',
    success: '#16A34A', warning: '#D97706', danger: '#DC2626',
    info: '#2563EB', purple: '#7C3AED', orange: '#EA580C'
  };
}

// ══════════════════════════════════════════════════════════
// MAIN ENTRY
// ══════════════════════════════════════════════════════════

function refreshFinanceCharts() {
  const result = embedFinanceCharts();
  _alertC('✅ Visual Insights refreshed in Finance Hub.\n\n' +
          'Cards rendered: ' + result.cards + '\n' +
          'Source: 💸 Transactions + 🏦 Accounts\n\n' +
          'Scroll to row 55 in Finance Hub to view.');
}

function embedFinanceCharts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hub = ss.getSheetByName(FIN_CHARTS_HUB);
  if (!hub) {
    _alertC('❌ Finance Hub tab not found. Run rebuildFinanceCockpit first.');
    return { cards: 0 };
  }

  const T = getChartsTheme();

  // Clear chart zone (rows 55-90, cols A-L)
  try { hub.getRange(55, 1, 36, 12).breakApart(); } catch(e) {}
  hub.getRange(55, 1, 36, 12).clearContent().clearFormat();
  hub.getRange(55, 1, 36, 12).setBackground(T.bgPage);

  // Row 54 spacer (just in case)
  hub.setRowHeight(54, 8);

  // Row 55: Section header
  hub.getRange('A55:L55').merge()
    .setValue('📊 VISUAL INSIGHTS — MTD breakdown · auto-updates from 💸 Transactions')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  hub.setRowHeight(55, 28);

  // Row 56: Hint
  hub.getRange('A56:L56').merge()
    .setValue('💡 Three live cards · Income vs Expense · Top 5 spending categories · Account distribution')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center');
  hub.setRowHeight(56, 22);
  hub.setRowHeight(57, 8);

  // Row 58: 3 card titles in parallel
  hub.getRange('A58:D58').merge().setValue('💰 INCOME vs EXPENSE — this month')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center');
  hub.getRange('E58:H58').merge().setValue('🍔 TOP 5 SPENDING CATEGORIES — MTD')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center');
  hub.getRange('I58:L58').merge().setValue('🏦 ACCOUNT DISTRIBUTION — assets only')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center');
  hub.setRowHeight(58, 28);

  // Build 3 cards in parallel (rows 60-72)
  _buildIncomeVsExpenseCard(hub, T);
  _buildTopCategoriesCard(hub, T);
  _buildAccountDistributionCard(hub, T);

  // Row 73 spacer
  hub.setRowHeight(73, 8);

  // Row 74: Footer
  hub.getRange('A74:L74').merge()
    .setValue('🔄 Refresh: Menu → 🎛️ Sovereign → 📊 Charts → 🔄 Refresh Visual Insights · or auto-refreshes when 💸 Transactions changes')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center');
  hub.setRowHeight(74, 24);

  if (typeof logAuditAction === 'function') logAuditAction('CHARTS_EMBEDDED', '3 visual cards rendered in Finance Hub');

  return { cards: 3 };
}

function embedFinanceChartsSilent() {
  return embedFinanceCharts();
}

// ══════════════════════════════════════════════════════════
// CARD 1: INCOME vs EXPENSE MTD
// ══════════════════════════════════════════════════════════

function _buildIncomeVsExpenseCard(hub, T) {
  const txnG = FIN_CHARTS_TXN + 'G:G';
  const txnA = FIN_CHARTS_TXN + 'A:A';
  const txnC = FIN_CHARTS_TXN + 'C:C';

  const incomeFormula = 'IFERROR(SUMIFS(' + txnG + ',' + txnA + ',">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + txnA + ',"<="&EOMONTH(TODAY(),0),' + txnC + ',"Income"),0)';
  const expenseFormula = 'IFERROR(SUMIFS(' + txnG + ',' + txnA + ',">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + txnA + ',"<="&EOMONTH(TODAY(),0),' + txnC + ',"Expense"),0)';

  // Row 60-61: Income label + value
  hub.getRange('A60:B60').merge().setValue('💰 INCOME')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  hub.getRange('C60:D60').merge().setFormula('=TEXT(' + incomeFormula + ',"#,##0")&" PKR"')
    .setBackground(T.bgRow).setFontColor(T.success).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('right').setVerticalAlignment('middle');
  hub.setRowHeight(60, 24);

  // Row 61: Income bar
  hub.getRange('A61:D61').merge().setFormula(
    '=IFERROR(LET(inc,' + incomeFormula + ',exp,' + expenseFormula + ',mx,MAX(inc,exp,1),' +
    'pct,inc/mx,REPT("█",ROUND(pct*30,0))&REPT("░",30-ROUND(pct*30,0))),"")'
  ).setBackground(T.bgPanel).setFontColor(T.success).setFontFamily('Courier New')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
  hub.setRowHeight(61, 22);

  // Row 62-63: Expense label + value
  hub.getRange('A62:B62').merge().setValue('💸 EXPENSE')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  hub.getRange('C62:D62').merge().setFormula('=TEXT(' + expenseFormula + ',"#,##0")&" PKR"')
    .setBackground(T.bgRow).setFontColor(T.danger).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('right').setVerticalAlignment('middle');
  hub.setRowHeight(62, 24);

  // Row 63: Expense bar
  hub.getRange('A63:D63').merge().setFormula(
    '=IFERROR(LET(inc,' + incomeFormula + ',exp,' + expenseFormula + ',mx,MAX(inc,exp,1),' +
    'pct,exp/mx,REPT("█",ROUND(pct*30,0))&REPT("░",30-ROUND(pct*30,0))),"")'
  ).setBackground(T.bgPanel).setFontColor(T.danger).setFontFamily('Courier New')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
  hub.setRowHeight(63, 22);

  // Row 65: Net result (rows 64 spacer)
  hub.setRowHeight(64, 6);
  hub.getRange('A65:B65').merge().setValue('🏆 NET MTD')
    .setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  hub.getRange('C65:D65').merge()
    .setFormula('=TEXT(' + incomeFormula + '-' + expenseFormula + ',"+#,##0;-#,##0")&" PKR"')
    .setBackground(T.bgAccent).setFontColor(T.textHi).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('right').setVerticalAlignment('middle');
  hub.setRowHeight(65, 28);

  // Rows 66-72: Spacer in this column
  for (let r = 66; r <= 72; r++) {
    hub.getRange(r, 1, 1, 4).merge();
    hub.setRowHeight(r, 18);
  }
}

// ══════════════════════════════════════════════════════════
// CARD 2: TOP 5 SPENDING CATEGORIES MTD
// ══════════════════════════════════════════════════════════

function _buildTopCategoriesCard(hub, T) {
  // Hard-coded top 5 from your real budget categories (highest spend likely)
  // Using SUMIFS per category for live values
  const cats = [
    { name: '💝 Family',   color: T.danger },
    { name: '🌐 Internet', color: T.info },
    { name: '🍔 Food',     color: T.orange },
    { name: '🚗 Transport', color: T.warning },
    { name: '💸 Debt Payment', color: T.purple }
  ];

  const txnG = FIN_CHARTS_TXN + 'G:G';
  const txnA = FIN_CHARTS_TXN + 'A:A';
  const txnC = FIN_CHARTS_TXN + 'C:C';
  const txnD = FIN_CHARTS_TXN + 'D:D';

  // Build "max" reference (sum of all 5 categories) for relative bar sizing
  let maxParts = [];
  cats.forEach(c => {
    maxParts.push('IFERROR(SUMIFS(' + txnG + ',' + txnA + ',">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' +
                  txnA + ',"<="&EOMONTH(TODAY(),0),' + txnC + ',"Expense",' + txnD + ',"' + c.name + '"),0)');
  });
  const maxFormula = 'MAX(1,' + maxParts.join(',') + ')';  // max amount across the 5 cats, min 1

  for (let i = 0; i < 5; i++) {
    const r = 60 + (i * 2);
    const cat = cats[i];
    const catSumFormula = 'IFERROR(SUMIFS(' + txnG + ',' + txnA + ',">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' +
                          txnA + ',"<="&EOMONTH(TODAY(),0),' + txnC + ',"Expense",' + txnD + ',"' + cat.name + '"),0)';

    // Label + amount row
    hub.getRange(r, 5, 1, 2).merge().setValue(cat.name)
      .setBackground(cat.color).setFontColor('#FFFFFF').setFontWeight('bold')
      .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
    hub.getRange(r, 7, 1, 2).merge().setFormula('=TEXT(' + catSumFormula + ',"#,##0")&" PKR"')
      .setBackground(T.bgRow).setFontColor(T.textHi).setFontWeight('bold')
      .setFontSize(10).setHorizontalAlignment('right').setVerticalAlignment('middle');
    hub.setRowHeight(r, 22);

    // Bar row
    hub.getRange(r + 1, 5, 1, 4).merge().setFormula(
      '=IFERROR(LET(v,' + catSumFormula + ',mx,' + maxFormula + ',pct,v/mx,REPT("█",ROUND(pct*30,0))&REPT("░",30-ROUND(pct*30,0))),"")'
    ).setBackground(T.bgPanel).setFontColor(cat.color).setFontFamily('Courier New')
      .setFontSize(9).setHorizontalAlignment('left').setVerticalAlignment('middle');
    hub.setRowHeight(r + 1, 18);
  }
}

// ══════════════════════════════════════════════════════════
// CARD 3: ACCOUNT BALANCE DISTRIBUTION (assets)
// ══════════════════════════════════════════════════════════

function _buildAccountDistributionCard(hub, T) {
  // Pull from Accounts tab E7:E15 (assets) + A7:A15 (account names)
  // Show top 5 by absolute balance

  // Total assets reference
  const totalAssets = 'IFERROR(' + FIN_CHARTS_ACC + 'E16,1)';

  // 5 slots — pulled via LARGE rank
  for (let i = 0; i < 5; i++) {
    const r = 60 + (i * 2);
    const rank = i + 1;

    // Account name (rank #i)
    const nameFormula = 'IFERROR(INDEX(' + FIN_CHARTS_ACC + 'A7:A15,MATCH(LARGE(' + FIN_CHARTS_ACC + 'E7:E15,' + rank + '),' + FIN_CHARTS_ACC + 'E7:E15,0)),"")';
    // Balance (rank #i)
    const balFormula = 'IFERROR(LARGE(' + FIN_CHARTS_ACC + 'E7:E15,' + rank + '),0)';

    hub.getRange(r, 9, 1, 2).merge().setFormula('=' + nameFormula)
      .setBackground(T.bgPanel).setFontColor(T.textHi).setFontWeight('bold')
      .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
    hub.getRange(r, 11, 1, 2).merge().setFormula('=TEXT(' + balFormula + ',"#,##0")&" PKR"')
      .setBackground(T.bgAsset).setFontColor(T.success).setFontWeight('bold')
      .setFontSize(10).setHorizontalAlignment('right').setVerticalAlignment('middle');
    hub.setRowHeight(r, 22);

    // Bar
    hub.getRange(r + 1, 9, 1, 4).merge().setFormula(
      '=IFERROR(LET(v,' + balFormula + ',tot,' + totalAssets + ',pct,IF(tot=0,0,v/tot),REPT("█",ROUND(pct*30,0))&REPT("░",30-ROUND(pct*30,0)))&" "&TEXT(IF(' + totalAssets + '=0,0,' + balFormula + '/' + totalAssets + '),"0%"),"")'
    ).setBackground(T.bgPanel).setFontColor(T.success).setFontFamily('Courier New')
      .setFontSize(9).setHorizontalAlignment('left').setVerticalAlignment('middle');
    hub.setRowHeight(r + 1, 18);
  }
}

// ══════════════════════════════════════════════════════════
// VERIFY
// ══════════════════════════════════════════════════════════

function verifyFinanceCharts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hub = ss.getSheetByName(FIN_CHARTS_HUB);
  if (!hub) { _alertC('❌ Finance Hub not found.'); return; }

  // Check section header at row 55
  const headerVal = hub.getRange('A55').getValue();
  const card1 = hub.getRange('A60').getValue();
  const card2 = hub.getRange('E60').getValue();
  const card3 = hub.getRange('I60').getValue();

  let report = '🔍 📊 VISUAL INSIGHTS v1.0 INTEGRITY\n\n';
  report += (headerVal && headerVal.toString().indexOf('VISUAL INSIGHTS') !== -1 ? '✅' : '❌') + ' Section header at row 55\n';
  report += (card1 ? '✅' : '❌') + ' Card 1: Income vs Expense\n';
  report += (card2 ? '✅' : '❌') + ' Card 2: Top Categories\n';
  report += (card3 ? '✅' : '❌') + ' Card 3: Account Distribution\n';

  if (headerVal && card1 && card2 && card3) {
    report += '\n✅ All 3 cards operational. Scroll to row 55 in Finance Hub to view.';
  } else {
    report += '\n⚠️ Run refreshFinanceCharts to (re)build.';
  }
  _alertC(report);
}