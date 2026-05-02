// ════════════════════════════════════════════════════════════════════
// ⚡ Mission_Pro.gs v2.0 — UNIFIED MISSION CONTROL · INSIGHTS PATTERN
// LOCKED · 7-Layer Audit · Self-Contained · Day 6 / 90 · 2026-04-29
//
// PURPOSE:
//   The cockpit you open first thing in the morning. Pulls from every
//   sibling Pro module (Habits, Salah, Progress, Finance, KPIs, Debts)
//   into a single bank-grade dashboard with insights section pattern.
//
// ARCHITECTURE:
//   - All formulas read from sibling tabs (Mission writes nothing back)
//   - Layout-locked constants (MISS_R) for sibling-file reference safety
//   - Insights section (rows 32-44): per-domain sparklines + weekly bars
//   - Brother voice nudge bottom (row 56) based on real numbers
//
// 7-LAYER AUDIT
//   L1 5-Test:        ✓ self-contained · safe re-run · failure handled
//   L2 Call Graph:    rebuildMissionCockpit → 7 builders + 5 helpers
//   L3 Row Layout:    no overlap · no circular refs · clean spacers
//   L4 Cell-State:    all read-only · IFERROR wrap · graceful "—"
//   L5 State Order:   clear → trim → widths → sections → freeze
//   L6 Backward Compat: zero deps confirmed (scanMissionDependencies)
//   L7 Failure Modes: missing tabs / empty sources / format errors
//
// REQUIRES (soft - all checked at runtime):
//   - Habits_Pro v2.1 ('📋 Habits')
//   - Salah_Pro v2.1 ('🕌 Salah')
//   - Progress_Pro v2.0 ('📈 Progress')
//   - Finance_Pro v3.0 ('💰 Finance', '💳 Debts')
//   - KPIs ('🎯 KPIs')
//   - Settings ('⚙️ Settings')
// ════════════════════════════════════════════════════════════════════

const MISS_TAB = '⚡ Mission';
const MISS_TOTAL_ROWS = 60;
const MISS_TOTAL_COLS = 12;

// Source tab names
const MISS_SRC = {
  HAB: '📋 Habits',
  SAL: '🕌 Salah',
  PRG: '📈 Progress',
  FIN: '💰 Finance',
  DEB: '💳 Debts',
  KPI: '🎯 KPIs',
  SET: '⚙️ Settings'
};

// Row layout map — single source of truth
const MISS_R = {
  BANNER:       1,
  DATE_SUB:     2,
  SP1:          3,
  KPI_HDR:      4,
  KPI_NAMES:    5,
  KPI_VALUES:   6,
  KPI_BARS:     7,
  SP2:          8,
  VITALS_HDR:   9,
  VITALS_LBL:  10,
  VITALS_VAL:  11,
  VITALS_TARG: 12,
  VITALS_BAR:  13,
  SP3:         14,
  SAL_HDR:     15,
  SAL_LBL:     16,
  SAL_VAL:     17,
  SAL_SCORE:   18,
  SAL_TODAY:   19,
  SP4:         20,
  WORK_HDR:    21,
  WORK_LBL:    22,
  WORK_VAL:    23,
  SP5:         24,
  PILL_HDR:    25,
  PILL_NAMES:  26,
  PILL_PCT:    27,
  PILL_BAR:    28,
  PILL_W:      29,
  PILL_NOTE:   30,
  SP6:         31,
  INS_HDR:     32,
  INS_LBL:     33,
  INS_WT_LBL:  34,
  INS_WT_BAR:  35,
  INS_SAL_LBL: 36,
  INS_SAL_BAR: 37,
  INS_HAB_LBL: 38,
  INS_HAB_BAR: 39,
  INS_STD_LBL: 40,
  INS_STD_BAR: 41,
  INS_AVG_HDR: 42,
  INS_AVG_VAL: 43,
  SP7:         44,
  QUEST_HDR:   45,
  QUEST_LINE:  46,
  QUEST_BAR:   47,
  QUEST_PHASE: 48,
  SP8:         49,
  VERSE_HDR:   50,
  VERSE_TXT:   51,
  SP9:         52,
  NUDGE_HDR:   53,
  NUDGE_TXT:   54,
  SP10:        55,
  STAMP:       56
};

