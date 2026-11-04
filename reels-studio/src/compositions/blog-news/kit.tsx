// Общие детали «多 NEWS»: шрифт заголовков, дата, счётчик цифр, плашка «о ком», заголовок главы, плашка-факт, цвет сезона.
// Вынесено из BlogNews.tsx 04.11.2026, когда появились сцены второго сезона (blog-news/acts2.tsx).
import React from "react";
import {Img, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {FONT} from "../site-manhua/fonts";
import {C, EO, p} from "../site-manhua/fx";

export type BNFact = {num?: number; dec?: number; pre?: string; suf?: string; big?: string; text: string};
export type BNBrand = {name: string; zh?: string; logo?: string; icon?: number}; // icon — доля ширины логотипа слева, если в нём и знак, и надпись

// цвет сезона (04.11.2026: «чтобы следующие ролики чуть отличались по визуалу… но сохраняли стиль манхуа»): жёлтый — первый сезон,
// у каждого следующего свой акцент (props.accent); им красятся заставка, плашки, взрывы, бегущая строка, фон панчлайна
export const AccCtx = React.createContext<string>(C.y);
export const useAcc = () => React.useContext(AccCtx);

export const dela = (size: number, color: string = C.ink, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT.dela, fontSize: size, color, lineHeight: 1.04, ...extra});
export const RU_MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
export const ruDate = (iso: string) => `${Number(iso.slice(8, 10))} ${RU_MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
// число набегает от нуля, с дробной частью через запятую и пробелами в тысячах
export const countNum = (f: number, at: number, dur: number, x: BNFact) => {
  if (x.num === undefined) return x.big ?? "";
  const v = x.num * p(f, at, at + dur, EO);
  const s = (x.dec ? v.toFixed(x.dec) : String(Math.round(v))).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${x.pre ?? ""}${s}${x.suf ?? ""}`;
};

// плашка «о ком»: логотип + название + китайское название, как бейдж на обложке статьи
export const BrandPlate: React.FC<{b: BNBrand; at: number; x: number; y: number; scale?: number; rot?: number}> = ({b, at, x, y, scale = 1, rot = -3}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 9, stiffness: 300, mass: 0.6}});
  return (
    <div style={{position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 16 * scale, background: "#fff", border: `${5 * scale}px solid ${C.ink}`, borderRadius: 18 * scale, padding: `${10 * scale}px ${22 * scale}px`, boxShadow: `${8 * scale}px ${8 * scale}px 0 ${C.ink}`, rotate: `${rot}deg`, scale: String(scale * (1.8 - 0.8 * s)), transformOrigin: "0 50%", opacity: Math.min(1, s * 2)}}>
      {b.logo ? (
        <div style={{height: 64, overflow: "hidden", width: b.icon ? 64 * b.icon * 3.64 : "auto", flexShrink: 0}}>
          <Img src={staticFile(b.logo)} style={{height: 64, width: "auto", display: "block"}} />
        </div>
      ) : null}
      <div>
        <div style={{fontFamily: FONT.dela, fontSize: 40, color: C.ink, lineHeight: 1, whiteSpace: "nowrap"}}>{b.name}</div>
        {b.zh ? <div style={{fontFamily: FONT.zcool, fontSize: 34, color: C.red, lineHeight: 1.1}}>{b.zh}</div> : null}
      </div>
    </div>
  );
};

export const ChapterHead: React.FC<{zh: string; kicker: string; title: string; dark?: boolean}> = ({zh, kicker, title, dark}) => {
  const f = useCurrentFrame();
  const acc = useAcc();
  const k = p(f, 2, 12, EO);
  const brush = p(f, 8, 22, EO);
  return (
    <div style={{position: "absolute", left: 64, top: 268, display: "flex", alignItems: "center", gap: 26, opacity: k, translate: `${(1 - k) * -160}px 0`}}>
      <div style={{fontFamily: FONT.zcool, fontSize: 104, color: dark ? acc : C.ink, lineHeight: 1}}>{zh}</div>
      <div>
        <div style={{fontFamily: FONT.oswald, fontSize: 32, letterSpacing: "0.16em", color: C.red}}>{kicker}</div>
        <div style={dela(Math.min(56, Math.floor((912 - (64 + zh.length * 104 + 26)) / (Math.max(1, title.length) * 0.6))), dark ? "#fff" : C.ink, {whiteSpace: "nowrap"})}>{title}</div>
      </div>
      <svg width={560} height={40} style={{position: "absolute", left: 0, top: 118, overflow: "visible"}}>
        <path d="M4,22 C120,6 260,34 420,14 C470,8 520,18 556,12" fill="none" stroke={C.red} strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - brush} />
      </svg>
    </div>
  );
};

export const Chip: React.FC<{x: number; y: number; at: number; rot?: number; bg?: string; color?: string; children: React.ReactNode; size?: number; maxW?: number}> = ({x, y, at, rot = 0, bg = "#fff", color = C.ink, children, size = 32, maxW}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
  return (
    <div style={{position: "absolute", left: x, top: y, maxWidth: maxW, background: bg, color, border: `5px solid ${C.ink}`, padding: "10px 20px", fontFamily: FONT.golos, fontWeight: 800, fontSize: size, lineHeight: 1.18, rotate: `${rot}deg`, scale: String(1.6 - 0.6 * s), opacity: Math.min(1, s * 2), boxShadow: `8px 8px 0 ${C.ink}`, transformOrigin: "0 50%"}}>
      {children}
    </div>
  );
};

