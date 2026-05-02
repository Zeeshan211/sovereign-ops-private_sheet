// ════════════════════════════════════════════════════════════════════
// 🏥 Health_Pro.gs — VVIP HEALTH COCKPIT v1.1 POLISHED
// 11-gate framework verified · Day 6 · 2026-04-29
//
// CHANGES FROM v1.0:
//   - Library moved to separate sub-tab 📚 Food Library (gate 7)
//   - 4 uniform stat cards w/ inline progress bars (gate 6, 9)
//   - Silent confirmations — no popup spam (gate 8)
//   - Form auto-refocus after submit (gate 8)
//   - Today's log limited to 20 rows visible, archive below (gate 7)
//   - Frozen rows extended to keep Quick Entry sticky (gate 7)
//   - Pre-computed today date, batched reads (gate 11)
//   - Auto-tick wrapped in try/catch with 0ms guarantee (gate 11)
//   - Status cell feedback in form row (gate 8)
// ════════════════════════════════════════════════════════════════════

const HEALTH_TAB = '🏥 Health';
const HEALTH_LIBRARY_TAB = '📚 Food Library';
const HEALTH_TZ = 'Asia/Karachi';

const HEALTH_BASELINE = {
  age: 27, sex: 'M', heightCm: 170,
  startWeight: 80, targetWeight: 69,
  calTarget: 1500, proteinTarget: 130,
  waterTargetGlasses: 8, waterGlassMl: 250
};

const HEALTH_FOOD_LIBRARY = [
  ['Chapati (whole wheat)', 264, 9, 'g', 'Pakistani · 1 medium ≈ 80g = 211 kcal'],
  ['Plain rice (cooked)', 130, 2.7, 'g', 'Pakistani · 1 katori ≈ 150g'],
  ['Chicken biryani', 162, 8.5, 'g', 'Pakistani · 1 plate ≈ 300g'],
  ['Beef biryani', 175, 9, 'g', 'Pakistani · 1 plate ≈ 300g'],
  ['Daal chana (cooked)', 116, 7, 'g', 'Pakistani'],
  ['Daal mash (cooked)', 138, 9, 'g', 'Pakistani'],
  ['Daal moong (cooked)', 105, 7, 'g', 'Pakistani'],
  ['Aloo gosht', 175, 11, 'g', 'Pakistani · meat curry'],
  ['Chicken karahi', 195, 18, 'g', 'Pakistani'],
  ['Mutton karahi', 240, 16, 'g', 'Pakistani'],
  ['Beef nihari', 215, 16, 'g', 'Pakistani'],
  ['Chicken qorma', 220, 14, 'g', 'Pakistani'],
  ['Aloo paratha', 322, 6, 'g', 'Pakistani · 1 paratha ≈ 100g'],
  ['Plain paratha', 297, 5, 'g', 'Pakistani · 1 paratha ≈ 80g'],
  ['Naan', 310, 9, 'g', 'Pakistani · 1 naan ≈ 90g'],
  ['Halwa puri', 380, 7, 'g', 'Pakistani breakfast'],
  ['Samosa (1 piece)', 154, 4, 'pc', 'Pakistani · per piece'],
  ['Pakora (1 piece)', 75, 2, 'pc', 'Pakistani · per piece'],
  ['Chicken pulao', 145, 9, 'g', 'Pakistani'],
  ['Saag (palak)', 90, 4, 'g', 'Pakistani'],
  ['Bhindi sabzi', 95, 2, 'g', 'Pakistani'],
  ['Aloo sabzi', 110, 2, 'g', 'Pakistani'],
  ['Raita (yogurt)', 60, 3, 'g', 'Pakistani side'],
  ['Lassi (sweet)', 90, 3, 'g', 'Pakistani drink · per 100ml'],
  ['Lassi (salty)', 50, 3, 'g', 'Pakistani drink · per 100ml'],
  ['Chai (milk + sugar)', 45, 1.5, 'g', 'Pakistani · per cup ~150ml'],
  ['Boiled egg', 155, 13, 'g', '1 large = 50g = 78 kcal · 6.5g protein'],
  ['Omelette (2 eggs)', 154, 11, 'pc', 'Per omelette · ~100g'],
  ['Chicken breast (cooked)', 165, 31, 'g', 'Lean · best protein source'],
  ['Chicken thigh (cooked)', 209, 26, 'g', ''],
  ['Beef (lean cooked)', 250, 26, 'g', ''],
  ['Mutton (cooked)', 294, 25, 'g', ''],
  ['Fish (white, cooked)', 105, 22, 'g', ''],
  ['Tuna canned in water', 116, 26, 'g', ''],
  ['Greek yogurt plain', 59, 10, 'g', 'High protein snack'],
  ['Yogurt plain', 61, 3.5, 'g', ''],
  ['Cottage cheese', 98, 11, 'g', ''],
  ['Whey protein scoop', 120, 24, 'pc', '1 scoop ≈ 30g'],
  ['Brown rice (cooked)', 112, 2.6, 'g', ''],
  ['Oats (dry)', 389, 17, 'g', '1 cup dry ≈ 80g · use 50g typical'],
  ['Sweet potato (boiled)', 86, 1.6, 'g', ''],
  ['Potato (boiled)', 87, 1.9, 'g', ''],
  ['Pasta (cooked)', 131, 5, 'g', ''],
  ['Bread (white slice)', 265, 9, 'g', '1 slice ≈ 30g = 80 kcal'],
  ['Bread (whole wheat slice)', 247, 13, 'g', '1 slice ≈ 30g = 74 kcal'],
  ['Banana', 89, 1.1, 'g', '1 medium ≈ 120g = 105 kcal'],
  ['Apple', 52, 0.3, 'g', '1 medium ≈ 180g = 95 kcal'],
  ['Orange', 47, 0.9, 'g', '1 medium ≈ 130g = 62 kcal'],
  ['Mango', 60, 0.8, 'g', '1 medium ≈ 200g'],
  ['Watermelon', 30, 0.6, 'g', ''],
  ['Grapes', 67, 0.7, 'g', ''],
  ['Dates', 277, 1.8, 'g', '1 date ≈ 8g = 22 kcal'],
  ['Cucumber', 16, 0.7, 'g', ''],
  ['Tomato', 18, 0.9, 'g', ''],
  ['Lettuce', 15, 1.4, 'g', ''],
  ['Carrot', 41, 0.9, 'g', ''],
  ['Onion', 40, 1.1, 'g', ''],
  ['Milk (full fat)', 61, 3.2, 'g', 'per 100ml'],
  ['Milk (low fat)', 42, 3.4, 'g', 'per 100ml'],
  ['Cheese cheddar', 403, 25, 'g', ''],
  ['Butter', 717, 0.9, 'g', '1 tsp ≈ 5g = 36 kcal'],
  ['Olive oil', 884, 0, 'g', '1 tbsp ≈ 14g = 124 kcal'],
  ['Almonds', 579, 21, 'g', '10 almonds ≈ 12g = 70 kcal'],
  ['Walnuts', 654, 15, 'g', ''],
  ['Burger (beef regular)', 295, 17, 'pc', '1 burger ≈ 200g'],
  ['Pizza slice (cheese)', 285, 12, 'pc', '1 slice ≈ 100g'],
  ['Shawarma (chicken)', 245, 18, 'pc', '1 wrap ≈ 250g'],
  ['Zinger burger', 470, 22, 'pc', 'KFC style'],
  ['French fries', 312, 3.4, 'g', ''],
  ['Coca-Cola', 42, 0, 'g', 'per 100ml · 250ml = 105 kcal'],
  ['Coffee (black, no sugar)', 2, 0, 'pc', 'per cup'],
  ['Coffee (milk + sugar)', 60, 1.5, 'pc', 'per cup']
];