// Color palette — banking-grade dark navy
const MISS_C = {
  BG_PAGE:    '#0A0E1A',
  BG_PANEL:   '#1E293B',
  BG_CARD:    '#334155',
  BG_INPUT:   '#475569',
  HEADER:     '#7C3AED',
  HEADER_TXT: '#FBBF24',
  CARD_TXT:   '#F1F5F9',
  ACCENT:     '#A78BFA',
  MUTED:      '#94A3B8',
  GOOD:       '#10B981',
  WARN:       '#F59E0B',
  BAD:        '#EF4444',
  HERO_BG:    '#581C87',
  HERO_TXT:   '#FBBF24',
  KPI_BG:     '#0F172A',
  KPI_TXT:    '#FBBF24',
  BAR_FULL:   '#10B981',
  BAR_HALF:   '#F59E0B',
  BAR_LOW:    '#EF4444',
  DEEN:       '#16A34A',
  BODY:       '#2563EB',
  KNOW:       '#7C3AED',
  MONEY:      '#D97706',
  FAMILY:     '#EA580C'
};

// ──────────────────────────────────────────────────────────
// MAIN ENTRY
// ──────────────────────────────────────────────────────────

function rebuildMissionCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(MISS_TAB);
  if (!s) s = ss.insertSheet(MISS_TAB);

  // STEP 1 — clear and trim
  s.clear();
  s.clearConditionalFormatRules();
  try { s.clearNotes(); } catch (e) {}
  try { s.getRange(1, 1, s.getMaxRows(), Math.max(MISS_TOTAL_COLS, s.getMaxColumns())).breakApart(); } catch (e) {}
  try { s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations(); } catch (e) {}

  const maxCols = s.getMaxColumns();
  if (maxCols > MISS_TOTAL_COLS) {
    try { s.deleteColumns(MISS_TOTAL_COLS + 1, maxCols - MISS_TOTAL_COLS); } catch (e) {}
  }
  const maxRows = s.getMaxRows();
  if (maxRows > MISS_TOTAL_ROWS) {
    try { s.deleteRows(MISS_TOTAL_ROWS + 1, maxRows - MISS_TOTAL_ROWS); } catch (e) {}
  }
  if (s.getMaxRows() < MISS_TOTAL_ROWS) {
    s.insertRowsAfter(s.getMaxRows(), MISS_TOTAL_ROWS - s.getMaxRows());
  }
  if (s.getMaxColumns() < MISS_TOTAL_COLS) {
    s.insertColumnsAfter(s.getMaxColumns(), MISS_TOTAL_COLS - s.getMaxColumns());
  }

  // STEP 2 — set page background + column widths
  s.getRange(1, 1, MISS_TOTAL_ROWS, MISS_TOTAL_COLS).setBackground(MISS_C.BG_PAGE);
  for (let c = 1; c <= MISS_TOTAL_COLS; c++) s.setColumnWidth(c, 110);

  // STEP 3 — build all 9 sections in order
  _missBuildBanner(s);
  _missBuildKPIStrip(s);
  _missBuildVitals(s);
  _missBuildSalah(s);
  _missBuildWork(s);
  _missBuildPillars(s);
  _missBuildInsights(s);
  _missBuildQuest(s);
  _missBuildVerse(s);
  _missBuildNudge(s);
  _missBuildStamp(s);

  // STEP 4 — spacers
  [MISS_R.SP1, MISS_R.SP2, MISS_R.SP3, MISS_R.SP4, MISS_R.SP5, 
   MISS_R.SP6, MISS_R.SP7, MISS_R.SP8, MISS_R.SP9, MISS_R.SP10].forEach(r => {
    s.setRowHeight(r, 10);
    s.getRange(r, 1, 1, MISS_TOTAL_COLS).setBackground(MISS_C.BG_PAGE);
  });

  // STEP 5 — freeze + gridlines
  try { s.setFrozenRows(2); } catch (e) {}
  try { s.setHiddenGridlines(true); } catch (e) {}

  if (typeof logAuditAction === 'function') {
    logAuditAction('MISSION_REBUILD', 'v2.0 PRO · 11 sections · 60 rows · insights pattern');
  }

  _missAlert('Mission Cockpit v2.0 rebuilt.\n\n' +
             '11 sections live:\n' +
             '  · KPI strip (today / week / month / quest)\n' +
             '  · Vitals snapshot\n' +
             '  · Salah today\n' +
             '  · Work KPIs\n' +
             '  · 5 Pillars\n' +
             '  · Insights (weight, salah, habits, study sparklines)\n' +
             '  · Quest progress\n' +
             '  · Verse of the day\n' +
             '  · Brother voice nudge\n\n' +
             'All formulas pull live from sibling Pro tabs.\n\n' +
             'Bismillah, akhi.');
}

// ──────────────────────────────────────────────────────────
// SECTION BUILDERS
// ──────────────────────────────────────────────────────────

