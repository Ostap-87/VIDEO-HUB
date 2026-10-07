import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {theme} from "../theme";

// Нейтральный фон карточки, пока фото или видео не подключены
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const x = 50 + 18 * Math.sin(frame / 70);
  const y = 30 + 12 * Math.cos(frame / 90);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x}% ${y}%, ${theme.colors.surface} 0%, ${theme.colors.line} 85%)`,
      }}
    />
  );
};
