// «Робокитай», серия 7 · Застава (06.11.2026) — граница на севере: дорога со снегом по обочинам, пост с навесом, будка
// с окном и светофором, шлагбаум в красно-белую полосу, штабель контейнеров, грузовик-площадка. Робот едет в деревянном
// ящике из реек (сквозь щели виден Шустрик — `AgvModel`), на ящике наклейка-индикатор удара и наклона. Аист
// (`DroneModel kind="cargo"`) носит ящик на тросе; ящик и трос рисуются здесь, качание — от разгона дрона.
// Миры (`BorderWorld`):
// - crateDark — холодное открытие: темнота кузова, полосы света бегут по стенам, остановка — красный свет поста;
// - crateLoad — Аист поднимает ящик и несёт к грузовику, ящик раскачивается — индикатор краснеет;
// - barrier — грузовик у шлагбаума: красный свет, шлагбаум закрыт, пограничник у будки;
// - svh — ночь, склад временного хранения: ящик один за сеткой под фонарём, падает снег;
// - gate — ворота цеха: Скаут лидаром меряет проём и ящик — ящик шире (красная мерка);
// - borderOpen — шлагбаум поднимается, зелёный свет, грузовик проезжает, Аист сопровождает;
// - unbox — в цехе клиента: передняя стенка ящика опускается пандусом, Шустрик выезжает.
import React from "react";
import {AgvModel} from "../../components/aura3d/AuraAgv";
import {DogModel} from "../../components/aura3d/AuraDog";
import {DroneModel, droneState, type DronePlan} from "../../components/aura3d/AuraDrone";
import {Shadow, type Cam, type V3} from "../../components/aura3d/kit";
import {Worker3D} from "./drama3d";
import {LidarSweep, MockFloor} from "./scene3d";

export type BorderId = "crateDark" | "crateLoad" | "barrier" | "svh" | "gate" | "borderOpen" | "unbox";
const LEMON = "#FFF65D";
const RED = "#E5383B";
const INK = "#262626";
const WOOD = "#C9A46A";
const WOOD_D = "#8A6A3A";
const sm = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const CR: V3 = [2.5, 1.5, 1.8]; // ящик: длина, высота, ширина

