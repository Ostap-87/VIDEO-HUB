// «Робокитай» — 2D-набор сериала Aura (05.11.2026): «чертёж-манхуа» на пергаменте.
// Палитра концепции: пергамент #F8F6F3 + графит #262626, лимонный маркер #FFF65D — одно слово/цифра в кадре, красный #E5383B —
// печати-иероглифы и предупреждения, синий #2B6CB0 — термины. Шрифты: Inter (800 заголовки, 600–700 текст), JetBrains Mono —
// единицы, стандарты, служебные подписи; кисть Ma Shan Zheng — только иероглифы печатей.
// Здесь: бумага с чертёжной сеткой, шапка серии, вкладка шага, текст с маркером, плашка имени с выноской, печать-иероглиф,
// карточка-спецификация, панель 3D-сцены, переход «сдвиг страницы».
import React from "react";
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {loadFont as loadMono} from "@remotion/google-fonts/JetBrainsMono";
import {inter, loadCjk} from "../carousel/kit";
import {BRUSH} from "../../components/MontazhFx";

export const RK = {
  paper: "#F8F6F3",
  paper2: "#F1EDE6",
  ink: "#262626",
  fog: "#D9D7D5",
  lemon: "#FFF65D",
  red: "#E5383B",
  blue: "#2B6CB0",
  muted: "#66666E",
};
export const INTER = inter.fontFamily;
export const MONO = loadMono("normal", {weights: ["500", "700"], subsets: ["cyrillic", "latin"]}).fontFamily;
export const MONO_CJK = `${MONO}, "Noto Sans SC", monospace`;
export const BRUSH_CJK = `"${BRUSH}", "Noto Sans SC", serif`;
export {loadCjk};

export const CL = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const p01 = (f: number, a: number, b: number, easing?: (x: number) => number) => interpolate(f, [a, b], [0, 1], {...CL, easing});

// появление «поп» (пружина с лёгким перелётом): 0 → 1
export const usePop = (atFrame: number, damping = 12) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < atFrame) return 0;
  return spring({frame: f - atFrame, fps, config: {damping, stiffness: 190, mass: 0.7}});
};

// бумага с чертёжной сеткой (мелкая 24 px, крупная 120 px)
export const Paper: React.FC<{tone?: string}> = ({tone = RK.paper}) => (
  <AbsoluteFill
    style={{
      background: tone,
      backgroundImage:
        "linear-gradient(rgba(38,38,38,0.075) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(38,38,38,0.075) 1.5px, transparent 1.5px), linear-gradient(rgba(38,38,38,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(38,38,38,0.035) 1px, transparent 1px)",
      backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px",
      backgroundPosition: "-1px -1px",
    }}
  />
);

// текст с лимонным маркером, который «проводится» слева направо (p 0…1)
export const Marked: React.FC<{children: React.ReactNode; p: number; color?: string}> = ({children, p, color = RK.lemon}) => (
  <span
    style={{
      backgroundImage: `linear-gradient(${color}, ${color})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${(p * 100).toFixed(1)}% 46%`,
      backgroundPosition: "0 88%",
      padding: "0 6px",
      margin: "0 -6px",
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
    }}
  >
    {children}
  </span>
);

// строка с выделением: часть `mark` внутри text получает маркер (p — прогресс маркера)
export const MarkLine: React.FC<{text: string; mark?: string; p: number; markColor?: string; markStyle?: React.CSSProperties}> = ({text, mark, p, markColor, markStyle}) => {
  if (!mark || !text.includes(mark)) return <>{text}</>;
  const i = text.indexOf(mark);
  return (
    <>
      {text.slice(0, i)}
      <span style={markStyle}>
        <Marked p={p} color={markColor}>
          {mark}
        </Marked>
      </span>
      {text.slice(i + mark.length)}
    </>
  );
};

