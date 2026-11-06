// «Робокитай» — 3D-миры серий 2–3 (06.11.2026): ячейка с манипулятором (кобот рядом с человеком, перегруз, ограждение, вылет)
// и оснастка (вакуумный захват на портале, роборуки у камеры, блики, кожух с подсветкой, ложемент). Мир выбирается по имени
// (`World`), время мира — секунды от начала шага (`t`). Камеры — `WORLD_CAM`. Кинематика — ArmModel / HandModel из 3D-арсенала.
import React from "react";
import * as THREE from "three";
import {ArmModel, HOME, type ArmItem, type ArmKey} from "../../components/aura3d/AuraArm";
import {HandModel, HandStand, handReach, type HandPlan} from "../../components/aura3d/AuraHand";
import {DogModel} from "../../components/aura3d/AuraDog";
import {CargoBox, Pedestal, Shadow, type Cam, type V3} from "../../components/aura3d/kit";
import {Conveyor, Pallet, conveyorStopAt, palletSlot, type ConveyorProps} from "../../components/aura3d/Conveyor";
import {ArmPalletScene} from "../../components/aura3d/Scenes";
import {Worker3D} from "./drama3d";
import {LidarSweep, MockFloor} from "./scene3d";

export type WorldId = "overload" | "fence" | "reach" | "reachFixed" | "pack" | "slip" | "slipSlow" | "hands" | "handsNight" | "glare" | "fixed";
const LEMON = "#FFF65D";
const RED = "#E5383B";
const INK = "#262626";
const sm = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const up = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
const j6of = (p: V3) => -Math.atan2(-p[2], p[0]);

