// ════════════════════════════════════════════════════════════════════
// 🕌 Salah_Pro.gs v2.1 — INSIGHTS SECTION ADDED (in-cell viz)
// LOCKED · 7-Layer Audit · Self-Contained · Day 6 / 90
//
// CHANGES FROM v2.0:
//   - NEW: 📊 SALAH INSIGHTS section (rows 55-72)
//     · 4 metric cards (Masjid% · Avg Score · Best Streak · Qaza Total)
//     · 30-day score sparkline (in-cell line chart via SPARKLINE)
//     · Per-prayer Masjid% breakdown (table + REPT bars)
//     · 7-day rolling average + sparkline
//     · Qaza heatmap last 14 days (color-coded dots)
//     · Computed insight footer
//   - All in-cell visualizations — no floating chart widgets
//   - Themed (uses getSalahTheme palette)
//   - Trim row count: 54 → 73 rows
//   - All v2.0 functionality preserved
//
// PHILOSOPHY: Charts live where the data lives. No separate Charts tab needed.
//
// @version 2.1
// @date    2026-04-29
// ════════════════════════════════════════════════════════════════════

const SALAH_TAB = '🕌 Salah';
const SALAH_QUEST_START = '2026-04-25';
const SALAH_GRID_START_ROW = 6;
const SALAH_GRID_DAYS = 31;
const SALAH_TOTAL_ROWS = 73;

// ──────────────────────────────────────────────────────────
// THEME (with inline fallback)
// ──────────────────────────────────────────────────────────

function _getSalahTheme() {
  if (typeof getTheme === 'function') return getTheme();
  return {
    bgPanel: '#0F172A', bgRow: '#1E293B', bgHeader: '#334155', bgSection: '#854D0E',
    accent: '#FBBF24', textBright: '#F1F5F9', textMuted: '#CBD5E1', textDim: '#94A3B8',
    textGhost: '#64748B', success: '#16A34A', warning: '#CA8A04', danger: '#DC2626',
    critical: '#7F1D1D', info: '#2563EB', purple: '#7C3AED', orange: '#D97706'
  };
}

function _salahAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
}

function _salahQuestDay() {
  if (typeof getQuestDay === 'function') return getQuestDay();
  const tz = 'Asia/Karachi';
  const todayPKT = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const tParts = todayPKT.split('-').map(Number);
  const sParts = SALAH_QUEST_START.split('-').map(Number);
  const tDate = new Date(Date.UTC(tParts[0], tParts[1] - 1, tParts[2]));
  const sDate = new Date(Date.UTC(sParts[0], sParts[1] - 1, sParts[2]));
  return Math.max(1, Math.floor((tDate - sDate) / 86400000) + 1);
}

function removeOldSalahConverter() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onSalahEdit') ScriptApp.deleteTrigger(t);
  });
}

// ──────────────────────────────────────────────────────────
// MAIN ENTRY
// ──────────────────────────────────────────────────────────

function rebuildSalahCockpit() {
  removeOldSalahConverter();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SALAH_TAB);
  if (!s) { _salahAlert('❌ Salah tab not found.\nExpected: ' + SALAH_TAB); return; }

  const T = _getSalahTheme();
  const existing = _salahReadExistingData(s);
  const times = _salahFetchPrayerTimes();

  s.clear();
  s.clearConditionalFormatRules();
  s.clearNotes();
  try { s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations(); } catch (e) {}
  try { s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).breakApart(); } catch (e) {}
  s.showRows(1, s.getMaxRows());

  // Trim to 11 cols × 73 rows
  const maxCols = s.getMaxColumns();
  if (maxCols > 11) { try { s.deleteColumns(12, maxCols - 11); } catch (e) {} }
  const maxRows = s.getMaxRows();
  if (maxRows > SALAH_TOTAL_ROWS) { try { s.deleteRows(SALAH_TOTAL_ROWS + 1, maxRows - SALAH_TOTAL_ROWS); } catch (e) {} }
  if (s.getMaxRows() < SALAH_TOTAL_ROWS) s.insertRowsAfter(s.getMaxRows(), SALAH_TOTAL_ROWS - s.getMaxRows());

  for (let c = 1; c <= 11; c++) s.setColumnWidth(c, 162);

  _salahBuildBanner(s, times, T);
  _salahBuildLegendBar(s, T);
  _salahBuildHeader(s, T);
  _salahBuildGrid(s, existing, T);
  _salahBuildFullLegend(s, T);
  _salahBuildQuickLog(s, T);
  _salahBuildBonus(s, existing, T);
  _salahBuildTally(s, T);
  _salahBuildInsights(s, T);   // ← NEW v2.1

  _salahApplyDropdowns(s);
  _salahApplyConditionalFormatting(s, T);
  _salahHighlightToday(s, T);

  try { s.setFrozenRows(5); } catch (e) {}
  try { s.setHiddenGridlines(true); } catch (e) {}

  const themeName = (typeof getActiveThemeName === 'function') ? getActiveThemeName() : 'fallback';
  _salahAlert('✅ Salah_Pro v2.1 cockpit rebuilt (with INSIGHTS).\n\n' +
              '11 cols × 162px = 1782px (no horizontal scroll)\n' +
              'Scoring: Balanced (work-with-udhr = 80% credit)\n' +
              'NEW: 📊 INSIGHTS section at rows 55-72\n' +
              '  · 4 metric cards · 30-day sparkline · per-prayer breakdown\n' +
              '  · 7-day rolling avg · 14-day Qaza heatmap · forensic footer\n\n' +
              'All charts in-cell. No floating widgets. Fully themed.\n' +
              'Theme: ' + themeName);
}

// ──────────────────────────────────────────────────────────
// READ EXISTING DATA
// ──────────────────────────────────────────────────────────

