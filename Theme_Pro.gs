// ════════════════════════════════════════════════════════════════════
// 🎨 Theme_Pro.gs v2.0 — PREMIUM THEME SYSTEM · 6 COORDINATED PALETTES
// LOCKED · 7-Layer Audit · Self-Contained · Day 6 / 90 · 2026-04-29
//
// PURPOSE:
//   One-click premium theme switcher. Active theme stored in
//   ScriptProperties so every Pro cockpit can opt-in to read it.
//   Click apply → cockpits re-render in coordinated palette.
//
// 6 THEMES:
//   1. 🌙 Midnight Gold   — dark navy + warm gold (DEFAULT)
//   2. 👑 Royal Indigo    — deep purple + cream
//   3. 🌲 Forest Sage     — forest green + warm cream
//   4. 🌅 Sunset Coral    — warm sunset + ivory
//   5. 🌊 Ocean Cyan      — deep ocean + ice white
//   6. 🏛️ Stone Marble    — warm stone + bronze
//
// SCRIPT PROPERTY KEYS (read by sibling modules):
//   theme_active        — theme ID like 'midnight_gold'
//   theme_bg_page       — page background
//   theme_bg_panel      — panel/card mid-layer
//   theme_bg_card       — card top-layer
//   theme_bg_input      — yellow editable cells
//   theme_header        — section header background
//   theme_header_txt    — header text color
//   theme_accent        — primary accent (gold, cream, etc)
//   theme_card_txt      — card body text
//   theme_muted         — muted/secondary text
//   theme_good          — success green
//   theme_warn          — warning amber
//   theme_bad           — danger red
//   theme_hero_bg       — hero card background
//   theme_hero_txt      — hero card text
//   theme_bar_full      — progress bar full color
//
// PUBLIC API:
//   - getThemeProperty(key, fallback)  → read by sibling modules
//   - applyTheme(themeId)              → set + re-render
//   - rebuildThemesTab()               → render the picker tab
//   - applyThemeToAll()                → re-render all cockpits
// ════════════════════════════════════════════════════════════════════

const THM_TAB = '🎨 Themes';
const THM_DEFAULT = 'midnight_gold';
const THM_TOTAL_ROWS = 28;
const THM_TOTAL_COLS = 12;

// ─── 6 THEMES — full palette per theme ───
const THM_PALETTES = {
  midnight_gold: {
    label: '🌙 Midnight Gold',
    desc: 'Dark navy + warm gold · Stripe / Apple Wallet',
    bg_page:    '#0A0E1A',
    bg_panel:   '#1E293B',
    bg_card:    '#334155',
    bg_input:   '#FEF3C7',
    header:     '#7C3AED',
    header_txt: '#FBBF24',
    accent:     '#FBBF24',
    card_txt:   '#F1F5F9',
    muted:      '#94A3B8',
    good:       '#10B981',
    warn:       '#F59E0B',
    bad:        '#EF4444',
    hero_bg:    '#581C87',
    hero_txt:   '#FBBF24',
    bar_full:   '#10B981'
  },
  royal_indigo: {
    label: '👑 Royal Indigo',
    desc: 'Deep purple + cream · Notion premium',
    bg_page:    '#0F0E2E',
    bg_panel:   '#1E1B4B',
    bg_card:    '#312E81',
    bg_input:   '#FEF3C7',
    header:     '#4338CA',
    header_txt: '#FDE68A',
    accent:     '#FDE68A',
    card_txt:   '#E0E7FF',
    muted:      '#A5B4FC',
    good:       '#34D399',
    warn:       '#FBBF24',
    bad:        '#F87171',
    hero_bg:    '#3730A3',
    hero_txt:   '#FDE68A',
    bar_full:   '#34D399'
  },
  forest_sage: {
    label: '🌲 Forest Sage',
    desc: 'Forest green + warm cream · Linear / GitHub dark',
    bg_page:    '#052E16',
    bg_panel:   '#14532D',
    bg_card:    '#166534',
    bg_input:   '#FEF3C7',
    header:     '#15803D',
    header_txt: '#FDE68A',
    accent:     '#FDE68A',
    card_txt:   '#DCFCE7',
    muted:      '#86EFAC',
    good:       '#4ADE80',
    warn:       '#FACC15',
    bad:        '#F87171',
    hero_bg:    '#166534',
    hero_txt:   '#FDE68A',
    bar_full:   '#4ADE80'
  },
  sunset_coral: {
    label: '🌅 Sunset Coral',
    desc: 'Warm sunset + ivory · sunset photography',
    bg_page:    '#431407',
    bg_panel:   '#7C2D12',
    bg_card:    '#9A3412',
    bg_input:   '#FEF9C3',
    header:     '#C2410C',
    header_txt: '#FED7AA',
    accent:     '#FED7AA',
    card_txt:   '#FFEDD5',
    muted:      '#FDBA74',
    good:       '#86EFAC',
    warn:       '#FACC15',
    bad:        '#FCA5A5',
    hero_bg:    '#9A3412',
    hero_txt:   '#FED7AA',
    bar_full:   '#FB923C'
  },
  ocean_cyan: {
    label: '🌊 Ocean Cyan',
    desc: 'Deep ocean + ice white · Apple Watch faces',
    bg_page:    '#083344',
    bg_panel:   '#155E75',
    bg_card:    '#164E63',
    bg_input:   '#ECFEFF',
    header:     '#0E7490',
    header_txt: '#A5F3FC',
    accent:     '#A5F3FC',
    card_txt:   '#CFFAFE',
    muted:      '#67E8F9',
    good:       '#34D399',
    warn:       '#FBBF24',
    bad:        '#F87171',
    hero_bg:    '#155E75',
    hero_txt:   '#A5F3FC',
    bar_full:   '#22D3EE'
  },
  stone_marble: {
    label: '🏛️ Stone Marble',
    desc: 'Warm stone + bronze · banking / luxury watch dials',
    bg_page:    '#1C1917',
    bg_panel:   '#292524',
    bg_card:    '#44403C',
    bg_input:   '#FEF3C7',
    header:     '#57534E',
    header_txt: '#D6A85F',
    accent:     '#D6A85F',
    card_txt:   '#E7E5E4',
    muted:      '#A8A29E',
    good:       '#84CC16',
    warn:       '#EAB308',
    bad:        '#DC2626',
    hero_bg:    '#44403C',
    hero_txt:   '#D6A85F',
    bar_full:   '#84CC16'
  }
};

