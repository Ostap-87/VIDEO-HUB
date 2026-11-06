// «Робокитай», серия 5 · Шанхай (06.11.2026) — гостиница: коридор с номерами (ковровая дорожка, бра, двери с табличками),
// лифт с раздвижными дверями и панелью вызова, ресепшен ночью. Кэрри (`WheelHumanoidModel skin="navy"`) везёт полотенца
// (короб у груди, сверху сложенные полотенца). 1 ед. ≈ 0,5 м: дверь 4,2 ед., коридор 3,2 ед.
// Миры (`HotelWorld`, время `t` — секунды шага):
// - hotelDesk — холодное открытие: ресепшен ночью, администратор один, звонит телефон;
// - hotelLift — лифт без модуля связи: Кэрри подъезжает, кнопка мигает красным, двери не открываются;
// - hotelNight — ночь: администратор остаётся за стойкой, Кэрри едет к лифту с модулем (лимонный огонёк), двери открываются;
// - hotelFix — седьмой этаж: Кэрри выезжает из лифта и едет по коридору к номеру;
// - hotelDoor — у номера: дверь открывается, гость забирает полотенца.
import React from "react";
import * as THREE from "three";
import {WheelHumanoidModel, wheelBoxAt, type WheelCarry, type WheelPlan} from "../../components/aura3d/AuraWheelHumanoid";
import {CargoBox, Shadow, type Cam, type V3} from "../../components/aura3d/kit";
import {Worker3D} from "./drama3d";

export type HotelId = "hotelDesk" | "hotelLift" | "hotelNight" | "hotelFix" | "hotelDoor";
const LEMON = "#FFF65D";
const RED = "#E5383B";
const INK = "#262626";
const WALL = "#EDE6DA";
const WOOD = "#8B6A4E";
const sm = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};
const WZ = -1.7; // дальняя стена коридора
const LIFT_X = 4.6;