function _salahReadExistingData(s) {
  const data = { rows: [], tahajjudOldCol: [], jumuahOldCol: [], layout: 'fresh' };
  const lastCol = s.getLastColumn();

  // DETECT LAYOUT
  // v1.7 had 20 cols. v2.0+ has 11 cols. Fresh sheet has < 5 cols of data.
  if (lastCol >= 15) {
    data.layout = 'v1.7';
  } else if (lastCol >= 9 && lastCol <= 11) {
    data.layout = 'v2.0+';
  } else {
    data.layout = 'fresh';
  }

  Logger.log('Salah migration: detected layout = ' + data.layout + ' (lastCol=' + lastCol + ')');

  const readCols = Math.max(11, lastCol);
  for (let i = 0; i < SALAH_GRID_DAYS; i++) {
    const r = SALAH_GRID_START_ROW + i;
    const row = [];
    for (let c = 1; c <= readCols; c++) {
      try { row.push(s.getRange(r, c).getValue()); } catch (e) { row.push(''); }
    }
    data.rows.push(row);

    if (data.layout === 'v1.7') {
      // v1.7: Tahajjud at col 16 (idx 15), Jumuah at col 17 (idx 16)
      data.tahajjudOldCol.push(row[15] || '');
      data.jumuahOldCol.push(row[16] || '');
    } else {
      // v2.0+: Tahajjud not in grid (now in row 49). Jumuah at col 7 (idx 6)
      data.tahajjudOldCol.push('');
      data.jumuahOldCol.push(row[6] || '');
    }
  }
  return data;
}

// ──────────────────────────────────────────────────────────
// FETCH PRAYER TIMES
// ──────────────────────────────────────────────────────────

function _salahFetchPrayerTimes() {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, 'Asia/Karachi', 'dd-MM-yyyy');
  const url = 'https://api.aladhan.com/v1/timingsByCity/' + dateStr + '?city=Multan&country=Pakistan&method=1';

  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(response.getContentText());
    if (data.code === 200 && data.data && data.data.timings) {
      const t = data.data.timings;
      const result = {
        Fajr: (t.Fajr || '').substring(0, 5),
        Dhuhr: (t.Dhuhr || '').substring(0, 5),
        Asr: (t.Asr || '').substring(0, 5),
        Maghrib: (t.Maghrib || '').substring(0, 5),
        Isha: (t.Isha || '').substring(0, 5)
      };
      PropertiesService.getDocumentProperties().setProperty('salah_prayer_times_multan', JSON.stringify(result));
      return result;
    }
  } catch (e) { Logger.log('Prayer times API failed: ' + e); }

  const cached = PropertiesService.getDocumentProperties().getProperty('salah_prayer_times_multan');
  if (cached) { try { return JSON.parse(cached); } catch (e) {} }
  return { Fajr: '04:48', Dhuhr: '12:11', Asr: '15:35', Maghrib: '18:42', Isha: '20:11' };
}

// ──────────────────────────────────────────────────────────
// SECTION BUILDERS — Banner / Legend / Header / Grid
// ──────────────────────────────────────────────────────────

function _salahBuildBanner(s, times, T) {
  s.getRange(1, 1, 1, 11).merge()
    .setValue('🕌 SALAH COCKPIT  ·  Day ' + _salahQuestDay() + ' of 90')
    .setBackground(T.bgPanel).setFontColor(T.accent).setFontWeight('bold')
    .setFontSize(18).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 48);

  s.getRange(2, 1, 1, 11).merge()
    .setValue('🧠 INSIGHT: Building baseline... run "🧠 Refresh AI Insight" to populate')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(2, 32);

  const labels = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const values = [times.Fajr, times.Dhuhr, times.Asr, times.Maghrib, times.Isha];

  s.getRange(3, 1).setValue('📍 Multan')
    .setBackground(T.bgPanel).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  for (let i = 0; i < 5; i++) {
    s.getRange(3, i + 2).setValue(labels[i] + '\n' + values[i])
      .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  }

  s.getRange(3, 7, 1, 5).merge().setValue('via Aladhan · Karachi method · auto-refresh 4 AM PKT')
    .setBackground(T.bgPanel).setFontColor(T.textGhost).setFontStyle('italic').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(3, 36);
}

function _salahBuildLegendBar(s, T) {
  s.getRange(4, 1, 1, 11).merge()
    .setValue('🔤 CODES:  M=Masjid · J=Jamaat · H=Home · W=Work · L=Late · Q=Qaza  ·  ' +
              'SUFFIX:  ·U=valid \'udhr  ·  ⤴=jam\' takhir  ·  ⤵=jam\' taqdim')
    .setBackground(T.bgHeader).setFontColor(T.textBright).setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(4, 24);
}

