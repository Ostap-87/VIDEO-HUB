// Гуманоид Aura (референс source-videos/aura-robotics/3d-референсы/gumanoid.webp; решение пользователя 12.10.2026:
// «на основе этого референса отрисуй нашего гуманоида, максимально реалистичным, как роборука, манипулятор и робособака»).
// Стиль Aura вместо цветов референса: белые панели → пергамент, тёмно-синие → графит, красные акценты → лимонный.
// Шлем с чёрным визором, лимонным «V» и глазами-диодами, «уши»-диски; грудь с треугольной эмблемой и пластинами живота,
// круглые шарниры плеч, локтей, бёдер и коленей, лимонные полосы на бёдрах, кроссовки с лимонной вставкой; кисти —
// роборука AuraHand (HandRig, масштаб 0,4) на графитовом шарнире запястья. Рост ~3,45 ед. (≈ 1,75 м), лицом к +z (yaw = −π/2 — к зрителю при камере спереди).
// План: stays — куда идти (шаг с обратной кинематикой ног: ступни не скользят, руки маховые, таз покачивается);
// gestures — {at, kind}: wave (помахать), point (показать вперёд), present (пригласить, руки в стороны), bow (поклон),
// nod (кивнуть), look (оглядеться).
import React from "react";
import * as THREE from "three";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {Box, Capsule, Cyl, Glow, Graphite, Metal, Parchment, RBox, Ring, Seam, Shadow, Sph, Visor, clamp01, pathAt, smooth, type Stay, type V3} from "./kit";
import {HandRig, POSES, type HandPose} from "./AuraHand";

export type HumanoidGesture = {at: number; kind: "wave" | "point" | "present" | "bow" | "nod" | "look"};
export type HumanoidPlan = {stays: Stay[]; speed?: number; gestures?: HumanoidGesture[]};
export const HUMANOID = {hipY: 1.71, hipX: 0.15, L1: 0.82, L2: 0.78, ankle: 0.14, shX: 0.47, shY: 0.73, UA: 0.58, FA: 0.5, hand: 0.4, cycle: 1.1};
export const H_DUR: Record<HumanoidGesture["kind"], number> = {wave: 2.6, point: 1.9, present: 1.9, bow: 2.0, nod: 1.2, look: 2.4};

type Arm = {flex: number; abd: number; elbow: number; twist: number; hand: HandPose};
type Leg = {hip: number; knee: number; ankle: number};
type HPose = {
  pos: V3;
  yaw: number;
  pelvis: {y: number; x: number; roll: number};
  spine: {pitch: number; yaw: number; roll: number; breathe: number};
  head: {pitch: number; yaw: number; roll: number};
  arms: {R: Arm; L: Arm};
  legs: {R: Leg; L: Leg};
  blink: boolean;
  glow: number;
};

const mixHand = (a: HandPose, b: HandPose, k: number): HandPose => ({
  f: a.f.map((v, i) => v.map((x, j) => x + (b.f[i][j] - x) * k)) as HandPose["f"],
  th: a.th.map((x, i) => x + (b.th[i] - x) * k) as HandPose["th"],
});
const REST_HAND = mixHand(POSES.relaxed, POSES.fist, 0.45);

// нога в сагиттальной плоскости: голеностоп (dz вперёд, dy вниз < 0) от тазобедренного → бедро вперёд, колено назад
const legIK = (dz: number, dy: number): [number, number] => {
  const {L1, L2} = HUMANOID;
  const D = Math.min(L1 + L2 - 0.002, Math.max(0.3, Math.hypot(dz, dy)));
  const phi = Math.atan2(dz, -dy);
  const a = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))));
  const g = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2))));
  return [phi + a, Math.PI - g];
};

