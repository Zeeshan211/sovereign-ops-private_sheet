// ════════════════════════════════════════════════════════════════════
// 📱 Telegram.gs v2.2 — PHONE BOT · BROTHER VOICE · MULTI-MODEL AI
// Day 6 of 90 · 2026-04-29
//
// CHANGES FROM v2.1:
//   - cmdToday now reads from new Habits cockpit v2.1 structure
//     (today's column = 2 + dayOfWeek, counts TRUE checkboxes + ✓ mirror)
//   - cmdStreaks now reads week counts from column J (rows 7-23)
//   - Habits total shown as /14 (not /16) — matches new Habits v2.1
//   - Brother voice closing lines tuned to new data
//
// All other v2.1 features preserved: HTML format, /prayed, /jam, /qaza,
//   /salahtoday, /streak, multi-model AI, brother voice throughout.
//
// REQUIRES:
//   - Telegram_Format.gs (formatter helpers)
//   - AI_Engine.gs (callAI fallback)
//   - Code.gs (getQuestDay, SHEETS, VERSES)
//   - Salah_Pro.gs (_salahFetchPrayerTimes)
//   - Habits_Pro.gs v2.1 (new structure)
// ════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// SENDERS — HTML mode with auto-split
// ──────────────────────────────────────────────────────────

function sendTelegram(message, options) {
  const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  const chatId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) { Logger.log('TG creds missing'); return false; }

  const chunks = [];
  for (let i = 0; i < message.length; i += 4000) {
    chunks.push(message.substring(i, i + 4000));
  }

  let allOk = true;

  chunks.forEach((chunk, idx) => {
    const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
    const payload = {
      chat_id: chatId,
      text: chunk,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    };
    if (idx === 0 && options && options.keyboard) {
      payload.reply_markup = JSON.stringify({ inline_keyboard: options.keyboard });
    }

    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      const data = JSON.parse(response.getContentText());
      if (!data.ok) {
        Logger.log('TG HTML failed → plain fallback: ' + JSON.stringify(data));
        sendTelegramPlain(chunk);
        allOk = false;
      }
    } catch (e) {
      Logger.log('TG fail: ' + e);
      allOk = false;
    }
  });

  return allOk;
}

function sendTelegramPlain(message) {
  const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  const chatId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return false;

  const plainText = message
    .replace(/<\/?(b|strong|i|em|u|s|code|pre|tg-spoiler|blockquote)>/gi, '')
    .replace(/<a [^>]*>([^<]+)<\/a>/gi, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: chatId, text: plainText, disable_web_page_preview: true
      }),
      muteHttpExceptions: true
    });
    return true;
  } catch (e) { Logger.log('Plain TG fail: ' + e); return false; }
}

function answerCallback(callbackId, text) {
  const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  if (!token) return;
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ callback_query_id: callbackId, text: text || '✓' }),
      muteHttpExceptions: true
    });
  } catch (e) { Logger.log(e); }
}

// ──────────────────────────────────────────────────────────
// POLLING
// ──────────────────────────────────────────────────────────

function pollTelegram() {
  const startTime = Date.now();
  const MAX_LOOP_MS = 55000;
  const POLL_INTERVAL_MS = 10000;

  while (Date.now() - startTime < MAX_LOOP_MS) {
    try { _doSinglePoll(); } catch (e) { Logger.log('Poll err: ' + e); }
    if (Date.now() - startTime + POLL_INTERVAL_MS < MAX_LOOP_MS) {
      Utilities.sleep(POLL_INTERVAL_MS);
    } else { break; }
  }
}

function _doSinglePoll() {
  const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  if (!token) return;

  const props = PropertiesService.getScriptProperties();
  const lastUpdateId = parseInt(props.getProperty('TG_LAST_UPDATE_ID') || '0');
  const url = 'https://api.telegram.org/bot' + token + 
              '/getUpdates?offset=' + (lastUpdateId + 1) + '&timeout=1';

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(response.getContentText());
  if (!data.ok || !data.result || data.result.length === 0) return;

  const myChatId = props.getProperty('TELEGRAM_CHAT_ID');
  let maxId = lastUpdateId;

  data.result.forEach(update => {
    if (update.update_id > maxId) maxId = update.update_id;

    if (update.callback_query) {
      const cbChatId = update.callback_query.message.chat.id.toString();
      if (cbChatId === myChatId) {
        answerCallback(update.callback_query.id);
        handleCallback(update.callback_query);
      }
      return;
    }

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id.toString();
      if (chatId === myChatId) {
        handleTelegramMessage(update.message.text.trim());
      } else {
        sendTelegram('This bot is private.');
      }
    }
  });

  props.setProperty('TG_LAST_UPDATE_ID', maxId.toString());
}

function installTelegramPolling() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'pollTelegram') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('pollTelegram').timeBased().everyMinutes(1).create();
  if (typeof safeAlert === 'function') safeAlert('Telegram polling on.\n\nResponse time: 10-15 sec.');
}

function deleteTelegramWebhook() {
  const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  if (!token) return;
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/deleteWebhook', { muteHttpExceptions: true });
  } catch (e) { Logger.log(e); }
}

function stopTelegramPolling() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'pollTelegram') ScriptApp.deleteTrigger(t);
  });
  if (typeof safeAlert === 'function') safeAlert('Polling stopped.');
}

function startBotPolling() {
  deleteTelegramWebhook();
  Utilities.sleep(2000);
  installTelegramPolling();
  Utilities.sleep(1000);

  let msg = '<b>Bot is awake.</b>\n\n';
  msg += '<pre>';
  msg += '  Day        ' + getQuestDay() + ' of 90\n';
  msg += '  Response   10-15 sec\n';
  msg += '  Help       /help\n';
  msg += '  Menu       /menu\n';
  msg += '</pre>\n\n';
  msg += '<i>Bismillah.</i>';
  sendTelegram(msg);
}

function testTelegram() {
  let msg = '<b>Sovereign Ops · connected</b>\n\n';
  msg += '<pre>';
  msg += '  Day      ' + getQuestDay() + ' of 90\n';
  msg += '  Time     ' + tgFmtTimeNow() + '\n';
  msg += '</pre>\n\n';
  msg += '<i>All systems online. Type /help when ready.</i>';

  const ok = sendTelegram(msg);
  if (typeof safeAlert === 'function') {
    safeAlert(ok ? 'Telegram connected. Check your bot chat.' : 'Connection failed. Check token + chat ID.');
  }
}

// ──────────────────────────────────────────────────────────
// MESSAGE ROUTER
// ──────────────────────────────────────────────────────────

function handleTelegramMessage(text) {
  if (!text.startsWith('/')) {
    if (typeof handleNaqdAnswer === 'function' && handleNaqdAnswer(text)) return;
    handleAIChat(text);
    return;
  }

  const parts = text.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  const safeCall = (fnName, fn, callArgs) => function() {
    if (typeof fn === 'function') return callArgs !== undefined ? fn(callArgs) : fn();
    sendTelegram('That command needs Isnad.gs which isn\'t loaded yet.');
  };

  const handlers = {
    '/start': cmdHelp, '/help': cmdHelp, '/menu': cmdMenu,

    '/today': cmdToday, '/briefing': cmdBriefing,
    '/streaks': cmdStreaks, '/debt': cmdDebt,
    '/kpi': cmdKPI, '/quran': cmdQuran,
    '/quest': cmdQuest, '/pillars': cmdPillars,
    '/week': cmdWeek,

    '/prayed':     () => cmdPrayed(args),
    '/jam':        () => cmdJam(args),
    '/qaza':       () => cmdQaza(args),
    '/salahtoday': cmdSalahToday,
    '/streak':     () => cmdStreak(args),
    '/salah':      () => cmdSalah(args),

    '/weight':  () => cmdWeight(args),
    '/mood':    () => cmdLogScale('mood', args, 3),
    '/motiv':   () => cmdLogScale('motivation', args, 4),
    '/energy':  () => cmdLogScale('energy', args, 5),
    '/sleep':   () => cmdSleep(args),
    '/study':   () => cmdStudy(args),
    '/habit':   () => cmdHabit(args),
    '/pay':       () => cmdPay(args),
    '/intl':      () => cmdIntl(args),
    '/atm':       () => cmdAtm(args),
    '/borrow':    () => cmdBorrow(args),
    '/repay':     () => cmdRepay(args),
    '/merchant':  () => cmdMerchantAdd(args),
    '/billerfee': () => cmdBillerFee(args),
        '/salary':    () => cmdSalary(args),
            '/cal':       () => cmdCal(args),
    '/eaten':     cmdEaten,
    '/water':     cmdWater,

    '/free':    cmdFree, '/reset': cmdReset,
    '/win':     () => cmdWin(args),
    '/trap':    () => cmdTrap(args),
    '/note':    () => cmdNote(args),

    '/free':    cmdFree, '/reset': cmdReset,
    '/win':     () => cmdWin(args),
    '/trap':    () => cmdTrap(args),
    '/note':    () => cmdNote(args),

    '/naqd':      safeCall('cmdNaqd',      typeof cmdNaqd      !== 'undefined' ? cmdNaqd      : null),
    '/naqad':     safeCall('cmdNaqd',      typeof cmdNaqd      !== 'undefined' ? cmdNaqd      : null),
    '/naqdreset': safeCall('cmdNaqdReset', typeof cmdNaqdReset !== 'undefined' ? cmdNaqdReset : null),
    '/verdict':   safeCall('cmdVerdict',   typeof cmdVerdict   !== 'undefined' ? cmdVerdict   : null),
    '/isnad':     safeCall('cmdIsnad',     typeof cmdIsnad     !== 'undefined' ? cmdIsnad     : null),
    '/chain':     safeCall('cmdChain',     typeof cmdChain     !== 'undefined' ? cmdChain     : null),
    '/witness':   safeCall('cmdWitness',   typeof cmdWitness   !== 'undefined' ? cmdWitness   : null, args)
  };

  if (handlers[cmd]) handlers[cmd]();
  else sendTelegram('I don\'t know that command yet.\n\nType /help to see everything I can do.');
}

