// ════════════════════════════════════════════════════════════════════
// 📈 Progress_Pro.gs v2.0 — HYBRID: VITALS GRID + PILLAR SCOREBOARD
// LOCKED · 7-Layer Audit · Self-Contained · Day 6 / 90 · 2026-04-29
//
// CHANGES FROM v1.2:
//   - VITALS GRID at rows 6-36 cols 1-7 PRESERVED across rebuilds.
//     /weight, /mood, /motiv, /energy, /sleep, /study from Telegram.gs
//     write to row 5+dayOfMonth, cols 2-7 — those cells now stay alive.
//   - PILLAR SCOREBOARD moved to row 38+ (no overlap with vitals).
//   - Pillar formulas now read from Habits_Pro v2.1 layout:
//       · Deen      30% — SUM('📋 Habits'!J7:J11)/35    (5 mirror habits × 7d)
//       · Body      20% — SUM('📋 Habits'!J13:J16)/28   (4 habits × 7d)
//       · Knowledge 20% — SUM('📋 Habits'!J18:J20)/21   (3 MIND habits × 7d)
//       · Money     20% — manual cell G54 (yellow editable, 0-100)
//       · Family    10% — manual cell J54 (yellow editable, 0-100)
//   - REMOVED v1.2 OFFSET/DAY(TODAY()) bug (overflowed past col I after
//     day 8 of any month → pillars stuck at 0% forever).
//   - REMOVED v1.2 COUNTIF(range,1) bug (didn't count TRUE checkboxes
//     or ✓ Salah mirror text). SUM of col J handles both natively.
//   - PRESERVE manual money/family + ALL vitals data across rebuilds.
//
// 7-LAYER AUDIT
// L1 — 5-TEST: Self-contained ✓ · Side-effects ✓ · Re-run safe ✓ ·
//        Mentally traced ✓ · Failure modes mapped ✓
// L2 — CALL GRAPH:
//   rebuildProgressCockpit
//     ├── _progReadVitalsBackup    (rows 6-36 cols 2-7 + col 12 notes)
//     ├── _progReadManualCells     (G54, J54)
//     ├── sheet.clear / trim / setColumnWidth
//     ├── _progBuildBanner         (rows 1-2)
//     ├── _progBuildVitalsGrid     (rows 4-36)  ← contract preserved
//     ├── _progBuildPillarSection  (rows 38-42)
//     ├── _progBuildCompositeSection (rows 44-46)
//     ├── _progBuildQuestSection   (rows 48-50)
//     ├── _progBuildManualSection  (rows 52-55)
//     ├── _progBuildBreakdownSection (rows 57-62)
//     ├── _progRestoreVitals       (write backup back into cells)
//     ├── _progRestoreManual       (G54, J54 with defaults)
//     ├── (data validation on manual cells)
//     ├── _progSpacers / freeze / hide gridlines
//     └── _progAlert
// L3 — ROW LAYOUT MAP:
//   1     Banner (full-width)
//   2     Date sub (full-width)
//   3     spacer
//   4     "📊 DAILY VITALS — auto-logged via Telegram" header
//   5     Column headers (DATE/WEIGHT/MOOD/MOTIV/ENERGY/SLEEP/STUDY/...)
//   6-36  31 daily rows · COLS 2-7 = WRITE TARGETS for /weight etc
//   37    spacer
//   38    "🎯 THIS WEEK'S PILLAR SCORES" header
//   39    Pillar names row
//   40    Pillar scores row (formulas)
//   41    Pillar bars row
//   42    Pillar source caption
//   43    spacer
//   44    "🏆 COMPOSITE DAY SCORE" header
//   45    Composite score (big)
//   46    Composite bar
//   47    spacer
//   48    "🎯 90-DAY SOVEREIGN QUEST" header
//   49    Quest line
//   50    Quest bar
//   51    spacer
//   52    "✏️ MANUAL ENTRY" header
//   53    Money + Family sub-headers
//   54    Money + Family yellow cells (G54, J54)
//   55    Help text
//   56    spacer
//   57    "🔍 PILLAR BREAKDOWN" header
//   58    Deen breakdown
//   59    Body breakdown
//   60    Knowledge breakdown
//   61    Money breakdown
//   62    Family breakdown
// L4 — CELL-STATE MATRIX:
//   - rows 6-36 cols 2-7: number from /weight etc OR blank
//   - row 40 cols 1,3,5: formula (SUM divided by max × 100)
//   - row 40 col 7: formula =G54
//   - row 40 col 10: formula =J54
//   - row 54 col 7: number 0-100 (validated)
//   - row 54 col 10: number 0-100 (validated)
// L5 — STATE-ORDER PROOF:
//   read vitals backup → read manual → clear sheet → trim → set widths
//   → build all sections (with spacer rows) → write vitals back into
//   rows 6-36 cols 2-7 → write manual back into 54 → set validation
//   → freeze rows → hide gridlines → alert
// L6 — BACKWARD-COMPAT:
//   - Telegram.gs cmdWeight (PRG.row=5+day, col=2) ✓
//   - Telegram.gs cmdLogScale mood/motiv/energy (cols 3,4,5) ✓
//   - Telegram.gs cmdSleep (col 6) · cmdStudy (col 7) ✓
//   - Telegram.gs cmdToday reads cols 2-7 rows 6-36 ✓
//   - Telegram.gs cmdPillars reads B6:B36, G6:G36 ✓
//   - AI.gs buildSovereignContext reads cols 2-7 rows 6-36 ✓
//   - Habits_Pro v2.1 layout (J7:J11, J13:J16, J18:J20) ✓
// L7 — FAILURE MODES:
//   - Sheet missing → inserted as new
//   - Vitals empty → blank cells (no error)
//   - Habits tab missing → SUM returns 0 → pillar 0% (graceful)
//   - Manual cells empty on first run → defaults to 50
//   - Re-run safe: every rebuild preserves vitals + manual data
//
// REQUIRES:
//   - Code.gs (SHEETS, getQuestDay, safeAlert) — soft requirement
//   - Habits_Pro v2.1 ('📋 Habits' col J row 7-23 = week counts)
// ════════════════════════════════════════════════════════════════════

