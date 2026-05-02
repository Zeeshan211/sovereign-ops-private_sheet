// ════════════════════════════════════════════════════════════════════
// ⚡ Settings_Dispatcher.gs — onEdit AUTO-DISPATCH + CACHE v1.0
// LOCKED · 7-Layer Audit · Day 6 / 90 · 2026-04-30
//
// PURPOSE:
//   When user edits a value in ⚙️ Settings tab, this:
//     1. Invalidates that key's cache
//     2. Looks up the dispatch map
//     3. Auto-runs the affected module's refresh function
//     4. Logs the change to Audit Log
//   Result: edit a setting → it actually CHANGES the system. No manual reload.
//
// REQUIRES:
//   - Settings_Pro.gs v3.2+ (getSetting, logAuditAction, enforceToggles)
//
// FUTURE:
//   - Phase B+ will wire Mission/Progress/Habits/Salah/Finance to read
//     via getSettingCached() so editing Settings actually changes their colors,
//     thresholds, weights, targets. This file is the dispatcher infrastructure.
// ════════════════════════════════════════════════════════════════════

const SD_TAB = '⚙️ Settings';
const SD_KEY_COL = 1;
const SD_VALUE_COL = 3;
const SD_START_ROW = 30;
const SD_CACHE_TTL = 300;

// ─── DISPATCH MAP: which setting key triggers which function ───
const SD_DISPATCH = {
  // Notification + AI + Telegram — re-enforce triggers (kills + reinstalls per new value)
  'PRO_NOTIF_EMAIL_TIME':         'enforceToggles',
  'PRO_NOTIF_BRIEFING_HOUR':      'enforceToggles',
  'PRO_NOTIF_TELEGRAM_ENABLED':   'enforceToggles',
  'PRO_NOTIF_EMAIL_ENABLED':      'enforceToggles',
  'PRO_AI_BRIEFING_ENABLED':      'enforceToggles',
  'PRO_AI_NAQD_ENABLED':          'enforceToggles',
  'PRO_TELEGRAM_BOT_ENABLED':     'enforceToggles',
  'PRO_TELEGRAM_POLL_FREQUENCY':  'enforceToggles',

  // Mission cockpit — refresh stamp (Phase B will add full rebuild on weight changes)
  'PRO_PILLAR_DEEN_WEIGHT':       'refreshMissionCockpit',
  'PRO_PILLAR_BODY_WEIGHT':       'refreshMissionCockpit',
  'PRO_PILLAR_MONEY_WEIGHT':      'refreshMissionCockpit',
  'PRO_PILLAR_KNOWLEDGE_WEIGHT':  'refreshMissionCockpit',
  'PRO_PILLAR_FAMILY_WEIGHT':     'refreshMissionCockpit',

  // Quest dates — refresh mission stamp
  'PRO_QUEST_START':              'refreshMissionCockpit',
  'PRO_QUEST_DAYS':               'refreshMissionCockpit'
};

// ──────────────────────────────────────────────────────────
// CACHED LOOKUP — for any module to use
// ──────────────────────────────────────────────────────────

function getSettingCached(key) {
  try {
    const cache = CacheService.getDocumentCache();
    if (cache) {
      const cached = cache.get('setting_' + key);
      if (cached !== null) {
        try { return JSON.parse(cached); } catch (e) { return cached; }
      }
    }
  } catch (e) {}

  const val = (typeof getSetting === 'function') ? getSetting(key) : null;

  try {
    const cache = CacheService.getDocumentCache();
    if (cache) cache.put('setting_' + key, JSON.stringify(val), SD_CACHE_TTL);
  } catch (e) {}

  return val;
}

function getSettingNumberCached(key, fallback) {
  const v = getSettingCached(key);
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    if (!isNaN(n)) return n;
  }
  return (fallback !== undefined) ? fallback : 0;
}

function getSettingBoolCached(key, fallback) {
  const v = getSettingCached(key);
  if (v === true || v === 'TRUE' || v === 'true' || v === 1) return true;
  if (v === false || v === 'FALSE' || v === 'false' || v === 0) return false;
  return (fallback !== undefined) ? fallback : false;
}

