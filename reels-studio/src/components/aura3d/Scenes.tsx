// Сцены применения Aura для объясняющих роликов (решение пользователя 05.11.2026: «показывать как робот подходит к конвейеру и
// несёт коробку, а собака не только танцует, а например идёт и сканирует пещеру или тёмный склад»). Каждая сцена — компонент
// с props, ставится в Stage (кроме DarkScan — у неё своя тёмная сцена с фоном) и считает время от начала своего Sequence:
// - ConveyorCarryScene — гуманоид на колёсах подъезжает к конвейеру, опускает торс, берёт коробку двумя руками, сдаёт назад,
//   разворачивается и ставит коробку на поднятую площадку AGV, затем приглашающий жест (~14 с);
// - ArmPalletScene — манипулятор быстро («щёлк») снимает коробки с упора конвейера и кладёт на поддон 2 × 2 (по 2,6 с на коробку);
// - DarkScan — тёмный склад (`kind: "warehouse"`) или пещера (`"cave"`), версия 2 (05.11.2026): реалистичный мир, свет, тени,
//   отражения, лидар с облаком точек на настоящих поверхностях, переход «как видим мы → как видит робот», HUD и карта SLAM
//   (мир и 3D — DarkWorld.tsx, здесь — HUD и обёртка);
// - DroneRackScan — дрон-инспектор летит вдоль стеллажа, камера на гимбале смотрит на полки, отсканированные коробки получают
//   лимонную рамку и галочку;
// - CargoDelivery — грузовой дрон прилетает с коробкой на тросе, зависает над площадкой, опускает коробку, отпускает и улетает.
import React, {useMemo} from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {Stage, type Cam, type V3} from "./kit";
import {Conveyor, Pallet, Rack, conveyorBoxAt, conveyorStopAt, palletSlot, rackBoxes, type ConveyorProps, type RackProps} from "./Conveyor";
import {WheelHumanoidModel} from "./AuraWheelHumanoid";
import {AgvModel} from "./AuraAgv";
import {ArmModel, HOME, type ArmKey, type ArmItem, type ArmSkin} from "./AuraArm";
import {dogPose, lidarAngle} from "./AuraDog";
import {DEFAULT_WAVES, DarkWorldScene, LIDAR_R, darkWorld, dogTrail, revealedCount, waveState, type DarkKind, type DarkWorldData, type Waves} from "./DarkWorld";
import {ThreeCanvas} from "@remotion/three";
import {DroneModel, DronePad, droneState, type DronePlan} from "./AuraDrone";

const useT = (t?: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return t ?? frame / fps;
};

// ===== гуманоид на колёсах: конвейер → AGV =====
export const CARRY_BOX: V3 = [0.5, 0.36, 0.44];
export const CONVEYOR_CARRY: ConveyorProps = {
  p: [0.2, 0, -1.9],
  len: 3.2,
  h: 1.1,
  speed: 1.0,
  boxes: [{enter: -1.0, pickAt: 4.3, s: CARRY_BOX}, {enter: 1.8, s: CARRY_BOX}, {enter: 4.8, s: CARRY_BOX}, {enter: 7.8, s: CARRY_BOX}, {enter: 10.8, s: CARRY_BOX}],
};
export const CARRY_SECONDS = 13;
// раскладка в глубину (под вертикальный кадр): конвейер сзади, AGV спереди; робот берёт коробку лицом к конвейеру,
// сдаёт назад, разворачивается к зрителю и ставит коробку на поднятую площадку AGV
export const ConveyorCarryScene: React.FC<{t?: number; skin?: "aura" | "navy"}> = ({t: tp, skin}) => {
  const t = useT(tp);
  const from = conveyorBoxAt(CONVEYOR_CARRY, 0, 4.3);
  return (
    <>
      <Conveyor {...CONVEYOR_CARRY} t={t} />
      <AgvModel t={t} plan={{stays: [{at: -10, x: 0.4, z: 1.75, yaw: 0}], lift: [[0, 1]]}} />
      <WheelHumanoidModel
        t={t}
        skin={skin}
        plan={{
          stays: [
            {at: 0, x: -1.8, z: 0, yaw: 0},
            {at: 3.0, x: 1.43, z: -0.9, yaw: Math.PI / 2},
            {at: 5.6, x: 1.43, z: -0.9, yaw: Math.PI / 2},
            {at: 6.4, x: 1.43, z: -0.3, yaw: Math.PI / 2},
            {at: 7.3, x: 1.43, z: -0.3, yaw: -Math.PI / 2},
            {at: 9.6, x: 0.6, z: 0.5, yaw: -Math.PI / 2},
          ],
          lift: [[0, 0.5], [3.0, 0.5], [3.6, 0.12], [4.6, 0.12], [5.4, 0.5], [9.6, 0.5], [10.0, 0.12], [10.8, 0.12], [11.4, 0.5]],
          carry: [{at: 4.3, from, until: 10.4, to: [0.6, 0.82 + CARRY_BOX[1] / 2, 1.34], s: CARRY_BOX, show: 4.3}],
          gestures: [{at: 11.3, kind: "present"}],
        }}
      />
    </>
  );
};

