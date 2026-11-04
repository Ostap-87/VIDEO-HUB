// «多 NEWS» — манхуа-новости по статьям блога ostapdotcenko.ru (04.11.2026: «делать новости в стиле манхуа по статьям,
// которые выходят у меня в блоге… в таком же стиле, как промо-ролик для моего сайта… не более 45 секунд»; «мой сайт про
// разные ниши — надо сразу сквозной формат, чтобы, когда одно закончилось, сразу запускать следующее на следующий день»).
// Один выпуск = одна статья, ≤ 45 с, 1080×1920. Сцены всегда одни и те же — так зритель узнаёт рубрику с первой секунды:
//   хук (крик из статьи + обложка статьи) → заставка 多 NEWS (№ выпуска насквозь, сезон-ниша, N/M) → 2–3 «акта» по фактам
//   статьи (rise — взлёт, fall — падение, vs — экран файтинга) → панчлайн автора (Остап с микрофоном, облачко) →
//   финал (телефон с настоящей статьёй, адрес, «Завтра · №N+1» или «Сезон окончен · завтра новый сезон»).
// Номер, сезон и анонс следующего выпуска берутся из очереди: reels-studio/tools/blog-news/queue.py --sync.
// Факты и цитаты — только из самой статьи; мат — знаками. Манхуа-набор и шрифты — те же, что у промо «Мой сайт».
import React from "react";
import {AbsoluteFill, Freeze, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {useBrush, BRUSH} from "../components/MontazhFx";
import {FONT} from "./site-manhua/fonts";
import {
  ActionLines, Bubble, Burst, C, CL, CircleReveal, EIO, EO, Flash, GlitchReveal, Grain, Halftone, InkReveal, Letterbox,
  Narration, PageReveal, Panel, Phone, Sfx, SlashReveal, SpeedLines, Tape, Vignette, p, sumShake, typed,
} from "./site-manhua/fx";

export type BNFact = {num?: number; dec?: number; pre?: string; suf?: string; big?: string; text: string};
export type BNStory = {
  kind: "rise" | "fall"; sec: number; zh: string; kicker: string; title: string;
  img?: string; imgPos?: string; ticker?: string; // без картинки — манхуа-график на чернилах (ticker — подпись графика)
  steps: {when: string; text: string}[]; big: BNFact; mark?: string; stamp?: {text: string; sub?: string; zh?: string}; note?: string;
};
export type BNVs = {
  kind: "vs"; sec: number; zh: string; kicker: string; title: string; img: string; imgPos?: string;
  left: string; right: string; round: string; result: string; facts: BNFact[];
};
export type BNBeat = BNStory | BNVs;
export type BNNext = {n: number; title: string; season: string; zh: string; newSeason: boolean} | null;
export type BlogNewsProps = {
  show?: string; ep: number; season: {name: string; zh: string; n: number; total: number};
  title: string; date: string; slug: string; cover: string; shots: string[];
  hook: {lines: string[]; shout: string[]; sfx?: string};
  beats: BNBeat[];
  punch: {lines: string[]; zh?: string; photo: string; from?: string};
  next?: BNNext;
  music: {src: string; from?: number; drop: number; vol: number};
  // о ком статья (правка 04.11.2026: «надо указать, что это Luckin Coffee, чтобы было понимание у людей») — плашка с логотипом
  // в хуке и на каждом акте, строка в заставке
  brand?: {name: string; zh?: string; logo?: string; icon?: number}; // icon — доля ширины логотипа слева, если в нём есть и знак, и надпись (показываем только знак)
  // бегущая строка новостей внизу (с заставки до конца): ещё факты статьи сверх актов («чуть больше данных»)
  ticker?: string[];
};

const HOOK = 102, ID = 66, PUNCH = 132, FIN = 144, X = 12; // кадры (30 к/с); X — наложение соседних сцен (переход)
export const bnScenes = (P: BlogNewsProps) => {
  const d = [HOOK, ID, ...P.beats.map((b) => Math.round(b.sec * 30)), PUNCH, FIN];
  const s: [number, number][] = [];
  let t = 0;
  for (const x of d) { s.push([t, t + x]); t += x - X; }
  return s;
};
export const bnFrames = (P: BlogNewsProps) => {
  const s = bnScenes(P);
  return s[s.length - 1][1];
};

const dela = (size: number, color: string = C.ink, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT.dela, fontSize: size, color, lineHeight: 1.04, ...extra});
const RU_MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const ruDate = (iso: string) => `${Number(iso.slice(8, 10))} ${RU_MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
// число набегает от нуля, с дробной частью через запятую и пробелами в тысячах
const countNum = (f: number, at: number, dur: number, x: BNFact) => {
  if (x.num === undefined) return x.big ?? "";
  const v = x.num * p(f, at, at + dur, EO);
  const s = (x.dec ? v.toFixed(x.dec) : String(Math.round(v))).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${x.pre ?? ""}${s}${x.suf ?? ""}`;
};

