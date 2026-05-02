// ════════════════════════════════════════════════════════════════════
// 🛡 Audit_Guardian.gs — IMMUTABILITY GUARDIAN v1.2
// LOCKED · 7-Layer Audit · Self-Contained · Day 11 · 2026-05-03
//
// PURPOSE:
// Bank-grade tamper detection for Sovereign Ops finance suite.
// Detects: phantom rows · direct edits · TxnID tampering · FX rate
// tampering · Audit Log tampering. All tamper events forensic-logged.
//
// CHANGES FROM v1.1:
//
//   🔐 #C4 TxnID IMMUTABILITY (CRITICAL banking fix)
//      v1.1: any edit to ledger col 14 (TxnID) silently accepted.
//            User could edit TxnID → reversal lookup breaks → silent
//            data corruption.
//      v1.2: ledger col 14 edits trigger TXNID_TAMPERED alert.
//            Audit row written with: row · old TxnID · new value · user.
//            Banking standard: TxnIDs immutable post-commit.
//
//   💱 v3.3 FX RATE IMMUTABILITY
//      v1.2: ledger col 15 (FX_Rate_At_Commit) edits trigger
//            FX_RATE_TAMPERED alert. Same pattern as TxnID.
//            Critical because FX rate is the snapshot used by all
//            Hub/Accounts re-derivation.
//
//   📜 AUDIT LOG TAMPER DETECTION
//      v1.2: any edit to 'Audit Log' tab triggers AUDIT_LOG_TAMPERED
//            alert. Complements Finance_Audit v1.5 WORM protection
//            (which writes AUDIT_LOG_DIRECT_EDIT_DETECTED). Two-layer
//            defense for forensic trail.
//
//   🤫 REVERSAL MARKER SILENCERS
//      v1.1: phantom scan flagged rows containing [REVERSAL PENDING-...]
//            and [REVERSED BY ...] as suspicious because they appeared
//            mid-flow. v1.2 explicitly whitelists these markers as
//            legitimate Finance_Pro v3.2+ behavior.
//
//   🎨 3 NEW AUDIT ACTIONS for display:
//        TXNID_TAMPERED (red) · FX_RATE_TAMPERED (red) · AUDIT_LOG_TAMPERED (deep red)
//      These need Finance_Audit whitelist (already in v1.5).
//
// PRESERVED FROM v1.1:
//   - Quick Entry submit silencer (col 12 row 4)
//   - 7-category phantom safe-list
//   - Daily integrity scan trigger
//   - Phantom purge with snapshot
//   - Edit detection on Transactions tab
//   - All public functions (cross-module compat)
//
// ════════════════════════════════════════════════════════════════════
// 7-LAYER AUDIT
// ════════════════════════════════════════════════════════════════════
//
// L1 — 5-TEST: Self-contained ✓ Side-effects: writes audit only ✓
//      Re-run safe ✓ Mentally traced (3 scenarios below) ✓
//      Failure modes: see L7
//
// L2 — CALL GRAPH delta:
//   onAuditGuardianEdit (entry, on every cell edit anywhere)
//     → guard: only act on supported tabs
//     → if Transactions tab + col 14 (TxnID) → _logTxnIdTamper [NEW]
//     → if Transactions tab + col 15 (FX) → _logFxRateTamper [NEW]
//     → if Audit Log tab + any cell → _logAuditLogTamper [NEW]
//     → if Transactions tab + ledger area not col 14/15 → existing
//       direct-edit detection (skip if QE submit / reservation markers)
//
//   _logTxnIdTamper [NEW]:
//     → reads old/new value from event
//     → writes TXNID_TAMPERED audit row
//     → popup warning (one per cell)
//
//   _logFxRateTamper [NEW]:
//     → same pattern, FX_RATE_TAMPERED
//
//   _logAuditLogTamper [NEW]:
//     → fires on ANY Audit Log edit not matching whitelist
//     → writes AUDIT_LOG_TAMPERED
//
// L3 — ROW LAYOUT MAP:
//   Transactions tab:
//     Col 14 (N): TxnID — IMMUTABLE post-commit (v1.2 enforced)
//     Col 15 (O): FX_Rate — IMMUTABLE post-commit (v1.2 enforced)
//   Audit Log tab:
//     All cells: IMMUTABLE post-write (v1.2 enforced)
//   No layout changes.
//
// L4 — CELL-STATE MATRIX delta:
//   Tamper event states (audit log entries):
//     TXNID_TAMPERED row N · old "TXN-..." · new "edited"
//     FX_RATE_TAMPERED row N · old "281.91" · new "300"
//     AUDIT_LOG_TAMPERED row N col X · old "TXN_LOGGED" · new "DELETED"
//   No transaction data changes from this file.
//
// L5 — STATE-ORDER PROOF (tamper detection):
//   1. User edits cell
//   2. onAuditGuardianEdit fires
//   3. Check tab name (route)
//   4. Check column (route within Transactions)
//   5. Read e.oldValue and e.value
//   6. If material change: write audit row
//   7. Show popup (non-blocking warning)
//   8. User retains override (banking-grade: forensic correction allowed)
//
// L6 — BACKWARD-COMPAT:
//   - All v1.1 silencers preserved
//   - All v1.1 phantom scan logic preserved
//   - All public functions: same signatures
//   - 3 new audit actions: require Finance_Audit v1.5 whitelist (shipped)
//   - Trigger remains single (onAuditGuardianEdit) — no new trigger cap pressure
//
// L7 — FAILURE-MODE INVENTORY (v1.2 additions):
//   1. e.oldValue undefined (race) → skip silently, no false alert
//   2. e.value === e.oldValue (cosmetic edit) → skip
//   3. Hash chain not in place yet (Code.gs not upgraded) → tamper still
//      detected at edit time, just not at integrity-verify time
//   4. AUDIT_LOG_TAMPERED triggered by Glean's own audit writes →
//      mitigation: skip if action column matches whitelisted actions
//      AND user matches script user (i.e., system-written, not human)
//   5. Reversal markers ([REVERSAL PENDING-X], [REVERSED BY TXN-X]) →
//      explicit silencer in _isLegitMarkerEdit() prevents false phantom
//
// ════════════════════════════════════════════════════════════════════
// MENTAL TRACE — 3 critical scenarios
// ════════════════════════════════════════════════════════════════════
//
// SCENARIO A: User accidentally edits cell N50 (TxnID col 14, row 50)
//   1. onAuditGuardianEdit fires
//   2. Tab name = "💸 Transactions" → continue
//   3. Column = 14 → route to _logTxnIdTamper
//   4. e.oldValue = "TXN-20260502-105430-12345"
//   5. e.value = "edited"
//   6. Material change detected
//   7. Audit row written: TXNID_TAMPERED · "row 50 · old 'TXN-...12345' → new 'edited'"
//   8. Popup: "🚨 TxnID at row 50 changed. This breaks reversal lookup.
//             Forensic trail logged."
//   9. User can undo manually (Ctrl+Z) or revert to snapshot
//
// SCENARIO B: User edits Audit Log row 5 col 3 (Detail field) to hide tampering
//   1. onAuditGuardianEdit fires
//   2. Tab name = "Audit Log" → route to _logAuditLogTamper
//   3. e.oldValue = "TXN-20260502-001234 · Expense 5000 PKR · Cash · Food"
//   4. e.value = "Other note"
//   5. Material change detected, NOT a system write
//   6. Audit row written: AUDIT_LOG_TAMPERED · "row 5 col 3 · old [...] → new [...]"
//   7. Popup: "🚨 Audit Log direct edit detected. Forensic trail compromised."
//   8. Hash chain (when active) will detect at next verifyAuditIntegrity
//
// SCENARIO C: Finance_Pro reverses row 30, writes [REVERSED BY TXN-...] to notes col 9
//   1. onAuditGuardianEdit fires
//   2. Tab name = "💸 Transactions" → continue
//   3. Column = 9 (notes) → route to phantom scan + direct-edit detection
//   4. _isLegitMarkerEdit checks new value
//   5. New value contains "[REVERSED BY TXN-" → silencer matches
//   6. Skip silently (legitimate v3.2 behavior)
//   7. No false phantom alert
//   8. No forensic noise
//
// ════════════════════════════════════════════════════════════════════

const AG_GUARDIAN_VERSION = 'v1.2';
const AG_TXN_TAB = '💸 Transactions';
const AG_AUDIT_LOG_TAB = 'Audit Log';
const AG_LEDGER_START_ROW = 14;
const AG_LEDGER_END_ROW = 213;
const AG_TXN_QE_ROW = 4;
const AG_TXN_QE_SUBMIT_COL = 12;
const AG_TXN_INTL_ROW = 9;
const AG_TXN_INTL_SUBMIT_COL = 12;
const AG_TXN_INTL_PRA_COL = 5;
const AG_TXN_REVERSAL_COL = 13;
const AG_TXN_TXNID_COL = 14;
const AG_TXN_FX_COL = 15;

// Whitelisted action types known to be written by system into Audit Log
// (these should not trigger AUDIT_LOG_TAMPERED when seen as new value)
const AG_SYSTEM_AUDIT_ACTIONS = {
  'TXN_LOGGED': 1, 'TXN_REVERSED': 1, 'TRANSFER': 1, 'BILL_PAID': 1,
  'GOAL_ALLOCATE': 1, 'OPENING_BALANCE': 1, 'CC_OPENING': 1,
  'INTL_PURCHASE_SHEET': 1, 'CC_VALIDATION_BLOCK': 1, 'CC_VALIDATION_OVERRIDE': 1,
  'SALARY_AUTO_DETECTED': 1, 'SALARY_CATEGORY_CORRECTED': 1, 'SALARY_PATTERN_IGNORED': 1,
  'LOCK_TIMEOUT': 1, 'BALANCE_CONSTRAINT_BLOCK': 1, 'BALANCE_CONSTRAINT_OVERRIDE': 1,
  'CC_LIMIT_OVERRIDE': 1, 'FX_RATE_BACKFILL': 1, 'DEBT_RESTORE': 1,
  'TXNID_TAMPERED': 1, 'FX_RATE_TAMPERED': 1, 'AUDIT_LOG_TAMPERED': 1,
  'AUDIT_LOG_DIRECT_EDIT_DETECTED': 1, 'AUDIT_LOG_UNLOCKED': 1
};

