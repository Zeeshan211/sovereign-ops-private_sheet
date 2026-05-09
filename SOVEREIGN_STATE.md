## 2026-05-09 — Finance Command Centre QA Cockpit Progress

### Current status

Finance Command Centre work reached the frontend trial-gate milestone.

Current confirmed sequence:
1. Forecast + Monthly Close metadata cleanup shipped.
2. Add Transaction clean UI + script alignment shipped.
3. Command Centre v0.1 shell shipped.
4. Command Centre v0.2 Real API Health layer shipped.
5. Command Centre v0.3 UI Cleanliness + Metadata Scanner shipped.
6. Command Centre v0.4 Impact Graph shipped.
7. Preserve-first Command Centre v0.5 Readiness Rules shipped.
8. Command Centre v0.6 Final Trial Gate was generated and treated as the final frontend gate ship.

Important correction:
- A compressed/rejected v0.5 rewrite was generated incorrectly and must not count as a valid ship.
- Do not use that rejected compressed file as rollback target.
- Valid rollback target before v0.6 is the preserve-first v0.5 commit: `Preserve Command Centre and add readiness rules v0.5`.

### Ship cap

Current ship window reached 8/8 valid shipments.

No further code shipments should be sent in this window unless a valid OS mode is activated.

Next allowed work without new ship window:
- planning
- backend contract draft
- D1 read-only checklist
- acceptance criteria
- rollback plan
- state-file update

### Command Centre current capability

Command Centre is now a strong known-surface QA cockpit.

It can check:
- known page registry
- known API health
- finance truth signals
- UI metadata/source cleanliness
- impact graph and downstream recheck chain
- hard blockers, warnings, and unknowns
- allowed vs blocked trial pages
- final trial gate
- next 3 fixes
- closeout reminder

Important truth:
Command Centre is not yet a full 100% truth engine. It can only audit what it knows to check.

Current honest status:
- Useful as a known-page / known-API trial gate.
- Not enough to certify the whole finance system as 100% safe.
- Unknown coverage must remain Unknown, not Ready.

### Meta-audit findings

Command Centre can still miss:
- pages not in its registry
- APIs not in its registry
- runtime JS/browser errors
- nav rendering issues
- CSS/layout issues
- backend formula mistakes
- D1 data consistency issues
- write-path safety without dry-run support
- stale cache/deploy mismatch
- scanner false positives and false negatives

Known issues from meta-audit:
- Salary still needs cleanup because it exposes money-contracts metadata/source wording.
- Hub still needs cleanup because it exposes debug/version/API wording.
- Wrong close routes such as `close-month.html` and `month-close.html` may fall back to Hub instead of clean redirect/404.
- Command Centre scanner needs polarity handling so safe phrases like “does not use money contracts” are not treated the same as actual unsafe usage.
- Runtime/browser proof is still manual.

### Next queued shipment

Next real shipment should be backend, not more frontend.

Queued Shipment A:
`/api/finance-command-center` backend read-only audit endpoint.

Recommended file:
`functions/api/finance-command-center.js`

Purpose:
- make Command Centre backend-aware
- audit known APIs
- audit D1 table/read-model health
- audit business rules
- return blockers, warnings, unknowns, scores, next actions
- give frontend a backend truth source instead of relying only on browser-side checks

Allowed:
- D1 SELECT/read-only checks
- table existence checks
- row-count checks
- API contract checks
- business-rule checks
- blocker/warning/unknown generation

Not allowed:
- D1 writes
- ledger tests
- transaction creation
- backend finance logic rewrites
- `/api/money-contracts`
- real save-path smoke tests
- fake 100% readiness

### Shipment A draft scope

Backend response should include:
- `ok`
- `version`
- `computed_at`
- `verdict`
- `score`
- `scores`
- `hard_blockers`
- `warnings`
- `unknowns`
- `modules`
- `pages`
- `apis`
- `d1`
- `business_rules`
- `next_actions`

Minimum D1 read-only checks:
- required finance tables exist
- accounts readable
- transactions readable
- bills readable
- debts readable
- categories readable
- reconciliation readable
- audit_log readable if present
- CC account/balance truth readable
- no active bill with invalid zero amount unless intentionally configured
- active debts have clear payable/receivable direction where possible
- salary baseline can be identified or marked Unknown

Minimum business rules:
- CC outstanding must not come from lifetime spend.
- CC outstanding must come from realtime account/balance source or remain Unknown.
- Salary baseline must separate guaranteed from variable/speculative.
- Forecast must not fake precision when sources are missing.
- Missing data must show Unknown, not zero.
- Add must not silently queue failed saves.
- Money-contracts must not be used as trial-trust source.
- Month activity must stay separate from full ledger truth.

### Next session start recommendation

Start next session with:
1. Secure Boot.
2. Confirm Command Centre v0.6 live state.
3. Draft `/api/finance-command-center` JSON contract.
4. Ship backend read-only endpoint only when ship window is valid.
5. Then connect frontend Command Centre to backend audit result in a later ship.

### Guardrails still active

- Full-file rewrites only for code files.
- No direct GitHub writes by Glean.
- Manual copy-paste only.
- No backend rewrites unless explicitly approved.
- No D1 SQL mutations unless explicitly approved.
- No ledger-polluting tests.
- No `/api/money-contracts` work.
- No fake balances.
- No inferred CC outstanding.
- Unknown must stay Unknown.
