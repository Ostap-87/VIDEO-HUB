// Вариант «shards»: буквы собираются из стеклянных осколков.
// Каждая буква разрезана на 8 треугольных осколков (сетка 2×2 со смещёнными узлами). Осколки разлетаются вокруг
// пирамиды и ближе к камере (крупнее), вращаются в 3D, ловят блики и прилетают на свои места; на посадке —
// вспышка по кромке, стеклянный налёт тает, остаётся синий кусок буквы. Плоский осколок в 3D-повороте рисуется
// аффинной матрицей (верхний блок 2×2 матрицы поворота) — честная проекция без CSS-3D.
// Размытие в движении: на быстрых участках осколок рисуется 4 «под-кадрами» за половину кадра (затвор 180°).
import React, {useMemo} from "react";
import {CAM_Z} from "./stage3d";
import {inkAt, PYR_Y, type Layout} from "./layout";
import {Glyphs} from "./wordmark";
import {easeOutCubic, easeOutQuart, prog, rng, smooth} from "./util";

type P2 = [number, number];
type Piece = {
  g: number; // номер буквы
  tri: P2[];
  cx: number;
  cy: number;
  ink: boolean; // есть ли под осколком часть буквы
  s: number; // старт полёта, с
  d: number; // длительность, с
  from: [number, number, number];
  axis: [number, number, number];
  ang: number;
  arc: number;
};

const makePieces = (L: Layout): Piece[] => {
  const r = rng(20261012);
  const out: Piece[] = [];
  L.glyphs.forEach((g) => {
    const pad = 5;
    const l = g.ink.l - pad;
    const t = g.ink.t - pad;
    const w = g.ink.r - g.ink.l + pad * 2;
    const h = g.ink.b - g.ink.t + pad * 2;
    const P: P2[][] = [];
    for (let row = 0; row <= 2; row++) {
      P.push([]);
      for (let col = 0; col <= 2; col++) {
        const inner = row === 1 && col === 1;
        const edgeX = col === 1 && (row === 0 || row === 2);
        const edgeY = row === 1 && (col === 0 || col === 2);
        const jx = inner || edgeX ? (r() - 0.5) * 0.42 : 0;
        const jy = inner || edgeY ? (r() - 0.5) * 0.42 : 0;
        P[row].push([l + (col / 2 + jx / 2) * w, t + (row / 2 + jy / 2) * h]);
      }
    }
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const a = P[row][col];
        const b = P[row][col + 1];
        const c = P[row + 1][col + 1];
        const d = P[row + 1][col];
        const tris = (row + col + g.i) % 2 === 0 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
        tris.forEach((tri) => {
          const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
          const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
          // есть ли буква под осколком: центр и точки ближе к вершинам
          let ink = inkAt(L, cx, cy) > 60;
          for (const v of tri) if (inkAt(L, cx + (v[0] - cx) * 0.6, cy + (v[1] - cy) * 0.6) > 60) ink = true;
          if (!ink && r() < 0.45) return; // часть пустых стеклянных осколков не нужна
          // разлёт: от центра пирамиды наружу, с разбросом, ближе к камере
          const dx = cx - 540;
          const dy = cy - PYR_Y;
          const base = Math.atan2(dy, dx) + (r() - 0.5) * 1.1;
          const dist = 420 + r() * 620;
          const z = 380 + r() * 1150;
          const ax: [number, number, number] = [r() - 0.5, r() - 0.5, (r() - 0.5) * 0.6];
          const al = Math.hypot(...ax) || 1;
          out.push({
            g: g.i,
            tri,
            cx,
            cy,
            ink,
            s: 0.02 + (g.i / Math.max(1, L.glyphs.length - 1)) * 0.24 + r() * 0.12,
            d: 0.5 + r() * 0.14,
            from: [cx + Math.cos(base) * dist, cy + Math.sin(base) * dist, z],
            axis: [ax[0] / al, ax[1] / al, ax[2] / al],
            ang: (r() < 0.5 ? -1 : 1) * (2.6 + r() * 3.2),
            arc: (r() - 0.5) * 220,
          });
        });
      }
    }
  });
  return out;
};

// матрица поворота вокруг оси (Родриг)
const rotM = (ax: [number, number, number], a: number) => {
  const [x, y, z] = ax;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const t = 1 - c;
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
  ];
};

const LIGHT = (() => {
  const l = [-0.45, 0.62, 0.64];
  const v = [0, 0, 1];
  const h = [l[0] + v[0], l[1] + v[1], l[2] + v[2]];
  const n = Math.hypot(...h);
  return h.map((q) => q / n);
})();

