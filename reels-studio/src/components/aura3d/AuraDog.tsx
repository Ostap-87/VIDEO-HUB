// Робособака Aura (референс source-videos/aura-robotics/3d-референсы/robosobaka.png — как Unitree Go2; решение
// пользователя 12.10.2026: «робособаки передвигаться должны, вставать на задние лапы и танцевать»). Стиль Aura:
// пергаментный обтекаемый корпус, графитовое «лицо» с чёрным визором, лимонными глазами-диодами и куполом-сенсором,
// графитовая полоса со светящейся линией на спине, моторы бёдер и коленей, бёдра пергаментные, голени графитовые,
// резиновые лапы. Длина ~1,35 ед. (≈ 0,7 м), передом по +x. Ноги — обратная кинематика (колени назад, как у Go2):
// ступни стоят на земле и не скользят, корпус может наклоняться и качаться.
// План (мировые единицы): stays — куда идти (рысь, скорость speed ед./с), actions — трюки:
//   hop — подпрыгнуть (0,75 с); stand — встать на задние лапы и помахать передними (dur, по умолчанию 2,5 с);
//   dance — танец (dur, по умолчанию 4 с): пружинит, качается, по очереди поднимает передние лапы, посередине встаёт
//   на задние лапы и машет, в конце — прыжок с оборотом.
import React from "react";
import * as THREE from "three";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {Box, Capsule, Cyl, Glow, Graphite, Parchment, RBox, Ring, Rubber, Shadow, Sph, Visor, clamp01, env, pathAt, smooth, win, type Stay, type V3} from "./kit";

export type DogAction = {at: number; kind: "hop" | "stand" | "dance"; dur?: number};
export type DogPlan = {stays: Stay[]; speed?: number; actions?: DogAction[]};

export const DOG3D = {L1: 0.34, L2: 0.36, hipX: 0.4, hipY: -0.06, legZ: 0.25, bodyY: 0.62, cycle: 0.5};
const HOP = 0.75;
type LegId = "FL" | "FR" | "RL" | "RR";
const LEGS: {id: LegId; x: number; z: number; off: number}[] = [
  {id: "FL", x: DOG3D.hipX, z: DOG3D.legZ, off: 0},
  {id: "FR", x: DOG3D.hipX, z: -DOG3D.legZ, off: 0.5},
  {id: "RL", x: -DOG3D.hipX, z: DOG3D.legZ, off: 0.5},
  {id: "RR", x: -DOG3D.hipX, z: -DOG3D.legZ, off: 0},
];

// обратная кинематика ноги в плоскости: ступня (dx вперёд, dy вниз < 0) от тазобедренного шарнира → бедро, колено
const legIK = (dx: number, dy: number): [number, number] => {
  const {L1, L2} = DOG3D;
  const D = Math.min(L1 + L2 - 0.005, Math.max(0.08, Math.hypot(dx, dy)));
  const phi = Math.atan2(dx, -dy);
  const a = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))));
  const g = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2))));
  return [phi - a, Math.PI - g]; // колено назад: бедро отклонено назад, голень — вперёд
};

type Pose = {root: V3; yaw: number; body: V3; pitch: number; roll: number; legs: Record<LegId, {ab: number; hip: number; knee: number}>; air: number};

