#!/usr/bin/env python3
"""Сквозная очередь «多 NEWS» — манхуа-новости по статьям блога ostapdotcenko.ru (04.11.2026).

Пользователь: «мой сайт он про разные ниши, и надо сразу сделать сквозной формат, чтобы можно было, когда одно
закончилось, сразу запускать следующее на следующий день». Поэтому:
- статьи блога раскладываются по сезонам (нишам) — SEASONS ниже, по тегу статьи;
- выпуски нумеруются насквозь: №1, №2, … — сезон за сезоном, один выпуск в день с даты --start;
- у каждого выпуска есть «следующий»: финал ролика анонсирует его («Завтра · №N+1»), а последний выпуск сезона —
  новый сезон («Сезон окончен · завтра — новый сезон …»);
- уже стоящие в очереди выпуски не перенумеровываются: новые статьи блога (он выходит каждый день) дописываются в конец,
  а если сезон ещё не начался — в конец этого сезона.
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default=None, help="дата выхода выпуска №1 (по умолчанию — из очереди или завтра)")
    ap.add_argument("--blog", default="/home/user/ostapdotcenko")
    ap.add_argument("--sync", action="store_true")
    a = ap.parse_args()

    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    start = a.start or old.get("start") or (dt.date.today() + dt.timedelta(days=1)).isoformat()
    arts = articles(Path(a.blog))
    eps = [e for e in old.get("episodes", []) if e.get("status") in ("вышел", "готов")]  # закреплённые не трогаем
    have = {e["slug"] for e in eps}
    plan, aura, other = [], [], []
    for s in SEASONS:
        part = sorted([x for x in arts if x["tag"] in s["tags"] and x["slug"] not in have], key=lambda x: x["date"], reverse=s["order"] == "desc")
        plan += [(s, x) for x in part]
    for x in arts:
        if x["slug"] in have:
            continue
        if x["tag"] in AURA["tags"]:
            aura.append(x)
        elif not season_of(x["tag"]):
            other.append(x)
    # уже закреплённые выпуски — первыми, остальные дописываются по сезонам
    for s, x in plan:
        eps.append({"season_id": s["id"], "season": s["name"], "zh": s["zh"], "slug": x["slug"], "date": x["date"], "title": x["title"], "tag": x["tag"], "status": "план"})
    d0 = dt.date.fromisoformat(start)
    for i, e in enumerate(eps):
        e["n"] = i + 1
        e["day"] = (d0 + dt.timedelta(days=i)).isoformat()
    # номер внутри сезона и «следующий»
    for sid in {e["season_id"] for e in eps}:
        part = [e for e in eps if e["season_id"] == sid]
        for k, e in enumerate(part):
            e["sn"], e["stotal"] = k + 1, len(part)
    for i, e in enumerate(eps):
        nx = eps[i + 1] if i + 1 < len(eps) else None
        e["next"] = None if not nx else {"n": nx["n"], "title": nx["title"], "season": nx["season"], "zh": nx["zh"], "newSeason": nx["season_id"] != e["season_id"]}
    data = {
        "show": "多 NEWS", "about": "манхуа-новости по статьям блога ostapdotcenko.ru: один выпуск в день, сезоны по нишам, сквозная нумерация",
        "start": start, "updated": dt.date.today().isoformat(),
        "seasons": [{k: s[k] for k in ("id", "name", "zh")} | {"episodes": sum(1 for e in eps if e["season_id"] == s["id"])} for s in SEASONS],
        "episodes": [{k: e[k] for k in ("n", "day", "season_id", "season", "zh", "sn", "stotal", "slug", "date", "title", "tag", "status", "next")} for e in eps],
        "aura": [{"slug": x["slug"], "date": x["date"], "title": x["title"]} for x in sorted(aura, key=lambda x: x["date"])],
        "aura_note": "статьи про роботов — отдельная дорожка: под роботов заточен aura-robotics.ru (решение за пользователем)",
        "unassigned": other,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    cur = None
    for e in data["episodes"]:
        if e["season"] != cur:
            cur = e["season"]
            print(f"\n— Сезон «{cur}» {e['zh']} ({e['stotal']})")
        print(f"  №{e['n']:<3} {e['day']}  {e['sn']}/{e['stotal']}  {e['title']}")
    print(f"\nроботы (дорожка aura): {len(data['aura'])}, без сезона: {len(other)} → {OUT.relative_to(ROOT)}")
    if a.sync:
        for e in data["episodes"]:
            for f in (ROOT / "reels-studio/props/blog-news").glob(f"*-{e['slug']}.json"):
                p = json.loads(f.read_text())
                p["ep"] = e["n"]
                p["season"] = {"name": e["season"], "zh": e["zh"], "n": e["sn"], "total": e["stotal"]}
                p["next"] = e["next"]
                f.write_text(json.dumps(p, ensure_ascii=False, indent=1) + "\n")
                print("sync:", f.relative_to(ROOT))


if __name__ == "__main__":
    main()
