// Детали сцен применения Aura (решение пользователя 05.11.2026: «показывать как робот подходит к конвейеру и несёт коробку»).
// - Conveyor — ленточный конвейер: лента с бегущими планками, приводной и натяжной ролики (крутятся по скорости ленты), опорные
//   ролики снизу, боковые борта с лимонной полосой, ноги с растяжками, мотор-редуктор, кнопка-стоп, упор в конце с фотодатчиком
//   (диод вспыхивает, когда коробка доехала). Коробки `boxes` — {enter, pickAt?, s?}: появляются в начале ленты в enter,
//   едут со скоростью speed и встают в очередь у упора; в pickAt коробку забирают (дальше её рисует робот: манипулятор
//   `items[].show`, гуманоид на колёсах `carry[].show`). Где коробка — `conveyorBoxAt(props, i, t)` (мировые координаты).
//   Лента идёт по +x локально, p — середина конвейера на полу, yaw — разворот, h — высота ленты, len — длина, w — ширина.
// - Pallet — пластиковый поддон (графит, лимонные метки на углах); `palletSlot(p, i, s)` — где стоит i-я коробка 2×2 и в два яруса.
// - Rack — стеллаж склада: графитовые стойки с перфорацией, пергаментные балки, коробки по ячейкам (детерминированно по seed);
//   `rackBoxes(props)` — центры коробок (для сканирования дроном и облака точек DarkScan).
import React from "react";
import * as THREE from "three";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {Accent, Alu, Bolt, Box, CargoBox, Cyl, Glow, Graphite, Led, Metal, Parchment, RBox, Ring, Rubber, Seam, Shadow, Tag, Vents, type V3} from "./kit";

export type ConveyorBox = {enter: number; pickAt?: number; s?: V3};
export type ConveyorProps = {p?: V3; yaw?: number; len?: number; w?: number; h?: number; speed?: number; boxes?: ConveyorBox[]; t?: number};
const DEF_BOX: V3 = [0.5, 0.36, 0.44];
const GAP = 0.06;
const STOP = 0.12; // упор от конца ленты

// положение коробки i вдоль ленты (локально, x) в момент t: едет, встаёт в очередь за коробками впереди
const localX = (P: ConveyorProps, i: number, t: number): number => {
  const len = P.len ?? 4;
  const speed = P.speed ?? 0.7;
  const boxes = P.boxes ?? [];
  const b = boxes[i];
  const s = b.s ?? DEF_BOX;
  let x = -len / 2 + s[0] / 2 + 0.04;
  const dt = 1 / 30;
  for (let u = b.enter; u < t; u += dt) {
    // предел: упор минус коробки впереди (вошли раньше и ещё не забраны к моменту u)
    let limit = len / 2 - STOP - s[0] / 2;
    for (let j = 0; j < boxes.length; j++) {
      if (j === i) continue;
      const o = boxes[j];
      if (o.enter < b.enter && u >= o.enter && (o.pickAt === undefined || u < o.pickAt)) limit -= (o.s ?? DEF_BOX)[0] + GAP;
    }
    x = Math.min(limit, x + speed * Math.min(dt, t - u));
  }
  return x;
};
const conveyorMatrix = (P: ConveyorProps) => new THREE.Matrix4().makeTranslation(...(P.p ?? [0, 0, 0])).multiply(new THREE.Matrix4().makeRotationY(P.yaw ?? 0));
// центр коробки i в мире в момент t
export const conveyorBoxAt = (P: ConveyorProps, i: number, t: number): V3 => {
  const s = P.boxes?.[i]?.s ?? DEF_BOX;
  const v = new THREE.Vector3(localX(P, i, t), (P.h ?? 1.0) + s[1] / 2, 0).applyMatrix4(conveyorMatrix(P));
  return [v.x, v.y, v.z];
};
// где коробка встанет у упора (первая в очереди) — в мире
export const conveyorStopAt = (P: ConveyorProps, s: V3 = DEF_BOX): V3 => {
  const len = P.len ?? 4;
  const v = new THREE.Vector3(len / 2 - STOP - s[0] / 2, (P.h ?? 1.0) + s[1] / 2, 0).applyMatrix4(conveyorMatrix(P));
  return [v.x, v.y, v.z];
};