// шапка серии: «РОБОКИТАЙ · 机器人中国 · СЕРИЯ N» и вкладка шага (меняется по сценам)
export const Header: React.FC<{series: string; zh: string; ep: number; city?: string; tab?: string; tabKey?: number; hide?: number}> = ({series, zh, ep, city, tab, tabKey = 0, hide = 0}) => {
  const f = useCurrentFrame();
  const k = p01(f, 0, 14, EO) * (1 - hide);
  const tk = p01(f - tabKey, 2, 14, EO);
  return (
    <div style={{position: "absolute", left: 64, top: 262, opacity: k, translate: `0 ${(1 - k) * -30}px`}}>
      <div style={{display: "flex", alignItems: "center", gap: 14, fontFamily: MONO_CJK, fontWeight: 700, fontSize: 25, letterSpacing: "0.12em", color: RK.ink}}>
        <span style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, background: RK.red, color: RK.paper, borderRadius: 7, fontFamily: BRUSH_CJK, fontSize: 30, letterSpacing: 0, rotate: "-4deg"}}>机</span>
        <span>
          {series.toUpperCase()} · {zh}
        </span>
        <span style={{color: RK.muted}}>·</span>
        <span>СЕРИЯ {ep}</span>
        {city ? (
          <>
            <span style={{color: RK.muted}}>·</span>
            <span style={{color: RK.red}}>{city.toUpperCase()}</span>
          </>
        ) : null}
      </div>
      {tab ? (
        <div
          style={{
            marginTop: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 16px 6px 12px",
            border: `3px solid ${RK.ink}`,
            borderRadius: 999,
            background: RK.paper,
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: "0.1em",
            color: RK.ink,
            opacity: tk,
            translate: `${(1 - tk) * -24}px 0`,
          }}
        >
          <span style={{width: 14, height: 14, borderRadius: 99, background: RK.lemon, border: `3px solid ${RK.ink}`}} />
          {tab.toUpperCase()}
        </div>
      ) : null}
    </div>
  );
};

// плашка имени героя с выноской-линией к модели (ax, ay — куда указывает выноска; x, y — левый верх плашки)
export const NamePlate: React.FC<{x: number; y: number; name: string; role: string; at: number; ax?: number; ay?: number; badge?: React.ReactNode; scale?: number}> = ({x, y, name, role, at, ax, ay, badge, scale = 1}) => {
  const s = usePop(at, 11);
  const f = useCurrentFrame();
  if (s <= 0) return null;
  const line = p01(f, at, at + 10, EO);
  const H = 70 * scale;
  return (
    <>
      {ax !== undefined && ay !== undefined ? (
        <svg width={1080} height={1920} style={{position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none"}}>
          <line x1={x + 40 * scale} y1={y + H / 2} x2={x + 40 * scale + (ax - x - 40 * scale) * line} y2={y + H / 2 + (ay - y - H / 2) * line} stroke={RK.ink} strokeWidth={3} strokeDasharray="8 7" />
          <circle cx={ax} cy={ay} r={9 * line} fill={RK.lemon} stroke={RK.ink} strokeWidth={3} />
        </svg>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          height: H,
          display: "flex",
          alignItems: "center",
          gap: 14 * scale,
          padding: `0 ${24 * scale}px 0 ${18 * scale}px`,
          background: RK.paper,
          border: `4px solid ${RK.ink}`,
          borderRadius: 20 * scale,
          boxShadow: `6px 6px 0 ${RK.ink}`,
          scale: String(0.6 + 0.4 * s),
          opacity: Math.min(1, s * 2),
          transformOrigin: "0 50%",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{width: 18 * scale, height: 18 * scale, borderRadius: 99, background: RK.lemon, border: `3px solid ${RK.ink}`, flexShrink: 0}} />
        <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 40 * scale, letterSpacing: "-0.02em", color: RK.ink}}>{name}</span>
        <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 28 * scale, color: RK.muted}}>·</span>
        <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 30 * scale, color: RK.blue}}>{role}</span>
        {badge}
      </div>
    </>
  );
};