// плашка «о ком»: логотип + название + китайское название, как бейдж на обложке статьи
const BrandPlate: React.FC<{b: NonNullable<BlogNewsProps["brand"]>; at: number; x: number; y: number; scale?: number; rot?: number}> = ({b, at, x, y, scale = 1, rot = -3}) => {
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

// бегущая строка новостей внизу кадра (над интерфейсом Instagram: 1478–1534)
const Ticker: React.FC<{items: string[]; show: string}> = ({items, show}) => {
  const f = useCurrentFrame();
  const k = p(f, 0, 10, EO);
  const text = items.join("   ◆   ");
  const run = `${text}   ◆   ${text}   ◆   ${text}`;
  return (
    <div style={{position: "absolute", left: 0, right: 0, top: 1478, height: 58, background: C.ink, borderTop: `4px solid ${C.y}`, borderBottom: `4px solid ${C.y}`, overflow: "hidden", translate: `0 ${(1 - k) * 80}px`}}>
      <div style={{position: "absolute", left: 230 - f * 5.2, top: 7, whiteSpace: "nowrap", fontFamily: FONT.golos, fontWeight: 800, fontSize: 32, color: "#fff"}}>{run}</div>
      <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: 210, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `6px 0 0 ${C.y}`}}>
        <span style={{fontFamily: BRUSH, fontSize: 40, color: "#fff"}}>多</span>
        <span style={{fontFamily: FONT.dela, fontSize: 30, color: "#fff"}}>{show.replace("多", "").trim() || "NEWS"}</span>
      </div>
    </div>
  );
};

const ChapterHead: React.FC<{zh: string; kicker: string; title: string; dark?: boolean}> = ({zh, kicker, title, dark}) => {
  const f = useCurrentFrame();
  const k = p(f, 2, 12, EO);
  const brush = p(f, 8, 22, EO);
  return (
    <div style={{position: "absolute", left: 64, top: 268, display: "flex", alignItems: "center", gap: 26, opacity: k, translate: `${(1 - k) * -160}px 0`}}>
      <div style={{fontFamily: FONT.zcool, fontSize: 104, color: dark ? C.y : C.ink, lineHeight: 1}}>{zh}</div>
      <div>
        <div style={{fontFamily: FONT.oswald, fontSize: 32, letterSpacing: "0.16em", color: C.red}}>{kicker}</div>
        <div style={dela(56, dark ? "#fff" : C.ink)}>{title}</div>
      </div>
      <svg width={560} height={40} style={{position: "absolute", left: 0, top: 118, overflow: "visible"}}>
        <path d="M4,22 C120,6 260,34 420,14 C470,8 520,18 556,12" fill="none" stroke={C.red} strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - brush} />
      </svg>
    </div>
  );
};

const Chip: React.FC<{x: number; y: number; at: number; rot?: number; bg?: string; color?: string; children: React.ReactNode; size?: number; maxW?: number}> = ({x, y, at, rot = 0, bg = "#fff", color = C.ink, children, size = 32, maxW}) => {
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

// ── 0. Хук: обложка статьи шлёпается, три слова ударами, облачко-крик ────────────────────────────────────────────────
const Hook: React.FC<{h: BlogNewsProps["hook"]; cover: string; brand?: BlogNewsProps["brand"]}> = ({h, cover, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bub = spring({frame: f - 52, fps, config: {damping: 10, stiffness: 220, mass: 0.6}});
  const cols = ["#fff", C.red, C.y];
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[0, 8, 18], [12, 6, 12], [20, 6, 12], [28, 10, 22], [52, 12, 24]], "hook")}}>
      <AbsoluteFill style={{background: C.ink}} />
      <SpeedLines color="#fff" opacity={0.16} cx={540} cy={620} inner={430} seed="hk" />
      <Panel x={64} y={300} w={952} h={560} at={-8} rot={-2} bg="#000">
        <Img src={staticFile(cover)} style={{width: "100%", height: "100%", objectFit: "cover", scale: String(1.12 - 0.1 * p(f, 0, 100))}} />
      </Panel>
      {brand ? <BrandPlate b={brand} at={4} x={64} y={1388} rot={-3} /> : null}
      {h.lines.map((t, i) => {
        const at = i === 0 ? -10 : 4 + 8 * i;
        if (f < at) return null;
        const s = spring({frame: f - at, fps, config: {damping: 9, stiffness: 300, mass: 0.6}});
        return <div key={i} style={{position: "absolute", left: 64, top: 910 + i * 150, ...dela(128, cols[i % 3]), scale: String(1.7 - 0.7 * s), transformOrigin: "0 50%", textShadow: `8px 8px 0 ${i === 0 ? C.red : C.ink}`}}>{t}</div>;
      })}
      {h.sfx ? <Sfx text={h.sfx} x={820} y={1330} size={160} color={C.red} stroke="#fff" rot={12} at={30} font={BRUSH} /> : null}
      {f >= 52 ? (
        <Bubble x={150} y={300} w={800} h={360} shout tail={[620, 700]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
          {h.shout.map((t, i) => <div key={i} style={dela(i ? 66 : 54, i ? C.red : C.ink)}>{t}</div>)}
        </Bubble>
      ) : null}
    </AbsoluteFill>
  );
};

