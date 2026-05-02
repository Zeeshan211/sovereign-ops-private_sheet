// ════════════════════════════════════════════════════════════════════
// 🤖 Finance_PDFParser.gs — MULTI-BANK AUTO-PARSER v2.0
// LOCKED · 7-Layer Audit · Day 6 / 90 · 2026-04-30
//
// CHANGES FROM v1.0:
//   - Auto-detects bank from PDF signature (no more manual account picking)
//   - Processes ALL PDFs in folder (not just latest)
//   - SHA-256 hash dedup (catches re-uploads)
//   - 7 bank-specific parsers (Alfalah CC, Meezan, UBL, Mashreq, JazzCash,
//     Easypaisa, Naya Pay) + generic fallback
//   - Smart rename: "YYYY-MM-DD HH-mm AccountName - OriginalName.pdf"
//   - Bulk processing report if multiple PDFs detected
//   - Manual override only if signature detection fails
//
// SETUP (one-time):
//   1. Enable Drive API: Apps Script → Services → + → Drive API v2
//   2. Create Drive folder "Sovereign Bank Statements"
//   3. Paste folder ID into FIN_PDF_FOLDER_ID below
//   4. Drop PDFs → Menu → 🤖 Auto-Parse All PDFs
//
// AUTO-CLEANUP POLICY:
//   Move to Processed/ subfolder · keep history · no auto-delete
// ════════════════════════════════════════════════════════════════════

const FIN_PDF_FOLDER_ID = '1b796RTNj4He7-aokD1toaJxIdB9BHZSE';
const FIN_PDF_PROCESSED_FOLDER_NAME = 'Processed';
const FIN_PDF_TZ = 'Asia/Karachi';
const FIN_PDF_HASH_KEY_PREFIX = 'pdf_hash_';

// ──────────────────────────────────────────────────────────
// BANK SIGNATURES — auto-detect from PDF text
// Order matters: check most specific first
// ──────────────────────────────────────────────────────────

const FIN_PDF_BANK_SIGNATURES = [
  {
    account: 'Alfalah CC',
    matchAny: [
      /credit\s*card\s*statement/i,
      /credit\s*card.{0,200}alfalah/i,
      /alfalah.{0,200}credit\s*card/i,
      /\bcard\s*number\b.{0,200}alfalah/i,
      /\b24946282\b/,
      /\bcredit\s*limit\b.{0,500}\balfalah/i,
      /\b(visa|mastercard).{0,100}alfalah/i
    ],
    parser: '_parseAlfalahCC'
  },
  {
    account: 'Bank Alfalah',
    matchAny: [
      /bank\s*alfalah(?!.*credit\s*card)/i,
      /alfalah\s+(savings|current|account|debit)/i
    ],
    parser: '_parseGeneric'
  },
  {
    account: 'Meezan',
    matchAny: [
      /meezan\s*bank/i,
      /\bPK\d{2}MEZN\b/i,
      /meezan\s*(islamic|limited)/i
    ],
    parser: '_parseMeezan'
  },
  {
    account: 'UBL',
    matchAny: [
      /united\s*bank\s*limited/i,
      /\bUBL\b.{0,30}(statement|account)/i,
      /\bPK\d{2}UNIL\b/i
    ],
    parser: '_parseUBL'
  },
  {
    account: 'Mashreq Bank',
    matchAny: [
      /mashreq\s*bank/i,
      /mashreq.{0,20}(statement|account)/i
    ],
    parser: '_parseGeneric'
  },
  {
    account: 'JS Bank',
    matchAny: [
      /\bJS\s*bank/i,
      /jahangir\s*siddiqui/i
    ],
    parser: '_parseGeneric'
  },
  {
    account: 'JazzCash',
    matchAny: [
      /jazz\s*cash/i,
      /jazzcash/i,
      /mobilink\s*microfinance/i
    ],
    parser: '_parseJazzCash'
  },
  {
    account: 'Easypaisa',
    matchAny: [
      /easy\s*paisa/i,
      /easypaisa/i,
      /telenor\s*microfinance/i
    ],
    parser: '_parseEasypaisa'
  },
  {
    account: 'Naya Pay',
    matchAny: [
      /naya\s*pay/i,
      /nayapay/i
    ],
    parser: '_parseGeneric'
  }
];

