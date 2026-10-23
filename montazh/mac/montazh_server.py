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
import base64
import json
import shutil
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
PREVIEWS: dict = {}  # «задание/файл» → ход скачивания для просмотра в окне
DONE: dict = {}  # id → статус готового задания (больше не меняется — не перечитывать status.json)
PREVIEW = HOME / "preview"  # готовые ролики для просмотра в окне (чистятся через 14 дней)
# Файлы релизов GitHub отдаёт с release-assets.githubusercontent.com — из Китая он часто закрыт. Тогда — зеркала
# github.com (отдают те же публичные файлы, размер сверяется с GitHub).
GH_MIRRORS = ("https://ghfast.top/", "https://gh-proxy.com/", "https://ghproxy.net/")
NET_FAIL = {5, 6, 7, 28, 35, 52, 55, 56, 97}  # curl: нет адреса, нет соединения, таймаут, TLS, обрыв, прокси
STATUS_RE = re.compile(r"montazh-status:([A-Za-z0-9+/=]+)")  # статус в описании релиза (пишет движок)


def gh_token() -> str:
    f = HOME / "github.json"
    try:
        return json.loads(f.read_text()).get("token", "")
    except (OSError, ValueError):
        return ""


def gh(method: str, url: str, data_file=None, ctype="application/json", timeout=120):
    """Запрос к GitHub через curl. Токен — в конфиге на stdin (-K -), в списке процессов его не видно.
    Если в macOS включён системный прокси (VPN), сначала через него — как ходит окно (Chrome); не ответил — напрямую."""
    cfg = (f'header = "Authorization: Bearer {gh_token()}"\n'
           'header = "Accept: application/vnd.github+json"\nheader = "X-GitHub-Api-Version: 2022-11-28"\n')
    args = ["curl", "-sS", "-L", "-X", method, "-K", "-", "-w", "\n%{http_code}", "-A", "Montazh", "--connect-timeout", "15"]
    if data_file is not None and ctype == "application/octet-stream":   # ролик — потоком, не целиком в память
        args += ["-H", f"Content-Type: {ctype}", "-T", str(data_file), "--speed-limit", "1024", "--speed-time", "120"]
    elif data_file is not None:
        args += ["-H", f"Content-Type: {ctype}", "--data-binary", f"@{data_file}"]
    proxy = sys_proxy()
    for p in [proxy, None] if proxy else [None]:
        out = subprocess.run(args + (["-x", p] if p else []) + [url], input=cfg.encode(), capture_output=True, timeout=timeout)
        if out.returncode in NET_FAIL and p:
            nlog(f"GitHub через прокси {p} не ответил (curl {out.returncode}) — пробую напрямую")
            continue
        if out.returncode in NET_FAIL:
            nlog(f"GitHub не ответил (curl {out.returncode}): {out.stderr.decode('utf-8', 'replace').strip()[:160]}")
        break
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


def pending_file(jid: str) -> pathlib.Path:
    """Задание, которое ещё не дошло до GitHub: лежит на Mac, пока отправка не закончится (её продолжат и после перезапуска)."""
    return HOME / "jobs" / f"{jid}.job.json"


SEND_WAITS = (30, 120, 300, 600)  # повторы отправки при обрыве, с


def send_job(jid: str, job: dict) -> None:
    """Отправка с повторами. Из Китая ролик идёт на GitHub 20+ минут — обрыв сети, сон Mac или закрытое окно её рвут;
    задание и файлы остаются на Mac (pending_file), отправка продолжается сама: повторы здесь, потом resume_sends()."""
    st = SENDS.setdefault(jid, {"text": "Начинаю отправку…", "progress": 0})
    if st.get("running"):
        return
    st["running"] = True
    try:
        for i, wait in enumerate((0,) + SEND_WAITS):
            if wait:
                st.update(text=f"Нет связи с GitHub — повторю через {wait // 60 or wait} {'мин' if wait >= 60 else 'с'} "
                               f"(попытка {i + 1} из {len(SEND_WAITS) + 1}). Окно можно не трогать.")
                time.sleep(wait)
            st.pop("error", None)
            send_once(jid, job, st)
            if st.get("sent") or not st.get("error"):
                break
            nlog(f"отправка {jid}: {st.get('error')}")
    finally:
        st["running"] = False


