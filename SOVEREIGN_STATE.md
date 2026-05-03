# 🛡️ SOVEREIGN MIGRATION — HANDOFF TO NEW CHAT

**Last action:** Step 4 done (Apps Script File A saved)
**Next action:** Step 5 — add receiver file to website repo
**Resume command:** "Resume from Step 5 of Sub-1C migration"

---

## 📍 EXACT POSITION

| Step | Status |
|---|---|
| 1. Pick a strong password | ✅ DONE |
| 2. Add `MIGRATION_SECRET` in Cloudflare Pages env vars | ✅ DONE |
| 3. Add same secret to sheet ⚙️ Settings tab | ✅ DONE |
| 4. Save File A in Apps Script (Sheet_To_D1_Export) | ✅ DONE |
| 5. Save File B in website repo (migrate-from-sheet.js) | ⏳ NEXT |
| 6. Run migration via menu | ⏳ PENDING |
| 7. Verify on live site | ⏳ PENDING |

---

## 🎯 STEP 5 — CLICK BY CLICK

### Part 1 — Open repo
1. Go to: https://github.dev/Zeeshan211/sovereign-finance
2. Wait ~10 sec for editor

### Part 2 — Navigate
3. Sidebar → expand `functions` folder
4. Inside → expand `api` folder

### Part 3 — Create admin folder
5. Hover `api` folder name
6. Click 📁+ icon (New Folder)
7. Type: `admin`
8. Press Enter

### Part 4 — Create file
9. Hover new `admin` folder
10. Click 📄+ icon (New File)
11. Type: `migrate-from-sheet.js`
12. Press Enter

### Part 5 — Paste FILE B code (below)
13. Paste the entire FILE B code block
14. Ctrl+S to save

### Part 6 — Commit + push
15. Click Source Control icon (Y branch on left)
16. Type commit message: `Add migrate-from-sheet endpoint`
17. Click ✓ checkmark (Commit & Push)

### Part 7 — Wait for deploy
18. Cloudflare auto-detects push
19. Wait ~2 min for deployment
20. Optional: monitor at https://dash.cloudflare.com/ → Workers & Pages → sovereign-finance → Deployments

---

## 📄 FILE B — migrate-from-sheet.js

Paste this entire block into the new file:

\`\`\`javascript
export async function onRequestPost({ request, env }) {
  const expectedSecret = env.MIGRATION_SECRET;
  if (!expectedSecret) {
    return _err(500, 'MIGRATION_SECRET not configured');
  }
  const providedSecret = request.headers.get('X-Migration-Secret');
  if (providedSecret !== expectedSecret) {
    return _err(401, 'Invalid migration secret');
  }

  let payload;
  try {
    payload = await request.json();
  } catch(e) {
    return _err(400, 'Invalid JSON payload');
  }

  const requiredKeys = ['schema_version', 'transactions', 'debts', 'bills'];
  for (const k of requiredKeys) {
    if (!(k in payload)) return _err(400, 'Missing required key: ' + k);
  }
  if (payload.schema_version !== '1.0') {
    return _err(400, 'Unsupported schema_version: ' + payload.schema_version);
  }

  const db = env.DB;
  const stmts = [];
  const stats = { txns: 0, debts: 0, payments: 0, bills: 0 };

  stmts.push(db.prepare('DELETE FROM debt_payments'));
  stmts.push(db.prepare('DELETE FROM transactions'));
  stmts.push(db.prepare('DELETE FROM debts'));
  stmts.push(db.prepare('DELETE FROM bills'));

  for (const t of payload.transactions) {
    if (!t.txn_id || !t.dt_local || !t.account_id || !t.type) continue;
    stmts.push(
      db.prepare(
        \`INSERT INTO transactions
          (txn_id, dt_local, account_id, type, category_id, amount_minor, currency, note, linked_txn_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`
      ).bind(
        t.txn_id, t.dt_local, t.account_id, t.type,
        t.category_id || null, t.amount_minor || 0,
        t.currency || 'PKR', t.note || null,
        t.linked_txn_id || null, t.created_by || 'migration'
      )
    );
    stats.txns++;
  }

  for (const d of payload.debts) {
    if (!d.name) continue;
    stmts.push(
      db.prepare(
        \`INSERT INTO debts (name, original_minor, kind, notes, is_active)
         VALUES (?, ?, ?, ?, 1)\`
      ).bind(d.name, d.original_minor || 0, d.kind || 'creditor', d.notes || null)
    );
    stats.debts++;
  }

  for (const b of payload.bills) {
    if (!b.name) continue;
    stmts.push(
      db.prepare(
        \`INSERT INTO bills (name, account_id, amount_minor, due_day, last_paid_dt, notes, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)\`
      ).bind(
        b.name, b.account_id || null, b.amount_minor || 0,
        b.due_day || null, b.last_paid_dt || null, b.notes || null
      )
    );
    stats.bills++;
  }

  const auditDetail = JSON.stringify({
    source: payload.source || 'unknown',
    exported_at: payload.exported_at,
    stats: stats
  });
  stmts.push(
    db.prepare(
      \`INSERT INTO audit_log (action, entity, kind, detail, created_by)
       VALUES (?, ?, ?, ?, ?)\`
    ).bind('MIGRATION_FROM_SHEET', 'system', 'admin', auditDetail, 'sheet-migration')
  );

  try {
    await db.batch(stmts);
  } catch(e) {
    return _err(500, 'D1 batch failed: ' + (e.message || String(e)));
  }

  if (payload.debt_payments && payload.debt_payments.length > 0) {
    const paymentStmts = [];
    for (const p of payload.debt_payments) {
      if (!p.debt_name || !p.amount_minor) continue;
      const debtRow = await db.prepare('SELECT id FROM debts WHERE name = ?').bind(p.debt_name).first();
      if (!debtRow) continue;
      paymentStmts.push(
        db.prepare(
          \`INSERT INTO debt_payments (debt_id, dt_local, amount_minor, note, created_by)
           VALUES (?, ?, ?, ?, ?)\`
        ).bind(debtRow.id, p.dt_local, p.amount_minor, p.note || null, 'sheet-migration')
      );
      stats.payments++;
    }
    if (paymentStmts.length > 0) {
      try { await db.batch(paymentStmts); }
      catch(e) { return _err(500, 'Debt payments insert failed: ' + e.message); }
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    message: 'Migration successful',
    stats: stats,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function _err(status, message) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const onRequestGet = () =>
  new Response('POST only', { status: 405 });
\`\`\`

---

## 🚀 STEP 6 — Run migration (after Step 5 deploys)

1. Open sheet
2. Click ⚙️ Settings tab → check `MIGRATION_SECRET` row exists with value
3. Open Apps Script (Extensions → Apps Script)
4. Function dropdown → select `appendMigrationMenu` → ▶️ Run (one-time, attaches menu)
5. Reload sheet
6. Top menu bar → 🔄 D1 Migration → 🚀 Export sheet → migrate to D1
7. Confirm popup
8. Wait ~10-15 sec
9. Read result popup — should show row counts

---

## ✅ STEP 7 — Verify

1. Open https://sovereign-finance.pages.dev/
2. Hard refresh (Ctrl+F5)
3. Check numbers vs sheet:
   - CC Outstanding ≈ 78,655
   - Liquid ≈ 117,168
   - Top Debts shows CRED-1 (215k) + CRED-2 (8.5k)
   - Recent Transactions match sheet

---

## 🔧 IF SOMETHING FAILS

**Migration popup says "❌ Migration failed (HTTP 401)"** → secret mismatch · re-check Step 2 + 3 are exact same value

**Popup says "❌ MIGRATION_SECRET not set"** → Step 3 didn't save · try again, ensure column A = MIGRATION_SECRET exactly

**Popup says "❌ HTTP 500"** → D1 schema mismatch · paste error to Glean for diagnosis

**Site still shows old numbers** → Cloudflare cache · Ctrl+F5 hard refresh

**No error but D1 still empty** → check Cloudflare deployment finished · check at dashboard Deployments tab

---

## 🗂️ SOVEREIGN-FINANCE REPO INTEGRITY (audited 2026-05-04)

**Grade: B+ (solid, minor hygiene gaps)**

✅ Healthy:
- Schema design (15 tables, banking-grade)
- Theme system (FOUC-free, 5 themes)
- Hub UI (production quality)
- store.js (offline-first with retry queue)
- No security holes

⚠️ Minor issues (fix after migration):
- Missing wrangler.toml
- Missing package.json
- Missing .gitignore
- Missing README.md
- Day N of 90 stale code in app.js (chunk-shifting needs UI update)
- Inconsistent JS file versions
- seed_minimal.sql has zero opening balances (explained the drift)

**Migration is safe to proceed despite these — they don't affect data integrity.**

---

## 📋 KEY CONTEXT

- **Activation phrase:** `builder online`
- **Operating model:** chunk-shipping (Day-counting retired)
- **Current chunk:** 1 (FINANCE COMPLETE) · Sub-status: 1C (Cloudflare migration)
- **Tag protocol active:** SHIP / FIX / READ / DIAG / Q / STATUS / EOD / PRIVATE
- **Privacy:** all Glean responses use codes (CRED-1, etc.) — real names live only in personal Drive

---

## 🔗 REPO REFERENCES

| Item | URL |
|---|---|
| Sheet repo | https://github.com/Zeeshan211/sovereign-ops-private_sheet |
| Cloudflare repo | https://github.com/Zeeshan211/sovereign-finance |
| Live site | https://sovereign-finance.pages.dev/ |
| Cloudflare dashboard | https://dash.cloudflare.com/ |
| State file | sovereign-ops-private_sheet/SOVEREIGN_STATE.md |

---

## 📡 NEXT CHUNKS QUEUE

After Sub-1C ships clean:
- **Sub-1D:** Banking-grade safety port to Workers (balance constraint, audit log on every write, FX snapshot)
- **Sub-1E:** Nightly auto-sync trigger
- **Sub-1F:** Repo hygiene (wrangler.toml, package.json, README, etc.)
- **Sub-1G:** UI polish (remove Day N badge, add chunk-status, pseudonymize displays)

---

## 🛡️ END OF HANDOFF