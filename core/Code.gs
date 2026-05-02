// 🛡️ SOVEREIGN OPS v5.3 · Code.gs
// Constants · Data · Utils · Builders · Actions · Triggers · Email · Legendary · Archive
// AI lives in AI.gs · Telegram lives in Telegram.gs · WebApp lives in WebApp.gs
// ════════════════════════════════════════════════════════════════════
//
// CHANGES FROM v5.2 (2026-04-29 Day 6 — ship under timer):
//
//   1. NEUTERED legacy builders that conflicted with Pro cockpits:
//        - buildHabits()   → redirects to rebuildHabitsCockpit (Habits_Pro v2.1)
//        - buildSalah()    → redirects to rebuildSalahCockpit (Salah_Pro v2.1)
//        - buildProgress() → redirects to rebuildProgressCockpit (Progress_Pro v2.0)
//      Reason: legacy builders used incompatible row/col layouts
//      (16 habits, 31-day grids) that destroyed v2.1 cockpits if
//      setupStep1/2 was ever re-run. Now setupSteps remain safe.
//
//   2. FIXED sendDailyDigest:
//        - Reads habits from v2.1 layout: today's column =
//          2 + dayOfWeek (Mon=1..Sun=7), counts BOTH TRUE checkboxes
//          AND ✓ Salah mirror text across rows 7-23
//        - Habit count shown as /14 (matches v2.1 active habits)
//        - Brother voice (no "0/16 done · 0 skipped" template)
//      This kills the "Day 4, Habits 0/16, ✅ icons" ghost emails.
//
//   3. All other v5.2 behavior preserved verbatim.
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
// 1. CONFIG
// ════════════════════════════════════════════════════════════════════

const SHEETS = {
  MISSION: '⚡ Mission', HABITS: '📋 Habits', SALAH: '🕌 Salah',
  PROGRESS: '📈 Progress', SKILLS: '💻 Skills', FINANCE: '💰 Finance',
  KNOWLEDGE: '📚 Knowledge', KPIS: '🎯 KPIs', WEEK: '📊 Week',
  CHARTS: '📉 Charts', VISION: '🌳 Vision', SETTINGS: '⚙️ Settings'
};

const ORDER = ['MISSION','HABITS','SALAH','PROGRESS','SKILLS','FINANCE',
               'KNOWLEDGE','KPIS','WEEK','CHARTS','VISION','SETTINGS'];

const TAB_COLORS = {
  MISSION: '#B45309', HABITS: '#059669', SALAH: '#059669',
  PROGRESS: '#2563EB', SKILLS: '#7C3AED', FINANCE: '#7C3AED',
  KNOWLEDGE: '#7C3AED', KPIS: '#D97706', WEEK: '#D97706',
  CHARTS: '#2563EB', VISION: '#B45309', SETTINGS: '#64748B'
};

const C = {
  bg: '#FFFFFF', card: '#F8FAFC', rowOdd: '#FFFFFF', rowEven: '#F1F5F9',
  weekend: '#F1F5F9', border: '#E2E8F0', focus: '#2563EB',
  text: '#0F172A', muted: '#64748B', disabled: '#CBD5E1',
  deen: '#059669', health: '#2563EB', growth: '#7C3AED',
  disc: '#D97706', priv: '#DC2626', gold: '#B45309',
  success: '#059669', warn: '#D97706', danger: '#DC2626',
  deenFill: '#D1FAE5', healthFill: '#DBEAFE', growthFill: '#EDE9FE',
  discFill: '#FEF3C7', privFill: '#FEE2E2', missed: '#FEE2E2',
  zeroFill: '#FCA5A5'
};

const HABITS_LIST = [
  ['🕌 Fajr at Masjid','DEEN'], ['🕐 Dhuhr','DEEN'], ['🕓 Asr','DEEN'],
  ['🌅 Maghrib','DEEN'], ['🌙 Isha','DEEN'],
  ['🚶 Fajr Walk','HEALTH'], ['💪 Home Workout','HEALTH'],
  ['🚫 No Sugar','HEALTH'], ['🥗 No Fast Food','HEALTH'],
  ['💻 SQL/Python Study','GROWTH'], ['📚 Learn Something New','GROWTH'],
  ['📋 Day Planning','DISC'], ['💰 Budget Tracking','DISC'],
  ['📓 Journaling','DISC'], ['📵 No Late Scrolling','DISC'],
  ['🛡️ Habit One','PRIV']
];

const VERSES = [
  '"Indeed with hardship comes ease." — Quran 94:6',
  '"And whoever relies upon Allah, He is sufficient for him." — Quran 65:3',
  '"Allah does not burden a soul beyond what it can bear." — Quran 2:286',
  '"So remember Me; I will remember you." — Quran 2:152',
  '"In the remembrance of Allah do hearts find rest." — Quran 13:28',
  '"And He found you lost and guided you." — Quran 93:7',
  '"My Lord, increase me in knowledge." — Quran 20:114',
  '"Indeed, Allah is with the patient." — Quran 2:153',
  '"Whoever fears Allah, He will make a way out for him." — Quran 65:2',
  '"And do good; indeed, Allah loves the doers of good." — Quran 2:195'
];

