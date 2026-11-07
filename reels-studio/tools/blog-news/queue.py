#!/usr/bin/env python3
"""Сквозная очередь «多 NEWS» — манхуа-новости по статьям блога ostapdotcenko.ru (04.11.2026).

Пользователь: «мой сайт он про разные ниши, и надо сразу сделать сквозной формат, чтобы можно было, когда одно
закончилось, сразу запускать следующее на следующий день». Поэтому:
- статьи блога раскладываются по сезонам (нишам) — SEASONS ниже, по тегу статьи;
- выпуски нумеруются насквозь: №1, №2, … — сезон за сезоном, один выпуск в день с даты --start;
- у каждого выпуска есть «следующий»: финал ролика анонсирует его («Завтра · №N+1»), а последний выпуск сезона —
  новый сезон («Сезон окончен · завтра — новый сезон …»);
- уже стоящие в очереди выпуски не перенумеровываются и не переставляются (07.11.2026: и запланированные тоже — порядок очереди
  правится руками, например сезон «Китайский ИИ» вне очереди); новые статьи блога (он выходит каждый день) встают в конец
  своего сезона, если в нём ещё есть невышедшие выпуски, иначе — в конец очереди;
- сезон можно прервать другим и продолжить позже: у выпуска перед вставкой в анонсе `pause` («пауза в сезоне»), у последнего
  выпуска вставки — `resume` («возвращается сезон …»); вторая серия выпусков того же сезона в конце очереди — `part: 2`
  (свой счёт N/M).
Роботы — отдельная дорожка `aura` (под роботов заточен aura-robotics.ru), в сквозную нумерацию не входят, пока не решено.

python3 reels-studio/tools/blog-news/queue.py [--start 2026-11-05] [--blog /home/user/ostapdotcenko] [--sync]
Выход: reels-studio/props/blog-news/очередь.json (+ таблица в терминале). --sync — переписать в props выпусков
(reels-studio/props/blog-news/NNN-<slug>.json) номер, сезон и анонс следующего выпуска из очереди.
"""
import argparse, datetime as dt, json, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "reels-studio/props/blog-news/очередь.json"

# порядок сезонов = порядок выхода; order: desc — свежие сначала (истории сами по себе), asc — как писались (серии с сюжетом)
SEASONS = [
    {"id": "perezapuski", "name": "Перезапуски", "zh": "重启", "tags": ["Перезапуски"], "order": "desc"},
    {"id": "nablyudeniya", "name": "Наблюдения", "zh": "观察", "tags": ["Наблюдения", "Еда в Китае"], "order": "desc"},
    {"id": "napitki", "name": "Напитки Азии", "zh": "饮品", "tags": ["Напитки Азии"], "order": "asc"},
    # 07.11.2026: серия про китайский ИИ выходит каждый день — сезон «Китайский ИИ» поставлен вне очереди сразу за №13
    {"id": "ii", "name": "Китайский ИИ", "zh": "智能", "tags": ["Искусственный интеллект"], "order": "asc"},
    {"id": "kuhni", "name": "Центральные кухни", "zh": "厨房", "tags": ["Центральные кухни", "Пищепром Китая", "Напитки Китая", "Корея / Ритейл"], "order": "asc"},
    {"id": "keisy", "name": "Кейсы", "zh": "案例", "tags": ["E-commerce"], "order": "asc"},
]
AURA = {"id": "roboty", "name": "Роботы", "zh": "机器人", "tags": ["Роботы", "Робототехника и ИИ"]}


def articles(blog: Path):
    src = subprocess.run(["git", "-C", str(blog), "show", "origin/main:src/i18n/ru.ts"], capture_output=True, text=True, check=True).stdout
    blk = src[src.find("articles: ["):]
    rx = r'category:\s*"(\w+)",\s*slug:\s*"([^"]+)",\s*date:\s*"([^"]+)",\s*tag:\s*"([^"]*)",\s*time:\s*"([^"]*)",\s*title:\s*"([^"]+)"'
    return [dict(category=c, slug=s, date=d, tag=t, time=tm, title=ti) for c, s, d, t, tm, ti in re.findall(rx, blk)]


def season_of(tag: str):
    for s in SEASONS:
        if tag in s["tags"]:
            return s
    return None


def blk(e):
    return (e["season_id"], e.get("part", 1))


