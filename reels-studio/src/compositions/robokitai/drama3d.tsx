// «Робокитай» v2 — 3D-миры драмы (05.11.2026). Время `t` передаётся явно (сцену можно «заморозить» для паузы-угадайки).
// - GateWorld — въезд в зону отгрузки: ворота с порогом и щелью, за спиной Рыжика коробки до потолка; Рыжик подъезжает и
//   застревает (рывок, красная вспышка порога, сигнал), Скаут приходит, «ложится» (корпус ниже, нос к полу) и сканирует пол;
// - Try1World — попытка 1: Шустрик по линии QR-плиток; ночью рабочие (силуэты) перекатывают стеллаж поперёк линии; утром
//   Шустрик упирается в стеллаж;
// - Try2World — попытка 2: Рыжик по новому маршруту в объезд стеллажа, на пути рабочий приседает за упавшей коробкой —
//   защитное поле робота желтеет и краснеет, робот замедляется и встаёт до контакта; рабочий уходит, Рыжик едет дальше;
// - PayoffWorld — у клиента: N тележек по кругу вокруг стеллажей, ворота без порога;
// - Worker3D — рабочий-манекен (каска, жилет со светоотражающей полосой), приседает (`crouch` 0…1), держит коробку.
import React from "react";
import * as THREE from "three";
import {Capsule, CargoBox, Shadow, pathAt, type Cam, type PathState, type V3} from "../../components/aura3d/kit";
import {AgvModel, type AgvPlan} from "../../components/aura3d/AuraAgv";
import {DogModel, type DogPlan} from "../../components/aura3d/AuraDog";
import {AgvLite, Gate, Glint, LEMON3, LiteRack, MockFloor, PathDashes, QrTile, curvePath, loopPath, useBoxes, type BoxSpec} from "./scene3d";
import {FloorScan, TargetRing} from "./beats3d";
import {RK} from "./kit";

const smooth = (p: number) => p * p * (3 - 2 * p);
const clamp01 = (p: number) => Math.min(1, Math.max(0, p));
const ramp = (t: number, a: number, b: number) => smooth(clamp01((t - a) / Math.max(1e-6, b - a)));

// ===== рабочий =====
const SKIN = "#F1E2CF";
const L1 = 0.9;
const L2 = 0.9;
const Seg: React.FC<{a: [number, number]; b: [number, number]; z: number; r: number; color: string}> = ({a, b, z, r, color}) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  return (
    <group position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z]} rotation={[0, 0, Math.atan2(dy, dx) - Math.PI / 2]}>
      <Capsule r={r} l={Math.max(0.01, len - r)}>
        <meshStandardMaterial color={color} roughness={0.7} />
      </Capsule>
    </group>
  );
};
// x, z — где стоит, yaw — куда смотрит (0 — по +x), crouch 0…1, box — держит коробку у груди
export const Worker3D: React.FC<{x: number; z: number; yaw: number; crouch: number; box?: boolean; walk?: number}> = ({x, z, yaw, crouch, box, walk = 0}) => {
  const hy = 1.78 - crouch * 0.95;
  const hx = -crouch * 0.32;
  const lean = crouch * 0.75;
  const swing = Math.sin(walk * 7) * 0.28 * (1 - crouch);
  const leg = (side: number) => {
    const fx = side * swing;
    const hip: [number, number] = [hx, hy];
    const foot: [number, number] = [fx, 0.1];
    const d = Math.min(L1 + L2 - 1e-3, Math.hypot(foot[0] - hip[0], foot[1] - hip[1]));
    const base = Math.atan2(foot[1] - hip[1], foot[0] - hip[0]);
    const a = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
    const knee: [number, number] = [hip[0] + Math.cos(base + a) * L1, hip[1] + Math.sin(base + a) * L1];
    return {hip, knee, foot};
  };
  const top: [number, number] = [hx + Math.sin(lean) * 1.25, hy + Math.cos(lean) * 1.25];
  const head: [number, number] = [top[0] + Math.sin(lean) * 0.42, top[1] + Math.cos(lean) * 0.42];
  const reach = box ? 0.2 : crouch;
  const hand: [number, number] = box ? [top[0] + 0.55, top[1] - 0.45] : [top[0] + 0.25 + reach * 0.65, top[1] - 1.0 + reach * 0.15 - crouch * 0.1];
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <Shadow w={1.4} d={1.0} o={0.7} />
      {[-1, 1].map((s) => {
        const L = leg(s);
        return (
          <group key={s}>
            <Seg a={L.hip} b={L.knee} z={s * 0.2} r={0.13} color="#3A3D42" />
            <Seg a={L.knee} b={L.foot} z={s * 0.2} r={0.12} color="#3A3D42" />
            <mesh position={[L.foot[0] + 0.1, 0.07, s * 0.2]}>
              <boxGeometry args={[0.36, 0.14, 0.2]} />
              <meshStandardMaterial color="#17191C" roughness={0.8} />
            </mesh>
          </group>
        );
      })}
      {/* корпус: синяя куртка, жилет с лимонной полосой */}
      <group position={[hx, hy, 0]} rotation={[0, 0, -lean]}>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[0.46, 1.2, 0.62]} />
          <meshStandardMaterial color="#2B6CB0" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.48, 0.12, 0.64]} />
          <meshStandardMaterial color={LEMON3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[0.48, 0.08, 0.64]} />
          <meshStandardMaterial color="#C9CFD4" roughness={0.4} metalness={0.4} />
        </mesh>
      </group>
      {/* голова и каска */}
      <mesh position={[head[0], head[1], 0]}>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      <mesh position={[head[0], head[1] + 0.08, 0]}>
        <sphereGeometry args={[0.27, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={LEMON3} roughness={0.4} />
      </mesh>
      <mesh position={[head[0] + 0.12, head[1] + 0.08, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.03, 18]} />
        <meshStandardMaterial color={LEMON3} roughness={0.4} />
      </mesh>
      {/* руки */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Seg a={top} b={hand} z={s * 0.36} r={0.1} color="#2B6CB0" />
          <mesh position={[hand[0], hand[1], s * 0.36]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
        </group>
      ))}
      {box ? <CargoBox s={[0.5, 0.4, 0.45]} p={[hand[0] + 0.05, hand[1] + 0.05, 0]} /> : null}
    </group>
  );
};

