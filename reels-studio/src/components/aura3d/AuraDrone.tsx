// Дроны Aura (решение пользователя 05.11.2026: «добавить квадрокоптеры… максимально детально»). Два персонажа:
// - дрон-инспектор (`kind: "inspect"`, размах ~1,3 ед. ≈ 0,65 м): карбоновая Х-рама, четыре мотора с пропеллерами в защитных
//   кольцах, корпус-«панцирь» со швами и винтами, датчики препятствий в носу, гимбал с камерой под носом, лыжи шасси,
//   купол сенсора-лидара сверху, батарея с индикатором заряда, антенны, навигационные огни (спереди — цвет скина, сзади —
//   красные, строб мигает); скины `aura` (пергамент, графит, лимонный) и `whiteOrange` (белый с оранжевым);
// - грузовой дрон (`kind: "cargo"`, размах ~2,9 ед.): крупный корпус, четыре луча со складными шарнирами и соосными парами
//   винтов (сверху и снизу), высокое шасси, GPS-купол и маячок, лебёдка под корпусом с тросом и захватом-«крестом»;
//   коробка CargoBox висит на тросе и раскачивается против разгона.
// Передом по +x (курс 0 — летит по +x), начало координат — точка касания земли (y = 0 — стоит на полу).
// План (мировые единицы сцены Stage, время — секунды):
// - stays — {at, x, y, z?, yaw?}: ключевые точки полёта (между ними плавно); в движении дрон наклоняется по ходу (тангаж и
//   крен по скорости и разгону), в зависании покачивается;
// - takeoff / land — моменты взлёта и посадки: винты раскручиваются за 0,8 с до взлёта и останавливаются после посадки
//   (без ключей — крутятся всё время); на земле лопасти видны чётко, в воздухе — диск размытия;
// - scans — {at, dur?, kind: "cone" | "lidar", yaw?, pitch?}: «cone» — гимбал поворачивается (yaw — относительно курса,
//   pitch — вниз) и камера светит конусом-сканером с бегущей линией; «lidar» — вращающийся веер лидара под корпусом;
// - cargo (грузовой) — {s?, attached?, ground?, events: [{at, kind: "drop" | "pick", y?}]}: drop — за 1,2 с до at трос
//   опускает коробку до высоты y (низ коробки), в at захват отпускает, трос сматывается; pick — трос опускает захват на
//   коробку, в at захватывает и поднимает. attached — коробка на тросе с начала, иначе стоит в ground.
import React from "react";
import * as THREE from "three";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {
  Accent, Alu, Bolt, BoltRing, Box, Capsule, Carbon, CargoBox, Cyl, Glow, Graphite, Hose, Led, LightCone, Metal, Parchment, RBox, Ring,
  Rubber, Seam, Shadow, SkinScope, Sph, Tag, Vents, Visor, clamp01, ramp, track, win, type V3,
} from "./kit";

export type DroneStay = {at: number; x: number; y: number; z?: number; yaw?: number};
export type DroneScan = {at: number; dur?: number; kind?: "cone" | "lidar"; yaw?: number; pitch?: number};
export type DroneCargoEvent = {at: number; kind: "drop" | "pick"; y?: number};
export type DronePlan = {
  stays: DroneStay[];
  takeoff?: number[];
  land?: number[];
  scans?: DroneScan[];
  cargo?: {s?: V3; attached?: boolean; ground?: V3; events?: DroneCargoEvent[]};
};
export type DroneKind = "inspect" | "cargo";
export const DRONE = {
  inspect: {R: 0.46, prop: 0.23, body: 0.3, tilt: 0.32},
  cargo: {R: 1.12, prop: 0.5, body: 0.78, tilt: 0.22, line0: 0.45},
};
const RED = "#E5383B";
const REEL = 1.2; // с: трос опускается / сматывается