// ── 1. Заставка рубрики: печать 多 + NEWS, выпуск насквозь, сезон-ниша ────────────────────────────────────────────────
const Ident: React.FC<{P: BlogNewsProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seal = spring({frame: f - 2, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  const news = spring({frame: f - 8, fps, config: {damping: 10, stiffness: 280, mass: 0.6}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[2, 12, 26], [8, 8, 16]], "id")}}>
      <Halftone bg={C.y} dot="rgba(25,25,34,.16)" />
      <SpeedLines color={C.ink} opacity={0.5} cx={540} cy={640} inner={360} seed="id" />
      <div style={{position: "absolute", left: 540 - 175, top: 300, width: 350, height: 350, background: C.seal, borderRadius: 26, boxShadow: `0 0 0 12px #fff, 18px 18px 0 12px ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", rotate: `${-8 + 4 * seal}deg`, scale: String(2.2 - 1.2 * seal)}}>
        <span style={{fontFamily: BRUSH, fontSize: 290, color: "#fff", lineHeight: 1}}>多</span>
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", ...dela(196, C.ink, {letterSpacing: "0.04em"}), scale: String(1.8 - 0.8 * news), opacity: Math.min(1, news * 2), textShadow: `10px 10px 0 #fff`}}>NEWS</div>
      <Tape x={120} y={935} at={16} font={FONT.unb} size={46} rot={-3}>{`Выпуск №${P.ep} · 第${P.ep}话`}</Tape>
      <Chip x={120} y={1050} at={24} rot={2} bg={C.red} color="#fff" size={34}>
        {`Сезон «${P.season.name}» `}<span style={{fontFamily: FONT.zcool}}>{P.season.zh}</span>{` · ${P.season.n}/${P.season.total}`}
      </Chip>
      {f >= 30 ? (
        <div style={{position: "absolute", left: 64, right: 64, top: 1170, background: C.ink, padding: "22px 30px", boxShadow: `12px 12px 0 ${C.red}`, rotate: "-1deg", opacity: p(f, 30, 36), translate: `0 ${(1 - p(f, 30, 40, EO)) * 60}px`}}>
          <div style={dela(64, C.y)}>{P.title}</div>
          {P.brand ? <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 36, color: "#fff", marginTop: 10}}>{`О ком: ${P.brand.name} `}<span style={{fontFamily: FONT.zcool, color: C.y}}>{P.brand.zh ?? ""}</span></div> : null}
          <div style={{fontFamily: FONT.mono, fontSize: 28, color: "#fff", marginTop: 10}}>{`${ruDate(P.date)} · ostapdotcenko.ru/blog`}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// график: rise — вверх (жёлтый), fall — пик и обвал (красный, с трещиной)
const Chart: React.FC<{fall: boolean; at: number; dur: number; w: number; h: number}> = ({fall, at, dur, w, h}) => {
  const f = useCurrentFrame();
  const pts = fall
    ? [[0.04, 0.62], [0.16, 0.5], [0.27, 0.56], [0.38, 0.36], [0.5, 0.42], [0.6, 0.22], [0.66, 0.3], [0.74, 0.72], [0.82, 0.66], [0.9, 0.9], [0.97, 0.93]]
    : [[0.04, 0.9], [0.15, 0.82], [0.25, 0.86], [0.36, 0.7], [0.47, 0.74], [0.58, 0.52], [0.68, 0.56], [0.79, 0.34], [0.88, 0.3], [0.96, 0.1]];
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${(x * w).toFixed(0)},${(y * h).toFixed(0)}`).join(" ");
  const k = p(f, at, at + dur, EIO);
  const col = fall ? C.red : C.y;
  return (
    <svg width={w} height={h} style={{position: "absolute", left: 0, top: 0, overflow: "visible"}}>
      <path d={d} fill="none" stroke={C.ink} strokeWidth={30} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
      <path d={d} fill="none" stroke={col} strokeWidth={16} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
      {k > 0.98 ? <polygon points={fall ? `${0.97 * w - 34},${0.93 * h - 40} ${0.97 * w + 30},${0.93 * h} ${0.97 * w - 34},${0.93 * h + 40}` : `${0.96 * w - 40},${0.1 * h + 30} ${0.96 * w + 22},${0.1 * h - 24} ${0.96 * w - 4},${0.1 * h + 56}`} fill={col} stroke={C.ink} strokeWidth={6} /> : null}
    </svg>
  );
};

// ── акт «взлёт / падение»: панель (картинка или график на чернилах), вехи, крупная цифра во взрыве, штамп, цитата ────────
const Story: React.FC<{b: BNStory; dur: number; brand?: BlogNewsProps["brand"]}> = ({b, dur, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fall = b.kind === "fall";
  const tBig = Math.round(dur * 0.4), tStamp = Math.round(dur * 0.58), tNote = Math.round(dur * 0.68), tMark = Math.round(dur * 0.3);
  const bs = spring({frame: f - tBig, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  const st = spring({frame: f - tStamp, fps, config: {damping: 8, stiffness: 320, mass: 0.6}});
  const PW = 952, PH = 460;
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tBig, 10, 20], [tStamp, 14, 30], [tMark, 8, 14]], b.title)}}>
      {fall ? <AbsoluteFill style={{background: C.ink}} /> : <Halftone bg={C.paper} dot="rgba(232,52,28,.13)" />}
      {fall ? <ActionLines color="#fff" opacity={0.12} angle={-12} /> : <SpeedLines color={C.ink} opacity={0.22} cx={540} cy={700} inner={480} seed={b.title} />}
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} dark={fall} />
      <Panel x={64} y={440} w={PW} h={PH} at={4} from={fall ? "right" : "left"} bg={b.img ? "#000" : C.ink}>
        {b.img ? (
          <Img src={staticFile(b.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 50%", scale: String(1.04 + 0.08 * p(f, 0, dur))}} />
        ) : (
          <>
            {Array.from({length: 9}).map((_, i) => <div key={`h${i}`} style={{position: "absolute", left: 0, right: 0, top: (i + 1) * 52, height: 2, background: "rgba(255,255,255,.12)"}} />)}
            {Array.from({length: 17}).map((_, i) => <div key={`v${i}`} style={{position: "absolute", top: 0, bottom: 0, left: (i + 1) * 56, width: 2, background: "rgba(255,255,255,.12)"}} />)}
            {b.ticker ? <div style={{position: "absolute", left: 30, top: 24, fontFamily: FONT.mono, fontSize: 34, color: C.y}}>{b.ticker}</div> : null}
          </>
        )}
        <div style={{position: "absolute", left: 40, top: 40, width: PW - 80, height: PH - 80}}>
          <Chart fall={fall} at={12} dur={Math.round(dur * 0.32)} w={PW - 80} h={PH - 80} />
        </div>
      </Panel>
      {brand ? <BrandPlate b={brand} at={10} x={600} y={418} scale={0.62} rot={3} /> : null}
      {b.mark ? <Sfx text={b.mark} x={300} y={790} size={70} color={fall ? C.red : C.y} stroke={fall ? "#fff" : C.ink} rot={-6} at={tMark} font={FONT.dela} /> : null}
      {b.steps.map((s, i) => (
        <Chip key={i} x={64} y={925 + i * 122} at={22 + i * 30} rot={i % 2 ? 1.5 : -1.5} bg={fall ? "#fff" : C.y} size={30} maxW={540}>
          <span style={{color: C.red, fontFamily: FONT.oswald, letterSpacing: "0.06em"}}>{s.when}</span>{"  "}{s.text}
        </Chip>
      ))}
      {f >= tBig ? (
        <>
          <Burst x={838} y={1070} r={178} color={fall ? C.red : C.y} stroke={fall ? "#fff" : C.ink} scale={0.3 + 0.7 * bs} rot={f * 0.4} seed={`${b.title}b`} />
          <div style={{position: "absolute", left: 630, width: 400, top: 1070 - 46, textAlign: "center", ...dela((b.big.big ?? `${b.big.pre ?? ""}${b.big.num ?? ""}${b.big.suf ?? ""}`).length > 9 ? 50 : (b.big.big ?? `${b.big.pre ?? ""}${b.big.num ?? ""}${b.big.suf ?? ""}`).length > 7 ? 58 : 72, fall ? "#fff" : C.ink, {textShadow: `5px 5px 0 ${fall ? C.ink : "#fff"}`, whiteSpace: "nowrap"}), scale: String(0.3 + 0.7 * bs)}}>{countNum(f, tBig, 26, b.big)}</div>
          <div style={{position: "absolute", right: 64, width: 440, top: 1262, textAlign: "right", fontFamily: FONT.golos, fontWeight: 800, fontSize: 30, lineHeight: 1.2, color: fall ? "#fff" : C.ink, opacity: p(f, tBig + 8, tBig + 14)}}>{b.big.text}</div>
        </>
      ) : null}
      {b.stamp && f >= tStamp ? (
        <div style={{position: "absolute", left: 540, top: 610, translate: "-50% -50%", rotate: "-12deg", scale: String(2.4 - 1.4 * st), opacity: Math.min(1, st * 2), border: `12px solid ${C.red}`, padding: "10px 36px", background: "rgba(255,255,255,.88)", textAlign: "center", boxShadow: `0 0 0 6px #fff`}}>
          <div style={dela(96, C.red, {letterSpacing: "0.04em"})}>{b.stamp.text}</div>
          {b.stamp.sub ? <div style={{fontFamily: FONT.mono, fontSize: 32, color: C.red}}>{b.stamp.sub}</div> : null}
          {b.stamp.zh ? <div style={{position: "absolute", right: -70, top: -60, fontFamily: BRUSH, fontSize: 96, color: C.red, rotate: "14deg"}}>{b.stamp.zh}</div> : null}
        </div>
      ) : null}
      {b.note ? <Narration x={64} y={b.note.length > 90 ? 1336 : 1352} w={952} at={tNote} font={FONT.golos} size={b.note.length > 90 ? 28 : 32} bg={fall ? C.y : "#fff"}>{b.note}</Narration> : null}
    </AbsoluteFill>
  );
};

