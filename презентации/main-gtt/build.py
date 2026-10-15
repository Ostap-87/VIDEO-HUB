"""Основная презентация GTT («Main GTT», Canva) — точечные улучшения без смены дизайна (запрос пользователя 15.10.2026:
«можешь её улучшить, но не менять кардинально»).

  python3 презентации/main-gtt/build.py

Исходник — презентации/примеры/Main GTT.pdf (12 слайдов-картинок 2048×1152, текст «впечатан» в картинку). Для каждой правки:
старый текст стирается заливкой по соседнему фону (OpenCV inpaint по маске тёмных или светлых пикселей в прямоугольнике),
новый набирается HTML поверх (Inter / Montserrat, цвета сняты со слайдов), Playwright снимает слайд 2048×1152.
Размер текста подгоняется под ширину исходной строки (data-ref / data-refw). Координаты — в сетке 2000×1125
(превью 100 dpi), на какой слайд что правим — EDITS ниже. Слайды без правок идут в PDF как были.
Результат: готовые/2026-10-15-main-gtt.pdf (1440×810 pt), превью готовые/превью/2026-10-15-main-gtt/NN.jpg и лист
готовые/превью/2026-10-15-main-gtt.jpg (было / стало по изменённым слайдам — …-сравнение.jpg).
"""
import json
import pathlib
import subprocess

import cv2
import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SRC = ROOT / "примеры" / "Main GTT.pdf"
WORK = HERE / "_work"
OUT_PDF = ROOT / "готовые" / "2026-10-15-main-gtt.pdf"
PREV = ROOT / "готовые" / "превью" / "2026-10-15-main-gtt"
W, H = 2048, 1152          # итоговый кадр
GW, GH = 2000, 1125        # сетка разметки
FONTS = (ROOT / "шаблон" / "fonts" / "fonts.css").as_uri()
MONT = "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=block"

SKIP = {11}            # «Стоимость программ» — убрана по решению пользователя 15.10.2026 («так будет честнее»)
BLUE = "#0a36e6"       # синий заголовков и акцентов (снят со слайдов)
INK = "#14161c"        # основной тёмный текст
GREY = "#53585d"       # подписи на карточке контактов

MSG_ICON = ('<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="{c}" stroke-width="1.9" stroke-linecap="round" '
            'stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z"/>'
            '<path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" stroke-width="2.6"/></svg>').format(c=BLUE)
MI = ('<span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;'
      'background:#fff;color:#1d3fe0;font:800 19px/1 Inter;letter-spacing:-1px">mi</span>')


def text(x, y, html, ref, refw, font="Inter", weight=400, color=INK, lh=1.2, width=None, extra=""):
    """Блок текста: кегль подбирается так, чтобы строка ref в этом шрифте заняла refw px (ширина исходной строки)."""
    w = f"width:{width}px;" if width else ""
    return (f'<div class="t" data-ref="{ref}" data-refw="{refw}" style="left:{x}px;top:{y}px;{w}font-family:{font};'
            f'font-weight:{weight};color:{color};line-height:{lh};{extra}">{html}</div>')


