# Презентации

- `примеры/` — присланные примеры (`ИИ.pdf`, `Alibaba Campus Education.pdf`): по ним сделан шаблон.
- `шаблон/` — фирменный шаблон Global Tech Tour (HTML/CSS → PDF), повторяет дизайн примеров 1:1.
- `контент/` — содержание презентаций в JSON (один файл = одна презентация).
- `готовые/` — собранные презентации `ГГГГ-ММ-ДД-тема.pdf` и `превью/` (каждый слайд PNG + лист-обзор JPG).

Файлы `.pptx`, `.key`, `.pdf` хранятся через Git LFS.

## Новая презентация за несколько минут

1. Скопируйте `контент/2026-10-08-тайланд.json` в `контент/ГГГГ-ММ-ДД-тема.json` и замените текст.
2. Логотипы компаний — из `source-videos/логотипы/<отрасль>/` (PNG с прозрачным или белым фоном, SVG).
   Нет логотипа — не указывайте `logo`, будет текстовый логотип с названием.
3. Соберите:

   ```bash
   python3 презентации/шаблон/build.py презентации/контент/ГГГГ-ММ-ДД-тема.json
   ```

   Получится `готовые/ГГГГ-ММ-ДД-тема.pdf`, `готовые/превью/ГГГГ-ММ-ДД-тема/NN.png` и `готовые/превью/ГГГГ-ММ-ДД-тема.jpg`.
4. Посмотрите лист-обзор, поправьте JSON, пересоберите. Быстрая проверка одного слайда: `--only 5 --no-pdf`.

Нужны Python 3 с `jinja2` и `Pillow`, Node.js и Playwright с Chromium (в облачной среде уже стоят:
`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). Ключи: `--only 1,5,7`, `--no-pdf`, `--html` (сохранить HTML рядом),
`--keep` (оставить PNG 1920×1080), `--outdir`.

## Как устроен шаблон

- Формат слайда — 1920×1080 px, в PDF 1440×810 pt (точно как оригиналы, они тоже свёрстаны в Chromium).
- Шрифты (локальные woff2, OFL): заголовки — **Sofia Sans Extra Condensed 900**, подписи — **Sofia Sans Condensed 850**,
  текст — **Inter 400**, иероглифы — **Noto Sans SC 900**, тайский — **Noto Sans Thai**.
- Цвета: синий `#1a73e8`, фон `#f3f5f8` (обложка `#f5f7fa`), текст `#17171d` / `#2b2d38` / `#5e6170`,
  голубой `#e6f1fd`, «скотч» `#8fbdf5`, тени карточек — две сплошные полосы `#dce3ec` (+7 px) и `#ebeff5` (+13 px).
- Координаты всех элементов сняты с PDF-примеров (PyMuPDF) и выверены попиксельно:
  `шаблон/сравнение-с-оригиналом.jpg` — оригинал слева, шаблон справа.
- Файлы: `template.html` (каркас), `slides/*.html` (по файлу на тип слайда, Jinja2), `slides/_macros.html`
  (иконки Lucide, логотип, «таблетка»), `slides.css`, `build.py` (сборка), `render.mjs` (Playwright: PDF + PNG),
  `assets/` (робот, голова робота, QR-коды из примеров), `fonts/`.

## Формат JSON

```json
{
  "output": "2026-10-08-тайланд",
  "slides": [ { "type": "cover", ... }, { "type": "company", ... } ]
}
```

Перенос строки в тексте — `\n`. Пути к картинкам — от корня репозитория (`source-videos/...`) или `assets/...`.
В любом слайде можно задать `tag` (синяя «таблетка») и `hero` (другая картинка вместо робота).

| `type` | Слайд (пример) | Поля |
|---|---|---|
| `cover` | Обложка (ИИ стр. 1, Alibaba стр. 1) | `tag`, `title` (по умолч. GLOBAL TECH TOUR), `topright`, `logos[]` {name, logo} до 12 **или** `logo` {name, logo} — один большой; `box_kicker`, `box_text`, `box_right`, `footer` |
| `why` | «Почему мы» (ИИ 2) | `items[4]` {title, text}; 3-й — синяя плашка, 4-й — голубая |
| `layers` | «Направления» (ИИ 3) | `title1`, `title2` (вписываются в колонку), `items[3]` {name, text}, `quote`, `ghost` |
| `route` | «Маршрут» (ИИ 4) | `cities[2–5]` {name, days, companies, leg {icon: plane/train/car, text}}, `footer` (HTML, `<b>` — синим), `ghost` |
| `company` | Карточка компании (ИИ 5–14) | `title`, `native` (иероглифы/тайский), `ghost`, `ghost_thai`, `logo`, `facts[4]` {icon, value, label, sub}, `why`, `learn`, `short`, `subtitle` |
| `days` | «Программа по дням» (Alibaba 6) | `title`, `days[2–5]` {label, sub, title, text}, `ghost` |
| `benefits` | «Выгоды» (ИИ 15) | `items[6]` {title, text, icon} |
| `market` | «О рынке» (ИИ 16) | `lead`, `stats[3]` {value, label, sub, frac 0…1 — заполнение дуги}, `quote`, `source`, `ghost` |
| `conditions` | «Формат и условия» (Alibaba 8) | `facts[4]` {icon, value, label, sub}, `includes[]`, `includes_note`, `footer` |
| `steps` | «Как проходит» (Alibaba 11) | `steps[3–5]` {title, text}, `hl` — номер синего шага, `faq[4]` {q, a} |
| `contacts` | «Контакты» (ИИ 17) | `note`, `contacts[6]` {type: email/site/phone/whatsapp/telegram/wechat, text}, `qr[3]` {label, img} |

Иконки (`icon`): briefcase, users, trending, pin, calendar, flag, plane, train, car, headphones, target, building,
store, cart, smartphone, cpu, globe, star, chart, handshake, home, package, mail, phone, chat, send.

`ghost` — бледные крупные знаки на фоне (как 智谱 в примерах): обычно первые 2 иероглифа названия;
для тайских названий — первое слово и `"ghost_thai": true`.

Правило по фактам: в презентацию идёт только то, что есть на сайте globaltechtour.ru или у пользователя.
Нет данных — оставьте явную заглушку `[уточнить …]`.