const SETTINGS_OVERRIDES = {
  weeklyLoss: 0.8, studyTarget: 10, salahThreshold: 45,
  ahtTarget: 9.7, csatTarget: 97, occTarget: 87.15,
  ccLimit: 100000, ccOutstanding: 100025
};

const LEG_SHEETS = {
  FORECAST: '🔮 Forecast', ALERTS: '🚨 Alerts', PATTERNS: '🔬 Patterns'
};

const AI_LOG_SHEET = '🧠 AI Memory';
const QUEST_START = new Date(2026, 3, 25);

// ════════════════════════════════════════════════════════════════════
// 2. SEED DATA  (kept for reference)
// ════════════════════════════════════════════════════════════════════

const PROGRESS_DATA = [
  [1,80,4,8,6,7,0,3.5],[2,80,4,8,6,7,0,3.5],[3,78,4,8,6,7,0,3.5],
  [4,78.16,7,8,6,7,0,3.5],[5,77.93,8,8,6,7,0,3.5],[6,77.56,8,8,6,7,0,3.5],
  [7,77.96,8,8,5,6.5,0,3.5],[8,77.23,8,8,5,8,0,3.5],[9,77.85,8,8,5,6,0,3.5],
  [10,77.96,8,8,2,5,0,3.5],[11,77.67,8,8,1,5,0,3.5],[12,77.43,3,8,3,6,0,3.5],
  [13,77.36,1,8,4,6,0,3.5],[14,76.14,4,8,3,6,0,3.5],[15,76.98,9,8,6,6,0,3.5],
  [16,76.88,2,8,7,6,0,3.5],[17,76.57,6,8,5,5,0,3.5],[18,77.19,2,8,7,6,0,3.5],
  [19,77.36,5,8,7,6,0,3.5],[20,77.24,3,8,7,6,0,3.5],[21,77.36,2,8,4,6,0,3.5],
  [22,77.36,7,8,3,6,0,3.5],[23,77.23,7,8,7,6,0,5],[24,77.11,5,6,4,'','',3.5]
];

const HABITS_DATA = [];
const SALAH_DATA = [];

const DEBTS_DATA = [
  ['Imran Bhai', 285000, 70000, '1 — Urgent', '2026-05-01'],
  ['Mashal', 8500, 0, '1 — Urgent', '2026-05-01'],
  ['Yusra', 17500, 12500, '2 — High', '2026-05-01'],
  ['Shahbaz', 1500, 0, '1 — Urgent', '2026-05-01'],
  ['Zain Cousin', 700, 0, '1 — Urgent', '2026-05-01']
];

const RECEIVABLES_DATA = [
  ['Sehat Kahani', 9780, 'Will pay directly into Meezan Account']
];

const KPI_DATA = [
  [24, 1, 1, 6.5, 94.26, 87.6, 100, 0, 'Short Leave due to fever']
];

// ════════════════════════════════════════════════════════════════════
// 3. UTILS
// ════════════════════════════════════════════════════════════════════

function safeAlert(msg) {
  try { SpreadsheetApp.getUi().alert(msg); }
  catch (e) { Logger.log(msg); }
}

function getOrCreate(ss, name, color) {
  let s = ss.getSheetByName(name);
  if (s) ss.deleteSheet(s);
  s = ss.insertSheet(name);
  s.setTabColor(color);
  s.setHiddenGridlines(false);
  s.getRange(1,1,200,40).setBackground(C.bg).setFontColor(C.text)
    .setFontFamily('Inter, Google Sans, Arial').setFontSize(10);
  s.setColumnWidth(1, 220);
  for (let i=2; i<=40; i++) s.setColumnWidth(i, 90);
  return s;
}

function header(s, range, text, opts) {
  opts = opts || {};
  s.getRange(range).merge().setValue(text)
    .setBackground(opts.bg || C.card)
    .setFontColor(opts.color || C.gold)
    .setFontWeight(opts.weight || 'bold')
    .setFontSize(opts.size || 18)
    .setHorizontalAlignment(opts.align || 'left')
    .setVerticalAlignment('middle');
}

function setRowHeights(s, rowsArr, h) {
  rowsArr.forEach(r => s.setRowHeight(r, h));
}

function reorderSheets(ss) {
  ORDER.forEach((key, i) => {
    const sh = ss.getSheetByName(SHEETS[key]);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i+1); }
  });
}

function columnLetter(col) {
  let s = '';
  while (col > 0) { let m = (col-1) % 26; s = String.fromCharCode(65+m) + s; col = Math.floor((col-1)/26); }
  return s;
}

function getQuestDay() {
  const tz = 'Asia/Karachi';
  const todayPKT = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const tParts = todayPKT.split('-').map(Number);
  const tDate = new Date(Date.UTC(tParts[0], tParts[1] - 1, tParts[2]));
  const sDate = new Date(Date.UTC(2026, 3, 25));
  return Math.max(1, Math.floor((tDate - sDate) / 86400000) + 1);
}

