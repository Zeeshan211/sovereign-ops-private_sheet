# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-06 session closeout — Cloudflare Access S1 + ATM + Nano Loans  
**Last session ended:** 2026-05-06  
**Activation:** `boot vault` → Glean reads `GLEAN_OPERATING_SYSTEM.md` FIRST, then this file, then acks with chunk + status + strikes + ships budget  
**OS active:** v1.0 — pre-flight gates mandatory, max 8 ships per session  
**Token rule:** no GitHub PAT stored in this file or memory; operator pastes fresh session token when repo reads are needed

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE**  
**Current status:** Finance Cloudflare app is functional, secured at edge, and mid-port for remaining finance modules.

Current high-level state:
- Core ledger/write path: shipped and usable.
- Charts: live and visual standard for the site.
- Cloudflare Access S1: complete.
- ATM: API + page confirmed live.
- ATM Hub/nav integration: placeholder provided, deployment not confirmed.
- Nano Loans: D1 schema verified; API/page placeholders provided, deployment not confirmed.
- Sheet → D1 sync: still parked/broken from prior Part 8 migrate issue.
- No fake ledger-polluting smoke tests were run for ATM or Nano Loans.

---

## SECURITY STATE

### Cloudflare Access Phase S1 — complete

Confirmed:
- Root production app `sovereign-finance.pages.dev` is protected.
- Wildcard `*` was removed from the Cloudflare Access app subdomain so the production root is covered.
- Main website is blocked in incognito before Cloudflare login.
- Direct `/api/*` routes are blocked in incognito before Cloudflare login.

Meaning:
- Public exposure is closed at the Cloudflare edge.
- Website pages and APIs are no longer openly accessible.

Not yet complete:
- API identity guard on mutating endpoints.
- Role-based access.
- Identity-bound audit entries.
- Custom domain.

Next security layer:
- Add API identity guard using Cloudflare Access identity/JWT/email checks on all mutating endpoints.

---

## ACTIVE LAYERS

### Layer 4 — Website polish

Status:
- Charts is the visual source of truth.
- Hub has been pushed toward Charts-style premium cockpit design.
- `app.css v1.0.1` motion foundation was provided.
- `theme.js v0.7.1` compact theme dock was provided to fix the oversized/stuck theme menu.
- Need verify which Layer 4 motion/theme files are actually deployed live.

Design rule:
- Animate the interface, not the numbers.
- No fake balance count-ups.
- Money values must stay exact and honest.

### Layer 5A — Debt edit/reclassify hardening

Status:
- Debt correction issue discovered.
- `debt_sehat_kahani_1` was corrected directly in D1 from `owe` to `owed`.
- API `PUT /api/debts/debt_sehat_kahani_1` had D1 bind/type issue and remains parked.
- Debt edit/reclassify UI/API hardening remains Layer 5A follow-up.

Verified debt row:
- `id`: `debt_sehat_kahani_1`
- `kind`: `owed`
- `original_amount`: `11800`
- `paid_amount`: `0`
- `remaining`: `11800`
- `snowball_order`: `4`
- `status`: `active`
- `notes`: manual D1 correction after API PUT bind error

Next verify if resuming:
```sql
SELECT id,timestamp,action,entity,entity_id,kind,detail,created_by
FROM audit_log
WHERE entity_id='debt_sehat_kahani_1'
ORDER BY timestamp DESC
LIMIT 3;
```

### Layer 5B — ATM web port

Confirmed complete:
- Ship 1: `/api/atm` backend is live.
- Ship 2: `atm.html` page is live.
- Sheet ATM logic ported:
  - ATM withdrawal is not a single expense.
  - It is modeled as linked cash movement.
  - Source bank OUT + Cash/wallet IN.
  - Optional ATM fee row tracks pending fee reversal.
- No live ATM withdrawal smoke test was run.

Prepared but not confirmed deployed:
- Ship 3: Hub/nav integration.
- `js/nav.js v1.0.3` placeholder was provided.
- `index.html v0.9.6` placeholder was provided.
- These should add:
  - ATM to desktop nav.
  - ATM Control card to Hub.
  - ATM Pending metric.
  - ATM reversals in What Needs Action.
  - Mobile bottom nav remains Hub/Add/Tx/Bills/CC.

Next verification:
- Check live Hub footer:
  - `v0.9.6 · layer 5B ATM-integrated hub · nav v1.0.3 · app.css v1.0.1`
- Check Hub daily tools includes ATM Control.
- Check desktop nav includes ATM.
- Check mobile bottom nav remains Hub/Add/Tx/Bills/CC.
- Do not run ATM withdrawal test.
- Do not mark fee reversed unless real bank reversal happened.

### Layer 5C — Nano Loans web port

Confirmed complete:
- Ship 1: D1 schema foundation completed.
- `nano_loans` table exists.
- 5 indexes verified:
  - `idx_nano_loans_app`
  - `idx_nano_loans_date`
  - `idx_nano_loans_pushed`
  - `idx_nano_loans_source`
  - `idx_nano_loans_status`
- `PRAGMA table_info(nano_loans)` verified 21 columns from `id` through `updated_at`.
- `audit_log` contains `NANO_SCHEMA_CREATE`.
- No nano loan creation was performed.

Notes:
- Cloudflare Console showed harmless SQL errors when expected-output text like `NANO_SCHEMA_CREATE` and `nano_loan_rows = 0` was pasted as SQL.
- No create/repay/push-to-CC mutation was run, so no ledger pollution occurred.

Prepared but not confirmed deployed:
- Ship 2: `/api/nano-loans` backend placeholder was provided.
- Target path:
  - `functions/api/nano-loans/[[path]].js`
- Version:
  - `v0.1.0`
- Routes:
  - `GET /api/nano-loans`
  - `POST /api/nano-loans`
  - `POST /api/nano-loans/{id}/repay`
  - `POST /api/nano-loans/{id}/push-to-cc`

