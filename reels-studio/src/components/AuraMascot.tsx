// Маскот Aura Robotics в роликах — тот же 3D-робот, что на aura-robotics.ru (/js/aura-mascot.js):
// геометрия, пропорции, материалы и жесты перенесены один в один, палитра сайта (#F8F6F3 / #262626 / #FFF65D).
// На сайте робот реагирует на мышь; в ролике всё покадрово по плану `MascotPlan`:
// - stays: где робот стоит (точка стоп на экране, px) и к какому моменту туда прийти. Между точками он идёт
//   пешком (по горизонтали) или перепрыгивает (если меняется высота), поворачиваясь по ходу движения;
// - gestures: жесты в моменты событий ролика — wave (помахать), point / pointUp (показать), tick (поставить галочку),
//   push (вытолкнуть плашку), present (поднять руки, «выдвигая» плашки вверх), jump (подпрыгнуть от радости),
//   nod, scan (осмотреться), shrug.
// План для ролика строится автоматически из props (mascotPlan в TalkReelPro).
import React from "react";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";
import {RoomEnvironment} from "three/examples/jsm/environments/RoomEnvironment.js";
import {useCurrentFrame, useVideoConfig} from "remotion";

export type GestureKind = "wave" | "point" | "pointUp" | "tick" | "push" | "pull" | "present" | "jump" | "nod" | "scan" | "shrug";
export type MascotStay = {at: number; x: number; y: number; face?: number};
export type MascotPlan = {stays: MascotStay[]; gestures: {at: number; kind: GestureKind}[]};

export const GESTURE_DUR: Record<GestureKind, number> = {
  wave: 2.4, point: 1.8, pointUp: 2.2, tick: 0.9, push: 1.0, pull: 1.1, present: 1.4, jump: 1.75, nod: 1.2, scan: 2.6, shrug: 1.6,
};

const C = {light: "#F8F6F3", dark: "#262626", accent: "#FFF65D", glow: "#FFF65D"};
const W = 320; // размер холста маскота, px
const H = 400;
const FOOT = 318; // где на холсте стоят ступни (px от верха)

const env = (p: number) => Math.sin(Math.min(Math.max(p, 0), 1) * Math.PI);
const lerp = (a: number, b: number, w: number) => a + (b - a) * w;
const smooth = (p: number) => p * p * (3 - 2 * p);

type V3 = [number, number, number];

// --- материалы (как MeshPhysicalMaterial на сайте) ---
const Paint: React.FC<{c: string; cc?: number}> = ({c, cc = 1}) => (
  <meshPhysicalMaterial color={c} metalness={0.1} roughness={0.3} clearcoat={cc} clearcoatRoughness={0.06} />
);
const Joint = () => <meshStandardMaterial color="#2C333B" metalness={0.85} roughness={0.38} />;
const Rubber = () => <meshStandardMaterial color="#14171B" roughness={0.92} />;
const Metal = () => <meshStandardMaterial color="#9AA4AE" metalness={0.95} roughness={0.24} />;
const Seam = () => <meshStandardMaterial color="#0D1014" roughness={0.9} />;

const Box: React.FC<{s: V3; p?: V3; r?: V3; children: React.ReactNode}> = ({s, p = [0, 0, 0], r, children}) => (
  <mesh position={p} rotation={r}>
    <boxGeometry args={s} />
    {children}
  </mesh>
);
const Sph: React.FC<{r: number; p?: V3; children: React.ReactNode}> = ({r, p = [0, 0, 0], children}) => (
  <mesh position={p}>
    <sphereGeometry args={[r, 20, 14]} />
    {children}
  </mesh>
);
const Cyl: React.FC<{a: number; b: number; h: number; p?: V3; r?: V3; children: React.ReactNode}> = ({a, b, h, p = [0, 0, 0], r, children}) => (
  <mesh position={p} rotation={r}>
    <cylinderGeometry args={[a, b, h, 12]} />
    {children}
  </mesh>
);
// панель со швом, как plate() на сайте
const Plate: React.FC<{s: V3; p: V3; c: string; cc?: number}> = ({s, p, c, cc}) => (
  <>
    <Box s={[s[0] + 0.035, s[1] + 0.035, s[2] * 0.9]} p={[p[0], p[1], p[2] - 0.006]}>
      <Seam />
    </Box>
    <Box s={s} p={p}>
      <Paint c={c} cc={cc} />
    </Box>
  </>
);

