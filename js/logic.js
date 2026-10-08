/* SafetyCheck logic — checklists, incidents, toolbox talks, storage. Browser + node. */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    var SC = null;
    try { SC = require("./data.js"); } catch (e) { SC = root.SafetyCheck || {}; }
    module.exports = factory(SC);
  } else root.SafetyCheck = Object.assign(root.SafetyCheck || {}, factory(root.SafetyCheck || {}));
})(typeof self !== "undefined" ? self : this, function (SC) {

  var TRADES = SC.TRADES || [];
  var TALKS = SC.TALKS || [];
  var INCIDENT_TYPES = SC.INCIDENT_TYPES || [];

  function listTrades() { return TRADES.map(function (t) { return { id: t.id, name: t.name, icon: t.icon }; }); }

  function tradeById(id) {
    for (var i = 0; i < TRADES.length; i++) if (TRADES[i].id === id) return TRADES[i];
    return null;
  }

  // ---- toolbox talks ----
  function isoWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function talkForWeek(n) {
    if (!TALKS.length) return null;
    var idx = ((n - 1) % TALKS.length + TALKS.length) % TALKS.length;
    return { week: n, index: idx, title: TALKS[idx].t, points: TALKS[idx].p };
  }

  function currentTalk(now) {
    var d = now ? new Date(now) : new Date();
    return talkForWeek(isoWeekNumber(d));
  }

  function randomTalk(excludeIdx) {
    if (!TALKS.length) return null;
    var idx = Math.floor(Math.random() * TALKS.length);
    if (TALKS.length > 1 && idx === excludeIdx) idx = (idx + 1) % TALKS.length;
    return { week: null, index: idx, title: TALKS[idx].t, points: TALKS[idx].p };
  }

  // ---- checklists ----
  function itemId(kind, i) { return kind + "-" + i; }

  function newChecklistState(items) {
    var s = {};
    (items || []).forEach(function (_, i) { s[itemId("i", i)] = false; });
    return s;
  }

  function toggleChecklist(state, id) {
    var s = Object.assign({}, state);
    s[id] = !s[id];
    return s;
  }

  function checklistProgress(items, state) {
    var total = (items || []).length, done = 0;
    (items || []).forEach(function (_, i) { if (state && state[itemId("i", i)]) done++; });
    return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0 };
  }

  // ---- incident log ----
  function validDateStr(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return false;
    var d = new Date(s + "T12:00:00");
    return !isNaN(d.getTime());
  }

  function validateIncident(inc) {
    var errs = [];
    if (!validDateStr(inc.date)) errs.push("date must be YYYY-MM-DD");
    if (INCIDENT_TYPES.indexOf(inc.type) < 0) errs.push("unknown incident type");
    if (!inc.notes || !String(inc.notes).trim()) errs.push("notes are required");
    return errs;
  }

  var _nextId = 1;
  function addIncident(log, inc) {
    var errs = validateIncident(inc);
    if (errs.length) return { ok: false, errors: errs };
    var rec = {
      id: "inc-" + Date.now().toString(36) + "-" + (_nextId++),
      date: inc.date, type: inc.type,
      severity: inc.severity || "Low",
      notes: String(inc.notes).trim()
    };
    var next = (log || []).concat([rec]);
    return { ok: true, log: next, incident: rec };
  }

  function incidentStats(log) {
    var byType = {}, bySeverity = { Low: 0, Medium: 0, High: 0 };
    (log || []).forEach(function (r) {
      byType[r.type] = (byType[r.type] || 0) + 1;
      if (bySeverity[r.severity] !== undefined) bySeverity[r.severity]++;
    });
    return { total: (log || []).length, byType: byType, bySeverity: bySeverity };
  }

  function exportIncidentsCSV(log) {
    function q(v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }
    var lines = ["id,date,type,severity,notes"];
    (log || []).forEach(function (r) {
      lines.push([q(r.id), q(r.date), q(r.type), q(r.severity), q(r.notes)].join(","));
    });
    return lines.join("\n");
  }

  function deleteIncident(log, id) {
    return (log || []).filter(function (r) { return r.id !== id; });
  }

  // filterIncidents(log, { q, type, severity }) — search box + dropdown filters
  // for the incident table. Pure; UI calls it before rendering rows.
  function filterIncidents(log, opts) {
    opts = opts || {};
    var q = String(opts.q || "").trim().toLowerCase();
    return (log || []).filter(function (r) {
      if (opts.type && r.type !== opts.type) return false;
      if (opts.severity && r.severity !== opts.severity) return false;
      if (q) {
        var hay = (r.date + " " + r.type + " " + r.severity + " " + r.notes).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function dateToStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  // daysSinceLastIncident(log, refDate?) -> int days, or null when log is empty.
  function daysSinceLastIncident(log, refDate) {
    var last = null;
    (log || []).forEach(function (r) {
      if (validDateStr(r.date) && (last === null || r.date > last)) last = r.date;
    });
    if (!last) return null;
    var ref = refDate || dateToStr(new Date());
    var ms = new Date(ref + "T12:00:00") - new Date(last + "T12:00:00");
    return Math.max(0, Math.round(ms / 86400000));
  }

  // incidentsByWeek(log, weeks?, refDate?) -> [{ start, end, count }] oldest-first,
  // bucketing each incident into its calendar week (Mon–Sun).
  function incidentsByWeek(log, weeks, refDate) {
    weeks = weeks || 8;
    var ref = refDate ? new Date(refDate + "T12:00:00") : new Date();
    var monday = new Date(ref);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    var buckets = [];
    for (var i = 0; i < weeks; i++) {
      var s = new Date(monday); s.setDate(monday.getDate() - 7 * i);
      var e = new Date(s); e.setDate(s.getDate() + 6);
      buckets.push({ start: dateToStr(s), end: dateToStr(e), count: 0 });
    }
    (log || []).forEach(function (r) {
      if (!validDateStr(r.date)) return;
      var d = new Date(r.date + "T12:00:00");
      for (var j = 0; j < buckets.length; j++) {
        var bs = new Date(buckets[j].start + "T00:00:00");
        var be = new Date(buckets[j].end + "T23:59:59");
        if (d >= bs && d <= be) { buckets[j].count++; break; }
      }
    });
    return buckets.reverse();
  }

  // ---- storage (localStorage in browser, memory in node/tests) ----
  var _mem = {};
  function storageGet(key, fallback) {
    try {
      if (typeof localStorage !== "undefined") {
        var raw = localStorage.getItem("safetycheck:" + key);
        return raw == null ? fallback : JSON.parse(raw);
      }
    } catch (e) { /* fall through to memory */ }
    return (key in _mem) ? _mem[key] : fallback;
  }
  function storageSet(key, val) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("safetycheck:" + key, JSON.stringify(val));
        return;
      }
    } catch (e) { /* fall through to memory */ }
    _mem[key] = val;
  }

  return {
    TRADES: TRADES, TALKS: TALKS, INCIDENT_TYPES: INCIDENT_TYPES,
    listTrades: listTrades, tradeById: tradeById,
    isoWeekNumber: isoWeekNumber, talkForWeek: talkForWeek,
    currentTalk: currentTalk, randomTalk: randomTalk,
    newChecklistState: newChecklistState, toggleChecklist: toggleChecklist,
    checklistProgress: checklistProgress,
    validDateStr: validDateStr, validateIncident: validateIncident,
    addIncident: addIncident, incidentStats: incidentStats,
    exportIncidentsCSV: exportIncidentsCSV,
    deleteIncident: deleteIncident, filterIncidents: filterIncidents,
    daysSinceLastIncident: daysSinceLastIncident, incidentsByWeek: incidentsByWeek,
    storageGet: storageGet, storageSet: storageSet
  };
});