Prepared but not confirmed deployed:
- Ship 3: `nano-loans.html` page placeholder was provided.

Next verification:
1. Check `/api/nano-loans` after Cloudflare Access login.
2. Expected:
   - `"ok": true`
   - `"version": "v0.1.0"`
   - `"loans": []`
   - `"summary": { "active_count": 0 }`
3. Check `/nano-loans.html` after Cloudflare Access login.
4. Expected:
   - `Live · Nano API v0.1.0`
   - `Active Loans = 0`
   - `Remaining = Rs 0`
   - empty active/closed loan states
5. Do not create test nano loans.
6. Do not run repay.
7. Do not run push-to-CC.

---

## BANKING-GRADE SAFETY STATUS

Confirmed safe:
- Core transaction ledger write path.
- Bills/budgets/goals/salary/accounts.
- Charts read-only module.
- Cloudflare Access S1 edge protection.
- ATM API/page deployed without test ledger pollution.
- Nano Loans schema created without loan creation.

Still requiring hardening:
- API identity guard on all mutating endpoints.
- Debt PUT bind/type issue.
- Nano Loans API/page deployment verification.
- ATM Hub/nav integration verification.
- Sheet → D1 sync.
- SCHEMA.md update.
- Reconciliation UI polish.
- Final full parity audit vs Sheet finance modules.

---

## NO-LEDGER-POLLUTION RULE

Active until Chunk 1 Finance final lock.

Do not run fake/live smoke tests that create real rows for:
- ATM withdrawal
- ATM fee reversal
- Nano loan creation
- Nano loan repayment
- Nano push-to-CC
- Debt add/pay/receive unless real
- Test transaction rows

Allowed verification:
- Page loads.
- API GET/read-only endpoints.
- Footer/version checks.
- Empty-state checks.
- Existing-data rendering checks.
- D1 schema inspection.
- Audit-log inspection.

Real mutation only when operator is performing a real financial action.

---

## PROCESS CORRECTION — FILE DELIVERY

Locked correction from 2026-05-06:

Glean violated Sovereign Ops delivery rules by offering downloadable sandbox files for `nav.js` and `index.html`.

Going forward:
- No downloadable sandbox files for Sovereign Ops code delivery unless operator explicitly asks.
- All Sovereign Ops ships must be manual copy-paste placeholders directly in chat.
- Required format:
  - exact edit URL
  - target path
  - full code block
  - commit message
  - deploy wait
  - verification steps
  - 3-branch reply line
- Never substitute sandbox download links for full code blocks.

---

## TODAY'S SESSION SCORECARD — 2026-05-06

Completed:
- Cloudflare Access S1 production root protection.
- Website and `/api/*` blocked before login.
- ATM backend live.
- ATM page live.
- Nano Loans D1 schema live and verified.
- Nano Loans audit schema event verified.
- Nano Loans API placeholder provided.
- Nano Loans page placeholder provided.
- ATM Hub/nav placeholder provided.
- Layer 4 motion/theme polish work prepared.

Not confirmed:
- ATM Ship 3 Hub/nav deployment.
- Nano Ship 2 API deployment.
- Nano Ship 3 page deployment.
- Theme dock deployment.
- Full app.css motion foundation deployment.

Mistake:
- Glean gave downloadable sandbox files despite locked prohibition.
- Corrected in state file and memory.

---

## OPEN ANOMALIES + DEFERRED POLISH

- Debt API PUT bind/type error remains parked.
- `debt_sehat_kahani_1` audit verification still worth checking.
- Merchants deferred to post-Layer-4 feature/schema backlog.
- Merchant real purpose: automatic fee calculation, PRA/local fees, international/FX fees.
- CC billing logic parked:
  - statement date: 12th monthly
  - interest-free period: 55 days
  - future CC Planner/Hub needs due date + minimum required formula
- Min payment NULL on Alfalah CC.
- 3 bills with null due_day.
- Reconciliation diff_amount backend computes but frontend may hide.
- Historical audit log entries before Part 6 may have NULL entity/detail.
- SCHEMA.md needs update after Part 7/Part 8 plus ATM/Nano additions.
- Sheet → D1 sync remains broken from old migrate v1.4 CHECK constraint issue.
- May 5 sheet entries missing in D1 until sync is fixed.
- Charts:
  - CC_LIMIT placeholder may still exist depending deployed version.
  - Daily Spend Heatmap naming may still need honesty pass.
- PDF parser + bank reconciler deferred.
- Telegram bot port deferred.
- AI insights deferred.
- PWA/manifest/service-worker still not implemented.
- API identity guard deferred to next security layer.

---

## REPO MAP — sovereign-finance

### Pages

Known pages:
- `index.html`
- `add.html`
- `transactions.html`
- `accounts.html`
- `debts.html`
- `bills.html`
- `salary.html`
- `audit.html`
- `snapshots.html`
- `goals.html`
- `budgets.html`
- `reconciliation.html`
- `cc.html`
- `merchants.html`
- `charts.html`
- `atm.html` — confirmed live
- `nano-loans.html` — placeholder provided, deployment not confirmed

Potential missing/needs-check:
- `insights.html`
- `404.html`

### JS in `/js/`

Known:
- `app.js`
- `store.js`
- `theme.js`
- `numbers.js`
- `nav.js`
- `hub.js`
- `add.js`
- `transactions.js`
- `debts.js`
- `bills.js`
- `accounts.js`
- `salary.js`
- `audit.js`
- `snapshots.js`
- `goals.js`
- `budgets.js`
- `reconciliation.js`
- `cc.js`
- `merchants.js`
- `charts.js`
- `chart.umd.min.js`

Prepared/needs verify:
- `nav.js v1.0.3` ATM integration
- `theme.js v0.7.1` compact dock
- `app.css v1.0.1` motion foundation

### CSS in `/css/`

Known:
- `app.css`

Prepared/needs verify:
- `app.css v1.0.1` Layer 4A motion foundation

