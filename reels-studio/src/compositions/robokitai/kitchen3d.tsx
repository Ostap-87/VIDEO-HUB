// «Робокитай», серия 8 · Гуандун (06.11.2026) — линия для пельменей (цзяоцзы) «Кухонного края»: тестораскатка с валками
// и лентой теста, бункер с фаршем, формующий барабан, лента с пельменями, спиральный скороморозильный аппарат (прозрачный
// кожух, спираль ленты, иней, голубой свет), весы и пакеты; Арми (`ArmModel`) укладывает пакеты в короб, Кэрри
// (`WheelHumanoidModel skin="navy"`) привозит тесто по рецепту клиента. Нержавейка, белое тесто, розовый фарш.
// Миры (`KitchenWorld`):
// - lump — холодное открытие: на лотке пачка, где все пельмени слиплись в один большой ком;
// - jiaoziFast — экструзия: лента бежит быстро, пельмени гладкие, одинаковые («промышленные»);
// - jiaoziJam — заморозка не успевает: перед аппаратом растёт куча, кольцо краснеет;
// - jiaoziScan — Скаут идёт вдоль ленты и сканирует: годные — лимонная метка, с вылезшим фаршем — красная;
// - jiaoziFixed — «как руками» (складочки), аппарат с запасом, Кэрри привозит тесто, Арми упаковывает.
import React from "react";
import {BoxGeometry} from "three";
import {ArmModel, HOME, type ArmKey} from "../../components/aura3d/AuraArm";
import {DogModel} from "../../components/aura3d/AuraDog";
import {WheelHumanoidModel, type WheelPlan} from "../../components/aura3d/AuraWheelHumanoid";
import {CargoBox, Shadow, type Cam, type V3} from "../../components/aura3d/kit";
import {LidarSweep, MockFloor} from "./scene3d";

export type KitchenId = "lump" | "jiaoziFast" | "jiaoziJam" | "jiaoziScan" | "jiaoziFixed";
const LEMON = "#FFF65D";
const RED = "#E5383B";
const INK = "#262626";
const STEEL = "#AEB6BE";
const DOUGH = "#F6EEDC";
const MEAT = "#D98C8C";
const BELT_Y = 1.6;
const sm = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const Steel: React.FC = () => <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.35} />;

