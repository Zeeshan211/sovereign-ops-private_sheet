
// ════════════════════════════════════════════════════════════════════
// 📜 Isnad.gs — DATA-DRIVEN MDCF LIFE CHAIN ENGINE v2.0
// LOCKED · 5-Test Audited · Full Rewrite (mentor voice fine-tune)
//
// CHANGES FROM v1.0:
//   - NAQD_PROMPT rewritten as wise muhaddith who knows him personally
//   - Acknowledges contradictions (engineer + trapped man) in dimension grading
//   - Output adds THE PATTERN and THE MIRROR sections (specific scripture)
//   - Tone aligned with AI.gs SOVEREIGN_PROMPT (Dr. Israr Ahmad style)
//
// CORE PRINCIPLE (operator's insight):
// "Numbers and data do not lie but I can."
// This engine grades using ONLY objective sheet data. No self-report.
//
// STANDALONE: Depends on Code.gs + AI.gs + Telegram.gs (all saved)
// SIDE-EFFECTS: DocumentProperties only. Owns ONLY 'autoPromptNaqd' trigger.
// RE-RUN SAFE: Stateless. No mid-flow state machine.
//
// COMMANDS (already wired in Telegram.gs via typeof guards):
//   /naqd /naqad /naqdreset /verdict /isnad /chain /witness N
//
// TEST AFTER PASTE:
//   1. Function dropdown → "startBotPolling" (Telegram.gs) → ▶️ Run
//   2. Wait 60 sec, then Telegram → /naqd → verdict in mentor voice
// ════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────
// MDCF GRADING SCALE (mirrors hadith verification grades)
// ──────────────────────────────────────────────────────────

const ISNAD_GRADES = {
  GOLD:        { icon: '🟡', score: 5, name: 'GOLD',        meaning: 'Sahih Sovereign — character in full integrity' },
  RELIABLE:    { icon: '🟢', score: 4, name: 'RELIABLE',    meaning: 'Hasan — solid day, minor gaps' },
  DISPUTED:    { icon: '🟠', score: 3, name: 'DISPUTED',    meaning: 'Da\'if Hasan — mixed signals, requires review' },
  UNRELIABLE:  { icon: '🔴', score: 2, name: 'UNRELIABLE',  meaning: 'Da\'if — chain weak, intentions compromised' },
  FABRICATED:  { icon: '⚫', score: 1, name: 'FABRICATED',  meaning: 'Mawdu\' — day fabricated against your own values' }
};


// ──────────────────────────────────────────────────────────
// THE NAQD PROMPT (v2.0 — wise muhaddith who knows Abu Walah)
// ──────────────────────────────────────────────────────────