function handleCallback(cb) {
  const handlers = {
    today: cmdToday, briefing: cmdBriefing, streaks: cmdStreaks,
    debt: cmdDebt, kpi: cmdKPI, quest: cmdQuest, quran: cmdQuran,
    salah: cmdSalahToday, pillars: cmdPillars
  };
  if (handlers[cb.data]) handlers[cb.data]();
}

// ──────────────────────────────────────────────────────────
// HELP & MENU
// ──────────────────────────────────────────────────────────

function cmdHelp() {
  let msg = '<b>Sovereign Ops · Day ' + getQuestDay() + ' of 90</b>\n';
  msg += '<i>' + tgFmtFullDateTime() + '</i>\n\n';

  msg += '<b>Read</b>\n';
  msg += '<pre>';
  msg += '/today        snapshot\n';
  msg += '/briefing     AI briefing\n';
  msg += '/salahtoday   today\'s salah\n';
  msg += '/streaks      all streaks\n';
  msg += '/streak fajr  one habit deep\n';
  msg += '/debt         debt position\n';
  msg += '/kpi          work KPIs\n';
  msg += '/pillars      5-pillar status\n';
  msg += '/quest        90-day progress\n';
  msg += '/quran        verse of the day\n';
  msg += '/week         last 7 days\n';
  msg += '</pre>\n';

  msg += '<b>Salah</b>\n';
  msg += '<pre>';
  msg += '/prayed fajr masjid\n';
  msg += '/prayed asr work\n';
  msg += '/jam dhuhr asr work\n';
  msg += '/qaza isha\n';
  msg += '</pre>\n';

  msg += '<b>Log</b>\n';
  msg += '<pre>';
  msg += '/weight 76.5\n';
  msg += '/mood 7  /motiv 8  /energy 6\n';
  msg += '/sleep 6.5  /study 1.5\n';
  msg += '/habit walk done\n';
  msg += '/pay 5000 imran\n';
  msg += '/intl 479 youtube\n';
  msg += '/billerfee meezan\n';
  msg += '/salary 145000\n';
    msg += '/cal 250 chicken biryani\n';
  msg += '/eaten\n';
  msg += '/water\n';
  msg += '/free   (Habit One success)\n';
  msg += '/reset  (Habit One reset)\n';
  msg += '/win [text]\n';
  msg += '/trap [text]\n';
  msg += '/note [text]\n';
  msg += '</pre>\n';

  msg += '<b>Talk</b>\n';
  msg += '<i>Just type any question.</i>\n\n';

  msg += '<i>Bismillah.</i>';

  sendTelegram(msg);
}

function cmdMenu() {
  sendTelegram('<b>Quick actions</b>\n\nTap one:', {
    keyboard: [
      [{text: 'Today', callback_data: 'today'}, {text: 'Salah', callback_data: 'salah'}],
      [{text: 'Briefing', callback_data: 'briefing'}, {text: 'Streaks', callback_data: 'streaks'}],
      [{text: 'Debt', callback_data: 'debt'}, {text: 'KPIs', callback_data: 'kpi'}],
      [{text: 'Pillars', callback_data: 'pillars'}, {text: 'Quest', callback_data: 'quest'}],
      [{text: 'Verse', callback_data: 'quran'}]
    ]
  });
}

// ──────────────────────────────────────────────────────────
// SALAH HELPERS
// ──────────────────────────────────────────────────────────

const _PRAYER_NAMES = {
  fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha'
};
const _PRAYER_COL_V21 = { fajr: 2, dhuhr: 3, asr: 4, maghrib: 5, isha: 6 };

function _getPrayerWindow(prayer, prayerTimes) {
  const toMin = (hhmm) => {
    const parts = String(hhmm).split(':');
    if (parts.length !== 2) return -1;
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const fajr    = toMin(prayerTimes.Fajr);
  const dhuhr   = toMin(prayerTimes.Dhuhr);
  const asr     = toMin(prayerTimes.Asr);
  const maghrib = toMin(prayerTimes.Maghrib);
  const isha    = toMin(prayerTimes.Isha);

  switch (prayer) {
    case 'fajr':    return { startMin: fajr,    endMin: dhuhr - 5 };
    case 'dhuhr':   return { startMin: dhuhr,   endMin: asr };
    case 'asr':     return { startMin: asr,     endMin: maghrib };
    case 'maghrib': return { startMin: maghrib, endMin: isha };
    case 'isha':    return { startMin: isha,    endMin: 1440 + fajr };
    default:        return { startMin: 0, endMin: 1440 };
  }
}

function _classifyPrayerTime(prayer, prayerTimes) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const window = _getPrayerWindow(prayer, prayerTimes);

  if (window.startMin < 0 || window.endMin < 0) return 'in_window';

  if (nowMin < window.startMin && nowMin < window.endMin) return 'before';

  if (prayer === 'isha') {
    const fajrMin = window.endMin - 1440;
    if (nowMin >= window.startMin && nowMin < 1440) return 'in_window';
    if (nowMin < fajrMin) return 'in_window';
    return 'qaza';
  }

  if (nowMin >= window.startMin && nowMin < window.endMin) {
    if (window.endMin - nowMin <= 20) return 'late_window';
    return 'in_window';
  }

  return 'qaza';
}

function _writePrayerToSheet(prayer, code) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName('🕌 Salah');
  if (!s) return { ok: false, error: 'salah_tab_missing' };

  const day = new Date().getDate();
  const todayRow = 5 + day;
  const col = _PRAYER_COL_V21[prayer];
  if (!col) return { ok: false, error: 'unknown_prayer' };

  const time = Utilities.formatDate(new Date(), 'Asia/Karachi', 'HH:mm');

  try {
    s.getRange(todayRow, col).setValue(code);
    s.getRange(todayRow, col).setNote('Logged via Telegram at ' + time + ' PKT on ' + 
                                        Utilities.formatDate(new Date(), 'Asia/Karachi', 'EEE dd MMM'));
    return { ok: true, row: todayRow, col: col, time: time };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function _normalizeLocationInput(loc) {
  const l = String(loc || '').toLowerCase().trim();
  const map = {
    'masjid': 'M',  'm': 'M',
    'jamaat': 'J',  'jama\'at': 'J', 'j': 'J',
    'home':   'H',  'h': 'H',
    'work':   'W',  'w': 'W',
    'home·u': 'HU', 'home u': 'HU', 'hu': 'HU',
    'work·u': 'WU', 'work u': 'WU', 'wu': 'WU',
    'late':   'L',  'l': 'L',
    'qaza':   'Q',  'q': 'Q'
  };
  return map[l] || null;
}

function _getTodaySalahSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName('🕌 Salah');
  if (!s) return null;

  const day = new Date().getDate();
  const r = 5 + day;

  return {
    fajr:    s.getRange(r, 2).getValue(),
    dhuhr:   s.getRange(r, 3).getValue(),
    asr:     s.getRange(r, 4).getValue(),
    maghrib: s.getRange(r, 5).getValue(),
    isha:    s.getRange(r, 6).getValue(),
    score:   s.getRange(r, 9).getValue(),
    qaza:    s.getRange(r, 10).getValue() || 0
  };
}

function _formatSalahLineNew(name, value) {
  const v = String(value || '').trim();
  const padName = (name + ':         ').substring(0, 11);
  if (!v) return '  ' + padName + 'coming up';
  const score = tgFmtLocationScore(v);
  const star = (v === 'M' || v === 'Masjid') ? '  ⭐' : '';
  return '  ' + padName + tgFmtPad(tgFmtLocation(v), 10) + tgFmtScoreString(score) + star;
}

