# 🦺 SafetyCheck AI

**Workplace safety checklists that crews actually use.** Pick your trade and get daily + weekly safety checklists, a PPE checklist, a rotating 52-week toolbox-talk generator, and an incident log — all running 100% in your browser.

## The problem

Small contractors and shops know safety checklists matter, but paper forms get lost, generic templates don't fit the trade, and toolbox talks turn into the same three topics on repeat. Incidents and near misses go unlogged because the system is a filing cabinet.

## The solution

SafetyCheck AI is a single-page web app (no build step, no dependencies, no account) with:

1. **Trade-specific checklists** — 8 trades (Construction, Electrical, Plumbing, HVAC, Roofing, Welding, Warehouse, Landscaping), each with a 6-item daily checklist and a 5-item weekly checklist. Daily resets each morning; weekly resets each ISO week. Progress bars track completion.
2. **PPE checklist per trade** — 6 trade-specific PPE items to tick off while gearing up.
3. **Toolbox-talk generator** — 52 rotating weekly topics (ladder safety, LOTO, heat stress, silica dust, stop-work authority…), each with three 5-minute talking points. One topic per week, plus a "pick another" shuffle.
4. **Incident log** — date/type/severity/notes with validation, running stats (totals, high-severity, near misses, days since last incident), an 8-week incident trend, search + type/severity filters, one-click CSV export, and delete for mis-logged entries

Checklists add **Print checklists** (a clean printout for the crew's morning huddle) and a **Reset** button on daily, weekly, and PPE lists so you can re-run an inspection anytime.

Everything persists in `localStorage`. Optional: set `OPENAI_API_KEY` for AI-drafted toolbox talks in a future version — nothing requires it.

## Privacy

**Nothing leaves the device.** No server, no analytics, no tracking. Incident data stays in the browser. Serve it locally and it works offline.

## Run it

```bash
# any static server works:
npx serve .
# then open http://localhost:3000
```

## Tests

```bash
bash test/smoke.sh   # file presence, JS syntax, core logic spot checks
bash test/e2e.sh     # full flows: checklists, talks, incident log, CSV export
```

## Project structure

```
index.html          # app shell
css/style.css       # theme
js/data.js          # 8 trades × checklists/PPE, 52 toolbox talks, incident types
js/logic.js         # pure logic: checklists, talks, incidents, storage (browser + node)
js/app.js           # UI rendering and events (browser only)
test/smoke.sh       # smoke tests
test/e2e.sh         # end-to-end flow tests
```

## Disclaimer

Checklists are practical guidance, not legal advice. Always follow OSHA and your local regulations — when in doubt, ask a qualified safety professional.
