// ════════════════════════════════════════════════════════════════════
// 📋 Habits_Pro.gs v2.1 — CHECKBOXES · WEEKLY · 4 CATEGORIES · INSIGHTS
// Day 6 of 90 · 2026-04-29
//
// CHANGES FROM v2.0:
//   - Real checkboxes (TRUE/FALSE) instead of dropdowns
//   - Week count formula counts BOTH TRUE checkboxes AND ✓ from Salah mirror
//   - Today panel formula counts BOTH TRUE and ✓
//   - Conditional formatting handles both formats
//   - Cleaner code, no leftover dropdown references
//
// LOGGING:
//   - Click any day cell (Mon-Sun) → checkbox toggles ✓ / empty
//   - Salah habits (Fajr at Masjid, 5 Daily Prayers) read live from Salah tab
//     To log them: /prayed fajr masjid in Telegram or update Salah tab
//   - All other 9 habits: just click the checkbox
//
// REQUIRES:
//   - 🕌 Salah tab (Salah_Pro v2.1 layout)
//   - Code.gs (getQuestDay, SHEETS, safeAlert)
//   - Theme_Pro.gs (optional — falls back to Midnight Gold)
// ════════════════════════════════════════════════════════════════════

const HABITS_TAB = '📋 Habits';
const HABITS_QUEST_START = '2026-04-25';
const HABITS_TOTAL_ROWS = 50;
const HABITS_TOTAL_COLS = 12;

// Habit list — 4 categories
// type: 'mirror' = read-only formula from Salah, 'log' = editable checkbox
const HABITS_V2 = [
  // DEEN (mirror from Salah)
  { name: '🕌 Fajr at Masjid',           cat: 'DEEN',  type: 'mirror', salahPrayer: 'fajr',    requireMasjid: true },
  { name: '🙏 5 Daily Prayers',          cat: 'DEEN',  type: 'mirror', salahPrayer: 'all',     requireAll: true },
  { name: '📖 Quran (15 min)',           cat: 'DEEN',  type: 'log' },
  { name: '🤲 Tahajjud',                 cat: 'DEEN',  type: 'log' },
  { name: '📿 Adhkar (morn+eve)',        cat: 'DEEN',  type: 'log' },

  // BODY
  { name: '💧 3L Water',                 cat: 'BODY',  type: 'log' },
  { name: '🚶 Walk 5K steps',            cat: 'BODY',  type: 'log' },
  { name: '💤 Sleep before 2 AM',        cat: 'BODY',  type: 'log' },
  { name: '🏋️ Workout/Stretch',          cat: 'BODY',  type: 'log' },

  // MIND
  { name: '📚 Read non-fiction (20m)',   cat: 'MIND',  type: 'log' },
  { name: '💻 SQL/Python practice',      cat: 'MIND',  type: 'log' },
  { name: '📝 Journal/Reflect',          cat: 'MIND',  type: 'log' },

  // SHIELD
  { name: '🛡️ Habit One — clean',         cat: 'SHIELD', type: 'log' },
  { name: '📵 No social doom-scroll',    cat: 'SHIELD', type: 'log' }
];

// ──────────────────────────────────────────────────────────
// THEME + HELPERS
// ──────────────────────────────────────────────────────────

function _getHabitsTheme() {
  if (typeof getTheme === 'function') return getTheme();
  return {
    bgPanel: '#0F172A', bgRow: '#1E293B', bgHeader: '#334155', bgSection: '#854D0E',
    accent: '#FBBF24', textBright: '#F1F5F9', textMuted: '#CBD5E1', textDim: '#94A3B8',
    textGhost: '#64748B', success: '#16A34A', warning: '#CA8A04', danger: '#DC2626',
    critical: '#7F1D1D', info: '#2563EB', purple: '#7C3AED', orange: '#D97706'
  };
}

function _alertHabits(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
}