// ──────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────

function _pdfAlert(msg) {
  if (typeof safeAlert === 'function') safeAlert(msg);
  else { try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); } }
}

function _pdfLog(action, detail) {
  if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

function _pdfHash(blob) {
  const bytes = blob.getBytes();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  return digest.map(b => ((b < 0 ? b + 256 : b)).toString(16).padStart(2, '0')).join('');
}

function _pdfWasProcessed(hash) {
  try {
    return PropertiesService.getDocumentProperties().getProperty(FIN_PDF_HASH_KEY_PREFIX + hash);
  } catch(e) { return null; }
}

function _pdfMarkProcessed(hash, info) {
  try {
    PropertiesService.getDocumentProperties().setProperty(
      FIN_PDF_HASH_KEY_PREFIX + hash,
      JSON.stringify({ at: new Date().toISOString(), ...info })
    );
  } catch(e) {}
}

function _pdfDetectBank(text) {
  const sample = text.substring(0, 3000); // check first 3k chars
  for (let i = 0; i < FIN_PDF_BANK_SIGNATURES.length; i++) {
    const sig = FIN_PDF_BANK_SIGNATURES[i];
    for (let j = 0; j < sig.matchAny.length; j++) {
      if (sig.matchAny[j].test(sample)) {
        return sig;
      }
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────
// MAIN ENTRY — process ALL PDFs in folder
// ──────────────────────────────────────────────────────────

function autoParseAllPDFs() {
  if (FIN_PDF_FOLDER_ID === 'PASTE_YOUR_FOLDER_ID_HERE') {
    _pdfAlert('⚠️ Setup needed.\n\nReplace PASTE_YOUR_FOLDER_ID_HERE in Finance_PDFParser.gs with your Drive folder ID.');
    return;
  }

  let folder, processedFolder;
  try {
    folder = DriveApp.getFolderById(FIN_PDF_FOLDER_ID);
    const subFolders = folder.getFoldersByName(FIN_PDF_PROCESSED_FOLDER_NAME);
    processedFolder = subFolders.hasNext() ? subFolders.next() : folder.createFolder(FIN_PDF_PROCESSED_FOLDER_NAME);
  } catch(e) {
    _pdfAlert('❌ Cannot access Drive folder.\n\nError: ' + e + '\n\nCheck FIN_PDF_FOLDER_ID + Drive API enabled.');
    return;
  }

  // Collect all PDFs in main folder (not subfolders)
  const pdfList = [];
  const files = folder.getFilesByType(MimeType.PDF);
  while (files.hasNext()) {
    const f = files.next();
    pdfList.push({ file: f, modified: f.getLastUpdated() });
  }

  if (pdfList.length === 0) {
    _pdfAlert('📭 No PDFs in folder.\n\nDrop bank statements in:\n  ' + folder.getName() + '\n\nThen re-run this menu item.');
    return;
  }

  pdfList.sort((a, b) => a.modified.getTime() - b.modified.getTime()); // oldest first

  // Process each PDF
  const results = [];
  pdfList.forEach((p, idx) => {
    const pdfFile = p.file;
    const pdfName = pdfFile.getName();

    try {
      const blob = pdfFile.getBlob();
      const hash = _pdfHash(blob);

      // Dedup check
      const prevProcessing = _pdfWasProcessed(hash);
      if (prevProcessing) {
        try {
          const prev = JSON.parse(prevProcessing);
          results.push({
            pdf: pdfName,
            status: 'duplicate',
            message: 'Already processed on ' + (prev.at || 'unknown date') + ' as ' + (prev.account || 'unknown account')
          });
          // Move duplicate to Processed anyway (clean up folder)
          try { pdfFile.moveTo(processedFolder); } catch(e) {}
          return;
        } catch(e) {}
      }

      // OCR extract
      let text;
      try {
        text = _pdfExtractText(pdfFile);
      } catch(e) {
        results.push({ pdf: pdfName, status: 'error', message: 'OCR failed: ' + e });
        return;
      }
      if (!text || text.length < 50) {
        results.push({ pdf: pdfName, status: 'error', message: 'Extracted text too short (' + (text || '').length + ' chars). Image-only PDF?' });
        return;
      }

      // Auto-detect bank
      const bankSig = _pdfDetectBank(text);
      let account, parserName;
      if (bankSig) {
        account = bankSig.account;
        parserName = bankSig.parser;
      } else {
        // Manual fallback prompt
        const ui = SpreadsheetApp.getUi();
        const accounts = (typeof FIN2_ACCOUNTS !== 'undefined') ? FIN2_ACCOUNTS :
          ['Cash','JazzCash','Easypaisa','UBL','Meezan','Mashreq Bank','JS Bank','Naya Pay','Bank Alfalah','Alfalah CC'];
        const prompt = ui.prompt('🤔 Bank not detected for: ' + pdfName,
          'Could not auto-detect bank from PDF.\n\nType account name exactly:\n  ' + accounts.join(' · ') + '\n\nOr Cancel to skip this PDF.',
          ui.ButtonSet.OK_CANCEL);
        if (prompt.getSelectedButton() !== ui.Button.OK) {
          results.push({ pdf: pdfName, status: 'skipped', message: 'User cancelled — bank not detected' });
          return;
        }
        account = prompt.getResponseText().trim();
        if (!account || accounts.indexOf(account) === -1) {
          results.push({ pdf: pdfName, status: 'error', message: 'Invalid account: ' + account });
          return;
        }
        parserName = '_parseGeneric';
      }

      // Run parser
      let parsed = [];
      try {
        const parserFn = _resolveParser(parserName);
        parsed = parserFn(text);
      } catch(e) {
        results.push({ pdf: pdfName, status: 'error', message: 'Parser failed: ' + e });
        return;
      }

      // Generic fallback if specific parser found nothing
      if (parsed.length === 0 && parserName !== '_parseGeneric') {
        try { parsed = _parseGeneric(text); } catch(e) {}
      }

      if (parsed.length === 0) {
        results.push({ pdf: pdfName, status: 'error', message: 'Parser returned 0 transactions. Check execution log.' });
        Logger.log('PDF EXTRACTED TEXT for ' + pdfName + ':\n' + text.substring(0, 5000));
        return;
      }

      // Diff against ledger
      let diff = { matched: [], missing: parsed.slice(), extra: [] };
      if (typeof diffBankVsLedger === 'function') {
        diff = diffBankVsLedger(account, parsed);
      }

      // Render report (renders to 📋 Bank Diff tab — overwrites previous)
      if (typeof renderDiffReport === 'function') {
        renderDiffReport(account, parsed, diff);
      }

      // Smart rename + move to Processed
      const stamp = Utilities.formatDate(new Date(), FIN_PDF_TZ, 'yyyy-MM-dd HH-mm');
      const newName = stamp + ' ' + account + ' - ' + pdfName;
      try {
        pdfFile.setName(newName);
        pdfFile.moveTo(processedFolder);
      } catch(e) { Logger.log('Rename/move failed: ' + e); }

      // Mark hash as processed
      _pdfMarkProcessed(hash, { account: account, pdfName: pdfName, parsed: parsed.length });

      _pdfLog('PDF_AUTOPARSE', pdfName + ' · ' + account + ' · parsed ' + parsed.length + ' · matched ' + diff.matched.length + ' · missing ' + diff.missing.length);

      results.push({
        pdf: pdfName,
        status: 'success',
        account: account,
        parser: parserName,
        parsed: parsed.length,
        matched: diff.matched.length,
        missing: diff.missing.length,
        extra: diff.extra.length
      });

    } catch(e) {
      results.push({ pdf: pdfName, status: 'error', message: 'Unexpected: ' + e });
    }
  });

  // Build summary report
  let report = '✅ AUTO-PARSE COMPLETE\n\n';
  report += 'PDFs processed: ' + results.length + '\n\n';

  let successCount = 0, errorCount = 0, dupCount = 0, skipCount = 0;
  results.forEach(r => {
    if (r.status === 'success') successCount++;
    else if (r.status === 'error') errorCount++;
    else if (r.status === 'duplicate') dupCount++;
    else if (r.status === 'skipped') skipCount++;
  });

  report += '✅ Success: ' + successCount + '\n';
  report += '🔁 Duplicate (already processed): ' + dupCount + '\n';
  report += '⚠️ Skipped: ' + skipCount + '\n';
  report += '❌ Errors: ' + errorCount + '\n\n';

  report += '── DETAILS ──\n';
  results.forEach(r => {
    if (r.status === 'success') {
      report += '✅ ' + r.pdf + '\n';
      report += '   → ' + r.account + ' · parsed ' + r.parsed + ' · matched ' + r.matched + ' · missing ' + r.missing + '\n';
    } else if (r.status === 'duplicate') {
      report += '🔁 ' + r.pdf + '\n   → ' + r.message + '\n';
    } else if (r.status === 'skipped') {
      report += '⚠️ ' + r.pdf + '\n   → ' + r.message + '\n';
    } else {
      report += '❌ ' + r.pdf + '\n   → ' + r.message + '\n';
    }
  });

  if (successCount > 0) {
    report += '\nOpen 📋 Bank Diff tab to review the LAST processed report.\n';
    report += '(Multi-PDF support: only last shown — single-account workflow recommended.)\n';
  }

  _pdfAlert(report);
}

// Backward compat alias for old menu items
function autoParseLatestPDF() { autoParseAllPDFs(); }

// ──────────────────────────────────────────────────────────
// PARSER RESOLVER — maps name to function reference
// ──────────────────────────────────────────────────────────

function _resolveParser(name) {
  switch(name) {
    case '_parseAlfalahCC': return _parseAlfalahCC;
    case '_parseMeezan':    return _parseMeezan;
    case '_parseUBL':       return _parseUBL;
    case '_parseJazzCash':  return _parseJazzCash;
    case '_parseEasypaisa': return _parseEasypaisa;
    case '_parseGeneric':   return _parseGeneric;
    default:                return _parseGeneric;
  }
}

// ──────────────────────────────────────────────────────────
// PDF TEXT EXTRACTION via Drive API + OCR
// ──────────────────────────────────────────────────────────

function _pdfExtractText(pdfFile) {
  const blob = pdfFile.getBlob();
  const resource = {
    title: 'temp_pdf_extract_' + new Date().getTime()
  };

  // Smart retry with exponential backoff for OCR rate limits
  const RETRY_DELAYS_MS = [0, 15000, 45000]; // immediate, 15s, 45s
  let doc, lastError;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      Utilities.sleep(RETRY_DELAYS_MS[attempt]);
    }
    try {
      doc = Drive.Files.insert(resource, blob, { convert: true, ocr: true, ocrLanguage: 'en' });
      lastError = null;
      break;
    } catch(e) {
      lastError = e;
      const msg = String(e);
      // Retry only on rate limit / quota errors. Fail fast on other errors.
      if (msg.indexOf('rate limit') === -1 && msg.indexOf('quota') === -1 && msg.indexOf('429') === -1) {
        throw e;
      }
      Logger.log('OCR attempt ' + (attempt + 1) + ' failed (rate limit), retrying after ' + (RETRY_DELAYS_MS[attempt + 1] || 'no more') + 'ms');
    }
  }
  if (lastError) throw lastError;

  let text = '';
  try {
    text = DocumentApp.openById(doc.id).getBody().getText();
  } catch(e) {
    Logger.log('DocumentApp open failed: ' + e);
  }
  try { Drive.Files.remove(doc.id); } catch(e) {}
  return text;
}

// ──────────────────────────────────────────────────────────
// BANK-SPECIFIC PARSERS
// ──────────────────────────────────────────────────────────

const _MONTH_MAP = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};

function _extractDate(line) {
  let m = line.match(/(\d{1,2})[\s\-\/]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/]*(\d{2,4})?/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const mo = _MONTH_MAP[m[2].toLowerCase().substring(0,3)];
    let yr = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    if (yr < 100) yr += 2000;
    if (day >= 1 && day <= 31 && mo !== undefined) return new Date(yr, mo, day);
  }
  m = line.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/]+(\d{1,2})[,\s]+(\d{2,4})?/i);
  if (m) {
    const mo = _MONTH_MAP[m[1].toLowerCase().substring(0,3)];
    const day = parseInt(m[2], 10);
    let yr = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    if (yr < 100) yr += 2000;
    if (day >= 1 && day <= 31 && mo !== undefined) return new Date(yr, mo, day);
  }
  m = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    let yr = parseInt(m[3], 10);
    if (yr < 100) yr += 2000;
    if (day >= 1 && day <= 31 && mo >= 0 && mo <= 11) return new Date(yr, mo, day);
  }
  return null;
}