export const dogPose = (plan: DogPlan, t: number): Pose => {
  const st = pathAt(plan.stays, t, plan.speed ?? 1.1, 0.4);
  const acts = plan.actions ?? [];
  // --- трюки ---
  let rootY = 0;
  let crouch = 0;
  let tuck = 0;
  let yawAdd = 0;
  let stand = 0;
  let dip = 0;
  let roll = 0;
  const pawLift: Record<LegId, number> = {FL: 0, FR: 0, RL: 0, RR: 0};
  const hopAt = (at: number, spin = 0) => {
    const p = (t - at) / HOP;
    if (p < 0 || p > 1) return;
    crouch = Math.max(crouch, p < 0.25 ? env(p / 0.5) : p > 0.8 ? env((p - 0.8) / 0.4) * 0.7 : 0);
    const air = p > 0.25 && p < 0.8 ? Math.sin(((p - 0.25) / 0.55) * Math.PI) : 0;
    rootY = Math.max(rootY, air * 0.32);
    tuck = Math.max(tuck, air);
    yawAdd += spin * smooth(clamp01((p - 0.2) / 0.65));
  };
  for (const a of acts) {
    if (a.kind === "hop") hopAt(a.at);
    if (a.kind === "stand") stand = Math.max(stand, win(t, a.at, a.at + (a.dur ?? 2.5), 0.6));
    if (a.kind === "dance") {
      const d = a.dur ?? 4;
      const e = win(t, a.at, a.at + d, 0.3);
      if (e <= 0) continue;
      const u = t - a.at;
      dip += e * 0.07 * (0.5 - 0.5 * Math.cos((2 * Math.PI * u) / 0.5)); // пружинит в такт (2 раза в секунду)
      roll += e * 0.15 * Math.sin(2 * Math.PI * u); // качается
      yawAdd += e * 0.22 * Math.sin(2 * Math.PI * u + Math.PI / 2);
      const paws = e * (1 - win(t, a.at + d * 0.36, a.at + d * 0.7, 0.4));
      pawLift.FL = paws * 0.16 * Math.max(0, Math.sin(2 * Math.PI * u));
      pawLift.FR = paws * 0.16 * Math.max(0, -Math.sin(2 * Math.PI * u));
      stand = Math.max(stand, win(t, a.at + d * 0.36, a.at + d * 0.7, 0.4));
      hopAt(a.at + d - HOP - 0.05, 2 * Math.PI); // прыжок с оборотом в конце
    }
  }
  // --- корпус ---
  const {hipX, hipY, legZ, bodyY, cycle} = DOG3D;
  const phase = st.dist / cycle;
  const m = clamp01(Math.abs(st.speed) / 0.35) * (1 - stand);
  const bob = m * 0.012 * Math.cos(4 * Math.PI * phase);
  // стойка на задних лапах: корпус поворачивается вокруг задних бёдер
  const beta = stand * 1.12;
  const rearH = bodyY + hipY - stand * 0.1 - crouch * 0.1;
  const rx = -hipX;
  const ry = hipY;
  const c = Math.cos(beta);
  const s = Math.sin(beta);
  // центр корпуса так, чтобы задние бёдра остались на месте (при beta = 0 — обычная стойка)
  const body: V3 = [-hipX - (rx * c - ry * s), rearH - (rx * s + ry * c) + (bob - dip) * (1 - stand), 0];
  const pitch = beta;
  const M = new THREE.Matrix4().compose(new THREE.Vector3(...body), new THREE.Quaternion().setFromEuler(new THREE.Euler(roll, 0, pitch, "XYZ")), new THREE.Vector3(1, 1, 1));
  const inv = M.clone().invert();
  const legs = {} as Pose["legs"];
  for (const L of LEGS) {
    const front = L.x > 0;
    // ступня: под бедром, шаг рысью вперёд-назад, при поднятой лапе — выше
    const uu = (((phase + L.off) % 1) + 1) % 1;
    const stepX = uu < 0.5 ? (cycle / 4) * (1 - 4 * uu) : (cycle / 4) * (-1 + 4 * (uu - 0.5));
    const lift = uu < 0.5 ? 0 : 0.09 * Math.sin(((uu - 0.5) / 0.5) * Math.PI);
    const fx = L.x + (front ? 0.03 : -0.02) + stepX * m * Math.sign(st.speed || 1) + pawLift[L.id] * 0.5;
    const fy = lift * m + pawLift[L.id] + tuck * 0.1;
    const foot = new THREE.Vector3(fx, fy, L.z).applyMatrix4(inv);
    const dx = foot.x - L.x;
    const dy = foot.y - hipY;
    const dz = foot.z - L.z;
    const ab = -Math.atan2(dz, -dy);
    let [hip, knee] = legIK(dx, -Math.hypot(dy, dz));
    if (front && stand > 0) {
      // на задних лапах передние «просят»: лапы перед собой, колени согнуты, по очереди машут
      const wave = 0.38 * Math.sin(t * 7 + (L.id === "FL" ? 0 : Math.PI));
      hip = hip + (0.5 + wave - hip) * stand;
      knee = knee + (1.55 - wave * 0.4 - knee) * stand;
    }
    legs[L.id] = {ab: ab * (1 - stand * (front ? 1 : 0)), hip, knee};
  }
  return {root: [st.x, rootY, st.z], yaw: st.yaw + yawAdd, body, pitch, roll, legs, air: rootY};
};