// ── акт «VS»: экран файтинга, K.O., три цифры ────────────────────────────────────────────────────────────────────────
const Vs: React.FC<{b: BNVs; dur: number; brand?: BlogNewsProps["brand"]}> = ({b, dur, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tKo = Math.round(dur * 0.24);
  const ko = spring({frame: f - tKo, fps, config: {damping: 8, stiffness: 300, mass: 0.6}});
  const hpR = 1 - 0.92 * p(f, 18, tKo, EIO);
  const bar = (left: boolean, k: number) => (
    <div style={{position: "absolute", top: 438, [left ? "left" : "right"]: 64, width: 400, height: 92}}>
      <div style={{fontFamily: FONT.pixel, fontSize: 22, color: "#fff", textAlign: left ? "left" : "right", marginBottom: 10}}>{left ? `1P ${b.left}` : `${b.right} 2P`}</div>
      <div style={{height: 34, border: `5px solid ${C.ink}`, background: "#fff", position: "relative"}}>
        <div style={{position: "absolute", top: 0, bottom: 0, [left ? "left" : "right"]: 0, width: `${k * 100}%`, background: left ? C.y : C.red}} />
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tKo, 16, 34]], "vs")}}>
      <Halftone bg={C.red} dot="rgba(25,25,34,.2)" />
      <ActionLines color="#fff" opacity={0.18} angle={-24} seed="vs" />
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} dark />
      {bar(true, 1)}
      {bar(false, hpR)}
      <div style={{position: "absolute", left: 0, right: 0, top: 440, textAlign: "center", ...dela(84, C.y, {WebkitTextStroke: `4px ${C.ink}`, paintOrder: "stroke fill"})}}>VS</div>
      <Panel x={64} y={560} w={952} h={370} at={4} from="bottom" bg="#000">
        <Img src={staticFile(b.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 40%", scale: String(1.04 + 0.08 * p(f, 0, dur))}} />
      </Panel>
      <div style={{position: "absolute", left: 70, top: 572, fontFamily: FONT.pixel, fontSize: 26, color: C.y, textShadow: `4px 4px 0 ${C.ink}`, opacity: p(f, 6, 12)}}>{b.round}</div>
      {brand ? <BrandPlate b={brand} at={10} x={650} y={866} scale={0.6} rot={-3} /> : null}
      {f >= tKo ? (
        <>
          <div style={{position: "absolute", left: 540, top: 745, translate: "-50% -50%", rotate: "-8deg", scale: String(2.6 - 1.6 * ko), ...dela(210, C.y, {WebkitTextStroke: `10px ${C.ink}`, paintOrder: "stroke fill", textShadow: `14px 14px 0 ${C.ink}`})}}>K.O.!</div>
          <Chip x={64} y={952} at={tKo + 8} rot={-1} bg="#fff" size={30} maxW={952}>{b.result}</Chip>
        </>
      ) : null}
      {b.facts.map((x, i) => {
        const at = tKo + 26 + i * 24;
        if (f < at) return null;
        const s = spring({frame: f - at, fps, config: {damping: 11, stiffness: 260, mass: 0.6}});
        return (
          <div key={i} style={{position: "absolute", left: 64, right: 64, top: 1072 + i * 112, display: "flex", alignItems: "baseline", gap: 22, translate: `${(1 - s) * -700}px 0`}}>
            <div style={dela(72, i % 2 ? C.y : "#fff", {WebkitTextStroke: `3px ${C.ink}`, paintOrder: "stroke fill", textShadow: `6px 6px 0 ${C.ink}`, whiteSpace: "nowrap"})}>{countNum(f, at, 24, x)}</div>
            <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 30, lineHeight: 1.15, color: "#fff", textShadow: `3px 3px 0 ${C.ink}`}}>{x.text}</div>
          </div>
        );
      })}
      <Flash at={tKo} dur={5} max={0.7} />
    </AbsoluteFill>
  );
};