function _questDayHabits() {
  if (typeof getQuestDay === 'function') return getQuestDay();
  const tz = 'Asia/Karachi';
  const todayPKT = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const tParts = todayPKT.split('-').map(Number);
  const sParts = HABITS_QUEST_START.split('-').map(Number);
  const tDate = new Date(Date.UTC(tParts[0], tParts[1] - 1, tParts[2]));
  const sDate = new Date(Date.UTC(sParts[0], sParts[1] - 1, sParts[2]));
  return Math.max(1, Math.floor((tDate - sDate) / 86400000) + 1);
}

function _weekStartMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = (day === 0) ? -6 : (1 - day);
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function _formatDateRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => Utilities.formatDate(d, 'Asia/Karachi', 'dd MMM');
  return fmt(monday) + ' — ' + fmt(sunday);
}

function _todayDayOfWeek() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

// ──────────────────────────────────────────────────────────
// MAIN ENTRY
// ──────────────────────────────────────────────────────────

function rebuildHabitsCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(HABITS_TAB);
  if (!s) { _alertHabits('Habits tab not found. Expected: ' + HABITS_TAB); return; }

  const T = _getHabitsTheme();

  s.clear();
  s.clearConditionalFormatRules();
  s.clearNotes();
  try { s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations(); } catch (e) {}
  try { s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).breakApart(); } catch (e) {}
  s.showRows(1, s.getMaxRows());

  try { s.setFrozenRows(0); } catch (e) {}
  try { s.setFrozenColumns(0); } catch (e) {}
  SpreadsheetApp.flush();

  const maxCols = s.getMaxColumns();
  if (maxCols > HABITS_TOTAL_COLS) { 
    try { s.deleteColumns(HABITS_TOTAL_COLS + 1, maxCols - HABITS_TOTAL_COLS); } catch (e) {} 
  }
  const maxRows = s.getMaxRows();
  if (maxRows > HABITS_TOTAL_ROWS) { 
    try { s.deleteRows(HABITS_TOTAL_ROWS + 1, maxRows - HABITS_TOTAL_ROWS); } catch (e) {} 
  }
  if (s.getMaxRows() < HABITS_TOTAL_ROWS) {
    s.insertRowsAfter(s.getMaxRows(), HABITS_TOTAL_ROWS - s.getMaxRows());
  }

  s.setColumnWidth(1, 180);
  s.setColumnWidth(2, 70);
  for (let c = 3; c <= 9; c++) s.setColumnWidth(c, 100);
  s.setColumnWidth(10, 90);
  s.setColumnWidth(11, 210);
  s.setColumnWidth(12, 80);

  _habitsBuildBanner(s, T);
  _habitsBuildLegend(s, T);
  _habitsBuildWeekHeader(s, T);
  _habitsBuildGrid(s, T);
  _habitsBuildTodayPanel(s, T);
  _habitsBuildInsights(s, T);

  _habitsApplyCheckboxes(s);
  _habitsApplyConditionalFormatting(s, T);
  _habitsHighlightToday(s, T);

  try { s.setFrozenRows(5); } catch (e) {}
  try { s.setFrozenColumns(2); } catch (e) {}
  try { s.setHiddenGridlines(true); } catch (e) {}

  _alertHabits('Habits cockpit v2.1 rebuilt.\n\n' +
               '14 habits across 4 categories.\n' +
               'Real checkboxes for the 9 you log yourself.\n' +
               'DEEN section reads live from your Salah tab.\n\n' +
               'Click any checkbox to mark a habit done.\n' +
               'For Salah: log via /prayed in Telegram.\n\n' +
               'Bismillah, akhi.');
}

// ──────────────────────────────────────────────────────────
// SECTION BUILDERS
// ──────────────────────────────────────────────────────────

function _habitsBuildBanner(s, T) {
  s.getRange(1, 1, 1, 12).merge()
    .setValue('📋 HABITS COCKPIT  ·  Day ' + _questDayHabits() + ' of 90')
    .setBackground(T.bgPanel).setFontColor(T.accent).setFontWeight('bold')
    .setFontSize(18).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 48);

  s.getRange(2, 1, 1, 12).merge()
    .setValue('🧠 INSIGHT: Run "Refresh AI Insight" to populate')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(2, 32);
}

