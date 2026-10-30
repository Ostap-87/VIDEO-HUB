// Пять новых обложек Reels туров (пользователь 30.10.2026: «сейчас они выглядят очень однообразно и не отражают всей
// сути и нет креативности… сделай мне 5 разных нестандартных обложек, в том числе креативных, для наших рилсов для туров»).
// + «Не обязательно меня на обложке ставить, можно что другое, связанное по тематике»: Остап — только на пропуске,
// остальные четыре — на фото по теме тура (фото не растягиваем больше чем ~1,4×: вертикальные — во весь кадр, 4:5 и 4:3 —
// в окне или карточке).
// Один кадр = одна обложка: без variant кадр N рисует вариант VARIANTS[N] (так все пять рендерятся одним прогоном).
//  badge     — пропуск делегата на груди у Остапа: логотипы всех компаний тура, название, дни;
//  magazine  — обложка журнала: вертикальное фото по теме во весь кадр, огромное GTT, тема номера и цифры «анонсами»;
//  number    — фото по теме сверху, главная цифра тура огромной на синей панели;
//  ticket    — вертикальный посадочный талон Москва → город прилёта с фото в окне и логотипами на корешке;
//  stickers  — полароид с фото по теме, логотипы компаний наклейками вокруг и вопрос-крючок сверху.
// Важное — в полосе сетки профиля 3:4 (y 240–1680), текст — выше подписи Reels в ленте (y 1540).
import React from "react";
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from "remotion";
import {z} from "zod";
import {loadFont as loadCaveat} from "@remotion/google-fonts/Caveat";
import {loadFont as loadInter} from "@remotion/google-fonts/Inter";
import {display, mono} from "../fonts";
import brandsLib from "../../library/brands.json";

const caveat = loadCaveat("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]});
const inter = loadInter("normal", {weights: ["400", "500", "700", "800"], subsets: ["cyrillic", "latin"]});

export const VARIANTS = ["badge", "magazine", "number", "ticket", "stickers"] as const;

export const coverIdeasSchema = z.object({
  variant: z.enum(VARIANTS).optional(),
  tour: z.string(), // «Переработка отходов Китая»
  title: z.string(), // заголовок, **слово** — акцент
  question: z.string().optional(), // stickers: вопрос-крючок
  headline: z.string().optional(), // magazine: тема номера
  hook: z.object({lead: z.string(), value: z.string(), unit: z.string()}), // главная цифра тура
  facts: z.array(z.object({value: z.string(), text: z.string()})), // magazine: «анонсы» по бокам
  route: z.array(z.string()), // города маршрута
  logos: z.array(z.string()), // id из library/brands.json
  days: z.number(),
  companies: z.number(),
  cities: z.number(),
  from: z.string().optional(),
  to: z.string(), // код прилёта
  toCity: z.string(),
  frame: z.string(), // кадр ролика (путь от корня репозитория)
  cut: z.string(), // тот же кадр без фона
  photo: z.string().optional(), // фото по теме тура (фон журнала в старом варианте)
  photos: z
    .object({number: z.string(), magazine: z.string(), ticket: z.string(), sticker: z.string(), stickerNote: z.string().optional()})
    .optional(), // фото по теме для вариантов без Остапа
});
export type CoverIdeasProps = z.infer<typeof coverIdeasSchema>;

const LIB = brandsLib as Record<string, {logo?: string}>;
const logoSrc = (id: string) => (id.includes("/") ? id : LIB[id]?.logo ?? "");
const BLUE = "#2563EB";
const INK = "#17171D";
const NAVY = "#14318C";

const plural = (n: number, a: string, b: string, c: string) => {
  const m = n % 100;
  if (m >= 11 && m <= 14) return c;
  return n % 10 === 1 ? a : n % 10 >= 2 && n % 10 <= 4 ? b : c;
};

const Rich: React.FC<{text: string; accent?: string}> = ({text, accent = BLUE}) => (
  <>
    {text.split("\n").map((line, li) => (
      <React.Fragment key={li}>
        {li ? <br /> : null}
        {line.split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith("**") ? <span key={i} style={{color: accent}}>{p.slice(2, -2)}</span> : <React.Fragment key={i}>{p}</React.Fragment>))}
      </React.Fragment>
    ))}
  </>
);

