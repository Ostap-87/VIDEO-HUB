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
      items: z.array(z.object({src: z.string(), at: z.number()})),
      // flip: одна карточка справа от лица; на item[1].at переворачивается по вертикальной оси
      flip: z.boolean().optional(),
    }),
  ),
  numbers: z.array(z.object({text: z.string(), sub: z.string(), at: z.number(), until: z.number()})),
  // Перебивки: картинка на весь экран, спикер уменьшается в окошко по центру (звук не прерывается)
  broll: z.array(z.object({src: z.string(), at: z.number(), until: z.number()})),
  // Города: фото в нижней половине экрана, пока спикер их перечисляет; спикер остаётся сверху
  cities: z.array(z.object({src: z.string(), name: z.string(), at: z.number(), until: z.number(), kicker: z.string().optional()})),
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
}> = ({words, accent, until, lowFrom, cities}) => {
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
  const dark = false;
  const low = frame >= lowFrom + 10; // в финале субтитры ниже карточки спикера
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top: low ? 1420 : cityAmount(cities, t) > 0.5 ? 780 : 1250,
        textAlign: "center",
        fontFamily: display.fontFamily,
        fontWeight: 700,
        fontSize: 66,
        lineHeight: 1.18,
        color: dark ? theme.colors.text : "#FFFFFF",
        textShadow: dark ? "none" : shadow,
        // тёмная обводка, чтобы белые субтитры читались и на светлых картинках-перебивках
        WebkitTextStroke: dark ? undefined : "10px rgba(10,12,20,0.55)",
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
        const current = w.start <= t && t < w.end + 0.05;
        const hot = current || accent.includes(clean(w.text));
        return (
          <span key={i} style={{color: hot ? (dark ? BLUE : "#3D7BFF") : dark ? theme.colors.text : "#FFFFFF"}}>
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
  return (
    <div
      style={{
        position: "relative",
        alignSelf: "flex-start",
        background: "#FFFFFF",
        color: theme.colors.text,
        fontFamily: display.fontFamily,
        fontWeight: 700,
        fontSize: 32,
        padding: "14px 26px",
        borderRadius: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
        opacity: s,
        translate: `${(1 - s) * -140}px 0px`,
        scale: String(0.8 + 0.2 * s),
        transformOrigin: "left center",
      }}
    >
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

const ChipGroup: React.FC<{group: TalkReelProProps["chips"][number]; start: number}> = ({group, start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(frame, [(group.until - start) * fps - 8, (group.until - start) * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 250,
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
      <Img src={staticFile(src)} style={{maxHeight: 64, maxWidth: "100%", objectFit: "contain"}} />
    </div>
  );
  // на лицевой стороне — чётные логотипы, на обороте — нечётные
  const front = group.items[shown % 2 === 0 ? shown : Math.max(0, shown - 1)].src;
  const back = group.items[shown % 2 === 1 ? shown : Math.min(group.items.length - 1, shown + 1)].src;
  return (
    <div
      style={{
        position: "absolute",
        right: 28,
        top: 780,
        width: 330,
        height: 140,
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
  const slots = [
    {left: 60, top: 430, rot: -6},
    {right: 60, top: 540, rot: 5},
    {left: 60, top: 680, rot: 4},
    {right: 60, top: 780, rot: -4},
  ];
  return (
    <AbsoluteFill style={{opacity: out}}>
      {group.items.map((l, i) => {
        const s = spring({frame: frame - Math.round((l.at - start) * fps), fps, config: {damping: 12, stiffness: 140}});
        const slot = slots[i % slots.length];
        const fromLeft = "left" in slot;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: fromLeft ? slot.left : undefined,
              right: fromLeft ? undefined : slot.right,
              top: slot.top,
              background: "#FFFFFF",
              borderRadius: 28,
              padding: "26px 34px",
              boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
              opacity: s,
              translate: `${(1 - s) * (fromLeft ? -400 : 400)}px 0px`,
              rotate: `${slot.rot * s}deg`,
              scale: String(0.6 + 0.4 * s),
            }}
          >
            <Img src={staticFile(l.src)} style={{height: 92, maxWidth: 380, objectFit: "contain", display: "block"}} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Крупная цифра с «попом» и синим свечением
const BigNumber: React.FC<{n: TalkReelProProps["numbers"][number]}> = ({n}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 9, stiffness: 160, mass: 0.8}});
  const out = interpolate(frame, [(n.until - n.at) * fps - 8, (n.until - n.at) * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{position: "absolute", left: 70, top: 380, opacity: out, scale: String(0.6 + 0.4 * s), transformOrigin: "left center"}}>
      <div
        style={{
          fontFamily: display.fontFamily,
          fontWeight: 700,
          fontSize: n.text.length > 3 ? 140 : 190,
          lineHeight: 1,
          color: "#3D7BFF",
          textShadow: "0 0 40px rgba(61,123,255,0.85), 0 6px 20px rgba(0,0,0,0.45)",
        }}
      >
        {n.text}
      </div>
      {n.sub ? (
        <div style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: 40, color: "#FFFFFF", textShadow: shadow, marginTop: 6}}>
          {n.sub}
        </div>
      ) : null}
    </div>
  );
};

// Уровни зума по кускам между склейками: общий план, лёгкий и средний наезд чередуются.
const LEVELS = [1.0, 1.08, 1.02, 1.14, 1.0, 1.1];
const zoomAt = (cuts: number[], zooms: TalkReelProProps["zooms"], t: number) => {
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
}> = ({src, cutoutSrc, cuts, broll, cities, zooms}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const lift = cityAmount(cities, t) * 330; // лицо поднимается в верхнюю половину
  const zoom = zoomAt(cuts, zooms, t);
  const b = broll.find((x) => t >= x.at && t <= x.until) ?? broll.find((x) => t >= x.at - 0.5 && t <= x.until + 0.5);
  const ease = Easing.bezier(0.22, 1, 0.36, 1);
  const p = b
    ? Math.min(
        interpolate(t, [b.at, b.at + 0.35], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease}),
        interpolate(t, [b.until - 0.35, b.until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease}),
      )
    : 0;
  const kb = b ? interpolate(t, [b.at, b.until], [1.12, 1.02], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 1;
  const videoStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    scale: String(zoom),
    transformOrigin: "50% 32%",
    translate: `0px ${-lift}px`,
  };
  return (
    <AbsoluteFill style={{background: "#0B0D14"}}>
      <OffthreadVideo src={staticFile(src)} muted style={{...videoStyle, opacity: 1 - p}} />
      {b ? (
        <>
          <AbsoluteFill style={{opacity: p}}>
            <Img src={staticFile(b.src)} style={{width: "100%", height: "100%", objectFit: "cover", scale: String(kb)}} />
          </AbsoluteFill>
          <OffthreadVideo
            src={staticFile(cutoutSrc)}
            transparent
            muted
            style={{...videoStyle, opacity: Math.min(1, p * 3), filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.35))"}}
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
              <div style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: 30, letterSpacing: "0.14em", color: "#BAE6FD", textTransform: "uppercase", textShadow: shadow}}>
                {c.kicker ?? `Маршрут · ${n}/${route.length}`}
              </div>
              <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 92, color: "#FFFFFF", textShadow: shadow}}>{c.name}</div>
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
const Finale: React.FC<{src: string; site: TalkReelProProps["site"]; title: string; seconds: number}> = ({src, site, title, seconds}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ease = Easing.bezier(0.22, 1, 0.36, 1);
  const k = (a: number, b: number) =>
    interpolate(frame, [a * fps, b * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  const card = k(0, 0.7); // 0 — полный кадр, 1 — карточка
  const phone = k(0.35, 1.1);
  const head = k(0.8, 1.3);
  const pill = spring({frame: frame - Math.round(1.1 * fps), fps, config: {damping: 12, stiffness: 140}});
  const glow = 0.55 + 0.45 * Math.sin((frame / fps) * Math.PI * 1.2);
  const CARD = {left: 600, top: 840, w: 400, h: 520};
  const lerp = (a: number, b: number) => a + (b - a) * card;
  const phoneW = 420;
  const phoneH = 900;
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 70% 45% at 30% 38%, rgba(37,99,235,0.35), rgba(37,99,235,0) 70%), linear-gradient(180deg, #0A1022 0%, #050814 100%)",
      }}
    >
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
        <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 52, color: "#E9EEF8"}}>{title}</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 545,
          top: 505,
          opacity: pill,
          scale: String(0.7 + 0.3 * pill),
          transformOrigin: "left center",
          background: BLUE,
          color: "#FFFFFF",
          fontFamily: body.fontFamily,
          fontWeight: 700,
          fontSize: 40,
          padding: "24px 38px",
          borderRadius: 999,
          boxShadow: `0 0 ${40 + 30 * glow}px rgba(59,130,246,${0.55 + 0.3 * glow}), 0 16px 40px rgba(0,0,0,0.4)`,
        }}
      >
        {theme.site}
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
          border: `${6 * card}px solid #FFFFFF`,
          boxShadow: `0 30px 70px rgba(0,0,0,${0.5 * card})`,
        }}
      >
        <OffthreadVideo
          src={staticFile(src)}
          muted
          style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 40%"}}
        />
      </div>
    </AbsoluteFill>
  );
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
    {at: p.site.at, src: p.sfx.whoosh},
  ];

  return (
    <AbsoluteFill style={{backgroundColor: "#0B0D14"}}>
      <Audio src={staticFile(p.mediaSrc)} />
      {p.music ? (
        <Audio
          src={staticFile(p.music.src)}
          volume={(fr) =>
            interpolate(
              fr / fps,
              [0, 1.2, p.speechSeconds - 0.5, p.speechSeconds + 0.6, durationInFrames / fps - 1.2, durationInFrames / fps],
              [0, p.music!.volume, p.music!.volume, p.music!.outroVolume, p.music!.outroVolume, 0],
              {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
            )
          }
        />
      ) : null}
      {sfxAt.map((s, i) => (
        <Sequence key={`sfx-${i}`} from={Math.max(0, f(s.at) - 2)} durationInFrames={fps}>
          <Audio src={staticFile(s.src)} volume={s.volume ?? 0.4} />
        </Sequence>
      ))}

      <ZoomedVideo src={p.mediaSrc} cutoutSrc={p.cutoutSrc} cuts={p.cuts} broll={p.broll} cities={p.cities} zooms={p.zooms} />
      <CityPanel cities={p.cities} />

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

      <Sequence from={siteFrom}>
        <Finale
          src={p.mediaSrc}
          site={p.site}
          title={p.cta}
          seconds={(durationInFrames - siteFrom) / fps}
        />
      </Sequence>

      <BigCaptions words={p.words} accent={p.accentWords} until={p.speechSeconds} lowFrom={siteFrom} cities={p.cities} />
      {/* логотип: стеклянная пирамида + крупная белая надпись с бликом (как в референсе) */}
      <div style={{position: "absolute", top: p.format === "stories" ? 210 : 86, left: 56}}>
        <SiteLogo variant="title" scale={1} />
      </div>
      {p.showSafeZone ? <SafeZone /> : null}
    </AbsoluteFill>
  );
};
