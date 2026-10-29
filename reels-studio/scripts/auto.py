"""Быстрый пайплайн: от ссылки на видео до Reels + Stories одной командой.

  npm run auto -- <ссылка или файл> --theme avto                 # всё: скачать … отрендерить
  npm run auto -- <ссылка> --theme avto --until prep              # остановиться перед рендером (проверить черновик)
  npm run auto -- --name 2026-10-09-avto --render                 # рендер после проверки и правок props
  npm run auto -- --name 2026-10-09-avto --render --split 52.2    # своя точка разреза Stories

Темы: library/themes.json (avto, ai, byt-tehnika, chai-kofe, konditerka, kosmetika, novyi-riteil, tech-giganty, obshchee).
Имя по умолчанию: <сегодня>-<тема>. Каждый этап пропускается, если его результат уже есть, поэтому команду
можно перезапускать после обрыва. Ход работы — строки «▶ …» в выводе; в конце AUTO_DONE <имя> или AUTO_FAIL <имя> <этап>.

Этапы: установка (scripts/setup.sh) → скачивание (fetch.py) → раскадровка исходника → расшифровка Whisper →
вырезка пауз и чистка звука → сетка и линия глаз → черновик props (autoprops.py: плашки, логотипы, города, цифры,
чек-листы, перебивки, зумы, финал) → вырезка спикера (только нужные отрезки) → [prep] → рендер Reels → раскадровка →
рендер Stories → нарезка на части до 60 с → лёгкие копии для телефона (до 30 МБ).
"""
import argparse
import datetime
import json
import os
import pathlib
import shutil
import subprocess
import sys

STUDIO = pathlib.Path(__file__).resolve().parent.parent
ROOT = STUDIO.parent
FIN = ROOT / "finished-videos"
VIDEO_EXT = (".MOV", ".mov", ".MP4", ".mp4", ".m4v", ".mkv", ".webm")
CONCURRENCY = "4"


def step(msg):
    print(f"▶ {msg}", flush=True)


def run(cmd, **kw):
    print("  $ " + " ".join(map(str, cmd)), flush=True)
    subprocess.run([str(c) for c in cmd], check=True, cwd=STUDIO, **kw)


def render_env():
    """Временные файлы рендера — в память (/dev/shm), если там есть место: Chrome рендера держит общую память файлами
    во временной папке (~700 МБ) плюс копии исходников Remotion (~300 МБ) — на диске сессии их не хватало, рендер падал
    с «disk space is low» (Alibaba v2, 29.10.2026)."""
    env = dict(os.environ)
    shm = pathlib.Path("/dev/shm")
    if shm.is_dir() and shutil.disk_usage(shm).free > 4 * 2**30:
        tmp = shm / "remotion-tmp"
        tmp.mkdir(exist_ok=True)
        env["TMPDIR"] = str(tmp)
    return env