const PROG_TAB = '📈 Progress';
const PROG_HABITS_SOURCE = '📋 Habits';
const PROG_TOTAL_ROWS = 62;
const PROG_TOTAL_COLS = 12;

const PROG_R = {
  BANNER:        1,
  DATE_SUB:      2,
  SP1:           3,
  VITALS_HDR:    4,
  VITALS_COLS:   5,
  VITALS_START:  6,
  VITALS_END:    36,
  SP2:           37,
  PILL_HDR:      38,
  PILL_NAME:     39,
  PILL_SCORE:    40,
  PILL_BAR:      41,
  PILL_SOURCE:   42,
  SP3:           43,
  COMP_HDR:      44,
  COMP_SCORE:    45,
  COMP_BAR:      46,
  SP4:           47,
  QUEST_HDR:     48,
  QUEST_LINE:    49,
  QUEST_BAR:     50,
  SP5:           51,
  MAN_HDR:       52,
  MAN_SUB:       53,
  MAN_CELL:      54,
  MAN_HELP:      55,
  SP6:           56,
  BREAK_HDR:     57,
  BREAK_DEEN:    58,
  BREAK_BODY:    59,
  BREAK_KNOW:    60,
  BREAK_MONEY:   61,
  BREAK_FAMILY:  62
};

const PROG_C = {
  BG_DARK:    '#0F172A',
  BG_PANEL:   '#1E293B',
  BG_CARD:    '#334155',
  HEADER:     '#7C3AED',
  HEADER_TXT: '#FBBF24',
  CARD_TXT:   '#F1F5F9',
  EDIT:       '#FEF3C7',
  EDIT_TXT:   '#0F172A',
  BAR_FULL:   '#10B981',
  ACCENT:     '#A78BFA',
  MUTED:      '#94A3B8',
  GOOD:       '#10B981',
  WARN:       '#F59E0B',
  BAD:        '#EF4444',
  HERO_BG:    '#581C87',
  HERO_TXT:   '#FBBF24',
  VITALS_HDR: '#0EA5E9',
  VITALS_BG:  '#FFFFFF',
  VITALS_TXT: '#0F172A',
  VITALS_ALT: '#F1F5F9'
};

// ──────────────────────────────────────────────────────────
// MAIN ENTRY
// ──────────────────────────────────────────────────────────

function rebuildProgressCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PROG_TAB);
  if (!sheet) sheet = ss.insertSheet(PROG_TAB);

  // STEP 1 — backup vitals (rows 6-36 cols 2-7) + notes (col 12) + manual cells
  const vitalsBackup = _progReadVitalsBackup(sheet);
  const notesBackup = _progReadNotesBackup(sheet);
  const prevMoney = _progReadManualCell(sheet, PROG_R.MAN_CELL, 7);
  const prevFamily = _progReadManualCell(sheet, PROG_R.MAN_CELL, 10);

  // STEP 2 — clear and trim
  sheet.clear();
  sheet.clearConditionalFormatRules();
  try { sheet.clearNotes(); } catch (e) {}
  try { sheet.getRange(1, 1, sheet.getMaxRows(), Math.max(PROG_TOTAL_COLS, sheet.getMaxColumns())).breakApart(); } catch (e) {}
  try { sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations(); } catch (e) {}

  const maxCols = sheet.getMaxColumns();
  if (maxCols > PROG_TOTAL_COLS) {
    try { sheet.deleteColumns(PROG_TOTAL_COLS + 1, maxCols - PROG_TOTAL_COLS); } catch (e) {}
  }

  const maxRows = sheet.getMaxRows();
  if (maxRows > PROG_TOTAL_ROWS) {
    try { sheet.deleteRows(PROG_TOTAL_ROWS + 1, maxRows - PROG_TOTAL_ROWS); } catch (e) {}
  }
  if (sheet.getMaxRows() < PROG_TOTAL_ROWS) {
    sheet.insertRowsAfter(sheet.getMaxRows(), PROG_TOTAL_ROWS - sheet.getMaxRows());
  }

    if (sheet.getMaxColumns() < PROG_TOTAL_COLS) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), PROG_TOTAL_COLS - sheet.getMaxColumns());
  }

  // STEP 3 — column widths
  sheet.setColumnWidth(1, 90);    // DATE
  sheet.setColumnWidth(2, 90);    // WEIGHT
  sheet.setColumnWidth(3, 80);    // MOOD
  sheet.setColumnWidth(4, 80);    // MOTIV
  sheet.setColumnWidth(5, 80);    // ENERGY
  sheet.setColumnWidth(6, 80);    // SLEEP
  sheet.setColumnWidth(7, 80);    // STUDY
  sheet.setColumnWidth(8, 90);    // DEEN%
  sheet.setColumnWidth(9, 90);    // DISC%
  sheet.setColumnWidth(10, 90);   // OVERALL%
  sheet.setColumnWidth(11, 90);   // SALAH
  sheet.setColumnWidth(12, 140);  // NOTES

  // STEP 4 — build all sections
  _progBuildBanner(sheet);
  _progBuildVitalsGrid(sheet);
  _progBuildPillarSection(sheet);
  _progBuildCompositeSection(sheet);
  _progBuildQuestSection(sheet);
  _progBuildManualSection(sheet);
  _progBuildBreakdownSection(sheet);

  // STEP 5 — restore vitals data
  _progRestoreVitals(sheet, vitalsBackup);
  _progRestoreNotes(sheet, notesBackup);

  // STEP 6 — restore manual cells (or seed defaults)
  sheet.getRange(PROG_R.MAN_CELL, 7, 1, 3).merge()
    .setValue(prevMoney !== null ? prevMoney : 50);
  sheet.getRange(PROG_R.MAN_CELL, 10, 1, 3).merge()
    .setValue(prevFamily !== null ? prevFamily : 50);

  // Re-apply manual cell styling AFTER setValue
  [7, 10].forEach(col => {
    sheet.getRange(PROG_R.MAN_CELL, col)
      .setBackground(PROG_C.EDIT)
      .setFontColor(PROG_C.EDIT_TXT)
      .setFontWeight('bold')
      .setFontSize(28)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setNumberFormat('0"%"');
  });

  // STEP 7 — validation on manual cells
  const numRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 100)
    .setAllowInvalid(false)
    .setHelpText('Enter 0-100')
    .build();
  sheet.getRange(PROG_R.MAN_CELL, 7).setDataValidation(numRule);
  sheet.getRange(PROG_R.MAN_CELL, 10).setDataValidation(numRule);

  // STEP 8 — spacers
  [PROG_R.SP1, PROG_R.SP2, PROG_R.SP3, PROG_R.SP4, PROG_R.SP5, PROG_R.SP6].forEach(r => {
    sheet.setRowHeight(r, 12);
    sheet.getRange(r, 1, 1, PROG_TOTAL_COLS).setBackground(PROG_C.BG_DARK);
  });

  // STEP 9 — freeze + gridlines
  try { sheet.setFrozenRows(5); } catch (e) {}
  try { sheet.setHiddenGridlines(true); } catch (e) {}

  _progAlert('Progress cockpit v2.0 rebuilt.\n\n' +
             'VITALS GRID (rows 6-36, cols 2-7) preserved — your /weight, /mood,\n' +
             '/motiv, /energy, /sleep, /study writes from Telegram are now visible\n' +
             'and survive every rebuild.\n\n' +
             'PILLAR SCOREBOARD moved to row 38+. Pillars read from Habits_Pro v2.1:\n' +
             '  Deen      → SUM(Habits J7:J11) / 35\n' +
             '  Body      → SUM(Habits J13:J16) / 28\n' +
             '  Knowledge → SUM(Habits J18:J20) / 21\n' +
             '  Money     → manual cell G54 (yellow)\n' +
             '  Family    → manual cell J54 (yellow)\n\n' +
             'Vitals data + manual cells preserved across all future rebuilds.\n\n' +
             'Bismillah.');
}