// где дрон и как наклонён в момент t
export const droneState = (plan: DronePlan, t: number, kind: DroneKind = "inspect") => {
  const xs = plan.stays.map((s) => [s.at, s.x] as [number, number]);
  const ys = plan.stays.map((s) => [s.at, s.y] as [number, number]);
  const zs = plan.stays.map((s) => [s.at, s.z ?? 0] as [number, number]);
  let lastYaw = plan.stays[0].yaw ?? 0;
  const yaws = plan.stays.map((s) => {
    lastYaw = s.yaw ?? lastYaw;
    return [s.at, lastYaw] as [number, number];
  });
  const pos = (tt: number) => new THREE.Vector3(track(tt, xs), track(tt, ys), track(tt, zs));
  const dt = 1 / 30;
  const p = pos(t);
  const v = pos(t + dt).sub(pos(t - dt)).multiplyScalar(1 / (2 * dt));
  const a = pos(t + 2 * dt).add(pos(t - 2 * dt)).sub(p.clone().multiplyScalar(2)).multiplyScalar(1 / (4 * dt * dt));
  // винты: раскручиваются к взлёту, останавливаются после посадки
  let spin = 1;
  const offs = [...(plan.takeoff ?? []).map((x) => ({at: x, k: 1})), ...(plan.land ?? []).map((x) => ({at: x, k: -1}))].sort((A, B) => A.at - B.at);
  if (offs.length) {
    spin = offs[0].k > 0 ? 0 : 1;
    for (const e of offs) {
      if (e.k > 0) spin = t < e.at - 0.8 ? spin : Math.max(spin, ramp(t, e.at - 0.8, e.at));
      else if (t >= e.at) spin = 1 - ramp(t, e.at, e.at + 1.0);
    }
  }
  const airborne = p.y > 0.02;
  const bob = airborne ? 0.025 * Math.sin(t * 2.3) + 0.012 * Math.sin(t * 3.7 + 1) : 0;
  // наклон: по скорости (сопротивление) и разгону; ограничение по типу
  const maxT = DRONE[kind].tilt;
  const tx = (v.x * 0.12 + a.x * 0.05) * (airborne ? 1 : 0);
  const tz = (v.z * 0.12 + a.z * 0.05) * (airborne ? 1 : 0);
  const m = Math.min(maxT, Math.hypot(tx, tz));
  const qTilt = new THREE.Quaternion();
  if (m > 1e-4) qTilt.setFromAxisAngle(new THREE.Vector3(tz, 0, -tx).normalize(), m);
  const wobble = airborne ? new THREE.Quaternion().setFromEuler(new THREE.Euler(0.02 * Math.sin(t * 1.9), 0, 0.02 * Math.sin(t * 2.6 + 0.5))) : new THREE.Quaternion();
  const yaw = track(t, yaws);
  const q = qTilt.multiply(wobble).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  return {pos: new THREE.Vector3(p.x, p.y + bob, p.z), v, a, q, yaw, spin, airborne};
};

// --- винт: на земле — чёткие лопасти, в воздухе — диск размытия и полупрозрачные лопасти ---
const Prop: React.FC<{r: number; t: number; spin: number; dir: 1 | -1; blades?: number}> = ({r, t, spin, dir, blades = 2}) => {
  const ang = dir * (t * 70 * spin + (1 - spin) * 0.6);
  const blur = spin > 0.35;
  return (
    <group>
      <group rotation={[0, ang, 0]}>
        {Array.from({length: blades}, (_, k) => (
          <group key={k} rotation={[0, (k * 2 * Math.PI) / blades, 0]}>
            <mesh position={[r / 2, 0, 0]} rotation={[0.18 * dir, 0, 0]}>
              <boxGeometry args={[r, 0.008, r * 0.16]} />
              <meshStandardMaterial color="#1A1C1F" roughness={0.45} transparent opacity={blur ? 0.22 : 1} depthWrite={!blur} />
            </mesh>
            <mesh position={[r * 0.93, 0.001, 0]}>
              <boxGeometry args={[r * 0.12, 0.009, r * 0.165]} />
              <Accent />
            </mesh>
          </group>
        ))}
        <Cyl a={r * 0.1} b={r * 0.12} h={0.03}>
          <Metal />
        </Cyl>
      </group>
      {blur ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r * 0.12, r, 48]} />
            <meshBasicMaterial color="#C9CED4" transparent opacity={0.13 * spin} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <ringGeometry args={[r * 0.88, r, 48]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.16 * spin} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </>
      ) : null}
    </group>
  );
};

