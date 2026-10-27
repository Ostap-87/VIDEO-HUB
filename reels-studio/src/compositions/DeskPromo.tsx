// Рекламный ролик о программе для компьютера (решение пользователя 27.10.2026, SibDoc: «на каждом этапе объяснение всех
// функций… два варианта — десктопная версия и приложение для Mac… моим голосом… максимально креативно и понятно»).
// Тот же порядок, что у AppPromo (scripts/promo_voice.py → app_record.mjs → promo_build.py), но экран — компьютерный:
//  - device "pc": монитор и окно браузера (Windows · Linux · сервер компании), "mac": MacBook и окно приложения;
//    смена устройства между сценами — одно уезжает, другое приезжает;
//  - курсор мыши летит к каждому нажатию и щёлкает, наезд камеры на элемент (focus);
//  - особые сцены: docs (документы трёх систем на разных языках), reveal (рабочий стол Mac, значок → окно),
//    duo (оба варианта рядом), seven (проверки загораются на словах), reports (страницы отчёта вылетают из экрана),
//    orbit (коннекторы вокруг ноутбука), final (оба устройства, слоган, плашка).
// format: "h" — 1920×1080 (основной: презентации, сайт, рассылка), "v" — 1080×1920.
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {body, display, mono} from "../fonts";
import {theme} from "../theme";

const BLUE = "#1A56DB"; // синий SibDoc (шапка программы)
const C = {...theme.colors, accent: BLUE};
const VW = 1440, VH = 900; // окно записи в CSS px (видео 2160×1350)
const HANDLE = 0.5;

export const deskPromoSchema = z.object({
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
  appName: z.string().optional(),
  url: z.string().optional(),
});
export type DeskPromoProps = z.infer<typeof deskPromoSchema>;
type Dev = "pc" | "mac";
type Beat = {
  id: string; part: string; visual: string; start: number; end: number; w0: number; w1: number; device?: Dev;
  title?: string; kicker?: string; cta?: string; still?: string;
  chips?: {text: string; at: number}[]; bigWords?: {text: string; at: number}[];
  checks?: {text: string; sub: string; at: number; dq?: boolean}[];
  orbit?: {text: string; icon: string; at: number; soon?: boolean}[];
  report?: {at?: number; excel?: number; pdf?: number; lang?: number; id?: number};
  screen?: string; screenDur?: number;
};
type Tap = {at: number; x: number; y: number; hold: number; beat: string};
type Focus = {at: number; until: number; box: {x: number; y: number; w: number; h: number}; beat: string};

export const deskPromoFrames = (p: DeskPromoProps, fps = 30) => Math.round(p.total * fps);

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const parts = (s: string) => s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((x) => ({t: x.replace(/\*\*/g, ""), acc: x.startsWith("**")}));

// ---------- раскладка ----------
const layoutOf = (format: "v" | "h") =>
  format === "h"
    ? {W: 1920, H: 1080, isH: true, devW: 1160, devX: 1262, devY: 132, textX: 96, textW: 560, kickerY: 150, titleSize: 58, chipY: 0, chipSize: 27, capY: 972, capSize: 34}
    : {W: 1080, H: 1920, isH: false, devW: 940, devX: 540, devY: 640, textX: 64, textW: 952, kickerY: 262, titleSize: 72, chipY: 1330, chipSize: 30, capY: 1500, capSize: 42};
type Layout = ReturnType<typeof layoutOf>;

// геометрия устройств в px кадра при масштабе 1: окно записи шириной devW
const geo = (dev: Dev, devW: number) => {
  const k = devW / VW;
  const vh = VH * k;
  if (dev === "pc") {
    const bez = 16, top = 78 * k; // рамка монитора, вкладка + адресная строка
    return {k, vw: devW, vh, bez, top, w: devW + bez * 2, h: top + vh + bez * 2 + 22};
  }
  const bez = 18, top = (24 + 40) * k; // рамка крышки, строка меню + заголовок окна
  return {k, vw: devW, vh, bez, top, w: devW + bez * 2, h: top + vh + bez * 2};
};

// ---------- фон ----------
const Stage: React.FC<{L: Layout}> = ({L}) => {
  const frame = useCurrentFrame();
  const a = frame / 30;
  return (
    <AbsoluteFill style={{background: "#EEF1F7", overflow: "hidden"}}>
      <div style={{position: "absolute", width: L.W * 0.8, height: L.W * 0.8, borderRadius: "50%", left: L.W * 0.5 + Math.sin(a * 0.2) * 120, top: -L.W * 0.3 + Math.cos(a * 0.16) * 80,
        background: "radial-gradient(circle, rgba(26,86,219,0.20), rgba(26,86,219,0) 65%)"}} />
      <div style={{position: "absolute", width: L.W * 0.7, height: L.W * 0.7, borderRadius: "50%", left: -L.W * 0.25 + Math.cos(a * 0.13) * 90, top: L.H * 0.5 + Math.sin(a * 0.18) * 70,
        background: "radial-gradient(circle, rgba(10,122,48,0.10), rgba(10,122,48,0) 65%)"}} />
      <AbsoluteFill style={{backgroundImage: "linear-gradient(rgba(23,23,29,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(23,23,29,0.045) 1px, transparent 1px)", backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse at 55% 45%, black 25%, transparent 78%)", WebkitMaskImage: "radial-gradient(ellipse at 55% 45%, black 25%, transparent 78%)"}} />
    </AbsoluteFill>
  );
};

// ---------- рамки устройств ----------
const BrowserChrome: React.FC<{k: number; url: string; title: string; icon: string}> = ({k, url, title, icon}) => (
  <div style={{position: "absolute", left: 0, top: 0, right: 0, height: 78 * k, background: "#DEE3EC"}}>
    <div style={{position: "absolute", left: 14 * k, bottom: 40 * k, height: 32 * k, width: 300 * k, borderRadius: `${10 * k}px ${10 * k}px 0 0`, background: "#F7F9FC",
      display: "flex", alignItems: "center", gap: 8 * k, padding: `0 ${12 * k}px`, boxSizing: "border-box"}}>
      <Img src={icon} style={{width: 16 * k, height: 16 * k, borderRadius: 3 * k}} />
      <span style={{fontFamily: body.fontFamily, fontSize: 13 * k, color: "#30343c", whiteSpace: "nowrap", overflow: "hidden"}}>{title}</span>
    </div>
    {/* кнопки окна справа */}
    <div style={{position: "absolute", right: 16 * k, top: 10 * k, display: "flex", gap: 22 * k, fontFamily: body.fontFamily, fontSize: 16 * k, color: "#4a4f58"}}>
      <span>—</span><span>☐</span><span>✕</span>
    </div>
    <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 40 * k, background: "#F7F9FC", display: "flex", alignItems: "center", gap: 12 * k, padding: `0 ${14 * k}px`, boxSizing: "border-box"}}>
      <span style={{fontSize: 16 * k, color: "#8a8f98"}}>←</span><span style={{fontSize: 16 * k, color: "#8a8f98"}}>→</span><span style={{fontSize: 15 * k, color: "#8a8f98"}}>↻</span>
      <div style={{flex: 1, height: 26 * k, borderRadius: 13 * k, background: "#E9EDF3", display: "flex", alignItems: "center", padding: `0 ${14 * k}px`,
        fontFamily: body.fontFamily, fontSize: 13 * k, color: "#30343c"}}>{url}</div>
    </div>
  </div>
);

