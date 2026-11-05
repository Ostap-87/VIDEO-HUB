// Гуманоид на колёсах Aura (решение пользователя 05.11.2026: «добавить 3Д гуманоида на колёсах… показывать как робот
// подходит к конвейеру и несёт коробку»). Стиль Aura (пергамент, графит, лимонный), скин — как у гуманоида: skin="navy".
// Устройство (снизу вверх): мобильная база с четырьмя всенаправленными колёсами (меканум: ролики под 45°), резиновый бампер,
// пояс лидара (тёмное окно со светящейся линией) и шайба лидара спереди, кольцо-индикатор статуса вокруг колонны; подъёмная
// колонна (графитовый кожух + алюминиевая выдвижная часть с рисками, кабель-цепь сзади); поясной шарнир; торс с эмблемой
// на груди, швами и винтами; голова со скруглённым корпусом, визором и лимонными глазами-диодами, сенсор-«антенна»; две руки
// с кистями роборуки AuraHand. Рост ~2,9–3,6 ед. (≈ 1,45–1,8 м, зависит от подъёма), лицом к +z (курс 0 — едет по +x).
// План (мировые единицы сцены Stage, время — секунды):
// - stays — куда ехать (разгон и торможение, разворот на месте, назад сдаёт задом); колёса крутятся по пройденному пути;
// - lift — ключи подъёма торса 0…1 ([[2, 0.5], [3, 0.1]]: опуститься к коробке), по умолчанию 0,5;
// - gestures — {at, kind}: wave (помахать), point (показать), present (пригласить, руки в стороны), nod, look;
// - carry — {at, from, until, to, s?, show?}: в момент at берёт коробку CargoBox (центр from, размер s) двумя руками
//   (за 0,9 с до этого тянется к ней, торс наклоняется), подтягивает к груди и везёт; к моменту until ставит в точку to
//   (стол, площадка AGV) и отпускает. show — с какого момента коробку рисует сам робот (до этого — конвейер).
import React from "react";
import * as THREE from "three";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {
  Accent, Alu, Bolt, Box, CargoBox, Capsule, Cyl, EyeGlow, Glow, Graphite, Hose, Led, Metal, Parchment, RBox, Ring, Rubber, Seam,
  Shadow, SkinScope, Sph, Tag, Vents, Visor, clamp01, pathAt, ramp, smooth, track, useSkin, type Stay, type V3,
} from "./kit";
import {HandRig, POSES, type HandPose} from "./AuraHand";

export type WheelGesture = {at: number; kind: "wave" | "point" | "present" | "nod" | "look"};
export type WheelCarry = {at: number; from: V3; until: number; to: V3; s?: V3; show?: number};
export type WheelPlan = {stays: Stay[]; speed?: number; lift?: [number, number][]; gestures?: WheelGesture[]; carry?: WheelCarry[]};
export const WHEEL = {baseTop: 0.44, sleeve: 0.75, travel: 0.7, shX: 0.46, shY: 0.6, UA: 0.56, FA: 0.5, hand: 0.4, wheelR: 0.155, track: 0.5};
const W_DUR: Record<WheelGesture["kind"], number> = {wave: 2.6, point: 1.9, present: 1.9, nod: 1.2, look: 2.4};
const BOX: V3 = [0.62, 0.42, 0.5];

type WArm = {flex: number; abd: number; swing: number; elbow: number; hand: HandPose};
const mixHand = (a: HandPose, b: HandPose, k: number): HandPose => ({
  f: a.f.map((v, i) => v.map((x, j) => x + (b.f[i][j] - x) * k)) as HandPose["f"],
  th: a.th.map((x, i) => x + (b.th[i] - x) * k) as HandPose["th"],
});
const REST_HAND = mixHand(POSES.relaxed, POSES.fist, 0.4);
const HOLD_HAND = mixHand(POSES.open, POSES.relaxed, 0.55);
const mixArm = (a: WArm, b: WArm, k: number): WArm => ({
  flex: a.flex + (b.flex - a.flex) * k,
  abd: a.abd + (b.abd - a.abd) * k,
  swing: a.swing + (b.swing - a.swing) * k,
  elbow: a.elbow + (b.elbow - a.elbow) * k,
  hand: mixHand(a.hand, b.hand, k),
});