function _missBuildBanner(s) {
  s.getRange(MISS_R.BANNER, 1, 1, MISS_TOTAL_COLS).merge()
    .setFormula('="⚡ MISSION CONTROL  ·  Day "&MAX(1,TODAY()-DATE(2026,4,25)+1)&" of 90"')
    .setBackground(MISS_C.HERO_BG).setFontColor(MISS_C.HERO_TXT)
    .setFontWeight('bold').setFontSize(22)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(MISS_R.BANNER, 60);

  s.getRange(MISS_R.DATE_SUB, 1, 1, MISS_TOTAL_COLS).merge()
    .setFormula('="📅 "&TEXT(TODAY(),"dddd · dd MMMM yyyy")&"   ·   "&' +
                'IF(MAX(1,TODAY()-DATE(2026,4,25)+1)<=30,"Phase 1: Foundation",' +
                'IF(MAX(1,TODAY()-DATE(2026,4,25)+1)<=60,"Phase 2: Build","Phase 3: Sovereign"))')
    .setBackground(MISS_C.BG_PANEL).setFontColor(MISS_C.MUTED)
    .setFontStyle('italic').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(MISS_R.DATE_SUB, 32);
}

function _missBuildKPIStrip(s) {
  _missSectionHeader(s, MISS_R.KPI_HDR, '🎯  TODAY  ·  WEEK  ·  MONTH  ·  QUEST');

  const cards = [
    { name: '✓ TODAY',     col: 1,  span: 3,
      formula: '="Habits "&IFERROR(SUMPRODUCT((\'' + MISS_SRC.HAB + '\'!C7:I23=TRUE)*1),0)+IFERROR(COUNTIF(\'' + MISS_SRC.HAB + '\'!C7:I8,"✓"),0)&"/14"' },
    { name: '📅 WEEK',     col: 4,  span: 3,
      formula: '="Done "&IFERROR(SUM(\'' + MISS_SRC.HAB + '\'!J7:J23),0)&"/98"' },
    { name: '🗓 MONTH',    col: 7,  span: 3,
      formula: '="Net "&IFERROR(TEXT(\'' + MISS_SRC.FIN + '\'!B88,"+#,##0;-#,##0"),"—")&" PKR"' },
    { name: '🏆 QUEST',    col: 10, span: 3,
      formula: '="Day "&MAX(1,TODAY()-DATE(2026,4,25)+1)&"/90"' }
  ];

  cards.forEach(c => {
    // Name row
    s.getRange(MISS_R.KPI_NAMES, c.col, 1, c.span).merge()
      .setValue(c.name).setBackground(MISS_C.BG_CARD)
      .setFontColor(MISS_C.HEADER_TXT).setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Value row
    s.getRange(MISS_R.KPI_VALUES, c.col, 1, c.span).merge()
      .setFormula(c.formula).setBackground(MISS_C.KPI_BG)
      .setFontColor(MISS_C.KPI_TXT).setFontWeight('bold').setFontSize(18)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Bar row
    s.getRange(MISS_R.KPI_BARS, c.col, 1, c.span).merge()
      .setValue('░░░░░░░░░░░░░░░░░░░░')
      .setBackground(MISS_C.BG_CARD).setFontColor(MISS_C.MUTED)
      .setFontFamily('Roboto Mono').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  });

  s.setRowHeight(MISS_R.KPI_NAMES, 24);
  s.setRowHeight(MISS_R.KPI_VALUES, 50);
  s.setRowHeight(MISS_R.KPI_BARS, 18);
}