const NAQD_PROMPT = [
  "You are the NAQD ENGINE for Abu Walah (Muhammad Zeeshan Nasir).",
  "You are a wise muhaddith who has known him for years. You apply MDCF",
  "(Multi-Dimensional Chain Forensics) — the same Islamic forensic methodology",
  "he himself developed and applied to Bukhari and Muslim — to evaluate his",
  "daily actions as if he were a rawi being assessed for inclusion in a chain.",
  "",
  "═══ FORENSIC PRINCIPLE (NEVER VIOLATE) ═══",
  "He has explicitly stated: 'Numbers and data do not lie but I can.'",
  "Therefore this naqd is based on OBJECTIVE DATA from his tracking sheets.",
  "You do NOT ask him to grade himself. You read the evidence and rule.",
  "Tadlis (concealment) cannot survive forensic data.",
  "",
  "═══ WHO HE IS (the texture) ═══",
  "He is a contradiction held together by intention.",
  "Engineer who builds at 4 AM. Man who can lose to scroll the same morning.",
  "Both are the same rawi. Grade BOTH honestly — never just one.",
  "Night shift 4PM-1AM. Idle time = his named trap. 3 AM = perfectionism spiral.",
  "Built MDCF, TARTEEL, QADR, GEAF, RVP. Loves Ahl al-Bayt without sectarianism.",
  "Influenced by Engineer Mirza, Dr. Israr Ahmad, Syed Jawad Naqvi.",
  "Values direct accountability. NEVER pad. NEVER patronize. NEVER lecture.",
  "",
  "═══ THE 5 DIMENSIONS — INFER FROM DATA ═══",
  "",
  "1. NIYYAH INTEGRITY — Inferred from action consistency.",
  "   Does logged behavior match his stated 5-pillar values?",
  "   Fajr@Masjid streak proves consistent intention. Missed Dhuhr post-12:30 PM",
  "   without context = niyyah weakening. Look for the gap between word and action.",
  "",
  "2. AMAL CONSISTENCY — Scored from quantitative completion.",
  "   Habits done today / 16. Compare to 7-day average. Above average = strong amal.",
  "   Below average without circumstance (low sleep/mood) = amal weak.",
  "",
  "3. ATHAR ON OTHERS — Inferred from family/community signals.",
  "   Habit One status (purity = athar on his future wife and sons).",
  "   Sadaqah transactions. Debt payments (athar on creditors who carry his weight).",
  "",
  "4. SABR UNDER PRESSURE — Inferred from streak resilience.",
  "   Did habits HOLD despite low mood/sleep dips? Strong sabr.",
  "   Did everything collapse on a hard day? Sabr weak — but be merciful here:",
  "   exhaustion is not weakness, it's reality. Read the pattern, not one bad day.",
  "",
  "5. SHUKR EXPRESSION — Inferred from dhikr-adjacent habits.",
  "   Fajr@Masjid streak (consistent gratitude in action). Journaling. Quran reading.",
  "   Activity in DEEN pillar = shukr present.",
  "",
  "═══ GRADING SCALE (apply HONESTLY based on data) ═══",
  "GOLD       — All 5 dimensions strong on the evidence",
  "RELIABLE   — 4/5 strong, 1 minor data gap",
  "DISPUTED   — 3/5 strong, mixed signals in the data",
  "UNRELIABLE — 2/5 strong, data shows compromised execution",
  "FABRICATED — 0-1/5 strong, data shows day was lived against his stated values",
  "",
  "═══ EVALUATION RULES ═══",
  "- Be FORENSIC, not flattering. A bad day graded GOLD = useless to him.",
  "- Cite SPECIFIC numbers from the data in EVERY dimension assessment.",
  "- Use MDCF terminology naturally (isnad, rawi, tadlis, da'if, sahih, mawdu', niyyah).",
  "- Address him as 'Abu Walah' once or twice when the moment is heavy.",
  "- Time-aware: don't penalize prayers that haven't happened yet by current hour.",
  "- Day 1 / sparse data: lean on 7-day trends and MTD streaks.",
  "- Weight dimensions: NIYYAH > AMAL > ATHAR > SABR > SHUKR.",
  "- Have rahmah even in firmness — hardness without mercy is not the Sunnah.",
  "",
  "═══ OUTPUT STRUCTURE (FOLLOW EXACTLY) ═══",
  "",
  "VERDICT: [GRADE_NAME — must be GOLD, RELIABLE, DISPUTED, UNRELIABLE, or FABRICATED]",
  "",
  "THE 5 DIMENSIONS:",
  "Niyyah: [strong/weak + 1 line citing specific data]",
  "Amal: [strong/weak + 1 line citing specific data]",
  "Athar: [strong/weak + 1 line citing specific data]",
  "Sabr: [strong/weak + 1 line citing specific data]",
  "Shukr: [strong/weak + 1 line citing specific data]",
  "",
  "THE PATTERN:",
  "[1-2 sentences. What the data reveals that he might be hiding from himself today.",
  "Tadlis-on-self if visible. Acknowledge if today shows the contradiction —",
  "engineer building strong AND trapped man losing in the same data.]",
  "",
  "THE MIRROR:",
  "[A SPECIFIC Quran ayah (with surah:ayah) or hadith (with source like Sahih Muslim X)",
  "that mirrors his EXACT situation today. Not generic. The verse must reflect what",
  "his data shows TODAY.]",
  "",
  "TOMORROW'S CHAIN:",
  "[ONE specific instruction or invitation to make tomorrow's link stronger.",
  "Frame as invitation not command when possible. Specific to today's gap.]",
  "",
  "FOR YOUR ISNAD:",
  "[1 sentence written AS IF his future descendant — his unborn son or grandson —",
  "is reading this day in his life chain in 2070. What does this day say to them?]",
  "",
  "═══ FORMATTING ═══",
  "- Total length: 250-350 words MAX",
  "- No greetings, no signoffs, no meta commentary",
  "- No padding. No 'great job!'. No corporate coaching.",
  "- The forensic report a wise muhaddith would write — firm, fatherly, with rahmah."
].join('\n');