// ===== ящик из реек =====
const Slats: React.FC<{len: number; h: number; n?: number}> = ({len, h, n = 4}) => (
  <>
    {Array.from({length: n}, (_, i) => (
      <mesh key={i} position={[0, -h / 2 + (h / n) * (i + 0.5), 0]}>
        <boxGeometry args={[len, (h / n) * 0.62, 0.06]} />
        <meshStandardMaterial color={WOOD} roughness={0.85} />
      </mesh>
    ))}
  </>
);
export const Crate: React.FC<{p: V3; yaw?: number; roll?: number; open?: number; ind?: number; robot?: boolean; t?: number}> = ({p, yaw = 0, roll = 0, open = 0, ind = 0, robot = true, t = 0}) => {
  const [L, H, W] = CR;
  return (
    <group position={p} rotation={[roll, yaw, 0]}>
      {/* основание-поддон */}
      <mesh position={[0, -H / 2 + 0.06, 0]}>
        <boxGeometry args={[L + 0.1, 0.12, W + 0.1]} />
        <meshStandardMaterial color={WOOD_D} roughness={0.9} />
      </mesh>
      {/* стойки по углам */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * (L - 0.1)) / 2, 0, (sz * (W - 0.1)) / 2]}>
            <boxGeometry args={[0.12, H, 0.12]} />
            <meshStandardMaterial color={WOOD_D} roughness={0.9} />
          </mesh>
        )),
      )}
      {/* боковые стенки и задняя */}
      {[-1, 1].map((sz) => (
        <group key={sz} position={[0, 0, (sz * W) / 2]}>
          <Slats len={L} h={H - 0.1} />
        </group>
      ))}
      <group position={[-L / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Slats len={W} h={H - 0.1} />
      </group>
      {/* передняя стенка на петлях снизу: open 1 — лежит пандусом */}
      <group position={[L / 2, -H / 2 + 0.1, 0]} rotation={[0, 0, -open * 1.42]}>
        <group position={[0, (H - 0.1) / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Slats len={W} h={H - 0.1} />
        </group>
      </group>
      {/* крышка из реек */}
      {[-0.6, 0, 0.6].map((x) => (
        <mesh key={x} position={[x * (L / 1.6), H / 2 - 0.03, 0]}>
          <boxGeometry args={[0.42, 0.06, W]} />
          <meshStandardMaterial color={WOOD} roughness={0.85} />
        </mesh>
      ))}
      {/* клеймо обработки древесины (знак без текста) и наклейка-индикатор удара и наклона */}
      <mesh position={[-0.6, 0.05, W / 2 + 0.05]}>
        <boxGeometry args={[0.36, 0.26, 0.01]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <group position={[0.55, 0.1, W / 2 + 0.05]}>
        <mesh>
          <boxGeometry args={[0.34, 0.34, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0, 0.008]}>
          <circleGeometry args={[0.05 + 0.09 * ind, 20]} />
          <meshBasicMaterial color={ind > 0.5 ? RED : "#F2B8B8"} />
        </mesh>
      </group>
      {robot ? (
        <group position={[0, -H / 2 + 0.12, 0]} scale={0.95}>
          <AgvModel t={t} plan={{stays: [{at: 0, x: 0, z: 0, yaw: 0}]}} />
        </group>
      ) : null}
    </group>
  );
};

// ===== дорога, пост, контейнеры =====
const Containers: React.FC<{z?: number; night?: boolean}> = ({z = -7.0, night}) => (
  <>
    {[
      [-6, 1.3, "#C0392B"],
      [0.4, 1.3, "#2B6CB0"],
      [6.8, 1.3, "#E89A2C"],
      [-2.8, 3.9, "#4A7C59"],
      [3.6, 3.9, "#7A8794"],
    ].map(([x, y, c], i) => (
      <group key={i} position={[x as number, y as number, z]}>
        <mesh>
          <boxGeometry args={[6.2, 2.6, 2.5]} />
          <meshStandardMaterial color={c as string} roughness={0.7} transparent={night} opacity={night ? 0.55 : 1} />
        </mesh>
        {Array.from({length: 14}, (_, k) => (
          <mesh key={k} position={[-2.9 + k * 0.44, 0, 1.26]}>
            <boxGeometry args={[0.08, 2.4, 0.04]} />
            <meshStandardMaterial color="#000000" transparent opacity={0.16} />
          </mesh>
        ))}
      </group>
    ))}
  </>
);
const Road: React.FC<{night?: boolean}> = ({night}) => (
  <>
    <mesh position={[0, -0.05, 0]}>
      <boxGeometry args={[34, 0.1, 18]} />
      <meshStandardMaterial color={night ? "#D7DCE2" : "#EEF0F2"} roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.005, 0.4]}>
      <boxGeometry args={[34, 0.02, 6.4]} />
      <meshStandardMaterial color={night ? "#4F4E4B" : "#6E6C68"} roughness={0.9} />
    </mesh>
    {Array.from({length: 12}, (_, i) => (
      <mesh key={i} position={[-15 + i * 2.8, 0.02, 0.4]}>
        <boxGeometry args={[1.4, 0.01, 0.14]} />
        <meshBasicMaterial color="#F4F4F0" />
      </mesh>
    ))}
    {/* стоп-линия перед шлагбаумом */}
    <mesh position={[2.9, 0.02, 0.4]}>
      <boxGeometry args={[0.3, 0.01, 6.2]} />
      <meshBasicMaterial color="#F4F4F0" />
    </mesh>
    {/* сугробы вдоль дороги */}
    {[-11, -5, 6, 12].map((x, i) => (
      <mesh key={x} position={[x, 0.2, i % 2 ? 4.4 : -3.6]} scale={[2.6, 0.5, 0.9]}>
        <sphereGeometry args={[1, 18, 10]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </mesh>
    ))}
  </>
);
const Post: React.FC<{armUp: number; light: "red" | "green"; t: number}> = ({armUp, light, t}) => (
  <>
    {/* навес поста */}
    {[
      [1.6, -3.4],
      [1.6, 4.2],
      [7.4, -3.4],
      [7.4, 4.2],
    ].map(([x, z]) => (
      <mesh key={`${x}${z}`} position={[x, 2.9, z]}>
        <boxGeometry args={[0.24, 5.8, 0.24]} />
        <meshStandardMaterial color="#9AA0A6" metalness={0.5} roughness={0.4} />
      </mesh>
    ))}
    <mesh position={[4.5, 5.9, 0.4]}>
      <boxGeometry args={[6.6, 0.4, 8.4]} />
      <meshStandardMaterial color="#E4E2DD" roughness={0.6} />
    </mesh>
    <mesh position={[4.5, 5.9, 4.62]}>
      <boxGeometry args={[6.6, 0.42, 0.06]} />
      <meshStandardMaterial color={LEMON} emissive={LEMON} emissiveIntensity={0.3} />
    </mesh>
    {/* будка с окном */}
    <group position={[4.6, 0, -3.6]}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2.0, 3.0, 1.8]} />
        <meshStandardMaterial color="#F1EDE6" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.0, 0.91]}>
        <boxGeometry args={[1.4, 0.9, 0.02]} />
        <meshStandardMaterial color="#9CC8F0" emissive="#CFE6F5" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 3.12, 0]}>
        <boxGeometry args={[2.3, 0.24, 2.1]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      {/* светофор */}
      <group position={[-1.3, 2.3, 1.0]}>
        <mesh>
          <boxGeometry args={[0.36, 0.8, 0.3]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[0, 0.18, 0.16]}>
          <sphereGeometry args={[0.12, 14, 10]} />
          <meshBasicMaterial color={light === "red" ? (Math.floor(t * 2.5) % 2 ? RED : "#FF8A8A") : "#3A1A1A"} />
        </mesh>
        <mesh position={[0, -0.18, 0.16]}>
          <sphereGeometry args={[0.12, 14, 10]} />
          <meshBasicMaterial color={light === "green" ? "#2FD06A" : "#16301E"} />
        </mesh>
      </group>
    </group>
    {/* шлагбаум: стойка и стрела в полоску, поворот вверх */}
    <group position={[3.4, 0, -2.4]}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.4, 1.4, 0.4]} />
        <meshStandardMaterial color="#F1EDE6" />
      </mesh>
      <group position={[0, 1.25, 0]} rotation={[-armUp * 1.45, 0, 0]}>
        {Array.from({length: 8}, (_, i) => (
          <mesh key={i} position={[0, 0, 0.35 + i * 0.6]}>
            <boxGeometry args={[0.16, 0.18, 0.6]} />
            <meshStandardMaterial color={i % 2 ? "#FFFFFF" : RED} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  </>
);
// грузовик-площадка: кабина спереди (+x), площадка с ящиком под лимонными стяжками
const Truck: React.FC<{x: number; z?: number; crate?: boolean; t: number; ind?: number}> = ({x, z = 0.4, crate = true, t, ind = 0}) => (
  <group position={[x, 0, z]}>
    <Shadow w={8.6} d={3.0} o={0.5} />
    {/* рама и площадка */}
    <mesh position={[-0.8, 0.85, 0]}>
      <boxGeometry args={[6.4, 0.3, 1.4]} />
      <meshStandardMaterial color={INK} />
    </mesh>
    <mesh position={[-1.1, 1.12, 0]}>
      <boxGeometry args={[5.6, 0.24, 2.6]} />
      <meshStandardMaterial color="#5C6168" metalness={0.4} roughness={0.5} />
    </mesh>
    {/* кабина */}
    <group position={[2.9, 0, 0]}>
      <mesh position={[0, 2.0, 0]}>
        <boxGeometry args={[1.9, 2.4, 2.5]} />
        <meshStandardMaterial color="#F1EDE6" roughness={0.45} />
      </mesh>
      <mesh position={[0.96, 2.5, 0]}>
        <boxGeometry args={[0.02, 1.0, 2.2]} />
        <meshStandardMaterial color="#1B2530" metalness={0.4} roughness={0.1} />
      </mesh>
      <mesh position={[0.2, 1.3, 1.26]}>
        <boxGeometry args={[1.5, 0.2, 0.02]} />
        <meshStandardMaterial color={LEMON} emissive={LEMON} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.97, 1.2, 0.85]}>
        <boxGeometry args={[0.02, 0.24, 0.4]} />
        <meshBasicMaterial color="#FFF4C8" />
      </mesh>
      <mesh position={[0.97, 1.2, -0.85]}>
        <boxGeometry args={[0.02, 0.24, 0.4]} />
        <meshBasicMaterial color="#FFF4C8" />
      </mesh>
    </group>
    {/* колёса */}
    {[2.9, -0.6, -2.6].flatMap((wx) =>
      [-1, 1].map((sz) => (
        <mesh key={`${wx}${sz}`} position={[wx, 0.52, sz * 1.2]} rotation={[Math.PI / 2, 0, -x * 1.9]}>
          <cylinderGeometry args={[0.52, 0.52, 0.42, 20]} />
          <meshStandardMaterial color="#17191C" roughness={0.8} />
        </mesh>
      )),
    )}
    {crate ? (
      <>
        <Crate p={[-1.1, 1.24 + CR[1] / 2, 0]} t={t} ind={ind} />
        {[-1.8, -0.4].map((sx) => (
          <mesh key={sx} position={[sx, 1.24 + CR[1] / 2, 0]}>
            <boxGeometry args={[0.12, CR[1] + 0.06, CR[2] + 0.06]} />
            <meshStandardMaterial color={LEMON} transparent opacity={0.85} />
          </mesh>
        ))}
      </>
    ) : null}
  </group>
);

