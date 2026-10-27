/* ═══ 넘겨 보는 스킬트리 — 공용 엔진(2026-10-25) ═══
   대단원 한 장씩 옆으로 넘긴다. 장 안은 줄기 하나에 중단원 원(성취 고리), 원 아래 소주제 잎.
   앱마다 자기 자료를 아래 모양으로 바꿔 STREE.mount 에 넘기면 된다(전문직·공시·자격 엔진은 skilltree.html 의 「stree 어댑터」).

   STREE.mount(host, {
     title, sub, key,                         // key = 모양·마지막 장 기억용(localStorage)
     groups: [{ name, color, avg(null 이면 안 씀), pct, nodes: [{
       id, name, avg, pct, state: "none|wip|done|empty", badge, heat(0~3), meta(원 아래 한 줄을 직접 줄 때),
       leaves: [{ name, avg, pct, state }] }] }],
     onNode(node, group), onLeaf(leaf, node, group),
     start                                     // 처음 펼 장 번호(없으면 기억한 장)
   })
   avg = 해마다 몇 문제, pct = 성취도 0~100. */
(function () {
  "use strict";
  var PAL = ["#2563EB", "#10B981", "#8B5CF6", "#F97316", "#EC4899", "#06B6D4", "#84CC16", "#E11D48", "#6366F1"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function cv(k) { try { return getComputedStyle(document.documentElement).getPropertyValue(k).trim(); } catch (e) { return ""; } }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function num(x) { x = Math.round((x || 0) * 10) / 10; return (x % 1 ? x.toFixed(1) : String(x)); }

  function mount(host, o) {
    var K = "stree." + (o.key || "x");
    var look = store(K + ".look") || o.look || "stem";
    var G = o.groups || [];
    G.forEach(function (g, i) { g.color = g.color || cv("--pt" + (i % 6 + 1)) || PAL[i % PAL.length]; });

    function nodeHtml(n, gi, ni) {
      var cls = "st-node st-" + (n.state || "none");
      var pct = Math.max(0, Math.min(100, Math.round(n.pct || 0)));
      var heat = "";
      if (n.heat != null) { heat = '<span class="st-heat" title="출제 빈도">'; for (var h = 0; h < 3; h++) heat += '<i class="' + (h < n.heat ? "on" : "") + '"></i>'; heat += "</span>"; }
      var meta = n.meta != null ? n.meta : n.state === "empty" ? "기출 준비 중" : ("해마다 약 " + num(n.avg) + "문제" + (n.state === "none" ? "" : " · " + pct + "%"));
      var leaves = (n.leaves || []).map(function (l, li) {
        var lp = Math.max(0, Math.min(100, Math.round(l.pct || 0)));
        return '<li><button class="st-leaf st-' + (l.state || "none") + '" style="--p:' + lp + '" data-g="' + gi + '" data-n="' + ni + '" data-l="' + li + '" title="' + esc(l.name) + '">' +
          '<i></i><span class="tx">' + esc(l.name) + '</span>' + (l.avg ? '<em>' + num(l.avg) + '문제</em>' : "") + '</button></li>';
      }).join("");
      return '<li class="' + cls + '">' +
        '<button class="st-nb" data-g="' + gi + '" data-n="' + ni + '" aria-label="' + esc(n.name) + ' 열기">' +
          '<span class="st-orb" style="--p:' + (n.state === "done" ? 100 : pct) + '"><span>' + (n.state === "done" ? "★" : n.state === "empty" ? "–" : n.state === "none" ? (ni + 1) : pct + '<small>%</small>') +'</span></span>' +
          '<span class="st-nt"><b>' + esc(n.name) + (n.badge ? '<span class="st-badge">' + esc(n.badge) + '</span>' : "") + heat + '</b><small>' + meta + '</small></span>' +
        '</button>' + (leaves ? '<ul class="st-leaves">' + leaves + '</ul>' : "") + '</li>';
    }
    function pageHtml(g, gi) {
      var pct = Math.round(g.pct || 0);
      return '<section class="st-page" style="--c:' + g.color + '" data-g="' + gi + '" aria-label="' + esc(g.name) + '">' +
        '<header class="st-head"><span class="no">' + String(gi + 1).padStart(2, "0") + ' / ' + String(G.length).padStart(2, "0") + '</span>' +
          '<h3>' + esc(g.name) + '</h3>' +
          '<div class="meta">' + (g.avg == null ? "" : '<span>해마다 약 <b>' + num(g.avg) + '</b>문제</span>') + '<span>중단원 <b>' + g.nodes.length + '</b></span><span>성취 <b>' + pct + '</b>%</span></div>' +
          '<div class="st-bar"><s style="width:' + pct + '%"></s></div></header>' +
        '<ol class="st-trunk">' + g.nodes.map(function (n, ni) { return nodeHtml(n, gi, ni); }).join("") + '</ol></section>';
    }
    host.innerHTML =
      '<div class="st" data-look="' + look + '">' +
        '<div class="st-top"><div>' + (o.title ? '<h2>' + esc(o.title) + '</h2>' : "") + (o.sub ? '<p>' + esc(o.sub) + '</p>' : "") + '</div>' +
          '<div class="st-look" role="group" aria-label="모양"><button data-look="stem">줄기</button><button data-look="board">보드</button></div></div>' +
        '<nav class="st-map" aria-label="대단원">' + G.map(function (g, gi) {
          return '<button class="st-tab" style="--c:' + g.color + '" data-go="' + gi + '"><span class="tn"><i></i>' + String(gi + 1).padStart(2, "0") + '</span>' +
            '<b>' + esc(g.name) + '</b><span class="tb"><s style="width:' + Math.round(g.pct || 0) + '%"></s></span></button>';
        }).join("") + '</nav>' +
        '<div class="st-viewport"><div class="st-track" tabindex="0" aria-label="대단원 넘기기">' + G.map(pageHtml).join("") + '</div></div>' +
        '<div class="st-nav"><button class="st-arrow" data-step="-1" aria-label="앞 장">‹</button>' +
          '<span class="st-dots">' + G.map(function (g, gi) { return '<button data-go="' + gi + '" aria-label="' + esc(g.name) + '"></button>'; }).join("") + '</span>' +
          '<span class="st-count"></span>' +
          '<button class="st-arrow" data-step="1" aria-label="다음 장">›</button></div>' +
        '<p class="st-hint">옆으로 넘기면 다음 대단원 · 원을 누르면 중단원, 잎을 누르면 소주제</p>' +
      '</div>';

    var root = host.firstChild, track = root.querySelector(".st-track"), pages = [].slice.call(root.querySelectorAll(".st-page"));
    var map = root.querySelector(".st-map"), cur = -1;

    function setLook(v) {
      look = v; root.dataset.look = v; store(K + ".look", v);
      [].forEach.call(root.querySelectorAll(".st-look button"), function (b) { b.setAttribute("aria-pressed", b.dataset.look === v); });
    }
    setLook(look);
    root.querySelector(".st-look").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setLook(b.dataset.look); });

    function idxNow() {
      var x = track.scrollLeft, best = 0, bd = 1e9;
      pages.forEach(function (p, i) { var d = Math.abs(p.offsetLeft - track.offsetLeft - x); if (d < bd) { bd = d; best = i; } });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) {   /* 끝까지 넘겼으면 마지막 장 */
        var vis = pages.filter(function (p) { return p.offsetLeft - track.offsetLeft >= x - 4; });
        if (vis.length && best < pages.length - 1 && vis.length * (pages[0].offsetWidth + 10) <= track.clientWidth + 20) best = Math.max(best, pages.indexOf(vis[0]));
      }
      return best;
    }
    function mark(i) {
      if (i === cur) return; cur = i; store(K + ".page", i);
      [].forEach.call(map.children, function (t, k) { t.setAttribute("aria-current", k === i); });
      [].forEach.call(root.querySelectorAll(".st-dots button"), function (t, k) { t.setAttribute("aria-current", k === i); });
      root.querySelector(".st-count").textContent = (i + 1) + " / " + G.length;
      var tab = map.children[i];
      if (tab) { var l = tab.offsetLeft - map.offsetLeft, r = l + tab.offsetWidth;
        if (l < map.scrollLeft || r > map.scrollLeft + map.clientWidth) map.scrollTo({ left: l - 8, behavior: "smooth" }); }
      edges();
    }
    function edges() {
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      root.querySelector('[data-step="-1"]').disabled = track.scrollLeft < 4;
      root.querySelector('[data-step="1"]').disabled = atEnd;
      root.querySelector(".st-viewport").style.setProperty("--st-more", atEnd ? 0 : 1);
    }
    function go(i, smooth) {
      i = Math.max(0, Math.min(pages.length - 1, i));
      var left = pages[i].offsetLeft - track.offsetLeft;
      if (smooth === false) { var sb = track.style.scrollBehavior; track.style.scrollBehavior = "auto"; track.scrollLeft = left; track.style.scrollBehavior = sb; }
      else track.scrollTo({ left: left, behavior: "smooth" });
      mark(i);
      /* 긴 장을 내려 보다가 짧은 장으로 넘기면 빈 곳에 서 있게 된다 — 판 머리가 화면 위로 넘어갔으면 끌어올린다 */
      var top = root.getBoundingClientRect().top;
      if (top < -40) window.scrollBy({ top: top - 8, behavior: "smooth" });
    }
    var sT = null;
    track.addEventListener("scroll", function () { clearTimeout(sT); sT = setTimeout(function () { mark(idxNow()); }, 60); edges(); }, { passive: true });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-go]"); if (b) { go(+b.dataset.go); return; }
      var s = e.target.closest("[data-step]"); if (s) { go((cur < 0 ? 0 : cur) + (+s.dataset.step)); return; }
    });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); }
    });

    /* PC: 마우스로 끌어 넘기기. 조금이라도 끌었으면 그 뒤 클릭은 먹는다(원이 열리지 않게) */
    var dn = null, moved = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dn = { x: e.clientX, l: track.scrollLeft }; moved = false;
    });
    window.addEventListener("pointermove", function (e) {
      if (!dn) return;
      var dx = e.clientX - dn.x;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add("drag"); }
      if (moved) track.scrollLeft = dn.l - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!dn) return;
      var wasMoved = moved; dn = null; track.classList.remove("drag");
      if (wasMoved) { var dir = track.scrollLeft > (pages[cur] ? pages[cur].offsetLeft - track.offsetLeft : 0) ? 1 : -1;
        var i = idxNow(); go(i, true); setTimeout(function () { moved = false; }, 0); void dir; }
    });
    track.addEventListener("click", function (e) {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; return; }
      var lf = e.target.closest(".st-leaf"), nb = e.target.closest(".st-nb");
      var el = lf || nb; if (!el) return;
      var g = G[+el.dataset.g], n = g && g.nodes[+el.dataset.n];
      if (!n) return;
      if (lf && o.onLeaf) o.onLeaf(n.leaves[+lf.dataset.l], n, g);
      else if (o.onNode) o.onNode(n, g);
    }, true);

    var start = o.start != null ? o.start : +(store(K + ".page") || 0);
    if (!(start >= 0 && start < pages.length)) start = 0;
    requestAnimationFrame(function () { go(start, false); edges(); });
    window.addEventListener("resize", function () { if (cur >= 0) go(cur, false); });
    return { go: go, root: root };
  }
  window.STREE = { mount: mount };
})();
