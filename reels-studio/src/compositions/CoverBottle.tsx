// Обложка Reels «предмет-символ» — раскладки текста (пользователь 30.10.2026: «нравится вариант с бутылкой, но вот описание
// программы не видно, поиграй с расположением шрифтов… сами шрифты ок, только нужно, чтобы было понятно, что это программа
// тура»). Шрифты те же (Playfair, Inter, Unbounded), цвета GTT; в каждой раскладке — метка «Программа тура», название тура
// крупно, дни · компании · города. Картинка — gtt-bottle.jpg (бутылка в синей гамме): верх кадра до ~640 px и края по бокам
// свободны, низ — отражение (текст там только на плашке).
// Один кадр = одна раскладка: без variant кадр N рисует BOTTLE[N].
//  head    — шапка программы: метка, название тура крупно антиквой, крючок мелко, маршрут точками внизу;
//  plate   — крючок сверху, снизу большая стеклянная плашка программы: три крупные цифры и логотипы;
//  column  — бутылка справа, слева колонка-спецификация: название, цифры столбиком, логотипы;
//  callout — инфографика: цифры тура выносками с линиями к бутылке;
//  poster  — афиша в рамке: «Global Tech Tour представляет», огромное название тура внизу;
//  route   — молния из бутылки превращается в линию маршрута: города — узлы вверх до названия.
import React from "react";
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from "remotion";
import {z} from "zod";
import {loadFont as loadPlayfair} from "@remotion/google-fonts/PlayfairDisplay";
import {loadFont as loadInter} from "@remotion/google-fonts/Inter";
import {display} from "../fonts";
import brandsLib from "../../library/brands.json";

const playfair = loadPlayfair("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]});
const playfairI = loadPlayfair("italic", {weights: ["700"], subsets: ["cyrillic", "latin"]});
const inter = loadInter("normal", {weights: ["500", "600", "700", "800"], subsets: ["cyrillic", "latin"]});

export const BOTTLE = ["head", "plate", "column", "callout", "poster", "route"] as const;

export const coverBottleSchema = z.object({
  variant: z.enum(BOTTLE).optional(),
  label: z.string(), // «Программа тура»
  tour: z.string(), // «Переработка отходов Китая»
  tourLines: z.array(z.string()), // то же, по строкам для крупного набора
  hook: z.object({a: z.string(), b: z.string()}), // «Мусор» / «это топливо»
  fact: z.string(),
  route: z.array(z.string()),
  logos: z.array(z.string()),
  days: z.number(),
  companies: z.number(),
  cities: z.number(),
  photo: z.string(),
});
export type CoverBottleProps = z.infer<typeof coverBottleSchema>;

const SKY = "#7DD3FC";
const BLUE = "#2563EB";
const INK = "#17171D";
const SOFT = "#DCEBFF";
const LIB = brandsLib as Record<string, {logo?: string}>;
const logoSrc = (id: string) => (id.includes("/") ? id : LIB[id]?.logo ?? "");
const plural = (n: number, a: string, b: string, c: string) => {
  const m = n % 100;
  if (m >= 11 && m <= 14) return c;
  return n % 10 === 1 ? a : n % 10 >= 2 && n % 10 <= 4 ? b : c;
};
const nums = (p: CoverBottleProps): [number, string][] => [
  [p.days, plural(p.days, "день", "дня", "дней")],
  [p.companies, plural(p.companies, "компания", "компании", "компаний")],
  [p.cities, plural(p.cities, "город", "города", "городов")],
];
const metaLine = (p: CoverBottleProps) => nums(p).map(([n, w]) => `${n} ${w}`).join(" · ");

const Pyr: React.FC<{size?: number}> = ({size = 40}) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <path d="M24 6 L58 46 L8 54 Z" fill="#E0F2FE" />
    <path d="M24 6 L58 46 L36 40 Z" fill="#7DD3FC" />
    <path d="M24 6 L36 40 L8 54 Z" fill="#BAE6FD" />
  </svg>
);
const Mark: React.FC<{color?: string; size?: number; style?: React.CSSProperties}> = ({color = "#FFFFFF", size = 26, style}) => (
  <div style={{display: "flex", alignItems: "center", gap: 12, ...style}}>
    <Pyr size={size * 1.4} />
    <span style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: size, color}}>GLOBAL TECH TOUR</span>
  </div>
);
// метка «ПРОГРАММА ТУРА» — голубая пилюля
const Label: React.FC<{p: CoverBottleProps; style?: React.CSSProperties; solid?: boolean}> = ({p, style, solid}) => (
  <span style={{display: "inline-block", fontFamily: inter.fontFamily, fontWeight: 800, fontSize: 32, letterSpacing: "0.16em", textTransform: "uppercase", color: solid ? "#06164A" : SKY, background: solid ? SKY : "rgba(125,211,252,0.12)", border: `2px solid ${SKY}`, borderRadius: 999, padding: "10px 26px", ...style}}>
    {p.label}
  </span>
);
const LogoRow: React.FC<{logos: string[]; h?: number; style?: React.CSSProperties}> = ({logos, h = 56, style}) => (
  <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#FFFFFF", borderRadius: 22, padding: "14px 20px", ...style}}>
    {logos.slice(0, 6).map((id) => (
      <Img key={id} src={staticFile(logoSrc(id))} style={{maxHeight: h, maxWidth: 130, objectFit: "contain"}} />
    ))}
  </div>
);
const Bg: React.FC<{p: CoverBottleProps; shift?: number; scale?: number}> = ({p, shift = 0, scale = 1}) => (
  <Img src={staticFile(p.photo)} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", translate: `${shift}px 0`, scale: String(scale)}} />
);

