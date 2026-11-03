// Манхуа-набор для роликов личного профиля (03.11.2026, ролик «Мой сайт» v2: «более креативный вариант… Remotion, больше
// спецэффектов и шрифтов, стиль маньхуа, моушн-дизайн, переходы и хуки, элементы графики… кинематографично»).
// Растр, линии концентрации (集中線), линии движения, взрыв, облачка речи (обычное и «крик»), иероглифы-звуки, панели комикса,
// плашка рассказчика, лента-скотч, телефон с настоящими экранами сайта, плёночное зерно, виньетка, кинополосы и переходы:
// чернильная клякса, косой разрез, глитч по полосам, перелистывание страницы, круг. Всё покадровое, без CSS-анимаций.
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";

export const C = {y: "#FFD92E", ink: "#15151D", ink2: "#191922", red: "#E8341C", seal: "#C8102E", paper: "#F7F4EC", bone: "#ECEAE3", cyan: "#3FE0FF"};
export const CL = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const p = (f: number, a: number, b: number, easing?: (x: number) => number) => interpolate(f, [a, b], [0, 1], {...CL, easing});

// тряска камеры: затухает за dur кадров
export const shake = (f: number, at: number, dur = 8, amp = 14, seed = "s"): [number, number] => {
  if (f < at || f > at + dur) return [0, 0];
  const k = 1 - (f - at) / dur;
  return [(random(`${seed}x${f}`) - 0.5) * 2 * amp * k, (random(`${seed}y${f}`) - 0.5) * 2 * amp * k];
};
export const sumShake = (f: number, list: [number, number?, number?][], seed = "c"): string => {
  let x = 0, y = 0;
  list.forEach(([at, dur, amp], i) => { const [a, b] = shake(f, at, dur ?? 8, amp ?? 14, seed + i); x += a; y += b; });
  return `${x.toFixed(1)}px ${y.toFixed(1)}px`;
};
// «шлёп»: пружина с перелётом, 1 — на месте
export const useSlam = (at: number, from = 1.6, damping = 11) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - at, fps, config: {damping, stiffness: 260, mass: 0.7}});
  return {on: f >= at, s, scale: from - (from - 1) * s};
};

export const Halftone: React.FC<{bg: string; dot: string; size?: number; r?: number; drift?: number}> = ({bg, dot, size = 22, r = 3.4, drift = 0.35}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{background: bg, backgroundImage: `radial-gradient(${dot} ${r}px, transparent ${r + 0.6}px)`, backgroundSize: `${size}px ${size}px`, backgroundPosition: `${(f * drift).toFixed(1)}px ${(f * drift * 0.6).toFixed(1)}px`}}
    />
  );
};

// линии концентрации из точки (cx, cy); каждые 2 кадра длина штрихов меняется — «дрожат», как в манге
export const SpeedLines: React.FC<{cx?: number; cy?: number; color: string; n?: number; inner?: number; seed?: string; opacity?: number}> = ({cx = 540, cy = 960, color, n = 120, inner = 380, seed = "sl", opacity = 1}) => {
  const f = useCurrentFrame();
  const k = Math.floor(f / 2);
  const R = 2600;
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (random(`${seed}a${i}`) - 0.5) * 0.05;
    const w = 0.003 + random(`${seed}w${i}`) * 0.011;
    const r0 = inner * (0.72 + random(`${seed}r${i}-${k}`) * 0.75);
    const pt = (ang: number, r: number) => `${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`;
    d += `M${pt(a, r0)}L${pt(a - w, R)}L${pt(a + w, R)}Z`;
  }
  return (
    <svg width={1080} height={1920} style={{position: "absolute", inset: 0, opacity}}>
      <path d={d} fill={color} />
    </svg>
  );
};