// ===== въезд в зону отгрузки =====
export const THR2 = {w: 0.3, h: 0.12};
export const GAP2 = {dx: 0.62, w: 0.08};
const PILE: BoxSpec[] = (() => {
  const out: BoxSpec[] = [];
  let seed = 7;
  const r = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let cx = 0; cx < 5; cx++)
    for (let cz = 0; cz < 5; cz++) {
      const h = 3 + Math.floor(r() * 4);
      for (let k = 0; k < h; k++) {
        const s: V3 = [0.62 + r() * 0.12, 0.5, 0.58 + r() * 0.1];
        out.push({s, p: [-3.4 - cx * 0.78, 0.25 + k * 0.52, -2.0 + cz * 0.86], ry: (r() - 0.5) * 0.12});
      }
    }
  return out;
})();
const BoxPile3D: React.FC = () => {
  const g = useBoxes(PILE, "pile");
  const tape = useBoxes(
    PILE.map((b) => ({s: [b.s[0] * 1.004, 0.012, b.s[2] * 0.2] as V3, p: [b.p[0], b.p[1] + b.s[1] / 2, b.p[2]] as V3, ry: b.ry})),
    "pileTape",
  );
  return (
    <group>
      {g ? (
        <mesh geometry={g}>
          <meshStandardMaterial color="#BE9A62" roughness={0.85} />
        </mesh>
      ) : null}
      {tape ? (
        <mesh geometry={tape}>
          <meshStandardMaterial color={RK.ink} roughness={0.6} />
        </mesh>
      ) : null}
    </group>
  );
};
export const GINGER_GATE = (stuck: number): AgvPlan => ({speed: 3.2, stays: [{at: 0, x: -5.6, z: 0.35, yaw: 0}, {at: stuck, x: -1.17, z: 0.35, yaw: 0}]});
export type ScoutGate = {plan: DogPlan; crouchAt: number; scan?: [number, number]};
export const GateWorld: React.FC<{t: number; stuck: number; glowT?: number; glowG?: number; scout?: ScoutGate; alarm?: boolean}> = ({t, stuck, glowT = 0, glowG = 0, scout, alarm = true}) => {
  const jolt = (at: number, amp: number) => (t > at ? amp * Math.exp(-(t - at) * 5) * Math.abs(Math.sin((t - at) * 16)) : 0);
  const pitch = jolt(stuck, 0.07) + jolt(stuck + 1.0, 0.035);
  const pivotX = -1.17 - 0.85;
  const al = alarm && t > stuck ? 0.5 + 0.5 * Math.sin((t - stuck) * 9) : 0;
  const hit = t > stuck ? Math.max(0, 1 - (t - stuck) / 1.6) * (0.6 + 0.4 * Math.sin((t - stuck) * 14)) : 0;
  const cr = scout ? ramp(t, scout.crouchAt, scout.crouchAt + 0.6) : 0;
  const scan = scout?.scan ? ramp(t, scout.scan[0], scout.scan[0] + 0.3) * (1 - ramp(t, scout.scan[1] - 0.3, scout.scan[1])) : 0;
  return (
    <>
      <MockFloor w={16} d={11} p={[0.5, 0, -0.5]} />
      <Gate px={0} open={4.1} h={4.4} wall={3.4} threshold={THR2} gap={GAP2} glowT={glowT} glowG={glowG} hit={hit} walls="far" />
      <BoxPile3D />
      <group position={[pivotX, 0, 0]} rotation={[0, 0, pitch]}>
        <group position={[-pivotX, 0, 0]}>
          <AgvModel t={t} skin="orange" plan={GINGER_GATE(stuck)} />
          <Glint p={[-1.17 - 0.6, 0.72, 0.35]} k={al} />
        </group>
      </group>
      {scout ? (
        // «ложится»: корпус ниже (лапы уходят под пол макета), нос к полу
        <group position={[0, -0.13 * cr, 0]}>
          <DogModel t={t} plan={scout.plan}>
            <group rotation={[0, 0, -0.16 * cr]}>
              <FloorScan t={t} o={scan} />
            </group>
          </DogModel>
        </group>
      ) : null}
    </>
  );
};

