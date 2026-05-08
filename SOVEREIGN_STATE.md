# SOVEREIGN_STATE.md

## 2026-05-08 Closeout — Life OS Shell Expansion

Status: Life OS Shell phase started after Finance Core build arc.
Last updated: 2026-05-08  
Project: Sovereign Life OS  
Current mode: Finance Core built; Life OS shell expansion started  
State source: reconstructed after accidental deletion  
Status honesty: Functionally built where marked live; not final-audit certified unless explicitly stated.

---

## 1. Current Project Standing

Sovereign Ops has moved from a Finance-only app into the beginning of a broader Sovereign Life OS.

Finance is the first live cockpit.

Life OS shell has started so Finance, Salah, Habits, Mission, and AI can exist as separate domains without contaminating each other.

Current high-level status:

- Finance Core: functionally built and live
- Final Finance audit certification: pending
- Life OS root Command Centre: live
- Salah Cockpit Shell: live
- Habits Cockpit Shell: prepared/pending live confirmation unless separately deployed
- Mission Cockpit Shell: prepared/pending live confirmation unless separately deployed
- AI Curator Shell: prepared/pending live confirmation unless separately deployed
- Real Salah data export: not started
- Real Habits data export: not started
- Mission data export: not started
- AI Curator live decision queue: not started
- Telegram relay: not started

---

## 2. Governance / Operating Rules

### GitHub access

- Glean must not ask the operator to connect GitHub App, GitHub integration, or Code Writer to personal repos.
- Use session-only read-only PAT when repo reads are needed.
- Never store or echo PAT.
- Never write directly to personal GitHub.
- Deliver manual copy-paste instructions only:
  - exact edit/create URL
  - full-file rewrite
  - commit message
  - deploy wait
  - verify URL
  - acceptance checklist

### Coding delivery rule

- Sovereign Ops code/state/file changes must be full-file rewrites only.
- No surgical snippets for code files.
- For known safe data-state corrections, guarded SQL may be used only when code does not need to change.
- No sandbox download files unless explicitly requested.

### Ship governance

- Normal Mode: max 8 ships.
- Production Deadline Mode must be explicitly activated before expanding ship scope.
- Emergency Repair Mode only for live blocking/corrupting issues.
- Read-only audit/planning/diagnosis does not count as code ship.
- State closeout must be saved after major progress.

### No fake data rule

- Do not show fake live data for domains not exported yet.
- Placeholder shell text is allowed only when clearly labeled as not connected.
- AI must not invent state.
- Telegram relay must eventually send only curated messages from real data.

---

## 3. Finance Core Build Arc — Completed This Session

Status: Functionally built, live, pending final audit certification.

Completed ships:

1. `/api/forecast v0.2.0` — live
2. `forecast.html v0.2.0` — live
3. `/api/safety v0.2.0` — live
4. `forecast.html v0.3.0` Safety display — live
5. `/api/insights v0.3.0` — live
6. `insights.html v0.4.0` — live
7. `/api/monthly-close v0.1.0` — live
8. `monthly-close.html v0.1.0` — live

Finance brain standing:

- Forecast brain: live
- Safety brain: live
- Insights brain: live
- Monthly Close brain: live
- Core Finance: functionally built
- Final audit certification: not complete yet

---

## 4. Finance Known Audit-Hardening Items

These must be fixed before calling Finance 100% audit-certified.

1. `/api/forecast` still hard-codes `payslip_2026_04`.
   - Needs config-driven `active_payslip_id`.
   - Salary forecast must not remain fixed to April payslip forever.

2. Forecast bill paid-cycle logic can skip next-month obligations.
   - Current logic can treat a bill as paid because it was paid in current month.
   - Needs due-cycle-aware paid logic.

3. `/api/monthly-close` reconciliation scope is too narrow.
   - Current reconciliation freshness may use month-window transactions.
   - Final audit should use full-ledger transaction truth for stale declaration checks.

4. Navigation/Hub alignment was in progress.
   - Finance brain pages exist.
   - Life OS shell now owns root.
   - Confirm shared navigation still matches current route model.

5. State file was accidentally deleted and reconstructed.
   - This file is the restored durable state.

Finance status wording:

- Finance is functionally built.
- Finance is not final-audit certified.
- Next Finance work should be audit-hardening and UI consistency, not new Finance feature expansion.

---

## 5. Finance Current Route Model

Finance live-data routes:

- `/forecast.html`
- `/insights.html`
- `/monthly-close.html`
- `/api/forecast`
- `/api/safety`
- `/api/insights`
- `/api/monthly-close`

Other Finance routes still part of cockpit:

- `/transactions.html`
- `/accounts.html`
- `/bills.html`
- `/debts.html`
- `/cc.html`
- `/salary.html`
- `/reconciliation.html`
- `/atm.html`
- `/nano-loans.html`
- `/audit.html`
- `/snapshots.html`
- `/charts.html`
- `/budgets.html`
- `/goals.html`

---

## 6. Life OS Expansion Plan

Status: Started after Finance Core build arc.

Core architecture decision:

- Finance remains isolated as its own cockpit.
- Salah, Habits, Mission, Health, Knowledge, and AI must not be mixed into Finance UI.
- Main Command Centre sits above all domains and shows only summary/action state.
- Each domain keeps its own route, schema, API, UI identity, and logic.
- AI Curator reads across domain summaries and creates decision/briefing output.
- Telegram Bot relays only curated AI messages, not raw noisy data.

Domain route model:

Completed / prepared this phase:

1. Root Life OS Command Centre created at `/`.
2. Finance remains isolated as its own live-data cockpit.
3. Salah Cockpit Shell created at `/salah.html`.
4. Habits Cockpit Shell prepared at `/habits.html`.
5. Mission Cockpit Shell prepared at `/mission.html`.
6. AI Curator Shell prepared at `/ai.html`.
7. Command Centre link alignment v0.1.2 prepared to link Finance, Salah, Habits, Mission, and AI from root.

Domain separation contract:

- Finance must not show Salah logs, Habit logs, or Mission internals.
- Salah must not show balances, bills, debts, salary, Credit Card, reconciliation, or Finance widgets.
- Habits must not show finance data or Salah recovery logic.
- Mission may show direction and priorities but must not expose raw private domain tables.
- AI Curator reads domain summaries only and must not invent live state.
- Telegram relay remains future work and should send only curated messages.

Current route model:

- `/` = Main Command Centre
- `/forecast.html`, `/insights.html`, `/monthly-close.html` = Finance brain pages
- `/salah.html` = Salah shell
- `/habits.html` = Habits shell
- `/mission.html` = Mission shell
- `/ai.html` = AI Curator shell

Future route model may later move Finance under `/finance`, but current production-compatible model keeps existing Finance pages.

---

## 7. Life OS Shell Progress

Completed / confirmed:

1. Root Life OS Command Centre created at `/`.
2. Finance remains isolated as its own live-data cockpit.
3. Salah Cockpit Shell created at `/salah.html`.
4. Salah shell confirmed live.
5. Life OS root confirmed live.

Prepared / pending confirmation unless deployed separately:

1. Habits Cockpit Shell at `/habits.html`.
2. Mission Cockpit Shell at `/mission.html`.
3. AI Curator Shell at `/ai.html`.
4. Command Centre Link Alignment v0.1.2 to link:
   - Finance
   - Salah
   - Habits
   - Mission
   - AI

Current data status:

- Finance: live-data backed.
- Salah: shell only, no live prayer data yet.
- Habits: shell only, no live habit data yet.
- Mission: shell only, no live mission data yet.
- AI: shell only, no live decision queue yet.

Next build queue:

1. Finish/verify Command Centre Link Alignment v0.1.2.
2. Start Salah Export Layer 2A.
3. Build `/api/salah/today`.
4. Build `/api/salah/insights`.
5. Wire `salah.html` to real Salah API data.
6. Start Habits Export Layer 3A after Salah foundation is stable.

---

## 8. Domain Separation Contract

This contract is locked for Life OS.

### Main Command Centre

Allowed:

- Domain summary cards
- What Needs Action
- Today Timeline
- Decision Queue
- Quick Actions
- High-level status only

Not allowed:

- Full finance ledger table
- Full Salah history
- Full habit logs
- Raw private mission tables
- Fake AI decisions

### Finance

Allowed:

- Money
- Forecast
- Safety
- Insights
- Monthly close
- Accounts
- Transactions
- Bills
- Debts
- Credit Card
- Reconciliation

Not allowed:

- Salah logs
- Habit logs
- Mission internals
- Spiritual/religious tracking widgets

### Salah

Allowed:

- Today prayer status
- Prayer timeline
- Missed/Qaza recovery
- Streaks
- Weekly reflection
- Salah insights

Not allowed:

- Balances
- Bills
- Debts
- Salary
- Credit Card
- Reconciliation
- Finance widgets
- Fake prayer status

### Habits

Allowed:

- Daily checklist
- Momentum
- Weak habits
- Strong habits
- Recovery suggestions
- Workday/off-day pattern

Not allowed:

- Finance data
- Salah recovery logic
- Fake completion scores

### Mission

Allowed:

- Current priority
- Active project
- Next milestone
- Blockers
- Weekly direction
- Roadmap

Not allowed:

- Raw private domain tables
- Full ledger exposure
- Fake roadmap status

### AI Curator

Allowed:

- Read domain summaries
- Produce briefings
- Produce decision queue
- Prepare Telegram-ready curated messages

Not allowed:

- Invent live state
- Direct mutation first
- Raw unrestricted private table reading by default
- Noisy Telegram relay

---

## 9. Recommended Build Layers

### Layer 1 — Life OS Shell / Main Command Centre

Status: started/live.

Scope:

- Main Command Centre
- Domain cards
- Separate nav sections
- Finance remains accessible
- Salah/Habits/Mission/AI shells visible but not fake-live

### Layer 2 — Salah Export

Status: next real data layer.

Scope:

- D1 schema for Salah logs/status/recovery
- `/api/salah/today`
- `/api/salah/insights`
- `salah.html` live data wiring
- Calm separate design
- No finance widgets
- No fake prayer data

### Layer 3 — Habits Export

Status: after Salah foundation.

Scope:

- D1 schema for habit definitions/logs/daily status
- `/api/habits/today`
- `/api/habits/insights`
- `habits.html` live data wiring
- Workday/off-day pattern support
- No finance contamination

### Layer 4 — Mission Export

Status: planned.

Scope:

- Mission/project/milestone schema or API
- `/api/mission/status`
- `mission.html` live data wiring
- Direction and roadmap layer

### Layer 5 — AI Curator

Status: planned after at least Finance + Salah + Habits have real APIs.

Scope:

- `/api/ai/briefing`
- `/api/ai/decision-queue`
- Reads Finance + Salah + Habits + Mission summaries
- Produces curated decisions, not generic advice

### Layer 6 — Telegram Relay

Status: future.

Scope:

- `/api/telegram/relay`
- relay log
- daily briefing
- prayer recovery prompt
- habit nudges
- finance alerts
- decision prompts
- send only curated messages

---

## 10. Next Build Queue

Immediate next queue:

1. Verify Command Centre Link Alignment v0.1.2 if deployed.
2. Verify `/habits.html`, `/mission.html`, `/ai.html` if deployed.
3. State closeout after verification.
4. Start Salah Export Layer 2A.

Salah Export Layer 2A target:

- Create D1 schema for Salah logs/status/recovery.
- Preserve separation from Finance.
- No fake prayer data.
- No finance contamination.
- No ledger or finance formula changes.

Governance note:

- No direct GitHub write access.
- Use session-only PAT reads when needed.
- Deliver manual full-file rewrites only.
- Provide exact edit URLs, commit messages, deploy wait, and verification steps.

Suggested Salah tables:

- `salah_logs`
- `salah_daily_status`
- `salah_recovery`
- `salah_insights`

Suggested Salah APIs:

- `/api/salah/today`
- `/api/salah/insights`

Suggested Salah live UI sections:

- Today’s Prayers
- Recovery Lane
- Weak Prayer Pattern
- Streaks
- Weekly Reflection
- Source freshness
- AI summary later

---

## 11. Finance Next Audit Queue

When returning to Finance audit-hardening:

1. Forecast payslip source:
   - Replace hard-coded `payslip_2026_04` with active config-driven payslip ID.

2. Forecast bill paid-cycle:
   - Fix due-cycle paid logic so next-month obligations are not skipped.

