// «Робокитай», сезон 2 · серия 2 · Застава (07.11.2026) — цех клиента, куда приехал робот: бетонный пол с жёлтой разметкой,
// высокая стена с ленточными окнами, колонны, электрошкаф на стене, синяя магистраль сжатого воздуха. Посередине — большой
// ящик из реек, в нём Титан (`ArmModel skin="industrial"`). Шкаф управления робота — серая тумба с экраном и лампой.
// Миры (`SiteWorld`):
// - siteCrowd — холодное открытие: закрытый ящик посреди цеха, вокруг люди с поднятыми телефонами (вспышки и «Ну что,
//   когда?» — в 2D), камера медленно обходит ящик;
// - siteNoPower — попытка: стенки ящика лежат на полу, Титан стоит без движения, кабель лежит на полу и не доходит до шкафа
//   (красный огонёк), приходит инженер завода с сумкой и садится на крышку ящика;
// - siteGate — кризис: проходная — турникет-трипод, будка охраны, красная лампа; инженер ждёт по ту сторону;
// - siteScan — озарение: Скаут обходит площадку с лидаром, на полу проступает красный контур фундамента, шкаф и воздух
//   подсвечены красным;
// - siteReady — решение и развязка: фундамент с лимонными анкерами, кабель в лотке светится, воздух подведён, ограждение со
//   световой завесой, Титан перекладывает настоящие коробки с поддона на поддон, двое операторов у пульта, Шустрик привёз партию.
import React from "react";
import * as THREE from "three";
import {AgvModel} from "../../components/aura3d/AuraAgv";
import {ArmModel, HOME, type ArmItem, type ArmKey} from "../../components/aura3d/AuraArm";
import {DogModel} from "../../components/aura3d/AuraDog";
import {Pallet, palletSlot} from "../../components/aura3d/Conveyor";
import {Hose, Shadow, type Cam, type V3} from "../../components/aura3d/kit";
import {Worker3D} from "./drama3d";
import {LidarSweep} from "./scene3d";

export type SiteId = "siteCrowd" | "siteNoPower" | "siteGate" | "siteScan" | "siteReady";
const LEMON = "#FFF65D";
const RED = "#E5383B";
const INK = "#262626";
const WOOD = "#C9A46A";
const WOOD_D = "#8A6A3A";
const sm = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ===== цех =====
const CAB: V3 = [-7.6, 0, -1.4]; // электрошкаф на левой стене
const CTRL: V3 = [2.1, 0, -1.3]; // шкаф управления робота
const Shop: React.FC<{redCab?: number; redAir?: number}> = ({redCab = 0, redAir = 0}) => (
  <>
    <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[34, 22]} />
      <meshStandardMaterial color="#CBC6BD" roughness={0.95} />
    </mesh>
    {/* жёлтая разметка проходов */}
    {[
      [0, 3.6, 18, 0.12],
      [0, -3.4, 18, 0.12],
      [-5.2, 0.1, 0.12, 7.0],
      [5.2, 0.1, 0.12, 7.0],
    ].map(([x, z, w, d], i) => (
      <mesh key={i} position={[x, 0.005, z]}>
        <boxGeometry args={[w, 0.01, d]} />
        <meshStandardMaterial color="#E8C547" />
      </mesh>
    ))}
    {/* задняя стена с ленточными окнами, левая стена */}
    <mesh position={[0, 3.4, -5.2]}>
      <boxGeometry args={[34, 6.8, 0.3]} />
      <meshStandardMaterial color="#E4DFD5" roughness={0.95} />
    </mesh>
    {[-10, -4, 2, 8].map((x) => (
      <mesh key={x} position={[x, 5.2, -5.03]}>
        <boxGeometry args={[4.6, 1.0, 0.04]} />
        <meshStandardMaterial color="#AFCBE0" emissive="#DCEBF5" emissiveIntensity={0.5} />
      </mesh>
    ))}
    <mesh position={[-8.2, 3.4, 0]}>
      <boxGeometry args={[0.3, 6.8, 22]} />
      <meshStandardMaterial color="#DDD7CC" roughness={0.95} />
    </mesh>
    {/* колонны-двутавры */}
    {[-6, 6].map((x) => (
      <group key={x} position={[x, 3.4, -4.6]}>
        <mesh>
          <boxGeometry args={[0.5, 6.8, 0.08]} />
          <meshStandardMaterial color="#6E747A" metalness={0.4} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.08, 6.8, 0.5]} />
          <meshStandardMaterial color="#6E747A" metalness={0.4} />
        </mesh>
      </group>
    ))}
    {/* электрошкаф на стене */}
    <group position={CAB}>
      <mesh position={[0.25, 1.2, 0]}>
        <boxGeometry args={[0.5, 2.0, 1.4]} />
        <meshStandardMaterial color="#9AA2A9" metalness={0.3} roughness={0.5} emissive={RED} emissiveIntensity={0.5 * redCab} />
      </mesh>
      <mesh position={[0.52, 1.75, 0.4]}>
        <boxGeometry args={[0.02, 0.3, 0.3]} />
        <meshStandardMaterial color={LEMON} />
      </mesh>
      <mesh position={[0.52, 1.75, 0.4]} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[0.04, 0.1, 3]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    </group>
    {/* магистраль сжатого воздуха вдоль задней стены */}
    <mesh position={[0, 3.2, -4.9]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.07, 0.07, 30, 10]} />
      <meshStandardMaterial color="#2B6CB0" emissive={RED} emissiveIntensity={0.6 * redAir} />
    </mesh>
    <mesh position={[-1.2, 2.5, -4.9]}>
      <cylinderGeometry args={[0.05, 0.05, 1.4, 10]} />
      <meshStandardMaterial color="#2B6CB0" />
    </mesh>
  </>
);

