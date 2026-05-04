# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-04 EOS (Sub-1D-3e LOCKED — full 1D-3 CRUD trifecta complete)
**Activation:** "builder online" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: in progress
**Active sub-chunk:** Sub-1D-3e (Accounts CRUD) ✅ **FULLY DONE** — full 1D-3 CRUD trifecta complete (debts ✅ + bills ✅ + accounts ✅)
**Next session FIRST action:** operator picks next sub-chunk:
  - **1C-REPLAY** — fix historical transfer pairs + cash -1 anomaly (long-standing P1, recommended next)
  - **1D-4 series start** — goals · budgets · USD/PKR · salary detect · CC validation
  - **1D-5 series** — Intl FX · ATM pairing · merchants · reconciler · repo hygiene

Glean's recommendation: **1C-REPLAY next** — historical data integrity (transfer pair backfill + cash -1 reconciliation) blocks accurate reporting downstream. Best done now while context is fresh on 1D-3 patterns.

---

## ✅ TODAY'S SESSION WINS (2026-05-04 — combined six sessions)

### Sub-1D-3-RESHIP — DONE
6 files re-shipped + verified live.

### Sub-1D-3c (Add/Edit/Delete Debt) — FULLY DONE
- F3 (render): debts.js v0.4.3
- F4 (Add): debts.html v0.3.2 + debts.js v0.4.4 + Pay date bug fix
- F5 (Edit/Delete): debts.html v0.3.3 + debts.js v0.4.5

