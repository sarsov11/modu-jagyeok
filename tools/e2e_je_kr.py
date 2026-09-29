# -*- coding: utf-8 -*-
"""분개 드릴(전산회계) 브라우저 검사 — Playwright + Edge 필요.

  py -m http.server 18617 --bind 127.0.0.1      (사이트 폴더에서, 다른 터미널)
  py tools/e2e_je_kr.py [포트]

1. 엔진 대조: JS 와 파이썬 쌍둥이(je_kr_생성검산.py --seed 7)가 120유형의 문장·분개를 똑같이 만든다
2. 채점 자체 검사: 모든 유형·세트에서 정답 100%, 전부 반대 변, 줄 누락, 틀린 계정, 유형별 실수 규칙 진단
3. 화면: 계정 검색(초성 포함) → 금액 → 채점 → 해설 → T계정 → 새 숫자 → 스피드 5 → 복습, 데스크톱과 375px 폰
스크린샷은 tools/screens/je_kr_*.png. 콘솔 오류나 검사 실패가 있으면 종료 코드 1.
"""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "18617"
BASE = "http://127.0.0.1:%s/" % PORT
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "screens")
os.makedirs(OUT, exist_ok=True)
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "wt-jekr", "jobs", "je-kr"))
errors, fails = [], []


def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + ((" | " + str(info)) if info else ""))
    if not ok:
        fails.append(name)


ENGINE_TEST = """
() => {
  const J = window.JE, out = {twin: {}, bad: [], n: 0, diag: {sub:0, swap:0, amt:0, extra:0, miss:0}};
  const rowsOf = (v, si, f) => v.sets[si].lines.map(l => f(l)).filter(Boolean);
  J.data.tpls.forEach(t => {
    const v = J.generate(t, 7);
    out.twin[t.id] = {text: v.text, sets: v.sets.map(s => s.lines.map(l => [l.a, l.s, l.v]))};
    for (let seed = 11; seed < 14; seed++) {
      const w = J.generate(t, seed);
      w.sets.forEach((s, si) => {
        out.n++;
        // 1) correct answer, lines shuffled
        const good = s.lines.slice().reverse().map(l => ({a: l.a, tx: '', d: l.s === 'D' ? l.v : 0, c: l.s === 'C' ? l.v : 0}));
        let r = J.grade(w, si, good);
        if (!(r.perfect && Math.abs(r.score - 1) < 1e-9)) out.bad.push(t.id + ' correct not perfect seed ' + seed + ' set ' + si + ' ' + JSON.stringify(r.lines.map(u => u.status)));
        // 2) rounding: +-1 dollar is accepted
        const near = s.lines.map(l => ({a: l.a, tx: '', d: l.s === 'D' ? l.v + 1 : 0, c: l.s === 'C' ? l.v + 1 : 0}));
        r = J.grade(w, si, near);
        if (!r.perfect) out.bad.push(t.id + ' +1 rounding rejected');
        // 3) every side flipped
        const flip = s.lines.map(l => ({a: l.a, tx: '', d: l.s === 'C' ? l.v : 0, c: l.s === 'D' ? l.v : 0}));
        r = J.grade(w, si, flip);
        const acctTwice = new Set(); let netCase = false;
        s.lines.forEach(l => { if (acctTwice.has(l.a)) netCase = true; acctTwice.add(l.a); });
        if (!netCase && !(r.allFlip && r.score === 0 && !r.perfect)) out.bad.push(t.id + ' flip not detected ' + JSON.stringify(r.lines.map(u => u.status)));
        // 4) missing last line
        if (s.lines.length > 2) {
          const miss = good.slice(1);
          r = J.grade(w, si, miss);
          if (r.perfect || r.missing.length < 1) out.bad.push(t.id + ' missing not detected');
        }
        // 5) blank
        r = J.grade(w, si, [{a: null, tx: '', d: 0, c: 0}]);
        if (r.score !== 0 || r.missing.length !== s.lines.length) out.bad.push(t.id + ' blank grade');
        // 6) mistake rules
        w.mist.forEach(m => {
          const answerAccts = s.lines.map(l => l.a);
          if (m.k === 'sub' && answerAccts.indexOf(m.a) >= 0 && answerAccts.indexOf(m.b) < 0) {
            const rows = s.lines.map(l => ({a: l.a === m.a ? m.b : l.a, tx: '', d: l.s === 'D' ? l.v : 0, c: l.s === 'C' ? l.v : 0}));
            r = J.grade(w, si, rows);
            const hit = r.lines.some(u => u.status === 'acct' && u.msg === m.msg);
            if (hit) out.diag.sub++; else out.bad.push(t.id + ' sub rule ' + m.a + '->' + m.b + ' not diagnosed');
          }
          if (m.k === 'swap' && answerAccts.indexOf(m.a) >= 0) {
            const rows = s.lines.map(l => ({a: l.a, tx: '', d: (l.s === 'D') !== (l.a === m.a) ? l.v : 0, c: (l.s === 'C') !== (l.a === m.a) ? l.v : 0}));
            if (new Set(answerAccts).size === answerAccts.length) {
              r = J.grade(w, si, rows);
              if (r.lines.some(u => u.status === 'flip' && u.msg === m.msg)) out.diag.swap++; else out.bad.push(t.id + ' swap rule ' + m.a + ' not diagnosed');
            }
          }
          if (m.k === 'amt') {
            const tgt = s.lines.filter(l => l.a === m.a);
            if (tgt.length === 1 && m.v > 0 && Math.abs(tgt[0].v - m.v) > Math.max(1.5, tgt[0].v * 0.0002) && w.mist.filter(x => x.k === 'amt' && x.a === m.a && Math.abs(x.v - m.v) < 1.5).length === 1) {
              const rows = s.lines.map(l => ({a: l.a, tx: '', d: l.s === 'D' ? (l.a === m.a ? m.v : l.v) : 0, c: l.s === 'C' ? (l.a === m.a ? m.v : l.v) : 0}));
              r = J.grade(w, si, rows);
              if (r.lines.some(u => u.status === 'amount' && u.msg === m.msg)) out.diag.amt++; else out.bad.push(t.id + ' amt rule ' + m.a + ' not diagnosed');
            }
          }
          if (m.k === 'extra' && answerAccts.indexOf(m.a) < 0) {
            const rows = good.concat([{a: m.a, tx: '', d: 10, c: 0}]);
            r = J.grade(w, si, rows);
            if (r.lines.some(u => u.status === 'extra' && u.msg === m.msg) && !r.perfect) out.diag.extra++; else out.bad.push(t.id + ' extra rule ' + m.a + ' not diagnosed');
          }
          if (m.k === 'miss' && answerAccts.indexOf(m.a) >= 0 && s.lines.length > 2) {
            const rows = good.filter(x => x.a !== m.a);
            r = J.grade(w, si, rows);
            if (r.missing.some(x => x.c.a === m.a && x.msg === m.msg)) out.diag.miss++; else out.bad.push(t.id + ' miss rule ' + m.a + ' not diagnosed');
          }
        });
      });
    }
  });
  return out;
}
"""