// ===== детали =====
const Door: React.FC<{x: number; open?: number; num?: boolean}> = ({x, open = 0, num = true}) => (
  <group position={[x, 0, WZ + 0.04]}>
    <mesh position={[0, 2.15, 0]}>
      <boxGeometry args={[1.95, 4.4, 0.08]} />
      <meshStandardMaterial color="#5C4634" roughness={0.6} />
    </mesh>
    {/* полотно на петлях слева: open 0…1 → поворот внутрь номера */}
    <group position={[-0.86, 0, 0.05]} rotation={[0, -open * 1.6, 0]}>
      <mesh position={[0.86, 2.08, 0]}>
        <boxGeometry args={[1.72, 4.16, 0.08]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      <mesh position={[0.86, 2.95, 0.05]}>
        <boxGeometry args={[1.3, 1.4, 0.02]} />
        <meshStandardMaterial color="#7A5B42" roughness={0.6} />
      </mesh>
      <mesh position={[0.86, 1.1, 0.05]}>
        <boxGeometry args={[1.3, 1.4, 0.02]} />
        <meshStandardMaterial color="#7A5B42" roughness={0.6} />
      </mesh>
      <mesh position={[1.5, 2.0, 0.1]}>
        <boxGeometry args={[0.08, 0.36, 0.08]} />
        <meshStandardMaterial color="#D8C37A" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
    {num ? (
      <mesh position={[1.35, 3.0, 0.06]}>
        <boxGeometry args={[0.42, 0.3, 0.03]} />
        <meshStandardMaterial color={LEMON} emissive={LEMON} emissiveIntensity={0.3} roughness={0.4} />
      </mesh>
    ) : null}
  </group>
);
const Sconce: React.FC<{x: number; on?: number}> = ({x, on = 1}) => (
  <group position={[x, 3.3, WZ + 0.1]}>
    <mesh>
      <cylinderGeometry args={[0.18, 0.12, 0.34, 16]} />
      <meshStandardMaterial color="#FFF3D0" emissive="#FFD98A" emissiveIntensity={0.9 * on} roughness={0.4} />
    </mesh>
    {on > 0.5 ? <pointLight position={[0, 0, 0.4]} intensity={1.2 * on} distance={4} color="#FFD9A0" /> : null}
  </group>
);
// лифт: проём в стене, кабина со светом, две створки (open 0…1), панель вызова справа, табло сверху; module — блок связи с лифтом
const Lift: React.FC<{open: number; call: "off" | "red" | "lemon"; module?: number; t: number}> = ({open, call, module = 0, t}) => {
  const blink = call === "red" ? (Math.floor(t * 3) % 2 ? 1 : 0.15) : 1;
  return (
    <group position={[LIFT_X, 0, WZ]}>
      {/* кабина */}
      <mesh position={[0, 2.25, -1.3]}>
        <boxGeometry args={[2.4, 4.5, 0.06]} />
        <meshStandardMaterial color="#E9E2D2" emissive="#FFF4DA" emissiveIntensity={0.25} />
      </mesh>
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 2.25, -0.65]}>
          <boxGeometry args={[0.06, 4.5, 1.3]} />
          <meshStandardMaterial color="#D9D2C2" />
        </mesh>
      ))}
      <mesh position={[0, 0.02, -0.65]}>
        <boxGeometry args={[2.4, 0.04, 1.3]} />
        <meshStandardMaterial color="#9C9488" />
      </mesh>
      <mesh position={[0, 4.45, -0.65]}>
        <boxGeometry args={[2.0, 0.05, 1.0]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFF6DD" emissiveIntensity={1.2} />
      </mesh>
      {/* портал и створки */}
      <mesh position={[0, 4.75, 0.02]}>
        <boxGeometry args={[2.9, 0.5, 0.12]} />
        <meshStandardMaterial color="#9AA0A6" metalness={0.7} roughness={0.3} />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 1.33, 2.25, 0.02]}>
          <boxGeometry args={[0.24, 4.5, 0.12]} />
          <meshStandardMaterial color="#9AA0A6" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {[-1, 1].map((sd) => (
        <mesh key={`d${sd}`} position={[sd * (0.6 + open * 1.15), 2.25, 0.04]}>
          <boxGeometry args={[1.2, 4.5, 0.06]} />
          <meshStandardMaterial color="#C9CFD4" metalness={0.85} roughness={0.22} />
        </mesh>
      ))}
      {/* табло над дверью */}
      <mesh position={[0, 4.75, 0.1]}>
        <boxGeometry args={[0.7, 0.26, 0.04]} />
        <meshStandardMaterial color="#121214" emissive={call === "lemon" ? LEMON : "#5A2020"} emissiveIntensity={0.6} />
      </mesh>
      {/* панель вызова */}
      <group position={[1.95, 2.3, 0.05]}>
        <mesh>
          <boxGeometry args={[0.32, 0.7, 0.05]} />
          <meshStandardMaterial color="#9AA0A6" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.1, 0.04]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 20]} />
          <meshStandardMaterial color={call === "off" ? "#D9D7D5" : call === "red" ? RED : LEMON} emissive={call === "off" ? "#000000" : call === "red" ? RED : LEMON} emissiveIntensity={call === "off" ? 0 : 2 * blink} />
        </mesh>
        {/* модуль связи с лифтом: коробка с лимонным диодом и кабелем к панели */}
        {module > 0 ? (
          <group position={[0, 0.75, 0]} scale={module}>
            <mesh>
              <boxGeometry args={[0.42, 0.3, 0.12]} />
              <meshStandardMaterial color="#F1EDE6" roughness={0.45} />
            </mesh>
            <mesh position={[0.12, 0.05, 0.07]}>
              <sphereGeometry args={[0.04, 12, 8]} />
              <meshBasicMaterial color={LEMON} />
            </mesh>
            <mesh position={[0, -0.32, 0.02]}>
              <cylinderGeometry args={[0.02, 0.02, 0.36, 8]} />
              <meshStandardMaterial color={INK} />
            </mesh>
          </group>
        ) : null}
      </group>
    </group>
  );
};
// стены с проёмом под лифт, дорожка, плинтус
const Corridor: React.FC<{night?: boolean; lights?: number}> = ({night, lights = 1}) => (
  <>
    <mesh position={[0, -0.05, -0.2]}>
      <boxGeometry args={[16, 0.1, 3.6]} />
      <meshStandardMaterial color="#C9B49A" roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.005, -0.1]}>
      <boxGeometry args={[16, 0.02, 2.4]} />
      <meshStandardMaterial color={night ? "#5E2B2B" : "#7E3A3A"} roughness={1} />
    </mesh>
    {[-1.24, 1.04].map((z) => (
      <mesh key={z} position={[0, 0.02, z]}>
        <boxGeometry args={[16, 0.02, 0.08]} />
        <meshStandardMaterial color="#D8B65A" roughness={0.7} />
      </mesh>
    ))}
    {/* дальняя стена: слева от лифта, справа от лифта, перемычка над ним */}
    <mesh position={[(-8 + LIFT_X - 1.45) / 2, 2.6, WZ - 0.1]}>
      <boxGeometry args={[LIFT_X - 1.45 + 8, 5.2, 0.2]} />
      <meshStandardMaterial color={night ? "#B8B0A2" : WALL} roughness={0.95} />
    </mesh>
    <mesh position={[(LIFT_X + 1.45 + 8) / 2, 2.6, WZ - 0.1]}>
      <boxGeometry args={[8 - LIFT_X - 1.45, 5.2, 0.2]} />
      <meshStandardMaterial color={night ? "#B8B0A2" : WALL} roughness={0.95} />
    </mesh>
    <mesh position={[LIFT_X, 4.95, WZ - 0.1]}>
      <boxGeometry args={[2.9, 0.5, 0.2]} />
      <meshStandardMaterial color={night ? "#B8B0A2" : WALL} roughness={0.95} />
    </mesh>
    {/* панель-обшивка снизу */}
    <mesh position={[-1.5, 0.6, WZ + 0.01]}>
      <boxGeometry args={[11.9, 1.2, 0.04]} />
      <meshStandardMaterial color={night ? "#A89C88" : "#D8CDBD"} roughness={0.9} />
    </mesh>
    {[-4.9, -1.9, 1.3].map((x) => (
      <Sconce key={x} x={x} on={lights} />
    ))}
  </>
);
// короб с полотенцами в руках у Кэрри (полотенца сверху — белые «подушки»)
const Towels: React.FC<{plan: WheelPlan; c: WheelCarry; t: number}> = ({plan, c, t}) => {
  const b = wheelBoxAt(plan, c, t);
  const s = c.s ?? [0.5, 0.3, 0.42];
  return (
    <group position={[b.world.x, b.world.y + s[1] / 2, b.world.z]} rotation={[0, b.yaw, 0]}>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[0, 0.06 + k * 0.09, 0]} rotation={[0, k * 0.08, 0]}>
          <boxGeometry args={[s[0] * 0.86, 0.08, s[2] * 0.8]} />
          <meshStandardMaterial color={k === 1 ? "#F4F1EA" : "#FFFFFF"} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};
