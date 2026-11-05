// Сцены применения Aura для объясняющих роликов (решение пользователя 05.11.2026: «показывать как робот подходит к конвейеру и
// несёт коробку, а собака не только танцует, а например идёт и сканирует пещеру или тёмный склад»). Каждая сцена — компонент
// с props, ставится в Stage (кроме DarkScan — у неё своя тёмная сцена с фоном) и считает время от начала своего Sequence:
// - ConveyorCarryScene — гуманоид на колёсах подъезжает к конвейеру, опускает торс, берёт коробку двумя руками, сдаёт назад,
//   разворачивается и ставит коробку на поднятую площадку AGV, затем приглашающий жест (~14 с);
// - ArmPalletScene — манипулятор быстро («щёлк») снимает коробки с упора конвейера и кладёт на поддон 2 × 2 (по 2,6 с на коробку);
// - DarkScan — тёмный склад (`kind: "warehouse"`) или пещера (`"cave"`): робособака идёт с фарой (конус света, прожектор освещает
//   стеллажи и камни), лидар-веер вращается, и облако точек проявляется там, где прошёл луч (свежие точки — ярко-лимонные, потом
//   гаснут до тусклых — карта SLAM); `hud` — счётчик точек;
// - DroneRackScan — дрон-инспектор летит вдоль стеллажа, камера на гимбале смотрит на полки, отсканированные коробки получают
//   лимонную рамку и галочку;
// - CargoDelivery — грузовой дрон прилетает с коробкой на тросе, зависает над площадкой, опускает коробку, отпускает и улетает.
import React, {useMemo} from "react";
import * as THREE from "three";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {Stage, type Cam, type V3} from "./kit";
import {Conveyor, Pallet, Rack, conveyorBoxAt, conveyorStopAt, palletSlot, rackBoxes, type ConveyorProps, type RackProps} from "./Conveyor";
import {WheelHumanoidModel} from "./AuraWheelHumanoid";
import {AgvModel} from "./AuraAgv";
import {ArmModel, HOME, type ArmKey, type ArmItem, type ArmSkin} from "./AuraArm";
import {DogModel, dogPose, lidarAngle, type DogPlan} from "./AuraDog";
import {DroneModel, DronePad, droneState, type DronePlan} from "./AuraDrone";

const useT = (t?: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return t ?? frame / fps;
};

// ===== гуманоид на колёсах: конвейер → AGV =====
export const CARRY_BOX: V3 = [0.5, 0.36, 0.44];
export const CONVEYOR_CARRY: ConveyorProps = {
  p: [0.2, 0, -1.9],
  len: 3.2,
  h: 1.1,
  speed: 1.0,
  boxes: [{enter: -1.0, pickAt: 4.3, s: CARRY_BOX}, {enter: 1.8, s: CARRY_BOX}, {enter: 4.8, s: CARRY_BOX}, {enter: 7.8, s: CARRY_BOX}, {enter: 10.8, s: CARRY_BOX}],
};
export const CARRY_SECONDS = 13;
// раскладка в глубину (под вертикальный кадр): конвейер сзади, AGV спереди; робот берёт коробку лицом к конвейеру,
// сдаёт назад, разворачивается к зрителю и ставит коробку на поднятую площадку AGV
export const ConveyorCarryScene: React.FC<{t?: number; skin?: "aura" | "navy"}> = ({t: tp, skin}) => {
  const t = useT(tp);
  const from = conveyorBoxAt(CONVEYOR_CARRY, 0, 4.3);
  return (
    <>
      <Conveyor {...CONVEYOR_CARRY} t={t} />
      <AgvModel t={t} plan={{stays: [{at: -10, x: 0.4, z: 1.75, yaw: 0}], lift: [[0, 1]]}} />
      <WheelHumanoidModel
        t={t}
        skin={skin}
        plan={{
          stays: [
            {at: 0, x: -1.8, z: 0, yaw: 0},
            {at: 3.0, x: 1.43, z: -0.9, yaw: Math.PI / 2},
            {at: 5.6, x: 1.43, z: -0.9, yaw: Math.PI / 2},
            {at: 6.4, x: 1.43, z: -0.3, yaw: Math.PI / 2},
            {at: 7.3, x: 1.43, z: -0.3, yaw: -Math.PI / 2},
            {at: 9.6, x: 0.6, z: 0.5, yaw: -Math.PI / 2},
          ],
          lift: [[0, 0.5], [3.0, 0.5], [3.6, 0.12], [4.6, 0.12], [5.4, 0.5], [9.6, 0.5], [10.0, 0.12], [10.8, 0.12], [11.4, 0.5]],
          carry: [{at: 4.3, from, until: 10.4, to: [0.6, 0.82 + CARRY_BOX[1] / 2, 1.34], s: CARRY_BOX, show: 4.3}],
          gestures: [{at: 11.3, kind: "present"}],
        }}
      />
    </>
  );
};

