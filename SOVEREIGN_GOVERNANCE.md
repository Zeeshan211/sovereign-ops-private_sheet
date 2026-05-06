# Sovereign Ops Governance v0.3

## Purpose

This governance document exists for one reason:

Move the project forward fast without letting speed hide uncertainty.

The old problem was not ambition. The old problem was uncontrolled execution: too many rushed changes, weak proof, unclear rollback, and ship counts treated like emotion instead of operating limits.

The new model must protect both sides:

- Discipline must stay strong enough to prevent damage.
- Productivity must stay high enough to finish the project.
- Off-days must allow heavier output because available operator capacity is different.
- Safety gates must scale with risk, not blindly throttle every small improvement.

This document replaces rigid ship limits with a flexible capacity system.

## Core Principle

The project is governed by proof, not fear.

If a change is read-only, visual, cache-only, copy-only, or low-blast-radius, it should not be treated the same as a schema migration, ledger mutation, payment logic change, or destructive operation.

Speed is allowed.

Blind speed is not.

## Current Foundation

Sovereign Ops already uses OS v1.0 as the binding operating contract. Its core rule is that anything used for a decision must be verified in the same turn, and every code or mutation ship must pass pre-flight, confidence, ship gate, and post-ship contract rules. 

The current state file also confirms that the finance app is live behind Cloudflare Access and that the project is in Chunk 1, Finance Complete, with ATM, Nano Loans, and Reconciliation already receiving verified updates. 

The previous coding ledger used a 120-minute rolling 12-hour cap, literal operator/device time only, 73 minutes used, and 8/8 ships already consumed in that window. 

This v0.3 governance keeps the strongest part of that system: time honesty and proof before mutation.

It changes the weak part: a flat ship cap that blocks useful progress even when the operator has an off-day and the next ships are low-risk.

---

# 1. Definitions

## 1.1 Ship

A ship is any completed operator action that changes the live project state.

Examples:

- GitHub file rewrite
- GitHub new file
- D1 SQL mutation
- Schema migration
- Cloudflare config change
- State file update
- Version/cache alignment deployed to production

## 1.2 Non-Ship Work

These do not count as ships:

- Reading repo files
- Reading docs
- Inspecting live behavior
- Diagnosing root cause
- Planning next ship queue
- Writing acceptance criteria
- Writing rollback plans
- Building invariants
- Comparing logic against sheet behavior
- UI direction without deploy instructions
- Drafting governance/spec documents

Non-ship work can continue even after ship caps are reached.

## 1.3 Mutating Ship

A mutating ship changes live data, ledger behavior, business logic, account balances, bill status, loan status, debt status, audit logs, or schema.

Examples:

- Bills payment logic
- ATM ledger behavior
- Nano Loans repay/push-to-CC logic
- Balance computation
- Snapshot restore logic
- D1 INSERT/UPDATE/DELETE
- ALTER TABLE
- Audit log writes

## 1.4 Non-Mutating Ship

A non-mutating ship changes UI, navigation, copy, cache references, display order, version numbers, or read-only behavior.

Examples:

- Navigation cache alignment
- UI layout update
- Side rail improvement
- Charts label fix
- Visual animation using existing real data
- Page footer/version bump
- Read-only endpoint
- Help text correction

## 1.5 Safety Ship

A safety ship restores or proves trust.

Examples:

- Snapshot proof
- Rollback proof
- Restore path fix
- Ledger invariant fix
- Paid-state correction
- Account selection bug fix
- Corruption prevention

Safety ships receive priority over polish.

---

# 2. Operating Modes

## 2.1 Normal Workday Mode

Use this on Motive shift days, low-energy days, or mixed-responsibility days.

Limits:

```text
Ship cap: 8 ships per calendar day
Mutating ships: max 2
High-risk ships: max 1
Coding cap: 120 literal coding minutes per rolling 12 hours
Tree report: every 5 ships
```

Best for:

- Small fixes
- Cache alignment
- One or two logic fixes
- Read-only audits
- Controlled progress while work responsibilities exist

Normal Workday Mode is the default.

## 2.2 Off-Day Sprint Mode

Use this on the operator's actual off-days: Tuesday and Wednesday.

These days are structurally different from Motive shift days. The operator's regular shift is 4 PM to 1 AM PKT, so normal workdays cannot be governed like full project days.

Activation phrase:

