// Приёмы Монтажной (решение пользователя 22.10.2026): «вырезание говорящего и перенос в разные углы экрана, уменьшение,
// рамка или вырезание по контуру; разные варианты перечислений; тексты на заднем плане — увеличивать, уменьшать, поворачивать
// в разных плоскостях; выдвижные экраны снизу, сверху, с боков и из углов с видео или фото; цвета шрифтов в моменте».
// Всё — поля TalkReelPro (speaker, panels, texts, lists, palette / paletteAt), стиль берётся от бренда (useBrand).
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {SpeakerVideo} from "./EdlVideo";
import {loadFont as loadOswald} from "@remotion/google-fonts/Oswald";
import {loadFont as loadPlayfair} from "@remotion/google-fonts/PlayfairDisplay";
import {loadFont as loadUnbounded} from "@remotion/google-fonts/Unbounded";
import {loadFont as loadCaveat} from "@remotion/google-fonts/Caveat";
import {useBrand, type Brand} from "../brand";

const oswald = loadOswald("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]});
const playfair = loadPlayfair("italic", {weights: ["700"], subsets: ["cyrillic", "latin"]});
const unbounded = loadUnbounded("normal", {weights: ["800"], subsets: ["cyrillic", "latin"]});
const caveat = loadCaveat("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]});

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const src = (s: string) => (/^(https?:|blob:|data:)/.test(s) ? s : staticFile(s));
const isVideo = (s: string) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(s) || /^montazh-local\/.*\/v/.test(s);
// 0 → 1 → 0: въезд за inT, выезд за outT
export const amountAt = (t: number, at: number, until: number, inT = 0.5, outT = 0.45) =>
  Math.min(interpolate(t, [at, at + inT], [0, 1], {...clamp, easing: ease}), interpolate(t, [until - outT, until], [1, 0], {...clamp, easing: ease}));

// ------------------------------------------------------------------ спикер в угол, рамку, круг, по контуру
export type SpeakerItem = {
  at: number;
  until: number;
  corner?: "tl" | "tr" | "bl" | "br" | "top" | "bottom" | "center" | "left" | "right";
  scale?: number; // доля ширины кадра (0.3–0.8)
  style?: "frame" | "round" | "contour";
  bg?: "blur" | "brand" | "dark" | "image" | "app";
  image?: string;
  tilt?: number; // поворот «экрана» в 3D, градусы
  title?: string; // bg app: подпись задания в окне приложения
  windows?: number; // bg app: окон результата — 1 или 2 (второе грузится позже, рядом)
};
export const speakerActive = (items: SpeakerItem[] | undefined, t: number) => {
  const s = (items ?? []).find((x) => t >= x.at - 0.05 && t <= x.until + 0.05);
  return s ? {s, p: amountAt(t, s.at, s.until, 0.55, 0.5)} : null;
};

const SAFE = {top: 250, bottom: 380, side: 56};
function targetRect(s: SpeakerItem, stories: boolean) {
  const style = s.style ?? "frame";
  const k = Math.max(0.2, Math.min(0.9, s.scale ?? 0.42));
  const w = style === "round" ? 1080 * k * 0.9 : style === "contour" ? 1080 * k : 1080 * k;
  const h = style === "round" ? w : style === "contour" ? 1920 * k : 1920 * k;
  const top = SAFE.top + (stories ? 130 : 0);
  const c = s.corner ?? "br";
  const x = c.endsWith("l") || c === "left" ? SAFE.side : c.endsWith("r") || c === "right" ? 1080 - SAFE.side - w : (1080 - w) / 2;
  const y = c.startsWith("t") ? top : c.startsWith("b") ? 1920 - SAFE.bottom - h : (1920 - h) / 2;
  return {x, y, w, h};
}

// фон «окно приложения» (референс d4ws46x, 23.10.2026): светлый интерфейс, сверху прикреплённый файл и задание,
// в середине окно результата — сначала размыто с кружком загрузки, на 45 % отрезка результат проявляется
const AppBackdrop: React.FC<{s: SpeakerItem; video: string}> = ({s, video}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const two = (s.windows ?? 1) >= 2;
  const ready = s.at + (s.until - s.at) * (two ? 0.3 : 0.45);
  const ready2 = s.at + (s.until - s.at) * 0.62;
  const sharp = interpolate(t, [two ? ready2 : ready, (two ? ready2 : ready) + 0.5], [0, 1], {...clamp, easing: ease});
  const spin = (t * 300) % 360;
  const sq = B.square;
  const font = B.bodyFont;
  return (
    <AbsoluteFill style={{background: "#F5F5F7"}}>
      <div style={{position: "absolute", right: 80, top: 280, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12}}>
        <div style={{width: 120, height: 150, background: "#FFF", border: "2px solid #E2E2E8", borderRadius: sq ? 0 : 14, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 14, fontFamily: font, fontSize: 20, color: "#8A8A94"}}>MOV</div>
        <div style={{background: "#ECECF1", borderRadius: sq ? 0 : 12, padding: "8px 16px", fontFamily: font, fontSize: 24, color: "#3A3A44"}}>{s.title || "смонтируй ролик"}</div>
      </div>
      <div style={{position: "absolute", left: 120, top: 520, display: "flex", alignItems: "center", gap: 14, fontFamily: font, fontSize: 26, color: "#8A8A94"}}>
        <span style={{display: "inline-block", width: 22, height: 22, borderRadius: "50%", border: "3px solid #C9C9D2", borderTopColor: sharp > 0.5 ? "#3CCF8E" : "#5A5A66", rotate: `${sharp > 0.5 ? 0 : spin}deg`}} />
        {sharp > 0.5 ? "Готово" : "Монтирую…"}
      </div>
      {(two ? [0, 1] : [0]).map((k) => {
        const r = k === 0 ? ready : ready2;
        const sh = interpolate(t, [r, r + 0.5], [0, 1], {...clamp, easing: ease});
        const appear = k === 0 ? 1 : interpolate(t, [s.at + (s.until - s.at) * 0.3, s.at + (s.until - s.at) * 0.3 + 0.35], [0, 1], {...clamp, easing: ease});
        const box = two ? {left: 90 + k * 380, top: 640, width: 350, height: 620} : {left: 120, top: 575, width: 640, height: 900};
        const media = k === 1 && s.image ? undefined : s.image;
        return (
          <div key={k} style={{position: "absolute", ...box, borderRadius: sq ? 0 : 28, overflow: "hidden", background: "#FFF", boxShadow: sq ? "10px 10px 0 #191922" : "0 20px 60px rgba(20,20,40,0.16)", border: sq ? "3px solid #191922" : undefined, opacity: appear, scale: String(0.9 + 0.1 * appear)}}>
            {media ? (
              isVideo(media) ? (
                <OffthreadVideo src={src(media)} muted style={{width: "100%", height: "100%", objectFit: "cover", filter: `blur(${(1 - sh) * 30}px)`}} />
              ) : (
                <Img src={src(media)} style={{width: "100%", height: "100%", objectFit: "cover", filter: `blur(${(1 - sh) * 30}px)`}} />
              )
            ) : (
              <SpeakerVideo src={video} style={{width: "100%", height: "100%", objectFit: "cover", filter: `blur(${(1 - sh) * 30}px) saturate(1.1)${k === 1 ? " hue-rotate(-12deg) brightness(1.06)" : ""}`}} />
            )}
            <AbsoluteFill style={{background: `linear-gradient(to bottom, rgba(255,255,255,${0.95 * (1 - sh)}) 0%, rgba(255,255,255,${0.95 * (1 - sh)}) 38%, rgba(255,255,255,${0.15 * (1 - sh)}) 60%)`}} />
            {sh < 0.99 ? (
              <div style={{position: "absolute", left: box.width / 2 - 30, top: box.height * 0.58, width: 60, height: 60, borderRadius: "50%", border: "5px solid rgba(255,255,255,0.5)", borderTopColor: "#FFF", rotate: `${spin}deg`, opacity: 1 - sh}} />
            ) : null}
          </div>
        );
      })}
      <div style={{position: "absolute", left: 100, right: 100, top: 1520, height: 76, borderRadius: sq ? 0 : 38, background: "#FFF", border: "2px solid #E2E2E8", display: "flex", alignItems: "center", gap: 18, padding: "0 28px", fontFamily: font, fontSize: 26, color: "#A0A0AA"}}>
        <span style={{fontSize: 36}}>+</span> Напишите сообщение…
      </div>
    </AbsoluteFill>
  );
};

const Backdrop: React.FC<{s: SpeakerItem; video: string; p: number}> = ({s, video, p}) => {
  const B = useBrand();
  const bg = s.bg ?? "blur";
  return (
    <AbsoluteFill style={{opacity: p}}>
      {bg === "app" ? (
        <AppBackdrop s={s} video={video} />
      ) : bg === "blur" ? (
        <SpeakerVideo src={video} style={{width: "100%", height: "100%", objectFit: "cover", scale: "1.25", filter: "blur(42px) brightness(0.62) saturate(1.15)"}} />
      ) : bg === "image" && s.image ? (
        <Img src={src(s.image)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
      ) : bg === "brand" ? (
        <AbsoluteFill style={{background: B.finale.bg}}>
          {B.finale.dots || B.finale.grid ? (
            <AbsoluteFill
              style={{
                backgroundImage: B.finale.dots
                  ? `radial-gradient(${B.finale.dots} 2px, transparent 2.5px)`
                  : `linear-gradient(${B.finale.grid} 1px, transparent 1px), linear-gradient(90deg, ${B.finale.grid} 1px, transparent 1px)`,
                backgroundSize: "44px 44px",
              }}
            />
          ) : null}
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{background: "#0B0D14"}} />
      )}
    </AbsoluteFill>
  );
};

// рисуется внутри кадра спикера (ZoomedVideo), поверх основного видео
export const SpeakerStage: React.FC<{s: SpeakerItem; p: number; video: string; cutout: string; focus: {x: number; y: number}; zoom: number; stories: boolean}> = ({s, p, video, cutout, focus, zoom, stories}) => {
  const B = useBrand();
  const style = s.style === "contour" && !cutout ? "frame" : (s.style ?? "frame");
  const R = targetRect({...s, style}, stories);
  const lerp = (a: number, b: number) => a + (b - a) * p;
  if (style === "contour") {
    // вырезка по контуру: спикер уменьшается и «стоит» на нижнем крае кадра в выбранной стороне (как стикер),
    // наверху (tl/tr/top) — голова у верхнего края безопасной зоны
    const kk = R.w / 1080;
    const k = lerp(zoom, kk);
    const cx = R.x + R.w / 2;
    const c = s.corner ?? "bl";
    const top = c.startsWith("t");
    const cy = top ? R.y + 300 * kk : 1940 - (1920 - focus.y) * kk; // глаза так, чтобы низ кадра лёг на низ экрана
    const line = B.id === "od" ? "#191922" : B.id === "aura" ? "#F8F6F3" : "#FFFFFF";
    const o = 7 * p;
    return (
      <>
        <Backdrop s={s} video={video} p={p} />
        <OffthreadVideo
          src={staticFile(cutout)}
          transparent
          muted
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transformOrigin: `${focus.x}px ${focus.y}px`,
            translate: `${lerp(0, cx - focus.x)}px ${lerp(0, cy - focus.y)}px`,
            scale: String(k),
            filter: `drop-shadow(${o}px 0 0 ${line}) drop-shadow(-${o}px 0 0 ${line}) drop-shadow(0 ${o}px 0 ${line}) drop-shadow(0 -${o}px 0 ${line}) drop-shadow(0 24px 40px rgba(0,0,0,${0.45 * p}))`,
          }}
        />
      </>
    );
  }
  const round = style === "round";
  const x = lerp(0, R.x);
  const y = lerp(0, R.y);
  const w = lerp(1080, R.w);
  const h = lerp(1920, R.h);
  const border = (B.id === "od" ? 6 : 8) * p;
  // внутри — весь кадр (рамка) или лицо крупно (круг)
  const inner = round ? Math.max(w / 1080, (w / 560) * p + (1 - p) * zoom) : lerp(zoom, R.w / 1080);
  return (
    <>
      <Backdrop s={s} video={video} p={p} />
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          overflow: "hidden",
          borderRadius: round ? "50%" : B.square ? 0 : 36 * p,
          border: `${border}px solid ${B.frameBorder}`,
          boxShadow: B.square ? `${14 * p}px ${14 * p}px 0 ${B.id === "od" ? "#FFD92E" : "rgba(0,0,0,0.6)"}` : `0 30px 80px rgba(0,0,0,${0.55 * p})`,
          transform: s.tilt ? `perspective(1800px) rotateY(${s.tilt * p}deg)` : undefined,
        }}
      >
        <SpeakerVideo
          src={video}
          style={{
            position: "absolute",
            width: 1080,
            height: 1920,
            maxWidth: "none",
            left: w / 2 - focus.x,
            top: (round ? h / 2 : h * (focus.y / 1920)) - focus.y,
            objectFit: "cover",
            transformOrigin: `${focus.x}px ${focus.y}px`,
            scale: String(inner),
          }}
        />
      </div>
    </>
  );
};

