"""Герой обложки без фона: кадр → PNG с прозрачностью (BiRefNet lite, MIT, ONNX, CPU; модель в ~/.cache/birefnet/).

  python3 scripts/cutout.py <кадр.png> <герой.png> [--crop x,y,w,h] [--keep-largest] [--upscale 2]

--crop — сначала вырезать участок кадра (робот в углу видео); --keep-largest — оставить только самый крупный объект
(стойки ограждения, люди и коробки позади убираются); --upscale — увеличить результат (Lanczos) для обложки 1080×1920.
"""
import argparse
import pathlib

import numpy as np
from PIL import Image

MODEL = pathlib.Path.home() / ".cache" / "birefnet" / "model.onnx"


MODEL_URL = "https://huggingface.co/onnx-community/BiRefNet_lite-ONNX/resolve/main/onnx/model.onnx"


def ensure_model():
    """Модели нет (новая сессия) — качаю curl'ом (~224 МБ): Node и Python к Hugging Face в облаке ходят не всегда."""
    if MODEL.exists():
        return
    import subprocess

    MODEL.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["curl", "-sSL", "--fail", "-o", str(MODEL) + ".part", MODEL_URL], check=True)
    pathlib.Path(str(MODEL) + ".part").rename(MODEL)


def mask_of(img: Image.Image) -> np.ndarray:
    import onnxruntime as ort

    ensure_model()

    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    inp = sess.get_inputs()[0]
    size = inp.shape[-1] if isinstance(inp.shape[-1], int) else 1024
    x = np.asarray(img.convert("RGB").resize((size, size), Image.BILINEAR), dtype=np.float32) / 255.0
    x = (x - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array([0.229, 0.224, 0.225], dtype=np.float32)
    x = x.transpose(2, 0, 1)[None]
    out = sess.run(None, {inp.name: x})[-1][0, 0]
    if out.min() < 0 or out.max() > 1:
        out = 1 / (1 + np.exp(-out))
    m = Image.fromarray((out * 255).clip(0, 255).astype(np.uint8)).resize(img.size, Image.BILINEAR)
    return np.asarray(m)


def keep_largest(alpha: np.ndarray) -> np.ndarray:
    import cv2

    n, lab, stats, _ = cv2.connectedComponentsWithStats((alpha > 127).astype(np.uint8), connectivity=8)
    if n <= 2:
        return alpha
    keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    grow = cv2.dilate((lab == keep).astype(np.uint8), np.ones((13, 13), np.uint8))
    return (alpha * grow).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--crop")
    ap.add_argument("--keep-largest", action="store_true")
    ap.add_argument("--upscale", type=float, default=1.0)
    a = ap.parse_args()
    img = Image.open(a.src).convert("RGB")
    if a.crop:
        x, y, w, h = map(int, a.crop.split(","))
        img = img.crop((x, y, x + w, y + h))
    alpha = mask_of(img)
    if a.keep_largest:
        alpha = keep_largest(alpha)
    rgba = img.copy()
    rgba.putalpha(Image.fromarray(alpha))
    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    if a.upscale != 1:
        rgba = rgba.resize((round(rgba.width * a.upscale), round(rgba.height * a.upscale)), Image.LANCZOS)
    rgba.save(a.out)
    print(f"{a.out}: {rgba.width}×{rgba.height}")


if __name__ == "__main__":
    main()
