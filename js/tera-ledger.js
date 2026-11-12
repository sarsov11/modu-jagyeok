/* 테라러닝 분개 · T계정 판 — 회계 문제를 풀면서 분개와 T계정을 연습하는 공용 판 (2026-11-11, 안 C 상자 문법)
 *   채점은 없다. 연습장이다. 문제 키별로 localStorage 에 저장한다(try/catch).
 * 쓰는 법
 *   <script src="js/tera-ledger.js?v=1112k" defer></script>
 *   TERA_LEDGER.button(부모요소, { key:"문제 고유 키", accounts:["토지","건물","현금"] })   // 「분개 · T계정」 단추를 만들어 붙인다
 *   TERA_LEDGER.open({ key, accounts })  /  TERA_LEDGER.close()
 *   계정 목록 = accounts + 앱에 있는 JDRILL · ACCT 의 계정 + 기본 40개. ACCT 가 없으면 acct-data.js 를 열 때 불러온다.
 * 판은 폰에서 아래에서 화면 높이의 70%, 폭 1000px 이상은 오른쪽 패널. 위 칸 「분개」, 아래 칸 「T계정」 두 상자.
 * 색은 청록 한 가지(--jd-p 등, 기본 #0F766E). 앱의 포인트 변수를 물려받지 않는다. 글자는 한글 그대로(일본어 · 영문 앱에는 싣지 않는다).
 */