function _suggestNextPrayerLine(summary, prayerTimes) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const summaryMap = { 
    fajr: summary.fajr, dhuhr: summary.dhuhr, asr: summary.asr, 
    maghrib: summary.maghrib, isha: summary.isha 
  };

  for (let i = 0; i < order.length; i++) {
    const p = order[i];
    if (summaryMap[p]) continue;
    const window = _getPrayerWindow(p, prayerTimes);
    if (window.startMin < 0) continue;

    const ahead = window.startMin - nowMin;
    if (ahead > 0 && ahead < 240) {
      const hrs = Math.floor(ahead / 60);
      const mins = ahead % 60;
      const timeStr = (hrs > 0 ? hrs + 'h ' : '') + mins + 'm';
      return _PRAYER_NAMES[p] + ' in ' + timeStr + '.\nWhen it comes, just type:\n/prayed ' + p + ' <loc>';
    }
    if (ahead <= 0 && ahead > -120) {
      return _PRAYER_NAMES[p] + ' time is now.\n/prayed ' + p + ' <loc>';
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────
// /prayed
// ──────────────────────────────────────────────────────────

function cmdPrayed(args) {
  const parts = args.toLowerCase().split(' ');
  const prayer = parts[0];
  const locInput = parts.slice(1).join(' ');

  if (!_PRAYER_NAMES[prayer]) {
    sendTelegram('Need a prayer name first.\n\nExample:\n/prayed fajr masjid\n/prayed asr work');
    return;
  }

  if (!locInput) {
    sendTelegram('Where did you pray it?\n\nOptions:\nmasjid · jamaat · home · work · WU (work + valid reason) · HU (home + valid reason)');
    return;
  }

  let code = _normalizeLocationInput(locInput);
  if (!code) {
    sendTelegram('I don\'t recognize "' + locInput + '".\n\nValid: masjid · jamaat · home · work · WU · HU · late · qaza');
    return;
  }

  const prayerTimes = (typeof _salahFetchPrayerTimes === 'function') 
                      ? _salahFetchPrayerTimes() 
                      : { Fajr:'04:48', Dhuhr:'12:11', Asr:'15:35', Maghrib:'18:42', Isha:'20:11' };
  const timeClass = _classifyPrayerTime(prayer, prayerTimes);

  if (code !== 'L' && code !== 'Q' && timeClass === 'qaza') {
    let msg = '<b>The window for ' + _PRAYER_NAMES[prayer] + ' has fully ended.</b>\n\n';
    msg += '<pre>';
    msg += '  Now      ' + tgFmtTimeNow() + '\n';
    msg += '  Window   closed\n';
    msg += '</pre>\n\n';
    msg += 'If you still want to log it:\n';
    msg += '<pre>';
    msg += '  /prayed ' + prayer + ' L     (late, in your heart)\n';
    msg += '  /qaza ' + prayer + '         (genuinely missed)\n';
    msg += '</pre>\n\n';
    msg += '<i>Late means you prayed it past the window with intent. Qaza means it slipped.</i>';
    sendTelegram(msg);
    return;
  }

  const writeResult = _writePrayerToSheet(prayer, code);
  if (!writeResult.ok) {
    if (writeResult.error === 'salah_tab_missing') {
      sendTelegram('The Salah tab couldn\'t be reached.\nMaybe it\'s hidden or renamed.\n\nTry opening the sheet first, then send the command again.');
    } else {
      sendTelegram('Couldn\'t save it: ' + writeResult.error);
    }
    return;
  }

  const summary = _getTodaySalahSummary();
  const score = tgFmtLocationScore(code);
  const isMasjid = (code === 'M');

  let msg = '<b>✓ ' + _PRAYER_NAMES[prayer] + ' at ' + tgFmtLocation(code) + '</b>\n\n';
  msg += '<pre>';
  msg += '  Time     ' + writeResult.time + '\n';
  msg += '  Score    ' + tgFmtScoreString(score) + '\n';
  msg += '</pre>\n';

  msg += tgFmtDivider(26) + '\n';
  msg += '<b>Today · Day ' + getQuestDay() + '/90</b>\n\n';
  msg += '<pre>';
  msg += _formatSalahLineNew('Fajr',    summary.fajr) + '\n';
  msg += _formatSalahLineNew('Dhuhr',   summary.dhuhr) + '\n';
  msg += _formatSalahLineNew('Asr',     summary.asr) + '\n';
  msg += _formatSalahLineNew('Maghrib', summary.maghrib) + '\n';
  msg += _formatSalahLineNew('Isha',    summary.isha) + '\n';
  msg += '\n';
  msg += '  Score    ' + (typeof summary.score === 'number' ? summary.score.toFixed(1) : '0.0') + ' / 10\n';
  msg += '</pre>\n';

  msg += tgFmtDivider(26) + '\n\n';

  if (isMasjid && prayer === 'fajr') {
    msg += '<i>You walked there before sunrise.\nAllah saw that.</i>';
    const next = _suggestNextPrayerLine(summary, prayerTimes);
    if (next) msg += '\n\n' + next;
  } else if (isMasjid) {
    msg += '<i>Masjid is the heart of the day. Well done.</i>';
    const next = _suggestNextPrayerLine(summary, prayerTimes);
    if (next) msg += '\n\n' + next;
  } else if (code === 'WU' || code === 'HU') {
    msg += '<i>You prayed it where you stood, with the right reason.\nThat counts.</i>';
    const next = _suggestNextPrayerLine(summary, prayerTimes);
    if (next) msg += '\n\n' + next;
  } else if (code === 'W') {
    msg += '<i>The job kept you in. You still made the prayer.\nThat\'s what matters.</i>';
    const next = _suggestNextPrayerLine(summary, prayerTimes);
    if (next) msg += '\n\n' + next;
  } else if (code === 'H') {
    msg += '<i>Logged. Home prayer is still salah.</i>';
    const next = _suggestNextPrayerLine(summary, prayerTimes);
    if (next) msg += '\n\n' + next;
  } else if (code === 'L') {
    msg += '<i>Late but in time. The intent was kept.</i>';
    const next = _suggestNextPrayerLine(summary, prayerTimes);
    if (next) msg += '\n\n' + next;
  } else {
    const next = _suggestNextPrayerLine(summary, prayerTimes);
    if (next) msg += next;
  }

  sendTelegram(msg);
}

// ──────────────────────────────────────────────────────────
// /jam
// ──────────────────────────────────────────────────────────

function cmdJam(args) {
  const parts = args.toLowerCase().split(' ');
  if (parts.length < 3) {
    sendTelegram('How to combine prayers:\n\n/jam dhuhr asr work\n/jam maghrib isha home\n\n<i>Only valid pairs: Dhuhr+Asr or Maghrib+Isha.</i>');
    return;
  }

  const p1 = parts[0];
  const p2 = parts[1];
  const locInput = parts.slice(2).join(' ');

  if (!_PRAYER_NAMES[p1] || !_PRAYER_NAMES[p2]) {
    sendTelegram('Use prayer names: fajr, dhuhr, asr, maghrib, isha');
    return;
  }

  const validPairs = [['dhuhr','asr'], ['maghrib','isha']];
  const validPair = validPairs.some(p => 
    (p[0] === p1 && p[1] === p2) || (p[0] === p2 && p[1] === p1)
  );
  if (!validPair) {
    sendTelegram('Only Dhuhr+Asr or Maghrib+Isha can be combined per the majority opinion.');
    return;
  }

  let code = _normalizeLocationInput(locInput);
  if (!code) {
    sendTelegram('I don\'t recognize "' + locInput + '".');
    return;
  }

  const prayerTimes = (typeof _salahFetchPrayerTimes === 'function') 
                      ? _salahFetchPrayerTimes() 
                      : { Fajr:'04:48', Dhuhr:'12:11', Asr:'15:35', Maghrib:'18:42', Isha:'20:11' };
  const t1 = _classifyPrayerTime(p1, prayerTimes);

  let suffix1, suffix2, jamType;
  if (t1 === 'in_window' || t1 === 'late_window') {
    suffix1 = '';
    suffix2 = '⤵';
    jamType = 'taqdim';
  } else {
    suffix1 = '⤴';
    suffix2 = '';
    jamType = 'takhir';
  }

  const r1 = _writePrayerToSheet(p1, code + suffix1);
  const r2 = _writePrayerToSheet(p2, code + suffix2);

  if (!r1.ok || !r2.ok) {
    sendTelegram('Couldn\'t save the combined prayer.');
    return;
  }

  const summary = _getTodaySalahSummary();
  const score = tgFmtLocationScore(code) * 2;

  let msg = '<b>✓ ' + _PRAYER_NAMES[p1] + ' + ' + _PRAYER_NAMES[p2] + ' (jam\' ' + jamType + ')</b>\n\n';
  msg += '<pre>';
  msg += '  Location ' + tgFmtLocation(code) + '\n';
  msg += '  Time     ' + r1.time + '\n';
  msg += '  Score    ' + tgFmtScoreString(score) + ' (combined)\n';
  msg += '</pre>\n';

  msg += tgFmtDivider(26) + '\n';
  msg += '<b>Today · Day ' + getQuestDay() + '/90</b>\n\n';
  msg += '<pre>';
  msg += _formatSalahLineNew('Fajr',    summary.fajr) + '\n';
  msg += _formatSalahLineNew('Dhuhr',   summary.dhuhr) + '\n';
  msg += _formatSalahLineNew('Asr',     summary.asr) + '\n';
  msg += _formatSalahLineNew('Maghrib', summary.maghrib) + '\n';
  msg += _formatSalahLineNew('Isha',    summary.isha) + '\n';
  msg += '</pre>\n';

  msg += tgFmtDivider(26) + '\n\n';
  msg += '<i>The Prophet ﷺ combined prayers in Madinah without\nfear or rain — to lift hardship from his ummah.\n— Sahih Muslim 705</i>';

  sendTelegram(msg);
}

// ──────────────────────────────────────────────────────────
// /qaza
// ──────────────────────────────────────────────────────────

function cmdQaza(args) {
  const prayer = args.toLowerCase().trim();
  if (!_PRAYER_NAMES[prayer]) {
    sendTelegram('Which prayer was missed?\n\n/qaza isha\n/qaza fajr');
    return;
  }

  const writeResult = _writePrayerToSheet(prayer, 'Q');
  if (!writeResult.ok) {
    sendTelegram('Couldn\'t save it.');
    return;
  }

  const summary = _getTodaySalahSummary();
  const prayerTimes = (typeof _salahFetchPrayerTimes === 'function') 
                      ? _salahFetchPrayerTimes() 
                      : { Fajr:'04:48', Dhuhr:'12:11', Asr:'15:35', Maghrib:'18:42', Isha:'20:11' };
  const next = _suggestNextPrayerLine(summary, prayerTimes);

  let msg = '<b>' + _PRAYER_NAMES[prayer] + ' marked Qaza.</b>\n\n';
  msg += '<i>The Prophet ﷺ said:\n"Whoever forgets a prayer or sleeps\nthrough it, let him pray it when\nhe remembers."\n— Sahih Muslim</i>\n\n';
  msg += 'Pray it now if you can.\nThen sleep clean.\n\n';
  if (next) msg += next + '\n\n';
  msg += '<i>Tomorrow we walk again.</i>';

  sendTelegram(msg);
}

// ──────────────────────────────────────────────────────────
// /salahtoday
// ──────────────────────────────────────────────────────────

function cmdSalahToday() {
  const summary = _getTodaySalahSummary();
  if (!summary) {
    sendTelegram('The Salah tab couldn\'t be reached.\nMaybe it\'s hidden or renamed.');
    return;
  }

  const prayerTimes = (typeof _salahFetchPrayerTimes === 'function') 
                      ? _salahFetchPrayerTimes() 
                      : { Fajr:'04:48', Dhuhr:'12:11', Asr:'15:35', Maghrib:'18:42', Isha:'20:11' };

  let msg = '<b>Salah today · Day ' + getQuestDay() + '/90</b>\n';
  msg += '<i>' + tgFmtFullDateTime() + '</i>\n\n';
  msg += tgFmtDivider(26) + '\n';

  msg += '<pre>';
  const order = [
    { key: 'fajr',    name: 'Fajr',    time: prayerTimes.Fajr },
    { key: 'dhuhr',   name: 'Dhuhr',   time: prayerTimes.Dhuhr },
    { key: 'asr',     name: 'Asr',     time: prayerTimes.Asr },
    { key: 'maghrib', name: 'Maghrib', time: prayerTimes.Maghrib },
    { key: 'isha',    name: 'Isha',    time: prayerTimes.Isha }
  ];

  let logged = 0;
  order.forEach(p => {
    const v = summary[p.key];
    if (v) {
      logged++;
      const score = tgFmtLocationScore(v);
      const star = (v === 'M' || v === 'Masjid') ? '  ⭐' : '';
      msg += '  ' + tgFmtPad(p.name, 10) + tgFmtPad(tgFmtLocation(v), 10) + tgFmtScoreString(score) + star + '\n';
    } else {
      msg += '  ' + tgFmtPad(p.name, 10) + 'adhan ' + p.time + '\n';
    }
  });
  msg += '\n';
  msg += '  Logged    ' + logged + ' / 5\n';
  msg += '  Score     ' + (typeof summary.score === 'number' ? summary.score.toFixed(1) : '0.0') + ' / 10\n';
  msg += '</pre>\n';

  msg += tgFmtDivider(26) + '\n\n';

  const next = _suggestNextPrayerLine(summary, prayerTimes);
  if (next) {
    msg += next;
  } else if (logged === 5) {
    msg += '<i>Five for five today. Allah accepts the consistent.</i>';
  } else {
    msg += '<i>The day still holds. Walk forward.</i>';
  }

  sendTelegram(msg);
}

// ──────────────────────────────────────────────────────────
// /streak
// ──────────────────────────────────────────────────────────

function cmdStreak(args) {
  const habitArg = String(args || '').toLowerCase().trim();

  if (!habitArg) {
    cmdStreaks();
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const HAB = ss.getSheetByName(SHEETS.HABITS);
  if (!HAB) { sendTelegram('Habits tab couldn\'t be reached.'); return; }

  // Read habit names from new structure (rows 7-23, col A)
  let foundRow = -1;
  let foundName = '';
  for (let row = 7; row <= 23; row++) {
    const name = HAB.getRange(row, 1).getValue();
    if (name && String(name).indexOf('·') === -1 && 
        String(name).toLowerCase().indexOf(habitArg) !== -1) {
      foundRow = row;
      foundName = String(name);
      break;
    }
  }

  if (foundRow === -1) {
    sendTelegram('No habit matches "' + habitArg + '".\n\nType /streaks to see all habits by name.');
    return;
  }

  // Read this week's day cells (cols 3-9 = Mon-Sun)
  let last7 = '';
  let weekDone = 0;
  for (let c = 3; c <= 9; c++) {
    const v = HAB.getRange(foundRow, c).getValue();
    if (v === true || v === 'TRUE' || v === '✓') {
      last7 += '✓ '; weekDone++;
    } else {
      last7 += '· ';
    }
  }

  // Week count from col J
  const weekCount = HAB.getRange(foundRow, 10).getValue() || 0;
  const weekPct = Math.round((weekDone / 7) * 100);

  let msg = '<b>' + tgFmtEscape(foundName) + '</b>\n\n';
  msg += '<pre>';
  msg += '  This week      ' + weekCount + ' / 7   (' + weekPct + '%)\n';
  msg += '\n';
  msg += '  Mon Tue Wed Thu Fri Sat Sun\n';
  msg += '  ' + last7 + '\n';
  msg += '</pre>\n';

  if (weekCount >= 6) {
    msg += '<i>Allah ﷻ says:\n"...the most beloved deeds to Allah\nare those done consistently, even\nif small."   — Sahih Bukhari</i>\n\n';
    msg += 'Six in seven. The habit is yours now.';
  } else if (weekCount >= 4) {
    msg += '<i>Past halfway this week. Push for the full seven.</i>';
  } else if (weekCount >= 2) {
    msg += '<i>Building. Two more days locks the rhythm.</i>';
  } else if (weekCount >= 1) {
    msg += '<i>Started. The hardest part is behind.</i>';
  } else {
    msg += '<i>Today is the day to begin.</i>';
  }

  sendTelegram(msg);
}

// ──────────────────────────────────────────────────────────
// READ COMMANDS — cmdToday + cmdStreaks UPDATED for v2.1 Habits
// ──────────────────────────────────────────────────────────

function cmdToday() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const PRG = ss.getSheetByName(SHEETS.PROGRESS);
  const HAB = ss.getSheetByName(SHEETS.HABITS);
  const day = new Date().getDate();
  const r = 5 + day;

  const w  = PRG.getRange(r, 2).getValue() || '—';
  const m  = PRG.getRange(r, 3).getValue() || '—';
  const mt = PRG.getRange(r, 4).getValue() || '—';
  const e  = PRG.getRange(r, 5).getValue() || '—';
  const sl = PRG.getRange(r, 6).getValue() || '—';
  const st = PRG.getRange(r, 7).getValue() || 0;

  // NEW: read habits from today's column in v2.1 cockpit
  // Today's column = 2 + dayOfWeek (Mon=1, Sun=7)
  const dayOfWeek = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
  const todayCol = 2 + dayOfWeek;

  let habitsCount = 0;
  try {
    const todayValues = HAB.getRange(7, todayCol, 17, 1).getValues().flat();
    todayValues.forEach(v => {
      if (v === true || v === 'TRUE' || v === '✓') habitsCount++;
    });
  } catch (e) { habitsCount = 0; }

  const summary = _getTodaySalahSummary();
  let salahLogged = 0;
  if (summary) {
    ['fajr','dhuhr','asr','maghrib','isha'].forEach(k => { if (summary[k]) salahLogged++; });
  }

  let msg = '<b>Today · Day ' + getQuestDay() + ' of 90</b>\n';
  msg += '<i>' + tgFmtFullDateTime() + '</i>\n\n';
  msg += tgFmtDivider(26) + '\n';

  msg += '<pre>';
  msg += '  Weight       ' + w + (typeof w === 'number' ? ' kg' : '') + '\n';
  msg += '  Mood         ' + m + '/10\n';
  msg += '  Motivation   ' + mt + '/10\n';
  msg += '  Energy       ' + e + '/10\n';
  msg += '  Sleep        ' + sl + (typeof sl === 'number' ? ' h' : '') + '\n';
  msg += '  Study        ' + st + ' h\n';
  msg += '  Habits       ' + habitsCount + '/14\n';
  msg += '</pre>\n';

  msg += tgFmtDivider(26) + '\n';
  msg += '<b>Salah today</b>\n\n';

  if (summary) {
    msg += '<pre>';
    msg += _formatSalahLineNew('Fajr',    summary.fajr) + '\n';
    msg += _formatSalahLineNew('Dhuhr',   summary.dhuhr) + '\n';
    msg += _formatSalahLineNew('Asr',     summary.asr) + '\n';
    msg += _formatSalahLineNew('Maghrib', summary.maghrib) + '\n';
    msg += _formatSalahLineNew('Isha',    summary.isha) + '\n';
    msg += '\n';
    msg += '  Logged    ' + salahLogged + ' / 5\n';
    msg += '</pre>\n';
  }

  msg += tgFmtDivider(26) + '\n\n';

  const habitsPct = Math.round((habitsCount / 14) * 100);
  const isFajrMasjid = summary && (summary.fajr === 'M' || summary.fajr === 'Masjid');

  if (isFajrMasjid && habitsPct >= 70) {
    msg += '<i>Fajr at Masjid. Habits strong. Keep the rhythm, akhi.</i>';
  } else if (isFajrMasjid) {
    msg += '<i>Fajr at Masjid is locked. Now build the rest of the day around it.</i>';
  } else if (habitsPct >= 70 && st < 1) {
    msg += '<i>Strong day on most fronts. Knowledge is the gap — even 20 min of reading after Maghrib moves the needle.</i>';
  } else if (habitsCount === 0 && salahLogged === 0) {
    msg += '<i>The day is open. Pick one small thing and start there.</i>';
  } else {
    msg += '<i>Type /menu for tap-buttons.</i>';
  }

  sendTelegram(msg);
}

function cmdBriefing() {
  sendTelegram('<i>Generating briefing... 15-20 sec.</i>');
  sendSovereignBriefingToTelegram();
}

function cmdStreaks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const HAB = ss.getSheetByName(SHEETS.HABITS);
  if (!HAB) { sendTelegram('Habits tab couldn\'t be reached.'); return; }

  // NEW: read from v2.1 structure — habit names col A, week counts col J
  let msg = '<b>This week · Day ' + getQuestDay() + '/90</b>\n\n';
  msg += '<pre>';

  let topCount = 0;
  let topName = '';
  let coldCount = 0;
  let totalDone = 0;
  let habitCount = 0;

  for (let row = 7; row <= 23; row++) {
    const name = HAB.getRange(row, 1).getValue();
    const weekCount = HAB.getRange(row, 10).getValue();

    // Skip category divider rows (descriptive text with ·)
    if (!name || String(name).indexOf('·') !== -1) continue;
    if (typeof weekCount !== 'number') continue;

    habitCount++;
    const star = weekCount >= 6 ? '  ⭐' : '';
    msg += '  ' + tgFmtPad(String(name).substring(0, 22), 24) + 
           tgFmtPad(weekCount + '/7', 5, 'right') + star + '\n';

    if (weekCount > topCount) { topCount = weekCount; topName = String(name); }
    if (weekCount === 0) coldCount++;
    totalDone += weekCount;
  }

  msg += '</pre>\n\n';

  if (topCount >= 6) {
    msg += '<i>Strongest: ' + tgFmtEscape(topName) + ' at ' + topCount + '/7. Protect it.</i>';
  } else if (topCount >= 3) {
    msg += '<i>Top streak this week: ' + topCount + '/7. The 6-day mark is where the habit holds you.</i>';
  } else if (totalDone > 0) {
    msg += '<i>Week is building. One small consistent move grows the rest.</i>';
  } else {
    msg += '<i>Fresh week. Pick one and start.</i>';
  }

  if (coldCount >= 3) {
    msg += '\n\nType /streak <name> for one-habit detail.';
  }

  sendTelegram(msg);
}

function cmdDebt() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const FIN = ss.getSheetByName(SHEETS.FINANCE);
  const total = FIN.getRange('B85').getValue() || 0;
  const paid = FIN.getRange('B86').getValue() || 0;
  const net = FIN.getRange('B88').getValue() || 0;
  const pct = (paid / (total + paid)) * 100 || 0;

  let msg = '<b>Debt position</b>\n\n';
  msg += '<pre>';
  msg += '  Remaining   ' + total.toLocaleString() + ' PKR\n';
  msg += '  Paid        ' + paid.toLocaleString() + ' PKR\n';
  msg += '  Net         ' + net.toLocaleString() + ' PKR\n';
  msg += '  Payoff      ' + pct.toFixed(1) + '%\n';
  msg += '\n';
  msg += '  ' + tgFmtBar(pct, 22) + '\n';
  msg += '</pre>\n\n';

  msg += '<b>Creditors</b>\n\n';
  msg += '<pre>';
  for (let i = 0; i < 10; i++) {
    const name = FIN.getRange(60 + i, 1).getValue();
    const remaining = FIN.getRange(60 + i, 4).getValue();
    if (name && remaining > 0) {
      msg += '  ' + tgFmtPad(String(name).substring(0, 16), 18) + 
             tgFmtPad(remaining.toLocaleString() + ' PKR', 14, 'right') + '\n';
    }
  }
  msg += '</pre>\n\n';

  if (pct >= 50) {
    msg += '<i>Past halfway. Snowball is rolling.</i>';
  } else if (pct >= 25) {
    msg += '<i>Quarter cleared. Small payments accelerate.</i>';
  } else {
    msg += '<i>Smallest creditor first. Snowball gathers speed.</i>';
  }

  sendTelegram(msg);
}