// ──────────────────────────────────────────────────────────
// COMMAND: /naqd — Forensic evaluation from data only
// ──────────────────────────────────────────────────────────

function cmdNaqd() {
  const props = PropertiesService.getDocumentProperties();
  const today = new Date();
  const todayKey = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  const existing = JSON.parse(props.getProperty('naqd_' + todayKey) || 'null');
  if (existing && existing.completed) {
    sendTelegram(
      '📜 *Naqd already complete for today*\n\n' +
      'Verdict: ' + ISNAD_GRADES[existing.grade].icon + ' *' + existing.grade + '*\n\n' +
      'Type `/verdict` for full report.\n' +
      'Type `/naqdreset` to redo.'
    );
    return;
  }
  
  sendTelegram(
    '📜 *NIGHTLY NAQD — Day ' + getQuestDay() + ' of 90*\n' +
    '_Forensic evaluation in progress..._\n\n' +
    '━━━━━━━━━━━━━━━━━\n\n' +
    '🧠 _Reading your tracking data:_\n' +
    '_habits · salah · weight · sleep · study · debt · KPIs_\n\n' +
    '🔍 _Applying MDCF 5-dimensional grade..._\n\n' +
    '_Numbers don\'t lie. Verdict in 15-20 sec._'
  );
  
  evaluateNaqdFromData(todayKey);
}


// ──────────────────────────────────────────────────────────
// CORE EVALUATION ENGINE — pure data → MDCF verdict
// ──────────────────────────────────────────────────────────

function evaluateNaqdFromData(todayKey) {
  const props = PropertiesService.getDocumentProperties();
  const context = buildSovereignContext();
  const questDay = getQuestDay();
  
  const fullPrompt = 
    NAQD_PROMPT + '\n\n' +
    "═══ ABU WALAH'S OBJECTIVE DATA (Day " + questDay + ") ═══\n" +
    context + '\n\n' +
    "═══ FORENSIC TASK ═══\n" +
    "Grade this day using ONLY the data above. No self-report exists.\n" +
    "You are the muhaddith. The data is the witness. Rule honestly with rahmah.\n" +
    "Cite specific numbers in every dimension. Be the chain's gatekeeper.\n" +
    "Find the SPECIFIC Quran ayah or hadith that mirrors today's truth.";
  
  const result = callGemini(fullPrompt, 3000);
  
  if (result.error) {
    sendTelegramPlain(
      '⚠️ Naqd evaluation failed: ' + result.error + 
      '\n\nRetry: type /naqd again in a moment.'
    );
    return;
  }
  
  const verdict = result.text;
  
  // Defensive grade extraction (multiple format tolerance)
  let grade = 'DISPUTED';
  const upperVerdict = verdict.toUpperCase();
  Object.keys(ISNAD_GRADES).forEach(g => {
    if (upperVerdict.indexOf('VERDICT: ' + g) !== -1 || 
        upperVerdict.indexOf('VERDICT:' + g) !== -1 ||
        upperVerdict.indexOf('VERDICT:**' + g) !== -1 ||
        upperVerdict.indexOf('VERDICT:** ' + g) !== -1) {
      grade = g;
    }
  });
  
  const isnadEntry = {
    date: todayKey,
    questDay: questDay,
    method: 'data-only-mentor-voice',
    verdict: verdict,
    grade: grade,
    timestamp: new Date().toISOString(),
    completed: true
  };
  
  props.setProperty('naqd_' + todayKey, JSON.stringify(isnadEntry));
  
  const chainIndex = JSON.parse(props.getProperty('isnad_chain') || '[]');
  const filtered = chainIndex.filter(e => e.date !== todayKey);
  filtered.push({ date: todayKey, questDay: questDay, grade: grade });
  filtered.sort((a, b) => a.date.localeCompare(b.date));
  props.setProperty('isnad_chain', JSON.stringify(filtered));
  
  const g = ISNAD_GRADES[grade];
  sendTelegramPlain(
    '📜 NAQD COMPLETE — Day ' + questDay + ' of 90\n' +
    '━━━━━━━━━━━━━━━━━\n\n' +
    g.icon + ' VERDICT: ' + g.name + '\n' +
    '"' + g.meaning + '"\n\n' +
    '━━━━━━━━━━━━━━━━━\n\n' +
    verdict +
    '\n\n━━━━━━━━━━━━━━━━━\n' +
    'Bismillah · Numbers don\'t lie. This day is now a link in your isnad.\n' +
    'Type /isnad to see your chain.'
  );
}


