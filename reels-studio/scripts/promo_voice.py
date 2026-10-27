"""Голос рекламного ролика по сценарию promo/<имя>.json и тайминги каждого слова — по ним синхронизируется весь ролик.

  python3 scripts/promo_voice.py promo/2026-10-27-gtt-app.json --piper <модель.onnx>   # черновой голос (локально, бесплатно)
  python3 scripts/promo_voice.py promo/2026-10-27-gtt-app.json --audio voice-final.mp3  # готовая озвучка одним файлом

Сцена (beat) — одна фраза диктора. Черновик: каждая сцена синтезируется отдельно (Piper). Готовая озвучка (Higgsfield / диктор)
режется на сцены по словам Whisper. Дальше одинаково: тишина по краям срезается, между сценами — пауза `voice.gapAfter`
(у сцены можно задать свою `pauseAfter`), Whisper даёт время слов, слова сценария сопоставляются со словами Whisper.
Пишет source-videos/<name>/voice/voice.wav и timing.json: {start, total, beats: [{id, start, end, words: [{text, start, end}]}]},
времена — в секундах от начала ролика (с учётом заставки `--offset`).
"""
import argparse
import difflib
import json
import pathlib
import re
import subprocess
import tempfile

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO = ROOT.parent
WHISPER = ROOT / "whisper.cpp"
BIN = WHISPER / "build" / "bin" / "whisper-cli"
MODEL = WHISPER / "ggml-large-v3-turbo-q5_0.bin"
SR = 48000


def load(path: pathlib.Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def save(path: pathlib.Path, a: np.ndarray):
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(path)],
                   input=a.astype(np.float32).tobytes(), check=True)


def trim(a: np.ndarray, thr=0.012, pad=0.04) -> np.ndarray:
    """Срезает тишину по краям (окно 10 мс), оставляя pad секунд."""
    win = SR // 100
    n = len(a) // win
    if n == 0:
        return a
    rms = np.sqrt((a[: n * win].reshape(n, win) ** 2).mean(axis=1))
    loud = np.where(rms > thr)[0]
    if not len(loud):
        return a
    s = max(0, loud[0] * win - int(pad * SR))
    e = min(len(a), (loud[-1] + 1) * win + int(pad * SR))
    return a[s:e]


def norm(w: str) -> str:
    return re.sub(r"[^a-zа-яё0-9]", "", w.lower().replace("ё", "е"))


def whisper_words(a: np.ndarray) -> list[dict]:
    with tempfile.TemporaryDirectory() as tmp:
        wav = pathlib.Path(tmp) / "a.wav"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-ar", "16000", str(wav)], input=a.tobytes(), check=True)
        out = pathlib.Path(tmp) / "o"
        subprocess.run([str(BIN), "-m", str(MODEL), "-f", str(wav), "-l", "ru", "-dtw", "large.v3.turbo", "-ojf",
                        "-of", str(out), "-np"], check=True, capture_output=True)
        segs = json.loads(out.with_suffix(".json").read_text())["transcription"]
    words = []
    for s in segs:
        for t in s["tokens"]:
            txt = t["text"]
            if txt.startswith("[_"):
                continue
            st, en = t["offsets"]["from"] / 1000, t["offsets"]["to"] / 1000
            if words and not txt.startswith(" "):
                words[-1]["text"] += txt
                words[-1]["end"] = en
            elif txt.strip():
                words.append({"text": txt.strip(), "start": st, "end": en})
    return [w for w in words if norm(w["text"])]


def align(script: str, heard: list[dict], dur: float) -> list[dict]:
    """Слова сценария получают время совпавших слов Whisper; несовпавшие — по соседям, пропорционально длине."""
    sw = [w for w in re.findall(r"[^\s—–-]+(?:-[^\s—–-]+)*", script) if norm(w)]
    a, b = [norm(w) for w in sw], [norm(w["text"]) for w in heard]
    times: list = [None] * len(sw)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        tag, i1, i2, j1, j2 = blk
        if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                h = heard[j1 + k]
                times[i1 + k] = (h["start"], h["end"])
        elif tag == "replace":  # разное число слов: растягиваем отрезок Whisper на слова сценария
            s, e = heard[j1]["start"], heard[j2 - 1]["end"]
            ln = [len(x) or 1 for x in a[i1:i2]]
            acc = s
            for k, L in enumerate(ln):
                d = (e - s) * L / sum(ln)
                times[i1 + k] = (acc, acc + d)
                acc += d
    # дыры — между известными соседями
    known = [i for i, t in enumerate(times) if t]
    for i, t in enumerate(times):
        if t:
            continue
        prev = max([k for k in known if k < i], default=None)
        nxt = min([k for k in known if k > i], default=None)
        s = times[prev][1] if prev is not None else 0.0
        e = times[nxt][0] if nxt is not None else dur
        gap = [j for j in range(i, (nxt if nxt is not None else len(sw)))]
        L = [len(a[j]) or 1 for j in gap]
        acc, tot = s, sum(L)
        for j, l in zip(gap, L):
            d = (e - s) * l / tot
            times[j] = (acc, acc + d)
            acc += d
        known = [k for k, tt in enumerate(times) if tt]
    return [{"text": w, "start": round(t[0], 3), "end": round(t[1], 3)} for w, t in zip(sw, times)]


def piper(model: str, text: str, length: float) -> np.ndarray:
    with tempfile.TemporaryDirectory() as tmp:
        out = pathlib.Path(tmp) / "b.wav"
        exe = pathlib.Path(model).resolve().parent.parent / "piperenv" / "bin" / "piper"
        cmd = [str(exe) if exe.exists() else "piper", "-m", model, "-f", str(out), "--length-scale", str(length)]
        subprocess.run(cmd, input=text.encode(), check=True, capture_output=True)
        return load(out)


def split_final(audio: np.ndarray, beats: list[dict]) -> list[np.ndarray]:
    """Готовая озвучка одним файлом → куски по сценам: конец сцены — середина паузы после её последнего слова."""
    heard = whisper_words(audio)
    full = " ".join(b["say"] for b in beats)
    words = align(full, heard, len(audio) / SR)
    cuts, k = [0.0], 0
    for b in beats[:-1]:
        n = len([w for w in re.findall(r"[^\s—–-]+(?:-[^\s—–-]+)*", b["say"]) if norm(w)])
        k += n
        cuts.append((words[k - 1]["end"] + words[k]["start"]) / 2)
    cuts.append(len(audio) / SR)
    return [audio[int(s * SR): int(e * SR)] for s, e in zip(cuts, cuts[1:])]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--piper", help="модель Piper .onnx — черновой голос")
    ap.add_argument("--length", type=float, default=0.95, help="темп Piper (меньше — быстрее)")
    ap.add_argument("--audio", help="готовая озвучка одним файлом")
    ap.add_argument("--offset", type=float, default=1.5, help="с какой секунды ролика начинается голос")
    a = ap.parse_args()

    spec = json.loads((ROOT / a.script).read_text() if not pathlib.Path(a.script).is_absolute() else pathlib.Path(a.script).read_text())
    beats = spec["beats"]
    gap = spec.get("voice", {}).get("gapAfter", 0.35)
    out_dir = REPO / "source-videos" / spec["name"] / "voice"

    if a.audio:
        parts = split_final(load(pathlib.Path(a.audio)), beats)
    elif a.piper:
        parts = [piper(a.piper, b["say"], b.get("length", a.length)) for b in beats]
    else:
        raise SystemExit("нужен --piper или --audio")

    track, t, out = [], a.offset, []
    track.append(np.zeros(int(a.offset * SR), dtype=np.float32))
    for b, p in zip(beats, parts):
        p = trim(p)
        peak = np.abs(p).max() or 1.0
        p = p * (0.89 / peak)
        dur = len(p) / SR
        words = align(b["say"], whisper_words(p), dur)
        out.append({"id": b["id"], "start": round(t, 3), "end": round(t + dur, 3),
                    "words": [{**w, "start": round(w["start"] + t, 3), "end": round(w["end"] + t, 3)} for w in words]})
        pause = b.get("pauseAfter", gap)
        track += [p, np.zeros(int(pause * SR), dtype=np.float32)]
        t += dur + pause
        print(f"{b['id']}: {out[-1]['start']:.2f}–{out[-1]['end']:.2f}  " + " ".join(w["text"] for w in words))
    save(out_dir / "voice.wav", np.concatenate(track))
    timing = {"start": a.offset, "total": round(t, 3), "source": "piper" if a.piper else pathlib.Path(a.audio).name, "beats": out}
    (out_dir / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1))
    print(f"голос {t:.1f} с → {out_dir}/voice.wav, timing.json")


if __name__ == "__main__":
    main()
