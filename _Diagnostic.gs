function _oneTimeAuditPatch() {
  if (typeof logAuditAction === 'function') {
    logAuditAction('DEBT_MANUAL_CORRECTION', 
      'Imran Bhai Paid: 70001 → 70000 · closing gap from pre-v2.9 reversal · 1 PKR test transaction reversed in Transactions on 29 Apr but Debts not auto-updated · manual restore by operator');
    Logger.log('✓ Audit entry logged successfully.');
  } else {
    Logger.log('✗ logAuditAction not found.');
  }
}









/**
 * _Diagnostic.gs — Operator utility (read-only inspectors + safe deletes + repairs)
 * 
 * Functions:
 *   listAllTabs()                       → log every tab name + visibility
 *   inspectQuestionableTabs()           → deep-dive on 9 evaluable tabs
 *   inspectSettingsErrors()             → focused look at B73 + B147
 *   auditSettingsBrokenFormulas()       → DRY RUN: list every broken PRO_ cell
 *   repairSettingsBrokenFormulas()      → APPLY: snapshot + replace '=' with defaults
 *   safeDeleteLegacyChartsTab()         → snapshot + delete '📉 Charts' only
 *   safeDeleteTab(name)                 → reusable safe-delete (snapshot first)
 * 
 * @version 2.2
 * @date    2026-04-29
 */

// ─────────────────────────────────────────────────────────────
// READ-ONLY INSPECTORS
// ─────────────────────────────────────────────────────────────

function listAllTabs() {
  const ss = SpreadsheetApp.getActive();
  const sheets = ss.getSheets();
  Logger.log('=== TAB INVENTORY ===');
  Logger.log('Total tabs: ' + sheets.length);
  Logger.log('');
  sheets.forEach(function(sheet, i) {
    const name = sheet.getName();
    const hidden = sheet.isSheetHidden() ? '[HIDDEN]' : '[VISIBLE]';
    const idx = String(i + 1).padStart(2, '0');
    Logger.log(idx + '. ' + hidden + ' "' + name + '"');
  });
  Logger.log('');
  Logger.log('=== END ===');
}

function inspectQuestionableTabs() {
  const TARGETS = [
    '📊 Charts', '📉 Charts', '💻 Skills', '🧠 AI Memory',
    '📚 Knowledge', '📊 Week', '🌳 Vision', '🎨 Themes', '⚙️ Settings'
  ];
  const ss = SpreadsheetApp.getActive();
  Logger.log('=== TAB INSPECTION ===');
  TARGETS.forEach(function(name) {
    Logger.log('');
    Logger.log('--- "' + name + '" ---');
    const sheet = ss.getSheetByName(name);
    if (!sheet) { Logger.log('  STATUS: NOT FOUND'); return; }
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    Logger.log('  Visibility: ' + (sheet.isSheetHidden() ? 'HIDDEN' : 'VISIBLE'));
    Logger.log('  Dimensions: ' + lastRow + ' rows × ' + lastCol + ' cols');
    if (lastRow === 0 || lastCol === 0) { Logger.log('  STATUS: EMPTY'); return; }
    const cols = Math.min(lastCol, 8);
    try {
      const r1 = sheet.getRange(1, 1, 1, cols).getValues()[0]
                      .map(function(v){ return String(v).slice(0, 40); });
      Logger.log('  Row 1:    ' + JSON.stringify(r1));
    } catch (e) {}
    if (lastRow > 4) {
      try {
        const mid = Math.floor(lastRow / 2);
        const rm = sheet.getRange(mid, 1, 1, cols).getValues()[0]
                        .map(function(v){ return String(v).slice(0, 40); });
        Logger.log('  Row ' + mid + ':    ' + JSON.stringify(rm));
      } catch (e) {}
    }
    if (lastRow > 1) {
      try {
        const rl = sheet.getRange(lastRow, 1, 1, cols).getValues()[0]
                        .map(function(v){ return String(v).slice(0, 40); });
        Logger.log('  Row ' + lastRow + ':    ' + JSON.stringify(rl));
      } catch (e) {}
    }
  });
  Logger.log('');
  Logger.log('=== END ===');
}

