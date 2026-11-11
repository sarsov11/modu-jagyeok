/* ═══════════════════════════════════════════════════════════
   모두의 전문직 — 분개 드릴 화면 (2026-11-10)
   계정을 배울 때마다 그 계정의 거래를 분개로 되풀이한다.
   자료 js/journal-data.js(JDRILL) · 색인 js/journal-rec.js(JREC) · 기록 localStorage `mp.jdrill.v1`
   거래마다 상자 0~5(맞히면 한 칸 위, 틀리면 0). 계정의 거래가 모두 3 이상이면 「익힘」.
   헷갈림을 켜고 맞힌 거래는 상자를 올리지 않는다.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var J = window.JDRILL, R = window.JREC, A = window.ACCT, KEY = (window.JREC && JREC.KEY) || "mp.jdrill.v1";
  if (window.GB) GB.mountNav("drill.html");
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function won(n) { return Number(n).toLocaleString("ko-KR"); }

  function UL() { return R.visible ? R.visible() : R.units; }   /* 이 과목에서 보이는 단원 */
  var BY = {};
  A.ACCTS.forEach(function (a) { BY[a.n] = a; });
  J.extra.forEach(function (a) { BY[a.n] = a; });
  /* 단원 이름 · 계정 · 거래 id 는 색인(JREC)에서, 거래 본문은 단원 파일(js/jd/<id>.js)을 그때 불러와 쓴다 */
  var UNIT = {}; R.units.forEach(function (u) { UNIT[u.id] = { id: u.id, name: u.name, accts: u.accts.map(function (a) { return a.n; }), rec: u }; });
  var ITEM = {};
  function reindex() { J.items.forEach(function (it) { ITEM[it.id] = it; }); }
  function idsOf(u, a) { return UNIT[u].rec.accts.filter(function (x) { return x.n === a; })[0].ids; }
  function itemsOf(u, a) { return idsOf(u, a).map(function (id) { return ITEM[id]; }).filter(Boolean); }
  var loaded = {};
  function loadUnits(list, cb) {
    var need = list.filter(function (u) { return !loaded[u]; });
    if (!need.length) { cb(); return; }
    var left = need.length;
    need.forEach(function (u) {
      var sc = document.createElement("script"); sc.src = "js/jd/" + u + ".js?v=1110v";
      sc.onload = sc.onerror = function () { loaded[u] = 1; if (--left === 0) { reindex(); cb(); } };
      document.head.appendChild(sc);
    });
  }

  /* ── 기록 ── */
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { S = null; }
  if (!S || typeof S !== "object") S = {};
  if (!S.b) S.b = {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function rec(id) { return S.b[id] || { b: 0, n: 0, w: 0 }; }
  function mastered(u, a) { return idsOf(u, a).every(function (id) { return rec(id).b >= 3; }); }
  function doneN(u, a) { return idsOf(u, a).filter(function (id) { return rec(id).b >= 3; }).length; }
  function put(id, ok, unsure) {
    var r = rec(id); r.n++;
    if (ok) { if (!unsure) r.b = Math.min(5, r.b + 1); } else { r.b = 0; r.w++; }
    /* 복습: 틀렸거나 헷갈림을 켜고 맞히면 들어가고, 헷갈림 없이 세 번 연달아 맞히면 빠진다 */
    if (!ok || unsure) { r.rv = 1; r.c = 0; } else { r.c = (r.c || 0) + 1; if (r.c >= 3) r.rv = 0; }
    S.b[id] = r; save();
  }

  /* ── 섞기(거래마다 같은 후보 순서) ── */
  function seeded(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  function shuffle(a, rnd) { a = a.slice(); rnd = rnd || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var COMMON = ["현금", "보통예금", "매입채무", "미지급금", "미수금", "매출채권"];
  function candidates(it, k) {
    var st = it.steps[k], ans = [];
    st.d.concat(st.c).forEach(function (x) { if (ans.indexOf(x[0]) < 0) ans.push(x[0]); });
    var pool = ans.slice();
    it.x.forEach(function (n) { if (pool.indexOf(n) < 0 && BY[n]) pool.push(n); });
    var rnd = seeded(it.id + ":" + k), unit = UNIT[it.u];
    var fill = shuffle(unit.accts.concat(COMMON).filter(function (n) { return pool.indexOf(n) < 0 && BY[n]; }), rnd);
    var want = Math.max(5, ans.length + (ans.length > 5 ? 1 : 0));   /* 후보는 다섯 개(정답이 더 많으면 정답 + 하나) */
    while (pool.length < want && fill.length) pool.push(fill.shift());
    pool = pool.slice(0, want);
    return shuffle(pool, rnd);
  }

  /* ── 목록 ── */
  var cur = null;   /* 풀이 중 상태 */
  function setFocus(on) { document.body.classList.toggle("focus", !!on); }
  function setHd(html) { $("hd").innerHTML = html; }
  function showBar(on) {
    $("jbar").hidden = !on;
    document.body.classList.toggle("tq-on", !!on);
    if (!on && window.TERA_PAD && TERA_PAD.penHide) TERA_PAD.penHide();
  }

  function listView() {
    cur = null; setFocus(false); showBar(false);
    setHd("<h1>분개 드릴</h1>");
    var rc = window.JREC && JREC.current ? JREC.current() : null;
    var recKey = rc && !rc.all ? rc.unit.id + "|" + rc.acct.n : null;
    if (!recKey) {   /* 회계 과목이 아니거나 이어진 기록이 없으면 첫 단원의 첫 안 익힌 계정 */
      for (var i = 0; i < UL().length && !recKey; i++) {
        for (var j = 0; j < UL()[i].accts.length; j++) { var an = UL()[i].accts[j].n; if (!mastered(UL()[i].id, an)) { recKey = UL()[i].id + "|" + an; break; } }
      }
    }
    var h = '<div class="jd-cards">';
    var rvn = R.reviewCount();
    if (rvn) h += '<section class="jd-card"><h2>복습<small>' + rvn + '거래</small></h2><div class="jd-rows"><button type="button" class="jd-row" data-review="1"><span class="nm">분개 복습<span class="tag">분개</span></span><span class="bar"></span><span class="n">시작</span></button></div></section>';
    UL().forEach(function (u) {
      var total = u.accts.reduce(function (n, a) { return n + a.ids.length; }, 0);
      h += '<section class="jd-card"><h2>' + esc(u.name) + "<small>" + total + "거래</small></h2><div class=\"jd-rows\">";
      u.accts.map(function (a) { return a.n; }).forEach(function (a) {
        var m = idsOf(u.id, a).length, d = doneN(u.id, a), full = d === m;
        h += '<button type="button" class="jd-row' + (full ? " full" : "") + '" data-u="' + u.id + '" data-a="' + esc(a) + '">' +
          '<span class="nm">' + esc(a) + (recKey === u.id + "|" + a ? '<em class="recpill">추천</em>' : "") + "</span>" +
          '<span class="bar"><i style="width:' + Math.round(d / m * 100) + '%"></i></span><span class="n">' + (full ? "익힘" : d + " / " + m) + "</span></button>";
      });
      h += "</div></section>";
    });
    h += "</div>";
    $("main").innerHTML = h;
    Array.prototype.forEach.call($("main").querySelectorAll(".jd-row"), function (b) { b.onclick = function () { if (b.dataset.review) startReview(); else start(b.dataset.u, b.dataset.a); }; });
    history.replaceState(null, "", "journal.html");
    window.scrollTo(0, 0);
  }

  /* ── 세션 ── */
  function start(u, a) { loadUnits([u], function () { start2(u, a); }); }
  function startReview() {
    var ids = R.review().slice(0, 10), us = [];
    ids.forEach(function (id) { var u = id.split("-")[0]; if (us.indexOf(u) < 0) us.push(u); });
    loadUnits(us, function () {
      var items = shuffle(ids.map(function (id) { return ITEM[id]; }).filter(Boolean));
      if (!items.length) { listView(); return; }
      cur = { u: "", a: "분개 복습", items: items, i: 0, ok: 0, res: [], review: true };
      try { history.replaceState(null, "", "journal.html?review=1"); } catch (e) {}
      openItem();
    });
  }
  function start2(u, a) {
    var items = itemsOf(u, a);
    items = shuffle(items).sort(function (x, y) {
      var rx = rec(x.id), ry = rec(y.id), mx = rx.b >= 3 ? 1 : 0, my = ry.b >= 3 ? 1 : 0;
      return mx - my || rx.b - ry.b || x.lv - y.lv;
    }).slice(0, 8);
    cur = { u: u, a: a, items: items, i: 0, ok: 0, res: [] };
    try { history.replaceState(null, "", "journal.html?u=" + u + "&a=" + encodeURIComponent(a)); } catch (e) {}
    openItem();
  }
  function openItem() {
    var it = cur.items[cur.i];
    cur.step = 0; cur.past = []; cur.conf = false; cur.itemOk = true; cur.finished = false;
    cur.mode = canType(it) ? "type" : "pick";
    newStep();
    if (window.TERA_PAD && TERA_PAD.penHide) TERA_PAD.penHide();
    var pen = $("jPen"); if (pen) pen.classList.remove("is-on");
    draw(); window.scrollTo(0, 0);
  }
  function newStep() {
    cur.rows = { d: [{ acct: "", amt: "" }], c: [{ acct: "", amt: "" }] };
    cur.active = { side: "d", idx: 0 }; cur.help = false; cur.hshown = 0;
    cur.checked = null;
    cur.cands = candidates(cur.items[cur.i], cur.step);
  }

  /* ── 채점 ── */
  function amtOf(s) { return parseInt(String(s || "").replace(/[^0-9]/g, ""), 10) || 0; }
  function gradeStep(st, rows) {
    var out = { d: [], c: [], miss: [], ok: true };
    var left = { d: st.d.map(function (x, i) { return { a: x[0], v: x[1], used: false }; }), c: st.c.map(function (x) { return { a: x[0], v: x[1], used: false }; }) };
    ["d", "c"].forEach(function (side) {
      rows[side].forEach(function (r, i) {
        var v = amtOf(r.amt);
        if (!r.acct && !v) { out[side][i] = { blank: true }; return; }
        var hit = left[side].filter(function (x) { return !x.used && x.a === r.acct && x.v === v; })[0];
        if (hit) { hit.used = true; out[side][i] = { ok: true }; }
        else out[side][i] = { ok: false, row: r, v: v };
      });
    });
    ["d", "c"].forEach(function (side) {
      var other = side === "d" ? "c" : "d";
      rows[side].forEach(function (r, i) {
        var g = out[side][i]; if (g.blank || g.ok) return;
        out.ok = false;
        var sameAcct = left[side].filter(function (x) { return !x.used && x.a === r.acct; })[0];
        var opp = left[other].filter(function (x) { return !x.used && x.a === r.acct; })[0];
        g.kind = !r.acct ? "계정" : sameAcct ? "금액" : opp ? "차대" : "계정";
        g.why = !r.acct ? "계정 비어 있음" : sameAcct ? "금액이 다름" : opp ? "차대 방향이 바뀜" : "이 거래에 없는 계정";
      });
    });
    ["d", "c"].forEach(function (side) { left[side].forEach(function (x) { if (!x.used) { out.ok = false; out.miss.push(side + "|" + x.a + "|" + x.v); } }); });
    var any = rows.d.concat(rows.c).some(function (r) { return r.acct || amtOf(r.amt); });
    if (!any) out.ok = false;
    return out;
  }

  /* ── 풀이 화면: 분개 상자(안 C — 줄마다 차변 · 대변이 마주 보는 표, 1111) ──
     큰 상자 하나 안에 머리 · 테라에이전트 한 줄 · 표 · 후보 · 차대 합 · 단추 · 채점 결과가 다 들어간다.
     계정 입력: lv1 과 아직 익숙하지 않은 계정은 후보 고르기만, lv2 이상(또는 그 계정을 세 거래 이상 맞힌 뒤)은 직접 치기(치는 대로 후보가 좁혀짐) + 고르기로 돌아가기. */
  var LV = { 1: "계정 고르기", 2: "금액 계산", 3: "이어지는 거래" };
  var CIR = ["①", "②", "③", "④"];
  var AGI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4 3.5V16h-.5A2.5 2.5 0 0 1 5 13.5z"/><path d="M9.5 9.5h.01M14.5 9.5h.01"/></svg>';

  function canType(it) {
    if (it.lv >= 2) return true;
    try { return itemsOf(it.u, it.a).filter(function (x) { return rec(x.id).b >= 1; }).length >= 3; } catch (e) { return false; }
  }
  function typed() { return cur.mode === "type" && !cur.checked; }
  function amtFont(s) { var n = (s || "").length; return n > 13 ? ' style="font-size:12.5px"' : n > 11 ? ' style="font-size:14px"' : ""; }

  function cellHtml(side, i) {
    var r = cur.rows[side][i], g = cur.checked && cur.checked[side][i], done = !!cur.checked;
    var cls = "jb-cell" + (g && !g.blank ? (g.ok ? " ok" : " no") : "") + (!done && cur.active && cur.active.side === side && cur.active.idx === i ? " on" : "");
    var acc = typed()
      ? '<input class="jb-in" type="text" value="' + esc(r.acct) + '" placeholder="계정 치기" aria-label="계정" autocomplete="off" autocapitalize="off" spellcheck="false">'
      : '<button type="button" class="jb-acc' + (r.acct ? " has" : "") + '"' + (done ? " disabled" : "") + ">" + esc(r.acct || "계정") + "</button>";
    return '<div class="' + cls + '" data-s="' + side + '" data-i="' + i + '">' + acc +
      '<input class="jb-amt" type="text" inputmode="numeric" autocomplete="off" placeholder="금액" aria-label="금액" value="' + esc(r.amt) + '"' + amtFont(r.amt) + (done ? " disabled" : "") + ">" +
      (!done && cur.rows[side].length > 1 ? '<button type="button" class="jb-rm" aria-label="줄 지우기">×</button>' : "") +
      (g && !g.blank && !g.ok && g.why ? '<p class="jb-why">' + esc(g.why) + "</p>" : "") + "</div>";
  }
  function sums() { var t = { d: 0, c: 0 }; ["d", "c"].forEach(function (s) { cur.rows[s].forEach(function (r) { t[s] += amtOf(r.amt); }); }); return t; }
  function tableHtml() {
    var n = Math.max(cur.rows.d.length, cur.rows.c.length), t = sums();
    var h = '<div class="jb-tb"><div class="jb-tr th"><div>차변</div><div>대변</div></div>';
    for (var i = 0; i < n; i++) h += '<div class="jb-tr">' + ["d", "c"].map(function (s) { return cur.rows[s][i] ? cellHtml(s, i) : '<div class="jb-slot"></div>'; }).join("") + "</div>";
    h += '<div class="jb-tr sum"><div id="jSd">' + (t.d ? won(t.d) : "") + '</div><div id="jSc">' + (t.c ? won(t.c) : "") + "</div></div>";
    if (!cur.checked) h += '<div class="jb-tr add"><button type="button" class="jb-add" data-s="d">차변 줄 더하기</button><button type="button" class="jb-add" data-s="c">대변 줄 더하기</button></div>';
    return h + "</div>";
  }
  function sumHtml() {
    var t = sums(), any = t.d || t.c, eq = t.d === t.c && t.d > 0;
    return "<span>차변 <b>" + won(t.d) + "</b></span><span>대변 <b>" + won(t.c) + '</b></span><span class="st ' + (any ? (eq ? "ok" : "no") : "") + '">' + (!any ? "" : eq ? "차대 맞음" : "차액 " + won(Math.abs(t.d - t.c))) + "</span>";
  }
  function updateSums() {
    var t = sums(), a = $("jSd"), b = $("jSc"), s = $("jSum");
    if (a) a.textContent = t.d ? won(t.d) : ""; if (b) b.textContent = t.c ? won(t.c) : ""; if (s) s.innerHTML = sumHtml();
  }
  function candList() {
    if (typed()) {
      var q = ((cur.active && cur.rows[cur.active.side][cur.active.idx]) || {}).acct || "";
      q = q.replace(/\s+/g, ""); if (!q) return [];
      var names = Object.keys(BY).filter(function (n) { return n.replace(/\s+/g, "").indexOf(q) >= 0; });
      names.sort(function (a, b) { return (a.indexOf(q) === 0 ? 0 : 1) - (b.indexOf(q) === 0 ? 0 : 1) || a.length - b.length; });
      return names.slice(0, 6);
    }
    return cur.cands;
  }
  function candHtml() {
    if (cur.checked || !cur.active) return "";
    var list = candList(), s = cur.active.side, i = cur.active.idx;
    if (typed() && !list.length && !(cur.rows[s][i].acct || "")) return "";
    return '<div class="jb-cand"><h3>' + (s === "d" ? "차변 " : "대변 ") + (i + 1) + " · 계정" + (typed() ? " · 치는 대로 좁혀짐" : "") + '</h3><div class="jb-chips">' +
      (list.length ? list.map(function (n) { return '<button type="button" class="jb-chip" data-n="' + esc(n) + '">' + esc(n) + "</button>"; }).join("") : '<span class="jb-none">맞는 계정 없음</span>') + "</div></div>";
  }

  /* 테라에이전트 — 한 단계씩. 자료(계정 성격 · 차대)에서 만든다. 답을 통째로 주지 않는다. */
  function lineInfo(st) {
    var out = [];
    [["d", st.d], ["c", st.c]].forEach(function (p) {
      p[1].forEach(function (x) {
        var a = BY[x[0]]; if (!a) return;
        out.push({ s: p[0], n: x[0], g: a.g, inc: (p[0] === "d") === (a.side === "차"), norm: a.side });
      });
    });
    return out;
  }
  function helpSteps(st) {
    var L = lineInfo(st), cnt = {}, ord = [];
    L.forEach(function (l) { var k = l.g + (l.inc ? "|늘" : "|줆"); if (!cnt[k]) { cnt[k] = 0; ord.push(k); } cnt[k]++; });
    var a1 = ord.map(function (k) { var p = k.split("|"); return esc(p[0]) + " " + cnt[k] + "줄 " + (p[1] === "늘" ? "늘어남" : "줄어듦"); }).join(" · ");
    var seen = {}, rule = [];
    L.forEach(function (l) { if (seen[l.g]) return; seen[l.g] = 1; rule.push(esc(l.g) + ": 늘면 " + l.norm + "변, 줄면 " + (l.norm === "차" ? "대" : "차") + "변"); });
    var nm = function (s) { return L.filter(function (l) { return l.s === s; }).map(function (l) { return "<i>" + esc(l.n) + "</i>"; }).join(""); };
    return [
      { q: "이 거래에서 늘거나 준 것은?", a: a1 || "자료 없음" },
      { q: "차변인가 대변인가?", a: rule.join(" · ") + ". 차변 " + st.d.length + "줄, 대변 " + st.c.length + "줄." },
      { q: "계정 이름은?", a: "차변 " + nm("d") + " 대변 " + nm("c") }
    ];
  }
  function agentHtml() {
    var st = cur.items[cur.i].steps[cur.step];
    var h = '<div class="jb-ag">' + AGI + '<b>테라에이전트</b><span class="t">' + (cur.hshown ? cur.hshown + " / 3 단계" : "막히면 한 단계씩") + '</span><button type="button" id="jHelp">' + (cur.help ? "접기" : "도움") + "</button></div>";
    if (!cur.help) return h;
    var S3 = helpSteps(st); h += '<div class="jb-agp">';
    for (var k = 0; k <= cur.hshown && k < 3; k++) {
      h += '<div class="st"><div class="q">' + (k + 1) + ". " + S3[k].q + "</div>" + (k < cur.hshown ? '<div class="a">' + S3[k].a + "</div>" : '<button type="button" class="go2" data-k="' + k + '">알려 줘</button>') + "</div>";
    }
    return h + "</div>";
  }
  function agentSay(st, res) {
    var bad = [];
    ["d", "c"].forEach(function (s) { res[s].forEach(function (g, i) { if (g && !g.blank && !g.ok) bad.push({ g: g, r: cur.rows[s][i], s: s }); }); });
    if (!bad.length && !res.miss.length) return "차변 · 대변 모두 맞다.";
    if (!bad.length) return "빠진 줄이 있다. 차변 " + st.d.length + "줄 · 대변 " + st.c.length + "줄이다.";
    var b = bad[0], nm = b.r.acct || "빈 줄", more = bad.length > 1 ? " 외 " + (bad.length - 1) + "곳" : "", t;
    if (b.g.kind === "금액") t = nm + ": 금액이 다르다." + more + (st.calc ? "<br>" + esc(st.calc).replace(/ ; /g, "<br>") : "");
    else if (b.g.kind === "차대") { var a = BY[b.r.acct]; t = nm + ": 차변과 대변이 바뀌었다." + more + (a ? "<br>" + esc(a.g) + "은 늘면 " + a.side + "변이다." : ""); }
    else t = nm + ": 이 거래에 없는 계정이다." + more + "<br>늘거나 줄어든 것을 다시 본다.";
    return t;
  }
  function answerHtml(st, res) {
    function col(arr, side) {
      return arr.map(function (x) {
        var miss = res.miss.indexOf(side + "|" + x[0] + "|" + x[1]) >= 0;
        return "<p" + (miss ? ' class="miss"' : "") + "><span>" + esc(x[0]) + "</span><b>" + won(x[1]) + "</b></p>";
      }).join("");
    }
    return '<div class="jb-ans"><div><h4>차변</h4>' + col(st.d, "d") + "</div><div><h4>대변</h4>" + col(st.c, "c") + "</div></div>";
  }
  function draw() {
    var it = cur.items[cur.i], st = it.steps[cur.step], multi = it.steps.length > 1, lastStep = cur.step === it.steps.length - 1;
    setFocus(true); showBar(true);
    setHd('<a class="bk" href="journal.html" id="jBack" title="목록" aria-label="목록">‹</a><h1>' + esc(it.a) + '</h1><span class="cnt"></span><a class="x" href="drill.html" title="그만하기">✕</a>');
    var pct = Math.round((cur.i + (cur.finished ? 1 : 0)) / cur.items.length * 100);
    var h = '<div class="tq-prog"><i><u style="width:' + pct + '%"></u></i><span><b>' + (cur.i + 1) + "</b> / " + cur.items.length + "</span></div>" +
      '<div class="tq-meta"><span class="tq-no">' + (cur.i + 1) + '번 거래</span><span class="tq-sp"></span><span class="jd-lv">' + LV[it.lv] + "</span></div>" +
      '<p class="tq-stem" id="jStem">' + esc(it.q) + "</p>";
    h += '<section class="jb" id="jBox"><div class="jb-h"><h2>분개</h2>' + (multi ? '<span class="jb-tag">' + CIR[cur.step] + " " + (cur.step + 1) + " / " + it.steps.length + "</span>" : "") + '<span class="sp"></span>' +
      (canType(it) && !cur.checked ? '<span class="jb-seg"><button type="button" data-m="pick" class="' + (cur.mode === "pick" ? "on" : "") + '">고르기</button><button type="button" data-m="type" class="' + (cur.mode === "type" ? "on" : "") + '">직접 치기</button></span>' : "") + "</div>";
    if (multi) {
      if (cur.past.length) h += '<p class="jd-past">' + cur.past.map(function (p, i) { return "<span>" + CIR[i] + " " + esc(it.steps[i].when || "") + " <b class=\"" + (p ? "ok" : "no") + '">' + (p ? "맞음" : "틀림") + "</b></span>"; }).join("") + "</p>";
      if (st.when) h += '<p class="jd-when">' + esc(st.when) + "</p>";
    }
    h += (cur.checked ? "" : agentHtml()) + tableHtml() + '<div id="jCand">' + candHtml() + '</div><div class="jb-sum" id="jSum">' + sumHtml() + "</div>";
    if (!cur.checked) {
      h += '<div class="jb-act"><span id="jPad" class="jd-pad"></span><button type="button" class="jb-go" id="jCheck">확인</button></div>';
    } else {
      var res = cur.checked;
      h += '<div class="jb-res"><p class="jd-verdict ' + (res.ok ? "ok" : "no") + '">' + (res.ok ? "맞음" : "틀림") + '</p><div class="jb-agr">' + AGI + "<div><b>테라에이전트</b>" + agentSay(st, res) + "</div></div>" + answerHtml(st, res);
      if (res.ok && st.calc) h += '<p class="jd-calc">' + esc(st.calc).replace(/ ; /g, "<br>") + "</p>";
      if (st.why) h += '<div class="jd-expl" id="jExpl">' + esc(st.why) + "</div>";
      h += "</div>";
      if (multi && !lastStep) h += '<div class="jb-act"><button type="button" class="jb-go" id="jStepNext">다음 시점</button></div>';
    }
    h += "</section>";
    $("main").innerHTML = h;
    wire();
    padButton(it);
    var cnt = cur.items.length;
    $("jPos").innerHTML = (cur.i + 1) + " <small>/ " + cnt + "</small>";
    $("jNext").disabled = !cur.finished;
    $("jExp").disabled = !cur.checked;
    $("jHalf").classList.toggle("is-on", !!cur.conf);
  }
  function padButton(it) {
    var host = $("jPad"); if (!host) return;
    var need = it.lv >= 2 || (window.TERA_PAD && TERA_PAD.isCalc && TERA_PAD.isCalc(it.q));
    if (!need || !window.TERA_PAD) { host.remove(); return; }
    TERA_PAD.button(host, function () { return { key: "jd-" + it.id, title: it.a + " 분개" }; });
  }

  function setActive(side, idx) {
    cur.active = { side: side, idx: idx };
    Array.prototype.forEach.call(document.querySelectorAll(".jb-cell"), function (c) { c.classList.toggle("on", c.dataset.s === side && +c.dataset.i === idx); });
    $("jCand").innerHTML = candHtml(); wireCands();
  }
  function afterPick() {
    var s = cur.active.side, rows = cur.rows[s], nx = -1, k;
    for (k = 0; k < rows.length; k++) if (!rows[k].acct) { nx = k; break; }
    if (nx >= 0) { cur.active = { side: s, idx: nx }; return; }
    var o = s === "d" ? "c" : "d";
    for (k = 0; k < cur.rows[o].length; k++) if (!cur.rows[o][k].acct) { cur.active = { side: o, idx: k }; return; }
    cur.active = null;
  }
  function wireCands() {
    Array.prototype.forEach.call(document.querySelectorAll("#jCand .jb-chip"), function (b) {
      b.onclick = function () {
        if (!cur.active) return;
        cur.rows[cur.active.side][cur.active.idx].acct = b.dataset.n; afterPick();
        var y = window.pageYOffset; draw(); window.scrollTo(0, y);
      };
    });
  }
  function wire() {
    var main = $("main");
    Array.prototype.forEach.call(main.querySelectorAll(".jb-cell"), function (ln) {
      var side = ln.dataset.s, i = +ln.dataset.i, row = cur.rows[side][i];
      var acc = ln.querySelector(".jb-acc"), inp = ln.querySelector(".jb-in"), amt = ln.querySelector(".jb-amt"), x = ln.querySelector(".jb-rm");
      if (acc) acc.onclick = function () { setActive(side, i); };
      if (inp) {
        inp.addEventListener("focus", function () { setActive(side, i); });
        inp.addEventListener("input", function () { row.acct = inp.value; $("jCand").innerHTML = candHtml(); wireCands(); inp.classList.remove("miss"); });
      }
      amt.addEventListener("focus", function () { if (!cur.active || cur.active.side !== side || cur.active.idx !== i) setActive(side, i); });
      amt.addEventListener("input", function () {
        var d = amt.value.replace(/[^0-9]/g, "").slice(0, 15); row.amt = d ? Number(d).toLocaleString("ko-KR") : ""; amt.value = row.amt;
        var n = row.amt.length; amt.style.fontSize = n > 13 ? "12.5px" : n > 11 ? "14px" : ""; updateSums();
      });
      if (x) x.onclick = function () { cur.rows[side].splice(i, 1); cur.active = null; draw(); };
    });
    Array.prototype.forEach.call(main.querySelectorAll(".jb-add"), function (b) {
      b.onclick = function () { var s = b.dataset.s; cur.rows[s].push({ acct: "", amt: "" }); cur.active = { side: s, idx: cur.rows[s].length - 1 }; var y = window.pageYOffset; draw(); window.scrollTo(0, y); };
    });
    Array.prototype.forEach.call(main.querySelectorAll(".jb-seg button"), function (b) {
      b.onclick = function () { cur.mode = b.dataset.m; var y = window.pageYOffset; draw(); window.scrollTo(0, y); };
    });
    var hp = $("jHelp"); if (hp) hp.onclick = function () { cur.help = !cur.help; var y = window.pageYOffset; draw(); window.scrollTo(0, y); };
    Array.prototype.forEach.call(main.querySelectorAll(".jb-agp .go2"), function (b) {
      b.onclick = function () { cur.hshown = +b.dataset.k + 1; var y = window.pageYOffset; draw(); window.scrollTo(0, y); };
    });
    wireCands();
    var ck = $("jCheck"); if (ck) ck.onclick = check;
    var sn = $("jStepNext"); if (sn) sn.onclick = function () { cur.step++; newStep(); draw(); window.scrollTo(0, 0); };
  }

  function check() {
    var it = cur.items[cur.i], st = it.steps[cur.step], res = gradeStep(st, cur.rows);
    cur.checked = res; cur.past.push(res.ok);
    if (!res.ok) cur.itemOk = false;
    if (window.ZZ) { try { if (res.ok) ZZ.ok($("jCheck")); else ZZ.no($("jCheck")); } catch (e) {} }
    if (cur.step === it.steps.length - 1) {
      cur.finished = true;
      put(it.id, cur.itemOk, cur.conf);
      cur.res.push(cur.itemOk); if (cur.itemOk) cur.ok++;
    }
    draw();
    var v = document.querySelector(".jd-verdict"); if (v) v.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function next() {
    if (!cur || !cur.finished) return;
    if (cur.i + 1 < cur.items.length) { cur.i++; openItem(); } else endView();
  }

  function endView() {
    showBar(false); setFocus(true);
    setHd('<a class="bk" href="journal.html" title="목록" aria-label="목록">‹</a><h1>' + esc(cur.a) + '</h1><span class="cnt"></span><a class="x" href="drill.html" title="그만하기">✕</a>');
    if (cur.review) {
      $("main").innerHTML = '<div class="jd-end"><div class="big">' + cur.ok + " / " + cur.items.length + '</div><div class="sm">분개 복습 · 남은 ' + R.reviewCount() + '거래</div><div class="acts"><a class="btn block" href="drill.html">드릴</a><button type="button" class="btn ghost block" id="jList">목록</button></div></div>';
      $("jList").onclick = listView; window.scrollTo(0, 0); return;
    }
    var m = mastered(cur.u, cur.a), nextA = null, nu = null;
    var order = UL().slice().sort(function (a, b) { return (a.id === cur.u ? 0 : 1) - (b.id === cur.u ? 0 : 1); });
    for (var i = 0; i < order.length && !nextA; i++) { for (var j = 0; j < order[i].accts.length; j++) { var an = order[i].accts[j].n; if (an !== cur.a && !mastered(order[i].id, an)) { nextA = an; nu = order[i].id; break; } } }
    $("main").innerHTML = '<div class="jd-end"><div class="big">' + cur.ok + " / " + cur.items.length + '</div><div class="sm">' + esc(cur.a) + (m ? " · 익힘" : " · " + doneN(cur.u, cur.a) + " / " + idsOf(cur.u, cur.a).length) + "</div>" +
      '<div class="acts">' + (nextA ? '<button type="button" class="btn block" id="jMore">다음 · ' + esc(nextA) + "</button>" : '<a class="btn block" href="drill.html">드릴</a>') +
      '<button type="button" class="btn ghost block" id="jList">목록</button></div></div>';
    if ($("jMore")) $("jMore").onclick = function () { start(nu, nextA); };
    $("jList").onclick = listView;
    window.scrollTo(0, 0);
  }

  /* ── 아래 줄 ── */
  $("jNext").onclick = next;
  $("jHalf").onclick = function () { if (!cur || cur.finished) return; cur.conf = !cur.conf; this.classList.toggle("is-on", cur.conf); };
  $("jExp").onclick = function () { var e = $("jExpl") || document.querySelector(".jb-ans"); if (e) e.scrollIntoView({ behavior: "smooth", block: "center" }); };
  $("jPen").onclick = function () {
    if (!window.TERA_PAD || !TERA_PAD.pen || !cur) return;
    var self = this; TERA_PAD.pen({ key: "jd-" + cur.items[cur.i].id, onChange: function (on) { self.classList.toggle("is-on", !!on); } });
  };
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#jBack"); if (b && cur) { e.preventDefault(); listView(); }
  });

  /* ── 들어가기: ?u=단원 [&a=계정] ── */
  var qp = new URLSearchParams(location.search), qu = qp.get("u"), qa = qp.get("a");
  if (qp.get("item")) {   /* 거래 하나만 풀기(복습 목록에서 그 거래로) */
    var iid = qp.get("item"), iu = iid.split("-")[0];
    if (UNIT[iu]) loadUnits([iu], function () {
      var it = ITEM[iid]; if (!it) { listView(); return; }
      cur = { u: iu, a: it.a, items: [it], i: 0, ok: 0, res: [] };
      openItem();
    }); else listView();
  } else if (qp.get("review")) { if (R.reviewCount()) startReview(); else listView(); }
  else if (qu && UNIT[qu]) {
    if (!qa || UNIT[qu].accts.indexOf(qa) < 0) {
      var na = null; UNIT[qu].accts.forEach(function (an) { if (!na && !mastered(qu, an)) na = an; });
      qa = na || UNIT[qu].accts[0];
    }
    start(qu, qa);
  } else listView();
})();
