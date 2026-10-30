// Обложки Reels, вторая серия — 10 стилей (пользователь 30.10.2026: «ни одна из обложек мне не нравится, давай ещё
// варианты с другим стилем… обложки для рилс должны отличаться от каруселей… эстетика и стиль, но в то же время и
// креативность — это главное требование»). Свой визуальный язык, не синий стиль каруселей: фото по теме, редакционная
// типографика (Oswald, Playfair, PT Serif, PT Mono, Caveat, кисть Ma Shan Zheng), тёплые и контрастные акценты.
// Один кадр = одна обложка: без variant кадр N рисует LAB[N] (все десять — одним прогоном).
//  kino      — киноафиша: фото во весь кадр, слоган сверху, огромное название, «в ролях» — компании тура;
//  hanzi     — иероглифы тушью на рисовой бумаге: «мусор → энергия», красная печать;
//  dossier   — досье: крафт-папка, машинописный лист, полароид на скрепке, красный штамп и обводка маркером;
//  paper     — первая полоса газеты: заголовок-цифра, фото в растре, колонки фактов;
//  lock      — экран блокировки: часы и стопка уведомлений с фактами тура;
//  search    — строка поиска с вопросом и подсказками-фактами;
//  brutal    — брутализм: чёрный фон, кислотная цифра во весь кадр, полоса фото;
//  collage   — коллаж-зин: рваная бумага, фото на скотче, пометки от руки;
//  metro     — схема метро: города тура — станции, у станций логотипы компаний;
//  object    — предметная съёмка (картинка Higgsfield): один предмет-символ и заголовок.
// Важное — в полосе сетки профиля 3:4 (y 240–1680), текст — выше подписи Reels в ленте (y ~1540).
import React from "react";
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from "remotion";
import {z} from "zod";
import {loadFont as loadOswald} from "@remotion/google-fonts/Oswald";
import {loadFont as loadPlayfair} from "@remotion/google-fonts/PlayfairDisplay";
import {loadFont as loadPTSerif} from "@remotion/google-fonts/PTSerif";
import {loadFont as loadPTMono} from "@remotion/google-fonts/PTMono";
import {loadFont as loadCaveat} from "@remotion/google-fonts/Caveat";
import {loadFont as loadInter} from "@remotion/google-fonts/Inter";
import {BRUSH, useBrush} from "../components/MontazhFx";
import brandsLib from "../../library/brands.json";