// --- сканер: конус-фрустум камеры с бегущей линией; лидар: вращающийся веер ---
const ScanCone: React.FC<{len: number; k: number; t: number}> = ({len, k, t}) => {
  const u = (t * 0.9) % 1;
  return (
    <group>
      <group rotation={[0, 0, Math.PI / 2]} position={[len / 2, 0, 0]}>
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[Math.tan(0.42) * len, len, 4, 1, true]} />
          <meshBasicMaterial color="#FFF65D" transparent opacity={0.1 * k} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      {/* рёбра фрустума */}
      {[-1, 1].flatMap((a) =>
        [-1, 1].map((b) => {
          const end = new THREE.Vector3(len, a * Math.tan(0.3) * len, b * Math.tan(0.3) * len);
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), end.clone().normalize());
          return (
            <mesh key={`${a}${b}`} quaternion={q} position={end.clone().multiplyScalar(0.5)}>
              <boxGeometry args={[end.length(), 0.006, 0.006]} />
              <meshBasicMaterial color="#FFF65D" transparent opacity={0.55 * k} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          );
        }),
      )}
      {/* бегущая рамка-скан */}
      <mesh position={[len * (0.25 + 0.75 * u), 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2 * Math.tan(0.3) * len * (0.25 + 0.75 * u), 2 * Math.tan(0.3) * len * (0.25 + 0.75 * u)]} />
        <meshBasicMaterial color="#FFF65D" transparent opacity={0.08 * k * (1 - u)} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};
