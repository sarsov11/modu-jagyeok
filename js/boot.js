/* 지금 공부하는 과목의 자료(data/<id>.js)를 싣는다 — 화면마다 store.js 앞에 둔다.
   catalog.js · data/ready.js 가 먼저 실려 있어야 한다.
   고른 과목이 아직 준비 중이면, 그 학생 과목 중 준비된 첫 과목 → 그것도 없으면 준비된 아무 과목. */
(function () {
  "use strict";
  var P = {};
  try { P = JSON.parse(localStorage.getItem("mj.pref.v1") || "{}"); } catch (e) {}
  var R = window.READY || {};
  var want = new URLSearchParams(location.search).get("s");
  var cur = want && R[want] ? want : P.cur;
  if (!R[cur]) cur = (P.subs || []).filter(function (s) { return R[s]; })[0] || Object.keys(R)[0];
  if (want && R[want] && P.cur !== want) {
    P.cur = want;
    try { localStorage.setItem("mj.pref.v1", JSON.stringify(P)); } catch (e) {}
  }
  window.JG_CUR = cur;
  if (cur) document.write('<script src="data/' + cur + '.js?v=' + (R[cur].v || "") + '"><\/script>');
  /* 스킬트리 3단 정리(data/st/<id>.js → window.STREE_DEF). 아래 줄은 공용 stree\싣기.js 가 고쳐 쓴다 */
  var STREED = {"ac_acct":"743953","ac_econ":"118f92","ac_law":"e864a0","ac_math":"654eb2","ad_admin":"a7d4b5","ad_civil":"dd69a0","ad_pubad":"a7ddf1","fm_hazmat":"50946e","fm_hydro":"51bdd7","fm_law":"978f7d","fm_system":"0bd0eb","fm_theory":"61d471","fr_biz":"d8b9b5","fr_civil":"7f3fdf","fr_econ":"da5f0c","hm_acct":"272a4e","hm_build":"d8cd26","hm_law":"984df3","ia_agrireg":"60bca4","ia_crop":"5323f0","ia_law":"08182d","jk_ca":"b341e1","jk_fa":"67873a","jk_tax":"8306ae","js_ca":"dc15c6","js_fa":"732d74","js_jn":"67d7cb","js_tax":"03b904","lg_intl":"8a5c20","lg_law":"8e7523","lg_logi":"99d642","lg_storage":"5911c9","lg_transport":"5baa14","mg_acct":"4fe6a6","mg_diag":"a57762","mg_law":"3c378e","mg_mgmt":"de4559","mg_survey":"58d5ef","pt_civil":"c692a4","pt_iplaw":"a74795","pt_natsci":"64920a","sa_gen":"2c4f3a","sa_mgmt":"745661","sg_civ":"970cc2","sg_law":"1d96ab","sw_admin":"fa76ed","sw_community":"021dd7","sw_human":"08a410","sw_law":"25f094","sw_policy":"b08e50","sw_practice":"e983ed","sw_research":"8e9f69","sw_skill":"5d23e0","sa_law":"752134","yc_abnormal2":"e4bbce","yc_academic":"701655","yc_assess2":"66c0e5","yc_assess3":"6adab8","yc_career":"38f1e5","yc_counseltheory":"685c51","yc_crisiscounsel":"70a3d8","yc_delinquency":"1a1479","yc_devpsych":"25de02","yc_drugcounsel":"3d7532","yc_family":"3926d7","yc_group2":"572524","yc_group3":"9ff268","yc_lawadmin":"25809b","yc_learning":"c883d4","yc_research1":"3017a3","yc_research2":"b6e1c0","yc_sexcounsel":"c99f95","yc_supervision":"a9d430","yc_theory2":"5b3f7d","yc_youthactivity":"a2b2c7","yc_youthunderstand":"4d29e4"};
  if (cur && STREED[cur]) document.write('<script src="data/st/' + cur + '.js?v=' + STREED[cur] + '"><\/script>');
  /* 개념카드(2026-10-09) — card_ready.js 에 있는 과목이면 card_<키>.js 를 싣는다. 없으면 「쟁점 요점」(맞는 기출 문장)으로 남는다 */
  if (cur) document.write('<script src="data/card_ready.js?t=' + Math.floor(Date.now() / 3600000) + '"><\/script>' +
    '<script src="js/cardload.js"><\/script>');
})();