function cmdKPI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const KPI = ss.getSheetByName(SHEETS.KPIS);
  const SET = ss.getSheetByName(SHEETS.SETTINGS);
  const aht = KPI.getRange('B42').getValue();
  const csat = KPI.getRange('B43').getValue();
  const occ = KPI.getRange('B44').getValue();
  const ahtT = SET.getRange('B18').getValue() || 9.7;
  const csatT = SET.getRange('B19').getValue() || 97;
  const occT = SET.getRange('B20').getValue() || 87.15;

  const ai = (typeof aht === 'number' && aht <= ahtT) ? '✓' : '·';
  const ci = (typeof csat === 'number' && csat >= csatT) ? '✓' : '·';
  const oi = (typeof occ === 'number' && occ >= occT) ? '✓' : '·';

  let msg = '<b>Motive KPIs (MTD)</b>\n\n';
  msg += '<pre>';
  msg += '  ' + ai + '  AHT     ' + (typeof aht === 'number' ? aht.toFixed(1) : '—') + ' min  (target ≤' + ahtT + ')\n';
  msg += '  ' + ci + '  CSAT    ' + (typeof csat === 'number' ? csat.toFixed(1) : '—') + '%    (target ≥' + csatT + ')\n';
  msg += '  ' + oi + '  OCC     ' + (typeof occ === 'number' ? occ.toFixed(1) : '—') + '%    (target ≥' + occT + ')\n';
  msg += '</pre>';

  sendTelegram(msg);
}