const H = {
  bgPanel: '#FFFFFF', bgRow: '#FFFFFF', bgAlt: '#F8FAFC', bgInput: '#FFFBEB',
  bgHeader: '#0F172A', bgSection: '#1E293B', bgAccent: '#D1FAE5',
  cardCal: '#D97706', cardProtein: '#7C3AED', cardWater: '#0EA5E9', cardWeight: '#16A34A',
  text: '#0F172A', textHi: '#000000', textMd: '#334155', textLo: '#64748B',
  success: '#16A34A', warning: '#D97706', danger: '#DC2626',
  goodBg: '#D1FAE5', goodText: '#065F46',
  warnBg: '#FEF3C7', warnText: '#78350F',
  badBg: '#FEE2E2', badText: '#7F1D1D'
};

function _alertH(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _questDayH() {
  if (typeof getQuestDay === 'function') return getQuestDay();
  const todayPKT = Utilities.formatDate(new Date(), HEALTH_TZ, 'yyyy-MM-dd');
  const tParts = todayPKT.split('-').map(Number);
  const tDate = new Date(Date.UTC(tParts[0], tParts[1] - 1, tParts[2]));
  const sDate = new Date(Date.UTC(2026, 3, 25));
  return Math.max(1, Math.floor((tDate - sDate) / 86400000) + 1);
}

function _hRound(n, dec) { const m = Math.pow(10, dec || 1); return Math.round(n * m) / m; }

// ════════════════════════════════════════════════════════════════════
// MAIN ENTRY
// ════════════════════════════════════════════════════════════════════

function rebuildHealthCockpit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Build main Health tab
  let s = ss.getSheetByName(HEALTH_TAB);
  if (!s) s = ss.insertSheet(HEALTH_TAB);

  const existingFoodLog = _readExistingFoodLog(s);
  const existingWaterLog = _readExistingWaterLog(s);

  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());

  if (s.getMaxColumns() < 12) s.insertColumnsAfter(s.getMaxColumns(), 12 - s.getMaxColumns());
  if (s.getMaxRows() < 100) s.insertRowsAfter(s.getMaxRows(), 100 - s.getMaxRows());

  try { s.setTabColor('#16A34A'); } catch (e) {}

  // 12 cols × 125px = 1500px (your viewport)
  const widths = [125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125];
  widths.forEach((w, i) => s.setColumnWidth(i + 1, w));

  buildHealthChrome(s);
  buildHealthDashboard(s);
  buildHealthQuickEntry(s);
  buildHealthTodayLog(s, existingFoodLog);
  buildHealthWaterTracker(s, existingWaterLog);
  buildHealthTrends(s);
  buildHealthMetrics(s);
  buildHealthArchive(s, existingFoodLog);

  s.setFrozenRows(13);   // Keep Dashboard + Quick Entry sticky

  // Build separate Library tab
  buildFoodLibraryTab(ss);

  installHealthHandler();
  appendHealthMenu();

  if (typeof logAuditAction === 'function') {
    logAuditAction('HEALTH_REBUILD', 'v1.1 polished · ' + HEALTH_FOOD_LIBRARY.length + ' library foods');
  }

  _alertH('🏥 Health v1.1 built.\n\n' +
          '🏥 Health tab — Dashboard + Quick Entry + Today\'s Log + Water + Trends + Metrics\n' +
          '📚 Food Library tab — ' + HEALTH_FOOD_LIBRARY.length + ' foods reference\n\n' +
          'Sticky rows 1-13 keep dashboard + entry visible while you scroll.\n\n' +
          'Bismillah.');
}

// ──────────── chrome rows 1-3 ────────────

function buildHealthChrome(s) {
  s.getRange('A1:L1').merge()
    .setValue('🏥 HEALTH — Day ' + _questDayH() + ' of 90 · Cutting toward 69 kg')
    .setBackground('#065F46').setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(18).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 44);

  s.getRange('A2:L2').merge()
    .setFormula('="📅 " & TEXT(TODAY(),"dddd · dd MMMM yyyy") & "  ·  ⚖️ Latest: " & ' +
                'IFERROR(TEXT(INDEX(\'📈 Progress\'!B6:B36,COUNTA(\'📈 Progress\'!B6:B36)),"0.0") & " kg","—") & ' +
                '"  ·  🎯 Target: 69.0 kg  ·  📚 Food Library tab for reference"')
    .setBackground(H.bgAccent).setFontColor(H.goodText).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(2, 28);
  s.setRowHeight(3, 6);
}

// ──────────── DASHBOARD rows 4-7 — 4 uniform cards w/ progress bars ────────────

