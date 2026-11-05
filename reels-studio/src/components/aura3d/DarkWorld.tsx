// DarkScan 2.0 (05.11.2026, пользователь: «Мне не нравится, как выглядят собаки на складе и в пещере — вообще ничего не понятно,
// надо сделать максимально детализированно и реалистично. Сейчас там кроме огоньков ничего не видать»).
// Тёмный склад и пещера, по которым идёт Скаут и сканирует пространство лидаром. Всё процедурное, детерминированное (seed):
// - склад: стеллажи в реальном масштабе (1 ед. ≈ 0,5 м) — синие перфорированные стойки с раскосами, оранжевые балки, отбойники
//   в жёлто-чёрную полосу, поддоны (дерево / синие / серые) с коробками в стрейч-плёнке и этикетками-штрихкодами, бочки, бетонный
//   пол с пропилами, пятнами и жёлтыми линиями, отражения на полу (Reflector), фермы под крышей, зенитные фонари (лунный свет)
//   и выключенные подвесные светильники, туман по глубине;
// - пещера: тоннель с рельефом (шум по 3D-координатам, слои породы), сталактиты и сталагмиты, осыпь камней, мокрый пол с лужами
//   (в лужах отражаются фара, собака и камни), стелющийся туман;
// - свет: тусклый холодный общий свет (силуэты читаются), фара собаки — настоящий прожектор с мягкими тенями + объёмный конус
//   с пылинками, контровой свет сзади (отделяет собаку от фона, тоже с тенью), слабая заливка от камеры, светящиеся диоды;
// - лидар: вращающийся вертикальный веер лучей из купола под «подбородком», лучи упираются в настоящие поверхности, облако точек
//   взято с поверхностей сцены (стеллажи, коробки, камни), копится по мере прохода луча и окрашено по расстоянию до собаки
//   (лимонный рядом → голубой → синий вдали);
// - переход «как видим мы» → «как видит робот» и обратно: волна от лидара гасит мир, остаётся облако точек (waves).
// HUD (ЛИДАР 360°, счётчик точек, карта SLAM в углу) — в Scenes.tsx (DarkScan), здесь — 3D и данные для HUD.
import React, {useLayoutEffect, useMemo} from "react";
import * as THREE from "three";
import {useThree} from "@react-three/fiber";
import {Reflector} from "three/examples/jsm/objects/Reflector.js";
import {DogModel, dogBodyMatrix, dogPose, lidarAngle, LIDAR_HZ, type DogPlan, type Pose} from "./AuraDog";
import {clamp01, smooth, type PathState, type V3} from "./kit";

export type DarkKind = "warehouse" | "cave";
export const LIDAR_R = 9.5; // дальность лидара в кадре (ед.)
export const LIDAR_LOCAL: V3 = [0.535, -0.115, 0]; // купол лидара в координатах корпуса собаки
export const LENS_LOCAL: V3 = [0.655, 0.07, 0]; // фара
const HEAD_PITCH = -0.2; // фара смотрит чуть вниз
const T0 = -14; // с какого момента собака уже шла и сканировала (до начала ролика): за спиной — готовая карта
const T1 = 12;

// ---------- случайные числа и шум (детерминированные) ----------
export const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const ih = (x: number, y: number, z: number) => {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967295;
};
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const noise3 = (x: number, y: number, z: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w = fade(z - zi);
  return lerp(
    lerp(lerp(ih(xi, yi, zi), ih(xi + 1, yi, zi), u), lerp(ih(xi, yi + 1, zi), ih(xi + 1, yi + 1, zi), u), v),
    lerp(lerp(ih(xi, yi, zi + 1), ih(xi + 1, yi, zi + 1), u), lerp(ih(xi, yi + 1, zi + 1), ih(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
};
export const fbm3 = (x: number, y: number, z: number, oct = 4) => {
  let a = 0.5;
  let f = 1;
  let s = 0;
  let n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * (noise3(x * f, y * f, z * f) * 2 - 1);
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
};
// бесшовный 2D-шум для текстур: решётка повторяется с периодом P
const tnoise = (x: number, y: number, P: number, seed: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const m = (a: number) => ((a % P) + P) % P;
  const h = (a: number, b: number) => ih(m(a), m(b), seed);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
};
const tfbm = (u: number, v: number, base: number, oct: number, seed = 1) => {
  let a = 0.5;
  let s = 0;
  let n = 0;
  let P = base;
  for (let i = 0; i < oct; i++) {
    s += a * (tnoise(u * P, v * P, P, seed + i * 17) * 2 - 1);
    n += a;
    a *= 0.5;
    P *= 2;
  }
  return s / n;
};
const sstep = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

// ---------- текстуры (canvas, один раз на вкладку) ----------
const TEX = new Map<string, THREE.Texture>();
const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, color = true) => {
  const hit = TEX.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  TEX.set(key, t);
  return t;
};
// попиксельное поле (u, v ∈ [0, 1)) → RGB 0…255
const fieldTex = (key: string, w: number, h: number, f: (u: number, v: number, x: number, y: number) => [number, number, number], color = true) =>
  canvasTex(
    key,
    w,
    h,
    (g) => {
      const im = g.createImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const [r, gg, b] = f(x / w, y / h, x, y);
          const i = (y * w + x) * 4;
          im.data[i] = r;
          im.data[i + 1] = gg;
          im.data[i + 2] = b;
          im.data[i + 3] = 255;
        }
      g.putImageData(im, 0, 0);
    },
    color,
  );
// карта нормалей из поля высот (бесшовно)
const normalTex = (key: string, n: number, height: (u: number, v: number) => number, strength: number) => {
  const hit = TEX.get(key);
  if (hit) return hit;
  const H = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) H[y * n + x] = height(x / n, y / n);
  const t = fieldTex(
    key,
    n,
    n,
    (_u, _v, x, y) => {
      const at = (a: number, b: number) => H[((b + n) % n) * n + ((a + n) % n)];
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      return [((-dx / l) * 0.5 + 0.5) * 255, ((dy / l) * 0.5 + 0.5) * 255, ((1 / l) * 0.5 + 0.5) * 255];
    },
    false,
  );
  return t;
};
const C255 = (hex: string): [number, number, number] => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b].map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255)) as [number, number, number];
};
const mixC = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// бетон склада: плитка 6 × 6 ед. (3 × 3 м) с пропилами по краям, пятнами, следами колёс и зерном
const concreteTex = () =>
  fieldTex("concrete", 1024, 1024, (u, v, x, y) => {
    const blot = tfbm(u, v, 3, 5, 3);
    const grain = tfbm(u, v, 96, 2, 9);
    const sp = ih(x, y, 77);
    let k = 0.5 + 0.13 * blot + 0.07 * grain + (sp > 0.992 ? 0.14 : sp < 0.006 ? -0.16 : 0);
    // следы колёс погрузчиков вдоль прохода (по v)
    for (const c of [0.31, 0.43, 0.69, 0.81]) k -= 0.07 * Math.exp(-(((u - c) / 0.018) ** 2)) * (0.6 + 0.4 * tfbm(u, v, 8, 2, 21));
    // масляные пятна
    for (const [cx, cy, r] of [[0.22, 0.3, 0.05], [0.71, 0.62, 0.035], [0.5, 0.88, 0.06]] as const) {
      const d = Math.hypot(u - cx, (v - cy) * 1.4) / r;
      k -= 0.16 * Math.exp(-d * d * 1.6) * (0.7 + 0.3 * tfbm(u, v, 32, 2, 5));
    }
    // пропилы (шов по краям плитки)
    const e = Math.min(x, y, 1023 - x, 1023 - y);
    if (e < 2) k *= 0.35;
    else if (e < 4) k *= 0.82;
    return mixC(C255("#3E3D3B"), C255("#8A8882"), clamp01(k)) as [number, number, number];
  });
const concreteRough = () =>
  fieldTex(
    "concreteRough",
    512,
    512,
    (u, v) => {
      let r = 0.74 + 0.14 * tfbm(u, v, 6, 4, 13);
      for (const c of [0.31, 0.43, 0.69, 0.81]) r -= 0.22 * Math.exp(-(((u - c) / 0.03) ** 2)); // наезженные полосы глаже
      const g = clamp01(r) * 255;
      return [g, g, g];
    },
    false,
  );
const concreteNormal = () => normalTex("concreteN", 512, (u, v) => tfbm(u, v, 48, 3, 31) * 0.6 + tfbm(u, v, 6, 3, 37) * 0.4, 5);

// порода пещеры: слои, прожилки, мокрые потёки
const rockTex = () =>
  fieldTex("rock", 1024, 1024, (u, v) => {
    const big = tfbm(u, v, 4, 5, 41);
    const strata = Math.sin((v + 0.12 * tfbm(u, v, 3, 3, 43)) * Math.PI * 2 * 9) * 0.5 + 0.5;
    const vein = Math.pow(1 - Math.abs(tfbm(u, v, 6, 4, 47)), 14);
    let k = 0.42 + 0.3 * big + 0.12 * (strata - 0.5);
    k = clamp01(k);
    let col = mixC(C255("#3A332D"), C255("#A39482"), k);
    col = mixC(col, C255("#B9B0A2"), vein * 0.5);
    const spec = tfbm(u, v, 64, 2, 53);
    return mixC(col, C255("#1A1715"), clamp01(-spec) * 0.35) as [number, number, number];
  });
const rockNormal = () => normalTex("rockN", 1024, (u, v) => tfbm(u, v, 8, 5, 61) * 0.7 + tfbm(u, v, 40, 3, 67) * 0.3 + 0.08 * Math.sin((v + 0.1 * tfbm(u, v, 3, 2, 43)) * Math.PI * 18), 9);
const rockRough = () =>
  fieldTex(
    "rockRough",
    512,
    512,
    (u, v) => {
      const wet = clamp01(0.5 + 1.6 * tfbm(u * 0.5, v * 2, 4, 3, 71)); // потёки воды по стенам
      const g = clamp01(0.92 - 0.55 * wet * wet) * 255;
      return [g, g, g];
    },
    false,
  );
const mudRough = () =>
  fieldTex(
    "mudRough",
    512,
    512,
    (u, v) => {
      const g = clamp01(0.66 + 0.28 * tfbm(u, v, 8, 4, 83)) * 255;
      return [g, g, g];
    },
    false,
  );

// стойка стеллажа: синяя краска, продольные прорези и круглые отверстия с шагом 5 см; плитка 0,18 × 1 ед.
const perfTex = () =>
  canvasTex("perf", 64, 512, (g) => {
    g.fillStyle = "#2B6CB0";
    g.fillRect(0, 0, 64, 512);
    const gr = g.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, "rgba(0,0,0,0.35)");
    gr.addColorStop(0.18, "rgba(255,255,255,0.10)");
    gr.addColorStop(0.5, "rgba(255,255,255,0.0)");
    gr.addColorStop(0.82, "rgba(255,255,255,0.10)");
    gr.addColorStop(1, "rgba(0,0,0,0.35)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 512);
    for (let k = 0; k < 10; k++) {
      const y = k * 51.2 + 10;
      g.fillStyle = "#0B1220";
      g.beginPath();
      g.roundRect(27, y, 10, 30, 5);
      g.fill();
      g.beginPath();
      g.arc(13, y + 15, 3.5, 0, Math.PI * 2);
      g.arc(51, y + 15, 3.5, 0, Math.PI * 2);
      g.fill();
    }
  });
