// ════════════════════════════════════════════════════════════════════
// 🌐 Finance_Intl.gs — INTERNATIONAL TX + BILLER CHARGES v1.0
// LOCKED · Day 6 · 2026-04-29
// 
// PURPOSE: paisa-accurate logging of international subscriptions
// (Google, Netflix, OpenAI, etc.) with auto-calculated Pakistani taxes.
// Plus 1-Biller charge logging for cross-bank CC payments.
//
// FEE STRUCTURE (Bank Alfalah CC, verified against real statement):
//   Base                                    (e.g. 479.00 PKR for YouTube)
//   FX Fee           4.5% of base           (foreign transaction)
//   Excise Duty      16% of FX fee          (federal excise on bank charges)
//   Adv Tax 236Y     5% of base             (income tax on non-filer foreign tx)
//   PRA IT Tax       5% of base (opt-in)    (Punjab IT services tax — varies)
//
// 1-BILLER CHARGE: 31.25 PKR per CC bill payment from non-Alfalah account.
//
// PURELY ADDITIVE — does not modify Finance_Pro.gs in any way.
// ════════════════════════════════════════════════════════════════════

const INTL_TAX_RATES = {
  FX_FEE_PCT:     0.045,   // 4.5% Foreign Transaction Fee on base
  EXCISE_DUTY_PCT: 0.16,   // 16% Excise Duty on FX fee
  ADV_TAX_PCT:    0.05,    // 5% Advance Tax 236Y on base
  PRA_TAX_PCT:    0.05     // 5% PRA IT Services Tax on base (opt-in)
};

const INTL_FEE_LABELS = {
  BASE:    '🌐 Intl Subscription',
  FX:      '🏦 FX Fee (4.5%)',
  EXCISE:  '🏛️ Excise Duty (16% on FX)',
  ADV_TAX: '🏛️ Adv Tax 236Y (5%)',
  PRA_TAX: '🏛️ PRA IT Tax (5%)'
};

const INTL_BILLER_CHARGE = 31.25;   // 1-Biller fee when paying CC from non-Alfalah account

// All new categories — needed in FIN2_CATEGORIES dropdown
const INTL_NEW_CATEGORIES = [
  '🌐 Intl Subscription',
  '🏦 FX Fee (4.5%)',
  '🏛️ Excise Duty (16% on FX)',
  '🏛️ Adv Tax 236Y (5%)',
  '🏛️ PRA IT Tax (5%)',
  '🏦 Biller Charge'
];

const INTL_TZ = 'Asia/Karachi';

// ────────── helpers ──────────

function _intlRound(n) { return Math.round(n * 100) / 100; }

function _intlGenTxnId() {
  if (typeof generateTxnId === 'function') return generateTxnId();
  const stamp = Utilities.formatDate(new Date(), INTL_TZ, 'yyyyMMdd-HHmmss');
  const suffix = Math.floor(Math.random() * 1000).toString();
  return 'TXN-' + stamp + '-' + ('000' + suffix).slice(-3);
}

function _intlAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

// ────────── core: log a multi-row international purchase ──────────

