# GlobalTechTour Reels Studio

Ролики Instagram Reels (1080×1920, 30 fps) в светлом «framed»-стиле GlobalTechTour на Remotion.

## Запуск

```bash
npm install
npm run studio
```

Все пакеты Remotion закреплены на одной версии. Новый пакет добавляйте командой `npx remotion add <пакет>`,
обновление — `npm run upgrade`. Справочник: https://www.remotion.dev/docs/api

## Стиль

Всё из карточки стиля от 21.09.2026 лежит в `src/theme.ts` и `src/fonts.ts`:
цвета (primary, accent, text, muted, surface, line), Unbounded 700 для заголовков, Inter 400/700 для текста.
Моноширинный шрифт для плашек и кикера в гайде не указан, взят JetBrains Mono. Замените в `fonts.ts`, если у вас другой.

Фирменные элементы в `src/components/Frame.tsx`: фото в карточке со скруглением и тонкой рамкой,
дымка (blur) внизу под текстом, плашка сайта слева-сверху (`tone`: light или dark под фон),
счётчик `1 / 3` справа-сверху.

## Акцент в тексте

Слова в `**двойных звёздочках**` становятся синими: `Ваши конкуренты уже видели **это своими глазами**`.
В заголовках это Unbounded, в обычном тексте Inter Bold.

## Композиции

- `Reel`: видео или фото в карточке, обложка (кикер + заголовок + подзаголовок), субтитры по словам, финал с синей плашкой.
- `CarouselReel`: Reels из готовой карусели — слайды листаются сами под музыку (`npm run carousel-reel`).
- `TextReel`: ролик-карусель из слайдов: обложка и текстовые слайды, каждый новый «наезжает» поверх предыдущего, счётчик считается сам.

## Быстро: ролик по ссылке одной командой

```bash
npm run auto -- https://we.tl/t-XXXX --theme avto --until prep   # скачать, расшифровать, вырезать паузы, черновик
npm run broll -- 2026-10-09-avto --find "charging|battery"       # (по желанию) найти другую картинку для перебивки
npm run broll -- 2026-10-09-avto --set 33.5 338                   # поставить её на 33.5 с
npm run auto -- --name 2026-10-09-avto --render                   # Reels + Stories + лёгкие копии
```

Понимает ссылки WeTransfer, Google Drive (публичные) и обычные. Темы: `avto`, `ai`, `byt-tehnika`, `chai-kofe`,
`konditerka`, `kosmetika`, `novyi-riteil`, `tech-giganty`, `obshchee` — описаны в `library/themes.json`.
Черновик собирается сам по словам речи: логотипы брендов, города, плашки «кто я / как устроена поездка / условия»,
цифры, чек-листы, перебивки из каталога Higgsfield без повторов, зумы, график, финал с сайтом и маршрутом экспедиции.
Что получилось и что проверить — `source-videos/<имя>/_work/<клип>.auto.md`, все картинки и логотипы одним листом —
`_work/<клип>.sheet.jpg`. Команду можно перезапускать: готовые этапы пропускаются.

Библиотеки в `library/`: `brands.json` (бренд → варианты написания → логотип), `cities.json`, `phrases.json`
(стандартные фразы → плашки, цифры, чек-листы), `themes.json`, `music.json`, `blocked-images.json`.
Новый бренд: логотип в `source-videos/логотипы/<отрасль>/` и строка в `brands.json`. Белые или прозрачные поля вокруг логотипа
обрезает `python3 scripts/trim_logos.py --apply` (без `--apply` — пробный список; цветные плашки не трогает).
Скриншоты маршрута экспедиции: `npm run route -- /expeditions/<slug> ../source-videos/сайт/маршруты/<slug> day`.
Установка всего нужного: `npm run setup` (в облаке Claude запускается сама при старте сессии).

## Второй бренд: Aura Robotics

Тот же шаблон `TalkReelPro`, стиль сайта aura-robotics.ru: в props `"brand": "aura"` (или `npm run auto -- <ссылка> --theme aura`).
Круглый логотип-печать крутится над головой, 3D-робот с сайта сам ходит по кадру: подаёт плашки, ставит галочки
в чек-листах, прыгает на цифрах, в финале показывает на кнопку сайта. Рядом с роботом может быть 3D-робособака
(`src/components/AuraDog.tsx`: виляет хвостом, наклоняет голову, подпрыгивает в моменты `hops`). Превью логотипа, жестов
робота и робособаки — композиция `AuraPreview` в Studio. Настройки брендов — `src/brand.ts`.

