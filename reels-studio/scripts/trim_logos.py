#!/usr/bin/env python3
"""Обрезать пустые поля у логотипов библиотеки (library/brands.json), чтобы на карточках они не выглядели мелкими.

python3 scripts/trim_logos.py            # показать, что будет обрезано
python3 scripts/trim_logos.py --apply    # обрезать на месте (оригиналы остаются в истории git)

Поле считается лишним, если логотип занимает меньше 90 % ширины или высоты файла. Фон определяется так:
прозрачные поля — по альфа-каналу, белый фон — по цвету углов; цветные плашки не трогаем (это часть дизайна). Вокруг логотипа оставляется отступ 4 %.
Запускать из reels-studio/ (пути в brands.json — от корня репозитория).
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / 'reels-studio/library/brands.json'
FILL = 0.9
MARGIN = 0.04


def white_bg_box(rgb):
    """Рамка содержимого на белом (почти белом) фоне или None, если фон цветной — плашка бренда."""
    w, h = rgb.size
    corners = [rgb.getpixel(p) for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))
    if min(bg) < 235:                                   # цветная плашка — часть дизайна логотипа, не режем
        return None
    diff = ImageChops.difference(rgb, Image.new('RGB', rgb.size, bg)).convert('L')
    return diff.point(lambda v: 255 if v > 20 else 0).getbbox()


def content_box(im):
    """(left, top, right, bottom) содержимого логотипа или None."""
    rgba = im.convert('RGBA')
    w, h = rgba.size
    alpha = rgba.getchannel('A')
    abox = alpha.point(lambda v: 255 if v > 16 else 0).getbbox()
    if not abox:
        return None
    inner = rgba.crop(abox)
    a_in = inner.getchannel('A').point(lambda v: 255 if v > 16 else 0)
    opaque = sum(a_in.histogram()[255:]) / (inner.size[0] * inner.size[1])
    if opaque < 0.9:                                     # прозрачный фон — режем по альфе
        return abox
    # внутри непрозрачная карточка: ищем логотип на белом фоне карточки
    rgb = Image.alpha_composite(Image.new('RGBA', inner.size, (255, 255, 255, 255)), inner).convert('RGB')
    box = white_bg_box(rgb)
    if not box:
        return abox if abox != (0, 0, w, h) else None
    return (abox[0] + box[0], abox[1] + box[1], abox[0] + box[2], abox[1] + box[3])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()
    lib = json.loads(LIB.read_text(encoding='utf-8'))
    done = set()
    for key, v in lib.items():
        p = v.get('logo') if isinstance(v, dict) else None
        if not p or Path(p).suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp') or p in done:
            continue
        f = ROOT / p
        if not f.exists():
            continue
        done.add(p)
        im = Image.open(f)
        bb = content_box(im)
        if not bb:
            continue
        w, h = im.size
        cw, ch = bb[2] - bb[0], bb[3] - bb[1]
        if cw >= FILL * w and ch >= FILL * h:
            continue
        m = max(4, round(MARGIN * max(cw, ch)))
        box = (max(0, bb[0] - m), max(0, bb[1] - m), min(w, bb[2] + m), min(h, bb[3] + m))
        if box[2] - box[0] >= 0.95 * w and box[3] - box[1] >= 0.95 * h:   # поля и так узкие
            continue
        print(f'{key}: {p} {w}×{h} → {box[2] - box[0]}×{box[3] - box[1]}')
        if a.apply:
            out = im.crop(box)
            out.save(f, **({'optimize': True} if f.suffix.lower() == '.png' else {'quality': 95}))
    if not a.apply:
        print('(пробный прогон; --apply — обрезать)')


if __name__ == '__main__':
    main()