// ════════════════════════════════════════════════════════════════════
// 4. SETUP — 4-step builder
// ════════════════════════════════════════════════════════════════════

function setupStep1() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  buildSettings(ss);
  buildHabits(ss);
  safeAlert('Step 1: Foundation built (Habits redirected to Habits_Pro v2.1).');
}

function setupStep2() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  buildSalah(ss);
  buildProgress(ss);
  buildKPIs(ss);
  safeAlert('Step 2: Logs built (Salah + Progress redirected to Pro cockpits).');
}

function setupStep3() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  buildSkills(ss);
  buildFinance(ss);
  buildKnowledge(ss);
  buildVision(ss);
  safeAlert('Step 3: Modules built.');
}

function setupStep4() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  buildWeek(ss);
  buildCharts(ss);
  buildMission(ss);
  reorderSheets(ss);
  highlightToday();
  installTriggers();
  refreshMission();
  const def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  safeAlert('SOVEREIGN OPS v5.3 BUILD COMPLETE');
}

// ════════════════════════════════════════════════════════════════════
// 5. SHEET BUILDERS
// ════════════════════════════════════════════════════════════════════

function buildSettings(ss) {
  const s = getOrCreate(ss, SHEETS.SETTINGS, TAB_COLORS.SETTINGS);
  s.setColumnWidth(1, 280); s.setColumnWidth(2, 220);
  header(s, 'A1:F1', '⚙️ SETTINGS — MASTER VARIABLES');
  s.getRange('A2').setValue('All other sheets read direct cell references from here.')
    .setFontColor(C.muted).setFontSize(9);

  const rows = [
    ['Operator name', 'Muhammad Zeeshan Nasir'],
    ['Kunya', 'Abu Walah'],
    ['Timezone offset (hrs from UTC)', 5],
    ['Current month label', '=TEXT(TODAY(),"MMMM YYYY")'],
    ['Days in current month', '=DAY(EOMONTH(TODAY(),0))'],
    ["Today's day-of-month", '=DAY(TODAY())'],
    ['Habit count', 14],
    ['Weight start (kg)', 80],
    ['Weight target (kg)', 69],
    ['Weekly weight loss target (kg)', SETTINGS_OVERRIDES.weeklyLoss],
    ['Wake target time (HH:MM)', '05:00'],
    ['Sleep window start (PKT)', '02:00'],
    ['Sleep window end (PKT)', '13:00'],
    ['Study weekly target (hrs)', SETTINGS_OVERRIDES.studyTarget],
    ['Salah on-time threshold (min after adhan)', SETTINGS_OVERRIDES.salahThreshold],
    ['AHT target (minutes)', SETTINGS_OVERRIDES.ahtTarget],
    ['CSAT target (%)', SETTINGS_OVERRIDES.csatTarget],
    ['Occupancy target (%)', SETTINGS_OVERRIDES.occTarget],
    ['Family Fund — Education (PKR)', 0],
    ['Family Fund — Hospital (PKR)', 0],
    ['Family Fund — Business (PKR)', 0],
    ['Habit One current streak', 0],
    ['Habit One longest streak', 16],
    ['Habit One last reset date', '=TODAY()']
  ];
  rows.forEach((r, i) => {
    const row = i + 3;
    s.getRange(row, 1).setValue(r[0]).setFontColor(C.muted);
    s.getRange(row, 2).setValue(r[1]).setBackground(C.card)
      .setFontColor(C.text).setFontWeight('bold').setFontSize(11);
  });

  s.getRange('Z2').setValue('Verse Rotation').setFontColor(C.muted);
  VERSES.forEach((v,i) => s.getRange(3+i, 26).setValue(v).setFontColor(C.text));
  s.hideColumns(26);
  s.setFrozenRows(2);
}

// ── NEUTERED in v5.3 — redirects to Habits_Pro v2.1 ──────────────
function buildHabits(ss) {
  if (typeof rebuildHabitsCockpit === 'function') {
    Logger.log('buildHabits → redirecting to rebuildHabitsCockpit (Habits_Pro v2.1)');
    try { rebuildHabitsCockpit(); return; } catch (e) {
      Logger.log('rebuildHabitsCockpit failed: ' + e);
    }
  }
  safeAlert('buildHabits is deprecated.\n\nHabits is now managed by Habits_Pro v2.1.\nMenu → 📋 Habits → Rebuild Cockpit.');
}

// ── NEUTERED in v5.3 — redirects to Salah_Pro v2.1 ──────────────
function buildSalah(ss) {
  if (typeof rebuildSalahCockpit === 'function') {
    Logger.log('buildSalah → redirecting to rebuildSalahCockpit (Salah_Pro v2.1)');
    try { rebuildSalahCockpit(); return; } catch (e) {
      Logger.log('rebuildSalahCockpit failed: ' + e);
    }
  }
  safeAlert('buildSalah is deprecated.\n\nSalah is now managed by Salah_Pro v2.1.\nMenu → 🕌 Salah → Rebuild Cockpit.');
}

