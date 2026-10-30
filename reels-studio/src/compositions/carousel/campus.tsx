// Слайды «Обучение в кампусах» (решение пользователя 30.10.2026: «сделай их более живыми и интересными… разбавь всё
// фотографиями из Higgsfield… показывай логотипы компаний, к которым мы едем на обучение, — креативно»; «использовать
// Remotion… интерактивные элементы, чтобы карусели и рилсы по каруселям выглядели эстетично и креативно»).
// campusPass — обложка: фото на весь слайд и «пропуск гостя кампуса» на ленте с логотипом компании;
// campusRoute — маршрут по дням: линия с точками поверх фото; campusPolaroids — 2–3 фото «полароидами» с подписями и
// наклейкой-логотипом; campusQuote — крупная цитата (миссия, принцип) на фото с логотипом.
// В Reels из карусели (живой режим, AnimContext) пропуск качается на ленте, линия маршрута прорисовывается, полароиды
// падают по очереди, цитата проявляется; в PNG всё в конечном положении.
import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import {display} from "../../fonts";
import {appear, Body, FitBox, Kicker, MIN_FONT, MONO, Photo, Plate, PlateFooter, resolveLogo, Rich, SAFE, Title, useAnim, useFit, type Style} from "./kit";
import type {Pic, Slide} from "./schema";

type P = {sl: Slide; s: Style; last: boolean};

const toPic = (p: string | Pic): Pic => (typeof p === "string" ? {src: p} : p);
const mainPic = (sl: Slide): Pic | null => (sl.image ? {src: sl.image, focus: sl.focus, zoom: sl.zoom} : sl.images?.[0] ? toPic(sl.images[0]) : null);
const logoOf = (sl: Slide): string | null => {
  const v = Array.isArray(sl.logo) ? sl.logo[0] : sl.logo;
  return v ? resolveLogo(v) : null;
};
const INK = "#14318C"; // тёмно-синий текст на белых карточках (12 : 1)
const SOFT = "#4B5D94"; // подписи на белом (6,2 : 1)

const FullPhoto: React.FC<{sl: Slide; s: Style}> = ({sl, s}) => {
  const pic = mainPic(sl);
  return <AbsoluteFill>{pic ? <Photo pic={pic} s={s} framed={false} style={{position: "absolute", inset: 0}} /> : null}</AbsoluteFill>;
};

// плашка снизу (как у фото на весь слайд): поднимается в живом режиме
const BottomPlate: React.FC<{s: Style; last: boolean; top: number; delay?: number; children: React.ReactNode}> = ({s, last, top, delay = 0.15, children}) => {
  const t = useAnim();
  const k = appear(t, delay, 0.6);
  return (
    <FitBox style={{position: "absolute", left: SAFE.side, right: SAFE.side, top, bottom: SAFE.bottom, display: "flex", flexDirection: "column"}}>
      <div style={{marginTop: "auto"}} />
      <Plate s={s} style={{padding: "34px 40px 26px", flexShrink: 0, display: "flex", flexDirection: "column", opacity: k, translate: `0 ${(1 - k) * 80}px`}}>
        {children}
        <PlateFooter s={s} last={last} />
      </Plate>
    </FitBox>
  );
};

// ——— пропуск гостя кампуса ———
const Barcode: React.FC = () => {
  const bars = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 3, 2, 1, 3, 1, 2, 1, 1, 3];
  return (
    <div style={{display: "flex", gap: 4, height: 46, alignItems: "stretch"}}>
      {bars.map((w, i) => (
        <div key={i} style={{width: w * 3, background: i % 5 === 4 ? "#7DD3FC" : INK, borderRadius: 1}} />
      ))}
    </div>
  );
};

