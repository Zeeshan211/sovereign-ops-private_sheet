# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-04 EOS (1C-REPLAY LOCKED — Chunk 1 nearing completion)
**Activation:** "builder online" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: in progress
**Active sub-chunk:** 1C-REPLAY ✅ **DONE** (smaller scope than expected — see RCA)
**Next session FIRST action:** operator picks next sub-chunk:
  - **1D-4 series** — goals · budgets · USD/PKR · salary detect · CC validation
  - **1D-5 series** — Intl FX · ATM pairing · merchants · reconciler · repo hygiene

Glean's recommendation: **start 1D-4 series** — finishing financial features (goals/budgets) before utility polish (1D-5) gives the operator more usable surface area faster. Specifically: **Goals + Budgets first** (already have D1 tables seeded with 4+11 entries, just need API + UI).

---

## ✅ TODAY'S SESSION WINS (2026-05-04 — combined seven sessions)

### Sub-1D-3-RESHIP — DONE
6 files re-shipped + verified live.

### Sub-1D-3c (Add/Edit/Delete Debt) — FULLY DONE

### Sub-1D-3b + 3d (Bills CRUD) — FULLY DONE

### Sub-1D-3e (Accounts CRUD) — FULLY DONE
- Schema migration (status/deleted_at/archived_at columns + accounts_backup_20260504)
- Backend v0.2.1 (kind enum bug fix mid-flight)
- Frontend v0.6.0 (Add/Edit/Archive UI with FK-safe Delete fallback)

