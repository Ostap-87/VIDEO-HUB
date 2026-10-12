// Промышленный манипулятор Aura, 6 осей (референс source-videos/aura-robotics/3d-референсы/manipulyator.png, решение
// пользователя 12.10.2026: «манипуляторы должны двигаться и манипулировать в разных плоскостях»). Стиль Aura: пергаментные
// звенья с лимонными полосами, графитовые моторы в шарнирах, чёрная пружина-противовес, двухпальцевый захват с резиной.
// Рост ~3,7 ед. (≈ 1,9 м), вылет ~2,7 ед. Оси: J1 — поворот колонны, J2 — плечо, J3 — локоть, J4 — вращение предплечья,
// J5 — наклон запястья, J6 — вращение захвата.
// План (координаты от основания, мировые единицы): keys — ключевые позы по времени, между ними — плавно по суставам:
//   {at, p: [x, y, z]} — куда поставить центр захвата (обратная кинематика, «локоть вверх»); tool — наклон захвата
//   (π — вниз, по умолчанию; π/2 — вперёд, горизонтально), j4 / j6 — вращение предплечья / захвата, grip — раскрытие
//   пальцев (ед.: 0,5 — открыт, по ширине коробки — держит); или {at, j: [j1, α2, α3, j4, α5, j6]} — суставы напрямую.
// items — коробки: start (центр), s (размер), carry — окна [от, до], когда коробка в захвате; после — стоит, где отпустили.
import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {Box, CargoBox, Cyl, Glow, Graphite, Metal, Parchment, RBox, Ring, Rubber, Seam, Shadow, Sph, smooth, type V3} from "./kit";

export const ARM = {a1: 0.18, H1: 0.85, L2: 1.3, L3: 1.2, L4: 0.38};
export type Joints = [number, number, number, number, number, number]; // j1, α2, α3 (абс.), j4, α5 (абс.), j6
export type ArmKey = {at: number; p?: V3; tool?: number; j?: Joints; j4?: number; j6?: number; grip?: number};
export type ArmItem = {start: V3; s?: V3; carry: [number, number][]};
export type ArmPlan = {keys: ArmKey[]; items?: ArmItem[]};
export const HOME: Joints = [0, 0.25, 1.45, 0, Math.PI, 0];

// обратная кинематика: центр захвата p (от основания) и наклон захвата tool → суставы
export const armIK = (p: V3, tool = Math.PI, j4 = 0, j6 = 0): Joints => {
  const {a1, H1, L2, L3, L4} = ARM;
  const j1 = Math.atan2(-p[2], p[0]);
  const pr = Math.hypot(p[0], p[2]);
  const wr = pr - L4 * Math.sin(tool);
  const wh = p[1] - L4 * Math.cos(tool);
  const dr = wr - a1;
  const dh = wh - H1;
  const D = Math.min(L2 + L3 - 0.01, Math.max(Math.abs(L2 - L3) + 0.01, Math.hypot(dr, dh)));
  const phi = Math.atan2(dr, dh);
  const beta = Math.acos((L2 * L2 + D * D - L3 * L3) / (2 * L2 * D));
  const a2 = phi - beta;
  const er = a1 + L2 * Math.sin(a2);
  const eh = H1 + L2 * Math.cos(a2);
  const a3 = Math.atan2(wr - er, wh - eh);
  return [j1, a2, a3, j4, tool, j6];
};

// прямая кинематика: центр захвата (от основания) при j4 = 0
export const armTip = (j: Joints): V3 => {
  const {a1, H1, L2, L3, L4} = ARM;
  const r = a1 + L2 * Math.sin(j[1]) + L3 * Math.sin(j[2]) + L4 * Math.sin(j[4]);
  const h = H1 + L2 * Math.cos(j[1]) + L3 * Math.cos(j[2]) + L4 * Math.cos(j[4]);
  return [r * Math.cos(j[0]), h, -r * Math.sin(j[0])];
};

