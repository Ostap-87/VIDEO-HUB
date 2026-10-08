// Логотип Aura Robotics — круглая «печать» над головой спикера (решение пользователя 08.10.2026).
// Кольцо «AURA ROBOTICS · AURA ROBOTICS ·» идёт по всему кругу без разрыва (textLength = длина окружности,
// два повтора, разделители-точки на равных расстояниях) и непрерывно вращается; в центре монограмма AR
// (вектор из логотипа пользователя) раз в несколько секунд делает 3D-поворот по вертикальной оси.
// Появление: печать «штампуется» с пружиной, кольцо прорисовывается, тонкая лимонная дуга-маркер обегает круг.
import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {loadFont} from "@remotion/google-fonts/Outfit";

const outfit = loadFont("normal", {weights: ["500"], subsets: ["latin"]});

// монограмма AR: вектор из source-videos/aura-robotics/логотип/ar-monogram.svg
export const AR_PATH =
  "M244,4 L270,46 L458,46 L474,49 L487,56 L496,64 L502,72 L508,85 L509,97 L510,98 L509,110 L506,120 L499,132 L489,142 L477,149 L462,153 L335,153 L360,195 L394,195 L465,307 L522,307 L456,196 L457,195 L469,195 L483,192 L504,183 L516,175 L526,166 L535,155 L541,145 L541,55 L530,38 L518,26 L505,17 L485,8 L464,4 Z M0,307 L58,307 L60,305 L186,96 L316,307 L374,307 L186,0 Z";
export const AR_VIEW = {w: 541, h: 307};

export const ArMonogram: React.FC<{width: number; color?: string}> = ({width, color = "#262626"}) => (
  <svg width={width} height={(width * AR_VIEW.h) / AR_VIEW.w} viewBox={`0 0 ${AR_VIEW.w} ${AR_VIEW.h}`}>
    <path d={AR_PATH} fill={color} fillRule="evenodd" />
  </svg>
);

export const AuraBadge: React.FC<{size?: number; spinSeconds?: number}> = ({size = 230, spinSeconds = 14}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const c = size / 2;
  const r = size * 0.385; // радиус строки текста
  const id = "aura-ring";
  const circ = 2 * Math.PI * r;
  const stamp = spring({frame, fps, config: {damping: 11, stiffness: 120, mass: 0.9}});
  const ringIn = interpolate(frame, [4, 26], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1)});
  const spin = (t / spinSeconds) * 360;
  // раз в 6 с монограмма делает полный 3D-оборот за 0,9 с
  const cycle = t % 6;
  const flip = interpolate(cycle, [4.6, 5.5], [0, 360], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)});
  const float = Math.sin(t * 1.6) * 2.5;
  // лимонная дуга-маркер обегает круг навстречу тексту
  const arc = -t * 50;
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        scale: String(0.4 + 0.6 * stamp),
        opacity: Math.min(1, stamp * 1.4),
        rotate: `${(1 - stamp) * -40}deg`,
        filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.35))",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{position: "absolute", inset: 0}}>
        <defs>
          <path id={id} d={`M ${c - r},${c} a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 ${-2 * r},0`} />
        </defs>
        <circle cx={c} cy={c} r={c - 2} fill="#F8F6F3" />
        <circle cx={c} cy={c} r={c - 7} fill="none" stroke="rgba(38,38,38,0.18)" strokeWidth={1.5} />
        <circle
          cx={c}
          cy={c}
          r={c - 4}
          fill="none"
          stroke="#FFF65D"
          strokeWidth={size * 0.03}
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * (c - 4) * 0.2} ${2 * Math.PI * (c - 4)}`}
          transform={`rotate(${arc} ${c} ${c})`}
          opacity={ringIn}
        />
        <g transform={`rotate(${spin} ${c} ${c})`} opacity={ringIn}>
          <text
            fontFamily={outfit.fontFamily}
            fontWeight={500}
            fontSize={size * 0.092}
            fill="#262626"
            letterSpacing={size * 0.004}
          >
            <textPath href={`#${id}`} textLength={circ} lengthAdjust="spacing">
              {"AURA ROBOTICS\u00A0·\u00A0AURA ROBOTICS\u00A0·\u00A0"}
            </textPath>
          </text>
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: 600,
          translate: `0px ${float}px`,
        }}
      >
        <div style={{rotate: `y ${flip}deg`, scale: String(interpolate(stamp, [0, 1], [1.6, 1]))}}>
          <ArMonogram width={size * 0.42} />
        </div>
      </div>
    </div>
  );
};
