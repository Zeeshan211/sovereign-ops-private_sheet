// ════════════════════════════════════════════════════════════════════
// 🧠 AI.gs v2.1 — SOVEREIGN MENTOR ENGINE · BROTHER VOICE · v2.1 DATA
// Day 6 of 90 · 2026-04-29
//
// CHANGES FROM v2.0:
//   - SOVEREIGN_PROMPT trimmed to brother voice (locked memory rules)
//     · No more long structured templates. Mentor speaks like a brother.
//     · No bold section headers in output. Just flowing paragraphs.
//   - buildSovereignContext() now reads from v2.1 structures:
//     · Salah from 🕌 Salah tab cols 2-6 (was cols 3,5,6,7,8)
//     · Habits from 📋 Habits tab cols 3-9 + col J (was row 23 monthly)
//     · Habit total now /14 (was /16)
//     · DEEN pillar reads from J7:J11 weekly (was AH7:AH11 monthly)
//   - callGemini() is a clean wrapper to callAI() (no duplicate comments)
//
// EXPORTS (used by Telegram.gs, Isnad.gs):
//   - SOVEREIGN_PROMPT
//   - buildSovereignContext()
//   - callGemini(prompt, maxTokens)  [backward compat → callAI]
//   - logAiBriefing(text, questDay)
//
// REQUIRES:
//   - Code.gs (SHEETS, getQuestDay, safeAlert, AI_LOG_SHEET)
//   - AI_Engine.gs (callAI multi-model fallback)
// ════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// SOVEREIGN MENTOR PROMPT — brother voice
// ──────────────────────────────────────────────────────────

const SOVEREIGN_PROMPT = [
  "You are speaking to Muhammad Zeeshan Nasir.",
  "He chose the kunya Abu Walah — Father of Longing — in the last ten nights of",
  "Ramadan 1446. That choice tells you who he is.",
  "",
  "═══ WHO YOU ARE ═══",
  "",
  "A wise older brother. Not a coach. Not an assistant. Not a sheikh on a minbar.",
  "A brother who has known him for years and has earned the right to speak truth.",
  "",
  "Your three rules, never broken:",
  "1. Honest never harsh. When he slips, name it cleanly without shame language.",
  "2. Specific never generic. Reference real numbers. Real patterns. Real next moves.",
  "3. Always building never stopping. Every message points forward.",
  "",
  "═══ WHO HE IS ═══",
  "",
  "A contradiction held together by intention. The engineer who builds AI systems",
  "at 4 AM. The man who can lose to Instagram scroll the same morning. Both are him.",
  "Speak to both with rahmah.",
  "",
  "Night shift 4PM-1AM at Motive in Lahore. Two specific vulnerabilities:",
  "- Idle time at work → scroll → Habit One slip",
  "- 3 AM perfectionism spirals (system-building when he should sleep)",
  "",
  "He built MDCF (hadith forensics), TARTEEL (Quran in revelation order), QADR,",
  "GEAF, RVP. Loves Ahl al-Bayt without sectarianism. Listens to Engineer Mirza,",
  "Dr. Israr Ahmad, Syed Jawad Naqvi. He is a serious student of his Deen.",
  "",
  "═══ HIS QUEST (started 25 April 2026, 90 days) ═══",
  "",
  "DEEN: Fajr at Masjid streak (already proven discipline)",
  "BODY: 80 → 69 kg (currently ~76.7)",
  "MONEY: 50% debt payoff by Day 90 (Imran Bhai ~215k PKR, the heaviest)",
  "KNOWLEDGE: 100 SQL + 30 Python + 6 books, TSE-ready by Day 90",
  "FAMILY: Weekly Ammi/Abba calls",
  "",
  "═══ TONE — THE BROTHER VOICE ═══",
  "",
  "Speak plain. Short sentences. Say less but say it true.",
  "",
  "DO:",
  "- Reference his actual numbers when you make a point",
  "- Ask one sharp question that he must sit with",
  "- Quote a specific ayah (with surah:ayah) or hadith (with source) ONLY when it",
  "  fits naturally — not in every message",
  "- Use Arabic terms without translating obvious ones (niyyah, sabr, rahmah, akhirat)",
  "- Call him 'akhi' once per major message — not in every line",
  "- Acknowledge his contradictions openly (engineer + trapped man both visible)",
  "- Adjust to time of day (morning = invitation, late = honest about cost)",
  "",
  "DON'T:",
  "- Recap data he just saw in /today",
  "- Issue commands. Invite, ask, mirror instead",
  "- Use generic Islamic framing like 'trust Allah' — be specific",
  "- Pad with 'great job' or 'you've got this'",
  "- Use long bullet lists. Speak in flowing paragraphs",
  "- Add bold headers like **WHERE YOU ARE** — write like a real message, not a template",
  "- Add greetings or signoffs",
  "",
  "═══ TIME-AWARE ═══",
  "",
  "Briefing runs ~1 PM PKT. Fajr is logged. Dhuhr just happened. Asr/Maghrib/Isha",
  "are future — never count them as missed. Suggest things he can DO before shift",
  "(Quran tafsir 20 min, walk in sunlight, call Ammi, lunch with protein, stretch).",
  "",
  "═══ SPARSE DATA ═══",
  "",
  "A blank day is not failure. It's a page being written. Use last 7-30 days of",
  "history when today is sparse. Frame mornings as opportunity. Only flag a 'pattern'",
  "when there's clear multi-day evidence.",
  "",
  "═══ OUTPUT ═══",
  "",
  "Write 200-350 words max as flowing paragraphs. No section headers. No bullet",
  "points unless you absolutely need them. Open by naming what you see (not by",
  "listing his numbers). Move into one observation. End with one invitation or",
  "question for tonight's window.",
  "",
  "End with exactly one line: Bismillah · Day [N] of 90"
].join('\n');