// отбойник: жёлто-чёрная диагональ с потёртостями
const hazardTex = () =>
  canvasTex("hazard", 256, 256, (g) => {
    g.fillStyle = "#F2C230";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#17181A";
    for (let k = -4; k < 8; k++) {
      g.beginPath();
      g.moveTo(k * 64, 0);
      g.lineTo(k * 64 + 32, 0);
      g.lineTo(k * 64 + 32 + 256, 256);
      g.lineTo(k * 64 + 256, 256);
      g.closePath();
      g.fill();
    }
    const r = rng(5);
    for (let k = 0; k < 160; k++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "40,40,40" : "200,200,190"},${0.15 + r() * 0.25})`;
      g.fillRect(r() * 256, r() * 256, 2 + r() * 10, 1 + r() * 3);
    }
  });
// этикетка: белая наклейка, штрихкод, крупный блок «номера», лимонный квадрат (только фигуры, без текста)
const labelTex = () =>
  canvasTex("label", 256, 160, (g) => {
    g.fillStyle = "#F3F1EA";
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = "#1C1C1C";
    g.fillRect(14, 14, 90, 30);
    g.fillStyle = "#FFF65D";
    g.fillRect(200, 14, 42, 30);
    g.fillStyle = "#4A4A4A";
    for (let k = 0; k < 3; k++) g.fillRect(114, 16 + k * 10, 70 - k * 14, 5);
    const r = rng(9);
    let x = 16;
    g.fillStyle = "#111";
    while (x < 238) {
      const w = 1 + Math.floor(r() * 4);
      if (r() > 0.4) g.fillRect(x, 62, w, 72);
      x += w + 1;
    }
    for (let k = 0; k < 2; k++) g.fillRect(16 + k * 120, 140, 100, 6);
  });
// гофрокороб: крафт, затемнение к рёбрам, скотч по центру сверху
const cartonTex = () =>
  canvasTex("carton", 256, 256, (g) => {
    const im = g.createImageData(256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const u = x / 256;
        const v = y / 256;
        const n = tfbm(u, v, 16, 3, 91) * 0.06 + tfbm(u, v, 128, 1, 93) * 0.03;
        const edge = Math.min(u, v, 1 - u, 1 - v);
        const k = 1 + n - 0.28 * Math.exp(-edge * 60);
        const i = (y * 256 + x) * 4;
        im.data[i] = clamp01(0.86 * k) * 255;
        im.data[i + 1] = clamp01(0.84 * k) * 255;
        im.data[i + 2] = clamp01(0.8 * k) * 255;
        im.data[i + 3] = 255;
      }
    g.putImageData(im, 0, 0);
    g.fillStyle = "rgba(205,170,110,0.55)";
    g.fillRect(108, 0, 40, 92);
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.fillRect(112, 0, 6, 92);
    g.strokeStyle = "rgba(60,50,40,0.5)";
    g.lineWidth = 2;
    g.strokeRect(150, 170, 70, 46);
    g.beginPath();
    g.moveTo(40, 200);
    g.lineTo(52, 180);
    g.lineTo(64, 200);
    g.moveTo(52, 180);
    g.lineTo(52, 222);
    g.stroke();
  });
// стрейч-плёнка: горизонтальные складки
const wrapNormal = () => normalTex("wrapN", 256, (u, v) => tnoise(u * 3, v * 40, 40, 101) * 0.7 + tnoise(u * 8, v * 90, 90, 103) * 0.3, 3);
// мягкая точка (ореол, пылинки)
const dotTex = () =>
  canvasTex("dot", 128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.18, "rgba(255,255,255,0.55)");
    gr.addColorStop(0.5, "rgba(255,255,255,0.12)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  });
// клочья тумана (альфа)
const mistTex = () =>
  canvasTex("mist", 256, 128, (g) => {
    const im = g.createImageData(256, 128);
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 256; x++) {
        const u = x / 256;
        const v = y / 128;
        const n = tfbm(u, v * 0.5, 4, 4, 111) * 0.5 + 0.5;
        const fall = Math.sin(Math.PI * u) * Math.pow(Math.sin(Math.PI * v), 1.6);
        const i = (y * 256 + x) * 4;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = 255;
        im.data[i + 3] = clamp01((n - 0.25) * 1.6 * fall) * 255;
      }
    g.putImageData(im, 0, 0);
  });
// краска разметки: износ
const paintTex = () =>
  fieldTex("paint", 64, 512, (u, v) => {
    const wear = tfbm(u, v, 8, 4, 121);
    const g = clamp01(0.85 + 0.5 * wear) * 255;
    return [g, g, g];
  });

// ---------- волна «как видим мы» ↔ «как видит робот» ----------
// внутри радиуса R1 (и вне R2) мир гаснет до uDim, на фронтах волн — светящееся кольцо (лимонное вперёд, голубое назад)
export const WIPE = {
  uWO: {value: new THREE.Vector3()},
  uR1: {value: -1},
  uR2: {value: -1},
  uDim: {value: 0.05},
};
const WIPE_GLSL = `
  float wd = distance(vWipeP, uWO);
  float inR = (1.0 - smoothstep(uR1 - 0.6, uR1, wd)) * smoothstep(uR2 - 0.6, uR2, wd);
  gl_FragColor.rgb *= mix(1.0, uDim, inR);
  float e1 = (uR1 > 0.0 && uR1 < 80.0) ? exp(-pow((wd - uR1) / 0.09, 2.0)) * 1.2 + exp(-pow((wd - uR1 + 0.5) / 0.6, 2.0)) * 0.35 : 0.0;
  float e2 = (uR2 > 0.0 && uR2 < 80.0) ? exp(-pow((wd - uR2) / 0.09, 2.0)) * 1.2 + exp(-pow((wd - uR2 + 0.5) / 0.6, 2.0)) * 0.35 : 0.0;
  gl_FragColor.rgb += vec3(1.0, 0.96, 0.36) * e1 + vec3(0.36, 0.62, 1.0) * e2;
`;
export const patchWipe = <M extends THREE.Material>(m: M): M => {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIPE);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWipeP;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\n{ vec4 wpp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wpp = instanceMatrix * wpp;\n#endif\n vWipeP = (modelMatrix * wpp).xyz; }",
      );
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWipeP;\nuniform vec3 uWO;\nuniform float uR1;\nuniform float uR2;\nuniform float uDim;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\n" + WIPE_GLSL);
  };
  m.customProgramCacheKey = () => "wipe";
  return m;
};
const std = (o: THREE.MeshStandardMaterialParameters) => patchWipe(new THREE.MeshStandardMaterial(o));

// ---------- общие куски сцены ----------
type Inst = {p: V3; s?: V3; rot?: V3; c?: string | THREE.Color};
const O3 = new THREE.Object3D();
const instanced = (geo: THREE.BufferGeometry, mat: THREE.Material, items: Inst[], cast = true, receive = true) => {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  m.count = items.length;
  items.forEach((it, i) => {
    O3.position.set(...it.p);
    O3.rotation.set(...(it.rot ?? [0, 0, 0]));
    O3.scale.set(...(it.s ?? [1, 1, 1]));
    O3.updateMatrix();
    m.setMatrixAt(i, O3.matrix);
    if (it.c !== undefined) m.setColorAt(i, it.c instanceof THREE.Color ? it.c : new THREE.Color(it.c));
  });
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = cast;
  m.receiveShadow = receive;
  m.frustumCulled = false;
  return m;
};
const scaleUV = (g: THREE.BufferGeometry, su: number, sv: number) => {
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return g;
};

// поверхность для облака точек: прямоугольник (угол o, рёбра a, b, нормаль n) и плотность (точек на ед.²)
type Surf = {o: V3; a: V3; b: V3; n: V3; d: number};
const boxFace = (c: V3, s: V3, axis: 0 | 1 | 2, sign: 1 | -1, d: number, clipY = 99): Surf | null => {
  const o: V3 = [c[0] - s[0] / 2, c[1] - s[1] / 2, c[2] - s[2] / 2];
  o[axis] = c[axis] + (sign * s[axis]) / 2;
  const others = ([0, 1, 2] as const).filter((k) => k !== axis);
  const a: V3 = [0, 0, 0];
  const b: V3 = [0, 0, 0];
  a[others[0]] = s[others[0]];
  b[others[1]] = s[others[1]];
  // по высоте — не выше clipY (выше лидар не достаёт)
  for (const e of [a, b])
    if (e[1] > 0 && o[1] + e[1] > clipY) {
      e[1] = clipY - o[1];
      if (e[1] <= 0) return null;
    }
  const n: V3 = [0, 0, 0];
  n[axis] = sign;
  return {o, a, b, n, d};
};

// ================= СКЛАД =================
export const WH = {aisle: 3.2, rd: 2.3, bay: 5.6, h: 12.6, levels: [0, 3.3, 6.6, 9.9], z0: 17.8, nb: 12, dogX: -1.1, v: 0.78, z: 4.2};
export const whPath = (t: number): PathState => ({x: WH.dogX, z: WH.z - WH.v * t, yaw: Math.PI / 2, dist: 40 + WH.v * t, speed: WH.v, moving: true});

const buildWarehouse = (density: number) => {
  const r = rng(20261105);
  const g = new THREE.Group();
  const surfs: Surf[] = [];
  const {aisle: A, rd: RD, bay: BAY, h: H, levels: LV, z0: Z0, nb: NB} = WH;
  const DR = 400 * density; // плотность точек на стеллажах
  const zMin = -16; // дальше лидар за время ролика не достаёт — точки не нужны
  const keep = (z: number) => z > zMin;

  const uprights: Inst[] = [];
  const braces: Inst[] = [];
  const beams: Inst[] = [];
  const guards: Inst[] = [];
  const boards: Inst[] = [];
  const cartons: Inst[] = [];
  const bulk: Inst[] = [];
  const wraps: Inst[] = [];
  const labels: Inst[] = [];
  const beamLabels: Inst[] = [];
  const drums: Inst[] = [];
  const WOOD = ["#B48A58", "#A27A4C", "#C29A66", "#9C7448"];
  for (const s of [-1, 1] as const) {
    const face = (-s) as 1 | -1; // грань, смотрящая в проход
    const xf = s * (A + 0.07);
    const xb = s * (A + RD - 0.07);
    for (let k = 0; k <= NB; k++) {
      const z = Z0 - k * BAY;
      uprights.push({p: [xf, H / 2, z]}, {p: [xb, H / 2, z]});
      guards.push({p: [s * (A - 0.13), 0.42, z], s: [0.2, 0.84, 0.32]});
      if (keep(z)) {
        const up = boxFace([xf, H / 2, z], [0.14, H, 0.18], 0, face, DR * 0.8, LIDAR_R);
        if (up) surfs.push(up);
        surfs.push(boxFace([s * (A - 0.13), 0.42, z], [0.2, 0.84, 0.32], 0, face, DR)!);
      }
      // раскосы рамы (зигзаг между передней и задней стойкой)
      const ys = [0.25];
      while (ys[ys.length - 1] + 1.55 < H - 0.2) ys.push(ys[ys.length - 1] + 1.55);
      braces.push({p: [(xf + xb) / 2, ys[0], z], s: [RD - 0.14, 0.06, 0.05]});
      braces.push({p: [(xf + xb) / 2, H - 0.3, z], s: [RD - 0.14, 0.06, 0.05]});
      for (let i = 0; i + 1 < ys.length; i++) {
        const [x1, x2] = i % 2 ? [xb, xf] : [xf, xb];
        const dx = x2 - x1;
        const dy = ys[i + 1] - ys[i];
        braces.push({p: [(x1 + x2) / 2, (ys[i] + ys[i + 1]) / 2, z], s: [Math.hypot(dx, dy), 0.05, 0.045], rot: [0, 0, Math.atan2(dy, dx)]});
      }
    }
    for (let k = 0; k < NB; k++) {
      const zk = Z0 - k * BAY;
      const zc = zk - BAY / 2;
      for (let l = 1; l < LV.length; l++) {
        const y = LV[l] - 0.14;
        beams.push({p: [s * (A + 0.05), y, zc]}, {p: [s * (A + RD - 0.05), y, zc]});
        if (keep(zc)) {
          const bf = boxFace([s * (A + 0.05), y, zc], [0.1, 0.28, BAY - 0.2], 0, face, DR, LIDAR_R);
          if (bf) surfs.push(bf);
        }
      }
      const gap = (BAY - 0.18 - 3 * 1.6) / 4;
      for (let l = 0; l < LV.length; l++) {
        const base = LV[l];
        for (let j = 0; j < 3; j++) {
          const zp = zk - 0.09 - gap - 0.8 - j * (1.6 + gap);
          if (l > 0) beamLabels.push({p: [s * (A - 0.004), LV[l] - 0.15, zp], rot: [0, face > 0 ? Math.PI / 2 : -Math.PI / 2, 0], s: [0.42, 0.15, 1]});
          const roll = r();
          if (roll < 0.08 && !(l === 0 && Math.abs(zp - 3) < 9)) continue; // пустая ячейка
          // поддон: доски, шашки, поперечины (фасад в проход)
          const xc = s * (A + RD / 2);
          const kind = r();
          const pc = kind < 0.62 ? WOOD[Math.floor(r() * WOOD.length)] : kind < 0.86 ? "#2E6DB2" : "#5E6368";
          for (const oz of [-0.68, 0, 0.68]) boards.push({p: [xc, base + 0.022, zp + oz], s: [2.4, 0.044, 0.2], c: pc});
          for (const ox of [-1.06, 0, 1.06]) for (const oz of [-0.68, 0, 0.68]) boards.push({p: [xc + ox, base + 0.122, zp + oz], s: [0.28, 0.156, 0.2], c: pc});
          for (const ox of [-1.06, 0, 1.06]) boards.push({p: [xc + ox, base + 0.222, zp], s: [0.28, 0.044, 1.6], c: pc});
          for (const oz of [-0.69, -0.345, 0, 0.345, 0.69]) boards.push({p: [xc, base + 0.266, zp + oz], s: [2.4, 0.044, 0.22], c: pc});
          const front = s * (A - 0.05);
          if (keep(zp)) {
            const pf = boxFace([xc, base + 0.144, zp], [2.4, 0.288, 1.6], 0, face, DR, LIDAR_R);
            if (pf) surfs.push(pf);
          }
          const lt = r();
          const top = base + 0.288;
          const maxH = l === 0 ? 2.7 : LV[1] - 0.3 - 0.288 - 0.12;
          if (lt < 0.08) continue; // пустой поддон
          if (lt < 0.2) {
            // бочки 200 л: две в глубину
            const dc = r() < 0.5 ? "#2B6CB0" : r() < 0.5 ? "#1E2124" : "#7E868E";
            for (const ox of [-0.6, 0.6]) drums.push({p: [xc + ox, top + 0.88, zp], s: [0.56, 1.76, 0.56], c: dc});
            if (keep(zp)) {
              // точки на передней полуокружности бочки
              const cx = xc - s * 0.6;
              const n = Math.round(1.76 * 1.76 * DR);
              const sr = rng(Math.round(zp * 100) + s * 7);
              for (let q = 0; q < n; q++) {
                const a = (sr() - 0.5) * Math.PI * 0.95;
                const nx = face * Math.cos(a);
                const nz = Math.sin(a);
                surfs.push({o: [cx + nx * 0.57, top + sr() * 1.76, zp + nz * 0.57], a: [0, 0, 0], b: [0, 0, 0], n: [nx, 0, nz], d: -1});
              }
            }
            continue;
          }
          // коробки: лицевой столбец — отдельные коробки, за ним — общий блок
          const hl = Math.min(maxH, 1.45 + r() * 1.25);
          const nz = r() < 0.6 ? 2 : 3;
          const nl = Math.max(2, Math.round(hl / (0.42 + r() * 0.2)));
          const cw = 1.58 / nz;
          const chh = hl / nl;
          const tone = r();
          const cc = new THREE.Color(tone < 0.7 ? "#C4A06A" : tone < 0.85 ? "#D8D3C8" : "#A57E4E");
          const wrapped = r() < 0.72;
          for (let a = 0; a < nl; a++)
            for (let b = 0; b < nz; b++) {
              if (!wrapped && a === nl - 1 && r() < 0.25) continue;
              const jit = (r() - 0.5) * 0.04;
              const c2 = cc.clone().offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.05, (r() - 0.5) * 0.06);
              cartons.push({
                p: [front + s * (0.39 + jit), top + chh * (a + 0.5), zp - 0.79 + cw * (b + 0.5) + (r() - 0.5) * 0.02],
                s: [0.76, chh * 0.975, cw * 0.97],
                rot: [0, (r() - 0.5) * 0.04, 0],
                c: c2,
              });
            }
          bulk.push({p: [front + s * (0.8 + 0.78), top + hl / 2 - 0.01, zp], s: [1.5, hl * 0.98, 1.56], c: cc});
          if (wrapped) wraps.push({p: [front + s * 1.17, top + hl / 2 + 0.005, zp], s: [2.38, hl + 0.03, 1.63]});
          const ly = top + hl * (0.45 + r() * 0.25);
          const lz = zp + (r() - 0.5) * 0.6;
          labels.push({p: [front - s * (wrapped ? 0.012 : 0.004), ly, lz], rot: [0, face > 0 ? Math.PI / 2 : -Math.PI / 2, 0], s: [0.36, 0.225, 1]});
          if (keep(zp)) {
            const lf = boxFace([front + s * 0.39, top + hl / 2, zp], [0.78, hl, 1.58], 0, face, DR, LIDAR_R);
            if (lf) surfs.push(lf);
          }
        }
      }
    }
  }
  // материалы
  const upGeo = scaleUV(new THREE.BoxGeometry(0.14, H, 0.18), 1, H);
  g.add(instanced(upGeo, std({map: perfTex(), roughness: 0.48, metalness: 0.35}), uprights));
  const blue = std({color: "#2B6CB0", roughness: 0.5, metalness: 0.3});
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), blue, braces, true, false));
  g.add(instanced(new THREE.BoxGeometry(0.1, 0.28, BAY - 0.2), std({color: "#E8661C", roughness: 0.42, metalness: 0.25}), beams));
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), std({map: hazardTex(), roughness: 0.6}), guards));
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), std({roughness: 0.82, color: "#ffffff"}), boards));
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), std({map: cartonTex(), roughness: 0.86, color: "#ffffff"}), cartons));
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), std({roughness: 0.9, color: "#ffffff"}), bulk, true, true));
  const wn = wrapNormal();
  const wrapMat = patchWipe(
    new THREE.MeshPhysicalMaterial({color: "#E9F0F4", transparent: true, opacity: 0.2, roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, normalMap: wn, normalScale: new THREE.Vector2(0.6, 0.6), depthWrite: false}),
  );
  const wm = instanced(new THREE.BoxGeometry(1, 1, 1), wrapMat, wraps, false, true);
  wm.renderOrder = 2;
  g.add(wm);
  const lab = std({map: labelTex(), roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2});
  g.add(instanced(new THREE.PlaneGeometry(1, 1), lab, labels, false, true));
  g.add(instanced(new THREE.PlaneGeometry(1, 1), std({map: labelTex(), color: "#FFF3B0", roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2}), beamLabels, false, true));
  g.add(instanced(new THREE.CylinderGeometry(1, 1, 1, 28), std({roughness: 0.42, metalness: 0.45, color: "#ffffff"}), drums));
  // пол: бетон с пропилами, следами и пятнами; немного блестит
  const fg = new THREE.PlaneGeometry(36, 80, 1, 1).rotateX(-Math.PI / 2);
  scaleUV(fg, 36 / 6, 80 / 6);
  const fl = new THREE.Mesh(fg, std({map: concreteTex(), roughnessMap: concreteRough(), normalMap: concreteNormal(), normalScale: new THREE.Vector2(0.22, 0.22), roughness: 1, metalness: 0.0}));
  fl.position.set(0, 0, -16);
  fl.receiveShadow = true;
  g.add(fl);
  const lineMat = std({color: "#E9C33A", roughness: 0.5, transparent: true, alphaMap: paintTex(), polygonOffset: true, polygonOffsetFactor: -4, side: THREE.DoubleSide});
  for (const x of [-(A - 0.28), A - 0.28]) {
    const lg = scaleUV(new THREE.PlaneGeometry(0.14, 80).rotateX(-Math.PI / 2), 1, 10);
    const lm = new THREE.Mesh(lg, lineMat);
    lm.position.set(x, 0.002, -16);
    lm.receiveShadow = true;
    g.add(lm);
  }
  // поперечные «стоп-линии» у торцов и стрелки направления — простые фигуры
  for (const z of [10.4, -1.2, -12.8]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.4).rotateX(-Math.PI / 2), lineMat);
    m.position.set(1.3, 0.002, z);
    m.receiveShadow = true;
    g.add(m);
    const tri = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, -0.8)]);
    const tm = new THREE.Mesh(new THREE.ShapeGeometry(tri).rotateX(-Math.PI / 2), lineMat);
    tm.position.set(1.3, 0.002, z - 0.7);
    g.add(tm);
  }
  surfs.push({o: [-A, 0, zMin], a: [2 * A, 0, 0], b: [0, 0, Z0 - zMin], n: [0, 1, 0], d: 190 * density});
  // крыша: фермы, прогоны, зенитные фонари, выключенные светильники на тросах
  const steel = std({color: "#3A3F46", roughness: 0.6, metalness: 0.5});
  const roof: Inst[] = [];
  for (let z = 20; z > -56; z -= 7.5) {
    roof.push({p: [0, 15.6, z], s: [30, 0.22, 0.2]}, {p: [0, 17.6, z], s: [30, 0.22, 0.2]});
    for (let x = -14; x <= 14; x += 2) roof.push({p: [x, 16.6, z], s: [0.08, 2.0, 0.08], rot: [0, 0, (x / 2) % 2 ? 0.6 : -0.6]});
  }
  for (let x = -12; x <= 12; x += 3) roof.push({p: [x, 17.82, -16], s: [0.14, 0.2, 80]});
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), steel, roof, false, false));
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(36, 80).rotateX(Math.PI / 2), std({color: "#15181C", roughness: 0.9}));
  deck.position.set(0, 18, -16);
  g.add(deck);
  const sky = patchWipe(new THREE.MeshStandardMaterial({color: "#000000", emissive: new THREE.Color("#6F87A8"), emissiveIntensity: 0.55}));
  for (let z = 16; z > -56; z -= 7.5)
    for (const x of [-4.5, 4.5]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 5.2).rotateX(Math.PI / 2), sky);
      m.position.set(x, 17.95, z - 3.75);
      g.add(m);
    }
  const lampMat = std({color: "#2B2F35", roughness: 0.35, metalness: 0.8});
  const lensMat = std({color: "#0C0E11", roughness: 0.08, metalness: 0.2, emissive: new THREE.Color("#1A2230"), emissiveIntensity: 0.4});
  const lamps: Inst[] = [];
  const lenses: Inst[] = [];
  const cables: Inst[] = [];
  for (let z = 16 - 3.75; z > -56; z -= 7.5)
    for (const x of [0]) {
      lamps.push({p: [x, 13.75, z], s: [0.62, 0.42, 0.62]});
      lenses.push({p: [x, 13.53, z], s: [0.56, 0.02, 0.56]});
      cables.push({p: [x - 0.25, 14.9, z], s: [0.012, 2.1, 0.012]}, {p: [x + 0.25, 14.9, z], s: [0.012, 2.1, 0.012]});
    }
  g.add(instanced(new THREE.CylinderGeometry(0.55, 1, 1, 24, 1, true), lampMat, lamps, false, false));
  g.add(instanced(new THREE.CylinderGeometry(1, 1, 1, 24), lensMat, lenses, false, false));
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), steel, cables, false, false));
  // торцевая стена с секционными воротами (за туманом — силуэт)
  for (const zw of [24, -52]) {
    const wall = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(36, 18), 6, 3), std({map: concreteTex(), color: "#8B8F96", roughness: 0.95}));
    wall.position.set(0, 9, zw);
    wall.rotation.y = zw > 0 ? Math.PI : 0;
    g.add(wall);
    const slats: Inst[] = [];
    for (let y = 0.25; y < 8; y += 0.5) slats.push({p: [0, y, zw - Math.sign(zw) * 0.06], s: [7, 0.44, 0.08]});
    g.add(instanced(new THREE.BoxGeometry(1, 1, 1), std({color: "#5D646D", roughness: 0.5, metalness: 0.6}), slats, false, true));
  }
  // отражения на полу: тот же мир в зеркале, размыто, добавкой поверх бетона
  const refl = makeReflector(new THREE.PlaneGeometry(2 * A - 0.1, 60), {opacity: 0.22, blur: 1.6, additive: true, tint: "#C7CCD2", res: 0.42});
  refl.position.set(0, 0.004, -12);
  g.add(refl);
  return {group: g, surfs, floorY: (_x: number, _z: number) => 0};
};

// луч лидара в складе: пол, крыша, лицевые грани стеллажей
const whHit = (o: THREE.Vector3, d: THREE.Vector3, R: number) => {
  let t = R;
  if (d.y < -1e-4) t = Math.min(t, -o.y / d.y);
  if (d.y > 1e-4) t = Math.min(t, (15.4 - o.y) / d.y);
  for (const s of [-1, 1]) {
    const fx = s * (WH.aisle - 0.06);
    if (Math.abs(d.x) > 1e-4 && Math.sign(d.x) === s) {
      const tx = (fx - o.x) / d.x;
      if (tx > 0 && o.y + d.y * tx < WH.h) t = Math.min(t, tx);
    }
  }
  return t;
};

// ================= ПЕЩЕРА =================
export const CAVE = {cy: 1.05, v: 0.72, z: 3.6};
export const caveXc = (z: number) => 0.85 * Math.sin(z * 0.12 + 0.6) + 0.35 * Math.sin(z * 0.31 + 2.0);
const caveW = (z: number) => 4.35 + 0.35 * Math.sin(z * 0.21 + 1.0);
const caveHh = (z: number) => 3.05 + 0.45 * Math.sin(z * 0.17 + 2.3);
const caveDisp = (x: number, y: number, z: number) =>
  0.62 * fbm3(x * 0.3, y * 0.3, z * 0.3, 4) + 0.2 * fbm3(x * 1.05 + 7.3, y * 1.05, z * 1.05, 3) + 0.07 * fbm3(x * 3.1, y * 3.1 + 2, z * 3.1, 2) + 0.07 * Math.sin(y * 4.2 + 2.2 * fbm3(x * 0.5, y * 0.5, z * 0.5, 2));
// радиус стены в направлении α от оси тоннеля (центр — (xc, cy))
const caveRho = (alpha: number, z: number) => {
  const W = caveW(z);
  const Hh = caveHh(z);
  const c = Math.cos(alpha);
  const s = Math.sin(alpha);
  const r0 = 1 / Math.sqrt((c * c) / (W * W) + (s * s) / (Hh * Hh));
  const xc = caveXc(z);
  return r0 + caveDisp(xc + c * r0, CAVE.cy + s * r0, z);
};
const PUDDLES: [number, number, number, number, number][] = [
  // dx (от оси), z, радиус по x, радиус по z, глубина
  [0.25, 2.3, 0.85, 1.25, 0.075],
  [-0.55, -0.9, 1.15, 0.8, 0.07],
  [0.35, -3.6, 1.0, 1.6, 0.08],
  [-0.3, -6.8, 1.6, 2.0, 0.085],
  [0.7, 6.1, 1.2, 1.0, 0.07],
  [-0.9, 9.4, 1.3, 1.6, 0.07],
  [1.4, -10.5, 1.4, 1.2, 0.07],
  [-1.3, 0.9, 0.7, 0.9, 0.06],
];
export const caveFloor = (x: number, z: number) => {
  const dx = x - caveXc(z);
  const a = Math.abs(dx);
  const e = sstep(1.5, 4.3, a);
  let y = 0.022 + 0.016 * fbm3(x * 1.7, 0.5, z * 1.7, 3) + e * (0.32 + 0.3 * fbm3(x * 0.7, 3.1, z * 0.7, 3)) + e * e * e * 1.4;
  for (const [px, pz, rx, rz, dpt] of PUDDLES) {
    const q = ((dx - px) / rx) ** 2 + ((z - pz) / rz) ** 2;
    y -= dpt * Math.exp(-q * 1.6) * (0.85 + 0.3 * noise3(x * 2, 9, z * 2));
  }
  return y;
};
const caveInside = (x: number, y: number, z: number) => {
  const dx = x - caveXc(z);
  const dy = y - CAVE.cy;
  return Math.hypot(dx, dy) < caveRho(Math.atan2(dy, dx), z) && y > caveFloor(x, z);
};
export const cavePath = (t: number): PathState => {
  const z = CAVE.z - CAVE.v * t;
  const x = caveXc(z) * 0.8;
  const dxdz = (caveXc(z + 0.05) - caveXc(z - 0.05)) * 8; // 0,8 × производная
  return {x, z, yaw: Math.atan2(1, -dxdz), dist: 40 + CAVE.v * t, speed: CAVE.v, moving: true};
};
const caveHit = (o: THREE.Vector3, d: THREE.Vector3, R: number) => {
  for (let s = 0.12; s < R; s += 0.07) {
    const x = o.x + d.x * s;
    const y = o.y + d.y * s;
    const z = o.z + d.z * s;
    if (!caveInside(x, y, z)) return s;
  }
  return R;
};

// камень: икосаэдр, продавленный шумом (сплющен снизу)
const rockGeo = (seed: number, detail = 3) => {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + 0.38 * fbm3(v.x * 1.2 + seed, v.y * 1.2, v.z * 1.2, 4) + 0.08 * fbm3(v.x * 4 + seed, v.y * 4, v.z * 4, 2);
    v.multiplyScalar(k);
    if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.3;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
};
// сталактит: конус остриём вниз (основание на y = 0), бугристый
const stalGeo = () => {
  const g = new THREE.ConeGeometry(1, 1, 10, 8);
  g.rotateX(Math.PI);
  g.translate(0, -0.5, 0);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + 0.22 * Math.sin(y * 19 + x * 3) * (1 + y) + 0.12 * fbm3(x * 3, y * 6, z * 3, 2);
    p.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals();
  return g;
};

// крупные камни и сталагмиты (центр, радиус) — камера пещеры обходит их
const CAVE_BLOCKERS: {p: THREE.Vector3; r: number}[] = [];
const caveClear = (q: THREE.Vector3) => caveInside(q.x, q.y, q.z) && !CAVE_BLOCKERS.some((b) => q.distanceTo(b.p) < b.r + 0.3);
const buildCave = (density: number) => {
  CAVE_BLOCKERS.length = 0;
  const r = rng(77031);
  const g = new THREE.Group();
  const zA = 13;
  const zB = -34;
  // стены и свод
  const NA = 132;
  const step = 0.2;
  const NZ = Math.round((zA - zB) / step);
  const aMin = -1.05;
  const aMax = Math.PI + 1.05;
  const pos = new Float32Array((NA + 1) * (NZ + 1) * 3);
  const uv = new Float32Array((NA + 1) * (NZ + 1) * 2);
  for (let j = 0; j <= NZ; j++) {
    const z = zA - j * step;
    const xc = caveXc(z);
    let arc = 0;
    let px = 0;
    let py = 0;
    for (let i = 0; i <= NA; i++) {
      const a = aMin + ((aMax - aMin) * i) / NA;
      const rho = caveRho(a, z);
      const x = xc + Math.cos(a) * rho;
      const y = CAVE.cy + Math.sin(a) * rho;
      if (i > 0) arc += Math.hypot(x - px, y - py);
      px = x;
      py = y;
      const k = (j * (NA + 1) + i) * 3;
      pos[k] = x;
      pos[k + 1] = y;
      pos[k + 2] = z;
      uv[(j * (NA + 1) + i) * 2] = arc / 4.5;
      uv[(j * (NA + 1) + i) * 2 + 1] = z / 4.5;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NA; i++) {
      const a = j * (NA + 1) + i;
      const b = a + 1;
      const c = a + NA + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  tg.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  tg.setIndex(idx);
  tg.computeVertexNormals();
  const rockMat = std({map: rockTex(), normalMap: rockNormal(), normalScale: new THREE.Vector2(1.1, 1.1), roughnessMap: rockRough(), roughness: 1, color: "#C9BFB3", side: THREE.DoubleSide});
  const tunnel = new THREE.Mesh(tg, rockMat);
  tunnel.receiveShadow = true;
  g.add(tunnel);
  // пол: мокрая глина и щебень, поднимается к стенам, в низинах — лужи
  const FW = 11;
  const fgeo = new THREE.PlaneGeometry(FW, zA - zB, 110, Math.round((zA - zB) / 0.1)).rotateX(-Math.PI / 2);
  const fp = fgeo.getAttribute("position") as THREE.BufferAttribute;
  const fz0 = (zA + zB) / 2;
  for (let i = 0; i < fp.count; i++) {
    const z = fp.getZ(i) + fz0;
    const x = fp.getX(i) + caveXc(z);
    fp.setXYZ(i, x, caveFloor(x, z), z);
  }
  fgeo.computeVertexNormals();
  const wet = new Float32Array(fp.count * 3);
  for (let i = 0; i < fp.count; i++) {
    const k = 1 - 0.5 * sstep(0.045, 0.004, fp.getY(i)); // мокрая глина у луж темнее
    wet[i * 3] = wet[i * 3 + 1] = wet[i * 3 + 2] = k;
  }
  fgeo.setAttribute("color", new THREE.BufferAttribute(wet, 3));
  const fuv = fgeo.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < fuv.count; i++) fuv.setXY(i, fp.getX(i) / 4.5, fp.getZ(i) / 4.5);
  const floor = new THREE.Mesh(fgeo, std({map: rockTex(), normalMap: rockNormal(), normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: mudRough(), roughness: 1, color: "#8A8074", vertexColors: true}));
  floor.receiveShadow = true;
  g.add(floor);
  // лужи: зеркало на y = 0 видно только там, где пол ниже
  const water = makeReflector(new THREE.PlaneGeometry(FW + 2, zA - zB), {opacity: 1.0, blur: 1.2, additive: false, tint: "#AFC0CE", base: "#18202A"});
  water.position.set(caveXc(fz0), 0.0, fz0);
  g.add(water);
  // осыпь: валуны у стен и галька
  const geos = [rockGeo(1.3), rockGeo(7.7), rockGeo(13.1)];
  const rocks: Inst[][] = [[], [], []];
  const cloudRocks: {p: V3; s: V3; rot: V3; v: number}[] = [];
  for (let k = 0; k < 360; k++) {
    const z = zA - 1 - r() * (zA - zB - 2);
    const big = k < 110;
    const side = r() < 0.5 ? -1 : 1;
    const a = big ? (side > 0 ? 3.55 + r() * 0.9 : 1.5 + r() * 2.8) : 0.55 + r() * 3.2;
    const x = caveXc(z) + side * a;
    const fy = caveFloor(x, z);
    if (!big && fy < 0.01) continue;
    const sc = big ? 0.22 + r() * 0.7 : 0.035 + r() * 0.12;
    const s: V3 = [sc * (0.8 + r() * 0.6), sc * (0.55 + r() * 0.5), sc * (0.8 + r() * 0.6)];
    const rot: V3 = [r() * 0.5, r() * 6.28, r() * 0.5];
    const v = k % 3;
    const p: V3 = [x, fy + s[1] * 0.25, z];
    const tone = 0.75 + r() * 0.35;
    rocks[v].push({p, s, rot, c: new THREE.Color("#B8AC9E").multiplyScalar(tone)});
    if (big) CAVE_BLOCKERS.push({p: new THREE.Vector3(...p), r: Math.max(...s) * 1.4});
    if (big || sc > 0.08) cloudRocks.push({p, s, rot, v});
  }
  const rmat = std({map: rockTex(), normalMap: rockNormal(), normalScale: new THREE.Vector2(1, 1), roughnessMap: rockRough(), roughness: 1, color: "#ffffff"});
  geos.forEach((gg, i) => g.add(instanced(gg, rmat, rocks[i], true, true)));
  // сталактиты со свода и сталагмиты у стен — мокрые, блестят в свете фары
  const sg = stalGeo();
  const stal: Inst[] = [];
  for (let k = 0; k < 120; k++) {
    const z = zA - 1 - r() * (zA - zB - 2);
    const a = 0.7 + r() * (Math.PI - 1.4);
    const rho = caveRho(a, z) - 0.06;
    const x = caveXc(z) + Math.cos(a) * rho;
    const y = CAVE.cy + Math.sin(a) * rho;
    const rad = 0.05 + Math.pow(r(), 2) * 0.2;
    stal.push({p: [x, y + 0.08, z], s: [rad, rad * (5 + r() * 4), rad], rot: [0, r() * 6.28, 0], c: new THREE.Color("#D5CCBF").multiplyScalar(0.8 + r() * 0.3)});
  }
  for (let k = 0; k < 26; k++) {
    const z = zA - 1 - r() * (zA - zB - 2);
    const side = r() < 0.5 ? -1 : 1;
    const x = caveXc(z) + side * (side > 0 ? 3.5 + r() * 0.6 : 1.9 + r() * 1.3); // справа ходит камера — сталагмиты только у самой стены
    const rad = 0.07 + r() * 0.16;
    const len = rad * (3 + r() * 4);
    stal.push({p: [x, caveFloor(x, z) - 0.05, z], s: [rad, -len, rad], rot: [0, r() * 6.28, 0], c: new THREE.Color("#C9BFB2").multiplyScalar(0.8 + r() * 0.3)});
    CAVE_BLOCKERS.push({p: new THREE.Vector3(x, caveFloor(x, z) + len / 2, z), r: Math.max(rad * 1.5, len / 2)});
  }
  const smat = std({map: rockTex(), normalMap: rockNormal(), roughness: 0.42, metalness: 0.05, color: "#ffffff"});
  g.add(instanced(sg, smat, stal, true, true));

  // облако точек: стены (треугольники тоннеля по площади), пол, камни, сталактиты
  const pts: number[] = [];
  const occ: number[] = [];
  const pr = rng(4242);
  const DWALL = 330 * density;
  const DFLOOR = 190 * density;
  const ZP0 = 12.5;
  const ZP1 = -14;
  const triSample = (geo: THREE.BufferGeometry, M: THREE.Matrix4 | null, dens: number, pick: (c: THREE.Vector3) => boolean, inward: (p: THREE.Vector3, n: THREE.Vector3) => void, isOcc: number) => {
    const P = geo.getAttribute("position") as THREE.BufferAttribute;
    const I = geo.getIndex();
    const nt = I ? I.count / 3 : P.count / 3;
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    const Cc = new THREE.Vector3();
    const n = new THREE.Vector3();
    const q = new THREE.Vector3();
    for (let t = 0; t < nt; t++) {
      const ia = I ? I.getX(t * 3) : t * 3;
      const ib = I ? I.getX(t * 3 + 1) : t * 3 + 1;
      const ic = I ? I.getX(t * 3 + 2) : t * 3 + 2;
      A.fromBufferAttribute(P, ia);
      B.fromBufferAttribute(P, ib);
      Cc.fromBufferAttribute(P, ic);
      if (M) {
        A.applyMatrix4(M);
        B.applyMatrix4(M);
        Cc.applyMatrix4(M);
      }
      q.copy(A).add(B).add(Cc).multiplyScalar(1 / 3);
      if (!pick(q)) continue;
      n.subVectors(B, A).cross(q.subVectors(Cc, A));
      const area = n.length() / 2;
      n.normalize();
      const exp = area * dens;
      let cnt = Math.floor(exp);
      if (pr() < exp - cnt) cnt++;
      for (let k = 0; k < cnt; k++) {
        let u = pr();
        let v = pr();
        if (u + v > 1) {
          u = 1 - u;
          v = 1 - v;
        }
        const p = new THREE.Vector3().copy(A).addScaledVector(B.clone().sub(A), u).addScaledVector(Cc.clone().sub(A), v);
        const nn = n.clone();
        inward(p, nn);
        p.addScaledVector(nn, 0.025);
        if (Math.abs(nn.y) < 0.55) p.y = rowY(p.y, pr());
        pts.push(p.x, p.y, p.z);
        occ.push(isOcc);
      }
    }
  };
  triSample(
    tg,
    null,
    DWALL,
    (c) => c.z < ZP0 && c.z > ZP1 && c.y > caveFloor(c.x, c.z) - 0.02,
    (p, n) => {
      const toC = new THREE.Vector3(caveXc(p.z) - p.x, CAVE.cy - p.y, 0);
      if (n.dot(toC) < 0) n.negate();
    },
    1,
  );
  triSample(fgeo, null, DFLOOR, (c) => c.z < ZP0 && c.z > ZP1 && Math.abs(c.x - caveXc(c.z)) < 3.4, (p, n) => {
    if (n.y < 0) n.negate();
    if (p.y < 0) p.y = 0.0;
  }, 0);
  const M = new THREE.Matrix4();
  for (const cr of cloudRocks) {
    if (cr.p[2] > ZP0 || cr.p[2] < ZP1) continue;
    M.compose(new THREE.Vector3(...cr.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...cr.rot)), new THREE.Vector3(...cr.s));
    triSample(geos[cr.v], M, DWALL, () => true, (p, n) => {
      if (n.dot(new THREE.Vector3(p.x - cr.p[0], p.y - cr.p[1], p.z - cr.p[2])) < 0) n.negate();
    }, 1);
  }
  for (const st of stal) {
    if (st.p[2] > ZP0 || st.p[2] < ZP1 || (st.s as V3)[1] < 0) continue;
    M.compose(new THREE.Vector3(...st.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(st.rot as V3))), new THREE.Vector3(...(st.s as V3)));
    triSample(sg, M, DWALL, () => true, (p, n) => {
      if (n.dot(new THREE.Vector3(p.x - st.p[0], 0, p.z - st.p[2])) < 0) n.negate();
    }, 1);
  }
  // туман у пола: полупрозрачные клочья, светятся в луче фары
  const mist: THREE.Mesh[] = [];
  const mm = mistTex();
  for (let k = 0; k < 18; k++) {
    const z = 9 - k * 1.25 + (r() - 0.5);
    const w = 3 + r() * 3;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w * 0.32),
      patchWipe(new THREE.MeshLambertMaterial({color: "#B9C6D2", map: mm, transparent: true, opacity: 0.16 + r() * 0.12, depthWrite: false, emissive: new THREE.Color("#141a20"), side: THREE.DoubleSide})),
    );
    m.position.set(caveXc(z) + (r() - 0.5) * 3.2, 0.25 + r() * 0.55, z);
    m.userData.drift = r() * 6.28;
    m.userData.x0 = m.position.x;
    m.renderOrder = 3;
    mist.push(m);
    g.add(m);
  }
  return {group: g, P: new Float32Array(pts), occ: new Uint8Array(occ), mist};
};

// ---------- отражатель (зеркало пола / лужи) ----------
const makeReflector = (geo: THREE.BufferGeometry, o: {opacity: number; blur: number; additive: boolean; tint: string; base?: string; res?: number}) => {
  const shader = {
    name: "DarkReflector",
    uniforms: {
      color: {value: null},
      tDiffuse: {value: null},
      textureMatrix: {value: null},
      uOpacity: {value: o.opacity},
      uBlur: {value: o.blur},
      uTint: {value: new THREE.Color(o.tint)},
      uBase: {value: new THREE.Color(o.base ?? "#000000")},
      uWO: WIPE.uWO,
      uR1: WIPE.uR1,
      uR2: WIPE.uR2,
      uDim: WIPE.uDim,
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 vUv;
      varying vec3 vWipeP;
      varying vec3 vView;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main() {
        vUv = textureMatrix * vec4(position, 1.0);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWipeP = wp.xyz;
        vView = cameraPosition - wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uOpacity;
      uniform float uBlur;
      uniform vec3 uTint;
      uniform vec3 uBase;
      uniform vec3 uWO;
      uniform float uR1;
      uniform float uR2;
      uniform float uDim;
      varying vec4 vUv;
      varying vec3 vWipeP;
      varying vec3 vView;
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        vec2 uv = vUv.xy / vUv.w;
        vec2 px = uBlur / vec2(textureSize(tDiffuse, 0));
        vec3 c = texture2D(tDiffuse, uv).rgb * 0.28;
        c += texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb * 0.12;
        c += texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb * 0.12;
        c += texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb * 0.12;
        c += texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb * 0.12;
        c += texture2D(tDiffuse, uv + px).rgb * 0.06;
        c += texture2D(tDiffuse, uv - px).rgb * 0.06;
        c += texture2D(tDiffuse, uv + vec2(px.x, -px.y)).rgb * 0.06;
        c += texture2D(tDiffuse, uv + vec2(-px.x, px.y)).rgb * 0.06;
        float fres = 0.45 + 0.55 * pow(1.0 - clamp(normalize(vView).y, 0.0, 1.0), 2.0);
        gl_FragColor = vec4(uBase + c * uTint * uOpacity * fres, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        ${WIPE_GLSL}
      }`,
  };
  const res = o.res ?? 1;
  const m = new Reflector(geo, {textureWidth: Math.round(540 * res), textureHeight: Math.round(960 * res), clipBias: 0.003, multisample: 0, shader});
  const mat = m.material as THREE.ShaderMaterial;
  for (const k of ["uWO", "uR1", "uR2", "uDim"] as const) mat.uniforms[k] = WIPE[k];
  if (o.additive) {
    mat.transparent = true;
    mat.blending = THREE.AdditiveBlending;
    mat.depthWrite = false;
  }
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
};