const oswald = loadOswald("normal", {weights: ["300", "500", "700"], subsets: ["cyrillic", "latin"]});
const playfair = loadPlayfair("normal", {weights: ["700", "900"], subsets: ["cyrillic", "latin"]});
const playfairI = loadPlayfair("italic", {weights: ["400", "700"], subsets: ["cyrillic", "latin"]});
const ptserif = loadPTSerif("normal", {weights: ["400", "700"], subsets: ["cyrillic", "latin"]});
const ptmono = loadPTMono("normal", {weights: ["400"], subsets: ["cyrillic", "latin"]});
const caveat = loadCaveat("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]});
const inter = loadInter("normal", {weights: ["400", "500", "600", "700", "800"], subsets: ["cyrillic", "latin"]});

export const LAB = ["kino", "hanzi", "dossier", "paper", "lock", "search", "brutal", "collage", "metro", "object"] as const;

export const coverLabSchema = z.object({
  variant: z.enum(LAB).optional(),
  tour: z.string(),
  headline: z.string(), // главная фраза-крючок
  question: z.string(), // вопрос для поиска и досье
  hook: z.object({value: z.string(), unit: z.string(), where: z.string()}), // 11 000 · тонн мусора в сутки · один завод в Шанхае
  facts: z.array(z.string()), // короткие факты тура
  route: z.array(z.string()),
  routeLogos: z.array(z.array(z.string())), // логотипы компаний у каждого города
  logos: z.array(z.string()),
  companyNames: z.array(z.string()),
  days: z.number(),
  companies: z.number(),
  from: z.string().optional(),
  to: z.string(),
  hanzi: z.object({a: z.string(), b: z.string(), pa: z.string(), pb: z.string(), ru: z.string()}),
  photos: z.object({poster: z.string(), dossier: z.string(), paper: z.string(), lock: z.string(), search: z.string(), brutal: z.string(), collage: z.array(z.string()), object: z.string()}),
  notes: z.array(z.string()), // пометки от руки для коллажа (к каждому фото)
  hints: z.array(z.string()).optional(), // search: продолжения запроса
});
export type CoverLabProps = z.infer<typeof coverLabSchema>;

const LIB = brandsLib as Record<string, {logo?: string}>;
const logoSrc = (id: string) => (id.includes("/") ? id : LIB[id]?.logo ?? "");
const plural = (n: number, a: string, b: string, c: string) => {
  const m = n % 100;
  if (m >= 11 && m <= 14) return c;
  return n % 10 === 1 ? a : n % 10 >= 2 && n % 10 <= 4 ? b : c;
};
const daysTxt = (n: number) => `${n} ${plural(n, "день", "дня", "дней")}`;
const compTxt = (n: number) => `${n} ${plural(n, "компания", "компании", "компаний")}`;
const full: React.CSSProperties = {position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"};

// маленький знак бренда: пирамида + подпись
const Pyr: React.FC<{size?: number}> = ({size = 40}) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <path d="M24 6 L58 46 L8 54 Z" fill="#E0F2FE" />
    <path d="M24 6 L58 46 L36 40 Z" fill="#7DD3FC" />
    <path d="M24 6 L36 40 L8 54 Z" fill="#BAE6FD" />
  </svg>
);
const Mark: React.FC<{color: string; font?: string; size?: number; style?: React.CSSProperties}> = ({color, font = oswald.fontFamily, size = 28, style}) => (
  <div style={{display: "flex", alignItems: "center", gap: 12, ...style}}>
    <Pyr size={size * 1.35} />
    <span style={{fontFamily: font, fontWeight: 500, fontSize: size, letterSpacing: "0.18em", color}}>GLOBAL TECH TOUR</span>
  </div>
);
// плёночное зерно поверх (SVG-шум)
const Grain: React.FC<{opacity?: number}> = ({opacity = 0.16}) => (
  <svg width={1080} height={1920} style={{position: "absolute", inset: 0, opacity, mixBlendMode: "overlay", pointerEvents: "none"}}>
    <filter id="g">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="1080" height="1920" filter="url(#g)" />
  </svg>
);

// ——— 1. киноафиша ———
const Kino: React.FC<{p: CoverLabProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#0B0F0E"}}>
    <Img src={staticFile(p.photos.poster)} style={{...full, filter: "contrast(1.12) saturate(0.7) sepia(0.18) brightness(0.86)"}} />
    <div style={{position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(5,10,9,0.78) 0%, rgba(5,10,9,0.1) 26%, rgba(5,10,9,0.05) 48%, rgba(5,10,9,0.86) 72%, #050A09 100%)"}} />
    <Grain opacity={0.22} />
    <div style={{position: "absolute", left: 70, right: 70, top: 262, textAlign: "center", fontFamily: oswald.fontFamily, fontWeight: 300, fontSize: 38, letterSpacing: "0.26em", lineHeight: 1.35, color: "#F2E8D5", textTransform: "uppercase"}}>
      {p.hook.where} сжигает
      <br />
      <span style={{fontWeight: 500, color: "#FFB347"}}>{p.hook.value} {p.hook.unit}</span>
    </div>
    <div style={{position: "absolute", left: 40, right: 40, top: 1010, textAlign: "center", fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 168, lineHeight: 0.9, letterSpacing: "0.02em", color: "#FFFFFF", textTransform: "uppercase", textShadow: "0 10px 40px rgba(0,0,0,0.6)"}}>
      Энергия
      <br />
      <span style={{fontSize: 120, letterSpacing: "0.12em", color: "#F2E8D5"}}>из мусора</span>
    </div>
    <div style={{position: "absolute", left: 70, right: 70, top: 1372, textAlign: "center", fontFamily: oswald.fontFamily, fontWeight: 300, fontSize: 24, lineHeight: 1.45, letterSpacing: "0.12em", color: "#BDB6A8", textTransform: "uppercase"}}>
      Global Tech Tour представляет экспедицию по {p.route.length} городам Китая
      <br />в ролях: {p.companyNames.join(" · ")}
    </div>
    <div style={{position: "absolute", left: 0, right: 0, top: 1560, textAlign: "center", fontFamily: oswald.fontFamily, fontWeight: 500, fontSize: 34, letterSpacing: "0.3em", color: "#FFB347"}}>{daysTxt(p.days).toUpperCase()} · {p.route[0].toUpperCase()} → {p.route[p.route.length - 1].toUpperCase()}</div>
  </AbsoluteFill>
);

// ——— 2. иероглифы тушью ———
const Hanzi: React.FC<{p: CoverLabProps}> = ({p}) => {
  useBrush(true);
  return (
    <AbsoluteFill style={{background: "radial-gradient(ellipse 90% 70% at 50% 40%, #F7F2E8 0%, #EDE4D3 70%, #E2D6C0 100%)"}}>
      <Grain opacity={0.28} />
      <Mark color="#3A3428" size={24} style={{position: "absolute", left: 64, top: 258}} />
      <div style={{position: "absolute", right: 64, top: 254, fontFamily: ptmono.fontFamily, fontSize: 26, color: "#8A7F6A", letterSpacing: "0.1em"}}>ЭКСПЕДИЦИЯ · КИТАЙ</div>
      {/* столбик: мусор → энергия */}
      <div style={{position: "absolute", left: 0, right: 0, top: 360, display: "flex", justifyContent: "center", gap: 70, alignItems: "flex-start"}}>
        <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
          <div style={{fontFamily: BRUSH, fontSize: 300, lineHeight: 0.98, color: "#1B1A17", writingMode: "vertical-rl"}}>{p.hanzi.a}</div>
          <div style={{fontFamily: ptmono.fontFamily, fontSize: 30, color: "#6E6555", marginTop: 14, letterSpacing: "0.12em"}}>{p.hanzi.pa}</div>
        </div>
        <div style={{fontFamily: playfairI.fontFamily, fontStyle: "italic", fontSize: 120, color: "#B8312A", marginTop: 220}}>→</div>
        <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
          <div style={{fontFamily: BRUSH, fontSize: 300, lineHeight: 0.98, color: "#B8312A", writingMode: "vertical-rl"}}>{p.hanzi.b}</div>
          <div style={{fontFamily: ptmono.fontFamily, fontSize: 30, color: "#6E6555", marginTop: 14, letterSpacing: "0.12em"}}>{p.hanzi.pb}</div>
        </div>
      </div>
      {/* печать */}
      <div style={{position: "absolute", right: 120, top: 1090, width: 130, height: 130, border: "6px solid #B8312A", borderRadius: 10, rotate: "-8deg", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 46, color: "#B8312A", letterSpacing: "0.04em", opacity: 0.9}}>GTT</div>
      <div style={{position: "absolute", left: 70, right: 70, top: 1250, textAlign: "center"}}>
        <div style={{fontFamily: playfair.fontFamily, fontWeight: 700, fontSize: 84, lineHeight: 1.04, color: "#1B1A17"}}>{p.hanzi.ru}</div>
        <div style={{width: 120, height: 3, background: "#B8312A", margin: "28px auto 22px"}} />
        <div style={{fontFamily: ptserif.fontFamily, fontSize: 36, lineHeight: 1.35, color: "#4A4336"}}>{p.tour} · {daysTxt(p.days)}, {compTxt(p.companies)}</div>
      </div>
    </AbsoluteFill>
  );
};

// ——— 3. досье ———
const Dossier: React.FC<{p: CoverLabProps}> = ({p}) => (
  <AbsoluteFill style={{background: "linear-gradient(160deg, #C9A46A 0%, #B78E52 55%, #A27B43 100%)"}}>
    <Grain opacity={0.35} />
    {/* язычок папки */}
    <div style={{position: "absolute", left: 60, top: 236, width: 360, height: 70, background: "#D8B47A", borderRadius: "18px 18px 0 0"}} />
    <div style={{position: "absolute", left: 60, right: 60, top: 300, bottom: 260, background: "#D8B47A", borderRadius: "0 18px 18px 18px", boxShadow: "0 30px 60px rgba(60,40,10,0.35)"}} />
    {/* лист */}
    <div style={{position: "absolute", left: 100, right: 110, top: 350, height: 1180, background: "#FBF8F1", rotate: "-1.2deg", boxShadow: "0 18px 40px rgba(60,40,10,0.3)", padding: "60px 56px"}}>
      <div style={{fontFamily: ptmono.fontFamily, fontSize: 30, color: "#5B5244", letterSpacing: "0.08em"}}>ДЕЛО № GTT-{p.days}{p.companies}</div>
      <div style={{fontFamily: ptmono.fontFamily, fontSize: 64, lineHeight: 1.12, color: "#1C1A16", marginTop: 26, textTransform: "uppercase"}}>{p.question}</div>
      <div style={{height: 2, background: "#1C1A16", margin: "34px 0 30px"}} />
      <div style={{fontFamily: ptmono.fontFamily, fontSize: 34, lineHeight: 1.6, color: "#2C2924", width: 480}}>
        ОБЪЕКТ: «Лаоган», Шанхай
        <br />
        МОЩНОСТЬ: <span style={{position: "relative"}}>{p.hook.value} т/сутки
          <svg width="330" height="100" style={{position: "absolute", left: -24, top: -30}}><ellipse cx="165" cy="50" rx="156" ry="40" fill="none" stroke="#D12A1F" strokeWidth="6" transform="rotate(-4 165 50)" /></svg>
        </span>
        <br />
        МАРШРУТ: {p.route.length} городов
        <br />
        КОМПАНИИ: {p.companies}
        <br />
        СРОК: {daysTxt(p.days)}
      </div>
    </div>
    {/* полароид на скрепке */}
    <div style={{position: "absolute", right: 70, top: 820, width: 400, padding: "18px 18px 70px", background: "#FFFFFF", rotate: "6deg", boxShadow: "0 20px 40px rgba(40,25,5,0.4)"}}>
      <Img src={staticFile(p.photos.dossier)} style={{display: "block", width: "100%", height: 360, objectFit: "cover", filter: "saturate(0.8) contrast(1.05)"}} />
      <div style={{position: "absolute", left: 0, right: 0, bottom: 14, textAlign: "center", fontFamily: caveat.fontFamily, fontWeight: 700, fontSize: 44, color: "#1C1A16"}}>Шанхай, «Лаоган»</div>
      <svg width="60" height="150" viewBox="0 0 60 150" style={{position: "absolute", left: 60, top: -70}}>
        <path d="M18 140 V25 a12 12 0 0 1 24 0 V120 a7 7 0 0 1 -14 0 V40" fill="none" stroke="#9CA3AF" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </div>
    {/* штамп */}
    <div style={{position: "absolute", left: 130, top: 1290, rotate: "-12deg", border: "7px solid #D12A1F", borderRadius: 14, padding: "12px 30px", fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 64, letterSpacing: "0.08em", color: "#D12A1F", opacity: 0.88}}>ЭКСПЕДИЦИЯ GTT</div>
  </AbsoluteFill>
);

// ——— 4. первая полоса газеты ———
const Paper: React.FC<{p: CoverLabProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#F1ECE1"}}>
    <Grain opacity={0.25} />
    <div style={{position: "absolute", left: 60, right: 60, top: 240}}>
      <div style={{height: 6, background: "#141414"}} />
      <div style={{textAlign: "center", fontFamily: playfair.fontFamily, fontWeight: 900, fontSize: 92, letterSpacing: "-0.01em", color: "#141414", lineHeight: 1.05, padding: "14px 0 8px"}}>Экспедиционный вестник</div>
      <div style={{display: "flex", justifyContent: "space-between", borderTop: "2px solid #141414", borderBottom: "2px solid #141414", padding: "8px 2px", fontFamily: ptserif.fontFamily, fontSize: 26, color: "#141414"}}>
        <span>Global Tech Tour</span>
        <span>Выпуск: переработка отходов</span>
        <span>Китай</span>
      </div>
      <div style={{fontFamily: ptserif.fontFamily, fontWeight: 700, fontSize: 104, lineHeight: 1.0, color: "#141414", marginTop: 28, letterSpacing: "-0.01em"}}>
        {p.hook.where}: <span style={{color: "#B8211A"}}>{p.hook.value}</span> {p.hook.unit}
      </div>
      <Img src={staticFile(p.photos.paper)} style={{display: "block", width: "100%", height: 470, objectFit: "cover", marginTop: 30, filter: "grayscale(1) contrast(1.35) brightness(1.02)"}} />
      <div style={{fontFamily: ptserif.fontFamily, fontStyle: "italic", fontSize: 26, color: "#3A3A3A", marginTop: 10}}>«Лаоган» — крупнейший в мире моно-завод энергоутилизации.</div>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginTop: 22, fontFamily: ptserif.fontFamily, fontSize: 30, lineHeight: 1.35, color: "#1E1E1E"}}>
        {p.facts.slice(0, 2).map((f, i) => (
          <div key={i} style={{borderTop: "2px solid #141414", paddingTop: 12}}>
            <span style={{fontWeight: 700}}>{i ? "Маршрут. " : "Факт. "}</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

// ——— 5. экран блокировки ———
const Note: React.FC<{app: string; title: string; text: string; icon: React.ReactNode; when: string}> = ({app, title, text, icon, when}) => (
  <div style={{background: "rgba(245,245,247,0.72)", backdropFilter: "blur(30px)", borderRadius: 40, padding: "26px 30px", display: "flex", gap: 22, boxShadow: "0 10px 30px rgba(0,0,0,0.15)"}}>
    <div style={{width: 84, height: 84, borderRadius: 20, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center"}}>{icon}</div>
    <div style={{minWidth: 0, flex: "1 1 0"}}>
      <div style={{display: "flex", justifyContent: "space-between", fontFamily: inter.fontFamily, fontSize: 26, color: "#6B6B70"}}>
        <span style={{textTransform: "uppercase", letterSpacing: "0.04em"}}>{app}</span>
        <span>{when}</span>
      </div>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 34, color: "#111", marginTop: 4}}>{title}</div>
      <div style={{fontFamily: inter.fontFamily, fontSize: 32, lineHeight: 1.3, color: "#222", marginTop: 2}}>{text}</div>
    </div>
  </div>
);
const Lock: React.FC<{p: CoverLabProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#222"}}>
    <Img src={staticFile(p.photos.lock)} style={{...full, filter: "blur(6px) brightness(0.92) saturate(1.1)", scale: "1.06"}} />
    <div style={{position: "absolute", left: 0, right: 0, top: 260, textAlign: "center", color: "#FFFFFF", textShadow: "0 2px 20px rgba(0,0,0,0.25)"}}>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 40}}>пятница, 31 октября</div>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 230, lineHeight: 1, letterSpacing: "-0.03em"}}>08:30</div>
    </div>
    <div style={{position: "absolute", left: 40, right: 40, top: 700, display: "flex", flexDirection: "column", gap: 20}}>
      <Note app="Global Tech Tour" when="сейчас" title={p.tour} text={`Экспедиция: ${daysTxt(p.days)}, ${compTxt(p.companies)}, ${p.route.length} городов`} icon={<div style={{width: "100%", height: "100%", background: "linear-gradient(135deg, #215BE2, #1A45B8)", display: "flex", alignItems: "center", justifyContent: "center"}}><Pyr size={58} /></div>} />
      <Note app="Факт дня" when="1 мин" title={`${p.hook.value} ${p.hook.unit}`} text={`${p.hook.where} — крупнейший в мире моно-завод энергоутилизации`} icon={<div style={{width: "100%", height: "100%", background: "#FF9F0A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50}}>⚡</div>} />
      <Note app="Маршрут" when="2 мин" title={`${p.from ?? "Ваш город"} → ${p.route[0]}`} text={p.route.join(" → ")} icon={<div style={{width: "100%", height: "100%", background: "#34C759", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50}}>✈️</div>} />
    </div>
  </AbsoluteFill>
);

// ——— 6. строка поиска ———
const Search: React.FC<{p: CoverLabProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#FFFFFF"}}>
    <Mark color="#202124" font={inter.fontFamily} size={26} style={{position: "absolute", left: 64, top: 262}} />
    <div style={{position: "absolute", left: 50, right: 50, top: 400, borderRadius: 60, boxShadow: "0 6px 30px rgba(32,33,36,0.18)", border: "1px solid #DFE1E5", background: "#FFFFFF", overflow: "hidden"}}>
      <div style={{display: "flex", alignItems: "center", gap: 24, padding: "34px 40px"}}>
        <svg width="46" height="46" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#5F6368" strokeWidth="2.4" /><path d="M15.5 15.5 L21 21" stroke="#5F6368" strokeWidth="2.4" strokeLinecap="round" /></svg>
        <div style={{fontFamily: inter.fontFamily, fontSize: 52, color: "#202124", flex: "1 1 0"}}>
          {p.question.toLowerCase().replace("?", "")}
          <span style={{display: "inline-block", width: 4, height: 56, background: "#1A73E8", marginLeft: 4, verticalAlign: -8}} />
        </div>
      </div>
      <div style={{borderTop: "1px solid #E8EAED"}}>
        {(p.hints ?? p.facts).map((f, i) => (
          <div key={i} style={{display: "flex", alignItems: "center", gap: 24, padding: "22px 40px", fontFamily: inter.fontFamily, fontSize: 38, color: "#202124"}}>
            <svg width="36" height="36" viewBox="0 0 24 24" style={{flexShrink: 0}}><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#9AA0A6" strokeWidth="2.4" /><path d="M15.5 15.5 L21 21" stroke="#9AA0A6" strokeWidth="2.4" strokeLinecap="round" /></svg>
            <span>
              {/* как в подсказках поиска: начало запроса обычным, продолжение — жирным */}
              {f.split("|")[0]}
              <b>{f.split("|")[1] ?? ""}</b>
            </span>
          </div>
        ))}
      </div>
    </div>
    {/* «результат» — карточка экспедиции */}
    <div style={{position: "absolute", left: 50, right: 50, top: 1130, borderRadius: 36, overflow: "hidden", boxShadow: "0 6px 30px rgba(32,33,36,0.16)", border: "1px solid #DFE1E5", display: "flex", background: "#FFFFFF"}}>
      <Img src={staticFile(p.photos.search)} style={{width: 380, height: 380, objectFit: "cover"}} />
      <div style={{padding: "34px 34px", minWidth: 0}}>
        <div style={{fontFamily: inter.fontFamily, fontSize: 28, color: "#4D5156"}}>globaltechtour.ru</div>
        <div style={{fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 44, lineHeight: 1.15, color: "#1A0DAB", marginTop: 8}}>{p.tour} — увидеть своими глазами</div>
        <div style={{fontFamily: inter.fontFamily, fontSize: 30, lineHeight: 1.35, color: "#4D5156", marginTop: 12}}>Экспедиция · {daysTxt(p.days)} · {compTxt(p.companies)}</div>
      </div>
    </div>
  </AbsoluteFill>
);

// ——— 7. брутализм ———
const Brutal: React.FC<{p: CoverLabProps}> = ({p}) => {
  const LIME = "#D7FF3A";
  return (
    <AbsoluteFill style={{background: "#0A0A0A"}}>
      <div style={{position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "90px 90px"}} />
      <div style={{position: "absolute", left: 60, right: 60, top: 256, display: "flex", justifyContent: "space-between", fontFamily: ptmono.fontFamily, fontSize: 28, color: "#9A9A9A", letterSpacing: "0.08em"}}>
        <span>GTT / ЭКСПЕДИЦИЯ / {p.days}Д</span>
        <span>CN → {p.to}</span>
      </div>
      <div style={{position: "absolute", left: 40, right: 40, top: 320, fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 330, lineHeight: 0.86, letterSpacing: "-0.02em", color: LIME}}>{p.hook.value.split(" ")[0]}</div>
      <div style={{position: "absolute", left: 40, right: 40, top: 600, fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 330, lineHeight: 0.86, letterSpacing: "-0.02em", color: "transparent", WebkitTextStroke: `4px ${LIME}`}}>{p.hook.value.split(" ").slice(1).join(" ") || "000"}</div>
      <div style={{position: "absolute", right: 60, top: 640, textAlign: "right", fontFamily: oswald.fontFamily, fontWeight: 500, fontSize: 52, lineHeight: 1.05, color: "#FFFFFF", textTransform: "uppercase"}}>
        тонн
        <br />
        мусора
        <br />в сутки
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 930, height: 420, overflow: "hidden", borderTop: `6px solid ${LIME}`, borderBottom: `6px solid ${LIME}`}}>
        <Img src={staticFile(p.photos.brutal)} style={{...full, filter: "grayscale(1) contrast(1.4)"}} />
        <div style={{position: "absolute", inset: 0, background: LIME, mixBlendMode: "multiply", opacity: 0.85}} />
      </div>
      <div style={{position: "absolute", left: 60, right: 60, top: 1392, fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 70, lineHeight: 1, whiteSpace: "nowrap", color: "#FFFFFF", textTransform: "uppercase"}}>{p.tour}</div>
      <div style={{position: "absolute", left: 60, right: 60, top: 1486, fontFamily: ptmono.fontFamily, fontSize: 30, color: LIME}}>{p.hook.where.toUpperCase()} · {compTxt(p.companies).toUpperCase()} · {daysTxt(p.days).toUpperCase()}</div>
    </AbsoluteFill>
  );
};

// ——— 8. коллаж-зин ———
const TORN = "polygon(0% 3%, 8% 0%, 17% 4%, 26% 1%, 35% 3%, 46% 0%, 57% 4%, 68% 1%, 79% 3%, 90% 0%, 100% 3%, 99% 97%, 91% 100%, 80% 96%, 69% 99%, 58% 96%, 47% 100%, 36% 97%, 25% 100%, 14% 96%, 5% 99%, 0% 96%)";
const Collage: React.FC<{p: CoverLabProps}> = ({p}) => {
  const spots = [
    {left: 70, top: 560, w: 560, h: 420, rot: -5},
    {left: 520, top: 840, w: 500, h: 380, rot: 6},
    {left: 110, top: 1130, w: 520, h: 360, rot: -2},
  ];
  return (
    <AbsoluteFill style={{background: "#EFE7D8"}}>
      <Grain opacity={0.3} />
      {/* полосы рваной бумаги */}
      <div style={{position: "absolute", left: -40, right: -40, top: 240, height: 290, background: "#E4372C", clipPath: TORN, rotate: "-2deg"}} />
      <div style={{position: "absolute", left: 60, right: 60, top: 270, fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 112, lineHeight: 0.98, color: "#FFF6E5", textTransform: "uppercase", rotate: "-2deg"}}>
        Куда исчезает
        <br />
        <span style={{fontFamily: playfairI.fontFamily, fontStyle: "italic", fontWeight: 700, textTransform: "none", color: "#111"}}>мусор Китая?</span>
      </div>
      {p.photos.collage.slice(0, 3).map((src, i) => {
        const s = spots[i];
        return (
          <div key={i} style={{position: "absolute", left: s.left, top: s.top, width: s.w, height: s.h, rotate: `${s.rot}deg`, filter: "drop-shadow(0 18px 26px rgba(40,30,15,0.35))"}}>
            <div style={{position: "absolute", inset: 0, clipPath: TORN, background: "#FFFDF8", padding: 14}}>
              <Img src={staticFile(src)} style={{width: "100%", height: "100%", objectFit: "cover", clipPath: TORN, filter: i === 1 ? "grayscale(1) contrast(1.2)" : "saturate(1.05)"}} />
            </div>
            <div style={{position: "absolute", left: "50%", top: -24, width: 170, height: 48, translate: "-50% 0", rotate: `${i % 2 ? 6 : -4}deg`, background: "rgba(255,236,170,0.82)"}} />
          </div>
        );
      })}
      {/* пометки от руки */}
      <div style={{position: "absolute", left: 650, top: 590, rotate: "6deg", fontFamily: caveat.fontFamily, fontWeight: 700, fontSize: 60, lineHeight: 1, color: "#E4372C", width: 380}}>{p.notes[0]}</div>
      <div style={{position: "absolute", left: 90, top: 1010, rotate: "-5deg", fontFamily: caveat.fontFamily, fontWeight: 700, fontSize: 56, lineHeight: 1, color: "#111", width: 400}}>{p.notes[1]}</div>
      <div style={{position: "absolute", left: 640, top: 1260, rotate: "4deg", fontFamily: caveat.fontFamily, fontWeight: 700, fontSize: 56, lineHeight: 1, color: "#E4372C", width: 380}}>{p.notes[2]}</div>
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
        <path d="M 760 700 C 720 760, 660 780, 600 790" stroke="#E4372C" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M 625 768 L 598 792 L 630 806" stroke="#E4372C" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{position: "absolute", left: 60, right: 60, top: 1520, display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <div style={{background: "#111", color: "#FFF6E5", fontFamily: oswald.fontFamily, fontWeight: 500, fontSize: 32, letterSpacing: "0.08em", padding: "10px 22px", textTransform: "uppercase"}}>{p.tour}</div>
        <div style={{fontFamily: ptmono.fontFamily, fontSize: 26, color: "#333"}}>GTT · {daysTxt(p.days)}</div>
      </div>
    </AbsoluteFill>
  );
};

// ——— 9. схема метро ———
const LINE = ["#E4372C", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"];
const Metro: React.FC<{p: CoverLabProps}> = ({p}) => {
  const n = p.route.length;
  const top = 560;
  const step = 200;
  return (
    <AbsoluteFill style={{background: "#F7F7F5"}}>
      <div style={{position: "absolute", left: 64, top: 256, display: "flex", alignItems: "center", gap: 18}}>
        <div style={{width: 76, height: 76, borderRadius: 38, background: "#E4372C", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 40, color: "#FFF"}}>G</div>
        <div>
          <div style={{fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 52, lineHeight: 1, color: "#111", textTransform: "uppercase"}}>Линия «{p.tour.split(" ")[0]}»</div>
          <div style={{fontFamily: inter.fontFamily, fontSize: 28, color: "#666", marginTop: 6}}>{n} станций · {compTxt(p.companies)} · {daysTxt(p.days)}</div>
        </div>
      </div>
      {/* линия */}
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
        <path d={`M 170 ${top} V ${top + step * (n - 1)}`} stroke="#E4372C" strokeWidth="26" strokeLinecap="round" />
      </svg>
      {p.route.map((c, i) => {
        const y = top + i * step;
        const end = i === 0 || i === n - 1;
        return (
          <div key={c} style={{position: "absolute", left: 0, right: 0, top: y - 50, height: 100}}>
            <div style={{position: "absolute", left: 170 - (end ? 46 : 34), top: 50 - (end ? 46 : 34), width: end ? 92 : 68, height: end ? 92 : 68, borderRadius: "50%", background: "#FFFFFF", border: `${end ? 14 : 12}px solid ${end ? "#111" : "#E4372C"}`, boxSizing: "border-box"}} />
            <div style={{position: "absolute", left: 250, top: 10, fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 60, lineHeight: 1, color: "#111"}}>{c}</div>
            <div style={{position: "absolute", left: 252, top: 76, fontFamily: ptmono.fontFamily, fontSize: 24, color: "#888"}}>день {Math.min(i + 1, p.days)}</div>
            <div style={{position: "absolute", right: 60, top: 6, display: "flex", gap: 10}}>
              {(p.routeLogos[i] ?? []).map((id) => (
                <div key={id} style={{height: 88, width: 160, borderRadius: 18, background: "#FFFFFF", border: "2px solid #E5E5E2", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px"}}>
                  <Img src={staticFile(logoSrc(id))} style={{maxHeight: 56, maxWidth: 136, objectFit: "contain"}} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div style={{position: "absolute", left: 64, right: 64, top: top + step * (n - 1) + 110, display: "flex", alignItems: "center", gap: 18, fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 32, color: "#111"}}>
        <span style={{background: "#111", color: "#FFF", borderRadius: 10, padding: "6px 14px", fontFamily: oswald.fontFamily, fontWeight: 500, letterSpacing: "0.08em"}}>ПЕРЕСАДКА</span>
        {p.from ?? "Ваш город"} ✈ {p.route[0]}
      </div>
    </AbsoluteFill>
  );
};

// ——— 10. предмет-символ ———
const ObjectCover: React.FC<{p: CoverLabProps}> = ({p}) => (
  <AbsoluteFill style={{background: "#03100C"}}>
    <Img src={staticFile(p.photos.object)} style={full} />
    <Grain opacity={0.12} />
    <div style={{position: "absolute", left: 60, right: 60, top: 256, textAlign: "center"}}>
      <Mark color="#E9D9A6" size={24} style={{justifyContent: "center"}} />
      <div style={{fontFamily: playfair.fontFamily, fontWeight: 700, fontSize: 118, lineHeight: 1.0, color: "#FFFFFF", marginTop: 22}}>
        Мусор
        <br />
        <span style={{fontFamily: playfairI.fontFamily, fontStyle: "italic", fontWeight: 400, color: "#F4C76B"}}>это топливо</span>
      </div>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 400, fontSize: 34, lineHeight: 1.3, color: "#CFE3DA", marginTop: 22}}>{p.facts[0]}</div>
    </div>
  </AbsoluteFill>
);

export const CoverLab: React.FC<CoverLabProps> = (p) => {
  const frame = useCurrentFrame();
  const v = p.variant ?? LAB[Math.min(frame, LAB.length - 1)];
  const map: Record<(typeof LAB)[number], React.FC<{p: CoverLabProps}>> = {kino: Kino, hanzi: Hanzi, dossier: Dossier, paper: Paper, lock: Lock, search: Search, brutal: Brutal, collage: Collage, metro: Metro, object: ObjectCover};
  const C = map[v];
  return (
    <AbsoluteFill style={{fontFamily: inter.fontFamily}}>
      <C p={p} />
    </AbsoluteFill>
  );
};
