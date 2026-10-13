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

  // Built-in trade items + this trade's custom items, with stable ids.
  function customItems(kind) {
    return SC.storageGet("custom:" + state.trade + ":" + kind, []);
  }
  function itemsFor(kind) {
    return SC.checklistItemsFor(trade()[kind], customItems(kind));
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
    return items.map(function (it) {
      var done = !!st[it.id];
      return '<label class="checkrow' + (done ? " done" : "") + '">' +
        '<input type="checkbox" data-kind="' + kind + '" data-id="' + esc(it.id) + '"' + (done ? " checked" : "") + ">" +
        '<span class="box" aria-hidden="true"></span>' +
        '<span class="lbl">' + esc(it.label) + "</span>" +
        (it.custom ? '<button class="icon-btn tiny" data-del-custom="' + kind + ':' + esc(it.id) + '" aria-label="Remove custom item" title="Remove custom item">✕</button>' : "") +
        "</label>";
    }).join("");
  }

  function checklistHTML(kind, title, kicker) {
    var items = itemsFor(kind);
    var st = getCheckState(kind, trade()[kind]);
    var prog = SC.checklistProgressIds(items, st);
    var customCount = items.filter(function (it) { return it.custom; }).length;
    return '<section class="card inspect">' +
      '<div class="card-top"><div><p class="kicker">' + kicker + (customCount ? " · " + customCount + " custom" : "") + '</p><h2>' + title + "</h2></div>" +
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
    var streak = SC.completionStreak(SC.storageGet("streakDays", []), todayStr());
    var streakHTML = streak > 0
      ? '<div class="streak-banner"><span class="streak-flame" aria-hidden="true"></span>' +
        '<strong>' + streak + "-day perfect streak</strong>" +
        '<span class="muted small"> — daily checklist completed ' + streak + ' day' + (streak === 1 ? "" : "s") + ' running.</span></div>'
      : "";
    return '<div class="row checktools"><button id="printCheck" class="btn ghost">Print checklists</button>' +
      '<span class="muted small">Hand the printout to the crew for the morning huddle.</span></div>' +
      streakHTML +
      checklistHTML("daily", "Daily Safety Checklist", "Inspection · resets each morning") +
      checklistHTML("weekly", "Weekly Safety Checklist", "Inspection · resets each ISO week") +
      renderScoreCard() + renderCustomManager();
  }

  // ---- Weekly safety score ----
  function scoreWeekKey() {
    var d = new Date();
    return d.getFullYear() + "-W" + String(SC.isoWeekNumber(d)).padStart(2, "0");
  }
  function combinedScore() {
    var dp = SC.checklistProgressIds(itemsFor("daily"), SC.storageGet(checkKey("daily"), {}));
    var wp = SC.checklistProgressIds(itemsFor("weekly"), SC.storageGet(checkKey("weekly"), {}));
    var pp = SC.checklistProgressIds(itemsFor("ppe"), SC.storageGet("ppe:" + state.trade, {}));
    return Math.round((dp.pct + wp.pct + pp.pct) / 3);
  }
  function renderScoreCard() {
    var score = combinedScore();
    var wk = scoreWeekKey();
    var snaps = SC.scoreTrend(SC.storageGet("scores", []));
    var logged = SC.storageGet("scores", []).some(function (s) { return s.week === wk; });
    var max = 100;
    var bars = snaps.map(function (s) {
      var h = Math.max(3, Math.round(s.pct / max * 48));
      var cur = s.week === wk ? " cur" : "";
      return '<div class="sbar' + cur + '" title="' + esc(s.week) + ': ' + s.pct + '%">' +
        "<span>" + s.pct + "%</span><i style='height:" + h + "px'></i><em>" + esc(s.week.slice(5)) + "</em></div>";
    }).join("");
    return '<section class="card"><div class="card-top"><div><p class="kicker">Track it</p><h2>Weekly safety score</h2></div>' +
      '<div class="card-actions"><div class="pct-big">' + score + '<span>%</span></div>' +
      '<button id="logScore" class="btn tiny"' + (logged ? " disabled" : "") + ">" +
      (logged ? "Logged ✓" : "Log this week") + "</button></div></div>" +
      '<p class="muted small">Average completion of the daily, weekly, and PPE checklists right now. Log it each week to watch the trend.</p>' +
      (snaps.length ? '<div class="scorebars">' + bars + "</div>"
        : '<p class="muted small">No scores logged yet — log this week to start the trend.</p>') +
      "</section>";
  }

  // ---- Custom checklist items ----
  function renderCustomManager() {
    var kinds = [["daily", "Daily"], ["weekly", "Weekly"], ["ppe", "PPE"]];
    var list = kinds.map(function (k) {
      var items = customItems(k[0]);
      return '<div class="custom-kind"><h4>' + k[1] + ' <span class="muted small">(' + items.length + ")</span></h4>" +
        (items.length ? "<ul>" + items.map(function (c) {
          return "<li>" + esc(c.text) +
            ' <button class="icon-btn tiny" data-del-custom="' + k[0] + ":" + esc(c.id) + '" aria-label="Remove custom item">✕</button></li>';
        }).join("") + "</ul>" : '<p class="muted small">No custom items.</p>') + "</div>";
    }).join("");
    return '<section class="card"><div class="card-top"><div><p class="kicker">Make it yours</p><h2>Custom checklist items</h2></div></div>' +
      '<p class="muted small">Add your own items to any ' + esc(trade().name) + ' checklist — they are saved in this browser and print with the rest.</p>' +
      '<div class="row"><select id="customKind" aria-label="Checklist">' +
      kinds.map(function (k) { return '<option value="' + k[0] + '">' + k[1] + "</option>"; }).join("") + "</select>" +
      '<input type="text" id="customText" placeholder="e.g. Check the trench shoring before entry" maxlength="140" style="flex:1;min-width:200px">' +
      '<button id="addCustom" class="btn">Add item</button></div>' +
      '<div id="customErr" class="err" role="alert"></div>' +
      '<div class="custom-list">' + list + "</div></section>";
  }

  function talkAttendKey(tk) {
    var d = new Date();
    return tk.week ? d.getFullYear() + "-W" + String(tk.week).padStart(2, "0") : "bonus-" + todayStr();
  }

  function attendanceHTML(tk) {
    var key = talkAttendKey(tk);
    var list = SC.attendanceFor(SC.storageGet("attendance", []), key);
    var rows = list.length
      ? '<ul class="attlist">' + list.map(function (s) {
          return "<li>" + esc(s.name) + ' <span class="muted small">· ' + esc(s.at.slice(11, 16)) + "</span></li>";
        }).join("") + "</ul>"
      : '<p class="muted small">Nobody signed in yet.</p>';
    return '<div class="attend"><div class="card-top"><div><p class="kicker">Attendance record</p>' +
      '<h2>Crew sign-in <span class="cnt-badge">' + list.length + " present</span></h2></div></div>" +
      '<div class="row"><input id="attName" type="text" placeholder="Crew member name" maxlength="60">' +
      '<button id="attAdd" class="btn">Sign in</button></div>' +
      '<p class="err small" id="attErr"></p>' + rows +
      '<p class="muted small">Names are stored locally — print or screenshot for your OSHA records.</p></div>';
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
      '<p class="muted small">52 rotating topics — one per week, with talking points for a 5-minute crew huddle.</p>' +
      attendanceHTML(tk) + '</section>';
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
      var actCount = SC.actionsForIncident(SC.storageGet("actions", []), r.id).length;
      return "<tr><td class='d'>" + esc(r.date) + "</td><td>" + esc(r.type) + "</td><td><span class='sev sev-" + esc(r.severity.toLowerCase()) + "'>" + esc(r.severity) + "</span></td><td>" + esc(r.notes) + "</td>" +
        "<td class='rowdel'><button class='btn ghost tiny' data-act-inc='" + esc(r.id) + "' title='Create a corrective action for this incident'>+ Action" + (actCount ? " (" + actCount + ")" : "") + "</button> " +
        "<button class='btn ghost tiny' data-del-inc='" + esc(r.id) + "' aria-label='Delete incident'>Delete</button></td></tr>";
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
      "</section>" + renderActionsCard();
  }

  function renderActionsCard() {
    var actions = SC.storageGet("actions", []);
    var open = SC.openActions(actions, todayStr());
    var overdue = SC.overdueActions(actions, todayStr());
    var log = SC.storageGet("incidents", []);
    var rows = open.map(function (a) {
      var inc = null;
      log.forEach(function (r) { if (r.id === a.incidentId) inc = r; });
      var od = a.dueDate && a.dueDate < todayStr();
      return '<div class="action' + (od ? " overdue" : "") + '">' +
        "<div><strong>" + esc(a.text) + "</strong>" +
        '<div class="muted small">' +
        (inc ? esc(inc.date) + " · " + esc(inc.type) + " · " : "") +
        (a.owner ? "Owner: " + esc(a.owner) + " · " : "") +
        (a.dueDate ? "Due " + esc(a.dueDate) + (od ? " — OVERDUE" : "") : "No due date") +
        "</div></div>" +
        '<div class="action-btns"><button class="btn tiny" data-done-act="' + esc(a.id) + '">Mark done</button>' +
        ' <button class="btn ghost tiny" data-del-act="' + esc(a.id) + '">Delete</button></div></div>';
    }).join("");
    var incOpts = '<option value="">None</option>' + log.slice().reverse().map(function (r) {
      return '<option value="' + esc(r.id) + '"' + (state.actionFor === r.id ? " selected" : "") + ">" +
        esc(r.date) + " — " + esc(r.type) + "</option>";
    }).join("");
    return '<section class="card actions-card">' +
      '<div class="card-top"><div><p class="kicker">Follow-through</p><h2>Corrective actions' +
      (overdue.length ? ' <span class="od-badge">' + overdue.length + " overdue</span>" : "") + "</h2></div></div>" +
      '<p class="muted small">Turn incidents into fixes — assign an owner and a due date, then check them off.</p>' +
      '<form id="actForm" class="incform">' +
      '<label class="full">Action <input type="text" id="actText" placeholder="e.g. Replace the frayed extension cord on site 2" required></label>' +
      '<label>Linked incident <select id="actInc">' + incOpts + "</select></label>" +
      '<label>Owner <input type="text" id="actOwner" placeholder="Who owns this?"></label>' +
      '<label>Due date <input type="date" id="actDue"></label>' +
      '<button class="btn full" type="submit">Add action</button></form>' +
      '<div id="actErr" class="err" role="alert"></div>' +
      (open.length ? '<div class="actions">' + rows + "</div>"
        : '<div class="emptybox"><p class="muted small">No open actions — every incident has been followed through.</p></div>') +
      "</section>";
  }

  function renderPpe() {
    var t = trade();
    var items = itemsFor("ppe");
    var st = SC.storageGet("ppe:" + state.trade, SC.newChecklistState(t.ppe));
    var prog = SC.checklistProgressIds(items, st);
    return '<section class="card inspect">' +
      '<div class="card-top"><div><p class="kicker">Gear up · before every shift</p><h2>PPE Checklist — ' + esc(t.name) + "</h2></div>" +
      '<div class="card-actions"><div class="pct-big">' + prog.pct + '<span>%</span></div>' +
      '<button class="btn ghost tiny" data-reset-check="ppe">Reset</button></div></div>' +
      progressHTML(prog) +
      '<div class="checks">' + checkRows(items, st, "ppe") + "</div>" +
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
        // daily checklist completed -> feed the perfect-day streak
        if (kind === "daily") {
          var full = itemsFor("daily");
          var prog = SC.checklistProgressIds(full, st);
          if (prog.total > 0 && prog.pct === 100) {
            SC.storageSet("streakDays", SC.recordCompletion(SC.storageGet("streakDays", []), todayStr()));
          }
        }
        render();
      });
    });
    var nt = document.getElementById("newTalk");
    if (nt) nt.addEventListener("click", function () { state.talk = SC.randomTalk(state.talk.index); render(); });
    var wt = document.getElementById("weekTalk");
    if (wt) wt.addEventListener("click", function () { state.talk = SC.currentTalk(); render(); });
    var attAdd = document.getElementById("attAdd");
    if (attAdd) attAdd.addEventListener("click", function () {
      var nm = document.getElementById("attName").value;
      var key = talkAttendKey(state.talk);
      var res = SC.signInAttendance(SC.storageGet("attendance", []), key, state.talk.title, nm);
      if (!res.ok) { document.getElementById("attErr").textContent = res.errors.join("; "); return; }
      SC.storageSet("attendance", res.signins);
      render();
    });
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
      // High-severity incidents always get a follow-up: auto-create a linked
      // corrective action due in 7 days so nothing falls through the cracks.
      if (document.getElementById("incSev").value === "High") {
        var acts = SC.storageGet("actions", []);
        var due = new Date(); due.setDate(due.getDate() + 7);
        var ar = SC.addAction(acts, {
          incidentId: res.incident.id,
          text: "Investigate " + document.getElementById("incType").value +
            " incident (" + document.getElementById("incDate").value + ")",
          owner: "",
          dueDate: SC.dateToStr(due)
        });
        if (ar.ok) SC.storageSet("actions", ar.actions);
      }
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
    // jump from an incident row to the corrective-action form, preselected
    Array.prototype.forEach.call(document.querySelectorAll("[data-act-inc]"), function (b) {
      b.addEventListener("click", function () {
        state.actionFor = b.getAttribute("data-act-inc");
        render();
        var f2 = document.getElementById("actForm");
        if (f2) f2.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    // corrective action form
    var af = document.getElementById("actForm");
    if (af) af.addEventListener("submit", function (e) {
      e.preventDefault();
      var res = SC.addAction(SC.storageGet("actions", []), {
        incidentId: document.getElementById("actInc").value || null,
        text: document.getElementById("actText").value,
        owner: document.getElementById("actOwner").value,
        dueDate: document.getElementById("actDue").value
      });
      if (!res.ok) { document.getElementById("actErr").textContent = res.errors.join("; "); return; }
      SC.storageSet("actions", res.actions);
      state.actionFor = null;
      render();
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-done-act]"), function (b) {
      b.addEventListener("click", function () {
        SC.storageSet("actions", SC.toggleAction(SC.storageGet("actions", []),
          b.getAttribute("data-done-act")));
        render();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-act]"), function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Delete this corrective action?")) return;
        SC.storageSet("actions", SC.deleteAction(SC.storageGet("actions", []),
          b.getAttribute("data-del-act")));
        render();
      });
    });
    // custom checklist items
    var ac = document.getElementById("addCustom");
    if (ac) ac.addEventListener("click", function () {
      var kind = document.getElementById("customKind").value;
      var key = "custom:" + state.trade + ":" + kind;
      var res = SC.addCustomItem(SC.storageGet(key, []), document.getElementById("customText").value);
      if (!res.ok) { document.getElementById("customErr").textContent = res.error; return; }
      SC.storageSet(key, res.items);
      render();
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-custom]"), function (b) {
      b.addEventListener("click", function () {
        var parts = b.getAttribute("data-del-custom").split(":");
        var kind = parts[0], id = parts.slice(1).join(":");
        if (!confirm("Remove this custom item?")) return;
        var key = "custom:" + state.trade + ":" + kind;
        SC.storageSet(key, SC.removeCustomItem(SC.storageGet(key, []), id));
        var skey = kind === "ppe" ? "ppe:" + state.trade : checkKey(kind);
        var st = SC.storageGet(skey, {});
        delete st[id];
        SC.storageSet(skey, st);
        render();
      });
    });
    // weekly safety score
    var ls = document.getElementById("logScore");
    if (ls) ls.addEventListener("click", function () {
      SC.storageSet("scores", SC.recordScore(SC.storageGet("scores", []), scoreWeekKey(), combinedScore()));
      render();
    });
  }

  // keep the search box focused + caret at end after a re-render on typing
  function refocusInc(id) {
    var elx = document.getElementById(id);
    if (elx) { elx.focus(); var v = elx.value; elx.value = ""; elx.value = v; }
  }

  document.addEventListener("DOMContentLoaded", render);
})();
