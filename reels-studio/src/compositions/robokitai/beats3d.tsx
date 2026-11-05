// «Робокитай» — 3D-сцены серии на макете склада (панель `ScenePanel`, сцена `Stage` из 3D-арсенала Aura):
// 3. Прибытие — Ави, Скаут (родной край — значок 家 «дом»), Шустрик и Рыжик въезжают, у каждого плашка имени с выноской;
// 4. Испытание — Шустрик (AGV) едет точно по QR-плиткам и встаёт в точку; Рыжик (AMR) строит карту лидаром (вставка
//    «карта» — сетка занятости), на пути падает коробка, маршрут перестраивается, Рыжик объезжает;
// 5. Поворот — у ворот Рыжик застревает на пороге (крупно, снизу, «!»), Скаут сканирует пол лидаром: порог и щель
//    подсвечиваются, выноски, карточка «Робот видит склад снизу» → «Робот проходит: порог до 10 мм, щель до 15 мм»;
// 7. У клиента — 8 тележек по кругу вокруг стеллажей, номера 1…8, порог в воротах убран, итог серии.
// Время моделей — секунды от начала сцены (t передаётся явно), камера — `camAt` по ключам.
import React, {useMemo} from "react";
import * as THREE from "three";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {MascotModel} from "../../components/AuraMascot";
import {Stage, CargoBox, Shadow, pathAt, type Cam, type V3} from "../../components/aura3d/kit";
import {AgvModel, type AgvPlan} from "../../components/aura3d/AuraAgv";
import {DogModel, type DogPlan} from "../../components/aura3d/AuraDog";
import {AgvLite, BoxGlow, Gate, Glint, LEMON3, LidarSweep, LiteRack, MockFloor, PathDashes, QrTile, camAt, curvePath, loopPath, project} from "./scene3d";
import {Alert, BRUSH_CJK, EO, INTER, MONO, NamePlate, PANEL, Paper, RK, ScenePanel, SpecCard, Title, p01, usePop} from "./kit";
import {Sounds, type Snd} from "./beats2d";
import type {RobokitaiProps} from "./types";

const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {f, fps, t: f / fps};
};
// точка 3D → кадр 1080×1920 (через панель)
const toScreen = (p: V3, cam: Cam): [number, number] => {
  const [x, y] = project(p, cam, PANEL.w, PANEL.h);
  return [PANEL.x + x, PANEL.y + y];
};
const HomeBadge: React.FC<{label: string}> = ({label}) => (
  <span style={{display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 6}}>
    <span style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: 9, background: RK.red, color: RK.paper, fontFamily: BRUSH_CJK, fontSize: 36, rotate: "-6deg"}}>家</span>
    <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 32, color: RK.red}}>{label}</span>
  </span>
);

// ===== 3. Прибытие =====
const ARR_CAM: [number, Cam][] = [
  [0, {pos: [0.2, 6.2, 16.6], target: [0.3, 1.1, -0.2], fov: 36}],
  [7.5, {pos: [0.9, 5.7, 15.2], target: [0.5, 1.1, -0.2], fov: 36}],
];
const ZIPPY_ARR: AgvPlan = {speed: 3.4, stays: [{at: 0, x: 12, z: 1.7, yaw: Math.PI}, {at: 2.9, x: 1.7, z: 1.7, yaw: Math.PI}, {at: 3.7, x: 1.7, z: 1.7, yaw: Math.PI + 0.75}]};
const GINGER_ARR: AgvPlan = {speed: 3.4, stays: [{at: 0, x: 14, z: -1.1, yaw: Math.PI}, {at: 4.1, x: 4.4, z: -1.1, yaw: Math.PI}, {at: 4.9, x: 4.4, z: -1.1, yaw: Math.PI + 0.8}]};
const SCOUT_ARR: DogPlan = {stays: [{at: -1, x: -1.0, z: 2.4, yaw: -0.85}], actions: [{at: 0.85, kind: "hop"}, {at: 1.7, kind: "hop"}, {at: 4.7, kind: "stand", dur: 2.3}]};

