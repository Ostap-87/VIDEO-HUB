"""Черновик props для TalkReelPro по расшифровке — основа быстрого пайплайна (npm run auto).

  python3 scripts/autoprops.py --name 2026-10-09-avto --theme avto --clip avto
  python3 scripts/autoprops.py … --force      # пересобрать props заново (картинки Higgsfield подберутся снова)

Берёт из source-videos/<name>/_work/: <clip>.cut.mp4, .cut.json, .cut.words.json, .cut.layout.json — и библиотеки
reels-studio/library/ (brands, cities, phrases, themes, music). Расставляет по словам речи:
логотипы (все бренды из библиотеки, «Alibaba → Сбер» переворотом), города (панель внизу), стандартные плашки
и цифры второй половины (кто я, 10+ лет, 1000+ компаний, «никаких переписок» с зачёркиванием), чек-листы
(«Как устроена поездка», «Условия», «Для кого поездка»), «Пять дней, N …» крупной цифрой, график темы,
перебивки из каталога Higgsfield по смыслу фразы (без повторов), зумы вокруг линии глаз, финал с сайтом.
Пишет props/<name>.json и отчёт _work/<clip>.auto.json + .auto.md (что найдено, что проверить, диапазоны вырезки,
точки разреза Stories) и лист _work/<clip>.sheet.jpg со всеми картинками и логотипами ролика для проверки глазами.
"""
import argparse
import glob
import json
import pathlib
import re
import subprocess
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent  # корень репозитория
STUDIO = ROOT / "reels-studio"
LIB = STUDIO / "library"
HF = ROOT / "source-videos" / "higgsfield"
TRANSITIONS = ["circle", "slide", "zoom", "wipe", "fade"]
# картинки про другие страны в ролики о Китае не берём (в каталоге есть серии про Вьетнам, Таиланд, ОАЭ…)
FOREIGN = re.compile(r"vietnam|thai|dubai|\buae\b|emirat|europe|malaysia|indonesia|singapore|india|korea|japan|america|\busa\b|"
                     r"africa|brazil|mexic|turk|saudi|qatar|london|paris|german|italian|french|spain|spanish|kuala|lumpur|manila|philippin|"
                     r"hanoi|bangkok|jakarta|seoul|tokyo|kazakh|uzbek|vietnamese|moscow", re.I)
SFX = {
    "pop": "source-videos/2026-10-07-byt-tehnika/sfx/switch.wav",
    "whoosh": "source-videos/2026-10-07-byt-tehnika/sfx/whoosh.wav",
    "whip": "source-videos/2026-10-07-byt-tehnika/sfx/whip.wav",
}
SITE_HOME = "source-videos/2026-10-07-byt-tehnika/site/home-mobile-full.png"
SITE_CATALOG = "source-videos/2026-10-07-byt-tehnika/site/expeditions-top.png"


def load(p):
    return json.loads(pathlib.Path(p).read_text())


def norm(s):
    s = s.lower().replace("ё", "е")
    return re.sub(r"[^\w\s]", "", s.replace("-", "")).strip()


def clean(s):  # как clean() в TalkReelPro.tsx — для accentWords
    return re.sub(r"[^\w+]", "", s.lower()).replace("_", "")


def r2(x):
    return round(x, 2)


class Speech:
    """Слова речи с поиском фраз регуляркой."""

    def __init__(self, words):
        self.w = words
        self.n = [norm(x["text"]) for x in words]
        self.text, self.off = "", []
        for t in self.n:
            self.off.append(len(self.text))
            self.text += t + " "

    def idx_at(self, ch):
        lo = 0
        for i, o in enumerate(self.off):
            if o <= ch:
                lo = i
        return lo

    def find(self, rx, after=0.0, before=1e9):
        out = []
        for m in re.finditer(rx, self.text):
            a, b = self.idx_at(m.start()), self.idx_at(max(m.start(), m.end() - 2))
            if self.w[a]["start"] >= after and self.w[a]["start"] <= before:
                out.append((a, b, m))
        return out

    def anchor(self, a, b, rx):
        if rx:
            for i in range(a, b + 1):
                if re.fullmatch(rx, self.n[i]):
                    return i
        return a

    def sentences(self):
        out, s = [], 0
        for i, x in enumerate(self.w):
            if re.search(r"[.!?…]$", x["text"]) or i == len(self.w) - 1:
                out.append((s, i))
                s = i + 1
        return out

    def phrase(self, a, b):
        return " ".join(x["text"] for x in self.w[a : b + 1])