### 3D-арсенал Aura: AGV, манипулятор, робособака, роборука

Модели для роликов в стиле Aura — `src/components/aura3d/` (референсы — `source-videos/aura-robotics/3d-референсы/`):
`AgvModel` (ездит по точкам, разворачивается, поднимает площадку, возит, принимает и выгружает коробки), `ArmModel`
(6 осей: задаёшь точку — суставы считаются сами; берёт и переносит коробки), `DogModel` (идёт рысью, встаёт на задние
лапы, танцует, прыгает), `HandModel` (шевелит пальцами, кулак, указательный, берёт предмет двумя пальцами и переносит).
Ставятся в 3D-сцену `Stage` (прозрачный фон, камера `cam`), планы движений — по секундам. Витрина всех движений —
композиция `Aura3DShowcase`, рендер: `npx remotion render src/index.ts Aura3DShowcase ../finished-videos/3d-арсенал/aura-3d-витрина.mp4`.
Подробно (поля планов, примеры) — `CLAUDE.md`, раздел «3D-арсенал Aura».

## Пересборка готового ролика (вырезать кусок, новый звук)

```bash
python3 scripts/rebuild.py 2026-10-07-intro intro --cut 52.47-52.89   # секунды готового ролика
python3 scripts/matte.py ../source-videos/…/_work/клип.cut.mp4 --ranges …  # затем вырезка спикера и рендер
```
Склейка точная по кадрам (без рассинхрона), голос — шумодав DeepFilterNet3 + студийный эквалайзер, −14 LUFS.

### Stories из готового Reels

```bash
npx remotion render src/index.ts StoryReel ../finished-videos/stories/2026-10-12-aura-intro-reels-story-aura.mp4 --props=./props/stories/2026-10-12-aura-intro-reels-story-aura.json
```
Ролик в карточке, сверху кикер и заголовок, снизу плашка (адрес сайта или @аккаунт). До 60 секунд.
Видео-тизер (анонс завтрашней модели) — кусок ролика: в props `from` (с какой секунды) и `seconds` (длина, 10–12 с), пример —
`props/stories/пример-тизер-aura.json`.

### Reels из карусели Aura: гость дня и рендер пачкой

```bash
npm run carousel-reel -- 2026-10-10-foto-agibot-a2-w --guest agv --music inspiring-ambient-motivation-soundrider
```
Гости по кругу: `agv` → `arm` → `hand` → `dog`. 20 роликов сразу — GitHub → Actions → «Reels из каруселей» → Run workflow,
в `items` JSON-список `[{"name": "<карусель>", "guest": "agv", "music": "<трек>"}, …]`; готовые ролики сами придут в main.

## Карусели Instagram

```bash
# Сценарий до съёмки: текст для суфлёра + где какие плашки
python3 scripts/scenario.py 2026-10-10-тема   # scenarios/2026-10-10-тема.json → проверка, длина, суфлёр .txt
cp props/carousels/пример-gtt.json props/carousels/2026-10-10-тема.json   # или пример-aura.json
npm run carousel -- 2026-10-10-тема      # → finished-videos/карусели/2026-10-10-тема/01.png …
```
Слайды 1080×1350: обложка, текст, список с галочками, шаги, крупная цифра, фото, цитата, сравнение, логотипы, призыв.
Стиль — `"brand": "gtt"` или `"aura"`.

### Фото-карусели (фото главное)

```bash
cp props/carousels/пример-фото-aura.json props/carousels/2026-10-10-тема.json   # или пример-фото-gtt.json
npm run carousel -- 2026-10-10-тема            # слайды и лист _лист.jpg
npm run carousel -- 2026-10-10-тема --guides   # проверка полей: лист _лист-зоны.jpg + итог по слайдам в терминале
```

Типы слайдов (поля — в `reels-studio/CLAUDE.md`, раздел «Карусели Instagram»):