function inspectSettingsErrors() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('⚙️ Settings');
  if (!sheet) { Logger.log('=== SETTINGS NOT FOUND ==='); return; }

  Logger.log('=== SETTINGS ERROR INSPECTION ===');
  const targets = [
    { name: 'PRO_PILLAR_FAMILY_WEIGHT', row: 73 },
    { name: 'PRO_FEAT_AUTO_INSIGHTS',   row: 147 }
  ];
  targets.forEach(function(t) {
    Logger.log('');
    Logger.log('--- ' + t.name + ' @ row ' + t.row + ' ---');
    for (let r = Math.max(1, t.row - 3); r <= t.row + 3; r++) {
      try {
        const cells = sheet.getRange(r, 1, 1, 4).getValues()[0]
                           .map(function(v){ return String(v).slice(0, 50); });
        const formulaB = sheet.getRange(r, 2).getFormula();
        const fStr = formulaB ? ' || B-formula: ' + formulaB : '';
        const marker = (r === t.row) ? ' ← TARGET' : '';
        Logger.log('  Row ' + r + ': ' + JSON.stringify(cells) + fStr + marker);
      } catch (e) {}
    }
  });
  Logger.log('');
  Logger.log('--- WORKING PRO_ SAMPLES (for formula pattern) ---');
  const lastRow = sheet.getLastRow();
  const allData = sheet.getRange(1, 1, lastRow, 2).getValues();
  let samples = 0;
  for (let i = 0; i < allData.length && samples < 5; i++) {
    const key = String(allData[i][0]);
    const val = allData[i][1];
    if (key.indexOf('PRO_') === 0 && String(val) !== '#ERROR!' && val !== '' && val !== null) {
      try {
        const fullRow = sheet.getRange(i + 1, 1, 1, 4).getValues()[0]
                             .map(function(v){ return String(v).slice(0, 50); });
        const formulaB = sheet.getRange(i + 1, 2).getFormula();
        const fStr = formulaB ? ' || B-formula: ' + formulaB : ' || B-static';
        Logger.log('  Row ' + (i + 1) + ': ' + JSON.stringify(fullRow) + fStr);
        samples++;
      } catch (e) {}
    }
  }
  Logger.log('');
  Logger.log('=== END ===');
}

/**
 * NEW v2.2 — DRY RUN: list every cell in Settings col B with formula '='.
 * Read-only. Modifies nothing. Use BEFORE repairSettingsBrokenFormulas().
 */
function auditSettingsBrokenFormulas() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('⚙️ Settings');
  if (!sheet) { Logger.log('Settings tab not found'); return; }

  const lastRow = sheet.getLastRow();
  const formulasB = sheet.getRange(1, 2, lastRow, 1).getFormulas();
  const valuesA = sheet.getRange(1, 1, lastRow, 1).getValues();
  const valuesC = sheet.getRange(1, 3, lastRow, 1).getValues();

  const broken = [];
  for (let i = 0; i < lastRow; i++) {
    const f = String(formulasB[i][0] || '').trim();
    if (f === '=') {
      broken.push({
        row: i + 1,
        key: String(valuesA[i][0]),
        defaultVal: valuesC[i][0]
      });
    }
  }

  Logger.log('=== SETTINGS BROKEN FORMULA AUDIT (DRY RUN) ===');
  Logger.log('Total broken cells (formula === "="): ' + broken.length);
  Logger.log('');
  broken.forEach(function(b) {
    Logger.log('  Row ' + b.row + ': ' + b.key + 
               '  →  default: ' + JSON.stringify(b.defaultVal));
  });
  Logger.log('');
  Logger.log('TO FIX: run repairSettingsBrokenFormulas()');
  Logger.log('  - Snapshots Settings tab first (hidden backup)');
  Logger.log('  - Replaces broken "=" formula with column C default value');
  Logger.log('  - Reversible by unhiding snapshot');
  Logger.log('=== END ===');
}

/**
 * NEW v2.2 — APPLY: snapshot Settings, then replace every broken '=' formula
 * with the value from column C (default). Cells become static editable values.
 */
