// ════════════════════════════════════════════════════════════════════
// ⚙️ Settings_Pro.gs — ELITE v3.2 · 24 SECTIONS + EMERGENCY STOP
// LOCKED · 7-Layer Audit · Self-Contained
//
// CHANGES FROM v3.1 (2026-04-29 Day 5):
//   - FIX: _writeSettingRow now sets number format '@' (text) on column B
//          BEFORE writing '=' value. Stops Sheets from parsing the bare '='
//          as an invalid formula → no more #ERROR! in 73 PRO_* cells.
//   - All other behavior preserved.
//
// CHANGES FROM v3.0 (2026-04-28 Session 1):
//   - NEW: Emergency Stop / Resume / Timezone Verifier
// ════════════════════════════════════════════════════════════════════

const SETTINGSPRO_TAB = '⚙️ Settings';
const SETTINGSPRO_AUDIT_LOG = 'Audit Log';
const SETTINGSPRO_START_ROW = 30;

// ──────────────────────────────────────────────────────────
// SAFE WRAPPERS
// ──────────────────────────────────────────────────────────

function _safeAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _isSystemPaused() {
  return PropertiesService.getScriptProperties().getProperty('SYSTEM_PAUSED') === 'true';
}

// ══════════════════════════════════════════════════════════
// PUBLIC API — getSetting / getSettingBool / getSettingNumber
// ══════════════════════════════════════════════════════════

function getSetting(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SETTINGSPRO_TAB);
  if (!s) return null;
  const data = s.getRange(SETTINGSPRO_START_ROW, 1, 311, 3).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) return data[i][2];
  }
  return null;
}

function getSettingBool(key) {
  const v = getSetting(key);
  if (v === true || v === 'TRUE' || v === 'true' || v === 1) return true;
  return false;
}

function getSettingNumber(key) {
  const v = getSetting(key);
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// ══════════════════════════════════════════════════════════
// MAIN ENTRY — appendSettingsProSections
// ══════════════════════════════════════════════════════════

function appendSettingsProSections() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SETTINGSPRO_TAB);
  if (!s) {
    _safeAlert('❌ ⚙️ Settings tab not found. Run Code.gs setupStep1 first.');
    return;
  }

  s.getRange(SETTINGSPRO_START_ROW, 1, 311, 6).clearContent().clearFormat();

  let row = SETTINGSPRO_START_ROW;
  row = buildSection01_SystemStatus(s, row);
  row = buildSection02_QuestTracking(s, row);
  row = buildSection03_NotificationPrefs(s, row);
  row = buildSection04_AIGeminiConfig(s, row);
  row = buildSection05_TelegramBotConfig(s, row);
  row = buildSection06_WebAppDashboard(s, row);
  row = buildSection07_PillarWeights(s, row);
  row = buildSection08_HabitTargets(s, row);
  row = buildSection09_SalahTargets(s, row);
  row = buildSection10_FinanceTargets(s, row);
  row = buildSection11_KnowledgeTargets(s, row);
  row = buildSection12_CareerTargets(s, row);
  row = buildSection13_HealthTargets(s, row);
  row = buildSection14_DisciplineTriggers(s, row);
  row = buildSection15_AuditLogConfig(s, row);
  row = buildSection16_QuickActions(s, row);
  row = buildSection17_DataSources(s, row);
  row = buildSection18_BackupConfig(s, row);
  row = buildSection19_PrivacyConfig(s, row);
  row = buildSection20_DebugConfig(s, row);
  row = buildSection21_LoggingConfig(s, row);
  row = buildSection22_PerformanceConfig(s, row);
  row = buildSection23_FeatureFlags(s, row);

  appendSettingsMenu();
  enforceToggles();

  _safeAlert('✅ Settings_Pro v3.3 ELITE installed.\n\n' +
             '23 sections · single source of truth\n' +
             'Use getSetting(key) from any file to read values.\n\n' +
             'v3.2 fix: column B "=" separators now stored as text — no more #ERROR!\n\n' +
             'NEW v3.1: Emergency Stop + Resume + Timezone Verifier\n' +
             'Menu → ⚙️ Settings → 🔍 Maintenance');
}

// ──────────────────────────────────────────────────────────
// SECTION HELPER — write a section header + key/value/desc rows
// ──────────────────────────────────────────────────────────

