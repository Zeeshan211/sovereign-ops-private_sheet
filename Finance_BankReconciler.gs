// ════════════════════════════════════════════════════════════════════
// 📋 Finance_BankReconciler.gs — STATEMENT DIFF v1.0
// LOCKED · 7-Layer Audit · Day 6 / 90 · 2026-04-30
//
// PURPOSE:
//   Paste your bank/CC statement → system parses each line →
//   diffs against ledger → reports missing/extra/mismatched txns.
//
//   Closes Bug 5 (no txn-level drift detection) + helps catch
//   ongoing Bug 1 (missed manual entries) until SMS pipeline ships.
//
// HOW TO USE:
//   1. Menu → 🎛️ Sovereign → 🔄 Reconcile → 📋 Bank Statement Diff
//   2. Pick account (Alfalah CC / Meezan / etc.)
//   3. Paste statement text into popup
//   4. System renders 📋 Bank Diff tab with side-by-side compare
//   5. Click ✅ on each "Add missing" row to log it
//
// SUPPORTED FORMATS:
//   - Alfalah CC: "DATE DESCRIPTION AMOUNT" pattern
//   - Generic: any line with date + amount auto-extracted via regex
//
// PUBLIC API:
//   - bankReconcilerUI()           → main entry from menu
//   - parseBankStatement(text)     → returns array of parsed txns
//   - diffBankVsLedger(account, parsed) → returns diff report
// ════════════════════════════════════════════════════════════════════

const BR_TAB = '📋 Bank Diff';
const BR_TZ = 'Asia/Karachi';
const BR_LEDGER_TAB = '💸 Transactions';
const BR_LEDGER_START = 14;
const BR_LEDGER_END = 213;

// Match window: txn within ±2 days + ±5 PKR or ±1% considered same
const BR_DATE_TOLERANCE_DAYS = 2;
const BR_AMOUNT_TOLERANCE_PKR = 5;
const BR_AMOUNT_TOLERANCE_PCT = 0.01;

// Color palette
const BR_C = {
  HEADER_BG: '#0F172A', HEADER_TXT: '#FBBF24',
  SUB_BG: '#1E293B', SUB_TXT: '#94A3B8',
  COL_HDR_BG: '#334155', COL_HDR_TXT: '#F1F5F9',
  ROW_BG: '#FFFFFF', ALT_BG: '#F1F5F9',
  MATCH_BG: '#D1FAE5', MATCH_TXT: '#065F46',
  MISSING_BG: '#FEE2E2', MISSING_TXT: '#7F1D1D',
  EXTRA_BG: '#FEF3C7', EXTRA_TXT: '#78350F',
  ACTION_BG: '#16A34A', ACTION_TXT: '#FFFFFF'
};

function _brAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _brLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

// ──────────────────────────────────────────────────────────
// MAIN ENTRY — UI flow
// ──────────────────────────────────────────────────────────

