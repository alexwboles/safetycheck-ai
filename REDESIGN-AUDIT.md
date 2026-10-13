# SafetyCheck AI — Redesign Audit (2026-10-13)

## Competitors researched
- **SafetyCulture / iAuditor (now "Mitti")** — dashboard-first: real-time insights (completed inspections, open actions) at top; inspection template library; run-inspection flow with sections and evidence capture; issue reporting with photo/video attachments; instant PDF reports; offline mobile-first.
- **eAuditor** — template sections (Basic info, Fire safety, Work area), photo/notes per check, admin view of compliance status.

## Visual gaps (current state)
1. Masthead + tabs read as a form stack, not an inspection product: no dashboard-first "site status" view — SafetyCulture opens on live metrics.
2. Checklists are plain rows — field tools use large tap targets, section headers, and a persistent completion header (iAuditor's inspection runner).
3. Incident log is a dense table — severity should read at a glance via colored cards/badges like issue reporting in SafetyCulture.
4. No photo evidence anywhere — photo capture is THE core of SafetyCulture/iAuditor issue reporting.
5. Toolbox talk attendance has no export — OSHA-friendly records need a CSV trail.

## Functional gaps closed in this pass
1. **"Site status" command strip** on the Checklists tab: today's daily %, weekly %, PPE %, safety score, streak, open/overdue actions — the at-a-glance view SafetyCulture opens on.
2. **Photo evidence on incidents**: attach a photo (resized in-browser to a thumbnail data-URL, stored with the incident); thumbnails shown in the log; stripped from CSV export.
3. **Toolbox-talk attendance CSV export** (week, topic, name, signed-at) for training records.
4. Inspection-runner polish: sticky section headers with completion %, larger tap targets, done-row styling.

## Identity concept (implemented)
"Jobsite inspection board, grown up" — charcoal masthead with hi-vis hazard band (kept, sharpened), safety-orange accent, diamond brand mark. Dashboard-first: dark "site status" strip with big readiness numerals. Checklists become inspection cards with sticky progress headers and thumb-friendly rows. Incident log gains severity-colored cards with photo evidence thumbnails. Sharp edges everywhere; tabular numerals; no gradients.
