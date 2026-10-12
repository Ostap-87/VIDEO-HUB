// Витрина 3D-арсенала Aura (решение пользователя 12.10.2026): каждая модель по очереди показывает, что умеет.
// 1080×1920, 30 fps. Фон — пергамент с сеткой сайта Aura, сверху подпись-«пилюля» с названием, модели — в 3D-сцене Stage.
// Модели и их планы — src/components/aura3d/, описание — reels-studio/CLAUDE.md, раздел «3D-арсенал Aura».
import React from "react";
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {STYLES, MONO} from "./carousel/kit";
import {Stage, CargoBox, Shadow, type Cam} from "../components/aura3d/kit";
import {AgvModel} from "../components/aura3d/AuraAgv";

const s = STYLES.aura;

const Label: React.FC<{kicker: string; title: string}> = ({kicker, title}) => (
  <div style={{position: "absolute", top: 300, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18}}>
    <div style={{fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em", color: "#6B6B76", textTransform: "uppercase"}}>{kicker}</div>
    <div style={{fontFamily: s.head, fontWeight: 700, fontSize: 64, letterSpacing: "-0.02em", color: "#262626", background: "#FFF65D", padding: "6px 24px", borderRadius: 14}}>{title}</div>
  </div>
);

// сегмент: своя сцена и подпись, плавно проявляется и гаснет
const Segment: React.FC<{dur: number; cam: Cam; kicker: string; title: string; children: React.ReactNode}> = ({dur, cam, kicker, title, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const o = interpolate(frame, [0, 0.35 * fps, (dur - 0.35) * fps, dur * fps], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <AbsoluteFill style={{opacity: o}}>
      <Stage cam={cam}>{children}</Stage>
      <Label kicker={kicker} title={title} />
    </AbsoluteFill>
  );
};

export const SHOWCASE = {agv: 8};
export const showcaseSeconds = () => Object.values(SHOWCASE).reduce((a, b) => a + b, 0);

export const Aura3DShowcase: React.FC = () => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={s.bg}>
      <AbsoluteFill style={s.pattern} />
      <Sequence from={0} durationInFrames={SHOWCASE.agv * fps} premountFor={fps}>
        <Segment dur={SHOWCASE.agv} cam={{pos: [6.2, 5.2, 9.5], target: [0, 0.3, 0], fov: 30}} kicker="3D · Aura Robotics" title="AGV подвозит коробки">
          <AgvModel
            plan={{
              stays: [
                {at: 0, x: -7, z: 0.6, yaw: 0},
                {at: 2.6, x: 0, z: 0.6, yaw: 0},
                {at: 3.4, x: 0, z: 0.6, yaw: Math.PI / 2},
                {at: 6.0, x: 0, z: 0.6, yaw: Math.PI / 2},
                {at: 6.7, x: 0, z: 0.6, yaw: 0},
                {at: 8.6, x: 6.5, z: 0.6, yaw: 0},
              ],
              boxes: 2,
              lift: [[3.5, 0], [4.0, 1], [4.9, 1], [5.3, 0]],
              loads: [4.7],
              unloads: [5.6],
            }}
          />
          <Shadow w={1.4} d={1.2} p={[-2.6, 0, -1.6]} o={0.6} />
          <CargoBox p={[-2.6, 0.21, -1.6]} rot={[0, 0.3, 0]} />
        </Segment>
      </Sequence>
    </AbsoluteFill>
  );
};
