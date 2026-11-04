#!/usr/bin/env python3
"""Музыка «多 NEWS» — треки, выбранные пользователем из подборки 100 (04.11.2026: «в работу бери музыку из подборки под
номерами 11, 13, 19, 21, 24, 40, 43, 46, 60, 66, 68, 74, 78, 81, 96 — это самые подходящие варианты»).
Скачивает каждый трек целиком в интернет-материалы/музыка/, меряет громкость (LUFS) и находит удары (резкий рост
низких частот после тихой части), пишет в reels-studio/library/music.json (ключ pool-NNN) и в АВТОРЫ.md.
python3 reels-studio/tools/blog-news/music_pool.py
"""
import json, re, subprocess, urllib.request, numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MUS = ROOT / "интернет-материалы/музыка"
POOL = [11, 13, 19, 21, 24, 40, 43, 46, 60, 66, 68, 74, 78, 81, 96]
KNOWN = {43: "neon-hyperdrive-adiutorium.mp3", 78: "union-square-edit-decktonic.mp3", 81: "magnetz-1000-handz.mp3"}


def slug(t):
    s = re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")
    return s[:48]


def lufs(f):
    o = subprocess.run(["ffmpeg", "-nostats", "-i", str(f), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", o)
    return float(m[-1]) if m else -14.0


def drops(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", "11025", "-af", "lowpass=f=160", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    w = int(11025 * 0.05); n = len(x) // w
    if n < 200:
        return [], len(x) / 11025
    e = np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(1))
    k = 40; sc = []
    for i in range(k, n - k):
        a = e[i - k:i].mean(); b = e[i:i + k].mean()
        sc.append((b / (a + 1e-6), i, b))
    sc.sort(reverse=True)
    thr = np.percentile(e, 60); picked = []
    for r, i, b in sc:
        if b < thr or any(abs(i - j) < 120 for j, _ in picked):
            continue
        # точный удар: самый большой скачок огибающей в ±1 с, шаг 10 мс
        j0 = max(0, i - 20); seg = e[j0:i + 20]
        jj = j0 + int(np.argmax(np.diff(seg))) + 1 if len(seg) > 2 else i
        picked.append((jj, r))
        if len(picked) >= 4:
            break
    return [round(j * 0.05, 2) for j, _ in picked], len(x) / 11025


def main():
    cat = {t["n"]: t for t in json.loads((MUS / "варианты/2026-11-03-100-треков.json").read_text())}
    lib_p = ROOT / "reels-studio/library/music.json"; lib = json.loads(lib_p.read_text())
    authors = (ROOT / "интернет-материалы/АВТОРЫ.md").read_text()
    add = []
    for n in POOL:
        t = cat[n]
        name = KNOWN.get(n) or f"{slug(t['title'])}-{slug(t['artist'])}.mp3"
        f = MUS / name
        if not f.exists():
            try:
                req = urllib.request.Request(t["download_url"], headers={"User-Agent": "Mozilla/5.0"})
                data = urllib.request.urlopen(req, timeout=120).read()
                if name.endswith(".mp3") and t["download_url"].lower().endswith((".wav", ".ogg", ".flac")):
                    tmp = Path("/dev/shm") / ("dl" + Path(t["download_url"]).suffix); tmp.write_bytes(data)
                    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-b:a", "256k", str(f)], check=True); tmp.unlink()
                else:
                    f.write_bytes(data)
            except Exception as e:
                print(f"№{n} НЕ СКАЧАН: {e}"); continue
        L = lufs(f); d, dur = drops(f)
        key = f"pool-{n:03d}"
        lib[key] = {"src": f"интернет-материалы/музыка/{name}", "volume": round(min(0.9, 10 ** ((-20 - L) / 20)), 3), "lufs": round(L, 1),
                    "drops": d, "duration": round(dur, 1), "title": t["title"], "artist": t["artist"], "license": t["license"],
                    "attribution": t["attribution"], "page": t["page_url"], "note": f"№{n} подборки 100; пул «多 NEWS» (04.11.2026)"}
        if t["page_url"] not in authors:
            add.append(f"- `музыка/{name}` — {t['artist']}, «{t['title']}», {t['license']}, {t['page_url']} — пул музыки «多 NEWS» (№{n} подборки, 04.11.2026).")
        print(f"№{n:<3} {name:<55} LUFS {L:6.1f}  удары {d}  {dur:.0f} с")
    lib_p.write_text(json.dumps(lib, ensure_ascii=False, indent=1) + "\n")
    if add:
        (ROOT / "интернет-материалы/АВТОРЫ.md").write_text(authors.rstrip("\n") + "\n" + "\n".join(add) + "\n")


if __name__ == "__main__":
    main()
