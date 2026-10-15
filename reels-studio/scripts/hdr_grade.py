"""Готовая склейка из HDR-исходника (iPhone, HLG) → обычный цвет с тёплой коррекцией, на месте.

  python3 scripts/hdr_grade.py ../source-videos/<папка>/_work/<клип>.cut.mp4 [ещё …]

Новые склейки `npm run cut` переводит сам (cut_pauses.HDR_TO_SDR); этот скрипт — для склеек, сделанных раньше
(жалоба пользователя 15.10.2026 на бледный цвет в Stories ostapdotcenko). Кадры и звук не меняются — синхрон, слова и
props остаются как были; прежний файл сохраняется рядом как <клип>.cut.hlg.mp4. Склейка уже в bt709 — пропускается.
После перевода вырезку спикера (`*.alpha.webm`) пересчитать: `npm run matte`.
"""
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from cut_pauses import SDR_TAGS, hdr_filter  # noqa: E402


def main():
    for arg in sys.argv[1:]:
        cut = pathlib.Path(arg).resolve()
        vf = hdr_filter(cut)
        if not vf:
            print(f"{cut.name}: уже обычный цвет — пропускаю")
            continue
        hlg = cut.with_name(cut.name.replace(".cut.mp4", ".cut.hlg.mp4"))
        if not hlg.exists():
            cut.rename(hlg)
        tmp = cut.with_name(cut.name + ".tmp.mp4")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(hlg), "-vf", vf, "-c:v", "libx264", "-preset", "medium",
                        "-crf", "17", "-pix_fmt", "yuv420p", *SDR_TAGS, "-c:a", "copy", "-movflags", "+faststart", str(tmp)], check=True)
        tmp.rename(cut)
        print(f"{cut.name}: HDR → обычный цвет готово (прежний — {hlg.name})")


if __name__ == "__main__":
    main()