// ===== манипулятор: конвейер → поддон =====
export const PALLET_BOX: V3 = [0.4, 0.36, 0.4];
export const CONVEYOR_PALLET: ConveyorProps = {p: [-1.4, 0, 1.3], len: 3.6, h: 0.9, speed: 0.9, boxes: []};
const PALLET_AT: V3 = [1.45, 0, -0.55];
const CYCLE = 2.6;
export const palletPlan = (n = 4, t0 = 1.2) => {
  const pick = conveyorStopAt(CONVEYOR_PALLET, PALLET_BOX);
  const keys: ArmKey[] = [{at: 0, j: HOME, grip: 0.55}];
  const items: ArmItem[] = [];
  const boxes: NonNullable<ConveyorProps["boxes"]> = [];
  const up = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
  const j1 = (p: V3) => Math.atan2(-p[2], p[0]);
  for (let i = 0; i < n; i++) {
    const T = t0 + i * CYCLE;
    const slot = palletSlot(PALLET_AT, i, PALLET_BOX);
    // коробка доезжает до упора к моменту T (вход заранее: путь / скорость)
    const travel = (CONVEYOR_PALLET.len ?? 3.6) - 0.12 - PALLET_BOX[0] - 0.04;
    boxes.push({enter: T - travel / (CONVEYOR_PALLET.speed ?? 0.9) - 0.4, pickAt: T + 0.62, s: PALLET_BOX});
    keys.push(
      {at: T, p: up(pick, 0.45), tool: Math.PI, j6: -j1(pick), grip: 0.55},
      {at: T + 0.42, p: pick, j6: -j1(pick), grip: 0.55},
      {at: T + 0.6, p: pick, j6: -j1(pick), grip: 0.4},
      {at: T + 0.95, p: up(pick, 0.55), j6: -j1(pick), grip: 0.4},
      {at: T + 1.65, p: up(slot, 0.5), j6: -j1(slot), grip: 0.4},
      {at: T + 1.95, p: slot, j6: -j1(slot), grip: 0.4},
      {at: T + 2.1, p: slot, j6: -j1(slot), grip: 0.55},
      {at: T + 2.45, p: up(slot, 0.5), j6: -j1(slot), grip: 0.55},
    );
    items.push({start: pick, s: PALLET_BOX, carry: [[T + 0.62, T + 2.1]], show: T + 0.62});
  }
  keys.push({at: t0 + n * CYCLE + 0.6, j: HOME, grip: 0.55});
  return {keys, items, boxes};
};
export const PALLET_SECONDS = 12;
export const ArmPalletScene: React.FC<{t?: number; skin?: ArmSkin; n?: number}> = ({t: tp, skin = "industrial", n = 4}) => {
  const t = useT(tp);
  const plan = useMemo(() => palletPlan(n), [n]);
  return (
    <>
      <Conveyor {...CONVEYOR_PALLET} boxes={plan.boxes} t={t} />
      <Pallet p={PALLET_AT} />
      <ArmModel skin={skin} t={t} plan={{keys: plan.keys, items: plan.items}} />
    </>
  );
};

// ===== DarkScan: тёмный склад или пещера, собака с фарой и лидаром =====
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const h = (a: number, b: number) => hash(a * 57.1 + b * 113.3);
  const s = (q: number) => q * q * (3 - 2 * q);
  const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * s(xf);
  const b = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * s(xf);
  return a + (b - a) * s(yf);
};

export const DARK_RACKS: RackProps[] = [
  {p: [-1.55, 0, -3.2], yaw: Math.PI / 2, bays: 7, levels: 3, bayW: 1.4, seed: 3},
  {p: [1.55, 0, -3.2], yaw: -Math.PI / 2, bays: 7, levels: 3, bayW: 1.4, seed: 7},
];
export const DARK_DOG: DogPlan = {stays: [{at: 0, x: 0, z: 2.6, yaw: Math.PI / 2}, {at: 10, x: 0.1, z: -6.5, yaw: Math.PI / 2}], speed: 0.95};
const LIDAR_R = 5.2;