const TOWEL_S: V3 = [0.6, 0.32, 0.46];
const holding = (from: V3): WheelCarry => ({at: -3, from, until: 999, to: from, s: TOWEL_S});

// ===== ресепшен ночью =====
const Desk: React.FC<{x: number; ring?: number; t: number}> = ({x, ring = 0, t}) => (
  <group position={[x, 0, 0]}>
    <mesh position={[0, 1.05, 0]}>
      <boxGeometry args={[4.2, 2.1, 1.0]} />
      <meshStandardMaterial color={WOOD} roughness={0.55} />
    </mesh>
    <mesh position={[0, 2.14, 0]}>
      <boxGeometry args={[4.5, 0.1, 1.3]} />
      <meshStandardMaterial color="#F1EDE6" roughness={0.4} />
    </mesh>
    <mesh position={[0, 1.2, 0.51]}>
      <boxGeometry args={[3.6, 0.12, 0.02]} />
      <meshStandardMaterial color={LEMON} emissive={LEMON} emissiveIntensity={0.25} />
    </mesh>
    {/* телефон на стойке: звонит — подпрыгивает и светится */}
    <group position={[-1.4, 2.26 + (ring > 0 ? Math.abs(Math.sin(t * 22)) * 0.05 * ring : 0), 0.2]} rotation={[0, 0.3, ring > 0 ? Math.sin(t * 30) * 0.08 * ring : 0]}>
      <mesh>
        <boxGeometry args={[0.5, 0.14, 0.4]} />
        <meshStandardMaterial color={INK} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.12, -0.04]}>
        <capsuleGeometry args={[0.06, 0.42, 6, 10]} />
        <meshStandardMaterial color={INK} roughness={0.4} />
      </mesh>
      <mesh position={[0.16, 0.08, 0.12]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshBasicMaterial color={ring > 0 && Math.floor(t * 6) % 2 ? RED : "#5A2020"} />
      </mesh>
    </group>
    {/* настольная лампа */}
    <group position={[1.5, 2.2, -0.1]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <coneGeometry args={[0.22, 0.26, 18, 1, true]} />
        <meshStandardMaterial color="#2B6CB0" side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 0.4, 0.2]} intensity={2.2} distance={4} color="#FFE2A8" />
    </group>
    <Shadow w={4.8} d={1.8} o={0.5} />
  </group>
);
const Lobby: React.FC<{night?: boolean}> = ({night}) => (
  <>
    <mesh position={[0, -0.05, -0.2]}>
      <boxGeometry args={[16, 0.1, 4.6]} />
      <meshStandardMaterial color={night ? "#8F877A" : "#C9B49A"} roughness={0.5} metalness={0.05} />
    </mesh>
    <mesh position={[(-8 + LIFT_X - 1.45) / 2, 2.6, WZ - 0.1]}>
      <boxGeometry args={[LIFT_X - 1.45 + 8, 5.2, 0.2]} />
      <meshStandardMaterial color={night ? "#A69C8C" : WALL} roughness={0.95} />
    </mesh>
    <mesh position={[(LIFT_X + 1.45 + 8) / 2, 2.6, WZ - 0.1]}>
      <boxGeometry args={[8 - LIFT_X - 1.45, 5.2, 0.2]} />
      <meshStandardMaterial color={night ? "#A69C8C" : WALL} roughness={0.95} />
    </mesh>
    <mesh position={[LIFT_X, 4.95, WZ - 0.1]}>
      <boxGeometry args={[2.9, 0.5, 0.2]} />
      <meshStandardMaterial color={night ? "#A69C8C" : WALL} roughness={0.95} />
    </mesh>
    {/* доска с ключами за стойкой */}
    <mesh position={[-2.6, 3.3, WZ + 0.02]}>
      <boxGeometry args={[2.4, 1.3, 0.06]} />
      <meshStandardMaterial color={WOOD} roughness={0.6} />
    </mesh>
    {Array.from({length: 12}, (_, i) => (
      <mesh key={i} position={[-3.55 + (i % 6) * 0.38, 3.65 - Math.floor(i / 6) * 0.6, WZ + 0.08]}>
        <boxGeometry args={[0.12, 0.26, 0.04]} />
        <meshStandardMaterial color={i === 7 ? "#7A5B42" : "#D8C37A"} metalness={0.6} roughness={0.3} />
      </mesh>
    ))}
  </>
);

