# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-04 EOS Part 4 (SCHEMA.md + Pattern 7 codified, schema-cite gate locked)
**Activation:** "boot vault" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: ~85% capability parity / ~96% logic integrity within shipped scope

**This session ships (Part 4):**
- ✅ Sub-1D-FIELD-RECONCILE (balances.js v0.3.1) — `total_liquid_assets` alias added, `store.totals.liquid` no longer undefined
- ✅ Sub-1D-DEBT-TOTAL (balances.js v0.4.2) — `total_debts` + `total_owe` + `debt_count` rolled into response, net_worth subtracts debts. Took 3 ships due to two Pattern 7 violations (assumed schema), recovered.
- ✅ SCHEMA.md (NEW file) — single source of truth for D1 schema. 12 tables documented + REAL DATA section (account IDs, category IDs, status enums, known drifts).

**Banking-grade safety:** maintained (read-only display layer bug, zero data loss during the ~15 min /api/balances 500).

**Net worth surfaces honestly for first time:** -27,710 PKR (was previously inflated by ~123,500 because debts silently treated as zero).

---

## NEXT SESSION FIRST ACTION

Operator picks:
1. **Sub-1D-CATEGORY-RECONCILE** ← NEW priority discovered today. store.js hardcoded categories drift from D1 (groceries vs grocery, debt_payment vs debt, cc_payment vs cc_pay, missing cc_spend/biller/transfer). /add.html sends invalid category_ids silently. ~1-2 ships.
2. **Sub-1D-STORE-OFFLINE-DRAIN** — auto-replay queue on `window.online` event. ~1 ship.
3. **Merchants with auto-rules** — 4-5 ship feature, deferred.
4. **Telegram bot port** — biggest single capability gap, multi-session.
5. **Auth layer** — when ready to share with family. Cloudflare Access on free pages.dev not available; needs custom domain ($10/year) or accept current state.

Glean's recommendation: **Sub-1D-CATEGORY-RECONCILE first.** Reasons: surfaced today, hot context (we have the real category IDs), banking-grade gap (silent invalid writes), 1-2 ship arc.

---

## 🎯 85% / 96% — HONEST SPLIT

**Chunk 1 capability parity vs sheet: ~85%** (slight bump from 84% due to debt totals now flowing into response)
- Telegram bot port (~10% gap), PDF parser (~5%), Charts module (~3%), AI insights (~3%), SMS auto-ingest port (~2%), Merchants with auto-rules (~2%)

**Finance LOGIC integrity within shipped scope: ~96%** (was ~95% at session start)
- Field reconcile + debt totals + ground-truth schema closes more silent gaps
- Remaining 4%: store.js category drift, offline queue auto-drain, GET pagination, reconciliation actuator stub, audit IP capture, historical audit backfill

**Banking-grade safety on txn flow specifically: 100%**

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
| Sub-1D-5d (Reconciliation Stub) | ✅ FULLY DONE |
| Sub-1D-5e (Repo Hygiene) | ✅ DONE |
| Sub-1D-CC-PLAN (CC Payoff Planner) | ✅ FULLY DONE |
| Hub Discoverability v0.7.5 | ✅ DONE |
| Sub-1D-TXFER-FIX (transfer flow) | ✅ FULLY DONE |
| Sub-1D-STORE-HARDEN (4xx vs 5xx) | ✅ FULLY DONE |
| Sub-1D-TXFER-POLISH (URL params) | ✅ FULLY DONE |
| Sub-1D-CC-RECONCILE (liability math) | ✅ FULLY DONE |
| Sub-1D-AUDIT-WIRE (POST audit) | ✅ FULLY DONE |
| Sub-1D-AUDIT-WIRE-2 (REVERSE audit) | ✅ FULLY DONE |
| **Sub-1D-FIELD-RECONCILE NEW** | ✅ **FULLY DONE** |
| **Sub-1D-DEBT-TOTAL NEW (3-ship arc)** | ✅ **FULLY DONE** |
| **SCHEMA.md NEW** | ✅ **FULLY DONE** |
| **Sub-1D-CATEGORY-RECONCILE** | ⏳ **NEXT SESSION PRIORITY** |
| Sub-1D-STORE-OFFLINE-DRAIN | ⏳ next |
| Sub-1D-AUDIT-WIRE-3 (historical backfill) | ⏳ deferred |
| 1D-4c (USD/PKR) | ⏭️ DEFERRED (no non-PKR accounts) |
| 1D-5a (Intl FX) | ⏭️ DEFERRED |
| 1D-5b (ATM pairing) | ⏭️ NOT NEEDED |
| 1D-5c (Merchants) | ⏳ NEXT (full version with auto-rules) |
| Telegram bot port | ⏳ Multi-session |
| PDF parser + full reconciler | ⏳ Multi-session |
| Charts module | ⏳ Whole-module |
| AI insights | ⏳ Needs LLM API |
| Auth layer | ⏳ When ready to share with family |
| Chunk 1 LOCK + reconcile pass | pending after auto-ingest port |

---