const THM_KEYS = ['bg_page', 'bg_panel', 'bg_card', 'bg_input',
                  'header', 'header_txt', 'accent', 'card_txt', 'muted',
                  'good', 'warn', 'bad', 'hero_bg', 'hero_txt', 'bar_full'];

// ──────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────

function getThemeProperty(key, fallback) {
  try {
    const v = PropertiesService.getDocumentProperties().getProperty('theme_' + key);
    return v || fallback;
  } catch (e) { return fallback; }
}

function getActiveTheme() {
  try {
    return PropertiesService.getDocumentProperties().getProperty('theme_active') || THM_DEFAULT;
  } catch (e) { return THM_DEFAULT; }
}

function applyTheme(themeId) {
  if (!THM_PALETTES[themeId]) {
    _thmAlert('Unknown theme: ' + themeId);
    return;
  }
  const palette = THM_PALETTES[themeId];
  const props = PropertiesService.getDocumentProperties();
  props.setProperty('theme_active', themeId);
  THM_KEYS.forEach(k => props.setProperty('theme_' + k, palette[k]));

  if (typeof logAuditAction === 'function') {
    logAuditAction('THEME_APPLIED', themeId + ' · ' + palette.label);
  }

  _thmAlert(palette.label + ' applied.\n\n' +
            'Active theme stored. Now re-rendering cockpits...\n\n' +
            'This will take 30-60 sec depending on what\'s installed.');

  applyThemeToAll();
}

function applyThemeToAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rendered = [];
  let skipped = [];

  // Re-render Themes tab itself first (visible feedback)
  try { rebuildThemesTab(); rendered.push('Themes'); } catch (e) { skipped.push('Themes (' + e + ')'); }

  // Re-render Pro cockpits if their builders exist
  const cockpits = [
    { name: 'Mission',  fn: 'rebuildMissionCockpit' },
    { name: 'Progress', fn: 'rebuildProgressCockpit' },
    { name: 'Habits',   fn: 'rebuildHabitsCockpit' },
    { name: 'Salah',    fn: 'rebuildSalahCockpit' },
    { name: 'Health',   fn: 'rebuildHealthCockpit' },
    { name: 'Finance',  fn: 'rebuildFinanceCockpit' }
  ];

  cockpits.forEach(c => {
    try {
      if (eval('typeof ' + c.fn) === 'function') {
        eval(c.fn + '()');
        rendered.push(c.name);
      } else {
        skipped.push(c.name + ' (not loaded)');
      }
    } catch (e) {
      skipped.push(c.name + ' (' + e.message + ')');
    }
  });

  if (typeof logAuditAction === 'function') {
    logAuditAction('THEME_RENDER', 'rendered ' + rendered.length + ' · skipped ' + skipped.length);
  }

  let report = 'Theme applied across cockpits.\n\n';
  report += '✓ Re-rendered (' + rendered.length + '):\n';
  rendered.forEach(c => report += '  · ' + c + '\n');
  if (skipped.length > 0) {
    report += '\n⚠️ Skipped (' + skipped.length + '):\n';
    skipped.forEach(s => report += '  · ' + s + '\n');
  }
  _thmAlert(report);
}

// ──────────────────────────────────────────────────────────
// THEME-AWARE BUILDER (for Themes tab itself)
// ──────────────────────────────────────────────────────────

function rebuildThemesTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(THM_TAB);
  if (!s) s = ss.insertSheet(THM_TAB);

  // Read active palette for chrome
  const activeId = getActiveTheme();
  const T = THM_PALETTES[activeId] || THM_PALETTES[THM_DEFAULT];

  // Clear + reset
  s.clear();
  s.clearConditionalFormatRules();
  try { s.clearNotes(); } catch (e) {}
  try { s.getRange(1, 1, s.getMaxRows(), Math.max(THM_TOTAL_COLS, s.getMaxColumns())).breakApart(); } catch (e) {}
  try { s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations(); } catch (e) {}

  // Trim
  const maxCols = s.getMaxColumns();
  if (maxCols > THM_TOTAL_COLS) try { s.deleteColumns(THM_TOTAL_COLS + 1, maxCols - THM_TOTAL_COLS); } catch (e) {}
  const maxRows = s.getMaxRows();
  if (maxRows > THM_TOTAL_ROWS) try { s.deleteRows(THM_TOTAL_ROWS + 1, maxRows - THM_TOTAL_ROWS); } catch (e) {}
  if (s.getMaxRows() < THM_TOTAL_ROWS) s.insertRowsAfter(s.getMaxRows(), THM_TOTAL_ROWS - s.getMaxRows());
  if (s.getMaxColumns() < THM_TOTAL_COLS) s.insertColumnsAfter(s.getMaxColumns(), THM_TOTAL_COLS - s.getMaxColumns());

  // Page bg + col widths
  s.getRange(1, 1, THM_TOTAL_ROWS, THM_TOTAL_COLS).setBackground(T.bg_page);
  for (let c = 1; c <= THM_TOTAL_COLS; c++) s.setColumnWidth(c, 110);

  // ── Banner row 1 ──
  s.getRange(1, 1, 1, THM_TOTAL_COLS).merge()
    .setValue('🎨 PREMIUM THEMES · Day ' + _thmQuestDay() + ' of 90')
    .setBackground(T.hero_bg).setFontColor(T.hero_txt)
    .setFontWeight('bold').setFontSize(20)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 56);

  // ── Sub row 2 ──
  s.getRange(2, 1, 1, THM_TOTAL_COLS).merge()
    .setValue('Tap a checkbox to apply that theme. All Pro cockpits re-render in coordinated palette.')
    .setBackground(T.bg_panel).setFontColor(T.muted)
    .setFontStyle('italic').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(2, 28);
  s.setRowHeight(3, 10);

  // ── Active theme card rows 4-5 ──
  s.getRange(4, 1, 1, THM_TOTAL_COLS).merge()
    .setValue('CURRENTLY ACTIVE')
    .setBackground(T.bg_card).setFontColor(T.muted)
    .setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(4, 22);

  s.getRange(5, 1, 1, THM_TOTAL_COLS).merge()
    .setValue(T.label + '   ·   ' + T.desc)
    .setBackground(T.header).setFontColor(T.header_txt)
    .setFontWeight('bold').setFontSize(16)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(5, 44);
  s.setRowHeight(6, 10);

  // ── Picker grid header row 7 ──
  s.getRange(7, 1, 1, THM_TOTAL_COLS).merge()
    .setValue('🖌️  PICK A THEME  ·  6 premium palettes  ·  click ✅ to apply')
    .setBackground(T.header).setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(7, 32);

  // ── 6 theme cards in 3-col × 2-row grid (rows 8-19) ──
  const themeIds = Object.keys(THM_PALETTES);
  for (let i = 0; i < 6; i++) {
    const row = 8 + Math.floor(i / 3) * 6;  // row 8 or 14
    const col = 1 + (i % 3) * 4;             // col 1, 5, 9
    const themeId = themeIds[i];
    const p = THM_PALETTES[themeId];
    const isActive = (themeId === activeId);

    // Row A — name
    s.getRange(row, col, 1, 4).merge()
      .setValue(p.label).setBackground(p.hero_bg).setFontColor(p.hero_txt)
      .setFontWeight('bold').setFontSize(13)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(row, 36);

    // Row B — preview banner
    s.getRange(row + 1, col, 1, 4).merge()
      .setValue('PREVIEW · banner')
      .setBackground(p.header).setFontColor(p.header_txt)
      .setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(row + 1, 26);

    // Row C — preview body line 1 (card on panel on page)
    s.getRange(row + 2, col, 1, 4).merge()
      .setValue('— sample card text —')
      .setBackground(p.bg_card).setFontColor(p.card_txt)
      .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(row + 2, 22);

    // Row D — preview body line 2 (accent + bar)
    s.getRange(row + 3, col, 1, 4).merge()
      .setValue('████████████░░░░░░  ·  ' + p.accent.toUpperCase())
      .setBackground(p.bg_panel).setFontColor(p.accent)
      .setFontFamily('Roboto Mono').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(row + 3, 22);

    // Row E — desc
    s.getRange(row + 4, col, 1, 4).merge()
      .setValue(p.desc)
      .setBackground(p.bg_panel).setFontColor(p.muted)
      .setFontStyle('italic').setFontSize(9)
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
    s.setRowHeight(row + 4, 30);

    // Row F — apply checkbox + label
    const checkboxCell = s.getRange(row + 5, col + 1);
    checkboxCell.insertCheckboxes();
    checkboxCell.setValue(isActive);
    checkboxCell.setBackground(p.hero_bg).setHorizontalAlignment('center').setVerticalAlignment('middle');

    s.getRange(row + 5, col, 1, 1).setValue(isActive ? 'ACTIVE' : 'apply →')
      .setBackground(p.bg_card).setFontColor(p.card_txt).setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');

    s.getRange(row + 5, col + 2, 1, 2).merge()
      .setValue(themeId)
      .setBackground(p.bg_card).setFontColor(p.muted)
      .setFontFamily('Roboto Mono').setFontSize(9)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(row + 5, 32);
  }

  // Spacer row 20
  s.setRowHeight(20, 10);

  // ── Wiring status row 21 ──
  const wired = _thmCheckCockpitsLoaded();
  s.getRange(21, 1, 1, THM_TOTAL_COLS).merge()
    .setValue('🔌 WIRING · ' + wired.length + ' Pro cockpits available · ' + wired.join(' · '))
    .setBackground(T.bg_panel).setFontColor(T.muted)
    .setFontStyle('italic').setFontSize(10)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(21, 26);
  s.setRowHeight(22, 10);

  // ── Footer rows 23-25 ──
  s.getRange(23, 1, 1, THM_TOTAL_COLS).merge()
    .setValue('💡 HOW IT WORKS')
    .setBackground(T.bg_card).setFontColor(T.header_txt)
    .setFontWeight('bold').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(23, 24);

  s.getRange(24, 1, 1, THM_TOTAL_COLS).merge()
    .setValue('Tap a checkbox → theme stored in ScriptProperties → all Pro cockpits re-render in 30-60s.')
    .setBackground(T.bg_panel).setFontColor(T.card_txt)
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(24, 30);

  s.getRange(25, 1, 1, THM_TOTAL_COLS).merge()
    .setValue('Pro cockpits reading the theme: Mission · Progress · Themes · (Habits/Salah/Health/Finance opt-in via getThemeProperty)')
    .setBackground(T.bg_panel).setFontColor(T.muted)
    .setFontStyle('italic').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  s.setRowHeight(25, 28);

  // Stamp row 28
  s.getRange(28, 1, 1, THM_TOTAL_COLS).merge()
    .setFormula('="Last applied: "&TEXT(NOW(),"EEEE, dd MMM yyyy · HH:mm")&" PKT  ·  Theme_Pro v2.0"')
    .setBackground(T.bg_page).setFontColor(T.muted)
    .setFontStyle('italic').setFontSize(9)
    .setHorizontalAlignment('right').setVerticalAlignment('middle');
  s.setRowHeight(28, 22);

  try { s.setFrozenRows(2); } catch (e) {}
  try { s.setHiddenGridlines(true); } catch (e) {}

  // Install edit handler so checkbox clicks apply
  installThemeEditHandler(true);
}