// облако точек сцены: поверхности стеллажей и коробок или стены пещеры
const cloudPoints = (kind: "warehouse" | "cave", density: number): Float32Array => {
  const pts: number[] = [];
  let seed = 1;
  const rnd = () => hash(seed++ * 0.731);
  const push = (x: number, y: number, z: number, j = 0.012) => pts.push(x + (rnd() - 0.5) * j, y + (rnd() - 0.5) * j, z + (rnd() - 0.5) * j);
  if (kind === "warehouse") {
    for (const R of DARK_RACKS) {
      const M = new THREE.Matrix4().makeTranslation(...(R.p ?? [0, 0, 0])).multiply(new THREE.Matrix4().makeRotationY(R.yaw ?? 0));
      const bays = R.bays ?? 4;
      const W = bays * (R.bayW ?? 1.5);
      const dp = R.depth ?? 0.9;
      const levels = R.levels ?? 3;
      const lh = R.levelH ?? 1.0;
      const v = new THREE.Vector3();
      // балки и стойки (лицевая сторона)
      for (let l = 0; l <= levels; l++)
        for (let k = 0; k < W * 18 * density; k++) {
          v.set(-W / 2 + rnd() * W, 0.12 + l * lh + (rnd() - 0.5) * 0.08, dp / 2 + 0.04).applyMatrix4(M);
          push(v.x, v.y, v.z);
        }
      for (let b = 0; b <= bays; b++)
        for (let k = 0; k < 40 * density; k++) {
          v.set(-W / 2 + b * (R.bayW ?? 1.5), rnd() * (levels * lh + 0.2), dp / 2).applyMatrix4(M);
          push(v.x, v.y, v.z);
        }
      // коробки: лицевая грань гуще, верх — реже
      for (const B of rackBoxes(R)) {
        const q = new THREE.Matrix4().makeTranslation(...B.c).multiply(new THREE.Matrix4().makeRotationY(B.yaw));
        const n = Math.round(B.s[0] * B.s[1] * 260 * density);
        for (let k = 0; k < n; k++) {
          v.set((rnd() - 0.5) * B.s[0], (rnd() - 0.5) * B.s[1], B.s[2] / 2).applyMatrix4(q);
          push(v.x, v.y, v.z);
        }
        for (let k = 0; k < n * 0.3; k++) {
          v.set((rnd() - 0.5) * B.s[0], B.s[1] / 2, (rnd() - 0.5) * B.s[2]).applyMatrix4(q);
          push(v.x, v.y, v.z);
        }
      }
    }
    // пол прохода и дальняя стена
    for (let k = 0; k < 900 * density; k++) push((rnd() - 0.5) * 2.6, 0.005, 3 - rnd() * 11, 0);
    for (let k = 0; k < 700 * density; k++) push((rnd() - 0.5) * 6, rnd() * 4, -8.4);
  } else {
    // пещера: свод по сечению, радиус шумит по длине и углу; ближняя к камере половина свода не рисуется
    for (let k = 0; k < 7000 * density; k++) {
      const z = 3 - rnd() * 11.5;
      const phi = 0.08 + rnd() * (Math.PI - 0.16);
      const r = 2.0 + 0.55 * vnoise(z * 0.9, phi * 3.1) + 0.25 * vnoise(z * 2.7 + 9, phi * 7);
      push(Math.cos(phi) * r * 1.05 + Math.sin(z * 0.35) * 0.4, Math.sin(phi) * r * 0.95, z, 0.02);
    }
    for (let k = 0; k < 1600 * density; k++) {
      const z = 3 - rnd() * 11.5;
      const x = (rnd() - 0.5) * 3.4 + Math.sin(z * 0.35) * 0.4;
      push(x, 0.04 * vnoise(x * 3, z * 3), z, 0.01);
    }
  }
  return new Float32Array(pts);
};

// когда луч лидара впервые прошёл по точке (с): обход по кадрам, луч — курс собаки + угол лидара
const revealTimes = (P: Float32Array, plan: DogPlan, T: number, R: number): Float32Array => {
  const n = P.length / 3;
  const out = new Float32Array(n).fill(1e9);
  const dt = 1 / 30;
  let prev = 0;
  const TAU = Math.PI * 2;
  for (let t = 0; t <= T; t += dt) {
    const d = dogPose(plan, t);
    const th = d.yaw + lidarAngle(t);
    const cx = d.root[0] + Math.cos(d.yaw) * 0.5;
    const cz = d.root[2] - Math.sin(d.yaw) * 0.5;
    const span = t === 0 ? TAU : (((th - prev) % TAU) + TAU) % TAU;
    for (let i = 0; i < n; i++) {
      if (out[i] < 1e8) continue;
      const dx = P[i * 3] - cx;
      const dz = P[i * 3 + 2] - cz;
      if (dx * dx + dz * dz > R * R) continue;
      const a = Math.atan2(-dz, dx);
      const rel = (((a - prev) % TAU) + TAU) % TAU;
      if (rel <= span) out[i] = t;
    }
    prev = th;
  }
  return out;
};

