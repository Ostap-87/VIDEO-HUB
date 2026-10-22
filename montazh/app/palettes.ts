// Цвета текста: готовые сочетания (проверены на читаемость поверх видео) и проверка своих цветов.
// Палитра проекта идёт в props.palette (субтитры, акцент, текст на акценте), смена на отрезке — эффект «Цвета текста на отрезке».
import type {Brand} from "./types";

export type Pal = {id: string; title: string; text: string; accent: string; ink: string; second?: string; note: string; brands?: Brand[]};

export const PALETTES: Pal[] = [
  {id: "brand", title: "Как у бренда", text: "", accent: "", ink: "", note: "фирменные цвета бренда ролика"},
  {id: "blue", title: "Белый + синий", text: "#FFFFFF", accent: "#3D7BFF", ink: "#FFFFFF", second: "#BAE6FD", note: "деловой, как сайт GTT", brands: ["gtt"]},
  {id: "marker", title: "Белый + жёлтый маркер", text: "#FFFFFF", accent: "#FFD92E", ink: "#191922", second: "#FF4A1F", note: "яркий акцент, как ostapdotcenko", brands: ["od"]},
  {id: "lemon", title: "Белый + лимонный", text: "#FFFFFF", accent: "#FFF65D", ink: "#262626", second: "#F8F6F3", note: "мягкий, как Aura Robotics", brands: ["aura"]},
  {id: "coral", title: "Белый + коралловый", text: "#FFFFFF", accent: "#FF6B5E", ink: "#FFFFFF", second: "#FFD2C4", note: "тёплый, для эмоций и «вау»"},
  {id: "mint", title: "Белый + мятный", text: "#FFFFFF", accent: "#3CCF8E", ink: "#0B1F17", second: "#C7F5DF", note: "рост, деньги, «да»"},
  {id: "orange", title: "Кремовый + оранжевый", text: "#FFF4E0", accent: "#FF8A00", ink: "#1A1206", second: "#FFD8A8", note: "энергичный, для заводов и техники"},
  {id: "violet", title: "Белый + фиолетовый", text: "#FFFFFF", accent: "#A78BFA", ink: "#1A1033", second: "#E4DCFF", note: "технологии, ИИ"},
  {id: "ice", title: "Голубой лёд", text: "#E0F2FE", accent: "#38BDF8", ink: "#04263A", second: "#FFFFFF", note: "холодный, спокойный"},
  {id: "ink", title: "Чернила + жёлтый (светлый кадр)", text: "#191922", accent: "#FFD92E", ink: "#191922", second: "#FF4A1F", note: "для светлого фона и белых стен"},
];

// цвета для быстрого выбора в полях «Цвет»
export const SWATCHES = ["#FFFFFF", "#191922", "#FFD92E", "#FFF65D", "#3D7BFF", "#38BDF8", "#FF4A1F", "#FF6B5E", "#3CCF8E", "#FF8A00", "#A78BFA", "#F8F6F3"];

const rgb = (hex: string) => {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
};
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const hue = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx === mn) return -1; // серый
  const d = mx - mn;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

// подсказка по своим цветам: читается ли на видео, сочетаются ли цвета между собой
export function advise(text: string, accent: string, ink: string): {ok: boolean; lines: string[]} {
  const lines: string[] = [];
  let ok = true;
  const onDark = contrast(text, "#20242a");
  const onLight = contrast(text, "#d8d8d8");
  if (onDark < 3 && onLight < 3) {
    ok = false;
    lines.push("Цвет субтитров плохо читается и на тёмном, и на светлом кадре — возьмите белый, кремовый или чернильный.");
  } else lines.push(onDark >= onLight ? "Субтитры читаются на тёмном и среднем кадре (на светлой стене — хуже)." : "Субтитры для светлого кадра — на тёмном будут теряться.");
  const ci = contrast(accent, ink);
  if (ci < 4.5) {
    ok = false;
    lines.push(`Текст на акценте читается слабо (контраст ${ci.toFixed(1)} : 1) — сделайте его ${lum(accent) > 0.4 ? "тёмным" : "белым"}.`);
  }
  const h1 = hue(text);
  const h2 = hue(accent);
  if (h1 >= 0 && h2 >= 0) {
    const d = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2));
    lines.push(d < 35 ? "Цвета родственные — спокойное сочетание." : d > 150 ? "Цвета противоположные — сильный контраст, акцент заметен." : d > 100 && d < 140 ? "Цвета через треть круга — живое сочетание." : "Сочетание между спокойным и контрастным.");
  } else lines.push("Нейтральный текст + цветной акцент — сочетается всегда.");
  if (contrast(text, accent) < 1.4) {
    ok = false;
    lines.push("Акцент почти не отличается от текста — выделенные слова не будут видны.");
  }
  return {ok, lines};
}