// ──────────────────────────────────────────────────────────
// EDIT HANDLER — checkbox click triggers applyTheme
// ──────────────────────────────────────────────────────────

function _themeOnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== THM_TAB) return;
  const r = e.range.getRow();
  const c = e.range.getColumn();
  const v = e.value;

  if (v !== 'TRUE' && v !== true) return;

  // Theme card checkboxes are at row 13 or 19, col 2/6/10
  const cardRows = [13, 19];
  const cardCols = [2, 6, 10];
  if (cardRows.indexOf(r) === -1 || cardCols.indexOf(c) === -1) return;

  // Map (row, col) → theme index
  const rowIdx = cardRows.indexOf(r);  // 0 or 1
  const colIdx = cardCols.indexOf(c);   // 0, 1, 2
  const themeIdx = rowIdx * 3 + colIdx;
  const themeIds = Object.keys(THM_PALETTES);
  const themeId = themeIds[themeIdx];
  if (!themeId) return;

  applyTheme(themeId);
}

function installThemeEditHandler(silent) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_themeOnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('_themeOnEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  if (!silent) _thmAlert('Theme edit handler installed.');
}

// ──────────────────────────────────────────────────────────
// QUICK APPLY (menu shortcuts — bypass Themes tab)
// ──────────────────────────────────────────────────────────