def resume_sends() -> None:
    """Недоотправленные задания (окно закрывали, Mac засыпал, обновление) — продолжить; при запуске и раз в 10 минут."""
    while True:
        for f in sorted((HOME / "jobs").glob("*.job.json")) if (HOME / "jobs").exists() else []:
            jid = f.name.split(".")[0]
            if SENDS.get(jid, {}).get("running") or SENDS.get(jid, {}).get("sent"):
                continue
            try:
                job = json.loads(f.read_text("utf-8"))
            except (OSError, ValueError):
                continue
            nlog(f"продолжаю отправку {jid} «{job.get('name', '')}»")
            threading.Thread(target=send_job, args=(jid, job), daemon=True).start()
        old = time.time() - 2 * 86400                         # файлы отправок без задания (оборвались до этой версии)
        for d in (HOME / "jobs").iterdir() if (HOME / "jobs").exists() else []:
            try:
                if d.is_dir() and not pending_file(d.name).exists() and d.stat().st_mtime < old:
                    shutil.rmtree(d, ignore_errors=True)
            except OSError:
                pass
        time.sleep(600)


def send_once(jid: str, job: dict, st: dict) -> None:
    """Файлы задания → релиз montazh-<id>, задание → montazh/jobs/<id>.json (запускает рендер)."""
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
                         data_file=str(p), ctype="application/octet-stream", timeout=6 * 3600)
            if code not in (200, 201):
                raise LinkError(f"Файл {p.name} не загрузился ({code}): {d.get('message', '')}")
            sent += size
        st.update(text="Отправляю задание…", progress=0.93)
        path = f"montazh/jobs/{jid}.json"
        code, cur = gh("GET", f"https://api.github.com/repos/{REPO}/contents/{path}?ref=main")
        payload = {"message": f"Монтажная: задание «{job.get('name', jid)}»", "branch": "main",
                   "content": base64.b64encode(json.dumps(job, ensure_ascii=False, indent=1).encode()).decode()}
        if code == 200 and cur.get("sha"):
            payload["sha"] = cur["sha"]
        code, d = gh_json("PUT", f"https://api.github.com/repos/{REPO}/contents/{path}", payload)
        if code not in (200, 201):
            raise LinkError(f"Задание не записалось ({code}): {d.get('message', '')}")
        st.update(text="Отправлено — рендер начнётся через минуту", progress=1.0, sent=True)
        shutil.rmtree(folder, ignore_errors=True)   # файлы уже в релизе
        pending_file(jid).unlink(missing_ok=True)
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


# готовые файлы по именам в релизе — если статус не прочитался (порядок как у движка)
GUESS = ((".mp4", "video", "Reels, полное качество"), ("-phone.mp4", "phone", "Reels: копия для телефона"),
         ("-frames.jpg", "frames", "Раскадровка"), ("-stories.mp4", "stories", "Stories, полное качество"),
         ("-stories-phone.mp4", "phone", "Stories: копия для телефона"))


def guess_status(jid: str, assets: dict) -> dict:
    slug = f"montazh-{jid}"
    files = [{"name": slug + suf, "kind": kind, "title": title, "size": assets[slug + suf]["size"]}
             for suf, kind, title in GUESS if slug + suf in assets]
    for name in sorted(assets):
        m = re.fullmatch(re.escape(slug) + r"(-stories)?-(\d+)\.mp4", name)
        if m:
            files.append({"name": name, "kind": "part", "title": f"Stories, часть {m.group(2)}", "size": assets[name]["size"]})
    if not any(f["kind"] == "frames" for f in files):   # раскадровка — сразу после первого рендера
        return {"stage": "queued", "text": "В работе (подробный ход не прочитался — файлы появятся сами)", "progress": 0.1}
    return {"stage": "done", "text": "Готово", "progress": 1, "files": files, "done": True, "guess": True}


def job_committed(jid: str, rel: dict) -> bool:
    """Дошло ли задание до репозитория: статус в релизе есть — да; нет — спросить montazh/jobs/<id>.json."""
    if STATUS_RE.search(rel.get("body") or "") or any(a["name"] == "status.json" for a in rel.get("assets", [])) or jid in DONE:
        return True
    code, _ = gh("GET", f"https://api.github.com/repos/{REPO}/contents/montazh/jobs/{jid}.json?ref=main")
    return code != 404