function _habitsBuildLegend(s, T) {
  s.getRange(3, 1, 1, 12).merge()
    .setValue('Click any checkbox to mark a habit done for that day.   ·   Salah habits read live from your Salah tab.')
    .setBackground(T.bgHeader).setFontColor(T.textBright).setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(3, 22);
}

function _habitsBuildWeekHeader(s, T) {
  const monday = _weekStartMonday();
  s.getRange(4, 1, 1, 12).merge()
    .setValue('Week of  ·  ' + _formatDateRange(monday))
    .setBackground(T.bgSection).setFontColor(T.accent).setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(4, 28);

  const headers = ['HABIT', 'CAT', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Week', 'Bar', 'Action'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    headers[2 + i] = headers[2 + i] + '\n' + d.getDate();
  }

  for (let c = 0; c < 12; c++) {
    s.getRange(5, c + 1).setValue(headers[c])
      .setBackground(T.bgHeader).setFontColor(T.accent).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  }
  s.setRowHeight(5, 36);
}

function _habitsBuildGrid(s, T) {
  let row = 6;
  let prevCat = null;

  HABITS_V2.forEach((habit, idx) => {
    if (habit.cat !== prevCat) {
      const catColors = {
        'DEEN':   T.success,
        'BODY':   T.info,
        'MIND':   T.purple,
        'SHIELD': T.danger
      };
      const catLabels = {
        'DEEN':   '🕌  DEEN  ·  read-only mirror from Salah tab',
        'BODY':   '💪  BODY  ·  the vessel',
        'MIND':   '🧠  MIND  ·  the operator',
        'SHIELD': '🛡️  SHIELD  ·  the discipline guard'
      };

      s.getRange(row, 1, 1, 12).merge()
        .setValue(catLabels[habit.cat])
        .setBackground(catColors[habit.cat]).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(11)
        .setHorizontalAlignment('left').setVerticalAlignment('middle');
      s.setRowHeight(row, 24);
      row++;
      prevCat = habit.cat;
    }

    s.getRange(row, 1).setValue(habit.name)
      .setBackground(T.bgRow).setFontColor(T.textBright).setFontWeight('bold').setFontSize(10)
      .setVerticalAlignment('middle').setHorizontalAlignment('left');

    s.getRange(row, 2).setValue(habit.cat)
      .setBackground(T.bgRow).setFontColor(T.textDim).setFontSize(9)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    for (let d = 0; d < 7; d++) {
      const dayCol = 3 + d;

      if (habit.type === 'mirror') {
        const formula = _buildSalahMirrorFormula(habit, d);
        s.getRange(row, dayCol).setFormula(formula)
          .setBackground(T.bgRow).setFontColor(T.success).setFontWeight('bold').setFontSize(11)
          .setHorizontalAlignment('center').setVerticalAlignment('middle');
        s.getRange(row, dayCol).setNote('Read-only. Log via /prayed in Telegram or in Salah tab.');
      } else {
        s.getRange(row, dayCol)
          .setBackground(T.bgRow).setFontColor(T.textBright).setFontWeight('bold').setFontSize(11)
          .setHorizontalAlignment('center').setVerticalAlignment('middle');
      }
    }

    // Week count: counts BOTH TRUE checkboxes AND ✓ text from Salah mirror
    const rangeMonSun = 'C' + row + ':I' + row;
    const weekCountF = '=COUNTIF(' + rangeMonSun + ',TRUE)+COUNTIF(' + rangeMonSun + ',"✓")';
    s.getRange(row, 10).setFormula(weekCountF)
      .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setNumberFormat('0"/7"');

    const barF = '=IFERROR(REPT("█",J' + row + ')&REPT("░",7-J' + row + '),"")';
    s.getRange(row, 11).setFormula(barF)
      .setBackground(T.bgRow).setFontColor(T.success).setFontFamily('Roboto Mono').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    if (habit.type === 'mirror') {
      s.getRange(row, 12).setValue('via /prayed')
        .setBackground(T.bgPanel).setFontColor(T.textGhost).setFontStyle('italic').setFontSize(9)
        .setHorizontalAlignment('center').setVerticalAlignment('middle');
    } else {
      s.getRange(row, 12).setValue('click box')
        .setBackground(T.bgPanel).setFontColor(T.textGhost).setFontStyle('italic').setFontSize(9)
        .setHorizontalAlignment('center').setVerticalAlignment('middle');
    }

    s.setRowHeight(row, 28);
    row++;
  });

  s.setRowHeight(row, 12);
  s.getRange(row, 1, 1, 12).setBackground(T.bgPanel);
}

