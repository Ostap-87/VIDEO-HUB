// «Робокитай», серия 6 · Пекин (06.11.2026) — учебная лаборатория кафедры: синие маты, страховочная рама с подвесом,
// маркерная доска с формулами, стол с ноутбуком и зарядкой батарей, маленькие футбольные ворота. Герои края — Леон
// (`HumanoidModel`, гуманоид 1,3 м) и Нова (`HumanoidModel skin="navy"`, гуманоид 1,2 м); студент — `Worker3D` в толстовке.
// Падение гуманоида — поворот всей модели вокруг ступней (на мат, без поломок: падать — условие задачи).
// Миры (`LabWorld`):
// - labFall — Леон делает три шага и ложится на мат;
// - labLift — студент один пытается поднять Леона с пола;
// - labCup — Нова тянется к чашке на столе и не может взять (базовая версия без кистей);
// - labBattery — вечер: у студента идея, а у Леона садится батарея;
// - labNova — Нова замечает страховочную раму в углу (рама подсвечивается лимонным), Скаут рядом;
// - labFrame — Леон ходит на подвесе под рамой, спотыкается — трос держит; вторая батарея на зарядке;
// - labWalk — Леон ходит по кругу, Скаут рядом, студенты радуются.
import React from "react";
import {HumanoidModel, type HumanoidPlan} from "../../components/aura3d/AuraHumanoid";
import {DogModel} from "../../components/aura3d/AuraDog";
import {Shadow, pathAt, type Cam, type V3} from "../../components/aura3d/kit";
import {Worker3D} from "./drama3d";
import {MockFloor} from "./scene3d";

export type LabId = "labFall" | "labLift" | "labCup" | "labBattery" | "labNova" | "labFrame" | "labWalk";
const LEMON = "#FFF65D";
const RED = "#E5383B";
const INK = "#262626";
const BLUE = "#2B6CB0";
const HOODIE = "#6C5B7B";
const sm = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};
const WALL_Z = -3.2;
const MAT = {x: 0, z: 0.4, w: 5.2, d: 3.6, h: 0.18};
const FACE_CAM = -Math.PI / 2;

