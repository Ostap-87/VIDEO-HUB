// Промышленный манипулятор Aura, 6 осей (референс source-videos/aura-robotics/3d-референсы/manipulyator.png, решение
// пользователя 12.10.2026: «манипуляторы должны двигаться и манипулировать в разных плоскостях»). Стиль Aura: пергаментные
// звенья с лимонными полосами, графитовые моторы в шарнирах, чёрная пружина-противовес, двухпальцевый захват с резиной.
// Рост ~3,7 ед. (≈ 1,9 м), вылет ~2,7 ед. Оси: J1 — поворот колонны, J2 — плечо, J3 — локоть, J4 — вращение предплечья,
// J5 — наклон запястья, J6 — вращение захвата.
// План (координаты от основания, мировые единицы): keys — ключевые позы по времени, между ними — плавно по суставам:
//   {at, p: [x, y, z]} — куда поставить центр захвата (обратная кинематика, «локоть вверх»); tool — наклон захвата
//   (π — вниз, по умолчанию; π/2 — вперёд, горизонтально), j4 / j6 — вращение предплечья / захвата, grip — раскрытие
//   пальцев (ед.: 0,5 — открыт, по ширине коробки — держит); или {at, j: [j1, α2, α3, j4, α5, j6]} — суставы напрямую.
// items — коробки: start (центр), s (размер), carry — окна [от, до], когда коробка в захвате; после — стоит, где отпустили;
//   show / hide — с какого и до какого момента коробку видно (до show её везёт конвейер, Conveyor.tsx).
// Скины и дизайны (05.11.2026, «манипуляторы другого цвета и другого дизайна»): skin="aura" — как было (пергамент, лимонный);
// "industrial" — белая эмаль и графитовые моторы-коробки как на референсе, звенья толще, чёрная гофра пружины-противовеса,
// рым-болты, кабель-пакет; "cobot" — новый дизайн: тонкий коллаборативный робот (цилиндрические звенья, круглые крышки шарниров
// со светящимися синими кольцами, без пружины), белый с синим #2B6CB0. Кинематика и план у всех трёх одинаковые.
import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {Accent, Bellows, Bolt, BoltRing, Box, CargoBox, Cyl, Glow, Graphite, Hose, Led, Metal, Parchment, RBox, Ring, Rubber, Seam, Shadow, SkinScope, Sph, Tag, Vents, smooth, type V3} from "./kit";

export const ARM = {a1: 0.18, H1: 0.85, L2: 1.3, L3: 1.2, L4: 0.38};
export type Joints = [number, number, number, number, number, number]; // j1, α2, α3 (абс.), j4, α5 (абс.), j6
export type ArmKey = {at: number; p?: V3; tool?: number; j?: Joints; j4?: number; j6?: number; grip?: number};
export type ArmItem = {start: V3; s?: V3; carry: [number, number][]; show?: number; hide?: number};
export type ArmSkin = "aura" | "industrial" | "cobot";
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
        <BoltRing n={6} R={r * 0.82} p={[0, s * (w / 2 + 0.02), 0]} rot={s < 0 ? [Math.PI, 0, 0] : undefined} r={0.016} />
      </group>
    ))}
  </group>
);

