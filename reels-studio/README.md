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
Новый бренд: логотип в `source-videos/логотипы/<отрасль>/` и строка в `brands.json`.
Скриншоты маршрута экспедиции: `npm run route -- /expeditions/<slug> ../source-videos/сайт/маршруты/<slug> day`.
Установка всего нужного: `npm run setup` (в облаке Claude запускается сама при старте сессии).

## Второй бренд: Aura Robotics

Тот же шаблон `TalkReelPro`, стиль сайта aura-robotics.ru: в props `"brand": "aura"` (или `npm run auto -- <ссылка> --theme aura`).
Круглый логотип-печать крутится над головой, 3D-робот с сайта сам ходит по кадру: подаёт плашки, ставит галочки
в чек-листах, прыгает на цифрах, в финале показывает на кнопку сайта. Превью логотипа и жестов робота — композиция
`AuraPreview` в Studio. Настройки брендов — `src/brand.ts`.

## Карусели Instagram

```bash
cp props/carousels/пример-gtt.json props/carousels/2026-10-10-тема.json   # или пример-aura.json
npm run carousel -- 2026-10-10-тема      # → finished-videos/карусели/2026-10-10-тема/01.png …
```
Слайды 1080×1350: обложка, текст, список с галочками, шаги, крупная цифра, фото, цитата, сравнение, логотипы, призыв.
Стиль — `"brand": "gtt"` или `"aura"`.

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
