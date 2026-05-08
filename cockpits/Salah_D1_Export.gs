// Salah_D1_Export.gs v0.1.1
// Layer 2B - Sheet -> D1 Salah export mapping
//
// Reads the existing Salah_Pro v2.1 cockpit tab: ' Salah'
// Writes D1 import SQL into D1_Salah_Export, one SQL statement per row.
//
// Safety:
// - Does not call Cloudflare.
// - Does not mutate D1.
// - Does not touch Finance.
// - Does not create fake prayer rows.
// - Recovery rows are generated only from real Q / Qaza cells.

var SALAH_D1_EXPORT_VERSION = 'Salah_D1_Export v0.1.1';
var SALAH_D1_SOURCE_VERSION = 'Salah_Pro v2.1';
var SALAH_D1_TAB = ' Salah';
var SALAH_D1_EXPORT_TAB = 'D1_Salah_Export';
var SALAH_D1_GRID_START_ROW = 6;
var SALAH_D1_GRID_DAYS = 31;
var SALAH_D1_TZ = 'Asia/Karachi';

function verifySalahD1ExportSource() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var salah = ss.getSheetByName(SALAH_D1_TAB);

  if (!salah) {
    _salahD1Alert('Salah tab missing. Expected: ' + SALAH_D1_TAB);
    return;
  }

  var layout = _salahD1DetectLayout_(salah);
  var values = salah.getRange(SALAH_D1_GRID_START_ROW, 1, SALAH_D1_GRID_DAYS, 11).getValues();

  var dateRows = 0;
  var loggedCells = 0;
  var qazaCells = 0;

  values.forEach(function(row) {
    if (row[0] instanceof Date) dateRows++;

    [1, 2, 3, 4, 5, 6].forEach(function(idx) {
      var code = String(row[idx] || '').trim();
      if (code) loggedCells++;
      if (_salahD1NormalizeCode_(code) === 'Q') qazaCells++;
    });
  });

  _salahD1Alert(
    'Salah D1 source verification\n\n' +
    'Tab: ' + SALAH_D1_TAB + '\n' +
    'Detected layout: ' + layout + '\n' +
    'Grid rows checked: ' + SALAH_D1_GRID_DAYS + '\n' +
    'Date rows found: ' + dateRows + '\n' +
    'Logged prayer cells: ' + loggedCells + '\n' +
    'Qaza cells: ' + qazaCells + '\n\n' +
    'If this looks right, run buildSalahD1ExportSql().'
  );
}

function buildSalahD1ExportSql() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var salah = ss.getSheetByName(SALAH_D1_TAB);

  if (!salah) {
    _salahD1Alert('Salah tab not found. Expected: ' + SALAH_D1_TAB);
    return;
  }

  var now = new Date();
  var exportedAt = Utilities.formatDate(now, SALAH_D1_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  var exportBatchId = 'salah_export_' + Utilities.formatDate(now, SALAH_D1_TZ, 'yyyyMMdd_HHmmss');
  var sourceLayout = _salahD1DetectLayout_(salah);
  var rows = _salahD1ReadRows_(salah);
  var prayerTimes = _salahD1ReadPrayerTimes_(salah, now);

  var sql = [];
  var rowsRead = 0;
  var rowsWritten = 0;

  sql.push('-- Salah D1 Export');
  sql.push('-- Generated: ' + exportedAt);
  sql.push('-- Source tab: ' + SALAH_D1_TAB);
  sql.push('-- Source version: ' + SALAH_D1_SOURCE_VERSION);
  sql.push('-- Exporter: ' + SALAH_D1_EXPORT_VERSION);
  sql.push('-- Batch: ' + exportBatchId);
  sql.push('-- Copy only SQL rows into Cloudflare D1 Console. Comments are safe but optional.');

  var dailyStatements = [];
  var entryStatements = [];
  var recoveryStatements = [];

  rows.forEach(function(row) {
    if (!row.day) return;

    rowsRead++;

    dailyStatements.push(_salahD1DailyInsertSql_(row, exportBatchId, exportedAt, sourceLayout));
    rowsWritten++;

    row.prayers.forEach(function(entry) {
      entryStatements.push(_salahD1PrayerEntryInsertSql_(entry, exportBatchId, exportedAt));
      rowsWritten++;

      if (entry.is_qaza === 1) {
        recoveryStatements.push(_salahD1RecoveryInsertSql_(entry, exportBatchId));
        rowsWritten++;
      }
    });
  });

  sql.push(_salahD1BatchInsertSql_({
    id: exportBatchId,
    sourceLayout: sourceLayout,
    exportedAt: exportedAt,
    rowsRead: rowsRead,
    rowsWritten: rowsWritten,
    notes: 'Generated from ' + SALAH_D1_TAB + ' rows 6-36. No direct D1 mutation by Apps Script.'
  }));

  if (prayerTimes) {
    sql.push(_salahD1PrayerTimesInsertSql_(prayerTimes));
    rowsWritten++;
  }

  dailyStatements.forEach(function(statement) { sql.push(statement); });
  entryStatements.forEach(function(statement) { sql.push(statement); });
  recoveryStatements.forEach(function(statement) { sql.push(statement); });

  _salahD1WriteExportSheet_(ss, sql, {
    exportBatchId: exportBatchId,
    exportedAt: exportedAt,
    rowsRead: rowsRead,
    rowsWritten: rowsWritten,
    sourceLayout: sourceLayout
  });

  _salahD1Alert(
    'Salah D1 export SQL generated.\n\n' +
    'Tab: ' + SALAH_D1_EXPORT_TAB + '\n' +
    'Batch: ' + exportBatchId + '\n' +
    'Rows read: ' + rowsRead + '\n' +
    'SQL rows written: ' + sql.length + '\n\n' +
    'Open D1_Salah_Export and copy SQL from row 10 downward.'
  );
}

