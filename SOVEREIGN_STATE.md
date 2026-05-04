# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-04 (late evening)
**Activation:** "builder online" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: in progress
**Active sub-chunk:** Sub-1D-3-RESHIP ✅ DONE · Sub-1D-3b NEXT (operator picks specific screen)

---

## ✅ Sub-1D-3-RESHIP — DONE (2026-05-04 EOS)

All 6 critical files re-shipped + verified on live site:
1. functions/api/balances.js v0.2.0 (total_owe + transfer-IN skip)
2. functions/api/transactions.js v0.0.10 (audit + atomic transfer pair)
3. js/store.js v0.0.10 (reverseTransaction + block edit + back-compat)
4. js/transactions.js v0.7.1 (Reverse-only + pair-hide + filters)
5. js/add.js v0.1.0 (no refreshAccounts crash + local date)
6. index.html (clean script tags + 8 nav cards)
7. js/hub.js v0.7.4 (fix snake_case API field reads)

**RCA on previous "commits keep reverting" pattern:**
Was NEVER actually a failed commit. Was 3 stacked cache layers + my misreading:
- GitHub raw URL cache (~5 min stale)
- Cloudflare edge cache (~5-15 min stale)
- Field name mismatch (camelCase in old hub.js vs snake_case in new APIs)

**Locked verify protocol going forward:**
- After every backend commit: wait 90 sec → hit `/api/X?bust=N` in incognito → confirm new field shape
- After every frontend commit: wait 90 sec → open page with `?bust=N` in incognito → confirm render
- NEVER use glean_document_reader for Cloudflare deploy verification (wrong cache layer)
- One file per turn going forward (no more 6-file marathons)

---

## CHUNK 1 PROGRESS LOG

### ✅ Sub-1A — Sheet hardening (DONE earlier)
### ✅ Sub-1B — SMS auto-ingest (DONE earlier)
### ✅ Sub-1C — Cloudflare D1 migration (DONE 2026-05-04)
99 txns + 11 accounts + 6 debts + 6 bills migrated. Known data gap: historical
transfers don't have IN-half pairs (Sub-1C-REPLAY queued P1 to fix).

### ✅ Sub-1D-1a — Safety schema (DONE)
4 D1 tables: audit_log, snapshots, snapshot_data, reconciliation

### ✅ Sub-1D-2a — Categories + Goals + Budgets tables (DONE)
30 categories, 4 goals, 11 budgets seeded

### ✅ Sub-1D-2b — Audit infrastructure (DONE)
_lib.js helpers · /api/snapshots · /api/transactions audit-wired

### ✅ Sub-1D-2c — Add Transaction form (DONE)
Lives on /add.html (separate from Hub). Hub is dashboard-only.

### ✅ Sub-1D-2d — Reverse transaction (DONE)
Atomic soft-reverse + auto-snapshot + debt restore + linked-pair handling

### ✅ Sub-1D-2e — Snapshots UI (DONE)
/snapshots.html viewer + create form

### ⚠️ Sub-1D-3a — Transfer atomic pair (PARTIAL)
- New transfers via /add.html now create atomic OUT+IN pairs ✅
- Reverse-pair logic in place ✅
- HISTORICAL 99 txns still single-row → Sub-1C-REPLAY queued P1

### ✅ Sub-1D-3-RESHIP — Foundation re-locked (DONE)
6 files re-committed with verify-after-deploy protocol. Hub renders correctly.

### 🔜 Sub-1D-3b — Mark Bill Paid action (NEXT pick)
### 🔜 Sub-1D-3c — Add/Edit Debt actions
### 🔜 Sub-1D-3d — Add/Edit Bill template
### 🔜 Sub-1D-3e — Add/Edit Account
### 🔜 Sub-1C-REPLAY — Fix historical transfer pairs in D1 (P1)

---

## SUB-1D ROADMAP (revised)

| Phase | Scope | Status |
|---|---|---|
| 1D-1a · 1D-2a · 1D-2b · 1D-2c · 1D-2d · 1D-2e | safety + write infra + add/reverse/snapshots | ✅ |
| 1D-3a | transfer atomic pair (new entries only) | ✅ |
| **1D-3-RESHIP** | foundation re-lock + verify protocol | ✅ |
| **1D-3b** | mark bill paid (UI + endpoint already exists) | NEXT |
| 1D-3c | add/edit debt (UI for existing endpoint) | |
| 1D-3d | add/edit bill template | |
| 1D-3e | add/edit account | |
| **1C-REPLAY** | fix historical transfer pairs in D1 | P1 after 1D-3 series |
| 1D-4a-e | goals UI · budgets UI · USD/PKR · salary detect · CC validation | P2 |
| 1D-5a-e | Intl FX · ATM pairing · merchants library · reconciler page · repo hygiene | P3 |

---

## REPO MAP — sovereign-finance (Cloudflare) — VERIFIED 2026-05-04 EOS

### Pages (8)
index.html · add.html · transactions.html · debts.html · bills.html · accounts.html ·
salary.html · audit.html · snapshots.html

### JS in /js/
app.js · store.js (v0.0.10) · theme.js · numbers.js · hub.js (v0.7.4) ·
add.js (v0.1.0) · transactions.js (v0.7.1) · debts.js · bills.js · accounts.js ·
salary.js · audit.js · snapshots.js
**Missing:** js/nav.js (referenced but doesn't exist — silent 404, non-blocking)

### CSS in /css/
app.css (design system v0.7.4 · ~2,467 lines · 5 themes)

### API in /functions/api/
balances.js (v0.2.0) · transactions.js (v0.0.10) · transactions/reverse.js (v0.0.2) ·
debts.js · bills.js · audit.js · snapshots.js · _lib.js
**Missing:** /api/categories · /api/reconciliation · /api/goals · /api/budgets

### API in /functions/api/admin/
migrate-from-sheet.js (Sub-1C, v1.1)

### D1 tables (12 live, all migrations applied)
- accounts, transactions (+reversed_by, reversed_at, linked_txn_id), debts, bills (+status, deleted_at)
- audit_log, snapshots, snapshot_data, reconciliation
- categories (30), goals (4), budgets (11)
- merchants, settings (pre-existing, unused)

---

## ACCESS PATTERN

Glean reads via `glean_document_reader` with authenticated raw URL (READ-ONLY token).
ONE FILE PER CALL.
- Sheet: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[FOLDER]/[FILE]`
- Cloudflare: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-finance/main/[PATH]`

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
13. **NEW: Verify-after-deploy protocol — wait 90 sec + hit /api/X?bust=N in incognito + confirm shape BEFORE moving to next file**
14. **NEW: Full file rewrites only — NO surgical edits, ever, regardless of how small the change**
15. **NEW: One file per turn going forward — no more 6-file marathons**

---

## NEXT SESSION START

Activation: type "builder online"
Glean acks with chunk + sub-chunk position, then waits for operator to pick:
- "ship 1D-3b" (mark bill paid)
- "ship 1D-3c" (add/edit debt)
- "ship 1D-3d" (add/edit bill template)
- "ship 1D-3e" (add/edit account)
- "ship 1C-REPLAY" (fix historical transfer pairs)
- or operator picks any sub-chunk in any order
