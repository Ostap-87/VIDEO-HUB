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
  chips: z.array(z.object({until: z.number(), wrap: z.boolean(), items: z.array(chip)})),
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
    z.object({text: z.string(), sub: z.string(), at: z.number(), until: z.number(), tone: z.enum(["up", "down"]).optional()}),
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
      mode: z.enum(["cutout", "pip"]).optional(),
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
  // второй ракурс (вторая камера, scripts/angle_b.py): в отрезках shots кадр переключается на боковой план
  angleB: z.object({src: z.string(), shots: z.array(z.object({at: z.number(), until: z.number()}))}).optional(),
  // Зумы на ключевых словах: punch — резкий наезд за 3 кадра (со звуком whip), push — плавный медленный наезд.
  // Держится hold секунд, потом плавно уходит. Между склейками уровни зума тоже чередуются (часть — плавно).
  zooms: z
    .array(z.object({at: z.number(), kind: z.enum(["punch", "push"]), amount: z.number(), hold: z.number()}))
    .default([]),
  sfx: z.object({pop: z.string(), whoosh: z.string(), whip: z.string().optional()}),
  // Фоновая музыка (только треки с коммерческой лицензией); volume ~0.1 под голосом, громче в финале
  music: z.object({src: z.string(), volume: z.number(), outroVolume: z.number()}).optional(),
  speechSeconds: z.number(),
  // Финал: на экране телефона главная страница (прокрутка) → каталог экспедиций (прокрутка) → маршрут по дням
  site: z.object({at: z.number(), home: z.string(), catalog: z.string(), route: z.array(z.string())}),
  cta: z.string(),
  ctaSeconds: z.number(),
  showSafeZone: z.boolean(),
  // reels — как есть; stories — логотип ниже верхней панели Stories (полоски прогресса и аватар занимают ~200 px)
  format: z.enum(["reels", "stories"]).default("reels"),
  // бренд: gtt — GlobalTechTour, aura — Aura Robotics (свой стиль, круглый логотип и 3D-маскот, src/brand.ts)
  brand: z.enum(["gtt", "aura"]).default("gtt"),
  // Линия глаз из scripts/grid.py (_work/имя.cut.layout.json): точка между глазами — центр всех зумов,
  // поэтому при наездах глаза остаются на своей линии и не «прыгают»
  focus: z.object({x: z.number(), y: z.number()}).default({x: 540, y: 614}),
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
}> = ({words, accent, until, lowFrom, cities, lists, broll = [], clips}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (t >= until) return null;
  const pages: TalkReelProProps["words"][] = [];
  for (let i = 0; i < words.length; i += 3) pages.push(words.slice(i, i + 3));
  const page = [...pages].reverse().find((p) => p[0].start <= t);
  if (!page || t > page[page.length - 1].end + 0.5) return null;
  const pop = spring({frame: frame - Math.round(page[0].start * fps), fps, config: theme.motion.snappy, durationInFrames: 8});
  const clean = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}+]/gu, "");
  const B = useBrand();
  const dark = false;
  const low = frame >= lowFrom + 10; // в финале субтитры ниже карточки спикера
  return (
    <div
      style={{
        position: "absolute",
        left: 90 - 40 * pipAmount(broll, t),
        right: 90 + 300 * pipAmount(broll, t), // при карточке спикера в углу субтитры сдвигаются влево
        top: low ? 1420 : Math.max(cityAmount(cities, t), listAmount(lists, t), clipAmount(clips ?? [], t)) > 0.5 ? 780 : 1250,
        textAlign: "center",
        fontFamily: B.captionFont,
        fontWeight: B.captionWeight,
        fontSize: 66,
        lineHeight: 1.18,
        color: dark ? theme.colors.text : "#FFFFFF",
        textShadow: dark ? "none" : shadow,
        // тёмная обводка, чтобы белые субтитры читались и на светлых картинках-перебивках
        WebkitTextStroke: dark ? undefined : `10px ${B.captionStroke}`,
        paintOrder: "stroke fill",
        // на сайте — белая подложка, чтобы текст не сливался с кнопками страницы
        background: dark ? "rgba(255,255,255,0.94)" : undefined,
        borderRadius: dark ? 28 : undefined,
        padding: dark ? "18px 24px" : undefined,
        boxShadow: dark ? "0 16px 40px rgba(23,23,29,0.18)" : undefined,
        scale: String(0.85 + 0.15 * pop),
        opacity: pop,
      }}
    >
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
                  color: inked ? B.accentInk : "#FFFFFF",
                  WebkitTextStroke: inked ? "0px" : undefined,
                  textShadow: inked ? "none" : undefined,
                  backgroundImage: `linear-gradient(${B.accent}, ${B.accent})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${swipe}% 78%`,
                  backgroundPosition: "0% 60%",
                  borderRadius: 10,
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
          <span key={i} style={{color: hot ? (dark ? BLUE : B.accent) : dark ? theme.colors.text : "#FFFFFF"}}>
            {w.text}{" "}
          </span>
        );
      })}
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
        boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
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
        <span style={{width: 18, height: 18, borderRadius: 9, background: B.chip.dot, boxShadow: "0 0 0 3px #262626", flexShrink: 0, scale: String(0.4 + 0.6 * s)}} />
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
      <Img src={staticFile(src)} style={{maxHeight: 64 * (group.scale ?? 1), maxWidth: "100%", objectFit: "contain"}} />
    </div>
  );
  // на лицевой стороне — чётные логотипы, на обороте — нечётные
  const front = group.items[shown % 2 === 0 ? shown : Math.max(0, shown - 1)].src;
  const back = group.items[shown % 2 === 1 ? shown : Math.min(group.items.length - 1, shown + 1)].src;
  const sc = group.scale ?? 1;
  return (
    <div
      style={{
        position: "absolute",
        right: 40,
        top: 1405 - (sc - 1) * 90,
        width: 330 * sc,
        height: 124 * sc,
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
  const slots = [
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
        const sc = l.scale ?? group.scale ?? 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: fromLeft ? slot.left : undefined,
              right: fromLeft ? undefined : slot.right,
              top: slot.top,
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
            <Img src={staticFile(l.src)} style={{height: 72 * sc, maxWidth: Math.min(470, 360 * sc), objectFit: "contain", display: "block"}} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Крупная цифра с «попом» и синим свечением
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
          WebkitTextStroke: B.id === "aura" && n.tone !== "down" ? "6px #262626" : undefined,
          paintOrder: "stroke fill",
          textShadow:
            n.tone === "down"
              ? "0 0 40px rgba(255,59,59,0.8), 0 6px 20px rgba(0,0,0,0.45)"
              : `0 0 40px ${B.accentGlow}, 0 6px 20px rgba(0,0,0,0.45)`,
        }}
      >
        {n.text}
      </div>
      {n.sub ? (
        <div style={{fontFamily: B.bodyFont, fontWeight: 700, fontSize: 40, color: "#FFFFFF", textShadow: shadow, marginTop: 6}}>
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
const zoomAt = (allCuts: number[], zooms: TalkReelProProps["zooms"], t: number) => {
  // склейки ближе 0,7 с друг к другу не меняют уровень зума — иначе короткий кусок «мелькает» (как ускорение)
  const cuts = allCuts.filter((c, i) => i === 0 || c - allCuts[i - 1] >= 0.7);
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
    if (t < z.at || t > z.at + z.hold + 0.6) continue;
    const attack = z.kind === "punch" ? 0.1 : 1.4;
    const inP = interpolate(t, [z.at, z.at + attack], [0, 1], {
      extrapolateRight: "clamp",
      easing: z.kind === "punch" ? Easing.out(Easing.cubic) : Easing.bezier(0.33, 0, 0.2, 1),
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
}> = ({src, cutoutSrc, cuts, broll, cities, zooms, stockDrop, focus, checklists, bgFlags, angleB, clips}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const lift = Math.max(cityAmount(cities, t), listAmount(checklists, t), clipAmount(clips ?? [], t)) * 330; // лицо поднимается в верхнюю половину
  const zoom = zoomAt(cuts, zooms, t);
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
  const videoStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    scale: String(zoom),
    transformOrigin: `${focus.x}px ${focus.y}px`,
    translate: `0px ${-lift}px`,
  };
  return (
    <AbsoluteFill style={{background: "#0B0D14"}}>
      <OffthreadVideo src={staticFile(src)} muted style={{...videoStyle, opacity: kind === "fade" ? 1 - p : 1}} />
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
            <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted style={{...videoStyle, filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.4))"}} />
          </Sequence>
        ) : null,
      )}
      {stockDrop && !b && t >= stockDrop.at - 0.1 && t <= stockDrop.until + 0.1 ? (
        <>
          <StockChart drop={stockDrop} t={t} />
          <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted style={videoStyle} />
        </>
      ) : null}
      {b && b.mode === "pip" ? (
        // спикер уезжает карточкой в правый нижний угол, картинка — на весь экран
        <>
          <AbsoluteFill style={imgStyle}>
            <Img src={staticFile(b.src)} style={{width: "100%", height: "100%", objectFit: "cover", scale: String(kb)}} />
          </AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: PIP.x * p,
              top: PIP.y * p,
              width: 1080 + (PIP.w - 1080) * p,
              height: 1920 + (PIP.h - 1920) * p,
              borderRadius: 30 * p,
              overflow: "hidden",
              border: `${6 * p}px solid #FFFFFF`,
              boxShadow: `0 24px 60px rgba(0,0,0,${0.5 * p})`,
            }}
          >
            <OffthreadVideo
              src={staticFile(src)}
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: `${(focus.x / 1080) * 100}% ${Math.min(100, (focus.y / 1920) * 100 + 8)}%`,
                scale: String(1 + 0.25 * p),
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
const PIP = {x: 1080 - 60 - 330, y: 1060, w: 330, h: 440};
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
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: PANEL_TOP - 60,
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
          top: PANEL_TOP + 40,
          translate: `0px ${slide}px`,
          rotate: `${-1.5 * amount}deg`,
          background: B.paper,
          borderRadius: 34,
          padding: "70px 44px 34px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
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
            borderRadius: 18,
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
// За последние ~1,6 с спикер возвращается из карточки в полный кадр на естественном фоне (решение пользователя).
const Finale: React.FC<{src: string; site: TalkReelProProps["site"]; title: string; seconds: number; fromFrame: number}> = ({
  src,
  site,
  title,
  seconds,
  fromFrame,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const ease = Easing.bezier(0.22, 1, 0.36, 1);
  const k = (a: number, b: number) =>
    interpolate(frame, [a * fps, b * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  const back = k(seconds - 1.7, seconds - 1.0); // возврат в полный кадр
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
            // Aura: заголовок подчёркивает лимонный маркер, как выделения на сайте
            backgroundImage: B.id === "aura" ? `linear-gradient(${B.accent}, ${B.accent})` : undefined,
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
          fontFamily: B.bodyFont,
          fontWeight: B.id === "aura" ? 600 : 700,
          fontSize: B.id === "aura" ? 36 : 40,
          padding: "24px 38px",
          borderRadius: 999,
          boxShadow: `0 0 ${40 + 30 * glow}px rgba(${B.finale.buttonGlow},${0.55 + 0.3 * glow}), 0 16px 40px rgba(0,0,0,0.4)`,
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
          borderRadius: 32 * card,
          overflow: "hidden",
          border: `${6 * card}px solid ${B.id === "aura" ? "#262626" : "#FFFFFF"}`,
          boxShadow: `0 30px 70px rgba(0,0,0,${0.5 * card})`,
        }}
      >
        <OffthreadVideo
          src={staticFile(src)}
          muted
          trimBefore={fromFrame}
          style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 40%"}}
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------- маскот Aura: план движения из событий ролика ----------
// Робот живёт в свободных зонах кадра (лицо x 330–790, y 600–1150 не закрывает):
// HOME — справа внизу; CHIP — слева от головы, под плашками и цифрами (поднимает руки, «выдвигая» их);
// LIST — на верхнем краю планшета чек-листа (ставит галочки); CITY — на панели городов (показывает);
// FINAL — на карточке спикера в финале (указывает на кнопку сайта), в конце спрыгивает и машет.
const auraPlan = (p: TalkReelProProps, total: number): MascotPlan => {
  const top = p.format === "stories" ? 78 : 0;
  const HOME = {x: 905, y: 1535, face: -0.35}; // справа внизу, но выше нижней зоны интерфейса Instagram (380 px)
  const CHIP = {x: 185, y: 900 + top, face: 0.45};
  const LIST = {x: 860, y: PANEL_TOP + 44, face: -0.75};
  const CITY = {x: 880, y: PANEL_TOP + 160, face: -0.7};
  const FINAL = {x: 660, y: 905, face: -0.8}; // на левом краю карточки спикера, ниже кнопки сайта
  type Ev = {from: number; to: number; spot: typeof HOME; g: {at: number; kind: GestureKind}[]};
  const ev: Ev[] = [];
  for (const c of p.chips) {
    const g: Ev["g"] = [{at: c.items[0].at - 0.15, kind: "present"}];
    for (const it of c.items) if (it.strike !== undefined) g.push({at: it.strike - 0.25, kind: "push"});
    ev.push({from: c.items[0].at - 0.5, to: c.until, spot: CHIP, g});
  }
  // карточка-переворот (справа внизу) — робот уходит налево, чтобы не закрывать её, и показывает
  for (const g of p.logos)
    if (g.flip) ev.push({from: g.items[0].at - 0.5, to: g.until, spot: CHIP, g: [{at: g.items[0].at, kind: "point"}]});
  for (const n of p.numbers) ev.push({from: n.at - 0.5, to: n.until, spot: CHIP, g: [{at: n.at - 0.35, kind: "jump"}]});
  for (const l of p.checklists)
    ev.push({from: l.items[0].at - 0.8, to: l.until, spot: LIST, g: l.items.map((it) => ({at: it.at - 0.3, kind: "tick" as const}))});
  if (p.cities.length) {
    const a = Math.min(...p.cities.map((c) => c.at));
    const b = Math.max(...p.cities.map((c) => c.until));
    ev.push({from: a - 0.5, to: b, spot: CITY, g: [{at: a, kind: "point"}]});
  }
  ev.sort((a, b) => a.from - b.from);
  // события, которые накладываются, объединяем: робот остаётся на месте
  const merged: Ev[] = [];
  for (const e of ev) {
    const last = merged[merged.length - 1];
    if (last && e.from < last.to + 0.6 && e.spot === last.spot) {
      last.to = Math.max(last.to, e.to);
      last.g.push(...e.g);
    } else if (last && e.from < last.to) {
      continue; // другое место занято — пропускаем, чтобы робот не метался
    } else merged.push({...e, g: [...e.g]});
  }
  const end = p.site.at;
  const stays: MascotStay[] = [{at: 0.9, ...HOME}];
  const gestures: MascotPlan["gestures"] = [{at: 1.0, kind: "wave"}];
  let free = 0.9 + 2.4;
  for (let i = 0; i < merged.length; i++) {
    const e = merged[i];
    if (e.from > end - 1.5) break;
    stays.push({at: Math.max(e.from, stays[stays.length - 1].at + 0.6), ...e.spot});
    gestures.push(...e.g);
    const next = merged[i + 1];
    const nextFrom = next ? next.from : end;
    if (!next || next.spot !== e.spot || nextFrom - e.to > 3.5) {
      if (nextFrom - e.to > 2.2) {
        stays.push({at: e.to + 1.0, ...HOME});
        // в долгом простое — жест «от скуки»
        if (nextFrom - e.to > 7) gestures.push({at: e.to + 2.5, kind: (["nod", "scan", "shrug"] as const)[i % 3]});
      }
    }
    free = e.to;
  }
  for (const b of p.broll) if (!merged.some((e) => b.at >= e.from && b.at <= e.to)) gestures.push({at: b.at + 0.3, kind: "scan"});
  // логотипы — показывает на них
  for (const g of p.logos) if (!merged.some((e) => g.items[0].at >= e.from && g.items[0].at <= e.to)) gestures.push({at: g.items[0].at, kind: "point"});
  // финал: на карточку спикера, указывает на кнопку; в конце — вниз и помахать
  stays.push({at: end + 1.1, ...FINAL});
  gestures.push({at: end + 1.3, kind: "pointUp"});
  stays.push({at: total - 1.0, ...HOME});
  gestures.push({at: total - 0.95, kind: "wave"});
  void free;
  return {stays, gestures: gestures.sort((a, b) => a.at - b.at)};
};

export const TalkReelPro: React.FC<TalkReelProProps> = (p) => {
  const {fps, durationInFrames} = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const siteFrom = f(p.site.at);
  const sfxAt: {at: number; src: string; volume?: number}[] = [
    ...p.chips.flatMap((g) => g.items.map((c) => ({at: c.at, src: p.sfx.pop}))),
    ...p.chips.flatMap((g) => g.items.filter((c) => c.strike !== undefined).map((c) => ({at: c.strike as number, src: p.sfx.whoosh}))),
    ...p.zooms.filter((z) => z.kind === "punch" && p.sfx.whip).map((z) => ({at: z.at, src: p.sfx.whip as string, volume: 0.16})),
    ...p.logos.flatMap((g) => g.items.map((l) => ({at: l.at, src: p.sfx.whoosh}))),
    ...p.numbers.map((n) => ({at: n.at, src: p.sfx.whoosh})),
    ...p.broll.map((b) => ({at: b.at, src: p.sfx.whoosh})),
    ...p.cities.map((c) => ({at: c.at, src: p.sfx.pop})),
    ...p.checklists.flatMap((l) => l.items.map((it) => ({at: it.at, src: p.sfx.pop}))),
    {at: p.site.at, src: p.sfx.whoosh},
  ];

  const brand = BRANDS[p.brand ?? "gtt"];
  const plan = React.useMemo(() => (brand.id === "aura" ? auraPlan(p, durationInFrames / fps) : null), [brand.id, p, durationInFrames, fps]);
  return (
    <BrandCtx.Provider value={brand}>
    <AbsoluteFill style={{backgroundColor: "#0B0D14"}}>
      <Audio src={staticFile(p.mediaSrc)} />
      {p.music ? (
        <Audio
          src={staticFile(p.music.src)}
          volume={(fr) => {
            // точки громкости всегда по возрастанию, даже если ролик кончается сразу после последней фразы
            const end = durationInFrames / fps;
            const a = Math.min(p.speechSeconds - 0.5, end - 2.4);
            const b = Math.min(p.speechSeconds + 0.6, end - 1.3);
            const c = Math.max(b + 0.05, end - 1.2);
            return interpolate(fr / fps, [0, 1.2, Math.max(1.25, a), Math.max(1.3, b), c, Math.max(c + 0.05, end)], [
              0, p.music!.volume, p.music!.volume, p.music!.outroVolume, p.music!.outroVolume, 0,
            ], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
          }}
        />
      ) : null}
      {sfxAt.map((s, i) => (
        <Sequence key={`sfx-${i}`} from={Math.max(0, f(s.at) - 2)} durationInFrames={fps}>
          <Audio src={staticFile(s.src)} volume={s.volume ?? 0.4} />
        </Sequence>
      ))}

      <ZoomedVideo
        src={p.mediaSrc}
        cutoutSrc={p.cutoutSrc}
        cuts={p.cuts}
        broll={p.broll}
        cities={p.cities}
        zooms={p.zooms}
        stockDrop={p.stockDrop}
        focus={p.focus}
        checklists={p.checklists}
        bgFlags={p.bgFlags}
        angleB={p.angleB}
        clips={p.clips}
      />
      <CityPanel cities={p.cities} />
      {p.clips ? <ClipPanel clips={p.clips} /> : null}
      <ChecklistPanel lists={p.checklists} />

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
      </TopShift.Provider>

      <Sequence from={siteFrom}>
        <Finale
          src={p.mediaSrc}
          site={p.site}
          title={p.cta}
          seconds={(durationInFrames - siteFrom) / fps}
          fromFrame={siteFrom}
        />
      </Sequence>

      {plan ? <AuraMascot plan={plan} scale={1.15} /> : null}
      {(p.flags ?? []).map((fl, i) => (
        <Sequence key={`flags-${i}`} from={f(fl.at)} durationInFrames={f(fl.until - fl.at)}>
          <FlagArc items={fl.items} at={fl.at} until={fl.until} center={p.focus} />
        </Sequence>
      ))}
      <BigCaptions words={p.words} accent={p.accentWords} until={p.speechSeconds} lowFrom={siteFrom} cities={p.cities} lists={p.checklists} broll={p.broll} clips={p.clips} />
      {brand.id === "aura" ? (
        // Aura: круглая печать крутится над головой спикера, по центру; в Stories — ниже полосок и аватара
        <div style={{position: "absolute", top: p.format === "stories" ? 200 : 70, left: "50%", translate: "-50% 0"}}>
          <AuraBadge size={200} />
        </div>
      ) : (
        // логотип: стеклянная пирамида + крупная белая надпись с бликом (как в референсе)
        <div style={{position: "absolute", top: p.format === "stories" ? 210 : 86, left: 56}}>
          <SiteLogo variant="title" scale={1} />
        </div>
      )}
      {p.showSafeZone ? <SafeZone /> : null}
    </AbsoluteFill>
    </BrandCtx.Provider>
  );
};