function appendSalahD1ExportMenu() {
  SpreadsheetApp.getUi()
    .createMenu('Salah D1 Export')
    .addItem('Verify Salah Export Source', 'verifySalahD1ExportSource')
    .addItem('Build D1 Export SQL', 'buildSalahD1ExportSql')
    .addToUi();
}

function _salahD1ReadRows_(salah) {
  var values = salah.getRange(SALAH_D1_GRID_START_ROW, 1, SALAH_D1_GRID_DAYS, 11).getValues();
  var displayValues = salah.getRange(SALAH_D1_GRID_START_ROW, 1, SALAH_D1_GRID_DAYS, 11).getDisplayValues();
  var rows = [];

  for (var i = 0; i < SALAH_D1_GRID_DAYS; i++) {
    var sourceRow = SALAH_D1_GRID_START_ROW + i;
    var row = values[i];
    var displayRow = displayValues[i];

    var day = _salahD1DateToIso_(row[0]);
    if (!day) continue;

    var dayOfMonth = Number(Utilities.formatDate(row[0], SALAH_D1_TZ, 'd'));

    var raw = {
      fajr: _salahD1Clean_(row[1]),
      dhuhr: _salahD1Clean_(row[2]),
      asr: _salahD1Clean_(row[3]),
      maghrib: _salahD1Clean_(row[4]),
      isha: _salahD1Clean_(row[5]),
      jumuah: _salahD1Clean_(row[6])
    };

    var normalized = {
      fajr: _salahD1NormalizeCode_(raw.fajr),
      dhuhr: _salahD1NormalizeCode_(raw.dhuhr),
      asr: _salahD1NormalizeCode_(raw.asr),
      maghrib: _salahD1NormalizeCode_(raw.maghrib),
      isha: _salahD1NormalizeCode_(raw.isha),
      jumuah: _salahD1NormalizeCode_(raw.jumuah)
    };

    var prayerEntries = [
      _salahD1BuildPrayerEntry_('fajr', raw.fajr, normalized.fajr, day, sourceRow, 'B'),
      _salahD1BuildPrayerEntry_('dhuhr', raw.dhuhr, normalized.dhuhr, day, sourceRow, 'C'),
      _salahD1BuildPrayerEntry_('asr', raw.asr, normalized.asr, day, sourceRow, 'D'),
      _salahD1BuildPrayerEntry_('maghrib', raw.maghrib, normalized.maghrib, day, sourceRow, 'E'),
      _salahD1BuildPrayerEntry_('isha', raw.isha, normalized.isha, day, sourceRow, 'F')
    ];

    if (raw.jumuah || _salahD1IsFriday_(row[0])) {
      prayerEntries.push(_salahD1BuildPrayerEntry_('jumuah', raw.jumuah, normalized.jumuah, day, sourceRow, 'G'));
    }

    var daily = {
      day: day,
      day_of_month: dayOfMonth,
      raw: raw,
      normalized: normalized,
      score: _salahD1NumberOrNull_(row[8]),
      tier_label: _salahD1Clean_(displayRow[7]),
      qaza_count: _salahD1IntegerOrZero_(row[9]),
      notes: _salahD1Clean_(row[10]),
      source_row: sourceRow,
      source_checksum: _salahD1Checksum_([
        day,
        raw.fajr,
        raw.dhuhr,
        raw.asr,
        raw.maghrib,
        raw.isha,
        raw.jumuah,
        row[8],
        row[9],
        row[10]
      ].join('|')),
      prayers: prayerEntries
    };

    var counts = _salahD1DailyCounts_(prayerEntries);
    daily.logged_count = counts.logged;
    daily.masjid_count = counts.masjid;
    daily.jamaat_count = counts.jamaat;
    daily.work_count = counts.work;
    daily.home_count = counts.home;
    daily.late_count = counts.late;

    rows.push(daily);
  }

  return rows;
}

