#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Монтажная на Mac: маленький сервер только для этого компьютера (127.0.0.1) — отдаёт приложение и скачивает
ролики по ссылкам (Google Диск, Яндекс Диск, Dropbox, WeTransfer, прямые), чтобы их сразу можно было смотреть
и монтировать в окне. Только стандартная библиотека Python и curl (есть в macOS).

«Сделать ролик»: окно отдаёт сюда задание и файлы (исходник, чистый голос, свои картинки); сервер кладёт файлы
в релиз GitHub montazh-<id> и коммитит montazh/jobs/<id>.json — рендер запускается в GitHub Actions
(.github/workflows/montazh-render.yml), готовый ролик появляется в том же релизе. Токен GitHub пользователь вводит
в окне один раз; он хранится только здесь (~/Library/Application Support/Montazh/github.json, доступ 600) и в окно
не возвращается. Нужен fine-grained токен на один репозиторий с правом Contents: Read and write.

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
import time
import urllib.parse
import uuid
import webbrowser
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"
VIDEO_EXT = {".mov", ".mp4", ".m4v", ".mkv", ".webm", ".avi"}
TMP = pathlib.Path(tempfile.gettempdir()) / "montazh-downloads"
JOBS: dict = {}
REPO = os.environ.get("MONTAZH_REPO", "Ostap-87/VIDEO-HUB")
HOME = pathlib.Path.home() / ("Library/Application Support/Montazh" if sys.platform == "darwin" else ".config/montazh")
SENDS: dict = {}  # id задания → ход отправки в облако
SAVES: dict = {}  # «задание/файл» → ход скачивания готового ролика в «Загрузки»
DOWNLOADS = pathlib.Path.home() / "Downloads" / "Монтажная"


def gh_token() -> str:
    f = HOME / "github.json"
    try:
        return json.loads(f.read_text()).get("token", "")
    except (OSError, ValueError):
        return ""


def gh(method: str, url: str, data_file=None, ctype="application/json", timeout=120):
    """Запрос к GitHub через curl. Токен — в конфиге на stdin (-K -), в списке процессов его не видно."""
    cfg = (f'header = "Authorization: Bearer {gh_token()}"\n'
           'header = "Accept: application/vnd.github+json"\nheader = "X-GitHub-Api-Version: 2022-11-28"\n')
    args = ["curl", "-sS", "-L", "-X", method, "-K", "-", "-w", "\n%{http_code}", "-A", "Montazh"]
    if data_file is not None:
        args += ["-H", f"Content-Type: {ctype}", "--data-binary", f"@{data_file}"]
    out = subprocess.run(args + [url], input=cfg.encode(), capture_output=True, timeout=timeout)
    text, _, code = out.stdout.decode("utf-8", "replace").rpartition("\n")
    try:
        data = json.loads(text) if text.strip() else {}
    except ValueError:
        data = {"raw": text[:300]}
    return int(code or 0), data


def gh_json(method: str, url: str, payload: dict):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        json.dump(payload, fh, ensure_ascii=False)
    try:
        return gh(method, url, data_file=fh.name)
    finally:
        os.unlink(fh.name)


def check_token(tok: str) -> dict:
    """Проверить токен: есть ли доступ на запись в репозиторий."""
    old = HOME / "github.json"
    keep = old.read_text() if old.exists() else None
    HOME.mkdir(parents=True, exist_ok=True)
    old.write_text(json.dumps({"token": tok}))
    code, d = gh("GET", f"https://api.github.com/repos/{REPO}")
    ok = code == 200 and (d.get("permissions") or {}).get("push")
    if not ok:
        if keep is None:
            old.unlink()
        else:
            old.write_text(keep)
        if code == 200:
            raise LinkError("Токен видит репозиторий, но без права записи — в настройках токена дайте Contents: Read and write")
        raise LinkError("Токен не подошёл (GitHub ответил %s) — проверьте, что он скопирован целиком и выдан на %s" % (code, REPO))
    os.chmod(old, 0o600)
    return {"configured": True, "repo": REPO}