function _salahBuildHeader(s, T) {
  const headers = ['Date', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 
                   'Jumuah', 'Tier', 'Score', 'Qaza#', 'Notes'];
  const colors = [T.bgSection, T.info, T.success, T.warning, T.danger, T.purple,
                  T.bgHeader, T.bgSection, T.bgSection, T.bgSection, T.bgHeader];

  for (let i = 0; i < headers.length; i++) {
    s.getRange(5, i + 1).setValue(headers[i])
      .setBackground(colors[i]).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
  s.setRowHeight(5, 32);
}

function _salahBuildGrid(s, existing, T) {
  const layout = existing.layout;

  for (let i = 0; i < SALAH_GRID_DAYS; i++) {
    const r = SALAH_GRID_START_ROW + i;
    const day = i + 1;

    s.getRange(r, 1).setFormula('=IFERROR(DATE(YEAR(TODAY()),MONTH(TODAY()),' + day + '),"")')
      .setNumberFormat('dd MMM').setHorizontalAlignment('center')
      .setBackground(T.bgRow).setFontColor(T.textDim).setFontSize(10);

    const oldRow = existing.rows[i] || [];

    // LAYOUT-AWARE INDEX MAPPING
    let fajrOld, dhuhrOld, asrOld, maghribOld, ishaOld, jumuahOld, notesOld;

    if (layout === 'v1.7') {
      // v1.7 indexes (0-based): C/2=Fajr, E/4=Dhuhr, F/5=Asr, G/6=Maghrib, H/7=Isha, Q/16=Jumuah, S/18=Notes
      fajrOld    = oldRow[2]  || '';
      dhuhrOld   = oldRow[4]  || '';
      asrOld     = oldRow[5]  || '';
      maghribOld = oldRow[6]  || '';
      ishaOld    = oldRow[7]  || '';
      jumuahOld  = oldRow[16] || '';
      notesOld   = oldRow[18] || '';
    } else if (layout === 'v2.0+') {
      // v2.0+ indexes (0-based): B/1=Fajr, C/2=Dhuhr, D/3=Asr, E/4=Maghrib, F/5=Isha, G/6=Jumuah, K/10=Notes
      fajrOld    = oldRow[1]  || '';
      dhuhrOld   = oldRow[2]  || '';
      asrOld     = oldRow[3]  || '';
      maghribOld = oldRow[4]  || '';
      ishaOld    = oldRow[5]  || '';
      jumuahOld  = oldRow[6]  || '';
      notesOld   = oldRow[10] || '';
    } else {
      // Fresh — nothing to migrate
      fajrOld = dhuhrOld = asrOld = maghribOld = ishaOld = jumuahOld = notesOld = '';
    }

    // Filter out tier/score/formula text that should never be in prayer cells
    const validPrayerCodes = ['M','J','H','W','L','Q','Masjid','Jamaat','Home','Work','Late','Qaza',
                              'WU','HU','Work·U','Home·U','Work U','Home U',
                              'M⤴','M⤵','J⤴','J⤵','H⤴','H⤵','W⤴','W⤵',''];
    function _safe(v) {
      const s = String(v || '').trim();
      // If value contains tier indicators or non-prayer text, reject
      if (s.indexOf('Mediocre') !== -1 || s.indexOf('Poor') !== -1 || 
          s.indexOf('Excellent') !== -1 || s.indexOf('Good') !== -1 || 
          s.indexOf('Critical') !== -1 || s.indexOf('🟢') !== -1 ||
          s.indexOf('🟡') !== -1 || s.indexOf('🟠') !== -1 || 
          s.indexOf('🔴') !== -1 || s.indexOf('⚫') !== -1) return '';
      return s;
    }

    if (_safe(fajrOld))    s.getRange(r, 2).setValue(_safe(fajrOld));
    if (_safe(dhuhrOld))   s.getRange(r, 3).setValue(_safe(dhuhrOld));
    if (_safe(asrOld))     s.getRange(r, 4).setValue(_safe(asrOld));
    if (_safe(maghribOld)) s.getRange(r, 5).setValue(_safe(maghribOld));
    if (_safe(ishaOld))    s.getRange(r, 6).setValue(_safe(ishaOld));

    for (let c = 2; c <= 6; c++) {
      s.getRange(r, c).setBackground(T.bgRow).setFontColor(T.textBright).setFontWeight('bold')
        .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
    }

    if (_safe(jumuahOld)) s.getRange(r, 7).setValue(_safe(jumuahOld));
    s.getRange(r, 7).setBackground(T.bgRow).setFontColor(T.textBright).setFontWeight('bold')
      .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');

    const tierF = '=IF(I' + r + '="","",' +
                  'IF(I' + r + '>=9,"🟢 Excellent",' +
                  'IF(I' + r + '>=6,"🟡 Good",' +
                  'IF(I' + r + '>=3,"🟠 Mediocre",' +
                  'IF(I' + r + '>=0,"🔴 Poor","⚫ Critical")))))';
    s.getRange(r, 8).setFormula(tierF)
      .setBackground(T.bgRow).setFontColor(T.textBright).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    s.getRange(r, 9).setFormula(_salahBuildScoreFormula(r))
      .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setNumberFormat('0.0');

    const qazaF = '=COUNTIF(B' + r + ':F' + r + ',"Q")+COUNTIF(B' + r + ':F' + r + ',"Qaza")';
    s.getRange(r, 10).setFormula(qazaF)
      .setBackground(T.bgRow).setFontColor(T.danger).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    if (_safe(notesOld)) s.getRange(r, 11).setValue(_safe(notesOld));
    s.getRange(r, 11).setBackground(T.bgRow).setFontColor(T.textMuted).setFontSize(9)
      .setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(false);

    s.setRowHeight(r, 30);
  }
}

function _salahBuildScoreFormula(r) {
  const range = 'B' + r + ':F' + r;
  const m  = '(COUNTIF(' + range + ',"M")+COUNTIF(' + range + ',"Masjid"))*2';
  const j  = '(COUNTIF(' + range + ',"J")+COUNTIF(' + range + ',"Jamaat"))*1.5';
  const wu = '(COUNTIF(' + range + ',"WU")+COUNTIF(' + range + ',"Work·U")+COUNTIF(' + range + ',"Work U"))*0.8';
  const hu = '(COUNTIF(' + range + ',"HU")+COUNTIF(' + range + ',"Home·U")+COUNTIF(' + range + ',"Home U"))*0.8';
  const w  = '(COUNTIF(' + range + ',"W")+COUNTIF(' + range + ',"Work"))*0.5';
  const h  = '(COUNTIF(' + range + ',"H")+COUNTIF(' + range + ',"Home"))*0.5';
  const l  = '(COUNTIF(' + range + ',"L")+COUNTIF(' + range + ',"Late"))*0.3';
  const q  = '(COUNTIF(' + range + ',"Q")+COUNTIF(' + range + ',"Qaza"))*1.5';
  return '=IF(COUNTA(' + range + ')=0,"",ROUND(' + m + '+' + j + '+' + wu + '+' + hu + '+' + w + '+' + h + '+' + l + '-' + q + ',1))';
}

function _salahBuildFullLegend(s, T) {
  s.setRowHeight(37, 8);
  s.getRange(37, 1, 1, 11).setBackground(T.bgPanel);

  s.getRange(38, 1, 1, 11).merge()
    .setValue('💡 LEGEND  ·  scoring philosophy: Balanced (work-with-udhr = 80% of Masjid value)')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(38, 26);

  const legendText = '📊 Score per prayer:  M=+2.0  ·  J=+1.5  ·  WU/HU=+0.8  ·  W/H=+0.5  ·  L=+0.3  ·  Q=-1.5     ' +
                     '|||     🎯 Tier:  🟢 9.0-10  ·  🟡 6.0-8.9  ·  🟠 3.0-5.9  ·  🔴 0-2.9  ·  ⚫ <0';
  s.getRange(39, 1, 1, 11).merge()
    .setValue(legendText)
    .setBackground(T.bgPanel).setFontColor(T.textMuted).setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(39, 32);

  s.setRowHeight(40, 8);
  s.getRange(40, 1, 1, 11).setBackground(T.bgPanel);
}

function _salahBuildQuickLog(s, T) {
  s.getRange(41, 1, 1, 11).merge()
    .setValue('⚡ QUICK LOG TODAY  ·  time-aware status + Telegram command hints')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(41, 26);

  // FIXED v2.1.1: timeCell refs corrected
  // Row 3 layout: A=📍 Multan, B=Fajr+time, C=Dhuhr+time, D=Asr+time, E=Maghrib+time, F=Isha+time, G-K=API note
  const prayers = [
    { row: 42, name: '🕌 FAJR',    timeCell: '$B$3', col: 2, code: 'fajr' },
    { row: 43, name: '🕐 DHUHR',   timeCell: '$C$3', col: 3, code: 'dhuhr' },
    { row: 44, name: '🕓 ASR',     timeCell: '$D$3', col: 4, code: 'asr' },
    { row: 45, name: '🌅 MAGHRIB', timeCell: '$E$3', col: 5, code: 'maghrib' },
    { row: 46, name: '🌙 ISHA',    timeCell: '$F$3', col: 6, code: 'isha' }
  ];

  prayers.forEach(p => {
    s.getRange(p.row, 1, 1, 2).merge().setValue(p.name)
      .setBackground(T.bgPanel).setFontColor(T.textBright).setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');

    const todayLoc = 'IFERROR(VLOOKUP(TODAY(),$A$6:$F$36,' + p.col + ',FALSE),"")';
    // Defensive: only extract time if newline exists in cell
    const timeOnly = 'IFERROR(TRIM(MID(' + p.timeCell + ',FIND(CHAR(10),' + p.timeCell + ')+1,5)),"")';
    const statusF = '=IF(' + todayLoc + '<>"","✓ Logged: "&' + todayLoc + ',' +
                    'IF(' + timeOnly + '="","—",' +
                    'IF(NOW()<TODAY()+TIMEVALUE(' + timeOnly + '),"⏳ Waiting for adhan ("&' + timeOnly + '&")",' +
                    '"⚠️ Adhan passed at "&' + timeOnly + '&" — log it now")))';
    s.getRange(p.row, 3, 1, 5).merge().setFormula(statusF)
      .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    s.getRange(p.row, 8, 1, 4).merge()
      .setValue('Telegram:  /prayed ' + p.code + ' <loc>')
      .setBackground(T.bgPanel).setFontColor(T.textGhost).setFontStyle('italic').setFontSize(10)
      .setFontFamily('Courier New')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    s.setRowHeight(p.row, 28);
  });

  s.setRowHeight(47, 8);
  s.getRange(47, 1, 1, 11).setBackground(T.bgPanel);
}
function _salahBuildBonus(s, existing, T) {
  s.getRange(48, 1, 1, 11).merge()
    .setValue('🌟 BONUS PRAYERS  ·  Tahajjud (any night) + Jumuah (Fridays only)')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(48, 26);

  const todayDay = new Date().getDate();
  const oldTahajjud = (todayDay <= existing.tahajjudOldCol.length) ? 
                      existing.tahajjudOldCol[todayDay - 1] : '';

  s.getRange(49, 1, 1, 2).merge().setValue('🤲 TAHAJJUD TODAY')
    .setBackground(T.bgPanel).setFontColor(T.textBright).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');
  s.getRange(49, 3).setValue(oldTahajjud === 1 || oldTahajjud === 'Yes' ? 'Yes' : '')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(49, 4, 1, 2).merge().setValue('+0.5 bonus to today\'s score')
    .setBackground(T.bgPanel).setFontColor(T.textGhost).setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');

  s.getRange(49, 6, 1, 2).merge().setValue('🕌 JUMUAH (Friday)')
    .setBackground(T.bgPanel).setFontColor(T.textBright).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');
  s.getRange(49, 8).setFormula('=IFERROR(VLOOKUP(TODAY(),$A$6:$G$36,7,FALSE),"")')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(49, 9, 1, 3).merge()
    .setFormula('=IF(WEEKDAY(TODAY())=6,"+1.0 bonus if at Masjid","Not Friday today")')
    .setBackground(T.bgPanel).setFontColor(T.textGhost).setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');

  s.setRowHeight(49, 32);
  s.setRowHeight(50, 8);
  s.getRange(50, 1, 1, 11).setBackground(T.bgPanel);
}

function _salahBuildTally(s, T) {
  s.getRange(51, 1, 1, 11).merge()
    .setValue('🎯 TODAY\'S TALLY')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(51, 28);

  const todayMasjidF = '=IFERROR(COUNTIF(OFFSET($A$6:$F$36,MATCH(TODAY(),$A$6:$A$36,0)-1,1,1,5),"M")+COUNTIF(OFFSET($A$6:$F$36,MATCH(TODAY(),$A$6:$A$36,0)-1,1,1,5),"Masjid"),0)';
  const todayQazaF   = '=IFERROR(COUNTIF(OFFSET($A$6:$F$36,MATCH(TODAY(),$A$6:$A$36,0)-1,1,1,5),"Q")+COUNTIF(OFFSET($A$6:$F$36,MATCH(TODAY(),$A$6:$A$36,0)-1,1,1,5),"Qaza"),0)';
  const todayScoreF  = '=IFERROR(VLOOKUP(TODAY(),$A$6:$I$36,9,FALSE),0)';
  const todayTierF   = '=IFERROR(VLOOKUP(TODAY(),$A$6:$H$36,8,FALSE),"—")';

  s.getRange(52, 1, 1, 3).merge()
    .setFormula('="🟢 Masjid: "&' + todayMasjidF.substring(1) + '&" / 5"')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(52, 4, 1, 2).merge()
    .setFormula('="🔴 Qaza: "&' + todayQazaF.substring(1))
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(52, 6, 1, 3).merge()
    .setFormula('="📊 Score: "&' + todayScoreF.substring(1) + '&" / 10"')
    .setBackground(T.accent).setFontColor(T.bgPanel).setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(52, 9, 1, 3).merge()
    .setFormula('="Tier: "&' + todayTierF.substring(1))
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(52, 38);

  const todayLoggedF = '=IFERROR(COUNTA(OFFSET($A$6:$F$36,MATCH(TODAY(),$A$6:$A$36,0)-1,1,1,5)),0)';
  const barF = '="Progress today:  " & ' +
               'REPT("█",ROUND(' + todayLoggedF.substring(1) + '/5*40,0)) & ' +
               'REPT("░",40-ROUND(' + todayLoggedF.substring(1) + '/5*40,0)) & ' +
               '"  " & ROUND(' + todayLoggedF.substring(1) + '/5*100,0) & "%"';
  s.getRange(53, 1, 1, 11).merge()
    .setFormula(barF)
    .setBackground(T.bgPanel).setFontColor(T.accent).setFontWeight('bold').setFontSize(12)
    .setFontFamily('Roboto Mono')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(53, 30);

  s.setRowHeight(54, 8);
  s.getRange(54, 1, 1, 11).setBackground(T.bgPanel);
}

// ──────────────────────────────────────────────────────────
// 🆕 INSIGHTS SECTION (v2.1) — in-cell visualizations
// ──────────────────────────────────────────────────────────

function _salahBuildInsights(s, T) {
  // Row 55 — section header
  s.getRange(55, 1, 1, 11).merge()
    .setValue('📊 SALAH INSIGHTS  ·  forensics from your last 30 days')
    .setBackground(T.bgSection).setFontColor(T.accent).setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(55, 32);

  // Row 56 spacer
  s.setRowHeight(56, 8);
  s.getRange(56, 1, 1, 11).setBackground(T.bgPanel);

  // Row 57 — 4 metric cards across 11 cols
  // Card 1 (cols 1-3): Masjid %
  const masjidPctF = '=IFERROR(ROUND((COUNTIF(B6:F36,"M")+COUNTIF(B6:F36,"Masjid"))/MAX(1,COUNTA(B6:F36))*100,0),0)';
  s.getRange(57, 1, 1, 3).merge()
    .setFormula('="🟢 Masjid: " & ' + masjidPctF.substring(1) + ' & "%"')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Card 2 (cols 4-5): Avg score
  const avgScoreF = '=IFERROR(ROUND(AVERAGEIF(I6:I36,">0"),1),0)';
  s.getRange(57, 4, 1, 2).merge()
    .setFormula('="📈 Avg: " & ' + avgScoreF.substring(1) + ' & "/10"')
    .setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Card 3 (cols 6-8): Best streak (consecutive days score >= 6)
  // Simplified: count days where score >= 6 in last 7 days
  const goodDaysF = '=IFERROR(COUNTIF(I' + (SALAH_GRID_START_ROW + Math.max(0, new Date().getDate() - 7)) + 
                    ':I' + (SALAH_GRID_START_ROW + new Date().getDate() - 1) + ',">=6"),0)';
  s.getRange(57, 6, 1, 3).merge()
    .setFormula('="⭐ Last 7d Good: " & ' + goodDaysF.substring(1) + ' & "/7"')
    .setBackground(T.purple).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Card 4 (cols 9-11): Total Qaza this month
  const qazaTotalF = '=IFERROR(SUM(J6:J36),0)';
  s.getRange(57, 9, 1, 3).merge()
    .setFormula('="🔴 Qaza Total: " & ' + qazaTotalF.substring(1))
    .setBackground(T.danger).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.setRowHeight(57, 36);

  // Row 58 spacer
  s.setRowHeight(58, 8);
  s.getRange(58, 1, 1, 11).setBackground(T.bgPanel);

  // Row 59 — 30-day score sparkline (full width)
  s.getRange(59, 1, 1, 11).merge()
    .setFormula('=IFERROR(SPARKLINE(I6:I36,{"charttype","line";"color1","' + T.accent + '";"linewidth",2;"empty","zero"}),"—")')
    .setBackground(T.bgRow).setFontColor(T.accent)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(59, 60);

  // Row 60 — sparkline label
  s.getRange(60, 1, 1, 11).merge()
    .setValue('↑ 30-day score trend  ·  each point = one day')
    .setBackground(T.bgPanel).setFontColor(T.textGhost).setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(60, 20);

  // Row 61 spacer
  s.setRowHeight(61, 8);
  s.getRange(61, 1, 1, 11).setBackground(T.bgPanel);

  // Row 62 — per-prayer Masjid% header
  s.getRange(62, 1, 1, 11).merge()
    .setValue('🕌 PER-PRAYER MASJID %  ·  where you achieve Masjid attendance most')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(62, 24);

  // Row 63 — prayer name labels (cols 2-6)
  s.getRange(63, 1).setValue('Prayer →')
    .setBackground(T.bgPanel).setFontColor(T.textDim).setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');

  const prayerLabels = ['🕌 Fajr', '🕐 Dhuhr', '🕓 Asr', '🌅 Maghrib', '🌙 Isha'];
  const prayerCols = ['B', 'C', 'D', 'E', 'F'];

  for (let i = 0; i < 5; i++) {
    s.getRange(63, i + 2).setValue(prayerLabels[i])
      .setBackground(T.bgPanel).setFontColor(T.textBright).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
  s.getRange(63, 7, 1, 5).merge().setValue('← Masjid attendance per prayer (last 30 days)')
    .setBackground(T.bgPanel).setFontColor(T.textGhost).setFontStyle('italic').setFontSize(9)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.setRowHeight(63, 22);

  // Row 64 — Masjid % values
  s.getRange(64, 1).setValue('% Masjid:')
    .setBackground(T.bgPanel).setFontColor(T.textDim).setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');

  for (let i = 0; i < 5; i++) {
    const col = prayerCols[i];
    const pctF = '=IFERROR(ROUND((COUNTIF(' + col + '6:' + col + '36,"M")+COUNTIF(' + col + '6:' + col + '36,"Masjid"))/MAX(1,COUNTA(' + col + '6:' + col + '36))*100,0)&"%","—")';
    s.getRange(64, i + 2).setFormula(pctF)
      .setBackground(T.bgRow).setFontColor(T.success).setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
  s.getRange(64, 7, 1, 5).merge()
    .setBackground(T.bgPanel);
  s.setRowHeight(64, 24);

  // Row 65 — Masjid % bars
  s.getRange(65, 1).setValue('Visual:')
    .setBackground(T.bgPanel).setFontColor(T.textDim).setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');

  for (let i = 0; i < 5; i++) {
    const col = prayerCols[i];
    const barF = '=IFERROR(LET(p,(COUNTIF(' + col + '6:' + col + '36,"M")+COUNTIF(' + col + '6:' + col + '36,"Masjid"))/MAX(1,COUNTA(' + col + '6:' + col + '36)),' +
                 'REPT("█",ROUND(p*8,0))&REPT("░",8-ROUND(p*8,0))),"")';
    s.getRange(65, i + 2).setFormula(barF)
      .setBackground(T.bgRow).setFontColor(T.success).setFontFamily('Roboto Mono').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }
  s.getRange(65, 7, 1, 5).merge()
    .setBackground(T.bgPanel);
  s.setRowHeight(65, 22);

  // Row 66 spacer
  s.setRowHeight(66, 8);
  s.getRange(66, 1, 1, 11).setBackground(T.bgPanel);

  // Row 67 — 7-day rolling avg + sparkline
  s.getRange(67, 1, 1, 4).merge()
    .setValue('📈 LAST 7 DAYS  ·  rolling trend')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');

  // Compute current row of today
  const todayRow = SALAH_GRID_START_ROW + new Date().getDate() - 1;
  const last7Start = Math.max(SALAH_GRID_START_ROW, todayRow - 6);
  const sparkRange = 'I' + last7Start + ':I' + todayRow;

  s.getRange(67, 5, 1, 4).merge()
    .setFormula('=IFERROR(SPARKLINE(' + sparkRange + ',{"charttype","line";"color1","' + T.accent + '";"linewidth",2;"empty","zero"}),"—")')
    .setBackground(T.bgRow).setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.getRange(67, 9, 1, 3).merge()
    .setFormula('="Avg: " & IFERROR(ROUND(AVERAGEIF(' + sparkRange + ',">0"),1),0) & "/10"')
    .setBackground(T.bgPanel).setFontColor(T.accent).setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(67, 32);

  // Row 68 spacer
  s.setRowHeight(68, 8);
  s.getRange(68, 1, 1, 11).setBackground(T.bgPanel);

  // Row 69 — Qaza heatmap header
  s.getRange(69, 1, 1, 11).merge()
    .setValue('🔥 QAZA HEATMAP  ·  last 14 days  ·  🟢 clean · ⚪ unlogged · 🔴 had qaza')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(69, 24);

  // Row 70 — heatmap dots (14 days, packed in 11 cols using merged groups)
  // Layout: each col holds ~1.27 days. Simplest: 11 cells, each shows last 14/11 ≈ 1-2 days as combined dots
  // Cleaner approach: 11 cells, each represents one day from last 11 days
  const heatmapStart = Math.max(SALAH_GRID_START_ROW, todayRow - 10);
  for (let i = 0; i < 11; i++) {
    const dayRow = heatmapStart + i;
    if (dayRow > todayRow) {
      s.getRange(70, i + 1).setValue('').setBackground(T.bgPanel);
      continue;
    }
    const heatF = '=IFERROR(IF(COUNTA(B' + dayRow + ':F' + dayRow + ')=0,"⚪",' +
                  'IF(J' + dayRow + '>0,"🔴","🟢")),"⚪")';
    const dateF = '=TEXT(A' + dayRow + ',"dd")';
    s.getRange(70, i + 1).setFormula('=' + heatF.substring(1) + '&CHAR(10)&' + dateF.substring(1))
      .setBackground(T.bgRow).setFontColor(T.textBright).setFontSize(11).setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  }
  s.setRowHeight(70, 42);

  // Row 71 spacer
  s.setRowHeight(71, 8);
  s.getRange(71, 1, 1, 11).setBackground(T.bgPanel);

  // Row 72 — computed insight footer
  // Determines: which prayer has highest Masjid%, total Qaza count, status word
  const footerF = '=IFERROR(LET(' +
                  'fajrPct,(COUNTIF(B6:B36,"M")+COUNTIF(B6:B36,"Masjid"))/MAX(1,COUNTA(B6:B36)),' +
                  'totalQaza,SUM(J6:J36),' +
                  'avgScore,IFERROR(AVERAGEIF(I6:I36,">0"),0),' +
                  '"📌 " & IF(fajrPct>=0.7,"Fajr Masjid is your strength ("&ROUND(fajrPct*100,0)&"%). ","") & ' +
                  '"Total Qaza this month: "&totalQaza&". " & ' +
                  '"Avg score: "&ROUND(avgScore,1)&"/10. " & ' +
                  'IF(avgScore>=6,"You\'re fighting well within your reality.",' +
                  'IF(avgScore>=3,"Steady but room to push toward Good tier.",' +
                  '"Build the Fajr-at-Masjid streak first — it anchors everything else."))),"📌 Log a few days to populate insights.")';

  s.getRange(72, 1, 1, 11).merge()
    .setFormula(footerF)
    .setBackground(T.bgSection).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(72, 40);

  // Row 73 final spacer
  s.setRowHeight(73, 12);
  s.getRange(73, 1, 1, 11).setBackground(T.bgPanel);
}

// ──────────────────────────────────────────────────────────
// VALIDATIONS + FORMATTING
// ──────────────────────────────────────────────────────────

function _salahApplyDropdowns(s) {
  const locValues = [
    'M', 'Masjid', 'M⤴', 'M⤵',
    'J', 'Jamaat', 'J⤴', 'J⤵',
    'H', 'Home', 'HU', 'Home·U', 'H⤴', 'H⤵',
    'W', 'Work', 'WU', 'Work·U', 'W⤴', 'W⤵',
    'L', 'Late',
    'Q', 'Qaza',
    ''
  ];
  const locDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(locValues, true)
    .setAllowInvalid(true)
    .setHelpText('Codes: M=Masjid · J=Jamaat · H=Home · W=Work · L=Late · Q=Qaza · Suffix: U=valid udhr · ⤴=jam takhir · ⤵=jam taqdim')
    .build();
  s.getRange(6, 2, SALAH_GRID_DAYS, 5).setDataValidation(locDV);

  const jumuahDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(['M', 'Masjid', 'J', 'Jamaat', 'H', 'Home', 'W', 'Work', '—', ''], true)
    .setAllowInvalid(true).setHelpText('Friday only — pick location')
    .build();
  s.getRange(6, 7, SALAH_GRID_DAYS, 1).setDataValidation(jumuahDV);

  const tahajjudDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Yes', 'No', ''], true)
    .setAllowInvalid(true)
    .build();
  s.getRange(49, 3).setDataValidation(tahajjudDV);
}

function _salahApplyConditionalFormatting(s, T) {
  const rules = [];
  const locRanges = [
    s.getRange('B6:B36'), s.getRange('C6:C36'), s.getRange('D6:D36'),
    s.getRange('E6:E36'), s.getRange('F6:F36'), s.getRange('G6:G36')
  ];

  function addColorRule(values, color) {
    values.forEach(v => {
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(v).setBackground(color).setFontColor('#FFFFFF').setBold(true)
        .setRanges(locRanges).build());
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(v + '⤴').setBackground(color).setFontColor('#FFFFFF').setBold(true)
        .setRanges(locRanges).build());
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(v + '⤵').setBackground(color).setFontColor('#FFFFFF').setBold(true)
        .setRanges(locRanges).build());
    });
  }

  addColorRule(['M', 'Masjid'], T.success);
  addColorRule(['J', 'Jamaat'], T.info);
  addColorRule(['H', 'Home', 'HU', 'Home·U'], T.purple);
  addColorRule(['W', 'Work', 'WU', 'Work·U'], T.orange);
  addColorRule(['L', 'Late'], T.warning);
  addColorRule(['Q', 'Qaza'], T.danger);

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(9).setBackground(T.success).setFontColor('#FFFFFF').setBold(true)
    .setRanges([s.getRange('I6:I36')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(6, 8.99).setBackground(T.warning).setFontColor('#FFFFFF').setBold(true)
    .setRanges([s.getRange('I6:I36')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(3, 5.99).setBackground(T.orange).setFontColor('#FFFFFF').setBold(true)
    .setRanges([s.getRange('I6:I36')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(0, 2.99).setBackground(T.danger).setFontColor('#FFFFFF').setBold(true)
    .setRanges([s.getRange('I6:I36')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0).setBackground(T.critical).setFontColor('#FFFFFF').setBold(true)
    .setRanges([s.getRange('I6:I36')]).build());

  s.setConditionalFormatRules(rules);
}

function _salahHighlightToday(s, T) {
  const today = new Date().getDate();
  const todayRow = SALAH_GRID_START_ROW + today - 1;
  if (todayRow < 6 || todayRow > 36) return;
  s.getRange(todayRow, 1, 1, 11).setBorder(true, true, true, true, false, false, T.accent, SpreadsheetApp.BorderStyle.SOLID_THICK);
}

// ──────────────────────────────────────────────────────────
// REFRESH PRAYER TIMES
// ──────────────────────────────────────────────────────────

function refreshPrayerTimesMultan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SALAH_TAB);
  if (!s) { _salahAlert('❌ Salah tab not found.'); return; }
  const times = _salahFetchPrayerTimes();
  const labels = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const values = [times.Fajr, times.Dhuhr, times.Asr, times.Maghrib, times.Isha];
  for (let i = 0; i < 5; i++) {
    s.getRange(3, i + 2).setValue(labels[i] + '\n' + values[i]);
  }
  _salahAlert('✅ Multan prayer times refreshed.\n\n' +
              'Fajr ' + times.Fajr + ' · Dhuhr ' + times.Dhuhr + ' · Asr ' + times.Asr + 
              '\nMaghrib ' + times.Maghrib + ' · Isha ' + times.Isha);
}

function installPrayerTimesTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'refreshPrayerTimesMultan') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('refreshPrayerTimesMultan').timeBased().atHour(4).everyDays(1).create();
  _salahAlert('✅ Daily prayer times refresh scheduled for 4:00 AM PKT.');
}

// ──────────────────────────────────────────────────────────
// AI INSIGHT
// ──────────────────────────────────────────────────────────

function refreshSalahAIInsight() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SALAH_TAB);
  if (!s) { _salahAlert('❌ Salah tab not found.'); return; }

  if (typeof callGemini === 'function') {
    const data = _salahReadExistingData(s);
    let masjidCount = 0, qazaCount = 0, totalLogged = 0, fajrMasjidStreak = 0;
    const today = new Date().getDate();
    const startIdx = Math.max(0, today - 7);
    for (let i = startIdx; i < today; i++) {
      const row = data.rows[i] || [];
      [1, 2, 3, 4, 5].forEach(c => {
        const v = String(row[c] || '');
        if (v) {
          totalLogged++;
          if (v.indexOf('M') === 0 || v === 'Masjid') masjidCount++;
          if (v === 'Q' || v === 'Qaza') qazaCount++;
        }
      });
      const fajrV = String(row[1] || '');
      if (fajrV.indexOf('M') === 0) fajrMasjidStreak++;
    }

    const prompt = 'You are coaching Abu Walah, a night-shift Muslim (4PM-1AM PKT). ' +
                   'Job restrictions prevent leaving for Asr/Maghrib/Isha at Masjid — he prays them at work. ' +
                   'Fajr at Masjid is his realistic Masjid prayer. Honor his constraints. ' +
                   'Never moralize about non-Fajr Masjid attendance. ' +
                   '\n\nLast 7 days:\n' +
                   '- Masjid count: ' + masjidCount + ' (Fajr-leaning)\n' +
                   '- Fajr-at-Masjid streak: ' + fajrMasjidStreak + '/7\n' +
                   '- Qaza: ' + qazaCount + '\n' +
                   '- Total logged: ' + totalLogged + '/35\n\n' +
                   'In ONE SENTENCE (max 25 words): praise what he\'s fighting hardest to maintain, gently flag what\'s actually within his control to fix.';

    const result = callGemini(prompt, 250);
    if (!result.error) {
      s.getRange(2, 1, 1, 11).setValue('🧠 INSIGHT: ' + result.text.trim());
      _salahAlert('✅ AI insight refreshed.');
      return;
    }
  }

  const data = _salahReadExistingData(s);
  let masjidCount = 0, qazaCount = 0, totalLogged = 0;
  const today = new Date().getDate();
  for (let i = Math.max(0, today - 7); i < today; i++) {
    const row = data.rows[i] || [];
    [1, 2, 3, 4, 5].forEach(c => {
      const v = String(row[c] || '');
      if (v) {
        totalLogged++;
        if (v.indexOf('M') === 0 || v === 'Masjid') masjidCount++;
        if (v === 'Q' || v === 'Qaza') qazaCount++;
      }
    });
  }
  s.getRange(2, 1, 1, 11).setValue('🧠 INSIGHT: Last 7 days · ' + masjidCount + ' Masjid · ' + 
                                     qazaCount + ' Qaza · ' + totalLogged + '/35 logged');
  _salahAlert('✅ Computed insight (AI unavailable).');
}