// ===== попытка 1: Шустрик по QR-плиткам, ночью стеллаж поперёк линии =====
export const TRY1 = {start: [-6.6, 2.4] as [number, number], end: [2.0, 2.4] as [number, number], night: [3.8, 5.9] as [number, number], teleport: 4.8, morning: 6.2, stop: 7.4};
export const QR1: [number, number][] = Array.from({length: 9}, (_, k) => [TRY1.start[0] + (k * (TRY1.end[0] - TRY1.start[0])) / 8, TRY1.start[1]]);
export const ZIPPY_A: AgvPlan = {speed: 2.8, stays: [{at: 0, x: TRY1.start[0], z: TRY1.start[1], yaw: 0}, {at: 3.4, x: TRY1.end[0], z: TRY1.end[1], yaw: 0}]};
export const ZIPPY_B: AgvPlan = {speed: 2.8, stays: [{at: 0, x: TRY1.start[0], z: TRY1.start[1], yaw: 0}, {at: TRY1.stop, x: -4.55, z: TRY1.start[1], yaw: 0}]};
// передвижной стеллаж: днём у правого края, ночью — поперёк линии QR и прохода
export const MOBILE_RACK = {from: [5.6, 0.9] as [number, number], to: [-3.0, 0.9] as [number, number], move: [4.1, 5.5] as [number, number]};
export const mobileRackAt = (t: number): [number, number] => {
  const k = ramp(t, MOBILE_RACK.move[0], MOBILE_RACK.move[1]);
  return [MOBILE_RACK.from[0] + (MOBILE_RACK.to[0] - MOBILE_RACK.from[0]) * k, MOBILE_RACK.from[1] + (MOBILE_RACK.to[1] - MOBILE_RACK.from[1]) * k];
};
export const GINGER_PARK: [number, number] = [-6.2, -0.6];
export const qrPass1 = QR1.map(([x]) => {
  for (let t = 0; t < 3.6; t += 1 / 30) {
    const s = pathAt(ZIPPY_A.stays, t, 2.8, 0.7, true);
    if (Math.abs(s.x - x) < 0.25) return t;
  }
  return 99;
});
const Warehouse: React.FC = () => (
  <>
    <MockFloor w={17} d={13} p={[0, 0, -0.4]} />
    <LiteRack p={[-1.0, 0, -5.4]} bays={7} levels={2} levelH={1.1} seed={12} />
  </>
);
export const Try1World: React.FC<{t: number}> = ({t}) => {
  const morning = t >= TRY1.teleport;
  const tz = morning ? Math.max(0, t - TRY1.morning) : t;
  const [rx, rz] = mobileRackAt(t);
  return (
    <>
      <Warehouse />
      {QR1.map((q, i) => (
        <QrTile key={i} p={q} seed={i + 3} glow={!morning && t >= qrPass1[i] ? 0.45 + 0.55 * Math.max(0, 1 - (t - qrPass1[i]) / 0.7) : 0} />
      ))}
      <TargetRing p={TRY1.end} pulse={!morning && t >= 3.4 ? Math.max(0, 1 - (t - 3.4) / 0.9) : 0} />
      <LiteRack p={[rx, 0, rz]} yaw={Math.PI / 2} bays={3} levels={2} levelH={1.1} seed={31} />
      <AgvModel t={tz} plan={morning ? ZIPPY_B : ZIPPY_A} />
      <AgvModel t={t} skin="orange" plan={{stays: [{at: 0, x: GINGER_PARK[0], z: GINGER_PARK[1], yaw: 0}]}} />
    </>
  );
};