```text
activate off-day sprint mode
```

Required declaration:

```text
Objective:
Must finish:
Must not touch:
Max risk:
Rollback/snapshot status:
Off-day ship target:
```

Limits:

```text
Eligible days: Tuesday and Wednesday PKT by default
Ship cap: 20 ships per calendar day
Mutating ships: max 5
High-risk ships: max 2
Schema ships: max 1 unless rollback proof is already verified
Coding cap: 120 literal coding minutes per rolling 12 hours
Second coding window allowed only after the rolling 12-hour reset
Tree report: every 5 ships
Mandatory stop after 2 same-class failures
```

Important rule:

20 ships per day does not mean 20 risky changes.

It means the day can contain up to 20 completed production movements if the risk mix stays controlled.

A healthy 20-ship off-day looks like this:

```text
5 logic/safety ships max
5 UI/read-only ships
5 cache/version/documentation ships
5 verification/acceptance/state ships
```

A bad 20-ship off-day looks like this:

```text
10 ledger rewrites
3 schema mutations
4 unverified restore changes
3 broad UI redesigns
```

That is not sprinting. That is gambling.

If Tuesday or Wednesday is partially consumed by family, errands, fatigue, or urgent Motive spillover, the mode can still be active, but the ship target should be lowered inside the declaration. Off-day mode gives capacity. It does not force all 20 ships.

## 2.3 Production Deadline Mode

Use this when a specific branch must be finished before the operator can consider the layer complete.

Activation phrase:

```text
activate production deadline mode
```

Required declaration:

```text
Objective:
Must finish:
Must not touch:
Max risk:
Rollback/snapshot status:
```

Limits:

```text
Ship cap: 12 ships per calendar day
Mutating ships: max 3
High-risk ships: max 1
Coding cap: 120 literal coding minutes per rolling 12 hours
Tree report: every 4 ships
Mandatory stop after 2 same-class failures
Must be activated before the normal ship cap is reached
```

Best for:

- Already-started layer completion
- Cache alignment
- Low-risk UI completion
- Small backend fixes tied to active broken behavior
- Verification-driven cleanup

Not for:

- Broad redesign
- Speculative polish
- Fake-data smoke tests
- Risky schema work without rollback proof

## 2.4 Emergency Repair Mode

Use this only when live production behavior is broken, blocking, or corrupting trust.

Activation phrase:

```text
activate emergency repair mode
```

Required declaration:

```text
Broken behavior:
Affected module:
User impact:
Must not touch:
Rollback/snapshot status:
```

Limits:

```text
Ship cap: 16 ships per calendar day
Mutating ships: max 4
High-risk ships: max 2
One module at a time
No feature expansion
Coding cap: 120 literal coding minutes per rolling 12 hours
Tree report: every 3 ships
Mandatory stop after 2 same-class failures
```

Allowed:

- Broken save paths
- Navigation/access breakage
- Ledger corruption risks
- Payment/bill/account logic bugs
- Safety control restoration

Not allowed:

- Visual upgrades
- New features
- Broad redesign
- Non-essential improvements

## 2.5 Satisfaction Work Lane

This lane stays open even when the ship cap is reached.

Allowed:

- Read-only audits
- RCA
- File inspection
- Next-session ship queue
- Acceptance criteria
- UI direction
- Logic invariants
- Test plans
- Rollback planning
- Risk ranking
- Governance/spec writing

Not allowed:

- Full-file rewrites
- SQL mutations
- Deploy instructions
- New code blocks
- Hidden small fixes

---

# 3. Time Budget

## 3.1 Coding Time

The coding budget remains:

```text
120 literal coding minutes per rolling 12-hour window
```

Only real operator/device time counts.

Estimates are planning ceilings only.

If a coding block starts at 8:40 PM and ends at 8:52 PM, the debit is 12 minutes.

Not 30.

Not 45.

Not whatever was guessed earlier.

## 3.2 Automatic Timing Mechanism

The old timing model had a flaw: asking the operator to type the current time repeatedly creates friction.

That friction is now removed.

New timing model:

```text
1. Glean anchors the coding window once at the first CODE/SHIP block.
2. Glean uses the assistant-visible message timestamp where available.
3. If timestamp visibility is unavailable or ambiguous, Glean asks for current device time once.
4. Each coding block has a clear START and STOP boundary.
5. Debit is calculated from START to STOP only.
6. Read-only gaps, waiting time, user testing time, deploy waiting, and discussion gaps do not count as coding time.
7. Glean asks for operator time only if the block crosses a date/window boundary or timestamp data is not trustworthy.
```