export const Conveyor: React.FC<ConveyorProps> = (P) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = P.t ?? frame / fps;
  const len = P.len ?? 4;
  const w = P.w ?? 0.8;
  const h = P.h ?? 1.0;
  const speed = P.speed ?? 0.7;
  const roll = 0.07;
  const travel = t * speed;
  const slat = 0.16;
  const off = travel % slat;
  const nLegs = Math.max(2, Math.round(len / 1.3) + 1);
  const boxes = P.boxes ?? [];
  // фотодатчик: горит ярче, когда у упора стоит коробка
  const atStop = boxes.some((b, i) => t >= b.enter && (b.pickAt === undefined || t < b.pickAt) && Math.abs(localX(P, i, t) - (len / 2 - STOP - (b.s ?? DEF_BOX)[0] / 2)) < 0.01);
  return (
    <group position={P.p ?? [0, 0, 0]} rotation={[0, P.yaw ?? 0, 0]}>
      <Shadow w={len + 0.6} d={w + 0.8} o={0.55} />
      {/* лента и планки */}
      <Box s={[len, 0.05, w]} p={[0, h - 0.025, 0]}>
        <meshStandardMaterial color="#1E2124" roughness={0.85} />
      </Box>
      {Array.from({length: Math.floor(len / slat)}, (_, k) => {
        const x = -len / 2 + ((k * slat + off) % len);
        return (
          <Box key={k} s={[0.014, 0.006, w * 0.96]} p={[x, h + 0.002, 0]}>
            <meshStandardMaterial color="#3A3E43" roughness={0.7} />
          </Box>
        );
      })}
      {/* приводной и натяжной ролики */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (len / 2), h - roll, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <group rotation={[0, -travel / roll, 0]}>
            <Cyl a={roll} b={roll} h={w}>
              <Metal />
            </Cyl>
            <Box s={[roll * 2.02, w * 1.01, 0.02]}>
              <Seam />
            </Box>
          </group>
          {[-1, 1].map((e) => (
            <Ring key={e} r={roll * 0.6} tube={0.008} p={[0, e * (w / 2 + 0.065), 0]} rot={[Math.PI / 2, 0, 0]}>
              <Glow k={1.4} />
            </Ring>
          ))}
        </group>
      ))}
      {/* опорные ролики снизу (видны между ногами) */}
      {Array.from({length: Math.max(2, Math.floor(len / 0.8))}, (_, k) => (
        <group key={k} position={[-len / 2 + 0.4 + k * 0.8, h - 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <Cyl a={0.03} b={0.03} h={w * 0.92}>
            <Alu />
          </Cyl>
        </group>
      ))}
      {/* борта */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <RBox s={[len + 0.1, 0.18, 0.05]} r={0.015} p={[0, h - 0.04, s * (w / 2 + 0.04)]}>
            <Parchment />
          </RBox>
          <Box s={[len * 0.96, 0.028, 0.006]} p={[0, h - 0.02, s * (w / 2 + 0.066)]}>
            <Accent />
          </Box>
          {Array.from({length: Math.floor(len / 0.5)}, (_, k) => (
            <Bolt key={k} p={[-len / 2 + 0.25 + k * 0.5, h - 0.09, s * (w / 2 + 0.066)]} rot={[s * Math.PI / 2, 0, 0]} r={0.011} />
          ))}
        </group>
      ))}
      {/* ноги с растяжками */}
      {Array.from({length: nLegs}, (_, k) => {
        const x = -len / 2 + 0.15 + (k * (len - 0.3)) / (nLegs - 1);
        return (
          <group key={k} position={[x, 0, 0]}>
            {[-1, 1].map((s) => (
              <group key={s}>
                <Box s={[0.07, h - 0.13, 0.07]} p={[0, (h - 0.13) / 2, s * (w / 2 + 0.02)]}>
                  <Graphite />
                </Box>
                <Cyl a={0.06} b={0.07} h={0.03} p={[0, 0.015, s * (w / 2 + 0.02)]}>
                  <Rubber />
                </Cyl>
              </group>
            ))}
            <Box s={[0.05, 0.05, w + 0.04]} p={[0, 0.32, 0]}>
              <Graphite />
            </Box>
          </group>
        );
      })}
      {/* мотор-редуктор у начала, кабель в пол */}
      <group position={[-len / 2 + 0.05, h - roll, -(w / 2 + 0.17)]}>
        <RBox s={[0.22, 0.2, 0.18]} r={0.03}>
          <Graphite />
        </RBox>
        <Cyl a={0.08} b={0.08} h={0.12} p={[0, 0, -0.14]} r={[Math.PI / 2, 0, 0]}>
          <Graphite />
        </Cyl>
        <Vents p={[0.111, 0, 0]} rot={[0, Math.PI / 2, 0]} n={3} w={0.12} gap={0.03} />
        <Led p={[0, 0.06, 0.092]} r={0.012} c="#7CFF8A" />
      </group>
      {/* кнопка-стоп на стойке */}
      <group position={[-len / 2 + 0.6, 0, w / 2 + 0.2]}>
        <Box s={[0.05, h + 0.1, 0.05]} p={[0, (h + 0.1) / 2, 0]}>
          <Graphite />
        </Box>
        <RBox s={[0.16, 0.16, 0.1]} r={0.02} p={[0, h + 0.18, 0]}>
          <Accent />
        </RBox>
        <Cyl a={0.04} b={0.045} h={0.04} p={[0, h + 0.18, 0.06]} r={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#E5383B" roughness={0.4} />
        </Cyl>
      </group>
      {/* упор в конце и фотодатчик */}
      <RBox s={[0.06, 0.18, w + 0.12]} r={0.02} p={[len / 2 - STOP + 0.03, h + 0.09, 0]}>
        <Graphite />
      </RBox>
      <Box s={[0.064, 0.03, w + 0.124]} p={[len / 2 - STOP + 0.03, h + 0.165, 0]}>
        <Accent />
      </Box>
      <group position={[len / 2 - 0.45, h + 0.08, w / 2 + 0.1]}>
        <Box s={[0.04, 0.16, 0.04]}>
          <Graphite />
        </Box>
        <Led p={[0, 0.03, -0.025]} r={0.012} k={atStop ? 4 : 0.6} c={atStop ? "#7CFF8A" : "#E5383B"} />
      </group>
      <Tag p={[0, h - 0.07, w / 2 + 0.067]} w={0.22} h={0.08} />
      {/* коробки на ленте */}
      {boxes.map((b, i) => {
        if (t < b.enter || (b.pickAt !== undefined && t >= b.pickAt)) return null;
        const s = b.s ?? DEF_BOX;
        return <CargoBox key={i} s={s} p={[localX(P, i, t), h + s[1] / 2, 0]} />;
      })}
    </group>
  );
};