export const humanoidPose = (plan: HumanoidPlan, t: number): HPose => {
  const {hipY, ankle, cycle} = HUMANOID;
  const st = pathAt(plan.stays, t, plan.speed ?? 0.95, 0.6);
  const phase = st.dist / cycle;
  const m = clamp01(Math.abs(st.speed) / 0.3);
  const bob = 0.022 * Math.cos(4 * Math.PI * phase) * m;
  const sway = 0.025 * Math.sin(2 * Math.PI * phase) * m;
  const breathe = Math.sin(t * 1.7);
  const pose: HPose = {
    pos: [st.x, 0, st.z],
    yaw: st.yaw + Math.PI / 2,
    pelvis: {y: hipY - 0.025 * m + bob, x: sway, roll: -sway * 1.2},
    spine: {pitch: 0.03 * m, yaw: 0.07 * m * Math.cos(2 * Math.PI * phase), roll: sway * 0.8, breathe},
    head: {pitch: 0, yaw: Math.sin(t * 0.45) * 0.05, roll: 0},
    arms: {
      R: {flex: 0.32 * m * Math.cos(2 * Math.PI * phase) + 0.02 * breathe, abd: 0.08, elbow: 0.22 + 0.12 * m, twist: 0, hand: REST_HAND},
      L: {flex: -0.32 * m * Math.cos(2 * Math.PI * phase) + 0.02 * breathe, abd: 0.08, elbow: 0.22 + 0.12 * m, twist: 0, hand: REST_HAND},
    },
    legs: {R: {hip: 0, knee: 0, ankle: 0}, L: {hip: 0, knee: 0, ankle: 0}},
    blink: t % 4.1 < 0.12 || (t + 1.7) % 6.3 < 0.1,
    glow: 2.4 + Math.sin(t * 2.1) * 0.5,
  };
  // ноги: шаг — опора 60 % цикла (ступня едет назад со скоростью корпуса), перенос 40 % (ступня вперёд с подъёмом)
  for (const side of ["L", "R"] as const) {
    const u = (((phase + (side === "L" ? 0 : 0.5)) % 1) + 1) % 1;
    const half = cycle * 0.3;
    const fz = (u < 0.6 ? half * (1 - (2 * u) / 0.6) : -half + (2 * half * (u - 0.6)) / 0.4) * m * Math.sign(st.speed || 1);
    const lift = u < 0.6 ? 0 : 0.13 * Math.sin(((u - 0.6) / 0.4) * Math.PI) * m;
    const [hip, knee] = legIK(fz, ankle + lift - pose.pelvis.y);
    pose.legs[side] = {hip, knee, ankle: -(hip - knee) + (u >= 0.6 ? 0.25 * Math.sin(((u - 0.6) / 0.4) * Math.PI) * m : 0)};
  }
  // жесты
  for (const g of plan.gestures ?? []) {
    const d = H_DUR[g.kind];
    const p = (t - g.at) / d;
    if (p < 0 || p > 1) continue;
    const w = smooth(clamp01(Math.min(p / 0.22, (1 - p) / 0.22)));
    const u = t - g.at;
    const A = pose.arms;
    const to = (arm: Arm, x: Partial<Omit<Arm, "hand">>, hand?: HandPose) => {
      if (x.flex !== undefined) arm.flex += (x.flex - arm.flex) * w;
      if (x.abd !== undefined) arm.abd += (x.abd - arm.abd) * w;
      if (x.elbow !== undefined) arm.elbow += (x.elbow - arm.elbow) * w;
      if (x.twist !== undefined) arm.twist += (x.twist - arm.twist) * w;
      if (hand) arm.hand = mixHand(arm.hand, hand, w);
    };
    if (g.kind === "wave") {
      to(A.R, {flex: 2.55, abd: 0.28 + 0.3 * Math.sin(2 * Math.PI * 2.1 * u), elbow: 0.5, twist: 0.2}, POSES.open);
      pose.head.roll += 0.08 * w;
      pose.spine.roll -= 0.04 * w;
    }
    if (g.kind === "point") {
      to(A.R, {flex: 1.45, abd: 0.12, elbow: 0.05}, POSES.point);
      pose.head.pitch += 0.06 * w;
      pose.spine.yaw += 0.12 * w;
    }
    if (g.kind === "present") {
      to(A.R, {flex: 0.6, abd: 0.75, elbow: 0.7, twist: -0.5}, POSES.open);
      to(A.L, {flex: 0.6, abd: 0.75, elbow: 0.7, twist: -0.5}, POSES.open);
      pose.head.pitch += 0.08 * Math.sin(Math.PI * clamp01((p - 0.25) / 0.5)) * w;
      pose.spine.pitch -= 0.05 * w;
    }
    if (g.kind === "bow") {
      pose.spine.pitch += 0.42 * w;
      pose.head.pitch += 0.2 * w;
      to(A.R, {flex: 0.05, abd: 0.05, elbow: 0.15});
      to(A.L, {flex: 0.05, abd: 0.05, elbow: 0.15});
    }
    if (g.kind === "nod") pose.head.pitch += 0.24 * Math.sin(Math.PI * p * 2) * Math.sin(Math.PI * p);
    if (g.kind === "look") pose.head.yaw += 0.6 * Math.sin(2 * Math.PI * p) * w;
  }
  return pose;
};

