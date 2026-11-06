// «Робокитай», серия 4 · Шэньян (06.11.2026) — сварочная ячейка «Северной кузницы». Титан (`ArmModel skin="industrial"`)
// с горелкой в захвате, дуга (вспышка, свет, искры, дымок), шов остывает от оранжевого к серому; сварочные шторки и цех
// с высокими окнами. Миры (`WeldWorld`, время мира `t` — секунды шага):
// - weldCover — холодное открытие «через год»: ячейка под чехлом, пыль в луче из окна;
// - weldGap — заготовка после плазмы: настоящий зазор «гуляет», программа — прямая (лимонный пунктир); робот варит по
//   программе, где зазор ушёл — красные метки непровара;
// - weldWait — одна позиция: робот сварил и ждёт, пока сварщик-оператор снимет раму и положит новую;
// - weldScan — Скаут идёт вдоль 12 стопок деталей (выпуск за 12 месяцев): повторяющиеся — лимонная метка, разовые — красная;
// - weldTwo — двухпозиционный позиционер: Титан варит на одной стороне, оператор загружает другую, стол поворачивается,
//   готовые рамы растут стопкой.
import React from "react";
import * as THREE from "three";
import {ArmModel, HOME, armPose, armTip, type ArmKey} from "../../components/aura3d/AuraArm";
import {DogModel} from "../../components/aura3d/AuraDog";
import {Shadow, type Cam, type PathState, type V3} from "../../components/aura3d/kit";
import {Worker3D} from "./drama3d";
import {LidarSweep, MockFloor} from "./scene3d";

export type WeldId = "weldCover" | "weldGap" | "weldWait" | "weldScan" | "weldTwo";
const LEMON = "#FFF65D";
const RED = "#E5383B";
const INK = "#262626";
const STEEL = "#6E747C";
const sm = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};
// детерминированный «случай» по номеру
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const TORCH = 0.4; // от центра захвата до точки дуги (горелка в захвате смотрит вниз)
const at = (p: V3): V3 => [p[0], p[1] + TORCH, p[2]];

// ===== цех: пол, стена с высокими окнами, сварочные шторки =====
const Shop: React.FC<{dim?: boolean}> = ({dim}) => (
  <>
    <MockFloor w={18} d={12} p={[1, 0, -0.5]} tone={dim ? "#BDB6AA" : "#CFC8BC"} />
    <mesh position={[1, 2.6, -5.4]}>
      <boxGeometry args={[18, 5.2, 0.2]} />
      <meshStandardMaterial color={dim ? "#9E978C" : "#E4DED3"} roughness={0.95} />
    </mesh>
    {[-4.5, -1.2, 2.1, 5.4].map((x) => (
      <mesh key={x} position={[x, 3.6, -5.28]}>
        <boxGeometry args={[2.1, 1.7, 0.04]} />
        <meshStandardMaterial color={dim ? "#C9D3DA" : "#F4F6F2"} emissive={dim ? "#8FA2B0" : "#FFFFFF"} emissiveIntensity={dim ? 0.35 : 0.5} roughness={0.3} />
      </mesh>
    ))}
    {/* сварочные шторки за ячейкой: стойки и полупрозрачные оранжево-красные полотна */}
    {[-1.6, 0.6, 2.8, 5.0].map((x, i) => (
      <group key={x}>
        <mesh position={[x, 1.15, -2.6]}>
          <boxGeometry args={[0.07, 2.3, 0.07]} />
          <meshStandardMaterial color={INK} roughness={0.5} />
        </mesh>
        {i < 3 ? (
          <mesh position={[x + 1.1, 1.12, -2.6]}>
            <boxGeometry args={[2.1, 2.0, 0.02]} />
            <meshStandardMaterial color="#C8551E" transparent opacity={dim ? 0.35 : 0.55} roughness={0.6} />
          </mesh>
        ) : null}
      </group>
    ))}
    <mesh position={[1.7, 2.3, -2.6]}>
      <boxGeometry args={[6.7, 0.06, 0.06]} />
      <meshStandardMaterial color={INK} />
    </mesh>
  </>
);

