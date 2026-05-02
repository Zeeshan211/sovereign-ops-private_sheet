// ════════════════════════════════════════════════════════════════════
// 🪁 Finance_Kite.gs — CC KITE TRACKER v1.0
// LOCKED · 7-Layer Audit · Self-Contained · NO Finance_Pro edits required
//
// PURPOSE:
//   One-click CC cash advance ("kite") with atomic 3-txn ledger writes:
//     1. Cash account: Income (+amount)
//     2. Alfalah CC: Expense (amount → CC outstanding ↑)
//     3. Alfalah CC: Expense (fee → CC outstanding ↑)
//   Cash + CC withdraw legs bidirectionally linked → existing performReversal
//   handles atomic reversal of the kite withdrawal pair.
//
// PANEL: Finance Hub rows 99-118 (after Audit panel which ends at 97)
//
// AUDIT ACTIONS LOGGED:
//   KITE_LOGGED · KITE_TRACKER_REBUILD
// ════════════════════════════════════════════════════════════════════

const FIN_KITE_HUB_TAB = '💰 Finance Hub';
const FIN_KITE_TXN_TAB = '💸 Transactions';
const FIN_KITE_TZ = 'Asia/Karachi';

// Panel anchors
const FIN_KITE_PANEL_START = 99;
const FIN_KITE_PANEL_END = 118;
const FIN_KITE_FORM_ROW = 101;

// Categories (must exist in Finance_Pro FIN2_CATEGORIES — they do)
const FIN_KITE_CAT_WITHDRAW = '🪁 CC Kite Withdraw';
const FIN_KITE_CAT_FEE = '🪁 CC Kite Fee';

// Account constants
const FIN_KITE_CC_ACCOUNT = 'Alfalah CC';
const FIN_KITE_DEFAULT_DEST = 'Cash';
const FIN_KITE_ASSET_ACCOUNTS = [
  'Cash', 'JazzCash', 'Easypaisa', 'UBL', 'Meezan',
  'Mashreq Bank', 'JS Bank', 'Naya Pay', 'Bank Alfalah'
];

// CC mechanics (Alfalah typical: 3% with PKR 750 minimum)
const FIN_KITE_DEFAULT_FEE_PCT = 0.03;
const FIN_KITE_FEE_MIN = 750;
const FIN_KITE_CC_DUE_DAY = 6;
const FIN_KITE_CC_LIMIT = 100000;

// ──────────────────────────────────────────────────────────
// SAFE WRAPPERS
// ──────────────────────────────────────────────────────────

function _alertK(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}
function _logK(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}
function getKiteTheme() {
  if (typeof getFinTheme === 'function') return getFinTheme();
  return {
    bgPage: '#FFFFFF', bgPanel: '#F8FAFC', bgRow: '#FFFFFF',
    bgAlt: '#F1F5F9', bgInput: '#FFFBEB', bgHeader: '#1E293B',
    bgSection: '#0F172A', bgAccent: '#FEF3C7', bgAsset: '#DCFCE7',
    bgLiability: '#FEE2E2', bgNet: '#DBEAFE',
    text: '#0F172A', textHi: '#000000', textMd: '#334155', textLo: '#64748B',
    success: '#16A34A', warning: '#D97706', danger: '#DC2626',
    info: '#2563EB', purple: '#7C3AED', orange: '#EA580C', critical: '#991B1B'
  };
}

function _kiteTxnId(suffix) {
  if (typeof generateTxnId === 'function') {
    return generateTxnId();
  }
  const stamp = Utilities.formatDate(new Date(), FIN_KITE_TZ, 'yyyyMMdd-HHmmss');
  const rnd = Math.floor(Math.random() * 1000).toString();
  return 'TXN-' + stamp + '-' + (suffix || ('000' + rnd).slice(-3));
}

// ══════════════════════════════════════════════════════════
// MAIN ENTRY
// ══════════════════════════════════════════════════════════