// положение осколка в момент tau (с от начала сборки)
const pose = (pc: Piece, tau: number) => {
  const p = prog(tau, pc.s, pc.s + pc.d);
  const e = easeOutQuart(p);
  const X = pc.from[0] + (pc.cx - pc.from[0]) * e;
  const Y = pc.from[1] + (pc.cy - pc.from[1]) * e - Math.sin(Math.PI * e) * pc.arc * (1 - e);
  const Z = pc.from[2] * (1 - e);
  const R = rotM(pc.axis, pc.ang * Math.pow(1 - easeOutCubic(p), 1.15));
  const k = CAM_Z / (CAM_Z - Z);
  const sx = 540 + (X - 540) * k;
  const sy = 960 + (Y - 960) * k;
  // y экрана вниз: x' = a·dx + c·dy, y' = b·dx + d·dy
  const a = k * R[0][0];
  const b = -k * R[1][0];
  const c = -k * R[0][1];
  const d = k * R[1][1];
  const n = [R[0][2], R[1][2], R[2][2]];
  const spec = Math.pow(Math.abs(n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]), 48);
  return {p, sx, sy, a, b, c, d, spec, k};
};

export const ShardsLayer: React.FC<{L: Layout; tau: number; id: string; fps: number}> = ({L, tau, id, fps}) => {
  const pieces = useMemo(() => makePieces(L), [L]);
  const glyphOf = useMemo(() => new Map(L.glyphs.map((g) => [g.i, g])), [L]);
  const items: React.ReactNode[] = [];
  pieces.forEach((pc, k) => {
    if (tau < pc.s) return;
    const now = pose(pc, tau);
    const prev = pose(pc, tau - 0.5 / fps);
    const moved = Math.hypot(now.sx - prev.sx, now.sy - prev.sy) + Math.abs(now.a - prev.a) * 60 + Math.abs(now.d - prev.d) * 60;
    const samples = moved > 2 ? 4 : 1;
    const land = pc.s + pc.d * 0.78;
    const landK = smooth(prog(tau, land - 0.05, land + 0.1));
    const flash = Math.exp(-Math.pow((tau - land) / 0.055, 2));
    const appear = smooth(prog(tau, pc.s, pc.s + 0.08));
    const solo = pc.ink ? 1 : 1 - smooth(prog(tau, land - 0.12, land + 0.02)); // пустые осколки растворяются на подлёте
    const pts = pc.tri.map((v) => `${v[0].toFixed(1)},${v[1].toFixed(1)}`).join(" ");
    const g = glyphOf.get(pc.g)!;
    for (let j = 0; j < samples; j++) {
      const q = j === 0 ? now : pose(pc, tau - (j / (samples - 1)) * (0.5 / fps));
      const op = (samples > 1 ? 0.5 : 1) * appear * solo;
      if (op < 0.01) continue;
      items.push(
        <g
          key={`${k}-${j}`}
          transform={`matrix(${q.a.toFixed(4)} ${q.b.toFixed(4)} ${q.c.toFixed(4)} ${q.d.toFixed(4)} ${q.sx.toFixed(2)} ${q.sy.toFixed(2)}) translate(${(-pc.cx).toFixed(2)} ${(-pc.cy).toFixed(2)})`}
          opacity={op}
        >
          <g clipPath={`url(#${id}-c${k})`}>
            {pc.ink ? <Glyphs L={L} only={(x) => x.i === g.i} fill={`url(#${id}-fill)`} /> : null}
            <polygon points={pts} fill={`url(#${id}-glass)`} opacity={(pc.ink ? 0.62 : 0.9) * (1 - landK)} />
            <polygon points={pts} fill="#FFFFFF" opacity={Math.min(0.95, q.spec * 0.9 + flash * 0.55) * (pc.ink ? 1 : 0.8)} />
          </g>
          <polygon
            points={pts}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.8}
            strokeLinejoin="round"
            opacity={Math.min(1, (0.85 + flash) * (1 - landK) + flash * 0.6)}
          />
        </g>,
      );
    }
  });
  return (
    <>
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
          <stop offset="0.45" stopColor="#E0F2FE" stopOpacity={0.55} />
          <stop offset="1" stopColor="#7DD3FC" stopOpacity={0.5} />
        </linearGradient>
        {pieces.map((pc, k) => (
          <clipPath key={k} id={`${id}-c${k}`} clipPathUnits="userSpaceOnUse">
            <polygon points={pc.tri.map((v) => `${v[0].toFixed(1)},${v[1].toFixed(1)}`).join(" ")} />
          </clipPath>
        ))}
      </defs>
      {items}
    </>
  );
};

// когда все осколки на местах (для перехода к чистой надписи)
export const SHARDS_DONE = 0.98;
