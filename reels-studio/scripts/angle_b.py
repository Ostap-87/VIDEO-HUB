"""Второй ракурс (вторая камера той же записи): режет его по тем же кускам, что и основное видео.

  python3 scripts/angle_b.py ../source-videos/папка/clip-2.mov ../source-videos/папка/_work/clip.cut.json
  python3 scripts/angle_b.py … --offset 0.232     # сдвиг вручную (секунды: время Б = время А − offset)

Без --offset сдвиг ищется сам по звуку (взаимная корреляция первых 80 с).
Результат: _work/clip.cut.b.mp4 (без звука, кадр в кадр с clip.cut.mp4) — в props `angleB.src`,
а в `angleB.shots` — отрезки, где показывать боковой план.
"""
import argparse
import json
import pathlib
import subprocess
import wave

import numpy as np

FPS = 30


def pcm(path, sr=8000):
    tmp = pathlib.Path("/tmp") / (pathlib.Path(path).stem + ".sync.wav")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(path), "-vn", "-ac", "1", "-ar", str(sr), "-t", "80", str(tmp)], check=True)
    with wave.open(str(tmp)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float)
    return x / (np.abs(x).max() + 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video_b")
    ap.add_argument("cut_json")
    ap.add_argument("--offset", type=float)
    a = ap.parse_args()
    cut = pathlib.Path(a.cut_json).resolve()
    stem = cut.name.replace(".cut.json", "")
    raw_a = next(p for p in cut.parent.parent.iterdir() if p.stem == stem and p.suffix.lower() in (".mov", ".mp4"))
    if a.offset is None:
        x, y = pcm(raw_a), pcm(a.video_b)
        n = 1 << int(np.ceil(np.log2(len(x) + len(y))))
        c = np.fft.irfft(np.fft.rfft(x, n) * np.conj(np.fft.rfft(y, n)), n)
        k = int(np.argmax(c))
        k = k - n if k > n // 2 else k
        a.offset = k / 8000
    print(f"сдвиг: время Б = время А − {a.offset:.3f} с")
    plan = json.loads(cut.read_text())
    tmp = cut.parent / "_parts_b"
    tmp.mkdir(exist_ok=True)
    lines = []
    for i, s in enumerate(plan):
        n = round((s["src_end"] - s["src_start"]) * FPS)
        start = max(0.0, s["src_start"] - a.offset)
        part = tmp / f"{i:03d}.mkv"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{start:.4f}", "-i", a.video_b, "-an", "-vf", f"fps={FPS}",
                        "-frames:v", str(n), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", str(part)], check=True)
        lines.append(f"file '{part.as_posix()}'")
    (tmp / "list.txt").write_text("\n".join(lines))
    out = cut.parent / f"{stem}.cut.b.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"), "-c:v", "copy",
                    "-movflags", "+faststart", str(out)], check=True)
    for f in tmp.iterdir():
        f.unlink()
    tmp.rmdir()
    print(out)


if __name__ == "__main__":
    main()