export const ArrivalBeat: React.FC<{P: RobokitaiProps}> = ({P}) => {
  const {t, fps} = useT();
  const cam = camAt(t, ARR_CAM);
  const A = P.arrival;
  const z = pathAt(ZIPPY_ARR.stays, t, 3.4, 0.7, true);
  const g = pathAt(GINGER_ARR.stays, t, 3.4, 0.7, true);
  const anchors: Record<string, [number, number]> = {
    scout: toScreen([-0.55, 0.95, 2.4], cam),
    zippy: toScreen([z.x, 1.0, z.z], cam),
    ginger: toScreen([g.x, 1.0, g.z], cam),
  };
  const plates: Record<string, [number, number]> = {scout: [80, 470], zippy: [440, 1150], ginger: [560, 560]};
  return (
    <AbsoluteFill>
      <Paper />
      <ScenePanel>
        <Stage cam={cam} left={0} top={0} width={PANEL.w} height={PANEL.h} dpr={1}>
          <MockFloor w={20} d={14} p={[0, 0, -1.4]} />
          <LiteRack p={[-4.6, 0, -6.4]} bays={4} levels={3} seed={3} />
          <LiteRack p={[2.0, 0, -6.4]} bays={3} levels={3} seed={5} />
          <LiteRack p={[7.4, 0, -6.4]} bays={2} levels={3} seed={8} />
          <MascotModel t={t} p={[-3.7, 0, 0.6]} yaw={0.45} gestures={[{at: 0.3, kind: "wave"}, {at: 5.0, kind: "present"}]} emotes={[{at: 0.2, kind: "happy", dur: 2.2}]} />
          <DogModel t={t} plan={SCOUT_ARR} />
          <AgvModel t={t} plan={ZIPPY_ARR} />
          <AgvModel t={t} skin="orange" plan={GINGER_ARR} />
        </Stage>
      </ScenePanel>
      {A.heroes.map((h) => {
        const a = anchors[h.id];
        const pl = plates[h.id];
        if (!a || !pl) return null;
        return <NamePlate key={h.id} x={pl[0]} y={pl[1]} name={h.name} role={h.role} at={Math.round(h.at * fps)} ax={a[0]} ay={a[1]} badge={h.home ? <HomeBadge label={h.home} /> : undefined} />;
      })}
      <Title x={64} y={PANEL.y + PANEL.h + 46} text={A.title} mark={A.mark} at={Math.round(0.35 * fps)} size={60} />
      <Sounds
        list={[
          [0.0, "@swipe-1", 0.3],
          [0.35, "@pop-1", 0.2],
          [0.7, "@click-2", 0.3],
          [0.75, "@robot-1", 0.25],
          [0.85, "@boing-1", 0.1],
          [1.7, "@boing-1", 0.1],
          [0.6, "@servo-1", 0.22],
          [2.9, "@click-2", 0.3],
          [1.9, "@servo-2", 0.2],
          [4.1, "@click-2", 0.3],
        ]}
      />
    </AbsoluteFill>
  );
};

