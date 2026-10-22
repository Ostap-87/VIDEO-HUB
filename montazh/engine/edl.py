#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Склейка нескольких роликов по монтажному листу Монтажной (решение пользователя 22.10.2026: «добавлять несколько роликов
и потом на основе их склеивать видео… очищать от пауз и эканий»). Монтажный лист считает окно (montazh/app/assemble.ts)
и показывает в предпросмотре; здесь движок собирает тот же лист кадр в кадр.

1. Каждый ролик листа → 1080×1920 (кадрирование «cover», как в предпросмотре), ровно 30 к/с, HDR iPhone → обычный цвет;
   звук — в шкале картинки (avsync.py), моно 48 кГц, ровно столько сэмплов, сколько кадров × 1600.
2. Ролики встык → один файл joined.mkv; куски листа → секунды этого файла.
3. Дальше обычный путь: npm run cut --segments (шумодав по всей записи, куски по кадрам, студийный звук) — run_job.py.
"""
import json
import pathlib
import subprocess
import sys

STUDIO = pathlib.Path(__file__).resolve().parents[2] / "reels-studio"
sys.path.insert(0, str(STUDIO / "scripts"))
from avsync import extract_args  # noqa: E402
from cut_pauses import FPS, SR, SPF, hdr_filter  # noqa: E402


def run(cmd):
    print("  $ " + " ".join(map(str, cmd)), flush=True)
    subprocess.run([str(c) for c in cmd], check=True)


def video_seconds(path) -> float:
    """Длина видеодорожки (у MOV iPhone она бывает короче контейнера)."""
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration:format=duration",
                          "-of", "json", str(path)], capture_output=True, text=True).stdout
    d = json.loads(out or "{}")
    for s in d.get("streams", []):
        if s.get("duration") not in (None, "N/A"):
            return float(s["duration"])
    return float(d.get("format", {}).get("duration", 0))


def has_audio(path) -> bool:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout
    return bool(out.strip())


def normalize(src: pathlib.Path, work: pathlib.Path, name: str):
    """Ролик → видео 1080×1920 30 к/с (n кадров) + звук ровно n × 1600 сэмплов. Возвращает (видео, звук, n)."""
    n = max(1, int(video_seconds(src) * FPS))
    vid, wav = work / f"{name}.mkv", work / f"{name}.wav"
    hdr = hdr_filter(src)
    vf = f"fps={FPS}" + (f",{hdr}" if hdr else "") + ",scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-an", "-vf", vf, "-frames:v", n, "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "14", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", vid])
    total = n * SPF
    if has_audio(src):
        args = extract_args(src)
        af = (args[args.index("-af") + 1] + "," if "-af" in args else "") + f"atrim=end_sample={total},apad=whole_len={total}"
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-vn", "-af", af, "-ac", "1", "-ar", SR, "-c:a", "pcm_s16le", wav])
    else:
        run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-af", f"atrim=end_sample={total}",
             "-c:a", "pcm_s16le", wav])
    return vid, wav, n


def build_joined(clips: dict, edl: list, work: pathlib.Path):
    """clips: id ролика → файл; edl: [{clip, from, to}] (секунды ролика).
    Возвращает (joined.mkv, куски в секундах joined, куски листа, которые вошли — короче кадра не входят)."""
    work.mkdir(parents=True, exist_ok=True)
    order = list(dict.fromkeys(s["clip"] for s in edl))
    offset, vids, wavs, t = {}, [], [], 0
    for i, cid in enumerate(order):
        vid, wav, n = normalize(pathlib.Path(clips[cid]), work, f"c{i:02d}")
        offset[cid] = (t, n / FPS)
        vids.append(vid)
        wavs.append(wav)
        t += n / FPS
    (work / "v.txt").write_text("".join(f"file '{v.as_posix()}'\n" for v in vids))
    (work / "a.txt").write_text("".join(f"file '{w.as_posix()}'\n" for w in wavs))
    run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", work / "v.txt", "-c", "copy", work / "v.mkv"])
    run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", work / "a.txt", "-c", "copy", work / "a.wav"])
    joined = work / "joined.mkv"
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", work / "v.mkv", "-i", work / "a.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy",
         "-c:a", "pcm_s16le", joined])
    segs, kept = [], []
    for s in edl:
        o, ln = offset[s["clip"]]
        a, b = max(0.0, min(ln, s["from"])), max(0.0, min(ln, s["to"]))
        if b - a >= 1 / FPS:
            segs.append({"src_start": round(o + a, 4), "src_end": round(o + b, 4)})
            kept.append({**s, "from": a, "to": b})
    return joined, segs, kept


def edl_to_cut(edl: list, plan: list):
    """Секунда склейки окна (куски листа встык) → секунда готовой склейки движка (куски округлены до кадров)."""
    starts, at = [], 0.0
    for s in edl:
        starts.append(at)
        at += s["to"] - s["from"]

    def f(t: float) -> float:
        i = 0
        while i + 1 < len(starts) and t >= starts[i + 1]:
            i += 1
        if i >= len(plan):
            i = len(plan) - 1
        ln = plan[i]["src_end"] - plan[i]["src_start"]
        return plan[i]["out_start"] + max(0.0, min(ln, t - starts[i]))
    return f, at
