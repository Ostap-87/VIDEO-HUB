// 3D-арсенал Aura Robotics (решение пользователя 12.10.2026: «чтобы у нас в арсенале были манипуляторы, робособаки,
// AGV и роборуки для дальнейших роликов»). Общий набор для всех моделей:
// - материалы и детали маскота (лак, шарниры, резина, металл, панели со швом) — из ../AuraMascot, палитра сайта Aura;
// - скруглённые корпуса (RBox), капсулы, колёса, светящиеся диоды и кольца, картонная коробка, подставка;
// - ключевые кадры `track` (значение по времени с плавным переходом) и мягкая тень на полу `Shadow`;
// - `Stage` — 3D-сцена (весь кадр или прямоугольник) с камерой и светом как у маскота; модели ставятся в мировых
//   единицах (1 ед. ≈ 0,5 м: маскот ~3,4 ед. ростом), `groundAt` переводит точку кадра (px) в точку на полу сцены.
// Модели: AuraAgv.tsx, AuraArm.tsx, AuraDog.tsx, AuraHand.tsx, витрина — compositions/Aura3DShowcase.tsx.
import React, {useMemo} from "react";
import * as THREE from "three";
import {ThreeCanvas} from "@remotion/three";
import {RoundedBoxGeometry} from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {C, CameraLook, smooth, type V3} from "../AuraMascot";

export {C, Paint, Joint, Rubber, Metal, Seam, Box, Sph, Cyl, Plate, CameraLook, env, lerp, smooth} from "../AuraMascot";
export type {V3} from "../AuraMascot";

export const KRAFT = "#BE9A62"; // картон коробок (единственный цвет вне палитры сайта — коробка должна читаться коробкой)

// --- ключевые кадры ---
// track(t, [[0, 0], [1.5, 2], [3, 2]]) — значение в момент t, между ключами — плавно (smoothstep), за краями — крайние
export const track = (t: number, keys: [number, number][], ease: (p: number) => number = smooth): number => {
  if (!keys.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const p = t1 > t0 ? ease((t - t0) / (t1 - t0)) : 1;
      return v0 + (v1 - v0) * p;
    }
  }
  return keys[keys.length - 1][1];
};
export const clamp01 = (p: number) => Math.min(1, Math.max(0, p));
// 0 → 1 на отрезке [a, b] с плавным входом и выходом
export const ramp = (t: number, a: number, b: number) => smooth(clamp01((t - a) / Math.max(1e-6, b - a)));
// «окно»: 0 → 1 за fade с, держится, 1 → 0 за fade с в конце
export const win = (t: number, a: number, b: number, fade = 0.4) => Math.min(ramp(t, a, a + fade), 1 - ramp(t, b - fade, b));

// --- детали ---
export const RBox: React.FC<{s: V3; r?: number; p?: V3; rot?: V3; children: React.ReactNode}> = ({s, r = 0.05, p = [0, 0, 0], rot, children}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(s[0], s[1], s[2], 3, Math.min(r, Math.min(...s) / 2 - 1e-3)), [s[0], s[1], s[2], r]);
  return (
    <mesh geometry={geo} position={p} rotation={rot}>
      {children}
    </mesh>
  );
};
export const Capsule: React.FC<{r: number; l: number; p?: V3; rot?: V3; children: React.ReactNode}> = ({r, l, p = [0, 0, 0], rot, children}) => (
  <mesh position={p} rotation={rot}>
    <capsuleGeometry args={[r, l, 6, 14]} />
    {children}
  </mesh>
);
export const Ring: React.FC<{r: number; tube: number; p?: V3; rot?: V3; children: React.ReactNode}> = ({r, tube, p = [0, 0, 0], rot, children}) => (
  <mesh position={p} rotation={rot}>
    <torusGeometry args={[r, tube, 10, 32]} />
    {children}
  </mesh>
);
export const Glow: React.FC<{k?: number}> = ({k = 2.4}) => <meshStandardMaterial color={C.glow} emissive={C.glow} emissiveIntensity={k} />;
export const Visor = () => <meshPhysicalMaterial color="#05070A" metalness={0.4} roughness={0.05} clearcoat={1} clearcoatRoughness={0.02} />;
export const Alu = () => <meshStandardMaterial color="#C9CFD4" metalness={0.8} roughness={0.32} />;
export const Graphite: React.FC<{cc?: number}> = ({cc = 0.85}) => (
  <meshPhysicalMaterial color={C.dark} metalness={0.1} roughness={0.3} clearcoat={cc} clearcoatRoughness={0.06} />
);
export const Parchment: React.FC = () => <meshPhysicalMaterial color={C.light} metalness={0.1} roughness={0.3} clearcoat={1} clearcoatRoughness={0.06} />;

