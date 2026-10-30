// Обложки Reels в цветах GTT (пользователь 30.10.2026: «мне нравятся вариант 1, 2 и 10 — но надо бы их подогнать под
// цветовой код нашего проекта ГТТ… сделай так, чтобы было читаемым»). Три выбранных стиля CoverLab — киноафиша, иероглифы
// тушью, предмет-символ — по два варианта: синий GTT (#2563EB, тёмно-синий, голубой акцент #7DD3FC) и светлый (фон #EEEEF2,
// текст #17171D). Фото перекрашены картой градиента в синюю гамму (gtt-*.jpg). Читаемость: заголовки от 110 px, подписи
// от 34 px, без тонких начертаний на фото, под текстом на фото — тёмно-синяя дымка.
// Один кадр = одна обложка: без variant кадр N рисует GTT[N].
import React from "react";
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from "remotion";
import {z} from "zod";
import {loadFont as loadOswald} from "@remotion/google-fonts/Oswald";
import {loadFont as loadPlayfair} from "@remotion/google-fonts/PlayfairDisplay";
import {loadFont as loadInter} from "@remotion/google-fonts/Inter";
import {display} from "../fonts";
import {BRUSH, useBrush} from "../components/MontazhFx";
import brandsLib from "../../library/brands.json";

const oswald = loadOswald("normal", {weights: ["500", "700"], subsets: ["cyrillic", "latin"]});
const playfair = loadPlayfair("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]});
const playfairI = loadPlayfair("italic", {weights: ["700"], subsets: ["cyrillic", "latin"]});
const inter = loadInter("normal", {weights: ["500", "600", "700", "800"], subsets: ["cyrillic", "latin"]});

export const GTT_VARIANTS = ["kinoBlue", "kinoLight", "hanziLight", "hanziBlue", "objectBlue", "objectBrand"] as const;

export const coverGttSchema = z.object({
  variant: z.enum(GTT_VARIANTS).optional(),
  tour: z.string(),
  hook: z.object({value: z.string(), unit: z.string(), where: z.string()}),
  title: z.object({a: z.string(), b: z.string()}), // «Энергия» / «из мусора»
  objectTitle: z.object({a: z.string(), b: z.string()}), // «Мусор» / «это топливо»
  fact: z.string(),
  hanzi: z.object({a: z.string(), b: z.string(), pa: z.string(), pb: z.string(), ru: z.string(), accent: z.string()}),
  logos: z.array(z.string()),
  days: z.number(),
  companies: z.number(),
  cities: z.number(),
  photos: z.object({kinoBlue: z.string(), kinoLight: z.string(), object: z.string()}),
});
export type CoverGttProps = z.infer<typeof coverGttSchema>;

const BLUE = "#2563EB";
const SKY = "#7DD3FC";
const INK = "#17171D";
const NAVY = "#06164A";
const LIB = brandsLib as Record<string, {logo?: string}>;
const logoSrc = (id: string) => (id.includes("/") ? id : LIB[id]?.logo ?? "");
const plural = (n: number, a: string, b: string, c: string) => {
  const m = n % 100;
  if (m >= 11 && m <= 14) return c;
  return n % 10 === 1 ? a : n % 10 >= 2 && n % 10 <= 4 ? b : c;
};
const meta = (p: CoverGttProps) =>
  `${p.days} ${plural(p.days, "день", "дня", "дней")} · ${p.companies} ${plural(p.companies, "компания", "компании", "компаний")} · ${p.cities} ${plural(p.cities, "город", "города", "городов")}`;
const full: React.CSSProperties = {position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"};

const Pyr: React.FC<{size?: number}> = ({size = 40}) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <path d="M24 6 L58 46 L8 54 Z" fill="#E0F2FE" />
    <path d="M24 6 L58 46 L36 40 Z" fill="#7DD3FC" />
    <path d="M24 6 L36 40 L8 54 Z" fill="#BAE6FD" />
  </svg>
);
// знак как на сайте: пирамида + GLOBAL TECH TOUR шрифтом Unbounded
const Mark: React.FC<{color: string; size?: number; style?: React.CSSProperties}> = ({color, size = 30, style}) => (
  <div style={{display: "flex", alignItems: "center", gap: 14, ...style}}>
    <Pyr size={size * 1.4} />
    <span style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: size, color}}>GLOBAL TECH TOUR</span>
  </div>
);
const Logos: React.FC<{logos: string[]; style?: React.CSSProperties}> = ({logos, style}) => (
  <div style={{display: "flex", alignItems: "center", justifyContent: "space-around", gap: 10, background: "#FFFFFF", borderRadius: 26, padding: "16px 22px", boxShadow: "0 16px 40px rgba(6,22,74,0.35)", ...style}}>
    {logos.slice(0, 6).map((id) => (
      <Img key={id} src={staticFile(logoSrc(id))} style={{maxHeight: 62, maxWidth: 140, objectFit: "contain"}} />
    ))}
  </div>
);
const Grain: React.FC<{opacity?: number}> = ({opacity = 0.14}) => (
  <svg width={1080} height={1920} style={{position: "absolute", inset: 0, opacity, mixBlendMode: "overlay", pointerEvents: "none"}}>
    <filter id="gg">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="1080" height="1920" filter="url(#gg)" />
  </svg>
);

