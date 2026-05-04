# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-04 EOS (Sub-1D-3b + 3d FULLY LOCKED — Bills CRUD live)
**Activation:** "builder online" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: in progress
**Active sub-chunk:** Sub-1D-3b + 3d (Bills CRUD) ✅ **FULLY DONE**
**Next session FIRST action:** operator picks next sub-chunk:
  - **1D-3e (Add/Edit Account)** — completes the 1D-3 CRUD trifecta (debts ✅ + bills ✅ + accounts ⏳)
  - **1C-REPLAY** — fix historical transfer pairs (long-standing P1)
  - **1D-4 series start** — goals · budgets · USD/PKR · salary detect

Glean's recommendation: **1D-3e next** — finishes the 1D-3 CRUD trifecta and gives full edit power across the three primary entity types before moving to 1C-REPLAY (which benefits from being able to re-categorize historical transactions).

---

## ✅ TODAY'S SESSION WINS (2026-05-04 — combined five sessions)

### Sub-1D-3-RESHIP — DONE + verified live
6 files re-shipped + read-back verified + live-API confirmed.

### Sub-1D-3c (Add/Edit/Delete Debt) — FULLY DONE
- F3 (render): debts.js v0.4.3
- F4 (Add): debts.html v0.3.2 + debts.js v0.4.4 + Pay date bug fix
- F5 (Edit/Delete): debts.html v0.3.3 + debts.js v0.4.5

### Sub-1D-3b + 3d (Bills CRUD) — FULLY DONE (NEW THIS SESSION)
- **Backend:** `functions/api/bills/[[path]].js` v0.2.0 — full CRUD + pay endpoint with audit + snapshot (mirrors debts pattern)
  - GET list with computed `paidThisPeriod`, `daysLabel`, `status` per bill
  - POST create, PUT edit, DELETE soft-delete, POST /pay (atomic txn + last_paid_date bump + audit)
- **Pattern 2 risk avoided:** Old `functions/api/bills.js` was already absent in repo (state file had stale claim) — no routing collision possible. Saved a delete ship.
- **Frontend HTML:** `bills.html` v0.9.0 — added Edit Bill modal (Delete button inside, mirrors debts UX)
- **Frontend JS:** `bills.js` v0.9.0 — wired Edit modal + ✏️ buttons + null-due-day display fix + DELETE handler

### Schema audit win (silent-bug catch)
Old `functions/api/bills.js` (now absent) was writing different field names (`account_id`, `category`) than what bills.js v0.8.0 frontend expected (`default_account_id`, `category_id`). D1 schema audit confirmed table already had snake_case columns — drift was purely backend code, not data. **No migration needed.** Caught BEFORE shipping any change because of Active Principle #16 (read API handler before writing JS that calls it) extended to migration safety.

### Delivery Order Rule v2 LOCKED (carries forward)
URL first → code block → commit message → deploy wait → verify URL → smoke check (only if mandatory) → 3-branch reply → audit + deferred-scope below horizontal rules.

### No-Live-Ledger-Test Rule LOCKED (carries forward)
Through end of Chunk 1: deploy-time verification only. Push back only on mandatory tests.

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
| **Sub-1D-3c (Debts CRUD)** | ✅ **FULLY DONE** | full CRUD + pay live |
| **Sub-1D-3b + 3d (Bills CRUD)** | ✅ **FULLY DONE** | backend v0.2.0 + html v0.9.0 + js v0.9.0 |
| **1D-3e (Accounts CRUD)** | **⏳ NEXT** | completes 1D-3 CRUD trifecta |
| 1C-REPLAY — fix historical pairs | pending | P1 after 1D-3 series |
| 1D-4 series | pending | goals · budgets · USD/PKR · salary detect · CC validation |
| 1D-5 series | pending | Intl FX · ATM pairing · merchants · reconciler · repo hygiene |

---

## REPO MAP — sovereign-finance (verified 2026-05-04 EOS)

### Pages (8)
index.html · add.html · transactions.html · debts.html (v0.3.3) · **bills.html (v0.9.0 — Edit modal added)** ·
accounts.html · salary.html · audit.html · snapshots.html

### JS in /js/
app.js · **store.js (v0.1.0 — drift correction; was logged as v0.0.10 prior, actual file is v0.1.0)** · theme.js · numbers.js · hub.js (v0.7.4) ·
add.js (v0.1.0) · transactions.js (v0.7.1) ·
debts.js (v0.4.5 — full CRUD wired) · **bills.js (v0.9.0 — full CRUD wired)** ·
accounts.js · salary.js · audit.js · snapshots.js

**Missing (queued for repo hygiene later):** js/nav.js, /api/categories, /api/goals, /api/budgets, /api/reconciliation, wrangler.toml, package.json, .gitignore, _headers, _redirects, migrations/ folder