// ===== 4. Испытание: AGV по QR-плиткам, AMR по карте =====
const TB = 8.2; // начало второй части (AMR)
const TRIAL_CAM: [number, Cam][] = [
  [0, {pos: [-0.6, 13.4, 9.6], target: [-0.4, 0, -1.7], fov: 42}],
  [TB, {pos: [0.0, 13.2, 9.4], target: [0.0, 0, -1.7], fov: 42}],
  [TB + 8.4, {pos: [0.6, 13.0, 9.2], target: [0.3, 0, -1.7], fov: 42}],
];
const QR_CORNERS: [number, number][] = [[-6.6, 2.4], [2.0, 2.4], [2.0, -2.4]];
const ZIPPY_TRIAL: AgvPlan = {speed: 2.6, stays: [{at: 0, x: -6.6, z: 2.4, yaw: 0}, {at: 3.75, x: 2.0, z: 2.4, yaw: 0}, {at: 6.3, x: 2.0, z: -2.4, yaw: Math.PI / 2}]};
const GINGER_START: [number, number] = [-6.8, -0.5];
const GOAL_B: [number, number] = [6.3, -0.5];
const BOX_B = {p: [-0.3, 0.35, -0.5] as V3, s: [0.9, 0.7, 0.8] as V3, drop: 1.9};
const LIDAR_R = 6.2;
const GINGER_ROUTE = curvePath([GINGER_START, [-4.6, -0.5], [-2.6, -0.45], [-1.3, 0.85], [-0.2, 1.2], [0.9, 0.85], [2.6, -0.45], GOAL_B], 1.1, 7.4);
// когда лидар Рыжика «достаёт» упавшую коробку (не раньше, чем она легла)
const BOX_SEEN = (() => {
  for (let tb = BOX_B.drop + 0.35; tb < 8; tb += 1 / 30) {
    const s = GINGER_ROUTE.at(tb);
    if (Math.hypot(s.x - BOX_B.p[0], s.z - BOX_B.p[2]) < LIDAR_R - 0.3) return tb;
  }
  return BOX_B.drop + 0.5;
})();
const straight: [number, number][] = [GINGER_START, GOAL_B];
// плитки QR вдоль углов маршрута, шаг ~1,08 ед.
const qrTiles = (() => {
  const out: [number, number][] = [];
  for (let i = 1; i < QR_CORNERS.length; i++) {
    const [x0, z0] = QR_CORNERS[i - 1];
    const [x1, z1] = QR_CORNERS[i];
    const L = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.round(L / 1.08);
    for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  return out;
})();
// когда центр Шустрика проезжает плитку
const qrPass = qrTiles.map(([x, z]) => {
  for (let t = 0; t < TB; t += 1 / 30) {
    const s = pathAt(ZIPPY_TRIAL.stays, t, 2.6, 0.7, true);
    if (Math.hypot(s.x - x, s.z - z) < 0.3) return t;
  }
  return 99;
});

// вставка «карта»: сетка занятости, открывается лидаром Рыжика (радиус R), коробка — красным после падения
const MAP_B = {x0: -8, z0: -6, w: 16, d: 12, cell: 0.5, px: 8, R: LIDAR_R};
const SlamInset: React.FC<{tb: number; label: string}> = ({tb, label}) => {
  const nx = MAP_B.w / MAP_B.cell;
  const nz = MAP_B.d / MAP_B.cell;
  // когда клетка впервые попала в радиус лидара
  const reveal = useMemo(() => {
    const out = new Float32Array(nx * nz).fill(99);
    for (let tt = 0; tt <= 8.6; tt += 0.1) {
      const s = GINGER_ROUTE.at(tt);
      for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
          const cx = MAP_B.x0 + (i + 0.5) * MAP_B.cell;
          const cz = MAP_B.z0 + (j + 0.5) * MAP_B.cell;
          const k = j * nx + i;
          if (out[k] > 50 && Math.hypot(cx - s.x, cz - s.z) < MAP_B.R * Math.min(1, Math.max(0, (tt - 0.15) / 0.8))) out[k] = tt;
        }
    }
    return out;
  }, [nx, nz]);
  const occ = (cx: number, cz: number) => {
    if (cz < -4.9 && cz > -6 && cx > -6.4 && cx < 4.4) return "rack"; // стеллаж у задней кромки
    if (cx > 1.25 && cx < 2.75 && cz > -3.45 && cz < -1.35) return "agv"; // Шустрик стоит в точке
    if (tb >= BOX_SEEN && Math.abs(cx - BOX_B.p[0]) < 0.55 && Math.abs(cz - BOX_B.p[2]) < 0.5) return "box";
    return "";
  };
  const W = nx * MAP_B.px;
  const H = nz * MAP_B.px;
  const cells: React.ReactNode[] = [];
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const rt = reveal[j * nx + i];
      if (tb < rt) continue;
      const cx = MAP_B.x0 + (i + 0.5) * MAP_B.cell;
      const cz = MAP_B.z0 + (j + 0.5) * MAP_B.cell;
      const o = occ(cx, cz);
      const fresh = tb - rt < 0.25;
      cells.push(
        <rect key={j * nx + i} x={i * MAP_B.px} y={j * MAP_B.px} width={MAP_B.px - 1} height={MAP_B.px - 1} fill={o === "box" ? RK.red : o ? RK.ink : fresh ? "#FFFFFF" : RK.paper} />,
      );
    }
  const toMap = (x: number, z: number): [number, number] => [((x - MAP_B.x0) / MAP_B.w) * W, ((z - MAP_B.z0) / MAP_B.d) * H];
  const s = GINGER_ROUTE.at(tb);
  const [rx, ry] = toMap(s.x, s.z);
  const replan = tb >= BOX_SEEN + 0.3;
  const pts = (replan ? GINGER_ROUTE.pts : straight).map(([x, z]) => toMap(x, z));
  const k = p01(tb, 0.2, 0.6, EO);
  return (
    <div style={{position: "absolute", left: PANEL.x + PANEL.w - W - 50, top: PANEL.y + 26, padding: 8, background: RK.paper, border: `4px solid ${RK.ink}`, borderRadius: 16, boxShadow: `6px 6px 0 ${RK.ink}`, opacity: k, translate: `${(1 - k) * 40}px 0`}}>
      <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: "0.12em", color: RK.ink, marginBottom: 6}}>
        <span style={{color: RK.red}}>●</span> {label.toUpperCase()}
      </div>
      <svg width={W} height={H} style={{display: "block", background: RK.fog}}>
        {cells}
        <path d={pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join("")} fill="none" stroke={RK.blue} strokeWidth={2.5} strokeDasharray="5 4" />
        <circle cx={rx} cy={ry} r={MAP_B.R * (MAP_B.px / MAP_B.cell) * 0.98} fill="none" stroke={RK.ink} strokeWidth={1.5} strokeDasharray="3 4" opacity={0.6} />
        <g transform={`translate(${rx} ${ry}) rotate(${(-s.yaw * 180) / Math.PI})`}>
          <path d="M9 0 L-6 -6 L-3 0 L-6 6 Z" fill={RK.lemon} stroke={RK.ink} strokeWidth={2} strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
};

