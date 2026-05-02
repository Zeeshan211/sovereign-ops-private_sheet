

// ════════════════════════════════════════════════════════════════════
// 🔍 Ghost_Hunter.gs — DUPLICATE /today + DIGEST DETECTOR v1.0
// LOCKED · 7-Layer Audit · Read-Only · Day 6 · 2026-04-29
//
// PURPOSE:
//   Hunts for the ghost /today response that occasionally appears with
//   old "Day 4, Habits 0/16, ✅ icons" format. Checks 4 layers:
//     1. Function definitions — duplicate cmdToday or sendDailyDigest
//     2. Triggers — multiple time-based triggers for digest function
//     3. Recent emails — old format pattern in last 7 days
//     4. Telegram update queue — stuck old responses
//
// SAFE: read-only. Never modifies sheet, code, triggers, or messages.
// ════════════════════════════════════════════════════════════════════

const GH_TZ = 'Asia/Karachi';

// Functions that COULD produce a /today-style output
const GH_SUSPECT_FUNCTIONS = [
  'cmdToday', 'sendDailyDigest', 'sendDigest', 'sendDailyEmail',
  'cmdDigest', 'sendBriefingEmail', 'sendDailyBrief', 'cmdMorningDigest',
  'sendTodaySummary', 'cmdSummary'
];

// Patterns in old format
const GH_OLD_PATTERNS = [
  '/16',           // old habit count
  '0/16',
  '✅ icons',
  '✅✅✅',
  'done · ',       // old digest line "X done · Y skipped"
  'skipped',
  'Day 4 ',        // very old hardcoded day reference
  'Habits 0/16'
];

function _ghAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _ghLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

// ──────────── LAYER 1: function existence + duplicates ────────────

function _ghCheckFunctions() {
  const result = { defined: [], missing: [], notes: [] };
  GH_SUSPECT_FUNCTIONS.forEach(fnName => {
    try {
      const exists = (eval('typeof ' + fnName) === 'function');
      if (exists) {
        result.defined.push(fnName);
      } else {
        result.missing.push(fnName);
      }
    } catch (e) {
      result.notes.push(fnName + ' (eval err)');
    }
  });
  return result;
}

// ──────────── LAYER 2: trigger inventory ────────────

function _ghCheckTriggers() {
  const result = { 
    digestTriggers: [], 
    pollingTriggers: [], 
    timeBasedTotal: 0, 
    duplicates: [], 
    suspicious: [] 
  };
  const allTriggers = ScriptApp.getProjectTriggers();

  const handlerCounts = {};

  allTriggers.forEach(t => {
    const fn = t.getHandlerFunction();
    handlerCounts[fn] = (handlerCounts[fn] || 0) + 1;

    const isTime = (t.getEventType() === ScriptApp.EventType.CLOCK);
    if (isTime) result.timeBasedTotal++;

    if (GH_SUSPECT_FUNCTIONS.indexOf(fn) !== -1) {
      const info = {
        handler: fn,
        type: isTime ? 'time' : 'other',
        triggerSource: t.getTriggerSource() ? t.getTriggerSource().toString() : 'unknown'
      };
      if (fn.indexOf('Digest') !== -1 || fn.indexOf('digest') !== -1) {
        result.digestTriggers.push(info);
      } else {
        result.suspicious.push(info);
      }
    }

    if (fn === 'pollTelegram') {
      result.pollingTriggers.push({ handler: fn, type: 'time' });
    }
  });

  Object.keys(handlerCounts).forEach(fn => {
    if (handlerCounts[fn] > 1 && GH_SUSPECT_FUNCTIONS.indexOf(fn) !== -1) {
      result.duplicates.push(fn + ' (' + handlerCounts[fn] + 'x)');
    }
  });

  return result;
}

// ──────────── LAYER 3: recent email scan ────────────

function _ghCheckRecentEmails() {
  const result = { 
    scanned: 0, 
    matchedOld: [], 
    matchedNew: [], 
    error: null 
  };

  try {
    // Look at threads from last 7 days containing "Sovereign Ops" subject
    const threads = GmailApp.search('subject:"Sovereign Ops" newer_than:7d', 0, 30);
    result.scanned = threads.length;

    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(msg => {
        const date = msg.getDate();
        const ageHours = ((new Date().getTime() - date.getTime()) / 3600000).toFixed(1);
        const body = (msg.getPlainBody() || '').substring(0, 2000);

        let isOld = false;
        let oldPatterns = [];
        GH_OLD_PATTERNS.forEach(p => {
          if (body.indexOf(p) !== -1) {
            isOld = true;
            oldPatterns.push(p);
          }
        });

        const subj = msg.getSubject().substring(0, 60);
        const snippet = body.substring(0, 80).replace(/\n/g, ' ');

        if (isOld) {
          result.matchedOld.push({
            ageHours: ageHours,
            subject: subj,
            patterns: oldPatterns,
            snippet: snippet
          });
        } else {
          result.matchedNew.push({
            ageHours: ageHours,
            subject: subj,
            snippet: snippet
          });
        }
      });
    });
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

