/* SafetyCheck app — UI glue. Browser only.
 * Visual identity: jobsite inspection board. All markup is generated here;
 * element IDs below are the contract the CSS and tests rely on. */
(function () {
  "use strict";
  var SC = window.SafetyCheck;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  var state = {
    trade: SC.storageGet("trade", "construction"),
    tab: "check",
    dailyKey: "daily:" + todayStr(),
    weeklyKey: "weekly:" + SC.isoWeekNumber(new Date()),
    talk: null,
    incFilter: { q: "", type: "", severity: "" }
  };
  if (!SC.tradeById(state.trade)) state.trade = "construction";
  state.talk = SC.currentTalk();

  function trade() { return SC.tradeById(state.trade); }

  function checkKey(kind) {
    return "check:" + state.trade + ":" + (kind === "daily" ? state.dailyKey : state.weeklyKey);
  }
  function getCheckState(kind, items) {
    var s = SC.storageGet(checkKey(kind), null);
    if (!s) { s = SC.newChecklistState(items); SC.storageSet(checkKey(kind), s); }
    return s;
  }

  // ---------- render ----------
  function renderHeader() {
    var opts = SC.listTrades().map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === state.trade ? " selected" : "") + ">" + esc(t.name) + "</option>";
    }).join("");
    return '<header class="mast"><div class="mast-top">' +
      '<div class="brand"><span class="brand-mark" aria-hidden="true"></span>' +
      '<div class="brand-text"><strong>SafetyCheck <em>AI</em></strong>' +
      '<span class="brand-sub">Jobsite safety board</span></div></div>' +
      '<label class="tradesel"><span>Trade</span><select id="tradeSel">' + opts + "</select></label>" +
      '</div><div class="hazard" aria-hidden="true"></div></header>';
  }

  function renderTabs() {
    var tabs = [
      ["check", "01", "Checklists"],
      ["talk", "02", "Toolbox Talk"],
      ["inc", "03", "Incidents"],
      ["ppe", "04", "PPE"]
    ];
    return '<nav class="tabs" aria-label="Sections">' + tabs.map(function (tb) {
      return '<button class="tab' + (state.tab === tb[0] ? " active" : "") + '" data-tab="' + tb[0] + '">' +
        '<span class="tab-n">' + tb[1] + "</span>" + tb[2] + "</button>";
    }).join("") + "</nav>";
  }

  function progressHTML(prog) {
    return '<div class="progress"><div class="bar" style="width:' + prog.pct + '%"></div>' +
      '<span>' + prog.done + "/" + prog.total + " · " + prog.pct + "%</span></div>";
  }

  function checkRows(items, st, kind) {
    return items.map(function (item, i) {
      var id = "i-" + i, done = !!st[id];
      return '<label class="checkrow' + (done ? " done" : "") + '">' +
        '<input type="checkbox" data-kind="' + kind + '" data-id="' + id + '"' + (done ? " checked" : "") + ">" +
        '<span class="box" aria-hidden="true"></span>' +
        '<span class="lbl">' + esc(item) + "</span></label>";
    }).join("");
  }

  function checklistHTML(kind, title, kicker) {
    var t = trade();
    var items = t[kind];
    var st = getCheckState(kind, items);
    var prog = SC.checklistProgress(items, st);
    return '<section class="card inspect">' +
      '<div class="card-top"><div><p class="kicker">' + kicker + '</p><h2>' + title + "</h2></div>" +
      '<div class="card-actions"><div class="pct-big">' + prog.pct + '<span>%</span></div>' +
      '<button class="btn ghost tiny" data-reset-check="' + kind + '">Reset</button></div></div>' +
      progressHTML(prog) +
      '<div class="checks">' + checkRows(items, st, kind) + "</div>" +
      (prog.pct === 100
        ? '<p class="complete"><span class="complete-badge" aria-hidden="true">✓</span>Checklist complete — nice work staying safe.</p>'
        : "") +
      "</section>";
  }

  function renderCheck() {
    return '<div class="row checktools"><button id="printCheck" class="btn ghost">Print checklists</button>' +
      '<span class="muted small">Hand the printout to the crew for the morning huddle.</span></div>' +
      checklistHTML("daily", "Daily Safety Checklist", "Inspection · resets each morning") +
      checklistHTML("weekly", "Weekly Safety Checklist", "Inspection · resets each ISO week");
  }

  function renderTalk() {
    var tk = state.talk;
    var pts = tk.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
    var weekLabel = tk.week ? "Week " + tk.week : "Bonus topic";
    return '<section class="card briefing">' +
      '<div class="brief-head"><span class="week-badge">' + esc(weekLabel) + '</span>' +
      '<div><p class="kicker">Toolbox talk · 5-minute crew huddle</p>' +
      '<h2 class="talktitle">' + esc(tk.title) + "</h2></div></div>" +
      "<ol class='talkpts'>" + pts + "</ol>" +
      '<div class="row"><button id="newTalk" class="btn">Pick another topic</button>' +
      '<button id="weekTalk" class="btn ghost">Back to this week\'s topic</button></div>' +
      '<p class="muted small">52 rotating topics — one per week, with talking points for a 5-minute crew huddle.</p></section>';
  }

  function trendBars(log) {
    var weeks = SC.incidentsByWeek(log, 8);
    var max = 1;
    weeks.forEach(function (w) { if (w.count > max) max = w.count; });
    var bars = weeks.map(function (w) {
      var h = Math.max(2, Math.round(w.count / max * 44));
      return '<div class="wbar" title="' + esc(w.start) + ' – ' + esc(w.end) + ': ' + w.count + '">' +
        '<span>' + w.count + '</span><i style="height:' + h + 'px"></i></div>';
    }).join("");
    return '<div class="trend"><p class="kicker">Incidents per week · last 8 weeks</p>' +
      '<div class="weekbars">' + bars + "</div></div>";
  }

  function renderIncidents() {
    var log = SC.storageGet("incidents", []);
    var stats = SC.incidentStats(log);
    var days = SC.daysSinceLastIncident(log);
    var typeOpts = SC.INCIDENT_TYPES.map(function (t) { return '<option>' + esc(t) + "</option>"; }).join("");
    var f = state.incFilter;
    var fTypeOpts = '<option value="">All types</option>' + SC.INCIDENT_TYPES.map(function (t) {
      return '<option' + (f.type === t ? " selected" : "") + ">" + esc(t) + "</option>";
    }).join("");
    var fSevOpts = '<option value="">All severities</option>' + ["Low", "Medium", "High"].map(function (s) {
      return '<option' + (f.severity === s ? " selected" : "") + ">" + s + "</option>";
    }).join("");
    var filtered = SC.filterIncidents(log, f).slice().reverse();
    var rows = filtered.map(function (r) {
      return "<tr><td class='d'>" + esc(r.date) + "</td><td>" + esc(r.type) + "</td><td><span class='sev sev-" + esc(r.severity.toLowerCase()) + "'>" + esc(r.severity) + "</span></td><td>" + esc(r.notes) + "</td>" +
        "<td class='rowdel'><button class='btn ghost tiny' data-del-inc='" + esc(r.id) + "' aria-label='Delete incident'>Delete</button></td></tr>";
    }).join("");
    return '<section class="card">' +
      '<div class="card-top"><div><p class="kicker">Issue reporting</p><h2>Incident Log</h2></div></div>' +
      '<div class="statgrid">' +
      '<div class="stat"><b>' + stats.total + '</b><span>total logged</span></div>' +
      '<div class="stat warn"><b>' + (stats.bySeverity.High || 0) + '</b><span>high severity</span></div>' +
      '<div class="stat"><b>' + (stats.byType["Near miss"] || 0) + '</b><span>near misses</span></div>' +
      '<div class="stat ok"><b>' + (days === null ? "—" : days) + '</b><span>days since last incident</span></div></div>' +
      trendBars(log) +
      '<form id="incForm" class="incform">' +
      '<label>Date <input type="date" id="incDate" value="' + todayStr() + '" required></label>' +
      '<label>Type <select id="incType">' + typeOpts + "</select></label>" +
      '<label>Severity <select id="incSev"><option>Low</option><option>Medium</option><option>High</option></select></label>' +
      '<label class="full">Notes <input type="text" id="incNotes" placeholder="What happened? Where? Who was involved?" required></label>' +
      '<button class="btn full" type="submit">Log incident</button></form>' +
      '<div id="incErr" class="err" role="alert"></div>' +
      (log.length ? '<div class="row"><button id="expCsv" class="btn ghost">Export CSV</button></div>' +
        '<div class="incfilters">' +
        '<input type="search" id="incQ" placeholder="Search notes, types…" value="' + esc(f.q) + '" aria-label="Search incidents">' +
        '<select id="incTypeF" aria-label="Filter by type">' + fTypeOpts + "</select>" +
        '<select id="incSevF" aria-label="Filter by severity">' + fSevOpts + "</select>" +
        '<button id="incClearF" class="btn ghost tiny">Clear</button></div>' +
        (filtered.length
          ? '<div class="tablewrap"><table><thead><tr><th>Date</th><th>Type</th><th>Severity</th><th>Notes</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>"
          : '<div class="emptybox"><p class="muted small">No incidents match your filters.</p></div>')
        : '<div class="emptybox"><p><strong>No incidents logged yet.</strong></p><p class="muted small">Log near misses too — they\'re free lessons.</p></div>') +
      "</section>";
  }

  function renderPpe() {
    var t = trade();
    var st = SC.storageGet("ppe:" + state.trade, SC.newChecklistState(t.ppe));
    var prog = SC.checklistProgress(t.ppe, st);
    return '<section class="card inspect">' +
      '<div class="card-top"><div><p class="kicker">Gear up · before every shift</p><h2>PPE Checklist — ' + esc(t.name) + "</h2></div>" +
      '<div class="card-actions"><div class="pct-big">' + prog.pct + '<span>%</span></div>' +
      '<button class="btn ghost tiny" data-reset-check="ppe">Reset</button></div></div>' +
      progressHTML(prog) +
      '<div class="checks">' + checkRows(t.ppe, st, "ppe") + "</div>" +
      '<p class="muted small">Tick off each item as you gear up. PPE is your last line of defense — inspect it before every shift.</p></section>';
  }

  function render() {
    var app = document.getElementById("app");
    var body = state.tab === "check" ? renderCheck()
      : state.tab === "talk" ? renderTalk()
      : state.tab === "inc" ? renderIncidents() : renderPpe();
    app.innerHTML = renderHeader() + renderTabs() + '<main>' + body + "</main>" +
      '<footer class="foot">SafetyCheck AI runs 100% in your browser. Checklists are guidance, not legal advice — always follow OSHA and local regulations.</footer>';
    bind();
  }

  // ---------- events ----------
  function bind() {
    document.getElementById("tradeSel").addEventListener("change", function (e) {
      state.trade = e.target.value;
      SC.storageSet("trade", state.trade);
      render();
    });
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
      b.addEventListener("click", function () { state.tab = b.getAttribute("data-tab"); render(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('input[type="checkbox"][data-kind]'), function (cb) {
      cb.addEventListener("change", function () {
        var kind = cb.getAttribute("data-kind"), id = cb.getAttribute("data-id");
        var key, items;
        if (kind === "ppe") { key = "ppe:" + state.trade; items = trade().ppe; }
        else { key = checkKey(kind); items = trade()[kind]; }
        var st = SC.storageGet(key, SC.newChecklistState(items));
        st = SC.toggleChecklist(st, id);
        SC.storageSet(key, st);
        render();
      });
    });
    var nt = document.getElementById("newTalk");
    if (nt) nt.addEventListener("click", function () { state.talk = SC.randomTalk(state.talk.index); render(); });
    var wt = document.getElementById("weekTalk");
    if (wt) wt.addEventListener("click", function () { state.talk = SC.currentTalk(); render(); });
    // manual checklist resets (re-do an inspection after an incident, etc.)
    Array.prototype.forEach.call(document.querySelectorAll("[data-reset-check]"), function (b) {
      b.addEventListener("click", function () {
        var kind = b.getAttribute("data-reset-check");
        if (!confirm("Reset this checklist? All ticks will be cleared.")) return;
        var key = kind === "ppe" ? "ppe:" + state.trade : checkKey(kind);
        SC.storageSet(key, SC.newChecklistState(trade()[kind]));
        render();
      });
    });
    var pc = document.getElementById("printCheck");
    if (pc) pc.addEventListener("click", function () { window.print(); });
    var form = document.getElementById("incForm");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var log = SC.storageGet("incidents", []);
      var res = SC.addIncident(log, {
        date: document.getElementById("incDate").value,
        type: document.getElementById("incType").value,
        severity: document.getElementById("incSev").value,
        notes: document.getElementById("incNotes").value
      });
      if (!res.ok) { document.getElementById("incErr").textContent = res.errors.join("; "); return; }
      SC.storageSet("incidents", res.log);
      render();
    });
    var ex = document.getElementById("expCsv");
    if (ex) ex.addEventListener("click", function () {
      var blob = new Blob([SC.exportIncidentsCSV(SC.storageGet("incidents", []))], { type: "text/csv" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "safetycheck-incidents.csv";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    });
    // incident log search + filters
    function rebindIncFilter() {
      var q = document.getElementById("incQ"), tf = document.getElementById("incTypeF"),
          sf = document.getElementById("incSevF");
      if (q) q.addEventListener("input", function () { state.incFilter.q = q.value; render(); refocusInc("incQ"); });
      if (tf) tf.addEventListener("change", function () { state.incFilter.type = tf.value; render(); });
      if (sf) sf.addEventListener("change", function () { state.incFilter.severity = sf.value; render(); });
      var cf = document.getElementById("incClearF");
      if (cf) cf.addEventListener("click", function () {
        state.incFilter = { q: "", type: "", severity: "" }; render();
      });
    }
    rebindIncFilter();
    // delete incident rows
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-inc]"), function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Delete this incident record?")) return;
        SC.storageSet("incidents", SC.deleteIncident(SC.storageGet("incidents", []),
          b.getAttribute("data-del-inc")));
        render();
      });
    });
  }

  // keep the search box focused + caret at end after a re-render on typing
  function refocusInc(id) {
    var elx = document.getElementById(id);
    if (elx) { elx.focus(); var v = elx.value; elx.value = ""; elx.value = v; }
  }

  document.addEventListener("DOMContentLoaded", render);
})();