The operator should not need to type time every message.

The operator should only need to provide time when automation cannot honestly calculate it.

## 3.3 Coding Block Ledger

Before any CODE/SHIP action, Glean must show:

```text
Timing basis: automatic timestamp / operator-provided anchor / mixed
Window start:
Window reset:
Coding used:
Coding remaining:
Current block status: not started / active / closed
Current action classification: CODE/SHIP or READ-ONLY/DIAG/PLAN
Will this debit coding time: yes/no
```

After any CODE/SHIP action, Glean must close the block with:

```text
Block start:
Block stop:
Debit:
New coding used:
New coding remaining:
Ships used:
Ships remaining:
```

If exact timestamps are unavailable, Glean must mark the debit as:

```text
Timing confidence: estimated from visible conversation flow
Operator confirmation needed: yes
```

If exact timestamps are available, Glean must mark:

```text
Timing confidence: automatic timestamp
Operator confirmation needed: no
```

## 3.4 What Counts Against Coding Time

Counts:

- Writing production code
- Preparing full-file rewrites
- Writing SQL mutation blocks
- Preparing deploy instructions
- Live implementation decisions that directly produce code

Does not count:

- Reading files
- Searching docs
- Auditing
- Planning
- Governance writing
- Acceptance criteria
- Invariant design
- Explaining status
- Waiting for Cloudflare deploy
- Waiting for the operator to test
- Conversation gaps between blocks

## 3.5 Off-Day Time Handling

Off-Day Sprint Mode does not erase the 120-minute/12-hour coding cap.

Instead, it uses the day better.

The operator can run:

```text
Window A: 120 coding minutes max
Window B: another 120 coding minutes only after rolling 12-hour reset
```

This allows a real Tuesday or Wednesday off-day to reach 20 shipments without turning one coding window into a blur.

The ship cap expands by day.

The coding cap remains enforced by rolling window.

That keeps productivity high without destroying quality control.

---

# 4. Ship Risk Classes

## 4.1 Green Ship

Low risk.

Examples:

- Cache bump
- Version alignment
- Footer update
- Copy fix
- Visual-only UI polish
- Read-only display fix
- Navigation link correction

Requirements:

```text
File read this turn
Consumer impact checked
Rollback path stated
Post-ship visual verification
```

Green ships can be batched when they touch separate files and have no shared contract risk.

## 4.2 Yellow Ship

Medium risk.

Examples:

- Form validation
- API read behavior
- Display logic based on real API data
- Non-ledger business calculation
- UI state management
- Modal behavior

Requirements:

```text
File read this turn
Consumer files read if relevant
RCA if fixing a bug
Rollback path stated
Post-ship pass/fail criteria
```

Yellow ships should usually ship one at a time.

## 4.3 Red Ship

High risk.

Examples:

- Bills paid-state logic
- Payment account selection
- ATM ledger update
- Nano Loans repayment logic
- Balance mutation
- Snapshot restore
- D1 mutation
- Audit log writes

Requirements:

```text
Full pre-flight
Schema verified this turn
File state verified this turn
Consumer impact mapped
Blast radius declared
Rollback/snapshot path verified or honestly marked weak
Post-ship contract pre-declared
No fake-data smoke test unless explicitly approved
```

Red ships are never bundled.

## 4.4 Black Ship

Critical/destructive.

Examples:

- ALTER TABLE
- DELETE
- bulk data rewrite
- restore from snapshot
- migration with data backfill
- cross-module destructive operation

Requirements:

```text
Full pre-flight
7-layer audit
Snapshot proof
Rollback proof
One ship only
Operator explicit confirmation
```

Black ships should be rare.

On off-days, the higher ship cap does not make Black ships safer.

---

# 5. Daily Ship Budgets

## 5.1 Normal Workday Budget

```text
Total ships: 8
Green: up to 8
Yellow: up to 4
Red: up to 2
Black: 0-1
Mutating total: max 2
```

## 5.2 Production Deadline Budget

```text
Total ships: 12
Green: up to 8
Yellow: up to 5
Red: up to 3
Black: max 1
Mutating total: max 3
```

