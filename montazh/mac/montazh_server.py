#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Монтажная на Mac: маленький сервер только для этого компьютера (127.0.0.1) — отдаёт приложение и скачивает
ролики по ссылкам (Google Диск, Яндекс Диск, Dropbox, WeTransfer, прямые), чтобы их сразу можно было смотреть
и монтировать в окне. Только стандартная библиотека Python и curl (есть в macOS).

  python3 montazh_server.py [--port 8740] [--dist <папка со сборкой>] [--no-open]
"""
import argparse
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import threading
import urllib.parse
import uuid
import webbrowser
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"
VIDEO_EXT = {".mov", ".mp4", ".m4v", ".mkv", ".webm", ".avi"}
TMP = pathlib.Path(tempfile.gettempdir()) / "montazh-downloads"
JOBS: dict = {}


class LinkError(Exception):
    """Понятная пользователю ошибка ссылки."""


def curl_text(*args) -> str:
    return subprocess.check_output(["curl", "-sSL", "--fail", "-A", UA, *args], timeout=60).decode("utf-8", "replace")


def direct_link(url: str) -> str:
    host = urllib.parse.urlparse(url).netloc.lower()
    if "we.tl" in host or "wetransfer.com" in host:
        full = subprocess.check_output(["curl", "-sSL", "-A", UA, "-o", "/dev/null", "-w", "%{url_effective}", url], timeout=60).decode()
        m = re.search(r"/(?:downloads|previews)/([0-9a-f]+)/(?:([0-9a-f]+)/)?([0-9a-f]+)", full)
        if not m:
            raise LinkError("Не разобрал ссылку WeTransfer")
        body = {"security_hash": m.group(3), "intent": "entire_transfer"}
        if m.group(2):
            body["recipient_id"] = m.group(2)
        r = json.loads(curl_text("-X", "POST", "-H", "Content-Type: application/json", "-H", "x-requested-with: XMLHttpRequest",
                                 "-d", json.dumps(body), f"https://wetransfer.com/api/v4/transfers/{m.group(1)}/download"))
        if "direct_link" not in r:
            raise LinkError("WeTransfer не отдал файл: ссылка устарела?")
        return r["direct_link"]
    if "drive.google." in host or "drive.usercontent.google." in host or "docs.google." in host:
        if "/folders/" in url:
            raise LinkError("Это папка Google Диска: нужна ссылка на сам файл видео")
        m = re.search(r"(?:/d/|id=)([\w-]{20,})", url)
        if not m:
            raise LinkError("Не разобрал ссылку Google Диска")
        return f"https://drive.usercontent.google.com/download?id={m.group(1)}&export=download&confirm=t"
    if any(h in host for h in ("disk.yandex.", "yadi.sk", "disk.360.yandex")):
        api = "https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=" + urllib.parse.quote(url, safe="")
        href = json.loads(curl_text(api)).get("href")
        if not href:
            raise LinkError("Яндекс Диск не отдал файл: откройте доступ по ссылке")
        return href
    if "dropbox.com" in host:
        return re.sub(r"([?&])dl=0", r"\1dl=1", url) if "dl=0" in url else url + ("&" if "?" in url else "?") + "dl=1"
    return url


def fetch_job(jid: str, url: str) -> None:
    job = JOBS[jid]
    try:
        TMP.mkdir(parents=True, exist_ok=True)
        job["note"] = "Ищу файл по ссылке…"
        direct = direct_link(url)
        out = TMP / f"{jid}.download"
        job["note"] = "Скачиваю…"
        p = subprocess.Popen(["curl", "-L", "--fail", "-A", UA, "--retry", "4", "-o", str(out), direct],
                             stderr=subprocess.PIPE, text=True)
        while p.poll() is None:
            try:
                p.wait(timeout=1)
            except subprocess.TimeoutExpired:
                pass
            if out.exists():
                job["note"] = f"Скачиваю… {out.stat().st_size / 1048576:.0f} МБ"
        if p.returncode != 0:
            raise LinkError("Не скачалось: проверьте, что ссылка открыта «для всех, у кого есть ссылка»")
        head = out.read_bytes()[:64]
        name = "video.mp4"
        if head.startswith(b"PK"):
            with zipfile.ZipFile(out) as z:
                vids = sorted((i for i in z.infolist() if pathlib.Path(i.filename).suffix.lower() in VIDEO_EXT and "__MACOSX" not in i.filename),
                              key=lambda i: -i.file_size)
                if not vids:
                    raise LinkError("В архиве нет видео")
                name = pathlib.Path(vids[0].filename).name
                final = TMP / f"{jid}{pathlib.Path(name).suffix.lower()}"
                final.write_bytes(z.read(vids[0]))
            out.unlink()
        elif head.lstrip().lower().startswith((b"<!doctype", b"<html")):
            out.unlink()
            raise LinkError("Вместо видео пришла страница — ссылка закрыта или нужен вход")
        else:
            m = re.search(r"\.(mov|mp4|m4v|mkv|webm)(?:\?|$)", direct, re.I)
            ext = "." + (m.group(1).lower() if m else ("mov" if b"qt  " in head else "mp4"))
            name = f"video{ext}"
            final = TMP / f"{jid}{ext}"
            out.rename(final)
        job.update(done=True, path=str(final), name=name, note="Готово")
    except (LinkError, subprocess.SubprocessError, OSError, ValueError, zipfile.BadZipFile) as exc:
        job["error"] = str(exc) or "Не удалось скачать"


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):  # тихо, без журнала каждого файла
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store" if self.path.startswith("/api/") or self.path.endswith(".js") else "max-age=600")
        super().end_headers()

    def json(self, code: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/ping":
            return self.json(200, {"ok": True, "app": "montazh"})
        m = re.fullmatch(r"/api/fetch/([0-9a-f]{12})(/file)?", self.path)
        if m:
            job = JOBS.get(m.group(1))
            if not job:
                return self.json(404, {"detail": "нет такой загрузки"})
            if not m.group(2):
                return self.json(200, {k: job.get(k) for k in ("done", "note", "error", "name")})
            if not job.get("done"):
                return self.json(409, {"detail": "ещё скачивается"})
            path = pathlib.Path(job["path"])
            self.send_response(200)
            self.send_header("Content-Type", "video/quicktime" if path.suffix == ".mov" else "video/mp4")
            self.send_header("Content-Length", str(path.stat().st_size))
            self.end_headers()
            with path.open("rb") as fh:
                while chunk := fh.read(1 << 20):
                    self.wfile.write(chunk)
            path.unlink(missing_ok=True)       # файл уже в Монтажной (в браузере) — копия на диске не нужна
            JOBS.pop(m.group(1), None)
            return None
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/fetch":
            n = int(self.headers.get("Content-Length") or 0)
            try:
                url = (json.loads(self.rfile.read(n) or b"{}").get("url") or "").strip()
            except ValueError:
                url = ""
            if not re.match(r"^https?://", url, re.I):
                return self.json(400, {"detail": "Нужна ссылка, начинающаяся с http:// или https://"})
            jid = uuid.uuid4().hex[:12]
            JOBS[jid] = {"done": False, "note": "Начинаю…"}
            threading.Thread(target=fetch_job, args=(jid, url), daemon=True).start()
            return self.json(200, {"id": jid})
        return self.json(404, {"detail": "нет такого адреса"})


def ours(url: str) -> bool:
    import urllib.request
    try:
        return b"montazh" in urllib.request.urlopen(url + "api/ping", timeout=2).read()
    except Exception:  # noqa: BLE001
        return False


def serve(dist: str, port: int, background: bool = True) -> str:
    """Запустить сервер (порт постоянный: проекты в браузере привязаны к адресу). -> адрес."""
    if not pathlib.Path(dist, "index.html").exists():
        sys.exit(f"Нет сборки Монтажной в {dist}")
    Handler.extensions_map.update({".js": "text/javascript", ".mjs": "text/javascript", ".wav": "audio/wav",
                                   ".mp4": "video/mp4", ".wasm": "application/wasm"})
    import functools
    handler = functools.partial(Handler, directory=dist)
    try:
        srv = ThreadingHTTPServer(("127.0.0.1", port), handler)
    except OSError:
        url = f"http://127.0.0.1:{port}/"
        if ours(url):                                      # уже открыто — то же окно и те же проекты
            return url
        raise
    url = f"http://127.0.0.1:{port}/"
    if background:
        threading.Thread(target=srv.serve_forever, daemon=True).start()
    else:
        print(f"Монтажная: {url}", flush=True)
        srv.serve_forever()
    return url


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=int(os.environ.get("MONTAZH_PORT", "8740")))
    ap.add_argument("--dist", default=str(pathlib.Path(__file__).resolve().parent.parent / "dist"))
    ap.add_argument("--no-open", action="store_true")
    a = ap.parse_args()
    if not a.no_open:
        threading.Timer(0.8, lambda: webbrowser.open(f"http://127.0.0.1:{a.port}/")).start()
    serve(a.dist, a.port, background=False)


if __name__ == "__main__":
    main()
