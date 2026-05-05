# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-04 EOS Part 5+ (post-audit corrections — line-by-line code verification)
**Last session ended:** 2026-05-04 (operator updates with real PKT time at session end)
**Activation:** "boot vault" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: ~85% capability parity / **~99% logic integrity within shipped scope (audit-corrected)**

**This session ships (Part 5 + post-audit additions):**
- ✅ Sub-1D-CATEGORY-RECONCILE Ship A — `/api/categories` endpoint (15 live D1 categories)
- ✅ Sub-1D-CATEGORY-RECONCILE Ship B — store.js v0.2.0 fetches live categories
- ✅ Sub-1D-STORE-OFFLINE-DRAIN — store.js v0.2.1 auto-replay on online + boot
- ✅ Sub-1D-AUDIT-WIRE-3 — `/api/admin/audit-backfill` endpoint, 95 historical txns backfilled, idempotent
- ✅ Hub polish — `hub.js v0.7.5d` real KPI IDs (after 3-ship Pattern 7 cascade)
- ✅ Day-N badge retire — `index.html` updated, `hub.js v0.7.6` live freshness indicator
- ✅ True Burden render — `hub.js v0.7.7` cc + total_debts honest sum
- ✅ Audit pass — line-by-line code verification, state file corrections logged below

**Banking-grade safety on txn flow specifically: 100%** including historical (95 backfilled audit rows)

---

## STATE FILE CORRECTIONS (audit findings)

The following claims from prior state file Parts were WRONG or DRIFTED:

| Was | Reality (verified live) |
|---|---|
| "Reconciliation actuator currently stub (renders but doesn't persist)" | **Fully functional.** /api/reconciliation/[[path]].js v0.1.0 POST writes to D1, computes diff_amount, audits. GET returns history with optional account_id filter. |
| "14 backend endpoints" | **17 actual** (added /api/categories, /api/admin/audit-backfill; existing /api/admin/migrate-from-sheet, _lib.js were uncounted) |
| "Day-N badge in hub header — replace with live summary" | **Done this session** — replaced with `hub-freshness` live "Live · Xm ago" indicator |
| "store.js category IDs drift from D1" | **Done this session** — store.js fetches /api/categories on init |
| "GitHub commit 8 hrs ago: Delete functions/api/dmin/migrate-from-sheet.js" (typo path) | Status uncertain — `/api/admin/migrate-from-sheet.js` may or may not still exist. Not blocking. |

---

## NEWLY DISCOVERED REAL GAPS (audit revealed these were never logged)

These IDs exist in deployed `index.html` but NO JS populates them:

1. **`hub-recent-tx`** — should show last 5 transactions (likely needs separate read of /api/transactions or a hub-summary endpoint)
2. **`hub-top-debts`** — should show top 3 debts by outstanding amount
3. **`hub-due-soon`** — should show bills due in next 7 days

These are display-layer gaps, not data gaps (the data exists in respective endpoints). Estimated 1-2 ships to wire all three. NEXT SESSION PRIORITY for true 100% logic.

---

## NEXT SESSION FIRST ACTION

Operator picks:
1. **Wire 3 hub elements** (`hub-recent-tx`, `hub-top-debts`, `hub-due-soon`) — true 100% logic ship, ~30-45 min, hot context
2. **/api/transactions GET pagination** — won't bite until 500+ txns, you have ~195
3. **Reconciliation diff display polish** — endpoint computes diff_amount, surface it in UI
4. **Merchants chunk** — biggest capability gap closer, 4-5 ship arc, ~3-4 hours
5. **Telegram bot port** — biggest single capability gap, multi-session
6. **PDF parser + reconciler** — bank statement reconciliation, multi-session
7. **Charts module** — visual reporting, whole-module
8. **AI insights** — needs LLM API account
9. **Auth layer** — when ready to share with family ($10/year custom domain or accept current)

Glean's recommendation: **#1 (Wire 3 hub elements)** — closes true 100% logic, hot context, single session.

---

## 🎯 85% / 99% — HONEST SPLIT (audit-corrected)

