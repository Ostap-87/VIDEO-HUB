"""Склейка ролика из нескольких исходников: куски говорящей головы и перебивки встык → один ролик для TalkReelPro.

  python3 scripts/assemble.py ../source-videos/<папка>/монтаж.json

монтаж.json:
  {"name": "sany",                                  # → _work/<name>.joined.mp4, .joined.words.json, .segments.json
   "broll_volume": 0.28,                            # громкость звука перебивок (фон цеха, гид) — музыка ведёт
   "fix": {"Сани,": "SANY,"},                       # правка слов в субтитрах (бренды латиницей)
   "plan": [["th", "IMG_5624", 0.0, 11.4, "A1"],    # th — кусок _work/<клип>.cut.mp4 (после npm run cut: чистый голос,
            ["br", "IMG_5648", 0.4, 2.6, "I1"]]}    #      SDR, без пауз), секунды шкалы склейки клипа; br — исходник
                                                    #      <клип>.MOV/.mp4 папки (HDR → SDR, 1080×1920, 30 к/с)
Слова (субтитры) — только из кусков th: на перебивках субтитров нет. Длина каждого куска — целое число кадров, звук на
стыках с микрозатуханием 40 мс; склейка без перекодирования (concat), синхрон не плывёт.
Решение пользователя 25.10.2026 (ролик SANY): «субтитры только там, где я выступаю как говорящая голова, переходы между
роликами креативно обыгрывать» — стыки обыгрываются полями fx / zooms в props, границы кусков — в <name>.segments.json.
"""
import json
import pathlib
import shutil
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from cut_pauses import SDR_TAGS, hdr_filter  # noqa: E402

FPS = 30
ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", *SDR_TAGS,
       "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]


def source(folder: pathlib.Path, clip: str) -> pathlib.Path:
    for ext in (".MOV", ".mov", ".MP4", ".mp4", ".m4v"):
        if (folder / f"{clip}{ext}").exists():
            return folder / f"{clip}{ext}"
    raise SystemExit(f"нет исходника {clip} в {folder}")


def main():
    spec_f = pathlib.Path(sys.argv[1]).resolve()
    spec = json.loads(spec_f.read_text(encoding="utf-8"))
    D = spec_f.parent
    W = D / "_work"
    seg_dir = W / "seg"
    seg_dir.mkdir(parents=True, exist_ok=True)
    name, fix, vol = spec["name"], spec.get("fix", {}), spec.get("broll_volume", 0.28)
    pos, words, segs, files = 0.0, [], [], []
    for i, (kind, clip, a, b, label) in enumerate(spec["plan"]):
        n = round((b - a) * FPS)
        dur = n / FPS
        out = seg_dir / f"{i:02d}-{label}.mp4"
        fade = f"afade=t=in:d=0.04,afade=t=out:st={dur - 0.04:.3f}:d=0.04"
        if kind == "th":
            src = W / f"{clip}.cut.mp4"
            vf, af = "fps=30,format=yuv420p", f"atrim=duration={dur:.4f},{fade}"
        else:
            src = source(D, clip)
            hdr = hdr_filter(src)
            vf = f"{hdr + ',' if hdr else ''}scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,format=yuv420p"
            af = f"volume={vol},atrim=duration={dur:.4f},{fade}"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-i", str(src), "-frames:v", str(n),
                        "-vf", vf, "-af", af, *ENC, str(out)], check=True)
        if kind == "th":
            for w in json.loads((W / f"{clip}.cut.words.json").read_text(encoding="utf-8")):
                if a - 0.02 <= w["start"] < b - 0.08:
                    words.append({"text": fix.get(w["text"], w["text"]), "start": round(pos + max(0, w["start"] - a), 3),
                                  "end": round(pos + min(dur, w["end"] - a), 3)})
        segs.append({"label": label, "kind": kind, "src": clip, "from": a, "to": round(a + dur, 3),
                     "at": round(pos, 3), "until": round(pos + dur, 3)})
        files.append(out)
        pos += dur
    lst = W / f"{name}.seg.txt"
    lst.write_text("".join(f"file '{f}'\n" for f in files))
    joined = W / f"{name}.joined.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
                    "-movflags", "+faststart", str(joined)], check=True)
    (W / f"{name}.joined.words.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
    (W / f"{name}.segments.json").write_text(json.dumps(segs, ensure_ascii=False, indent=1), encoding="utf-8")
    shutil.rmtree(seg_dir, ignore_errors=True)
    lst.unlink(missing_ok=True)
    print(f"склейка {pos:.2f} с, слов {len(words)}, кусков {len(segs)} → {joined}")
    for s in segs:
        print(f"  {s['at']:7.2f}–{s['until']:7.2f}  {s['label']:5s} {s['kind']} {s['src']} {s['from']}–{s['to']}")


if __name__ == "__main__":
    main()
