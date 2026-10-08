"""Пересборка готового ролика: точная склейка + студийный звук + вырезки, props переносятся на новую шкалу.

  python3 scripts/rebuild.py 2026-10-07-intro intro --cut 52.47-52.89
  python3 scripts/rebuild.py 2026-10-07-avto avto

--cut — что вырезать, в секундах ГОТОВОГО ролика (как пользователь называет время), через запятую.
Первая пересборка сохраняет старую склейку в _work/<клип>.cut.v1.json и props в _work/<клип>.props.v1.json;
повторный запуск всегда идёт от сохранённой v1 (вырезки не копятся). После — пересчитать вырезку спикера.
"""
import argparse
import json
import pathlib
import shutil
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
STUDIO = ROOT / "reels-studio"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("clip")
    ap.add_argument("--cut", default="")
    a = ap.parse_args()
    props = STUDIO / "props" / f"{a.name}.json"
    work = (ROOT / json.loads(props.read_text())["mediaSrc"]).parent  # папка исходника — по пути видео в props
    folder = work.parent
    v1, pv1 = work / f"{a.clip}.cut.v1.json", work / f"{a.clip}.props.v1.json"
    if not v1.exists():
        shutil.copyfile(work / f"{a.clip}.cut.json", v1)
    if not pv1.exists():
        shutil.copyfile(props, pv1)
    shutil.copyfile(pv1, props)  # всегда от исходной версии
    plan = json.loads(v1.read_text())

    def to_src(t):
        for i, s in enumerate(plan):
            end = plan[i + 1]["out_start"] if i + 1 < len(plan) else 1e9
            if s["out_start"] <= t < end:
                return s["src_start"] + (t - s["out_start"])
        return plan[-1]["src_end"]

    drops = []
    for r in filter(None, a.cut.split(",")):
        x, y = map(float, r.split("-"))
        drops.append(f"{to_src(x):.3f}-{to_src(y):.3f}")
    raw = next(p for p in folder.iterdir() if p.stem == a.clip and p.suffix.lower() in (".mov", ".mp4", ".m4v"))
    subprocess.run(["python3", "scripts/cut_pauses.py", str(raw), "--segments", str(v1), "--drop", ",".join(drops)], check=True, cwd=STUDIO)
    subprocess.run(["python3", "scripts/retime.py", str(props), str(v1), str(work / f"{a.clip}.cut.json"),
                    "--video", str(work / f"{a.clip}.cut.mp4")], check=True, cwd=STUDIO)


if __name__ == "__main__":
    main()