// пельмень: полукупол теста; pleat — складочки «как руками»; leak — фарш вылез из шва
export const Dumpling: React.FC<{p: V3; yaw?: number; pleat?: boolean; leak?: boolean; s?: number; frost?: number}> = ({p, yaw = 0, pleat, leak, s = 1, frost = 0}) => (
  <group position={p} rotation={[0, yaw, 0]} scale={s}>
    <mesh scale={[0.2, 0.12, 0.13]}>
      <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={frost > 0.5 ? "#EEF4F8" : DOUGH} roughness={0.75} />
    </mesh>
    {pleat
      ? [-0.1, -0.03, 0.04, 0.11].map((x) => (
          <mesh key={x} position={[x, 0.11 - Math.abs(x) * 0.25, 0]} rotation={[0, 0, x * 2]}>
            <boxGeometry args={[0.025, 0.05, 0.05]} />
            <meshStandardMaterial color="#EADFC6" roughness={0.8} />
          </mesh>
        ))
      : null}
    {leak ? (
      <mesh position={[0.15, 0.04, 0.05]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshStandardMaterial color={MEAT} roughness={0.6} />
      </mesh>
    ) : null}
  </group>
);

// ===== линия =====
const LINE_X0 = -5.0;
const HOPPER_X = -2.7;
const FORM_X = -1.3;
const FREEZER: V3 = [3.2, 0, -0.2];
const Line: React.FC<{t: number; speed: number; pleat?: boolean; drum?: number; freezerR?: number; spin?: number}> = ({t, speed, pleat, drum = 1, freezerR = 1.35, spin = 0.5}) => (
  <>
    {/* станина ленты и лента */}
    <mesh position={[(LINE_X0 + FREEZER[0] - 1.4) / 2, BELT_Y - 0.12, 0]}>
      <boxGeometry args={[FREEZER[0] - 1.4 - LINE_X0, 0.16, 1.2]} />
      <meshStandardMaterial color="#2B2E33" roughness={0.6} />
    </mesh>
    {Array.from({length: 22}, (_, i) => {
      const len = FREEZER[0] - 1.4 - LINE_X0;
      const x = LINE_X0 + (((i * len) / 22 + t * speed) % len);
      return (
        <mesh key={i} position={[x, BELT_Y - 0.035, 0]}>
          <boxGeometry args={[0.05, 0.01, 1.2]} />
          <meshStandardMaterial color="#55595F" />
        </mesh>
      );
    })}
    {[LINE_X0 + 0.3, HOPPER_X, FORM_X, 0.8].map((x) => (
      <group key={x}>
        {[-0.5, 0.5].map((z) => (
          <mesh key={z} position={[x, (BELT_Y - 0.2) / 2, z]}>
            <boxGeometry args={[0.1, BELT_Y - 0.2, 0.1]} />
            <Steel />
          </mesh>
        ))}
      </group>
    ))}
    {/* тестораскатка: корпус, два валка, лента теста */}
    <group position={[LINE_X0 + 0.9, 0, 0]}>
      <mesh position={[0, BELT_Y + 0.5, 0]}>
        <boxGeometry args={[1.0, 0.9, 1.5]} />
        <Steel />
      </mesh>
      {[0.12, 0.42].map((y, k) => (
        <mesh key={y} position={[0.55, BELT_Y + y, 0]} rotation={[Math.PI / 2, t * 6 * (k ? -1 : 1), 0]}>
          <cylinderGeometry args={[0.15, 0.15, 1.3, 20]} />
          <meshStandardMaterial color="#E8ECEF" metalness={0.9} roughness={0.15} />
        </mesh>
      ))}
    </group>
    <mesh position={[(LINE_X0 + 1.4 + FORM_X) / 2, BELT_Y + 0.01, 0]}>
      <boxGeometry args={[FORM_X - LINE_X0 - 1.4, 0.03, 0.9]} />
      <meshStandardMaterial color={DOUGH} roughness={0.8} />
    </mesh>
    {/* бункер с фаршем */}
    <group position={[HOPPER_X, BELT_Y + 1.8, 0]}>
      <mesh>
        <cylinderGeometry args={[0.8, 0.25, 1.2, 24, 1, true]} />
        <meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.28} side={2} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.1, 24]} />
        <meshStandardMaterial color={MEAT} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.95, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.7, 12]} />
        <Steel />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.7, -0.9, 0]}>
          <boxGeometry args={[0.08, 1.8, 0.08]} />
          <Steel />
        </mesh>
      ))}
    </group>
    {/* формующий узел с барабаном */}
    <group position={[FORM_X, BELT_Y, 0]}>
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[1.3, 1.2, 1.5]} />
        <Steel />
      </mesh>
      <mesh position={[0.7, 0.35, 0]} rotation={[Math.PI / 2, -t * 5 * drum, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 1.1, 12]} />
        <meshStandardMaterial color="#9AA0A6" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.42, 0.76]}>
        <boxGeometry args={[0.5, 0.3, 0.02]} />
        <meshStandardMaterial color="#121214" emissive={pleat ? LEMON : "#9CC8F0"} emissiveIntensity={0.7} />
      </mesh>
    </group>
    {/* спиральный скороморозильный аппарат: прозрачный кожух, спираль ленты, иней */}
    <group position={FREEZER}>
      <mesh position={[0, 2.3, 0]}>
        <cylinderGeometry args={[freezerR, freezerR, 4.6, 32, 1, true]} />
        <meshStandardMaterial color="#8FC8EC" transparent opacity={0.42} roughness={0.2} side={2} />
      </mesh>
      {[0.06, 4.65].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[freezerR + 0.08, freezerR + 0.08, 0.16, 32]} />
          <meshStandardMaterial color="#3A4652" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      {[0.8, 2.37, 3.94, 5.5].map((a) => (
        <mesh key={a} position={[Math.cos(a) * (freezerR + 0.06), 2.35, Math.sin(a) * (freezerR + 0.06)]}>
          <boxGeometry args={[0.1, 4.6, 0.1]} />
          <meshStandardMaterial color="#3A4652" />
        </mesh>
      ))}
      {Array.from({length: 30}, (_, i) => {
        const a = i * 0.62 + t * spin;
        const y = 0.8 + i * 0.12;
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * (freezerR - 0.45), y, Math.sin(a) * (freezerR - 0.45)]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.5, 0.03, 0.62]} />
              <meshStandardMaterial color="#4E5E6B" metalness={0.5} roughness={0.4} />
            </mesh>
            {i % 2 ? <Dumpling p={[Math.cos(a) * (freezerR - 0.45), y + 0.02, Math.sin(a) * (freezerR - 0.45)]} yaw={-a} pleat={pleat} frost={i / 30} s={0.9} /> : null}
          </group>
        );
      })}
      <pointLight position={[0, 2.6, 0]} intensity={2.4} distance={5} color="#9FD4FF" />
      {Array.from({length: 18}, (_, i) => (
        <mesh key={`f${i}`} position={[Math.cos(i * 1.7 + t * 0.3) * (freezerR + 0.15), (rnd(i, 2) * 4.4 + t * 0.25) % 4.4, Math.sin(i * 1.7 + t * 0.3) * (freezerR + 0.15)]}>
          <sphereGeometry args={[0.04, 6, 4]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
        </mesh>
      ))}
      <Shadow w={freezerR * 2.6} d={freezerR * 2.6} o={0.5} />
    </group>
  </>
);
// пельмени на ленте от формовки до аппарата; jam — сколько их копится перед аппаратом (0…1)
const BeltDumplings: React.FC<{t: number; speed: number; pleat?: boolean; leakEvery?: number; tick?: (x: number) => 0 | 1 | 2}> = ({t, speed, pleat, leakEvery, tick}) => {
  const x0 = FORM_X + 0.9;
  const x1 = FREEZER[0] - 1.5;
  const len = x1 - x0;
  const n = 6;
  return (
    <>
      {Array.from({length: n * 2}, (_, i) => {
        const row = i % 2;
        const k = Math.floor(i / 2);
        const x = x0 + ((k * len) / n + t * speed) % len;
        const id = Math.floor((k * len) / n / len + (t * speed) / len) * n + k;
        const leak = leakEvery ? (id + row) % leakEvery === 0 : false;
        const mark = tick ? tick(x) : 0;
        return (
          <group key={i}>
            <Dumpling p={[x, BELT_Y, row ? 0.26 : -0.26]} yaw={0.1 * (rnd(id, row) - 0.5)} pleat={pleat} leak={leak} s={1.45} />
            {mark ? (
              <mesh position={[x, BELT_Y + 0.42, row ? 0.26 : -0.26]}>
                <sphereGeometry args={[0.09, 12, 8]} />
                <meshBasicMaterial color={leak ? RED : LEMON} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </>
  );
};
// упаковка: весы, пакеты, Арми кладёт пакеты в короб
const PACK_ARM: V3 = [6.0, 0, 1.4];
const packPlan = (): {keys: ArmKey[]} => {
  const keys: ArmKey[] = [{at: 0, j: HOME, grip: 0.5}];
  const pick: V3 = [-0.9, 1.3, -0.9];
  const place: V3 = [0.9, 0.9, -0.6];
  for (let c = 0; c < 5; c++) {
    const T = 0.3 + c * 2.0;
    keys.push({at: T, p: [pick[0], pick[1] + 0.4, pick[2]], tool: Math.PI, grip: 0.5});
    keys.push({at: T + 0.35, p: pick, grip: 0.5});
    keys.push({at: T + 0.5, p: pick, grip: 0.3});
    keys.push({at: T + 1.1, p: [place[0], place[1] + 0.6, place[2]], grip: 0.3});
    keys.push({at: T + 1.45, p: place, grip: 0.3});
    keys.push({at: T + 1.6, p: place, grip: 0.5});
  }
  return {keys};
};
const Packing: React.FC<{t: number}> = ({t}) => (
  <>
    <mesh position={[5.2, 0.6, 0.3]}>
      <boxGeometry args={[1.4, 1.2, 1.2]} />
      <Steel />
    </mesh>
    <mesh position={[5.2, 1.22, 0.75]}>
      <boxGeometry args={[0.5, 0.2, 0.02]} />
      <meshStandardMaterial color="#121214" emissive="#2FD06A" emissiveIntensity={0.6} />
    </mesh>
    {[0, 1, 2].map((k) => (
      <mesh key={k} position={[5.2 + (k - 1) * 0.42, 1.36, 0.2]}>
        <boxGeometry args={[0.36, 0.22, 0.5]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={0.75} roughness={0.2} />
      </mesh>
    ))}
    <ArmModel p={PACK_ARM} t={t} plan={packPlan()} />
    <CargoBox s={[1.1, 0.7, 0.9]} p={[PACK_ARM[0] + 0.9, 0.35, PACK_ARM[2] - 0.6]} />
  </>
);

export const KITCHEN_CAM: Record<KitchenId, Cam> = {
  lump: {pos: [1.0, 2.5, 2.3], target: [0, 0.95, 0], fov: 40},
  jiaoziFast: {pos: [1.2, 5.4, 11.0], target: [1.2, 1.9, 0], fov: 52},
  jiaoziJam: {pos: [1.0, 4.0, 7.2], target: [1.4, 1.8, 0], fov: 46},
  jiaoziScan: {pos: [-0.8, 3.8, 7.6], target: [-0.4, 1.5, 0.6], fov: 46},
  jiaoziFixed: {pos: [0.6, 5.6, 11.8], target: [0.8, 1.9, 0.2], fov: 54},
};
export const kitchenState = (w: KitchenId, t: number) => {
  if (w === "jiaoziJam") return {alarm: t > 3.6};
  return {alarm: false};
};

const Floor: React.FC = () => (
  <>
    <MockFloor w={22} d={12} p={[0.4, 0, -0.6]} tone="#C4C9CC" />
    <mesh position={[0.4, 2.8, -3.6]}>
      <boxGeometry args={[22, 5.6, 0.2]} />
      <meshStandardMaterial color="#DCE6EA" roughness={0.9} />
    </mesh>
    {/* белая плитка на стене */}
    {Array.from({length: 18}, (_, i) => (
      <mesh key={i} position={[-8 + i * 1.0, 2.0, -3.48]}>
        <boxGeometry args={[0.02, 4.0, 0.02]} />
        <meshBasicMaterial color="#D3D8DA" />
      </mesh>
    ))}
  </>
);

export const KitchenWorld: React.FC<{w: KitchenId; t: number}> = ({w, t}) => {
  if (w === "lump") {
    // лоток после медленной заморозки: в прозрачной пачке пельмени слиплись в один ком
    return (
      <>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[3.2, 0.8, 2.2]} />
          <meshStandardMaterial color="#3A4652" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <boxGeometry args={[2.4, 0.04, 1.6]} />
          <meshStandardMaterial color="#5C6E7C" metalness={0.4} roughness={0.35} />
        </mesh>
        <group position={[0, 0.84, 0]}>
          {Array.from({length: 13}, (_, i) => (
            <Dumpling key={i} p={[(rnd(i, 1) - 0.5) * 0.9, 0.04 + rnd(i, 2) * 0.16, (rnd(i, 3) - 0.5) * 0.6]} yaw={rnd(i, 4) * 3} s={1.3} pleat />
          ))}
          <mesh position={[0, 0.12, 0]} scale={[0.6, 0.22, 0.4]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color={DOUGH} roughness={0.7} />
          </mesh>
          {/* пачка: прозрачная, края чернилами */}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[1.5, 0.5, 1.0]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={0.18} roughness={0.1} />
          </mesh>
          <lineSegments position={[0, 0.2, 0]}>
            <edgesGeometry args={[new BoxGeometry(1.5, 0.5, 1.0)]} />
            <lineBasicMaterial color={INK} />
          </lineSegments>
        </group>
        {Array.from({length: 24}, (_, i) => (
          <mesh key={`f${i}`} position={[(rnd(i, 5) - 0.5) * 3, 0.9 + ((rnd(i, 6) * 2 + t * 0.2) % 2), (rnd(i, 7) - 0.5) * 2]}>
            <sphereGeometry args={[0.02, 6, 4]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
        <pointLight position={[0, 2.2, 1.2]} intensity={1.6} distance={5} color="#9FD4FF" />
      </>
    );
  }
  if (w === "jiaoziFast") {
    return (
      <>
        <Floor />
        <Line t={t} speed={2.4} drum={2} />
        <BeltDumplings t={t} speed={2.4} />
        <Packing t={t} />
      </>
    );
  }
  if (w === "jiaoziJam") {
    // формовка выдаёт быстро, аппарат принимает медленно: перед ним растёт куча
    const heap = Math.min(1, Math.max(0, (t - 0.6) / 4.4));
    const n = Math.floor(8 + heap * 46);
    const alarm = t > 3.6;
    return (
      <>
        <Floor />
        <Line t={t} speed={2.0} drum={2} spin={0.15} />
        <BeltDumplings t={t} speed={2.0} />
        {Array.from({length: n}, (_, i) => {
          const r = Math.sqrt(rnd(i, 1)) * (0.3 + heap * 0.55);
          const a = rnd(i, 2) * 6.28;
          return <Dumpling key={i} p={[FREEZER[0] - 1.6 + Math.cos(a) * r * 0.8, BELT_Y + 0.02 + Math.max(0, 1 - r / 0.85) * heap * 0.7 + rnd(i, 3) * 0.1, Math.sin(a) * r]} yaw={rnd(i, 4) * 3} s={1.4} />;
        })}
        <mesh position={[FREEZER[0] - 1.6, BELT_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.95, 1.08, 40]} />
          <meshBasicMaterial color={alarm ? RED : LEMON} />
        </mesh>
        <Packing t={t * 0.3} />
      </>
    );
  }
  if (w === "jiaoziScan") {
    const dx = -3.6 + Math.min(1, t / 6.2) * 5.2;
    return (
      <>
        <Floor />
        <Line t={t} speed={0.9} pleat />
        <BeltDumplings t={t} speed={0.9} pleat leakEvery={7} tick={(x) => (x < dx + 0.4 ? 1 : 0)} />
        <DogModel t={t} plan={{stays: [], path: (tt) => {
          const x = -3.6 + Math.min(1, tt / 6.2) * 5.2;
          return {x, z: 1.4, yaw: 0, dist: x + 3.6, speed: tt < 6.2 ? 0.85 : 0, moving: tt < 6.2};
        }}} />
        <group position={[dx, 0, 1.4]}>
          <LidarSweep t={t} range={2.0} y={0.45} o={1} />
        </group>
      </>
    );
  }
  // jiaoziFixed: «как руками», аппарат с запасом, Кэрри привозит тесто по рецепту, Арми упаковывает
  const plan: WheelPlan = {
    stays: [
      {at: 0, x: -6.6, z: 3.4, yaw: 0},
      {at: 2.6, x: -4.0, z: 3.0, yaw: 0},
      {at: 3.4, x: -4.0, z: 3.0, yaw: Math.PI / 2},
    ],
    speed: 2.0,
    lift: [[0, 0.3]],
    carry: [{at: -3, from: [-6.2, 1.5, 3.4], until: 4.8, to: [-4.0, 1.42, 1.95], s: [0.7, 0.4, 0.5]}],
  };
  return (
    <>
      <Floor />
      <Line t={t} speed={1.2} pleat freezerR={1.85} spin={0.6} />
      <BeltDumplings t={t} speed={1.2} pleat />
      <Packing t={t} />
      {/* столик у тестораскатки — сюда Кэрри ставит тесто по рецепту клиента */}
      <mesh position={[-4.0, 0.6, 1.95]}>
        <boxGeometry args={[1.0, 1.2, 0.8]} />
        <Steel />
      </mesh>
      <WheelHumanoidModel skin="navy" t={t} plan={plan} />
    </>
  );
};
