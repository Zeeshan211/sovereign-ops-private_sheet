# SOVEREIGN_STATE.md

Last updated: 2026-05-09 PKT  
State owner: Operator  
Repo write mode: Manual copy-paste only  
Direct GitHub writes by Glean: prohibited  
Token policy: session-only PAT only, never stored, never echoed  

---

## Active operating frame

Current active path: PATH A — Sovereign Finance Command Centre / finance safety gate

PATH A status:
- Finance Command Centre Authority Rollout is active.
- Phase 4 page-level soft authority is complete.
- Phase 5 central Command Centre action policy is live.
- Phase 6 route gates are next.
- Phase 7 backend mutating API enforcement is not started.
- Phase 8 overrides/audit trail is not started.

PATH B status:
- Salah today-live cleanup remains available but inactive.
- Do not touch Salah when PATH A is active unless operator explicitly switches.
- Do not touch Finance when PATH B is active unless operator explicitly switches.

---

## Secure Boot / Governance

Boot phrase:
- `boot vault`

Secure Boot rules:
- Boot phrase is public wake word, not authentication.
- Before loading or revealing state, Glean must verify operator identity and fresh repo authorization.
- If fresh PAT or pasted file contents are missing, ask once for fresh GitHub PAT or pasted files.
- Never use stored token.
- Never reveal state/backlog/architecture/finance data before Secure Boot passes.
- Never write directly to personal GitHub.
- Use manual copy-paste only.

Repo policy:
- Sheet repo: sovereign-ops-private_sheet
- Finance repo: sovereign-finance
- Use session-only read PAT for repo inspection only.
- No persistent GitHub App / Code Writer / direct repo write.
- Never output token-bearing URLs.
- For code/state/governor file changes, provide:
  - exact edit URL
  - manual paste placeholder
  - commit message
  - deploy/verify steps where relevant

Governor file next:
- GLEAN_OPERATING_SYSTEM.md needs rewrite/update after this state save.
- Operator said time/coding governance needs changes.
- Do not edit governor file until state file is saved first.
- After governor rewrite, memory cleanup is next because chats are getting clogged.

---

## Current chunk

Chunk: Sovereign Finance Command Centre Authority Rollout  
Current phase: Phase 5 complete / Phase 6 next  
Current status: Command Centre is now central authority schema for action policy and lift criteria.

Plain meaning:
- Command Centre is no longer only a display cockpit.
- It now centrally defines what is blocked, why it is blocked, what source caused the block, and what must pass before the block lifts.
- Pages still only obey the verdict.
- Backend mutating APIs do not yet reject unsafe writes.
- Route gates are not live yet.
- Overrides are not live yet.

---

## Core authority rule

Command Centre full authority means:
- Block unsafe actions, routes, and later backend writes based on explicit policy and checks.
- Do not hide diagnostic truth.
- Do not rely on frontend-only scores.
- Unknown must never become Ready.
- Block unsafe action, not visibility.
- If anything is blocked, Command Centre must show:
  - what is blocked
  - block type
  - reason
  - source/rule/check
  - required fix
  - override allowed or not allowed
  - backend enforced status
  - frontend enforced status

Current enforcement reality:
- Phase 4 added page-level obedience.
- Phase 5 added central action policy and lift criteria.
- Phase 6 will add route gates.
- Phase 7 will add backend mutating API enforcement.
- Phase 8 will add override/audit system.

---

## Current verified live backend state

Latest pasted `/api/finance-command-center` output after Phase 5:

- ok: true
- version: 0.2.0
- enforcement.version: 0.2.0
- mode: authority
- schema_only: true
- verdict: ready_with_warnings
- score: 59
- api_health: 100
- d1_core: 100
- business_rules: 56
- coverage: 100
- write_safety: 0
- runtime: 0
- trial_gate.status: soft_ready
- ready_for_known_page_trial: true
- ready_for_full_system_certification: false
- hard_blocker_count: 0
- warning_count: 2
- unknown_count: 3
- blocked_routes: []
- view_only_routes: 8
- blocked_actions: 10