// рука к точке запястья (в системе плеча: x наружу/внутрь, y вверх, z вперёд): горизонтальный разворот + сгибы в его плоскости
const armIK = (side: 1 | -1, T: THREE.Vector3): Omit<WArm, "hand"> => {
  const {UA, FA} = WHEEL;
  const swing = Math.atan2(T.x, Math.max(0.05, T.z));
  const h = Math.hypot(T.x, T.z);
  const D = Math.min(UA + FA - 0.004, Math.max(0.25, Math.hypot(h, T.y)));
  const phi = Math.atan2(h, -T.y);
  const a = Math.acos(Math.min(1, Math.max(-1, (UA * UA + D * D - FA * FA) / (2 * UA * D))));
  const g = Math.acos(Math.min(1, Math.max(-1, (UA * UA + FA * FA - D * D) / (2 * UA * FA))));
  void side;
  return {flex: phi - a, abd: 0, swing, elbow: Math.PI - g};
};

type WPose = {
  x: number;
  z: number;
  yaw: number;
  dist: number;
  turn: number;
  colTop: number;
  lean: number;
  waistYaw: number;
  head: {pitch: number; yaw: number; roll: number};
  arms: {R: WArm; L: WArm};
  blink: boolean;
  glow: number;
  moving: boolean;
};

// система торса: мир → корень (x, z, курс) → верх колонны → наклон в поясе
const torsoMatrix = (x: number, z: number, yaw: number, colTop: number, lean: number, waistYaw: number) =>
  new THREE.Matrix4()
    .makeTranslation(x, 0, z)
    .multiply(new THREE.Matrix4().makeRotationY(yaw + Math.PI / 2))
    .multiply(new THREE.Matrix4().makeTranslation(0, colTop + 0.08, 0))
    .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(lean, waistYaw, 0, "YXZ")));

const basics = (plan: WheelPlan, t: number) => {
  const st = pathAt(plan.stays, t, plan.speed ?? 1.2, 0.6, true);
  const lift = clamp01(track(t, plan.lift ?? [[0, 0.5]]));
  const colTop = WHEEL.baseTop + WHEEL.sleeve + lift * WHEEL.travel;
  return {st, colTop};
};

// вес «руки держат коробку» и наклон торса к ней
const carryWeight = (c: WheelCarry, t: number) => Math.min(ramp(t, c.at - 0.9, c.at - 0.1), 1 - ramp(t, c.until + 0.1, c.until + 0.8));
const CARRY_LOCAL = new THREE.Vector3(0, 0.36, 0.56); // коробка у груди при перевозке (система торса)

// где коробка (мир) и где она в системе торса в момент t
export const wheelBoxAt = (plan: WheelPlan, c: WheelCarry, t: number): {world: THREE.Vector3; yaw: number; held: boolean} => {
  if (t < c.at) return {world: new THREE.Vector3(...c.from), yaw: 0, held: false};
  if (t >= c.until) {
    const b = basics(plan, c.until);
    return {world: new THREE.Vector3(...c.to), yaw: b.st.yaw + Math.PI / 2, held: false};
  }
  const frameAt = (tt: number) => {
    const b = basics(plan, tt);
    return torsoMatrix(b.st.x, b.st.z, b.st.yaw, b.colTop, leanAt(plan, tt), 0);
  };
  const Lpick = new THREE.Vector3(...c.from).applyMatrix4(frameAt(c.at).invert());
  const Ldrop = new THREE.Vector3(...c.to).applyMatrix4(frameAt(c.until).invert());
  let L: THREE.Vector3;
  if (t < c.until - 0.8) L = Lpick.clone().lerp(CARRY_LOCAL, smooth(clamp01((t - c.at) / 0.8)));
  else L = (c.until - c.at > 1.7 ? CARRY_LOCAL.clone() : Lpick.clone().lerp(CARRY_LOCAL, 1)).lerp(Ldrop, smooth(clamp01((t - (c.until - 0.8)) / 0.8)));
  const b = basics(plan, t);
  return {world: L.applyMatrix4(frameAt(t)), yaw: b.st.yaw + Math.PI / 2, held: true};
};

