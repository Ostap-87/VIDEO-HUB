// «Робокитай» — 3D-детали макета склада (05.11.2026). Всё лёгкое для SwiftShader: статичная геометрия склеена в один меш
// (`useBoxes` — набор коробок одним вызовом отрисовки), материалы — meshStandard, тени — мягкие пятна `Shadow`.
// - MockFloor — макет склада: доска с чертёжной сеткой (1 клетка = 1 ед. ≈ 0,5 м), графитовые торцы;
// - QrTile / QrRoute — плитки с QR-кодами на полу (узор случайный, без данных), вспыхивают лимонным, когда AGV проезжает;
// - LiteRack — стеллаж (стойки, балки, настил, коробки) из 5 склеенных мешей;
// - Gate — проём между зонами: стойки в полоску, балка, поднятые ворота, стены; порог `threshold` и щель `gap` в полу;
// - LidarSweep — веер лидара по кругу и кольца по полу; PathDashes — пунктир маршрута на полу (рисуется по `draw`);
// - curvePath — плавный путь по точкам (для AgvModel `plan.path` и AgvLite): разгон, торможение, курс по касательной;
// - AgvLite — облегчённая тележка (для сцены «8 роботов у клиента»); Glint — светящееся пятно (сигнал тревоги);
// - project / camAt — точка 3D → пиксели панели, камера по ключам.
import React, {useMemo} from "react";
import * as THREE from "three";
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {CargoBox, KRAFT, Shadow, smooth, type Cam, type PathState, type V3} from "../../components/aura3d/kit";
import {rackBoxes} from "../../components/aura3d/Conveyor";

export const INK3 = "#262626";
export const LEMON3 = "#FFF65D";

// --- камера и проекция ---
export const project = (p: V3, cam: Cam, w: number, h: number): [number, number] => {
  const c = new THREE.PerspectiveCamera(cam.fov ?? 30, w / h, 0.05, 200);
  c.position.set(...cam.pos);
  c.lookAt(...cam.target);
  c.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(c);
  return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
};
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
// камера по ключам [[время, кадр камеры]], между ключами — плавно
export const camAt = (t: number, keys: [number, Cam][]): Cam => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, c1] = keys[i];
    if (t <= t1) {
      const [t0, c0] = keys[i - 1];
      const k = smooth((t - t0) / Math.max(1e-6, t1 - t0));
      return {pos: lerp3(c0.pos, c1.pos, k), target: lerp3(c0.target, c1.target, k), fov: (c0.fov ?? 30) + ((c1.fov ?? 30) - (c0.fov ?? 30)) * k};
    }
  }
  return keys[keys.length - 1][1];
};

// --- плавный путь по точкам [x, z] ---
export type CurvePath = {at: (t: number) => PathState; pts: [number, number][]; len: number};
export const curvePath = (pts: [number, number][], t0: number, t1: number, ease: (p: number) => number = smooth): CurvePath => {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal", 0.5);
  const len = curve.getLength();
  const dense: [number, number][] = curve.getSpacedPoints(Math.max(8, Math.round(len * 6))).map((v) => [v.x, v.z]);
  const at = (t: number): PathState => {
    const q = Math.min(1, Math.max(0, (t - t0) / Math.max(1e-6, t1 - t0)));
    const u = ease(q);
    const pt = curve.getPointAt(u);
    const tg = curve.getTangentAt(u);
    const du = (ease(Math.min(1, q + 0.01)) - ease(Math.max(0, q - 0.01))) / 0.02;
    return {x: pt.x, z: pt.z, yaw: Math.atan2(-tg.z, tg.x), dist: u * len, speed: (du * len) / Math.max(1e-6, t1 - t0), moving: t > t0 && t < t1};
  };
  return {at, pts: dense, len};
};
// замкнутый контур (петля): робот с фазой phase (доля круга), скорость speed ед./с
export const loopPath = (pts: [number, number][]) => {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal", 0.5);
  const len = curve.getLength();
  return {
    len,
    at: (t: number, phase: number, speed: number): PathState => {
      const u = (((phase + (t * speed) / len) % 1) + 1) % 1;
      const pt = curve.getPointAt(u);
      const tg = curve.getTangentAt(u);
      return {x: pt.x, z: pt.z, yaw: Math.atan2(-tg.z, tg.x), dist: t * speed + phase * len, speed, moving: true};
    },
    pts: curve.getSpacedPoints(Math.round(len * 3)).map((v) => [v.x, v.z] as [number, number]),
  };
};

