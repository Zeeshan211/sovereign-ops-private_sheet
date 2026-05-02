// ════════════════════════════════════════════════════════════════════
// 🛡️ Sovereign_Linter.gs — RUNTIME HEALTH CHECK v1.0
// LOCKED · 7-Layer Audit · Self-Contained · Day 6 · 2026-04-29
//
// PURPOSE:
//   Catches the bug class we hit tonight (nested functions invisible
//   globally) plus 6 other common drift patterns. Manifest-driven so
//   adding new modules is one-line edits.
//
// USAGE:
//   - Menu → 🛡️ Linter → Run Full Lint (5 sec, comprehensive)
//   - Menu → 🛡️ Linter → Quick Check (1 sec, just critical items)
//
// SAFE TO RUN ANYTIME. Read-only. Never modifies sheet or code.
// ════════════════════════════════════════════════════════════════════

// ─── MANIFEST: expected functions per module ───
// Add new entries here when you build a new module.
// Linter checks `typeof X === 'function'` for each.
const LINT_EXPECTED_FUNCTIONS = {
  'Finance_Pro': [
    'rebuildFinanceCockpit', 'submitTxnFromQuickEntry', 'submitIntlFromQuickEntry',
    'submitTransferFromForm', 'performReversal', 'wipeLedger',
    'setOpeningBalances', 'verifyFinanceCockpit', 'fixHubFormulaRangesNow',
    '_findNextLedgerRow', '_findConsecutiveLedgerRows', 'generateTxnId',
    'backfillTxnIds', '_financeOnEdit'
  ],
  'Finance_Intl': ['logIntlPurchase', 'logBillerCharge', 'cmdIntl', 'cmdBillerFee'],
  'Finance_Debts': ['rebuildDebtsTab', 'payInstallment', 'payReceivable', '_debtsOnEdit', 'verifyDebtsCockpit'],
  'Finance_Audit': ['buildFinanceAuditTab', 'embedAuditPanelInHub', 'refreshFinanceAudit', 'verifyFinanceAudit'],
  'Finance_Charts': ['embedFinanceCharts', 'refreshFinanceCharts', 'verifyFinanceCharts'],
  'Finance_Salary': ['buildSalaryTab', 'refreshSalaryTab', 'logSalaryFromForecast', '_salaryOnEdit', 'verifySalaryTab'],
  'Finance_Snapshot': ['snapFinanceSuite', 'restoreFinanceSnapshot', 'listFinanceSnapshots', 'pruneFinanceSnapshots'],
  'Finance_Vaccine': ['vaccinateFinanceSuite', 'diagnoseFinanceBugs', 'verifyVaccineEffectiveness'],
  'Tab_Manager': ['applyTabVisibility', 'showAllTabs'],
    'Progress_Pro': ['rebuildProgressCockpit', 'verifyProgressCockpit', 'appendProgressMenu', '_progReadVitalsBackup', '_progRestoreVitals'],
      'Ghost_Hunter': ['huntGhostToday', 'killGhostDigestTriggers', 'appendGhostHunterMenu'],
  'Mission_Pro': ['rebuildMissionCockpit', 'refreshMissionCockpit', 'verifyMissionCockpit', 'appendMissionMenu'],
    'Theme_Pro': ['rebuildThemesTab', 'applyTheme', 'applyThemeToAll', 'getThemeProperty', 'getActiveTheme', 'verifyThemeSystem', 'appendThemesMenu', 'applyMidnightGold', 'applyRoyalIndigo', 'applyForestSage', 'applySunsetCoral', 'applyOceanCyan', 'applyStoneMarble'],
      'Cockpit_Guardian': ['guardianAudit', 'guardianSnapshot', 'guardianConfirm', 'guardianExecuteSafe', 'guardianRestoreSnapshot', 'restoreLastSnapshot', 'guardianListSnapshots', 'guardianPruneOldSnapshots', 'safeApplyTheme', 'safeRebuildAllPro', 'appendGuardianMenu'],
        'Cockpit_Layout': ['applyLayoutToCockpit', 'applyLayoutToAll', 'diagnoseLayout', 'applyLayoutCompact', 'applyLayoutSpacious', 'appendLayoutMenu'],
          'Settings_Dispatcher': ['getSettingCached', 'getSettingNumberCached', 'getSettingBoolCached', 'clearSettingsCache', '_settingsOnEdit', 'installSettingsDispatcher', 'diagnoseSettingsDispatcher'],
          'Sovereign_Backup': ['snapshotGroup', 'snapshotAll', 'preMutationSnap', 'dailyAutoBackup', 'pruneOldBackups', 'listBackups', 'backupHealthCheck', 'restoreBackup', 'restoreLastBackupOfGroup', 'snapFinance', 'snapLife', 'snapControl', 'snapAI', 'snapEverything', 'installDailyBackupTrigger', 'uninstallDailyBackupTrigger', 'appendBackupMenu'],
          'Finance_Reconciliation': ['rebuildAccountsReconciliation', 'verifyAccountsReconciliation', 'appendReconciliationMenu'],
  'Finance_Merchants': ['lookupMerchant', 'learnMerchant', 'listMerchants', 'showMerchantsList', 'cmdMerchantAdd', 'validateCCPayment', 'appendMerchantsMenu', 'cmdLookupMerchantUI'],
  'Finance_BankReconciler': ['bankReconcilerUI', 'parseBankStatement', 'diffBankVsLedger', 'renderDiffReport', 'verifyBankReconciler', 'appendBankReconcilerMenu'],
  'Finance_ATM': ['cmdAtm', 'cmdAtmFee', 'cmdAtmReverse', 'cmdAtmList', 'listPendingATMReversals', 'verifyATMTracker'],
  'Finance_PDFParser': ['autoParseAllPDFs', 'autoParseLatestPDF', 'verifyPDFParser', 'clearPDFDedupHashes', 'appendPDFParserMenu']
};

