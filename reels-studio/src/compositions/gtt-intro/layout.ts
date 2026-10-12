// Раскладка надписи GLOBAL TECH TOUR для заставки: две строки «GLOBAL» / «TECH TOUR» (силуэт пирамиды —
// узкая строка сверху, широкая снизу), Unbounded 700. Позиции букв меряются в браузере уже загруженным шрифтом
// (с кернингом), поэтому осколки, кубики и чистая надпись совпадают до пикселя.
import {useEffect, useState} from "react";
import {continueRender, delayRender} from "remotion";
import {display} from "../../fonts";

export const LINES = ["GLOBAL", "TECH TOUR"];
export const FS = 124; // кегль: ширина «TECH TOUR» ≈ 890 px (безопасная зона по ширине — 952 px)
export const LINE_GAP = 1.13; // расстояние между базовыми линиями, в кеглях
export const TEXT_CY = 930; // центр блока надписи по вертикали (центр безопасной зоны Reels ≈ 895, кадра — 960)
export const PYR_Y = 905; // центр пирамиды за надписью

export type Glyph = {
  ch: string;
  i: number; // номер буквы по порядку (пробелы пропущены)
  line: number;
  x: number; // начало буквы (с кернингом)
  y: number; // базовая линия
  w: number;
  ink: {l: number; t: number; r: number; b: number}; // реальные границы «чернил» буквы, px кадра
};
export type Layout = {
  family: string;
  fs: number;
  glyphs: Glyph[];
  box: {l: number; t: number; r: number; b: number};
  capH: number;
  mask: {data: Uint8ClampedArray; x0: number; y0: number; w: number; h: number}; // растр букв (альфа)
};

const fontCss = (family: string) => `700 ${FS}px "${family}"`;

const measure = (family: string): Layout => {
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  g.font = fontCss(family);
  const capH = g.measureText("H").actualBoundingBoxAscent;
  const gap = FS * LINE_GAP;
  const blockH = capH + gap;
  const base0 = TEXT_CY - blockH / 2 + capH;
  const glyphs: Glyph[] = [];
  let k = 0;
  LINES.forEach((line, li) => {
    const lw = g.measureText(line).width;
    const x0 = 540 - lw / 2;
    const y = base0 + li * gap;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === " ") continue;
      const x = x0 + g.measureText(line.slice(0, j)).width;
      const m = g.measureText(ch);
      glyphs.push({
        ch,
        i: k++,
        line: li,
        x,
        y,
        w: m.width,
        ink: {l: x - m.actualBoundingBoxLeft, r: x + m.actualBoundingBoxRight, t: y - m.actualBoundingBoxAscent, b: y + m.actualBoundingBoxDescent},
      });
    }
  });
  const box = {
    l: Math.min(...glyphs.map((q) => q.ink.l)),
    r: Math.max(...glyphs.map((q) => q.ink.r)),
    t: Math.min(...glyphs.map((q) => q.ink.t)),
    b: Math.max(...glyphs.map((q) => q.ink.b)),
  };
  // растр надписи — для кубиков (какие клетки заняты) и для проверки, есть ли буква под осколком
  const x0 = Math.floor(box.l) - 4;
  const y0 = Math.floor(box.t) - 4;
  const w = Math.ceil(box.r - box.l) + 8;
  const h = Math.ceil(box.b - box.t) + 8;
  c.width = w;
  c.height = h;
  g.font = fontCss(family);
  g.fillStyle = "#000";
  glyphs.forEach((q) => g.fillText(q.ch, q.x - x0, q.y - y0));
  const data = g.getImageData(0, 0, w, h).data;
  const alpha = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3];
  return {family, fs: FS, glyphs, box, capH, mask: {data: alpha, x0, y0, w, h}};
};

// альфа надписи в точке кадра (0..255)
export const inkAt = (L: Layout, x: number, y: number) => {
  const {mask} = L;
  const ix = Math.round(x - mask.x0);
  const iy = Math.round(y - mask.y0);
  if (ix < 0 || iy < 0 || ix >= mask.w || iy >= mask.h) return 0;
  return mask.data[iy * mask.w + ix];
};

let cached: Layout | null = null;

// раскладка после загрузки шрифта (рендер ждёт её через delayRender)
export const useWordmarkLayout = (): Layout | null => {
  const [layout, setLayout] = useState<Layout | null>(cached);
  const [handle] = useState(() => (cached ? null : delayRender("GTT: шрифт надписи")));
  useEffect(() => {
    if (cached) {
      setLayout(cached);
      if (handle !== null) continueRender(handle);
      return;
    }
    let alive = true;
    (async () => {
      await display.waitUntilDone();
      await document.fonts.load(fontCss(display.fontFamily), "GLOBAL TECH TOUR");
      cached = measure(display.fontFamily);
      if (alive) setLayout(cached);
      if (handle !== null) continueRender(handle);
    })();
    return () => {
      alive = false;
    };
  }, [handle]);
  return layout;
};
