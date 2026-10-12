// Чистая надпись GLOBAL TECH TOUR (SVG поверх 3D-сцены): синий градиент бренда, тонкий светлый кант сверху,
// объём (экструзия на 7 px), мягкая и контактная тени, бегущий блик (как logo-letter-shimmer на сайте).
import React from "react";
import {mono} from "../../fonts";
import type {Glyph, Layout} from "./layout";

export const BLUE_TOP = "#4A86F7";
export const BLUE = "#2563EB";
export const BLUE_BOTTOM = "#1C4ED8";

// буквы надписи как SVG-текст на своих местах
export const Glyphs: React.FC<{
  L: Layout;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  only?: (g: Glyph) => boolean;
  per?: (g: Glyph) => React.SVGProps<SVGTextElement>;
}> = ({L, fill, stroke, strokeWidth, only, per}) => (
  <>
    {L.glyphs
      .filter((g) => (only ? only(g) : true))
      .map((g) => (
        <text
          key={g.i}
          x={g.x}
          y={g.y}
          fontFamily={L.family}
          fontWeight={700}
          fontSize={L.fs}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          {...(per ? per(g) : {})}
        >
          {g.ch}
        </text>
      ))}
  </>
);

// градиенты и фильтры надписи (id с префиксом, чтобы несколько SVG не мешали друг другу)
export const WordmarkDefs: React.FC<{id: string; shineX?: number}> = ({id, shineX = -9999}) => (
  <defs>
    <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={BLUE_TOP} />
      <stop offset="0.48" stopColor={BLUE} />
      <stop offset="1" stopColor={BLUE_BOTTOM} />
    </linearGradient>
    <linearGradient id={`${id}-shine`} gradientUnits="userSpaceOnUse" x1={shineX - 230} y1={0} x2={shineX + 230} y2={170}>
      <stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
      <stop offset="0.38" stopColor="#7DD3FC" stopOpacity={0} />
      <stop offset="0.47" stopColor="#BAE6FD" stopOpacity={0.55} />
      <stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.95} />
      <stop offset="0.53" stopColor="#BAE6FD" stopOpacity={0.55} />
      <stop offset="0.62" stopColor="#7DD3FC" stopOpacity={0} />
      <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
    </linearGradient>
    <filter id={`${id}-soft`} x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="16" />
    </filter>
    <filter id={`${id}-contact`} x="-10%" y="-30%" width="120%" height="160%">
      <feGaussianBlur stdDeviation="4" />
    </filter>
  </defs>
);

const EXTRUDE = ["#1E47C2", "#1C42B4", "#1A3DA6", "#183898", "#16338A", "#152F7E", "#142B72"];

// depth: 0..1 — сколько объёма и тени (в варианте «свет» объём проявляется последним)
export const WordmarkBody: React.FC<{L: Layout; id: string; depth?: number; shine?: boolean; rim?: number}> = ({
  L,
  id,
  depth = 1,
  shine = false,
  rim = 1,
}) => (
  <>
    {depth > 0 ? (
      <>
        <g opacity={0.2 * depth} filter={`url(#${id}-soft)`} transform="translate(16 38)">
          <Glyphs L={L} fill="#0E1A44" />
        </g>
        <g opacity={0.22 * depth} filter={`url(#${id}-contact)`} transform="translate(4 11)">
          <Glyphs L={L} fill="#0E1A44" />
        </g>
        {EXTRUDE.map((c, k) => {
          const n = EXTRUDE.length - k; // от дальнего слоя к ближнему
          const d = n * depth;
          return (
            <g key={k} transform={`translate(${(d * 0.42).toFixed(2)} ${(d * 0.95).toFixed(2)})`}>
              <Glyphs L={L} fill={EXTRUDE[n - 1] ?? c} />
            </g>
          );
        })}
      </>
    ) : null}
    {rim > 0 ? (
      <g transform="translate(0 -1.6)" opacity={0.9 * rim}>
        <Glyphs L={L} fill="#FFFFFF" />
      </g>
    ) : null}
    <Glyphs L={L} fill={`url(#${id}-fill)`} />
    {shine ? <Glyphs L={L} fill={`url(#${id}-shine)`} /> : null}
  </>
);

// плашка сайта под надписью (аутро): белая «пилюля» с моноширинным адресом, как плашка сайта в роликах
export const SitePill: React.FC<{L: Layout; p: number}> = ({L, p}) => {
  const y = L.box.b + 92;
  return (
    <div
      style={{
        position: "absolute",
        left: 540,
        top: y,
        translate: `-50% ${(-50 + (1 - p) * 40).toFixed(1)}%`,
        opacity: p,
        padding: "16px 34px 16px 30px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.86)",
        border: "2px solid #D5D5DD",
        boxShadow: "0 18px 40px rgba(23,23,29,0.12), 0 2px 6px rgba(23,23,29,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: mono.fontFamily,
        fontWeight: 500,
        fontSize: 36,
        letterSpacing: "0.06em",
        color: "#17171D",
        whiteSpace: "nowrap",
      }}
    >
      <svg width={26} height={26} viewBox="0 0 32 32">
        <path d="M16 5L27 26H5Z" fill={BLUE} />
      </svg>
      globaltechtour.ru
    </div>
  );
};