// захват: корпус на фланце J6, пальцы ездят по направляющей; round — круглый корпус (кобот)
const Gripper: React.FC<{grip: number; round?: boolean}> = ({grip, round}) => {
  const {L4} = ARM;
  const fingerX = Math.max(0.06, grip / 2) + 0.03;
  return (
    <>
      <Cyl a={0.09} b={0.09} h={0.04} p={[0, 0.18, 0]}>
        <Metal />
      </Cyl>
      <BoltRing n={6} R={0.07} p={[0, 0.2, 0]} r={0.011} rot={[Math.PI, 0, 0]} />
      {round ? (
        <>
          <Cyl a={0.12} b={0.12} h={0.1} p={[0, 0.24, 0]}>
            <Parchment />
          </Cyl>
          <Ring r={0.12} tube={0.008} p={[0, 0.245, 0]} rot={[Math.PI / 2, 0, 0]}>
            <Glow k={1.6} />
          </Ring>
          <RBox s={[0.52, 0.07, 0.13]} r={0.03} p={[0, 0.3, 0]}>
            <Graphite />
          </RBox>
          <Box s={[0.48, 0.02, 0.05]} p={[0, 0.34, 0]}>
            <Metal />
          </Box>
        </>
      ) : (
        <>
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
          {/* пневмолинии к захвату */}
          {[-1, 1].map((s) => (
            <Hose key={s} pts={[[s * 0.2, 0.25, -0.086], [s * 0.16, 0.18, -0.14], [s * 0.05, 0.04, -0.12], [s * 0.03, -0.06, -0.1]]} r={0.011} mat={s > 0 ? "rubber" : "accent"} />
          ))}
          {[-0.27, 0.27].map((x) => (
            <Bolt key={x} p={[x, 0.25, 0.086]} rot={[Math.PI / 2, 0, 0]} r={0.012} />
          ))}
        </>
      )}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * fingerX, L4, 0]}>
          <RBox s={[0.06, 0.22, 0.13]} r={0.015} p={[0, -0.01, 0]}>
            <Parchment />
          </RBox>
          <Box s={[0.012, 0.12, 0.1]} p={[-s * 0.031, -0.03, 0]}>
            <Rubber />
          </Box>
          <Bolt p={[0, 0.05, 0.066]} rot={[Math.PI / 2, 0, 0]} r={0.01} />
        </group>
      ))}
    </>
  );
};

type BodyProps = {j: Joints; grip: number};