// картонная коробка: картон, графитовый скотч крест-накрест, лимонная наклейка на боку
export const CargoBox: React.FC<{s?: V3; p?: V3; rot?: V3}> = ({s = [0.6, 0.45, 0.5], p = [0, 0, 0], rot}) => (
  <group position={p} rotation={rot}>
    <RBox s={s} r={0.02}>
      <meshStandardMaterial color={KRAFT} roughness={0.85} />
    </RBox>
    <mesh position={[0, s[1] / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[s[0] * 1.002, s[2] * 0.22]} />
      <meshStandardMaterial color={C.dark} roughness={0.6} />
    </mesh>
    <mesh position={[0, 0, s[2] / 2 + 0.002]}>
      <planeGeometry args={[s[0] * 1.002, s[1] * 0.16]} />
      <meshStandardMaterial color={C.dark} roughness={0.6} />
    </mesh>
    <mesh position={[s[0] * 0.24, -s[1] * 0.18, s[2] / 2 + 0.004]}>
      <planeGeometry args={[s[0] * 0.3, s[1] * 0.26]} />
      <meshStandardMaterial color={C.accent} roughness={0.5} />
    </mesh>
  </group>
);

// подставка-стол: графитовые ножки, пергаментная столешница с лимонной кромкой
export const Pedestal: React.FC<{p?: V3; s?: V3}> = ({p = [0, 0, 0], s = [0.9, 0.6, 0.8]}) => (
  <group position={p}>
    <RBox s={[s[0], 0.06, s[2]]} r={0.02} p={[0, s[1] - 0.03, 0]}>
      <Parchment />
    </RBox>
    <mesh position={[0, s[1] - 0.075, s[2] / 2 - 0.01]}>
      <boxGeometry args={[s[0] * 0.98, 0.03, 0.02]} />
      <meshStandardMaterial color={C.accent} roughness={0.5} />
    </mesh>
    {[-1, 1].flatMap((a) =>
      [-1, 1].map((b) => (
        <mesh key={`${a}${b}`} position={[a * (s[0] / 2 - 0.06), (s[1] - 0.06) / 2, b * (s[2] / 2 - 0.06)]}>
          <boxGeometry args={[0.06, s[1] - 0.06, 0.06]} />
          <Graphite />
        </mesh>
      )),
    )}
  </group>
);

// мягкая тень на полу (радиальный градиент), лежит на y = 0
let shadowTex: THREE.Texture | null = null;
const getShadowTex = () => {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.5)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.22)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
};
export const Shadow: React.FC<{w: number; d: number; p?: V3; o?: number; yaw?: number}> = ({w, d, p = [0, 0, 0], o = 1, yaw = 0}) => (
  <mesh position={[p[0], 0.003, p[2]]} rotation={[-Math.PI / 2, 0, yaw]} renderOrder={-1}>
    <planeGeometry args={[w, d]} />
    <meshBasicMaterial map={getShadowTex()} transparent opacity={o} depthWrite={false} />
  </mesh>
);

// --- сцена ---
export type Cam = {pos: V3; target: V3; fov?: number};
export const CAM_DEFAULT: Cam = {pos: [4.2, 3.4, 8.5], target: [0, 1, 0], fov: 30};

export const Lights: React.FC = () => (
  <>
    <hemisphereLight args={["#C8D8E8", "#20262C", 0.35]} />
    <directionalLight position={[4, 7, 5]} intensity={1.6} />
    <directionalLight position={[-3, 3.5, -4.5]} intensity={1.0} color={C.accent} />
  </>
);

