/* 합격 전략 붙이기 (2026-10-20) — 엔진 js/zzstrat.js(허브 공용 복사본) + 데이터 js/strat/jagyeok_<시험>[_<급수>].js
   MJSTRAT.auto()       학생 시험의 브리핑을 처음 한 번 튜토리얼로 띄운다(본 뒤에는 안 뜬다)
   MJSTRAT.button(요소)  그 자리에 「합격 전략」 다시 보기 버튼을 넣는다 */
(function () {
  "use strict";
  var V = "1025a", 읽음 = {};
  function id() {
    try {
      var p = JSON.parse(localStorage.getItem("mj.pref.v1") || "{}");
      return p.exam ? "jagyeok_" + p.exam + (p.series ? "_" + p.series : "") : null;
    } catch (e) { return null; }
  }
  function 싣기(src, cb) {
    if (읽음[src] === 1) return cb();
    var s = document.createElement("script"); s.src = src + "?v=" + V;
    s.onload = function () { 읽음[src] = 1; cb(); };
    document.head.appendChild(s);
  }
  function 준비(cb) {
    var k = id(); if (!k) return;
    싣기("js/zzstrat.js", function () { 싣기("js/strat/" + k + ".js", function () { if (window.ZZSTRAT && ZZSTRAT.data[k]) cb(k); }); });
  }
  window.MJSTRAT = {
    id: id,
    open: function () { 준비(function (k) { ZZSTRAT.open(k); }); },
    auto: function () { 준비(function (k) { ZZSTRAT.auto(k, { fab: false }); }); },
    button: function (el) { 준비(function (k) { if (el && !el.querySelector(".zs-btn")) ZZSTRAT.button(k, el); }); }
  };
})();

/* 한 화면 규칙(화면표준 14절) — 합격 전략 창(zzstrat.js)은 열린 Shadow DOM 안이라 앱 css 가 안 닿는다.
   공용 엔진 파일은 그대로 두고, 창이 열릴 때 그 안에 덮개 style 하나를 넣어 흰 바탕 · 포인트 색 · 회색으로 맞춘다. */
(function () {
  "use strict";
  var cs = getComputedStyle(document.documentElement);
  function v(n, d) { return (cs.getPropertyValue(n) || "").trim() || d; }
  var P = v("--cta", "#0F766E"), PI = v("--cta-2", "#0B5F59");
  var PS = "color-mix(in srgb," + P + " 10%,#fff)", PM = "color-mix(in srgb," + P + " 55%,#fff)", PL = "color-mix(in srgb," + P + " 18%,#fff)";
  var 덮개 = [
    "#zs,#zst,#zsy{--zs-bg:#FFFFFF;--zs-card:#FFFFFF;--zs-line:#E6E8EC;--zs-red:" + P + ";--zs-blue:" + PM + ";--zs-gold:#7C818C;--zs-soft:#F1F3F6;--zs-tx:#111419;--zs-sub:#5F6670}",
    "#zs .top .t{letter-spacing:0;font-size:13px}#zs .top button{border-radius:12px}",
    "#zs section{border-radius:18px;box-shadow:none}",
    "#zs .chip{border-radius:999px;background:#F1F3F6;color:#333941}#zs .chip.r{background:" + PS + ";color:" + PI + "}",
    "#zs .pk{border:1px solid #E6E8EC;border-radius:14px;background:#FFFFFF}#zs .pk.on{border-color:" + P + ";background:" + PS + ";box-shadow:none}",
    "#zs .tg{border-radius:999px;font-size:11.5px}#zs .tg.a{background:" + P + ";color:#fff}#zs .tg.l{background:" + PL + ";color:" + PI + ";border:0}#zs .tg.g{background:#F1F3F6;color:#5F6670;border:0}",
    "#zs .sc,#zs .sc.s,#zs .sc.d{border:1px solid #E6E8EC;border-radius:14px}#zs .sc.on{background:#FFFFFF}#zs .sc .rb{border-radius:999px}",
    "#zs .sc.s .rb,#zs .sc.s .bar b{background:" + P + "}#zs .sc.d .rb,#zs .sc.d .bar b{background:" + PM + "}#zs .sc.b .bar b{background:#B4BAC3}",
    "#zs .det{border-radius:14px}#zs .vl i{background:" + P + ";border-radius:50%}",
    "#zs .gauge .fl{background:" + PL + "}#zs .stack i.s{background:" + P + "}#zs .stack i.d{background:" + PM + "}#zs .stack i.b{background:#B4BAC3}",
    "#zs .gp b{background:" + P + ";border-radius:12px}#zs .gp::after{background:" + P + "}#zs .gb .gline b{border-radius:12px}",
    "#zs .gc .cd{border:1px solid #E6E8EC;border-radius:14px}",
    "#zs .gc .cd:nth-child(1){--c:" + P + "!important}#zs .gc .cd:nth-child(2){--c:" + PM + "!important}#zs .gc .cd:nth-child(3){--c:" + PL + "!important}#zs .gc .cd:nth-child(n+4){--c:#9CA3AF!important}",
    "#zs .gc .cg{border-radius:999px}#zs .hit{border-radius:14px}",
    "#zs .q li.a::before{background:" + P + ";border-color:" + P + "}#zs .q .st.f{color:" + PI + ";border-color:" + PI + "}#zs .q{border-radius:14px}",
    "#zs .go{background:" + P + ";border-radius:12px}#zst .nx{background:" + P + ";border-radius:12px}#zst .hole{border-radius:14px}#zst .bub{border-radius:18px}",
    "#zsy .nx{background:" + P + "}#zsy .pg i{background:" + P + "}#zsy .pk{border:1px solid #E6E8EC}#zsy .pk.on{border-color:" + P + ";box-shadow:none}",
    "#zsy .end button{border:1px solid " + P + ";color:" + PI + "}#zsy .end .main{background:" + P + ";color:#fff}"
  ].join("\n");
  function 글(root) { var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false), n; while ((n = w.nextNode())) { if (n.nodeValue.indexOf("합격전략") >= 0) n.nodeValue = n.nodeValue.replace(/합격전략/g, "합격 전략"); } }
  function 말() {
    var h = document.getElementById("zs-host");
    if (h && h.shadowRoot) {
      if (!h.shadowRoot.getElementById("zs-ov")) { var st = document.createElement("style"); st.id = "zs-ov"; st.textContent = 덮개; h.shadowRoot.appendChild(st); }
      글(h.shadowRoot);
    }
  }
  new MutationObserver(말).observe(document.documentElement, { childList: true, subtree: true }); 말();
})();