function _buildSalahMirrorFormula(habit, dayOffset) {
  // Bulletproof date-based lookup using SUMPRODUCT.
  // Works across month boundaries. No LET. No MATCH. No INDEX.

  const monday = _weekStartMonday();
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + dayOffset);

  const y = targetDate.getFullYear();
  const m = targetDate.getMonth() + 1;
  const d = targetDate.getDate();

  const dateExpr = 'DATE(' + y + ',' + m + ',' + d + ')';
  const dateMatch = "('🕌 Salah'!$A$6:$A$36=" + dateExpr + ")";

  if (habit.requireMasjid) {
    // Sum of (date matches) * (Fajr cell is M or Masjid). If > 0, show ✓.
    return '=IFERROR(IF(SUMPRODUCT(' + dateMatch + '*' +
           "(('🕌 Salah'!$B$6:$B$36=\"M\")+('🕌 Salah'!$B$6:$B$36=\"Masjid\"))" +
           ')>0,"✓",""),"")';
  }
  if (habit.requireAll) {
    // Sum of (date matches) * (count of non-empty B:F in that row). If = 5, show ✓.
    return '=IFERROR(IF(SUMPRODUCT(' + dateMatch + '*(' +
           "('🕌 Salah'!$B$6:$B$36<>\"\")+" +
           "('🕌 Salah'!$C$6:$C$36<>\"\")+" +
           "('🕌 Salah'!$D$6:$D$36<>\"\")+" +
           "('🕌 Salah'!$E$6:$E$36<>\"\")+" +
           "('🕌 Salah'!$F$6:$F$36<>\"\")" +
           '))=5,"✓",""),"")';
  }
  return '""';
}

function _habitsBuildTodayPanel(s, T) {
  const startRow = 25;
  const todayCol = 2 + _todayDayOfWeek();
  const todayColLetter = String.fromCharCode(64 + todayCol);
  const todayRangeStart = 7;
  const todayRangeEnd = 24;

  s.getRange(startRow, 1, 1, 12).merge()
    .setValue('🎯 TODAY  ·  ' + Utilities.formatDate(new Date(), 'Asia/Karachi', 'EEEE, dd MMM'))
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(startRow, 28);

  // Today done count: counts BOTH TRUE checkboxes AND ✓ text
  const doneCountF = '=COUNTIF(' + todayColLetter + todayRangeStart + ':' + todayColLetter + todayRangeEnd + ',TRUE)+COUNTIF(' + todayColLetter + todayRangeStart + ':' + todayColLetter + todayRangeEnd + ',"✓")';

  s.getRange(startRow + 1, 1, 1, 6).merge()
    .setFormula('="Today done:  " & ' + doneCountF.substring(1) + ' & " / 14"')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(14)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.getRange(startRow + 1, 7, 1, 6).merge()
    .setFormula('=REPT("█",ROUND(' + doneCountF.substring(1) + '/14*30,0))&REPT("░",30-ROUND(' + doneCountF.substring(1) + '/14*30,0))')
    .setBackground(T.bgPanel).setFontColor(T.success).setFontFamily('Roboto Mono').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(startRow + 1, 36);

  // Brother voice nudge
  const pendingF = '=14-' + doneCountF.substring(1);

  const nudgeF = '=IF(' + doneCountF.substring(1) + '>=12,"Strong day. Keep the rhythm.",' +
                 'IF(' + doneCountF.substring(1) + '>=8,"Good ground covered. " & ' + pendingF.substring(1) + ' & " still possible.",' +
                 'IF(' + doneCountF.substring(1) + '>=4,"Building. " & ' + pendingF.substring(1) + ' & " habits still in reach today.",' +
                 'IF(' + doneCountF.substring(1) + '>=1,"Started. Pick the next one and keep walking.",' +
                 '"The day is open. Pick one small thing and start there."))))';

  s.getRange(startRow + 2, 1, 1, 12).merge()
    .setFormula(nudgeF)
    .setBackground(T.bgPanel).setFontColor(T.textBright).setFontStyle('italic').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(startRow + 2, 28);

  s.setRowHeight(startRow + 3, 12);
  s.getRange(startRow + 3, 1, 1, 12).setBackground(T.bgPanel);
}