// ── панчлайн автора: Остап с микрофоном, облачко с цитатой из статьи ─────────────────────────────────────────────────
const Punch: React.FC<{P: BlogNewsProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ps = spring({frame: f - 4, fps, config: {damping: 11, stiffness: 200, mass: 0.8}});
  const bub = spring({frame: f - 14, fps, config: {damping: 10, stiffness: 230, mass: 0.6}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[4, 10, 20], [14, 8, 14]], "pu")}}>
      <Halftone bg={C.y} dot="rgba(25,25,34,.16)" />
      <SpeedLines color={C.ink} opacity={0.6} cx={760} cy={1250} inner={520} seed="pu" />
      <div style={{position: "absolute", left: 64, top: 1030, width: 400, rotate: "-5deg", background: "#fff", padding: "16px 16px 54px", boxShadow: `10px 10px 0 ${C.ink}`, opacity: p(f, 26, 32), translate: `0 ${(1 - p(f, 26, 40, EO)) * 120}px`}}>
        <Img src={staticFile(P.cover)} style={{width: "100%", height: 250, objectFit: "cover", display: "block"}} />
        <div style={{position: "absolute", left: 18, bottom: 10, fontFamily: FONT.hand, fontSize: 36, color: C.ink}}>из статьи ↑</div>
      </div>
      <Img
        src={staticFile(P.punch.photo)}
        style={{position: "absolute", right: -150, bottom: -60, height: 1180, scale: String(1.25 - 0.25 * ps), transformOrigin: "70% 100%", filter: "drop-shadow(7px 0 0 #fff) drop-shadow(-7px 0 0 #fff) drop-shadow(0 7px 0 #fff) drop-shadow(0 -7px 0 #fff) drop-shadow(16px 16px 0 #15151D)"}}
      />
      {f >= 14 ? (
        <Bubble x={44} y={280} w={760} h={560} shout tail={[700, 640]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
          {P.punch.lines.map((t, i) => <div key={i} style={dela(i === P.punch.lines.length - 1 ? 74 : 62, i === P.punch.lines.length - 1 ? C.red : C.ink)}>{t}</div>)}
          {P.punch.zh ? <div style={{fontFamily: BRUSH, fontSize: 42, whiteSpace: "nowrap", color: C.ink, marginTop: 8}}>{P.punch.zh}</div> : null}
        </Bubble>
      ) : null}
      {P.punch.from ? <div style={{position: "absolute", left: 70, top: 880, fontFamily: FONT.hand, fontSize: 44, color: C.red, rotate: "-3deg", opacity: p(f, 34, 42)}}>{P.punch.from}</div> : null}
    </AbsoluteFill>
  );
};

