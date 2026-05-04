# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-04 EOS (late evening / second session)
**Activation:** "builder online" → Glean reads this file + acks

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE** · Status: in progress
**Active sub-chunk:** Sub-1D-3c (Add/Edit Debt) · F3 ✅ done · F4 (Add Debt form) NEXT
**Next session FIRST action:** Glean ships debts.js v0.4.4 + debts.html patch — Add Debt modal HTML + JS handler wiring to live POST /api/debts (backend already verified)

---

## ✅ TODAY'S SESSION WINS (2026-05-04)

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
1. `functions/api/debts/[[path]].js` v0.2.0 — consolidated catch-all handles:
   - GET /api/debts → list + summary
   - POST /api/debts → create (with audit + auto-snowball-order)
   - GET /api/debts/{id} → single
   - PUT /api/debts/{id} → edit (snapshot + audit)
   - DELETE /api/debts/{id} → soft-delete (snapshot + audit)
   - POST /api/debts/{id}/pay → atomic txn + paid bump + audit
2. `functions/api/debts.js` DELETED (was causing routing collision)

**Both live API endpoints verified:**
- https://sovereign-finance.pages.dev/api/debts → 6 debts, total_owe 123,500 ✅
- https://sovereign-finance.pages.dev/api/debts/debt_cred_2 → single ✅