// ящик из реек: open 0 — закрыт, 1 — стенки лежат на полу; крышка снята, если open > 0
const CR = {L: 3.0, H: 2.9, W: 2.6};
const Slats: React.FC<{len: number; h: number; n?: number}> = ({len, h, n = 5}) => (
  <>
    {Array.from({length: n}, (_, i) => (
      <mesh key={i} position={[0, h / 2 - (h / n) * (i + 0.5), 0]}>
        <boxGeometry args={[len, (h / n) * 0.64, 0.07]} />
        <meshStandardMaterial color={WOOD} roughness={0.85} />
      </mesh>
    ))}
    {[-0.5, 0.5].map((k) => (
      <mesh key={k} position={[k * (len - 0.14), 0, 0.03]}>
        <boxGeometry args={[0.14, h, 0.08]} />
        <meshStandardMaterial color={WOOD_D} roughness={0.9} />
      </mesh>
    ))}
  </>
);
const BigCrate: React.FC<{open: number}> = ({open}) => {
  const {L, H, W} = CR;
  const a = open * (Math.PI / 2);
  // стенка на петле у пола: поворот наружу вокруг нижнего ребра
  const wall = (pos: V3, yaw: number, len: number, key: string) => (
    <group key={key} position={pos} rotation={[0, yaw, 0]}>
      <group rotation={[a, 0, 0]}>
        <group position={[0, H / 2, 0]}>
          <Slats len={len} h={H} />
        </group>
      </group>
    </group>
  );
  return (
    <group>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[L + 0.1, 0.14, W + 0.1]} />
        <meshStandardMaterial color={WOOD_D} roughness={0.9} />
      </mesh>
      {wall([0, 0.14, W / 2], 0, L, "f")}
      {wall([0, 0.14, -W / 2], Math.PI, L, "b")}
      {wall([L / 2, 0.14, 0], Math.PI / 2, W, "r")}
      {wall([-L / 2, 0.14, 0], -Math.PI / 2, W, "l")}
      {open < 0.05 ? (
        <>
          {[-1, 0, 1].map((k) => (
            <mesh key={k} position={[k * (L / 3), H + 0.18, 0]}>
              <boxGeometry args={[L / 3 - 0.06, 0.08, W + 0.06]} />
              <meshStandardMaterial color={WOOD} roughness={0.85} />
            </mesh>
          ))}
          {/* клеймо и стрелки «верх» — знаки без текста */}
          <mesh position={[-0.7, 1.5, W / 2 + 0.06]}>
            <boxGeometry args={[0.5, 0.36, 0.01]} />
            <meshBasicMaterial color={INK} />
          </mesh>
          {[0.5, 0.85].map((x) => (
            <mesh key={x} position={[x, 1.6, W / 2 + 0.06]}>
              <coneGeometry args={[0.12, 0.28, 3]} />
              <meshBasicMaterial color={INK} />
            </mesh>
          ))}
        </>
      ) : null}
    </group>
  );
};
// крышка ящика, снятая и положенная на пол (на ней сидит инженер)
const Lid: React.FC<{p: V3}> = ({p}) => (
  <group position={p}>
    {[-1, 0, 1].map((k) => (
      <mesh key={k} position={[k * 0.62, 0.08, 0]}>
        <boxGeometry args={[0.56, 0.16, 1.6]} />
        <meshStandardMaterial color={WOOD} roughness={0.85} />
      </mesh>
    ))}
  </group>
);