def send_job(jid: str, job: dict) -> None:
    """Файлы задания → релиз montazh-<id>, задание → montazh/jobs/<id>.json (запускает рендер)."""
    st = SENDS[jid]
    folder = HOME / "jobs" / jid
    try:
        tag = f"montazh-{jid}"
        st.update(text="Создаю место для файлов на GitHub…", progress=0.02)
        code, rel = gh("GET", f"https://api.github.com/repos/{REPO}/releases/tags/{tag}")
        if code != 200:
            code, rel = gh_json("POST", f"https://api.github.com/repos/{REPO}/releases",
                                {"tag_name": tag, "target_commitish": "main", "name": f"Монтажная: {job.get('name', jid)}",
                                 "body": "Файлы задания Монтажной и готовый ролик (montazh/jobs/%s.json)." % jid, "prerelease": True})
            if code not in (200, 201):
                raise LinkError(f"GitHub не создал релиз ({code}): {rel.get('message', '')}")
        have = {a["name"]: a for a in rel.get("assets", [])}
        files = sorted(p for p in folder.iterdir() if p.is_file()) if folder.exists() else []
        total = sum(p.stat().st_size for p in files) or 1
        sent = 0
        for p in files:
            size = p.stat().st_size
            if p.name in have and have[p.name]["size"] == size:
                sent += size
                continue
            if p.name in have:
                gh("DELETE", f"https://api.github.com/repos/{REPO}/releases/assets/{have[p.name]['id']}")
            st.update(text=f"Загружаю {p.name} ({size / 1048576:.0f} МБ)…", progress=0.05 + 0.85 * sent / total)
            code, d = gh("POST", f"https://uploads.github.com/repos/{REPO}/releases/{rel['id']}/assets?name={urllib.parse.quote(p.name)}",
                         data_file=str(p), ctype="application/octet-stream", timeout=3600)
            if code not in (200, 201):
                raise LinkError(f"Файл {p.name} не загрузился ({code}): {d.get('message', '')}")
            sent += size
        st.update(text="Отправляю задание…", progress=0.93)
        path = f"montazh/jobs/{jid}.json"
        code, cur = gh("GET", f"https://api.github.com/repos/{REPO}/contents/{path}?ref=main")
        import base64
        payload = {"message": f"Монтажная: задание «{job.get('name', jid)}»", "branch": "main",
                   "content": base64.b64encode(json.dumps(job, ensure_ascii=False, indent=1).encode()).decode()}
        if code == 200 and cur.get("sha"):
            payload["sha"] = cur["sha"]
        code, d = gh_json("PUT", f"https://api.github.com/repos/{REPO}/contents/{path}", payload)
        if code not in (200, 201):
            raise LinkError(f"Задание не записалось ({code}): {d.get('message', '')}")
        st.update(text="Отправлено — рендер начнётся через минуту", progress=1.0, sent=True)
        import shutil
        shutil.rmtree(folder, ignore_errors=True)   # файлы уже в релизе
    except (LinkError, subprocess.SubprocessError, OSError, KeyError) as exc:
        st["error"] = str(exc) or "Не удалось отправить"


YTDLP_HOSTS = ("instagram.com", "tiktok.com", "youtube.com", "youtu.be", "vk.com", "vkvideo.ru", "rutube.ru", "dzen.ru", "x.com", "twitter.com", "ok.ru")


def ytdlp() -> list:
    """yt-dlp на Mac: отдельной программой или модулем Python (ставит install_mac.command)."""
    import shutil
    if shutil.which("yt-dlp"):
        return ["yt-dlp"]
    if subprocess.run([sys.executable, "-c", "import yt_dlp"], capture_output=True).returncode == 0:
        return [sys.executable, "-m", "yt_dlp"]
    return []


