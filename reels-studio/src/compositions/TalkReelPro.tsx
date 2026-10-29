import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {theme} from "../theme";
import {body, display} from "../fonts";
import {SafeZone} from "../components/SafeZone";
import {SiteLogo} from "../components/SiteLogo";
import {FlagArc, WavingFlag3D} from "../components/Flags";
import {BRANDS, BrandCtx, useBrand} from "../brand";
import {AuraBadge} from "../components/AuraBadge";
import {AuraMascot, type GestureKind, type MascotPlan, type MascotStay} from "../components/AuraMascot";
import {GttIntro} from "./GttIntro";
import {Emojis} from "../components/Emojis";
import {brandWithPalette, LIFT_LISTS, Lists, panelPush, Panels, SpeakerStage, speakerActive, textBehindActive, Texts3D} from "../components/MontazhFx";
import {OdBadge} from "../components/OdBadge";
import {LinkArrow, SocialCard, SocialGrid} from "../components/SocialCard";
import {activeScreen, captionTopFor, chainScreens, DropBackdrop, DropFrame, OD_LINKS, ScreenPanel, speakerCardStyle, speakerShift} from "../components/ScreenOverlay";
import {HookTitle, hookSounds, type HookItem} from "../components/HookTitle";
import {bwFilter, ColorWipes, EpisodeOutro} from "../components/SeriesFx";
import {InScreens, inScreenActive} from "../components/ScreenInsert";
import {Asks, bgActive, capStyleAt, Cards, Chats, defocusAt, DuoWord, floatBehindActive, Floats, LightLeaks, lowCaptions, Marks, outroActive, Outros, RefCaptions, SpeakerBg, Splits, titleBehindActive, Titles, whipAt, WhipFilter} from "../components/RefFx";
import {Chapters, DotsGrid, Drums, ringActive, Rings, Searches, Stamps, Votes, voteActive, WordCounters} from "../components/TrendFx";
import {Charts, DocuBack, docuActive, Docus, neonActive, Neons, orbitActive, Orbits, panelSplitActive, promptActive, Prompts, Timelines, WatermarkCorner, Widgets} from "../components/ShowcaseFx";
import {EdlAudio, EdlCtx, placeEdl, SpeakerVideo} from "../components/EdlVideo";
import {loadFont as loadOswald} from "@remotion/google-fonts/Oswald";

const oswald = loadOswald("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]});

// «Говорящая голова» в стиле референса пользователя (07.10.2026):
// видео на весь экран, сверху плашка ▲ GLOBAL TECH TOUR, крупные белые субтитры по центру
// с синим текущим словом, белые плашки-списки слева сверху (с зачёркиванием),
// карточки логотипов, крупные цифры, зумы на склейках, в финале — сайт и CTA.

const chip = z.object({text: z.string(), at: z.number(), strike: z.number().optional()});
export const talkReelProSchema = z.object({
  mediaSrc: z.string(), // склеенное видео из source-videos/…/_work/имя.cut.mp4 (звук из него же)
  cutoutSrc: z.string(), // тот же ролик с вырезанным спикером (прозрачный webm из scripts/matte.py)
  words: z.array(z.object({text: z.string(), start: z.number(), end: z.number()})),
  accentWords: z.array(z.string()), // слова, которые всегда синие (бренды, цифры)
  cuts: z.array(z.number()), // моменты склеек (секунды) — на них чередуется зум
  // scale — плашки крупнее (1.4 — когда спикер уехал в угол и сверху свободно, решение пользователя 29.10.2026)
  chips: z.array(z.object({until: z.number(), wrap: z.boolean(), items: z.array(chip), scale: z.number().optional()})),
  logos: z.array(
    z.object({
      until: z.number(),
      items: z.array(z.object({src: z.string(), at: z.number(), scale: z.number().optional()})),
      // scale — размер карточек логотипов (1 — обычный; 1.5 и 2 — по просьбе пользователя 08.10.2026)
      scale: z.number().optional(),
      // flip: одна карточка справа от лица; на item[1].at переворачивается по вертикальной оси
      flip: z.boolean().optional(),
    }),
  ),
  // tone: "down" — красная цифра (падение), по умолчанию синяя
  numbers: z.array(
    z.object({text: z.string(), sub: z.string(), at: z.number(), until: z.number(), tone: z.enum(["up", "down"]).optional(), count: z.boolean().optional()}),
  ),
  // Падающий биржевой график ЗА спикером (спикер вырезан и стоит перед линией); label — тикер
  // direction: "up" — зелёный растущий график (рост рынка, продаж); по умолчанию "down" — красный падающий
  stockDrop: z
    .object({at: z.number(), until: z.number(), label: z.string(), direction: z.enum(["down", "up"]).optional()})
    .optional(),
  // Перебивки: картинка на весь экран, спикер уменьшается в окошко по центру (звук не прерывается)
  // transition: как картинка появляется за спиной — circle (круг из центра), slide (въезд сбоку с размытием),
  // zoom (наезд из размытия), wipe (диагональная шторка), fade. Без поля — чередуются по порядку.
  broll: z.array(
    z.object({
      src: z.string(),
      at: z.number(),
      until: z.number(),
      transition: z.enum(["circle", "slide", "zoom", "wipe", "fade"]).optional(),
      // mode: cutout (по умолчанию) — спикер вырезан и стоит перед картинкой;
      // pip — спикер уезжает карточкой в правый нижний угол, картинка на весь экран (решение пользователя 08.10.2026)
      // screen — как в финале: спикер в большом «экране» с рамкой по центру, картинка на весь кадр за ним
      mode: z.enum(["cutout", "pip", "screen"]).optional(),
    }),
  ),
  // Чек-лист «планшет с зелёными галочками» для перечислений: спикер уходит наверх, внизу планшет, пункты
  // появляются на своих словах, галочка рисуется.
  checklists: z
    .array(z.object({title: z.string(), items: z.array(z.object({text: z.string(), at: z.number()})), until: z.number()}))
    .default([]),
  // Города: фото в нижней половине экрана, пока спикер их перечисляет; спикер остаётся сверху
  cities: z.array(z.object({src: z.string(), name: z.string(), at: z.number(), until: z.number(), kicker: z.string().optional()})),
  // флаги стран полукругом над головой (картинки флагов), на словах про страны
  flags: z.array(z.object({at: z.number(), until: z.number(), items: z.array(z.string())})).optional(),
  // большой развевающийся 3D-флаг за спиной спикера (спикер вырезан) — отрезок нужен в --ranges для npm run matte
  bgFlags: z.array(z.object({at: z.number(), until: z.number(), src: z.string()})).optional(),
  // видео внизу экрана (например, снятая пользователем работа роботов): нижняя половина кадра, спикер поднят, подпись
  clips: z
    .array(z.object({at: z.number(), until: z.number(), src: z.string(), from: z.number().optional(), kicker: z.string().optional(), title: z.string().optional()}))
    .optional(),
  // карточка канала в соцсети (Stories «про мои каналы», 14.10.2026): сверху слева, кнопка «Подписаться» нажимается в pressAt
  socials: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        network: z.enum(["telegram", "youtube", "vk", "instagram", "linkedin", "site"]),
        name: z.string(),
        handle: z.string().optional(),
        note: z.string().optional(),
        logo: z.string().optional(),
        button: z.string().optional(),
        pressAt: z.number().optional(), // секунды ролика
      }),
    )
    .optional(),
  // где стоят субтитры (верх строки, px); по умолчанию 1250. Крупное селфи (лицо на весь кадр) — ниже подбородка, ~1310
  captionTop: z.number().optional(),
  // строка значков соцсетей с заголовком («Подписывайтесь везде»): значки выскакивают по очереди, сверху слева
  socialGrid: z.array(z.object({at: z.number(), until: z.number(), title: z.string(), items: z.array(z.string())})).optional(),
  // «экраны» сайтов и Telegram-каналов (видео прокрутки scripts/site_scroll.mjs): drop — шторка сверху, спикер вниз;
  // bottom — панель снизу, спикер вверх; full — страница на весь кадр, спикер вырезан и уменьшен внизу справа (нужна вырезка
  // cutoutSrc на этот отрезок — npm run matte --ranges). title — полное название канала/сайта, url — адрес
  screens: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        src: z.string(),
        from: z.number().optional(),
        layout: z.enum(["drop", "bottom", "full"]),
        title: z.string().optional(),
        url: z.string().optional(),
        network: z.enum(["telegram", "site", "linkedin", "youtube", "instagram"]).optional(),
        icon: z.string().optional(), // свой значок в подписи (логотип сайта Aura / GTT); без поля — значок сети
      }),
    )
    .optional(),
  // ссылки, которые печатаются на фоне под карточкой спикера в подаче drop (по умолчанию — каналы и сайты Остапа)
  links: z.array(z.object({url: z.string(), icon: z.string().optional()})).optional(),
  // размер субтитров (px, по умолчанию 66; Stories ostapdotcenko — 52, решение пользователя 14.10.2026 «уменьшить субтитры»)
  captionSize: z.number().optional(),
  // знак бренда сверху (печать / логотип): false — не показывать
  badge: z.boolean().optional(),
  // большая стрелка вверх с подписью («Ссылка выше») — справа сверху, на словах «ссылочка будет выше»
  arrows: z.array(z.object({at: z.number(), until: z.number(), text: z.string()})).optional(),
  // живые эмодзи (components/Emojis.tsx): src — интернет-материалы/эмодзи/<название>.webp, anim — pop / float / shake / burst
  emojis: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        src: z.string(),
        x: z.number().optional(),
        y: z.number().optional(),
        size: z.number().optional(),
        anim: z.enum(["pop", "float", "shake", "burst"]).optional(),
      }),
    )
    .optional(),
  // Приёмы Монтажной (решение пользователя 22.10.2026, components/MontazhFx.tsx):
  // speaker — спикер уменьшается в угол: рамка, круг или вырезка по контуру (нужен cutoutSrc), фон — размытие/бренд/картинка;
  speaker: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        corner: z.enum(["tl", "tr", "bl", "br", "top", "bottom", "center", "left", "right"]).optional(),
        scale: z.number().optional(),
        style: z.enum(["frame", "round", "contour"]).optional(),
        bg: z.enum(["blur", "brand", "dark", "image", "app"]).optional(),
        image: z.string().optional(),
        tilt: z.number().optional(),
        title: z.string().optional(),
        windows: z.number().optional(),
      }),
    )
    .optional(),
  // panels — выдвижные экраны с видео или фото: сверху, снизу, с боков или из углов; спикер отодвигается (push)
  panels: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        src: z.string(),
        from: z.enum(["top", "bottom", "left", "right", "tl", "tr", "bl", "br"]).optional(),
        size: z.number().optional(),
        title: z.string().optional(),
        push: z.boolean().optional(),
        fit: z.enum(["cover", "contain"]).optional(),
        from_s: z.number().optional(),
        h: z.number().optional(),
      }),
    )
    .optional(),
  // texts — тексты в 3D: положение, размер, повороты по трём осям, шрифт, цвета; plane behind — за спикером (нужен cutoutSrc)
  texts: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        text: z.string(),
        x: z.number().optional(),
        y: z.number().optional(),
        size: z.number().optional(),
        rx: z.number().optional(),
        ry: z.number().optional(),
        rz: z.number().optional(),
        color: z.string().optional(),
        color2: z.string().optional(),
        font: z.enum(["grotesk", "display", "serif", "hand", "mono", "body", "brush", "script"]).optional(),
        plane: z.enum(["behind", "front"]).optional(),
        anim: z.enum(["rise", "fly", "type", "swing", "fade", "write"]).optional(),
        depth: z.number().optional(),
        shine: z.boolean().optional(),
      }),
    )
    .optional(),
  // lists — перечисления в разных подачах: флипчарт, карточки, стикеры, крупные номера, «пилюли», печатная машинка
  lists: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        style: z.enum(["flip", "cards", "stickers", "numbers", "bubbles", "typewriter", "progress"]),
        title: z.string().optional(),
        items: z.array(z.object({text: z.string(), at: z.number()})),
      }),
    )
    .optional(),
  // palette — цвета текста на весь ролик (субтитры, акцент, текст на акценте); paletteAt — смена цветов на отрезке
  palette: z.object({text: z.string().optional(), accent: z.string().optional(), ink: z.string().optional()}).optional(),
  paletteAt: z
    .array(z.object({at: z.number(), until: z.number(), text: z.string().optional(), accent: z.string().optional(), ink: z.string().optional()}))
    .optional(),
  // второй ракурс (вторая камера, scripts/angle_b.py): в отрезках shots кадр переключается на боковой план
  angleB: z.object({src: z.string(), shots: z.array(z.object({at: z.number(), until: z.number()}))}).optional(),
  // Зумы на ключевых словах: punch — резкий наезд за 3 кадра (со звуком whip), push — плавный медленный наезд.
  // Держится hold секунд, потом плавно уходит. Между склейками уровни зума тоже чередуются (часть — плавно).
  zooms: z
    .array(z.object({at: z.number(), kind: z.enum(["punch", "push", "pull", "macro"]), amount: z.number(), hold: z.number(), target: z.enum(["eyes", "lips"]).optional()}))
    .default([]),
  sfx: z.object({pop: z.string(), whoosh: z.string(), whip: z.string().optional(), click: z.string().optional()}),
  // отдельный звук в нужную секунду (решение пользователя 29.10.2026: «звук щелчка и сверху надпись крупно»): kind — какой из sfx
  sounds: z.array(z.object({at: z.number(), kind: z.enum(["pop", "whoosh", "whip", "click"]), volume: z.number().optional()})).optional(),
  // Фоновая музыка (только треки с коммерческой лицензией); volume ~0.1 под голосом, громче в финале
  // duck — во сколько раз тише музыка, пока говорит спикер (0.5 ≈ −6 дБ); в паузах от 0,35 с возвращается за 0,25 с
  music: z.object({src: z.string(), volume: z.number(), outroVolume: z.number(), duck: z.number().optional()}).optional(),
  speechSeconds: z.number(),
  // Финал: на экране телефона главная страница (прокрутка) → каталог экспедиций (прокрутка) → маршрут по дням
  site: z.object({at: z.number(), home: z.string(), catalog: z.string(), route: z.array(z.string())}),
  cta: z.string(),
  ctaSeconds: z.number(),
  // true — за последние ~1,6 с спикер возвращается из карточки в полный кадр; по умолчанию ролик заканчивается на сайте
  // в телефоне (решение пользователя 28.10.2026: «ролик должен заканчиваться там, где показывается наш сайт»)
  finaleBack: z.boolean().default(false),
  showSafeZone: z.boolean(),
  // reels — как есть; stories — логотип ниже верхней панели Stories (полоски прогресса и аватар занимают ~200 px)
  format: z.enum(["reels", "stories"]).default("reels"),
  // бренд: gtt — GlobalTechTour, aura — Aura Robotics (свой стиль, круглый логотип и 3D-маскот, src/brand.ts),
  // od — личный сайт ostapdotcenko.ru (кость, чернила, маркер, печать-штамп «ОД»)
  brand: z.enum(["gtt", "aura", "od"]).default("gtt"),
  // фирменная заставка GTT в начале и конце (решение пользователя 12.10.2026: интро shards, аутро shards); у Aura её нет;
  // false — без заставки; {intro, outro, introVariant, outroVariant} — выборочно
  bumper: z
    .union([
      z.literal(false),
      z.object({
        intro: z.boolean().optional(),
        outro: z.boolean().optional(),
        introVariant: z.enum(["shards", "blocks", "light"]).optional(),
        outroVariant: z.enum(["shards", "blocks", "light"]).optional(),
      }),
    ])
    .optional(),
  // Линия глаз из scripts/grid.py (_work/имя.cut.layout.json): точка между глазами — центр всех зумов,
  // поэтому при наездах глаза остаются на своей линии и не «прыгают»
  focus: z.object({x: z.number(), y: z.number()}).default({x: 540, y: 614}),
  faceTop: z.number().optional(), // верх лица (линия роста волос), y в кадре; без поля — focus.y − 230
  // Эффекты-хуки из референсов 15.10.2026 (components/HookTitle.tsx): текст за спикером — стена в 3D (wall), заголовок за
  // головой (behind, со столбиками букв columns), смешение гротеска и курсива (mix), слова по одному (words).
  // На отрезок [at, until] спикер вырезается (cutoutSrc) и стоит перед текстом — отрезок нужен в --ranges npm run matte.
  hooks: z
    .array(
      z.object({
        variant: z.enum(["wall", "behind", "mix", "words"]),
        at: z.number(),
        until: z.number(),
        lines: z.array(
          z.object({text: z.string(), at: z.number(), kind: z.enum(["bold", "italic"]).optional(), size: z.number().optional(), color: z.string().optional(), x: z.number().optional(), y: z.number().optional()}),
        ),
        columns: z.array(z.object({text: z.string(), at: z.number(), side: z.enum(["left", "right"]), step: z.number().optional(), x: z.number().optional()})).optional(),
        top: z.number().optional(),
        accent: z.string().optional(),
      }),
    )
    .optional(),
  // Переходы серии (components/SeriesFx.tsx): wipe — заливка цветом из угла в момент at; bw — ч/б с at до until, потом цвет
  fx: z
    .array(z.object({type: z.enum(["wipe", "bw", "leak", "whip", "defocus"]), at: z.number(), until: z.number().optional(), color: z.string().optional(), corner: z.enum(["tl", "tr", "bl", "br"]).optional()}))
    .optional(),
  // Приёмы из референсов Монтажной 23.10.2026 (components/RefFx.tsx): splits — «до / после» двумя экранами; titles —
  // заголовок «засечки или гротеск + рукопись» (plane behind — за спикером, нужен cutoutSrc); captionsAt — субтитры
  // на отрезке: plate (бежевая плашка), corner (угол, 2 строки, вторая золотом), quiet (тихие слева); chats — окно чата
  // с печатью; floats — картинки вылетают из-за головы; cards — карточка у груди; outros — финал с иконкой и @ником.
  // Ещё: zooms kind «macro» (target eyes / lips), fx type «leak» (вспышка света), speaker bg «app» (окно приложения).
  splits: z
    .array(z.object({at: z.number(), until: z.number(), top: z.string().optional(), bottom: z.string().optional(), src: z.string().optional(), handle: z.string().optional()}))
    .optional(),
  titles: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        text: z.string(),
        script: z.string().optional(),
        font: z.enum(["serif", "grotesk", "box"]).optional(),
        y: z.number().optional(),
        color: z.string().optional(),
        scriptColor: z.string().optional(),
        band: z.boolean().optional(),
        plane: z.enum(["behind", "front"]).optional(),
        bg: z.string().optional(),
        sub: z.string().optional(),
        still: z.boolean().optional(),
        strikeAt: z.number().optional(),
        echo: z.boolean().optional(),
      }),
    )
    .optional(),
  captionsAt: z.array(z.object({at: z.number(), until: z.number(), style: z.enum(["plate", "corner", "quiet", "mini", "duo", "ladder", "marker", "pill", "none"]), y: z.number().optional()})).optional(),
  chats: z.array(z.object({at: z.number(), until: z.number(), text: z.string(), image: z.string().optional(), label: z.string().optional(), y: z.number().optional()})).optional(),
  floats: z.array(z.object({at: z.number(), until: z.number(), items: z.array(z.string()), plane: z.enum(["behind", "front"]).optional()})).optional(),
  cards: z.array(z.object({at: z.number(), until: z.number(), src: z.string().optional(), title: z.string(), sub: z.string().optional(), y: z.number().optional()})).optional(),
  outros: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        handle: z.string(),
        network: z.enum(["instagram", "telegram", "site"]).optional(),
        text: z.string().optional(),
        // финал с сеткой превью (референс 28.10.2026): заголовок-слово, пилюля, картинки или N кадров самого ролика
        title: z.string().optional(),
        pill: z.string().optional(),
        grid: z.array(z.string()).optional(),
        gridFrames: z.number().optional(),
        labels: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  // Приёмы из каталогов skillry и prompt-motion.com (23.10.2026, свой код): marks — обвести/подчеркнуть/галочка/крестик/
  // стрелка «от руки»; asks — пузырь-вопрос зрителю; bgs — свой фон за вырезанным спикером (outline — белая обводка-стикер);
  // counters — сквозной счётчик слова; searches — строка поиска; stamps — штамп; dots — точки «N из M»; chapters — главы и
  // полоса прогресса; votes — сетка-голосование; drums — барабан слов; rings — кольцо слов вокруг головы
  marks: z
    .array(z.object({at: z.number(), until: z.number(), kind: z.enum(["circle", "underline", "check", "cross", "arrow"]), x: z.number(), y: z.number(), w: z.number().optional(), h: z.number().optional(), color: z.string().optional()}))
    .optional(),
  asks: z.array(z.object({at: z.number(), until: z.number(), text: z.string(), emoji: z.string().optional(), sub: z.string().optional(), side: z.enum(["left", "right"]).optional()})).optional(),
  bgs: z.array(z.object({at: z.number(), until: z.number(), kind: z.enum(["grid", "paper", "gradient", "image"]), src: z.string().optional(), outline: z.boolean().optional()})).optional(),
  counters: z.array(z.object({word: z.string(), label: z.string().optional(), from: z.number().optional(), until: z.number().optional()})).optional(),
  searches: z.array(z.object({at: z.number(), until: z.number(), text: z.string(), items: z.array(z.string()).optional(), y: z.number().optional()})).optional(),
  stamps: z.array(z.object({at: z.number(), until: z.number(), text: z.string(), color: z.string().optional(), x: z.number().optional(), y: z.number().optional(), rot: z.number().optional()})).optional(),
  dots: z.array(z.object({at: z.number(), until: z.number(), value: z.number(), total: z.number().optional(), label: z.string().optional(), y: z.number().optional()})).optional(),
  chapters: z.array(z.object({at: z.number(), title: z.string()})).optional(),
  chapterBar: z.boolean().optional(),
  votes: z.array(z.object({at: z.number(), until: z.number(), title: z.string().optional(), items: z.array(z.string()), images: z.array(z.string()).optional()})).optional(),
  drums: z.array(z.object({at: z.number(), until: z.number(), items: z.array(z.string()), prefix: z.string().optional(), y: z.number().optional()})).optional(),
  rings: z.array(z.object({at: z.number(), until: z.number(), items: z.array(z.string())})).optional(),
  // Приёмы референса 28.10.2026 «монтаж через Claude» (components/ShowcaseFx.tsx; акцент — **слово**, строки — « / »):
  // widgets — стеклянные виджеты вокруг головы; docus — «документалка» (ч/б спикер, свечение за головой — нужна вырезка,
  // узкий заголовок, плашка с именем, кнопка «Подписаться» с курсором); orbits — карточки по орбите вокруг головы (задняя
  // половина за спикером); charts — столбики сверху, спикер карточкой снизу; timelines — «монтажный стол» сверху;
  // neons — неоновая вывеска над головой + прожектор; prompts — команда в чате на клавиатуре → ролик раскрывается на весь кадр;
  // watermark — @ник с иконкой в углу весь ролик. Ещё: lists style «progress», outros grid / title / pill.
  widgets: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        items: z.array(z.object({kind: z.enum(["stat", "progress", "profile", "chart", "player", "ring", "badge"]), value: z.string().optional(), label: z.string().optional(), sub: z.string().optional(), image: z.string().optional()})),
        caption: z.string().optional(),
      }),
    )
    .optional(),
  docus: z
    .array(z.object({at: z.number(), until: z.number(), title: z.string(), kicker: z.string().optional(), name: z.string().optional(), handle: z.string().optional(), button: z.string().optional(), color: z.string().optional()}))
    .optional(),
  orbits: z.array(z.object({at: z.number(), until: z.number(), items: z.array(z.string())})).optional(),
  charts: z
    .array(z.object({at: z.number(), until: z.number(), title: z.string(), bars: z.array(z.object({label: z.string(), value: z.number(), hi: z.boolean().optional()})), avg: z.number().optional(), color: z.string().optional()}))
    .optional(),
  timelines: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        title: z.string(),
        rows: z.array(z.object({label: z.string(), value: z.string()})).optional(),
        clips: z.array(z.string()).optional(),
        grades: z.array(z.string()).optional(),
        progress: z.number().optional(),
        label: z.string().optional(),
      }),
    )
    .optional(),
  neons: z.array(z.object({at: z.number(), until: z.number(), text: z.string(), color: z.string().optional(), spot: z.boolean().optional()})).optional(),
  prompts: z.array(z.object({at: z.number(), until: z.number(), text: z.string(), reply: z.string().optional(), hint: z.string().optional()})).optional(),
  watermark: z.object({handle: z.string(), network: z.enum(["instagram", "telegram", "site"]).optional(), from: z.number().optional(), until: z.number().optional()}).optional(),
  // «Экран в кадре» (референс dfcdojr, components/ScreenInsert.tsx): графика в настоящем экране кадра по 4 углам quad
  // (TL, TR, BR, BL, px кадра), идёт вместе с наездами; plane behind — руки спикера поверх (нужна вырезка)
  inscreens: z
    .array(
      z.object({
        at: z.number(),
        until: z.number(),
        quad: z.array(z.tuple([z.number(), z.number()])).optional(),
        kind: z.enum(["text", "chart", "cards", "list", "steps", "icon", "media"]),
        curve: z.enum(["arc", "drop", "wave", "rise"]).optional(),
        text: z.string().optional(),
        sub: z.string().optional(),
        items: z.array(z.string()).optional(),
        src: z.string().optional(),
        images: z.array(z.string()).optional(),
        plane: z.enum(["behind", "front"]).optional(),
        tone: z.enum(["dark", "light"]).optional(),
      }),
    )
    .optional(),
  // Серия роликов: «часть N/total · title» под печатью и финальная карточка «Дальше → часть N+1: next» (без next — все ссылки)
  episode: z.object({n: z.number(), total: z.number(), title: z.string(), next: z.string().optional(), nextN: z.number().optional()}).optional(),
  // 3d — субтитры объёмными буквами в перспективе (как 3D scroller из референса); flat — обычные
  captionStyle: z.enum(["flat", "3d"]).optional(),
  // цветокоррекция кадра спикера и перебивок: CSS filter («brightness(1.05) saturate(1.2)…»); её выбирают в Монтажной
  // (montazh/) по кадрам ролика — предпросмотр и рендер одинаковые
  grade: z.string().optional(),
  // отдельный звук вместо звука mediaSrc (Монтажная: «чистый голос» для предпросмотра, итог движка)
  audioSrc: z.string().optional(),
  // спокойные субтитры (решение пользователя 15.10.2026 по «Автозаводам»: «текст скачет»): всегда на одной высоте
  // captionTop (не переезжают при панелях городов, чек-листах, клипах), страница проявляется без «прыжка» масштаба
  captionFixed: z.boolean().optional(),
  // монтажный лист Монтажной: ролик из кусков нескольких исходников встык (components/EdlVideo.tsx) — только предпросмотр,
  // движок склеивает куски заранее; audio — свой звук куска (чистый голос)
  edl: z.array(z.object({src: z.string(), from: z.number(), to: z.number(), audio: z.string().optional()})).optional(),
});
export type TalkReelProProps = z.infer<typeof talkReelProSchema>;

