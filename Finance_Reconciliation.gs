// ════════════════════════════════════════════════════════════════════
// 🔄 Finance_Reconciliation.gs — DRIFT DETECTION v1.0
// LOCKED · 7-Layer Audit · Day 6 / 90 · 2026-04-30
//
// PURPOSE:
//   Catches the #1 finance forgery vector: lying to yourself about
//   your real bank balance. Weekly you type your actual bank app
//   balance into yellow cells → system shows drift vs computed.
//
// LOCATION: 🏦 Accounts tab, rows 26-42
//
// HOW TO USE:
//   1. Open bank app / check SMS for current balance
//   2. Type number into yellow "Declared" cell for that account
//   3. System auto-computes drift + flags status
//   4. Investigate any 🚨 (drift > 1000 PKR)
//
// PUBLIC API:
//   - rebuildAccountsReconciliation()
//   - verifyAccountsReconciliation()
// ════════════════════════════════════════════════════════════════════

const REC_TAB = '🏦 Accounts';
const REC_START_ROW = 26;
const REC_END_ROW = 42;

// Account map: row in source → account label
// Assets in rows 7-15 (column E = Balance), CC in row 20 (column C = Outstanding)
const REC_ACCOUNTS = [
  { label: 'Cash',        sourceRow: 7,  sourceCol: 'E', isLiability: false },
  { label: 'JazzCash',    sourceRow: 8,  sourceCol: 'E', isLiability: false },
  { label: 'Easypaisa',   sourceRow: 9,  sourceCol: 'E', isLiability: false },
  { label: 'UBL',         sourceRow: 10, sourceCol: 'E', isLiability: false },
  { label: 'Meezan',      sourceRow: 11, sourceCol: 'E', isLiability: false },
  { label: 'Mashreq Bank',sourceRow: 12, sourceCol: 'E', isLiability: false },
  { label: 'JS Bank',     sourceRow: 13, sourceCol: 'E', isLiability: false },
  { label: 'Naya Pay',    sourceRow: 14, sourceCol: 'E', isLiability: false },
  { label: 'Bank Alfalah',sourceRow: 15, sourceCol: 'E', isLiability: false },
  { label: 'Alfalah CC',  sourceRow: 20, sourceCol: 'C', isLiability: true  }
];

// Color palette (matches Accounts tab navy theme)
const REC_C = {
  HEADER_BG:   '#0F172A',
  HEADER_TXT:  '#FBBF24',
  SUB_BG:      '#1E293B',
  SUB_TXT:     '#94A3B8',
  COL_HDR_BG:  '#334155',
  COL_HDR_TXT: '#F1F5F9',
  COMPUTED_BG: '#1E293B',
  COMPUTED_TXT:'#94A3B8',
  DECLARED_BG: '#FEF3C7',
  DECLARED_TXT:'#0F172A',
  DRIFT_BG:    '#1E293B',
  DRIFT_TXT:   '#F1F5F9',
  ROW_LBL_BG:  '#1E293B',
  ROW_LBL_TXT: '#FBBF24',
  GOOD:        '#16A34A',
  WARN:        '#F59E0B',
  BAD:         '#DC2626',
  FOOTER_BG:   '#581C87',
  FOOTER_TXT:  '#FBBF24'
};

function _recAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _recLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

// ──────────────────────────────────────────────────────────
// MAIN — rebuild reconciliation card
// ──────────────────────────────────────────────────────────

