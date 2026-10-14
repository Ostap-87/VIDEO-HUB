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
  const a = interpolate(t, [s.at - 0.1, s.at + 0.45], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  const b = interpolate(t, [s.until - 0.4, s.until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
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
  return a.s.layout === "drop" ? DROP_SHIFT * a.k : a.s.layout === "bottom" ? -BOTTOM_SHIFT * a.k : 0;
};
// где ставить субтитры, пока экран на месте
export const captionTopFor = (screens: ScreenItem[] | undefined, t: number, normal: number) => {
  const a = activeScreen(screens, t);
  if (!a || a.k < 0.5) return normal;
  return a.s.layout === "drop" ? DROP_H + 50 : a.s.layout === "bottom" ? BOTTOM_TOP - 190 : 330;
};

const Media: React.FC<{s: ScreenItem; style: React.CSSProperties}> = ({s, style}) => {
  const {fps} = useVideoConfig();
  return /\.(png|jpe?g|webp)$/i.test(s.src) ? (
    <Img src={staticFile(s.src)} style={{...style, objectFit: "cover", objectPosition: "50% 0%"}} />
  ) : (
    <OffthreadVideo src={staticFile(s.src)} muted trimBefore={Math.round((s.from ?? 0) * fps)} style={{...style, objectFit: "cover", objectPosition: "50% 0%"}} />
  );
};

// подпись экрана: значок сети, полное название, адрес
const Label: React.FC<{s: ScreenItem; k: number}> = ({s, k}) => {
  const B = useBrand();
  const od = B.id === "od";
  const icon = s.network ? ICON[s.network] : undefined;
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
        <div style={{position: "absolute", inset: 0, overflow: "hidden", background: "#FFFFFF", borderBottom: `5px solid ${ink}`, boxShadow: od ? "0 16px 0 #FFD92E" : "0 20px 60px rgba(0,0,0,0.45)"}}>
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
        <div style={{position: "absolute", inset: 0, overflow: "hidden", background: "#FFFFFF", borderTop: `5px solid ${ink}`, boxShadow: od ? "0 -16px 0 #FFD92E" : "0 -20px 60px rgba(0,0,0,0.45)"}}>
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
      <AbsoluteFill style={{clipPath: `circle(${r}% at 72% 82%)`, background: "#FFFFFF"}}>
        <Media s={s} style={{position: "absolute", inset: 0, width: "100%", height: "100%"}} />
        <div style={{position: "absolute", left: 0, right: 0, top: 210}}>
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