const LidarSweep: React.FC<{r: number; k: number; t: number}> = ({r, k, t}) => (
  <group rotation={[0, t * 6.5, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[r, 24, -0.6, 0.6]} />
      <meshBasicMaterial color="#FFF65D" transparent opacity={0.1 * k} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <mesh position={[r / 2, 0, 0]}>
      <boxGeometry args={[r, 0.008, 0.008]} />
      <meshBasicMaterial color="#FFF65D" transparent opacity={0.8 * k} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  </group>
);

const scanState = (plan: DronePlan, t: number) => {
  let best: null | {s: DroneScan; k: number} = null;
  for (const s of plan.scans ?? []) {
    const k = win(t, s.at, s.at + (s.dur ?? 3), 0.35);
    if (k > 0 && (!best || k > best.k)) best = {s, k};
  }
  return best;
};

// навигационный огонь на луче: спереди — цвет скина, сзади — красный со стробом
const NavLed: React.FC<{p: V3; rear: boolean; t: number; r?: number}> = ({p, rear, t, r = 0.016}) => (
  <Led p={p} r={r} c={rear ? RED : undefined} k={rear ? (Math.sin(t * 6) > 0.6 ? 4 : 1.4) : 2.6} />
);

// ===== дрон-инспектор =====
const InspectBody: React.FC<{t: number; spin: number; scan: ReturnType<typeof scanState>}> = ({t, spin, scan}) => {
  const {R, prop} = DRONE.inspect;
  const gy = scan?.s.kind !== "lidar" ? (scan?.s.yaw ?? 0) * (scan?.k ?? 0) : 0;
  const gp = (scan?.s.kind !== "lidar" ? (scan?.s.pitch ?? 0.5) : 0.25) * (scan?.k ?? 0) + 0.12;
  return (
    <group>
      {/* корпус: карбоновое «дно», пергаментный панцирь, нос с датчиками, батарея сзади */}
      <RBox s={[0.58, 0.11, 0.3]} r={0.045} p={[0, 0.28, 0]}>
        <Carbon />
      </RBox>
      <RBox s={[0.52, 0.1, 0.27]} r={0.045} p={[0.01, 0.37, 0]}>
        <Parchment />
      </RBox>
      <Box s={[0.32, 0.006, 0.04]} p={[0.02, 0.423, 0]}>
        <Accent />
      </Box>
      <Box s={[0.53, 0.006, 0.006]} p={[0.01, 0.33, 0.136]}>
        <Seam />
      </Box>
      <Box s={[0.53, 0.006, 0.006]} p={[0.01, 0.33, -0.136]}>
        <Seam />
      </Box>
      {[-0.17, 0.17].flatMap((x) => [-0.1, 0.1].map((z) => <Bolt key={`${x}${z}`} p={[x, 0.42, z]} r={0.009} />))}
      <RBox s={[0.14, 0.11, 0.21]} r={0.045} p={[0.3, 0.33, 0]}>
        <Parchment />
      </RBox>
      {[-0.055, 0.055].map((z) => (
        <group key={z} position={[0.372, 0.34, z]} rotation={[0, 0, Math.PI / 2]}>
          <Cyl a={0.022} b={0.022} h={0.012}>
            <Visor />
          </Cyl>
        </group>
      ))}
      <Box s={[0.005, 0.012, 0.16]} p={[0.37, 0.305, 0]}>
        <Glow k={1.6} />
      </Box>
      <RBox s={[0.17, 0.09, 0.22]} r={0.03} p={[-0.3, 0.34, 0]}>
        <Graphite />
      </RBox>
      {[0, 1, 2, 3].map((k) => (
        <Box key={k} s={[0.004, 0.018, 0.018]} p={[-0.386, 0.34, -0.045 + k * 0.03]}>
          <Glow k={k < 3 ? 1.8 : 0.15} />
        </Box>
      ))}
      <Vents p={[0.05, 0.3, 0.151]} n={3} w={0.18} gap={0.022} />
      <Vents p={[0.05, 0.3, -0.151]} rot={[0, Math.PI, 0]} n={3} w={0.18} gap={0.022} />
      <Tag p={[-0.12, 0.37, 0.136]} w={0.1} h={0.045} />
      {/* купол сенсора-лидара сверху */}
      <Cyl a={0.06} b={0.065} h={0.035} p={[-0.06, 0.437, 0]}>
        <Graphite />
      </Cyl>
      <mesh position={[-0.06, 0.455, 0]} scale={[1, 0.7, 1]}>
        <sphereGeometry args={[0.055, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Visor />
      </mesh>
      <group position={[-0.06, 0.457, 0]} rotation={[0, t * 5, 0]}>
        <Box s={[0.11, 0.006, 0.01]}>
          <Glow k={2} />
        </Box>
      </group>
      {/* антенны */}
      {[-1, 1].map((s) => (
        <group key={s} position={[-0.36, 0.38, s * 0.09]} rotation={[s * 0.3, 0, 0.5]}>
          <Cyl a={0.006} b={0.008} h={0.16} p={[0, 0.08, 0]}>
            <Graphite />
          </Cyl>
          <Sph r={0.01} p={[0, 0.16, 0]}>
            <Graphite />
          </Sph>
        </group>
      ))}
      {/* лучи Х-рамы, моторы, винты в кольцах */}
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const rear = Math.cos(a) < 0;
        const dir = (i % 2 ? 1 : -1) as 1 | -1;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <Capsule r={0.022} l={R - 0.1} p={[(R + 0.08) / 2, 0.36, 0]} rot={[0, 0, Math.PI / 2]}>
              <Carbon />
            </Capsule>
            <RBox s={[0.07, 0.04, 0.06]} r={0.012} p={[0.16, 0.36, 0]}>
              <Graphite />
            </RBox>
            <Hose pts={[[0.14, 0.34, 0.02], [R * 0.6, 0.335, 0.026], [R - 0.05, 0.35, 0.02]]} r={0.005} mat="dark" seg={10} />
            {/* мотор */}
            <group position={[R, 0, 0]}>
              <Cyl a={0.045} b={0.05} h={0.03} p={[0, 0.36, 0]}>
                <Graphite />
              </Cyl>
              <BoltRing n={4} R={0.034} p={[0, 0.376, 0]} r={0.006} phase={0.4} />
              <Cyl a={0.055} b={0.055} h={0.065} p={[0, 0.405, 0]}>
                <Graphite />
              </Cyl>
              {Array.from({length: 6}, (_, k) => (
                <Box key={k} s={[0.004, 0.05, 0.02]} p={[Math.cos(k) * 0.056, 0.405, Math.sin(k) * 0.056]} r={[0, -k, 0]}>
                  <Seam />
                </Box>
              ))}
              <Ring r={0.056} tube={0.004} p={[0, 0.39, 0]} rot={[Math.PI / 2, 0, 0]}>
                <Glow k={1.6} />
              </Ring>
              <group position={[0, 0.45, 0]}>
                <Prop r={prop} t={t + i * 0.13} spin={spin} dir={dir} />
              </group>
              {/* защитное кольцо винта на трёх стойках */}
              <Ring r={prop + 0.035} tube={0.011} p={[0, 0.44, 0]} rot={[Math.PI / 2, 0, 0]}>
                <Parchment />
              </Ring>
              <Ring r={prop + 0.035} tube={0.004} p={[0, 0.428, 0]} rot={[Math.PI / 2, 0, 0]}>
                <Accent />
              </Ring>
              {[0.6, 2.7, 4.8].map((b) => (
                <group key={b} rotation={[0, b, 0]}>
                  <Box s={[prop + 0.01, 0.012, 0.014]} p={[(prop + 0.04) / 2 + 0.02, 0.405, 0]}>
                    <Graphite />
                  </Box>
                </group>
              ))}
              <NavLed p={[0.03, 0.33, 0]} rear={rear} t={t} />
            </group>
          </group>
        );
      })}
      {/* шасси: две лыжи на наклонных стойках */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {[-0.12, 0.12].map((x) => (
            <group key={x} position={[x, 0.24, s * 0.11]} rotation={[-s * 0.32, 0, 0]}>
              <Cyl a={0.012} b={0.014} h={0.24} p={[0, -0.11, 0]}>
                <Graphite />
              </Cyl>
            </group>
          ))}
          <Capsule r={0.016} l={0.4} p={[0, 0.016, s * 0.185]} rot={[0, 0, Math.PI / 2]}>
            <Rubber />
          </Capsule>
        </group>
      ))}
      {/* гимбал с камерой под носом */}
      <group position={[0.24, 0.215, 0]}>
        <Cyl a={0.03} b={0.03} h={0.03} p={[0, 0.0, 0]}>
          <Graphite />
        </Cyl>
        <group rotation={[0, gy, 0]}>
          <Box s={[0.02, 0.06, 0.12]} p={[0, -0.04, 0]}>
            <Graphite />
          </Box>
          {[-1, 1].map((s) => (
            <Box key={s} s={[0.03, 0.07, 0.012]} p={[0, -0.075, s * 0.06]}>
              <Graphite />
            </Box>
          ))}
          <group position={[0, -0.085, 0]} rotation={[0, 0, -gp]}>
            <RBox s={[0.085, 0.07, 0.1]} r={0.022}>
              <Parchment />
            </RBox>
            <group position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <Cyl a={0.03} b={0.034} h={0.025}>
                <Graphite />
              </Cyl>
              <Cyl a={0.022} b={0.022} h={0.027}>
                <Visor />
              </Cyl>
              <Ring r={0.028} tube={0.003} p={[0, -0.014, 0]} rot={[Math.PI / 2, 0, 0]}>
                <Glow k={2} />
              </Ring>
            </group>
            <Led p={[0.03, 0.03, 0.035]} r={0.006} c={RED} k={t % 1 < 0.5 ? 3 : 0.5} />
            {scan && scan.s.kind !== "lidar" ? (
              <group position={[0.07, 0, 0]}>
                <ScanCone len={3.2} k={scan.k} t={t} />
              </group>
            ) : null}
          </group>
        </group>
      </group>
      {scan?.s.kind === "lidar" ? (
        <group position={[0, 0.2, 0]}>
          <LidarSweep r={3} k={scan.k} t={t} />
        </group>
      ) : null}
    </group>
  );
};

