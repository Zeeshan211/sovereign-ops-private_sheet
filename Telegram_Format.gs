// ════════════════════════════════════════════════════════════════════
// 📱 Telegram_Format.gs — PRODUCTION-GRADE MESSAGE FORMATTER
// LOCKED · 7-Layer Audit · Self-Contained · Day 6 / 90
//
// All Telegram bot messages flow through these formatters.
// Uses Telegram HTML parse mode (cleanest, no escape gotchas in code).
//
// USAGE:
//   const msg = tgFmtCard({
//     emoji: '✅', title: 'Asr logged',
//     rows: [['Location', 'Work'], ['Score', '+0.5']]
//   });
//   sendTelegram(msg);  // sender uses HTML parse_mode
//
// SUPPORTED HTML TAGS in Telegram (whitelist):
//   <b>, <strong>, <i>, <em>, <u>, <s>, <code>, <pre>
//   <a href="...">, <tg-spoiler>, <blockquote>
//
// @version 1.0
// @date    2026-04-29
// ════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// CORE — HTML escape (Telegram requires &, <, > escaped)
// ──────────────────────────────────────────────────────────

function tgFmtEscape(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ──────────────────────────────────────────────────────────
// LAYOUT HELPERS — monospace alignment
// ──────────────────────────────────────────────────────────

function tgFmtPad(text, width, align) {
  const s = String(text || '');
  if (s.length >= width) return s;
  const padding = ' '.repeat(width - s.length);
  if (align === 'right') return padding + s;
  if (align === 'center') {
    const half = Math.floor((width - s.length) / 2);
    return ' '.repeat(half) + s + ' '.repeat(width - s.length - half);
  }
  return s + padding;
}

function tgFmtDivider(width) {
  const w = width || 30;
  return '─'.repeat(w);
}

function tgFmtSpacer() {
  return '\n';
}

// ──────────────────────────────────────────────────────────
// CARD BUILDER — banner + key/value rows in monospace block
// ──────────────────────────────────────────────────────────

function tgFmtCard(opts) {
  // opts: { emoji, title, rows: [[key, value], ...], footer }
  const emoji = opts.emoji || '';
  const title = tgFmtEscape(opts.title || '');
  const rows = opts.rows || [];
  const footer = opts.footer || '';

  let out = '';

  // Title line (outside <pre> for emoji rendering)
  if (title) {
    out += '<b>' + (emoji ? emoji + '  ' : '') + title + '</b>\n\n';
  }

  // Find longest key for alignment
  let maxKey = 0;
  rows.forEach(r => { if (r[0] && r[0].length > maxKey) maxKey = r[0].length; });
  const keyWidth = maxKey + 2; // colon + space

  // Body in <pre> for true monospace
  if (rows.length > 0) {
    out += '<pre>';
    rows.forEach(r => {
      const k = r[0] ? tgFmtPad(r[0] + ':', keyWidth) : '';
      const v = tgFmtEscape(r[1] || '');
      out += k + v + '\n';
    });
    out += '</pre>';
  }

  if (footer) {
    out += '\n' + footer;
  }

  return out;
}

// ──────────────────────────────────────────────────────────
// SECTION BUILDER — title + content block
// ──────────────────────────────────────────────────────────

function tgFmtSection(opts) {
  // opts: { emoji, title, lines: [...], divider: bool }
  const emoji = opts.emoji || '';
  const title = tgFmtEscape(opts.title || '');
  const lines = opts.lines || [];
  const divider = opts.divider !== false; // default true

  let out = '';
  if (divider) out += tgFmtDivider(29) + '\n';
  if (title) out += '<b>' + (emoji ? emoji + '  ' : '') + title + '</b>\n\n';

  if (lines.length > 0) {
    out += '<pre>';
    lines.forEach(l => { out += tgFmtEscape(l) + '\n'; });
    out += '</pre>';
  }

  return out;
}

// ──────────────────────────────────────────────────────────
// LIST BUILDER — aligned table-style list
// ──────────────────────────────────────────────────────────

function tgFmtList(items, opts) {
  // items: [{label, value, bar, score}, ...]
  // opts: { labelWidth, valueWidth, scoreWidth }
  if (!items || items.length === 0) return '';

  const o = opts || {};
  let lblW = o.labelWidth || 0;
  let valW = o.valueWidth || 0;
  let scrW = o.scoreWidth || 0;

  // Auto-detect widths
  items.forEach(it => {
    if (it.label && it.label.length > lblW) lblW = it.label.length;
    if (it.value && String(it.value).length > valW) valW = String(it.value).length;
    if (it.score !== undefined && String(it.score).length > scrW) scrW = String(it.score).length;
  });

  let out = '<pre>';
  items.forEach(it => {
    const lbl = tgFmtPad(it.label || '', lblW + 2);
    const val = tgFmtPad(it.value || '', valW + 2);
    const scr = it.score !== undefined ? tgFmtPad(String(it.score), scrW, 'right') : '';
    out += '  ' + tgFmtEscape(lbl) + tgFmtEscape(val) + tgFmtEscape(scr) + '\n';
  });
  out += '</pre>';
  return out;
}

// ──────────────────────────────────────────────────────────
// METRIC BUILDER — big number with label
// ──────────────────────────────────────────────────────────

function tgFmtMetric(label, value, unit) {
  return '  <b>' + tgFmtEscape(label) + '</b>     ' + 
         tgFmtEscape(value) + (unit ? ' ' + tgFmtEscape(unit) : '');
}

// ──────────────────────────────────────────────────────────
// PROGRESS BAR
// ──────────────────────────────────────────────────────────

function tgFmtBar(percent, width) {
  const w = width || 20;
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round((p / 100) * w);
  return '█'.repeat(filled) + '░'.repeat(w - filled);
}

// ──────────────────────────────────────────────────────────
// HEADER — title with quest day
// ──────────────────────────────────────────────────────────

function tgFmtHeader(emoji, title, questDay) {
  let out = '<b>' + (emoji ? emoji + '  ' : '') + tgFmtEscape(title);
  if (questDay !== undefined) {
    out += '  ·  Day ' + questDay + ' of 90';
  }
  out += '</b>';
  return out;
}

// ──────────────────────────────────────────────────────────
// SUBTITLE — date + time line
// ──────────────────────────────────────────────────────────

function tgFmtSubtitle(text) {
  return '<i>' + tgFmtEscape(text) + '</i>';
}

// ──────────────────────────────────────────────────────────
// FOOTER — call-to-action
// ──────────────────────────────────────────────────────────

function tgFmtCta(text) {
  return '💡  ' + tgFmtEscape(text);
}

// ──────────────────────────────────────────────────────────
// STATUS ICONS
// ──────────────────────────────────────────────────────────

const TG_ICONS = {
  done:    '✓',
  pending: '⏳',
  late:    '⚠️',
  qaza:    '🔴',
  masjid:  '🟢',
  jamaat:  '🔵',
  home:    '🟣',
  work:    '🟠',
  fire:    '🔥',
  star:    '⭐',
  good:    '🟢',
  warn:    '🟡',
  med:     '🟠',
  bad:     '🔴'
};

// ──────────────────────────────────────────────────────────
// TIER FORMATTERS
// ──────────────────────────────────────────────────────────

function tgFmtTier(score) {
  if (typeof score !== 'number') return '—';
  if (score >= 9)   return '🟢 Excellent';
  if (score >= 6)   return '🟡 Good';
  if (score >= 3)   return '🟠 Mediocre';
  if (score >= 0)   return '🔴 Poor';
  return '⚫ Critical';
}

function tgFmtScoreBar(score, max) {
  const m = max || 10;
  const pct = Math.max(0, Math.min(100, (score / m) * 100));
  return tgFmtBar(pct, 20) + '  ' + score.toFixed(1) + '/' + m;
}

// ──────────────────────────────────────────────────────────
// PRAYER LOCATION CODE → DISPLAY
// ──────────────────────────────────────────────────────────

function tgFmtLocation(code) {
  const map = {
    'M': 'Masjid',     'Masjid': 'Masjid',
    'J': 'Jamaat',     'Jamaat': 'Jamaat',
    'H': 'Home',       'Home': 'Home',
    'W': 'Work',       'Work': 'Work',
    'WU': 'Work·U',    'Work·U': 'Work·U',
    'HU': 'Home·U',    'Home·U': 'Home·U',
    'L': 'Late',       'Late': 'Late',
    'Q': 'Qaza',       'Qaza': 'Qaza',
    '': '—'
  };
  // Handle suffix variants (M⤴, M⤵, etc.)
  const trimmed = String(code || '').trim();
  if (map[trimmed]) return map[trimmed];
  // Check for jam' suffix
  const base = trimmed.replace(/[⤴⤵]$/, '');
  if (map[base]) {
    const suffix = trimmed.endsWith('⤴') ? ' ⤴' : (trimmed.endsWith('⤵') ? ' ⤵' : '');
    return map[base] + suffix;
  }
  return trimmed || '—';
}

// ──────────────────────────────────────────────────────────
// PRAYER LOCATION → SCORE
// ──────────────────────────────────────────────────────────

function tgFmtLocationScore(code) {
  const c = String(code || '').trim().replace(/[⤴⤵]$/, '');
  const scoreMap = {
    'M': 2.0, 'Masjid': 2.0,
    'J': 1.5, 'Jamaat': 1.5,
    'WU': 0.8, 'Work·U': 0.8, 'Work U': 0.8,
    'HU': 0.8, 'Home·U': 0.8, 'Home U': 0.8,
    'W': 0.5, 'Work': 0.5,
    'H': 0.5, 'Home': 0.5,
    'L': 0.3, 'Late': 0.3,
    'Q': -1.5, 'Qaza': -1.5
  };
  return scoreMap[c] !== undefined ? scoreMap[c] : 0;
}

// ──────────────────────────────────────────────────────────
// FORMATTED SCORE STRING (with sign)
// ──────────────────────────────────────────────────────────

function tgFmtScoreString(score) {
  if (typeof score !== 'number') return '0.0';
  if (score > 0) return '+' + score.toFixed(1);
  return score.toFixed(1);
}

// ──────────────────────────────────────────────────────────
// TIME FORMATTERS
// ──────────────────────────────────────────────────────────

function tgFmtTimeNow() {
  return Utilities.formatDate(new Date(), 'Asia/Karachi', 'HH:mm') + ' PKT';
}

function tgFmtDateNow() {
  return Utilities.formatDate(new Date(), 'Asia/Karachi', 'EEE, dd MMM yyyy');
}

function tgFmtFullDateTime() {
  return tgFmtDateNow() + '  ·  ' + tgFmtTimeNow();
}

// ──────────────────────────────────────────────────────────
// QUICK HELPERS — wrap text in HTML tags
// ──────────────────────────────────────────────────────────

function tgFmtBold(text) { return '<b>' + tgFmtEscape(text) + '</b>'; }
function tgFmtItalic(text) { return '<i>' + tgFmtEscape(text) + '</i>'; }
function tgFmtCode(text) { return '<code>' + tgFmtEscape(text) + '</code>'; }
function tgFmtPre(text) { return '<pre>' + tgFmtEscape(text) + '</pre>'; }
function tgFmtUnderline(text) { return '<u>' + tgFmtEscape(text) + '</u>'; }
function tgFmtStrike(text) { return '<s>' + tgFmtEscape(text) + '</s>'; }
function tgFmtSpoiler(text) { return '<tg-spoiler>' + tgFmtEscape(text) + '</tg-spoiler>'; }
function tgFmtLink(text, url) { 
  return '<a href="' + tgFmtEscape(url) + '">' + tgFmtEscape(text) + '</a>'; 
}

// ──────────────────────────────────────────────────────────
// MESSAGE TEMPLATES — common patterns
// ──────────────────────────────────────────────────────────

function tgFmtSuccess(action, details) {
  return tgFmtCard({
    emoji: '✅',
    title: action,
    rows: details || []
  });
}

function tgFmtError(message, hint) {
  let out = '<b>⚠️  ' + tgFmtEscape(message) + '</b>';
  if (hint) out += '\n\n<i>' + tgFmtEscape(hint) + '</i>';
  return out;
}

function tgFmtWarning(message) {
  return '<b>⚠️  ' + tgFmtEscape(message) + '</b>';
}

function tgFmtUsage(command, example) {
  return tgFmtCard({
    emoji: '💡',
    title: 'Usage',
    rows: [
      ['Command', command],
      ['Example', example]
    ]
  });
}

// ──────────────────────────────────────────────────────────
// TEST FUNCTION (for verification)
// ──────────────────────────────────────────────────────────

function testTgFmt() {
  const samples = {
    card: tgFmtCard({
      emoji: '✅', title: 'Asr logged',
      rows: [['Location', 'Work'], ['Time', '15:42 PKT'], ['Score', '+0.5']]
    }),
    section: tgFmtSection({
      emoji: '📊', title: 'Today so far',
      lines: ['Fajr     ✓ Masjid    +2.0', 'Dhuhr    ✓ Work·U    +0.8']
    }),
    error: tgFmtError('Unknown command', 'Type /help for the full list'),
    success: tgFmtSuccess('Weight logged', [['Value', '76.5 kg']]),
    bar: tgFmtBar(33, 20),
    tier: tgFmtTier(5.2),
    location: tgFmtLocation('M⤴'),
    timeNow: tgFmtTimeNow(),
    dateNow: tgFmtDateNow()
  };

  let out = '=== TG_FMT TEST OUTPUT ===\n\n';
  Object.keys(samples).forEach(k => {
    out += '--- ' + k + ' ---\n' + samples[k] + '\n\n';
  });
  Logger.log(out);
}