Live central policy includes:
- enforcement.routes
- enforcement.actions
- enforcement.blocked_actions
- enforcement.view_only_routes
- enforcement.action_checklists
- enforcement.lift_criteria
- enforcement.action_proof_status
- enforcement.block_explanations
- source_proofs
- read_only_guards

Read-only guards live:
- No D1 INSERT
- No D1 UPDATE
- No D1 DELETE
- No D1 ALTER
- No ledger smoke tests
- No transaction creation
- No /api/money-contracts
- Unknown remains Unknown
- Runtime/browser checks remain manual
- Write safety remains Unknown until dry-run exists
- Enforcement v0.2.0 is central action policy only and does not yet mutate or reject API calls

---

## Phase tree

Command Centre Authority Rollout

- Phase 0 — Architecture / policy
  - Status: complete

- Phase 1 — Backend audit + enforcement schema
  - Status: complete through `/api/finance-command-center v0.1.2`

- Phase 2 — Command Centre enforcement display
  - Status: complete through `monthly-close.html v0.7.3`

- Phase 3 — Shared enforcement loader + nav markers
  - Status: complete through `/js/enforcement.js v0.1.0` and `js/nav.js v1.2.0`

- Phase 4 — Page-level soft blocks / page obedience
  - Status: complete

- Phase 5 — Central Command Centre action policy + lift criteria
  - Status: live through `/api/finance-command-center v0.2.0`

- Phase 6 — Route gates
  - Status: next, not started

- Phase 7 — Backend mutating API enforcement
  - Status: not started

- Phase 8 — Override system + audit trail
  - Status: not started

---

## Completed phase details

### Phase 0 — Architecture / policy

Status: complete

Completed:
- Honest audit architecture agreed.
- Full authority principle agreed.
- Command Centre blocks unsafe action, not diagnostic visibility.
- Unknown cannot become Ready.
- Every block requires visible explanation in Command Centre.

### Phase 1 — Backend audit + enforcement schema

Status: complete through `/api/finance-command-center v0.1.2`

Completed:
- `/api/finance-command-center` created.
- Backend endpoint is read-only.
- No D1 writes.
- No ledger tests.
- No `/api/money-contracts`.
- v0.1.0 went live as backend audit truth endpoint.
- v0.1.1 went live with stronger trial gate, source proofs, read-only guardrails, coverage, and next actions.
- v0.1.2 went live with enforcement schema.

v0.1.2 included:
- enforcement
- global_status
- global_level
- routes
- actions
- blocked_actions
- view_only_routes
- block_explanations
- override policy disabled

Important:
- v0.1.2 did not reject mutating API calls.
- v0.1.2 defined what should be blocked and why.

### Phase 2 — Command Centre enforcement display

Status: complete through `monthly-close.html v0.7.3`

Completed:
- Displays Enforcement Authority.
- Displays Why Things Are Blocked.
- Displays Route Gates.
- Displays Action Gates.
- Displays Blocked Actions.
- Displays View-Only Routes.
- Displays Override Policy.
- Command Centre remains the authority/explanation surface.

Important:
- Command Centre explains enforcement.
- It does not hide truth.
- It must remain accessible even when other routes/actions are blocked.

### Phase 3 — Shared enforcement loader + nav markers

Status: complete through `/js/enforcement.js v0.1.0` and `js/nav.js v1.2.0`

Completed:
- `/js/enforcement.js v0.1.0` created.
- `js/nav.js v1.2.0` live.
- `window.SovereignEnforcement` available.
- Nav reads `/api/finance-command-center`.
- Nav shows enforcement markers:
  - Pass
  - Warning
  - View only
  - Blocked
- Nav does not block routes yet.
- Command Centre must always remain accessible.

### Phase 4 — Page-level soft blocks

Status: complete

Purpose:
- Pages remain visible.
- Pages obey Command Centre verdicts.
- Unsafe actions are disabled when Command Centre blocks them.
- Page-level enforcement is frontend soft authority only.
- Backend mutating API enforcement is not active yet.

Completed:
- Add Transaction soft block
- Bills soft block
- Debts soft block
- Reconciliation soft block
- Salary soft authority
- Credit Card soft authority
- Forecast soft authority