// печать-иероглиф: красный квадрат с неровным краем, знак кистью; «шлёп» с пружиной в at (кадр)
export const Seal: React.FC<{ch: string; size: number; at: number; x: number; y: number; rot?: number; id: string; sub?: string}> = ({ch, size, at, x, y, rot = -6, id, sub}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 13, stiffness: 260, mass: 0.8}});
  const sc = 2.1 - 1.1 * s;
  const fs = ch.length > 1 ? size * 0.42 : size * 0.72;
  return (
    <div style={{position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, rotate: `${rot}deg`, scale: String(sc), opacity: Math.min(1, s * 3)}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{position: "absolute", inset: 0, overflow: "visible"}}>
        <defs>
          <filter id={`rough-${id}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={7} />
            <feDisplacementMap in="SourceGraphic" scale={size * 0.035} />
          </filter>
        </defs>
        <g filter={`url(#rough-${id})`}>
          <rect x={size * 0.03} y={size * 0.03} width={size * 0.94} height={size * 0.94} rx={size * 0.08} fill={RK.red} />
          <rect x={size * 0.1} y={size * 0.1} width={size * 0.8} height={size * 0.8} rx={size * 0.05} fill="none" stroke={RK.paper} strokeWidth={size * 0.035} opacity={0.9} />
        </g>
      </svg>
      <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: BRUSH_CJK, fontSize: fs, lineHeight: 1, color: RK.paper, paddingBottom: size * 0.04}}>{ch}</div>
      {sub ? (
        <div style={{position: "absolute", left: "50%", top: size + 8, translate: "-50% 0", fontFamily: MONO_CJK, fontWeight: 700, fontSize: Math.max(22, size * 0.16), color: RK.red, whiteSpace: "nowrap", rotate: `${-rot}deg`}}>{sub}</div>
      ) : null}
    </div>
  );
};

// карточка-спецификация: термин (синий) + расшифровка моно, строки текста; одна часть строки — под лимонным маркером
export type CardLine = {text: string; mark?: string};
export const SpecCard: React.FC<{x: number; y: number; w: number; at: number; term?: string; sub?: string; lines: CardLine[]; note?: string; tone?: "paper" | "alert"; size?: number; out?: number}> = ({x, y, w, at, term, sub, lines, note, tone = "paper", size = 46, out}) => {
  const f = useCurrentFrame();
  const s = usePop(at, 14);
  if (s <= 0) return null;
  const gone = out !== undefined ? p01(f, out - 8, out, EIO) : 0;
  const mk = p01(f, at + 10, at + 26, EO);
  const alert = tone === "alert";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        padding: "26px 34px 28px",
        boxSizing: "border-box",
        background: RK.paper,
        border: `5px solid ${alert ? RK.red : RK.ink}`,
        borderRadius: 30,
        boxShadow: `9px 9px 0 ${alert ? RK.red : RK.ink}`,
        translate: `0 ${(1 - s) * 70 + gone * 60}px`,
        opacity: Math.min(1, s * 1.6) * (1 - gone),
      }}
    >
      {term ? (
        <div style={{display: "flex", alignItems: "baseline", gap: 18, marginBottom: 8}}>
          <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 64, letterSpacing: "-0.03em", color: alert ? RK.red : RK.blue, lineHeight: 1}}>{term}</span>
          {sub ? <span style={{fontFamily: MONO, fontWeight: 500, fontSize: 25, color: RK.muted, letterSpacing: "0.02em"}}>{sub}</span> : null}
        </div>
      ) : null}
      {lines.map((l, i) => (
        <div key={i} style={{fontFamily: INTER, fontWeight: 700, fontSize: size, lineHeight: 1.22, letterSpacing: "-0.02em", color: RK.ink, opacity: p01(f, at + 4 + i * 6, at + 12 + i * 6)}}>
          <MarkLine text={l.text} mark={l.mark} p={mk} />
        </div>
      ))}
      {note ? (
        <div style={{marginTop: 12, fontFamily: MONO, fontWeight: 700, fontSize: 25, letterSpacing: "0.06em", color: RK.red}}>{note}</div>
      ) : null}
    </div>
  );
};