// ---------- облако точек ----------
// точки на вертикальных поверхностях ложатся строками, как следы каналов лидара
const ROW = 0.055;
const rowY = (y: number, r: number) => Math.round(y / ROW) * ROW + (r - 0.5) * 0.008;
const sampleSurfs = (surfs: Surf[]) => {
  const pr = rng(9001);
  const pts: number[] = [];
  const occ: number[] = [];
  for (const S of surfs) {
    if (S.d < 0) {
      // готовая точка (бочки)
      pts.push(S.o[0] + S.n[0] * 0.02, S.o[1], S.o[2] + S.n[2] * 0.02);
      occ.push(1);
      continue;
    }
    const la = Math.hypot(...S.a);
    const lb = Math.hypot(...S.b);
    const exp = la * lb * S.d;
    let n = Math.floor(exp);
    if (pr() < exp - n) n++;
    const isFloor = S.n[1] > 0.9 && S.o[1] < 0.01 ? 1 : 0;
    for (let k = 0; k < n; k++) {
      const u = pr();
      const v = pr();
      let y = S.o[1] + S.a[1] * u + S.b[1] * v + S.n[1] * 0.012;
      if (Math.abs(S.n[1]) < 0.3) y = rowY(y, pr()); // строки сканирования
      pts.push(S.o[0] + S.a[0] * u + S.b[0] * v + S.n[0] * 0.025, y, S.o[2] + S.a[2] * u + S.b[2] * v + S.n[2] * 0.025);
      occ.push(isFloor ? 0 : 1);
    }
  }
  return {P: new Float32Array(pts), occ: new Uint8Array(occ)};
};