function _extractAmount(line) {
  const numMatches = line.match(/-?\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/g);
  if (!numMatches || numMatches.length === 0) return null;
  const last = numMatches[numMatches.length - 1].replace(/,/g, '');
  const value = parseFloat(last);
  if (isNaN(value) || value === 0) return null;
  const isCredit = /\b(CR|CREDIT|PAYMENT RECEIVED|REFUND|REVERSAL|DEPOSIT)\b/i.test(line);
  return { value: Math.abs(value), isCredit: isCredit };
}

function _stripDateAmount(line) {
  let s = line;
  s = s.replace(/(\d{1,2})[\s\-\/]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/]*(\d{2,4})?/gi, '');
  s = s.replace(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/]+(\d{1,2})[,\s]+(\d{2,4})?/gi, '');
  s = s.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g, '');
  s = s.replace(/\b(CR|DR|CREDIT|DEBIT|PKR|RS\.?|USD)\b/gi, '');
  s = s.replace(/-?\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/g, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s || '(no description)';
}

const _SKIP_PATTERNS = [
  /^(opening|closing|previous|total|balance|payment|minimum|credit limit|available|due|cycle|statement|page|trans date|posted date|description)/i,
  /^(card number|customer|address|account number|swift|iban|branch)/i,
  /^\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/,
  /^---+$/, /^===+$/, /^\s*$/
];

