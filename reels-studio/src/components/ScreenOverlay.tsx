// «Экран» сайта или Telegram-канала в ролике (решение пользователя 14.10.2026: «плашки не налезали на голову и не закрывали
// лицо… сверху опускать экран с названием тг-каналов и сайтов, или снизу показывать… отдаление и перемещение меня вниз экрана
// в вырезанном формате и в это время полностью показывать мой сайт», полные названия каналов).
// Внутри — видео прокрутки страницы (scripts/site_scroll.mjs), внизу/вверху — подпись: значок, полное название, адрес.
// Три подачи (layout):
//   drop   — экран опускается сверху (верхние ~52% кадра), спикер уезжает вниз, лицо открыто под экраном;
//   bottom — спикер поднимается, снизу выезжает панель с экраном;
//   full   — страница на весь кадр, спикер вырезан из фона (cutoutSrc) и стоит уменьшенным внизу справа.
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {useBrand} from "../brand";

export type ScreenItem = {
  at: number;
  until: number;
  src: string; // видео прокрутки (или картинка .png/.jpg)
  from?: number; // с какой секунды видео прокрутки начинать
  layout: "drop" | "bottom" | "full";
  title?: string; // полное название: «|AURA Robotics| Робототехника», «ostapdotcenko.ru — блог»
  url?: string; // t.me/aura_robots, ostapdotcenko.ru/blog
  network?: "telegram" | "site" | "linkedin" | "youtube" | "instagram";
  icon?: string; // свой значок в подписи (логотип сайта Aura / GTT); без поля — значок сети
  joinIn?: boolean; // ставит chainScreens: экран сразу сменяет предыдущий той же подачи (без отъезда и въезда)
  joinOut?: boolean;
  groupAt?: number; // начало цепочки экранов встык (для печати ссылок на фоне)
};

// Экраны подряд (главная сайта → блог, канал → канал) одной подачи и встык (зазор до 0,25 с) — один въезд в начале,
// один отъезд в конце, между ними только смена страницы наплывом.
export const chainScreens = (screens: ScreenItem[] | undefined): ScreenItem[] => {
  const list = [...(screens ?? [])].sort((a, b) => a.at - b.at);
  const out = list.map((s, i) => ({
    ...s,
    joinIn: i > 0 && list[i - 1].layout === s.layout && Math.abs(s.at - list[i - 1].until) <= 0.25,
    joinOut: i < list.length - 1 && list[i + 1].layout === s.layout && Math.abs(list[i + 1].at - s.until) <= 0.25,
    groupAt: s.at,
  }));
  for (let i = 1; i < out.length; i++) if (out[i].joinIn) out[i].groupAt = out[i - 1].groupAt; // начало цепочки экранов
  return out;
};

const ICON: Record<string, string> = {
  telegram: "source-videos/логотипы/общие/telegram.svg",
  linkedin: "source-videos/логотипы/общие/linkedin.svg",
  youtube: "source-videos/логотипы/общие/youtube.svg",
  instagram: "source-videos/логотипы/техгиганты/instagram.svg",
  site: "source-videos/ostapdotcenko/logo/site-icon-512.png",
};

export const DROP_H = 1000; // высота экрана-шторки
export const DROP_SHIFT = 560; // насколько спикер уезжает вниз
export const BOTTOM_TOP = 980; // где начинается нижняя панель
export const BOTTOM_SHIFT = 440; // насколько спикер поднимается

// 0…1: насколько экран на месте (въезд 0,5 с, выезд 0,4 с)
export const screenAmount = (s: ScreenItem, t: number) => {
  const ease = Easing.bezier(0.22, 1, 0.36, 1);
  const a = s.joinIn ? (t >= s.at - 0.1 ? 1 : 0) : interpolate(t, [s.at - 0.1, s.at + 0.45], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  const b = s.joinOut ? (t <= s.until + 0.5 ? 1 : 0) : interpolate(t, [s.until - 0.4, s.until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  return Math.min(a, b);
};
export const activeScreen = (screens: ScreenItem[] | undefined, t: number) => {
  let best: {s: ScreenItem; k: number} | null = null;
  for (const s of screens ?? []) {
    const k = screenAmount(s, t);
    if (k > 0 && (!best || k > best.k)) best = {s, k};
  }
  return best;
};
// сдвиг спикера по вертикали (px) для drop / bottom
export const speakerShift = (screens: ScreenItem[] | undefined, t: number) => {
  const a = activeScreen(screens, t);
  if (!a) return 0;
  return a.s.layout === "bottom" ? -BOTTOM_SHIFT * a.k : 0; // drop — спикер уходит в карточку (speakerCardStyle)
};
export const FULL_LABEL_TOP = 250; // подпись экрана в режиме full — ниже полосок и аватара Stories
// где ставить субтитры, пока экран на месте: на бумажной плашке поверх самого экрана, лица не касаются
// (drop — над подписью внизу шторки, bottom — под подписью панели, full — под подписью сверху)
export const captionTopFor = (screens: ScreenItem[] | undefined, t: number, normal: number) => {
  const a = activeScreen(screens, t);
  if (!a || a.k < 0.5) return normal;
  return a.s.layout === "drop" ? DROP_H - 300 : a.s.layout === "bottom" ? BOTTOM_TOP + 160 : FULL_LABEL_TOP + 170;
};

const Media: React.FC<{s: ScreenItem; style: React.CSSProperties}> = ({s, style}) => {
  const {fps} = useVideoConfig();
  const frame = useCurrentFrame();
  // экран сменяет предыдущий встык — новая страница проявляется поверх старой за 0,35 с
  const fade = s.joinIn ? interpolate(frame, [0, 0.35 * fps], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 1;
  return /\.(png|jpe?g|webp)$/i.test(s.src) ? (
    <Img src={staticFile(s.src)} style={{...style, objectFit: "cover", objectPosition: "50% 0%", opacity: fade}} />
  ) : (
    <OffthreadVideo src={staticFile(s.src)} muted trimBefore={Math.round((s.from ?? 0) * fps)} style={{...style, objectFit: "cover", objectPosition: "50% 0%", opacity: fade}} />
  );
};

// подпись экрана: значок сети, полное название, адрес
const Label: React.FC<{s: ScreenItem; k: number}> = ({s, k}) => {
  const B = useBrand();
  const od = B.id === "od";
  const icon = s.icon ?? (s.network ? ICON[s.network] : undefined);
  if (!s.title && !s.url) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "20px 34px",
        background: od ? "#191922" : "rgba(10,12,20,0.92)",
        color: "#F7F4EC",
        opacity: interpolate(k, [0.4, 1], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
      }}
    >
      {icon ? (
        <div style={{width: 74, height: 74, flexShrink: 0, background: "#FFFFFF", borderRadius: od ? 0 : 18, display: "flex", alignItems: "center", justifyContent: "center", border: od ? "3px solid #FFD92E" : undefined}}>
          <Img src={staticFile(icon)} style={{width: 54, height: 54, objectFit: "contain"}} />
        </div>
      ) : null}
      <div style={{display: "flex", flexDirection: "column", gap: 4, minWidth: 0}}>
        {s.title ? (
          <div style={{fontFamily: B.captionFont, fontWeight: 700, fontSize: s.title.length > 26 ? 32 : 38, lineHeight: 1.1, letterSpacing: "-0.01em"}}>{s.title}</div>
        ) : null}
        {s.url ? <div style={{fontFamily: B.monoFont, fontSize: 28, color: od ? "#FFD92E" : B.accent}}>{s.url}</div> : null}
      </div>
    </div>
  );
};

// Сам экран (рисуется поверх спикера). Время — секунды ролика.
export const ScreenPanel: React.FC<{s: ScreenItem; cutoutSrc: string}> = ({s, cutoutSrc}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const od = B.id === "od";
  const t = s.at + frame / fps; // панель живёт в Sequence from={at}
  const k = screenAmount(s, t);
  const ink = od ? "#191922" : "#0A0C14";
  if (s.layout === "drop") {
    return (
      <div style={{position: "absolute", left: 0, right: 0, top: 0, height: DROP_H, translate: `0px ${(k - 1) * (DROP_H + 40)}px`}}>
        <div style={{position: "absolute", inset: 0, overflow: "hidden", background: s.joinIn ? undefined : "#FFFFFF", borderBottom: `5px solid ${ink}`, boxShadow: od ? "0 16px 0 #FFD92E" : "0 20px 60px rgba(0,0,0,0.45)"}}>
          <Media s={s} style={{position: "absolute", inset: 0, width: "100%", height: "100%"}} />
          <div style={{position: "absolute", left: 0, right: 0, bottom: 0}}>
            <Label s={s} k={k} />
          </div>
        </div>
      </div>
    );
  }
  if (s.layout === "bottom") {
    return (
      <div style={{position: "absolute", left: 0, right: 0, top: BOTTOM_TOP, bottom: 0, translate: `0px ${(1 - k) * (1940 - BOTTOM_TOP)}px`}}>
        <div style={{position: "absolute", inset: 0, overflow: "hidden", background: s.joinIn ? undefined : "#FFFFFF", borderTop: `5px solid ${ink}`, boxShadow: od ? "0 -16px 0 #FFD92E" : "0 -20px 60px rgba(0,0,0,0.45)"}}>
          <Media s={s} style={{position: "absolute", left: 0, right: 0, top: 110, width: "100%", height: 1920 - BOTTOM_TOP - 110}} />
          <div style={{position: "absolute", left: 0, right: 0, top: 0}}>
            <Label s={s} k={k} />
          </div>
        </div>
      </div>
    );
  }
  // full: страница на весь кадр (раскрывается кругом от спикера), спикер вырезан и стоит внизу справа уменьшенным
  const r = interpolate(k, [0, 1], [0, 140]);
  const small = interpolate(k, [0, 1], [1, 0.56]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{clipPath: `circle(${r}% at 72% 82%)`, background: s.joinIn ? undefined : "#FFFFFF"}}>
        <Media s={s} style={{position: "absolute", inset: 0, width: "100%", height: "100%"}} />
        <div style={{position: "absolute", left: 0, right: 0, top: FULL_LABEL_TOP}}>
          <Label s={s} k={k} />
        </div>
      </AbsoluteFill>
      {/* спикер: вырезанный, уменьшается к правому нижнему углу (ступни — низ кадра) */}
      <AbsoluteFill style={{scale: String(small), transformOrigin: "86% 100%", filter: od ? "drop-shadow(10px 10px 0 rgba(25,25,34,0.9))" : "drop-shadow(0 20px 40px rgba(0,0,0,0.45))", opacity: k > 0.02 ? 1 : 0}}>
        <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted trimBefore={Math.round(s.at * fps)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Подача drop, версия 2 (решение пользователя 15.10.2026: «вариант А, только я бледного цвета… обвести какой-то рамкой,
// и на фоне должны показываться ссылки напечатанные с моими каналами и сайтами — это важно»).
// Пока сверху шторка с каналом или сайтом, спикер — в карточке в чернильной рамке с жёсткой тенью внизу справа, фон — «кость»
// сайта с точечной сеткой, слева столбиком печатаются ссылки на каналы и сайты; ссылка текущего экрана — на жёлтом маркере.
export type LinkItem = {url: string; icon?: string};
export const OD_LINKS: LinkItem[] = [
  {url: "t.me/aura_robots", icon: "source-videos/логотипы/общие/telegram.svg"},
  {url: "t.me/GlobalTechTour", icon: "source-videos/логотипы/общие/telegram.svg"},
  {url: "ostapdotcenko.ru", icon: "source-videos/ostapdotcenko/logo/site-icon-512.png"},
  {url: "aura-robotics.ru", icon: "source-videos/aura-robotics/логотип/оригиналы/aura-robotics-круг.jpg"},
  {url: "globaltechtour.ru", icon: "source-videos/логотипы/общие/globaltechtour-icon.svg"},
  {url: "Ostap Dotcenko", icon: "source-videos/логотипы/общие/linkedin.svg"}, // профиль LinkedIn (адреса профиля пока нет)
];
export const CARD = {x: 486, y: 1078, w: 546, h: 668, scale: 0.62, eyeAt: 0.4}; // карточка спикера (px кадра)

const dropAmount = (screens: ScreenItem[] | undefined, t: number) => {
  const a = activeScreen(screens, t);
  return a && a.s.layout === "drop" ? a : null;
};

// спикер в карточке: масштаб + сдвиг (глаза — на 40 % высоты карточки) + обрезка по карточке; k — насколько экран на месте
export const speakerCardStyle = (screens: ScreenItem[] | undefined, t: number, focus: {x: number; y: number}): React.CSSProperties => {
  const a = dropAmount(screens, t);
  if (!a) return {};
  const k = a.k;
  const s = CARD.scale;
  const tx = CARD.x + CARD.w / 2 - focus.x * s;
  const ty = CARD.y + CARD.h * CARD.eyeAt - focus.y * s;
  const top = (CARD.y - ty) / s, left = (CARD.x - tx) / s;
  const right = 1080 - (CARD.x + CARD.w - tx) / s, bottom = 1920 - (CARD.y + CARD.h - ty) / s;
  return {
    transformOrigin: "0px 0px",
    scale: String(1 + (s - 1) * k),
    translate: `${tx * k}px ${ty * k}px`,
    clipPath: `inset(${top * k}px ${right * k}px ${bottom * k}px ${left * k}px)`,
  };
};

// фон под карточкой: кость, точечная сетка, жёлтая жёсткая тень карточки, столбик ссылок
export const DropBackdrop: React.FC<{screens: ScreenItem[]; links?: LinkItem[]}> = ({screens, links = OD_LINKS}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const a = dropAmount(screens, t);
  if (!a) return null;
  const k = a.k;
  const od = B.id === "od";
  const ink = od ? "#191922" : "#17171D";
  const t0 = (a.s.groupAt ?? a.s.at) + 0.35; // печатать начинаем, когда шторка почти опустилась
  const cur = (a.s.url ?? "").toLowerCase();
  return (
    <AbsoluteFill style={{opacity: k, background: od ? "#EDEAE2" : "#EEEEF2"}}>
      <AbsoluteFill style={{backgroundImage: `radial-gradient(${od ? "rgba(25,25,34,0.16)" : "rgba(23,23,29,0.12)"} 2px, transparent 2.5px)`, backgroundSize: "34px 34px"}} />
      {/* жёсткая тень карточки спикера (сама карточка — видео поверх) */}
      <div style={{position: "absolute", left: CARD.x + 14, top: CARD.y + 14, width: CARD.w, height: CARD.h, background: od ? B.accent : "rgba(0,0,0,0.25)"}} />
      <div style={{position: "absolute", left: 48, top: CARD.y + 4, width: CARD.x - 48 - 28, display: "flex", flexDirection: "column", gap: 24}}>
        <div style={{fontFamily: B.monoFont, fontSize: 26, letterSpacing: "0.14em", textTransform: "uppercase", color: od ? "#FF4A1F" : B.accent, opacity: interpolate(t, [t0, t0 + 0.2], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>
          Мои каналы и сайты
        </div>
        {links.map((l, i) => {
          const start = t0 + 0.15 + i * 0.32;
          const n = Math.round(interpolate(t, [start, start + 0.03 * l.url.length], [0, l.url.length], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}));
          const on = cur.startsWith(l.url.toLowerCase());
          const shown = t >= start;
          const typing = n < l.url.length && shown;
          return (
            <div key={l.url} style={{display: "flex", alignItems: "center", gap: 14, opacity: shown ? 1 : 0}}>
              {l.icon ? (
                <div style={{width: 52, height: 52, flexShrink: 0, background: "#FFFFFF", border: `3px solid ${ink}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"}}>
                  <Img src={staticFile(l.icon)} style={{width: 40, height: 40, objectFit: "contain"}} />
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: B.monoFont,
                  fontWeight: 500,
                  fontSize: l.url.length > 18 ? 27 : 31,
                  color: ink,
                  whiteSpace: "nowrap",
                  padding: "2px 6px",
                  backgroundImage: on ? `linear-gradient(${B.accent}, ${B.accent})` : undefined,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${on ? interpolate(t, [start + 0.03 * l.url.length, start + 0.03 * l.url.length + 0.2], [0, 100], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : 0}% 100%`,
                }}
              >
                {l.url.slice(0, n)}
                <span style={{opacity: typing || (on && Math.floor(t * 2) % 2 === 0) ? 1 : 0}}>▍</span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// рамка карточки спикера — поверх видео
export const DropFrame: React.FC<{screens: ScreenItem[]}> = ({screens}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const a = dropAmount(screens, frame / fps);
  if (!a || a.k < 0.98) return null;
  return <div style={{position: "absolute", left: CARD.x - 5, top: CARD.y - 5, width: CARD.w + 10, height: CARD.h + 10, border: `5px solid ${B.id === "od" ? "#191922" : "#FFFFFF"}`, boxSizing: "border-box"}} />;
};