// лидар в мире в момент t: точка купола и курс
export const lidarWorld = (plan: DogPlan, t: number) => {
  const P = dogPose(plan, t);
  const M = dogBodyMatrix(P);
  const o = new THREE.Vector3(...LIDAR_LOCAL).applyMatrix4(M);
  return {o, yaw: P.yaw, pose: P, M};
};

// когда луч лидара впервые прошёл по точке: точка попала в дальность → ждёт, пока веер повернётся к ней
const revealTimes = (P: Float32Array, plan: DogPlan, R: number) => {
  const dt = 1 / 30;
  const N = Math.round((T1 - T0) / dt);
  const LX = new Float32Array(N);
  const LY = new Float32Array(N);
  const LZ = new Float32Array(N);
  const TH = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const t = T0 + k * dt;
    const L = lidarWorld(plan, t);
    LX[k] = L.o.x;
    LY[k] = L.o.y;
    LZ[k] = L.o.z;
    TH[k] = L.yaw + lidarAngle(t);
  }
  const n = P.length / 3;
  const out = new Float32Array(n).fill(1e9);
  const R2 = R * R;
  const TAU = Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const x = P[i * 3];
    const y = P[i * 3 + 1];
    const z = P[i * 3 + 2];
    for (let k = 0; k < N; k++) {
      const dx = x - LX[k];
      const dz = z - LZ[k];
      const dy = y - LY[k];
      const d2 = dx * dx + dz * dz + dy * dy;
      if (d2 > R2) continue;
      if (dy > Math.sqrt(dx * dx + dz * dz) * 1.9) continue; // выше конуса обзора
      const bearing = Math.atan2(-dz, dx);
      const rel = (((bearing - TH[k]) % TAU) + TAU) % TAU;
      out[i] = T0 + k * dt + rel / (TAU * LIDAR_HZ);
      break;
    }
  }
  return out;
};