// рука: плечо (подъём вперёд flex, в сторону abd, поворот twist) → локоть → кисть (HandRig)
const ArmChain: React.FC<{side: 1 | -1; a: Arm}> = ({side, a}) => {
  const {UA, FA, hand} = HUMANOID;
  return (
    <group rotation={new THREE.Euler(-a.flex, a.twist, side * a.abd, "ZXY")}>
      <Sph r={0.11}>
        <Graphite />
      </Sph>
      <RBox s={[0.17, UA - 0.06, 0.17]} r={0.07} p={[0, -UA / 2 - 0.02, 0]}>
        <Parchment />
      </RBox>
      <Box s={[0.012, 0.16, 0.06]} p={[side * 0.087, -UA * 0.38, 0]}>
        <meshStandardMaterial color="#FFF65D" roughness={0.45} />
      </Box>
      <group position={[0, -UA, 0]} rotation={[-a.elbow, 0, 0]}>
        <group rotation={[0, 0, Math.PI / 2]}>
          <Cyl a={0.085} b={0.085} h={0.2}>
            <Graphite />
          </Cyl>
          <Cyl a={0.05} b={0.05} h={0.205}>
            <Metal />
          </Cyl>
        </group>
        <RBox s={[0.15, FA - 0.05, 0.15]} r={0.06} p={[0, -FA / 2, 0]}>
          <Graphite />
        </RBox>
        <RBox s={[0.155, 0.05, 0.155]} r={0.02} p={[0, -FA + 0.08, 0]}>
          <meshPhysicalMaterial color="#FFF65D" roughness={0.35} clearcoat={0.9} />
        </RBox>
        {/* запястье — шарнир со светящимся кольцом; кисть вплотную: пальцы вниз, ладонь к бедру; левая — зеркальная правая */}
        <Sph r={0.068} p={[0, -FA + 0.005, 0]}>
          <Graphite />
        </Sph>
        <Ring r={0.07} tube={0.007} p={[0, -FA + 0.005, 0]} rot={[Math.PI / 2, 0, 0]}>
          <Glow k={1.6} />
        </Ring>
        <group position={[0, -FA + 0.045, 0]} scale={[side, 1, 1]}>
          <group rotation={new THREE.Euler(0, -Math.PI / 2, Math.PI, "YXZ")} scale={hand}>
            <HandRig pose={a.hand} />
          </group>
        </group>
      </group>
    </group>
  );
};

