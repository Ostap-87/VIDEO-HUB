"""Обложка Reels: рендер кадра ReelCover и вставка его в самое начало ролика (решение пользователя 14.10.2026).

  python3 scripts/cover.py <имя>                 # props/covers/<имя>.json + finished-videos/<имя>.mp4
  python3 scripts/cover.py <имя> --video ../finished-videos/другой.mp4 --seconds 1
  python3 scripts/cover.py <имя> --still-only    # только картинка обложки

Результат:
  finished-videos/обложки/<имя>.jpg          — обложка 1080×1920 (её же можно дать публикатору как cover_url);
  finished-videos/<имя>-cover.mp4            — ролик, у которого первая секунда — обложка (звук сдвинут, в начале тишина);
  finished-videos/frames/_cover-<имя>.jpg    — проверка: обложка, стык и кадр через секунду после стыка (в git не идёт).
"""
import argparse
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO = ROOT.parent
FIN = REPO / "finished-videos"


def run(cmd, **kw):
    print("▶", " ".join(str(c) for c in cmd[:6]), "…" if len(cmd) > 6 else "", flush=True)
    subprocess.run(cmd, check=True, **kw)


def probe(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,sample_rate,channels:format=duration",
                                   "-of", "json", str(path)])
    return json.loads(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--video", help="ролик, в начало которого ставим обложку (по умолчанию finished-videos/<имя>.mp4)")
    ap.add_argument("--seconds", type=float, default=1.0, help="сколько держится обложка в начале, с")
    ap.add_argument("--crf", type=int, default=17)
    ap.add_argument("--still-only", action="store_true")
    a = ap.parse_args()

    props = ROOT / "props" / "covers" / f"{a.name}.json"
    if not props.exists():
        sys.exit(f"нет {props}")
    (FIN / "обложки").mkdir(parents=True, exist_ok=True)
    png = FIN / "frames" / f"_cover-{a.name}.png"
    png.parent.mkdir(parents=True, exist_ok=True)
    run(["npx", "remotion", "still", "src/index.ts", "ReelCover", str(png), f"--props={props}", "--log=error"], cwd=ROOT)
    jpg = FIN / "обложки" / f"{a.name}.jpg"
    run(["ffmpeg", "-v", "error", "-y", "-i", str(png), "-q:v", "2", str(jpg)])
    print("COVER", jpg.relative_to(REPO))
    if a.still_only:
        return

    video = pathlib.Path(a.video).resolve() if a.video else FIN / f"{a.name}.mp4"
    info = probe(video)
    audio = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    out = FIN / f"{a.name}-cover.mp4"
    sec = a.seconds
    if audio:
        sr, ch = audio.get("sample_rate", "48000"), audio.get("channels", 2)
        layout = "stereo" if int(ch) == 2 else "mono"
        filt = (f"[0:v]scale=1080:1920,format=yuvj420p,setsar=1,fps=30[c];[2:v]format=yuvj420p,setsar=1,fps=30[v];"
                f"[c][1:a][v][2:a]concat=n=2:v=1:a=1[vo][ao]")
        cmd = ["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", "30", "-t", str(sec), "-i", str(png),
               "-f", "lavfi", "-t", str(sec), "-i", f"anullsrc=r={sr}:cl={layout}", "-i", str(video),
               "-filter_complex", filt, "-map", "[vo]", "-map", "[ao]",
               "-c:v", "libx264", "-preset", "medium", "-crf", str(a.crf), "-pix_fmt", "yuvj420p",
               "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", str(out)]
    else:
        filt = "[0:v]scale=1080:1920,format=yuvj420p,setsar=1,fps=30[c];[1:v]format=yuvj420p,setsar=1,fps=30[v];[c][v]concat=n=2:v=1:a=0[vo]"
        cmd = ["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", "30", "-t", str(sec), "-i", str(png), "-i", str(video),
               "-filter_complex", filt, "-map", "[vo]", "-c:v", "libx264", "-preset", "medium", "-crf", str(a.crf),
               "-pix_fmt", "yuvj420p", "-movflags", "+faststart", str(out)]
    run(cmd)
    d_in = float(info["format"]["duration"])
    d_out = float(probe(out)["format"]["duration"])
    print(f"REEL {out.relative_to(REPO)}  {d_in:.2f} с → {d_out:.2f} с")
    # проверочный лист: обложка, последний кадр обложки, первый кадр ролика, +1 с
    sheet = FIN / "frames" / f"_cover-{a.name}.jpg"
    ts = [0.0, sec - 0.04, sec + 0.04, sec + 1.0]
    tiles = []
    for i, t in enumerate(ts):
        f = FIN / "frames" / f"_cover-{a.name}-{i}.jpg"
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(out), "-frames:v", "1", "-vf", "scale=360:-1", str(f)])
        tiles.append(str(f))
    run(["ffmpeg", "-v", "error", "-y", *sum([["-i", t] for t in tiles], []), "-filter_complex", f"hstack=inputs={len(tiles)}", str(sheet)])
    for t in tiles:
        pathlib.Path(t).unlink()
    print("SHEET", sheet.relative_to(REPO))


if __name__ == "__main__":
    main()
