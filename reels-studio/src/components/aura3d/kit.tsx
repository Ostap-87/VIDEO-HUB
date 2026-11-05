// 3D-арсенал Aura Robotics (решение пользователя 12.10.2026: «чтобы у нас в арсенале были манипуляторы, робособаки,
// AGV и роборуки для дальнейших роликов»). Общий набор для всех моделей:
// - материалы и детали маскота (лак, шарниры, резина, металл, панели со швом) — из ../AuraMascot, палитра сайта Aura;
// - скруглённые корпуса (RBox), капсулы, колёса, светящиеся диоды и кольца, картонная коробка, подставка;
// - ключевые кадры `track` (значение по времени с плавным переходом) и мягкая тень на полу `Shadow`;
// - `Stage` — 3D-сцена (весь кадр или прямоугольник) с камерой и светом как у маскота; модели ставятся в мировых
//   единицах (1 ед. ≈ 0,5 м: маскот ~3,4 ед. ростом), `groundAt` переводит точку кадра (px) в точку на полу сцены.
// - скины (05.11.2026, «манипуляторы и роборуки другого цвета и другого дизайна»): `SkinScope skin="navy"` меняет цвета
//   материалов Parchment / Graphite / Accent / Glow у всего, что внутри; по умолчанию — палитра Aura (как было);
// - детали (05.11.2026, «максимально детально»): болты `Bolt` / `BoltRing`, шланги и кабели `Hose`, гофра `Bellows`,
//   таблички-шильдики `Tag` (только простые фигуры, без чужих логотипов и надписей), прорези `Vents`, диоды `Led`.
// Модели: AuraAgv.tsx, AuraArm.tsx, AuraDog.tsx, AuraHand.tsx, AuraHumanoid.tsx, AuraWheelHumanoid.tsx, AuraDrone.tsx,
// конвейер и поддон — Conveyor.tsx, сцены применения — Scenes.tsx; витрина — compositions/Aura3DShowcase.tsx, портреты — AuraCast.tsx.
import React, {useContext, useEffect, useMemo} from "react";
import * as THREE from "three";
import {ThreeCanvas} from "@remotion/three";
import {RoundedBoxGeometry} from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {useThree} from "@react-three/fiber";
import {C, CameraLook, Cyl, Rubber, Metal, Seam, smooth, type V3} from "../AuraMascot";

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
// --- скины ---
// body — основные панели (пергамент у Aura), dark — каркас и шарниры (графит), accent — полосы и метки (лимонный),
// glow — светящиеся кольца и диоды, eye — глаза (по умолчанию glow); *Metal / *Rough / *Cc — металличность, шероховатость, лак
export type Skin = {
  id: string;
  body: string;
  bodyMetal?: number;
  bodyRough?: number;
  bodyCc?: number;
  dark: string;
  darkMetal?: number;
  darkRough?: number;
  darkCc?: number;
  accent: string;
  accentGlow?: number;
  glow: string;
  glowK?: number;
  eye?: string;
  stop?: string;
  hand?: string; // скин кистей (имя из SKINS)
};
export const SKINS = {
  // Aura — как сайт: пергамент, графит, лимонный
  aura: {id: "aura", body: C.light, dark: C.dark, accent: C.accent, glow: C.glow},
  // промышленный белый (референс manipulyator.png): белая эмаль, графитовые моторы, без лимонного
  industrial: {id: "industrial", body: "#EEEEEA", bodyRough: 0.38, bodyCc: 0.55, dark: "#23262A", darkMetal: 0.3, darkRough: 0.42, darkCc: 0.3, accent: "#23262A", glow: "#9FB3C8", glowK: 0.5, stop: "#E5383B"},
  // кобот: белый с синими акцентами и синими световыми кольцами
  cobot: {id: "cobot", body: "#F5F7F9", bodyRough: 0.26, dark: "#3B414A", darkMetal: 0.2, darkRough: 0.35, accent: "#2B6CB0", glow: "#3D8BFF", glowK: 1.1},
  // хром (референс roboruka.png): чёрные глянцевые фаланги, хромированные накладки, красные кольца
  chrome: {id: "chrome", body: "#DDE2E8", bodyMetal: 1, bodyRough: 0.13, bodyCc: 1, dark: "#0D0F12", darkMetal: 0.55, darkRough: 0.14, darkCc: 1, accent: "#E5383B", glow: "#E5383B", glowK: 1.2},
  // оранжевый AGV (референс agv.webp): оранжевый корпус, чёрные пояс и бампер, тёплые белые диоды
  orange: {id: "orange", body: "#F26B1D", bodyRough: 0.34, bodyCc: 0.7, dark: "#1C1D20", accent: "#17181A", glow: "#FFE3B8", glowK: 0.9, stop: "#E5383B"},
  // тёмно-синий гуманоид (референс gumanoid.webp): белые панели, тёмно-синие вставки, красные акценты
  navy: {id: "navy", body: "#F4F5F7", bodyRough: 0.28, dark: "#1F2A5A", darkMetal: 0.12, darkRough: 0.3, accent: "#E5383B", glow: "#E5383B", glowK: 0.9, eye: "#EAF4FF", hand: "navyHand"},
  navyHand: {id: "navyHand", body: "#E9EBEE", dark: "#4A4F57", darkMetal: 0.2, darkRough: 0.4, accent: "#E5383B", glow: "#E5383B", glowK: 0.8},
  // белый с оранжевым (второй скин дронов): белый пластик, графит, оранжевые метки и диоды
  whiteOrange: {id: "whiteOrange", body: "#F2F2EF", bodyRough: 0.3, dark: "#2A2C30", darkMetal: 0.2, accent: "#F26B1D", glow: "#FF8A3D", glowK: 1.1},
} satisfies Record<string, Skin>;
export type SkinId = keyof typeof SKINS;
export const skinOf = (k?: SkinId | Skin | string): Skin => (k === undefined ? SKINS.aura : typeof k === "string" ? (SKINS as Record<string, Skin>)[k] ?? SKINS.aura : k);
const SkinCtx = React.createContext<Skin>(SKINS.aura);
export const useSkin = () => useContext(SkinCtx);
// всё внутри — в цветах скина (по умолчанию Aura); skin — имя из SKINS или свой объект
export const SkinScope: React.FC<{skin?: SkinId | Skin | string; children: React.ReactNode}> = ({skin, children}) => {
  const parent = useSkin();
  const value = skin === undefined ? parent : skinOf(skin);
  return <SkinCtx.Provider value={value}>{children}</SkinCtx.Provider>;
};