// линии движения (параллельные штрихи летят вдоль angle)
export const ActionLines: React.FC<{color: string; n?: number; speed?: number; angle?: number; seed?: string; opacity?: number}> = ({color, n = 46, speed = 70, angle = 0, seed = "al", opacity = 0.85}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{overflow: "hidden", opacity}}>
      <div style={{position: "absolute", left: -500, top: -500, width: 2080, height: 2920, rotate: `${angle}deg`}}>
        {Array.from({length: n}).map((_, i) => {
          const y = random(`${seed}y${i}`) * 2920;
          const len = 220 + random(`${seed}l${i}`) * 760;
          const th = 2 + random(`${seed}t${i}`) * 9;
          const x = ((random(`${seed}x${i}`) * 3000 + f * speed * (0.6 + random(`${seed}v${i}`))) % 3000) - 800;
          return <div key={i} style={{position: "absolute", left: x, top: y, width: len, height: th, background: color, borderRadius: th}} />;
        })}
      </div>
    </AbsoluteFill>
  );
};

// взрыв-звезда манги
export const Burst: React.FC<{x: number; y: number; r: number; color: string; stroke?: string; points?: number; rot?: number; scale?: number; seed?: string; sw?: number}> = ({x, y, r, color, stroke = C.ink, points = 18, rot = 0, scale = 1, seed = "b", sw = 9}) => {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r * (0.9 + random(`${seed}${i}`) * 0.28) : r * (0.6 + random(`${seed}${i}`) * 0.12);
    pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
  }
  const S = r * 2.8;
  return (
    <svg width={S} height={S} style={{position: "absolute", left: x - S / 2, top: y - S / 2, overflow: "visible"}}>
      <g transform={`translate(${S / 2},${S / 2}) rotate(${rot}) scale(${scale})`}>
        <polygon points={pts.join(" ")} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </g>
    </svg>
  );
};

// облачко речи: обычное (овал) или «крик» (зубцы); хвост — к точке tail (координаты внутри облачка)
export const Bubble: React.FC<{x: number; y: number; w: number; h: number; tail?: [number, number]; shout?: boolean; fill?: string; stroke?: string; children: React.ReactNode; scale?: number; opacity?: number; rot?: number; sw?: number}> = ({
  x, y, w, h, tail, shout = false, fill = "#fff", stroke = C.ink, children, scale = 1, opacity = 1, rot = 0, sw = 7,
}) => {
  const cx = w / 2, cy = h / 2;
  const N = shout ? 26 : 72;
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = shout ? (i % 2 ? 0.8 : 1.07) : 1;
    pts.push(`${(cx + Math.cos(a) * cx * rr).toFixed(1)},${(cy + Math.sin(a) * cy * rr).toFixed(1)}`);
  }
  let tailPts = "";
  if (tail) {
    const ang = Math.atan2(tail[1] - cy, tail[0] - cx);
    const b1 = [cx + Math.cos(ang - 0.22) * cx * 0.7, cy + Math.sin(ang - 0.22) * cy * 0.7];
    const b2 = [cx + Math.cos(ang + 0.22) * cx * 0.7, cy + Math.sin(ang + 0.22) * cy * 0.7];
    tailPts = `${b1[0]},${b1[1]} ${tail[0]},${tail[1]} ${b2[0]},${b2[1]}`;
  }
  return (
    <div style={{position: "absolute", left: x, top: y, width: w, height: h, scale: String(scale), opacity, rotate: `${rot}deg`, transformOrigin: tail ? `${tail[0]}px ${tail[1]}px` : "50% 50%"}}>
      <svg width={w} height={h} style={{position: "absolute", inset: 0, overflow: "visible"}}>
        <g stroke={stroke} strokeWidth={sw * 2} strokeLinejoin="round" fill={stroke}>
          <polygon points={pts.join(" ")} />
          {tail ? <polygon points={tailPts} /> : null}
        </g>
        <g fill={fill}>
          <polygon points={pts.join(" ")} />
          {tail ? <polygon points={tailPts} /> : null}
        </g>
      </svg>
      <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: `${h * 0.16}px ${w * 0.13}px`}}>{children}</div>
    </div>
  );
};

