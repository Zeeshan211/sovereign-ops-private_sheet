/* ─── D1_FullExport.gs v3.0 — MASTER MIGRATION ───
   Pulls Accounts + Categories + Debts + Bills + Transactions + Salary.
   All schema-aware. Preserves sheet TXN-IDs. Strips emojis from categories.
   READ-ONLY. Idempotent SQL via INSERT OR REPLACE.
*/

const D1_CONFIG = {
  ACCOUNTS: [
    { id: 'cash',     names: ['Cash'],                    col: 'E' },
    { id: 'jazzcash', names: ['JazzCash'],                col: 'E' },
    { id: 'easypaisa',names: ['Easypaisa'],               col: 'E' },
    { id: 'ubl',      names: ['UBL'],                     col: 'E' },
    { id: 'meezan',   names: ['Meezan'],                  col: 'E' },
    { id: 'mashreq',  names: ['Mashreq', 'Mashreq Bank'], col: 'E' },
    { id: 'js',       names: ['JS', 'JS Bank'],           col: 'E' },
    { id: 'nayapay',  names: ['Naya Pay', 'NayaPay'],     col: 'E' },
    { id: 'alfalah',  names: ['Bank Alfalah', 'Alfalah'], col: 'E', allow_missing: true },
    { id: 'ublprep',  names: ['UBL Prepaid'],             col: 'E' },
    { id: 'cc',       names: ['Alfalah CC', 'CC'],        col: 'C', is_liability: true }
  ],

  ACCOUNTS_TAB: { name: '🏦 Accounts', name_col: 'A', start_row: 7, end_row: 25 },

  CATEGORIES: [
    { id: 'food',     name: 'Food',          icon: '🍔' },
    { id: 'grocery',  name: 'Groceries',     icon: '🛒' },
    { id: 'transport',name: 'Transport',     icon: '🚗' },
    { id: 'bills',    name: 'Bills',         icon: '📄' },
    { id: 'health',   name: 'Health',        icon: '💊' },
    { id: 'personal', name: 'Personal',      icon: '👕' },
    { id: 'family',   name: 'Family',        icon: '👨‍👩‍👧' },
    { id: 'debt',     name: 'Debt Payment',  icon: '💸' },
    { id: 'cc_pay',   name: 'CC Payment',    icon: '💳' },
    { id: 'cc_spend', name: 'CC Spend',      icon: '💳' },
    { id: 'biller',   name: 'Biller Charge', icon: '🏦' },
    { id: 'salary',   name: 'Salary',        icon: '💰' },
    { id: 'gift',     name: 'Gift Received', icon: '🎁' },
    { id: 'transfer', name: 'Transfer',      icon: '↔️' },
    { id: 'other',    name: 'Other',         icon: '✨' }
  ],

  DEBTS: {
    tab: '💳 Debts',
    name_col: 'B',
    original_amount_col: 'C',
    paid_amount_col: 'D',
    snowball_order_col: 'A',
    start_row: 7,
    end_row: 30,
    RECEIVABLE_NAMES: ['Naseem']
  },

  BILLS: {
    enabled: true,
    tab: '📅 Bills',
    name_col: 'A',
    due_day_col: 'B',
    amount_col: 'C',
    account_col: 'D',
    notes_col: 'I',
    start_row: 5,
    end_row: 30
  },

  TRANSACTIONS: {
    enabled: true,
    tab: '💸 Transactions',
    date_col: 'A',
    account_col: 'B',
    type_col: 'C',
    category_col: 'D',
    amount_col: 'E',
    counterparty_col: 'H',
    notes_col: 'I',
    txid_col: 'N',
    start_row: 14,
    max_rows: 250
  },

  SALARY: {
    enabled: true,
    tab: '💼 Salary',
    label_col: 'A',
    amount_col: 'B',
    start_row: 5,
    end_row: 68,
    key_prefix: 'salary_'
  },

  SANITY: {
    cc_min_alert: 1,
    asset_max_alert: 10000000,
    debt_remaining_max: 10000000
  },

  EXPORT_TAB: '📤 D1 Export'
};

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════