function repairSettingsBrokenFormulas() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('⚙️ Settings');
  if (!sheet) { _diagAlert('Settings tab not found'); return; }

  // SNAPSHOT FIRST
  const ts = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyyMMdd-HHmmss');
  const snapName = '📦 Snap ' + ts + ' (pre-settings-repair) / ⚙️ Settings';
  let snapshot;
  try {
    snapshot = sheet.copyTo(ss);
    snapshot.setName(snapName);
    snapshot.hideSheet();
  } catch (e) {
    _diagAlert('❌ Snapshot failed: ' + e.message + '\n\nNo repair attempted.');
    return;
  }

  // SCAN
  const lastRow = sheet.getLastRow();
  const formulasB = sheet.getRange(1, 2, lastRow, 1).getFormulas();
  const valuesA = sheet.getRange(1, 1, lastRow, 1).getValues();
  const valuesC = sheet.getRange(1, 3, lastRow, 1).getValues();

  // REPAIR (per-cell try/catch)
  let repaired = 0, skipped = 0, examples = [];
  for (let i = 0; i < lastRow; i++) {
    const f = String(formulasB[i][0] || '').trim();
    if (f === '=') {
      try {
        sheet.getRange(i + 1, 2).setValue(valuesC[i][0]);
        repaired++;
        if (examples.length < 5) {
          examples.push('  Row ' + (i + 1) + ': ' + valuesA[i][0] + 
                        ' = ' + JSON.stringify(valuesC[i][0]));
        }
      } catch (e) { skipped++; }
    }
  }

  const msg = '✅ Settings repair complete.\n\n' +
              'Snapshot: "' + snapName + '" (hidden)\n' +
              'Repaired: ' + repaired + ' cells\n' +
              'Skipped:  ' + skipped + ' (cell write errors)\n\n' +
              'Sample repairs:\n' + examples.join('\n') +
              '\n\nRecovery: unhide snapshot to revert.\n\n' +
              '⚠️ FUTURE TODO: Settings_Pro.gs has a bug that writes "=" as ' +
              'placeholder formula. Re-running rebuildSettings will re-break ' +
              'these cells. Investigate Settings_Pro.gs source before next ' +
              'Settings rebuild.';
  _diagAlert(msg);
}

// ─────────────────────────────────────────────────────────────
// SAFE-DELETE HELPERS
// ─────────────────────────────────────────────────────────────

function safeDeleteLegacyChartsTab() {
  safeDeleteTab('📉 Charts');
}

function safeDeleteTab(targetName) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(targetName);
  if (!sheet) {
    _diagAlert('❌ Tab not found: "' + targetName + '"\n\nNothing to delete.');
    return;
  }
  const beforeCount = ss.getSheets().length;
  const origRows = sheet.getLastRow();
  const origCols = sheet.getLastColumn();
  const ts = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyyMMdd-HHmmss');
  const snapName = '📦 Snap ' + ts + ' (deleted) / ' + targetName;
  let snapshot;
  try {
    snapshot = sheet.copyTo(ss);
  } catch (e) {
    _diagAlert('❌ Snapshot copyTo failed: ' + e.message + '\n\nNo deletion attempted.');
    return;
  }
  try {
    snapshot.setName(snapName);
  } catch (renameErr) {
    try { snapshot.hideSheet(); } catch (e) {}
    _diagAlert('⚠️ Snapshot created but rename failed: ' + renameErr.message +
               '\n\nSnapshot kept with auto name "' + snapshot.getName() + '".\n' +
               'Original NOT deleted. Investigate manually.');
    return;
  }
  try { snapshot.hideSheet(); } catch (e) {}
  const snapRows = snapshot.getLastRow();
  const snapCols = snapshot.getLastColumn();
  if (snapRows !== origRows || snapCols !== origCols) {
    _diagAlert('❌ Snapshot verification FAILED:\n' +
               'Original: ' + origRows + 'r × ' + origCols + 'c\n' +
               'Snapshot: ' + snapRows + 'r × ' + snapCols + 'c\n\n' +
               'Snapshot kept (hidden). Original NOT deleted.');
    return;
  }
  try {
    ss.deleteSheet(sheet);
  } catch (deleteErr) {
    _diagAlert('⚠️ Snapshot succeeded but original deletion failed: ' +
               deleteErr.message + '\n\nBoth tabs now exist. Manually delete original.');
    return;
  }
  const afterCount = ss.getSheets().length;
  const msg = '✅ Safe delete complete.\n\n' +
              'Deleted:    "' + targetName + '"\n' +
              'Snapshot:   "' + snapName + '" (hidden)\n' +
              'Tab count:  ' + beforeCount + ' → ' + afterCount + '\n\n' +
              'Recovery: unhide the snapshot tab to restore the data.';
  _diagAlert(msg);
}

function _diagAlert(msg) {
  if (typeof safeAlert === 'function') {
    safeAlert(msg);
  } else {
    try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  }
}

