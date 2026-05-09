1. Fast boot
- No Secure Boot ceremony.
- No identity/PAT gate unless repo reading is actually needed.
- boot vault returns only current phase, next phase, and blockers.

2. Memory stays small
- Memory stores only routing rules, delivery constraints, and current phase pointer.
- Project history lives in SOVEREIGN_STATE.md or session archive files.
- No long session logs in memory.

3. State file is source of truth
- SOVEREIGN_STATE.md carries current project state.
- Keep it short.
- Archive old phase detail into /sessions/ files.

4. Full phase execution
- Plan and report work as full phases.
- Do not drag through tiny subphases.
- For large code, still deliver one file at a time.

5. Code delivery
- Manual placeholders only.
- No Canvas.
- No downloadable sandbox files unless explicitly requested.
- Full-file rewrites only for code files.
- Verify file size/shape before rewrite.
- Split huge files into numbered placeholders no more than 3.

6. Verification before fixing
- If something looks broken, verify live output/current version/file shape first.
- State verified vs unverified.
- Then classify: bug, expected behavior, cache/deploy mismatch, backend policy issue, UI/copy issue.

7. Safety
- No /api/money-contracts as truth source.
- Unknown never becomes Ready.
- No D1 writes from audit/enforcement.
- No ledger-polluting smoke tests.
- Command Centre blocks unsafe actions but does not hide diagnostic truth.
