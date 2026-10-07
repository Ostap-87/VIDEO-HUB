import React from "react";
import {random, useCurrentFrame, useVideoConfig} from "remotion";
import {loadFont} from "@remotion/google-fonts/Inter";

// Живой логотип GLOBAL TECH TOUR — точная копия шапки globaltechtour.ru (компонент с three.js на сайте):
// - пирамида с квадратным основанием: радиус основания 1.05, высота 1.3, 4 грани;
// - грани #38BDF8 с прозрачностью 0.55, все рёбра каркаса #1E3A8A;
// - камера: угол обзора 38°, наклон сцены rotation.x = -0.32;
// - вращение 0.9 рад/с вокруг оси, которая плавно «блуждает» (новая цель каждые 2–4.5 с, lerp 1.5/с);
// - буквы Inter 600, волна цвета #5168A1 ↔ #2563EB, период 2.6 с, задержка 0.06 с на символ.
// Вращение детерминированное (seed), чтобы каждый рендер был одинаковым.

const inter600 = loadFont("normal", {weights: ["600"], subsets: ["latin"]});

type V3 = [number, number, number];
type Q = [number, number, number, number]; // x, y, z, w

const FACE = "rgba(56,189,248,0.55)"; // #38BDF8, opacity .55
const EDGE = "#1E3A8A";
const ASH = [81, 104, 161]; // --color-ash-gray
const IRIS = [37, 99, 235]; // --color-electric-iris

// Вершины пирамиды как у CylinderGeometry(0, 1.05, 1.3, 4): вершина сверху, квадрат внизу
const H = 1.3;
const R = 1.05;
const APEX: V3 = [0, H / 2, 0];
const BASE: V3[] = [0, 1, 2, 3].map((k) => {
  const a = (k / 4) * Math.PI * 2;
  return [R * Math.sin(a), -H / 2, R * Math.cos(a)];
});
const VERTS: V3[] = [APEX, ...BASE];
const FACES = [
  [0, 1, 2],
  [0, 2, 3],
  [0, 3, 4],
  [0, 4, 1],
  [1, 2, 3],
  [1, 3, 4],
];

const qMul = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qAxis = (ax: V3, ang: number): Q => {
  const s = Math.sin(ang / 2);
  return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)];
};
const rot = (q: Q, v: V3): V3 => {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ];
};
const norm = (v: V3): V3 => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

// Ориентация на каждом кадре: та же логика, что на сайте, но с фиксированным seed. Кэшируется.
const cache = new Map<string, Q[]>();
const orientations = (fps: number, frames: number, seed: string): Q[] => {
  const key = `${fps}-${seed}`;
  let list = cache.get(key);
  if (list && list.length >= frames) return list;
  list = [];
  let n = 0;
  const rnd = () => random(`${seed}-${n++}`);
  const randomDir = (): V3 => {
    const z = rnd() * 2 - 1;
    const t = rnd() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    return [r * Math.cos(t), r * Math.sin(t), z];
  };
  let axis: V3 = [0, 1, 0];
  let target = randomDir();
  let clock = 0;
  let next = 1.5 + rnd() * 1.5;
  let q: Q = [0, 0, 0, 1];
  const dt = 1 / fps;
  for (let i = 0; i < frames; i++) {
    list.push(q);
    clock += dt;
    if (clock >= next) {
      target = randomDir();
      next = clock + 2 + rnd() * 2.5;
    }
    const k = Math.min(dt * 1.5, 1);
    axis = norm([axis[0] + (target[0] - axis[0]) * k, axis[1] + (target[1] - axis[1]) * k, axis[2] + (target[2] - axis[2]) * k]);
    q = qMul(q, qAxis(axis, 0.9 * dt));
  }
  cache.set(key, list);
  return list;
};