// ===== планы Кэрри =====
const LIFT_STOP: [number, number] = [LIFT_X - 0.3, 0.55];
const liftPlan: WheelPlan = {
  stays: [
    {at: 0, x: -5.4, z: 0.25, yaw: 0},
    {at: 4.2, x: LIFT_STOP[0] - 1.4, z: 0.4, yaw: 0},
    {at: 5.0, x: LIFT_STOP[0] - 1.3, z: 0.4, yaw: 0.6},
  ],
  speed: 2.4,
  lift: [[0, 0.35]],
  gestures: [{at: 6.6, kind: "look"}],
  carry: [holding([-5.0, 1.6, 0.25])],
};
const nightPlan: WheelPlan = {
  stays: [
    {at: 0, x: -2.2, z: 1.0, yaw: 0},
    {at: 3.0, x: LIFT_X, z: 0.9, yaw: 0},
    {at: 3.9, x: LIFT_X, z: 0.9, yaw: Math.PI / 2},
    {at: 6.2, x: LIFT_X, z: -2.2, yaw: Math.PI / 2},
  ],
  speed: 2.4,
  lift: [[0, 0.35]],
  carry: [holding([-2.0, 1.6, 1.0])],
};
const fixPlan: WheelPlan = {
  stays: [
    {at: 0, x: LIFT_X, z: -2.4, yaw: -Math.PI / 2},
    {at: 1.6, x: LIFT_X, z: 0.3, yaw: -Math.PI / 2},
    {at: 2.4, x: LIFT_X - 0.2, z: 0.3, yaw: Math.PI},
    {at: 6.4, x: -0.3, z: 0.3, yaw: Math.PI},
  ],
  speed: 2.4,
  lift: [[0, 0.35]],
  gestures: [{at: 0.3, kind: "nod"}],
  carry: [holding([LIFT_X, 1.6, -2.4])],
};
const DOOR_X = 0.4;
const doorPlan: WheelPlan = {
  stays: [
    {at: 0, x: DOOR_X + 2.6, z: 0.3, yaw: Math.PI},
    {at: 1.6, x: DOOR_X + 0.6, z: 0.15, yaw: Math.PI},
    {at: 2.3, x: DOOR_X + 0.6, z: 0.15, yaw: Math.PI * 0.62},
  ],
  speed: 2.2,
  lift: [[0, 0.35]],
  gestures: [{at: 4.6, kind: "nod"}],
  carry: [holding([DOOR_X + 2.4, 1.6, 0.3])],
};

