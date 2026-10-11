"""Сторис-анонсы каруселей Instagram: 1080×1920, обложка карусели стопкой на фоне бренда (композиция StoryAnnounce).

  npm run announce -- 2026-11-gtt            # props/announces/2026-11-gtt.json
  → finished-videos/анонсы/2026-11-gtt/01.png, 02.png … и лист _лист.jpg
  npm run announce -- 2026-11-gtt --guides   # то же с безопасной зоной Stories (лист _лист-зоны.jpg, слайды — в frames/)

Файл: {"brand": "gtt" | "aura", "stories": [{"cover", "back": [...], "kicker", "title", "note"}]}, примеры —
props/announces/пример-gtt.json и пример-aura.json. Кредитов не тратит: картинки — готовые слайды каруселей.
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
props = STUDIO / "props" / "announces" / f"{name}.json"
out = STUDIO.parent / "finished-videos" / "анонсы" / name
work = STUDIO.parent / "finished-videos" / "frames"  # черновики, в git не идут


def render(props_path: pathlib.Path, dst: pathlib.Path) -> list[pathlib.Path]:
    tmp = work / f"_announce-{dst.name}-tmp"
    shutil.rmtree(tmp, ignore_errors=True)
    subprocess.run(["./node_modules/.bin/remotion", "render", "src/index.ts", "StoryAnnounce", str(tmp), "--sequence", "--image-format=png",
                    f"--props={props_path}", "--log=error"], check=True, cwd=STUDIO)
    dst.mkdir(parents=True, exist_ok=True)
    for old in dst.glob("[0-9]*.png"):
        old.unlink()
    for i, f in enumerate(sorted(tmp.glob("*.png")), 1):
        shutil.move(str(f), dst / f"{i:02d}.png")
    shutil.rmtree(tmp, ignore_errors=True)
    return sorted(dst.glob("[0-9]*.png"))


def sheet(paths: list[pathlib.Path], dst: pathlib.Path, cols: int = 6) -> None:
    w, h = 360, 640
    rows = (len(paths) + cols - 1) // cols
    s = Image.new("RGB", (w * min(cols, len(paths)), h * rows), "white")
    for i, p in enumerate(paths):
        s.paste(Image.open(p).convert("RGB").resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
    s.save(dst, quality=85)


if guides:
    data = json.loads(props.read_text())
    data["guides"] = True
    work.mkdir(parents=True, exist_ok=True)
    gprops = work / f"_announce-{name}-зоны.json"
    gprops.write_text(json.dumps(data, ensure_ascii=False))
    paths = render(gprops, work / f"_announce-{name}-зоны")
    gprops.unlink()
    out.mkdir(parents=True, exist_ok=True)
    sheet(paths, out / "_лист-зоны.jpg")
    print(f"{len(paths)} анонсов с безопасной зоной → {out / '_лист-зоны.jpg'}")
else:
    paths = render(props, out)
    sheet(paths, out / "_лист.jpg")
    print(f"{len(paths)} анонсов → {out}")