function logIntlPurchase(opts) {
  const base = parseFloat(opts.base);
  if (!base || base <= 0) return { ok: false, error: 'invalid_base' };

  const merchant = opts.merchant || 'International Subscription';

  // ─── Smart Merchant DB lookup (v1.0 patch) ───
  // If merchant matches known profile, override defaults.
  // User-supplied opts still win (explicit > inferred).
  let merchProfile = null;
  if (typeof lookupMerchant === 'function') {
    merchProfile = lookupMerchant(merchant);
  }

  const fromAccount = opts.fromAccount || (merchProfile ? merchProfile.account : 'Alfalah CC');
  const date = opts.date || new Date();
  // PRA: opts.includePRA overrides if true; otherwise use merchant profile
  const includePRA = (opts.includePRA === true) ? true : (merchProfile ? merchProfile.pra === true : false);
  const userNotes = opts.notes || '';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) return { ok: false, error: 'transactions_tab_missing' };

  // Calculate every fee to paisa precision
  const fxFee  = _intlRound(base * INTL_TAX_RATES.FX_FEE_PCT);
  const excise = _intlRound(fxFee * INTL_TAX_RATES.EXCISE_DUTY_PCT);
  const advTax = _intlRound(base * INTL_TAX_RATES.ADV_TAX_PCT);
  const praTax = includePRA ? _intlRound(base * INTL_TAX_RATES.PRA_TAX_PCT) : 0;
  const total  = _intlRound(base + fxFee + excise + advTax + praTax);

  const rowsNeeded = includePRA ? 5 : 4;

  // Find rowsNeeded CONSECUTIVE empty rows
  let firstRow = -1, consecutive = 0;
  for (let r = 9; r <= 208; r++) {
    if (!tx.getRange(r, 1).getValue()) {
      if (firstRow === -1) firstRow = r;
      consecutive++;
      if (consecutive >= rowsNeeded) break;
    } else {
      firstRow = -1; consecutive = 0;
    }
  }
  if (consecutive < rowsNeeded) return { ok: false, error: 'ledger_full_need_' + rowsNeeded + '_rows' };

  Utilities.sleep(20);
  const parentId = _intlGenTxnId();

  const lines = [
    { type: 'Expense', cat: INTL_FEE_LABELS.BASE,    amount: base,   note: 'Base · ' + merchant + (userNotes ? ' · ' + userNotes : '') },
    { type: 'Expense', cat: INTL_FEE_LABELS.FX,      amount: fxFee,  note: 'FX Fee · linked to ' + parentId },
    { type: 'Expense', cat: INTL_FEE_LABELS.EXCISE,  amount: excise, note: 'Excise Duty · linked to ' + parentId },
    { type: 'Expense', cat: INTL_FEE_LABELS.ADV_TAX, amount: advTax, note: 'Adv Tax 236Y · linked to ' + parentId }
  ];
  if (includePRA) {
    lines.push({ type: 'Expense', cat: INTL_FEE_LABELS.PRA_TAX, amount: praTax, note: 'PRA IT Tax · linked to ' + parentId });
  }

  const childIds = [];
  lines.forEach((line, i) => {
    const r = firstRow + i;
    Utilities.sleep(20);
    const id = (i === 0) ? parentId : _intlGenTxnId();
    childIds.push(id);

    tx.getRange(r, 1).setValue(date).setNumberFormat('dd MMM yyyy');
    tx.getRange(r, 2).setValue(fromAccount);
    tx.getRange(r, 3).setValue(line.type);
    tx.getRange(r, 4).setValue(line.cat);
    tx.getRange(r, 5).setValue(line.amount).setNumberFormat('#,##0.00');
    tx.getRange(r, 6).setValue('PKR');
    tx.getRange(r, 7).setValue(line.amount).setNumberFormat('#,##0.00');
    tx.getRange(r, 8).setValue(merchant);
    try { tx.getRange(r, 9, 1, 4).breakApart(); } catch(e) {}
    tx.getRange(r, 9, 1, 4).merge().setValue(line.note);
    tx.getRange(r, 14).setValue(id);
  });

  if (typeof logAuditAction === 'function') {
    logAuditAction('INTL_PURCHASE', merchant + ' · base ' + base + ' + fees ' + 
                   _intlRound(total - base) + ' = ' + total + ' PKR · parent ' + parentId + 
                   (includePRA ? ' · +PRA' : ''));
  }

  return {
    ok: true, parentId: parentId, childIds: childIds,
    base: base, fxFee: fxFee, excise: excise, advTax: advTax, praTax: praTax,
    total: total, rowsWritten: rowsNeeded, fromAccount: fromAccount, merchant: merchant
  };
}

// ────────── core: log 1-Biller cross-bank CC payment fee ──────────