// ===== манипулятор: конвейер → поддон =====
export const PALLET_BOX: V3 = [0.4, 0.36, 0.4];
export const CONVEYOR_PALLET: ConveyorProps = {p: [-1.4, 0, 1.3], len: 3.6, h: 0.9, speed: 0.9, boxes: []};
const PALLET_AT: V3 = [1.45, 0, -0.55];
const CYCLE = 2.6;
export const palletPlan = (n = 4, t0 = 1.2) => {
  const pick = conveyorStopAt(CONVEYOR_PALLET, PALLET_BOX);
  const keys: ArmKey[] = [{at: 0, j: HOME, grip: 0.55}];
  const items: ArmItem[] = [];
  const boxes: NonNullable<ConveyorProps["boxes"]> = [];
  const up = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
  const j1 = (p: V3) => Math.atan2(-p[2], p[0]);
  for (let i = 0; i < n; i++) {
    const T = t0 + i * CYCLE;
    const slot = palletSlot(PALLET_AT, i, PALLET_BOX);
    // коробка доезжает до упора к моменту T (вход заранее: путь / скорость)
    const travel = (CONVEYOR_PALLET.len ?? 3.6) - 0.12 - PALLET_BOX[0] - 0.04;
    boxes.push({enter: T - travel / (CONVEYOR_PALLET.speed ?? 0.9) - 0.4, pickAt: T + 0.62, s: PALLET_BOX});
    keys.push(
      {at: T, p: up(pick, 0.45), tool: Math.PI, j6: -j1(pick), grip: 0.55},
      {at: T + 0.42, p: pick, j6: -j1(pick), grip: 0.55},
      {at: T + 0.6, p: pick, j6: -j1(pick), grip: 0.4},
      {at: T + 0.95, p: up(pick, 0.55), j6: -j1(pick), grip: 0.4},
      {at: T + 1.65, p: up(slot, 0.5), j6: -j1(slot), grip: 0.4},
      {at: T + 1.95, p: slot, j6: -j1(slot), grip: 0.4},
      {at: T + 2.1, p: slot, j6: -j1(slot), grip: 0.55},
      {at: T + 2.45, p: up(slot, 0.5), j6: -j1(slot), grip: 0.55},
    );
    items.push({start: pick, s: PALLET_BOX, carry: [[T + 0.62, T + 2.1]], show: T + 0.62});
  }
  keys.push({at: t0 + n * CYCLE + 0.6, j: HOME, grip: 0.55});
  return {keys, items, boxes};
};
export const PALLET_SECONDS = 12;
export const ArmPalletScene: React.FC<{t?: number; skin?: ArmSkin; n?: number}> = ({t: tp, skin = "industrial", n = 4}) => {
  const t = useT(tp);
  const plan = useMemo(() => palletPlan(n), [n]);
  return (
    <>
      <Conveyor {...CONVEYOR_PALLET} boxes={plan.boxes} t={t} />
      <Pallet p={PALLET_AT} />
      <ArmModel skin={skin} t={t} plan={{keys: plan.keys, items: plan.items}} />
    </>
  );
};

