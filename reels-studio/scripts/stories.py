"""Режет готовый ролик на части для Instagram Stories (одна история — до 60 с).

  python3 scripts/stories.py ../finished-videos/имя-stories.mp4 --at 58.3
  → ../finished-videos/имя-stories-1.mp4, имя-stories-2.mp4 …

--at — точки разреза в секундах (через запятую), ставь на конец фразы (по словам из _work/имя.cut.words.json).
Без --at режет ровно по 59 с.
"""
import argparse
import pathlib
import subprocess


def duration(path):
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]).decode())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--at", default="")
    a = ap.parse_args()
    src = pathlib.Path(a.video).resolve()
    total = duration(src)
    cuts = [float(x) for x in a.at.split(",") if x] or [59.0 * i for i in range(1, int(total // 59) + 1)]
    bounds = [0.0] + [c for c in cuts if 0 < c < total] + [total]
    for i, (s, e) in enumerate(zip(bounds, bounds[1:]), 1):
        if e - s > 60:
            raise SystemExit(f"часть {i} длиннее 60 с ({e - s:.1f} с) — добавь точку разреза")
        out = src.with_name(f"{src.stem}-{i}.mp4")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{s}", "-to", f"{e}", "-i", str(src),
                        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
        print(f"{out.name}: {s:.1f}–{e:.1f} с")


if __name__ == "__main__":
    main()