### API in `/functions/api/`

Known:
- `balances.js`
- `transactions.js`
- `transactions/reverse.js`
- `debts/[[path]].js`
- `bills/[[path]].js`
- `accounts/[[path]].js`
- `goals/[[path]].js`
- `budgets/[[path]].js`
- `salary/[[path]].js`
- `reconciliation/[[path]].js`
- `cc/[[path]].js`
- `audit.js`
- `snapshots.js`
- `_lib.js`
- `categories.js`
- `merchants/[[path]].js`
- `admin/migrate-from-sheet.js`
- `admin/audit-backfill.js`
- `atm/[[path]].js` — confirmed live
- `nano-loans/[[path]].js` — placeholder provided, deployment not confirmed

### D1 tables

Known:
- `accounts`
- `transactions`
- `debts`
- `bills`
- `audit_log`
- `snapshots`
- `snapshot_data`
- `reconciliation`
- `categories`
- `goals`
- `budgets`
- `merchants`
- `settings`
- `nano_loans` — confirmed live

---

## REPO MAP — sovereign-ops-private_sheet

### Root
- `appsscript.json`
- `README.md`
- `SOVEREIGN_STATE.md`
- `GLEAN_OPERATING_SYSTEM.md`
- `Isnad.gs`

### `/core/`
- `Code.gs`
- `Menu_Loader.gs`
- `Settings_Dispatcher.gs`

### `/ai/`
- `AI.gs`
- `AI_Engine.gs`
- `Telegram.gs`
- `Telegram_Format.gs`

### `/webapp/`
- `WebApp.gs`
- `dashboard.html`

### `/cockpits/`
- `Mission_Pro.gs`
- `Habits_Pro.gs`
- `Salah_pro.gs`
- `Progress_Pro.gs`
- `Health_Pro.gs`

### `/finance/`
- `Finance_Pro.gs`
- `Finance_Snapshot.gs`
- `Finance_Charts.gs`
- `Finance_Salary.gs`
- `Finance_Kite.gs`
- `Finance_Debts.gs`
- `Finance_Intl.gs`
- `Finance_ATM.gs`
- `Finance_NanoLoan.gs`
- `Finance_Merchants.gs`
- `Finance_BankReconciler.gs`
- `Finance_PDFParser.gs`
- `Finance_Reconciliation.gs`
- `Finance_Vaccine.gs`
- `Sheet_To_D1_Export.gs`

### `/audit/`
- `Audit_Guardian.gs`
- `Sovereign_Linter.gs`
- `Ghost_Hunter.gs`
- `Loss_Auditor.gs`
- `Inspector_AlfalahCC.gs`
- `Cockpit_Guardian.gs`

### `/theme-layout/`
- `Theme_Pro.gs`
- `Cockpit_Layout.gs`
- `Tab_Manager.gs`
- `Charts_pro.gs`

### `/utils/`
- `_Diagnostic.gs`
- `Sovereign_Backup.gs`
- `D1_Export.gs`
- `_OneTime_LabelFlaggedRows.gs`

---

## ACCESS PATTERN

Glean reads via `glean_document_reader` with authenticated raw URL.

Rules:
- One file per call when reading repo files.
- Mandatory cache-bust query param on every repo read.
- Never store PAT in memory.
- Never paste PAT in state file.
- Operator pastes fresh session token when needed.

Patterns:
```text
Sheet repo:
https://Zeeshan211:[SESSION_TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[PATH]?cb=YYYYMMDDHHMM

Cloudflare repo:
https://Zeeshan211:[SESSION_TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-finance/main/[PATH]?cb=YYYYMMDDHHMM
```

GitHub edit URLs:
```text
Sheet repo:
https://github.com/Zeeshan211/sovereign-ops-private_sheet/edit/main/[PATH]

Cloudflare repo:
https://github.com/Zeeshan211/sovereign-finance/edit/main/[PATH]
```

GitHub new-file URLs:
```text
https://github.com/Zeeshan211/sovereign-finance/new/main/[FOLDER]
```

---

## TOKEN STATUS

- No token is stored here.
- Tokens are session-only.
- Operator must rotate any PAT pasted into chat history.
- Next session starts with fresh PAT if repo reads are needed.
- Token scope should be read-only and limited to:
  - `sovereign-finance`
  - `sovereign-ops-private_sheet`

---

## ACTIVE PRINCIPLES

1. Banking-grade preserved through Cloudflare migration.
2. Snap-before-mutate + audit-after-write on every endpoint.
3. Family-grade UX from day one.
4. Public-readiness discipline.
5. Chunk-shipping model.
6. Baby-step instructions standard.
7. Operator decides when to stop.
8. Privacy lockdown — codes only.
9. Always read existing CSS/HTML/JS before introducing new markup.
10. Use existing design language unless intentionally upgrading layer.
11. Glean is responsible peer, not yes-man.
12. Each sub-chunk lock includes parity check vs Sheet.
13. Verify-after-deploy protocol.
14. Full-file rewrites only — no surgical edits.
15. One ship at a time unless explicitly batched under OS gates.
16. Read existing target file before writing anything that depends on it.
17. When stuck on render bug, ship instrumented version.
18. Delivery Order Rule v2 applies inside OS Layer 3 ship section.
19. No-live-ledger-test rule.
20. Three-cache diagnostic.
21. State file trust-but-verify.
22. GitHub edit URL bracket encoding.
23. Honest target reality-check.
24. Right-sized audits — full 7-layer for destructive/schema/audit-logic.
25. Old 3 Production Safety Rules superseded by OS v1.0, kept as pattern library.
26. Schema-cite gate.
27. State file follow protocol.
28. DOM-cite gate.
29. Failed-verify rollback.
30. Audit depth honesty: SCAN vs TRACE vs EXECUTE.
31. Cloudflare cache-bust protocol.
32. D1 PRAGMA overrides SCHEMA.md.
33. Test data isolation.
34. Vendor over CDN.
35. No downloadable sandbox files for Sovereign Ops unless explicitly requested.