// ===== DarkScan: тёмный склад или пещера, Скаут с фарой и лидаром (05.11.2026, версия 2 — DarkWorld.tsx) =====
const HUD_MONO = "JetBrains Mono, monospace";
const fmtInt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
// значок радара: круг, перекрестье, сектор луча (поворачивается вместе с лидаром)
const Radar: React.FC<{a: number; size?: number}> = ({a, size = 46}) => (
  <svg width={size} height={size} viewBox="-24 -24 48 48" style={{flex: "none"}}>
    <defs>
      <radialGradient id="rdr" r="1">
        <stop offset="0" stopColor="#FFF65D" stopOpacity="0.85" />
        <stop offset="1" stopColor="#FFF65D" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle r="21" fill="rgba(255,246,93,0.06)" stroke="#FFF65D" strokeWidth="2" />
    <circle r="11" fill="none" stroke="rgba(255,246,93,0.45)" strokeWidth="1.5" />
    <path d="M-21 0H21M0 -21V21" stroke="rgba(255,246,93,0.3)" strokeWidth="1.2" />
    <g transform={`rotate(${(-a * 180) / Math.PI})`}>
      <path d="M0 0 L21 0 A21 21 0 0 0 15.4 -14.3 Z" fill="url(#rdr)" />
      <path d="M0 0 L21 0" stroke="#FFFBD0" strokeWidth="2.2" />
    </g>
    <circle r="2.6" fill="#FFF65D" />
  </svg>
);

// карта SLAM в углу: сетка занятости (стены/полки — лимонные, свободный пол — синий), путь собаки, дальность, сектор луча
const SlamMap: React.FC<{world: DarkWorldData; t: number; size: number}> = ({world, t, size}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const S = size * 2;
  React.useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const P = dogPose(world.plan, t);
    const cx = P.root[0];
    const cz = P.root[2];
    const half = 11;
    const k = S / (2 * half);
    const X = (x: number) => S / 2 + (x - cx) * k;
    const Y = (z: number) => S / 2 + (z - cz) * k + S * 0.12;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = "rgba(5,7,11,0.94)";
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let g = Math.ceil((cx - half) / 2) * 2; g < cx + half; g += 2) {
      ctx.beginPath();
      ctx.moveTo(X(g), 0);
      ctx.lineTo(X(g), S);
      ctx.stroke();
    }
    for (let g = Math.ceil((cz - half - 3) / 2) * 2; g < cz + half + 3; g += 2) {
      ctx.beginPath();
      ctx.moveTo(0, Y(g));
      ctx.lineTo(S, Y(g));
      ctx.stroke();
    }
    const G = world.grid;
    const cp = G.cs * k + 0.6;
    for (let iz = 0; iz < G.nz; iz++) {
      const z = G.z0 + iz * G.cs;
      const y = Y(z);
      if (y < -cp || y > S) continue;
      for (let ix = 0; ix < G.nx; ix++) {
        const x = X(G.x0 + ix * G.cs);
        if (x < -cp || x > S) continue;
        const o = G.occT[iz * G.nx + ix];
        const f = G.freeT[iz * G.nx + ix];
        if (o <= t) {
          ctx.fillStyle = t - o < 0.35 ? "#FFFFFF" : "#FFF65D";
          ctx.fillRect(x, y, cp, cp);
        } else if (f <= t) {
          ctx.fillStyle = t - f < 0.35 ? "rgba(140,190,255,0.9)" : "rgba(43,108,176,0.62)";
          ctx.fillRect(x, y, cp, cp);
        }
      }
    }
    // путь
    const tr = dogTrail(world, t);
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    tr.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Y(z)) : ctx.moveTo(X(x), Y(z))));
    ctx.lineTo(X(cx), Y(cz));
    ctx.stroke();
    ctx.setLineDash([]);
    // дальность и сектор луча
    const px = X(cx);
    const py = Y(cz);
    ctx.strokeStyle = "rgba(255,246,93,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, LIDAR_R * k, 0, Math.PI * 2);
    ctx.stroke();
    const th = P.yaw + lidarAngle(t);
    const grd = ctx.createRadialGradient(px, py, 0, px, py, LIDAR_R * k);
    grd.addColorStop(0, "rgba(255,246,93,0.5)");
    grd.addColorStop(1, "rgba(255,246,93,0.02)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, LIDAR_R * k, -th, -th + 0.55);
    ctx.closePath();
    ctx.fill();
    // собака — стрелка по курсу
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-P.yaw);
    ctx.fillStyle = "#FFF65D";
    ctx.strokeStyle = "#0B0D10";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  return <canvas ref={ref} width={S} height={S} style={{width: size, height: size, display: "block", borderRadius: "0 0 12px 12px"}} />;
};