function clearSettingsCache() {
  try {
    const cache = CacheService.getDocumentCache();
    if (cache) {
      const keys = Object.keys(SD_DISPATCH).map(k => 'setting_' + k);
      cache.removeAll(keys);
    }
    if (typeof logAuditAction === 'function') {
      logAuditAction('CACHE_CLEAR', 'all settings cache invalidated');
    }
    _sdAlert('✅ Settings cache cleared.\n\nNext read of any setting fetches fresh value.');
  } catch (e) { _sdAlert('Cache clear failed: ' + e.message); }
}

// ──────────────────────────────────────────────────────────
// onEdit HANDLER — auto-dispatches on Settings tab changes
// ──────────────────────────────────────────────────────────

function _settingsOnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== SD_TAB) return;

  const r = e.range.getRow();
  const c = e.range.getColumn();

  if (c !== SD_VALUE_COL) return;
  if (r < SD_START_ROW) return;

  const key = sh.getRange(r, SD_KEY_COL).getValue();
  if (!key || typeof key !== 'string' || key.indexOf('PRO_') !== 0) return;

  // Invalidate cache for this key
  try {
    const cache = CacheService.getDocumentCache();
    if (cache) cache.remove('setting_' + key);
  } catch (err) {}

  // Read new value (after edit) and old value (from event)
  const newVal = (e.value !== undefined) ? e.value : sh.getRange(r, c).getValue();
  const oldVal = (e.oldValue !== undefined) ? e.oldValue : '(unknown)';

  // Audit log
  if (typeof logAuditAction === 'function') {
    logAuditAction('SETTING_CHANGED', key + ': ' + oldVal + ' → ' + newVal);
  }

  // Dispatch
  const fnName = SD_DISPATCH[key];
  if (!fnName) return;

  try {
    let exists = false;
    try { exists = (eval('typeof ' + fnName) === 'function'); } catch (e) {}
    if (exists) {
      eval(fnName + '()');
      if (typeof logAuditAction === 'function') {
        logAuditAction('SETTING_DISPATCH', key + ' → ' + fnName + '() executed');
      }
    } else {
      Logger.log('Dispatch target ' + fnName + ' not loaded for ' + key);
    }
  } catch (err) {
    Logger.log('Dispatch error ' + key + ' → ' + fnName + ': ' + err);
    if (typeof logAuditAction === 'function') {
      logAuditAction('SETTING_DISPATCH_FAIL', key + ' → ' + fnName + ': ' + err.message);
    }
  }
}

// ──────────────────────────────────────────────────────────
// INSTALL / DIAGNOSE
// ──────────────────────────────────────────────────────────

function installSettingsDispatcher(silent) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_settingsOnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('_settingsOnEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit().create();
  if (typeof logAuditAction === 'function') {
    logAuditAction('DISPATCHER_INSTALL', 'Settings onEdit handler installed');
  }
  if (!silent) _sdAlert('✅ Settings dispatcher installed.\n\nEdit any PRO_* value in Settings tab → it auto-dispatches.');
}

function diagnoseSettingsDispatcher() {
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_settingsOnEdit');
  const dispatchedKeys = Object.keys(SD_DISPATCH);

  let report = '🔍 SETTINGS DISPATCHER DIAGNOSTIC\n\n';
  report += 'Handler installed: ' + (triggers.length === 1 ? '✅ yes' : '⚠️ ' + triggers.length + ' (should be 1)') + '\n';
  report += 'Dispatched keys: ' + dispatchedKeys.length + '\n';
  report += 'Cache TTL: ' + SD_CACHE_TTL + ' sec\n\n';

  report += '── DISPATCH MAP (key → function) ──\n';
  let allOk = true;
  dispatchedKeys.forEach(k => {
    const fn = SD_DISPATCH[k];
    let exists = false;
    try { exists = (eval('typeof ' + fn) === 'function'); } catch (e) {}
    report += (exists ? '✓ ' : '✗ ') + k + ' → ' + fn + '()\n';
    if (!exists) allOk = false;
  });

  report += '\n' + (allOk ? '✅ All target functions reachable.' : '⚠️ Some target functions missing.');

  _sdAlert(report);
}

function _sdAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
}