---

## OS v1.0 BINDING RULES

`GLEAN_OPERATING_SYSTEM.md` governs all Sovereign Ops work.

Before any ship:
- State active layer.
- State ship type.
- State risk class.
- State pre-flight status.
- State layer fit.
- State stop condition.

Required OS layers:
- Layer 1: Confidence protocol `[V] [R] [A]`
- Layer 2: Pre-flight checklist
- Layer 3: Ship gate
- Layer 4: Post-ship contract

Stop conditions:
- Operator says halt.
- Two same-class strikes.
- Unchecked pre-flight.
- Decision-relevant assumption.
- Operator energy concern.

Ship caps:
- Tier 1 destructive: max 2/session.
- Tier 2 mutating: max 4/session.
- Tier 3 metadata/read-only: max 8/session.
- Total max 8 ships/session.

---

## RCA SUMMARY

Known patterns:
1. Stale cache cascade.
2. Cloudflare Pages routing collision.
3. Frontend ID mismatch.
4. Silent backend contract drift.
5. Browser cache as third cache layer.
6. State file drift.
7. Assumed enum/column/ID values without reading data.
8. GitHub edit URL bracket encoding.
9. Past-session smoke pollution.
10. Aspirational targets need honest reality checks.
11. Theater fixes that do not change threat model.
12. Audit-depth misrepresentation.
13. Cloudflare Pages stale function cache.
14. SCHEMA.md drift from D1 reality.
15. Test data pollution risk.
16. CSP blocks CDN scripts by design.
17. Infinite retry loops tax operator attention.
18. Silent no-op disguised as success.
19. Surgical-edit instructions corrupt files.
20. Schema assumption without PRAGMA equals guaranteed bug.
21. Same word every layer; no translation tax.
22. Destructive batch ops need preview-before-execute mode.
23. Frontend-only login is not security.
24. Access wildcard subdomain does not protect production root.
25. Downloadable-file shortcut violates Sovereign Ops operator workflow.

---

## NEXT SESSION START

Activation phrase:

```text
boot vault
```

Expected ack:

```text
📁 Project online. Current chunk: Chunk 1 - FINANCE COMPLETE · Status: Cloudflare secured; ATM live; Nano schema live; module verification pending · OS v1.0 active · Strikes: 0/2 · Ships budget: 0/8.
Active items:
1. Verify ATM Hub/nav integration.
2. Verify Nano Loans API/page deployment.
3. Continue Layer 5C integration or API identity guard depending operator priority.
Pre-flight mode active for this session — Y/N? (default YES)
```

---

## NEXT SESSION PRIORITIES

1. Verify ATM Ship 3:
   - `js/nav.js v1.0.3`
   - `index.html v0.9.6`
   - Hub daily tools includes ATM Control
   - desktop nav includes ATM
   - mobile bottom nav unchanged

2. Verify Nano Ship 2:
   - `/api/nano-loans`
   - expected `ok:true`
   - expected `version:"v0.1.0"`
   - expected `loans: []`
   - expected `summary.active_count: 0`

3. Verify Nano Ship 3:
   - `/nano-loans.html`
   - expected page loads
   - source account dropdown loads
   - empty active/closed loan states render

4. If Nano API/page are live:
   - Ship Nano Hub/nav integration.
   - Same pattern as ATM.

5. Keep no-ledger-pollution rule active:
   - no fake ATM withdrawal
   - no fake nano loan
   - no fake repayment
   - no fake push-to-CC

6. Security next layer:
   - API identity guard on mutating endpoints.

7. Later:
   - Sheet → D1 sync fix.
   - SCHEMA.md update.
   - PWA manifest/service-worker.
   - final finance parity audit.

---

## CHUNK 1 PROGRESS LOG

| Area | Status |
|---|---|
| Sheet hardening | done |
| D1 migration foundation | done |
| Core ledger write path | done |
| Accounts | done |
| Transactions | done |
| Debts | mostly done; edit/reclassify hardening parked |
| Bills | done |
| Goals | done |
| Budgets | done |
| Salary | done |
| CC Planner | done; billing formula still parked |
| Reconciliation | done; UI polish deferred |
| Audit | done; older audit backfill deferred |
| Merchants | page/API done; deeper fee logic deferred |
| Charts | live; visual standard |
| Layer 4 motion foundation | prepared; deployment needs verify |
| Theme compact dock | prepared; deployment needs verify |
| Cloudflare Access S1 | complete |
| ATM API | live |
| ATM page | live |
| ATM Hub/nav | prepared; deployment needs verify |
| Nano Loans schema | live and verified |
| Nano Loans API | prepared; deployment needs verify |
| Nano Loans page | prepared; deployment needs verify |
| Nano Loans Hub/nav | not started |
| Sheet → D1 sync | broken/paused |
| PDF parser + bank reconciler | deferred |
| Telegram bot port | deferred |
| AI insights | deferred |
| PWA | not started |
| API identity guard | not started |
| SCHEMA.md | needs update |
| Final finance parity audit | not started |

---

## STATE-SAVE INTEGRITY

This file is the single source of truth for project state.

Save protocol:
- Update after each major ship batch.
- Update at session close.
- Do not overwrite with partial chunks.
- If appending a closeout, make clear whether it is a chunk or full-file replacement.

Current file is a full consolidated replacement as of 2026-05-06.

---

## END OF 2026-05-06 CLOSEOUT

Current state:
- Website is protected by Cloudflare Access.
- ATM backend/page are live.
- Nano schema is live.
- Nano API/page are prepared but unconfirmed.
- No ledger-polluting test rows were created.
- Next session should begin by verifying ATM/Nano deployment state under Cloudflare Access.
# SOVEREIGN OPS — STATE FILE