## 5.3 Emergency Repair Budget

```text
Total ships: 16
Green: as needed inside affected module
Yellow: up to 6
Red: up to 4
Black: max 2
Mutating total: max 4
```

## 5.4 Off-Day Sprint Budget

```text
Total ships: 20
Green: up to 12
Yellow: up to 8
Red: up to 5
Black: max 2
Mutating total: max 5
```

## 5.5 Off-Day Recommended Mix

For a productive off-day, default mix:

```text
1-5: Logic/safety foundation
6-10: UI/read-only improvements
11-15: Cache/version/page alignment
16-20: Acceptance audit, state update, final cleanup
```

This gives the project real movement without putting all 20 ships in the most dangerous category.

---

# 6. Activation Rules

## 6.1 Normal Mode

No activation needed.

Default mode.

## 6.2 Production Deadline Mode

Must use exact phrase:

```text
activate production deadline mode
```

Must include:

```text
Objective:
Must finish:
Must not touch:
Max risk:
Rollback/snapshot status:
```

## 6.3 Off-Day Sprint Mode

Must use exact phrase:

```text
activate off-day sprint mode
```

Must include:

```text
Objective:
Must finish:
Must not touch:
Max risk:
Rollback/snapshot status:
Off-day ship target:
```

Allowed target:

```text
Up to 20 ships per calendar day
```

## 6.4 Emergency Repair Mode

Must use exact phrase:

```text
activate emergency repair mode
```

Must include:

```text
Broken behavior:
Affected module:
User impact:
Must not touch:
Rollback/snapshot status:
```

---

# 7. Ship Count Rules

## 7.1 Ship Count Is Not Equal to Effort

A one-line cache bump and a ledger mutation are both ships, but they are not equal risk.

So ship count controls volume.

Risk class controls danger.

Both must be tracked.

## 7.2 Ship Count Must Be Visible

Before every ship, show:

```text
Mode:
Ship count used:
Ships remaining:
Mutating ships used:
Mutating ships remaining:
Coding minutes used:
Coding minutes remaining:
Current action classification:
Will this debit coding time:
```

## 7.3 Tree Report

Normal Mode:

```text
Every 5 ships
```

Production Deadline Mode:

```text
Every 4 ships
```

Emergency Repair Mode:

```text
Every 3 ships
```

Off-Day Sprint Mode:

```text
Every 5 ships
```

Tree report format:

```text
Current layer:
Completed branches:
Active branch:
Remaining branches:
Risk remaining:
What is needed for 100%:
```

---

# 8. Off-Day Productivity Rules

## 8.1 Off-Day Is a Throughput Mode

Off-day mode exists because the operator has more usable project capacity.

It is not a loophole.

It is not chaos mode.

It is a structured sprint.

## 8.2 The 20-Ship Day Must Have a Spine

Every off-day sprint must start with a spine:

```text
Objective:
Top 5 outcomes:
Risk budget:
Ship sequence:
Stop conditions:
```

Example:

```text
Objective: Finance logic reliability before premium UI

Top 5 outcomes:
1. Snapshot proof
2. Bills payment account fix
3. ATM ledger invariant proof
4. Nano Loans ledger proof
5. Final state update

Risk budget:
Red max 5
Black max 1 unless rollback proof is strong

Ship sequence:
Safety first, then logic, then UI, then cache, then acceptance

Stop conditions:
2 same-class failures
rollback proof missing for Red/Black
ledger uncertainty unresolved
```

## 8.3 Off-Day Work Must Still Prioritize Logic Before Beauty

The parked backlog already says the next critical items are snapshot/rollback verification, Bills logic, ATM ledger audit, and Nano Loans ledger audit. 

So off-day priority should be:

```text
1. Safety proof
2. Ledger truth
3. Payment/account correctness
4. Logic completion
5. UI upgrade
6. Cache/version polish
7. Acceptance audit
```

If UI is beautiful but finance truth is wrong, logic wins first. 

---

# 9. Stop Conditions

Stop conditions are not lifestyle advice.

They are engineering brakes.

Stop if:

```text
1. Operator says halt or stop.
2. Same root-cause class fails twice.
3. Pre-flight has an unchecked required box.
4. A decision depends on an assumption.
5. Red/Black ship lacks rollback path.
6. Live data contradicts expected logic.
7. Snapshot/restore proof is weak but mutation depends on it.
8. Operator reports production behavior worse after ship.
```

