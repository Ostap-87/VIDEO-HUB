// «Робокитай», сезон 2 · серия 1 · Ханчжоу (07.11.2026) — подстанция: гравийная площадка со снегом, дорожка из плит, портал
// с тремя опорными изоляторами и шиной (контакты 1 · 2 · 3, второй греется), трансформатор с радиаторами и расширителем,
// фонари, сетчатый забор; в стороне — полоса препятствий (бордюр площадки, кабельный канал без крышки, лестница на площадку
// обслуживания) и тёплый бокс с зарядкой — «дом» робота между обходами. Свет свой (Stage mood="dark"): день → ночь, луна,
// фонари; горячий контакт светится, при «вспышке» летят искры. Скаут — DogModel, Рыжик — AgvModel skin="orange" с мачтой
// тепловизора.
// Миры (`SubWorld`):
// - subNight — холодное открытие: ночь, мороз, пустая дорожка без следов, контакт 2 разгорается и вспыхивает (t ≈ 4,2);
// - subAgile — попытка 1: днём Скаут прыгает на площадку, перешагивает кабельный канал, поднимается по лестнице — «самый
//   ловкий»; с 4 с ночь, снег, он стоит на площадке под открытым небом, на спине растёт снег (заряд садится — шкала в 2D);
// - subRound — попытка 2: три обхода «когда успеем» — день, вечер, рассвет; каждый раз с другой стороны и с другого угла;
// - subScan — озарение: 03:00, Скаут на лимонной метке «той же точки», призраки прошлых ночей совпадают с ним, луч к контакту;
// - subFixed — решение: 03:00, тёплый бокс открывается, Скаут выходит на маршрут, Рыжик с мачтой едет по ровной дорожке,
//   контакт 2 помечен лимонным кольцом заранее;
// - subDay — развязка: день, монтёр у портала меняет контакт, Скаут заряжается в боксе, Рыжик на стоянке.
import React from "react";
import * as THREE from "three";
import {AgvModel} from "../../components/aura3d/AuraAgv";
import {DogModel, type DogAction} from "../../components/aura3d/AuraDog";
import {Shadow, pathAt, type Cam, type Stay, type V3} from "../../components/aura3d/kit";
import {Worker3D} from "./drama3d";

export type SubId = "subNight" | "subAgile" | "subRound" | "subScan" | "subFixed" | "subDay";
const LEMON = "#FFF65D";
const INK = "#262626";
const sm = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mixC = (a: string, b: string, k: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, k))).getHexString();
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
// палитра тепловизора: холодно → горячо
const HEAT = ["#3B0F7A", "#8E1F8F", "#D63A3A", "#F5892B", "#FFD84A", "#FFFBD6"];
export const heatColor = (h: number) => {
  const x = Math.max(0, Math.min(0.999, h)) * (HEAT.length - 1);
  const i = Math.floor(x);
  return mixC(HEAT[i], HEAT[i + 1], x - i);
};

// ===== площадка =====
const PORTAL_Z = -2.6;
export const CONTACT_X = [-1.8, 0, 1.8];
const CONTACT_Y = 3.1;
const SPOT: [number, number] = [0.2, 1.3]; // «та же точка» обхода перед контактом 2