// --- поддон ---
export const PALLET = {w: 1.2, d: 1.0, h: 0.15};
export const Pallet: React.FC<{p?: V3; yaw?: number}> = ({p = [0, 0, 0], yaw = 0}) => {
  const {w, d, h} = PALLET;
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      <Shadow w={w * 1.5} d={d * 1.5} o={0.6} />
      <RBox s={[w, 0.04, d]} r={0.012} p={[0, h - 0.02, 0]}>
        <Graphite />
      </RBox>
      {Array.from({length: 5}, (_, k) => (
        <Box key={k} s={[w * 0.98, 0.006, 0.02]} p={[0, h + 0.001, -d / 2 + 0.1 + k * ((d - 0.2) / 4)]}>
          <Seam />
        </Box>
      ))}
      {[-1, 0, 1].flatMap((a) =>
        [-1, 0, 1].map((b) => (
          <RBox key={`${a}${b}`} s={[0.16, h - 0.04, 0.16]} r={0.02} p={[a * (w / 2 - 0.1), (h - 0.04) / 2, b * (d / 2 - 0.1)]}>
            <Graphite />
          </RBox>
        )),
      )}
      {[-1, 1].flatMap((a) =>
        [-1, 1].map((b) => (
          <Box key={`${a}${b}`} s={[0.1, 0.008, 0.1]} p={[a * (w / 2 - 0.06), h + 0.002, b * (d / 2 - 0.06)]}>
            <Accent />
          </Box>
        )),
      )}
    </group>
  );
};
// i-я коробка на поддоне (2 × 2, затем второй ярус): центр в мире
export const palletSlot = (p: V3, i: number, s: V3 = DEF_BOX, yaw = 0): V3 => {
  const col = i % 2;
  const row = Math.floor(i / 2) % 2;
  const tier = Math.floor(i / 4);
  const lx = (col - 0.5) * (s[0] + 0.03);
  const lz = (row - 0.5) * (s[2] + 0.03);
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  return [p[0] + lx * c + lz * sn, PALLET.h + s[1] / 2 + tier * s[1], p[2] - lx * sn + lz * c];
};