const BLUE = theme.colors.accent;
const shadow = "0 4px 18px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.5)";

// ▲ GLOBAL TECH TOUR — логотип как на сайте (грани пирамиды) + название
export const LogoBar: React.FC<{darkFrom?: number}> = ({darkFrom = Infinity}) => {
  const frame = useCurrentFrame();
  const dark = frame >= darkFrom + 8; // на белом сайте логотип становится тёмным
  return (
  <div
    style={{
      position: "absolute",
      top: 120,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 22,
    }}
  >
    <svg width="58" height="58" viewBox="0 0 64 64" style={{filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.35))"}}>
      <path d="M24 6 L58 46 L8 54 Z" fill="#5BB8F5" />
      <path d="M24 6 L58 46 L36 40 Z" fill="#2F8FE0" />
      <path d="M24 6 L36 40 L8 54 Z" fill="#8AD0FA" />
    </svg>
    <div
      style={{
        fontFamily: display.fontFamily,
        fontWeight: 700,
        fontSize: 44,
        letterSpacing: "0.02em",
        color: dark ? theme.colors.text : "#FFFFFF",
        textShadow: dark ? "none" : shadow,
      }}
    >
      GLOBAL TECH TOUR
    </div>
  </div>
  );
};

// Субтитры по 3 слова по центру кадра, текущее и акцентные слова — синие
const BigCaptions: React.FC<{
  words: TalkReelProProps["words"];
  accent: string[];
  until: number;
  lowFrom: number;
  cities: TalkReelProProps["cities"];
  lists: TalkReelProProps["checklists"];
  broll?: TalkReelProProps["broll"];
  clips?: TalkReelProProps["clips"];
  top?: number;
  size?: number;
  screens?: TalkReelProProps["screens"];
  style3d?: boolean;
  fixed?: boolean;
  boards?: TalkReelProProps["checklists"];
}> = ({words, accent, until, lowFrom, cities, lists, broll = [], clips, top = 1250, size = 66, screens, style3d, fixed, boards = []}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (t >= until) return null;
  // по 3 слова, но группа рвётся на паузе дольше 0,7 с: иначе конец фразы и начало следующей висят вместе через всю
  // паузу — и поверх перебивки без речи (ролик SANY 25.10.2026: «компании. Вчера я» на кадрах цеха)
  const pages: TalkReelProProps["words"][] = [];
  for (const w of words) {
    const cur = pages[pages.length - 1];
    if (cur && cur.length < 3 && w.start - cur[cur.length - 1].end <= 0.7) cur.push(w);
    else pages.push([w]);
  }
  const page = [...pages].reverse().find((p) => p[0].start <= t);
  if (!page || t > page[page.length - 1].end + 0.5) return null;
  const pop = spring({frame: frame - Math.round(page[0].start * fps), fps, config: theme.motion.snappy, durationInFrames: 8});
  const clean = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}+]/gu, "");
  const B = useBrand();
  const dark = false;
  const low = frame >= lowFrom + 10; // в финале субтитры ниже карточки спикера
  // пока на экране сайт или канал (screens), субтитры стоят на бумажной плашке поверх экрана, а не на лице:
  // текст чернилами, акцентные слова — красным штампом (od) / синим (GTT) / графитом (Aura)
  const boxed = !low && (activeScreen(screens, t)?.k ?? 0) > 0.5;
  const onLight = (low && B.id === "od") || boxed; // od: финал на «кости» — субтитры чернилами, акцентные слова красным штампом
  const hotOnLight = B.id === "od" ? "#FF4A1F" : B.id === "gtt" ? B.accent : B.accentInk;
  const od = B.id === "od";
  // планшет-чек-лист (кроме флипчарта Aura): субтитры снизу прижаты к зажиму планшета и чуть мельче — растут вверх,
  // но не доходят до лица
  const board = !low && !fixed && !boxed && B.id !== "aura" && listAmount(boards, t) > 0.5;
  if (style3d && !boxed && !low && !board) return <Captions3D page={page} pageIndex={pages.indexOf(page)} accent={accent} top={top} t={t} />;
  const box: React.CSSProperties = boxed
    ? {display: "inline-block", background: od ? "#F7F4EC" : "#FFFFFF", border: od ? `3px solid ${B.accentInk}` : undefined, borderRadius: B.square ? 0 : 24, boxShadow: od ? `8px 8px 0 ${B.accentInk}` : "0 14px 34px rgba(0,0,0,0.3)", padding: "12px 22px 14px"}
    : {};
  return (
    <div
      style={{
        position: "absolute",
        left: 90 - 40 * pipAmount(broll, t),
        right: 90 + 300 * pipAmount(broll, t), // при карточке спикера в углу субтитры сдвигаются влево
        top: board ? undefined : low ? 1420 : fixed ? top : Math.max(cityAmount(cities, t), listAmount(lists, t), clipAmount(clips ?? [], t)) > 0.5 ? 780 : captionTopFor(screens, t, top),
        bottom: board ? 1920 - BOARD_TOP + 56 : undefined,
        textAlign: "center",
        fontFamily: B.captionFont,
        fontWeight: B.captionWeight,
        fontSize: board ? Math.round(size * 0.86) : size,
        lineHeight: 1.18,
        color: dark ? theme.colors.text : onLight ? B.accentInk : (B.captionText ?? "#FFFFFF"),
        textShadow: dark || onLight ? "none" : B.captionShadow ?? shadow,
        // тёмная обводка, чтобы белые субтитры читались и на светлых картинках-перебивках (od — без обводки, жёсткая тень)
        WebkitTextStroke: dark || boxed || B.captionShadow ? undefined : `10px ${B.captionStroke}`,
        paintOrder: "stroke fill",
        // на сайте — белая подложка, чтобы текст не сливался с кнопками страницы
        background: dark ? "rgba(255,255,255,0.94)" : undefined,
        borderRadius: dark ? 28 : undefined,
        padding: dark ? "18px 24px" : undefined,
        boxShadow: dark ? "0 16px 40px rgba(23,23,29,0.18)" : undefined,
        scale: fixed ? "1" : String(0.85 + 0.15 * pop),
        opacity: fixed ? Math.min(1, pop * 1.6) : pop,
      }}
    >
      <span style={box}>
      {page.map((w, i) => {
        // текущее слово — последнее начавшееся (без «двойных» выделений на стыке слов)
        const curIdx = page.reduce((k, x, j) => (x.start <= t ? j : k), -1);
        const current = i === curIdx && t < w.end + 0.35;
        const hot = current || accent.includes(clean(w.text));
        if (B.highlighter && current) {
          // Aura: текущее слово выделяется лимонным маркером, как на aura-robotics.ru — маркер «проводится» слева направо
          const swipe = interpolate(t, [w.start, w.start + 0.1], [0, 100], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
          const inked = swipe >= 55; // пока маркер не прошёл полслова — текст белый с обводкой, потом графитовый
          return (
            <span key={i}>
              <span
                style={{
                  color: inked || onLight ? B.accentInk : (B.captionText ?? "#FFFFFF"),
                  WebkitTextStroke: inked || boxed ? "0px" : undefined,
                  textShadow: inked ? "none" : undefined,
                  backgroundImage: `linear-gradient(${B.accent}, ${B.accent})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${swipe}% 78%`,
                  backgroundPosition: "0% 60%",
                  borderRadius: B.square ? 0 : 10,
                  padding: "0 8px",
                  boxDecorationBreak: "clone",
                  WebkitBoxDecorationBreak: "clone",
                }}
              >
                {w.text}
              </span>{" "}
            </span>
          );
        }
        return (
          <span key={i} style={{color: hot ? (dark ? BLUE : onLight ? hotOnLight : B.accent) : dark ? theme.colors.text : onLight ? B.accentInk : (B.captionText ?? "#FFFFFF")}}>
            {w.text}{i < page.length - 1 ? " " : ""}
          </span>
        );
      })}
      </span>
    </div>
  );
};