type Pose = {
  rootY: number;
  yaw: number;
  hips: {y: number; x: number; ry: number};
  spine: {r: V3; sy: number};
  head: V3;
  arm: Record<"L" | "R", {sh: V3; el: V3; wr: V3}>;
  leg: Record<"L" | "R", {hip: number; kn: number; an: number}>;
  blink: boolean;
  eyeGlow: number;
};

const Arm: React.FC<{s: 1 | -1; pose: Pose["arm"]["L"]}> = ({s, pose}) => (
  <group position={[s * 0.54, 0.64, 0]} rotation={pose.sh}>
    <Sph r={0.145}>
      <Joint />
    </Sph>
    <Plate s={[0.24, 0.22, 0.26]} p={[s * 0.055, 0.02, 0]} c={C.light} />
    <Plate s={[0.18, 0.44, 0.2]} p={[0, -0.3, 0]} c={C.light} />
    <Box s={[0.09, 0.18, 0.09]} p={[s * 0.095, -0.24, 0]}>
      <Paint c={C.accent} cc={0.9} />
    </Box>
    <group position={[0, -0.55, 0]} rotation={pose.el}>
      <Sph r={0.1}>
        <Joint />
      </Sph>
      <Plate s={[0.155, 0.4, 0.16]} p={[0, -0.25, 0]} c={C.dark} cc={0.85} />
      <group position={[0, -0.49, 0]} rotation={pose.wr}>
        <Box s={[0.13, 0.17, 0.12]} p={[0, -0.1, 0]}>
          <Rubber />
        </Box>
        <Box s={[0.045, 0.12, 0.1]} p={[s * 0.075, -0.12, 0.02]}>
          <Rubber />
        </Box>
      </group>
    </group>
  </group>
);

const Leg: React.FC<{s: 1 | -1; pose: Pose["leg"]["L"]}> = ({s, pose}) => (
  <group position={[s * 0.19, 0, 0]} rotation={[pose.hip, 0, 0]}>
    <Sph r={0.15}>
      <Joint />
    </Sph>
    <Plate s={[0.25, 0.54, 0.27]} p={[0, -0.34, 0]} c={C.light} />
    <Box s={[0.09, 0.28, 0.04]} p={[s * 0.135, -0.34, 0.02]}>
      <Paint c={C.accent} cc={0.9} />
    </Box>
    <Cyl a={0.035} b={0.035} h={0.4} p={[0, -0.3, -0.155]}>
      <Metal />
    </Cyl>
    <group position={[0, -0.64, 0]} rotation={[pose.kn, 0, 0]}>
      <Sph r={0.12}>
        <Joint />
      </Sph>
      <Plate s={[0.15, 0.17, 0.09]} p={[0, 0, 0.135]} c={C.dark} cc={0.85} />
      <Plate s={[0.21, 0.54, 0.23]} p={[0, -0.34, 0]} c={C.dark} cc={0.85} />
      <group position={[0, -0.64, 0]} rotation={[pose.an, 0, 0]}>
        <Sph r={0.085}>
          <Joint />
        </Sph>
        <Plate s={[0.23, 0.11, 0.44]} p={[0, -0.09, 0.07]} c={C.light} />
        <Box s={[0.24, 0.05, 0.46]} p={[0, -0.15, 0.07]}>
          <Rubber />
        </Box>
      </group>
    </group>
  </group>
);