export const Glow: React.FC<{k?: number; c?: string}> = ({k = 2.4, c}) => {
  const s = useSkin();
  const col = c ?? s.glow;
  return <meshStandardMaterial color={col} emissive={col} emissiveIntensity={k * (s.glowK ?? 1)} />;
};
// глаза-диоды: цвет глаз скина
export const EyeGlow: React.FC<{k?: number}> = ({k = 2.4}) => {
  const s = useSkin();
  const col = s.eye ?? s.glow;
  return <meshStandardMaterial color={col} emissive={col} emissiveIntensity={k * (s.eye ? 0.8 : s.glowK ?? 1)} />;
};
export const Visor = () => <meshPhysicalMaterial color="#05070A" metalness={0.4} roughness={0.05} clearcoat={1} clearcoatRoughness={0.02} />;
export const Alu = () => <meshStandardMaterial color="#C9CFD4" metalness={0.8} roughness={0.32} />;
export const Chrome = () => <meshStandardMaterial color="#E6EAEE" metalness={1} roughness={0.1} />;
export const Carbon = () => <meshPhysicalMaterial color="#1B1D20" metalness={0.25} roughness={0.42} clearcoat={0.7} clearcoatRoughness={0.25} />;
export const Graphite: React.FC<{cc?: number}> = ({cc = 0.85}) => {
  const s = useSkin();
  return <meshPhysicalMaterial color={s.dark} metalness={s.darkMetal ?? 0.1} roughness={s.darkRough ?? 0.3} clearcoat={s.darkCc ?? cc} clearcoatRoughness={0.06} />;
};
export const Parchment: React.FC = () => {
  const s = useSkin();
  return <meshPhysicalMaterial color={s.body} metalness={s.bodyMetal ?? 0.1} roughness={s.bodyRough ?? 0.3} clearcoat={s.bodyCc ?? 1} clearcoatRoughness={0.06} />;
};
// акцент скина (лимонный у Aura): полосы, метки, кольца
export const Accent: React.FC<{cc?: number}> = ({cc = 0.9}) => {
  const s = useSkin();
  return <meshPhysicalMaterial color={s.accent} metalness={0.1} roughness={0.38} clearcoat={cc} clearcoatRoughness={0.08} emissive={s.accent} emissiveIntensity={s.accentGlow ?? 0} />;
};

