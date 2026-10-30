#!/usr/bin/env python3
"""Карусель тура → креативная версия в стиле каруселей кампусов (решение пользователя 30.10.2026: «мне понравились те
карусели, которые ты сегодня сделал для обучающих программ, вот такое было бы хорошо и в других программах внедрить»).

python3 scripts/tour_creative.py <карусель> […]   # например 2026-10-10-foto-tur-china-waste-management

Фото и тексты — из прежней карусели (props/carousels/<имя>.json, при первом запуске она сохраняется в
props/carousels/v1/<имя>.json и дальше читается оттуда), факты маршрута — SINOTECH src/data/tours.json.
Новые слайды по порядку:
  пропуск делегата (campusPass) с логотипами всех компаний → цифра в рамке с логотипом (photoStat) →
  маршрут по дням с логотипами компаний дня (campusRoute) → логотипы «штампами» на фото (tourStamps) →
  «что вы поймёте» полароидами (campusPolaroids) → «самому или с нами» (photoPair, если был) →
  посадочный талон «что входит» (tourTicket) → «для кого» (если был) → финал (photoCta).
"""
import ast, json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROPS = ROOT / "props/carousels"
V1 = PROPS / "v1"
TOURS = Path("/home/user/sinotech/src/data/tours.json")
BRANDS = json.loads((ROOT / "library/brands.json").read_text())
# код города прилёта (коды городов IATA: несколько аэропортов — один код города)
IATA = {"Пекин": "BJS", "Шанхай": "SHA", "Шэньчжэнь": "SZX", "Гуанчжоу": "CAN", "Ханчжоу": "HGH", "Чжаньцзян": "ZHA",
        "Гонконг": "HKG", "Токио": "TYO", "Осака": "OSA", "Бангкок": "BKK", "Хошимин": "SGN", "Ханой": "HAN",
        "Хух-Хото": "HET", "Сямэнь": "XMN", "Хэфэй": "HFE", "Чэнду": "CTU"}


def plural(n: int, one: str, few: str, many: str) -> str:
    n = abs(n) % 100
    if 11 <= n <= 14:
        return many
    return one if n % 10 == 1 else few if 2 <= n % 10 <= 4 else many


def tours():
    def walk(o):
        if isinstance(o, dict):
            if "tour_id" in o:
                yield o
            for v in o.values():
                yield from walk(v)
        elif isinstance(o, list):
            for v in o:
                yield from walk(v)
    return {x["tour_id"]: x for x in walk(json.loads(TOURS.read_text()))}


def lst(v):
    return ast.literal_eval(v) if isinstance(v, str) else v or []


def clean(t: str) -> str:
    return re.sub(r"\*\*", "", t or "").strip()


def brands_in(text: str, ids: list[str]) -> list[str]:
    """логотипы компаний, названных в тексте пункта (только из компаний этой карусели), по порядку упоминания"""
    hits = []
    low = text.lower()
    for b in ids:
        names = BRANDS.get(b, {}).get("names", []) + [b]
        pos = [m.start() for n in names if len(n) >= 3 for m in re.finditer(r"(?<![\w])" + re.escape(n.lower()) + r"(?![\w])", low)]
        if pos:
            hits.append((min(pos), b))
    return [b for _, b in sorted(hits)]


def route_items(route: dict, ids: list[str]):
    items, logos = [], []
    for it in route.get("items", []):
        m = re.match(r"^((?:День|Дни|Дня)\s*[\d–\-, ]+)\s*·\s*(.*)$", it)
        label, rest = (m.group(1).strip(), m.group(2)) if m else ("", it)
        place, _, who = rest.partition(": ")
        text = f"{place} — {who}" if who else place
        items.append(f"{label} · {text}" if label else text)
        logos.append({"src": "+".join(brands_in(who or rest, ids)[:2]) or "-"})
    return items, logos


