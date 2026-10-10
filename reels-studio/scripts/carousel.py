"""Рендер карусели Instagram: все слайды в PNG 1080×1350 + общий лист для просмотра.

  npm run carousel -- 2026-10-10-zavody          # props/carousels/2026-10-10-zavody.json
  → finished-videos/карусели/2026-10-10-zavody/01.png, 02.png … и лист _лист.jpg

  npm run carousel -- 2026-10-10-zavody --guides # проверочная версия: поля безопасности (72 / 64 px), квадрат 1:1
  → лист _лист-зоны.jpg в той же папке (сами слайды с разметкой — finished-videos/frames/_carousel-<имя>-зоны/,
    в git не идут) и итог проверки по каждому слайду в терминале

Файл карусели: {"brand": "gtt" | "aura", "slides": [...]}, примеры — props/carousels/пример-gtt.json, пример-aura.json
(текстовые слайды) и пример-фото-gtt.json, пример-фото-aura.json (фото-слайды).
"""
import json
import pathlib
import shutil
import subprocess
import sys

from PIL import Image

STUDIO = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith("--")]
guides = "--guides" in sys.argv[1:]
name = args[0].removesuffix(".json")
props = STUDIO / "props" / "carousels" / f"{name}.json"
out = STUDIO.parent / "finished-videos" / "карусели" / name
work = STUDIO.parent / "finished-videos" / "frames"  # черновики, в git не идут


def render(props_path: pathlib.Path, dst: pathlib.Path) -> list[pathlib.Path]:
    tmp = work / f"_carousel-{dst.name}-tmp"
    shutil.rmtree(tmp, ignore_errors=True)
    subprocess.run(["./node_modules/.bin/remotion", "render", "src/index.ts", "Carousel", str(tmp), "--sequence", "--image-format=png",
                    f"--props={props_path}", "--log=error"], check=True, cwd=STUDIO)
    dst.mkdir(parents=True, exist_ok=True)
    for old in dst.glob("[0-9]*.png"):
        old.unlink()
    frames = sorted(tmp.glob("*.png"))
    for i, f in enumerate(frames, 1):
        shutil.move(str(f), dst / f"{i:02d}.png")
    shutil.rmtree(tmp, ignore_errors=True)
    return sorted(dst.glob("[0-9]*.png"))


def sheet(paths: list[pathlib.Path], dst: pathlib.Path) -> None:
    ims = [Image.open(p) for p in paths]
    w = 540
    s = Image.new("RGB", (w * len(ims), 675), "white")
    for i, im in enumerate(ims):
        s.paste(im.convert("RGB").resize((w, 675), Image.LANCZOS), (i * w, 0))
    s.save(dst, quality=85)


if guides:
    data = json.loads(props.read_text())
    data["guides"] = True
    work.mkdir(parents=True, exist_ok=True)
    gprops = work / f"_carousel-{name}-зоны.json"
    gprops.write_text(json.dumps(data, ensure_ascii=False))
    zdir = work / f"_carousel-{name}-зоны"
    paths = render(gprops, zdir)
    gprops.unlink()
    out.mkdir(parents=True, exist_ok=True)
    sheet(paths, out / "_лист-зоны.jpg")
    # итог проверки — по цвету плашки внизу слайда (зелёная — в норме, красная — есть нарушения)
    bad = []
    for i, p in enumerate(paths, 1):
        im = Image.open(p).convert("RGB")
        px = [im.getpixel((x, 1298)) for x in range(440, 640, 4)]
        r = sum(c[0] for c in px) / len(px)
        g = sum(c[1] for c in px) / len(px)
        ok = g > r
        print(f"  слайд {i}: {'в норме' if ok else 'НАРУШЕНИЯ — смотри ' + str(p)}")
        if not ok:
            bad.append(i)
    print(f"{len(paths)} слайдов с разметкой → {out / '_лист-зоны.jpg'}" + (f"; нарушения на слайдах {bad}" if bad else "; нарушений нет"))
else:
    paths = render(props, out)
    sheet(paths, out / "_лист.jpg")
    print(f"{len(paths)} слайдов → {out}")