// ---------- мир целиком (кэш на вкладку) ----------
export type DarkWorldData = {
  kind: DarkKind;
  group: THREE.Group;
  P: Float32Array;
  occ: Uint8Array;
  reveal: Float32Array;
  plan: DogPlan;
  hit: (o: THREE.Vector3, d: THREE.Vector3, R: number) => number;
  mist: THREE.Mesh[];
  grid: {x0: number; z0: number; cs: number; nx: number; nz: number; occT: Float32Array; freeT: Float32Array};
  dust: {min: V3; max: V3};
};
const WORLDS = new Map<string, DarkWorldData>();
export const darkWorld = (kind: DarkKind, density = 1): DarkWorldData => {
  const key = `${kind}:${density}`;
  const hit = WORLDS.get(key);
  if (hit) return hit;
  const plan: DogPlan = {stays: [{at: 0, x: 0, z: 0}], path: kind === "warehouse" ? whPath : cavePath};
  let group: THREE.Group;
  let P: Float32Array;
  let occ: Uint8Array;
  let mist: THREE.Mesh[] = [];
  if (kind === "warehouse") {
    const w = buildWarehouse(density);
    group = w.group;
    ({P, occ} = sampleSurfs(w.surfs));
  } else {
    const c = buildCave(density);
    group = c.group;
    P = c.P;
    occ = c.occ;
    mist = c.mist;
  }
  const reveal = revealTimes(P, plan, LIDAR_R);
  // сетка карты SLAM: занято (стены, стеллажи) и свободно (пол) — когда клетка впервые увидена
  const cs = 0.25;
  const x0 = -8;
  const z0 = -20;
  const nx = Math.round(16 / cs);
  const nz = Math.round(40 / cs);
  const occT = new Float32Array(nx * nz).fill(1e9);
  const freeT = new Float32Array(nx * nz).fill(1e9);
  for (let i = 0; i < reveal.length; i++) {
    const cx = Math.floor((P[i * 3] - x0) / cs);
    const cz = Math.floor((P[i * 3 + 2] - z0) / cs);
    if (cx < 0 || cz < 0 || cx >= nx || cz >= nz) continue;
    const arr = occ[i] && P[i * 3 + 1] < 3.2 ? occT : freeT;
    if (!occ[i] || P[i * 3 + 1] < 3.2) arr[cz * nx + cx] = Math.min(arr[cz * nx + cx], reveal[i]);
  }
  const d: DarkWorldData = {
    kind,
    group,
    P,
    occ,
    reveal,
    plan,
    hit: kind === "warehouse" ? whHit : caveHit,
    mist,
    grid: {x0, z0, cs, nx, nz, occT, freeT},
    dust: kind === "warehouse" ? {min: [-3.1, 0.05, -10], max: [3.1, 4, 9]} : {min: [-4, 0.05, -10], max: [4, 3.4, 9]},
  };
  WORLDS.set(key, d);
  return d;
};

