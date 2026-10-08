#!/bin/bash
# SafetyCheck smoke tests — file presence, syntax, core logic sanity.
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "PASS: $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL: $1"; }

# 1. expected files exist
for f in index.html css/style.css js/data.js js/logic.js js/app.js README.md test/e2e.sh; do
  [ -f "$f" ] && ok "file exists: $f" || bad "missing file: $f"
done

# 2. JS syntax valid
for f in js/data.js js/logic.js js/app.js; do
  node --check "$f" 2>/dev/null && ok "syntax ok: $f" || bad "syntax error: $f"
done

# 3. index.html wires up the scripts
grep -q 'js/data.js' index.html && grep -q 'js/logic.js' index.html && grep -q 'js/app.js' index.html \
  && ok "index.html loads data.js, logic.js, app.js" || bad "index.html missing script tags"

# 4+. logic checks via node
node << 'NODEEOF'
const SC = require('/home/hatch/workspace/safetycheck-ai/js/logic.js');
let pass = 0, fail = 0;
const ok  = (n) => { pass++; console.log('PASS: ' + n); };
const bad = (n) => { fail++; console.log('FAIL: ' + n); };

// 8 trades
SC.listTrades().length === 8 ? ok('8 trades listed') : bad('trades: ' + SC.listTrades().length);

// every trade: 6 daily, 5 weekly, 6 ppe
const shapes = SC.TRADES.every(t => t.daily.length === 6 && t.weekly.length === 5 && t.ppe.length === 6);
shapes ? ok('every trade has 6 daily / 5 weekly / 6 ppe items') : bad('trade checklist shape mismatch');

// tradeById round-trip
const el = SC.tradeById('electrical');
(el && el.name === 'Electrical' && el.ppe.length === 6) ? ok('tradeById("electrical") works') : bad('tradeById failed');
SC.tradeById('nope') === null ? ok('tradeById("nope") -> null') : bad('tradeById("nope") not null');

// 52 toolbox talks, each with 3 points
(SC.TALKS.length === 52 && SC.TALKS.every(t => t.p && t.p.length === 3))
  ? ok('52 toolbox talks, 3 points each') : bad('talks: ' + SC.TALKS.length);

// talkForWeek cycles: week 53 === week 1
const w1 = SC.talkForWeek(1), w53 = SC.talkForWeek(53);
(w1.title && w53.title === w1.title) ? ok('talkForWeek cycles (53 -> 1): "' + w1.title + '"') : bad('talk cycle broken');

// checklist progress
const items = ['a', 'b', 'c'];
let st = SC.newChecklistState(items);
SC.checklistProgress(items, st).pct === 0 ? ok('fresh checklist 0%') : bad('fresh checklist not 0%');
st = SC.toggleChecklist(st, 'i-0');
SC.checklistProgress(items, st).pct === 33 ? ok('1 of 3 -> 33%') : bad('progress math wrong: ' + JSON.stringify(SC.checklistProgress(items, st)));
st = SC.toggleChecklist(SC.toggleChecklist(st, 'i-1'), 'i-2');
SC.checklistProgress(items, st).pct === 100 ? ok('3 of 3 -> 100%') : bad('full checklist not 100%');

// incident validation
SC.validateIncident({ date: '2026-09-28', type: 'Near miss', notes: 'x' }).length === 0
  ? ok('valid incident passes validation') : bad('valid incident rejected');
SC.validateIncident({ date: '28/09/2026', type: 'Near miss', notes: 'x' }).length > 0
  ? ok('bad date rejected') : bad('bad date accepted');
SC.validateIncident({ date: '2026-09-28', type: 'Alien abduction', notes: 'x' }).length > 0
  ? ok('bad type rejected') : bad('bad type accepted');
SC.validateIncident({ date: '2026-09-28', type: 'Near miss', notes: '   ' }).length > 0
  ? ok('empty notes rejected') : bad('empty notes accepted');

