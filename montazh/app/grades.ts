// Пресеты цветокоррекции — CSS-фильтры. Те же строки уходят в поле grade шаблона TalkReelPro, поэтому
// кадры в Монтажной, предпросмотр и готовый ролик выглядят одинаково. amount 0…1 — сила (смешивание с «как есть»).

export type Grade = {id: string; title: string; note: string; f: {b?: number; c?: number; s?: number; sep?: number; hue?: number; gray?: number}};

export const GRADES: Grade[] = [
  {id: "none", title: "Как снято", note: "без изменений", f: {}},
  {id: "natural", title: "Естественный", note: "чуть ярче и сочнее, тёплая кожа", f: {b: 1.04, c: 1.06, s: 1.14, sep: 0.06}},
  {id: "warm", title: "Тёплый", note: "вечерний свет, уют", f: {b: 1.03, c: 1.05, s: 1.1, sep: 0.2, hue: -6}},
  {id: "cool", title: "Холодный", note: "технологичный, свежий", f: {b: 1.02, c: 1.08, s: 0.95, hue: 12}},
  {id: "contrast", title: "Контраст", note: "плотные тени, яркий цвет", f: {b: 1.0, c: 1.22, s: 1.18}},
  {id: "cinema", title: "Кино", note: "приглушённый цвет, мягкий контраст", f: {b: 0.98, c: 1.12, s: 0.82, sep: 0.14}},
  {id: "bright", title: "Светлый", note: "для тёмных кадров", f: {b: 1.16, c: 0.96, s: 1.08}},
  {id: "pastel", title: "Пастель", note: "мягко, светло, для Stories", f: {b: 1.1, c: 0.88, s: 0.85}},
  {id: "bw", title: "Ч/Б", note: "чёрно-белый, плотный", f: {gray: 1, c: 1.18, b: 1.02}},
];

const mix = (v: number | undefined, base: number, k: number) => base + ((v ?? base) - base) * k;

export function gradeCss(id: string, amount = 1): string {
  const g = GRADES.find((x) => x.id === id);
  if (!g || id === "none" || amount <= 0) return "";
  const k = Math.max(0, Math.min(1.5, amount));
  const f = g.f;
  const parts = [
    `brightness(${mix(f.b, 1, k).toFixed(3)})`,
    `contrast(${mix(f.c, 1, k).toFixed(3)})`,
    `saturate(${mix(f.s, 1, k).toFixed(3)})`,
  ];
  if (f.sep) parts.push(`sepia(${(f.sep * k).toFixed(3)})`);
  if (f.hue) parts.push(`hue-rotate(${(f.hue * k).toFixed(1)}deg)`);
  if (f.gray) parts.push(`grayscale(${Math.min(1, f.gray * k).toFixed(3)})`);
  return parts.join(" ");
}