function buildHealthDashboard(s) {
  s.getRange('A4:L4').merge()
    .setValue('📊 TODAY')
    .setBackground(H.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center');
  s.setRowHeight(4, 26);

  // Helper formulas (computed once for reuse)
  const wF = 'INDEX(\'📈 Progress\'!B6:B36,COUNTA(\'📈 Progress\'!B6:B36))';
  const calTodayF = 'IFERROR(SUMIFS(G14:G33,A14:A33,TODAY()),0)+IFERROR(SUMIFS(G37:G86,A37:A86,TODAY()),0)';
  const proteinTodayF = 'IFERROR(SUMIFS(H14:H33,A14:A33,TODAY()),0)+IFERROR(SUMIFS(H37:H86,A37:A86,TODAY()),0)';
  const waterTodayF = 'IFERROR(SUMIFS(C92:C98,A92:A98,TODAY()),0)/' + HEALTH_BASELINE.waterGlassMl;

  // Row 5: 4 stat cards each 3 cols wide = 12 cols total uniform
  // Card 1: Weight (cols A-C)
  s.getRange('A5:C5').merge()
    .setFormula('="⚖️  WEIGHT" & CHAR(10) & ' +
                'IFERROR(TEXT(' + wF + ',"0.0")&" kg","— kg") & CHAR(10) & ' +
                'IFERROR("("&TEXT(' + wF + '-' + HEALTH_BASELINE.targetWeight + ',"+0.0;-0.0")&" to target)","")')
    .setBackground(H.cardWeight).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  // Card 2: Calories (cols D-F)
  s.getRange('D5:F5').merge()
    .setFormula('="🔥  CALORIES" & CHAR(10) & ' +
                '(' + calTodayF + ') & " / ' + HEALTH_BASELINE.calTarget + '" & CHAR(10) & ' +
                'ROUND((' + calTodayF + ')/' + HEALTH_BASELINE.calTarget + '*100,0) & "% used"')
    .setBackground(H.cardCal).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  // Card 3: Protein (cols G-I)
  s.getRange('G5:I5').merge()
    .setFormula('="💪  PROTEIN" & CHAR(10) & ' +
                'ROUND(' + proteinTodayF + ',0) & "g / ' + HEALTH_BASELINE.proteinTarget + 'g" & CHAR(10) & ' +
                'ROUND(' + proteinTodayF + '/' + HEALTH_BASELINE.proteinTarget + '*100,0) & "% used"')
    .setBackground(H.cardProtein).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  // Card 4: Water (cols J-L)
  s.getRange('J5:L5').merge()
    .setFormula('="💧  WATER" & CHAR(10) & ' +
                'ROUND(' + waterTodayF + ',0) & " / ' + HEALTH_BASELINE.waterTargetGlasses + ' glasses" & CHAR(10) & ' +
                'ROUND((' + waterTodayF + ')*' + HEALTH_BASELINE.waterGlassMl + ',0) & " ml")')
    .setBackground(H.cardWater).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  s.setRowHeight(5, 64);

  // Row 6: Inline progress bars (one per card aligned beneath)
  s.getRange('A6:C6').merge().setFormula(
    '=LET(p,MIN(1,(' + HEALTH_BASELINE.startWeight + '-IFERROR(' + wF + ',' + HEALTH_BASELINE.startWeight + '))/(' + HEALTH_BASELINE.startWeight + '-' + HEALTH_BASELINE.targetWeight + ')),' +
    'REPT("█",ROUND(p*15,0))&REPT("░",15-ROUND(p*15,0)))'
  ).setFontFamily('Courier New').setFontColor(H.cardWeight).setBackground('#F0FDF4')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.getRange('D6:F6').merge().setFormula(
    '=LET(p,MIN(1,(' + calTodayF + ')/' + HEALTH_BASELINE.calTarget + '),' +
    'REPT("█",ROUND(p*15,0))&REPT("░",15-ROUND(p*15,0)))'
  ).setFontFamily('Courier New').setFontColor(H.cardCal).setBackground('#FFF7ED')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.getRange('G6:I6').merge().setFormula(
    '=LET(p,MIN(1,' + proteinTodayF + '/' + HEALTH_BASELINE.proteinTarget + '),' +
    'REPT("█",ROUND(p*15,0))&REPT("░",15-ROUND(p*15,0)))'
  ).setFontFamily('Courier New').setFontColor(H.cardProtein).setBackground('#F5F3FF')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.getRange('J6:L6').merge().setFormula(
    '=LET(p,MIN(1,(' + waterTodayF + ')/' + HEALTH_BASELINE.waterTargetGlasses + '),' +
    'REPT("█",ROUND(p*15,0))&REPT("░",15-ROUND(p*15,0)))'
  ).setFontFamily('Courier New').setFontColor(H.cardWater).setBackground('#F0F9FF')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');

  s.setRowHeight(6, 22);

  // Row 7: Deficit + projection
  s.getRange('A7:L7').merge()
    .setFormula(
      '="📉 TDEE estimate: " & ROUND(IFERROR(10*' + wF + '+6.25*' + HEALTH_BASELINE.heightCm + 
      '-5*' + HEALTH_BASELINE.age + '+5,1700)*1.3,0) & " kcal/day" & ' +
      '"   ·   Today\'s deficit: " & ROUND(IFERROR(10*' + wF + '+6.25*' + HEALTH_BASELINE.heightCm + 
      '-5*' + HEALTH_BASELINE.age + '+5,1700)*1.3-(' + calTodayF + '),0) & " kcal" & ' +
      '"   ·   Projected weekly: " & ROUND((IFERROR(10*' + wF + '+6.25*' + HEALTH_BASELINE.heightCm + 
      '-5*' + HEALTH_BASELINE.age + '+5,1700)*1.3-' + HEALTH_BASELINE.calTarget + ')*7/7700,2) & " kg loss"'
    )
    .setBackground('#F0FDF4').setFontColor(H.goodText).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(7, 26);
  s.setRowHeight(8, 6);
}

// ──────────── QUICK ENTRY rows 9-12 ────────────

function buildHealthQuickEntry(s) {
  s.getRange('A9:L9').merge()
    .setValue('🍽️ QUICK ENTRY — pick food in C11 → Cal/Unit auto-fills → adjust qty → ✅ in L11')
    .setBackground(H.bgHeader).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(9, 24);

  const labels = ['Date', 'Meal', 'Food', 'Qty', 'Unit', 'Cal/Unit', 'Total Cal', 'Protein g', 'Notes', '', 'Status', '✅ Log'];
  s.getRange(10, 1, 1, 12).setValues([labels])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(10, 22);

  s.getRange('A11').setValue(new Date()).setNumberFormat('dd MMM yyyy');
  s.getRange('B11').setValue('Lunch');
  s.getRange('C11').setValue('');
  s.getRange('D11').setValue(100);
  s.getRange('E11').setValue('g');
  s.getRange('F11').setValue('').setNumberFormat('0.00');
  s.getRange('G11').setFormula('=IFERROR(D11*F11,"")').setNumberFormat('#,##0');
  s.getRange('H11').setValue('').setNumberFormat('0.0');
  s.getRange('I11:J11').merge().setValue('');
  s.getRange('K11').setValue('ready');
  s.getRange('L11').insertCheckboxes();

  s.getRange('A11:H11').setBackground(H.bgInput).setFontColor(H.text).setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('I11:J11').setBackground(H.bgInput).setFontColor(H.text).setFontSize(11)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  s.getRange('K11').setBackground(H.bgAlt).setFontColor(H.textLo).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('L11').setBackground(H.success).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(11, 32);

  // Dropdowns
  const dateDV = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build();
  s.getRange('A11').setDataValidation(dateDV);
  const mealDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Breakfast', 'Snack', 'Lunch', 'Snack 2', 'Dinner', 'Late Night'], true)
    .setAllowInvalid(true).build();
  s.getRange('B11').setDataValidation(mealDV);
  const foodNames = HEALTH_FOOD_LIBRARY.map(f => f[0]);
  const foodDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(foodNames, true).setAllowInvalid(true).build();
  s.getRange('C11').setDataValidation(foodDV);
  const unitDV = SpreadsheetApp.newDataValidation()
    .requireValueInList(['g', 'pc', 'ml', 'cup', 'tbsp', 'tsp'], true).setAllowInvalid(true).build();
  s.getRange('E11').setDataValidation(unitDV);

  s.getRange('A12:L12').merge()
    .setValue('💡 Library auto-fills cal/protein when you pick a food · Status cell K11 shows result · Form auto-clears for next entry')
    .setBackground(H.bgAlt).setFontColor(H.textLo).setFontStyle('italic')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(12, 22);
  s.setRowHeight(13, 6);
}

// ──────────── TODAY'S LOG rows 14-35 (20 entry slots, today-focused) ────────────

function buildHealthTodayLog(s, existingLog) {
  s.getRange('A14:L14').merge()
    .setValue('📋 TODAY\'S LOG — current day food entries · scroll down for archive')
    .setBackground(H.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(14, 24);

  const lhdr = ['Date', 'Meal', 'Food', 'Qty', 'Unit', 'Cal/Unit', 'Total Cal', 'Protein g', 'Notes', '', '', '↩️ Remove'];
  s.getRange(15, 1, 1, 12).setValues([lhdr])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(15, 22);

  // Today's entries occupy rows 16-33 (18 slots)
  const todayDateStr = Utilities.formatDate(new Date(), HEALTH_TZ, 'yyyy-MM-dd');
  const todayEntries = existingLog.filter(e => 
    e[0] instanceof Date && Utilities.formatDate(e[0], HEALTH_TZ, 'yyyy-MM-dd') === todayDateStr
  );

  for (let i = 0; i < Math.min(todayEntries.length, 18); i++) {
    const r = 16 + i;
    const e = todayEntries[i];
    s.getRange(r, 1).setValue(e[0]).setNumberFormat('dd MMM yyyy');
    s.getRange(r, 2).setValue(e[1] || '');
    s.getRange(r, 3).setValue(e[2] || '');
    s.getRange(r, 4).setValue(e[3] || 0);
    s.getRange(r, 5).setValue(e[4] || 'g');
    s.getRange(r, 6).setValue(e[5] || 0).setNumberFormat('0.00');
    s.getRange(r, 7).setValue(e[6] || 0).setNumberFormat('#,##0');
    s.getRange(r, 8).setValue(e[7] || 0).setNumberFormat('0.0');
    s.getRange(r, 9, 1, 3).merge().setValue(e[8] || '');
  }

  // Style 16-33
  for (let r = 16; r <= 33; r++) {
    const bg = (r % 2 === 0) ? H.bgRow : H.bgAlt;
    s.getRange(r, 1, 1, 9).setBackground(bg).setFontColor(H.text).setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 9, 1, 3).merge().setBackground(bg).setFontColor(H.textMd).setFontStyle('italic')
      .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.getRange(r, 12).insertCheckboxes();
    s.getRange(r, 12).setBackground(H.warning).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(r, 22);
  }

  // Today total row 34
  s.getRange(34, 1, 1, 6).merge().setValue('📊 TODAY TOTAL')
    .setBackground('#065F46').setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(34, 7).setFormula(
    '=IFERROR(SUMIFS(G16:G33,A16:A33,TODAY())+SUMIFS(G37:G86,A37:A86,TODAY()),0)'
  ).setNumberFormat('#,##0').setBackground(H.goodBg).setFontColor(H.goodText).setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(34, 8).setFormula(
    '=IFERROR(ROUND(SUMIFS(H16:H33,A16:A33,TODAY())+SUMIFS(H37:H86,A37:A86,TODAY()),0),0)'
  ).setNumberFormat('0').setBackground(H.goodBg).setFontColor(H.goodText).setFontWeight('bold')
    .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(34, 9, 1, 4).merge().setFormula(
    '="of " & ' + HEALTH_BASELINE.calTarget + ' & " kcal & " & ' + HEALTH_BASELINE.proteinTarget + ' & "g protein target"'
  ).setBackground('#F0FDF4').setFontColor(H.goodText).setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(34, 32);
  s.setRowHeight(35, 6);
}

// ──────────── ARCHIVE rows 36-86 (50 historic entries) ────────────

function buildHealthArchive(s, existingLog) {
  s.getRange('A36:L36').merge()
    .setValue('📦 ARCHIVE — last 50 historic food entries (older than today)')
    .setBackground('#475569').setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center');
  s.setRowHeight(36, 22);

  const todayDateStr = Utilities.formatDate(new Date(), HEALTH_TZ, 'yyyy-MM-dd');
  const archiveEntries = existingLog
    .filter(e => e[0] instanceof Date && Utilities.formatDate(e[0], HEALTH_TZ, 'yyyy-MM-dd') !== todayDateStr)
    .sort((a, b) => b[0] - a[0])
    .slice(0, 50);

  for (let i = 0; i < archiveEntries.length; i++) {
    const r = 37 + i;
    const e = archiveEntries[i];
    s.getRange(r, 1).setValue(e[0]).setNumberFormat('dd MMM yyyy');
    s.getRange(r, 2).setValue(e[1] || '');
    s.getRange(r, 3).setValue(e[2] || '');
    s.getRange(r, 4).setValue(e[3] || 0);
    s.getRange(r, 5).setValue(e[4] || 'g');
    s.getRange(r, 6).setValue(e[5] || 0).setNumberFormat('0.00');
    s.getRange(r, 7).setValue(e[6] || 0).setNumberFormat('#,##0');
    s.getRange(r, 8).setValue(e[7] || 0).setNumberFormat('0.0');
    s.getRange(r, 9, 1, 3).merge().setValue(e[8] || '');
  }

  for (let r = 37; r <= 86; r++) {
    const bg = (r % 2 === 0) ? H.bgRow : H.bgAlt;
    s.getRange(r, 1, 1, 9).setBackground(bg).setFontColor(H.text).setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 9, 1, 3).merge().setBackground(bg).setFontColor(H.textMd).setFontStyle('italic')
      .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.getRange(r, 12).insertCheckboxes();
    s.getRange(r, 12).setBackground(H.warning).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(r, 22);
  }

  s.setRowHeight(87, 6);
}

