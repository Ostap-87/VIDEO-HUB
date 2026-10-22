#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Движок Монтажной: задание из окна → готовый ролик. Запускается в GitHub Actions («Монтажная — рендер»,
.github/workflows/montazh-render.yml) на каждое новое задание montazh/jobs/<id>.json; можно и в облаке Claude.

  python3 montazh/engine/run_job.py <id> [--local <папка с файлами задания>] [--no-upload]

Файлы задания (исходник, чистый голос, свои картинки) лежат в релизе GitHub montazh-<id> — их туда кладёт
сервер Монтажной на Mac. Шаги (как в быстром пайплайне reels-studio):
1. скачать файлы релиза, картинки каталога Higgsfield по ссылкам;
2. npm run cut: чистый звук DeepFilterNet, HDR iPhone → обычный цвет, 30 к/с; паузы и «эканья» — если включено;
3. props из окна (шкала исходника) → шкала склейки: все времена (at, until, start, end, strike…), зумы, финал;
4. вырезка спикера (npm run matte) на отрезках, где она нужна: перебивки «вырезкой», хуки, графики за спиной, спикер по контуру;
5. рендер TalkReelPro, части Stories до 59,5 с, лёгкая копия до 29 МБ, раскадровка;
6. всё — в тот же релиз (окно показывает и скачивает), статус по шагам — status.json там же.
Заметки, которые движок сделать не может (свободный текст), остаются в статусе — их выполняет Claude.
"""
import argparse
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
STUDIO = ROOT / "reels-studio"
sys.path.insert(0, str(STUDIO / "scripts"))
REPO = os.environ.get("GITHUB_REPOSITORY", "Ostap-87/VIDEO-HUB")
TIME_KEYS = {"at", "until", "start", "end", "strike", "pressAt"}


class Job:
    def __init__(self, jid: str, upload: bool):
        self.id = jid
        self.tag = f"montazh-{jid}"
        self.upload = upload
        self.dir = ROOT / "source-videos" / "montazh" / jid
        self.out = ROOT / "finished-videos" / f"_montazh-{jid}"
        self.status = {"id": jid, "stage": "start", "text": "Задание принято", "progress": 0.02, "files": [], "notes": [], "log": []}
        self.t0 = time.time()

    def say(self, stage: str, text: str, progress: float):
        self.status.update(stage=stage, text=text, progress=round(progress, 3), seconds=round(time.time() - self.t0))
        self.status["log"].append(f"{time.strftime('%H:%M:%S')} {text}")
        print(f"▶ {text}", flush=True)
        self.push_status()

    def push_status(self):
        f = self.dir / "status.json"
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps(self.status, ensure_ascii=False, indent=1))
        if self.upload:
            subprocess.run(["gh", "release", "upload", self.tag, str(f), "--clobber", "-R", REPO], check=False, capture_output=True)

    def put(self, path: pathlib.Path, kind: str, title: str):
        if self.upload:
            subprocess.run(["gh", "release", "upload", self.tag, str(path), "--clobber", "-R", REPO], check=True)
        self.status["files"].append({"name": path.name, "kind": kind, "title": title, "size": path.stat().st_size})


def run(cmd, cwd=STUDIO):
    print("  $ " + " ".join(map(str, cmd)), flush=True)
    subprocess.run([str(c) for c in cmd], check=True, cwd=cwd)


def duration(p) -> float:
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]))


def walk(x, f):
    """Обойти props: f(ключ, значение) → новое значение для чисел-времён."""
    if isinstance(x, dict):
        return {k: (f(k, v) if k in TIME_KEYS and isinstance(v, (int, float)) else walk(v, f)) for k, v in x.items()}
    if isinstance(x, list):
        return [walk(v, f) for v in x]
    return x


def replace_strings(x, table: dict):
    if isinstance(x, dict):
        return {k: replace_strings(v, table) for k, v in x.items()}
    if isinstance(x, list):
        return [replace_strings(v, table) for v in x]
    if isinstance(x, str) and x in table:
        return table[x]
    return x


def to_cut(plan: list):
    """Секунда исходника → секунда склейки (вырезанное прижимается к месту склейки)."""
    def f(t: float) -> float:
        for s in plan:
            if t < s["src_start"]:
                return s["out_start"]
            if t <= s["src_end"]:
                return s["out_start"] + t - s["src_start"]
        last = plan[-1]
        return last["out_start"] + last["src_end"] - last["src_start"]
    return f


def lfs_pull(paths):
    """Файлы шаблона, которые лежат в Git LFS (звуки, видео сайтов), — только нужные, чтобы не тратить трафик."""
    need = []
    for p in sorted(set(paths)):
        f = ROOT / p
        if f.is_file() and f.stat().st_size < 400 and f.read_bytes()[:40].startswith(b"version https://git-lfs"):
            need.append(p)
    if need:
        run(["git", "lfs", "pull", "--include", ",".join(need)], cwd=ROOT)


def static_paths(props) -> list:
    out = []

    def go(x):
        if isinstance(x, dict):
            for v in x.values():
                go(v)
        elif isinstance(x, list):
            for v in x:
                go(v)
        elif isinstance(x, str) and "/" in x and not x.startswith(("http", "montazh-")) and (ROOT / x).exists():
            out.append(x)

    go(props)
    return out


def matte_ranges(props, total: float) -> str:
    rs = []
    for b in props.get("broll", []):
        if (b.get("mode") or "cutout") == "cutout":
            rs.append((b["at"], b["until"]))
    for key in ("hooks", "bgFlags"):
        for h in props.get(key, []) or []:
            rs.append((h["at"], h["until"]))
    sd = props.get("stockDrop")
    if sd:
        rs.append((sd["at"], sd["until"]))
    for s in props.get("screens", []) or []:
        if s.get("layout") == "full":
            rs.append((s["at"], s["until"]))
    for s in props.get("speaker", []) or []:
        if s.get("style") == "contour":
            rs.append((s["at"], s["until"]))
    for x in props.get("texts", []) or []:
        if (x.get("plane") or "behind") == "behind":
            rs.append((x["at"], x["until"]))
    rs = sorted((max(0, a - 0.4), min(total, b + 0.4)) for a, b in rs if b > a)
    merged = []
    for a, b in rs:
        if merged and a <= merged[-1][1] + 0.5:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    return ",".join(f"{a:.2f}-{b:.2f}" for a, b in merged)


def stories_points(words, total: float, limit=59.5):
    """Точки разреза Stories на концах фраз (пауза между словами), каждая часть до limit секунд."""
    ends = [w["end"] for i, w in enumerate(words) if i + 1 < len(words) and words[i + 1]["start"] - w["end"] > 0.25]
    pts, start = [], 0.0
    while total - start > limit:
        ok = [e for e in ends if start + 8 < e <= start + limit]
        cut = max(ok) if ok else start + limit
        pts.append(round(cut + 0.08, 2))
        start = cut
    return pts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("id")
    ap.add_argument("--local", help="папка с файлами задания (вместо релиза GitHub)")
    ap.add_argument("--no-upload", action="store_true")
    a = ap.parse_args()
    job = Job(a.id, upload=not a.no_upload and not a.local)
    spec = json.loads((ROOT / "montazh" / "jobs" / f"{a.id}.json").read_text(encoding="utf-8"))
    opts = spec.get("options", {})
    job.status["name"] = spec.get("name", a.id)
    job.status["notes"] = [n for n in spec.get("notes", []) if not n.get("done")]
    try:
        # 1. файлы
        job.say("fetch", "Скачиваю файлы задания", 0.04)
        job.dir.mkdir(parents=True, exist_ok=True)
        if a.local:
            for f in pathlib.Path(a.local).iterdir():
                shutil.copy(f, job.dir / f.name)
        elif subprocess.run(["gh", "release", "view", job.tag, "-R", REPO], capture_output=True).returncode == 0:
            run(["gh", "release", "download", job.tag, "-D", job.dir, "--clobber", "-R", REPO], cwd=ROOT)
        else:  # задание без файлов (исходник по ссылке) — релиз под результат создаём сами
            run(["gh", "release", "create", job.tag, "-R", REPO, "--prerelease", "--target", "main",
                 "--title", f"Монтажная: {spec.get('name', a.id)}", "--notes", f"Готовый ролик задания montazh/jobs/{a.id}.json"], cwd=ROOT)
        src = job.dir / spec["files"]["source"]
        if spec["files"].get("sourceRepo") and not src.exists():  # файл из репозитория (образец montazh/engine/sample.mp4)
            shutil.copy(ROOT / spec["files"]["sourceRepo"], src)
        if spec["files"].get("sourceUrl") and not src.exists():
            job.say("fetch", "Скачиваю исходник по ссылке", 0.05)
            run(["python3", "scripts/fetch.py", spec["files"]["sourceUrl"], job.dir, src.stem])
            got = sorted(job.dir.glob(src.stem + ".*"), key=lambda x: -x.stat().st_size)
            if got and got[0] != src:
                got[0].rename(src)
        if not src.exists():
            raise SystemExit(f"нет исходника {src.name} в релизе {job.tag}")
        props = spec["props"]
        table = {spec["local"]["video"]: None}
        for local_name, asset in spec["files"].get("images", {}).items():
            table[local_name] = str((job.dir / asset).relative_to(ROOT))
        hf = spec.get("hf", {})
        if hf:
            job.say("fetch", f"Скачиваю картинки каталога ({len(hf)})", 0.06)
            (job.dir / "hf").mkdir(exist_ok=True)
            for name, url in hf.items():
                dst = job.dir / "hf" / pathlib.Path(name).name
                if not dst.exists():
                    urllib.request.urlretrieve(url, dst)
                table[name] = str(dst.relative_to(ROOT))

        # 2. склейка, звук, цвет
        words = props.get("words") or []
        wf = job.dir / "source.words.json"
        if not words:
            job.say("words", "Распознаю речь (Whisper)", 0.08)
            run(["bash", "scripts/setup-whisper.sh"])
            run(["python3", "scripts/transcribe.py", src])
            words = json.loads(wf.read_text())
        else:
            wf.write_text(json.dumps(words, ensure_ascii=False))
        cut_args = ["python3", "scripts/cut_pauses.py", src, "--words", wf]
        if not opts.get("cutPauses", True):
            cut_args += ["--min-pause", "999", "--no-fillers"]
        if not pathlib.Path("/opt/dfn/bin/python").exists():
            print("  ! DeepFilterNet не установлен — звук без нейросетевого шумодава", flush=True)
        job.say("cut", "Чищу звук и " + ("вырезаю паузы и «эканья»" if opts.get("cutPauses", True) else "выравниваю видео"), 0.12)
        run(cut_args)
        work = job.dir / "_work"
        cut_mp4 = work / f"{src.stem}.cut.mp4"
        plan = json.loads((work / f"{src.stem}.cut.json").read_text())
        total = duration(cut_mp4)
        raw_total = props.get("speechSeconds") or total
        f = to_cut(plan)
        finale_on = props.get("site", {}).get("at", 0) < raw_total + 1

        # 3. props → шкала склейки
        props = replace_strings(props, {k: v for k, v in table.items() if v})
        zooms = []
        for z in props.get("zooms", []):
            a0 = f(z["at"])
            zooms.append({**z, "at": round(a0, 3), "hold": round(max(0.2, f(z["at"] + z["hold"]) - a0), 3)})
        props = walk(props, lambda k, v: round(f(v), 3) if v <= raw_total + 0.5 else round(total + v - raw_total, 3))
        props["zooms"] = zooms
        props["words"] = json.loads((work / f"{src.stem}.cut.words.json").read_text()) if opts.get("engineWords") else walk(words, lambda k, v: round(f(v), 3))
        props["cuts"] = [round(s["out_start"], 3) for s in plan[1:]]
        props["speechSeconds"] = round(total, 3)
        props["mediaSrc"] = str(cut_mp4.relative_to(ROOT))
        props.pop("audioSrc", None)
        site = props.get("site") or {}
        if not finale_on:
            site["at"] = total + 999
        elif site:
            site["at"] = round(max(0, total - 3.2), 3)
        props["site"] = site

        # линия глаз: пользователь не отметил глаза в окне (стоит значение по умолчанию) — находим сами (npm run grid)
        fc = props.get("focus") or {}
        if opts.get("autoFocus") or (fc.get("x") == 540 and fc.get("y") in (700, 900)):
            try:
                run(["python3", "scripts/grid.py", cut_mp4])
                lay = json.loads(cut_mp4.with_suffix(".layout.json").read_text())
                if lay.get("eyeX") and lay.get("eyeY"):
                    props["focus"] = {"x": lay["eyeX"], "y": lay["eyeY"]}
            except (subprocess.CalledProcessError, OSError, ValueError):
                print("  ! линия глаз не нашлась — оставляю как в окне", flush=True)

        # 4. вырезка спикера
        ranges = matte_ranges(props, total)
        if ranges:
            job.say("matte", f"Вырезаю спикера из фона ({ranges})", 0.3)
            run(["python3", "scripts/matte.py", cut_mp4, "--ranges", ranges])
            props["cutoutSrc"] = str(cut_mp4.with_suffix(".alpha.webm").relative_to(ROOT))
        else:
            props["cutoutSrc"] = ""

        # 5. рендер
        lfs_pull(static_paths(props) + [f"source-videos/2026-10-07-byt-tehnika/sfx/{n}.wav" for n in ("whoosh", "switch", "whip")])
        job.out.mkdir(parents=True, exist_ok=True)
        pf = job.dir / "props.render.json"
        pf.write_text(json.dumps(props, ensure_ascii=False))
        slug = f"montazh-{a.id}"
        video = job.out / f"{slug}.mp4"
        fmt = "Stories" if props.get("format") == "stories" else "Reels"
        job.say("render", f"Рендерю {fmt} ({total:.0f} с) — это самый долгий шаг", 0.45)
        conc = str(max(2, (os.cpu_count() or 4)))
        run(["./node_modules/.bin/remotion", "render", "src/index.ts", "TalkReelPro", video, f"--props={pf}", f"--concurrency={conc}", "--log=error"])
        from auto import light_copy  # noqa: E402 — тот же рецепт, что у быстрого пайплайна

        job.say("finish", "Готовлю копию для телефона и раскадровку", 0.9)
        job.put(video, "video", f"{fmt}, полное качество")
        if video.stat().st_size > 29 * 1024 * 1024:
            phone = job.out / f"{slug}-phone.mp4"
            light_copy(video, phone)
            job.put(phone, "phone", "Копия для телефона (до 29 МБ)")
        sheet = job.out / f"{slug}-frames.jpg"
        run(["python3", "scripts/frames.py", video, "--every", "3", "--out", sheet])
        job.put(sheet, "frames", "Раскадровка")
        if fmt == "Stories" and duration(video) > 59.9:
            lead = 44 / 30 if props.get("brand", "gtt") == "gtt" and props.get("bumper") is not False else 0  # заставка GTT
            pts = [round(p + lead, 2) for p in stories_points(props["words"], total)]
            run(["python3", "scripts/stories.py", video, "--at", ",".join(map(str, pts))])
            for part in sorted(job.out.glob(f"{slug}-[0-9]*.mp4")):
                job.put(part, "part", f"Stories, часть {part.stem.rsplit('-', 1)[-1]}")

        # реестр картинок Higgsfield: «одна картинка — один раз»
        if hf and job.upload:
            reg_f = ROOT / "source-videos" / "higgsfield" / "использовано.json"
            cat = json.loads((ROOT / "source-videos" / "higgsfield" / "каталог.json").read_text(encoding="utf-8"))
            reg = json.loads(reg_f.read_text(encoding="utf-8"))
            for name in hf:
                n = re.sub(r"\D", "", pathlib.Path(name).stem)
                e = reg.setdefault(n, {"id": cat[int(n)]["id"], "prompt": cat[int(n)].get("prompt", "")[:100], "videos": []})
                if slug not in e["videos"]:
                    e["videos"].append(slug)
            reg_f.write_text(json.dumps(reg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        job.status["done"] = True
        job.say("done", "Готово" + (f" · заметок для Claude: {len(job.status['notes'])}" if job.status["notes"] else ""), 1.0)
    except BaseException as e:  # noqa: BLE001 — ошибку видно в окне
        job.status["error"] = f"{type(e).__name__}: {e}"
        job.say("error", "Ошибка: " + job.status["error"][:300], job.status.get("progress", 0))
        raise


if __name__ == "__main__":
    main()