// ──────────────────────────────────────────────────────────
// HANDLER: ALWAYS returns false (data-only flow has no question stage)
// ──────────────────────────────────────────────────────────

function handleNaqdAnswer(text) {
  return false;
}


// ──────────────────────────────────────────────────────────
// COMMAND: /naqdreset
// ──────────────────────────────────────────────────────────

function cmdNaqdReset() {
  const props = PropertiesService.getDocumentProperties();
  const todayKey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  props.deleteProperty('naqd_' + todayKey);
  
  const chain = JSON.parse(props.getProperty('isnad_chain') || '[]');
  const filtered = chain.filter(e => e.date !== todayKey);
  props.setProperty('isnad_chain', JSON.stringify(filtered));
  
  sendTelegram('🔄 Today\'s naqd reset. Type `/naqd` to re-evaluate.');
}


// ──────────────────────────────────────────────────────────
// COMMAND: /verdict
// ──────────────────────────────────────────────────────────

function cmdVerdict() {
  const props = PropertiesService.getDocumentProperties();
  const todayKey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const entry = JSON.parse(props.getProperty('naqd_' + todayKey) || 'null');
  
  if (!entry || !entry.completed) {
    sendTelegram('📜 No naqd completed for today yet. Type `/naqd` to begin.');
    return;
  }
  
  const g = ISNAD_GRADES[entry.grade];
  sendTelegramPlain(
    '📜 TODAY\'S VERDICT — Day ' + entry.questDay + ' of 90\n' +
    '━━━━━━━━━━━━━━━━━\n\n' +
    g.icon + ' ' + g.name + '\n' +
    '"' + g.meaning + '"\n\n' +
    '━━━━━━━━━━━━━━━━━\n\n' +
    entry.verdict
  );
}


// ──────────────────────────────────────────────────────────
// COMMAND: /isnad
// ──────────────────────────────────────────────────────────

function cmdIsnad() {
  const props = PropertiesService.getDocumentProperties();
  const chain = JSON.parse(props.getProperty('isnad_chain') || '[]');
  
  if (chain.length === 0) {
    sendTelegram(
      '📜 *YOUR ISNAD IS EMPTY*\n\n' +
      'No days verified yet. Type `/naqd` to forge your first link.\n\n' +
      '_The chain begins with one verified day._'
    );
    return;
  }
  
  const recent = chain.slice(-7);
  let msg = '📜 *YOUR ISNAD — last ' + recent.length + ' verified days*\n';
  msg += '_Day ' + getQuestDay() + ' of 90 · ' + chain.length + ' links forged_\n\n';
  msg += '━━━━━━━━━━━━━━━━━\n\n';
  
  recent.forEach(entry => {
    const g = ISNAD_GRADES[entry.grade];
    const dateShort = entry.date.substring(5);
    msg += g.icon + ' Day ' + entry.questDay + ' (' + dateShort + ') — *' + entry.grade + '*\n';
  });
  
  msg += '\n━━━━━━━━━━━━━━━━━\n';
  msg += '_Read top-to-bottom by your future descendants._\n';
  msg += '_Type `/chain` for integrity score._\n';
  msg += '_Type `/witness 5` to read Day 5\'s full naqd._';
  
  sendTelegram(msg);
}


// ──────────────────────────────────────────────────────────
// COMMAND: /chain
// ──────────────────────────────────────────────────────────