const Pass: React.FC<{sl: Slide; s: Style}> = ({sl, s}) => {
  const t = useAnim();
  const logo = logoOf(sl);
  const pass = sl.pass;
  // качание на ленте: падает сверху и затухающе раскачивается вокруг крепления
  const drop = appear(t, 0.05, 0.7);
  const swing = t === null ? 0 : 14 * Math.exp(-1.6 * Math.max(0, t - 0.3)) * Math.cos(5.2 * Math.max(0, t - 0.3));
  const W = 430;
  return (
    <div
      style={{
        position: "absolute",
        right: 96,
        top: -40,
        width: W,
        transformOrigin: `${W / 2}px 0px`,
        rotate: `${-5 + swing}deg`,
        translate: `0 ${(1 - drop) * -700}px`,
      }}
    >
      {/* лента и карабин */}
      <div style={{position: "relative", height: 220}}>
        <div style={{position: "absolute", left: W / 2 - 22, top: 0, width: 44, height: 200, background: "linear-gradient(90deg, #1D4ED8, #2563EB 50%, #1D4ED8)", boxShadow: "0 6px 16px rgba(10,25,80,0.35)"}}>
          <div style={{position: "absolute", inset: "0 14px", borderLeft: "2px dashed rgba(255,255,255,0.45)", borderRight: "2px dashed rgba(255,255,255,0.45)"}} />
        </div>
        <div style={{position: "absolute", left: W / 2 - 34, top: 186, width: 68, height: 40, borderRadius: 14, background: "linear-gradient(180deg, #E5E7EB, #9CA3AF)", boxShadow: "0 4px 10px rgba(0,0,0,0.35)"}} />
      </div>
      {/* сам пропуск */}
      <div
        style={{
          marginTop: -6,
          background: "#FFFFFF",
          borderRadius: 30,
          overflow: "hidden",
          boxShadow: "0 30px 70px rgba(10,25,80,0.45), 0 0 0 2px rgba(255,255,255,0.6)",
        }}
      >
        <div style={{background: "linear-gradient(90deg, #215BE2, #1A45B8)", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT, letterSpacing: "0.12em", color: "#FFFFFF"}}>{pass?.role ?? "ГОСТЬ КАМПУСА"}</span>
          <svg width="40" height="40" viewBox="0 0 64 64">
            <path d="M24 6 L58 46 L8 54 Z" fill="#E0F2FE" />
            <path d="M24 6 L58 46 L36 40 Z" fill="#7DD3FC" />
            <path d="M24 6 L36 40 L8 54 Z" fill="#BAE6FD" />
          </svg>
        </div>
        <div style={{height: 210, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 40px"}}>
          {logo ? <Img src={staticFile(logo)} style={{maxHeight: 128, maxWidth: W - 90, objectFit: "contain"}} /> : null}
        </div>
        <div style={{padding: "0 28px 26px", display: "flex", flexDirection: "column", gap: 10}}>
          <div style={{height: 2, background: "repeating-linear-gradient(90deg, #C7D2FE 0 10px, transparent 10px 18px)"}} />
          {pass?.name ? <div style={{fontFamily: s.body, fontWeight: 700, fontSize: 34, lineHeight: 1.18, color: INK}}>{pass.name}</div> : null}
          {pass?.line ? <div style={{fontFamily: MONO, fontWeight: 500, fontSize: MIN_FONT, color: SOFT}}>{pass.line}</div> : null}
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6}}>
            <Barcode />
            <span style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT, color: "#2563EB"}}>GTT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CampusPass: React.FC<P> = ({sl, s, last}) => (
  <>
    <FullPhoto sl={sl} s={s} />
    <Pass sl={sl} s={s} />
    <BottomPlate s={s} last={last} top={760} delay={0.55}>
      <Kicker text={sl.kicker} s={s} />
      <Title text={sl.title} s={s} size={sl.titleSize ?? 72} lh={1.05} isKey />
      <Body text={sl.text} s={s} size={36} style={{marginTop: 14}} />
    </BottomPlate>
  </>
);