const TargetRing: React.FC<{p: [number, number]; pulse: number; o?: number}> = ({p, pulse, o = 1}) => (
  <group position={[p[0], 0.016, p[1]]} rotation={[-Math.PI / 2, 0, 0]}>
    <mesh>
      <ringGeometry args={[0.62, 0.74, 40]} />
      <meshBasicMaterial color={RK.ink} transparent opacity={o} />
    </mesh>
    <mesh>
      <ringGeometry args={[0.5, 0.6, 40]} />
      <meshBasicMaterial color={LEMON3} transparent opacity={o} />
    </mesh>
    {pulse > 0.01 ? (
      <mesh>
        <ringGeometry args={[0.7 + (1 - pulse) * 1.2, 0.8 + (1 - pulse) * 1.2, 40]} />
        <meshBasicMaterial color={LEMON3} transparent opacity={pulse * 0.95} depthWrite={false} />
      </mesh>
    ) : null}
  </group>
);

export const TrialBeat: React.FC<{P: RobokitaiProps}> = ({P}) => {
  const {t, fps} = useT();
  const T = P.trial;
  const cam = camAt(t, TRIAL_CAM);
  const tb = t - TB;
  const partB = tb >= 0;
  const qrO = 1 - 0.7 * p01(tb, 0, 0.6);
  // Рыжик ждёт своей очереди, потом едет по кривой
  const gingerPath = (tt: number) => (tt - TB < 0 ? {...GINGER_ROUTE.at(0), moving: false} : GINGER_ROUTE.at(tt - TB));
  const gs = gingerPath(t);
  const boxY = tb < BOX_B.drop ? null : tb < BOX_B.drop + 0.35 ? BOX_B.p[1] + 3.2 * (1 - ((tb - BOX_B.drop) / 0.35) ** 2) : BOX_B.p[1] + Math.max(0, Math.sin(((tb - BOX_B.drop - 0.35) / 0.25) * Math.PI) * 0.08 * (tb < BOX_B.drop + 0.6 ? 1 : 0));
  const detect = p01(tb, BOX_SEEN, BOX_SEEN + 0.2);
  const replan = p01(tb, BOX_SEEN + 0.3, BOX_SEEN + 0.8, EO);
  const zArrive = 6.3;
  const pulseA = t >= zArrive ? Math.max(0, 1 - (t - zArrive) / 0.9) : 0;
  const pulseB = tb >= 7.4 ? Math.max(0, 1 - (tb - 7.4) / 0.9) : 0;
  return (
    <AbsoluteFill>
      <Paper />
      <ScenePanel>
        <Stage cam={cam} left={0} top={0} width={PANEL.w} height={PANEL.h} dpr={1}>
          <MockFloor w={17} d={13} p={[0, 0, -0.4]} />
          <LiteRack p={[-1.0, 0, -5.4]} bays={7} levels={2} levelH={1.1} seed={12} />
          {qrTiles.map((q, i) => (
            <QrTile key={i} p={q} seed={i} o={qrO} glow={t >= qrPass[i] ? 0.45 + 0.55 * Math.max(0, 1 - (t - qrPass[i]) / 0.7) : 0} />
          ))}
          <TargetRing p={QR_CORNERS[2]} pulse={pulseA} o={qrO} />
          <AgvModel t={t} plan={ZIPPY_TRIAL} />
          <AgvModel t={t} skin="orange" plan={{stays: [{at: 0, x: GINGER_START[0], z: GINGER_START[1], yaw: 0}], path: gingerPath}} />
          {partB ? (
            <>
              <group position={[gs.x, 0, gs.z]} rotation={[0, gs.yaw, 0]}>
                <group position={[0.85, 0, 0]}>
                  <LidarSweep t={tb} range={LIDAR_R} y={0.45} o={p01(tb, 0.15, 0.5)} />
                </group>
              </group>
              <PathDashes id="straight" pts={straight} draw={p01(tb, 0.45, 1.2)} o={1 - replan} color={RK.blue} />
              <PathDashes id="curve" pts={GINGER_ROUTE.pts} draw={replan} color={RK.blue} />
              <TargetRing p={GOAL_B} pulse={pulseB} />
              {boxY !== null ? (
                <>
                  <Shadow w={1.5} d={1.4} p={[BOX_B.p[0], 0, BOX_B.p[2]]} o={Math.min(1, (tb - BOX_B.drop) / 0.35)} />
                  <CargoBox s={BOX_B.s} p={[BOX_B.p[0], boxY, BOX_B.p[2]]} rot={[0, 0.12, 0]} />
                  <BoxGlow p={[BOX_B.p[0], BOX_B.p[1], BOX_B.p[2]]} s={BOX_B.s} k={detect * (0.65 + 0.35 * Math.sin(tb * 7))} />
                </>
              ) : null}
            </>
          ) : null}
        </Stage>
      </ScenePanel>
      {partB ? <SlamInset tb={tb} label={T.map} /> : null}
      <SpecCard x={64} y={PANEL.y + PANEL.h + 30} w={952} at={Math.round(0.9 * fps)} out={Math.round((TB - 0.15) * fps)} term={T.a.term} sub={T.a.sub} lines={T.a.lines} size={46} />
      <SpecCard x={64} y={PANEL.y + PANEL.h + 30} w={952} at={Math.round((TB + 1.0) * fps)} term={T.b.term} sub={T.b.sub} lines={T.b.lines} size={46} />
      <Sounds
        list={[
          [0.0, "@swipe-1", 0.3],
          [0.4, "@servo-1", 0.22],
          [0.9, "@pop-1", 0.25],
          ...qrPass.filter((x) => x < TB).map((x) => [x, "@click-2", 0.14] as Snd),
          [3.75, "@servo-2", 0.3],
          [zArrive, "@success-1", 0.28],
          [TB + 0.2, "@sweep-1", 0.16],
          [TB + 1.0, "@pop-1", 0.25],
          [TB + 1.1, "@servo-1", 0.2],
          [TB + BOX_B.drop + 0.35, "@stamp-1", 0.45],
          [TB + BOX_SEEN, "@beep-1", 0.3],
          [TB + BOX_SEEN + 0.3, "@laser-2", 0.12],
          [TB + 3.4, "@servo-2", 0.18],
          [TB + 7.4, "@success-1", 0.26],
        ]}
      />
    </AbsoluteFill>
  );
};