function bankReconcilerUI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // ─── NEW v1.1: paste-pad approach (popup textarea breaks newlines) ───
  // Build a temp paste tab if missing
  let pad = ss.getSheetByName('📋 Paste Pad');
  if (!pad) {
    pad = ss.insertSheet('📋 Paste Pad');
    try { pad.setTabColor('#D97706'); } catch(e) {}
  }
  pad.clear();
  pad.getRange('A1').setValue('📋 BANK STATEMENT PASTE PAD — paste your statement below in column A, one txn per row, then run Diff again from menu')
    .setBackground('#0F172A').setFontColor('#FBBF24').setFontWeight('bold').setFontSize(13);
  pad.getRange('A1:E1').merge();
  pad.setRowHeight(1, 36);
  pad.getRange('A2').setValue('Step 1: type account name in B2 (e.g. Alfalah CC)')
    .setBackground('#FEF3C7').setFontStyle('italic').setFontSize(10);
  pad.getRange('A2:C2').merge();
  pad.getRange('B2').setValue('').setBackground('#FFFFFF');
  pad.getRange('A3').setValue('Step 2: paste statement in column A starting from row 5 (one txn per row), then re-run menu → 📋 Bank Diff → 📋 Run Bank Statement Diff')
    .setBackground('#FEF3C7').setFontStyle('italic').setFontSize(10);
  pad.getRange('A3:E3').merge();
  pad.getRange('A4').setValue('PASTE BELOW (one txn per row):')
    .setBackground('#1E293B').setFontColor('#FBBF24').setFontWeight('bold').setFontSize(11);
  pad.getRange('A4:E4').merge();
  pad.setColumnWidth(1, 600);
  pad.setColumnWidth(2, 200);

  // Read existing pad values (if user already pasted on previous attempt)
  const padAccount = pad.getRange('B2').getValue();
  const padLines = [];
  for (let r = 5; r <= 100; r++) {
    const v = pad.getRange(r, 1).getValue();
    if (v && v.toString().trim()) padLines.push(v.toString().trim());
  }

  // First-time use: open the pad and instruct
  if (!padAccount && padLines.length === 0) {
    pad.activate();
    _brAlert('📋 Paste Pad opened.\n\n' +
             'Step 1: Type account name in cell B2 (e.g. Alfalah CC)\n' +
             'Step 2: Paste statement in column A starting from row 5 (one txn per row · use Excel/sheet copy-paste so line breaks preserve)\n' +
             'Step 3: Re-run menu → 🎛️ Sovereign → 📋 Bank Diff → 📋 Run Bank Statement Diff\n\n' +
             'Tip: copy from your bank PDF, paste into Notepad first to clean formatting, then copy from Notepad and paste into column A.');
    return;
  }

  // Validate inputs
  const accounts = (typeof FIN2_ACCOUNTS !== 'undefined') ? FIN2_ACCOUNTS :
    ['Cash','JazzCash','Easypaisa','UBL','Meezan','Mashreq Bank','JS Bank','Naya Pay','Bank Alfalah','Alfalah CC'];

  const account = String(padAccount || '').trim();
  if (!account) {
    pad.activate();
    _brAlert('⚠️ Account name missing in cell B2 of 📋 Paste Pad.\n\nType account name (e.g. Alfalah CC) and re-run.');
    return;
  }
  if (accounts.indexOf(account) === -1) {
    pad.activate();
    _brAlert('⚠️ Account "' + account + '" not in your list.\n\nValid: ' + accounts.join(' · '));
    return;
  }

  if (padLines.length === 0) {
    pad.activate();
    _brAlert('⚠️ No statement lines found in column A starting from row 5.\n\nPaste statement (one txn per row) and re-run.');
    return;
  }

  const text = padLines.join('\n');

  // Step 3 — parse (same as before)
  const parsed = parseBankStatement(text);
  if (parsed.length === 0) {
    _brAlert('No transactions detected.\n\nMake sure each row has format: DATE DESCRIPTION AMOUNT');
    return;
  }

  // Step 4 — diff
  const diff = diffBankVsLedger(account, parsed);

  // Step 5 — render
  renderDiffReport(account, parsed, diff);

  _brLog('BANK_RECONCILE', account + ' · parsed ' + parsed.length + ' · matched ' + diff.matched.length + ' · missing ' + diff.missing.length + ' · extra ' + diff.extra.length);

  _brAlert('✅ Bank Diff Report ready.\n\n' +
           'Account: ' + account + '\n' +
           'Statement txns: ' + parsed.length + '\n' +
           'Matched: ' + diff.matched.length + '\n' +
           'Missing from ledger: ' + diff.missing.length + '\n' +
           'In ledger but not bank: ' + diff.extra.length + '\n\n' +
           'Open 📋 Bank Diff tab to review.\n' +
           'Paste Pad cleared automatically next time you re-run.');

  return; // skip old popup-based code below
}

