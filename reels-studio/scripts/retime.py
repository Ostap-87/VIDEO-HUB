"""Переносит props ролика на новую шкалу времени после пересборки склейки (npm run cut … --segments) или вырезки куска.

  python3 scripts/retime.py props/имя.json старый.cut.json новый.cut.json [--video новый.cut.mp4]

Каждое время (слова субтитров, плашки, логотипы, цифры, перебивки, города, чек-листы, зумы, график, финал)
переводится: время ролика → момент исходника (по старому cut.json) → время ролика по новому cut.json.
Всё, что попало в вырезанный кусок, удаляется (слова) или прижимается к месту склейки (элементы) — это
печатается списком, проверь глазами. Исправленные вручную слова субтитров сохраняются.
cuts берётся из нового cut.json, speechSeconds — длина нового видео.
"""
import argparse
import json
import pathlib
import subprocess


def load(p):
    return json.loads(pathlib.Path(p).read_text())


def make_map(old, new):
    def to_src(t):
        if t < old[0]["out_start"]:  # слово чуть раньше нуля (Whisper даёт −0.02) — начало, а не конец ролика
            return old[0]["src_start"]
        for i, s in enumerate(old):
            end = old[i + 1]["out_start"] if i + 1 < len(old) else s["out_start"] + (s["src_end"] - s["src_start"])
            if s["out_start"] - 1e-6 <= t < end + 1e-6:
                return s["src_start"] + (t - s["out_start"])
        return old[-1]["src_end"]

    def to_new(raw):
        for s in new:
            if s["src_start"] - 0.02 <= raw <= s["src_end"] + 0.02:
                return min(max(s["out_start"] + (raw - s["src_start"]), s["out_start"]), s["out_start"] + s["src_end"] - s["src_start"]), True
        nxt = [s for s in new if s["src_start"] > raw]
        return (nxt[0]["out_start"] if nxt else new[-1]["out_start"] + new[-1]["src_end"] - new[-1]["src_start"]), False

    def f(t):
        v, ok = to_new(to_src(t))
        return round(v, 3), ok

    return f


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("props")
    ap.add_argument("old")
    ap.add_argument("new")
    ap.add_argument("--video")
    a = ap.parse_args()
    p = load(a.props)
    m = make_map(load(a.old), load(a.new))
    lost = []

    def T(t, what):
        v, ok = m(t)
        if not ok:
            lost.append(f"{t:7.2f} → {v:7.2f}  {what}")
        return v

    words = []
    for w in p["words"]:
        s, ok1 = m(w["start"])
        e, ok2 = m(w["end"])
        if not ok1 and not ok2:
            lost.append(f"{w['start']:7.2f}  слово вырезано: {w['text']}")
            continue
        words.append({"text": w["text"], "start": s, "end": max(e, s + 0.08)})
    for prev, w in zip(words, words[1:]):
        w["start"] = max(w["start"], prev["end"])
        w["end"] = round(max(w["end"], w["start"] + 0.08), 3)
    p["words"] = words
    p["cuts"] = [round(s["out_start"], 3) for s in load(a.new)[1:]]
    for g in p.get("chips", []):
        for it in g["items"]:
            it["at"] = T(it["at"], "плашка " + it["text"])
            if "strike" in it:
                it["strike"] = T(it["strike"], "зачёркивание " + it["text"])
        g["until"] = T(g["until"], "конец плашек")
    for g in p.get("logos", []):
        for it in g["items"]:
            it["at"] = T(it["at"], "логотип " + it["src"].split("/")[-1])
        g["until"] = T(g["until"], "конец логотипов")
    for key in ("numbers", "broll", "cities"):
        for x in p.get(key, []):
            x["at"] = T(x["at"], f"{key} {x.get('text') or x.get('name') or x.get('src', '').split('/')[-1]}")
            x["until"] = T(x["until"], f"конец {key}")
    for cl in p.get("checklists", []):
        for it in cl["items"]:
            it["at"] = T(it["at"], "пункт " + it["text"])
        cl["until"] = T(cl["until"], "конец чек-листа " + cl["title"])
    for z in p.get("zooms", []):
        z["at"] = T(z["at"], "зум")
    if p.get("stockDrop"):
        p["stockDrop"]["at"] = T(p["stockDrop"]["at"], "график")
        p["stockDrop"]["until"] = T(p["stockDrop"]["until"], "конец графика")
    for x in p.get("flags", []) or []:
        x["at"] = T(x["at"], "флаги")
        x["until"] = T(x["until"], "конец флагов")
    p["site"]["at"] = T(p["site"]["at"], "финал")
    if a.video:
        p["speechSeconds"] = round(float(subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.video])), 3)
    # пустые группы убираем
    p["chips"] = [g for g in p.get("chips", []) if g["until"] > g["items"][0]["at"] + 0.2]
    p["logos"] = [g for g in p.get("logos", []) if g["until"] > g["items"][0]["at"] + 0.2]
    p["broll"] = [b for b in p.get("broll", []) if b["until"] > b["at"] + 0.5]
    p["numbers"] = [n for n in p.get("numbers", []) if n["until"] > n["at"] + 0.3]
    pathlib.Path(a.props).write_text(json.dumps(p, ensure_ascii=False, indent=1))
    print(f"→ {a.props}: слов {len(words)}, speechSeconds {p['speechSeconds']}")
    for x in lost:
        print("  ! " + x)


if __name__ == "__main__":
    main()