// ──────────── LAYER 4: stale Telegram updates ────────────

function _ghCheckTelegramQueue() {
  const result = { lastUpdateId: null, queuedCount: 0, error: null };

  try {
    const props = PropertiesService.getScriptProperties();
    const token = props.getProperty('TELEGRAM_TOKEN');
    if (!token) { result.error = 'TELEGRAM_TOKEN not set'; return result; }

    const lastUpdateId = parseInt(props.getProperty('TG_LAST_UPDATE_ID') || '0');
    result.lastUpdateId = lastUpdateId;

    // Peek at queued updates without consuming
    const url = 'https://api.telegram.org/bot' + token + 
                '/getUpdates?offset=' + (lastUpdateId + 1) + '&timeout=0';
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(response.getContentText());

    if (data.ok && data.result) {
      result.queuedCount = data.result.length;
    }
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

// ════════════════════════════════════════════════════════════════════
// MAIN ENTRY
// ════════════════════════════════════════════════════════════════════

function huntGhostToday() {
  const startTime = new Date().getTime();

  const fns = _ghCheckFunctions();
  const triggers = _ghCheckTriggers();
  const emails = _ghCheckRecentEmails();
  const tgQueue = _ghCheckTelegramQueue();

  const elapsed = ((new Date().getTime() - startTime) / 1000).toFixed(1);

  let report = '🔍 GHOST /today HUNTER · ' + elapsed + 's\n\n';
  let verdict = 'CLEAN';
  let recommendations = [];

  // ─── Section 1: Functions ───
  report += '═══ LAYER 1 — FUNCTION DEFINITIONS ═══\n\n';
  if (fns.defined.length === 0) {
    report += '⚠️ No /today-related functions found at all.\n';
    verdict = 'INVESTIGATE';
  } else {
    report += '✓ Functions defined (' + fns.defined.length + '):\n';
    fns.defined.forEach(f => report += '  • ' + f + '\n');
  }
  report += '\n';

  // ─── Section 2: Triggers ───
  report += '═══ LAYER 2 — TRIGGER INVENTORY ═══\n\n';
  report += 'Total time-based triggers: ' + triggers.timeBasedTotal + '\n';
  report += 'Polling triggers: ' + triggers.pollingTriggers.length + '\n';
  report += 'Digest-related triggers: ' + triggers.digestTriggers.length + '\n\n';

  if (triggers.digestTriggers.length === 0) {
    report += '✓ No active digest triggers.\n';
  } else if (triggers.digestTriggers.length === 1) {
    report += '✓ Exactly 1 digest trigger (correct):\n';
    triggers.digestTriggers.forEach(t => report += '  • ' + t.handler + '\n');
  } else {
    report += '🚨 MULTIPLE DIGEST TRIGGERS FOUND:\n';
    triggers.digestTriggers.forEach(t => report += '  • ' + t.handler + '\n');
    verdict = 'GHOST FOUND';
    recommendations.push('Run killGhostDigestTriggers() to clean up duplicates');
  }

  if (triggers.duplicates.length > 0) {
    report += '\n🚨 DUPLICATE TRIGGERS:\n';
    triggers.duplicates.forEach(d => report += '  • ' + d + '\n');
    verdict = 'GHOST FOUND';
    recommendations.push('Duplicate trigger detected — kill the extra one');
  }

  if (triggers.suspicious.length > 0) {
    report += '\n⚠️ Other suspect triggers:\n';
    triggers.suspicious.forEach(t => report += '  • ' + t.handler + '\n');
  }

  if (triggers.pollingTriggers.length > 1) {
    report += '\n🚨 MULTIPLE POLLING TRIGGERS (' + triggers.pollingTriggers.length + 'x)\n';
    verdict = 'GHOST FOUND';
    recommendations.push('Multiple pollTelegram triggers — may cause double /today response');
  }

  report += '\n';

  // ─── Section 3: Emails ───
  report += '═══ LAYER 3 — RECENT EMAIL SCAN (7 days) ═══\n\n';
  if (emails.error) {
    report += '⚠️ Email scan error: ' + emails.error + '\n';
    report += '(May need Gmail scope authorization)\n';
  } else {
    report += 'Scanned ' + emails.scanned + ' Sovereign Ops thread(s)\n';
    report += 'Old format matches: ' + emails.matchedOld.length + '\n';
    report += 'New format matches: ' + emails.matchedNew.length + '\n\n';

    if (emails.matchedOld.length > 0) {
      report += '🚨 OLD FORMAT EMAILS DETECTED:\n';
      emails.matchedOld.slice(0, 5).forEach(m => {
        report += '  • ' + m.ageHours + 'h ago — "' + m.subject + '"\n';
        report += '    Patterns: ' + m.patterns.join(', ') + '\n';
        report += '    Snippet: ' + m.snippet + '...\n';
      });
      verdict = 'GHOST FOUND';
      recommendations.push('Old-format emails found — see if recent (<24h) means ghost still active');

      // Flag if any are recent
      const recentOld = emails.matchedOld.filter(m => parseFloat(m.ageHours) < 24);
      if (recentOld.length > 0) {
        report += '\n  ⚠️ ' + recentOld.length + ' old-format email(s) sent in LAST 24 HOURS\n';
        report += '     → ghost is ACTIVELY firing\n';
      } else {
        report += '\n  ✓ All old-format emails are stale (>24h old)\n';
        report += '     → ghost may already be killed by Code.gs v5.3 update\n';
      }
    } else {
      report += '✓ No old-format emails detected.\n';
      if (emails.matchedNew.length > 0) {
        report += '\nRecent clean emails:\n';
        emails.matchedNew.slice(0, 3).forEach(m => {
          report += '  • ' + m.ageHours + 'h ago — "' + m.subject + '"\n';
        });
      }
    }
  }
  report += '\n';

  // ─── Section 4: Telegram queue ───
  report += '═══ LAYER 4 — TELEGRAM UPDATE QUEUE ═══\n\n';
  if (tgQueue.error) {
    report += '⚠️ Queue check error: ' + tgQueue.error + '\n';
  } else {
    report += 'Last processed update ID: ' + tgQueue.lastUpdateId + '\n';
    report += 'Queued unprocessed updates: ' + tgQueue.queuedCount + '\n';
    if (tgQueue.queuedCount > 5) {
      report += '\n⚠️ Many queued updates — bot may be processing slowly\n';
      recommendations.push('Consider /pollTelegram catch-up via installTelegramPolling reset');
    } else {
      report += '✓ Queue clean.\n';
    }
  }
  report += '\n';

  // ─── Verdict + recommendations ───
  report += '═══ VERDICT ═══\n\n';
  if (verdict === 'CLEAN') {
    report += '✅ NO GHOST DETECTED.\n\n';
    report += 'Code.gs v5.3 cleanup appears complete. The earlier "/today\n';
    report += 'showing /16 + Day 4" was likely from pre-v5.3 stale emails\n';
    report += 'or stuck queue items, both now flushed.\n\n';
    report += 'Continue normal operation. If ghost reappears, run hunter again.';
  } else if (verdict === 'GHOST FOUND') {
    report += '🚨 GHOST FOUND.\n\n';
    report += 'Recommended actions:\n';
    recommendations.forEach((r, i) => report += '  ' + (i+1) + '. ' + r + '\n');
    report += '\nFor trigger cleanup: run killGhostDigestTriggers()\n';
    report += '(safe — only removes duplicates, keeps 1 of each)';
  } else {
    report += '⚠️ INVESTIGATE — partial findings, may need manual review.';
  }

  _ghLog('GHOST_HUNT', verdict + ' · fns=' + fns.defined.length + ' · digest_triggers=' + triggers.digestTriggers.length + ' · old_emails=' + emails.matchedOld.length);
  _ghAlert(report);
  return { verdict: verdict, fns: fns, triggers: triggers, emails: emails, tgQueue: tgQueue };
}

// ════════════════════════════════════════════════════════════════════
// CLEANUP — kills duplicate triggers (safe: keeps 1 of each)
// ════════════════════════════════════════════════════════════════════

function killGhostDigestTriggers() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert('🔪 Kill Ghost Triggers',
    'This will remove DUPLICATE triggers for digest functions.\nKeeps exactly 1 of each. Safe operation.\n\nContinue?',
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  const allTriggers = ScriptApp.getProjectTriggers();
  const seen = {};
  let killed = 0;
  const killedList = [];

  allTriggers.forEach(t => {
    const fn = t.getHandlerFunction();
    if (GH_SUSPECT_FUNCTIONS.indexOf(fn) === -1) return;

    if (seen[fn]) {
      try {
        ScriptApp.deleteTrigger(t);
        killed++;
        killedList.push(fn);
      } catch (e) {
        Logger.log('Could not delete trigger ' + fn + ': ' + e);
      }
    } else {
      seen[fn] = true;
    }
  });

  _ghLog('GHOST_KILL', killed + ' duplicate trigger(s) removed: ' + killedList.join(', '));

  let report = '✅ Cleanup complete.\n\n';
  report += 'Removed ' + killed + ' duplicate trigger(s):\n';
  if (killedList.length === 0) {
    report += '  (none — no duplicates found)\n';
  } else {
    killedList.forEach(f => report += '  • ' + f + '\n');
  }
  report += '\nKept 1 of each remaining function.\n';
  report += 'Run huntGhostToday again to verify.';

  _ghAlert(report);
}

// ════════════════════════════════════════════════════════════════════
// MENU
// ════════════════════════════════════════════════════════════════════

function appendGhostHunterMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🔍 Ghost Hunter')
      .addItem('🔍 Hunt Ghost /today (read-only · 5s)', 'huntGhostToday')
      .addSeparator()
      .addItem('🔪 Kill Duplicate Triggers (safe)', 'killGhostDigestTriggers')
      .addToUi();
  } catch(e) { Logger.log('Ghost Hunter menu add failed: ' + e); }
}