const Robot: React.FC<{pose: Pose}> = ({pose}) => (
  <group rotation={[0, pose.yaw, 0]} position={[0, pose.rootY, 0]}>
    <group position={[pose.hips.x, pose.hips.y, 0]} rotation={[0, pose.hips.ry, 0]}>
      <Plate s={[0.6, 0.28, 0.42]} p={[0, 0.05, 0]} c={C.dark} cc={0.85} />
      <Plate s={[0.5, 0.1, 0.44]} p={[0, 0.2, 0]} c={C.light} />
      <Sph r={0.045} p={[0, 0.05, 0.23]}>
        <meshStandardMaterial color={C.accent} emissive={C.accent} emissiveIntensity={2} />
      </Sph>
      <Cyl a={0.05} b={0.05} h={0.3} p={[0.34, 0.06, -0.1]} r={[0, 0, 0.25]}>
        <Metal />
      </Cyl>
      <Cyl a={0.05} b={0.05} h={0.3} p={[-0.34, 0.06, -0.1]} r={[0, 0, -0.25]}>
        <Metal />
      </Cyl>
      {/* корпус */}
      <group position={[0, 0.24, 0]} rotation={pose.spine.r} scale={[1, pose.spine.sy, 1]}>
        <Plate s={[0.72, 0.6, 0.42]} p={[0, 0.34, 0]} c={C.dark} cc={0.85} />
        <Plate s={[0.54, 0.44, 0.05]} p={[0, 0.4, 0.23]} c={C.light} />
        <Plate s={[0.3, 0.13, 0.04]} p={[0, 0.6, 0.26]} c={C.accent} cc={0.9} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Box key={i} s={[0.2, 0.022, 0.02]} p={[0, 0.24 + (i - 2) * 0.038, 0.262]}>
            <Seam />
          </Box>
        ))}
        <Plate s={[0.74, 0.2, 0.4]} p={[0, 0.7, 0]} c={C.light} />
        <Box s={[0.18, 0.07, 0.42]} p={[0, 0.79, 0]}>
          <Paint c={C.accent} cc={0.9} />
        </Box>
        <Sph r={0.05} p={[0, 0.5, 0.27]}>
          <meshStandardMaterial color={C.glow} emissive={C.glow} emissiveIntensity={pose.eyeGlow} />
        </Sph>
        {/* шея и голова */}
        <group position={[0, 0.88, 0]}>
          <Cyl a={0.1} b={0.115} h={0.16}>
            <Joint />
          </Cyl>
          <group position={[0, 0.1, 0]} rotation={pose.head}>
            <Sph r={0.265} p={[0, 0.14, 0]}>
              <Paint c={C.light} />
            </Sph>
            <Box s={[0.3, 0.05, 0.28]} p={[0, 0.14, 0.02]}>
              <Seam />
            </Box>
            <Plate s={[0.26, 0.09, 0.05]} p={[0, 0.33, 0.13]} c={C.accent} cc={0.9} />
            <Box s={[0.36, 0.21, 0.11]} p={[0, 0.1, 0.2]} r={[-0.13, 0, 0]}>
              <meshPhysicalMaterial color="#05070A" metalness={0.4} roughness={0.05} clearcoat={1} clearcoatRoughness={0.02} />
            </Box>
            {/* два глаза-диода (на сайте один; в ролике два — живее мимика) */}
            {[-0.085, 0.085].map((x) => (
              <mesh key={x} position={[x, 0.11, 0.265]} scale={[1, pose.blink ? 0.12 : 1, 1]}>
                <sphereGeometry args={[0.045, 16, 12]} />
                <meshStandardMaterial color={C.glow} emissive={C.glow} emissiveIntensity={pose.eyeGlow} />
              </mesh>
            ))}
            <Box s={[0.055, 0.15, 0.06]} p={[-0.255, 0.12, 0.05]}>
              <Paint c={C.dark} />
            </Box>
            <Box s={[0.055, 0.15, 0.06]} p={[0.255, 0.12, 0.05]}>
              <Paint c={C.dark} />
            </Box>
          </group>
        </group>
        <Arm s={-1} pose={pose.arm.L} />
        <Arm s={1} pose={pose.arm.R} />
      </group>
      <Leg s={-1} pose={pose.leg.L} />
      <Leg s={1} pose={pose.leg.R} />
    </group>
  </group>
);

// ---------- позы ----------
const REST = {shZ: 0.13, elX: -0.18};

function basePose(t: number): Pose {
  const sway = Math.sin(t * 0.58);
  return {
    rootY: 0,
    yaw: 0,
    hips: {y: 1.72 + Math.sin(t * 1.5) * 0.02, x: sway * 0.032, ry: 0},
    spine: {r: [0, 0, Math.sin(t * 0.58 + 0.5) * 0.024], sy: 1 + Math.sin(t * 1.5) * 0.009},
    head: [0, 0, 0],
    arm: {
      R: {sh: [-sway * 0.085, 0, REST.shZ], el: [REST.elX - sway * 0.05, 0, 0], wr: [0, 0, 0]},
      L: {sh: [sway * 0.085, 0, -REST.shZ], el: [REST.elX + sway * 0.05, 0, 0], wr: [0, 0, 0]},
    },
    leg: {L: {hip: 0, kn: 0, an: 0}, R: {hip: 0, kn: 0, an: 0}},
    // моргание по фиксированному «случайному» расписанию — кадр всегда одинаковый
    blink: (t % 3.7) < 0.12 || ((t + 1.3) % 5.9) < 0.1,
    eyeGlow: 2.6 + Math.sin(t * 2.1) * 0.6,
  };
}