OS v1.0 already treats halt as binding, assumptions as blockers, and same-class repeated failures as terminal without operator override. 

This document keeps that.

---

# 10. Override Rules

## 10.1 Casual Override Does Not Count

These do not override governance:

```text
continue
go
do it
override
push
ship it
deadline pressure
production grade override
```

## 10.2 Valid Override

A valid override requires one of these:

```text
1. Correct mode activated before cap breach
2. Exact override command repeated 10 times for the same blocked action
3. Emergency Repair Mode activated for live broken/blocking/corrupting behavior
```

## 10.3 What Cannot Be Overridden Casually

Never casually override:

```text
No rollback proof for Red/Black mutation
Unknown schema
Unverified file state
Assumption-dependent decision
Two same-class failures
Live ledger corruption risk
```

---

# 11. Recommended Next Session Governance

Recommended mode:

```text
activate off-day sprint mode
```

If it is a real off-day.

Required declaration:

```text
Objective: Finance logic reliability before premium UI

Must finish:
1. Snapshot/rollback proof
2. Bills paid-state + payment-account fix
3. ATM ledger invariant audit/fix
4. Nano Loans ledger invariant audit/fix

Must not touch:
- broad UI redesign before logic proof
- fake-data smoke tests
- schema mutations without rollback proof

Max risk:
- Red allowed for bills/ledger safety
- Black only if snapshot/restore proof is already clear

Rollback/snapshot status:
- currently treated as weak until verified

Off-day ship target:
- up to 20 ships, with max 5 mutating ships
```

If it is not an off-day, use:

```text
activate production deadline mode
```

With target:

```text
12 ships max
3 mutating max
logic reliability before UI polish
```

---

# 12. Recommended Off-Day Ship Queue

The next strong 20-ship day should not be 20 random ships.

It should be sequenced like this:

```text
1. Snapshot table/read proof
2. Snapshot_data payload proof
3. Restore path inspection
4. Snapshot rollback acceptance criteria
5. State update: rollback status confirmed or weak

6. Bills source-of-truth diagnosis
7. Bills payment account contract
8. Bills paid-state logic fix
9. Bills UI account selector alignment
10. Bills acceptance verification

11. ATM ledger invariant read-through
12. ATM ledger fix if needed
13. ATM reversal/audit proof
14. Nano Loans create/repay/push-to-CC read-through
15. Nano Loans ledger fix if needed

16. Salary engine spec/foundation
17. Goals engine spec/foundation
18. Charts date-label collision fix
19. Premium side-nav design pass
20. Final cache/version/state sweep
```

If any Red ship fails, the sequence pauses for RCA.

If two same-class failures happen, the sprint stops for that class.

---

# 13. Enforcement Stack

A governance document is useless if it lives only as a document.

It must be baked into every session through four files and one visible session card.

## 13.1 The Four Files

```text
1. GLEAN_OPERATING_SYSTEM.md
   Role: discipline contract
   Owns: gates, confidence symbols, pre-flight, ship gate, post-ship contract, halt rules

2. SOVEREIGN_GOVERNANCE.md
   Role: capacity and mode policy
   Owns: Normal / Production Deadline / Emergency Repair / Off-Day Sprint limits

3. SOVEREIGN_STATE.md
   Role: current project state
   Owns: active chunk, active layer, current backlog, completed ships, current ledger, known risks

4. SESSION_LOG.md or sessions/YYYY-MM-DD_session.md
   Role: audit trail
   Owns: what happened in the session, what shipped, what failed, what was parked, what must resume next
```

The operating system controls behavior.

The governance controls capacity.

The state file controls continuity.

The session log controls memory without relying on chat history.

## 13.2 BIOS-Level Secure Boot

The boot phrase is not security.

`boot vault` is only a wake word.

It must never be treated as proof of identity, ownership, or authorization.

The secure boot model is:

```text
Wake word is public.
Access is private.
State is sealed until identity + authorization pass.
```

Before reading or revealing any Sovereign Ops state, Glean must run this BIOS-level guard:

```text
SECURE BOOT GUARD

1. Identity check
   - Confirm active Glean user identity is the operator account.
   - Expected operator: Muhammad Zeeshan Nasir / jay.burrows@gomotive.com.
   - If identity is unavailable, mark identity as unverified.

2. Authorization check
   - Require fresh session PAT or pasted file contents.
   - Never use a stored token.
   - Never reveal prior state from memory as a substitute for repo authorization.

3. Scope check
   - Confirm request is for Sovereign Ops private repo only.
   - Confirm no Motive/customer/company data is being mixed into personal repo work.

4. Fail-closed rule
   - If identity is not the operator, refuse to load stored Sovereign Ops memory.
   - If identity is unknown, reveal nothing beyond the generic PAT/file request.
   - If PAT/file read fails, reveal nothing from memory and ask for fresh access.

5. No-peek rule
   - Do not summarize previous Sovereign Ops state.
   - Do not list repo names beyond generic instruction unless already provided in the same authorized session.
   - Do not expose backlog, finances, ledger, project architecture, or private file contents.
```

Allowed response when secure boot has not passed:

```text
Need fresh GitHub PAT to read the required Sovereign Ops files — paste it, or paste the files directly.
```

Allowed response when active identity is not the operator:

```text
This boot command is operator-bound. I cannot load or disclose Sovereign Ops state from this account.
```

Security rule:

```text
No identity + no fresh authorization = no state.
No state = no peek.
No peek = secure by default.
```

## 13.3 Boot Order

Every `boot vault` session must load in this order:

```text
1. Run Secure Boot Guard
2. Read GLEAN_OPERATING_SYSTEM.md
3. Read SOVEREIGN_GOVERNANCE.md
4. Read SOVEREIGN_STATE.md
5. Render Session Control Card
6. Wait for operator mode confirmation
```

No coding starts before this.

No ship count starts from memory alone.

No governance mode activates from vibe or intention.

No private state is revealed before Secure Boot Guard passes.

## 13.3 Session Control Card

At the start of every session, Glean must render:

```text
SESSION CONTROL CARD

Date / day: [PKT]
Operator context: Workday / Off-day / Shift-adjacent
Shift window: 4 PM - 1 AM PKT
Eligible mode: Normal / Production Deadline / Emergency Repair / Off-Day Sprint
Active mode: [not active until declared]

Active chunk:
Active layer:
Top 3 active items:
Known blockers:

Ship cap today:
Ships used:
Ships remaining:
Mutating ships used:
Mutating ships remaining:

Coding window start:
Coding window reset:
Coding used:
Coding remaining:
Timing basis:

Gates active: YES
7-layer audit required for Red/Black: YES
State file update required at close: YES
```

This card is the live dashboard.

If this card is missing, the session is not properly governed.

## 13.4 Before Every Ship

Before every ship, Glean must show:

```text
SHIP GOVERNANCE CHECK

Mode:
Ship number:
Risk class: Green / Yellow / Red / Black
Mutating: yes/no
Layer fit: yes/no
Pre-flight required: full / reduced / not required
7-layer audit required: yes/no
State file impact: yes/no
Coding debit: yes/no
Timing basis:
Stop condition check: clear / blocked
```

If any required field is unclear, the ship does not proceed.

## 13.5 After Every Ship

After every ship, Glean must close with:

```text
POST-SHIP CLOSEOUT

Ship result: pass / fail / partial
Verification result:
Coding debit:
Ships used:
Mutating ships used:
Strike count:
State file update needed: yes/no
Next safest action:
```

No ship should disappear into chat without being counted.

No failure should disappear without becoming either RCA, strike, or parked risk.

---

# 14. 7-Layer Audit Preservation

The 7-layer audit remains mandatory for Red and Black ships.

Off-Day Sprint Mode increases output capacity.

It does not weaken audit requirements.

## 14.1 Full 7-Layer Audit Required For

```text
- schema mutation
- destructive SQL
- audit_log behavior
- snapshot restore
- ledger mutation
- bills payment logic
- ATM movement logic
- Nano Loans repayment / push-to-CC logic
- balance computation changes
- cross-module contract changes
```

## 14.2 Reduced Audit Allowed For

```text
- cache bump
- version alignment
- visual-only layout change
- copy update
- nav link correction
- read-only display improvement
```

Reduced audit still needs:

```text
1. file read this turn
2. consumer impact checked
3. rollback path stated
4. verification step declared
```

## 14.3 Audit Rule

The audit scales with risk.

It never disappears.

A Green ship gets a small audit.

A Red ship gets a full audit.