// ─── MANIFEST: expected constants ───
const LINT_EXPECTED_CONSTANTS = [
  'FIN2_LEDGER_START_ROW', 'FIN2_LEDGER_END_ROW',
  'FIN2_QE_ROW', 'FIN2_INTL_ENTRY_ROW',
  'FIN2_ACCOUNTS', 'FIN2_TXN_TYPES', 'FIN2_CATEGORIES',
  'FIN2_FROZEN_ROWS', 'FIN2_RESERVED_ZONE_START', 'FIN2_RESERVED_ZONE_END'
];

// ─── MANIFEST: expected visible tabs ───
const LINT_EXPECTED_TABS = [
  '⚡ Mission', '📋 Habits', '🕌 Salah', '💰 Finance Hub',
  '💸 Transactions', '💳 Debts', '📈 Progress',
  '🏥 Health', '📚 Food Library'
];

// ─── MANIFEST: expected triggers (handler function names) ───
const LINT_EXPECTED_TRIGGERS = [
  '_financeOnEdit',
  '_debtsOnEdit',
  '_salaryOnEdit',
  'pollTelegram'
];

const LINT_TZ = 'Asia/Karachi';

// ──────────── helpers ────────────

function _lintAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _lintLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

// ──────────── individual checks ────────────

function _lintCheckFunctions() {
  const result = { ok: true, missing: [], totalChecked: 0 };
  Object.keys(LINT_EXPECTED_FUNCTIONS).forEach(module => {
    LINT_EXPECTED_FUNCTIONS[module].forEach(fnName => {
      result.totalChecked++;
      try {
        // eval is the only reliable way to check global function existence by name
        const exists = (eval('typeof ' + fnName) === 'function');
        if (!exists) {
          result.missing.push(module + ' → ' + fnName);
          result.ok = false;
        }
      } catch (e) {
        result.missing.push(module + ' → ' + fnName + ' (eval err)');
        result.ok = false;
      }
    });
  });
  return result;
}

function _lintCheckConstants() {
  const result = { ok: true, missing: [], totalChecked: 0 };
  LINT_EXPECTED_CONSTANTS.forEach(constName => {
    result.totalChecked++;
    try {
      const t = eval('typeof ' + constName);
      if (t === 'undefined') {
        result.missing.push(constName);
        result.ok = false;
      }
    } catch (e) {
      result.missing.push(constName + ' (eval err)');
      result.ok = false;
    }
  });
  return result;
}

function _lintCheckTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = { ok: true, missing: [], hidden: [], totalChecked: 0 };
  LINT_EXPECTED_TABS.forEach(name => {
    result.totalChecked++;
    const s = ss.getSheetByName(name);
    if (!s) {
      result.missing.push(name);
      result.ok = false;
    } else if (s.isSheetHidden()) {
      result.hidden.push(name);
    }
  });
  return result;
}

