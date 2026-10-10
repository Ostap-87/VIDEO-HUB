// Общие детали карусели: размеры и поля безопасности, стили двух брендов, текст с акцентом, фото, логотип на фото,
// плашки, кнопка, подгонка текста под место. Слайды — Carousel.tsx (текстовые) и carousel/photo.tsx (фото).
import React, {useContext, useEffect, useLayoutEffect, useRef, useState} from "react";
import {continueRender, delayRender, Img, staticFile} from "remotion";
import {loadFont as loadInter} from "@remotion/google-fonts/Inter";
import {display, mono} from "../../fonts";
import {ArMonogram} from "../../components/AuraBadge";
import brandsLib from "../../../library/brands.json";
import type {Pic} from "./schema";

export const inter = loadInter("normal", {weights: ["400", "500", "600", "700", "800"], subsets: ["cyrillic", "latin"]});
export const MONO = "JetBrains Mono, monospace";

// 1080×1350 (4:5). Поля безопасности (правила Instagram, решение пользователя 10.10.2026):
// по бокам ≥ 72 px, сверху и снизу ≥ 64 px — для любых элементов (фото на весь слайд — фон, не элемент).
export const W = 1080;
export const H = 1350;
export const SAFE = {side: 72, top: 64, bottom: 64};
// Сетка профиля: 4:5 → 1:1 срезает по 135 px сверху и снизу; 4:5 → 3:4 — по 34 px с боков (видно 1012 px).
export const GRID = {squareTop: 135, squareBottom: H - 135, portraitSide: 34};
export const MIN_FONT = 30; // минимальный кегль на слайде
export const ROW = 64; // высота шапки и подвала (кнопка «листай» — 64 px)
// Место под содержимое: между шапкой (64 + 64) и подвалом (64 + 64), с воздухом 24–30 px
export const CONTENT = {left: SAFE.side, right: SAFE.side, top: SAFE.top + ROW + 24, bottom: SAFE.bottom + ROW + 30};

export type BrandId = "gtt" | "aura";

export type Style = {
  bg: React.CSSProperties;
  pattern: React.CSSProperties;
  ink: string;
  muted: string;
  accent: string;
  head: string;
  headWeight: number;
  headTrack: string;
  body: string;
  bodyInk: string;
  card: string;
  cardInk: string;
  tick: string;
  tickInk: string;
  site: string;
  marker: boolean; // акцент маркером (aura) или цветом (gtt)
  // фото-слайды
  photo: {radius: number; border: string; shadow: string; empty: string};
  plate: React.CSSProperties; // плашка с текстом поверх фото
  plateRadius: number;
  line: string; // тонкий разделитель на плашке
  pill: React.CSSProperties; // «пилюли» шапки поверх фото
  chipAccent: React.CSSProperties; // плашка «после» / «с нами» на фото
  button: React.CSSProperties;
};