// ===== 5. Поворот: порог у ворот =====
const STUCK = 1.3;
const GINGER_TW: AgvPlan = {speed: 3.2, stays: [{at: 0, x: -5.6, z: 0.35, yaw: 0}, {at: STUCK, x: -1.17, z: 0.35, yaw: 0}]};
const SCOUT_TW: DogPlan = {speed: 2.6, stays: [{at: 0, x: 7.6, z: 1.2, yaw: Math.PI}, {at: 4.7, x: 1.65, z: 0.75, yaw: Math.PI}]};
// камера с той стороны ворот: робот едет «на нас» и упирается в порог; потом сверху ¾, Скаут спиной к нам сканирует пол
const TW_CAM: [number, Cam][] = [
  [0, {pos: [3.8, 1.55, 2.7], target: [-1.8, 0.35, 0.3], fov: 36}],
  [1.3, {pos: [3.0, 1.15, 2.2], target: [-0.9, 0.3, 0.3], fov: 36}],
  [3.5, {pos: [2.9, 1.1, 2.1], target: [-0.9, 0.3, 0.3], fov: 36}],
  [4.8, {pos: [4.8, 3.9, 3.5], target: [-0.3, 0.1, -0.2], fov: 38}],
  [10.6, {pos: [4.4, 3.7, 3.1], target: [-0.3, 0.1, -0.2], fov: 38}],
];
const THR = {w: 0.3, h: 0.12};
const GAP = {dx: 0.62, w: 0.08};
// лидар Скаута вниз-вперёд: вертикальный веер качается вправо-влево
const FloorScan: React.FC<{t: number; o: number}> = ({t, o}) =>
  o <= 0.01 ? null : (
    <group position={[0.52, -0.11, 0]} rotation={[0, Math.sin(t * 2.4) * 0.55, -0.62]}>
      <mesh rotation={[0, 0, 0]}>
        <circleGeometry args={[2.2, 24, -0.34, 0.68]} />
        <meshBasicMaterial color={LEMON3} transparent opacity={0.55 * o} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[1.1, 0, 0]}>
        <boxGeometry args={[2.2, 0.02, 0.02]} />
        <meshBasicMaterial color={RK.ink} transparent opacity={0.8 * o} depthWrite={false} />
      </mesh>
    </group>
  );