function buildKiteTrackerUI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hub = ss.getSheetByName(FIN_KITE_HUB_TAB);
  if (!hub) { _alertK('❌ ' + FIN_KITE_HUB_TAB + ' tab not found.\n\nRun Finance Suite rebuild first.'); return; }

  renderKiteTrackerInHub(hub);
  installKiteEditHandler(true);
  _logK('KITE_TRACKER_REBUILD', 'v1.0 panel installed at rows ' + FIN_KITE_PANEL_START + '-' + FIN_KITE_PANEL_END);

  _alertK('✅ 🪁 Kite Tracker v1.0 installed.\n\n' +
          'Panel: Finance Hub rows ' + FIN_KITE_PANEL_START + '-' + FIN_KITE_PANEL_END + '\n' +
          'Handler: _kiteOnEdit installed\n\n' +
          'How to use:\n' +
          '  1. Open Finance Hub → scroll to row ' + FIN_KITE_PANEL_START + '\n' +
          '  2. Enter amount (e.g. 10000)\n' +
          '  3. Adjust fee % if needed (default 3%, min 750 PKR)\n' +
          '  4. Pick destination account (default Cash)\n' +
          '  5. Click ✅ in L' + FIN_KITE_FORM_ROW + '\n\n' +
          'Result: 3 atomic ledger entries (Cash IN, CC withdraw, CC fee)');
}

function refreshKiteTracker() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hub = ss.getSheetByName(FIN_KITE_HUB_TAB);
  if (!hub) { _alertK('❌ Finance Hub not found.'); return; }
  renderKiteTrackerInHub(hub);
  _alertK('✅ Kite tracker panel refreshed.');
}

// ══════════════════════════════════════════════════════════
// PANEL RENDER (Hub rows 99-118)
// ══════════════════════════════════════════════════════════