export const HOTEL_CAM: Record<HotelId, Cam> = {
  hotelDesk: {pos: [2.4, 4.6, 8.6], target: [0.2, 1.9, -0.6], fov: 44},
  hotelLift: {pos: [0.6, 4.6, 8.6], target: [1.2, 2.0, -0.6], fov: 50},
  hotelNight: {pos: [1.6, 4.8, 9.6], target: [1.4, 2.0, -0.6], fov: 48},
  hotelFix: {pos: [1.8, 4.6, 8.8], target: [1.8, 2.0, -0.6], fov: 48},
  hotelDoor: {pos: [2.6, 4.0, 6.6], target: [0.9, 2.0, -0.8], fov: 46},
};
export const hotelState = (w: HotelId, t: number) => {
  return {alarm: false && w === "hotelLift" && t > 0};
};

export const HotelWorld: React.FC<{w: HotelId; t: number}> = ({w, t}) => {
  if (w === "hotelDesk") {
    return (
      <>
        <Lobby night />
        <Desk x={-1.0} ring={t > 0.6 ? 1 : 0} t={t} />
        <Worker3D x={-0.6} z={-1.0} yaw={-Math.PI / 2} crouch={0} jacket="#1F2A5A" stripe={false} hat="hair" />
        <Lift open={0} call="off" t={t} />
      </>
    );
  }
  if (w === "hotelLift") {
    const c = liftPlan.carry![0];
    return (
      <>
        <Corridor />
        <Door x={-4.6} />
        <Door x={-1.0} />
        <Lift open={0} call={t > 5.0 ? "red" : "off"} t={t} />
        <WheelHumanoidModel skin="navy" t={t} plan={liftPlan} />
        <Towels plan={liftPlan} c={c} t={t} />
      </>
    );
  }
  if (w === "hotelNight") {
    const open = sm((t - 3.0) / 0.8) * (1 - sm((t - 6.4) / 0.8));
    const c = nightPlan.carry![0];
    return (
      <>
        <Lobby night />
        <Desk x={-1.6} t={t} />
        <Worker3D x={-1.2} z={-1.0} yaw={-Math.PI / 2} crouch={0} jacket="#1F2A5A" stripe={false} hat="hair" />
        <Lift open={open} call="lemon" module={1} t={t} />
        <WheelHumanoidModel skin="navy" t={t} plan={nightPlan} />
        <Towels plan={nightPlan} c={c} t={t} />
      </>
    );
  }
  if (w === "hotelFix") {
    const open = 1 - sm((t - 2.6) / 0.8);
    const c = fixPlan.carry![0];
    return (
      <>
        <Corridor />
        <Door x={-4.6} />
        <Door x={-1.0} />
        <Door x={2.1} />
        <Lift open={open} call="lemon" module={1} t={t} />
        <WheelHumanoidModel skin="navy" t={t} plan={fixPlan} />
        <Towels plan={fixPlan} c={c} t={t} />
      </>
    );
  }
  // hotelDoor: дверь открывается, гость забирает полотенца
  const c = doorPlan.carry![0];
  const open = sm((t - 2.2) / 0.9);
  const guestIn = sm((t - 2.6) / 0.8);
  const handed = t > 3.9;
  const towelsAt: V3 = [DOOR_X + 0.15 - 0.55 * sm((t - 3.9) / 0.6), 1.7, -0.9 - 0.4 * sm((t - 3.9) / 0.6)];
  return (
    <>
      <Corridor />
      <Door x={DOOR_X} open={open} />
      <Door x={-3.6} />
      <Door x={4.0} />
      {/* номер за дверью: тёплый свет */}
      <mesh position={[DOOR_X, 2.1, WZ - 1.2]}>
        <boxGeometry args={[2.2, 4.2, 0.1]} />
        <meshStandardMaterial color="#F6E6C8" emissive="#FFE3B0" emissiveIntensity={0.5} />
      </mesh>
      <Worker3D x={DOOR_X - 0.2} z={WZ - 0.9 + guestIn * 0.7} yaw={-Math.PI / 2} crouch={0} jacket="#F4F1EA" stripe={false} hat="hair" box={handed} boxColor="#FFFFFF" />
      <WheelHumanoidModel skin="navy" t={t} plan={doorPlan} />
      {!handed ? <Towels plan={doorPlan} c={c} t={t} /> : null}
      {handed && t < 4.5 ? <CargoBox s={[0.3, 0.2, 0.3]} p={towelsAt} /> : null}
    </>
  );
};
