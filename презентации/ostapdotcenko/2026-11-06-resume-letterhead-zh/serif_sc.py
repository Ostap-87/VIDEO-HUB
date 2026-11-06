"""Noto Serif SC subset for a resume folder (same approach as build.py does for Noto Sans SC).
python3 serif_sc.py <folder>  -> <folder>/fonts/NotoSerifSC-{400,600,700}-subset.woff2 + noto-serif-sc.css (family "NSerifSC")
"""
import pathlib, re, sys, urllib.parse, urllib.request

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
doc = pathlib.Path(sys.argv[1])
html = (doc / "index.html").read_text(encoding="utf-8")
text = re.sub(r"<!--.*?-->", "", html, flags=re.S)
chars = "".join(sorted({c for c in text if ord(c) > 0x2000}))
lines = []
for w in (400, 600, 700):
    url = "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@%d&text=%s" % (w, urllib.parse.quote(chars))
    css = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read().decode()
    src = re.search(r"url\((https://[^)]+)\)", css).group(1)
    data = urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": UA}), timeout=60).read()
    fn = f"NotoSerifSC-{w}-subset.woff2"
    (doc / "fonts" / fn).write_bytes(data)
    lines.append(f'@font-face {{ font-family: "NSerifSC"; src: url("{fn}") format("woff2"); font-weight: {w}; }}')
    lines.append(f'@font-face {{ font-family: "ZHDS"; src: url("{fn}") format("woff2"); font-weight: {w}; unicode-range: U+2014; }}')
(doc / "fonts" / "noto-serif-sc.css").write_text("/* Noto Serif SC (OFL), subset of the document's characters; ZHDS = its em dash only */\n" + "\n".join(lines) + "\n")
print("Noto Serif SC:", len(chars), "chars")