function cmdQuran() {
  const verseIdx = Math.floor((new Date() - new Date(2026,0,1)) / 86400000) % VERSES.length;
  let msg = '<b>Verse of the day</b>\n\n';
  msg += '<i>' + tgFmtEscape(VERSES[verseIdx]) + '</i>';
  sendTelegram(msg);
}

function cmdQuest() {
  const day = getQuestDay();
  const pct = Math.round((day / 90) * 100);

  let msg = '<b>Sovereign Quest</b>\n\n';
  msg += '<pre>';
  msg += '  Day         ' + day + ' of 90\n';
  msg += '  Complete    ' + pct + '%\n';
  msg += '  Remaining   ' + (90 - day) + ' days\n';
  msg += '\n';
  msg += '  ' + tgFmtBar(pct, 22) + '\n';
  msg += '</pre>\n\n';

  if (day <= 30) {
    msg += '<i>Phase 1: Foundation. Build the floor.</i>';
  } else if (day <= 60) {
    msg += '<i>Phase 2: Build. Add the walls.</i>';
  } else {
    msg += '<i>Phase 3: Sovereign. The roof closes.</i>';
  }

  sendTelegram(msg);
}

function cmdPillars() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const HAB = ss.getSheetByName(SHEETS.HABITS);
  const FIN = ss.getSheetByName(SHEETS.FINANCE);
  const PRG = ss.getSheetByName(SHEETS.PROGRESS);
  const SET = ss.getSheetByName(SHEETS.SETTINGS);
  const day = new Date().getDate();

  // NEW v2.1: Habits structure changed — DEEN sum from rows 7-11 col J
  const deenSum = HAB.getRange('J7:J11').getValues().flat().reduce((a,b)=>a+(b||0),0);
  const fajrMasjidThisWeek = HAB.getRange('J7').getValue() || 0;
  const deenPct = Math.min(100, Math.round((deenSum / 35) * 100)); // 5 habits × 7 days

  const startWt = SET.getRange('B10').getValue() || 80;
  const targetWt = SET.getRange('B11').getValue() || 69;
  const weights = PRG.getRange('B6:B36').getValues().flat().filter(v => typeof v === 'number');
  const currWt = weights.length ? weights[weights.length-1] : startWt;
  const bodyPct = Math.round(Math.max(0, ((startWt - currWt) / (startWt - targetWt)) * 100));

  const totalDebt = FIN.getRange('B85').getValue() || 0;
  const totalPaid = FIN.getRange('B86').getValue() || 0;
  const moneyPct = Math.min(100, Math.round((totalPaid / (totalDebt + totalPaid)) * 100));

  const studyMtd = PRG.getRange('G6:G36').getValues().flat().reduce((a,b)=>a+(b||0),0);
  const knowledgePct = Math.min(100, Math.round((studyMtd / 40) * 100));

  let msg = '<b>5 Pillars · Day ' + getQuestDay() + '/90</b>\n\n';

  msg += '<pre>';
  msg += '  Deen        ' + deenPct + '%\n';
  msg += '  ' + tgFmtBar(deenPct, 22) + '\n';
  msg += '  ' + deenSum + '/35 this week · ' + fajrMasjidThisWeek + ' Fajr@masjid\n';
  msg += '\n';
  msg += '  Body        ' + bodyPct + '%\n';
  msg += '  ' + tgFmtBar(bodyPct, 22) + '\n';
  msg += '  ' + currWt.toFixed(1) + ' → ' + targetWt + ' kg\n';
  msg += '\n';
  msg += '  Money       ' + moneyPct + '%\n';
  msg += '  ' + tgFmtBar(moneyPct, 22) + '\n';
  msg += '  ' + totalPaid.toLocaleString() + ' / ' + (totalDebt+totalPaid).toLocaleString() + ' PKR\n';
  msg += '\n';
  msg += '  Knowledge   ' + knowledgePct + '%\n';
  msg += '  ' + tgFmtBar(knowledgePct, 22) + '\n';
  msg += '  ' + studyMtd.toFixed(1) + ' study hrs MTD\n';
  msg += '\n';
  msg += '  Family      10%\n';
  msg += '  ' + tgFmtBar(10, 22) + '\n';
  msg += '  Tracker pending\n';
  msg += '</pre>\n\n';

  const pillars = [
    { name: 'Deen', pct: deenPct },
    { name: 'Body', pct: bodyPct },
    { name: 'Money', pct: moneyPct },
    { name: 'Knowledge', pct: knowledgePct }
  ];
  pillars.sort((a, b) => a.pct - b.pct);
  const weakest = pillars[0];

  if (weakest.pct < 30) {
    msg += '<i>' + weakest.name + ' is the cold spot. Even one small move there shifts the whole picture.</i>';
  } else {
    msg += '<i>The pillars are holding. Small daily wins compound.</i>';
  }

  sendTelegram(msg);
}

function cmdWeek() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const HAB = ss.getSheetByName(SHEETS.HABITS);

  // NEW v2.1: this week's totals from per-day columns (C-I = Mon-Sun)
  let msg = '<b>This week (Mon-Sun)</b>\n\n';
  msg += '<pre>';

  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let totalAcrossWeek = 0;
  let strongDays = 0;

  for (let d = 0; d < 7; d++) {
    const col = 3 + d; // C=Mon, I=Sun
    let dayCount = 0;

    try {
      const colValues = HAB.getRange(7, col, 17, 1).getValues().flat();
      colValues.forEach(v => {
        if (v === true || v === 'TRUE' || v === '✓') dayCount++;
      });
    } catch (e) {}

    const pct = Math.round((dayCount / 14) * 100);
    msg += '  ' + dayLabels[d] + '  ' + tgFmtBar(pct, 16) + '  ' + 
           tgFmtPad(dayCount + '/14', 6, 'right') + '\n';

    totalAcrossWeek += dayCount;
    if (dayCount >= 10) strongDays++;
  }
  msg += '</pre>\n\n';

  if (strongDays >= 5) {
    msg += '<i>' + strongDays + '/7 strong days. The week held.</i>';
  } else if (strongDays >= 2) {
    msg += '<i>' + strongDays + ' strong days this week. Aim for one more.</i>';
  } else {
    msg += '<i>The week was light. Tomorrow is the rebuild.</i>';
  }

  sendTelegram(msg);
}

// ──────────────────────────────────────────────────────────
// QUICK LOG COMMANDS — clean confirmations
// ──────────────────────────────────────────────────────────

function cmdWeight(args) {
  const w = parseFloat(args);
  if (!w || w < 50 || w > 120) { 
    sendTelegram('How to log weight:\n\n/weight 76.5'); 
    return; 
  }
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PROGRESS)
    .getRange(5 + new Date().getDate(), 2).setValue(w);
  sendTelegram('<b>✓ Weight: ' + w + ' kg</b>');
}

function cmdLogScale(label, args, col) {
  const v = parseInt(args);
  if (!v || v < 1 || v > 10) { 
    sendTelegram('How to log ' + label + ':\n\n/' + label + ' 7   (1 to 10)'); 
    return; 
  }
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PROGRESS)
    .getRange(5 + new Date().getDate(), col).setValue(v);
  sendTelegram('<b>✓ ' + label.charAt(0).toUpperCase() + label.slice(1) + ': ' + v + '/10</b>');
}