function _writeSectionHeader(s, row, label) {
  s.getRange(row, 1, 1, 6).merge()
    .setValue(label)
    .setBackground('#0F172A').setFontColor('#FBBF24').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(row, 32);
  return row + 1;
}

function _writeSettingRow(s, row, key, value, desc, isFormula) {
  // Col A — key
  s.getRange(row, 1).setValue(key)
    .setBackground('#1E293B').setFontColor('#F1F5F9').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');

  // Col B — cosmetic "=" separator
  // FIX v3.2: setNumberFormat('@') BEFORE setValue('=') so Sheets stores
  // it as literal text instead of trying to parse as a formula → no #ERROR!
  const eqCell = s.getRange(row, 2, 1, 1);
  eqCell.setNumberFormat('@');
  eqCell.setValue("'=");
  eqCell.setBackground('#1E293B').setFontColor('#94A3B8').setFontSize(10)
        .setHorizontalAlignment('center');

  // Col C — actual value (or formula if flagged)
  if (isFormula && typeof value === 'string' && value.charAt(0) === '=') {
    s.getRange(row, 3).setFormula(value);
  } else {
    s.getRange(row, 3).setValue(value);
  }
  s.getRange(row, 3).setBackground('#FEF3C7').setFontColor('#0F172A').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Cols D-F — description (merged)
  s.getRange(row, 4, 1, 3).merge().setValue(desc || '')
    .setBackground('#1E293B').setFontColor('#CBD5E1').setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(true);

  s.setRowHeight(row, 26);
  return row + 1;
}

function _writeSpacer(s, row) {
  s.getRange(row, 1, 1, 6).setBackground('#0F172A');
  s.setRowHeight(row, 8);
  return row + 1;
}

// ══════════════════════════════════════════════════════════
// SECTION BUILDERS (1-23)
// ══════════════════════════════════════════════════════════