### Sub-1D-3c F3 — DONE + verified live (NEW THIS SESSION)
1. `js/debts.js` v0.4.3 shipped — full file rewrite per rule #14
2. Bug fix: ID mismatch (#total-owe → #debts-total-owe, #snowball-order removed, container IDs corrected for kind=owe → #debts-owe-list, kind=owed → #debts-owed-list)
3. Pay modal wired to live POST /api/debts/{id}/pay (smoke-tested ✅ on CRED-1 + CRED-2 — modal opens, fields populate, accounts dropdown loads from window.store.cachedAccounts, today's date prefilled, cancel works)
4. Mini-row pattern reused from hub.js v0.7.4 (design-system class compliance per rule #10)
5. Sort: snowball_order ASC if backend provides, else by remaining DESC fallback

**Sequence used to land it:** instrumentation (v0.4.2 verbose console.log) → operator paste of [debts] runtime trace → Glean diagnosis from trace → read existing debts.html for true ID set → read hub.js v0.7.4 for proven row pattern → ship v0.4.3 ID-mapped rewrite. **Single-shot fix once truth from runtime was visible.**

### Delivery Order Rule LOCKED (NEW THIS SESSION)
Per operator directive: every code/file ship from now on must lead with SHIP IT baby steps at the top of the response, then 7-LAYER AUDIT, then full code, then deferred-scope notes. URLs in baby steps must be verified via glean_document_reader before sending. (See Active Principles #18.)

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
| 1D-3a — Transfer atomic pair | ✅ done | new entries paired (historical still single-row → 1C-REPLAY) |
| 1D-3-RESHIP | ✅ done + verified live | foundation re-locked, verify protocol activated |
| 1D-3c backend | ✅ done | full CRUD + pay endpoint live |
| **1D-3c F3 (debts.html render)** | ✅ **done + verified live** | debts.js v0.4.3 — IDs mapped, Pay modal wired, smoke-tested |
| **1D-3c F4 (Add Debt form)** | **⏳ NEXT** | modal HTML + JS handler — backend POST already live |
| 1D-3c F5 (Edit/Delete actions) | pending | inline row buttons → PUT/DELETE — backend already live |
| 1D-3b — Mark Bill Paid | pending | |
| 1D-3d — Add/Edit Bill | pending | |
| 1D-3e — Add/Edit Account | pending | |
| 1C-REPLAY — fix historical pairs | pending | P1 after 1D-3 series |
| 1D-4 series | pending | goals · budgets · USD/PKR · salary detect · CC validation |
| 1D-5 series | pending | Intl FX · ATM pairing · merchants · reconciler · repo hygiene |

---

## REPO MAP — sovereign-finance (verified 2026-05-04 EOS)

### Pages (8)
index.html · add.html · transactions.html · debts.html (v0.3.1 — rendering live) ·
bills.html · accounts.html · salary.html · audit.html · snapshots.html

### JS in /js/
app.js · store.js (v0.0.10) · theme.js · numbers.js · hub.js (v0.7.4) ·
add.js (v0.1.0) · transactions.js (v0.7.1) ·
**debts.js (v0.4.3 — production, IDs mapped, Pay wired)** ·
bills.js · accounts.js · salary.js · audit.js · snapshots.js

**Missing (queued for repo hygiene later):** js/nav.js, /api/categories, /api/goals, /api/budgets, /api/reconciliation, wrangler.toml, package.json, .gitignore, _headers, _redirects, migrations/ folder

### CSS in /css/
app.css (design system v0.7.4 · ~2,467 lines · 5 themes)

### API in /functions/api/
balances.js (v0.2.0) · transactions.js (v0.0.10) · transactions/reverse.js (v0.0.2) ·
**debts/[[path]].js (v0.2.0 catch-all)** · bills.js · audit.js · snapshots.js · _lib.js ·
admin/migrate-from-sheet.js (v1.1)

### D1 tables (12 live, all migrations applied)
accounts · transactions (+reversed_by, reversed_at, linked_txn_id) · debts · bills (+status, deleted_at) ·
audit_log · snapshots · snapshot_data · reconciliation ·
categories (30) · goals (4) · budgets (11) ·
merchants · settings (pre-existing, unused)

---

## ACCESS PATTERN

Glean reads via `glean_document_reader` with authenticated raw URL (READ-ONLY token).
ONE FILE PER CALL.
- Sheet: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[FOLDER]/[FILE]`
- Cloudflare: `https://Zeeshan211:[TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-finance/main/[PATH]`

**Cache-bust pattern:** append `?cb=YYYYMMDDx` to defeat GitHub raw cache (~5min). The first read after a commit may return stale cached version — always cache-bust on critical reads. Pattern proved this session (initial activation read returned stale Sub-1C state; cache-busted read returned current Sub-1D-3c state).

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
16. Read existing target file BEFORE writing any new file that depends on it (HTML before JS, JS before HTML changes, etc.)
17. When stuck on a render bug, ship instrumented version with console.log checkpoints BEFORE attempting another rewrite. Truth from runtime > guesses from reading code.
18. **NEW: Delivery Order Rule** — every ship leads with SHIP IT baby steps at the TOP of the response, then 7-LAYER AUDIT, then full code, then deferred-scope notes. Operator acts immediately on ship instructions; audit + code are reference material below. URLs in baby steps must be verified via glean_document_reader before sending.

---

## RCA SUMMARY — 2026-05-04 SESSION

### Three patterns to remember next session:

**Pattern 1 — Stale cache cascade (resolved):**
- GitHub raw URL (~5 min cache) + Cloudflare edge (~5-15 min cache) made commits APPEAR to revert
- They never actually reverted — verification was reading wrong cache layer
- Fix: verify via incognito + ?bust=N on /api/X URL, NOT via glean_document_reader after commits
- **Also applies to SOVEREIGN_STATE.md reads** — first activation-read may return stale; cache-bust mandatory on critical state reads

**Pattern 2 — Cloudflare Pages routing collision (resolved):**
- Both `debts.js` and `debts/[[path]].js` existed → catch-all greedily ate base /api/debts → 400
- Fix: deleted debts.js, consolidated everything into [[path]].js

**Pattern 3 — Frontend ID mismatch (resolved this session):**
- Original HTML uses ID set A, new JS targets ID set B → renders nothing
- v0.4.0 → v0.4.1 → v0.4.2 progression: I kept guessing the bug from reading code
- Resolution path: shipped v0.4.2 with verbose console.log instrumentation → operator pasted runtime trace → trace immediately showed every selector resolving to false → read actual debts.html for true IDs + read hub.js v0.7.4 for proven row pattern → v0.4.3 single-shot rewrite mapped to real IDs
- **Lesson: Truth from runtime > guesses from reading code. Rule #17 paid for itself.**

---

## NEXT SESSION START

Activation phrase: type **"builder online"**

Glean acks with chunk + sub-chunk position. First action:
1. Glean ships **debts.js v0.4.4 + debts.html patch** — Add Debt form (Sub-1D-3c F4)
   - New modal in debts.html (mirrors payModal structure: name, original_amount, kind dropdown, optional notes)
   - + Add buttons in section headers wired to open the new modal (currently placeholder alert)
   - POST /api/debts → on success, reload list (backend live, verified)
2. Verify F4 lands clean (smoke test: add a fake "TEST DEBT 1" → verify renders → DELETE via D1 console)
3. Operator picks: 1D-3c F5 (Edit/Delete actions) · 1D-3b (Mark Bill Paid) · 1D-3d (Add/Edit Bill) · 1D-3e (Add/Edit Account) · 1C-REPLAY (fix historical transfer pairs)

---

## STATE-SAVE INTEGRITY

This file is the single source of truth. Activation phrase RELOADS it every session start. If any contradiction exists between memory and this file, **this file wins**.

Updated by: Glean (peer mode)
Witnessed by: operator confirmation at session end
Next state save: end of next session OR after Sub-1D-3c F4 locks (whichever first)