**Last updated:** 2026-05-06 session closeout — Cloudflare Access S1 + ATM + Nano Loans  
**Last session ended:** 2026-05-06  
**Activation:** `boot vault` → Glean reads `GLEAN_OPERATING_SYSTEM.md` FIRST, then this file, then acks with chunk + status + strikes + ships budget  
**OS active:** v1.0 — pre-flight gates mandatory, max 8 ships per session  
**Token rule:** no GitHub PAT stored in this file or memory; operator pastes fresh session token when repo reads are needed

---

## CURRENT CHUNK

**Chunk 1 — FINANCE COMPLETE**  
**Current status:** Finance Cloudflare app is functional, secured at edge, and mid-port for remaining finance modules.

Current high-level state:
- Core ledger/write path: shipped and usable.
- Charts: live and visual standard for the site.
- Cloudflare Access S1: complete.
- ATM: API + page confirmed live.
- ATM Hub/nav integration: placeholder provided, deployment not confirmed.
- Nano Loans: D1 schema verified; API/page placeholders provided, deployment not confirmed.
- Sheet → D1 sync: still parked/broken from prior Part 8 migrate issue.
- No fake ledger-polluting smoke tests were run for ATM or Nano Loans.

---

## SECURITY STATE

### Cloudflare Access Phase S1 — complete

Confirmed:
- Root production app `sovereign-finance.pages.dev` is protected.
- Wildcard `*` was removed from the Cloudflare Access app subdomain so the production root is covered.
- Main website is blocked in incognito before Cloudflare login.
- Direct `/api/*` routes are blocked in incognito before Cloudflare login.

Meaning:
- Public exposure is closed at the Cloudflare edge.
- Website pages and APIs are no longer openly accessible.

Not yet complete:
- API identity guard on mutating endpoints.
- Role-based access.
- Identity-bound audit entries.
- Custom domain.

Next security layer:
- Add API identity guard using Cloudflare Access identity/JWT/email checks on all mutating endpoints.

---

## ACTIVE LAYERS

### Layer 4 — Website polish

Status:
- Charts is the visual source of truth.
- Hub has been pushed toward Charts-style premium cockpit design.
- `app.css v1.0.1` motion foundation was provided.
- `theme.js v0.7.1` compact theme dock was provided to fix the oversized/stuck theme menu.
- Need verify which Layer 4 motion/theme files are actually deployed live.

Design rule:
- Animate the interface, not the numbers.
- No fake balance count-ups.
- Money values must stay exact and honest.

### Layer 5A — Debt edit/reclassify hardening

Status:
- Debt correction issue discovered.
- `debt_sehat_kahani_1` was corrected directly in D1 from `owe` to `owed`.
- API `PUT /api/debts/debt_sehat_kahani_1` had D1 bind/type issue and remains parked.
- Debt edit/reclassify UI/API hardening remains Layer 5A follow-up.

Verified debt row:
- `id`: `debt_sehat_kahani_1`
- `kind`: `owed`
- `original_amount`: `11800`
- `paid_amount`: `0`
- `remaining`: `11800`
- `snowball_order`: `4`
- `status`: `active`
- `notes`: manual D1 correction after API PUT bind error

Next verify if resuming:
```sql
SELECT id,timestamp,action,entity,entity_id,kind,detail,created_by
FROM audit_log
WHERE entity_id='debt_sehat_kahani_1'
ORDER BY timestamp DESC
LIMIT 3;
```

### Layer 5B — ATM web port

Confirmed complete:
- Ship 1: `/api/atm` backend is live.
- Ship 2: `atm.html` page is live.
- Sheet ATM logic ported:
  - ATM withdrawal is not a single expense.
  - It is modeled as linked cash movement.
  - Source bank OUT + Cash/wallet IN.
  - Optional ATM fee row tracks pending fee reversal.
- No live ATM withdrawal smoke test was run.

Prepared but not confirmed deployed:
- Ship 3: Hub/nav integration.
- `js/nav.js v1.0.3` placeholder was provided.
- `index.html v0.9.6` placeholder was provided.
- These should add:
  - ATM to desktop nav.
  - ATM Control card to Hub.
  - ATM Pending metric.
  - ATM reversals in What Needs Action.
  - Mobile bottom nav remains Hub/Add/Tx/Bills/CC.

Next verification:
- Check live Hub footer:
  - `v0.9.6 · layer 5B ATM-integrated hub · nav v1.0.3 · app.css v1.0.1`
- Check Hub daily tools includes ATM Control.
- Check desktop nav includes ATM.
- Check mobile bottom nav remains Hub/Add/Tx/Bills/CC.
- Do not run ATM withdrawal test.
- Do not mark fee reversed unless real bank reversal happened.

### Layer 5C — Nano Loans web port

Confirmed complete:
- Ship 1: D1 schema foundation completed.
- `nano_loans` table exists.
- 5 indexes verified:
  - `idx_nano_loans_app`
  - `idx_nano_loans_date`
  - `idx_nano_loans_pushed`
  - `idx_nano_loans_source`
  - `idx_nano_loans_status`
- `PRAGMA table_info(nano_loans)` verified 21 columns from `id` through `updated_at`.
- `audit_log` contains `NANO_SCHEMA_CREATE`.
- No nano loan creation was performed.

Notes:
- Cloudflare Console showed harmless SQL errors when expected-output text like `NANO_SCHEMA_CREATE` and `nano_loan_rows = 0` was pasted as SQL.
- No create/repay/push-to-CC mutation was run, so no ledger pollution occurred.

Prepared but not confirmed deployed:
- Ship 2: `/api/nano-loans` backend placeholder was provided.
- Target path:
  - `functions/api/nano-loans/[[path]].js`
- Version:
  - `v0.1.0`
- Routes:
  - `GET /api/nano-loans`
  - `POST /api/nano-loans`
  - `POST /api/nano-loans/{id}/repay`
  - `POST /api/nano-loans/{id}/push-to-cc`