| Тип | Что на слайде |
|---|---|
| `photoCover` | обложка: крупное фото, кикер, заголовок с `**акцентом**`, подзаголовок, «листай» |
| `photoCard` | фото + заголовок + текст (+ подпись к фото, источник) |
| `photoFull` | фото на весь слайд, текст на плашке внизу (фото не затемняется) |
| `photoPair` | два фото с плашками и подписями: «обычно / с нами» (`pair: "compare"`) или два кадра истории (`"story"`); `layout: "row"` или `"column"` |
| `photoStat` | фото + крупная цифра на плашке + подпись |
| `photoCta` | финал: коллаж из 2–3 фото, заголовок, кнопка с сайтом бренда (у Aura — робот) |

На любом фото-слайде с текстом (`photoCard`, `photoFull`) можно дать список `items` (галочки; `"numbered": true` — шаги
с номерами) и карточки логотипов `logos` (`[{"src": "agibot"}, …]` — id из `library/brands.json` или путь; до 6 — по три в ряд, 7–8 — по четыре, 9 — сеткой 3×3). Сравнение
«самому / с нами» без рамки: `photoPair` с `"frame": false` — два фото на весь слайд рядом, пункты сторон — `images[].items`.
Карусели по сценариям пользователя: фото Higgsfield (0,5 кредита) лежат в `source-videos/карусели/<имя>/NN.jpg`, журнал
генераций — `_генерации.json` рядом. Образцы: `props/carousels/2026-10-10-foto-agibot-a2-w.json`, `2026-10-10-foto-tur-robotics.json`.

Главные поля: `image` (путь от корня репозитория), `focus` («50% 30%» — что оставить при обрезке), `zoom`,
`images` (для пар и коллажа: путь или `{src, focus, zoom, label, caption, logo}`), `caption` (подпись к фото),
`source` (источник цифры), `logo` (логотип бренда на фото: id из `library/brands.json`, например `"ubtech"`,
или до двух: `["huawei", "tencent"]`), `frame` (подача фото, см. ниже).

**Чередование подачи фото** (решение пользователя 10.10.2026): после обложки слайды идут через один —
*без рамки* (фото на весь слайд, текст на плашке: `photoFull`, `photoCard` / `photoStat` с `"frame": false`) и
*в рамке* (фото в карточке на фоне бренда: `photoCard`, `photoStat`, `photoPair`, `photoCta`). Порядок примеров:
обложка → без рамки → в рамке → без рамки → в рамке → без рамки → финал в рамке. На слайдах без рамки главное
на фото должно быть в верхних ~55 % кадра (ниже — плашка): подвиньте `focus` или приблизьте `zoom`.

**Робот Aura**: на финале (`photoCta`) по умолчанию, на других слайдах в рамке — полем `mascot` (`wave`, `point`,
`pointUp`, …), лучше не больше одного-двух раз за карусель (в примере — обложка и финал). На слайдах без рамки,
`photoPair` и `photoFull` робота нет.

**Цвет GTT** (10.10.2026): фон светлее, синий ближе к сайту — `#215BE2 → #1A45B8`, акцент выделенных слов
`#7DD3FC` (голубая грань логотипа), кнопка финала белая с синим текстом. Сравнение «было / стало» —
`finished-videos/карусели/пример-фото-gtt/_лист-цвет.jpg`.

**Правила Instagram** — шаблон соблюдает сам: 1080×1350 (4:5); поля по бокам 72 px, сверху и снизу 64 px для любых
элементов; на обложке заголовок и главное на фото — в квадрате 1080×1080 (сетка профиля срезает по 135 px сверху и
снизу) и в центральных 1012 px (сетка 3:4); кегль от 30 px; на каждом слайде счётчик «n / N», знак бренда и сайт,
стрелка «листай» (кроме последнего). Длинный текст уменьшается сам (до 62 %, не мельче 30 px); не влез и так —
`--guides` покажет красную рамку «текст не влезает». Предлоги не висят в конце строки, «13 361» и «1500–2000» не рвутся.

### Stories-анонс карусели

```bash
cp props/announces/пример-gtt.json props/announces/<имя>.json   # или пример-aura.json; в stories — по анонсу на сторис
npm run announce -- <имя>            # → finished-videos/анонсы/<имя>/01.png … и лист _лист.jpg
npm run announce -- <имя> --guides   # безопасная зона Stories (250 px сверху, 380 px снизу): лист _лист-зоны.jpg
```