// ── финал: телефон с настоящей статьёй, адрес, анонс следующего выпуска (сквозная очередь) ─────────────────────────────
const Fin: React.FC<{P: BlogNewsProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ph = spring({frame: f - 2, fps, config: {damping: 13, stiffness: 140, mass: 0.9}});
  const card = spring({frame: f - 46, fps, config: {damping: 10, stiffness: 240, mass: 0.6}});
  const url = typed(f, 18, "ostapdotcenko.ru", 2);
  const nx = P.next;
  const keys: [number, number][] = [[0, 0], [30, 0.55], [80, 1.15]];
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[46, 10, 20]], "fin")}}>
      <Halftone bg={C.bone} dot="rgba(25,25,34,.12)" />
      <div style={{position: "absolute", left: 52, top: 290, rotate: "-4deg", scale: String(0.7 + 0.3 * ph), translate: `${(1 - ph) * -500}px 0`}}>
        <Phone w={430} imgs={P.shots} header={P.shots[0]} keys={keys} mode="strip" glareAt={20} url={`ostapdotcenko.ru/blog`} />
      </div>
      <div style={{position: "absolute", left: 540, top: 300, ...dela(80, C.ink), opacity: p(f, 6, 12)}}>Читай</div>
      <div style={{position: "absolute", left: 540, top: 386, ...dela(80, C.red), opacity: p(f, 10, 16)}}>целиком</div>
      {f >= 18 ? (
        <div style={{position: "absolute", left: 530, top: 500, rotate: "-3deg", background: C.ink, padding: "12px 20px", boxShadow: `10px 10px 0 ${C.red}`}}>
          <span style={{fontFamily: FONT.unb, fontSize: 32, color: C.y}}>{url}</span>
          <span style={{fontFamily: FONT.unb, fontSize: 32, color: C.y, opacity: Math.floor(f / 8) % 2 ? 1 : 0}}>▌</span>
        </div>
      ) : null}
      <Chip x={540} y={610} at={30} rot={2} size={28}>RU · EN · <span style={{fontFamily: FONT.zcool}}>中文</span></Chip>
      {f >= 46 ? (
        <div style={{position: "absolute", left: 530, right: 52, top: 730, background: "#fff", border: `6px solid ${C.ink}`, boxShadow: `12px 12px 0 ${C.ink}`, padding: "20px 24px", rotate: "1.5deg", scale: String(1.5 - 0.5 * card), opacity: Math.min(1, card * 2), transformOrigin: "50% 0"}}>
          <div style={{fontFamily: FONT.oswald, fontSize: 32, letterSpacing: "0.16em", color: C.red}}>{nx ? (nx.newSeason ? "СЕЗОН ОКОНЧЕН · ЗАВТРА" : "ЗАВТРА") : "СЕЗОН ОКОНЧЕН"}</div>
          {nx ? (
            <>
              {nx.newSeason ? <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 30, color: C.ink, marginTop: 6}}>{`Новый сезон «${nx.season}» `}<span style={{fontFamily: FONT.zcool}}>{nx.zh}</span></div> : null}
              <div style={{fontFamily: FONT.zcool, fontSize: 60, color: C.ink, lineHeight: 1.1, marginTop: 6}}>{`第${nx.n}话 · №${nx.n}`}</div>
              <div style={{...dela(nx.title.length > 34 ? 36 : 44, C.ink), marginTop: 8}}>{nx.title}</div>
            </>
          ) : <div style={dela(44)}>Скоро — новые выпуски</div>}
        </div>
      ) : null}
      {f >= 92 ? (
        <>
          <div style={{position: "absolute", left: 60, top: 1262, fontFamily: FONT.zcool, fontSize: 104, color: C.ink, textShadow: `8px 8px 0 #fff`, scale: String(1.5 - 0.5 * spring({frame: f - 92, fps, config: {damping: 10, stiffness: 260}})), transformOrigin: "0 50%"}}>未完待续…</div>
          <div style={{position: "absolute", left: 66, top: 1392, fontFamily: FONT.hand, fontSize: 44, color: C.red, opacity: p(f, 102, 110)}}>подпишись — новый выпуск каждый день</div>
        </>
      ) : null}
      <Letterbox h={130 * p(f, FIN - 22, FIN, EIO)} />
    </AbsoluteFill>
  );
};