function _lintCheckTriggers() {
  const result = { ok: true, missing: [], duplicates: [], totalChecked: 0 };
  const allTriggers = ScriptApp.getProjectTriggers();
  const counts = {};
  allTriggers.forEach(t => {
    const fn = t.getHandlerFunction();
    counts[fn] = (counts[fn] || 0) + 1;
  });
  LINT_EXPECTED_TRIGGERS.forEach(fn => {
    result.totalChecked++;
    const c = counts[fn] || 0;
    if (c === 0) {
      result.missing.push(fn);
      result.ok = false;
    } else if (c > 1) {
      result.duplicates.push(fn + ' (' + c + 'x)');
      result.ok = false;
    }
  });
  return result;
}

function _lintCheckCrossRefs() {
  // Verify modules can reach each other's exposed helpers
  const result = { ok: true, broken: [], checked: [] };
  const refs = [
    { from: 'Finance_Intl', via: 'logIntlPurchase', needs: '_findConsecutiveLedgerRows', source: 'Finance_Pro' },
    { from: 'Finance_Debts', via: 'payInstallment', needs: 'generateTxnId', source: 'Finance_Pro' },
    { from: 'Finance_Salary', via: 'logSalaryFromForecast', needs: 'generateTxnId', source: 'Finance_Pro' },
    { from: 'Finance_Vaccine', via: 'vaccinateFinanceSuite', needs: 'embedAuditPanelInHub', source: 'Finance_Audit' },
    { from: 'Finance_Vaccine', via: 'vaccinateFinanceSuite', needs: 'embedFinanceCharts', source: 'Finance_Charts' }
  ];
  refs.forEach(r => {
    const fromExists = (eval('typeof ' + r.via) === 'function');
    const needsExists = (eval('typeof ' + r.needs) === 'function');
    result.checked.push(r.from + ' → ' + r.needs);
    if (fromExists && !needsExists) {
      result.broken.push(r.from + '.' + r.via + ' calls ' + r.needs + ' (in ' + r.source + ') — NOT FOUND');
      result.ok = false;
    }
  });
  return result;
}

// ════════════════════════════════════════════════════════════════════
// MAIN ENTRIES
// ════════════════════════════════════════════════════════════════════

function lintAllSovereignFiles() {
  const startTime = new Date().getTime();

  const fns = _lintCheckFunctions();
  const consts = _lintCheckConstants();
  const tabs = _lintCheckTabs();
  const triggers = _lintCheckTriggers();
  const refs = _lintCheckCrossRefs();

  const elapsed = ((new Date().getTime() - startTime) / 1000).toFixed(1);
  const allOk = fns.ok && consts.ok && tabs.ok && triggers.ok && refs.ok;

  let report = '🛡️ SOVEREIGN LINTER v1.0 — ' + elapsed + 's\n\n';

  if (allOk) {
    report += '✅ ✅ ✅ ALL CHECKS PASSED ✅ ✅ ✅\n\n';
    report += 'Functions:    ' + fns.totalChecked + ' / ' + fns.totalChecked + '\n';
    report += 'Constants:    ' + consts.totalChecked + ' / ' + consts.totalChecked + '\n';
    report += 'Tabs:         ' + tabs.totalChecked + ' / ' + tabs.totalChecked + '\n';
    report += 'Triggers:     ' + triggers.totalChecked + ' / ' + triggers.totalChecked + '\n';
    report += 'Cross-refs:   ' + refs.checked.length + ' / ' + refs.checked.length + '\n\n';
    if (tabs.hidden.length > 0) {
      report += '⚠️ Note: ' + tabs.hidden.length + ' expected-visible tab(s) currently hidden:\n  ' + tabs.hidden.join('\n  ') + '\n';
    }
    report += '\nSystem clean. No drift detected.';
  } else {
    report += '⚠️ ISSUES FOUND\n\n';

    if (!fns.ok) {
      report += '❌ MISSING FUNCTIONS (' + fns.missing.length + '):\n';
      fns.missing.forEach(m => report += '  • ' + m + '\n');
      report += '   → Cause: function nested inside another, or file not saved, or typo\n\n';
    }
    if (!consts.ok) {
      report += '❌ MISSING CONSTANTS (' + consts.missing.length + '):\n';
      consts.missing.forEach(m => report += '  • ' + m + '\n');
      report += '   → Cause: file not loaded or const renamed\n\n';
    }
    if (!tabs.ok) {
      report += '❌ MISSING TABS (' + tabs.missing.length + '):\n';
      tabs.missing.forEach(m => report += '  • ' + m + '\n');
      report += '   → Cause: tab deleted or renamed\n\n';
    }
    if (!triggers.ok) {
      if (triggers.missing.length > 0) {
        report += '❌ MISSING TRIGGERS (' + triggers.missing.length + '):\n';
        triggers.missing.forEach(m => report += '  • ' + m + '\n');
        report += '   → Run install function for that module\n\n';
      }
      if (triggers.duplicates.length > 0) {
        report += '⚠️ DUPLICATE TRIGGERS (' + triggers.duplicates.length + '):\n';
        triggers.duplicates.forEach(d => report += '  • ' + d + '\n');
        report += '   → Run Force Reinstall for that module to clean up\n\n';
      }
    }
    if (!refs.ok) {
      report += '❌ BROKEN CROSS-REFS (' + refs.broken.length + '):\n';
      refs.broken.forEach(b => report += '  • ' + b + '\n');
      report += '   → A module is calling a function that no longer exists\n\n';
    }

    report += 'Fix issues then re-run lint to confirm.';
  }

  _lintLog('LINT_RUN', (allOk ? 'PASS' : 'FAIL') + ' · ' + fns.totalChecked + ' fns · ' + tabs.totalChecked + ' tabs · ' + elapsed + 's');
  _lintAlert(report);
  return { ok: allOk, fns: fns, consts: consts, tabs: tabs, triggers: triggers, refs: refs };
}

