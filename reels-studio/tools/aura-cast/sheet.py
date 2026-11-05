#!/usr/bin/env python3
"""Лист персонажей Aura (05.11.2026): портреты AuraCast и превью сцен применения с подписями → _лист.jpg.

Порядок:
  1) TMPDIR=/dev/shm/remotion-tmp npx remotion render src/index.ts AuraCast <tmp>/cast --sequence --image-format=png --bundle-cache=false
     TMPDIR=/dev/shm/remotion-tmp npx remotion render src/index.ts AuraScenesPreview <tmp>/scenes --sequence --image-format=png \
       --bundle-cache=false --concurrency=1 --timeout=180000
  2) python3 tools/aura-cast/sheet.py <tmp>   (из reels-studio) — раскладывает кадры по именам NN-<id>.png и scene-N-<id>.png
     в finished-videos/обложки/aura-персонажи/ и собирает _лист.jpg.
Имена и роли — те же, что в src/compositions/AuraCast.tsx (PORTRAITS); меняешь там — поменяй и здесь.
"""
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.join(ROOT, "finished-videos", "обложки", "aura-персонажи")

CAST = [
    ("mascot", "Ави", "Avi", "阿维", "ведущий-инженер", "Aura"),
    ("dog", "Скаут", "Scout", "斯考特", "робособака-разведчик", "Aura"),
    ("humanoid", "Леон", "Leon", "莱昂", "гуманоид", "Aura"),
    ("humanoid-navy", "Нова", "Nova", "诺娃", "гуманоид", "navy"),
    ("wheel-humanoid", "Роли", "Rolly", "罗利", "гуманоид на колёсах", "Aura"),
    ("wheel-humanoid-navy", "Кэрри", "Carry", "凯丽", "гуманоид на колёсах", "navy"),
    ("arm", "Арми", "Armie", "阿米", "промышленный манипулятор", "Aura"),
    ("arm-industrial", "Титан", "Titan", "泰坦", "промышленный манипулятор", "industrial"),
    ("cobot", "Тихон", "Tikhon", "吉洪", "кобот", "cobot"),
    ("hand", "Пятёрка", "Fiver", "小五", "роборука", "Aura"),
    ("hand-chrome", "Рубин", "Ruby", "鲁比", "роборука", "chrome"),
    ("agv", "Шустрик", "Zippy", "快快", "AGV-тележка", "Aura"),
    ("agv-orange", "Рыжик", "Ginger", "小橙", "AGV-тележка", "orange"),
    ("drone", "Сокол", "Falcon", "猎鹰", "дрон-инспектор", "Aura"),
    ("drone-white", "Стриж", "Swift", "雨燕", "дрон-инспектор", "белый с оранжевым"),
    ("cargo-drone", "Аист", "Stork", "白鹳", "грузовой дрон", "Aura"),
]
SCENES = [
    ("conveyor-carry", "Роли берёт коробку с конвейера → AGV"),
    ("dark-scan", "Скаут сканирует тёмный склад (лидар)"),
    ("arm-pallet", "Титан: с конвейера — на поддон"),
    ("drone-racks", "Сокол: инвентаризация стеллажей"),
    ("dark-cave", "Скаут идёт по пещере (облако точек)"),
    ("cargo-delivery", "Аист: доставка на площадку"),
]

INTER = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
CJK = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
INK = (38, 38, 38)
MUTED = (107, 107, 118)
LEMON = (255, 246, 93)
BG = (248, 246, 243)


def font(w, size):
    return ImageFont.truetype(INTER.format(w), size)


def frames(folder):
    fs = sorted(glob.glob(os.path.join(folder, "element-*.png")), key=lambda f: int(f.rsplit("-", 1)[1].split(".")[0]))
    return fs