3. Monthly Close reconciliation:
   - Use full-ledger transaction truth for stale declaration checks.
   - Consider splitting:
     - `system_audit_readiness`
     - `money_close_readiness`

4. Navigation/route consistency:
   - Ensure Life OS root and Finance pages do not fight each other.
   - Ensure all links point to live pages.

5. Final comprehensive audit:
   - API route audit
   - UI page audit
   - Formula audit
   - Reconciliation truth audit
   - Ledger mutation audit
   - Safety rule audit
   - Manual variable/scenario audit
   - Monthly Close audit readiness review
   - Broken nav/link audit
   - Final production readiness verdict

---

## 12. Recent Confirmed Live Items

Confirmed by operator:

- `/api/forecast v0.2.0` live
- `forecast.html v0.2.0` live
- `/api/safety v0.2.0` live
- Safety display live
- `/api/insights v0.3.0` live
- `insights.html v0.4.0` live
- `/api/monthly-close v0.1.0` live
- `monthly-close.html v0.1.0` live
- Life OS Shell root live
- Salah Shell live

Prepared but confirm if not yet checked:

- `habits.html`
- `mission.html`
- `ai.html`
- `index.html v0.1.2` all section links

---

## 13. Current Boot Routing — 2026-05-08

After `boot vault` passes Secure Boot, offer two active paths and wait for operator choice.

### PATH A — Finance Audit Correction / Recovery

Status: Active but partially verified. Continue from verification and recovery, not from scratch.

Current Finance state:

- Emergency D1 repair completed for `debt_yusra`.
- `/api/balances` v0.5.3 confirmed live.
- `/api/transactions` v0.1.4 confirmed live.
- Manual snapshots endpoint `/api/snapshots` v0.2.0 confirmed working.
- `snapshots.html` manual snapshot UI confirmed working.
- `transactions.html` semantic alignment confirmed working.
- `js/add.js` v0.3.3 deployed/provided to stop phantom category fallback.
- Categories table confirmed empty.
- Category schema confirmed:
  - id TEXT primary key
  - name TEXT not null
  - icon TEXT
  - type TEXT
  - parent_id TEXT
  - monthly_budget REAL default 0
  - color TEXT
  - display_order INTEGER default 0

Known Finance values from `/api/balances?debug=1`:

- Liquid cash: Rs 8,636.32
- CC outstanding: Rs 79,626.33
- Payable debt: Rs 123,500
- Receivables: Rs 18,320
- All active debt remaining: Rs 141,820 diagnostic only
- True burden: -Rs 176,170.01

Finance corrections completed:

- Debt/receivable split fixed.
- Transaction account FK guards added.
- Transaction UI semantics fixed.
- Snapshot endpoint and UI created.
- Add Transaction no longer shows fake D1 categories.

Finance items provided but still need final verification:

- `/api/debts` v0.3.1 FK guard
- `/api/cc` v0.3.1 liability semantics
- `/api/snapshots` v0.2.1 snapshot detail honesty
- `js/nav.js` v1.0.19 emoji navigation restore
- `index.html` v0.1.4 alive Finance Hub restore

Next safe Finance actions:

1. Verify live site visual recovery:
   - `https://sovereign-finance.pages.dev/`
   - Expected: emoji nav visible, alive Hub restored, balances v0.5.3 numbers correct.
2. Seed D1 categories using confirmed schema.
3. Verify Add Transaction can save Rs 159.99 Meezan transaction with category `Groceries`.
4. Verify `/api/cc` matches `/api/balances` CC outstanding.
5. Verify `/api/snapshots?id=snap-2026-05-08T10-30-13` exposes snapshot scope fields.
6. Finalize Finance audit report and update state again.

Finance hard rules:

- Do not touch Salah while in Finance path unless operator explicitly switches.
- No fake ledger smoke tests unless operator explicitly approves.
- Full-file rewrites only for code.
- Prefer guarded D1 SQL only for known data-state corrections.
- Do not bulk mutate real ledger rows casually.

---

### PATH B — Salah Today-Live Cleanup

Status: Active but not fully verified. Continue from deployed-version verification, not from scratch.

Completed:

- Salah D1 schema/table foundation created earlier.
- Bulk month export abandoned because SQL copy friction and future-row risk made it unsafe.
- Real source tab identified: `🕌 Salah`.
- Today-only D1 seed path chosen.
- D1 seed for `2026-05-08` succeeded.
- `/api/salah/log` v0.2.0 confirmed working by browser console POST.
- `/api/salah/today` v0.2.0 confirmed returning live data for `2026-05-08`.

Verified live Salah state from `/api/salah/today?day=2026-05-08`:

- Fajr: Masjid, normalized `M`, score `2`, logged_at `2026-05-08T17:03:19+05:00`
- Dhuhr: Masjid, normalized `M`, score `2`, logged_at `2026-05-08T16:59:56+05:00`
- Asr: Home, normalized `H`, score `0.5`, logged_at `2026-05-08T17:00:24+05:00`
- Maghrib: Home Udhr, normalized `HU`, score `0.8`
- Isha: Home Udhr, normalized `HU`, score `0.8`
- Jumuah: Yes, normalized `YES`, score `0.5`, logged_at `2026-05-08T16:59:42+05:00`
- API reported total score: `6.6`
- logged_count: `5`
- masjid_count: `2`
- home_count: `3`
- udhr_count: `2`
- qaza_count: `0`

Salah product correction agreed:

- Fard score must be separated from bonus prayers.
- Fard = core `/10` from five daily prayers only:
  - Fajr
  - Dhuhr
  - Asr
  - Maghrib
  - Isha
- Bonus = Jumuah, Tahajjud, Witr, Ishraq, Duha, Awwabin, Nafl.
- Qaza = recovery state.
- Udhr = attribute, not location/category.
- Charts must not double-count Udhr as a location slice.
- Bonus prayers must never inflate the main Fard `/10` score.

Provided but not confirmed deployed:

- `functions/api/salah/log.js` v0.3.0 implementing corrected Fard / Bonus / Qaza / Udhr model.
- `salah.html` v0.8.0 titled `Overflow-safe responsive cockpit`.
- `functions/api/salah/today.js` still needs read-model cleanup.

Next safe Salah actions:

1. Verify currently deployed versions:
   - `functions/api/salah/log.js`
   - `functions/api/salah/today.js`
   - `salah.html`
2. Confirm whether `log.js v0.3.0` is actually deployed.
3. If not deployed, deploy `log.js v0.3.0` full-file rewrite first.
4. Rewrite/clean `functions/api/salah/today.js` so output includes:
   - `fard_score`
   - `fard_logged_count`
   - `bonus_logged_count`
   - `qaza_count`
   - `udhr_count`
   - clean chart data where Udhr is attribute, not location
5. Verify `salah.html` has no horizontal scrollbar on operator screen.
6. Only after logic is clean, continue UI inspiration polish.

Salah hard rules:

- Do not touch Finance while in Salah path unless operator explicitly switches.
- Do not bulk-import future month rows.
- Do not fake streaks/charts.
- Full-file rewrites only for code changes.
- Today-first verification before month expansion.

---

## 14. Boot Vault Response Contract

When Secure Boot passes, respond with the two active path choices below and wait for operator choice.

### PATH A — Finance Audit Correction / Recovery

Status: Active but partially verified.

Next safe action:

- Verify live site visual recovery.
- Seed confirmed D1 categories.
- Verify Add Transaction real category save.
- Verify `/api/cc` and `/api/snapshots` corrections.

Do not touch Salah while in Finance path unless operator explicitly switches.

### PATH B — Salah Today-Live Cleanup

Status: Active but not fully verified.

Next safe action:

- Verify deployed versions for `functions/api/salah/log.js`, `functions/api/salah/today.js`, and `salah.html`.
- Finish today read-model cleanup.
- Validate UI no horizontal scrollbar.

Do not touch Finance while in Salah path unless operator explicitly switches.

---

## 15. Closeout Summary

Current truth:

- Finance Core build arc is complete.
- Finance is functional but not final-audit certified.
- Life OS shell has started correctly.
- Finance is no longer the whole website identity.
- Salah is separated.
- Habits/Mission/AI are planned as separated domains.
- Next real system expansion should be Salah data export, not more Finance-only work unless operator chooses Finance audit recovery path.

Next recommended action:

1. Save this restored state file.
2. Re-run `boot vault`.
3. Choose PATH A or PATH B.
