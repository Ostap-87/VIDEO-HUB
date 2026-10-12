import React from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {z} from "zod";
import {GlassStage, type PyramidState} from "./gtt-intro/stage3d";
import {easeOutCubic, prog} from "./gtt-intro/util";

export const gttIntroSchema = z.object({
  variant: z.enum(["shards", "blocks", "light"]),
  mode: z.enum(["intro", "outro"]),
});
export type GttIntroProps = z.infer<typeof gttIntroSchema>;

export const GttIntro: React.FC<GttIntroProps> = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const appear = easeOutCubic(prog(t, 0, 0.9));
  const pyr: PyramidState = {
    x: 540,
    y: 930,
    height: 700,
    yaw: 0.55 + 0.9 * t + 2.6 * (1 - Math.exp(-2.2 * t)),
    pitch: 0.3 + 0.05 * Math.sin(1.1 * t),
    roll: 0.06 * Math.sin(1.3 * t + 0.4),
    scale: 0.75 + 0.25 * appear,
    glass: 1,
    edges: 1,
    glow: 0,
  };
  return (
    <AbsoluteFill style={{background: "#EEEEF2"}}>
      <GlassStage pyramid={pyr} zoom={1 + 0.04 * t} bgZoom={1 + 0.015 * t} />
    </AbsoluteFill>
  );
};

// длительность: интро 1,8 с, аутро 1,5 с
export const gttIntroSeconds = (mode: "intro" | "outro") => (mode === "intro" ? 1.8 : 1.5);