// addIncident + stats + CSV
const r = SC.addIncident([], { date: '2026-09-28', type: 'Near miss', severity: 'High', notes: 'Ladder slipped' });
(r.ok && r.log.length === 1 && r.incident.id) ? ok('addIncident stores record with id') : bad('addIncident failed');
const stats = SC.incidentStats(r.log);
(stats.total === 1 && stats.bySeverity.High === 1 && stats.byType['Near miss'] === 1)
  ? ok('incidentStats counts correctly') : bad('incidentStats wrong: ' + JSON.stringify(stats));
const csv = SC.exportIncidentsCSV(r.log);
(csv.split('\n').length === 2 && csv.indexOf('id,date,type,severity,notes') === 0)
  ? ok('CSV export has header + 1 row') : bad('CSV export malformed');

// storage round-trip (memory fallback in node)
SC.storageSet('tkey', { a: 1 });
JSON.stringify(SC.storageGet('tkey', null)) === '{"a":1}' ? ok('storage round-trip works') : bad('storage broken');

// deleteIncident removes only the matching record
const r2 = SC.addIncident(r.log, { date: '2026-09-29', type: 'Recordable injury', severity: 'Medium', notes: 'Cut finger' });
const after = SC.deleteIncident(r2.log, r.incident.id);
(after.length === 1 && after[0].id === r2.incident.id) ? ok('deleteIncident removes the right record') : bad('deleteIncident wrong: ' + JSON.stringify(after.map(x => x.id)));
SC.deleteIncident(r2.log, 'no-such-id').length === 2 ? ok('deleteIncident with unknown id is a no-op') : bad('deleteIncident mutated on unknown id');

// filterIncidents: text + type + severity
const log3 = [
  { id: 'a', date: '2026-09-28', type: 'Near miss', severity: 'High', notes: 'Ladder slipped' },
  { id: 'b', date: '2026-09-29', type: 'Recordable injury', severity: 'Medium', notes: 'Cut finger on panel' },
  { id: 'c', date: '2026-09-30', type: 'Near miss', severity: 'Low', notes: 'Extension cord tripped' },
];
SC.filterIncidents(log3, { q: 'ladder' }).length === 1 ? ok('filterIncidents text search') : bad('filterIncidents q');
SC.filterIncidents(log3, { type: 'Near miss' }).length === 2 ? ok('filterIncidents type filter') : bad('filterIncidents type');
SC.filterIncidents(log3, { severity: 'Medium' }).length === 1 ? ok('filterIncidents severity filter') : bad('filterIncidents severity');
SC.filterIncidents(log3, { q: 'cord', severity: 'Low', type: 'Near miss' }).length === 1 ? ok('filterIncidents combined filters') : bad('filterIncidents combined');
SC.filterIncidents(log3, { q: 'zzzz' }).length === 0 ? ok('filterIncidents empty result set') : bad('filterIncidents no-match');

// daysSinceLastIncident
SC.daysSinceLastIncident(log3, '2026-10-07') === 7 ? ok('daysSinceLastIncident = 7') : bad('daysSinceLastIncident: ' + SC.daysSinceLastIncident(log3, '2026-10-07'));
SC.daysSinceLastIncident([], '2026-10-07') === null ? ok('daysSinceLastIncident null on empty log') : bad('daysSinceLastIncident not null');

// incidentsByWeek: buckets count correctly, oldest first
const weeks = SC.incidentsByWeek(log3, 8, '2026-10-07');
(weeks.length === 8 && weeks.every(w => /^\d{4}-\d{2}-\d{2}$/.test(w.start) && /^\d{4}-\d{2}-\d{2}$/.test(w.end)))
  ? ok('incidentsByWeek returns 8 labeled buckets') : bad('incidentsByWeek shape');
const total = weeks.reduce((s, w) => s + w.count, 0);
total === 3 ? ok('incidentsByWeek counts all 3 incidents') : bad('incidentsByWeek lost incidents: ' + total);
(new Date(weeks[0].start) <= new Date(weeks[7].start)) ? ok('incidentsByWeek oldest-first') : bad('incidentsByWeek order');

console.log('NODE_PASS=' + pass + ' NODE_FAIL=' + fail);
process.exit(fail ? 1 : 0);
NODEEOF
[ $? -eq 0 ] && ok "node logic checks green" || bad "node logic checks had failures"

echo "---"
echo "smoke: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
