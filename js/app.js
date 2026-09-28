/* SafetyCheck app — UI glue. Browser only. */
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
    talk: null
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
      return '<option value="' + t.id + '"' + (t.id === state.trade ? " selected" : "") + ">" + t.icon + " " + esc(t.name) + "</option>";
    }).join("");
    return '<header class="topbar"><div class="brand">🦺 SafetyCheck AI</div>' +
      '<label class="tradesel">Trade <select id="tradeSel">' + opts + "</select></label></header>";
  }

  function renderTabs() {
    var tabs = [["check", "✅ Checklists"], ["talk", "🎤 Toolbox Talk"], ["inc", "📋 Incidents"], ["ppe", "🦺 PPE"]];
    return '<nav class="tabs">' + tabs.map(function (tb) {
      return '<button class="tab' + (state.tab === tb[0] ? " active" : "") + '" data-tab="' + tb[0] + '">' + tb[1] + "</button>";
    }).join("") + "</nav>";
  }

  function checklistHTML(kind, title, icon) {
    var t = trade();
    var items = t[kind];
    var st = getCheckState(kind, items);
    var prog = SC.checklistProgress(items, st);
    var rows = items.map(function (item, i) {
      var id = "i-" + i, done = !!st[id];
      return '<label class="checkrow' + (done ? " done" : "") + '"><input type="checkbox" data-kind="' + kind + '" data-id="' + id + '"' + (done ? " checked" : "") + "><span>" + esc(item) + "</span></label>";
    }).join("");
    return '<section class="card"><h2>' + icon + " " + title + '</h2>' +
      '<div class="progress"><div class="bar" style="width:' + prog.pct + '%"></div><span>' + prog.done + "/" + prog.total + " · " + prog.pct + "%</span></div>" +
      rows +
      (prog.pct === 100 ? '<p class="complete">🎉 Checklist complete — nice work staying safe.</p>' : "") +
      "</section>";
  }

  function renderCheck() {
    return checklistHTML("daily", "Daily Safety Checklist", "☀️") + checklistHTML("weekly", "Weekly Safety Checklist", "🗓️");
  }

  function renderTalk() {
    var tk = state.talk;
    var pts = tk.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
    var weekLabel = tk.week ? "Week " + tk.week + " topic" : "Bonus topic";
    return '<section class="card"><h2>🎤 Toolbox Talk</h2>' +
      '<p class="muted">' + weekLabel + ' — ' + esc(tk.title) + "</p>" +
      '<h3 class="talktitle">' + esc(tk.title) + "</h3><ol class='talkpts'>" + pts + "</ol>" +
      '<div class="row"><button id="newTalk" class="btn">🎲 Pick another topic</button>' +
      '<button id="weekTalk" class="btn ghost">↩ Back to this week\'s topic</button></div>' +
      '<p class="muted small">52 rotating topics — one per week, with talking points for a 5-minute crew huddle.</p></section>';
  }

  function renderIncidents() {
    var log = SC.storageGet("incidents", []);
    var stats = SC.incidentStats(log);
    var typeOpts = SC.INCIDENT_TYPES.map(function (t) { return '<option>' + esc(t) + "</option>"; }).join("");
    var rows = log.slice().reverse().map(function (r) {
      return "<tr><td>" + esc(r.date) + "</td><td>" + esc(r.type) + "</td><td><span class='sev sev-" + esc(r.severity.toLowerCase()) + "'>" + esc(r.severity) + "</span></td><td>" + esc(r.notes) + "</td></tr>";
    }).join("");
    return '<section class="card"><h2>📋 Incident Log</h2>' +
      '<div class="statgrid"><div class="stat"><b>' + stats.total + '</b><span>total logged</span></div>' +
      '<div class="stat"><b>' + (stats.bySeverity.High || 0) + '</b><span>high severity</span></div>' +
      '<div class="stat"><b>' + (stats.byType["Near miss"] || 0) + '</b><span>near misses</span></div></div>' +
      '<form id="incForm" class="incform">' +
      '<label>Date <input type="date" id="incDate" value="' + todayStr() + '" required></label>' +
      '<label>Type <select id="incType">' + typeOpts + "</select></label>" +
      '<label>Severity <select id="incSev"><option>Low</option><option>Medium</option><option>High</option></select></label>' +
      '<label class="full">Notes <input type="text" id="incNotes" placeholder="What happened? Where? Who was involved?" required></label>' +
      '<button class="btn full" type="submit">➕ Log incident</button></form>' +
      '<div id="incErr" class="err"></div>' +
      (log.length ? '<div class="row"><button id="expCsv" class="btn ghost">⬇ Export CSV</button></div>' +
        '<div class="tablewrap"><table><thead><tr><th>Date</th><th>Type</th><th>Severity</th><th>Notes</th></tr></thead><tbody>' + rows + "</tbody></table></div>"
        : '<p class="muted">No incidents logged yet. Log near misses too — they\'re free lessons.</p>') +
      "</section>";
  }

  function renderPpe() {
    var t = trade();
    var st = SC.storageGet("ppe:" + state.trade, SC.newChecklistState(t.ppe));
    var prog = SC.checklistProgress(t.ppe, st);
    var rows = t.ppe.map(function (item, i) {
      var id = "i-" + i, done = !!st[id];
      return '<label class="checkrow' + (done ? " done" : "") + '"><input type="checkbox" data-kind="ppe" data-id="' + id + '"' + (done ? " checked" : "") + "><span>" + esc(item) + "</span></label>";
    }).join("");
    return '<section class="card"><h2>🦺 PPE Checklist — ' + esc(t.name) + "</h2>" +
      '<div class="progress"><div class="bar" style="width:' + prog.pct + '%"></div><span>' + prog.done + "/" + prog.total + " · " + prog.pct + "%</span></div>" +
      rows +
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
  }

  document.addEventListener("DOMContentLoaded", render);
})();
