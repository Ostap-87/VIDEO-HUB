import React from "react";
import {AbsoluteFill} from "remotion";
import {theme} from "../theme";

// Отладочная рамка: показывает, где интерфейс Instagram перекроет кадр.
// Включается переключателем showSafeZone в панели Props.
export const SafeZone: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: "none"}}>
    <div
      style={{
        position: "absolute",
        left: theme.safe.side,
        right: theme.safe.side,
        top: theme.safe.top,
        bottom: theme.safe.bottom,
        border: "3px dashed rgba(255,0,80,0.8)",
      }}
    />
  </AbsoluteFill>
);