// ===== дуга: вспышка, свет, искры, дым =====
export const Arc: React.FC<{p: V3; t: number; on: number}> = ({p, t, on}) => {
  if (on <= 0.01) return null;
  const fl = 0.75 + 0.25 * Math.sin(t * 61) * Math.sin(t * 23);
  const sparks = Array.from({length: 34}, (_, i) => {
    const life = 0.42 + rnd(i, 1) * 0.25;
    const age = (t * 1.0 + rnd(i, 2) * 3) % life;
    const v: V3 = [(rnd(i, 3) - 0.5) * 3.2, 0.8 + rnd(i, 4) * 2.2, (rnd(i, 5) - 0.5) * 3.2];
    const g = 14;
    const pos = (a: number): V3 => [p[0] + v[0] * a, p[1] + v[1] * a - 0.5 * g * a * a, p[2] + v[2] * a];
    const a1 = pos(age);
    const a0 = pos(Math.max(0, age - 0.05));
    const d = new THREE.Vector3(a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]);
    const len = Math.max(0.01, d.length());
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    const fade = 1 - age / life;
    return {mid: [(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2, (a0[2] + a1[2]) / 2] as V3, len, q, fade};
  });
  return (
    <group>
      <pointLight position={[p[0], p[1] + 0.25, p[2]]} intensity={6 * fl * on} distance={6} decay={1.6} color="#FFB46A" />
      <mesh position={p}>
        <sphereGeometry args={[0.05 * (0.8 + fl * 0.4), 12, 8]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={p}>
        <sphereGeometry args={[0.2 * fl, 16, 12]} />
        <meshBasicMaterial color="#FFD27A" transparent opacity={0.55 * on} depthWrite={false} />
      </mesh>
      <mesh position={p}>
        <sphereGeometry args={[0.42 * fl, 16, 12]} />
        <meshBasicMaterial color="#FF9A3C" transparent opacity={0.16 * on} depthWrite={false} />
      </mesh>
      {sparks.map((s, i) => (
        <mesh key={i} position={s.mid} quaternion={s.q}>
          <cylinderGeometry args={[0.009, 0.009, s.len * 1.6, 4]} />
          <meshBasicMaterial color={s.fade > 0.55 ? "#FFE7A3" : "#FF8A2A"} transparent opacity={Math.min(1, s.fade * 1.4) * on} depthWrite={false} />
        </mesh>
      ))}
      {Array.from({length: 5}, (_, i) => {
        const age = (t * 0.6 + i / 5) % 1;
        return (
          <mesh key={`s${i}`} position={[p[0] + Math.sin(i * 2 + t) * 0.12 * age, p[1] + 0.2 + age * 1.3, p[2] + 0.1 * age]}>
            <sphereGeometry args={[0.1 + age * 0.3, 10, 8]} />
            <meshBasicMaterial color="#8E8A84" transparent opacity={0.16 * (1 - age) * on} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// горелка в захвате: корпус, медное сопло вниз до точки дуги
const Torch: React.FC<{plan: {keys: ArmKey[]}; t: number; base?: V3}> = ({plan, t, base = [0, 0, 0]}) => {
  const tip = armTip(armPose(plan, t).j);
  const p: V3 = [tip[0] + base[0], tip[1] + base[1], tip[2] + base[2]];
  return (
    <group position={p}>
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.2, 14]} />
        <meshStandardMaterial color={INK} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.14, 14]} />
        <meshStandardMaterial color="#C27B3E" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* шланг горелки к плечу */}
      <mesh position={[-0.12, 0.1, 0]} rotation={[0, 0, 0.9]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial color="#17191C" roughness={0.8} />
      </mesh>
    </group>
  );
};
const arcPoint = (plan: {keys: ArmKey[]}, t: number, base: V3 = [0, 0, 0]): V3 => {
  const tip = armTip(armPose(plan, t).j);
  return [tip[0] + base[0], tip[1] + base[1] - TORCH, tip[2] + base[2]];
};

// стол-верстак
const Table: React.FC<{p: V3; w?: number; d?: number; h?: number}> = ({p, w = 1.5, d = 2.2, h = 0.78}) => (
  <group position={p}>
    <mesh position={[0, h - 0.04, 0]}>
      <boxGeometry args={[w, 0.08, d]} />
      <meshStandardMaterial color="#5C6168" metalness={0.5} roughness={0.5} />
    </mesh>
    {[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[(sx * (w - 0.12)) / 2, (h - 0.08) / 2, (sz * (d - 0.12)) / 2]}>
          <boxGeometry args={[0.08, h - 0.08, 0.08]} />
          <meshStandardMaterial color={INK} roughness={0.6} />
        </mesh>
      )),
    )}
    <Shadow w={w + 0.4} d={d + 0.4} o={0.45} />
  </group>
);