const Pyramid: React.FC<{size?: number}> = ({size = 46}) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <path d="M24 6 L58 46 L8 54 Z" fill="#E0F2FE" />
    <path d="M24 6 L58 46 L36 40 Z" fill="#7DD3FC" />
    <path d="M24 6 L36 40 L8 54 Z" fill="#BAE6FD" />
  </svg>
);

const Mark: React.FC<{color?: string; size?: number; style?: React.CSSProperties}> = ({color = "#FFFFFF", size = 34, style}) => (
  <div style={{display: "flex", alignItems: "center", gap: 14, ...style}}>
    <Pyramid size={size * 1.4} />
    <span style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: size, color, letterSpacing: "0.01em"}}>GLOBAL TECH TOUR</span>
  </div>
);

const Barcode: React.FC<{h?: number; color?: string}> = ({h = 56, color = NAVY}) => {
  const bars = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 3, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1];
  return (
    <div style={{display: "flex", gap: 4, height: h}}>
      {bars.map((w, i) => (
        <div key={i} style={{width: w * 3, background: i % 6 === 5 ? "#7DD3FC" : color}} />
      ))}
    </div>
  );
};

const LogoGrid: React.FC<{logos: string[]; cols: number; h: number; w: number; gap?: number}> = ({logos, cols, h, w, gap = 16}) => (
  <div style={{display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap}}>
    {logos.map((id) => (
      <div key={id} style={{height: h, display: "flex", alignItems: "center", justifyContent: "center"}}>
        <Img src={staticFile(logoSrc(id))} style={{maxHeight: h * 0.78, maxWidth: w, objectFit: "contain"}} />
      </div>
    ))}
  </div>
);

// кадр без фона: вырезка обрезана по силуэту, исходный кадр 1080×1920 → верх головы ~ на 38 % высоты
const Cut: React.FC<{src: string; left: number; top: number; width: number; style?: React.CSSProperties}> = ({src, left, top, width, style}) => (
  <Img src={staticFile(src)} style={{position: "absolute", left, top, width, height: "auto", filter: "drop-shadow(0 30px 50px rgba(10,25,80,0.35))", ...style}} />
);

