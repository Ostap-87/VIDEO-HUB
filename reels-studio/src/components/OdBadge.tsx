// Знак личного сайта ostapdotcenko.ru в роликах (бренд od, брендбук — POST-HUB OSTAPDOTCENKO/BRAND/BRAND.md):
// красная печать-штамп (пунктир 3 px, поворот −12°, моно-текст по кругу, «ОД» в центре) и рядом бумажная плашка
// «Остап Доценко.» (фамилия на маркере) — рамка 2 px чернилами, жёсткая офсетная тень без размытия, квадратные углы, как шапка сайта.
// Появление: печать «шлёпается» с пружиной (крупно → на место с поворотом), плашка выезжает из-под неё;
// дальше кольцо текста медленно вращается, печать чуть «дышит».
import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {display, mono} from "../fonts";

const INK = "#191922";
const RED = "#FF4A1F";
const PAPER = "#F7F4EC";
const BONE = "#EDEAE2";
const MARKER = "#FFD92E";

export const OdStamp: React.FC<{size?: number; spinSeconds?: number}> = ({size = 132, spinSeconds = 18}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const c = size / 2;
  const r = size * 0.36;
  const id = "od-ring";
  const circ = 2 * Math.PI * r;
  const slam = spring({frame, fps, config: {damping: 12, stiffness: 170, mass: 0.8}});
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        scale: String(1.9 - 0.9 * slam),
        opacity: Math.min(1, slam * 1.6),
        rotate: `${-12 + (1 - slam) * -26 + Math.sin(t * 1.3) * 1.2}deg`,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{position: "absolute", inset: 0}}>
        <defs>
          <path id={id} d={`M ${c - r},${c} a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 ${-2 * r},0`} />
        </defs>
        <circle cx={c} cy={c} r={c - 2} fill={PAPER} />
        <circle cx={c} cy={c} r={c - 4} fill="none" stroke={RED} strokeWidth={3} strokeDasharray="7 5" />
        <circle cx={c} cy={c} r={size * 0.25} fill="none" stroke={RED} strokeWidth={1.5} opacity={0.7} />
        <g transform={`rotate(${(t / spinSeconds) * 360} ${c} ${c})`}>
          <text fontFamily={mono.fontFamily} fontWeight={500} fontSize={size * 0.085} fill={RED} letterSpacing={size * 0.004}>
            <textPath href={`#${id}`} textLength={circ} lengthAdjust="spacing">
              {"OSTAPDOTCENKO.RU · ©26 · "}
            </textPath>
          </text>
        </g>
        <text
          x={c}
          y={c + size * 0.085}
          textAnchor="middle"
          fontFamily={display.fontFamily}
          fontWeight={700}
          fontSize={size * 0.24}
          fill={RED}
          letterSpacing={-size * 0.005}
        >
          ОД
        </text>
      </svg>
    </div>
  );
};

// Печать + плашка с именем, как первый экран сайта: «Остап Доценко.» — фамилия на жёлтом маркере, красная точка.
// width ≈ 560 px при scale 1.
export const OdBadge: React.FC<{scale?: number; first?: string; last?: string}> = ({scale = 1, first = "Остап", last = "Доценко"}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const slide = interpolate(frame, [6, 20], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1)});
  // маркер «проводится» под фамилией, потом появляется красная точка
  const marker = interpolate(frame, [20, 32], [0, 100], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1)});
  const dot = spring({frame: frame - 32, fps, config: {damping: 10, stiffness: 220}});
  return (
    <div style={{display: "flex", alignItems: "center", scale: String(scale), transformOrigin: "left center"}}>
      <div style={{position: "relative", zIndex: 2}}>
        <OdStamp size={132} />
      </div>
      <div
        style={{
          marginLeft: -26,
          paddingLeft: 42,
          paddingRight: 26,
          height: 78,
          display: "flex",
          alignItems: "center",
          background: BONE,
          border: `2px solid ${INK}`,
          boxShadow: `8px 8px 0 ${INK}`,
          clipPath: `inset(-20px ${(1 - slide) * 100}% -20px -20px)`,
          opacity: slide > 0 ? 1 : 0,
          fontFamily: display.fontFamily,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: "-0.01em",
          color: INK,
          whiteSpace: "nowrap",
        }}
      >
        {first}&nbsp;
        <span
          style={{
            backgroundImage: `linear-gradient(${MARKER}, ${MARKER})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${marker}% 46%`,
            backgroundPosition: "0% 88%",
          }}
        >
          {last}
        </span>
        <span style={{color: RED, display: "inline-block", scale: String(dot)}}>.</span>
      </div>
    </div>
  );
};