function applyGesture(P: Pose, kind: GestureKind, p: number, t: number) {
  const e = env(p);
  const R = P.arm.R;
  const L = P.arm.L;
  if (kind === "wave") {
    const s = Math.sin(t * 8.5);
    R.sh = [lerp(R.sh[0], -0.22, e), 0, lerp(R.sh[2], 1.98 + s * 0.05, e)];
    R.el = [R.el[0], 0, lerp(0, 1.05 + s * 0.32, e)];
    R.wr = [0, 0, lerp(0, s * 0.42, e)];
    L.sh = [L.sh[0], 0, lerp(L.sh[2], -0.24, e)];
    P.head = [P.head[0], P.head[1], lerp(0, 0.13, e)];
  } else if (kind === "point" || kind === "pointUp") {
    const up = kind === "pointUp" ? -0.6 : 0;
    R.sh = [lerp(R.sh[0], -1.42 + up, e), 0, lerp(R.sh[2], 0.34, e)];
    R.el = [lerp(R.el[0], -0.05, e), 0, 0];
    P.spine.r = [P.spine.r[0], P.spine.r[1] + e * 0.18, P.spine.r[2]];
    P.head = [P.head[0] + (kind === "pointUp" ? -0.25 * e : 0), P.head[1] + e * 0.22, P.head[2]];
  } else if (kind === "tick") {
    // «ставит галочку»: рука вперёд-вниз, короткий росчерк кистью
    const stroke = p > 0.35 && p < 0.75 ? Math.sin(((p - 0.35) / 0.4) * Math.PI) : 0;
    R.sh = [lerp(R.sh[0], -1.05 + stroke * 0.35, e), 0, lerp(R.sh[2], 0.28, e)];
    R.el = [lerp(R.el[0], -0.55 - stroke * 0.3, e), 0, 0];
    R.wr = [0, 0, stroke * 0.8];
    P.head = [P.head[0] + e * 0.28, P.head[1] + e * 0.15, P.head[2]];
    P.spine.r = [P.spine.r[0] + e * 0.1, P.spine.r[1] + e * 0.12, P.spine.r[2]];
  } else if (kind === "push") {
    // выталкивает плашку двумя руками
    const k = p < 0.4 ? smooth(p / 0.4) : 1 - smooth((p - 0.4) / 0.6);
    for (const A of [R, L]) {
      A.sh = [lerp(A.sh[0], -1.5, k), 0, A.sh[2] * (1 - k)];
      A.el = [lerp(A.el[0], -0.1, k), 0, 0];
    }
    P.spine.r = [P.spine.r[0] + k * 0.16, P.spine.r[1], P.spine.r[2]];
  } else if (kind === "pull") {
    // «вытаскивает» карточку из-за края: тянется вперёд, хватает и тянет на себя, корпус откидывается назад
    const reach = p < 0.35 ? smooth(p / 0.35) : 1;
    const tug = p < 0.35 ? 0 : p < 0.75 ? smooth((p - 0.35) / 0.4) : 1 - smooth((p - 0.75) / 0.25);
    for (const A of [R, L]) {
      A.sh = [lerp(A.sh[0], -1.5 + tug * 0.9, reach * (1 - (p > 0.75 ? (p - 0.75) / 0.25 : 0))), 0, A.sh[2] * (1 - reach)];
      A.el = [lerp(A.el[0], -0.05 - tug * 1.3, reach), 0, 0];
      A.wr = [0, 0, tug * 0.3];
    }
    P.spine.r = [P.spine.r[0] + reach * 0.18 - tug * 0.32, P.spine.r[1], P.spine.r[2]];
    P.head = [P.head[0] - tug * 0.1, P.head[1], P.head[2]];
  } else if (kind === "present") {
    // руки вверх — «выдвигает» плашки над собой
    R.sh = [lerp(R.sh[0], -2.6, e), 0, lerp(R.sh[2], 0.35, e)];
    L.sh = [lerp(L.sh[0], -2.6, e), 0, lerp(L.sh[2], -0.35, e)];
    R.el = [lerp(R.el[0], -0.35, e), 0, 0];
    L.el = [lerp(L.el[0], -0.35, e), 0, 0];
    P.head = [P.head[0] - e * 0.3, P.head[1], P.head[2]];
  } else if (kind === "nod") {
    P.head = [P.head[0] + Math.sin(p * Math.PI * 2) * 0.3, P.head[1], P.head[2]];
  } else if (kind === "scan") {
    P.head = [P.head[0], P.head[1] + Math.sin(p * Math.PI * 2) * 0.95, P.head[2]];
    P.eyeGlow += e * 2.5;
  } else if (kind === "shrug") {
    R.sh = [R.sh[0], 0, lerp(R.sh[2], 0.62, e)];
    L.sh = [L.sh[0], 0, lerp(L.sh[2], -0.62, e)];
    R.el = [lerp(R.el[0], -0.95, e), 0, 0];
    L.el = [lerp(L.el[0], -0.95, e), 0, 0];
    P.head = [P.head[0] + e * 0.12, P.head[1], P.head[2]];
  } else if (kind === "jump") {
    let crouch = 0;
    let air = 0;
    let tuck = 0;
    let armX = 0;
    let spread = 0;
    let k: number;
    if (p < 0.2) {
      k = p / 0.2;
      k *= k;
      crouch = k;
      armX = k * 0.95;
    } else if (p < 0.32) {
      k = (p - 0.2) / 0.12;
      crouch = 1 - k * 1.35;
      armX = 0.95 - k * 3.1;
    } else if (p < 0.76) {
      k = (p - 0.32) / 0.44;
      air = Math.sin(k * Math.PI);
      tuck = air * 1.05;
      armX = -2.15 + k * 0.3;
      spread = air * 0.3;
    } else if (p < 0.9) {
      k = (p - 0.76) / 0.14;
      crouch = Math.sin(k * Math.PI) * 1.25;
      armX = -0.85 * (1 - k) + k * 0.3;
      spread = 0.35 * Math.sin(k * Math.PI);
    } else {
      k = (p - 0.9) / 0.1;
      crouch = 0.22 * (1 - k) * Math.cos(k * Math.PI * 2);
      armX = 0.3 * (1 - k);
    }
    const a = Math.max(0, crouch) * 0.62;
    const drop = 1.28 * (1 - Math.cos(a));
    for (const s of ["L", "R"] as const) P.leg[s] = {hip: -a - tuck * 0.85, kn: 2 * a + tuck * 1.3, an: -a - tuck * 0.35};
    P.rootY = air * 1.15 - drop + Math.max(0, -crouch) * 0.12;
    const eb = REST.elX * (1 - Math.min(Math.abs(armX) / 2.2, 1));
    R.sh = [armX, 0, REST.shZ + spread];
    L.sh = [armX, 0, -REST.shZ - spread];
    R.el = [eb, 0, 0];
    L.el = [eb, 0, 0];
    P.spine.r = [Math.max(0, crouch) * 0.3 - air * 0.1, P.spine.r[1], P.spine.r[2]];
    P.spine.sy = 1 - Math.max(0, crouch) * 0.05 + air * 0.04;
    P.head = [P.head[0] - Math.max(0, crouch) * 0.18 + air * 0.12, P.head[1], P.head[2]];
  }
}