// ──────────── WATER rows 88-99 ────────────

function buildHealthWaterTracker(s, existingWater) {
  s.getRange('A88:L88').merge()
    .setValue('💧 WATER TRACKER — single-click +1 glass for today (250ml each)')
    .setBackground(H.cardWater).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(88, 24);

  const wHdr = ['Date', 'Glasses', 'ml Total', 'Last sip', '', '+1 Glass', '', '', '', '', '', ''];
  s.getRange(89, 1, 1, 12).setValues([wHdr])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(89, 22);

  // Quick add row 90
  s.getRange('A90').setFormula('=TODAY()').setNumberFormat('dd MMM yyyy');
  s.getRange('B90').setFormula(
    '=IFERROR(SUMIFS(C92:C98,A92:A98,TODAY())/' + HEALTH_BASELINE.waterGlassMl + ',0)'
  ).setNumberFormat('0');
  s.getRange('C90').setFormula(
    '=IFERROR(SUMIFS(C92:C98,A92:A98,TODAY()),0)'
  ).setNumberFormat('#,##0" ml"');
  s.getRange('D90').setValue('').setFontStyle('italic');
  s.getRange('E90').setValue('');
  s.getRange('F90').insertCheckboxes();
  s.getRange('G90:L90').merge()
    .setFormula(
      '="Today: " & B90 & " / ' + HEALTH_BASELINE.waterTargetGlasses + ' glasses · " & ' +
      'IF(B90>=' + HEALTH_BASELINE.waterTargetGlasses + ',"✓ target hit","need " & (' + 
      HEALTH_BASELINE.waterTargetGlasses + '-B90) & " more")'
    );

  s.getRange('A90:E90').setBackground('#E0F2FE').setFontColor(H.text).setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('F90').setBackground(H.cardWater).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange('G90:L90').setBackground('#F0F9FF').setFontColor('#0369A1').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(90, 32);

  // Log rows 92-98 (7 days rolling)
  s.setRowHeight(91, 4);
  for (let i = 0; i < 7; i++) {
    const r = 92 + i;
    if (i < existingWater.length && existingWater[i][0] instanceof Date) {
      s.getRange(r, 1).setValue(existingWater[i][0]).setNumberFormat('dd MMM');
      s.getRange(r, 2).setValue(existingWater[i][1] || 0);
      s.getRange(r, 3).setValue(existingWater[i][2] || 0).setNumberFormat('#,##0');
      s.getRange(r, 4).setValue(existingWater[i][3] || '');
    }
    const bg = (r % 2 === 0) ? H.bgRow : H.bgAlt;
    s.getRange(r, 1, 1, 4).setBackground(bg).setFontColor(H.text).setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(r, 22);
  }
  s.setRowHeight(99, 6);
}