function bankReconcilerUI_OLD_POPUP_DEPRECATED() {
  const ui = SpreadsheetApp.getUi();

  // Step 1 — pick account
  const accounts = (typeof FIN2_ACCOUNTS !== 'undefined') ? FIN2_ACCOUNTS :
    ['Cash','JazzCash','Easypaisa','UBL','Meezan','Mashreq Bank','JS Bank','Naya Pay','Bank Alfalah','Alfalah CC'];

  const accPrompt = ui.prompt('📋 Bank Statement Diff — Step 1/2',
    'Which account does this statement belong to?\n\n' +
    'Type the account name exactly:\n  ' + accounts.join(' · ') + '\n\n' +
    'Common: Alfalah CC · Meezan · UBL',
    ui.ButtonSet.OK_CANCEL);
  if (accPrompt.getSelectedButton() !== ui.Button.OK) return;

  const account = accPrompt.getResponseText().trim();
  if (!account) { _brAlert('No account entered. Cancelled.'); return; }
  if (accounts.indexOf(account) === -1) {
    _brAlert('Account "' + account + '" not in your list.\n\nValid accounts:\n  ' + accounts.join('\n  '));
    return;
  }

  // Step 2 — paste statement
  const stmtPrompt = ui.prompt('📋 Bank Statement Diff — Step 2/2',
    'Paste your statement text below.\n\n' +
    'Format examples (any of these work):\n' +
    '  29 Apr  YOUTUBE  479\n' +
    '  29-Apr-2026  ZONG MOBILE  60\n' +
    '  Apr 29, 2026  GOOGLE ONE  419\n\n' +
    'Each line: date + description + amount.\n' +
    'Headers, totals, and unrelated lines are auto-skipped.',
    ui.ButtonSet.OK_CANCEL);
  if (stmtPrompt.getSelectedButton() !== ui.Button.OK) return;

  const text = stmtPrompt.getResponseText();
  if (!text || text.trim().length < 10) { _brAlert('No statement text. Cancelled.'); return; }

  // Step 3 — parse
  const parsed = parseBankStatement(text);
  if (parsed.length === 0) {
    _brAlert('No transactions detected in pasted text.\n\n' +
             'Try re-pasting with each txn on its own line.\n' +
             'Format: DATE DESCRIPTION AMOUNT');
    return;
  }

  // Step 4 — diff
  const diff = diffBankVsLedger(account, parsed);

  // Step 5 — render
  renderDiffReport(account, parsed, diff);

  _brLog('BANK_RECONCILE', account + ' · parsed ' + parsed.length + ' · matched ' + diff.matched.length + ' · missing ' + diff.missing.length + ' · extra ' + diff.extra.length);

  _brAlert('✅ Bank Diff Report ready.\n\n' +
           'Account: ' + account + '\n' +
           'Statement txns: ' + parsed.length + '\n' +
           'Matched: ' + diff.matched.length + '\n' +
           'Missing from ledger: ' + diff.missing.length + '\n' +
           'In ledger but not bank: ' + diff.extra.length + '\n\n' +
           'Open 📋 Bank Diff tab to review.\n' +
           'Click ✅ on each "Add missing" row to log it.');
}

// ──────────────────────────────────────────────────────────
// PARSER — extract date + amount + description from each line
// ──────────────────────────────────────────────────────────

function parseBankStatement(text) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  const parsed = [];

  // Skip patterns (statement metadata)
  const skipPatterns = [
    /^page\s+\d+/i, /^statement\s+date/i, /^card\s+number/i,
    /^opening\s+balance/i, /^closing\s+balance/i, /^total\s+/i,
    /^balance\s+forward/i, /^minimum\s+payment/i, /^credit\s+limit/i,
    /^available\s+credit/i, /^due\s+date/i, /^cycle/i,
    /^posted\s+date/i, /^trans\s+date/i, /^description/i,
    /^date.*description.*amount/i, /^---+$/, /^===+$/,
    /^\s*$/
  ];

  lines.forEach(line => {
    // Skip metadata lines
    let skip = false;
    skipPatterns.forEach(p => { if (p.test(line)) skip = true; });
    if (skip) return;

    // Try to extract date
    const date = _brExtractDate(line);
    if (!date) return;

    // Try to extract amount (last number on line)
    const amount = _brExtractAmount(line);
    if (!amount) return;

    // Description = everything between date and amount
    const desc = _brExtractDescription(line, date, amount);

    parsed.push({
      date: date,
      amount: amount.value,
      isCredit: amount.isCredit,
      description: desc,
      rawLine: line
    });
  });

  // Sort by date ascending
  parsed.sort((a, b) => a.date.getTime() - b.date.getTime());

  return parsed;
}