// поза в момент t: суставы и раскрытие захвата
export const armPose = (plan: ArmPlan, t: number): {j: Joints; grip: number} => {
  let prev: {j: Joints; grip: number} = {j: HOME, grip: 0.5};
  const resolved = plan.keys.map((k) => {
    const j = k.j ?? (k.p ? armIK(k.p, k.tool ?? Math.PI, k.j4 ?? 0, k.j6 ?? prev.j[5]) : prev.j);
    const out = {at: k.at, j: [...j] as Joints, grip: k.grip ?? prev.grip};
    if (!k.j && !k.p) {
      if (k.j4 !== undefined) out.j[3] = k.j4;
      if (k.j6 !== undefined) out.j[5] = k.j6;
    }
    prev = out;
    return out;
  });
  if (!resolved.length || t <= resolved[0].at) return resolved[0] ?? {j: HOME, grip: 0.5};
  for (let i = 1; i < resolved.length; i++) {
    const B = resolved[i];
    if (t <= B.at) {
      const A = resolved[i - 1];
      const q = smooth((t - A.at) / Math.max(1e-6, B.at - A.at));
      return {j: A.j.map((a, k) => a + (B.j[k] - a) * q) as Joints, grip: A.grip + (B.grip - A.grip) * q};
    }
  }
  return resolved[resolved.length - 1];
};

const Motor: React.FC<{r: number; w: number}> = ({r, w}) => (
  <group rotation={[Math.PI / 2, 0, 0]}>
    <Cyl a={r} b={r} h={w}>
      <Graphite />
    </Cyl>
    {[-1, 1].map((s) => (
      <group key={s}>
        <Cyl a={r * 1.06} b={r * 1.06} h={0.04} p={[0, (s * w) / 2, 0]}>
          <Parchment />
        </Cyl>
        <Ring r={r * 0.55} tube={0.012} p={[0, s * (w / 2 + 0.022), 0]} rot={[Math.PI / 2, 0, 0]}>
          <Glow k={1.8} />
        </Ring>
      </group>
    ))}
  </group>
);

