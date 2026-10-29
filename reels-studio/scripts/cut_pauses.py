"""Вырезает паузы из «говорящей головы» и чистит звук.

  python3 scripts/cut_pauses.py ../source-videos/папка/clip.MOV
  python3 scripts/cut_pauses.py ../source-videos/папка/clip.MOV --min-pause 0.35 --keep 0.12 --words clip.words.json
  python3 scripts/cut_pauses.py … --drop 86.78-90.80   # вырезать оговорку / повтор (секунды исходника)

  python3 scripts/cut_pauses.py ../source-videos/папка/clip.MOV --words … --segments _work/clip.cut.json --drop …
        # пересобрать по уже выбранным кускам (после правок), не ища паузы заново

Что делает:
1. Звук «как в студии»: нейросетевой шумодав DeepFilterNet3 (scripts/denoise.py, шум и гулкость; предел 30 дБ), срез гула
   ниже 85 Гц, эквалайзер по замеру ролика (voice_chain: верх голоса до нормы речи, «бубнение» 300 Гц — только если есть),
   де-эссер, очень мягкая компрессия, громкость −14 LUFS (норма Instagram). Решения пользователя 08.10, 22.10 и 29.10.2026:
   «как из трубы», «глухой и с каким-то эхо», «шумит за кадром» — недопустимо (замеры — у voice_chain).
2. Находит паузы длиннее --min-pause секунд и вырезает их, оставляя по --keep секунд тишины по краям, чтобы речь
   не обрывалась. Паузы ищутся по звуку **после шумодава** (решение 14.10.2026: на уличной записи шум города прятал
   паузы — сырой звук не опускался ниже порога): кадры по 10 мс, порог — на 30 дБ тише громкой речи (90-й процентиль);
   короткие всплески внутри паузы (до 60 мс — цыканья, щелчки языком, вдохи) паузу не прерывают. `--vad raw` — по-старому
   (ffmpeg silencedetect по сырому звуку, порог --threshold дБ).
   «Эканья» (решение пользователя 14.10.2026: «убери паузы и ненужные слова, эканья и цыканья»): кусок звука между
   паузами короче 1,2 с, на который не приходится ни одно слово Whisper, распознаётся отдельно; если в нём «э», «эм»,
   «мм», «а-а» или ничего — кусок вырезается вместе с паузами вокруг (`--no-fillers` — не искать).
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

from avsync import av_offset, extract_args  # звук — в шкале картинки (сдвиг start_time у iPhone)

FPS = 30
SR = 48000
SPF = SR // FPS  # сэмплов на кадр (1600)
DFN = pathlib.Path("/opt/dfn/bin/python")
DFN_LIMIT = 30  # дБ: предел шумодава (29.10.2026: 18 → 30 — «шумит за кадром»; верх согласных при 30 тот же, что при 18)
# после шумодава: срез гула, эквалайзер по замеру, де-эссер, очень мягкая компрессия, громкость −14 LUFS.
# 22.10.2026 («голос глухой, как из трубы, и с каким-то эхо»), замер на уличном od-6: прежняя цепочка (−2 дБ 250 Гц,
# −3 дБ 420 Гц, +2,5 дБ 3 кГц, компрессор −22 дБ 2,5:1 с подъёмом +3) давала «телефонную» середину и поднимала хвосты
# слов — отражения улицы — на 3,2 дБ (эхо). Компрессор с тех пор без подъёма.
# 29.10.2026 («некоторый шум, как будто что-то шумит за кадром… чтобы голос был чистым и не звучал как из трубы»), замер
# 11 исходников 28–29.10 (запись через приложение, AAC 106 кбит/с): верх голоса от 3,5 кГц провален на 13–21 дБ
# (у SANY, снятого камерой iPhone, — 10–14), относительно среднего спектра речи (LTASS) 4,5–5,6 кГц ниже на 11–13 дБ,
# 11 кГц — на 20 дБ: это и есть «труба». Поэтому эквалайзер подбирается по замеру каждого ролика (voice_chain):
# полка от 3,8 кГц поднимает верх до нормы речи (до +10 дБ), полка от 9 кГц добавляет «воздух» (до +6), середина
# 300 Гц убирается, только если она «бубнит» (выше нормы больше чем на 3 дБ); срез гула улицы — ниже 85 Гц.
# Замер «Технопарков»: верх 4,5–5,6 кГц −11…−13 → +2…0 дБ, 11 кГц −20 → −6, шум в паузах −3 дБ, гул < 90 Гц −6 дБ.
AUDIO_TAIL = "deesser=i=0.45:m=0.6:f=0.55,acompressor=threshold=-14dB:ratio=1.8:attack=20:release=300:makeup=1"
LTASS = {350: 41.0, 700: 32.0, 4500: 12.0, 5600: 10.5, 11000: 5.0}  # средний спектр речи, дБ на Гц (Byrne 1994)


def voice_shape(path):
    """Отклонение спектра громкой речи от нормы (LTASS), дБ, относительно 700 Гц: {350, 4500, 5600, 11000: …}."""
    import numpy as np

    x, sr = read_wav(path)
    x = x.astype(np.float32)
    N = 4800
    n = len(x) // N
    X = x[: n * N].reshape(n, N)
    rms = np.sqrt((X ** 2).mean(1))
    loud = X[rms > np.percentile(rms, 70)]
    S = 10 * np.log10((np.abs(np.fft.rfft(loud * np.hanning(N), axis=1)) ** 2).mean(0) + 1e-12)
    f = np.fft.rfftfreq(N, 1 / sr)
    band = {350: (200, 500), 700: (500, 1000), 4500: (4000, 5000), 5600: (4000, 8000), 11000: (8000, 16000)}
    v = {k: S[(f >= lo) & (f < hi)].mean() for k, (lo, hi) in band.items()}
    return {k: round(float(v[k] - v[700] - (LTASS[k] - LTASS[700])), 1) for k in (350, 4500, 5600, 11000)}


def voice_chain(path):
    """Цепочка ffmpeg для голоса после шумодава — эквалайзер по замеру этого ролика (см. выше)."""
    d = voice_shape(path)
    hi = max(0.0, min(10.0, -(d[4500] + d[5600]) / 2 - 4))
    air = max(0.0, min(6.0, -d[11000] - hi - 6))
    mid = max(0.0, min(4.0, d[350] - 3))
    chain = ["highpass=f=85:p=2"]
    if mid:
        chain.append(f"equalizer=f=300:t=q:w=1.0:g={-mid:.1f}")
    if hi:
        chain.append(f"highshelf=f=3800:t=q:w=0.7:g={hi:.1f}")
    if air:
        chain.append(f"highshelf=f=9000:t=q:w=0.7:g={air:.1f}")
    print(f"  голос: верх {d[4500]:+.1f}/{d[5600]:+.1f} дБ от нормы речи, 11 кГц {d[11000]:+.1f}, 300 Гц {d[350]:+.1f} → "
          f"полка 3,8 кГц {hi:+.1f}, 9 кГц {air:+.1f}, 300 Гц {-mid:+.1f}")
    return ",".join(chain + [AUDIO_TAIL])


def build_voice(clean, frames_plan, video, out, tmp):
    """Звук склейки из чистой записи по кускам (кадры исходника) → эквалайзер по замеру → −14 LUFS → в видео (копией)."""
    import numpy as np
    import wave

    raw, _ = read_wav(clean)
    pieces = []
    fade = 192  # 4 мс — без щелчков на стыках
    ramp = np.linspace(0, 1, fade, dtype=np.float32)
    for f0, n in frames_plan:
        a0, ln = f0 * SPF, n * SPF
        seg = raw[a0 : a0 + ln]
        if len(seg) < ln:
            seg = np.pad(seg, (0, ln - len(seg)))
        seg = seg.astype(np.float32)
        seg[:fade] *= ramp
        seg[-fade:] *= ramp[::-1]
        pieces.append(seg)
    cat = np.concatenate(pieces)
    with wave.open(str(tmp / "voice.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(np.clip(cat, -32768, 32767).astype(np.int16).tobytes())
    # студийная обработка и сборка; длина звука = длине видео до сэмпла
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(tmp / "voice.wav"), "-af", voice_chain(tmp / "voice.wav"), "-ar", str(SR),
         "-c:a", "pcm_s16le", str(tmp / "voice.eq.wav")])
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(tmp / "voice.eq.wav"), "-af", "ebur128", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", meas)[-1])
    gain = -14.0 - lufs
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(video), "-i", str(tmp / "voice.eq.wav"),
         "-map", "0:v", "-map", "1:a", "-c:v", "copy",
         "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89:level=false:latency=1,atrim=end_sample={len(cat)},apad=whole_len={len(cat)}",
         "-ac", "2", "-c:a", "aac", "-b:a", "192k", "-ar", str(SR), "-movflags", "+faststart", str(out)])
    print(f"голос: {lufs:.1f} LUFS → −14 LUFS ({gain:+.1f} дБ)")


# iPhone снимает в HDR (HLG / Dolby Vision, bt2020). Без пересчёта склейка выходит 8-битной с пометкой HDR, и в рендере
# спикер бледный и холодный (жалоба пользователя 15.10.2026: «я какого-то бледного цвета… сделай с естественным цветом»).
# HDR → обычный цвет bt709: тональная кривая hable (небо не пересвечено) + тёплая естественная коррекция
# (насыщенность 1,25, контраст 1,08, тёплые полутона). Для обычного (SDR) исходника ничего не меняется.
HDR_TO_SDR = (
    "zscale=tin={tin}:min=bt2020nc:pin=bt2020:rin=tv:t=linear:npl=150,format=gbrpf32le,zscale=p=bt709,"
    "tonemap=tonemap=hable:desat=0:peak=4,zscale=t=bt709:m=bt709:r=pc,format=rgb24,"
    "eq=saturation=1.25:contrast=1.08:brightness=0.03,colorbalance=rm=0.05:bm=-0.05:rs=0.02:bs=-0.03,"
    "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
)
SDR_TAGS = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]


def hdr_filter(path):
    """Фильтр HDR → SDR для исходника в HLG или PQ, иначе None."""
    trc = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=color_transfer", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    ).stdout.strip()
    # у роликов iPhone с поворотом ffprobe печатает «arib-std-b67,» (пустое поле side data) — берём первое поле;
    # без этого перевод HDR → SDR молча пропускался и ролик уходил в рендер бледным (25.10.2026)
    trc = trc.splitlines()[0].split(",")[0].strip() if trc else ""
    return HDR_TO_SDR.format(tin=trc) if trc in ("arib-std-b67", "smpte2084") else None


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]
    )
    return float(out)


FILLER_RE = re.compile(r"^(?:э+м*|е+|м+|мм+|хм+|а+|ам+|ым+|у+м*|ну+)$")
WHISPER = pathlib.Path(__file__).resolve().parent.parent / "whisper.cpp"


def clean_audio(src, work, no_denoise=False):
    """Весь звук исходника → шумодав DeepFilterNet (кэш _work/<имя>.clean.wav: шумодав считается один раз)."""
    full = work / f"{src.stem}.full.wav"
    clean = work / f"{src.stem}.clean.wav"
    # звук выравнивается по картинке (avsync.py): кэш, снятый до 15.10.2026 без сдвига, у такого исходника пересчитывается
    off = av_offset(src)
    mark = work / f"{src.stem}.clean.json"
    info = json.loads(mark.read_text()) if mark.exists() else {}
    synced = mark.exists() and abs(info.get("offset", 0) - off) < 0.0005
    # кэш до 22.10.2026 — шумодав без предела (глухой голос): пересчитывается
    same = info.get("limit") == DFN_LIMIT or no_denoise or not DFN.exists()
    if clean.exists() and clean.stat().st_mtime >= src.stat().st_mtime and (synced or abs(off) < 0.0005) and same:
        return clean
    if abs(off) >= 0.0005:
        print(f"  звук в исходнике начинается на {off:+.3f} с относительно картинки — выравниваю")
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), *extract_args(src), "-ac", "1", "-ar", str(SR), str(full)])
    if DFN.exists() and not no_denoise:
        run([str(DFN), str(pathlib.Path(__file__).with_name("denoise.py")), str(full), str(clean), "--limit", str(DFN_LIMIT)])
        full.unlink()
    else:
        print("! шумодав DeepFilterNet не установлен (bash scripts/setup.sh) — звук без него")
        full.rename(clean)
    mark.write_text(json.dumps({"offset": off, "limit": DFN_LIMIT}))
    return clean


def read_wav(path):
    import numpy as np
    import wave
    with wave.open(str(path)) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32), w.getframerate()


def speech_runs(path, gap=0.12, blip=0.06):
    """Куски речи по чистому звуку: [(начало, конец)], паузы короче gap склеены, всплески короче blip — не речь."""
    import numpy as np
    x, sr = read_wav(path)
    hop = sr // 100
    n = len(x) // hop
    db = 20 * np.log10(np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1)) / 32768 + 1e-9)
    voiced = db > np.percentile(db, 90) - 30

    def runs(a):
        out, st = [], 0
        for i in range(1, len(a) + 1):
            if i == len(a) or a[i] != a[st]:
                out.append((bool(a[st]), st, i))
                st = i
        return out

    for val, st, en in runs(voiced):  # щелчки, цыканья, вдохи внутри паузы
        if val and en - st < round(blip * 100):
            voiced[st:en] = False
    for val, st, en in runs(voiced):  # смычки внутри слов («к», «т», «п») паузой не считаем
        if not val and en - st < round(gap * 100) and st > 0 and en < len(voiced):
            voiced[st:en] = True
    return [(st / 100, en / 100) for val, st, en in runs(voiced) if val], n / 100


def whisper_text(path, a0, a1):
    """Что Whisper слышит в куске [a0, a1] чистого звука, если распознать его отдельно."""
    import tempfile
    bin_, model = WHISPER / "build" / "bin" / "whisper-cli", WHISPER / "ggml-large-v3-turbo-q5_0.bin"
    if not bin_.exists() or not model.exists():
        return None
    with tempfile.TemporaryDirectory() as tmp:
        wav = pathlib.Path(tmp) / "c.wav"
        run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{max(0, a0 - 0.05):.3f}", "-t", f"{a1 - a0 + 0.1:.3f}", "-i", str(path),
             "-ac", "1", "-ar", "16000", "-af", "apad=pad_dur=0.6", str(wav)])
        out = subprocess.run([str(bin_), "-m", str(model), "-f", str(wav), "-l", "ru", "-np", "-nt"], capture_output=True, text=True).stdout
    return " ".join(out.split())


def find_fillers(clean, chunks, words):
    """Куски речи без слов Whisper, которые отдельно распознаются как «э», «мм» или пустота."""
    found = []
    for c0, c1 in chunks:
        if c1 - c0 > 1.2 or any(c0 - 0.15 <= w["start"] < c1 - 0.05 for w in words):
            continue
        text = whisper_text(clean, c0, c1)
        if text is None:
            break
        norm = re.sub(r"[^а-яёa-z ]", "", text.lower()).replace("ё", "е").split()
        if not norm or all(FILLER_RE.match(t) for t in norm):
            found.append((c0, c1, text or "—"))
        else:
            print(f"  кусок {c0:.2f}–{c1:.2f} без слов, но слышно «{text}» — оставляю")
    return found


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
    ap.add_argument("--vad", choices=["clean", "raw"], default="clean", help="где искать паузы: clean — после шумодава (по умолчанию), raw — по сырому звуку")
    ap.add_argument("--no-fillers", action="store_true", help="не искать «эканья» (куски без слов)")
    a = ap.parse_args()

    src = pathlib.Path(a.media).resolve()
    work = src.parent / "_work"
    work.mkdir(exist_ok=True)
    stem = src.stem

    total = duration(src)
    drops = [tuple(map(float, r.split("-"))) for r in a.drop.split(",") if r]
    clean_src = clean_audio(src, work, a.no_denoise) if not a.words_only or not a.segments else None
    if a.segments:
        # пересборка по уже выбранным кускам: правки (оговорки, вырезки) не теряются
        segs = [(x["src_start"], x["src_end"]) for x in json.loads(pathlib.Path(a.segments).read_text())]
    elif a.vad == "raw":
        segs = keep_segments(total, find_silences(src, a.threshold, a.min_pause), a.keep)
    else:
        chunks, _ = speech_runs(clean_src)
        if a.words and not a.no_fillers:
            fillers = find_fillers(clean_src, chunks, json.loads(pathlib.Path(a.words).read_text()))
            for f0, f1, text in fillers:
                print(f"  «эканье» {f0:.2f}–{f1:.2f}: «{text}» — вырезаю")
            chunks = [c for c in chunks if not any(abs(c[0] - f0) < 1e-6 for f0, _, _ in fillers)]
        silences = [(chunks[i][1], chunks[i + 1][0]) for i in range(len(chunks) - 1) if chunks[i + 1][0] - chunks[i][1] >= a.min_pause]
        if chunks:
            silences = [(0.0, chunks[0][0])] * (chunks[0][0] >= a.min_pause) + silences + [(chunks[-1][1], None)] * (total - chunks[-1][1] >= a.min_pause)
        segs = keep_segments(total, silences, a.keep)
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
        hdr = hdr_filter(src)
        if hdr:
            print("  исходник в HDR — перевожу в обычный цвет (bt709) с тёплой коррекцией")
        for i, (f0, n) in enumerate(frames_plan):
            part = tmp / f"{i:03d}.mkv"
            run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{f0 / FPS:.4f}", "-i", str(src), "-an",
                 "-vf", f"fps={FPS}" + (f",{hdr}" if hdr else ""), "-frames:v", str(n), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                 "-pix_fmt", "yuv420p", *(SDR_TAGS if hdr else []), str(part)])
            lines.append(f"file '{part.as_posix()}'")
        (tmp / "list.txt").write_text("\n".join(lines))
        run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"),
             "-c:v", "copy", str(tmp / "video.mkv")])
        # 2) звук: весь исходник → шумодав (вся запись целиком — модели нужен контекст; кэш _work/<имя>.clean.wav) → куски по сэмплам
        clean = clean_src or clean_audio(src, work, a.no_denoise)
        build_voice(clean, frames_plan, tmp / "video.mkv", out, tmp)
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
