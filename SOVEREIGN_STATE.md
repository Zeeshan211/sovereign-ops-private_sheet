# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-04 EOS (Sub-1D-3c FULLY LOCKED)
**Activation:** "builder online" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: in progress
**Active sub-chunk:** Sub-1D-3c (Add/Edit/Delete Debt) ✅ **FULLY DONE** (F3 + F4 + F5 all locked)
**Next session FIRST action:** operator picks next sub-chunk:
  - **1D-3b + 3d (Bills CRUD)** — Mark Bill Paid + Add/Edit Bill (one conceptual feature, mirrors debts pattern)
  - **1D-3e (Add/Edit Account)** — completes the 1D-3 CRUD trifecta
  - **1C-REPLAY** — fix historical transfer pairs (long-standing P1)

Glean's recommendation: **1D-3b+3d together** next — bills are the next most-used feature and we can reuse the debts modal pattern for fast turnaround.

---

## ✅ TODAY'S SESSION WINS (2026-05-04 — combined four sessions)

### Sub-1D-3-RESHIP — DONE + verified live
6 files re-shipped + read-back verified + live-API confirmed. (see prior state for detail)

### Sub-1D-3c BACKEND — DONE + verified live
- `functions/api/debts/[[path]].js` v0.2.0 — full CRUD + pay endpoint live
- `functions/api/debts.js` DELETED (routing collision)

### Sub-1D-3c F3 (debts.html render) — DONE + verified live
- `js/debts.js` v0.4.3 — fix ID mismatch + wire Pay modal

### Sub-1D-3c F4 (Add Debt form) — DONE (deploy-verified)
- `debts.html` v0.3.2 — Add Debt modal markup
- `js/debts.js` v0.4.4 — wire Add Debt modal + fix Pay date field bug (`dt_local` → `date`)

