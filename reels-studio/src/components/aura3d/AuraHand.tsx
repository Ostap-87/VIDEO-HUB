// Роборука Aura (референс source-videos/aura-robotics/3d-референсы/roboruka.png; решение пользователя 12.10.2026:
// «роборука должна уметь шевелить пальцами и брать двумя пальцами предметы и перемещать их в пространстве»).
// Стиль Aura: графитовые глянцевые фаланги, пергаментные накладки на тыльной стороне, шарниры со светящимися лимонными
// кольцами (на референсе — бирюзовые), пергаментное предплечье. Правая кисть ~1 ед. от запястья до кончика среднего
// пальца — модель для крупных планов, ставится в своей сцене. Пальцы вверх (+y), ладонь к −z, большой палец со стороны −x.
// План: keys — {at, pose, p, rot}: поза пальцев (имя из POSES или своя), где запястье (p) и как повёрнута кисть (rot, рад);
// rot — [наклон x, разворот y, крен z] (порядок YXZ: разворот вокруг вертикали — последним); между ключами всё плавно. wiggle — окна [от, до], когда пальцы шевелятся волной. items — предметы (кубик/шарик):
// start, size, carry — окна, когда предмет зажат между большим и указательным (точка щипка считается по позе пальцев).
// Чтобы взять предмет, запястье ставится функцией handReach(точка предмета, поворот) — щипок придёт ровно в предмет.
import React from "react";
import * as THREE from "three";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {Capsule, Cyl, Glow, Graphite, Parchment, RBox, Ring, Shadow, Sph, smooth, win, type V3} from "./kit";

type Finger = {base: V3; spread: number; lens: V3};
export const HAND = {
  fingers: [
    {base: [-0.15, 0.6, 0], spread: 0.06, lens: [0.2, 0.13, 0.1]},
    {base: [-0.05, 0.62, 0], spread: 0, lens: [0.22, 0.14, 0.1]},
    {base: [0.05, 0.61, 0], spread: -0.05, lens: [0.21, 0.13, 0.1]},
    {base: [0.15, 0.57, 0], spread: -0.12, lens: [0.16, 0.1, 0.09]},
  ] as Finger[],
  thumb: {base: [-0.22, 0.27, -0.05] as V3, lens: [0.2, 0.15, 0.12] as V3},
};

// поза: f — сгибы трёх фаланг каждого пальца (указательный, средний, безымянный, мизинец), th — большой палец:
// поворот основания (x, y, z) и сгибы трёх фаланг. Щипок (pinch) подобран численно: кончики сходятся в одной точке.
export type HandPose = {f: [V3, V3, V3, V3]; th: [number, number, number, number, number, number]};
export const POSES = {
  open: {f: [[0.05, 0.08, 0.05], [0.04, 0.06, 0.04], [0.05, 0.08, 0.05], [0.08, 0.1, 0.06]], th: [0.15, -0.45, 0.75, 0.05, 0.1, 0.05]},
  relaxed: {f: [[0.25, 0.35, 0.2], [0.3, 0.4, 0.25], [0.35, 0.45, 0.3], [0.4, 0.5, 0.3]], th: [0.25, -0.7, 0.85, 0.15, 0.25, 0.15]},
  fist: {f: [[1.45, 1.6, 1.1], [1.45, 1.65, 1.1], [1.45, 1.65, 1.1], [1.4, 1.6, 1.05]], th: [0.5, -1.2, 0.95, 0.5, 0.8, 0.5]},
  point: {f: [[0.02, 0.04, 0.02], [1.45, 1.6, 1.1], [1.45, 1.65, 1.1], [1.4, 1.6, 1.05]], th: [0.45, -1.1, 0.95, 0.45, 0.7, 0.4]},
  pinchOpen: {f: [[0.42, 0.52, 0.25], [0.75, 0.95, 0.6], [0.85, 1.05, 0.65], [0.9, 1.1, 0.7]], th: [0.4, -1.0, 1.0, 0.0, 0.1, 0.05]},
  pinch: {f: [[0.842, 1.099, 0.557], [0.95, 1.2, 0.7], [1.0, 1.25, 0.75], [1.05, 1.3, 0.8]], th: [0.462, -1.113, 1.079, 0.208, 0.487, 0.317]},
} satisfies Record<string, HandPose>;
export type PoseName = keyof typeof POSES | "hold";
const mixPose = (a: HandPose, b: HandPose, k: number): HandPose => ({
  f: a.f.map((v, i) => v.map((x, j) => x + (b.f[i][j] - x) * k)) as HandPose["f"],
  th: a.th.map((x, i) => x + (b.th[i] - x) * k) as HandPose["th"],
});
// hold — держит предмет ~0,1 ед.: почти щипок
export const poseOf = (p: PoseName | HandPose): HandPose => (typeof p === "string" ? (p === "hold" ? mixPose(POSES.pinchOpen, POSES.pinch, 0.8) : POSES[p]) : p);