1080×1920: знак бренда и «Новый пост», заголовок, обложка карусели стопкой со следующими слайдами (`cover`, `back`),
плашка внизу (`note`). Вторник после карусели, связка недели — в POST-HUB `GTT/INSTAGRAM/RULES.md`.

### Reels из карусели (с музыкой)

API Instagram не ставит музыку к каруселям, поэтому к карусели делается Reels-версия: слайды листаются сами под трек.

```bash
npm run carousel-reel -- <имя карусели>                 # → finished-videos/<имя>-reels.mp4 + раскадровка в finished-videos/раскадровки/
npm run carousel-reel -- <имя> --music inspiring-ambient-motivation-soundrider   # трек из library/music.json
npm run carousel-reel -- <имя> --seconds 4              # одинаково на слайд (без флага — по длине текста, 3,5–5,5 с, финал +1 с)
npm run carousel-reel -- <имя> --guides                 # кадр с безопасной зоной Reels и кадром ленты 4:5
```

1080×1920, 30 fps: слайд 952×1190 по центру безопасной зоны, смена — пролистывание влево с тихим «вжух», музыка к ~−15 LUFS.
Секунды слайдов — `props/carousel-reels/<имя>-reels.json` (правки сохраняются при повторном запуске, `--reset` — пересчитать).
У Aura по умолчанию робот-ведущий: живой 3D-робот справа под слайдом «вытаскивает» каждый слайд, начиная с первого,
из-за правого края (вперёд, как листают карусель), машет после обложки, на финале показывает на кнопку и машет
(`--no-host` — без него, робот остаётся картинкой на слайдах). Вступление ~3 с: большой робот машет, рядом робособака
(`AuraDog`), за ними крутится печать Aura Robotics; потом печать исчезает, робот с собакой уменьшаются и уходят под слайд.

## Как сделать ролик

1. Положите видео, фото или музыку в папку репозитория `source-videos/`, например `source-videos/clip.mp4`.
   Remotion берёт файлы оттуда (настроено в `remotion.config.ts`), в `mediaSrc` пишется путь внутри папки: `clip.mp4`.
2. В Studio откройте `Reel`, в панели Props впишите `mediaSrc`, текст обложки, финала и слова субтитров.
3. Субтитры: слова с метками времени в секундах. Для быстрого старта есть `autoWords()` в `src/lib/autoWords.ts`.
   Первые `hookSeconds` секунд занимает обложка, субтитры идут после неё и до финала.
4. Включите `showSafeZone`, чтобы проверить, что текст не уходит под интерфейс Instagram.

## Рендер

```bash
npm run render:reel
npm run render:text
npm run cover          # обложка в ../finished-videos/cover.png

# с вашими данными:
npx remotion render src/index.ts Reel ../finished-videos/my-reel.mp4 --props=./props/example.json
```

Готовые ролики сохраняются в папку репозитория `finished-videos/`.

## Субтитры по речи (Whisper)

```bash
npm run setup:whisper                                   # один раз: whisper.cpp + модель
npm run transcribe -- ../source-videos/папка/clip.mp4    # → clip.words.json рядом с видео
```

Слова с таймингами из `clip.words.json` вставьте в поле `words` props-файла. Нужны ffmpeg, cmake и Python.

## Говорящая голова (TalkReel)

```bash
npm run transcribe -- ../source-videos/папка/clip.MOV                                  # слова с таймингами
npm run cut -- ../source-videos/папка/clip.MOV --words ../source-videos/папка/clip.words.json  # чистый звук, без пауз
npm run site -- https://globaltechtour.ru ../source-videos/папка/site/site.png          # скриншот сайта для финала
npm run grid -- ../source-videos/папка/_work/clip.cut.mp4                            # сетка, линия глаз → layout.json (focus для зумов)
npm run matte -- ../source-videos/папка/_work/clip.cut.mp4 --ranges 0.8-4,18-24      # вырезать спикера из фона (нужен pip install onnxruntime)
npx remotion render src/index.ts TalkReel ../finished-videos/имя.mp4 --props=./props/имя.json
```

Пример props: `props/2026-10-07-byt-tehnika.json`, стиль референса — `TalkReelPro` и `props/2026-10-07-byt-tehnika-v3.json`.

Пути в props считаются от корня репозитория (public-папка Remotion — корень VIDEO-HUB):
`source-videos/...`, `интернет-материалы/...`.