// ──────────────────────────────────────────────────────────
// BACKUP / RESTORE — preserves vitals + manual cells
// ──────────────────────────────────────────────────────────

function _progReadVitalsBackup(sheet) {
  if (!sheet) return null;
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow < PROG_R.VITALS_START) return null;
    const endRow = Math.min(PROG_R.VITALS_END, lastRow);
    const numRows = endRow - PROG_R.VITALS_START + 1;
    if (numRows <= 0) return null;
    // Read cols 2-7 (WEIGHT through STUDY)
    return sheet.getRange(PROG_R.VITALS_START, 2, numRows, 6).getValues();
  } catch (e) {
    Logger.log('Vitals backup read failed: ' + e);
    return null;
  }
}

function _progReadNotesBackup(sheet) {
  if (!sheet) return null;
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow < PROG_R.VITALS_START) return null;
    const lastCol = sheet.getLastColumn();
    if (lastCol < 12) return null;
    const endRow = Math.min(PROG_R.VITALS_END, lastRow);
    const numRows = endRow - PROG_R.VITALS_START + 1;
    if (numRows <= 0) return null;
    return sheet.getRange(PROG_R.VITALS_START, 12, numRows, 1).getValues();
  } catch (e) {
    Logger.log('Notes backup read failed: ' + e);
    return null;
  }
}

function _progRestoreVitals(sheet, backup) {
  if (!backup || !Array.isArray(backup) || backup.length === 0) return;
  try {
    const numRows = Math.min(backup.length, 31);
    // Write cols 2-7
    for (let i = 0; i < numRows; i++) {
      for (let c = 0; c < 6; c++) {
        const v = backup[i][c];
        if (v !== '' && v !== null && v !== undefined) {
          sheet.getRange(PROG_R.VITALS_START + i, 2 + c).setValue(v);
        }
      }
    }
  } catch (e) {
    Logger.log('Vitals restore failed: ' + e);
  }
}

function _progRestoreNotes(sheet, backup) {
  if (!backup || !Array.isArray(backup) || backup.length === 0) return;
  try {
    const numRows = Math.min(backup.length, 31);
    for (let i = 0; i < numRows; i++) {
      const v = backup[i][0];
      if (v !== '' && v !== null && v !== undefined) {
        sheet.getRange(PROG_R.VITALS_START + i, 12).setValue(v);
      }
    }
  } catch (e) {
    Logger.log('Notes restore failed: ' + e);
  }
}

function _progReadManualCell(sheet, row, col) {
  if (!sheet) return null;
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow < row) return null;
    const v = sheet.getRange(row, col).getValue();
    if (v === '' || v === null) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  } catch (e) { return null; }
}

// ──────────────────────────────────────────────────────────
// SECTION BUILDERS
// ──────────────────────────────────────────────────────────

function _progBuildBanner(s) {
  s.getRange(PROG_R.BANNER, 1, 1, PROG_TOTAL_COLS).merge()
    .setFormula('="📈 PROGRESS COCKPIT  ·  Day "&MAX(1,TODAY()-DATE(2026,4,25)+1)&" of 90"')
    .setBackground(PROG_C.HEADER)
    .setFontColor(PROG_C.HEADER_TXT)
    .setFontWeight('bold').setFontSize(20)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(PROG_R.BANNER, 56);

  s.getRange(PROG_R.DATE_SUB, 1, 1, PROG_TOTAL_COLS).merge()
    .setFormula('="📅 "&TEXT(TODAY(),"dddd · dd MMMM yyyy")&"   ·   "&' +
                'IF(MAX(1,TODAY()-DATE(2026,4,25)+1)<=30,"Phase 1: Foundation",' +
                'IF(MAX(1,TODAY()-DATE(2026,4,25)+1)<=60,"Phase 2: Build","Phase 3: Sovereign"))')
    .setBackground(PROG_C.BG_PANEL)
    .setFontColor(PROG_C.MUTED).setFontStyle('italic').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(PROG_R.DATE_SUB, 32);
}