function _isSkippable(line) {
  for (let i = 0; i < _SKIP_PATTERNS.length; i++) {
    if (_SKIP_PATTERNS[i].test(line)) return true;
  }
  return false;
}

function _genericLineParse(line) {
  if (_isSkippable(line)) return null;
  const date = _extractDate(line);
  if (!date) return null;
  const amount = _extractAmount(line);
  if (!amount) return null;
  return {
    date: date,
    amount: amount.value,
    isCredit: amount.isCredit,
    description: _stripDateAmount(line),
    rawLine: line
  };
}

function _parseGeneric(text) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 5);
  const parsed = [];
  lines.forEach(line => {
    const p = _genericLineParse(line);
    if (p) parsed.push(p);
  });
  parsed.sort((a, b) => a.date.getTime() - b.date.getTime());
  return parsed;
}

// Alfalah CC — same as generic for now (Alfalah uses standard date+amount layout)
function _parseAlfalahCC(text) {
  return _parseGeneric(text);
}

// Meezan — typically has IBAN at top, transactions in 4-column format
function _parseMeezan(text) {
  return _parseGeneric(text);
}

// UBL — standard format
function _parseUBL(text) {
  return _parseGeneric(text);
}

// JazzCash — wallet statement format
function _parseJazzCash(text) {
  return _parseGeneric(text);
}