// ------------------------------------------------------------------ выдвижные экраны с видео или фото
export type PanelItem = {
  at: number;
  until: number;
  src: string;
  from?: "top" | "bottom" | "left" | "right" | "tl" | "tr" | "bl" | "br";
  size?: number; // 0.3–0.7: доля высоты (сверху/снизу) или ширины (сбоку, из угла)
  title?: string;
  push?: boolean; // спикер отодвигается от экрана (по умолчанию да)
  fit?: "cover" | "contain";
  from_s?: number; // с какой секунды видео
};
function panelRect(pn: PanelItem, stories: boolean) {
  const f = pn.from ?? "bottom";
  const top = SAFE.top + (stories ? 130 : 0);
  const s = pn.size ?? (f.length === 2 ? 0.5 : f === "top" ? 0.42 : f === "bottom" ? 0.36 : 0.5);
  if (f === "top" || f === "bottom") {
    const h = Math.round(1920 * s);
    return {x: 40, y: f === "top" ? top - 30 : 1920 - SAFE.bottom - h + 60, w: 1000, h, dx: 0, dy: f === "top" ? -1 : 1};
  }
  if (f === "left" || f === "right") {
    const w = Math.round(1080 * s);
    return {x: f === "left" ? 32 : 1080 - 32 - w, y: 420, w, h: 1100, dx: f === "left" ? -1 : 1, dy: 0};
  }
  const w = Math.round(1080 * s);
  const h = Math.round(w * 1.25);
  return {x: f.endsWith("l") ? 40 : 1080 - 40 - w, y: f.startsWith("t") ? top + 40 : 1920 - SAFE.bottom - h, w, h, dx: f.endsWith("l") ? -1 : 1, dy: f.startsWith("t") ? -1 : 1};
}
// на сколько отодвинуть спикера (px), пока экран на месте
export const panelPush = (panels: PanelItem[] | undefined, t: number, stories = false) => {
  let x = 0;
  let y = 0;
  for (const pn of panels ?? []) {
    if (pn.push === false || t < pn.at - 0.1 || t > pn.until + 0.1) continue;
    const p = amountAt(t, pn.at, pn.until, 0.55, 0.45);
    const r = panelRect(pn, stories);
    const f = pn.from ?? "bottom";
    if (f === "top") y += p * Math.min(560, r.h * 0.62);
    else if (f === "bottom") y -= p * Math.min(440, r.h * 0.5);
    else if (f === "left") x += p * r.w * 0.42;
    else if (f === "right") x -= p * r.w * 0.42;
    else {
      x -= r.dx * p * 160;
      y -= r.dy * p * 200;
    }
  }
  return {x, y};
};