// шкаф управления робота: экран (тёмный без питания / зелёный), лампа статуса
const Controller: React.FC<{on: boolean; t: number}> = ({on, t}) => (
  <group position={CTRL}>
    <Shadow w={1.0} d={0.8} o={0.5} />
    <mesh position={[0, 0.7, 0]}>
      <boxGeometry args={[0.7, 1.4, 0.6]} />
      <meshStandardMaterial color="#B9BEC4" metalness={0.3} roughness={0.5} />
    </mesh>
    <mesh position={[0, 1.05, 0.31]}>
      <boxGeometry args={[0.46, 0.3, 0.02]} />
      <meshStandardMaterial color={on ? "#2FD06A" : "#1B1E22"} emissive={on ? "#2FD06A" : "#000000"} emissiveIntensity={on ? 0.6 : 0} />
    </mesh>
    <mesh position={[0, 1.5, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 0.2, 12]} />
      <meshBasicMaterial color={on ? "#2FD06A" : Math.floor(t * 3) % 2 ? RED : "#5A1B1C"} />
    </mesh>
    <mesh position={[0.22, 0.5, 0.31]}>
      <cylinderGeometry args={[0.06, 0.06, 0.04, 14]} />
      <meshStandardMaterial color={RED} />
    </mesh>
  </group>
);