Prepared but not confirmed deployed:
- Ship 3: `nano-loans.html` page placeholder was provided.

Next verification:
1. Check `/api/nano-loans` after Cloudflare Access login.
2. Expected:
   - `"ok": true`
   - `"version": "v0.1.0"`
   - `"loans": []`
   - `"summary": { "active_count": 0 }`
3. Check `/nano-loans.html` after Cloudflare Access login.
4. Expected:
   - `Live · Nano API v0.1.0`
   - `Active Loans = 0`
   - `Remaining = Rs 0`
   - empty active/closed loan states
5. Do not create test nano loans.
6. Do not run repay.
7. Do not run push-to-CC.

---

## BANKING-GRADE SAFETY STATUS

Confirmed safe:
- Core transaction ledger write path.
- Bills/budgets/goals/salary/accounts.
- Charts read-only module.
- Cloudflare Access S1 edge protection.
- ATM API/page deployed without test ledger pollution.
- Nano Loans schema created without loan creation.

Still requiring hardening:
- API identity guard on all mutating endpoints.
- Debt PUT bind/type issue.
- Nano Loans API/page deployment verification.
- ATM Hub/nav integration verification.
- Sheet → D1 sync.
- SCHEMA.md update.
- Reconciliation UI polish.
- Final full parity audit vs Sheet finance modules.

---

## NO-LEDGER-POLLUTION RULE

Active until Chunk 1 Finance final lock.

Do not run fake/live smoke tests that create real rows for:
- ATM withdrawal
- ATM fee reversal
- Nano loan creation
- Nano loan repayment
- Nano push-to-CC
- Debt add/pay/receive unless real
- Test transaction rows

Allowed verification:
- Page loads.
- API GET/read-only endpoints.
- Footer/version checks.
- Empty-state checks.
- Existing-data rendering checks.
- D1 schema inspection.
- Audit-log inspection.

Real mutation only when operator is performing a real financial action.

---

## PROCESS CORRECTION — FILE DELIVERY

Locked correction from 2026-05-06:

Glean violated Sovereign Ops delivery rules by offering downloadable sandbox files for `nav.js` and `index.html`.

Going forward:
- No downloadable sandbox files for Sovereign Ops code delivery unless operator explicitly asks.
- All Sovereign Ops ships must be manual copy-paste placeholders directly in chat.
- Required format:
  - exact edit URL
  - target path
  - full code block
  - commit message
  - deploy wait
  - verification steps
  - 3-branch reply line
- Never substitute sandbox download links for full code blocks.

---

## TODAY'S SESSION SCORECARD — 2026-05-06

Completed:
- Cloudflare Access S1 production root protection.
- Website and `/api/*` blocked before login.
- ATM backend live.
- ATM page live.
- Nano Loans D1 schema live and verified.
- Nano Loans audit schema event verified.
- Nano Loans API placeholder provided.
- Nano Loans page placeholder provided.
- ATM Hub/nav placeholder provided.
- Layer 4 motion/theme polish work prepared.

Not confirmed:
- ATM Ship 3 Hub/nav deployment.
- Nano Ship 2 API deployment.
- Nano Ship 3 page deployment.
- Theme dock deployment.
- Full app.css motion foundation deployment.

Mistake:
- Glean gave downloadable sandbox files despite locked prohibition.
- Corrected in state file and memory.

---

## OPEN ANOMALIES + DEFERRED POLISH

- Debt API PUT bind/type error remains parked.
- `debt_sehat_kahani_1` audit verification still worth checking.
- Merchants deferred to post-Layer-4 feature/schema backlog.
- Merchant real purpose: automatic fee calculation, PRA/local fees, international/FX fees.
- CC billing logic parked:
  - statement date: 12th monthly
  - interest-free period: 55 days
  - future CC Planner/Hub needs due date + minimum required formula
- Min payment NULL on Alfalah CC.
- 3 bills with null due_day.
- Reconciliation diff_amount backend computes but frontend may hide.
- Historical audit log entries before Part 6 may have NULL entity/detail.
- SCHEMA.md needs update after Part 7/Part 8 plus ATM/Nano additions.
- Sheet → D1 sync remains broken from old migrate v1.4 CHECK constraint issue.
- May 5 sheet entries missing in D1 until sync is fixed.
- Charts:
  - CC_LIMIT placeholder may still exist depending deployed version.
  - Daily Spend Heatmap naming may still need honesty pass.
- PDF parser + bank reconciler deferred.
- Telegram bot port deferred.
- AI insights deferred.
- PWA/manifest/service-worker still not implemented.
- API identity guard deferred to next security layer.

---

## REPO MAP — sovereign-finance

### Pages

Known pages:
- `index.html`
- `add.html`
- `transactions.html`
- `accounts.html`
- `debts.html`
- `bills.html`
- `salary.html`
- `audit.html`
- `snapshots.html`
- `goals.html`
- `budgets.html`
- `reconciliation.html`
- `cc.html`
- `merchants.html`
- `charts.html`
- `atm.html` — confirmed live
- `nano-loans.html` — placeholder provided, deployment not confirmed

Potential missing/needs-check:
- `insights.html`
- `404.html`

### JS in `/js/`

Known:
- `app.js`
- `store.js`
- `theme.js`
- `numbers.js`
- `nav.js`
- `hub.js`
- `add.js`
- `transactions.js`
- `debts.js`
- `bills.js`
- `accounts.js`
- `salary.js`
- `audit.js`
- `snapshots.js`
- `goals.js`
- `budgets.js`
- `reconciliation.js`
- `cc.js`
- `merchants.js`
- `charts.js`
- `chart.umd.min.js`

Prepared/needs verify:
- `nav.js v1.0.3` ATM integration
- `theme.js v0.7.1` compact dock
- `app.css v1.0.1` motion foundation

### CSS in `/css/`

Known:
- `app.css`

Prepared/needs verify:
- `app.css v1.0.1` Layer 4A motion foundation

