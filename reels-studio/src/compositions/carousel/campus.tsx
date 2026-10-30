// Слайды «Обучение в кампусах» (решение пользователя 30.10.2026: «сделай их более живыми и интересными… разбавь всё
// фотографиями из Higgsfield… показывай логотипы компаний, к которым мы едем на обучение, — креативно»; «использовать
// Remotion… интерактивные элементы, чтобы карусели и рилсы по каруселям выглядели эстетично и креативно»).
// campusPass — обложка: фото на весь слайд и «пропуск гостя кампуса» на ленте с логотипом компании;
// campusRoute — маршрут по дням: линия с точками поверх фото; campusPolaroids — 2–3 фото «полароидами» с подписями и
// наклейкой-логотипом; campusQuote — крупная цитата (миссия, принцип) на фото с логотипом.
// В Reels из карусели (живой режим, AnimContext) пропуск качается на ленте, линия маршрута прорисовывается, полароиды
// падают по очереди, цитата проявляется; в PNG всё в конечном положении.
// Туры в том же стиле (30.10.2026: «мне понравились те карусели… внедрить в других программах»): пропуск делегата с
// логотипами всех компаний маршрута (logo — список), у дней маршрута — логотипы компаний дня (logos по номеру дня,
// «a+b» — две компании), tourStamps — логотипы «штампами» на фото, tourTicket — посадочный талон: куда летим, дни и
// ночи, что входит.
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
const logosOf = (v?: string | string[]): string[] => (Array.isArray(v) ? v : v ? [v] : []).map(resolveLogo).filter((x): x is string => Boolean(x));
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
  const logos = logosOf(sl.logo);
  const many = logos.length > 1;
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
        {many ? (
          // тур: логотипы всех компаний маршрута сеткой (до 6, остальные — «+N»)
          <div style={{height: 210, display: "grid", gridTemplateColumns: `repeat(${logos.length > 4 ? 3 : 2}, 1fr)`, alignContent: "center", gap: "16px 18px", padding: "0 26px"}}>
            {logos.slice(0, logos.length > 6 ? 5 : 6).map((src, i) => (
              <div key={i} style={{height: logos.length > 4 ? 72 : 82, display: "flex", alignItems: "center", justifyContent: "center", opacity: appear(t, 0.6 + i * 0.12, 0.35)}}>
                <Img src={staticFile(src)} style={{maxHeight: logos.length > 4 ? 52 : 64, maxWidth: logos.length > 4 ? 108 : 160, objectFit: "contain"}} />
              </div>
            ))}
            {logos.length > 6 ? (
              <div style={{height: 72, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display.fontFamily, fontWeight: 700, fontSize: 40, color: "#2563EB"}}>+{logos.length - 5}</div>
            ) : null}
          </div>
        ) : (
          <div style={{height: 210, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 40px"}}>
            {logos[0] ? <Img src={staticFile(logos[0])} style={{maxHeight: 128, maxWidth: W - 90, objectFit: "contain"}} /> : null}
          </div>
        )}
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
// логотипы дня: белая плашка справа от пункта, одна или две компании
const DayLogos: React.FC<{srcs: string[]; a: number}> = ({srcs, a}) =>
  srcs.length ? (
    <div style={{flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, alignSelf: "center", scale: String(0.7 + 0.3 * a)}}>
      {srcs.map((src) => (
        <div key={src} style={{height: srcs.length > 1 ? 52 : 72, width: 168, borderRadius: 16, background: "#FFFFFF", boxShadow: "0 4px 14px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 14px"}}>
          <Img src={staticFile(src)} style={{maxHeight: srcs.length > 1 ? 34 : 46, maxWidth: 140, objectFit: "contain"}} />
        </div>
      ))}
    </div>
  ) : null;

const RouteList: React.FC<{items: string[]; s: Style; logos?: string[][]}> = ({items, s, logos}) => {
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
        // «Дни 4–5 · Шэньчжэнь — Tencent, Huawei»: своя подпись дня вместо «День N»
        const lm = it.match(/^((?:День|Дни|Дня)\s*[\d–\-, ]+)\s*·\s*(.*)$/);
        // номер дня уже в кружке: при 5+ днях подпись «День N» не повторяем (иначе не влезает), свою («Дни 4–5») — оставляем
        const label = lm ? lm[1].trim() : items.length >= 5 ? "" : `День ${i + 1}`;
        const [place, ...rest] = (lm ? lm[2] : it).split(" — ");
        const a = appear(t, 0.55 + i * 0.35, 0.45);
        return (
          <div key={i} data-safe="" style={{display: "flex", gap: 24, alignItems: "flex-start", opacity: a, translate: `${(1 - a) * 50}px 0`}}>
            <div style={{width: node, height: node, borderRadius: node / 2, flexShrink: 0, background: "#FFFFFF", boxShadow: "0 0 0 8px rgba(125,211,252,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display.fontFamily, fontWeight: 700, fontSize: 32, color: "#1D4ED8", scale: String(0.6 + 0.4 * a)}}>
              {i + 1}
            </div>
            <div style={{minWidth: 0, paddingTop: 4, flex: "1 1 0"}}>
              {label && !(items.length >= 5 && /^День \d+$/.test(label)) ? (
                <div style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT, letterSpacing: "0.1em", textTransform: "uppercase", color: s.accent}}>{label}</div>
              ) : null}
              <div style={{fontFamily: s.body, fontWeight: 700, fontSize: fs + 2, lineHeight: 1.2, color: s.ink, marginTop: 4}}>
                <Rich text={place} s={s} />
              </div>
              {rest.length ? (
                <div style={{fontFamily: s.body, fontWeight: 400, fontSize: fs, lineHeight: 1.3, color: s.bodyInk, marginTop: 4}}>
                  <Rich text={rest.join(" — ")} s={s} />
                </div>
              ) : null}
            </div>
            <DayLogos srcs={logos?.[i] ?? []} a={a} />
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
      <RouteList items={sl.items ?? []} s={s} logos={sl.logos?.map((l) => logosOf(l.src.split("+")))} />
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
      {pic.logo ? (
        <div style={{position: "absolute", right: -26, top: Math.round(w * 0.7) - 40, width: 120, height: 120, borderRadius: 60, background: "#FFFFFF", border: "6px solid #7DD3FC", boxShadow: "0 10px 24px rgba(10,25,80,0.4)", display: "flex", alignItems: "center", justifyContent: "center", rotate: `${i % 2 ? -10 : 10}deg`}}>
          <Img src={staticFile(logosOf(pic.logo)[0] ?? "")} style={{maxWidth: 82, maxHeight: 60, objectFit: "contain"}} />
        </div>
      ) : null}
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

// ——— тур: логотипы компаний маршрута «штампами» на фото ———
const ROT = [-8, 5, -3, 7, -6, 4, -2, 6, -5, 3];
const JIT = [[0, 10], [14, -8], [-10, 6], [8, 12], [-14, -6], [10, 4], [-6, -10], [12, 8], [-8, 2], [6, -4]];

const Stamp: React.FC<{src: string; name?: string; i: number; w: number; h: number; left: number; top: number}> = ({src, name, i, w, h, left, top}) => {
  const t = useAnim();
  // «шлёп»: штамп опускается сверху крупнее и встаёт на место с лёгкой отдачей
  const a = appear(t, 0.35 + i * 0.2, 0.32);
  return (
    <div
      style={{
        position: "absolute",
        left: left + JIT[i % 10][0],
        top: top + JIT[i % 10][1],
        width: w,
        height: h,
        borderRadius: 24,
        background: "#FFFFFF",
        boxShadow: `0 ${14 + (1 - a) * 30}px ${34 + (1 - a) * 30}px rgba(10,25,80,0.42)`,
        rotate: `${ROT[i % 10]}deg`,
        scale: String(1 + (1 - a) * 0.6),
        opacity: a,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: 16,
      }}
    >
      <div style={{position: "absolute", inset: 9, borderRadius: 17, border: "3px dashed rgba(37,99,235,0.55)"}} />
      <Img src={staticFile(src)} style={{maxWidth: w * 0.72, maxHeight: name ? h * 0.46 : h * 0.56, objectFit: "contain"}} />
      {name ? <div style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT - 4 < 24 ? 24 : MIN_FONT - 4, letterSpacing: "0.06em", textTransform: "uppercase", color: SOFT}}>{name}</div> : null}
    </div>
  );
};

const TourStamps: React.FC<P> = ({sl, s, last}) => {
  const list = (sl.logos ?? []).map((l) => ({src: resolveLogo(l.src), name: l.name})).filter((l): l is {src: string; name: string | undefined} => Boolean(l.src)).slice(0, 9);
  const n = list.length;
  const cols = n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const areaW = 1080 - 2 * SAFE.side;
  const areaTop = 176;
  const areaH = sl.items?.length ? 560 : 640;
  const cw = areaW / cols;
  const ch = areaH / rows;
  const w = Math.min(cw - 28, cols === 2 ? 380 : 286);
  const h = Math.min(ch - 26, 190);
  return (
    <>
      <FullPhoto sl={sl} s={s} />
      {list.map((l, i) => {
        const r = Math.floor(i / cols);
        const inRow = Math.min(cols, n - r * cols);
        const c = i % cols;
        // неполный последний ряд — по центру
        const left = SAFE.side + (areaW - inRow * cw) / 2 + c * cw + (cw - w) / 2;
        return <Stamp key={i} src={l.src} name={l.name} i={i} w={w} h={h} left={left} top={areaTop + r * ch + (ch - h) / 2} />;
      })}
      <BottomPlate s={s} last={last} top={areaTop + areaH + 10} delay={0.2}>
        <Kicker text={sl.kicker} s={s} />
        <Title text={sl.title} s={s} size={sl.titleSize ?? 62} />
        {sl.text ? <Body text={sl.text} s={s} size={34} style={{marginTop: 12}} /> : null}
        {sl.items?.length ? (
          <div style={{display: "flex", flexDirection: "column", gap: 8, marginTop: 14}}>
            {sl.items.map((it, i) => (
              <div key={i} style={{fontFamily: s.body, fontSize: 32, lineHeight: 1.3, color: s.bodyInk}}>
                <Rich text={it} s={s} />
              </div>
            ))}
          </div>
        ) : null}
      </BottomPlate>
    </>
  );
};

// ——— тур: посадочный талон — куда летим, сколько дней, что входит ———
const Plane: React.FC<{color: string}> = ({color}) => (
  <svg width="54" height="54" viewBox="0 0 24 24">
    <path fill={color} d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="rotate(90 12 12)" />
  </svg>
);

const TicketBody: React.FC<{sl: Slide; s: Style}> = ({sl, s}) => {
  const t = useAnim();
  const k = useFit();
  const tk = sl.ticket;
  const items = sl.items ?? [];
  const fly = appear(t, 0.5, 1.1);
  const fs = Math.max(MIN_FONT, Math.round(33 * k));
  const notch = (side: "left" | "right") => (
    <div style={{position: "absolute", [side]: -26, top: -26, width: 52, height: 52, borderRadius: 26, background: "#1D4BC4"}} />
  );
  return (
    <div style={{background: "#FFFFFF", borderRadius: 30, overflow: "hidden", boxShadow: "0 30px 70px rgba(10,25,80,0.45)", marginTop: 22}}>
      <div style={{background: "linear-gradient(90deg, #215BE2, #1A45B8)", borderRadius: "30px 30px 0 0", padding: "14px 30px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <span style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT, letterSpacing: "0.12em", color: "#FFFFFF"}}>ПОСАДОЧНЫЙ ТАЛОН · ДЕЛЕГАТ</span>
        <svg width="40" height="40" viewBox="0 0 64 64">
          <path d="M24 6 L58 46 L8 54 Z" fill="#E0F2FE" />
          <path d="M24 6 L58 46 L36 40 Z" fill="#7DD3FC" />
          <path d="M24 6 L36 40 L8 54 Z" fill="#BAE6FD" />
        </svg>
      </div>
      {/* маршрут: откуда → куда, самолёт летит по пунктиру */}
      <div style={{display: "flex", alignItems: "center", gap: 18, padding: `${Math.round(18 * k)}px 32px ${Math.round(10 * k)}px`}}>
        <div style={{minWidth: 0}}>
          <div style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT, color: SOFT}}>ОТКУДА</div>
          <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: Math.round(54 * k), lineHeight: 1.05, color: INK}}>{tk?.from ?? "Ваш город"}</div>
        </div>
        <div style={{position: "relative", flex: "1 1 0", height: 54, minWidth: 80}}>
          <div style={{position: "absolute", left: 0, right: 0, top: 26, borderTop: "3px dashed #93C5FD"}} />
          <div style={{position: "absolute", top: 0, left: `calc(${fly * 100}% - ${fly * 54}px)`}}>
            <Plane color="#2563EB" />
          </div>
        </div>
        <div style={{textAlign: "right", flexShrink: 0}}>
          <div style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT, color: SOFT}}>{tk?.toCity ?? ""}</div>
          <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: Math.round(76 * k), lineHeight: 1, color: "#1D4ED8"}}>{tk?.to ?? ""}</div>
        </div>
      </div>
      {tk?.stats?.length ? (
        <div style={{display: "flex", gap: 14, padding: "0 32px"}}>
          {tk.stats.map(([v, l], i) => (
            <div key={i} style={{flex: "1 1 0", background: "#EEF3FF", borderRadius: 16, padding: `${Math.round(8 * k)}px 16px`, opacity: appear(t, 0.3 + i * 0.15, 0.4)}}>
              <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: Math.round(42 * k), lineHeight: 1, color: INK}}>{v}</div>
              <div style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT, color: SOFT, textTransform: "uppercase"}}>{l}</div>
            </div>
          ))}
        </div>
      ) : null}
      {/* линия отрыва */}
      <div style={{position: "relative", margin: `${Math.round(20 * k)}px 0 ${Math.round(14 * k)}px`, borderTop: "3px dashed #C7D2FE"}}>
        {notch("left")}
        {notch("right")}
      </div>
      <div style={{padding: "0 32px", display: "flex", flexDirection: "column", gap: Math.round(10 * k)}}>
        <div style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT, letterSpacing: "0.1em", color: "#2563EB"}}>ВКЛЮЧЕНО</div>
        {items.map((it, i) => {
          const a = appear(t, 0.9 + i * 0.3, 0.4);
          return (
            <div key={i} data-safe="" style={{display: "flex", gap: 16, alignItems: "flex-start", opacity: a, translate: `${(1 - a) * 40}px 0`}}>
              <div style={{width: 40, height: 40, borderRadius: 20, background: "#16A34A", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", scale: String(0.5 + 0.5 * a)}}>
                <svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div style={{fontFamily: s.body, fontWeight: 500, fontSize: fs, lineHeight: 1.25, color: INK}}>
                <Rich text={it} s={{...s, accent: "#1D4ED8"}} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: `${Math.round(16 * k)}px 32px 20px`}}>
        <Barcode />
        <span style={{fontFamily: MONO, fontWeight: 600, fontSize: MIN_FONT, color: "#2563EB"}}>globaltechtour.ru</span>
      </div>
    </div>
  );
};

const TourTicket: React.FC<P> = ({sl, s}) => {
  const t = useAnim();
  const a = appear(t, 0.15, 0.7);
  return (
    <FitBox style={{position: "absolute", left: SAFE.side, right: SAFE.side, top: 160, bottom: 150, display: "flex", flexDirection: "column"}}>
      <Kicker text={sl.kicker} s={s} />
      <Title text={sl.title} s={s} size={sl.titleSize ?? 56} />
      <div style={{opacity: a, translate: `0 ${(1 - a) * 120}px`, rotate: `${(1 - a) * -3}deg`}}>
        <TicketBody sl={sl} s={s} />
      </div>
      {sl.text ? <Body text={sl.text} s={s} size={30} style={{marginTop: 18}} /> : null}
    </FitBox>
  );
};

export const CAMPUS_KINDS = ["campusPass", "campusRoute", "campusPolaroids", "campusQuote", "tourStamps", "tourTicket"] as const;
// на весь слайд (шапка на «пилюлях», подвал внутри плашки): всё, кроме полароидов и посадочного талона
export const campusFull = (k: string) => k === "campusPass" || k === "campusRoute" || k === "campusQuote" || k === "tourStamps";

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
    case "tourStamps":
      return <TourStamps {...p} />;
    case "tourTicket":
      return <TourTicket {...p} />;
    default:
      return null;
  }
};