function logBillerCharge(fromAccount, notes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) return { ok: false, error: 'transactions_tab_missing' };

  let nextRow = -1;
  for (let r = 9; r <= 208; r++) {
    if (!tx.getRange(r, 1).getValue()) { nextRow = r; break; }
  }
  if (nextRow === -1) return { ok: false, error: 'ledger_full' };

  Utilities.sleep(20);
  const txnId = _intlGenTxnId();
  const today = new Date();

  tx.getRange(nextRow, 1).setValue(today).setNumberFormat('dd MMM yyyy');
  tx.getRange(nextRow, 2).setValue(fromAccount);
  tx.getRange(nextRow, 3).setValue('Expense');
  tx.getRange(nextRow, 4).setValue('🏦 Biller Charge');
  tx.getRange(nextRow, 5).setValue(INTL_BILLER_CHARGE).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 6).setValue('PKR');
  tx.getRange(nextRow, 7).setValue(INTL_BILLER_CHARGE).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 8).setValue('1-Biller');
  try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch(e) {}
  tx.getRange(nextRow, 9, 1, 4).merge()
    .setValue('1-Biller fee for cross-bank CC payment' + (notes ? ' · ' + notes : ''));
  tx.getRange(nextRow, 14).setValue(txnId);

  if (typeof logAuditAction === 'function') {
    logAuditAction('BILLER_CHARGE', INTL_BILLER_CHARGE + ' PKR · ' + fromAccount + ' · ' + txnId);
  }
  return { ok: true, txnId: txnId, amount: INTL_BILLER_CHARGE };
}

// ────────── Telegram: /intl ──────────

function cmdIntl(args) {
  const ACCOUNT_ALIASES = {
    'cash': 'Cash', 'jazzcash': 'JazzCash', 'jazz': 'JazzCash', 'jc': 'JazzCash',
    'easypaisa': 'Easypaisa', 'easy': 'Easypaisa', 'ep': 'Easypaisa',
    'ubl': 'UBL', 'meezan': 'Meezan', 'mz': 'Meezan',
    'mashreq': 'Mashreq Bank', 'mashreq bank': 'Mashreq Bank',
    'js': 'JS Bank', 'js bank': 'JS Bank', 'jsbank': 'JS Bank',
    'naya': 'Naya Pay', 'naya pay': 'Naya Pay', 'nayapay': 'Naya Pay', 'np': 'Naya Pay',
    'alfalah': 'Bank Alfalah', 'bank alfalah': 'Bank Alfalah',
    'cc': 'Alfalah CC', 'alfalah cc': 'Alfalah CC', 'creditcard': 'Alfalah CC'
  };

  const parts = args.split(' ').filter(p => p.length > 0);
  const base = parseFloat(parts[0]);

  if (!base || base <= 0) {
    sendTelegram('How to log an international purchase:\n\n' +
                 '/intl 479 youtube              (defaults: Alfalah CC, no PRA)\n' +
                 '/intl 419 google one\n' +
                 '/intl 2999 openai +pra         (include PRA IT Tax)\n' +
                 '/intl 8000 netflix ubl         (override account)\n' +
                 '/intl 1500 spotify ubl +pra\n\n' +
                 'Auto-calculates: base + FX fee (4.5%) + Excise (16% on FX) + Adv Tax 236Y (5%)\n' +
                 'Add +pra anywhere if PRA IT Services Tax also applies (5%).\n\n' +
                 'Accounts: cash · jazzcash · easypaisa · ubl · meezan · mashreq · js · naya · alfalah · cc');
    return;
  }

  let nameParts = parts.slice(1);

  // Detect +pra flag (anywhere after base)
  let includePRA = false;
  const praIdx = nameParts.findIndex(p => p.toLowerCase() === '+pra');
  if (praIdx !== -1) {
    includePRA = true;
    nameParts = nameParts.slice(0, praIdx).concat(nameParts.slice(praIdx + 1));
  }

  // Detect account override (last word or last two words)
  let fromAccount = 'Alfalah CC';
  if (nameParts.length >= 2) {
    const lastTwo = nameParts.slice(-2).join(' ').toLowerCase();
    const last = nameParts[nameParts.length - 1].toLowerCase();
    if (ACCOUNT_ALIASES[lastTwo]) {
      fromAccount = ACCOUNT_ALIASES[lastTwo];
      nameParts = nameParts.slice(0, -2);
    } else if (ACCOUNT_ALIASES[last]) {
      fromAccount = ACCOUNT_ALIASES[last];
      nameParts = nameParts.slice(0, -1);
    }
  } else if (nameParts.length === 1 && ACCOUNT_ALIASES[nameParts[0].toLowerCase()]) {
    // Edge case: only base + account, no merchant
    fromAccount = ACCOUNT_ALIASES[nameParts[0].toLowerCase()];
    nameParts = [];
  }

  const merchant = nameParts.join(' ').trim() || 'International Subscription';

  const result = logIntlPurchase({
    base: base, merchant: merchant, fromAccount: fromAccount, includePRA: includePRA
  });

  if (!result.ok) {
    sendTelegram('Couldn\'t log it: ' + result.error);
    return;
  }

  const pad = (n) => n.toFixed(2).padStart(10);

  let msg = '<b>✓ ' + tgFmtEscape(result.merchant) + ' — international purchase logged</b>\n\n';
  msg += '<pre>';
  msg += '  From         ' + result.fromAccount + '\n';
  msg += '  Base         ' + pad(result.base) + ' PKR\n';
  msg += '  FX Fee       ' + pad(result.fxFee) + ' PKR  (4.5%)\n';
  msg += '  Excise       ' + pad(result.excise) + ' PKR  (16% on FX)\n';
  msg += '  Adv Tax      ' + pad(result.advTax) + ' PKR  (5%)\n';
  if (includePRA) {
    msg += '  PRA IT Tax   ' + pad(result.praTax) + ' PKR  (5%)\n';
  }
  msg += '  ─────────────────────────\n';
  msg += '  <b>Total        ' + pad(result.total) + ' PKR</b>\n';
  msg += '\n';
  msg += '  Linked rows  ' + result.rowsWritten + '\n';
  msg += '  Parent ID    ' + result.parentId + '\n';
  msg += '</pre>';
  sendTelegram(msg);
}

