// Витрина 3D-арсенала Aura (решение пользователя 12.10.2026): каждая модель по очереди показывает, что умеет.
// 1080×1920, 30 fps. Фон — пергамент с сеткой сайта Aura, сверху подпись-«пилюля» с названием, модели — в 3D-сцене Stage.
// Модели и их планы — src/components/aura3d/, описание — reels-studio/CLAUDE.md, раздел «3D-арсенал Aura».
import React from "react";
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {STYLES, MONO} from "./carousel/kit";
import {Stage, CargoBox, Shadow, type Cam} from "../components/aura3d/kit";
import {AgvModel} from "../components/aura3d/AuraAgv";
import {ArmModel, HOME} from "../components/aura3d/AuraArm";
import {Pedestal} from "../components/aura3d/kit";
import {DogModel} from "../components/aura3d/AuraDog";
import {HandModel, HandStand, handReach} from "../components/aura3d/AuraHand";
import {HumanoidModel} from "../components/aura3d/AuraHumanoid";
import type {V3} from "../components/aura3d/kit";

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

export const SHOWCASE = {humanoid: 12, agv: 8, arm: 9, dog: 11, hand: 9.5};
export const showcaseSeconds = () => Object.values(SHOWCASE).reduce((a, b) => a + b, 0);

export const Aura3DShowcase: React.FC = () => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={s.bg}>
      <AbsoluteFill style={s.pattern} />
      <Sequence from={0} durationInFrames={SHOWCASE.humanoid * fps} premountFor={fps}>
        <Segment dur={SHOWCASE.humanoid} cam={{pos: [1.9, 2.6, 11.4], target: [0, 1.95, 0], fov: 30}} kicker="3D · Aura Robotics" title="Гуманоид">
          <HumanoidModel
            plan={{
              stays: [
                {at: 0, x: -4.6, z: 0, yaw: 0},
                {at: 3.4, x: 0, z: 0, yaw: 0},
                {at: 4.0, x: 0, z: 0, yaw: -Math.PI / 2},
              ],
              gestures: [
                {at: 4.0, kind: "wave"},
                {at: 6.7, kind: "present"},
                {at: 8.7, kind: "point"},
                {at: 10.4, kind: "bow"},
              ],
            }}
          />
        </Segment>
      </Sequence>
      <Sequence from={SHOWCASE.humanoid * fps} durationInFrames={SHOWCASE.agv * fps} premountFor={fps}>
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
      <Sequence from={(SHOWCASE.humanoid + SHOWCASE.agv) * fps} durationInFrames={SHOWCASE.arm * fps} premountFor={fps}>
        <Segment dur={SHOWCASE.arm} cam={{pos: [8.4, 3.9, 9.4], target: [0.6, 1.25, 0], fov: 32}} kicker="3D · Aura Robotics" title="Манипулятор">
          <Pedestal p={[1.75, 0, 0.95]} />
          <Pedestal p={[1.75, 0, -0.95]} />
          <ArmModel
            plan={{
              keys: [
                {at: 0, j: HOME, grip: 0.5},
                {at: 0.9, j: [0.9, 0.1, 0.9, 0, Math.PI / 2, 0], grip: 0.5},
                {at: 1.8, j: [-0.8, -0.15, 1.1, 1.2, 2.2, 1.5]},
                {at: 2.7, p: [1.5, 2.6, 0], tool: Math.PI / 2, j4: 0, j6: 0},
                {at: 3.5, p: [1.75, 1.3, 0.95], j6: 0},
                {at: 4.1, p: [1.75, 0.78, 0.95]},
                {at: 4.45, grip: 0.36},
                {at: 5.0, p: [1.75, 1.45, 0.95], grip: 0.36},
                {at: 6.0, p: [1.75, 1.45, -0.95], j6: 0.8, grip: 0.36},
                {at: 6.6, p: [1.75, 0.78, -0.95], j6: 0.8, grip: 0.36},
                {at: 6.95, grip: 0.5},
                {at: 7.5, p: [1.75, 1.45, -0.95], j6: 0.8},
                {at: 8.5, j: HOME},
              ],
              items: [{start: [1.75, 0.78, 0.95], carry: [[4.5, 6.9]]}],
            }}
          />
        </Segment>
      </Sequence>
      <Sequence from={(SHOWCASE.humanoid + SHOWCASE.agv + SHOWCASE.arm) * fps} durationInFrames={SHOWCASE.dog * fps} premountFor={fps}>
        <Segment dur={SHOWCASE.dog} cam={{pos: [1.2, 2.0, 7.2], target: [0, 0.75, 0], fov: 30}} kicker="3D · Aura Robotics" title="Робособака">
          <DogModel
            plan={{
              stays: [
                {at: 0, x: -4.2, z: 0, yaw: 0},
                {at: 2.6, x: 0, z: 0, yaw: 0},
                {at: 3.1, x: 0, z: 0, yaw: -Math.PI / 2 + 0.35},
                {at: 9.3, x: 0, z: 0, yaw: -Math.PI / 2 + 0.35},
                {at: 11.5, x: 4.2, z: 0, yaw: 0},
              ],
              actions: [
                {at: 3.2, kind: "stand", dur: 2.2},
                {at: 5.4, kind: "dance", dur: 4.0},
              ],
            }}
          />
        </Segment>
      </Sequence>
      <Sequence from={(SHOWCASE.humanoid + SHOWCASE.agv + SHOWCASE.arm + SHOWCASE.dog) * fps} durationInFrames={SHOWCASE.hand * fps} premountFor={fps}>
        <Segment dur={SHOWCASE.hand} cam={{pos: [0.5, 1.75, 6.6], target: [-0.15, 0.8, 0], fov: 30}} kicker="3D · Aura Robotics" title="Роборука">
          <HandStand p={[HAND_A[0], 0, HAND_A[2]]} />
          <HandStand p={[HAND_B[0], 0, HAND_B[2]]} />
          <HandModel plan={HAND_PLAN} />
        </Segment>
      </Sequence>
    </AbsoluteFill>
  );
};