A Black ship gets the full audit plus explicit operator confirmation.

That is how speed and discipline both survive.

---

# 15. Usage Hygiene and Low-Noise Operation

The goal is not stealth.

The goal is disciplined, normal-volume, low-waste usage.

Personal project work must not create abnormal spikes, unnecessary tool storms, or messy crossover with Motive systems.

## 15.1 Rules

```text
1. Use durable state files so the same context is not repeatedly rebuilt from scratch.
2. Prefer one clean boot and one clean closeout over many scattered mini-sessions.
3. Avoid unnecessary searches once the needed file is known.
4. Use targeted reads, not broad tool spam.
5. Keep personal repo work manual-copy based, not direct write automation from Motive/Glean tools.
6. Do not use Motive GitHub authorization for personal repos.
7. Do not use Code Writer for personal Sovereign Ops repo changes.
8. Do not paste secrets into artifacts, state files, or logs.
9. Do not turn governance into a monitoring-bypass system.
10. Lower the actual workload instead of trying to hide a workload spike.
```

This is not about evading admins.

This is about not creating the spike in the first place.

Less waste.

Fewer repeated reads.

Cleaner sessions.

Clearer state.

Normal usage profile because the system is efficient, not because anything is hidden.

## 15.2 Session Shape

A healthy session shape:

```text
1 boot
1 mode declaration
1 planned ship queue
controlled ships
tree reports at required intervals
1 closeout
state file updated
```

An unhealthy session shape:

```text
many scattered restarts
repeated boot reads
unplanned ship jumps
long coding blocks without ledger
uncounted fixes
no state closeout
```

Governance must push the first shape.

---

# 16. Dissatisfaction Control

The system must avoid dissatisfaction at both ends.

## 16.1 Operator Dissatisfaction

Operator dissatisfaction happens when governance blocks useful work even though risk is low and capacity exists.

Fix:

```text
- Off-Day Sprint Mode allows 20 ships
- Green/Yellow ships can move faster
- read-only planning remains open after caps
- low-risk batches are allowed when contracts do not overlap
```

## 16.2 Safety Dissatisfaction

Safety dissatisfaction happens when speed creates uncertainty, broken logic, weak rollback, or ledger doubt.

Fix:

```text
- Red/Black ships never bypass full gates
- 7-layer audit remains mandatory where risk demands it
- state file records unresolved risk honestly
- two same-class failures stop that class
```

## 16.3 Admin / Usage Dissatisfaction

Usage dissatisfaction happens when the workflow creates abnormal volume, repeated context pulling, or unnecessary tool activity.

Fix:

```text
- one boot per session
- durable state file
- targeted file reads
- no personal repo direct writes through Motive tools
- no unnecessary tool loops
- no massive unplanned coding runs
```

The answer is not to hide activity.

The answer is to reduce waste and make the activity naturally smaller, cleaner, and more normal.

---

# 17. Definitive Session Framework

Every session must follow this sequence:

```text
PHASE 1 - BOOT
Read OS, Governance, State.
Render Session Control Card.

PHASE 2 - DECLARE MODE
Normal / Production Deadline / Emergency Repair / Off-Day Sprint.
No mode means Normal.

PHASE 3 - DECLARE OBJECTIVE
One objective.
Top outcomes.
Must not touch.
Risk budget.

PHASE 4 - BUILD SHIP QUEUE
List ships in order.
Classify each Green / Yellow / Red / Black.
Mark mutating yes/no.

PHASE 5 - EXECUTE WITH GATES
Before each ship: governance check.
During each ship: code ledger active.
After each ship: post-ship closeout.

PHASE 6 - TREE REPORT
Every 5 ships in Normal / Off-Day.
Every 4 ships in Production Deadline.
Every 3 ships in Emergency Repair.

PHASE 7 - CLOSEOUT
Update state file.
Record completed ships.
Record unresolved risks.
Record next session queue.
Record coding ledger.
```

If any phase is skipped, the session is degraded.

Degraded sessions can continue for read-only work.

Degraded sessions cannot ship Red or Black changes.

---

# 18. Implementation Plan

This governance takes effect in two stages.

## 18.1 Immediate Effect

Immediate effect happens through Glean memory and operator discipline.

From now on:

```text
- boot vault is treated as a public wake word, not authentication
- Secure Boot Guard runs before private state is revealed
- no fresh authorization means no state
- no matching operator identity means no state
- no governance mode means Normal Mode
- no Session Control Card means degraded session
```