// звуки: [кадр внутри сцены, файл, громкость]; "@имя" — интернет-материалы/звуки/ (CC0 / CC BY), "@zvukitop/…" — zvukitop.com
// (правка 04.11.2026: «больше эффектов звуковых добавляй, у нас их достаточно» — на каждом появлении свой звук)
type Snd = [number, string, number];
const SND_HOOK: Snd[] = [[0, "@impact-3", 0.55], [0, "@shutter-1", 0.35], [4, "@stamp-1", 0.5], [6, "@zvukitop/zt-pop", 0.3], [12, "@impact-3", 0.45], [12, "@whoosh-3", 0.25],
  [20, "@impact-3", 0.45], [20, "@whoosh-3", 0.25], [28, "@boom-1", 0.5], [30, "@zvukitop/zt-slap", 0.35], [32, "@zvukitop/zt-wrong", 0.3], [52, "@pop-2", 0.45], [54, "@impact-2", 0.4], [60, "@zvukitop/zt-aww", 0.25], [78, "@riser-2", 0.3]];
const SND_ID: Snd[] = [[0, "@whoosh-4", 0.5], [2, "@impact-1", 0.55], [2, "@zvukitop/zt-cinema-hit", 0.3], [8, "@boom-1", 0.4], [16, "@swipe-1", 0.4], [16, "@zvukitop/zt-paper", 0.3],
  [24, "@stamp-1", 0.45], [30, "@typewriter-1", 0.35], [40, "@zvukitop/zt-ding", 0.3]];
const sndStory = (b: BNStory, d: number): Snd[] => {
  const fall = b.kind === "fall";
  const tB = Math.round(d * 0.4), tS = Math.round(d * 0.58), tN = Math.round(d * 0.68), tM = Math.round(d * 0.3);
  return [
    [0, "@flip-1", 0.55], [0, fall ? "@tension-1" : "@riser-1", 0.25], [6, "@whoosh-2", 0.3], [10, "@stamp-1", 0.3], [12, fall ? "@zvukitop/zt-suspense-1" : "@sweep-1", 0.3],
    ...b.steps.map((_, i) => [22 + i * 30, i % 2 ? "@pop-2" : "@pop-1", 0.4] as Snd), ...b.steps.map((_, i) => [24 + i * 30, "@click-2", 0.3] as Snd),
    ...(b.mark ? [[tM, fall ? "@glass-1" : "@ding-2", 0.45], [tM + 2, fall ? "@zvukitop/zt-glitch-1" : "@success-1", 0.3]] as Snd[] : []),
    [tB, "@impact-3", 0.5], [tB, fall ? "@heartbeat-1" : "@zvukitop/zt-boom", 0.35],
    [tB + 4, fall ? "@error-1" : "@coin-1", 0.35], [tB + 12, fall ? "@zvukitop/zt-paper-crumple" : "@coin-2", 0.3], [tB + 22, fall ? "@cash-1" : "@zvukitop/zt-cash", 0.3],
    ...(b.stamp ? [[tS, "@stamp-1", 0.6], [tS, "@impact-4", 0.5], [tS + 2, "@zvukitop/zt-anvil", 0.3]] as Snd[] : []),
    [tN, "@typewriter-1", 0.35],
  ];
};
const sndVs = (d: number): Snd[] => {
  const k = Math.round(d * 0.24);
  return [[0, "@glitch-2", 0.45], [0, "@zvukitop/zt-glitch-2", 0.3], [6, "@beep-1", 0.4], [14, "@beep-1", 0.4], [22, "@beep-1", 0.45], [10, "@laser-1", 0.25], [18, "@whoosh-3", 0.35],
    [k, "@boom-1", 0.6], [k, "@zvukitop/zt-cinema-hit", 0.4], [k + 4, "@zvukitop/zt-horn", 0.3], [k + 8, "@pop-2", 0.4], [k + 10, "@applause-1", 0.25], [k + 14, "@cheer-1", 0.2],
    [k + 26, "@whoosh-2", 0.35], [k + 28, "@coin-1", 0.35], [k + 50, "@whoosh-2", 0.35], [k + 52, "@zvukitop/zt-cash", 0.35], [k + 74, "@whoosh-2", 0.35], [k + 76, "@coin-2", 0.35], [k + 98, "@success-1", 0.3]];
};
const SND_PUNCH: Snd[] = [[0, "@whoosh-4", 0.5], [4, "@impact-2", 0.45], [6, "@vibrate-1", 0.2], [14, "@pop-2", 0.45], [16, "@zvukitop/zt-pop", 0.3], [26, "@shutter-1", 0.35], [28, "@zvukitop/zt-paper", 0.25], [40, "@zvukitop/zt-kids-yay", 0.15]];
const SND_FIN: Snd[] = [[0, "@whoosh-1", 0.5], [2, "@swipe-1", 0.3], [18, "@typing-1", 0.35], [30, "@pop-1", 0.4], [46, "@impact-3", 0.45], [46, "@zvukitop/zt-clock", 0.3], [60, "@zvukitop/zt-ding", 0.3],
  [92, "@ding-3", 0.4], [96, "@cheer-1", 0.2], [104, "@zvukitop/zt-whoosh", 0.3]];