// --- детали ---
// болт с шестигранной головкой; ось болта — +y (поверните rot, чтобы он смотрел из нужной грани)
export const Bolt: React.FC<{p?: V3; rot?: V3; r?: number}> = ({p = [0, 0, 0], rot, r = 0.018}) => (
  <group position={p} rotation={rot}>
    <mesh position={[0, r * 0.3, 0]}>
      <cylinderGeometry args={[r, r, r * 0.6, 6]} />
      <meshStandardMaterial color="#8E979F" metalness={0.95} roughness={0.28} />
    </mesh>
    <mesh position={[0, r * 0.62, 0]}>
      <cylinderGeometry args={[r * 0.45, r * 0.45, 0.004, 6]} />
      <meshStandardMaterial color="#2B3036" metalness={0.6} roughness={0.5} />
    </mesh>
  </group>
);
// болты по кругу радиуса R в плоскости XZ (головками вверх, +y); rot — повернуть кольцо целиком
export const BoltRing: React.FC<{n: number; R: number; p?: V3; rot?: V3; r?: number; phase?: number}> = ({n, R, p = [0, 0, 0], rot, r = 0.018, phase = 0}) => (
  <group position={p} rotation={rot}>
    {Array.from({length: n}, (_, k) => {
      const a = phase + (k * 2 * Math.PI) / n;
      return <Bolt key={k} p={[Math.cos(a) * R, 0, Math.sin(a) * R]} r={r} />;
    })}
  </group>
);
// шланг / кабель по точкам (плавная кривая); mat — резина (по умолчанию), графит скина, акцент, металл
export const Hose: React.FC<{pts: V3[]; r?: number; mat?: "rubber" | "dark" | "accent" | "metal" | "glow"; seg?: number}> = ({pts, r = 0.02, mat = "rubber", seg = 28}) => {
  const key = pts.map((q) => q.map((v) => v.toFixed(3)).join(",")).join(";");
  const geo = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), seg, r, 8, false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, r, seg],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      {mat === "rubber" ? <Rubber /> : mat === "dark" ? <Graphite /> : mat === "accent" ? <Accent /> : mat === "metal" ? <Metal /> : <Glow k={1.6} />}
    </mesh>
  );
};
// гофра (чехол пружины, кабель-канал): кольца вдоль отрезка от a до b
export const Bellows: React.FC<{a: V3; b: V3; r?: number; n?: number}> = ({a, b, r = 0.06, n = 12}) => {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <group position={a} rotation={e}>
      <Cyl a={r * 0.62} b={r * 0.62} h={len} p={[0, len / 2, 0]}>
        <Seam />
      </Cyl>
      {Array.from({length: n}, (_, k) => (
        <Ring key={k} r={r * 0.78} tube={r * 0.3} p={[0, (len * (k + 0.5)) / n, 0]} rot={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#17191C" roughness={0.75} />
        </Ring>
      ))}
    </group>
  );
};
// шильдик: светлая табличка с тёмной рамкой, строки-«штрихи» и квадрат акцента (простые фигуры, без текста); лицом к +z
export const Tag: React.FC<{p: V3; rot?: V3; w?: number; h?: number; dark?: boolean}> = ({p, rot, w = 0.16, h = 0.08, dark}) => (
  <group position={p} rotation={rot}>
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color={dark ? "#1E2124" : "#F2F0EC"} roughness={0.5} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
    <mesh position={[-w * 0.36, 0, 0.001]}>
      <planeGeometry args={[h * 0.55, h * 0.55]} />
      <Accent />
    </mesh>
    {[0.22, 0, -0.22].map((y, k) => (
      <mesh key={k} position={[w * 0.1, y * h, 0.001]}>
        <planeGeometry args={[w * (k === 0 ? 0.55 : 0.42), h * 0.1]} />
        <meshStandardMaterial color={dark ? "#9AA1A8" : "#5D6166"} roughness={0.6} />
      </mesh>
    ))}
  </group>
);
// прорези вентиляции: n щелей по вертикали, лицом к +z
export const Vents: React.FC<{p: V3; rot?: V3; n?: number; w?: number; gap?: number}> = ({p, rot, n = 4, w = 0.14, gap = 0.028}) => (
  <group position={p} rotation={rot}>
    {Array.from({length: n}, (_, k) => (
      <RBox key={k} s={[w, gap * 0.45, 0.012]} r={0.004} p={[0, (k - (n - 1) / 2) * gap, 0]}>
        <Seam />
      </RBox>
    ))}
  </group>
);
// диод: светящаяся точка в тёмном ободке; c — свой цвет (иначе glow скина)
export const Led: React.FC<{p: V3; r?: number; k?: number; c?: string}> = ({p, r = 0.014, k = 2.4, c}) => (
  <group position={p}>
    <mesh>
      <sphereGeometry args={[r * 1.35, 10, 8]} />
      <meshStandardMaterial color="#121418" roughness={0.6} />
    </mesh>
    <mesh position={[0, 0, r * 0.5]}>
      <sphereGeometry args={[r, 10, 8]} />
      <Glow k={k} c={c} />
    </mesh>
  </group>
);

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