// HUD: слева — «ЛИДАР 360°», счётчик точек, статус; справа — карта SLAM
const ScanHud: React.FC<{world: DarkWorldData; t: number; robot: number; top: number; width: number}> = ({world, t, robot, top, width}) => {
  const scale = React.useMemo(() => 1.2e6 / Math.max(1, revealedCount(world, 7)), [world]);
  const pts = revealedCount(world, t) * scale;
  const P = dogPose(world.plan, t);
  const a = P.yaw + lidarAngle(t);
  const blink = Math.floor(t * 2.2) % 2 === 0;
  const panel: React.CSSProperties = {background: "rgba(8,10,14,0.72)", border: "1.5px solid rgba(255,246,93,0.35)", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.35)"};
  const mapW = 300;
  return (
    <>
      <div style={{position: "absolute", left: 56, top, padding: "14px 20px 16px 16px", fontFamily: HUD_MONO, ...panel}}>
        <div style={{display: "flex", alignItems: "center", gap: 14}}>
          <Radar a={a} />
          <div style={{color: "#FFF65D", fontSize: 34, fontWeight: 700, letterSpacing: "0.06em"}}>ЛИДАР 360°</div>
        </div>
        <div style={{color: "#EDEBE7", fontSize: 28, fontWeight: 500, marginTop: 10, letterSpacing: "0.02em"}}>
          точек: <span style={{color: "#FFFFFF", fontWeight: 700}}>{fmtInt(pts)}</span>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: 10, marginTop: 6, fontSize: 25, color: robot > 0.5 ? "#FFF65D" : "#B4BDC8"}}>
          <span style={{width: 12, height: 12, borderRadius: 6, background: robot > 0.5 ? "#FFF65D" : "#E5383B", opacity: blink ? 1 : 0.25}} />
          {robot > 0.5 ? "так видит робот" : "карта строится"}
        </div>
      </div>
      <div style={{position: "absolute", left: width - 56 - mapW, top, width: mapW, overflow: "hidden", ...panel}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px 8px", fontFamily: HUD_MONO}}>
          <span style={{color: "#FFF65D", fontSize: 21, fontWeight: 700, letterSpacing: "0.1em"}}>КАРТА SLAM</span>
          <span style={{display: "flex", alignItems: "center", gap: 6, color: "#B4BDC8", fontSize: 17}}>
            <span style={{width: (4 * 2 * (mapW - 0)) / (2 * 11) / 2, height: 3, background: "#B4BDC8"}} />2 м
          </span>
        </div>
        <SlamMap world={world} t={t} size={mapW} />
      </div>
    </>
  );
};

export const DARK_SECONDS = 7;
// kind — склад или пещера; t — время сцены (без него — от начала Sequence); waves — переходы «как видим мы → как видит робот → обратно»
// ([начало волны, начало возврата], по умолчанию [[2.5, 4.9]]; false — без переходов); look — принудительно «lit» / «robot» (для кадров);
// hud — HUD (ЛИДАР 360°, точки, карта SLAM), hudTop — его верх (px, под подписью сцены); density — плотность облака точек
export const DarkScan: React.FC<{
  kind?: DarkKind;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  dpr?: number;
  density?: number;
  hud?: boolean;
  hudTop?: number;
  waves?: Waves | false;
  look?: "lit" | "robot";
  t?: number;
}> = ({kind = "warehouse", left = 0, top = 0, width = 1080, height = 1920, dpr = 1, density = 1, hud = true, hudTop = 468, waves = DEFAULT_WAVES, look, t: tp}) => {
  const t = useT(tp);
  const world = useMemo(() => darkWorld(kind, density), [kind, density]);
  const W = waveState(t, waves, look);
  return (
    <div style={{position: "absolute", left, top, width, height, overflow: "hidden", background: "#0B0E12"}}>
      <ThreeCanvas
        width={width}
        height={height}
        dpr={dpr}
        shadows
        gl={{antialias: true, preserveDrawingBuffer: true}}
        camera={{fov: 44, near: 0.05, far: 140, position: [0, 1.5, 5]}}
        style={{position: "absolute", inset: 0}}
      >
        <DarkWorldScene world={world} t={t} waves={waves} look={look} />
      </ThreeCanvas>
      <div style={{position: "absolute", inset: 0, background: "radial-gradient(ellipse 85% 70% at 50% 58%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)"}} />
      {hud ? <ScanHud world={world} t={t} robot={W.robot} top={hudTop} width={width} /> : null}
    </div>
  );
};