// ── NEUTERED in v5.3 — redirects to Progress_Pro v2.0 ──────────────
function buildProgress(ss) {
  if (typeof rebuildProgressCockpit === 'function') {
    Logger.log('buildProgress → redirecting to rebuildProgressCockpit (Progress_Pro v2.0)');
    try { rebuildProgressCockpit(); return; } catch (e) {
      Logger.log('rebuildProgressCockpit failed: ' + e);
    }
  }
  safeAlert('buildProgress is deprecated.\n\nProgress is now managed by Progress_Pro v2.0.\nMenu → 📈 Progress → Rebuild Cockpit.');
}

function buildSkills(ss) {
  const s = getOrCreate(ss, SHEETS.SKILLS, TAB_COLORS.SKILLS);
  header(s, 'A1:F1', '💻 SKILLS — BUILD INTO TSE');
  s.setRowHeight(2, 12);
  header(s, 'A3:F3', 'SKILL STACK', {size:13, color:C.text});
  s.getRange(4,1,1,6).setValues([['Skill','Current (1-10)','Target','Hrs Month','Hrs Total','Last Practiced']])
    .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold');

  const stack = ['SQL','Python','Excel/Sheets','English Writing','Arabic'];
  for (let i=0; i<stack.length; i++) {
    const r = 5+i;
    s.getRange(r,1).setValue(stack[i]).setFontColor(C.text).setFontWeight('bold');
    s.getRange(r,2).setValue(1); s.getRange(r,3).setValue(10); s.getRange(r,4).setValue(0);
  }
  s.setRowHeight(11, 12);
  header(s, 'A12:F12', 'DAILY STUDY LOG', {size:13, color:C.text});
  s.getRange(13,1,1,6).setValues([['DATE','TOPIC','SKILL','HOURS','DELIVERABLE','NOTES']])
    .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold');
  s.setFrozenRows(5);
  setRowHeights(s, [1], 44);
}

function buildFinance(ss) {
  // Finance is owned by Finance_Pro v2.8 — this is the legacy stub that
  // populates the hidden 💰 Finance reference tab used by /debt and net debt cards.
  const s = getOrCreate(ss, SHEETS.FINANCE, TAB_COLORS.FINANCE);
  header(s, 'A1:F1', '💰 FINANCE — CASH · DEBTS · FUNDS · FLOWS');
  s.setRowHeight(2, 12);
  header(s, 'A3:F3', 'CASH POSITION', {size:13, color:C.text});

  const cash = [
    ['Alfalah CC limit', SETTINGS_OVERRIDES.ccLimit],
    ['Alfalah CC outstanding', SETTINGS_OVERRIDES.ccOutstanding],
    ['Bank balance', 0],
    ['Cash on hand', 0]
  ];
  cash.forEach((c,i) => {
    s.getRange(4+i,1).setValue(c[0]).setFontColor(C.muted);
    s.getRange(4+i,2).setValue(c[1]).setBackground(C.card).setFontColor(C.gold).setFontWeight('bold');
  });
  s.getRange(8,1).setValue('Net liquid').setFontColor(C.text).setFontWeight('bold');
  s.getRange(8,2).setFormula('=B4-B5+B6+B7').setBackground(C.card).setFontColor(C.gold).setFontWeight('bold');
  s.setRowHeight(9, 12);

  header(s, 'A17:F17', 'TRANSACTIONS', {size:13, color:C.text});
  s.getRange(18,1,1,6).setValues([['DATE','TYPE','CATEGORY','AMOUNT','METHOD','NOTES']])
    .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold');
  s.setRowHeight(50, 12);
  header(s, 'A51:F51', 'MONTH SUMMARY', {size:13, color:C.text});

  header(s, 'A58:F58', '💸 DEBTS I OWE', {size:13, color:C.danger});
  s.getRange(59,1,1,6).setValues([['Creditor','Original','Paid','Remaining','Priority','Due Date']])
    .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold');
  for (let i=0; i<10; i++) {
    const r = 60+i;
    s.getRange(r,4).setFormula('=IFERROR(B' + r + '-C' + r + ',0)');
  }
  DEBTS_DATA.forEach((d, i) => {
    const r = 60 + i;
    s.getRange(r,1).setValue(d[0]);
    s.getRange(r,2).setValue(d[1]);
    s.getRange(r,3).setValue(d[2]);
    s.getRange(r,5).setValue(d[3]);
    if (d[4]) s.getRange(r,6).setValue(new Date(d[4]));
  });

  header(s, 'A71:F71', '💰 OWED TO ME', {size:13, color:C.success});
  s.getRange(72,1,1,6).setValues([['Debtor','Amount','Received','Remaining','Expected','Notes']])
    .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold');

  header(s, 'A84:F84', '📊 DEBT SUMMARY', {size:13, color:C.gold});
  const ds = [
    ['Total I Owe', '=SUM(D60:D69)'],
    ['Total Paid', '=SUM(C60:C69)'],
    ['Total Owed to Me', '=SUM(D73:D82)'],
    ['Net Debt Position', '=B87-B85'],
    ['Payoff Progress', '=IFERROR(SUM(C60:C69)/SUM(B60:B69),0)']
  ];
  ds.forEach((x, i) => {
    s.getRange(85 + i, 1).setValue(x[0]).setFontColor(C.muted);
    s.getRange(85 + i, 2).setFormula(x[1]).setBackground(C.card)
      .setFontColor(C.gold).setFontWeight('bold').setFontSize(11);
  });
  s.getRange('B89').setNumberFormat('0%');
  s.setFrozenRows(2);
  setRowHeights(s, [1], 44);
}

