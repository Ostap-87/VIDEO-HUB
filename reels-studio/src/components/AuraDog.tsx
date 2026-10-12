// Робособака Aura в маленьком холсте, поставленном в точку кадра (для роликов: вступление и сценка CarouselReel).
// Модель — общая из 3D-арсенала: src/components/aura3d/AuraDog.tsx (как Unitree Go2 в стиле Aura, ходит, встаёт
// на задние лапы, танцует). Здесь собака стоит на месте: x, y — где стоят лапы (px кадра), scale (1 ≈ 95 px ростом),
// face — поворот (0 — боком мордой вправо, −0.6 — вправо и к зрителю, −2.5 — влево и к зрителю), hops — моменты (с),
// когда подпрыгивает, dances / stands — когда танцует / встаёт на задние лапы ({at, dur}).
import React from "react";
import {ThreeCanvas} from "@remotion/three";
import {CameraLook, Lights} from "./aura3d/kit";
import {DogModel, type DogAction} from "./aura3d/AuraDog";

export const DOG = {W: 300, H: 240, FOOT: 172}; // холст при scale 1 и где на нём стоят лапы (px от верха)

export const AuraDog: React.FC<{
  x: number;
  y: number;
  scale?: number;
  face?: number;
  hops?: number[];
  dances?: {at: number; dur?: number}[];
  stands?: {at: number; dur?: number}[];
  dpr?: number;
}> = ({x, y, scale = 1, face = -0.6, hops = [], dances = [], stands = [], dpr = 2}) => {
  const actions: DogAction[] = [
    ...hops.map((at) => ({at, kind: "hop" as const})),
    ...dances.map((d) => ({...d, kind: "dance" as const})),
    ...stands.map((d) => ({...d, kind: "stand" as const})),
  ];
  return (
    <div style={{position: "absolute", left: x - (DOG.W * scale) / 2, top: y - DOG.FOOT * scale, width: DOG.W * scale, height: DOG.H * scale, pointerEvents: "none"}}>
      <ThreeCanvas
        width={Math.round(DOG.W * scale)}
        height={Math.round(DOG.H * scale)}
        dpr={dpr}
        gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}}
        camera={{fov: 30, position: [0.5, 1.15, 4.6], near: 0.1, far: 100}}
        style={{position: "absolute", inset: 0}}
      >
        <CameraLook target={[0, 0.52, 0]} />
        <Lights />
        <DogModel plan={{stays: [{at: -10, x: 0, z: 0, yaw: face}], actions}} />
      </ThreeCanvas>
    </div>
  );
};