// ===== грузовой дрон =====
const CargoBody: React.FC<{t: number; spin: number; scan: ReturnType<typeof scanState>}> = ({t, spin, scan}) => {
  const {R, prop} = DRONE.cargo;
  const beacon = Math.sin(t * 5) > 0.7 ? 4 : 0.6;
  return (
    <group>
      {/* корпус */}
      <RBox s={[1.0, 0.18, 0.74]} r={0.07} p={[0, 0.72, 0]}>
        <Carbon />
      </RBox>
      <RBox s={[0.92, 0.2, 0.66]} r={0.09} p={[0.02, 0.88, 0]}>
        <Parchment />
      </RBox>
      <RBox s={[0.3, 0.14, 0.5]} r={0.06} p={[0.5, 0.8, 0]}>
        <Parchment />
      </RBox>
      <Box s={[0.94, 0.03, 0.012]} p={[0.02, 0.8, 0.331]}>
        <Accent />
      </Box>
      <Box s={[0.94, 0.03, 0.012]} p={[0.02, 0.8, -0.331]}>
        <Accent />
      </Box>
      <Box s={[0.6, 0.008, 0.08]} p={[0, 0.982, 0]}>
        <Accent />
      </Box>
      {[-0.35, 0.35].flatMap((x) => [-0.26, 0.26].map((z) => <Bolt key={`${x}${z}`} p={[x, 0.98, z]} r={0.014} />))}
      <Vents p={[-0.15, 0.86, 0.331]} n={4} w={0.3} gap={0.03} />
      <Vents p={[-0.15, 0.86, -0.331]} rot={[0, Math.PI, 0]} n={4} w={0.3} gap={0.03} />
      <Tag p={[0.22, 0.88, 0.331]} w={0.18} h={0.08} />
      <Tag p={[0.22, 0.88, -0.331]} rot={[0, Math.PI, 0]} w={0.18} h={0.08} />
      {[-0.1, 0.1].map((z) => (
        <group key={z} position={[0.655, 0.8, z]} rotation={[0, 0, Math.PI / 2]}>
          <Cyl a={0.035} b={0.035} h={0.015}>
            <Visor />
          </Cyl>
        </group>
      ))}
      <Box s={[0.006, 0.016, 0.3]} p={[0.652, 0.74, 0]}>
        <Glow k={1.8} />
      </Box>
      {/* GPS-купол, маячок, антенны */}
      <Cyl a={0.1} b={0.11} h={0.04} p={[-0.18, 1.0, 0]}>
        <Graphite />
      </Cyl>
      <mesh position={[-0.18, 1.02, 0]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.095, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Parchment />
      </mesh>
      <Cyl a={0.03} b={0.035} h={0.05} p={[0.25, 1.0, 0]}>
        <Graphite />
      </Cyl>
      <Sph r={0.03} p={[0.25, 1.04, 0]}>
        <Glow k={beacon} c={RED} />
      </Sph>
      {[-1, 1].map((s) => (
        <group key={s} position={[-0.42, 0.98, s * 0.22]} rotation={[s * 0.25, 0, 0.35]}>
          <Cyl a={0.008} b={0.011} h={0.28} p={[0, 0.14, 0]}>
            <Graphite />
          </Cyl>
        </group>
      ))}
      {/* лучи со складным шарниром, соосные моторы и винты */}
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const rear = Math.cos(a) < 0;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <Capsule r={0.045} l={R - 0.35} p={[(R + 0.3) / 2, 0.84, 0]} rot={[0, 0, Math.PI / 2]}>
              <Carbon />
            </Capsule>
            <RBox s={[0.14, 0.12, 0.13]} r={0.03} p={[0.46, 0.84, 0]}>
              <Graphite />
            </RBox>
            <Bolt p={[0.46, 0.84, 0.067]} rot={[Math.PI / 2, 0, 0]} r={0.016} />
            <Box s={[0.02, 0.122, 0.132]} p={[0.46, 0.84, 0]}>
              <Accent />
            </Box>
            <Hose pts={[[0.4, 0.8, 0.04], [0.7, 0.8, 0.05], [R - 0.1, 0.82, 0.04]]} r={0.01} mat="dark" seg={10} />
            <group position={[R, 0, 0]}>
              <Cyl a={0.08} b={0.08} h={0.2} p={[0, 0.84, 0]}>
                <Graphite />
              </Cyl>
              <Ring r={0.082} tube={0.006} p={[0, 0.84, 0]} rot={[Math.PI / 2, 0, 0]}>
                <Glow k={1.6} />
              </Ring>
              {[0.95, 0.73].map((y, k) => (
                <group key={y} position={[0, y, 0]}>
                  <Cyl a={0.07} b={0.07} h={0.06}>
                    <Metal />
                  </Cyl>
                  <group position={[0, k ? -0.04 : 0.04, 0]}>
                    <Prop r={prop} t={t + i * 0.21 + k * 0.4} spin={spin} dir={(k ? 1 : -1) as 1 | -1} />
                  </group>
                </group>
              ))}
              <NavLed p={[0.09, 0.84, 0]} rear={rear} t={t} r={0.022} />
            </group>
            {/* нога шасси под лучом */}
            <group position={[0.42, 0.66, 0]} rotation={[0, 0, -0.18]}>
              <Cyl a={0.022} b={0.026} h={0.62} p={[0, -0.31, 0]}>
                <Graphite />
              </Cyl>
              <Sph r={0.045} p={[0, -0.63, 0]}>
                <Rubber />
              </Sph>
            </group>
          </group>
        );
      })}
      {/* лебёдка под корпусом */}
      <group position={[0, 0.6, 0]}>
        <Box s={[0.34, 0.06, 0.3]}>
          <Graphite />
        </Box>
        <group position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <Cyl a={0.08} b={0.08} h={0.22}>
            <Alu />
          </Cyl>
          {[-1, 1].map((s) => (
            <Cyl key={s} a={0.1} b={0.1} h={0.02} p={[0, s * 0.11, 0]}>
              <Graphite />
            </Cyl>
          ))}
        </group>
      </group>
      {scan?.s.kind === "lidar" ? (
        <group position={[0, 0.62, 0]}>
          <LidarSweep r={4} k={scan.k} t={t} />
        </group>
      ) : null}
    </group>
  );
};