// ---------- волны и «вид робота» по времени ----------
export type Waves = [number, number][]; // [начало перехода к «виду робота», начало возврата]
export const DEFAULT_WAVES: Waves = [[2.5, 4.9]];
const WAVE_T = 1.0; // волна расходится за 1 с
const WAVE_R = 46;
export const waveState = (t: number, waves: Waves | false, look?: "lit" | "robot") => {
  if (look === "lit") return {r1: -1, r2: -1, robot: 0};
  if (look === "robot") return {r1: 1e4, r2: -1, robot: 1};
  let r1 = -1;
  let r2 = -1;
  let robot = 0;
  for (const [a, b] of waves || []) {
    if (t < a) continue;
    const e1 = clamp01((t - a) / WAVE_T);
    r1 = e1 >= 1 ? 1e4 : WAVE_R * Math.pow(e1, 1.35);
    robot = Math.max(robot, sstep(0, 0.75, e1));
    if (t >= b) {
      const e2 = clamp01((t - b) / WAVE_T);
      r2 = e2 >= 1 ? 1e4 : WAVE_R * Math.pow(e2, 1.35);
      robot = Math.min(robot, 1 - sstep(0.1, 0.85, e2));
      if (e2 >= 1) {
        r1 = -1;
        r2 = -1;
      }
    }
  }
  return {r1, r2, robot};
};