// --- склейка коробок в один меш ---
export type BoxSpec = {s: V3; p: V3; ry?: number; rz?: number};
export const useBoxes = (list: BoxSpec[], key: string) =>
  useMemo(() => {
    if (!list.length) return null;
    const geos = list.map((b) => {
      const g = new THREE.BoxGeometry(b.s[0], b.s[1], b.s[2]);
      if (b.rz) g.rotateZ(b.rz);
      if (b.ry) g.rotateY(b.ry);
      g.translate(b.p[0], b.p[1], b.p[2]);
      return g;
    });
    const m = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

// --- текстуры (по одной на вкладку) ---
const texCache = new Map<string, THREE.Texture>();
const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, nearest = false) => {
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) t.magFilter = THREE.NearestFilter;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
};
// сетка пола: квадрат 4 × 4 ед., тонкие линии каждую единицу, толще по краю квадрата
const gridTex = (tone: string) =>
  canvasTex(`grid-${tone}`, 512, 512, (g) => {
    g.fillStyle = tone;
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "rgba(38,38,38,0.12)";
    g.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      g.beginPath();
      g.moveTo(i * 128, 0);
      g.lineTo(i * 128, 512);
      g.moveTo(0, i * 128);
      g.lineTo(512, i * 128);
      g.stroke();
    }
    g.strokeStyle = "rgba(38,38,38,0.24)";
    g.lineWidth = 4;
    g.strokeRect(0, 0, 512, 512);
  });
const hazardTex = () =>
  canvasTex("hazard", 128, 128, (g) => {
    g.fillStyle = LEMON3;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = INK3;
    for (let k = -2; k < 4; k++) {
      g.beginPath();
      g.moveTo(k * 64, 128);
      g.lineTo(k * 64 + 32, 128);
      g.lineTo(k * 64 + 160, 0);
      g.lineTo(k * 64 + 128, 0);
      g.closePath();
      g.fill();
    }
  });
// узор «QR-кода»: 21 × 21 модуль, три метки по углам, остальное — по seed (данных нет)
const rnd = (seed: number) => {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};
const qrTex = (seed: number) =>
  canvasTex(`qr-${seed}`, 100, 100, (g) => {
    g.fillStyle = "#FBFAF7";
    g.fillRect(0, 0, 100, 100);
    const m = 4;
    const o = 8;
    const r = rnd(seed + 3);
    g.fillStyle = "#17181A";
    const finder = (x: number, y: number) => {
      g.fillRect(o + x * m, o + y * m, 7 * m, 7 * m);
      g.fillStyle = "#FBFAF7";
      g.fillRect(o + (x + 1) * m, o + (y + 1) * m, 5 * m, 5 * m);
      g.fillStyle = "#17181A";
      g.fillRect(o + (x + 2) * m, o + (y + 2) * m, 3 * m, 3 * m);
    };
    for (let y = 0; y < 21; y++)
      for (let x = 0; x < 21; x++) {
        const inF = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
        if (!inF && r() > 0.52) g.fillRect(o + x * m, o + y * m, m, m);
      }
    finder(0, 0);
    finder(14, 0);
    finder(0, 14);
  }, true);

// --- пол-макет ---
export const MockFloor: React.FC<{w: number; d: number; p?: V3; tone?: string; edge?: string}> = ({w, d, p = [0, 0, 0], tone = "#D9D3C8", edge = INK3}) => {
  const top = useMemo(() => {
    const t = gridTex(tone).clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(w / 4, d / 4);
    t.needsUpdate = true;
    return t;
  }, [w, d, tone]);
  return (
    <group position={p}>
      <mesh position={[0, -0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={top} roughness={0.92} />
      </mesh>
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[w, 0.3, d]} />
        <meshStandardMaterial color={edge} roughness={0.7} />
      </mesh>
    </group>
  );
};

// --- плитка QR ---
export const QrTile: React.FC<{p: [number, number]; seed: number; glow?: number; o?: number; size?: number}> = ({p, seed, glow = 0, o = 1, size = 0.62}) => (
  <group position={[p[0], 0.004, p[1]]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size + 0.08, size + 0.08]} />
      <meshStandardMaterial color={INK3} roughness={0.8} transparent={o < 1} opacity={o} />
    </mesh>
    <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={qrTex(seed % 5)} roughness={0.7} transparent={o < 1} opacity={o} />
    </mesh>
    {glow > 0.01 ? (
      <mesh position={[0, -0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size + 0.42 + glow * 0.18, size + 0.42 + glow * 0.18]} />
        <meshBasicMaterial color={LEMON3} transparent opacity={Math.min(1, glow)} depthWrite={false} />
      </mesh>
    ) : null}
  </group>
);

