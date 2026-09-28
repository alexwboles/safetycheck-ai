#!/bin/bash
# SafetyCheck e2e tests — full user flows through the logic layer.
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
node << 'NODEEOF'
const SC = require('/home/hatch/workspace/safetycheck-ai/js/logic.js');
let pass = 0, fail = 0;
const ok  = (n) => { pass++; console.log('PASS: ' + n); };
const bad = (n) => { fail++; console.log('FAIL: ' + n); };

// Flow 1: pick a trade -> daily checklist completes -> weekly untouched
const trade = SC.tradeById('roofing');
let daily = SC.newChecklistState(trade.daily);
trade.daily.forEach((_, i) => { daily = SC.toggleChecklist(daily, 'i-' + i); });
const dp = SC.checklistProgress(trade.daily, daily);
const wp = SC.checklistProgress(trade.weekly, SC.newChecklistState(trade.weekly));
(dp.pct === 100 && wp.pct === 0)
  ? ok('flow1: roofing daily 100%, weekly 0% (independent state)') : bad('flow1: ' + JSON.stringify([dp, wp]));

// Flow 2: full week of talks — 52 unique titles across weeks 1..52
const titles = new Set();
for (let w = 1; w <= 52; w++) titles.add(SC.talkForWeek(w).title);
titles.size === 52 ? ok('flow2: 52 unique weekly talk topics') : bad('flow2: only ' + titles.size + ' unique topics');

// Flow 3: current talk matches this ISO week
const now = new Date();
const cur = SC.currentTalk(now);
cur.week === SC.isoWeekNumber(now) && cur.title === SC.talkForWeek(cur.week).title
  ? ok('flow3: currentTalk matches ISO week ' + cur.week) : bad('flow3: current talk mismatch');

// Flow 4: incident lifecycle — log 3, stats, CSV round-trip
let log = [];
[['2026-09-21', 'Near miss', 'Low', 'Cord across walkway'],
 ['2026-09-24', 'First aid', 'Medium', 'Cut finger, bandaged on site'],
 ['2026-09-27', 'Property damage', 'High', 'Scaffold clip dropped, dented van']].forEach(([d, t, s, n]) => {
  const r = SC.addIncident(log, { date: d, type: t, severity: s, notes: n });
  if (!r.ok) { bad('flow4: addIncident failed: ' + r.errors); return; }
  log = r.log;
});
const st = SC.incidentStats(log);
(st.total === 3 && st.bySeverity.High === 1 && st.bySeverity.Medium === 1 && st.bySeverity.Low === 1)
  ? ok('flow4: 3 incidents logged, severity counts correct') : bad('flow4: stats ' + JSON.stringify(st));
const csv = SC.exportIncidentsCSV(log);
const lines = csv.split('\n');
(lines.length === 4 && lines[0] === 'id,date,type,severity,notes' && lines.slice(1).every(l => (l.match(/"/g) || []).length >= 10))
  ? ok('flow4: CSV export has header + 3 quoted rows') : bad('flow4: CSV rows = ' + lines.length);

// Flow 5: invalid incident rejected, log unchanged
const before = log.length;
const badRes = SC.addIncident(log, { date: 'yesterday', type: 'Near miss', notes: '' });
(!badRes.ok && badRes.errors.length >= 2 && log.length === before)
  ? ok('flow5: invalid incident rejected, log untouched') : bad('flow5: invalid incident leaked through');

// Flow 6: PPE checklist per trade completes independently of daily
const ppe = SC.newChecklistState(trade.ppe);
let ppeDone = ppe;
trade.ppe.forEach((_, i) => { ppeDone = SC.toggleChecklist(ppeDone, 'i-' + i); });
const pp = SC.checklistProgress(trade.ppe, ppeDone);
const dp2 = SC.checklistProgress(trade.daily, SC.newChecklistState(trade.daily));
(pp.pct === 100 && dp2.pct === 0)
  ? ok('flow6: PPE 100% independent of daily checklist state') : bad('flow6: state leaked between lists');

// Flow 7: toggling twice returns to unchecked (idempotent UI behavior)
let s2 = SC.newChecklistState(['x']);
s2 = SC.toggleChecklist(s2, 'i-0');
s2 = SC.toggleChecklist(s2, 'i-0');
SC.checklistProgress(['x'], s2).pct === 0 ? ok('flow7: double-toggle returns to 0%') : bad('flow7: toggle not idempotent');

console.log('---');
console.log('e2e: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
NODEEOF