// ограждение ячейки: стойки, сетка на трёх сторонах, спереди световая завеса (лучи между двумя стойками)
const FENCE = {x0: -2.7, x1: 2.9, z0: -2.0, z1: 1.9};
const Fence: React.FC<{k: number; t: number}> = ({k, t}) => {
  if (k <= 0) return null;
  const h = 2.0 * k;
  const posts: [number, number][] = [
    [FENCE.x0, FENCE.z0],
    [FENCE.x1, FENCE.z0],
    [FENCE.x0, FENCE.z1],
    [FENCE.x1, FENCE.z1],
    [-0.9, FENCE.z1],
    [0.9, FENCE.z1],
  ];
  const panel = (p: V3, w: number, yaw: number, key: string) => (
    <mesh key={key} position={p} rotation={[0, yaw, 0]}>
      <planeGeometry args={[w, h * 0.9]} />
      <meshStandardMaterial color="#8E979F" transparent opacity={0.32} side={THREE.DoubleSide} />
    </mesh>
  );
  return (
    <>
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, h / 2, z]}>
          <boxGeometry args={[0.1, h, 0.1]} />
          <meshStandardMaterial color="#E8C547" />
        </mesh>
      ))}
      {panel([(FENCE.x0 + FENCE.x1) / 2, h / 2, FENCE.z0], FENCE.x1 - FENCE.x0, 0, "b")}
      {panel([FENCE.x0, h / 2, (FENCE.z0 + FENCE.z1) / 2], FENCE.z1 - FENCE.z0, Math.PI / 2, "l")}
      {panel([FENCE.x1, h / 2, (FENCE.z0 + FENCE.z1) / 2], FENCE.z1 - FENCE.z0, Math.PI / 2, "r")}
      {panel([(FENCE.x0 - 0.9) / 2, h / 2, FENCE.z1], -0.9 - FENCE.x0, 0, "fl")}
      {panel([(FENCE.x1 + 0.9) / 2, h / 2, FENCE.z1], FENCE.x1 - 0.9, 0, "fr")}
      {/* световая завеса: лучи мерцают бегущей волной */}
      {k >= 1
        ? Array.from({length: 9}, (_, i) => (
            <mesh key={`b${i}`} position={[0, 0.25 + i * 0.2, FENCE.z1]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 1.8, 6]} />
              <meshBasicMaterial color={RED} transparent opacity={0.35 + 0.35 * Math.max(0, Math.sin(t * 6 - i * 0.7))} />
            </mesh>
          ))
        : null}
    </>
  );
};

// ===== Титан на рабочем месте: перекладывает коробки с поддона на поддон =====
const BOX: V3 = [0.42, 0.36, 0.42];
const SRC: V3 = [-1.55, 0, 0.6];
const DST: V3 = [1.55, 0, 0.55];
const up = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
const j1of = (p: V3) => Math.atan2(-p[2], p[0]);
const CYCLE = 2.6;
const workPlan = (t0: number, n: number) => {
  const keys: ArmKey[] = [{at: 0, j: HOME, grip: 0.55}];
  const items: ArmItem[] = [];
  for (let i = 0; i < n; i++) {
    const T = t0 + i * CYCLE;
    const pick = palletSlot(SRC, 3 - i, BOX);
    const slot = palletSlot(DST, i, BOX);
    keys.push(
      {at: T, p: up(pick, 0.45), tool: Math.PI, j6: -j1of(pick), grip: 0.55},
      {at: T + 0.42, p: pick, j6: -j1of(pick), grip: 0.55},
      {at: T + 0.6, p: pick, j6: -j1of(pick), grip: 0.4},
      {at: T + 0.95, p: up(pick, 0.55), j6: -j1of(pick), grip: 0.4},
      {at: T + 1.65, p: up(slot, 0.5), j6: -j1of(slot), grip: 0.4},
      {at: T + 1.95, p: slot, j6: -j1of(slot), grip: 0.4},
      {at: T + 2.1, p: slot, j6: -j1of(slot), grip: 0.55},
      {at: T + 2.45, p: up(slot, 0.5), j6: -j1of(slot), grip: 0.55},
    );
    items.push({start: pick, s: BOX, carry: [[T + 0.62, T + 2.1]]});
  }
  keys.push({at: t0 + n * CYCLE + 0.6, j: HOME, grip: 0.55});
  return {keys, items};
};
const READY_PLAN = workPlan(0.9, 4);
const Foundation: React.FC = () => (
  <group>
    <mesh position={[0, 0.03, 0]}>
      <boxGeometry args={[1.5, 0.06, 1.5]} />
      <meshStandardMaterial color="#A7A29A" roughness={0.95} />
    </mesh>
    {[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * 0.55, 0.1, sz * 0.55]}>
          <cylinderGeometry args={[0.07, 0.07, 0.1, 6]} />
          <meshStandardMaterial color={LEMON} emissive={LEMON} emissiveIntensity={0.25} />
        </mesh>
      )),
    )}
  </group>
);