// груз грузового дрона: где коробка, длина троса, держит ли захват
const cargoState = (plan: DronePlan, t: number) => {
  const c = plan.cargo ?? {};
  const s = c.s ?? ([0.7, 0.5, 0.6] as V3);
  const {line0} = DRONE.cargo;
  const winchY = 0.54; // низ барабана над точкой касания
  let attached = c.attached ?? false;
  let boxAt: THREE.Vector3 | null = c.ground ? new THREE.Vector3(...c.ground) : null;
  let boxYaw = 0;
  let line = line0;
  const evs = [...(c.events ?? [])].sort((a, b) => a.at - b.at);
  for (const e of evs) {
    if (t < e.at - REEL) break;
    const ds = droneState(plan, e.at, "cargo");
    const top = ds.pos.y + winchY;
    if (e.kind === "drop") {
      const target = (e.y ?? 0) + s[1]; // верх коробки при касании
      const Ldown = Math.max(line0, top - target - 0.1);
      if (t < e.at) {
        line = line0 + (Ldown - line0) * ramp(t, e.at - REEL, e.at);
        break;
      }
      attached = false;
      boxAt = new THREE.Vector3(ds.pos.x, e.y ?? 0, ds.pos.z);
      boxYaw = ds.yaw;
      line = Ldown + (line0 - Ldown) * ramp(t, e.at + 0.2, e.at + 0.2 + REEL);
      if (t < e.at + 0.2 + REEL) break;
      line = line0;
    } else {
      const target = boxAt ? boxAt.y + s[1] : 0;
      const Ldown = Math.max(line0, top - target - 0.1);
      if (t < e.at) {
        line = line0 + (Ldown - line0) * ramp(t, e.at - REEL, e.at);
        break;
      }
      attached = true;
      line = Ldown + (line0 - Ldown) * ramp(t, e.at + 0.2, e.at + 0.2 + REEL);
      if (t < e.at + 0.2 + REEL) break;
      line = line0;
    }
  }
  return {attached, boxAt, boxYaw, line, s, winchY};
};