### Sub-1D-3c F5 (Edit/Delete row actions) — DONE (deploy-verified)
- `debts.html` v0.3.3 — Edit Debt modal markup (with Delete button inside)
- `js/debts.js` v0.4.5 — ✏️ Edit buttons on every row · PUT on save · DELETE with native confirm()
- Native confirm() prompt explains soft-delete + snapshot recovery path
- Snapshot-before-delete (backend rule #2) provides D1-console recovery

### Delivery Order Rule v2 LOCKED
URL first → code block → commit message → deploy wait → verify URL → smoke check (only if mandatory) → 3-branch reply → audit + deferred-scope below horizontal rules.

### No-Live-Ledger-Test Rule LOCKED
Through end of Chunk 1: deploy-time verification only. Push back only on mandatory tests.

### Cache-Layer Trap (recurring lesson)
Browser cache is the third cache layer (after GitHub raw + Cloudflare edge). When operator says "I don't see X", first diagnose: code in repo? code deployed at edge? code loaded by browser? — three separate checks. Cache-bust URL (?bust=N+1) + Ctrl+Shift+R when in doubt.

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
| 1D-3c backend | ✅ done | full CRUD + pay endpoint live |
| 1D-3c F3 (render) | ✅ done + verified live | debts.js v0.4.3 |
| 1D-3c F4 (Add) | ✅ done (deploy-verified) | debts.html v0.3.2 + debts.js v0.4.4 + Pay date bug fix |
| **1D-3c F5 (Edit/Delete)** | ✅ **done (deploy-verified)** | debts.html v0.3.3 + debts.js v0.4.5 |
| **Sub-1D-3c FULL LOCK** | ✅ **DONE** | full debt CRUD live · backend verified · UI deploy-verified · runtime implicit-tested on next real use |
| **1D-3b + 3d (Bills CRUD)** | **⏳ NEXT** | Mark Bill Paid + Add/Edit Bill — reuse debts modal pattern |
| 1D-3e — Add/Edit Account | pending | completes 1D-3 CRUD trifecta |
| 1C-REPLAY — fix historical pairs | pending | P1 after 1D-3 series |
| 1D-4 series | pending | goals · budgets · USD/PKR · salary detect · CC validation |
| 1D-5 series | pending | Intl FX · ATM pairing · merchants · reconciler · repo hygiene |

---

## REPO MAP — sovereign-finance (verified 2026-05-04 EOS)

### Pages (8)
index.html · add.html · transactions.html · **debts.html (v0.3.3 — Edit modal added)** ·
bills.html · accounts.html · salary.html · audit.html · snapshots.html

### JS in /js/
app.js · store.js (v0.0.10) · theme.js · numbers.js · hub.js (v0.7.4) ·
add.js (v0.1.0) · transactions.js (v0.7.1) ·
**debts.js (v0.4.5 — full CRUD wired: Add + Edit + Delete + Pay)** ·
bills.js · accounts.js · salary.js · audit.js · snapshots.js

**Missing (queued for repo hygiene later):** js/nav.js, /api/categories, /api/goals, /api/budgets, /api/reconciliation, wrangler.toml, package.json, .gitignore, _headers, _redirects, migrations/ folder

### CSS in /css/
app.css (design system v0.7.4 · ~2,467 lines · 5 themes)

### API in /functions/api/
balances.js (v0.2.0) · transactions.js (v0.0.10) · transactions/reverse.js (v0.0.2) ·
**debts/[[path]].js (v0.2.0 catch-all — full CRUD + pay)** · bills.js · audit.js · snapshots.js · _lib.js ·
admin/migrate-from-sheet.js (v1.1)

### D1 tables (12 live, all migrations applied)
accounts · transactions (+reversed_by, reversed_at, linked_txn_id) · debts · bills (+status, deleted_at) ·
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
16. Read existing target file BEFORE writing any new file that depends on it (HTML before JS, JS before HTML, **API handler before JS that calls it**)
17. When stuck on a render bug, ship instrumented version with console.log checkpoints. Truth from runtime > guesses from reading code.
18. Delivery Order Rule v2 — every ship: URL first → code block → commit message → deploy wait → verify URL → smoke check (only if mandatory) → 3-branch reply → audit + deferred-scope below horizontal rules. Optimize for minimal operator energy.
19. No-Live-Ledger-Test Rule — through end of Chunk 1, no smoke tests pollute real D1 data. Deploy-time verification only. Push back only on mandatory tests (schema migration, destructive ops without snapshot, audit_log writers, scheduled trigger first-fire). Implicit runtime verification when operator uses features with real data. Post-Chunk-1: fresh sheet→D1 reload + full reconcile catches deferred bugs.
20. **NEW: Three-Cache Diagnostic** — when operator says "I don't see X", diagnose three layers in order: (a) is code in repo? (read with glean_document_reader + cache-bust), (b) is code deployed at Cloudflare edge? (hit live URL + ?bust=N), (c) is code loaded by browser? (Ctrl+Shift+R or fresh incognito). Don't assume which layer is stale — check.

---

## RCA SUMMARY — 2026-05-04 SESSIONS

**Pattern 1 — Stale cache cascade (resolved):** GitHub raw + Cloudflare edge caches make commits APPEAR to revert. Verify via incognito + ?bust=N.

**Pattern 2 — Cloudflare Pages routing collision (resolved):** debts.js + debts/[[path]].js both existed → catch-all greedily ate base /api/debts. Consolidated.

**Pattern 3 — Frontend ID mismatch (resolved):** Truth from runtime > guesses from reading code. Instrumentation → trace → single-shot fix.

**Pattern 4 — Silent backend contract drift (resolved):** v0.4.3 sent `dt_local` to /pay endpoint but backend reads `body.date`. Caught by reading backend source before writing v0.4.4. **Lesson: Rule #16 (read target before writing) applies to API contracts too.**

**Pattern 5 — Browser cache as third cache layer (NEW, resolved this session):** v0.4.5 deployed correctly to Cloudflare edge but operator's browser served cached v0.4.4 JS. Three cache layers exist — repo + edge + browser. **Lesson: Active Principle #20 — diagnose all three layers when operator reports "I don't see X".**

---

## NEXT SESSION START

Activation phrase: type **"builder online"**

Glean acks with chunk + sub-chunk position. Operator picks next:
1. **1D-3b + 3d (Bills CRUD together)** ← Glean's recommendation — bills are next most-used, modal pattern reuses cleanly from debts
2. **1D-3e (Add/Edit Account)** — completes 1D-3 CRUD trifecta
3. **1C-REPLAY** — fix historical transfer pairs

Glean's full recommendation order: 1D-3b+3d → 1D-3e → 1C-REPLAY → Chunk 1 lock.

---

## STATE-SAVE INTEGRITY

This file is the single source of truth. Activation phrase RELOADS it every session start. If any contradiction exists between memory and this file, **this file wins**.

Updated by: Glean (peer mode)
Witnessed by: operator confirmation at session end
Next state save: end of next session OR after Sub-1D-3b+3d locks (whichever first)