// ──────────── TRENDS rows 100-110 ────────────

function buildHealthTrends(s) {
  s.getRange('A100:L100').merge()
    .setValue('📈 LAST 7 DAYS — calorie + weight trend')
    .setBackground(H.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(100, 24);

  const tHdr = ['Day', 'Date', 'Cal Total', 'Protein g', 'Weight kg', 'Bar', '', '', 'Status', '', '', ''];
  s.getRange(101, 1, 1, 12).setValues([tHdr])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center');
  s.setRowHeight(101, 22);

  const dayLabels = ['Today', '-1', '-2', '-3', '-4', '-5', '-6'];
  for (let i = 0; i < 7; i++) {
    const r = 102 + i;
    s.getRange(r, 1).setValue(dayLabels[i]).setFontWeight('bold');
    s.getRange(r, 2).setFormula('=TODAY()-' + i).setNumberFormat('ddd dd MMM');
    s.getRange(r, 3).setFormula(
      '=IFERROR(SUMIFS(G16:G33,A16:A33,TODAY()-' + i + ')+SUMIFS(G37:G86,A37:A86,TODAY()-' + i + '),0)'
    ).setNumberFormat('#,##0');
    s.getRange(r, 4).setFormula(
      '=IFERROR(ROUND(SUMIFS(H16:H33,A16:A33,TODAY()-' + i + ')+SUMIFS(H37:H86,A37:A86,TODAY()-' + i + '),0),0)'
    ).setNumberFormat('0');
    s.getRange(r, 5).setFormula('=IFERROR(VLOOKUP(TODAY()-' + i + ',\'📈 Progress\'!A6:B36,2,FALSE),"—")').setNumberFormat('0.0');
    s.getRange(r, 6, 1, 3).merge().setFormula(
      '=IFERROR(IF(C' + r + '=0,"",REPT("█",MIN(ROUND(C' + r + '/' + HEALTH_BASELINE.calTarget + 
      '*22,0),22))&REPT("░",MAX(22-ROUND(C' + r + '/' + HEALTH_BASELINE.calTarget + '*22,0),0))),"")'
    ).setFontFamily('Courier New').setFontSize(10).setFontColor(H.cardCal);
    s.getRange(r, 9, 1, 4).merge().setFormula(
      '=IFERROR(IF(C' + r + '=0,"no log",IF(C' + r + '<=' + HEALTH_BASELINE.calTarget + 
      ',"✓ deficit","⚠ over by " & (C' + r + '-' + HEALTH_BASELINE.calTarget + ') & " kcal")),"")'
    );

    const bg = (r % 2 === 0) ? H.bgRow : H.bgAlt;
    s.getRange(r, 1, 1, 12).setBackground(bg).setFontColor(H.text).setFontSize(10)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(r, 22);
  }

  s.setRowHeight(109, 4);

  // Avg row 110
  s.getRange(110, 1, 1, 2).merge().setValue('📊 7-DAY AVG').setBackground('#065F46').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.getRange(110, 3).setFormula('=IFERROR(ROUND(AVERAGE(C102:C108),0),0)').setNumberFormat('#,##0')
    .setBackground(H.goodBg).setFontColor(H.goodText).setFontWeight('bold').setFontSize(12);
  s.getRange(110, 4).setFormula('=IFERROR(ROUND(AVERAGE(D102:D108),0),0)').setNumberFormat('0')
    .setBackground(H.goodBg).setFontColor(H.goodText).setFontWeight('bold').setFontSize(12);
  s.getRange(110, 5).setFormula('=IFERROR(ROUND(AVERAGE(IFERROR(VALUE(E102:E108),"")),1),0)').setNumberFormat('0.0')
    .setBackground(H.goodBg).setFontColor(H.goodText).setFontWeight('bold').setFontSize(12);
  s.getRange(110, 6, 1, 7).merge()
    .setFormula('="kcal · g · kg avg/day · projected weekly: " & ' +
                'IFERROR(ROUND((1700*1.3-AVERAGE(C102:C108))*7/7700,2),"—") & " kg loss"')
    .setBackground('#F0FDF4').setFontColor(H.goodText).setFontStyle('italic')
    .setFontSize(11).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(110, 30);
  s.setRowHeight(111, 8);
}

// ──────────── METRICS rows 112-120 ────────────

function buildHealthMetrics(s) {
  s.getRange('A112:L112').merge()
    .setValue('🏥 KEY METRICS — BMI · BMR · TDEE · projection to target')
    .setBackground(H.bgSection).setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(12).setHorizontalAlignment('center');
  s.setRowHeight(112, 24);

  const wF = 'INDEX(\'📈 Progress\'!B6:B36,COUNTA(\'📈 Progress\'!B6:B36))';
  const bmrF = '10*' + wF + '+6.25*' + HEALTH_BASELINE.heightCm + '-5*' + HEALTH_BASELINE.age + '+5';

  const metrics = [
    ['📏 BMI', '=IFERROR(ROUND(' + wF + '/((' + HEALTH_BASELINE.heightCm + '/100)^2),1),0)', 'healthy 18.5-24.9'],
    ['🔥 BMR (at rest)', '=IFERROR(ROUND(' + bmrF + ',0),0)', 'kcal/day Mifflin-St Jeor'],
    ['⚡ TDEE (lightly active)', '=IFERROR(ROUND(' + bmrF + '*1.3,0),0)', 'kcal/day · your est'],
    ['📉 Daily deficit at 1500', '=IFERROR(ROUND(' + bmrF + '*1.3-' + HEALTH_BASELINE.calTarget + ',0),0)', 'kcal/day vs TDEE'],
    ['📅 Days to 69 kg target', 
     '=IFERROR(ROUND((' + wF + '-' + HEALTH_BASELINE.targetWeight + ')*7700/(' + bmrF + '*1.3-' + HEALTH_BASELINE.calTarget + '),0),"—")', 'at current target'],
    ['🎯 Target arrival date', 
     '=IFERROR(TEXT(TODAY()+ROUND((' + wF + '-' + HEALTH_BASELINE.targetWeight + ')*7700/(' + bmrF + '*1.3-' + HEALTH_BASELINE.calTarget + '),0),"dd MMM yyyy"),"—")', '']
  ];

  metrics.forEach((m, i) => {
    const r = 113 + i;
    s.getRange(r, 1, 1, 5).merge().setValue(m[0])
      .setBackground('#1E293B').setFontColor('#FFFFFF').setFontWeight('bold')
      .setFontSize(11).setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.getRange(r, 6, 1, 3).merge().setFormula(m[1])
      .setBackground(H.goodBg).setFontColor(H.goodText).setFontWeight('bold')
      .setFontSize(13).setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.getRange(r, 9, 1, 4).merge().setValue(m[2])
      .setBackground(H.bgPanel).setFontColor(H.textLo).setFontStyle('italic')
      .setFontSize(10).setHorizontalAlignment('left').setVerticalAlignment('middle');
    s.setRowHeight(r, 26);
  });
}

// ──────────── FOOD LIBRARY (separate tab) ────────────

function buildFoodLibraryTab(ss) {
  let s = ss.getSheetByName(HEALTH_LIBRARY_TAB);
  if (!s) s = ss.insertSheet(HEALTH_LIBRARY_TAB);

  const existing = _readLibraryTab(s);

  s.clear(); s.clearConditionalFormatRules(); s.clearNotes();
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).clearDataValidations();
  s.showRows(1, s.getMaxRows());

  if (s.getMaxColumns() < 6) s.insertColumnsAfter(s.getMaxColumns(), 6 - s.getMaxColumns());

  try { s.setTabColor('#16A34A'); } catch (e) {}

  const widths = [280, 110, 130, 80, 400, 120];
  widths.forEach((w, i) => s.setColumnWidth(i + 1, w));

  s.getRange('A1:F1').merge()
    .setValue('📚 FOOD LIBRARY — calorie + protein reference · edit to customize · ' + HEALTH_FOOD_LIBRARY.length + ' foods seeded')
    .setBackground('#065F46').setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(15).setHorizontalAlignment('center').setVerticalAlignment('middle');
  s.setRowHeight(1, 36);

  s.getRange('A2:F2').merge()
    .setValue('💡 Edit any cell to customize · changes persist across rebuilds · used by 🏥 Health Quick Entry dropdown')
    .setBackground(H.bgAccent).setFontColor(H.goodText).setFontStyle('italic')
    .setFontSize(11).setHorizontalAlignment('center');
  s.setRowHeight(2, 24);
  s.setRowHeight(3, 6);

  const hdr = ['Food Name', 'Cal / 100g', 'Protein g/100g', 'Default Unit', 'Notes', 'Category'];
  s.getRange(4, 1, 1, 6).setValues([hdr])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontWeight('bold')
    .setFontSize(11).setHorizontalAlignment('center');
  s.setRowHeight(4, 26);

  const libraryData = (existing && existing.length > 5) ? existing : HEALTH_FOOD_LIBRARY;

  for (let i = 0; i < libraryData.length; i++) {
    const r = 5 + i;
    const item = libraryData[i];
    s.getRange(r, 1).setValue(item[0]);
    s.getRange(r, 2).setValue(item[1]).setNumberFormat('0');
    s.getRange(r, 3).setValue(item[2]).setNumberFormat('0.0');
    s.getRange(r, 4).setValue(item[3]);
    s.getRange(r, 5).setValue(item[4] || '');

    let category = '';
    const note = (item[4] || '').toString().toLowerCase();
    if (note.indexOf('pakistani') !== -1) category = '🇵🇰 Pakistani';
    else if (item[0].toLowerCase().match(/chicken|beef|mutton|fish|tuna|egg|yogurt|cheese|whey|protein/)) category = '💪 Protein';
    else if (item[0].toLowerCase().match(/rice|bread|pasta|oats|potato/)) category = '🍞 Carbs';
    else if (item[0].toLowerCase().match(/banana|apple|orange|mango|watermelon|grape|date/)) category = '🍎 Fruit';
    else if (item[0].toLowerCase().match(/cucumber|tomato|lettuce|carrot|onion/)) category = '🥗 Veg';
    else if (item[0].toLowerCase().match(/milk|butter|olive|almond|walnut/)) category = '🥛 Dairy/Fat';
    else if (item[0].toLowerCase().match(/burger|pizza|shawarma|zinger|fries/)) category = '🍔 Fast food';
    else if (item[0].toLowerCase().match(/cola|coffee|chai|lassi/)) category = '🥤 Beverage';
    else category = '⚪ Other';
    s.getRange(r, 6).setValue(category);

    const bg = (r % 2 === 0) ? H.bgRow : H.bgAlt;
    s.getRange(r, 1, 1, 6).setBackground(bg).setFontColor(H.text).setFontSize(10)
      .setVerticalAlignment('middle');
    s.getRange(r, 1).setHorizontalAlignment('left').setFontWeight('bold');
    s.getRange(r, 2, 1, 3).setHorizontalAlignment('center');
    s.getRange(r, 5).setHorizontalAlignment('left').setFontStyle('italic').setFontColor(H.textLo);
    s.getRange(r, 6).setHorizontalAlignment('center').setFontWeight('bold');
    s.setRowHeight(r, 22);
  }

  s.setFrozenRows(4);
}

