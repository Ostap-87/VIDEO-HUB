"""Reels из карусели Instagram: слайды карусели листаются сами под музыку (композиция CarouselReel, 1080×1920, 30 fps).
API Instagram не ставит музыку к каруселям — поэтому к карусели делаем Reels-версию (решение пользователя 12.10.2026).

  npm run carousel-reel -- 2026-10-12-foto-aura-intro                    # props/carousels/<имя>.json
  → finished-videos/<имя>-reels.mp4 и раскадровка finished-videos/раскадровки/<имя>-reels.jpg
  npm run carousel-reel -- <имя> --music inspiring-ambient-motivation-soundrider   # трек из library/music.json
  npm run carousel-reel -- <имя> --seconds 4      # одинаково на каждый слайд (без поля — по длине текста слайда)
  npm run carousel-reel -- <имя> --guides         # проверочный кадр: безопасная зона Reels и кадр ленты 4:5
  npm run carousel-reel -- <имя> --no-host        # Aura без живого робота-ведущего (робот остаётся картинкой на слайдах)

Aura по умолчанию — с роботом-ведущим (`host`): 3D-робот стоит справа под слайдом и «вытаскивает» каждый слайд (начиная
с первого) из-за правого края — вперёд, как листают карусель; после обложки машет, на финале показывает на кнопку и машет
на прощание; со слайдов робот-картинка убирается. Вступление ~3 с: большой робот машет, рядом робособака, за ними крутится
печать Aura Robotics; печать исчезает, робот с собакой уменьшаются и переходят под слайд. Первый кадр — обложка Reels.

Что делает: рендерит видео-версию слайдов (`"video": true` — без стрелки «листай») в finished-videos/frames/ (в git не идут),
пишет props/carousel-reels/<имя>-reels.json (секунды слайдов можно поправить там руками — при повторном запуске они
сохраняются, `--reset` пересчитывает) и рендерит ролик. Громкость музыки — к ~−15 LUFS (голоса нет, музыка — весь звук).
"""
import argparse
import json
import math
import pathlib
import re
import shutil
import subprocess
import sys

STUDIO = pathlib.Path(__file__).resolve().parent.parent
ROOT = STUDIO.parent
ap = argparse.ArgumentParser()
ap.add_argument("name", help="карусель: props/carousels/<имя>.json")
ap.add_argument("--music", default="upbeat-corporate-soundrider", help="трек из library/music.json")
ap.add_argument("--seconds", type=float, help="одинаково секунд на слайд (без поля — по длине текста)")
ap.add_argument("--guides", action="store_true", help="проверочный кадр с безопасной зоной Reels")
ap.add_argument("--reset", action="store_true", help="пересчитать секунды, даже если props уже есть")
ap.add_argument("--no-host", action="store_true", help="Aura без робота-ведущего")
a = ap.parse_args()
name = a.name.removesuffix(".json")
music_id, fixed, guides, reset = a.music, a.seconds, a.guides, a.reset

src_props = STUDIO / "props" / "carousels" / f"{name}.json"
reel_name = f"{name}-reels"
reel_props = STUDIO / "props" / "carousel-reels" / f"{reel_name}.json"
work = ROOT / "finished-videos" / "frames"
slides_dir = work / f"_carousel-reel-{name}"
out = ROOT / "finished-videos" / f"{reel_name}.mp4"
SFX = "source-videos/2026-10-07-byt-tehnika/sfx/whoosh.wav"  # whoosh из @remotion/sfx


def words(sl: dict) -> int:
    parts = [sl.get(k) or "" for k in ("kicker", "title", "text", "value", "button")] + list(sl.get("items") or [])
    return len(re.sub(r"\*\*", "", " ".join(parts)).split())


def seconds(sl: dict, first: bool, last: bool) -> float:
    # ~2 с на «увидеть» слайд + 0,11 с на слово, от 3,5 до 5,5 с; финал — на секунду дольше
    s = fixed if fixed else min(5.5, max(3.5, 2.0 + 0.11 * words(sl)))
    s = math.ceil(s * 2) / 2 + (1.0 if last else 0.0)
    if host and first:
        s += 1.0  # с роботом: вытащил первый слайд — успеть помахать
    return max(s, 6.0) if last and host else s  # с роботом на финале: показать на кнопку и помахать


