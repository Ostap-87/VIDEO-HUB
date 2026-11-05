#!/usr/bin/env python3
"""Карта Китая для сериала «Робокитай» (05.11.2026): контур материка, Хайнань и Тайвань одной линией — без внутренних границ.

Источник — Natural Earth, ne_50m_admin_0_countries (общественное достояние, https://www.naturalearthdata.com/),
скачивается во временную папку (в репозиторий не кладём — только готовые контуры в src/compositions/robokitai/chinaMap.ts).
Проекция — коническая равновеликая Альберса (параллели 25° и 47° с. ш., центральный меридиан 105° в. д.), как на картах Китая;
контур упрощается (Дуглас — Пекер) до ~1 px на ширине карты 1000 px.

Запуск (из reels-studio): python3 tools/robokitai/china_map.py [--src /dev/shm/rk/ne/ne50.geojson]
Новые города — словарь CITIES ниже (долгота, широта), затем перезапуск.
"""
import argparse
import json
import math
import os
import urllib.request

URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson"
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "src", "compositions", "robokitai", "chinaMap.ts")
W = 1000  # ширина карты в единицах SVG

# края «Робокитая» и города маршрутов (долгота, широта)
CITIES = {
    "Пекин": (116.40, 39.90),
    "Шэньян": (123.43, 41.80),
    "Сучжоу": (120.62, 31.30),
    "Шанхай": (121.47, 31.23),
    "Ханчжоу": (120.16, 30.27),
    "Шэньчжэнь": (114.06, 22.54),
    "Гуанчжоу": (113.26, 23.13),
    # промежуточные точки линии скоростного поезда Пекин → Шанхай / Ханчжоу
    "Цзинань": (117.00, 36.65),
    "Сюйчжоу": (117.18, 34.26),
    "Нанкин": (118.80, 32.06),
}


def albers(lon, lat, lon0=105.0, lat0=0.0, p1=25.0, p2=47.0):
    r = math.radians
    n = (math.sin(r(p1)) + math.sin(r(p2))) / 2
    c = math.cos(r(p1)) ** 2 + 2 * n * math.sin(r(p1))
    rho = lambda la: math.sqrt(c - 2 * n * math.sin(r(la))) / n
    th = n * r(lon - lon0)
    return rho(lat) * math.sin(th), rho(lat0) - rho(lat) * math.cos(th)


def dp(pts, eps):
    """Дуглас — Пекер для замкнутого кольца (без повтора первой точки)."""
    if len(pts) < 4:
        return pts

    # кольцо: делим на две половины по самой дальней точке от первой
    far = max(range(len(pts)), key=lambda i: math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]))
    ring = pts + [pts[0]]
    left = rec_ring(ring, 0, far, eps)
    right = rec_ring(ring, far, len(ring) - 1, eps)
    return left[:-1] + right[:-1]


def rec_ring(ring, a, b, eps):
    ax, ay = ring[a]
    bx, by = ring[b]
    dx, dy = bx - ax, by - ay
    L = math.hypot(dx, dy) or 1e-9
    best, idx = 0.0, -1
    for i in range(a + 1, b):
        px, py = ring[i]
        d = abs(dy * px - dx * py + bx * ay - by * ax) / L
        if d > best:
            best, idx = d, i
    if best > eps and idx > 0:
        return rec_ring(ring, a, idx, eps)[:-1] + rec_ring(ring, idx, b, eps)
    return [ring[a], ring[b]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="/dev/shm/rk/ne/ne50.geojson")
    a = ap.parse_args()
    if not os.path.exists(a.src):
        os.makedirs(os.path.dirname(a.src), exist_ok=True)
        urllib.request.urlretrieve(URL, a.src)
    d = json.load(open(a.src))
    rings = []
    for f in d["features"]:
        if f["properties"].get("ADM0_A3") not in ("CHN", "TWN"):
            continue
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            ring = poly[0]
            if len(ring) < 20:  # мелкие острова не рисуем
                continue
            rings.append([albers(lon, lat) for lon, lat in ring[:-1]])
    xs = [p[0] for r in rings for p in r]
    ys = [p[1] for r in rings for p in r]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    k = W / (x1 - x0)
    H = (y1 - y0) * k
    tr = lambda p: ((p[0] - x0) * k, (y1 - p[1]) * k)
    paths = []
    total = 0
    for r in sorted(rings, key=len, reverse=True):
        pts = dp([tr(p) for p in r], 0.9)
        total += len(pts)
        paths.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z")
    cities = {name: [round(v, 1) for v in tr(albers(lon, lat))] for name, (lon, lat) in CITIES.items()}
    with open(OUT, "w") as fh:
        fh.write("// Сгенерировано tools/robokitai/china_map.py — не править руками.\n")
        fh.write("// Контур Китая (материк, Хайнань, Тайвань): Natural Earth ne_50m_admin_0_countries, общественное достояние;\n")
        fh.write("// проекция Альберса (25°/47° с. ш., 105° в. д.), упрощение ~1 px на ширине 1000.\n")
        fh.write(f"export const CHINA_W = {W};\nexport const CHINA_H = {H:.1f};\n")
        fh.write("export const CHINA_PATHS: string[] = " + json.dumps(paths) + ";\n")
        fh.write("export const CITY_XY: Record<string, [number, number]> = " + json.dumps(cities, ensure_ascii=False) + ";\n")
    print(f"контуров {len(paths)}, точек {total}, размер {W}×{H:.0f} → {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main()