// ===== дрон вдоль стеллажа =====
export const SCAN_RACK: RackProps = {p: [-1.4, 0, -1.3], yaw: 0, bays: 6, levels: 4, bayW: 1.4, seed: 11};
export const SCAN_DRONE: DronePlan = {
  stays: [
    {at: 0, x: -6.2, y: 1.35, z: 0.25, yaw: 0},
    {at: 4.6, x: 1.2, y: 1.35, z: 0.25, yaw: 0},
    {at: 5.6, x: 1.6, y: 2.5, z: 0.25, yaw: 0},
    {at: 9.6, x: -5.8, y: 2.5, z: 0.25, yaw: 0},
  ],
  scans: [{at: 0.2, dur: 9.4, kind: "cone", yaw: Math.PI / 2, pitch: 0.1}],
};
export const DRONE_SCAN_SECONDS = 10;
// рамка и галочка на лицевой грани отсканированной коробки
const ScanMark: React.FC<{c: V3; s: V3; yaw: number; k: number}> = ({c, s, yaw, k}) => (
  <group position={c} rotation={[0, yaw, 0]}>
    <group position={[0, 0, s[2] / 2 + 0.006]} scale={0.85 + 0.15 * k}>
      {[
        [0, s[1] / 2, s[0], 0.012],
        [0, -s[1] / 2, s[0], 0.012],
        [s[0] / 2, 0, 0.012, s[1]],
        [-s[0] / 2, 0, 0.012, s[1]],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color="#FFF65D" transparent opacity={0.95 * k} />
        </mesh>
      ))}
      <mesh position={[s[0] * 0.28, s[1] * 0.18, 0.002]}>
        <circleGeometry args={[0.07, 20]} />
        <meshBasicMaterial color="#262626" transparent opacity={k} />
      </mesh>
      <mesh position={[s[0] * 0.28 - 0.02, s[1] * 0.18 - 0.005, 0.004]} rotation={[0, 0, 0.8]}>
        <planeGeometry args={[0.012, 0.045]} />
        <meshBasicMaterial color="#FFF65D" transparent opacity={k} />
      </mesh>
      <mesh position={[s[0] * 0.28 + 0.012, s[1] * 0.18 + 0.005, 0.004]} rotation={[0, 0, -0.65]}>
        <planeGeometry args={[0.012, 0.08]} />
        <meshBasicMaterial color="#FFF65D" transparent opacity={k} />
      </mesh>
    </group>
  </group>
);
export const DroneRackScan: React.FC<{t?: number; skin?: string; plan?: DronePlan; rack?: RackProps}> = ({t: tp, skin, plan = SCAN_DRONE, rack = SCAN_RACK}) => {
  const t = useT(tp);
  const boxes = useMemo(() => rackBoxes(rack), [rack]);
  // момент скана коробки: дрон напротив неё (по x) и на высоте её полки (±0,75)
  const scanned = useMemo(
    () =>
      boxes.map((b) => {
        for (let u = 0; u < 30; u += 1 / 30) {
          const d = droneState(plan, u);
          if (Math.abs(d.pos.x - b.c[0]) < 0.12 && Math.abs(d.pos.y + 0.1 - b.c[1]) < 0.75 && (plan.scans ?? []).some((s) => u >= s.at && u <= s.at + (s.dur ?? 3))) return u;
        }
        return 1e9;
      }),
    [boxes, plan],
  );
  return (
    <>
      <Rack {...rack} />
      {boxes.map((b, k) => (scanned[k] <= t ? <ScanMark key={k} c={b.c} s={b.s} yaw={b.yaw} k={Math.min(1, (t - scanned[k]) / 0.25)} /> : null))}
      <DroneModel t={t} skin={skin} plan={plan} />
    </>
  );
};

// ===== грузовой дрон: доставка на площадку =====
export const DELIVERY_DRONE: DronePlan = {
  stays: [
    {at: 0, x: -6, y: 4.6, z: -3.5, yaw: 0.5},
    {at: 3.4, x: 0, y: 2.6, z: 0, yaw: 0.2},
    {at: 6.6, x: 0, y: 2.6, z: 0, yaw: 0.2},
    {at: 9.4, x: 5.5, y: 5.2, z: -2.5, yaw: 0.0},
  ],
  cargo: {attached: true, s: [0.7, 0.5, 0.6], events: [{at: 5.2, kind: "drop", y: 0.12}]},
};
export const DELIVERY_SECONDS = 9.5;
export const CargoDelivery: React.FC<{t?: number; plan?: DronePlan}> = ({t: tp, plan = DELIVERY_DRONE}) => {
  const t = useT(tp);
  return (
    <>
      <DronePad p={[0, 0, 0]} />
      <DroneModel kind="cargo" t={t} plan={plan} />
    </>
  );
};
