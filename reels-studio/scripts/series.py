"""Серия Stories ostapdotcenko по плану props/od-варианты/серия.json (решение пользователя 15.10.2026).

  python3 scripts/series.py [--plan props/od-варианты/серия.json] [--matte]

Для каждой части плана (по порядку серии) пишет в props/<имя>.json:
- `episode` — «часть N/10 · тема» под печатью ОД и финальная карточка «Дальше → часть N+1» (в последней — все ссылки);
- `hooks` — эффекты-хуки за спикером (wall / behind / mix / words, components/HookTitle.tsx);
- `fx` — заливка цветом из угла (wipe) и ч/б → цвет (bw), components/SeriesFx.tsx;
- вставки по смыслу фраз: `chips`, `numbers`, `flags` (флаги — коды стран из `flagsDir`);
- `screens` — если в части задан свой список [медиа, от, до] (медиа из props/od-варианты/план-экранов.json);
- `captionStyle: "3d"` (3D-субтитры), `ctaSeconds` 2,4 с под финальную карточку, щелчок `sfx.click`;
- зумы — только вне экранов и хуков.
Печатает команды вырезки спикера на отрезки хуков; с --matte сразу их запускает (по очереди).
"""
import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
CLICK = "source-videos/2026-10-07-byt-tehnika/sfx/switch.wav"
OUTRO = 2.4


def merge(ranges):
    out = []
    for a, b in sorted(ranges):
        if out and a <= out[-1][1] + 0.3:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", default="props/od-варианты/серия.json")
    ap.add_argument("--screens-plan", default="props/od-варианты/план-экранов.json")
    ap.add_argument("--matte", action="store_true")
    a = ap.parse_args()
    plan = json.loads((ROOT / a.plan).read_text())
    media = json.loads((ROOT / a.screens_plan).read_text())["media"]
    eps = plan["episodes"]
    total = plan.get("total", len(eps))
    jobs = []
    for i, ep in enumerate(eps):
        pp = ROOT / "props" / f"{ep['name']}.json"
        p = json.loads(pp.read_text())
        nxt = eps[i + 1] if i + 1 < len(eps) else None
        p["episode"] = {"n": i + 1, "total": total, "title": ep["title"], **({"next": ep["next"], "nextN": i + 2} if nxt and ep.get("next") else {})}
        p["hooks"] = ep.get("hooks", [])
        p["fx"] = ep.get("fx", [])
        p["chips"] = ep.get("chips", [])
        p["numbers"] = ep.get("numbers", [])
        p["flags"] = [{**f, "items": [f"{plan['flagsDir']}/{c}.png" for c in f["items"]]} for f in ep.get("flags", [])]
        if "screens" in ep:
            old = p.get("screens", [])
            layout = old[0]["layout"] if old else "drop"
            screens = []
            for row in ep["screens"]:
                key, at, until = row[0], row[1], row[2]
                sc = {"at": at, "until": until, **media[key], "layout": layout}
                prev = next((s for s in old if s.get("src") == media[key]["src"] and "from" in s), None)
                if len(row) > 3:
                    sc["from"] = row[3]
                elif prev:
                    sc["from"] = prev["from"]
                screens.append(sc)
            p["screens"] = screens
        busy = [(s["at"] - 0.6, s["until"] + 0.3) for s in p.get("screens", [])] + [(h["at"] - 0.6, h["until"] + 0.3) for h in p["hooks"]]
        p["zooms"] = [z for z in p.get("zooms", []) if not any(x < z["at"] < y for x, y in busy)]
        p["captionStyle"] = "3d"
        p["ctaSeconds"] = OUTRO
        p["sfx"]["click"] = CLICK
        pp.write_text(json.dumps(p, ensure_ascii=False, indent=1))
        # точка разреза Stories из прежнего auto.json могла попасть на финальную карточку: часть до 59,5 с не режем
        auto = REPO / Path(p["mediaSrc"]).parent / f"{Path(p['mediaSrc']).name.split('.')[0]}.auto.json"
        if auto.exists():
            rep = json.loads(auto.read_text())
            total = p["speechSeconds"] + p["ctaSeconds"]
            cuts = [c for c in rep.get("storiesAt", []) if 20 < c < total - OUTRO - 3] if total > 59.5 else []
            if cuts != rep.get("storiesAt"):
                rep["storiesAt"] = cuts
                auto.write_text(json.dumps(rep, ensure_ascii=False, indent=1))
        ranges = merge([(max(0, h["at"] - 0.15), min(p["speechSeconds"], h["until"] + 0.15)) for h in p["hooks"]])
        rs = ",".join(f"{x:.2f}-{y:.2f}" for x, y in ranges)
        print(f"{i + 1}/{total} {ep['name']}: «{ep['title']}», хуков {len(p['hooks'])}, эффектов {len(p['fx'])}, вырезка {rs}")
        if ranges:
            jobs.append(["python3", "scripts/matte.py", str(REPO / p["mediaSrc"]), "--ranges", rs])
    if a.matte:
        for j in jobs:
            print("matte:", j[2])
            subprocess.run(j, cwd=ROOT, check=True)
    else:
        for j in jobs:
            print(" ".join(j))


if __name__ == "__main__":
    main()