// ——— 1. шапка программы ———
const Head: React.FC<{p: CoverBottleProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#020718"}}>
    <Bg p={p} />
    <div style={{position: "absolute", left: 50, right: 50, top: 250, textAlign: "center"}}>
      <Label p={p} />
      <div style={{fontFamily: playfair.fontFamily, fontWeight: 700, fontSize: 104, lineHeight: 1.02, color: "#FFFFFF", marginTop: 26}}>
        {p.tourLines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <div style={{fontFamily: playfairI.fontFamily, fontStyle: "italic", fontWeight: 700, fontSize: 60, color: SKY, marginTop: 14}}>
        {p.hook.a} — {p.hook.b}
      </div>
    </div>
    {/* внизу: маршрут точками и цифры */}
    <div style={{position: "absolute", left: 40, right: 40, top: 1440, background: "rgba(2,7,24,0.78)", border: "2px solid rgba(125,211,252,0.45)", borderRadius: 30, padding: "24px 30px"}}>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 800, fontSize: 40, color: "#FFFFFF", textAlign: "center"}}>{metaLine(p)}</div>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 30, color: SOFT, textAlign: "center", marginTop: 8}}>{p.route.join(" · ")}</div>
    </div>
  </AbsoluteFill>
);

// ——— 2. крючок сверху, большая плашка программы снизу ———
const Plate: React.FC<{p: CoverBottleProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#020718"}}>
    <Bg p={p} />
    <div style={{position: "absolute", left: 50, right: 50, top: 256, textAlign: "center"}}>
      <Mark style={{justifyContent: "center"}} />
      <div style={{fontFamily: playfair.fontFamily, fontWeight: 700, fontSize: 124, lineHeight: 1, color: "#FFFFFF", marginTop: 22}}>{p.hook.a}</div>
      <div style={{fontFamily: playfairI.fontFamily, fontStyle: "italic", fontWeight: 700, fontSize: 104, lineHeight: 1.05, color: SKY}}>{p.hook.b}</div>
    </div>
    <div style={{position: "absolute", left: 36, right: 36, top: 1170, background: "rgba(248,250,255,0.96)", borderRadius: 40, padding: "30px 34px 28px", boxShadow: "0 30px 70px rgba(2,7,24,0.6)"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <span style={{fontFamily: inter.fontFamily, fontWeight: 800, fontSize: 30, letterSpacing: "0.16em", color: BLUE}}>{p.label.toUpperCase()}</span>
        <span style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 30, color: "#6B6B76"}}>Китай</span>
      </div>
      <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 62, lineHeight: 1.06, color: INK, marginTop: 10}}>{p.tour}</div>
      <div style={{display: "flex", gap: 14, marginTop: 20}}>
        {nums(p).map(([n, w], i) => (
          <div key={i} style={{flex: "1 1 0", background: "#EAF1FF", borderRadius: 20, padding: "12px 18px"}}>
            <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 60, lineHeight: 1, color: BLUE}}>{n}</div>
            <div style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 30, color: INK}}>{w}</div>
          </div>
        ))}
      </div>
      <LogoRow logos={p.logos} h={52} style={{marginTop: 18, padding: "6px 4px"}} />
    </div>
  </AbsoluteFill>
);