// наклон торса: к коробке внизу — вперёд (пока руки тянутся и держат её у ног)
function leanAt(plan: WheelPlan, t: number): number {
  let lean = 0;
  for (const c of plan.carry ?? []) {
    const w = carryWeight(c, t);
    if (w <= 0) continue;
    const b = basics(plan, t);
    const shoulderY = b.colTop + 0.08 + WHEEL.shY;
    const target = t < c.at + 0.8 ? c.from[1] : t > c.until - 0.8 ? c.to[1] : shoulderY;
    const near = t < c.at + 0.8 ? 1 - smooth(clamp01((t - c.at) / 0.8)) : t > c.until - 0.8 ? smooth(clamp01((t - (c.until - 0.8)) / 0.8)) : 0;
    lean = Math.max(lean, w * near * Math.min(0.42, Math.max(0, (shoulderY - target - 0.35) * 0.45)));
  }
  return lean;
}

export const wheelPose = (plan: WheelPlan, t: number): WPose => {
  const {st, colTop} = basics(plan, t);
  const m = clamp01(Math.abs(st.speed) / 0.4);
  const breathe = Math.sin(t * 1.6);
  const rest = (side: 1 | -1): WArm => ({flex: 0.06 + 0.02 * breathe + 0.01 * side, abd: 0.13, swing: 0, elbow: 0.28 + 0.1 * m, hand: REST_HAND});
  const pose: WPose = {
    x: st.x,
    z: st.z,
    yaw: st.yaw,
    dist: st.dist,
    turn: st.yaw,
    colTop,
    lean: leanAt(plan, t) - 0.04 * Math.max(-1, Math.min(1, st.speed)) * m,
    waistYaw: 0,
    head: {pitch: 0, yaw: Math.sin(t * 0.45) * 0.06, roll: 0},
    arms: {R: rest(-1), L: rest(1)},
    blink: t % 4.3 < 0.12 || (t + 2.3) % 6.1 < 0.1,
    glow: 2.4 + Math.sin(t * 2.1) * 0.5,
    moving: st.moving,
  };
  // коробка в руках: запястья по бокам коробки
  for (const c of plan.carry ?? []) {
    const w = carryWeight(c, t);
    if (w <= 0) continue;
    const s = c.s ?? BOX;
    const M = torsoMatrix(st.x, st.z, st.yaw, colTop, pose.lean, 0);
    const box = t < c.at ? new THREE.Vector3(...c.from) : t >= c.until ? new THREE.Vector3(...c.to) : wheelBoxAt(plan, c, t).world;
    const L = box.clone().applyMatrix4(M.clone().invert());
    for (const side of [-1, 1] as const) {
      const sh = new THREE.Vector3(side * WHEEL.shX, WHEEL.shY, 0);
      const wrist = new THREE.Vector3(L.x + side * (s[0] / 2 + 0.06), L.y + 0.02, L.z - 0.16);
      const T = wrist.sub(sh);
      const ik = armIK(side, T);
      const target: WArm = {flex: ik.flex, abd: 0, swing: ik.swing, elbow: ik.elbow, hand: t >= c.at - 0.05 && t < c.until + 0.05 ? HOLD_HAND : POSES.open};
      const k = side < 0 ? "R" : "L";
      pose.arms[k] = mixArm(pose.arms[k], target, w);
    }
    pose.head.pitch += 0.18 * w * (L.y < WHEEL.shY ? 1 : 0);
  }
  // жесты
  for (const g of plan.gestures ?? []) {
    const d = W_DUR[g.kind];
    const p = (t - g.at) / d;
    if (p < 0 || p > 1) continue;
    const w = smooth(clamp01(Math.min(p / 0.22, (1 - p) / 0.22)));
    const u = t - g.at;
    const A = pose.arms;
    if (g.kind === "wave") {
      A.L = mixArm(A.L, {flex: 2.45, abd: 0.35 + 0.3 * Math.sin(2 * Math.PI * 2.1 * u), swing: 0, elbow: 0.55, hand: POSES.open}, w);
      pose.head.roll -= 0.08 * w;
    }
    if (g.kind === "point") {
      A.L = mixArm(A.L, {flex: 1.45, abd: 0.15, swing: 0, elbow: 0.05, hand: POSES.point}, w);
      pose.waistYaw += 0.14 * w;
      pose.head.yaw += 0.1 * w;
    }
    if (g.kind === "present") {
      for (const k of ["L", "R"] as const) A[k] = mixArm(A[k], {flex: 0.55, abd: 0.8, swing: 0, elbow: 0.75, hand: POSES.open}, w);
      pose.head.pitch += 0.06 * Math.sin(Math.PI * clamp01((p - 0.25) / 0.5)) * w;
      pose.lean -= 0.05 * w;
    }
    if (g.kind === "nod") pose.head.pitch += 0.24 * Math.sin(Math.PI * p * 2) * Math.sin(Math.PI * p);
    if (g.kind === "look") pose.head.yaw += 0.6 * Math.sin(2 * Math.PI * p) * w;
  }
  return pose;
};