function cmdSleep(args) {
  const h = parseFloat(args);
  if (!h || h < 0 || h > 12) { 
    sendTelegram('How to log sleep:\n\n/sleep 6.5'); 
    return; 
  }
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PROGRESS)
    .getRange(5 + new Date().getDate(), 6).setValue(h);
  sendTelegram('<b>✓ Sleep: ' + h + ' h</b>');
}

function cmdStudy(args) {
  const h = parseFloat(args);
  if (h === undefined || isNaN(h) || h < 0 || h > 8) { 
    sendTelegram('How to log study:\n\n/study 1.5'); 
    return; 
  }
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PROGRESS)
    .getRange(5 + new Date().getDate(), 7).setValue(h);
  sendTelegram('<b>✓ Study: ' + h + ' h</b>');
}

function cmdSalah(args) {
  const parts = args.toLowerCase().split(' ');
  const prayer = parts[0];
  const locInput = (parts[1] || '').trim();

  if (!_PRAYER_NAMES[prayer]) {
    sendTelegram('How to log salah:\n\n/salah fajr M\n/salah asr WU');
    return;
  }

  const code = _normalizeLocationInput(locInput);
  if (!code) {
    sendTelegram('Codes:\nM=Masjid · J=Jamaat · H=Home · W=Work\nWU/HU=valid reason · L=Late · Q=Qaza');
    return;
  }

  cmdPrayed(prayer + ' ' + locInput);
}