// --- Aura: пергаментные звенья, лимонные полосы, графитовые моторы со светящимися кольцами (как было) + болты и кабели ---
const AuraBody: React.FC<BodyProps> = ({j, grip}) => {
  const [j1, a2, a3, j4, a5, j6] = j;
  const {a1, H1, L2, L3} = ARM;
  // пружина-противовес: от колонны к середине плеча (в плоскости колонны, сбоку от плеча)
  const sa: [number, number] = [a1 + 0.3, H1 - 0.32];
  const sb: [number, number] = [a1 + 0.62 * L2 * Math.sin(a2) + 0.2 * Math.cos(a2), H1 + 0.62 * L2 * Math.cos(a2) - 0.2 * Math.sin(a2)];
  const sl = Math.hypot(sb[0] - sa[0], sb[1] - sa[1]);
  const sAng = Math.atan2(sb[0] - sa[0], sb[1] - sa[1]);
  return (
    <>
      <Shadow w={2.2} d={2.2} />
      {/* основание */}
      <Cyl a={0.56} b={0.6} h={0.12} p={[0, 0.06, 0]}>
        <Graphite />
      </Cyl>
      {Array.from({length: 6}, (_, k) => (
        <Bolt key={k} p={[Math.cos((k * Math.PI) / 3) * 0.5, 0.12, Math.sin((k * Math.PI) / 3) * 0.5]} r={0.035} />
      ))}
      <Cyl a={0.4} b={0.46} h={0.3} p={[0, 0.27, 0]}>
        <Parchment />
      </Cyl>
      <Ring r={0.43} tube={0.012} p={[0, 0.4, 0]} rot={[Math.PI / 2, 0, 0]}>
        <Glow k={1.8} />
      </Ring>
      <Tag p={[0, 0.27, 0.452]} rot={[-0.13, 0, 0]} w={0.2} h={0.09} />
      {/* питание и сеть: кабели входят в основание сзади */}
      <Hose pts={[[-1.1, 0.03, -0.2], [-0.8, 0.03, -0.25], [-0.55, 0.06, -0.25], [-0.42, 0.2, -0.2]]} r={0.035} />
      <Hose pts={[[-1.1, 0.025, -0.05], [-0.8, 0.025, -0.1], [-0.55, 0.05, -0.12], [-0.43, 0.16, -0.08]]} r={0.022} mat="dark" />
      {/* J1: колонна */}
      <group rotation={[0, j1, 0]}>
        <RBox s={[0.66, 0.5, 0.6]} r={0.1} p={[0.05, 0.66, 0]}>
          <Parchment />
        </RBox>
        <Box s={[0.02, 0.06, 0.4]} p={[0.385, 0.62, 0]}>
          <Accent />
        </Box>
        <Vents p={[-0.1, 0.62, 0.302]} n={4} w={0.22} gap={0.035} />
        <Led p={[0.2, 0.78, 0.302]} k={2.2} />
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
          <Sph r={0.06} p={[0, 0, 0]}>
            <Graphite />
          </Sph>
        </group>
        {/* J2: плечо */}
        <group position={[a1, H1, 0]} rotation={[0, 0, -a2]}>
          <Motor r={0.25} w={0.66} />
          <RBox s={[0.36, L2 + 0.16, 0.3]} r={0.1} p={[0, L2 / 2, 0]}>
            <Parchment />
          </RBox>
          <Box s={[0.05, L2 * 0.5, 0.012]} p={[0.07, L2 * 0.5, 0.152]}>
            <Accent />
          </Box>
          {/* шов крышки звена и винты */}
          <Box s={[0.005, L2 * 0.6, 0.304]} p={[-0.181, L2 * 0.5, 0]}>
            <Seam />
          </Box>
          {[0.3, 0.7].map((k) => (
            <Bolt key={k} p={[-0.07, L2 * k, 0.152]} rot={[Math.PI / 2, 0, 0]} r={0.014} />
          ))}
          {/* кабель-пакет вдоль плеча */}
          <Hose pts={[[-0.16, 0.05, -0.17], [-0.24, L2 * 0.35, -0.2], [-0.24, L2 * 0.7, -0.2], [-0.12, L2 + 0.05, -0.17]]} r={0.03} />
          {[0.25, 0.6].map((k) => (
            <Box key={k} s={[0.07, 0.035, 0.07]} p={[-0.22, L2 * k, -0.2]}>
              <Graphite />
            </Box>
          ))}
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
              <Accent />
            </Cyl>
            <Hose pts={[[-0.1, 0.05, -0.15], [-0.16, L3 * 0.4, -0.13], [-0.14, L3 * 0.8, -0.12], [-0.06, L3 + 0.05, -0.1]]} r={0.022} />
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
                  <Gripper grip={grip} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
};

// мотор-коробка промышленного робота (ось — z): графитовый корпус с рёбрами и крышкой
const BoxMotor: React.FC<{s: V3; p: V3}> = ({s, p}) => (
  <group position={p}>
    <RBox s={s} r={0.035}>
      <Graphite />
    </RBox>
    {[-1, 0, 1].map((k) => (
      <Box key={k} s={[s[0] * 1.03, 0.012, s[2] * 0.8]} p={[0, k * s[1] * 0.28, 0]}>
        <Seam />
      </Box>
    ))}
    <RBox s={[s[0] * 0.7, s[1] * 0.7, 0.05]} r={0.02} p={[0, 0, s[2] / 2 + 0.02]}>
      <Graphite />
    </RBox>
    {[-1, 1].flatMap((a) => [-1, 1].map((b) => <Bolt key={`${a}${b}`} p={[a * s[0] * 0.28, b * s[1] * 0.28, s[2] / 2 + 0.045]} rot={[Math.PI / 2, 0, 0]} r={0.013} />))}
    <Hose pts={[[s[0] * 0.3, s[1] / 2, 0], [s[0] * 0.45, s[1] / 2 + 0.08, -s[2] * 0.3], [s[0] * 0.3, s[1] / 2 + 0.12, -s[2] * 0.8]]} r={0.018} />
  </group>
);
// рым-болт (такелажная петля) — как на референсе
const EyeBolt: React.FC<{p: V3; rot?: V3}> = ({p, rot}) => (
  <group position={p} rotation={rot}>
    <Cyl a={0.025} b={0.03} h={0.05} p={[0, 0.025, 0]}>
      <Metal />
    </Cyl>
    <Ring r={0.045} tube={0.014} p={[0, 0.09, 0]}>
      <Metal />
    </Ring>
  </group>
);

// --- industrial: белая эмаль, моторы-коробки, звенья толще, гофра пружины, рым-болты, кабель-пакет ---
const IndustrialBody: React.FC<BodyProps> = ({j, grip}) => {
  const [j1, a2, a3, j4, a5, j6] = j;
  const {a1, H1, L2, L3} = ARM;
  const sa: V3 = [a1 + 0.36, H1 - 0.34, 0.38];
  const sb: V3 = [a1 + 0.62 * L2 * Math.sin(a2) + 0.24 * Math.cos(a2), H1 + 0.62 * L2 * Math.cos(a2) - 0.24 * Math.sin(a2), 0.38];
  return (
    <>
      <Shadow w={2.5} d={2.5} />
      {/* литое основание с лапами */}
      <Cyl a={0.5} b={0.66} h={0.34} p={[0, 0.17, 0]}>
        <Parchment />
      </Cyl>
      {[0, 1, 2, 3].map((k) => {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        return (
          <group key={k} position={[Math.cos(a) * 0.66, 0.03, Math.sin(a) * 0.66]} rotation={[0, -a, 0]}>
            <RBox s={[0.26, 0.06, 0.2]} r={0.025}>
              <Parchment />
            </RBox>
            <Bolt p={[0.05, 0.03, 0]} r={0.03} />
          </group>
        );
      })}
      <Box s={[1.36, 0.008, 1.36]} p={[0, 0.002, 0]}>
        <meshStandardMaterial color="#B9B7B1" roughness={0.8} />
      </Box>
      <BoxMotor s={[0.26, 0.42, 0.26]} p={[-0.42, 0.48, 0.34]} />
      <Hose pts={[[-1.2, 0.04, -0.3], [-0.9, 0.04, -0.35], [-0.6, 0.08, -0.35], [-0.5, 0.22, -0.3]]} r={0.04} />
      <Tag p={[0.3, 0.2, 0.55]} rot={[-0.4, 0.5, 0]} w={0.18} h={0.08} dark />
      {/* J1: поворотная колонна */}
      <group rotation={[0, j1, 0]}>
        <RBox s={[0.8, 0.62, 0.74]} r={0.16} p={[0.06, 0.66, 0]}>
          <Parchment />
        </RBox>
        <Cyl a={0.46} b={0.5} h={0.06} p={[0, 0.36, 0]}>
          <Graphite />
        </Cyl>
        <EyeBolt p={[-0.18, 0.97, 0.18]} />
        <Led p={[0.38, 0.78, 0.38]} k={2} c="#7CFF8A" />
        {/* пружина-противовес в чёрной гофре */}
        <Bellows a={sa} b={sb} r={0.1} n={18} />
        <Sph r={0.07} p={sa}>
          <Graphite />
        </Sph>
        {/* J2: плечо — белый круглый кожух и мотор-коробка сбоку */}
        <group position={[a1, H1, 0]} rotation={[0, 0, -a2]}>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <Cyl a={0.33} b={0.33} h={0.7}>
              <Parchment />
            </Cyl>
            <Cyl a={0.2} b={0.2} h={0.72}>
              <Graphite />
            </Cyl>
          </group>
          <BoxMotor s={[0.3, 0.3, 0.26]} p={[0, 0, -0.5]} />
          <RBox s={[0.48, L2 + 0.24, 0.4]} r={0.16} p={[0, L2 / 2, 0]}>
            <Parchment />
          </RBox>
          <Box s={[0.006, L2 * 0.7, 0.404]} p={[0.241, L2 * 0.52, 0]}>
            <Seam />
          </Box>
          {[0.25, 0.5, 0.75].map((k) => (
            <Bolt key={k} p={[0.15, L2 * k, 0.201]} rot={[Math.PI / 2, 0, 0]} r={0.016} />
          ))}
          <EyeBolt p={[0, L2 * 0.3, 0.2]} rot={[Math.PI / 2, 0, 0]} />
          {/* кабель-пакет */}
          <Hose pts={[[-0.22, -0.1, -0.22], [-0.32, L2 * 0.4, -0.24], [-0.3, L2 * 0.8, -0.24], [-0.15, L2 + 0.1, -0.22]]} r={0.04} />
          {[0.3, 0.65].map((k) => (
            <RBox key={k} s={[0.1, 0.05, 0.1]} r={0.015} p={[-0.3, L2 * k, -0.24]}>
              <Graphite />
            </RBox>
          ))}
          {/* J3: локоть — белый кожух, мотор-коробка, длинное трубчатое предплечье */}
          <group position={[0, L2, 0]} rotation={[0, 0, -(a3 - a2)]}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <Cyl a={0.26} b={0.26} h={0.56}>
                <Parchment />
              </Cyl>
              <Cyl a={0.15} b={0.15} h={0.58}>
                <Graphite />
              </Cyl>
            </group>
            <BoxMotor s={[0.26, 0.26, 0.22]} p={[0, -0.02, 0.42]} />
            <RBox s={[0.42, 0.5, 0.44]} r={0.15} p={[0, 0.18, 0]}>
              <Parchment />
            </RBox>
            <Cyl a={0.13} b={0.17} h={L3 - 0.38} p={[0, 0.25 + (L3 - 0.38) / 2, 0]}>
              <Parchment />
            </Cyl>
            <Ring r={0.165} tube={0.012} p={[0, 0.3, 0]} rot={[Math.PI / 2, 0, 0]}>
              <Graphite />
            </Ring>
            {/* табличка на предплечье — тёмная, без надписей */}
            <RBox s={[0.12, 0.34, 0.02]} r={0.008} p={[0, L3 * 0.6, 0.152]}>
              <Graphite />
            </RBox>
            <Box s={[0.04, 0.12, 0.004]} p={[0, L3 * 0.6 + 0.08, 0.163]}>
              <meshStandardMaterial color="#F2F0EC" roughness={0.5} />
            </Box>
            <Hose pts={[[-0.16, 0.2, -0.16], [-0.17, L3 * 0.5, -0.14], [-0.12, L3 - 0.05, -0.12]]} r={0.025} />
            <group position={[0, L3, 0]} rotation={[0, j4, 0]}>
              <group rotation={[0, 0, -(a5 - a3)]}>
                <group rotation={[Math.PI / 2, 0, 0]}>
                  <Cyl a={0.13} b={0.13} h={0.26}>
                    <Parchment />
                  </Cyl>
                </group>
                <Cyl a={0.11} b={0.13} h={0.1} p={[0, 0.12, 0]}>
                  <Parchment />
                </Cyl>
                <group rotation={[0, j6, 0]}>
                  <Gripper grip={grip} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
};

// крышка шарнира кобота: белый цилиндр по оси z, торцы — графит со светящимся синим кольцом
const CobotJoint: React.FC<{r: number; w: number; p?: V3}> = ({r, w, p = [0, 0, 0]}) => (
  <group position={p}>
    <group rotation={[Math.PI / 2, 0, 0]}>
      <Cyl a={r} b={r} h={w}>
        <Parchment />
      </Cyl>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Cyl a={r * 0.92} b={r * 0.92} h={0.02} p={[0, s * (w / 2 + 0.008), 0]}>
            <Graphite />
          </Cyl>
          <Ring r={r * 0.72} tube={0.011} p={[0, s * (w / 2 + 0.02), 0]} rot={[Math.PI / 2, 0, 0]}>
            <Glow k={2} />
          </Ring>
          <Cyl a={r * 0.38} b={r * 0.38} h={0.016} p={[0, s * (w / 2 + 0.02), 0]}>
            <Parchment />
          </Cyl>
        </group>
      ))}
    </group>
    <Box s={[r * 2.02, 0.012, w * 0.6]} p={[0, 0, 0]}>
      <Accent />
    </Box>
  </group>
);