// ---------- камера: медленный облёт собаки (¾ спереди → сбоку → ¾ сзади) ----------
export const darkCam = (kind: DarkKind, t: number, plan: DogPlan) => {
  const P = dogPose(plan, t);
  const yaw = P.yaw;
  const f = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const rr = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const e = smooth(clamp01((t + 0.3) / 7.6));
  const phi = 0.42 + e * 2.24; // 24° (¾ спереди) → 152° (¾ сзади), сбоку проходит быстро
  const sp = Math.abs(Math.sin(phi));
  const cp = Math.abs(Math.cos(phi));
  const dog = new THREE.Vector3(P.root[0], 0, P.root[2]);
  // камера справа от собаки и не дальше прохода (склад) / стены тоннеля (пещера)
  const lat = kind === "warehouse" ? WH.aisle - 0.45 - dog.x : caveW(dog.z) - 1.2 - (dog.x - caveXc(dog.z));
  const dist = Math.min(4.05 + 0.2 * sp, lat / Math.max(0.2, sp));
  const h = kind === "cave" ? 1.05 + 0.35 * e : 1.35 + 0.4 * e; // в пещере ниже — виден свод со сталактитами
  const pos = dog.clone().addScaledVector(f, Math.cos(phi) * dist).addScaledVector(rr, Math.sin(phi) * dist);
  pos.y = h;
  if (kind === "cave") {
    pos.y = Math.max(pos.y, caveFloor(pos.x, pos.z) + 0.75);
    // между камерой и собакой — ни стены, ни камня: иначе камера подходит ближе
    const tg = new THREE.Vector3(dog.x, 0.55, dog.z);
    const q = new THREE.Vector3();
    for (let it = 0; it < 14; it++) {
      let ok = true;
      for (let k = 0.15; k <= 1.0001 && ok; k += 0.085) ok = caveClear(q.lerpVectors(tg, pos, k)) && caveClear(q.set(pos.x, pos.y + 0.35, pos.z));
      if (ok) break;
      const y = pos.y;
      pos.lerp(tg, 0.1);
      pos.y = y;
    }
  }
  // угол обзора — чтобы собака (длина ~1,45, ширина ~0,6) занимала ~70 % ширины кадра 9:16
  const need = (1.45 * sp + 0.6 * cp) / 0.7;
  const fh = 2 * Math.atan(need / (2 * Math.hypot(pos.x - dog.x, pos.z - dog.z)));
  const fov = Math.max(38, Math.min(62, (2 * Math.atan(Math.tan(fh / 2) / 0.5625) * 180) / Math.PI));
  const target = dog.clone().addScaledVector(f, 0.05 * Math.cos(phi));
  target.y = kind === "cave" ? 0.62 : 0.48;
  return {pos, target, fov, shift: 0.13};
};

// ---------- 3D-сцена (внутри ThreeCanvas) ----------
const RAYS = 18;
const HEMI: Record<DarkKind, number> = {warehouse: 0.42, cave: 0.95};
const BOUNCE: Record<DarkKind, number> = {warehouse: 3.6, cave: 20};
const ELEV = Array.from({length: RAYS}, (_, i) => {
  const u = i / (RAYS - 1);
  return -0.6 + 1.62 * Math.pow(u, 1.25); // от −34° до +58°, гуще у горизонта
});

const darkEnv = (gl: THREE.WebGLRenderer, kind: DarkKind) => {
  // тёмное окружение для отражений лака: чёрная «комната» с тусклыми холодными панелями сверху
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(kind === "cave" ? "#050506" : "#07090C");
  const pm = new THREE.MeshBasicMaterial({color: new THREE.Color(kind === "cave" ? "#2A2E33" : "#53647C")});
  for (let k = 0; k < 4; k++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 10), pm);
    m.position.set(-4.5 + k * 3, 8, 0);
    m.rotation.x = Math.PI / 2;
    sc.add(m);
  }
  const warm = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), new THREE.MeshBasicMaterial({color: new THREE.Color("#2B2618")}));
  warm.position.set(0, 1, -8);
  sc.add(warm);
  const gen = new THREE.PMREMGenerator(gl);
  const tex = gen.fromScene(sc, 0.04).texture;
  gen.dispose();
  return tex;
};

