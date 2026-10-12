// Общие помощники заставки GTT: время, кривые, детерминированный случай.
// Всё считается от времени t (секунды, дробное) — так можно рисовать «под-кадры» для размытия в движении.

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, w: number) => a + (b - a) * w;
// доля пути по отрезку [a, b] (0 до начала, 1 после конца)
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / Math.max(1e-6, b - a));

export const smooth = (p: number) => {
  const q = clamp01(p);
  return q * q * (3 - 2 * q);
};
export const easeOutCubic = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
export const easeOutQuart = (p: number) => 1 - Math.pow(1 - clamp01(p), 4);
export const easeOutExpo = (p: number) => {
  const q = clamp01(p);
  return q >= 1 ? 1 : 1 - Math.pow(2, -10 * q);
};
export const easeInCubic = (p: number) => Math.pow(clamp01(p), 3);
export const easeInQuad = (p: number) => Math.pow(clamp01(p), 2);
export const easeInOutCubic = (p: number) => {
  const q = clamp01(p);
  return q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
};
// пружина с перелётом: 0 → 1 с затухающим колебанием (bounce — сила перелёта)
export const springOut = (p: number, bounce = 0.3) => {
  const q = clamp01(p);
  if (q >= 1) return 1;
  const k = 6.5;
  const w = Math.PI * (1.5 + bounce * 3);
  return 1 - Math.exp(-k * q) * Math.cos(w * q) * (1 - q) - 0 * bounce;
};

// детерминированный генератор (mulberry32): одинаковый результат на каждом рендере
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
