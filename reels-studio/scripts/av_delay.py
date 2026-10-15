"""Починка синхрона в готовых роликах без перемонтажа (15.10.2026, см. avsync.py).

  python3 scripts/av_delay.py <props-имя> [<props-имя> …] [--dry-run]

У роликов, нарезанных до 15.10.2026 из исходника, где звук начинается позже картинки (start_time звука ~0,1 с у iPhone),
голос в склейке опережает губы ровно на этот сдвиг. Пока сдвиг меньше запаса склейки (0,12 с до и после речи), его можно
убрать задержкой всего звука готового файла: внутри каждого куска губы и голос совпадают, а на стыках сдвигается только
тишина запаса. Картинка не перекодируется (`-c:v copy`), длина файла та же, звук — AAC с прежним битрейтом.
Обрабатываются Reels, ролик с обложкой, части Stories, лёгкие копии и склейка `_work/<клип>.cut.mp4` (для будущих
перерендеров). Сдвиг больше 0,12 с так не лечится — нужна новая нарезка (`npm run cut`, теперь со сдвигом) и рендер.
Каждый обработанный файл записывается в `library/av-sync.json` — повторный запуск его не трогает (иначе задержка удвоится).
"""
import argparse
import datetime as dt
import json
import pathlib
import subprocess

from avsync import av_offset

STUDIO = pathlib.Path(__file__).resolve().parents[1]
REPO = STUDIO.parent
FIN = REPO / "finished-videos"
LEDGER = STUDIO / "library" / "av-sync.json"
VIDEO_EXT = (".mov", ".mp4", ".m4v", ".mkv")
MARGIN = 0.12


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,bit_rate,sample_rate,channels:format=duration",
                          "-of", "json", str(path)], capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    return float(d["format"]["duration"]), a


def source_of(props):
    """Исходник ролика: папка склейки из mediaSrc, файл <клип>.<видео>."""
    media = REPO / props["mediaSrc"]
    clip = media.name.split(".")[0]
    folder = media.parent.parent if media.parent.name == "_work" else media.parent
    return next((p for p in sorted(folder.glob(f"{clip}.*")) if p.suffix.lower() in VIDEO_EXT), None), media


def delay(path, ms, dry):
    dur, a = probe(path)
    if a is None:
        return "нет звука"
    br = int(a.get("bit_rate") or 192000)
    br = max(96, round(br / 1000 / 32) * 32)
    if dry:
        return f"задержу звук на {ms} мс (AAC {br}k)"
    tmp = path.with_name(path.stem + ".avsync.tmp.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy",
                    "-af", f"adelay={ms}:all=1", "-t", f"{dur:.3f}", "-c:a", "aac", "-b:a", f"{br}k",
                    "-ar", str(a.get("sample_rate") or 48000), "-ac", str(a.get("channels") or 2),
                    "-movflags", "+faststart", str(tmp)], check=True)
    tmp.replace(path)
    return f"звук задержан на {ms} мс"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="+")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    ledger = json.loads(LEDGER.read_text()) if LEDGER.exists() else {}
    for name in a.names:
        props = json.loads((STUDIO / "props" / f"{name}.json").read_text())
        src, cut = source_of(props)
        off = av_offset(src) if src else 0.0
        if off <= 0.03:
            print(f"{name}: сдвиг {off * 1000:+.0f} мс — не нужно")
            continue
        if off > MARGIN:
            print(f"{name}: сдвиг {off * 1000:.0f} мс больше запаса склейки — нужна новая нарезка и рендер, задержкой не лечится")
            continue
        ms = round(off * 1000)
        files = sorted({*FIN.glob(f"{name}.mp4"), *FIN.glob(f"{name}-cover.mp4"), *FIN.glob(f"{name}-stories-*.mp4"),
                        *(FIN / "для-телефона").glob(f"{name}.mp4"), *(FIN / "для-телефона").glob(f"{name}-cover.mp4"),
                        *(FIN / "для-телефона").glob(f"{name}-stories-*.mp4")} | ({cut} if cut.exists() else set()))
        print(f"{name}: исходник {src.name}, звук позже картинки на {ms} мс")
        for f in files:
            key = f.relative_to(REPO).as_posix()
            # склейка в _work не в git: её пометку держим по времени изменения файла
            stamp = f.stat().st_mtime if "/_work/" in key else None
            done = ledger.get(key)
            if done and (stamp is None or abs(done.get("mtime", 0) - stamp) < 1):
                print(f"  · {key}: уже исправлен ({done['delay_ms']} мс)")
                continue
            print(f"  ✓ {key}: {delay(f, ms, a.dry_run)}")
            if not a.dry_run:
                ledger[key] = {"delay_ms": ms, "date": dt.date.today().isoformat(),
                               **({"mtime": f.stat().st_mtime} if "/_work/" in key else {})}
    if not a.dry_run:
        LEDGER.write_text(json.dumps(ledger, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