function buildKnowledge(ss) {
  const s = getOrCreate(ss, SHEETS.KNOWLEDGE, TAB_COLORS.KNOWLEDGE);
  header(s, 'A1:G1', '📚 KNOWLEDGE — QURAN · BOOKS · MDCF');
  s.setRowHeight(2, 12);
  header(s, 'A3:G3', 'QURAN — TARTEEL REVELATION ORDER', {size:13, color:C.text});
  s.getRange(4,1,1,7).setValues([['Surah # (rev)','Name','Phase','Start Date','Completed','Notes Link','MDCF Flags']])
    .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold');
  s.setFrozenRows(2);
  setRowHeights(s, [1], 44);
}

function buildKPIs(ss) {
  const s = getOrCreate(ss, SHEETS.KPIS, TAB_COLORS.KPIS);
  header(s, 'A1:I1', '🎯 KPIs — MOTIVE TIER 1');
  s.setRowHeight(2, 12);
  header(s, 'A3:I3', 'TODAY', {size:13, color:C.text});
  s.setRowHeight(8, 12);
  s.getRange(8,1,1,9).setValues([['DATE','SHIFT (HRS)','CASES','AHT (MIN)','CSAT %','OCC %','QA','ESCAL','NOTES']])
    .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold');
  s.getRange('A9:A39').setNumberFormat('dd MMM yyyy');
  KPI_DATA.forEach(k => {
    const r = 8 + k[0];
    s.getRange(r,1).setValue(new Date(2026, 3, k[0]));
    for (let i = 1; i < k.length; i++) s.getRange(r, i+1).setValue(k[i]);
  });
  header(s, 'A41:I41', 'MONTH SUMMARY', {size:13, color:C.text});
  const summ = [
    ['MTD Avg AHT','=IFERROR(AVERAGE(D9:D39),"—")'],
    ['MTD Avg CSAT','=IFERROR(AVERAGE(E9:E39),"—")'],
    ['MTD Avg Occ','=IFERROR(AVERAGE(F9:F39),"—")']
  ];
  summ.forEach((x,i) => {
    s.getRange(42+i,1).setValue(x[0]).setFontColor(C.muted);
    s.getRange(42+i,2).setFormula(x[1]).setBackground(C.card).setFontColor(C.gold).setFontWeight('bold');
  });
  s.setFrozenRows(8);
  setRowHeights(s, [1], 44);
}

function buildVision(ss) {
  const s = getOrCreate(ss, SHEETS.VISION, TAB_COLORS.VISION);
  header(s, 'A1:F1', '🌳 VISION — 25-YEAR FAMILY MODEL');
  s.setRowHeight(2, 12);
  header(s, 'A3:F3', 'MISSION', {size:13, color:C.text});
  const mission = [
    'I build for myself and my family first.',
    'I open the door for those who want to walk through it.',
    'I close the door on those who want to break it down.',
    'I do the work. The result belongs to Allah.'
  ];
  mission.forEach((m,i) => {
    s.getRange(4+i,1,1,6).merge().setValue(m)
      .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold')
      .setFontSize(12).setHorizontalAlignment('center');
  });
  s.setFrozenRows(2);
  setRowHeights(s, [1], 44);
}

function buildWeek(ss) {
  const s = getOrCreate(ss, SHEETS.WEEK, TAB_COLORS.WEEK);
  for (let i=2; i<=22; i++) s.setColumnWidth(i, 100);
  header(s, 'A1:V1', '📊 WEEK — 7-DAY EXECUTION VIEW');
  s.setFrozenRows(5);
  setRowHeights(s, [1], 44);
}

function buildCharts(ss) {
  const s = getOrCreate(ss, SHEETS.CHARTS, TAB_COLORS.CHARTS);
  header(s, 'A1:N1', '📉 CHARTS & ANALYTICS');
  s.getCharts().forEach(c => s.removeChart(c));
  setRowHeights(s, [1], 44);
}

