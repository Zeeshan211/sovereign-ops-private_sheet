# CLAUDE.md — sovereign-ops-private_sheet (Legacy Apps Script Suite)

> Read this file at start of any session touching this repo.

## 1. What This Repo Is

This is the LEGACY personal finance + life ops Apps Script suite. Active since early 2026, ~13,900 lines across 20+ Google Apps Script (.gs) files. Deployed inside a Google Spreadsheet, accessed via:
- Google Sheets UI (checkboxes trigger write paths)
- Telegram bot (command dispatcher)
- A lightweight web app (WebApp.gs) for non-finance dashboards

## 2. Status

This repo is in MAINTENANCE-ONLY mode. The active rebuild is happening in two separate repos:
- LiquidityOS (https://github.com/Zeeshan211/LiquidityOS) — new React frontend
- sovereign-finance (https://github.com/Zeeshan211/sovereign-finance) — new Cloudflare Pages + D1 backend

This legacy repo serves as the SOURCE OF TRUTH for what features the new system must replicate. Read freely. Do NOT modify any .gs file or .md governance doc unless explicitly instructed.

## 3. What's Allowed

ALLOWED in sessions on this repo:
- Read any file
- Add inventory / documentation files (like LEGACY_FINANCE_INVENTORY.md)
- Commit documentation directly to main with conventional `docs:` message

NOT ALLOWED:
- Modifying .gs files (breaks live production sheet)
- Modifying .md governance docs without explicit user instruction
- Adding new features
- Refactoring code
- Creating PRs or branches (push directly to main)
- git reset --hard (DESTRUCTIVE — use git stash → pull --no-rebase → pop → push if rejected)

## 4. Key Files

- README.md — repo overview
- GLEAN_OPERATING_SYSTEM.md — system architecture rules
- SOVEREIGN_GOVERNANCE.md — code delivery rules + 7-layer audit
- SOVEREIGN_OPS_PATTERNS.md — banking-grade code standards
- SOVEREIGN_STATE.md — Command Centre state
- LEGACY_FINANCE_INVENTORY.md — comprehensive inventory of all finance features (generated 2026-05-23)
- finance/ — 20 .gs files implementing the finance suite (Finance_Pro.gs is master)
- webapp/ — lightweight web dashboard (separate from finance)

## 5. Read-Only Investigation Pattern

When asked to investigate something in this repo:
1. Read the relevant .gs file(s) directly
2. Document findings in chat or in a new .md inventory file
3. Commit ONLY documentation, never code changes
4. Push to main directly

## 6. Git Safety

Same as the other repos: push to main, no branches, no PRs, no git reset --hard. If push rejected, use stash → pull --no-rebase → pop → push.

## 7. Communication

- User is non-technical, plain English
- Lead with status, end with concrete next steps
- User is on a token budget — be economical