(function () {
  if (window.TERA_LEDGER) return;
  var d = document, root, S, opt = {}, act = null, boxOnce = 0, clearT = 0;
  var BASE = (function () { try { var s = d.currentScript && d.currentScript.src; return s ? s.replace(/[^\/]*$/, "") : ""; } catch (e) { return ""; } })();
  var DEFAULT = ["현금", "보통예금", "당좌예금", "매출채권", "받을어음", "미수금", "선급금", "재고자산", "상품", "토지", "건물", "기계장치", "차량운반구", "감가상각누계액", "투자부동산", "무형자산", "매입채무", "지급어음", "미지급금", "선수금", "예수금", "단기차입금", "장기차입금", "사채", "자본금", "자본잉여금", "이익잉여금", "매출", "매출원가", "급여", "임차료", "이자비용", "감가상각비", "대손상각비", "이자수익", "유형자산처분이익", "유형자산처분손실", "재평가잉여금", "재평가손실", "법인세비용"];
  var NORM = { 자산: "차", 비용: "차", 부채: "대", 자본: "대", 수익: "대" };

  var CSS = [
    "#tled{--p:var(--jd-p,#0F766E);--p2:var(--jd-p2,#0B5F59);--ps:var(--jd-soft,#E3F2F0);--pi:var(--jd-ink,#0B4F4A);--pl:var(--jd-line,#7FB8B2);",
    " position:fixed;left:0;right:0;bottom:0;z-index:2147481001;height:55vh;max-height:calc(100vh - 72px);background:#fff;color:#111419;border-radius:18px 22px 0 0;",
    " box-shadow:0 -18px 44px -18px rgba(17,20,25,.34),0 0 0 1px #E6E8EC;display:none;flex-direction:column;font:500 15px/1.5 'Pretendard Variable',Pretendard,-apple-system,'Malgun Gothic',sans-serif;letter-spacing:-.02em}",
    "#tled.on{display:flex;animation:tled-up .26s cubic-bezier(.2,.8,.2,1)}@keyframes tled-up{from{transform:translateY(36px);opacity:0}}",
    "#tled.min{height:56px}#tled.min .bd{display:none}",
    "#tled *{box-sizing:border-box}#tled button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}",
    "#tled .tlh{flex:none;display:flex;align-items:center;gap:8px;padding:10px 14px 8px}",
    "#tled .ttl{flex:1;min-width:0;font-weight:800;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "#tled .ic{flex:none;height:36px;min-width:36px;padding:0 10px;border-radius:999px;border:1px solid #D3D7DD;background:#fff;font-weight:700;font-size:13px;color:#4B5563}",
    "#tled .bd{flex:1;min-height:0;overflow:auto;padding:4px 14px 28px;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch}",
    "#tled .bx{border-radius:18px;box-shadow:0 1px 2px rgba(17,20,25,.05),0 0 0 1.5px #D3D7DD;padding:12px;background:#fff}",
    "#tled .bh{display:flex;align-items:center;gap:8px;margin-bottom:10px}#tled .bh h2{margin:0;font-size:17px;font-weight:900}#tled .bh .sp{flex:1}",
    "#tled .sm{height:30px;padding:0 12px;border-radius:999px;border:1px solid #D3D7DD;background:#fff;font-weight:700;font-size:12.5px;color:#4B5563}",
    "#tled .en{margin-top:10px}#tled .en:first-of-type{margin-top:0}",
    "#tled .eh{display:flex;align-items:center;gap:6px;margin-bottom:6px}#tled .eh b{font-size:13px;font-weight:800;color:#4B5563}",
    "#tled .memo{flex:1;min-width:0;height:34px;padding:0 10px;border:1.5px solid #D3D7DD;border-radius:10px;font-family:inherit;font-weight:600;font-size:13px;color:#111419;background:#fff}",
    "#tled .tb{border:1.5px solid #D3D7DD;border-radius:14px;overflow:hidden}",
    "#tled .tr{display:grid;grid-template-columns:1fr 1fr}#tled .tr>*{min-width:0}#tled .tr+.tr{border-top:1px solid #E6E8EC}#tled .tr>*+*{border-left:1px solid #E6E8EC}",
    "#tled .tr.th{background:#F7F8FA;height:32px;align-items:center;font-size:13px;font-weight:900}#tled .tr.th>div{text-align:center}",
    "#tled .tr.sm2{background:#F7F8FA}#tled .tr.sm2>div{min-height:28px;padding:5px 8px;text-align:right;font-size:12.5px;font-weight:800;font-variant-numeric:tabular-nums}",
    "#tled .slot{min-height:64px}",
    "#tled .cell{position:relative;display:flex;flex-direction:column;gap:6px;padding:8px}",
    "#tled .acc,#tled .amt{width:100%;min-width:0;height:44px;padding:0 10px;border:1.5px solid #D3D7DD;border-radius:12px;background:#fff;color:#111419;font-size:15px;font-weight:700}",
    "#tled .acc{padding-right:26px}",
    "#tled .amt{text-align:right;font-weight:800;font-size:16px;font-variant-numeric:tabular-nums;letter-spacing:-.03em}",
    "#tled .acc:focus,#tled .amt:focus,#tled .memo:focus,#tled .ob input:focus{outline:none;border-color:var(--p)}",
    "#tled .cell.on .acc{border-color:var(--p);background:var(--ps)}",
    "#tled .rm{position:absolute;right:12px;top:14px;width:22px;height:22px;border:0;border-radius:50%;background:#EFF1F4;color:#4B5563;font-size:12px;line-height:1;padding:0}",
    "#tled .adds{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #E6E8EC}",
    "#tled .add{margin:8px;height:38px;border:1.5px dashed #D3D7DD;border-radius:12px;background:none;font-weight:700;font-size:13px;color:#4B5563}",
    "#tled .chk{display:flex;align-items:center;flex-wrap:wrap;gap:3px 12px;margin-top:8px;padding:8px 10px;border-radius:12px;background:#F7F8FA;font-size:12.5px;font-weight:700;color:#4B5563}",
    "#tled .chk b{color:#111419;font-variant-numeric:tabular-nums}#tled .chk .st{margin-left:auto;font-weight:800}#tled .chk .ok{color:#16B364}#tled .chk .no{color:#E5322D}",
    "#tled .cand{margin-top:10px;padding:10px;border-radius:14px;background:var(--ps)}#tled .cand h3{margin:0 0 8px;font-size:12.5px;font-weight:800;color:#111419}",
    "#tled .chips{display:flex;flex-wrap:wrap;gap:7px}#tled .chip{height:38px;padding:0 13px;border:1.5px solid #D3D7DD;border-radius:999px;background:#fff;font-weight:700;font-size:14px}",
    "#tled .wide{display:block;width:100%;height:44px;margin-top:10px;border-radius:12px;border:1.5px solid var(--p);background:#fff;color:var(--pi);font-weight:800;font-size:14px}",
    "#tled .none{font-size:13px;font-weight:600;color:#5F6670}",
    /* T계정 */
    "#tled .tg{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
    "#tled .tc{border-radius:14px;box-shadow:0 0 0 1.5px #D3D7DD;overflow:hidden;min-width:0;background:#fff}",
    "#tled .tn{height:32px;line-height:32px;text-align:center;font-weight:900;font-size:13.5px;background:var(--ps);color:var(--pi);padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "#tled .tt{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #E6E8EC;min-height:56px}",
    "#tled .tt>div{min-width:0;padding:5px 4px}#tled .tt>div+div{border-left:2.5px solid #111419}",
    "#tled .tt h4{margin:0 0 2px;text-align:center;font-size:11px;font-weight:800;color:#5F6670}",
    "#tled .tt p{margin:0;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.04em;white-space:nowrap;line-height:1.5}",
    "#tled .ob{display:flex;align-items:center;gap:4px;padding:5px 6px;border-top:1px solid #E6E8EC;background:#FAFAFB}",
    "#tled .ob button{flex:none;height:26px;padding:0 8px;border-radius:999px;border:1px solid #D3D7DD;background:#fff;font-size:11.5px;font-weight:800;color:#4B5563}",
    "#tled .ob input{flex:1;min-width:0;height:26px;padding:0 6px;border:1px solid #D3D7DD;border-radius:8px;text-align:right;font-family:inherit;font-weight:700;font-size:12px;font-variant-numeric:tabular-nums;background:#fff}",
    "#tled .bl{padding:6px 8px;border-top:1px solid #E6E8EC;background:#F7F8FA;font-size:12px;font-weight:800;text-align:right;color:var(--pi);word-break:break-all}",
    ".tled-btn{display:inline-flex;align-items:center;gap:7px;height:44px;padding:0 14px;border-radius:12px;border:1.5px solid #D3D7DD;background:#fff;color:#111419;font:700 14.5px/1 'Pretendard Variable',Pretendard,-apple-system,'Malgun Gothic',sans-serif;cursor:pointer}",
    ".tled-btn svg{width:18px;height:18px;color:var(--jd-p,#0F766E)}",
    "body.tled-open .page{padding-bottom:calc(55vh + 40px)!important}",
    "@media(min-width:1000px){#tled{left:auto;top:72px;bottom:16px;right:16px;width:600px;height:auto;max-height:none;border-radius:18px;box-shadow:0 26px 60px -28px rgba(17,20,25,.34),0 0 0 1px #E6E8EC}#tled.min{height:56px;top:auto}",
    " #tled .tg{grid-template-columns:repeat(3,1fr)}#tled .acc,#tled .amt{height:48px}#tled .cell{flex-direction:row;align-items:center}#tled .acc{flex:1 1 38%}#tled .amt{flex:1 1 62%;font-size:16.5px}#tled .rm{position:static;flex:none}",
    " body.tled-open .page{padding-bottom:calc(72px + 40px)!important;margin-right:632px!important;margin-left:auto!important}}",
    ":root[data-skin=night] #tled{filter:invert(.92) hue-rotate(180deg)}"
  ].join("");
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M3.5 9.5h17M12 9.5v10"/></svg>';

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function won(n) { return Number(n).toLocaleString("ko-KR"); }
  function amtOf(s) { return parseInt(String(s || "").replace(/[^0-9]/g, ""), 10) || 0; }
  function fmt(s) { var x = String(s || "").replace(/[^0-9]/g, "").slice(0, 15); return x ? Number(x).toLocaleString("ko-KR") : ""; }
  function fs(len) { return len > 13 ? 12.5 : len > 11 ? 14 : 0; }

  /* 계정 목록: 문제에서 받은 것 + JDRILL · ACCT + 기본 */
  function allNames() {
    var out = [], seen = {};
    function add(n) { if (n && !seen[n]) { seen[n] = 1; out.push(n); } }
    (opt.accounts || []).forEach(add);
    try { if (window.JDRILL && JDRILL.extra) JDRILL.extra.forEach(function (a) { add(a.n); }); } catch (e) {}
    try { if (window.ACCT && ACCT.ACCTS) ACCT.ACCTS.forEach(function (a) { add(a.n); }); } catch (e) {}
    DEFAULT.forEach(add);
    var tx = String(opt.text || "");
    if (tx) { var hit = out.filter(function (n) { return n.length > 1 && tx.indexOf(n) >= 0 && (opt.accounts || []).indexOf(n) < 0; }); out = (opt.accounts || []).concat(hit, out.filter(function (n) { return (opt.accounts || []).indexOf(n) < 0 && hit.indexOf(n) < 0; })); }
    return out;
  }
  function normSide(n) {
    try { if (window.ACCT && ACCT.BY && ACCT.BY[n]) return ACCT.BY[n].side; } catch (e) {}
    var guess = { 매입채무: "대", 지급어음: "대", 미지급금: "대", 선수금: "대", 예수금: "대", 단기차입금: "대", 장기차입금: "대", 사채: "대", 자본금: "대", 자본잉여금: "대", 이익잉여금: "대", 매출: "대", 이자수익: "대", 유형자산처분이익: "대", 재평가잉여금: "대", 감가상각누계액: "대" };
    return guess[n] || "차";
  }

  /* 저장 */
  function skey() { return "tera_ledger_v1_" + (opt.key || "_"); }
  function blank() { return { en: [{ memo: "", d: [{ a: "", v: "" }], c: [{ a: "", v: "" }] }], ob: {} }; }
  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(skey()) || "null"); } catch (e) {}
    S = s && s.en && s.en.length ? s : blank(); S.ob = S.ob || {};
  }
  function save() { try { localStorage.setItem(skey(), JSON.stringify(S)); } catch (e) {} }

  var cssOn = 0;
  /* 판을 열기 전에도 「분개 · T계정」 단추 모양이 잡히게, 단추를 만들 때 먼저 싣는다 */
  function ensureCss() { if (cssOn) return; cssOn = 1; var st = d.createElement("style"); st.textContent = CSS; d.head.appendChild(st); }
  function build() {
    if (root) return;
    ensureCss();
    root = d.createElement("section"); root.id = "tled"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "분개 · T계정");
    d.body.appendChild(root);
    root.addEventListener("click", click);
    root.addEventListener("input", input);
    root.addEventListener("focusin", function (e) { var c = e.target.closest && e.target.closest(".cell"); if (c && e.target.classList.contains("acc")) setAct(c.dataset.s, +c.dataset.e, +c.dataset.i, true); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("on")) close(); });
    d.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".tpad-btn") && root.classList.contains("on")) close(); }, true);
  }

  /* ── 그리기 ── */
  function cellHtml(side, e, i) {
    var r = S.en[e][side][i], n = S.en[e][side].length, f = fs((r.v || "").length);
    var on = act && act.s === side && act.e === e && act.i === i;
    return '<div class="cell' + (on ? " on" : "") + '" data-s="' + side + '" data-e="' + e + '" data-i="' + i + '">' +
      '<input class="acc" type="text" value="' + esc(r.a) + '" placeholder="계정" aria-label="계정" autocomplete="off" spellcheck="false">' +
      '<input class="amt" type="text" inputmode="numeric" value="' + esc(r.v) + '" placeholder="금액" aria-label="금액" autocomplete="off"' + (f ? ' style="font-size:' + f + 'px"' : "") + ">" +
      (n > 1 ? '<button type="button" class="rm" data-a="rm" aria-label="줄 지우기">×</button>' : "") + "</div>";
  }
  function entryTotals(en) { var t = { d: 0, c: 0 }; ["d", "c"].forEach(function (s) { en[s].forEach(function (r) { t[s] += amtOf(r.v); }); }); return t; }
  function chkHtml(en) {
    var t = entryTotals(en), any = t.d || t.c, eq = t.d === t.c && t.d > 0;
    return "<span>차변 <b>" + won(t.d) + "</b></span><span>대변 <b>" + won(t.c) + '</b></span><span class="st ' + (any ? (eq ? "ok" : "no") : "") + '">' + (!any ? "" : eq ? "차대 맞음" : "차액 " + won(Math.abs(t.d - t.c))) + "</span>";
  }
  function entryHtml(e) {
    var en = S.en[e], n = Math.max(en.d.length, en.c.length), h = '<div class="en" data-e="' + e + '"><div class="eh"><b>분개 ' + (e + 1) + '</b><input class="memo" type="text" value="' + esc(en.memo) + '" placeholder="날짜 · 메모" aria-label="날짜 또는 메모" maxlength="40">' +
      (S.en.length > 1 ? '<button type="button" class="sm" data-a="rme" data-e="' + e + '">지우기</button>' : "") + '</div><div class="tb"><div class="tr th"><div>차변</div><div>대변</div></div>';
    for (var i = 0; i < n; i++) h += '<div class="tr">' + ["d", "c"].map(function (s) { return en[s][i] ? cellHtml(s, e, i) : '<div class="slot"></div>'; }).join("") + "</div>";
    h += '<div class="adds"><button type="button" class="add" data-a="add" data-s="d" data-e="' + e + '">차변 줄 더하기</button><button type="button" class="add" data-a="add" data-s="c" data-e="' + e + '">대변 줄 더하기</button></div></div>';
    return h + '<div class="chk" data-chk="' + e + '">' + chkHtml(en) + "</div></div>";
  }
  function candHtml() {
    if (!act) return "";
    var r = S.en[act.e] && S.en[act.e][act.s][act.i]; if (!r) return "";
    var q = (r.a || "").replace(/\s+/g, ""), names = allNames(), list;
    if (q) {
      list = names.filter(function (n) { return n.replace(/\s+/g, "").indexOf(q) >= 0; });
      list.sort(function (a, b) { return (a.indexOf(q) === 0 ? 0 : 1) - (b.indexOf(q) === 0 ? 0 : 1); });
    } else list = (opt.accounts || []).concat(names.filter(function (n) { return (opt.accounts || []).indexOf(n) < 0; }));
    list = list.slice(0, q ? 10 : 14);
    return '<div class="cand"><h3>분개 ' + (act.e + 1) + " · " + (act.s === "d" ? "차변 " : "대변 ") + (act.i + 1) + " · 계정</h3><div class=\"chips\">" +
      (list.length ? list.map(function (n) { return '<button type="button" class="chip" data-a="chip" data-n="' + esc(n) + '">' + esc(n) + "</button>"; }).join("") : '<span class="none">맞는 계정 없음</span>') + "</div></div>";
  }
  /* T계정 자료: 분개에 쓴 계정마다 차변 · 대변 금액 */
  function tAccounts() {
    var order = [], M = {};
    S.en.forEach(function (en) { ["d", "c"].forEach(function (s) { en[s].forEach(function (r) {
      var n = (r.a || "").trim(), v = amtOf(r.v); if (!n) return;
      if (!M[n]) { M[n] = { n: n, d: [], c: [] }; order.push(n); }
      if (v) M[n][s].push(v);
    }); }); });
    Object.keys(S.ob).forEach(function (n) { if (!M[n] && amtOf(S.ob[n].v)) { M[n] = { n: n, d: [], c: [] }; order.push(n); } });
    return order.map(function (n) { return M[n]; });
  }
  function tcHtml(t) {
    var ob = S.ob[t.n] || { s: normSide(t.n), v: "" }, o = amtOf(ob.v);
    var sd = t.d.reduce(function (a, b) { return a + b; }, 0) + (ob.s === "차" ? o : 0), sc = t.c.reduce(function (a, b) { return a + b; }, 0) + (ob.s === "대" ? o : 0);
    var bal = sd - sc, longest = 0;
    t.d.concat(t.c).concat(o ? [o] : []).forEach(function (v) { longest = Math.max(longest, won(v).length); });
    var f = longest > 13 ? 9.5 : longest > 11 ? 10.5 : longest > 9 ? 11.5 : 13;
    var col = function (arr, openAmt) { return (openAmt ? "<p style='color:#5F6670'>기초 " + won(openAmt) + "</p>" : "") + arr.map(function (v) { return "<p>" + won(v) + "</p>"; }).join(""); };
    return '<div class="tc" data-n="' + esc(t.n) + '"><div class="tn">' + esc(t.n) + '</div><div class="tt" style="font-size:' + f + 'px"><div><h4>차변</h4>' + col(t.d, ob.s === "차" ? o : 0) + "</div><div><h4>대변</h4>" + col(t.c, ob.s === "대" ? o : 0) + "</div></div>" +
      '<div class="ob"><button type="button" data-a="obs" data-n="' + esc(t.n) + '" aria-label="기초 잔액 차변 대변 바꾸기">기초 ' + ob.s + '</button><input type="text" inputmode="numeric" data-ob="' + esc(t.n) + '" value="' + esc(ob.v || "") + '" placeholder="기초 잔액" aria-label="기초 잔액"></div>' +
      '<div class="bl">' + (bal === 0 ? "잔액 0" : (bal > 0 ? "차변 잔액 " : "대변 잔액 ") + won(Math.abs(bal))) + "</div></div>";
  }
  function render() {
    var h = '<div class="tlh"><div class="ttl">분개 · T계정</div><button class="ic" data-a="min" aria-label="접기">' + (root.classList.contains("min") ? "펼치기" : "접기") + '</button><button class="ic" data-a="close" aria-label="닫기">닫기</button></div><div class="bd">';
    h += '<section class="bx" id="tlj"><div class="bh"><h2>분개</h2><span class="sp"></span><button type="button" class="sm" data-a="clear">' + (clearT ? "한 번 더 누르면 지움" : "지우기") + "</button></div>";
    h += S.en.map(function (_, e) { return entryHtml(e); }).join("") + '<div id="tlc">' + candHtml() + '</div><button type="button" class="wide" data-a="adde">분개 더하기</button></section>';
    var ts = tAccounts();
    h += '<section class="bx" id="tlt"><div class="bh"><h2>T계정</h2></div><div class="tg" id="tltg">' + (ts.length ? ts.map(tcHtml).join("") : '<span class="none">분개에 계정을 적으면 생긴다</span>') + "</div></section></div>";
    var bd = root.querySelector(".bd"), y = bd ? bd.scrollTop : 0;
    root.innerHTML = h;
    var nb = root.querySelector(".bd"); if (nb) nb.scrollTop = y;
    if (root.classList.contains("on")) fitT();
  }
  /* T계정 금액이 칸에 안 들어가면 글자를 줄이고, 그래도 안 되면 줄을 바꿔서라도 잘리지 않게 한다 */
  function fitT() {
    Array.prototype.forEach.call(root.querySelectorAll(".tt"), function (tt) {
      var ps = tt.querySelectorAll("p"), f = 13;
      function over() { for (var i = 0; i < ps.length; i++) if (ps[i].scrollWidth > ps[i].clientWidth + 1) return true; return false; }
      tt.style.fontSize = f + "px";
      while (over() && f > 8) { f -= 0.5; tt.style.fontSize = f + "px"; }
      if (over()) Array.prototype.forEach.call(ps, function (p) { p.style.whiteSpace = "normal"; p.style.wordBreak = "break-all"; });
    });
  }
  function refreshT() { var g = root.querySelector("#tltg"); if (!g) return; var ts = tAccounts(); g.innerHTML = ts.length ? ts.map(tcHtml).join("") : '<span class="none">분개에 계정을 적으면 생긴다</span>'; fitT(); }
  function refreshCand() { var c = root.querySelector("#tlc"); if (c) c.innerHTML = candHtml(); }
  function setAct(s, e, i, keepFocus) {
    act = { s: s, e: e, i: i };
    Array.prototype.forEach.call(root.querySelectorAll(".cell"), function (c) { c.classList.toggle("on", c.dataset.s === s && +c.dataset.e === e && +c.dataset.i === i); });
    refreshCand();
  }
  function nextEmpty() {
    if (!act) return;
    var rows = S.en[act.e][act.s], k;
    for (k = 0; k < rows.length; k++) if (!rows[k].a) { act.i = k; return; }
    var o = act.s === "d" ? "c" : "d";
    for (k = 0; k < S.en[act.e][o].length; k++) if (!S.en[act.e][o][k].a) { act = { s: o, e: act.e, i: k }; return; }
    act = null;
  }

  function click(e) {
    var b = e.target.closest("button"); if (!b || !b.dataset.a) return; var a = b.dataset.a, c = b.closest(".cell");
    if (a === "close") close();
    else if (a === "min") { root.classList.toggle("min"); d.body.classList.toggle("tled-open", !root.classList.contains("min")); render(); }
    else if (a === "chip") {
      if (!act) return; S.en[act.e][act.s][act.i].a = b.dataset.n; save(); nextEmpty(); render();
    } else if (a === "add") { var en = S.en[+b.dataset.e], s = b.dataset.s; en[s].push({ a: "", v: "" }); act = { s: s, e: +b.dataset.e, i: en[s].length - 1 }; save(); render(); }
    else if (a === "rm") { S.en[+c.dataset.e][c.dataset.s].splice(+c.dataset.i, 1); act = null; save(); render(); }
    else if (a === "adde") { S.en.push({ memo: "", d: [{ a: "", v: "" }], c: [{ a: "", v: "" }] }); act = { s: "d", e: S.en.length - 1, i: 0 }; save(); render(); }
    else if (a === "rme") { S.en.splice(+b.dataset.e, 1); act = null; save(); render(); }
    else if (a === "obs") { var n = b.dataset.n, o = S.ob[n] || { s: normSide(n), v: "" }; o.s = o.s === "차" ? "대" : "차"; S.ob[n] = o; save(); refreshT(); }
    else if (a === "clear") {
      if (!clearT) { clearT = setTimeout(function () { clearT = 0; if (root.classList.contains("on")) render(); }, 3000); render(); return; }
      clearTimeout(clearT); clearT = 0; S = blank(); act = null; try { localStorage.removeItem(skey()); } catch (x) {} render();
    }
  }
  function input(e) {
    var t = e.target, c = t.closest(".cell");
    if (c) {
      var r = S.en[+c.dataset.e][c.dataset.s][+c.dataset.i];
      if (t.classList.contains("acc")) { r.a = t.value; act = { s: c.dataset.s, e: +c.dataset.e, i: +c.dataset.i }; refreshCand(); }
      else { r.v = fmt(t.value); t.value = r.v; var f = fs(r.v.length); t.style.fontSize = f ? f + "px" : ""; var k = root.querySelector('[data-chk="' + c.dataset.e + '"]'); if (k) k.innerHTML = chkHtml(S.en[+c.dataset.e]); }
      save(); refreshT(); return;
    }
    if (t.classList.contains("memo")) { S.en[+t.closest(".en").dataset.e].memo = t.value; save(); return; }
    if (t.dataset.ob != null) { var n = t.dataset.ob, o = S.ob[n] || { s: normSide(n), v: "" }; o.v = fmt(t.value); t.value = o.v; S.ob[n] = o; save();
      var card = t.closest(".tc"), nt = tAccounts().filter(function (x) { return x.n === n; })[0]; if (card && nt) { var tmp = d.createElement("div"); tmp.innerHTML = tcHtml(nt); var ni = tmp.firstChild; card.replaceWith(ni); fitT(); var ip = ni.querySelector("input"); if (ip) { ip.focus(); ip.setSelectionRange(ip.value.length, ip.value.length); } } }
  }

  function loadAcct(cb) {
    if (window.ACCT || !BASE || boxOnce) { cb(); return; }
    boxOnce = 1; var sc = d.createElement("script"); sc.src = BASE + "acct-data.js"; sc.onload = sc.onerror = function () { cb(); }; d.head.appendChild(sc);
  }
  function open(o) {
    opt = o || opt; build();
    try { if (window.TERA_PAD && TERA_PAD.close) TERA_PAD.close(); } catch (e) {}
    load(); act = null; clearT = 0; root.classList.remove("min"); render();
    root.classList.add("on"); d.body.classList.add("tled-open"); fitT();
    loadAcct(function () { if (root.classList.contains("on")) refreshCand(); });
  }
  function close() { if (!root) return; root.classList.remove("on"); d.body.classList.remove("tled-open"); }
  function button(parent, o) {
    ensureCss();
    var b = d.createElement("button"); b.type = "button"; b.className = "tled-btn"; b.innerHTML = ICON + "분개 · T계정";
    b.onclick = function () { var oo = typeof o === "function" ? o() : o; if (root && root.classList.contains("on") && opt.key === (oo || {}).key) close(); else open(oo); };
    if (parent) parent.appendChild(b); return b;
  }
  window.TERA_LEDGER = { open: open, close: close, button: button };
})();