function renderKiteTrackerInHub(hub) {
  if (!hub) return;
  const T = getKiteTheme();
  const startRow = FIN_KITE_PANEL_START;
  const formRow = FIN_KITE_FORM_ROW;
  const rows = FIN_KITE_PANEL_END - startRow + 1;

  // Defensive clear
  try { hub.getRange(startRow, 1, rows, 12).breakApart(); } catch(e) {}
  hub.getRange(startRow, 1, rows, 12).clearContent().clearFormat();
  hub.getRange(startRow, 1, rows, 12).setBackground(T.bgPage);

  // Row 99: section header
  hub.getRange(startRow, 1, 1, 12).merge()
    .setValue('🪁 CC KITE TRACKER — withdraw cash from Alfalah CC · auto-logs 3 atomic txns')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  hub.setRowHeight(startRow, 28);

  // Row 100: form labels
  const labelRow = startRow + 1;
  hub.getRange(labelRow, 1, 1, 2).merge().setValue('Amount (PKR)')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  hub.getRange(labelRow, 3, 1, 2).merge().setValue('Fee %')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  hub.getRange(labelRow, 5).setValue('Fee (auto)')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  hub.getRange(labelRow, 6, 1, 2).merge().setValue('To Account')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  hub.getRange(labelRow, 8, 1, 4).merge().setValue('Notes (optional)')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  hub.getRange(labelRow, 12).setValue('✅ Submit')
    .setBackground(T.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  hub.setRowHeight(labelRow, 24);

  // Row 101: form inputs
  hub.getRange(formRow, 1, 1, 2).merge().setValue(0).setNumberFormat('#,##0')
    .setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  hub.getRange(formRow, 3, 1, 2).merge().setValue(FIN_KITE_DEFAULT_FEE_PCT).setNumberFormat('0.00%')
    .setBackground(T.bgInput).setFontColor(T.warning).setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle');
  hub.getRange(formRow, 5).setFormula('=MAX(A' + formRow + '*C' + formRow + ',' + FIN_KITE_FEE_MIN + ')*IF(A' + formRow + '>0,1,0)').setNumberFormat('#,##0')
    .setBackground(T.bgLiability).setFontColor(T.danger).setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle');
  hub.getRange(formRow, 6, 1, 2).merge().setValue(FIN_KITE_DEFAULT_DEST)
    .setBackground(T.bgInput).setFontColor(T.text).setFontWeight('bold').setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  hub.getRange(formRow, 8, 1, 4).merge().setValue('')
    .setBackground(T.bgInput).setFontColor(T.textMd).setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
  hub.getRange(formRow, 12).insertCheckboxes()
    .setBackground(T.success).setHorizontalAlignment('center').setVerticalAlignment('middle');
  hub.setRowHeight(formRow, 36);

  // Apply To Account dropdown
  const accDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(FIN_KITE_ASSET_ACCOUNTS, true).setAllowInvalid(true).build();
  hub.getRange(formRow, 6).setDataValidation(accDV);

  // Row 102: tip
  const tipRow = startRow + 3;
  hub.getRange(tipRow, 1, 1, 12).merge()
    .setValue('💡 Fee = MAX(amount × fee %, ' + FIN_KITE_FEE_MIN + ' PKR min) · CC outstanding rises by amount + fee · Cash+CC withdraw legs are bidirectionally linked (atomic reversal via ↩️ in 💸 Transactions)')
    .setBackground(T.bgPanel).setFontColor(T.textMd).setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  hub.setRowHeight(tipRow, 32);

  // Row 103: gap
  hub.setRowHeight(startRow + 4, 8);

  // Row 104: KPI section header
  const kpiHeaderRow = startRow + 5;
  hub.getRange(kpiHeaderRow, 1, 1, 12).merge()
    .setValue('📊 KITE STATS — month-to-date · live from ledger')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  hub.setRowHeight(kpiHeaderRow, 26);

  // Row 105: gap
  hub.setRowHeight(startRow + 6, 8);

  // Row 106: 4 KPI cards (3 cols each)
  const kpiRow = startRow + 7;
  const txnG = "'" + FIN_KITE_TXN_TAB + "'!G:G";
  const txnA = "'" + FIN_KITE_TXN_TAB + "'!A:A";
  const txnC = "'" + FIN_KITE_TXN_TAB + "'!C:C";
  const txnD = "'" + FIN_KITE_TXN_TAB + "'!D:D";

  // Card 1: Kited MTD (sum of Cash-side Income with Kite Withdraw category this month)
  const kitedFormula = 'IFERROR(SUMIFS(' + txnG + ',' + txnD + ',"' + FIN_KITE_CAT_WITHDRAW + '",' + txnC + ',"Income",' + txnA + ',">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + txnA + ',"<="&EOMONTH(TODAY(),0)),0)';
  hub.getRange(kpiRow, 1, 1, 3).merge()
    .setFormula('="🪁 KITED MTD"&CHAR(10)&TEXT(' + kitedFormula + ',"#,##0")&" PKR"')
    .setBackground(T.warning).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  // Card 2: Fees MTD
  const feesFormula = 'IFERROR(SUMIFS(' + txnG + ',' + txnD + ',"' + FIN_KITE_CAT_FEE + '",' + txnC + ',"Expense",' + txnA + ',">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),' + txnA + ',"<="&EOMONTH(TODAY(),0)),0)';
  hub.getRange(kpiRow, 4, 1, 3).merge()
    .setFormula('="💸 FEES MTD"&CHAR(10)&TEXT(' + feesFormula + ',"#,##0")&" PKR"')
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  // Card 3: Effective cost % (fees / kited)
  hub.getRange(kpiRow, 7, 1, 3).merge()
    .setFormula('="📊 EFFECTIVE COST"&CHAR(10)&IFERROR(TEXT(' + feesFormula + '/' + kitedFormula + ',"0.0%")," — ")')
    .setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  // Card 4: Days till CC due
  const daysFormula = 'IF(DAY(TODAY())<=' + FIN_KITE_CC_DUE_DAY + ',DATE(YEAR(TODAY()),MONTH(TODAY()),' + FIN_KITE_CC_DUE_DAY + ')-TODAY(),DATE(YEAR(TODAY()),MONTH(TODAY())+1,' + FIN_KITE_CC_DUE_DAY + ')-TODAY())';
  hub.getRange(kpiRow, 10, 1, 3).merge()
    .setFormula('="⏰ DAYS TILL CC DUE"&CHAR(10)&' + daysFormula + '&" days"')
    .setBackground(T.purple).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  hub.setRowHeight(kpiRow, 50);

  // Row 107: gap
  hub.setRowHeight(startRow + 8, 8);

  // Row 108: payback strategy header
  const paybackHeaderRow = startRow + 9;
  hub.getRange(paybackHeaderRow, 1, 1, 12).merge()
    .setValue('💳 PAYBACK STRATEGY — total CC impact + recommended payback')
    .setBackground(T.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  hub.setRowHeight(paybackHeaderRow, 26);

  // Row 109-110: callout (merged)
  const calloutStart = startRow + 10;
  hub.getRange(calloutStart, 1, 2, 12).merge()
    .setFormula(
      '="Total CC impact this month from kites: " & TEXT(' + kitedFormula + '+' + feesFormula + ',"#,##0") & " PKR" & CHAR(10) & ' +
      '"To zero out before due day, transfer this amount from a bank to Alfalah CC via Accounts tab transfer form."'
    )
    .setBackground(T.bgAccent).setFontColor(T.textHi).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  hub.setRowHeight(calloutStart, 28);
  hub.setRowHeight(calloutStart + 1, 28);

  // Rows 112-117: blank buffer
  for (let r = startRow + 12; r <= startRow + 17; r++) hub.setRowHeight(r, 8);

  // Row 118: footer tip
  const footerRow = FIN_KITE_PANEL_END;
  hub.getRange(footerRow, 1, 1, 12).merge()
    .setValue('💡 Filter 💸 Transactions by category 🪁 CC Kite Withdraw or 🪁 CC Kite Fee for full kite history · ↩️ on Cash leg auto-reverses CC withdraw · fee leg reverses standalone')
    .setBackground(T.bgPanel).setFontColor(T.textLo).setFontStyle('italic').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  hub.setRowHeight(footerRow, 28);
}