// сварная рама: две продольные балки, две поперечины, прихватки; bead 0…1 — сколько шва по ближней балке готово, hot — когда
const Frame: React.FC<{p: V3; yaw?: number; bead?: number; cool?: number; ghost?: boolean}> = ({p, yaw = 0, bead = 0, cool = 1, ghost}) => {
  const mat = <meshStandardMaterial color={STEEL} metalness={0.55} roughness={0.42} transparent={ghost} opacity={ghost ? 0.35 : 1} />;
  const n = 14;
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.07, 0]}>
          <boxGeometry args={[0.13, 0.14, 1.1]} />
          {mat}
        </mesh>
      ))}
      {[-0.46, 0.46].map((z) => (
        <mesh key={z} position={[0, 0.07, z]}>
          <boxGeometry args={[0.6, 0.12, 0.12]} />
          {mat}
        </mesh>
      ))}
      {/* шов по верху ближней балки: сегменты остывают от оранжевого к серому */}
      {Array.from({length: n}, (_, i) => {
        const u = (i + 0.5) / n;
        if (u > bead) return null;
        const age = Math.max(0, (bead - u) * 3) * cool;
        const c = new THREE.Color("#FFB04A").lerp(new THREE.Color("#55585E"), Math.min(1, age));
        return (
          <mesh key={i} position={[-0.3, 0.15, -0.45 + u * 0.9]}>
            <boxGeometry args={[0.07, 0.035, 0.9 / n + 0.005]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={Math.max(0, 1 - age) * 1.5} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

// ===== weldGap: зазор после плазмы гуляет, программа — прямая =====
const GAP_X = 1.75;
const GAP_Y = 0.78 + 0.06;
const GZ0 = -0.85;
const GZ1 = 0.85;
const dev = (z: number) => 0.075 * Math.sin(z * 4.0 + 0.9);
const GAP_T: [number, number] = [1.3, 5.8];
const gapPlan = (): {keys: ArmKey[]} => {
  const keys: ArmKey[] = [{at: 0, j: HOME, grip: 0.2}];
  keys.push({at: 1.0, p: at([GAP_X, GAP_Y + 0.3, GZ0]), tool: Math.PI, grip: 0.2});
  keys.push({at: GAP_T[0], p: at([GAP_X, GAP_Y, GZ0]), grip: 0.2});
  const n = 10;
  for (let i = 1; i <= n; i++) keys.push({at: GAP_T[0] + ((GAP_T[1] - GAP_T[0]) * i) / n, p: at([GAP_X, GAP_Y, GZ0 + ((GZ1 - GZ0) * i) / n]), grip: 0.2});
  keys.push({at: GAP_T[1] + 0.5, p: at([GAP_X, GAP_Y + 0.5, GZ1]), grip: 0.2});
  return {keys};
};
const GapPlates: React.FC<{t: number}> = ({t}) => {
  const n = 26;
  const done = Math.max(0, Math.min(1, (t - GAP_T[0]) / (GAP_T[1] - GAP_T[0])));
  return (
    <group>
      {Array.from({length: n}, (_, i) => {
        const z0 = GZ0 - 0.1 + ((GZ1 - GZ0 + 0.2) * i) / n;
        const z1 = z0 + (GZ1 - GZ0 + 0.2) / n;
        const zc = (z0 + z1) / 2;
        const xs = GAP_X + dev(zc);
        const g = 0.05;
        const L0 = 1.15;
        const R1 = 2.35;
        return (
          <group key={i}>
            <mesh position={[(L0 + xs - g / 2) / 2, GAP_Y - 0.03, zc]}>
              <boxGeometry args={[xs - g / 2 - L0, 0.06, z1 - z0 + 0.002]} />
              <meshStandardMaterial color="#7C828A" metalness={0.55} roughness={0.4} />
            </mesh>
            <mesh position={[(xs + g / 2 + R1) / 2, GAP_Y - 0.03, zc]}>
              <boxGeometry args={[R1 - xs - g / 2, 0.06, z1 - z0 + 0.002]} />
              <meshStandardMaterial color="#7C828A" metalness={0.55} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
      {/* программа: прямая лимонным пунктиром */}
      {Array.from({length: 16}, (_, i) => {
        const z = GZ0 + ((GZ1 - GZ0) * (i + 0.25)) / 16;
        return (
          <mesh key={`p${i}`} position={[GAP_X, GAP_Y + 0.012, z]}>
            <boxGeometry args={[0.035, 0.01, ((GZ1 - GZ0) / 16) * 0.55]} />
            <meshBasicMaterial color={LEMON} />
          </mesh>
        );
      })}
      {/* шов по программе и метки непровара там, где настоящий зазор ушёл в сторону */}
      {Array.from({length: 20}, (_, i) => {
        const u = (i + 0.5) / 20;
        if (u > done) return null;
        const z = GZ0 + (GZ1 - GZ0) * u;
        const miss = Math.abs(dev(z)) > 0.042;
        const age = (done - u) * 4;
        const c = new THREE.Color("#FFB04A").lerp(new THREE.Color("#55585E"), Math.min(1, age));
        return (
          <group key={`b${i}`}>
            <mesh position={[GAP_X, GAP_Y + 0.02, z]}>
              <boxGeometry args={[0.07, 0.035, (GZ1 - GZ0) / 20 + 0.004]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={Math.max(0, 1 - age) * 1.5} />
            </mesh>
            {miss && age > 0.6 ? (
              <mesh position={[GAP_X + dev(z), GAP_Y + 0.04, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.07, 0.11, 24]} />
                <meshBasicMaterial color={RED} side={THREE.DoubleSide} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
};

// ===== weldWait: одна позиция, робот ждёт оператора =====
const WAIT_TABLE: V3 = [1.85, 0, 0];
const FRAME_ON: V3 = [1.85, 0.78, 0];
const waitPlan = (): {keys: ArmKey[]} => {
  const p0: V3 = [FRAME_ON[0] - 0.3, FRAME_ON[1] + 0.15, -0.45];
  const p1: V3 = [FRAME_ON[0] - 0.3, FRAME_ON[1] + 0.15, 0.45];
  return {
    keys: [
      {at: 0, p: at(p0), tool: Math.PI, grip: 0.2},
      {at: 2.2, p: at(p1), grip: 0.2},
      {at: 2.8, j: HOME, grip: 0.2},
      {at: 8.4, j: HOME, grip: 0.2},
      {at: 9.0, p: at([p0[0], p0[1] + 0.3, p0[2]]), tool: Math.PI, grip: 0.2},
    ],
  };
};
// оператор: подходит, снимает раму, уносит, приносит новую, кладёт, уходит
const waitWorker = (t: number) => {
  const A: [number, number] = [5.6, 1.6];
  const B: [number, number] = [3.25, 0.2];
  const mv = (a: [number, number], b: [number, number], t0: number, t1: number) => {
    const k = sm((t - t0) / (t1 - t0));
    return {x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k};
  };
  if (t < 2.6) return {x: A[0], z: A[1], walk: 0, crouch: 0, box: false, yaw: Math.PI};
  if (t < 3.6) return {...mv(A, B, 2.6, 3.6), walk: t, crouch: 0, box: false, yaw: Math.PI * 0.92};
  if (t < 4.3) return {x: B[0], z: B[1], walk: 0, crouch: Math.sin(((t - 3.6) / 0.7) * Math.PI) * 0.5, box: t > 3.95, yaw: Math.PI};
  if (t < 5.3) return {...mv(B, A, 4.3, 5.3), walk: t, crouch: 0, box: true, yaw: 0.2};
  if (t < 5.9) return {x: A[0], z: A[1], walk: 0, crouch: 0, box: t < 5.6, yaw: Math.PI};
  if (t < 6.9) return {...mv(A, B, 5.9, 6.9), walk: t, crouch: 0, box: true, yaw: Math.PI * 0.92};
  if (t < 7.6) return {x: B[0], z: B[1], walk: 0, crouch: Math.sin(((t - 6.9) / 0.7) * Math.PI) * 0.5, box: t < 7.25, yaw: Math.PI};
  return {...mv(B, A, 7.6, 8.6), walk: t, crouch: 0, box: false, yaw: 0.2};
};

// ===== weldScan: 12 стопок деталей (выпуск за 12 месяцев) =====
const STACKS = Array.from({length: 12}, (_, i) => ({x: -3.85 + i * 0.7, unique: i === 3 || i === 7 || i === 10}));
const SCAN_PATH = (t: number): PathState => {
  const x0 = -4.9;
  const x1 = 3.4;
  const k = sm((t - 0.3) / 5.8);
  const x = x0 + (x1 - x0) * k;
  return {x, z: 1.05, yaw: 0, dist: x - x0, speed: t > 0.3 && t < 6.1 ? 1.6 : 0, moving: t > 0.3 && t < 6.1};
};
const Bracket: React.FC<{p: V3; unique?: boolean; i: number}> = ({p, unique, i}) =>
  unique ? (
    <group position={p} rotation={[0, i * 0.7, 0]}>
      <mesh position={[0, 0.16, 0]} rotation={[0, 0, i % 2 ? 0.5 : 0]}>
        {i % 2 ? <cylinderGeometry args={[0.16, 0.22, 0.32, 6]} /> : <boxGeometry args={[0.5, 0.32, 0.22]} />}
        <meshStandardMaterial color="#8C6F55" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  ) : (
    <group position={p}>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.46, 0.08, 0.34]} />
        <meshStandardMaterial color={STEEL} metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh position={[-0.19, 0.16, 0]}>
        <boxGeometry args={[0.08, 0.24, 0.34]} />
        <meshStandardMaterial color={STEEL} metalness={0.55} roughness={0.42} />
      </mesh>
    </group>
  );

// ===== weldTwo: двухпозиционный позиционер =====
const POS_C: V3 = [2.55, 0, 0];
const POS_TOP = 0.78;
const CYC = 3.4; // сварка 2,5 с, поворот 0,9 с
const posAngle = (t: number) => {
  const n = Math.floor(t / CYC);
  const u = t - n * CYC;
  return Math.PI * (n + sm((u - 2.5) / 0.9));
};
const twoPlan = (t0: number, cycles: number): {keys: ArmKey[]} => {
  const keys: ArmKey[] = [{at: 0, j: HOME, grip: 0.2}];
  const zA = -0.45;
  const zB = 0.45;
  const x = POS_C[0] - 0.62 - 0.3;
  const y = POS_TOP + 0.12 + 0.16;
  for (let c = 0; c < cycles; c++) {
    const T = t0 + c * CYC;
    keys.push({at: T + 0.1, p: at([x, y + 0.25, zA]), tool: Math.PI, grip: 0.2});
    keys.push({at: T + 0.3, p: at([x, y, zA]), grip: 0.2});
    keys.push({at: T + 2.35, p: at([x, y, zB]), grip: 0.2});
    keys.push({at: T + 2.6, p: at([x, y + 0.35, zB]), grip: 0.2});
    keys.push({at: T + 3.3, p: at([x, y + 0.35, zA]), grip: 0.2});
  }
  return {keys};
};
const Positioner: React.FC<{t: number; t0: number}> = ({t, t0}) => {
  const tt = Math.max(0, t - t0);
  const th = posAngle(tt);
  const n = Math.floor(tt / CYC);
  const u = tt - n * CYC;
  // сторона к роботу (A) — та, что сейчас варится; противоположная (B) — у оператора
  const beadA = sm((u - 0.3) / 2.05);
  // две рамы на столе: k-я рама варится в цикле k, затем уезжает к оператору и снимается
  const frames = [0, 1].map((side) => {
    // какая сторона стола смотрит на робота: при th = nπ сторона (n % 2)
    const facingRobot = (n + side) % 2 === 0;
    const welding = facingRobot;
    const bead = welding ? beadA : 1;
    const taken = !welding && u > 0.9 && u < 1.9; // оператор снял готовую и кладёт новую
    return {side, bead: taken ? 0 : u >= 1.9 && !welding ? 0 : bead, show: !taken};
  });
  return (
    <group position={[POS_C[0], 0, POS_C[2]]}>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.45, 0.6, 0.68, 28]} />
        <meshStandardMaterial color={INK} roughness={0.5} />
      </mesh>
      <Shadow w={3.2} d={3.2} o={0.5} />
      <group rotation={[0, th, 0]} position={[0, POS_TOP - 0.05, 0]}>
        <mesh>
          <cylinderGeometry args={[1.35, 1.35, 0.1, 48]} />
          <meshStandardMaterial color="#F1EDE6" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.26, 1.33, 64]} />
          <meshBasicMaterial color={LEMON} />
        </mesh>
        {/* перегородка-шторка между сторонами */}
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[0.05, 1.6, 2.6]} />
          <meshStandardMaterial color="#C8551E" transparent opacity={0.62} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.66, 0]}>
          <boxGeometry args={[0.08, 0.06, 2.64]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        {frames.map((fr) => (
          <group key={fr.side} rotation={[0, fr.side * Math.PI, 0]}>
            {/* кондуктор: синие прижимы */}
            {[-0.5, 0.5].map((z) => (
              <mesh key={z} position={[-0.62, 0.1, z]}>
                <boxGeometry args={[0.8, 0.1, 0.12]} />
                <meshStandardMaterial color="#2B6CB0" roughness={0.5} />
              </mesh>
            ))}
            {fr.show ? <Frame p={[-0.62, 0.12, 0]} bead={fr.bead} cool={1} /> : null}
          </group>
        ))}
      </group>
    </group>
  );
};
const OP_AT: [number, number] = [4.5, -0.35];
const twoWorker = (t: number, t0: number) => {
  const tt = Math.max(0, t - t0);
  const n = Math.floor(tt / CYC);
  const u = tt - n * CYC;
  const crouch = u > 0.9 && u < 1.9 ? Math.sin(((u - 0.9) / 1.0) * Math.PI) * 0.45 : 0;
  return {x: OP_AT[0], z: OP_AT[1], crouch, box: u > 1.2 && u < 1.6, yaw: Math.PI};
};

export const WELD_CAM: Record<WeldId, Cam> = {
  weldCover: {pos: [4.6, 3.4, 6.0], target: [0.9, 1.2, -0.6], fov: 38},
  weldGap: {pos: [3.5, 4.1, 4.3], target: [1.2, 0.95, 0], fov: 42},
  weldWait: {pos: [5.4, 4.0, 6.4], target: [2.0, 0.9, 0.1], fov: 40},
  weldScan: {pos: [0.4, 3.4, 6.6], target: [0.2, 0.4, 0.5], fov: 46},
  weldTwo: {pos: [2.6, 4.9, 7.6], target: [2.3, 0.9, -0.2], fov: 42},
};
export const weldState = (w: WeldId, t: number) => {
  if (w === "weldGap") return {alarm: t > 3.4};
  return {alarm: false};
};
// сколько ячейка «горит» к моменту t — для 2D-шкалы (0…1)
export const WeldWorld: React.FC<{w: WeldId; t: number}> = ({w, t}) => {
  if (w === "weldCover") {
    // чехол: ткань на колонне робота и на поднятой «руке» (капсула), складки по кругу
    const drape = new THREE.LatheGeometry(
      [
        [0.02, 2.55],
        [0.55, 2.5],
        [0.95, 2.25],
        [1.0, 1.6],
        [1.1, 0.8],
        [1.3, 0.04],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      40,
    );
    const pos = drape.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = pos.getY(i);
      const a = Math.atan2(z, x);
      const k = 1 + 0.08 * Math.sin(a * 7) * Math.min(1, (2.5 - y) / 1.6);
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
    }
    drape.computeVertexNormals();
    return (
      <>
        <Shop dim />
        <mesh geometry={drape} position={[0, 0, 0]}>
          <meshStandardMaterial color="#6A6D63" roughness={1} side={THREE.DoubleSide} />
        </mesh>
        {/* «рука» под тканью и свисающий край */}
        <mesh position={[0.75, 2.55, 0]} rotation={[0, 0, -1.25]}>
          <capsuleGeometry args={[0.36, 1.5, 8, 16]} />
          <meshStandardMaterial color="#6A6D63" roughness={1} />
        </mesh>

        <Shadow w={2.8} d={2.8} o={0.6} />
        <Table p={WAIT_TABLE} />
        <mesh position={[WAIT_TABLE[0], 0.79, 0]}>
          <boxGeometry args={[1.5, 0.01, 2.2]} />
          <meshStandardMaterial color="#A8A196" roughness={1} />
        </mesh>
        {/* луч из окна и пылинки в нём */}
        <mesh position={[0.8, 2.3, -2.0]} rotation={[0.55, 0, 0.35]}>
          <boxGeometry args={[1.2, 5.6, 0.9]} />
          <meshBasicMaterial color="#FFF2C8" transparent opacity={0.13} depthWrite={false} />
        </mesh>
        {Array.from({length: 40}, (_, i) => (
          <mesh key={i} position={[0.2 + rnd(i, 1) * 1.8 + Math.sin(t * 0.4 + i) * 0.1, 0.5 + ((rnd(i, 2) * 3.5 + t * 0.06) % 3.5), -2.6 + rnd(i, 3) * 2.4]}>
            <sphereGeometry args={[0.012, 6, 4]} />
            <meshBasicMaterial color="#FFF8DC" transparent opacity={0.7} />
          </mesh>
        ))}
      </>
    );
  }
  if (w === "weldGap") {
    const plan = gapPlan();
    const on = t > GAP_T[0] && t < GAP_T[1] ? 1 : 0;
    return (
      <>
        <Shop />
        <ArmModel skin="industrial" t={t} plan={plan} />
        <Torch plan={plan} t={t} />
        <Table p={[GAP_X, 0, 0]} w={1.5} d={2.3} />
        <GapPlates t={t} />
        <Arc p={arcPoint(plan, t)} t={t} on={on} />
      </>
    );
  }
  if (w === "weldWait") {
    const plan = waitPlan();
    const wk = waitWorker(t);
    const on = t < 2.2 || t > 9.0 ? 1 : 0;
    const frameShown = !(t > 3.95 && t < 7.25);
    const beadK = t < 2.2 ? t / 2.2 : t < 7.25 ? 1 : 0;
    return (
      <>
        <Shop />
        <ArmModel skin="industrial" t={t} plan={plan} />
        <Torch plan={plan} t={t} />
        <Table p={WAIT_TABLE} />
        {frameShown ? <Frame p={FRAME_ON} bead={beadK} /> : null}
        <Arc p={arcPoint(plan, t)} t={t} on={on} />
        <Worker3D x={wk.x} z={wk.z} yaw={wk.yaw} crouch={wk.crouch} box={wk.box} walk={wk.walk} jacket="#3A3D42" stripe={false} hat="welder" boxColor={STEEL} />
      </>
    );
  }
  if (w === "weldScan") {
    const path = SCAN_PATH;
    const st = path(t);
    return (
      <>
        <Shop />
        <group position={[-1.2, 0, -1.6]} scale={0.8}>
          <ArmModel skin="industrial" t={t} plan={{keys: [{at: 0, j: HOME, grip: 0.3}]}} />
        </group>
        {STACKS.map((s, i) => {
          const passed = st.x > s.x + 0.2;
          return (
            <group key={i}>
              {[0, 1, 2, 3].map((k) => (
                <Bracket key={k} p={[s.x, k * 0.1 + (s.unique ? 0 : 0), 0.0]} unique={s.unique && k === 0} i={i + k} />
              )).slice(0, s.unique ? 1 : 4)}
              {passed ? (
                <mesh position={[s.x, s.unique ? 0.55 : 0.62, 0]}>
                  <sphereGeometry args={[0.13, 16, 12]} />
                  <meshBasicMaterial color={s.unique ? RED : LEMON} />
                </mesh>
              ) : null}
              <mesh position={[s.x, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.32, 0.37, 32]} />
                <meshBasicMaterial color={passed ? (s.unique ? RED : LEMON) : "#B7B0A4"} side={THREE.DoubleSide} />
              </mesh>
            </group>
          );
        })}
        <DogModel t={t} plan={{stays: [], path}} />
        <group position={[st.x, 0, st.z]}>
          <LidarSweep t={t} range={2.6} y={0.45} o={st.moving ? 1 : 0.5} />
        </group>
      </>
    );
  }
  // weldTwo: двухпозиционный позиционер, оператор у дальней стороны, готовые рамы стопкой
  const t0 = 0.2;
  const plan = twoPlan(t0, 4);
  const tt = Math.max(0, t - t0);
  const u = tt % CYC;
  const on = u > 0.3 && u < 2.35 ? 1 : 0;
  const wk = twoWorker(t, t0);
  const done = Math.min(6, Math.floor((tt + CYC - 1.6) / CYC) + 1);
  return (
    <>
      <Shop />
      <ArmModel skin="industrial" t={t} plan={plan} />
      <Torch plan={plan} t={t} />
      <Positioner t={t} t0={t0} />
      <Arc p={arcPoint(plan, t)} t={t} on={on} />
      <Worker3D x={wk.x} z={wk.z} yaw={wk.yaw} crouch={wk.crouch} box={wk.box} jacket="#3A3D42" stripe={false} hat="welder" boxColor={STEEL} />
      {/* стопка готовых рам на поддоне у оператора */}
      <mesh position={[4.9, 0.08, -2.0]}>
        <boxGeometry args={[1.3, 0.16, 1.3]} />
        <meshStandardMaterial color="#BE9A62" roughness={0.8} />
      </mesh>
      {Array.from({length: Math.max(0, done)}, (_, i) => (
        <Frame key={i} p={[4.9, 0.16 + i * 0.15, -2.0]} yaw={Math.PI / 2} bead={1} />
      ))}
    </>
  );
};