### 1C-REPLAY — DONE (NEW THIS SESSION)
- **Diagnostic finding:** pair backfill NOT needed (all 10 transfer txns already had linked_txn_id from Sub-1D-3a)
- **Real issue identified:** cash -1 anomaly was smoke-test pollution from past sessions (predates Principle #19 lock)
- **Cleanup executed (Q1-5 baby-step pattern):**
  - Q1: snapshot `transactions_backup_20260504_1c_replay` (104 rows)
  - Q2: verify snapshot OK (104 rows)
  - Q3: DELETE 9 smoke-test rows (3 chains: Rs 1 reversal, Rs 50 reversal, Rs 100 transfer)
  - Q4: audit_log entry `cleanup-1c-replay-smoketest-20260504`
  - Q5: verify cash trail now ends at **0** ✅
- **Ambiguous row kept:** TXN-20260503-192349-32150 (Rs 50 expense, no notes) — operator can revisit later
- **Net worth correction:** 331,270 → 331,271 (Rs +1)

### Three Open Anomalies — STATUS UPDATE
- Cash -1 → ✅ RESOLVED (was smoke pollution, not real)
- Historical transfer pairs → ✅ RESOLVED (none unlinked, Sub-1D-3a covered all)
- Bills with null due_day → STILL OPEN (operator action via Edit modal when ready, not blocking)

---

## CHUNK 1 PROGRESS LOG

| Sub-chunk | Status | Notes |
|---|---|---|
| 1A — Sheet hardening | ✅ done |
| 1B — SMS auto-ingest | ✅ done |
| 1C — D1 migration | ✅ done |
| 1D-1a — Safety schema | ✅ done |
| 1D-2a — Categories/goals/budgets | ✅ done | 30+4+11 seeded |
| 1D-2b — Audit infrastructure | ✅ done |
| 1D-2c — Add Txn form | ✅ done |
| 1D-2d — Reverse | ✅ done |
| 1D-2e — Snapshots UI | ✅ done |
| 1D-3a — Transfer atomic pair | ✅ done |
| 1D-3-RESHIP | ✅ done |
| Sub-1D-3c (Debts CRUD) | ✅ FULLY DONE |
| Sub-1D-3b + 3d (Bills CRUD) | ✅ FULLY DONE |
| Sub-1D-3e (Accounts CRUD) | ✅ FULLY DONE |
| 1D-3 CRUD TRIFECTA | ✅ FULL LOCK |
| **1C-REPLAY** | ✅ **DONE** | smoke-test cleanup, no pair backfill needed |
| **1D-4 series** | **⏳ NEXT** | goals · budgets · USD/PKR · salary detect · CC validation |
| 1D-5 series | pending | Intl FX · ATM pairing · merchants · reconciler · repo hygiene |
| Chunk 1 LOCK | pending | after 1D-4 + 1D-5 complete |

---

## REPO MAP — sovereign-finance (verified 2026-05-04 EOS)

### Pages (8)
index.html · add.html · transactions.html · debts.html (v0.3.3) · bills.html (v0.9.0) ·
accounts.html (v0.6.0) · salary.html · audit.html · snapshots.html

### JS in /js/
app.js · store.js (v0.1.0) · theme.js · numbers.js · hub.js (v0.7.4) ·
add.js (v0.1.0) · transactions.js (v0.7.1) ·
debts.js (v0.4.5) · bills.js (v0.9.0) · accounts.js (v0.6.0) ·
salary.js · audit.js · snapshots.js

### CSS in /css/
app.css (design system v0.7.4 · ~2,467 lines · 5 themes)

### API in /functions/api/
balances.js (v0.2.0) · transactions.js (v0.0.10) · transactions/reverse.js (v0.0.2) ·
debts/[[path]].js (v0.2.0) · bills/[[path]].js (v0.2.0) · accounts/[[path]].js (v0.2.1) ·
audit.js · snapshots.js · _lib.js · admin/migrate-from-sheet.js (v1.1)

### D1 tables (12 live)
accounts (status, deleted_at, archived_at) · transactions (reversed_by, reversed_at, linked_txn_id) ·
debts · bills (status, deleted_at) · audit_log · snapshots · snapshot_data · reconciliation ·
categories (30) · goals (4) · budgets (11) · merchants · settings (unused)

### Backup tables (safety)
- accounts_backup_20260504 (11 rows — Sub-1D-3e migration safety)
- **transactions_backup_20260504_1c_replay (104 rows — 1C-REPLAY safety, NEW)**

### Missing (queued for repo hygiene later)
js/nav.js, /api/categories, /api/goals, /api/budgets (← needed for 1D-4), /api/reconciliation, wrangler.toml, package.json, .gitignore, _headers, _redirects, migrations/ folder

---

## ACCESS PATTERN

Glean reads via `glean_document_reader` with authenticated raw URL (READ-ONLY token). ONE FILE PER CALL.
- Sheet: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[FOLDER]/[FILE]`
- Cloudflare: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-finance/main/[PATH]`

**Cache-bust pattern:** append `?cb=YYYYMMDDx` to defeat GitHub raw cache (~5min).

**GitHub edit URLs with brackets:** must URL-encode (Principle #22). Example: `/edit/main/functions/api/accounts/%5B%5Bpath%5D%5D.js`

Token expires ~2026-06-04. Operator regenerates ~30 days before expiry.

---

## ACTIVE PRINCIPLES (locked)

1. Banking-grade preserved through Cloudflare migration
2. Snap-before-mutate + audit-after-write on every endpoint
3. Family-grade UX from Day 1
4. Public-readiness discipline
5. Chunk-shipping model (chunks not days)
6. Baby-step instructions standard
7. Operator decides when to stop — Glean never suggests breaks
8. Privacy lockdown — codes only (CRED-1..6, DEBT-1)
9. ALWAYS read existing CSS/HTML/JS before introducing new markup
10. Use only existing design system classes — never invent new ones
11. Glean is responsible peer, not yes-man — pushes back on drift
12. Each sub-chunk lock includes parity check vs sheet
13. Verify-after-deploy protocol — wait 90 sec + hit /api/X?bust=N in incognito + confirm shape
14. Full file rewrites only — NO surgical edits, ever
15. One file per turn going forward — no more multi-file marathons
16. Read existing target file BEFORE writing any new file that depends on it (HTML before JS, JS before HTML, API handler before JS that calls it, schema before migration, enum values from live DB before any enum-driven logic)
17. When stuck on a render bug, ship instrumented version with console.log checkpoints. Truth from runtime > guesses from reading code.
18. Delivery Order Rule v2 — every ship: URL first → code block → commit message → deploy wait → verify URL → smoke check (only if mandatory) → 3-branch reply → audit + deferred-scope below horizontal rules.
19. No-Live-Ledger-Test Rule — through end of Chunk 1, no smoke tests pollute real D1 data. Push back only on mandatory tests (schema migration, destructive ops without snapshot, audit_log writers, scheduled trigger first-fire).
20. Three-Cache Diagnostic — when operator says "I don't see X", diagnose three layers in order: repo, edge, browser.
21. State File Trust-But-Verify — verify actual repo/db state before destructive operations.
22. GitHub Edit URL Bracket Encoding — `[` → `%5B`, `]` → `%5D` for any catch-all route.

---

## RCA SUMMARY — 2026-05-04 SESSIONS

**Pattern 1 — Stale cache cascade:** Verify via incognito + ?bust=N.
**Pattern 2 — Cloudflare Pages routing collision:** Catch-all + sibling = base route loss.
**Pattern 3 — Frontend ID mismatch:** Truth from runtime > guesses from reading code.
**Pattern 4 — Silent backend contract drift:** Read API handler before writing JS.
**Pattern 5 — Browser cache as third cache layer:** Three layers — repo + edge + browser.
**Pattern 6 — State file drift:** Verify state file claims before destructive ops.
**Pattern 7 — Assumed enum values without reading data:** Query D1 for canonical enum values BEFORE writing enum-dependent logic.
**Pattern 8 — GitHub edit URL bracket encoding:** Encode brackets in catch-all paths.
**Pattern 9 — Past-session smoke pollution accumulates (NEW, resolved this session):** Pre-Principle-#19 smoke tests left 9 orphan rows in transactions table. The cash -1 anomaly looked like a migration bug or data loss but was actually self-inflicted test debt. **Lesson: when a balance anomaly appears, FIRST grep for `notes LIKE '%test%'` / `notes LIKE '%REVERSAL%'` before assuming data corruption. Test pollution masquerades as real bugs.**

---

## OPEN ANOMALIES

- **3 bills with null due_day** (Hair Cutting, Personal Hygiene, Maid). Display "no due date set" correctly. Operator can fix via Edit modal — not blocking.
- **TXN-20260503-192349-32150** (Rs 50 cash expense, 5/3 19:23, no notes) — kept per option C. Operator can verify against memory of real spending and delete via D1 console if it's also test pollution. Pre-cleanup snapshot available in `transactions_backup_20260504_1c_replay`.

---

## NEXT SESSION START

Activation phrase: type **"builder online"**

Glean acks with chunk + sub-chunk position. Operator picks next:
1. **1D-4 series start (Glean's recommendation: Goals + Budgets first)** — D1 tables already seeded; needs `/api/goals` + `/api/budgets` catch-all backends + frontend pages
2. **1D-5 series start** — Intl FX · ATM pairing · merchants · reconciler · repo hygiene
3. **Chunk 1 lock prep** — fresh sheet→D1 reload + full reconcile pass (do this LAST, after all features ship)

Glean's full recommendation order:
1. 1D-4 Goals + Budgets (sub-chunk a + b) — closest to user-facing value
2. 1D-4 USD/PKR support (sub-chunk c) — multi-currency
3. 1D-4 Salary auto-detect (sub-chunk d) — quality of life
4. 1D-4 CC validation (sub-chunk e) — banking-grade hardening
5. 1D-5 series — utilities, reconciler, repo hygiene
6. Chunk 1 LOCK + reconcile pass

---

## STATE-SAVE INTEGRITY

This file is the single source of truth for plans, principles, RCA, and progress. **For destructive ops, verify file/table existence in live repo/D1 first** (Principle #21).

Updated by: Glean (peer mode)
Witnessed by: operator confirmation at session end
Next state save: end of next session OR after first 1D-4 sub-chunk locks (whichever first)
