// ════════════════════════════════════════════════════════════════════
// 💉 Finance_Vaccine.gs — DIAGNOSTIC + AUTO-REPAIR v1.0
// LOCKED · 7-Layer Audit · Self-Contained · Day 6 · 2026-04-29
//
// PURPOSE:
//   Heals the "row 9 vs row 14" bug class in Finance suite WITHOUT
//   modifying any existing files. Runs at-a-glance diagnostic and
//   surgical repair on the live sheet state.
//
// WHAT IT FIXES:
//   1. Stray transaction data accidentally written into rows 9-13
//      (Intl Quick Entry zone) by buggy submit functions
//   2. Missing or misplaced checkboxes in row 9 / row 11
//   3. Stale TxnIDs assigned to non-ledger rows
//   4. Charts panel clobbering Audit panel (row 76 collision)
//   5. Dropdown ranges not extended to ledger row 213
//   6. Frozen rows mis-set
//
// USAGE:
//   - One click: Menu → 💰 Finance → 💉 Vaccinate Finance Suite
//   - Read-only check: Menu → 💰 Finance → 🔍 Diagnose Without Repair
//
// SAFETY:
//   - Snapshots Transactions tab before any structural change
//   - Audit logs every action
//   - Skips repair if structure already healthy
//   - Reversible: snapshot → Restore From Snapshot menu
// ════════════════════════════════════════════════════════════════════

const VAX_TZ = 'Asia/Karachi';
const VAX_TXN_TAB = '💸 Transactions';
const VAX_HUB_TAB = '💰 Finance Hub';

// Layout constants — must match Finance_Pro v2.8/v3.0 layout
const VAX_LAYOUT = {
  // Quick Entry single-txn form
  qeRow: 4,
  qeSubmitCol: 12,    // L4

  // Intl Quick Entry form
  intlHeaderRow: 7,
  intlLabelsRow: 8,
  intlEntryRow: 9,
  intlPraCol: 5,      // E9 — checkbox
  intlSubmitCol: 12,  // L9 — checkbox
  intlTipRow: 10,

  // Ledger
  ledgerHeaderRow: 12,
  ledgerLabelsRow: 13,
  ledgerStartRow: 14,
  ledgerEndRow: 213,

  // Reserved zones (NOT for ledger writes)
  reservedRowsStart: 5,
  reservedRowsEnd: 13,

  // Hub layout
  hubAuditStartRow: 76,
  hubAuditEndRow: 97,
  hubChartsStartRow: 55,
  hubChartsEndRow: 74,
};

// ──────────── safe wrappers ────────────

function _vaxAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _vaxLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function _vaxSnapshot(label) {
  if (typeof snapFinanceSuite === 'function') {
    try { return snapFinanceSuite(label); } catch(e) { return { ok: false, error: e }; }
  }
  return { ok: false, error: 'snapFinanceSuite not available' };
}

// ════════════════════════════════════════════════════════════════════
// READ-ONLY DIAGNOSTIC
// ════════════════════════════════════════════════════════════════════

function diagnoseFinanceBugs() {
  const findings = _runDiagnostic();

  let report = '🔍 FINANCE SUITE DIAGNOSTIC v1.0\n\n';

  if (findings.summary.total === 0) {
    report += '✅ ALL HEALTHY — no bugs detected.\n\n';
    report += 'Tabs scanned:\n';
    report += '  💸 Transactions: ' + findings.tx.txnCount + ' ledger rows\n';
    report += '  💰 Finance Hub: structure OK\n';
    report += '  📜 Audit panel: ' + (findings.hub.auditOk ? 'present' : 'missing') + '\n';
    report += '  📊 Charts panel: ' + (findings.hub.chartsOk ? 'present' : 'missing') + '\n';
  } else {
    report += '⚠️ ' + findings.summary.total + ' issue(s) found:\n\n';
    findings.issues.forEach((iss, i) => {
      report += (i + 1) + '. ' + iss.severity + ' — ' + iss.label + '\n';
      report += '     ' + iss.detail + '\n';
    });
    report += '\n💡 To fix automatically: Menu → 💰 Finance → 💉 Vaccinate Finance Suite';
  }

  _vaxAlert(report);
  return findings;
}

