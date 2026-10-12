// Гуманоид Aura в холсте, поставленном в точку кадра (для роликов: вступление и робот-ведущий CarouselReel;
// решение пользователя 12.10.2026: «использовать нового гуманоида и новую робособаку в самом начале ролика»).
// Модель — из 3D-арсенала: src/components/aura3d/AuraHumanoid.tsx. План — в пикселях кадра, как у маскота:
// stays [{at, x, face}] — где стоять к моменту at (x — px, где ступни; face — курс: −π/2 лицом к зрителю, 0 — вправо,
// −π — влево), между точками идёт шагами; gestures — жесты гуманоида (wave, point, pointUp, present, bow, nod, look, pull).
// y — линия ступней (px), scale 1 ≈ 315 px ростом (как маскот при scale 1). Холст стоит на месте (центр — anchor или первая
// точка), гуманоид ходит внутри него — ширины `span` (px при scale 1) хватает на шаги вправо-влево.
import React from "react";
import {ThreeCanvas} from "@remotion/three";
import {CameraLook, Lights} from "./aura3d/kit";
import {HumanoidModel, type HumanoidGesture} from "./aura3d/AuraHumanoid";

export const HSPOT = {H: 440, FOOT: 395, PX: 91.3}; // холст при scale 1, ступни (px от верха), px на единицу сцены
const CAM_Z = 9.0;
const CAM_Y = (HSPOT.FOOT - HSPOT.H / 2) / HSPOT.PX; // камера на такой высоте, чтобы пол (y = 0) пришёлся на FOOT

export type HumanoidSpotPlan = {stays: {at: number; x: number; face: number}[]; gestures?: HumanoidGesture[]};

export const AuraHumanoidSpot: React.FC<{plan: HumanoidSpotPlan; y: number; scale?: number; anchor?: number; span?: number; dpr?: number}> = ({
  plan,
  y,
  scale = 1,
  anchor,
  span = 340,
  dpr = 2,
}) => {
  const x0 = anchor ?? plan.stays[0].x;
  const k = HSPOT.PX * scale;
  const W = Math.round(span * scale);
  const H = Math.round(HSPOT.H * scale);
  return (
    <div style={{position: "absolute", left: x0 - W / 2, top: y - HSPOT.FOOT * scale, width: W, height: H, pointerEvents: "none"}}>
      <ThreeCanvas
        width={W}
        height={H}
        dpr={dpr}
        gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}}
        camera={{fov: 30, position: [0, CAM_Y, CAM_Z], near: 0.1, far: 100}}
        style={{position: "absolute", inset: 0}}
      >
        <CameraLook target={[0, CAM_Y, 0]} />
        <Lights />
        <HumanoidModel
          plan={{
            stays: plan.stays.map((s) => ({at: s.at, x: (s.x - x0) / k, z: 0, yaw: s.face})),
            gestures: plan.gestures,
          }}
        />
      </ThreeCanvas>
    </div>
  );
};
