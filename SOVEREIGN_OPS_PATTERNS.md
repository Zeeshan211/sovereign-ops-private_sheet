# 🛠 SOVEREIGN OPS — CODING PATTERNS
**Permanent rules Glean follows for all code work in this repo. Read once per session.**

---

## 🔒 LOCKED CODE DELIVERY RULES

1. **Full file rewrites only.** No surgical edits in chat. User pastes entire file via Ctrl+A → Delete → Paste → Ctrl+S.
2. **Inline fenced markdown blocks.** No artifact wrappers for code.
3. **7-LAYER PRE-DEPLOYMENT AUDIT** at top of every code file:
   - L1: 5-Test Audit (Self-Contained / Side-Effects / Re-Run Safe / Mentally Traced / Failure Modes)
   - L2: Function Call Graph (entry → all called functions, marked ✓ defined)
   - L3: Row Layout Map (visual row map, dependency direction, no overlap proof)
   - L4: Cell-State Matrix (every cell state vs validation list)
   - L5: State-Order Proof (clear → showRows → clearDataValidations → write static → write data → write formulas → number formats → dropdowns → conditional formatting)
   - L6: Backward-Compat Verification (cell range vs external readers)
   - L7: Failure-Mode Inventory (sheet missing, data corrupted, race conditions, etc)
4. **MENTAL TRACE** below 7-layer: minimum 3-4 critical scenarios with step-by-step execution path
5. **STOP** if any layer flags a problem. Fix BEFORE delivery.

---

## 🔒 BANKING-GRADE CODE STANDARDS (Finance suite)

Every Finance hot path must include:

- **LockService.getDocumentLock().tryLock(30000)** with finally release
- **Pre-write balance constraint check** (asset overdraft / CC overlimit)
- **FX rate snapshot per row** at commit time (col 15)
- **TxnID generation** with 5-digit suffix
- **Audit trail** via _logAuditFast (buffered) or logAuditAction (direct)
- **Snapshot before destructive ops** via snapFinanceSuite()
- **Idempotency guards** on reversal (notes regex check)
- **User prompt before silent overrides** (salary detect, CC validation)

---

## 🚨 ANTI-PATTERNS (NEVER DO)

- ❌ Surgical patches in chat
- ❌ Skip the 7-layer audit
- ❌ Skip mental trace
- ❌ Lookup-time FX conversion (use commit-time snapshot)
- ❌ Silent category overrides
- ❌ Negative balance writes without override audit
- ❌ Cross-module rebuild calls without source verification
- ❌ Apply-to-all destructive ops without 5-fold defense (pre-flight + auto-snap + confirmation + atomic + undo)
- ❌ Reuse working safety patterns? YES. Invent new safety? NO.
- ❌ Ledger writes outside row range 14-213
- ❌ TxnID with 3-digit suffix (collision risk)
- ❌ ms-precise timestamps without sleep separation in batch contexts

---

## ✅ CANONICAL PATTERNS TO REUSE

### Snapshot before destructive op

```javascript
if (typeof snapFinanceSuite === 'function') {
  try { snapFinanceSuite('pre-X-vY.Z'); } catch(e) {}
}

```

### Lock acquisition

```javascript
const lockResult = _acquireFinLock('myFunction');
if (!lockResult.ok) {
  s.getRange('L4').setValue(false);
  _alertF('🔒 Lock timeout. Wait 5 sec.');
  return;
}
try {
  // write logic
} finally {
  _releaseFinLock(lockResult);
}

```

### Safe ledger write

```javascript
const nextRow = _findNextLedgerRow(tx);
if (nextRow === -1 || nextRow < FIN2_LEDGER_START_ROW) {
  return;
}
Utilities.sleep(5);
const txnId = generateTxnId();
tx.getRange(nextRow, 1, 1, 8).setValues([[date, account, type, category, amount, currency, pkrEquiv, counterparty]]);
tx.getRange(nextRow, 14).setValue(txnId);
tx.getRange(nextRow, FIN2_FX_RATE_COL).setValue(fxRate);
_bumpRowPointer(nextRow);
_logAuditFast('TXN_LOGGED', txnId + ' details');

```

### Audit fast log

```javascript
function _logAuditFast(action, detail) {
  if (FIN2_FAST_LOG_ACTIONS[action]) _bufferAuditEntry(action, detail);
  else if (typeof logAuditAction === 'function') logAuditAction(action, detail);
}

```

### Pre-write balance constraint

```javascript
const balCheck = _validateBalanceConstraint(account, type, pkrEquiv);
if (!balCheck.allow) {
  s.getRange('L4').setValue(false);
  _setQEStatus(s, '🛑 ' + balCheck.reason, 'err');
  return;
}

```

---

## 🎨 VOICE RULES (UI text + chat)

- **Brother voice** in all popup/alert text. No shame. Points forward.
- **No tier labels** on user metrics ("Mediocre" / "Average" / etc — banned)
- **Quran/Hadith** only on REAL moments — not every popup
- **"akhi"** sparingly — at most ONE per major message
- **Errors** = calm guidance, not red ❌ shaming
- **Forbidden phrases:** "ship it", "lock in", "phase B", "production-grade architecture"
- **Approved phrases:** "send you the next file", "ship cleanly", "well-made", "reliable"

---

## 📞 GLEAN COMMUNICATION RULES

- **Tag prefix every message:**
  - `FIX:` code change
  - `SHIP:` deliver new file
  - `READ:` read file from repo
  - `DIAG:` diagnose only
  - `Q:` quick question
  - `STATUS:` where are we
  - `EOD:` update SOVEREIGN_STATE.md
  - `PRIVATE:` no real names/numbers in response
- **Don't paste tool output unless asked.** Just say "verify clean" or "shows X drift".
- **Don't ask Glean to re-derive** what's already in SOVEREIGN_STATE.md
- **Multi-action requests in one message** (ship X+Y+Z, deploy together)
- **Diagnostics first:** run sheet's verify functions before asking Glean to investigate

---

## 🛡 PRODUCTION SAFETY RULES (locked Day 9)

1. **Cross-module rebuild calls require source verification.** Read sibling module source. Confirm backup/restore pattern. Refuse if no snapshot.
2. **Destructive operations need 5-fold defense:** pre-flight + auto-snap + confirmation + atomic + 5-min undo window.
3. **Reuse working safety patterns.** Finance_Pro Snapshot + Vaccine = canonical. Don't invent new safety.

---

## 📂 REPO STRUCTURE (Day 10)

```
sovereign-ops-private_sheet/
├── README.md
├── SOVEREIGN_STATE.md          ← single source of truth
├── SOVEREIGN_OPS_PATTERNS.md   ← THIS FILE
├── appsscript.json
├── core/         (4 files)
├── ai/           (4 files)
├── webapp/       (2 files)
├── cockpits/     (5 files)
├── finance/      (15 files)
├── audit/        (6 files)
├── theme-layout/ (4 files)
├── knowledge/    (1 file)
└── utils/        (4 files)

```

**Folder rule:** github.com for restructure · github.dev for content edits · always provide full path link to user.

---

*This file is the canonical reference. Glean reads once per session. User maintains by editing in github.dev when patterns evolve.*