// ——— 1. пропуск делегата на груди ———
const Badge: React.FC<{p: CoverIdeasProps}> = ({p}) => (
  <AbsoluteFill>
    <Img src={staticFile(p.frame)} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"}} />
    {/* шапка */}
    <div style={{position: "absolute", left: 40, right: 40, top: 250, background: "rgba(255,255,255,0.94)", borderRadius: 44, padding: "34px 40px 36px", boxShadow: "0 20px 50px rgba(10,25,80,0.25)"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <Mark color={INK} size={30} />
        <span style={{fontFamily: mono.fontFamily, fontSize: 28, letterSpacing: "0.12em", color: "#FFFFFF", background: BLUE, borderRadius: 999, padding: "10px 22px"}}>ЭКСПЕДИЦИЯ</span>
      </div>
      <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 76, lineHeight: 1.04, color: INK, marginTop: 22}}>
        <Rich text={p.title} />
      </div>
    </div>
    {/* ленты пропуска от воротника */}
    <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
      <path d="M 405 1150 L 470 1330" stroke="#1D4ED8" strokeWidth={34} strokeLinecap="round" />
      <path d="M 640 1150 L 580 1330" stroke="#2563EB" strokeWidth={34} strokeLinecap="round" />
      <path d="M 405 1150 L 470 1330" stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeDasharray="10 10" />
      <path d="M 640 1150 L 580 1330" stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeDasharray="10 10" />
    </svg>
    <div style={{position: "absolute", left: 485, top: 1308, width: 80, height: 46, borderRadius: 14, background: "linear-gradient(180deg, #E5E7EB, #9CA3AF)", boxShadow: "0 4px 10px rgba(0,0,0,0.35)"}} />
    <div style={{position: "absolute", left: 250, top: 1340, width: 560, rotate: "-3deg", background: "#FFFFFF", borderRadius: 32, overflow: "hidden", boxShadow: "0 30px 70px rgba(10,25,80,0.45)"}}>
      <div style={{background: "linear-gradient(90deg, #215BE2, #1A45B8)", padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <span style={{fontFamily: mono.fontFamily, fontSize: 30, letterSpacing: "0.14em", color: "#FFFFFF"}}>ДЕЛЕГАТ</span>
        <Pyramid size={40} />
      </div>
      <div style={{padding: "18px 26px 0"}}>
        <LogoGrid logos={p.logos.slice(0, 6)} cols={3} h={70} w={140} gap={10} />
      </div>
      <div style={{padding: "10px 28px 24px", display: "flex", flexDirection: "column", gap: 8}}>
        <div style={{height: 2, background: "repeating-linear-gradient(90deg, #C7D2FE 0 10px, transparent 10px 18px)"}} />
        <div style={{fontFamily: inter.fontFamily, fontWeight: 800, fontSize: 36, lineHeight: 1.15, color: NAVY}}>{p.tour}</div>
        <div style={{fontFamily: mono.fontFamily, fontSize: 28, color: "#4B5D94"}}>
          {p.days} {plural(p.days, "день", "дня", "дней")} · {p.companies} {plural(p.companies, "компания", "компании", "компаний")}
        </div>
      </div>
    </div>
  </AbsoluteFill>
);

// ——— 2. обложка журнала: фото по теме во весь кадр ———
const Magazine: React.FC<{p: CoverIdeasProps}> = ({p}) => {
  const lines = p.facts.slice(0, 3);
  return (
    <AbsoluteFill style={{background: NAVY}}>
      <Img src={staticFile(p.photos?.magazine ?? p.photo ?? p.frame)} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 60%"}} />
      {/* шапка журнала на синей плашке */}
      <div style={{position: "absolute", left: 0, right: 0, top: 230, height: 400, background: "linear-gradient(180deg, #215BE2, #1A45B8)", boxShadow: "0 20px 50px rgba(10,25,80,0.35)"}}>
        <div style={{position: "absolute", left: 0, right: 0, top: 10, textAlign: "center", fontFamily: display.fontFamily, fontWeight: 700, fontSize: 330, lineHeight: 1, letterSpacing: "-0.02em", color: "#FFFFFF"}}>GTT</div>
        <div style={{position: "absolute", left: 56, right: 56, bottom: 26, display: "flex", justifyContent: "space-between", fontFamily: mono.fontFamily, fontSize: 28, letterSpacing: "0.14em", color: "#E0F2FE"}}>
          <span>GLOBAL TECH TOUR</span>
          <span>ЭКСПЕДИЦИЯ · КИТАЙ</span>
        </div>
      </div>
      {/* анонсы номера — белые карточки справа */}
      <div style={{position: "absolute", right: 40, top: 690, width: 360, display: "flex", flexDirection: "column", gap: 16}}>
        {lines.map((f, i) => (
          <div key={i} style={{background: "rgba(255,255,255,0.94)", borderRadius: 22, padding: "16px 20px", boxShadow: "0 12px 30px rgba(10,25,80,0.3)", rotate: `${i % 2 ? 2 : -2}deg`}}>
            <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 50, lineHeight: 1, color: BLUE}}>{f.value}</div>
            <div style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 28, lineHeight: 1.2, color: INK, marginTop: 6}}>{f.text}</div>
          </div>
        ))}
      </div>
      {/* тема номера */}
      <div style={{position: "absolute", left: 40, right: 40, top: 1280, background: "#FFFFFF", borderRadius: 30, padding: "26px 34px", boxShadow: "0 24px 60px rgba(10,25,80,0.45)"}}>
        <div style={{fontFamily: mono.fontFamily, fontSize: 28, letterSpacing: "0.12em", color: BLUE}}>ТЕМА НОМЕРА</div>
        <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 72, lineHeight: 1.02, color: INK, marginTop: 6}}>
          <Rich text={p.headline ?? p.title} />
        </div>
        <div style={{fontFamily: inter.fontFamily, fontWeight: 500, fontSize: 32, color: "#6B6B76", marginTop: 10}}>{p.tour} · {p.days} {plural(p.days, "день", "дня", "дней")}</div>
      </div>
    </AbsoluteFill>
  );
};