// прямая кинематика пальца: кончик в системе кисти
const tipOf = (base: V3, rot: V3, lens: V3, curls: V3): THREE.Vector3 => {
  const root = new THREE.Object3D();
  root.position.set(...base);
  root.rotation.set(rot[0], rot[1], rot[2], "XYZ");
  let cur = root;
  lens.forEach((l, i) => {
    const j = new THREE.Object3D();
    j.rotation.set(-curls[i], 0, 0);
    if (i > 0) j.position.set(0, lens[i - 1], 0);
    cur.add(j);
    cur = j;
  });
  const tip = new THREE.Object3D();
  tip.position.set(0, lens[2], 0);
  cur.add(tip);
  root.updateMatrixWorld(true);
  return new THREE.Vector3().setFromMatrixPosition(tip.matrixWorld);
};
// точка щипка (между кончиками большого и указательного) в системе кисти
export const pinchPoint = (pose: HandPose): THREE.Vector3 => {
  const I = HAND.fingers[0];
  const a = tipOf(I.base, [0, 0, I.spread], I.lens, pose.f[0]);
  const b = tipOf(HAND.thumb.base, [pose.th[0], pose.th[1], pose.th[2]], HAND.thumb.lens, [pose.th[3], pose.th[4], pose.th[5]]);
  return a.add(b).multiplyScalar(0.5);
};
const handMatrix = (p: V3, rot: V3) =>
  new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], "YXZ")), new THREE.Vector3(1, 1, 1));
// куда поставить запястье, чтобы щипок (поза hold) пришёлся в точку item при повороте кисти rot
export const handReach = (item: V3, rot: V3, pose: PoseName | HandPose = "hold"): V3 => {
  const q = pinchPoint(poseOf(pose)).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], "YXZ")));
  return [item[0] - q.x, item[1] - q.y, item[2] - q.z];
};

export type HandKey = {at: number; pose?: PoseName | HandPose; p?: V3; rot?: V3};
export type HandItem = {start: V3; size?: number; shape?: "cube" | "sphere"; carry: [number, number][]};
export type HandPlan = {keys: HandKey[]; wiggle?: [number, number][]; items?: HandItem[]};

export const handState = (plan: HandPlan, t: number): {pose: HandPose; p: V3; rot: V3} => {
  let prev = {pose: POSES.relaxed as HandPose, p: [0, 0, 0] as V3, rot: [0, 0, 0] as V3};
  const ks = plan.keys.map((k) => {
    const out = {at: k.at, pose: k.pose ? poseOf(k.pose) : prev.pose, p: k.p ?? prev.p, rot: k.rot ?? prev.rot};
    prev = out;
    return out;
  });
  let cur = ks[0];
  if (t > ks[0].at) {
    cur = ks[ks.length - 1];
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i].at) {
        const A = ks[i - 1];
        const B = ks[i];
        const q = smooth((t - A.at) / Math.max(1e-6, B.at - A.at));
        cur = {
          at: t,
          pose: mixPose(A.pose, B.pose, q),
          p: A.p.map((v, j) => v + (B.p[j] - v) * q) as V3,
          rot: A.rot.map((v, j) => v + (B.rot[j] - v) * q) as V3,
        };
        break;
      }
    }
  }
  // пальцы шевелятся волной: от мизинца к указательному, большой — в такт
  let e = 0;
  for (const [a, b] of plan.wiggle ?? []) e = Math.max(e, win(t, a, b, 0.35));
  if (e > 0) {
    const f = cur.pose.f.map((v, i) => {
      const w = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.6 * t - (3 - i) * 0.9);
      return [v[0] + e * w * 0.7, v[1] + e * w * 0.9, v[2] + e * w * 0.5] as V3;
    }) as HandPose["f"];
    const wt = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.6 * t + 0.9);
    const th = [...cur.pose.th] as HandPose["th"];
    th[3] += e * wt * 0.3;
    th[4] += e * wt * 0.5;
    th[5] += e * wt * 0.3;
    cur = {...cur, pose: {f, th}};
  }
  return {pose: cur.pose, p: cur.p, rot: cur.rot};
};

const Joint: React.FC<{r: number}> = ({r}) => (
  <>
    <Sph r={r}>
      <Graphite cc={1} />
    </Sph>
    <Ring r={r * 1.04} tube={0.0065} rot={[0, Math.PI / 2, 0]}>
      <Glow k={2} />
    </Ring>
  </>
);

// палец: фаланги вложены друг в друга, сгиб — вокруг x к ладони
const Digit: React.FC<{lens: V3; curls: V3; i?: number; w?: number}> = ({lens, curls, i = 0, w = 1}) => {
  const l = lens[i];
  const r = (0.036 - i * 0.003) * w;
  return (
    <group position={i > 0 ? [0, lens[i - 1], 0] : [0, 0, 0]} rotation={[-curls[i], 0, 0]}>
      <Joint r={0.041 * w - i * 0.003} />
      <Capsule r={r} l={Math.max(0.01, l - 2 * r)} p={[0, l / 2, 0]}>
        <Graphite cc={1} />
      </Capsule>
      {/* пергаментная накладка на тыльной стороне фаланги */}
      <RBox s={[0.066 * w, l * (i === 2 ? 0.55 : 0.62), 0.03]} r={0.013} p={[0, l * (i === 2 ? 0.55 : 0.5), r * 0.75]}>
        <Parchment />
      </RBox>
      {i < 2 ? <Digit lens={lens} curls={curls} i={i + 1} w={w} /> : null}
    </group>
  );
};

