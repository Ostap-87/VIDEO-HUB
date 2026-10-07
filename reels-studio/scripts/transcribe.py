"""Расшифровка речи из видео или аудио в слова с таймингами для субтитров (Whisper, бесплатно и локально).

  npm run transcribe -- ../source-videos/папка/clip.mp4
  npm run transcribe -- ../source-videos/папка/clip.mp4 --lang ru

Результат: рядом с исходником файл clip.words.json вида [{"text": "Слово", "start": 1.2, "end": 1.5}, ...].
Его содержимое вставляется в поле "words" props-файла ролика (времена в секундах от начала исходника).
Whisper ставится скриптом scripts/setup-whisper.sh.
"""
import argparse
import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
WHISPER = ROOT / "whisper.cpp"
BIN = WHISPER / "build" / "bin" / "whisper-cli"
MODEL = WHISPER / "ggml-large-v3-turbo-q5_0.bin"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("media")
    ap.add_argument("--lang", default="ru")
    a = ap.parse_args()

    if not BIN.exists() or not MODEL.exists():
        raise SystemExit("Whisper не установлен: запустите bash scripts/setup-whisper.sh")

    media = pathlib.Path(a.media).resolve()
    with tempfile.TemporaryDirectory() as tmp:
        wav = pathlib.Path(tmp) / "audio.wav"
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", str(media), "-vn", "-ac", "1", "-ar", "16000", str(wav)],
            check=True,
        )
        out = pathlib.Path(tmp) / "out"
        subprocess.run(
            [str(BIN), "-m", str(MODEL), "-f", str(wav), "-l", a.lang, "-ml", "1", "-sow",
             "-oj", "-of", str(out), "-np"],
            check=True,
        )
        tokens = json.loads((out.with_suffix(".json")).read_text())["transcription"]

    # Токен без пробела в начале (пунктуация, хвост слова) приклеиваем к предыдущему слову.
    words = []
    for t in tokens:
        text = t["text"]
        if not text.strip():
            continue
        start, end = t["offsets"]["from"] / 1000, t["offsets"]["to"] / 1000
        if words and not text.startswith(" "):
            words[-1]["text"] += text
            words[-1]["end"] = end
        else:
            words.append({"text": text.strip(), "start": start, "end": end})

    dst = media.with_suffix(".words.json")
    dst.write_text(json.dumps(words, ensure_ascii=False, indent=1))
    print(f"{len(words)} слов → {dst}")
    print(" ".join(w["text"] for w in words))


if __name__ == "__main__":
    main()