// ——— 3. фото по теме + главная цифра на синей панели ———
const NumberCover: React.FC<{p: CoverIdeasProps}> = ({p}) => (
  <AbsoluteFill style={{background: "linear-gradient(180deg, #215BE2 0%, #1A45B8 100%)"}}>
    <Img src={staticFile(p.photos?.number ?? p.frame)} style={{position: "absolute", left: 0, top: 0, width: 1080, height: 1300, objectFit: "cover", objectPosition: "50% 40%"}} />
    <Mark size={30} style={{position: "absolute", left: 40, top: 252, background: "rgba(20,49,140,0.78)", borderRadius: 999, padding: "12px 26px 12px 18px", backdropFilter: "blur(12px)"}} />
    <div style={{position: "absolute", left: 0, right: 0, top: 1000, bottom: 0, background: "linear-gradient(180deg, #215BE2 0%, #1A45B8 100%)", borderRadius: "56px 56px 0 0", boxShadow: "0 -20px 50px rgba(10,25,80,0.35)"}}>
      <div style={{position: "absolute", inset: 0, borderRadius: "56px 56px 0 0", backgroundImage: "radial-gradient(rgba(255,255,255,0.10) 2px, transparent 2px)", backgroundSize: "40px 40px"}} />
      <div style={{position: "absolute", left: 56, right: 56, top: 44, fontFamily: inter.fontFamily, fontWeight: 800, fontSize: 48, lineHeight: 1.15, color: "#FFFFFF"}}>{p.hook.lead}</div>
      <div style={{position: "absolute", left: 0, right: 0, top: 104, textAlign: "center", fontFamily: display.fontFamily, fontWeight: 700, fontSize: 236, lineHeight: 1, letterSpacing: "-0.04em", whiteSpace: "nowrap", color: "#FFFFFF", textShadow: "0 0 60px rgba(125,211,252,0.55)"}}>{p.hook.value}</div>
      <div style={{position: "absolute", left: 56, right: 56, top: 380, fontFamily: display.fontFamily, fontWeight: 700, fontSize: 62, lineHeight: 1.05, color: "#7DD3FC"}}>{p.hook.unit.replace(/\n/g, " ").replace(/\*\*/g, "")}</div>
      <div style={{position: "absolute", left: 56, right: 56, top: 500, fontFamily: inter.fontFamily, fontWeight: 500, fontSize: 34, color: "#E3EAFB"}}>
        {p.tour} · {p.days} {plural(p.days, "день", "дня", "дней")} · {p.companies} {plural(p.companies, "компания", "компании", "компаний")}
      </div>
    </div>
  </AbsoluteFill>
);