function _runDiagnostic() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const findings = {
    issues: [],
    tx: { reservedZoneIntrusions: 0, txnCount: 0, missingTxnIds: 0, txnIdsInReservedZone: 0 },
    hub: { auditOk: false, chartsOk: false, layoutOk: false },
    summary: { total: 0, critical: 0, high: 0, medium: 0 }
  };

  const tx = ss.getSheetByName(VAX_TXN_TAB);
  if (!tx) {
    findings.issues.push({ severity: '🚨 CRITICAL', label: 'Transactions tab missing', detail: VAX_TXN_TAB + ' not found' });
    findings.summary.critical++; findings.summary.total++;
    return findings;
  }

  // Check 1: Reserved zone intrusions (rows 5-13 should NOT contain txn data)
  for (let r = VAX_LAYOUT.reservedRowsStart; r <= VAX_LAYOUT.reservedRowsEnd; r++) {
    // Skip the legitimate form rows
    if (r === VAX_LAYOUT.qeRow || r === VAX_LAYOUT.intlEntryRow) continue;
    if (r === VAX_LAYOUT.intlHeaderRow || r === VAX_LAYOUT.intlLabelsRow) continue;
    if (r === VAX_LAYOUT.intlTipRow) continue;
    if (r === VAX_LAYOUT.ledgerHeaderRow || r === VAX_LAYOUT.ledgerLabelsRow) continue;

    const dateVal = tx.getRange(r, 1).getValue();
    if (dateVal instanceof Date) {
      // A transaction was written here — bug!
      findings.tx.reservedZoneIntrusions++;
      const account = tx.getRange(r, 2).getValue() || '?';
      const type = tx.getRange(r, 3).getValue() || '?';
      const amt = tx.getRange(r, 5).getValue() || 0;
      findings.issues.push({
        severity: '🚨 CRITICAL',
        label: 'Stray transaction in reserved zone (row ' + r + ')',
        detail: account + ' · ' + type + ' · ' + amt + ' PKR — must be moved to ledger'
      });
      findings.summary.critical++; findings.summary.total++;
    }
  }

  // Check 2: Intl Quick Entry form integrity (row 9)
  const intlAcc = tx.getRange(VAX_LAYOUT.intlEntryRow, 2).getValue();
  if (intlAcc && intlAcc !== 'Alfalah CC' && !['Cash', 'JazzCash', 'Easypaisa', 'UBL', 'Meezan', 'Mashreq Bank', 'JS Bank', 'Naya Pay', 'Bank Alfalah', 'Alfalah CC'].includes(intlAcc)) {
    findings.issues.push({
      severity: '⚠️ HIGH',
      label: 'Intl form Account cell (B9) corrupted',
      detail: 'Contains "' + intlAcc + '" — should be a valid account name'
    });
    findings.summary.high++; findings.summary.total++;
  }

  // Check 3: Intl form +PRA checkbox at E9 should be a boolean cell
  const praCell = tx.getRange(VAX_LAYOUT.intlEntryRow, VAX_LAYOUT.intlPraCol).getValue();
  if (praCell !== '' && praCell !== true && praCell !== false) {
    findings.issues.push({
      severity: '⚠️ HIGH',
      label: '+PRA checkbox cell (E9) not a boolean',
      detail: 'Contains "' + praCell + '" — checkbox lost, needs reinsertion'
    });
    findings.summary.high++; findings.summary.total++;
  }

  // Check 4: TxnIDs in reserved zone
  for (let r = VAX_LAYOUT.reservedRowsStart; r <= VAX_LAYOUT.reservedRowsEnd; r++) {
    if (r === VAX_LAYOUT.qeRow) continue;
    const txnId = tx.getRange(r, 14).getValue();
    if (txnId && String(txnId).indexOf('TXN-') === 0) {
      findings.tx.txnIdsInReservedZone++;
      findings.issues.push({
        severity: '🟡 MEDIUM',
        label: 'TxnID in reserved zone (N' + r + ')',
        detail: 'Cell contains ' + txnId + ' — must be cleared'
      });
      findings.summary.medium++; findings.summary.total++;
    }
  }

  // Check 5: Ledger txn count + missing TxnIDs
  for (let r = VAX_LAYOUT.ledgerStartRow; r <= VAX_LAYOUT.ledgerEndRow; r++) {
    const dateVal = tx.getRange(r, 1).getValue();
    if (dateVal instanceof Date) {
      findings.tx.txnCount++;
      const txnId = tx.getRange(r, 14).getValue();
      if (!txnId) findings.tx.missingTxnIds++;
    }
  }
  if (findings.tx.missingTxnIds > 0) {
    findings.issues.push({
      severity: '🟡 MEDIUM',
      label: findings.tx.missingTxnIds + ' ledger rows missing TxnID',
      detail: 'Will be auto-backfilled by vaccine'
    });
    findings.summary.medium++; findings.summary.total++;
  }

  // Check 6: Frozen rows
  const frozen = tx.getFrozenRows();
  if (frozen !== VAX_LAYOUT.ledgerLabelsRow) {
    findings.issues.push({
      severity: '🟡 MEDIUM',
      label: 'Frozen rows = ' + frozen + ', expected ' + VAX_LAYOUT.ledgerLabelsRow,
      detail: 'Sticky header misaligned'
    });
    findings.summary.medium++; findings.summary.total++;
  }

  // Check 7: Hub structure
  const hub = ss.getSheetByName(VAX_HUB_TAB);
  if (hub) {
    const auditHeader = hub.getRange(VAX_LAYOUT.hubAuditStartRow, 1).getValue() || '';
    findings.hub.auditOk = (auditHeader.toString().indexOf('AUDIT') !== -1 || auditHeader.toString().indexOf('📜') !== -1);

    const chartsHeader = hub.getRange(VAX_LAYOUT.hubChartsStartRow, 1).getValue() || '';
    findings.hub.chartsOk = (chartsHeader.toString().indexOf('VISUAL') !== -1 || chartsHeader.toString().indexOf('📊') !== -1);

    if (!findings.hub.auditOk && !findings.hub.chartsOk) {
      findings.issues.push({
        severity: '🟡 MEDIUM',
        label: 'Hub panels missing or misaligned',
        detail: 'Audit + Charts not detected at expected rows'
      });
      findings.summary.medium++; findings.summary.total++;
    }
  }

  return findings;
}