- `cities` — фото городов внизу кадра (верхний край размыт «пеленой», без резкой границы), пока спикер перечисляет города (спикер сдвигается вверх);
  поля `src`, `name`, `at`, `until`, `kicker` (подпись вместо «Маршрут · n/N»).
- `zooms` — зумы на словах: `{"at": 6.3, "kind": "punch", "amount": 0.2, "hold": 0.6}` (резкий, со звуком) или
  `"kind": "push"` (плавный медленный наезд).
- `stockDrop` — падающий график за спиной: `{"at": 2.2, "until": 8.5, "label": "NVDA"}` (отрезок добавить в `npm run matte --ranges`).
- `numbers[].tone: "down"` — красная цифра падения.
- `broll[].transition` — `circle` | `slide` | `zoom` | `wipe` | `fade` (без поля — по кругу).
- `checklists` — планшет с галочками: `{"title": "Что вы поймёте", "items": [{"text": "…", "at": 48.8}], "until": 55.4}`.
- Картинки Higgsfield: каталог `source-videos/higgsfield/каталог.json`, использованные — `использовано.json` (не повторять).
- `music` — фоновая музыка: `{"src": "интернет-материалы/музыка/трек.mp3", "volume": 0.09, "outroVolume": 0.22}`.
- `site` — телефон в финале: `home` (главная, прокрутка) → `catalog` (каталог экспедиций) → `route` (кадры маршрута по дням).
  Кадры маршрута снимаются Playwright: прокрутить страницу экспедиции к блоку «Маршрут» и жать «следующий день».

## Reels и Stories

```bash
npx remotion render src/index.ts TalkReelPro ../finished-videos/имя.mp4 --props=./props/имя.json                 # Reels
npx remotion render src/index.ts TalkReelPro ../finished-videos/имя-stories.mp4 --props='{"format":"stories"}'  # Stories
npm run stories -- ../finished-videos/имя-stories.mp4 --at 58.3   # части по ≤60 с для Stories
```

Ролики GTT сами начинаются и заканчиваются фирменной заставкой (стеклянная пирамида, надпись GLOBAL TECH TOUR из осколков):
+1,8 с в начале, +1,5 с в конце. Без заставки — `"bumper": false` в props. Готовые ролики перерисовать с заставкой:

```bash
python3 scripts/rebumper.py 2026-10-07-intro 2026-10-08-roboty   # Reels + Stories + лёгкие копии + раскадровка
```

## Раскадровка

```bash
npm run frames -- ../finished-videos/my-reel.mp4            # кадр каждую секунду
npm run frames -- ../finished-videos/my-reel.mp4 --at 1,3.5  # нужные моменты
```

Картинка с кадрами и таймкодами появится в `finished-videos/frames/`. Раскадровку готового ролика копируйте в
`finished-videos/раскадровки/имя.jpg` — она хранится в репозитории. Нужны ffmpeg и Python с Pillow.

## Облачная среда Claude

В облаке Remotion берёт уже установленный браузер (`remotion.config.ts`), скачивать его не нужно.
На вашем компьютере этот путь не существует, и Remotion работает как обычно.

## Где что лежит

- `source-videos/` — сырьё: съёмка, клипы, фото, музыка.
- `reels-studio/props/` — сценарий каждого ролика, `props/имя.json`.
- `reels-studio/library/` — библиотеки быстрого пайплайна (бренды, города, фразы, темы, музыка).
- `source-videos/логотипы/<отрасль>/` — все логотипы брендов, по отраслям.
- `finished-videos/` — готовые ролики и обложки.
- `интернет-материалы/` — всё, что скачано из интернета (фото городов и т.п.), авторы и лицензии в `АВТОРЫ.md`.

Видео и аудио хранятся через Git LFS (`.gitattributes`), поэтому перед первой работой выполните `git lfs install`.

## Перебивки: режимы показа спикера

В `broll[]` поле `mode`: без поля / `cutout` — спикер вырезан и стоит на фоне картинки; `pip` — карточка в правом нижнем
углу; `screen` — спикер в большом «экране» с рамкой по центру (как в финале). Для `pip` и `screen` вырезка (`matte`) не нужна.
Aura: печать над головой сама уменьшается и поднимается на наездах (`faceTop` — верх лица, по умолчанию `focus.y − 230`).