// выноска размера на кадре: от точки a к плашке
const Callout: React.FC<{a: [number, number]; b: [number, number]; label: string; at: number; color?: string; tick?: [number, number]}> = ({a, b, label, at, color = RK.ink, tick}) => {
  const f = useCurrentFrame();
  const s = usePop(at, 12);
  if (s <= 0) return null;
  const k = p01(f, at, at + 10, EO);
  return (
    <>
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0, overflow: "visible"}}>
        {tick ? (
          <g stroke={RK.ink} strokeWidth={4} strokeLinecap="round">
            <line x1={a[0] - 22} y1={tick[0]} x2={a[0] + 22} y2={tick[0]} />
            <line x1={a[0] - 22} y1={tick[1]} x2={a[0] + 22} y2={tick[1]} />
            <line x1={a[0]} y1={tick[0]} x2={a[0]} y2={tick[1]} />
          </g>
        ) : null}
        <line x1={a[0]} y1={a[1]} x2={a[0] + (b[0] - a[0]) * k} y2={a[1] + (b[1] - a[1]) * k} stroke={RK.ink} strokeWidth={3.5} />
        <circle cx={a[0]} cy={a[1]} r={8} fill={RK.lemon} stroke={RK.ink} strokeWidth={3} />
      </svg>
      <div style={{position: "absolute", left: b[0], top: b[1], translate: "-50% -50%", scale: String(0.6 + 0.4 * s), opacity: Math.min(1, s * 2), background: RK.paper, border: `4px solid ${RK.ink}`, borderRadius: 14, padding: "6px 18px", fontFamily: MONO, fontWeight: 700, fontSize: 34, color, boxShadow: `5px 5px 0 ${RK.ink}`, whiteSpace: "nowrap"}}>{label}</div>
    </>
  );
};

