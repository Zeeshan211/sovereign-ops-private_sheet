# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-04 EOS
**Activation:** "builder online" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: in progress
**Active sub-chunk:** Sub-1D-3-PARITY (NEXT — P0 foundation cleanup before any new features)

---

## ⚠️ HONEST GAP DISCLOSURE (locked 2026-05-04 EOS)

Three real gaps surfaced during Sub-1D-3a. Documenting openly so they don't get lost.

### Gap 1 — Transactions data does NOT match sheet (data layer)
- **Root cause:** Sub-1C migration captured transfers as single rows with `transfer_to_account_id=null` instead of building OUT+IN pair rows like the sheet
- **Effect:** Liquid balance under-counts ~100k. Transfer history visible only as one-sided rows
- **Status:** flagged in original Sub-1C lock as "known partial gap" but never patched
- **Fix planned:** Sub-1C-REPLAY (P1, after parity)

### Gap 2 — Three disconnected entry points + inconsistent delete patterns (UX layer)
- Hub form (`index.html` + `hub.js` v0.0.10) — uses new audit-safe Reverse pattern
- Add page (`add.html` + `add.js` v0.1.0) — older, uses store.js layer
- Transactions page (`transactions.html` + `transactions.js`) — JS rewritten for Reverse, but HTML probably still has Edit/Delete buttons that the JS doesn't touch
- **Effect:** User sees "Reverse" on Hub but "Edit/Delete" on Transactions tab. Edit/Delete likely bypasses snapshot+audit layer = banking-grade-violating
- **Fix planned:** Sub-1D-3-PARITY (P0, NEXT)

### Gap 3 — Vision vs build alignment (meta layer)
- I (Glean) was shipping new features without auditing parity against sheet
- Each sub-chunk verified "does new feature work in isolation" but never "does the website now behave like the sheet"
- **Effect:** Banking-grade SAFETY in place. Banking-grade PARITY with sheet is not
- **Fix planned:** Sub-1D-3-PARITY parity-check baked in

---

## CHUNK 1 PROGRESS LOG

### ✅ Sub-1A — Sheet hardening (DONE earlier)
### ✅ Sub-1B — SMS auto-ingest (DONE earlier)
### ✅ Sub-1C — Cloudflare D1 migration (DONE 2026-05-04)
99 txns + 11 accounts + 6 debts + 6 bills migrated. **Known gap: transfer pair logic missing — see Gap 1**

### ✅ Sub-1D-1a — Safety schema (DONE)
4 D1 tables: audit_log, snapshots, snapshot_data, reconciliation

### ✅ Sub-1D-2a — Categories + Goals + Budgets (DONE)
30 categories, 4 goals, 11 budgets seeded

### ✅ Sub-1D-2b — Audit infrastructure (DONE)
_lib.js helpers · /api/snapshots · /api/transactions audit-wired

### ✅ Sub-1D-2c — Add Transaction form on Hub (DONE)
First write UI live

### ✅ Sub-1D-2d — Reverse transaction (DONE)
Atomic soft-reverse + auto-snapshot + debt restore

### ✅ Sub-1D-2e — Snapshots UI (DONE)
snapshots.html viewer + create form

### ⚠️ Sub-1D-3a — Transfer atomic pair (PARTIAL)
- New pairs created via Hub form work atomically ✅
- Reverse-pair logic in place ✅
- BUT existing 99 historical txns still don't have pair rows (Gap 1)
- AND Add page + Transactions page not yet using same pattern (Gap 2)

