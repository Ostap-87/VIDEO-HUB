#!/usr/bin/env python3
"""Переозвучить готовый ролик новой обработкой голоса — без повторной нарезки и без рендера картинки.

  python3 scripts/revoice.py 2026-10-28-legprom [2026-10-28-fintech …]          # только склейка _work/<клип>.cut.mp4
  python3 scripts/revoice.py 2026-10-28-legprom --render                          # + звук готовых Reels, Stories, копий

Зачем (29.10.2026, пользователь: «в этом рилс есть некоторый шум, как будто что-то шумит за кадром… чтобы голос был
чистым и не звучал как из трубы»): обработка голоса в cut_pauses.py поменялась (шумодав 30 дБ, срез гула, эквалайзер по
замеру ролика — voice_chain). Ролик, собранный раньше, получает новый голос так:
1. весь звук исходника → шумодав заново (кэш _work/<клип>.clean.wav с прежним пределом пересчитывается сам);
2. куски по _work/<клип>.cut.json (те же кадры) → новая обработка → в _work/<клип>.cut.mp4 (картинка копией);
3. --render: Remotion считает только звук (TalkReelPro с теми же props, `--codec=wav`, кадры не рисуются) — для Reels и
   для Stories; звук подменяется в finished-videos/<имя>.mp4 и в частях <имя>-stories-N.mp4 (картинка копией, границы
   частей — по их длительности), заново — копии для телефона, версия с обложкой первой секундой (<имя>-cover.mp4 по
   finished-videos/обложки/<имя>.jpg) и её копия.
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

STUDIO = pathlib.Path(__file__).resolve().parent.parent
FIN = STUDIO.parent / "finished-videos"
SRC = STUDIO.parent / "source-videos"
sys.path.insert(0, str(STUDIO / "scripts"))
from cut_pauses import FPS, build_voice, clean_audio  # noqa: E402
from auto import light_copy  # noqa: E402


def run(cmd):
    print("  $ " + " ".join(map(str, cmd)), flush=True)
    subprocess.run([str(c) for c in cmd], check=True, cwd=STUDIO)


def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]))


def remux(video, wav, out, start=0.0, length=None):
    """Картинка video копией + звук wav (с start секунд, длиной length) → out."""
    cut = ["-ss", f"{start:.4f}"] + (["-t", f"{length:.4f}"] if length else [])
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", video, *cut, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
         "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", out])


def with_cover(jpg, video, out):
    """Обложка первой секундой (тишина) + ролик — как у Reels с обложкой (thumb_offset 500)."""
    run(["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-framerate", "30", "-t", "1", "-i", jpg,
         "-f", "lavfi", "-t", "1", "-i", "anullsrc=r=48000:cl=stereo", "-i", video, "-filter_complex",
         "[0:v]scale=1080:1920,setsar=1,format=yuv420p[c];[2:v]setsar=1,format=yuv420p[v];[c][1:a][v][2:a]concat=n=2:v=1:a=1[vo][ao]",
         "-map", "[vo]", "-map", "[ao]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", "30",
         "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", out])


def audio_props(src, dst):
    """Props для расчёта звука: вырезка спикера звука не меняет, а её файла у готовых роликов уже может не быть."""
    p = json.loads(pathlib.Path(src).read_text())
    p["cutoutSrc"] = ""
    pathlib.Path(dst).write_text(json.dumps(p, ensure_ascii=False))
    return dst


def revoice(name, render):
    folder = SRC / name
    work = folder / "_work"
    cuts = sorted(work.glob("*.cut.json"))
    if len(cuts) != 1:
        raise SystemExit(f"{name}: нужен ровно один _work/*.cut.json, найдено {len(cuts)}")
    stem = cuts[0].name[: -len(".cut.json")]
    src = next((p for ext in (".MOV", ".mov", ".mp4", ".MP4") if (p := folder / f"{stem}{ext}").exists()), None)
    if not src or src.stat().st_size < 4096:
        raise SystemExit(f"{name}: нет исходника {stem}.* (или на диске только указатель LFS — git lfs pull)")
    plan = json.loads(cuts[0].read_text())
    frames = [(round(p["src_start"] * FPS), round((p["src_end"] - p["src_start"]) * FPS)) for p in plan]
    cut = work / f"{stem}.cut.mp4"
    print(f"▶ {name}: голос заново ({len(frames)} кусков)", flush=True)
    clean = clean_audio(src, work)
    with tempfile.TemporaryDirectory(dir=work) as t:
        tmp = pathlib.Path(t)
        build_voice(clean, frames, cut, tmp / "new.cut.mp4", tmp)
        shutil.move(tmp / "new.cut.mp4", cut)
    if not render:
        return
    R = ["./node_modules/.bin/remotion", "render", "src/index.ts", "TalkReelPro", "--timeout=120000", "--codec=wav", "--log=error"]
    with tempfile.TemporaryDirectory(dir=FIN) as t:
        tmp = pathlib.Path(t)
        reels = FIN / f"{name}.mp4"
        if reels.exists():
            print(f"▶ {name}: звук Reels", flush=True)
            run(R + [tmp / "reels.wav", f"--props={audio_props(STUDIO / 'props' / f'{name}.json', tmp / 'reels.props.json')}"])
            remux(reels, tmp / "reels.wav", tmp / "reels.mp4")
            shutil.move(tmp / "reels.mp4", reels)
            light_copy(reels, FIN / "для-телефона" / reels.name)
            jpg = FIN / "обложки" / f"{name}.jpg"
            if jpg.exists():
                cover = FIN / f"{name}-cover.mp4"
                with_cover(jpg, reels, cover)
                light_copy(cover, FIN / "для-телефона" / cover.name)
        parts = sorted(FIN.glob(f"{name}-stories-[0-9]*.mp4"), key=lambda p: int(p.stem.rsplit("-", 1)[1]))
        st_props = work / "stories.props.json"
        if parts and st_props.exists():
            print(f"▶ {name}: звук Stories ({len(parts)} ч.)", flush=True)
            run(R + [tmp / "stories.wav", f"--props={audio_props(st_props, tmp / 'stories.props.json')}"])
            t0 = 0.0
            for p in parts:
                d = duration(p)
                remux(p, tmp / "stories.wav", tmp / p.name, t0, d)
                shutil.move(tmp / p.name, p)
                light_copy(p, FIN / "для-телефона" / p.name)
                t0 += d
        whole = FIN / f"{name}-stories.mp4"
        if whole.exists():
            whole.unlink()  # целый Stories после нарезки не нужен (место на диске)
    print(f"REVOICE_DONE {name}", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="+")
    ap.add_argument("--render", action="store_true")
    a = ap.parse_args()
    for n in a.names:
        revoice(n, a.render)


if __name__ == "__main__":
    main()