export const TwistBeat: React.FC<{P: RobokitaiProps}> = ({P}) => {
  const {t, fps} = useT();
  const W = P.twist;
  const cam = camAt(t, TW_CAM);
  // рывок носом вверх на пороге (вокруг задних колёс), второй — слабее (пробует ещё раз)
  const jolt = (at: number, amp: number) => (t > at ? amp * Math.exp(-(t - at) * 5) * Math.abs(Math.sin((t - at) * 16)) : 0);
  const pitch = jolt(STUCK, 0.07) + jolt(2.35, 0.04);
  const pivotX = -1.17 - 0.85;
  const alarm = t > STUCK ? 0.5 + 0.5 * Math.sin((t - STUCK) * 9) : 0;
  const scan = p01(t, 4.75, 5.05) * (1 - p01(t, 9.6, 10.0));
  const glowT = p01(t, 5.15, 5.5) * (0.7 + 0.3 * Math.sin(t * 6));
  const hit = t > STUCK ? Math.max(0, 1 - (t - STUCK) / 1.6) * (0.6 + 0.4 * Math.sin((t - STUCK) * 14)) : 0;
  const glowG = p01(t, 5.75, 6.1) * (0.7 + 0.3 * Math.sin(t * 6 + 1));
  // точки выносок
  const thrTop = toScreen([0.15, THR.h, -1.15], cam);
  const thrBot = toScreen([0.15, 0, -1.15], cam);
  const gapPt = toScreen([GAP.dx, 0, -1.45], cam);
  const robotTop = toScreen([-1.17, 1.05, 0.35], cam);
  const insightAt = Math.round(4.4 * fps);
  const specAt = Math.round(7.6 * fps);
  return (
    <AbsoluteFill>
      <Paper />
      <ScenePanel bg="#E9E5DD">
        <Stage cam={cam} left={0} top={0} width={PANEL.w} height={PANEL.h} dpr={1}>
          <MockFloor w={16} d={11} p={[0.5, 0, -0.5]} />
          <Gate px={0} open={4.1} h={4.4} wall={3.4} threshold={THR} gap={GAP} glowT={glowT} glowG={glowG} hit={hit} walls="far" />
          <group position={[pivotX, 0, 0]} rotation={[0, 0, pitch]}>
            <group position={[-pivotX, 0, 0]}>
              <AgvModel t={t} skin="orange" plan={GINGER_TW} />
              <Glint p={[-1.17 - 0.6, 0.72, 0.35]} k={alarm} />
            </group>
          </group>
          <DogModel t={t} plan={SCOUT_TW}>
            <FloorScan t={t} o={scan} />
          </DogModel>
        </Stage>
      </ScenePanel>
      <Alert x={robotTop[0]} y={robotTop[1] - 6} at={Math.round((STUCK + 0.05) * fps)} size={130} />
      <Callout a={thrTop} b={[thrTop[0] + 120, thrTop[1] - 170]} tick={[thrTop[1], thrBot[1]]} label={W.labels.threshold} at={Math.round(5.2 * fps)} />
      <Callout a={gapPt} b={[gapPt[0] + 110, gapPt[1] + 125]} label={W.labels.gap} at={Math.round(5.8 * fps)} />
      <Title x={64} y={PANEL.y + PANEL.h + 46} text={W.stuck} at={Math.round((STUCK + 0.25) * fps)} out={insightAt} size={66} color={RK.red} />
      <SpecCard x={64} y={PANEL.y + PANEL.h + 30} w={952} at={insightAt} out={specAt} lines={[W.insight]} size={58} />
      <SpecCard x={64} y={PANEL.y + PANEL.h + 30} w={952} at={specAt} lines={[{text: W.spec.title}, {text: `${W.spec.threshold} · ${W.spec.gap}`}]} note={W.note.toUpperCase()} size={46} />
      <Sounds
        list={[
          [0.0, "@swipe-1", 0.3],
          [0.1, "@servo-1", 0.25],
          [STUCK, "@impact-4", 0.3],
          [STUCK + 0.05, "@error-1", 0.45],
          [STUCK + 0.4, "@error-1", 0.4],
          [2.35, "@impact-3", 0.14],
          [3.0, "@robot-1", 0.28],
          [4.4, "@pop-1", 0.25],
          [4.8, "@sweep-1", 0.2],
          [5.2, "@beep-1", 0.3],
          [5.8, "@beep-1", 0.25],
          [7.6, "@pop-1", 0.25],
        ]}
      />
    </AbsoluteFill>
  );
};