export const DroneModel: React.FC<{plan: DronePlan; kind?: DroneKind; t?: number; skin?: string; shadow?: boolean}> = ({plan, kind = "inspect", t: tProp, skin, shadow = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = tProp ?? frame / fps;
  const st = droneState(plan, t, kind);
  const scan = scanState(plan, t);
  const sh = clamp01(1 - st.pos.y / 6);
  const cargo = kind === "cargo" ? cargoState(plan, t) : null;
  // трос висит вертикально от лебёдки; коробка отстаёт от разгона (качается)
  const swing = cargo ? new THREE.Vector3(-st.a.x * 0.025, 0, -st.a.z * 0.025).clampLength(0, 0.25) : null;
  const hookTop = cargo ? st.pos.clone().add(new THREE.Vector3(0, cargo.winchY, 0)) : null;
  const hookEnd = cargo && hookTop && swing ? hookTop.clone().add(new THREE.Vector3(swing.x, -cargo.line, swing.z)) : null;
  return (
    <SkinScope skin={skin}>
      {shadow ? <Shadow w={(kind === "cargo" ? 3.2 : 1.4) * (1 + (1 - sh) * 0.6)} d={(kind === "cargo" ? 3.2 : 1.4) * (1 + (1 - sh) * 0.6)} p={[st.pos.x, 0, st.pos.z]} o={0.12 + 0.4 * sh} /> : null}
      <group position={st.pos} quaternion={st.q}>
        {kind === "cargo" ? <CargoBody t={t} spin={st.spin} scan={scan} /> : <InspectBody t={t} spin={st.spin} scan={scan} />}
      </group>
      {cargo && hookTop && hookEnd ? (
        <>
          {/* трос */}
          <mesh position={hookTop.clone().add(hookEnd).multiplyScalar(0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), hookTop.clone().sub(hookEnd).normalize())}>
            <cylinderGeometry args={[0.008, 0.008, hookTop.distanceTo(hookEnd), 6]} />
            <meshStandardMaterial color="#1C1E21" roughness={0.6} />
          </mesh>
          {/* захват-«крест» */}
          <group position={hookEnd} rotation={[0, st.yaw, 0]}>
            <Cyl a={0.05} b={0.06} h={0.08} p={[0, -0.02, 0]}>
              <Graphite />
            </Cyl>
            <Ring r={0.055} tube={0.006} p={[0, -0.02, 0]} rot={[Math.PI / 2, 0, 0]}>
              <Glow k={cargo.attached ? 2.4 : 0.8} />
            </Ring>
            {[0, 1].map((k) => (
              <Box key={k} s={[cargo.s[0] * 0.8, 0.03, 0.05]} p={[0, -0.07, 0]} r={[0, k * Math.PI / 2, 0]}>
                <Graphite />
              </Box>
            ))}
            {[0, 1, 2, 3].map((k) => (
              <group key={k} rotation={[0, (k * Math.PI) / 2, 0]}>
                <Box s={[0.03, 0.08, 0.04]} p={[cargo.s[0] * 0.4, -0.1 - (cargo.attached ? 0 : 0.02), 0]} r={[0, 0, cargo.attached ? 0 : -0.4]}>
                  <Accent />
                </Box>
              </group>
            ))}
          </group>
          {cargo.attached ? (
            <CargoBox s={cargo.s} p={[hookEnd.x, hookEnd.y - 0.1 - cargo.s[1] / 2, hookEnd.z]} rot={[0, st.yaw, 0]} />
          ) : cargo.boxAt ? (
            <group>
              <Shadow w={cargo.s[0] * 1.6} d={cargo.s[2] * 1.6} p={[cargo.boxAt.x, 0, cargo.boxAt.z]} o={0.6} />
              <CargoBox s={cargo.s} p={[cargo.boxAt.x, cargo.boxAt.y + cargo.s[1] / 2, cargo.boxAt.z]} rot={[0, cargo.boxYaw, 0]} />
            </group>
          ) : null}
        </>
      ) : null}
    </SkinScope>
  );
};