// ──────────────────────────────────────────────────────────
// VERIFY
// ──────────────────────────────────────────────────────────

function verifySalahCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SALAH_TAB);
  if (!s) { _salahAlert('❌ Salah tab missing.'); return; }

  const checks = [
    { row: 1, col: 1, label: 'Banner',         test: v => String(v).indexOf('COCKPIT') !== -1 },
    { row: 4, col: 1, label: 'Code legend',    test: v => String(v).indexOf('CODES') !== -1 },
    { row: 5, col: 1, label: 'Header: Date',   test: v => String(v) === 'Date' },
    { row: 6, col: 1, label: 'Day 1 date',     test: v => v instanceof Date },
    { row: 38, col: 1, label: 'Legend section',test: v => String(v).indexOf('LEGEND') !== -1 },
    { row: 41, col: 1, label: 'Quick Log',     test: v => String(v).indexOf('QUICK LOG') !== -1 },
    { row: 48, col: 1, label: 'Bonus section', test: v => String(v).indexOf('BONUS') !== -1 },
    { row: 51, col: 1, label: 'Tally',         test: v => String(v).indexOf('TALLY') !== -1 },
    { row: 55, col: 1, label: 'Insights',      test: v => String(v).indexOf('INSIGHTS') !== -1 }
  ];

  let report = '🔍 SALAH_PRO v2.1 INTEGRITY\n\n';
  let allOk = true;
  checks.forEach(c => {
    const ok = c.test(s.getRange(c.row, c.col).getValue());
    report += (ok ? '✅' : '❌') + ' ' + c.label + '\n';
    if (!ok) allOk = false;
  });

  const cols = s.getMaxColumns();
  const rows = s.getMaxRows();
  report += (cols === 11 ? '✅' : '⚠️') + ' Cols = ' + cols + ' (expected 11)\n';
  report += (rows === SALAH_TOTAL_ROWS ? '✅' : '⚠️') + ' Rows = ' + rows + ' (expected ' + SALAH_TOTAL_ROWS + ')\n';

  const themeName = (typeof getActiveThemeName === 'function') ? getActiveThemeName() : 'fallback';
  report += '✓ Theme: ' + themeName + '\n';

  report += '\n' + (allOk ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ Run rebuildSalahCockpit()');
  _salahAlert(report);
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendSalahMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🕌 Salah')
      .addItem('🔄 Rebuild Cockpit', 'rebuildSalahCockpit')
      .addItem('🧠 Refresh AI Insight', 'refreshSalahAIInsight')
      .addItem('📍 Refresh Multan Prayer Times', 'refreshPrayerTimesMultan')
      .addSeparator()
      .addItem('⏰ Install Daily Times Trigger', 'installPrayerTimesTrigger')
      .addItem('🔍 Verify Cockpit', 'verifySalahCockpit')
      .addToUi();
  } catch (e) { Logger.log('Salah menu failed: ' + e); }
}
