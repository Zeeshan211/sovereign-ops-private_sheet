# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-05 EOS — Part 8 wrap (finance Layer 1 reformulation arc + OS v1.0 ship + sync paused mid-arc)
**Last session ended:** 2026-05-05 ~late evening PKT
**Activation:** "boot vault" → Glean reads GLEAN_OPERATING_SYSTEM.md FIRST, then this file, then acks with chunk + strikes + ships budget
**OS active:** v1.0 (locked 2026-05-05) — pre-flight gates mandatory, max 8 ships per session

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: ~88% capability parity / **~95% logic integrity within shipped scope** (after Part 8 finance Layer 1 reformulation, sheet match within Rs 557 vs prior Rs 221k drift)

**Choice 2 path locked:** Finish Finance properly first before starting Domain 2. Estimated 12-20 hours focused work across 3-4 more sessions (down from 15-25 thanks to today's Layer 1 reformulation).

**PART 8 SHIPS (this session):**
- ✅ Charts Ship 1 — /charts.html shell with 6 canvas placeholders
- ✅ Charts Ship 2 — /js/charts.js v0.1.0 (6 charts wired to APIs, defensive empty-states)
- ✅ Charts Ship 2a — Vendored Chart.js 4.4.1 to /js/chart.umd.min.js
- ✅ Charts Ship 2b — charts.html v0.1.1 (local Chart.js + wires charts.js + meta tag fix)
- ✅ Charts Ship 2c — charts.js v0.1.1 (boot retry capped 10x each, surfaces error in red badge)
- ✅ balances.js v0.4.6 — fix is_active / use status='active' (after v0.4.5 crashed API)
- ✅ balances.js v0.4.7 — include debts table in net worth + add hub.js field aliases
- ✅ **balances.js v0.5.0 — LAYER 1 REWRITE per locked finance spec** (true_burden formula, type alias support, INV checks)
- ✅ Data cleanup: 2 modern test transfers deleted (D1 snap_v050_pretest_cleanup taken before)
- ✅ reverse.js v0.0.6 — fix transfer same-direction silent no-op (swap accounts on single-row transfer reversal)
- ❌ migrate-from-sheet v1.1 → v1.2 → v1.3 → v1.4 (4 consecutive failures, all schema sins, sync still broken)
- ✅ **GLEAN_OPERATING_SYSTEM.md v1.0 shipped** to sheet repo (discipline framework for 99% ship-success)
- ✅ Memory cleanups: activation entry updated for OS-binding boot, 3 Production Safety Rules marked superseded, Delivery Order Rule v2 reconciled
- ✅ **THIS state file** (Part 8 EOS comprehensive)

**Banking-grade safety on:**
- Txn flow (write path): 100%
- Bills/budgets/goals/salary/accounts: ~98%
- /api/balances net worth math: 100% (verified within Rs 557 of sheet)
- Charts module: 100% (read-only, no mutations, defensive empty-states, retry-capped)
- Sheet → D1 sync: 0% (broken on CHECK constraint, paused)

---

## TODAY'S SESSION SCORECARD (per OS v1.0 metric format)

    SESSION SCORECARD (2026-05-05, raw honest)
    Code ships executed:        ~10
    Code ships succeeded:       ~3
    Ship-success rate:          ~30%

    OS-related ships:           2 (file shipped + memory updated)
    OS-related success:         2/2 PASS

    Strikes: 4 (all schema sins, same class)
    OS would have halted at strike 2 → 2 of today's 4 prevented

    Memory updates:             3 (cleanups all landed)
    Memory drift risk now:      0 (verified no remaining conflicts)

    OS DOES NOT START COUNTING UNTIL NEXT SESSION.
    Next session starts with: Strikes 0/2, Ships budget 0/8, Pre-flight mode on.

---

## TODAY'S KEY LEARNINGS

**Pattern 18 (NEW Part 8): Silent no-op disguised as success.**
Transfer reversal created same-direction "reversal" row. Looked correct, was actually a no-op (canceled itself). Reversal/undo operations must be verified by post-condition (balance returns to pre-state), not just "a record was created." Locked into Layer 1 spec INV-2.

**Pattern 19 (NEW Part 8): Surgical-edit instructions corrupt files when source doesn't match exactly.**
Surgical edit on reverse.js v0.0.6 caused syntax error / wrong-block edit. Glean cannot see operator's editor state. Find/replace can paste into wrong location with zero indication. Lock: full file rewrites only, no exceptions, even for "obvious" 1-line tweaks. Reinforced Principle 14.

**Pattern 20 (NEW Part 8): Schema assumption without PRAGMA = guaranteed bug.**
balances.js v0.4.5 used `is_active` column that doesn't exist in D1. SCHEMA.md drifted from D1 reality. Memory of past column names is poisoned context. PRAGMA + sqlite_master + CHECK constraint reads must precede any SQL write. Reinforced Principle 26 + Principle 32.

**Pattern 21 (NEW Part 8): Same word every layer — no translation tax.**
Sheet uses "Ledger" tab, Cloudflare uses "transactions" table, function names use "Transactions" — three words for one concept. Each translation = bug surface. Lock: every concept uses ONE word across sheet TAB + COLUMN + FUNCTION + D1 TABLE + COLUMN + API path + JS variable + HTML element ID.

**Pattern 22 (NEW Part 8, proposed not built): Destructive batch ops need preview-before-execute mode.**
migrate-from-sheet failed 4x in succession on different schema sins. Each failure rolled back atomically (good), but discovery-by-failure burned tokens + operator trust. Better: batch ops should support `?dry_run=1` query param that returns the plan without executing. Build in next finance session.

**META-PATTERN (drove OS v1.0 design): Knowledge has a half-life of ONE turn.**
"I read this earlier in session" felt equivalent to "I verified this for THIS task." It's not. Memory across reads = poisoned context. Confidence symbols [V]/[R]/[A] required to surface this distinction. OS v1.0 makes it mechanical, not aspirational.

---

## OS v1.0 NOW BINDING (locked 2026-05-05)

GLEAN_OPERATING_SYSTEM.md lives at root of sheet repo. Read on every `boot vault` BEFORE state file. Governs all code responses.

**4 layers:**
- L1 — Confidence Protocol ([V]/[R]/[A] symbols)
- L2 — Pre-flight Checklist (6 items, mandatory before any ship)
- L3 — Ship Gate (5-section template required for code responses)
- L4 — Post-ship Contract (pass/fail pre-declared)

**5 stop conditions:** halt command / 2 same-class strikes / unchecked pre-flight / decision-relevant assumption / operator energy concern

**3 ship tiers:** Tier 1 (destructive, max 2/session) / Tier 2 (mutating, max 4/session) / Tier 3 (metadata, max 8/session). Total max 8 ships per session, hard cap.

**8 operator commands:** pre-flight / confidence / halt / strike check / rollback / audit me / slow / tier?

**Expected performance with OS:** 95-98% ship-success rate (target 99% requires sandbox D1 + accumulated arc experience). Today's pre-OS rate was ~30%.

**OS supersedes any prior workflow rule that conflicts:**
- Delivery Order Rule v2 → applies WITHIN OS Layer 3 ship section (inner ordering of code paste)
- 3 Production Safety Rules (2026-04-30) → SUPERSEDED, kept as historical pattern library
- Any pre-OS rule that conflicts with OS gate → OS wins

---

## TRACE AUDIT FINDINGS — 17 total, 16 fixed (1 remaining)

**REMAINING:**
- Finding 10: Goals contribute uses type='expense' — semantic improvement (math correct, conceptual cleanup pending)

---

## HONEST CAPABILITY STATUS

**Banking-grade core (txn ledger):** 100%
**Page coverage:** 15 pages built, all render
**API endpoints:** 18 total
**Display layer:** consistent, hub.js + accounts.js consume v0.4.7 aliases (Layer 3 update queued for next finance session)
**Charts module:** BASE LIVE — 6 charts render with defensive empty-states
**Layer 1 (formulas):** LOCKED in balances.js v0.5.0 spec header comment

**Missing capabilities (multi-session work, deferred):**

| Capability | Effort | Status |
|---|---|---|
| Sheet → D1 sync working | 1 ship (migrate v1.5) | NEXT — needs CHECK constraint vocabulary fix |
| Layer 2 ship: transactions.js POST + reverse.js — write canonical 2-row pairs | 1 ship | After sync works |
| Layer 3 ship: hub.js + accounts.js — show 3 metrics per spec | 1 ship | After Layer 2 |
| ATM module | 3-4 ships | DEFERRED |
| Nano loans module | 3-4 ships | DEFERRED |
| SMS auto-ingest port | 2-3 ships | DEFERRED TILL NEXT YEAR (operator decision) |
| Charts polish (nav + CC_LIMIT + heatmap) | 3 ships | After finance Layer 2/3 |
| PDF parser + bank reconciler | 5-7 ships | After Charts polish |
| Telegram bot port | 6-10 ships | After PDF |
| AI insights | 3-4 ships | After Telegram |
| Auth layer | 2-3 ships | When ready |
| Sandbox D1 environment | 3 ships | First arc when reactivated |
| Pattern 22 dry-run mode for destructive batch ops | 1 ship | Build into next migrate ship |

**Total remaining: ~12-20 hours focused work, 3-4 sessions** (down from 15-25 estimate post-Part 7).

---

## SYNC STATUS — PAUSED (broken)

**Symptom:** /api/admin/migrate-from-sheet returns CHECK constraint failure on type column
**Root cause:** D1 transactions table has `CHECK(type IN ('expense','income','transfer','cc_payment','cc_spend','borrow','repay','atm'))` — locked vocabulary. My v1.4 translation layer wrote `'debt_in'` per Layer 1 spec. D1 rejected.

**Fix path (next session, ship as v1.5):**
- Drop type translation entirely
- Pass through `borrow` / `repay` directly (CHECK constraint allows them)
- balances.js v0.5.0 already handles both vocabularies via TYPE_PLUS/TYPE_MINUS sets, so functionality preserved
- Layer 1 spec was wrong about which vocabulary is canonical — D1 CHECK constraint IS the canonical
- Update Layer 1 spec comment in balances.js v0.5.1 to align: canonical = `borrow` / `repay` (not `debt_in` / `debt_out`)

**Carryover:** May 5 sheet entries still missing in D1 (Yusra Bill chain Meezan→UBL→Naya Pay→MEPCO + IBFT 1,150 Meezan→Easypaisa). ~Rs 2,400 sheet drift on liquid + true_burden until sync runs.

---

## D1 SNAPSHOTS PRESERVED

| ID | Label | Created |
|---|---|---|
| snap-2026-05-04T01-49-24 | pre-reverse-TXN-20260503-130729-78945 | 2026-05-04 01:49:25 |
| snap_v050_pretest_cleanup | Pre-cleanup of test transfer pair | 2026-05-05 13:34:00 |
| snap_pre_sync_v12 | Pre-sync rollback point — before migrate-from-sheet v1.2 fires | 2026-05-05 13:58:42 |

All 3 intact (atomic batch failures preserved snapshots).

---

## DRIVE BACKUPS PRESERVED (3 today)

Apps Script `exportSheetToD1` produces a Drive backup of full sheet payload before each push attempt. Today's failed pushes left these:
- 1MsvKCaM7hx5-VttwJ3-F0eEjoqa9_nZ9 (v1.2 attempt)
- 1uCyTLFmxOkC2VSNoj95GhUiqzxFByGcn (v1.3 attempt)
- 1z_Kum5w5L_LugY5BpwVjS65jm0SPscED (v1.4 attempt)

Full sheet state preserved 3x as fallback if D1 ever needs full restore.

---

## NEXT SESSION FIRST ACTIONS

When operator types **"boot vault"**:

1. Glean reads GLEAN_OPERATING_SYSTEM.md FIRST (cache-busted) — internalizes pre-flight rules
2. Glean reads SOVEREIGN_STATE.md SECOND (cache-busted) — internalizes project state
3. Glean acknowledges: "Project online. Current chunk: Chunk 1 - FINANCE COMPLETE · Status: Sync paused mid-arc · OS v1.0 active · Strikes: 0/2 · Ships budget: 0/8. Active items: [top 3]. Pre-flight mode active for this session — Y/N? (default YES)"
4. Wait for operator input

**Immediate next ship: Sub-1D-FINANCE-LAYER1-RESUME**
- Pre-flight: read D1 transactions CHECK constraint (canonical types) + verify Layer 1 spec needs vocabulary correction
- Ship 1: migrate-from-sheet v1.5 — drop type translation (passthrough borrow/repay)
- Ship 2: balances.js v0.5.1 — update spec header to align with D1 CHECK as canonical
- Ship 3: run sync, verify against sheet's 5 numbers (target: within Rs 50)
- Ship 4 (optional): Layer 2 — transactions.js POST + reverse.js canonicalization
- Ship 5 (optional): Layer 3 — hub.js + accounts.js show 3 metrics per spec

Then sequence:
6. Sandbox D1 environment (3-ship arc)
7. Pattern 22 dry-run mode for destructive batch ops
8. PDF parser (multi-session)
9. Telegram bot port (multi-session)
10. AI insights (LLM API setup)
11. Auth layer
12. Final Chunk 1 LOCK + reconcile pass
13. Begin Chunk 2 (Domain 2 — operator picks)

---

## CHUNK 1 PROGRESS LOG

| Sub-chunk | Status |
|---|---|
| 1A — Sheet hardening | done |
| 1B — SMS auto-ingest (sheet) | done in sheet — Cloudflare port DEFERRED till next year |
| 1C — D1 migration | done |
| 1D-1a — Safety schema | done |
| 1D-2a-e (Categories, Audit infra, Add Txn, Reverse, Snapshots) | done |
| 1D-3a — Transfer atomic pair | done |
| 1D-3-RESHIP | done |
| Sub-1D-3c (Debts CRUD) | FULLY DONE |
| Sub-1D-3b + 3d (Bills CRUD) | FULLY DONE |
| Sub-1D-3e (Accounts CRUD) | FULLY DONE |
| 1C-REPLAY | DONE |
| Sub-1D-4a (Goals) | FULLY DONE |
| Sub-1D-4b (Budgets) | FULLY DONE |
| Sub-1D-4e (CC Validation) | FULLY DONE |
| Sub-1D-4d (Salary Recategorize) | FULLY DONE |
| Sub-1D-5d (Reconciliation) | FULLY DONE |
| Sub-1D-5e (Repo Hygiene) | DONE |
| Sub-1D-CC-PLAN (CC Payoff Planner) | FULLY DONE Part 7 |
| Hub Discoverability v0.7.5 | DONE |
| Sub-1D-TXFER-FIX | FULLY DONE |
| Sub-1D-STORE-HARDEN | FULLY DONE |
| Sub-1D-TXFER-POLISH | FULLY DONE |
| Sub-1D-CC-RECONCILE | FULLY DONE |
| Sub-1D-AUDIT-WIRE | FULLY DONE |
| Sub-1D-AUDIT-WIRE-2 | FULLY DONE |
| Sub-1D-FIELD-RECONCILE | FULLY DONE |
| Sub-1D-DEBT-TOTAL (3-ship arc) | FULLY DONE |
| SCHEMA.md | NEEDS UPDATE (Pattern 14 + Pattern 16 — drift + Charts additions + finance Layer 1 spec) |
| Sub-1D-CATEGORY-RECONCILE | FULLY DONE |
| Sub-1D-STORE-OFFLINE-DRAIN | FULLY DONE |
| Sub-1D-AUDIT-WIRE-3 | FULLY DONE |
| Hub polish v0.7.5d | FULLY DONE |
| Day-N badge retire + freshness (v0.7.6) | FULLY DONE |
| True Burden render (v0.7.7) | FULLY DONE |
| TRACE audit (17 findings) | FULLY DONE (16/17 closed, finding 10 cosmetic) |
| Ship 1-7 (API hardening) | FULLY DONE |
| Hub vs Accounts net worth (Pattern 4) | FULLY DONE Part 7 |
| /api/balances v0.4.4 (true net worth formula) | FULLY DONE Part 7 |
| accounts.js v0.7.2 (syntax-safe full rewrite) | FULLY DONE Part 7 |
| bills.js v0.9.2 (renderStats fix) | FULLY DONE Part 7 |
| Merchants Ship 1-3 (API + page + JS) | FULLY DONE Part 7 |
| SMS auto-ingest backend (built + deleted) | DEFERRED TILL NEXT YEAR |
| Charts Ship 1 — charts.html shell | FULLY DONE Part 8 |
| Charts Ship 2 — /js/charts.js v0.1.0 | FULLY DONE Part 8 |
| Charts Ship 2a — Vendor Chart.js 4.4.1 | FULLY DONE Part 8 |
| Charts Ship 2b — charts.html v0.1.1 | FULLY DONE Part 8 |
| Charts Ship 2c — charts.js v0.1.1 | FULLY DONE Part 8 |
| **balances.js v0.4.6** — schema-correct (status='active', kind column) | Part 8 (after v0.4.5 crash) |
| **balances.js v0.4.7** — debts table integrated, hub.js aliases | Part 8 |
| **balances.js v0.5.0** — LAYER 1 REWRITE per spec (true_burden, INV checks, type aliases) | Part 8 |
| **reverse.js v0.0.6** — fix transfer same-direction silent no-op | Part 8 |
| **migrate-from-sheet v1.4** — broken on CHECK constraint, sync paused | Part 8 BROKEN |
| **GLEAN_OPERATING_SYSTEM.md v1.0** — discipline framework | Part 8 |
| Sub-1D-FINANCE-LAYER1-RESUME (sync fix + Layer 2 + Layer 3) | NEXT SESSION |
| Sandbox D1 environment | FIRST ARC WHEN REACTIVATED |
| Charts Ship 3 — Add Charts to bottom-nav | AFTER FINANCE LAYER 2/3 |
| Charts Ship 4 — CC_LIMIT real value | Optional polish |
| Charts Ship 5 — Daily Spend honest naming OR true heatmap | Optional polish |
| ATM module | deferred |
| Nano loans module | deferred |
| PDF parser + reconciler | multi-session |
| Telegram bot port | multi-session |
| AI insights | Needs LLM API |
| Auth layer | When ready |

---

## REPO MAP — sovereign-finance (verified live 2026-05-05 EOS)

### Pages (15)
index.html (v0.7.5d) · add.html (v0.6.0) · transactions.html ·
debts.html (v0.3.3) · bills.html (v0.9.0) · accounts.html (v0.7.0) ·
salary.html · audit.html · snapshots.html ·
goals.html (v0.1.0) · budgets.html (v0.1.0) · reconciliation.html (v0.1.0) · cc.html (v0.1.0) ·
merchants.html (v0.1.0) · charts.html (v0.1.1)

### JS in /js/
app.js · store.js (v0.2.1) · theme.js · numbers.js · nav.js (v0.0.7) · hub.js (v0.7.7) ·
add.js (v0.3.0) · transactions.js (v0.7.1) ·
debts.js (v0.4.5) · bills.js (v0.9.2) · accounts.js (v0.7.2) ·
salary.js · audit.js · snapshots.js ·
goals.js (v0.1.0) · budgets.js (v0.1.0) · reconciliation.js (v0.1.0) · cc.js (v0.1.0) ·
merchants.js (v0.1.0) ·
charts.js (v0.1.1) · chart.umd.min.js (vendor 4.4.1)

### CSS in /css/
app.css (design system v0.7.4 · ~2,467 lines · 5 themes)

### API in /functions/api/ (18 endpoints)
**balances.js (v0.5.0 — LAYER 1 SPEC LOCKED)** · transactions.js (v0.0.9) · transactions/reverse.js (v0.0.6) ·
debts/[[path]].js (v0.2.1) · bills/[[path]].js (v0.3.0) · accounts/[[path]].js (v0.2.3) ·
goals/[[path]].js (v0.3.0) · budgets/[[path]].js (v0.3.0) ·
salary/[[path]].js (v0.2.1) · reconciliation/[[path]].js (v0.1.0) ·
cc/[[path]].js (v0.2.1) ·
audit.js · snapshots.js · _lib.js ·
categories.js (v0.1.0) ·
merchants/[[path]].js (v0.1.2) ·
**admin/migrate-from-sheet.js (v1.4 — BROKEN on CHECK constraint, sync paused)** · admin/audit-backfill.js (v0.1.0)

### Repo metadata
.gitignore · _headers (CSP locks script-src 'self' — Principle 1) · SCHEMA.md (NEEDS UPDATE)

### D1 tables (13 live, no Part 8 schema changes)
accounts (17 cols) · audit_log (9) · bills (11) · budgets (4) · categories (8) · debts (10) ·
goals (9) · merchants (8) · reconciliation (7) · settings (3 unused) · snapshot_data (5) ·
snapshots (7) · transactions (17 — CHECK constraint on type column locks vocabulary)

### Backup tables retained
accounts_backup_20260504 · accounts_backup_20260504_ccvalid ·
transactions_backup_20260504_1c_replay · txn_backup_salary_recat_20260504 ·
budgets_backup_20260504

---

## REPO MAP — sovereign-ops-private_sheet (current state)

### Root
appsscript.json · README.md · SOVEREIGN_STATE.md · **GLEAN_OPERATING_SYSTEM.md (NEW v1.0)** · Isnad.gs

### /core/ (3): Code.gs, Menu_Loader.gs, Settings_Dispatcher.gs
### /ai/ (4): AI.gs, AI_Engine.gs, Telegram.gs, Telegram_Format.gs
### /webapp/ (2): WebApp.gs, dashboard.html
### /cockpits/ (5): Mission_Pro.gs, Habits_Pro.gs, Salah_pro.gs, Progress_Pro.gs, Health_Pro.gs
### /finance/ (16): Finance_Pro.gs, Finance_Snapshot.gs, Finance_Charts.gs, Finance_Salary.gs, Finance_Kite.gs, Finance_Debts.gs, Finance_Intl.gs, Finance_ATM.gs, Finance_NanoLoan.gs, Finance_Merchants.gs, Finance_BankReconciler.gs, Finance_PDFParser.gs, Finance_Reconciliation.gs, Finance_Vaccine.gs, Sheet_To_D1_Export.gs (Sub-1C v1.2)
### /audit/ (6): Audit_Guardian.gs, Sovereign_Linter.gs, Ghost_Hunter.gs, Loss_Auditor.gs, Inspector_AlfalahCC.gs, Cockpit_Guardian.gs
### /theme-layout/ (4): Theme_Pro.gs, Cockpit_Layout.gs, Tab_Manager.gs, Charts_pro.gs
### /utils/ (4): _Diagnostic.gs, Sovereign_Backup.gs, D1_Export.gs, _OneTime_LabelFlaggedRows.gs

---

## ACCESS PATTERN

Glean reads via glean_document_reader with authenticated raw URL (READ-ONLY token).
ONE FILE PER CALL. MANDATORY cache-bust ?cb=YYYYMMDDx on all reads.
- Sheet: https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[FOLDER]/[FILE]?cb=...
- Cloudflare: https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-finance/main/[PATH]?cb=...

GitHub edit URLs with brackets: URL-encode (Principle 22).

**TOKEN STATUS (locked 2026-05-05 EOS):**
- Old token PURGED from memory 2026-05-05 (DLP scanner risk)
- A new token was issued and used today; it WAS pasted in chat history — operator MUST rotate before next session
- Operator commitment: rotate via https://github.com/settings/personal-access-tokens
- Naming convention: `sovereign-glean-readonly-2026-06` (or current month), 90-day expiry
- Read-only scope, sovereign-finance + sovereign-ops-private_sheet repos only
- Operator will paste fresh PAT at next session start — token NEVER stored in memory or in this state file

**MIGRATION_SECRET:** rotated 2026-05-04, currently set in Cloudflare Pages Production env var. Untouched today.

---

## ACTIVE PRINCIPLES (34 locked, all carry forward + OS v1.0 supersedes where conflict)

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
11. Glean is responsible peer, not yes-man — pushes back on drift
12. Each sub-chunk lock includes parity check vs sheet
13. Verify-after-deploy protocol
14. **Full file rewrites only — NO surgical edits** (REINFORCED today, Pattern 19)
15. One file per turn going forward
16. Read existing target file BEFORE writing anything that depends on it
17. When stuck on a render bug, ship instrumented version
18. Delivery Order Rule v2 (applies WITHIN OS Layer 3 ship section)
19. No-Live-Ledger-Test Rule
20. Three-Cache Diagnostic
21. State File Trust-But-Verify
22. GitHub Edit URL Bracket Encoding
23. Honest Target Reality-Check
24. Right-sized audits — full 7-layer for destructive/schema/audit-logic
25. 3 Production Safety Rules (SUPERSEDED by OS Tier 1)
26. **Schema-cite gate** (REINFORCED today, Pattern 20)
27. State File Follow Protocol
28. DOM-cite gate
29. Failed-verify rollback
30. AUDIT DEPTH HONESTY (SCAN vs TRACE vs EXECUTE)
31. CLOUDFLARE CACHE BUST PROTOCOL
32. **D1 PRAGMA CITE OVERRIDES SCHEMA.md** (REINFORCED today)
33. TEST DATA ISOLATION
34. VENDOR OVER CDN

**OS v1.0 (NEW 2026-05-05):** Replaces willpower-based discipline with mechanical gates. Pre-flight checklist mandatory. Ships pass through 4 layers. 5 stop conditions binding. 3 ship tiers with hard caps. 8 operator commands.

---

## RCA SUMMARY — 22 patterns

Pattern 1 — Stale cache cascade
Pattern 2 — Cloudflare Pages routing collision
Pattern 3 — Frontend ID mismatch
Pattern 4 — Silent backend contract drift (CLOSED Part 7)
Pattern 5 — Browser cache as third cache layer
Pattern 6 — State file drift
Pattern 7 — Assumed enum/column/ID values without reading data
Pattern 8 — GitHub edit URL bracket encoding
Pattern 9 — Past-session smoke pollution
Pattern 10 — Aspirational targets need honest reality checks
Pattern 11 — Theater fixes that don't change threat model
Pattern 12 — Audit-depth misrepresentation (SCAN vs TRACE)
Pattern 13 — Cloudflare Pages stale function cache
Pattern 14 — SCHEMA.md drift from D1 reality
Pattern 15 — Test data pollution risk
Pattern 16 — CSP blocks CDN scripts by design
Pattern 17 — Infinite retry loops tax operator attention
**Pattern 18 (Part 8)** — Silent no-op disguised as success (transfer reversal)
**Pattern 19 (Part 8)** — Surgical-edit instructions corrupt files
**Pattern 20 (Part 8)** — Schema assumption without PRAGMA = guaranteed bug
**Pattern 21 (Part 8)** — Same word every layer / no translation tax
**Pattern 22 (Part 8, proposed)** — Destructive batch ops need preview-before-execute mode

---

## OPEN ANOMALIES + DEFERRED POLISH

- 3 bills with null due_day
- TXN-20260503-192349-32150 (Rs 50 cash, 5/3) kept per option C
- Min payment NULL on Alfalah CC
- merchants seeded but EMPTY (Part 7 endpoint+page+UI shipped, awaiting first merchant entry)
- categories.type column NULL for all rows
- 'auto-sms' category exists in categories table (KEPT for next year SMS revival)
- Cloudflare Access on free pages.dev not supported
- **GitHub PAT exposed in chat history today — rotation REQUIRED before next session start**
- Reconciliation diff_amount UI display — backend computes, frontend hides
- /api/transactions GET pagination — won't bite until 500+ txns (currently ~95 post-cleanup)
- Historical audit log entries for bills/budgets/goals/salary BEFORE Part 6 fixes have NULL entity + NULL detail — backfill ship deferred
- **SCHEMA.md needs Part 7 + Part 8 update — merchants/debts/audit_log columns drifted (Pattern 14) + Charts module not documented + Layer 1 spec needs adding**
- Settings table seeded but unused
- Goals contribute uses type='expense' — semantic improvement
- /functions/api/ingest/ folder DELETED from repo (parsers in git history)
- **Charts: bottom-nav doesn't include Charts entry yet (Ship 3 deferred)**
- **Charts: CC_LIMIT hardcoded at Rs 100,000 placeholder (Ship 4 deferred)**
- **Charts: "Daily Spend Heatmap" labeled in HTML but rendered as intensity bar — not true heatmap (Ship 5 deferred)**
- **Sheet → D1 sync broken on CHECK constraint (migrate v1.4 paused, v1.5 fix planned)**
- **May 5 sheet entries missing in D1 (Yusra Bill chain + IBFT 1,150) — ~Rs 2,400 sheet drift on liquid + true_burden until sync runs**
- **Layer 1 spec vocabulary (debt_in/debt_out) contradicted D1 CHECK constraint (borrow/repay) — needs reconciliation in v0.5.1 spec update**

---

## NEXT SESSION START

Activation phrase: type **"boot vault"**

Glean acks with new format: "Project online. Current chunk: Chunk 1 - FINANCE COMPLETE · Status: Sync paused mid-arc · OS v1.0 active · Strikes: 0/2 · Ships budget: 0/8. Active items: [top 3]. Pre-flight mode active for this session — Y/N?"

**Immediate next: Sub-1D-FINANCE-LAYER1-RESUME**
- Pre-flight: read D1 transactions CHECK constraint + verify Layer 1 spec vocabulary needs correction
- Ship 1: migrate-from-sheet v1.5 — drop type translation (passthrough borrow/repay)
- Ship 2: balances.js v0.5.1 — update spec header to align with D1 CHECK as canonical
- Ship 3: run sync, verify against sheet's 5 numbers (target: within Rs 50)
- Ship 4 (optional): Layer 2 — transactions.js POST + reverse.js canonicalization
- Ship 5 (optional): Layer 3 — hub.js + accounts.js show 3 metrics per spec

Then sequence:
6. Sandbox D1 environment (3-ship arc — first arc since reactivation)
7. Pattern 22 dry-run mode for destructive batch ops
8. PDF parser
9. Telegram bot port
10. AI insights
11. Auth layer
12. SCHEMA.md correction ship
13. Final Chunk 1 LOCK + reconcile pass
14. Begin Chunk 2

---

## STATE-SAVE INTEGRITY

This file is the single source of truth for project state.
Updated by: Glean (peer mode, with honest pushback)
Witnessed by: operator confirmation at session end
Save protocol: real-time updates after each major ship batch (per operator request 2026-05-05) + comprehensive end-of-session save.

**OS v1.0 governs how Glean approaches this file:** state file ship is Tier 3 (metadata), pre-flight items 2-4 mandatory, ship template required. Today's EOS save followed full OS protocol.

Next state save: end of next session OR after sync verification + Layer 1 vocabulary reconciliation, whichever comes first.

---

## END OF PART 8

Today's wins: balances.js v0.5.0 (Rs 221k drift → Rs 557 drift, true banking-grade math), GLEAN_OPERATING_SYSTEM.md v1.0 (mechanical discipline framework), 3 memory cleanups (zero conflict drift), Layer 1 finance spec locked.

Today's failures: 4 schema sins on migrate-from-sheet, sync still broken, ~30% ship-success rate (vs OS target 95-98%).

Today's most important shift: from willpower-based discipline (Principle 26 violated 4 times) to mechanical gates (OS pre-flight + visible checklists). Next session is the first real test of OS v1.0 enforcement.

**Halt for the day. Earned it.**
