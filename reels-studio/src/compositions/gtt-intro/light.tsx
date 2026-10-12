// Вариант «light»: надпись прорисовывается световой линией и наливается цветом.
// Студия сначала приглушена; по контурам букв бежит светящаяся линия (белая сердцевина + голубое свечение),
// рёбра пирамиды прорисовываются тем же светом, затем буквы снизу вверх наливаются синим (по уровню «налива» идёт
// светлая кромка), стекло пирамиды проявляется, и в момент, когда надпись готова, пирамида вспыхивает бликом
// (свечение рёбер + мягкая вспышка + анаморфный блик). В конце надпись получает объём и тень.
import React from "react";
import {Glyphs} from "./wordmark";
import {PYR_Y, type Layout} from "./layout";
import {easeInOutCubic, prog, smooth} from "./util";

const start = (i: number) => 0.04 + i * 0.028;
const DRAW = 0.5;
export const LIGHT_DONE = 0.96; // надпись налита — вспышка пирамиды
export const LIGHT_DEPTH: [number, number] = [0.98, 1.16]; // объём и тень проявляются

// пирамида в варианте «свет»: рёбра → стекло → вспышка
export const lightPyramid = (tau: number) => {
  const flash = Math.exp(-Math.pow((tau - LIGHT_DONE) / 0.075, 2));
  return {
    edges: easeInOutCubic(prog(tau, 0.0, 0.72)),
    glass: smooth(prog(tau, 0.34, 0.82)),
    glow: Math.max(0, 1.1 * (1 - smooth(prog(tau, 0.55, 0.9)))),
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
            // штрих длиной в контур буквы: линия «бежит» по контуру и замыкается к концу
            const D = Math.max(200, g.perim);
            const off = D * (1 - easeInOutCubic(p));
            const dash = {strokeDasharray: `${D.toFixed(0)} ${(D * 2).toFixed(0)}`, strokeDashoffset: off};
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

// вспышка пирамиды (HTML поверх 3D-сцены): мягкое свечение и звёздный блик на вершине пирамиды
export const studioDim = (tau: number) => 1 - smooth(prog(tau, 0.1, 0.85));

export const LightFlash: React.FC<{flash: number; apex: [number, number]}> = ({flash, apex}) => {
  if (flash < 0.01) return null;
  const [ax, ay] = apex;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 540 - 640,
          top: PYR_Y - 640,
          width: 1280,
          height: 1280,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(186,230,253,0.45) 40%, rgba(186,230,253,0) 100%)",
          opacity: flash * 0.6,
          mixBlendMode: "screen",
        }}
      />
      {/* звёздный блик: яркое ядро и два луча */}
      <div style={{position: "absolute", left: ax, top: ay, width: 0, height: 0, opacity: flash, mixBlendMode: "screen"}}>
        <div
          style={{
            position: "absolute",
            left: -110,
            top: -110,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(255,255,255,1), rgba(186,230,253,0.7) 30%, rgba(125,211,252,0) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -520 * (0.5 + flash * 0.5),
            top: -5,
            width: 1040 * (0.5 + flash * 0.5),
            height: 10,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(255,255,255,1), rgba(125,211,252,0.5) 50%, rgba(125,211,252,0) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -4,
            top: -190 * (0.5 + flash * 0.5),
            width: 8,
            height: 380 * (0.5 + flash * 0.5),
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(255,255,255,1), rgba(125,211,252,0.45) 50%, rgba(125,211,252,0) 100%)",
          }}
        />
      </div>
    </>
  );
};