// ===== комната =====
const Room: React.FC<{night?: boolean; frameGlow?: number; frameAt?: "mat" | "corner"}> = ({night, frameGlow = 0, frameAt = "corner"}) => (
  <>
    <MockFloor w={18} d={11} p={[0, 0, -0.4]} tone={night ? "#A7A39B" : "#D6D3CC"} />
    <mesh position={[0, 2.8, WALL_Z]}>
      <boxGeometry args={[18, 5.6, 0.2]} />
      <meshStandardMaterial color={night ? "#8F8B85" : "#E9E6E0"} roughness={0.95} />
    </mesh>
    {/* маркерная доска: формулы и схема шагающего робота */}
    <group position={[-0.6, 3.3, WALL_Z + 0.12]}>
      <mesh>
        <boxGeometry args={[5.0, 2.3, 0.06]} />
        <meshStandardMaterial color={night ? "#C9C7C2" : "#FFFFFF"} roughness={0.3} />
      </mesh>
      {[
        [-1.7, 0.6, 1.2],
        [-1.5, 0.25, 0.8],
        [-1.75, -0.1, 1.1],
        [0.2, 0.7, 1.4],
        [0.5, 0.35, 0.9],
        [0.3, -0.45, 1.5],
      ].map(([x, y, w], i) => (
        <mesh key={i} position={[x, y, 0.04]}>
          <boxGeometry args={[w, 0.05, 0.01]} />
          <meshBasicMaterial color={i % 3 === 1 ? BLUE : INK} />
        </mesh>
      ))}
      {/* схема: человечек-робот и дуга шага */}
      <mesh position={[1.7, 0.45, 0.04]}>
        <circleGeometry args={[0.13, 20]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[1.7, 0.05, 0.04]}>
        <boxGeometry args={[0.07, 0.6, 0.01]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[1.55, -0.45, 0.04]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.06, 0.5, 0.01]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[1.85, -0.45, 0.04]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.06, 0.5, 0.01]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[0, -1.18, 0.06]}>
        <boxGeometry args={[5.0, 0.08, 0.14]} />
        <meshStandardMaterial color="#9AA0A6" />
      </mesh>
    </group>
    {/* мат */}
    <mesh position={[MAT.x, MAT.h / 2, MAT.z]}>
      <boxGeometry args={[MAT.w, MAT.h, MAT.d]} />
      <meshStandardMaterial color={BLUE} roughness={0.85} />
    </mesh>
    {[-1, 0, 1].map((k) => (
      <mesh key={k} position={[MAT.x + k * (MAT.w / 3) + (k === 0 ? 0 : 0), MAT.h + 0.003, MAT.z]}>
        <boxGeometry args={[0.03, 0.005, MAT.d]} />
        <meshBasicMaterial color="#1F4F84" />
      </mesh>
    ))}
    {/* стол: ноутбук и зарядка с батареями */}
    <group position={[-5.0, 0, -1.6]}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2.6, 0.1, 1.3]} />
        <meshStandardMaterial color="#F1EDE6" roughness={0.5} />
      </mesh>
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} position={[x, 0.73, 0]}>
          <boxGeometry args={[0.08, 1.46, 1.1]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ))}
      <mesh position={[-0.3, 1.58, 0.15]}>
        <boxGeometry args={[0.9, 0.04, 0.6]} />
        <meshStandardMaterial color="#3A3D42" />
      </mesh>
      <mesh position={[-0.3, 1.88, -0.13]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[0.9, 0.6, 0.03]} />
        <meshStandardMaterial color="#3A3D42" emissive="#9CC8F0" emissiveIntensity={night ? 1.0 : 0.5} />
      </mesh>
    </group>
    {/* футбольные ворота и мяч: учебный план — ходьба, зрение, тактика */}
    <group position={[5.6, 0, -1.6]}>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 0.75, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1.5, 10]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}
      <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 2.3, 10]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 0.75, -0.5]}>
        <boxGeometry args={[2.2, 1.5, 0.02]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={0.35} />
      </mesh>
      <mesh position={[-0.4, 0.22, 1.2]}>
        <sphereGeometry args={[0.22, 20, 14]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
      </mesh>
    </group>
    {frameAt === "corner" ? <SafetyFrame p={[4.6, 0, 1.6]} w={2.2} d={1.8} glow={frameGlow} /> : null}
  </>
);
// страховочная рама: четыре стойки, верхние балки, каретка; glow — лимонная подсветка («вот оно»)
const SafetyFrame: React.FC<{p: V3; w: number; d: number; h?: number; glow?: number; trolleyX?: number; rope?: V3 | null}> = ({p, w, d, h = 5.2, glow = 0, trolleyX = 0, rope}) => {
  const col = glow > 0.05 ? LEMON : INK;
  const mat = <meshStandardMaterial color={col} emissive={glow > 0.05 ? LEMON : "#000000"} emissiveIntensity={glow * 0.8} roughness={0.5} />;
  return (
    <group position={p}>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * w) / 2, h / 2, (sz * d) / 2]}>
            <boxGeometry args={[0.12, h, 0.12]} />
            {mat}
          </mesh>
        )),
      )}
      {[-1, 1].map((sz) => (
        <mesh key={`b${sz}`} position={[0, h, (sz * d) / 2]}>
          <boxGeometry args={[w + 0.12, 0.14, 0.14]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[trolleyX, h - 0.05, 0]}>
        <boxGeometry args={[0.4, 0.24, d]} />
        {mat}
      </mesh>
      {rope ? (
        <mesh position={[(trolleyX + rope[0]) / 2, (h + rope[1]) / 2, rope[2] / 2]}>
          <cylinderGeometry args={[0.025, 0.025, h - rope[1], 8]} />
          <meshStandardMaterial color="#D8B65A" />
        </mesh>
      ) : null}
      <Shadow w={w + 0.6} d={d + 0.6} o={0.25} />
    </group>
  );
};

// гуманоид, который может упасть: поворот вокруг ступней (fall 0…1 → лежит на мате), stumble — наклон вперёд, рад
const Faller: React.FC<{plan: HumanoidPlan; t: number; fall?: number; stumble?: number; skin?: "aura" | "navy"}> = ({plan, t, fall = 0, stumble = 0, skin}) => {
  const st = pathAt(plan.stays, t, plan.speed ?? 0.95, 0.6);
  const ang = fall * 1.47 + stumble;
  // ось падения — поперёк курса: вперёд по направлению взгляда
  const fx = Math.cos(st.yaw);
  const fz = -Math.sin(st.yaw);
  return (
    <group position={[st.x, MAT.h, st.z]}>
      <group rotation={[fz * ang, 0, -fx * ang]}>
        <group position={[-st.x, 0, -st.z]}>
          <HumanoidModel plan={plan} t={t} skin={skin} />
        </group>
      </group>
    </group>
  );
};
// плавающий значок батареи над роботом: уровень 0…1
const Battery: React.FC<{p: V3; level: number}> = ({p, level}) => {
  const col = level > 0.5 ? "#1F8A4C" : level > 0.2 ? "#E89A2C" : RED;
  return (
    <group position={p}>
      <mesh>
        <boxGeometry args={[0.9, 0.42, 0.06]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh position={[0.5, 0, 0]}>
        <boxGeometry args={[0.1, 0.2, 0.06]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh position={[-0.4 + (0.8 * Math.max(0.03, level)) / 2, 0, 0.04]}>
        <boxGeometry args={[0.8 * Math.max(0.03, level), 0.3, 0.02]} />
        <meshBasicMaterial color={col} />
      </mesh>
    </group>
  );
};

// ===== планы =====
const FALL_PLAN: HumanoidPlan = {stays: [{at: 0, x: 0.2, z: -1.0, yaw: FACE_CAM}, {at: 1.5, x: 0.2, z: 0.3, yaw: FACE_CAM}], speed: 0.95};
const fallK = (t: number) => {
  const u = Math.max(0, Math.min(1, (t - 1.5) / 0.6));
  return u * u;
};
const LYING: HumanoidPlan = {stays: [{at: 0, x: -0.4, z: -0.8, yaw: FACE_CAM}]};

export const LAB_CAM: Record<LabId, Cam> = {
  labFall: {pos: [2.8, 3.8, 7.4], target: [0.2, 1.4, 0.3], fov: 40},
  labLift: {pos: [3.2, 4.6, 7.6], target: [-0.2, 1.0, 0.4], fov: 42},
  labCup: {pos: [1.4, 3.8, 7.6], target: [0.4, 1.9, -0.4], fov: 40},
  labBattery: {pos: [0.4, 4.6, 9.0], target: [-1.8, 1.8, -0.8], fov: 46},
  labNova: {pos: [1.2, 5.0, 10.2], target: [1.6, 1.8, 0.0], fov: 46},
  labFrame: {pos: [2.0, 4.6, 9.6], target: [0.2, 2.2, 0.0], fov: 44},
  labWalk: {pos: [1.6, 5.6, 10.6], target: [0.2, 1.4, 0.2], fov: 46},
};
export const labState = (w: LabId, t: number) => {
  if (w === "labCup") return {alarm: false};
  return {alarm: false && t > 0};
};

export const LabWorld: React.FC<{w: LabId; t: number}> = ({w, t}) => {
  if (w === "labFall") {
    return (
      <>
        <Room />
        <Faller plan={FALL_PLAN} t={t} fall={fallK(t)} />
      </>
    );
  }
  if (w === "labLift") {
    // студент присел у головы и тянет — робот чуть приподнимается и снова ложится
    const tug = Math.max(0, Math.sin(Math.max(0, t - 0.8) * 2.4));
    return (
      <>
        <Room />
        <Faller plan={LYING} t={t} fall={1 - 0.07 * tug} />
        <Worker3D x={-1.75} z={1.6} yaw={0.15} crouch={0.5 + 0.12 * tug} jacket={HOODIE} stripe={false} hat="hair" arms={0.25 + 0.2 * tug} />
      </>
    );
  }
  if (w === "labCup") {
    const plan: HumanoidPlan = {stays: [{at: 0, x: -0.6, z: 0.1, yaw: 0}], gestures: [{at: 0.8, kind: "pull"}, {at: 2.4, kind: "pull"}, {at: 4.0, kind: "look"}]};
    const miss = t > 1.6;
    return (
      <>
        <Room />
        <group position={[0.5, MAT.h, 0.1]}>
          <mesh position={[0, 1.85, 0]}>
            <boxGeometry args={[1.0, 0.08, 1.2]} />
            <meshStandardMaterial color="#F1EDE6" />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <boxGeometry args={[0.12, 1.84, 0.12]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          {/* чашка */}
          <mesh position={[-0.05, 2.06, 0]}>
            <cylinderGeometry args={[0.13, 0.11, 0.34, 20]} />
            <meshStandardMaterial color="#F26B1D" roughness={0.4} />
          </mesh>
          <mesh position={[0.11, 2.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.08, 0.025, 8, 16]} />
            <meshStandardMaterial color="#F26B1D" roughness={0.4} />
          </mesh>
          {miss ? (
            <mesh position={[-0.05, 1.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.24, 0.31, 32]} />
              <meshBasicMaterial color={RED} />
            </mesh>
          ) : null}
        </group>
        <group position={[0, MAT.h, 0]}>
          <HumanoidModel plan={plan} t={t} skin="navy" />
        </group>
      </>
    );
  }
  if (w === "labBattery") {
    const level = Math.max(0, 0.35 - t * 0.09);
    const plan: HumanoidPlan = {stays: [{at: 0, x: 0.4, z: 0.2, yaw: FACE_CAM}], gestures: [{at: 3.6, kind: "bow"}]};
    const sag = sm((t - 3.6) / 0.8) * 0.18;
    return (
      <>
        <Room night />
        <pointLight position={[-5.0, 3.2, -0.6]} intensity={2.5} distance={7} color="#FFE2A8" />
        <Worker3D x={-5.0} z={-0.5} yaw={FACE_CAM + 0.2} crouch={0.38} jacket={HOODIE} stripe={false} hat="hair" arms={t > 1.2 && t < 2.6 ? 0.8 : 0.1} />
        <Faller plan={plan} t={t} stumble={sag} />
        <group position={[1.5, 3.3, 0.6]} scale={1.9}>
          <Battery p={[0, 0, 0]} level={level} />
        </group>
      </>
    );
  }
  if (w === "labNova") {
    const plan: HumanoidPlan = {stays: [{at: 0, x: 1.6, z: 0.9, yaw: -0.3}], gestures: [{at: 0.3, kind: "look"}, {at: 2.5, kind: "point"}]};
    return (
      <>
        <Room frameGlow={sm((t - 2.7) / 0.4) * (0.6 + 0.4 * Math.sin(t * 6))} />
        <Faller plan={LYING} t={t} fall={1} />
        <group position={[0, MAT.h, 0]}>
          <HumanoidModel plan={plan} t={t} skin="navy" />
        </group>
        <DogModel t={t} plan={{stays: [{at: -1, x: 2.9, z: 2.5, yaw: 0.6}], actions: [{at: 2.8, kind: "hop"}]}} />
      </>
    );
  }
  if (w === "labFrame") {
    const plan: HumanoidPlan = {stays: [{at: 0, x: -1.8, z: 0.4, yaw: 0}, {at: 6.8, x: 1.9, z: 0.4, yaw: 0}], speed: 0.6};
    const st = pathAt(plan.stays, t, 0.6, 0.6);
    const stumble = Math.sin(Math.PI * Math.max(0, Math.min(1, (t - 2.8) / 0.9))) * 0.28;
    return (
      <>
        <Room frameAt="mat" />
        <SafetyFrame p={[MAT.x, 0, MAT.z]} w={MAT.w - 0.3} d={MAT.d - 0.2} glow={0} trolleyX={st.x - MAT.x} rope={[st.x - MAT.x, 3.2, 0]} />
        <Faller plan={plan} t={t} stumble={stumble} />
        {/* вторая батарея заряжается на столе */}
        <group position={[-4.4, 1.62, -1.5]}>
          <mesh>
            <boxGeometry args={[0.5, 0.18, 0.34]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.36, 0.08, 0.24]} />
            <meshBasicMaterial color={Math.floor(t * 2) % 2 ? "#1F8A4C" : LEMON} />
          </mesh>
        </group>
      </>
    );
  }
  // labWalk: Леон по кругу вокруг мата, Скаут рядом, студенты радуются
  const loop: [number, number][] = [
    [-2.4, 2.4],
    [2.4, 2.4],
    [3.2, 0.4],
    [2.4, -1.6],
    [-2.4, -1.6],
    [-3.2, 0.4],
    [-2.4, 2.4],
  ];
  const stays = loop.map(([x, z], i) => ({at: i * 1.5, x, z}));
  const plan: HumanoidPlan = {stays, speed: 3.4};
  const st = pathAt(stays, t, 3.4, 0.6);
  const cheer = 0.6 + 0.4 * Math.sin(t * 5);
  return (
    <>
      <Room />
      <HumanoidModel plan={plan} t={t} />
      <DogModel t={t} plan={{stays: [], path: (tt) => {
        const s = pathAt(stays, tt - 0.35, 3.4, 0.6);
        return {...s, x: s.x - 0.9 * Math.sin(s.yaw), z: s.z - 0.9 * Math.cos(s.yaw)};
      }}} />
      <Worker3D x={-5.4} z={1.6} yaw={0.3} crouch={0} jacket={HOODIE} stripe={false} hat="hair" arms={cheer} />
      <Worker3D x={5.6} z={1.8} yaw={Math.PI - 0.3} crouch={0} jacket="#3B6EA5" stripe={false} hat="hair" arms={1 - cheer * 0.5} />
      {st.moving ? null : null}
    </>
  );
};