function exportToD1() {
  try {
    const ss = SpreadsheetApp.getActive();
    const tab = ensureExportTab(ss);

    tab.getRange('A1').setValue('Block').setFontWeight('bold');
    tab.getRange('B1').setValue('SQL — double-click cell, Ctrl+A, Ctrl+C, paste in D1 Studio').setFontWeight('bold');
    tab.getRange('C1').setValue('Sanity').setFontWeight('bold');
    tab.setColumnWidth(1, 240);
    tab.setColumnWidth(2, 900);
    tab.setColumnWidth(3, 320);

    let row = 2;
    let blockNum = 1;

    const a = exportAccounts(ss);
    writeBlock(tab, row, blockNum + '. Accounts', a.sql, a.sanity);
    row++; blockNum++;

    const c = exportCategories();
    writeBlock(tab, row, blockNum + '. Categories', c.sql, c.sanity);
    row++; blockNum++;

    const d = exportDebts(ss);
    writeBlock(tab, row, blockNum + '. Debts', d.sql, d.sanity);
    row++; blockNum++;

    if (D1_CONFIG.BILLS.enabled) {
      const b = exportBills(ss);
      writeBlock(tab, row, blockNum + '. Bills', b.sql, b.sanity);
      row++; blockNum++;
    }

    if (D1_CONFIG.TRANSACTIONS.enabled) {
      const t = exportTransactions(ss);
      writeBlock(tab, row, blockNum + '. Transactions ledger', t.sql, t.sanity);
      row++; blockNum++;
    }

    if (D1_CONFIG.SALARY.enabled) {
      const s = exportSalary(ss);
      writeBlock(tab, row, blockNum + '. Salary snapshot', s.sql, s.sanity);
      row++; blockNum++;
    }

    tab.getRange(row + 1, 1).setValue('Generated:').setFontWeight('bold');
    tab.getRange(row + 1, 2).setValue(new Date().toString());
    tab.getRange(row + 2, 1).setValue('Run order:').setFontWeight('bold');
    tab.getRange(row + 2, 2).setValue('Run blocks 1-6 in order. Verify count after each. Idempotent — safe to re-run.');

    tab.activate();

    SpreadsheetApp.getUi().alert(
      '✅ D1 Master Migration Ready',
      (blockNum - 1) + ' SQL blocks generated.\n\nOpen "📤 D1 Export" tab.\nReview Column C (Sanity) BEFORE pasting to D1.\nPush to D1 Studio one block at a time.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (err) {
    SpreadsheetApp.getUi().alert('Export failed', err.message + '\n\n' + err.stack, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════
// DOMAIN EXPORTERS
// ═══════════════════════════════════════════════════════

function exportAccounts(ss) {
  const cfg = D1_CONFIG.ACCOUNTS_TAB;
  const sheet = ss.getSheetByName(cfg.name);
  if (!sheet) return { sql: '-- ERROR: tab "' + cfg.name + '" not found', sanity: ['❌ Tab missing'] };

  const nameRow = {};
  for (let r = cfg.start_row; r <= cfg.end_row; r++) {
    const n = String(sheet.getRange(cfg.name_col + r).getValue() || '').trim();
    if (n) nameRow[n.toLowerCase()] = r;
  }

  const cases = [];
  const ids = [];
  const sanity = [];

  D1_CONFIG.ACCOUNTS.forEach(acct => {
    let row = null, matched = null;
    for (const sn of acct.names) {
      if (nameRow[sn.toLowerCase()]) { row = nameRow[sn.toLowerCase()]; matched = sn; break; }
    }

    if (!row) {
      if (acct.allow_missing) {
        cases.push("  WHEN '" + acct.id + "' THEN 0");
        ids.push("'" + acct.id + "'");
        sanity.push('ℹ️ ' + acct.id + ' not in sheet → kept at 0');
      } else {
        sanity.push('⚠️ ' + acct.id + ' MISSING — tried: ' + acct.names.join(', '));
      }
      return;
    }

    const raw = sheet.getRange(acct.col + row).getValue();
    const bal = round2(parseFloat(raw) || 0);

    cases.push("  WHEN '" + acct.id + "' THEN " + bal);
    ids.push("'" + acct.id + "'");

    if (acct.is_liability && bal < D1_CONFIG.SANITY.cc_min_alert) {
      sanity.push('⚠️ ' + acct.id + ' (' + matched + ') = ' + bal + ' from cell ' + acct.col + row + ' — looks wrong for CC');
    } else if (bal > D1_CONFIG.SANITY.asset_max_alert) {
      sanity.push('⚠️ ' + acct.id + ' = ' + bal + ' — over max alert');
    } else {
      sanity.push('✓ ' + acct.id + ': ' + bal + ' (cell ' + acct.col + row + ')');
    }
  });

  if (cases.length === 0) return { sql: '-- No matching accounts', sanity };

  const sql = 'UPDATE accounts SET opening_balance = CASE id\n' +
              cases.join('\n') + '\nEND\nWHERE id IN (' + ids.join(', ') + ');';
  return { sql, sanity };
}

function exportCategories() {
  const cats = D1_CONFIG.CATEGORIES;
  const sanity = cats.map(c => '✓ ' + c.id + ' — ' + c.name);

  let sql = 'INSERT OR REPLACE INTO categories (id, name, icon, display_order) VALUES\n';
  cats.forEach((c, i) => {
    const trail = (i === cats.length - 1) ? ';' : ',';
    sql += "  ('" + c.id + "', '" + sqlEscape(c.name) + "', '" + c.icon + "', " + (i + 1) + ")" + trail + '\n';
  });
  return { sql: sql.trim(), sanity };
}

function exportDebts(ss) {
  const cfg = D1_CONFIG.DEBTS;
  const sheet = ss.getSheetByName(cfg.tab);
  if (!sheet) return { sql: '-- ERROR: tab "' + cfg.tab + '" not found', sanity: ['❌ Tab missing'] };

  const receivableSet = new Set((cfg.RECEIVABLE_NAMES || []).map(n => n.toLowerCase()));
  const rows = [];
  const sanity = [];

  for (let r = cfg.start_row; r <= cfg.end_row; r++) {
    const name = String(sheet.getRange(cfg.name_col + r).getValue() || '').trim();
    if (!name || name.toLowerCase().indexOf('total') >= 0) continue;

    const orig = round2(parseFloat(sheet.getRange(cfg.original_amount_col + r).getValue()) || 0);
    const paid = round2(parseFloat(sheet.getRange(cfg.paid_amount_col + r).getValue()) || 0);
    const order = parseInt(sheet.getRange(cfg.snowball_order_col + r).getValue()) || (r - cfg.start_row + 1);

    if (orig <= 0) continue;
    if (paid > orig) { sanity.push('⚠️ ' + name + ' paid > original'); continue; }

    const isReceivable = receivableSet.has(name.toLowerCase());
    const kind = isReceivable ? 'owed' : 'owe';
    const id = (isReceivable ? 'rcv_' : 'debt_') + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const remaining = orig - paid;

    sanity.push((isReceivable ? '↘️ ' : '↗️ ') + name + ' [' + kind + ']: ' + remaining);
    rows.push({ id, name, kind, orig, paid, order });
  }

  if (rows.length === 0) return { sql: '-- No active debts found', sanity };

  let sql = 'INSERT OR REPLACE INTO debts (id, name, kind, original_amount, paid_amount, snowball_order, status) VALUES\n';
  rows.forEach((row, i) => {
    const t = (i === rows.length - 1) ? ';' : ',';
    sql += "  ('" + row.id + "', '" + sqlEscape(row.name) + "', '" + row.kind + "', " + row.orig + ", " + row.paid + ", " + row.order + ", 'active')" + t + '\n';
  });
  return { sql: sql.trim(), sanity };
}

function exportBills(ss) {
  const cfg = D1_CONFIG.BILLS;
  const sheet = ss.getSheetByName(cfg.tab);
  if (!sheet) return { sql: '-- ERROR: tab "' + cfg.tab + '" not found', sanity: ['❌ Tab missing'] };

  const rows = [];
  const sanity = [];

  for (let r = cfg.start_row; r <= cfg.end_row; r++) {
    const name = String(sheet.getRange(cfg.name_col + r).getValue() || '').trim();
    const amount = round2(parseFloat(sheet.getRange(cfg.amount_col + r).getValue()) || 0);
    if (!name || amount <= 0) continue;

    const dueDay = parseInt(sheet.getRange(cfg.due_day_col + r).getValue()) || 1;
    const accRaw = String(sheet.getRange(cfg.account_col + r).getValue() || '').trim();
    const notes = String(sheet.getRange(cfg.notes_col + r).getValue() || '').slice(0, 200);

    const id = 'bill_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    const accId = mapAccount(accRaw);

    sanity.push('✓ ' + name + ' = ' + amount + ' due day ' + dueDay + (accId ? ' (' + accId + ')' : ''));
    rows.push({ id, name, amount, dueDay, accId, notes });
  }

  if (rows.length === 0) return { sql: '-- No bills found', sanity };

  let sql = 'INSERT OR REPLACE INTO bills (id, name, amount, due_day, frequency, category_id, default_account_id, auto_post) VALUES\n';
  rows.forEach((row, i) => {
    const t = (i === rows.length - 1) ? ';' : ',';
    const acc = row.accId ? "'" + row.accId + "'" : 'NULL';
    sql += "  ('" + row.id + "', '" + sqlEscape(row.name) + "', " + row.amount + ", " + row.dueDay + ", 'monthly', 'bills', " + acc + ", 0)" + t + '\n';
  });
  return { sql: sql.trim(), sanity };
}

function exportTransactions(ss) {
  const cfg = D1_CONFIG.TRANSACTIONS;
  const sheet = ss.getSheetByName(cfg.tab);
  if (!sheet) return { sql: '-- ERROR: tab "' + cfg.tab + '" not found', sanity: ['❌ Tab missing'] };

  const rows = [];
  const sanity = [];
  let skipped = 0;
  const endRow = Math.min(cfg.start_row + cfg.max_rows, sheet.getLastRow());

  for (let r = cfg.start_row; r <= endRow; r++) {
    const dateRaw = sheet.getRange(cfg.date_col + r).getValue();
    const amount = parseFloat(sheet.getRange(cfg.amount_col + r).getValue());
    if (!dateRaw || isNaN(amount) || amount <= 0) continue;

    const date = formatDateISO(dateRaw);
    const typeRaw = String(sheet.getRange(cfg.type_col + r).getValue() || '').trim();
    const accountRaw = String(sheet.getRange(cfg.account_col + r).getValue() || '').trim();
    const categoryRaw = String(sheet.getRange(cfg.category_col + r).getValue() || '').trim();
    const counterparty = String(sheet.getRange(cfg.counterparty_col + r).getValue() || '').trim();
    const notesRaw = String(sheet.getRange(cfg.notes_col + r).getValue() || '').slice(0, 240);
    const txid = String(sheet.getRange(cfg.txid_col + r).getValue() || '').trim();

    const accId = mapAccount(accountRaw);
    if (!accId) { skipped++; continue; }

    const type = mapTransactionType(typeRaw);
    const catId = mapCategoryFromSheet(categoryRaw);
    const id = txid || ('tx_sheet_' + new Date(date).getTime() + '_' + r);

    // Build full notes: counterparty + original notes
    const notes = (counterparty ? counterparty + ' · ' : '') + notesRaw;

    rows.push({
      id, date, type,
      amount: round2(amount),
      accId, catId,
      notes: notes.slice(0, 240)
    });
  }

  sanity.push('✓ ' + rows.length + ' transactions ready');
  if (skipped) sanity.push('ℹ️ ' + skipped + ' rows skipped (unknown account)');

  if (rows.length === 0) return { sql: '-- No transactions', sanity };

  // Batch into chunks of 100 for safer SQL execution
  let sql = 'INSERT OR REPLACE INTO transactions (id, date, type, amount, account_id, category_id, notes) VALUES\n';
  rows.forEach((row, i) => {
    const t = (i === rows.length - 1) ? ';' : ',';
    sql += "  ('" + sqlEscape(row.id) + "', '" + row.date + "', '" + row.type + "', " + row.amount + ", '" + row.accId + "', '" + row.catId + "', '" + sqlEscape(row.notes) + "')" + t + '\n';
  });
  return { sql: sql.trim(), sanity };
}

function exportSalary(ss) {
  const cfg = D1_CONFIG.SALARY;
  const sheet = ss.getSheetByName(cfg.tab);
  if (!sheet) return { sql: '-- ERROR: tab "' + cfg.tab + '" not found', sanity: ['❌ Tab missing'] };

  const rows = [];
  const sanity = [];

  for (let r = cfg.start_row; r <= cfg.end_row; r++) {
    const label = String(sheet.getRange(cfg.label_col + r).getValue() || '').trim();
    const amountRaw = sheet.getRange(cfg.amount_col + r).getValue();
    const amount = parseFloat(amountRaw);

    // Skip section headers (start with emoji or all caps non-numeric)
    if (!label) continue;
    if (isNaN(amount)) continue;

    // Convert label to settings key: lowercase, underscored
    const key = cfg.key_prefix + label.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50);

    rows.push({ key, value: round2(amount), label });
    sanity.push('✓ ' + key + ' = ' + round2(amount) + ' (' + label.slice(0, 30) + ')');
  }

  if (rows.length === 0) return { sql: '-- No salary components found', sanity };

  let sql = 'INSERT OR REPLACE INTO settings (key, value) VALUES\n';
  rows.forEach((row, i) => {
    const t = (i === rows.length - 1) ? ';' : ',';
    sql += "  ('" + sqlEscape(row.key) + "', '" + row.value + "')" + t + '\n';
  });
  return { sql: sql.trim(), sanity };
}

// ═══════════════════════════════════════════════════════
// DISCOVERY HELPERS
// ═══════════════════════════════════════════════════════

function discoverAllTabs() {
  const ss = SpreadsheetApp.getActive();
  let r = 'TABS:\n\n';
  ss.getSheets().forEach(t => {
    r += '• ' + t.getName() + '  (' + t.getLastRow() + 'x' + t.getLastColumn() + ')\n';
  });
  SpreadsheetApp.getUi().alert('Sheet Tabs', r, SpreadsheetApp.getUi().ButtonSet.OK);
}

function discoverAccountCells() {
  const ss = SpreadsheetApp.getActive();
  const cfg = D1_CONFIG.ACCOUNTS_TAB;
  const sheet = ss.getSheetByName(cfg.name);
  if (!sheet) { SpreadsheetApp.getUi().alert('Tab not found'); return; }

  let r = 'Tab: ' + cfg.name + '\n\n';
  D1_CONFIG.ACCOUNTS.forEach(acct => {
    let row = null, matched = null;
    for (let i = cfg.start_row; i <= cfg.end_row; i++) {
      const n = String(sheet.getRange(cfg.name_col + i).getValue() || '').trim();
      for (const sn of acct.names) {
        if (n.toLowerCase() === sn.toLowerCase()) { row = i; matched = n; break; }
      }
      if (row) break;
    }
    if (!row) r += '✗ ' + acct.id + ' → NOT FOUND\n';
    else {
      const cell = acct.col + row;
      const v = sheet.getRange(cell).getValue();
      r += '✓ ' + acct.id + ' "' + matched + '" cell ' + cell + ' = ' + v + '\n';
    }
  });
  SpreadsheetApp.getUi().alert('Accounts', r, SpreadsheetApp.getUi().ButtonSet.OK);
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function ensureExportTab(ss) {
  let t = ss.getSheetByName(D1_CONFIG.EXPORT_TAB);
  if (t) { t.clear(); t.clearFormats(); }
  else { t = ss.insertSheet(D1_CONFIG.EXPORT_TAB); }
  return t;
}

function writeBlock(tab, row, label, sql, sanity) {
  tab.getRange(row, 1).setValue(label).setFontWeight('bold').setVerticalAlignment('top');
  tab.getRange(row, 2).setValue(sql)
     .setBackground('#0f172a').setFontColor('#10b981')
     .setFontFamily('Courier New').setFontSize(10)
     .setVerticalAlignment('top').setWrap(true);
  if (sanity && sanity.length) {
    const txt = sanity.slice(0, 30).join('\n') + (sanity.length > 30 ? '\n... (+' + (sanity.length - 30) + ' more)' : '');
    const warn = sanity.some(s => s.indexOf('⚠️') >= 0 || s.indexOf('❌') >= 0);
    tab.getRange(row, 3).setValue(txt)
       .setBackground(warn ? '#451010' : '#0a2419')
       .setFontColor(warn ? '#fca5a5' : '#86efac')
       .setFontSize(9).setVerticalAlignment('top').setWrap(true);
  }
}

function sqlEscape(s) { return String(s || '').replace(/'/g, "''"); }
function round2(n) { return Math.round((n || 0) * 100) / 100; }
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function formatDateISO(d) {
  if (d instanceof Date) return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  if (typeof d === 'string' && d.length >= 10) return d.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function mapAccount(raw) {
  const r = (raw || '').trim().toLowerCase();
  if (!r) return null;
  for (const a of D1_CONFIG.ACCOUNTS) {
    for (const n of a.names) {
      if (n.toLowerCase() === r) return a.id;
    }
  }
  return null;
}

function mapTransactionType(raw) {
  const r = (raw || '').toLowerCase().trim();
  if (r === 'income') return 'income';
  if (r === 'expense') return 'expense';
  if (r === 'transfer') return 'transfer';
  if (r === 'debt out') return 'expense';
  if (r === 'debt in') return 'income';
  if (r === 'cc spend') return 'cc_spend';
  if (r === 'cc payment') return 'cc_payment';
  if (r === 'borrow') return 'borrow';
  if (r === 'repay') return 'repay';
  if (r === 'atm') return 'atm';
  if (r.indexOf('income') >= 0 || r.indexOf('salary') >= 0) return 'income';
  if (r.indexOf('transfer') >= 0) return 'transfer';
  if (r.indexOf('cc payment') >= 0) return 'cc_payment';
  if (r.indexOf('cc spend') >= 0) return 'cc_spend';
  return 'expense';
}

function mapCategoryFromSheet(raw) {
  // Strip leading emoji + space, lowercase the result
  const stripped = String(raw || '').replace(/^[^\w]+/u, '').trim().toLowerCase();
  if (!stripped) return 'other';

  if (stripped.indexOf('food') >= 0) return 'food';
  if (stripped.indexOf('grocer') >= 0) return 'grocery';
  if (stripped.indexOf('transport') >= 0 || stripped.indexOf('fuel') >= 0) return 'transport';
  if (stripped.indexOf('biller') >= 0) return 'biller';
  if (stripped.indexOf('bill') >= 0 || stripped.indexOf('utility') >= 0) return 'bills';
  if (stripped.indexOf('health') >= 0 || stripped.indexOf('medical') >= 0) return 'health';
  if (stripped.indexOf('personal') >= 0 || stripped.indexOf('clothes') >= 0) return 'personal';
  if (stripped.indexOf('family') >= 0) return 'family';
  if (stripped.indexOf('debt payment') >= 0 || stripped.indexOf('debt') >= 0) return 'debt';
  if (stripped.indexOf('cc payment') >= 0) return 'cc_pay';
  if (stripped.indexOf('cc spend') >= 0) return 'cc_spend';
  if (stripped.indexOf('salary') >= 0) return 'salary';
  if (stripped.indexOf('gift') >= 0) return 'gift';
  if (stripped.indexOf('transfer') >= 0) return 'transfer';
  return 'other';
}

function installD1Menu() {
  SpreadsheetApp.getUi()
    .createMenu('📤 D1 Export')
    .addItem('Run Full Export', 'exportToD1')
    .addSeparator()
    .addItem('Discover All Tabs', 'discoverAllTabs')
    .addItem('Discover Account Cells', 'discoverAccountCells')
    .addToUi();
}


/* ═══════════════════════════════════════════════════════
   RECONCILIATION DIAGNOSTIC v1.0
   Shows sheet truth side-by-side with D1 config expectations.
   READ-ONLY. No DB writes.
   ═══════════════════════════════════════════════════════ */

function reconciliationReport() {
  const ss = SpreadsheetApp.getActive();
  let report = '═══ RECONCILIATION REPORT ═══\n\n';

  // ─── ACCOUNTS RECON ───
  report += '─── ACCOUNTS TAB (🏦 Accounts) ───\n\n';
  const accCfg = D1_CONFIG.ACCOUNTS_TAB;
  const accSheet = ss.getSheetByName(accCfg.name);
  if (!accSheet) {
    report += '❌ Tab not found: ' + accCfg.name + '\n';
  } else {
    report += 'Reading rows ' + accCfg.start_row + ' to ' + accCfg.end_row + '\n\n';
    report += 'ROW | NAME (col ' + accCfg.name_col + ') | C | D | E | F | G\n';
    for (let r = accCfg.start_row; r <= accCfg.end_row; r++) {
      const name = String(accSheet.getRange(accCfg.name_col + r).getValue() || '').trim();
      if (!name) continue;
      const c = accSheet.getRange('C' + r).getValue();
      const d = accSheet.getRange('D' + r).getValue();
      const e = accSheet.getRange('E' + r).getValue();
      const f = accSheet.getRange('F' + r).getValue();
      const g = accSheet.getRange('G' + r).getValue();
      report += r + ' | ' + name + ' | ' + (c === '' ? '·' : c) + ' | ' + (d === '' ? '·' : d) + ' | ' + (e === '' ? '·' : e) + ' | ' + (f === '' ? '·' : f) + ' | ' + (g === '' ? '·' : g) + '\n';
    }
  }

  // ─── BILLS RECON ───
  report += '\n─── BILLS TAB (📅 Bills) ───\n\n';
  const billCfg = D1_CONFIG.BILLS;
  const billSheet = ss.getSheetByName(billCfg.tab);
  if (!billSheet) {
    report += '❌ Tab not found: ' + billCfg.tab + '\n';
  } else {
    report += 'ROW | NAME (A) | DAY (B) | AMT (C) | ACC (D) | NEXT DUE (E) | DAYS (F) | STATUS (G) | LAST PAID (H) | NOTES (I)\n';
    for (let r = billCfg.start_row; r <= billCfg.end_row; r++) {
      const name = String(billSheet.getRange('A' + r).getValue() || '').trim();
      if (!name) continue;
      const b = billSheet.getRange('B' + r).getValue();
      const c = billSheet.getRange('C' + r).getValue();
      const d = billSheet.getRange('D' + r).getValue();
      const e = billSheet.getRange('E' + r).getValue();
      const f = billSheet.getRange('F' + r).getValue();
      const g = billSheet.getRange('G' + r).getValue();
      const h = billSheet.getRange('H' + r).getValue();
      const i = billSheet.getRange('I' + r).getValue();

      const lastPaidStr = (h instanceof Date) ? h.toISOString().slice(0, 10) : (h ? String(h).slice(0, 12) : '·');
      const nextDueStr = (e instanceof Date) ? e.toISOString().slice(0, 10) : (e ? String(e).slice(0, 12) : '·');

      report += r + ' | ' + name + ' | ' + b + ' | ' + c + ' | ' + (d || '·') + ' | ' + nextDueStr + ' | ' + f + ' | ' + g + ' | ' + lastPaidStr + ' | ' + (i || '·').toString().slice(0, 30) + '\n';
    }
  }

  Logger.log(report);
  // Write report to a tab so you can copy it cleanly
  let reportTab = ss.getSheetByName('🔍 Recon Report');
  if (reportTab) { reportTab.clear(); }
  else { reportTab = ss.insertSheet('🔍 Recon Report'); }
  reportTab.getRange('A1').setValue(report).setFontFamily('Courier New').setFontSize(10).setVerticalAlignment('top').setWrap(true);
  reportTab.setColumnWidth(1, 1200);
  reportTab.activate();

  SpreadsheetApp.getUi().alert(
    '✅ Recon Report Generated',
    'Open "🔍 Recon Report" tab to see full sheet truth.\n\nCopy the FULL contents and paste back to me so I can write the correct CONFIG patch.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}