export const STYLES: Record<BrandId, Style> = {
  gtt: {
    bg: {background: "radial-gradient(ellipse 80% 55% at 20% 15%, rgba(37,99,235,0.45), rgba(37,99,235,0) 70%), radial-gradient(ellipse 60% 45% at 95% 100%, rgba(56,189,248,0.25), rgba(56,189,248,0) 70%), linear-gradient(180deg, #0A1022 0%, #050814 100%)"},
    pattern: {backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 2px, transparent 2px)", backgroundSize: "40px 40px"},
    ink: "#F4F7FF",
    muted: "#9AA8C7",
    accent: "#3D7BFF",
    head: display.fontFamily,
    headWeight: 700,
    headTrack: "0",
    body: inter.fontFamily,
    bodyInk: "#C9D3EA",
    card: "rgba(255,255,255,0.06)",
    cardInk: "#F4F7FF",
    tick: "#16A34A",
    tickInk: "#FFFFFF",
    site: "globaltechtour.ru",
    marker: false,
    photo: {radius: 36, border: "2px solid rgba(255,255,255,0.14)", shadow: "0 24px 60px rgba(0,0,0,0.35)", empty: "#0E1530"},
    // тёмно-синее стекло с размытием; само фото не затемняем
    plate: {background: "rgba(8,14,32,0.74)", border: "2px solid rgba(255,255,255,0.12)", backdropFilter: "blur(22px)", boxShadow: "0 20px 50px rgba(0,0,0,0.35)"},
    plateRadius: 36,
    line: "rgba(255,255,255,0.14)",
    pill: {background: "rgba(8,14,32,0.66)", border: "2px solid rgba(255,255,255,0.14)", backdropFilter: "blur(16px)", borderRadius: 32},
    chipAccent: {background: "#2563EB", color: "#FFFFFF", border: "2px solid #2563EB"},
    button: {background: "#2563EB", color: "#FFFFFF", boxShadow: "0 0 60px rgba(59,130,246,0.75)"},
  },
  aura: {
    bg: {background: "radial-gradient(ellipse 70% 50% at 85% 10%, rgba(255,246,93,0.35), rgba(255,246,93,0) 70%), linear-gradient(180deg, #F8F6F3 0%, #EFECE7 100%)"},
    pattern: {backgroundImage: "linear-gradient(rgba(38,38,38,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(38,38,38,0.06) 2px, transparent 2px)", backgroundSize: "90px 90px"},
    ink: "#262626",
    muted: "#727272",
    accent: "#FFF65D",
    head: inter.fontFamily,
    headWeight: 600,
    headTrack: "-0.03em",
    body: inter.fontFamily,
    bodyInk: "#3D3D3D",
    card: "#FFFFFF",
    cardInk: "#262626",
    tick: "#262626",
    tickInk: "#FFF65D",
    site: "aura-robotics.ru",
    marker: true,
    // как карточка каталога на сайте: радиус 10, графитовая рамка, без теней
    photo: {radius: 10, border: "2px solid #262626", shadow: "none", empty: "#D9D7D5"},
    plate: {background: "rgba(248,246,243,0.95)", border: "2px solid #262626", backdropFilter: "blur(14px)"},
    plateRadius: 10,
    line: "#D9D7D5",
    pill: {background: "rgba(248,246,243,0.94)", border: "2px solid #262626", backdropFilter: "blur(12px)", borderRadius: 24},
    chipAccent: {background: "#262626", color: "#F8F6F3", border: "2px solid #262626"},
    button: {background: "#000000", color: "#FFFFFF", boxShadow: "0 0 50px rgba(255,246,93,0.7)"},
  },
};

// ——— подгонка текста под место ———
// FitBox меряет своё содержимое в браузере и, если оно не влезает (по высоте или ширине), уменьшает заголовки и текст
// шагами по 4 % (не ниже 62 % и не мельче 30 px). Не влезло и так — помечает data-overflow (видно в режиме guides).
const FitContext = React.createContext(1);
export const useFit = () => useContext(FitContext);
let pendingFits = 0;
export const fitsPending = () => pendingFits;
const fonts = () => Promise.all([inter.waitUntilDone(), display.waitUntilDone(), mono.waitUntilDone()]);

export const FitBox: React.FC<{style?: React.CSSProperties; min?: number; children: React.ReactNode}> = ({style, min = 0.62, children}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [job] = useState(() => {
    pendingFits++;
    return {handle: delayRender("Подгонка текста слайда"), open: true};
  });
  const finish = () => {
    if (!job.open) return;
    job.open = false;
    pendingFits--;
    continueRender(job.handle);
  };
  useLayoutEffect(() => {
    if (!job.open) return;
    let alive = true;
    fonts().then(() => {
      if (!alive || !job.open) return;
      const el = ref.current;
      if (!el) return finish();
      const over = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
      if (over && k > min + 0.001) setK((v) => Math.round((v - 0.04) * 100) / 100);
      else {
        if (over) el.setAttribute("data-overflow", "");
        finish();
      }
    });
    return () => {
      alive = false;
    };
  }, [k]);
  useEffect(() => () => finish(), []);
  return (
    <FitContext.Provider value={k}>
      {/* overflow не обрезаем: тени и свечение кнопки видны, а scrollHeight всё равно ловит текст, который не влез */}
      <div ref={ref} data-fit="" style={{minHeight: 0, ...style}}>
        {children}
      </div>
    </FitContext.Provider>
  );
};