// ——— 3. бутылка справа, слева колонка-спецификация ———
const Column: React.FC<{p: CoverBottleProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#020718"}}>
    <Bg p={p} shift={230} scale={1.08} />
    <div style={{position: "absolute", left: 56, top: 252, width: 560}}>
      <Mark size={24} />
      <Label p={p} style={{marginTop: 30}} solid />
      <div style={{fontFamily: playfair.fontFamily, fontWeight: 700, fontSize: 92, lineHeight: 1.02, color: "#FFFFFF", marginTop: 24}}>
        {p.tourLines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <div style={{width: 120, height: 5, background: SKY, margin: "30px 0 26px"}} />
      {nums(p).map(([n, w], i) => (
        <div key={i} style={{display: "flex", alignItems: "baseline", gap: 18, marginTop: i ? 12 : 0}}>
          <span style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 96, lineHeight: 1, color: SKY, width: 90}}>{n}</span>
          <span style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 44, color: "#FFFFFF"}}>{w}</span>
        </div>
      ))}
      <div style={{fontFamily: playfairI.fontFamily, fontStyle: "italic", fontWeight: 700, fontSize: 52, lineHeight: 1.1, color: SOFT, marginTop: 40}}>
        {p.hook.a} —<br />
        {p.hook.b}
      </div>
    </div>
  </AbsoluteFill>
);

// ——— 4. инфографика: цифры выносками к бутылке ———
const Callout: React.FC<{p: CoverBottleProps}> = ({p}) => {
  const items: {x: number; y: number; side: "l" | "r"; n: string; w: string; tx: number; ty: number}[] = [
    {x: 60, y: 760, side: "l", n: String(p.days), w: plural(p.days, "день", "дня", "дней"), tx: 470, ty: 900},
    {x: 690, y: 880, side: "r", n: String(p.companies), w: plural(p.companies, "компания", "компании", "компаний"), tx: 600, ty: 1040},
    {x: 60, y: 1150, side: "l", n: String(p.cities), w: plural(p.cities, "город", "города", "городов"), tx: 470, ty: 1250},
    {x: 690, y: 1230, side: "r", n: "1,6 млрд", w: "кВт·ч в год из мусора", tx: 600, ty: 1360},
  ];
  return (
    <AbsoluteFill style={{background: "#020718"}}>
      <Bg p={p} />
      <div style={{position: "absolute", left: 50, right: 50, top: 252, textAlign: "center"}}>
        <Label p={p} />
        <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 70, lineHeight: 1.06, color: "#FFFFFF", marginTop: 24}}>{p.tour}</div>
        <div style={{fontFamily: playfairI.fontFamily, fontStyle: "italic", fontWeight: 700, fontSize: 58, color: SKY, marginTop: 10}}>
          {p.hook.a} — {p.hook.b}
        </div>
      </div>
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
        {items.map((it, i) => {
          const sx = it.side === "l" ? it.x + 300 : it.x - 10;
          const sy = it.y + 60;
          return (
            <g key={i}>
              <path d={`M ${sx} ${sy} L ${it.tx} ${it.ty}`} stroke={SKY} strokeWidth="3" strokeDasharray="8 8" />
              <circle cx={it.tx} cy={it.ty} r="10" fill={SKY} />
            </g>
          );
        })}
      </svg>
      {items.map((it, i) => (
        <div key={i} style={{position: "absolute", left: it.x, top: it.y, width: 330, textAlign: it.side === "l" ? "left" : "left"}}>
          <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: it.n.length > 3 ? 56 : 90, lineHeight: 1, color: "#FFFFFF"}}>{it.n}</div>
          <div style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 34, lineHeight: 1.2, color: SKY, marginTop: 4}}>{it.w}</div>
        </div>
      ))}
      <Mark size={24} style={{position: "absolute", left: 0, right: 0, top: 1560, justifyContent: "center"}} />
    </AbsoluteFill>
  );
};