Phase 4 verified items:
- Add Transaction: complete
- Bills: complete
- Debts: complete
  - `window.SovereignDebts.version === "v0.6.1"`
  - operator confirmed: debts blocked
- Reconciliation: complete
  - `window.SovereignReconciliation.version === "v0.4.3"`
  - operator confirmed: recon blocked
- Salary: shipped as `salary.html v0.9.1`
  - live verification not separately captured in final console output
  - Phase 5 backend now shows salary source proof pass and salary route pass
  - salary.save remains blocked by write safety unknown
- Credit Card: live
  - operator confirmed: cc live
  - 4F shipped as `cc.html v0.4.2`
  - no `/api/money-contracts`
  - no historical-spend outstanding logic
- Forecast: complete
  - `window.SovereignForecast.version === "v0.3.2"`
  - operator confirmed: forecast blocked

Important Phase 4 correction:
- Do not replace large existing files with compressed rewrites.
- Current verified example: `cc.html` was ~667 lines; compressed 150-line rewrite was rejected.
- Future large file work must preserve existing file shape.
- If file is large, ship one file at a time.
- No Canvas.
- No downloadable files.
- Manual placeholders only.

### Phase 5 — Central Command Centre action policy + lift criteria

Status: live through `/api/finance-command-center v0.2.0`

Purpose:
- Command Centre centrally decides what stays blocked and what can lift.
- Pages only ask/obey central verdict.
- Guardrails lift by passing central checks, not by manual page edits.

Target file:
- `functions/api/finance-command-center.js`

Version:
- endpoint version: 0.2.0
- enforcement version: 0.2.0

Completed:
- Added central action policy.
- Added action checklists.
- Added lift criteria.
- Added action proof status.
- Added clearer why-still-blocked output.
- Added per-action required-to-lift structure.
- Kept endpoint read-only.
- Kept schema-only.
- No D1 writes.
- No route gates.
- No backend mutating API rejection.
- No overrides.
- No `/api/money-contracts`.

Phase 5 live proof from pasted output:
- `version: "0.2.0"`
- `enforcement.version: "0.2.0"`
- `enforcement.action_checklists` present
- `enforcement.lift_criteria` present
- `enforcement.action_proof_status` present
- `read_only_guards` present
- `money_contracts.use_as_truth_source` permanently blocked

Important correction:
- Operator wrote “PHASE 6 live” after pasting Phase 5 output.
- Correct interpretation: Phase 5 is live.
- Phase 6 is not live because output still says:
  - schema_only: true
  - backend_enforced: false
  - frontend_enforced: false
  - blocked_routes: []
  - route gates not actually blocking navigation yet

---

## Current blocked actions

Write safety unknown:
- transaction.save
- bill.save
- debt.save
- reconciliation.declare
- salary.save

Credit Card proof unknown:
- credit_card.plan_payment
- cc.use_for_decision
- cc.use_for_forecast

Forecast precision unknown:
- forecast.generate
- forecast.mark_ready

Permanent block:
- money_contracts.use_as_truth_source

---

## Current live blockers / warnings / unknowns

Hard blockers:
- none

Warnings:
- API health verifies route availability and JSON readability, but not every downstream formula.
- Month activity separation is not deeply verified.

Unknowns:
- Credit Card account/balance truth could not be fully verified.
- Forecast endpoint/page is not deeply checked yet.
- Add write path is not dry-run verified.

Critical live detail:
- Accounts table has one CC account, but no realtime balance column was identified.
- Credit Card proof stays unknown because `accounts` columns include `opening_balance`, `credit_limit`, `min_payment_amount`, `statement_day`, `payment_due_day`, but no verified current balance source.
- `/api/balances?debug=1` returns `cc_outstanding`, but Phase 5 did not yet treat that as sufficient CC source proof.
- Do not infer CC outstanding from lifetime spend.
- Do not treat missing CC source as zero.

---

## Next full phase

### Phase 6 — Route gates

Status: next, not started

Goal:
- Use Command Centre route verdicts to prevent unsafe entry/action at navigation or app-shell layer.
- Command Centre must remain accessible at all times.
- Diagnostic visibility must not be hidden.
- Route gates should use Phase 5 central `enforcement.routes`.
- Route gates must not start backend API rejection yet.

