// AGV-тележка Aura (референс source-videos/aura-robotics/3d-референсы/agv.webp, решение пользователя 12.10.2026:
// «AGV должны двигаться и ездить, уметь подвозить коробки»). Стиль Aura: пергаментный корпус с лимонной полосой
// (на референсе оранжевая), графитовый резиновый бампер, чёрное окно лидара, лимонные диоды, ведущие колёса по бокам,
// алюминиевая площадка с отверстиями и двумя профилями, подъёмник. Размер ~2 × 1,4 ед. (≈ 1 × 0,7 м), передом по +x.
// План (мировые единицы сцены Stage):
// - stays — где стоять к моменту at (x, z, курс yaw); между точками едет с разгоном и торможением, разворачивается на месте,
//   при движении назад не разворачивается, а сдаёт задом; колёса крутятся по пройденному пути (на развороте — в разные стороны);
// - lift — ключевые кадры подъёма площадки 0…1 ([[3.5, 0], [4, 1], [5, 1], [5.4, 0]]);
// - boxes — сколько коробок стоит на площадке в начале (стопкой, до 3), loads — моменты, когда сверху опускается ещё одна
//   (её «кладёт» манипулятор или человек), unloads — моменты, когда верхняя съезжает назад и остаётся на полу.
import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {Alu, Box, CargoBox, Cyl, Glow, Graphite, Metal, Parchment, RBox, Rubber, Seam, Shadow, Visor, clamp01, pathAt, track, type Stay, type V3} from "./kit";

export type AgvPlan = {stays: Stay[]; speed?: number; lift?: [number, number][]; boxes?: number; loads?: number[]; unloads?: number[]};

export const AGV = {L: 2.0, W: 1.36, wheelR: 0.16, track: 0.7, plateY: 0.58, liftMax: 0.24, box: [0.8, 0.42, 0.7] as V3};
const LOAD = 0.6; // секунд падает новая коробка
const UNLOAD = 0.95; // секунд съезжает и падает верхняя

// что на площадке и что уже лежит на полу в момент t
const cargoAt = (plan: AgvPlan, t: number) => {
  const ev = [...(plan.loads ?? []).map((at) => ({at, k: 1})), ...(plan.unloads ?? []).map((at) => ({at, k: -1}))].sort((a, b) => a.at - b.at);
  let n = plan.boxes ?? 0;
  let falling: null | {i: number; p: number} = null;
  let leaving: null | {i: number; p: number} = null;
  const dropped: {at: number}[] = [];
  for (const e of ev) {
    if (e.k > 0) {
      if (t < e.at - LOAD) break;
      if (t < e.at + 0.25) falling = {i: n, p: (t - (e.at - LOAD)) / (LOAD + 0.25)};
      n++;
    } else {
      if (t < e.at) break;
      if (t < e.at + UNLOAD) {
        leaving = {i: n - 1, p: (t - e.at) / UNLOAD};
      } else dropped.push({at: e.at});
      n--;
    }
  }
  return {n, falling, leaving, dropped};
};

const Wheel: React.FC<{z: number; a: number}> = ({z, a}) => (
  <group position={[0, AGV.wheelR, z]} rotation={[Math.PI / 2, 0, 0]}>
    <group rotation={[0, a, 0]}>
      <Cyl a={AGV.wheelR} b={AGV.wheelR} h={0.1}>
        <Rubber />
      </Cyl>
      <Cyl a={0.095} b={0.095} h={0.104}>
        <Graphite />
      </Cyl>
      {/* спицы — видно, что колесо крутится */}
      {[0, 1, 2].map((k) => (
        <Box key={k} s={[0.16, 0.106, 0.03]} r={[0, (k * Math.PI) / 3, 0]}>
          <Metal />
        </Box>
      ))}
      <Cyl a={0.03} b={0.03} h={0.11} p={[0, z > 0 ? 0.002 : -0.002, 0]}>
        <Glow k={1.6} />
      </Cyl>
    </group>
  </group>
);