// ──────────────────────────────────────────────────────────
// CONTEXT BUILDER — sheet data → AI summary (v2.1 sources)
// ──────────────────────────────────────────────────────────

function buildSovereignContext() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const PRG = ss.getSheetByName(SHEETS.PROGRESS);
  const HAB = ss.getSheetByName(SHEETS.HABITS);
  const SAL = ss.getSheetByName(SHEETS.SALAH);
  const FIN = ss.getSheetByName(SHEETS.FINANCE);
  const KPI = ss.getSheetByName(SHEETS.KPIS);
  const SET = ss.getSheetByName(SHEETS.SETTINGS);

  if (!PRG || !HAB || !SAL || !FIN || !KPI || !SET) {
    return 'One or more sheets missing. Run Setup first.';
  }

  const today = new Date();
  const day = today.getDate();
  const r = 5 + day;
  const questDay = getQuestDay();
  const currentHour = today.getHours();
  const currentTime = Utilities.formatDate(today, 'Asia/Karachi', 'HH:mm');

  // Time-aware prayer status
  const prayedByNow = [];
  if (currentHour >= 5)  prayedByNow.push('Fajr');
  if (currentHour >= 13) prayedByNow.push('Dhuhr');
  if (currentHour >= 16) prayedByNow.push('Asr');
  if (currentHour >= 19) prayedByNow.push('Maghrib');
  if (currentHour >= 20) prayedByNow.push('Isha');
  const upcoming = ['Fajr','Dhuhr','Asr','Maghrib','Isha'].filter(p => prayedByNow.indexOf(p) === -1);

  let timeContext;
  if (currentHour < 9) timeContext = 'Morning, before shift. Gentle invitation tone.';
  else if (currentHour < 16) timeContext = 'Pre-shift afternoon. Main briefing window.';
  else if (currentHour < 22) timeContext = 'Mid-shift evening. Focused energy.';
  else timeContext = 'Late shift / 3 AM zone. Acknowledge the hour and the cost.';

  // Today's vitals (Progress tab)
  const weight = PRG.getRange(r, 2).getValue() || '—';
  const mood   = PRG.getRange(r, 3).getValue() || '—';
  const motiv  = PRG.getRange(r, 4).getValue() || '—';
  const energy = PRG.getRange(r, 5).getValue() || '—';
  const sleep  = PRG.getRange(r, 6).getValue() || '—';
  const study  = PRG.getRange(r, 7).getValue() || 0;

  // Today's salah from v2.1 layout (cols 2-6, not 3,5,6,7,8)
  const sal = {
    fajr:    SAL.getRange(r, 2).getValue() || '—',
    dhuhr:   SAL.getRange(r, 3).getValue() || '—',
    asr:     SAL.getRange(r, 4).getValue() || '—',
    maghrib: SAL.getRange(r, 5).getValue() || '—',
    isha:    SAL.getRange(r, 6).getValue() || '—'
  };
  const todayScore = SAL.getRange(r, 9).getValue() || '—';
  const todayQaza = SAL.getRange(r, 10).getValue() || 0;

  // 7-day trends from Progress
  const get7d = (col) => {
    const arr = [];
    for (let d = Math.max(1, day - 6); d <= day; d++) {
      const v = PRG.getRange(5 + d, col).getValue();
      if (typeof v === 'number') arr.push(v);
    }
    return arr;
  };
  const sleeps = get7d(6);
  const moods = get7d(3);
  const energies = get7d(5);
  const avg = (arr) => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : '—';

  // Habits today from v2.1 structure
  const dayOfWeek = (() => { const d = today.getDay(); return d === 0 ? 7 : d; })();
  const todayCol = 2 + dayOfWeek;

  let habitsTodayCount = 0;
  try {
    const todayValues = HAB.getRange(7, todayCol, 17, 1).getValues().flat();
    todayValues.forEach(v => {
      if (v === true || v === 'TRUE' || v === '✓') habitsTodayCount++;
    });
  } catch (e) {}

  // This week's salah from Habits J col rows 7-11 (DEEN cat)
  const deenWeekSum = HAB.getRange('J7:J11').getValues().flat()
                        .reduce((a,b) => a + (typeof b === 'number' ? b : 0), 0);
  const fajrMasjidThisWeek = HAB.getRange('J7').getValue() || 0;
  const fivePrayersThisWeek = HAB.getRange('J8').getValue() || 0;

  // Last 7 days salah scores from Salah tab col 9 (rows 6-36)
  const salahScores7d = [];
  for (let d = Math.max(1, day - 6); d <= day; d++) {
    const score = SAL.getRange(5 + d, 9).getValue();
    if (typeof score === 'number' && score > 0) salahScores7d.push(score);
  }
  const avgSalahScore7d = salahScores7d.length ? 
    (salahScores7d.reduce((a,b) => a+b, 0) / salahScores7d.length).toFixed(1) : '—';

  // Habit One — find the row in v2.1 structure
  let habitOneWeekCount = 0;
  for (let row = 7; row <= 23; row++) {
    const name = String(HAB.getRange(row, 1).getValue() || '');
    if (name.indexOf('Habit One') !== -1) {
      habitOneWeekCount = HAB.getRange(row, 10).getValue() || 0;
      break;
    }
  }

  // Work KPIs
  const ahtMtd  = KPI.getRange('B42').getValue();
  const csatMtd = KPI.getRange('B43').getValue();
  const ahtTarget  = SET.getRange('B18').getValue() || 9.7;
  const csatTarget = SET.getRange('B19').getValue() || 97;

  // Money
  const totalDebt = FIN.getRange('B85').getValue() || 0;
  const totalPaid = FIN.getRange('B86').getValue() || 0;
  const netDebt   = FIN.getRange('B88').getValue() || 0;
  const payoffPct = (totalPaid / (totalDebt + totalPaid)) * 100 || 0;

  // Weight
  const startWeight  = SET.getRange('B10').getValue() || 80;
  const targetWeight = SET.getRange('B11').getValue() || 69;
  const currentWeight = typeof weight === 'number' 
    ? weight 
    : (PRG.getRange('B6:B36').getValues().flat().filter(v => typeof v === 'number').slice(-1)[0] || startWeight);

  return [
    "═══ ABU WALAH'S DATA — Quest Day " + questDay + "/90 ═══",
    "Today is " + Utilities.formatDate(today, 'Asia/Karachi', 'EEEE, dd MMM yyyy') + 
      " · Time: " + currentTime + " PKT",
    "",
    "TIME CONTEXT: " + timeContext,
    "Prayers done by this hour: " + (prayedByNow.length ? prayedByNow.join(', ') : 'None yet'),
    "Prayers still upcoming today: " + (upcoming.length ? upcoming.join(', ') : 'All done'),
    "Do NOT flag upcoming prayers as missed.",
    "",
    "VITALS:",
    "Weight: " + (typeof weight === 'number' ? weight.toFixed(1) + ' kg' : weight) + 
      " · target " + targetWeight + " kg · current " + currentWeight.toFixed(1) + " kg",
    "Mood/Motivation/Energy today: " + mood + " / " + motiv + " / " + energy + " (1-10)",
    "Sleep last night: " + sleep + " hours · Study today: " + study + " hours",
    "",
    "7-DAY TRENDS:",
    "Sleep avg: " + avg(sleeps) + "h · Mood avg: " + avg(moods) + " · Energy avg: " + avg(energies),
    "Salah score avg: " + avgSalahScore7d + "/10 across " + salahScores7d.length + " logged days",
    "",
    "DEEN TODAY:",
    "Fajr=" + sal.fajr + " · Dhuhr=" + sal.dhuhr + " · Asr=" + sal.asr + 
      " · Maghrib=" + sal.maghrib + " · Isha=" + sal.isha,
    "Codes: M=Masjid · J=Jamaat · H=Home · W=Work · WU/HU=valid reason · L=Late · Q=Qaza",
    "Today's score: " + (typeof todayScore === 'number' ? todayScore.toFixed(1) + '/10' : '—'),
    "Today's Qaza count: " + todayQaza,
    "",
    "DEEN THIS WEEK (Mon-Sun):",
    "Fajr at Masjid: " + fajrMasjidThisWeek + "/7 days",
    "All 5 prayers logged: " + fivePrayersThisWeek + "/7 days",
    "Total Deen habits done: " + deenWeekSum + "/35 (5 habits × 7 days)",
    "",
    "BODY/MIND/SHIELD TODAY:",
    "Habits done today: " + habitsTodayCount + "/14",
    "Weight to target: " + (currentWeight - targetWeight).toFixed(1) + " kg over",
    "Habit One this week: " + habitOneWeekCount + "/7 clean days",
    "",
    "MONEY:",
    "Total debt remaining: " + totalDebt.toLocaleString() + " PKR (Imran Bhai is the heaviest)",
    "Paid so far: " + totalPaid.toLocaleString() + " PKR",
    "Payoff: " + payoffPct.toFixed(1) + "% (target by Day 90: 50%)",
    "Net debt: " + netDebt.toLocaleString() + " PKR",
    "",
    "WORK (Motive night shift):",
    "AHT MTD: " + (typeof ahtMtd === 'number' ? ahtMtd.toFixed(1) + ' min' : '—') + 
      " (target ≤" + ahtTarget + ")",
    "CSAT MTD: " + (typeof csatMtd === 'number' ? csatMtd.toFixed(1) + '%' : '—') + 
      " (target ≥" + csatTarget + "%)",
    "",
    "═══ MENTOR TASK ═══",
    "Speak to him as his older brother. Honest. Specific. Forward-pointing.",
    "Find what's actually happening today. If a contradiction is visible, name it gently.",
    "Quote ayah/hadith ONLY if it fits naturally. Ask one sharp question for his window tonight.",
    "Do not recap data he just saw. Do not command. Do not pad. 200-350 words max."
  ].join('\n');
}

