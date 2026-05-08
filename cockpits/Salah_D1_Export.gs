// Salah_D1_Export.gs v0.1.1
// Layer 2B - Sheet -> D1 Salah export mapping
//
// v0.1.1 change:
// - Writes one SQL statement per row in D1_Salah_Export instead of one huge cell.
// - Prevents Google Sheets cell-size/display issues.
//
// Safety:
// - Does not call Cloudflare.
// - Does not mutate D1.
// - Does not touch Finance.
// - Does not create fake prayer rows.
// - Recovery rows are generated only from real Q / Qaza cells.

const SALAH_D1_EXPORT_VERSION = 'Salah_D1_Export v0.1.1';
const SALAH_D1_SOURCE_VERSION = 'Salah_Pro v2.1';
const SALAH_D1_TAB = typeof SALAH_TAB !== 'undefined' ? SALAH_TAB : ' Salah';
const SALAH_D1_EXPORT_TAB = 'D1_Salah_Export';
const SALAH_D1_GRID_START_ROW = typeof SALAH_GRID_START_ROW !== 'undefined' ? SALAH_GRID_START_ROW : 6;
const SALAH_D1_GRID_DAYS = typeof SALAH_GRID_DAYS !== 'undefined' ? SALAH_GRID_DAYS : 31;
const SALAH_D1_TZ = 'Asia/Karachi';

function buildSalahD1ExportSql() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salah = ss.getSheetByName(SALAH_D1_TAB);

  if (!salah) {
    _salahD1Alert('Salah tab not found. Expected: ' + SALAH_D1_TAB);
    return;
  }

  const now = new Date();
  const exportedAt = Utilities.formatDate(now, SALAH_D1_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const exportBatchId = 'salah_export_' + Utilities.formatDate(now, SALAH_D1_TZ, 'yyyyMMdd_HHmmss');
  const sourceLayout = _salahD1DetectLayout_(salah);

  const rows = _salahD1ReadRows_(salah);
  const prayerTimes = _salahD1ReadPrayerTimes_(salah, now);

  const sql = [];
  let rowsRead = 0;
  let rowsWritten = 0;

  sql.push('-- Salah D1 Export');
  sql.push('-- Generated: ' + exportedAt);
  sql.push('-- Source tab: ' + SALAH_D1_TAB);
  sql.push('-- Source version: ' + SALAH_D1_SOURCE_VERSION);
  sql.push('-- Exporter: ' + SALAH_D1_EXPORT_VERSION);
  sql.push('-- Batch: ' + exportBatchId);
  sql.push('-- Review before pasting into Cloudflare D1.');
  sql.push('');

  const dailyStatements = [];
  const entryStatements = [];
  const recoveryStatements = [];

  rows.forEach(function(row) {
    if (!row.day) return;

    rowsRead++;

    dailyStatements.push(_salahD1DailyInsertSql_(row, exportBatchId, exportedAt, sourceLayout));
    rowsWritten++;

    row.prayers.forEach(function(entry) {
      entryStatements.push(_salahD1PrayerEntryInsertSql_(entry, row, exportBatchId, exportedAt));
      rowsWritten++;

      if (entry.is_qaza === 1) {
        recoveryStatements.push(_salahD1RecoveryInsertSql_(entry, row, exportBatchId));
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
  }

  sql.push.apply(sql, dailyStatements);
  sql.push.apply(sql, entryStatements);
  sql.push.apply(sql, recoveryStatements);

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
    'SQL statements: ' + rowsWritten + '\n\n' +
    'SQL now starts at row 10, one statement per row.\n' +
    'Copy column A from row 10 down and paste into Cloudflare D1 after review.'
  );
}

function verifySalahD1ExportSource() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salah = ss.getSheetByName(SALAH_D1_TAB);

  if (!salah) {
    _salahD1Alert('Salah tab missing. Expected: ' + SALAH_D1_TAB);
    return;
  }

  const layout = _salahD1DetectLayout_(salah);
  const values = 