// ===== 7. У клиента: 8 роботов по кругу =====
const LOOP = loopPath([[-7.2, -2.0], [-7.2, 2.0], [-5.6, 4.5], [5.6, 4.5], [7.2, 2.0], [7.2, -2.0], [5.6, -4.5], [-5.6, -4.5]]);
const CL_CAM: [number, Cam][] = [
  [0, {pos: [-2.6, 15.5, 14.0], target: [0, 0, 0.8], fov: 42}],
  [7.8, {pos: [2.4, 14.6, 13.4], target: [0, 0, 0.8], fov: 42}],
];
export const ClientBeat: React.FC<{P: RobokitaiProps}> = ({P}) => {
  const {t, fps} = useT();
  const C = P.client;
  const cam = camAt(t, CL_CAM);
  const n = C.robots;
  const robots = Array.from({length: n}, (_, i) => LOOP.at(t, i / n, 2.2));
  const gateX = 2.6;
  const capOut = Math.round(3.3 * fps);
  const fixedPt = toScreen([gateX, 0.05, 4.5], cam);
  const fixedS = usePop(Math.round(1.7 * fps), 12);
  return (
    <AbsoluteFill>
      <Paper />
      <ScenePanel>
        <Stage cam={cam} left={0} top={0} width={PANEL.w} height={PANEL.h} dpr={1}>
          <MockFloor w={20} d={14} p={[0, 0, 0]} />
          <LiteRack p={[0, 0, -1.25]} bays={6} levels={2} levelH={1.1} seed={21} />
          <LiteRack p={[0, 0, 1.25]} bays={6} levels={2} levelH={1.1} seed={22} />
          <PathDashes id="loop" pts={[...LOOP.pts, LOOP.pts[0]]} draw={1} color={RK.blue} o={0.55} />
          {/* ворота без порога: проём над дорожкой, на полу ровная синяя накладка */}
          <group position={[gateX, 0, 4.5]}>
            <Gate px={0} open={2.9} h={3.0} wall={0.6} threshold={null} gap={null} />
          </group>
          <mesh position={[gateX, 0.01, 4.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.7, 2.8]} />
            <meshBasicMaterial color={RK.blue} transparent opacity={0.55} />
          </mesh>
          {robots.map((s, i) => (
            <AgvLite key={i} st={s} t={t} skin={i % 2 ? "orange" : "aura"} box={i % 3 !== 1} />
          ))}
        </Stage>
      </ScenePanel>
      {robots.map((s, i) => {
        const [x, y] = toScreen([s.x, 1.55, s.z], cam);
        const k = usePopLite(t, 0.4 + i * 0.14);
        if (k <= 0) return null;
        return (
          <div key={i} style={{position: "absolute", left: x, top: y, translate: "-50% -50%", width: 50, height: 50, borderRadius: 99, background: RK.lemon, border: `4px solid ${RK.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 28, color: RK.ink, scale: String(k), boxShadow: `3px 3px 0 ${RK.ink}`}}>
            {i + 1}
          </div>
        );
      })}
      {fixedS > 0 ? (
        <div style={{position: "absolute", left: fixedPt[0] - 330, top: fixedPt[1] + 34, scale: String(0.6 + 0.4 * fixedS), opacity: Math.min(1, fixedS * 2), display: "flex", alignItems: "center", gap: 10, background: RK.paper, border: `4px solid ${RK.blue}`, borderRadius: 14, padding: "6px 16px", fontFamily: INTER, fontWeight: 800, fontSize: 34, color: RK.blue, boxShadow: `5px 5px 0 ${RK.blue}`, whiteSpace: "nowrap"}}>
          ✓ {C.fixed}
        </div>
      ) : null}
      <Title x={64} y={PANEL.y + PANEL.h + 46} text={C.caption.text} mark={C.caption.mark} at={Math.round(0.3 * fps)} out={capOut} size={62} />
      <Title x={64} y={PANEL.y + PANEL.h + 34} text={C.takeaway.text} mark={C.takeaway.mark} at={capOut + 2} size={56} />
      <Sounds
        list={[
          [0.0, "@swipe-1", 0.3],
          [0.3, "@pop-1", 0.2],
          ...Array.from({length: n}, (_, i) => [0.4 + i * 0.14, "@click-2", 0.18] as Snd),
          [0.6, "@servo-1", 0.15],
          [1.7, "@ding-2", 0.22],
          [3.35, "@pop-1", 0.3],
          [3.5, "@success-1", 0.2],
        ]}
      />
    </AbsoluteFill>
  );
};
// пружинка без хука (в цикле)
const usePopLite = (t: number, at: number) => {
  if (t < at) return 0;
  const u = (t - at) / 0.35;
  return u >= 1 ? 1 : 1 + 0.12 * Math.sin(u * Math.PI) - (1 - u) ** 3 * 1;
};