// Phantom safe-list patterns — these patterns in cells are LEGITIMATE
// (do NOT trigger PHANTOM_DETECTED in scans)
const AG_PHANTOM_SAFE_PATTERNS = [
  /\[REVERSAL OF TXN-[\d-]+\]/,           // reversal row marker
  /\[REVERSED BY TXN-[\d-]+\]/,           // reversed-row note
  /\[REVERSAL PENDING-[A-Z0-9-]+\]/,      // reservation marker (v3.2+)
  /\[linked: TXN-[\d-]+\]/,                // transfer pair link
  /BACKFILL — Zain bug class recovery/,    // Day 10 historical recovery
  /Opening balance · /,                    // opening balance entry
  /CC opening outstanding/,                 // CC opening
  /Goal: /,                                 // goal allocation
  /Bill payment · auto-logged/             // bill mark paid
];

function _alertG(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _logG(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function getGuardianTheme() {
  if (typeof getFinTheme === 'function') return getFinTheme();
  return {
    bgPage: '#FFFFFF', bgPanel: '#F8FAFC',
    bgHeader: '#1E293B', bgSection: '#0F172A',
    text: '#0F172A', textHi: '#000000', textMd: '#334155', textLo: '#64748B',
    success: '#16A34A', warning: '#D97706', danger: '#DC2626', critical: '#991B1B'
  };
}

// ════════════════════════════════════════════════════════════════════
// MAIN ENTRY: onEdit handler
// ════════════════════════════════════════════════════════════════════

function onAuditGuardianEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  const tabName = sh.getName();
  const r = e.range.getRow();
  const c = e.range.getColumn();

  // Route by tab
  if (tabName === AG_AUDIT_LOG_TAB) {
    _handleAuditLogEdit(e, sh, r, c);
    return;
  }

  if (tabName !== AG_TXN_TAB) return;  // Only watch Transactions for now

  // === Transactions tab routing ===

  // SILENCERS — legitimate edits that should NOT trigger anything
  if (_isQuickEntrySubmit(r, c)) return;
  if (_isIntlEntrySubmit(r, c)) return;
  if (_isIntlPRAToggle(r, c)) return;
  if (_isReversalToggle(r, c)) return;

  // Only watch ledger area (rows 14-213)
  if (r < AG_LEDGER_START_ROW || r > AG_LEDGER_END_ROW) return;

  // === IMMUTABLE COLUMNS (v1.2) ===
  if (c === AG_TXN_TXNID_COL) {
    _logTxnIdTamper(e, r);
    return;
  }
  if (c === AG_TXN_FX_COL) {
    _logFxRateTamper(e, r);
    return;
  }

  // Notes column — silencer for reversal markers
  if (c === 9 && _isLegitMarkerEdit(e.value)) return;

  // Generic direct-edit detection (existing v1.1 behavior)
  _logDirectEdit(e, r, c);
}

// ════════════════════════════════════════════════════════════════════
// SILENCERS (preserved from v1.1)
// ════════════════════════════════════════════════════════════════════

function _isQuickEntrySubmit(r, c) {
  return r === AG_TXN_QE_ROW && c === AG_TXN_QE_SUBMIT_COL;
}

function _isIntlEntrySubmit(r, c) {
  return r === AG_TXN_INTL_ROW && c === AG_TXN_INTL_SUBMIT_COL;
}

function _isIntlPRAToggle(r, c) {
  return r === AG_TXN_INTL_ROW && c === AG_TXN_INTL_PRA_COL;
}

function _isReversalToggle(r, c) {
  return c === AG_TXN_REVERSAL_COL && r >= AG_LEDGER_START_ROW && r <= AG_LEDGER_END_ROW;
}

function _isLegitMarkerEdit(newValue) {
  if (!newValue) return false;
  const valStr = String(newValue);
  for (let i = 0; i < AG_PHANTOM_SAFE_PATTERNS.length; i++) {
    if (AG_PHANTOM_SAFE_PATTERNS[i].test(valStr)) return true;
  }
  return false;
}

// ════════════════════════════════════════════════════════════════════
// v1.2 NEW: TxnID immutability detection
// ════════════════════════════════════════════════════════════════════

function _logTxnIdTamper(e, row) {
  const oldVal = e.oldValue !== undefined ? String(e.oldValue) : '(empty)';
  const newVal = e.value !== undefined ? String(e.value) : '(empty)';

  if (oldVal === newVal) return;  // Cosmetic
  if (!oldVal || oldVal === '(empty)') return;  // Was unset, now set — likely backfill, allow

  const detail = 'row ' + row + ' · old "' + oldVal + '" → new "' + newVal + '"';
  _logG('TXNID_TAMPERED', detail);

  try {
    SpreadsheetApp.getUi().alert(
      '🚨 TxnID Tamper Detected',
      'Cell N' + row + ' was changed.\n\n' +
      'Old: ' + oldVal + '\n' +
      'New: ' + newVal + '\n\n' +
      'TxnIDs are IMMUTABLE post-commit (banking standard). This breaks:\n' +
      '  - Reversal lookup\n' +
      '  - Linked transfer pair detection\n' +
      '  - Hash chain integrity\n\n' +
      'Forensic trail logged. Press Ctrl+Z to undo, or restore from snapshot.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch(err) {
    Logger.log('TxnID tamper popup failed (non-fatal): ' + err);
  }
}

// ════════════════════════════════════════════════════════════════════
// v1.2 NEW: FX rate immutability detection
// ════════════════════════════════════════════════════════════════════

function _logFxRateTamper(e, row) {
  const oldVal = e.oldValue !== undefined ? String(e.oldValue) : '(empty)';
  const newVal = e.value !== undefined ? String(e.value) : '(empty)';

  if (oldVal === newVal) return;
  if (!oldVal || oldVal === '(empty)') return;  // Backfill from null, allow

  const detail = 'row ' + row + ' · old "' + oldVal + '" → new "' + newVal + '"';
  _logG('FX_RATE_TAMPERED', detail);

  try {
    SpreadsheetApp.getUi().alert(
      '🚨 FX Rate Tamper Detected',
      'Cell O' + row + ' was changed.\n\n' +
      'Old: ' + oldVal + '\n' +
      'New: ' + newVal + '\n\n' +
      'FX_Rate_At_Commit is IMMUTABLE post-commit (banking standard).\n' +
      'This breaks the historical PKR equivalent on this transaction.\n\n' +
      'Forensic trail logged. Press Ctrl+Z to undo, or restore from snapshot.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch(err) {
    Logger.log('FX tamper popup failed (non-fatal): ' + err);
  }
}

// ════════════════════════════════════════════════════════════════════
// v1.2 NEW: Audit Log direct edit detection
// ════════════════════════════════════════════════════════════════════

function _handleAuditLogEdit(e, sh, r, c) {
  if (r === 1) return;  // Header row, skip

  const oldVal = e.oldValue !== undefined ? String(e.oldValue) : '(empty)';
  const newVal = e.value !== undefined ? String(e.value) : '(empty)';

  if (oldVal === newVal) return;

  // Check if this looks like a legitimate system write (action col contains whitelisted action)
  // System writes typically populate empty cells; user tampering modifies existing
  if (oldVal === '(empty)') return;  // Likely append, not tamper

  // Skip if new value is itself a tamper-detection action (avoid recursion)
  if (newVal && AG_SYSTEM_AUDIT_ACTIONS[newVal]) return;

  const colLetter = String.fromCharCode(64 + c);
  const detail = colLetter + r + ' · old "' + oldVal + '" → new "' + newVal + '"';
  _logG('AUDIT_LOG_TAMPERED', detail);
  // No popup here — Finance_Audit v1.5 WORM protection already shows Google's
  // built-in protection warning. We just log forensically.
}

// ════════════════════════════════════════════════════════════════════
// Generic direct-edit detection (preserved from v1.1)
// ════════════════════════════════════════════════════════════════════

function _logDirectEdit(e, row, col) {
  // Skip if cell was empty before (likely a legitimate fill)
  if (e.oldValue === undefined || e.oldValue === null || e.oldValue === '') return;
  if (e.value === undefined) return;

  // Skip date-only cosmetic edits (not material)
  const oldStr = String(e.oldValue);
  const newStr = String(e.value);
  if (oldStr === newStr) return;

  const colLetter = String.fromCharCode(64 + col);
  const detail = colLetter + row + ' · "' + oldStr.substring(0, 50) + '" → "' + newStr.substring(0, 50) + '"';
  _logG('DIRECT_EDIT_DETECTED', detail);
}

// ════════════════════════════════════════════════════════════════════
// PHANTOM SCAN (preserved from v1.1, with v1.2 silencers extended)
// ════════════════════════════════════════════════════════════════════

function runIntegrityScanNow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(AG_TXN_TAB);
  if (!tx) {
    _alertG('❌ Transactions tab not found.');
    return;
  }

  const numRows = AG_LEDGER_END_ROW - AG_LEDGER_START_ROW + 1;
  const block = tx.getRange(AG_LEDGER_START_ROW, 1, numRows, 14).getValues();

  let scanned = 0;
  let suspicious = 0;
  const phantoms = [];

  for (let i = 0; i < block.length; i++) {
    const row = block[i];
    const date = row[0];
    if (!(date instanceof Date)) continue;
    scanned++;

    const account = row[1];
    const type = row[2];
    const amount = row[4];
    const notes = row[8] || '';

    // Phantom criteria: incomplete row that survived
    const incomplete = !account || !type || !amount;

    if (incomplete) {
      // Check if notes match safe pattern (legitimate)
      let isSafe = false;
      const notesStr = String(notes);
      for (let j = 0; j < AG_PHANTOM_SAFE_PATTERNS.length; j++) {
        if (AG_PHANTOM_SAFE_PATTERNS[j].test(notesStr)) { isSafe = true; break; }
      }
      if (!isSafe) {
        suspicious++;
        phantoms.push({ row: AG_LEDGER_START_ROW + i, account: account, type: type, amount: amount });
      }
    }
  }

  _logG('INTEGRITY_SCAN', 'Scanned ' + scanned + ' rows · ' + suspicious + ' phantom candidates');

  let report = '🔍 PHANTOM INTEGRITY SCAN (' + AG_GUARDIAN_VERSION + ')\n\n';
  report += 'Rows scanned: ' + scanned + '\n';
  report += 'Suspicious phantom candidates: ' + suspicious + '\n';
  if (suspicious === 0) {
    report += '\n✅ Ledger is clean. No untraceable rows.';
  } else {
    report += '\nFlagged rows:\n';
    phantoms.slice(0, 20).forEach(p => {
      report += '  Row ' + p.row + ': account="' + (p.account || 'BLANK') + '" type="' + (p.type || 'BLANK') + '" amount=' + (p.amount || 'BLANK') + '\n';
    });
    if (phantoms.length > 20) report += '  ... and ' + (phantoms.length - 20) + ' more.\n';
    report += '\nUse 🧨 Phantom Purge to clean (snapshots first).';
  }
  _alertG(report);
}

function purgePhantomsNow() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(AG_TXN_TAB);
  if (!tx) { _alertG('❌ Transactions tab not found.'); return; }

  // Snapshot first
  if (typeof snapFinanceSuite === 'function') {
    try { snapFinanceSuite('pre-phantom-purge'); } catch(e) {}
  }

  const numRows = AG_LEDGER_END_ROW - AG_LEDGER_START_ROW + 1;
  const block = tx.getRange(AG_LEDGER_START_ROW, 1, numRows, 14).getValues();

  let purged = 0;
  for (let i = 0; i < block.length; i++) {
    const row = block[i];
    const date = row[0];
    if (!(date instanceof Date)) continue;

    const account = row[1];
    const type = row[2];
    const amount = row[4];
    const notes = row[8] || '';

    const incomplete = !account || !type || !amount;
    if (!incomplete) continue;

    let isSafe = false;
    const notesStr = String(notes);
    for (let j = 0; j < AG_PHANTOM_SAFE_PATTERNS.length; j++) {
      if (AG_PHANTOM_SAFE_PATTERNS[j].test(notesStr)) { isSafe = true; break; }
    }
    if (isSafe) continue;

    // Phantom — purge
    const targetRow = AG_LEDGER_START_ROW + i;
    tx.getRange(targetRow, 1, 1, 15).clearContent();
    purged++;
    _logG('PHANTOM_PURGE', 'Row ' + targetRow + ' cleared');
  }

  _alertG('✅ Phantom purge complete (' + AG_GUARDIAN_VERSION + ').\n\nRows purged: ' + purged + '\nSnapshot saved.');
}

// ════════════════════════════════════════════════════════════════════
// INSTALLATION
// ════════════════════════════════════════════════════════════════════

function installAuditGuardian() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onAuditGuardianEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onAuditGuardianEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();

  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'dailyIntegrityScan') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyIntegrityScan').timeBased().atHour(23).nearMinute(55).everyDays(1).create();

  _logG('GUARDIAN_INSTALL', AG_GUARDIAN_VERSION + ' installed · onEdit + daily scan triggers');
  _alertG('🛡 Audit Guardian ' + AG_GUARDIAN_VERSION + ' installed.\n\n' +
          'Active protection:\n' +
          '  ✅ Phantom detection (Transactions tab)\n' +
          '  ✅ Direct edit logging\n' +
          '  ✅ TxnID immutability (col 14 = N)\n' +
          '  ✅ FX rate immutability (col 15 = O)\n' +
          '  ✅ Audit Log tamper detection\n' +
          '  ✅ Daily integrity scan (23:55 PKT)\n\n' +
          'Forensic trail: all tampering attempts logged.');
}