function _habitsBuildInsights(s, T) {
  const startRow = 30;

  s.getRange(startRow, 1, 1, 12).merge()
    .setValue('📊 HABIT INSIGHTS  ·  this week so far')
    .setBackground(T.bgSection).setFontColor(T.accent).setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(startRow, 32);

  s.setRowHeight(startRow + 1, 8);
  s.getRange(startRow + 1, 1, 1, 12).setBackground(T.bgPanel);

  // 4 metric cards
  const maxWeekF = '=IFERROR(MAX(J7:J23),0)';
  s.getRange(startRow + 2, 1, 1, 3).merge()
    .setFormula('="🔥 Top: " & ' + maxWeekF.substring(1) + ' & "/7 days"')
    .setBackground(T.success).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  const coldCountF = '=IFERROR(COUNTIF(J7:J23,0),0)';
  s.getRange(startRow + 2, 4, 1, 3).merge()
    .setFormula('="❄️ Cold: " & ' + coldCountF.substring(1) + ' & " habits"')
    .setBackground(T.warning).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  const avgF = '=IFERROR(ROUND(AVERAGE(J7:J23),1),0)';
  s.getRange(startRow + 2, 7, 1, 3).merge()
    .setFormula('="📈 Avg: " & ' + avgF.substring(1) + ' & " / 7"')
    .setBackground(T.info).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  const totalF = '=IFERROR(SUM(J7:J23),0)';
  s.getRange(startRow + 2, 10, 1, 3).merge()
    .setFormula('="✨ Total: " & ' + totalF.substring(1) + ' & " done"')
    .setBackground(T.purple).setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(startRow + 2, 36);

  s.setRowHeight(startRow + 3, 10);
  s.getRange(startRow + 3, 1, 1, 12).setBackground(T.bgPanel);

  // Per-category breakdown
  s.getRange(startRow + 4, 1, 1, 12).merge()
    .setValue('PER CATEGORY  ·  this week')
    .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(startRow + 4, 24);

  const cats = [
    { name: '🕌 DEEN',   color: T.success, rows: '7:11',  totalSlots: 35 },
    { name: '💪 BODY',   color: T.info,    rows: '13:16', totalSlots: 28 },
    { name: '🧠 MIND',   color: T.purple,  rows: '18:20', totalSlots: 21 },
    { name: '🛡️ SHIELD', color: T.danger,  rows: '22:23', totalSlots: 14 }
  ];

  cats.forEach((cat, i) => {
    const r = startRow + 5 + i;
    const sumF = '=IFERROR(SUM(J' + cat.rows.split(':')[0] + ':J' + cat.rows.split(':')[1] + '),0)';

    s.getRange(r, 1, 1, 2).merge()
      .setValue(cat.name)
      .setBackground(T.bgRow).setFontColor(T.textBright).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');

    s.getRange(r, 3).setFormula('=' + sumF.substring(1) + '&"/' + cat.totalSlots + '"')
      .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    const barF = '=IFERROR(LET(p,' + sumF.substring(1) + '/' + cat.totalSlots + ',' +
                 'REPT("█",ROUND(p*40,0))&REPT("░",40-ROUND(p*40,0))),"")';
    s.getRange(r, 4, 1, 8).merge()
      .setFormula(barF)
      .setBackground(T.bgRow).setFontColor(cat.color).setFontFamily('Roboto Mono').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    s.getRange(r, 12).setFormula('=IFERROR(ROUND(' + sumF.substring(1) + '/' + cat.totalSlots + '*100,0)&"%","")')
      .setBackground(T.bgRow).setFontColor(T.accent).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    s.setRowHeight(r, 22);
  });

  s.setRowHeight(startRow + 9, 10);
  s.getRange(startRow + 9, 1, 1, 12).setBackground(T.bgPanel);

  // Brother voice insight footer
  const footerF = '=IFERROR(LET(' +
                  'deen,SUM(J7:J11)/35,' +
                  'body,SUM(J13:J16)/28,' +
                  'mind,SUM(J18:J20)/21,' +
                  'shield,SUM(J22:J23)/14,' +
                  'lowest,MIN(deen,body,mind,shield),' +
                  'lowestName,IF(lowest=deen,"Deen",IF(lowest=body,"Body",IF(lowest=mind,"Mind","Shield"))),' +
                  '"📌 " & lowestName & " is the cold spot this week (" & ROUND(lowest*100,0) & "%). One small move there shifts the whole week."),"📌 Log a few days to see your patterns.")';

  s.getRange(startRow + 10, 1, 1, 12).merge()
    .setFormula(footerF)
    .setBackground(T.bgSection).setFontColor(T.accent).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(startRow + 10, 36);

  s.setRowHeight(startRow + 11, 12);
  s.getRange(startRow + 11, 1, 1, 12).setBackground(T.bgPanel);
}