// ——— текст ———
// Типографика: предлоги и союзы из 1–2 букв не висят в конце строки, число не отрывается от слова после него,
// «13 361» и «1500–2000» не разрываются, тире не начинает строку.
const NB = "\u00A0";
export const typo = (text: string): string => {
  let t = text
    .replace(/(\d) (?=\d)/g, `$1${NB}`)
    .replace(/(\d)([–-])(?=\d)/g, "$1\u2060$2\u2060")
    .replace(/(\d) (?=[^\s\d])/g, `$1${NB}`)
    .replace(/ (—|–) /g, `${NB}$1 `);
  for (let i = 0; i < 2; i++) t = t.replace(/(^|[\s«("*\u00A0])([А-Яа-яЁёA-Za-z]{1,2}) /g, `$1$2${NB}`);
  return t;
};

// **слово** → акцент: GTT — синий цвет, Aura — лимонный маркер под словом
export const Rich: React.FC<{text: string; s: Style}> = ({text, s}) => (
  <>
    {typo(text).split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") ? (
        <span
          key={i}
          style={
            s.marker
              ? {backgroundImage: `linear-gradient(${s.accent}, ${s.accent})`, backgroundSize: "100% 42%", backgroundPosition: "0 88%", backgroundRepeat: "no-repeat", padding: "0 4px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone"}
              : {color: s.accent}
          }
        >
          {part.slice(2, -2)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

export const Kicker: React.FC<{text?: string; s: Style; style?: React.CSSProperties}> = ({text, s, style}) =>
  text ? (
    <div data-safe="" style={{fontFamily: MONO, fontWeight: 500, fontSize: MIN_FONT, lineHeight: 1.2, letterSpacing: "0.14em", textTransform: "uppercase", color: s.marker ? s.muted : s.accent, marginBottom: 20, ...style}}>
      {text}
    </div>
  ) : null;

// key — главный текст обложки: в режиме guides проверяется, что он внутри квадрата сетки профиля
export const Title: React.FC<{text?: string; s: Style; size?: number; lh?: number; isKey?: boolean; style?: React.CSSProperties}> = ({text, s, size = 76, lh = 1.08, isKey, style}) => {
  const k = useFit();
  return text ? (
    <div data-safe="" data-key={isKey ? "" : undefined} style={{fontFamily: s.head, fontWeight: s.headWeight, fontSize: Math.max(MIN_FONT, Math.round(size * k)), lineHeight: lh, letterSpacing: s.headTrack, color: s.ink, ...style}}>
      <Rich text={text} s={s} />
    </div>
  ) : null;
};

export const Body: React.FC<{text?: string; s: Style; size?: number; style?: React.CSSProperties}> = ({text, s, size = 38, style}) => {
  const k = useFit();
  return text ? (
    <div data-safe="" style={{fontFamily: s.body, fontWeight: 400, fontSize: Math.max(MIN_FONT, Math.round(size * k)), lineHeight: 1.38, color: s.bodyInk, whiteSpace: "pre-line", ...style}}>
      <Rich text={text} s={s} />
    </div>
  ) : null;
};

// маленький знак перед подписью: Aura — лимонный квадрат в графитовом ободке, GTT — синяя точка
const Dot: React.FC<{s: Style; size?: number}> = ({s, size = 16}) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: s.marker ? 3 : size,
      background: s.accent,
      border: s.marker ? "2px solid #262626" : undefined,
      boxShadow: s.marker ? undefined : "0 0 14px rgba(61,123,255,0.8)",
    }}
  />
);

// подпись к фото (что в кадре): моно 30 px, серая
export const Caption: React.FC<{text?: string; s: Style; style?: React.CSSProperties}> = ({text, s, style}) =>
  text ? (
    <div data-safe="" style={{display: "flex", alignItems: "baseline", gap: 14, fontFamily: MONO, fontWeight: 500, fontSize: MIN_FONT, lineHeight: 1.3, color: s.muted, ...style}}>
      <span style={{translate: "0 -3px"}}>
        <Dot s={s} size={14} />
      </span>
      <span>{typo(text)}</span>
    </div>
  ) : null;

// источник цифры: «Источник: IDC»
export const Source: React.FC<{text?: string; s: Style; style?: React.CSSProperties}> = ({text, s, style}) =>
  text ? (
    <div data-safe="" style={{fontFamily: MONO, fontWeight: 500, fontSize: MIN_FONT, lineHeight: 1.3, color: s.muted, ...style}}>
      Источник: {typo(text)}
    </div>
  ) : null;

// ——— плашки ———
export const Plate: React.FC<{s: Style; style?: React.CSSProperties; children: React.ReactNode}> = ({s, style, children}) => (
  <div data-safe="" style={{...s.plate, borderRadius: s.plateRadius, padding: "34px 40px", ...style}}>
    {children}
  </div>
);

// «пилюля» поверх фото: шапка (логотип, счётчик), подпись к фото
export const Pill: React.FC<{s: Style; style?: React.CSSProperties; children: React.ReactNode}> = ({s, style, children}) => (
  <div data-safe="" style={{...s.pill, height: ROW, padding: "0 22px", display: "flex", alignItems: "center", gap: 14, ...style}}>
    {children}
  </div>
);

// плашка-метка на фото: tone plain — нейтральная, dim — «было / обычно», accent — «стало / с нами»
export const Chip: React.FC<{text: string; s: Style; tone?: "plain" | "dim" | "accent"; style?: React.CSSProperties}> = ({text, s, tone = "plain", style}) => (
  <div
    data-safe=""
    style={{
      ...s.pill,
      ...(tone === "accent" ? s.chipAccent : {}),
      height: 60,
      padding: "0 24px",
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      fontFamily: s.body,
      fontWeight: 600,
      fontSize: MIN_FONT,
      color: tone === "accent" ? (s.chipAccent.color as string) : tone === "dim" && !s.marker ? "#C9D3EA" : s.marker ? s.ink : "#FFFFFF",
      ...style,
    }}
  >
    {tone === "dim" ? <span style={{color: s.marker ? s.muted : "#FF6B6F", fontWeight: 800}}>✕</span> : null}
    {tone === "accent" ? s.marker ? <Dot s={s} size={16} /> : <span style={{fontWeight: 800}}>✓</span> : null}
    {text}
  </div>
);

// стрелка «листай»
export const Swipe: React.FC<{s: Style}> = ({s}) => (
  <div data-safe="" style={{display: "flex", alignItems: "center", gap: 14, fontFamily: s.body, fontWeight: 600, fontSize: MIN_FONT, color: s.ink}}>
    листай
    <div style={{width: 64, height: 64, borderRadius: 32, background: s.accent, display: "flex", alignItems: "center", justifyContent: "center"}}>
      <svg width={30} height={30} viewBox="0 0 30 30">
        <path d="M6 15 H23 M16 8 L23 15 L16 22" fill="none" stroke={s.marker ? "#262626" : "#FFFFFF"} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  </div>
);

export const Site: React.FC<{s: Style}> = ({s}) => (
  <div data-safe="" style={{fontFamily: MONO, fontWeight: 500, fontSize: MIN_FONT, color: s.muted}}>
    {s.site}
  </div>
);

// кнопка финала: GTT — синяя со свечением, Aura — чёрная (единственная чёрная кнопка на экране)
export const CtaButton: React.FC<{text: string; s: Style; style?: React.CSSProperties}> = ({text, s, style}) => (
  <div data-safe="" style={{alignSelf: "flex-start", ...s.button, fontFamily: s.body, fontWeight: 600, fontSize: 40, lineHeight: 1.2, padding: "28px 46px", borderRadius: 999, ...style}}>
    {text} →
  </div>
);

// знак бренда в шапке
export const BrandMark: React.FC<{brand: BrandId; s: Style}> = ({brand, s}) =>
  brand === "aura" ? (
    <div data-safe="" style={{display: "flex", alignItems: "center", gap: 16}}>
      <ArMonogram width={64} color={s.ink} />
      <div style={{fontFamily: s.body, fontWeight: 600, fontSize: MIN_FONT, letterSpacing: "0.14em", color: s.ink}}>AURA ROBOTICS</div>
    </div>
  ) : (
    <div data-safe="" style={{display: "flex", alignItems: "center", gap: 14}}>
      <svg width="46" height="46" viewBox="0 0 64 64">
        <path d="M24 6 L58 46 L8 54 Z" fill="#5BB8F5" />
        <path d="M24 6 L58 46 L36 40 Z" fill="#2F8FE0" />
        <path d="M24 6 L36 40 L8 54 Z" fill="#8AD0FA" />
      </svg>
      <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: MIN_FONT, color: s.ink, letterSpacing: "0.02em"}}>GLOBAL TECH TOUR</div>
    </div>
  );

// ——— фото ———
// Фото в карточке (framed) или на весь слайд. Обрезка — object-fit: cover, focus задаёт, что оставить в кадре.
// Тёмным градиентом не заливаем (ядро стиля). children — плашки поверх фото (не обрезаются скруглением).
export const Photo: React.FC<{pic: Pic; s: Style; framed?: boolean; style?: React.CSSProperties; children?: React.ReactNode}> = ({pic, s, framed = true, style, children}) => (
  <div style={{position: "relative", minHeight: 0, ...style}}>
    <div
      data-photo=""
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: s.photo.empty,
        borderRadius: framed ? s.photo.radius : 0,
        border: framed ? s.photo.border : undefined,
        boxShadow: framed ? s.photo.shadow : undefined,
      }}
    >
      <Img
        src={staticFile(pic.src)}
        style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: pic.focus ?? "50% 50%", scale: pic.zoom ?? 1, transformOrigin: pic.focus ?? "50% 50%"}}
      />
    </div>
    {children}
  </div>
);