function _brExtractDate(line) {
  // Match patterns: "29 Apr 2026", "29-Apr-2026", "Apr 29 2026", "29/04/2026", "29-04-26"
  const monthMap = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };

  // Pattern 1: "29 Apr 2026" or "29-Apr-2026" or "29 Apr"
  let m = line.match(/(\d{1,2})[\s\-\/]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/]*(\d{2,4})?/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const mo = monthMap[m[2].toLowerCase().substring(0,3)];
    let yr = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    if (yr < 100) yr += 2000;
    if (day >= 1 && day <= 31 && mo !== undefined) {
      return new Date(yr, mo, day);
    }
  }

  // Pattern 2: "Apr 29 2026" or "Apr 29, 2026"
  m = line.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/]+(\d{1,2})[,\s]+(\d{2,4})?/i);
  if (m) {
    const mo = monthMap[m[1].toLowerCase().substring(0,3)];
    const day = parseInt(m[2], 10);
    let yr = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    if (yr < 100) yr += 2000;
    if (day >= 1 && day <= 31 && mo !== undefined) {
      return new Date(yr, mo, day);
    }
  }

  // Pattern 3: "29/04/2026" or "29-04-2026" or "29-04-26" (DD/MM/YYYY)
  m = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    let yr = parseInt(m[3], 10);
    if (yr < 100) yr += 2000;
    if (day >= 1 && day <= 31 && mo >= 0 && mo <= 11) {
      return new Date(yr, mo, day);
    }
  }

  return null;
}

function _brExtractAmount(line) {
  // Find all numbers with optional commas + decimal
  const numMatches = line.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+\.\d+|\d+/g);
  if (!numMatches || numMatches.length === 0) return null;

  // Last number is usually the amount
  const last = numMatches[numMatches.length - 1];
  const cleaned = last.replace(/,/g, '');
  const value = parseFloat(cleaned);
  if (isNaN(value) || value === 0) return null;

  // Detect CR (credit/payment) vs DR (debit/charge)
  // CR = money came TO the bank account (deposit) OR CC payment received (reduces CC debt)
  // DR = money left bank account (withdrawal) OR CC charge (increases CC debt)
  const isCredit = /\b(CR|CREDIT|PAYMENT RECEIVED|REFUND|REVERSAL|DEPOSIT)\b/i.test(line);

  return { value: Math.abs(value), isCredit: isCredit };
}

function _brExtractDescription(line, date, amount) {
  // Remove date pattern
  let desc = line;
  desc = desc.replace(/(\d{1,2})[\s\-\/]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/]*(\d{2,4})?/i, '');
  desc = desc.replace(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/]+(\d{1,2})[,\s]+(\d{2,4})?/i, '');
  desc = desc.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, '');
  // Remove last amount + CR/DR markers
  desc = desc.replace(/\b(CR|DR|CREDIT|DEBIT|PKR|RS\.?)\b/gi, '');
  desc = desc.replace(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*$/, '');
  // Cleanup
  desc = desc.replace(/\s{2,}/g, ' ').trim();
  return desc || '(no description)';
}

// ──────────────────────────────────────────────────────────
// DIFF — compare parsed bank txns against ledger
// ──────────────────────────────────────────────────────────