// --- стеллаж ---
export const LiteRack: React.FC<{p?: V3; yaw?: number; bays?: number; levels?: number; bayW?: number; depth?: number; levelH?: number; seed?: number}> = ({
  p = [0, 0, 0],
  yaw = 0,
  bays = 4,
  levels = 3,
  bayW = 1.5,
  depth = 0.9,
  levelH = 1.0,
  seed = 1,
}) => {
  const key = `${bays}|${levels}|${bayW}|${depth}|${levelH}|${seed}`;
  const H = levels * levelH + 0.2;
  const W = bays * bayW;
  const posts: BoxSpec[] = [];
  for (let b = 0; b <= bays; b++) for (const s of [-1, 1]) posts.push({s: [0.08, H, 0.07], p: [-W / 2 + b * bayW, H / 2, (s * depth) / 2]});
  const beams: BoxSpec[] = [];
  const decks: BoxSpec[] = [];
  for (let l = 0; l <= levels; l++) {
    const y = 0.12 + l * levelH;
    for (const s of [-1, 1]) beams.push({s: [W, 0.1, 0.05], p: [0, y, s * (depth / 2 + 0.01)]});
    decks.push({s: [W, 0.02, depth], p: [0, y + 0.05, 0]});
  }
  const bx = rackBoxes({bays, levels, bayW, depth, levelH, seed});
  const cargo: BoxSpec[] = bx.map((b) => ({s: b.s, p: b.c, ry: b.yaw}));
  const tape: BoxSpec[] = bx.map((b) => ({s: [b.s[0] * 1.004, 0.008, b.s[2] * 0.22], p: [b.c[0], b.c[1] + b.s[1] / 2 + 0.003, b.c[2]], ry: b.yaw}));
  const gPosts = useBoxes(posts, `posts${key}`);
  const gBeams = useBoxes(beams, `beams${key}`);
  const gDecks = useBoxes(decks, `decks${key}`);
  const gCargo = useBoxes(cargo, `cargo${key}`);
  const gTape = useBoxes(tape, `tape${key}`);
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      <Shadow w={W + 0.8} d={depth + 1.0} o={0.5} />
      {gPosts ? (
        <mesh geometry={gPosts}>
          <meshStandardMaterial color={INK3} roughness={0.45} metalness={0.2} />
        </mesh>
      ) : null}
      {gBeams ? (
        <mesh geometry={gBeams}>
          <meshStandardMaterial color="#F3F0EA" roughness={0.4} />
        </mesh>
      ) : null}
      {gDecks ? (
        <mesh geometry={gDecks}>
          <meshStandardMaterial color="#6A6F75" roughness={0.6} metalness={0.3} />
        </mesh>
      ) : null}
      {gCargo ? (
        <mesh geometry={gCargo}>
          <meshStandardMaterial color={KRAFT} roughness={0.85} />
        </mesh>
      ) : null}
      {gTape ? (
        <mesh geometry={gTape}>
          <meshStandardMaterial color={INK3} roughness={0.6} />
        </mesh>
      ) : null}
      {/* лимонные метки ячеек на передней балке */}
      {Array.from({length: bays}, (_, b) => (
        <mesh key={b} position={[-W / 2 + b * bayW + bayW / 2, 0.12 + levelH, depth / 2 + 0.04]}>
          <boxGeometry args={[0.16, 0.06, 0.006]} />
          <meshStandardMaterial color={LEMON3} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};

// --- проём с воротами, порог и щель в полу ---
// проём вдоль оси z на x = px: ширина open, стены по бокам до wall (ед.) в каждую сторону
// walls: "both" — стены с двух сторон; "far" — только дальняя (z < 0), ближняя срезана, как на макете в разрезе (камера сбоку)
export const Gate: React.FC<{px?: number; open?: number; h?: number; wall?: number; threshold?: {w: number; h: number} | null; gap?: {dx: number; w: number} | null; glowT?: number; glowG?: number; hit?: number; doorUp?: number; walls?: "both" | "far"}> = ({
  px = 0,
  open = 3.8,
  h = 4.2,
  wall = 3.2,
  threshold,
  gap,
  glowT = 0,
  glowG = 0,
  hit = 0,
  doorUp = 1,
  walls = "both",
}) => {
  const hz = hazardTex();
  const half = open / 2;
  return (
    <group position={[px, 0, 0]}>
      {/* стены */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {walls === "far" && s > 0 ? null : (
          <>
          <mesh position={[0, h / 2 + 0.3, s * (half + 0.18 + wall / 2)]}>
            <boxGeometry args={[0.28, h + 0.6, wall]} />
            <meshStandardMaterial color="#DCD8D0" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.25, s * (half + 0.18 + wall / 2)]}>
            <boxGeometry args={[0.3, 0.5, wall]} />
            <meshStandardMaterial color="#9EA3A8" roughness={0.8} />
          </mesh>
          </>
          )}
          {/* стойка в лимонно-графитовую полоску */}
          <mesh position={[0, h / 2, s * (half + 0.09)]}>
            <boxGeometry args={[0.34, h, 0.18]} />
            <meshStandardMaterial map={hz} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* балка и поднятые ворота */}
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[0.34, 0.3, open + 0.36]} />
        <meshStandardMaterial color={INK3} roughness={0.5} />
      </mesh>
      <mesh position={[-0.05, h - 0.35 + (1 - doorUp) * -(h - 0.6) * 0.5, 0]} scale={[1, doorUp * 0.15 + (1 - doorUp) * 1, 1]}>
        <boxGeometry args={[0.1, 0.8, open]} />
        <meshStandardMaterial color="#B9BEC3" roughness={0.5} metalness={0.4} />
      </mesh>
      {threshold ? (
        <group>
          <mesh position={[0, threshold.h / 2, 0]}>
            <boxGeometry args={[threshold.w, threshold.h, open + 0.3]} />
            <meshStandardMaterial color="#8E959C" roughness={0.35} metalness={0.75} />
          </mesh>
          {hit > 0.01 ? (
            <mesh position={[0, threshold.h / 2, 0]}>
              <boxGeometry args={[threshold.w + 0.1, threshold.h + 0.08, open + 0.38]} />
              <meshBasicMaterial color="#E5383B" transparent opacity={0.75 * hit} depthWrite={false} />
            </mesh>
          ) : null}
          {glowT > 0.01 ? (
            <mesh position={[0, threshold.h / 2, 0]}>
              <boxGeometry args={[threshold.w + 0.08, threshold.h + 0.06, open + 0.36]} />
              <meshBasicMaterial color={LEMON3} transparent opacity={0.7 * glowT} depthWrite={false} />
            </mesh>
          ) : null}
        </group>
      ) : null}
      {gap ? (
        <group position={[gap.dx, 0, 0]}>
          <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[gap.w, open + 2]} />
            <meshBasicMaterial color="#141517" />
          </mesh>
          {glowG > 0.01 ? (
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[gap.w + 0.12, open + 2.1]} />
              <meshBasicMaterial color={LEMON3} transparent opacity={0.85 * glowG} depthWrite={false} />
            </mesh>
          ) : null}
        </group>
      ) : null}
    </group>
  );
};