// рука: Rz (в сторону) → Rx (вперёд) → Ry (разворот по горизонтали), локоть, кисть роборуки (ладонь внутрь)
const ArmW: React.FC<{side: 1 | -1; a: WArm}> = ({side, a}) => {
  const {UA, FA, hand} = WHEEL;
  const handSkin = useSkin().hand;
  return (
    <group rotation={new THREE.Euler(-a.flex, a.swing, side * a.abd, "YXZ")}>
      <Sph r={0.105}>
        <Graphite />
      </Sph>
      <RBox s={[0.16, UA - 0.06, 0.16]} r={0.07} p={[0, -UA / 2 - 0.02, 0]}>
        <Parchment />
      </RBox>
      <Box s={[0.012, 0.15, 0.06]} p={[side * 0.082, -UA * 0.42, 0]}>
        <Accent />
      </Box>
      <Bolt p={[0, -0.12, 0.081]} rot={[Math.PI / 2, 0, 0]} r={0.011} />
      <group position={[0, -UA, 0]} rotation={[-a.elbow, 0, 0]}>
        <group rotation={[0, 0, Math.PI / 2]}>
          <Cyl a={0.08} b={0.08} h={0.19}>
            <Graphite />
          </Cyl>
          {[-1, 1].map((s) => (
            <Ring key={s} r={0.05} tube={0.007} p={[0, s * 0.097, 0]} rot={[Math.PI / 2, 0, 0]}>
              <Glow k={1.6} />
            </Ring>
          ))}
        </group>
        <RBox s={[0.14, FA - 0.05, 0.14]} r={0.06} p={[0, -FA / 2, 0]}>
          <Graphite />
        </RBox>
        <RBox s={[0.1, FA * 0.55, 0.03]} r={0.012} p={[0, -FA / 2, 0.07]}>
          <Parchment />
        </RBox>
        <Hose pts={[[0, -0.04, -0.075], [0.01, -FA * 0.5, -0.08], [0, -FA + 0.1, -0.075]]} r={0.009} seg={10} />
        <Sph r={0.064} p={[0, -FA + 0.005, 0]}>
          <Graphite />
        </Sph>
        <Ring r={0.066} tube={0.007} p={[0, -FA + 0.005, 0]} rot={[Math.PI / 2, 0, 0]}>
          <Glow k={1.6} />
        </Ring>
        <group position={[0, -FA + 0.045, 0]} scale={[side, 1, 1]}>
          <group rotation={new THREE.Euler(0, -Math.PI / 2, Math.PI, "YXZ")} scale={hand}>
            <SkinScope skin={handSkin}>
              <HandRig pose={a.hand} />
            </SkinScope>
          </group>
        </group>
      </group>
    </group>
  );
};