// площадка доставки: графитовый диск с пергаментным кругом, лимонной «H» и огнями по краю
export const DronePad: React.FC<{p?: V3; r?: number; h?: number}> = ({p = [0, 0, 0], r = 1.1, h = 0.12}) => (
  <group position={p}>
    <Shadow w={r * 2.4} d={r * 2.4} o={0.5} />
    <Cyl a={r} b={r * 1.04} h={h} p={[0, h / 2, 0]}>
      <Graphite />
    </Cyl>
    <Cyl a={r * 0.86} b={r * 0.86} h={0.01} p={[0, h + 0.004, 0]}>
      <Parchment />
    </Cyl>
    <Ring r={r * 0.7} tube={0.02} p={[0, h + 0.012, 0]} rot={[Math.PI / 2, 0, 0]}>
      <Accent />
    </Ring>
    {[-1, 1].map((s) => (
      <Box key={s} s={[0.08, 0.012, r * 0.7]} p={[s * r * 0.22, h + 0.014, 0]}>
        <Graphite />
      </Box>
    ))}
    <Box s={[r * 0.44, 0.012, 0.08]} p={[0, h + 0.014, 0]}>
      <Graphite />
    </Box>
    {Array.from({length: 12}, (_, k) => {
      const a = (k * Math.PI) / 6;
      return <Led key={k} p={[Math.cos(a) * r * 0.95, h + 0.01, Math.sin(a) * r * 0.95]} r={0.02} k={2} />;
    })}
  </group>
);