function diffBankVsLedger(account, parsed) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(BR_LEDGER_TAB);
  if (!tx) return { matched: [], missing: parsed.slice(), extra: [] };

  // Read ledger entries for this account in last 60 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);

  const ledgerTxns = [];
  for (let r = BR_LEDGER_START; r <= BR_LEDGER_END; r++) {
    const date = tx.getRange(r, 1).getValue();
    if (!(date instanceof Date)) continue;
    if (date < cutoff) continue;

    const acct = tx.getRange(r, 2).getValue();
    if (acct !== account) continue;

    const type = tx.getRange(r, 3).getValue();
    const category = tx.getRange(r, 4).getValue();
    const amount = parseFloat(tx.getRange(r, 5).getValue()) || 0;
    const counterparty = tx.getRange(r, 8).getValue();
    const notes = tx.getRange(r, 9).getValue();
    const txnId = tx.getRange(r, 14).getValue();

    // Skip reversed entries
    const notesStr = (notes || '').toString();
    if (notesStr.indexOf('[REVERSED BY') !== -1) continue;
    if (notesStr.indexOf('[REVERSAL OF') !== -1) continue;

    ledgerTxns.push({
      row: r, date: date, type: type, category: category,
      amount: amount, counterparty: counterparty,
      notes: notesStr, txnId: txnId
    });
  }

  // Match each parsed bank txn against ledger
  const matched = [];
  const missing = [];
  const usedLedgerRows = new Set();

  parsed.forEach(p => {
    let bestMatch = null;
    let bestScore = -1;

    ledgerTxns.forEach(l => {
      if (usedLedgerRows.has(l.row)) return;

      const dayDiff = Math.abs((p.date.getTime() - l.date.getTime()) / 86400000);
      if (dayDiff > BR_DATE_TOLERANCE_DAYS) return;

      const amtDiff = Math.abs(p.amount - l.amount);
      const amtTol = Math.max(BR_AMOUNT_TOLERANCE_PKR, l.amount * BR_AMOUNT_TOLERANCE_PCT);
      if (amtDiff > amtTol) return;

      // Score: closer date + closer amount = higher score
      const score = (BR_DATE_TOLERANCE_DAYS - dayDiff) * 10 + (amtTol - amtDiff);
      if (score > bestScore) {
        bestMatch = l;
        bestScore = score;
      }
    });

    if (bestMatch) {
      matched.push({ bank: p, ledger: bestMatch });
      usedLedgerRows.add(bestMatch.row);
    } else {
      missing.push(p);
    }
  });

  // Extras = ledger entries that didn't match any bank txn
  const extra = ledgerTxns.filter(l => !usedLedgerRows.has(l.row));

  return { matched: matched, missing: missing, extra: extra };
}

// ──────────────────────────────────────────────────────────
// RENDER — build 📋 Bank Diff tab
// ──────────────────────────────────────────────────────────