// ──────────────────────────────────────────────────────────
// CHECKBOXES + FORMATTING
// ──────────────────────────────────────────────────────────

function _habitsApplyCheckboxes(s) {
  let row = 6;
  HABITS_V2.forEach((habit, idx) => {
    if (idx === 0 || HABITS_V2[idx-1].cat !== habit.cat) row++;

    if (habit.type === 'log') {
      s.getRange(row, 3, 1, 7).insertCheckboxes();
    }
    row++;
  });
}

function _habitsApplyConditionalFormatting(s, T) {
  const rules = [];
  const dayRange = s.getRange('C7:I23');

  // Checked checkboxes (TRUE) → green
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=C7=TRUE').setBackground(T.success).setFontColor('#FFFFFF').setBold(true)
    .setRanges([dayRange]).build());

  // Salah mirror text "✓" → green
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('✓').setBackground(T.success).setFontColor('#FFFFFF').setBold(true)
    .setRanges([dayRange]).build());

  // Week count tier coloring
  const weekRange = s.getRange('J7:J23');
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(6).setBackground(T.success).setFontColor('#FFFFFF').setBold(true)
    .setRanges([weekRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(3, 5).setBackground(T.warning).setFontColor('#FFFFFF').setBold(true)
    .setRanges([weekRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThanOrEqualTo(2).setBackground(T.danger).setFontColor('#FFFFFF').setBold(true)
    .setRanges([weekRange]).build());

  s.setConditionalFormatRules(rules);
}

function _habitsHighlightToday(s, T) {
  const todayCol = 2 + _todayDayOfWeek();
  try {
    s.getRange(5, todayCol, 19, 1).setBorder(true, true, true, true, false, false, T.accent, SpreadsheetApp.BorderStyle.SOLID_THICK);
  } catch (e) {}
}

// ──────────────────────────────────────────────────────────
// AI INSIGHT
// ──────────────────────────────────────────────────────────

function refreshHabitsAIInsight() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(HABITS_TAB);
  if (!s) { _alertHabits('Habits tab not found.'); return; }

  if (typeof callAI === 'function') {
    const weekCounts = s.getRange('J7:J23').getValues().flat().filter(v => typeof v === 'number');
    const total = weekCounts.reduce((a, b) => a + b, 0);
    const max = Math.max.apply(null, weekCounts.length ? weekCounts : [0]);
    const min = Math.min.apply(null, weekCounts.length ? weekCounts : [0]);

    const prompt = 'You are coaching Abu Walah, a night-shift Muslim. ' +
                   'Be his wise older brother. Honest, never harsh. Specific, never generic. Always pointing forward. ' +
                   '\n\nThis week so far across 14 habits in 4 categories (Deen/Body/Mind/Shield):\n' +
                   '- Total habit-days completed: ' + total + '\n' +
                   '- Best single habit: ' + max + '/7\n' +
                   '- Coldest habit: ' + min + '/7\n\n' +
                   'In ONE SENTENCE (max 25 words): praise what\'s working with specific number, ' +
                   'name what\'s slipping without shame, point to one concrete move forward.';

    const result = callAI(prompt, 200);
    if (!result.error) {
      s.getRange(2, 1, 1, 12).setValue('🧠 INSIGHT: ' + result.text.trim());
      _alertHabits('AI insight refreshed.');
      return;
    }
  }

  s.getRange(2, 1, 1, 12).setValue('🧠 INSIGHT: AI unavailable. Check the per-category bars below for your week\'s shape.');
  _alertHabits('Computed insight (AI unavailable).');
}

// ──────────────────────────────────────────────────────────
// VERIFY
// ──────────────────────────────────────────────────────────

function verifyHabitsCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(HABITS_TAB);
  if (!s) { _alertHabits('Habits tab missing.'); return; }

  const checks = [
    { row: 1,  col: 1, label: 'Banner',           test: v => String(v).indexOf('COCKPIT') !== -1 },
    { row: 3,  col: 1, label: 'Code legend',      test: v => String(v).indexOf('checkbox') !== -1 },
    { row: 4,  col: 1, label: 'Week header',      test: v => String(v).indexOf('Week') !== -1 },
    { row: 5,  col: 1, label: 'Habit col header', test: v => String(v) === 'HABIT' },
    { row: 25, col: 1, label: 'Today panel',      test: v => String(v).indexOf('TODAY') !== -1 },
    { row: 30, col: 1, label: 'Insights section', test: v => String(v).indexOf('INSIGHTS') !== -1 }
  ];

  let report = 'HABITS_PRO v2.1 INTEGRITY CHECK\n\n';
  let allOk = true;
  checks.forEach(c => {
    const ok = c.test(s.getRange(c.row, c.col).getValue());
    report += (ok ? '✓ ' : '✗ ') + c.label + '\n';
    if (!ok) allOk = false;
  });

  const cols = s.getMaxColumns();
  const rows = s.getMaxRows();
  const fc = s.getFrozenColumns();
  const fr = s.getFrozenRows();

  report += (cols === 12 ? '✓ ' : '✗ ') + 'Cols = ' + cols + ' (expected 12)\n';
  report += (rows === 50 ? '✓ ' : '✗ ') + 'Rows = ' + rows + ' (expected 50)\n';
  report += (fc === 2 ? '✓ ' : '✗ ') + 'Frozen cols = ' + fc + ' (expected 2)\n';
  report += (fr === 5 ? '✓ ' : '✗ ') + 'Frozen rows = ' + fr + ' (expected 5)\n';

  report += '\n' + (allOk ? 'All systems holding.' : 'Run rebuildHabitsCockpit()');
  _alertHabits(report);
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendHabitsMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📋 Habits')
      .addItem('Rebuild Cockpit', 'rebuildHabitsCockpit')
      .addItem('Refresh AI Insight', 'refreshHabitsAIInsight')
      .addSeparator()
      .addItem('Verify Cockpit', 'verifyHabitsCockpit')
      .addToUi();
  } catch (e) { Logger.log('Habits menu failed: ' + e); }
}