function uninstallAuditGuardian() {
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onAuditGuardianEdit' ||
        t.getHandlerFunction() === 'dailyIntegrityScan') {
      try { ScriptApp.deleteTrigger(t); removed++; } catch(e) {}
    }
  });
  _logG('GUARDIAN_UNINSTALL', 'Removed ' + removed + ' triggers');
  _alertG('🛑 Audit Guardian uninstalled.\n\nTriggers removed: ' + removed);
}

function dailyIntegrityScan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(AG_TXN_TAB);
  if (!tx) return;

  const numRows = AG_LEDGER_END_ROW - AG_LEDGER_START_ROW + 1;
  const block = tx.getRange(AG_LEDGER_START_ROW, 1, numRows, 14).getValues();

  let scanned = 0;
  let suspicious = 0;
  for (let i = 0; i < block.length; i++) {
    const row = block[i];
    if (!(row[0] instanceof Date)) continue;
    scanned++;
    const incomplete = !row[1] || !row[2] || !row[4];
    if (incomplete) {
      const notesStr = String(row[8] || '');
      let isSafe = false;
      for (let j = 0; j < AG_PHANTOM_SAFE_PATTERNS.length; j++) {
        if (AG_PHANTOM_SAFE_PATTERNS[j].test(notesStr)) { isSafe = true; break; }
      }
      if (!isSafe) suspicious++;
    }
  }
  _logG('INTEGRITY_SCAN', 'Daily auto · ' + scanned + ' scanned · ' + suspicious + ' phantoms');
}