// ──────────────────────────────────────────────────────────
// SHARED GEMINI WRAPPER — backward compat → callAI
// ──────────────────────────────────────────────────────────

function callGemini(prompt, maxTokens) {
  if (typeof callAI === 'function') {
    const result = callAI(prompt, maxTokens || 2000);
    return {
      text: result.text || '',
      error: result.error || null
    };
  }
  // Hard fallback if AI_Engine.gs isn't loaded — direct Gemini call
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { text: '', error: 'GEMINI_API_KEY not set and AI_Engine.gs not loaded' };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey;
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens || 2000, temperature: 0.7 }
      }),
      muteHttpExceptions: true
    });
    const data = JSON.parse(response.getContentText());
    if (data.error) return { text: '', error: data.error.message };
    if (!data.candidates || !data.candidates[0]) return { text: '', error: 'No response' };
    return { text: data.candidates[0].content.parts[0].text || '', error: null };
  } catch (e) {
    return { text: '', error: e.message };
  }
}

// ──────────────────────────────────────────────────────────
// SOVEREIGN BRIEFING — email version
// ──────────────────────────────────────────────────────────

function sendSovereignBriefing() {
  const context = buildSovereignContext();
  const result = callGemini(SOVEREIGN_PROMPT + '\n\n' + context, 4000);

  if (result.error) {
    safeAlert('AI error: ' + result.error);
    return;
  }

  const briefing = result.text;
  const today = new Date();
  const questDay = getQuestDay();
  const subject = 'Sovereign Briefing · Day ' + questDay + ' of 90 · ' + 
    Utilities.formatDate(today, 'Asia/Karachi', 'EEE dd MMM');

  const htmlBody = 
    '<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0e1a;color:#f1f5f9;padding:24px">' +
    '<div style="border-bottom:2px solid #f59e0b;padding-bottom:12px;margin-bottom:20px">' +
    '<div style="color:#f59e0b;font-size:12px;letter-spacing:2px;font-weight:800">SOVEREIGN OPS</div>' +
    '<div style="color:#fbbf24;font-size:24px;font-weight:900;margin-top:4px">Day ' + questDay + ' / 90</div>' +
    '</div>' +
    '<div style="line-height:1.8;font-size:15px;white-space:pre-wrap">' + briefing.replace(/\n/g, '<br>') + '</div>' +
    '<div style="margin-top:30px;padding-top:16px;border-top:1px solid #1e2742;color:#64748b;font-size:11px;text-align:center">' +
    'Bismillah' +
    '</div></div>';

  GmailApp.sendEmail(Session.getActiveUser().getEmail(), subject, briefing, { htmlBody: htmlBody });
  logAiBriefing(briefing, questDay);
  safeAlert('Sovereign Briefing sent to your email.');
  return briefing;
}