// --- стеллаж склада ---
export type RackProps = {p?: V3; yaw?: number; bays?: number; levels?: number; bayW?: number; depth?: number; levelH?: number; seed?: number; dark?: boolean};
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// коробки стеллажа: центр (мир), размер, поворот
export const rackBoxes = (R: RackProps): {c: V3; s: V3; yaw: number}[] => {
  const bays = R.bays ?? 4;
  const levels = R.levels ?? 3;
  const bw = R.bayW ?? 1.5;
  const dp = R.depth ?? 0.9;
  const lh = R.levelH ?? 1.0;
  const seed = R.seed ?? 1;
  const M = new THREE.Matrix4().makeTranslation(...(R.p ?? [0, 0, 0])).multiply(new THREE.Matrix4().makeRotationY(R.yaw ?? 0));
  const out: {c: V3; s: V3; yaw: number}[] = [];
  for (let b = 0; b < bays; b++)
    for (let l = 0; l < levels; l++) {
      const n = 1 + Math.floor(hash(seed * 31 + b * 7 + l * 13) * 3);
      let x = -bays * bw * 0.5 + b * bw + 0.12;
      for (let k = 0; k < n; k++) {
        const r = hash(seed * 17 + b * 5 + l * 11 + k * 3);
        const s: V3 = [0.36 + r * 0.16, 0.3 + hash(r * 91) * 0.22, Math.min(dp - 0.1, 0.5 + r * 0.25)];
        if (x + s[0] > -bays * bw * 0.5 + (b + 1) * bw - 0.1) break;
        const v = new THREE.Vector3(x + s[0] / 2, 0.12 + l * lh + 0.06 + s[1] / 2, 0).applyMatrix4(M);
        out.push({c: [v.x, v.y, v.z], s, yaw: (R.yaw ?? 0) + (hash(r * 7) - 0.5) * 0.08});
        x += s[0] + 0.05 + hash(r * 3) * 0.12;
      }
    }
  return out;
};
export const Rack: React.FC<RackProps & {boxes?: boolean}> = (R) => {
  const bays = R.bays ?? 4;
  const levels = R.levels ?? 3;
  const bw = R.bayW ?? 1.5;
  const dp = R.depth ?? 0.9;
  const lh = R.levelH ?? 1.0;
  const H = levels * lh + 0.2;
  const W = bays * bw;
  const bx = R.boxes === false ? [] : rackBoxes({...R, p: [0, 0, 0], yaw: 0});
  return (
    <group position={R.p ?? [0, 0, 0]} rotation={[0, R.yaw ?? 0, 0]}>
      {Array.from({length: bays + 1}, (_, b) => (
        <group key={b} position={[-W / 2 + b * bw, 0, 0]}>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Box s={[0.07, H, 0.06]} p={[0, H / 2, s * (dp / 2)]}>
                <Graphite />
              </Box>
              {Array.from({length: Math.floor(H / 0.25)}, (_, k) => (
                <Box key={k} s={[0.02, 0.05, 0.062]} p={[0.0, 0.15 + k * 0.25, s * (dp / 2)]}>
                  <Seam />
                </Box>
              ))}
              <Box s={[0.14, 0.02, 0.12]} p={[0, 0.01, s * (dp / 2)]}>
                <Metal />
              </Box>
            </group>
          ))}
          {/* диагональные связи */}
          <Box s={[0.03, Math.hypot(dp, lh), 0.03]} p={[0, lh / 2 + 0.1, 0]} r={[Math.atan2(dp, lh), 0, 0]}>
            <Graphite />
          </Box>
        </group>
      ))}
      {Array.from({length: levels + 1}, (_, l) => (
        <group key={l} position={[0, 0.12 + l * lh, 0]}>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Box s={[W, 0.1, 0.05]} p={[0, 0, s * (dp / 2 + 0.01)]}>
                <Parchment />
              </Box>
              {s > 0
                ? Array.from({length: bays}, (_, b) => (
                    <Box key={b} s={[0.14, 0.05, 0.004]} p={[-W / 2 + b * bw + bw / 2, 0, dp / 2 + 0.037]}>
                      <Accent />
                    </Box>
                  ))
                : null}
            </group>
          ))}
          {/* настил полки */}
          <Box s={[W, 0.02, dp]} p={[0, 0.05, 0]}>
            <meshStandardMaterial color="#5B6066" metalness={0.5} roughness={0.55} />
          </Box>
        </group>
      ))}
      {bx.map((b, k) => (
        <CargoBox key={k} s={b.s} p={b.c} rot={[0, b.yaw, 0]} />
      ))}
    </group>
  );
};