// ——— 4. вертикальный посадочный талон с фото в окне ———
const Ticket: React.FC<{p: CoverIdeasProps}> = ({p}) => (
  <AbsoluteFill style={{background: "linear-gradient(180deg, #215BE2 0%, #1A45B8 100%)"}}>
    <div style={{position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.10) 2px, transparent 2px)", backgroundSize: "40px 40px"}} />
    <div style={{position: "absolute", left: 80, right: 80, top: 250, rotate: "-3deg", background: "#FFFFFF", borderRadius: 40, overflow: "hidden", boxShadow: "0 40px 90px rgba(10,25,80,0.55)"}}>
      <div style={{background: "linear-gradient(90deg, #215BE2, #1A45B8)", padding: "20px 34px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <span style={{fontFamily: mono.fontFamily, fontSize: 30, letterSpacing: "0.12em", color: "#FFFFFF"}}>ПОСАДОЧНЫЙ ТАЛОН</span>
        <Pyramid size={44} />
      </div>
      <Img src={staticFile(p.photos?.ticket ?? p.frame)} style={{display: "block", width: "100%", height: 470, objectFit: "cover", objectPosition: "50% 45%"}} />
      <div style={{display: "flex", alignItems: "center", gap: 18, padding: "26px 34px 6px"}}>
        <div>
          <div style={{fontFamily: mono.fontFamily, fontSize: 28, color: "#4B5D94"}}>{p.from ?? "ВАШ ГОРОД"}</div>
          <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 120, lineHeight: 1, color: NAVY}}>{p.from === "Москва" ? "MOW" : "···"}</div>
        </div>
        <div style={{flex: "1 1 0", borderTop: "4px dashed #93C5FD", position: "relative", height: 0}}>
          <svg width="70" height="70" viewBox="0 0 24 24" style={{position: "absolute", left: "50%", top: -37, translate: "-50% 0"}}>
            <path fill={BLUE} d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="rotate(90 12 12)" />
          </svg>
        </div>
        <div style={{textAlign: "right"}}>
          <div style={{fontFamily: mono.fontFamily, fontSize: 28, color: "#4B5D94"}}>{p.toCity}</div>
          <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 120, lineHeight: 1, color: BLUE}}>{p.to}</div>
        </div>
      </div>
      <div style={{padding: "10px 34px 0", fontFamily: display.fontFamily, fontWeight: 700, fontSize: 54, lineHeight: 1.05, color: INK}}>
        <Rich text={p.title} />
      </div>
      <div style={{display: "flex", gap: 14, padding: "20px 34px 0"}}>
        {[[`${p.days}`, plural(p.days, "день", "дня", "дней")], [`${p.companies}`, plural(p.companies, "компания", "компании", "компаний")], [`${p.cities}`, plural(p.cities, "город", "города", "городов")]].map(([v, l], i) => (
          <div key={i} style={{flex: "1 1 0", background: "#EEF3FF", borderRadius: 18, padding: "10px 16px"}}>
            <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 50, lineHeight: 1, color: NAVY}}>{v}</div>
            <div style={{fontFamily: mono.fontFamily, fontSize: 26, color: "#4B5D94", textTransform: "uppercase"}}>{l}</div>
          </div>
        ))}
      </div>
      {/* линия отрыва и корешок с логотипами */}
      <div style={{position: "relative", margin: "26px 0 18px", borderTop: "4px dashed #C7D2FE"}}>
        <div style={{position: "absolute", left: -28, top: -28, width: 56, height: 56, borderRadius: 28, background: "#1E4FCC"}} />
        <div style={{position: "absolute", right: -28, top: -28, width: 56, height: 56, borderRadius: 28, background: "#1C4AC2"}} />
      </div>
      <div style={{padding: "0 30px"}}>
        <LogoGrid logos={p.logos.slice(0, 6)} cols={6} h={70} w={120} gap={8} />
      </div>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "14px 34px 26px"}}>
        <Barcode h={52} />
        <span style={{fontFamily: mono.fontFamily, fontSize: 28, color: BLUE}}>globaltechtour.ru</span>
      </div>
    </div>
  </AbsoluteFill>
);