function _missBuildVitals(s) {
  _missSectionHeader(s, MISS_R.VITALS_HDR, '💪  VITALS  ·  today\'s body + mind state');

  const labels = ['WEIGHT', 'MOOD', 'MOTIV', 'ENERGY', 'SLEEP', 'STUDY'];
  const cols = [2, 3, 4, 5, 6, 7]; // Progress tab cols
  const targets = ['69 kg', '8/10', '8/10', '8/10', '7 h', '1.5 h'];

  for (let i = 0; i < 6; i++) {
    const startCol = 1 + (i * 2);

    // Label
    s.getRange(MISS_R.VITALS_LBL, startCol, 1, 2).merge()
      .setValue(labels[i]).setBackground(MISS_C.BG_CARD)
      .setFontColor(MISS_C.MUTED).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Value (read from today's row in Progress)
    s.getRange(MISS_R.VITALS_VAL, startCol, 1, 2).merge()
      .setFormula('=IFERROR(INDEX(\'' + MISS_SRC.PRG + '\'!' + 
                  _missColLetter(cols[i]) + ':' + _missColLetter(cols[i]) + 
                  ',MATCH(TODAY(),\'' + MISS_SRC.PRG + '\'!A:A,0)),"—")')
      .setBackground(MISS_C.BG_PANEL).setFontColor(MISS_C.HEADER_TXT)
      .setFontWeight('bold').setFontSize(20)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Target
    s.getRange(MISS_R.VITALS_TARG, startCol, 1, 2).merge()
      .setValue('→ ' + targets[i]).setBackground(MISS_C.BG_PANEL)
      .setFontColor(MISS_C.MUTED).setFontStyle('italic').setFontSize(9)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }

  s.setRowHeight(MISS_R.VITALS_LBL, 22);
  s.setRowHeight(MISS_R.VITALS_VAL, 44);
  s.setRowHeight(MISS_R.VITALS_TARG, 20);
  s.setRowHeight(MISS_R.VITALS_BAR, 4);
}

function _missBuildSalah(s) {
  _missSectionHeader(s, MISS_R.SAL_HDR, '🕌  SALAH TODAY  ·  Fajr · Dhuhr · Asr · Maghrib · Isha');

  const prayers = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];
  const cols = [2, 3, 4, 5, 6]; // Salah tab cols

  for (let i = 0; i < 5; i++) {
    const startCol = 1 + Math.floor((i * 12) / 5);
    const span = (i === 4) ? (12 - startCol + 1) : Math.floor(12 / 5);

    // Label
    s.getRange(MISS_R.SAL_LBL, startCol, 1, span).merge()
      .setValue(prayers[i]).setBackground(MISS_C.BG_CARD)
      .setFontColor(MISS_C.MUTED).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Value (location code from today's row in Salah)
    s.getRange(MISS_R.SAL_VAL, startCol, 1, span).merge()
      .setFormula('=IFERROR(INDEX(\'' + MISS_SRC.SAL + '\'!' + 
                  _missColLetter(cols[i]) + ':' + _missColLetter(cols[i]) + 
                  ',MATCH(TODAY(),\'' + MISS_SRC.SAL + '\'!A:A,0)),"—")')
      .setBackground(MISS_C.BG_PANEL).setFontColor(MISS_C.HEADER_TXT)
      .setFontWeight('bold').setFontSize(18)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  }

  // Score row (cols 1-6)
  s.getRange(MISS_R.SAL_SCORE, 1, 1, 6).merge()
    .setFormula('="Today\'s score: "&IFERROR(INDEX(\'' + MISS_SRC.SAL + 
                '\'!I:I,MATCH(TODAY(),\'' + MISS_SRC.SAL + '\'!A:A,0)),"—")&" / 10"')
    .setBackground(MISS_C.BG_CARD).setFontColor(MISS_C.GOOD)
    .setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Streak row (cols 7-12)
  s.getRange(MISS_R.SAL_SCORE, 7, 1, 6).merge()
    .setFormula('="Fajr@Masjid this week: "&IFERROR(\'' + MISS_SRC.HAB + '\'!J7,0)&" / 7"')
    .setBackground(MISS_C.BG_CARD).setFontColor(MISS_C.DEEN)
    .setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Hint row
  s.getRange(MISS_R.SAL_TODAY, 1, 1, 12).merge()
    .setValue('Codes: M=Masjid · J=Jamaat · H=Home · W=Work · WU/HU=valid reason · L=Late · Q=Qaza')
    .setBackground(MISS_C.BG_PANEL).setFontColor(MISS_C.MUTED)
    .setFontStyle('italic').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.setRowHeight(MISS_R.SAL_LBL, 22);
  s.setRowHeight(MISS_R.SAL_VAL, 40);
  s.setRowHeight(MISS_R.SAL_SCORE, 26);
  s.setRowHeight(MISS_R.SAL_TODAY, 18);
}

function _missBuildWork(s) {
  _missSectionHeader(s, MISS_R.WORK_HDR, '💼  WORK  ·  Motive Tier 1 KPIs (MTD)');

  const kpis = [
    { name: 'AHT (min)',  col: 1, span: 4, formula: '=IFERROR(\'' + MISS_SRC.KPI + '\'!B42, "—")', target: '≤ 9.7' },
    { name: 'CSAT (%)',   col: 5, span: 4, formula: '=IFERROR(\'' + MISS_SRC.KPI + '\'!B43, "—")', target: '≥ 97' },
    { name: 'OCC (%)',    col: 9, span: 4, formula: '=IFERROR(\'' + MISS_SRC.KPI + '\'!B44, "—")', target: '≥ 87.15' }
  ];

  kpis.forEach(k => {
    // Label + target combo
    s.getRange(MISS_R.WORK_LBL, k.col, 1, k.span).merge()
      .setValue(k.name + '   target ' + k.target).setBackground(MISS_C.BG_CARD)
      .setFontColor(MISS_C.MUTED).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Value
    s.getRange(MISS_R.WORK_VAL, k.col, 1, k.span).merge()
      .setFormula(k.formula).setBackground(MISS_C.BG_PANEL)
      .setFontColor(MISS_C.HEADER_TXT).setFontWeight('bold').setFontSize(22)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setNumberFormat('0.00');
  });

  s.setRowHeight(MISS_R.WORK_LBL, 22);
  s.setRowHeight(MISS_R.WORK_VAL, 50);
}

function _missBuildPillars(s) {
  _missSectionHeader(s, MISS_R.PILL_HDR, '🎯  THIS WEEK\'S 5 PILLARS  ·  Deen 30% · Body 20% · Know 20% · Money 20% · Family 10%');

  const pillars = [
    { name: '🕌 DEEN', col: 1, span: 2, color: MISS_C.DEEN, weight: '30%',
      formula: '=IFERROR(ROUND(SUM(\'' + MISS_SRC.HAB + '\'!J7:J11)/35*100,0),0)' },
    { name: '💪 BODY', col: 3, span: 2, color: MISS_C.BODY, weight: '20%',
      formula: '=IFERROR(ROUND(SUM(\'' + MISS_SRC.HAB + '\'!J13:J16)/28*100,0),0)' },
    { name: '🧠 KNOW', col: 5, span: 2, color: MISS_C.KNOW, weight: '20%',
      formula: '=IFERROR(ROUND(SUM(\'' + MISS_SRC.HAB + '\'!J18:J20)/21*100,0),0)' },
    { name: '💰 MONEY', col: 7, span: 3, color: MISS_C.MONEY, weight: '20%',
      formula: '=IFERROR(\'' + MISS_SRC.PRG + '\'!G54,0)' },
    { name: '🌳 FAMILY', col: 10, span: 3, color: MISS_C.FAMILY, weight: '10%',
      formula: '=IFERROR(\'' + MISS_SRC.PRG + '\'!J54,0)' }
  ];

  pillars.forEach(p => {
    // Name
    s.getRange(MISS_R.PILL_NAMES, p.col, 1, p.span).merge()
      .setValue(p.name).setBackground(p.color).setFontColor('#FFFFFF')
      .setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Score
    s.getRange(MISS_R.PILL_PCT, p.col, 1, p.span).merge()
      .setFormula(p.formula).setBackground(MISS_C.BG_PANEL)
      .setFontColor(MISS_C.HEADER_TXT).setFontWeight('bold').setFontSize(28)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setNumberFormat('0"%"');

    // Bar
    const cellAddr = _missColLetter(p.col) + MISS_R.PILL_PCT;
    s.getRange(MISS_R.PILL_BAR, p.col, 1, p.span).merge()
      .setFormula('=REPT("█",ROUND(' + cellAddr + '/10,0))&REPT("░",10-ROUND(' + cellAddr + '/10,0))')
      .setBackground(MISS_C.BG_PANEL).setFontColor(MISS_C.BAR_FULL)
      .setFontFamily('Roboto Mono').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Weight label
    s.getRange(MISS_R.PILL_W, p.col, 1, p.span).merge()
      .setValue(p.weight + ' weight').setBackground(MISS_C.BG_CARD)
      .setFontColor(MISS_C.MUTED).setFontStyle('italic').setFontSize(9)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  });

  // Composite note
  const compFormula = '="Composite day score: "&IFERROR(ROUND((A' + MISS_R.PILL_PCT + 
                      '*0.3+C' + MISS_R.PILL_PCT + '*0.2+E' + MISS_R.PILL_PCT + 
                      '*0.2+G' + MISS_R.PILL_PCT + '*0.2+J' + MISS_R.PILL_PCT + '*0.1),0),"—")&"%"';
  s.getRange(MISS_R.PILL_NOTE, 1, 1, MISS_TOTAL_COLS).merge()
    .setFormula(compFormula).setBackground(MISS_C.HERO_BG)
    .setFontColor(MISS_C.HERO_TXT).setFontWeight('bold').setFontSize(14)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.setRowHeight(MISS_R.PILL_NAMES, 24);
  s.setRowHeight(MISS_R.PILL_PCT, 56);
  s.setRowHeight(MISS_R.PILL_BAR, 22);
  s.setRowHeight(MISS_R.PILL_W, 18);
  s.setRowHeight(MISS_R.PILL_NOTE, 32);
}

function _missBuildInsights(s) {
  _missSectionHeader(s, MISS_R.INS_HDR, '📊  INSIGHTS  ·  7-day trends · sparklines from your real data');

  // Section sub-label
  s.getRange(MISS_R.INS_LBL, 1, 1, MISS_TOTAL_COLS).merge()
    .setValue('Each bar = one day. Last 7 days. Higher = better (except weight).')
    .setBackground(MISS_C.BG_PANEL).setFontColor(MISS_C.MUTED)
    .setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(MISS_R.INS_LBL, 22);

  // Weight sparkline (last 7 days from Progress col B)
  s.getRange(MISS_R.INS_WT_LBL, 1, 1, 3).merge()
    .setValue('💪 WEIGHT (kg)').setBackground(MISS_C.BG_CARD)
    .setFontColor(MISS_C.BODY).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.getRange(MISS_R.INS_WT_LBL, 4, 1, 9).merge()
    .setFormula('=SPARKLINE(QUERY(\'' + MISS_SRC.PRG + '\'!A6:B36,"select B where A is not null and B is not null order by A desc limit 7"),{"charttype","line";"color1","#2563EB";"linewidth",2;"empty","ignore"})')
    .setBackground(MISS_C.BG_PANEL).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Salah score sparkline (last 7 days from Salah col I)
  s.getRange(MISS_R.INS_SAL_LBL, 1, 1, 3).merge()
    .setValue('🕌 SALAH (/10)').setBackground(MISS_C.BG_CARD)
    .setFontColor(MISS_C.DEEN).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.getRange(MISS_R.INS_SAL_LBL, 4, 1, 9).merge()
    .setFormula('=SPARKLINE(QUERY(\'' + MISS_SRC.SAL + '\'!A6:I36,"select I where A is not null and I > 0 order by A desc limit 7"),{"charttype","column";"color1","#16A34A";"empty","zero"})')
    .setBackground(MISS_C.BG_PANEL).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Habit completion bars (this week from Habits cols C-I)
  s.getRange(MISS_R.INS_HAB_LBL, 1, 1, 3).merge()
    .setValue('📋 HABITS (Mon-Sun)').setBackground(MISS_C.BG_CARD)
    .setFontColor(MISS_C.HEADER_TXT).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.getRange(MISS_R.INS_HAB_LBL, 4, 1, 9).merge()
    .setFormula('=SPARKLINE({COUNTIF(\'' + MISS_SRC.HAB + '\'!C7:C23,TRUE)+COUNTIF(\'' + MISS_SRC.HAB + '\'!C7:C8,"✓");COUNTIF(\'' + MISS_SRC.HAB + '\'!D7:D23,TRUE)+COUNTIF(\'' + MISS_SRC.HAB + '\'!D7:D8,"✓");COUNTIF(\'' + MISS_SRC.HAB + '\'!E7:E23,TRUE)+COUNTIF(\'' + MISS_SRC.HAB + '\'!E7:E8,"✓");COUNTIF(\'' + MISS_SRC.HAB + '\'!F7:F23,TRUE)+COUNTIF(\'' + MISS_SRC.HAB + '\'!F7:F8,"✓");COUNTIF(\'' + MISS_SRC.HAB + '\'!G7:G23,TRUE)+COUNTIF(\'' + MISS_SRC.HAB + '\'!G7:G8,"✓");COUNTIF(\'' + MISS_SRC.HAB + '\'!H7:H23,TRUE)+COUNTIF(\'' + MISS_SRC.HAB + '\'!H7:H8,"✓");COUNTIF(\'' + MISS_SRC.HAB + '\'!I7:I23,TRUE)+COUNTIF(\'' + MISS_SRC.HAB + '\'!I7:I8,"✓")},{"charttype","column";"color1","#7C3AED";"empty","zero"})')
    .setBackground(MISS_C.BG_PANEL).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Study sparkline (last 7 days from Progress col G)
  s.getRange(MISS_R.INS_STD_LBL, 1, 1, 3).merge()
    .setValue('📚 STUDY (hrs)').setBackground(MISS_C.BG_CARD)
    .setFontColor(MISS_C.KNOW).setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.getRange(MISS_R.INS_STD_LBL, 4, 1, 9).merge()
    .setFormula('=SPARKLINE(QUERY(\'' + MISS_SRC.PRG + '\'!A6:G36,"select G where A is not null and G > 0 order by A desc limit 7"),{"charttype","column";"color1","#7C3AED";"empty","zero"})')
    .setBackground(MISS_C.BG_PANEL).setHorizontalAlignment('center').setVerticalAlignment('middle');

  // 7-day averages summary
  s.getRange(MISS_R.INS_AVG_HDR, 1, 1, MISS_TOTAL_COLS).merge()
    .setValue('📊  7-DAY AVERAGES')
    .setBackground(MISS_C.BG_CARD).setFontColor(MISS_C.HEADER_TXT)
    .setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.getRange(MISS_R.INS_AVG_VAL, 1, 1, MISS_TOTAL_COLS).merge()
    .setFormula('="Sleep "&IFERROR(ROUND(AVERAGE(\'' + MISS_SRC.PRG + '\'!F6:F36),1),"—")&"h  ·  Mood "&IFERROR(ROUND(AVERAGE(\'' + MISS_SRC.PRG + '\'!C6:C36),1),"—")&"  ·  Energy "&IFERROR(ROUND(AVERAGE(\'' + MISS_SRC.PRG + '\'!E6:E36),1),"—")&"  ·  Study total "&IFERROR(ROUND(SUM(\'' + MISS_SRC.PRG + '\'!G6:G36),1),0)&"h"')
    .setBackground(MISS_C.BG_PANEL).setFontColor(MISS_C.CARD_TXT)
    .setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  [MISS_R.INS_WT_LBL, MISS_R.INS_SAL_LBL, MISS_R.INS_HAB_LBL, MISS_R.INS_STD_LBL].forEach(r => s.setRowHeight(r, 32));
  s.setRowHeight(MISS_R.INS_AVG_HDR, 24);
  s.setRowHeight(MISS_R.INS_AVG_VAL, 26);
}

function _missBuildQuest(s) {
  _missSectionHeader(s, MISS_R.QUEST_HDR, '🏆  90-DAY SOVEREIGN QUEST');

  const questLineF = '="Day "&MAX(1,TODAY()-DATE(2026,4,25)+1)&" of 90    ·    "&' +
                     'ROUND((TODAY()-DATE(2026,4,25))/90*100,1)&"% complete    ·    "&' +
                     'MAX(0,90-(TODAY()-DATE(2026,4,25)))&" days remaining"';

  s.getRange(MISS_R.QUEST_LINE, 1, 1, MISS_TOTAL_COLS).merge()
    .setFormula(questLineF).setBackground(MISS_C.BG_PANEL)
    .setFontColor(MISS_C.ACCENT).setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  const questBarF = '=REPT("█",ROUND((TODAY()-DATE(2026,4,25))/90*60,0))&REPT("░",60-ROUND((TODAY()-DATE(2026,4,25))/90*60,0))';
  s.getRange(MISS_R.QUEST_BAR, 1, 1, MISS_TOTAL_COLS).merge()
    .setFormula(questBarF).setBackground(MISS_C.BG_PANEL)
    .setFontColor(MISS_C.ACCENT).setFontFamily('Roboto Mono').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  const phaseF = '=IF(MAX(1,TODAY()-DATE(2026,4,25)+1)<=30,"Phase 1: Foundation — building the floor",' +
                 'IF(MAX(1,TODAY()-DATE(2026,4,25)+1)<=60,"Phase 2: Build — adding the walls","Phase 3: Sovereign — closing the roof"))';
  s.getRange(MISS_R.QUEST_PHASE, 1, 1, MISS_TOTAL_COLS).merge()
    .setFormula(phaseF).setBackground(MISS_C.BG_CARD)
    .setFontColor(MISS_C.GOOD).setFontStyle('italic').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.setRowHeight(MISS_R.QUEST_LINE, 30);
  s.setRowHeight(MISS_R.QUEST_BAR, 26);
  s.setRowHeight(MISS_R.QUEST_PHASE, 22);
}

function _missBuildVerse(s) {
  _missSectionHeader(s, MISS_R.VERSE_HDR, '📖  VERSE OF THE DAY');

  s.getRange(MISS_R.VERSE_TXT, 1, 1, MISS_TOTAL_COLS).merge()
    .setFormula('=IFERROR(INDEX(\'' + MISS_SRC.SET + '\'!Z3:Z12,MOD(TODAY()-DATE(2026,1,1),COUNTA(\'' + MISS_SRC.SET + '\'!Z3:Z12))+1),"In the remembrance of Allah do hearts find rest. — Quran 13:28")')
    .setBackground(MISS_C.BG_PANEL).setFontColor(MISS_C.HEADER_TXT)
    .setFontStyle('italic').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(MISS_R.VERSE_TXT, 60);
}

function _missBuildNudge(s) {
  _missSectionHeader(s, MISS_R.NUDGE_HDR, '🤲  TODAY\'S NUDGE  ·  one move that shifts the day');

  // Brother voice nudge based on real data
  const nudgeF = '=' +
    'IF(IFERROR(INDEX(\'' + MISS_SRC.SAL + '\'!B:B,MATCH(TODAY(),\'' + MISS_SRC.SAL + '\'!A:A,0)),"")="M",' +
      '"Fajr at Masjid is locked. Now build the rest of the day around it.",' +
    'IF(IFERROR(SUM(\'' + MISS_SRC.HAB + '\'!J7:J23),0)>=70,' +
      '"Strong week. Protect the rhythm — sleep 7h tonight, no late scroll.",' +
    'IF(IFERROR(\'' + MISS_SRC.FIN + '\'!B85,0)>200000,' +
      '"Snowball is the move. One small payment to the smallest creditor today shifts everything.",' +
    'IF(IFERROR(INDEX(\'' + MISS_SRC.PRG + '\'!G:G,MATCH(TODAY(),\'' + MISS_SRC.PRG + '\'!A:A,0)),0)<1,' +
      '"Even 20 minutes of SQL or Python today is movement. Knowledge compounds.",' +
      '"The day is yours, akhi. Pick one small thing and start there.")))) ';

  s.getRange(MISS_R.NUDGE_TXT, 1, 1, MISS_TOTAL_COLS).merge()
    .setFormula(nudgeF).setBackground(MISS_C.HERO_BG)
    .setFontColor(MISS_C.HERO_TXT).setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(MISS_R.NUDGE_TXT, 50);
}

function _missBuildStamp(s) {
  s.getRange(MISS_R.STAMP, 1, 1, MISS_TOTAL_COLS).merge()
    .setFormula('="Last refreshed: "&TEXT(NOW(),"EEEE, dd MMM yyyy · HH:mm")&" PKT  ·  Mission_Pro v2.0"')
    .setBackground(MISS_C.BG_PAGE).setFontColor(MISS_C.MUTED)
    .setFontStyle('italic').setFontSize(9)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');
  s.setRowHeight(MISS_R.STAMP, 22);
}

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────

function _missSectionHeader(s, row, label) {
  s.getRange(row, 1, 1, MISS_TOTAL_COLS).merge()
    .setValue(label).setBackground(MISS_C.HEADER)
    .setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(row, 32);
}

function _missColLetter(col) {
  let s = '';
  while (col > 0) {
    let m = (col - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

function _missAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
}

// ──────────────────────────────────────────────────────────
// REFRESH (cheap re-stamp without rebuild)
// ──────────────────────────────────────────────────────────

function refreshMissionCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(MISS_TAB);
  if (!s) { _missAlert('Mission tab not found. Run rebuildMissionCockpit first.'); return; }
  s.getRange(MISS_R.STAMP, 1, 1, MISS_TOTAL_COLS).setFormula(
    '="Last refreshed: "&TEXT(NOW(),"EEEE, dd MMM yyyy · HH:mm")&" PKT  ·  Mission_Pro v2.0"'
  );
}

// ──────────────────────────────────────────────────────────
// VERIFY
// ──────────────────────────────────────────────────────────

function verifyMissionCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(MISS_TAB);
  if (!s) { _missAlert('Mission tab not found.'); return; }

  let report = 'MISSION_PRO v2.0 INTEGRITY\n\n';

  // Check section headers
  const sections = [
    { row: MISS_R.BANNER, name: 'Banner' },
    { row: MISS_R.KPI_HDR, name: 'KPI Strip' },
    { row: MISS_R.VITALS_HDR, name: 'Vitals' },
    { row: MISS_R.SAL_HDR, name: 'Salah' },
    { row: MISS_R.WORK_HDR, name: 'Work' },
    { row: MISS_R.PILL_HDR, name: 'Pillars' },
    { row: MISS_R.INS_HDR, name: 'Insights' },
    { row: MISS_R.QUEST_HDR, name: 'Quest' },
    { row: MISS_R.VERSE_HDR, name: 'Verse' },
    { row: MISS_R.NUDGE_HDR, name: 'Nudge' }
  ];

  let ok = 0;
  sections.forEach(sec => {
    const v = s.getRange(sec.row, 1).getValue();
    if (v && String(v).length > 0) {
      report += '✓ Row ' + sec.row + ' — ' + sec.name + '\n';
      ok++;
    } else {
      report += '✗ Row ' + sec.row + ' — ' + sec.name + ' MISSING\n';
    }
  });

  report += '\n' + ok + '/' + sections.length + ' sections healthy.\n\n';

  // Check sibling tabs
  report += 'Sibling tabs:\n';
  Object.keys(MISS_SRC).forEach(key => {
    const tab = ss.getSheetByName(MISS_SRC[key]);
    report += (tab ? '✓ ' : '✗ ') + MISS_SRC[key] + '\n';
  });

  _missAlert(report);
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendMissionMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('⚡ Mission')
      .addItem('🔄 Rebuild Cockpit (full)', 'rebuildMissionCockpit')
      .addItem('🔄 Refresh Timestamp', 'refreshMissionCockpit')
      .addSeparator()
      .addItem('🔍 Verify Cockpit', 'verifyMissionCockpit')
      .addToUi();
  } catch (e) { Logger.log('Mission menu failed: ' + e); }
}