def number(eps, start):
    """номер и день выхода, номер внутри сезона (сезон + часть), «следующий» с паузой и возвращением сезона"""
    d0 = dt.date.fromisoformat(start)
    for i, e in enumerate(eps):
        e["n"], e["day"] = i + 1, (d0 + dt.timedelta(days=i)).isoformat()
    tot, cnt = {}, {}
    for e in eps:
        tot[blk(e)] = tot.get(blk(e), 0) + 1
    for e in eps:
        cnt[blk(e)] = cnt.get(blk(e), 0) + 1
        e["sn"], e["stotal"] = cnt[blk(e)], tot[blk(e)]
    for i, e in enumerate(eps):
        nx = eps[i + 1] if i + 1 < len(eps) else None
        if not nx:
            e["next"] = None
            continue
        ch = blk(nx) != blk(e)
        e["next"] = {"n": nx["n"], "title": nx["title"], "season": nx["season"], "zh": nx["zh"], "newSeason": ch}
        if ch and e["sn"] < e["stotal"]:
            e["next"]["pause"] = True  # свой сезон ещё не окончен — его прерывают
        if ch and nx["sn"] > 1:
            e["next"]["resume"] = True  # следующий сезон уже шёл раньше


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default=None, help="дата выхода выпуска №1 (по умолчанию — из очереди или завтра)")
    ap.add_argument("--blog", default="/home/user/ostapdotcenko")
    ap.add_argument("--sync", action="store_true")
    ap.add_argument("--out", default=str(OUT), help="куда писать очередь (для проверки — во временный файл)")
    a = ap.parse_args()

    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    start = a.start or old.get("start") or (dt.date.today() + dt.timedelta(days=1)).isoformat()
    arts = articles(Path(a.blog))
    # прежняя очередь целиком и в том же порядке (статьи, которых ещё нет на сайте, — из POST-HUB, тоже остаются)
    eps = [dict(e) for e in old.get("episodes", [])]
    have = {e["slug"] for e in eps}
    aura, other = [], []
    for s in SEASONS:
        part = sorted([x for x in arts if x["tag"] in s["tags"] and x["slug"] not in have], key=lambda x: x["date"], reverse=s["order"] == "desc")
        for x in part:
            e = {"season_id": s["id"], "season": s["name"], "zh": s["zh"], "slug": x["slug"], "date": x["date"], "title": x["title"], "tag": x["tag"], "status": "план"}
            last = max((i for i, y in enumerate(eps) if y["season_id"] == s["id"]), default=None)
            if last is not None and eps[last]["status"] == "план":
                e["part"] = eps[last].get("part", 1)
                eps.insert(last + 1, e)  # сезон ещё идёт — в конец его выпусков
            else:
                if last is not None:  # сезон уже весь готов — новая часть в конце очереди
                    e["part"] = eps[last].get("part", 1) + (0 if eps[-1]["season_id"] == s["id"] else 1)
                eps.append(e)
    for x in arts:
        if x["slug"] in have:
            continue
        if x["tag"] in AURA["tags"]:
            aura.append(x)
        elif not season_of(x["tag"]):
            other.append(x)
    number(eps, start)
    keys = ("n", "day", "season_id", "season", "zh", "sn", "stotal", "slug", "date", "title", "tag", "status", "part", "next")
    data = {
        "show": "多 NEWS", "about": "манхуа-новости по статьям блога ostapdotcenko.ru: один выпуск в день, сезоны по нишам, сквозная нумерация",
        "start": start, "updated": dt.date.today().isoformat(),
        "seasons": [{k: s[k] for k in ("id", "name", "zh")} | {"episodes": sum(1 for e in eps if e["season_id"] == s["id"])} for s in SEASONS],
        "episodes": [{k: e[k] for k in keys if k in e} for e in eps],
        "aura": sorted({x["slug"]: x for x in old.get("aura", []) + [{"slug": x["slug"], "date": x["date"], "title": x["title"]} for x in aura]}.values(), key=lambda x: x["date"]),
        "aura_note": "статьи про роботов — отдельная дорожка: под роботов заточен aura-robotics.ru (решение за пользователем)",
        "unassigned": [x for x in other if x["slug"] not in {e["slug"] for e in eps}],
    }
    if old.get("note"):
        data["note"] = old["note"]
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    cur = None
    for e in data["episodes"]:
        if blk(e) != cur:
            cur = blk(e)
            print(f"\n— Сезон «{e['season']}» {e['zh']}{' · часть ' + str(e['part']) if e.get('part') else ''} ({e['stotal']})")
        print(f"  №{e['n']:<3} {e['day']}  {e['sn']}/{e['stotal']}  {e['status']:<5} {e['title']}")
    print(f"\nроботы (дорожка aura): {len(data['aura'])}, без сезона: {len(data['unassigned'])} → {out}")
    if a.sync:
        # в props — номер, сезон и анонс следующего; файл переписывается, только если что-то поменялось
        for e in data["episodes"]:
            for f in (ROOT / "reels-studio/props/blog-news").glob(f"*-{e['slug']}.json"):
                p = json.loads(f.read_text())
                q = dict(p, ep=e["n"], season={"name": e["season"], "zh": e["zh"], "n": e["sn"], "total": e["stotal"]}, next=e["next"])
                if q != p:
                    f.write_text(json.dumps(q, ensure_ascii=False, indent=1) + "\n")
                    print("sync:", f.relative_to(ROOT))


if __name__ == "__main__":
    main()
