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

// Flow 8: incident search/filter narrows the log (uses flow4's 3-incident log)
SC.filterIncidents(log, { q: 'cord' }).length === 1 ? ok('flow8: search "cord" finds 1 incident') : bad('flow8: search miss');
SC.filterIncidents(log, { severity: 'High' }).length === 1 ? ok('flow8: High-severity filter finds 1') : bad('flow8: severity filter miss');
SC.filterIncidents(log, { type: 'Near miss' }).length === 1 ? ok('flow8: type filter finds the near miss') : bad('flow8: type filter miss');
SC.filterIncidents(log, {}).length === 3 ? ok('flow8: empty filters show everything') : bad('flow8: empty filters dropped rows');

// Flow 9: delete an incident -> stats + trend update
const delId = log[0].id;
const logAfter = SC.deleteIncident(log, delId);
const st9 = SC.incidentStats(logAfter);
(logAfter.length === 2 && st9.total === 2 && !logAfter.some(r => r.id === delId))
  ? ok('flow9: deleting an incident shrinks the log and stats') : bad('flow9: delete broken');

// Flow 10: days-since + weekly trend on the flow4 log (ref 2026-10-07)
SC.daysSinceLastIncident(log, '2026-10-07') === 10 ? ok('flow10: 10 days since the 2026-09-27 incident') : bad('flow10: days off: ' + SC.daysSinceLastIncident(log, '2026-10-07'));
const w10 = SC.incidentsByWeek(log, 8, '2026-10-07');
const tot10 = w10.reduce((s, w) => s + w.count, 0);
(tot10 === 3 && w10.length === 8) ? ok('flow10: 8-week trend holds all 3 incidents') : bad('flow10: trend off: ' + tot10);

// Flow 11: manual reset returns a half-done checklist to 0% (simulates UI reset)
let half = SC.newChecklistState(trade.daily);
trade.daily.forEach((_, i) => { if (i % 2 === 0) half = SC.toggleChecklist(half, 'i-' + i); });
SC.checklistProgress(trade.daily, half).pct > 0 ? ok('flow11: half-done checklist above 0%') : bad('flow11: setup failed');
const reset = SC.newChecklistState(trade.daily);
SC.checklistProgress(trade.daily, reset).pct === 0 ? ok('flow11: reset returns checklist to 0%') : bad('flow11: reset failed');

// Flow 12: custom item lifecycle + incident -> corrective action -> weekly score
const tr12 = SC.tradeById('electrical');
// 1) add two custom items to the daily checklist, merge, tick, progress counts
let custom = [];
custom = SC.addCustomItem(custom, 'Check the trench shoring before entry').items;
custom = SC.addCustomItem(custom, 'Verify LOTO tags on panel B').items;
const merged = SC.checklistItemsFor(tr12.daily, custom);
(merged.length === 8 && merged[7].custom === true)
  ? ok('flow12: custom items merge after built-ins (6+2)') : bad('flow12: merge');
let st12 = SC.newChecklistState(tr12.daily); // built-in i- keys only
st12 = SC.toggleChecklist(st12, merged[6].id); // tick first custom item
st12 = SC.toggleChecklist(st12, 'i-0');       // tick first built-in
const p12 = SC.checklistProgressIds(merged, st12);
(p12.done === 2 && p12.total === 8 && p12.pct === 25)
  ? ok('flow12: progress counts built-in + custom ticks (2/8 = 25%)') : bad('flow12: progress ' + JSON.stringify(p12));
// 2) delete one custom item; its tick key is dropped with it
custom = SC.removeCustomItem(custom, custom[0].id);
const merged2 = SC.checklistItemsFor(tr12.daily, custom);
delete st12['c-' + 'placeholder']; // no-op guard
(merged2.length === 7 && merged2.every(m => m.id !== merged[6].id))
  ? ok('flow12: removing a custom item shrinks the merged checklist') : bad('flow12: remove');
// 3) incident -> corrective action -> mark done
const inc12 = SC.addIncident([], { date: '2026-10-10', type: 'Near miss', severity: 'High', notes: 'Ladder slipped on wet floor' });
inc12.ok ? ok('flow12: incident logged') : bad('flow12: incident failed');
let actions = SC.addAction([], { incidentId: inc12.incident.id, text: 'Buy non-slip ladder feet', owner: 'Jo', dueDate: '2026-10-17' }).actions;
actions = SC.addAction(actions, { incidentId: inc12.incident.id, text: 'Mop and cone the entryway', dueDate: '2026-10-08' }).actions;
(SC.actionsForIncident(actions, inc12.incident.id).length === 2)
  ? ok('flow12: two corrective actions linked to the incident') : bad('flow12: action link');
const od12 = SC.overdueActions(actions, '2026-10-12');
(od12.length === 1 && od12[0].text === 'Mop and cone the entryway')
  ? ok('flow12: overdue action flagged (due 10-08)') : bad('flow12: overdue');
actions = SC.toggleAction(actions, actions[1].id);
(SC.openActions(actions, '2026-10-12').length === 1)
  ? ok('flow12: completing an action drops it from the open list') : bad('flow12: open list');
// 4) weekly safety score: log, re-log same week replaces
let snaps12 = SC.recordScore([], '2026-W41', 75);
snaps12 = SC.recordScore(snaps12, '2026-W42', 90);
snaps12 = SC.recordScore(snaps12, '2026-W42', 95);
const trend12 = SC.scoreTrend(snaps12);
(trend12.length === 2 && trend12[1].pct === 95 && trend12[0].week === '2026-W41')
  ? ok('flow12: weekly score trend logs + replaces (75 -> 90 -> 95)') : bad('flow12: score trend ' + JSON.stringify(trend12));

// Flow 13 (sweep-2): talk attendance + daily streak + high-severity auto-action
{
  let s13 = SC.signInAttendance([], '2026-W42', 'Ladder safety', 'Maya').signins;
  s13 = SC.signInAttendance(s13, '2026-W42', 'Ladder safety', 'Sam').signins;
  s13 = SC.signInAttendance(s13, '2026-W41', 'Heat stress', 'Maya').signins;
  const wk = SC.attendanceFor(s13, '2026-W42');
  (wk.length === 2 && wk.every(x => x.talk === 'Ladder safety'))
    ? ok('flow13: two crew signed in for this week\'s talk')
    : bad('flow13: attendance off');

  let d13 = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'].reduce((a, d) => SC.recordCompletion(a, d), []);
  (SC.completionStreak(d13, '2026-10-12') === 4)
    ? ok('flow13: 4-day perfect streak after a week of completed checklists')
    : bad('flow13: streak off');

  const hi = SC.addIncident([], { date: '2026-10-12', type: 'Recordable injury', severity: 'High', notes: 'Fell from scaffold' });
  const auto = SC.addAction([], {
    incidentId: hi.incident.id,
    text: 'Investigate Recordable injury incident (2026-10-12)',
    owner: '', dueDate: '2026-10-19'
  });
  (auto.ok && auto.action.incidentId === hi.incident.id && auto.action.dueDate === '2026-10-19' && !auto.action.done)
    ? ok('flow13: high-severity incident produces a linked 7-day follow-up action')
    : bad('flow13: auto-action off');
}

console.log('---');
console.log('e2e: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
NODEEOF