export const Pyramid: React.FC<{size: number; seed?: string}> = ({size, seed = "gtt"}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const q = orientations(fps, Math.max(durationInFrames, frame + 1), seed)[frame];
  const tilt = qAxis([1, 0, 0], -0.32);
  const camZ = (Math.sqrt(1.525) / Math.sin((38 * Math.PI) / 360)) * 1.55;
  const f = 1 / Math.tan((38 * Math.PI) / 360);
  const pts = VERTS.map((v) => {
    const p = rot(tilt, rot(q, v));
    const z = camZ - p[2];
    return {x: (p[0] * f) / z, y: (-p[1] * f) / z, z};
  });
  const toPx = (u: number) => (u * 0.5 + 0.5) * size;
  // Дальние грани рисуем первыми (грани полупрозрачные, видны и задние)
  const faces = FACES.map((idx) => ({idx, depth: idx.reduce((s, i) => s + pts[i].z, 0) / 3})).sort((a, b) => b.depth - a.depth);
  const edges = new Set<string>();
  FACES.forEach(([a, b, c]) =>
    [
      [a, b],
      [b, c],
      [c, a],
    ].forEach(([i, j]) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`)),
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display: "block", overflow: "visible"}}>
      {faces.map(({idx}, k) => (
        <polygon key={k} points={idx.map((i) => `${toPx(pts[i].x)},${toPx(pts[i].y)}`).join(" ")} fill={FACE} />
      ))}
      {[...edges].map((e) => {
        const [i, j] = e.split("-").map(Number);
        return (
          <line
            key={e}
            x1={toPx(pts[i].x)}
            y1={toPx(pts[i].y)}
            x2={toPx(pts[j].x)}
            y2={toPx(pts[j].y)}
            stroke={EDGE}
            strokeWidth={size / 70}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

// Волна цвета по буквам, как анимация logo-letter-shimmer на сайте
const Shimmer: React.FC<{text: string; fontSize: number; halo?: boolean}> = ({text, fontSize, halo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <span
      style={{
        fontFamily: inter600.fontFamily,
        fontWeight: 600,
        fontSize,
        letterSpacing: "-0.02em",
        whiteSpace: "pre",
        // без плашки на видео: мягкий светлый ореол, чтобы цвета сайта читались на любом фоне
        textShadow: halo
          ? "0 0 1.5px #fff, 0 0 1.5px #fff, 0 0 3px rgba(255,255,255,0.9), 0 2px 10px rgba(0,0,0,0.25)"
          : undefined,
      }}
    >
      {[...text].map((ch, i) => {
        const phase = (((t - i * 0.06) % 2.6) + 2.6) % 2.6 / 2.6; // 0..1
        const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2; // 0 → 1 → 0
        const e = tri < 0.5 ? 2 * tri * tri : 1 - Math.pow(-2 * tri + 2, 2) / 2; // ease-in-out
        const c = ASH.map((a, k) => Math.round(a + (IRIS[k] - a) * e));
        return (
          <span key={i} style={{color: `rgb(${c.join(",")})`, display: "inline-block"}}>
            {ch}
          </span>
        );
      })}
    </span>
  );
};

// Логотип целиком: на стеклянной светлой плашке (как шапка сайта), чтобы цвета сайта читались на любом видео
export const SiteLogo: React.FC<{scale?: number; glass?: boolean}> = ({scale = 1, glass = true}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10 * scale,
      padding: glass ? `${0 * scale}px ${36 * scale}px ${0 * scale}px ${6 * scale}px` : 0,
      borderRadius: 999,
      background: glass ? "rgba(255,255,255,0.82)" : undefined,
      backdropFilter: glass ? "blur(18px)" : undefined,
      WebkitBackdropFilter: glass ? "blur(18px)" : undefined,
      boxShadow: glass ? "0 12px 34px rgba(0,0,0,0.22)" : undefined,
    }}
  >
    <div style={{filter: glass ? undefined : "drop-shadow(0 0 1.5px #fff) drop-shadow(0 2px 8px rgba(0,0,0,0.25))"}}>
      <Pyramid size={(82 / 24) * 40 * scale} />
    </div>
    <Shimmer text="GLOBAL TECH TOUR" fontSize={40 * scale} halo={!glass} />
  </div>
);

// Превью логотипа для Studio и проверки: по центру на тёмном фоне
export const SiteLogoPreview: React.FC<{scale?: number; glass?: boolean}> = (p) => (
  <div style={{width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B0D14"}}>
    <SiteLogo {...p} />
  </div>
);