### API in `/functions/api/`

Known:
- `balances.js`
- `transactions.js`
- `transactions/reverse.js`
- `debts/[[path]].js`
- `bills/[[path]].js`
- `accounts/[[path]].js`
- `goals/[[path]].js`
- `budgets/[[path]].js`
- `salary/[[path]].js`
- `reconciliation/[[path]].js`
- `cc/[[path]].js`
- `audit.js`
- `snapshots.js`
- `_lib.js`
- `categories.js`
- `merchants/[[path]].js`
- `admin/migrate-from-sheet.js`
- `admin/audit-backfill.js`
- `atm/[[path]].js` — confirmed live
- `nano-loans/[[path]].js` — placeholder provided, deployment not confirmed

### D1 tables

Known:
- `accounts`
- `transactions`
- `debts`
- `bills`
- `audit_log`
- `snapshots`
- `snapshot_data`
- `reconciliation`
- `categories`
- `goals`
- `budgets`
- `merchants`
- `settings`
- `nano_loans` — confirmed live

---

## REPO MAP — sovereign-ops-private_sheet

### Root
- `appsscript.json`
- `README.md`
- `SOVEREIGN_STATE.md`
- `GLEAN_OPERATING_SYSTEM.md`
- `Isnad.gs`

### `/core/`
- `Code.gs`
- `Menu_Loader.gs`
- `Settings_Dispatcher.gs`

### `/ai/`
- `AI.gs`
- `AI_Engine.gs`
- `Telegram.gs`
- `Telegram_Format.gs`

### `/webapp/`
- `WebApp.gs`
- `dashboard.html`

### `/cockpits/`
- `Mission_Pro.gs`
- `Habits_Pro.gs`
- `Salah_pro.gs`
- `Progress_Pro.gs`
- `Health_Pro.gs`

### `/finance/`
- `Finance_Pro.gs`
- `Finance_Snapshot.gs`
- `Finance_Charts.gs`
- `Finance_Salary.gs`
- `Finance_Kite.gs`
- `Finance_Debts.gs`
- `Finance_Intl.gs`
- `Finance_ATM.gs`
- `Finance_NanoLoan.gs`
- `Finance_Merchants.gs`
- `Finance_BankReconciler.gs`
- `Finance_PDFParser.gs`
- `Finance_Reconciliation.gs`
- `Finance_Vaccine.gs`
- `Sheet_To_D1_Export.gs`

### `/audit/`
- `Audit_Guardian.gs`
- `Sovereign_Linter.gs`
- `Ghost_Hunter.gs`
- `Loss_Auditor.gs`
- `Inspector_AlfalahCC.gs`
- `Cockpit_Guardian.gs`

### `/theme-layout/`
- `Theme_Pro.gs`
- `Cockpit_Layout.gs`
- `Tab_Manager.gs`
- `Charts_pro.gs`

### `/utils/`
- `_Diagnostic.gs`
- `Sovereign_Backup.gs`
- `D1_Export.gs`
- `_OneTime_LabelFlaggedRows.gs`

---

## ACCESS PATTERN

Glean reads via `glean_document_reader` with authenticated raw URL.

Rules:
- One file per call when reading repo files.
- Mandatory cache-bust query param on every repo read.
- Never store PAT in memory.
- Never paste PAT in state file.
- Operator pastes fresh session token when needed.

Patterns:
```text
Sheet repo:
https://Zeeshan211:[SESSION_TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-ops-private_sheet/main/[PATH]?cb=YYYYMMDDHHMM

Cloudflare repo:
https://Zeeshan211:[SESSION_TOKEN]@raw.githubusercontent.com/Zeeshan211/sovereign-finance/main/[PATH]?cb=YYYYMMDDHHMM
```

GitHub edit URLs:
```text
Sheet repo:
https://github.com/Zeeshan211/sovereign-ops-private_sheet/edit/main/[PATH]

Cloudflare repo:
https://github.com/Zeeshan211/sovereign-finance/edit/main/[PATH]
```

GitHub new-file URLs:
```text
https://github.com/Zeeshan211/sovereign-finance/new/main/[FOLDER]
```

---

## TOKEN STATUS

- No token is stored here.
- Tokens are session-only.
- Operator must rotate any PAT pasted into chat history.
- Next session starts with fresh PAT if repo reads are needed.
- Token scope should be read-only and limited to:
  - `sovereign-finance`
  - `sovereign-ops-private_sheet`

---

## ACTIVE PRINCIPLES

1. Banking-grade preserved through Cloudflare migration.
2. Snap-before-mutate + audit-after-write on every endpoint.
3. Family-grade UX from day one.
4. Public-readiness discipline.
5. Chunk-shipping model.
6. Baby-step instructions standard.
7. Operator decides when to stop.
8. Privacy lockdown — codes only.
9. Always read existing CSS/HTML/JS before introducing new markup.
10. Use existing design language unless intentionally upgrading layer.
11. Glean is responsible peer, not yes-man.
12. Each sub-chunk lock includes parity check vs Sheet.
13. Verify-after-deploy protocol.
14. Full-file rewrites only — no surgical edits.
15. One ship at a time unless explicitly batched under OS gates.
16. Read existing target file before writing anything that depends on it.
17. When stuck on render bug, ship instrumented version.
18. Delivery Order Rule v2 applies inside OS Layer 3 ship section.
19. No-live-ledger-test rule.
20. Three-cache diagnostic.
21. State file trust-but-verify.
22. GitHub edit URL bracket encoding.
23. Honest target reality-check.
24. Right-sized audits — full 7-layer for destructive/schema/audit-logic.
25. Old 3 Production Safety Rules superseded by OS v1.0, kept as pattern library.
26. Schema-cite gate.
27. State file follow protocol.
28. DOM-cite gate.
29. Failed-verify rollback.
30. Audit depth honesty: SCAN vs TRACE vs EXECUTE.
31. Cloudflare cache-bust protocol.
32. D1 PRAGMA overrides SCHEMA.md.
33. Test data isolation.
34. Vendor over CDN.
35. No downloadable sandbox files for Sovereign Ops unless explicitly requested.