// ——— маршрут по дням ———
// пункт: «Кампус Биньцзян — модель двух двигателей» → жирное место и описание
const RouteList: React.FC<{items: string[]; s: Style}> = ({items, s}) => {
  const t = useAnim();
  const k = useFit();
  const node = 64;
  const fs = Math.max(MIN_FONT, Math.round(34 * k));
  const line = appear(t, 0.5, 0.35 * items.length + 0.4);
  return (
    <div style={{position: "relative", display: "flex", flexDirection: "column", gap: Math.round(26 * k), marginTop: 26}}>
      <div style={{position: "absolute", left: node / 2 - 3, top: node / 2, bottom: node / 2, width: 6, borderRadius: 3, background: "rgba(255,255,255,0.18)"}} />
      <div style={{position: "absolute", left: node / 2 - 3, top: node / 2, bottom: node / 2, width: 6, borderRadius: 3, background: "linear-gradient(180deg, #7DD3FC, #FFFFFF)", transformOrigin: "top", scale: `1 ${line}`}} />
      {items.map((it, i) => {
        const [place, ...rest] = it.split(" — ");
        const a = appear(t, 0.55 + i * 0.35, 0.45);
        return (
          <div key={i} data-safe="" style={{display: "flex", gap: 24, alignItems: "flex-start", opacity: a, translate: `${(1 - a) * 50}px 0`}}>
            <div style={{width: node, height: node, borderRadius: node / 2, flexShrink: 0, background: "#FFFFFF", boxShadow: "0 0 0 8px rgba(125,211,252,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display.fontFamily, fontWeight: 700, fontSize: 32, color: "#1D4ED8", scale: String(0.6 + 0.4 * a)}}>
              {i + 1}
            </div>
            <div style={{minWidth: 0, paddingTop: 4}}>
              <div style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT, letterSpacing: "0.1em", textTransform: "uppercase", color: s.accent}}>День {i + 1}</div>
              <div style={{fontFamily: s.body, fontWeight: 700, fontSize: fs + 2, lineHeight: 1.2, color: s.ink, marginTop: 4}}>
                <Rich text={place} s={s} />
              </div>
              {rest.length ? (
                <div style={{fontFamily: s.body, fontWeight: 400, fontSize: fs, lineHeight: 1.3, color: s.bodyInk, marginTop: 4}}>
                  <Rich text={rest.join(" — ")} s={s} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CampusRoute: React.FC<P> = ({sl, s, last}) => (
  <>
    <FullPhoto sl={sl} s={s} />
    <BottomPlate s={s} last={last} top={300}>
      <Kicker text={sl.kicker} s={s} />
      <Title text={sl.title} s={s} size={sl.titleSize ?? 60} />
      <RouteList items={sl.items ?? []} s={s} />
    </BottomPlate>
  </>
);

// ——— полароиды ———
const SPOTS = {
  // подписи нижнего ряда не перекрываются: верхний ряд — два фото, нижнее заходит только на край их подписей
  3: [
    {left: 0, top: 0, rot: -6},
    {left: 530, top: 30, rot: 5},
    {left: 236, top: 448, rot: -2},
  ],
  2: [
    {left: 20, top: 30, rot: -6},
    {left: 450, top: 150, rot: 5},
  ],
} as const;

const Polaroid: React.FC<{pic: Pic; s: Style; i: number; spot: {left: number; top: number; rot: number}; w: number}> = ({pic, s, i, spot, w}) => {
  const t = useAnim();
  const a = appear(t, 0.35 + i * 0.4, 0.55);
  return (
    <div
      style={{
        position: "absolute",
        left: spot.left,
        top: spot.top,
        width: w,
        padding: "18px 18px 0",
        background: "#FFFFFF",
        borderRadius: 10,
        boxShadow: "0 26px 60px rgba(10,25,80,0.45)",
        rotate: `${spot.rot + (1 - a) * (i % 2 ? 14 : -14)}deg`,
        translate: `0 ${(1 - a) * -160}px`,
        scale: String(1.15 - 0.15 * a),
        opacity: a,
      }}
    >
      {/* скотч */}
      <div style={{position: "absolute", left: "50%", top: -22, width: 150, height: 44, translate: "-50% 0", rotate: `${i % 2 ? 4 : -5}deg`, background: "rgba(186,230,253,0.78)", boxShadow: "0 2px 6px rgba(0,0,0,0.12)"}} />
      <Photo pic={{...pic, caption: undefined}} s={s} framed={false} style={{height: Math.round(w * 0.7), borderRadius: 4, overflow: "hidden"}} />
      <div data-safe="" style={{minHeight: 104, display: "flex", alignItems: "center", padding: "10px 6px 14px"}}>
        <div style={{fontFamily: s.body, fontWeight: 700, fontSize: MIN_FONT + 2, lineHeight: 1.18, color: INK}}>{pic.caption}</div>
      </div>
    </div>
  );
};

const LogoSticker: React.FC<{src: string; style?: React.CSSProperties}> = ({src, style}) => {
  const t = useAnim();
  const a = appear(t, 1.6, 0.45);
  return (
    <div
      style={{
        position: "absolute",
        width: 230,
        height: 230,
        borderRadius: 115,
        background: "#FFFFFF",
        border: "8px solid #7DD3FC",
        boxShadow: "0 18px 40px rgba(10,25,80,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        rotate: `${12 - (1 - a) * 40}deg`,
        scale: String(0.3 + 0.7 * a),
        opacity: a,
        ...style,
      }}
    >
      <Img src={staticFile(src)} style={{maxWidth: 160, maxHeight: 110, objectFit: "contain"}} />
    </div>
  );
};

const CampusPolaroids: React.FC<P> = ({sl, s}) => {
  const pics = (sl.images ?? []).map(toPic).slice(0, 3);
  const spots = pics.length === 3 ? SPOTS[3] : SPOTS[2];
  const w = pics.length === 3 ? 400 : 470;
  const logo = logoOf(sl);
  return (
    <div style={{position: "absolute", left: SAFE.side, right: SAFE.side, top: 170, bottom: 150, display: "flex", flexDirection: "column"}}>
      <Kicker text={sl.kicker} s={s} />
      <Title text={sl.title} s={s} size={sl.titleSize ?? 60} />
      <div style={{position: "relative", flex: "1 1 0", marginTop: 34}}>
        {pics.map((p, i) => (
          <Polaroid key={i} pic={p} s={s} i={i} spot={spots[i]} w={w} />
        ))}
        {logo ? <LogoSticker src={logo} style={{right: -10, bottom: 0}} /> : null}
      </div>
    </div>
  );
};

// ——— цитата на фото ———
const CampusQuote: React.FC<P> = ({sl, s, last}) => {
  const t = useAnim();
  const logo = logoOf(sl);
  const q = appear(t, 0.1, 0.8);
  return (
    <>
      <FullPhoto sl={sl} s={s} />
      <BottomPlate s={s} last={last} top={330} delay={0.25}>
        <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 200, lineHeight: 0.62, color: s.accent, textShadow: s.glow, height: 100, opacity: q, translate: `${(1 - q) * -40}px 0`}}>“</div>
        <Title text={sl.text} s={s} size={sl.titleSize ?? 58} lh={1.14} style={{marginTop: 22}} />
        <div style={{display: "flex", alignItems: "center", gap: 22, marginTop: 28}}>
          {logo ? (
            <div style={{height: 84, padding: "0 24px", borderRadius: 22, background: "#FFFFFF", display: "flex", alignItems: "center", flexShrink: 0, boxShadow: "0 6px 18px rgba(0,0,0,0.25)"}}>
              <Img src={staticFile(logo)} style={{height: 52, width: "auto", maxWidth: 240, objectFit: "contain"}} />
            </div>
          ) : null}
          {sl.author ? <div style={{fontFamily: s.body, fontWeight: 600, fontSize: MIN_FONT, lineHeight: 1.3, color: s.muted}}>{sl.author}</div> : null}
        </div>
      </BottomPlate>
    </>
  );
};

export const CAMPUS_KINDS = ["campusPass", "campusRoute", "campusPolaroids", "campusQuote"] as const;
// на весь слайд (шапка на «пилюлях», подвал внутри плашки): всё, кроме полароидов
export const campusFull = (k: string) => k === "campusPass" || k === "campusRoute" || k === "campusQuote";

export const CampusSlide: React.FC<P> = (p) => {
  switch (p.sl.kind) {
    case "campusPass":
      return <CampusPass {...p} />;
    case "campusRoute":
      return <CampusRoute {...p} />;
    case "campusPolaroids":
      return <CampusPolaroids {...p} />;
    case "campusQuote":
      return <CampusQuote {...p} />;
    default:
      return null;
  }
};

