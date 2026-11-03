"""Сборка презентации SibDoc (16:9, 1920×1080) — тот же порядок, что у личных документов ostapdotcenko.

  python3 презентации/sibdoc/build.py 2026-11-03-sibdoc
  → презентации/готовые/2026-11-03-sibdoc.pdf, превью презентации/готовые/превью/2026-11-03-sibdoc/01.png … и лист …/<имя>.jpg

Папка презентации: index.html (слайды <section class="slide">), fonts/ (Inter — OFL), img/ (экраны демо-набора SibDoc).
Китайский Noto Sans SC скачивается с Google Fonts только под знаки из текста (fonts/noto-sans-sc.css + подмножества).
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

text = re.sub(r"<!--.*?-->", "", html, flags=re.S)
chars = "".join(sorted({c for c in text if 0x2E80 <= ord(c) <= 0x9FFF or 0xFF00 <= ord(c) <= 0xFFEF}))
css = []
for w in (400, 700, 800):
    url = "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@%d&text=%s" % (w, urllib.parse.quote(chars))
    c = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read().decode()
    src = re.search(r"url\((https://[^)]+)\)", c).group(1)
    data = urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": UA}), timeout=60).read()
    fn = f"NotoSansSC-{w}-subset.woff2"
    (doc / "fonts" / fn).write_bytes(data)
    css.append(f'@font-face {{ font-family: "NSC"; src: url("{fn}") format("woff2"); font-weight: {w}; }}')
(doc / "fonts" / "noto-sans-sc.css").write_text("/* Noto Sans SC (OFL), подмножество знаков презентации — собирает build.py */\n" + "\n".join(css) + "\n")
print(f"Noto Sans SC: {len(chars)} знаков")

prev = OUT / "превью" / name
prev.mkdir(parents=True, exist_ok=True)
for old in prev.glob("[0-9]*.png"):
    old.unlink()
pdf = OUT / f"{name}.pdf"
subprocess.run(["node", str(HERE / "render.mjs"), str(doc / "index.html"), str(pdf), str(prev)], check=True)
pngs = sorted(prev.glob("[0-9]*.png"))
ims = [Image.open(p).convert("RGB").resize((640, 360), Image.LANCZOS) for p in pngs]
cols = 4
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 640 + (cols + 1) * 24, rows * 360 + (rows + 1) * 24), "#9AA6BC")
for i, im in enumerate(ims):
    sheet.paste(im, (24 + (i % cols) * 664, 24 + (i // cols) * 384))
sheet.save(OUT / "превью" / f"{name}.jpg", quality=88)
print(f"PDF {pdf.relative_to(HERE.parent.parent)}, слайдов {len(pngs)}, лист презентации/готовые/превью/{name}.jpg")