export const HandModel: React.FC<{plan: HandPlan; t?: number}> = ({plan, t: tProp}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = tProp ?? frame / fps;
  const st = handState(plan, t);
  const {pose} = st;
  return (
    <>
      <group position={st.p} rotation={new THREE.Euler(st.rot[0], st.rot[1], st.rot[2], "YXZ")}>
        {/* предплечье и запястье */}
        <Cyl a={0.15} b={0.17} h={0.7} p={[0, -0.38, 0]}>
          <Parchment />
        </Cyl>
        <Cyl a={0.152} b={0.152} h={0.05} p={[0, -0.08, 0]}>
          <Graphite />
        </Cyl>
        <Cyl a={0.12} b={0.13} h={0.12} p={[0, 0.03, 0]}>
          <Graphite cc={1} />
        </Cyl>
        <Ring r={0.125} tube={0.008} p={[0, 0.03, 0]} rot={[Math.PI / 2, 0, 0]}>
          <Glow k={2} />
        </Ring>
        {/* ладонь: графитовый каркас сужается к запястью, пергаментная тыльная накладка, костяшки на графитовой оси */}
        <RBox s={[0.44, 0.3, 0.11]} r={0.05} p={[0, 0.45, -0.01]}>
          <Graphite cc={1} />
        </RBox>
        <RBox s={[0.34, 0.22, 0.1]} r={0.05} p={[0.02, 0.22, -0.01]}>
          <Graphite cc={1} />
        </RBox>
        <RBox s={[0.39, 0.3, 0.045]} r={0.1} p={[0.01, 0.44, 0.05]}>
          <Parchment />
        </RBox>
        <RBox s={[0.28, 0.18, 0.04]} r={0.08} p={[0.03, 0.21, 0.045]}>
          <Parchment />
        </RBox>
        <Cyl a={0.04} b={0.04} h={0.44} p={[0, 0.6, 0]} r={[0, 0, Math.PI / 2]}>
          <Graphite cc={1} />
        </Cyl>
        <RBox s={[0.15, 0.2, 0.08]} r={0.04} p={[-0.16, 0.27, -0.05]} rot={[0, 0, 0.35]}>
          <Parchment />
        </RBox>
        {HAND.fingers.map((F, k) => (
          <group key={k} position={F.base} rotation={[0, 0, F.spread]}>
            <Digit lens={F.lens} curls={pose.f[k]} w={k === 3 ? 0.88 : 1} />
          </group>
        ))}
        <group position={HAND.thumb.base} rotation={new THREE.Euler(pose.th[0], pose.th[1], pose.th[2], "XYZ")}>
          <Digit lens={HAND.thumb.lens} curls={[pose.th[3], pose.th[4], pose.th[5]]} w={1.08} />
        </group>
      </group>
      {(plan.items ?? []).map((it, k) => {
        const size = it.size ?? 0.1;
        let pos = new THREE.Vector3(...it.start);
        for (const [from, to] of it.carry) {
          if (t < from) break;
          const s = handState(plan, Math.min(t, to));
          pos = pinchPoint(s.pose).applyMatrix4(handMatrix(s.p, s.rot));
        }
        return (
          <group key={k} position={pos}>
            {it.shape === "sphere" ? (
              <Sph r={size / 2}>
                <meshPhysicalMaterial color="#FFF65D" roughness={0.25} clearcoat={1} emissive="#FFF65D" emissiveIntensity={0.15} />
              </Sph>
            ) : (
              <RBox s={[size, size, size]} r={size * 0.12}>
                <meshPhysicalMaterial color="#FFF65D" roughness={0.25} clearcoat={1} emissive="#FFF65D" emissiveIntensity={0.15} />
              </RBox>
            )}
          </group>
        );
      })}
    </>
  );
};

// подставка под предмет для роборуки: графитовая колонна, пергаментный диск
export const HandStand: React.FC<{p: V3; h?: number}> = ({p, h = 0.5}) => (
  <group position={p}>
    <Shadow w={0.6} d={0.6} o={0.7} />
    <Cyl a={0.07} b={0.09} h={h - 0.03} p={[0, (h - 0.03) / 2, 0]}>
      <Graphite />
    </Cyl>
    <Cyl a={0.16} b={0.16} h={0.03} p={[0, h - 0.015, 0]}>
      <Parchment />
    </Cyl>
    <Ring r={0.16} tube={0.006} p={[0, h, 0]} rot={[Math.PI / 2, 0, 0]}>
      <Glow k={1.4} />
    </Ring>
  </group>
);