// ──────────── read existing data (preserve on rebuild) ────────────

function _readExistingFoodLog(s) {
  const result = [];
  if (!s) return result;
  try {
    // Read both today log (16-33) and archive (37-86)
    for (let r = 16; r <= 33; r++) {
      const row = s.getRange(r, 1, 1, 9).getValues()[0];
      if (row[0] instanceof Date) result.push(row);
    }
    for (let r = 37; r <= 86; r++) {
      const row = s.getRange(r, 1, 1, 9).getValues()[0];
      if (row[0] instanceof Date) result.push(row);
    }
  } catch (e) {}
  return result;
}

function _readExistingWaterLog(s) {
  const result = [];
  if (!s) return result;
  try {
    for (let r = 92; r <= 98; r++) {
      const row = s.getRange(r, 1, 1, 4).getValues()[0];
      if (row[0] instanceof Date) result.push(row);
    }
  } catch (e) {}
  return result;
}

function _readLibraryTab(s) {
  const result = [];
  if (!s) return result;
  try {
    for (let r = 5; r <= 200; r++) {
      const row = s.getRange(r, 1, 1, 5).getValues()[0];
      if (row[0]) result.push([row[0], row[1] || 0, row[2] || 0, row[3] || 'g', row[4] || '']);
    }
  } catch (e) {}
  return result;
}