// ===== попытка 2: Рыжик в объезд, рабочий на пути =====
export const TRY2 = {start: 1.6, stopAt: 6.2, resume: 9.6, end: 11.4, worker: {from: [3.9, 3.4] as [number, number], at: [2.75, -0.45] as [number, number], walkIn: [3.0, 4.0] as [number, number], crouch: [4.0, 4.6] as [number, number], stand: [8.2, 8.9] as [number, number], leave: [9.0, 10.6] as [number, number], to: [4.4, 3.8] as [number, number]}};
export const OLD_ROUTE: [number, number][] = [GINGER_PARK, [6.3, -0.5]];
export const ROUTE_A = curvePath([GINGER_PARK, [-5.0, -1.0], [-3.0, -2.35], [-1.3, -1.6], [-0.3, -0.6], [0.4, -0.5]], TRY2.start, TRY2.stopAt);
export const ROUTE_B = curvePath([[0.4, -0.5], [2.4, -0.5], [4.4, -0.5], [6.3, -0.5]], TRY2.resume, TRY2.end);
export const ROUTE_FULL: [number, number][] = [...ROUTE_A.pts, ...ROUTE_B.pts];
export const gingerTry2 = (t: number): PathState => (t < TRY2.resume ? ROUTE_A.at(t) : ROUTE_B.at(t));
export const workerAt = (t: number) => {
  const W = TRY2.worker;
  const kin = ramp(t, W.walkIn[0], W.walkIn[1]);
  const kout = ramp(t, W.leave[0], W.leave[1]);
  let x = W.from[0] + (W.at[0] - W.from[0]) * kin;
  let z = W.from[1] + (W.at[1] - W.from[1]) * kin;
  if (t > W.leave[0]) {
    x = W.at[0] + (W.to[0] - W.at[0]) * kout;
    z = W.at[1] + (W.to[1] - W.at[1]) * kout;
  }
  const crouch = ramp(t, W.crouch[0], W.crouch[1]) * (1 - ramp(t, W.stand[0], W.stand[1]));
  const walking = (t > W.walkIn[0] && t < W.walkIn[1]) || (t > W.leave[0] && t < W.leave[1]);
  const yaw = t > W.leave[0] ? Math.atan2(-(W.to[1] - W.at[1]), W.to[0] - W.at[0]) : t < W.walkIn[1] - 0.15 ? Math.atan2(-(W.at[1] - W.from[1]), W.at[0] - W.from[0]) : Math.PI;
  return {x, z, crouch, walking, yaw, hasBox: t > W.stand[0] + 0.2, visible: t > W.walkIn[0] - 0.05};
};
// поле защиты: 0 — спокойно (лимон), 1 — человек в поле (красный)
export const fieldAlarm = (t: number) => {
  const w = workerAt(t);
  if (!w.visible || t > TRY2.worker.leave[0] + 0.4) return 0;
  const g = gingerTry2(t);
  const d = w.x - (g.x + 1.0);
  return Math.abs(w.z - g.z) < 1.4 && d < 2.6 && d > -0.5 ? clamp01((2.6 - d) / 0.8) : 0;
};
const SafetyField: React.FC<{st: PathState; alarm: number}> = ({st, alarm}) => {
  const col = new THREE.Color(LEMON3).lerp(new THREE.Color(RK.red), alarm);
  return (
    <group position={[st.x, 0.012, st.z]} rotation={[0, st.yaw, 0]}>
      <mesh position={[2.2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 1.7]} />
        <meshBasicMaterial color={col} transparent opacity={0.32 + 0.25 * alarm} depthWrite={false} />
      </mesh>
      {[-0.85, 0.85].map((z) => (
        <mesh key={z} position={[2.2, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 0.05]} />
          <meshBasicMaterial color={alarm > 0.5 ? RK.red : RK.ink} transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[3.4, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.05, 1.75]} />
        <meshBasicMaterial color={alarm > 0.5 ? RK.red : RK.ink} transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  );
};
export const Try2World: React.FC<{t: number; draw: number; replan: number}> = ({t, draw, replan}) => {
  const g = gingerTry2(t);
  const w = workerAt(t);
  const [rx, rz] = MOBILE_RACK.to;
  const fieldOn = clamp01((t - TRY2.start + 0.3) / 0.4);
  return (
    <>
      <Warehouse />
      {QR1.map((q, i) => (
        <QrTile key={i} p={q} seed={i + 3} o={0.45} />
      ))}
      <LiteRack p={[rx, 0, rz]} yaw={Math.PI / 2} bays={3} levels={2} levelH={1.1} seed={31} />
      <AgvModel t={0} plan={{stays: [{at: 0, x: -4.55, z: TRY1.start[1], yaw: 0}]}} />
      <PathDashes id="old2" pts={OLD_ROUTE} draw={draw} o={(1 - replan) * 0.9} color={RK.red} />
      <PathDashes id="new2" pts={ROUTE_FULL} draw={replan} color={RK.blue} />
      {fieldOn > 0 ? <SafetyField st={g} alarm={fieldAlarm(t)} /> : null}
      <AgvModel t={t} skin="orange" plan={{stays: [{at: 0, x: GINGER_PARK[0], z: GINGER_PARK[1], yaw: 0}], path: gingerTry2}} />
      {t < TRY2.worker.stand[0] + 0.2 ? <CargoBox s={[0.5, 0.4, 0.45]} p={[2.0, 0.2, -0.45]} rot={[0, 0.3, 0]} /> : null}
      {w.visible ? <Worker3D x={w.x} z={w.z} yaw={w.yaw} crouch={w.crouch} box={w.hasBox} walk={w.walking ? t : 0} /> : null}
    </>
  );
};

// ===== у клиента: N тележек по кругу =====
const LOOP2 = loopPath([[-7.2, -2.0], [-7.2, 2.0], [-5.6, 4.5], [5.6, 4.5], [7.2, 2.0], [7.2, -2.0], [5.6, -4.5], [-5.6, -4.5]]);
export const payoffRobots = (t: number, n: number) => Array.from({length: n}, (_, i) => LOOP2.at(t, i / n, 2.2));
export const PayoffWorld: React.FC<{t: number; n: number}> = ({t, n}) => (
  <>
    <MockFloor w={20} d={14} p={[0, 0, 0]} />
    <LiteRack p={[0, 0, -1.25]} bays={6} levels={2} levelH={1.1} seed={21} />
    <LiteRack p={[0, 0, 1.25]} bays={6} levels={2} levelH={1.1} seed={22} />
    <PathDashes id="loop2" pts={[...LOOP2.pts, LOOP2.pts[0]]} draw={1} color={RK.blue} o={0.55} />
    <group position={[2.6, 0, 4.5]}>
      <Gate px={0} open={2.9} h={3.0} wall={0.6} threshold={null} gap={null} />
    </group>
    <mesh position={[2.6, 0.01, 4.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.7, 2.8]} />
      <meshBasicMaterial color={RK.blue} transparent opacity={0.55} />
    </mesh>
    {payoffRobots(t, n).map((s, i) => (
      <AgvLite key={i} st={s} t={t} skin={i % 2 ? "orange" : "aura"} box={i % 3 !== 1} />
    ))}
  </>
);

export const CAMS = {
  gateFront: {pos: [3.0, 1.15, 2.2], target: [-0.9, 0.3, 0.3], fov: 36} as Cam,
  gateFar: {pos: [3.8, 1.55, 2.7], target: [-1.8, 0.35, 0.3], fov: 36} as Cam,
  gateHigh: {pos: [4.8, 3.9, 3.5], target: [-0.3, 0.1, -0.2], fov: 38} as Cam,
  gateLow: {pos: [2.9, 0.42, 1.7], target: [-0.2, 0.08, -0.2], fov: 44} as Cam,
  trial: {pos: [-0.6, 13.4, 9.6], target: [-0.4, 0, -1.7], fov: 42} as Cam,
  client: {pos: [-2.6, 15.5, 14.0], target: [0, 0, 0.8], fov: 42} as Cam,
};