function buildMission(ss) {
  const s = getOrCreate(ss, SHEETS.MISSION, TAB_COLORS.MISSION);
  for (let i=1; i<=14; i++) s.setColumnWidth(i, 100);
  const PRG = SHEETS.PROGRESS;
  const HAB = SHEETS.HABITS;
  const SAL = SHEETS.SALAH;
  const SET = SHEETS.SETTINGS;
  const FIN = SHEETS.FINANCE;

  s.getRange('A1:N1').merge().setValue('⚡ SOVEREIGN OPS — MISSION CONTROL')
    .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold')
    .setFontSize(22).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 48);

  s.getRange('A2:N2').merge()
    .setFormula('=\'' + SET + '\'!$B$3 & " · " & TEXT(TODAY(),"MMMM yyyy") & " · " & TEXT(TODAY(),"dddd, dd MMM yyyy")')
    .setBackground(C.bg).setFontColor(C.muted).setFontSize(11).setHorizontalAlignment('center');
  s.setRowHeight(3, 12);

  s.getRange('A4:G4').merge().setValue('TODAY').setBackground(C.card)
    .setFontColor(C.gold).setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');

  s.getRange('A5:G7').merge()
    .setFormula('="This week: "&IFERROR(SUM(\'' + HAB + '\'!J7:J23),0)&" / 98"')
    .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold')
    .setFontSize(20).setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.getRange('A9:G9').merge().setValue('SALAH TODAY').setBackground(C.card)
    .setFontColor(C.muted).setFontSize(9).setHorizontalAlignment('center');
  s.getRange('A10:G10').merge()
    .setFormula('=IFERROR("Score: " & VLOOKUP(TODAY(),\'' + SAL + '\'!$A$6:$L$36,9,FALSE),"Score: —")')
    .setBackground(C.card).setFontColor(C.text).setFontWeight('bold').setHorizontalAlignment('center');
  s.getRange('A11:G11').merge().setValue('SLEEP LAST NIGHT').setBackground(C.card)
    .setFontColor(C.muted).setFontSize(9).setHorizontalAlignment('center');
  s.getRange('A12:G12').merge()
    .setFormula('=IFERROR(VLOOKUP(TODAY()-1,\'' + PRG + '\'!$A$6:$F$36,6,FALSE)&" hrs","—")')
    .setBackground(C.card).setFontColor(C.text).setFontWeight('bold').setHorizontalAlignment('center');

  s.getRange('H4:N4').merge().setValue('WEIGHT JOURNEY').setBackground(C.card)
    .setFontColor(C.gold).setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
  s.getRange('H5:N7').merge()
    .setFormula('=IFERROR(INDEX(\'' + PRG + '\'!$B$6:$B$36, COUNTA(\'' + PRG + '\'!$B$6:$B$36)) & " kg", "— kg")')
    .setBackground(C.card).setFontColor(C.gold).setFontWeight('bold')
    .setFontSize(28).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('H8:N8').merge()
    .setFormula('=IFERROR(ROUND(INDEX(\'' + PRG + '\'!$B$6:$B$36, COUNTA(\'' + PRG + '\'!$B$6:$B$36)) - \'' + SET + '\'!$B$11, 1) & " kg to target", "—")')
    .setBackground(C.card).setFontColor(C.muted).setHorizontalAlignment('center');
  s.getRange('H10:N10').merge()
    .setFormula('=IFERROR(LET(cur, INDEX(\'' + PRG + '\'!$B$6:$B$36, COUNTA(\'' + PRG + '\'!$B$6:$B$36)), start, \'' + SET + '\'!$B$10, target, \'' + SET + '\'!$B$11, pct, MAX(0, MIN(1, (start-cur)/(start-target))), REPT("█", ROUND(pct*20,0)) & REPT("░", 20-ROUND(pct*20,0))), "")')
    .setBackground(C.card).setFontColor(C.success).setHorizontalAlignment('center');

  s.getRange('A15:G15').merge().setValue('STREAKS & SCORE').setBackground(C.card)
    .setFontColor(C.gold).setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
  s.getRange('A17:G18').merge()
    .setValue('Habits_Pro tab → see week counts')
    .setBackground(C.card).setFontColor(C.muted).setFontStyle('italic')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.getRange('H15:N15').merge().setValue('VISION & DEBT PULSE').setBackground(C.card)
    .setFontColor(C.gold).setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
  s.getRange('H17:N18').merge()
    .setFormula('=IFERROR(TEXT(\'' + FIN + '\'!$B$88, "#,##0"), "0")')
    .setBackground(C.card).setFontColor(C.danger).setFontWeight('bold')
    .setFontSize(20).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('H22:N24').merge()
    .setFormula('=INDEX(\'' + SET + '\'!$Z$3:$Z$12, MOD(TODAY()-DATE(2026,1,1), COUNTA(\'' + SET + '\'!$Z$3:$Z$12))+1)')
    .setBackground(C.card).setFontColor(C.gold).setHorizontalAlignment('center')
    .setVerticalAlignment('middle').setWrap(true).setFontSize(10);

  s.getRange('A30:N30').merge().setValue('Last refreshed: —')
    .setFontColor(C.muted).setFontSize(9).setHorizontalAlignment('right');
  s.setFrozenRows(2);
}

// ════════════════════════════════════════════════════════════════════
// 6. ACTIONS
// ════════════════════════════════════════════════════════════════════

function highlightToday() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.HABITS);
  if (!sheet) return;
  const dow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
  const dayCol = 2 + dow;
  try {
    sheet.getRange(5, 3, 19, 7).setBorder(false, false, false, false, false, false);
    sheet.getRange(5, dayCol, 19, 1)
         .setBorder(true, true, true, true, false, false, C.focus, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  } catch (e) { Logger.log('highlightToday skipped: ' + e); }
}

