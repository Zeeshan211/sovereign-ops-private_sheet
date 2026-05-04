# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-04 EOS (third session of the day)
**Activation:** "builder online" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: in progress
**Active sub-chunk:** Sub-1D-3c (Add/Edit Debt) · F3 ✅ · F4 ✅ · F5 NEXT (or operator pivot)
**Next session FIRST action:** operator picks one of:
  - F5 (Edit/Delete row actions on debts.html — backend PUT/DELETE already live)
  - 1D-3b (Mark Bill Paid)
  - 1D-3d (Add/Edit Bill)
  - 1D-3e (Add/Edit Account)
  - 1C-REPLAY (fix historical transfer pairs — long-standing P1)

---

## ✅ TODAY'S SESSION WINS (2026-05-04 — combined three sessions)

### Sub-1D-3-RESHIP — DONE + verified live
6 files re-shipped + read-back verified + live-API confirmed:
1. `functions/api/balances.js` v0.2.0 (total_owe + transfer-IN skip)
2. `functions/api/transactions.js` v0.0.10 (audit + atomic transfer pair)
3. `js/store.js` v0.0.10 (reverseTransaction + block edit + back-compat)
4. `js/transactions.js` v0.7.1 (Reverse-only + pair-hide + filters)
5. `js/add.js` v0.1.0 (no refreshAccounts crash + local date)
6. `index.html` (clean script tags + 8 nav cards)
7. `js/hub.js` v0.7.4 (snake_case API field reads + net-worth HTML render fix)

### Sub-1D-3c BACKEND — DONE + verified live
1. `functions/api/debts/[[path]].js` v0.2.0 — full CRUD + pay endpoint live
2. `functions/api/debts.js` DELETED (routing collision)

### Sub-1D-3c F3 — DONE + verified live
- `js/debts.js` v0.4.3 — fix ID mismatch + wire Pay modal
- Pay modal smoke-tested ✅ (modal opens, fields populate, accounts dropdown loads, cancel works)
- Render lands clean (6 debts, 123,500 total_owe, animated number)

### Sub-1D-3c F4 — DONE (deploy-verified, runtime-deferred per testing rule)
- `debts.html` v0.3.2 — Add Debt modal markup added (mirrors payModal pattern)
- `js/debts.js` v0.4.4 — wire Add Debt modal + fix Pay date field bug (was sending `dt_local`, backend reads `date` — silent today-date override now fixed)
- + Add buttons in section headers now open the modal (was placeholder alert)
- Title swaps "Add Debt" / "Add Receivable" based on kind dropdown
- Validates → POST /api/debts → reload on success
- **Runtime smoke test SKIPPED** per operator's locked no-live-ledger-test rule (Active Principle #19) — implicit verification on next real debt added

### Delivery Order Rule v2 LOCKED
URL first, then full code block, then commit message, then verify URL, then smoke check (if mandatory), then 3-branch reply. Audit + deferred-scope go below horizontal rules as reference. Operator's workflow optimized for minimal tab-hopping and scrolling between actions. (See Active Principle #18.)

