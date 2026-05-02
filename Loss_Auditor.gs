// ════════════════════════════════════════════════════════════════════
// 🔬 Loss_Auditor.gs — DATA LOSS RECOVERY DIAGNOSTIC v1.0
// LOCKED · 7-Layer Audit · Read-Only · Day 6 · 2026-04-30
//
// PURPOSE:
//   After a destructive rebuild, scans:
//     1. Current state of Habits tab (what's there now)
//     2. Audit Log for last 7 days (what you logged via Telegram)
//     3. Salah tab (which feeds Habits mirror cells)
//   Cross-references to show what you LOGGED vs what's CURRENTLY there.
//
// SAFE: read-only. Never modifies anything.
// ════════════════════════════════════════════════════════════════════

const LA_TZ = 'Asia/Karachi';

function _laAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
}

// ──────────── Scan Habits tab current state ────────────

function _laScanHabits() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hab = ss.getSheetByName('📋 Habits');
  if (!hab) return { error: 'Habits tab not found' };

  const result = {
    rowsScanned: 0,
    habitsFound: [],
    checkboxesTrue: 0,
    checkboxesFalse: 0,
    cellsWithText: 0,
    weekTotals: []
  };

  // Habits live in rows 7-23 per v2.1 spec
  for (let r = 7; r <= 23; r++) {
    const name = hab.getRange(r, 1).getValue();
    if (!name) continue;
    const nameStr = String(name);
    if (nameStr.indexOf('·') !== -1) continue; // skip dividers

    result.rowsScanned++;
    result.habitsFound.push({ row: r, name: nameStr });

    // Check days Mon-Sun (cols 3-9)
    for (let c = 3; c <= 9; c++) {
      const v = hab.getRange(r, c).getValue();
      if (v === true) result.checkboxesTrue++;
      else if (v === false) result.checkboxesFalse++;
      else if (v === '✓' || (typeof v === 'string' && v.length > 0)) result.cellsWithText++;
    }

    // Week count col J
    const weekCount = hab.getRange(r, 10).getValue();
    result.weekTotals.push({ name: nameStr.substring(0, 24), count: weekCount });
  }

  return result;
}

// ──────────── Scan Salah tab (feeds Habits mirror) ────────────

function _laScanSalah() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sal = ss.getSheetByName('🕌 Salah');
  if (!sal) return { error: 'Salah tab not found' };

  const result = { byDay: [], totalLogged: 0 };

  // Salah rows = 5 + day-of-month (row 6 = day 1, row 36 = day 31)
  for (let day = 1; day <= 31; day++) {
    const r = 5 + day;
    const fajr    = sal.getRange(r, 2).getValue();
    const dhuhr   = sal.getRange(r, 3).getValue();
    const asr     = sal.getRange(r, 4).getValue();
    const maghrib = sal.getRange(r, 5).getValue();
    const isha    = sal.getRange(r, 6).getValue();

    let logged = 0;
    if (fajr) logged++;
    if (dhuhr) logged++;
    if (asr) logged++;
    if (maghrib) logged++;
    if (isha) logged++;

    if (logged > 0) {
      result.byDay.push({
        day: day,
        logged: logged,
        codes: [fajr, dhuhr, asr, maghrib, isha]
      });
      result.totalLogged += logged;
    }
  }

  return result;
}

// ──────────── Scan Audit Log for habit/prayer/food writes ────────────

function _laScanAuditLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const audit = ss.getSheetByName('Audit Log');
  if (!audit) return { error: 'Audit Log tab not found', entries: [] };

  const result = { 
    totalScanned: 0,
    habitWrites: [],
    prayerWrites: [],
    foodWrites: [],
    weightWrites: [],
    otherTelegram: [],
    error: null
  };

  try {
    const lastRow = audit.getLastRow();
    if (lastRow < 2) return result;

    // Audit Log usually: col A = timestamp, col B = action, col C = detail
    const range = audit.getRange(2, 1, lastRow - 1, 3);
    const data = range.getValues();
    result.totalScanned = data.length;

    // Filter to last 7 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    data.forEach(row => {
      const ts = row[0];
      const action = String(row[1] || '');
      const detail = String(row[2] || '');

      if (!(ts instanceof Date) || ts < cutoff) return;

      const tsStr = Utilities.formatDate(ts, LA_TZ, 'EEE dd HH:mm');
      const entry = { ts: tsStr, action: action, detail: detail.substring(0, 80) };

      if (action.indexOf('HABIT') !== -1) result.habitWrites.push(entry);
      else if (action.indexOf('PRAYER') !== -1 || action.indexOf('SALAH') !== -1) result.prayerWrites.push(entry);
      else if (action.indexOf('FOOD') !== -1) result.foodWrites.push(entry);
      else if (action.indexOf('WEIGHT') !== -1) result.weightWrites.push(entry);
      else if (action.indexOf('TG') !== -1 || action.indexOf('TELEGRAM') !== -1) result.otherTelegram.push(entry);
    });
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