# (x0, y0, x1, y1, режим, порог): режим dark — стереть пиксели темнее порога, light — светлее порога, diff — отличие
# от медианного фона больше порога (для бледных «призраков» текста)
EDITS = {
    # 2: Haier на правой стрелке повторяет Haier слева — ставим Xiaomi (он есть в тексте слайда)
    2: {"clean": [(1728, 528, 1888, 594, "light", 205)],
        "html": f'<div class="t" style="left:1742px;top:542px;display:flex;align-items:center;gap:9px;color:#fff;'
                f'font:700 33px/1 Inter;letter-spacing:-0.3px">{MI}Xiaomi</div>'},
    # 5: «трехдневный интенсив в кампусах Топовых компаний… Alibaba/Xiaomi и Другие» — ё, строчные, площадки с сайта
    5: {"clean": [(250, 945, 702, 1046, "dark", 125), (700, 984, 756, 1016, "dark", 125)],
        "html": text(254, 946, "Трёхдневный интенсив от 10 человек<br>в кампусах Huawei, Alibaba, Xiaomi<br>и других топ-компаний Китая",
                     "от 10 человек трехдневный интенсив", 436, lh=1.12)},
    # 6: «Много готовых маршрутов» → точное число программ сайта
    6: {"clean": [(262, 505, 705, 582, "dark", 125)],
        "html": text(268, 509, "76 готовых маршрутов<br>и индивидуальные делегации", "и индивидуальных делегаций", 372, lh=1.13)},
    # 8: тире слиплись с текстом и лежат на пиджаке, список «Команда» начинается вплотную к фото
    8: {"clean": [(935, 478, 1460, 686, "fill", 0), (986, 843, 1895, 1036, "fill", 0),
                  (936, 858, 984, 880, "dark", 100), (936, 908, 984, 930, "dark", 100), (936, 958, 984, 980, "dark", 100),
                  (966, 845, 990, 1032, "dark", 72)],
        "html": text(990, 482, "— 10 лет в Китае<br>— Работал в Сбере и Alibaba<br>— Живёт в Шанхае, говорит по-китайски<br>"
                     "— 500+ визитов к топ-компаниям", "—10 лет в Китае", 231, weight=500, color="#1f242d", lh=1.585)
                + text(990, 848, '— Бывшие топ-менеджеры и менторы крупных компаний<br>— 15+ лет в туризме, коммуникациях и GR/PR<br>'
                       '<span style="display:inline-block;padding-left:1.05em;text-indent:-1.05em">— Умеем договориться, довести '
                       'и не потерять<br>делегацию среди толп в Азии</span>', "—10 лет в Китае", 231, weight=500,
                       color="#1f242d", lh=1.55)},
    # 10: «Ускоренноe» (сбой буквы), «партнерами» — весь список заново одним шрифтом
    10: {"clean": [(262, 445, 815, 1040, "dark", 125), (262, 1040, 760, 1078, "dark", 125)],
         "html": "".join(text(266, y, t, "увидеть производство своими глазами", 542, lh=1.13) for y, t in [
             (457, "Выход на ЛПР"),
             (551, "Реальный бенчмарк и возможность<br>увидеть производство своими глазами"),
             (667, "Связи и коммуникации<br>с партнёрами и после поездки"),
             (782, "Более быстрое прохождение<br>due diligence"),
             (891, "Ускоренное внедрение<br>инноваций"),
             (1001, "Система поощрения<br>и мотивация команды")])},
    # 12: пустой кружок у WhatsApp/Telegram, телефон слитно, бледные следы старого текста под карточкой
    12: {"clean": [(1212, 288, 1650, 550, "fill", 0), (1236, 821, 1330, 846, "dark", 205),
                   (1380, 930, 1995, 1110, "diff", 5), (1385, 925, 1990, 1105, "blur", 18)],
         "html": "".join(
             f'<div class="t" style="left:1218px;top:{y}px;font:500 17px/1.2 Montserrat;color:{GREY}">{lab}</div>'
             + text(1218, y + 21, val, "info@globaltechtour.ru", 258, font="Montserrat", weight=700, color="#1424d0", lh=1.1)
             for y, lab, val in [(289, "Электронная почта:", "info@globaltechtour.ru"),
                                 (358, "Сайт:", "globaltechtour.ru"),
                                 (427, "Телефон:", "+86 137 6171 6355"),
                                 (496, "WhatsApp / Telegram:", "+7 985 874 49 58 · @ostapdotcenko")])
         + f'<div class="t" style="left:1156px;top:501px">{MSG_ICON}</div>'
         + '<div class="t" style="left:1238px;top:823px;font:700 16.5px/1.2 Montserrat;color:#1424d0">TG-канал</div>'},
}


def extract():
    """Слайды — рендер страниц PDF ровно 2048×1152 (а не вложенные картинки: на 8-м и 12-м картинка лежит со сдвигом,
    координаты разметки сняты со страницы)."""
    WORK.mkdir(parents=True, exist_ok=True)
    for f in WORK.glob("src-*"):
        f.unlink()
    subprocess.run(["pdftoppm", "-r", str(W * 72 / 1440), "-png", str(SRC), str(WORK / "src")], check=True)
    files = sorted(WORK.glob("src-*.png"))
    assert len(files) == 12, files
    for f in files:
        im = cv2.imread(str(f))
        if im.shape[:2] != (H, W):
            cv2.imwrite(str(f), cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA))
    return files


def clean(img, rects):
    """dark / light / diff — стереть текст inpaint по маске; fill — залить цветом фона (медиана по краю, для чистого белого);
    blur — сильно размыть с мягким краем (бледные следы текста на градиенте)."""
    sx, sy = W / GW, H / GH
    box = lambda r: (int(r[0] * sx), int(r[1] * sy), int(r[2] * sx), int(r[3] * sy))
    mask = np.zeros(img.shape[:2], np.uint8)
    for r in rects:
        X0, Y0, X1, Y1 = box(r)
        mode, thr = r[4], r[5]
        if mode in ("fill", "blur"):
            continue
        reg = img[Y0:Y1, X0:X1]
        lum = cv2.cvtColor(reg, cv2.COLOR_BGR2GRAY)
        if mode == "dark":
            m = lum < thr
        elif mode == "light":
            m = lum > thr
        else:
            bg = cv2.medianBlur(reg, 75)
            m = np.abs(reg.astype(int) - bg.astype(int)).max(axis=2) > thr
        m = cv2.dilate(m.astype(np.uint8) * 255, np.ones((5, 5), np.uint8), iterations=2)
        mask[Y0:Y1, X0:X1] = np.maximum(mask[Y0:Y1, X0:X1], m)
    out = cv2.inpaint(img, mask, 7, cv2.INPAINT_TELEA) if mask.any() else img.copy()
    for r in rects:
        X0, Y0, X1, Y1 = box(r)
        if r[4] == "fill":
            edge = np.concatenate([out[Y0, X0:X1], out[Y1 - 1, X0:X1], out[Y0:Y1, X0], out[Y0:Y1, X1 - 1]])
            out[Y0:Y1, X0:X1] = np.median(edge, axis=0).astype(np.uint8)
        elif r[4] == "blur":
            f = int(r[5])                                  # ширина мягкого края, px
            pad = 3 * f
            a0, b0, a1, b1 = max(0, X0 - pad), max(0, Y0 - pad), min(W, X1 + pad), min(H, Y1 + pad)
            reg = out[b0:b1, a0:a1].astype(np.float32)
            bl = cv2.GaussianBlur(reg, (0, 0), 40)
            al = np.zeros(reg.shape[:2], np.float32)
            al[Y0 - b0:Y1 - b0, X0 - a0:X1 - a0] = 1
            al = cv2.GaussianBlur(al, (0, 0), f)[..., None]
            out[b0:b1, a0:a1] = (reg * (1 - al) + bl * al).clip(0, 255).astype(np.uint8)
    return out