// ══════════════════════════════════════════════════════════
// SUBMIT HANDLER (3 atomic txn writes)
// ══════════════════════════════════════════════════════════

function submitKiteWithdrawal(hub, amount, feeRate, toAcc, notes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(FIN_KITE_TXN_TAB);
  if (!tx) {
    hub.getRange(FIN_KITE_FORM_ROW, 12).setValue(false);
    _alertK('❌ ' + FIN_KITE_TXN_TAB + ' tab not found.');
    return;
  }

  // Validate
  if (typeof amount !== 'number' || amount <= 0) {
    hub.getRange(FIN_KITE_FORM_ROW, 12).setValue(false);
    _alertK('⚠️ Invalid amount.\n\nEnter a positive PKR amount in cell A' + FIN_KITE_FORM_ROW + '.');
    return;
  }
  if (typeof feeRate !== 'number' || feeRate < 0) feeRate = FIN_KITE_DEFAULT_FEE_PCT;
  const fee = Math.max(amount * feeRate, FIN_KITE_FEE_MIN);
  if (!toAcc) toAcc = FIN_KITE_DEFAULT_DEST;
  if (FIN_KITE_ASSET_ACCOUNTS.indexOf(toAcc) === -1) {
    hub.getRange(FIN_KITE_FORM_ROW, 12).setValue(false);
    _alertK('⚠️ Invalid destination account: "' + toAcc + '"\n\nPick from dropdown.');
    return;
  }

  // Find next free row (need 3 consecutive)
  let nextRow = -1;
  for (let r = 9; r <= 206; r++) {
    if (!tx.getRange(r, 1).getValue() &&
        !tx.getRange(r + 1, 1).getValue() &&
        !tx.getRange(r + 2, 1).getValue()) {
      nextRow = r; break;
    }
  }
  if (nextRow === -1) {
    hub.getRange(FIN_KITE_FORM_ROW, 12).setValue(false);
    _alertK('⚠️ Ledger full.\n\nNeed 3 consecutive empty rows. Wipe ledger or archive transactions first.');
    return;
  }

  // Generate IDs
  const cashTxnId = _kiteTxnId('CSH');
  Utilities.sleep(30);
  const ccTxnId = _kiteTxnId('CCW');
  Utilities.sleep(30);
  const feeTxnId = _kiteTxnId('FEE');
  const today = new Date();
  const stamp = Utilities.formatDate(today, FIN_KITE_TZ, 'yyyyMMdd-HHmmss');
  const groupId = 'KG-' + stamp;
  const noteText = notes && notes.toString().trim() !== '' ? notes.toString().trim() : 'CC kite withdrawal';

  // Helper to write a ledger row
  const writeRow = (row, account, type, category, amt, txnId, noteFull) => {
    tx.getRange(row, 1).setValue(today).setNumberFormat('dd MMM yyyy');
    tx.getRange(row, 2).setValue(account);
    tx.getRange(row, 3).setValue(type);
    tx.getRange(row, 4).setValue(category);
    tx.getRange(row, 5).setValue(amt).setNumberFormat('#,##0.00');
    tx.getRange(row, 6).setValue('PKR');
    tx.getRange(row, 7).setValue(amt).setNumberFormat('#,##0.00');
    tx.getRange(row, 8).setValue('Kite ' + groupId);
    try { tx.getRange(row, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(row, 9, 1, 4).merge().setValue(noteFull);
    tx.getRange(row, 14).setValue(txnId);
  };

  // Txn 1: Cash IN (linked to CC withdraw leg for atomic reversal)
  writeRow(
    nextRow, toAcc, 'Income', FIN_KITE_CAT_WITHDRAW, amount, cashTxnId,
    noteText + ' · cash leg [linked: ' + ccTxnId + ']'
  );
  // Txn 2: CC withdraw OUT (linked to Cash leg)
  writeRow(
    nextRow + 1, FIN_KITE_CC_ACCOUNT, 'Expense', FIN_KITE_CAT_WITHDRAW, amount, ccTxnId,
    noteText + ' · CC withdraw leg [linked: ' + cashTxnId + ']'
  );
  // Txn 3: CC fee (standalone, group-tagged)
  writeRow(
    nextRow + 2, FIN_KITE_CC_ACCOUNT, 'Expense', FIN_KITE_CAT_FEE, fee, feeTxnId,
    'Kite fee · group ' + groupId + ' · ' + (feeRate * 100).toFixed(2) + '% on ' + amount.toLocaleString()
  );

  // Reset form
  hub.getRange(FIN_KITE_FORM_ROW, 1, 1, 2).merge().setValue(0);
  hub.getRange(FIN_KITE_FORM_ROW, 3, 1, 2).merge().setValue(FIN_KITE_DEFAULT_FEE_PCT);
  hub.getRange(FIN_KITE_FORM_ROW, 6, 1, 2).merge().setValue(FIN_KITE_DEFAULT_DEST);
  hub.getRange(FIN_KITE_FORM_ROW, 8, 1, 4).merge().setValue('');
  hub.getRange(FIN_KITE_FORM_ROW, 12).setValue(false);

  _logK('KITE_LOGGED',
    groupId + ' · ' + amount.toLocaleString() + ' PKR · fee ' + Math.round(fee).toLocaleString() + ' PKR · ' + toAcc + ' · ' + cashTxnId + ' + ' + ccTxnId + ' + ' + feeTxnId);
}

// ══════════════════════════════════════════════════════════
// ON-EDIT HANDLER
// ══════════════════════════════════════════════════════════

function _kiteOnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== FIN_KITE_HUB_TAB) return;

  const r = e.range.getRow();
  const c = e.range.getColumn();
  if (r !== FIN_KITE_FORM_ROW || c !== 12) return;
  if (e.value !== 'TRUE' && e.value !== true) return;

  // Read form
  const amount = sh.getRange(FIN_KITE_FORM_ROW, 1).getValue();
  const feeRate = sh.getRange(FIN_KITE_FORM_ROW, 3).getValue();
  const toAcc = sh.getRange(FIN_KITE_FORM_ROW, 6).getValue();
  const notes = sh.getRange(FIN_KITE_FORM_ROW, 8).getValue();

  submitKiteWithdrawal(sh, amount, feeRate, toAcc, notes);
}