const Leg: React.FC<{x: number; z: number; pose: {ab: number; hip: number; knee: number}}> = ({x, z, pose}) => {
  const {L1, L2, hipY} = DOG3D;
  const side = Math.sign(z);
  return (
    <group position={[x, hipY, z]} rotation={[pose.ab, 0, pose.hip]}>
      {/* мотор бедра */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        <Cyl a={0.085} b={0.085} h={0.12} p={[0, -side * 0.01, 0]}>
          <Graphite />
        </Cyl>
        <Cyl a={0.088} b={0.088} h={0.03} p={[0, side * 0.06, 0]}>
          <Parchment />
        </Cyl>
        <Ring r={0.05} tube={0.008} p={[0, side * 0.077, 0]} rot={[Math.PI / 2, 0, 0]}>
          <Glow k={1.6} />
        </Ring>
      </group>
      {/* бедро */}
      <RBox s={[0.12, L1 + 0.06, 0.1]} r={0.045} p={[0, -L1 / 2, side * 0.02]}>
        <Parchment />
      </RBox>
      <group position={[0, -L1, 0]} rotation={[0, 0, pose.knee]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Cyl a={0.06} b={0.06} h={0.1}>
            <Graphite />
          </Cyl>
        </group>
        {/* голень — слегка изогнутая, сужается к лапе */}
        <Capsule r={0.035} l={L2 * 0.55} p={[0.015, -L2 * 0.35, 0]} rot={[0, 0, -0.08]}>
          <Graphite />
        </Capsule>
        <Capsule r={0.026} l={L2 * 0.4} p={[0.02, -L2 * 0.72, 0]} rot={[0, 0, 0.06]}>
          <Graphite />
        </Capsule>
        <Sph r={0.045} p={[0.012, -L2, 0]}>
          <Rubber />
        </Sph>
      </group>
    </group>
  );
};

export const DogModel: React.FC<{plan: DogPlan; t?: number}> = ({plan, t: tProp}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = tProp ?? frame / fps;
  const P = dogPose(plan, t);
  const glow = 2.4 + Math.sin(t * 2.4) * 0.6;
  const blink = t % 4.3 < 0.12 || (t + 2.1) % 6.7 < 0.1;
  return (
    <group position={[P.root[0], 0, P.root[2]]}>
      <Shadow w={1.7} d={1.0} o={1 - P.air * 1.4} yaw={P.yaw} />
      <group position={[0, P.root[1], 0]} rotation={[0, P.yaw, 0]}>
        <group position={P.body} rotation={new THREE.Euler(P.roll, 0, P.pitch, "XYZ")}>
          {/* корпус */}
          <RBox s={[1.06, 0.26, 0.4]} r={0.1}>
            <Parchment />
          </RBox>
          <RBox s={[0.6, 0.03, 0.12]} r={0.012} p={[-0.05, 0.13, 0]}>
            <Graphite />
          </RBox>
          <Box s={[0.5, 0.006, 0.02]} p={[-0.05, 0.147, 0]}>
            <Glow k={glow * 0.7} />
          </Box>
          {[-1, 1].map((sd) => (
            <group key={sd}>
              <RBox s={[0.5, 0.12, 0.02]} r={0.008} p={[-0.02, -0.02, sd * 0.2]}>
                <Graphite />
              </RBox>
              {[0, 1, 2].map((k) => (
                <Sph key={k} r={0.012} p={[0.12 + k * 0.05, -0.02, sd * 0.212]}>
                  <Glow k={glow} />
                </Sph>
              ))}
            </group>
          ))}
          {/* «лицо»: графит, визор, глаза-диоды, купол-сенсор снизу */}
          <RBox s={[0.16, 0.22, 0.34]} r={0.07} p={[0.53, 0.0, 0]}>
            <Graphite />
          </RBox>
          <Box s={[0.03, 0.1, 0.24]} p={[0.61, 0.02, 0]}>
            <Visor />
          </Box>
          {[-0.065, 0.065].map((z) => (
            <mesh key={z} position={[0.628, 0.025, z]} scale={[1, blink ? 0.15 : 1, 1]}>
              <sphereGeometry args={[0.024, 14, 10]} />
              <meshStandardMaterial color="#FFF65D" emissive="#FFF65D" emissiveIntensity={glow} />
            </mesh>
          ))}
          <Sph r={0.08} p={[0.52, -0.11, 0]}>
            <Visor />
          </Sph>
          <Ring r={0.06} tube={0.008} p={[0.55, -0.12, 0]} rot={[0, Math.PI / 2, 0]}>
            <Glow k={1.4} />
          </Ring>
          {LEGS.map((L) => (
            <Leg key={L.id} x={L.x} z={L.z} pose={P.legs[L.id]} />
          ))}
        </group>
      </group>
    </group>
  );
};