// роборука: помахать пальцами, взять кубик щипком с правой подставки, перенести по дуге на левую, отпустить, помахать
const HAND_A: V3 = [-0.2, 0.55, 0.15];
const HAND_B: V3 = [-0.85, 0.55, -0.05];
const R1: V3 = [-1.2, Math.PI / 2, 0];
const R2: V3 = [-1.15, Math.PI / 2 + 0.45, 0.25];
const up = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
const HAND_PLAN = {
  keys: [
    {at: 0, pose: "open" as const, p: [0.5, 0.3, -0.1] as V3, rot: [0, 0.55, 0] as V3},
    {at: 2.7, pose: "open" as const},
    {at: 3.4, pose: "relaxed" as const, p: [0.55, 0.75, 0.05] as V3, rot: [-0.5, 1.0, 0] as V3},
    {at: 4.1, pose: "pinchOpen" as const, p: up(handReach(HAND_A, R1), 0.28), rot: R1},
    {at: 4.7, p: handReach(HAND_A, R1)},
    {at: 5.05, pose: "hold" as const},
    {at: 5.6, p: up(handReach(HAND_A, R1), 0.35)},
    {at: 6.6, p: up(handReach(HAND_B, R2), 0.35), rot: R2},
    {at: 7.2, p: handReach(HAND_B, R2)},
    {at: 7.5, pose: "pinchOpen" as const},
    {at: 8.0, p: up(handReach(HAND_B, R2), 0.3), pose: "relaxed" as const},
    {at: 8.8, pose: "open" as const, p: [0.5, 0.3, -0.1] as V3, rot: [0, 0.55, 0] as V3},
  ],
  wiggle: [[0.3, 2.7], [8.7, 9.6]] as [number, number][],
  items: [{start: HAND_A, size: 0.1, carry: [[5.1, 7.45]] as [number, number][]}],
};