def overlaps(a, b, spans, pad=0.0):
    return any(a < e + pad and b > s - pad for s, e in spans)


def apply_fixes(words, fixes):
    out, i = [], 0
    keys = [(k.split(), v) for k, v in fixes.items()]
    while i < len(words):
        done = False
        for toks, val in keys:
            seg = [norm(x["text"]) for x in words[i : i + len(toks)]]
            if seg == toks:
                tail = re.search(r"[^\w]*$", words[i + len(toks) - 1]["text"]).group(0)
                parts = val.split()
                t0, t1 = words[i]["start"], words[i + len(toks) - 1]["end"]
                step = (t1 - t0) / len(parts)
                for k, part in enumerate(parts):  # «и Сбере» — два слова, чтобы бренд нашёлся
                    out.append({"text": part + (tail if k == len(parts) - 1 else ""), "start": round(t0 + k * step, 3),
                                "end": round(t0 + (k + 1) * step, 3)})
                i += len(toks)
                done = True
                break
        if not done:
            out.append(dict(words[i]))
            i += 1
    return out


def brand_mentions(words, brands):
    """Ищет бренды в речи; кириллические варианты латинских брендов заменяет в субтитрах на латиницу."""
    # сравниваем без пробелов: Whisper пишет «GAC Aion» то одним словом, то двумя
    variants = []
    for key, b in brands.items():
        for nm in b["names"]:
            variants.append((len(nm.replace(" ", "")), key, nm, norm(nm).replace(" ", "")))
    variants.sort(key=lambda v: -v[0])
    found, i = [], 0
    while i < len(words):
        hit = None
        for _, key, nm, flat in variants:
            for ln in (3, 2, 1):
                if "".join(norm(x["text"]).replace(" ", "") for x in words[i : i + ln]) == flat and i + ln <= len(words):
                    hit = (ln, key, nm)
                    break
            if hit:
                break
        if hit:
            ln, key, nm = hit
            canon = brands[key]["names"][0]
            if ln == 1 and re.search("[а-яА-Я]", nm) and not re.search("[а-яА-Я]", canon) and key != "sber":
                tail = re.search(r"[^\w]*$", words[i]["text"]).group(0)
                words[i]["text"] = canon + tail
            found.append({"key": key, "i": i, "j": i + ln - 1, "at": words[i]["start"], "end": words[i + ln - 1]["end"]})
            i += ln
        else:
            i += 1
    return found


def least_used(photos):
    cnt = {p: 0 for p in photos}
    for f in glob.glob(str(STUDIO / "props" / "*.json")):
        t = pathlib.Path(f).read_text()
        for p in photos:
            cnt[p] += t.count(p)
    return min(photos, key=lambda p: cnt[p])