function buildSection01_SystemStatus(s, row) {
  row = _writeSectionHeader(s, row, '📊 SECTION 1: SYSTEM STATUS — overall health snapshot');
  row = _writeSettingRow(s, row, 'PRO_VERSION', 'v3.2 ELITE', 'Settings_Pro version');
  row = _writeSettingRow(s, row, 'PRO_OPERATOR', 'Abu Walah', 'Operator kunya');
  row = _writeSettingRow(s, row, 'PRO_QUEST_DAY_NOW', '=MAX(1,TODAY()-DATE(2026,4,25)+1)', 'Current quest day (auto)', true);
  row = _writeSettingRow(s, row, 'PRO_CURRENT_PHASE', '=IF(C32<=30,"Phase 1: Foundation",IF(C32<=60,"Phase 2: Build","Phase 3: Sovereign"))', 'Auto-derived phase', true);
  row = _writeSettingRow(s, row, 'PRO_TIMEZONE', 'Asia/Karachi', 'Operator timezone');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection02_QuestTracking(s, row) {
  row = _writeSectionHeader(s, row, '🎯 SECTION 2: QUEST TRACKING — 90-day sovereign quest');
  row = _writeSettingRow(s, row, 'PRO_QUEST_START', '2026-04-25', 'Quest start date');
  row = _writeSettingRow(s, row, 'PRO_QUEST_DAYS', 90, 'Total quest length');
  row = _writeSettingRow(s, row, 'PRO_QUEST_END', '=DATE(2026,4,25)+90', 'Auto-computed end date', true);
  row = _writeSettingRow(s, row, 'PRO_QUEST_DAYS_LEFT', '=MAX(0,90-(TODAY()-DATE(2026,4,25)))', 'Days remaining', true);
  row = _writeSettingRow(s, row, 'PRO_QUEST_PCT_DONE', '=ROUND((TODAY()-DATE(2026,4,25))/90*100,1)', '% complete', true);
  row = _writeSpacer(s, row);
  return row;
}

function buildSection03_NotificationPrefs(s, row) {
  row = _writeSectionHeader(s, row, '🔔 SECTION 3: NOTIFICATION PREFERENCES');
  row = _writeSettingRow(s, row, 'PRO_NOTIF_EMAIL', Session.getActiveUser().getEmail(), 'Email for digests/briefings');
  row = _writeSettingRow(s, row, 'PRO_NOTIF_EMAIL_TIME', 22, 'Hour to send daily digest (24h)');
  row = _writeSettingRow(s, row, 'PRO_NOTIF_BRIEFING_HOUR', 5, 'Hour to send AI briefing (24h)');
  row = _writeSettingRow(s, row, 'PRO_NOTIF_TELEGRAM_ENABLED', true, 'Send Telegram briefings?');
  row = _writeSettingRow(s, row, 'PRO_NOTIF_EMAIL_ENABLED', true, 'Send email digests?');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection04_AIGeminiConfig(s, row) {
  row = _writeSectionHeader(s, row, '🧠 SECTION 4: AI & GEMINI — coach engine');
  row = _writeSettingRow(s, row, 'PRO_AI_ENABLED', true, 'Enable Gemini integration?');
  row = _writeSettingRow(s, row, 'PRO_AI_MODEL', 'gemini-2.5-flash-lite', 'Gemini model name');
  row = _writeSettingRow(s, row, 'PRO_AI_BRIEFING_ENABLED', true, 'Daily AI briefing trigger active?');
  row = _writeSettingRow(s, row, 'PRO_AI_NAQD_ENABLED', true, 'Auto-prompt naqd reflection?');
  row = _writeSettingRow(s, row, 'PRO_AI_TONE', 'forensic', 'AI voice: forensic / coaching / poetic');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection05_TelegramBotConfig(s, row) {
  row = _writeSectionHeader(s, row, '📱 SECTION 5: TELEGRAM BOT — 26 commands');
  row = _writeSettingRow(s, row, 'PRO_TELEGRAM_BOT_ENABLED', true, 'Enable Telegram bot polling?');
  row = _writeSettingRow(s, row, 'PRO_TELEGRAM_POLL_FREQUENCY', 1, 'Poll every N minutes');
  row = _writeSettingRow(s, row, 'PRO_TELEGRAM_VERBOSE', false, 'Verbose Telegram responses?');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection06_WebAppDashboard(s, row) {
  row = _writeSectionHeader(s, row, '📲 SECTION 6: WEB APP / PHONE DASHBOARD');
  row = _writeSettingRow(s, row, 'PRO_WEBAPP_ENABLED', true, 'Web app deployed?');
  row = _writeSettingRow(s, row, 'PRO_WEBAPP_REFRESH_SEC', 30, 'Phone dashboard auto-reload (sec)');
  row = _writeSettingRow(s, row, 'PRO_WEBAPP_PIN_PROTECTED', false, 'Require PIN to access?');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection07_PillarWeights(s, row) {
  row = _writeSectionHeader(s, row, '🏛️ SECTION 7: PILLAR WEIGHTS — 5 pillars');
  row = _writeSettingRow(s, row, 'PRO_PILLAR_DEEN_WEIGHT', 30, 'Deen pillar weight (%)');
  row = _writeSettingRow(s, row, 'PRO_PILLAR_BODY_WEIGHT', 20, 'Body pillar weight (%)');
  row = _writeSettingRow(s, row, 'PRO_PILLAR_MONEY_WEIGHT', 20, 'Money pillar weight (%)');
  row = _writeSettingRow(s, row, 'PRO_PILLAR_KNOWLEDGE_WEIGHT', 20, 'Knowledge pillar weight (%)');
  row = _writeSettingRow(s, row, 'PRO_PILLAR_FAMILY_WEIGHT', 10, 'Family pillar weight (%)');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection08_HabitTargets(s, row) {
  row = _writeSectionHeader(s, row, '📋 SECTION 8: HABIT TARGETS');
  row = _writeSettingRow(s, row, 'PRO_HABIT_DAILY_TARGET', 14, 'Min habits done per day');
  row = _writeSettingRow(s, row, 'PRO_HABIT_WEEKLY_TARGET', 90, 'Weekly completion % target');
  row = _writeSettingRow(s, row, 'PRO_HABIT_STREAK_TARGET', 30, 'Min streak target');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection09_SalahTargets(s, row) {
  row = _writeSectionHeader(s, row, '🕌 SECTION 9: SALAH TARGETS');
  row = _writeSettingRow(s, row, 'PRO_SALAH_DAILY_TARGET', 5, '5/5 daily prayers');
  row = _writeSettingRow(s, row, 'PRO_SALAH_MASJID_WEEKLY', 25, 'Weekly Masjid target');
  row = _writeSettingRow(s, row, 'PRO_SALAH_TAHAJJUD_WEEKLY', 3, 'Weekly Tahajjud target');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection10_FinanceTargets(s, row) {
  row = _writeSectionHeader(s, row, '💰 SECTION 10: FINANCE TARGETS');
  row = _writeSettingRow(s, row, 'PRO_FIN_DEBT_PAYOFF_TARGET', 100, '% debt payoff goal');
  row = _writeSettingRow(s, row, 'PRO_FIN_MONTHLY_SAVINGS', 20000, 'Monthly savings target (PKR)');
  row = _writeSettingRow(s, row, 'PRO_FIN_EMERGENCY_FUND', 100000, 'Emergency fund target (PKR)');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection11_KnowledgeTargets(s, row) {
  row = _writeSectionHeader(s, row, '📚 SECTION 11: KNOWLEDGE TARGETS');
  row = _writeSettingRow(s, row, 'PRO_QURAN_DAILY_MIN', 15, 'Min Quran reading minutes/day');
  row = _writeSettingRow(s, row, 'PRO_BOOKS_MONTHLY', 1, 'Books to finish per month');
  row = _writeSettingRow(s, row, 'PRO_NAQD_WEEKLY', 7, 'Naqd reflections per week');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection12_CareerTargets(s, row) {
  row = _writeSectionHeader(s, row, '🎯 SECTION 12: CAREER TARGETS — Motive');
  row = _writeSettingRow(s, row, 'PRO_MOTIVE_AHT_TARGET', 9.7, 'AHT target (min)');
  row = _writeSettingRow(s, row, 'PRO_MOTIVE_CSAT_TARGET', 97, 'CSAT target (%)');
  row = _writeSettingRow(s, row, 'PRO_MOTIVE_OCC_TARGET', 87.15, 'Occupancy target (%)');
  row = _writeSettingRow(s, row, 'PRO_MOTIVE_MRT_TARGET', 0.10, 'MRT target (days)');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection13_HealthTargets(s, row) {
  row = _writeSectionHeader(s, row, '💪 SECTION 13: HEALTH TARGETS');
  row = _writeSettingRow(s, row, 'PRO_WEIGHT_TARGET_KG', 69, 'Weight target (kg)');
  row = _writeSettingRow(s, row, 'PRO_WEIGHT_WEEKLY_LOSS', 0.8, 'Weekly weight loss target (kg)');
  row = _writeSettingRow(s, row, 'PRO_WATER_DAILY_L', 3, 'Water target (L/day)');
  row = _writeSettingRow(s, row, 'PRO_SLEEP_HOURS_TARGET', 7, 'Sleep target (hrs)');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection14_DisciplineTriggers(s, row) {
  row = _writeSectionHeader(s, row, '🛡️ SECTION 14: DISCIPLINE TRIGGERS');
  row = _writeSettingRow(s, row, 'PRO_HABIT_ONE_LONGEST', 16, 'Habit One longest streak');
  row = _writeSettingRow(s, row, 'PRO_HABIT_ONE_TARGET', 90, 'Habit One target streak');
  row = _writeSettingRow(s, row, 'PRO_NO_SCROLL_AFTER_HOUR', 22, 'No social scroll after hour');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection15_AuditLogConfig(s, row) {
  row = _writeSectionHeader(s, row, '📜 SECTION 15: AUDIT LOG');
  row = _writeSettingRow(s, row, 'PRO_AUDIT_LOG_ENABLED', true, 'Log all settings changes?');
  row = _writeSettingRow(s, row, 'PRO_AUDIT_RETENTION_DAYS', 90, 'Days to retain audit log');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection16_QuickActions(s, row) {
  row = _writeSectionHeader(s, row, '⚡ SECTION 16: QUICK ACTIONS');
  row = _writeSettingRow(s, row, 'PRO_ACTION_SHOW_SHORTCUTS', true, 'Show keyboard shortcuts in cockpits?');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection17_DataSources(s, row) {
  row = _writeSectionHeader(s, row, '🔗 SECTION 17: DATA SOURCES');
  row = _writeSettingRow(s, row, 'PRO_PRAYER_API_CITY', 'Multan', 'City for Aladhan prayer times API');
  row = _writeSettingRow(s, row, 'PRO_PRAYER_API_METHOD', 1, 'Calculation method (1=Karachi)');
  row = _writeSettingRow(s, row, 'PRO_FX_API', 'open.er-api.com', 'FX rate API base');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection18_BackupConfig(s, row) {
  row = _writeSectionHeader(s, row, '💾 SECTION 18: BACKUP CONFIG');
  row = _writeSettingRow(s, row, 'PRO_BACKUP_AUTO_MONTHLY', true, 'Auto-archive each month?');
  row = _writeSettingRow(s, row, 'PRO_BACKUP_RETAIN_MONTHS', 12, 'Months of archives to keep');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection19_PrivacyConfig(s, row) {
  row = _writeSectionHeader(s, row, '🔒 SECTION 19: PRIVACY');
  row = _writeSettingRow(s, row, 'PRO_PRIVACY_HIDE_FINANCE', false, 'Mask amounts in shared views?');
  row = _writeSettingRow(s, row, 'PRO_PRIVACY_REQUIRE_AUTH', true, 'Require auth for web app?');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection20_DebugConfig(s, row) {
  row = _writeSectionHeader(s, row, '🐛 SECTION 20: DEBUG');
  row = _writeSettingRow(s, row, 'PRO_DEBUG_VERBOSE_LOGGING', false, 'Log every function call?');
  row = _writeSettingRow(s, row, 'PRO_DEBUG_TRACE_ERRORS', true, 'Trace errors with stack?');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection21_LoggingConfig(s, row) {
  row = _writeSectionHeader(s, row, '📝 SECTION 21: LOGGING');
  row = _writeSettingRow(s, row, 'PRO_LOG_TO_AI_MEMORY', true, 'Log AI calls to 🧠 AI Memory tab?');
  row = _writeSettingRow(s, row, 'PRO_LOG_TELEGRAM_COMMANDS', true, 'Log all Telegram bot commands?');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection22_PerformanceConfig(s, row) {
  row = _writeSectionHeader(s, row, '⚡ SECTION 22: PERFORMANCE');
  row = _writeSettingRow(s, row, 'PRO_PERF_BATCH_SIZE', 50, 'Max rows per batch read/write');
  row = _writeSettingRow(s, row, 'PRO_PERF_CACHE_TTL_SEC', 300, 'Cache TTL for expensive lookups');
  row = _writeSpacer(s, row);
  return row;
}

function buildSection23_FeatureFlags(s, row) {
  row = _writeSectionHeader(s, row, '🚩 SECTION 23: FEATURE FLAGS');
  row = _writeSettingRow(s, row, 'PRO_FEAT_DARK_MODE', false, 'Dark mode for cockpits (future)');
  row = _writeSettingRow(s, row, 'PRO_FEAT_VOICE_INPUT', false, 'Voice input via Telegram (future)');
  row = _writeSettingRow(s, row, 'PRO_FEAT_AUTO_INSIGHTS', true, 'Generate insights without prompt');
  row = _writeSpacer(s, row);
  return row;
}

// ══════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════

function logAuditAction(action, detail) {
  if (!getSettingBool('PRO_AUDIT_LOG_ENABLED')) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let log = ss.getSheetByName(SETTINGSPRO_AUDIT_LOG);
  if (!log) {
    log = ss.insertSheet(SETTINGSPRO_AUDIT_LOG);
    log.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Action', 'Detail', 'User']])
      .setBackground('#0F172A').setFontColor('#FBBF24').setFontWeight('bold');
    try { log.hideSheet(); } catch(e) {}
  }
  log.appendRow([new Date(), action, detail || '', Session.getActiveUser().getEmail()]);
}

function viewAuditLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const log = ss.getSheetByName(SETTINGSPRO_AUDIT_LOG);
  if (!log) { _safeAlert('No audit log yet.'); return; }
  log.showSheet();
  ss.setActiveSheet(log);
  _safeAlert('📜 Audit log opened.\n\nTo hide again: right-click tab → Hide.');
}

// ══════════════════════════════════════════════════════════
// SYSTEM STATUS UPDATE
// ══════════════════════════════════════════════════════════

function updateSystemStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SETTINGSPRO_TAB);
  if (!s) return;

  const triggerCount = ScriptApp.getProjectTriggers().length;
  const aiTab = ss.getSheetByName('🧠 AI Memory');
  const aiCalls = aiTab ? Math.max(0, aiTab.getLastRow() - 1) : 0;

  s.getRange(31, 3).setValue('v3.2 ELITE');
  s.getRange(32, 3).setValue('Abu Walah');

  _safeAlert('✅ System status updated.\n\nTriggers: ' + triggerCount + '\nAI calls logged: ' + aiCalls);
}

// ══════════════════════════════════════════════════════════
// ENFORCE TOGGLES — re-install triggers per current Settings flags
// ══════════════════════════════════════════════════════════

function enforceToggles() {
  const aiBriefing = getSettingBool('PRO_AI_BRIEFING_ENABLED');
  const aiNaqd = getSettingBool('PRO_AI_NAQD_ENABLED');
  const telegramBot = getSettingBool('PRO_TELEGRAM_BOT_ENABLED');
  const emailDigest = getSettingBool('PRO_NOTIF_EMAIL_ENABLED');
  const telegramBriefing = getSettingBool('PRO_NOTIF_TELEGRAM_ENABLED');
  const briefingHour = getSettingNumber('PRO_NOTIF_BRIEFING_HOUR') || 5;
  const emailHour = getSettingNumber('PRO_NOTIF_EMAIL_TIME') || 22;
  const pollFreq = getSettingNumber('PRO_TELEGRAM_POLL_FREQUENCY') || 1;

  function _ensureTrigger(handler, installFn) {
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === handler) ScriptApp.deleteTrigger(t);
    });
    if (installFn) installFn();
  }

  let installed = 0;

  if (aiBriefing && typeof sendSovereignBriefing === 'function') {
    _ensureTrigger('sendSovereignBriefing', () => {
      ScriptApp.newTrigger('sendSovereignBriefing').timeBased().atHour(briefingHour).everyDays(1).create();
      installed++;
    });
  } else { _ensureTrigger('sendSovereignBriefing', null); }

  if (telegramBriefing && typeof sendSovereignBriefingToTelegram === 'function') {
    _ensureTrigger('sendSovereignBriefingToTelegram', () => {
      ScriptApp.newTrigger('sendSovereignBriefingToTelegram').timeBased().atHour(briefingHour).everyDays(1).create();
      installed++;
    });
  } else { _ensureTrigger('sendSovereignBriefingToTelegram', null); }

  if (telegramBot && typeof pollTelegram === 'function') {
    _ensureTrigger('pollTelegram', () => {
      ScriptApp.newTrigger('pollTelegram').timeBased().everyMinutes(pollFreq).create();
      installed++;
    });
  } else { _ensureTrigger('pollTelegram', null); }

  if (aiNaqd && typeof autoPromptNaqd === 'function') {
    _ensureTrigger('autoPromptNaqd', () => {
      ScriptApp.newTrigger('autoPromptNaqd').timeBased().atHour(22).everyDays(1).create();
      installed++;
    });
  } else { _ensureTrigger('autoPromptNaqd', null); }

  if (typeof checkBillsDueAlerts === 'function') {
    _ensureTrigger('checkBillsDueAlerts', () => {
      ScriptApp.newTrigger('checkBillsDueAlerts').timeBased().atHour(8).everyDays(1).create();
      installed++;
    });
  }

  if (typeof refreshPrayerTimesMultan === 'function') {
    _ensureTrigger('refreshPrayerTimesMultan', () => {
      ScriptApp.newTrigger('refreshPrayerTimesMultan').timeBased().atHour(4).everyDays(1).create();
      installed++;
    });
  }

  if (typeof highlightToday === 'function') {
    _ensureTrigger('highlightToday', () => {
      ScriptApp.newTrigger('highlightToday').timeBased().atHour(0).everyDays(1).create();
      installed++;
    });
  }

  if (typeof refreshMission === 'function') {
    _ensureTrigger('refreshMission', () => {
      ScriptApp.newTrigger('refreshMission').timeBased().atHour(briefingHour).everyDays(1).create();
      installed++;
    });
  }

  if (emailDigest && typeof sendDailyDigest === 'function') {
    _ensureTrigger('sendDailyDigest', () => {
      ScriptApp.newTrigger('sendDailyDigest').timeBased().atHour(emailHour).everyDays(1).create();
      installed++;
    });
  } else { _ensureTrigger('sendDailyDigest', null); }

  return installed;
}

function actEnforceToggles() {
  const count = enforceToggles();
  logAuditAction('ENFORCE_TOGGLES', count + ' triggers installed');
  _safeAlert('✅ Toggles enforced.\n\n' + count + ' triggers installed per current Settings flags.');
}

// ══════════════════════════════════════════════════════════
// REMOVE ALL TRIGGERS
// ══════════════════════════════════════════════════════════

function removeAllTriggers() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Remove ALL triggers?', 'This kills every scheduled handler. You can re-install via Enforce Toggles.', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    try { ScriptApp.deleteTrigger(t); } catch(e) {}
  });
  logAuditAction('REMOVE_TRIGGERS', triggers.length + ' triggers removed');
  _safeAlert('🗑️ ' + triggers.length + ' triggers removed.\n\nRun Enforce Toggles to re-install.');
}

// ══════════════════════════════════════════════════════════
// 🆕 EMERGENCY STOP / RESUME / TIMEZONE VERIFY (v3.1)
// ══════════════════════════════════════════════════════════

function cmdEmergencyStop() {
  if (_isSystemPaused()) {
    _safeAlert('⚠️ System is ALREADY paused.\n\nRun Resume to re-activate.');
    return;
  }

  PropertiesService.getScriptProperties().setProperty('SYSTEM_PAUSED', 'true');

  const triggers = ScriptApp.getProjectTriggers();
  let killed = 0;
  let failed = 0;
  triggers.forEach(t => {
    try { ScriptApp.deleteTrigger(t); killed++; } catch(e) { failed++; }
  });

  logAuditAction('SYSTEM_STOP', 'Killed ' + killed + ' triggers (' + failed + ' failed)');

  _safeAlert('🚨 EMERGENCY STOP ACTIVE\n\n' +
             killed + ' triggers killed.\n' +
             (failed > 0 ? failed + ' failed to delete (rare — manual cleanup may be needed).\n' : '') +
             '\nSystem is now silent. No briefings, no polling, no auto-actions.\n\n' +
             'To resume: Menu → ⚙️ Settings → 🔍 Maintenance → ▶️ Resume System');
}

function cmdResume() {
  if (!_isSystemPaused()) {
    _safeAlert('ℹ️ System is NOT paused — already running normally.\n\n' +
               'If you want to refresh triggers per Settings flags, use 🔧 Enforce Toggles instead.');
    return;
  }

  PropertiesService.getScriptProperties().setProperty('SYSTEM_PAUSED', 'false');

  const installed = enforceToggles();

  logAuditAction('SYSTEM_RESUME', 'Re-installed ' + installed + ' triggers');

  _safeAlert('▶️ System resumed.\n\n' +
             installed + ' triggers re-installed per current Settings flags.\n\n' +
             'If a feature is missing, check the corresponding flag in Settings is enabled, then click 🔧 Enforce Toggles again.');
}

function verifyTimezone() {
  const scriptTz = Session.getScriptTimeZone();
  const ssTz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const expected = 'Asia/Karachi';

  let report = '🌍 TIMEZONE VERIFICATION\n\n';
  report += 'Expected: ' + expected + ' (PKT)\n\n';
  report += 'Script timezone: ' + scriptTz + ' ' + (scriptTz === expected ? '✅' : '⚠️') + '\n';
  report += 'Sheet timezone:  ' + ssTz + ' ' + (ssTz === expected ? '✅' : '⚠️') + '\n\n';

  const allGood = (scriptTz === expected && ssTz === expected);

  if (allGood) {
    report += '✅ All timezones aligned to PKT.\n\n' +
              'getQuestDay() returns correct PKT calendar day at all hours.';
  } else {
    report += '⚠️ Mismatch detected.\n\n';
    if (scriptTz !== expected) {
      report += 'Fix script timezone:\n' +
                '  Apps Script editor → Project Settings (gear icon)\n' +
                '  → Time zone → select Asia/Karachi → Save\n\n';
    }
    if (ssTz !== expected) {
      report += 'Fix sheet timezone:\n' +
                '  Sheet menu → File → Settings → General\n' +
                '  → Time zone → select Asia/Karachi → Save\n\n';
    }
    report += 'NOTE: Code v5.2+ uses timezone-safe getQuestDay() so Day counter ' +
              'still works correctly even with mismatch — but other date displays ' +
              'may show the wrong PKT day at edge hours.';
  }

  _safeAlert(report);
}

// ══════════════════════════════════════════════════════════
// INTEGRITY CHECK
// ══════════════════════════════════════════════════════════

function verifySettingsProIntegrity() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SETTINGSPRO_TAB);
  if (!s) { _safeAlert('❌ Settings tab missing.'); return; }

  const expectedSections = [
    'SECTION 1: SYSTEM STATUS',
    'SECTION 2: QUEST TRACKING',
    'SECTION 3: NOTIFICATION PREFERENCES',
    'SECTION 4: AI & GEMINI',
    'SECTION 5: TELEGRAM BOT',
    'SECTION 6: WEB APP',
    'SECTION 7: PILLAR WEIGHTS',
    'SECTION 8: HABIT TARGETS',
    'SECTION 9: SALAH TARGETS',
    'SECTION 10: FINANCE TARGETS',
    'SECTION 11: KNOWLEDGE TARGETS',
    'SECTION 12: CAREER TARGETS',
    'SECTION 13: HEALTH TARGETS',
    'SECTION 14: DISCIPLINE TRIGGERS',
    'SECTION 15: AUDIT LOG',
    'SECTION 16: QUICK ACTIONS',
    'SECTION 17: DATA SOURCES',
    'SECTION 18: BACKUP CONFIG',
    'SECTION 19: PRIVACY',
    'SECTION 20: DEBUG',
    'SECTION 21: LOGGING',
    'SECTION 22: PERFORMANCE',
    'SECTION 23: FEATURE FLAGS'
  ];

  let report = '🔍 SETTINGS_PRO v3.2 INTEGRITY\n\n';
  let found = 0;
  let allRows = s.getRange(SETTINGSPRO_START_ROW, 1, 311, 1).getValues().map(r => r[0]);

  expectedSections.forEach(sec => {
    const exists = allRows.some(v => v && v.toString().indexOf(sec) !== -1);
    report += (exists ? '✅' : '❌') + ' ' + sec + '\n';
    if (exists) found++;
  });

  report += '\nFound ' + found + '/23 sections\n';

  const paused = _isSystemPaused();
  report += '\n' + (paused ? '🚨 SYSTEM PAUSED' : '✅ System running');

  const allOk = (found === 23);
  report += '\n\n' + (allOk ? '✅ ALL SECTIONS OPERATIONAL' : '⚠️ ISSUES DETECTED — re-run appendSettingsProSections');

  _safeAlert(report);

  verifyTimezone();
}

// ══════════════════════════════════════════════════════════
// QUICK ACTIONS — wrappers for menu
// ══════════════════════════════════════════════════════════

function actDebugGemini() {
  if (typeof debugGemini === 'function') debugGemini();
  else _safeAlert('❌ debugGemini() not found in AI.gs');
}

function actTestTelegram() {
  if (typeof testTelegram === 'function') testTelegram();
  else _safeAlert('❌ testTelegram() not found in Telegram.gs');
}

function actSendBriefingNow() {
  if (typeof sendSovereignBriefing === 'function') sendSovereignBriefing();
  else _safeAlert('❌ sendSovereignBriefing() not found.');
}

function actSendDigestNow() {
  if (typeof sendDailyDigest === 'function') sendDailyDigest();
  else _safeAlert('❌ sendDailyDigest() not found.');
}

function actInstallTriggers() {
  if (typeof installTriggers === 'function') installTriggers();
  else _safeAlert('❌ installTriggers() not found.');
}

// ══════════════════════════════════════════════════════════
// MENU
// ══════════════════════════════════════════════════════════

function appendSettingsMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('⚙️ Settings')
      .addItem('🔄 Rebuild Pro Sections (23)', 'appendSettingsProSections')
      .addSeparator()
      .addItem('🔍 Verify Integrity', 'verifySettingsProIntegrity')
      .addItem('🌍 Verify Timezone', 'verifyTimezone')
      .addItem('🔄 Update System Status', 'updateSystemStatus')
      .addSeparator()
      .addSubMenu(SpreadsheetApp.getUi().createMenu('⚡ Quick Actions')
        .addItem('🧠 Debug Gemini (PONG test)', 'actDebugGemini')
        .addItem('📱 Test Telegram', 'actTestTelegram')
        .addItem('📧 Send Briefing Now', 'actSendBriefingNow')
        .addItem('📨 Send Digest Now', 'actSendDigestNow'))
      .addSubMenu(SpreadsheetApp.getUi().createMenu('🔍 Maintenance')
        .addItem('🔧 Enforce Toggles', 'actEnforceToggles')
        .addItem('🚨 EMERGENCY STOP (kill all triggers)', 'cmdEmergencyStop')
        .addItem('▶️ Resume System (re-install per flags)', 'cmdResume')
        .addItem('🗑️ Remove All Triggers', 'removeAllTriggers')
        .addItem('📜 View Audit Log', 'viewAuditLog'))
      .addToUi();
  } catch (e) { Logger.log('Settings menu add failed: ' + e); }
}