// «Гости» Reels Aura из карусели (решение пользователя 12.10.2026, вариант B: «по дням AGV → манипулятор → роборука → танец
// собаки, и снова по кругу, от темы карусели не зависит»). Гость — модель 3D-арсенала в своей сцене Stage: прямоугольник кадра,
// пол на линии `floor` (px от верха прямоугольника), масштаб `k` (px на единицу сцены). Камера смотрит горизонтально, поэтому
// модель на плоскости z = 0 ровно в масштабе k, а пол — тонкая полоса с тенями.
// Сцены (время — секунды от начала Sequence):
//  - agv: AGV въезжает сбоку (`from` = 1 справа, −1 слева) с двумя коробками, останавливается, поднимает площадку;
//    `leaveAt` — уезжает в ту же сторону, откуда приехал;
//  - arm: манипулятор между двумя столами переносит коробку справа налево и возвращается домой (~4,2 с);
//  - hand: роборука шевелит пальцами, берёт кубик щипком с правой подставки, переносит на левую (~4,4 с);
//  - dog — без своей сцены: танцует сама робособака ролика (AuraDog `dances`).
import React from "react";
import {Stage, CargoBox, Pedestal, Shadow, type Cam, type V3} from "./kit";
import {AgvModel} from "./AuraAgv";
import {ArmModel, HOME} from "./AuraArm";
import {HandModel, HandStand, handReach} from "./AuraHand";

export type GuestKind = "agv" | "arm" | "hand" | "dog";
export const GUEST_ROTATION: GuestKind[] = ["agv", "arm", "hand", "dog"];
export type GuestRegion = {left: number; top: number; width: number; height: number; floor: number; k: number};

const TAN = Math.tan((15 * Math.PI) / 180);
// камера: пол (y = 0, z = 0) — на линии floor, k px на единицу; cx — какая точка сцены по x в центре прямоугольника
export const guestCam = (r: GuestRegion, cx = 0, look = 0): Cam => {
  const D = r.height / (2 * r.k * TAN);
  const h = (r.floor - r.height / 2) / r.k;
  return {pos: [cx, h + look, D], target: [cx, h, 0], fov: 30};
};

const AgvScene: React.FC<{from: 1 | -1; reach: number; leaveAt?: number}> = ({from, reach, leaveAt}) => {
  const yaw = from > 0 ? Math.PI : 0; // едет передом к центру
  const stays = [
    {at: 0, x: from * (leaveAt ? Math.min(reach, 1.1) : reach), z: 0, yaw}, // во вступлении на первом кадре (обложка) AGV уже в кадре
    {at: 1.3, x: 0, z: 0, yaw: yaw + from * 0.35},
    ...(leaveAt ? [{at: leaveAt, x: 0, z: 0, yaw: yaw + from * 0.35}, {at: leaveAt + 1.6, x: from * reach, z: 0, yaw: yaw + Math.PI}] : []),
  ];
  return <AgvModel plan={{stays, boxes: 2, lift: [[1.5, 0], [2.0, 1], ...(leaveAt ? ([[leaveAt - 0.4, 1], [leaveAt, 0]] as [number, number][]) : [])]}} />;
};

const PICK: V3 = [1.1, 0.78, 0.75];
const DROP: V3 = [-1.1, 0.78, 0.75];
const up = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
const ArmScene: React.FC = () => (
  <group rotation={[0, -0.35, 0]}>
    <Pedestal p={[PICK[0], 0, PICK[2]]} />
    <Pedestal p={[DROP[0], 0, DROP[2]]} />
    <Shadow w={1.4} d={1.2} p={[PICK[0], 0, PICK[2]]} o={0.5} />
    <ArmModel
      plan={{
        keys: [
          {at: 0, j: HOME, grip: 0.5},
          {at: 0.6, p: up(PICK, 0.6), tool: Math.PI, j6: 0},
          {at: 1.05, p: PICK},
          {at: 1.3, grip: 0.36},
          {at: 1.7, p: up(PICK, 0.65), grip: 0.36},
          {at: 2.6, p: up(DROP, 0.65), j6: 0.8, grip: 0.36},
          {at: 3.0, p: DROP, j6: 0.8, grip: 0.36},
          {at: 3.25, grip: 0.5},
          {at: 3.6, p: up(DROP, 0.6), j6: 0.8},
          {at: 4.3, j: HOME},
        ],
        items: [{start: PICK, carry: [[1.3, 3.2]]}],
      }}
    />
  </group>
);

const HAND_A: V3 = [0.25, 0.55, 0.1];
const HAND_B: V3 = [-0.45, 0.55, 0.1];
const RA: V3 = [-1.2, Math.PI / 2, 0];
const RB: V3 = [-1.15, Math.PI / 2 + 0.45, 0.25];
const HandScene: React.FC = () => (
  <group position={[0.1, 0, 0]}>
    <HandStand p={[HAND_A[0], 0, HAND_A[2]]} />
    <HandStand p={[HAND_B[0], 0, HAND_B[2]]} />
    <HandModel
      plan={{
        keys: [
          {at: 0, pose: "open", p: [0.9, 0.45, -0.1], rot: [0, 0.55, 0]},
          {at: 1.0, pose: "open"},
          {at: 1.5, pose: "pinchOpen", p: up(handReach(HAND_A, RA), 0.28), rot: RA},
          {at: 1.9, p: handReach(HAND_A, RA)},
          {at: 2.15, pose: "hold"},
          {at: 2.5, p: up(handReach(HAND_A, RA), 0.32)},
          {at: 3.2, p: up(handReach(HAND_B, RB), 0.32), rot: RB},
          {at: 3.6, p: handReach(HAND_B, RB)},
          {at: 3.85, pose: "pinchOpen"},
          {at: 4.4, p: up(handReach(HAND_B, RB), 0.3), pose: "relaxed"},
        ],
        wiggle: [[0.1, 1.0]],
        items: [{start: HAND_A, size: 0.1, carry: [[2.2, 3.85]]}],
      }}
    />
  </group>
);

// сцена гостя в прямоугольнике кадра; dog — null (танцует собака ролика)
export const GuestStage: React.FC<{kind: GuestKind; r: GuestRegion; from?: 1 | -1; leaveAt?: number; dpr?: number; look?: number}> = ({
  kind,
  r,
  from = 1,
  leaveAt,
  dpr = 1,
  look = 0.6,
}) => {
  if (kind === "dog") return null;
  const cx = kind === "hand" ? -0.1 : 0;
  return (
    <Stage cam={guestCam(r, cx, look)} left={r.left} top={r.top} width={r.width} height={r.height} dpr={dpr}>
      {kind === "agv" ? <AgvScene from={from} reach={r.width / 2 / r.k + 1.4} leaveAt={leaveAt} /> : null}
      {kind === "arm" ? <ArmScene /> : null}
      {kind === "hand" ? <HandScene /> : null}
      {kind === "agv" ? <CargoBox p={[0, -5, 0]} /> : null}
    </Stage>
  );
};