def fetch_ref(url: str, folder: pathlib.Path, st: dict) -> pathlib.Path:
    """Референс по ссылке. Instagram и TikTok — yt-dlp со входом из браузера на этом Mac (cookies Chrome/Safari)."""
    if any(h in url for h in YTDLP_HOSTS):
        y = ytdlp()
        if not y:
            raise LinkError("Для ссылок Instagram/TikTok/YouTube нужен yt-dlp — переустановите Монтажную (команда установки) или пришлите файл")
        st["text"] = "Скачиваю ролик со страницы…"
        out = folder / "ref.%(ext)s"
        last = ""
        for cookies in (["--cookies-from-browser", "chrome"], ["--cookies-from-browser", "safari"], []):
            r = subprocess.run(y + ["-q", "--no-playlist", "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4", *cookies, "-o", str(out), url],
                               capture_output=True, text=True, timeout=900)
            got = sorted(folder.glob("ref.*"))
            if r.returncode == 0 and got:
                return got[0]
            last = (r.stderr or "").strip().splitlines()[-1:] or [""]
        raise LinkError("Сайт не отдал ролик: " + last[0][:200] + " — откройте ролик в Chrome под своим входом и попробуйте ещё раз или пришлите файлом")
    st["text"] = "Скачиваю…"
    out = folder / "ref.mp4"
    subprocess.run(["curl", "-L", "--fail", "-A", UA, "--retry", "4", "-o", str(out), direct_link(url)], check=True, timeout=1800)
    return out


def send_ref(rid: str, ref: dict) -> None:
    """Референс → релиз montazh-refs (ref-<id>.mp4) + описание montazh/references/<id>.json — Claude разбирает приёмы."""
    st = SENDS[rid]
    folder = HOME / "refs" / rid
    try:
        folder.mkdir(parents=True, exist_ok=True)
        files = sorted(p for p in folder.iterdir() if p.is_file())
        if not files:  # окно до 23.10.2026 клало файл референса в папку заданий
            old = HOME / "jobs" / rid
            files = sorted(p for p in old.iterdir() if p.is_file()) if old.is_dir() else []
        video = files[0] if files else (fetch_ref(ref["url"], folder, st) if ref.get("url") else None)
        if not video:
            raise LinkError("Нет ни файла, ни ссылки")
        asset = f"ref-{rid}{video.suffix.lower() or '.mp4'}"
        st.update(text="Загружаю в библиотеку референсов…", progress=0.4)
        code, rel = gh("GET", f"https://api.github.com/repos/{REPO}/releases/tags/montazh-refs")
        if code != 200:
            code, rel = gh_json("POST", f"https://api.github.com/repos/{REPO}/releases",
                                {"tag_name": "montazh-refs", "target_commitish": "main", "name": "Монтажная: референсы",
                                 "body": "Ролики-референсы для разбора приёмов (montazh/references/<id>.json).", "prerelease": True})
            if code not in (200, 201):
                raise LinkError(f"GitHub не создал релиз ({code}): {rel.get('message', '')}")
        code, d = gh("POST", f"https://uploads.github.com/repos/{REPO}/releases/{rel['id']}/assets?name={asset}",
                     data_file=str(video), ctype="application/octet-stream", timeout=3600)
        if code not in (200, 201):
            raise LinkError(f"Ролик не загрузился ({code}): {d.get('message', '')}")
        import base64
        body = {**ref, "id": rid, "asset": asset, "status": "ждёт разбора", "effects": []}
        code, d = gh_json("PUT", f"https://api.github.com/repos/{REPO}/contents/montazh/references/{rid}.json",
                          {"message": f"Монтажная: референс «{ref.get('name') or rid}»", "branch": "main",
                           "content": base64.b64encode(json.dumps(body, ensure_ascii=False, indent=1).encode()).decode()})
        if code not in (200, 201):
            raise LinkError(f"Описание не записалось ({code}): {d.get('message', '')}")
        st.update(text="В библиотеке — ждёт разбора", progress=1.0, sent=True)
        import shutil
        shutil.rmtree(folder, ignore_errors=True)
        shutil.rmtree(HOME / "jobs" / rid, ignore_errors=True)
    except (LinkError, subprocess.SubprocessError, OSError, KeyError) as exc:
        st["error"] = str(exc) or "Не удалось добавить"