---

## OS v1.0 BINDING RULES

`GLEAN_OPERATING_SYSTEM.md` governs all Sovereign Ops work.

Before any ship:
- State active layer.
- State ship type.
- State risk class.
- State pre-flight status.
- State layer fit.
- State stop condition.

Required OS layers:
- Layer 1: Confidence protocol `[V] [R] [A]`
- Layer 2: Pre-flight checklist
- Layer 3: Ship gate
- Layer 4: Post-ship contract

Stop conditions:
- Operator says halt.
- Two same-class strikes.
- Unchecked pre-flight.
- Decision-relevant assumption.
- Operator energy concern.

Ship caps:
- Tier 1 destructive: max 2/session.
- Tier 2 mutating: max 4/session.
- Tier 3 metadata/read-only: max 8/session.
- Total max 8 ships/session.

---

## RCA SUMMARY

Known patterns:
1. Stale cache cascade.
2. Cloudflare Pages routing collision.
3. Frontend ID mismatch.
4. Silent backend contract drift.
5. Browser cache as third cache layer.
6. State file drift.
7. Assumed enum/column/ID values without reading data.
8. GitHub edit URL bracket encoding.
9. Past-session smoke pollution.
10. Aspirational targets need honest reality checks.
11. Theater fixes that do not change threat model.
12. Audit-depth misrepresentation.
13. Cloudflare Pages stale function cache.
14. SCHEMA.md drift from D1 reality.
15. Test data pollution risk.
16. CSP blocks CDN scripts by design.
17. Infinite retry loops tax operator attention.
18. Silent no-op disguised as success.
19. Surgical-edit instructions corrupt files.
20. Schema assumption without PRAGMA equals guaranteed bug.
21. Same word every layer; no translation tax.
22. Destructive batch ops need preview-before-execute mode.
23. Frontend-only login is not security.
24. Access wildcard subdomain does not protect production root.
25. Downloadable-file shortcut violates Sovereign Ops operator workflow.

---

## NEXT SESSION START

Activation phrase:

```text
boot vault
```

Expected ack:

```text
📁 Project online. Current chunk: Chunk 1 - FINANCE COMPLETE · Status: Cloudflare secured; ATM live; Nano schema live; module verification pending · OS v1.0 active · Strikes: 0/2 · Ships budget: 0/8.
Active items:
1. Verify ATM Hub/nav integration.
2. Verify Nano Loans API/page deployment.
3. Continue Layer 5C integration or API identity guard depending operator priority.
Pre-flight mode active for this session — Y/N? (default YES)
```

---

## NEXT SESSION PRIORITIES

1. Verify ATM Ship 3:
   - `js/nav.js v1.0.3`
   - `index.html v0.9.6`
   - Hub daily tools includes ATM Control
   - desktop nav includes ATM
   - mobile bottom nav unchanged

2. Verify Nano Ship 2:
   - `/api/nano-loans`
   - expected `ok:true`
   - expected `version:"v0.1.0"`
   - expected `loans: []`
   - expected `summary.active_count: 0`

3. Verify Nano Ship 3:
   - `/nano-loans.html`
   - expected page loads
   - source account dropdown loads
   - empty active/closed loan states render

4. If Nano API/page are live:
   - Ship Nano Hub/nav integration.
   - Same pattern as ATM.

5. Keep no-ledger-pollution rule active:
   - no fake ATM withdrawal
   - no fake nano loan
   - no fake repayment
   - no fake push-to-CC

6. Security next layer:
   - API identity guard on mutating endpoints.

7. Later:
   - Sheet → D1 sync fix.
   - SCHEMA.md update.
   - PWA manifest/service-worker.
   - final finance parity audit.

---

## CHUNK 1 PROGRESS LOG

| Area | Status |
|---|---|
| Sheet hardening | done |
| D1 migration foundation | done |
| Core ledger write path | done |
| Accounts | done |
| Transactions | done |
| Debts | mostly done; edit/reclassify hardening parked |
| Bills | done |
| Goals | done |
| Budgets | done |
| Salary | done |
| CC Planner | done; billing formula still parked |
| Reconciliation | done; UI polish deferred |
| Audit | done; older audit backfill deferred |
| Merchants | page/API done; deeper fee logic deferred |
| Charts | live; visual standard |
| Layer 4 motion foundation | prepared; deployment needs verify |
| Theme compact dock | prepared; deployment needs verify |
| Cloudflare Access S1 | complete |
| ATM API | live |
| ATM page | live |
| ATM Hub/nav | prepared; deployment needs verify |
| Nano Loans schema | live and verified |
| Nano Loans API | prepared; deployment needs verify |
| Nano Loans page | prepared; deployment needs verify |
| Nano Loans Hub/nav | not started |
| Sheet → D1 sync | broken/paused |
| PDF parser + bank reconciler | deferred |
| Telegram bot port | deferred |
| AI insights | deferred |
| PWA | not started |
| API identity guard | not started |
| SCHEMA.md | needs update |
| Final finance parity audit | not started |

---

## STATE-SAVE INTEGRITY

This file is the single source of truth for project state.

Save protocol:
- Update after each major ship batch.
- Update at session close.
- Do not overwrite with partial chunks.
- If appending a closeout, make clear whether it is a chunk or full-file replacement.

Current file is a full consolidated replacement as of 2026-05-06.

---

## END OF 2026-05-06 CLOSEOUT

Current state:
- Website is protected by Cloudflare Access.
- ATM backend/page are live.
- Nano schema is live.
- Nano API/page are prepared but unconfirmed.
- No ledger-polluting test rows were created.
- Next session should begin by verifying ATM/Nano deployment state under Cloudflare Access.