def main(tmp):
    os.makedirs(OUT, exist_ok=True)
    cast = frames(os.path.join(tmp, "cast"))
    scenes = frames(os.path.join(tmp, "scenes"))
    assert len(cast) == len(CAST) + 1, f"кадров AuraCast {len(cast)}, ждали {len(CAST) + 1}"
    assert len(scenes) == len(SCENES), f"кадров AuraScenesPreview {len(scenes)}, ждали {len(SCENES)}"
    names = []
    for i, f in enumerate(cast):
        nm = f"{i + 1:02d}-{CAST[i][0]}.png" if i < len(CAST) else f"{i + 1:02d}-team.png"
        Image.open(f).save(os.path.join(OUT, nm), optimize=True)
        names.append(nm)
    snames = []
    for i, f in enumerate(scenes):
        nm = f"scene-{i + 1}-{SCENES[i][0]}.png"
        Image.open(f).save(os.path.join(OUT, nm), optimize=True)
        snames.append(nm)

    # лист: шапка, портреты 6 в ряд (300×375) с подписями, ниже — сцены 6 в ряд (9:16)
    cols, tw, th, cap, pad = 6, 300, 375, 96, 28
    rows = (len(names) + cols - 1) // cols
    sw, sh, scap = 300, 533, 62
    W = pad + cols * (tw + pad)
    H = 150 + rows * (th + cap + pad) + 70 + sh + scap + pad
    sheet = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(sheet)
    d.text((pad, 34), "Персонажи Aura Robotics", font=font("Bold", 52), fill=INK)
    d.text((pad, 100), "16 персонажей · 7 скинов · имена утверждены 05.11.2026", font=font("Medium", 26), fill=MUTED)
    fz = ImageFont.truetype(CJK, 22)
    for i, nm in enumerate(names):
        r, c = divmod(i, cols)
        x = pad + c * (tw + pad)
        y = 150 + r * (th + cap + pad)
        im = Image.open(os.path.join(OUT, nm)).convert("RGB").resize((tw, th), Image.LANCZOS)
        sheet.paste(im, (x, y))
        d.rectangle([x - 1, y - 1, x + tw, y + th], outline=INK, width=2)
        if i < len(CAST):
            _, ru, en, zh, role, skin = CAST[i]
            title = f"{i + 1:02d} · {ru}"
            d.text((x, y + th + 8), title, font=font("Bold", 28), fill=INK)
            tw_ = d.textlength(title, font=font("Bold", 28))
            d.text((x + tw_ + 10, y + th + 14), en, font=font("Medium", 20), fill=MUTED)
            d.text((x + tw_ + 14 + d.textlength(en, font=font("Medium", 20)), y + th + 12), zh, font=fz, fill=MUTED)
            line = f"{role} · {skin}"
            if d.textlength(line, font=font("Medium", 19)) <= tw:
                d.text((x, y + th + 46), line, font=font("Medium", 19), fill=INK)
            else:
                d.text((x, y + th + 44), role, font=font("Medium", 19), fill=INK)
                d.text((x, y + th + 66), f"скин: {skin}", font=font("Medium", 17), fill=MUTED)
        else:
            d.text((x, y + th + 8), f"{i + 1:02d} · Команда Aura", font=font("Bold", 28), fill=INK)
            d.text((x, y + th + 46), "все вместе", font=font("Medium", 19), fill=INK)
    y0 = 150 + rows * (th + cap + pad) + 10
    d.text((pad, y0), "Сцены применения (3D, Remotion)", font=font("Bold", 34), fill=INK)
    y0 += 56
    for i, nm in enumerate(snames):
        x = pad + i * (sw + pad)
        im = Image.open(os.path.join(OUT, nm)).convert("RGB").resize((sw, sh), Image.LANCZOS)
        sheet.paste(im, (x, y0))
        d.rectangle([x - 1, y0 - 1, x + sw, y0 + sh], outline=INK, width=2)
        d.text((x, y0 + sh + 8), f"S{i + 1}", font=font("Bold", 22), fill=INK)
        txt = SCENES[i][1]
        # перенос по словам в ширину превью
        words, line, yy = txt.split(), "", y0 + sh + 8
        lines = []
        for w_ in words:
            t = (line + " " + w_).strip()
            if d.textlength(t, font=font("Medium", 18)) > sw - 40:
                lines.append(line)
                line = w_
            else:
                line = t
        lines.append(line)
        for k, ln in enumerate(lines[:2]):
            d.text((x + 38, yy + 2 + k * 22), ln, font=font("Medium", 18), fill=INK)
    sheet.save(os.path.join(OUT, "_лист.jpg"), quality=86, optimize=True)
    print("OK", OUT, len(names), "портретов,", len(snames), "сцен")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/dev/shm/cast/final")
