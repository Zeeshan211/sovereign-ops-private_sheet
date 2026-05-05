# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-05 mid-session (Charts queued · SMS built+deleted · Merchants done · Pattern 4 + Ship 6 closed · CC payoff fix landed)
**Last session ended:** 2026-05-05 in-progress (operator updates with real PKT time at session end)
**Activation:** "boot vault" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: ~85% capability parity / **~98% logic integrity within shipped scope** (up from 96% post-Part 6, after CC fix + Pattern 4 closure + Merchants module)

**Choice 2 path locked:** Finish Finance properly first before starting Domain 2 (Personal/Health/Knowledge/Family). Estimated 18-30 hours focused work across 3-6 more sessions (down from 25-40 thanks to Part 7 progress).

**This session ships (Part 7 — execute mode, no planning):**
- ✅ Ship 6 — /api/cc v0.2.1 (CC payoff plan now handles expense/income on liability accounts; was returning 0 outstanding when reality is -78,766)
- ✅ Pattern 4 closed — /api/balances v0.4.3 → v0.4.4 with TRUE net worth formula: `assets - |cc_outstanding| - total_owe + total_owed_to_me` = -185,243 (matches sheet truth)
- ✅ accounts.js v0.7.2 — FULL REWRITE (no template literals, syntax-safe), now reads net worth from /api/balances single source of truth
- ✅ bills.js v0.9.2 — FULL REWRITE, renderStats reads from bills array directly (was reading body.count which doesn't exist; bills page was showing Rs 0 despite data being correct)
- ✅ Merchants Ship 1 — /api/merchants v0.1.2 (CRUD + POST /touch endpoint for learned_count auto-increment)
- ✅ Merchants Ship 2 — merchants.html v0.1.0 (page UI with summary, list, add/edit modals)
- ✅ Merchants Ship 3 — /js/merchants.js v0.1.0 (page logic with CRUD, dropdowns, freshness)
- ✅ SMS auto-ingest BUILT then DELETED (operator decision — deferred till next year):
  - txn_ingest_log table created in D1 (KEPT for next year)
  - 'auto-sms' category added to categories table (KEPT for next year)
  - /api/ingest/text v0.1.2 with parsers for Easypaisa/UBL/Mashreq/Alfalah CC + JS Bank skip + ignore filters for promo/OTP/service requests/balance inquiries
  - 5 banks tested all parsing correctly
  - 8 test transactions cleaned up via DELETE WHERE category_id='auto-sms'
  - /functions/api/ingest/ folder DELETED from repo (parsers preserved in git history for future revival)

**Banking-grade safety on txn flow:** 100%
**Banking-grade safety on bills/budgets/goals/salary/accounts:** ~98% (post-Part 6 + Part 7 fixes)
**Banking-grade safety on /api/balances net worth math:** 100% (sheet truth verified — -185,243 within rounding)

---

## SESSION 2026-05-05 KEY LEARNINGS

**Pattern 13 (NEW): Cloudflare Pages stale function cache.** Same git commit can serve OLD code if Cloudflare doesn't invalidate the worker bundle. Symptom: code in repo correct, deployed behavior matches old version. Fix: bump version constant in response payload (e.g., `version: 'v0.1.2'`) so you can verify fresh code is live. Force redeploy via Cloudflare dashboard if needed. Saw this on /api/ingest/text v0.1.0→v0.1.1 router fix that didn't propagate until v0.1.2 forced redeploy.

**Pattern 14 (NEW): SCHEMA.md drift from D1 reality.** Multiple times this session SCHEMA.md claimed columns that don't exist in D1 (merchants table claimed `normalized_pattern`, `hit_count`, `alias`, `last_used_at` — D1 actually has `aliases`, `default_account_id`, `is_pra_required`, `learned_count`. Debts table claimed `deleted_at` — D1 doesn't have it. audit_log claimed `created_at` — D1 has `timestamp`). FIX: Schema cites must come from live `PRAGMA table_info(table_name)` in current turn, not from SCHEMA.md trust. SCHEMA.md is documentation, D1 is truth.