const Ground: React.FC<{n: number}> = ({n}) => (
  <>
    {/* небо-задник и дальняя кромка (не освещаются) */}
    <mesh position={[0, 9, -16]}>
      <planeGeometry args={[90, 30]} />
      <meshBasicMaterial color={mixC("#D5DEE8", "#10162F", n)} />
    </mesh>
    <mesh position={[0, -0.04, -2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 34]} />
      <meshStandardMaterial color="#8C8780" roughness={1} />
    </mesh>
    {/* дорожка из бетонных плит */}
    {Array.from({length: 16}, (_, i) => (
      <mesh key={i} position={[-12 + i * 1.6, 0.02, 1.6]}>
        <boxGeometry args={[1.52, 0.06, 1.5]} />
        <meshStandardMaterial color="#B8B3AA" roughness={0.95} />
      </mesh>
    ))}
    {/* снег пятнами (не на дорожке) */}
    {Array.from({length: 18}, (_, i) => {
      const x = -13 + rnd(i, 1) * 28;
      const z = rnd(i, 2) > 0.5 ? 2.8 + rnd(i, 3) * 1.6 : -0.6 - rnd(i, 3) * 4.6;
      return (
        <mesh key={`s${i}`} position={[x, 0.0, z]} scale={[0.7 + rnd(i, 4) * 1.1, 0.05, 0.4 + rnd(i, 5) * 0.6]}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshStandardMaterial color="#F2F5F8" roughness={0.9} />
        </mesh>
      );
    })}
    {/* сетчатый забор */}
    {Array.from({length: 17}, (_, i) => (
      <mesh key={`f${i}`} position={[-16 + i * 2, 1.2, -7]}>
        <boxGeometry args={[0.1, 2.4, 0.1]} />
        <meshStandardMaterial color="#6E747A" />
      </mesh>
    ))}
    <mesh position={[0, 1.2, -7]}>
      <planeGeometry args={[32, 2.2]} />
      <meshStandardMaterial color="#A9B0B6" transparent opacity={0.28} side={THREE.DoubleSide} />
    </mesh>
  </>
);

// трансформатор: бак, радиаторы, расширитель, три ввода
const Transformer: React.FC<{p: V3; yaw?: number}> = ({p, yaw = 0}) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <mesh position={[0, 0.12, 0]}>
      <boxGeometry args={[2.8, 0.24, 1.9]} />
      <meshStandardMaterial color="#3E4246" />
    </mesh>
    <mesh position={[0, 1.3, 0]}>
      <boxGeometry args={[2.5, 2.2, 1.6]} />
      <meshStandardMaterial color="#7D8A84" roughness={0.6} metalness={0.2} />
    </mesh>
    {[-1, 1].flatMap((sz) =>
      Array.from({length: 7}, (_, i) => (
        <mesh key={`${sz}${i}`} position={[-1.05 + i * 0.35, 1.25, sz * 0.98]}>
          <boxGeometry args={[0.08, 1.8, 0.36]} />
          <meshStandardMaterial color="#6E7B75" roughness={0.6} metalness={0.2} />
        </mesh>
      )),
    )}
    <mesh position={[0.2, 2.85, -0.3]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.3, 0.3, 1.6, 18]} />
      <meshStandardMaterial color="#7D8A84" roughness={0.5} metalness={0.2} />
    </mesh>
    {[-0.7, 0, 0.7].map((x) => (
      <group key={x} position={[x, 2.4, 0.3]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.07, 0.11, 0.9, 10]} />
          <meshStandardMaterial color="#8B4A2B" roughness={0.35} />
        </mesh>
        {Array.from({length: 4}, (_, k) => (
          <mesh key={k} position={[0, 0.15 + k * 0.2, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.05, 14]} />
            <meshStandardMaterial color="#8B4A2B" roughness={0.35} />
          </mesh>
        ))}
      </group>
    ))}
    {/* лимонная табличка-знак без текста */}
    <mesh position={[0, 1.6, 0.81]}>
      <boxGeometry args={[0.5, 0.36, 0.02]} />
      <meshStandardMaterial color={LEMON} />
    </mesh>
  </group>
);

// портал: две решётчатые стойки, балка, три опорных изолятора на тумбах, шина; контакты — зажимы на верхушках
const Portal: React.FC<{heat: [number, number, number]; mark?: number; t: number}> = ({heat, mark = 0, t}) => (
  <group position={[0, 0, PORTAL_Z]}>
    {[-3.4, 3.4].map((x) => (
      <group key={x} position={[x, 0, 0]}>
        {[-0.22, 0.22].flatMap((dx) =>
          [-0.22, 0.22].map((dz) => (
            <mesh key={`${dx}${dz}`} position={[dx, 2.4, dz]}>
              <boxGeometry args={[0.08, 4.8, 0.08]} />
              <meshStandardMaterial color="#9AA2A9" metalness={0.5} roughness={0.4} />
            </mesh>
          )),
        )}
        {Array.from({length: 6}, (_, k) => (
          <mesh key={k} position={[0, 0.5 + k * 0.78, 0.22]} rotation={[0, 0, k % 2 ? 0.95 : -0.95]}>
            <boxGeometry args={[0.04, 0.62, 0.04]} />
            <meshStandardMaterial color="#9AA2A9" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
      </group>
    ))}
    <mesh position={[0, 4.75, 0]}>
      <boxGeometry args={[7.3, 0.3, 0.5]} />
      <meshStandardMaterial color="#9AA2A9" metalness={0.5} roughness={0.4} />
    </mesh>
    {/* гирлянды подвесных изоляторов к шине */}
    {[-3.0, 3.0].map((x) => (
      <group key={`g${x}`} position={[x, 4.6, 0]}>
        {Array.from({length: 5}, (_, k) => (
          <mesh key={k} position={[0, -0.18 - k * 0.24, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.06, 12]} />
            <meshStandardMaterial color="#8B4A2B" roughness={0.35} />
          </mesh>
        ))}
      </group>
    ))}
    <mesh position={[0, CONTACT_Y + 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.07, 0.07, 6.2, 12]} />
      <meshStandardMaterial color="#C9CFD4" metalness={0.7} roughness={0.3} />
    </mesh>
    {CONTACT_X.map((x, i) => {
      const h = heat[i];
      const pulse = 1 + 0.12 * Math.sin(t * 5 + i);
      return (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.65, 0]}>
            <boxGeometry args={[0.2, 1.3, 0.2]} />
            <meshStandardMaterial color="#5C6168" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 2.05, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 1.5, 10]} />
            <meshStandardMaterial color="#8B4A2B" roughness={0.35} />
          </mesh>
          {Array.from({length: 7}, (_, k) => (
            <mesh key={k} position={[0, 1.42 + k * 0.2, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.045, 14]} />
              <meshStandardMaterial color="#8B4A2B" roughness={0.35} />
            </mesh>
          ))}
          {/* зажим-контакт */}
          <mesh position={[0, CONTACT_Y, 0]}>
            <boxGeometry args={[0.34, 0.24, 0.3]} />
            <meshStandardMaterial color="#B7BDC3" metalness={0.6} roughness={0.35} emissive={heatColor(h)} emissiveIntensity={h > 0.3 ? (h - 0.3) * 1.6 : 0} />
          </mesh>
          {h > 0.25 ? (
            <>
              <mesh position={[0, CONTACT_Y, 0.02]} scale={(0.2 + 0.55 * h) * pulse}>
                <sphereGeometry args={[1, 18, 12]} />
                <meshBasicMaterial color={heatColor(h)} transparent opacity={0.22 + 0.25 * h} depthWrite={false} blending={THREE.AdditiveBlending} />
              </mesh>
              <pointLight position={[0, CONTACT_Y, 0.5]} intensity={h * h * 6} distance={4.5} color={heatColor(Math.min(1, h + 0.1))} />
            </>
          ) : null}
          {/* лимонное кольцо-метка: дефект найден заранее */}
          {i === 1 && mark > 0 ? (
            <mesh position={[0, CONTACT_Y, 0.3]} scale={mark}>
              <torusGeometry args={[0.42, 0.05, 8, 32]} />
              <meshBasicMaterial color={LEMON} />
            </mesh>
          ) : null}
        </group>
      );
    })}
  </group>
);

// искры от перегретого контакта: вылетают в момент `at`, падают по параболе
const Sparks: React.FC<{t: number; at: number}> = ({t, at}) => {
  const u = t - at;
  if (u < 0 || u > 1.6) return null;
  return (
    <group position={[CONTACT_X[1], CONTACT_Y, PORTAL_Z + 0.2]}>
      {Array.from({length: 26}, (_, i) => {
        const a = rnd(i, 1) * Math.PI * 2;
        const v = 1.6 + rnd(i, 2) * 2.4;
        const x = Math.cos(a) * v * u;
        const z = Math.sin(a) * v * u * 0.6 + 0.4 * u;
        const y = (0.8 + rnd(i, 3) * 1.6) * u - 4.9 * u * u;
        return (
          <mesh key={i} position={[x, y, z]}>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshBasicMaterial color={i % 3 ? "#FFD84A" : "#FFFBD6"} transparent opacity={Math.max(0, 1 - u / 1.6)} />
          </mesh>
        );
      })}
      <pointLight intensity={Math.max(0, 14 * (1 - u * 2.2))} distance={8} color="#FFB54A" />
    </group>
  );
};

const Lamp: React.FC<{p: V3; n: number}> = ({p, n}) => (
  <group position={p}>
    <mesh position={[0, 2.2, 0]}>
      <cylinderGeometry args={[0.06, 0.09, 4.4, 10]} />
      <meshStandardMaterial color="#4A4F55" />
    </mesh>
    <mesh position={[0.35, 4.4, 0]}>
      <boxGeometry args={[0.8, 0.12, 0.3]} />
      <meshStandardMaterial color="#2E3236" emissive="#FFE2A8" emissiveIntensity={n > 0.3 ? 1.2 : 0} />
    </mesh>
    {n > 0.3 ? <pointLight position={[0.4, 4.1, 0.3]} intensity={(n - 0.3) * 9} distance={10} decay={1.6} color="#FFD9A0" /> : null}
  </group>
);

// снегопад: хлопья падают и сносятся ветром
const Snow: React.FC<{t: number; o?: number; c?: V3}> = ({t, o = 1, c = [0, 0, 0]}) =>
  o <= 0 ? null : (
    <group position={c}>
      {Array.from({length: 90}, (_, i) => {
        const x = -9 + rnd(i, 1) * 18 + Math.sin(t * 0.8 + i) * 0.25 + t * 0.35;
        const y = 7 - ((rnd(i, 2) * 7 + t * (0.7 + rnd(i, 4) * 0.4)) % 7);
        const z = -5 + rnd(i, 3) * 7.5;
        return (
          <mesh key={i} position={[((x + 9) % 18) - 9, y, z]}>
            <sphereGeometry args={[0.035, 5, 4]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={o} />
          </mesh>
        );
      })}
    </group>
  );

// свет площадки: n — 0 день … 1 ночь
const SubLights: React.FC<{n: number}> = ({n}) => (
  <>
    <hemisphereLight args={[mixC("#EEF3FA", "#4A5C96", n), mixC("#6A6458", "#0C0E1C", n), 1.35 - 0.95 * n]} />
    <directionalLight position={[6, 10, 6]} intensity={1.8 * (1 - n) + 0.45 * n} color={mixC("#FFF4E2", "#A9BCFF", n)} />
    <directionalLight position={[-6, 4, -3]} intensity={0.35 * (1 - n)} color="#BFD4FF" />
  </>
);

// полоса препятствий справа: площадка с бордюром (0,3), кабельный канал без крышки, лестница, площадка обслуживания (0,75)
const AG = {pad0: 7.0, gap0: 8.45, gap1: 8.95, st0: 9.6, st1: 10.4, end: 13.4};
const agileY = (x: number) => {
  if (x < AG.pad0) return 0;
  if (x < AG.st0) return 0.3;
  if (x < AG.st1) return 0.3 + 0.45 * sm((x - AG.st0) / (AG.st1 - AG.st0));
  return 0.75;
};
const Course: React.FC = () => (
  <group position={[0, 0, 1.6]}>
    <mesh position={[(AG.pad0 + AG.gap0) / 2, 0.15, 0]}>
      <boxGeometry args={[AG.gap0 - AG.pad0, 0.3, 2.2]} />
      <meshStandardMaterial color="#A7A29A" roughness={0.95} />
    </mesh>
    <mesh position={[(AG.gap1 + AG.st0) / 2, 0.15, 0]}>
      <boxGeometry args={[AG.st0 - AG.gap1, 0.3, 2.2]} />
      <meshStandardMaterial color="#A7A29A" roughness={0.95} />
    </mesh>
    {/* кабельный канал: тёмный жёлоб, кабели, одна крышка сдвинута */}
    <mesh position={[(AG.gap0 + AG.gap1) / 2, 0.02, 0]}>
      <boxGeometry args={[AG.gap1 - AG.gap0, 0.04, 2.2]} />
      <meshStandardMaterial color="#26282B" />
    </mesh>
    {[-0.5, 0, 0.5].map((z, i) => (
      <mesh key={z} position={[(AG.gap0 + AG.gap1) / 2, 0.08, z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 8]} />
        <meshStandardMaterial color={i === 1 ? "#E89A2C" : "#1B1C1E"} />
      </mesh>
    ))}
    <mesh position={[(AG.gap0 + AG.gap1) / 2 + 0.2, 0.33, 1.5]} rotation={[0, 0.3, 0]}>
      <boxGeometry args={[0.6, 0.06, 0.9]} />
      <meshStandardMaterial color="#8D8880" />
    </mesh>
    {/* лестница из трёх ступеней и площадка с перилами */}
    {[0, 1, 2].map((k) => {
      const x0 = AG.st0 + (k * (AG.st1 - AG.st0)) / 3;
      const h = 0.3 + (k + 1) * 0.15;
      return (
        <mesh key={k} position={[(x0 + AG.st1) / 2, h / 2, 0]}>
          <boxGeometry args={[AG.st1 - x0, h, 2.0]} />
          <meshStandardMaterial color={k % 2 ? "#B3AEA6" : "#A9A49C"} roughness={0.9} />
        </mesh>
      );
    })}
    <mesh position={[(AG.st1 + AG.end) / 2, 0.375, 0]}>
      <boxGeometry args={[AG.end - AG.st1, 0.75, 2.4]} />
      <meshStandardMaterial color="#9C978F" roughness={0.9} />
    </mesh>
    {[-1.15, 1.15].map((z) => (
      <group key={z}>
        <mesh position={[(AG.st1 + AG.end) / 2, 1.3, z - 0.0]}>
          <boxGeometry args={[AG.end - AG.st1, 0.06, 0.06]} />
          <meshStandardMaterial color="#E8C547" />
        </mesh>
        {[AG.st1 + 0.1, (AG.st1 + AG.end) / 2, AG.end - 0.1].map((x) => (
          <mesh key={x} position={[x, 1.03, z]}>
            <boxGeometry args={[0.06, 0.56, 0.06]} />
            <meshStandardMaterial color="#E8C547" />
          </mesh>
        ))}
      </group>
    ))}
  </group>
);

// тёплый бокс с зарядкой: рулонная дверь поднимается (open 0…1), внутри свет и лимонная площадка
const BOX_P: V3 = [-4.6, 0, 2.4];
const HeatBox: React.FC<{open: number; n: number}> = ({open, n}) => (
  <group position={BOX_P}>
    {/* стены: задняя, боковые, крыша (дверь — со стороны +x) */}
    <mesh position={[-0.95, 1.0, 0]}>
      <boxGeometry args={[0.1, 2.0, 2.0]} />
      <meshStandardMaterial color="#E7E2D8" />
    </mesh>
    {[-1, 1].map((sz) => (
      <mesh key={sz} position={[0, 1.0, sz * 0.95]}>
        <boxGeometry args={[2.0, 2.0, 0.1]} />
        <meshStandardMaterial color="#E7E2D8" />
      </mesh>
    ))}
    <mesh position={[0, 2.06, 0]}>
      <boxGeometry args={[2.2, 0.14, 2.2]} />
      <meshStandardMaterial color={INK} />
    </mesh>
    <mesh position={[0, 2.16, 0]} scale={[1.05, 0.08, 1.05]}>
      <sphereGeometry args={[1.05, 16, 8]} />
      <meshStandardMaterial color="#F2F5F8" />
    </mesh>
    <mesh position={[0.2, 0.03, 0]}>
      <boxGeometry args={[1.4, 0.04, 1.2]} />
      <meshStandardMaterial color={LEMON} emissive={LEMON} emissiveIntensity={0.35} />
    </mesh>
    {/* рулонная дверь */}
    <mesh position={[0.98, 1.0 + open * 0.95, 0]} scale={[1, 1 - open * 0.92, 1]}>
      <boxGeometry args={[0.06, 2.0, 1.8]} />
      <meshStandardMaterial color="#C9CDD2" metalness={0.4} roughness={0.45} />
    </mesh>
    {/* лимонная полоса и значок «тепло» над дверью */}
    <mesh position={[1.02, 1.86, 0]}>
      <boxGeometry args={[0.02, 0.14, 1.8]} />
      <meshStandardMaterial color={LEMON} emissive={LEMON} emissiveIntensity={0.5} />
    </mesh>
    <pointLight position={[0.2, 1.4, 0]} intensity={2.4 + 2 * n} distance={4.5} color="#FFC77A" />
  </group>
);

// мачта тепловизора на площадке Рыжика: стойка, поворотная голова с объективом
const Mast: React.FC<{p: {x: number; z: number; yaw: number}; t: number}> = ({p, t}) => (
  <group position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]}>
    <mesh position={[-0.35, 1.25, 0]}>
      <cylinderGeometry args={[0.05, 0.06, 1.3, 10]} />
      <meshStandardMaterial color="#C9CFD4" metalness={0.6} roughness={0.3} />
    </mesh>
    <group position={[-0.35, 1.95, 0]} rotation={[0, Math.sin(t * 1.4) * 0.6 + 0.9, 0]}>
      <mesh>
        <boxGeometry args={[0.34, 0.24, 0.26]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh position={[0.19, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
        <meshBasicMaterial color={LEMON} />
      </mesh>
    </group>
  </group>
);

// ===== планы =====
// попытка 1: старт слева от площадки, финиш на площадке обслуживания
const AGILE_STAYS: Stay[] = [
  {at: 0, x: 5.0, z: 1.6, yaw: 0},
  {at: 3.6, x: 11.9, z: 1.6, yaw: 0},
];
const AGILE_SPEED = 2.5;
const crossAt = (stays: Stay[], speed: number, x0: number) => {
  for (let k = 0; k <= 400; k++) {
    const t = (k / 400) * stays[stays.length - 1].at;
    if (pathAt(stays, t, speed).x >= x0) return t;
  }
  return 0;
};
const AGILE_HOPS: DogAction[] = [
  {at: crossAt(AGILE_STAYS, AGILE_SPEED, AG.pad0 - 0.55), kind: "hop"},
  {at: crossAt(AGILE_STAYS, AGILE_SPEED, AG.gap0 - 0.45), kind: "hop"},
];
// попытка 2: три обхода с разных сторон
const ROUNDS: {from: [number, number]; to: [number, number]; yaw: number; n: number}[] = [
  {from: [-6.5, 1.6], to: [-2.6, 0.2], yaw: Math.PI / 2 - 0.55, n: 0},
  {from: [6.0, 1.6], to: [2.0, -0.2], yaw: Math.PI / 2 + 0.7, n: 0.6},
  {from: [-2.6, 4.6], to: [0.4, 2.0], yaw: Math.PI / 2 - 0.25, n: 0.86},
];
const RSEG = 2.4;
const roundStays = (i: number): Stay[] => {
  const r = ROUNDS[i];
  return [
    {at: 0, x: r.from[0], z: r.from[1]},
    {at: 1.4, x: r.to[0], z: r.to[1], yaw: r.yaw},
  ];
};
// решение: Скаут выходит из бокса к той же точке; Рыжик едет по ровной дорожке
const FIX_SCOUT: Stay[] = [
  {at: 0, x: BOX_P[0] + 0.1, z: BOX_P[2], yaw: 0},
  {at: 1.3, x: BOX_P[0] + 0.1, z: BOX_P[2], yaw: 0},
  {at: 2.6, x: -2.6, z: 1.8, yaw: 0},
  {at: 4.0, x: SPOT[0], z: SPOT[1], yaw: Math.PI / 2},
];
const FIX_GINGER: Stay[] = [
  {at: 0.4, x: 7.0, z: -0.3, yaw: Math.PI},
  {at: 5.6, x: 1.8, z: -0.3, yaw: Math.PI},
];

// ===== камеры =====
export const SUB_CAM: Record<SubId, Cam> = {
  subNight: {pos: [3.6, 2.0, 7.2], target: [0.3, 2.7, PORTAL_Z], fov: 46},
  subAgile: {pos: [8.6, 3.1, 9.4], target: [9.0, 0.8, 1.2], fov: 44},
  subRound: {pos: [4.0, 3.0, 7.2], target: [-0.2, 1.6, -0.8], fov: 48},
  subScan: {pos: [4.4, 2.6, 7.4], target: [0.1, 1.6, -0.6], fov: 44},
  subFixed: {pos: [0.2, 4.0, 10.4], target: [-1.6, 1.2, 0.0], fov: 50},
  subDay: {pos: [1.2, 3.6, 10.6], target: [-2.0, 1.6, -0.6], fov: 50},
};
export const SUB_CAM_AT = (w: SubId, t: number): Cam => {
  const c = SUB_CAM[w];
  if (w === "subNight") {
    // медленный наезд на контакт
    const k = sm(t / 6.5);
    return {pos: lerpV(c.pos, [1.7, 2.6, 4.4], k), target: c.target, fov: lerp(c.fov ?? 46, 42, k)};
  }
  if (w === "subScan") {
    const k = sm(t / 7.5);
    return {pos: lerpV(c.pos, [2.6, 2.4, 6.0], k), target: c.target, fov: c.fov};
  }
  if (w === "subAgile") {
    const k = sm((t - 3.8) / 1.2);
    return {pos: lerpV(c.pos, [11.2, 2.6, 6.6], k), target: lerpV(c.target, [11.8, 1.1, 1.4], k), fov: c.fov};
  }
  return c;
};

// нагрев контактов во времени: [1, 2, 3], 0…1
const heatOf = (w: SubId, t: number): [number, number, number] => {
  if (w === "subNight") return [0.12, Math.min(1, 0.45 + t * 0.08) + (t > 4.2 && t < 4.9 ? 0.4 : 0), 0.14];
  if (w === "subRound") {
    const i = Math.min(2, Math.floor(t / RSEG));
    return ([[0.62, 0.66, 0.6], [0.38, 0.44, 0.36], [0.16, 0.36, 0.15]] as [number, number, number][])[i];
  }
  if (w === "subScan") return [0.14, 0.3 + 0.18 * sm(t / 6), 0.15];
  if (w === "subFixed") return [0.12, 0.36, 0.13];
  return [0, 0, 0];
};
export const subState = (w: SubId, t: number) => {
  if (w === "subNight") return {alarm: t > 4.25};
  if (w === "subAgile") return {alarm: t > 6.1};
  return {alarm: false};
};

const nightOf = (w: SubId, t: number) => {
  if (w === "subNight" || w === "subScan" || w === "subFixed") return 1;
  if (w === "subAgile") return sm((t - 3.9) / 0.9);
  if (w === "subRound") {
    const i = Math.min(2, Math.floor(t / RSEG));
    const prev = i ? ROUNDS[i - 1].n : 0;
    return lerp(prev, ROUNDS[i].n, sm((t - i * RSEG) / 0.5));
  }
  return 0;
};

export const SubWorld: React.FC<{w: SubId; t: number}> = ({w, t}) => {
  const n = nightOf(w, t);
  const heat = heatOf(w, t);
  const common = (
    <>
      <SubLights n={n} />
      <Ground n={n} />
      <Portal heat={heat} t={t} mark={w === "subFixed" ? sm((t - 3.6) / 0.4) : w === "subDay" ? 1 : 0} />
      <Transformer p={[-6.0, 0, -3.4]} />
      <Transformer p={[12.6, 0, -2.6]} />
      <Lamp p={[4.6, 0, -0.4]} n={n} />
      <Lamp p={[-4.2, 0, -0.6]} n={n} />
      <Course />
      <HeatBox open={w === "subFixed" ? sm((t - 0.3) / 0.9) : w === "subDay" ? 1 : 0} n={n} />
    </>
  );
  if (w === "subNight") {
    return (
      <>
        {common}
        <Snow t={t} o={0.9} c={[0, 0, 0]} />
        <Sparks t={t} at={4.2} />
      </>
    );
  }
  if (w === "subAgile") {
    // днём — полоса препятствий; потом ночь: Скаут на площадке под снегом
    const P = pathAt(AGILE_STAYS, Math.min(t, 3.6), AGILE_SPEED);
    const y = agileY(P.x);
    const snowK = sm((t - 4.4) / 2.4);
    return (
      <>
        {common}
        <Snow t={t} o={sm((t - 3.9) / 0.6)} c={[10, 0, 0]} />
        <group position={[0, y, 0]}>
          <DogModel t={Math.min(t, 3.9)} plan={{stays: AGILE_STAYS, speed: AGILE_SPEED, actions: AGILE_HOPS}} headlight={n > 0.5 && t < 5.8}>
            {snowK > 0 ? (
              <mesh position={[0, 0.15, 0]} scale={[0.5 * snowK + 0.05, 0.07 * snowK + 0.01, 0.2 * snowK + 0.03]}>
                <sphereGeometry args={[1, 16, 8]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
              </mesh>
            ) : null}
          </DogModel>
        </group>
      </>
    );
  }
  if (w === "subRound") {
    const i = Math.min(2, Math.floor(t / RSEG));
    const lt = t - i * RSEG;
    return (
      <>
        {common}
        <DogModel t={lt} plan={{stays: roundStays(i), speed: 3.2}} headlight={ROUNDS[i].n > 0.5} />
      </>
    );
  }
  if (w === "subScan") {
    // та же точка: лимонная метка на плитке, призраки прошлых ночей совпадают со Скаутом, луч к контакту 2
    const beamK = sm((t - 0.8) / 0.5);
    const from: V3 = [SPOT[0], 0.75, SPOT[1] - 0.5];
    const to: V3 = [CONTACT_X[1], CONTACT_Y, PORTAL_Z];
    const mid = lerpV(from, to, 0.5);
    const len = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const dir = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return (
      <>
        {common}
        <mesh position={[SPOT[0], 0.06, SPOT[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.86, 40]} />
          <meshBasicMaterial color={LEMON} />
        </mesh>
        {[2.2, 3.4, 4.6].map((at, k) => {
          const o = sm((t - at) / 0.3) * (1 - sm((t - at - 0.9) / 0.4));
          if (o <= 0.01) return null;
          return (
            <mesh key={k} position={[SPOT[0], 0.5, SPOT[1]]} scale={[1 + 0.25 * (1 - o), 1, 1 + 0.25 * (1 - o)]}>
              <boxGeometry args={[1.25, 0.9, 0.55]} />
              <meshBasicMaterial color={LEMON} transparent opacity={0.18 * o} depthWrite={false} />
            </mesh>
          );
        })}
        <DogModel t={t} plan={{stays: [{at: 0, x: SPOT[0], z: SPOT[1], yaw: Math.PI / 2}], actions: [{at: 0.2, kind: "hop"}]}} headlight />
        {beamK > 0 ? (
          <mesh position={mid} quaternion={q}>
            <cylinderGeometry args={[0.02, 0.12, len, 12, 1, true]} />
            <meshBasicMaterial color={LEMON} transparent opacity={0.32 * beamK} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ) : null}
        <Snow t={t} o={0.6} />
      </>
    );
  }
  if (w === "subFixed") {
    const g = pathAt(FIX_GINGER, t, 1.15);
    return (
      <>
        {common}
        <Snow t={t} o={0.75} />
        <mesh position={[SPOT[0], 0.06, SPOT[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.86, 40]} />
          <meshBasicMaterial color={LEMON} />
        </mesh>
        <DogModel t={t} plan={{stays: FIX_SCOUT, speed: 2.4}} headlight />
        <AgvModel t={t} skin="orange" plan={{stays: FIX_GINGER, speed: 1.15}} />
        <Mast p={g} t={t} />
      </>
    );
  }
  // subDay: монтёр меняет контакт, Скаут заряжается в боксе, Рыжик на стоянке
  return (
    <>
      {common}
      <Worker3D x={0.3} z={PORTAL_Z + 1.0} yaw={Math.PI / 2} crouch={0} jacket="#22406A" stripe hat="hard" arms={1} />
      <Shadow w={1.0} d={0.7} p={[0.3, 0, PORTAL_Z + 1.0]} o={0.5} />
      <DogModel t={t} plan={{stays: [{at: 0, x: BOX_P[0] + 0.2, z: BOX_P[2], yaw: 0}], actions: [{at: 1.2, kind: "hop"}]}} />
      <AgvModel t={t} skin="orange" plan={{stays: [{at: 0, x: 3.4, z: 0.0, yaw: Math.PI}]}} />
      <Mast p={{x: 3.4, z: 0.0, yaw: Math.PI}} t={t} />
    </>
  );
};