// всенаправленное колесо (меканум): графитовая ступица, 10 резиновых роликов под 45°; ось — x
const OmniWheel: React.FC<{p: V3; a: number; side: 1 | -1}> = ({p, a, side}) => {
  const {wheelR} = WHEEL;
  return (
    <group position={p} rotation={[a, 0, 0]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <Cyl a={wheelR * 0.62} b={wheelR * 0.62} h={0.13}>
          <Graphite />
        </Cyl>
        <Cyl a={wheelR * 0.3} b={wheelR * 0.3} h={0.135}>
          <Metal />
        </Cyl>
        <Ring r={wheelR * 0.45} tube={0.006} p={[0, side * 0.068, 0]} rot={[Math.PI / 2, 0, 0]}>
          <Glow k={1.4} />
        </Ring>
      </group>
      {Array.from({length: 10}, (_, k) => {
        const b = (k * 2 * Math.PI) / 10;
        return (
          <group key={k} rotation={[b, 0, 0]}>
            <group position={[0, wheelR * 0.8, 0]} rotation={[0, side * 0.78, 0]}>
              <Capsule r={0.032} l={0.07} rot={[0, 0, Math.PI / 2]}>
                <Rubber />
              </Capsule>
            </group>
          </group>
        );
      })}
    </group>
  );
};

export const WheelHumanoidModel: React.FC<{plan: WheelPlan; t?: number; skin?: "aura" | "navy"}> = ({plan, t: tProp, skin}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = tProp ?? frame / fps;
  const P = wheelPose(plan, t);
  const {baseTop, sleeve, shX, shY, wheelR} = WHEEL;
  const ext = P.colTop - baseTop - sleeve;
  const wl = (P.dist - P.turn * WHEEL.track) / wheelR;
  const wr = (P.dist + P.turn * WHEEL.track) / wheelR;
  const status = 1.6 + (P.moving ? 0.8 * Math.sin(t * 8) : 0.3 * Math.sin(t * 2));
  return (
    <SkinScope skin={skin}>
      <group position={[P.x, 0, P.z]} rotation={[0, P.yaw + Math.PI / 2, 0]}>
        <Shadow w={1.7} d={1.7} />
        {/* --- база --- */}
        <RBox s={[0.84, 0.13, 1.06]} r={0.06} p={[0, 0.16, 0]}>
          <Rubber />
        </RBox>
        <RBox s={[0.8, 0.22, 1.0]} r={0.09} p={[0, 0.3, 0]}>
          <Parchment />
        </RBox>
        {/* пояс лидара: тёмное окно, светящаяся линия спереди */}
        <RBox s={[0.815, 0.06, 1.015]} r={0.03} p={[0, 0.36, 0]}>
          <Visor />
        </RBox>
        <Box s={[0.5, 0.012, 0.01]} p={[0, 0.36, 0.509]}>
          <Glow k={status} />
        </Box>
        <RBox s={[0.78, 0.04, 0.98]} r={0.018} p={[0, baseTop - 0.02, 0]}>
          <Graphite />
        </RBox>
        {/* шайба лидара спереди */}
        <Cyl a={0.08} b={0.09} h={0.07} p={[0, baseTop + 0.035, 0.36]}>
          <Visor />
        </Cyl>
        <Ring r={0.085} tube={0.007} p={[0, baseTop + 0.04, 0.36]} rot={[Math.PI / 2, 0, 0]}>
          <Glow k={2} />
        </Ring>
        {/* кольцо статуса вокруг колонны */}
        <Ring r={0.2} tube={0.014} p={[0, baseTop + 0.005, 0]} rot={[Math.PI / 2, 0, 0]}>
          <Glow k={status} />
        </Ring>
        <Tag p={[0, 0.25, -0.501]} rot={[0, Math.PI, 0]} w={0.2} h={0.08} />
        <Vents p={[0.401, 0.25, 0.2]} rot={[0, Math.PI / 2, 0]} n={3} w={0.12} gap={0.028} />
        <Vents p={[-0.401, 0.25, 0.2]} rot={[0, -Math.PI / 2, 0]} n={3} w={0.12} gap={0.028} />
        {[-0.3, 0.3].flatMap((x) => [-0.4, 0.4].map((z) => <Bolt key={`${x}${z}`} p={[x, baseTop, z]} r={0.014} />))}
        <Led p={[0.3, 0.3, 0.502]} k={2.2} c="#7CFF8A" />
        {/* колёса и крылья над ними */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <group key={`${sx}${sz}`}>
              <OmniWheel p={[sx * 0.49, wheelR, sz * 0.33]} a={sx < 0 ? wl : wr} side={(sx * sz) as 1 | -1} />
              <RBox s={[0.17, 0.05, 0.4]} r={0.02} p={[sx * 0.48, wheelR * 2 + 0.035, sz * 0.33]}>
                <Graphite />
              </RBox>
            </group>
          )),
        )}
        {/* --- подъёмная колонна --- */}
        <RBox s={[0.27, sleeve, 0.23]} r={0.05} p={[0, baseTop + sleeve / 2, 0]}>
          <Graphite />
        </RBox>
        <Box s={[0.012, sleeve * 0.8, 0.01]} p={[0, baseTop + sleeve / 2, 0.116]}>
          <Accent />
        </Box>
        <RBox s={[0.2, ext + 0.24, 0.16]} r={0.03} p={[0, baseTop + sleeve + (ext + 0.24) / 2 - 0.18, 0]}>
          <Alu />
        </RBox>
        {Array.from({length: Math.max(0, Math.floor((ext + 0.05) / 0.08))}, (_, k) => (
          <Box key={k} s={[0.06, 0.006, 0.164]} p={[0.04, baseTop + sleeve + 0.03 + k * 0.08, 0]}>
            <Seam />
          </Box>
        ))}
        {/* кабель-цепь сзади: петля между базой и торсом, длина постоянна — при подъёме петля короче */}
        <Hose
          pts={[
            [0, baseTop + 0.05, -0.18],
            [0, baseTop + 0.2, -0.3 - (1 - ext / WHEEL.travel) * 0.12],
            [0, baseTop + sleeve * 0.5 + ext * 0.4, -0.27 - (1 - ext / WHEEL.travel) * 0.08],
            [0, P.colTop - 0.05, -0.14],
          ]}
          r={0.03}
        />
        {/* --- торс --- */}
        <group position={[0, P.colTop + 0.08, 0]} rotation={new THREE.Euler(P.lean, P.waistYaw, 0, "YXZ")}>
          <Cyl a={0.17} b={0.19} h={0.16} p={[0, -0.02, 0]}>
            <Graphite />
          </Cyl>
          <Ring r={0.182} tube={0.009} p={[0, 0.04, 0]} rot={[Math.PI / 2, 0, 0]}>
            <Glow k={1.5} />
          </Ring>
          <RBox s={[0.44, 0.26, 0.3]} r={0.09} p={[0, 0.17, 0]}>
            <Graphite />
          </RBox>
          {[-1, 1].map((sx) => (
            <RBox key={sx} s={[0.16, 0.1, 0.03]} r={0.03} p={[sx * 0.1, 0.15, 0.15]}>
              <Parchment />
            </RBox>
          ))}
          <group position={[0, 0.5, 0]}>
            <RBox s={[0.74, 0.5, 0.42]} r={0.14}>
              <Parchment />
            </RBox>
            {[-1, 1].map((sx) => (
              <RBox key={sx} s={[0.1, 0.42, 0.36]} r={0.05} p={[sx * 0.35, -0.02, -0.02]}>
                <Graphite />
              </RBox>
            ))}
            {/* эмблема на груди: лимонный светящийся ромб в графитовой рамке */}
            <RBox s={[0.2, 0.2, 0.03]} r={0.05} p={[0, 0.06, 0.205]} rot={[0, 0, Math.PI / 4]}>
              <Graphite />
            </RBox>
            <mesh position={[0, 0.06, 0.224]} rotation={[0, 0, Math.PI / 4]}>
              <torusGeometry args={[0.06, 0.012, 8, 4]} />
              <Glow k={P.glow * 0.9} />
            </mesh>
            {[-1, 1].map((sx) => (
              <Box key={sx} s={[0.006, 0.34, 0.01]} p={[sx * 0.2, 0, 0.21]}>
                <Seam />
              </Box>
            ))}
            {[-1, 1].flatMap((sx) => [0.15, -0.14].map((y) => <Bolt key={`${sx}${y}`} p={[sx * 0.26, y, 0.2]} rot={[Math.PI / 2, 0, 0]} r={0.011} />))}
            <Vents p={[0, -0.16, 0.211]} n={3} w={0.18} gap={0.024} />
            <RBox s={[0.42, 0.3, 0.08]} r={0.04} p={[0, 0.02, -0.24]}>
              <Graphite />
            </RBox>
          </group>
          {/* плечи и руки */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * shX, shY, 0]}>
              <RBox s={[0.24, 0.24, 0.3]} r={0.11} p={[s * 0.02, 0.06, 0]}>
                <Parchment />
              </RBox>
              {[-0.07, 0.07].map((z) => (
                <Bolt key={z} p={[s * 0.05, 0.18, z]} r={0.011} />
              ))}
              <group position={[s * 0.15, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
                <Cyl a={0.085} b={0.085} h={0.03}>
                  <Graphite />
                </Cyl>
              </group>
              <ArmW side={s as 1 | -1} a={s < 0 ? P.arms.R : P.arms.L} />
            </group>
          ))}
          {/* шея и голова */}
          <Capsule r={0.07} l={0.1} p={[0, 0.84, 0]}>
            <Graphite />
          </Capsule>
          {[-1, 1].map((s) => (
            <Hose key={s} pts={[[s * 0.09, 0.74, -0.14], [s * 0.07, 0.86, -0.1], [s * 0.04, 0.95, -0.06]]} r={0.011} seg={10} />
          ))}
          <group position={[0, 0.93, 0]} rotation={new THREE.Euler(P.head.pitch, P.head.yaw, P.head.roll, "YXZ")}>
            <RBox s={[0.44, 0.36, 0.4]} r={0.15} p={[0, 0.17, 0]}>
              <Parchment />
            </RBox>
            <RBox s={[0.38, 0.17, 0.06]} r={0.06} p={[0, 0.17, 0.185]}>
              <Visor />
            </RBox>
            {[-0.075, 0.075].map((x) => (
              <mesh key={x} position={[x, 0.18, 0.218]} scale={[1, P.blink ? 0.15 : 1, 0.5]}>
                <capsuleGeometry args={[0.02, 0.045, 4, 8]} />
                <EyeGlow k={P.glow} />
              </mesh>
            ))}
            <Box s={[0.12, 0.016, 0.02]} p={[0, 0.355, 0.12]}>
              <Accent />
            </Box>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.225, 0.17, 0]} rotation={[0, 0, Math.PI / 2]}>
                <Cyl a={0.07} b={0.07} h={0.04}>
                  <Graphite />
                </Cyl>
                <Ring r={0.042} tube={0.007} p={[0, s * 0.022, 0]} rot={[Math.PI / 2, 0, 0]}>
                  <Glow k={P.glow * 0.8} />
                </Ring>
              </group>
            ))}
            {/* сенсор-«антенна» */}
            <Cyl a={0.012} b={0.012} h={0.12} p={[0.12, 0.4, -0.06]}>
              <Metal />
            </Cyl>
            <Sph r={0.025} p={[0.12, 0.47, -0.06]}>
              <Glow k={P.glow} />
            </Sph>
          </group>
        </group>
      </group>
      {/* коробки */}
      {(plan.carry ?? []).map((c, k) => {
        if (c.show !== undefined && t < c.show) return null;
        const b = wheelBoxAt(plan, c, t);
        const s = c.s ?? BOX;
        return (
          <group key={k}>
            {!b.held || b.world.y < 1.2 ? <Shadow w={s[0] * 1.6} d={s[2] * 1.6} p={[b.world.x, 0, b.world.z]} o={b.held ? 0.35 : 0.6} /> : null}
            <CargoBox s={s} p={[b.world.x, b.world.y, b.world.z]} rot={[0, b.yaw, 0]} />
          </group>
        );
      })}
    </SkinScope>
  );
};
