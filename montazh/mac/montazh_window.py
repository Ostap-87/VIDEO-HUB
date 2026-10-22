# -*- coding: utf-8 -*-
"""Монтажная на Mac: встроенный сервер (montazh_server.py, 127.0.0.1:8740) + окно приложения.

Окно: Chrome / Яндекс Браузер / Edge / Chromium в режиме приложения со своим профилем (там же, где Монтажная
проверяется; видео с iPhone в HEVC играет), иначе pywebview (движок Safari), иначе браузер по умолчанию.
Порт постоянный: проекты хранятся в браузере и привязаны к адресу. Журнал — ~/Library/Logs/Монтажная.log.
"""
from __future__ import annotations

import os
import platform
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import montazh_server  # noqa: E402

NAME = "Монтажная"
PORT = int(os.environ.get("MONTAZH_PORT", "8740"))
CHROMIUMS = ("Google Chrome.app/Contents/MacOS/Google Chrome", "Yandex.app/Contents/MacOS/Yandex",
             "Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "Chromium.app/Contents/MacOS/Chromium",
             "Brave Browser.app/Contents/MacOS/Brave Browser")


def log(*parts) -> None:
    print(time.strftime("%Y-%m-%d %H:%M:%S"), *parts, flush=True)


def chromium() -> str | None:
    for base in ("/Applications", os.path.expanduser("~/Applications")):
        for rel in CHROMIUMS:
            exe = os.path.join(base, rel)
            if os.access(exe, os.X_OK):
                return exe
    return None


def main():
    url = montazh_server.serve(os.path.join(HERE, "web"), PORT)
    exe = chromium()
    log(f"запуск: {url} · macOS {platform.mac_ver()[0] or '?'} ({platform.machine()}) · Python {platform.python_version()} · "
        f"браузер {exe or 'нет'}")
    if exe and os.environ.get("MONTAZH_WEBKIT") != "1":
        profile = os.path.expanduser(f"~/Library/Application Support/{NAME}/browser")
        os.makedirs(profile, exist_ok=True)
        subprocess.run([exe, f"--app={url}", f"--user-data-dir={profile}", "--no-first-run", "--no-default-browser-check",
                        "--window-size=1480,940", "--autoplay-policy=no-user-gesture-required"])
        os._exit(0)
    try:
        import webview
    except ImportError:
        import webbrowser
        log("pywebview нет — открываю браузер по умолчанию")
        webbrowser.open(url)
        while True:
            time.sleep(3600)
    try:
        webview.settings["ALLOW_DOWNLOADS"] = True                # «Скачать задание»
        webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = True
    except Exception:  # noqa: BLE001
        pass
    window = webview.create_window(NAME, url, width=1480, height=940, min_size=(1000, 680))
    window.events.closed += lambda: os._exit(0)
    webview.start(private_mode=False)
    os._exit(0)


if __name__ == "__main__":
    main()