// ===== проходная =====
const Gate: React.FC<{t: number}> = ({t}) => (
  <>
    <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[24, 16]} />
      <meshStandardMaterial color="#B9B4AB" roughness={0.95} />
    </mesh>
    {/* стена с проёмом */}
    <mesh position={[-4.4, 2.2, -1.6]}>
      <boxGeometry args={[6, 4.4, 0.3]} />
      <meshStandardMaterial color="#D9D3C8" />
    </mesh>
    <mesh position={[4.4, 2.2, -1.6]}>
      <boxGeometry args={[6, 4.4, 0.3]} />
      <meshStandardMaterial color="#D9D3C8" />
    </mesh>
    <mesh position={[0, 3.9, -1.6]}>
      <boxGeometry args={[2.8, 1.0, 0.3]} />
      <meshStandardMaterial color="#D9D3C8" />
    </mesh>
    {/* будка охраны со стеклом */}
    <group position={[2.4, 0, -0.2]}>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[1.6, 2.4, 1.4]} />
        <meshStandardMaterial color="#E9E4DA" />
      </mesh>
      <mesh position={[-0.81, 1.5, 0]}>
        <boxGeometry args={[0.02, 0.9, 1.1]} />
        <meshStandardMaterial color="#9CC8F0" emissive="#CFE6F5" emissiveIntensity={0.4} />
      </mesh>
    </group>
    {/* турникет-трипод: две тумбы, вертушка, лампа */}
    {[-0.6, 0.6].map((x) => (
      <mesh key={x} position={[x, 0.5, 0.2]}>
        <boxGeometry args={[0.3, 1.0, 0.9]} />
        <meshStandardMaterial color="#C9CFD4" metalness={0.6} roughness={0.3} />
      </mesh>
    ))}
    <group position={[-0.45, 0.95, 0.2]} rotation={[0, 0, -0.6]}>
      {[0, 1, 2].map((k) => (
        <mesh key={k} rotation={[(k * Math.PI * 2) / 3, 0, 0]} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.9, 8]} />
          <meshStandardMaterial color="#C9CFD4" metalness={0.7} roughness={0.25} />
        </mesh>
      ))}
    </group>
    <mesh position={[-0.6, 1.04, 0.5]}>
      <boxGeometry args={[0.2, 0.08, 0.2]} />
      <meshBasicMaterial color={Math.floor(t * 2.5) % 2 ? RED : "#5A1B1C"} />
    </mesh>
    <pointLight position={[-0.6, 1.3, 0.8]} intensity={Math.floor(t * 2.5) % 2 ? 2.2 : 0.4} distance={3} color={RED} />
    {/* за проходной виден цех: ящик вдалеке */}
    <group position={[0, 0, -6]} scale={0.6}>
      <BigCrate open={0} />
    </group>
  </>
);

// ===== камеры =====
export const SITE_CAM: Record<SiteId, Cam> = {
  siteCrowd: {pos: [6.4, 3.6, 7.8], target: [0, 1.5, 0], fov: 46},
  siteNoPower: {pos: [6.6, 5.4, 10.2], target: [-0.2, 1.6, 0], fov: 46},
  siteGate: {pos: [4.6, 3.4, 8.6], target: [-0.1, 2.0, 0], fov: 46},
  siteScan: {pos: [5.2, 5.2, 8.6], target: [-0.8, 0.8, 0], fov: 50},
  siteReady: {pos: [-1.8, 5.6, 10.4], target: [0.2, 1.0, -0.2], fov: 48},
};
export const SITE_CAM_AT = (w: SiteId, t: number): Cam => {
  const c = SITE_CAM[w];
  if (w === "siteCrowd") {
    // обход вокруг ящика
    const a = 0.72 - t * 0.05;
    const r = 12.6 - t * 0.25;
    return {pos: [Math.sin(a) * r, 4.8 - t * 0.08, Math.cos(a) * r], target: [0, 2.0, 0], fov: c.fov};
  }
  if (w === "siteGate") {
    const k = sm(t / 6);
    return {pos: lerpV(c.pos, [3.6, 3.0, 7.2], k), target: c.target, fov: c.fov};
  }
  return c;
};
export const siteState = (w: SiteId, t: number) => {
  if (w === "siteNoPower") return {alarm: t > 3.0 && t < 4.4};
  return {alarm: false};
};