export const AgvModel: React.FC<{plan: AgvPlan; t?: number}> = ({plan, t: tProp}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = tProp ?? frame / fps;
  const st = pathAt(plan.stays, t, plan.speed ?? 1.4, 0.7, true);
  const lift = clamp01(track(t, plan.lift ?? [[0, 0]])) * AGV.liftMax;
  const c = cargoAt(plan, t);
  const [bx, bh, bz] = AGV.box;
  const top = AGV.plateY + lift;
  // колёса: путь + разворот (на месте — в разные стороны)
  const wl = (st.dist - st.yaw * AGV.track) / AGV.wheelR;
  const wr = (st.dist + st.yaw * AGV.track) / AGV.wheelR;
  // лёгкий кивок корпуса на разгоне и торможении
  const pitch = Math.max(-0.02, Math.min(0.02, -st.speed * 0.004));
  const led = 1.6 + (st.moving ? Math.sin(t * 9) * 0.9 : 0.4);
  const stack = Array.from({length: c.n}, (_, i) => i);
  // коробка, съехавшая на пол: где AGV стоял в момент выгрузки
  const dropAt = (at: number): {p: V3; yaw: number} => {
    const s = pathAt(plan.stays, at + UNLOAD, plan.speed ?? 1.4, 0.7, true);
    const back = -AGV.L / 2 - bx / 2 - 0.05;
    return {p: [s.x + Math.cos(s.yaw) * back, bh / 2, s.z - Math.sin(s.yaw) * back], yaw: s.yaw + 0.12};
  };
  return (
    <>
      <group position={[st.x, 0, st.z]} rotation={[0, st.yaw, 0]}>
        <Shadow w={2.7} d={2.0} />
        <group rotation={[0, 0, pitch]}>
          {/* бампер и корпус */}
          <RBox s={[2.04, 0.18, 1.4]} r={0.07} p={[0, 0.11, 0]}>
            <Rubber />
          </RBox>
          <RBox s={[1.96, 0.3, 1.34]} r={0.07} p={[0, 0.35, 0]}>
            <Parchment />
          </RBox>
          <RBox s={[1.985, 0.09, 1.365]} r={0.035} p={[0, 0.29, 0]}>
            <meshPhysicalMaterial color="#FFF65D" metalness={0.1} roughness={0.35} clearcoat={0.9} clearcoatRoughness={0.08} />
          </RBox>
          {/* верх корпуса под площадкой — матовый тёмный (глянцевый ловил лимонный свет и казался оливковым) */}
          <RBox s={[1.9, 0.05, 1.28]} r={0.02} p={[0, 0.515, 0]}>
            <meshStandardMaterial color="#2A2E33" roughness={0.85} />
          </RBox>
          {/* перед: окно лидара, датчики, диоды */}
          <Box s={[0.03, 0.12, 0.62]} p={[0.985, 0.4, 0]}>
            <Visor />
          </Box>
          {[-0.45, 0.45].map((z) => (
            <Cyl key={z} a={0.045} b={0.045} h={0.03} p={[0.985, 0.4, z]} r={[0, 0, Math.PI / 2]}>
              <Visor />
            </Cyl>
          ))}
          <Box s={[0.02, 0.025, 0.46]} p={[0.99, 0.47, 0]}>
            <Glow k={led} />
          </Box>
          {/* бока: ниша колеса, полоса-диод */}
          {[-1, 1].map((s) => (
            <React.Fragment key={s}>
              <Box s={[0.46, 0.26, 0.02]} p={[0, 0.17, s * 0.676]}>
                <Seam />
              </Box>
              <Box s={[0.5, 0.018, 0.012]} p={[0.62, 0.43, s * 0.676]}>
                <Glow k={led * 0.8} />
              </Box>
            </React.Fragment>
          ))}
          <Wheel z={0.71} a={-wl} />
          <Wheel z={-0.71} a={-wr} />
          {/* кнопка-стоп сзади: лимонная */}
          <Cyl a={0.05} b={0.055} h={0.04} p={[-0.82, 0.555, 0.52]}>
            <meshStandardMaterial color="#FFF65D" roughness={0.4} />
          </Cyl>
          {/* подъёмник и площадка */}
          {lift > 0.01 ? (
            <Cyl a={0.12} b={0.12} h={lift + 0.04} p={[0, 0.52 + (lift + 0.04) / 2, 0]}>
              <Metal />
            </Cyl>
          ) : null}
          <group position={[0, lift, 0]}>
            <RBox s={[1.7, 0.04, 1.2]} r={0.015} p={[0, 0.56, 0]}>
              <Alu />
            </RBox>
            {[-0.5, 0, 0.5].flatMap((x) =>
              [-0.22, 0.22].map((z) => (
                <Cyl key={`${x}${z}`} a={0.085} b={0.085} h={0.006} p={[x, 0.581, z]}>
                  <Seam />
                </Cyl>
              )),
            )}
            {[-0.5, 0.5].map((z) => (
              <group key={z} position={[0, 0.64, z]}>
                <Box s={[1.5, 0.12, 0.12]}>
                  <Alu />
                </Box>
                <Box s={[1.505, 0.014, 0.125]}>
                  <Seam />
                </Box>
                {[-0.755, 0.755].map((x) => (
                  <Box key={x} s={[0.02, 0.124, 0.124]} p={[x, 0, 0]}>
                    <Graphite />
                  </Box>
                ))}
              </group>
            ))}
          </group>
          {/* коробки стопкой: верхняя может падать сверху (загрузка) или съезжать назад (выгрузка) */}
          {stack.map((i) => {
            let y = top + bh / 2 + i * bh;
            let x = 0;
            let rz = 0;
            if (c.falling && c.falling.i === i) {
              const p = c.falling.p;
              const fall = LOAD / (LOAD + 0.25);
              y += p < fall ? 1.6 * (1 - (p / fall) ** 2) : Math.sin(((p - fall) / (1 - fall)) * Math.PI) * 0.05;
            }
            if (c.leaving && c.leaving.i === i) {
              const p = c.leaving.p;
              x = -1.45 * Math.min(1, p / 0.55);
              const f = clamp01((p - 0.45) / 0.55);
              y = y - f * f * (y - bh / 2);
              rz = f * 0.35;
            }
            return <CargoBox key={i} s={AGV.box} p={[x, y, 0]} rot={[0, 0, rz]} />;
          })}
        </group>
      </group>
      {c.dropped.map((d, k) => {
        const {p, yaw} = dropAt(d.at);
        return (
          <group key={k}>
            <Shadow w={bx * 1.5} d={bz * 1.5} p={p} o={0.7} />
            <CargoBox s={AGV.box} p={p} rot={[0, yaw, 0]} />
          </group>
        );
      })}
    </>
  );
};
