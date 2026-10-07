"""Вырезает паузы из «говорящей головы» и чистит звук.

  python3 scripts/cut_pauses.py ../source-videos/папка/clip.MOV
  python3 scripts/cut_pauses.py ../source-videos/папка/clip.MOV --min-pause 0.35 --keep 0.12 --words clip.words.json

Что делает:
1. Звук: срез гула ниже 80 Гц, шумоподавление, компрессия, громкость ~-14 LUFS (норма Instagram).
2. Находит паузы длиннее --min-pause секунд (тише --threshold дБ) и вырезает их,
   оставляя по --keep секунд тишины по краям, чтобы речь не обрывалась.
3. Пишет в папку исходника `_work/`:
   - имя.cut.mp4 — склеенное видео (H.264, 30 fps) с чистым звуком;
   - имя.cut.json — список оставленных кусков [{"src_start", "src_end", "out_start"}];
   - имя.cut.words.json — слова субтитров с пересчитанными таймингами (если передан --words).
Папка `_work/` в git не идёт.
"""
import argparse
import json
import pathlib
import re
import subprocess

AUDIO_CHAIN = (
    "highpass=f=80,lowpass=f=14000,afftdn=nr=14:nf=-50:tn=1,"
    "acompressor=threshold=-24dB:ratio=3:attack=10:release=150:makeup=4,"
    "volume=2.6dB,alimiter=limit=0.84:level=false"
)


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]
    )
    return float(out)


def find_silences(path, threshold, min_pause):
    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-vn", "-af",
         f"silencedetect=noise={threshold}dB:d={min_pause}", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", p.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", p.stderr)]
    return list(zip(starts, ends + [None] * (len(starts) - len(ends))))


def keep_segments(total, silences, keep):
    segs, cursor = [], 0.0
    for s, e in silences:
        e = total if e is None else e
        cut_from, cut_to = s + keep, e - keep
        if cut_to - cut_from < 0.1:
            continue
        if cut_from > cursor:
            segs.append((cursor, cut_from))
        cursor = max(cursor, cut_to)
    if total - cursor > 0.1:
        segs.append((cursor, total))
    return segs


def remap(t, segs):
    for s in segs:
        if s["src_start"] <= t <= s["src_end"]:
            return s["out_start"] + (t - s["src_start"])
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("media")
    ap.add_argument("--min-pause", type=float, default=0.35)
    ap.add_argument("--keep", type=float, default=0.12)
    ap.add_argument("--threshold", type=float, default=-38)
    ap.add_argument("--words", help="clip.words.json из npm run transcribe")
    ap.add_argument("--words-only", action="store_true", help="не перекодировать видео, только пересчитать слова")
    a = ap.parse_args()

    src = pathlib.Path(a.media).resolve()
    work = src.parent / "_work"
    work.mkdir(exist_ok=True)
    stem = src.stem

    total = duration(src)
    segs = keep_segments(total, find_silences(src, a.threshold, a.min_pause), a.keep)

    parts, out_t, plan = [], 0.0, []
    for i, (s, e) in enumerate(segs):
        parts.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}];")
        parts.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS[a{i}];")
        plan.append({"src_start": round(s, 3), "src_end": round(e, 3), "out_start": round(out_t, 3)})
        out_t += e - s
    concat = "".join(f"[v{i}][a{i}]" for i in range(len(segs)))
    graph = "".join(parts) + f"{concat}concat=n={len(segs)}:v=1:a=1[v][araw];[araw]{AUDIO_CHAIN}[a]"

    out = work / f"{stem}.cut.mp4"
    if not a.words_only:
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-filter_complex", graph,
         "-map", "[v]", "-map", "[a]", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(out)])
    (work / f"{stem}.cut.json").write_text(json.dumps(plan, indent=1))

    if a.words:
        words = json.loads(pathlib.Path(a.words).read_text())
        moved, pending = [], []
        for w in words:
            s, e = remap(w["start"], plan), remap(w["end"], plan)
            if s is None and e is None:
                # Whisper иногда растягивает слово на паузу, хотя звучит оно после неё.
                # Такие слова не выбрасываем, а делим с ними время следующего слова.
                pending.append(w["text"])
                continue
            s = e - (w["end"] - w["start"]) if s is None else s
            e = s + (w["end"] - w["start"]) if e is None else e
            group = pending + [w["text"]]
            step = (e - s) / len(group)
            for i, text in enumerate(group):
                moved.append({"text": text, "start": round(s + i * step, 3), "end": round(s + (i + 1) * step, 3)})
            pending = []
        # Слова должны идти по порядку и не наезжать друг на друга
        for prev, w in zip(moved, moved[1:]):
            w["start"] = max(w["start"], prev["end"])
            w["end"] = round(max(w["end"], w["start"] + 0.08), 3)
        (work / f"{stem}.cut.words.json").write_text(json.dumps(moved, ensure_ascii=False, indent=1))

    print(f"{total:.1f} с → {out_t:.1f} с, вырезано {total - out_t:.1f} с пауз в {len(segs) - 1} местах")
    print(out)


if __name__ == "__main__":
    main()
