#!/usr/bin/env python3
"""Страница «Сетка 多 NEWS» — план выпусков по очереди (props/blog-news/очередь.json) с обложками и анонсами статей сайта.

python3 reels-studio/tools/blog-news/plan_page.py <out.html> [--blog /home/user/ostapdotcenko]
Обложки статей — public/img/<slug>-cover.jpg|jpeg сайта (уменьшаются и встраиваются в страницу), анонсы — excerpt из src/i18n/ru.ts.
"""
import argparse, base64, html, io, json, re, subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
MUSIC = json.loads((ROOT / "reels-studio/library/music.json").read_text())
Q = ROOT / "reels-studio/props/blog-news/очередь.json"
DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]
MON = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"]


def git(blog, *a, text=True):
    return subprocess.run(["git", "-C", str(blog), *a], capture_output=True, text=text, check=False).stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--blog", default="/home/user/ostapdotcenko")
    a = ap.parse_args()
    blog = Path(a.blog)
    q = json.loads(Q.read_text())
    src = git(blog, "show", "origin/main:src/i18n/ru.ts")
    blk = src[src.find("articles: ["):]
    ex = {s: e for s, e in re.findall(r'slug:\s*"([^"]+)",[^}]*?excerpt:\s*"((?:[^"\\]|\\.)*)"', blk, flags=re.S)}
    imgs = set(git(blog, "ls-tree", "--name-only", "origin/main", "public/img/").split())

    def thumb(slug):
        for ext in ("jpg", "jpeg", "png", "webp"):
            p = f"public/img/{slug}-cover.{ext}"
            if p in imgs:
                raw = git(blog, "show", f"origin/main:{p}", text=False)
                im = Image.open(io.BytesIO(raw)).convert("RGB")
                im.thumbnail((420, 420))
                b = io.BytesIO(); im.save(b, "JPEG", quality=72)
                return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()
        return ""

    def when(d):
        import datetime as dt
        x = dt.date.fromisoformat(d)
        return f"{x.day} {MON[x.month - 1]}", DAYS[x.weekday()]

    E = html.escape
    rows, cur, prev = [], None, None
    for e in q["episodes"]:
        if (e["season"], e.get("part")) != cur:
            if cur is not None:
                # 07.11.2026: сезон можно прервать другим («пауза в сезоне») и вернуть позже («возвращается сезон»)
                nx = (prev or {}).get("next") or {}
                left = f'Сезон «{E(cur[0])}» на паузе' if nx.get("pause") else f'Сезон «{E(cur[0])}» окончен'
                right = f'завтра — возвращается сезон «{E(e["season"])}»' if nx.get("resume") else f'завтра — новый сезон «{E(e["season"])}»'
                rows.append(f'<div class="handoff"><span>{left}</span><span class="arrow">→</span><span>{right}</span></div>')
            cur = (e["season"], e.get("part"))
            rows.append(f'<h2 class="season"><span class="zh">{E(e["zh"])}</span><span class="sname">Сезон «{E(e["season"])}»{" · часть " + str(e["part"]) if e.get("part") else (" · продолжение" if e["sn"] > 1 else "")}</span><span class="count">{e["stotal"]} {"выпуск" if e["stotal"] == 1 else "выпуска" if e["stotal"] < 5 else "выпусков"}</span></h2>')
        prev = e
        d, wd = when(e["day"])
        t = thumb(e["slug"])
        ready = e.get("status") in ("готов", "вышел")  # готовые выпуски: о ком и какая музыка — из props выпуска
        pr = next(iter((ROOT / "reels-studio/props/blog-news").glob(f'*-{e["slug"]}.json')), None)
        pj = json.loads(pr.read_text()) if pr else {}
        mus = next((m for m in MUSIC.values() if isinstance(m, dict) and m.get("title") and m.get("src") == pj.get("music", {}).get("src")), {})
        tag = " · ".join(x for x in [e.get("status", ""), pj.get("brand", {}).get("name", ""), f'музыка: {mus["title"]}' if mus.get("title") else ""] if x)
        pilot = ready
        excerpt = json.loads('"' + ex.get(e["slug"], "") + '"') if ex.get(e["slug"]) else ""
        rows.append(
            f'<article class="ep{" pilot" if pilot else ""}">'
            f'<div class="num"><b>№{e["n"]}</b><span>第{e["n"]}话</span></div>'
            f'<div class="when"><b>{d}</b><span>{wd} · {e["sn"]}/{e["stotal"]}</span></div>'
            + (f'<img class="cov" src="{t}" alt="">' if t else '<div class="cov none">多</div>')
            + f'<div class="txt"><h3>{E(e["title"])}</h3><p>{E(excerpt)}</p>'
            + (f'<span class="tag">{E(tag)}</span>' if ready else "")
            + "</div></article>"
        )
    aura = "".join(f'<li><span>{E(x["date"][8:10])}.{E(x["date"][5:7])}</span>{E(x["title"])}</li>' for x in q.get("aura", []))
    last = q["episodes"][-1]
    dl, _ = when(last["day"])
    df, _ = when(q["episodes"][0]["day"])
    page = TEMPLATE.replace("{{ROWS}}", "\n".join(rows)).replace("{{AURA}}", aura).replace("{{N}}", str(len(q["episodes"]))) \
        .replace("{{FROM}}", df).replace("{{TO}}", dl).replace("{{SEASONS}}", str(len(q["seasons"]))).replace("{{NA}}", str(len(q.get("aura", []))))
    Path(a.out).write_text(page)
    print(a.out, len(page) // 1024, "КБ")


TEMPLATE = """<title>Сетка 多 NEWS</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=Golos+Text:wght@400;600;800&family=JetBrains+Mono:wght@500;700&family=ZCOOL+QingKe+HuangYou&display=swap">
<style>
/* Сетка выпусков как страница манхуа-журнала: жёлтая шапка с печатью 多, выпуски — карточки-кадры с обложкой статьи,
   между сезонами — плашка «сезон окончен → завтра новый». Цвета личного стиля: жёлтый · чернила · красный · бумага. */
:root {
  --paper: #F7F4EC; --ink: #191922; --muted: #5B5A63; --yellow: #FFD92E; --red: #E8341C; --line: #191922;
  --card: #FFFFFF; --soft: #EFEBDF;
  --display: "Unbounded", "Arial Black", sans-serif; --body: "Golos Text", "Segoe UI", sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace; --zh: "ZCOOL QingKe HuangYou", "PingFang SC", sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper: #15151B; --ink: #F3EFE4; --muted: #A9A6B2; --line: #3A3943; --card: #1F1F27; --soft: #24242C; color-scheme: dark } }
:root[data-theme="dark"] { --paper: #15151B; --ink: #F3EFE4; --muted: #A9A6B2; --line: #3A3943; --card: #1F1F27; --soft: #24242C; color-scheme: dark }
body { background: var(--paper); color: var(--ink); font-family: var(--body); font-size: 16px; line-height: 1.5; }
.wrap { max-width: 980px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 56px; }
header { background: #FFD92E; color: #191922; border-bottom: 6px solid #191922; }
header .wrap { padding-block: 28px 30px; display: grid; grid-template-columns: auto 1fr; gap: 22px; align-items: center; }
.seal { width: 92px; height: 92px; background: #C8102E; color: #fff; border-radius: 14px; display: grid; place-items: center; font-family: var(--zh); font-size: 64px; box-shadow: 0 0 0 5px #fff, 8px 8px 0 5px #191922; rotate: -5deg; }
h1 { font-family: var(--display); font-weight: 900; font-size: clamp(30px, 6vw, 52px); line-height: 1; margin: 0; letter-spacing: -0.01em; text-wrap: balance; }
.lead { margin: 10px 0 0; font-size: 17px; max-width: 62ch; }
.facts { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.facts span { font-family: var(--mono); font-size: 13px; font-weight: 700; background: #191922; color: #FFD92E; padding: 6px 10px; }
.rule { margin: 28px 0 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.rule div { border: 3px solid var(--line); background: var(--card); padding: 12px 14px; box-shadow: 5px 5px 0 var(--red); }
.rule b { display: block; font-family: var(--display); font-size: 14px; margin-bottom: 4px; }
.rule p { margin: 0; font-size: 14px; color: var(--muted); }
h2.season { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin: 40px 0 14px; font-family: var(--display); font-size: 24px; text-wrap: balance; }
h2 .zh { font-family: var(--zh); font-size: 44px; color: var(--red); line-height: 1; }
h2 .count { font-family: var(--mono); font-size: 13px; color: var(--muted); font-weight: 500; }
.ep { display: grid; grid-template-columns: 78px 96px 150px 1fr; gap: 16px; align-items: start; background: var(--card); border: 3px solid var(--line); padding: 14px; margin-bottom: 12px; box-shadow: 6px 6px 0 var(--line); }
.ep.pilot { border-color: var(--red); box-shadow: 6px 6px 0 var(--red); }
.num b { display: block; font-family: var(--display); font-size: 26px; line-height: 1; }
.num span { font-family: var(--zh); font-size: 20px; color: var(--red); }
.when b { display: block; font-family: var(--mono); font-size: 14px; font-variant-numeric: tabular-nums; }
.when span { font-family: var(--mono); font-size: 12px; color: var(--muted); }
.cov { width: 150px; aspect-ratio: 16 / 10; object-fit: cover; border: 2px solid var(--line); max-width: 100%; display: block; }
.cov.none { display: grid; place-items: center; background: var(--soft); font-family: var(--zh); font-size: 40px; color: var(--muted); }
.txt { min-width: 0; }
.txt h3 { margin: 0 0 4px; font-family: var(--body); font-weight: 800; font-size: 18px; line-height: 1.25; text-wrap: balance; }
.txt p { margin: 0; color: var(--muted); font-size: 14px; }
.tag { display: inline-block; margin-top: 8px; background: var(--red); color: #fff; font-family: var(--mono); font-size: 12px; font-weight: 700; padding: 4px 8px; }
.handoff { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 18px 0 0; padding: 10px 14px; background: #191922; color: #FFD92E; font-family: var(--mono); font-size: 13px; font-weight: 700; rotate: -0.6deg; }
.handoff .arrow { color: #fff; }
.aura { margin-top: 44px; border: 3px dashed var(--line); padding: 18px; background: var(--soft); }
.aura h2 { margin: 0 0 6px; font-family: var(--display); font-size: 20px; }
.aura p { margin: 0 0 12px; color: var(--muted); font-size: 14px; }
.aura ul { margin: 0; padding: 0; list-style: none; columns: 2 280px; column-gap: 24px; }
.aura li { break-inside: avoid; padding: 4px 0; font-size: 14px; border-bottom: 1px solid var(--line); }
.aura li span { font-family: var(--mono); color: var(--red); margin-right: 8px; font-variant-numeric: tabular-nums; }
@media (max-width: 640px) {
  .ep { grid-template-columns: 64px 1fr; }
  .ep .cov { grid-column: 1 / -1; width: 100%; }
  .ep .txt { grid-column: 1 / -1; }
  header .wrap { grid-template-columns: 1fr; }
}
</style>
<header><div class="wrap">
  <div class="seal">多</div>
  <div>
    <h1>多 NEWS — сетка выпусков</h1>
    <p class="lead">Манхуа-новости по статьям блога ostapdotcenko.ru: один выпуск в день, до 45 секунд. Ниши идут сезонами, нумерация сквозная. Финал каждого выпуска анонсирует следующий.</p>
    <div class="facts"><span>{{N}} выпусков</span><span>{{SEASONS}} сезонов</span><span>{{FROM}} → {{TO}}</span><span>роботы отдельно: {{NA}}</span></div>
  </div>
</div></header>
<main class="wrap">
  <section class="rule">
    <div><b>Выпуск</b><p>Хук из статьи → заставка 多 NEWS → 4 акта с цифрами и бегущей строкой → цитата автора → статья в телефоне.</p></div>
    <div><b>Картинки</b><p>3–4 манхуа-картинки Higgsfield на выпуск, обложка и экраны статьи с сайта, ваши фото.</p></div>
    <div><b>Сквозная очередь</b><p>Новые статьи блога дописываются в свой сезон сами; закончился сезон — завтра стартует следующий.</p></div>
  </section>
{{ROWS}}
  <section class="aura">
    <h2>Роботы — отдельная дорожка</h2>
    <p>Под роботов заточен aura-robotics.ru, поэтому эти статьи в сквозную нумерацию не входят. Их можно выпустить в стиле Aura для её аккаунта или поставить последним сезоном здесь.</p>
    <ul>{{AURA}}</ul>
  </section>
</main>
"""

if __name__ == "__main__":
    main()