function refreshMission() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SHEETS.MISSION);
  if (!s) return;
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "EEEE, dd MMM yyyy · HH:mm 'PKT'");
  s.getRange('A30:N30').setValue('Last refreshed: ' + stamp);
}

function logTodayPrompt() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prg = ss.getSheetByName(SHEETS.PROGRESS);
  const day = new Date().getDate();
  const r = 5 + day;

  const ask = (q) => {
    const resp = ui.prompt('Log Today', q, ui.ButtonSet.OK_CANCEL);
    if (resp.getSelectedButton() !== ui.Button.OK) return null;
    return resp.getResponseText().trim();
  };

  const fields = [
    ['Weight today (kg)?', 2, parseFloat],
    ['Mood (1-10)?', 3, parseInt],
    ['Motivation (1-10)?', 4, parseInt],
    ['Energy (1-10)?', 5, parseInt],
    ['Sleep last night (hours)?', 6, parseFloat],
    ['Study hours today?', 7, parseFloat]
  ];
  for (const [q, col, fn] of fields) {
    const v = ask(q);
    if (v === null) return;
    if (v) prg.getRange(r, col).setValue(fn(v));
  }
  ui.alert('Today logged.');
}

// ════════════════════════════════════════════════════════════════════
// 7. AUTOMATIONS
// ════════════════════════════════════════════════════════════════════

function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  const value = e.value;

  const autoDateMap = [
    [SHEETS.KPIS, 2, 9, 39],
    [SHEETS.SKILLS, 2, 14, 44]
  ];
  for (const [sn, c, rmin, rmax] of autoDateMap) {
    if (sheetName === sn && col === c && row >= rmin && row <= rmax && value) {
      const dateCell = sheet.getRange(row, 1);
      if (!dateCell.getValue()) {
        dateCell.setValue(new Date()).setNumberFormat('dd MMM yyyy');
      }
    }
  }
}

function installTriggers() {
  const ownHandlers = ['highlightToday', 'refreshMission', 'sendDailyDigest'];
  ScriptApp.getProjectTriggers().forEach(t => {
    if (ownHandlers.indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('highlightToday').timeBased().atHour(0).everyDays(1).create();
  ScriptApp.newTrigger('refreshMission').timeBased().atHour(5).everyDays(1).create();
  ScriptApp.newTrigger('sendDailyDigest').timeBased().atHour(22).everyDays(1).create();
}

// ════════════════════════════════════════════════════════════════════
// 8. EMAIL DIGEST  (FIXED in v5.3 for Habits_Pro v2.1 layout)
// ════════════════════════════════════════════════════════════════════

function sendDailyDigest() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settings = ss.getSheetByName(SHEETS.SETTINGS);
    const habits = ss.getSheetByName(SHEETS.HABITS);
    const progress = ss.getSheetByName(SHEETS.PROGRESS);
    const finance = ss.getSheetByName(SHEETS.FINANCE);

    if (!habits || !progress) {
      Logger.log('sendDailyDigest: required tabs missing — skipping');
      return;
    }

    const name = (settings && settings.getRange('B3').getValue()) || 'Abu Walah';

    // v5.3 FIX: read from Habits_Pro v2.1 layout
    // Today's column = 2 + dayOfWeek (Mon=1, Sun=7)
    const dow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
    const dayCol = 2 + dow;

    // Read habit rows 7-23 (dividers are text, won't match)
    let completed = 0;
    try {
      const dayValues = habits.getRange(7, dayCol, 17, 1).getValues().flat();
      dayValues.forEach(v => {
        if (v === true || v === 'TRUE' || v === '✓') completed++;
      });
    } catch (e) {
      Logger.log('sendDailyDigest habits read failed: ' + e);
    }

    const totalHabits = 14;

    // Latest weight from vitals grid col B
    let weight = '—';
    try {
      const weights = progress.getRange('B6:B36').getValues().flat()
                              .filter(v => typeof v === 'number');
      if (weights.length) weight = weights[weights.length - 1];
    } catch (e) {}

    // Net debt from legacy Finance tab
    let netDebt = '—';
    try {
      if (finance) {
        const v = finance.getRange('B88').getValue();
        if (typeof v === 'number') netDebt = v;
      }
    } catch (e) {}

    const questDay = getQuestDay();
    const subject = 'Sovereign Ops · Day ' + questDay + '/90 · ' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM');

    let body = name + ',\n\n';
    body += 'Day ' + questDay + ' of 90.\n\n';
    body += 'Habits today: ' + completed + ' / ' + totalHabits;
    if (completed >= 12) body += '  ·  Strong day.';
    else if (completed >= 8) body += '  ·  Solid ground.';
    else if (completed >= 4) body += '  ·  Building.';
    else if (completed >= 1) body += '  ·  Started.';
    else body += '  ·  Day still open.';
    body += '\n';
    body += 'Weight: ' + (typeof weight === 'number' ? weight.toFixed(1) + ' kg' : weight) + '\n';
    body += 'Net debt: ' + (typeof netDebt === 'number' ? netDebt.toLocaleString() + ' PKR' : netDebt) + '\n\n';
    body += 'Open dashboard: ' + ss.getUrl() + '\n\n';
    body += 'Bismillah.\n';

    MailApp.sendEmail(Session.getActiveUser().getEmail(), subject, body);
  } catch (e) {
    Logger.log('sendDailyDigest failed: ' + e);
  }
}

// ════════════════════════════════════════════════════════════════════
// 9. LEGENDARY ENGINE (minimal stubs)
// ════════════════════════════════════════════════════════════════════

function setupLegendarySheet() {
  try {
    buildForecastTab();
    buildAlertsTab();
    buildPatternsTab();
    safeAlert('Legendary sheets built.');
  } catch (e) { safeAlert('Error: ' + e.toString()); }
}

function buildForecastTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(LEG_SHEETS.FORECAST);
  if (s) ss.deleteSheet(s);
  s = ss.insertSheet(LEG_SHEETS.FORECAST);
  s.setTabColor('#7C3AED');
  s.getRange('B2').setValue('🔮 SOVEREIGN FORECAST').setFontWeight('bold').setFontSize(18);
  s.getRange('B5').setValue('Day ' + getQuestDay() + ' of 90');
}

function buildAlertsTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(LEG_SHEETS.ALERTS);
  if (s) ss.deleteSheet(s);
  s = ss.insertSheet(LEG_SHEETS.ALERTS);
  s.setTabColor('#DC2626');
  s.getRange('B2').setValue('🚨 ANOMALY DETECTION').setFontWeight('bold').setFontSize(18);
}

function buildPatternsTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(LEG_SHEETS.PATTERNS);
  if (s) ss.deleteSheet(s);
  s = ss.insertSheet(LEG_SHEETS.PATTERNS);
  s.setTabColor('#0EA5E9');
  s.getRange('B2').setValue('🔬 PATTERN FORENSICS').setFontWeight('bold').setFontSize(18);
}

function refreshAlerts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(LEG_SHEETS.ALERTS);
  if (!s) return;
  s.getRange('B6').setValue('Last refreshed: ' + new Date());
}

function refreshPatterns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(LEG_SHEETS.PATTERNS);
  if (!s) return;
  s.getRange('B6').setValue('Last refreshed: ' + new Date());
}

// ════════════════════════════════════════════════════════════════════
// 10. ARCHIVE & RESET
// ════════════════════════════════════════════════════════════════════

function archiveMonth() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Archive current month?', 'Snapshot will be copied.', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tag = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
  ['HABITS','SALAH','PROGRESS','KPIS','SKILLS'].forEach(k => {
    const src = ss.getSheetByName(SHEETS[k]);
    if (src) src.copyTo(ss).setName('📦 ' + SHEETS[k] + ' ' + tag);
  });
  ui.alert('Archive complete.');
}

function monthlyReset() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Start a new month?', 'Did you ARCHIVE first?', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // v5.3: only clear Progress vitals (cols 2-7) + KPIs.
  // Habits/Salah owned by Pro cockpits — don't touch.
  const prg = ss.getSheetByName(SHEETS.PROGRESS);
  if (prg) prg.getRange(6, 2, 31, 6).clearContent();
  const kpi = ss.getSheetByName(SHEETS.KPIS);
  if (kpi) kpi.getRange(9, 2, 31, 8).clearContent();
  ui.alert('New month ready (Progress vitals + KPIs cleared).');
}

// ════════════════════════════════════════════════════════════════════
// MANUAL-RUN WRAPPERS
// ════════════════════════════════════════════════════════════════════

function rebuildMission()    { buildMission(SpreadsheetApp.getActiveSpreadsheet()); refreshMission(); safeAlert('Mission rebuilt.'); }
function rebuildSettings()   { buildSettings(SpreadsheetApp.getActiveSpreadsheet()); safeAlert('Settings rebuilt.'); }
function rebuildSkills()     { buildSkills(SpreadsheetApp.getActiveSpreadsheet()); safeAlert('Skills rebuilt.'); }
function rebuildKnowledge()  { buildKnowledge(SpreadsheetApp.getActiveSpreadsheet()); safeAlert('Knowledge rebuilt.'); }
function rebuildKPIs()       { buildKPIs(SpreadsheetApp.getActiveSpreadsheet()); safeAlert('KPIs rebuilt.'); }
function rebuildVision()     { buildVision(SpreadsheetApp.getActiveSpreadsheet()); safeAlert('Vision rebuilt.'); }
function rebuildWeek()       { buildWeek(SpreadsheetApp.getActiveSpreadsheet()); safeAlert('Week rebuilt.'); }

// ════════════════════════════════════════════════════════════════════
// END Code.gs v5.3 · onOpen lives in Menu_Loader.gs
// AI section → AI.gs · Telegram → Telegram.gs · Web App → WebApp.gs
// ════════════════════════════════════════════════════════════════════