### 🔜 Sub-1D-3-PARITY (NEXT — P0 foundation cleanup)
Scope:
1. Read full HTML of transactions.html, debts.html, bills.html, accounts.html, salary.html (haven't actually read these yet — discovered they exist)
2. Decide: retire Hub-inline form OR retire Add page (one polished entry point)
3. Wire Transactions page Edit/Delete to use snapshot+audit pattern (or remove if redundant with Reverse)
4. Audit all txn entry points use same audit-wired POST path
5. Per-account balance reconciliation: declare expected sheet values, compare to D1, document any drift

### 🔜 Sub-1C-REPLAY (P1 — after parity, before features)
Scope:
1. Either re-run File A migration with corrected transfer pair builder
   OR write one-time D1 patch script that walks existing transfer rows + inserts missing IN-half
2. Verify Liquid total now matches sheet ±1k
3. Update SOVEREIGN_STATE with locked numbers

### 🔜 Sub-1D-3b series (P2 — resume after parity + replay)
3b: Mark Bill Paid · 3c: USD/PKR rate · 3d: Salary auto-detect · 3e: CC validation gate

---

## SUB-1D ROADMAP (revised priority)

| Phase | Scope | Status | Priority |
|---|---|---|---|
| 1D-1a | 4 safety tables | ✅ | done |
| 1D-2a | categories/goals/budgets | ✅ | done |
| 1D-2b | _lib + snapshots + audit-wired txns | ✅ | done |
| 1D-2c | Add Txn form on Hub | ✅ | done |
| 1D-2d | Reverse | ✅ | done |
| 1D-2e | Snapshots UI | ✅ | done |
| 1D-3a | Transfer atomic pair (Hub only) | ⚠️ partial | done as far as it goes |
| **1D-3-PARITY** | **Consolidate forms + delete patterns + parity audit** | **NEXT** | **P0** |
| **1C-REPLAY** | **Fix historical transfer pair migration** | pending | **P1** |
| 1D-3b | Mark Bill Paid | pending | P2 |
| 1D-3c | USD/PKR rate API + display | pending | P2 |
| 1D-3d | Salary auto-detect | pending | P2 |
| 1D-3e | CC validation gate | pending | P2 |
| 1D-4a-e | Intl FX · Goals UI · Budget UI · Accounts page polish · Reconciliation dashboard | pending | P3 |
| 1D-5a-e | Color coding · Net Worth fix · Categories endpoint · Verify Suite · Repo hygiene | pending | P3 |

---

## REPO MAP — sovereign-finance (Cloudflare) — VERIFIED 2026-05-04

### Pages
index.html (Hub) · add.html (separate Add Txn) · transactions.html · debts.html · bills.html · accounts.html · salary.html · audit.html · snapshots.html
**Missing:** insights.html (referenced by sidebar — broken link), reconciliation.html, 404.html, hub.html (Hub is index.html)

### JS in /js/
app.js · store.js · theme.js · hub.js (v0.0.10) · audit.js · debts.js · bills.js · transactions.js · snapshots.js · add.js (v0.1.0) · accounts.js · salary.js · insights.js (orphan — html missing)
**Missing:** js/nav.js (referenced by every page header — silent 404)

### CSS in /css/
app.css (design system v0.7.4 · 2,467 lines · 5 themes)

### API in /functions/api/
balances.js · transactions.js (v0.0.10 with linked_txn_id) · debts.js · bills.js · audit.js · snapshots.js · _lib.js
**Missing:** /api/categories endpoint (store.js has hardcoded 12 categories that drift from D1's 30 seeded)

### API in /functions/api/transactions/
reverse.js (v0.0.2 with linked-pair handling)

### API in /functions/api/admin/
migrate-from-sheet.js (Sub-1C, v1.1)

### D1 tables (12 live)
- Original (4): accounts, transactions (with reversed_by, reversed_at, linked_txn_id), debts, bills
- Sub-1D-1a (4): audit_log, snapshots, snapshot_data, reconciliation
- Sub-1D-2a (3): categories, goals, budgets
- Pre-existing (2 unused by app): merchants, settings

---

## REPO MAP — sovereign-ops-private_sheet (Apps Script)

49 files verified across:
- /core (3) · /ai (4) · /webapp (2) · /cockpits (5) · /finance (16) · /audit (6) · /theme-layout (4) · /utils (4) · root (4)

Notable in /finance/: Finance_Pro.gs (1826 lines master) · Sheet_To_D1_Export.gs v1.2

---

## ACCESS PATTERN

Glean reads via `glean_document_reader` with authenticated raw URL, ONE FILE PER CALL:
- Sheet repo: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[FOLDER]/[FILE]`
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
11. **NEW: Glean is a responsible peer, not a yes-man. If operator drifts toward fragmenting work or skipping foundation cleanup for new features, Glean MUST flag it openly with proposed re-prioritization. Operator retains final call but Glean does not silently follow drift.**
12. **NEW: Each sub-chunk lock must include a "parity check" — does the website now behave like the sheet for the feature shipped? Not just "does the new feature work in isolation"**

---

## NEXT SESSION START

Activation: type "builder online"
Glean acks with chunk + sub-chunk position, then auto-starts Sub-1D-3-PARITY without waiting for further instruction.

**Sub-1D-3-PARITY scope (handoff):**
1. Read full content of: transactions.html, debts.html, bills.html, accounts.html, salary.html (these have NOT been read in detail yet)
2. Map every Edit/Delete/action button across all pages — list which use audit pattern, which don't
3. Propose consolidation: which entry points to retire, which to keep, what unified delete pattern looks like
4. Get operator approval on consolidation choice
5. Ship consolidation as 3-5 atomic file commits with verify between each
6. Per-account balance reconciliation: take current D1 numbers, take current sheet numbers, document any drift > 1000 PKR