const MacChrome: React.FC<{k: number; title: string}> = ({k, title}) => (
  <>
    <div style={{position: "absolute", left: 0, right: 0, top: 0, height: 24 * k, background: "rgba(236,239,245,0.96)", display: "flex", alignItems: "center", gap: 18 * k,
      padding: `0 ${18 * k}px`, fontFamily: body.fontFamily, fontSize: 12.5 * k, color: "#1d1d22"}}>
      <b>{title}</b><span>Файл</span><span>Правка</span><span>Вид</span><span>Окно</span><span>Справка</span>
      <span style={{marginLeft: "auto", color: "#3a3d44"}}>Пн 9:41</span>
    </div>
    <div style={{position: "absolute", left: 0, right: 0, top: 24 * k, height: 40 * k, background: "#E8EBF1", borderBottom: "1px solid #cfd5df", display: "flex", alignItems: "center",
      padding: `0 ${14 * k}px`, gap: 8 * k}}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{width: 12 * k, height: 12 * k, borderRadius: "50%", background: c}} />)}
      <div style={{flex: 1, textAlign: "center", fontFamily: body.fontFamily, fontWeight: 600, fontSize: 13 * k, color: "#3a3d44", marginRight: 60 * k}}>{title}</div>
    </div>
  </>
);

const Device: React.FC<{dev: Dev; devW: number; children: React.ReactNode; chrome?: boolean; url: string; title: string; icon: string}> = ({dev, devW, children, chrome = true, url, title, icon}) => {
  const g = geo(dev, devW);
  const screenH = g.top + g.vh;
  if (dev === "pc") {
    return (
      <div style={{position: "relative", width: g.w, height: g.h + 150}}>
        {/* подставка */}
        <div style={{position: "absolute", left: g.w / 2 - 70, top: g.h - 10, width: 140, height: 120, background: "linear-gradient(90deg,#b8bec9,#e3e7ee 45%,#a9b0bc)", clipPath: "polygon(18% 0,82% 0,100% 100%,0 100%)"}} />
        <div style={{position: "absolute", left: g.w / 2 - 230, top: g.h + 100, width: 460, height: 26, borderRadius: 14, background: "linear-gradient(#e6e9ef,#b7bdc8)", boxShadow: "0 18px 40px rgba(20,30,60,0.25)"}} />
        <div style={{position: "absolute", left: 0, top: 0, width: g.w, height: g.h, borderRadius: 22, background: "linear-gradient(160deg,#2b2e35,#121317 50%,#24262c)",
          boxShadow: "0 40px 90px rgba(20,30,60,0.30), 0 10px 26px rgba(20,30,60,0.18), inset 0 0 0 2px rgba(255,255,255,0.08)"}}>
          <div style={{position: "absolute", left: g.bez, top: g.bez, width: g.vw, height: screenH, overflow: "hidden", borderRadius: 6, background: "#f4f6fa"}}>
            {chrome ? <BrowserChrome k={g.k} url={url} title={title} icon={icon} /> : null}
            <div style={{position: "absolute", left: 0, top: chrome ? g.top : 0, width: g.vw, height: g.vh, overflow: "hidden"}}>{children}</div>
            <div style={{position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 30%)", pointerEvents: "none"}} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{position: "relative", width: g.w * 1.12, height: g.h + 30, marginLeft: 0}}>
      <div style={{position: "absolute", left: g.w * 0.06, top: 0, width: g.w, height: g.h, borderRadius: 26, background: "linear-gradient(160deg,#1e2026,#0d0e11 55%,#1c1d22)",
        boxShadow: "0 40px 90px rgba(20,30,60,0.30), inset 0 0 0 2px rgba(255,255,255,0.10)"}}>
        <div style={{position: "absolute", left: g.bez, top: g.bez, width: g.vw, height: screenH, overflow: "hidden", borderRadius: 8, background: "#f4f6fa"}}>
          {chrome ? <MacChrome k={g.k} title={title} /> : null}
          <div style={{position: "absolute", left: 0, top: chrome ? g.top : 0, width: g.vw, height: g.vh, overflow: "hidden"}}>{children}</div>
          <div style={{position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 30%)", pointerEvents: "none"}} />
        </div>
        {/* «чёлка» */}
        <div style={{position: "absolute", left: g.w / 2 - 70, top: 0, width: 140, height: 16, borderRadius: "0 0 10px 10px", background: "#0b0b0d"}} />
      </div>
      {/* корпус */}
      <div style={{position: "absolute", left: 0, top: g.h - 2, width: g.w * 1.12, height: 26, borderRadius: "4px 4px 22px 22px", background: "linear-gradient(#e9ecf1,#b9bfca 70%,#9aa1ad)",
        boxShadow: "0 22px 40px rgba(20,30,60,0.25)"}}>
        <div style={{position: "absolute", left: "50%", top: 0, width: 180, height: 9, translate: "-50% 0", borderRadius: "0 0 10px 10px", background: "#aeb4bf"}} />
      </div>
    </div>
  );
};

// ---------- позы устройств ----------
type Pose = {x: number; y: number; s: number; ry: number; o: number};
const OFF: Record<Dev, (L: Layout) => Pose> = {
  pc: (L) => ({x: L.isH ? -700 : -800, y: L.devY, s: 0.9, ry: 18, o: 0}),
  mac: (L) => ({x: L.W + 700, y: L.devY, s: 0.9, ry: -18, o: 0}),
};
const poseOf = (b: Beat | undefined, dev: Dev, L: Layout, last: Dev): Pose => {
  const base: Pose = {x: L.devX, y: L.devY, s: 1, ry: L.isH ? -6 : 0, o: 1};
  if (!b) return OFF[dev](L);
  if (b.visual === "duo" || b.visual === "final") {
    const fin = b.visual === "final";
    if (L.isH) return dev === "pc" ? {x: fin ? 560 : 520, y: fin ? 420 : 300, s: fin ? 0.5 : 0.62, ry: 10, o: 1} : {x: fin ? 1340 : 1380, y: fin ? 440 : 320, s: fin ? 0.5 : 0.62, ry: -10, o: 1};
    return dev === "pc" ? {x: 540, y: fin ? 980 : 560, s: fin ? 0.62 : 0.78, ry: 0, o: 1} : {x: 540, y: fin ? 1340 : 1180, s: fin ? 0.62 : 0.78, ry: 0, o: 1};
  }
  const cur = (b.device || last) as Dev;
  if (cur !== dev) return OFF[dev](L);
  if (b.visual === "docs") return {...base, y: L.devY + L.H, s: 0.8, ry: 0, o: 0};
  if (b.visual === "seven") return {...base, s: 0.7, o: 0, ry: 0};
  if (b.visual === "reveal") return L.isH ? {...base, x: L.devX - 30, ry: 0} : {...base, ry: 0};
  if (b.visual === "reports") return L.isH ? {...base, x: 1420, y: 230, s: 0.72, ry: -14} : {...base, y: 1180, s: 0.7};
  if (b.visual === "orbit") return L.isH ? {...base, x: 1150, y: 300, s: 0.6, ry: 0} : {...base, y: 820, s: 0.72};
  return base;
};
const mixPose = (a: Pose, b: Pose, k: number): Pose => ({x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s: a.s + (b.s - a.s) * k, ry: a.ry + (b.ry - a.ry) * k, o: a.o + (b.o - a.o) * k});
const devAt = (beats: Beat[], i: number): Dev => {
  for (let j = i; j >= 0; j--) if (beats[j].device) return beats[j].device as Dev;
  return "mac";
};

// ---------- содержимое экрана ----------
const ScreenBeat: React.FC<{b: Beat; p: DeskPromoProps; enter: boolean; dev: Dev}> = ({b, p, enter, dev}) => {
  const frame = useCurrentFrame();
  const y = enter ? interpolate(frame, [0, 12], [6, 0], {...clamp, easing: ease}) : 0;
  const o = enter ? interpolate(frame, [0, 8], [0, 1], clamp) : 1;
  let content: React.ReactNode = null;
  if (b.screen) content = <OffthreadVideo src={staticFile(b.screen)} muted style={{width: "100%", height: "100%", objectFit: "cover"}} />;
  else {
    const still = b.still || (b.visual === "final" ? (dev === "pc" ? "decl.png" : "sum.png") : "home.png");
    content = <Img src={staticFile(`${p.stills}/${still}`)} style={{width: "100%", height: "100%", objectFit: "cover"}} />;
  }
  return <AbsoluteFill style={{translate: `0 ${y}%`, opacity: o}}>{content}</AbsoluteFill>;
};

const ScreenStack: React.FC<{p: DeskPromoProps; beats: Beat[]; dev: Dev}> = ({p, beats, dev}) => {
  const {fps} = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  let prevShown = false;
  return (
    <AbsoluteFill>
      {beats.map((b, i) => {
        const show = b.visual === "duo" || b.visual === "final" || ((b.device || devAt(beats, i)) === dev && !["docs", "seven"].includes(b.visual) && b.visual !== "reveal");
        const enter = prevShown;
        prevShown = show;
        if (!show) return null;
        return (
          <Sequence key={b.id} from={f(b.w0)} durationInFrames={f(b.w1 + HANDLE) - f(b.w0)} premountFor={fps} name={`Экран ${dev} ${b.id}`}>
            <ScreenBeat b={b} p={p} enter={enter} dev={dev} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// рабочий стол Mac: обои, Dock, значок программы → окно
const MacDesktop: React.FC<{b: Beat; p: DeskPromoProps; vw: number; vh: number; k: number}> = ({b, p, vw, vh, k}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const openAt = Math.round(Math.max(0.5, b.start - b.w0 + 0.9) * fps);
  const bounce = frame < openAt ? Math.abs(Math.sin((frame / fps) * 7)) * 18 * k * interpolate(frame, [openAt - 24, openAt], [1, 0], clamp) : 0;
  const op = interpolate(frame, [openAt, openAt + 14], [0, 1], {...clamp, easing: ease});
  const iconS = 64 * k;
  const tints = ["#f7c9c1", "#c9e3f8", "#d6efcd", "#f8e2b6", "#e2d4f6", "#cbeee8"];
  return (
    <AbsoluteFill style={{background: "linear-gradient(135deg,#3b6fd8 0%,#7aa7f0 45%,#c8d9f6 100%)"}}>
      <div style={{position: "absolute", left: "50%", bottom: 10 * k, translate: "-50% 0", display: "flex", gap: 12 * k, padding: `${10 * k}px ${16 * k}px`, borderRadius: 22 * k,
        background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)"}}>
        {tints.map((t, i) => <div key={i} style={{width: iconS, height: iconS, borderRadius: 15 * k, background: t}} />)}
        <Img src={staticFile(`${p.stills}/icon.png`)} style={{width: iconS * 1.08, height: iconS * 1.08, translate: `0 ${-bounce}px`}} />
      </div>
      {frame >= openAt ? (
        <div style={{position: "absolute", left: vw * (0.5 - 0.5 * op) + vw * 0.86 * 0.5 * (1 - op), top: vh * (1 - op) * 0.85, width: vw * (0.14 + 0.86 * op), height: vh * (0.1 + 0.9 * op),
          overflow: "hidden", borderRadius: 10 * k * (1 - op) + 2, opacity: Math.min(1, op * 2)}}>
          <Img src={staticFile(`${p.stills}/home.png`)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- курсор мыши ----------
const Cursor: React.FC<{taps: Tap[]; w: number; h: number; from: number; to: number}> = ({taps, w, h, from, to}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (t < from || t > to || !taps.length) return null;
  const next = taps.find((x) => x.at >= t);
  const prevIdx = taps.findIndex((x) => x === next) - 1;
  const prev = next ? taps[prevIdx] : taps[taps.length - 1];
  const rest = {x: 0.78, y: 0.82};
  const p0 = prev ? {x: prev.x, y: prev.y} : rest;
  let pos = p0;
  if (next && t >= next.at - 0.5) {
    const k = interpolate(t, [next.at - 0.5, next.at - 0.05], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
    pos = {x: p0.x + (next.x - p0.x) * k, y: p0.y + (next.y - p0.y) * k};
  }
  const last = [...taps].reverse().find((x) => x.at <= t);
  const since = last ? t - last.at : 9;
  const press = since >= 0 && since < 0.12 ? 0.82 : 1;
  const ring = since >= 0 && since < 0.45 ? since / 0.45 : -1;
  const fade = interpolate(t, [from, from + 0.2, to - 0.2, to], [0, 1, 1, 0], clamp);
  const sz = Math.max(18, w * 0.022);
  return (
    <AbsoluteFill style={{pointerEvents: "none", opacity: fade}}>
      {ring >= 0 && last ? (
        <div style={{position: "absolute", left: last.x * w, top: last.y * h, width: sz * 3.4, height: sz * 3.4, translate: "-50% -50%", borderRadius: "50%",
          border: `${sz * 0.16}px solid ${BLUE}`, opacity: 1 - ring, scale: String(0.3 + ring * 0.9), background: `rgba(26,86,219,${0.18 * (1 - ring)})`}} />
      ) : null}
      <svg width={sz * 1.4} height={sz * 1.4} viewBox="0 0 24 24" style={{position: "absolute", left: pos.x * w - sz * 0.18, top: pos.y * h - sz * 0.1, scale: String(press), transformOrigin: "10% 10%",
        filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))"}}>
        <path d="M4 2l15 11.5-6.6.9 3.8 7.4-2.9 1.4-3.7-7.5L4 20z" fill="white" stroke="#111" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};

// ---------- заголовок, плашки, субтитры ----------
const Title: React.FC<{b: Beat; L: Layout; dur: number; center?: boolean; size?: number; y?: number; x?: number; w?: number}> = ({b, L, dur, center, size, y, x, w}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(frame, [dur - 8, dur], [0, 1], clamp);
  const fs = size ?? L.titleSize;
  let n = 0;
  const words = parts(b.title || "").flatMap((pt) => pt.t.split(/(\s+)/).filter((s) => s.trim()).map((s) => ({s, acc: pt.acc, i: n++})));
  const kickIn = spring({frame, fps, config: theme.motion.snappy});
  return (
    <div style={{position: "absolute", left: center ? 0 : x ?? L.textX, width: center ? L.W : w ?? L.textW, top: y ?? L.kickerY, textAlign: center ? "center" : "left",
      opacity: 1 - out, translate: `0 ${-40 * out}px`, padding: center ? "0 64px" : 0, boxSizing: "border-box"}}>
      {b.kicker ? (
        <div style={{fontFamily: mono.fontFamily, fontWeight: 500, fontSize: L.isH ? 24 : 30, letterSpacing: "0.14em", color: BLUE, marginBottom: 18,
          opacity: kickIn, translate: `0 ${(1 - kickIn) * 20}px`}}>{b.kicker}</div>
      ) : null}
      <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: fs, lineHeight: 1.08, color: C.text, letterSpacing: "-0.01em", textWrap: "balance" as never}}>
        {words.map(({s, acc, i}) => {
          const sp = spring({frame: frame - 3 - i * 2, fps, config: theme.motion.snappy});
          return <span key={i} style={{display: "inline-block", marginRight: "0.26em", color: acc ? BLUE : C.text, opacity: sp, translate: `0 ${(1 - sp) * 40}px`}}>{s}</span>;
        })}
      </div>
    </div>
  );
};

const Pill: React.FC<{text: string; size: number; s: number; icon?: "check" | "shield"; origin?: string; style?: React.CSSProperties}> = ({text, size, s, icon = "check", origin = "left center", style}) => (
  <div style={{position: "absolute", display: "flex", alignItems: "center", gap: 12, padding: `${size * 0.42}px ${size * 0.9}px ${size * 0.42}px ${size * 0.5}px`, borderRadius: 999,
    background: "rgba(255,255,255,0.9)", backdropFilter: "blur(14px)", boxShadow: "0 14px 34px rgba(20,30,60,0.16)", border: "2px solid #fff",
    opacity: s, scale: String(0.7 + 0.3 * s), transformOrigin: origin, ...style}}>
    <div style={{width: size * 1.15, height: size * 1.15, borderRadius: "50%", background: icon === "shield" ? "#0a7a30" : BLUE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0}}>
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24">
        {icon === "shield" ? <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6zM9 12l2 2 4-4" fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="white" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </div>
    <span style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: size, color: C.text, whiteSpace: "nowrap"}}>{text}</span>
  </div>
);

const Chips: React.FC<{b: Beat; L: Layout; dur: number}> = ({b, L, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(frame, [dur - 8, dur], [0, 1], clamp);
  const chips = b.chips || [];
  // в горизонтальном кадре — столбиком под заголовком (до трёх строк заголовка)
  const chipTop = 480;
  return (
    <>
      {chips.map((c, i) => {
        const at = Math.round((c.at - b.w0) * fps) - 2;
        if (frame < at) return null;
        const s = spring({frame: frame - at, fps, config: {damping: 13, stiffness: 190, mass: 0.7}}) * (1 - out);
        if (b.visual === "duo") {
          const pos: React.CSSProperties = L.isH
            ? [{left: 250, top: 790}, {left: 1120, top: 810}, {left: 760, top: 930}][i] || {}
            : [{left: 64, top: 1010}, {right: 64, top: 1640}, {left: 64, top: 1745}][i] || {};
          return <Pill key={i} text={c.text} size={L.chipSize} s={s} icon={i === 2 ? "shield" : "check"} style={pos} />;
        }
        const pos: React.CSSProperties = L.isH ? {left: L.textX, top: chipTop + i * 78} : i % 2 === 0 ? {left: 48, top: L.chipY + Math.floor(i / 2) * 84} : {right: 48, top: L.chipY + 42 + Math.floor(i / 2) * 84};
        return <Pill key={i} text={c.text} size={L.chipSize} s={s} origin={!L.isH && i % 2 ? "right center" : "left center"} style={pos} />;
      })}
    </>
  );
};

const Captions: React.FC<{p: DeskPromoProps; L: Layout}> = ({p, L}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const pages: {words: DeskPromoProps["captions"]; start: number; end: number}[] = [];
  let cur: DeskPromoProps["captions"] = [];
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
  const s = spring({frame: frame - Math.round(pg.start * fps), fps, config: theme.motion.snappy});
  return (
    <div style={{position: "absolute", top: L.capY, left: L.isH ? L.textX : 0, width: L.isH ? L.textW : L.W, display: "flex", justifyContent: L.isH ? "flex-start" : "center", pointerEvents: "none"}}>
      <div style={{padding: "12px 26px", borderRadius: 22, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", boxShadow: "0 10px 28px rgba(20,30,60,0.14)",
        fontFamily: body.fontFamily, fontWeight: 700, fontSize: L.capSize, color: C.text, opacity: Math.min(1, s * 1.5), translate: `0 ${(1 - s) * 16}px`}}>
        {pg.words.map((w, i) => (
          <span key={i} style={{color: t >= w.start && t < w.end + 0.08 ? BLUE : C.text, marginRight: i < pg.words.length - 1 ? "0.28em" : 0}}>{w.text.replace(/[«»"]/g, "")}</span>
        ))}
      </div>
    </div>
  );
};

// ---------- документы трёх систем ----------
const Sheet: React.FC<{title: string; cols: string[]; rows: string[][]; color: string; w: number; mark?: [number, number]}> = ({title, cols, rows, color, w, mark}) => (
  <div style={{width: w, background: "white", borderRadius: 10, overflow: "hidden", boxShadow: "0 18px 40px rgba(20,30,60,0.22)", fontFamily: body.fontFamily}}>
    <div style={{background: color, color: "white", fontWeight: 700, fontSize: w * 0.04, padding: `${w * 0.02}px ${w * 0.03}px`}}>{title}</div>
    <div style={{display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`, fontSize: w * 0.032}}>
      {cols.map((c, i) => <div key={i} style={{padding: w * 0.012, background: "#eef1f6", fontWeight: 700, borderRight: "1px solid #dde2ea"}}>{c}</div>)}
      {rows.flatMap((r, ri) => r.map((v, ci) => (
        <div key={`${ri}-${ci}`} style={{padding: w * 0.012, borderTop: "1px solid #e6e9ef", borderRight: "1px solid #eef0f4", position: "relative"}}>
          {v}
          {mark && mark[0] === ri && mark[1] === ci ? <div style={{position: "absolute", inset: -2, border: "3px solid #E5484D", borderRadius: 999}} /> : null}
        </div>
      )))}
    </div>
  </div>
);

const Docs: React.FC<{beats: Beat[]; L: Layout; collapseAt: number; p: DeskPromoProps; target: {x: number; y: number}}> = ({beats, L, collapseAt, p, target}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const b0 = beats[0].w0;
  const col = interpolate(t, [collapseAt, collapseAt + 0.5], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const big = beats.flatMap((b) => b.bigWords || []);
  const missAt = (beats[1]?.bigWords?.[1]?.at ?? 1e9) - b0;
  const sc = L.isH ? 1 : 1.05;
  const cards: {at: number; x: number; y: number; r: number; node: React.ReactNode}[] = [
    {at: 0.2, x: L.isH ? 330 : 250, y: L.isH ? 520 : 820, r: -7, node: <Img src={staticFile(`${p.stills}/scan-dt.png`)} style={{width: 330 * sc, borderRadius: 6, boxShadow: "0 18px 40px rgba(20,30,60,0.25)"}} />},
    {at: 1.6, x: L.isH ? 1580 : 830, y: L.isH ? 540 : 860, r: 6, node: <Img src={staticFile(`${p.stills}/scan-cn.jpg`)} style={{width: 330 * sc, borderRadius: 6, boxShadow: "0 18px 40px rgba(20,30,60,0.25)"}} />},
    {at: 2.9, x: L.isH ? 960 : 540, y: L.isH ? 640 : 1230, r: -2, node: (
      <Sheet title="SAP · Purchase" color="#0a6ed1" w={520 * sc} cols={["Container number", "Price", "Main contract"]}
        rows={[["DEMU0001033", "9 963,00", "ДЕМО.1001-02A"], ["DEMU0001049", "34 900,20", "ДЕМО.1002-01A"], ["DEMU0001054", "10 157,00", "ДЕМО.1002-02A"]]} mark={t >= missAt ? [0, 1] : undefined} />
    )},
    {at: 3.5, x: L.isH ? 700 : 300, y: L.isH ? 860 : 1500, r: 4, node: (
      <Sheet title="FineBI · Widetable" color="#5b6b7f" w={430 * sc} cols={["decl_num", "products_price", "成交方式"]}
        rows={[["2202202600…0102", "9.176", "CIF"], ["2202202600…0103", "247.4", "C&F"]]} mark={t >= missAt ? [0, 1] : undefined} />
    )},
    {at: 4.2, x: L.isH ? 1290 : 790, y: L.isH ? 880 : 1560, r: -5, node: (
      <div style={{width: 400 * sc, background: "#16181d", color: "#cfe3ff", borderRadius: 10, padding: 18, fontFamily: mono.fontFamily, fontSize: 17 * sc, lineHeight: 1.5,
        boxShadow: "0 18px 40px rgba(20,30,60,0.25)", whiteSpace: "pre"}}>
        {"<ESADout_CU>\n  <GoodsTNVEDCode>4002391000\n  <InvoicedCost>486317.16\n  <ContainerNumber>DEMU0001012\n</ESADout_CU>"}
      </div>
    )},
  ];
  return (
    <AbsoluteFill>
      {cards.map((c, i) => {
        const at = Math.round(c.at * fps);
        if (frame < at) return null;
        const s = spring({frame: frame - at, fps, config: {damping: 14, stiffness: 160, mass: 0.8}});
        const x = c.x + (target.x - c.x) * col, y = c.y + (target.y - c.y) * col;
        return (
          <div key={i} style={{position: "absolute", left: x, top: y, translate: "-50% -50%", rotate: `${c.r * (1 - col) + (1 - s) * 12}deg`, scale: String((0.6 + 0.4 * s) * (1 - 0.8 * col)),
            opacity: s * (1 - col * 0.9), zIndex: i}}>{c.node}</div>
        );
      })}
      {t >= missAt && col < 1 ? (
        <div style={{position: "absolute", left: L.isH ? 880 : 470, top: L.isH ? 740 : 1360, width: 74, height: 74, borderRadius: "50%", background: "#E5484D", color: "white",
          fontFamily: display.fontFamily, fontWeight: 700, fontSize: 52, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20,
          scale: String(spring({frame: frame - Math.round(missAt * fps), fps, config: {damping: 9, stiffness: 200}}) * (1 - col)), boxShadow: "0 12px 30px rgba(229,72,77,0.45)"}}>≠</div>
      ) : null}
      {big.map((w, i) => {
        const at = Math.round((w.at - b0) * fps);
        const next = big[i + 1] ? Math.round((big[i + 1].at - b0) * fps) : Math.round(collapseAt * fps);
        if (frame < at - 1 || frame > next + 8) return null;
        const s = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 170, mass: 0.8}});
        const o = interpolate(frame, [next - 5, next + 1], [1, 0], clamp);
        return (
          <div key={`b${i}`} style={{position: "absolute", left: 0, width: L.W, top: L.isH ? 110 : 300, textAlign: "center", fontFamily: display.fontFamily, fontWeight: 700,
            fontSize: L.isH ? 104 : 96, lineHeight: 1.05, color: C.text, opacity: s * o, translate: `0 ${(1 - s) * 50}px`, scale: String(0.85 + 0.15 * s), zIndex: 30,
            padding: "0 48px", boxSizing: "border-box"}}>
            {w.text.split(" ").map((x, j) => <span key={j} style={{color: j === 0 ? BLUE : C.text}}>{x}{" "}</span>)}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- семь проверок ----------
const Seven: React.FC<{b: Beat; L: Layout}> = ({b, L}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const checks = b.checks || [];
  const cols = L.isH ? 4 : 2;
  const tw = L.isH ? 400 : 460, th = L.isH ? 190 : 200, gap = L.isH ? 26 : 22;
  const x0 = (L.W - (cols * tw + (cols - 1) * gap)) / 2, y0 = L.isH ? 380 : 620;
  return (
    <AbsoluteFill>
      {checks.map((c, i) => {
        const appear = spring({frame: frame - 4 - i * 2, fps, config: theme.motion.snappy});
        const at = Math.round((c.at - b.w0) * fps) - 2;
        const on = spring({frame: frame - at, fps, config: {damping: 11, stiffness: 190, mass: 0.7}});
        const lit = frame >= at;
        const x = x0 + (i % cols) * (tw + gap), y = y0 + Math.floor(i / cols) * (th + gap);
        return (
          <div key={i} style={{position: "absolute", left: x, top: y, width: tw, height: th, borderRadius: 26, background: lit ? "white" : "rgba(255,255,255,0.55)",
            border: `3px solid ${lit ? (c.dq ? "#0a7a30" : BLUE) : "rgba(255,255,255,0.8)"}`, boxShadow: lit ? `0 18px 44px rgba(26,86,219,${0.12 + 0.18 * on})` : "0 8px 20px rgba(20,30,60,0.06)",
            opacity: appear, translate: `0 ${(1 - appear) * 40}px`, scale: String(lit ? 1 + 0.05 * Math.sin(Math.min(1, on) * Math.PI) : 0.97), padding: "22px 24px", boxSizing: "border-box"}}>
            <div style={{display: "flex", alignItems: "center", gap: 14}}>
              <div style={{width: 52, height: 52, borderRadius: "50%", background: lit ? (c.dq ? "#0a7a30" : BLUE) : "#dfe4ee", color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: display.fontFamily, fontWeight: 700, fontSize: 24, flexShrink: 0}}>
                {lit ? <svg width={28} height={28} viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="white" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" /></svg> : c.dq ? "0" : i}
              </div>
              <div style={{fontFamily: mono.fontFamily, fontSize: 18, letterSpacing: "0.12em", color: lit ? (c.dq ? "#0a7a30" : BLUE) : C.muted}}>{c.dq ? "ДО ПРОВЕРОК" : `ПРОВЕРКА ${i}`}</div>
            </div>
            <div style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: L.isH ? 32 : 34, color: C.text, marginTop: 16, lineHeight: 1.1}}>{c.text}</div>
            <div style={{fontFamily: body.fontFamily, fontSize: L.isH ? 22 : 24, color: C.muted, marginTop: 6}}>{c.sub}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- отчёты вылетают из экрана ----------
const Reports: React.FC<{b: Beat; L: Layout; p: DeskPromoProps; from: {x: number; y: number}}> = ({b, L, p, from}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const r = b.report || {};
  const f = (s?: number, d = 0) => (s === undefined ? 1e9 : Math.round((s - b.w0 + d) * fps));
  const fly = (at: number, to: {x: number; y: number; r: number; w: number}) => {
    const k = interpolate(frame, [at, at + 16], [0, 1], {...clamp, easing: ease});
    return {left: from.x + (to.x - from.x) * k, top: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 120, rotate: `${to.r * k}deg`, width: to.w * (0.3 + 0.7 * k), opacity: Math.min(1, k * 3)};
  };
  const pdfAt = f(r.pdf, -0.1), xlAt = f(r.excel, -0.1);
  const pages = ["rep-01.png", "rep-02.png", "rep-03.png"];
  const H = L.isH;
  const langS = spring({frame: frame - f(r.lang, -0.05), fps, config: {damping: 11, stiffness: 190}});
  const idS = spring({frame: frame - f(r.id, -0.05), fps, config: {damping: 11, stiffness: 190}});
  return (
    <AbsoluteFill>
      {frame >= xlAt ? (
        <div style={{position: "absolute", ...fly(xlAt, {x: H ? 300 : 260, y: H ? 640 : 820, r: -6, w: H ? 300 : 300}), translate: "-50% -50%"}}>
          <Img src={staticFile(`${p.stills}/xl-01.png`)} style={{width: "100%", borderRadius: 6, boxShadow: "0 18px 40px rgba(20,30,60,0.25)", border: "1px solid #dde2ea"}} />
          <div style={{position: "absolute", left: 10, top: -26, padding: "6px 14px", borderRadius: 8, background: "#1D7A45", color: "white", fontFamily: body.fontFamily, fontWeight: 700, fontSize: 24}}>XLSX</div>
        </div>
      ) : null}
      {pages.map((pg, i) => {
        const at = pdfAt + i * 4;
        if (frame < at) return null;
        return (
          <div key={pg} style={{position: "absolute", ...fly(at, {x: (H ? 690 : 700) + i * 38, y: (H ? 600 : 820) + i * 30, r: -4 + i * 5, w: H ? 470 : 420}), translate: "-50% -50%", zIndex: 3 - i}}>
            <Img src={staticFile(`${p.stills}/${pg}`)} style={{width: "100%", borderRadius: 6, boxShadow: "0 18px 40px rgba(20,30,60,0.25)", border: "1px solid #dde2ea"}} />
            {i === 0 ? <div style={{position: "absolute", left: 10, top: -26, padding: "6px 14px", borderRadius: 8, background: "#D93636", color: "white", fontFamily: body.fontFamily, fontWeight: 700, fontSize: 24}}>PDF</div> : null}
          </div>
        );
      })}
      {frame >= f(r.lang, -0.05) ? (
        <div style={{position: "absolute", left: H ? 150 : 90, top: H ? 860 : 1060, padding: "14px 26px", borderRadius: 999, background: C.text, color: "white", fontFamily: body.fontFamily, fontWeight: 700,
          fontSize: H ? 34 : 38, scale: String(0.6 + 0.4 * langS), opacity: langS}}>RU + 中文</div>
      ) : null}
      {frame >= f(r.id, -0.05) ? (
        <div style={{position: "absolute", left: H ? 420 : 400, top: H ? 862 : 1062, padding: "14px 24px", borderRadius: 999, background: "white", border: `3px solid ${BLUE}`, color: BLUE,
          fontFamily: mono.fontFamily, fontSize: H ? 26 : 28, scale: String(0.6 + 0.4 * idS), opacity: idS}}>прогон № 20261027-065300</div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- коннекторы вокруг ноутбука ----------
const ORB: Record<string, string> = {
  mail: "M3 6h18v12H3zM3 7l9 6 9-6", folder: "M3 6h6l2 2h10v10H3z", table: "M4 5h16v14H4zM4 10h16M4 15h16M10 5v14", chart: "M5 19V9M10 19V5M15 19v-7M20 19v-4",
  box: "M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8", train: "M7 4h10a2 2 0 012 2v8a3 3 0 01-3 3H8a3 3 0 01-3-3V6a2 2 0 012-2zM5 10h14M8 21l2-4M16 21l-2-4",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18", bell: "M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0",
};
const Orbit: React.FC<{b: Beat; L: Layout; center: {x: number; y: number}; rx: number; ry: number}> = ({b, L, center, rx, ry}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const items = b.orbit || [];
  return (
    <AbsoluteFill>
      <svg width={L.W} height={L.H} style={{position: "absolute", inset: 0}}>
        <ellipse cx={center.x} cy={center.y} rx={rx} ry={ry} fill="none" stroke="rgba(26,86,219,0.25)" strokeWidth={3} strokeDasharray="10 14" opacity={interpolate(frame, [0, 12], [0, 1], clamp)} />
      </svg>
      {items.map((o, i) => {
        const at = Math.round((o.at - b.w0) * fps) - 2;
        if (frame < at) return null;
        const s = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 180, mass: 0.7}});
        const ang = (-90 + i * (360 / items.length)) * Math.PI / 180 + t * 0.07;
        const x = center.x + Math.cos(ang) * rx * (0.6 + 0.4 * s), y = center.y + Math.sin(ang) * ry * (0.6 + 0.4 * s);
        return (
          <div key={i} style={{position: "absolute", left: x, top: y, translate: "-50% -50%", display: "flex", alignItems: "center", gap: 12, padding: L.isH ? "11px 22px 11px 12px" : "13px 24px 13px 14px",
            borderRadius: 999, background: o.soon ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.96)", border: o.soon ? `2px dashed ${C.muted}` : "2px solid white",
            boxShadow: "0 14px 34px rgba(20,30,60,0.16)", opacity: s, scale: String(0.6 + 0.4 * s)}}>
            <div style={{width: L.isH ? 40 : 46, height: L.isH ? 40 : 46, borderRadius: 13, background: o.soon ? "#9aa3b2" : BLUE, display: "flex", alignItems: "center", justifyContent: "center"}}>
              <svg width={L.isH ? 24 : 27} height={L.isH ? 24 : 27} viewBox="0 0 24 24"><path d={ORB[o.icon] || ORB.box} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: L.isH ? 27 : 31, color: o.soon ? C.muted : C.text, whiteSpace: "nowrap"}}>{o.text}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- финал ----------
const Final: React.FC<{b: Beat; L: Layout; p: DeskPromoProps}> = ({b, L, p}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 4, fps, config: {damping: 12, stiffness: 150}});
  const cta = spring({frame: frame - Math.round((b.end - b.w0 - 0.8) * fps), fps, config: theme.motion.snappy});
  return (
    <AbsoluteFill>
      <div style={{position: "absolute", left: "50%", top: L.isH ? 70 : 250, translate: "-50% 0", display: "flex", alignItems: "center", gap: 22, scale: String(0.7 + 0.3 * s), opacity: s}}>
        <Img src={staticFile(`${p.stills}/icon.png`)} style={{width: L.isH ? 110 : 130, height: L.isH ? 110 : 130}} />
        <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: L.isH ? 92 : 100, color: C.text}}>{p.appName || "SibDoc"}</div>
      </div>
      <div style={{position: "absolute", left: 0, width: L.W, top: L.isH ? 900 : 1700, display: "flex", justifyContent: "center", opacity: cta, translate: `0 ${(1 - cta) * 40}px`}}>
        <div style={{padding: "20px 36px", borderRadius: 26, background: BLUE, color: "white", fontFamily: body.fontFamily, fontWeight: 700, fontSize: L.isH ? 36 : 38, boxShadow: "0 20px 50px rgba(26,86,219,0.35)"}}>{b.cta}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- ролик ----------
export const DeskPromo: React.FC<DeskPromoProps> = (p) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const L = layoutOf(p.format);
  const beats = p.beats as Beat[];
  const taps = p.taps as Tap[];
  const focus = p.focus as Focus[];
  const f = (s: number) => Math.round(s * fps);
  const t = frame / fps;
  const url = p.url || "localhost:8000";
  const winTitle = `${p.appName || "SibDoc"} · PostControl Suite`;
  const icon = staticFile(`${p.stills}/icon.png`);

  let bi = beats.findIndex((b) => t >= b.w0 && t < b.w1);
  if (bi < 0) bi = t < beats[0].w0 ? 0 : beats.length - 1;
  const kk = bi === 0 ? 1 : interpolate(t, [beats[bi].w0, beats[bi].w0 + 0.75], [0, 1], {...clamp, easing: ease});
  const float = Math.sin(t * 1.0) * 6;
  const beatDev = (i: number) => devAt(beats, i);

  const renderDevice = (dev: Dev) => {
    const prev = poseOf(beats[bi - 1], dev, L, beatDev(Math.max(0, bi - 1)));
    const cur = poseOf(beats[bi], dev, L, beatDev(bi));
    const pose = mixPose(prev, cur, kk);
    if (pose.o <= 0.001) return null;
    const g = geo(dev, L.devW);
    const outerW = dev === "mac" ? g.w * 1.12 : g.w;
    const vx0 = (dev === "mac" ? g.w * 0.06 : 0) + g.bez, vy0 = g.bez + g.top;
    // наезд на элемент: только в сценах этого устройства
    const fz = focus.find((z) => t >= z.at - 0.4 && t <= z.until + 0.5 && beatDev(beats.findIndex((b) => b.id === z.beat)) === dev);
    let zoom = 1, tx = 0, ty = 0, ox = outerW / 2, oy = g.h / 2;
    if (fz) {
      const zin = interpolate(t, [fz.at - 0.4, fz.at + 0.1], [0, 1], {...clamp, easing: ease});
      const zout = interpolate(t, [fz.until, fz.until + 0.5], [0, 1], {...clamp, easing: ease});
      const z = zin * (1 - zout);
      const target = Math.min(L.isH ? 1.45 : 1.6, Math.max(1.2, 0.5 / Math.max(0.05, fz.box.w)));
      zoom = 1 + (target - 1) * z;
      ox = vx0 + (fz.box.x + fz.box.w / 2) * g.vw;
      oy = vy0 + (fz.box.y + fz.box.h / 2) * g.vh;
      tx = (outerW / 2 - ox) * 0.35 * z;
      ty = (g.h / 2 - oy) * 0.35 * z;
      // в горизонтальном кадре экран при наезде не заходит на столбик заголовка слева
      const bc = beats[bi];
      if (L.isH && bc && !["duo", "final", "reveal", "orbit", "reports"].includes(bc.visual)) {
        const minLeft = (L.textX + L.textW + 24 - pose.x) / pose.s + outerW / 2;
        const left = tx + ox * (1 - zoom);
        if (left < minLeft) tx += minLeft - left;
      }
    }
    const devTaps = taps.filter((tp) => beatDev(beats.findIndex((b) => b.id === tp.beat)) === dev);
    const winBeats = beats.map((b, i) => ({b, i})).filter(({b, i}) => beatDev(i) === dev && b.screen);
    const from = winBeats.length ? winBeats[0].b.w0 : 0, to = winBeats.length ? winBeats[winBeats.length - 1].b.w1 : 0;
    const reveal = beats.find((b) => b.visual === "reveal" && (b.device || "mac") === dev);
    return (
      <div key={dev} style={{position: "absolute", left: pose.x - outerW / 2, top: pose.y + float, width: outerW, opacity: pose.o,
        transform: `perspective(2600px) rotateY(${pose.ry}deg) scale(${pose.s})`, transformOrigin: "50% 0%"}}>
        <div style={{transform: `translate(${tx}px, ${ty}px) scale(${zoom})`, transformOrigin: `${ox}px ${oy}px`}}>
          <Device dev={dev} devW={L.devW} url={url} title={dev === "pc" ? winTitle : p.appName || "SibDoc"} icon={icon}>
            <ScreenStack p={p} beats={beats} dev={dev} />
            {reveal ? (
              <Sequence from={f(reveal.w0)} durationInFrames={f(reveal.w1 + HANDLE) - f(reveal.w0)} premountFor={fps} name="Рабочий стол Mac">
                <MacDesktop b={reveal} p={p} vw={g.vw} vh={g.vh} k={g.k} />
              </Sequence>
            ) : null}
            <Cursor taps={devTaps} w={g.vw} h={g.vh} from={from} to={to} />
          </Device>
        </div>
      </div>
    );
  };

  const firstVoice = beats[0].start, lastVoice = beats[beats.length - 1].end;
  const musicVol = (fr: number) => {
    const s = fr / fps;
    const base = p.musicVolume ?? 0.12;
    if (s < firstVoice - 0.3) return 0.4;
    if (s < firstVoice) return interpolate(s, [firstVoice - 0.3, firstVoice], [0.4, base]);
    if (s > lastVoice + 0.2) return interpolate(s, [lastVoice + 0.2, lastVoice + 0.8, p.total - 0.8, p.total], [base, 0.4, 0.4, 0], clamp);
    return base;
  };
  const devCenter = (b: Beat, i: number) => {
    const dev = (b.device || beatDev(i)) as Dev;
    const pz = poseOf(b, dev, L, dev);
    const g = geo(dev, L.devW);
    return {x: pz.x, y: pz.y + (g.top + g.vh / 2 + g.bez) * pz.s};
  };

  return (
    <AbsoluteFill style={{backgroundColor: "#EEF1F7"}}>
      <Stage L={L} />

      {/* особые сцены под устройствами */}
      {beats.map((b, i) => {
        if (!["docs", "seven", "reports", "orbit", "final"].includes(b.visual)) return null;
        if (b.visual === "docs" && beats[i - 1]?.visual === "docs") return null;
        let last = b;
        if (b.visual === "docs") for (let j = i + 1; beats[j]?.visual === "docs"; j++) last = beats[j];
        const from = f(b.w0);
        const dur = f(last.w1) - from + f(b.visual === "docs" ? 0.7 : 0.3);
        const nextB = beats[beats.indexOf(last) + 1];
        return (
          <Sequence key={`u-${b.id}`} from={from} durationInFrames={dur} premountFor={fps} name={`Сцена ${b.id} · ${b.part}`}>
            {b.visual === "docs" ? <Docs beats={beats.slice(i, beats.indexOf(last) + 1)} L={L} p={p} collapseAt={last.w1 - b.w0 + 0.05}
              target={nextB ? devCenter(nextB, beats.indexOf(nextB)) : {x: L.W / 2, y: L.H / 2}} /> : null}
            {b.visual === "seven" ? <Seven b={b} L={L} /> : null}
            {b.visual === "reports" ? <Reports b={b} L={L} p={p} from={devCenter(b, i)} /> : null}
            {b.visual === "orbit" ? <Orbit b={b} L={L} center={devCenter(b, i)} rx={L.isH ? 560 : 420} ry={L.isH ? 330 : 560} /> : null}
            {b.visual === "final" ? <Final b={b} L={L} p={p} /> : null}
          </Sequence>
        );
      })}

      {renderDevice("pc")}
      {renderDevice("mac")}

      {/* заголовки и плашки поверх */}
      {beats.map((b) => {
        const from = f(b.w0);
        const dur = f(b.w1) - from + f(0.3);
        if (!b.title && !b.chips) return null;
        const centerTitle = !L.isH || ["seven", "duo", "final", "reveal"].includes(b.visual);
        const ty = b.visual === "seven" ? (L.isH ? 150 : 330) : b.visual === "duo" ? (L.isH ? 70 : 262) : b.visual === "final" ? (L.isH ? 230 : 450) : b.visual === "reveal" && L.isH ? 30 : undefined;
        return (
          <Sequence key={`t-${b.id}`} from={from} durationInFrames={dur} premountFor={fps} name={`Текст ${b.id}`}>
            {b.title ? <Title b={b} L={L} dur={dur} center={centerTitle} y={ty} size={b.visual === "final" ? (L.isH ? 64 : 70) : b.visual === "reveal" && L.isH ? 64 : undefined} /> : null}
            <Chips b={b} L={L} dur={dur} />
          </Sequence>
        );
      })}

      {p.showCaptions !== false ? <Captions p={p} L={L} /> : null}

      <Audio src={staticFile(p.voice)} />
      {p.music ? <Audio src={staticFile(p.music)} volume={musicVol} /> : null}
      {taps.map((tp, i) => (
        <Sequence key={`ts${i}`} from={Math.max(0, f(tp.at) - 1)} durationInFrames={f(0.6)} layout="none">
          <Audio src={staticFile(`${p.sfxDir}/mouse-click.wav`)} volume={0.4} />
        </Sequence>
      ))}
      {beats.filter((b, i) => i > 0 && (["reveal", "duo", "seven", "reports", "orbit", "final"].includes(b.visual) || (b.device && b.device !== beatDev(i - 1)))).map((b) => (
        <Sequence key={`wh${b.id}`} from={f(b.w0)} durationInFrames={f(1)} layout="none">
          <Audio src={staticFile(`${p.sfxDir}/whoosh.wav`)} volume={0.28} />
        </Sequence>
      ))}
      {beats.filter((b) => b.visual === "seven").flatMap((b) => (b.checks || []).map((c, j) => (
        <Sequence key={`ck${b.id}${j}`} from={Math.max(0, f(c.at) - 2)} durationInFrames={f(0.6)} layout="none">
          <Audio src={staticFile(`${p.sfxDir}/switch.wav`)} volume={0.32} />
        </Sequence>
      )))}
    </AbsoluteFill>
  );
};