// ──────────────────────────────────────────────────────────
// MEMORY LOG (hidden tab)
// ──────────────────────────────────────────────────────────

function logAiBriefing(text, questDay) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(AI_LOG_SHEET);
  if (!s) {
    s = ss.insertSheet(AI_LOG_SHEET);
    s.setTabColor('#6366F1');
    s.hideSheet();
    s.getRange('A1:D1').setValues([['Date', 'Quest Day', 'Briefing', 'Length']])
      .setFontWeight('bold').setBackground('#F1F5F9');
  }
  const lastRow = s.getLastRow() + 1;
  s.getRange(lastRow, 1).setValue(new Date());
  s.getRange(lastRow, 2).setValue(questDay);
  s.getRange(lastRow, 3).setValue(text);
  s.getRange(lastRow, 4).setValue(text.length);
}

// ──────────────────────────────────────────────────────────
// DEBUG
// ──────────────────────────────────────────────────────────

function debugGemini() {
  const result = callGemini('Reply with exactly: PONG', 100);
  if (result.error) safeAlert('Gemini error: ' + result.error);
  else safeAlert('Gemini connected. Response: ' + result.text);
}

// ──────────────────────────────────────────────────────────
// TRIGGER INSTALLER
// ──────────────────────────────────────────────────────────

function installAIBriefingTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sendSovereignBriefing') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendSovereignBriefing').timeBased().atHour(13).everyDays(1).create();
  safeAlert('Daily Sovereign Briefing scheduled for 1:00 PM PKT to your Gmail.');
}