function _progBuildVitalsGrid(s) {
  // Section header row 4
  s.getRange(PROG_R.VITALS_HDR, 1, 1, PROG_TOTAL_COLS).merge()
    .setValue('📊  DAILY VITALS  ·  auto-logged via Telegram (/weight /mood /motiv /energy /sleep /study)')
    .setBackground(PROG_C.VITALS_HDR)
    .setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(PROG_R.VITALS_HDR, 30);

  // Column headers row 5
  const hdr = ['DATE', 'WEIGHT', 'MOOD', 'MOTIV', 'ENERGY', 'SLEEP', 'STUDY',
               'DEEN%', 'DISC%', 'OVERALL%', 'SALAH', 'NOTES'];
  s.getRange(PROG_R.VITALS_COLS, 1, 1, PROG_TOTAL_COLS).setValues([hdr])
    .setBackground(PROG_C.BG_CARD)
    .setFontColor(PROG_C.HEADER_TXT).setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(PROG_R.VITALS_COLS, 26);

  // Daily rows 6-36
  for (let i = 0; i < 31; i++) {
    const r = PROG_R.VITALS_START + i;
    const day = i + 1;
    const habCol = _progColLetter(2 + day);  // legacy formula compat (harmless if Habits is now weekly)

    // DATE col 1 — formula
    s.getRange(r, 1).setFormula('=IFERROR(DATE(YEAR(TODAY()),MONTH(TODAY()),' + day + '),"")')
      .setNumberFormat('dd MMM');

    // Cols 2-7: blank cells, formatted, awaiting /weight etc writes
    s.getRange(r, 2).setNumberFormat('0.0');   // WEIGHT
    s.getRange(r, 3).setNumberFormat('0');     // MOOD
    s.getRange(r, 4).setNumberFormat('0');     // MOTIV
    s.getRange(r, 5).setNumberFormat('0');     // ENERGY
    s.getRange(r, 6).setNumberFormat('0.0');   // SLEEP
    s.getRange(r, 7).setNumberFormat('0.0');   // STUDY

    // Cols 8-10: derived %s — point at v2.1 Habits structure (today's day cell)
    // These are nice-to-have analytics, not relied on by Telegram
    s.getRange(r, 8).setFormula(
      '=IFERROR(IF(A' + r + '=TODAY(),' +
      'ROUND(SUM(\'' + PROG_HABITS_SOURCE + '\'!J7:J11)/35,2),""),"")'
    ).setNumberFormat('0%');

    s.getRange(r, 9).setFormula(
      '=IFERROR(IF(A' + r + '=TODAY(),' +
      'ROUND(SUM(\'' + PROG_HABITS_SOURCE + '\'!J22:J23)/14,2),""),"")'
    ).setNumberFormat('0%');

    s.getRange(r, 10).setFormula(
      '=IFERROR(IF(A' + r + '=TODAY(),' +
      'ROUND((SUM(\'' + PROG_HABITS_SOURCE + '\'!J7:J11)/35*0.4+' +
      'SUM(\'' + PROG_HABITS_SOURCE + '\'!J13:J16)/28*0.3+' +
      'SUM(\'' + PROG_HABITS_SOURCE + '\'!J18:J20)/21*0.3),2),""),"")'
    ).setNumberFormat('0%');

    // Col 11: salah score from Salah tab
    s.getRange(r, 11).setFormula('=IFERROR(INDEX(\'🕌 Salah\'!$I$6:$I$36,' + day + '),"")')
      .setNumberFormat('0.0');

    // Col 12: notes (free text)
    // (left blank, user fills)

    // Row styling — alternating, vitals cells writeable
    const bg = (i % 2 === 0) ? PROG_C.VITALS_BG : PROG_C.VITALS_ALT;
    s.getRange(r, 1, 1, PROG_TOTAL_COLS)
      .setBackground(bg).setFontColor(PROG_C.VITALS_TXT)
      .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(r, 22);
  }
}