## REPO MAP — sovereign-finance (verified 2026-05-04 EOS Part 4)

### Pages (13)
index.html (v0.7.5) · add.html (v0.6.0) · transactions.html ·
debts.html (v0.3.3) · bills.html (v0.9.0) · accounts.html (v0.7.0) ·
salary.html · audit.html · snapshots.html ·
goals.html (v0.1.0) · budgets.html (v0.1.0) · reconciliation.html (v0.1.0) · cc.html (v0.1.0)

### JS in /js/
app.js · store.js (v0.1.0) · theme.js · numbers.js · nav.js (v0.0.7) · hub.js (v0.7.4) ·
add.js (v0.3.0) · transactions.js (v0.7.1) ·
debts.js (v0.4.5) · bills.js (v0.9.0) · accounts.js (v0.7.0) ·
salary.js · audit.js · snapshots.js ·
goals.js (v0.1.0) · budgets.js (v0.1.0) · reconciliation.js (v0.1.0) · cc.js (v0.1.0)

### CSS in /css/
app.css (design system v0.7.4 · ~2,467 lines · 5 themes)

### API in /functions/api/
**balances.js (v0.4.2)** · transactions.js (v0.0.9) · transactions/reverse.js (v0.0.5) ·
debts/[[path]].js (v0.2.0) · bills/[[path]].js (v0.2.0) · accounts/[[path]].js (v0.2.2) ·
goals/[[path]].js (v0.2.0) · budgets/[[path]].js (v0.2.0) ·
salary/[[path]].js (v0.1.0) · reconciliation/[[path]].js (v0.1.0) ·
cc/[[path]].js (v0.1.0) ·
audit.js · snapshots.js · _lib.js · admin/migrate-from-sheet.js (v1.1)

### Repo metadata
.gitignore · _headers · **SCHEMA.md NEW**

### D1 tables (12 live, no schema changes this session)
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
Token expires ~2026-06-04.

---

## ACTIVE PRINCIPLES (locked, all 25 carry forward)

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
18. Delivery Order Rule v2 (see EXPANDED PRINCIPLES below)
19. No-Live-Ledger-Test Rule (see EXPANDED PRINCIPLES below)
20. Three-Cache Diagnostic
21. State File Trust-But-Verify
22. GitHub Edit URL Bracket Encoding
23. Honest Target Reality-Check (Pattern 10 codified)
24. Right-sized audits — full 7-layer for destructive/schema/audit-logic; compressed 3-line risk for routine; none for typo/cosmetic
25. 3 Production Safety Rules (see EXPANDED PRINCIPLES below)
26. **NEW — Schema-cite gate:** any SQL ship MUST first-line cite SCHEMA.md source + columns referenced. Format: `Schema: read SCHEMA.md \`<table>\` section, columns: <col1, col2, col3>`. Operator can challenge if cite looks wrong.

---

## EXPANDED PRINCIPLES — operational detail

### Principle 18 — Delivery Order Rule v2

Every code/file ship: EDIT URL first, then code block, commit message, deploy wait, VERIFY URL, smoke checklist, 3-branch reply (✅/⚠️/❌). Audit + deferred notes go below horizontal rule. Verify URLs before sending. Cut every prose sentence that doesn't justify itself.

### Principle 19 — No Live Ledger Smoke Tests (build-phase)

Through end of Chunk 1: no smoke tests that pollute the real ledger. Verify via deploy-time checks + implicit runtime use. Mandatory smoke tests only for: schema migration with backfill, destructive op without snapshot, cross-table batch, audit_log writing logic, production cron first-fire.

### Principle 25 — 3 Production Safety Rules

A) Cross-module rebuild calls require source verification — read sibling module before calling its rebuild function.
B) Destructive ops need 5-fold defense: pre-flight check, auto-snapshot, confirmation gate, atomic semantics, undo window.
C) Reuse working safety patterns — Finance_Pro v3.0 Snapshot+Vaccine is canonical. Don't invent new safety.

### Principle 6 — Operator Guidance Standard (Cloudflare/GitHub baby-steps)

Always: direct URL not navigation, numbered steps with bold numbers, exact paste text in fenced block above paste step, verification step with expected output, 3-branch reply outcome. Never multi-level breadcrumbs. Max 2 clicks per action.

URL templates: dash.cloudflare.com for D1/Pages, github.com/Zeeshan211/sovereign-finance/new|edit|blob/main/PATH for repo actions.

Patterns: D1 Console (open URL → console tab → paste SQL → execute → verify), GitHub create (new file URL → filename → paste → commit), GitHub edit (edit URL → Ctrl+A delete → paste → commit), Apps Script (left sidebar file → Ctrl+A delete → paste → Ctrl+S → sheet reload → menu).

If operator says "complex" / "baby steps" / "simpler" — rewrite immediately in this pattern. Never argue.

### Principle 26 — Schema-Cite Gate (NEW Part 4)

Locked in memory after 2 Pattern 7 violations in Sub-1D-DEBT-TOTAL ship arc.

Rule: any ship containing SQL against any table MUST output as the FIRST LINE of the message:
