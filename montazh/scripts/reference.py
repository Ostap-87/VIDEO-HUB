#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Референс → разбор приёмов (решение пользователя 22.10.2026: «скидывал ссылку на видео, ты сам смотришь, забираешь
нужные эффекты и сохраняешь в библиотеку»).

  python3 montazh/scripts/reference.py <ссылка или файл> [--name <коротко>] [--what "что забрать"] [--every 0.5]

1. Скачивает ролик в source-videos/референсы-эффекты/<дата>-<имя>/ (YouTube, VK, Rutube, Instagram и TikTok — yt-dlp;
   Instagram и TikTok из облака часто закрыты — тогда ролик скачивает Монтажная на Mac или пользователь присылает файлом;
   Google Диск, Яндекс Диск, WeTransfer, прямые — scripts/fetch.py).
2. Склейки (смена плана, ffmpeg scene) и всплески громкости (удары, «вжухи»).
3. Листы кадров: весь ролик через --every с (по 24 кадра на лист) и первые кадры каждого плана — их смотрит Claude.
4. ref.json (откуда, длина, склейки, что забрать) и разбор.md — заготовка: что за приём, на какой секунде, как сделать
   в TalkReelPro, какой эффект библиотеки получился. Готовые эффекты — montazh/app/effects.ts + превью, ссылка на
   референс — поле ref у эффекта (окно показывает рядом кусок референса).