const PanelCard: React.FC<{pn: PanelItem; stories: boolean}> = ({pn, stories}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = pn.at + frame / fps;
  const p = amountAt(t, pn.at, pn.until, 0.55, 0.45);
  const r = panelRect(pn, stories);
  const corner = (pn.from ?? "bottom").length === 2;
  const off = (1 - p) * (corner ? 900 : 1300);
  const pop = corner ? spring({frame, fps, config: {damping: 12, stiffness: 140}}) : 1;
  const radius = B.square ? 0 : 34;
  return (
    <div
      style={{
        position: "absolute",
        left: r.x + r.dx * off,
        top: r.y + r.dy * off,
        width: r.w,
        height: r.h,
        borderRadius: radius,
        overflow: "hidden",
        border: `${B.id === "od" ? 5 : 8}px solid ${B.frameBorder}`,
        boxShadow: B.square ? "14px 14px 0 #191922" : "0 30px 90px rgba(0,0,0,0.55)",
        background: "#0B0D14",
        rotate: corner ? `${r.dx * (1 - pop) * 14}deg` : undefined,
        scale: corner ? String(0.7 + 0.3 * pop) : undefined,
        opacity: Math.min(1, p * 3),
      }}
    >
      {isVideo(pn.src) ? (
        <OffthreadVideo src={src(pn.src)} muted trimBefore={Math.round((pn.from_s ?? 0) * fps)} style={{width: "100%", height: "100%", objectFit: pn.fit ?? "cover"}} />
      ) : (
        <Img src={src(pn.src)} style={{width: "100%", height: "100%", objectFit: pn.fit ?? "cover", scale: String(interpolate(t, [pn.at, pn.until], [1.08, 1], clamp))}} />
      )}
      {pn.title ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "18px 26px 22px",
            background: B.id === "od" ? "#F7F4EC" : B.id === "aura" ? "rgba(248,246,243,0.94)" : "rgba(10,16,34,0.82)",
            color: B.id === "gtt" ? "#FFFFFF" : "#191922",
            fontFamily: B.captionFont,
            fontWeight: 700,
            fontSize: 40,
            lineHeight: 1.15,
            borderTop: B.id === "od" ? "4px solid #191922" : undefined,
          }}
        >
          {pn.title}
        </div>
      ) : null}
    </div>
  );
};