// 3D-сцена: прямоугольник кадра (по умолчанию весь кадр 1080×1920), камера, свет и студийное окружение маскота
export const Stage: React.FC<{cam?: Cam; left?: number; top?: number; width?: number; height?: number; dpr?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
  cam = CAM_DEFAULT,
  left = 0,
  top = 0,
  width = 1080,
  height = 1920,
  dpr = 1,
  style,
  children,
}) => (
  <div style={{position: "absolute", left, top, width, height, pointerEvents: "none", ...style}}>
    <ThreeCanvas
      width={width}
      height={height}
      dpr={dpr}
      gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}}
      camera={{fov: cam.fov ?? 30, position: cam.pos, near: 0.05, far: 200}}
      style={{position: "absolute", inset: 0}}
    >
      <CameraLook target={cam.target} />
      <Lights />
      {children}
    </ThreeCanvas>
  </div>
);

// точка кадра (px внутри сцены) → точка на полу сцены (y = 0): чтобы ставить модели «сюда, под слайд»
export const groundAt = (px: number, py: number, cam: Cam = CAM_DEFAULT, width = 1080, height = 1920): V3 => {
  const camera = new THREE.PerspectiveCamera(cam.fov ?? 30, width / height, 0.05, 200);
  camera.position.set(...cam.pos);
  camera.lookAt(...cam.target);
  camera.updateMatrixWorld();
  const ndc = new THREE.Vector3((px / width) * 2 - 1, -(py / height) * 2 + 1, 0.5).unproject(camera);
  const dir = ndc.sub(camera.position).normalize();
  const k = -camera.position.y / dir.y;
  return [camera.position.x + dir.x * k, 0, camera.position.z + dir.z * k];
};

// путь по точкам: где модель в момент t (x, z, курс) и сколько прошла — для ходьбы, колёс и разворотов.
// stays: к моменту at стоять в (x, z) с курсом yaw (рад; 0 — передом по +x, π/2 — к зрителю при камере спереди);
// между точками — разворот по ходу (turn с), путь со скоростью speed (ед./с), разворот в конечный курс.
export type Stay = {at: number; x: number; z?: number; yaw?: number};
export type PathState = {x: number; z: number; yaw: number; dist: number; speed: number; moving: boolean};
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export const pathAt = (stays: Stay[], t: number, speed = 1.2, turn = 0.5, reverseOK = false): PathState => {
  let x = stays[0].x;
  let z = stays[0].z ?? 0;
  let yaw = stays[0].yaw ?? 0;
  let dist = 0;
  for (let i = 1; i < stays.length; i++) {
    const A = {x, z, yaw};
    const B = stays[i];
    const bz = B.z ?? A.z;
    const dx = B.x - A.x;
    const dz = bz - A.z;
    const len = Math.hypot(dx, dz);
    let head = len > 1e-4 ? Math.atan2(-dz, dx) : A.yaw;
    let dir = 1;
    if (reverseOK && len > 1e-4 && Math.abs(angDiff(A.yaw, head)) > Math.PI / 2 + 0.2) {
      head += Math.PI; // назад, без разворота на месте (AGV)
      dir = -1;
    }
    const by = B.yaw ?? head;
    const t1 = len > 1e-4 && Math.abs(angDiff(A.yaw, head)) > 0.05 ? turn : 0;
    const t3 = Math.abs(angDiff(head, by)) > 0.05 ? turn : 0;
    const t2 = len / speed;
    const start = B.at - (t1 + t2 + t3);
    if (t <= start) return {x: A.x, z: A.z, yaw: A.yaw, dist, speed: 0, moving: false};
    if (t < B.at) {
      const u = t - start;
      if (u < t1) return {x: A.x, z: A.z, yaw: A.yaw + angDiff(A.yaw, head) * smooth(u / t1), dist, speed: 0, moving: true};
      if (u < t1 + t2) {
        // разгон и торможение: путь по smoothstep, скорость — его производная
        const q = (u - t1) / t2;
        const s = smooth(q);
        const v = (6 * q * (1 - q) * len) / t2;
        return {x: A.x + dx * s, z: A.z + dz * s, yaw: head, dist: dist + dir * len * s, speed: dir * v, moving: true};
      }
      const w = (u - t1 - t2) / Math.max(1e-6, t3);
      return {x: B.x, z: bz, yaw: head + angDiff(head, by) * smooth(w), dist: dist + dir * len, speed: 0, moving: true};
    }
    x = B.x;
    z = bz;
    yaw = by;
    dist += dir * len;
  }
  return {x, z, yaw, dist, speed: 0, moving: false};
};