def list_refs() -> list:
    code, items = gh("GET", f"https://api.github.com/repos/{REPO}/contents/montazh/references?ref=main")
    if code != 200 or not isinstance(items, list):
        return []
    import base64
    out = []
    for it in sorted(items, key=lambda x: x.get("name", ""), reverse=True)[:40]:
        if not it.get("name", "").endswith(".json"):
            continue
        c, f = gh("GET", it["url"])
        try:
            r = json.loads(base64.b64decode(f.get("content", "")).decode())
        except ValueError:
            continue
        if r.get("asset"):
            r["video"] = f"https://github.com/{REPO}/releases/download/montazh-refs/{r['asset']}"
        out.append(r)
    return sorted(out, key=lambda r: r.get("created", ""), reverse=True)


def job_state(jid: str) -> dict:
    """Ход работы в облаке: status.json и готовые файлы из релиза."""
    code, rel = gh("GET", f"https://api.github.com/repos/{REPO}/releases/tags/montazh-{jid}")
    if code != 200:
        return {"stage": "wait", "text": "Ждёт отправки"}
    assets = {a["name"]: a for a in rel.get("assets", [])}
    st = {"stage": "queued", "text": "В очереди: рендер скоро начнётся", "progress": 0}
    if "status.json" in assets:
        try:
            raw = subprocess.check_output(["curl", "-sSL", "--fail", assets["status.json"]["browser_download_url"]], timeout=30)
            st = json.loads(raw)
        except (subprocess.SubprocessError, ValueError):
            pass
    for f in st.get("files", []):
        a = assets.get(f["name"])
        if a:
            f["url"] = a["browser_download_url"]
            f["asset"] = a["id"]
            got = SAVES.get(f"{jid}/{f['name']}")
            if got:
                f["saved"] = {k: got.get(k) for k in ("done", "error", "path", "progress")}
    return st


def save_name(title: str, f: dict, tag: str = "") -> str:
    """Понятное имя файла в «Загрузках»: «IMG_5402 · №3 23.10 15-30.mp4», «… (телефон).mp4», «… — часть 2.mp4».
    tag — номер и время отправки задания: у разных отправок одного ролика разные файлы, не перепутать и не затереть."""
    base = re.sub(r'[\\/:*?"<>|]+', " ", title or "ролик").strip()[:60] or "ролик"
    tag = re.sub(r'[\\/:*?"<>|]+', "-", tag or "").strip()[:30]
    if tag:
        base = f"{base} · {tag}"
    ext = pathlib.Path(f["name"]).suffix or ".mp4"
    kind = f.get("kind")
    st = "Stories, " if "-stories" in f["name"] else ""
    if kind == "phone":
        return f"{base} ({st}телефон){ext}"
    if kind == "part":
        return f"{base} — {st}часть {f['name'].rsplit('-', 1)[-1].split('.')[0]}{ext}"
    if kind == "stories":
        return f"{base} (Stories){ext}"
    if kind == "frames":
        return f"{base} — раскадровка{ext}"
    return f"{base}{ext}"