def duration(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--theme", required=True)
    ap.add_argument("--clip", required=True)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--out", help="куда писать props (для проверки, по умолчанию props/<name>.json)")
    a = ap.parse_args()

    folder = ROOT / "source-videos" / a.name
    work = folder / "_work"
    props_path = pathlib.Path(a.out).resolve() if a.out else STUDIO / "props" / f"{a.name}.json"
    if props_path.exists() and not a.force:
        raise SystemExit(f"{props_path} уже есть (--force, чтобы пересобрать)")

    themes = load(LIB / "themes.json")
    if a.theme not in themes:
        raise SystemExit(f"Нет темы «{a.theme}». Есть: {', '.join(k for k in themes if not k.startswith('_'))}")
    th, outro_pool = themes[a.theme], themes["_outro"]
    brands = load(LIB / "brands.json")
    cities = load(LIB / "cities.json")
    ph = load(LIB / "phrases.json")
    music = load(LIB / "music.json")
    layout = load(work / f"{a.clip}.cut.layout.json")
    cutj = load(work / f"{a.clip}.cut.json")
    words = load(work / f"{a.clip}.cut.words.json")
    speech_sec = duration(work / f"{a.clip}.cut.mp4")

    words = apply_fixes(words, ph["fixes"])
    mentions = brand_mentions(words, brands)
    S = Speech(words)
    sents = S.sentences()
    W = S.w
    notes, warn = [], []  # для отчёта: (время, что, фраза)

    def note(t, what, i=None):
        ctx = S.phrase(max(0, i - 2), min(len(W) - 1, i + 3)) if i is not None else ""
        notes.append((t, what, ctx))

    def sentence_end(i):
        for s, e in sents:
            if s <= i <= e:
                return W[e]["end"]
        return W[i]["end"]

    # ---------- финал: сайт ----------
    site_hits = S.find(ph["site"]["re"])
    if site_hits:
        si = S.anchor(site_hits[-1][0], site_hits[-1][1], ph["site"]["at"])
        site_at = W[si]["start"]
        note(site_at, "финал: сайт", si)
    else:
        site_at = max(W[-1]["end"] - 6, 0)
        warn.append("Не нашёл «заходите на сайт» — финал поставлен за 6 с до конца речи, проверь.")
    bio_hits = S.find(r"меня зовут")
    bio_at = W[bio_hits[0][0]]["start"] if bio_hits else site_at * 0.5

    chips, numbers, checklists, logos_out, cities_out, broll = [], [], [], [], [], []

    # ---------- города ----------
    city_m = []
    for i, t in enumerate(S.n):
        for name, c in cities.items():
            if t in [norm(f) for f in c["forms"]]:
                city_m.append((i, name))
                if re.search("[A-Za-z]", W[i]["text"]):
                    W[i]["text"] = name + re.search(r"[^\w]*$", W[i]["text"]).group(0)
    runs, cur = [], []
    for i, name in city_m:
        if cur and W[i]["start"] - W[cur[-1][0]]["end"] > 1.2:
            runs.append(cur)
            cur = []
        cur.append((i, name))
    if cur:
        runs.append(cur)
    for run in runs:
        if len(run) < 2:
            continue
        for k, (i, name) in enumerate(run):
            until = W[run[k + 1][0]]["start"] if k + 1 < len(run) else W[i]["end"] + 0.8
            cities_out.append({"src": least_used(cities[name]["photos"]), "name": name, "at": r2(W[i]["start"]), "until": r2(until)})
        note(W[run[0][0]]["start"], "города: " + ", ".join(n for _, n in run), run[0][0])
    city_spans = [(c["at"] - 0.3, c["until"] + 0.3) for c in cities_out]

    # ---------- логотипы ----------
    flip_spans = []
    for a_, b_, _ in S.find(ph["flipBio"]["re"]):
        inside = [m for m in mentions if a_ <= m["i"] <= b_ + 1]
        if inside:
            items = [{"src": brands[m["key"]]["logo"], "at": r2(m["at"])} for m in inside[:2]]
            logos_out.append({"items": items, "until": r2(inside[-1]["end"] + 0.8), "flip": True})
            flip_spans.append((inside[0]["at"], inside[-1]["end"] + 0.8))
            note(inside[0]["at"], "логотипы-переворот: " + " → ".join(m["key"] for m in inside[:2]), inside[0]["i"])
    rest = [m for m in mentions if not overlaps(m["at"], m["end"], flip_spans)]
    shown = {}
    groups, cur = [], []
    for m in rest:
        if m["key"] in shown and m["at"] - shown[m["key"]] < 12:
            continue
        if cur and (m["at"] - cur[-1]["end"] > 1.5 or len(cur) == 4):
            groups.append(cur)
            cur = []
        if any(x["key"] == m["key"] for x in cur):
            continue
        cur.append(m)
        shown[m["key"]] = m["at"]
    if cur:
        groups.append(cur)
    for g in groups:
        logos_out.append({"items": [{"src": brands[m["key"]]["logo"], "at": r2(m["at"])} for m in g], "until": r2(g[-1]["end"] + 1.0)})
        note(g[0]["at"], "логотипы: " + ", ".join(m["key"] for m in g), g[0]["i"])
    logo_spans = [(min(i["at"] for i in g["items"]), g["until"]) for g in logos_out]

    # латинские слова без логотипа — возможно, бренд, которого нет в библиотеке
    known = {norm(n) for b in brands.values() for nm in b["names"] for n in nm.split()}
    known |= {norm(nm).replace(" ", "") for b in brands.values() for nm in b["names"]}
    unknown = sorted({x["text"].strip(".,!?:;«»\"") for x in W if re.search("[A-Za-z]", x["text"])
                      and norm(x["text"]) not in known and norm(x["text"]).replace(" ", "") not in known})
    unknown = [u for u in unknown if u.lower() not in {"global", "tech", "tour", "ai", "ev", "it"}]
    if unknown:
        warn.append("Латинские слова без логотипа (бренд? добавить в library/brands.json): " + ", ".join(unknown))

    # ---------- стандартные плашки ----------
    def add_chip(items, until, label, i):
        chips.append({"wrap": False, "items": items, "until": r2(until)})
        note(items[0]["at"], label, i)

    for r in ph["chips"]:
        for a_, b_, _ in S.find(r["re"]):
            i = S.anchor(a_, b_, r.get("at"))
            add_chip([{"text": r["text"], "at": r2(W[i]["start"])}], W[b_]["end"] + r.get("hold", 1.0), "плашка: " + r["text"], i)
            break
    for r in ph["strikes"]:
        for a_, b_, _ in S.find(r["re"]):
            items, last = [], 0
            for it in r["items"]:
                i = S.anchor(a_, b_, it["at"])
                k = S.anchor(i, b_, it["strike"])
                items.append({"text": it["text"], "at": r2(W[i]["start"]), "strike": r2(max(W[k]["end"], W[i]["start"] + 0.5))})
                last = max(last, items[-1]["strike"])
            add_chip(items, last + 0.6, "плашки с зачёркиванием: " + ", ".join(x["text"] for x in items), a_)
            break

    # ---------- цифры ----------
    nw = ph["numberWords"]
    m5 = S.find(ph["fiveDays"]["re"])
    if m5:
        a_, b_, m = m5[0]
        cnt_word = m.group(2)
        cnt = nw.get(cnt_word) or (int(cnt_word) if cnt_word.isdigit() else None)
        if cnt:
            ci = next(i for i in range(a_, b_ + 1) if S.n[i] == cnt_word)
            end_i = ci + 1
            while end_i < b_ and not re.search(r"[,.!?]$", W[end_i]["text"]):
                end_i += 1
            sub = " ".join(x["text"] for x in W[ci + 1 : end_i + 1]).rstrip(".,!?").strip()
            numbers.append({"text": str(cnt), "sub": f"{sub} за 5 дней", "at": r2(W[ci]["start"]), "until": r2(sentence_end(ci) + 0.3)})
            note(W[ci]["start"], f"цифра: {cnt} {sub} за 5 дней", ci)
    for r in ph["numbers"]:
        for a_, b_, _ in S.find(r["re"]):
            i = S.anchor(a_, b_, r.get("at"))
            numbers.append({"text": r["text"], "sub": r["sub"], "at": r2(W[i]["start"]), "until": r2(W[b_]["end"] + r.get("hold", 1.0))})
            note(W[i]["start"], f"цифра: {r['text']} {r['sub']}", i)
            break

    # ---------- чек-листы ----------
    for cl in ph["checklists"]:
        items, t0 = [], None
        for it in cl["items"]:
            hits = S.find(it["re"], after=(t0 or 0) - 0.1, before=(t0 + 14) if t0 else 1e9)
            if hits:
                a_, b_, _ = hits[0]
                i = S.anchor(a_, b_, it["at"])
                items.append({"text": it["text"], "at": r2(W[i]["start"]), "_end": W[b_]["end"]})
                t0 = t0 or W[i]["start"]
        if len(items) >= 2:
            until = max(x.pop("_end") for x in items) + 1.1
            for x in items:
                x.pop("_end", None)
            checklists.append({"title": cl["title"], "items": items, "until": r2(until)})
            note(items[0]["at"], f"чек-лист «{cl['title']}»: " + ", ".join(x["text"] for x in items))
    # «Для кого поездка» — перечисление перед «Заходите на сайт»
    if site_hits:
        si0 = site_hits[-1][0]
        prev = [(s, e) for s, e in sents if e < si0]
        if prev:
            s, e = prev[-1]
            txt = S.phrase(s, e)
            parts = [p.strip(" .") for p in re.split(r",\s*|\s+и\s+", txt) if p.strip(" .")]
            for k in range(len(parts) - 2, -1, -1):  # «и все, кто следит…» — одна позиция
                if len(parts[k].split()) == 1 and re.match(r"(кто|что|которые|кому)\b", parts[k + 1], re.I):
                    parts[k:k + 2] = [parts[k] + ", " + parts[k + 1]]
            if 2 <= len(parts) <= 5 and all(len(p.split()) <= 7 for p in parts) and (e - s) <= 16:
                items, k = [], s
                for p in parts:
                    first = norm(p.split()[0])
                    while k <= e and S.n[k] != first:
                        k += 1
                    if k > e:
                        break
                    items.append({"text": p[0].upper() + p[1:], "at": r2(W[k]["start"])})
                if len(items) >= 2:
                    checklists.append({"title": th.get("audienceTitle", "Для кого поездка"), "items": items, "until": r2(W[e]["end"] + 0.6)})
                    note(items[0]["at"], "чек-лист «Для кого поездка»: " + ", ".join(x["text"] for x in items), s)
    list_spans = [(c["items"][0]["at"] - 0.3, c["until"] + 0.3) for c in checklists]

    # ---------- график темы ----------
    stock = None
    if th.get("stockDrop"):
        sd = th["stockDrop"]
        hits = S.find(sd["re"])
        if hits:
            i = hits[0][0]
            at = W[i]["start"]
            stock = {"at": r2(at), "until": r2(at + sd.get("seconds", 5)), "label": sd["label"], "direction": sd.get("direction", "down")}
            note(at, f"график {'вверх' if stock['direction'] == 'up' else 'вниз'}: {sd['label']}", i)

    # ---------- конфликты: плашка и цифра не вместе, цифра не под логотипами ----------
    def trim(el_list, spans, label):
        keep = []
        for el in el_list:
            at = el["items"][0]["at"] if "items" in el else el["at"]
            if overlaps(at, el["until"], spans):
                clash = [s for s in spans if at < s[1] and el["until"] > s[0]]
                new_until = min(s[0] for s in clash) - 0.05
                if new_until - at >= 0.6:
                    el["until"] = r2(new_until)
                else:
                    warn.append(f"{label} в {at:.1f} с убрана: пересекается с другим элементом")
                    continue
            keep.append(el)
        return keep

    # чек-лист заканчивается до следующей плашки или цифры
    for cl in checklists:
        nxt = [c["items"][0]["at"] for c in chips] + [n["at"] for n in numbers]
        nxt = [t for t in nxt if t > cl["items"][-1]["at"]]
        if nxt and min(nxt) - 0.05 < cl["until"]:
            cl["until"] = r2(max(cl["items"][-1]["at"] + 0.6, min(nxt) - 0.05))
    list_spans = [(c["items"][0]["at"] - 0.3, c["until"] + 0.3) for c in checklists]
    numbers = trim(numbers, logo_spans + city_spans + list_spans, "Цифра")
    # плашка, попавшая на цифру, ждёт, пока цифра уйдёт (как в ручных роликах: «10+» → «Свободный китайский»)
    for c in chips:
        for n in numbers:
            at = c["items"][0]["at"]
            if at < n["until"] and c["until"] > n["at"]:
                if n["at"] < at:
                    n["until"] = r2(max(n["at"] + 0.6, min(n["until"], at - 0.05)))
                if at < n["until"]:
                    shift = n["until"] + 0.05 - at
                    for it in c["items"]:
                        it["at"] = r2(it["at"] + shift)
                        if "strike" in it:
                            it["strike"] = r2(max(it["strike"], it["at"] + 0.4))
                    c["until"] = r2(max(c["until"], c["items"][-1].get("strike", c["items"][-1]["at"]) + 0.6))
    num_spans = [(n["at"], n["until"]) for n in numbers]
    chips = trim(chips, [(c["items"][0]["at"], c["until"]) for c in checklists] + city_spans, "Плашка")
    chip_spans = [(c["items"][0]["at"], c["until"]) for c in chips]

    # ---------- перебивки (Higgsfield, без повторов) ----------
    cat = load(HF / "каталог.json")
    reg_path = HF / "использовано.json"
    reg = load(reg_path)
    for k in [k for k, v in reg.items() if v.get("videos") == [a.name]]:  # пересборка: освобождаем свои
        del reg[k]
    used_ids = {v["id"] for v in reg.values()}
    blocked = {int(k) for k in load(LIB / "blocked-images.json") if k.isdigit()}
    busy = city_spans + list_spans + ([(stock["at"] - 0.3, stock["until"] + 0.3)] if stock else []) + [(site_at - 1.0, 1e9)]
    slots = []
    for s, e in sents:
        # длинные предложения делим по запятым
        chunks, cs = [], s
        for i in range(s, e + 1):
            if i == e or (W[i]["text"].endswith(",") and W[i]["end"] - W[cs]["start"] >= 2.0):
                chunks.append((cs, i))
                cs = i + 1
        for cs, ce in chunks:
            t0, t1 = W[cs]["start"], W[ce]["end"]
            if t1 - t0 < 1.6:
                continue
            slots.append((cs, ce, t0, min(t1, t0 + 4.5)))
    last_start, last_end = -99, -99
    picked, tcycle = [], 0

    def head(prompt):
        return " ".join(re.sub(r"[^a-z ]", "", prompt.lower()).split()[:7])

    def pick(text, pools):
        """Лучшая неиспользованная картинка: совпадение слов фразы (tags) важнее темы; роботы и переговорные —
        только если о них речь; однотипные подряд не берём. Возвращает (номер, баллы, сколько слов совпало)."""
        best, best_sc, best_hits = None, -99, 0
        heads = {head(cat[i]["prompt"]) for i in picked}
        for pool in pools:
            inc = re.compile(pool["include"], re.I)
            for idx, c in enumerate(cat):
                pr = c["prompt"]
                if c["id"] in used_ids or idx in picked or idx in blocked or not inc.search(pr) or FOREIGN.search(pr):
                    continue
                hits = sum(1 for ru, en in pool["tags"].items() if re.search(ru, text) and re.search(en, pr, re.I))
                sc = 2 * hits + 0.25 * len({m.group(0).lower() for m in inc.finditer(pr)})
                sc += 0.3 if c.get("aspect") in ("3:4", "4:5", "9:16", "2:3") else 0
                if re.search(r"\btext\b|sign|logo|brand", pr, re.I) and not re.search(r"no (visible )?(text|logos?)", pr, re.I):
                    sc -= 0.4
                if re.search(r"robot|humanoid", pr, re.I) and not re.search(r"робот", text):
                    sc -= 1.5
                if re.search(r"meeting|negotiat|delegation|conference", pr, re.I) and not re.search(
                        r"переговор|встреч|визит|делегац|знаком|компани|партнер|работал|согласован", text):
                    sc -= 1.0
                if head(pr) in heads:
                    sc -= 1.5
                if sc > best_sc:
                    best, best_sc, best_hits = idx, sc, hits
            if best is not None and best_hits >= 1:
                return best, best_sc, best_hits
        return best, best_sc, best_hits

    for cs, ce, t0, t1 in slots:
        if t0 - last_start < 7 or t0 - last_end < 4 or overlaps(t0, t1, busy):
            continue
        text = norm(S.phrase(cs, ce))
        pools = [outro_pool, th["broll"]] if t0 >= bio_at else [th["broll"], outro_pool]
        idx, sc, hits = pick(text, pools)
        if idx is None:
            warn.append(f"Перебивка в {t0:.1f} с: в каталоге Higgsfield не осталось подходящих картинок")
            continue
        picked.append(idx)
        dst = folder / "broll" / f"hf-{idx}.png"
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists():
            req = urllib.request.Request(cat[idx]["urls"][0], headers={"User-Agent": "Mozilla/5.0"})
            dst.write_bytes(urllib.request.urlopen(req, timeout=120).read())
        tr = TRANSITIONS[tcycle % len(TRANSITIONS)]
        tcycle += 1
        broll.append({"src": str(dst.relative_to(ROOT)), "at": r2(t0), "until": r2(t1), "transition": tr})
        reg[str(idx)] = {"id": cat[idx]["id"], "prompt": cat[idx]["prompt"], "videos": [a.name]}
        notes.append((t0, f"перебивка #{idx} ({'по смыслу' if hits else 'из пула темы, проверить'}): {cat[idx]['prompt'][:90]}", S.phrase(cs, ce)))
        last_start, last_end = t0, t1
    reg_path.write_text(json.dumps(reg, ensure_ascii=False, indent=1))
    if len(broll) < speech_sec / 14:
        warn.append(f"Перебивок мало ({len(broll)}): в каталоге не хватает картинок по теме — можно сгенерировать в Higgsfield (с согласия, после цены).")

    # ---------- зумы ----------
    deep = layout.get("eyeLineShare", 0.45) > 0.45
    no_zoom = city_spans + list_spans + [(site_at - 0.5, 1e9)]
    zooms = []
    punch_t = sorted([n["at"] for n in numbers] + [c["items"][0]["at"] for c in chips if any("strike" in x for x in c["items"])]
                     + [c["items"][0]["at"] for c in chips if "пускают" in c["items"][0]["text"]])
    for t in punch_t:
        if not overlaps(t, t + 0.8, no_zoom) and all(abs(t - z["at"]) >= 4 for z in zooms):
            zooms.append({"at": r2(t), "kind": "punch", "amount": 0.18 if deep else 0.16, "hold": 0.6})
    for s, e in sents:
        t = W[s]["start"]
        if t < 3 or overlaps(t, t + 1.6, no_zoom) or any(abs(t - z["at"]) < 5 for z in zooms):
            continue
        zooms.append({"at": r2(t), "kind": "push", "amount": 0.06, "hold": 1.6})
    zooms.sort(key=lambda z: z["at"])

    # ---------- маршрут на сайте ----------
    route = []
    if th.get("route"):
        route = sorted(glob.glob(str(ROOT / th["route"])), key=lambda p: int(re.search(r"day(\d+)", p).group(1)))
    if not route:
        cache = ROOT / "source-videos" / "сайт" / "маршруты" / th["expedition"].strip("/").split("/")[-1]
        route = sorted(glob.glob(str(cache / "*-day*.png")), key=lambda p: int(re.search(r"day(\d+)", p).group(1)))
        if not route and th["expedition"].count("/") >= 2 and not th.get("brand"):
            subprocess.run(["node", str(STUDIO / "scripts" / "site_route.mjs"), th["expedition"], str(cache), "day"], check=False)
            route = sorted(glob.glob(str(cache / "*-day*.png")), key=lambda p: int(re.search(r"day(\d+)", p).group(1)))
    route = [str(pathlib.Path(p).relative_to(ROOT)) for p in route]
    if not route and not th.get("brand"):
        warn.append("Нет скриншотов маршрута — в финале будут только главная и каталог.")

    # ---------- акцентные слова ----------
    acc = set(th.get("accent", []))
    for m in mentions:
        for i in range(m["i"], m["j"] + 1):
            acc.add(clean(W[i]["text"]))
    for i, t in enumerate(S.n):
        if any(t in [norm(f) for f in c["forms"]] for c in cities.values()) or re.fullmatch(r"\d+", t) or t in nw:
            acc.add(clean(W[i]["text"]))
    acc |= {"лично", "сайт", "прозрачные", "никаких"}

    props = {
        "mediaSrc": str((work / f"{a.clip}.cut.mp4").relative_to(ROOT)),
        "cutoutSrc": str((work / f"{a.clip}.cut.alpha.webm").relative_to(ROOT)),
        "words": W,
        "accentWords": sorted(x for x in acc if x),
        "cuts": [r2(c["out_start"]) for c in cutj[1:]],
        "chips": sorted(chips, key=lambda c: c["items"][0]["at"]),
        "logos": sorted(logos_out, key=lambda g: g["items"][0]["at"]),
        "numbers": sorted(numbers, key=lambda n: n["at"]),
        "broll": broll,
        "cities": cities_out,
        "checklists": sorted(checklists, key=lambda c: c["items"][0]["at"]),
        "zooms": zooms,
        "sfx": SFX,
        "music": {k: v for k, v in music[th["music"]].items()},
        "speechSeconds": round(speech_sec, 3),
        "site": {"at": r2(site_at), "home": SITE_HOME, "catalog": SITE_CATALOG, "route": route},
        "cta": "Экспедиции",
        "ctaSeconds": 3,
        "showSafeZone": False,
        "format": "reels",
        "focus": {"x": layout["eyeX"], "y": layout["eyeY"]},
    }
    if stock:
        props["stockDrop"] = stock
    if th.get("brand"):  # другой бренд (aura — Aura Robotics): свой стиль, логотип, маскот и сайт в финале
        props["brand"] = th["brand"]
    if th.get("site"):
        props["site"].update(th["site"])
    if th.get("cta"):
        props["cta"] = th["cta"]
    props_path.write_text(json.dumps(props, ensure_ascii=False, indent=1))

    # ---------- вырезка спикера и Stories ----------
    ranges = [(b["at"] - 0.6, b["until"] + 0.6) for b in broll] + ([(stock["at"] - 0.6, stock["until"] + 0.6)] if stock else [])
    ranges.sort()
    merged = []
    for s, e in ranges:
        if merged and s <= merged[-1][1] + 0.5:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([max(0, s), e])
    matte = ",".join(f"{s:.1f}-{e:.1f}" for s, e in merged)
    total = speech_sec + 3
    ends = [W[e]["end"] for s, e in sents]
    cuts_st, prev = [], 0.0
    while total - prev > 59.5:
        cand = [t for t in ends if prev + 20 < t <= prev + 59.5]
        if not cand:
            break
        t = cand[-1] + 0.15
        cuts_st.append(round(t, 2))
        prev = t
    rep = {"name": a.name, "theme": a.theme, "clip": a.clip, "matteRanges": matte, "storiesAt": cuts_st, "warnings": warn,
           "brollCount": len(broll), "seconds": round(total, 1)}
    (work / f"{a.clip}.auto.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1))

    md = [f"# Черновик {a.name} (тема «{th['title']}»)", "",
          f"Длина ~{total:.0f} с · перебивок {len(broll)} · логотипов {sum(len(g['items']) for g in logos_out)} · "
          f"цифр {len(numbers)} · плашек {len(chips)} · чек-листов {len(checklists)} · городов {len(cities_out)} · зумов {len(zooms)}",
          f"Stories режем: {', '.join(map(str, cuts_st)) or 'одна часть'} · вырезка спикера: {matte or '—'}", ""]
    if warn:
        md += ["## Проверить", *[f"- {w}" for w in warn], ""]
    md += ["## По времени", *[f"- **{t:6.1f}** {what}  \n  _{ctx}_" for t, what, ctx in sorted(notes, key=lambda x: x[0])]]
    (work / f"{a.clip}.auto.md").write_text("\n".join(md))

    # ---------- лист картинок и логотипов ----------
    try:
        from PIL import Image, ImageDraw
        tiles = [(b["src"], f"{b['at']:.0f} с · #{pathlib.Path(b['src']).stem[3:]}") for b in broll] + [(c["src"], c["name"]) for c in cities_out]
        logo_srcs = list(dict.fromkeys(i["src"] for g in logos_out for i in g["items"]))
        tiles += [(s, pathlib.Path(s).stem) for s in logo_srcs if not s.endswith(".svg")]
        svgs = [s for s in logo_srcs if s.endswith(".svg")]
        for s in svgs:
            png = work / "svg" / (pathlib.Path(s).stem + ".png")
            png.parent.mkdir(exist_ok=True)
            if not png.exists():
                try:
                    import cairosvg
                    cairosvg.svg2png(url=str(ROOT / s), write_to=str(png), output_width=400)
                except Exception:
                    pass
            if png.exists():
                tiles.append((str(png.relative_to(ROOT)), pathlib.Path(s).stem))
        cols, tw, thh = 6, 300, 400
        rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, max(1, rows) * (thh + 40)), "white")
        d = ImageDraw.Draw(sheet)
        try:
            from PIL import ImageFont
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
        except Exception:
            font = None
        for k, (src, label) in enumerate(tiles):
            im = Image.open(ROOT / src).convert("RGBA")
            im.thumbnail((tw - 10, thh - 10))
            bg = Image.new("RGB", im.size, "white")
            bg.paste(im, mask=im.split()[3])
            x, y = (k % cols) * tw, (k // cols) * (thh + 40)
            sheet.paste(bg, (x + (tw - im.width) // 2, y + (thh - im.height) // 2))
            d.text((x + 8, y + thh + 6), label[:28], fill="black", font=font)
        sheet.save(work / f"{a.clip}.sheet.jpg", quality=85)
    except Exception as e:  # лист — вспомогательный
        warn.append(f"Лист картинок не собран: {e}")

    print("\n".join(md[:4]))
    for w in warn:
        print("! " + w)
    print(f"→ {props_path}")


if __name__ == "__main__":
    main()
