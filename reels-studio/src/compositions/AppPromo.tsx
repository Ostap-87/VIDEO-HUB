// Рекламный ролик о приложении (решение пользователя 27.10.2026: «гайд видео о нашем приложении… по примеру рекламного
// ролика… звук, текст и визуал должны совпадать и чётко синхронизироваться»).
// Всё время берётся из props/<имя>.json (пишет scripts/promo_build.py по голосу и записям экрана):
//  - сцена (beat) — окно [w0, w1] вокруг фразы диктора; экран телефона — screens/<сцена>.mp4, где каждое нажатие
//    уже стоит на своём слове; следующий экран заезжает справа, как в iOS;
//  - заголовок сцены (Unbounded, акцент **так**), кикер «03 · СЕГОДНЯ», плашки появляются на своих словах;
//  - нажатия (палец + круг), наезды на элемент экрана, субтитры по 3 слова (текущее — синим);
//  - особые сцены: chaos (хаос поездки), reveal (главный экран с иконкой GTT), three (три экрана), counter (76 программ),
//    wechat (мини-программа), final (слоган и плашка CTA); заставка GTT в начале и в конце.
// format: "v" — 1080×1920 (Reels/Stories), "h" — 1920×1080 (презентации, сайт, YouTube).
import React from "react";
import {AbsoluteFill, AnimatedImage, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {body, display, mono} from "../fonts";
import {theme} from "../theme";
import {GttIntro} from "./GttIntro";
import {Countries, Hooks, hookSounds, Widgets, ZoomLabel, zoomAt, type Hook, type Widget, type Zoom} from "./app-promo/V4Fx";

const C = theme.colors;
const SCREEN_W = 390, SCREEN_H = 844; // экран записи в точках (видео 780×1688)
const HANDLE = 0.5;

export const appPromoSchema = z.object({
  format: z.enum(["v", "h"]),
  voice: z.string(),
  voiceSource: z.string().optional(),
  music: z.string().optional(),
  musicVolume: z.number().optional(),
  captions: z.array(z.object({text: z.string(), start: z.number(), end: z.number()})),
  showCaptions: z.boolean().optional(),
  total: z.number(),
  beats: z.array(z.any()),
  taps: z.array(z.any()),
  focus: z.array(z.any()),
  sfxDir: z.string(),
  stills: z.string(),
});
export type AppPromoProps = z.infer<typeof appPromoSchema>;
type Beat = {
  id: string; part: string; visual: string; start: number; end: number; w0: number; w1: number;
  title?: string; kicker?: string; cta?: string; fx?: string; still?: string; launch?: number;
  chips?: {text: string; at: number}[]; bigWords?: {text: string; at: number}[];
  counter?: {value: number; label: string; at: number; sub: string; subAt: number};
  screen?: string; screenDur?: number; flip?: number; threeOrder?: string[];
  orbit?: {text: string; icon?: string; logo?: string; sub?: string; at: number}[];
  report?: {at?: number; excel?: number; pdf?: number; rub?: number; done?: number; time?: number};
  mind?: {report?: number; map?: number; time?: number; day?: number; companies?: number; deals?: number; contacts?: number; next?: number; auto?: number};
  // v3 (02.11.2026): переход на входе в сцену, крупное слово за телефоном, эмодзи на слове
  trans?: "none" | "zoom" | "whip" | "spin" | "iris" | "flash" | "shutter";
  accent?: string;
  emoji?: {src: string; at: number};
  // v4 (02.11.2026): зумы в экран, плашки-виджеты, хуки, график стран, сцены без голоса (монтаж функций)
  zooms?: Zoom[]; widgets?: Widget[]; hooks?: Hook[];
  countries?: {at: number; subAt: number; items: [string, string, number][]};
  feature?: [number, number]; silent?: boolean;
};

const INTRO = 54, OUTRO = 45, OVERLAP = 10;
export const appPromoFrames = (p: AppPromoProps, fps = 30) => Math.round(p.total * fps);

// ---------- раскладка двух форматов ----------
const layoutOf = (format: "v" | "h") =>
  format === "h"
    ? {W: 1920, H: 1080, phoneW: 430, phoneX: 1390, phoneY: 60, textX: 150, textW: 860, kickerY: 250, titleSize: 76, chipY: 610, chipSize: 34, capY: 930, capSize: 38, capX: 150, capAlign: "left" as const}
    // v3: телефон целиком в кадре (низ ~1500, выше интерфейса Instagram), субтитры под ним
    : {W: 1080, H: 1920, phoneW: 440, phoneX: 540, phoneY: 515, textX: 72, textW: 936, kickerY: 262, titleSize: 76, chipY: 0, chipSize: 32, capY: 1528, capSize: 40, capX: 540, capAlign: "center" as const};
type Layout = ReturnType<typeof layoutOf>;

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

// «текст с **акцентом**» → куски
const parts = (s: string) => s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((x) => ({t: x.replace(/\*\*/g, ""), acc: x.startsWith("**")}));

// ---------- фон: светлая студия, мягкие пятна света, сетка точек ----------
const Stage: React.FC<{L: Layout}> = ({L}) => {
  const frame = useCurrentFrame();
  const a = frame / 30;
  return (
    <AbsoluteFill style={{background: C.primary, overflow: "hidden"}}>
      <div style={{position: "absolute", width: L.W * 0.9, height: L.W * 0.9, borderRadius: "50%", left: L.W * 0.45 + Math.sin(a * 0.21) * 120, top: -L.W * 0.25 + Math.cos(a * 0.17) * 80,
        background: "radial-gradient(circle, rgba(37,99,235,0.20), rgba(37,99,235,0) 65%)"}} />
      <div style={{position: "absolute", width: L.W * 0.8, height: L.W * 0.8, borderRadius: "50%", left: -L.W * 0.3 + Math.cos(a * 0.13) * 90, top: L.H * 0.55 + Math.sin(a * 0.19) * 70,
        background: "radial-gradient(circle, rgba(56,189,248,0.16), rgba(56,189,248,0) 65%)"}} />
      <AbsoluteFill style={{backgroundImage: "radial-gradient(rgba(23,23,29,0.07) 1.6px, transparent 1.7px)", backgroundSize: "34px 34px",
        maskImage: "radial-gradient(ellipse at 50% 45%, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, black 30%, transparent 80%)"}} />
    </AbsoluteFill>
  );
};

// ---------- телефон ----------
const Phone: React.FC<{w: number; children: React.ReactNode; shadow?: number; shine?: number; back?: string}> = ({w, children, shadow = 1, shine = -1, back}) => {
  const k = w / SCREEN_W;
  const bez = Math.round(w * 0.035);
  const sw = w, sh = SCREEN_H * k;
  const r = w * 0.15;
  return (
    <div style={{position: "relative", width: sw + bez * 2, height: sh + bez * 2, borderRadius: r + bez,
      background: "linear-gradient(145deg, #3a3d46 0%, #15161a 40%, #2a2c33 100%)",
      boxShadow: `0 ${50 * shadow}px ${110 * shadow}px rgba(20,30,60,${0.28 * shadow}), 0 ${12 * shadow}px ${30 * shadow}px rgba(20,30,60,${0.18 * shadow}), inset 0 0 0 2px rgba(255,255,255,0.10)`}}>
      {/* кнопки сбоку */}
      <div style={{position: "absolute", left: -4, top: sh * 0.2, width: 5, height: sh * 0.07, borderRadius: 3, background: "#2a2c33"}} />
      <div style={{position: "absolute", left: -4, top: sh * 0.3, width: 5, height: sh * 0.11, borderRadius: 3, background: "#2a2c33"}} />
      <div style={{position: "absolute", right: -4, top: sh * 0.26, width: 5, height: sh * 0.15, borderRadius: 3, background: "#2a2c33"}} />
      <div style={{position: "absolute", left: bez, top: bez, width: sw, height: sh, borderRadius: r, overflow: "hidden", background: "#e8edf4"}}>
        {children}
        {/* стекло: мягкий блик */}
        <div style={{position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.07) 100%)", pointerEvents: "none"}} />
        {/* v3: блик проходит по стеклу на входе в сцену */}
        {shine >= 0 && shine <= 1 ? (
          <div style={{position: "absolute", top: "-20%", bottom: "-20%", width: "38%", left: `${-50 + shine * 170}%`, rotate: "18deg", pointerEvents: "none",
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 100%)"}} />
        ) : null}
        {/* v3: спинка телефона, пока он развёрнут экраном от зрителя (оборот 360°) */}
        {back ? (
          <div style={{position: "absolute", inset: 0, background: "linear-gradient(150deg, #1e3a8a 0%, #0b1d55 55%, #081440 100%)", display: "flex", alignItems: "center", justifyContent: "center"}}>
            <Img src={staticFile(back)} style={{width: w * 0.34, height: w * 0.34, borderRadius: w * 0.08, boxShadow: "0 0 60px rgba(125,211,252,0.55)"}} />
          </div>
        ) : null}
        {/* «остров» */}
        <div style={{position: "absolute", left: sw / 2 - w * 0.15, top: w * 0.028, width: w * 0.3, height: w * 0.085, borderRadius: w * 0.05, background: "#0b0b0d"}} />
      </div>
    </div>
  );
};

// ---------- позы телефона по сценам ----------
type Pose = {x: number; y: number; s: number; ry: number; rz: number; o: number};
const poseOf = (b: Beat | undefined, i: number, L: Layout): Pose => {
  const side = i % 2 ? -1 : 1;
  const base: Pose = {x: L.phoneX, y: L.phoneY, s: 1, ry: -9 * side, rz: 1.2 * side, o: 1};
  if (!b) return base;
  if (b.visual === "chaos") return {...base, y: L.phoneY + L.H * 0.9, s: 0.8, ry: 0, rz: 8, o: 0};
  if (b.visual === "reveal") return {...base, ry: 0, rz: 0};
  if (b.visual === "three" || b.visual === "mindgrow" || b.visual === "chats" || b.visual === "countries") return {...base, s: 0.7, o: 0, ry: 0, rz: 0, y: b.visual === "chats" ? L.phoneY + L.H * 0.9 : base.y};
  if (b.visual === "orbit") return L.W > L.H ? {...base, x: 1360, y: 250, s: 0.74, ry: -6, rz: 0} : {...base, y: 600, s: 0.82, ry: 0, rz: 0};
  if (b.visual === "receipts") return L.W > L.H ? {...base, x: 1480, ry: -12, rz: 1.5} : {...base, x: 860, y: 1130, s: 0.62, ry: -12, rz: 2};
  if (b.visual === "counter") return L.W > L.H ? {...base, x: L.phoneX + 20, ry: -14, rz: 2} : {...base, s: 0.9, y: L.phoneY + 150, ry: 10, rz: -2};
  if (b.visual === "final") return L.W > L.H ? {...base, x: L.phoneX - 40, ry: -6, rz: 0} : {...base, s: 0.86, y: L.phoneY + 20, ry: 0, rz: 0};
  return base;
};
const mixPose = (a: Pose, b: Pose, k: number): Pose => ({
  x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s: a.s + (b.s - a.s) * k, ry: a.ry + (b.ry - a.ry) * k, rz: a.rz + (b.rz - a.rz) * k, o: a.o + (b.o - a.o) * k,
});

// ---------- палец и круг нажатия (координаты — доли экрана телефона) ----------
const Tap: React.FC<{x: number; y: number; hold: number; k: number}> = ({x, y, hold, k}) => {
  const frame = useCurrentFrame(); // 0 — момент касания (Sequence начинается за 0,35 с до него)
  const {fps} = useVideoConfig();
  const lead = Math.round(0.35 * fps);
  const t = frame - lead;
  const holdF = Math.round(hold * fps);
  const appear = interpolate(frame, [0, lead], [0, 1], {...clamp, easing: ease});
  const leave = interpolate(t, [holdF + 6, holdF + 16], [1, 0], clamp);
  const press = t >= 0 && t <= holdF + 3 ? 0.82 : 1;
  const ring = interpolate(t, [0, 14], [0, 1], clamp);
  const ringO = interpolate(t, [0, 14], [0.55, 0], clamp);
  const prog = holdF ? interpolate(t, [0, holdF], [0, 1], clamp) : 0;
  const px = x * SCREEN_W * k, py = y * SCREEN_H * k;
  const R = 26 * k;
  return (
    <div style={{position: "absolute", left: px, top: py, width: 0, height: 0, opacity: appear * leave}}>
      {t >= 0 ? <div style={{position: "absolute", left: -R * 2.2 * ring, top: -R * 2.2 * ring, width: R * 4.4 * ring, height: R * 4.4 * ring, borderRadius: "50%", border: `${3 * k}px solid rgba(37,99,235,${ringO})`, background: `rgba(37,99,235,${ringO * 0.25})`}} /> : null}
      {holdF ? (
        <svg width={R * 3.4} height={R * 3.4} style={{position: "absolute", left: -R * 1.7, top: -R * 1.7, transform: "rotate(-90deg)"}}>
          <circle cx={R * 1.7} cy={R * 1.7} r={R * 1.45} fill="none" stroke="rgba(220,38,38,0.9)" strokeWidth={4 * k} strokeDasharray={`${2 * Math.PI * R * 1.45 * prog} 999`} strokeLinecap="round" />
        </svg>
      ) : null}
      <div style={{position: "absolute", left: -R + (1 - appear) * R * 1.2, top: -R + (1 - appear) * R * 1.6, width: R * 2, height: R * 2, borderRadius: "50%",
        background: "rgba(255,255,255,0.78)", border: `${2 * k}px solid rgba(255,255,255,0.95)`, boxShadow: `0 ${6 * k}px ${18 * k}px rgba(20,30,60,0.35)`, scale: String(press)}} />
    </div>
  );
};

// ---------- главный экран телефона с иконкой GTT ----------
const ICON_TINTS = ["#f6c9c4", "#c9e3f8", "#d9f0d0", "#f8e3b8", "#e4d6f7", "#cdeee9", "#f7d3e6", "#dfe6ee"];
const HomeScreen: React.FC<{k: number; stills: string; pulse: number}> = ({k, stills, pulse}) => {
  const icon = (i: number) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 28 + col * 88, y = 120 + row * 104;
    return {x, y};
  };
  const gtt = icon(9);
  return (
    <AbsoluteFill style={{background: "linear-gradient(160deg, #6ea8ff 0%, #2563eb 45%, #1e3a8a 100%)"}}>
      <div style={{position: "absolute", left: 30 * k, top: 18 * k, color: "white", fontFamily: body.fontFamily, fontWeight: 700, fontSize: 16 * k}}>9:41</div>
      {Array.from({length: 16}).map((_, i) => {
        if (i === 9) return null;
        const p = icon(i);
        return (
          <div key={i} style={{position: "absolute", left: p.x * k, top: p.y * k, width: 64 * k, height: 64 * k, borderRadius: 16 * k, background: ICON_TINTS[i % ICON_TINTS.length], opacity: 0.85,
            boxShadow: `0 ${3 * k}px ${8 * k}px rgba(0,0,0,0.15)`}}>
            <div style={{position: "absolute", left: 18 * k, top: 18 * k, width: 28 * k, height: 28 * k, borderRadius: 8 * k, background: "rgba(255,255,255,0.65)"}} />
          </div>
        );
      })}
      <div style={{position: "absolute", left: gtt.x * k, top: gtt.y * k, width: 64 * k, height: 64 * k, scale: String(1 + 0.08 * pulse)}}>
        <Img src={staticFile(`${stills}/app-icon.png`)} style={{width: "100%", height: "100%", borderRadius: 16 * k, boxShadow: `0 ${6 * k}px ${16 * k}px rgba(0,0,0,0.3)`}} />
        <div style={{position: "absolute", top: 70 * k, left: -20 * k, width: 104 * k, textAlign: "center", color: "white", fontFamily: body.fontFamily, fontWeight: 700, fontSize: 12 * k}}>GTT</div>
      </div>
      <div style={{position: "absolute", left: 22 * k, right: 22 * k, bottom: 22 * k, height: 86 * k, borderRadius: 30 * k, background: "rgba(255,255,255,0.22)"}} />
    </AbsoluteFill>
  );
};
export const HOME_ICON = {x: 28 + 1 * 88, y: 120 + 2 * 104, size: 64}; // иконка GTT на главном экране (точки)

// ---------- содержимое экрана телефона ----------
const ScreenStack: React.FC<{p: AppPromoProps; beats: Beat[]; k: number}> = ({p, beats, k}) => {
  const {fps} = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  return (
    <AbsoluteFill>
      {beats.map((b, i) => {
        const from = f(b.w0);
        const dur = f(b.w1 + HANDLE) - from;
        if (["chaos", "three", "mindgrow", "chats", "countries"].includes(b.visual)) return null;
        const prevVisual = beats[i - 1]?.visual;
        return (
          <Sequence key={b.id} from={from} durationInFrames={dur} premountFor={fps} name={`Экран ${b.id}`}>
            <ScreenBeat b={b} p={p} k={k} enter={i > 0 && !["chaos", "chats", "mindgrow", "three"].includes(prevVisual) && b.visual !== "reveal" && b.launch === undefined} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const ScreenBeat: React.FC<{b: Beat; p: AppPromoProps; k: number; enter: boolean}> = ({b, p, k, enter}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const x = enter ? interpolate(frame, [0, 10], [100, 0], {...clamp, easing: ease}) : 0;
  const shade = enter ? interpolate(frame, [0, 10], [0.25, 0], clamp) : 0;
  let content: React.ReactNode = null;
  if (b.screen) {
    content = <OffthreadVideo src={staticFile(b.screen)} muted style={{width: "100%", height: "100%", objectFit: "cover"}} />;
  } else if (b.visual === "reveal") {
    content = <HomeScreen k={k} stills={p.stills} pulse={Math.max(0, Math.sin((frame / fps) * 5))} />;
  } else if (b.visual === "wechat") {
    const y = interpolate(frame, [fps * 0.4, fps * 2.6], [0, -(2116 - 1688) / 2], {...clamp, easing: ease});
    content = <Img src={staticFile(`${p.stills}/1-visit.png`)} style={{width: "100%", position: "absolute", top: y * (k * SCREEN_W / 390) / 2}} />;
  } else if (b.visual === "counter") {
    content = <Img src={staticFile(`${p.stills}/${b.still || "start-globe.png"}`)} style={{width: "100%", height: "100%", objectFit: "cover"}} />;
  } else if (b.visual === "final") {
    content = <Img src={staticFile(`${p.stills}/today.png`)} style={{width: "100%", height: "100%", objectFit: "cover"}} />;
  }
  // запуск приложения с главного экрана: иконка раскрывается в экран
  const launch = b.launch !== undefined ? b.launch - b.w0 : null;
  let launchLayer: React.ReactNode = null;
  if (launch !== null) {
    const lf = Math.round(launch * fps);
    const kk = interpolate(frame, [lf, lf + 9], [0, 1], {...clamp, easing: ease});
    const icon = HOME_ICON;
    const L0 = icon.x * k, T0 = icon.y * k, S0 = icon.size * k;
    const W = SCREEN_W * k, H = SCREEN_H * k;
    const left = L0 * (1 - kk), top = T0 * (1 - kk), w = S0 + (W - S0) * kk, h = S0 + (H - S0) * kk;
    launchLayer = (
      <>
        {frame < lf + 12 ? <AbsoluteFill><HomeScreen k={k} stills={p.stills} pulse={frame < lf ? Math.max(0, Math.sin((frame / fps) * 5)) : 0} /></AbsoluteFill> : null}
        {frame >= lf ? (
          <div style={{position: "absolute", left, top, width: w, height: h, overflow: "hidden", borderRadius: 16 * k * (1 - kk) + 2, opacity: interpolate(frame, [lf + 6, lf + 11], [1, 0], clamp)}}>
            <Img src={staticFile(`${p.stills}/app-icon.png`)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
          </div>
        ) : null}
      </>
    );
  }
  const screenHidden = launch !== null && frame < Math.round(launch * fps) + 5;
  return (
    <AbsoluteFill style={{translate: `${x}% 0`, boxShadow: enter ? "-30px 0 40px rgba(0,0,0,0.18)" : undefined}}>
      <AbsoluteFill style={{opacity: screenHidden ? 0 : 1}}>{content}</AbsoluteFill>
      {launchLayer}
      {shade ? <AbsoluteFill style={{background: `rgba(0,0,0,${shade})`}} /> : null}
    </AbsoluteFill>
  );
};

// ---------- заголовок сцены ----------
const Title: React.FC<{b: Beat; L: Layout; dur: number; center?: boolean; size?: number; y?: number}> = ({b, L, dur, center, size, y}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(frame, [dur - 8, dur], [0, 1], clamp);
  const fs = size ?? L.titleSize;
  let n = 0;
  const words = parts(b.title || "").flatMap((pt) => pt.t.split(/(\s+)/).filter((w) => w.trim()).map((w) => ({w, acc: pt.acc, i: n++})));
  const kickIn = spring({frame, fps, config: theme.motion.snappy});
  const isH = L.W > L.H;
  const top = y ?? (isH ? L.kickerY : L.kickerY);
  return (
    <div style={{position: "absolute", left: center ? 0 : L.textX, width: center ? L.W : L.textW, top, textAlign: center ? "center" : "left",
      opacity: 1 - out, translate: `0 ${-40 * out}px`, padding: center ? "0 64px" : 0, boxSizing: "border-box"}}>
      {b.kicker ? (
        <div style={{fontFamily: mono.fontFamily, fontWeight: 500, fontSize: isH ? 26 : 30, letterSpacing: "0.14em", color: C.accent, marginBottom: 22,
          opacity: kickIn, translate: `0 ${(1 - kickIn) * 20}px`, display: "flex", alignItems: "center", gap: 18, justifyContent: center ? "center" : "flex-start", flexWrap: "wrap"}}>
          {b.kicker}
          {b.feature ? (
            <span style={{display: "inline-flex", gap: 7}}>
              {Array.from({length: b.feature[1]}).map((_, j) => (
                <span key={j} style={{width: 12, height: 12, borderRadius: 6, background: j < b.feature![0] ? C.accent : "rgba(37,99,235,0.18)",
                  scale: String(j === b.feature![0] - 1 ? 1 + 0.5 * Math.max(0, 1 - frame / 10) : 1)}} />
              ))}
            </span>
          ) : null}
        </div>
      ) : null}
      <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: fs, lineHeight: 1.06, color: C.text, letterSpacing: "-0.01em", textWrap: "balance" as never}}>
        {words.map(({w, acc, i}) => {
          const s = spring({frame: frame - 3 - i * 2, fps, config: theme.motion.snappy});
          return (
            <span key={i} style={{display: "inline-block", marginRight: "0.26em", color: acc ? C.accent : C.text, opacity: s, translate: `0 ${(1 - s) * 40}px`}}>{w}</span>
          );
        })}
      </div>
    </div>
  );
};

// ---------- плашки на словах ----------
const CHIP_ICONS: Record<string, string> = {
  check: "M5 12.5l4.2 4.2L19 7", pin: "M12 21s-6-6.2-6-11a6 6 0 0112 0c0 4.8-6 11-6 11zm0-8a3 3 0 100-6 3 3 0 000 6z",
  bus: "M5 4h14v12H5zM5 11h14M7 19v-3M17 19v-3M8 14h.01M16 14h.01", chat: "M4 5h16v11H9l-5 4z",
  poll: "M5 20V10M12 20V4M19 20v-7", mic: "M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3zM5 11a7 7 0 0014 0M12 18v3",
  lang: "M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 4-3 7-6 8M13 21l4-9 4 9M14.5 18h5",
};
const Chips: React.FC<{b: Beat; L: Layout; dur: number}> = ({b, L, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const isH = L.W > L.H;
  const out = interpolate(frame, [dur - 8, dur], [0, 1], clamp);
  const chips = b.chips || [];
  return (
    <>
      {chips.map((c, i) => {
        const at = Math.round((c.at - b.w0) * fps) - 2;
        const s = spring({frame: frame - at, fps, config: {damping: 13, stiffness: 190, mass: 0.7}});
        if (frame < at) return null;
        // горизонтально — столбиком слева; вертикально — по бокам телефона, по очереди слева и справа
        const pos: React.CSSProperties = isH
          ? {left: L.textX, top: L.chipY + i * 86}
          : i % 2 === 0 ? {left: 40, top: 940 + Math.floor(i / 2) * 200} : {right: 40, top: 1030 + Math.floor(i / 2) * 200};
        return (
          <div key={i} style={{position: "absolute", ...pos, display: "flex", alignItems: "center", gap: 14, padding: isH ? "14px 26px 14px 16px" : "16px 28px 16px 18px",
            borderRadius: 999, background: "rgba(255,255,255,0.86)", backdropFilter: "blur(14px)", boxShadow: "0 14px 34px rgba(20,30,60,0.16)", border: `2px solid ${C.surface}`,
            opacity: s * (1 - out), scale: String(0.7 + 0.3 * s), transformOrigin: isH || i % 2 === 0 ? "left center" : "right center"}}>
            <div style={{width: L.chipSize * 1.5, height: L.chipSize * 1.5, borderRadius: L.chipSize * 0.42, background: `linear-gradient(145deg, #4F8BFF, ${C.accent} 60%, #1D3FB8)`, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 14px rgba(37,99,235,0.35), inset 0 2px 0 rgba(255,255,255,0.35)"}}>
              <svg width={L.chipSize * 0.86} height={L.chipSize * 0.86} viewBox="0 0 24 24"><path d={CHIP_ICONS[(c as {icon?: string}).icon || "check"] || CHIP_ICONS.check} fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: L.chipSize, color: C.text, whiteSpace: "nowrap"}}>{c.text}</span>
          </div>
        );
      })}
    </>
  );
};

// ---------- субтитры: по 3 слова, текущее — синим ----------
const Captions: React.FC<{p: AppPromoProps; L: Layout}> = ({p, L}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const pages: {words: AppPromoProps["captions"]; start: number; end: number}[] = [];
  let cur: AppPromoProps["captions"] = [];
  p.captions.forEach((w, i) => {
    const prev = p.captions[i - 1];
    if (cur.length && (cur.length >= 3 || (prev && w.start - prev.end > 0.45) || /[.!?:;,—]$/.test(prev?.text || ""))) {
      pages.push({words: cur, start: cur[0].start, end: cur[cur.length - 1].end});
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) pages.push({words: cur, start: cur[0].start, end: cur[cur.length - 1].end});
  const pg = pages.find((x) => t >= x.start - 0.05 && t <= x.end + 0.25);
  if (!pg) return null;
  const isH = L.W > L.H;
  const s = spring({frame: frame - Math.round(pg.start * fps), fps, config: theme.motion.snappy});
  return (
    <div style={{position: "absolute", top: L.capY, left: isH ? L.capX : 0, width: isH ? L.textW : L.W, display: "flex", justifyContent: isH ? "flex-start" : "center", pointerEvents: "none"}}>
      <div style={{padding: "12px 26px", borderRadius: 22, background: "rgba(255,255,255,0.84)", backdropFilter: "blur(12px)", boxShadow: "0 10px 28px rgba(20,30,60,0.14)",
        fontFamily: body.fontFamily, fontWeight: 700, fontSize: L.capSize, color: C.text, opacity: Math.min(1, s * 1.5), translate: `0 ${(1 - s) * 16}px`}}>
        {pg.words.map((w, i) => (
          <span key={i} style={{color: t >= w.start && t < w.end + 0.08 ? C.accent : C.text, marginRight: i < pg.words.length - 1 ? "0.28em" : 0}}>{w.text.replace(/[«»"]/g, "")}</span>
        ))}
      </div>
    </div>
  );
};

// ---------- хаос поездки (первая сцена) ----------
const ICONS: Record<string, string> = {
  plane: "M2 16l20-8-20-8 4 8-4 8zm4-8h10",
  card: "M3 6h18v12H3zM7 10h6M7 14h4",
  pin: "M12 21s-6-6.2-6-11a6 6 0 0112 0c0 4.8-6 11-6 11zm0-8a3 3 0 100-6 3 3 0 000 6z",
  bus: "M5 4h14v12H5zM5 11h14M7 19v-3M17 19v-3M8 14h.01M16 14h.01",
  yuan: "M7 4l5 7 5-7M12 11v9M8 13h8M8 17h8",
  chat: "M4 5h16v11H9l-5 4z",
  doc: "M6 3h9l4 4v14H6zM9 12h6M9 16h6",
  cal: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  bed: "M3 18V7M3 13h18v5M7 13V10h6v3",
  phone: "M8 3h8v18H8zM11 18h2",
  cam: "M4 8h4l2-3h4l2 3h4v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
};
const TILES = Object.keys(ICONS).map((k, i) => {
  const ang = (i / 12) * Math.PI * 2 + 0.4;
  const rad = 0.3 + ((i * 37) % 10) / 40;
  return {k, ang, rad, z: ((i * 53) % 10) / 10, rot: ((i * 29) % 40) - 20, born: (i % 6) * 0.22 + Math.floor(i / 6) * 0.15};
});
const Chaos: React.FC<{b: Beat; L: Layout; dur: number; collapseAt?: number}> = ({b, L, dur, collapseAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cx = L.W / 2, cy = L.H * (L.W > L.H ? 0.5 : 0.46);
  const unit = Math.min(L.W, L.H);
  const col = collapseAt !== undefined ? interpolate(t, [collapseAt, collapseAt + 0.55], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)}) : 0;
  return (
    <AbsoluteFill>
      {TILES.map((tl, i) => {
        const s = spring({frame: frame - Math.round(tl.born * fps), fps, config: {damping: 14, stiffness: 120}});
        const drift = t * 0.25 + i;
        const r = unit * tl.rad * (L.W > L.H ? 1.25 : 1.05) * (1 - col);
        const x = cx + Math.cos(tl.ang + Math.sin(drift) * 0.08) * r * (L.W > L.H ? 1.5 : 1);
        const y = cy + Math.sin(tl.ang + Math.cos(drift) * 0.08) * r * 1.1;
        const size = (80 + tl.z * 60) * (L.W > L.H ? 1 : 1.25) * (1 - col * 0.7);
        return (
          <div key={tl.k} style={{position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size * 0.26,
            background: C.surface, boxShadow: "0 18px 40px rgba(20,30,60,0.16)", display: "flex", alignItems: "center", justifyContent: "center",
            opacity: s * (1 - col), scale: String(0.4 + 0.6 * s), rotate: `${tl.rot + Math.sin(drift * 1.3) * 6}deg`}}>
            <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24"><path d={ICONS[tl.k]} fill="none" stroke={C.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        );
      })}
      {(b.bigWords || []).map((w, i) => {
        const at = Math.round((w.at - b.w0) * fps);
        const next = b.bigWords![i + 1] ? Math.round((b.bigWords![i + 1].at - b.w0) * fps) : Math.round(dur);
        if (frame < at - 1 || frame > next + 8) return null;
        const s = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 170, mass: 0.8}});
        const gone = collapseAt !== undefined ? Math.round(collapseAt * fps) - 6 : 1e9;
        const o = interpolate(frame, [Math.min(next, gone) - 2, Math.min(next, gone) + 6], [1, 0], clamp);
        const up = interpolate(frame, [next - 2, next + 6], [0, -60], clamp);
        return (
          <div key={i} style={{position: "absolute", left: 0, width: L.W, top: cy - unit * 0.09, textAlign: "center", fontFamily: display.fontFamily, fontWeight: 700,
            fontSize: L.W > L.H ? 110 : 104, color: C.text, opacity: s * o, translate: `0 ${(1 - s) * 50 + up}px`, scale: String(0.85 + 0.15 * s), padding: "0 40px", boxSizing: "border-box", lineHeight: 1.05}}>
            {w.text.split(" ").map((x, j) => <span key={j} style={{color: j === 0 ? C.accent : C.text}}>{x}{" "}</span>)}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- три экрана ----------
const Three: React.FC<{b: Beat; L: Layout; p: AppPromoProps}> = ({b, L, p}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const isH = L.W > L.H;
  const w = isH ? 300 : 262;
  const srcs = b.threeOrder || ["today.png", "coord.png", "1-visit.png"];
  const gap = isH ? 120 : 22;
  const total = w * 3 + gap * 2 + w * 0.07 * 6;
  const y0 = isH ? 290 : 600;
  return (
    <AbsoluteFill>
      {(b.bigWords || []).map((bw, i) => {
        const at = Math.round((0.15 + i * 0.22) * fps);
        const s = spring({frame: frame - at, fps, config: {damping: 14, stiffness: 160}});
        const said = Math.round((bw.at - b.w0) * fps) - 2;
        const lift = spring({frame: frame - said, fps, config: {damping: 12, stiffness: 170}});
        const next = b.bigWords![i + 1] ? Math.round((b.bigWords![i + 1].at - b.w0) * fps) - 2 : 1e9;
        const on = frame >= said && frame < next ? 1 : frame >= next ? 0.35 : 0;
        const x = (L.W - total) / 2 + i * (w * 1.07 + gap);
        return (
          <div key={i} style={{position: "absolute", left: x, top: y0 + (i === 1 ? -30 : 20) - 40 * lift * on, opacity: s, translate: `0 ${(1 - s) * 120}px`, rotate: `${(i - 1) * 4 * (1 - s * 0.6)}deg`, scale: String(1 + 0.05 * lift * on)}}>
            <Phone w={w} shadow={0.7}>
              <Img src={staticFile(`${p.stills}/${srcs[i]}`)} style={{width: "100%", height: srcs[i].includes("visit") ? "auto" : "100%", objectFit: "cover"}} />
            </Phone>
            <div style={{marginTop: 26, textAlign: "center", fontFamily: body.fontFamily, fontWeight: 700, fontSize: isH ? 32 : 30, color: on === 1 ? C.accent : C.text, opacity: frame >= said ? 1 : 0.5}}>{bw.text}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- счётчик программ ----------
const Counter: React.FC<{b: Beat; L: Layout}> = ({b, L}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = b.counter!;
  const isH = L.W > L.H;
  const at = Math.round((c.at - b.w0) * fps) - 2;
  const k = interpolate(frame, [at, at + Math.round(1.2 * fps)], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const s = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 150}});
  const sub = spring({frame: frame - Math.round((c.subAt - b.w0) * fps) + 2, fps, config: {damping: 12, stiffness: 180}});
  const left = isH ? L.textX : 0;
  return (
    <div style={{position: "absolute", left, top: isH ? 260 : 300, width: isH ? L.textW : L.W, textAlign: isH ? "left" : "center", opacity: frame >= at ? 1 : 0}}>
      <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 230, lineHeight: 1, color: C.accent, scale: String(0.8 + 0.2 * s), transformOrigin: isH ? "left center" : "center"}}>{Math.round(c.value * k)}</div>
      <div style={{fontFamily: body.fontFamily, fontSize: 48, color: C.muted, marginTop: 6}}>{c.label}</div>
      <div style={{display: "inline-block", marginTop: 26, padding: "14px 30px", borderRadius: 999, background: C.text, color: "white", fontFamily: body.fontFamily, fontWeight: 700, fontSize: 40,
        opacity: sub, scale: String(0.7 + 0.3 * sub)}}>{c.sub}</div>
    </div>
  );
};

// ---------- финал: плашка CTA ----------
const Cta: React.FC<{b: Beat; L: Layout}> = ({b, L}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const at = Math.round((b.end - b.w0 - 0.6) * fps);
  const s = spring({frame: frame - at, fps, config: theme.motion.snappy});
  const isH = L.W > L.H;
  return (
    <div style={{position: "absolute", right: isH ? undefined : 64, left: isH ? L.textX : undefined, top: isH ? 700 : 1500, opacity: s, translate: `${(1 - s) * 80}px ${(1 - s) * 60}px`,
      padding: "22px 36px", borderRadius: 26, background: C.accent, color: "white", fontFamily: body.fontFamily, fontWeight: 700, fontSize: isH ? 40 : 44,
      boxShadow: "0 20px 50px rgba(37,99,235,0.35)"}}>
      {b.cta}
    </div>
  );
};


// ---------- хаос чатов: уведомления мессенджеров сыплются на экран ----------
const NETS = {
  tg: {color: "#2AABEE", name: "Telegram", logo: "source-videos/логотипы/общие/telegram.svg", icon: "M3 11.5l17-7-3 15-5.5-4-3 3v-4.5l8.5-7.5-10.5 6z"},
  wx: {color: "#07C160", name: "WeChat", logo: "source-videos/логотипы/общие/wechat.png", icon: "M9 5C5 5 2 7.6 2 10.8c0 1.8 1 3.4 2.6 4.5L4 18l3-1.6c.6.2 1.3.3 2 .3M14.5 9c3.3 0 6 2.2 6 5s-2.7 5-6 5c-.6 0-1.2-.1-1.8-.2L10 20l.6-2.3c-1.3-.9-2.1-2.3-2.1-3.7 0-2.8 2.7-5 6-5z"},
  wa: {color: "#25D366", name: "WhatsApp", logo: "source-videos/логотипы/общие/whatsapp.svg", icon: "M12 3a9 9 0 00-7.8 13.5L3 21l4.6-1.2A9 9 0 1012 3zm-3 5c.3 0 .6 0 .8.6l.8 1.9c.1.3 0 .6-.2.8l-.6.7c.6 1.2 1.6 2.2 2.8 2.8l.7-.6c.2-.2.5-.3.8-.2l1.9.8c.5.2.6.5.6.8 0 1.2-1 2.1-2.2 2.1-3.6 0-7.4-3.8-7.4-7.4C7 9 7.8 8 9 8z"},
} as const;
const CHATS: {net: keyof typeof NETS; who: string; text: string}[] = [
  {net: "tg", who: "GTT Пекин · делегация", text: "Где встречаемся утром?"},
  {net: "wx", who: "接待 · JD.com", text: "明天几点到？"},
  {net: "tg", who: "GTT Пекин · организаторы", text: "Скиньте адрес отеля по-китайски"},
  {net: "wa", who: "Трансфер", text: "Водитель у выхода B"},
  {net: "tg", who: "Ужин в среду", text: "Кто идёт на хого? 🙋"},
  {net: "wx", who: "盒马 · Hema", text: "请发参观名单"},
  {net: "tg", who: "GTT Пекин · делегация", text: "Во сколько автобус???"},
  {net: "wa", who: "Гид Ли Мэй", text: "Я в лобби"},
  {net: "tg", who: "Чеки для бухгалтерии", text: "Пришлите фото чеков до пятницы"},
  {net: "tg", who: "GTT Пекин · делегация", text: "А где презентация JD?"},
  {net: "wx", who: "司机 · Водитель", text: "到了，在门口"},
  {net: "tg", who: "GTT Пекин · делегация", text: "Кто-нибудь видел программу на завтра?"},
  {net: "wa", who: "Отель Ванфуцзин", text: "Check-out until 12:00"},
  {net: "tg", who: "GTT Пекин · делегация", text: "Я потерялся 😅"},
  {net: "wx", who: "美团 · Meituan", text: "会议改到15:30"},
  {net: "tg", who: "GTT Пекин · делегация", text: "Перешлите ещё раз адрес"},
];
export const chatTimes = (b0: number, dur: number) => CHATS.map((_, i) => b0 + 0.15 + Math.pow(i / CHATS.length, 0.8) * (dur - 0.9));
const Chats: React.FC<{beats: Beat[]; L: Layout; dur: number; collapseAt: number}> = ({beats, L, dur, collapseAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const isH = L.W > L.H;
  const b0 = beats[0].w0;
  const times = chatTimes(0, collapseAt);
  const col = interpolate(t, [collapseAt, collapseAt + 0.5], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const W = isH ? 620 : 860, H = isH ? 104 : 128;
  const cx = L.W / 2, top = isH ? 300 : 560;
  const big = beats.flatMap((b) => b.bigWords || []);
  // v3: эмодзи «взрыв мозга» на слове + чаты трясутся («закипает мозг»)
  const emo = beats.map((b) => b.emoji).find(Boolean);
  const emoF = emo ? Math.round((emo.at - b0) * fps) : 1e9;
  const shakeK = frame >= emoF ? interpolate(frame, [emoF, emoF + 24], [1, 0], clamp) * (1 - col) : 0;
  const shakeX = Math.sin(frame * 2.3) * 14 * shakeK, shakeY = Math.cos(frame * 3.1) * 8 * shakeK;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{translate: `${shakeX}px ${shakeY}px`}}>
      {CHATS.map((c, i) => {
        const at = Math.round(times[i] * fps);
        if (frame < at) return null;
        const s = spring({frame: frame - at, fps, config: {damping: 15, stiffness: 200, mass: 0.7}});
        const newer = times.filter((x, j) => j > i && x <= t).length; // сколько пришло после — столько раз сдвинулось вниз
        const lane = isH ? (i % 2 ? 1 : -1) * (180 + (i % 3) * 40) : ((i * 37) % 5 - 2) * 26;
        const y = top + newer * (H * 0.62) + (1 - s) * -140;
        const x = cx - W / 2 + lane * (1 - col);
        const fade = interpolate(newer, [5, 9], [1, 0.25], clamp);
        const rot = ((i * 53) % 9 - 4) * 0.8;
        const n = NETS[c.net];
        const sx = cx - (x + W / 2), sy = (isH ? 540 : 1100) - (y + H / 2);
        return (
          <div key={i} style={{position: "absolute", left: x + sx * col, top: y + sy * col, width: W, height: H, borderRadius: H * 0.28, background: "rgba(255,255,255,0.94)",
            boxShadow: "0 16px 40px rgba(20,30,60,0.18)", display: "flex", alignItems: "center", gap: 18, padding: "0 22px", boxSizing: "border-box",
            opacity: s * fade * (1 - col), scale: String((0.85 + 0.15 * s) * (1 - 0.6 * col)), rotate: `${rot}deg`, zIndex: i}}>
            {/* v3: настоящие логотипы мессенджеров */}
            <div style={{width: H * 0.62, height: H * 0.62, borderRadius: H * 0.18, background: "white", border: `2px solid ${n.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0}}>
              <Img src={staticFile(n.logo)} style={{width: H * 0.46, height: H * 0.46, objectFit: "contain"}} />
            </div>
            <div style={{display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1}}>
              <div style={{display: "flex", justifyContent: "space-between", fontFamily: body.fontFamily, fontSize: isH ? 20 : 24, color: C.muted}}>
                <span style={{fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{c.who}</span>
                <span style={{marginLeft: 12, whiteSpace: "nowrap"}}>{n.name} · сейчас</span>
              </div>
              <div style={{fontFamily: body.fontFamily, fontSize: isH ? 25 : 31, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{c.text}</div>
            </div>
            <div style={{position: "absolute", right: -10, top: -10, minWidth: 40, height: 40, borderRadius: 20, background: "#E5484D", color: "white", fontFamily: body.fontFamily,
              fontWeight: 700, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px"}}>{Math.min(99, 3 + i * 7)}{i > 11 ? "+" : ""}</div>
          </div>
        );
      })}
      </AbsoluteFill>
      {emo && frame >= emoF - 1 ? (() => {
        const s = spring({frame: frame - emoF, fps, config: {damping: 9, stiffness: 160, mass: 0.8}});
        const gone = interpolate(t, [collapseAt - 0.2, collapseAt + 0.25], [1, 0], clamp);
        const size = isH ? 240 : 300;
        return (
          <div style={{position: "absolute", left: isH ? 1500 : 690, top: isH ? 600 : 1150, width: size, height: size, translate: "-50% -50%", zIndex: 60,
            scale: String((0.3 + 0.7 * s) * (1 + 0.04 * Math.sin(frame * 0.9))), rotate: `${Math.sin(frame * 0.7) * 8}deg`, opacity: Math.min(1, s * 1.5) * gone,
            filter: "drop-shadow(0 18px 30px rgba(20,30,60,0.28))"}}>
            <AnimatedImage src={staticFile(emo.src)} width={size} height={size} fit="contain" style={{width: size, height: size}} />
          </div>
        );
      })() : null}
      {big.map((w, i) => {
        const at = Math.round((w.at - b0) * fps);
        const next = big[i + 1] ? Math.round((big[i + 1].at - b0) * fps) : Math.round(collapseAt * fps);
        if (frame < at - 1 || frame > next + 8) return null;
        const s = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 170, mass: 0.8}});
        const o = interpolate(frame, [next - 2, next + 6], [1, 0], clamp);
        return (
          <div key={`b${i}`} style={{position: "absolute", left: 0, width: L.W, top: isH ? 120 : 270, textAlign: "center", fontFamily: display.fontFamily, fontWeight: 700,
            fontSize: isH ? 96 : 92, lineHeight: 1.05, color: C.text, opacity: s * o, translate: `0 ${(1 - s) * 50}px`, scale: String(0.85 + 0.15 * s), padding: "0 48px", boxSizing: "border-box", zIndex: 50}}>
            {w.text.split(" ").map((x, j) => <span key={j} style={{color: j === 0 ? C.accent : C.text}}>{x}{" "}</span>)}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- орбита интеграций вокруг телефона ----------
const ORB_ICONS: Record<string, string> = {
  cal: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5", pin: "M12 21s-6-6.2-6-11a6 6 0 0112 0c0 4.8-6 11-6 11zm0-8a3 3 0 100-6 3 3 0 000 6z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", bag: "M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2",
  table: "M4 5h16v14H4zM4 10h16M4 15h16M10 5v14", users: "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 100-5M21 19c0-2.6-1.6-4.6-4-5.3",
  chat: "M4 5h16v11H9l-5 4z",
};
const Orbit: React.FC<{b: Beat; L: Layout; center: {x: number; y: number}; rx: number; ry: number}> = ({b, L, center, rx, ry}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const items = b.orbit || [];
  const isH = L.W > L.H;
  return (
    <AbsoluteFill>
      <svg width={L.W} height={L.H} style={{position: "absolute", inset: 0}}>
        <ellipse cx={center.x} cy={center.y} rx={rx} ry={ry} fill="none" stroke="rgba(37,99,235,0.25)" strokeWidth={3} strokeDasharray="10 14"
          opacity={interpolate(frame, [0, 12], [0, 1], clamp)} />
      </svg>
      {items.map((o, i) => {
        const at = Math.round((o.at - b.w0) * fps) - 2;
        if (frame < at) return null;
        const s = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 180, mass: 0.7}});
        const ang = (-90 + i * (360 / items.length)) * Math.PI / 180 + t * 0.12;
        const x = center.x + Math.cos(ang) * rx * (0.6 + 0.4 * s), y = center.y + Math.sin(ang) * ry * (0.6 + 0.4 * s);
        const box = isH ? 56 : 64;
        // v3: по пунктиру бегут «данные» от телефона к сервису
        const flow = ((t * 0.9 + i * 0.37) % 1);
        const dx = center.x + (x - center.x) * flow, dy = center.y + (y - center.y) * flow;
        const textLogo = o.logo?.startsWith("text:");
        return (
          <React.Fragment key={i}>
            <svg width={L.W} height={L.H} style={{position: "absolute", inset: 0, pointerEvents: "none"}}>
              <line x1={center.x} y1={center.y} x2={x} y2={y} stroke="rgba(37,99,235,0.35)" strokeWidth={2.5} strokeDasharray="6 8" opacity={s} />
              <circle cx={dx} cy={dy} r={6} fill={C.accent} opacity={s * Math.sin(flow * Math.PI)} />
            </svg>
            <div style={{position: "absolute", left: x, top: y, translate: "-50% -50%", display: "flex", alignItems: "center", gap: 12, padding: isH ? "10px 22px 10px 10px" : "10px 24px 10px 10px",
              borderRadius: 999, background: "rgba(255,255,255,0.96)", boxShadow: "0 14px 34px rgba(20,30,60,0.18)", opacity: s, scale: String(0.6 + 0.4 * s)}}>
              <div style={{width: box, height: box, borderRadius: 16, background: o.logo && !textLogo ? "white" : C.accent, border: o.logo && !textLogo ? `2px solid ${C.line}` : "none",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"}}>
                {o.logo && !textLogo ? <Img src={staticFile(o.logo)} style={{width: box * 0.74, height: box * 0.74, objectFit: "contain"}} />
                  : textLogo ? <span style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: box * 0.42, color: "white"}}>{(o.sub || o.text).slice(0, 1)}</span>
                  : <svg width={box * 0.55} height={box * 0.55} viewBox="0 0 24 24"><path d={ORB_ICONS[o.icon || "chat"] || ORB_ICONS.chat} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <div style={{display: "flex", flexDirection: "column", lineHeight: 1.05}}>
                <span style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: isH ? 28 : 32, color: C.text, whiteSpace: "nowrap"}}>{o.text}</span>
                {o.sub ? <span style={{fontFamily: body.fontFamily, fontSize: isH ? 18 : 20, color: C.muted, whiteSpace: "nowrap"}}>{o.sub}</span> : null}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- чеки слетаются в единый отчёт ----------
const RECEIPTS = [
  {img: "chek-taksi.jpg", note: "Такси DiDi: отель → JD.com", cny: 86, rub: "1 038", fx: ["1 038 ₽", "$12", "€11", "5 900 ₸"]},
  {img: "chek-obed.jpg", note: "Обед с партнёрами", cny: 268, rub: "3 235", fx: ["3 235 ₽", "$37", "€34", "18 400 ₸"]},
  {img: "chek-svyaz.jpg", note: "Связь, пакет на 7 дней", cny: 120, rub: "1 448", fx: ["1 448 ₽", "$17", "€15", "8 200 ₸"]},
];
// v3 (пометка пользователя: «суммы фиксируются в любой выбранной валюте») — демо-суммы, перебор валют на слове «валюте»
const CUR = ["₽", "$", "€", "₸"];
const TOTALS = ["5 721 ₽", "$66", "€60", "32 500 ₸"];
const Receipts: React.FC<{b: Beat; L: Layout; from: {x: number; y: number}; imgDir: string}> = ({b, L, from, imgDir}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const isH = L.W > L.H;
  const r = b.report || {};
  const f = (s?: number, d = 0) => (s === undefined ? 1e9 : Math.round((s - b.w0 + d) * fps));
  const card = isH ? {x: 150, y: 500, w: 700, h: 420} : {x: 64, y: 560, w: 650, h: 580};
  const rowH = isH ? 80 : 104;
  const cardIn = spring({frame: frame - f(r.at, -0.3), fps, config: theme.motion.snappy});
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 190, mass: 0.7}});
  const done = pop(f(r.done, -0.05));
  // валюта: от слова «валюте» каждые 0,4 с следующая, на 5-м шаге снова рубли
  const curI = frame < f(r.rub) ? 0 : Math.min(4, Math.floor((frame - f(r.rub)) / Math.round(0.4 * fps))) % 4;
  const timeS = pop(f(r.time, -0.05));
  return (
    <AbsoluteFill>
      {/* отчёт */}
      <div style={{position: "absolute", left: card.x, top: card.y, width: card.w, height: card.h, borderRadius: 28, background: C.surface, boxShadow: "0 24px 60px rgba(20,30,60,0.18)",
        opacity: cardIn, translate: `0 ${(1 - cardIn) * 60}px`, padding: "26px 30px", boxSizing: "border-box"}}>
        <div style={{fontFamily: mono.fontFamily, fontSize: isH ? 20 : 22, letterSpacing: "0.12em", color: C.accent}}>ОТЧЁТ О РАСХОДАХ</div>
        <div style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: isH ? 28 : 32, color: C.text, marginTop: 6}}>Новый ритейл Китая · 9–14 ноября</div>
        <div style={{position: "absolute", left: 30, right: 30, top: isH ? 108 : 122, borderTop: `2px solid ${C.line}`}} />
        {RECEIPTS.map((rc, i) => {
          const land = f(r.at, 0.55 + i * 0.4);
          const sIn = pop(land);
          return (
            <div key={i} style={{position: "absolute", left: 30, right: 30, top: (isH ? 124 : 140) + i * rowH, height: rowH - 12, display: "flex", alignItems: "center", gap: 16, opacity: sIn, translate: `${(1 - sIn) * 30}px 0`}}>
              <Img src={staticFile(`${imgDir}/${rc.img}`)} style={{width: rowH * 0.62, height: rowH * 0.8, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.line}`}} />
              <div style={{flex: 1, fontFamily: body.fontFamily, fontSize: isH ? 24 : 27, color: C.text}}>{rc.note}</div>
              <div style={{textAlign: "right", fontFamily: body.fontFamily}}>
                <div style={{fontWeight: 700, fontSize: isH ? 26 : 29, color: C.text}}>¥{rc.cny}</div>
                <div style={{fontSize: isH ? 21 : 23, color: frame >= f(r.rub) ? C.accent : C.muted, opacity: frame >= f(r.excel, -0.1) ? 1 : 0}}>≈ {rc.fx[curI]}</div>
              </div>
            </div>
          );
        })}
        <div style={{position: "absolute", left: 30, right: 30, bottom: 24, display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: body.fontFamily,
          opacity: frame >= f(r.excel, -0.1) ? 1 : 0}}>
          <span style={{display: "flex", gap: 8}}>
            {CUR.map((c, j) => (
              <span key={c} style={{width: isH ? 38 : 44, height: isH ? 38 : 44, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                fontSize: isH ? 22 : 25, background: j === curI && frame >= f(r.rub) ? C.accent : C.primary, color: j === curI && frame >= f(r.rub) ? "white" : C.muted,
                scale: String(j === curI && frame >= f(r.rub) ? 1.12 : 1)}}>{c}</span>
            ))}
          </span>
          <span style={{fontWeight: 700, fontSize: isH ? 32 : 36, color: C.text}}>Итого {TOTALS[curI]}</span>
        </div>
        {/* форматы */}
        {[{t: "XLSX", c: "#1D7A45", at: f(r.excel, -0.05)}, {t: "PDF", c: "#D93636", at: f(r.pdf, -0.05)}].map((x, i) => {
          const s = pop(x.at);
          return frame >= x.at ? (
            <div key={x.t} style={{position: "absolute", right: 24 + i * 106, top: -34, width: 96, height: 72, borderRadius: 16, background: x.c, color: "white", display: "flex", alignItems: "center",
              justifyContent: "center", fontFamily: body.fontFamily, fontWeight: 700, fontSize: 26, boxShadow: "0 12px 26px rgba(20,30,60,0.25)", scale: String(0.5 + 0.5 * s), rotate: `${(1 - s) * -12}deg`}}>{x.t}</div>
          ) : null;
        })}
        {/* штамп */}
        {frame >= f(r.done, -0.05) ? (
          <div style={{position: "absolute", left: "50%", top: "52%", translate: "-50% -50%", rotate: `${-8 + (1 - done) * 20}deg`, scale: String(1.6 - 0.6 * done), opacity: Math.min(1, done * 1.4),
            border: `5px solid ${C.accent}`, borderRadius: 18, padding: "14px 26px", background: "rgba(255,255,255,0.88)", color: C.accent, fontFamily: display.fontFamily, fontWeight: 700,
            fontSize: isH ? 34 : 38, textAlign: "center", lineHeight: 1.15, whiteSpace: "nowrap"}}>
            Бухгалтеру ✓<br /><span style={{fontFamily: body.fontFamily, fontSize: isH ? 24 : 27}}>одним файлом · фото и цифры</span>
          </div>
        ) : null}
        {frame >= f(r.time, -0.05) ? (
          <div style={{position: "absolute", left: "50%", bottom: -34, translate: "-50% 0", padding: "12px 24px", borderRadius: 999, background: C.text, color: "white",
            fontFamily: body.fontFamily, fontWeight: 700, fontSize: isH ? 24 : 28, whiteSpace: "nowrap", opacity: timeS, scale: String(0.6 + 0.4 * timeS)}}>⏱ Без ручной сборки отчётов</div>
        ) : null}
      </div>
      {/* летящие чеки */}
      {RECEIPTS.map((rc, i) => {
        const st = f(r.at, i * 0.4), en = st + Math.round(0.55 * fps);
        if (frame < st || frame > en + 2) return null;
        const k = interpolate(frame, [st, en], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
        const tx = card.x + 30 + rowH * 0.31, ty = card.y + (isH ? 124 : 140) + i * rowH + rowH * 0.4;
        const x = from.x + (tx - from.x) * k, y = from.y + (ty - from.y) * k - Math.sin(k * Math.PI) * 160;
        return (
          <Img key={i} src={staticFile(`${imgDir}/${rc.img}`)} style={{position: "absolute", left: x, top: y, width: 150 - 100 * k, translate: "-50% -50%", rotate: `${(1 - k) * (i - 1) * 14}deg`,
            borderRadius: 8, boxShadow: "0 14px 30px rgba(20,30,60,0.28)"}} />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- майндмэп поездки растёт сам + PDF-отчёт ----------
const LG = "source-videos/логотипы/ритейл/";
// v3 (пометка пользователя: «время, день, компания… при раскладке майндмэпа показывай логотипы компаний»); поездка — демо
const MIND = [
  {name: "JD.com", logo: LG + "jd.svg", day: "День 1", time: "10:00", leaf: "Договорились: презентация до конца ноября", kind: "deals"},
  {name: "Meituan", logo: LG + "meituan.svg", day: "День 1", time: "15:30", leaf: "Курьеров распределяет алгоритм", kind: "companies"},
  {name: "Hema", logo: LG + "hema.png", day: "День 2", time: "11:00", leaf: "Повторная встреча с закупками — декабрь", kind: "next"},
  {name: "Alibaba", logo: "source-videos/логотипы/общие/alibaba.svg", day: "День 3", time: "10:30", leaf: "Следующий шаг: пилот на площадке", kind: "next"},
  {name: "Pinduoduo", logo: LG + "pinduoduo.svg", day: "День 4", time: "14:00", leaf: "Визитки: 3 контакта", kind: "contacts"},
  {name: "Yonghui", logo: LG + "yonghui.png", day: "День 5", time: "09:30", leaf: "Пришлём образцы отделу закупок", kind: "deals"},
] as const;
const MindGrow: React.FC<{b: Beat; L: Layout}> = ({b, L}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const isH = L.W > L.H;
  const m = b.mind || {};
  const f = (s?: number, d = 0) => (s === undefined ? 1e9 : Math.round((s - b.w0 + d) * fps));
  const cx = isH ? 1290 : 540, cy = isH ? 620 : 1110; // v4: ниже, чтобы листья верхних узлов не заходили под PDF
  const rx = isH ? 400 : 330, ry = isH ? 360 : 480;
  const ANG = [-150, 180, 150, -30, 0, 30];
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 12, stiffness: 170, mass: 0.7}});
  const center = pop(f(m.map, -0.2));
  const glow = interpolate(frame, [f(m.auto, -0.1), f(m.auto, 0.4)], [0, 1], clamp);
  const pdf = pop(f(m.report, -0.1));
  return (
    <AbsoluteFill>
      <svg width={L.W} height={L.H} style={{position: "absolute", inset: 0}}>
        {MIND.map((n, i) => {
          const ang = ANG[i] * Math.PI / 180;
          const x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * ry;
          const at = f(m.map, -0.1 + i * 0.12);
          const k = interpolate(frame, [at, at + 10], [0, 1], {...clamp, easing: ease});
          const len = Math.hypot(x - cx, y - cy);
          return (
            <path key={i} d={`M${cx},${cy} Q${(cx + x) / 2},${cy + (y - cy) * 0.2} ${x},${y}`} fill="none" stroke={C.accent} strokeOpacity={0.55 + 0.45 * glow}
              strokeWidth={isH ? 4 : 5} strokeDasharray={len * 1.2} strokeDashoffset={len * 1.2 * (1 - k)} strokeLinecap="round" />
          );
        })}
      </svg>
      {MIND.map((n, i) => {
        const ang = ANG[i] * Math.PI / 180;
        const x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * ry;
        // логотипы появляются вместе с раскладкой карты, на «компания» — вспыхивают
        const s = pop(f(m.map, 0.1 + i * 0.12));
        const hl = interpolate(frame, [f(m.companies, i * 0.08), f(m.companies, i * 0.08 + 0.25), f(m.companies, i * 0.08 + 0.6)], [0, 1, 0], clamp);
        const leafAt = f((m as Record<string, number | undefined>)[n.kind], 0.05 + (i % 2) * 0.15);
        const ls = pop(leafAt);
        const ts = pop(f(m.time, i * 0.06)), ds = pop(f(m.day, i * 0.06));
        const below = Math.sin(ang) > -0.2;
        return (
          <React.Fragment key={i}>
            <div style={{position: "absolute", left: x, top: y, translate: "-50% -50%", width: isH ? 210 : 220, height: isH ? 78 : 86, borderRadius: 22, background: C.surface,
              border: `3px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: s, scale: String((0.6 + 0.4 * s) * (1 + 0.1 * hl)),
              boxShadow: `0 12px 30px rgba(37,99,235,${0.15 + 0.25 * glow + 0.3 * hl})`}}>
              <Img src={staticFile(n.logo)} style={{maxWidth: "76%", maxHeight: "56%", objectFit: "contain"}} />
              {/* время и день визита — маленькие чипы над логотипом */}
              <div style={{position: "absolute", left: "50%", top: -26, translate: "-50% 0", display: "flex", gap: 6, whiteSpace: "nowrap"}}>
                {frame >= f(m.day, i * 0.06) ? <span style={{padding: "4px 10px", borderRadius: 999, background: C.accent, color: "white", fontFamily: mono.fontFamily, fontSize: isH ? 17 : 19,
                  opacity: ds, scale: String(0.6 + 0.4 * ds)}}>{n.day}</span> : null}
                {frame >= f(m.time, i * 0.06) ? <span style={{padding: "4px 10px", borderRadius: 999, background: C.text, color: "white", fontFamily: mono.fontFamily, fontSize: isH ? 17 : 19,
                  opacity: ts, scale: String(0.6 + 0.4 * ts)}}>{n.time}</span> : null}
              </div>
            </div>
            {frame >= leafAt ? (
              <div style={{position: "absolute", left: x, top: y + (below ? (isH ? 84 : 94) : -(isH ? 104 : 116)), translate: "-50% -50%", maxWidth: isH ? 330 : 300, padding: "10px 16px", borderRadius: 14,
                background: "rgba(255,255,255,0.92)", boxShadow: "0 8px 20px rgba(20,30,60,0.12)", fontFamily: body.fontFamily, fontSize: isH ? 21 : 24, lineHeight: 1.25, color: C.text,
                textAlign: "center", opacity: ls, scale: String(0.7 + 0.3 * ls)}}>{n.leaf}</div>
            ) : null}
          </React.Fragment>
        );
      })}
      <div style={{position: "absolute", left: cx, top: cy, translate: "-50% -50%", padding: isH ? "20px 32px" : "24px 34px", borderRadius: 28, background: C.accent, color: "white",
        fontFamily: display.fontFamily, fontWeight: 700, fontSize: isH ? 34 : 38, textAlign: "center", lineHeight: 1.15, opacity: center, scale: String(0.6 + 0.4 * center),
        boxShadow: `0 18px 44px rgba(37,99,235,${0.35 + 0.3 * glow})`}}>
        Новый ритейл<br />Китая
        <div style={{fontFamily: body.fontFamily, fontWeight: 400, fontSize: isH ? 22 : 24, opacity: 0.9, marginTop: 6}}>{glow > 0.5 ? "собирается автоматически ✓" : "6 дней · 9 компаний"}</div>
      </div>
      {/* PDF-отчёт */}
      <div style={{position: "absolute", left: isH ? 150 : 72, top: isH ? 640 : 515, opacity: pdf, translate: `${(1 - pdf) * -60}px 0`, display: "flex", alignItems: "center", gap: 18}}>
        <div style={{position: "relative", width: isH ? 120 : 110, height: isH ? 150 : 140}}>
          {[2, 1, 0].map((j) => (
            <div key={j} style={{position: "absolute", inset: 0, borderRadius: 10, background: C.surface, border: `2px solid ${C.line}`, boxShadow: "0 10px 24px rgba(20,30,60,0.15)",
              rotate: `${(j - 1) * 7 * pdf}deg`, translate: `${j * 8 * pdf}px ${-j * 4 * pdf}px`}}>
              {j === 0 ? <div style={{position: "absolute", left: 10, bottom: 12, padding: "4px 10px", borderRadius: 6, background: "#D93636", color: "white", fontFamily: body.fontFamily, fontWeight: 700, fontSize: 20}}>PDF</div> : null}
            </div>
          ))}
        </div>
        <div style={{fontFamily: body.fontFamily, color: C.text}}>
          <div style={{fontWeight: 700, fontSize: isH ? 30 : 32}}>Итоги поездки.pdf</div>
          <div style={{fontSize: isH ? 23 : 25, color: C.muted}}>компании · заметки · контакты · карта</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- v3: переходы между сценами (решение пользователя 02.11.2026: «интересные и необычные переходы») ----------
const TR = 0.32; // половина перехода, с
type TransKind = NonNullable<Beat["trans"]>;
const transAt = (beats: Beat[], t: number): {type: TransKind; k: number; T: number} | null => {
  for (let i = 1; i < beats.length; i++) {
    const T = beats[i].w0, tp = beats[i].trans;
    if (!tp || tp === "none") continue;
    if (t >= T - TR && t < T + TR) return {type: tp, k: (t - (T - TR)) / (2 * TR), T};
  }
  return null;
};
// «камера»: наезд-сквозь, хлёсткий смаз — двигают всю сцену
const camOf = (tr: ReturnType<typeof transAt>) => {
  if (!tr) return {x: 0, s: 1, blur: 0};
  const a = tr.k < 0.5 ? tr.k / 0.5 : (1 - tr.k) / 0.5; // 0 → 1 (на стыке) → 0
  const inn = tr.k < 0.5;
  if (tr.type === "zoom") return {x: 0, s: inn ? 1 + 0.55 * a * a : 1 - 0.22 * a, blur: 16 * a * a};
  if (tr.type === "whip") return {x: (inn ? -1 : 1) * 340 * a * a, s: 1, blur: 20 * a * a};
  return {x: 0, s: 1, blur: 0};
};
const TransOverlay: React.FC<{tr: ReturnType<typeof transAt>; L: Layout}> = ({tr, L}) => {
  if (!tr) return null;
  const {k} = tr;
  const a = k < 0.5 ? k / 0.5 : (1 - k) / 0.5;
  const diag = Math.hypot(L.W, L.H);
  if (tr.type === "flash") {
    return (
      <AbsoluteFill style={{pointerEvents: "none"}}>
        <AbsoluteFill style={{background: "radial-gradient(circle at 50% 45%, rgba(255,255,255,1), rgba(219,234,254,0.85) 55%, rgba(255,255,255,0.6))", opacity: Math.pow(a, 1.6)}} />
        <div style={{position: "absolute", top: -L.H * 0.2, height: L.H * 1.4, width: L.W * 0.35, left: -L.W * 0.4 + k * L.W * 1.5, rotate: "20deg",
          background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(125,211,252,0.55), rgba(255,255,255,0))", opacity: a}} />
      </AbsoluteFill>
    );
  }
  if (tr.type === "iris") {
    const e = Easing.inOut(Easing.cubic);
    const r = k < 0.5 ? e(k / 0.5) * diag * 0.62 : e((k - 0.5) / 0.5) * diag * 0.62;
    const style: React.CSSProperties = k < 0.5
      ? {clipPath: `circle(${r}px at 50% 45%)`}
      : {maskImage: `radial-gradient(circle at 50% 45%, transparent ${r}px, black ${r + 2}px)`, WebkitMaskImage: `radial-gradient(circle at 50% 45%, transparent ${r}px, black ${r + 2}px)`};
    return (
      <AbsoluteFill style={{pointerEvents: "none", background: `radial-gradient(circle at 50% 45%, #3b82f6, ${C.accent} 45%, #1e3a8a)`, ...style}}>
        <div style={{position: "absolute", left: "50%", top: "45%", translate: "-50% -50%", fontFamily: display.fontFamily, fontWeight: 700, fontSize: L.W > L.H ? 120 : 110, color: "white",
          opacity: k < 0.5 ? 0 : 1 - (k - 0.5) / 0.5}}>GTT</div>
      </AbsoluteFill>
    );
  }
  if (tr.type === "shutter") {
    const N = 6;
    return (
      <AbsoluteFill style={{pointerEvents: "none", overflow: "hidden"}}>
        {Array.from({length: N}).map((_, j) => {
          const d = j * 0.05;
          const kk = Math.max(0, Math.min(1, (k - d) / (1 - 0.05 * (N - 1))));
          const e = Easing.inOut(Easing.cubic);
          const y = kk < 0.5 ? -100 + 100 * e(kk / 0.5) : 100 * e((kk - 0.5) / 0.5);
          return <div key={j} style={{position: "absolute", top: 0, bottom: 0, left: `${(j * 100) / N}%`, width: `${100 / N + 0.3}%`, translate: `0 ${y}%`,
            background: j % 2 ? C.accent : "#1d4ed8", boxShadow: "0 0 40px rgba(30,58,138,0.35)"}} />;
        })}
      </AbsoluteFill>
    );
  }
  return null;
};

// ---------- v3: крупное слово за телефоном («текст за объектом») ----------
const AccentWord: React.FC<{text: string; L: Layout; dur: number; cy: number}> = ({text, L, dur, cy}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const isH = L.W > L.H;
  const letters = text.split("");
  const size = Math.min(isH ? 260 : 300, (isH ? 1500 : 1040) / (letters.length * 0.74));
  const out = interpolate(frame, [dur - 10, dur], [1, 0], clamp);
  const drift = interpolate(frame, [0, dur], [-24, 24]);
  return (
    <div style={{position: "absolute", left: 0, width: L.W, top: cy - size * 0.6, textAlign: "center", whiteSpace: "nowrap", opacity: out, translate: `${drift}px 0`}}>
      {letters.map((ch, i) => {
        const s = spring({frame: frame - 2 - i * 2, fps, config: {damping: 14, stiffness: 120, mass: 0.9}});
        return (
          <span key={i} style={{display: "inline-block", fontFamily: display.fontFamily, fontWeight: 700, fontSize: size, lineHeight: 1.2, letterSpacing: "-0.02em",
            color: "rgba(37,99,235,0.11)", WebkitTextStroke: `${isH ? 3.5 : 4}px rgba(37,99,235,0.55)`, opacity: s, translate: `0 ${(1 - s) * 90}px`, rotate: `${(1 - s) * 8}deg`}}>
            {ch === " " ? "\u00a0" : ch}
          </span>
        );
      })}
    </div>
  );
};

// ---------- ролик ----------
export const AppPromo: React.FC<AppPromoProps> = (p) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const L = layoutOf(p.format);
  const isH = p.format === "h";
  const beats = p.beats as Beat[];
  const f = (s: number) => Math.round(s * fps);
  const t = frame / fps;
  const k = L.phoneW / SCREEN_W;

  // поза телефона: переход к позе новой сцены за 0,7 с
  let bi = beats.findIndex((b) => t >= b.w0 && t < b.w1);
  if (bi < 0) bi = t < beats[0].w0 ? 0 : beats.length - 1;
  const prev = poseOf(beats[bi - 1], bi - 1, L), curp = poseOf(beats[bi], bi, L);
  const kk = bi === 0 ? 1 : interpolate(t, [beats[bi].w0, beats[bi].w0 + 0.7], [0, 1], {...clamp, easing: ease});
  const pose = mixPose(prev, curp, kk);
  // переворот телефона на смене роли (делегат → координатор): 0→90° старый экран, −90→0° новый
  const flipAt = beats[bi].flip;
  let flipRy = 0;
  if (flipAt !== undefined) {
    if (t >= flipAt - 0.24 && t < flipAt) flipRy = interpolate(t, [flipAt - 0.24, flipAt], [0, 90], {...clamp, easing: Easing.in(Easing.quad)});
    else if (t >= flipAt && t < flipAt + 0.26) flipRy = interpolate(t, [flipAt, flipAt + 0.26], [-90, 0], {...clamp, easing: Easing.out(Easing.quad)});
  }
  const float = Math.sin(t * 1.1) * 8;
  // v3: переход на стыке сцен — «камера» (наезд-сквозь, смаз), поворот телефона на 360°, оверлеи (вспышка, круг, шторки)
  const tr = transAt(beats, t);
  const cam = camOf(tr);
  const spinRy = tr && tr.type === "spin" ? 360 * Easing.inOut(Easing.cubic)(tr.k) : 0;
  const curB = beats[bi];
  const shine = curB && curB.screen ? interpolate(t, [curB.w0 + 0.2, curB.w0 + 0.85], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "extend"}) : -1;

  // наезд на элемент экрана
  const fz = (p.focus as {at: number; until: number; box: {x: number; y: number; w: number; h: number}}[]).find((z) => t >= z.at - 0.4 && t <= z.until + 0.5);
  let zoom = 1, zx = 0, zy = 0;
  if (fz) {
    const zin = interpolate(t, [fz.at - 0.4, fz.at + 0.1], [0, 1], {...clamp, easing: ease});
    const zout = interpolate(t, [fz.until, fz.until + 0.5], [0, 1], {...clamp, easing: ease});
    const z = zin * (1 - zout);
    const target = Math.min(1.7, 0.9 / Math.max(0.3, fz.box.w));
    zoom = 1 + (target - 1) * z;
    const bxc = (fz.box.x + fz.box.w / 2 - 0.5) * SCREEN_W * k;
    const byc = (fz.box.y + fz.box.h / 2 - 0.5) * SCREEN_H * k;
    zx = -bxc * (zoom - 1) * 1;
    zy = -byc * (zoom - 1) * 1;
  }

  const phoneOuterW = L.phoneW * 1.07;
  const phoneOuterH = SCREEN_H * k + L.phoneW * 0.07;

  // v4: «камера» наезжает в часть экрана телефона (box) или в точку кадра (pt)
  const allZooms = beats.flatMap((b) => b.zooms || []);
  const zr = zoomAt(allZooms, t);
  const zk = zr ? zr.k : 0;
  const floatZ = float * (1 - zk);
  let zs = 1, ztx = 0, zty = 0;
  if (zr) {
    const F = {x: L.W / 2, y: isH ? 560 : 950};
    const params = (z: Zoom, pan: number) => {
      if (z.box) {
        const bx = z.to ? z.box.map((v, i) => v + (z.to![i] - v) * pan) : z.box;
        const bez = Math.round(L.phoneW * 0.035);
        const lx = bez + (bx[0] + bx[2] / 2) * SCREEN_W * k, ly = bez + (bx[1] + bx[3] / 2) * SCREEN_H * k;
        const bw = bx[2] * SCREEN_W * k * pose.s, bh = bx[3] * SCREEN_H * k * pose.s;
        return {x: pose.x + (lx - phoneOuterW / 2) * pose.s, y: pose.y + floatZ + ly * pose.s,
          s: z.scale ?? Math.min(2.2, (isH ? 1500 : 980) / bw, (isH ? 820 : 1050) / bh)};
      }
      return {x: z.pt?.[0] ?? L.W / 2, y: z.pt?.[1] ?? L.H / 2, s: z.scale ?? 1.5};
    };
    let P = params(zr.a, zr.pan);
    if (zr.prev && zr.mix < 1) {
      const Q = params(zr.prev, 1);
      P = {x: Q.x + (P.x - Q.x) * zr.mix, y: Q.y + (P.y - Q.y) * zr.mix, s: Q.s + (P.s - Q.s) * zr.mix};
    }
    zs = 1 + (P.s - 1) * zk;
    const Fx = P.x + (F.x - P.x) * zk, Fy = P.y + (F.y - P.y) * zk;
    ztx = Fx - P.x * zs; zty = Fy - P.y * zs;
  }
  // текущая валюта отчёта (для столбиков расходов)
  const repB = beats.find((b) => b.report && t >= b.w0 && t < b.w1 + 0.5);
  const curNow = repB && repB.report?.rub !== undefined && t >= repB.report.rub ? CUR[Math.min(4, Math.floor((t - repB.report.rub) / 0.4)) % 4] : "₽";
  const allWidgets = beats.flatMap((b) => b.widgets || []);
  const allHooks = beats.flatMap((b) => b.hooks || []);
  // плашка-тройка сверху прячет заголовок сцены
  const topW = allWidgets.find((w) => w.kind === "trio" && (w.y ?? 300) < 700 && t >= w.at - 0.1 && t <= w.until + 0.4);
  const topWK = topW ? interpolate(t, [topW.at - 0.1, topW.at + 0.15, topW.until, topW.until + 0.4], [0, 1, 1, 0], clamp) : 0;
  // в монтаже функций заголовок остаётся (на светлой полосе сверху), подпись наезда — внизу
  const featNow = !!beats[bi]?.feature;
  const textK = featNow ? 1 : 1 - Math.max(zk, topWK) * 0.97;

  // громкость музыки: громче до голоса и в финале
  const firstVoice = beats[0].start, lastVoice = beats[beats.length - 1].end;
  const silentRuns: [number, number][] = [];
  beats.forEach((b) => {
    if (!b.silent) return;
    const last = silentRuns[silentRuns.length - 1];
    if (last && b.w0 - last[1] < 0.3) last[1] = b.w1; else silentRuns.push([b.w0 + 0.25, b.w1]);
  });
  const musicVol = (fr: number) => {
    const s = fr / fps;
    const base0 = p.musicVolume ?? 0.13;
    // v4: в сценах без голоса (монтаж функций) музыка громче
    const sil = silentRuns.find((r) => s >= r[0] - 0.2 && s <= r[1] + 0.2);
    const base = sil ? base0 + (0.34 - base0) * interpolate(s, [sil[0] - 0.2, sil[0] + 0.15, sil[1] - 0.15, sil[1] + 0.2], [0, 1, 1, 0], clamp) : base0;
    if (s < firstVoice - 0.3) return 0.42;
    if (s < firstVoice) return interpolate(s, [firstVoice - 0.3, firstVoice], [0.42, base]);
    if (s > lastVoice + 0.2) return interpolate(s, [lastVoice + 0.2, lastVoice + 0.8, p.total - 0.6, p.total], [base, 0.4, 0.4, 0], clamp);
    return base;
  };

  return (
    <AbsoluteFill style={{backgroundColor: C.primary}}>
      <Stage L={L} />
      <AbsoluteFill style={{scale: String(cam.s), translate: `${cam.x}px 0`, filter: cam.blur > 0.3 ? `blur(${cam.blur.toFixed(1)}px)` : undefined}}>

      {/* v3: крупное слово за телефоном */}
      {beats.map((b) => {
        if (!b.accent) return null;
        const from = f(b.w0);
        const dur = f(b.w1) - from;
        const pz = poseOf(b, beats.indexOf(b), L);
        const cy = pz.y + (SCREEN_H * k + L.phoneW * 0.07) * pz.s * (isH ? 0.5 : 0.42);
        return (
          <Sequence key={`acc-${b.id}`} from={from} durationInFrames={dur} premountFor={fps} name={`Слово ${b.accent}`}>
            <AbsoluteFill style={{opacity: 1 - zk}}><AccentWord text={b.accent} L={L} dur={dur} cy={cy} /></AbsoluteFill>
          </Sequence>
        );
      })}

      {/* v4: всё, что под «камерой» наезда, — особые сцены и телефон */}
      <AbsoluteFill style={{transform: `translate(${ztx}px, ${zty}px) scale(${zs})`, transformOrigin: "0 0"}}>
      {/* особые сцены под телефоном */}
      {beats.map((b) => {
        if (!["chaos", "three", "counter", "chats", "orbit", "receipts", "mindgrow", "countries"].includes(b.visual)) return null;
        const bi2 = beats.indexOf(b);
        if (b.visual === "chats" && beats[bi2 - 1]?.visual === "chats") return null; // чаты рисуются одной сценой
        let last = b;
        if (b.visual === "chats") for (let j = bi2 + 1; beats[j]?.visual === "chats"; j++) last = beats[j];
        const from = f(b.w0);
        const dur = f(last.w1) - from + (b.visual === "chaos" || b.visual === "chats" ? f(0.7) : f(0.3));
        const pz = poseOf(b, bi2, L);
        const phoneH = (SCREEN_H * k + L.phoneW * 0.07) * pz.s;
        const pc = {x: pz.x, y: pz.y + phoneH / 2};
        return (
          <Sequence key={`u-${b.id}`} from={from} durationInFrames={dur} premountFor={fps} name={`Сцена ${b.id} · ${b.part}`}>
            {b.visual === "chaos" ? <Chaos b={b} L={L} dur={dur} collapseAt={b.w1 - b.w0 + 0.15} /> : null}
            {b.visual === "three" ? <Three b={b} L={L} p={p} /> : null}
            {b.visual === "counter" ? <Counter b={b} L={L} /> : null}
            {b.visual === "chats" ? <Chats beats={beats.slice(bi2, beats.indexOf(last) + 1)} L={L} dur={dur} collapseAt={last.w1 - b.w0 + 0.1} /> : null}
            {b.visual === "orbit" ? <Orbit b={b} L={L} center={pc} rx={isH ? 500 : 365} ry={isH ? 420 : 440} /> : null}
            {b.visual === "receipts" ? <Receipts b={b} L={L} from={pc} imgDir={p.stills.replace(/stills$/, "img")} /> : null}
            {b.visual === "mindgrow" ? <MindGrow b={b} L={L} /> : null}
            {b.visual === "countries" && b.countries ? <Countries c={b.countries} w0={b.w0} W={L.W} /> : null}
          </Sequence>
        );
      })}

      {/* телефон */}
      <div style={{position: "absolute", left: pose.x - phoneOuterW / 2, top: pose.y + floatZ, width: phoneOuterW, height: phoneOuterH, opacity: pose.o,
        transform: `perspective(2400px) rotateY(${pose.ry * (1 - zk) + flipRy + spinRy}deg) rotateZ(${pose.rz * (1 - zk)}deg) scale(${pose.s * (1 - 0.12 * Math.sin(Math.PI * Math.min(1, spinRy / 360)))})`, transformOrigin: "50% 0%"}}>
        <div style={{translate: `${zx}px ${zy}px`, scale: String(zoom), transformOrigin: "50% 50%"}}>
          <Phone w={L.phoneW} shine={shine} back={spinRy % 360 > 90 && spinRy % 360 < 270 ? `${p.stills}/app-icon.png` : undefined}>
            <ScreenStack p={p} beats={beats} k={k} />
            {(p.taps as {at: number; x: number; y: number; hold: number}[]).map((tp, i) => (
              <Sequence key={`tap${i}`} from={f(tp.at) - f(0.35)} durationInFrames={f(0.35) + f(tp.hold) + 18} layout="none">
                <AbsoluteFill><Tap x={tp.x} y={tp.y} hold={tp.hold} k={k} /></AbsoluteFill>
              </Sequence>
            ))}
          </Phone>
        </div>
      </div>

      </AbsoluteFill>

      {featNow && zk > 0 ? <div style={{position: "absolute", left: 0, top: 0, width: L.W, height: isH ? 300 : 560, opacity: zk,
        background: `linear-gradient(180deg, ${C.primary} 0%, rgba(238,238,242,0.94) 62%, rgba(238,238,242,0) 100%)`}} /> : null}
      {/* заголовки, плашки и CTA — поверх телефона (при наезде прячутся, вместо них — подпись наезда) */}
      <AbsoluteFill style={{opacity: textK}}>
      {beats.map((b) => {
        const from = f(b.w0);
        const dur = f(b.w1) - from + f(0.3);
        if (!b.title && !b.chips && !b.cta) return null;
        return (
          <Sequence key={`t-${b.id}`} from={from} durationInFrames={dur} premountFor={fps} name={`Текст ${b.id}`}>
            {b.title && b.visual !== "three" ? (
              <Title b={b} L={L} dur={dur} center={!isH}
                size={b.visual === "final" ? (isH ? 80 : 84) : b.visual === "reveal" ? (isH ? 84 : 88) : undefined} />
            ) : null}
            {b.visual === "three" ? <Title b={b} L={L} dur={dur} center size={isH ? 70 : 76} y={isH ? 110 : 330} /> : null}
            <Chips b={b} L={L} dur={dur} />
            {b.cta ? <Cta b={b} L={L} /> : null}
          </Sequence>
        );
      })}
      </AbsoluteFill>
      <Widgets items={allWidgets} t={t} W={L.W} cur={curNow} zk={zk} />
      {zr && zr.a.label ? <ZoomLabel text={zr.a.label} k={zk} at={zr.a.at} t={t} W={L.W} y={zr.a.labelY ?? (featNow && !isH ? 1390 : isH ? 60 : 268)} /> : null}

      </AbsoluteFill>
      <TransOverlay tr={tr} L={L} />
      <Hooks items={allHooks} t={t} W={L.W} H={L.H} imgDir={p.stills.replace(/stills$/, "img")} />

      {p.showCaptions !== false ? <Captions p={p} L={L} /> : null}

      {/* звук */}
      <Audio src={staticFile(p.voice)} />
      {p.music ? <Audio src={staticFile(p.music)} volume={musicVol} /> : null}
      {(p.taps as {at: number}[]).map((tp, i) => (
        <Sequence key={`ts${i}`} from={Math.max(0, f(tp.at) - 1)} durationInFrames={f(0.6)} layout="none">
          <Audio src={staticFile(`${p.sfxDir}/mouse-click.wav`)} volume={0.35} />
        </Sequence>
      ))}
      {beats.filter((b) => ["reveal", "three", "counter", "wechat"].includes(b.visual) || b.launch !== undefined).map((b) => (
        <Sequence key={`wh${b.id}`} from={f(b.launch ?? b.w0)} durationInFrames={f(1)} layout="none">
          <Audio src={staticFile(`${p.sfxDir}/${b.launch !== undefined ? "switch" : "whoosh"}.wav`)} volume={0.3} />
        </Sequence>
      ))}

      {/* v4: звук наездов, хуков и плашек */}
      {allZooms.map((z, i) => (
        <Sequence key={`zs${i}`} from={Math.max(0, f(z.at) - 2)} durationInFrames={f(0.8)} layout="none">
          <Audio src={staticFile(`${p.sfxDir}/whip.wav`)} volume={0.2} />
        </Sequence>
      ))}
      {hookSounds(allHooks).map((h, i) => (
        <Sequence key={`hs${i}`} from={Math.max(0, f(h.at) - 1)} durationInFrames={f(1.2)} layout="none">
          <Audio src={staticFile(`${p.sfxDir}/${h.kind}.wav`)} volume={h.kind === "ding" ? 0.32 : 0.34} />
        </Sequence>
      ))}
      {allWidgets.map((w, i) => (
        <Sequence key={`ws${i}`} from={Math.max(0, f(w.at))} durationInFrames={f(0.6)} layout="none">
          <Audio src={staticFile(`${p.sfxDir}/switch.wav`)} volume={0.24} />
        </Sequence>
      ))}
      {beats.filter((b, i) => i > 0 && b.trans && b.trans !== "none").map((b) => (
        <Sequence key={`trs${b.id}`} from={Math.max(0, f(b.w0 - TR))} durationInFrames={f(1)} layout="none">
          <Audio src={staticFile(`${p.sfxDir}/whoosh.wav`)} volume={b.trans === "flash" || b.trans === "iris" ? 0.34 : 0.26} />
        </Sequence>
      ))}

      {/* заставка GTT */}
      <Sequence from={0} durationInFrames={INTRO} name="Заставка: интро">
        <Bumper mode="intro" isH={isH} />
      </Sequence>
      <Sequence from={durationInFrames - OUTRO} durationInFrames={OUTRO} name="Заставка: аутро">
        <Bumper mode="outro" isH={isH} />
      </Sequence>
    </AbsoluteFill>
  );
};

// Заставка нарисована под 1080×1920; в горизонтальном кадре она масштабируется «по ширине» (надпись по центру).
const Bumper: React.FC<{mode: "intro" | "outro"; isH: boolean}> = ({mode, isH}) => {
  if (!isH) return <GttIntro variant="shards" mode={mode} transparent />;
  const s = 1920 / 1080;
  return (
    <AbsoluteFill style={{overflow: "hidden"}}>
      <div style={{position: "absolute", width: 1080, height: 1920, left: 0, top: (1080 - 1920 * s) / 2, scale: String(s), transformOrigin: "0 0"}}>
        <GttIntro variant="shards" mode={mode} transparent />
      </div>
    </AbsoluteFill>
  );
};

export {OVERLAP as APP_PROMO_OVERLAP};