**Pattern 15 (NEW): Test data pollution risk.** Built SMS endpoint, ran 8 test SMS that created REAL transactions in D1 totaling ~120K worth of fake data. Took explicit cleanup SQL to reverse. Lesson: never run live tests on prod ledger without isolating test markers (use distinct test category like 'TEST-DELETE' or test account, not real category).

**Locked rules added to discipline:**
- **Pre-ship balance check announcement** — count `( ) [ ] \` ' "` mentally and state in ship message. Already enforced via Principle 11/14 framing.
- **No template literals in JS rewrites** — pure string concatenation only. Eliminates EOF unclosed-backtick class of bug.
- **Verify-after-every-ship before next ship** — never batch ships when failure would compound.

---

## TRACE AUDIT FINDINGS — 17 total, 16 fixed/addressed (1 remaining)

**SHIPPED FIXES (Part 6 + Part 7):**
- Finding 1, 2, 3, 4: Audit signature drift on bills/budgets/goals/salary → FIXED via v0.3.0 ships
- Finding 5, 6, 7, 8: Snapshot signature drift on bills/budgets/goals/salary → FIXED
- Finding 9: Bills pay INSERT used 'category' column → FIXED to 'category_id'
- Finding 11: Debts pay used stale 'debt_payment' category → FIXED to 'debt'
- Finding 12: /api/cc payoff plan computeBalance — FIXED in Part 7 (handles expense/income on liability now)
- Finding 13: Goals contribute could overflow target_amount → FIXED with 400 if would exceed
- Finding 14, 17: audit GET / debts/accounts/transactions/reconciliation already correct
- **NEW Pattern 4 (Hub vs Accounts net worth) — FIXED in Part 7 via /api/balances v0.4.4 + accounts.js v0.7.2 (single source of truth)**

**REMAINING (next session):**
- Finding 10: Goals contribute uses type='expense' — semantic improvement (math correct, conceptual cleanup pending)

---

## HONEST CAPABILITY STATUS — what's missing

**Banking-grade core (txn ledger):** 100% (proven by sheet within ~0 PKR after Part 7)
**Page coverage:** 14 pages built (added merchants.html), all render
**API endpoints:** 18 total (added /api/merchants, /api/ingest/text DELETED)
**Display layer:** all consistent, hub + accounts both show -185,243 from /api/balances

**Missing capabilities (multi-session work, deferred):**