function applyWalk(P: Pose, phase: number, amount: number) {
  const s = Math.sin(phase);
  P.leg.L = {hip: s * 0.55 * amount, kn: Math.max(0, -s) * 0.9 * amount, an: -s * 0.15 * amount};
  P.leg.R = {hip: -s * 0.55 * amount, kn: Math.max(0, s) * 0.9 * amount, an: s * 0.15 * amount};
  P.arm.L.sh = [P.arm.L.sh[0] - s * 0.45 * amount, 0, P.arm.L.sh[2]];
  P.arm.R.sh = [P.arm.R.sh[0] + s * 0.45 * amount, 0, P.arm.R.sh[2]];
  P.hips.y += Math.abs(Math.cos(phase)) * 0.06 * amount;
}

// где робот и что делает в момент t
export function mascotState(plan: MascotPlan, t: number) {
  const st = plan.stays;
  let x = st[0].x;
  let y = st[0].y;
  let face = st[0].face ?? 0;
  let move: null | {kind: "walk" | "hop"; p: number; dir: number} = null;
  for (let i = 0; i < st.length; i++) {
    const B = st[i];
    const A = st[i - 1] ?? {at: B.at - 1, x: 1200, y: B.y};
    const dist = Math.hypot(B.x - A.x, B.y - A.y);
    const hop = Math.abs(B.y - A.y) > 60;
    const travel = hop ? 0.9 : Math.min(2.2, Math.max(0.5, dist / 520));
    const depart = Math.max(A.at + 0.15, B.at - travel);
    if (t < depart) break;
    if (t < B.at) {
      const p = (t - depart) / (B.at - depart);
      const q = hop ? smooth(p) : p;
      x = lerp(A.x, B.x, q);
      y = lerp(A.y, B.y, q) - (hop ? Math.sin(p * Math.PI) * 140 : 0);
      move = {kind: hop ? "hop" : "walk", p, dir: Math.sign(B.x - A.x) || 1};
      break;
    }
    x = B.x;
    y = B.y;
    face = B.face ?? 0;
  }
  const g = [...plan.gestures].reverse().find((g) => t >= g.at && t < g.at + GESTURE_DUR[g.kind]);
  return {x, y, face, move, gesture: g ? {kind: g.kind, p: (t - g.at) / GESTURE_DUR[g.kind]} : null};
}