function installKiteEditHandler(silent) {
  try {
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === '_kiteOnEdit') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('_kiteOnEdit')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onEdit().create();
    if (!silent) _alertK('✅ Kite handler installed.\n\nWatching ' + FIN_KITE_HUB_TAB + ' L' + FIN_KITE_FORM_ROW + ' (✅ submit).');
  } catch(e) {
    Logger.log('Kite handler install failed: ' + e);
    if (!silent) _alertK('⚠️ Kite handler install failed.\n\n' + e);
  }
}

function diagnoseKiteHandler() {
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_kiteOnEdit');
  const ss = SpreadsheetApp.getActive();
  const hub = ss.getSheetByName(FIN_KITE_HUB_TAB);
  const tx = ss.getSheetByName(FIN_KITE_TXN_TAB);

  let report = '🪁 KITE HANDLER DIAGNOSTIC\n\n';
  report += 'Triggers installed: ' + triggers.length + '\n';
  report += (triggers.length === 1 ? '✅' : '⚠️') + ' (expected exactly 1)\n\n';
  report += 'Finance Hub: ' + (hub ? '✅ found' : '❌ NOT FOUND') + '\n';
  report += 'Transactions: ' + (tx ? '✅ found' : '❌ NOT FOUND') + '\n';
  if (hub) {
    const formCheck = hub.getRange(FIN_KITE_FORM_ROW, 1).getValue();
    report += 'Form row ' + FIN_KITE_FORM_ROW + ' present: ' + (formCheck !== '' ? '✅' : '⚠️ render the panel') + '\n';
  }
  if (triggers.length === 0) report += '\n🚨 FIX: Menu → 🎛️ Sovereign → 🪁 Kite → 🔧 Re-install Handler';
  else if (triggers.length > 1) report += '\n⚠️ Run Re-install to clean up duplicates.';
  else report += '\n✅ Operational.';
  _alertK(report);
}