// ──────────── Scan Progress tab vitals (last 7 days) ────────────

function _laScanProgress() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prg = ss.getSheetByName('📈 Progress');
  if (!prg) return { error: 'Progress tab not found' };

  const result = { byDay: [] };
  const today = new Date().getDate();
  const startDay = Math.max(1, today - 7);

  for (let day = startDay; day <= today; day++) {
    const r = 5 + day;
    const w  = prg.getRange(r, 2).getValue();
    const m  = prg.getRange(r, 3).getValue();
    const mt = prg.getRange(r, 4).getValue();
    const e  = prg.getRange(r, 5).getValue();
    const sl = prg.getRange(r, 6).getValue();
    const st = prg.getRange(r, 7).getValue();

    if (w || m || mt || e || sl || st) {
      result.byDay.push({
        day: day, weight: w, mood: m, motiv: mt,
        energy: e, sleep: sl, study: st
      });
    }
  }
  return result;
}

// ════════════════════════════════════════════════════════════════════
// MAIN ENTRY
// ════════════════════════════════════════════════════════════════════

function auditDataLoss() {
  const startTime = new Date().getTime();

  const habits = _laScanHabits();
  const salah = _laScanSalah();
  const auditLog = _laScanAuditLog();
  const progress = _laScanProgress();

  const elapsed = ((new Date().getTime() - startTime) / 1000).toFixed(1);

  let report = '🔬 DATA LOSS AUDIT · ' + elapsed + 's\n';
  report += 'Today is Day ' + (typeof getQuestDay === 'function' ? getQuestDay() : '?') + ' of 90\n\n';

  // ─── Habits CURRENT state ───
  report += '═══ HABITS TAB · CURRENT STATE ═══\n\n';
  if (habits.error) {
    report += '⚠️ ' + habits.error + '\n';
  } else {
    report += 'Habits found: ' + habits.rowsScanned + '\n';
    report += 'Checkboxes ticked TRUE: ' + habits.checkboxesTrue + '\n';
    report += 'Checkboxes shown FALSE: ' + habits.checkboxesFalse + '\n';
    report += 'Cells with text (✓ etc): ' + habits.cellsWithText + '\n\n';
    report += 'Week counts (col J):\n';
    habits.weekTotals.forEach(h => {
      report += '  · ' + (h.name + '                        ').substring(0, 24) +
                ' = ' + (h.count || 0) + '/7\n';
    });

    if (habits.checkboxesTrue === 0 && habits.cellsWithText === 0) {
      report += '\n⚠️ ZERO checkboxes ticked + ZERO mirror text\n';
      report += '   → Habits tab appears RESET (data lost from this view)\n';
    } else if (habits.checkboxesTrue + habits.cellsWithText < 5) {
      report += '\n⚠️ Very low data in Habits — likely partial loss\n';
    } else {
      report += '\n✓ Habits has ' + (habits.checkboxesTrue + habits.cellsWithText) + ' marked cells\n';
    }
  }
  report += '\n';

  // ─── Salah CURRENT state ───
  report += '═══ SALAH TAB · CURRENT STATE ═══\n\n';
  if (salah.error) {
    report += '⚠️ ' + salah.error + '\n';
  } else {
    report += 'Days with prayer logs: ' + salah.byDay.length + '\n';
    report += 'Total prayers logged this month: ' + salah.totalLogged + '\n\n';
    if (salah.byDay.length > 0) {
      report += 'Recent days:\n';
      salah.byDay.slice(-7).forEach(d => {
        report += '  · Day ' + d.day + ': ' + d.logged + '/5 logged · [' + d.codes.join(' ') + ']\n';
      });
    }
  }
  report += '\n';

  // ─── Progress CURRENT state ───
  report += '═══ PROGRESS TAB · LAST 7 DAYS ═══\n\n';
  if (progress.error) {
    report += '⚠️ ' + progress.error + '\n';
  } else {
    if (progress.byDay.length === 0) {
      report += 'No vitals data in last 7 days.\n';
    } else {
      progress.byDay.forEach(d => {
        report += '  Day ' + d.day + ' · weight=' + (d.weight || '—') +
                  ' · mood=' + (d.mood || '—') + ' · sleep=' + (d.sleep || '—') +
                  'h · study=' + (d.study || '—') + 'h\n';
      });
    }
  }
  report += '\n';

  // ─── Audit Log RECONSTRUCTION ───
  report += '═══ AUDIT LOG · WHAT YOU LOGGED (last 7 days) ═══\n\n';
  if (auditLog.error) {
    report += '⚠️ ' + auditLog.error + '\n';
  } else {
    report += 'Total audit entries scanned: ' + auditLog.totalScanned + '\n';
    report += 'Habit writes:    ' + auditLog.habitWrites.length + '\n';
    report += 'Prayer writes:   ' + auditLog.prayerWrites.length + '\n';
    report += 'Food writes:     ' + auditLog.foodWrites.length + '\n';
    report += 'Weight writes:   ' + auditLog.weightWrites.length + '\n';
    report += 'Other Telegram:  ' + auditLog.otherTelegram.length + '\n\n';

    if (auditLog.habitWrites.length > 0) {
      report += '── HABIT LOGS (last 10) ──\n';
      auditLog.habitWrites.slice(-10).forEach(e => {
        report += '  ' + e.ts + ' · ' + e.detail + '\n';
      });
      report += '\n';
    }

    if (auditLog.prayerWrites.length > 0) {
      report += '── PRAYER LOGS (last 10) ──\n';
      auditLog.prayerWrites.slice(-10).forEach(e => {
        report += '  ' + e.ts + ' · ' + e.detail + '\n';
      });
      report += '\n';
    }

    if (auditLog.foodWrites.length > 0) {
      report += '── FOOD LOGS (last 5) ──\n';
      auditLog.foodWrites.slice(-5).forEach(e => {
        report += '  ' + e.ts + ' · ' + e.detail + '\n';
      });
    }
  }

  report += '\n═══ VERDICT ═══\n\n';

  const habitsLost = habits.checkboxesTrue === 0 && habits.cellsWithText === 0;
  const auditHasHabits = auditLog.habitWrites.length > 0;
  const salahIntact = salah.totalLogged > 0;

  if (habitsLost && auditHasHabits) {
    report += '🚨 Habits tab RESET, but Audit Log has ' + auditLog.habitWrites.length + ' habit writes.\n';
    report += 'Recovery possible: replay Audit Log → restore Habits checkboxes.\n';
    report += 'Tell me YES and I write the replay function.\n';
  } else if (habitsLost && !auditHasHabits) {
    report += '⚠️ Habits tab RESET. Audit Log has no habit writes.\n';
    report += 'But Salah is ' + (salahIntact ? 'INTACT (' + salah.totalLogged + ' prayers)' : 'also empty') + '.\n';
    if (salahIntact) {
      report += 'Salah-mirror habits (Fajr, 5 prayers) will rebuild themselves\n';
      report += 'from Salah tab via formulas next time Habits cockpit refreshes.\n';
      report += 'Other habits would need version-history recovery.\n';
    }
  } else {
    report += '✓ Habits tab has data. Loss may be partial.\n';
    report += 'Compare week counts above to your memory.\n';
  }

  Logger.log(report);
  _laAlert(report);
  return { habits: habits, salah: salah, auditLog: auditLog, progress: progress };
}

// ════════════════════════════════════════════════════════════════════
// MENU
// ════════════════════════════════════════════════════════════════════

function appendLossAuditorMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🔬 Loss Audit')
      .addItem('🔬 Audit Data Loss (read-only · 5s)', 'auditDataLoss')
      .addToUi();
  } catch (e) { Logger.log('Loss Auditor menu add failed: ' + e); }
}