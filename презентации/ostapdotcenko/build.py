"""Сборка личных документов в стиле ostapdotcenko (брендбук — POST-HUB OSTAPDOTCENKO/BRAND/BRAND.md).

  python3 презентации/ostapdotcenko/build.py 2026-10-12-intro-zh
  → презентации/готовые/2026-10-12-ostap-intro-zh.pdf (A4, страницы <section class="page">)
    и превью презентации/готовые/превью/2026-10-12-ostap-intro-zh/01.png … + лист _лист.jpg

Папка документа: index.html, fonts/ (Unbounded, Golos Text, JetBrains Mono — OFL, из брендбука), img/.
Китайский шрифт Noto Sans SC скачивается с Google Fonts только под знаки из текста (параметр text=) — файлы маленькие,
кладутся в fonts/ вместе с fonts/noto-sans-sc.css; после правки текста просто пересоберите.
"""
import pathlib
import re
import subprocess
import sys
import urllib.parse
import urllib.request

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "готовые"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

name = sys.argv[1].rstrip("/")
doc = HERE / name
html = (doc / "index.html").read_text(encoding="utf-8")
out_name = re.sub(r"^(\d{4}-\d{2}-\d{2})-", r"\1-ostap-", name)

# 1. китайский шрифт: только нужные знаки (CJK, полноширинная пунктуация, кавычки, стрелки)
text = re.sub(r"<!--.*?-->", "", html, flags=re.S)
chars = sorted({c for c in text if ord(c) > 0x2000})
chars_s = "".join(chars) + "０１２３４５６７８９"
css_lines = []
for w in (400, 700, 900):
    url = "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@%d&text=%s" % (w, urllib.parse.quote(chars_s))
    css = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read().decode()
    src = re.search(r"url\((https://[^)]+)\)", css).group(1)
    data = urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": UA}), timeout=60).read()
    fn = f"NotoSansSC-{w}-subset.woff2"
    (doc / "fonts" / fn).write_bytes(data)
    css_lines.append(f'@font-face {{ font-family: "NSC"; src: url("{fn}") format("woff2"); font-weight: {w}; }}')
(doc / "fonts" / "noto-sans-sc.css").write_text("/* Noto Sans SC (OFL), подмножество знаков документа — собирает build.py */\n" + "\n".join(css_lines) + "\n")
print(f"Noto Sans SC: {len(chars)} знаков, 3 начертания")

# 2. PDF и PNG — Chromium (Playwright)
prev = OUT / "превью" / out_name
prev.mkdir(parents=True, exist_ok=True)
pdf = OUT / f"{out_name}.pdf"
subprocess.run(["node", str(HERE / "render.mjs"), str(doc / "index.html"), str(pdf), str(prev)], check=True)
pngs = sorted(prev.glob("[0-9]*.png"))
ims = [Image.open(p).convert("RGB") for p in pngs]
h = 1400
row = [im.resize((int(im.width * h / im.height), h), Image.LANCZOS) for im in ims]
sheet = Image.new("RGB", (sum(r.width for r in row) + 40 * (len(row) + 1), h + 80), "#B9B6AD")
x = 40
for r in row:
    sheet.paste(r, (x, 40))
    x += r.width + 40
sheet.save(OUT / "превью" / f"{out_name}.jpg", quality=88)
print(f"PDF {pdf.relative_to(HERE.parent.parent)}, страниц {len(pngs)}, лист {(OUT / 'превью' / (out_name + '.jpg')).relative_to(HERE.parent.parent)}")
