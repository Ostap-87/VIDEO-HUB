"""Сведение рекламного ролика: клипы экрана подгоняются под голос так, чтобы каждое действие совпало со своим словом.

  python3 scripts/promo_build.py promo/2026-10-27-gtt-app.json [--format v|h]

Берёт сценарий (beats, cues: клип + метка + слово «on»), тайминги голоса (source-videos/<name>/voice/timing.json, пишет
promo_voice.py) и записи экрана (source-videos/<name>/clips/<клип>.mp4 + .json, пишет app_record.mjs).
Для каждой сцены собирает source-videos/<name>/screens/<сцена>.mp4: от действия к действию клип играет как записан,
лишнее ожидание срезается, нехватка добирается стоп-кадром (во время паузы экран и так неподвижен). Метка совпадает
с началом своего слова минус `lead` (палец успевает подлететь). Пишет props/<name>.json для композиции AppPromo:
окна сцен, нажатия (x, y — доли экрана телефона), наезды на рамку элемента, плашки и крупные слова по времени слов,
субтитры из слов диктора.
"""
import argparse
import json
import pathlib
import re
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO = ROOT.parent
FPS = 30
PRE = 0.25      # картинка сцены меняется чуть раньше голоса
HANDLE = 0.5    # хвост сцены под переход к следующей
TAIL = 3.2      # после последней фразы: финальная плашка
LEAD_TAP = 0.45
LEAD_IDLE = 0.15


def norm(w: str) -> str:
    return re.sub(r"[^a-zа-яё0-9]", "", w.lower().replace("ё", "е"))


def word_time(beat: dict, on: str, after: float = -1) -> float:
    """Начало первого слова сцены, которое начинается с `on` (после времени after)."""
    key = norm(on.split()[0])
    for w in beat["words"]:
        if w["start"] > after and norm(w["text"]).startswith(key):
            return w["start"]
    raise SystemExit(f"{beat['id']}: слово «{on}» не найдено в «{' '.join(x['text'] for x in beat['words'])}»")


def clip_info(clips_dir: pathlib.Path, cid: str) -> dict:
    return json.loads((clips_dir / f"{cid}.json").read_text())