// иероглиф-звук (咚 唰 哇 轰): толстая обводка, выскакивает и трясётся
export const Sfx: React.FC<{text: string; x: number; y: number; size: number; color: string; stroke?: string; rot?: number; at: number; font: string; until?: number; shadow?: string}> = ({text, x, y, size, color, stroke = C.ink, rot = 0, at, font, until, shadow}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at || (until !== undefined && f > until)) return null;
  const s = spring({frame: f - at, fps, config: {damping: 8, stiffness: 240, mass: 0.6}});
  const [sx, sy] = shake(f, at, 12, 9, text);
  const out = until !== undefined ? p(f, until - 5, until) : 0;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, fontFamily: font, fontSize: size, color, lineHeight: 1, whiteSpace: "nowrap",
        WebkitTextStroke: `${(size * 0.075).toFixed(1)}px ${stroke}`, paintOrder: "stroke fill", textShadow: shadow,
        rotate: `${rot}deg`, scale: String((0.25 + 0.75 * s) * (1 + 0.3 * out)), opacity: 1 - out, translate: `${sx.toFixed(1)}px ${sy.toFixed(1)}px`,
      }}
    >
      {text}
    </div>
  );
};

// зерно плёнки: одна картинка шума, сдвиг каждый кадр
const GRAIN = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='400' height='400' filter='url(#n)'/></svg>",
)}`;
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.16}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{backgroundImage: `url("${GRAIN}")`, backgroundSize: "400px 400px", backgroundPosition: `${Math.floor(random(`gx${f}`) * 400)}px ${Math.floor(random(`gy${f}`) * 400)}px`, opacity, mixBlendMode: "overlay", pointerEvents: "none"}}
    />
  );
};
export const Vignette: React.FC<{strength?: number}> = ({strength = 0.42}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 46%, transparent 55%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: "none"}} />
);
export const Letterbox: React.FC<{h: number}> = ({h}) => (h <= 0 ? null : (
  <>
    <div style={{position: "absolute", left: 0, right: 0, top: 0, height: h, background: "#000"}} />
    <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: h, background: "#000"}} />
  </>
));
export const Flash: React.FC<{at: number; dur?: number; color?: string; max?: number}> = ({at, dur = 5, color = "#fff", max = 0.9}) => {
  const f = useCurrentFrame();
  if (f < at || f > at + dur) return null;
  return <AbsoluteFill style={{background: color, opacity: max * (1 - (f - at) / dur)}} />;
};

// плашка рассказчика (прямоугольник манги)
export const Narration: React.FC<{x: number; y: number; w?: number; children: React.ReactNode; at: number; font: string; size?: number; bg?: string; color?: string; sh?: string; rot?: number}> = ({x, y, w, children, at, font, size = 34, bg = C.paper, color = C.ink, sh = C.red, rot = 0}) => {
  const f = useCurrentFrame();
  const k = p(f, at, at + 8, EO);
  if (f < at) return null;
  return (
    <div style={{position: "absolute", left: x, top: y, width: w, background: bg, color, border: `5px solid ${C.ink}`, padding: "14px 20px", fontFamily: font, fontSize: size, lineHeight: 1.18, boxShadow: `9px 9px 0 ${sh}`, opacity: k, translate: `${(1 - k) * -80}px 0`, rotate: `${rot}deg`}}>
      {children}
    </div>
  );
};

// лента-скотч с текстом, рваные края
export const Tape: React.FC<{x: number; y: number; children: React.ReactNode; rot?: number; bg?: string; at: number; font: string; size?: number; color?: string}> = ({x, y, children, rot = -4, bg = C.ink, at, font, size = 44, color = C.y}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 12, stiffness: 300, mass: 0.6}});
  const teeth = (side: number) => Array.from({length: 9}).map((_, i) => `${side ? 100 - (i % 2) * 2.2 : (i % 2) * 2.2}% ${(i / 8) * 100}%`);
  return (
    <div style={{position: "absolute", left: x, top: y, rotate: `${rot}deg`, scale: String(1.35 - 0.35 * s), opacity: Math.min(1, s * 2)}}>
      <div style={{background: bg, color, fontFamily: font, fontSize: size, padding: "16px 38px", whiteSpace: "nowrap", clipPath: `polygon(${[...teeth(0), ...teeth(1).reverse()].join(",")})`, boxShadow: "0 10px 0 rgba(0,0,0,.25)"}}>{children}</div>
    </div>
  );
};

// кусок настоящего снимка сайта (975×2110) в рамке: crop — [x, y, w, h] снимка; zoom — медленный наезд
export const Shot: React.FC<{src: string; crop: [number, number, number, number]; w: number; h: number; zoom?: number; filter?: string}> = ({src, crop, w, h, zoom = 1, filter}) => {
  const [cx, cy, cw, ch] = crop;
  const s = Math.max(w / cw, h / ch) * zoom;
  return (
    <div style={{position: "absolute", inset: 0, overflow: "hidden"}}>
      <Img src={staticFile(src)} style={{position: "absolute", width: 975 * s, left: -(cx + cw / 2) * s + w / 2, top: -(cy + ch / 2) * s + h / 2, filter}} />
    </div>
  );
};

// панель комикса: многоугольник poly (точки в долях рамки), толстая чернильная обводка, «шлёп» и вспышка при появлении
export const Panel: React.FC<{x: number; y: number; w: number; h: number; poly?: [number, number][]; at: number; bg?: string; children?: React.ReactNode; from?: "scale" | "left" | "right" | "top" | "bottom"; sw?: number; rot?: number}> = ({x, y, w, h, poly, at, bg = C.paper, children, from = "scale", sw = 9, rot = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 13, stiffness: 230, mass: 0.7}});
  const P = poly ?? [[0, 0], [1, 0], [1, 1], [0, 1]];
  const pts = P.map(([a, b]) => `${(a * w).toFixed(1)},${(b * h).toFixed(1)}`).join(" ");
  const off = 1 - s;
  const tr = from === "left" ? `${-off * 1200}px 0` : from === "right" ? `${off * 1200}px 0` : from === "top" ? `0 ${-off * 1400}px` : from === "bottom" ? `0 ${off * 1400}px` : "0 0";
  const sc = from === "scale" ? 1.22 - 0.22 * s : 1;
  const flash = 1 - p(f, at + 1, at + 7);
  return (
    <div style={{position: "absolute", left: x, top: y, width: w, height: h, translate: tr, scale: String(sc), rotate: `${rot}deg`}}>
      <div style={{position: "absolute", inset: 0, clipPath: `polygon(${P.map(([a, b]) => `${a * 100}% ${b * 100}%`).join(",")})`, background: bg, overflow: "hidden"}}>
        {children}
        <div style={{position: "absolute", inset: 0, background: "#fff", opacity: flash * 0.85}} />
      </div>
      <svg width={w} height={h} style={{position: "absolute", inset: 0, overflow: "visible"}}>
        <polygon points={pts} fill="none" stroke={C.ink} strokeWidth={sw} strokeLinejoin="miter" />
      </svg>
    </div>
  );
};

// число набегает от нуля
export const countText = (f: number, at: number, dur: number, value: number, pre = "", suf = "") => {
  const v = Math.round(value * p(f, at, at + dur, Easing.out(Easing.cubic)));
  return `${pre}${v >= 10000 ? v.toLocaleString("ru-RU").replace(/ /g, " ") : v}${suf}`;
};

// буквы печатаются по одной
export const typed = (f: number, at: number, text: string, perChar = 2) => text.slice(0, Math.max(0, Math.min(text.length, Math.floor((f - at) / perChar) + 1)));

// RGB-глитч текста: красный и голубой слои сдвинуты, на кадрах глитча — сильнее
export const GlitchText: React.FC<{children: React.ReactNode; style: React.CSSProperties; amount: number; seed?: string}> = ({children, style, amount, seed = "g"}) => {
  const f = useCurrentFrame();
  const j = amount * (0.4 + random(`${seed}${f}`) * 0.8);
  const sl = amount > 0.2 ? (random(`${seed}s${f}`) - 0.5) * 40 * amount : 0;
  return (
    <div style={{position: "relative", ...style}}>
      <div style={{position: "absolute", inset: 0, color: C.red, translate: `${-j * 14}px ${sl * 0.2}px`, mixBlendMode: "multiply", opacity: amount > 0.02 ? 0.9 : 0}}>{children}</div>
      <div style={{position: "absolute", inset: 0, color: C.cyan, translate: `${j * 14}px ${-sl * 0.2}px`, mixBlendMode: "multiply", opacity: amount > 0.02 ? 0.9 : 0}}>{children}</div>
      <div style={{position: "relative", translate: `${sl}px 0`}}>{children}</div>
    </div>
  );
};

// телефон с настоящими экранами сайта. imgs — снимки 975×2110; mode "strip": шапка стоит, страница листается по keys
// ([кадр, номер экрана]); mode "swap": снимки целиком сменяют друг друга по keys (смена языка, с глитч-полосами)
export const Phone: React.FC<{w?: number; imgs: string[]; header?: string; keys?: [number, number][]; mode?: "strip" | "swap"; tapAt?: [number, number, number][]; glareAt?: number; glitchAt?: number[]; url?: string}> = ({w = 470, imgs, header, keys = [[0, 0]], mode = "strip", tapAt = [], glareAt, glitchAt = [], url = "ostapdotcenko.ru"}) => {
  const f = useCurrentFrame();
  const SW = w - 34, K = SW / 975, SH = Math.round(2110 * K), HH = 160 * K, BH = 1950 * K, SB = 40;
  // текущая позиция по ключам: переезд 12 кадров
  let pos = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [a, n] = keys[i];
    if (f >= a) pos = keys[i - 1][1] + (n - keys[i - 1][1]) * p(f, a, a + 12, EIO);
  }
  const g = glitchAt.reduce((acc, a) => Math.max(acc, f >= a && f < a + 6 ? 1 - (f - a) / 6 : 0), 0);
  const glare = glareAt !== undefined ? p(f, glareAt, glareAt + 22, EIO) : -1;
  return (
    <div style={{position: "relative", width: w, height: SH + 34 + SB, borderRadius: w * 0.13, background: "#0d0d12", padding: 17, boxShadow: "18px 22px 0 rgba(0,0,0,.35)"}}>
      <div style={{position: "relative", width: "100%", height: "100%", borderRadius: w * 0.1, overflow: "hidden", background: C.bone}}>
        <div style={{position: "absolute", left: 0, top: 0, right: 0, height: SB, background: C.bone, zIndex: 2}} />
        {mode === "strip" ? (
          <>
            <div style={{position: "absolute", left: 0, width: "100%", top: SB + HH, translate: `0 ${(-pos * BH).toFixed(1)}px`}}>
              {imgs.map((src) => (
                <div key={src} style={{position: "relative", width: "100%", height: BH, overflow: "hidden"}}>
                  <Img src={staticFile(src)} style={{position: "absolute", left: 0, top: -HH, width: "100%"}} />
                </div>
              ))}
            </div>
            {header ? (
              <div style={{position: "absolute", left: 0, top: SB, width: "100%", height: HH, overflow: "hidden", zIndex: 2}}>
                <Img src={staticFile(header)} style={{width: "100%", display: "block"}} />
              </div>
            ) : null}
          </>
        ) : (
          imgs.map((src, i) => {
            const vis = i === 0 ? 1 : p(f, (keys.find((k) => k[1] === i) ?? [1e9])[0], (keys.find((k) => k[1] === i) ?? [1e9])[0] + 2);
            return <Img key={src} src={staticFile(src)} style={{position: "absolute", left: 0, top: SB, width: "100%", opacity: vis}} />;
          })
        )}
        {g > 0 ? (
          <div style={{position: "absolute", inset: 0, zIndex: 5}}>
            {Array.from({length: 7}).map((_, i) => (
              <div key={i} style={{position: "absolute", left: (random(`pg${i}${f}`) - 0.5) * 60, top: random(`py${i}${f}`) * SH, width: "110%", height: 8 + random(`ph${i}${f}`) * 40, background: i % 2 ? C.red : C.cyan, opacity: 0.55 * g, mixBlendMode: "multiply"}} />
            ))}
          </div>
        ) : null}
        <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 62, background: "rgba(236,234,227,.95)", borderTop: "1px solid #D5D2C8", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center"}}>
          <span style={{background: "#DEDBD1", borderRadius: 14, padding: "7px 22px", font: "600 19px monospace", color: C.ink}}>{url}</span>
        </div>
        {tapAt.map(([a, x, y], i) => {
          const k = p(f, a - 6, a + 10);
          if (k <= 0 || k >= 1) return null;
          return <div key={i} style={{position: "absolute", left: x * K - 38, top: SB + y * K - 38, width: 76, height: 76, borderRadius: "50%", border: `6px solid ${C.red}`, background: "rgba(232,52,28,.25)", zIndex: 6, opacity: k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6, scale: String(k < 0.4 ? 1.3 - 0.5 * (k / 0.4) : 0.8 + 0.7 * (k - 0.4))}} />;
        })}
        {glare >= 0 && glare < 1 ? (
          <div style={{position: "absolute", inset: 0, zIndex: 7, background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,.75) 48%, transparent 60%)", translate: `${(-1 + 2 * glare) * 120}% 0`}} />
        ) : null}
      </div>
      <div style={{position: "absolute", left: "50%", top: 23, width: 104, height: 26, marginLeft: -52, borderRadius: 99, background: "#0d0d12", zIndex: 8}} />
    </div>
  );
};

// ── переходы: новая сцена открывается поверх старой ────────────────────────────────────────────────────────────────
// чернильная клякса: несколько неровных пятен растут из точки, плюс брызги
export const InkReveal: React.FC<{children: React.ReactNode; dur: number; id: string; x?: number; y?: number}> = ({children, dur, id, x = 540, y = 960}) => {
  const f = useCurrentFrame();
  const k = p(f, 0, dur, Easing.in(Easing.quad));
  if (k >= 1) return <>{children}</>;
  const blob = (bx: number, by: number, r: number, seed: string) => {
    let d = "";
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rr = r * (1 + 0.22 * Math.sin(a * 3 + random(seed) * 6) + 0.12 * Math.sin(a * 7 + random(seed + "b") * 6));
      d += `${i ? "L" : "M"}${(bx + Math.cos(a) * rr).toFixed(1)},${(by + Math.sin(a) * rr).toFixed(1)}`;
    }
    return d + "Z";
  };
  const R = 2300 * k;
  const blobs = [blob(x, y, R, id + "0"), blob(x - 360, y - 520, R * 0.55, id + "1"), blob(x + 380, y + 560, R * 0.6, id + "2"), blob(x + 300, y - 700, R * 0.45, id + "3"), blob(x - 420, y + 700, R * 0.5, id + "4")];
  for (let i = 0; i < 10; i++) blobs.push(blob(x + (random(id + "dx" + i) - 0.5) * 1000 * (0.4 + k), y + (random(id + "dy" + i) - 0.5) * 1600 * (0.4 + k), 18 + random(id + "dr" + i) * 50 * (0.3 + k * 2), id + "d" + i));
  return (
    <>
      <svg width={0} height={0} style={{position: "absolute"}}>
        <clipPath id={`ink-${id}`} clipPathUnits="userSpaceOnUse">
          <path d={blobs.join("")} />
        </clipPath>
      </svg>
      <AbsoluteFill style={{clipPath: `url(#ink-${id})`}}>{children}</AbsoluteFill>
    </>
  );
};
// косой разрез: новая сцена въезжает по диагонали, по кромке — красная полоса
export const SlashReveal: React.FC<{children: React.ReactNode; dur: number; color?: string}> = ({children, dur, color = C.y}) => {
  const f = useCurrentFrame();
  const k = p(f, 0, dur, EIO);
  if (k >= 1) return <>{children}</>;
  const d = -1000 + k * 3100;
  return (
    <>
      <AbsoluteFill style={{clipPath: `polygon(0 0, ${d}px 0, ${d - 1000}px 1920px, 0 1920px)`}}>{children}</AbsoluteFill>
      <div style={{position: "absolute", left: d - 1000, top: 0, width: 1000, height: 1920, clipPath: "polygon(1000px 0, 1060px 0, 60px 1920px, 0 1920px)", background: color}} />
    </>
  );
};
// глитч: новая сцена проступает горизонтальными полосами в случайном порядке, полосы сдвинуты, поверх — RGB-полосы
export const GlitchReveal: React.FC<{children: React.ReactNode; dur: number; seed?: string}> = ({children, dur, seed = "gr"}) => {
  const f = useCurrentFrame();
  const k = p(f, 0, dur);
  if (k >= 1) return <>{children}</>;
  const N = 18, hh = 1920 / N;
  let path = "";
  for (let i = 0; i < N; i++) {
    if (random(`${seed}${i}`) < k * 1.15) {
      const off = (random(`${seed}o${i}${f}`) - 0.5) * 160 * (1 - k);
      path += `M${off},${i * hh}L${1080 + off},${i * hh}L${1080 + off},${(i + 1) * hh}L${off},${(i + 1) * hh}Z`;
    }
  }
  return (
    <>
      <AbsoluteFill style={{clipPath: path ? `path('${path}')` : "inset(50% 50% 50% 50%)"}}>{children}</AbsoluteFill>
      {Array.from({length: 6}).map((_, i) => (
        <div key={i} style={{position: "absolute", left: 0, right: 0, top: random(`${seed}b${i}${f}`) * 1920, height: 10 + random(`${seed}h${i}${f}`) * 70, background: i % 2 ? C.red : C.cyan, opacity: 0.7 * (1 - k), mixBlendMode: "screen"}} />
      ))}
    </>
  );
};
// перелистывание: страница поворачивается от корешка слева, на ней тень
export const PageReveal: React.FC<{children: React.ReactNode; dur: number}> = ({children, dur}) => {
  const f = useCurrentFrame();
  const k = p(f, 0, dur, EIO);
  if (k >= 1) return <>{children}</>;
  return (
    <AbsoluteFill style={{perspective: 2400}}>
      <AbsoluteFill style={{transformOrigin: "0% 50%", transform: `rotateY(${(-100 * (1 - k)).toFixed(1)}deg)`, boxShadow: "-30px 0 60px rgba(0,0,0,.4)"}}>
        {children}
        <AbsoluteFill style={{background: "linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,0) 60%)", opacity: 1 - k}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
// круг из точки
export const CircleReveal: React.FC<{children: React.ReactNode; dur: number; x?: number; y?: number}> = ({children, dur, x = 540, y = 960}) => {
  const f = useCurrentFrame();
  const k = p(f, 0, dur, Easing.in(Easing.cubic));
  if (k >= 1) return <>{children}</>;
  return <AbsoluteFill style={{clipPath: `circle(${(k * 2300).toFixed(0)}px at ${x}px ${y}px)`}}>{children}</AbsoluteFill>;
};

// рукописная стрелка рисуется линией
export const HandArrow: React.FC<{x: number; y: number; w: number; h: number; at: number; dur?: number; color?: string; d: string; sw?: number}> = ({x, y, w, h, at, dur = 12, color = C.red, d, sw = 8}) => {
  const f = useCurrentFrame();
  const k = p(f, at, at + dur, EO);
  if (f < at) return null;
  return (
    <svg width={w} height={h} style={{position: "absolute", left: x, top: y, overflow: "visible"}}>
      <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
    </svg>
  );
};