function cmdChain() {
  const props = PropertiesService.getDocumentProperties();
  const chain = JSON.parse(props.getProperty('isnad_chain') || '[]');
  
  if (chain.length === 0) {
    sendTelegram('📜 No chain forged yet. Type `/naqd` to begin.');
    return;
  }
  
  const counts = { GOLD: 0, RELIABLE: 0, DISPUTED: 0, UNRELIABLE: 0, FABRICATED: 0 };
  let totalScore = 0;
  chain.forEach(e => {
    counts[e.grade]++;
    totalScore += ISNAD_GRADES[e.grade].score;
  });
  
  const avgScore = (totalScore / chain.length).toFixed(2);
  const maxScore = chain.length * 5;
  const integrityPct = Math.round((totalScore / maxScore) * 100);
  
  let overallGrade;
  if      (avgScore >= 4.5) overallGrade = 'SAHIH (Authentic)';
  else if (avgScore >= 3.5) overallGrade = 'HASAN (Sound)';
  else if (avgScore >= 2.5) overallGrade = 'DA\'IF HASAN (Mixed)';
  else if (avgScore >= 1.5) overallGrade = 'DA\'IF (Weak)';
  else                       overallGrade = 'MAWDU\' (Fabricated)';
  
  const filled = Math.round((integrityPct / 100) * 20);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  
  sendTelegram(
    '📜 *CHAIN INTEGRITY SCORE*\n' +
    '_Day ' + getQuestDay() + ' of 90 · ' + chain.length + ' verified days_\n\n' +
    '━━━━━━━━━━━━━━━━━\n\n' +
    'Overall verdict: *' + overallGrade + '*\n' +
    'Integrity: *' + integrityPct + '%*\n' +
    bar + '\n\n' +
    'Avg score: *' + avgScore + ' / 5.00*\n\n' +
    '*BREAKDOWN:*\n' +
    '🟡 GOLD: ' + counts.GOLD + '\n' +
    '🟢 RELIABLE: ' + counts.RELIABLE + '\n' +
    '🟠 DISPUTED: ' + counts.DISPUTED + '\n' +
    '🔴 UNRELIABLE: ' + counts.UNRELIABLE + '\n' +
    '⚫ FABRICATED: ' + counts.FABRICATED + '\n\n' +
    '━━━━━━━━━━━━━━━━━\n' +
    '_This chain is what your descendants inherit._\n' +
    '_Make every link count._'
  );
}


// ──────────────────────────────────────────────────────────
// COMMAND: /witness N
// ──────────────────────────────────────────────────────────

function cmdWitness(args) {
  const dayNum = parseInt(args);
  if (!dayNum) {
    sendTelegram('⚠️ Usage: `/witness 5` (replace 5 with quest day number)');
    return;
  }
  
  const props = PropertiesService.getDocumentProperties();
  const chain = JSON.parse(props.getProperty('isnad_chain') || '[]');
  const entry = chain.find(e => e.questDay === dayNum);
  
  if (!entry) {
    sendTelegram('📜 No naqd recorded for Day ' + dayNum + ' yet.');
    return;
  }
  
  const fullEntry = JSON.parse(props.getProperty('naqd_' + entry.date) || 'null');
  if (!fullEntry) {
    sendTelegram('📜 Day ' + dayNum + ' chain entry exists but full record missing.');
    return;
  }
  
  const g = ISNAD_GRADES[fullEntry.grade];
  sendTelegramPlain(
    '📜 WITNESS — Day ' + dayNum + ' (' + entry.date + ')\n' +
    '━━━━━━━━━━━━━━━━━\n\n' +
    g.icon + ' Verdict: ' + g.name + '\n\n' +
    '━━━━━━━━━━━━━━━━━\n\n' +
    fullEntry.verdict
  );
}


// ──────────────────────────────────────────────────────────
// AUTO-PROMPT TRIGGER (11 PM nightly call)
// ──────────────────────────────────────────────────────────

function autoPromptNaqd() {
  const props = PropertiesService.getDocumentProperties();
  const todayKey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const existing = JSON.parse(props.getProperty('naqd_' + todayKey) || 'null');
  
  if (existing && existing.completed) return;
  
  sendTelegram(
    '🌙 *NIGHTLY NAQD CALL — 11 PM*\n\n' +
    'Day ' + getQuestDay() + ' is closing.\n' +
    'Before sleep, forge today\'s link in your isnad.\n\n' +
    'Type `/naqd` to run forensic evaluation on today\'s data.\n\n' +
    '_Numbers don\'t lie. The chain doesn\'t wait. Neither should you._'
  );
}


// ──────────────────────────────────────────────────────────
// TRIGGER INSTALLER
// ──────────────────────────────────────────────────────────

function installNaqdTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'autoPromptNaqd') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('autoPromptNaqd').timeBased().atHour(23).everyDays(1).create();
  safeAlert('✅ Nightly Naqd auto-prompt scheduled for 11 PM PKT.');
}
