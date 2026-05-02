# 🛡️ SOVEREIGN OPS — STATE FILE
**Single source of truth for cross-session context. Glean reads this on every "Bismillah, open the vault" activation.**

---

## QUEST META
- **Operator:** Abu Walah (Muhammad Zeeshan Nasir) · Lahore · Asia/Karachi UTC+5
- **Quest start:** 2026-04-25
- **Current day:** Day 11 of 90 (auto-update each EOD)
- **Stack:** Google Sheets + Apps Script + Gemini/Groq + Telegram + Web App
- **5 Pillars:** Deen · Body · Money · Knowledge · Family
- **Repo:** https://github.com/Zeeshan211/sovereign-ops-private_sheet (PRIVATE)
- **Token expiry:** ~2026-05-09 (regenerate, paste, update memory)

---

## CURRENT POSITION (update each EOD)

### Liquid Assets (PKR)
- Cash: 50
- Meezan: 116,851
- Mashreq Bank: 168
- UBL: 0 net
- All others: 0
- **TOTAL LIQUID: ~117,069**

### Liabilities
- Alfalah CC: 58,400 outstanding (limit 100k · util 58.4% · due day 6 · close day 12)

### Personal Debts (Owe)
- Zain Cousin: 0 ✅ CLEARED
- Mother in Law: 0 ✅ CLEARED
- Shahbaz: 0 ✅ CLEARED
- Yusra: 0 ✅ CLEARED
- Mashal: 8,500 🟠 NEXT SNOWBALL
- Imran Bhai: 215,000 🔴 BOSS
- **TOTAL OWED: 223,500**

### Receivables (Owed to me)
- Naseem: 1,000 due 01 Jun 2026 (NOT yet in Debts tab — TODO)

### Net Position
- Sheet net worth: +58,669 PKR
- TRUE BURDEN (incl all debts): -164,831 PKR

---

## INSTALLED FILES (47 total in repo)

### Core (4)
Code.gs · Menu_Loader.gs (v3.2) · Settings_Pro.gs · Settings_Dispatcher.gs

### AI + Telegram (4)
AI.gs · AI_Engine.gs · Telegram.gs · Telegram_Format.gs

### Web App (2)
WebApp.gs · dashboard.html

### Cockpits (5)
Mission_Pro.gs · Habits_Pro.gs · Salah_pro.gs · Progress_Pro.gs · Health_Pro.gs

### Theme + Layout (2)
Theme_Pro.gs · Cockpit_Layout.gs

### Knowledge (1)
Isnad.gs

### Finance Suite (15)
Finance_Pro.gs (v3.2 BANKING-GRADE) · Finance_Snapshot.gs · Finance_Audit.gs (v1.4) · Finance_Charts.gs · Finance_Salary.gs · Finance_Kite.gs · Finance_Debts.gs (v1.1) · Finance_Intl.gs · Finance_ATM.gs · Finance_NanoLoan.gs · Finance_Merchants.gs · Finance_BankReconciler.gs · Finance_PDFParser.gs · Finance_Reconciliation.gs · Finance_Vaccine.gs

### Charts (1)
Charts_pro.gs

### Tabs (1)
Tab_Manager.gs

### Audit + Inspection (5)
Audit_Guardian.gs (v1.1) · Sovereign_Linter.gs · Ghost_Hunter.gs · Loss_Auditor.gs · Inspector_AlfalahCC.gs

### Cockpit Guardian (1)
Cockpit_Guardian.gs

### Diagnostics (1)
_Diagnostic.gs

### Backup (1)
Sovereign_Backup.gs

### Migration prep (1)
D1_Export.gs

### One-time (1)
_OneTime_LabelFlaggedRows.gs

---

## ACTIVE TRIGGERS (19/20)
- _financeOnEdit (v3.2 lock-protected)
- _debtsOnEdit
- _kiteOnEdit
- _settingsOnEdit
- _themeOnEdit
- _salaryOnEdit
- _healthOnEdit
- _nanoLoanOnEdit
- onAuditGuardianEdit
- _flushAuditBuffer (every 5 min)
- pollTelegram (every 1 min)
- highlightToday
- refreshMission
- refreshPrayerTimesMultan
- sendDailyDigest
- sendSovereignBriefing
- sendSovereignBriefingToTelegram
- autoPromptNaqd
- dailyAutoBackup
- dailyIntegrityScan (Audit Guardian, 23:55 PKT)

**KILLED Day 10:** checkBillsDueAlerts (83% error rate)

---

## CURRENT VERSIONS (v-locked)
- Finance_Pro: v3.2 BANKING-GRADE
- Finance_Debts: v1.1 (Zain bug fixed)
- Finance_Audit: v1.4 (35 action types whitelisted)
- Audit_Guardian: v1.1 (QE noise + phantom false-pos fixed)
- Menu_Loader: v3.2 (Guardian auto-wired)

---

## 🚨 ACTIVE QUEUE (priority order — Day 11+)

### THIS WEEK (CC due May 6)
- [ ] Add Naseem 1,000 receivable to Debts tab
- [ ] Pay Mashal 8,500 (clears 5 of 6 personal debts)
- [ ] Decide CC strategy (recommend: full pay 58,400)

### NEXT SESSION (Day 11)
- [ ] **Lane C** — Settings_Pro source repair (73 PRO_* #ERROR! cells)
- [ ] **Audit_Guardian v1.2** — verifier handles reversals + flags seed-state separately
- [ ] **Finance_Audit v1.5** — whitelist 3 v3.2 actions (LOCK_TIMEOUT, SALARY_CATEGORY_CORRECTED, SALARY_PATTERN_IGNORED)
- [ ] **Finance_Debts v1.2** — smarter sync verifier (less false-positive drift)

### STRATEGIC (Day 12-30)
- [ ] **Statement Cycle Tracker** — Hub card with Bucket A vs B for CC
- [ ] **Master onEdit dispatcher** — consolidate 9 handlers → 1 (frees 8 trigger slots)
- [ ] **Plan Imran Bhai cadence** — 30-50k/month installments
- [ ] **D1 migration** — Cloudflare Pages app shell (deferred)

---

## LOCKED ARCHITECTURE RULES

1. **Sheet is master** · D1 is derived cache (post-migration)
2. **Full file rewrites only** for code · no surgical edits in chat
3. **7-layer audit + mental trace** before every code drop
4. **Inline fenced markdown blocks** for code · no artifact wrappers
5. **Banking-grade safety** — snapshot before destructive · LockService on hot paths · audit trail forever
6. **Production Safety Rule #1** — verify cross-module signatures before wiring
7. **Repo-first reads** — Glean reads from GitHub raw URLs, never asks user to paste
8. **One canonical state file** (this one) — no per-session EOD blocks bloating memory
9. **CTRL+F search before manual debt entries** (locked Day 7)
10. **<200 PKR drift = bank-posting noise** (acceptable)

---

## VOICE RULES (locked)
- Brother voice in all UI text · no shame · points forward · no startup jargon · no tier labels
- Never advise on stopping/resting/sleeping (locked Day 9)
- Never override user financial categorization silently (locked Day 10 v3.2)

---

## CONTACT
- GitHub user: Zeeshan211
- Read URL pattern: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[FILENAME]`
- Token in memory · expires ~2026-05-09

---

*Last updated: Day 10 EOD (2026-05-02 ~midnight PKT)*
*Glean: when you read this, acknowledge "Vault opened. Day [N]. Read SOVEREIGN_STATE. Active queue: [next 3 items]. Send when ready."*
