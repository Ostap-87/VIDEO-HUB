"""Вырезает паузы из «говорящей головы» и чистит звук.

  python3 scripts/cut_pauses.py ../source-videos/папка/clip.MOV
  python3 scripts/cut_pauses.py ../source-videos/папка/clip.MOV --min-pause 0.35 --keep 0.12 --words clip.words.json
  python3 scripts/cut_pauses.py … --drop 86.78-90.80   # вырезать оговорку / повтор (секунды исходника)

  python3 scripts/cut_pauses.py ../source-videos/папка/clip.MOV --words … --segments _work/clip.cut.json --drop …
        # пересобрать по уже выбранным кускам (после правок), не ища паузы заново

Что делает:
1. Звук «как в студии»: нейросетевой шумодав DeepFilterNet3 (scripts/denoise.py, шум и гулкость),
   эквалайзер (убрать «коробочный» гул 250–450 Гц, разборчивость 3 кГц, воздух 8 кГц), де-эссер,
   мягкая компрессия, громкость −14 LUFS (норма Instagram). Решение пользователя 08.10.2026: «как из трубы» — недопустимо.
2. Находит паузы длиннее --min-pause секунд (тише --threshold дБ) и вырезает их,
   оставляя по --keep секунд тишины по краям, чтобы речь не обрывалась.
   Каждый кусок ровно в целое число кадров (30 fps), звук режется по тем же границам до сэмпла —
   звук и видео не расходятся ни на кадр (раньше куски округлялись по-разному и рассинхрон копился до 0,7 с).
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

FPS = 30
SR = 48000
SPF = SR // FPS  # сэмплов на кадр (1600)
DFN = pathlib.Path("/opt/dfn/bin/python")
# после шумодава: эквалайзер «студийного» голоса, де-эссер, компрессия, громкость −14 LUFS
AUDIO_CHAIN = (
    "highpass=f=75,"
    "equalizer=f=250:t=q:w=1.0:g=-2,equalizer=f=420:t=q:w=1.2:g=-3,"
    "equalizer=f=3000:t=q:w=1.0:g=2.5,highshelf=f=8000:g=2,"
    "deesser=i=0.35,"
    "acompressor=threshold=-22dB:ratio=2.5:attack=8:release=160:makeup=3"
)  # громкость −14 LUFS — отдельным шагом: замер + усиление + лимитер с компенсацией задержки (звук не сдвигается)


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


def subtract(segs, drops):
    """Убирает из оставленных кусков отрезки --drop (оговорки, повторы)."""
    for d0, d1 in drops:
        out = []
        for s, e in segs:
            if e <= d0 or s >= d1:
                out.append((s, e))
                continue
            if s < d0 - 0.05:
                out.append((s, d0))
            if e > d1 + 0.05:
                out.append((d1, e))
        segs = out
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
    ap.add_argument("--drop", default="", help="вырезать отрезки исходника, напр. 86.78-90.80,101.2-102")
    ap.add_argument("--words-only", action="store_true", help="не перекодировать видео, только пересчитать слова")
    ap.add_argument("--segments", help="взять куски из готового _work/имя.cut.json (пересборка после правок)")
    ap.add_argument("--no-denoise", action="store_true", help="без нейросетевого шумодава")
    a = ap.parse_args()

    src = pathlib.Path(a.media).resolve()
    work = src.parent / "_work"
    work.mkdir(exist_ok=True)
    stem = src.stem

    total = duration(src)
    drops = [tuple(map(float, r.split("-"))) for r in a.drop.split(",") if r]
    if a.segments:
        # пересборка по уже выбранным кускам: правки (оговорки, вырезки) не теряются
        segs = [(x["src_start"], x["src_end"]) for x in json.loads(pathlib.Path(a.segments).read_text())]
    else:
        segs = keep_segments(total, find_silences(src, a.threshold, a.min_pause), a.keep)
    segs = subtract(segs, drops)

    # каждый кусок — целое число кадров; звук режется по тем же границам (1 кадр = 1600 сэмплов)
    frames_plan, plan, out_f = [], [], 0
    for s, e in segs:
        f0 = round(s * FPS)
        n = max(1, round((e - s) * FPS))
        frames_plan.append((f0, n))
        plan.append({"src_start": round(f0 / FPS, 4), "src_end": round((f0 + n) / FPS, 4), "out_start": round(out_f / FPS, 4)})
        out_f += n
    out_t = out_f / FPS

    out = work / f"{stem}.cut.mp4"
    if not a.words_only:
        tmp = work / "_parts"
        tmp.mkdir(exist_ok=True)
        # 1) видео кусками, ровно n кадров (fps=30 выравнивает и плавающую частоту исходника — iPhone, 120 fps)
        lines = []
        for i, (f0, n) in enumerate(frames_plan):
            part = tmp / f"{i:03d}.mkv"
            run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{f0 / FPS:.4f}", "-i", str(src), "-an",
                 "-vf", f"fps={FPS}", "-frames:v", str(n), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                 "-pix_fmt", "yuv420p", str(part)])
            lines.append(f"file '{part.as_posix()}'")
        (tmp / "list.txt").write_text("\n".join(lines))
        run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"),
             "-c:v", "copy", str(tmp / "video.mkv")])
        # 2) звук: весь исходник → шумодав (вся запись целиком — модели нужен контекст) → куски по сэмплам
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", str(SR), str(tmp / "full.wav")])
        clean = tmp / "full.clean.wav"
        if DFN.exists() and not a.no_denoise:
            run([str(DFN), str(pathlib.Path(__file__).with_name("denoise.py")), str(tmp / "full.wav"), str(clean)])
        else:
            print("! шумодав DeepFilterNet не установлен (bash scripts/setup.sh) — звук без него")
            clean = tmp / "full.wav"
        import numpy as np
        import wave
        with wave.open(str(clean)) as w:
            raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
        pieces = []
        fade = 192  # 4 мс — без щелчков на стыках
        ramp = np.linspace(0, 1, fade, dtype=np.float32)
        for f0, n in frames_plan:
            a0, ln = f0 * SPF, n * SPF
            seg = raw[a0 : a0 + ln]
            if len(seg) < ln:
                seg = np.pad(seg, (0, ln - len(seg)))
            seg = seg.copy()
            seg[:fade] *= ramp
            seg[-fade:] *= ramp[::-1]
            pieces.append(seg)
        cat = np.concatenate(pieces)
        with wave.open(str(tmp / "voice.wav"), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(np.clip(cat, -32768, 32767).astype(np.int16).tobytes())
        # 3) студийная обработка и сборка; длина звука = длине видео до сэмпла
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(tmp / "voice.wav"), "-af", AUDIO_CHAIN, "-ar", str(SR),
             "-c:a", "pcm_s16le", str(tmp / "voice.eq.wav")])
        meas = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(tmp / "voice.eq.wav"), "-af", "ebur128", "-f", "null", "-"],
                              capture_output=True, text=True).stderr
        lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", meas)[-1])
        gain = -14.0 - lufs
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(tmp / "video.mkv"), "-i", str(tmp / "voice.eq.wav"),
             "-map", "0:v", "-map", "1:a", "-c:v", "copy",
             "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89:level=false:latency=1,atrim=end_sample={len(cat)},apad=whole_len={len(cat)}",
             "-ac", "2", "-c:a", "aac", "-b:a", "192k", "-ar", str(SR), "-movflags", "+faststart", str(out)])
        print(f"голос: {lufs:.1f} LUFS → −14 LUFS ({gain:+.1f} дБ)")
        for f in tmp.iterdir():
            f.unlink()
        tmp.rmdir()
    (work / f"{stem}.cut.json").write_text(json.dumps(plan, indent=1))

    if a.words:
        words = json.loads(pathlib.Path(a.words).read_text())
        # слова, которые целиком попали в вырезанные оговорки, убираем
        words = [w for w in words if not any(d0 <= (w["start"] + w["end"]) / 2 <= d1 for d0, d1 in drops)]
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