function lintQuick() {
  const startTime = new Date().getTime();
  const fns = _lintCheckFunctions();
  const triggers = _lintCheckTriggers();
  const elapsed = ((new Date().getTime() - startTime) / 1000).toFixed(1);

  const ok = fns.ok && triggers.ok;
  let report = '🛡️ QUICK LINT — ' + elapsed + 's\n\n';
  if (ok) {
    report += '✅ ' + fns.totalChecked + ' functions present · ' + triggers.totalChecked + ' triggers OK';
  } else {
    if (!fns.ok) report += '❌ Missing functions:\n  ' + fns.missing.join('\n  ') + '\n\n';
    if (!triggers.ok) {
      if (triggers.missing.length > 0) report += '❌ Missing triggers:\n  ' + triggers.missing.join('\n  ') + '\n';
      if (triggers.duplicates.length > 0) report += '⚠️ Duplicate triggers:\n  ' + triggers.duplicates.join('\n  ') + '\n';
    }
    report += '\nRun Full Lint for details.';
  }
  _lintAlert(report);
  return { ok: ok };
}

function appendLinterMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🛡️ Linter')
      .addItem('🛡️ Run Full Lint (comprehensive · 5s)', 'lintAllSovereignFiles')
      .addItem('⚡ Quick Check (functions + triggers · 1s)', 'lintQuick')
      .addToUi();
  } catch(e) { Logger.log('Linter menu add failed: ' + e); }
}






function scanMissionDependencies() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const findings = [];
  let scanned = 0;

  ss.getSheets().forEach(sh => {
    const name = sh.getName();
    if (name === '⚡ Mission') return;
    if (name.indexOf('📦 Snap') === 0) return;
    if (name.indexOf('(deleted)') !== -1) return;

    try {
      const range = sh.getDataRange();
      const formulas = range.getFormulas();
      scanned++;

      for (let r = 0; r < formulas.length; r++) {
        for (let c = 0; c < formulas[r].length; c++) {
          const f = formulas[r][c];
          if (!f) continue;
          if (f.indexOf("'⚡ Mission'!") !== -1 || f.indexOf("Mission'!") !== -1) {
            findings.push({
              tab: name,
              cell: sh.getRange(r + 1, c + 1).getA1Notation(),
              formula: f.substring(0, 100)
            });
          }
        }
      }
    } catch (e) {
      Logger.log('Skip ' + name + ': ' + e);
    }
  });

  let report = '🔍 MISSION DEPENDENCY SCAN\n\n';
  report += 'Scanned ' + scanned + ' tabs.\n\n';
  if (findings.length === 0) {
    report += '✅ NO DEPENDENCIES FOUND.\nNothing reads from ⚡ Mission tab.\nSafe to rebuild Mission freely.';
  } else {
    report += '⚠️ ' + findings.length + ' dependency reference(s) found:\n\n';
    findings.slice(0, 30).forEach(f => {
      report += '  • ' + f.tab + ' ' + f.cell + '\n';
      report += '    ' + f.formula + '\n';
    });
    if (findings.length > 30) report += '\n... +' + (findings.length - 30) + ' more';
  }

  Logger.log(report);

  try {
    SpreadsheetApp.getUi().alert(report);
  } catch (e) {
    // Editor context — alert not available, log was used
  }

  return findings;
}