// логотип бренда: id из library/brands.json ("ubtech") или путь от корня репозитория
const LIB = brandsLib as Record<string, {logo?: string}>;
export const resolveLogo = (v: string): string | null => (v.includes("/") ? v : LIB[v.toLowerCase()]?.logo ?? null);
export const logoList = (v?: string | string[]): string[] =>
  (Array.isArray(v) ? v : v ? [v] : [])
    .map(resolveLogo)
    .filter((x): x is string => Boolean(x))
    .slice(0, 2); // больше двух логотипов не ставим (CONTROL/IMAGE-RULES.md, раздел 2)

// Логотип на фото — как в CONTROL/IMAGE-RULES.md (раздел 2) и logo_badge.py: внизу слева, белая плашка со скруглением,
// логотип без полей, один размер на всех слайдах (логотип 48 px, плашка 80 px, отступ от края фото 24 px).
export const LOGO = {h: 48, padX: 22, padY: 16, maxW: 240, inset: 24};
export const LogoBadges: React.FC<{logos: string[]; style?: React.CSSProperties; inline?: boolean}> = ({logos, style, inline}) =>
  logos.length ? (
    <div style={{...(inline ? {} : {position: "absolute", left: LOGO.inset, bottom: LOGO.inset}), display: "flex", gap: 12, ...style}}>
      {logos.map((src) => (
        <div
          key={src}
          data-safe=""
          style={{
            height: LOGO.h + 2 * LOGO.padY,
            padding: `0 ${LOGO.padX}px`,
            borderRadius: Math.round((LOGO.h + 2 * LOGO.padY) * 0.24),
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 3px 12px rgba(0,0,0,0.28)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Img src={staticFile(src)} style={{height: LOGO.h, width: "auto", maxWidth: LOGO.maxW, objectFit: "contain"}} />
        </div>
      ))}
    </div>
  ) : null;

// подвал внутри плашки (на слайдах с фото на весь кадр): сайт и «листай»
export const PlateFooter: React.FC<{s: Style; last: boolean}> = ({s, last}) => (
  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 22, borderTop: `2px solid ${s.line}`, height: ROW + 22, boxSizing: "border-box"}}>
    <Site s={s} />
    {last ? null : <Swipe s={s} />}
  </div>
);