"""
import argparse
import datetime
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
STUDIO = ROOT / "reels-studio"
OUT = ROOT / "source-videos" / "референсы-эффекты"
YTDLP_HOSTS = ("youtube.com", "youtu.be", "vk.com", "vkvideo.ru", "rutube.ru", "instagram.com", "tiktok.com", "dzen.ru", "x.com", "twitter.com", "ok.ru")


def run(cmd, **kw):
    print("  $ " + " ".join(map(str, cmd)), flush=True)
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


def probe(p: pathlib.Path) -> dict:
    d = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(p)]))
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), {})
    num, den = (v.get("r_frame_rate") or "30/1").split("/")
    return {"duration": round(float(d["format"]["duration"]), 2), "width": v.get("width"), "height": v.get("height"), "fps": round(float(num) / float(den or 1), 2)}


def fetch(src: str, folder: pathlib.Path) -> tuple[pathlib.Path, dict]:
    folder.mkdir(parents=True, exist_ok=True)
    if not re.match(r"^https?://", src):
        p = pathlib.Path(src).resolve()
        dst = folder / ("ролик" + p.suffix.lower())
        if p != dst:
            dst.write_bytes(p.read_bytes())
        return dst, {"source": "файл"}
    meta = {"url": src}
    if any(h in src for h in YTDLP_HOSTS):
        info = folder / "ролик.info.json"
        try:
            run(["yt-dlp", "-q", "--no-playlist", "-f", "bv*[height<=1920][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4",
                 "--write-info-json", "-o", str(folder / "ролик.%(ext)s"), src])
        except subprocess.CalledProcessError:
            sys.exit("REF_BLOCKED: сайт не отдал ролик в облако (Instagram/TikTok часто требуют вход). "
                     "Добавьте референс в Монтажной на Mac (скачает с вашим входом) или пришлите файлом.")
        if info.exists():
            j = json.loads(info.read_text())
            meta.update(title=j.get("title"), uploader=j.get("uploader"), site=j.get("extractor_key"))
            info.unlink()
        return next(folder.glob("ролик.mp4")), meta
    out = run(["python3", "scripts/fetch.py", src, folder, "ролик"], cwd=STUDIO, capture_output=True, text=True).stdout.strip().splitlines()[-1]
    return pathlib.Path(out), meta


def scene_cuts(p: pathlib.Path, thr=0.3) -> list:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(p), "-vf", f"select='gt(scene,{thr})',showinfo", "-an", "-f", "null", "-"],
                       capture_output=True, text=True)
    return [round(float(m), 2) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]


def loud_hits(p: pathlib.Path) -> list:
    """Всплески громкости (удары, «вжухи», щелчки) — по 0,1 с, громче соседей на 9 дБ."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(p), "-af", "astats=metadata=1:reset=3,ametadata=print:key=lavfi.astats.Overall.RMS_level",
                        "-vn", "-f", "null", "-"], capture_output=True, text=True)
    ts = [float(x) for x in re.findall(r"pts_time:([0-9.]+)", r.stderr)]
    lv = [float(x) if x not in ("-inf", "inf") else -90.0 for x in re.findall(r"RMS_level=(-?[0-9.]+|-?inf)", r.stderr)]
    if not ts or len(ts) != len(lv):
        return []
    step = max(1, round(0.1 / max(1e-3, (ts[-1] - ts[0]) / max(1, len(ts) - 1))))
    t2, l2 = ts[::step], [max(lv[i:i + step]) for i in range(0, len(lv), step)]
    hits = []
    for i in range(3, len(l2)):
        base = sum(l2[i - 3:i]) / 3
        if l2[i] - base > 9 and (not hits or t2[i] - hits[-1] > 0.4):
            hits.append(round(t2[i], 2))
    return hits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="ссылка, файл или ref:<id> — референс, добавленный в Монтажной (релиз montazh-refs)")
    ap.add_argument("--name", default="")
    ap.add_argument("--what", default="", help="что забрать (слова пользователя)")
    ap.add_argument("--every", type=float, default=0.5)
    a = ap.parse_args()
    m = re.fullmatch(r"ref:([0-9a-z]{4,24})", a.src)
    if m:  # добавлен в окне: описание — montazh/references/<id>.json, файл — релиз montazh-refs
        rj = json.loads((ROOT / "montazh" / "references" / f"{m.group(1)}.json").read_text(encoding="utf-8"))
        a.what = a.what or rj.get("what", "")
        a.name = a.name or rj.get("name") or m.group(1)
        a.src = f"https://github.com/Ostap-87/VIDEO-HUB/releases/download/montazh-refs/{rj['asset']}" if rj.get("asset") else rj["url"]
    day = datetime.date.today().isoformat()
    slug = re.sub(r"[^\w-]+", "-", a.name or "референс").strip("-")[:40] or "референс"
    folder = OUT / f"{day}-{slug}"
    n = 2
    while folder.exists() and any(folder.glob("ролик.*")) and not a.src.startswith(str(folder)):
        folder = OUT / f"{day}-{slug}-{n}"
        n += 1
    print(f"▶ Скачиваю в {folder.relative_to(ROOT)}", flush=True)
    video, meta = fetch(a.src, folder)
    info = probe(video)
    print(f"▶ {info['duration']} с, {info['width']}×{info['height']}, {info['fps']} к/с", flush=True)
    cuts = scene_cuts(video)
    hits = loud_hits(video)
    print(f"▶ склеек: {len(cuts)}, всплесков звука: {len(hits)}", flush=True)
    sheets = []
    total = info["duration"]
    per = 24 * a.every  # секунд на лист
    k = 0
    while k * per < total:
        out = folder / f"кадры-{k + 1:02d}.jpg"
        times = [round(k * per + i * a.every, 2) for i in range(24) if k * per + i * a.every < total]
        run(["python3", "scripts/frames.py", video, "--at", ",".join(map(str, times)), "--cols", "6", "--out", out], cwd=STUDIO, capture_output=True)
        sheets.append(out.name)
        k += 1
    if cuts:
        out = folder / "планы.jpg"
        run(["python3", "scripts/frames.py", video, "--at", ",".join(str(round(min(total - 0.05, c + 0.05), 2)) for c in [0.0] + cuts[:47]), "--cols", "6", "--out", out], cwd=STUDIO, capture_output=True)
        sheets.append(out.name)
    ref = {"created": day, **meta, **info, "what": a.what, "video": video.name, "cuts": cuts, "hits": hits, "sheets": sheets, "effects": []}
    (folder / "ref.json").write_text(json.dumps(ref, ensure_ascii=False, indent=1), encoding="utf-8")
    md = folder / "разбор.md"
    if not md.exists():
        md.write_text(
            f"# Референс {folder.name}\n\nОткуда: {meta.get('url', 'файл')}"
            + (f" — {meta.get('title')}" if meta.get("title") else "")
            + f"\nЧто забрать (пользователь): {a.what or '—'}\n\nДлина {info['duration']} с, склейки: {', '.join(map(str, cuts[:40])) or 'нет'}\n"
            "\n## Приёмы\n\n| Секунда | Что видно | Как сделать у нас | Эффект библиотеки |\n|---|---|---|---|\n",
            encoding="utf-8",
        )
    print("REF_OK", folder.relative_to(ROOT), flush=True)
    for s in sheets:
        print("  лист:", (folder / s).relative_to(ROOT))


if __name__ == "__main__":
    main()
