/* 첫 진입 안내 — 테라러닝 공용 (2026-10-09)
 *  게임이 처음에 쓰는 법을 짚어 주듯: 화면을 어둡게 덮고 한 곳씩 비추며 한 줄 설명, 탭하면 다음 곳으로 빛이 옮겨 간다.
 *  한 번 끝까지 보거나 건너뛰면 다시 안 뜬다(localStorage terra.coachmark.<열쇠>).
 *
 *  ZZCOACH.run("skilltree", [ { el: "#pickhost", text: "오늘 할 것. 누르면 바로 시작" }, ... ], { delay: 700 })
 *    el   : 선택자 문자열 · 요소 · 요소를 돌려주는 함수. 화면에 없으면(크기 0) 그 단계는 건너뛴다
 *    text : 한 줄. 사실만
 *  ZZCOACH.reset("skilltree")  다시 보이게(설정의 「안내 다시 보기」)
 *  짜잔(zzajan.js)이 있으면 비출 때 「딩」 소리를 같이 낸다. 움직임 줄이기 설정이면 이동 애니메이션 없이 바로.
 */
(function () {
  "use strict";
  if (window.ZZCOACH) return;
  var D = document, W = window, KEY = "terra.coachmark.";
  var RM = false; try { RM = W.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { }
  function seen(k) { try { return localStorage.getItem(KEY + k) === "1"; } catch (e) { return false; } }
  function mark(k) { try { localStorage.setItem(KEY + k, "1"); } catch (e) { } }
  function reset(k) { try { localStorage.removeItem(KEY + k); } catch (e) { } }
  var LANG = (function () { var l = (D.documentElement.getAttribute("lang") || "ko").toLowerCase(); return l.indexOf("ja") === 0 ? "ja" : l.indexOf("en") === 0 ? "en" : "ko"; })();
  var L = { ko: { next: "다음", end: "시작", skip: "건너뛰기" }, ja: { next: "次へ", end: "はじめる", skip: "スキップ" }, en: { next: "Next", end: "Start", skip: "Skip" } }[LANG];

  var css = [
    "#zzc{position:fixed;inset:0;z-index:2147482000}",
    "#zzc .hole{position:fixed;border-radius:16px;box-shadow:0 0 0 200vmax rgba(10,12,20,.74);pointer-events:none;",
    " transition:left .45s cubic-bezier(.2,1,.3,1),top .45s cubic-bezier(.2,1,.3,1),width .45s cubic-bezier(.2,1,.3,1),height .45s cubic-bezier(.2,1,.3,1)}",
    "#zzc .hole::after{content:'';position:absolute;inset:-6px;border-radius:20px;border:3px solid #fff;animation:zzcPulse 1.3s ease-out infinite}",
    "@keyframes zzcPulse{0%{opacity:.95;transform:scale(1)}100%{opacity:0;transform:scale(1.08)}}",
    "#zzc .bub{position:fixed;left:16px;right:16px;max-width:420px;margin:0 auto;background:#fff;color:#111;border-radius:16px;padding:16px 16px 12px;",
    " box-shadow:0 18px 40px rgba(0,0,0,.35);font:600 16.5px/1.55 'Pretendard','Noto Sans KR','Apple SD Gothic Neo',system-ui,sans-serif;letter-spacing:-.01em}",
    "#zzc .bub.in{animation:zzcIn .38s cubic-bezier(.2,1.5,.35,1)}@keyframes zzcIn{0%{opacity:0;transform:translateY(12px) scale(.96)}100%{opacity:1;transform:none}}",
    "#zzc .bub .row{display:flex;align-items:center;gap:10px;margin-top:12px}",
    "#zzc .bub .no{font:800 13px/1 system-ui,sans-serif;color:#8A8F98}",
    "#zzc .bub .sk{margin-left:auto;background:none;border:0;color:#8A8F98;font:700 14px/1 inherit;padding:8px 6px;cursor:pointer}",
    "#zzc .bub .go{background:#E3242B;color:#fff;border:0;border-radius:12px;padding:11px 18px;font:800 15.5px/1 inherit;cursor:pointer}",
    "#zzc .bub .dots{display:flex;gap:5px}#zzc .bub .dots i{width:7px;height:7px;border-radius:9px;background:#DADDE2}#zzc .bub .dots i.on{background:#E3242B;width:18px}"
  ].join("\n");

  function pick(x) { try { return typeof x === "function" ? x() : typeof x === "string" ? D.querySelector(x) : x; } catch (e) { return null; } }
  function ok(el) { if (!el || !el.getBoundingClientRect) return false; var r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; }

  function run(key, steps, opt) {
    opt = opt || {};
    if (!key || seen(key) || D.getElementById("zzc")) return false;
    setTimeout(function () { start(key, steps, opt); }, opt.delay == null ? 700 : opt.delay);
    return true;
  }
  function start(key, steps, opt) {
    var list = steps.filter(function (s) { return ok(pick(s.el)); });
    if (!list.length) return;
    if (!D.getElementById("zzc-style")) { var st = D.createElement("style"); st.id = "zzc-style"; st.textContent = css; D.head.appendChild(st); }
    var box = D.createElement("div"); box.id = "zzc"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.innerHTML = '<div class="hole"></div><div class="bub" aria-live="polite"><div class="tx"></div><div class="row"><span class="dots"></span>' +
      '<button type="button" class="sk">' + L.skip + '</button><button type="button" class="go">' + L.next + '</button></div></div>';
    D.body.appendChild(box);
    var hole = box.querySelector(".hole"), bub = box.querySelector(".bub"), i = 0;
    if (RM) hole.style.transition = "none";
    function end() { mark(key); box.remove(); W.removeEventListener("resize", place); W.removeEventListener("scroll", place, true); if (opt.onEnd) try { opt.onEnd(); } catch (e) { } }
    function place() {
      var el = pick(list[i].el); if (!ok(el)) return;
      var r = el.getBoundingClientRect(), pad = 8, vh = innerHeight;
      hole.style.left = (r.left - pad) + "px"; hole.style.top = (r.top - pad) + "px";
      hole.style.width = (r.width + pad * 2) + "px"; hole.style.height = Math.min(r.height + pad * 2, vh * .62) + "px";
      var below = r.top + Math.min(r.height, vh * .62) + pad + 14, bh = bub.offsetHeight || 120;
      if (below + bh < vh - 12) { bub.style.top = below + "px"; bub.style.bottom = ""; }
      else if (r.top - pad - 14 - bh > 12) { bub.style.top = (r.top - pad - 14 - bh) + "px"; bub.style.bottom = ""; }
      else { bub.style.top = ""; bub.style.bottom = "16px"; }
    }
    function show() {
      var el = pick(list[i].el);
      if (!ok(el)) { if (++i < list.length) return show(); return end(); }
      try { el.scrollIntoView({ block: "center", behavior: RM ? "auto" : "smooth" }); } catch (e) { }
      bub.querySelector(".tx").textContent = list[i].text;
      bub.querySelector(".dots").innerHTML = list.map(function (_, k) { return '<i' + (k === i ? ' class="on"' : '') + '></i>'; }).join("");
      bub.querySelector(".go").textContent = i === list.length - 1 ? L.end : L.next;
      bub.classList.remove("in"); void bub.offsetWidth; bub.classList.add("in");
      setTimeout(place, RM ? 0 : 320); place();
      try { if (W.ZZ && W.ZZ.play) W.ZZ.play("pick", { vol: .5, semi: i * 2 }); } catch (e) { }
    }
    function next() { if (++i >= list.length) return end(); show(); }
    bub.querySelector(".go").onclick = function (e) { e.stopPropagation(); next(); };
    bub.querySelector(".sk").onclick = function (e) { e.stopPropagation(); end(); };
    box.addEventListener("click", function (e) { if (!bub.contains(e.target)) next(); });   /* 어디를 눌러도 다음으로 */
    W.addEventListener("resize", place); W.addEventListener("scroll", place, true);
    show();
  }
  W.ZZCOACH = { run: run, reset: reset, seen: seen };
})();