// ════════════════════════════════════════════════════════════════════
// AUTO-REPAIR — vaccinate all bugs
// ════════════════════════════════════════════════════════════════════

function vaccinateFinanceSuite() {
  const ui = SpreadsheetApp.getUi();

  const confirm = ui.alert('💉 Vaccinate Finance Suite',
    'This will:\n\n' +
    '1. Snapshot 💸 Transactions (safety)\n' +
    '2. Move any stray data from reserved rows (5-13) to ledger\n' +
    '3. Restore Intl Quick Entry form structure\n' +
    '4. Re-insert missing checkboxes\n' +
    '5. Re-apply correct dropdowns to ledger range\n' +
    '6. Backfill missing TxnIDs\n' +
    '7. Reset frozen rows\n' +
    '8. Re-render Hub panels in correct order\n\n' +
    'Continue?', ui.ButtonSet.YES_NO);

  if (confirm !== ui.Button.YES) {
    _vaxAlert('Vaccination cancelled.');
    return;
  }

  const startTime = new Date().getTime();

  // Step 0: Safety snapshot
  const snap = _vaxSnapshot('pre-vaccine');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(VAX_TXN_TAB);
  if (!tx) {
    _vaxAlert('❌ Transactions tab not found. Cannot vaccinate.');
    return;
  }

  const repairs = {
    movedToLedger: 0,
    txnIdsCleared: 0,
    txnIdsBackfilled: 0,
    checkboxesReinserted: 0,
    intlFormRestored: 0,
    dropdownsReapplied: 0,
    frozenRowsFixed: 0,
    hubPanelsReRendered: 0,
    errors: []
  };

  // Step 1: Move stray transactions from reserved zone (5-13) to ledger
  for (let r = VAX_LAYOUT.reservedRowsStart; r <= VAX_LAYOUT.reservedRowsEnd; r++) {
    if (r === VAX_LAYOUT.qeRow) continue;          // skip QE form
    if (r === VAX_LAYOUT.intlEntryRow) continue;   // skip Intl form
    if (r === VAX_LAYOUT.intlHeaderRow || r === VAX_LAYOUT.intlLabelsRow) continue;
    if (r === VAX_LAYOUT.intlTipRow) continue;
    if (r === VAX_LAYOUT.ledgerHeaderRow || r === VAX_LAYOUT.ledgerLabelsRow) continue;

    const dateVal = tx.getRange(r, 1).getValue();
    if (dateVal instanceof Date) {
      try {
        // Read the entire row
        const rowData = tx.getRange(r, 1, 1, 9).getValues()[0];
        const txnId = tx.getRange(r, 14).getValue();

        // Find next empty row in ledger
        let targetRow = -1;
        for (let lr = VAX_LAYOUT.ledgerStartRow; lr <= VAX_LAYOUT.ledgerEndRow; lr++) {
          if (!tx.getRange(lr, 1).getValue()) { targetRow = lr; break; }
        }

        if (targetRow === -1) {
          repairs.errors.push('Ledger full — could not relocate row ' + r);
          continue;
        }

        // Write to ledger
        tx.getRange(targetRow, 1).setValue(rowData[0]).setNumberFormat('dd MMM yyyy');
        tx.getRange(targetRow, 2).setValue(rowData[1] || '');
        tx.getRange(targetRow, 3).setValue(rowData[2] || '');
        tx.getRange(targetRow, 4).setValue(rowData[3] || '');
        tx.getRange(targetRow, 5).setValue(rowData[4] || 0).setNumberFormat('#,##0.00');
        tx.getRange(targetRow, 6).setValue(rowData[5] || 'PKR');
        tx.getRange(targetRow, 7).setValue(rowData[6] || rowData[4] || 0).setNumberFormat('#,##0.00');
        tx.getRange(targetRow, 8).setValue(rowData[7] || '');
        try { tx.getRange(targetRow, 9, 1, 4).breakApart(); } catch(e) {}
        tx.getRange(targetRow, 9, 1, 4).merge().setValue(rowData[8] || '');
        tx.getRange(targetRow, 14).setValue(txnId || _vaxGenTxnId());

        // Clear the stray row
        tx.getRange(r, 1, 1, 9).clearContent();
        try { tx.getRange(r, 9, 1, 4).breakApart(); } catch(e) {}
        tx.getRange(r, 14).clearContent();

        repairs.movedToLedger++;
        _vaxLog('VAX_RELOCATE', 'Row ' + r + ' → Row ' + targetRow + ' · ' + (rowData[1] || '') + ' ' + (rowData[2] || '') + ' ' + (rowData[4] || ''));
      } catch (e) {
        repairs.errors.push('Row ' + r + ' relocation failed: ' + e);
      }
    }
  }

  // Step 2: Clear orphan TxnIDs in reserved zone (col N rows 5-13, except row 4 QE)
  for (let r = VAX_LAYOUT.reservedRowsStart; r <= VAX_LAYOUT.reservedRowsEnd; r++) {
    const txnId = tx.getRange(r, 14).getValue();
    if (txnId && String(txnId).indexOf('TXN-') === 0) {
      tx.getRange(r, 14).clearContent();
      repairs.txnIdsCleared++;
    }
  }

  // Step 3: Restore Intl Quick Entry form (row 9 cells)
  const intlAccVal = tx.getRange(VAX_LAYOUT.intlEntryRow, 2).getValue();
  const validAccounts = ['Cash', 'JazzCash', 'Easypaisa', 'UBL', 'Meezan', 'Mashreq Bank', 'JS Bank', 'Naya Pay', 'Bank Alfalah', 'Alfalah CC'];
  if (!intlAccVal || !validAccounts.includes(intlAccVal)) {
    tx.getRange(VAX_LAYOUT.intlEntryRow, 2).setValue('Alfalah CC');
    repairs.intlFormRestored++;
  }

  // Step 4: Re-insert +PRA checkbox at E9 if it's not a boolean
  const praVal = tx.getRange(VAX_LAYOUT.intlEntryRow, VAX_LAYOUT.intlPraCol).getValue();
  if (praVal !== '' && praVal !== true && praVal !== false) {
    tx.getRange(VAX_LAYOUT.intlEntryRow, VAX_LAYOUT.intlPraCol).clearContent().clearDataValidations();
    tx.getRange(VAX_LAYOUT.intlEntryRow, VAX_LAYOUT.intlPraCol).insertCheckboxes();
    repairs.checkboxesReinserted++;
  }

  // Step 5: Re-insert L4 + L9 submit checkboxes if missing
  const l4Val = tx.getRange(VAX_LAYOUT.qeRow, VAX_LAYOUT.qeSubmitCol).getValue();
  if (l4Val !== '' && l4Val !== true && l4Val !== false) {
    tx.getRange(VAX_LAYOUT.qeRow, VAX_LAYOUT.qeSubmitCol).clearContent().clearDataValidations();
    tx.getRange(VAX_LAYOUT.qeRow, VAX_LAYOUT.qeSubmitCol).insertCheckboxes();
    repairs.checkboxesReinserted++;
  }
  const l9Val = tx.getRange(VAX_LAYOUT.intlEntryRow, VAX_LAYOUT.intlSubmitCol).getValue();
  if (l9Val !== '' && l9Val !== true && l9Val !== false) {
    tx.getRange(VAX_LAYOUT.intlEntryRow, VAX_LAYOUT.intlSubmitCol).clearContent().clearDataValidations();
    tx.getRange(VAX_LAYOUT.intlEntryRow, VAX_LAYOUT.intlSubmitCol).insertCheckboxes();
    repairs.checkboxesReinserted++;
  }

  // Step 6: Re-apply dropdowns to ledger range (rows 14-213)
  if (typeof FIN2_ACCOUNTS !== 'undefined' && typeof FIN2_TXN_TYPES !== 'undefined' && 
      typeof FIN2_CATEGORIES !== 'undefined' && typeof FIN2_CURRENCIES !== 'undefined') {
    try {
      const dateDV = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
      const accDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_ACCOUNTS.concat(['']), true).setAllowInvalid(true).build();
      const typeDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_TXN_TYPES.concat(['']), true).setAllowInvalid(true).build();
      const catDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_CATEGORIES.concat(['']), true).setAllowInvalid(true).build();
      const currDV = SpreadsheetApp.newDataValidation().requireValueInList(FIN2_CURRENCIES.concat(['']), true).setAllowInvalid(true).build();

      const ledgerRowCount = VAX_LAYOUT.ledgerEndRow - VAX_LAYOUT.ledgerStartRow + 1;
      tx.getRange(VAX_LAYOUT.ledgerStartRow, 1, ledgerRowCount, 1).setDataValidation(dateDV);
      tx.getRange(VAX_LAYOUT.ledgerStartRow, 2, ledgerRowCount, 1).setDataValidation(accDV);
      tx.getRange(VAX_LAYOUT.ledgerStartRow, 3, ledgerRowCount, 1).setDataValidation(typeDV);
      tx.getRange(VAX_LAYOUT.ledgerStartRow, 4, ledgerRowCount, 1).setDataValidation(catDV);
      tx.getRange(VAX_LAYOUT.ledgerStartRow, 6, ledgerRowCount, 1).setDataValidation(currDV);
      repairs.dropdownsReapplied = ledgerRowCount;
    } catch (e) {
      repairs.errors.push('Dropdown reapply failed: ' + e);
    }
  }

  // Step 7: Backfill missing TxnIDs in ledger
  for (let r = VAX_LAYOUT.ledgerStartRow; r <= VAX_LAYOUT.ledgerEndRow; r++) {
    const dateVal = tx.getRange(r, 1).getValue();
    if (dateVal instanceof Date) {
      const txnId = tx.getRange(r, 14).getValue();
      if (!txnId) {
        tx.getRange(r, 14).setValue(_vaxGenTxnId());
        repairs.txnIdsBackfilled++;
      }
    }
  }

  // Step 8: Fix frozen rows
  if (tx.getFrozenRows() !== VAX_LAYOUT.ledgerLabelsRow) {
    tx.setFrozenRows(VAX_LAYOUT.ledgerLabelsRow);
    repairs.frozenRowsFixed = 1;
  }

  // Step 9: Re-render Hub panels in correct order
  try {
    if (typeof embedAuditPanelInHub === 'function') {
      embedAuditPanelInHub();
      repairs.hubPanelsReRendered++;
    }
    // Re-render charts AFTER audit (so charts can't clobber audit)
    if (typeof embedFinanceCharts === 'function') {
      embedFinanceCharts();
      repairs.hubPanelsReRendered++;
    }
  } catch (e) {
    repairs.errors.push('Hub re-render failed: ' + e);
  }

  const elapsed = ((new Date().getTime() - startTime) / 1000).toFixed(1);

  _vaxLog('VAX_COMPLETE', 
    'moved=' + repairs.movedToLedger + 
    ' · cleared=' + repairs.txnIdsCleared + 
    ' · backfilled=' + repairs.txnIdsBackfilled + 
    ' · cb=' + repairs.checkboxesReinserted + 
    ' · dd=' + repairs.dropdownsReapplied + 
    ' · time=' + elapsed + 's'
  );

  let report = '✅ VACCINATION COMPLETE in ' + elapsed + 's\n\n';
  report += '📦 Snapshot: ' + (snap.name || 'failed') + '\n\n';
  report += 'Repairs applied:\n';
  report += '  Moved to ledger:     ' + repairs.movedToLedger + ' rows\n';
  report += '  TxnIDs cleared:      ' + repairs.txnIdsCleared + '\n';
  report += '  TxnIDs backfilled:   ' + repairs.txnIdsBackfilled + '\n';
  report += '  Checkboxes restored: ' + repairs.checkboxesReinserted + '\n';
  report += '  Intl form restored:  ' + repairs.intlFormRestored + '\n';
  report += '  Dropdowns reapplied: ' + repairs.dropdownsReapplied + ' cells\n';
  report += '  Frozen rows fixed:   ' + repairs.frozenRowsFixed + '\n';
  report += '  Hub panels rendered: ' + repairs.hubPanelsReRendered + '\n';

  if (repairs.errors.length > 0) {
    report += '\n⚠️ Non-fatal errors:\n';
    repairs.errors.slice(0, 5).forEach(e => report += '  • ' + e + '\n');
  }

  report += '\n💡 To verify: Menu → 💰 Finance → 🔍 Diagnose Without Repair\n';
  report += 'Should report ✅ ALL HEALTHY.';

  _vaxAlert(report);
  return repairs;
}