function renderDiffReport(account, parsed, diff) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(BR_TAB);
  if (!s) s = ss.insertSheet(BR_TAB);
  try { s.setTabColor('#D97706'); } catch(e) {}

  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());

  const widths = [110, 110, 280, 100, 110, 130, 200];
  widths.forEach((w, i) => s.setColumnWidth(i + 1, w));

  // Title
  s.getRange('A1:G1').merge()
    .setValue('📋 BANK STATEMENT DIFF — ' + account + ' · ' + Utilities.formatDate(new Date(), BR_TZ, 'dd MMM yyyy HH:mm'))
    .setBackground(BR_C.HEADER_BG).setFontColor(BR_C.HEADER_TXT)
    .setFontWeight('bold').setFontSize(14)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);

  // Summary banner
  s.getRange('A2:G2').merge()
    .setValue('📊 ' + parsed.length + ' txns parsed · ✅ ' + diff.matched.length + ' matched · 🚨 ' + diff.missing.length + ' missing from ledger · ⚠️ ' + diff.extra.length + ' in ledger but not bank')
    .setBackground(BR_C.SUB_BG).setFontColor(BR_C.SUB_TXT)
    .setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center');
  s.setRowHeight(2, 26);
  s.setRowHeight(3, 8);

  let row = 4;

  // ─── SECTION 1: MISSING (most actionable) ───
  if (diff.missing.length > 0) {
    s.getRange(row, 1, 1, 7).merge()
      .setValue('🚨 MISSING FROM LEDGER — ' + diff.missing.length + ' txns in bank but NOT in ledger (paste into Quick Entry)')
      .setBackground(BR_C.MISSING_BG).setFontColor(BR_C.MISSING_TXT)
      .setFontWeight('bold').setFontSize(12)
      .setHorizontalAlignment('center');
    s.setRowHeight(row, 28); row++;

    const hdr = ['Date', 'Amount', 'Description', 'Type', 'Suggested Cat', 'Suggested Account', 'Action Hint'];
    s.getRange(row, 1, 1, 7).setValues([hdr])
      .setBackground(BR_C.COL_HDR_BG).setFontColor(BR_C.COL_HDR_TXT)
      .setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
    s.setRowHeight(row, 24); row++;

    diff.missing.forEach((m, i) => {
      // Smart category suggestion via merchant DB
      let suggCat = '🎯 Other';
      let suggAcc = account;
      if (typeof lookupMerchant === 'function') {
        const profile = lookupMerchant(m.description);
        if (profile) {
          suggCat = profile.category;
          suggAcc = profile.account;
        }
      }
      const txnType = m.isCredit ? 'Income' : 'Expense';
      const hint = m.isCredit ? 'Use Quick Entry · Type=Income' : 'Use Quick Entry · Type=Expense';

      s.getRange(row, 1).setValue(m.date).setNumberFormat('dd MMM yyyy');
      s.getRange(row, 2).setValue(m.amount).setNumberFormat('#,##0.00').setHorizontalAlignment('right').setFontWeight('bold');
      s.getRange(row, 3).setValue(m.description).setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(true);
      s.getRange(row, 4).setValue(txnType).setFontWeight('bold').setHorizontalAlignment('center');
      s.getRange(row, 5).setValue(suggCat).setHorizontalAlignment('center').setFontSize(10);
      s.getRange(row, 6).setValue(suggAcc).setHorizontalAlignment('center').setFontSize(10);
      s.getRange(row, 7).setValue(hint).setFontStyle('italic').setFontColor(BR_C.SUB_TXT).setFontSize(10).setHorizontalAlignment('left');

      const bg = (i % 2 === 0) ? BR_C.MISSING_BG : '#FCA5A5';
      s.getRange(row, 1, 1, 7).setBackground(bg).setFontColor(BR_C.MISSING_TXT).setVerticalAlignment('middle');
      s.setRowHeight(row, 28); row++;
    });
    s.setRowHeight(row, 8); row++;
  }

  // ─── SECTION 2: MATCHED ───
  if (diff.matched.length > 0) {
    s.getRange(row, 1, 1, 7).merge()
      .setValue('✅ MATCHED — ' + diff.matched.length + ' bank txns successfully matched to ledger entries')
      .setBackground(BR_C.MATCH_BG).setFontColor(BR_C.MATCH_TXT)
      .setFontWeight('bold').setFontSize(12)
      .setHorizontalAlignment('center');
    s.setRowHeight(row, 28); row++;

    const hdr = ['Bank Date', 'Bank Amt', 'Bank Description', 'Ledger Date', 'Ledger Amt', 'Ledger Category', 'TxnID'];
    s.getRange(row, 1, 1, 7).setValues([hdr])
      .setBackground(BR_C.COL_HDR_BG).setFontColor(BR_C.COL_HDR_TXT)
      .setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
    s.setRowHeight(row, 24); row++;

    diff.matched.forEach((m, i) => {
      s.getRange(row, 1).setValue(m.bank.date).setNumberFormat('dd MMM');
      s.getRange(row, 2).setValue(m.bank.amount).setNumberFormat('#,##0').setHorizontalAlignment('right');
      s.getRange(row, 3).setValue(m.bank.description).setHorizontalAlignment('left').setWrap(true);
      s.getRange(row, 4).setValue(m.ledger.date).setNumberFormat('dd MMM');
      s.getRange(row, 5).setValue(m.ledger.amount).setNumberFormat('#,##0').setHorizontalAlignment('right');
      s.getRange(row, 6).setValue(m.ledger.category).setHorizontalAlignment('center').setFontSize(10);
      s.getRange(row, 7).setValue(m.ledger.txnId).setFontSize(9).setFontFamily('Courier New').setFontColor(BR_C.SUB_TXT);

      const bg = (i % 2 === 0) ? BR_C.MATCH_BG : '#A7F3D0';
      s.getRange(row, 1, 1, 7).setBackground(bg).setFontColor(BR_C.MATCH_TXT).setVerticalAlignment('middle');
      s.setRowHeight(row, 24); row++;
    });
    s.setRowHeight(row, 8); row++;
  }

  // ─── SECTION 3: EXTRA (in ledger but not bank) ───
  if (diff.extra.length > 0) {
    s.getRange(row, 1, 1, 7).merge()
      .setValue('⚠️ IN LEDGER BUT NOT BANK — ' + diff.extra.length + ' entries (might be: not yet posted · pending · or fake/duplicate)')
      .setBackground(BR_C.EXTRA_BG).setFontColor(BR_C.EXTRA_TXT)
      .setFontWeight('bold').setFontSize(12)
      .setHorizontalAlignment('center');
    s.setRowHeight(row, 28); row++;

    const hdr = ['Date', 'Amount', 'Type', 'Category', 'Counterparty', 'Notes', 'TxnID'];
    s.getRange(row, 1, 1, 7).setValues([hdr])
      .setBackground(BR_C.COL_HDR_BG).setFontColor(BR_C.COL_HDR_TXT)
      .setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
    s.setRowHeight(row, 24); row++;

    diff.extra.forEach((e, i) => {
      s.getRange(row, 1).setValue(e.date).setNumberFormat('dd MMM');
      s.getRange(row, 2).setValue(e.amount).setNumberFormat('#,##0').setHorizontalAlignment('right');
      s.getRange(row, 3).setValue(e.type).setHorizontalAlignment('center').setFontWeight('bold').setFontSize(10);
      s.getRange(row, 4).setValue(e.category).setHorizontalAlignment('center').setFontSize(10);
      s.getRange(row, 5).setValue(e.counterparty || '—').setFontSize(10).setHorizontalAlignment('left');
      s.getRange(row, 6).setValue((e.notes || '').substring(0, 60)).setFontSize(9).setHorizontalAlignment('left').setWrap(true);
      s.getRange(row, 7).setValue(e.txnId).setFontSize(9).setFontFamily('Courier New').setFontColor(BR_C.SUB_TXT);

      const bg = (i % 2 === 0) ? BR_C.EXTRA_BG : '#FDE68A';
      s.getRange(row, 1, 1, 7).setBackground(bg).setFontColor(BR_C.EXTRA_TXT).setVerticalAlignment('middle');
      s.setRowHeight(row, 28); row++;
    });
    s.setRowHeight(row, 8); row++;
  }

  // Footer tip
  s.getRange(row, 1, 1, 7).merge()
    .setValue('💡 To add a missing txn: open 💸 Transactions → Quick Entry row 4 → fill matching values → ✅ submit · or use /pay /intl in Telegram')
    .setBackground(BR_C.SUB_BG).setFontColor(BR_C.SUB_TXT)
    .setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('center');
  s.setRowHeight(row, 26);

  s.setFrozenRows(2);
}

// ──────────────────────────────────────────────────────────
// VERIFY
// ──────────────────────────────────────────────────────────

function verifyBankReconciler() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const diff = ss.getSheetByName(BR_TAB);
  let report = '🔍 BANK RECONCILER v1.0 INTEGRITY\n\n';
  report += (diff ? '✅' : '⚠️') + ' Bank Diff tab: ' + (diff ? 'present' : 'not yet built (run a diff first)') + '\n';
  report += (typeof lookupMerchant === 'function' ? '✅' : '⚠️') + ' Merchant DB available for smart suggestions\n';
  report += '✓ Public API: bankReconcilerUI · parseBankStatement · diffBankVsLedger\n';
  _brAlert(report);
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendBankReconcilerMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📋 Bank Diff')
      .addItem('📋 Run Bank Statement Diff', 'bankReconcilerUI')
      .addItem('🔍 Verify Reconciler', 'verifyBankReconciler')
      .addToUi();
  } catch (e) { Logger.log('Bank Reconciler menu add failed: ' + e); }
}