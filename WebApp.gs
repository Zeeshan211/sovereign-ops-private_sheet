
// ════════════════════════════════════════════════════════════════════
// 🌐 WebApp.gs — DASHBOARD BACKEND (Step 5a of 6)
// LOCKED v1.0 · 5-Test Audited
//
// STANDALONE: Depends only on Code.gs
// SIDE-EFFECTS: doGet serves HTML, family tracker writes to DocumentProperties
// RE-RUN SAFE: All read functions pure, write functions idempotent
//
// REQUIRES: dashboard.html file in same Apps Script project
//
// TEST AFTER PASTE (after dashboard.html is created):
//   1. Deploy → New deployment → Web app → Execute as: Me, Access: Only myself
//   2. Click the URL → dashboard opens in browser
//   OR
//   1. Function dropdown → "getDashboardData" → ▶️ Run
//   2. Check execution log for data object
// ════════════════════════════════════════════════════════════════════


function doGet(e) {
  return HtmlService.createTemplateFromFile('dashboard')
    .evaluate()
    .setTitle('⚡ Sovereign Ops')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}


// ──────────────────────────────────────────────────────────
// MAIN DASHBOARD DATA
// ──────────────────────────────────────────────────────────

function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const HAB = ss.getSheetByName(SHEETS.HABITS);
  const PRG = ss.getSheetByName(SHEETS.PROGRESS);
  const SAL = ss.getSheetByName(SHEETS.SALAH);
  const FIN = ss.getSheetByName(SHEETS.FINANCE);
  const KPI = ss.getSheetByName(SHEETS.KPIS);
  const SET = ss.getSheetByName(SHEETS.SETTINGS);
  
  if (!HAB || !PRG || !SAL || !FIN || !KPI || !SET) {
    return { error: 'Sheets not built yet. Run Setup first.' };
  }
  
  const today = new Date();
  const day = today.getDate();
  const dayOfQuest = getQuestDay();
  const todayRow = 5 + day;
  
  // Weight
  const weightSeries = PRG.getRange('B6:B36').getValues().flat().filter(v => v !== '' && typeof v === 'number');
  const weightStart = SET.getRange('B10').getValue() || 80;
  const weightTarget = SET.getRange('B11').getValue() || 69;
  const currentWeight = weightSeries.length > 0 ? weightSeries[weightSeries.length - 1] : weightStart;
  const weightToGo = currentWeight - weightTarget;
  const weightPctToGoal = Math.max(0, Math.min(100, ((weightStart - currentWeight) / (weightStart - weightTarget)) * 100));
  
  // Habits today
  const habitsToday = HAB.getRange(23, 2 + day).getValue() || 0;
  
  // Vitals
  const mood = PRG.getRange(todayRow, 3).getValue();
  const motiv = PRG.getRange(todayRow, 4).getValue();
  const energy = PRG.getRange(todayRow, 5).getValue();
  const sleep = PRG.getRange(todayRow, 6).getValue();
  
  // Salah
  const fajrL = SAL.getRange(todayRow, 3).getValue() || '—';
  const dhuhrL = SAL.getRange(todayRow, 5).getValue() || '—';
  const asrL = SAL.getRange(todayRow, 6).getValue() || '—';
  const maghribL = SAL.getRange(todayRow, 7).getValue() || '—';
  const ishaL = SAL.getRange(todayRow, 8).getValue() || '—';
  
  // Work KPIs
  const ahtMtd = KPI.getRange('B42').getValue();
  const csatMtd = KPI.getRange('B43').getValue();
  const ahtTarget = SET.getRange('B18').getValue() || 9.7;
  const csatTarget = SET.getRange('B19').getValue() || 97;
  
  // Money
  const totalDebt = FIN.getRange('B85').getValue() || 0;
  const debtPaid = FIN.getRange('B86').getValue() || 0;
  const netDebt = FIN.getRange('B88').getValue() || 0;
  const payoffPct = FIN.getRange('B89').getValue() || 0;
  
  // Pillar percentages
  const fajrMasjidCount = HAB.getRange('AH7').getValue() || 0;
  const overallSalahMtd = HAB.getRange('AH7:AH11').getValues().flat().reduce((a,b) => a+(b||0), 0);
  const deenPct = Math.min(100, Math.round((overallSalahMtd / (5 * day)) * 100));
  const bodyPct = Math.round(weightPctToGoal);
  const moneyPct = Math.min(100, Math.round((payoffPct || 0) * 100));
  const studyMtd = PRG.getRange('G6:G36').getValues().flat().reduce((a,b) => a+(b||0), 0);
  const knowledgePct = Math.min(100, Math.round((studyMtd / 40) * 100));
  
  // Verse
  const verseIdx = Math.floor((today - new Date(2026,0,1)) / 86400000) % VERSES.length;
  
  const fmt = (v, suffix) => (v === '' || v === null || v === undefined) ? '—' : v + (suffix || '');
  const fmtNum = (v) => typeof v === 'number' ? v.toLocaleString() : '—';
  
  return {
    dateString: Utilities.formatDate(today, Session.getScriptTimeZone(), 'EEEE · dd MMM yyyy'),
    dayOfQuest: dayOfQuest,
    weight: {
      current: currentWeight,
      target: weightTarget,
      toGo: Math.max(0, weightToGo),
      percentToGoal: weightPctToGoal
    },
    habitsToday: habitsToday,
    pillars: {
      deen:      { detail: overallSalahMtd + '/' + (5*day) + ' prayers · ' + fajrMasjidCount + '/' + day + ' Fajr@masjid', pct: deenPct },
      body:      { detail: currentWeight.toFixed(1) + 'kg → ' + weightTarget + 'kg · ' + weightToGo.toFixed(1) + ' to go', pct: bodyPct },
      money:     { detail: fmtNum(debtPaid) + ' paid of ' + fmtNum(totalDebt + debtPaid) + ' PKR total', pct: moneyPct },
      knowledge: { detail: studyMtd.toFixed(1) + ' study hrs MTD · target 40/quarter', pct: knowledgePct },
      family:    { detail: 'Family tracker pending', pct: 10 }
    },
    snapshot: {
      mood: fmt(mood) + ' / ' + fmt(motiv) + ' / ' + fmt(energy),
      sleep: fmt(sleep, ' h'),
      salah: 'F:' + fajrL + ' D:' + dhuhrL + ' A:' + asrL + ' M:' + maghribL + ' I:' + ishaL,
      aht: typeof ahtMtd === 'number' ? ahtMtd.toFixed(1) + ' min · target ' + ahtTarget : '—',
      csat: typeof csatMtd === 'number' ? csatMtd.toFixed(1) + '% · target ' + csatTarget : '—',
      debt: fmtNum(netDebt) + ' PKR',
      ahtGood: typeof ahtMtd === 'number' && ahtMtd <= ahtTarget,
      csatGood: typeof csatMtd === 'number' && csatMtd >= csatTarget
    },
    verse: VERSES[verseIdx]
  };
}