def job_state(jid: str) -> dict:
    """Ход работы в облаке — только через api.github.com: статус из описания релиза (его пишет движок), для старых
    заданий — status.json (API, прокси, зеркала) или готовые файлы по именам."""
    code, rel = gh("GET", f"https://api.github.com/repos/{REPO}/releases/tags/montazh-{jid}")
    if code == 0:
        return {"stage": "net", "text": "Нет связи с GitHub — проверьте интернет или VPN; Монтажная попробует ещё раз", "progress": 0}
    if code == 401:
        return {"stage": "token", "text": "Ключ GitHub не подходит — нажмите «Сменить ключ GitHub» и введите новый"}
    if code != 200 or not job_committed(jid, rel):
        if pending_file(jid).exists():
            return {"stage": "send", "text": "Отправка оборвалась — Монтажная продолжит её сама", "progress": 0}
        return {"stage": "lost", "text": "Ролик не дошёл до облака: отправку оборвали (закрыли окно, Mac уснул или пропала "
                                         "сеть). Нажмите «Отправить заново».", "progress": 0}
    assets = {a["name"]: a for a in rel.get("assets", [])}
    st = json.loads(json.dumps(DONE[jid])) if jid in DONE else None
    m = None if st else STATUS_RE.search(rel.get("body") or "")
    if m:
        try:
            st = json.loads(base64.b64decode(m.group(1)).decode("utf-8"))
        except ValueError:
            st = None
        if st and not (st.get("ts") or st.get("done") or st.get("error")):
            st = None          # неготовый статус без ts записан не движком по ходу работы — мог застыть, верим status.json
    if st is None and "status.json" in assets:
        with tempfile.TemporaryDirectory() as tmp:
            dst = pathlib.Path(tmp) / "status.json"
            try:
                a = assets["status.json"]
                asset_get(a["id"], a["browser_download_url"], dst, small=True)
                st = json.loads(dst.read_text("utf-8"))
            except (LinkError, OSError, ValueError):
                st = None
    if st is None:
        st = guess_status(jid, assets)
    if st.get("done") and not st.get("guess") and jid not in DONE:   # догадку по файлам не запоминаем
        DONE[jid] = json.loads(json.dumps(st))
    st["page"] = rel.get("html_url") or f"https://github.com/{REPO}/releases/tag/montazh-{jid}"
    for f in st.get("files", []):
        a = assets.get(f["name"])
        if a:
            f["url"] = a["browser_download_url"]
            f["asset"] = a["id"]
            got = SAVES.get(f"{jid}/{f['name']}")
            if got:
                f["saved"] = {k: got.get(k) for k in ("done", "error", "path", "progress")}
            if (PREVIEW / jid / f["name"]).is_file() or (got and got.get("done")):
                f["local"] = True
    return st