// 3D-субтитры (решение пользователя 15.10.2026: «с 3Д субтитрами»): узкий гротеск Oswald капсом, объёмные буквы
// (слои жёсткой тени — «выдавленный» текст), строка развёрнута в перспективе, страницы чередуют наклон влево/вправо;
// каждое слово прилетает из глубины. Текущее и акцентные слова — жёлтым маркером ОД.
const EXTRUDE = [1, 2, 3, 4, 5, 6, 7, 8].map((d) => `${d}px ${d}px 0 #191922`).join(", ") + ", 12px 18px 24px rgba(0,0,0,0.45)";
const Captions3D: React.FC<{page: TalkReelProProps["words"]; pageIndex: number; accent: string[]; top: number; t: number}> = ({page, pageIndex, accent, top, t}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const clean = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}+]/gu, "");
  const side = pageIndex % 2 ? 1 : -1;
  const curIdx = page.reduce((k, x, j) => (x.start <= t ? j : k), -1);
  // кегль по длине страницы: строка в перспективе не должна выходить за кадр (узкий гротеск ≈ 0,58 кегля на букву)
  const chars = page.reduce((n, w) => n + w.text.length, 0) + page.length * 0.6;
  const fontSize = Math.round(Math.min(92, 820 / (chars * 0.58)));
  return (
    <div style={{position: "absolute", left: 60, right: 60, top: top - 20, perspective: 900, perspectiveOrigin: "50% 40%", textAlign: "center"}}>
      <div style={{display: "inline-block", maxWidth: 900, rotate: `y ${side * 14}deg`, transformStyle: "preserve-3d"}}>
        <div style={{rotate: "x 12deg", transformStyle: "preserve-3d"}}>
          {page.map((w, i) => {
            const k = spring({frame: frame - Math.round(w.start * fps), fps, config: {damping: 13, stiffness: 210, mass: 0.6}, durationInFrames: 10});
            const hot = (i === curIdx && t < w.end + 0.35) || accent.includes(clean(w.text));
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  margin: "0 10px",
                  fontFamily: oswald.fontFamily,
                  fontWeight: 700,
                  fontSize,
                  lineHeight: 1,
                  textTransform: "uppercase",
                  letterSpacing: "0.01em",
                  color: hot ? (B.id === "od" ? "#FFD92E" : B.accent) : "#FFFFFF",
                  textShadow: EXTRUDE,
                  opacity: w.start <= t ? Math.min(1, k * 1.6) : 0,
                  translate: `0px ${(1 - k) * 30}px ${(1 - k) * -420}px`,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Белая плашка-чип: выезжает слева с пружиной, может зачеркнуться красной линией
const Chip: React.FC<{text: string; delay: number; strike?: number}> = ({text, delay, strike}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 160, mass: 0.7}});
  const line =
    strike === undefined
      ? 0
      : interpolate(frame, [strike, strike + 8], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const B = useBrand();
  const aura = B.id === "aura";
  return (
    <div
      style={{
        position: "relative",
        alignSelf: "flex-start",
        background: B.chip.bg,
        color: B.chip.text,
        fontFamily: B.chip.font,
        fontWeight: B.chip.weight,
        fontSize: 32,
        padding: aura ? "14px 28px 14px 22px" : "14px 26px",
        borderRadius: B.chip.radius,
        border: B.chip.border,
        boxShadow: B.chip.shadow ?? "0 10px 30px rgba(0,0,0,0.28)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: s,
        // Aura: плашку «выдвигает» снизу маскот, стоящий под ней; GTT — выезд слева
        translate: aura ? `${(1 - s) * 60}px ${(1 - s) * 260}px` : `${(1 - s) * -140}px 0px`,
        rotate: aura ? `${(1 - s) * -8}deg` : undefined,
        scale: String(0.8 + 0.2 * s),
        transformOrigin: aura ? "left bottom" : "left center",
      }}
    >
      {B.chip.dot ? (
        <span style={{width: 18, height: 18, borderRadius: B.square ? 0 : 9, background: B.chip.dot, boxShadow: `0 0 0 3px ${B.chip.text}`, flexShrink: 0, scale: String(0.4 + 0.6 * s)}} />
      ) : null}
      <span style={{opacity: strike === undefined ? 1 : 1 - 0.45 * line}}>{text}</span>
      {strike !== undefined ? (
        <div
          style={{
            position: "absolute",
            left: 18,
            top: "50%",
            height: 5,
            width: `calc(${line * 100}% - 36px)`,
            background: "#E5484D",
            borderRadius: 3,
          }}
        />
      ) : null}
    </div>
  );
};

// Лицо спикера занимает примерно x 330–790, y 600–1150 (с учётом резких зумов). Все плашки, логотипы и цифры
// живут только в «свободных зонах»: верхняя полоса (y 250–600) и полоса под субтитрами (y 1410–1530).
// В Stories верхняя полоса сдвигается вниз на TOP_SHIFT под полоски прогресса и аватар.
const TopShift = React.createContext(0);

const ChipGroup: React.FC<{group: TalkReelProProps["chips"][number]; start: number}> = ({group, start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(frame, [(group.until - start) * fps - 8, (group.until - start) * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shift = React.useContext(TopShift);
  return (
    <div
      style={{
        position: "absolute",
        top: 250 + shift * 0.6,
        left: 70,
        right: group.wrap ? 70 : undefined,
        display: "flex",
        flexDirection: group.wrap ? "row" : "column",
        flexWrap: group.wrap ? "wrap" : "nowrap",
        gap: 16,
        opacity: out,
        scale: group.scale ? String(group.scale) : undefined,
        transformOrigin: "0 0",
      }}
    >
      {group.items.map((c, i) => (
        <Chip
          key={i}
          text={c.text}
          delay={Math.round((c.at - start) * fps)}
          strike={c.strike === undefined ? undefined : Math.round((c.strike - start) * fps)}
        />
      ))}
    </div>
  );
};

// Одна карточка справа от лица: въезжает справа, затем на каждой следующей компании
// переворачивается по вертикальной оси и показывает следующий логотип
const FlipCard: React.FC<{group: TalkReelProProps["logos"][number]; start: number}> = ({group, start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const shift = React.useContext(TopShift);
  const sc = group.scale ?? logoScale(B.id);
  const local = (s: number) => Math.round((s - start) * fps);
  const enter = spring({frame, fps, config: {damping: 14, stiffness: 150}});
  const out = interpolate(frame, [local(group.until) - 8, local(group.until)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // угол: каждая следующая компания — ещё пол-оборота
  const angle = group.items
    .slice(1)
    .reduce((a, it) => a + 180 * spring({frame: frame - local(it.at), fps, config: {damping: 16, stiffness: 120}}), 0);
  const shown = Math.min(group.items.length - 1, Math.round(angle / 180));
  const face = (src: string, back: boolean) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#FFFFFF",
        borderRadius: 26,
        boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 26px",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        rotate: back ? "y 180deg" : undefined,
      }}
    >
      <Img src={staticFile(src)} style={{maxHeight: 64 * sc, maxWidth: "100%", objectFit: "contain"}} />
    </div>
  );
  // на лицевой стороне — чётные логотипы, на обороте — нечётные
  const front = group.items[shown % 2 === 0 ? shown : Math.max(0, shown - 1)].src;
  const back = group.items[shown % 2 === 1 ? shown : Math.min(group.items.length - 1, shown + 1)].src;
  // крупная карточка (GTT, ×2) — справа сверху у головы, а не над субтитрами
  const big = sc >= 1.6;
  return (
    <div
      style={{
        position: "absolute",
        right: 40,
        top: big ? 300 + shift * 0.6 : 1405 - (sc - 1) * 90,
        width: big ? 560 : 330 * sc,
        height: big ? 112 * sc : 124 * sc,
        perspective: 1200,
        opacity: out * enter,
        translate: `${(1 - enter) * 420}px 0px`,
      }}
    >
      <div style={{position: "absolute", inset: 0, transformStyle: "preserve-3d", rotate: `y ${angle}deg`}}>
        {face(front, false)}
        {face(back, true)}
      </div>
    </div>
  );
};

// Плашки брендов у GTT вдвое крупнее (решение пользователя 28.10.2026: «плашки брендов крупнее в 2 раза, когда
// перечисляешь и показываешь логотипы»); у Aura и od — как были. Своё значение — logos[].scale / items[].scale.
const logoScale = (brand: string) => (brand === "gtt" ? 2 : 1);

// Карточки логотипов вылетают по бокам от головы с лёгким поворотом
const LogoGroup: React.FC<{group: TalkReelProProps["logos"][number]; start: number}> = ({group, start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(frame, [(group.until - start) * fps - 8, (group.until - start) * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shift = React.useContext(TopShift);
  // две карточки над головой, две — под субтитрами
  const B = useBrand();
  const slots = B.id === "aura"
    ? [
        // Aura: карточки выезжают из-за левого края над роботом, который их «вытаскивает»
        {left: 50, top: 270 + shift * 0.6, rot: -3},
        {left: 50, top: 420 + shift * 0.6, rot: 2},
        {right: 50, top: 300 + shift * 0.6, rot: 4},
        {right: 50, top: 450 + shift * 0.6, rot: -3},
      ]
    : [
    {left: 50, top: 300 + shift * 0.6, rot: -5},
    {right: 50, top: 300 + shift * 0.6, rot: 4},
    {left: 50, top: 1410, rot: 3},
    {right: 50, top: 1410, rot: -4},
  ];
  return (
    <AbsoluteFill style={{opacity: out}}>
      {group.items.map((l, i) => {
        const s = spring({frame: frame - Math.round((l.at - start) * fps), fps, config: {damping: 12, stiffness: 140}});
        const slot = slots[i % slots.length];
        const fromLeft = "left" in slot;
        const sc = l.scale ?? group.scale ?? logoScale(B.id);
        const big = sc >= 1.6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: fromLeft ? slot.left : undefined,
              right: fromLeft ? undefined : slot.right,
              top: big && slot.top > 1000 ? 1440 : slot.top,
              background: "#FFFFFF",
              borderRadius: 28 * Math.sqrt(sc),
              padding: `${22 * Math.sqrt(sc)}px ${30 * Math.sqrt(sc)}px`,
              boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
              opacity: s,
              translate: `${(1 - s) * (fromLeft ? -400 : 400)}px 0px`,
              rotate: `${slot.rot * s}deg`,
              scale: String(0.6 + 0.4 * s),
            }}
          >
            <Img src={staticFile(l.src)} style={{height: 72 * sc, maxWidth: big ? 380 : Math.min(470, 360 * sc), objectFit: "contain", display: "block"}} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Крупная цифра с «попом» и синим свечением
// счётчик (каталог skillry, T19/T44): число в тексте набегает от нуля за 1,2 с с замедлением, приставки и хвост остаются
const countText = (text: string, k: number) => {
  const m = text.match(/^(\D*?)(\d[\d\s.,]*\d|\d)(.*)$/);
  if (!m) return text;
  const raw = m[2].replace(/\s/g, "");
  const dec = raw.match(/[.,](\d+)$/)?.[1]?.length ?? 0;
  const v = parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(v)) return text;
  const cur = v * k;
  const body = dec ? cur.toFixed(dec).replace(".", raw.includes(",") ? "," : ".") : Math.round(cur).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return m[1] + body + m[3];
};

const BigNumber: React.FC<{n: TalkReelProProps["numbers"][number]}> = ({n}) => {
  const shift = React.useContext(TopShift);
  const B = useBrand();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 9, stiffness: 160, mass: 0.8}});
  const out = interpolate(frame, [(n.until - n.at) * fps - 8, (n.until - n.at) * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{position: "absolute", left: 70, top: 290 + shift * 0.6, opacity: out, scale: String(0.6 + 0.4 * s), transformOrigin: "left center"}}>
      <div
        style={{
          fontFamily: B.numberFont,
          fontWeight: B.id === "aura" ? 800 : 700,
          letterSpacing: B.id === "aura" ? "-0.03em" : undefined,
          fontSize: n.text.length > 6 ? 120 : n.text.length > 3 ? 140 : 190,
          lineHeight: 1,
          color: n.tone === "down" ? "#FF3B3B" : B.accent,
          WebkitTextStroke: B.id === "aura" && n.tone !== "down" ? "6px #262626" : B.number?.stroke,
          paintOrder: "stroke fill",
          textShadow:
            n.tone === "down"
              ? "0 0 40px rgba(255,59,59,0.8), 0 6px 20px rgba(0,0,0,0.45)"
              : B.number?.shadow ?? `0 0 40px ${B.accentGlow}, 0 6px 20px rgba(0,0,0,0.45)`,
        }}
      >
        {n.count ? countText(n.text, interpolate(frame, [4, 4 + 1.2 * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)})) : n.text}
      </div>
      {n.sub ? (
        <div style={{fontFamily: B.bodyFont, fontWeight: 700, fontSize: 40, color: "#FFFFFF", textShadow: B.captionShadow ?? shadow, marginTop: 6}}>
          {n.sub}
        </div>
      ) : null}
    </div>
  );
};

// Биржевой график падает за спиной спикера: красная ломаная рисуется сверху-слева вниз-вправо,
// на конце стрелка, под линией красная заливка, на фоне сетка. Спикер (вырезка) стоит перед графиком.
const DROP_POINTS: [number, number][] = [
  [40, 560], [170, 520], [260, 600], [360, 560], [450, 720], [540, 680], [640, 900], [720, 860], [830, 1130], [900, 1090], [990, 1320],
];
const StockChart: React.FC<{drop: NonNullable<TalkReelProProps["stockDrop"]>; t: number}> = ({drop, t}) => {
  const up = drop.direction === "up";
  const C = up ? "#22C55E" : "#FF3B3B";
  // рост — та же ломаная, отражённая по вертикали (снизу-слева вверх-вправо)
  const POINTS: [number, number][] = up ? DROP_POINTS.map(([x, y]) => [x, 1880 - y]) : DROP_POINTS;
  const ease = Easing.bezier(0.5, 0, 0.3, 1);
  const draw = interpolate(t, [drop.at, drop.at + 2.4], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  const fade = Math.min(
    interpolate(t, [drop.at - 0.1, drop.at + 0.3], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
    interpolate(t, [drop.until - 0.4, drop.until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
  );
  // длина ломаной и точка на ней для текущего прогресса
  const seg = POINTS.slice(1).map((pt, i) => Math.hypot(pt[0] - POINTS[i][0], pt[1] - POINTS[i][1]));
  const total = seg.reduce((a, x) => a + x, 0);
  let left = draw * total;
  const shown: [number, number][] = [POINTS[0]];
  for (let i = 0; i < seg.length; i++) {
    const [x0, y0] = POINTS[i];
    const [x1, y1] = POINTS[i + 1];
    if (left >= seg[i]) {
      shown.push([x1, y1]);
      left -= seg[i];
    } else {
      const k = left / seg[i];
      shown.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]);
      break;
    }
  }
  const [hx, hy] = shown[shown.length - 1];
  const [px, py] = shown.length > 1 ? shown[shown.length - 2] : [hx - 1, hy - 1];
  const ang = (Math.atan2(hy - py, hx - px) * 180) / Math.PI;
  const line = shown.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${line} ${hx},1920 ${POINTS[0][0]},1920`;
  const pulse = 0.5 + 0.5 * Math.sin(t * 9);
  return (
    <AbsoluteFill style={{opacity: fade}}>
      {/* лёгкое затемнение, чтобы линия читалась на светлом фоне */}
      <AbsoluteFill style={{background: `linear-gradient(to bottom, rgba(10,12,20,0.55), ${up ? "rgba(0,40,10,0.35)" : "rgba(40,0,0,0.35)"})`}} />
      <svg viewBox="0 0 1080 1920" style={{position: "absolute", inset: 0}}>
        <defs>
          <linearGradient id="dropFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C} stopOpacity="0.2" />
            <stop offset="1" stopColor={C} stopOpacity="0" />
          </linearGradient>
          <filter id="dropGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`h${i}`} x1={0} x2={1080} y1={480 + i * 130} y2={480 + i * 130} stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`v${i}`} y1={420} y2={1500} x1={90 + i * 180} x2={90 + i * 180} stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
        ))}
        <polygon points={area} fill="url(#dropFill)" />
        <polyline points={line} fill="none" stroke={C} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" filter="url(#dropGlow)" />
        <g transform={`translate(${hx} ${hy}) rotate(${ang})`} filter="url(#dropGlow)">
          <polygon points="34,0 -18,-30 -18,30" fill={C} />
        </g>
        <circle cx={hx} cy={hy} r={26 + 14 * pulse} fill="none" stroke={C} strokeOpacity={0.5 * (1 - pulse) + 0.2} strokeWidth={4} />
        <text x={60} y={up ? 470 : 660} fill="#FFFFFF" fontFamily="Inter, Arial, sans-serif" fontWeight={700} fontSize={44} opacity={0.9}>
          {drop.label} {up ? "▲" : "▼"}
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// Уровни зума по кускам между склейками: общий план, лёгкий и средний наезд чередуются.
const LEVELS = [1.0, 1.08, 1.02, 1.14, 1.0, 1.1];
const zoomAt = (allCuts: number[], zooms: TalkReelProProps["zooms"], t: number, minGap = 0.7) => {
  // склейки ближе minGap друг к другу не меняют уровень зума — иначе короткий кусок «мелькает» (как ускорение);
  // у Aura minGap 4 с — спокойный монтаж, зритель успевает сфокусироваться (решение пользователя 08.10.2026)
  const cuts: number[] = [];
  for (const c of allCuts) if (!cuts.length || c - cuts[cuts.length - 1] >= minGap) cuts.push(c);
  const idx = cuts.filter((c) => c <= t).length;
  const segStart = cuts[idx - 1] ?? 0;
  const level = (i: number) => LEVELS[i % LEVELS.length];
  // каждая третья склейка — плавный переход (0.45 с), остальные — резкий джамп-кат
  const smooth = idx % 3 === 2;
  const base = smooth
    ? interpolate(t - segStart, [0, 0.45], [level(idx - 1), level(idx)], {
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.45, 0, 0.2, 1),
      })
    : level(idx);
  const drift = interpolate(t - segStart, [0, 6], [0, 0.03], {extrapolateRight: "clamp"});
  let extra = 0;
  for (const z of zooms) {
    if (z.kind === "pull") {
      // отдаление (решение пользователя 22.10.2026): кадр сразу крупно, потом плавно отъезжает к общему плану за hold
      if (t < z.at || t > z.at + z.hold) continue;
      const k = interpolate(t, [z.at, z.at + z.hold], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 0, 0.2, 1)});
      extra = Math.max(extra, z.amount * k);
      continue;
    }
    if (t < z.at || t > z.at + z.hold + 0.6) continue;
    const attack = z.kind === "punch" ? 0.1 : z.kind === "macro" ? 0.14 : 1.4;
    const inP = interpolate(t, [z.at, z.at + attack], [0, 1], {
      extrapolateRight: "clamp",
      easing: z.kind === "punch" || z.kind === "macro" ? Easing.out(Easing.cubic) : Easing.bezier(0.33, 0, 0.2, 1),
    });
    const outP = interpolate(t, [z.at + z.hold, z.at + z.hold + 0.5], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.45, 0, 0.2, 1),
    });
    extra = Math.max(extra, z.amount * Math.min(inP, outP));
  }
  return base + drift + extra;
};

// макро-наезд (референс xkzv9pa, 23.10.2026): вклад наезда «на глаза / на губы» сейчас — центр зума смещается к губам
const macroNow = (zooms: TalkReelProProps["zooms"], t: number) => {
  for (const z of zooms) {
    if (z.kind !== "macro" || t < z.at || t > z.at + z.hold + 0.6) continue;
    const inP = interpolate(t, [z.at, z.at + 0.14], [0, 1], {extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
    const outP = interpolate(t, [z.at + z.hold, z.at + z.hold + 0.5], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.45, 0, 0.2, 1)});
    return {part: z.amount * Math.min(inP, outP), lips: z.target === "lips"};
  }
  return null;
};

// Зум на склейках: куски чередуют общий план и наезд, плюс лёгкий «дых» внутри куска.
// Перебивка (broll): за спиной спикера проявляется картинка, сам спикер вырезан из фона
// (cutoutSrc — прозрачное видео из scripts/matte.py) и остаётся на месте, звук не прерывается.
const ZoomedVideo: React.FC<{
  src: string;
  cutoutSrc: string;
  cuts: number[];
  broll: TalkReelProProps["broll"];
  cities: TalkReelProProps["cities"];
  zooms: TalkReelProProps["zooms"];
  stockDrop: TalkReelProProps["stockDrop"];
  focus: TalkReelProProps["focus"];
  checklists: TalkReelProProps["checklists"];
  bgFlags?: TalkReelProProps["bgFlags"];
  angleB?: TalkReelProProps["angleB"];
  clips?: TalkReelProProps["clips"];
  hooks?: HookItem[];
  speaker?: TalkReelProProps["speaker"];
  texts?: TalkReelProProps["texts"];
  titles?: TalkReelProProps["titles"];
  floats?: TalkReelProProps["floats"];
  inscreens?: TalkReelProProps["inscreens"];
  bgs?: TalkReelProProps["bgs"];
  rings?: TalkReelProProps["rings"];
  docus?: TalkReelProProps["docus"];
  orbits?: TalkReelProProps["orbits"];
  neons?: TalkReelProProps["neons"];
  words?: TalkReelProProps["words"];
  captionsAt?: TalkReelProProps["captionsAt"];
  accentWords?: string[];
  faceTop?: number;
  stories?: boolean;
}> = ({src, cutoutSrc, cuts, broll, cities, zooms, stockDrop, focus, checklists, bgFlags, angleB, clips, hooks, speaker, texts, titles, floats, inscreens, bgs, rings, docus, orbits, neons, words, captionsAt, accentWords, faceTop, stories = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const lift = Math.max(cityAmount(cities, t), listAmount(checklists, t), clipAmount(clips ?? [], t)) * 330; // лицо поднимается в верхнюю половину
  const sp = speakerActive(speaker, t);
  const B = useBrand();
  const zoom = zoomAt(cuts, zooms, t, B.id === "aura" ? 4 : 0.7);
  const b = broll.find((x) => t >= x.at && t <= x.until) ?? broll.find((x) => t >= x.at - 0.5 && t <= x.until + 0.5);
  const ease = Easing.bezier(0.22, 1, 0.36, 1);
  const p = b
    ? Math.min(
        interpolate(t, [b.at, b.at + 0.5], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease}),
        interpolate(t, [b.until - 0.45, b.until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease}),
      )
    : 0;
  const kb = b ? interpolate(t, [b.at, b.until], [1.12, 1.02], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 1;
  const kind = b ? (b.transition ?? TRANSITIONS[broll.indexOf(b) % TRANSITIONS.length]) : "fade";
  const R = b?.mode === "screen" ? SCREEN : PIP;
  // fade — картинка проявляется, видео гаснет; остальные — картинка закрывает кадр по форме, вырезка спикера сразу видна
  const imgStyle: React.CSSProperties =
    kind === "circle"
      ? {clipPath: `circle(${p * 120}% at ${focus.x}px ${focus.y}px)`}
      : kind === "slide"
        ? {translate: `${(1 - p) * 100}%`, filter: `blur(${(1 - p) * 24}px)`}
        : kind === "zoom"
          ? {opacity: p, scale: String(1 + (1 - p) * 0.6), filter: `blur(${(1 - p) * 30}px)`}
          : kind === "wipe"
            ? {clipPath: `polygon(0 0, ${p * 230}% 0, ${p * 230 - 130}% 100%, 0 100%)`}
            : {opacity: p};
  // макро на губы: центр зума уходит от линии глаз к губам (≈ 0,78 расстояния от глаз до линии роста волос)
  const mac = macroNow(zooms, t);
  const originY = focus.y + (mac?.lips ? 0.78 * (focus.y - (faceTop ?? focus.y - 230)) * Math.min(1, mac.part / Math.max(0.001, zoom - 1)) : 0);
  const videoStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    scale: String(zoom),
    transformOrigin: `${focus.x}px ${originY}px`,
    translate: `0px ${-lift}px`,
  };
  return (
    <AbsoluteFill style={{background: "#0B0D14"}}>
      <SpeakerVideo src={src} style={{...videoStyle, opacity: kind === "fade" ? 1 - p : 1}} />
      {angleB
        ? angleB.shots.map((sh, i) => (
            <Sequence key={`b-${i}`} from={Math.round(sh.at * fps)} durationInFrames={Math.round((sh.until - sh.at) * fps)} layout="none">
              <OffthreadVideo
                src={staticFile(angleB.src)}
                muted
                trimBefore={Math.round(sh.at * fps)}
                style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", scale: String(1.04 + 0.03 * ((t - sh.at) / Math.max(0.1, sh.until - sh.at)))}}
              />
            </Sequence>
          ))
        : null}
      {(bgFlags ?? []).map((fl, i) =>
        t >= fl.at - 0.05 && t <= fl.until + 0.05 ? (
          <Sequence key={`bgf-${i}`} from={Math.round(fl.at * fps)} durationInFrames={Math.round((fl.until - fl.at) * fps) + 2} layout="none">
            <WavingFlag3D src={fl.src} at={fl.at} until={fl.until} />
            {cutoutSrc ? <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted style={{...videoStyle, filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.4))"}} /> : null}
          </Sequence>
        ) : null,
      )}
      {/* хуки: текст между видео и вырезкой спикера — голова и плечи закрывают буквы */}
      {(hooks ?? []).map((h, i) =>
        !b && t >= h.at - 0.05 && t <= h.until + 0.05 ? (
          <React.Fragment key={`hook-${i}`}>
            <HookTitle {...h} />
            {cutoutSrc ? <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted style={videoStyle} /> : null}
          </React.Fragment>
        ) : null,
      )}
      {/* тексты в 3D за спикером: между видео и вырезкой (без вырезки — поверх спикера) */}
      {!broll.some((x) => t >= x.at && t <= x.until) && textBehindActive(texts, t) ? (
        <>
          <Texts3D items={texts} plane="behind" />
          {cutoutSrc ? <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted style={videoStyle} /> : null}
        </>
      ) : null}
      {/* свой фон за вырезанным спикером (без вырезки — не рисуется: спикер бы пропал) */}
      {!b && cutoutSrc && bgActive(bgs, t) ? (
        <>
          <SpeakerBg it={bgActive(bgs, t)!} t={t} />
          <OffthreadVideo
            src={staticFile(cutoutSrc)}
            transparent
            muted
            style={{...videoStyle, filter: bgActive(bgs, t)!.outline ? "drop-shadow(6px 0 0 #fff) drop-shadow(-6px 0 0 #fff) drop-shadow(0 6px 0 #fff) drop-shadow(0 -6px 0 #fff) drop-shadow(0 24px 40px rgba(0,0,0,0.4))" : "drop-shadow(0 20px 40px rgba(0,0,0,0.35))"}}
          />
        </>
      ) : null}
      {/* «документалка»: тёмный фон со свечением за головой, спикер ч/б (вырезка; без неё — ч/б кадр с виньеткой) */}
      {!b && docuActive(docus, t) ? <DocuBack items={docus} focus={focus} video={src} cutout={cutoutSrc} videoStyle={videoStyle} /> : null}
      {/* прожектор и неоновая вывеска за спикером; карточки орбиты — задняя половина за спикером */}
      {!b && (neonActive(neons, t) || orbitActive(orbits, t)) ? (
        <>
          <Neons items={neons} focus={focus} faceTop={faceTop} part="spot" />
          {cutoutSrc ? <Neons items={neons} focus={focus} faceTop={faceTop} part="sign" stories={stories} /> : null}
          <Orbits items={orbits} focus={focus} half="back" />
          {cutoutSrc && !docuActive(docus, t) ? <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted style={videoStyle} /> : null}
        </>
      ) : null}
      {/* двухуровневые субтитры: ключевое слово гигантом за головой; кольцо слов — задняя половина за спикером */}
      {!b && (capStyleAt(captionsAt, t)?.style === "duo" || ringActive(rings, t)) ? (
        <>
          <DuoWord words={words ?? []} items={captionsAt} accent={accentWords ?? []} focus={focus} faceTop={faceTop} />
          <Rings items={rings} focus={focus} faceTop={faceTop} half="back" />
          {cutoutSrc ? <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted style={videoStyle} /> : null}
        </>
      ) : null}
      {/* экран в кадре: слой идёт вместе с наездами кадра, руки спикера (вырезка) — поверх */}
      {!b && inScreenActive(inscreens, "behind", t) ? (
        <>
          <AbsoluteFill style={{scale: String(zoom), transformOrigin: `${focus.x}px ${originY}px`, translate: `0px ${-lift}px`}}>
            <InScreens items={inscreens} plane="behind" />
          </AbsoluteFill>
          {cutoutSrc ? <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted style={videoStyle} /> : null}
        </>
      ) : null}
      {/* заголовок «шрифт + рукопись» и картинки вокруг головы — за спикером (между видео и вырезкой) */}
      {!b && (titleBehindActive(titles, t) || floatBehindActive(floats, t)) ? (
        <>
          <Titles items={titles} plane="behind" />
          <Floats items={floats} plane="behind" focus={focus} />
          {cutoutSrc ? <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted style={videoStyle} /> : null}
        </>
      ) : null}
      {stockDrop && !b && t >= stockDrop.at - 0.1 && t <= stockDrop.until + 0.1 ? (
        <>
          <StockChart drop={stockDrop} t={t} />
          {cutoutSrc ? <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted style={videoStyle} /> : null}
        </>
      ) : null}
      {b && (b.mode === "pip" || b.mode === "screen" || !cutoutSrc) ? (
        // pip — спикер уезжает карточкой в правый нижний угол; screen — в большой экран по центру; картинка — на весь кадр
        <>
          <AbsoluteFill style={imgStyle}>
            <Img src={staticFile(b.src)} style={{width: "100%", height: "100%", objectFit: "cover", scale: String(kb)}} />
          </AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: R.x * p,
              top: R.y * p,
              width: 1080 + (R.w - 1080) * p,
              height: 1920 + (R.h - 1920) * p,
              borderRadius: B.square ? 0 : R.r * p,
              overflow: "hidden",
              border: `${R.border * p}px solid ${B.frameBorder}`,
              boxShadow: B.square ? `${16 * p}px ${16 * p}px 0 rgba(25,25,34,${p})` : `0 30px 80px rgba(0,0,0,${0.55 * p})`,
              transform: b.mode === "screen" ? `perspective(1800px) rotateY(${-6 * p}deg)` : undefined,
            }}
          >
            <SpeakerVideo
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: `${(focus.x / 1080) * 100}% ${Math.min(100, (focus.y / 1920) * 100 + 8)}%`,
                scale: String(1 + (b.mode === "screen" ? 0.08 : 0.25) * p),
                transformOrigin: `${(focus.x / 1080) * 100}% ${(focus.y / 1920) * 100}%`,
              }}
            />
          </div>
        </>
      ) : b ? (
        <>
          <AbsoluteFill style={imgStyle}>
            <Img src={staticFile(b.src)} style={{width: "100%", height: "100%", objectFit: "cover", scale: String(kb)}} />
            {/* светлая кромка у шторки и круга */}
            {kind === "circle" || kind === "wipe" ? (
              <AbsoluteFill style={{boxShadow: `inset 0 0 ${60 * (1 - p)}px rgba(255,255,255,${0.6 * (1 - p)})`}} />
            ) : null}
          </AbsoluteFill>
          <OffthreadVideo
            src={staticFile(cutoutSrc)}
            transparent
            muted
            style={{
              ...videoStyle,
              opacity: kind === "fade" ? Math.min(1, p * 3) : p > 0.001 ? 1 : 0,
              filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.35))",
            }}
          />
        </>
      ) : null}
      {/* спикер в угол: рамка, круг или вырезка по контуру, фон — размытие, бренд или картинка */}
      {sp ? <SpeakerStage s={sp.s} p={sp.p} video={src} cutout={cutoutSrc} focus={focus} zoom={zoom} stories={stories} /> : null}
      {/* экран спереди — после спикера в углу: так экран виден и над уменьшенным спикером на своём фоне
          (решение пользователя 29.10.2026: «на светлом экране стрелкой… вырезав меня и сместив вниз») */}
      {!b && inScreenActive(inscreens, "front", t) ? (
        <AbsoluteFill style={{scale: String(zoom), transformOrigin: `${focus.x}px ${originY}px`, translate: `0px ${-lift}px`}}>
          <InScreens items={inscreens} plane="front" />
        </AbsoluteFill>
      ) : null}
      {/* затемнение сверху и снизу для читаемости логотипа и субтитров */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const TRANSITIONS = ["circle", "slide", "zoom", "wipe", "fade"] as const;
// карточка спикера в режиме перебивки pip: правый нижний угол, выше нижней зоны интерфейса Instagram
const PIP = {x: 1080 - 60 - 330, y: 1060, w: 330, h: 440, r: 30, border: 6};
// «экран» (как в финале): большая карточка над субтитрами, лицо в верхней половине
const SCREEN = {x: 165, y: 270, w: 750, h: 960, r: 40, border: 14};
const pipAmount = (broll: TalkReelProProps["broll"], t: number) => {
  const b = broll.find((x) => x.mode === "pip" && t >= x.at - 0.1 && t <= x.until + 0.1);
  if (!b) return 0;
  return Math.min(
    interpolate(t, [b.at, b.at + 0.5], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
    interpolate(t, [b.until - 0.45, b.until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
  );
};

// Сколько панели чек-листа на экране (0…1), как у панели городов
const listAmount = (lists: TalkReelProProps["checklists"], t: number) => {
  const ease = Easing.bezier(0.22, 1, 0.36, 1);
  let a = 0;
  for (const l of lists) {
    const start = l.items[0].at - 0.35;
    a = Math.max(
      a,
      Math.min(
        interpolate(t, [start - 0.1, start + 0.35], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease}),
        interpolate(t, [l.until - 0.35, l.until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease}),
      ),
    );
  }
  return a;
};

// Планшет-чек-лист: тёмная «пелена» снизу, на ней белый планшет с зажимом, пункты с зелёными галочками
const ChecklistPanel: React.FC<{lists: TalkReelProProps["checklists"]}> = ({lists}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const amount = listAmount(lists, t);
  const B = useBrand();
  if (amount <= 0) return null;
  const l = lists.find((x) => t >= x.items[0].at - 0.6 && t <= x.until + 0.1);
  if (!l) return null;
  const slide = (1 - amount) * 900;
  if (B.id === "aura") return <AuraFlipchart l={l} amount={amount} />;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: PANEL_TOP - 60 + LIST_DROP,
          bottom: 0,
          translate: `0px ${slide}px`,
          background: `linear-gradient(to bottom, rgba(${B.veil},0) 0px, rgba(${B.veil},0.92) 220px, ${B.veilSolid} 100%)`,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          maskImage: `linear-gradient(to bottom, transparent 0px, black ${FEATHER}px)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, black ${FEATHER}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: BOARD_TOP,
          translate: `0px ${slide}px`,
          rotate: `${-1.5 * amount}deg`,
          background: B.paper,
          borderRadius: B.square ? 0 : 34,
          padding: "70px 44px 34px",
          // od: рамка и жёсткая тень чернилами, без скруглений — как карточки сайта
          border: B.square ? `3px solid ${B.frameBorder}` : undefined,
          boxShadow: B.square ? `12px 12px 0 ${B.frameBorder}` : "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        {/* зажим планшета */}
        <div
          style={{
            position: "absolute",
            top: -26,
            left: "50%",
            translate: "-50% 0",
            width: 240,
            height: 64,
            borderRadius: B.square ? 0 : 18,
            background: B.clip,
            boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
          }}
        />
        <div style={{fontFamily: B.listTitle.font, fontWeight: B.listTitle.weight, fontSize: 40, color: B.listTitle.color, marginBottom: 18}}>{l.title}</div>
        {l.items.map((it, i) => {
          const s = spring({frame: frame - Math.round(it.at * fps), fps, config: {damping: 14, stiffness: 160}});
          const draw = interpolate(frame, [it.at * fps + 3, it.at * fps + 13], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "14px 0",
                borderTop: i ? "2px solid #EEF0F4" : undefined,
                opacity: s,
                translate: `${(1 - s) * 60}px 0px`,
              }}
            >
              <svg width={58} height={58} viewBox="0 0 58 58" style={{flexShrink: 0}}>
                <circle cx={29} cy={29} r={27} fill={draw > 0 ? B.tick.bg : B.tick.idle} opacity={0.15 + 0.85 * Math.min(1, draw * 2)} />
                <path
                  d="M16 30 L25 39 L43 20"
                  fill="none"
                  stroke={B.tick.stroke}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={42}
                  strokeDashoffset={42 * (1 - draw)}
                />
              </svg>
              <div style={{fontFamily: B.bodyFont, fontWeight: 700, fontSize: 42, color: "#17171D", lineHeight: 1.15}}>{it.text}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// Aura: флипчарт на треноге слева внизу, справа от него робот ставит галочки (решение пользователя 08.10.2026).
// Лист — пергамент, заголовок графитом, пункты с квадратами; галочка рисуется графитовым маркером поверх лимонного мазка.
const AuraFlipchart: React.FC<{l: TalkReelProProps["checklists"][number]; amount: number}> = ({l, amount}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const rise = (1 - amount) * 1000;
  const X = 60;
  const W = 700;
  const TOP = PANEL_TOP + 10;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: PANEL_TOP - 60,
          bottom: 0,
          translate: `0px ${rise}px`,
          background: `linear-gradient(to bottom, rgba(${B.veil},0) 0px, rgba(${B.veil},0.85) 220px, ${B.veilSolid} 100%)`,
          maskImage: `linear-gradient(to bottom, transparent 0px, black ${FEATHER}px)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, black ${FEATHER}px)`,
        }}
      />
      <div style={{position: "absolute", left: X, top: TOP, width: W, height: 1920 - TOP, translate: `0px ${rise}px`}}>
        {/* тренога */}
        <div style={{position: "absolute", left: W * 0.18, top: 470, width: 12, height: 520, background: "#2D2D2D", borderRadius: 6, rotate: "8deg", transformOrigin: "top"}} />
        <div style={{position: "absolute", left: W * 0.8, top: 470, width: 12, height: 520, background: "#2D2D2D", borderRadius: 6, rotate: "-8deg", transformOrigin: "top"}} />
        <div style={{position: "absolute", left: W / 2 - 6, top: 470, width: 12, height: 470, background: "#3D3D3D", borderRadius: 6}} />
        {/* доска и лист */}
        <div style={{position: "absolute", left: 0, top: 0, width: W, height: 500, background: "#2D2D2D", borderRadius: 14, boxShadow: "0 30px 70px rgba(0,0,0,0.45)"}} />
        <div style={{position: "absolute", left: W / 2 - 120, top: -22, width: 240, height: 36, background: "#111", borderRadius: 10}} />
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 14,
            width: W - 28,
            height: 472,
            background: "#F8F6F3",
            borderRadius: 6,
            padding: "36px 40px",
            boxSizing: "border-box",
            backgroundImage: "linear-gradient(rgba(38,38,38,0.05) 2px, transparent 2px)",
            backgroundSize: "100% 56px",
          }}
        >
          <div style={{fontFamily: B.listTitle.font, fontWeight: 700, fontSize: 42, color: "#262626", letterSpacing: "-0.02em", marginBottom: 22}}>
            <span style={{backgroundImage: `linear-gradient(${B.accent}, ${B.accent})`, backgroundRepeat: "no-repeat", backgroundSize: "100% 38%", backgroundPosition: "0 85%", padding: "0 6px"}}>{l.title}</span>
          </div>
          {l.items.map((it, i) => {
            const s = spring({frame: frame - Math.round(it.at * fps), fps, config: {damping: 14, stiffness: 160}});
            const draw = interpolate(frame, [it.at * fps + 2, it.at * fps + 11], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
            return (
              <div key={i} style={{display: "flex", alignItems: "center", gap: 22, padding: "12px 0", opacity: Math.max(0.25, s)}}>
                <svg width={58} height={58} viewBox="0 0 58 58" style={{flexShrink: 0, overflow: "visible"}}>
                  <rect x={6} y={6} width={46} height={46} rx={6} fill="none" stroke="#262626" strokeWidth={4} />
                  <path d="M10 34 C 18 30, 24 40, 30 44 C 38 30, 48 16, 60 6" fill="none" stroke={B.accent} strokeWidth={14} strokeLinecap="round"
                    strokeDasharray={90} strokeDashoffset={90 * (1 - draw)} opacity={0.9} />
                  <path d="M12 30 L26 44 L56 8" fill="none" stroke="#262626" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray={66} strokeDashoffset={66 * (1 - draw)} />
                </svg>
                <div style={{fontFamily: B.bodyFont, fontWeight: 700, fontSize: 38, color: "#262626", lineHeight: 1.15}}>{it.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// Сколько «городской» панели сейчас на экране: 0 — нет, 1 — нижняя половина занята фото города
const cityAmount = (cities: TalkReelProProps["cities"], t: number) => {
  if (!cities.length) return 0;
  const start = Math.min(...cities.map((c) => c.at));
  const end = Math.max(...cities.map((c) => c.until));
  const ease = Easing.bezier(0.22, 1, 0.36, 1);
  return Math.min(
    interpolate(t, [start - 0.1, start + 0.3], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease}),
    interpolate(t, [end - 0.3, end], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease}),
  );
};

// Фото городов в нижней половине: каждый город въезжает справа поверх предыдущего, медленный наезд, подпись
const PANEL_TOP = 1070; // фото городов опущено на ~1 см ниже середины кадра
// планшет-чек-лист GTT/od ниже панели городов (решение пользователя 28.10.2026: «флипчарт сместить чуть вниз, чтобы
// титры не налезали на лицо»); субтитры на это время стоят прямо над зажимом планшета, ниже подбородка
const LIST_DROP = 120;
const BOARD_TOP = PANEL_TOP + 40 + LIST_DROP;
const PANEL_H = 1920 - PANEL_TOP;
const FEATHER = 200; // высота растворения верхнего края фото

const CityPanel: React.FC<{cities: TalkReelProProps["cities"]}> = ({cities}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const amount = cityAmount(cities, t);
  const B = useBrand();
  if (amount <= 0) return null;
  const ease = Easing.bezier(0.22, 1, 0.36, 1);
  const shown = cities.filter((c) => t >= c.at - 0.05 && t <= c.until + 0.3);
  // Стык с видео без жёсткого края: верх панели растворяется (маска), поверх шва — размытая светлая «пелена».
  const slide = (1 - amount) * PANEL_H;
  return (
    <>
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: PANEL_TOP,
        height: PANEL_H,
        overflow: "hidden",
        translate: `0px ${slide}px`,
        maskImage: `linear-gradient(to bottom, transparent 0px, black ${FEATHER}px)`,
        WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, black ${FEATHER}px)`,
      }}
    >
      {shown.map((c, i) => {
        const inP = interpolate(t, [c.at - 0.05, c.at + 0.25], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
        const kb = interpolate(t, [c.at, c.until + 0.3], [1.06, 1.16], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
        const label = spring({frame: frame - Math.round((c.at + 0.08) * fps), fps, config: {damping: 14, stiffness: 170}});
        const route = cities.filter((x) => !x.kicker);
        const n = route.indexOf(c) + 1;
        return (
          <AbsoluteFill key={i} style={{translate: `${inP * 100}%`, zIndex: cities.indexOf(c) + 1}}>
            <Img src={staticFile(c.src)} style={{width: "100%", height: "100%", objectFit: "cover", scale: String(kb)}} />
            <AbsoluteFill style={{background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%)"}} />
            <div
              style={{
                position: "absolute",
                left: 64,
                bottom: 400,
                opacity: label,
                translate: `0px ${(1 - label) * 40}px`,
              }}
            >
              <div style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: 30, letterSpacing: "0.14em", color: B.kicker, textTransform: "uppercase", textShadow: shadow}}>
                {c.kicker ?? `Маршрут · ${n}/${route.length}`}
              </div>
              <div style={{fontFamily: B.id === "aura" ? B.captionFont : display.fontFamily, fontWeight: B.id === "aura" ? 800 : 700, fontSize: 92, color: "#FFFFFF", textShadow: shadow}}>{c.name}</div>
            </div>
          </AbsoluteFill>
        );
      })}
    </div>
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: PANEL_TOP - 90,
        height: FEATHER + 120,
        translate: `0px ${slide}px`,
        opacity: amount,
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(235,244,255,0.16) 45%, rgba(255,255,255,0) 100%)",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 40%, black 55%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 40%, black 55%, transparent 100%)",
      }}
    />
    </>
  );
};

// Видео внизу экрана: как панель городов, но в ней идёт видео (без звука) с подписью; въезжает снизу
const clipAmount = (clips: NonNullable<TalkReelProProps["clips"]>, t: number) => {
  const ease = Easing.bezier(0.22, 1, 0.36, 1);
  let a = 0;
  for (const c of clips)
    a = Math.max(a, Math.min(
      interpolate(t, [c.at - 0.1, c.at + 0.35], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease}),
      interpolate(t, [c.until - 0.35, c.until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease}),
    ));
  return a;
};

const ClipPanel: React.FC<{clips: NonNullable<TalkReelProProps["clips"]>}> = ({clips}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const B = useBrand();
  return (
    <>
      {clips.map((c, i) => {
        if (t < c.at - 0.15 || t > c.until + 0.05) return null;
        const amount = clipAmount([c], t);
        const slide = (1 - amount) * PANEL_H;
        const label = spring({frame: frame - Math.round((c.at + 0.15) * fps), fps, config: {damping: 14, stiffness: 170}});
        return (
          <Sequence key={i} from={Math.round((c.at - 0.15) * fps)} durationInFrames={Math.round((c.until - c.at + 0.25) * fps)} layout="none">
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: PANEL_TOP,
                height: PANEL_H,
                overflow: "hidden",
                translate: `0px ${slide}px`,
                maskImage: `linear-gradient(to bottom, transparent 0px, black ${FEATHER}px)`,
                WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, black ${FEATHER}px)`,
              }}
            >
              <OffthreadVideo
                src={staticFile(c.src)}
                muted
                trimBefore={Math.round((c.from ?? 0) * fps)}
                style={{width: "100%", height: "100%", objectFit: "cover", scale: String(interpolate(t, [c.at, c.until], [1.04, 1.12]))}}
              />
              <AbsoluteFill style={{background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 45%)"}} />
              {c.title ? (
                <div style={{position: "absolute", left: 64, bottom: 400, opacity: label, translate: `0px ${(1 - label) * 40}px`}}>
                  {c.kicker ? (
                    <div style={{fontFamily: B.bodyFont, fontWeight: 700, fontSize: 30, letterSpacing: "0.14em", color: B.kicker, textTransform: "uppercase", textShadow: shadow}}>{c.kicker}</div>
                  ) : null}
                  <div style={{fontFamily: B.id === "aura" ? B.captionFont : display.fontFamily, fontWeight: B.id === "aura" ? 800 : 700, fontSize: 80, color: "#FFFFFF", textShadow: shadow}}>{c.title}</div>
                </div>
              ) : null}
            </div>
          </Sequence>
        );
      })}
    </>
  );
};

// Экран телефона в финале: страницы сменяют друг друга сдвигом влево
const PhoneScreen: React.FC<{home: string; catalog: string; route: string[]; w: number; seconds: number}> = ({
  home,
  catalog,
  route,
  w,
  seconds,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const ease = Easing.inOut(Easing.cubic);
  const tHome = [0.6, 3.2];
  const tCat = [3.4, 5.6];
  const routeStart = 5.8;
  const step = Math.max(0.6, (seconds - routeStart) / route.length);
  const slide = (at: number) =>
    interpolate(t, [at - 0.3, at], [100, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1)});
  const scrollOf = (a: number[], h: number) =>
    interpolate(t, a, [0, h], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  const homeH = (w / 1075) * 3008;
  const catH = (w / 1075) * 4600;
  return (
    <AbsoluteFill style={{background: "#FFFFFF"}}>
      <AbsoluteFill>
        <Img src={staticFile(home)} style={{width: "100%", translate: `0px ${-scrollOf(tHome, homeH * 0.28)}px`}} />
      </AbsoluteFill>
      <AbsoluteFill style={{translate: `${slide(tCat[0])}%`, background: "#FFFFFF"}}>
        <Img src={staticFile(catalog)} style={{width: "100%", translate: `0px ${-scrollOf([tCat[0] + 0.3, tCat[1]], catH * 0.32)}px`}} />
      </AbsoluteFill>
      {route.map((src, i) => {
        const at = routeStart + i * step;
        const fade = i === 0 ? slide(at) : 0;
        const op = i === 0 ? 1 : interpolate(t, [at - 0.25, at], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
        return (
          <AbsoluteFill key={i} style={{translate: `${fade}%`, opacity: op, background: "#FFFFFF"}}>
            <Img src={staticFile(src)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%"}} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

// Финал (по второму референсу пользователя): тёмно-синий фон со свечением, слева телефон в 3D-наклоне
// со страницей каталога, которая прокручивается; справа заголовок и светящаяся кнопка с адресом сайта;
// спикер уменьшается из полного кадра в карточку с белой рамкой справа снизу.
// fromFrame — с какого кадра ролика начинается финал: видео в карточке идёт синхронно с голосом.
// returnBack — за последние ~1,6 с спикер возвращается из карточки в полный кадр (так было до 28.10.2026;
// теперь по умолчанию ролик заканчивается на сайте в телефоне — finaleBack).
const Finale: React.FC<{src: string; site: TalkReelProProps["site"]; title: string; seconds: number; fromFrame: number; returnBack?: boolean}> = ({
  src,
  site,
  title,
  seconds,
  fromFrame,
  returnBack = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const ease = Easing.bezier(0.22, 1, 0.36, 1);
  const k = (a: number, b: number) =>
    interpolate(frame, [a * fps, b * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  const back = returnBack ? k(seconds - 1.7, seconds - 1.0) : 0; // возврат в полный кадр
  const card = k(0, 0.7) * (1 - back); // 0 — полный кадр, 1 — карточка
  const phone = k(0.35, 1.1) * (1 - back);
  const head = k(0.8, 1.3) * (1 - back);
  const pill = spring({frame: frame - Math.round(1.1 * fps), fps, config: {damping: 12, stiffness: 140}});
  const glow = 0.55 + 0.45 * Math.sin((frame / fps) * Math.PI * 1.2);
  const CARD = {left: 600, top: 840, w: 400, h: 520};
  const lerp = (a: number, b: number) => a + (b - a) * card;
  const phoneW = 420;
  const phoneH = 900;
  return (
    <AbsoluteFill style={{background: B.finale.bg}}>
      {B.finale.grid ? (
        // Aura: тонкая сетка, как на карточках первого экрана сайта; линии «прорисовываются» сверху вниз
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${B.finale.grid} 2px, transparent 2px), linear-gradient(90deg, ${B.finale.grid} 2px, transparent 2px)`,
            backgroundSize: "90px 90px",
            maskImage: `linear-gradient(to bottom, black ${k(0, 1.2) * 100}%, transparent ${k(0, 1.2) * 100 + 8}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, black ${k(0, 1.2) * 100}%, transparent ${k(0, 1.2) * 100 + 8}%)`,
          }}
        />
      ) : null}
      {B.finale.dots ? (
        // od: точечная сетка, как на светлых секциях сайта; точки проявляются сверху вниз
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(${B.finale.dots} 2.2px, transparent 2.6px)`,
            backgroundSize: "36px 36px",
            maskImage: `linear-gradient(to bottom, black ${k(0, 1.2) * 100}%, transparent ${k(0, 1.2) * 100 + 8}%)`,
            WebkitMaskImage: `linear-gradient(to bottom, black ${k(0, 1.2) * 100}%, transparent ${k(0, 1.2) * 100 + 8}%)`,
          }}
        />
      ) : null}
      {/* телефон */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 330,
          width: phoneW,
          height: phoneH,
          perspective: 1400,
          opacity: phone,
          translate: `${(1 - phone) * -500}px 0px`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 64,
            background: "#0E1220",
            padding: 12,
            boxShadow: "0 40px 90px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.08) inset",
            rotate: `y ${14 - 4 * phone}deg`,
          }}
        >
          <div style={{position: "relative", width: "100%", height: "100%", borderRadius: 52, overflow: "hidden", background: "#FFFFFF"}}>
            <PhoneScreen home={site.home} catalog={site.catalog} route={site.route} w={phoneW - 24} seconds={seconds} />
          </div>
        </div>
      </div>
      {/* заголовок и кнопка с адресом */}
      <div style={{position: "absolute", left: 545, right: 40, top: 410, opacity: head, translate: `0px ${(1 - head) * 40}px`}}>
        <div
          style={{
            fontFamily: B.finale.titleFont,
            fontWeight: B.finale.titleWeight,
            fontSize: title.length > 12 ? 38 : 52,
            letterSpacing: B.id === "aura" ? "-0.02em" : undefined,
            color: B.finale.title,
            whiteSpace: "nowrap",
            display: "inline-block",
            // Aura и od: заголовок подчёркивает маркер, как выделения на сайте
            backgroundImage: B.highlighter ? `linear-gradient(${B.accent}, ${B.accent})` : undefined,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${k(1.0, 1.5) * 100}% 40%`,
            backgroundPosition: "0% 85%",
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 545,
          top: 505,
          opacity: pill * (1 - back),
          scale: String(0.7 + 0.3 * pill),
          transformOrigin: "left center",
          background: B.finale.button,
          color: B.finale.buttonText,
          fontFamily: B.id === "od" ? B.monoFont : B.bodyFont,
          fontWeight: B.id === "aura" ? 600 : B.id === "od" ? 500 : 700,
          fontSize: B.id === "aura" ? 36 : B.id === "od" ? 34 : 40,
          padding: "24px 38px",
          borderRadius: B.square ? 0 : 999,
          border: B.square ? `2px solid ${B.finale.button}` : undefined,
          boxShadow: B.finale.buttonShadow ?? `0 0 ${40 + 30 * glow}px rgba(${B.finale.buttonGlow},${0.55 + 0.3 * glow}), 0 16px 40px rgba(0,0,0,0.4)`,
        }}
      >
        {B.site}
      </div>
      {/* спикер: из полного кадра в карточку */}
      <div
        style={{
          position: "absolute",
          left: lerp(0, CARD.left),
          top: lerp(0, CARD.top),
          width: lerp(1080, CARD.w),
          height: lerp(1920, CARD.h),
          borderRadius: B.square ? 0 : 32 * card,
          overflow: "hidden",
          border: `${6 * card}px solid ${B.frameBorder}`,
          boxShadow: B.square ? `${14 * card}px ${14 * card}px 0 rgba(25,25,34,${card})` : `0 30px 70px rgba(0,0,0,${0.5 * card})`,
        }}
      >
        <SpeakerVideo src={src} trimBefore={fromFrame} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 40%"}} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- маскот Aura: появляется только по сюжету (решение пользователя 08.10.2026) ----------
// Робот не бродит по кадру: выходит из-за края под конкретное событие и уходит обратно.
// - начало: выходит справа, машет, уходит;
// - логотипы брендов: заходит слева и «вытаскивает» карточки из-за левого края (жест pull) — карточки Aura слева;
// - перечисления (чек-листы): встаёт у флипчарта и ставит галочки на каждом пункте;
// - финал: запрыгивает на карточку спикера, показывает на кнопку сайта, в конце машет.
const auraPlan = (p: TalkReelProProps, total: number): MascotPlan => {
  const top = p.format === "stories" ? 78 : 0;
  const Y = 1535; // «пол» внизу кадра, выше интерфейса Instagram
  const OFF_R = {x: 1270, y: Y, face: 0};
  const HOME = {x: 905, y: Y, face: -0.35};
  const PULL = {x: 175, y: 880 + top, face: -1.15}; // слева от головы, под карточками логотипов
  const OFF_L = {x: -190, y: 880 + top, face: 0};
  const FLIP = {x: 905, y: Y, face: -0.95}; // справа от флипчарта
  const FINAL = {x: 660, y: 905, face: -0.8};
  type Ev = {from: number; to: number; spot: typeof HOME; off: typeof HOME; g: {at: number; kind: GestureKind}[]};
  const ev: Ev[] = [];
  for (const g of p.logos)
    ev.push({from: g.items[0].at - 0.7, to: g.until, spot: PULL, off: OFF_L, g: g.items.map((it) => ({at: it.at - 0.35, kind: "pull" as const}))});
  for (const l of p.checklists)
    ev.push({from: l.items[0].at - 0.9, to: l.until, spot: FLIP, off: OFF_R, g: l.items.map((it) => ({at: it.at - 0.3, kind: "tick" as const}))});
  ev.sort((a, b) => a.from - b.from);
  const end = p.site.at;
  const stays: MascotStay[] = [{at: 0, ...OFF_R}, {at: 1.1, ...HOME}, {at: 4.2, ...OFF_R}];
  const gestures: MascotPlan["gestures"] = [{at: 1.2, kind: "wave"}];
  let last = 4.2;
  for (const e of ev) {
    if (e.from < last + 1.2 || e.from > end - 2) continue; // события внахлёст пропускаем — без суеты
    stays.push({at: e.from, ...e.off}); // ждёт за краем
    stays.push({at: e.from + 0.7, ...e.spot});
    gestures.push(...e.g);
    stays.push({at: e.to + 0.9, ...e.off});
    last = e.to + 0.9;
  }
  stays.push({at: Math.max(last + 0.3, end - 0.2), ...OFF_R});
  stays.push({at: end + 1.1, ...FINAL});
  gestures.push({at: end + 1.3, kind: "pointUp"});
  gestures.push({at: total - 1.4, kind: "wave"});
  return {stays, gestures: gestures.sort((a, b) => a.at - b.at)};
};

// печать Aura над головой не налезает на лоб (решение пользователя 08.10.2026): верх лица следует за зумом и подъёмом
// спикера (тот же расчёт, что у видео), печать плавно уменьшается и поднимается, оставляя зазор над лбом
const AuraBadgeSlot: React.FC<TalkReelProProps> = (p) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const stories = p.format === "stories";
  const top0 = stories ? 200 : 70;
  const minTop = stories ? 170 : 34;
  const SIZE = 200;
  let size = SIZE;
  let top = top0;
  if (t < p.site.at) {
    const lift = Math.max(cityAmount(p.cities, t), listAmount(p.checklists, t), clipAmount(p.clips ?? [], t)) * 330;
    const zoom = zoomAt(p.cuts, p.zooms, t, 4);
    const faceTop = p.faceTop ?? p.focus.y - 230; // линия роста волос
    const forehead = p.focus.y + (faceTop - p.focus.y) * zoom - lift;
    const room = forehead - 24; // нижний край печати не ниже этой линии
    if (top + size > room) {
      top = Math.max(minTop, room - size);
      size = Math.max(130, Math.min(SIZE, room - top));
    }
  }
  return (
    <div style={{position: "absolute", top, left: "50%", translate: "-50% 0", width: SIZE, height: SIZE, scale: String(size / SIZE), transformOrigin: "50% 0"}}>
      <AuraBadge size={SIZE} />
    </div>
  );
};

// сколько хука на экране (0…1) — печать ОД и плашка серии прячутся, пока текст хука стоит за спикером
const hookAmount = (hooks: TalkReelProProps["hooks"], t: number) =>
  Math.max(0, ...(hooks ?? []).map((h) => Math.min(interpolate(t, [h.at - 0.2, h.at], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), interpolate(t, [h.until, h.until + 0.25], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}))));

// плашки и крупные цифры встают в левый верхний угол — на это время печать ОД и плашка серии прячутся
const topAmount = (p: TalkReelProProps, t: number) => {
  const spans = [...p.chips.map((g) => [g.items[0].at, g.until]), ...p.numbers.map((n) => [n.at, n.until])];
  return Math.max(0, ...spans.map(([a, b]) => Math.min(interpolate(t, [a - 0.25, a], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), interpolate(t, [b, b + 0.25], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}))));
};

// ---------- фирменная заставка GTT в начале и конце (GttIntro) ----------
// Интро 1,8 с (54 кадра): последние 10 кадров — треугольное окно раскрывается на начало ролика, поэтому ролик стартует
// на 44-м кадре. Аутро 1,5 с (45 кадров): первые 10 кадров окно закрывается на конце ролика, потом 35 кадров логотипа.
const BUMPER = {intro: 54, outro: 45, overlap: 10};
export const bumperOf = (p: Pick<TalkReelProProps, "brand" | "bumper">) => {
  if ((p.brand ?? "gtt") !== "gtt" || p.bumper === false) return null; // заставка только у GTT
  const b = p.bumper || {};
  return {intro: b.intro ?? true, outro: b.outro ?? true, introVariant: b.introVariant ?? "shards", outroVariant: b.outroVariant ?? "shards"};
};
// сколько кадров заставка добавляет в начале (lead) и в конце (tail) — для длины композиции и точек разреза Stories
export const bumperFrames = (p: Pick<TalkReelProProps, "brand" | "bumper">) => {
  const b = bumperOf(p);
  return {lead: b?.intro ? BUMPER.intro - BUMPER.overlap : 0, tail: b?.outro ? BUMPER.outro - BUMPER.overlap : 0};
};

export const TalkReelPro: React.FC<TalkReelProProps> = (p) => {
  const {durationInFrames} = useVideoConfig();
  const b = bumperOf(p);
  if (!b) return <TalkReelProBody {...p} />;
  const {lead, tail} = bumperFrames(p);
  const main = durationInFrames - lead - tail;
  return (
    <AbsoluteFill style={{backgroundColor: "#EEEEF2"}}>
      <Sequence from={lead} durationInFrames={main} name="Ролик">
        <TalkReelProBody {...p} />
      </Sequence>
      {b.intro ? (
        <Sequence from={0} durationInFrames={BUMPER.intro} name="Заставка: интро">
          <GttIntro variant={b.introVariant} mode="intro" transparent />
        </Sequence>
      ) : null}
      {b.outro ? (
        <Sequence from={lead + main - BUMPER.overlap} durationInFrames={BUMPER.outro} name="Заставка: аутро">
          <GttIntro variant={b.outroVariant} mode="outro" transparent />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

const TalkReelProBody: React.FC<TalkReelProProps> = (p) => {
  const {fps, durationInFrames} = useVideoConfig();
  const frame = useCurrentFrame();
  const screens = chainScreens(p.screens);
  const f = (s: number) => Math.round(s * fps);
  const siteFrom = f(p.site.at);
  const sfxAt: {at: number; src: string; volume?: number}[] = [
    ...(p.sounds ?? []).map((x) => ({at: x.at, src: p.sfx[x.kind] ?? p.sfx.pop, volume: x.volume ?? 0.45})),
    ...p.chips.flatMap((g) => g.items.map((c) => ({at: c.at, src: p.sfx.pop}))),
    ...p.chips.flatMap((g) => g.items.filter((c) => c.strike !== undefined).map((c) => ({at: c.strike as number, src: p.sfx.whoosh}))),
    ...p.zooms.filter((z) => z.kind === "punch" && p.sfx.whip).map((z) => ({at: z.at, src: p.sfx.whip as string, volume: 0.16})),
    ...p.logos.flatMap((g) => g.items.map((l) => ({at: l.at, src: p.sfx.whoosh}))),
    ...p.numbers.map((n) => ({at: n.at, src: p.sfx.whoosh})),
    ...p.broll.map((b) => ({at: b.at, src: p.sfx.whoosh})),
    ...p.cities.map((c) => ({at: c.at, src: p.sfx.pop})),
    ...p.checklists.flatMap((l) => l.items.map((it) => ({at: it.at, src: p.sfx.pop}))),
    {at: p.site.at, src: p.sfx.whoosh},
    ...(p.socials ?? []).flatMap((c) => [{at: c.at, src: p.sfx.whoosh}, ...(c.pressAt !== undefined ? [{at: c.pressAt, src: p.sfx.pop}] : [])]),
    ...(p.arrows ?? []).map((a) => ({at: a.at, src: p.sfx.pop})),
    ...(p.emojis ?? []).map((e) => ({at: e.at, src: p.sfx.pop, volume: 0.3})),
    ...(p.speaker ?? []).flatMap((x) => [{at: x.at, src: p.sfx.whoosh, volume: 0.28}, {at: x.until - 0.4, src: p.sfx.whoosh, volume: 0.2}]),
    ...(p.panels ?? []).map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.32})),
    ...(p.texts ?? []).map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.25})),
    ...(p.lists ?? []).flatMap((l) => l.items.map((it) => ({at: it.at, src: p.sfx.click ?? p.sfx.pop, volume: 0.45}))),
    ...p.zooms.filter((z) => z.kind === "pull").map((z) => ({at: z.at, src: p.sfx.whoosh, volume: 0.25})),
    // экран въезжает — «вжух»; смена страницы встык — тихий щелчок
    ...screens.map((sc) => (sc.joinIn ? {at: sc.at, src: p.sfx.pop, volume: 0.25} : {at: sc.at - 0.1, src: p.sfx.whoosh, volume: 0.35})),
    ...(p.socialGrid ?? []).flatMap((g) => g.items.map((_, i) => ({at: g.at + (8 + i * 4) / 30, src: p.sfx.pop, volume: 0.25}))),
    // хуки: строки — «вжух», буквы столбиков и слова по одному — щелчок
    ...(p.hooks ?? []).flatMap((h) => {
      const snd = hookSounds(h);
      return [...snd.whoosh.map((at) => ({at, src: p.sfx.whoosh, volume: 0.3})), ...snd.click.map((at) => ({at, src: p.sfx.click ?? p.sfx.pop, volume: 0.5}))];
    }),
    // заливка из угла — «вжух»; ч/б → цвет — хлопок в момент вспышки цвета
    ...(p.fx ?? []).map((x) => (x.type === "wipe" ? {at: x.at, src: p.sfx.whip ?? p.sfx.whoosh, volume: 0.35} : {at: x.until ?? x.at + 1, src: p.sfx.pop, volume: 0.35})),
    ...(p.episode ? [{at: p.speechSeconds, src: p.sfx.whoosh, volume: 0.3}] : []),
    // приёмы из референсов 23.10.2026
    ...p.zooms.filter((z) => z.kind === "macro").map((z) => ({at: z.at, src: p.sfx.whip ?? p.sfx.whoosh, volume: 0.22})),
    ...(p.fx ?? []).filter((x) => x.type === "leak").map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.3})),
    ...(p.splits ?? []).map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.32})),
    ...(p.titles ?? []).map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.28})),
    ...(p.chats ?? []).flatMap((x) => [{at: x.at, src: p.sfx.pop, volume: 0.3}, {at: Math.min(x.until - 0.5, x.at + 0.65 + 0.055 * x.text.length), src: p.sfx.click ?? p.sfx.pop, volume: 0.45}]),
    ...(p.floats ?? []).flatMap((x) => x.items.slice(0, 4).map((_, i) => ({at: x.at + i * 0.18, src: p.sfx.pop, volume: 0.28}))),
    ...(p.cards ?? []).map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.3})),
    ...(p.outros ?? []).map((x) => ({at: x.at + 0.2, src: p.sfx.pop, volume: 0.35})),
    ...(p.inscreens ?? []).map((x) => ({at: x.at, src: p.sfx.click ?? p.sfx.pop, volume: 0.3})),
    ...(p.fx ?? []).filter((x) => x.type === "whip").map((x) => ({at: x.at, src: p.sfx.whip ?? p.sfx.whoosh, volume: 0.4})),
    ...(p.marks ?? []).map((x) => ({at: x.at, src: p.sfx.click ?? p.sfx.pop, volume: 0.3})),
    ...(p.asks ?? []).map((x) => ({at: x.at, src: p.sfx.pop, volume: 0.35})),
    ...(p.stamps ?? []).map((x) => ({at: x.at + 0.15, src: p.sfx.whip ?? p.sfx.pop, volume: 0.5})),
    ...(p.searches ?? []).map((x) => ({at: x.at, src: p.sfx.click ?? p.sfx.pop, volume: 0.3})),
    ...(p.dots ?? []).map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.25})),
    ...(p.votes ?? []).map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.35})),
    ...(p.drums ?? []).flatMap((x) => x.items.map((_, i) => ({at: x.at + 0.3 + (i * (x.until - x.at - 0.6)) / Math.max(1, x.items.length), src: p.sfx.click ?? p.sfx.pop, volume: 0.35}))),
    ...(p.rings ?? []).map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.25})),
    ...(p.chapters ?? []).map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.2})),
    // приёмы референса 28.10.2026: мягкие UI-щелчки на каждом появлении
    ...(p.widgets ?? []).flatMap((x) => x.items.slice(0, 7).map((_, i) => ({at: x.at + i * 0.07, src: p.sfx.click ?? p.sfx.pop, volume: 0.22}))),
    ...(p.docus ?? []).flatMap((x) => [{at: x.at, src: p.sfx.whoosh, volume: 0.3}, ...(x.button !== "" ? [{at: x.at + Math.min(1.55, x.until - x.at - 0.6), src: p.sfx.click ?? p.sfx.pop, volume: 0.45}] : [])]),
    ...(p.orbits ?? []).map((x) => ({at: x.at, src: p.sfx.whoosh, volume: 0.3})),
    ...(p.charts ?? []).flatMap((x) => [{at: x.at, src: p.sfx.whoosh, volume: 0.3}, ...x.bars.slice(0, 8).map((_, i) => ({at: x.at + 0.3 + i * 0.08, src: p.sfx.click ?? p.sfx.pop, volume: 0.16}))]),
    ...(p.timelines ?? []).flatMap((x) => [{at: x.at, src: p.sfx.whoosh, volume: 0.3}, ...(x.rows ?? []).slice(0, 5).map((_, i) => ({at: x.at + 0.45 + i * 0.22, src: p.sfx.click ?? p.sfx.pop, volume: 0.2}))]),
    ...(p.neons ?? []).map((x) => ({at: x.at + 0.07, src: p.sfx.pop, volume: 0.35})),
    ...(p.prompts ?? []).flatMap((x) => {
      const typeEnd = Math.min((x.until - x.at) * 0.42, 0.3 + 0.06 * x.text.length);
      const keys = Array.from({length: Math.ceil(x.text.length / 2)}, (_, i) => ({at: x.at + 0.3 + ((typeEnd - 0.3) * i * 2) / Math.max(1, x.text.length), src: p.sfx.click ?? p.sfx.pop, volume: 0.14}));
      return [...keys, {at: x.at + typeEnd + 0.15, src: p.sfx.pop, volume: 0.35}, {at: x.until - 0.55, src: p.sfx.whoosh, volume: 0.35}];
    }),
    ...(p.outros ?? []).filter((x) => x.grid?.length || x.gridFrames).map((x) => ({at: x.at + 0.2, src: p.sfx.whoosh, volume: 0.3})),
  ];

  const tNow = frame / fps;
  const palNow = (p.paletteAt ?? []).find((x) => tNow >= x.at && tNow <= x.until);
  const brand = brandWithPalette(brandWithPalette(BRANDS[p.brand ?? "gtt"], p.palette), palNow);
  const stories = p.format === "stories";
  const push = panelPush(p.panels, tNow, stories);
  const whip = whipAt(p.fx, tNow);
  const defocus = defocusAt(p.fx, tNow);
  // флипчарт и «печатная машинка» поднимают спикера, как планшет с галочками
  const liftLists = [...p.checklists, ...((p.lists ?? []).filter((l) => LIFT_LISTS.has(l.style)) as unknown as TalkReelProProps["checklists"])];
  const plan = React.useMemo(() => (brand.id === "aura" ? auraPlan(p, durationInFrames / fps) : null), [brand.id, p, durationInFrames, fps]);
  const edl = React.useMemo(() => (p.edl?.length ? {media: p.mediaSrc, segs: placeEdl(p.edl)} : null), [p.edl, p.mediaSrc]);
  // отрезки речи для приглушения музыки: слова с паузами меньше 0,35 с — один отрезок
  const speech = React.useMemo(() => {
    const out: [number, number][] = [];
    for (const w of p.words) {
      const last = out[out.length - 1];
      if (last && w.start - last[1] < 0.35) last[1] = Math.max(last[1], w.end);
      else out.push([w.start, w.end]);
    }
    return out;
  }, [p.words]);
  return (
    <BrandCtx.Provider value={brand}>
    <EdlCtx.Provider value={edl}>
    <AbsoluteFill style={{backgroundColor: "#0B0D14"}}>
      {edl ? <EdlAudio /> : <Audio src={staticFile(p.audioSrc || p.mediaSrc)} />}
      {p.music ? (
        <Audio
          src={staticFile(p.music.src)}
          volume={(fr) => {
            // точки громкости всегда по возрастанию, даже если ролик кончается сразу после последней фразы
            const end = durationInFrames / fps;
            const a = Math.min(p.speechSeconds - 0.5, end - 2.4);
            const b = Math.min(p.speechSeconds + 0.6, end - 1.3);
            const c = Math.max(b + 0.05, end - 1.2);
            const v = interpolate(fr / fps, [0, 1.2, Math.max(1.25, a), Math.max(1.3, b), c, Math.max(c + 0.05, end)], [
              0, p.music!.volume, p.music!.volume, p.music!.outroVolume, p.music!.outroVolume, 0,
            ], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
            const duck = p.music!.duck;
            if (!duck || duck >= 1) return v;
            // расстояние до ближайшей речи: внутри — duck, дальше 0,25 с — полная громкость
            const t = fr / fps;
            let d = Infinity;
            for (const [s0, s1] of speech) {
              if (s0 - 0.25 > t) break;
              d = t >= s0 && t <= s1 ? 0 : Math.min(d, Math.abs(t < s0 ? s0 - t : t - s1));
              if (!d) break;
            }
            return v * (duck + (1 - duck) * Math.min(1, d / 0.25));
          }}
        />
      ) : null}
      {sfxAt.map((s, i) => (
        <Sequence key={`sfx-${i}`} from={Math.max(0, f(s.at) - 2)} durationInFrames={fps}>
          <Audio src={staticFile(s.src)} volume={s.volume ?? 0.4} />
        </Sequence>
      ))}

      {/* подача drop: под карточкой спикера — фон «кость» со ссылками на каналы и сайты */}
      <DropBackdrop screens={screens} links={p.links} />
      {whip ? <WhipFilter blur={whip.blur} /> : null}
      <AbsoluteFill style={{translate: `${push.x + (whip?.x ?? 0)}px ${speakerShift(screens, frame / fps) + push.y}px`, ...speakerCardStyle(screens, frame / fps, p.focus), filter: [p.grade, bwFilter(p.fx, frame / fps), defocus > 0.001 ? `blur(${(18 * defocus).toFixed(1)}px) brightness(${(1 - 0.12 * defocus).toFixed(3)})` : "", whip && whip.blur > 0.5 ? "url(#whipblur)" : ""].filter(Boolean).join(" ") || undefined}}>
      <ZoomedVideo
        src={p.mediaSrc}
        cutoutSrc={p.cutoutSrc}
        cuts={p.cuts}
        broll={p.broll}
        cities={p.cities}
        zooms={p.zooms}
        stockDrop={p.stockDrop}
        focus={p.focus}
        checklists={liftLists}
        bgFlags={p.bgFlags}
        angleB={p.angleB}
        clips={p.clips}
        hooks={p.hooks}
        speaker={p.speaker}
        texts={p.texts}
        titles={p.titles}
        floats={p.floats}
        inscreens={p.inscreens}
        bgs={p.bgs}
        rings={p.rings}
        docus={p.docus}
        orbits={p.orbits}
        neons={p.neons}
        words={p.words}
        captionsAt={p.captionsAt}
        accentWords={p.accentWords}
        faceTop={p.faceTop}
        stories={stories}
      />
      </AbsoluteFill>
      <Splits items={p.splits} video={p.mediaSrc} focus={p.focus} grade={p.grade} />
      <Charts items={p.charts} video={p.mediaSrc} focus={p.focus} grade={p.grade} stories={stories} />
      <Timelines items={p.timelines} video={p.mediaSrc} focus={p.focus} grade={p.grade} stories={stories} />
      <DropFrame screens={screens} />
      <CityPanel cities={p.cities} />
      {p.clips ? <ClipPanel clips={p.clips} /> : null}
      <ChecklistPanel lists={p.checklists} />
      <Lists items={p.lists} stories={stories} />
      <Panels items={p.panels} stories={stories} />
      <Texts3D items={p.texts} plane="front" />
      <Titles items={p.titles} plane="front" />
      <Floats items={p.floats} plane="front" focus={p.focus} />
      <Cards items={p.cards} />
      <Chats items={p.chats} video={p.mediaSrc} focus={p.focus} />
      <Rings items={p.rings} focus={p.focus} faceTop={p.faceTop} half="front" />
      <Orbits items={p.orbits} focus={p.focus} half="front" />
      {p.cutoutSrc ? null : <Neons items={p.neons} focus={p.focus} faceTop={p.faceTop} part="sign" stories={stories} />}
      <Widgets items={p.widgets} video={p.mediaSrc} focus={p.focus} stories={stories} />
      <Docus items={p.docus} stories={stories} />
      <Searches items={p.searches} />
      <DotsGrid items={p.dots} />
      <Drums items={p.drums} />
      <Asks items={p.asks} focus={p.focus} />
      <Stamps items={p.stamps} />
      <WordCounters items={p.counters} words={p.words} stories={stories} />

      {/* в Stories верх занят полосками и аватаром: верхняя полоса плашек опускается (TopShift) */}
      <TopShift.Provider value={p.format === "stories" ? 130 : 0}>
      {p.chips.map((g, i) => {
        const start = g.items[0].at;
        return (
          <Sequence key={`chips-${i}`} from={f(start)} durationInFrames={f(g.until - start)}>
            <ChipGroup group={g} start={start} />
          </Sequence>
        );
      })}
      {p.logos.map((g, i) => {
        const start = g.items[0].at;
        return (
          <Sequence key={`logos-${i}`} from={f(start)} durationInFrames={f(g.until - start)}>
            {g.flip ? <FlipCard group={g} start={start} /> : <LogoGroup group={g} start={start} />}
          </Sequence>
        );
      })}
      {p.numbers.map((n, i) => (
        <Sequence key={`num-${i}`} from={f(n.at)} durationInFrames={f(n.until - n.at)}>
          <BigNumber n={n} />
        </Sequence>
      ))}
      {(p.socials ?? []).map((c, i) => (
        <Sequence key={`social-${i}`} from={f(c.at)} durationInFrames={f(c.until - c.at)} premountFor={fps}>
          <div style={{position: "absolute", left: 56, top: (p.format === "stories" ? 130 : 0) + 300}}>
            <SocialCard {...c} until={c.until - c.at} pressAt={c.pressAt === undefined ? undefined : c.pressAt - c.at} />
          </div>
        </Sequence>
      ))}
      {(p.socialGrid ?? []).map((g, i) => (
        <Sequence key={`sgrid-${i}`} from={f(g.at)} durationInFrames={f(g.until - g.at)} premountFor={fps}>
          <div style={{position: "absolute", left: 64, top: (p.format === "stories" ? 130 : 0) + 300}}>
            <SocialGrid title={g.title} items={g.items} until={g.until - g.at} />
          </div>
        </Sequence>
      ))}
      {(p.arrows ?? []).map((a, i) => (
        <Sequence key={`arrow-${i}`} from={f(a.at)} durationInFrames={f(a.until - a.at)} premountFor={fps}>
          <div style={{position: "absolute", right: 64, top: (p.format === "stories" ? 130 : 0) + 330}}>
            <LinkArrow text={a.text} until={a.until - a.at} />
          </div>
        </Sequence>
      ))}
      <Emojis items={(p.emojis ?? []).map((e) => ({...e, y: (e.y ?? 470) + (p.format === "stories" ? 130 : 0)}))} />
      </TopShift.Provider>

      {screens.map((sc, i) => (
        // экран, который сменяется следующим встык, держится ещё 0,45 с — пока новая страница проявляется поверх
        <Sequence key={`screen-${i}`} from={f(sc.at - 0.1)} durationInFrames={f(sc.until - sc.at + 0.1 + (sc.joinOut ? 0.45 : 0))} premountFor={fps}>
          <ScreenPanel s={{...sc, at: sc.at - 0.1}} cutoutSrc={p.cutoutSrc} />
        </Sequence>
      ))}
      <Sequence from={siteFrom}>
        <Finale
          src={p.mediaSrc}
          site={p.site}
          title={p.cta}
          seconds={(durationInFrames - siteFrom) / fps}
          fromFrame={siteFrom}
          returnBack={p.finaleBack}
        />
      </Sequence>

      {plan ? <AuraMascot plan={plan} scale={1.15} /> : null}
      {(p.flags ?? []).map((fl, i) => (
        <Sequence key={`flags-${i}`} from={f(fl.at)} durationInFrames={f(fl.until - fl.at)}>
          <FlagArc items={fl.items} at={fl.at} until={fl.until} center={p.focus} />
        </Sequence>
      ))}
      {capStyleAt(p.captionsAt, tNow) || outroActive(p.outros, tNow) || voteActive(p.votes, tNow) || promptActive(p.prompts, tNow) ? null : (
      <BigCaptions words={p.words} accent={p.accentWords} until={p.speechSeconds} lowFrom={siteFrom} cities={p.cities} lists={liftLists} boards={p.checklists} broll={p.broll} clips={[...(p.clips ?? []), ...((p.panels ?? []).filter((x) => (x.from ?? "bottom") === "bottom") as unknown as NonNullable<TalkReelProProps["clips"]>)]} top={lowCaptions(p.chats, p.cards, tNow) || panelSplitActive(p.charts, p.timelines, tNow) ? 1450 : p.captionTop} size={p.captionSize} screens={screens} style3d={p.captionStyle === "3d"} fixed={p.captionFixed} />
      )}
      <RefCaptions words={p.words} items={p.captionsAt} until={p.speechSeconds} accent={p.accentWords} focus={p.focus} />
      <Marks items={p.marks} />
      <Chapters items={p.chapters} until={p.speechSeconds} stories={stories} progress={p.chapterBar} />
      <Votes items={p.votes} />
      {brand.id === "aura" ? (
        // Aura: круглая печать крутится над головой спикера, по центру; в Stories — ниже полосок и аватара
        <AuraBadgeSlot {...p} />
      ) : brand.id === "od" ? (
        // od: красная печать «ОД» и бумажная плашка «Остап Доценко.» слева сверху (как шапка сайта); пока на экране сайт — прячется
        p.badge === false ? null :
        <div style={{position: "absolute", top: p.format === "stories" ? 196 : 76, left: 48, opacity: (1 - (activeScreen(screens, frame / fps)?.k ?? 0)) * (1 - hookAmount(p.hooks, frame / fps)) * (1 - topAmount(p, frame / fps))}}>
          <OdBadge scale={0.9} />
        </div>
      ) : (
        // логотип: стеклянная пирамида + крупная белая надпись с бликом (как в референсе)
        <div style={{position: "absolute", top: p.format === "stories" ? 210 : 86, left: 56}}>
          <SiteLogo variant="title" scale={1} />
        </div>
      )}
      <WatermarkCorner wm={p.watermark} stories={stories} hidden={outroActive(p.outros, tNow)} />
      <Prompts items={p.prompts} video={p.mediaSrc} focus={p.focus} grade={p.grade} />
      <Outros items={p.outros} video={p.mediaSrc} total={p.speechSeconds} focus={p.focus} />
      <ColorWipes fx={p.fx} />
      <LightLeaks fx={p.fx} />
      {p.episode ? <EpisodeOutro ep={p.episode} start={p.speechSeconds - 0.05} links={p.links ?? OD_LINKS} /> : null}
      {p.showSafeZone ? <SafeZone /> : null}
    </AbsoluteFill>
    </EdlCtx.Provider>
    </BrandCtx.Provider>
  );
};