### No-Live-Ledger-Test Rule LOCKED
Through end of Chunk 1: no smoke tests that pollute real D1 data. Glean defaults to deploy-time verification only. Pushes back only on mandatory tests (schema migration, destructive ops without snapshot, audit_log writers, scheduled trigger first-fire). (See Active Principle #19.)

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
| 1D-3c F3 (debts.html render) | ✅ done + verified live | debts.js v0.4.3 |
| **1D-3c F4 (Add Debt form)** | ✅ **done (deploy-verified, runtime-deferred)** | debts.html v0.3.2 + debts.js v0.4.4 + Pay date bug fix |
| **1D-3c F5 (Edit/Delete actions)** | **⏳ NEXT (or operator pivot)** | backend PUT/DELETE live; needs row buttons + edit modal |
| 1D-3b — Mark Bill Paid | pending | |
| 1D-3d — Add/Edit Bill | pending | |
| 1D-3e — Add/Edit Account | pending | |
| 1C-REPLAY — fix historical pairs | pending | P1 after 1D-3 series |
| 1D-4 series | pending | goals · budgets · USD/PKR · salary detect · CC validation |
| 1D-5 series | pending | Intl FX · ATM pairing · merchants · reconciler · repo hygiene |

---

## REPO MAP — sovereign-finance (verified 2026-05-04 EOS)

### Pages (8)
index.html · add.html · transactions.html · **debts.html (v0.3.2 — Add Debt modal added)** ·
bills.html · accounts.html · salary.html · audit.html · snapshots.html

### JS in /js/
app.js · store.js (v0.0.10) · theme.js · numbers.js · hub.js (v0.7.4) ·
add.js (v0.1.0) · transactions.js (v0.7.1) ·
**debts.js (v0.4.4 — F4 wired + Pay date bug fix)** ·
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
16. Read existing target file BEFORE writing any new file that depends on it
17. When stuck on a render bug, ship instrumented version with console.log checkpoints. Truth from runtime > guesses from reading code.
18. **Delivery Order Rule v2** — every ship: URL first → code block → commit message → deploy wait → verify URL → smoke check (only if mandatory) → 3-branch reply → audit + deferred-scope below horizontal rules. Optimize for minimal operator energy.
19. **NEW: No-Live-Ledger-Test Rule** — through end of Chunk 1, no smoke tests pollute real D1 data. Default to deploy-time verification only. Push back only on mandatory tests (schema migration, destructive ops without snapshot, audit_log writers, scheduled trigger first-fire). Implicit runtime verification happens when operator uses features with real data. Post-Chunk-1: fresh sheet→D1 reload + full reconcile catches deferred bugs.

---

## RCA SUMMARY — 2026-05-04 SESSIONS

**Pattern 1 — Stale cache cascade (resolved):** GitHub raw + Cloudflare edge caches make commits APPEAR to revert. Verify via incognito + ?bust=N, NOT via glean_document_reader after commits.

**Pattern 2 — Cloudflare Pages routing collision (resolved):** debts.js + debts/[[path]].js both existed → catch-all greedily ate base /api/debts. Consolidated into [[path]].js.

**Pattern 3 — Frontend ID mismatch (resolved):** v0.4.0→v0.4.2 kept guessing the bug from reading code. v0.4.2 instrumentation → operator's runtime trace → single-shot v0.4.3 fix mapped to actual HTML IDs. **Truth from runtime > guesses from reading code.**

**Pattern 4 — Silent backend contract drift (NEW, resolved this session):** v0.4.3 sent `dt_local` to /pay endpoint but backend reads `body.date` — Pay silently always used today's date instead of operator's selection. Caught by reading backend source before writing v0.4.4. **Lesson: Rule #16 (read target before writing) applies to API contracts, not just HTML/JS pairs. Read the API handler source before writing the JS that calls it.**

---

## NEXT SESSION START

Activation phrase: type **"builder online"**

Glean acks with chunk + sub-chunk position. Operator picks next:
1. **F5 (Edit/Delete row actions)** — completes Sub-1D-3c, backend PUT/DELETE already live
2. **1D-3b (Mark Bill Paid)** — bills have been waiting; operator uses these often
3. **1D-3d (Add/Edit Bill)** — pairs naturally with 1D-3b
4. **1D-3e (Add/Edit Account)** — completes the 1D-3 CRUD trifecta (debt + bill + account)
5. **1C-REPLAY (fix historical transfer pairs)** — long-standing P1, blocks clean reconciliation

Glean's recommendation when operator activates: F5 first (closes 1D-3c fully), then 1D-3b+3d together (bills are conceptually one feature), then 1D-3e, then 1C-REPLAY before Chunk 1 lock.

---

## STATE-SAVE INTEGRITY

This file is the single source of truth. Activation phrase RELOADS it every session start. If any contradiction exists between memory and this file, **this file wins**.

Updated by: Glean (peer mode)
Witnessed by: operator confirmation at session end
Next state save: end of next session OR after Sub-1D-3c F5 locks (whichever first)