// панель 3D-сцены: рамка «манхуа» графитом со скруглением; содержимое обрезается по панели
export const PANEL = {x: 44, y: 396, w: 992, h: 870};
export const ScenePanel: React.FC<{children: React.ReactNode; x?: number; y?: number; w?: number; h?: number; bg?: string}> = ({children, x = PANEL.x, y = PANEL.y, w = PANEL.w, h = PANEL.h, bg = "#ECE8E1"}) => (
  <div style={{position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 34, overflow: "hidden", background: bg, boxShadow: `10px 10px 0 ${RK.ink}`}}>
    {children}
    <div style={{position: "absolute", inset: 0, borderRadius: 34, border: `6px solid ${RK.ink}`, pointerEvents: "none"}} />
  </div>
);

// переход «сдвиг страницы»: новая сцена въезжает справа поверх старой за dur кадров, с тенью у кромки
export const ShiftIn: React.FC<{children: React.ReactNode; dur: number; from?: "right" | "bottom"}> = ({children, dur, from = "right"}) => {
  const f = useCurrentFrame();
  const k = p01(f, 0, dur, EIO);
  if (k >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const tr = from === "right" ? `${((1 - k) * 1080).toFixed(1)}px 0` : `0 ${((1 - k) * 1920).toFixed(1)}px`;
  return (
    <AbsoluteFill style={{translate: tr, boxShadow: from === "right" ? "-40px 0 60px rgba(38,38,38,0.35)" : "0 -40px 60px rgba(38,38,38,0.35)"}}>
      {children}
    </AbsoluteFill>
  );
};

// переход «перелистывание»: страница поворачивается от левого края
export const FlipIn: React.FC<{children: React.ReactNode; dur: number}> = ({children, dur}) => {
  const f = useCurrentFrame();
  const k = p01(f, 0, dur, EIO);
  if (k >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{perspective: 2400}}>
      <AbsoluteFill style={{transformOrigin: "0% 50%", transform: `rotateY(${(-95 * (1 - k)).toFixed(1)}deg)`, boxShadow: "-30px 0 60px rgba(0,0,0,.35)"}}>
        {children}
        <AbsoluteFill style={{background: "linear-gradient(90deg, rgba(38,38,38,.45), rgba(38,38,38,0) 60%)", opacity: 1 - k}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// «!» над героем: красный треугольник-предупреждение, дрожит
export const Alert: React.FC<{x: number; y: number; at: number; size?: number}> = ({x, y, at, size = 120}) => {
  const f = useCurrentFrame();
  const s = usePop(at, 8);
  if (s <= 0) return null;
  const jx = f < at + 14 ? (random(`ax${f}`) - 0.5) * 10 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{position: "absolute", left: x - size / 2 + jx, top: y - size, overflow: "visible", scale: String(0.3 + 0.7 * s), transformOrigin: "50% 100%"}}>
      <path d="M50 6 L95 88 Q97 94 90 94 L10 94 Q3 94 5 88 Z" fill={RK.red} stroke={RK.ink} strokeWidth={5} strokeLinejoin="round" />
      <rect x={44} y={34} width={12} height={34} rx={5} fill={RK.paper} />
      <circle cx={50} cy={80} r={7} fill={RK.paper} />
    </svg>
  );
};

// подпись-строка крупно (заголовок кадра): Inter 800, часть — под маркером
export const Title: React.FC<{x: number; y: number; w?: number; text: string; mark?: string; at: number; size?: number; color?: string; align?: "left" | "center"; out?: number}> = ({x, y, w = 952, text, mark, at, size = 64, color = RK.ink, align = "left", out}) => {
  const f = useCurrentFrame();
  const s = usePop(at, 16);
  if (s <= 0) return null;
  const gone = out !== undefined ? p01(f, out - 8, out, EIO) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        textAlign: align,
        fontFamily: INTER,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: "-0.03em",
        color,
        opacity: Math.min(1, s * 1.5) * (1 - gone),
        translate: `0 ${(1 - s) * 40}px`,
      }}
    >
      <MarkLine text={text} mark={mark} p={p01(f, at + 8, at + 24, EO)} />
    </div>
  );
};