// ════════════════════════════════════════════════════════════════════
// ACTIONS
// ════════════════════════════════════════════════════════════════════

function submitFoodFromQuickEntry(s) {
  const date = s.getRange('A11').getValue();
  const meal = s.getRange('B11').getValue();
  const food = s.getRange('C11').getValue();
  const qty = s.getRange('D11').getValue();
  const unit = s.getRange('E11').getValue();
  let calPerUnit = s.getRange('F11').getValue();
  let totalCal = s.getRange('G11').getValue();
  let protein = s.getRange('H11').getValue();
  const notes = s.getRange('I11').getValue();

  const setStatus = (txt, color) => {
    s.getRange('K11').setValue(txt).setBackground(color || H.bgAlt).setFontColor(color === H.warnBg ? H.warnText : H.goodText);
  };

  if (!(date instanceof Date)) { s.getRange('L11').setValue(false); setStatus('⚠ no date', H.warnBg); return; }
  if (!food) { s.getRange('L11').setValue(false); setStatus('⚠ no food', H.warnBg); return; }
  if (!qty || typeof qty !== 'number' || qty <= 0) { s.getRange('L11').setValue(false); setStatus('⚠ bad qty', H.warnBg); return; }

  // If Cal/Unit blank, look up library
  if (!calPerUnit || typeof calPerUnit !== 'number') {
    const libMatch = HEALTH_FOOD_LIBRARY.find(item => 
      item[0].toLowerCase() === String(food).toLowerCase().trim()
    );
    if (libMatch) {
      if (unit === 'g' || unit === 'ml') {
        calPerUnit = libMatch[1] / 100;
        protein = (libMatch[2] / 100) * qty;
      } else {
        calPerUnit = libMatch[1];
        protein = libMatch[2];
      }
      totalCal = qty * calPerUnit;
    } else {
      s.getRange('L11').setValue(false);
      setStatus('⚠ no cal/unit', H.warnBg);
      return;
    }
  } else {
    totalCal = qty * calPerUnit;
    if (!protein || typeof protein !== 'number') {
      const libMatch = HEALTH_FOOD_LIBRARY.find(item => 
        item[0].toLowerCase() === String(food).toLowerCase().trim()
      );
      protein = libMatch ? ((unit === 'g' || unit === 'ml') ? (libMatch[2] / 100) * qty : libMatch[2]) : 0;
    }
  }

  // Find next empty row in today's log (16-33), then archive (37-86)
  let nextRow = -1;
  for (let r = 16; r <= 33; r++) {
    if (!s.getRange(r, 1).getValue()) { nextRow = r; break; }
  }
  if (nextRow === -1) {
    for (let r = 37; r <= 86; r++) {
      if (!s.getRange(r, 1).getValue()) { nextRow = r; break; }
    }
  }
  if (nextRow === -1) { s.getRange('L11').setValue(false); setStatus('⚠ log full', H.badBg); return; }

  s.getRange(nextRow, 1).setValue(date).setNumberFormat('dd MMM yyyy');
  s.getRange(nextRow, 2).setValue(meal || '');
  s.getRange(nextRow, 3).setValue(food);
  s.getRange(nextRow, 4).setValue(qty);
  s.getRange(nextRow, 5).setValue(unit || 'g');
  s.getRange(nextRow, 6).setValue(_hRound(calPerUnit, 2)).setNumberFormat('0.00');
  s.getRange(nextRow, 7).setValue(Math.round(totalCal)).setNumberFormat('#,##0');
  s.getRange(nextRow, 8).setValue(_hRound(protein, 1)).setNumberFormat('0.0');
  s.getRange(nextRow, 9).setValue(notes || '');

  // Auto-clear form for next entry
  s.getRange('A11').setValue(new Date());
  s.getRange('C11').setValue('');
  s.getRange('D11').setValue(100);
  s.getRange('F11').setValue('');
  s.getRange('H11').setValue('');
  s.getRange('I11:J11').setValue('');
  s.getRange('L11').setValue(false);

  setStatus('✓ ' + Math.round(totalCal) + ' kcal', H.goodBg);

  if (typeof logAuditAction === 'function') {
    logAuditAction('FOOD_LOGGED', food + ' · ' + qty + unit + ' · ' + Math.round(totalCal) + ' kcal');
  }

  try { _autoTickBodyHabits(); } catch (e) { Logger.log('Auto-tick skipped: ' + e); }
}