// луч: ярко у лидара, к концу гаснет, в точке попадания снова вспыхивает
const raysMat = new THREE.ShaderMaterial({
  uniforms: {uO: {value: 0.5}},
  vertexShader: `varying float vX; void main(){ vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uO; varying float vX; void main(){ float a = uO * (0.85 * pow(1.0 - vX, 1.6) + 0.12 + 0.9 * smoothstep(0.9, 1.0, vX)); gl_FragColor = vec4(vec3(1.0, 0.965, 0.42) * a, 1.0); }`,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

export const DarkWorldScene: React.FC<{world: DarkWorldData; t: number; waves: Waves | false; look?: "lit" | "robot"; pointScale?: number}> = ({world, t, waves, look, pointScale = 1}) => {
  const {gl, scene, camera, size, viewport} = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const kind = world.kind;

  // свет, лучи, частицы — создаются один раз
  const rig = useMemo(() => {
    const head = new THREE.SpotLight("#FFF0D2", 120, 30, 0.44, 0.7, 1.75);
    head.castShadow = true;
    head.shadow.mapSize.set(1024, 1024);
    head.shadow.camera.near = 0.15;
    head.shadow.camera.far = 30;
    head.shadow.bias = -0.0004;
    head.shadow.normalBias = 0.025;
    const rim = new THREE.SpotLight(kind === "cave" ? "#A8C0EE" : "#8FB6FF", kind === "cave" ? 36 : 46, 16, 0.62, 0.95, 1.6);
    rim.castShadow = true;
    rim.shadow.mapSize.set(1024, 1024);
    rim.shadow.camera.near = 0.3;
    rim.shadow.camera.far = 16;
    rim.shadow.bias = -0.0005;
    rim.shadow.normalBias = 0.02;
    const fill = new THREE.SpotLight("#D6DEE9", 9, 14, 0.3, 1, 2);
    const hemi = new THREE.HemisphereLight(kind === "cave" ? "#A39C92" : "#9AA6B6", kind === "cave" ? "#1D1813" : "#16181B", HEMI[kind]);
    const moon = new THREE.DirectionalLight("#B4C0D2", kind === "cave" ? 0 : 0.3);
    moon.position.set(3, 18, -6);
    // отражённый свет фары от пола и стен — мягкий тёплый «отскок» вокруг собаки (без него стены пещеры чёрные)
    const bounce = new THREE.PointLight("#FFE3BC", BOUNCE[kind], 18, 1.25);
    const g = new THREE.Group();
    g.add(head, head.target, rim, rim.target, fill, fill.target, hemi, moon, moon.target, bounce);

    // объёмный конус фары: мягкий к краям и по длине
    const coneMat = new THREE.ShaderMaterial({
      uniforms: {uI: {value: 0.32}, uColor: {value: new THREE.Color("#FFF1CF")}, uH: {value: 1}},
      vertexShader: `uniform float uH; varying float vAlong; varying vec3 vN; varying vec3 vV;
        void main(){ vAlong = 0.5 - position.y / uH; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uI; uniform vec3 uColor; varying float vAlong; varying vec3 vN; varying vec3 vV;
        void main(){ float e = abs(dot(normalize(vN), normalize(vV))); float a = pow(e, 2.4) * pow(1.0 - vAlong, 1.7) * smoothstep(0.0, 0.06, vAlong) * uI; gl_FragColor = vec4(uColor * a, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const coneLen = 7.5;
    const cones = [0.4, 0.24].map((ang, i) => {
      const geo = new THREE.ConeGeometry(Math.tan(ang) * coneLen, coneLen, 48, 1, true);
      const m = new THREE.Mesh(geo, i ? coneMat.clone() : coneMat);
      (m.material as THREE.ShaderMaterial).uniforms.uH.value = coneLen;
      (m.material as THREE.ShaderMaterial).uniforms.uI.value = i ? 0.22 : 0.3;
      m.renderOrder = 5;
      return m;
    });
    const coneG = new THREE.Group();
    cones.forEach((m) => {
      m.rotation.z = Math.PI / 2;
      m.position.x = coneLen / 2;
      coneG.add(m);
    });
    g.add(coneG);

    // лучи лидара, веер между ними и точки попадания
    const rays = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0, 0), raysMat, RAYS);
    rays.frustumCulled = false;
    rays.renderOrder = 6;
    g.add(rays);
    const fanGeo = new THREE.BufferGeometry();
    fanGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((RAYS - 1) * 9), 3));
    fanGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array((RAYS - 1) * 9), 3));
    const fan = new THREE.Mesh(fanGeo, new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}));
    fan.frustumCulled = false;
    fan.renderOrder = 6;
    g.add(fan);
    const hitsGeo = new THREE.BufferGeometry();
    hitsGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(RAYS * 3), 3));
    const hits = new THREE.Points(hitsGeo, new THREE.PointsMaterial({map: dotTex(), color: new THREE.Color("#FFFBD0"), size: 0.11, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}));
    hits.frustumCulled = false;
    hits.renderOrder = 7;
    g.add(hits);

    // пылинки: светятся только внутри конуса фары
    const DN = 7000;
    const dr = rng(3);
    const dp = new Float32Array(DN * 3);
    const ds = new Float32Array(DN);
    const {min, max} = world.dust;
    for (let i = 0; i < DN; i++) {
      dp[i * 3] = lerp(min[0], max[0], dr());
      dp[i * 3 + 1] = lerp(min[1], max[1], Math.pow(dr(), 1.3));
      dp[i * 3 + 2] = lerp(min[2], max[2], dr());
      ds[i] = dr();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    dustGeo.setAttribute("aS", new THREE.BufferAttribute(ds, 1));
    const dustMat = new THREE.ShaderMaterial({
      uniforms: {uTime: {value: 0}, uApex: {value: new THREE.Vector3()}, uDir: {value: new THREE.Vector3(1, 0, 0)}, uTan: {value: Math.tan(0.42)}, uLen: {value: 8}, uI: {value: 1}, uScale: {value: 1000}},
      vertexShader: `attribute float aS; uniform float uTime; uniform vec3 uApex; uniform vec3 uDir; uniform float uTan; uniform float uLen; uniform float uI; uniform float uScale; varying float vA;
        void main(){
          vec3 p = position + vec3(sin(uTime*0.37 + aS*41.0)*0.07, sin(uTime*0.21 + aS*17.0)*0.06 - mod(uTime*0.012 + aS, 1.0)*0.05, cos(uTime*0.29 + aS*23.0)*0.07);
          vec3 v = p - uApex; float al = dot(v, uDir); float rad = length(v - uDir*al); float cr = max(al, 0.0)*uTan;
          float inside = (al > 0.05 && al < uLen) ? (1.0 - smoothstep(cr*0.55, cr, rad)) * pow(1.0 - al/uLen, 1.3) : 0.0;
          vA = (inside * 1.5 + 0.035) * uI * (0.5 + aS);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(0.02 * uScale / -mv.z, 1.3, 7.0);
        }`,
      fragmentShader: `varying float vA; void main(){ vec2 q = gl_PointCoord*2.0-1.0; float r = dot(q,q); if (r > 1.0) discard; gl_FragColor = vec4(vec3(1.0, 0.95, 0.82) * vA * (1.0 - r), 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    dust.renderOrder = 4;
    g.add(dust);

    // облако точек: цвет по расстоянию до лидара, свежие вспыхивают
    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute("position", new THREE.BufferAttribute(world.P, 3));
    cloudGeo.setAttribute("aT", new THREE.BufferAttribute(world.reveal, 1));
    cloudGeo.setAttribute("aO", new THREE.BufferAttribute(Float32Array.from(world.occ), 1));
    const cloudMat = new THREE.ShaderMaterial({
      uniforms: {uTime: {value: 0}, uLidar: {value: new THREE.Vector3()}, uRobot: {value: 0}, uScale: {value: 1000}, uPx: {value: 1}, uK: {value: 1}},
      vertexShader: `attribute float aT; attribute float aO; uniform float uTime; uniform vec3 uLidar; uniform float uRobot; uniform float uScale; uniform float uPx; uniform float uK; varying vec3 vC; varying float vA;
        void main(){
          float age = uTime - aT;
          if (age < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
          float d = distance(position, uLidar);
          float k = clamp((d - 1.5) / 8.0, 0.0, 1.0);
          vec3 lemon = vec3(1.0, 0.965, 0.365); vec3 mid = vec3(0.3, 0.86, 1.0); vec3 blue = vec3(0.25, 0.42, 1.0);
          vec3 c = k < 0.28 ? lemon : k < 0.62 ? mix(lemon, mid, (k - 0.28) / 0.34) : mix(mid, blue, (k - 0.62) / 0.38);
          float fresh = exp(-age / 0.3);
          vC = mix(c, vec3(1.0), fresh * 0.7);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float far = smoothstep(42.0, 14.0, -mv.z);
          vA = (mix(0.62 * mix(0.55, 1.0, aO), mix(0.6, 1.0, aO), uRobot) + 1.4 * fresh) * far * uK;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(0.014 * uScale / -mv.z, 1.9 * uPx, 4.6 * uPx) * (1.0 + 0.9 * fresh + 0.75 * uRobot) * mix(0.8, 1.0, aO);
        }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 q = gl_PointCoord*2.0-1.0; float r = dot(q,q); if (r > 1.0) discard; gl_FragColor = vec4(vC * vA * (1.0 - r*r), 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const cloud = new THREE.Points(cloudGeo, cloudMat);
    cloud.frustumCulled = false;
    cloud.renderOrder = 8;
    g.add(cloud);
    // облако точек и лучи — на слое 1: в зеркале пола и лужах их нет (камера отражения видит только слой 0)
    for (const o of [cloud, rays, fan, dust]) o.layers.set(1);
    return {g, head, rim, fill, hemi, bounce, coneG, cones, rays, fan, hits, dust, dustMat, cloud, cloudMat};
  }, [world, kind]);

  // окружение, туман, тон — один раз
  useLayoutEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = kind === "cave" ? 1.25 : 1.15;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const env = darkEnv(gl, kind);
    scene.environment = env;
    scene.environmentIntensity = kind === "cave" ? 0.5 : 0.7;
    const fogC = new THREE.Color(kind === "cave" ? "#0A0C0F" : "#0D1116");
    scene.fog = new THREE.FogExp2(fogC, kind === "cave" ? 0.05 : 0.034);
    scene.background = fogC;
    return () => {
      env.dispose();
      scene.fog = null;
      scene.background = null;
    };
  }, [gl, scene, kind]);

  // --- кадр ---
  const L = lidarWorld(world.plan, t);
  const M = L.M;
  const C = darkCam(kind, t, world.plan);
  const W = waveState(t, waves, look);
  // камера
  cam.layers.enable(1);
  cam.position.copy(C.pos);
  cam.fov = C.fov;
  cam.near = 0.05;
  cam.far = 140;
  cam.lookAt(C.target);
  cam.setViewOffset(size.width, size.height, 0, -C.shift * size.height, size.width, size.height);
  cam.updateProjectionMatrix();
  const pxScale = (size.height * viewport.dpr) / (2 * Math.tan((C.fov * Math.PI) / 360));
  // фара
  const lens = new THREE.Vector3(...LENS_LOCAL).applyMatrix4(M);
  const dir = new THREE.Vector3(Math.cos(HEAD_PITCH), Math.sin(HEAD_PITCH), 0).transformDirection(M);
  rig.head.position.copy(lens);
  rig.head.target.position.copy(lens).addScaledVector(dir, 6);
  rig.head.intensity = 120 * (1 - 0.75 * W.robot);
  rig.coneG.position.copy(lens);
  rig.coneG.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  rig.cones.forEach((m, i) => ((m.material as THREE.ShaderMaterial).uniforms.uI.value = (i ? 0.26 : 0.4) * (1 - 0.85 * W.robot)));
  // контровой — сзади собаки (от камеры), заливка — от камеры
  const dog = new THREE.Vector3(L.pose.root[0], 0.5, L.pose.root[2]);
  const back = dog.clone().sub(new THREE.Vector3(C.pos.x, 0.5, C.pos.z)).setY(0).normalize();
  rig.rim.position.copy(dog).addScaledVector(back, 2.8).setY(3.1);
  rig.rim.target.position.copy(dog);
  const side = new THREE.Vector3(-back.z, 0, back.x);
  rig.fill.position.copy(C.pos).addScaledVector(side, -0.8).add(new THREE.Vector3(0, 0.9, 0));
  rig.fill.target.position.copy(dog);
  rig.fill.intensity = 9 * (1 - 0.3 * W.robot);
  rig.hemi.intensity = HEMI[kind] * (1 - 0.6 * W.robot);
  rig.bounce.position.copy(lens).addScaledVector(dir, 2.2).setY(kind === "cave" ? 2.4 : 2.0);
  rig.bounce.intensity = BOUNCE[kind] * (1 - 0.8 * W.robot);
  // пыль
  rig.dustMat.uniforms.uTime.value = t;
  rig.dustMat.uniforms.uApex.value.copy(lens);
  rig.dustMat.uniforms.uDir.value.copy(dir);
  rig.dustMat.uniforms.uScale.value = pxScale;
  rig.dustMat.uniforms.uI.value = 1 - 0.85 * W.robot;
  // облако
  rig.cloudMat.uniforms.uTime.value = t;
  rig.cloudMat.uniforms.uLidar.value.copy(L.o);
  rig.cloudMat.uniforms.uRobot.value = W.robot;
  rig.cloudMat.uniforms.uScale.value = pxScale * pointScale;
  rig.cloudMat.uniforms.uPx.value = viewport.dpr * pointScale;
  // волна
  WIPE.uWO.value.copy(L.o);
  WIPE.uR1.value = W.r1;
  WIPE.uR2.value = W.r2;
  // веер лидара: вертикальный веер лучей, поворачивается; лучи упираются в стены/полки/пол
  const th = L.yaw + lidarAngle(t);
  const fanPos = rig.fan.geometry.getAttribute("position") as THREE.BufferAttribute;
  const fanCol = rig.fan.geometry.getAttribute("color") as THREE.BufferAttribute;
  const hitPos = rig.hits.geometry.getAttribute("position") as THREE.BufferAttribute;
  const ends: THREE.Vector3[] = [];
  const q = new THREE.Quaternion();
  for (let i = 0; i < RAYS; i++) {
    const e = ELEV[i];
    const d = new THREE.Vector3(Math.cos(e) * Math.cos(th), Math.sin(e), -Math.cos(e) * Math.sin(th));
    const len = world.hit(L.o, d, LIDAR_R);
    const end = L.o.clone().addScaledVector(d, len);
    ends.push(end);
    q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
    O3.position.copy(L.o);
    O3.quaternion.copy(q);
    O3.scale.set(len, 0.006, 0.006);
    O3.updateMatrix();
    rig.rays.setMatrixAt(i, O3.matrix);
    const far = len >= LIDAR_R - 0.01;
    hitPos.setXYZ(i, far ? 1e4 : end.x, far ? 1e4 : end.y, far ? 1e4 : end.z);
  }
  rig.rays.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < RAYS - 1; i++) {
    const v = [L.o, ends[i], ends[i + 1]];
    v.forEach((p, k) => {
      fanPos.setXYZ(i * 3 + k, p.x, p.y, p.z);
      const a = k === 0 ? 0.0045 : 0.0; // цвета вершин линейные: на выходе в sRGB они заметно ярче
      fanCol.setXYZ(i * 3 + k, a, a * 0.97, a * 0.4);
    });
  }
  fanPos.needsUpdate = true;
  fanCol.needsUpdate = true;
  hitPos.needsUpdate = true;
  raysMat.uniforms.uO.value = 0.5 + 0.3 * W.robot;
  // туман пещеры: клочья смотрят на камеру и медленно плывут
  for (const m of world.mist) {
    const dr = m.userData.drift as number;
    m.position.x = (m.userData.x0 as number) + 0.35 * Math.sin(t * 0.18 + dr);
    m.rotation.y = Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z);
    (m.material as THREE.MeshLambertMaterial).opacity = (0.16 + 0.1 * Math.sin(dr)) * (0.85 + 0.15 * Math.sin(t * 0.6 + dr)) * (1 - 0.7 * W.robot);
  }
  return (
    <>
      <primitive object={world.group} />
      <primitive object={rig.g} />
      <CastAll>
        <DogModel t={t} plan={world.plan}>
          <DogLights />
          <LidarWindow t={t} />
        </DogModel>
      </CastAll>
    </>
  );
};

// все меши собаки отбрасывают тени (кроме прозрачных: мягкая тень-пятно, ореолы)
const CastAll: React.FC<{children: React.ReactNode}> = ({children}) => {
  const ref = React.useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.Material;
      m.castShadow = !mat.transparent;
      m.receiveShadow = !mat.transparent;
    });
  });
  return <group ref={ref}>{children}</group>;
};

// фара (корпус, линза, ореол) и купол лидара с вращающимся окном — на корпусе собаки
const DogLights: React.FC = () => {
  const dot = dotTex();
  return (
    <>
      <group position={LENS_LOCAL} rotation={[0, 0, HEAD_PITCH]}>
        <mesh rotation={[0, 0, -Math.PI / 2]} position={[-0.012, 0, 0]}>
          <cylinderGeometry args={[0.046, 0.05, 0.04, 24]} />
          <meshPhysicalMaterial color="#1C1F23" metalness={0.6} roughness={0.25} clearcoat={1} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 2]} position={[0.01, 0, 0]}>
          <circleGeometry args={[0.038, 24]} />
          <meshBasicMaterial color="#FFF9E6" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <sprite position={[0.03, 0, 0]} scale={[0.42, 0.42, 1]} renderOrder={9}>
          <spriteMaterial map={dot} color="#FFF3D0" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
      <group position={LIDAR_LOCAL}>
        <sprite scale={[0.22, 0.22, 1]} renderOrder={9}>
          <spriteMaterial map={dot} color="#FFF65D" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
    </>
  );
};

// окно лидара (полоска, бегущая по куполу) — отдельно: угол в координатах корпуса = lidarAngle(t)
export const LidarWindow: React.FC<{t: number}> = ({t}) => (
  <group position={LIDAR_LOCAL} rotation={[0, lidarAngle(t), 0]}>
    <mesh position={[0.079, 0, 0]}>
      <boxGeometry args={[0.006, 0.05, 0.022]} />
      <meshBasicMaterial color="#FFF65D" toneMapped={false} />
    </mesh>
  </group>
);

// ---------- данные для HUD ----------
export const revealedCount = (w: DarkWorldData, t: number) => {
  let n = 0;
  const R = w.reveal;
  for (let i = 0; i < R.length; i++) if (R[i] <= t) n++;
  return n;
};
export const dogTrail = (w: DarkWorldData, t: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let u = T0; u <= t; u += 0.25) {
    const P = dogPose(w.plan, u);
    out.push([P.root[0], P.root[2]]);
  }
  return out;
};
export type {Pose};
