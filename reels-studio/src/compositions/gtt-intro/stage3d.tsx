// 3D-сцена заставки GTT (@remotion/three): светлая «студия» и большая стеклянная пирамида из логотипа сайта.
// - Единицы мира = пиксели кадра: камера (угол 30°) стоит так, что плоскость z = 0 совпадает с кадром 1080×1920
//   один в один, поэтому 3D-объекты и HTML-слои (надпись) совмещаются без подгонки.
// - Фон студии (свет, точки, виньетка) нарисован на плоскости ЗА пирамидой: стекло по-настоящему преломляет его
//   (MeshPhysicalMaterial: transmission, ior, dispersion — радужная кромка), отражает студийное окружение RoomEnvironment.
// - Пирамида та же, что в логотипе (SiteLogo.tsx): квадратное основание, высота/радиус = 1.3/1.05, светлые рёбра.
// Анимация — только через пропсы, которые считаются из useCurrentFrame() (без useFrame).
import React, {useLayoutEffect, useMemo} from "react";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";

export const FW = 1080;
export const FH = 1920;
export const FOV = 30;
export const CAM_Z = FH / 2 / Math.tan(((FOV / 2) * Math.PI) / 180); // ≈ 3583
export const BG_Z = -700; // глубина задника студии

type V3 = [number, number, number];

// точка кадра (px) на глубине z → координаты мира
export const atDepth = (x: number, y: number, z = 0): V3 => {
  const k = (CAM_Z - z) / CAM_Z;
  return [(x - FW / 2) * k, (FH / 2 - y) * k, z];
};

// --- окружение и тон ---
// Светлая фотостудия для отражений: купол (сверху белый, у горизонта светло-голубой, снизу голубой «пол»)
// и несколько софтбоксов — они дают на гранях стекла чистые блики, а не серые отражения комнаты.
const makeStudio = () => {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 64, 32);
  const pos = geo.attributes.position;
  const top = new THREE.Color("#FFFFFF");
  const hor = new THREE.Color("#E3F1FF");
  const floor = new THREE.Color("#8CC8F0");
  const col: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50;
    const c = y >= 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(floor, Math.pow(-y, 0.7));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.BackSide})));
  const box = (w: number, h: number, p: V3, k: number, color = "#FFFFFF") => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide}),
    );
    m.position.set(...p);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  box(34, 14, [-22, 30, 26], 5.5); // ключевой сверху-слева-спереди
  box(7, 44, [42, 4, -8], 3.2); // полоса справа
  box(7, 44, [-40, 2, -22], 2.4, "#DDF2FF"); // полоса слева сзади
  box(46, 5, [0, -8, 44], 1.6); // низкий спереди
  return scene;
};

const Env: React.FC<{exposure: number}> = ({exposure}) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(makeStudio(), 0.02).texture;
    scene.environment = tex;
    scene.background = null;
    pm.dispose();
    return () => tex.dispose();
  }, [gl, scene]);
  useLayoutEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
};