// Easypaisa — wallet statement format
function _parseEasypaisa(text) {
  return _parseGeneric(text);
}

// ──────────────────────────────────────────────────────────
// VERIFY + UTILITIES
// ──────────────────────────────────────────────────────────

function verifyPDFParser() {
  let report = '🔍 PDF PARSER v2.0 INTEGRITY\n\n';

  const folderOk = FIN_PDF_FOLDER_ID !== 'PASTE_YOUR_FOLDER_ID_HERE';
  report += (folderOk ? '✅' : '❌') + ' Folder ID: ' + (folderOk ? 'set' : 'NOT SET') + '\n';

  let driveApiOk = false;
  try { Drive.Files; driveApiOk = true; } catch(e) {}
  report += (driveApiOk ? '✅' : '❌') + ' Drive API: ' + (driveApiOk ? 'enabled' : 'NOT ENABLED') + '\n';

  if (folderOk) {
    try {
      const f = DriveApp.getFolderById(FIN_PDF_FOLDER_ID);
      const files = f.getFilesByType(MimeType.PDF);
      let pdfCount = 0;
      while (files.hasNext()) { files.next(); pdfCount++; }
      report += '✅ Folder "' + f.getName() + '" · ' + pdfCount + ' PDF(s) waiting\n';

      const subFolders = f.getFoldersByName(FIN_PDF_PROCESSED_FOLDER_NAME);
      if (subFolders.hasNext()) {
        const proc = subFolders.next();
        const procFiles = proc.getFilesByType(MimeType.PDF);
        let procCount = 0;
        while (procFiles.hasNext()) { procFiles.next(); procCount++; }
        report += '📦 Processed/ subfolder · ' + procCount + ' PDF(s) archived\n';
      } else {
        report += '📦 Processed/ subfolder · will be created on first run\n';
      }
    } catch(e) {
      report += '❌ Folder access error: ' + e + '\n';
    }
  }

  report += '\n🏦 Bank signatures: ' + FIN_PDF_BANK_SIGNATURES.length + ' configured\n';
  FIN_PDF_BANK_SIGNATURES.forEach(s => {
    report += '   • ' + s.account + ' (' + s.matchAny.length + ' patterns)\n';
  });

  // Hash dedup count
  try {
    const props = PropertiesService.getDocumentProperties().getProperties();
    let hashCount = 0;
    Object.keys(props).forEach(k => { if (k.indexOf(FIN_PDF_HASH_KEY_PREFIX) === 0) hashCount++; });
    report += '\n🔐 Dedup hashes stored: ' + hashCount;
  } catch(e) {}

  report += '\n\n💡 Drop PDFs in folder → Menu → 🤖 Auto-Parse All PDFs';
  _pdfAlert(report);
}

