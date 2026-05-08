## Life OS Expansion Plan — After Finance Core

Status: Finance Core is the first completed cockpit. Next direction is Sovereign Life OS shell, not more Finance-only expansion.

Core architecture decision:
- Finance remains isolated as its own cockpit.
- Salah, Habits, Mission, Health, Knowledge, and AI must not be mixed into Finance UI.
- Main Command Centre sits above all domains and shows only summary/action state.
- Each domain keeps its own route, schema, API, UI identity, and logic.
- AI Curator reads across domains and creates decision/briefing output.
- Telegram Bot relays only curated AI messages, not raw noisy data.

Recommended domain routes:
- / — Main Command Centre
- /finance — Finance cockpit
- /salah — Salah cockpit
- /habits — Habits cockpit
- /mission — Mission cockpit
- /health — Health cockpit later
- /knowledge — Notes/Learning cockpit later
- /ai — AI Command Centre
- /settings — System settings

Recommended build layers:
1. Life OS Shell / Main Command Centre
   - Create new main command centre concept.
   - Add domain cards for Finance, Salah, Habits, Mission, AI.
   - Finance remains accessible but not the whole website identity.
   - Salah/Habits/Mission can start as structured placeholders until data export.

2. Salah Export
   - D1 schema for salah logs/status/recovery.
   - /api/salah/today.
   - /api/salah/insights.
   - salah.html cockpit.
   - Calm, separate design. No finance widgets inside Salah.

3. Habits Export
   - D1 schema for habit definitions/logs/daily status.
   - /api/habits/today.
   - /api/habits/insights.
   - habits.html cockpit.
   - Checklist, momentum, recovery, workday/off-day pattern.

4. Mission Export
   - Mission/project/milestone schema or API.
   - /api/mission/status.
   - mission.html cockpit.
   - Shows current priority, active project, milestone, blockers, weekly direction.

5. AI Curator
   - /api/ai/briefing.
   - /api/ai/decision-queue.
   - Reads Finance + Salah + Habits + Mission.
   - Produces curated decisions, not generic advice.

6. Telegram Relay
   - /api/telegram/relay.
   - telegram relay log.
   - Sends only approved/curated daily briefing, prayer recovery, habit nudges, finance alerts, and decision prompts.

Main Command Centre contract:
- Show domain summary only.
- Show What Needs Action across domains.
- Show Today Timeline.
- Show Decision Queue.
- Show Quick Actions.
- Do not expose full Finance ledger inside Main Command Centre.
- Do not expose full Salah history inside Finance.
- Keep domains separate but connected through AI Curator.

Next coding layer:
Layer 1 — Life OS Shell / Main Command Centre.

First ship when coding window/mode allows:
- Create or rewrite root Command Centre shell.
- Add domain cards: Finance, Salah, Habits, Mission, AI.
- Keep current Finance cockpit accessible.
- Add placeholders for Salah/Habits/Mission without fake data.
- No D1 schema changes.
- No ledger mutation.
- No finance formula changes.