def convert(name: str, T: dict) -> dict:
    src = PROPS / f"{name}.json"
    V1.mkdir(exist_ok=True)
    if not (V1 / f"{name}.json").exists():
        shutil.copy(src, V1 / f"{name}.json")
    old = json.loads((V1 / f"{name}.json").read_text())
    S = old["slides"]
    tid = name.split("-foto-tur-", 1)[1]
    tour = next((T[k] for k in T if k.startswith(tid)), None)
    first = lambda f: next((s for s in S if f(s)), None)
    cover = first(lambda s: s["kind"] == "photoCover")
    stat = first(lambda s: s["kind"] == "photoStat")
    route = first(lambda s: (s.get("kicker") or "").startswith("Маршрут") and s.get("items"))
    logos = first(lambda s: s.get("logos"))
    und = first(lambda s: re.search(r"поймёте|увидите", (s.get("kicker") or "") + (s.get("title") or "")) and s.get("items"))
    pair = first(lambda s: s["kind"] == "photoPair")
    inc = first(lambda s: (s.get("kicker") or "") == "Что входит")
    cta = first(lambda s: s["kind"] == "photoCta")
    i_inc = S.index(inc)
    extra = S[i_inc + 1] if i_inc + 1 < len(S) and S[i_inc + 1]["kind"] != "photoCta" else None
    note_extra = extra if extra and (extra.get("kicker") in ("Важно", "Формат")) else None
    keep_extra = extra if extra and not note_extra else None
    ids = [l["src"] for l in (logos or {}).get("logos", [])]

    st = (tour or {}).get("stats", {})
    days, nights, cities = st.get("days", 5), st.get("nights", 6), st.get("cities", 0)
    itin = lst((tour or {}).get("itinerary"))
    chain = []
    for d in itin:
        for c in re.split(r"\s*→\s*", re.sub(r"\s*—.*$", "", d.get("city_ru", ""))):
            c = re.sub(r",.*$", "", c).strip()
            if c and c not in chain and not c.startswith("Гуандун"):
                chain.append(c)
    arr = (tour or {}).get("arrival_ru", "")
    m = re.search(r"Москва\s*→\s*([А-ЯЁ][\w\-]+)", arr)
    to_city = m.group(1) if m else re.split(r"[ (,]", arr, 1)[0]
    line = f"{days} {plural(days, 'день', 'дня', 'дней')} · " + (chain[0] if cities == 1 and chain else f"{cities} {plural(cities, 'город', 'города', 'городов')}")

    pass_slide = {
        "kind": "campusPass", "image": cover["image"], "focus": cover.get("focus", "50% 40%"),
        "logo": ids[:6] if len(ids) <= 6 else ids,
        "pass": {"role": "ДЕЛЕГАТ ЭКСПЕДИЦИИ", "name": ((tour or {}).get("title_ru") or "").split(":")[0] or clean(cover.get("text", "")).split(" · ")[0], "line": line},
        "kicker": cover.get("kicker"), "title": cover.get("title"),
        "text": " → ".join(chain) if 1 < len(chain) <= 5 and len(" → ".join(chain)) <= 64 else cover.get("text"),
    }
    out = [pass_slide]
    if stat:
        s2 = dict(stat)
        s2["frame"] = True
        out.append(s2)
    if route:
        items, rlogos = route_items(route, ids)
        r = {"kind": "campusRoute", "image": route["image"], "focus": route.get("focus", "50% 40%"), "kicker": "Маршрут по дням", "title": route.get("title"), "items": items}
        if any(l["src"] != "-" for l in rlogos):
            r["logos"] = rlogos
        out.append(r)
    if logos:
        out.append({"kind": "tourStamps", "image": logos["image"], "focus": logos.get("focus", "50% 40%"), "kicker": logos.get("kicker") or "Компании маршрута",
                    "title": logos.get("title"), **({"items": logos["items"]} if logos.get("items") else {}), "logos": [{"src": b} for b in ids]})
    if und:
        pics = [p for p in (und, inc, note_extra) if p and p.get("image")]
        caps = und["items"][: len(pics)]
        out.append({"kind": "campusPolaroids", "kicker": und.get("kicker") or "Что вы поймёте", "title": und.get("title"),
                    "images": [{"src": p["image"], "focus": p.get("focus", "50% 40%"), "caption": clean(c)} for p, c in zip(pics, caps)]})
    if pair:
        out.append(pair)
    if inc:
        tk = {"to": IATA.get(to_city, to_city[:3].upper()), "toCity": to_city,
              "stats": [[str(days), plural(days, "день", "дня", "дней")], [str(nights), plural(nights, "ночь", "ночи", "ночей")]]}
        if cities > 1:
            tk["stats"].append([str(cities), plural(cities, "город", "города", "городов")])
        if "Москва" in arr:
            tk["from"] = "Москва"
        t = {"kind": "tourTicket", "kicker": "Что входит", "title": inc.get("title"), "items": inc.get("items", []), "ticket": tk}
        if note_extra:
            t["text"] = f"{clean(note_extra.get('title'))}. {clean(note_extra.get('text'))}".rstrip(".") + "."
        out.append(t)
    if keep_extra:
        k = dict(keep_extra)
        k["frame"] = False
        out.append(k)
    if cta:
        out.append(cta)
    return {"brand": old.get("brand", "gtt"), "slides": out}


if __name__ == "__main__":
    T = tours()
    for n in sys.argv[1:]:
        new = convert(n, T)
        (PROPS / f"{n}.json").write_text(json.dumps(new, ensure_ascii=False, indent=1) + "\n")
        print("TOUR_CREATIVE", n, " / ".join(s["kind"] for s in new["slides"]))
