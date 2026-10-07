"""Вырезает человека из видео (без зелёного фона) — для эффекта «спикер на фоне картинки».

  python3 scripts/matte.py ../source-videos/папка/_work/clip.cut.mp4
  python3 scripts/matte.py ../source-videos/папка/_work/clip.cut.mp4 --ranges 0.8-4,18.3-24.7

Модель: Robust Video Matting (MobileNetV3, ONNX, работает на CPU).
Результат: рядом файл clip.cut.alpha.webm — VP9 с прозрачностью, только сам человек.
--ranges — считать только нужные отрезки (секунды), остальное прозрачное: быстрее.
Модель кладётся в reels-studio/models/ (в git не идёт).
"""
import argparse
import pathlib
import subprocess
import urllib.request

import numpy as np
import onnxruntime as ort

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL = ROOT / "models" / "rvm_mobilenetv3_fp32.onnx"
MODEL_URL = "https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx"


def probe(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
         "-of", "csv=p=0", str(path)]
    ).decode().strip()
    w, h, r = out.split(",")
    num, den = r.split("/")
    return int(w), int(h), float(num) / float(den)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--ranges", default="", help="например 0.8-4,18.3-24.7 (секунды)")
    ap.add_argument("--scale", type=float, default=0.5, help="масштаб входа для модели (скорость)")
    a = ap.parse_args()

    if not MODEL.exists():
        MODEL.parent.mkdir(exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL)
    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])

    src = pathlib.Path(a.video).resolve()
    out = src.with_suffix(".alpha.webm")
    W, H, fps = probe(src)
    w, h = int(W * a.scale) // 2 * 2, int(H * a.scale) // 2 * 2
    ranges = [tuple(map(float, r.split("-"))) for r in a.ranges.split(",") if r]
    need = lambda t: not ranges or any(s - 0.6 <= t <= e + 0.6 for s, e in ranges)

    dec = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", str(src), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(
        ["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(fps),
         "-i", "-", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "6M", "-deadline", "realtime", "-cpu-used", "8",
         "-row-mt", "1", "-auto-alt-ref", "0", str(out)],
        stdin=subprocess.PIPE,
    )
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
    ratio = np.array([0.5], np.float32)
    empty = np.zeros((H, W, 4), np.uint8).tobytes()
    i = 0
    while True:
        buf = dec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        t = i / fps
        i += 1
        if not need(t):
            rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4  # память модели сбрасываем между отрезками
            enc.stdin.write(empty)
            continue
        frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        small = frame[:: int(1 / a.scale), :: int(1 / a.scale)] if a.scale in (0.5, 0.25) else frame
        x = (small.astype(np.float32) / 255).transpose(2, 0, 1)[None]
        fgr, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3],
                                         "downsample_ratio": ratio})
        alpha = pha[0, 0]
        if alpha.shape != (H, W):
            alpha = np.kron(alpha, np.ones((H // alpha.shape[0], W // alpha.shape[1]), np.float32))[:H, :W]
        rgba = np.dstack([frame, (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])
        enc.stdin.write(rgba.tobytes())
        if i % 150 == 0:
            print(f"{t:.1f} с", flush=True)
    enc.stdin.close()
    enc.wait()
    print(out)


if __name__ == "__main__":
    main()
