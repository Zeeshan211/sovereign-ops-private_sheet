// ════════════════════════════════════════════════════════════════════
// 🎯 Menu_Loader.gs v3.2 — CONSOLIDATED MENU REGISTRY
// LOCKED · 2026-05-02 · 6 top-level menus + auto-wired Guardian
//
// CHANGES FROM v3.1:
//   ✅ #10 FIX: 🛡️ Guardian menu now auto-loaded on Sheet open.
//      v3.1 required user to run appendAuditGuardianMenu() manually
//      after every reload. v3.2 calls it inside onOpen so menu survives
//      reload permanently.
// ════════════════════════════════════════════════════════════════════

function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  const log = [];

  // ── 1. MISSION ──
  if (typeof appendMissionMenu === 'function') {
    try { appendMissionMenu(); log.push('✓ Mission'); }
    catch(err) { log.push('⚠️ Mission: ' + err.message); }
  }

  // ── 2. FINANCE ──
  if (typeof appendFinanceMenu === 'function') {
    try { appendFinanceMenu(); log.push('✓ Finance'); }
    catch(err) { log.push('⚠️ Finance: ' + err.message); }
  }

  // ── 3. DEBTS ──
  if (typeof appendDebtsMenu === 'function') {
    try { appendDebtsMenu(); log.push('✓ Debts'); }
    catch(err) { log.push('⚠️ Debts: ' + err.message); }
  }

  // ── 4. PROGRESS ──
  if (typeof appendProgressMenu === 'function') {
    try { appendProgressMenu(); log.push('✓ Progress'); }
    catch(err) { log.push('⚠️ Progress: ' + err.message); }
  }

  // ── 5. OPS — consolidated parent menu ──
  try {
    const ops = ui.createMenu('🛠️ Ops');

    ops.addSubMenu(ui.createMenu('🛡️ Linter')
      .addItem('🛡️ Run Full Lint', 'lintAllSovereignFiles')
      .addItem('⚡ Quick Check', 'lintQuick'));

    ops.addSubMenu(ui.createMenu('💉 Vaccine')
      .addItem('💉 Vaccinate Finance Suite', 'vaccinateFinanceSuite')
      .addItem('🔍 Diagnose Without Repair', 'diagnoseFinanceBugs')
      .addItem('✅ Verify Vaccine Effectiveness', 'verifyVaccineEffectiveness'));

    ops.addSubMenu(ui.createMenu('🔍 Ghost Hunter')
      .addItem('🔍 Hunt Ghost /today', 'huntGhostToday')
      .addItem('🔪 Kill Duplicate Triggers', 'killGhostDigestTriggers'));

    ops.addSubMenu(ui.createMenu('🛡️ Guardian')
      .addSubMenu(ui.createMenu('🎨 Safe Apply Theme')
        .addItem('🌙 Midnight Gold', 'safeApplyMidnightGold')
        .addItem('👑 Royal Indigo', 'safeApplyRoyalIndigo')
        .addItem('🌲 Forest Sage', 'safeApplyForestSage')
        .addItem('🌅 Sunset Coral', 'safeApplySunsetCoral')
        .addItem('🌊 Ocean Cyan', 'safeApplyOceanCyan')
        .addItem('🏛️ Stone Marble', 'safeApplyStoneMarble'))
      .addItem('🛡️ Safe Rebuild ALL Pro Cockpits', 'safeRebuildAllPro')
      .addSeparator()
      .addItem('⏪ Restore Last Snapshot', 'restoreLastSnapshot')
      .addItem('📋 List All Snapshots', 'guardianListSnapshots')
      .addItem('🗑 Prune Old Snapshots', 'guardianPruneOldSnapshots'));

    ops.addSubMenu(ui.createMenu('🎯 Layout')
      .addItem('🎯 Apply All Widths', 'applyLayoutToAll')
      .addItem('🔍 Show Current Widths', 'diagnoseLayout')
      .addSeparator()
      .addItem('📐 Compact (1300px)', 'applyLayoutCompact')
      .addItem('📐 Spacious (1700px)', 'applyLayoutSpacious'));

    ops.addSubMenu(ui.createMenu('🎨 Themes')
      .addItem('🔄 Rebuild Themes Tab', 'rebuildThemesTab')
      .addItem('🔁 Re-apply Active Theme', 'applyThemeToAll')
      .addSeparator()
      .addItem('🌙 Midnight Gold', 'applyMidnightGold')
      .addItem('👑 Royal Indigo', 'applyRoyalIndigo')
      .addItem('🌲 Forest Sage', 'applyForestSage')
      .addItem('🌅 Sunset Coral', 'applySunsetCoral')
      .addItem('🌊 Ocean Cyan', 'applyOceanCyan')
      .addItem('🏛️ Stone Marble', 'applyStoneMarble')
      .addSeparator()
      .addItem('🔍 Verify Theme System', 'verifyThemeSystem'));

    ops.addSeparator();
    ops.addItem('📋 Show Menu Load Log', 'showMenuLoadLog');
    ops.addItem('🔁 Reload All Menus', 'manualReloadMenus');

    ops.addToUi();
    log.push('✓ Ops');
  } catch(err) { log.push('⚠️ Ops: ' + err.message); }

  // ── 6. SOVEREIGN — Pro cockpit rebuilds ──
  try {
    const sovereign = ui.createMenu('🎛️ Sovereign');

    sovereign.addSubMenu(ui.createMenu('📋 Habits')
      .addItem('🔄 Rebuild Cockpit', 'rebuildHabitsCockpit')
      .addItem('🧠 Refresh AI Insight', 'refreshHabitsAIInsight')
      .addItem('🌟 Refresh Today Highlight', 'refreshHabitsTodayHighlight')
      .addItem('🔍 Verify Cockpit', 'verifyHabitsCockpit'));

    sovereign.addSubMenu(ui.createMenu('🕌 Salah')
      .addItem('🔄 Rebuild Cockpit', 'rebuildSalahCockpit')
      .addItem('📍 Refresh Multan Prayer Times', 'refreshPrayerTimesMultan')
      .addItem('🔍 Verify Cockpit', 'verifySalahCockpit'));

    sovereign.addSubMenu(ui.createMenu('📊 Charts')
      .addItem('🔄 Rebuild Cockpit', 'rebuildChartsCockpit')
      .addItem('🔍 Verify Cockpit', 'verifyChartsCockpit'));

    sovereign.addSubMenu(ui.createMenu('🔄 Reconcile')
      .addItem('🔄 Rebuild Reconciliation Card', 'rebuildAccountsReconciliation')
      .addItem('🔍 Verify Drift Status', 'verifyAccountsReconciliation'));

    sovereign.addSubMenu(ui.createMenu('🏪 Merchants')
      .addItem('📋 Show All Merchants', 'showMerchantsList')
      .addItem('🔍 Lookup Merchant', 'cmdLookupMerchantUI'));

    sovereign.addSubMenu(ui.createMenu('📋 Bank Diff')
      .addItem('🤖 Auto-Parse All PDFs (recommended)', 'autoParseAllPDFs')
      .addItem('📋 Manual Paste Diff', 'bankReconcilerUI')
      .addItem('🔍 Verify PDF Parser Setup', 'verifyPDFParser')
      .addItem('🧹 Clear Dedup History', 'clearPDFDedupHashes')
      .addItem('🔍 Verify Reconciler', 'verifyBankReconciler'));

    sovereign.addSubMenu(ui.createMenu('💼 Salary')
      .addItem('🔄 Refresh (preserves edits)', 'refreshSalaryTab')
      .addItem('🔄 Rebuild from defaults', 'buildSalaryTabUI')
      .addSeparator()
      .addItem('💰 Log Salary from Forecast', 'logSalaryFromForecast')
      .addSeparator()
      .addItem('🔧 Re-install Auto-Detect Handler', 'installSalaryEditHandler')
      .addItem('🤖 Diagnose Auto-Detect', 'diagnoseSalaryHandler')
      .addSeparator()
      .addItem('🔍 Verify + Show Live Values', 'verifySalaryTab'));

    sovereign.addSubMenu(ui.createMenu('🪁 Kite')
      .addItem('🔄 Rebuild Tracker Panel', 'buildKiteTrackerUI')
      .addItem('🔄 Refresh Panel Only', 'refreshKiteTracker')
      .addSeparator()
      .addItem('🔧 Re-install Handler', 'installKiteEditHandler')
      .addItem('🤖 Diagnose Handler', 'diagnoseKiteHandler')
      .addSeparator()
      .addItem('🔍 Verify Integrity', 'verifyKiteTracker'));

    sovereign.addSubMenu(ui.createMenu('🏧 ATM')
      .addItem('🏧 Log ATM Withdraw', 'uiATMLogWithdraw')
      .addItem('📋 Show Pending Reversals', 'uiATMShowPending')
      .addItem('↩️ Reverse a Pending Fee', 'uiATMReverse')
      .addSeparator()
      .addItem('📌 Embed Hub Card (rows 32-46)', 'embedATMPanelInHub')
      .addItem('🔍 Verify ATM Tracker', 'verifyATMTracker'));

    sovereign.addSubMenu(ui.createMenu('📱 Nano Loans')
      .addItem('🔄 Rebuild Tab (form + data)', 'rebuildNanoLoansTab')
      .addItem('📌 Embed Hub Card (rows 47-54)', 'embedNanoLoanPanelInHub')
      .addSeparator()
      .addItem('🪄 Batch Loop Wizard (alt path)', 'openBatchLoopWizard')
      .addItem('📱 Log Single Loan (alt path)', 'logSingleNanoLoan')
      .addItem('↩️ Log Repayment', 'logSingleNanoRepay')
      .addSeparator()
      .addItem('🔧 Re-install Handler', 'installNanoLoanEditHandler')
      .addItem('🤖 Diagnose Handler', 'diagnoseNanoLoanHandler')
      .addItem('🔍 Verify Module', 'verifyNanoLoanModule'));

    sovereign.addSubMenu(ui.createMenu('🎨 Tabs')
      .addItem('🎨 Organize + Color', 'organizeTabsAndGroups')
      .addItem('🙈 Hide Cosmetic Tabs', 'hideCosmeticTabs')
      .addSeparator()
      .addItem('👁 Show All Hidden (Finance_Pro)', 'showAllHiddenTabs')
      .addItem('👁 Show All Tabs (Tab_Manager)', 'showAllTabs'));

    sovereign.addSubMenu(ui.createMenu('📜 Audit')
      .addItem('🔄 Refresh Audit Tab + Hub Panel', 'refreshFinanceAudit')
      .addItem('🔄 Rebuild Audit Tab', 'buildFinanceAuditTabUI')
      .addItem('💾 Export to CSV (Drive)', 'exportAuditToCSV')
      .addSeparator()
      .addItem('🔍 Verify Audit Integrity', 'verifyFinanceAudit'));

    sovereign.addSubMenu(ui.createMenu('🛡️ Backup')
      .addItem('🌐 Snap EVERYTHING', 'snapEverything')
      .addSeparator()
      .addItem('🏦 Snap Finance', 'snapFinance')
      .addItem('🛡️ Snap Life', 'snapLife')
      .addItem('⚡ Snap Control', 'snapControl')
      .addItem('🧠 Snap AI', 'snapAI')
      .addSeparator()
      .addItem('⏪ Restore latest Finance', 'restoreLastFinanceBackup')
      .addItem('⏪ Restore latest Life', 'restoreLastLifeBackup')
      .addItem('⏪ Restore latest Control', 'restoreLastControlBackup')
      .addSeparator()
      .addItem('📋 List All Backups', 'listBackups')
      .addItem('🩺 Health Check', 'backupHealthCheck')
      .addItem('🗑️ Prune Old', 'pruneOldBackups')
      .addSeparator()
      .addItem('⏰ Install Daily Trigger (3 AM)', 'installDailyBackupTrigger')
      .addItem('⛔ Uninstall Daily Trigger', 'uninstallDailyBackupTrigger'));

    sovereign.addSubMenu(ui.createMenu('⚙️ Settings')
      .addItem('🔄 Rebuild Pro Sections (23)', 'appendSettingsProSections')
      .addItem('🔍 Verify Integrity', 'verifySettingsProIntegrity')
      .addItem('🌍 Verify Timezone', 'verifyTimezone')
      .addItem('🔄 Update System Status', 'updateSystemStatus')
      .addSeparator()
      .addItem('🚨 EMERGENCY STOP (kill triggers)', 'cmdEmergencyStop')
      .addItem('▶️ Resume System', 'cmdResume')
      .addItem('🔧 Enforce Toggles', 'actEnforceToggles')
      .addItem('📜 View Audit Log (raw)', 'viewAuditLog')
      .addSeparator()
      .addItem('⚡ Install Settings Dispatcher', 'installSettingsDispatcher')
      .addItem('🔍 Diagnose Dispatcher', 'diagnoseSettingsDispatcher')
      .addItem('🗑️ Clear Settings Cache', 'clearSettingsCache'));

    sovereign.addToUi();
    log.push('✓ Sovereign (incl ATM v1.1 + NanoLoan placeholder)');
  } catch(err) { log.push('⚠️ Sovereign: ' + err.message); }

  // ── 7. GUARDIAN (v3.2: auto-wired top-level) ──
  if (typeof appendAuditGuardianMenu === 'function') {
    try { appendAuditGuardianMenu(); log.push('✓ Guardian (v3.2 auto-wired)'); }
    catch(err) { log.push('⚠️ Guardian: ' + err.message); }
  }

  // Save log for diagnostics
  try {
    PropertiesService.getDocumentProperties().setProperty('menu_load_log', log.join('\n'));
  } catch(e) {}
}

function manualReloadMenus() {
  onOpen();
  try {
    SpreadsheetApp.getUi().alert(
      '✅ All menus reloaded (v3.2).\n\n' +
      'Top bar (7 menus):\n' +
      '⚡ Mission · 💰 Finance · 💳 Debts · 📈 Progress · 🛠️ Ops · 🎛️ Sovereign · 🛡️ Guardian\n\n' +
      '🛡️ Guardian is now auto-wired (no more manual call).\n' +
      '🎛️ Sovereign includes: 🏧 ATM (v1.1) + 📱 Nano Loans (Phase 3)'
    );
  } catch(e) { Logger.log(e); }
}

function showMenuLoadLog() {
  const log = PropertiesService.getDocumentProperties().getProperty('menu_load_log') || '(no log yet — reload menus first)';
  try {
    SpreadsheetApp.getUi().alert('MENU LOAD LOG\n\n' + log);
  } catch(e) { Logger.log(log); }
}