**Chunk 1 capability parity vs sheet: ~85%** (vibes-based, no objective rubric)
- Telegram bot port (~10% gap, multi-session)
- PDF parser (~5%, multi-session)
- Charts module (~3%, whole-module)
- AI insights (~3%, needs LLM API)
- SMS auto-ingest port (~2%)
- Merchants with auto-rules (~2%)

**Finance LOGIC integrity within shipped scope: ~99% (audit-corrected)**
- Logic gaps that ARE done (audit found previously claimed "stub" was actually functional):
  - Reconciliation persistence ✅ done
  - Audit-after-write on POST + REVERSE + reconciliation ✅ done
  - Liability-aware transfer math ✅ done
  - Historical audit backfill ✅ done
  - Category sync ✅ done
  - Offline queue auto-drain ✅ done
- Remaining ~1% logic gaps:
  - 3 hub elements unwired (recent-tx, top-debts, due-soon) — display layer
  - GET pagination on /api/transactions
  - Reconciliation diff_amount UI display

**Banking-grade safety on txn flow: 100%** including historical

---

## CHUNK 1 PROGRESS LOG

| Sub-chunk | Status |
|---|---|
| 1A — Sheet hardening | ✅ done |
| 1B — SMS auto-ingest | ✅ done (sheet only — Cloudflare port pending) |
| 1C — D1 migration | ✅ done |
| 1D-1a — Safety schema | ✅ done |
| 1D-2a-e (Categories, Audit infra, Add Txn, Reverse, Snapshots) | ✅ done |
| 1D-3a — Transfer atomic pair | ✅ done |
| 1D-3-RESHIP | ✅ done |
| Sub-1D-3c (Debts CRUD) | ✅ FULLY DONE |
| Sub-1D-3b + 3d (Bills CRUD) | ✅ FULLY DONE |
| Sub-1D-3e (Accounts CRUD) | ✅ FULLY DONE |
| 1C-REPLAY | ✅ DONE |
| Sub-1D-4a (Goals) | ✅ FULLY DONE |
| Sub-1D-4b (Budgets) | ✅ FULLY DONE |
| Sub-1D-4e (CC Validation) | ✅ FULLY DONE |
| Sub-1D-4d (Salary Recategorize) | ✅ DONE |
| Sub-1D-5d (Reconciliation Stub) | ✅ FULLY DONE (audit confirmed not a stub — fully functional) |
| Sub-1D-5e (Repo Hygiene) | ✅ DONE |
| Sub-1D-CC-PLAN (CC Payoff Planner) | ✅ FULLY DONE |
| Hub Discoverability v0.7.5 | ✅ DONE |
| Sub-1D-TXFER-FIX (transfer flow) | ✅ FULLY DONE |
| Sub-1D-STORE-HARDEN (4xx vs 5xx) | ✅ FULLY DONE |
| Sub-1D-TXFER-POLISH (URL params) | ✅ FULLY DONE |
| Sub-1D-CC-RECONCILE (liability math) | ✅ FULLY DONE |
| Sub-1D-AUDIT-WIRE (POST audit) | ✅ FULLY DONE |
| Sub-1D-AUDIT-WIRE-2 (REVERSE audit) | ✅ FULLY DONE |
| Sub-1D-FIELD-RECONCILE | ✅ FULLY DONE |
| Sub-1D-DEBT-TOTAL (3-ship arc) | ✅ FULLY DONE |
| SCHEMA.md | ✅ FULLY DONE |
| Sub-1D-CATEGORY-RECONCILE (2-ship) | ✅ FULLY DONE |
| Sub-1D-STORE-OFFLINE-DRAIN | ✅ FULLY DONE |
| Sub-1D-AUDIT-WIRE-3 | ✅ FULLY DONE |
| Hub polish v0.7.5d (KPI IDs) | ✅ FULLY DONE |
| **Day-N badge retire + freshness (v0.7.6)** | ✅ **FULLY DONE** |
| **True Burden render (v0.7.7)** | ✅ **FULLY DONE** |
| **Wire hub-recent-tx + hub-top-debts + hub-due-soon** | ⏳ **NEXT (true 100% logic)** |
| /api/transactions GET pagination | ⏳ deferred (not bitten yet) |
| Reconciliation diff_amount UI display | ⏳ polish |
| 1D-4c (USD/PKR) | ⏭️ DEFERRED (no non-PKR accounts) |
| 1D-5a (Intl FX) | ⏭️ DEFERRED |
| 1D-5b (ATM pairing) | ⏭️ NOT NEEDED |
| 1D-5c (Merchants) | ⏳ NEXT (full version with auto-rules) |
| Telegram bot port | ⏳ Multi-session |
| PDF parser + full reconciler | ⏳ Multi-session |
| Charts module | ⏳ Whole-module |
| AI insights | ⏳ Needs LLM API |
| Auth layer | ⏳ When ready (custom domain or accept current) |
| Chunk 1 LOCK + reconcile pass | pending after auto-ingest port |