export const Panels: React.FC<{items?: PanelItem[]; stories: boolean}> = ({items, stories}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((pn, i) => (
        <Sequence key={`panel-${i}`} from={Math.round(pn.at * fps)} durationInFrames={Math.max(1, Math.round((pn.until - pn.at) * fps))} premountFor={fps}>
          <PanelCard pn={pn} stories={stories} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ тексты в 3D на заднем плане
export type TextItem = {
  at: number;
  until: number;
  text: string;
  x?: number; // центр, px кадра
  y?: number;
  size?: number;
  rx?: number; // наклон вперёд/назад, градусы
  ry?: number; // поворот влево/вправо
  rz?: number; // наклон в плоскости кадра
  color?: string;
  color2?: string; // второй цвет: обводка / объём
  font?: "grotesk" | "display" | "serif" | "hand" | "mono" | "body";
  plane?: "behind" | "front";
  anim?: "rise" | "fly" | "type" | "swing" | "fade";
  depth?: number; // объём букв, px
};
const FONTS = (B: Brand): Record<NonNullable<TextItem["font"]>, {f: string; w: number; caps?: boolean; italic?: boolean}> => ({
  grotesk: {f: oswald.fontFamily, w: 700, caps: true},
  display: {f: unbounded.fontFamily, w: 800, caps: true},
  serif: {f: playfair.fontFamily, w: 700, italic: true},
  hand: {f: caveat.fontFamily, w: 700},
  mono: {f: B.monoFont, w: 600, caps: true},
  body: {f: B.bodyFont, w: 700},
});

const TextOne: React.FC<{it: TextItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const F = FONTS(B)[it.font ?? "grotesk"];
  const anim = it.anim ?? "rise";
  const k = spring({frame, fps, config: {damping: 16, stiffness: 120}});
  const out = interpolate(t, [dur - 0.35, dur], [1, 0], clamp);
  const color = it.color ?? "#FFFFFF";
  const depth = it.depth ?? 6;
  const ink = it.color2 ?? (B.id === "od" ? "#191922" : "rgba(10,12,20,0.75)");
  const shadow = depth > 0 ? Array.from({length: depth}, (_, d) => `${d + 1}px ${d + 1}px 0 ${ink}`).join(", ") + ", 10px 18px 30px rgba(0,0,0,0.4)" : "0 10px 30px rgba(0,0,0,0.45)";
  let text = F.caps ? it.text.toUpperCase() : it.text;
  // кегль по длине строки: слово не вылезает за край кадра (ширина буквы в долях кегля — по шрифту)
  const widthK = {grotesk: 0.48, display: 0.78, serif: 0.52, hand: 0.42, mono: 0.62, body: 0.56}[it.font ?? "grotesk"];
  const longest = Math.max(...text.split("\n").map((l) => l.length), 1);
  // поворот в перспективе раздувает ближний край — запас тем больше, чем сильнее поворот
  const room = 2 * Math.min(it.x ?? 540, 1080 - (it.x ?? 540)) + 80 - 8 * Math.abs(it.ry ?? 0);
  const size = Math.min(it.size ?? 160, room / (longest * widthK));
  if (anim === "type") text = text.slice(0, Math.ceil(interpolate(t, [0, Math.min(dur * 0.6, 0.06 * text.length + 0.2)], [0, text.length], clamp)));
  const ry = (it.ry ?? 0) + (anim === "swing" ? (1 - k) * 80 : 0);
  const z = anim === "fly" ? (1 - k) * -1400 : 0;
  const dy = anim === "rise" ? (1 - k) * 160 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: (it.x ?? 540) - 1000,
        top: (it.y ?? 520) - 400,
        width: 2000,
        height: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: 1400,
        opacity: (anim === "fade" ? k : Math.min(1, k * 2)) * out,
      }}
    >
      <div
        style={{
          fontFamily: F.f,
          fontWeight: F.w,
          fontStyle: F.italic ? "italic" : undefined,
          fontSize: size,
          lineHeight: 0.95,
          letterSpacing: F.caps ? "0.01em" : undefined,
          color,
          textShadow: shadow,
          whiteSpace: "pre",
          textAlign: "center",
          transform: `translate3d(0, ${dy}px, ${z}px) rotateX(${it.rx ?? 0}deg) rotateY(${ry}deg) rotateZ(${it.rz ?? 0}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Texts3D: React.FC<{items?: TextItem[]; plane: "behind" | "front"}> = ({items, plane}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? [])
        .filter((it) => (it.plane ?? "behind") === plane)
        .map((it, i) => (
          <Sequence key={`t3d-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} layout="none">
            <TextOne it={it} />
          </Sequence>
        ))}
    </>
  );
};
export const textBehindActive = (items: TextItem[] | undefined, t: number) => (items ?? []).some((it) => (it.plane ?? "behind") === "behind" && t >= it.at - 0.05 && t <= it.until + 0.05);