def twin_check(pg):
    res = subprocess.run([sys.executable, os.path.join(SRC, "je_kr_생성검산.py"), "--seed", "7"], capture_output=True, text=True, encoding="utf-8", env=dict(os.environ, PYTHONIOENCODING="utf-8"))
    if res.returncode != 0:
        check("python twin ran", False, res.stderr[-300:]); return
    py = json.loads(res.stdout)
    out = pg.evaluate(ENGINE_TEST)
    js = out["twin"]
    diff_text = [k for k in py if py[k]["text"] != js[k]["text"]]
    diff_amt = []
    for k in py:
        a = [[[x[0], x[1], round(x[2], 2)] for x in s] for s in py[k]["sets"]]
        b = [[[x[0], x[1], round(x[2], 2)] for x in s] for s in js[k]["sets"]]
        if a != b:
            diff_amt.append(k)
    check("JS = Python statements (120 templates, seed 7)", not diff_text, diff_text[:5])
    check("JS = Python entries (120 templates, seed 7)", not diff_amt, diff_amt[:5])
    check("grader self-test: %d entries x 6 probes" % out["n"], not out["bad"], out["bad"][:6])
    print("     mistake rules exercised:", out["diag"])
    return out


def fill_entry(pg, set_idx, lines, names):
    """type each answer line into the entry table using the account autocomplete"""
    sets = pg.locator(".je-set")
    box = sets.nth(set_idx)
    for i, (a, s, v) in enumerate(lines):
        rows = box.locator(".je-row")
        if rows.count() <= i:
            box.locator("[data-add]").click()
            rows = box.locator(".je-row")
        row = rows.nth(i)
        inp = row.locator(".je-acct")
        inp.click()
        inp.fill("")
        inp.type(names[a][:6], delay=10)
        pg.wait_for_selector("#je-dd:not([hidden]) .je-opt")
        # pick the option whose text starts with the full account name
        opts = pg.locator("#je-dd .je-opt")
        picked = False
        for j in range(opts.count()):
            if opts.nth(j).inner_text().split("\n")[0].strip() == names[a]:
                opts.nth(j).dispatch_event("pointerdown"); picked = True; break
        if not picked:
            inp.fill(names[a])
            inp.press("Tab")
        row.locator(".je-d" if s == "D" else ".je-c").fill("{:,.2f}".format(v).rstrip("0").rstrip("."))
        row.locator(".je-d" if s == "D" else ".je-c").press("Tab")