const RockField: React.FC = () => {
  const rocks = useMemo(
    () =>
      Array.from({length: 26}, (_, k) => {
        const z = 2.5 - hash(k * 3.1) * 10.5;
        const side = k % 2 ? 1 : -1;
        return {p: [side * (1.25 + hash(k * 7.7) * 0.6) + Math.sin(z * 0.35) * 0.4, 0.1, z] as V3, s: 0.18 + hash(k * 5.3) * 0.35, r: hash(k) * 3};
      }),
    [],
  );
  return (
    <>
      {rocks.map((r, k) => (
        <mesh key={k} position={r.p} rotation={[r.r, r.r * 2, 0]} scale={[r.s * 1.3, r.s * 0.8, r.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#4B4741" roughness={0.95} flatShading />
        </mesh>
      ))}
    </>
  );
};

const Cloud: React.FC<{P: Float32Array; reveal: Float32Array; t: number; size?: number}> = ({P, reveal, t, size = 0.055}) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P, 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(P.length), 3));
    return g;
  }, [P]);
  const col = geo.getAttribute("color") as THREE.BufferAttribute;
  const arr = col.array as Float32Array;
  for (let i = 0; i < reveal.length; i++) {
    const age = t - reveal[i];
    if (age < 0) {
      arr[i * 3] = arr[i * 3 + 1] = arr[i * 3 + 2] = 0;
      continue;
    }
    // свежая точка — яркий лимонный, через ~1,2 с — тусклый лимонно-серый (остаётся картой)
    const k = Math.exp(-age / 0.5);
    const hgt = P[i * 3 + 1];
    const base = 0.4 + 0.12 * Math.min(1, hgt / 3);
    arr[i * 3] = base + k * 1.1;
    arr[i * 3 + 1] = base * 0.97 + k * 1.05;
    arr[i * 3 + 2] = base * 0.45 + k * 0.25;
  }
  col.needsUpdate = true;
  return (
    <points geometry={geo}>
      <pointsMaterial size={size} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
};

export const DARK_SECONDS = 10;
export const DarkScan: React.FC<{
  kind?: "warehouse" | "cave";
  plan?: DogPlan;
  cam?: Cam;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  dpr?: number;
  density?: number;
  hud?: boolean;
  t?: number;
}> = ({kind = "warehouse", plan = DARK_DOG, cam = {pos: [1.3, 2.7, 5.4], target: [0, 0.85, -2.6], fov: 42}, left = 0, top = 0, width = 1080, height = 1920, dpr = 1, density = 1, hud = true, t: tp}) => {
  const t = useT(tp);
  const P = useMemo(() => cloudPoints(kind, density), [kind, density]);
  const reveal = useMemo(() => revealTimes(P, plan, 30, LIDAR_R), [P, plan]);
  const shown = reveal.reduce((a, r) => a + (r <= t ? 1 : 0), 0);
  return (
    <div style={{position: "absolute", left, top, width, height, overflow: "hidden", background: "radial-gradient(ellipse 90% 70% at 50% 35%, #1B1D21 0%, #0E0F11 60%, #070809 100%)"}}>
      <Stage cam={cam} width={width} height={height} dpr={dpr} mood="dark">
        <hemisphereLight args={["#9FB0C4", "#0B0C0E", 0.12]} />
        <directionalLight position={[3, 6, 4]} intensity={0.08} />
        <fog attach="fog" args={["#0B0C0E", 7, 17]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3]}>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color={kind === "cave" ? "#2B2824" : "#1D2024"} roughness={0.9} />
        </mesh>
        {kind === "warehouse" ? DARK_RACKS.map((R, k) => <Rack key={k} {...R} />) : <RockField />}
        <Cloud P={P} reveal={reveal} t={t} />
        <DogModel t={t} plan={plan} headlight lidar={LIDAR_R} />
      </Stage>
      {hud ? (
        <div style={{position: "absolute", left: 64, top: 430, fontFamily: "JetBrains Mono, monospace", color: "#FFF65D", fontSize: 30, letterSpacing: "0.08em", lineHeight: 1.5, textShadow: "0 0 12px rgba(255,246,93,0.5)"}}>
          <div>LIDAR · SLAM</div>
          <div style={{color: "#D9D7D5", fontSize: 26}}>{String(shown).padStart(5, "0")} точек</div>
        </div>
      ) : null}
    </div>
  );
};