// нога: бедро → колено → голеностоп → кроссовок
const LegChain: React.FC<{side: 1 | -1; l: Leg}> = ({side, l}) => {
  const {L1, L2} = HUMANOID;
  return (
    <group rotation={[-l.hip, 0, 0]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <Cyl a={0.115} b={0.115} h={0.16}>
          <Graphite />
        </Cyl>
      </group>
      <RBox s={[0.23, L1 - 0.08, 0.25]} r={0.1} p={[0, -L1 / 2 + 0.02, 0.01]}>
        <Parchment />
      </RBox>
      {/* лимонные полосы на бедре (на референсе — красные) */}
      {[0, 1, 2, 3, 4].map((k) => (
        <Box key={k} s={[0.05, 0.03, 0.01]} p={[side * 0.06, -0.3 - k * 0.055, 0.138]} r={[0, 0, side * -0.35]}>
          <meshStandardMaterial color="#FFF65D" roughness={0.45} />
        </Box>
      ))}
      <group position={[0, -L1, 0]} rotation={[l.knee, 0, 0]}>
        <group rotation={[0, 0, Math.PI / 2]}>
          <Cyl a={0.11} b={0.11} h={0.24}>
            <Graphite />
          </Cyl>
          {[-1, 1].map((s) => (
            <Ring key={s} r={0.06} tube={0.008} p={[0, s * 0.123, 0]} rot={[Math.PI / 2, 0, 0]}>
              <Glow k={1.6} />
            </Ring>
          ))}
        </group>
        <RBox s={[0.2, L2 * 0.62, 0.12]} r={0.05} p={[0, -L2 * 0.36, 0.055]}>
          <Parchment />
        </RBox>
        <RBox s={[0.17, L2 * 0.78, 0.16]} r={0.06} p={[0, -L2 * 0.42, -0.03]}>
          <Graphite />
        </RBox>
        {/* приводы голеностопа сзади */}
        {[-1, 1].map((s) => (
          <Cyl key={s} a={0.018} b={0.018} h={0.32} p={[s * 0.05, -L2 + 0.2, -0.12]}>
            <Metal />
          </Cyl>
        ))}
        <group position={[0, -L2, 0]} rotation={[l.ankle, 0, 0]}>
          <Sph r={0.065}>
            <Graphite />
          </Sph>
          <RBox s={[0.19, 0.11, 0.36]} r={0.05} p={[0, -0.07, 0.07]}>
            <Parchment />
          </RBox>
          <RBox s={[0.2, 0.04, 0.37]} r={0.018} p={[0, -0.12, 0.07]}>
            <Graphite />
          </RBox>
          <Box s={[0.012, 0.035, 0.16]} p={[side * 0.097, -0.06, 0.1]}>
            <meshStandardMaterial color="#FFF65D" roughness={0.45} />
          </Box>
        </group>
      </group>
    </group>
  );
};

export const HumanoidModel: React.FC<{plan: HumanoidPlan; t?: number}> = ({plan, t: tProp}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = tProp ?? frame / fps;
  const P = humanoidPose(plan, t);
  const {hipX, shX, shY} = HUMANOID;
  return (
    <group position={P.pos}>
      <Shadow w={1.3} d={1.0} />
      <group rotation={[0, P.yaw, 0]}>
        {/* таз */}
        <group position={[P.pelvis.x, P.pelvis.y, 0]} rotation={[0, 0, P.pelvis.roll]}>
          <RBox s={[0.5, 0.28, 0.32]} r={0.1} p={[0, 0.07, 0]}>
            <Graphite />
          </RBox>
          <RBox s={[0.36, 0.1, 0.06]} r={0.03} p={[0, 0.06, 0.155]}>
            <Seam />
          </RBox>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * hipX, 0, 0]}>
              <LegChain side={s as 1 | -1} l={s < 0 ? P.legs.R : P.legs.L} />
            </group>
          ))}
          {/* корпус */}
          <group position={[0, 0.18, 0]} rotation={new THREE.Euler(P.spine.pitch, P.spine.yaw, P.spine.roll, "YXZ")}>
            <Cyl a={0.17} b={0.19} h={0.14} p={[0, 0.06, 0]}>
              <Graphite />
            </Cyl>
            <Ring r={0.18} tube={0.008} p={[0, 0.06, 0]} rot={[Math.PI / 2, 0, 0]}>
              <Glow k={1.4} />
            </Ring>
            <RBox s={[0.48, 0.34, 0.3]} r={0.1} p={[0, 0.27, 0]}>
              <Graphite />
            </RBox>
            {/* пластины живота (на референсе — шестиугольные) */}
            {[-1, 1].flatMap((sx) =>
              [0, 1].map((k) => (
                <RBox key={`${sx}${k}`} s={[0.17, 0.11, 0.03]} r={0.03} p={[sx * 0.095, 0.2 + k * 0.125, 0.155]}>
                  <Parchment />
                </RBox>
              )),
            )}
            <group position={[0, 0.6, 0]} scale={[1, 1 + P.spine.breathe * 0.006, 1 + P.spine.breathe * 0.008]}>
              <RBox s={[0.74, 0.52, 0.4]} r={0.13}>
                <Parchment />
              </RBox>
              {[-1, 1].map((s) => (
                <RBox key={s} s={[0.1, 0.44, 0.34]} r={0.05} p={[s * 0.35, -0.02, -0.02]}>
                  <Graphite />
                </RBox>
              ))}
              {/* эмблема-треугольник на груди: светящийся лимонный контур */}
              <mesh position={[0, 0.08, 0.205]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.065, 0.013, 8, 3]} />
                <meshStandardMaterial color="#FFF65D" emissive="#FFF65D" emissiveIntensity={P.glow * 0.9} />
              </mesh>
              <RBox s={[0.4, 0.05, 0.02]} r={0.01} p={[0, -0.16, 0.2]}>
                <Graphite />
              </RBox>
            </group>
            {/* плечи и руки */}
            {[-1, 1].map((s) => (
              <group key={s} position={[s * shX, shY, 0]}>
                <RBox s={[0.25, 0.26, 0.3]} r={0.12} p={[s * 0.03, 0.06, 0]}>
                  <Parchment />
                </RBox>
                <group position={[s * 0.16, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <Cyl a={0.09} b={0.09} h={0.03}>
                    <Graphite />
                  </Cyl>
                  <Sph r={0.018} p={[0.03, s * 0.016, 0.03]}>
                    <Glow k={P.glow} />
                  </Sph>
                </group>
                <ArmChain side={s as 1 | -1} a={s < 0 ? P.arms.R : P.arms.L} />
              </group>
            ))}
            {/* шея и голова-шлем */}
            <Capsule r={0.07} l={0.12} p={[0, 0.95, 0]}>
              <Graphite />
            </Capsule>
            {[-1, 1].map((s) => (
              <Cyl key={s} a={0.008} b={0.008} h={0.16} p={[s * 0.06, 0.95, -0.03]} r={[0.2, 0, 0]}>
                <Metal />
              </Cyl>
            ))}
            <group position={[0, 1.04, 0]} rotation={new THREE.Euler(P.head.pitch, P.head.yaw, P.head.roll, "YXZ")}>
              <mesh position={[0, 0.2, -0.01]} scale={[0.93, 1.06, 1.04]}>
                <sphereGeometry args={[0.235, 32, 24]} />
                <meshPhysicalMaterial color="#F8F6F3" metalness={0.1} roughness={0.3} clearcoat={1} clearcoatRoughness={0.06} />
              </mesh>
              {/* визор */}
              <mesh position={[0, 0.17, 0.07]} scale={[0.86, 0.72, 0.78]}>
                <sphereGeometry args={[0.235, 32, 24]} />
                <Visor />
              </mesh>
              {/* глаза-диоды под визором */}
              {[-0.07, 0.07].map((x) => (
                <mesh key={x} position={[x, 0.19, 0.25]} scale={[1, P.blink ? 0.15 : 1, 0.5]}>
                  <capsuleGeometry args={[0.014, 0.05, 4, 8]} />
                  <meshStandardMaterial color="#FFF65D" emissive="#FFF65D" emissiveIntensity={P.glow} />
                </mesh>
              ))}
              {/* лимонное «V» на лбу шлема */}
              {[-1, 1].map((s) => (
                <Box key={s} s={[0.035, 0.12, 0.03]} p={[s * 0.04, 0.39, 0.13]} r={[-0.55, 0, s * 0.55]}>
                  <meshPhysicalMaterial color="#FFF65D" roughness={0.35} clearcoat={0.9} />
                </Box>
              ))}
              {/* «уши» — диски по бокам */}
              {[-1, 1].map((s) => (
                <group key={s} position={[s * 0.215, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <Cyl a={0.075} b={0.075} h={0.05}>
                    <Graphite />
                  </Cyl>
                  <Ring r={0.045} tube={0.007} p={[0, s * 0.027, 0]} rot={[Math.PI / 2, 0, 0]}>
                    <Glow k={P.glow * 0.8} />
                  </Ring>
                </group>
              ))}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