// ——— 5. афиша в рамке ———
const Poster: React.FC<{p: CoverBottleProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#020718"}}>
    <Bg p={p} />
    <div style={{position: "absolute", left: 34, right: 34, top: 230, bottom: 230, border: `3px solid ${SKY}`, borderRadius: 28}} />
    <div style={{position: "absolute", left: 0, right: 0, top: 270, textAlign: "center"}}>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 32, letterSpacing: "0.22em", color: SOFT}}>GLOBAL TECH TOUR ПРЕДСТАВЛЯЕТ</div>
      <div style={{fontFamily: playfairI.fontFamily, fontStyle: "italic", fontWeight: 700, fontSize: 92, lineHeight: 1.04, color: "#FFFFFF", marginTop: 26}}>
        «{p.hook.a} —
        <br />
        <span style={{color: SKY}}>{p.hook.b}»</span>
      </div>
    </div>
    <div style={{position: "absolute", left: 60, right: 60, top: 1220, background: "rgba(2,7,24,0.82)", borderRadius: 24, padding: "28px 30px 26px", textAlign: "center"}}>
      <Label p={p} solid />
      <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 70, lineHeight: 1.04, color: "#FFFFFF", marginTop: 18, textTransform: "uppercase"}}>
        {p.tourLines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 38, color: SKY, marginTop: 14}}>{metaLine(p)}</div>
    </div>
  </AbsoluteFill>
);

// ——— 6. молния → маршрут ———
const Route: React.FC<{p: CoverBottleProps}> = ({p}) => {
  const n = p.route.length;
  const y0 = 820; // от верха молнии
  const y1 = 600; // до названия
  const pts = p.route.map((c, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    return {c, x: 540 + (i % 2 ? 1 : -1) * (60 + 40 * t), y: y0 - (y0 - y1) * t};
  });
  return (
    <AbsoluteFill style={{background: "#020718"}}>
      <Bg p={p} />
      <div style={{position: "absolute", left: 50, right: 50, top: 252, textAlign: "center"}}>
        <Label p={p} />
        <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 68, lineHeight: 1.06, color: "#FFFFFF", marginTop: 22}}>{p.tour}</div>
        <div style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 36, color: SKY, marginTop: 10}}>{metaLine(p)}</div>
      </div>
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
        <polyline points={pts.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke={SKY} strokeWidth="5" strokeLinejoin="round" />
        {pts.map((q, i) => (
          <circle key={i} cx={q.x} cy={q.y} r="12" fill="#FFFFFF" stroke={SKY} strokeWidth="5" />
        ))}
      </svg>
      {pts.map((q, i) => (
        <div key={i} style={{position: "absolute", top: q.y - 24, ...(i % 2 ? {left: q.x + 30} : {right: 1080 - q.x + 30}), fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 36, color: "#FFFFFF", whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(2,7,24,0.9)"}}>
          {i + 1}. {q.c}
        </div>
      ))}
      <div style={{position: "absolute", left: 40, right: 40, top: 1460, textAlign: "center"}}>
        <div style={{display: "inline-block", background: "rgba(2,7,24,0.8)", border: "2px solid rgba(125,211,252,0.5)", borderRadius: 999, padding: "14px 34px", fontFamily: playfairI.fontFamily, fontStyle: "italic", fontWeight: 700, fontSize: 48, color: "#FFFFFF"}}>
          {p.hook.a} — <span style={{color: SKY}}>{p.hook.b}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CoverBottle: React.FC<CoverBottleProps> = (p) => {
  const frame = useCurrentFrame();
  const v = p.variant ?? BOTTLE[Math.min(frame, BOTTLE.length - 1)];
  const map: Record<(typeof BOTTLE)[number], React.FC<{p: CoverBottleProps}>> = {head: Head, plate: Plate, column: Column, callout: Callout, poster: Poster, route: Route};
  const C = map[v];
  return (
    <AbsoluteFill style={{fontFamily: inter.fontFamily}}>
      <C p={p} />
    </AbsoluteFill>
  );
};
