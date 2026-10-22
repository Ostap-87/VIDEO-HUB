# -*- coding: utf-8 -*-
"""Иконка Монтажной для Mac (.icns): python3 montazh/mac/make_icon.py

Тёмный скруглённый квадрат как у иконок macOS, красная точка записи и три дорожки монтажного стола
(кадры, звук, эффекты) с красной линией курсора.
"""
import os

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
S = 2048


def icon() -> Image.Image:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    box = (200, 200, S - 200, S - 200)
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((box[0], box[1] + 24, box[2], box[3] + 24), radius=370, fill=(0, 0, 0, 110))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))
    g = Image.new("RGB", (1, 256))
    for y in range(256):
        t = y / 255
        g.putpixel((0, y), (int(38 - 14 * t), int(42 - 15 * t), int(50 - 17 * t)))
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=370, fill=255)
    img.paste(g.resize((S, S)), (0, 0), mask)
    d = ImageDraw.Draw(img)
    # точка записи с ореолом
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((470, 430, 830, 790), fill=(255, 107, 94, 120))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(40)))
    d.ellipse((500, 460, 800, 760), fill=(255, 92, 78))
    # дорожки монтажного стола
    rows = [(1000, [(470, 900, (76, 141, 255)), (950, 1300, (76, 141, 255)), (1350, 1580, (76, 141, 255))]),
            (1210, [(470, 1180, (60, 207, 142)), (1240, 1580, (60, 207, 142))]),
            (1420, [(470, 760, (240, 180, 60)), (980, 1380, (255, 92, 78))])]
    for y, segs in rows:
        for x0, x1, c in segs:
            d.rounded_rectangle((x0, y, x1, y + 130), radius=40, fill=c)
    d.rounded_rectangle((1120, 900, 1150, 1640), radius=15, fill=(255, 255, 255))
    d.polygon([(1080, 870), (1190, 870), (1135, 940)], fill=(255, 255, 255))
    return img


if __name__ == "__main__":
    im = icon()
    im.resize((1024, 1024), Image.LANCZOS).save(os.path.join(HERE, "icon-1024.png"))
    im.resize((1024, 1024), Image.LANCZOS).save(os.path.join(HERE, "AppIcon.icns"),
                                                sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)])
    print("ok")