// --- задник студии: светлый градиент, мягкий свет за пирамидой, едва заметные точки, виньетка ---
const BG_W = 1460;
const BG_H = 2600;
const makeBackdrop = (lightY: number) => {
  const c = document.createElement("canvas");
  c.width = BG_W;
  c.height = BG_H;
  const g = c.getContext("2d")!;
  const k = CAM_Z / (CAM_Z - BG_Z); // масштаб задника на экране
  const cx = BG_W / 2;
  const cy = BG_H / 2 - (FH / 2 - lightY) / k;
  const lin = g.createLinearGradient(0, 0, 0, BG_H);
  lin.addColorStop(0, "#F2F3F7");
  lin.addColorStop(0.5, "#EEEEF2");
  lin.addColorStop(1, "#E5E6EC");
  g.fillStyle = lin;
  g.fillRect(0, 0, BG_W, BG_H);
  // мягкий «софтбокс» за пирамидой
  const key = g.createRadialGradient(cx, cy, 0, cx, cy, 1050);
  key.addColorStop(0, "rgba(255,255,255,0.98)");
  key.addColorStop(0.35, "rgba(255,255,255,0.62)");
  key.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = key;
  g.fillRect(0, 0, BG_W, BG_H);
  // холодный отсвет стекла
  const cool = g.createRadialGradient(cx, cy + 40, 0, cx, cy + 40, 640);
  cool.addColorStop(0, "rgba(186,230,253,0.30)");
  cool.addColorStop(1, "rgba(186,230,253,0)");
  g.fillStyle = cool;
  g.fillRect(0, 0, BG_W, BG_H);
  // сетка точек: ярче у центра, растворяется к краям
  const step = 40;
  for (let y = step / 2; y < BG_H; y += step) {
    for (let x = step / 2; x < BG_W; x += step) {
      const d = Math.hypot((x - cx) / 820, (y - cy) / 1180);
      const a = 0.17 * Math.max(0, 1 - d * d) + 0.035;
      g.fillStyle = `rgba(37,46,84,${a.toFixed(3)})`;
      g.beginPath();
      g.arc(x, y, 2.1, 0, Math.PI * 2);
      g.fill();
    }
  }
  // виньетка
  const vig = g.createRadialGradient(cx, cy, 520, cx, cy, 1650);
  vig.addColorStop(0, "rgba(44,50,80,0)");
  vig.addColorStop(1, "rgba(44,50,80,0.17)");
  g.fillStyle = vig;
  g.fillRect(0, 0, BG_W, BG_H);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};

// мягкое пятно (тень или каустика) — радиальный градиент на прозрачной плоскости
const makeBlob = (rgb: string, inner = 0.0) => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(128, 128, inner * 128, 128, 128, 128);
  r.addColorStop(0, `rgba(${rgb},1)`);
  r.addColorStop(0.45, `rgba(${rgb},0.55)`);
  r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// --- пирамида ---
const pyramidData = (R: number, Hh: number) => {
  const apex: V3 = [0, Hh / 2, 0];
  const base: V3[] = [0, 1, 2, 3].map((k) => {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    return [R * Math.sin(a), -Hh / 2, R * Math.cos(a)] as V3;
  });
  const tris: V3[][] = [
    [apex, base[0], base[1]],
    [apex, base[1], base[2]],
    [apex, base[2], base[3]],
    [apex, base[3], base[0]],
    [base[0], base[2], base[1]],
    [base[0], base[3], base[2]],
  ];
  // центр масс — чтобы развернуть треугольники нормалью наружу
  const cen: V3 = [0, -Hh / 4, 0];
  const pos: number[] = [];
  tris.forEach(([a, b, c]) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const m = [(a[0] + b[0] + c[0]) / 3 - cen[0], (a[1] + b[1] + c[1]) / 3 - cen[1], (a[2] + b[2] + c[2]) / 3 - cen[2]];
    const out = n[0] * m[0] + n[1] * m[1] + n[2] * m[2] > 0;
    (out ? [a, b, c] : [a, c, b]).forEach((p) => pos.push(...p));
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(new Array(pos.length).fill(1), 3));
  geo.computeVertexNormals();
  const edges: [V3, V3][] = [
    [apex, base[0]],
    [apex, base[1]],
    [apex, base[2]],
    [apex, base[3]],
    [base[0], base[1]],
    [base[1], base[2]],
    [base[2], base[3]],
    [base[3], base[0]],
  ];
  return {geo, edges, verts: [apex, ...base]};
};

const UP = new THREE.Vector3(0, 1, 0);
const SIDE = new THREE.Color("#7DD3FC");
const FACE = new THREE.Color("#EAF7FF");
const Edge: React.FC<{a: V3; b: V3; r: number; p: number; children: React.ReactNode}> = ({a, b, r, p, children}) => {
  const A = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(A);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  const pp = Math.max(0.0001, p);
  const mid = A.clone().add(d.clone().multiplyScalar(pp / 2));
  return (
    <mesh position={mid} quaternion={q} scale={[1, len * pp, 1]} visible={p > 0.001}>
      <cylinderGeometry args={[r, r, 1, 14, 1]} />
      {children}
    </mesh>
  );
};

