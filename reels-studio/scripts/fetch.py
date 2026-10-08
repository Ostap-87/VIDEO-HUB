"""Скачивает исходник по ссылке пользователя в source-videos/<папка>/.

  python3 scripts/fetch.py https://we.tl/t-XXXX ../source-videos/2026-10-09-avto avto
  python3 scripts/fetch.py https://drive.google.com/file/d/<id>/view ../source-videos/2026-10-09-avto avto
  python3 scripts/fetch.py https://пример/файл.mov ../source-videos/2026-10-09-avto avto

Понимает WeTransfer (we.tl и wetransfer.com), Google Drive (публичная ссылка) и прямые ссылки.
Имя файла: <имя>.<расширение исходника> (MOV/MP4). Если в архиве WeTransfer несколько видео — берёт самое большое,
остальные кладёт рядом. Печатает путь к видео последней строкой.
"""
import json
import pathlib
import re
import subprocess
import sys
import zipfile

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"
VIDEO_EXT = {".mov", ".mp4", ".m4v", ".mkv", ".webm", ".avi"}


def curl(*args):
    return subprocess.check_output(["curl", "-sSL", "--fail", "-A", UA, *args])


def download(url, out):
    subprocess.run(["curl", "-L", "--fail", "-A", UA, "--retry", "4", "--retry-delay", "3", "-o", str(out), url], check=True)


def resolve(url):
    return subprocess.check_output(["curl", "-sSL", "-A", UA, "-o", "/dev/null", "-w", "%{url_effective}", url]).decode()


def wetransfer(url):
    full = resolve(url) if "we.tl" in url else url
    m = re.search(r"/downloads/([0-9a-f]+)/(?:([0-9a-f]+)/)?([0-9a-f]+)", full)
    if not m:
        raise SystemExit(f"Не разобрал ссылку WeTransfer: {full}")
    tid, recipient, sec = m.group(1), m.group(2), m.group(3)
    body = {"security_hash": sec, "intent": "entire_transfer"}
    if recipient:
        body["recipient_id"] = recipient
    r = json.loads(curl("-X", "POST", "-H", "Content-Type: application/json", "-H", "x-requested-with: XMLHttpRequest",
                        "-d", json.dumps(body), f"https://wetransfer.com/api/v4/transfers/{tid}/download"))
    if "direct_link" not in r:
        raise SystemExit(f"WeTransfer не отдал ссылку: {r}")
    return r["direct_link"]


def gdrive(url):
    m = re.search(r"(?:/d/|id=)([\w-]{20,})", url)
    if not m:
        raise SystemExit(f"Не разобрал ссылку Google Drive: {url}")
    return f"https://drive.usercontent.google.com/download?id={m.group(1)}&export=download&confirm=t"


def main():
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    url, folder, name = sys.argv[1], pathlib.Path(sys.argv[2]), sys.argv[3]
    folder.mkdir(parents=True, exist_ok=True)
    if pathlib.Path(url).exists():  # локальный файл
        src = pathlib.Path(url)
        dst = folder / f"{name}{src.suffix}"
        if src.resolve() != dst.resolve():
            dst.write_bytes(src.read_bytes())
        print(dst)
        return
    if "we.tl" in url or "wetransfer.com" in url:
        direct = wetransfer(url)
    elif "drive.google.com" in url or "drive.usercontent.google.com" in url:
        direct = gdrive(url)
    else:
        direct = url
    tmp = folder / f".{name}.download"
    download(direct, tmp)
    kind = subprocess.check_output(["file", "-b", str(tmp)]).decode()
    if "Zip archive" in kind:
        with zipfile.ZipFile(tmp) as z:
            vids = [i for i in z.infolist() if pathlib.Path(i.filename).suffix.lower() in VIDEO_EXT and not i.filename.startswith("__MACOSX")]
            if not vids:
                raise SystemExit("В архиве нет видео")
            vids.sort(key=lambda i: -i.file_size)
            main_out = None
            for k, i in enumerate(vids):
                ext = pathlib.Path(i.filename).suffix
                out = folder / (f"{name}{ext}" if k == 0 else f"{name}-{k + 1}{ext}")
                out.write_bytes(z.read(i))
                main_out = main_out or out
        tmp.unlink()
    elif "HTML" in kind:
        tmp.unlink()
        raise SystemExit("Вместо файла пришла страница — ссылка закрыта или нужен вход. Попроси открыть доступ по ссылке.")
    else:
        ext = ".mov" if "QuickTime" in kind else ".mp4"
        m = re.search(r"\.(mov|mp4|m4v|mkv|webm)(?:\?|$)", direct, re.I)
        if m:
            ext = "." + m.group(1)
        main_out = folder / f"{name}{ext.upper() if ext.lower() == '.mov' else ext}"
        tmp.rename(main_out)
    print(main_out)


if __name__ == "__main__":
    main()