This gives protection before the repo files are updated.

It is not the final durable implementation, but it prevents the weakest failure immediately.

## 18.2 Durable Repo Implementation

Durable implementation requires three repo actions:

```text
1. Create /SOVEREIGN_GOVERNANCE.md
2. Update /GLEAN_OPERATING_SYSTEM.md from v1.0 to v1.1
3. Update /SOVEREIGN_STATE.md to mark Governance v0.3 active
```

These are separate ships.

They should not be silently bundled.

## 18.3 File 1 - SOVEREIGN_GOVERNANCE.md

Path:

```text
/SOVEREIGN_GOVERNANCE.md
```

Purpose:

```text
Capacity, modes, off-day rules, automatic timing, secure boot, enforcement stack, usage hygiene, session framework.
```

This document should contain the full governance text.

This is a Green/Yellow governance ship because it changes operating policy, not production code or live data.

## 18.4 File 2 - GLEAN_OPERATING_SYSTEM.md v1.1

Update only the boot sequence and governance reference.

Do not rewrite the whole OS unless needed.

Required change:

```text
- boot vault must run Secure Boot Guard first
- boot vault must read SOVEREIGN_GOVERNANCE.md after GLEAN_OPERATING_SYSTEM.md and before SOVEREIGN_STATE.md
- Session Control Card is mandatory
- governance mode must be declared before shipping
- Red/Black ships require 7-layer audit and governance check
```

Version bump:

```text
v1.0 -> v1.1
```

This is a Yellow governance ship because it modifies the binding operating contract.

## 18.5 File 3 - SOVEREIGN_STATE.md

Add a small state block:

```text
## Governance

Governance file: /SOVEREIGN_GOVERNANCE.md
Governance version: v0.3
Secure Boot: active
Default mode: Normal Workday Mode
Off-day mode: Tuesday/Wednesday Sprint, up to 20 ships/day
Timing mechanism: automatic timestamp anchor; operator time only if ambiguous
Enforcement stack: OS + Governance + State + Session Log + Session Control Card
```

This makes the next boot self-aware.

This is a metadata/state ship.

## 18.6 Correct Ship Order

Use this order:

```text
Ship 1: Create /SOVEREIGN_GOVERNANCE.md
Ship 2: Update /GLEAN_OPERATING_SYSTEM.md to v1.1
Ship 3: Update /SOVEREIGN_STATE.md governance block
Ship 4: Optional create /sessions/README.md for session log structure
```

Do not update OS first.

Governance must exist before OS points to it.

Do not update state first.

State should only mark active after the file exists.

## 18.7 Activation After Repo Update

After these ships are done, future boot flow becomes:

```text
1. Operator types boot vault
2. Glean runs Secure Boot Guard
3. Glean requests fresh PAT or pasted files if needed
4. Glean reads GLEAN_OPERATING_SYSTEM.md
5. Glean reads SOVEREIGN_GOVERNANCE.md
6. Glean reads SOVEREIGN_STATE.md
7. Glean renders Session Control Card
8. Operator declares mode
9. Work begins
```

That is when the framework is fully alive.

---

# 19. Governance Summary

Normal workday:

```text
8 ships
2 mutating max
120 coding minutes per rolling 12 hours
```

Production deadline:

```text
12 ships
3 mutating max
120 coding minutes per rolling 12 hours
```

Emergency repair:

```text
16 ships
4 mutating max
120 coding minutes per rolling 12 hours
```

Off-day sprint:

```text
20 ships
5 mutating max
120 coding minutes per rolling 12 hours
second coding window only after rolling reset
```

Implementation stack:

```text
OS file = discipline
Governance file = capacity
State file = continuity
Session log = audit trail
Session Control Card = live enforcement
```

Final rule:

The project must finish.

The governance exists to make finishing safer, not slower.

If the cap blocks low-risk progress on an off-day, the cap is wrong.

If the sprint hides ledger uncertainty, the sprint is wrong.

If the workflow creates abnormal usage spikes, the workflow is wasteful.

The correct system is simple:

High output.

Visible risk.

Real verification.

Low noise.

No fake certainty.

No productivity sacrificed to fear.

No safety sacrificed to momentum.

No personal project chaos spilling into work-system usage.