const sfxSrc = (n: string) => `интернет-материалы/звуки/${n.slice(1)}.wav`;

export const BlogNews: React.FC<BlogNewsProps> = (P) => {
  useBrush(true);
  const {fps} = useVideoConfig();
  const f = useCurrentFrame();
  const S = bnScenes(P);
  const total = bnFrames(P);
  const nb = P.beats.length;
  const reveal = [
    (c: React.ReactNode) => <SlashReveal dur={12}>{c}</SlashReveal>,
    (c: React.ReactNode) => <InkReveal dur={12} id="b1" x={540} y={900}>{c}</InkReveal>,
    (c: React.ReactNode) => <GlitchReveal dur={12}>{c}</GlitchReveal>,
    (c: React.ReactNode) => <PageReveal dur={14}>{c}</PageReveal>,
  ];
  const sounds: Snd[] = [
    ...SND_HOOK.map(([a, n, v]) => [S[0][0] + a, n, v] as [number, string, number]),
    ...SND_ID.map(([a, n, v]) => [S[1][0] + a, n, v] as [number, string, number]),
    ...P.beats.flatMap((b, i) => {
      const d = S[2 + i][1] - S[2 + i][0];
      return (b.kind === "vs" ? sndVs(d) : sndStory(b, d)).map(([a, n, v]) => [S[2 + i][0] + a, n, v] as [number, string, number]);
    }),
    ...SND_PUNCH.map(([a, n, v]) => [S[2 + nb][0] + a, n, v] as [number, string, number]),
    ...SND_FIN.map(([a, n, v]) => [S[3 + nb][0] + a, n, v] as [number, string, number]),
  ];
  const seq = (i: number, node: React.ReactNode) => <Sequence key={i} from={S[i][0]} durationInFrames={S[i][1] - S[i][0]} premountFor={fps}>{node}</Sequence>;
  return (
    <AbsoluteFill style={{background: C.ink, overflow: "hidden"}}>
      {seq(0, <Hook h={P.hook} cover={P.cover} brand={P.brand} />)}
      {seq(1, <CircleReveal dur={12} x={540} y={480}><Ident P={P} /></CircleReveal>)}
      {P.beats.map((b, i) => seq(2 + i, reveal[i % reveal.length](b.kind === "vs" ? <Vs b={b} dur={S[2 + i][1] - S[2 + i][0]} brand={P.brand} /> : <Story b={b} dur={S[2 + i][1] - S[2 + i][0]} brand={P.brand} />)))}
      {seq(2 + nb, <InkReveal dur={12} id="pu" x={760} y={1250}><Punch P={P} /></InkReveal>)}
      {seq(3 + nb, <CircleReveal dur={12} x={270} y={760}><Fin P={P} /></CircleReveal>)}
      {/* печать 多 — после заставки, на всех сценах, как у промо */}
      <div style={{position: "absolute", right: 64, top: 262, width: 84, height: 84, background: C.seal, color: "#fff", fontFamily: BRUSH, fontSize: 64, lineHeight: "84px", textAlign: "center", borderRadius: 10, boxShadow: "0 0 0 5px #fff", rotate: "-4deg", opacity: f < S[2][0] ? 0 : 1}}>多</div>
      {P.ticker && P.ticker.length ? (
        <Sequence from={S[1][0] + 20} durationInFrames={total - S[1][0] - 20} premountFor={fps}>
          <Ticker items={P.ticker} show={P.show ?? "多 NEWS"} />
        </Sequence>
      ) : null}
      <Grain opacity={0.13} />
      <Vignette strength={0.32} />
      <Audio
        src={staticFile(P.music.src)}
        trimBefore={Math.round((P.music.drop - S[1][0] / fps) * fps)}
        volume={(x) => interpolate(x, [0, 6, total - 40, total - 1], [0, P.music.vol, P.music.vol, 0], CL)}
      />
      {sounds.map(([at, name, vol], i) => (
        <Sequence key={`s${i}`} from={at} durationInFrames={Math.round(4 * fps)} premountFor={fps}>
          <Audio src={staticFile(sfxSrc(name))} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// проверка без полного рендера: кадр N = кадр start + N × step выпуска (или frames[N])
export const BlogNewsPreview: React.FC<BlogNewsProps & {step: number; start: number; frames?: number[]}> = ({step, start, frames, ...P}) => {
  const f = useCurrentFrame();
  const total = bnFrames(P);
  return (
    <Freeze frame={Math.min(total - 1, frames ? frames[Math.min(f, frames.length - 1)] : start + f * step)}>
      <BlogNews {...P} />
    </Freeze>
  );
};