// --- лидар: вращающийся веер и кольца по полу (в координатах родителя, на высоте y) ---
export const LidarSweep: React.FC<{t: number; range?: number; hz?: number; y?: number; o?: number; rings?: boolean; fan?: number}> = ({t, range = 4.5, hz = 0.85, y = 0.45, o = 1, rings = true, fan = 0.6}) => {
  if (o <= 0.01) return null;
  const a = 2 * Math.PI * hz * t;
  return (
    <group position={[0, y, 0]}>
      <group rotation={[0, a, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[range, 28, -fan, fan]} />
          <meshBasicMaterial color={LEMON3} transparent opacity={0.42 * o} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[range / 2, 0.002, 0]}>
          <boxGeometry args={[range, 0.03, 0.035]} />
          <meshBasicMaterial color={INK3} transparent opacity={0.85 * o} depthWrite={false} />
        </mesh>
      </group>
      {rings
        ? [0, 0.5].map((ph) => {
            const k = (t * 0.9 + ph) % 1;
            return (
              <group key={ph}>
                <mesh position={[0, -y + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[range * k, range * k + 0.09, 48]} />
                  <meshBasicMaterial color={LEMON3} transparent opacity={(1 - k) * 0.95 * o} depthWrite={false} />
                </mesh>
                <mesh position={[0, -y + 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[range * k + 0.09, range * k + 0.115, 48]} />
                  <meshBasicMaterial color={INK3} transparent opacity={(1 - k) * 0.5 * o} depthWrite={false} />
                </mesh>
              </group>
            );
          })
        : null}
    </group>
  );
};

// --- пунктир маршрута на полу: штрихи вдоль ломаной, видна доля draw (0…1) ---
export const PathDashes: React.FC<{pts: [number, number][]; draw?: number; color?: string; o?: number; dash?: number; gap?: number; w?: number; id: string}> = ({pts, draw = 1, color = LEMON3, o = 1, dash = 0.26, gap = 0.18, w = 0.09, id}) => {
  const geo = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      const L = Math.hypot(x1 - x0, z1 - z0);
      let s = acc > 0 ? dash + gap - acc : 0;
      while (s < L) {
        const e = Math.min(L, s + dash);
        const k0 = s / L;
        const k1 = e / L;
        const cx = x0 + (x1 - x0) * ((k0 + k1) / 2);
        const cz = z0 + (z1 - z0) * ((k0 + k1) / 2);
        const g = new THREE.PlaneGeometry(e - s, w);
        g.rotateX(-Math.PI / 2);
        g.rotateY(Math.atan2(-(z1 - z0), x1 - x0));
        g.translate(cx, 0, cz);
        out.push(g);
        s += dash + gap;
      }
      acc = (acc + L) % (dash + gap);
    }
    const m = mergeGeometries(out, false);
    out.forEach((g) => g.dispose());
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!geo || o <= 0.01 || draw <= 0.001) return null;
  const n = geo.index ? geo.index.count : 0;
  geo.setDrawRange(0, Math.floor((n / 6) * Math.min(1, draw)) * 6);
  return (
    <mesh geometry={geo} position={[0, 0.014, 0]}>
      <meshBasicMaterial color={color} transparent opacity={o} depthWrite={false} />
    </mesh>
  );
};

