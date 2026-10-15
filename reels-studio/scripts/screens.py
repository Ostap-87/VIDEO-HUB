"""«Экраны» сайтов и каналов в говорящую голову по плану (Stories ostapdotcenko, версия 2, решение пользователя 14.10.2026).

  python3 scripts/screens.py <имя> [<имя> …] --plan props/od-варианты/план-экранов.json --layout drop|bottom|full

План — JSON: `media` (короткое имя → src, title, url, network, icon) и `videos.<имя>.screens` — список
[медиа, от, до, (с какой секунды видео прокрутки)]; `end` — где закончить ролик (вырезать оговорку в конце).
Что делает с props/<имя>.json (прежний вариант сохраняется один раз в _work/<клип>.props.v1.json):
- ставит `screens` с выбранной подачей; плашки, логотипы, цифры, перебивки, карточки каналов, стрелки, чек-листы,
  города и графики убирает (лицо ничем не закрывается — экраны вместо них);
- Stories, субтитры 52 px (`captionSize`), `captionTop` 1490, без финала с сайтом (экраны его заменяют);
- зумы оставляет только вне экранов.
Для `full` нужна вырезка спикера на отрезки экранов: скрипт печатает команду `npm run matte -- … --ranges …`.
"""
import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
CLEAR = ["chips", "logos", "numbers", "broll", "cities", "checklists", "socials", "arrows", "socialGrid", "clips", "flags", "bgFlags"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="+")
    ap.add_argument("--plan", required=True)
    ap.add_argument("--layout", required=True, choices=["drop", "bottom", "full"])
    a = ap.parse_args()
    plan = json.loads((ROOT / a.plan).read_text() if not Path(a.plan).is_absolute() else Path(a.plan).read_text())
    for name in a.names:
        pp = ROOT / "props" / f"{name}.json"
        p = json.loads(pp.read_text())
        v = plan["videos"][name]
        clip = Path(p["mediaSrc"]).name.split(".")[0]
        work = REPO / Path(p["mediaSrc"]).parent
        backup = work / f"{clip}.props.v1.json"
        if not backup.exists():
            shutil.copy(pp, backup)
        end = v.get("end")
        if end is not None:
            p["words"] = [w for w in p["words"] if w["start"] < end]
            p["speechSeconds"] = end
            p["ctaSeconds"] = 0.3
        else:
            p["ctaSeconds"] = 0.5
        total = p["speechSeconds"] + p["ctaSeconds"]
        screens = []
        for row in v["screens"]:
            key, at, until = row[0], row[1], min(row[2], total)
            sc = {"at": at, "until": until, **plan["media"][key], "layout": a.layout}
            if len(row) > 3:
                sc["from"] = row[3]
            screens.append(sc)
        for k in CLEAR:
            if k in p:
                p[k] = []
        p["screens"] = screens
        p["zooms"] = [z for z in p.get("zooms", []) if not any(s["at"] - 0.6 < z["at"] < s["until"] + 0.3 for s in screens)]
        p["format"] = "stories"
        p["captionSize"] = 52
        p["captionTop"] = 1490  # ниже подбородка: титры не налезают на лицо (решение пользователя 15.10.2026)
        p["site"]["at"] = round(p["speechSeconds"] + 30, 3)  # финал с сайтом не нужен — экраны его заменяют
        pp.write_text(json.dumps(p, ensure_ascii=False, indent=1))
        ranges = ",".join(f"{s['at'] - 0.2:.1f}-{s['until'] + 0.1:.1f}" for s in screens)
        print(f"{name}: экранов {len(screens)}, подача {a.layout}, длина {total:.1f} с" + (f"; вырезка: npm run matte -- ../{p['mediaSrc']} --ranges {ranges}" if a.layout == "full" and screens else ""))


if __name__ == "__main__":
    main()
