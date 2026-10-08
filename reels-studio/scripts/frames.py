"""Нарезка кадров из ролика в одну картинку-раскадровку с таймкодами.

  python3 scripts/frames.py ../finished-videos/имя.mp4            # кадр каждую секунду
  python3 scripts/frames.py ../finished-videos/имя.mp4 --every 2  # каждые 2 секунды
  python3 scripts/frames.py ../finished-videos/имя.mp4 --at 0.5,3,7.2

Результат: ../finished-videos/frames/имя.jpg (раскадровка) и отдельные кадры рядом.
Нужны ffmpeg и Pillow.
"""
import argparse
import json
import pathlib
import subprocess

from PIL import Image, ImageDraw, ImageFont


def duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)]
    )
    return float(json.loads(out)["format"]["duration"])


def grab(path, t, dst):
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{t:.3f}", "-i", str(path),
         "-frames:v", "1", "-vf", "scale=360:-2", str(dst)],
        check=True,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--every", type=float, default=1.0)
    ap.add_argument("--at", default="")
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--out", help="куда сохранить лист (по умолчанию <папка видео>/frames/<имя>.jpg)")
    a = ap.parse_args()

    video = pathlib.Path(a.video)
    out_dir = (pathlib.Path(a.out).parent / pathlib.Path(a.out).stem) if a.out else video.parent / "frames" / video.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    if a.at:
        times = [float(x) for x in a.at.split(",")]
    else:
        total = duration(video)
        times, t = [], 0.0
        while t < total - 0.05:
            times.append(t)
            t += a.every

    shots = []
    for t in times:
        dst = out_dir / f"{t:06.2f}s.jpg"
        grab(video, t, dst)
        shots.append((t, Image.open(dst)))

    w, h = shots[0][1].size
    label = 34
    cols = min(a.cols, len(shots))
    rows = (len(shots) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * (h + label)), "#17171D")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
    for i, (t, im) in enumerate(shots):
        x, y = (i % cols) * w, (i // cols) * (h + label)
        sheet.paste(im, (x, y + label))
        draw.text((x + 10, y + 5), f"{int(t // 60)}:{t % 60:05.2f}", fill="#FFFFFF", font=font)

    dst = pathlib.Path(a.out) if a.out else video.parent / "frames" / f"{video.stem}.jpg"
    sheet.save(dst, quality=85)
    print(dst)


if __name__ == "__main__":
    main()
