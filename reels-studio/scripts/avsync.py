"""Звук из видео — в шкале времени картинки (жалоба пользователя 15.10.2026 на «Автозаводы»: «полнейший рассинхрон»).

В части исходников iPhone звук в файле начинается позже картинки: у «Автозаводов» start_time звука 0,762 с, у «Нового ритейла»
0,70 с, у остальных роликов 07.10 ~0,1 с. `ffmpeg -i clip.MOV -vn out.wav` этот сдвиг теряет: первый сэмпл WAV — это
0,762 с ролика. Нарезка брала звук по тем же секундам, что и кадры, и голос опережал губы на величину сдвига,
а Whisper ставил слова раньше, чем их видно. Здесь звук сдвигается так, чтобы сэмпл 0 был кадром 0.
"""
import json
import subprocess


def av_offset(path):
    """На сколько секунд звук начинается позже картинки (отрицательное — раньше). Без видео или звука — 0."""
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,start_time", "-of", "json", str(path)],
                         capture_output=True, text=True).stdout
    starts = {}
    for s in json.loads(out or "{}").get("streams", []):
        if s.get("codec_type") in ("video", "audio") and s["codec_type"] not in starts and s.get("start_time") not in (None, "N/A"):
            starts[s["codec_type"]] = float(s["start_time"])
    if "video" not in starts or "audio" not in starts:
        return 0.0
    return round(starts["audio"] - starts["video"], 6)


def align_filter(path):
    """Фильтр ffmpeg для `-af`: тишина в начало (звук позже картинки) или срез начала (звук раньше). None — сдвига нет."""
    off = av_offset(path)
    if abs(off) < 0.0005:
        return None
    if off > 0:
        return f"adelay={round(off * 1000, 3)}:all=1"
    return f"atrim=start={-off:.6f},asetpts=PTS-STARTPTS"


def extract_args(path):
    """Аргументы ffmpeg после `-i path`: звук без видео, выровненный по картинке."""
    f = align_filter(path)
    return ["-vn", *(["-af", f] if f else [])]