### CSS in /css/
app.css (design system v0.7.4 · ~2,467 lines · 5 themes)

### API in /functions/api/
balances.js (v0.2.0) · transactions.js (v0.0.10) · transactions/reverse.js (v0.0.2) ·
debts/[[path]].js (v0.2.0 catch-all — full CRUD + pay) ·
**bills/[[path]].js (v0.2.0 catch-all — full CRUD + pay · NEW THIS SESSION)** ·
audit.js · snapshots.js · _lib.js · admin/migrate-from-sheet.js (v1.1)
**REMOVED/ABSENT:** Old `bills.js` (was never in repo despite prior state-file claim)

### D1 tables (12 live, all migrations applied)
accounts · transactions (+reversed_by, reversed_at, linked_txn_id) · debts · bills (+status, deleted_at, default_account_id, category_id, last_paid_date, auto_post — all already snake_case) ·
audit_log · snapshots · snapshot_data · reconciliation ·
categories (30) · goals (4) · budgets (11) ·
merchants · settings (pre-existing, unused)

---

## ACCESS PATTERN

Glean reads via `glean_document_reader` with authenticated raw URL (READ-ONLY token). ONE FILE PER CALL.
- Sheet: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[FOLDER]/[FILE]`
- Cloudflare: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-finance/main/[PATH]`

**Cache-bust pattern:** append `?cb=YYYYMMDDx` to defeat GitHub raw cache (~5min). First read after a commit may return stale; cache-bust mandatory on critical reads.

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
16. Read existing target file BEFORE writing any new file that depends on it (HTML before JS, JS before HTML, **API handler before JS that calls it, schema before migration**)
17. When stuck on a render bug, ship instrumented version with console.log checkpoints. Truth from runtime > guesses from reading code.
18. Delivery Order Rule v2 — every ship: URL first → code block → commit message → deploy wait → verify URL → smoke check (only if mandatory) → 3-branch reply → audit + deferred-scope below horizontal rules.
19. No-Live-Ledger-Test Rule — through end of Chunk 1, no smoke tests pollute real D1 data. Deploy-time verification only. Push back only on mandatory tests (schema migration, destructive ops without snapshot, audit_log writers, scheduled trigger first-fire).
20. Three-Cache Diagnostic — when operator says "I don't see X", diagnose three layers in order: repo, edge, browser. Don't assume which is stale.
21. **NEW: State File Trust-But-Verify** — SOVEREIGN_STATE.md is source of truth, BUT before destructive operations (delete file, drop table, force-overwrite), verify the actual repo/db state matches the state file's claim. State file can drift between sessions. This session caught: claimed `functions/api/bills.js` existed → reality showed it was absent → would have wasted a "delete" ship if not verified.

---

## RCA SUMMARY — 2026-05-04 SESSIONS

**Pattern 1 — Stale cache cascade (resolved):** Verify via incognito + ?bust=N.

**Pattern 2 — Cloudflare Pages routing collision (resolved):** Catch-all + sibling file = base route loss. Always delete old when shipping catch-all replacement.

**Pattern 3 — Frontend ID mismatch (resolved):** Truth from runtime > guesses from reading code.

**Pattern 4 — Silent backend contract drift (resolved):** Read API handler before writing JS that calls it.

**Pattern 5 — Browser cache as third cache layer (resolved):** Three layers exist — repo + edge + browser.

**Pattern 6 — State file drift detection (NEW, resolved this session):** State file claimed an old file existed for routing-collision risk. Verification before delete-ship showed file was absent. **Lesson: Active Principle #21 — verify state file claims before destructive ops. State file is canonical for plans + decisions, but for actual file/table existence, verify against live repo/D1 before destructive moves.**

---

## NEXT SESSION START

Activation phrase: type **"builder online"**

Glean acks with chunk + sub-chunk position. Operator picks next:
1. **1D-3e (Accounts CRUD)** ← Glean's recommendation — completes 1D-3 CRUD trifecta (debts ✅ + bills ✅ + accounts ⏳)
2. **1C-REPLAY** — fix historical transfer pairs (long-standing P1)
3. **1D-4 series start** — goals · budgets · USD/PKR · salary detect · CC validation

Glean's full recommendation order: 1D-3e → 1C-REPLAY → 1D-4 series → 1D-5 series → Chunk 1 lock.

---

## STATE-SAVE INTEGRITY

This file is the single source of truth for plans, principles, RCA, and progress. **For destructive ops, verify file/table existence in live repo/D1 first** (Active Principle #21).

Updated by: Glean (peer mode)
Witnessed by: operator confirmation at session end
Next state save: end of next session OR after Sub-1D-3e locks (whichever first)
