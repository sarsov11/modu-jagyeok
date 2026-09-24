/* ═══════════════════════════════════════════════════════════
   모두의 자격 — 시험 · 과목 목록 (2026-09-24, 진격의 공시 엔진 재사용)

   기출: 큐넷 전문자격 공개 문제·최종정답(공공누리 1유형, 출처 표시). 수집·검증·단원 배정은
   Desktop\테라러닝_허브\수집\전문자격 + cloud-work jobs/terra-apps (시험마다 claude/terra-jg-NN).
   ★ 2027년 시험일은 공고 전 — 모두 「예상」. 학생이 설정에서 바꿀 수 있다.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var SUBJECTS = {
    hm_acct:      { name: "회계원리" },
    hm_build:     { name: "공동주택시설개론" },
    hm_law:       { name: "민법" },
    lg_logi:      { name: "물류관리론" },
    lg_transport: { name: "화물운송론" },
    lg_intl:      { name: "국제물류론" },
    lg_storage:   { name: "보관하역론" },
    lg_law:       { name: "물류관련법규" },
    ad_civil:     { name: "민법총칙" },
    ad_admin:     { name: "행정법" },
    ad_pubad:     { name: "행정학개론" },
    ia_law:       { name: "상법(보험편)" },
    ia_agrireg:   { name: "농어업재해보험법령" },
    ia_crop:      { name: "재배학·원예작물학" },
    sg_law:       { name: "법학개론" },
    sg_civ:       { name: "민간경비론" },
    sw_human:     { name: "인간행동과 사회환경" },
    sw_research:  { name: "사회복지조사론" },
    sw_practice:  { name: "사회복지실천론" },
    sw_skill:     { name: "사회복지실천기술론" },
    sw_community: { name: "지역사회복지론" },
    sw_policy:    { name: "사회복지정책론" },
    sw_admin:     { name: "사회복지행정론" },
    sw_law:       { name: "사회복지법제론" }
  };

  /* 시험 — 날짜는 예상 */
  var EXAMS = [
    { id: "housing", name: "주택관리사보", sub: "1차", date: "2027-07-17", subs: ["hm_acct", "hm_build", "hm_law"] },
    { id: "logi",    name: "물류관리사",   sub: "필기", date: "2027-07-24", subs: ["lg_logi", "lg_transport", "lg_intl", "lg_storage", "lg_law"] },
    { id: "ad",      name: "행정사",       sub: "1차", date: "2027-05-29", subs: ["ad_civil", "ad_admin", "ad_pubad"] },
    { id: "damage",  name: "손해평가사",   sub: "1차", date: "2027-06-12", subs: ["ia_law", "ia_agrireg", "ia_crop"] },
    { id: "sg",      name: "경비지도사",   sub: "1차", date: "2026-11-07", subs: ["sg_law", "sg_civ"] },
    { id: "social1", name: "사회복지사",   sub: "1급", date: "2027-01-16",
      subs: ["sw_human", "sw_research", "sw_practice", "sw_skill", "sw_community", "sw_policy", "sw_admin", "sw_law"] }
  ];

  function exam(id) { return EXAMS.filter(function (e) { return e.id === id; })[0] || null; }
  function series(examId, sid) {
    var e = exam(examId); if (!e || !e.series) return null;
    return e.series.filter(function (s) { return s.id === sid; })[0] || null;
  }
  /* 이 학생이 보는 과목들 — 시험·직렬에서 정해진다 */
  function subsOf(examId, sid) {
    var e = exam(examId); if (!e) return [];
    if (!e.series) return e.subs.slice();
    var s = series(examId, sid); return s ? s.subs.slice() : [];
  }
  function ready(id) { return !!(window.READY && window.READY[id]); }
  function count(id) { return (window.READY && window.READY[id] && window.READY[id].n) || 0; }

  window.CATALOG = { SUBJECTS: SUBJECTS, EXAMS: EXAMS, exam: exam, series: series, subsOf: subsOf,
                     ready: ready, count: count,
                     name: function (id) { return (SUBJECTS[id] || { name: id }).name; } };
})();