def save_file(jid: str, name: str, tag: str = ""):
    """Готовый файл задания → ~/Downloads/Монтажная (через API GitHub с ключом: так скачивается и там, где прямые
    ссылки GitHub медленные или закрыты), потом показывает его в Finder."""
    key = f"{jid}/{name}"
    job = SAVES[key]
    try:
        st = job_state(jid)
        f = next((x for x in st.get("files", []) if x["name"] == name and x.get("asset")), None)
        if not f:
            raise LinkError("Файла ещё нет в облаке — подождите, пока ролик доделается")
        DOWNLOADS.mkdir(parents=True, exist_ok=True)
        dst = DOWNLOADS / save_name(st.get("name") or jid, f, tag)
        tmp = dst.with_name(dst.name + ".part")
        tok = gh_token()
        cfg = ((f'header = "Authorization: Bearer {tok}"\n' if tok else "") +
               'header = "Accept: application/octet-stream"\nheader = "X-GitHub-Api-Version: 2022-11-28"\n')
        proc = subprocess.Popen(["curl", "-sS", "-L", "--fail", "--retry", "3", "-K", "-", "-A", "Montazh", "-o", str(tmp),
                                 f"https://api.github.com/repos/{REPO}/releases/assets/{f['asset']}"],
                                stdin=subprocess.PIPE, stderr=subprocess.PIPE)
        proc.stdin.write(cfg.encode())
        proc.stdin.close()
        size = max(1, int(f.get("size") or 1))
        while proc.poll() is None:
            job["progress"] = min(0.99, (tmp.stat().st_size if tmp.exists() else 0) / size)
            threading.Event().wait(0.5)
        if proc.returncode != 0:
            raise LinkError("Не скачалось: " + (proc.stderr.read().decode("utf-8", "replace").strip()[:200] or "ошибка сети"))
        tmp.replace(dst)
        job.update(done=True, progress=1, path=str(dst))
        if sys.platform == "darwin":
            subprocess.Popen(["open", "-R", str(dst)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except (LinkError, subprocess.SubprocessError, OSError, StopIteration) as exc:
        job["error"] = str(exc) or "Не удалось скачать"


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


# ---------------------------------------------------------------- модели и библиотеки для окна (распознавание речи,
# картинки по смыслу). Окно качает их не само, а через этот сервер: huggingface.co или jsdelivr бывают закрыты или
# обрываются (Россия, Китай, VPN «системным прокси»), а сервер пробует зеркала, ходит через прокси macOS, докачивает
# оборванный файл с другого зеркала (Range) и хранит скачанное на диске — второй раз всё мгновенно и без интернета.
NET = HOME / "net-cache"
NET_LOCKS: dict = {}
NET_LOCK = threading.Lock()
NET_TYPES = {".json": "application/json", ".onnx": "application/octet-stream", ".wasm": "application/wasm",
             ".mjs": "text/javascript", ".js": "text/javascript", ".txt": "text/plain"}
HF_RE = re.compile(r"[\w.-]+/[\w.-]+/resolve/[\w.-]+/[\w./-]+")
NPM_RE = re.compile(r"npm/(@[\w.-]+/[\w.-]+|[\w.-]+)@([\w.+-]+)/([\w./+-]+)")


def nlog(*parts) -> None:
    print(time.strftime("%Y-%m-%d %H:%M:%S"), "сеть:", *parts, flush=True)


def net_sources(kind: str, rest: str) -> list:
    if ".." in rest or rest.startswith("/"):
        return []
    if kind == "hf" and HF_RE.fullmatch(rest):
        return [f"https://huggingface.co/{rest}", f"https://hf-mirror.com/{rest}"]
    m = NPM_RE.fullmatch(rest) if kind == "cdn" else None
    if not m:
        return []
    pkg, ver, path = m.groups()
    return [f"https://cdn.jsdelivr.net/{rest}", f"https://fastly.jsdelivr.net/{rest}",
            f"https://unpkg.com/{pkg}@{ver}/{path}", f"https://registry.npmmirror.com/{pkg}/{ver}/files/{path}"]


def sys_proxy():
    """Прокси из настроек macOS (VPN-программы часто включают «системный прокси» — его видит Chrome, но не curl)."""
    if os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY"):
        return None                                          # curl возьмёт его сам
    try:
        out = subprocess.run(["scutil", "--proxy"], capture_output=True, text=True, timeout=3).stdout
    except (OSError, subprocess.SubprocessError):
        return None
    d = dict(re.findall(r"(\w+)\s*:\s*(\S+)", out))
    if d.get("HTTPSEnable") == "1" and d.get("HTTPSProxy"):
        return f"http://{d['HTTPSProxy']}:{d.get('HTTPSPort', '443')}"
    if d.get("SOCKSEnable") == "1" and d.get("SOCKSProxy"):
        return f"socks5h://{d['SOCKSProxy']}:{d.get('SOCKSPort', '1080')}"
    return None


def net_curl(url: str, proxy, extra: list) -> list:
    return ["curl", "-sS", "-L", "--fail", "-A", UA, "--connect-timeout", "10", *(["-x", proxy] if proxy else []), *extra, url]


def net_head(url: str, proxy):
    """Есть ли файл и какого он размера: (True, байты | None) или (False, None)."""
    try:
        r = subprocess.run(net_curl(url, proxy, ["-I", "-m", "25"]), capture_output=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return False, None
    if r.returncode:
        return False, None
    last = [b for b in r.stdout.decode("latin-1").replace("\r", "").split("\n\n") if b.strip().startswith("HTTP")][-1:]
    m = re.search(r"(?im)^content-length:\s*(\d+)", last[0]) if last else None
    return True, (int(m.group(1)) if m else None)


def net_get(handler, kind: str, rest: str):
    sources = net_sources(kind, rest)
    if not sources:
        return handler.json(404, {"detail": "такой файл сервер не скачивает"})
    path = NET / kind / rest
    with NET_LOCK:
        lock = NET_LOCKS.setdefault(str(path), threading.Lock())
    with lock:                                                # один файл качается один раз
        if path.is_file():
            return net_send_file(handler, path)
        proxy = sys_proxy()
        tries = [(u, p) for u in sources for p in ([proxy, None] if proxy else [None])]
        start, size = None, None
        for i, (u, p) in enumerate(tries):
            ok, size = net_head(u, p)
            if ok:
                start = i
                break
            nlog(f"нет ответа: {u}{' через прокси ' + p if p else ''}")
        if start is None:
            nlog(f"не скачать {rest}: все зеркала недоступны")
            return handler.json(502, {"detail": f"Не скачать {rest.rsplit('/', 1)[-1]}: huggingface.co, jsdelivr и зеркала недоступны. "
                                                "Проверьте интернет или VPN и нажмите ещё раз."})
        handler.send_response(200)
        handler.send_header("Content-Type", NET_TYPES.get(path.suffix, "application/octet-stream"))
        if size:
            handler.send_header("Content-Length", str(size))
        handler.end_headers()
        path.parent.mkdir(parents=True, exist_ok=True)
        part = path.with_name(path.name + ".part")
        written, client = 0, True
        with part.open("wb") as fh:
            for u, p in (tries[start:] + tries[:start]) * 2:  # каждое зеркало — до двух раз, докачка с места обрыва
                hdr = part.with_name(path.name + ".hdr")
                args = net_curl(u, p, ["--speed-limit", "2048", "--speed-time", "30", "-D", str(hdr),
                                       *(["-r", f"{written}-"] if written else [])])
                try:
                    proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                except OSError as exc:
                    nlog(f"curl не запустился: {exc}")
                    break
                skip = -1
                while chunk := proc.stdout.read(1 << 16):
                    if skip < 0:                              # зеркало не умеет докачку — отдаёт с начала
                        codes = re.findall(r"(?m)^HTTP/\S+\s+(\d+)", hdr.read_text("latin-1")) if hdr.exists() else []
                        skip = written if written and codes and codes[-1] == "200" else 0
                    if skip:
                        cut = min(skip, len(chunk))
                        chunk, skip = chunk[cut:], skip - cut
                        if not chunk:
                            continue
                    fh.write(chunk)
                    written += len(chunk)
                    if client:
                        try:
                            handler.wfile.write(chunk)
                        except OSError:
                            client = False                    # окно закрыли — докачиваем в кэш всё равно
                proc.wait()
                hdr.unlink(missing_ok=True)
                if proc.returncode == 0 and (size is None or written >= size):
                    break
                nlog(f"обрыв на {written} из {size or '?'} байт: {u} ({proc.stderr.read().decode('utf-8', 'replace').strip()[:160]})")
        if size is None or written >= size:
            part.rename(path)
            nlog(f"скачано {rest} ({written / 1048576:.1f} МБ)")
        else:
            part.unlink(missing_ok=True)
            nlog(f"не докачано {rest}: {written} из {size} байт")
        return None


def net_send_file(handler, path: pathlib.Path):
    handler.send_response(200)
    handler.send_header("Content-Type", NET_TYPES.get(path.suffix, "application/octet-stream"))
    handler.send_header("Content-Length", str(path.stat().st_size))
    handler.end_headers()
    with path.open("rb") as fh:
        while chunk := fh.read(1 << 20):
            handler.wfile.write(chunk)
    return None


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):  # тихо, без журнала каждого файла
        pass

    def end_headers(self):
        if not self.path.startswith("/net/"):                 # модели и библиотеки кэшируются окном (transformers.js)
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
        m = re.fullmatch(r"/net/(hf|cdn)/(.+)", self.path.split("?")[0])
        if m:
            try:
                return net_get(self, m.group(1), urllib.parse.unquote(m.group(2)))
            except OSError:
                return None
        if self.path == "/api/ping":
            return self.json(200, {"ok": True, "app": "montazh"})
        if self.path == "/api/github":
            return self.json(200, {"configured": bool(gh_token()), "repo": REPO})
        if self.path == "/api/refs":
            if not gh_token():
                return self.json(200, {"refs": [], "token": False})
            pending = [{"id": k, **v} for k, v in SENDS.items() if v.get("ref") and not v.get("sent")]
            return self.json(200, {"refs": list_refs(), "pending": pending, "token": True})
        m = re.fullmatch(r"/api/job/([0-9a-z]{4,24})/save/([A-Za-z0-9._-]{1,80})", self.path)
        if m:
            return self.json(200, SAVES.get(f"{m.group(1)}/{m.group(2)}") or {})
        m = re.fullmatch(r"/api/job/([0-9a-z]{4,24})", self.path)
        if m:
            jid = m.group(1)
            local = SENDS.get(jid)
            if local and not local.get("sent"):
                return self.json(200, {"stage": "send", **local})
            if not gh_token():
                return self.json(200, {"stage": "token", "text": "Нужен токен GitHub"})
            return self.json(200, job_state(jid))
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

    def do_PUT(self):
        m = re.fullmatch(r"/api/(job|ref)/([0-9a-z]{4,24})/file/([A-Za-z0-9._-]{1,80})", self.path)
        if not m:
            return self.json(404, {"detail": "нет такого адреса"})
        folder = HOME / (m.group(1) + "s") / m.group(2)
        folder.mkdir(parents=True, exist_ok=True)
        left = int(self.headers.get("Content-Length") or 0)
        with (folder / m.group(3)).open("wb") as fh:
            while left > 0:
                chunk = self.rfile.read(min(left, 1 << 20))
                if not chunk:
                    break
                fh.write(chunk)
                left -= len(chunk)
        return self.json(200, {"ok": True})

    def do_DELETE(self):
        if self.path == "/api/github":
            (HOME / "github.json").unlink(missing_ok=True)
            return self.json(200, {"configured": False})
        return self.json(404, {"detail": "нет такого адреса"})

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        # только JSON: чужая страница в браузере не может прислать его без предзапроса, а предзапросы сервер не принимает —
        # так сайты из интернета не управляют Монтажной на этом Mac
        if not (self.headers.get("Content-Type") or "").startswith("application/json"):
            return self.json(415, {"detail": "нужен JSON"})
        if self.path == "/api/open":
            # ссылка из окна — в обычном браузере пользователя (там он уже вошёл в GitHub), а не в профиле окна
            try:
                url = (json.loads(self.rfile.read(n) or b"{}").get("url") or "").strip()
            except ValueError:
                url = ""
            if not re.match(r"^https://[A-Za-z0-9.-]+\.[a-z]{2,}(/|$)", url):
                return self.json(400, {"detail": "нужна ссылка https://"})
            opener = ["open", url] if sys.platform == "darwin" else ["xdg-open", url]
            try:
                subprocess.Popen(opener, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except OSError:
                return self.json(500, {"detail": "не открылось"})
            return self.json(200, {"ok": True})
        m = re.fullmatch(r"/api/job/([0-9a-z]{4,24})/save", self.path)
        if m:
            # готовый ролик → «Загрузки/Монтажная» на этом Mac; повторное нажатие на сохранённый — показать в Finder
            try:
                body = json.loads(self.rfile.read(n) or b"{}")
            except ValueError:
                body = {}
            name = (body.get("name") or "").strip()
            tag = str(body.get("tag") or "").strip()
            if not re.fullmatch(r"[A-Za-z0-9._-]{1,80}", name):
                return self.json(400, {"detail": "нет такого файла"})
            if not gh_token():
                return self.json(400, {"detail": "Сначала ключ GitHub"})
            key = f"{m.group(1)}/{name}"
            got = SAVES.get(key)
            if got and got.get("done") and pathlib.Path(got["path"]).exists():
                if sys.platform == "darwin":
                    subprocess.Popen(["open", "-R", got["path"]], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                return self.json(200, got)
            if not got or got.get("error") or got.get("done"):
                SAVES[key] = {"done": False, "progress": 0}
                threading.Thread(target=save_file, args=(m.group(1), name, tag), daemon=True).start()
            return self.json(200, SAVES[key])
        if self.path == "/api/github":
            try:
                tok = (json.loads(self.rfile.read(n) or b"{}").get("token") or "").strip()
                if not re.fullmatch(r"(github_pat_|ghp_)[A-Za-z0-9_]{20,}", tok):
                    raise LinkError("Это не похоже на токен GitHub: он начинается с github_pat_ или ghp_")
                return self.json(200, check_token(tok))
            except LinkError as exc:
                return self.json(400, {"detail": str(exc)})
        m = re.fullmatch(r"/api/ref/([0-9a-z]{4,24})/submit", self.path)
        if m:
            if not gh_token():
                return self.json(400, {"detail": "Сначала ключ GitHub (шаг «Готово»)"})
            try:
                ref = json.loads(self.rfile.read(n) or b"{}")
            except ValueError:
                return self.json(400, {"detail": "не прочиталось"})
            ref = {k: str(ref.get(k) or "")[:500] for k in ("url", "what", "name", "created")}
            SENDS[m.group(1)] = {"text": "Начинаю…", "progress": 0, "ref": True, "name": ref["name"] or ref["url"]}
            threading.Thread(target=send_ref, args=(m.group(1), ref), daemon=True).start()
            return self.json(200, {"ok": True})
        m = re.fullmatch(r"/api/job/([0-9a-z]{4,24})/submit", self.path)
        if m:
            if not gh_token():
                return self.json(400, {"detail": "Сначала токен GitHub"})
            try:
                job = json.loads(self.rfile.read(n) or b"{}")
            except ValueError:
                return self.json(400, {"detail": "задание не прочиталось"})
            SENDS[m.group(1)] = {"text": "Начинаю отправку…", "progress": 0}
            threading.Thread(target=send_job, args=(m.group(1), job), daemon=True).start()
            return self.json(200, {"ok": True})
        if self.path == "/api/fetch":
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