def render_beat(out: pathlib.Path, segs: list[dict], clips_dir: pathlib.Path):
    """segs: [{clip, s, play, hold_before, dur}] → один mp4 ровно на сумму dur."""
    with tempfile.TemporaryDirectory() as tmp:
        parts = []
        for i, g in enumerate(segs):
            p = pathlib.Path(tmp) / f"{i}.mp4"
            play = max(1 / FPS, min(g["play"], g["dur"] - g["hold_before"]))
            vf = f"fps={FPS},tpad=start_mode=clone:start_duration={g['hold_before']:.3f}:stop_mode=clone:stop_duration={g['dur']:.3f}," \
                 f"trim=duration={g['dur']:.3f},setpts=PTS-STARTPTS,format=yuv420p"
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{g['s']:.3f}", "-t", f"{play:.3f}",
                            "-i", str(clips_dir / f"{g['clip']}.mp4"), "-vf", vf, "-an", "-c:v", "libx264", "-preset", "veryfast",
                            "-crf", "14", str(p)], check=True)
            parts.append(p)
        lst = pathlib.Path(tmp) / "list.txt"
        lst.write_text("".join(f"file '{p}'\n" for p in parts))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c:v", "libx264",
                        "-preset", "medium", "-crf", "15", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--format", default="v", choices=["v", "h"])
    ap.add_argument("--no-video", action="store_true", help="только props, без пересборки экранов")
    a = ap.parse_args()

    spec = json.loads((ROOT / a.script).read_text())
    name = spec["name"]
    src = REPO / "source-videos" / name
    timing = json.loads((src / "voice" / "timing.json").read_text())
    tb = {b["id"]: b for b in timing["beats"]}
    clips_dir = src / "clips"
    screens = src / "screens"
    screens.mkdir(exist_ok=True)

    beats_spec = spec["beats"]
    W0 = [tb[b["id"]]["start"] - PRE for b in beats_spec]
    total = timing["total"] + TAIL
    W1 = W0[1:] + [total]
    out_beats, taps, focus = [], [], []
    kick_n = 0
    for i, b in enumerate(beats_spec):
        t = tb[b["id"]]
        beat = {"id": b["id"], "part": b["part"], "visual": b.get("visual", "phone"), "start": t["start"], "end": t["end"],
                "w0": round(W0[i], 3), "w1": round(W1[i], 3)}
        for k in ("title", "cta", "fx", "still"):
            if b.get(k):
                beat[k] = b[k]
        if b.get("kicker"):
            kick_n += 1
            beat["kicker"] = f"{kick_n:02d} · {b['kicker'].upper()}"
        if b.get("chips"):
            beat["chips"] = [{"text": c["text"], "at": round(word_time(t, c["on"]), 3)} for c in b["chips"]]
        if b.get("words"):
            beat["bigWords"] = [{"text": c["text"], "at": round(word_time(t, c["on"]), 3)} for c in b["words"]]
        if b.get("counter"):
            c = b["counter"]
            beat["counter"] = {**c, "at": round(word_time(t, c["on"]), 3), "subAt": round(word_time(t, c["subOn"]), 3)}

        cues = b.get("cues") or []
        if cues:
            info = {c["clip"]: clip_info(clips_dir, c["clip"]) for c in cues}
            rows, after = [], -1
            for c in cues:
                T = word_time(t, c["on"], after - 0.01)
                after = T
                m = info[c["clip"]]["marks"].get(c["mark"])
                if m is None:
                    raise SystemExit(f"{b['id']}: в клипе {c['clip']} нет метки {c['mark']} (есть: {', '.join(info[c['clip']]['marks'])})")
                lead = c.get("lead", LEAD_TAP if ("x" in m or m.get("swipe")) else LEAD_IDLE)
                rows.append({**c, "T": T, "r": m["t"], "lead": lead})
            segs = []
            for k, r in enumerate(rows):
                a0 = W0[i] if k == 0 else r["T"] - r["lead"]
                b0 = rows[k + 1]["T"] - rows[k + 1]["lead"] if k + 1 < len(rows) else W1[i] + HANDLE
                s = r["r"] - (r["T"] - W0[i]) if k == 0 else r["r"] - r["lead"]
                hold_before = 0.0
                if s < 0:
                    hold_before, s = -s, 0.0
                end = info[r["clip"]]["duration"]
                if k + 1 < len(rows) and rows[k + 1]["clip"] == r["clip"]:
                    end = min(end, rows[k + 1]["r"] - rows[k + 1]["lead"])
                seg = {"clip": r["clip"], "s": round(s, 3), "play": round(max(0.0, end - s), 3), "hold_before": round(hold_before, 3),
                       "dur": round(b0 - a0, 3), "a": round(a0, 3)}
                segs.append(seg)
                # все нажатия клипа, которые попали в проигранный кусок, — на шкалу ролика
                for mn, m in info[r["clip"]]["marks"].items():
                    if "x" in m and s <= m["t"] < s + min(seg["play"], seg["dur"] - hold_before):
                        at = a0 + hold_before + (m["t"] - s)
                        taps.append({"at": round(at, 3), "x": round(m["x"], 4), "y": round(m["y"], 4), "hold": m.get("hold", 0), "beat": b["id"]})
                if r.get("focus"):
                    fm = info[r["clip"]]["marks"].get(r["focus"]) or {}
                    if fm.get("box"):
                        focus.append({"at": round(r["T"], 3), "until": round(min(b0 + 0.2, r["T"] + 2.2), 3), "box": fm["box"], "beat": b["id"]})
                if r.get("launch"):
                    beat["launch"] = round(r["T"] - 0.55, 3)
            beat["screen"] = f"source-videos/{name}/screens/{b['id']}.mp4"
            beat["screenDur"] = round(W1[i] + HANDLE - W0[i], 3)
            if not a.no_video:
                render_beat(screens / f"{b['id']}.mp4", segs, clips_dir)
            print(f"{b['id']}: {W0[i]:.2f}–{W1[i]:.2f}  " + "  ".join(f"{g['clip']}@{g['s']:.1f}+{g['play']:.1f}/{g['dur']:.1f}" for g in segs))
        else:
            print(f"{b['id']}: {W0[i]:.2f}–{W1[i]:.2f}  ({beat['visual']})")
        out_beats.append(beat)

    captions = [{"text": w["text"], "start": w["start"], "end": w["end"]} for bt in timing["beats"] for w in bt["words"]]
    props = {
        "format": a.format,
        "voice": f"source-videos/{name}/voice/voice.wav",
        "voiceSource": timing.get("source", ""),
        "music": spec.get("music", ""),
        "total": round(total, 3),
        "beats": out_beats,
        "taps": sorted(taps, key=lambda x: x["at"]),
        "focus": focus,
        "captions": captions,
        "sfxDir": f"source-videos/{name}/sfx",
        "stills": f"source-videos/{name}/stills",
    }
    dst = ROOT / "props" / f"{name}.json"
    dst.write_text(json.dumps(props, ensure_ascii=False, indent=1))
    print(f"→ {dst}  ({total:.1f} с, {len(taps)} нажатий, {len(focus)} наездов)")


if __name__ == "__main__":
    main()
