/* 합격전략 브리핑 붙이기 (2026-10-20) — 엔진 js/zzstrat.js(허브 공용 복사본) + 데이터 js/strat/jagyeok_<시험>[_<급수>].js
   MJSTRAT.auto()       학생 시험의 브리핑을 처음 한 번 튜토리얼로 띄운다(본 뒤에는 안 뜬다)
   MJSTRAT.button(요소)  그 자리에 「합격전략」 다시 보기 버튼을 넣는다 */
(function () {
  "use strict";
  var V = "1021a", 읽음 = {};
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
    auto: function () { 준비(function (k) { ZZSTRAT.auto(k, { fab: false }); }); },
    button: function (el) { 준비(function (k) { if (el && !el.querySelector(".zs-btn")) ZZSTRAT.button(k, el); }); }
  };
})();