export type PyramidState = {
  x: number; // центр, px кадра
  y: number;
  height: number; // высота, px
  yaw: number; // вращение вокруг своей оси
  pitch: number; // наклон к зрителю
  roll: number;
  scale: number; // появление
  glass: number; // 0..1 — видимость стеклянных граней
  edges: number; // 0..1 — прорисовка рёбер (световая линия)
  glow: number; // свечение рёбер (0 — обычное)
  shine?: number; // усиление отражений (вспышка)
  z?: number;
};

export const GlassPyramid: React.FC<{s: PyramidState}> = ({s}) => {
  const H = s.height;
  const R = (H * 1.05) / 1.3;
  const {geo, edges, verts} = useMemo(() => pyramidData(R, H), [R, H]);
  const er = Math.max(2.2, H * 0.0062);
  const glass = Math.max(0, Math.min(1, s.glass));
  // оттенок граней как у логотипа сайта: грань, повёрнутая к зрителю, — светло-голубая #E0F2FE,
  // грань боком — небесно-голубая #7DD3FC (цвет вершин умножает прошедший сквозь стекло свет)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(s.pitch, 0, s.roll, "XYZ"));
    m.multiply(new THREE.Matrix4().makeRotationY(s.yaw));
    const nrm = geo.attributes.normal;
    const col = geo.attributes.color;
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    for (let f = 0; f < nrm.count; f += 3) {
      v.set(nrm.getX(f), nrm.getY(f), nrm.getZ(f)).applyMatrix4(m);
      const lit = Math.pow(Math.abs(v.z), 0.8);
      c.copy(SIDE).lerp(FACE, lit);
      for (let k = 0; k < 3; k++) col.setXYZ(f + k, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  });
  const [x, y] = atDepth(s.x, s.y, 0);
  return (
    <group position={[x, y, s.z ?? 0]} rotation={[s.pitch, 0, s.roll]} scale={s.scale}>
      <group rotation={[0, s.yaw, 0]}>
        {glass > 0.002 ? (
          <mesh geometry={geo}>
            <meshPhysicalMaterial
              color="#FFFFFF"
              vertexColors
              transmission={1}
              thickness={H * 0.3}
              roughness={0.025}
              ior={1.5}
              dispersion={3}
              attenuationColor="#9ADCFF"
              attenuationDistance={H * 3.5}
              clearcoat={1}
              clearcoatRoughness={0.02}
              specularIntensity={1}
              envMapIntensity={1.1 + (s.shine ?? 0) * 2.2}
              transparent={glass < 0.999}
              opacity={glass}
              depthWrite={glass > 0.5}
            />
          </mesh>
        ) : null}
        {edges.map(([a, b], i) => {
          // рёбра рисуются от вершины (боковые) и по кругу (основание) — для варианта «свет»
          const order = i < 4 ? i * 0.06 : 0.3 + (i - 4) * 0.08;
          const p = Math.max(0, Math.min(1, (s.edges - order) / 0.45));
          return (
            <React.Fragment key={i}>
            {s.glow > 0.02 ? (
              <Edge a={a} b={b} r={er * 3} p={s.edges >= 1 ? 1 : p}>
                <meshBasicMaterial color="#7DD3FC" transparent opacity={Math.min(0.3, 0.14 * s.glow)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </Edge>
            ) : null}
            <Edge a={a} b={b} r={er * (1 + Math.min(1, s.glow) * 0.2)} p={s.edges >= 1 ? 1 : p}>
              <meshPhysicalMaterial
                color="#E8F7FF"
                emissive="#38BDF8"
                emissiveIntensity={0.22 + (s.glow + (s.shine ?? 0) * 1.4) * 2.2}
                roughness={0.18}
                metalness={0}
                clearcoat={1}
                clearcoatRoughness={0.05}
                envMapIntensity={1.4}
                toneMapped={s.glow + (s.shine ?? 0) < 0.05}
              />
            </Edge>
            </React.Fragment>
          );
        })}
        {verts.map((v, i) => (
          <mesh key={i} position={v} visible={s.edges > 0.75}>
            <sphereGeometry args={[er * 1.02, 14, 10]} />
            <meshPhysicalMaterial color="#F4FBFF" emissive="#7DD3FC" emissiveIntensity={0.18 + (s.glow + (s.shine ?? 0) * 1.4) * 2.2} roughness={0.18} clearcoat={1} toneMapped={s.glow + (s.shine ?? 0) < 0.05} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// --- вся студия: задник, тень и каустика под пирамидой, свет, сама пирамида и дополнительные 3D-слои (children) ---
export const GlassStage: React.FC<{
  pyramid: PyramidState;
  bgZoom: number; // лёгкий наезд камеры: задник масштабируется меньше переднего плана (параллакс)
  zoom: number;
  exposure?: number;
  shadow?: number; // 0..1
  dim?: number; // 0..1 — приглушить студию (вариант «свет» в начале)
  children?: React.ReactNode;
  front?: React.ReactNode; // слои, которые сами учитывают наезд (кубики «blocks»)
}> = ({pyramid, bgZoom, zoom, exposure = 1.0, shadow = 1, dim = 0, children, front}) => {
  const bg = useMemo(() => makeBackdrop(pyramid.y), []); // eslint-disable-line react-hooks/exhaustive-deps
  const shadowTex = useMemo(() => makeBlob("38,48,86"), []);
  const causticTex = useMemo(() => makeBlob("200,240,255", 0.05), []);
  const sh = atDepth(pyramid.x + 30, pyramid.y + pyramid.height * 0.62, BG_Z + 2);
  const ca = atDepth(pyramid.x + 10, pyramid.y + pyramid.height * 0.58, BG_Z + 3);
  const shK = (CAM_Z - BG_Z) / CAM_Z;
  return (
    <ThreeCanvas
      width={FW}
      height={FH}
      dpr={1}
      gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}}
      camera={{fov: FOV, position: [0, 0, CAM_Z], near: 50, far: 20000}}
      style={{position: "absolute", inset: 0}}
    >
      <Env exposure={exposure} />
      <ambientLight intensity={0.08} />
      <directionalLight position={[-900, 1600, 1800]} intensity={0.9} />
      <directionalLight position={[1200, -300, 900]} intensity={0.35} color="#CFEFFF" />
      {/* задник */}
      <group scale={[bgZoom, bgZoom, 1]}>
        <mesh position={[0, 0, BG_Z]}>
          <planeGeometry args={[BG_W, BG_H]} />
          <meshBasicMaterial map={bg} toneMapped={false} color={new THREE.Color("#FFFFFF").lerp(new THREE.Color("#C6CCDA"), dim)} />
        </mesh>
        <mesh position={sh} scale={[pyramid.height * 1.25 * shK * pyramid.scale, pyramid.height * 0.34 * shK * pyramid.scale, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={shadowTex} transparent opacity={0.2 * shadow} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={ca} scale={[pyramid.height * 0.5 * shK * pyramid.scale, pyramid.height * 0.13 * shK * pyramid.scale, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={causticTex} transparent opacity={0.75 * shadow} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      {/* передний план: пирамида и слои вариантов; наезд камеры = масштаб вокруг центра кадра */}
      <group scale={[zoom, zoom, zoom]}>
        <GlassPyramid s={pyramid} />
        {children}
      </group>
      {front}
    </ThreeCanvas>
  );
};

// где на экране вершина пирамиды (для блика)
export const apexOnScreen = (s: PyramidState, zoom: number): [number, number] => {
  const v = new THREE.Vector3(0, (s.height / 2) * s.scale, 0).applyEuler(new THREE.Euler(s.pitch, 0, s.roll, "XYZ"));
  const [x, y] = atDepth(s.x, s.y, 0);
  const wx = (x + v.x) * zoom;
  const wy = (y + v.y) * zoom;
  const wz = v.z * zoom;
  const k = CAM_Z / (CAM_Z - wz);
  return [FW / 2 + wx * k, FH / 2 - wy * k];
};