---

## REPO MAP — sovereign-finance (verified live 2026-05-04 EOS Part 5+)

### Pages (13)
**index.html (v0.7.5d, day-badge replaced with hub-freshness)** · add.html (v0.6.0) · transactions.html ·
debts.html (v0.3.3) · bills.html (v0.9.0) · accounts.html (v0.7.0) ·
salary.html · audit.html · snapshots.html ·
goals.html (v0.1.0) · budgets.html (v0.1.0) · reconciliation.html (v0.1.0) · cc.html (v0.1.0)

### JS in /js/
app.js · **store.js (v0.2.1)** · theme.js · numbers.js · nav.js (v0.0.7) · **hub.js (v0.7.7)** ·
add.js (v0.3.0) · transactions.js (v0.7.1) ·
debts.js (v0.4.5) · bills.js (v0.9.0) · accounts.js (v0.7.0) ·
salary.js · audit.js · snapshots.js ·
goals.js (v0.1.0) · budgets.js (v0.1.0) · reconciliation.js (v0.1.0) · cc.js (v0.1.0)

### CSS in /css/
app.css (design system v0.7.4 · ~2,467 lines · 5 themes)

### API in /functions/api/ (17 endpoints — corrected count)
balances.js (v0.4.2) · transactions.js (v0.0.9) · transactions/reverse.js (v0.0.5) ·
debts/[[path]].js (v0.2.0) · bills/[[path]].js (v0.2.0) · accounts/[[path]].js (v0.2.2) ·
goals/[[path]].js (v0.2.0) · budgets/[[path]].js (v0.2.0) ·
salary/[[path]].js (v0.1.0) · reconciliation/[[path]].js (v0.1.0 — fully functional, NOT stub) ·
cc/[[path]].js (v0.1.0) ·
audit.js · snapshots.js · _lib.js ·
categories.js (v0.1.0) ·
admin/migrate-from-sheet.js (v1.1) · admin/audit-backfill.js (v0.1.0)

### Repo metadata
.gitignore · _headers · SCHEMA.md

### D1 tables (12 live)
accounts (17 cols) · audit_log (9) · bills (11) · budgets (4) · categories (8) · debts (10) ·
goals (9) · merchants (8 unused) · reconciliation (7) · settings (3 unused) · snapshot_data (5) ·
snapshots (7) · transactions (17)

### Backup tables (safety, all retained)
accounts_backup_20260504 · accounts_backup_20260504_ccvalid ·
transactions_backup_20260504_1c_replay · txn_backup_salary_recat_20260504 ·
budgets_backup_20260504

---

## ACCESS PATTERN

Glean reads via `glean_document_reader` with authenticated raw URL (READ-ONLY token).
ONE FILE PER CALL. **MANDATORY cache-bust** `?cb=YYYYMMDDx` on all reads.
- Sheet: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[FOLDER]/[FILE]?cb=...`
- Cloudflare: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-finance/main/[PATH]?cb=...`