// ===== Аист с ящиком на тросе =====
const LOAD_PLAN: DronePlan = {
  stays: [
    {at: 0, x: -3.4, y: 3.1, z: 1.2, yaw: 0},
    {at: 0.6, x: -3.4, y: 3.1, z: 1.2, yaw: 0},
    {at: 1.6, x: -3.4, y: 5.2, z: 1.2, yaw: 0},
    {at: 3.0, x: 0.6, y: 5.6, z: 0.4, yaw: 0},
    {at: 4.2, x: 1.2, y: 5.4, z: 0.4, yaw: 0},
    {at: 5.4, x: 1.2, y: 4.85, z: 0.4, yaw: 0},
    {at: 6.4, x: 1.2, y: 4.85, z: 0.4, yaw: 0},
    {at: 8.6, x: 6.4, y: 7.6, z: -1.2, yaw: 0},
  ],
};
const ROPE = 3.1 - CR[1] / 2 - 0.55; // длина троса: ящик стоит на земле, пока дрон на высоте 3,1
const loadCrate = (t: number) => {
  const st = droneState(LOAD_PLAN, t, "cargo");
  const swing = Math.max(-0.42, Math.min(0.42, -st.a.x * 0.05 - st.v.x * 0.04));
  const y = Math.max(CR[1] / 2, st.pos.y - 0.55 - ROPE);
  const onTruck = t > 5.4;
  const p: V3 = onTruck ? [1.2, 1.24 + CR[1] / 2, 0.4] : [st.pos.x + Math.sin(swing) * ROPE, y, st.pos.z];
  return {p, swing: onTruck ? 0 : swing, drone: st, attached: t < 6.2};
};