function _progBuildPillarSection(s) {
  _progSectionHeader(s, PROG_R.PILL_HDR, '🎯  THIS WEEK\'S PILLAR SCORES');

  // 5 pillars across 12 cols
  // Deen      cols 1-2  · Body cols 3-4 · Knowledge cols 5-6 · Money cols 7-9 · Family cols 10-12
  const layout = [
    { name: '🕌 DEEN',      weight: 30, startCol: 1,  span: 2,
      formula: '=IFERROR(ROUND(SUM(\'' + PROG_HABITS_SOURCE + '\'!J7:J11)/35*100,0),0)' },
    { name: '💪 BODY',      weight: 20, startCol: 3,  span: 2,
      formula: '=IFERROR(ROUND(SUM(\'' + PROG_HABITS_SOURCE + '\'!J13:J16)/28*100,0),0)' },
    { name: '🧠 KNOWLEDGE', weight: 20, startCol: 5,  span: 2,
      formula: '=IFERROR(ROUND(SUM(\'' + PROG_HABITS_SOURCE + '\'!J18:J20)/21*100,0),0)' },
    { name: '💰 MONEY',     weight: 20, startCol: 7,  span: 3,
      formula: '=G' + PROG_R.MAN_CELL },
    { name: '🌳 FAMILY',    weight: 10, startCol: 10, span: 3,
      formula: '=J' + PROG_R.MAN_CELL }
  ];

  const sources = [
    'Habits J7:J11 / 35',
    'Habits J13:J16 / 28',
    'Habits J18:J20 / 21',
    'Manual G54',
    'Manual J54'
  ];

  layout.forEach((p, i) => {
    // Name row
    s.getRange(PROG_R.PILL_NAME, p.startCol, 1, p.span).merge()
      .setValue(p.name + '  ·  ' + p.weight + '%')
      .setBackground(PROG_C.BG_CARD)
      .setFontColor(PROG_C.HEADER_TXT).setFontWeight('bold').setFontSize(12)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Score row
    s.getRange(PROG_R.PILL_SCORE, p.startCol, 1, p.span).merge()
      .setFormula(p.formula)
      .setBackground(PROG_C.BG_PANEL)
      .setFontColor(PROG_C.HEADER_TXT).setFontWeight('bold').setFontSize(36)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setNumberFormat('0"%"');

    // Bar row
    const cellAddr = _progColLetter(p.startCol) + PROG_R.PILL_SCORE;
    const barF = '=REPT("█",ROUND(' + cellAddr + '/10,0))&REPT("░",10-ROUND(' + cellAddr + '/10,0))';
    s.getRange(PROG_R.PILL_BAR, p.startCol, 1, p.span).merge()
      .setFormula(barF)
      .setBackground(PROG_C.BG_PANEL)
      .setFontColor(PROG_C.BAR_FULL).setFontFamily('Roboto Mono').setFontSize(13)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    // Source caption
    s.getRange(PROG_R.PILL_SOURCE, p.startCol, 1, p.span).merge()
      .setValue(sources[i])
      .setBackground(PROG_C.BG_CARD)
      .setFontColor(PROG_C.MUTED).setFontStyle('italic').setFontSize(9)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
  });

  s.setRowHeight(PROG_R.PILL_NAME, 36);
  s.setRowHeight(PROG_R.PILL_SCORE, 70);
  s.setRowHeight(PROG_R.PILL_BAR, 28);
  s.setRowHeight(PROG_R.PILL_SOURCE, 22);
}

function _progBuildCompositeSection(s) {
  _progSectionHeader(s, PROG_R.COMP_HDR, '🏆  COMPOSITE DAY SCORE  ·  weighted across 5 pillars');

  // Composite = Deen(A40)*0.3 + Body(C40)*0.2 + Know(E40)*0.2 + Money(G40)*0.2 + Family(J40)*0.1
  const compF = '=ROUND((A' + PROG_R.PILL_SCORE + '*0.3 + C' + PROG_R.PILL_SCORE +
                '*0.2 + E' + PROG_R.PILL_SCORE + '*0.2 + G' + PROG_R.PILL_SCORE +
                '*0.2 + J' + PROG_R.PILL_SCORE + '*0.1),0)';

  s.getRange(PROG_R.COMP_SCORE, 1, 1, PROG_TOTAL_COLS).merge()
    .setFormula(compF)
    .setBackground(PROG_C.HERO_BG)
    .setFontColor(PROG_C.HERO_TXT).setFontWeight('bold').setFontSize(56)
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setNumberFormat('0"%"');
  s.setRowHeight(PROG_R.COMP_SCORE, 96);

  const compBarF = '=REPT("█",ROUND(A' + PROG_R.COMP_SCORE + '/2,0))&REPT("░",50-ROUND(A' +
                   PROG_R.COMP_SCORE + '/2,0))';
  s.getRange(PROG_R.COMP_BAR, 1, 1, PROG_TOTAL_COLS).merge()
    .setFormula(compBarF)
    .setBackground(PROG_C.BG_PANEL)
    .setFontColor(PROG_C.BAR_FULL).setFontFamily('Roboto Mono').setFontSize(14)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(PROG_R.COMP_BAR, 32);
}

