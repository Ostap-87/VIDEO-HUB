// Вариант «light»: надпись прорисовывается световой линией и наливается цветом.
// Студия сначала приглушена; по контурам букв бежит светящаяся линия (белая сердцевина + голубое свечение),
// рёбра пирамиды прорисовываются тем же светом, затем буквы снизу вверх наливаются синим (по уровню «налива» идёт
// светлая кромка), стекло пирамиды проявляется, и в момент, когда надпись готова, пирамида вспыхивает бликом
// (свечение рёбер + мягкая вспышка + анаморфный блик). В конце надпись получает объём и тень.
import React from "react";
import {Glyphs} from "./wordmark";
import {PYR_Y, type Layout} from "./layout";
import {easeInOutCubic, easeOutCubic, prog, smooth} from "./util";

const DASH = 1700;
const start = (i: number) => 0.05 + i * 0.03;
const DRAW = 0.42;
export const LIGHT_DONE = 0.96; // надпись налита — вспышка пирамиды
export const LIGHT_DEPTH: [number, number] = [0.98, 1.16]; // объём и тень проявляются

// пирамида в варианте «свет»: рёбра → стекло → вспышка
export const lightPyramid = (tau: number) => {
  const flash = Math.exp(-Math.pow((tau - LIGHT_DONE) / 0.075, 2));
  return {
    edges: easeInOutCubic(prog(tau, 0.0, 0.72)),
    glass: smooth(prog(tau, 0.34, 0.82)),
    glow: Math.max(0, 1.1 * (1 - smooth(prog(tau, 0.55, 0.9)))) + flash * 1.4,
    flash,
  };
};

export const LightLayer: React.FC<{L: Layout; tau: number; id: string}> = ({L, tau, id}) => {
  const strokeFade = 1 - smooth(prog(tau, 0.9, 1.12));
  return (
    <>
      <defs>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        {L.glyphs.map((g) => {
          const f = easeInOutCubic(prog(tau, start(g.i) + 0.22, start(g.i) + DRAW + 0.16));
          const top = g.ink.b + 6 - (g.ink.b - g.ink.t + 14) * f;
          return (
            <React.Fragment key={g.i}>
              <clipPath id={`${id}-lv${g.i}`} clipPathUnits="userSpaceOnUse">
                <rect x={g.ink.l - 10} y={top} width={g.ink.r - g.ink.l + 20} height={g.ink.b - top + 12} />
              </clipPath>
              <clipPath id={`${id}-gl${g.i}`} clipPathUnits="userSpaceOnUse">
                <text x={g.x} y={g.y} fontFamily={L.family} fontWeight={700} fontSize={L.fs}>
                  {g.ch}
                </text>
              </clipPath>
            </React.Fragment>
          );
        })}
      </defs>
      {/* налив цвета снизу вверх */}
      {L.glyphs.map((g) => {
        const f = prog(tau, start(g.i) + 0.22, start(g.i) + DRAW + 0.16);
        if (f <= 0) return null;
        const fe = easeInOutCubic(f);
        const lvl = g.ink.b + 6 - (g.ink.b - g.ink.t + 14) * fe;
        return (
          <g key={`f${g.i}`}>
            <g clipPath={`url(#${id}-lv${g.i})`}>
              <Glyphs L={L} only={(x) => x.i === g.i} fill={`url(#${id}-fill)`} />
            </g>
            {f < 1 ? (
              <g clipPath={`url(#${id}-gl${g.i})`}>
                <rect x={g.ink.l - 10} y={lvl - 5} width={g.ink.r - g.ink.l + 20} height={10} fill="#E0F2FE" opacity={0.95} filter={`url(#${id}-glow)`} />
                <rect x={g.ink.l - 10} y={lvl - 1.5} width={g.ink.r - g.ink.l + 20} height={3} fill="#FFFFFF" />
              </g>
            ) : null}
          </g>
        );
      })}
      {/* световая линия по контуру */}
      {strokeFade > 0.01
        ? L.glyphs.map((g) => {
            const p = prog(tau, start(g.i), start(g.i) + DRAW);
            if (p <= 0) return null;
            const off = DASH * (1 - easeOutCubic(p));
            const dash = {strokeDasharray: `${DASH} ${DASH}`, strokeDashoffset: off};
            return (
              <g key={`s${g.i}`} opacity={strokeFade}>
                <g filter={`url(#${id}-glow)`} opacity={0.95}>
                  <Glyphs L={L} only={(x) => x.i === g.i} fill="none" stroke="#38BDF8" strokeWidth={9} per={() => ({style: dash})} />
                </g>
                <Glyphs L={L} only={(x) => x.i === g.i} fill="none" stroke="#FFFFFF" strokeWidth={2.8} per={() => ({style: dash})} />
              </g>
            );
          })
        : null}
    </>
  );
};

// приглушённая студия в начале и вспышка пирамиды (HTML поверх 3D-сцены)
export const LightAtmosphere: React.FC<{tau: number; flash: number}> = ({tau, flash}) => {
  const dim = 1 - smooth(prog(tau, 0.1, 0.85));
  return (
    <>
      <div style={{position: "absolute", inset: 0, background: "rgba(24,32,62,0.24)", opacity: dim, mixBlendMode: "multiply"}} />
      <div
        style={{
          position: "absolute",
          left: 540 - 620,
          top: PYR_Y - 620,
          width: 1240,
          height: 1240,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(186,230,253,0.55) 38%, rgba(186,230,253,0) 100%)",
          opacity: flash * 0.75,
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -200,
          top: PYR_Y - 330 - 14,
          width: 1480,
          height: 28,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(255,255,255,1), rgba(125,211,252,0.6) 45%, rgba(125,211,252,0) 100%)",
          opacity: flash * 0.9,
          scale: `${0.6 + flash * 0.5} 1`,
          mixBlendMode: "screen",
        }}
      />
    </>
  );
};