Phase 6 should answer:
- Which routes are view-only?
- Which routes are fully pass?
- Which routes should show blocked/action-limited state?
- How does user know why a route is blocked?
- How does Command Centre remain accessible even if others are gated?

Phase 6 must not:
- Add backend mutating API enforcement.
- Add D1 writes.
- Add override system.
- Hide Command Centre.
- Hide diagnostic truth.
- Remove page-level soft blocks.
- Re-enable blocked actions manually.
- Use `/api/money-contracts`.

Likely target files:
- `js/nav.js`
- possibly app-shell/shared navigation code only
- no page rewrites unless route-gate UI requires a small shared hook

Important:
- Before shipping Phase 6, inspect current `js/nav.js`.
- Preserve current nav shape.
- Do not compress large files.
- One full-file rewrite at a time.
- Full phase framing, but code delivery can be one file at a time if large.

---

## Phase 7 — Backend mutating API enforcement

Status: not started

Purpose:
- Mutating endpoints reject unsafe writes directly.
- Backend APIs become enforcement layer.
- This is not allowed until Phase 6 is complete and action names/checklists are stable.

Phase 7 likely covers:
- `/api/transactions`
- `/api/bills`
- `/api/debts`
- `/api/reconciliation`
- `/api/salary`
- any other POST/PUT/PATCH/DELETE routes

Hard requirement before Phase 7:
- Write safety must be designed.
- Dry-run or preflight proof must exist.
- Backend policy must be stable.
- No ledger-polluting smoke tests.
- No D1 mutation from Command Centre audit/enforcement.

---

## Phase 8 — Override system + audit trail

Status: not started

Purpose:
- Allow explicit operator override only after backend enforcement is mature.
- Override must be transparent, time-limited, reason-required, and audit-safe.

Current override status:
- disabled
- `allowed: false`
- reason required: true
- audit required: true
- expires_minutes: 30
- note: Overrides are disabled in enforcement schema v0.2.0.

Do not build overrides yet.

---

## Guardrails still active

General:
- Full-file rewrites only for code files.
- Manual copy-paste only.
- No downloadable files unless explicitly requested.
- No Canvas for code/state delivery unless explicitly requested.
- Glean must not write directly to personal GitHub.
- No compressed replacements over large files.
- Verify current file size/shape before replacement.
- One file at a time when large.
- Full phase structure, not tiny dragged subphases.

Finance safety:
- No `/api/money-contracts`.
- No D1 writes from audit/enforcement work.
- No ledger-polluting smoke tests.
- No route gates until Phase 6.
- No backend mutating API enforcement until Phase 7.
- No overrides until Phase 8.
- Command Centre must remain accessible at all times.
- Diagnostic visibility must stay available.
- If blocked, show why in Command Centre.
- Unknown must stay Unknown.
- Do not infer Credit Card outstanding from lifetime spend.
- Do not fake balances.
- Do not use frontend-only scores as final authority.

Verification:
- If operator reports a problem, verify before proposing fixes.
- Required process:
  1. Check live version.
  2. Check loaded script URLs.
  3. Check backend JSON.
  4. Check visible behavior.
  5. Check console output if available.
  6. Check file state if repo read is available.
  7. Separate verified facts from interpretation.
  8. Compare intended behavior vs actual behavior.
  9. Classify before fixing:
     - real defect
     - expected behavior
     - copy/UX issue
     - stale cache/deploy mismatch
     - backend policy issue
     - frontend rendering issue
     - operator misunderstanding

---

## Current data/source status from Phase 5

APIs passing:
- `/api/balances?debug=1` version v0.5.3
- `/api/accounts` version v0.2.6
- `/api/transactions` version v0.1.4
- `/api/bills` version 0.2.0
- `/api/debts` version v0.3.1
- `/api/categories`
- `/api/reconciliation` version v0.2.2
- `/api/salary` version v0.2.2
- `/api/forecast` version v0.2.1

D1 required tables passing:
- accounts
- transactions
- bills
- debts
- categories
- reconciliation

Optional tables present:
- audit_log
- salary
- settings

