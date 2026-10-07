import React from "react";
import {AbsoluteFill} from "remotion";
import {theme, textInsetBottom} from "../theme";
import {mono} from "../fonts";

export type Tone = "light" | "dark";

const pillBase: React.CSSProperties = {
  position: "absolute",
  top: 30,
  fontFamily: mono.fontFamily,
  fontWeight: 500,
  fontSize: 26,
  letterSpacing: "0.02em",
  padding: "16px 30px",
  borderRadius: 999,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

// Лёгкая дымка внизу карточки под текстом (blur, полупрозрачная)
const Haze: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "64%",
      backdropFilter: "blur(30px)",
      WebkitBackdropFilter: "blur(30px)",
      background:
        "linear-gradient(to bottom, rgba(238,238,242,0) 0%, rgba(238,238,242,0.55) 40%, rgba(238,238,242,0.8) 100%)",
      WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 38%)",
      maskImage: "linear-gradient(to bottom, transparent 0%, #000 38%)",
    }}
  />
);

// Карточка со скруглением и тонкой рамкой: фото не залито тёмным градиентом.
// Плашка сайта слева-сверху меняет цвет под фон (tone), счётчик справа-сверху.
export const Frame: React.FC<{
  media: React.ReactNode;
  tone?: Tone;
  counter?: string;
  children?: React.ReactNode;
}> = ({media, tone = "light", counter, children}) => {
  const f = theme.frame;
  const dark = tone === "dark";
  return (
    <div
      style={{
        position: "absolute",
        left: f.x,
        right: f.x,
        top: f.top,
        bottom: f.bottom,
        borderRadius: f.radius,
        overflow: "hidden",
        background: theme.colors.surface,
        border: `2px solid ${theme.colors.line}`,
        boxShadow: "0 40px 80px rgba(23,23,29,0.12)",
      }}
    >
      <AbsoluteFill>{media}</AbsoluteFill>
      <Haze />
      <div
        style={{
          ...pillBase,
          left: 30,
          background: dark ? "rgba(12,58,110,0.82)" : "rgba(255,255,255,0.86)",
          color: dark ? "#EAF2FF" : theme.colors.text,
        }}
      >
        {theme.site}
      </div>
      {counter ? (
        <div
          style={{
            ...pillBase,
            right: 30,
            background: "rgba(255,255,255,0.86)",
            color: theme.colors.text,
          }}
        >
          {counter}
        </div>
      ) : null}
      {children}
    </div>
  );
};

// Текстовая область: прижата к низу безопасной зоны Instagram
export const TextArea: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      position: "absolute",
      left: theme.pad,
      right: theme.pad,
      bottom: textInsetBottom,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
    }}
  >
    {children}
  </div>
);
