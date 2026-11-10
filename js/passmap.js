/* 합격 지도 어댑터 — 이 시험의 모든 과목을 줄로 (화면표준 11절, 2026-11-10)
   공용 tera-map.js 에 groups → nodes → leaves(avg = 해마다 몇 문제, pct = 진척)를 넘긴다.
   과목마다 data/<id>.js 를 그때 불러와(숨은 iframe) 줄 하나를 만든다. 지금 과목은 이미 실린 자료를 쓴다.
   avg 는 실제 기출 문항(시험·연도·번호 한 문항 = 1)을 연도 수로 나눈 값만 쓴다. 한 줄의 칸이 26개를 넘으면 장 → 편 순으로 묶는다. */
(function () {
  "use strict";
  if (!window.GB || !window.TERA_MAP) return;
  var PRE = window.PM_PRE || "jg", D = document, MAXC = 26;
  var host = D.getElementById("map");
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function readAns(key) {
    try { var s = (window.JG_ST && JG_ST.get) ? JG_ST.get(key) : localStorage.getItem(key); var o = s ? JSON.parse(s) : null; return (o && o.ans) || {}; } catch (e) { return {}; }
  }
  /* 숨은 iframe 으로 과목 자료 하나를 읽는다 — 이 화면의 TREE·QBANK 를 건드리지 않는다 */
  function loadSubject(id) {
    return new Promise(function (resolve) {
      var rd = (window.READY || {})[id] || {}, v = rd.v ? "?v=" + rd.v : "";
      var f = D.createElement("iframe"); f.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden"; f.setAttribute("aria-hidden", "true");
      var done = false;
      function fin(r) { if (done) return; done = true; try { f.remove(); } catch (e) {} resolve(r); }
      f.onload = function () {
        try { var w = f.contentWindow; var T = w.TREE, Q = w.QBANK || {}; if (!T) return fin(null); fin({ T: JSON.parse(JSON.stringify(T)), Q: JSON.parse(JSON.stringify(Q)) }); } catch (e) { fin(null); }
      };
      f.srcdoc = '<!doctype html><script src="data/' + id + ".js" + v + '"><\/script>';
      D.body.appendChild(f);
      setTimeout(function () { fin(null); }, 15000);
    });
  }

  function build(name, T, QB, ans) {
    function qs(no) { return QB[String(no)] || []; }
    var ys = {}; Object.keys(QB).forEach(function (k) { QB[k].forEach(function (q) { if (q.y) ys[q.y] = 1; }); });
    var Y = Math.max(1, Object.keys(ys).length);
    function units(nos) { var seen = {}, k = 0; nos.forEach(function (no) { qs(no).forEach(function (q) { if (q.bk) return; var u = (q.e || "") + "|" + q.y + "|" + (q.qn || q.i); if (!seen[u]) { seen[u] = 1; k++; } }); }); return k; }
    function avg(nos) { return Math.round(units(nos) / Y * 10) / 10; }
    function ach(nos) {
      var n = 0, s = 0, c = 0;
      nos.forEach(function (no) { qs(no).forEach(function (q) { n++; var a = ans[q.i]; if (a) { s++; if (a.ok) c++; } }); });
      if (!n) return 0;
      var prog = Math.round(s / n * 100), pct = s ? Math.round(c / s * 100) : 0;
      return Math.round(prog * 0.55 + pct * 0.45 * Math.min(1, s / 10));
    }
    function nodeName(n) { var t = n.name || n.title || String(n.no); return t.length > 30 ? t.replace(/\s*[\(（].*$/, "") : t; }
    var nodes = (T.nodes || []).filter(function (n) { return qs(n.no).length; });
    var chs = T.chs || [], parts = T.parts || [];
    function item(label, nos, kids) {
      var a = avg(nos); if (!nos.length) return null;
      return { id: name + ":" + label, name: label, avg: a, pct: ach(nos), nos: nos, leaves: kids };
    }
    function leafOf(nlist) { return nlist.map(function (n) { return { name: nodeName(n), avg: avg([n.no]), pct: ach([n.no]), nos: [n.no] }; }); }
    var items;
    if (nodes.length && nodes.length <= MAXC) {
      items = nodes.map(function (n) { return item(nodeName(n), [n.no], []); });
    } else if (chs.length && chs.length <= MAXC) {
      items = chs.map(function (c) {
        var ns = (c.nodes || []).map(function (no) { return (T.nodes || []).filter(function (n) { return n.no === no; })[0]; }).filter(function (n) { return n && qs(n.no).length; });
        return item(c.name, ns.map(function (n) { return n.no; }), leafOf(ns));
      });
    } else {
      items = parts.map(function (p) {
        var cs = chs.filter(function (c) { return c.part === p.no; }), nos = [];
        cs.forEach(function (c) { (c.nodes || []).forEach(function (no) { if (qs(no).length) nos.push(no); }); });
        return item(p.name, nos, cs.map(function (c) { var cn = (c.nodes || []).filter(function (no) { return qs(no).length; }); return { name: c.name, avg: avg(cn), pct: ach(cn), nos: cn }; }));
      });
    }
    items = items.filter(Boolean);
    var allNos = []; items.forEach(function (it) { allNos = allNos.concat(it.nos); });
    return { name: name, avg: avg(allNos), pct: ach(allNos), nodes: items };
  }

  var subs = GB.subs().filter(function (k) { return window.CATALOG && CATALOG.ready(k); });
  var cur = GB.T.key || GB.T.subject;
  var jobs = subs.map(function (id) {
    var nm = CATALOG.name(id);
    if (id === cur || id === window.JG_CUR) {
      var QB = {}, QS = window.QBANK || {};
      Object.keys(QS).forEach(function (k) { QB[k] = QS[k]; });
      var ans = {}; Object.keys(QB).forEach(function (k) { QB[k].forEach(function (q) { var a = GB.answered(q.i); if (a) ans[q.i] = a; }); });
      return Promise.resolve({ id: id, g: build(nm, GB.T, QB, ans) });
    }
    return loadSubject(id).then(function (r) {
      if (!r) return { id: id, g: null };
      return { id: id, g: build(nm, r.T, r.Q, readAns(PRE + "." + (r.T.key || r.T.subject) + ".v1")) };
    });
  });

  Promise.all(jobs).then(function (rs) {
    var groups = [], idOf = {};
    rs.forEach(function (r) { if (r.g && r.g.nodes.length) { groups.push(r.g); idOf[r.g.name] = r.id; } });
    if (!groups.length) { host.innerHTML = ""; return; }
    var tr = GB.track ? GB.track() : { name: "" }, dd = GB.dday ? GB.dday() : null;
    function go(n, g) {
      var s = idOf[g.name], pick = null;
      var kids = (n.leaves && n.leaves.length) ? n.leaves : [n];
      kids.forEach(function (l) { if (!l.nos || !l.nos.length) return; if (!pick || l.pct < pick.pct) pick = l; });
      var no = pick ? pick.nos[0] : (n.nos && n.nos[0]);
      if (!no) return;
      location.href = "ox.html?s=" + encodeURIComponent(s) + "&node=" + no;
    }
    TERA_MAP.mount(host, {
      title: tr.name || GB.subject, sub: "합격 지도", dday: dd == null ? "" : (dd > 0 ? "D-" + dd : dd === 0 ? "D-DAY" : "시험 끝"), unit: "문제",
      groups: groups,
      mark: "tier",
      onStart: function (n, g) { go(n, g); },
      onLeaf: function (l, n, g) { go({ leaves: [l], nos: l.nos }, g); }
    });
    /* 등급 방패(칭호·앰블럼) — 옛 스킬트리·홈에 있던 자료 그대로, 합격 지도 아래에 판 한 장 */
    try {
      if (GB.tier && GB.tierOn && GB.tierOn()) {
        var t2 = GB.tier(), SH = ["#B7794B", "#9CA3AF", "#EAB308", "#22D3EE", "#60A5FA"];
        var card = D.createElement("div"); card.className = "tiercard";
        card.innerHTML = '<svg viewBox="0 0 34 38" width="34" height="38"><path d="M17 1 32 6v12c0 9.5-6.4 16.2-15 19C8.4 34.2 2 27.5 2 18V6z" fill="' + SH[t2.rank] + '"/><path d="M17 5 28 9v9c0 7.2-4.6 12.4-11 14.8C10.6 30.4 6 25.2 6 18V9z" fill="rgba(255,255,255,.28)"/></svg>' +
          "<div><b>" + esc(t2.name) + "</b><span>오래 기억한 문장 " + GB.num(t2.held) + "개</span></div>";
        host.parentNode.appendChild(card);
      }
    } catch (e) {}
  });
})();