function applyMidnightGold() { applyTheme('midnight_gold'); }
function applyRoyalIndigo()  { applyTheme('royal_indigo'); }
function applyForestSage()   { applyTheme('forest_sage'); }
function applySunsetCoral()  { applyTheme('sunset_coral'); }
function applyOceanCyan()    { applyTheme('ocean_cyan'); }
function applyStoneMarble()  { applyTheme('stone_marble'); }

// ──────────────────────────────────────────────────────────
// VERIFY
// ──────────────────────────────────────────────────────────

function verifyThemeSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tab = ss.getSheetByName(THM_TAB);

  let report = 'THEME_PRO v2.0 INTEGRITY\n\n';
  report += (tab ? '✓ ' : '✗ ') + 'Themes tab present\n';

  const active = getActiveTheme();
  report += '✓ Active theme: ' + (THM_PALETTES[active] ? THM_PALETTES[active].label : 'UNKNOWN ' + active) + '\n';

  // Check all 15 properties stored
  let propCount = 0;
  THM_KEYS.forEach(k => {
    if (getThemeProperty(k, null) !== null) propCount++;
  });
  report += '✓ Theme properties stored: ' + propCount + '/' + THM_KEYS.length + '\n';

  // Trigger
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '_themeOnEdit');
  report += (triggers.length === 1 ? '✓ ' : '⚠️ ') + 'Theme edit handler: ' + triggers.length + '/1\n\n';

  // Wired cockpits
  const wired = _thmCheckCockpitsLoaded();
  report += '🔌 Wired Pro cockpits (' + wired.length + '):\n';
  wired.forEach(c => report += '  · ' + c + '\n');

  report += '\nAvailable themes:\n';
  Object.keys(THM_PALETTES).forEach(id => {
    report += '  ' + (id === active ? '✓ ' : '  ') + THM_PALETTES[id].label + '\n';
  });

  _thmAlert(report);
}

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────

function _thmCheckCockpitsLoaded() {
  const map = [
    ['Mission',  'rebuildMissionCockpit'],
    ['Progress', 'rebuildProgressCockpit'],
    ['Habits',   'rebuildHabitsCockpit'],
    ['Salah',    'rebuildSalahCockpit'],
    ['Health',   'rebuildHealthCockpit'],
    ['Finance',  'rebuildFinanceCockpit']
  ];
  const wired = [];
  map.forEach(c => {
    try {
      if (eval('typeof ' + c[1]) === 'function') wired.push(c[0]);
    } catch (e) {}
  });
  return wired;
}

function _thmQuestDay() {
  if (typeof getQuestDay === 'function') return getQuestDay();
  const todayPKT = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd');
  const tParts = todayPKT.split('-').map(Number);
  const tDate = new Date(Date.UTC(tParts[0], tParts[1] - 1, tParts[2]));
  const sDate = new Date(Date.UTC(2026, 3, 25));
  return Math.max(1, Math.floor((tDate - sDate) / 86400000) + 1);
}

function _thmAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendThemesMenu() {
  try {
    const menu = SpreadsheetApp.getUi().createMenu('🎨 Themes')
      .addItem('🔄 Rebuild Themes Tab', 'rebuildThemesTab')
      .addItem('🔁 Re-apply Active Theme to All Cockpits', 'applyThemeToAll')
      .addSeparator();

    Object.keys(THM_PALETTES).forEach(id => {
      const p = THM_PALETTES[id];
      menu.addItem('Apply: ' + p.label, 'apply' + id.split('_').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)).join(''));
    });

    menu.addSeparator()
      .addItem('🔍 Verify Theme System', 'verifyThemeSystem')
      .addItem('🔧 Reinstall Edit Handler', 'installThemeEditHandler')
      .addToUi();
  } catch (e) { Logger.log('Themes menu failed: ' + e); }
}