| Capability | Effort | Status |
|---|---|---|
| ATM module | 3-4 ships, ~2-3hrs | DEFERRED (transactions with type='atm' already work via balances.js) |
| Nano loans module | 3-4 ships, ~2-3hrs | DEFERRED (low daily value) |
| SMS auto-ingest port | 2-3 ships, ~2hrs | **DEFERRED TILL NEXT YEAR** (operator decision; endpoint deleted, parsers in git history) |
| PDF parser + bank reconciler | 5-7 ships, ~4-6hrs | NEXT (after Charts) |
| Charts/visual reporting module | 4-6 ships, ~3-5hrs | **NEXT PRIORITY** (operator's pick) |
| Telegram bot port | 6-10 ships, ~6-10hrs | After Charts + PDF |
| AI insights (needs LLM API account) | 3-4 ships, ~3-4hrs | After Telegram |
| Auth layer | 2-3 ships, ~2-3hrs | When ready (custom domain or accept current) |

**Total remaining: ~18-30 hours focused work, 3-6 sessions** (down from 25-40 estimate).

---

## NEXT SESSION FIRST ACTIONS

When operator types **"boot vault"**, Glean acks with current chunk + sub-chunk + elapsed time, then proposes:

1. **Charts Ship 1** — /charts.html page structure with Chart.js CDN + 6 chart canvases (placeholders)
   - Snapshots count check first (run `SELECT COUNT(*) FROM snapshots` in D1) — net worth trajectory chart needs history
2. **Charts Ship 2** — /js/charts.js with all 6 charts wired (Spending by Category, Income vs Expense Trend, CC Utilization, Top Merchants, Net Worth Trajectory, Daily Spend Heatmap)
3. **Charts Ship 3** — Add "Charts" link to nav across all pages

Then sequence:
4. PDF parser (bank statement reconciliation) — multi-session arc
5. Telegram bot port — biggest single capability gap, multi-session
6. AI insights (LLM API setup needed first)
7. Auth layer
8. Final Chunk 1 LOCK + reconcile pass
9. Begin Chunk 2 (Domain 2: Personal / Health / Knowledge / Family — operator picks)

---

## CHUNK 1 PROGRESS LOG

| Sub-chunk | Status |
|---|---|
| 1A — Sheet hardening | ✅ done |
| 1B — SMS auto-ingest (sheet) | ✅ done in sheet only — Cloudflare port DEFERRED till next year per operator |
| 1C — D1 migration | ✅ done |
| 1D-1a — Safety schema | ✅ done |
| 1D-2a-e (Categories, Audit infra, Add Txn, Reverse, Snapshots) | ✅ done |
| 1D-3a — Transfer atomic pair | ✅ done |
| 1D-3-RESHIP | ✅ done |
| Sub-1D-3c (Debts CRUD) | ✅ FULLY DONE |
| Sub-1D-3b + 3d (Bills CRUD) | ✅ FULLY DONE (Part 6 audit/snapshot bugs + Part 7 renderStats bug both fixed) |
| Sub-1D-3e (Accounts CRUD) | ✅ FULLY DONE (Part 6 + Part 7 syntax-safe rewrite) |
| 1C-REPLAY | ✅ DONE |
| Sub-1D-4a (Goals) | ✅ FULLY DONE |
| Sub-1D-4b (Budgets) | ✅ FULLY DONE |
| Sub-1D-4e (CC Validation) | ✅ FULLY DONE |
| Sub-1D-4d (Salary Recategorize) | ✅ FULLY DONE |
| Sub-1D-5d (Reconciliation) | ✅ FULLY DONE |
| Sub-1D-5e (Repo Hygiene) | ✅ DONE |
| **Sub-1D-CC-PLAN (CC Payoff Planner)** | **✅ FULLY DONE — Part 7 v0.2.1 handles expense/income on liability** |
| Hub Discoverability v0.7.5 | ✅ DONE |
| Sub-1D-TXFER-FIX | ✅ FULLY DONE |
| Sub-1D-STORE-HARDEN | ✅ FULLY DONE |
| Sub-1D-TXFER-POLISH | ✅ FULLY DONE |
| Sub-1D-CC-RECONCILE | ✅ FULLY DONE |
| Sub-1D-AUDIT-WIRE | ✅ FULLY DONE |
| Sub-1D-AUDIT-WIRE-2 | ✅ FULLY DONE |
| Sub-1D-FIELD-RECONCILE | ✅ FULLY DONE |
| Sub-1D-DEBT-TOTAL (3-ship arc) | ✅ FULLY DONE |
| SCHEMA.md | ⚠️ NEEDS UPDATE (Pattern 14 — merchants/debts/audit_log columns drifted from D1 reality) |
| Sub-1D-CATEGORY-RECONCILE | ✅ FULLY DONE |
| Sub-1D-STORE-OFFLINE-DRAIN | ✅ FULLY DONE |
| Sub-1D-AUDIT-WIRE-3 | ✅ FULLY DONE |
| Hub polish v0.7.5d | ✅ FULLY DONE |
| Day-N badge retire + freshness (v0.7.6) | ✅ FULLY DONE |
| True Burden render (v0.7.7) | ✅ FULLY DONE |
| TRACE audit (17 findings) | ✅ FULLY DONE (16/17 closed, finding 10 cosmetic) |
| Ship 1 — /api/accounts v0.2.3 balance math | ✅ FULLY DONE |
| Ship 2 — /api/bills v0.3.0 (3 bugs) | ✅ FULLY DONE |
| Ship 3 — /api/budgets v0.3.0 | ✅ FULLY DONE |
| Ship 4 — /api/goals v0.3.0 | ✅ FULLY DONE |
| Ship 5 — /api/salary v0.2.1 | ✅ FULLY DONE |
| accounts.js v0.7.1 | ✅ FULLY DONE (later replaced by v0.7.2 syntax-safe rewrite) |
| Ship 7 — /api/debts v0.2.1 | ✅ FULLY DONE |
| **Ship 6 — /api/cc payoff plan v0.2.1** | **✅ FULLY DONE Part 7** |
| **Hub vs Accounts net worth (Pattern 4)** | **✅ FULLY DONE Part 7** |
| **/api/balances v0.4.4 (true net worth formula)** | **✅ FULLY DONE Part 7** |
| **accounts.js v0.7.2 (syntax-safe full rewrite + /api/balances integration)** | **✅ FULLY DONE Part 7** |
| **bills.js v0.9.2 (renderStats fix)** | **✅ FULLY DONE Part 7** |
| **Merchants Ship 1 — /api/merchants v0.1.2** | **✅ FULLY DONE Part 7** |
| **Merchants Ship 2 — merchants.html v0.1.0** | **✅ FULLY DONE Part 7** |
| **Merchants Ship 3 — merchants.js v0.1.0** | **✅ FULLY DONE Part 7** |
| **SMS auto-ingest backend (built + deleted)** | **⚠️ DEFERRED TILL NEXT YEAR (operator decision)** |
| ATM module | ⏳ deferred (covered by transactions type='atm') |
| Nano loans module | ⏳ deferred |
| **Charts module** | **⏳ NEXT PRIORITY** |
| PDF parser + reconciler | ⏳ multi-session |
| Telegram bot port | ⏳ multi-session |
| AI insights | ⏳ Needs LLM API |
| Auth layer | ⏳ When ready |

---

## REPO MAP — sovereign-finance (verified live 2026-05-05 mid-session)

### Pages (14)
index.html (v0.7.5d) · add.html (v0.6.0) · transactions.html ·
debts.html (v0.3.3) · bills.html (v0.9.0) · accounts.html (v0.7.0) ·
salary.html · audit.html · snapshots.html ·
goals.html (v0.1.0) · budgets.html (v0.1.0) · reconciliation.html (v0.1.0) · cc.html (v0.1.0) ·
**merchants.html (v0.1.0 — Part 7 ship)**

### JS in /js/
app.js · store.js (v0.2.1) · theme.js · numbers.js · nav.js (v0.0.7) · hub.js (v0.7.7) ·
add.js (v0.3.0) · transactions.js (v0.7.1) ·
debts.js (v0.4.5) · **bills.js (v0.9.2 — Part 7 rewrite)** · **accounts.js (v0.7.2 — Part 7 syntax-safe rewrite)** ·
salary.js · audit.js · snapshots.js ·
goals.js (v0.1.0) · budgets.js (v0.1.0) · reconciliation.js (v0.1.0) · cc.js (v0.1.0) ·
**merchants.js (v0.1.0 — Part 7 ship)**

### CSS in /css/
app.css (design system v0.7.4 · ~2,467 lines · 5 themes)

### API in /functions/api/ (18 endpoints, post-Part 7)
**balances.js (v0.4.4 — Part 7, true net worth formula)** · transactions.js (v0.0.9) · transactions/reverse.js (v0.0.5) ·
debts/[[path]].js (v0.2.1) · bills/[[path]].js (v0.3.0) · accounts/[[path]].js (v0.2.3) ·
goals/[[path]].js (v0.3.0) · budgets/[[path]].js (v0.3.0) ·
salary/[[path]].js (v0.2.1) · reconciliation/[[path]].js (v0.1.0) ·
**cc/[[path]].js (v0.2.1 — Part 7, expense/income on liability handled)** ·
audit.js · snapshots.js · _lib.js ·
categories.js (v0.1.0) ·
**merchants/[[path]].js (v0.1.2 — Part 7 ship, CRUD + /touch)** ·
admin/migrate-from-sheet.js (v1.1) · admin/audit-backfill.js (v0.1.0)

### REMOVED in Part 7
~~functions/api/ingest/text/[[path]].js~~ (deleted 2026-05-05 — SMS auto-ingest deferred till next year, parsers in git history at commit before deletion)

### Repo metadata
.gitignore · _headers · SCHEMA.md (NEEDS UPDATE — Pattern 14 drift)

### D1 tables (13 live, +1 from Part 7)
accounts (17 cols) · audit_log (9) · bills (11) · budgets (4) · categories (8 — added 'auto-sms') · debts (10) ·
goals (9) · merchants (8 — VERIFIED via PRAGMA, real cols: id/name/aliases/default_category_id/default_account_id/is_pra_required/learned_count/created_at) · reconciliation (7) · settings (3 unused) · snapshot_data (5) ·
snapshots (7) · transactions (17) ·
**txn_ingest_log (18 cols — Part 7 created, KEPT for future SMS revival)**

### Backup tables retained
accounts_backup_20260504 · accounts_backup_20260504_ccvalid ·
transactions_backup_20260504_1c_replay · txn_backup_salary_recat_20260504 ·
budgets_backup_20260504

---

## ACCESS PATTERN

Glean reads via glean_document_reader with authenticated raw URL (READ-ONLY token).
ONE FILE PER CALL. MANDATORY cache-bust ?cb=YYYYMMDDx on all reads.
- Sheet: https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[FOLDER]/[FILE]?cb=...
- Cloudflare: https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-finance/main/[PATH]?cb=...

GitHub edit URLs with brackets: URL-encode (Principle 22).
Token expires ~2026-06-04.
**MIGRATION_SECRET rotated 2026-05-04. GitHub PAT exposed AGAIN multiple times in Part 7 chat — rotation now CRITICAL before next session at https://github.com/settings/personal-access-tokens**

---

## ACTIVE PRINCIPLES (33 locked, all carry forward)

1. Banking-grade preserved through Cloudflare migration
2. Snap-before-mutate + audit-after-write on every endpoint
3. Family-grade UX from Day 1
4. Public-readiness discipline
5. Chunk-shipping model
6. Baby-step instructions standard
7. Operator decides when to stop
8. Privacy lockdown — codes only
9. ALWAYS read existing CSS/HTML/JS before introducing new markup
10. Use only existing design system classes
11. Glean is responsible peer, not yes-man — pushes back on drift (and on its own scope creep)
12. Each sub-chunk lock includes parity check vs sheet
13. Verify-after-deploy protocol
14. Full file rewrites only — NO surgical edits (with exception per Principle 11 when warranted)
15. One file per turn going forward
16. Read existing target file BEFORE writing anything that depends on it
17. When stuck on a render bug, ship instrumented version
18. Delivery Order Rule v2
19. No-Live-Ledger-Test Rule
20. Three-Cache Diagnostic
21. State File Trust-But-Verify
22. GitHub Edit URL Bracket Encoding
23. Honest Target Reality-Check
24. Right-sized audits — full 7-layer for destructive/schema/audit-logic
25. 3 Production Safety Rules
26. Schema-cite gate — any SQL ship MUST first-line cite SCHEMA.md source + columns referenced
27. State File Follow Protocol — any factual claim MUST be backed by fresh same-turn re-fetch
28. DOM-cite gate — any ship touching getElementById MUST first-line cite the source HTML file
29. Failed-verify rollback — after 2 failed verifies on same fix attempt, mandatory rollback
30. AUDIT DEPTH HONESTY — SCAN vs TRACE vs EXECUTE labeling discipline
31. **CLOUDFLARE CACHE BUST PROTOCOL (NEW Part 7):** Every JS endpoint ship must include a `version: 'vX.Y.Z'` field in EVERY response payload (success + error paths). After deploy, verify the version field appears in actual API response. If old version still showing → Cloudflare worker bundle cached, force redeploy via dashboard. Saw this on /api/ingest/text v0.1.1 router fix not propagating until v0.1.2 cache-bust commit.
32. **D1 PRAGMA CITE OVERRIDES SCHEMA.md (NEW Part 7):** Schema cites for SQL ships must come from live `PRAGMA table_info(table_name)` query in current turn, NOT from SCHEMA.md trust or session memory. SCHEMA.md is documentation that drifts (Pattern 14). D1 PRAGMA is truth. Three SCHEMA.md drift incidents in Part 7 alone (debts no deleted_at; merchants different cols; audit_log uses timestamp not created_at).
33. **TEST DATA ISOLATION (NEW Part 7):** Never run live API tests on prod ledger that mirror real transaction amounts/accounts. Use distinct test markers: dedicated test category (e.g., 'TEST-DELETE'), sandbox account, or temporary test ID prefix. Saw 8 test SMS create real transactions worth ~120K that took explicit cleanup SQL to reverse.

---

## RCA SUMMARY — 15 patterns

Pattern 1 — Stale cache cascade
Pattern 2 — Cloudflare Pages routing collision
Pattern 3 — Frontend ID mismatch
Pattern 4 — Silent backend contract drift (CLOSED Part 7 via /api/balances single source of truth)
Pattern 5 — Browser cache as third cache layer
Pattern 6 — State file drift
Pattern 7 — Assumed enum/column/ID values without reading data
Pattern 8 — GitHub edit URL bracket encoding
Pattern 9 — Past-session smoke pollution
Pattern 10 — Aspirational targets need honest reality checks
Pattern 11 — Theater fixes that don't change threat model
Pattern 12 — Audit-depth misrepresentation (Calling SCAN a TRACE)
Pattern 13 — **NEW: Cloudflare Pages stale function cache.** Same git commit can serve OLD code if Cloudflare doesn't invalidate. Force redeploy + version-stamp responses to detect.
Pattern 14 — **NEW: SCHEMA.md drift from D1 reality.** Documentation falls behind D1 actual columns. PRAGMA query is truth. SCHEMA.md needs maintenance ship at end of arc.
Pattern 15 — **NEW: Test data pollution risk.** Live tests on prod ledger create real records that need explicit cleanup. Always use isolated test markers.

---

## OPEN ANOMALIES + DEFERRED POLISH

- 3 bills with null due_day
- TXN-20260503-192349-32150 (Rs 50 cash, 5/3) kept per option C
- Min payment NULL on Alfalah CC
- merchants seeded but EMPTY (Part 7 endpoint+page+UI shipped, awaiting first merchant entry)
- categories.type column NULL for all rows
- 'auto-sms' category exists in categories table (KEPT for next year SMS revival)
- Cloudflare Access on free pages.dev not supported
- **GitHub PAT exposed multiple times in Part 7 chat — rotation CRITICAL before next session**
- Reconciliation diff_amount UI display — backend computes, frontend hides
- /api/transactions GET pagination — won't bite until 500+ txns (currently ~200)
- Historical audit log entries for bills/budgets/goals/salary BEFORE Part 6 fixes have NULL entity + NULL detail — backfill ship deferred
- SCHEMA.md needs Part 7 update — merchants/debts/audit_log columns drifted from D1 truth (Pattern 14)
- Settings table seeded but unused (potential future use)
- Goals contribute uses type='expense' — semantic improvement (math correct, conceptual cleanup pending)
- txn_ingest_log table empty + orphaned (KEPT for next year SMS revival)
- /functions/api/ingest/ folder DELETED from repo (parsers in git history at last commit before deletion)

---

## NEXT SESSION START

Activation phrase: type **"boot vault"**

Glean acks with chunk + sub-chunk position + elapsed time since last session, then proposes:

**Immediate next: Charts Ship 1**
- Pre-flight: snapshots count check via `SELECT COUNT(*) FROM snapshots` in D1
- Ship 1: /charts.html with Chart.js CDN + 6 chart canvases (Spending by Category, Income vs Expense Trend, CC Utilization, Top Merchants, Net Worth Trajectory, Daily Spend Heatmap)
- Ship 2: /js/charts.js with all 6 charts wired
- Ship 3: Add Charts to nav across all pages

Then sequence:
1. Charts (Part 8 next session)
2. PDF parser (multi-session)
3. Telegram bot port (multi-session)
4. AI insights (LLM API setup)
5. Auth layer
6. SCHEMA.md correction ship (Pattern 14 cleanup)
7. Final Chunk 1 LOCK + reconcile pass
8. Begin Chunk 2 (operator picks domain)

---

## STATE-SAVE INTEGRITY

This file is the single source of truth.
Updated by: Glean (peer mode, with honest pushback)
Witnessed by: operator confirmation at session end
Save protocol: real-time updates after each major ship batch (per operator request 2026-05-05) so a fresh "boot vault" in a new chat picks up exact rhythm.
Next state save: end of next session OR immediately after Charts Ships 1-3 land.