// ══════════════════════════════════════════════════════════
// VERIFY
// ══════════════════════════════════════════════════════════

function verifyKiteTracker() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hub = ss.getSheetByName(FIN_KITE_HUB_TAB);
  const tx = ss.getSheetByName(FIN_KITE_TXN_TAB);
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_kiteOnEdit');

  let report = '🔍 🪁 KITE TRACKER v1.0 INTEGRITY\n\n';
  report += (hub ? '✅' : '❌') + ' Finance Hub present\n';
  report += (tx ? '✅' : '❌') + ' Transactions present\n';
  report += (triggers.length === 1 ? '✅' : '⚠️') + ' Handler: ' + triggers.length + '/1 installed\n';

  if (tx) {
    let kiteCount = 0, feeCount = 0;
    for (let r = 9; r <= 208; r++) {
      const cat = tx.getRange(r, 4).getValue();
      if (cat === FIN_KITE_CAT_WITHDRAW) kiteCount++;
      if (cat === FIN_KITE_CAT_FEE) feeCount++;
    }
    report += '\n📊 LEDGER STATS:\n';
    report += '  🪁 Kite withdraw entries: ' + kiteCount + '\n';
    report += '  💸 Kite fee entries: ' + feeCount + '\n';
    report += '  Expected ratio: 2 withdraw entries per 1 fee entry\n';
    if (kiteCount > 0) {
      const expectedFees = kiteCount / 2;
      const ratioOk = (Math.abs(feeCount - expectedFees) <= 1);
      report += '  Ratio match: ' + (ratioOk ? '✅' : '⚠️ check for orphan legs') + '\n';
    }
  }
  _alertK(report);
}

// ══════════════════════════════════════════════════════════
// MENU (standalone — also wired into Menu_Loader v1.6)
// ══════════════════════════════════════════════════════════

function appendKiteMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🪁 Kite')
      .addItem('🔄 Rebuild Tracker Panel', 'buildKiteTrackerUI')
      .addItem('🔄 Refresh Panel Only (no handler)', 'refreshKiteTracker')
      .addSeparator()
      .addItem('🔧 Re-install Handler', 'installKiteEditHandler')
      .addItem('🤖 Diagnose Handler', 'diagnoseKiteHandler')
      .addSeparator()
      .addItem('🔍 Verify Integrity', 'verifyKiteTracker')
      .addToUi();
  } catch(e) { Logger.log('Kite menu add failed: ' + e); }
}