def light_copy(src, dst):
    """Копия для телефона и чата — до 29 МБ (лимит чата 30 МиБ): битрейт по длине ролика, не выше 12 Мбит/с.
    Короткие Stories получают почти полное качество (решение 14.10.2026: прежние 2 Мбит/с — «мыльно» для 15-секундных)."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    log = f"/tmp/auto-2pass-{src.stem}"
    sec = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)]))
    kbps = max(2000, min(12000, int(29 * 8 * 1024 * 0.95 / sec) - 160))
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-c:v", "libx264", "-preset", "slow", "-b:v", f"{kbps}k", "-pass", "1", "-passlogfile", log, "-an", "-f", "mp4", "/dev/null"])
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-c:v", "libx264", "-preset", "slow", "-b:v", f"{kbps}k", "-pass", "2", "-passlogfile", log,
         "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", dst])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", nargs="?", help="ссылка WeTransfer / Google Drive / прямая или путь к файлу")
    ap.add_argument("--theme")
    ap.add_argument("--name", help="имя ролика (папка source-videos/<имя>, props/<имя>.json)")
    ap.add_argument("--clip", help="короткое имя файла исходника (по умолчанию — тема)")
    ap.add_argument("--until", choices=["prep"], help="prep — остановиться перед рендером")
    ap.add_argument("--render", action="store_true", help="только рендер (props уже проверены)")
    ap.add_argument("--split", help="точки разреза Stories в секундах через запятую")
    ap.add_argument("--rematte", action="store_true", help="пересчитать вырезку спикера (после правки перебивок)")
    ap.add_argument("--stories-only", action="store_true", help="только Stories (без Reels): рендер, части до 60 с, раскадровка")
    a = ap.parse_args()

    if not a.name:
        if not a.theme:
            raise SystemExit("Нужны --theme (или --name для уже начатого ролика)")
        a.name = f"{datetime.date.today():%Y-%m-%d}-{a.theme}"
    folder = ROOT / "source-videos" / a.name
    work = folder / "_work"
    state_path = work / "auto.state.json"
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    a.theme = a.theme or state.get("theme")
    a.clip = a.clip or state.get("clip") or a.theme
    if not a.theme:
        raise SystemExit("Не знаю тему: укажи --theme")
    stage = "start"
    try:
        stage = "setup"
        import time
        waited = 0
        while subprocess.run(["pgrep", "-f", "reels-studio/scripts/[s]etup.sh"], capture_output=True).returncode == 0 and waited < 1200:
            if waited == 0:
                step("Жду фоновую установку инструментов (запущена при старте сессии)")
            time.sleep(10)
            waited += 10
        if not (STUDIO / "whisper.cpp" / "build" / "bin" / "whisper-cli").exists() or not (STUDIO / "node_modules").exists():
            step("Установка инструментов (первый запуск в этой среде, ~5 мин)")
            run(["bash", "scripts/setup.sh"])

        raw = next((p for p in sorted(folder.glob(f"{a.clip}.*")) if p.suffix in VIDEO_EXT), None) if folder.exists() else None
        if not a.render:
            stage = "fetch"
            if raw is None:
                if not a.source:
                    raise SystemExit("Нет исходника: дай ссылку или файл")
                step(f"Скачиваю исходник в source-videos/{a.name}/")
                run(["python3", "scripts/fetch.py", a.source, folder, a.clip])
                raw = next(p for p in sorted(folder.glob(f"{a.clip}.*")) if p.suffix in VIDEO_EXT)
            work.mkdir(parents=True, exist_ok=True)
            state_path.write_text(json.dumps({"theme": a.theme, "clip": a.clip, "raw": raw.name}, ensure_ascii=False))

            stage = "frames"
            src_sheet = FIN / "frames" / f"{a.name}-исходник.jpg"
            if not src_sheet.exists():
                step("Раскадровка исходника")
                run(["python3", "scripts/frames.py", raw, "--every", "4", "--out", src_sheet])

            stage = "transcribe"
            words = folder / f"{a.clip}.words.json"
            if not words.exists():
                step("Расшифровка речи (Whisper)")
                run(["python3", "scripts/transcribe.py", raw])

            stage = "cut"
            if not (work / f"{a.clip}.cut.mp4").exists():
                step("Вырезаю паузы, чищу звук")
                run(["python3", "scripts/cut_pauses.py", raw, "--words", words])

            stage = "angle-b"
            second = next((p for p in sorted(folder.glob(f"{a.clip}-2.*")) if p.suffix in VIDEO_EXT), None)
            if second and not (work / f"{a.clip}.cut.b.mp4").exists():
                step("Второй ракурс: режу вторую камеру по тем же кускам")
                run(["python3", "scripts/angle_b.py", second, work / f"{a.clip}.cut.json"])

            stage = "grid"
            if not (work / f"{a.clip}.cut.layout.json").exists():
                step("Сетка и линия глаз")
                run(["python3", "scripts/grid.py", work / f"{a.clip}.cut.mp4"])

            stage = "autoprops"
            props = STUDIO / "props" / f"{a.name}.json"
            if not props.exists():
                step(f"Черновик ролика по теме «{a.theme}»")
                run(["python3", "scripts/autoprops.py", "--name", a.name, "--theme", a.theme, "--clip", a.clip])

        rep = json.loads((work / f"{a.clip}.auto.json").read_text())
        stage = "matte"
        alpha = work / f"{a.clip}.cut.alpha.webm"
        if (not alpha.exists() or a.rematte) and rep["matteRanges"]:
            step(f"Вырезаю спикера из фона: {rep['matteRanges']}")
            run(["python3", "scripts/matte.py", work / f"{a.clip}.cut.mp4", "--ranges", rep["matteRanges"]])

        if a.until == "prep":
            step(f"Черновик готов: props/{a.name}.json, отчёт _work/{a.clip}.auto.md, лист _work/{a.clip}.sheet.jpg")
            print(f"PREP_DONE {a.name}", flush=True)
            return

        # --timeout: на загруженной машине (параллельно идут нарезка и вырезка других роликов) кадр финала не успевал за 30 с
        R = ["./node_modules/.bin/remotion", "render", "src/index.ts", "TalkReelPro", "--timeout=120000"]
        # мало места (< 3 ГБ): без кэша webpack (~250 МБ) — Chrome рендера падает с «disk space is low» (Alibaba v2, 29.10.2026)
        if shutil.disk_usage(ROOT).free < 3 * 2**30:
            R.append("--bundle-cache=false")
        if not a.stories_only:
            stage = "render-reels"
            reels = FIN / f"{a.name}.mp4"
            step("Рендер Reels")
            run(R + [reels, f"--props=./props/{a.name}.json", f"--concurrency={CONCURRENCY}", "--log=error"], env=render_env())
            print(f"REELS {a.name}", flush=True)

            stage = "storyboard"
            step("Раскадровка")
            run(["python3", "scripts/frames.py", reels, "--every", "3"])
            (FIN / "раскадровки").mkdir(exist_ok=True)
            shutil.copyfile(FIN / "frames" / f"{a.name}.jpg", FIN / "раскадровки" / f"{a.name}.jpg")
            light_copy(reels, FIN / "для-телефона" / f"{a.name}.mp4")

        stage = "render-stories"
        sp = json.loads((STUDIO / "props" / f"{a.name}.json").read_text())
        sp["format"] = "stories"
        st_props = work / "stories.props.json"
        st_props.write_text(json.dumps(sp, ensure_ascii=False))
        stories = FIN / f"{a.name}-stories.mp4"
        step("Рендер Stories")
        run(R + [stories, f"--props={st_props}", f"--concurrency={CONCURRENCY}", "--log=error"], env=render_env())
        # фирменная заставка GTT (интро 1,47 с в начале, аутро 1,17 с в конце) сдвигает точки разреза; у Aura её нет
        lead, tail = (0.0, 0.0) if sp.get("brand", "gtt") != "gtt" or sp.get("bumper") is False else (44 / 30, 35 / 30)
        cuts = [round(c + lead, 2) for c in rep["storiesAt"]]
        total = sp["speechSeconds"] + sp["ctaSeconds"] + lead + tail
        if not a.split and any(x1 - x0 > 59.5 for x0, x1 in zip([0.0] + cuts, cuts + [total])):
            # с заставкой часть вышла длиннее 60 с — режу по концам фраз: самая поздняя точка, при которой часть ≤ 59,5 с
            ends = [round(w["end"] + lead + 0.05, 2) for w in sp["words"] if w["text"][-1:] in ".?!"]
            cuts, x0 = [], 0.0
            while total - x0 > 59.5:
                fit = [e for e in ends if x0 + 15 < e <= x0 + 59.5]
                if not fit:
                    print(f"AUTO_WARN часть Stories от {x0:.1f} с длиннее 59,5 с и нет конца фразы — поставь --split", flush=True)
                    break
                x0 = max(fit)
                cuts.append(x0)
            print(f"Stories: точки разреза по концам фраз {cuts}", flush=True)
        split = a.split or ",".join(map(str, cuts))
        for old in FIN.glob(f"{a.name}-stories-*.mp4"):
            old.unlink()
        if split:
            run(["python3", "scripts/stories.py", stories, "--at", split])
        else:
            shutil.copyfile(stories, FIN / f"{a.name}-stories-1.mp4")
        for part in sorted(FIN.glob(f"{a.name}-stories-[0-9]*.mp4")):
            light_copy(part, FIN / "для-телефона" / part.name)
        if a.stories_only:  # раскадровка — по Stories, раз Reels нет
            run(["python3", "scripts/frames.py", stories, "--every", "3"])
            (FIN / "раскадровки").mkdir(exist_ok=True)
            shutil.copyfile(FIN / "frames" / f"{a.name}-stories.jpg", FIN / "раскадровки" / f"{a.name}-stories.jpg")
        print(f"STORIES {a.name}", flush=True)
        print(f"AUTO_DONE {a.name}", flush=True)
    except (subprocess.CalledProcessError, StopIteration, SystemExit) as e:
        print(f"AUTO_FAIL {a.name} {stage}: {e}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
