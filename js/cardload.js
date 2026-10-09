/* 개념카드 싣기(2026-10-09) — boot.js 가 card_ready.js 다음에 부른다. 지금 과목(JG_CUR)의 카드가 있으면 card_<키>.js */
(function () {
  var k = window.JG_CUR, R = window.CARD_READY || {};
  if (k && R[k]) document.write('<script src="data/card_' + k + '.js?v=' + R[k] + '"><\/script>');
})();