// ——— киноафиша, синяя: фото в синей гамме, тёмно-синяя дымка сверху и снизу ———
const KinoBlue: React.FC<{p: CoverGttProps}> = ({p}) => (
  <AbsoluteFill style={{background: NAVY}}>
    <Img src={staticFile(p.photos.kinoBlue)} style={full} />
    <div style={{position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,12,44,0.96) 0%, rgba(4,12,44,0.7) 20%, rgba(4,12,44,0) 38%, rgba(4,12,44,0.15) 50%, rgba(4,12,44,0.88) 64%, #040C2C 82%)"}} />
    <Grain />
    <div style={{position: "absolute", left: 60, right: 60, top: 262, textAlign: "center"}}>
      <div style={{fontFamily: oswald.fontFamily, fontWeight: 500, fontSize: 42, letterSpacing: "0.16em", color: "#FFFFFF", textTransform: "uppercase"}}>{p.hook.where} сжигает</div>
      <div style={{fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 64, letterSpacing: "0.06em", color: SKY, textTransform: "uppercase", marginTop: 4}}>
        {p.hook.value} {p.hook.unit}
      </div>
    </div>
    <div style={{position: "absolute", left: 30, right: 30, top: 1020, textAlign: "center", fontFamily: oswald.fontFamily, fontWeight: 700, lineHeight: 0.92, textTransform: "uppercase"}}>
      <div style={{fontSize: 200, color: "#FFFFFF", letterSpacing: "0.02em"}}>{p.title.a}</div>
      <div style={{fontSize: 132, color: SKY, letterSpacing: "0.1em"}}>{p.title.b}</div>
    </div>
    <div style={{position: "absolute", left: 80, right: 80, top: 1378, display: "flex", alignItems: "center", gap: 18}}>
      <div style={{flex: "1 1 0", height: 3, background: "rgba(255,255,255,0.6)"}} />
      <Mark color="#FFFFFF" size={26} />
      <div style={{flex: "1 1 0", height: 3, background: "rgba(255,255,255,0.6)"}} />
    </div>
    <div style={{position: "absolute", left: 40, right: 40, top: 1446, textAlign: "center", fontFamily: oswald.fontFamily, fontWeight: 500, fontSize: 40, letterSpacing: "0.12em", color: "#FFFFFF", textTransform: "uppercase"}}>{meta(p)}</div>
    <Logos logos={p.logos} style={{position: "absolute", left: 60, right: 60, top: 1530}} />
  </AbsoluteFill>
);

// ——— киноафиша, светлая: живое фото сверху, синий блок GTT снизу ———
const KinoLight: React.FC<{p: CoverGttProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#EEEEF2"}}>
    <Img src={staticFile(p.photos.kinoLight)} style={{position: "absolute", left: 0, top: 0, width: 1080, height: 1240, objectFit: "cover", objectPosition: "50% 40%"}} />
    <div style={{position: "absolute", left: 40, top: 252, background: "rgba(255,255,255,0.94)", borderRadius: 999, padding: "14px 28px 14px 20px", boxShadow: "0 10px 30px rgba(6,22,74,0.25)"}}>
      <Mark color={INK} size={26} />
    </div>
    <div style={{position: "absolute", left: 0, right: 0, top: 1060, bottom: 0, background: "linear-gradient(180deg, #2563EB 0%, #1A45B8 100%)", clipPath: "polygon(0 70px, 100% 0, 100% 100%, 0 100%)"}} />
    <div style={{position: "absolute", left: 60, right: 60, top: 1132, fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 44, letterSpacing: "0.08em", whiteSpace: "nowrap", color: "#FFFFFF", textTransform: "uppercase"}}>
      {p.hook.value} <span style={{color: SKY}}>{p.hook.unit}</span>
    </div>
    <div style={{position: "absolute", left: 56, right: 40, top: 1200, fontFamily: oswald.fontFamily, fontWeight: 700, lineHeight: 0.92, textTransform: "uppercase"}}>
      <div style={{fontSize: 176, color: "#FFFFFF"}}>{p.title.a}</div>
      <div style={{fontSize: 118, color: SKY, letterSpacing: "0.06em"}}>{p.title.b}</div>
    </div>
    <div style={{position: "absolute", left: 60, right: 60, top: 1500, fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 38, color: "#FFFFFF"}}>Экспедиция · {meta(p)}</div>
  </AbsoluteFill>
);

// ——— иероглифы: светлый фон GTT, тушь и синий ———
const HanziBody: React.FC<{p: CoverGttProps; dark: boolean}> = ({p, dark}) => {
  useBrush(true);
  const ink = dark ? "#FFFFFF" : INK;
  const acc = dark ? SKY : BLUE;
  const soft = dark ? "#DCEBFF" : "#4A4A55";
  return (
    <>
      <div style={{position: "absolute", inset: 0, backgroundImage: `radial-gradient(${dark ? "rgba(255,255,255,0.10)" : "rgba(37,99,235,0.10)"} 2px, transparent 2px)`, backgroundSize: "40px 40px"}} />
      <Mark color={ink} size={28} style={{position: "absolute", left: 0, right: 0, top: 256, justifyContent: "center"}} />
      <div style={{position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", gap: 64, alignItems: "flex-start"}}>
        <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
          <div style={{fontFamily: BRUSH, fontSize: 310, lineHeight: 0.98, color: ink, writingMode: "vertical-rl"}}>{p.hanzi.a}</div>
          <div style={{fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 36, color: soft, marginTop: 14, letterSpacing: "0.12em"}}>{p.hanzi.pa}</div>
        </div>
        <svg width="120" height="80" viewBox="0 0 120 80" style={{marginTop: 260}}>
          <path d="M8 40 H100 M78 16 L104 40 L78 64" fill="none" stroke={acc} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
          <div style={{fontFamily: BRUSH, fontSize: 310, lineHeight: 0.98, color: acc, writingMode: "vertical-rl"}}>{p.hanzi.b}</div>
          <div style={{fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 36, color: soft, marginTop: 14, letterSpacing: "0.12em"}}>{p.hanzi.pb}</div>
        </div>
      </div>
      {/* печать */}
      <div style={{position: "absolute", right: 110, top: 1110, width: 128, height: 128, border: `7px solid ${acc}`, borderRadius: 12, rotate: "-8deg", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display.fontFamily, fontWeight: 700, fontSize: 40, color: acc}}>GTT</div>
      <div style={{position: "absolute", left: 60, right: 60, top: 1270, textAlign: "center"}}>
        <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 96, lineHeight: 1.04, color: ink}}>
          {p.hanzi.ru} <span style={{color: acc}}>{p.hanzi.accent}</span>
        </div>
        <div style={{fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 42, lineHeight: 1.3, color: soft, marginTop: 24}}>{p.tour}</div>
        <div style={{fontFamily: inter.fontFamily, fontWeight: 500, fontSize: 36, color: soft, marginTop: 8}}>{meta(p)}</div>
      </div>
    </>
  );
};
const HanziLight: React.FC<{p: CoverGttProps}> = ({p}) => (
  <AbsoluteFill style={{background: "radial-gradient(ellipse 90% 70% at 50% 40%, #F7F8FB 0%, #EEEEF2 70%, #E3E6EE 100%)"}}>
    <HanziBody p={p} dark={false} />
  </AbsoluteFill>
);
const HanziBlue: React.FC<{p: CoverGttProps}> = ({p}) => (
  <AbsoluteFill style={{background: "radial-gradient(ellipse 75% 50% at 15% 8%, rgba(125,211,252,0.18), rgba(125,211,252,0) 70%), linear-gradient(180deg, #215BE2 0%, #1A45B8 100%)"}}>
    <HanziBody p={p} dark />
  </AbsoluteFill>
);

// ——— предмет-символ в синей гамме ———
const ObjectBlue: React.FC<{p: CoverGttProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#020718"}}>
    <Img src={staticFile(p.photos.object)} style={full} />
    <Grain opacity={0.1} />
    <div style={{position: "absolute", left: 50, right: 50, top: 250, textAlign: "center"}}>
      <Mark color="#FFFFFF" size={26} style={{justifyContent: "center"}} />
      <div style={{fontFamily: playfair.fontFamily, fontWeight: 700, fontSize: 132, lineHeight: 1, color: "#FFFFFF", marginTop: 26}}>{p.objectTitle.a}</div>
      <div style={{fontFamily: playfairI.fontFamily, fontStyle: "italic", fontWeight: 700, fontSize: 112, lineHeight: 1.05, color: SKY}}>{p.objectTitle.b}</div>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 40, lineHeight: 1.3, color: "#DCEBFF", marginTop: 20}}>{p.fact}</div>
    </div>
    <div style={{position: "absolute", left: 0, right: 0, top: 1520, display: "flex", justifyContent: "center"}}>
      <div style={{background: "rgba(2,7,24,0.78)", border: "2px solid rgba(125,211,252,0.5)", borderRadius: 999, padding: "14px 34px", fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 36, color: "#FFFFFF"}}>{p.tour}</div>
    </div>
  </AbsoluteFill>
);
// ——— предмет-символ, фирменная типографика: Unbounded и белая плашка тура ———
const ObjectBrand: React.FC<{p: CoverGttProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#020718"}}>
    <Img src={staticFile(p.photos.object)} style={full} />
    <div style={{position: "absolute", left: 50, right: 50, top: 252}}>
      <Mark color="#FFFFFF" size={26} />
      <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 118, lineHeight: 1.02, color: "#FFFFFF", marginTop: 34, textTransform: "uppercase"}}>
        {p.objectTitle.a}
        <br />
        <span style={{color: SKY}}>= энергия</span>
      </div>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 40, lineHeight: 1.3, color: "#DCEBFF", marginTop: 22}}>{p.fact}</div>
    </div>
    <div style={{position: "absolute", left: 40, right: 40, top: 1420, background: "rgba(255,255,255,0.95)", borderRadius: 32, padding: "26px 34px", boxShadow: "0 20px 50px rgba(6,22,74,0.45)"}}>
      <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 46, lineHeight: 1.08, color: INK}}>{p.tour}</div>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 34, color: BLUE, marginTop: 8}}>Экспедиция · {meta(p)}</div>
    </div>
  </AbsoluteFill>
);

export const CoverGtt: React.FC<CoverGttProps> = (p) => {
  const frame = useCurrentFrame();
  const v = p.variant ?? GTT_VARIANTS[Math.min(frame, GTT_VARIANTS.length - 1)];
  const map: Record<(typeof GTT_VARIANTS)[number], React.FC<{p: CoverGttProps}>> = {kinoBlue: KinoBlue, kinoLight: KinoLight, hanziLight: HanziLight, hanziBlue: HanziBlue, objectBlue: ObjectBlue, objectBrand: ObjectBrand};
  const C = map[v];
  return (
    <AbsoluteFill style={{fontFamily: inter.fontFamily}}>
      <C p={p} />
    </AbsoluteFill>
  );
};
