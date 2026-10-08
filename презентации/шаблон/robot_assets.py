"""Робот на фоне страны: из перерисованной в Higgsfield картинки (9:16) делает два файла для слайдов.

  python3 презентации/шаблон/robot_assets.py <ключ> <ссылка-или-файл.png>
  → assets/роботы/<ключ>-raw.png, robot-<ключ>.png (полный рост, прозрачные края как у robot.png),
    robot-head-<ключ>.png (крупно, зеркально — для слайда «Выгоды», края как у robot-head.png)

Кадр головы найден сопоставлением robot-head.png с зеркальным robot.png: x 89…441, y 131…351 (в пикселях robot.png).
"""
import pathlib
import subprocess
import sys

from PIL import Image, ImageOps

HERE = pathlib.Path(__file__).resolve().parent
A = HERE / "assets"
OUT = A / "роботы"
HEAD_BOX = (89, 131, 441, 351)


def main():
    key, src = sys.argv[1], sys.argv[2]
    OUT.mkdir(exist_ok=True)
    raw = OUT / f"{key}-raw.png"
    if src.startswith("http"):
        subprocess.run(["curl", "-sSfL", "-o", str(raw), src], check=True)
    elif pathlib.Path(src).resolve() != raw.resolve():
        raw.write_bytes(pathlib.Path(src).read_bytes())
    orig = Image.open(A / "robot.png")
    g = Image.open(raw).convert("RGB")
    w = round(g.height * orig.width / orig.height)
    g = g.crop((0, 0, min(w, g.width), g.height))  # рука робота слева — режем справа
    full = g.resize((orig.width * 2, orig.height * 2), Image.LANCZOS)
    full.putalpha(orig.getchannel("A").resize(full.size, Image.LANCZOS))
    full.save(OUT / f"robot-{key}.png", optimize=True)
    head0 = Image.open(A / "robot-head.png")
    k = full.width / orig.width
    head = ImageOps.mirror(full.convert("RGB")).crop(tuple(int(v * k) for v in HEAD_BOX))
    head = head.resize((head0.width * 2, head0.height * 2), Image.LANCZOS)
    head.putalpha(head0.getchannel("A").resize(head.size, Image.LANCZOS))
    head.save(OUT / f"robot-head-{key}.png", optimize=True)
    print(OUT / f"robot-{key}.png")


if __name__ == "__main__":
    main()