function _salahD1BuildPrayerEntry_(prayerName, rawCode, normalizedCode, day, sourceRow, sourceColumn) {
  var id = ['salah', day, prayerName].join('_');

  return {
    id: id,
    day: day,
    prayer_name: prayerName,
    raw_code: rawCode,
    normalized_code: normalizedCode,
    location_label: _salahD1LocationLabel_(normalizedCode),
    score_value: _salahD1ScoreValue_(normalizedCode),
    is_logged: rawCode ? 1 : 0,
    is_masjid: normalizedCode === 'M' ? 1 : 0,
    is_jamaat: normalizedCode === 'J' ? 1 : 0,
    is_work: normalizedCode === 'W' || normalizedCode === 'WU' ? 1 : 0,
    is_home: normalizedCode === 'H' || normalizedCode === 'HU' ? 1 : 0,
    is_late: normalizedCode === 'L' ? 1 : 0,
    is_qaza: normalizedCode === 'Q' ? 1 : 0,
    has_valid_udhr: normalizedCode === 'WU' || normalizedCode === 'HU' ? 1 : 0,
    is_jam_combined: 0,
    jam_type: '',
    source_row: sourceRow,
    source_column: sourceColumn,
    source_checksum: _salahD1Checksum_([day, prayerName, rawCode, normalizedCode, sourceRow, sourceColumn].join('|'))
  };
}