function _progBuildQuestSection(s) {
  _progSectionHeader(s, PROG_R.QUEST_HDR, '🎯  90-DAY SOVEREIGN QUEST');

  const questLineF = '="Day "&MAX(1,TODAY()-DATE(2026,4,25)+1)&" of 90    ·    "&' +
                     'ROUND((TODAY()-DATE(2026,4,25))/90*100,1)&"% complete    ·    "&' +
                     'MAX(0,90-(TODAY()-DATE(2026,4,25)))&" days remaining"';

  s.getRange(PROG_R.QUEST_LINE, 1, 1, PROG_TOTAL_COLS).merge()
    .setFormula(questLineF)
    .setBackground(PROG_C.BG_PANEL)
    .setFontColor(PROG_C.ACCENT).setFontWeight('bold').setFontSize(14)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(PROG_R.QUEST_LINE, 36);

  const questBarF = '=REPT("█",ROUND((TODAY()-DATE(2026,4,25))/90*60,0))&' +
                    'REPT("░",60-ROUND((TODAY()-DATE(2026,4,25))/90*60,0))';

  s.getRange(PROG_R.QUEST_BAR, 1, 1, PROG_TOTAL_COLS).merge()
    .setFormula(questBarF)
    .setBackground(PROG_C.BG_PANEL)
    .setFontColor(PROG_C.ACCENT).setFontFamily('Roboto Mono').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(PROG_R.QUEST_BAR, 28);
}

function _progBuildManualSection(s) {
  _progSectionHeader(s, PROG_R.MAN_HDR, '✏️  MANUAL ENTRY  ·  Money + Family pillars (yellow cells, 0-100)');

  // Money sub-header (cols 1-6)
  s.getRange(PROG_R.MAN_SUB, 1, 1, 6).merge()
    .setValue('💰  MONEY  (20% weight)  →  edit cell G54')
    .setBackground(PROG_C.BG_CARD)
    .setFontColor(PROG_C.HEADER_TXT).setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // Family sub-header (cols 7-12)
  s.getRange(PROG_R.MAN_SUB, 7, 1, 6).merge()
    .setValue('🌳  FAMILY  (10% weight)  →  edit cell J54')
    .setBackground(PROG_C.BG_CARD)
    .setFontColor(PROG_C.HEADER_TXT).setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(PROG_R.MAN_SUB, 32);

  // Money cell at G54 (cols 7-9 merged) — value set in main rebuild after backup restore
  // Family cell at J54 (cols 10-12 merged) — same
  // Pre-style empty cells in cols 1-6 (left of money)
  s.getRange(PROG_R.MAN_CELL, 1, 1, 6).merge()
    .setValue('← MONEY = G54 →')
    .setBackground(PROG_C.BG_PANEL)
    .setFontColor(PROG_C.MUTED).setFontStyle('italic').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(PROG_R.MAN_CELL, 64);

  // Help row
  s.getRange(PROG_R.MAN_HELP, 1, 1, 6).merge()
    .setValue('Money score reflects: budget adherence · debt payments · CC utilization')
    .setBackground(PROG_C.BG_PANEL)
    .setFontColor(PROG_C.MUTED).setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  s.getRange(PROG_R.MAN_HELP, 7, 1, 6).merge()
    .setValue('Family score reflects: time given · parents/siblings call · dua for them')
    .setBackground(PROG_C.BG_PANEL)
    .setFontColor(PROG_C.MUTED).setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(PROG_R.MAN_HELP, 32);
}