// люди вокруг ящика (холодное открытие): x, z, (поворот — к ящику, считается), руки, куртка
const CROWD: [number, number, number, number, string][] = [
  [2.6, 2.6, -2.4, 1, "#2B6CB0"],
  [-2.8, 2.2, -0.75, 0, "#4A6B4A"],
  [3.0, -0.6, Math.PI, 1, "#7A4E2D"],
  [-3.0, -1.2, 0.2, 0.7, "#2B6CB0"],
  [0.4, 3.3, -Math.PI / 2, 0.9, "#5C6168"],
];

export const SiteWorld: React.FC<{w: SiteId; t: number}> = ({w, t}) => {
  if (w === "siteGate") {
    return (
      <>
        <Gate t={t} />
        <Worker3D x={-0.3} z={2.0} yaw={Math.PI / 2} crouch={0} jacket="#F1EDE6" stripe={false} hat="hair" box boxColor="#2B2E33" />
        <Shadow w={1.0} d={0.7} p={[-0.3, 0, 2.0]} o={0.5} />
      </>
    );
  }
  if (w === "siteCrowd") {
    return (
      <>
        <Shop />
        <BigCrate open={0} />
        <Shadow w={4.2} d={3.6} o={0.5} />
        {CROWD.map(([x, z, , arms, jacket], i) => (
          <React.Fragment key={i}>
            <Worker3D x={x} z={z} yaw={Math.atan2(z, -x)} crouch={0} jacket={jacket} hat={i % 2 ? "cap" : "hard"} arms={arms * (0.75 + 0.25 * Math.sin(t * 2 + i))} />
            <Shadow w={1.0} d={0.7} p={[x, 0, z]} o={0.45} />
          </React.Fragment>
        ))}
      </>
    );
  }
  if (w === "siteNoPower" || w === "siteScan") {
    // стенки ящика на полу, Титан стоит без питания; кабель не доходит до шкафа
    const eng = w === "siteNoPower";
    const walkK = sm((t - 0.3) / 2.2);
    const ex = lerp(7.0, 3.7, walkK);
    const ez = lerp(-2.6, -0.2, walkK);
    const sit = eng ? sm((t - 4.4) / 0.8) : 0;
    const cable: V3[] = [
      [CTRL[0] - 0.2, 0.1, CTRL[2] + 0.2],
      [CTRL[0] - 1.4, 0.04, CTRL[2] + 0.7],
      [-0.2, 0.04, -2.2],
      [-2.4, 0.04, -2.6],
      [-3.8, 0.04, -2.0],
    ];
    const scanK = w === "siteScan" ? sm((t - 2.0) / 1.0) : 0;
    return (
      <>
        <Shop redCab={w === "siteScan" ? sm((t - 2.8) / 0.4) : 0} redAir={w === "siteScan" ? sm((t - 3.4) / 0.4) : 0} />
        <BigCrate open={1} />
        <Lid p={[3.7, 0, -0.2]} />
        <ArmModel skin="industrial" p={[0, 0.14, 0]} t={0} plan={{keys: [{at: 0, j: HOME, grip: 0.55}]}} />
        <Controller on={false} t={t} />
        <Hose pts={cable} r={0.05} mat="dark" />
        <mesh position={[-3.85, 0.08, -2.0]}>
          <sphereGeometry args={[0.12 + 0.04 * Math.sin(t * 8), 14, 10]} />
          <meshBasicMaterial color={RED} />
        </mesh>
        {eng ? (
          <>
            <Worker3D x={ex} z={ez} yaw={-2.5} crouch={0.55 * sit} walk={walkK * 3.6 * (1 - sit)} jacket="#F1EDE6" stripe={false} hat="hair" box={sit < 0.5} boxColor="#2B2E33" />
            <Shadow w={1.0} d={0.7} p={[ex, 0, ez]} o={0.5} />
          </>
        ) : null}
        {/* красный контур будущего фундамента и рамка будущей ячейки */}
        {scanK > 0 ? (
          <>
            {[
              [0, 1.0, 1.9, 0.08],
              [0, -1.0, 1.9, 0.08],
              [0.95, 0, 0.08, 2.0],
              [-0.95, 0, 0.08, 2.0],
            ].map(([x, z, ww, dd], i) => (
              <mesh key={i} position={[x * scanK, 0.02, z * scanK]}>
                <boxGeometry args={[ww * scanK + 0.01, 0.02, dd * scanK + 0.01]} />
                <meshBasicMaterial color={RED} />
              </mesh>
            ))}
          </>
        ) : null}
        {w === "siteScan" ? (
          <>
            <DogModel
              t={t}
              plan={{
                speed: 2.0,
                stays: [
                  {at: 0, x: 4.6, z: 3.2, yaw: Math.PI},
                  {at: 1.8, x: 1.4, z: 2.8, yaw: Math.PI},
                  {at: 3.6, x: -2.6, z: 2.4, yaw: Math.PI},
                  {at: 5.2, x: -4.6, z: 0.2, yaw: Math.PI / 2},
                ],
              }}
            />
            <group position={[lerp(4.6, -4.6, sm(t / 5.2)), 0, lerp(3.2, 0.2, sm(t / 5.2))]}>
              <LidarSweep t={t} range={3.6} y={0.45} o={t > 0.4 ? 1 : 0} />
            </group>
          </>
        ) : null}
      </>
    );
  }
  // siteReady: место готово раньше робота
  const tw = t;
  return (
    <>
      <Shop />
      <Foundation />
      <ArmModel skin="industrial" p={[0, 0.06, 0]} t={tw} plan={READY_PLAN} />
      <Pallet p={SRC} />
      <Pallet p={DST} />
      <Controller on t={t} />
      {/* кабель в лотке от шкафа: светится лимонным */}
      <mesh position={[(CAB[0] + CTRL[0]) / 2 + 0.2, 2.6, -2.9]}>
        <boxGeometry args={[CTRL[0] - CAB[0] - 0.4, 0.1, 0.3]} />
        <meshStandardMaterial color="#8E979F" metalness={0.4} />
      </mesh>
      <Hose pts={[[CAB[0] + 0.5, 1.9, CAB[2]], [CAB[0] + 0.8, 2.6, -2.9], [CTRL[0], 2.62, -2.9], [CTRL[0], 1.5, CTRL[2] - 0.2]]} r={0.04} mat="glow" />
      {/* сжатый воздух: синий шланг к ячейке */}
      <Hose pts={[[-1.2, 1.8, -4.85], [-1.4, 1.2, -3.2], [-0.6, 0.4, -1.8], [-0.2, 0.3, -0.6]]} r={0.035} mat="accent" />
      <Fence k={1} t={t} />
      {/* двое операторов у пульта за световой завесой */}
      <Worker3D x={3.6} z={1.0} yaw={2.85} crouch={0} jacket="#2B6CB0" hat="hard" arms={0.45} />
      <Worker3D x={4.4} z={0.2} yaw={3.05} crouch={0} jacket="#4A6B4A" hat="hard" arms={0.2} />
      <Shadow w={1.6} d={2.0} p={[4.0, 0, 0.6]} o={0.45} />
      <AgvModel t={t} plan={{stays: [{at: 0, x: -7.4, z: 2.3, yaw: 0}, {at: 2.4, x: -4.5, z: 2.3, yaw: 0}], speed: 1.6, boxes: 2}} />
    </>
  );
};
