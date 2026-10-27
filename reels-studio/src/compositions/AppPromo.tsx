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
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {body, display, mono} from "../fonts";
import {theme} from "../theme";
import {GttIntro} from "./GttIntro";

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
  screen?: string; screenDur?: number;
};

const INTRO = 54, OUTRO = 45, OVERLAP = 10;
export const appPromoFrames = (p: AppPromoProps, fps = 30) => Math.round(p.total * fps);

// ---------- раскладка двух форматов ----------
const layoutOf = (format: "v" | "h") =>
  format === "h"
    ? {W: 1920, H: 1080, phoneW: 430, phoneX: 1390, phoneY: 60, textX: 150, textW: 860, kickerY: 250, titleSize: 76, chipY: 610, chipSize: 34, capY: 930, capSize: 38, capX: 150, capAlign: "left" as const}
    : {W: 1080, H: 1920, phoneW: 600, phoneX: 540, phoneY: 610, textX: 72, textW: 936, kickerY: 262, titleSize: 80, chipY: 0, chipSize: 34, capY: 1440, capSize: 44, capX: 540, capAlign: "center" as const};
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
const Phone: React.FC<{w: number; children: React.ReactNode; shadow?: number}> = ({w, children, shadow = 1}) => {
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
  if (b.visual === "three") return {...base, s: 0.7, o: 0, ry: 0, rz: 0};
  if (b.visual === "counter") return L.W > L.H ? {...base, x: L.phoneX + 20, ry: -14, rz: 2} : {...base, s: 0.82, y: L.phoneY + 210, ry: 10, rz: -2};
  if (b.visual === "final") return L.W > L.H ? {...base, x: L.phoneX - 40, ry: -6, rz: 0} : {...base, s: 0.86, y: L.phoneY + 170, ry: 0, rz: 0};
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
        if (b.visual === "chaos" || b.visual === "three") return null;
        const prevVisual = beats[i - 1]?.visual;
        return (
          <Sequence key={b.id} from={from} durationInFrames={dur} premountFor={fps} name={`Экран ${b.id}`}>
            <ScreenBeat b={b} p={p} k={k} enter={i > 0 && prevVisual !== "chaos" && b.visual !== "reveal" && b.launch === undefined} />
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
    content = <Img src={staticFile(`${p.stills}/start-globe.png`)} style={{width: "100%", height: "100%", objectFit: "cover"}} />;
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
          opacity: kickIn, translate: `0 ${(1 - kickIn) * 20}px`}}>{b.kicker}</div>
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
            <div style={{width: L.chipSize * 1.15, height: L.chipSize * 1.15, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center"}}>
              <svg width={L.chipSize * 0.62} height={L.chipSize * 0.62} viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="white" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" /></svg>
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
  const srcs = ["today.png", "coord.png", "1-visit.png"];
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
              <Img src={staticFile(`${p.stills}/${srcs[i]}`)} style={{width: "100%", height: i === 2 ? "auto" : "100%", objectFit: "cover"}} />
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
  const float = Math.sin(t * 1.1) * 8;

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

  // громкость музыки: громче до голоса и в финале
  const firstVoice = beats[0].start, lastVoice = beats[beats.length - 1].end;
  const musicVol = (fr: number) => {
    const s = fr / fps;
    const base = p.musicVolume ?? 0.13;
    if (s < firstVoice - 0.3) return 0.42;
    if (s < firstVoice) return interpolate(s, [firstVoice - 0.3, firstVoice], [0.42, base]);
    if (s > lastVoice + 0.2) return interpolate(s, [lastVoice + 0.2, lastVoice + 0.8, p.total - 0.6, p.total], [base, 0.4, 0.4, 0], clamp);
    return base;
  };

  return (
    <AbsoluteFill style={{backgroundColor: C.primary}}>
      <Stage L={L} />

      {/* особые сцены под телефоном */}
      {beats.map((b) => {
        if (!["chaos", "three", "counter"].includes(b.visual)) return null;
        const from = f(b.w0);
        const dur = f(b.w1) - from + (b.visual === "chaos" ? f(0.7) : f(0.3));
        return (
          <Sequence key={`u-${b.id}`} from={from} durationInFrames={dur} premountFor={fps} name={`Сцена ${b.id} · ${b.part}`}>
            {b.visual === "chaos" ? <Chaos b={b} L={L} dur={dur} collapseAt={b.w1 - b.w0 + 0.15} /> : null}
            {b.visual === "three" ? <Three b={b} L={L} p={p} /> : null}
            {b.visual === "counter" ? <Counter b={b} L={L} /> : null}
          </Sequence>
        );
      })}

      {/* телефон */}
      <div style={{position: "absolute", left: pose.x - phoneOuterW / 2, top: pose.y + float, width: phoneOuterW, height: phoneOuterH, opacity: pose.o,
        transform: `perspective(2400px) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) scale(${pose.s})`, transformOrigin: "50% 0%"}}>
        <div style={{translate: `${zx}px ${zy}px`, scale: String(zoom), transformOrigin: "50% 50%"}}>
          <Phone w={L.phoneW}>
            <ScreenStack p={p} beats={beats} k={k} />
            {(p.taps as {at: number; x: number; y: number; hold: number}[]).map((tp, i) => (
              <Sequence key={`tap${i}`} from={f(tp.at) - f(0.35)} durationInFrames={f(0.35) + f(tp.hold) + 18} layout="none">
                <AbsoluteFill><Tap x={tp.x} y={tp.y} hold={tp.hold} k={k} /></AbsoluteFill>
              </Sequence>
            ))}
          </Phone>
        </div>
      </div>

      {/* заголовки, плашки и CTA — поверх телефона */}
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
