/* ═══════════════════════════════════════════════════════════
   모두의 자격 — 자료층 (2026-09-23)

   화면은 이 파일만 부른다. data.js 는 파이프라인 산출물(앱자료.py)이라 손으로 고치지 않는다.
   학습 기록은 이 브라우저에만 쌓인다 — localStorage `mj.행정법.v1` · 설정 `mj.pref.v1` · 스킨 `mj.skin`.

   모두의 통사(0918~0922)에서 굳은 것을 그대로 옮겼다 —
     · 학생에게 고르게 하지 않는다. 홈은 「오늘 할 것」 하나.
     · 분량은 문항 수가 아니라 **시간**으로 말한다(하루 10·15·20·30분).
     · 판정은 확신도 × 정오답(judge.js). 확신도는 답보다 먼저 묻는다.
     · 되돌리기(간격 복습)가 새 문장보다 먼저다.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var T = window.TREE, QB = window.QBANK || {}, PR = window.PAIRS || [];
  if (!T) { console.error("data.js 가 먼저 실려야 한다"); return; }

  var KEY = "mj." + (T.key || T.subject) + ".v1", PREF = "mj.pref.v1", SKIN = "mj.skin";

  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var S = read(KEY, null) || {};
  S.ans = S.ans || {}; S.days = S.days || {}; S.pairs = S.pairs || {};
  var P = read(PREF, null) || {};
  function save() { S.at = Date.now(); write(KEY, S); }
  function savePref() { write(PREF, P); }

  /* ── 날짜 — 하루는 기기 시각 자정 기준 ── */
  function ymd(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function dayNo(s) { var d = s ? new Date(s + "T00:00:00") : new Date(); d.setHours(0, 0, 0, 0); return Math.round(d / 86400000); }
  var TODAY = ymd(), TODAYN = dayNo();

  /* ── 색인 ── */
  var NODE = {}, CH = {}, PART = {}, ITEM = {};
  T.nodes.forEach(function (n) {
    NODE[n.no] = n;
    n.chkey = n.part + "-" + (n.ch < 10 ? "0" + n.ch : n.ch);
  });
  T.chs.forEach(function (c) { CH[c.key] = c; });
  T.parts.forEach(function (p) { PART[p.no] = p; });
  Object.keys(QB).forEach(function (no) {
    QB[no].forEach(function (q) { q.n = +no; ITEM[q.i] = q; });
  });
  PR.forEach(function (p, i) { p.id = "P" + i; });
  var PR_BY = {};
  PR.forEach(function (p) { (PR_BY[p.n] = PR_BY[p.n] || []).push(p); });

  function qs(no) { return QB[String(no)] || []; }
  function item(id) { return ITEM[id]; }
  function pairs(no) { return no == null ? PR : (PR_BY[no] || []); }
  function pair(id) { return PR[+String(id).slice(1)]; }

  /* ── 시험·직렬·과목 ──
     시험 목록은 catalog.js. 학생 설정 — P.exam(시험 id) · P.series(9급 직렬 id) · P.subs(과목 id 들) · P.cur(지금 과목).
     ★ 2027년 시험일은 공고 전이라 「예상」. 학생이 바꾸면 「직접」. */
  var C = window.CATALOG;
  function exam() { return (C && C.exam(P.exam)) || (C && C.EXAMS[0]) || { id: "", name: "", date: "2027-04-03" }; }
  function setExam(id, sid) {
    P.exam = id; P.series = sid || null;
    P.subs = C ? C.subsOf(id, sid) : [];
    if (!P.goalMine) P.goal = exam().date;
    savePref();
  }
  function subs() { return (P.subs && P.subs.length) ? P.subs.slice() : [T.key || "admin"]; }
  function cur() { return window.JG_CUR || T.key; }
  function setCur(id) { P.cur = id; savePref(); }
  function seriesName() { var s = C && C.series(P.exam, P.series); return s ? s.name : ""; }
  /* 옛 이름 호환 — 화면 몇 곳이 track() 을 부른다 */
  function track() { var e = exam(); return { id: e.id, name: e.name + (seriesName() ? " " + seriesName() : ""), exam: e.name, date: e.date }; }
  function setTrack(id) { setExam(id, P.series); }
  function goal() { return P.goal || exam().date; }
  function goalMark() { return P.goalMine ? "직접" : "예상"; }
  function setGoal(d, mine) { P.goal = d || null; P.goalMine = !!mine; savePref(); }
  function dday() { return dayNo(goal()) - TODAYN; }

  function minutes() { return P.minutes || 15; }
  function setMinutes(m) { P.minutes = m; savePref(); delete S.today; save(); }
  function name() { return P.name || ""; }
  function setName(v) { P.name = String(v || "").trim().slice(0, 12); savePref(); }
  function onboarded() { return !!P.onboarded; }
  function setOnboarded() { P.onboarded = ymd(); savePref(); }

  /* ── 기록 · 간격 복습 ──
     상자 0~5, 다음에 볼 날까지 [0,1,3,7,14,30]일.
     확실+정답은 한 칸 올리고, 반반·찍음 정답은 1칸에 두고, 틀리면 0칸(오늘 다시). */
  var GAP = [0, 1, 3, 7, 14, 30];
  function answer(id, ok, x) {
    x = x || {};
    var a = S.ans[id] || { n: 0, box: 0 };
    a.n = (a.n || 0) + 1;
    a.ok = !!ok; a.at = Date.now(); a.conf = x.conf || null; a.ms = x.ms || 0;
    if (ok) a.box = x.conf === "sure" ? Math.min(5, (a.box || 0) + 1) : Math.max(1, Math.min(a.box || 0, 1));
    else a.box = 0;
    a.due = TODAYN + GAP[a.box];
    if (x.kind) a.kind = x.kind;
    S.ans[id] = a;
    var d = S.days[TODAY] || (S.days[TODAY] = { n: 0, ok: 0, ms: 0 });
    d.n++; if (ok) d.ok++; d.ms += Math.min(x.ms || 0, 60000);
    save();
    return a;
  }
  function pairAnswer(pid, ok) {
    S.pairs[pid] = { ok: !!ok, at: Date.now() };
    var d = S.days[TODAY] || (S.days[TODAY] = { n: 0, ok: 0, ms: 0 });
    d.n++; if (ok) d.ok++;
    save();
  }
  function answered(id) { return S.ans[id] || null; }
  function reset() { S = { ans: {}, days: {}, pairs: {} }; save(); }

  /* ── 성취 — 옛 판(모두의 통사)과 같은 식: 얼마나 풀었나 55 + 얼마나 맞았나 45 ── */
  function nodeStat(no) {
    var list = qs(no), solved = 0, correct = 0, last = null;
    for (var i = 0; i < list.length; i++) {
      var a = S.ans[list[i].i];
      if (a) { solved++; if (a.ok) correct++; if (!last || a.at > last) last = a.at; }
    }
    var n = list.length;
    var pct = solved ? Math.round(correct / solved * 100) : null;
    var prog = n ? Math.round(solved / n * 100) : 0;
    /* ★ 맞힌 비율은 열 문장을 풀 때까지 무게를 덜 준다 — 옛 식은 한 문장 맞히면 성취도 46% 가 됐다(2026-09-23 화면 확인) */
    var achieve = n ? Math.round(prog * 0.55 + (pct === null ? 0 : pct) * 0.45 * Math.min(1, solved / 10)) : 0;
    return { no: no, n: n, solved: solved, correct: correct, pct: pct, prog: prog, achieve: achieve, lastAt: last,
             mastery: solved ? correct / solved : null,
             state: !n ? "empty" : achieve >= 80 ? "done" : solved ? "wip" : "none" };
  }
  function agg(nos) {
    var n = 0, solved = 0, correct = 0, ach = 0, cnt = 0, last = null, vol = 0;
    nos.forEach(function (no) {
      var st = nodeStat(no), nd = NODE[no];
      n += st.n; solved += st.solved; correct += st.correct; ach += st.achieve; cnt++; vol += (nd ? nd.vol : 0);
      if (st.lastAt && (!last || st.lastAt > last)) last = st.lastAt;
    });
    return { n: n, solved: solved, correct: correct, nodes: cnt, vol: vol,
             pct: solved ? Math.round(correct / solved * 100) : null,
             prog: n ? Math.round(solved / n * 100) : 0, achieve: cnt ? Math.round(ach / cnt) : 0, lastAt: last };
  }
  function chStat(key) { return agg((CH[key] || { nodes: [] }).nodes); }
  function partNodes(no) {
    var acc = [];
    (PART[no] || { chs: [] }).chs.forEach(function (k) { acc = acc.concat(CH[k].nodes); });
    return acc;
  }
  function partStat(no) { return agg(partNodes(no)); }
  function overall() {
    var o = agg(T.nodes.map(function (n) { return n.no; }));
    o.done = T.nodes.filter(function (n) { return nodeStat(n.no).state === "done"; }).length;
    o.started = T.nodes.filter(function (n) { return nodeStat(n.no).solved > 0; }).length;
    o.total = T.nodes.length;
    return o;
  }

  /* ── 문장 고르기 ──
     같은 쟁점이면 **내 직렬 기출 → 최근 연도 → 배정이 확실한 것** 순으로 먼저 낸다. */
  function rank(q) {
    var s = 0;
    if (q.e === exam().name) s += 4;
    s += Math.max(0, (q.y || 2015) - 2015) * 0.3;
    if (q.c === "A") s += 1;
    return s;
  }
  function freshOf(no, k) {
    return qs(no).filter(function (q) { return !S.ans[q.i]; })
      .sort(function (a, b) { return rank(b) - rank(a); }).slice(0, k);
  }
  /* 오늘 볼 복습 — 기한이 된 것. 틀린 것(0칸)이 먼저 */
  function dueList() {
    return Object.keys(S.ans).filter(function (id) {
      var a = S.ans[id]; return ITEM[id] && a.due != null && a.due <= TODAYN && !(a.at && ymd(new Date(a.at)) === TODAY && a.ok);
    }).sort(function (a, b) { return (S.ans[a].box - S.ans[b].box) || (S.ans[a].at - S.ans[b].at); });
  }
  function wrongList() {
    return Object.keys(S.ans).filter(function (id) { return ITEM[id] && !S.ans[id].ok; })
      .sort(function (a, b) { return S.ans[b].at - S.ans[a].at; });
  }

  /* 오늘 파고들 쟁점 — 기출이 많고(q) 아직 덜 된 곳. 배치 시험에서 틀린 편에 무게를 더 준다 */
  function focusNodes(k) {
    var weakPart = (S.place && S.place.weakPart) || null;
    return T.nodes.filter(function (n) { return n.q > 0 && freshOf(n.no, 1).length; })
      .map(function (n) {
        var st = nodeStat(n.no), left = 1 - st.prog / 100;
        var w = Math.sqrt(n.q) * (0.35 + left) * (st.mastery != null && st.mastery < 0.6 ? 1.4 : 1)
              * (weakPart && n.part === weakPart ? 1.3 : 1) * (st.solved && st.prog < 100 ? 1.25 : 1);
        return { n: n, w: w };
      })
      .sort(function (a, b) { return b.w - a.w; }).slice(0, k || 3).map(function (x) { return x.n; });
  }

  /* ── 오늘 할 것 ──
     ★ 분량은 시간이다. 한 문장 O·X 는 확신도 + 답 + 판정 읽기로 20초쯤 걸린다고 어림한다
       (실측 전 어림값 — 화면에도 '약'을 붙인다). 15분 → 45문장.
     ★ 하루에 한 번 정하고 저장한다. 새로고침마다 바뀌면 학생이 끝을 못 본다. */
  var SEC_PER = 20, SEC_MC = 60;
  function today() {
    if (S.today && S.today.date === TODAY && S.today.min === minutes()) return decorate(S.today);
    /* ★ 분량은 시간(초)으로 채운다 — 한 문장 O·X 약 20초, 기출 풀기(지문·4지선다) 약 60초(어림값, 실측 전).
       국어·영어처럼 기출 풀기만 있는 과목에서 15분에 45문항을 내면 끝을 못 본다(0924). */
    function 초(id) { var q = ITEM[id]; return q && q.mc ? SEC_MC : SEC_PER; }
    var 예산 = minutes() * 60, 쓴 = 0;
    var due = [];
    dueList().forEach(function (id) { if (쓴 + 초(id) <= 예산 * 0.5) { due.push(id); 쓴 += 초(id); } });
    var foci = focusNodes(3), fresh = [], 본 = {};
    function 담기(no, 한도) {
      freshOf(no, 60).some(function (q) {
        if (쓴 + 초(q.i) > 한도 || 본[q.i]) return 쓴 + SEC_PER > 한도;
        fresh.push(q.i); 본[q.i] = 1; 쓴 += 초(q.i); return false;
      });
    }
    var 몫 = (예산 - 40 - 쓴) / Math.max(1, foci.length);   /* 짝 둘 몫 40초는 남긴다 */
    foci.forEach(function (n, i) { 담기(n.no, 쓴 + 몫); });
    if (쓴 < 예산 - 60) focusNodes(12).slice(3).forEach(function (n) { if (쓴 < 예산 - 60) 담기(n.no, 예산 - 40); });
    /* 헷갈리는 짝 둘 — 오늘 쟁점에서, 안 푼 것 */
    var ps = [];
    foci.forEach(function (n) { pairs(n.no).forEach(function (p) { if (!S.pairs[p.id] && ps.length < 2) ps.push(p.id); }); });
    if (ps.length < 2) PR.forEach(function (p) { if (!S.pairs[p.id] && ps.length < 2) ps.push(p.id); });
    /* 순서 — 복습 먼저, 새 문장 중간중간에 짝 */
    var seq = due.map(function (id) { return { k: "ox", id: id, re: 1 }; });
    fresh.forEach(function (id, i) {
      seq.push({ k: "ox", id: id });
      if (ps.length && (i === Math.floor(fresh.length / 3) || i === Math.floor(fresh.length * 2 / 3))) seq.push({ k: "pair", id: ps.shift() });
    });
    ps.forEach(function (id) { seq.push({ k: "pair", id: id }); });
    S.today = { date: TODAY, min: minutes(), seq: seq, foci: foci.map(function (n) { return n.no; }), pos: 0 };
    save();
    return decorate(S.today);
  }
  function decorate(t) {
    var done = 0;
    t.seq.forEach(function (s) { if (s.done) done++; });
    return { date: t.date, min: t.min, seq: t.seq, foci: t.foci.map(function (no) { return NODE[no]; }),
             total: t.seq.length, done: done, re: t.seq.filter(function (s) { return s.re; }).length,
             finished: done >= t.seq.length };
  }
  function markToday(i) { if (S.today && S.today.seq[i]) { S.today.seq[i].done = 1; save(); } }

  /* ── 연속 · 달력 ── */
  function streak() {
    var n = 0, d = new Date();
    if (!S.days[ymd(d)]) d.setDate(d.getDate() - 1);   /* 오늘 아직 안 했으면 어제부터 센다 */
    while (S.days[ymd(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  /* ── 등급 — 방패 배지(선호대장 1차: 「그냥 등급」, 남학생은 「실버 II」에 반응, 여학생은 관심 없음 → 대상별로 켜고 끈다)
     오래 기억한 문장(간격 복습 3칸 이상 = 7일 넘게 버틴 것)이 이 과목 전체에서 차지하는 비율로 매긴다. */
  var TIERS = ["브론즈", "실버", "골드", "플래티넘", "다이아"], TIER_CUT = [0, 0.05, 0.15, 0.3, 0.5];
  function tier() {
    var n = 0, held = 0;
    Object.keys(QB).forEach(function (k) { n += QB[k].length; });
    Object.keys(S.ans).forEach(function (id) { if (ITEM[id] && S.ans[id].box >= 3) held++; });
    var r = n ? held / n : 0, t = 0;
    for (var i = 0; i < TIER_CUT.length; i++) if (r >= TIER_CUT[i]) t = i;
    var lo = TIER_CUT[t], hi = TIER_CUT[t + 1] || 1, step = (r - lo) / (hi - lo);
    var div = t === 4 ? "" : step < 1 / 3 ? " III" : step < 2 / 3 ? " II" : " I";
    return { name: TIERS[t] + div, rank: t, held: held, n: n };
  }
  function tierOn() {
    if (P.tierOn != null) return !!P.tierOn;
    return P.exam === "fire" || P.exam === "police";
  }
  function setTierOn(v) { P.tierOn = !!v; savePref(); }
  function days() { return S.days; }
  function todayCount() { return (S.days[TODAY] || { n: 0 }).n; }

  /* ── 배치 시험 20문장 ──
     쟁점 스무 곳에서 하나씩 — 기출이 많은 쟁점부터, 편이 고루 섞이게.
     제한 시간 안에 읽을 수 있는 길이(90자 이하)만. 날마다 같은 것이 나오지 않게 날짜로 섞는다. */
  function placementSet(k) {
    k = k || 20;
    var byPart = {};
    T.nodes.filter(function (n) { return n.q >= 8; }).sort(function (a, b) { return b.q - a.q; })
      .forEach(function (n) { (byPart[n.part] = byPart[n.part] || []).push(n); });
    var picks = [], parts = Object.keys(byPart), r = 0;
    while (picks.length < k && r < 40) {
      parts.forEach(function (p) { if (picks.length < k && byPart[p][r]) picks.push(byPart[p][r]); });
      r++;
    }
    var seed = TODAYN;
    /* ★ O·X 를 반반으로 — 전체 선지는 O 가 60%라 그냥 뽑으면 "다 O" 로 찍어도 점수가 난다(2026-09-23 실측 14/20) */
    return picks.map(function (n, i) {
      var want = i % 2 ? "X" : "O";
      var c = qs(n.no).filter(function (q) { return q.c === "A" && !q.sa && !q.mc && q.t.length <= 90 && q.t.length >= 25; });
      if (!c.length) c = qs(n.no).filter(function (q) { return !q.mc; });
      if (!c.length) return null;            /* 기출 풀기만 있는 과목(국어·영어)은 실력 확인에 안 쓴다 */
      var w = c.filter(function (q) { return q.ox === want; });
      if (w.length) c = w;
      return c[(seed + n.no * 7) % c.length];
    }).filter(Boolean);
  }
  function setPlacement(rec) {
    /* rec = [{id, ok, ms, to}] */
    var per = {};
    rec.forEach(function (r) {
      var q = ITEM[r.id]; if (!q) return;
      var p = NODE[q.n].part;
      per[p] = per[p] || { n: 0, ok: 0 }; per[p].n++; if (r.ok) per[p].ok++;
    });
    var weak = Object.keys(per).sort(function (a, b) { return per[a].ok / per[a].n - per[b].ok / per[b].n; })[0];
    S.place = { at: Date.now(), n: rec.length, ok: rec.filter(function (r) { return r.ok; }).length,
                per: per, weakPart: weak ? +weak : null };
    delete S.today;
    save();
    return S.place;
  }

  /* ── 두 문장이 어디서 갈리나 — 어절 단위 ── */
  function markDiff(a, b) {
    var A = a.split(/(\s+)/), B = b.split(/(\s+)/), setA = {}, setB = {};
    function key(w) { return w.replace(/[^가-힣0-9A-Za-z]/g, ""); }
    B.forEach(function (w) { var k = key(w); if (k) setB[k] = 1; });
    A.forEach(function (w) { var k = key(w); if (k) setA[k] = 1; });
    function paint(arr, other) {
      return arr.map(function (w) { var k = key(w); return !k || other[k] ? esc(w) : "<mark>" + esc(w) + "</mark>"; }).join("");
    }
    return [paint(A, setB), paint(B, setA)];
  }

  /* ── 스킨 ── */
  var SKINS = [
    { v: "white", n: "화이트", c: "#FFFFFF" },
    { v: "jelly", n: "젤리", c: "#FFD3E6" },
    { v: "night", n: "밤", c: "#0B0D11" }
  ];
  function skin() { try { return localStorage.getItem(SKIN) || "white"; } catch (e) { return "white"; } }
  function setSkin(v) {
    try { localStorage.setItem(SKIN, v); } catch (e) {}
    document.documentElement.dataset.skin = v;
    window.dispatchEvent(new CustomEvent("terra:skin"));
  }

  /* ── 나비 — 넷. 폰에서는 아래 탭 ── */
  var ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    tree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5"/><circle cx="21" cy="11" r="1.2" fill="currentColor"/></svg>',
    drill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>'
  };
  var PAGES = [["index.html", "홈", "home"], ["skilltree.html", "스킬트리", "tree"],
               ["drill.html", "훈련", "drill"], ["settings.html", "설정", "set"]];
  function mountNav(here) {
    /* 처음 온 사람은 첫 설정으로 — 검사기(webdriver)는 보내지 않는다 */
    if (!onboarded() && here !== "start.html" && !navigator.webdriver && !/[?&]nostart/.test(location.search)) {
      location.replace("start.html"); return;
    }
    var nav = document.createElement("div");
    nav.className = "nav";
    nav.innerHTML = '<div class="in"><a class="logo" href="index.html"><i></i>' + esc(T.brand) +
      '<span class="sub">' + esc(T.subject) + "</span></a>" +
      '<nav class="navlinks">' + PAGES.map(function (p) {
        return '<a href="' + p[0] + '"' + (p[0] === here ? ' class="on"' : "") + ">" + p[1] + "</a>";
      }).join("") + "</nav></div>";
    document.body.insertBefore(nav, document.body.firstChild);
    var tab = document.createElement("nav");
    tab.className = "tabbar";
    tab.innerHTML = PAGES.map(function (p) {
      return '<a href="' + p[0] + '"' + (p[0] === here ? ' class="on"' : "") + ">" + ICON[p[2]] + "<span>" + p[1] + "</span></a>";
    }).join("");
    document.body.appendChild(tab);
  }
  function mountNext() {}   /* 옛 스킬트리가 부른다. 이 판은 홈이 권하므로 비워 둔다 */

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function num(n) { return (n || 0).toLocaleString("ko-KR"); }
  function src(q) { return (q.y ? q.y + " " : "") + (q.e || "") + (q.qn ? " " + q.qn + "번" : "") + (q.m ? " " + q.m : ""); }

  /* 받침 보고 조사 — "처분성을" / "공정력을" / "행정심판을" */
  function josa(w, a, b) {
    var c = String(w || "").replace(/[^가-힣]/g, "").slice(-1);
    if (!c) return a;
    return ((c.charCodeAt(0) - 0xAC00) % 28) ? a : b;
  }

  function exportData() { return JSON.stringify({ v: 1, pref: P, rec: S }); }
  function importData(txt) {
    var o = JSON.parse(txt);
    if (!o || !o.rec) throw new Error("형식이 다릅니다");
    S = o.rec; P = o.pref || P; save(); savePref();
  }

  window.GB = {
    T: T, Q: QB, subject: T.subject, brand: T.brand,
    NODE: NODE, CH: CH, PART: PART, nodes: T.nodes, chs: T.chs, parts: T.parts,
    node: function (no) { return NODE[no]; }, ch: function (k) { return CH[k]; }, part: function (n) { return PART[n]; },
    nodesOf: function (k) { return (CH[k] || { nodes: [] }).nodes.map(function (n) { return NODE[n]; }); },
    chsOf: function (p) { return (PART[p] || { chs: [] }).chs.map(function (k) { return CH[k]; }); },
    partNodes: partNodes,
    qs: qs, item: item, pairs: pairs, pair: pair, markDiff: markDiff,
    nodeStat: nodeStat, chStat: chStat, partStat: partStat, overall: overall,
    answer: answer, pairAnswer: pairAnswer, answered: answered, reset: reset,
    dueList: dueList, wrongList: wrongList, focusNodes: focusNodes, freshOf: freshOf,
    today: today, markToday: markToday, streak: streak, todayCount: todayCount, tier: tier, tierOn: tierOn, setTierOn: setTierOn, days: days, SEC_PER: SEC_PER,
    placementSet: placementSet, setPlacement: setPlacement, placement: function () { return S.place || null; },
    track: track, setTrack: setTrack, exam: exam, setExam: setExam, subs: subs, cur: cur, setCur: setCur, seriesName: seriesName, goal: goal, goalMark: goalMark, setGoal: setGoal, dday: dday,
    minutes: minutes, setMinutes: setMinutes, name: name, setName: setName,
    onboarded: onboarded, setOnboarded: setOnboarded,
    skin: skin, setSkin: setSkin, SKINS: SKINS,
    mountNav: mountNav, mountNext: mountNext,
    esc: esc, num: num, src: src, josa: josa, ymd: ymd,
    exportData: exportData, importData: importData,
    state: function () { return S; }
  };
})();