// --- cobot: тонкие цилиндрические звенья, круглые крышки шарниров со световыми кольцами, без пружины ---
const CobotBody: React.FC<BodyProps> = ({j, grip}) => {
  const [j1, a2, a3, j4, a5, j6] = j;
  const {a1, H1, L2, L3} = ARM;
  return (
    <>
      <Shadow w={1.6} d={1.6} />
      <Cyl a={0.42} b={0.44} h={0.05} p={[0, 0.025, 0]}>
        <Graphite />
      </Cyl>
      <BoltRing n={8} R={0.36} p={[0, 0.05, 0]} r={0.022} phase={0.2} />
      <Cyl a={0.27} b={0.29} h={0.42} p={[0, 0.26, 0]}>
        <Parchment />
      </Cyl>
      <Ring r={0.272} tube={0.012} p={[0, 0.47, 0]} rot={[Math.PI / 2, 0, 0]}>
        <Glow k={2} />
      </Ring>
      <Tag p={[0, 0.24, 0.29]} w={0.16} h={0.08} />
      <Hose pts={[[-0.9, 0.03, -0.1], [-0.6, 0.03, -0.12], [-0.38, 0.06, -0.1], [-0.27, 0.14, -0.06]]} r={0.025} mat="dark" />
      <group rotation={[0, j1, 0]}>
        <Cyl a={0.25} b={0.27} h={0.2} p={[0, 0.58, 0]}>
          <Parchment />
        </Cyl>
        <Cyl a={0.24} b={0.24} h={0.012} p={[0, 0.685, 0]}>
          <Accent />
        </Cyl>
        <RBox s={[0.36, 0.2, 0.3]} r={0.1} p={[a1 * 0.6, 0.74, 0]}>
          <Parchment />
        </RBox>
        <group position={[a1, H1, 0]} rotation={[0, 0, -a2]}>
          <CobotJoint r={0.19} w={0.42} />
          <Cyl a={0.1} b={0.11} h={L2 - 0.3} p={[0, L2 / 2, 0]}>
            <Parchment />
          </Cyl>
          {[0.2, L2 - 0.2].map((y) => (
            <Cyl key={y} a={0.112} b={0.112} h={0.03} p={[0, y, 0]}>
              <Accent />
            </Cyl>
          ))}
          <group position={[0, L2, 0]} rotation={[0, 0, -(a3 - a2)]}>
            <CobotJoint r={0.155} w={0.36} />
            <Cyl a={0.085} b={0.095} h={L3 - 0.28} p={[0, L3 / 2 - 0.02, 0]}>
              <Parchment />
            </Cyl>
            <Cyl a={0.097} b={0.097} h={0.03} p={[0, 0.18, 0]}>
              <Accent />
            </Cyl>
            <group position={[0, L3, 0]} rotation={[0, j4, 0]}>
              <group rotation={[0, 0, -(a5 - a3)]}>
                <CobotJoint r={0.11} w={0.26} />
                <Cyl a={0.1} b={0.1} h={0.1} p={[0, 0.1, 0]}>
                  <Parchment />
                </Cyl>
                <Ring r={0.1} tube={0.009} p={[0, 0.14, 0]} rot={[Math.PI / 2, 0, 0]}>
                  <Glow k={2} />
                </Ring>
                <group rotation={[0, j6, 0]}>
                  <Gripper grip={grip} round />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
};

export const ArmModel: React.FC<{plan: ArmPlan; p?: V3; t?: number; skin?: ArmSkin}> = ({plan, p = [0, 0, 0], t: tProp, skin = "aura"}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = tProp ?? frame / fps;
  const {j, grip} = armPose(plan, t);
  return (
    <SkinScope skin={skin}>
      <group position={p}>
        {skin === "industrial" ? <IndustrialBody j={j} grip={grip} /> : skin === "cobot" ? <CobotBody j={j} grip={grip} /> : <AuraBody j={j} grip={grip} />}
        {/* коробки */}
        {(plan.items ?? []).map((it, k) => {
          if (it.show !== undefined && t < it.show) return null;
          if (it.hide !== undefined && t >= it.hide) return null;
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
    </SkinScope>
  );
};