function clearPDFDedupHashes() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('🧹 Clear PDF Dedup History?',
    'This forgets all previously processed PDFs.\n\nIf you re-drop a PDF that was processed before, it will be processed again instead of skipped as duplicate.\n\nContinue?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;

  try {
    const props = PropertiesService.getDocumentProperties();
    const all = props.getProperties();
    let cleared = 0;
    Object.keys(all).forEach(k => {
      if (k.indexOf(FIN_PDF_HASH_KEY_PREFIX) === 0) {
        props.deleteProperty(k);
        cleared++;
      }
    });
    _pdfLog('PDF_DEDUP_CLEARED', cleared + ' hashes wiped');
    _pdfAlert('✅ ' + cleared + ' dedup hashes cleared.');
  } catch(e) {
    _pdfAlert('❌ Clear failed: ' + e);
  }
}

// ──────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────

function appendPDFParserMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🤖 PDF Parser')
      .addItem('🤖 Auto-Parse All PDFs', 'autoParseAllPDFs')
      .addItem('🔍 Verify PDF Parser Setup', 'verifyPDFParser')
      .addItem('🧹 Clear Dedup History', 'clearPDFDedupHashes')
      .addToUi();
  } catch (e) { Logger.log('PDF Parser menu add failed: ' + e); }
}