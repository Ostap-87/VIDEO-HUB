"""Extra CJK display fonts (Google Fonts, OFL) subset to the characters of a page.

python3 cjkfonts.py <doc folder> "LongCang=Long Cang:400" "ZQK=ZCOOL QingKe HuangYou:400" ...
-> <doc>/fonts/<Alias>-subset.woff2 + <doc>/fonts/cjk-extra.css (font-family = Alias)
"""
import pathlib
import re
import sys
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
doc = pathlib.Path(sys.argv[1])
html = (doc / "index.html").read_text(encoding="utf-8")
text = re.sub(r"<!--.*?-->", "", html, flags=re.S)
lines = []
for spec in sys.argv[2:]:
    sel = None
    if "@" in spec:  # Alias=Family:weight@cls1,cls2 -> only text of elements with these classes
        spec, sel = spec.split("@", 1)
    if sel:
        src_text = "".join(m.group(1) for c in sel.split(",") for m in re.finditer(r'class="[^"]*\b%s\b[^"]*"[^>]*>([^<]*)' % re.escape(c), text))
    else:
        src_text = text
    chars = "".join(sorted({c for c in src_text if ord(c) > 0x2000}))
    alias, rest = spec.split("=", 1)
    fam, w = rest.rsplit(":", 1)
    url = "https://fonts.googleapis.com/css2?family=%s:wght@%s&text=%s" % (fam.replace(" ", "+"), w, urllib.parse.quote(chars))
    css = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read().decode()
    src = re.search(r"url\((https://[^)]+)\)", css).group(1)
    data = urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": UA}), timeout=60).read()
    fn = f"{alias}-{w}-subset.woff2"
    (doc / "fonts" / fn).write_bytes(data)
    lines.append(f'@font-face {{ font-family: "{alias}"; src: url("{fn}") format("woff2"); font-weight: {w}; }}')
    print(alias, fam, len(chars), "chars", len(data), "bytes")
(doc / "fonts" / "cjk-extra.css").write_text(f"/* {', '.join(a.split('=')[1].split('@')[0] for a in sys.argv[2:])} (OFL, Google Fonts), subset to page characters */\n" + "\n".join(lines) + "\n")