function rebuildAccountsReconciliation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(REC_TAB);
  if (!s) { _recAlert('Accounts tab not found.'); return; }

  // Read existing declared values to preserve user input across rebuilds
  const existingDeclared = {};
  for (let i = 0; i < REC_ACCOUNTS.length; i++) {
    const r = REC_START_ROW + 4 + i;  // header offset
    try {
      const v = s.getRange(r, 5).getValue();  // col E = Declared
      if (v !== '' && v !== null && !isNaN(v)) {
        existingDeclared[REC_ACCOUNTS[i].label] = v;
      }
    } catch (e) {}
  }

  // Clear the section
  s.getRange(REC_START_ROW, 1, REC_END_ROW - REC_START_ROW + 1, 10).clearContent().clearFormat().clearDataValidations();

  // Make sure we have enough rows
  if (s.getMaxRows() < REC_END_ROW + 2) {
    s.insertRowsAfter(s.getMaxRows(), REC_END_ROW + 2 - s.getMaxRows());
  }

  // ── Section header (row 26) ──
  s.getRange(REC_START_ROW, 1, 1, 10).merge()
    .setValue('🔄 RECONCILIATION — your real bank balance vs system computed')
    .setBackground(REC_C.HEADER_BG).setFontColor(REC_C.HEADER_TXT)
    .setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(REC_START_ROW, 32);

  // ── Sub-header (row 27) ──
  s.getRange(REC_START_ROW + 1, 1, 1, 10).merge()
    .setValue('Weekly: open your bank app → type real balance into yellow cells → system flags drift. ✅ <100 PKR  ·  ⚠️ 100-1000  ·  🚨 >1000')
    .setBackground(REC_C.SUB_BG).setFontColor(REC_C.SUB_TXT)
    .setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(REC_START_ROW + 1, 30);

  // ── Spacer (row 28) ──
  s.setRowHeight(REC_START_ROW + 2, 8);

  // ── Column headers (row 29) ──
  const colHdrRow = REC_START_ROW + 3;
  const headers = [
    { col: 1, span: 2, text: 'ACCOUNT' },
    { col: 3, span: 2, text: 'COMPUTED' },
    { col: 5, span: 2, text: 'DECLARED (you type)' },
    { col: 7, span: 2, text: 'DRIFT' },
    { col: 9, span: 2, text: 'STATUS' }
  ];
  headers.forEach(h => {
    s.getRange(colHdrRow, h.col, 1, h.span).merge()
      .setValue(h.text).setBackground(REC_C.COL_HDR_BG)
      .setFontColor(REC_C.COL_HDR_TXT).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  });
  s.setRowHeight(colHdrRow, 24);

  // ── Account rows (30-39) ──
  REC_ACCOUNTS.forEach((acc, i) => {
    const r = colHdrRow + 1 + i;

    // Col A-B: Account label (mirror via formula so it auto-updates)
    s.getRange(r, 1, 1, 2).merge()
      .setFormula('=' + REC_TAB.replace('🏦 ', "'🏦 ") + "'!A" + acc.sourceRow)
      .setBackground(REC_C.ROW_LBL_BG).setFontColor(REC_C.ROW_LBL_TXT)
      .setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');

    // Col C-D: Computed (read from existing Balance column on Accounts tab)
    let computedFormula;
    if (acc.isLiability) {
      // CC outstanding is positive number but represents debt → display as negative
      computedFormula = "=-1*'" + REC_TAB + "'!" + acc.sourceCol + acc.sourceRow;
    } else {
      computedFormula = "='" + REC_TAB + "'!" + acc.sourceCol + acc.sourceRow;
    }
    s.getRange(r, 3, 1, 2).merge()
      .setFormula(computedFormula)
      .setBackground(REC_C.COMPUTED_BG).setFontColor(REC_C.COMPUTED_TXT)
      .setFontWeight('bold').setFontSize(12)
      .setNumberFormat('#,##0;-#,##0;0')
      .setHorizontalAlignment('right').setVerticalAlignment('middle');

    // Col E-F: Declared (yellow editable) — preserve existing value if any
    const declaredCell = s.getRange(r, 5, 1, 2);
    declaredCell.merge();
    if (existingDeclared[acc.label] !== undefined) {
      declaredCell.setValue(existingDeclared[acc.label]);
    }
    declaredCell.setBackground(REC_C.DECLARED_BG).setFontColor(REC_C.DECLARED_TXT)
      .setFontWeight('bold').setFontSize(12)
      .setNumberFormat('#,##0;-#,##0;0')
      .setHorizontalAlignment('right').setVerticalAlignment('middle');
    declaredCell.setDataValidation(SpreadsheetApp.newDataValidation()
      .requireNumberBetween(-99999999, 99999999)
      .setAllowInvalid(false)
      .setHelpText('Enter your REAL bank balance (whole or decimal PKR).')
      .build());

    // Col G-H: Drift = Declared - Computed (only when Declared is filled)
    s.getRange(r, 7, 1, 2).merge()
      .setFormula('=IF(E' + r + '="","—",E' + r + '-C' + r + ')')
      .setBackground(REC_C.DRIFT_BG).setFontColor(REC_C.DRIFT_TXT)
      .setFontWeight('bold').setFontSize(12)
      .setNumberFormat('+#,##0;-#,##0;0')
      .setHorizontalAlignment('right').setVerticalAlignment('middle');

    // Col I-J: Status icon based on drift magnitude
    s.getRange(r, 9, 1, 2).merge()
      .setFormula('=IF(E' + r + '="","⚪ not reconciled",' +
                  'IF(ABS(G' + r + ')<100,"✅ OK",' +
                  'IF(ABS(G' + r + ')<1000,"⚠️ check","🚨 INVESTIGATE")))')
      .setBackground(REC_C.SUB_BG).setFontColor(REC_C.HEADER_TXT)
      .setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    s.setRowHeight(r, 28);
  });

  // ── Footer spacer (row 40) ──
  const footerSpacerRow = colHdrRow + 1 + REC_ACCOUNTS.length;
  s.setRowHeight(footerSpacerRow, 8);

  // ── Total drift footer (row 41) ──
  const footerRow = footerSpacerRow + 1;
  const firstDataRow = colHdrRow + 1;
  const lastDataRow = colHdrRow + REC_ACCOUNTS.length;

  s.getRange(footerRow, 1, 1, 6).merge()
    .setValue('TOTAL ABSOLUTE DRIFT')
    .setBackground(REC_C.FOOTER_BG).setFontColor(REC_C.FOOTER_TXT)
    .setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.getRange(footerRow, 7, 1, 2).merge()
    .setFormula('=IFERROR(SUMPRODUCT((E' + firstDataRow + ':E' + lastDataRow + '<>"")*ABS(IFERROR(G' + firstDataRow + ':G' + lastDataRow + ',0))),0)')
    .setBackground(REC_C.FOOTER_BG).setFontColor(REC_C.FOOTER_TXT)
    .setFontWeight('bold').setFontSize(14)
    .setNumberFormat('#,##0" PKR"')
    .setHorizontalAlignment('right').setVerticalAlignment('middle');

  s.getRange(footerRow, 9, 1, 2).merge()
    .setFormula('="reconciled "&COUNTIF(E' + firstDataRow + ':E' + lastDataRow + ',"<>")&"/' + REC_ACCOUNTS.length + '"')
    .setBackground(REC_C.FOOTER_BG).setFontColor(REC_C.FOOTER_TXT)
    .setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(footerRow, 32);

  // ── Last reconciled stamp (row 42) ──
  const stampRow = footerRow + 1;
  s.getRange(stampRow, 1, 1, 10).merge()
    .setValue('💡 Pro tip: reconcile every Friday after Salah · big drift means SMS/manual txn was missed')
    .setBackground(REC_C.SUB_BG).setFontColor(REC_C.SUB_TXT)
    .setFontStyle('italic').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(stampRow, 22);

  _recLog('RECONCILIATION_REBUILD', 'card built · ' + REC_ACCOUNTS.length + ' accounts · ' + 
          Object.keys(existingDeclared).length + ' declared values preserved');

  _recAlert('✅ Reconciliation card built.\n\n' +
            'Location: 🏦 Accounts tab rows 26-42\n' +
            'Accounts tracked: ' + REC_ACCOUNTS.length + '\n' +
            'Existing declared values preserved: ' + Object.keys(existingDeclared).length + '\n\n' +
            'Use it: open bank app → type real balance into yellow cells.\n' +
            'System flags drift instantly.');
}