// мягкий градиент для конусов света: ярко у источника, к краю — в ноль (alphaMap по длине конуса)
let beamTex: THREE.Texture | null = null;
const getBeamTex = () => {
  if (beamTex) return beamTex;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.35, "#7a7a7a");
  grad.addColorStop(1, "#000000");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  beamTex = new THREE.CanvasTexture(c);
  return beamTex;
};
// конус света вдоль +x из начала координат: длина len, раскрытие angle (рад), яркость o
export const LightCone: React.FC<{len: number; angle: number; o?: number; color?: string}> = ({len, angle, o = 0.22, color = "#FFF4C8"}) => (
  <group rotation={[0, 0, Math.PI / 2]} position={[len / 2, 0, 0]}>
    <mesh>
      <coneGeometry args={[Math.tan(angle) * len, len, 40, 1, true]} />
      <meshBasicMaterial color={color} alphaMap={getBeamTex()} transparent opacity={o} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <mesh>
      <coneGeometry args={[Math.tan(angle * 0.55) * len, len, 32, 1, true]} />
      <meshBasicMaterial color={color} alphaMap={getBeamTex()} transparent opacity={o * 0.9} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  </group>
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
// камера по props на каждом кадре (у холста камера задаётся только при создании: без этого кадры подряд в одной вкладке
// брали камеру первого кадра, а движение камеры не работало)
const CamSync: React.FC<{cam: Cam}> = ({cam}) => {
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  React.useLayoutEffect(() => {
    camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
    camera.fov = cam.fov ?? 30;
    camera.lookAt(cam.target[0], cam.target[1], cam.target[2]);
    camera.updateProjectionMatrix();
  }, [camera, cam.pos[0], cam.pos[1], cam.pos[2], cam.target[0], cam.target[1], cam.target[2], cam.fov]);
  return null;
};
// окружение тише или ярче (1 — как у маскота); в тёмных сценах DarkScan — почти без отражений
const EnvK: React.FC<{k: number}> = ({k}) => {
  const scene = useThree((st) => st.scene);
  React.useLayoutEffect(() => {
    scene.environmentIntensity = k;
  }, [scene, k]);
  return null;
};
// mood: "studio" — студийный свет маскота (по умолчанию), "dark" — без общего света (сцена ставит свои фонари), env — яркость отражений
export const Stage: React.FC<{
  cam?: Cam;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  dpr?: number;
  style?: React.CSSProperties;
  mood?: "studio" | "dark";
  env?: number;
  children: React.ReactNode;
}> = ({cam = CAM_DEFAULT, left = 0, top = 0, width = 1080, height = 1920, dpr = 1, style, mood = "studio", env, children}) => (
  <div style={{position: "absolute", left, top, width, height, pointerEvents: "none", ...style}}>
    <ThreeCanvas
      width={width}
      height={height}
      dpr={dpr}
      gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}}
      camera={{fov: cam.fov ?? 30, position: cam.pos, near: 0.05, far: 200}}
      style={{position: "absolute", inset: 0}}
    >
      <CamSync cam={cam} />
      <CameraLook target={cam.target} />
      <EnvK k={env ?? (mood === "dark" ? 0.06 : 1)} />
      {mood === "studio" ? <Lights /> : null}
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