// ────────── Telegram: /billerfee ──────────

function cmdBillerFee(args) {
  const ACCOUNT_ALIASES = {
    'cash': 'Cash', 'jazzcash': 'JazzCash', 'jazz': 'JazzCash', 'jc': 'JazzCash',
    'easypaisa': 'Easypaisa', 'easy': 'Easypaisa', 'ep': 'Easypaisa',
    'ubl': 'UBL', 'meezan': 'Meezan', 'mz': 'Meezan',
    'mashreq': 'Mashreq Bank', 'js': 'JS Bank', 'naya': 'Naya Pay'
  };
  const input = String(args || '').toLowerCase().trim();
  const acc = ACCOUNT_ALIASES[input] || 'Meezan';

  const result = logBillerCharge(acc, '');
  if (!result.ok) {
    sendTelegram('Couldn\'t log biller charge: ' + (result.error || 'unknown'));
    return;
  }

  let msg = '<b>✓ 1-Biller fee logged</b>\n\n';
  msg += '<pre>';
  msg += '  From    ' + acc + '\n';
  msg += '  Amount  ' + result.amount.toFixed(2) + ' PKR\n';
  msg += '  TxnID   ' + result.txnId + '\n';
  msg += '</pre>\n\n';
  msg += '<i>Charged when CC bill paid from non-Alfalah account.</i>';
  sendTelegram(msg);
}

// ────────── one-click: refresh dropdowns to include new categories ──────────

function refreshIntlCategoryDropdowns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) { _intlAlert('💸 Transactions tab not found.'); return; }

  if (typeof FIN2_CATEGORIES === 'undefined') {
    _intlAlert('FIN2_CATEGORIES not loaded. Make sure Finance_Pro.gs is in the project and FIN2_CATEGORIES has been updated to include intl categories.');
    return;
  }

  const allCats = FIN2_CATEGORIES.concat(['']);
  const catDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(allCats, true)
    .setAllowInvalid(true).build();

  tx.getRange('D4').setDataValidation(catDV);
  tx.getRange(9, 4, 200, 1).setDataValidation(catDV);

  if (typeof logAuditAction === 'function') {
    logAuditAction('INTL_DROPDOWNS_REFRESH', allCats.length + ' categories now in dropdown');
  }
  _intlAlert('✅ Category dropdowns refreshed.\n\n' +
             'Total categories available: ' + allCats.length + '\n' +
             'New intl categories now visible:\n  ' + INTL_NEW_CATEGORIES.join('\n  '));
}

// ────────── menu append ──────────

function appendIntlMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🌐 Intl')
      .addItem('🔄 Refresh Category Dropdowns', 'refreshIntlCategoryDropdowns')
      .addToUi();
  } catch(e) { Logger.log('Intl menu add failed: ' + e); }
}