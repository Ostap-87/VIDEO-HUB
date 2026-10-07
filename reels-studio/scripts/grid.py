"""Сетка и линия глаз — первый шаг монтажа говорящей головы.

  python3 scripts/grid.py ../source-videos/папка/_work/clip.cut.mp4

Берёт ~12 кадров по всему ролику, находит лицо и глаза (OpenCV, каскады Хаара), считает медиану:
- линия глаз (eyeY) и центр между глазами (eyeX) — точка, вокруг которой делаются все зумы (`focus` в props);
- рамка лица (faceBox) с запасом под резкие зумы — зона, куда нельзя ставить плашки.
Пишет рядом clip.layout.json и картинку clip.grid.jpg: сетка 12×20 по кадру (шаг 90 / 96 px с подписями),
трети кадра, линия глаз (голубая), рамка лица (красная) и безопасная зона Instagram. Картинку показывай пользователю.
"""
import json
import pathlib
import statistics
import subprocess
import sys

import cv2
import numpy as np


def frames(video, n=12):
    dur = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)]).decode())
    for i in range(n):
        t = dur * (i + 0.5) / n
        raw = subprocess.check_output(["ffmpeg", "-loglevel", "error", "-ss", f"{t}", "-i", str(video),
                                       "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"])
        yield t, cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)


def main():
    video = pathlib.Path(sys.argv[1]).resolve()
    face_c = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    eye_c = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
    faces, eyes_y, eyes_x, sample = [], [], [], None
    for t, img in frames(video):
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        fs = face_c.detectMultiScale(gray, 1.1, 6, minSize=(200, 200))
        if len(fs) == 0:
            continue
        x, y, w, h = max(fs, key=lambda f: f[2] * f[3])
        faces.append((x, y, w, h))
        sample = img if sample is None else sample
        roi = gray[y: y + h // 2 + h // 8, x: x + w]
        es = eye_c.detectMultiScale(roi, 1.1, 8, minSize=(w // 10, w // 10))
        es = sorted(es, key=lambda e: e[2] * e[3], reverse=True)[:2]
        if len(es) == 2:
            eyes_y.append(y + statistics.mean(e[1] + e[3] / 2 for e in es))
            eyes_x.append(x + statistics.mean(e[0] + e[2] / 2 for e in es))
        else:  # глаза на ~40 % высоты рамки лица Хаара
            eyes_y.append(y + 0.4 * h)
            eyes_x.append(x + w / 2)
    if not faces:
        raise SystemExit("лицо не найдено")
    med = lambda k: statistics.median(f[k] for f in faces)
    fx, fy, fw, fh = med(0), med(1), med(2), med(3)
    eye_y, eye_x = statistics.median(eyes_y), statistics.median(eyes_x)
    # зона лица с запасом: волосы сверху, подбородок снизу, +15 % на резкие зумы
    pad = 0.15
    box = [fx - fw * pad, fy - fh * (0.25 + pad), fx + fw * (1 + pad), fy + fh * (1.15 + pad)]
    H, W = sample.shape[:2]
    layout = {
        "eyeX": round(eye_x), "eyeY": round(eye_y),
        "faceBox": [round(v) for v in box],
        "frame": [W, H],
        "eyeLineShare": round(eye_y / H, 3),
        "samples": len(faces),
    }
    out = video.with_suffix(".layout.json")
    out.write_text(json.dumps(layout, ensure_ascii=False, indent=1))

    img = sample.copy()
    over = img.copy()
    for gx in range(0, W + 1, W // 12):
        cv2.line(over, (gx, 0), (gx, H), (255, 255, 255), 1)
        cv2.putText(over, str(gx), (gx + 4, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    for gy in range(0, H + 1, H // 20):
        cv2.line(over, (0, gy), (W, gy), (255, 255, 255), 1)
        cv2.putText(over, str(gy), (4, gy - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    img = cv2.addWeighted(over, 0.45, img, 0.55, 0)
    for k in (1, 2):  # трети
        cv2.line(img, (W * k // 3, 0), (W * k // 3, H), (0, 200, 255), 2)
        cv2.line(img, (0, H * k // 3), (W, H * k // 3), (0, 200, 255), 2)
    cv2.rectangle(img, (64, 250), (W - 64, H - 380), (0, 255, 0), 2)  # безопасная зона Reels
    cv2.rectangle(img, (int(box[0]), int(box[1])), (int(box[2]), int(box[3])), (60, 60, 255), 4)
    cv2.line(img, (0, int(eye_y)), (W, int(eye_y)), (255, 200, 60), 5)
    cv2.circle(img, (int(eye_x), int(eye_y)), 14, (255, 200, 60), -1)
    cv2.putText(img, f"eye line y={round(eye_y)}", (30, int(eye_y) - 18), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (255, 200, 60), 3)
    cv2.imwrite(str(video.with_suffix(".grid.jpg")), img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(json.dumps(layout, ensure_ascii=False))


if __name__ == "__main__":
    main()
