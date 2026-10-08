#!/usr/bin/env python3
"""Сборка презентации Global Tech Tour из JSON-контента.

    python3 презентации/шаблон/build.py презентации/контент/2026-10-08-тайланд.json

Результат:
    презентации/готовые/<output>.pdf                — PDF 1440×810 pt (как оригиналы)
    презентации/готовые/превью/<output>/NN.png      — каждый слайд картинкой (1280×720)
    презентации/готовые/превью/<output>.jpg         — лист-обзор всех слайдов
Ключи: --only 1,5,7 (собрать только эти слайды), --no-pdf, --html (оставить HTML рядом с PDF),
--keep (оставить PNG 1920×1080 во временной папке), --outdir (другая папка результата).
"""
import argparse, html, json, math, os, shutil, subprocess, sys, tempfile
from pathlib import Path

import jinja2
from markupsafe import Markup

HERE = Path(__file__).resolve().parent            # презентации/шаблон
PRES = HERE.parent                                # презентации
ROOT = PRES.parent                                # корень репозитория


def asset(path):
    """Путь из JSON → URL. 'assets/…', 'fonts/…' — внутри шаблона; остальное — от корня репозитория."""
    if not path:
        return ''
    if path.startswith(('http://', 'https://', 'file:', 'data:')):
        return path
    if path.startswith(('assets/', 'fonts/')):
        return path
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / path
    if not p.exists():
        print(f'  ! нет файла: {path}', file=sys.stderr)
    return p.resolve().as_uri()


def br(text):
    if text is None:
        return ''
    return Markup('<br>'.join(html.escape(str(t)) for t in str(text).split('\n')))


def spline(pts):
    """Catmull-Rom через точки → SVG path из кубических кривых."""
    pts = [tuple(map(float, p)) for p in pts]
    if len(pts) < 2:
        return ''
    d = [f'M{pts[0][0]:.1f} {pts[0][1]:.1f}']
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}')
    return ' '.join(d)


def route_path(centers):
    """Волнистая пунктирная линия маршрута (как в оригинале): проходит за кружками городов."""
    pts = []
    for i, (cx, cy) in enumerate(centers):
        rel = []
        if i % 2 == 0:
            rel += [(-230, 165), (-115, 70)] if i == 0 else [(-125, -10)]
            rel += [(95, 100)]
            if i and i < len(centers) - 1:
                rel += [(171, 165)]
        else:
            rel += [(-60, 125), (135, 25)]
            if i < len(centers) - 1:
                rel += [(245, 21)]
        if i == len(centers) - 1:
            rel += [(261, 205)]
        pts += [(cx + dx, cy + dy) for dx, dy in rel]
    return spline(pts)


def gauge(frac):
    """Спидометр как в слайде «О рынке»: дуга-трек, синяя дуга, риски, кружок на конце."""
    frac = max(0.02, min(1.0, float(frac)))
    cx, cy, r = 170, 170, 170
    w, h = 340 + 40, 200
    ox, oy = 20, 20

    def pt(a, rr):
        return ox + cx + rr * math.cos(a), oy + cy - rr * math.sin(a)

    sx, sy = pt(math.pi, r)
    ex, ey = pt(0, r)
    a = math.pi * (1 - frac)
    px, py = pt(a, r)
    big = 0
    ticks = []
    for i in range(21):
        t = math.pi * (1 - i / 20)
        r1 = 140 if i % 5 else 132
        x1, y1 = pt(t, r1)
        x2, y2 = pt(t, 150)
        ticks.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>')
    return (f'<svg width="{w}" height="{h + 20}" style="left:{92}px;top:{48}px">'
            f'<path d="M{sx:.1f} {sy:.1f} A{r} {r} 0 0 1 {ex:.1f} {ey:.1f}" fill="none" stroke="#e6f1fd" stroke-width="22" stroke-linecap="round"/>'
            f'<g stroke="#c9ddf6" stroke-width="3" stroke-linecap="round">{"".join(ticks)}</g>'
            f'<path d="M{sx:.1f} {sy:.1f} A{r} {r} 0 {big} 1 {px:.1f} {py:.1f}" fill="none" stroke="#1a73e8" stroke-width="22" stroke-linecap="round"/>'
            f'<circle cx="{px:.1f}" cy="{py:.1f}" r="17" fill="#fff" stroke="#1a73e8" stroke-width="7"/></svg>')


def render_html(deck, slides):
    env = jinja2.Environment(loader=jinja2.FileSystemLoader(str(HERE)), autoescape=True,
                             undefined=jinja2.ChainableUndefined)
    env.filters.update(asset=asset, br=br, spline=spline)
    env.globals.update(gauge=gauge, route_path=route_path, deck=deck)
    tpl = env.get_template('template.html')
    return tpl.render(slides=slides, base=HERE.as_uri() + '/')


def contact_sheet(pngs, out, cols=4, w=480):
    from PIL import Image
    h = w * 9 // 16
    gap = 16
    rows = math.ceil(len(pngs) / cols)
    sheet = Image.new('RGB', (cols * w + (cols + 1) * gap, rows * h + (rows + 1) * gap), (225, 230, 238))
    for i, p in enumerate(pngs):
        im = Image.open(p).convert('RGB').resize((w, h), Image.LANCZOS)
        sheet.paste(im, (gap + (i % cols) * (w + gap), gap + (i // cols) * (h + gap)))
    sheet.save(out, quality=86)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('content')
    ap.add_argument('--only', help='номера слайдов через запятую')
    ap.add_argument('--no-pdf', action='store_true')
    ap.add_argument('--html', action='store_true', help='сохранить HTML рядом с PDF')
    ap.add_argument('--out', help='имя результата (по умолчанию поле output или имя JSON)')
    ap.add_argument('--outdir', help='куда класть (по умолчанию презентации/готовые)')
    ap.add_argument('--keep', action='store_true', help='не удалять временную папку с PNG 1920×1080')
    a = ap.parse_args()

    deck = json.loads(Path(a.content).read_text(encoding='utf-8'))
    slides = deck['slides']
    if a.only:
        keep = [int(x) for x in a.only.split(',')]
        slides = [s for i, s in enumerate(slides, 1) if i in keep]
    name = a.out or deck.get('output') or Path(a.content).stem
    outdir = Path(a.outdir) if a.outdir else PRES / 'готовые'
    prevdir = outdir / 'превью' / name
    outdir.mkdir(parents=True, exist_ok=True)
    if prevdir.exists():
        shutil.rmtree(prevdir)
    prevdir.mkdir(parents=True)

    tmp = Path(tempfile.mkdtemp(prefix='gtt-pres-'))
    page = tmp / f'{name}.html'
    page.write_text(render_html(deck, slides), encoding='utf-8')
    pdf = None if a.no_pdf else outdir / f'{name}.pdf'
    env = dict(os.environ)
    env.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')
    subprocess.run(['node', str(HERE / 'render.mjs'), str(page), str(pdf) if pdf else '', str(tmp)], check=True, env=env)

    from PIL import Image
    full = sorted(tmp.glob('[0-9][0-9].png'))
    for p in full:
        Image.open(p).convert('RGB').resize((1280, 720), Image.LANCZOS).save(prevdir / p.name, optimize=True)
    sheet = outdir / 'превью' / f'{name}.jpg'
    contact_sheet(full, sheet)
    if a.html:
        shutil.copy(page, outdir / f'{name}.html')
    print('Готово:')
    if pdf:
        print('  PDF   ', pdf)
    print('  превью', prevdir)
    print('  обзор ', sheet)
    if a.keep:
        print('  PNG 1920×1080', tmp)
    else:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    main()