/**
 * NEW v2.3 — inspect 4 pillar source tabs for Progress_Pro v1 build.
 * Read-only. Logs structure of Habits, Salah, Finance Hub, Knowledge.
 */
function inspectPillarSources() {
  const TARGETS = ['📋 Habits', '🕌 Salah', '💰 Finance Hub', '📚 Knowledge'];
  const ss = SpreadsheetApp.getActive();

  Logger.log('=== PILLAR SOURCE INSPECTION ===');

  TARGETS.forEach(function(name) {
    Logger.log('');
    Logger.log('═══ "' + name + '" ═══');
    const sheet = ss.getSheetByName(name);
    if (!sheet) { Logger.log('  STATUS: NOT FOUND'); return; }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    Logger.log('  Dimensions: ' + lastRow + ' rows × ' + lastCol + ' cols');

    if (lastRow === 0) { Logger.log('  EMPTY'); return; }

    // Sample 6 strategic rows: 1, 5, 10, 20, mid, last
    const cols = Math.min(lastCol, 10);
    const rowsToSample = [1, 5, 10, 20, Math.floor(lastRow / 2), lastRow]
                          .filter(function(r, i, arr){ 
                            return r > 0 && r <= lastRow && arr.indexOf(r) === i; 
                          })
                          .sort(function(a,b){ return a - b; });

    rowsToSample.forEach(function(r) {
      try {
        const vals = sheet.getRange(r, 1, 1, cols).getValues()[0]
                          .map(function(v){ return String(v).slice(0, 25); });
        Logger.log('  Row ' + r + ': ' + JSON.stringify(vals));
      } catch (e) {}
    });
  });

  Logger.log('');
  Logger.log('=== END ===');
}



/**
 * NEW v2.4 — full structural dump of 4 pillar tabs.
 * Read-only. Saves output to "🔧 Pillar Audit" temp tab for easy review.
 */
function deepScanPillarSources() {
  const TARGETS = ['📋 Habits', '🕌 Salah', '💰 Finance Hub', '📚 Knowledge'];
  const ss = SpreadsheetApp.getActive();

  // Clean output tab
  let out = ss.getSheetByName('🔧 Pillar Audit');
  if (out) ss.deleteSheet(out);
  out = ss.insertSheet('🔧 Pillar Audit');
  out.hideSheet();

  let row = 1;
  out.getRange(row++, 1).setValue('PILLAR SOURCE DEEP SCAN');
  out.getRange(row++, 1).setValue('Timestamp: ' + new Date());
  row++;

  TARGETS.forEach(function(name) {
    const sheet = ss.getSheetByName(name);
    out.getRange(row++, 1).setValue('═══ ' + name + ' ═══').setFontWeight('bold');

    if (!sheet) {
      out.getRange(row++, 1).setValue('  NOT FOUND');
      row++;
      return;
    }

    const lastRow = sheet.getLastRow();
    const lastCol = Math.min(sheet.getLastColumn(), 12);
    out.getRange(row++, 1).setValue('Dimensions: ' + lastRow + ' × ' + sheet.getLastColumn());
    out.getRange(row++, 1).setValue('Reading first ' + lastCol + ' columns of all rows:');

    if (lastRow > 0) {
      const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      const formulas = sheet.getRange(1, 1, lastRow, lastCol).getFormulas();

      data.forEach(function(rowData, i) {
        const rowNum = String(i + 1).padStart(3, ' ');
        const cells = rowData.map(function(v, ci) {
          const f = formulas[i][ci];
          if (f) return '[' + f.slice(0, 30) + ']';
          return String(v).slice(0, 25);
        });
        // Skip totally empty rows
        if (cells.every(function(c){ return c === ''; })) return;
        out.getRange(row++, 1).setValue('R' + rowNum + ': ' + JSON.stringify(cells));
      });
    }
    row++;
  });

  out.getRange(row++, 1).setValue('=== END ===');
  out.showSheet();
  ss.setActiveSheet(out);

  if (typeof safeAlert === 'function') {
    safeAlert('✅ Deep scan complete.\n\nSwitched to "🔧 Pillar Audit" tab.\n\nScroll through, then either:\n  - Tell Glean what you see, OR\n  - Copy the whole tab contents and paste back to chat.');
  } else {
    SpreadsheetApp.getUi().alert('Deep scan complete. See "🔧 Pillar Audit" tab.');
  }
}