// ──────────────────────────────────────────────────────────
// VERIFY — sanity check
// ──────────────────────────────────────────────────────────

function verifyAccountsReconciliation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(REC_TAB);
  if (!s) { _recAlert('Accounts tab not found.'); return; }

  let report = '🔍 RECONCILIATION CARD VERIFY\n\n';
  let declaredCount = 0;
  let totalDrift = 0;
  let statusBreakdown = { ok: 0, warn: 0, bad: 0, none: 0 };

  REC_ACCOUNTS.forEach((acc, i) => {
    const r = REC_START_ROW + 4 + i;
    const computed = s.getRange(r, 3).getValue();
    const declared = s.getRange(r, 5).getValue();
    const drift = s.getRange(r, 7).getValue();

    let status = '⚪';
    if (declared === '' || declared === null) {
      statusBreakdown.none++;
    } else {
      declaredCount++;
      const driftAbs = Math.abs(typeof drift === 'number' ? drift : 0);
      totalDrift += driftAbs;
      if (driftAbs < 100) { status = '✅'; statusBreakdown.ok++; }
      else if (driftAbs < 1000) { status = '⚠️'; statusBreakdown.warn++; }
      else { status = '🚨'; statusBreakdown.bad++; }
    }

    report += status + ' ' + acc.label.padEnd(15) + 
              ' computed=' + (computed || 0) + 
              ' declared=' + (declared || '—') + 
              ' drift=' + (drift === '' || drift === '—' ? '—' : drift) + '\n';
  });

  report += '\n── SUMMARY ──\n';
  report += 'Reconciled: ' + declaredCount + '/' + REC_ACCOUNTS.length + '\n';
  report += 'Total absolute drift: ' + Math.round(totalDrift).toLocaleString() + ' PKR\n';
  report += '✅ OK: ' + statusBreakdown.ok + '  ⚠️ Warn: ' + statusBreakdown.warn + 
            '  🚨 Investigate: ' + statusBreakdown.bad + '  ⚪ Not reconciled: ' + statusBreakdown.none;

  _recAlert(report);
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendReconciliationMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🔄 Reconcile')
      .addItem('🔄 Rebuild Reconciliation Card', 'rebuildAccountsReconciliation')
      .addItem('🔍 Verify Drift Status', 'verifyAccountsReconciliation')
      .addToUi();
  } catch (e) { Logger.log('Reconcile menu add failed: ' + e); }
}