function _progBuildBreakdownSection(s) {
  _progSectionHeader(s, PROG_R.BREAK_HDR, '🔍  PILLAR BREAKDOWN  ·  what feeds each score');

  const rows = [
    [PROG_R.BREAK_DEEN,   '🕌 Deen (30%)',      'Habits J7:J11',
     'Fajr Masjid · 5 Daily Prayers · Quran · Tahajjud · Adhkar'],
    [PROG_R.BREAK_BODY,   '💪 Body (20%)',      'Habits J13:J16',
     'Water · Walk · Sleep · Workout/Stretch'],
    [PROG_R.BREAK_KNOW,   '🧠 Knowledge (20%)', 'Habits J18:J20',
     'Read non-fiction · SQL/Python · Journal'],
    [PROG_R.BREAK_MONEY,  '💰 Money (20%)',     'Manual G54',
     'v3: auto from Transactions + CC util + budget adherence'],
    [PROG_R.BREAK_FAMILY, '🌳 Family (10%)',    'Manual J54',
     'v3: auto from Vision tab + family habits']
  ];

  rows.forEach(r => {
    s.getRange(r[0], 1, 1, 3).merge()
      .setValue(r[1])
      .setBackground(PROG_C.BG_PANEL)
      .setFontColor(PROG_C.CARD_TXT).setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');

    s.getRange(r[0], 4, 1, 2).merge()
      .setValue(r[2])
      .setBackground(PROG_C.BG_PANEL)
      .setFontColor(PROG_C.ACCENT).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    s.getRange(r[0], 6, 1, 7).merge()
      .setValue(r[3])
      .setBackground(PROG_C.BG_PANEL)
      .setFontColor(PROG_C.MUTED).setFontStyle('italic').setFontSize(10)
      .setHorizontalAlignment('left').setVerticalAlignment('middle').setWrap(true);

    s.setRowHeight(r[0], 28);
  });
}

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────

function _progSectionHeader(s, row, label) {
  s.getRange(row, 1, 1, PROG_TOTAL_COLS).merge()
    .setValue(label)
    .setBackground(PROG_C.BG_DARK)
    .setFontColor(PROG_C.HEADER_TXT).setFontWeight('bold').setFontSize(14)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(row, 38);
}

function _progColLetter(col) {
  let s = '';
  while (col > 0) {
    let m = (col - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

function _progAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
}

// ──────────────────────────────────────────────────────────
// VERIFY
// ──────────────────────────────────────────────────────────

function verifyProgressCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(PROG_TAB);
  if (!s) { _progAlert('Progress tab not found. Run rebuildProgressCockpit first.'); return; }

  const deen   = s.getRange(PROG_R.PILL_SCORE, 1).getValue();
  const body   = s.getRange(PROG_R.PILL_SCORE, 3).getValue();
  const know   = s.getRange(PROG_R.PILL_SCORE, 5).getValue();
  const money  = s.getRange(PROG_R.PILL_SCORE, 7).getValue();
  const family = s.getRange(PROG_R.PILL_SCORE, 10).getValue();
  const composite = s.getRange(PROG_R.COMP_SCORE, 1).getValue();

  // Sample a vitals cell — today's row
  const today = new Date().getDate();
  const vitalsRow = 5 + today;
  const todayWeight = s.getRange(vitalsRow, 2).getValue();
  const todaySleep = s.getRange(vitalsRow, 6).getValue();

  let msg = 'PROGRESS_PRO v2.0 INTEGRITY\n\n';
  msg += 'Pillars (this week):\n';
  msg += '  Deen      (30%): ' + deen + '%\n';
  msg += '  Body      (20%): ' + body + '%\n';
  msg += '  Knowledge (20%): ' + know + '%\n';
  msg += '  Money     (20%): ' + money + '% [manual G54]\n';
  msg += '  Family    (10%): ' + family + '% [manual J54]\n\n';
  msg += 'Composite: ' + composite + '%\n\n';
  msg += 'Today vitals (row ' + vitalsRow + '):\n';
  msg += '  Weight: ' + (todayWeight || 'not logged') + '\n';
  msg += '  Sleep:  ' + (todaySleep || 'not logged') + '\n\n';
  msg += 'Manual cells:\n';
  msg += '  Money  → G54\n';
  msg += '  Family → J54\n';

  _progAlert(msg);
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendProgressMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📈 Progress')
      .addItem('Rebuild Cockpit (preserves vitals)', 'rebuildProgressCockpit')
      .addSeparator()
      .addItem('Verify Cockpit', 'verifyProgressCockpit')
      .addToUi();
  } catch (e) { Logger.log('Progress menu failed: ' + e); }
}