def ui_flow(pg, tag, mobile):
    pg.goto(BASE + "je.html")
    pg.evaluate("() => localStorage.removeItem('mj.je.v1')")
    pg.goto(BASE + "je.html")
    pg.wait_for_selector(".je-tc")
    check(tag + " home renders 14 topic cards (전체 + 13)", pg.locator(".je-tc").count() == 14, pg.locator(".je-tc").count())
    pg.screenshot(path=os.path.join(OUT, "je_%s_home.png" % tag), full_page=False)
    # open a specific type via topic + type list
    pg.click('[data-topic="debt"]')
    pg.wait_for_selector('.je-type[data-t="KR-DEBT-04"]')
    pg.screenshot(path=os.path.join(OUT, "je_%s_types.png" % tag), full_page=True)
    pg.click('.je-type[data-t="KR-DEBT-04"]')
    pg.wait_for_selector(".je-stmt")
    names = pg.evaluate("() => { const o = {}; for (const k in JE.COA) o[k] = JE.COA[k].name; return o; }")
    v = pg.evaluate("() => JSON.parse(JSON.stringify(JE.state.v))")
    check(tag + " drill shows statement + 2 entry tables", pg.locator(".je-set").count() == 2)
    pg.screenshot(path=os.path.join(OUT, "je_%s_drill_empty.png" % tag), full_page=True)
    # hint ladder on the first set
    hb = pg.locator(".je-set").nth(0).locator("[data-hint]")
    for k in (1, 2, 3):
        hb.click()
    txt = pg.locator(".je-set").nth(0).locator(".je-hint").inner_text()
    check(tag + " hint level 3 shows 차변/대변", "차변" in txt and "대변" in txt and "→" in txt, txt[:80])
    # set 0 correct, set 1 with a wrong amount + reversed side, set 2 left with a wrong account
    fill_entry(pg, 0, [(l["a"], l["s"], l["v"]) for l in v["sets"][0]["lines"]], names)
    bal = pg.locator(".je-set").nth(0).locator(".je-bal").inner_text()
    check(tag + " live balance shows Balanced", bal.startswith("차대 일치"), bal)
    l1 = v["sets"][1]["lines"]
    fill_entry(pg, 1, [(l1[0]["a"], l1[0]["s"], l1[0]["v"] + 500), (l1[1]["a"], "D" if l1[1]["s"] == "C" else "C", l1[1]["v"]), (l1[2]["a"], l1[2]["s"], l1[2]["v"])], names)
    bal1 = pg.locator(".je-set").nth(1).locator(".je-bal").inner_text()
    check(tag + " live balance flags out-of-balance", bal1.startswith("차변") and "차액" in bal1, bal1)
    pg.screenshot(path=os.path.join(OUT, "je_%s_drill_filled.png" % tag), full_page=True)
    pg.click("#je-check")
    pg.wait_for_selector(".je-sum")
    check(tag + " graded: has correct + wrong tags", pg.locator(".je-rr.ok").count() >= 3 and pg.locator(".je-rr.no").count() >= 2,
          "%d ok / %d no" % (pg.locator(".je-rr.ok").count(), pg.locator(".je-rr.no").count()))
    check(tag + " strike-through diff shown", pg.locator(".je-rr s").count() >= 1)
    check(tag + " score badge shown", "%" in pg.locator(".je-sc").nth(1).inner_text())
    pg.screenshot(path=os.path.join(OUT, "je_%s_graded.png" % tag), full_page=True)
    pg.click("#je-why-b")
    check(tag + " explanation revealed behind the button", pg.locator(".je-why:visible").count() == 2 and pg.locator("#je-expl:visible").count() == 1)
    pg.click("#je-t-b")
    pg.wait_for_selector(".je-t")
    check(tag + " T-accounts render", pg.locator(".je-t").count() >= 4, pg.locator(".je-t").count())
    pg.screenshot(path=os.path.join(OUT, "je_%s_taccounts.png" % tag), full_page=True)
    pg.click('[data-tv="you"]')
    check(tag + " T-accounts 'Yours' view", pg.locator(".je-t").count() >= 3)
    # new numbers: same type, statement should differ
    before = pg.locator(".je-stmt p").inner_text()
    pg.click("#je-again")
    pg.wait_for_selector(".je-set:not(.done)")
    after = pg.locator(".je-stmt p").inner_text()
    check(tag + " new numbers give a different variant", before != after)
    same = pg.evaluate("() => JE.state.v.tid")
    check(tag + " same transaction type kept", same == "KR-DEBT-04", same)
    # store: mastery record saved under the te. prefix
    st = pg.evaluate("() => JSON.parse(localStorage.getItem('mj.je.v1'))")
    check(tag + " progress saved (mj.je.v1)", "KR-DEBT-04" in st["t"] and st["t"]["KR-DEBT-04"]["n"] == 1, json.dumps(st["t"])[:100])
    # perfect run on a fresh single-set type -> box goes up, then due date set
    v = pg.evaluate("() => JSON.parse(JSON.stringify(JE.state.v))")
    fill_entry(pg, 0, [(l["a"], l["s"], l["v"]) for l in v["sets"][0]["lines"]], names)
    fill_entry(pg, 1, [(l["a"], l["s"], l["v"]) for l in v["sets"][1]["lines"]], names)
    pg.click("#je-check")
    pg.wait_for_selector(".je-sum.ok")
    check(tag + " perfect entry shows Correct", "정답" in pg.locator(".je-sum").inner_text())
    st = pg.evaluate("() => JSON.parse(localStorage.getItem('mj.je.v1'))")
    s = st["t"]["KR-DEBT-04"]
    check(tag + " spaced repetition: box up after a perfect run", s["n"] == 2 and s["ok"] == 1 and s["box"] >= 1 and s["due"], json.dumps(s))
    pg.screenshot(path=os.path.join(OUT, "je_%s_perfect.png" % tag), full_page=True)
    # 초성 검색과 화면 문구 규칙
    sr = pg.evaluate("() => [JE.search('ㅇㅅㅁㅊㄱ')[0].name, JE.search('ㅂㄱㅅㅇㅅㄱ')[0].name, JE.search('감가')[0].name, JE.search('외상ㅁㅊ')[0].name, JE.resolve('접대비'), JE.resolve('매출채권')]")
    check(tag + " 초성·동의어 검색", sr == ["외상매출금", "부가세예수금", "감가상각비", "외상매출금", "entertain", "ar"], sr)
    txt = pg.inner_text("body")
    check(tag + " 화면 문구: 느낌표·말줄임표·이모지 없음", not any(c in txt for c in "!…") and not any(ord(c) > 0x1F000 for c in txt))
    # quit -> speed sprint
    pg.click("#je-quit")
    pg.wait_for_selector(".je-seg")
    pg.click('[data-mode="speed"]')
    pg.click("#je-start")
    pg.wait_for_selector("#je-clock")
    check(tag + " sprint shows progress blocks", pg.locator(".stones i").count() == 5, pg.locator(".stones i").count())
    check(tag + " sprint has no hint button", pg.locator("[data-hint]").count() == 0)
    for k in range(5):
        pg.wait_for_selector("#je-check")
        pg.click("#je-check")
        pg.wait_for_selector("#je-next")
        pg.click("#je-next")
    pg.wait_for_selector(".je-bestline")
    check(tag + " sprint result screen", "스피드 결과" in pg.inner_text(".je-hd"))
    pg.screenshot(path=os.path.join(OUT, "je_%s_sprint.png" % tag), full_page=True)
    pg.click("#je-quit2")
    # review mode: the wrong runs are due today
    pg.wait_for_selector(".je-seg")
    due = pg.evaluate("() => JE.data.tpls.filter(t => JE.store.t[t.id] && JE.store.t[t.id].due && JE.store.t[t.id].due <= (new Date()).toISOString().slice(0,10) || JE.store.t[t.id] && JE.store.t[t.id].due === '').length")
    check(tag + " review counter renders", "복습" in pg.inner_text(".je-seg"), pg.inner_text(".je-seg").replace("\n", " "))
    # mobile layout: entry rows stack (account on its own line)
    if mobile:
        pg.goto(BASE + "je.html?t=KR-CASH-03")
        pg.wait_for_selector(".je-row")
        a = pg.locator(".je-row").first.locator(".je-a").bounding_box()
        d = pg.locator(".je-row").first.locator(".je-d").bounding_box()
        check(tag + " phone: account field above amounts (stacked)", d["y"] > a["y"] + a["height"] - 2, "%s %s" % (a, d))
        check(tag + " phone: no horizontal scroll", pg.evaluate("() => document.documentElement.scrollWidth <= innerWidth + 1"))
        pg.screenshot(path=os.path.join(OUT, "je_%s_entry_stacked.png" % tag), full_page=True)


def main():
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel="msedge")
        for tag, vp, mobile in (("desktop", {"width": 1280, "height": 900}, False), ("m375", {"width": 375, "height": 812}, True)):
            ctx = br.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile)
            pg = ctx.new_page()
            pg.on("console", lambda m, t=tag: errors.append((t, m.text)) if m.type == "error" else None)
            pg.on("pageerror", lambda e, t=tag: errors.append((t, str(e))))
            pg.goto(BASE + "je.html")
            pg.wait_for_selector(".je-tc")
            if tag == "desktop":
                twin_check(pg)
            ui_flow(pg, tag, mobile)
            ctx.close()
        br.close()
    check("console errors: 0", not errors, errors[:3])
    print("\nRESULT:", "PASS" if not fails else "FAIL %d" % len(fails))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