// --- облегчённая тележка (дальний план): корпус, пояс, площадка, колёса, диод; skin aura | orange ---
export const AgvLite: React.FC<{st: PathState; skin?: "aura" | "orange"; box?: boolean; t: number}> = ({st, skin = "aura", box, t}) => {
  const body = skin === "orange" ? "#F26B1D" : "#F8F6F3";
  const band = skin === "orange" ? "#17181A" : LEMON3;
  const led = skin === "orange" ? "#FFE3B8" : LEMON3;
  const blink = 0.6 + 0.4 * Math.sin(t * 9 + st.dist);
  return (
    <group position={[st.x, 0, st.z]} rotation={[0, st.yaw, 0]}>
      <Shadow w={2.6} d={1.9} o={0.8} />
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[2.04, 0.2, 1.4]} />
        <meshStandardMaterial color="#17191C" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[1.96, 0.3, 1.34]} />
        <meshStandardMaterial color={body} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.99, 0.08, 1.37]} />
        <meshStandardMaterial color={band} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.54, 0]}>
        <boxGeometry args={[1.7, 0.05, 1.2]} />
        <meshStandardMaterial color="#C9CFD4" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0.99, 0.42, 0]}>
        <boxGeometry args={[0.03, 0.12, 0.6]} />
        <meshStandardMaterial color="#05070A" roughness={0.1} />
      </mesh>
      <mesh position={[1.0, 0.48, 0]}>
        <boxGeometry args={[0.02, 0.025, 0.44]} />
        <meshStandardMaterial color={led} emissive={led} emissiveIntensity={2.2 * blink} />
      </mesh>
      {box ? <CargoBox s={[0.8, 0.42, 0.7]} p={[0, 0.78, 0]} /> : null}
    </group>
  );
};

// светящееся пятно (сигнал, вспышка): сфера-ядро + ореол
export const Glint: React.FC<{p: V3; color?: string; k?: number; r?: number}> = ({p, color = "#E5383B", k = 1, r = 0.06}) =>
  k <= 0.01 ? null : (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[r, 14, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3 * k} />
      </mesh>
      <mesh>
        <sphereGeometry args={[r * 2.2, 14, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.3 * k} depthWrite={false} />
      </mesh>
    </group>
  );

// подсветка предмета: лимонная «оболочка» поверх коробки (detected)
export const BoxGlow: React.FC<{p: V3; s: V3; k: number; color?: string}> = ({p, s, k, color = LEMON3}) =>
  k <= 0.01 ? null : (
    <mesh position={p}>
      <boxGeometry args={[s[0] + 0.1, s[1] + 0.1, s[2] + 0.1]} />
      <meshBasicMaterial color={color} transparent opacity={0.5 * k} depthWrite={false} />
    </mesh>
  );