function _salahD1ReadPrayerTimes_(salah, now) {
  var row3 = salah.getRange(3, 2, 1, 5).getDisplayValues()[0];
  var times = row3.map(function(cell) {
    return _salahD1ExtractTime_(cell);
  });

  var today = Utilities.formatDate(now, SALAH_D1_TZ, 'yyyy-MM-dd');

  if (!times.some(function(t) { return !!t; })) {
    return null;
  }

  return {
    day: today,
    city: 'Multan',
    country: 'Pakistan',
    timezone: SALAH_D1_TZ,
    method: 1,
    fajr_time: times[0],
    dhuhr_time: times[1],
    asr_time: times[2],
    maghrib_time: times[3],
    isha_time: times[4],
    provider: 'aladhan',
    provider_date: today,
    fetched_at: Utilities.formatDate(now, SALAH_D1_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    is_fallback: 0,
    source_note: 'Read from Salah_Pro row 3 prayer-time cells'
  };
}

function _salahD1BatchInsertSql_(batch) {
  return 'INSERT OR REPLACE INTO salah_export_batches ' +
    '(id, source_system, source_tab, source_version, source_layout, export_type, exported_at, rows_read, rows_written, status, notes, created_at) VALUES (' +
    _salahD1Sql_(batch.id) + ', ' +
    _salahD1Sql_('google_sheet') + ', ' +
    _salahD1Sql_(SALAH_D1_TAB) + ', ' +
    _salahD1Sql_(SALAH_D1_SOURCE_VERSION) + ', ' +
    _salahD1Sql_(batch.sourceLayout) + ', ' +
    _salahD1Sql_('manual_sql_export') + ', ' +
    _salahD1Sql_(batch.exportedAt) + ', ' +
    Number(batch.rowsRead || 0) + ', ' +
    Number(batch.rowsWritten || 0) + ', ' +
    _salahD1Sql_('generated') + ', ' +
    _salahD1Sql_(batch.notes) + ', ' +
    "datetime('now')" +
    ');';
}

function _salahD1DailyInsertSql_(row, exportBatchId, exportedAt, sourceLayout) {
  return 'INSERT OR REPLACE INTO salah_daily_status ' +
    '(day, day_of_month, raw_fajr_code, raw_dhuhr_code, raw_asr_code, raw_maghrib_code, raw_isha_code, raw_jumuah_code, raw_tahajjud_status, ' +
    'normalized_fajr_code, normalized_dhuhr_code, normalized_asr_code, normalized_maghrib_code, normalized_isha_code, normalized_jumuah_code, ' +
    'score, tier_label, qaza_count, logged_count, masjid_count, jamaat_count, work_count, home_count, late_count, notes, ' +
    'source_system, source_tab, source_version, source_layout, source_row, source_checksum, export_batch_id, exported_at, updated_at) VALUES (' +
    _salahD1Sql_(row.day) + ', ' +
    Number(row.day_of_month || 0) + ', ' +
    _salahD1Sql_(row.raw.fajr) + ', ' +
    _salahD1Sql_(row.raw.dhuhr) + ', ' +
    _salahD1Sql_(row.raw.asr) + ', ' +
    _salahD1Sql_(row.raw.maghrib) + ', ' +
    _salahD1Sql_(row.raw.isha) + ', ' +
    _salahD1Sql_(row.raw.jumuah) + ', ' +
    _salahD1Sql_('') + ', ' +
    _salahD1Sql_(row.normalized.fajr) + ', ' +
    _salahD1Sql_(row.normalized.dhuhr) + ', ' +
    _salahD1Sql_(row.normalized.asr) + ', ' +
    _salahD1Sql_(row.normalized.maghrib) + ', ' +
    _salahD1Sql_(row.normalized.isha) + ', ' +
    _salahD1Sql_(row.normalized.jumuah) + ', ' +
    _salahD1SqlNumber_(row.score) + ', ' +
    _salahD1Sql_(row.tier_label) + ', ' +
    Number(row.qaza_count || 0) + ', ' +
    Number(row.logged_count || 0) + ', ' +
    Number(row.masjid_count || 0) + ', ' +
    Number(row.jamaat_count || 0) + ', ' +
    Number(row.work_count || 0) + ', ' +
    Number(row.home_count || 0) + ', ' +
    Number(row.late_count || 0) + ', ' +
    _salahD1Sql_(row.notes) + ', ' +
    _salahD1Sql_('google_sheet') + ', ' +
    _salahD1Sql_(SALAH_D1_TAB) + ', ' +
    _salahD1Sql_(SALAH_D1_SOURCE_VERSION) + ', ' +
    _salahD1Sql_(sourceLayout) + ', ' +
    Number(row.source_row || 0) + ', ' +
    _salahD1Sql_(row.source_checksum) + ', ' +
    _salahD1Sql_(exportBatchId) + ', ' +
    _salahD1Sql_(exportedAt) + ', ' +
    "datetime('now')" +
    ');';
}

function _salahD1PrayerEntryInsertSql_(entry, exportBatchId, exportedAt) {
  return 'INSERT OR REPLACE INTO salah_prayer_entries ' +
    '(id, day, prayer_name, raw_code, normalized_code, location_label, score_value, is_logged, is_masjid, is_jamaat, is_work, is_home, is_late, is_qaza, has_valid_udhr, is_jam_combined, jam_type, logged_at, note, ' +
    'source_system, source_tab, source_version, source_row, source_column, source_checksum, export_batch_id, exported_at, updated_at) VALUES (' +
    _salahD1Sql_(entry.id) + ', ' +
    _salahD1Sql_(entry.day) + ', ' +
    _salahD1Sql_(entry.prayer_name) + ', ' +
    _salahD1Sql_(entry.raw_code) + ', ' +
    _salahD1Sql_(entry.normalized_code) + ', ' +
    _salahD1Sql_(entry.location_label) + ', ' +
    _salahD1SqlNumber_(entry.score_value) + ', ' +
    Number(entry.is_logged || 0) + ', ' +
    Number(entry.is_masjid || 0) + ', ' +
    Number(entry.is_jamaat || 0) + ', ' +
    Number(entry.is_work || 0) + ', ' +
    Number(entry.is_home || 0) + ', ' +
    Number(entry.is_late || 0) + ', ' +
    Number(entry.is_qaza || 0) + ', ' +
    Number(entry.has_valid_udhr || 0) + ', ' +
    Number(entry.is_jam_combined || 0) + ', ' +
    _salahD1Sql_(entry.jam_type) + ', ' +
    'NULL, ' +
    _salahD1Sql_('') + ', ' +
    _salahD1Sql_('google_sheet') + ', ' +
    _salahD1Sql_(SALAH_D1_TAB) + ', ' +
    _salahD1Sql_(SALAH_D1_SOURCE_VERSION) + ', ' +
    Number(entry.source_row || 0) + ', ' +
    _salahD1Sql_(entry.source_column) + ', ' +
    _salahD1Sql_(entry.source_checksum) + ', ' +
    _salahD1Sql_(exportBatchId) + ', ' +
    _salahD1Sql_(exportedAt) + ', ' +
    "datetime('now')" +
    ');';
}

function _salahD1PrayerTimesInsertSql_(times) {
  return 'INSERT OR REPLACE INTO salah_prayer_times ' +
    '(day, city, country, timezone, method, fajr_time, dhuhr_time, asr_time, maghrib_time, isha_time, provider, provider_date, fetched_at, is_fallback, source_note, updated_at) VALUES (' +
    _salahD1Sql_(times.day) + ', ' +
    _salahD1Sql_(times.city) + ', ' +
    _salahD1Sql_(times.country) + ', ' +
    _salahD1Sql_(times.timezone) + ', ' +
    Number(times.method || 1) + ', ' +
    _salahD1Sql_(times.fajr_time) + ', ' +
    _salahD1Sql_(times.dhuhr_time) + ', ' +
    _salahD1Sql_(times.asr_time) + ', ' +
    _salahD1Sql_(times.maghrib_time) + ', ' +
    _salahD1Sql_(times.isha_time) + ', ' +
    _salahD1Sql_(times.provider) + ', ' +
    _salahD1Sql_(times.provider_date) + ', ' +
    _salahD1Sql_(times.fetched_at) + ', ' +
    Number(times.is_fallback || 0) + ', ' +
    _salahD1Sql_(times.source_note) + ', ' +
    "datetime('now')" +
    ');';
}

function _salahD1RecoveryInsertSql_(entry, exportBatchId) {
  var id = ['salah_recovery', entry.day, entry.prayer_name].join('_');

  return 'INSERT OR REPLACE INTO salah_recovery_items ' +
    '(id, day, prayer_name, source_entry_id, raw_code, recovery_status, recovery_due_date, recovered_at, reason, recovery_note, source_system, export_batch_id, updated_at) VALUES (' +
    _salahD1Sql_(id) + ', ' +
    _salahD1Sql_(entry.day) + ', ' +
    _salahD1Sql_(entry.prayer_name) + ', ' +
    _salahD1Sql_(entry.id) + ', ' +
    _salahD1Sql_(entry.raw_code) + ', ' +
    _salahD1Sql_('pending') + ', ' +
    'NULL, ' +
    'NULL, ' +
    _salahD1Sql_('Imported from real Q/Qaza sheet cell') + ', ' +
    _salahD1Sql_('Recovery row generated from existing Salah cockpit data, not fake seed data') + ', ' +
    _salahD1Sql_('google_sheet') + ', ' +
    _salahD1Sql_(exportBatchId) + ', ' +
    "datetime('now')" +
    ');';
}

function _salahD1WriteExportSheet_(ss, sql, meta) {
  var out = ss.getSheetByName(SALAH_D1_EXPORT_TAB);
  if (!out) out = ss.insertSheet(SALAH_D1_EXPORT_TAB);

  out.clear();

  out.getRange(1, 1).setValue('Salah D1 Export SQL');
  out.getRange(2, 1).setValue('Batch');
  out.getRange(2, 2).setValue(meta.exportBatchId);
  out.getRange(3, 1).setValue('Exported At');
  out.getRange(3, 2).setValue(meta.exportedAt);
  out.getRange(4, 1).setValue('Source Layout');
  out.getRange(4, 2).setValue(meta.sourceLayout);
  out.getRange(5, 1).setValue('Rows Read');
  out.getRange(5, 2).setValue(meta.rowsRead);
  out.getRange(6, 1).setValue('SQL Rows Written');
  out.getRange(6, 2).setValue(sql.length);
  out.getRange(7, 1).setValue('Instruction');
  out.getRange(7, 2).setValue('Copy SQL from row 10 downward. Do not copy metadata rows.');

  out.getRange(9, 1).setValue('line_no');
  out.getRange(9, 2).setValue('sql_statement');

  var outputRows = sql.map(function(statement, idx) {
    return [idx + 1, statement];
  });

  if (outputRows.length > 0) {
    out.getRange(10, 1, outputRows.length, 2).setValues(outputRows);
  }

  out.setColumnWidth(1, 90);
  out.setColumnWidth(2, 1400);
  out.getRange(1, 1, 9, 2).setFontWeight('bold');
  out.getRange(10, 2, Math.max(outputRows.length, 1), 1)
    .setWrap(false)
    .setFontFamily('Roboto Mono')
    .setFontSize(9);
}

function _salahD1DailyCounts_(entries) {
  var out = {
    logged: 0,
    masjid: 0,
    jamaat: 0,
    work: 0,
    home: 0,
    late: 0
  };

  entries.forEach(function(e) {
    if (e.is_logged) out.logged++;
    if (e.is_masjid) out.masjid++;
    if (e.is_jamaat) out.jamaat++;
    if (e.is_work) out.work++;
    if (e.is_home) out.home++;
    if (e.is_late) out.late++;
  });

  return out;
}

function _salahD1NormalizeCode_(value) {
  var v = String(value || '').trim();
  var compact = v.replace(/\s+/g, '').toLowerCase();

  if (!compact) return '';
  if (compact === 'm' || compact === 'masjid') return 'M';
  if (compact === 'j' || compact === 'jamaat') return 'J';
  if (compact === 'h' || compact === 'home') return 'H';
  if (compact === 'hu' || compact === 'homeu') return 'HU';
  if (compact === 'w' || compact === 'work') return 'W';
  if (compact === 'wu' || compact === 'worku') return 'WU';
  if (compact === 'l' || compact === 'late') return 'L';
  if (compact === 'q' || compact === 'qaza') return 'Q';

  return v;
}

function _salahD1ScoreValue_(normalizedCode) {
  switch (normalizedCode) {
    case 'M': return 2.0;
    case 'J': return 1.5;
    case 'WU': return 0.8;
    case 'HU': return 0.8;
    case 'W': return 0.5;
    case 'H': return 0.5;
    case 'L': return 0.3;
    case 'Q': return -1.5;
    default: return null;
  }
}

function _salahD1LocationLabel_(normalizedCode) {
  switch (normalizedCode) {
    case 'M': return 'Masjid';
    case 'J': return 'Jamaat';
    case 'H': return 'Home';
    case 'HU': return 'Home Udhr';
    case 'W': return 'Work';
    case 'WU': return 'Work Udhr';
    case 'L': return 'Late';
    case 'Q': return 'Qaza';
    default: return '';
  }
}

function _salahD1DetectLayout_(salah) {
  var lastCol = salah.getLastColumn();

  if (lastCol >= 15) return 'v1.7';
  if (lastCol >= 9 && lastCol <= 11) return 'v2.0+';

  return 'fresh';
}

function _salahD1DateToIso_(value) {
  if (!(value instanceof Date)) return '';

  return Utilities.formatDate(value, SALAH_D1_TZ, 'yyyy-MM-dd');
}

function _salahD1IsFriday_(dateValue) {
  if (!(dateValue instanceof Date)) return false;

  return Utilities.formatDate(dateValue, SALAH_D1_TZ, 'u') === '5';
}

function _salahD1ExtractTime_(cell) {
  var s = String(cell || '');
  var match = s.match(/([0-2]?\d:[0-5]\d)/);

  return match ? match[1] : '';
}

function _salahD1Clean_(value) {
  if (value === null || value === undefined) return '';

  return String(value).trim();
}

function _salahD1NumberOrNull_(value) {
  if (value === '' || value === null || value === undefined) return null;

  var n = Number(value);
  return isNaN(n) ? null : n;
}

function _salahD1IntegerOrZero_(value) {
  var n = Number(value);
  return isNaN(n) ? 0 : Math.round(n);
}

function _salahD1Sql_(value) {
  if (value === null || value === undefined || value === '') return 'NULL';

  return "'" + String(value).replace(/'/g, "''") + "'";
}

function _salahD1SqlNumber_(value) {
  if (value === null || value === undefined || value === '') return 'NULL';

  var n = Number(value);
  return isNaN(n) ? 'NULL' : String(n);
}

function _salahD1Checksum_(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ''),
    Utilities.Charset.UTF_8
  );

  return bytes.map(function(b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function _salahD1Alert(msg) {
  if (typeof safeAlert === 'function') {
    safeAlert(msg);
    return;
  }

  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    Logger.log(msg);
  }
}