// ——— 5. полароид с фото по теме, логотипы наклейками, вопрос-крючок ———
const STICKERS = [
  {x: 20, y: 600, r: -12, s: 0.95},
  {x: 830, y: 560, r: 10, s: 1},
  {x: 0, y: 1060, r: 8, s: 0.9},
  {x: 850, y: 1040, r: -9, s: 0.95},
  {x: 30, y: 1330, r: -6, s: 0.86},
  {x: 850, y: 1300, r: 12, s: 0.9},
];
const Stickers: React.FC<{p: CoverIdeasProps}> = ({p}) => (
  <AbsoluteFill style={{background: "radial-gradient(ellipse 80% 50% at 50% 45%, #3B82F6 0%, #215BE2 45%, #1A45B8 100%)"}}>
    <div style={{position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 2px, transparent 2px)", backgroundSize: "40px 40px"}} />
    <div style={{position: "absolute", left: 50, right: 50, top: 250, fontFamily: display.fontFamily, fontWeight: 700, fontSize: 96, lineHeight: 1.02, color: "#FFFFFF", textAlign: "center"}}>
      <Rich text={p.question ?? p.title} accent="#7DD3FC" />
    </div>
    {/* полароид */}
    <div style={{position: "absolute", left: 170, top: 600, width: 740, padding: "26px 26px 0", background: "#FFFFFF", borderRadius: 12, rotate: "-4deg", boxShadow: "0 40px 80px rgba(10,25,80,0.5)"}}>
      <div style={{position: "absolute", left: "50%", top: -30, width: 220, height: 60, translate: "-50% 0", rotate: "3deg", background: "rgba(186,230,253,0.85)"}} />
      <Img src={staticFile(p.photos?.sticker ?? p.frame)} style={{display: "block", width: "100%", height: 690, objectFit: "cover", borderRadius: 4}} />
      <div style={{height: 120, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 150px 0 40px", fontFamily: caveat.fontFamily, fontWeight: 700, fontSize: 52, lineHeight: 1, color: NAVY}}>{p.photos?.stickerNote ?? ""}</div>
    </div>
    {p.logos.slice(0, 6).map((id, i) => {
      const st = STICKERS[i];
      return (
        <div key={id} style={{position: "absolute", left: st.x, top: st.y, width: 220 * st.s, height: 220 * st.s, borderRadius: "50%", background: "#FFFFFF", boxShadow: "0 16px 34px rgba(10,25,80,0.45), inset 0 0 0 6px #7DD3FC", rotate: `${st.r}deg`, display: "flex", alignItems: "center", justifyContent: "center"}}>
          <Img src={staticFile(logoSrc(id))} style={{maxWidth: 150 * st.s, maxHeight: 110 * st.s, objectFit: "contain"}} />
        </div>
      );
    })}
    <div style={{position: "absolute", left: 40, right: 40, top: 1500, display: "flex", justifyContent: "center"}}>
      <div style={{background: "#FFFFFF", borderRadius: 999, padding: "18px 34px", boxShadow: "0 20px 50px rgba(10,25,80,0.4)", fontFamily: inter.fontFamily, fontWeight: 800, fontSize: 34, color: INK, textAlign: "center"}}>
        {p.tour}<br />
        <span style={{fontWeight: 500, color: "#6B6B76"}}>{p.companies} {plural(p.companies, "компания", "компании", "компаний")} за {p.days} {plural(p.days, "день", "дня", "дней")}</span>
      </div>
    </div>
  </AbsoluteFill>
);

export const CoverIdeas: React.FC<CoverIdeasProps> = (p) => {
  const frame = useCurrentFrame();
  const v = p.variant ?? VARIANTS[Math.min(frame, VARIANTS.length - 1)];
  return (
    <AbsoluteFill style={{background: "#EEEEF2", fontFamily: inter.fontFamily}}>
      {v === "badge" ? <Badge p={p} /> : v === "magazine" ? <Magazine p={p} /> : v === "number" ? <NumberCover p={p} /> : v === "ticket" ? <Ticket p={p} /> : <Stickers p={p} />}
    </AbsoluteFill>
  );
};