function cmdHabit(args) {
  // NEW v2.1: writes to today's column in new Habits cockpit
  const parts = args.toLowerCase().split(' ');
  const habit = parts[0];
  const status = parts[1] === 'done' ? true : (parts[1] === 'skip' ? false : null);

  if (status === null) {
    sendTelegram('How to log a habit:\n\n/habit walk done\n/habit sql skip');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const HAB = ss.getSheetByName(SHEETS.HABITS);
  if (!HAB) { sendTelegram('Habits tab couldn\'t be reached.'); return; }

  // Find habit row by name match
  let foundRow = -1;
  let foundName = '';
  // Mirror habit rows in v2.1 layout — DO NOT overwrite (Salah-driven formulas)
  const MIRROR_ROWS = [7, 8];
  for (let row = 7; row <= 23; row++) {
    const name = HAB.getRange(row, 1).getValue();
    if (name && String(name).indexOf('·') === -1 && 
        String(name).toLowerCase().indexOf(habit) !== -1) {
      if (MIRROR_ROWS.indexOf(row) !== -1) {
        sendTelegram('That habit is auto-tracked from your Salah tab.\n\n' +
                     'To log it, use /prayed instead.\n\n' +
                     'Example: /prayed fajr masjid');
        return;
      }
      foundRow = row;
      foundName = String(name);
      break;
    }
  }

  if (foundRow === -1) {
    sendTelegram('No habit matches "' + habit + '".\n\nType /streaks to see all habit names.');
    return;
  }

  // Write to today's column (Mon-Sun = cols 3-9)
  const dayOfWeek = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
  const todayCol = 2 + dayOfWeek;

  try {
    HAB.getRange(foundRow, todayCol).setValue(status);
    sendTelegram('<b>' + (status ? '✓' : '·') + ' ' + tgFmtEscape(foundName) + ': ' + 
                 (status ? 'done' : 'skipped') + '</b>');
  } catch (e) {
    sendTelegram('Couldn\'t save: ' + e.message);
  }
}

function cmdPay(args) {
  const parts = args.split(' ').filter(p => p.length > 0);
  const amt = parseFloat(parts[0]);

  // Account aliases — case-insensitive, short or full forms accepted
  const ACCOUNT_ALIASES = {
    'cash': 'Cash',
    'jazzcash': 'JazzCash', 'jazz': 'JazzCash', 'jc': 'JazzCash',
    'easypaisa': 'Easypaisa', 'easy': 'Easypaisa', 'ep': 'Easypaisa',
    'ubl': 'UBL',
    'meezan': 'Meezan', 'mz': 'Meezan',
    'mashreq': 'Mashreq Bank', 'mashreq bank': 'Mashreq Bank',
    'js': 'JS Bank', 'js bank': 'JS Bank', 'jsbank': 'JS Bank',
    'naya': 'Naya Pay', 'naya pay': 'Naya Pay', 'nayapay': 'Naya Pay', 'np': 'Naya Pay',
    'alfalah': 'Bank Alfalah', 'bank alfalah': 'Bank Alfalah',
    'cc': 'Alfalah CC', 'alfalah cc': 'Alfalah CC', 'creditcard': 'Alfalah CC'
  };

  // Detect if last word is an account alias — if so, treat as override
  let overrideAcc = null;
  let nameParts = parts.slice(1);
  if (nameParts.length >= 2) {
    const lastWord = nameParts[nameParts.length - 1].toLowerCase();
    const lastTwoWords = nameParts.slice(-2).join(' ').toLowerCase();
    if (ACCOUNT_ALIASES[lastTwoWords]) {
      overrideAcc = ACCOUNT_ALIASES[lastTwoWords];
      nameParts = nameParts.slice(0, -2);
    } else if (ACCOUNT_ALIASES[lastWord]) {
      overrideAcc = ACCOUNT_ALIASES[lastWord];
      nameParts = nameParts.slice(0, -1);
    }
  }
  const who = nameParts.join(' ').toLowerCase().trim();

  if (!amt || amt <= 0 || !who) { 
    sendTelegram('How to log a payment:\n\n' +
                 '/pay 5000 imran           (defaults to Meezan)\n' +
                 '/pay 5000 imran ubl       (override account)\n' +
                 '/pay 1300 zain jazzcash\n' +
                 '/pay 8500 mashal cash\n\n' +
                 'Accounts: cash · jazzcash · easypaisa · ubl · meezan · mashreq · js · naya · alfalah · cc'); 
    return; 
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const debts = ss.getSheetByName('💳 Debts');
  if (!debts) { 
    sendTelegram('The 💳 Debts tab couldn\'t be reached.\nMaybe it\'s renamed. Open the sheet and check.'); 
    return; 
  }

  
function cmdSalary(args) {
  const amt = parseFloat(String(args || '').trim());

  if (typeof SALARY_RULES === 'undefined') {
    sendTelegram('Salary rules not loaded. Make sure Finance_Pro.gs is up to date.');
    return;
  }

  if (!amt || isNaN(amt)) {
    sendTelegram('How to log salary:\n\n/salary 145000\n\n' +
                 'Auto-fills: Meezan · Income · 💰 Salary · ' + SALARY_RULES.defaultEmployer + '\n' +
                 'Valid range: ' + SALARY_RULES.minAmount.toLocaleString() + 
                 ' to ' + SALARY_RULES.maxAmount.toLocaleString() + ' PKR');
    return;
  }

  if (amt < SALARY_RULES.minAmount || amt > SALARY_RULES.maxAmount) {
    sendTelegram('That amount looks off for salary.\n\n' +
                 'Valid range: ' + SALARY_RULES.minAmount.toLocaleString() + 
                 ' to ' + SALARY_RULES.maxAmount.toLocaleString() + ' PKR\n\n' +
                 'If it really is salary outside this range, log it via Row 4 in 💸 Transactions instead.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName('💸 Transactions');
  if (!tx) { sendTelegram('💸 Transactions tab not reachable.'); return; }

  let nextRow = -1;
  for (let r = 14; r <= 213; r++) {
    if (!tx.getRange(r, 1).getValue()) { nextRow = r; break; }
  }
  if (nextRow === -1) { sendTelegram('Ledger full. Archive old transactions.'); return; }

  const today = new Date();
  const txnId = (typeof generateTxnId === 'function') 
                ? generateTxnId() 
                : 'TXN-' + Utilities.formatDate(today, 'Asia/Karachi', 'yyyyMMdd-HHmmss');

  tx.getRange(nextRow, 1).setValue(today).setNumberFormat('dd MMM yyyy');
  tx.getRange(nextRow, 2).setValue(SALARY_RULES.account);
  tx.getRange(nextRow, 3).setValue(SALARY_RULES.type);
  tx.getRange(nextRow, 4).setValue('💰 Salary');
  tx.getRange(nextRow, 5).setValue(amt).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 6).setValue(SALARY_RULES.currency);
  tx.getRange(nextRow, 7).setValue(amt).setNumberFormat('#,##0.00');
  tx.getRange(nextRow, 8).setValue(SALARY_RULES.defaultEmployer);
  try { tx.getRange(nextRow, 9, 1, 4).breakApart(); } catch (e) {}
  tx.getRange(nextRow, 9, 1, 4).merge()
    .setValue('Monthly salary · auto-logged via /salary');
  tx.getRange(nextRow, 14).setValue(txnId);

  if (typeof logAuditAction === 'function') {
    logAuditAction('SALARY_LOGGED', amt + ' PKR · ' + SALARY_RULES.account + ' · ' + txnId);
  }

  const month = Utilities.formatDate(today, 'Asia/Karachi', 'MMMM yyyy');

  let msg = '<b>✓ Salary ' + amt.toLocaleString() + ' PKR → Meezan</b>\n\n';
  msg += '<pre>';
  msg += '  Month        ' + month + '\n';
  msg += '  Date         ' + Utilities.formatDate(today, 'Asia/Karachi', 'dd MMM yyyy') + '\n';
  msg += '  Type         Income · 💰 Salary\n';
  msg += '  Employer     ' + SALARY_RULES.defaultEmployer + '\n';
  msg += '  Written to   💸 Transactions + 📜 Audit Log\n';
  msg += '</pre>\n\n';
  msg += '<i>Rizq from Allah ﷻ. May He bless it for you and your family, akhi.</i>';

  sendTelegram(msg);
}

  // Find creditor in 💳 Debts rows 6-11 (canonical source)
  let foundRow = -1;
  let creditorName = '';
  const allCreditors = [];
  for (let r = 6; r <= 11; r++) {
    const name = (debts.getRange(r, 2).getValue() || '').toString();
    if (name) allCreditors.push(name);
    if (name && name.toLowerCase().indexOf(who) !== -1 && foundRow === -1) {
      foundRow = r;
      creditorName = name;
    }
  }

  if (foundRow === -1) {
    sendTelegram('No creditor matches "' + who + '".\n\nAvailable:\n' + 
                 (allCreditors.length ? allCreditors.join('\n') : '(no creditors loaded — open 💳 Debts tab)'));
    return;
  }

  // Stage the payment in the existing pay-installment workflow
  const remaining = debts.getRange(foundRow, 5).getValue() || 0;
  if (remaining <= 0) {
    sendTelegram(creditorName + ' is already CLEARED.\n\nNothing more to pay there. Pick the next snowball target.');
    return;
  }

  // Account priority: explicit override > existing cell value > Meezan default
  const existingAcc = debts.getRange(foundRow, 9).getValue();
  const fromAcc = overrideAcc || existingAcc || 'Meezan';
  debts.getRange(foundRow, 9).setValue(fromAcc);   // ensure account is set
  debts.getRange(foundRow, 10).setValue(amt);      // stage Pay Amount

  // Call the existing audited payment function (writes to 💳 Debts + 💸 Transactions + 📜 Audit Log)
  if (typeof payInstallment !== 'function') {
    debts.getRange(foundRow, 10).setValue(0);  // unstage
    sendTelegram('payInstallment() function not found.\nFinance_Debts.gs may not be loaded.');
    return;
  }

  try {
    payInstallment(debts, foundRow);
  } catch (e) {
    sendTelegram('The payment couldn\'t be saved: ' + e.message + '\n\nNo data was written.');
    return;
  }

  // Read back the confirmed state
  const newPaid = debts.getRange(foundRow, 4).getValue() || 0;
  const newRemaining = debts.getRange(foundRow, 5).getValue() || 0;
  const original = debts.getRange(foundRow, 3).getValue() || 0;
  const pct = original > 0 ? Math.round((newPaid / original) * 100) : 0;

  let msg = '<b>✓ ' + amt.toLocaleString() + ' PKR → ' + creditorName + '</b>\n\n';
  msg += '<pre>';
  msg += '  From         ' + fromAcc + '\n';
  msg += '  Total paid   ' + newPaid.toLocaleString() + ' / ' + original.toLocaleString() + '\n';
  msg += '  Remaining    ' + newRemaining.toLocaleString() + ' PKR\n';
  msg += '  Progress     ' + pct + '%\n';
  msg += '\n';
  msg += '  Written to   💳 Debts + 💸 Transactions + 📜 Audit Log\n';
  msg += '</pre>';

  if (newRemaining <= 0) {
    msg += '\n\n<i>' + creditorName + ' is now CLEARED.\nSnowball gathers speed, akhi.</i>';
  } else if (pct >= 50) {
    msg += '\n\n<i>Past halfway with ' + creditorName + '. Keep the rhythm.</i>';
  }

  sendTelegram(msg);
}


function cmdCal(args) {
  const parts = args.split(' ').filter(p => p.length > 0);
  const qty = parseFloat(parts[0]);
  const foodName = parts.slice(1).join(' ').toLowerCase().trim();

  if (!qty || qty <= 0 || !foodName) {
    sendTelegram('How to log food:\n\n' +
                 '/cal 250 chicken biryani    (250g of biryani)\n' +
                 '/cal 2 boiled egg            (2 eggs)\n' +
                 '/cal 405 manual              (just calories, no library)');
    return;
  }

  if (typeof HEALTH_FOOD_LIBRARY === 'undefined') {
    sendTelegram('Health module not loaded. Please rebuild Health cockpit first.');
    return;
  }

  // Try library match first
  let libMatch = HEALTH_FOOD_LIBRARY.find(item => 
    item[0].toLowerCase() === foodName
  );
  if (!libMatch) {
    // Try partial match
    libMatch = HEALTH_FOOD_LIBRARY.find(item => 
      item[0].toLowerCase().indexOf(foodName) !== -1 || 
      foodName.indexOf(item[0].toLowerCase()) !== -1
    );
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hth = ss.getSheetByName('🏥 Health');
  if (!hth) { sendTelegram('🏥 Health tab not found. Run rebuildHealthCockpit first.'); return; }

  let cal, protein, foodLabel, unit;

  if (libMatch) {
    foodLabel = libMatch[0];
    unit = libMatch[3];
    if (unit === 'g' || unit === 'ml') {
      cal = Math.round(qty * libMatch[1] / 100);
      protein = Math.round((qty * libMatch[2] / 100) * 10) / 10;
    } else {
      cal = Math.round(qty * libMatch[1]);
      protein = Math.round((qty * libMatch[2]) * 10) / 10;
    }
  } else if (foodName === 'manual' || foodName.indexOf('manual') !== -1) {
    // /cal 405 manual lunch  → just log raw calories
    foodLabel = parts.slice(2).join(' ') || 'Manual entry';
    unit = 'kcal';
    cal = qty;
    protein = 0;
  } else {
    // No library match, no manual flag — log raw calories with food as name
    foodLabel = foodName;
    unit = 'kcal';
    cal = qty;
    protein = 0;
  }

  // Find next empty row in food log
  let nextRow = -1;
  for (let r = 14; r <= 63; r++) {
    if (!hth.getRange(r, 1).getValue()) { nextRow = r; break; }
  }
  if (nextRow === -1) { sendTelegram('Food log full. Open Health tab and clear old entries.'); return; }

  // Determine meal by hour
  const hr = new Date().getHours();
  let meal = 'Snack';
  if (hr >= 6 && hr < 11) meal = 'Breakfast';
  else if (hr >= 11 && hr < 15) meal = 'Lunch';
  else if (hr >= 15 && hr < 18) meal = 'Snack 2';
  else if (hr >= 18 && hr < 22) meal = 'Dinner';
  else meal = 'Late Night';

  hth.getRange(nextRow, 1).setValue(new Date()).setNumberFormat('dd MMM yyyy');
  hth.getRange(nextRow, 2).setValue(meal);
  hth.getRange(nextRow, 3).setValue(foodLabel);
  hth.getRange(nextRow, 4).setValue(qty);
  hth.getRange(nextRow, 5).setValue(unit);
  hth.getRange(nextRow, 6).setValue(libMatch ? (unit === 'g' || unit === 'ml' ? libMatch[1]/100 : libMatch[1]) : 1).setNumberFormat('0.00');
  hth.getRange(nextRow, 7).setValue(cal).setNumberFormat('#,##0');
  hth.getRange(nextRow, 8).setValue(protein).setNumberFormat('0.0');
  hth.getRange(nextRow, 9).setValue('via Telegram /cal');

  if (typeof logAuditAction === 'function') {
    logAuditAction('FOOD_LOGGED', foodLabel + ' · ' + qty + unit + ' · ' + cal + ' kcal · ' + protein + 'g protein · via /cal');
  }

  if (typeof _autoTickBodyHabits === 'function') {
    try { _autoTickBodyHabits(); } catch(e) {}
  }

  // Read today's totals
  const todayTotal = hth.getRange('G64').getValue() || 0;
  const todayProtein = hth.getRange('H64').getValue() || 0;
  const remaining = HEALTH_BASELINE.calTarget - todayTotal;

  let msg = '<b>✓ ' + tgFmtEscape(foodLabel) + ' logged</b>\n\n';
  msg += '<pre>';
  msg += '  Meal         ' + meal + '\n';
  msg += '  Qty          ' + qty + ' ' + unit + '\n';
  msg += '  Calories     ' + cal + ' kcal\n';
  msg += '  Protein      ' + protein + ' g\n';
  msg += '  Library      ' + (libMatch ? '✓ matched: ' + libMatch[0] : '✗ manual entry') + '\n';
  msg += '\n';
  msg += '  Today total  ' + todayTotal + ' / ' + HEALTH_BASELINE.calTarget + ' kcal\n';
  msg += '  Protein      ' + Math.round(todayProtein * 10) / 10 + ' / ' + HEALTH_BASELINE.proteinTarget + ' g\n';
  msg += '  Remaining    ' + remaining + ' kcal\n';
  msg += '</pre>\n\n';

  if (todayTotal > HEALTH_BASELINE.calTarget) {
    msg += '<i>Over target by ' + (todayTotal - HEALTH_BASELINE.calTarget) + ' kcal. Walk it off after Maghrib if you can, akhi.</i>';
  } else if (remaining < 200) {
    msg += '<i>Close to target — keep it light for the rest of the day.</i>';
  } else {
    msg += '<i>Good logging. The body responds to consistency.</i>';
  }

  sendTelegram(msg);
}

function cmdEaten() {
  if (typeof HEALTH_FOOD_LIBRARY === 'undefined') {
    sendTelegram('Health module not loaded.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hth = ss.getSheetByName('🏥 Health');
  if (!hth) { sendTelegram('🏥 Health tab not found.'); return; }

  const todayTotal = hth.getRange('G64').getValue() || 0;
  const todayProtein = hth.getRange('H64').getValue() || 0;
  const todayWater = hth.getRange('B69').getValue() || 0;

  // Scan today's food log entries
  const today = new Date();
  const todayDateStr = Utilities.formatDate(today, 'Asia/Karachi', 'yyyy-MM-dd');
  const meals = { Breakfast: [], Lunch: [], 'Snack 2': [], Dinner: [], Snack: [], 'Late Night': [] };

  for (let r = 14; r <= 63; r++) {
    const d = hth.getRange(r, 1).getValue();
    if (!(d instanceof Date)) continue;
    const dStr = Utilities.formatDate(d, 'Asia/Karachi', 'yyyy-MM-dd');
    if (dStr !== todayDateStr) continue;
    const meal = hth.getRange(r, 2).getValue() || 'Snack';
    const food = hth.getRange(r, 3).getValue() || '';
    const cal = hth.getRange(r, 7).getValue() || 0;
    if (meals[meal]) meals[meal].push({ food: food, cal: cal });
    else meals.Snack.push({ food: food, cal: cal });
  }

  let msg = '<b>Today · Day ' + getQuestDay() + '/90</b>\n\n';
  msg += '<pre>';
  msg += '  Calories     ' + todayTotal + ' / ' + HEALTH_BASELINE.calTarget + ' kcal\n';
  msg += '  Protein      ' + Math.round(todayProtein * 10) / 10 + ' / ' + HEALTH_BASELINE.proteinTarget + ' g\n';
  msg += '  Water        ' + todayWater + ' / ' + HEALTH_BASELINE.waterTargetGlasses + ' glasses\n';
  msg += '\n';
  msg += '  Remaining    ' + (HEALTH_BASELINE.calTarget - todayTotal) + ' kcal\n';
  msg += '</pre>\n\n';

  let hasFood = false;
  Object.keys(meals).forEach(mealName => {
    if (meals[mealName].length > 0) {
      hasFood = true;
      msg += '<b>' + mealName + '</b>\n';
      msg += '<pre>';
      meals[mealName].forEach(item => {
        msg += '  ' + tgFmtPad(String(item.food).substring(0, 22), 24) + 
               tgFmtPad(item.cal + ' kcal', 10, 'right') + '\n';
      });
      msg += '</pre>\n';
    }
  });

  if (!hasFood) {
    msg += '<i>No food logged today yet. Use /cal [qty] [food] to start.</i>';
  } else {
    if (todayTotal > HEALTH_BASELINE.calTarget) {
      msg += '\n<i>Over by ' + (todayTotal - HEALTH_BASELINE.calTarget) + ' kcal. Tomorrow is fresh, akhi.</i>';
    } else if (todayTotal === 0) {
      msg += '\n<i>Day still open.</i>';
    } else {
      msg += '\n<i>On track. Eat clean, walk after meals.</i>';
    }
  }

  sendTelegram(msg);
}

function cmdWater() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hth = ss.getSheetByName('🏥 Health');
  if (!hth) { sendTelegram('🏥 Health tab not found.'); return; }

  if (typeof addWaterGlass === 'function') {
    addWaterGlass(hth);
  } else {
    sendTelegram('Health module not fully loaded.');
    return;
  }

  const todayWater = hth.getRange('B69').getValue() || 0;
  const remaining = HEALTH_BASELINE.waterTargetGlasses - todayWater;

  let msg = '<b>💧 +1 glass logged</b>\n\n';
  msg += '<pre>';
  msg += '  Today        ' + todayWater + ' / ' + HEALTH_BASELINE.waterTargetGlasses + ' glasses\n';
  msg += '  Total ml     ' + (todayWater * HEALTH_BASELINE.waterGlassMl) + ' ml\n';
  msg += '</pre>\n\n';

  if (todayWater >= HEALTH_BASELINE.waterTargetGlasses) {
    msg += '<i>Hydration target hit, akhi. ✓</i>';
  } else {
    msg += '<i>' + remaining + ' more glasses to target.</i>';
  }

  sendTelegram(msg);
}

function cmdFree() {
  // Find Habit One row in new structure
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const HAB = ss.getSheetByName(SHEETS.HABITS);
  if (!HAB) { sendTelegram('Habits tab couldn\'t be reached.'); return; }

  let habitOneRow = -1;
  for (let row = 7; row <= 23; row++) {
    const name = String(HAB.getRange(row, 1).getValue() || '');
    if (name.indexOf('Habit One') !== -1) { habitOneRow = row; break; }
  }

  if (habitOneRow === -1) {
    sendTelegram('Couldn\'t find Habit One row.');
    return;
  }

  const dayOfWeek = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
  const todayCol = 2 + dayOfWeek;
  HAB.getRange(habitOneRow, todayCol).setValue(true);

  const weekCount = HAB.getRange(habitOneRow, 10).getValue() || 0;

  let msg = '<b>I\'m free — Habit One success logged</b>\n\n';
  msg += '<pre>';
  msg += '  This week   ' + weekCount + ' / 7\n';
  msg += '</pre>\n\n';
  msg += '<i>Allah ﷻ guides whom He wills.\nKeep walking.</i>';
  sendTelegram(msg);
}

function cmdReset() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const HAB = ss.getSheetByName(SHEETS.HABITS);
  if (!HAB) { sendTelegram('Habits tab couldn\'t be reached.'); return; }

  let habitOneRow = -1;
  for (let row = 7; row <= 23; row++) {
    const name = String(HAB.getRange(row, 1).getValue() || '');
    if (name.indexOf('Habit One') !== -1) { habitOneRow = row; break; }
  }

  if (habitOneRow !== -1) {
    const dayOfWeek = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
    const todayCol = 2 + dayOfWeek;
    HAB.getRange(habitOneRow, todayCol).setValue(false);
  }

  let msg = '<b>Habit One reset honestly logged.</b>\n\n';
  msg += '<i>"...remember Allah and seek\nforgiveness for their sins..."\n— Quran 3:135</i>\n\n';
  msg += 'Wudu. 2 nafl. Open Quran.\n\n';
  msg += '<i>Tomorrow we walk again.</i>';
  sendTelegram(msg);
}

function cmdWin(args) {
  if (!args) { 
    sendTelegram('Log a win:\n\n/win Closed 5 cases under AHT 8min'); 
    return; 
  }
  const props = PropertiesService.getDocumentProperties();
  const wins = JSON.parse(props.getProperty('wins') || '[]');
  wins.push({ date: new Date().toISOString(), text: args });
  props.setProperty('wins', JSON.stringify(wins));
  sendTelegram('<b>✓ Win logged (' + wins.length + ' total)</b>\n\n<i>' + tgFmtEscape(args) + '</i>');
}

function cmdTrap(args) {
  if (!args) { 
    sendTelegram('Log a trap:\n\n/trap Spent 2hr on YouTube after Asr'); 
    return; 
  }
  const props = PropertiesService.getDocumentProperties();
  const traps = JSON.parse(props.getProperty('traps') || '[]');
  traps.push({ date: new Date().toISOString(), text: args });
  props.setProperty('traps', JSON.stringify(traps));
  sendTelegram('<b>✓ Trap logged (' + traps.length + ' total)</b>\n\n<i>' + tgFmtEscape(args) + '</i>');
}

function cmdNote(args) {
  if (!args) { 
    sendTelegram('Save a note:\n\n/note Idea for AI briefing'); 
    return; 
  }
  const props = PropertiesService.getDocumentProperties();
  const notes = JSON.parse(props.getProperty('quickNotes') || '[]');
  notes.push({ date: new Date().toISOString(), text: args });
  props.setProperty('quickNotes', JSON.stringify(notes));
  sendTelegram('<b>✓ Note saved</b>\n\n<i>' + tgFmtEscape(args) + '</i>');
}

// ──────────────────────────────────────────────────────────
// AI CONVERSATION (uses callAI fallback)
// ──────────────────────────────────────────────────────────

function handleAIChat(userMessage) {
  const context = (typeof buildSovereignContext === 'function') ? buildSovereignContext() : '';
  const sovPrompt = (typeof SOVEREIGN_PROMPT !== 'undefined') ? SOVEREIGN_PROMPT : 
                    'You are Abu Walah\'s wise older brother and coach. Honest, never harsh. Always pointing forward.';

  const prompt = sovPrompt + '\n\n' + context + 
    '\n\n═══ HIS QUESTION ═══\n' + userMessage + 
    '\n\n═══ TASK ═══\n' +
    'Answer like a wise older brother who knows him well. ' +
    'Honest, never harsh. Specific, never generic. Point forward, never just look back. ' +
    'Use his real numbers when relevant. ' +
    'Quran or hadith only if it fits naturally — never forced. ' +
    'Max 200 words. Plain language.';

  sendTelegram('<i>Thinking...</i>');

  // Prefer callAI (multi-model) if available, fall back to callGemini
  let result;
  if (typeof callAI === 'function') {
    result = callAI(prompt, 2000);
  } else if (typeof callGemini === 'function') {
    result = callGemini(prompt, 2000);
  } else {
    sendTelegram('AI engine not loaded.');
    return;
  }

  if (result.error) { 
    sendTelegram('The AI couldn\'t answer right now. Try again in a minute.'); 
    return; 
  }

  let msg = '<b>Sovereign</b>\n\n';
  msg += tgFmtEscape(result.text);
  sendTelegram(msg);
}

// ──────────────────────────────────────────────────────────
// SOVEREIGN BRIEFING
// ──────────────────────────────────────────────────────────

function sendSovereignBriefingToTelegram() {
  const context = (typeof buildSovereignContext === 'function') ? buildSovereignContext() : '';
  const sovPrompt = (typeof SOVEREIGN_PROMPT !== 'undefined') ? SOVEREIGN_PROMPT : 
                    'You are Abu Walah\'s wise older brother and coach. Honest, never harsh. Always pointing forward.';

  const briefingInstruction = '\n\nGive him today\'s briefing as a wise older brother. ' +
                              'Open with what\'s working (be specific with numbers). ' +
                              'Name one thing to watch (without shame). ' +
                              'Point to the next concrete action. ' +
                              'Quran or hadith only if it fits naturally. ' +
                              'Max 250 words. Plain language.';

  let result;
  if (typeof callAI === 'function') {
    result = callAI(sovPrompt + '\n\n' + context + briefingInstruction, 4000);
  } else if (typeof callGemini === 'function') {
    result = callGemini(sovPrompt + '\n\n' + context + briefingInstruction, 4000);
  } else {
    sendTelegram('AI engine not loaded.');
    return;
  }

  if (result.error) { 
    sendTelegram('The briefing couldn\'t be generated right now. Try /briefing again in a minute.'); 
    return; 
  }

  const briefing = result.text;
  const questDay = getQuestDay();

  let msg = '<b>Sovereign Briefing · Day ' + questDay + '/90</b>\n';
  msg += '<i>' + tgFmtFullDateTime() + '</i>\n\n';
  msg += tgFmtDivider(26) + '\n\n';
  msg += tgFmtEscape(briefing) + '\n\n';
  msg += tgFmtDivider(26) + '\n';
  msg += '<i>Bismillah.</i>';

  sendTelegram(msg);

  if (typeof logAiBriefing === 'function') logAiBriefing(briefing, questDay);
}

function installTelegramBriefingTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sendSovereignBriefingToTelegram') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendSovereignBriefingToTelegram').timeBased().atHour(13).everyDays(1).create();
  if (typeof safeAlert === 'function') safeAlert('Telegram briefing scheduled for 1:00 PM PKT daily.');
}