// ===== дрон вдоль стеллажа =====
export const SCAN_RACK: RackProps = {p: [-1.4, 0, -1.3], yaw: 0, bays: 6, levels: 4, bayW: 1.4, seed: 11};
export const SCAN_DRONE: DronePlan = {
  stays: [
    {at: 0, x: -6.2, y: 1.35, z: 0.25, yaw: 0},
    {at: 4.6, x: 1.2, y: 1.35, z: 0.25, yaw: 0},
    {at: 5.6, x: 1.6, y: 2.5, z: 0.25, yaw: 0},
    {at: 9.6, x: -5.8, y: 2.5, z: 0.25, yaw: 0},
  ],
  scans: [{at: 0.2, dur: 9.4, kind: "cone", yaw: Math.PI / 2, pitch: 0.1}],
};
export const DRONE_SCAN_SECONDS = 10;
// рамка и галочка на лицевой грани отсканированной коробки
const ScanMark: React.FC<{c: V3; s: V3; yaw: number; k: number}> = ({c, s, yaw, k}) => (
  <group position={c} rotation={[0, yaw, 0]}>
    <group position={[0, 0, s[2] / 2 + 0.006]} scale={0.85 + 0.15 * k}>
      {[
        [0, s[1] / 2, s[0], 0.012],
        [0, -s[1] / 2, s[0], 0.012],
        [s[0] / 2, 0, 0.012, s[1]],
        [-s[0] / 2, 0, 0.012, s[1]],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color="#FFF65D" transparent opacity={0.95 * k} />
        </mesh>
      ))}
      <mesh position={[s[0] * 0.28, s[1] * 0.18, 0.002]}>
        <circleGeometry args={[0.07, 20]} />
        <meshBasicMaterial color="#262626" transparent opacity={k} />
      </mesh>
      <mesh position={[s[0] * 0.28 - 0.02, s[1] * 0.18 - 0.005, 0.004]} rotation={[0, 0, 0.8]}>
        <planeGeometry args={[0.012, 0.045]} />
        <meshBasicMaterial color="#FFF65D" transparent opacity={k} />
      </mesh>
      <mesh position={[s[0] * 0.28 + 0.012, s[1] * 0.18 + 0.005, 0.004]} rotation={[0, 0, -0.65]}>
        <planeGeometry args={[0.012, 0.08]} />
        <meshBasicMaterial color="#FFF65D" transparent opacity={k} />
      </mesh>
    </group>
  </group>
);
export const DroneRackScan: React.FC<{t?: number; skin?: string; plan?: DronePlan; rack?: RackProps}> = ({t: tp, skin, plan = SCAN_DRONE, rack = SCAN_RACK}) => {
  const t = useT(tp);
  const boxes = useMemo(() => rackBoxes(rack), [rack]);
  // момент скана коробки: дрон напротив неё (по x) и на высоте её полки (±0,75)
  const scanned = useMemo(
    () =>
      boxes.map((b) => {
        for (let u = 0; u < 30; u += 1 / 30) {
          const d = droneState(plan, u);
          if (Math.abs(d.pos.x - b.c[0]) < 0.12 && Math.abs(d.pos.y + 0.1 - b.c[1]) < 0.75 && (plan.scans ?? []).some((s) => u >= s.at && u <= s.at + (s.dur ?? 3))) return u;
        }
        return 1e9;
      }),
    [boxes, plan],
  );
  return (
    <>
      <Rack {...rack} />
      {boxes.map((b, k) => (scanned[k] <= t ? <ScanMark key={k} c={b.c} s={b.s} yaw={b.yaw} k={Math.min(1, (t - scanned[k]) / 0.25)} /> : null))}
      <DroneModel t={t} skin={skin} plan={plan} />
    </>
  );
};

// ===== грузовой дрон: доставка на площадку =====
export const DELIVERY_DRONE: DronePlan = {
  stays: [
    {at: 0, x: -6, y: 4.6, z: -3.5, yaw: 0.5},
    {at: 3.4, x: 0, y: 2.6, z: 0, yaw: 0.2},
    {at: 6.6, x: 0, y: 2.6, z: 0, yaw: 0.2},
    {at: 9.4, x: 5.5, y: 5.2, z: -2.5, yaw: 0.0},
  ],
  cargo: {attached: true, s: [0.7, 0.5, 0.6], events: [{at: 5.2, kind: "drop", y: 0.12}]},
};
export const DELIVERY_SECONDS = 9.5;
export const CargoDelivery: React.FC<{t?: number; plan?: DronePlan}> = ({t: tp, plan = DELIVERY_DRONE}) => {
  const t = useT(tp);
  return (
    <>
      <DronePad p={[0, 0, 0]} />
      <DroneModel kind="cargo" t={t} plan={plan} />
    </>
  );
};