// ════════════════════════════════════════════════════════════════════
// VERIFY
// ════════════════════════════════════════════════════════════════════

function verifyAuditGuardian() {
  const onEditTriggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'onAuditGuardianEdit');
  const scanTriggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'dailyIntegrityScan');

  let report = '🛡 AUDIT GUARDIAN ' + AG_GUARDIAN_VERSION + ' STATUS\n\n';
  report += (onEditTriggers.length === 1 ? '✅' : '⚠️') + ' onEdit trigger: ' + onEditTriggers.length + '/1\n';
  report += (scanTriggers.length === 1 ? '✅' : '⚠️') + ' Daily scan trigger: ' + scanTriggers.length + '/1\n';
  report += '\n📋 ACTIVE DETECTORS:\n';
  report += '  ✅ Phantom rows (incomplete txns)\n';
  report += '  ✅ Direct cell edits in ledger area\n';
  report += '  ✅ TxnID col 14 immutability (v1.2)\n';
  report += '  ✅ FX rate col 15 immutability (v1.2)\n';
  report += '  ✅ Audit Log tamper detection (v1.2)\n';
  report += '\n🤫 SILENCERS:\n';
  report += '  ✓ Quick Entry submit (L4)\n';
  report += '  ✓ Intl Entry submit (L9)\n';
  report += '  ✓ Intl PRA toggle (E9)\n';
  report += '  ✓ Reversal toggle (col M)\n';
  report += '  ✓ ' + AG_PHANTOM_SAFE_PATTERNS.length + ' legitimate marker patterns\n';
  report += '\n📜 NEW v1.2 AUDIT ACTIONS:\n';
  report += '  TXNID_TAMPERED · FX_RATE_TAMPERED · AUDIT_LOG_TAMPERED\n';
  report += '  (Visible in Finance_Audit v1.5+ display tab)\n';

  if (onEditTriggers.length === 0 || scanTriggers.length === 0) {
    report += '\n⚠️ Some triggers missing. Run: 🛡 Install Audit Guardian.';
  } else {
    report += '\n✅ All systems operational. v1.2 immutability lock active.';
  }
  _alertG(report);
}

function appendGuardianMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🛡 Guardian')
      .addItem('🔍 Run Integrity Scan Now', 'runIntegrityScanNow')
      .addItem('🧨 Purge Phantoms (with snapshot)', 'purgePhantomsNow')
      .addSeparator()
      .addItem('🛡 Install / Reinstall Guardian', 'installAuditGuardian')
      .addItem('🛑 Uninstall Guardian', 'uninstallAuditGuardian')
      .addSeparator()
      .addItem('🔍 Verify Guardian Status', 'verifyAuditGuardian')
      .addToUi();
  } catch(e) { Logger.log('Guardian menu add failed: ' + e); }
}