### Sub-1D-3b + 3d (Bills CRUD) — FULLY DONE
- Backend: `bills/[[path]].js` v0.2.0 (full CRUD + pay)
- Frontend: bills.html v0.9.0 + bills.js v0.9.0
- Old `bills.js` was already absent (Principle #21 verification saved a wasted ship)

### Sub-1D-3e (Accounts CRUD) — FULLY DONE (NEW THIS SESSION)
- **Schema migration:** Added `status`, `deleted_at`, `archived_at` columns to accounts table (atomic backup → ALTER → backfill → verify, all 11 accounts active post-migration)
- **Backend Ship 2:** `accounts/[[path]].js` v0.2.0 — full CRUD + Archive + Unarchive endpoints with FK-safe smart Delete
- **Backend Ship 2.1 (bug fix):** v0.2.1 — kind enum corrected (cc not credit_card, wallet not ewallet); net worth fix (was overstated by ~157k due to wrong CC categorization). Caught by verify-after-deploy step. Pattern 4 by me.
- **Old file delete:** `functions/api/accounts.js` v0.0.7 deleted (Principle #21 verified existence first; Pattern 2 risk was real this time vs bills where it was absent)
- **Frontend HTML:** `accounts.html` v0.6.0 — Day-N badge retired, Add modal, Edit modal (with Archive + Delete buttons inside), Archived section toggle
- **Frontend JS:** `accounts.js` v0.6.0 — wired Add/Edit/Archive/Unarchive/Delete · ✏️ buttons per row · 409 FK-refs handler auto-offers Archive fallback · live summary text · session-cache for archived listing (backend doesn't list archived yet)

### Schema migration safety win
Per Principle #19 (no-live-ledger-test), schema migration is mandatory-test territory. Used baby-step pattern: backup table first → additive ALTERs only (no drops/renames) → backfill defensive → verify schema → verify data. All 11 accounts intact post-migration. Backup table `accounts_backup_20260504` retained for safety.

### Pattern 7 — assumed enum values without reading data (NEW lesson, captured)
Bug in accounts/[[path]].js v0.2.0: I assumed kind values would be `credit_card` and `ewallet` based on common conventions. Actual D1 values were `cc` and `wallet`. Result: net worth overstated by 157k (CC added to assets instead of subtracted), wallet total showed 0 despite 92k in Easypaisa. Caught by verify-after-deploy ONLY because totals math was easy to spot-check. **Lesson: when introducing/touching enum-driven logic, query D1 first for the canonical values: `SELECT DISTINCT kind FROM accounts;` — never assume.**

### Pattern 8 — GitHub edit URL bracket encoding (NEW, captured)
GitHub's `/edit/main/path/[[path]].js` 404s because raw brackets break URL parsing. Must encode: `[` → `%5B`, `]` → `%5D`. Affects all catch-all route files: `debts/[[path]].js`, `bills/[[path]].js`, `accounts/[[path]].js`, and any future ones. Working pattern: `/edit/main/functions/api/accounts/%5B%5Bpath%5D%5D.js`

---

## CHUNK 1 PROGRESS LOG

| Sub-chunk | Status | Notes |
|---|---|---|
| 1A — Sheet hardening | ✅ done | banking-grade sheet at 100/100 |
| 1B — SMS auto-ingest | ✅ done | Telegram bot + bank/CC parsing |
| 1C — D1 migration | ✅ done | 99 txns + 11 acc + 6 debts + 6 bills |
| 1D-1a — Safety schema | ✅ done | 4 tables: audit_log, snapshots, snapshot_data, reconciliation |
| 1D-2a — Categories/goals/budgets | ✅ done | 30+4+11 seeded |
| 1D-2b — Audit infrastructure | ✅ done | _lib + audit + snapshots APIs |
| 1D-2c — Add Txn form | ✅ done | /add.html |
| 1D-2d — Reverse | ✅ done | atomic + audit + debt restore |
| 1D-2e — Snapshots UI | ✅ done | /snapshots.html |
| 1D-3a — Transfer atomic pair | ✅ done | new entries paired (historical → 1C-REPLAY) |
| 1D-3-RESHIP | ✅ done + verified live | foundation re-locked |
| Sub-1D-3c (Debts CRUD) | ✅ FULLY DONE | full CRUD + pay live |
| Sub-1D-3b + 3d (Bills CRUD) | ✅ FULLY DONE | backend v0.2.0 + html v0.9.0 + js v0.9.0 |
| **Sub-1D-3e (Accounts CRUD)** | ✅ **FULLY DONE** | schema migrated + backend v0.2.1 + html v0.6.0 + js v0.6.0 |
| **1D-3 CRUD TRIFECTA** | ✅ **FULL LOCK** | debts ✅ + bills ✅ + accounts ✅ |
| **1C-REPLAY — fix historical pairs + cash -1** | **⏳ NEXT (Glean's recommendation)** | P1 reconciliation |
| 1D-4 series | pending | goals · budgets · USD/PKR · salary detect · CC validation |
| 1D-5 series | pending | Intl FX · ATM pairing · merchants · reconciler · repo hygiene |

---

## REPO MAP — sovereign-finance (verified 2026-05-04 EOS)

### Pages (8)
index.html · add.html · transactions.html · debts.html (v0.3.3) · bills.html (v0.9.0) ·
**accounts.html (v0.6.0 — Add/Edit/Archive UI)** · salary.html · audit.html · snapshots.html

### JS in /js/
app.js · store.js (v0.1.0) · theme.js · numbers.js · hub.js (v0.7.4) ·
add.js (v0.1.0) · transactions.js (v0.7.1) ·
debts.js (v0.4.5) · bills.js (v0.9.0) ·
**accounts.js (v0.6.0 — full CRUD wired + Archive flow)** ·
salary.js · audit.js · snapshots.js

**Missing (queued for repo hygiene later):** js/nav.js, /api/categories, /api/goals, /api/budgets, /api/reconciliation, wrangler.toml, package.json, .gitignore, _headers, _redirects, migrations/ folder

### CSS in /css/
app.css (design system v0.7.4 · ~2,467 lines · 5 themes)

### API in /functions/api/
balances.js (v0.2.0) · transactions.js (v0.0.10) · transactions/reverse.js (v0.0.2) ·
debts/[[path]].js (v0.2.0) · bills/[[path]].js (v0.2.0) ·
**accounts/[[path]].js (v0.2.1 — full CRUD + archive/unarchive · NEW THIS SESSION)** ·
audit.js · snapshots.js · _lib.js · admin/migrate-from-sheet.js (v1.1)
**REMOVED:** Old `accounts.js` v0.0.7 (deleted this session — Pattern 2 prevention, verified existing first)

### D1 tables (12 live, all migrations applied)
**accounts** (+ status, deleted_at, archived_at — schema migrated this session) ·
transactions (+reversed_by, reversed_at, linked_txn_id) · debts · bills (+status, deleted_at) ·
audit_log · snapshots · snapshot_data · reconciliation ·
categories (30) · goals (4) · budgets (11) ·
merchants · settings (pre-existing, unused)

### Backup tables (safety)
**accounts_backup_20260504** (11 rows — pre-migration snapshot, retained for rollback safety)

---

## ACCESS PATTERN

Glean reads via `glean_document_reader` with authenticated raw URL (READ-ONLY token). ONE FILE PER CALL.
- Sheet: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[FOLDER]/[FILE]`
- Cloudflare: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-finance/main/[PATH]`

**Cache-bust pattern:** append `?cb=YYYYMMDDx` to defeat GitHub raw cache (~5min).

**GitHub edit URLs with brackets:** must URL-encode (Principle #22). Example: `/edit/main/functions/api/accounts/%5B%5Bpath%5D%5D.js` not `/edit/main/functions/api/accounts/[[path]].js`

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
13. Verify-after-deploy protocol — wait 90 sec + hit /api/X?bust=N in incognito + confirm shape BEFORE moving to next file
14. Full file rewrites only — NO surgical edits, ever, regardless of how small the change
15. One file per turn going forward — no more multi-file marathons
16. Read existing target file BEFORE writing any new file that depends on it (HTML before JS, JS before HTML, **API handler before JS that calls it, schema before migration, enum values from live DB before any enum-driven logic**)
17. When stuck on a render bug, ship instrumented version with console.log checkpoints. Truth from runtime > guesses from reading code.
18. Delivery Order Rule v2 — every ship: URL first → code block → commit message → deploy wait → verify URL → smoke check (only if mandatory) → 3-branch reply → audit + deferred-scope below horizontal rules.
19. No-Live-Ledger-Test Rule — through end of Chunk 1, no smoke tests pollute real D1 data. Push back only on mandatory tests (schema migration, destructive ops without snapshot, audit_log writers, scheduled trigger first-fire).
20. Three-Cache Diagnostic — when operator says "I don't see X", diagnose three layers in order: repo, edge, browser.
21. State File Trust-But-Verify — SOVEREIGN_STATE.md is source of truth, BUT before destructive operations, verify actual repo/db state matches the claim.
22. **NEW: GitHub Edit URL Bracket Encoding** — any path containing `[[name]].js` must use URL-encoded brackets in edit URLs: `[` → `%5B`, `]` → `%5D`. Applies to all catch-all routes (debts/, bills/, accounts/, future). Working pattern: `https://github.com/{org}/{repo}/edit/main/{path}/%5B%5Bname%5D%5D.js`. Auto-apply when generating edit URLs.

---

## RCA SUMMARY — 2026-05-04 SESSIONS

**Pattern 1 — Stale cache cascade:** Verify via incognito + ?bust=N.
**Pattern 2 — Cloudflare Pages routing collision:** Catch-all + sibling file = base route loss. Always delete old when shipping catch-all replacement (when old exists — Principle #21 first).
**Pattern 3 — Frontend ID mismatch:** Truth from runtime > guesses from reading code.
**Pattern 4 — Silent backend contract drift:** Read API handler before writing JS that calls it.
**Pattern 5 — Browser cache as third cache layer:** Three layers exist — repo + edge + browser.
**Pattern 6 — State file drift detection:** Verify state file claims before destructive ops.
**Pattern 7 — Assumed enum values without reading data (NEW):** I assumed accounts.kind would be 'credit_card' + 'ewallet'; D1 actually has 'cc' + 'wallet'. v0.2.0 net worth was overstated by 157k. Caught at verify step. **Lesson: query D1 for canonical enum values BEFORE writing enum-dependent logic. `SELECT DISTINCT kind FROM accounts;` is a 1-second safeguard.**
**Pattern 8 — GitHub edit URL bracket encoding (NEW):** Raw `[[path]].js` in edit URL → 404. Must encode brackets. Now Principle #22.

---

## OPEN ANOMALIES (queued for 1C-REPLAY)

- **Cash account balance = -1.** Mathematically impossible (cash can't be negative). Likely cause: sheet→D1 migration loss of a small entry, or reversed-transaction edge case. Surfaced 2026-05-04 during accounts CRUD verify. Action: investigate via audit_log + transactions WHERE account_id='cash' during 1C-REPLAY.
- **Historical transfer pairs not linked.** New transfers (post-1D-3a) get linked_txn_id; historical ones don't. Reconciliation requires backfilling pair detection by matching same-date opposite-sign pairs. Standing P1.
- **3 bills with null due_day** (Hair Cutting, Personal Hygiene, Maid). Now display "no due date set" correctly. Operator can fix via Edit modal when ready — not blocking.

---

## NEXT SESSION START

Activation phrase: type **"builder online"**

Glean acks with chunk + sub-chunk position. Operator picks next:
1. **1C-REPLAY** ← Glean's recommendation — fix historical transfer pairs + cash -1 anomaly
2. **1D-4 series start** — goals · budgets · USD/PKR · salary detect · CC validation
3. **1D-5 series** — Intl FX · ATM pairing · merchants · reconciler · repo hygiene

Glean's full recommendation order: 1C-REPLAY → 1D-4 series → 1D-5 series → Chunk 1 lock → fresh sheet→D1 reload + full reconcile pass.

---

## STATE-SAVE INTEGRITY

This file is the single source of truth for plans, principles, RCA, and progress. **For destructive ops, verify file/table existence in live repo/D1 first** (Principle #21).

Updated by: Glean (peer mode)
Witnessed by: operator confirmation at session end
Next state save: end of next session OR after 1C-REPLAY locks (whichever first)