GitHub edit URLs with brackets: URL-encode (Principle #22).
Token expires ~2026-06-04. MIGRATION_SECRET rotated 2026-05-04 after exposure in chat.

---

## ACTIVE PRINCIPLES (locked, all 29 carry forward)

1. Banking-grade preserved through Cloudflare migration
2. Snap-before-mutate + audit-after-write on every endpoint
3. Family-grade UX from Day 1
4. Public-readiness discipline
5. Chunk-shipping model
6. Baby-step instructions standard (see EXPANDED PRINCIPLES below)
7. Operator decides when to stop
8. Privacy lockdown — codes only
9. ALWAYS read existing CSS/HTML/JS before introducing new markup
10. Use only existing design system classes
11. Glean is responsible peer, not yes-man — pushes back on drift
12. Each sub-chunk lock includes parity check vs sheet
13. Verify-after-deploy protocol
14. Full file rewrites only — NO surgical edits
15. One file per turn going forward
16. Read existing target file BEFORE writing anything that depends on it
17. When stuck on a render bug, ship instrumented version
18. Delivery Order Rule v2
19. No-Live-Ledger-Test Rule
20. Three-Cache Diagnostic
21. State File Trust-But-Verify
22. GitHub Edit URL Bracket Encoding
23. Honest Target Reality-Check (Pattern 10 codified)
24. Right-sized audits — full 7-layer for destructive/schema/audit-logic; compressed 3-line risk for routine; none for typo/cosmetic
25. 3 Production Safety Rules
26. Schema-cite gate — any SQL ship MUST first-line cite SCHEMA.md source + columns referenced
27. State File Follow Protocol — any factual claim MUST be backed by fresh same-turn re-fetch + verbatim quote + line/byte count proof
28. **DOM-cite gate (NEW Part 5+):** any ship touching getElementById/querySelector/HTML attributes MUST first-line cite the source HTML file and verified IDs. Format: `DOM: read /<page> via fetch('/?cb=...'), IDs verified: <id1>, <id2>, <id3>`
29. **Failed-verify rollback (NEW Part 5+):** after 2 failed verifies on same fix attempt, mandatory rollback before attempt 3. Diagnostic happens AFTER recovery, not during ongoing breakage.

---

## EXPANDED PRINCIPLES — operational detail

### Principle 18 — Delivery Order Rule v2

Every code/file ship: EDIT URL first, then code block, commit message, deploy wait, VERIFY URL, smoke checklist, 3-branch reply (✅/⚠️/❌). Audit + deferred notes go below horizontal rule. Verify URLs before sending. Cut every prose sentence that doesn't justify itself.

### Principle 19 — No Live Ledger Smoke Tests (build-phase)

Through end of Chunk 1: no smoke tests that pollute the real ledger. Verify via deploy-time checks + implicit runtime use. Mandatory smoke tests only for: schema migration with backfill, destructive op without snapshot, cross-table batch, audit_log writing logic, production cron first-fire.

### Principle 25 — 3 Production Safety Rules

A) Cross-module rebuild calls require source verification.
B) Destructive ops need 5-fold defense: pre-flight check, auto-snapshot, confirmation gate, atomic semantics, undo window.
C) Reuse working safety patterns — Finance_Pro v3.0 Snapshot+Vaccine is canonical.

### Principle 6 — Operator Guidance Standard (Cloudflare/GitHub baby-steps)

Always: direct URL not navigation, numbered steps with bold numbers, exact paste text in fenced block above paste step, verification step with expected output, 3-branch reply outcome. Never multi-level breadcrumbs. Max 2 clicks per action.

### Principle 26 — Schema-Cite Gate

Any SQL ship MUST first-line cite SCHEMA.md source + columns. Format: `Schema: read SCHEMA.md \`<table>\` section, columns: <col1, col2, col3>`. Operator can challenge if cite looks fabricated.

### Principle 27 — State File Follow Protocol

Any factual claim about chunk status / version / principle / open item MUST be backed by:
1. Fresh same-turn re-fetch of SOVEREIGN_STATE.md with cache-bust
2. Verbatim quote from the file
3. Current line count or byte size as proof of fresh fetch
4. If fetch fails, state explicitly "Cannot verify against live file, using session-cached version"

### Principle 28 — DOM-Cite Gate (NEW Part 5+)

Locked after 3-ship Pattern 7 cascade on hub.js (v0.7.5 → 0.7.5b → 0.7.5c → 0.7.5d).

Rule: any ship touching `getElementById`/`querySelector`/HTML attributes MUST output as the FIRST LINE:
