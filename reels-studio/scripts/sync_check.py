"""Проверка синхрона склейки: звук готового куска против звука исходника на тех же кадрах (появилась 15.10.2026).

  python3 scripts/sync_check.py ../source-videos/<папка>/<клип>.MOV [--cut ../source-videos/<папка>/_work/<клип>.cut.mp4]

Для каждого куска из `_work/<клип>.cut.json` берётся до 3 с его звука в `<клип>.cut.mp4` и сравнивается (взаимная
корреляция огибающей) со звуком исходника на тех же кадрах — звук исходника выровнен по картинке (avsync.py), как его
видит зритель. Сдвиг больше ±40 мс (зритель замечает, когда голос опережает губы на 45 мс) — рассинхрон.
Печатает сдвиг по кускам и итог `SYNC_OK` / `SYNC_BAD`. Шумодав и эквалайзер на сравнение не влияют: сравнивается
огибающая громкости.
"""
import argparse
import json
import pathlib
import subprocess
import sys

import numpy as np

from avsync import extract_args

SR = 8000
HOP = 80  # огибающая с шагом 10 мс


def pcm(path, args):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), *args, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.int16).astype(np.float32)


def envelope(x):
    n = len(x) // HOP
    e = np.sqrt((x[: n * HOP].reshape(n, HOP) ** 2).mean(axis=1) + 1e-6)
    e = np.log(e)
    return e - e.mean()


def lag_of(ref, seg, lo, hi):
    """Где кусок склейки `seg` целиком лежит в `ref`: позиция (шаги огибающей) с наибольшим сходством в [lo, hi]."""
    best, best_k = -1e9, lo
    y = seg - seg.mean()
    yy = np.sqrt((y * y).sum()) + 1e-9
    for k in range(max(0, lo), min(hi, len(ref) - len(seg)) + 1):
        x = ref[k: k + len(seg)]
        x = x - x.mean()
        c = float((x * y).sum() / (np.sqrt((x * x).sum()) * yy + 1e-9))
        if c > best:
            best, best_k = c, k
    return best_k, best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--cut")
    ap.add_argument("--max", type=float, default=1.2, help="искать сдвиг до ±N с")
    a = ap.parse_args()
    src = pathlib.Path(a.src).resolve()
    work = src.parent / "_work"
    cut = pathlib.Path(a.cut).resolve() if a.cut else work / f"{src.stem}.cut.mp4"
    plan = json.loads((work / f"{src.stem}.cut.json").read_text())
    full = pcm(src, extract_args(src))       # исходник: звук в шкале картинки
    out = pcm(cut, ["-vn"])                  # склейка
    max_lag = int(a.max * SR / HOP)
    lags = []
    for i, p in enumerate(plan):
        ln = min(3.0, p["src_end"] - p["src_start"])
        if ln < 0.8:
            continue
        s0, o0 = int(p["src_start"] * SR), int(p["out_start"] * SR)
        pad = int(a.max * SR)
        ref = envelope(full[max(0, s0 - pad): s0 + int(ln * SR) + pad])
        seg = envelope(out[o0: o0 + int(ln * SR)])
        # ищем, где кусок склейки лежит в исходнике: ожидаемое место — на pad от начала ref
        exp = (s0 - max(0, s0 - pad)) // HOP
        k, c = lag_of(ref, seg, exp - max_lag, exp + max_lag)
        ms = (k - exp) * HOP * 1000 // SR
        lags.append((i, ms, c))
    bad = [x for x in lags if abs(x[1]) > 40 and x[2] > 0.5]
    for i, ms, c in lags:
        flag = " ←" if abs(ms) > 40 and c > 0.5 else ""
        print(f"  кусок {i:2d}: сдвиг {ms:+5d} мс (сходство {c:.2f}){flag}")
    med = int(np.median([x[1] for x in lags if x[2] > 0.5])) if lags else 0
    print(f"{'SYNC_BAD' if bad else 'SYNC_OK'} {cut.name}: кусков {len(lags)}, со сдвигом >40 мс {len(bad)}, медиана {med:+d} мс "
          f"(+ — голос раньше губ)")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