export const ArmModel: React.FC<{plan: ArmPlan; p?: V3; t?: number}> = ({plan, p = [0, 0, 0], t: tProp}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = tProp ?? frame / fps;
  const {j, grip} = armPose(plan, t);
  const [j1, a2, a3, j4, a5, j6] = j;
  const {a1, H1, L2, L3, L4} = ARM;
  // пружина-противовес: от колонны к середине плеча (в плоскости колонны, сбоку от плеча)
  const sa: [number, number] = [a1 + 0.3, H1 - 0.32];
  const sb: [number, number] = [a1 + 0.62 * L2 * Math.sin(a2) + 0.2 * Math.cos(a2), H1 + 0.62 * L2 * Math.cos(a2) - 0.2 * Math.sin(a2)];
  const sl = Math.hypot(sb[0] - sa[0], sb[1] - sa[1]);
  const sAng = Math.atan2(sb[0] - sa[0], sb[1] - sa[1]);
  const fingerX = Math.max(0.06, grip / 2) + 0.03;
  return (
    <group position={p}>
      <Shadow w={2.2} d={2.2} />
      {/* основание */}
      <Cyl a={0.56} b={0.6} h={0.12} p={[0, 0.06, 0]}>
        <Graphite />
      </Cyl>
      {Array.from({length: 6}, (_, k) => (
        <Cyl key={k} a={0.035} b={0.035} h={0.03} p={[Math.cos((k * Math.PI) / 3) * 0.5, 0.135, Math.sin((k * Math.PI) / 3) * 0.5]}>
          <Metal />
        </Cyl>
      ))}
      <Cyl a={0.4} b={0.46} h={0.3} p={[0, 0.27, 0]}>
        <Parchment />
      </Cyl>
      <Ring r={0.43} tube={0.012} p={[0, 0.4, 0]} rot={[Math.PI / 2, 0, 0]}>
        <Glow k={1.8} />
      </Ring>
      {/* J1: колонна */}
      <group rotation={[0, j1, 0]}>
        <RBox s={[0.66, 0.5, 0.6]} r={0.1} p={[0.05, 0.66, 0]}>
          <Parchment />
        </RBox>
        <Box s={[0.02, 0.06, 0.4]} p={[0.385, 0.62, 0]}>
          <meshStandardMaterial color="#FFF65D" roughness={0.45} />
        </Box>
        {/* пружина-противовес (гофра) */}
        <group position={[sa[0], sa[1], 0.3]} rotation={[0, 0, -sAng]}>
          <Cyl a={0.05} b={0.05} h={sl} p={[0, sl / 2, 0]}>
            <Metal />
          </Cyl>
          {Array.from({length: 10}, (_, k) => (
            <Ring key={k} r={0.065} tube={0.022} p={[0, sl * (0.12 + (k * 0.7) / 9), 0]} rot={[Math.PI / 2, 0, 0]}>
              <Seam />
            </Ring>
          ))}
        </group>
        {/* J2: плечо */}
        <group position={[a1, H1, 0]} rotation={[0, 0, -a2]}>
          <Motor r={0.25} w={0.66} />
          <RBox s={[0.36, L2 + 0.16, 0.3]} r={0.1} p={[0, L2 / 2, 0]}>
            <Parchment />
          </RBox>
          <Box s={[0.05, L2 * 0.5, 0.012]} p={[0.07, L2 * 0.5, 0.152]}>
            <meshStandardMaterial color="#FFF65D" roughness={0.45} />
          </Box>
          {/* J3: локоть */}
          <group position={[0, L2, 0]} rotation={[0, 0, -(a3 - a2)]}>
            <Motor r={0.19} w={0.52} />
            <RBox s={[0.28, 0.42, 0.28]} r={0.09} p={[0, 0.14, 0]}>
              <Parchment />
            </RBox>
            <RBox s={[0.22, L3 - 0.2, 0.22]} r={0.08} p={[0, L3 / 2 + 0.05, 0]}>
              <Parchment />
            </RBox>
            <Cyl a={0.115} b={0.115} h={0.06} p={[0, L3 - 0.2, 0]}>
              <meshPhysicalMaterial color="#FFF65D" metalness={0.1} roughness={0.35} clearcoat={0.9} />
            </Cyl>
            {/* J4 — вращение предплечья, J5 — запястье */}
            <group position={[0, L3, 0]} rotation={[0, j4, 0]}>
              <group rotation={[0, 0, -(a5 - a3)]}>
                <Sph r={0.12}>
                  <Graphite />
                </Sph>
                <Cyl a={0.1} b={0.12} h={0.08} p={[0, 0.12, 0]}>
                  <Graphite />
                </Cyl>
                {/* J6 — захват */}
                <group rotation={[0, j6, 0]}>
                  <Cyl a={0.09} b={0.09} h={0.04} p={[0, 0.18, 0]}>
                    <Metal />
                  </Cyl>
                  {/* корпус захвата шире хода пальцев: пальцы ездят по направляющей, не висят в воздухе */}
                  <RBox s={[0.66, 0.1, 0.17]} r={0.03} p={[0, 0.25, 0]}>
                    <Graphite />
                  </RBox>
                  <Box s={[0.62, 0.03, 0.06]} p={[0, 0.31, 0]}>
                    <Metal />
                  </Box>
                  <Box s={[0.3, 0.012, 0.172]} p={[0, 0.25, 0]}>
                    <Glow k={1.4} />
                  </Box>
                  {[-1, 1].map((s) => (
                    <group key={s} position={[s * fingerX, L4, 0]}>
                      <RBox s={[0.06, 0.22, 0.13]} r={0.015} p={[0, -0.01, 0]}>
                        <Parchment />
                      </RBox>
                      <Box s={[0.012, 0.12, 0.1]} p={[-s * 0.031, -0.03, 0]}>
                        <Rubber />
                      </Box>
                    </group>
                  ))}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
      {/* коробки */}
      {(plan.items ?? []).map((it, k) => {
        const s = it.s ?? ([0.36, 0.36, 0.36] as V3);
        let pos = it.start;
        let yaw = 0;
        for (const [from, to] of it.carry) {
          if (t < from) break;
          const jj = armPose(plan, Math.min(t, to)).j;
          pos = armTip(jj);
          yaw = jj[0] + jj[5];
        }
        return (
          <group key={k}>
            <Shadow w={s[0] * 1.8} d={s[2] * 1.8} p={[pos[0], 0, pos[2]]} o={Math.max(0.15, 0.6 - pos[1] * 0.25)} />
            <CargoBox s={s} p={pos} rot={[0, yaw, 0]} />
          </group>
        );
      })}
    </group>
  );
};