export const BORDER_CAM: Record<BorderId, Cam> = {
  crateDark: {pos: [3.0, 2.3, 3.0], target: [0, 0.9, 0], fov: 50},
  crateLoad: {pos: [-0.8, 5.0, 12.0], target: [-0.4, 2.6, 0.2], fov: 46},
  barrier: {pos: [-3.0, 5.4, 11.6], target: [1.6, 1.8, 0], fov: 48},
  svh: {pos: [3.6, 3.6, 7.6], target: [0, 1.0, 0], fov: 44},
  gate: {pos: [3.4, 4.2, 9.0], target: [0.2, 1.6, -0.4], fov: 46},
  borderOpen: {pos: [-3.0, 5.4, 11.6], target: [1.6, 1.8, 0], fov: 48},
  unbox: {pos: [4.6, 3.6, 7.4], target: [0.8, 0.9, 0], fov: 44},
};
export const borderState = (w: BorderId, t: number) => {
  if (w === "crateLoad") return {alarm: t > 2.6 && t < 5.4};
  return {alarm: false};
};

export const BorderWorld: React.FC<{w: BorderId; t: number}> = ({w, t}) => {
  if (w === "crateDark") {
    // кузов изнутри: гофрированные стены, ящик посередине; пока едем — по стенам бегут полосы света; встали — красный свет
    const moving = t < 2.3;
    return (
      <>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[9, 0.1, 4]} />
          <meshStandardMaterial color="#4A3B2C" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.6, -2.0]}>
          <boxGeometry args={[9, 3.4, 0.08]} />
          <meshStandardMaterial color="#2C3238" roughness={0.8} />
        </mesh>
        {Array.from({length: 20}, (_, k) => (
          <mesh key={k} position={[-4.4 + k * 0.46, 1.6, -1.94]}>
            <boxGeometry args={[0.1, 3.3, 0.06]} />
            <meshStandardMaterial color="#3A424A" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[-4.5, 1.6, 0]}>
          <boxGeometry args={[0.08, 3.4, 4]} />
          <meshStandardMaterial color="#2C3238" roughness={0.8} />
        </mesh>
        {/* полосы света через щели дверей */}
        {moving
          ? [0, 1, 2].map((k) => {
              const x = 4.4 - (((t * 3.2 + k * 3) % 9) as number);
              return (
                <mesh key={k} position={[x, 1.6, -1.9]}>
                  <boxGeometry args={[0.16, 3.0, 0.02]} />
                  <meshBasicMaterial color="#FFF2C8" transparent opacity={0.55} />
                </mesh>
              );
            })
          : null}
        {!moving ? <pointLight position={[3.6, 2.2, 1.0]} intensity={4 + 3 * Math.sin(t * 9)} distance={8} color={RED} /> : null}
        <Crate p={[0, CR[1] / 2, 0]} t={t} roll={moving ? Math.sin(t * 11) * 0.012 : 0} />
        {/* свет внутри ящика: сквозь щели виден Шустрик */}
        <pointLight position={[0.2, 1.1, 0.3]} intensity={2.2} distance={2.6} color="#FFF4C8" />
      </>
    );
  }
  if (w === "crateLoad") {
    const c = loadCrate(t);
    const ind = t > 2.7 ? 1 : 0;
    return (
      <>
        <Road />
        <Containers />
        <Truck x={2.3} crate={false} t={t} />
        <DroneModel kind="cargo" t={t} plan={LOAD_PLAN} />
        {c.attached ? (
          <mesh position={[(c.drone.pos.x + c.p[0]) / 2, (c.drone.pos.y - 0.5 + c.p[1] + CR[1] / 2) / 2, c.p[2]]} rotation={[0, 0, c.swing]}>
            <cylinderGeometry args={[0.03, 0.03, Math.max(0.1, c.drone.pos.y - 0.5 - c.p[1] - CR[1] / 2), 8]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        ) : null}
        <Crate p={c.p} roll={0} yaw={0} t={t} ind={ind} />
        <group position={[c.p[0], 0, c.p[2]]}>{t < 0.7 ? <Shadow w={3} d={2.2} o={0.5} /> : null}</group>
      </>
    );
  }
  if (w === "barrier" || w === "borderOpen") {
    const open = w === "borderOpen";
    const armUp = open ? sm((t - 0.4) / 1.0) : 0;
    const tx = open ? -2.2 + Math.max(0, t - 1.4) * Math.max(0, t - 1.4) * 0.55 : -8 + 6.0 * sm(t / 2.6);
    const aist: DronePlan = {stays: [{at: 0, x: -6, y: 7.4, z: -1.0}, {at: 7, x: 9, y: 8.0, z: -1.0}]};
    return (
      <>
        <Road />
        <Containers />
        <Post armUp={armUp} light={open && t > 0.6 ? "green" : "red"} t={t} />
        <Truck x={tx} t={t} />
        <Worker3D x={3.0} z={-2.9} yaw={-Math.PI / 2 + 0.6} crouch={0} jacket="#4A6B4A" stripe={false} hat="cap" />
        {open ? <DroneModel kind="cargo" t={t} plan={aist} /> : null}
      </>
    );
  }
  if (w === "svh") {
    return (
      <>
        <Road night />
        <Containers z={-6.2} night />
        {/* сетка ограждения по двум сторонам */}
        {Array.from({length: 7}, (_, i) => (
          <mesh key={i} position={[-4.2 + i * 1.4, 1.2, -2.6]}>
            <boxGeometry args={[0.08, 2.4, 0.08]} />
            <meshStandardMaterial color="#5C6168" />
          </mesh>
        ))}
        <mesh position={[0, 1.2, -2.6]}>
          <boxGeometry args={[8.4, 2.2, 0.02]} />
          <meshStandardMaterial color="#9AA0A6" transparent opacity={0.3} />
        </mesh>
        {Array.from({length: 4}, (_, i) => (
          <mesh key={`s${i}`} position={[-4.2, 1.2, -2.6 + i * 1.6]}>
            <boxGeometry args={[0.08, 2.4, 0.08]} />
            <meshStandardMaterial color="#5C6168" />
          </mesh>
        ))}
        <mesh position={[-4.2, 1.2, -0.2]}>
          <boxGeometry args={[0.02, 2.2, 4.8]} />
          <meshStandardMaterial color="#9AA0A6" transparent opacity={0.3} />
        </mesh>
        {/* фонарь */}
        <mesh position={[2.6, 2.6, -1.6]}>
          <cylinderGeometry args={[0.07, 0.09, 5.2, 10]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[2.0, 5.2, -1.6]}>
          <boxGeometry args={[1.3, 0.14, 0.4]} />
          <meshStandardMaterial color={INK} emissive="#FFE2A8" emissiveIntensity={0.6} />
        </mesh>
        <pointLight position={[1.6, 4.6, -1.2]} intensity={5} distance={9} color="#FFE2A8" />
        <mesh position={[0.8, 2.6, -0.6]} rotation={[0, 0, 0.18]}>
          <coneGeometry args={[2.0, 5.0, 24, 1, true]} />
          <meshBasicMaterial color="#FFE9B8" transparent opacity={0.08} depthWrite={false} />
        </mesh>
        <Crate p={[0, CR[1] / 2, 0]} t={t} />
        <Shadow w={3.2} d={2.4} o={0.6} />
        {/* снег */}
        {Array.from({length: 60}, (_, i) => (
          <mesh key={`f${i}`} position={[-4 + rnd(i, 1) * 8 + Math.sin(t + i) * 0.2, 6 - ((rnd(i, 2) * 6 + t * 0.9) % 6), -2.4 + rnd(i, 3) * 5]}>
            <sphereGeometry args={[0.035, 6, 4]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
      </>
    );
  }
  if (w === "gate") {
    // ворота цеха и ящик на площадке рядом: Скаут меряет проём (лимонная мерка) и ящик (красная — шире проёма)
    const m1 = sm((t - 1.0) / 0.8);
    const m2 = sm((t - 2.2) / 0.8);
    const DOOR_W = 2.0;
    return (
      <>
        <MockFloor w={20} d={12} p={[0, 0, -0.5]} tone="#D6D2CA" />
        <mesh position={[-2.6, 2.6, -2.6]}>
          <boxGeometry args={[9, 5.2, 0.3]} />
          <meshStandardMaterial color="#E4DED3" roughness={0.95} />
        </mesh>
        {/* проём ворот (тёмный) с рамой */}
        <mesh position={[-1.4, 1.4, -2.42]}>
          <boxGeometry args={[DOOR_W, 2.8, 0.04]} />
          <meshStandardMaterial color="#3A3D42" />
        </mesh>
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[-1.4 + (sd * (DOOR_W + 0.16)) / 2, 1.45, -2.38]}>
            <boxGeometry args={[0.16, 2.9, 0.12]} />
            <meshStandardMaterial color="#E89A2C" />
          </mesh>
        ))}
        {/* мерка проёма */}
        <mesh position={[-1.4, 3.2, -2.3]} scale={[m1, 1, 1]}>
          <boxGeometry args={[DOOR_W, 0.12, 0.05]} />
          <meshBasicMaterial color={LEMON} />
        </mesh>
        {/* ящик на площадке перед воротами и его мерка */}
        <Crate p={[2.4, CR[1] / 2, 0.6]} yaw={Math.PI / 2} t={t} />
        <mesh position={[2.4, CR[1] + 0.35, 0.6]} rotation={[0, Math.PI / 2, 0]} scale={[m2, 1, 1]}>
          <boxGeometry args={[CR[0], 0.12, 0.05]} />
          <meshBasicMaterial color={RED} />
        </mesh>
        <DogModel t={t} plan={{stays: [{at: 0, x: -1.4, z: 1.8, yaw: Math.PI / 2}, {at: 1.2, x: -1.4, z: 0.2, yaw: Math.PI / 2}, {at: 2.4, x: 0.6, z: 1.6, yaw: 0}]}} />
        <group position={[-0.4, 0, 1.0]}>
          <LidarSweep t={t} range={3.0} y={0.45} o={t > 0.6 ? 1 : 0} />
        </group>
      </>
    );
  }
  // unbox: передняя стенка опускается пандусом, Шустрик выезжает
  const open = sm((t - 0.6) / 1.0);
  return (
    <>
      <MockFloor w={20} d={12} p={[0, 0, -0.5]} tone="#D6D2CA" />
      <mesh position={[0, 2.6, -3.2]}>
        <boxGeometry args={[14, 5.2, 0.3]} />
        <meshStandardMaterial color="#E4DED3" roughness={0.95} />
      </mesh>
      <Crate p={[-1.2, CR[1] / 2, 0]} t={t} open={open} robot={false} />
      <AgvModel t={t} plan={{stays: [{at: 0, x: -1.2, z: 0, yaw: 0}, {at: 1.8, x: -1.2, z: 0, yaw: 0}, {at: 4.4, x: 3.0, z: 0.6, yaw: 0}], speed: 1.6}} />
      <DroneModel kind="cargo" t={t} plan={{stays: [{at: 0, x: 4.2, y: 0, z: -1.6, yaw: -0.6}], land: [-1]}} />
    </>
  );
};