// ------------------------------------------------------------------ перечисления: разные подачи
export type ListItem = {
  at: number;
  until: number;
  style: "flip" | "cards" | "stickers" | "numbers" | "bubbles" | "typewriter";
  title?: string;
  items: {text: string; at: number}[];
};
// флипчарт и «печатная машинка» поднимают спикера вверх (как планшет с галочками), остальные — вокруг головы
export const LIFT_LISTS = new Set(["flip", "typewriter"]);

const STICKY = ["#FFE066", "#FF9FB2", "#9BE7C4", "#A5C8FF", "#FFC48C"];

const ListOne: React.FC<{l: ListItem; stories: boolean}> = ({l, stories}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = l.at + frame / fps;
  const p = amountAt(t, l.at, l.until, 0.45, 0.4);
  const top = SAFE.top + (stories ? 130 : 0);
  const shown = l.items.filter((x) => x.at <= t);
  const since = (x: {at: number}) => Math.max(0, t - x.at);
  const sp = (x: {at: number}, cfg = {damping: 13, stiffness: 160}) => spring({frame: Math.round(since(x) * fps), fps, config: cfg});

  if (l.style === "flip") {
    // флипчарт на мольберте: лист бумаги, пункты пишутся маркером, квадратик отмечается галочкой
    return (
      <AbsoluteFill style={{opacity: p}}>
        <AbsoluteFill style={{background: `linear-gradient(to bottom, rgba(${B.veil},0) 50%, rgba(${B.veil},0.82) 62%)`}} />
        <div style={{position: "absolute", left: 120, top: 1040 + (1 - p) * 600, width: 840, height: 720}}>
          <div style={{position: "absolute", left: 120, top: -40, width: 18, height: 820, background: "#3a3a44", rotate: "-8deg", borderRadius: 9}} />
          <div style={{position: "absolute", right: 120, top: -40, width: 18, height: 820, background: "#3a3a44", rotate: "8deg", borderRadius: 9}} />
          <div style={{position: "absolute", left: 30, top: 0, right: 30, height: 640, background: "#FBFAF6", boxShadow: "0 30px 60px rgba(0,0,0,0.35)", borderTop: "22px solid #2b2b33", padding: "34px 46px"}}>
            {l.title ? <div style={{fontFamily: caveat.fontFamily, fontWeight: 700, fontSize: 64, color: "#1d3fae", borderBottom: "4px solid #e2463b", display: "inline-block", marginBottom: 14}}>{l.title}</div> : null}
            {l.items.map((x, i) => {
              const w = interpolate(since(x), [0, 0.5], [0, 100], clamp);
              const tick = interpolate(since(x), [0.45, 0.7], [0, 1], clamp);
              return x.at <= t ? (
                <div key={i} style={{display: "flex", alignItems: "center", gap: 22, margin: "10px 0"}}>
                  <svg width={56} height={56} viewBox="0 0 56 56">
                    <rect x={4} y={4} width={48} height={48} fill="none" stroke="#2b2b33" strokeWidth={5} />
                    <path d="M12 30 L24 42 L48 10" fill="none" stroke="#e2463b" strokeWidth={8} strokeLinecap="round" strokeDasharray={70} strokeDashoffset={70 * (1 - tick)} />
                  </svg>
                  <div style={{fontFamily: caveat.fontFamily, fontWeight: 700, fontSize: 60, color: "#22222a", clipPath: `inset(0 ${100 - w}% 0 0)`}}>{x.text}</div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (l.style === "typewriter") {
    // тёмная стеклянная панель снизу, строки печатаются по букве с курсором
    return (
      <AbsoluteFill style={{opacity: p}}>
        <AbsoluteFill style={{background: `linear-gradient(to bottom, rgba(${B.veil},0) 48%, rgba(${B.veil},0.9) 60%)`}} />
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            top: 1060 + (1 - p) * 500,
            minHeight: 420,
            padding: "36px 44px",
            borderRadius: B.square ? 0 : 28,
            background: "rgba(12,14,22,0.86)",
            border: `2px solid ${B.accent}`,
            boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            fontFamily: B.monoFont,
            color: "#E8F0FF",
            fontSize: 46,
            lineHeight: 1.45,
          }}
        >
          {l.title ? <div style={{color: B.accent, fontSize: 34, letterSpacing: "0.12em", marginBottom: 10}}>{"> " + l.title.toUpperCase()}</div> : null}
          {shown.map((x, i) => {
            const n = Math.floor(interpolate(since(x), [0, 0.045 * x.text.length + 0.1], [0, x.text.length], clamp));
            const last = i === shown.length - 1;
            return (
              <div key={i}>
                <span style={{color: B.accent}}>{String(i + 1).padStart(2, "0")} </span>
                {x.text.slice(0, n)}
                {last && Math.floor(t * 3) % 2 === 0 ? <span style={{background: "#E8F0FF", marginLeft: 4}}>&nbsp;</span> : null}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (l.style === "cards") {
    // карточки стопкой сверху: новая прилетает с переворотом и ложится на предыдущие
    return (
      <AbsoluteFill style={{opacity: p}}>
        {shown.map((x, i) => {
          const k = sp(x, {damping: 15, stiffness: 120});
          const depth = shown.length - 1 - i;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 140 + depth * 18,
                top: top + 40 - depth * 22,
                width: 800,
                padding: "30px 36px",
                display: "flex",
                gap: 26,
                alignItems: "center",
                background: B.chip.bg,
                color: B.chip.text,
                borderRadius: B.square ? 0 : 26,
                border: B.chip.border,
                boxShadow: B.chip.shadow ?? "0 20px 50px rgba(0,0,0,0.35)",
                transform: `perspective(1600px) rotateY(${(1 - k) * -95}deg) rotateZ(${(i % 2 ? 1.5 : -1.5) * k}deg)`,
                transformOrigin: "left center",
                opacity: depth > 2 ? 0 : 1 - depth * 0.18,
                scale: String(1 - depth * 0.04),
              }}
            >
              <div style={{fontFamily: B.numberFont, fontWeight: 800, fontSize: 84, color: B.id === "aura" ? "#262626" : B.accent, lineHeight: 1}}>{i + 1}</div>
              <div style={{fontFamily: B.chip.font, fontWeight: B.chip.weight, fontSize: 48, lineHeight: 1.15}}>{x.text}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }

  if (l.style === "stickers") {
    // стикеры-«липучки» по бокам от головы, по очереди слева и справа
    return (
      <AbsoluteFill style={{opacity: p}}>
        {shown.slice(-4).map((x, j, arr) => {
          const i = l.items.indexOf(x);
          const k = sp(x, {damping: 9, stiffness: 180});
          const left = i % 2 === 0;
          const row = Math.floor(i / 2) % 2;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: left ? 34 : 1080 - 34 - 300,
                top: 640 + row * 330,
                width: 300,
                minHeight: 260,
                padding: "26px 24px",
                background: STICKY[i % STICKY.length],
                color: "#1d1d24",
                fontFamily: caveat.fontFamily,
                fontWeight: 700,
                fontSize: 50,
                lineHeight: 1.05,
                boxShadow: "0 18px 30px rgba(0,0,0,0.35)",
                rotate: `${(left ? -1 : 1) * (4 + (i % 3) * 2)}deg`,
                scale: String(0.3 + 0.7 * k),
                opacity: j < arr.length - 4 ? 0 : 1,
              }}
            >
              <div style={{position: "absolute", top: -14, left: 110, width: 80, height: 28, background: "rgba(255,255,255,0.6)", rotate: "-3deg"}} />
              {x.text}
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }

  if (l.style === "numbers") {
    // по одному пункту: огромная цифра + текст сверху, новый выталкивает старый
    const cur = shown[shown.length - 1];
    if (!cur) return null;
    const i = l.items.indexOf(cur);
    const k = sp(cur);
    return (
      <AbsoluteFill style={{opacity: p}}>
        <div style={{position: "absolute", left: 70, right: 70, top: top + 10, display: "flex", alignItems: "center", gap: 28, translate: `${(1 - k) * 260}px 0`, opacity: Math.min(1, k * 1.6)}}>
          <div
            style={{
              fontFamily: unbounded.fontFamily,
              fontWeight: 800,
              fontSize: 250,
              lineHeight: 0.9,
              color: B.accent,
              WebkitTextStroke: B.number?.stroke,
              textShadow: B.number?.shadow ?? `0 0 40px ${B.accentGlow}`,
            }}
          >
            {i + 1}
          </div>
          <div style={{fontFamily: B.captionFont, fontWeight: 800, fontSize: 60, lineHeight: 1.08, color: "#FFFFFF", textShadow: "0 6px 24px rgba(0,0,0,0.6)"}}>
            {l.title && i === 0 && since(cur) < 0.8 ? <div style={{fontSize: 30, letterSpacing: "0.12em", opacity: 0.85, fontFamily: B.monoFont}}>{l.title.toUpperCase()}</div> : null}
            {cur.text}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // bubbles: «пилюли» дугой вокруг головы, копятся
  const slots = [
    {x: 80, y: top + 60},
    {x: 560, y: top + 20},
    {x: 60, y: top + 230},
    {x: 600, y: top + 200},
    {x: 70, y: 1300},
    {x: 590, y: 1300},
  ];
  return (
    <AbsoluteFill style={{opacity: p}}>
      {shown.slice(0, 6).map((x, i) => {
        const k = sp(x, {damping: 10, stiffness: 200});
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: slots[i].x,
              top: slots[i].y,
              maxWidth: 440,
              padding: "16px 28px",
              borderRadius: B.square ? 0 : 999,
              background: i % 2 ? B.accent : B.chip.bg,
              color: i % 2 ? B.accentInk : B.chip.text,
              border: B.chip.border,
              boxShadow: B.chip.shadow ?? "0 14px 30px rgba(0,0,0,0.3)",
              fontFamily: B.chip.font,
              fontWeight: B.chip.weight,
              fontSize: 44,
              scale: String(k),
              rotate: `${(i % 2 ? 1 : -1) * 3}deg`,
            }}
          >
            {x.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Lists: React.FC<{items?: ListItem[]; stories: boolean}> = ({items, stories}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((l, i) => (
        <Sequence key={`list-${i}`} from={Math.round(l.at * fps)} durationInFrames={Math.max(1, Math.round((l.until - l.at) * fps))} premountFor={fps}>
          <ListOne l={l} stories={stories} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ палитра: цвета текста в моменте
export type Palette = {text?: string; accent?: string; ink?: string};
export type PaletteAt = Palette & {at: number; until: number};
// цвет «свечения» из hex
export const glowOf = (hex: string, a = 0.85) => {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : hex;
};
export const brandWithPalette = (B: Brand, pal?: Palette): Brand =>
  !pal || (!pal.accent && !pal.text && !pal.ink) ? B : {...B, accent: pal.accent ?? B.accent, accentGlow: pal.accent ? glowOf(pal.accent) : B.accentGlow, accentInk: pal.ink ?? B.accentInk, captionText: pal.text ?? B.captionText};