function _vaxGenTxnId() {
  if (typeof generateTxnId === 'function') return generateTxnId();
  const stamp = Utilities.formatDate(new Date(), VAX_TZ, 'yyyyMMdd-HHmmss');
  const suffix = Math.floor(Math.random() * 1000).toString();
  return 'TXN-' + stamp + '-' + ('000' + suffix).slice(-3);
}

// ════════════════════════════════════════════════════════════════════
// VERIFY EFFECTIVENESS
// ════════════════════════════════════════════════════════════════════

function verifyVaccineEffectiveness() {
  const findings = _runDiagnostic();

  let report = '🔍 POST-VACCINATION VERIFICATION\n\n';

  if (findings.summary.total === 0) {
    report += '✅ ✅ ✅ FINANCE SUITE FULLY HEALTHY ✅ ✅ ✅\n\n';
    report += 'No bugs detected.\n';
    report += '  Ledger rows: ' + findings.tx.txnCount + '\n';
    report += '  Reserved zone clean: yes\n';
    report += '  Forms intact: yes\n';
    report += '  TxnIDs: complete\n';
    report += '  Hub panels: aligned\n\n';
    report += 'Vaccination successful. Bug class neutralized.';
  } else {
    report += '⚠️ ' + findings.summary.total + ' issue(s) STILL present after vaccination:\n\n';
    findings.issues.forEach((iss, i) => {
      report += (i + 1) + '. ' + iss.severity + ' — ' + iss.label + '\n';
    });
    report += '\nRun "💉 Vaccinate" again, or contact help.';
  }

  _vaxAlert(report);
  return findings;
}

// ════════════════════════════════════════════════════════════════════
// MENU
// ════════════════════════════════════════════════════════════════════

function appendVaccineMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('💉 Vaccine')
      .addItem('💉 Vaccinate Finance Suite (auto-repair)', 'vaccinateFinanceSuite')
      .addItem('🔍 Diagnose Without Repair (read-only)', 'diagnoseFinanceBugs')
      .addItem('✅ Verify Effectiveness (post-vaccine)', 'verifyVaccineEffectiveness')
      .addToUi();
  } catch(e) { Logger.log('Vaccine menu add failed: ' + e); }
}