export const AuraMascot: React.FC<{plan: MascotPlan; scale?: number}> = ({plan, scale = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const s = mascotState(plan, t);
  const P = basePose(t);
  if (s.move?.kind === "walk") {
    // шаги: ~3 полных шага за переход, в начале и в конце ноги плавно встают
    applyWalk(P, s.move.p * Math.PI * 6, Math.min(1, Math.min(s.move.p, 1 - s.move.p) * 8));
    P.yaw = s.move.dir * 1.1;
  } else if (s.move?.kind === "hop") {
    applyGesture(P, "jump", 0.2 + s.move.p * 0.7, t);
    P.rootY = 0;
    P.yaw = s.move.dir * 0.5;
  } else {
    P.yaw = s.face;
    if (s.gesture) applyGesture(P, s.gesture.kind, s.gesture.p, t);
  }
  const shadowK = s.move?.kind === "hop" ? 1 - Math.sin(s.move.p * Math.PI) * 0.5 : 1 - Math.max(0, P.rootY) * 0.35;
  return (
    <div style={{position: "absolute", left: s.x - (W * scale) / 2, top: s.y - FOOT * scale, width: W * scale, height: H * scale, pointerEvents: "none"}}>
      {/* мягкая тень на «полу» */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: FOOT * scale - 10 * scale,
          width: 150 * scale * shadowK,
          height: 26 * scale * shadowK,
          translate: "-50% 0",
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(0,0,0,0.45), rgba(0,0,0,0))",
        }}
      />
      <ThreeCanvas
        width={W * scale}
        height={H * scale}
        dpr={2}
        gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}}
        camera={{fov: 30, position: [0.9, 2.1, 9.6], near: 0.1, far: 100}}
        style={{position: "absolute", inset: 0}}
      >
        <CameraLook />
        <hemisphereLight args={["#C8D8E8", "#20262C", 0.35]} />
        <directionalLight position={[4, 7, 5]} intensity={1.6} />
        <directionalLight position={[-3, 3.5, -4.5]} intensity={1.0} color={C.accent} />
        <Robot pose={P} />
      </ThreeCanvas>
    </div>
  );
};

// камера смотрит на середину робота, как на сайте (camera.lookAt(0, 1.62, 0))
const CameraLook: React.FC = () => {
  const camera = useThree((st) => st.camera);
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  React.useLayoutEffect(() => {
    camera.lookAt(0, 1.62, 0);
    camera.updateProjectionMatrix();
    // студийное окружение для отражений и лака, как на сайте (там PMREM из «комнаты» со светлыми панелями)
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    const pm = new THREE.PMREMGenerator(gl);
    const envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pm.dispose();
    return () => envTex.dispose();
  }, [camera, gl, scene]);
  return null;
};