PAGE = """<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{fonts}"><link rel="stylesheet" href="{mont}">
<style>html,body{{margin:0}}body{{width:{gw}px;height:{gh}px;position:relative;overflow:hidden;background:url('{bg}') 0 0/100% 100% no-repeat}}
.t{{position:absolute;white-space:nowrap;-webkit-font-smoothing:antialiased}}</style></head><body>{html}
<script>document.fonts.ready.then(()=>{{for(const el of document.querySelectorAll('[data-ref]')){{
const s=document.createElement('span');s.style.cssText=getComputedStyle(el).font?'':'';s.style.font=getComputedStyle(el).font;
s.style.position='absolute';s.style.whiteSpace='nowrap';s.style.fontSize='100px';s.textContent=el.dataset.ref;document.body.appendChild(s);
el.style.fontSize=(100*el.dataset.refw/s.getBoundingClientRect().width).toFixed(2)+'px';s.remove();}}
document.body.dataset.ready='1';}});</script></body></html>"""

RENDER = """import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) {
  try { pw = require(p); break; } catch (e) {}
}
const jobs = JSON.parse(process.argv[2]);
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: %d, height: %d }, deviceScaleFactor: %f });
for (const [html, png] of jobs) {
  await page.goto('file://' + html, { waitUntil: 'load' });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: png });
}
await browser.close();
""" % (GW, GH, W / GW)


def main():
    srcs = extract()
    jobs = []
    for n, e in EDITS.items():
        img = cv2.imread(str(srcs[n - 1]))
        cl = clean(img, e["clean"])
        bg = WORK / f"clean-{n:02d}.png"
        cv2.imwrite(str(bg), cl)
        html = WORK / f"slide-{n:02d}.html"
        html.write_text(PAGE.format(fonts=FONTS, mont=MONT, gw=GW, gh=GH, bg=bg.as_uri(), html=e["html"]), encoding="utf-8")
        jobs.append([str(html), str(WORK / f"new-{n:02d}.png")])
    (WORK / "render.mjs").write_text(RENDER)
    subprocess.run(["node", str(WORK / "render.mjs"), json.dumps(jobs)], check=True)
    PREV.mkdir(parents=True, exist_ok=True)
    pages = []
    for i, s in enumerate(srcs, 1):
        if i in SKIP:
            continue
        p = WORK / f"new-{i:02d}.png" if i in EDITS else s
        im = Image.open(p).convert("RGB")
        assert im.size == (W, H), (p, im.size)
        pages.append(im)
        im.save(PREV / f"{len(pages):02d}.jpg", quality=90)
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    pages[0].save(OUT_PDF, save_all=True, append_images=pages[1:], resolution=W * 72 / 1440, quality=92)
    # лист-обзор и сравнение было / стало
    thumbs = [p.resize((500, 281)) for p in pages]
    num = [i for i in range(1, 13) if i not in SKIP]          # номер исходного слайда → место в PDF
    sheet = Image.new("RGB", (4 * 500 + 5 * 12, 3 * 281 + 4 * 12), "white")
    for k, t in enumerate(thumbs):
        sheet.paste(t, (12 + (k % 4) * 512, 12 + (k // 4) * 293))
    sheet.save(PREV.parent / "2026-10-15-main-gtt.jpg", quality=88)
    rows = [n for n in EDITS]
    cmp_ = Image.new("RGB", (2 * 800 + 36, len(rows) * 462 + 12), "white")
    for r, n in enumerate(rows):
        cmp_.paste(Image.open(srcs[n - 1]).convert("RGB").resize((800, 450)), (12, 12 + r * 462))
        cmp_.paste(pages[num.index(n)].resize((800, 450)), (824, 12 + r * 462))
    cmp_.save(PREV.parent / "2026-10-15-main-gtt-сравнение.jpg", quality=88)
    print("PDF", OUT_PDF, f"{OUT_PDF.stat().st_size / 1e6:.1f} МБ; правок на слайдах: {sorted(EDITS)}")


if __name__ == "__main__":
    main()
