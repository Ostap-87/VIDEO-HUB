"""Рендер карусели Instagram: все слайды в PNG 1080×1350 + общий лист для просмотра.

  npm run carousel -- 2026-10-10-zavody          # props/carousels/2026-10-10-zavody.json
  → finished-videos/карусели/2026-10-10-zavody/01.png, 02.png … и лист _лист.jpg

Файл карусели: {"brand": "gtt" | "aura", "slides": [...]}, примеры — props/carousels/пример-gtt.json и пример-aura.json.
"""
import json
import pathlib
import shutil
import subprocess
import sys

from PIL import Image

STUDIO = pathlib.Path(__file__).resolve().parent.parent
name = sys.argv[1].removesuffix(".json")
props = STUDIO / "props" / "carousels" / f"{name}.json"
out = STUDIO.parent / "finished-videos" / "карусели" / name
tmp = STUDIO.parent / "finished-videos" / "frames" / f"_carousel-{name}"
shutil.rmtree(tmp, ignore_errors=True)
subprocess.run(["./node_modules/.bin/remotion", "render", "src/index.ts", "Carousel", str(tmp), "--sequence", "--image-format=png",
                f"--props={props}", "--log=error"], check=True, cwd=STUDIO)
out.mkdir(parents=True, exist_ok=True)
for old in out.glob("*.png"):
    old.unlink()
frames = sorted(tmp.glob("*.png"))
for i, f in enumerate(frames, 1):
    shutil.move(str(f), out / f"{i:02d}.png")
shutil.rmtree(tmp, ignore_errors=True)
ims = [Image.open(p) for p in sorted(out.glob("[0-9]*.png"))]
w = 540
sheet = Image.new("RGB", (w * len(ims), 675), "white")
for i, im in enumerate(ims):
    sheet.paste(im.convert("RGB").resize((w, 675)), (i * w, 0))
sheet.save(out / "_лист.jpg", quality=85)
print(f"{len(ims)} слайдов → {out}")