def lufs(path: pathlib.Path) -> float:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1])


data = json.loads(src_props.read_text())
host = data["brand"] == "aura" and not a.no_host
data["video"] = True
if host:  # робот — живой, под слайдом; на самих слайдах его нет
    for sl in data["slides"]:
        sl["mascot"] = "none"
data.pop("guides", None)
work.mkdir(parents=True, exist_ok=True)
vprops = work / f"_carousel-reel-{name}.json"
vprops.write_text(json.dumps(data, ensure_ascii=False))
tmp = work / f"_carousel-reel-{name}-tmp"
shutil.rmtree(tmp, ignore_errors=True)
print(f"▶ слайды без «листай»: {len(data['slides'])} шт.")
subprocess.run(["./node_modules/.bin/remotion", "render", "src/index.ts", "Carousel", str(tmp), "--sequence", "--image-format=png",
                f"--props={vprops}", "--log=error"], check=True, cwd=STUDIO)
shutil.rmtree(slides_dir, ignore_errors=True)
slides_dir.mkdir(parents=True)
for i, f in enumerate(sorted(tmp.glob("*.png")), 1):
    shutil.move(str(f), slides_dir / f"{i:02d}.png")
shutil.rmtree(tmp, ignore_errors=True)
vprops.unlink()

lib = json.loads((STUDIO / "library" / "music.json").read_text())
track = lib[music_id]["src"]
vol = round(min(1.0, 10 ** ((-15 - lufs(ROOT / track)) / 20)), 2)
old = json.loads(reel_props.read_text()) if reel_props.exists() and not reset and not fixed else {}
old_secs = [s["seconds"] for s in old.get("slides", [])]
n = len(data["slides"])
secs = old_secs if len(old_secs) == n else [seconds(sl, i == 0, i == n - 1) for i, sl in enumerate(data["slides"])]
props = {
    "_": f"Reels из карусели props/carousels/{name}.json (scripts/carousel_reel.py). Секунды слайдов можно править здесь.",
    "brand": data["brand"],
    "slides": [{"src": str((slides_dir / f"{i:02d}.png").relative_to(ROOT)), "seconds": s} for i, s in enumerate(secs, 1)],
    "music": {"src": track, "volume": vol, "fadeOut": 1.6},
    "swipeSfx": SFX,
}
if host:
    props["host"] = True
if guides:
    props["guides"] = True
reel_props.parent.mkdir(parents=True, exist_ok=True)
if not guides:
    reel_props.write_text(json.dumps(props, ensure_ascii=False, indent=2) + "\n")
total = sum(secs)
print(f"▶ ролик {total:.1f} с: {', '.join(f'{s:g}' for s in secs)}; музыка {music_id}, громкость {vol}" + ("; робот-ведущий" if host else ""))

if guides:
    gp = work / f"_carousel-reel-{name}-зоны.json"
    gp.write_text(json.dumps(props, ensure_ascii=False))
    dst = work / f"{reel_name}-зоны.png"
    subprocess.run(["./node_modules/.bin/remotion", "still", "src/index.ts", "CarouselReel", str(dst), f"--props={gp}", "--frame=0", "--log=error"],
                   check=True, cwd=STUDIO)
    gp.unlink()
    print(f"проверочный кадр → {dst}")
    sys.exit(0)

subprocess.run(["./node_modules/.bin/remotion", "render", "src/index.ts", "CarouselReel", str(out), f"--props={reel_props}",
                "--crf=18", "--log=error"], check=True, cwd=STUDIO)
subprocess.run(["python3", "scripts/frames.py", str(out), "--every", "2"], check=True, cwd=STUDIO, capture_output=True)
board = ROOT / "finished-videos" / "раскадровки" / f"{reel_name}.jpg"
board.parent.mkdir(parents=True, exist_ok=True)
shutil.copy(work / f"{reel_name}.jpg", board)
mb = out.stat().st_size / 1e6
print(f"REELS {out.relative_to(ROOT)} ({total + (4.05 if host else 0):.1f} с, {mb:.1f} МБ), раскадровка {board.relative_to(ROOT)}")