// ──────────────────────────────────────────────────────────
// QUICK LOG ENDPOINTS (called from dashboard buttons)
// ──────────────────────────────────────────────────────────

function logWeightWeb(weight) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PROGRESS)
    .getRange(5 + new Date().getDate(), 2).setValue(parseFloat(weight));
  return { success: true };
}

function logSleepWeb(hours) {
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PROGRESS)
    .getRange(5 + new Date().getDate(), 6).setValue(parseFloat(hours));
  return { success: true };
}

function logSalahWeb(prayer, location) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sal = ss.getSheetByName(SHEETS.SALAH);
  const hab = ss.getSheetByName(SHEETS.HABITS);
  const day = new Date().getDate();
  const r = 5 + day;
  const colMap = { fajr: 3, dhuhr: 5, asr: 6, maghrib: 7, isha: 8 };
  const habRowMap = { fajr: 7, dhuhr: 8, asr: 9, maghrib: 10, isha: 11 };
  if (!colMap[prayer]) return { success: false };
  sal.getRange(r, colMap[prayer]).setValue(location);
  hab.getRange(habRowMap[prayer], 2 + day).setValue(location === 'Q' ? 0 : 1);
  return { success: true };
}

function logFreeWeb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheetByName(SHEETS.HABITS).getRange(22, 2 + new Date().getDate()).setValue(1);
  return { success: true };
}

function logResetWeb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheetByName(SHEETS.HABITS).getRange(22, 2 + new Date().getDate()).setValue(0);
  return { success: true };
}


// ──────────────────────────────────────────────────────────
// FAMILY TRACKER (uses DocumentProperties — no sheet required)
// ──────────────────────────────────────────────────────────

function getFamilyData() {
  const props = PropertiesService.getDocumentProperties();
  const tracker = JSON.parse(props.getProperty('familyTracker') || '{}');
  const today = new Date();
  const members = ['Ammi', 'Abba', 'Brother', 'Sister'];
  return {
    members: members.map(name => {
      const lastCalled = tracker[name] ? new Date(tracker[name]) : null;
      const daysSince = lastCalled ? Math.floor((today - lastCalled) / 86400000) : null;
      return {
        name: name,
        lastCalled: lastCalled ? Utilities.formatDate(lastCalled, Session.getScriptTimeZone(), 'dd MMM') : '—',
        daysSince: daysSince,
        flag: daysSince !== null && daysSince > 7
      };
    })
  };
}

function logFamilyCall(member) {
  const props = PropertiesService.getDocumentProperties();
  const tracker = JSON.parse(props.getProperty('familyTracker') || '{}');
  tracker[member] = new Date().toISOString();
  props.setProperty('familyTracker', JSON.stringify(tracker));
  return { success: true };
}


// ──────────────────────────────────────────────────────────
// HELPER: Get web app URL for sharing
// ──────────────────────────────────────────────────────────

function getWebAppUrl() {
  const url = ScriptApp.getService().getUrl();
  if (!url) {
    safeAlert('⚠️ Web app not deployed yet.\n\n1. Deploy → New deployment\n2. Type: Web app\n3. Execute as: Me\n4. Access: Only myself\n5. Deploy → copy URL');
    return;
  }
  safeAlert('🌐 Your dashboard URL:\n\n' + url + '\n\nBookmark on phone home screen for quick access.');
}