Row counts from Phase 5:
- accounts: 11
- transactions: 145
- bills: 6
- debts: 11
- categories: 13
- reconciliation: 10
- audit_log: 57
- salary: 1
- settings: 0

Business rules:
- cc_outstanding_source: unknown
- cc_unknown_not_zero: pass
- salary_baseline_split: pass
- forecast_precision: unknown
- missing_data_unknown_not_zero: pass
- add_write_path: unknown
- money_contracts_banned: pass
- month_activity_scope: warning
- debt_direction: pass

---

## Salah path saved state

PATH B — Salah today-live cleanup remains parked.

Known prior state:
- Salah D1 today-live foundation exists.
- `/api/salah/log v0.2.0` POST had worked.
- `/api/salah/today v0.2.0` had returned live data for 2026-05-08.
- Product correction agreed:
  - Fard daily score must be separate from bonus prayers.
  - Fard = core /10 from Fajr, Dhuhr, Asr, Maghrib, Isha only.
  - Bonus = Jumuah, Tahajjud, Witr, Ishraq, Duha, Awwabin, Nafl.
  - Qaza = recovery.
  - Udhr = attribute, not location/category.
- Full rewrite for `functions/api/salah/log.js v0.3.0` was provided but live verification was not confirmed.
- Final provided `salah.html v0.8.0` was intended to fix horizontal overflow, but live verification was not confirmed.

If PATH B is selected later:
1. Verify live versions for:
   - `functions/api/salah/log.js`
   - `functions/api/salah/today.js`
   - `salah.html`
2. Finish today.js read-model cleanup so score/charts match corrected model.
3. Validate no horizontal scrollbar on operator screen.
4. Do not touch Finance unless operator switches back to PATH A.

---

## Process corrections from this session

1. Full phase framing:
- Operator does not want slow subphase-by-subphase handling.
- Present full phase status, full blockers, and full phase completion path.
- Code may still be delivered one file at a time when files are large.

2. Large file safety:
- Do not replace large files with compressed rewrites.
- Verify file size/shape first.
- `cc.html` example proved this rule: current was ~667 lines and compressed rewrite was unsafe.
- `forecast.html` example: current was ~1,075 lines and required full rewrite, not compressed batch.
- `finance-command-center.js` was ~1,788 lines and had to be delivered in multiple manual placeholders.

3. Delivery surface:
- No downloadable files for Sovereign Ops unless explicitly requested.
- No Canvas for code/state delivery unless explicitly requested.
- Manual placeholders are preferred.
- For very large files, split into numbered placeholders and tell operator not to commit until final placeholder.

4. Verification before fixes:
- If something appears wrong, verify first.
- Do not accept claim and fix blindly.

5. Guardrail lifting:
- Guardrails lift centrally from Command Centre after proof checks pass.
- Pages should not manually decide to lift their own blocks.
- Bad path: edit page to remove disabled button.
- Good path: fix source/checklist so Command Centre returns allowed.

---

## Next exact work order

1. Save this `SOVEREIGN_STATE.md` update.
2. Rewrite/update `GLEAN_OPERATING_SYSTEM.md` / governor file.
   - Operator specifically said time governance needs changes.
   - Preserve Secure Boot.
   - Preserve manual-only repo writes.
   - Preserve no downloadable files.
   - Preserve full phase framing.
   - Preserve one-file-at-a-time for large files.
3. After governor file is saved, perform memory cleanup.
   - Remove stale/duplicated state.
   - Keep only durable high-signal rules.
   - Do not delete active security/governance constraints.
   - Do not delete current Finance Phase 4/5 state until state file + governor file are both saved.
4. Resume with Phase 6 route gates when operator requests execution.

---

## Boot response target after next Secure Boot

After Secure Boot passes, summarize:

Current chunk: Sovereign Finance Command Centre Authority Rollout  
Status: Phase 5 live, Phase 6 route gates next  
OS/governor: read latest GLEAN_OPERATING_SYSTEM.md  
Active path: PATH A unless operator switches  
Top active items:
1. Review governor/time rule changes.
2. Clean memory after governor save.
3. Start Phase 6 route gates only after cleanup/confirmation.

Do not default into code before governor rewrite and memory cleanup are handled.