def asset_get(asset_id: int, url: str, dst: pathlib.Path, size=None, prog=None, small=False) -> str:
    """Файл релиза → dst. Источники по очереди: API GitHub с ключом (через прокси macOS, потом напрямую) — он
    перенаправляет на release-assets.githubusercontent.com; не вышло — зеркала github.com. Докачка с места обрыва,
    размер сверяется с GitHub. Возвращает адрес, с которого скачалось."""
    tok = gh_token()
    cfg = ((f'header = "Authorization: Bearer {tok}"\n' if tok else "") +
           'header = "Accept: application/octet-stream"\nheader = "X-GitHub-Api-Version: 2022-11-28"\n')
    proxy = sys_proxy()
    api = f"https://api.github.com/repos/{REPO}/releases/assets/{asset_id}"
    tries = [(api, p, cfg) for p in ([proxy, None] if proxy else [None])] + [(m + url, None, "") for m in GH_MIRRORS]
    part = dst.with_name(dst.name + ".part")
    dst.parent.mkdir(parents=True, exist_ok=True)
    if small or (size and part.exists() and part.stat().st_size >= size):
        part.unlink(missing_ok=True)
    for u, p, c in tries if small else tries * 2:
        host = urllib.parse.urlparse(u).netloc
        args = ["curl", "-sS", "-L", "--fail", "-A", "Montazh", "--connect-timeout", "15", "-K", "-", "-o", str(part),
                *(["-x", p] if p else []),
                *(["-m", "20"] if small else ["--speed-limit", "4096", "--speed-time", "45", "-C", "-"]), u]
        proc = subprocess.Popen(args, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
        proc.stdin.write(c.encode())
        proc.stdin.close()
        while proc.poll() is None:
            if prog is not None and size:
                prog["progress"] = min(0.99, (part.stat().st_size if part.exists() else 0) / size)
            threading.Event().wait(0.5)
        got = part.stat().st_size if part.exists() else 0
        if proc.returncode == 0 and got and (not size or got == size):
            part.replace(dst)
            if host != "api.github.com":
                nlog(f"{dst.name}: скачано через {host}")
            return u
        err = proc.stderr.read().decode("utf-8", "replace").strip()[:160]
        nlog(f"{dst.name}: не скачалось с {host}{' через прокси ' + p if p else ''} (curl {proc.returncode}, {got} байт) {err}")
        if proc.returncode in (0, 33) or (size and got > size):   # не тот файл или сервер не умеет докачку — заново
            part.unlink(missing_ok=True)
    if small:
        part.unlink(missing_ok=True)
    raise LinkError("Не скачалось ни с GitHub, ни с зеркал — проверьте интернет или VPN и нажмите ещё раз "
                    "(или откройте страницу ролика на GitHub)")


def job_file(jid: str, name: str) -> dict:
    st = job_state(jid)
    f = next((x for x in st.get("files", []) if x["name"] == name and x.get("asset")), None)
    if not f:
        raise LinkError("Файла ещё нет в облаке — подождите, пока ролик доделается")
    return {**f, "job": st.get("name") or jid}


def local_copy(jid: str, name: str):
    """Уже скачанный файл: в «Загрузках» (кнопкой «Скачать») или для просмотра в окне."""
    got = SAVES.get(f"{jid}/{name}")
    if got and got.get("done") and pathlib.Path(got["path"]).is_file():
        return pathlib.Path(got["path"])
    p = PREVIEW / jid / name
    return p if p.is_file() else None


def send_local(handler, path: pathlib.Path):
    """Файл с диска окну — с поддержкой Range (перемотка в <video>)."""
    size = path.stat().st_size
    m = re.fullmatch(r"bytes=(\d*)-(\d*)", handler.headers.get("Range") or "")
    start, end = 0, size - 1
    if m and (m.group(1) or m.group(2)):
        if m.group(1):
            start, end = int(m.group(1)), min(int(m.group(2) or size - 1), size - 1)
        else:
            start = max(0, size - int(m.group(2)))
        if start > end:
            handler.send_response(416)
            handler.send_header("Content-Range", f"bytes */{size}")
            handler.end_headers()
            return None
        handler.send_response(206)
        handler.send_header("Content-Range", f"bytes {start}-{end}/{size}")
    else:
        handler.send_response(200)
    handler.send_header("Content-Type", "image/jpeg" if path.suffix == ".jpg" else "video/mp4")
    handler.send_header("Content-Length", str(end - start + 1))
    handler.send_header("Accept-Ranges", "bytes")
    handler.end_headers()
    left = end - start + 1
    try:
        with path.open("rb") as fh:
            fh.seek(start)
            while left > 0 and (chunk := fh.read(min(left, 1 << 20))):
                handler.wfile.write(chunk)
                left -= len(chunk)
    except OSError:
        pass                                                   # окно перемотало или закрыло ролик
    return None


def clean_previews(days: int = 14) -> None:
    old = time.time() - days * 86400
    for f in PREVIEW.glob("*/*") if PREVIEW.exists() else []:
        try:
            if f.stat().st_mtime < old:
                f.unlink()
        except OSError:
            pass


def preview_file(jid: str, name: str) -> None:
    """Готовый ролик → кэш для просмотра в окне (окно само до GitHub не достаёт: те же закрытые адреса)."""
    job = PREVIEWS[f"{jid}/{name}"]
    try:
        f = job_file(jid, name)
        asset_get(f["asset"], f["url"], PREVIEW / jid / name, size=f.get("size"), prog=job)
        job.update(done=True, progress=1)
    except (LinkError, subprocess.SubprocessError, OSError) as exc:
        job["error"] = str(exc) or "Не скачалось"


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
    """Готовый файл задания → ~/Downloads/Монтажная (API GitHub, прокси macOS или зеркала — см. asset_get),
    потом показывает его в Finder."""
    key = f"{jid}/{name}"
    job = SAVES[key]
    try:
        f = job_file(jid, name)
        DOWNLOADS.mkdir(parents=True, exist_ok=True)
        dst = DOWNLOADS / save_name(f["job"], f, tag)
        seen = PREVIEW / jid / name
        if seen.is_file() and seen.stat().st_size == f.get("size"):
            shutil.copy2(seen, dst)                           # уже смотрели в окне — второй раз не качаем
        else:
            asset_get(f["asset"], f["url"], dst, size=f.get("size"), prog=job)
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


PROXY_SEEN = {"t": 0.0, "v": None}


def sys_proxy():
    """Прокси из настроек macOS (VPN-программы часто включают «системный прокси» — его видит Chrome, но не curl).
    Запоминается на 30 с: состояние роликов опрашивается часто."""
    if os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY") or sys.platform != "darwin":
        return None                                          # curl возьмёт его сам
    if time.time() - PROXY_SEEN["t"] < 30:
        return PROXY_SEEN["v"]
    v = None
    try:
        out = subprocess.run(["scutil", "--proxy"], capture_output=True, text=True, timeout=3).stdout
        d = dict(re.findall(r"(\w+)\s*:\s*(\S+)", out))
        if d.get("HTTPSEnable") == "1" and d.get("HTTPSProxy"):
            v = f"http://{d['HTTPSProxy']}:{d.get('HTTPSPort', '443')}"
        elif d.get("SOCKSEnable") == "1" and d.get("SOCKSProxy"):
            v = f"socks5h://{d['SOCKSProxy']}:{d.get('SOCKSPort', '1080')}"
    except (OSError, subprocess.SubprocessError):
        v = None
    PROXY_SEEN.update(t=time.time(), v=v)
    return v


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
        m = re.fullmatch(r"/api/job/([0-9a-z]{4,24})/preview/([A-Za-z0-9._-]{1,80})", self.path)
        if m:
            if local_copy(m.group(1), m.group(2)):
                return self.json(200, {"done": True, "progress": 1})
            got = PREVIEWS.get(f"{m.group(1)}/{m.group(2)}") or {}
            return self.json(200, {} if got.get("done") else got)    # готов, но файла уже нет — качать заново
        m = re.fullmatch(r"/api/job/([0-9a-z]{4,24})/file/([A-Za-z0-9._-]{1,80})", self.path.split("?")[0])
        if m:
            # готовый файл для окна: скачанный ранее; маленький (раскадровка) — скачивается сразу
            jid, name = m.groups()
            path = local_copy(jid, name)
            if not path and name.endswith(".jpg") and gh_token():
                try:
                    f = job_file(jid, name)
                    if (f.get("size") or 0) < 8 << 20:
                        asset_get(f["asset"], f["url"], PREVIEW / jid / name, size=f.get("size"))
                        path = local_copy(jid, name)
                except (LinkError, subprocess.SubprocessError, OSError):
                    path = None
            if not path:
                return self.json(404, {"detail": "файл ещё не скачан"})
            return send_local(self, path)
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
        m = re.fullmatch(r"/api/job/([0-9a-z]{4,24})/preview", self.path)
        if m:
            # посмотреть готовый ролик в окне: сервер скачивает его в кэш (API, прокси macOS или зеркала)
            try:
                name = (json.loads(self.rfile.read(n) or b"{}").get("name") or "").strip()
            except ValueError:
                name = ""
            if not re.fullmatch(r"[A-Za-z0-9._-]{1,80}", name):
                return self.json(400, {"detail": "нет такого файла"})
            if not gh_token():
                return self.json(400, {"detail": "Сначала ключ GitHub"})
            if local_copy(m.group(1), name):
                return self.json(200, {"done": True, "progress": 1})
            key = f"{m.group(1)}/{name}"
            got = PREVIEWS.get(key)
            if not got or got.get("error") or got.get("done"):     # done без файла на диске — файл удалили
                PREVIEWS[key] = {"done": False, "progress": 0}
                threading.Thread(target=preview_file, args=(m.group(1), name), daemon=True).start()
            return self.json(200, PREVIEWS[key])
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
            pending_file(m.group(1)).parent.mkdir(parents=True, exist_ok=True)
            pending_file(m.group(1)).write_text(json.dumps(job, ensure_ascii=False), "utf-8")
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
    threading.Thread(target=clean_previews, daemon=True).start()
    threading.Thread(target=resume_sends, daemon=True).start()
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