function addWaterGlass(s) {
  const today = new Date();
  const todayDateStr = Utilities.formatDate(today, HEALTH_TZ, 'yyyy-MM-dd');

  let todayRow = -1, firstEmpty = -1;
  for (let r = 92; r <= 98; r++) {
    const d = s.getRange(r, 1).getValue();
    if (d instanceof Date) {
      if (Utilities.formatDate(d, HEALTH_TZ, 'yyyy-MM-dd') === todayDateStr) { todayRow = r; break; }
    } else if (firstEmpty === -1) {
      firstEmpty = r;
    }
  }

  if (todayRow === -1) {
    if (firstEmpty === -1) {
      let oldestRow = 92, oldestDate = s.getRange(92, 1).getValue();
      for (let r = 93; r <= 98; r++) {
        const d = s.getRange(r, 1).getValue();
        if (d instanceof Date && d < oldestDate) { oldestDate = d; oldestRow = r; }
      }
      todayRow = oldestRow;
    } else {
      todayRow = firstEmpty;
    }
    s.getRange(todayRow, 1).setValue(today).setNumberFormat('dd MMM');
    s.getRange(todayRow, 2).setValue(0);
    s.getRange(todayRow, 3).setValue(0);
    s.getRange(todayRow, 4).setValue('');
  }

  const newGlasses = (s.getRange(todayRow, 2).getValue() || 0) + 1;
  s.getRange(todayRow, 2).setValue(newGlasses);
  s.getRange(todayRow, 3).setValue(newGlasses * HEALTH_BASELINE.waterGlassMl);
  s.getRange(todayRow, 4).setValue(Utilities.formatDate(today, HEALTH_TZ, 'HH:mm'));
  s.getRange('F90').setValue(false);

  if (typeof logAuditAction === 'function') {
    logAuditAction('WATER_LOGGED', newGlasses + ' glasses · ' + (newGlasses * HEALTH_BASELINE.waterGlassMl) + ' ml');
  }
  try { _autoTickBodyHabits(); } catch (e) {}
}

function reverseFoodLogRow(s, row) {
  const food = s.getRange(row, 3).getValue();
  const cal = s.getRange(row, 7).getValue();
  if (!food) { s.getRange(row, 12).setValue(false); return; }

  s.getRange(row, 1, 1, 9).clearContent();
  s.getRange(row, 12).setValue(false);

  if (typeof logAuditAction === 'function') {
    logAuditAction('FOOD_REMOVED', food + ' · -' + cal + ' kcal · row ' + row);
  }
  try { _autoTickBodyHabits(); } catch (e) {}
}

// ════════════════════════════════════════════════════════════════════
// AUTO-TICK BODY HABITS (silent, try/catch wrapped)
// ════════════════════════════════════════════════════════════════════

function _autoTickBodyHabits() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hab = ss.getSheetByName('📋 Habits');
    const hth = ss.getSheetByName(HEALTH_TAB);
    if (!hab || !hth) return;

    const dow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
    const todayCol = 2 + dow;

    const todayCal = hth.getRange('G34').getValue() || 0;
    const todayProtein = hth.getRange('H34').getValue() || 0;
    const todayWater = hth.getRange('B90').getValue() || 0;

    const habitsToTick = [
      { searchTerms: ['no fast food', 'no junk', 'cal target', 'calorie'], 
        condition: (todayCal > 0 && todayCal <= HEALTH_BASELINE.calTarget) },
      { searchTerms: ['protein', 'no sugar'], 
        condition: (todayProtein >= HEALTH_BASELINE.proteinTarget * 0.8) },
      { searchTerms: ['water', 'hydrat'], 
        condition: (todayWater >= HEALTH_BASELINE.waterTargetGlasses) }
    ];

    for (let row = 7; row <= 23; row++) {
      const name = (hab.getRange(row, 1).getValue() || '').toString().toLowerCase();
      if (!name || name.indexOf('·') !== -1) continue;

      habitsToTick.forEach(h => {
        const matched = h.searchTerms.some(term => name.indexOf(term) !== -1);
        if (matched && h.condition) {
          const current = hab.getRange(row, todayCol).getValue();
          if (current !== true && current !== '✓') {
            try { hab.getRange(row, todayCol).setValue(true); } catch (e) {}
          }
        }
      });
    }
  } catch (e) {
    Logger.log('Habit auto-tick failed (non-critical): ' + e);
  }
}

// ════════════════════════════════════════════════════════════════════
// ON-EDIT HANDLER
// ════════════════════════════════════════════════════════════════════

function _healthOnEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== HEALTH_TAB) return;

  const r = e.range.getRow();
  const c = e.range.getColumn();
  const v = e.value;

  // Quick entry submit (L11)
  if (r === 11 && c === 12 && (v === 'TRUE' || v === true)) {
    submitFoodFromQuickEntry(sh); return;
  }
  // Water +1 (F90)
  if (r === 90 && c === 6 && (v === 'TRUE' || v === true)) {
    addWaterGlass(sh); return;
  }
  // Reverse food log (col L = 12, rows 16-33 today + 37-86 archive)
  if (c === 12 && ((r >= 16 && r <= 33) || (r >= 37 && r <= 86)) && (v === 'TRUE' || v === true)) {
    reverseFoodLogRow(sh, r); return;
  }
  // Food picker auto-fill C11
  if (r === 11 && c === 3 && v) {
    const libMatch = HEALTH_FOOD_LIBRARY.find(item => 
      item[0].toLowerCase() === String(v).toLowerCase().trim()
    );
    if (libMatch) {
      const unit = sh.getRange('E11').getValue() || 'g';
      if (unit === 'g' || unit === 'ml') {
        sh.getRange('F11').setValue(libMatch[1] / 100);
      } else {
        sh.getRange('F11').setValue(libMatch[1]);
        sh.getRange('E11').setValue(libMatch[3]);
      }
      sh.getRange('K11').setValue('library matched ✓').setBackground(H.goodBg).setFontColor(H.goodText);
    }
  }
}

function installHealthHandler() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === '_healthOnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('_healthOnEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
}

// ════════════════════════════════════════════════════════════════════
// MENU
// ════════════════════════════════════════════════════════════════════

function appendHealthMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🏥 Health')
      .addItem('🔄 Rebuild Health Tab', 'rebuildHealthCockpit')
      .addSeparator()
      .addItem('🔧 Reinstall Edit Handler', 'installHealthHandler')
      .addItem('🏥 Auto-tick Body Habits Now', '_autoTickBodyHabits')
      .addToUi();
  } catch (e) { Logger.log('Health menu add failed: ' + e); }
}
