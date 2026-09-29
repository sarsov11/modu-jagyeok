# -*- coding: utf-8 -*-
"""분개 드릴 자료 만들기: data/je_kr.js (전산회계 분개 드릴).

  py tools/build_je_kr.py [원천폴더]

원천폴더 기본값: ../wt-jekr/jobs/je-kr (cloud-work 작업 사본. je_coa_kr.json + je_kr_*.json).
window.JE_DATA = {v, built, coa[], topics[], tpls[]} 를 쓴다. 유형은 정답이 아니라 생성 규칙만 담고,
브라우저(js/je.js)가 무한 변형을 만든다. 저장된 정답은 없다.
"""
import glob, json, os, re, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_SRC = os.path.normpath(os.path.join(ROOT, "..", "wt-jekr", "jobs", "je-kr"))
src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
out = os.path.join(ROOT, "data", "je_kr.js")

ORDER = ["goods", "vat", "cash", "note", "bad", "ppe", "intang", "misc", "payroll", "debt", "equity", "adjust", "sec"]


def main():
    coa = json.load(open(os.path.join(src, "je_coa_kr.json"), encoding="utf-8"))["coa"]
    ids = {a["id"] for a in coa}
    topics, tpls = [], []
    for fp in glob.glob(os.path.join(src, "je_kr_*.json")):
        d = json.load(open(fp, encoding="utf-8"))
        slug = re.sub(r"^je_kr_|\.json$", "", os.path.basename(fp))
        tids = []
        for t in d["templates"]:
            for s in t["sets"]:
                for l in s["lines"]:
                    if l["a"] not in ids:
                        sys.exit("모르는 계정 %s (%s)" % (l["a"], t["id"]))
            t = dict(t)
            t["topic"] = slug
            tpls.append(t)
            tids.append(t["id"])
        topics.append({"id": slug, "name": d["topic"], "ids": tids})
    topics.sort(key=lambda x: ORDER.index(x["id"]) if x["id"] in ORDER else 99)
    data = {"v": 1, "built": datetime.date.today().isoformat(), "coa": coa, "topics": topics, "tpls": tpls}
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* tools/build_je_kr.py 가 je_kr_*.json 에서 만든 파일. 손으로 고치지 않는다. */\nwindow.JE_DATA=" + body + ";\n")
    print("wrote %s: 유형 %d, 주제 %d, 계정 %d, %.0f KB" % (out, len(tpls), len(topics), len(coa), os.path.getsize(out) / 1024))


if __name__ == "__main__":
    main()