// кольцо на полу (зона безопасности, мел вылета): r, толщина, цвет, заливка, доля прорисовки, пунктир
export const FloorRing: React.FC<{p?: V3; r: number; w?: number; color: string; o?: number; fill?: number; draw?: number; dash?: boolean}> = ({p = [0, 0, 0], r, w = 0.07, color, o = 1, fill = 0, draw = 1, dash}) => {
  const segs = dash ? 36 : 1;
  return (
    <group position={[p[0], 0.012, p[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      {fill > 0 ? (
        <mesh>
          <circleGeometry args={[r, 64]} />
          <meshBasicMaterial color={color} transparent opacity={fill} depthWrite={false} />
        </mesh>
      ) : null}
      {Array.from({length: segs}, (_, i) => {
        const a0 = (i / segs) * Math.PI * 2;
        const len = ((dash ? 0.6 : 1) * Math.PI * 2) / segs;
        if (i / segs > draw) return null;
        return (
          <mesh key={i}>
            <ringGeometry args={[r - w, r, 48, 1, a0, Math.min(len, Math.PI * 2 * draw - a0)]} />
            <meshBasicMaterial color={color} transparent opacity={o} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
};
const Cross: React.FC<{p: V3; k: number}> = ({p, k}) =>
  k > 0 ? (
    <group position={[p[0], p[1] + 0.02, p[2]]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} scale={k}>
      <mesh>
        <planeGeometry args={[0.62, 0.11]} />
        <meshBasicMaterial color={RED} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.62, 0.11]} />
        <meshBasicMaterial color={RED} depthWrite={false} />
      </mesh>
    </group>
  ) : null;
const Tick: React.FC<{p: V3; k: number}> = ({p, k}) =>
  k > 0 ? (
    <mesh position={[p[0], p[1] + 0.03, p[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={k}>
      <circleGeometry args={[0.16, 24]} />
      <meshBasicMaterial color={LEMON} depthWrite={false} />
    </mesh>
  ) : null;
const Glare: React.FC<{p: V3; k: number; color?: string; r?: number}> = ({p, k, color = "#FFFFFF", r = 0.18}) =>
  k > 0.01 ? (
    <mesh position={p}>
      <sphereGeometry args={[r * (0.6 + 0.8 * k), 16, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.85 * k} depthWrite={false} />
    </mesh>
  ) : null;

// ===== серия 2: ячейка у конвейера =====
const CONV: ConveyorProps = {p: [-1.4, 0, 1.3], len: 3.6, h: 0.9, speed: 0.9};
const BIG: V3 = [0.5, 0.42, 0.46];
const PICK = conveyorStopAt(CONV, BIG);
// перегруз: кобот берёт тяжёлую деталь, поднимает рывками, «проседает» и встаёт; потом кладёт обратно
const overloadPlan = (T = 0.8): {keys: ArmKey[]; items: ArmItem[]} => ({
  keys: [
    {at: 0, j: HOME, grip: 0.6},
    {at: T, p: up(PICK, 0.45), tool: Math.PI, j6: j6of(PICK), grip: 0.6},
    {at: T + 0.45, p: PICK, j6: j6of(PICK), grip: 0.6},
    {at: T + 0.65, p: PICK, j6: j6of(PICK), grip: 0.5},
    {at: T + 1.5, p: up(PICK, 0.22), j6: j6of(PICK), grip: 0.5},
    {at: T + 1.75, p: up(PICK, 0.12), j6: j6of(PICK), grip: 0.5},
    {at: T + 2.1, p: up(PICK, 0.2), j6: j6of(PICK), grip: 0.5},
    {at: T + 2.4, p: up(PICK, 0.09), j6: j6of(PICK), grip: 0.5},
    {at: T + 4.6, p: up(PICK, 0.09), j6: j6of(PICK), grip: 0.5},
    {at: T + 5.2, p: PICK, j6: j6of(PICK), grip: 0.5},
    {at: T + 5.4, p: PICK, j6: j6of(PICK), grip: 0.6},
    {at: T + 6.0, j: HOME, grip: 0.6},
  ],
  items: [{start: PICK, s: BIG, carry: [[T + 0.65, T + 5.4]]}],
});
// вылет: поддон далеко, дальняя ячейка за мелом
const PAL_FAR: V3 = [2.05, 0, -1.55];
const BASE_MOVED: V3 = [0.75, 0, -0.55];
const REACH = 2.35;
const reachPlan = (base: V3, T0: number, n: number, failLast: boolean): {keys: ArmKey[]; items: ArmItem[]} => {
  const rel = (p: V3): V3 => [p[0] - base[0], p[1] - base[1], p[2] - base[2]];
  const pick = rel(PICK);
  const keys: ArmKey[] = [{at: 0, j: HOME, grip: 0.55}];
  const items: ArmItem[] = [];
  const cyc = 2.4;
  for (let i = 0; i < n; i++) {
    const T = T0 + i * cyc;
    const slotW = palletSlot(PAL_FAR, i, BIG);
    const slot = rel(slotW);
    const far = Math.hypot(slot[0], slot[2]);
    const fail = failLast && i === n - 1 && far > REACH;
    // недостаёт: тянется к ячейке по прямой до предела вылета
    const k = fail ? (REACH - 0.15) / far : 1;
    const tgt: V3 = fail ? [slot[0] * k, slot[1] + 0.55, slot[2] * k] : slot;
    keys.push(
      {at: T, p: up(pick, 0.45), tool: Math.PI, j6: j6of(pick), grip: 0.55},
      {at: T + 0.4, p: pick, j6: j6of(pick), grip: 0.55},
      {at: T + 0.58, p: pick, j6: j6of(pick), grip: 0.46},
      {at: T + 0.9, p: up(pick, 0.55), j6: j6of(pick), grip: 0.46},
      {at: T + 1.6, p: up(tgt, fail ? 0 : 0.5), j6: j6of(tgt), grip: 0.46},
    );
    if (!fail) {
      keys.push({at: T + 1.9, p: slot, j6: j6of(slot), grip: 0.46}, {at: T + 2.05, p: slot, j6: j6of(slot), grip: 0.55}, {at: T + 2.35, p: up(slot, 0.5), j6: j6of(slot), grip: 0.55});
      items.push({start: pick, s: BIG, carry: [[T + 0.58, T + 2.05]], show: T + 0.58});
    } else {
      keys.push({at: T + 3.4, p: up(tgt, 0), j6: j6of(tgt), grip: 0.46});
      items.push({start: pick, s: BIG, carry: [[T + 0.58, 999]], show: T + 0.58});
    }
  }
  return {keys, items};
};
const workerFence = (t: number) => {
  const a: [number, number] = [-4.4, 1.0];
  const b: [number, number] = [-2.0, 0.4];
  const c: [number, number] = [-3.6, 0.9];
  if (t < 1.4) return {x: a[0], z: a[1], walk: 0, yaw: 0};
  if (t < 3.0) {
    const k = sm((t - 1.4) / 1.6);
    return {x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, walk: t, yaw: 0.1};
  }
  if (t < 4.2) return {x: b[0], z: b[1], walk: 0, yaw: 0.1};
  if (t < 5.0) {
    const k = sm((t - 4.2) / 0.8);
    return {x: b[0] + (c[0] - b[0]) * k, z: b[1] + (c[1] - b[1]) * k, walk: t, yaw: 0.1};
  }
  return {x: c[0], z: c[1], walk: 0, yaw: 0.1};
};
const FENCE_R = 2.7;
const Fence: React.FC<{k: number}> = ({k}) => {
  if (k <= 0) return null;
  const n = 7;
  return (
    <group position={[0.2, -1.6 * (1 - k), 0.15]}>
      {Array.from({length: n}, (_, i) => {
        const a0 = Math.PI * 0.62 + (i / n) * Math.PI * 1.25;
        const a1 = Math.PI * 0.62 + ((i + 1) / n) * Math.PI * 1.25;
        const x0 = Math.cos(a0) * FENCE_R;
        const z0 = Math.sin(a0) * FENCE_R;
        const x1 = Math.cos(a1) * FENCE_R;
        const z1 = Math.sin(a1) * FENCE_R;
        const len = Math.hypot(x1 - x0, z1 - z0);
        const yaw = -Math.atan2(z1 - z0, x1 - x0);
        return (
          <group key={i} position={[(x0 + x1) / 2, 0.8, (z0 + z1) / 2]} rotation={[0, yaw, 0]}>
            <mesh>
              <boxGeometry args={[len, 1.6, 0.03]} />
              <meshStandardMaterial color={LEMON} transparent opacity={0.38} roughness={0.6} />
            </mesh>
            <mesh position={[-len / 2, 0, 0]}>
              <boxGeometry args={[0.07, 1.7, 0.07]} />
              <meshStandardMaterial color={INK} />
            </mesh>
            <mesh position={[0, 0.8, 0]}>
              <boxGeometry args={[len, 0.06, 0.06]} />
              <meshStandardMaterial color={INK} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ===== серия 3: вакуумный захват на портале =====
const TBL_A: V3 = [-1.55, 0, 0.1];
const TBL_B: V3 = [1.55, 0, 0.1];
const BOXV: V3 = [0.5, 0.36, 0.44];
const TOP = 0.6;
const BOX_Y = TOP + BOXV[1] / 2;
type Cycle = {T: number; move: number; slip?: number; wet?: boolean};
// положение присоски и коробки в цикле: вниз 0,35 с, вверх 0,35 с, перенос `move` с, вниз, отпустить, вверх
const gantryAt = (t: number, cycles: Cycle[]) => {
  let x = TBL_A[0];
  let y = 2.2;
  let box: {p: V3; rot: number; wet?: boolean; held: boolean} | null = null;
  const placed: {p: V3; wet?: boolean; rot?: number}[] = [];
  for (const c of cycles) {
    const t0 = c.T;
    const tA = t0 + 0.35;
    const tB = tA + 0.35;
    const tC = tB + c.move;
    const tD = tC + 0.3;
    const tE = tD + 0.35;
    const cupY = BOX_Y + BOXV[1] / 2;
    if (t < t0) {
      if (!box) box = {p: [TBL_A[0], BOX_Y, TBL_A[2]], rot: 0, wet: c.wet, held: false};
      break;
    }
    if (t < tA) {
      x = TBL_A[0];
      y = 2.2 + (cupY - 2.2) * sm((t - t0) / 0.35);
      box = {p: [TBL_A[0], BOX_Y, TBL_A[2]], rot: 0, wet: c.wet, held: false};
      break;
    }
    const lift = (tt: number) => cupY + (1.6 - cupY) * sm((tt - tA) / 0.35);
    const xs = (tt: number) => TBL_A[0] + (TBL_B[0] - TBL_A[0]) * sm((tt - tB) / c.move);
    if (c.slip !== undefined) {
      const ts = tB + c.move * c.slip;
      if (t >= ts) {
        // сорвалась: летит вперёд и вниз, ложится на мат
        const xs0 = xs(ts);
        const vx = ((TBL_B[0] - TBL_A[0]) / c.move) * 1.2;
        const dt = t - ts;
        const yb = Math.max(BOXV[1] / 2, 1.6 - BOXV[1] / 2 - 4.9 * dt * dt);
        const land = Math.sqrt((1.6 - BOXV[1]) / 4.9);
        const dx = vx * Math.min(dt, land) * 0.55;
        box = {p: [xs0 + dx, yb, TBL_A[2] + 0.35 * Math.min(dt, land)], rot: Math.min(1, dt / land) * 0.5, wet: c.wet, held: false};
        x = Math.min(TBL_B[0], xs(Math.min(t, tC)));
        y = 1.6 + BOXV[1] / 2;
        break;
      }
    }
    if (t < tB) {
      x = TBL_A[0];
      y = lift(t);
      box = {p: [x, y - BOXV[1] / 2, TBL_A[2]], rot: 0, wet: c.wet, held: true};
      break;
    }
    if (t < tC) {
      x = xs(t);
      y = 1.6;
      box = {p: [x, y - BOXV[1] / 2, TBL_A[2]], rot: 0, wet: c.wet, held: true};
      break;
    }
    if (t < tD) {
      x = TBL_B[0];
      y = 1.6 + (cupY - 1.6) * sm((t - tC) / 0.3);
      box = {p: [x, y - BOXV[1] / 2, TBL_B[2]], rot: 0, wet: c.wet, held: true};
      break;
    }
    if (t < tE) {
      x = TBL_B[0];
      y = cupY + (2.2 - cupY) * sm((t - tD) / 0.35);
    } else {
      x = TBL_B[0];
      y = 2.2;
    }
    placed.length = 0;
    placed.push({p: [TBL_B[0], BOX_Y, TBL_B[2]], wet: c.wet});
    box = null;
  }
  return {x, y, box, placed};
};
const WetShell: React.FC<{p: V3; rot?: number}> = ({p, rot = 0}) => (
  <group position={p} rotation={[0, 0, rot]}>
    <mesh>
      <boxGeometry args={[BOXV[0] + 0.02, BOXV[1] + 0.02, BOXV[2] + 0.02]} />
      <meshStandardMaterial color="#2B6CB0" transparent opacity={0.33} roughness={0.05} metalness={0.2} />
    </mesh>
    {[
      [-0.12, 0.19, 0.05],
      [0.1, 0.19, -0.08],
      [0.02, 0.19, 0.12],
      [0.26, 0.05, 0.1],
      [-0.26, -0.03, -0.05],
    ].map((d, i) => (
      <mesh key={i} position={d as V3}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshStandardMaterial color="#7FB3E6" roughness={0.05} metalness={0.1} />
      </mesh>
    ))}
  </group>
);
const Gantry: React.FC<{t: number; cycles: Cycle[]}> = ({t, cycles}) => {
  const g = gantryAt(t, cycles);
  return (
    <>
      <Pedestal p={TBL_A} />
      <Pedestal p={TBL_B} />
      {/* портал: стойки, балка, каретка, штанга, присоска */}
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, 1.45, TBL_A[2] - 0.55]}>
          <boxGeometry args={[0.16, 2.9, 0.16]} />
          <meshStandardMaterial color={INK} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 2.9, TBL_A[2] - 0.55]}>
        <boxGeometry args={[5.0, 0.2, 0.22]} />
        <meshStandardMaterial color="#F1EDE6" roughness={0.45} />
      </mesh>
      <mesh position={[0, 2.79, TBL_A[2] - 0.42]}>
        <boxGeometry args={[5.0, 0.03, 0.03]} />
        <meshStandardMaterial color={LEMON} emissive={LEMON} emissiveIntensity={0.5} />
      </mesh>
      <group position={[g.x, 0, TBL_A[2]]}>
        <mesh position={[0, 2.85, -0.38]}>
          <boxGeometry args={[0.42, 0.3, 0.42]} />
          <meshStandardMaterial color="#F1EDE6" roughness={0.4} />
        </mesh>
        <mesh position={[0, (2.75 + g.y) / 2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2.75 - g.y, 16]} />
          <meshStandardMaterial color="#B9B6B0" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, g.y + 0.04, 0]}>
          <cylinderGeometry args={[0.1, 0.16, 0.1, 24]} />
          <meshStandardMaterial color={INK} roughness={0.7} />
        </mesh>
        <mesh position={[0, g.y + 0.12, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 16]} />
          <meshStandardMaterial color={LEMON} emissive={LEMON} emissiveIntensity={0.35} />
        </mesh>
      </group>
      {/* мат под зоной переноса */}
      <mesh position={[0, 0.02, TBL_A[2] + 0.2]}>
        <boxGeometry args={[2.0, 0.04, 1.4]} />
        <meshStandardMaterial color="#E9E2C8" roughness={0.9} />
      </mesh>
      {g.box ? (
        <>
          <CargoBox s={BOXV} p={g.box.p} rot={[0, 0, g.box.rot]} />
          {g.box.wet ? <WetShell p={g.box.p} rot={g.box.rot} /> : null}
        </>
      ) : null}
      {g.placed.map((b, i) => (
        <React.Fragment key={i}>
          <CargoBox s={BOXV} p={b.p} />
          {b.wet ? <WetShell p={b.p} /> : null}
        </React.Fragment>
      ))}
    </>
  );
};

// ===== серия 3: две роборуки у камеры (Пятёрка — матовый кубик, Рубин — блестящая деталь) =====
const ITEM_A: V3 = [-0.2, 0.55, 0.15];
const R1: V3 = [-1.2, Math.PI / 2, 0];
const handPick = (miss: number): HandPlan => {
  const item: V3 = [ITEM_A[0] + miss, ITEM_A[1], ITEM_A[2]];
  return {
    keys: [
      {at: 0, pose: "open", p: [0.5, 0.3, -0.1], rot: [0, 0.55, 0]},
      {at: 0.6, pose: "pinchOpen", p: up(handReach(item, R1), 0.28), rot: R1},
      {at: 1.3, p: handReach(item, R1)},
      {at: 1.65, pose: miss ? "fist" : "hold"},
      {at: 2.3, p: up(handReach(item, R1), 0.35)},
      {at: 3.3, pose: miss ? "relaxed" : "hold"},
    ],
    items: miss ? [] : [{start: ITEM_A, size: 0.12, shape: "cube", carry: [[1.7, 99]]}],
  };
};
const HandsCell: React.FC<{t: number; night?: boolean; glare?: number; fixed?: number}> = ({t, night, glare = 0, fixed = 0}) => {
  const tt = (t % 4.2) + 0.0;
  const missR = fixed > 0.5 ? 0 : 0.17;
  const shinyHeld = fixed > 0.5 && tt > 1.7;
  const shinyP: V3 = shinyHeld ? [1.25 + ITEM_A[0], ITEM_A[1] + Math.min(0.35, (tt - 1.7) * 0.5), ITEM_A[2]] : [1.25 + ITEM_A[0], ITEM_A[1], ITEM_A[2]];
  const flash = fixed > 0.5 ? 0 : Math.max(0, Math.sin(Math.PI * 2 * (t * 0.9))) * (night ? 1 : 0.7);
  return (
    <>
      {/* ложемент под деталями — после исправления */}
      {fixed > 0 ? (
        <mesh position={[0.2, 0.47, ITEM_A[2]]} scale={[1, fixed, 1]}>
          <boxGeometry args={[3.2, 0.06, 0.7]} />
          <meshStandardMaterial color={INK} roughness={0.6} />
        </mesh>
      ) : null}
      <group position={[-1.05, 0, 0]}>
        <HandStand p={[ITEM_A[0], 0, ITEM_A[2]]} />
        <HandModel plan={handPick(0)} t={tt} />
      </group>
      <group position={[1.25, 0, 0]}>
        <HandStand p={[ITEM_A[0], 0, ITEM_A[2]]} />
        <HandModel plan={fixed > 0.5 ? handPick(0) : handPick(missR)} t={tt} skin="chrome" />
      </group>
      {/* блестящая деталь Рубина */}
      <mesh position={shinyP}>
        <cylinderGeometry args={[0.07, 0.07, 0.12, 24]} />
        <meshStandardMaterial color="#DADDE2" metalness={1} roughness={0.08} />
      </mesh>
      <Glare p={[shinyP[0] + 0.05, shinyP[1] + 0.08, shinyP[2] + 0.08]} k={flash} r={0.12} />
      {/* камера над ячейкой и её конус */}
      <group position={[0.2, 2.35, 0.2]}>
        <mesh>
          <boxGeometry args={[0.42, 0.22, 0.26]} />
          <meshStandardMaterial color={INK} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.13, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 20]} />
          <meshStandardMaterial color="#5C7FA8" metalness={0.6} roughness={0.15} />
        </mesh>
        <mesh position={[0, -0.95, 0]}>
          <coneGeometry args={[1.25, 1.7, 32, 1, true]} />
          <meshBasicMaterial color={fixed > 0.5 ? LEMON : night ? "#9FB8FF" : LEMON} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* солнце из окна: полоса света ползёт по столу */}
      {glare > 0 ? (
        <mesh position={[-2.2 + glare * 3.6, 0.6, 0.1]} rotation={[0, 0, -0.55]}>
          <boxGeometry args={[0.55, 2.6, 1.3]} />
          <meshBasicMaterial color="#FFE9A8" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ) : null}
      {/* кожух с собственной подсветкой */}
      {fixed > 0 ? (
        <group position={[0.2, 0, 0.1]} scale={[1, fixed, 1]}>
          {[
            [-1.95, -0.85],
            [2.35, -0.85],
            [-1.95, 1.05],
            [2.35, 1.05],
          ].map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x - 0.2, 1.35, z]}>
              <boxGeometry args={[0.06, 2.7, 0.06]} />
              <meshStandardMaterial color={INK} />
            </mesh>
          ))}
          <mesh position={[0, 2.7, 0.1]}>
            <boxGeometry args={[4.3, 0.06, 1.95]} />
            <meshStandardMaterial color={INK} transparent opacity={0.55} />
          </mesh>
          <mesh position={[0, 2.62, 0.1]}>
            <boxGeometry args={[3.6, 0.05, 0.16]} />
            <meshStandardMaterial color={LEMON} emissive={LEMON} emissiveIntensity={1.4} />
          </mesh>
          <mesh position={[0, 1.35, -0.85]}>
            <boxGeometry args={[4.3, 2.7, 0.02]} />
            <meshStandardMaterial color={INK} transparent opacity={0.18} />
          </mesh>
        </group>
      ) : null}
    </>
  );
};

export const WORLD_CAM: Record<WorldId, Cam> = {
  overload: {pos: [4.6, 3.6, 6.6], target: [-0.2, 1.0, 0.6], fov: 36},
  fence: {pos: [3.8, 6.6, 8.6], target: [-0.6, 0.6, -0.3], fov: 40},
  reach: {pos: [2.6, 5.4, 6.4], target: [0.9, 0.5, -0.5], fov: 40},
  reachFixed: {pos: [2.6, 5.4, 6.4], target: [0.9, 0.5, -0.5], fov: 40},
  pack: {pos: [5.2, 5.0, 8.4], target: [-0.3, 0.8, 0.2], fov: 38},
  slip: {pos: [0.3, 2.2, 5.4], target: [0, 1.05, 0.1], fov: 42},
  slipSlow: {pos: [0.3, 2.2, 5.4], target: [0, 1.05, 0.1], fov: 42},
  hands: {pos: [0.2, 2.1, 6.6], target: [0.15, 0.85, 0], fov: 38},
  handsNight: {pos: [0.2, 2.1, 6.6], target: [0.15, 0.85, 0], fov: 38},
  glare: {pos: [0.3, 2.2, 6.4], target: [0.15, 0.95, 0], fov: 38},
  fixed: {pos: [0.3, 2.2, 6.4], target: [0.15, 0.95, 0], fov: 38},
};

// всё, что нужно 2D-слою: тревога, где «!»
export const worldState = (w: WorldId, t: number) => {
  if (w === "overload") return {alarm: t > 2.2 && t < 5.4};
  if (w === "fence") return {alarm: t > 2.6 && t < 4.4};
  if (w === "reach") return {alarm: t > 4.9};
  if (w === "slip") return {alarm: t > 5.1};
  if (w === "hands" || w === "handsNight") return {alarm: (t % 4.2) > 1.7 && (t % 4.2) < 3.4};
  return {alarm: false};
};

export const World: React.FC<{w: WorldId; t: number; scout?: {at: number; x: number; z: number; yaw: number}; chalk?: number}> = ({w, t, scout, chalk = 0}) => {
  const floor = <MockFloor w={20} d={14} p={[0, 0, -1.4]} />;
  const scoutEl = scout ? (
    <>
      <DogModel t={t - scout.at} plan={{stays: [{at: -1, x: scout.x, z: scout.z, yaw: scout.yaw}], actions: [{at: 0.5, kind: "hop"}]}} />
      <group position={[scout.x, 0, scout.z]}>
        <LidarSweep t={t} range={3.2} y={0.45} o={Math.min(1, Math.max(0, (t - scout.at - 0.4) * 2))} />
      </group>
    </>
  ) : null;
  if (w === "overload") {
    const plan = overloadPlan();
    const alarm = t > 2.2 && t < 5.4;
    return (
      <>
        {floor}
        <Conveyor {...CONV} boxes={[{enter: -20, pickAt: 1.45, s: BIG}]} t={Math.min(t, 0.1)} />
        <ArmModel skin="cobot" t={t} plan={plan} />
        <FloorRing r={0.9} color={alarm ? RED : LEMON} fill={alarm ? 0.22 : 0.08} o={0.9} />
        <Glare p={up(PICK, 0.6)} k={alarm ? 0.5 + 0.5 * Math.sin(t * 14) : 0} color={RED} r={0.22} />
      </>
    );
  }
  if (w === "fence") {
    const wk = workerFence(t);
    const near = t > 2.6 && t < 4.4;
    const fenceK = sm((t - 5.0) / 0.9);
    // промышленный робот работает быстро; человек близко — стоп; потом только за ограждением
    const tr = t < 2.8 ? t * 1.35 : t < 6.0 ? 2.8 * 1.35 : 2.8 * 1.35 + (t - 6.0) * 1.35;
    return (
      <>
        {floor}
        <ArmPalletScene skin="aura" n={4} t={tr} />
        <FloorRing r={2.5} color={near ? RED : LEMON} fill={near ? 0.2 : 0.06} o={0.9} p={[0.2, 0, 0.15]} />
        <Fence k={fenceK} />
        <Worker3D x={wk.x} z={wk.z} yaw={wk.yaw} crouch={0} walk={wk.walk} />
      </>
    );
  }
  if (w === "reach" || w === "reachFixed") {
    const fixed = w === "reachFixed";
    const slide = fixed ? sm((t - 0.5) / 1.0) : 0;
    const base = lerp3([0, 0, 0], BASE_MOVED, slide);
    const plan = fixed ? reachPlan(BASE_MOVED, 1.8, 4, false) : reachPlan([0, 0, 0], 0.4, 4, true);
    const slots = [0, 1, 2, 3].map((i) => palletSlot(PAL_FAR, i, BIG));
    const lastFail = !fixed && t > 0.4 + 3 * 2.4 + 1.5;
    return (
      <>
        {floor}
        <Conveyor {...CONV} boxes={(fixed ? [0, 1, 2, 3].map((i) => 1.8 + i * 2.4) : [0, 1, 2, 3].map((i) => 0.4 + i * 2.4)).map((T) => ({enter: T - 3.4, pickAt: T + 0.58, s: BIG}))} t={t} />
        <Pallet p={PAL_FAR} />
        <group position={base}>
          <ArmModel skin="cobot" t={fixed ? Math.max(0, t) : t} plan={fixed && t < 1.8 ? {keys: [{at: 0, j: HOME, grip: 0.55}]} : plan} />
          <FloorRing r={REACH + 0.03} color={INK} o={0.45} dash draw={chalk} w={0.17} />
          <FloorRing r={REACH} color="#FFFFFF" o={1} dash draw={chalk} w={0.11} />
        </group>
        {slots.map((s, i) => {
          const far = Math.hypot(s[0] - base[0], s[2] - base[2]) > REACH;
          return (
            <React.Fragment key={i}>
              {far ? <Cross p={[s[0], 0.02, s[2]]} k={lastFail || chalk > 0.95 ? 1 : 0} /> : <Tick p={[s[0], 0.02, s[2]]} k={chalk > 0.95 || fixed ? 1 : 0} />}
            </React.Fragment>
          );
        })}
        {scoutEl}
      </>
    );
  }
  if (w === "pack") {
    return (
      <>
        {floor}
        <ArmPalletScene skin="cobot" n={4} t={t} />
        <FloorRing r={2.2} color={LEMON} fill={0.07} o={0.85} p={[0.2, 0, 0.15]} />
        <Worker3D x={-3.1} z={2.45} yaw={-0.35} crouch={0.12 + 0.1 * Math.sin(t * 2.2)} />
        <Shadow w={1.0} d={0.7} p={[-3.1, 0, 2.45]} o={0.5} />
      </>
    );
  }
  if (w === "slip" || w === "slipSlow") {
    const cycles: Cycle[] = w === "slip" ? [{T: 0.3, move: 0.6}, {T: 3.4, move: 0.6, wet: true, slip: 0.48}] : [{T: 0.3, move: 1.3, wet: true}, {T: 3.8, move: 1.3, wet: true}];
    return (
      <>
        {floor}
        <Gantry t={t} cycles={cycles} />
        {scoutEl}
      </>
    );
  }
  // hands / handsNight / glare / fixed
  const fixedK = w === "fixed" ? Math.min(1, Math.max(0, t / 0.8)) : 0;
  return (
    <>
      {floor}
      <HandsCell t={t} night={w === "handsNight"} glare={w === "glare" ? Math.min(1, t / 6) : 0} fixed={fixedK} />
      {scoutEl}
    </>
  );
};
