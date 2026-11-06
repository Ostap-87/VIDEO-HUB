// Версия 2 манхуа-объяснялок (06.11.2026). Пользователь: «надо сделать ролики понятные, которые будут объяснять суть того, чему
// соответствует обложка». Ролик = обложка → вступление → пункты обложки по порядку («1/3 → 2/3 → 3/3», заголовок главы — формулировка
// обложки, одна наглядная демонстрация + одна короткая фраза) → итог: пункты галочками и призыв с обложки. Спокойный темп: текст
// держится ≥ 3 с, до ~12 слов в кадре, крупный шрифт, мало одновременных элементов.
import React from "react";
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {BRUSH} from "../../components/MontazhFx";
import {FONT} from "../site-manhua/fonts";
import {Burst, C, EIO, EO, Flash, HandArrow, Halftone, Letterbox, Sfx, SpeedLines, p} from "../site-manhua/fx";
import {dela} from "../blog-news/kit";

type DemoWall = {type: "wallToPanel"; wall: string; img: string; imgPos?: string; badLabel: string; goodLabel: string};
type DemoPhone = {type: "phoneHand"; feed: string[]; badges: string[]};
type DemoMemory = {type: "memory"; img: string; imgPos?: string; picLabel: string; phraseLabel: string; okLabel: string; badLabel: string; noLabel: string; wall: string};
type DemoArticle = {type: "articleToEpisode"; article: string; articlePos?: string; articleLabel: string; episode: string; timer: number};
type DemoTopics = {type: "topics"; img: string; imgPos?: string; labels: {text: string; x: number; y: number}[]};
type DemoDaily = {type: "dailyClock"; from: string; to: string; time: string; zh: string};
type DemoLangs = {type: "threeLangs"; imgs: string[]; tags: string[]; caption?: string};
export type OdxDemo = DemoWall | DemoPhone | DemoMemory | DemoArticle | DemoTopics | DemoDaily | DemoLangs;

export type OdxCover = {kind: "cover"; sec: number; img: string};
export type OdxIntro = {kind: "intro"; sec: number; text: string; zh?: string; photo: string; photoH?: number};
export type OdxPoint = {kind: "point"; sec: number; n: number; total: number; title: string; titleSize?: number; line: string; demo: OdxDemo; bg?: "paper" | "bone" | "yellow"};
export type OdxRecap = {kind: "recap"; sec: number; points: string[]; cta?: string; url: string; handle?: string; photo: string; photoH?: number};
export type OdxScene3 = OdxCover | OdxIntro | OdxPoint | OdxRecap;

const CUT = "drop-shadow(7px 0 0 #fff) drop-shadow(-7px 0 0 #fff) drop-shadow(0 7px 0 #fff) drop-shadow(0 -7px 0 #fff) drop-shadow(16px 16px 0 #15151D)";

// фон обложки: жёлтые лучи + растр
const SunBg: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.y}}>
      <AbsoluteFill style={{background: `repeating-conic-gradient(from ${(f * 0.12).toFixed(2)}deg at 50% 38%, rgba(255,255,255,.34) 0deg 7deg, rgba(255,255,255,0) 7deg 15deg)`}} />
      <AbsoluteFill style={{backgroundImage: "radial-gradient(rgba(25,25,34,.12) 2.4px, transparent 3px)", backgroundSize: "22px 22px"}} />
    </AbsoluteFill>
  );
};

// текст с **выделением** маркером
const Marked: React.FC<{text: string; mark?: string}> = ({text, mark = C.y}) => (
  <>
    {text.split("**").map((t, i) => (i % 2 ? <span key={i} style={{background: mark, boxShadow: `0 0 0 4px ${mark}`, fontWeight: 900}}>{t}</span> : <React.Fragment key={i}>{t}</React.Fragment>))}
  </>
);

// иероглифы внутри русского текста: 多 — кистью, остальные — ZCOOL (в Dela Gothic их нет)
const Duo: React.FC<{text: string; color?: string}> = ({text, color = C.seal}) => (
  <>{text.split(/([\u4e00-\u9fff]+)/).map((x, j) => (j % 2 === 0 ? <React.Fragment key={j}>{x}</React.Fragment>
    : x === "多" ? <span key={j} style={{fontFamily: BRUSH, color}}>多</span> : <span key={j} style={{fontFamily: FONT.zcool}}>{x}</span>))}</>
);

// ── 0. обложка целиком (1 с), потом переход ──────────────────────────────────────────────────────────────────────────
export const CoverAct: React.FC<{s: OdxCover; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.y}}>
      <Img src={staticFile(s.img)} style={{width: 1080, height: 1920, objectFit: "cover", scale: String(1 + 0.025 * p(f, 0, dur))}} />
    </AbsoluteFill>
  );
};

// ── вступление: облачко-вопрос с обложки, вырезка автора ─────────────────────────────────────────────────────────────
export const IntroAct: React.FC<{s: OdxIntro; dur: number}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ph = spring({frame: f - 2, fps, config: {damping: 13, stiffness: 150, mass: 0.9}});
  const bub = spring({frame: f - 8, fps, config: {damping: 11, stiffness: 200, mass: 0.7}});
  const H = s.photoH ?? 1000;
  return (
    <AbsoluteFill>
      <SunBg />
      <Img src={staticFile(s.photo)} style={{position: "absolute", right: -90, bottom: 200, height: H, filter: CUT, translate: `${(1 - ph) * 600}px 0`}} />
      <div style={{position: "absolute", left: 56, top: 300, width: 900, scale: String(0.4 + 0.6 * bub), opacity: Math.min(1, bub * 2), transformOrigin: "85% 100%"}}>
        <div style={{position: "relative", background: "#fff", border: `8px solid ${C.ink}`, borderRadius: 44, boxShadow: `16px 16px 0 ${C.ink}`, padding: "44px 48px 40px"}}>
          <div style={{fontFamily: FONT.golos, fontWeight: 900, fontSize: 84, lineHeight: 1.12, color: C.ink}}><Marked text={s.text} /></div>
          {s.zh ? <div style={{fontFamily: BRUSH, fontSize: 84, color: C.red, marginTop: 18, opacity: p(f, 26, 34)}}>{s.zh}</div> : null}
          <svg width={80} height={90} style={{position: "absolute", right: 120, bottom: -86}} viewBox="0 0 80 90"><path d="M0,0 L80,0 L58,86 Z" fill="#fff" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" /><rect x={4} y={-8} width={72} height={12} fill="#fff" /></svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// шапка пункта: «1/3» и полоска прогресса, заголовок — формулировка обложки
const PointHead: React.FC<{n: number; total: number; title: string; size: number}> = ({n, total, title, size}) => {
  const f = useCurrentFrame();
  const k = p(f, 2, 12, EO);
  return (
    <>
      <div style={{position: "absolute", left: 64, top: 262, display: "flex", alignItems: "center", gap: 22, opacity: k, translate: `${(1 - k) * -120}px 0`}}>
        <div style={{background: C.ink, color: C.y, fontFamily: FONT.dela, fontSize: 56, lineHeight: 1, padding: "10px 22px 14px", boxShadow: `8px 8px 0 ${C.red}`}}>{`${n}/${total}`}</div>
        <div style={{display: "flex", gap: 10}}>
          {Array.from({length: total}).map((_, i) => (
            <div key={i} style={{width: 74, height: 18, border: `4px solid ${C.ink}`, background: "#fff", position: "relative", overflow: "hidden"}}>
              <div style={{position: "absolute", inset: 0, background: C.red, transformOrigin: "0 50%", scale: `${i < n - 1 ? 1 : i === n - 1 ? p(f, 6, 22, EIO) : 0} 1`}} />
            </div>
          ))}
        </div>
      </div>
      <div style={{position: "absolute", left: 64, right: 150, top: 372, ...dela(size, C.ink), lineHeight: 1.06, opacity: p(f, 6, 12), translate: `0 ${(1 - p(f, 6, 18, EO)) * 40}px`}}>
        <Duo text={title} color={C.red} />
      </div>
    </>
  );
};

// короткая фраза пункта — крупно на плашке внизу
const PointLine: React.FC<{text: string; at: number}> = ({text, at}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = p(f, at, at + 10, EO);
  return (
    <div style={{position: "absolute", left: 64, right: 64, top: 1326, background: "#fff", border: `6px solid ${C.ink}`, boxShadow: `10px 10px 0 ${C.red}`, padding: "16px 26px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 56, lineHeight: 1.14, color: C.ink, opacity: k, translate: `${(1 - k) * -80}px 0`}}>
      <Marked text={text} />
    </div>
  );
};

const Tag: React.FC<{x: number; y: number; at: number; children: React.ReactNode; bg?: string; color?: string; rot?: number; size?: number}> = ({x, y, at, children, bg = C.ink, color = "#fff", rot = -2, size = 52}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const k = spring({frame: f - at, fps, config: {damping: 11, stiffness: 240, mass: 0.6}});
  return <div style={{position: "absolute", left: x, top: y, background: bg, color, fontFamily: FONT.dela, fontSize: size, lineHeight: 1.05, padding: "8px 18px 12px", border: `5px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.ink}`, rotate: `${rot}deg`, scale: String(1.5 - 0.5 * k), opacity: Math.min(1, k * 2), whiteSpace: "nowrap"}}>{children}</div>;
};

const Frame: React.FC<{x: number; y: number; w: number; h: number; children: React.ReactNode; at?: number; rot?: number; sh?: string}> = ({x, y, w, h, children, at = 0, rot = 0, sh = C.ink}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const k = spring({frame: f - at, fps, config: {damping: 13, stiffness: 200, mass: 0.7}});
  return <div style={{position: "absolute", left: x, top: y, width: w, height: h, border: `8px solid ${C.ink}`, boxShadow: `12px 12px 0 ${sh}`, overflow: "hidden", background: "#fff", rotate: `${rot}deg`, scale: String(1.15 - 0.15 * k), opacity: Math.min(1, k * 2)}}>{children}</div>;
};

// ── демонстрации ─────────────────────────────────────────────────────────────────────────────────────────────────────
const WallToPanel: React.FC<{d: DemoWall; dur: number}> = ({d}) => {
  const f = useCurrentFrame();
  const T = 104; // момент превращения
  const r = p(f, T, T + 22, EIO) * 1300;
  return (
    <>
      <Frame x={64} y={600} w={952} h={690} at={2} rot={-1}>
        <div style={{position: "absolute", inset: 0, background: "#EFEDE6", padding: "40px 44px 0", overflow: "hidden"}}>
          <div lang="ru" style={{fontFamily: FONT.golos, fontWeight: 600, fontSize: 25, lineHeight: 1.36, color: "#8F8B80", textAlign: "justify", hyphens: "auto", translate: `0 ${(-f * 0.5).toFixed(1)}px`}}>{d.wall}</div>
        </div>
        <div style={{position: "absolute", inset: 0, clipPath: `circle(${r.toFixed(0)}px at 50% 50%)`}}>
          <Img src={staticFile(d.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: d.imgPos ?? "50% 30%", scale: String(1.08 - 0.06 * p(f, T, T + 120))}} />
        </div>
      </Frame>
      <Flash at={T + 6} dur={6} max={0.5} />
      {f < T ? <Tag x={96} y={630} at={20} bg="#fff" color={C.ink} size={60}>{`✗ ${d.badLabel}`}</Tag> : <Tag x={96} y={630} at={T + 16} bg={C.y} color={C.ink} size={60}>{`✓ ${d.goodLabel}`}</Tag>}
      {f >= T + 16 ? <Sfx text="哇!" x={790} y={640} size={130} color={C.y} rot={-10} at={T + 20} font={BRUSH} /> : null}
    </>
  );
};

// рука, держащая телефон (чернильный контур, кожа — тёплый тон)
const Hand: React.FC = () => (
  <svg width={520} height={420} viewBox="0 0 520 420" style={{position: "absolute", left: -50, top: 470, overflow: "visible"}}>
    <g stroke={C.ink} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" fill="#F3C8A2">
      <path d="M150,120 C120,180 110,260 130,330 L150,420 L370,420 L380,330 C420,280 440,220 430,160 L400,80 C390,60 360,60 352,84 L340,160 Z" />
      <path d="M60,40 C40,40 30,62 40,80 L80,120 C92,132 112,128 116,112 C120,98 114,86 104,78 Z" />
      <path d="M50,110 C30,112 24,136 38,150 L82,186 C96,196 114,190 118,174 C120,160 112,150 102,144 Z" />
      <path d="M58,182 C40,186 36,210 52,222 L92,250 C106,258 122,250 124,234 C124,222 116,214 106,210 Z" />
      <path d="M460,40 C482,30 500,50 490,72 L440,170 C430,186 406,186 400,168 C396,156 400,146 408,138 Z" />
    </g>
  </svg>
);

const PhoneHand: React.FC<{d: DemoPhone; dur: number}> = ({d, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ph = spring({frame: f - 2, fps, config: {damping: 14, stiffness: 140, mass: 0.9}});
  const W = 390, SW = W - 28, SH = Math.round((SW * 16) / 9);
  const every = Math.max(50, Math.floor((dur - 40) / d.feed.length));
  let pos = 0;
  for (let i = 1; i < d.feed.length; i++) pos += p(f, 20 + i * every, 30 + i * every, EIO);
  const sec = Math.min(59, Math.floor(p(f, 14, dur - 20) * 58));
  return (
    <>
      <div style={{position: "absolute", left: 345, top: 590, rotate: "-6deg", translate: `0 ${(1 - ph) * 900}px`}}>
        <div style={{position: "relative", width: W, height: SH + 28, borderRadius: 52, background: "#0d0d12", padding: 14, boxShadow: `14px 16px 0 ${C.red}`}}>
          <div style={{position: "relative", width: SW, height: SH, borderRadius: 40, overflow: "hidden", background: "#000"}}>
            <div style={{position: "absolute", left: 0, top: 0, width: SW, translate: `0 ${(-pos * SH).toFixed(1)}px`}}>
              {d.feed.map((src) => <Img key={src} src={staticFile(src)} style={{display: "block", width: SW, height: SH, objectFit: "cover"}} />)}
            </div>
            <div style={{position: "absolute", left: 16, right: 16, bottom: 18, display: "flex", alignItems: "center", gap: 10}}>
              <div style={{flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,.35)", overflow: "hidden"}}><div style={{width: `${(sec / 59) * 100}%`, height: "100%", background: C.y}} /></div>
              <span style={{fontFamily: FONT.mono, fontSize: 24, color: "#fff", textShadow: "2px 2px 0 #000"}}>{`0:${String(sec).padStart(2, "0")}`}</span>
            </div>
          </div>
        </div>
        <Hand />
      </div>
      {/* значок «без звука» */}
      {f >= 34 ? (
        <div style={{position: "absolute", left: 70, top: 690, width: 190, height: 190, borderRadius: "50%", background: "#fff", border: `7px solid ${C.ink}`, boxShadow: `8px 8px 0 ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", scale: String(1.5 - 0.5 * spring({frame: f - 34, fps, config: {damping: 10, stiffness: 240}}))}}>
          <svg width={120} height={120} viewBox="0 0 120 120"><path d="M14,44 L40,44 L70,18 L70,102 L40,76 L14,76 Z" fill={C.ink} /><path d="M84,40 L112,80 M112,40 L84,80" stroke={C.red} strokeWidth={10} strokeLinecap="round" /></svg>
        </div>
      ) : null}
      {d.badges.map((b, i) => <Tag key={i} x={i ? 740 : 770} y={i ? 1150 : 640} at={64 + i * 30} bg={i ? C.y : "#fff"} color={C.ink} rot={i ? -4 : 4} size={60}>{b}</Tag>)}
    </>
  );
};

const Memory: React.FC<{d: DemoMemory; dur: number}> = ({d}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rs = spring({frame: f - 58, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  const fade = p(f, 130, 170, EIO);
  const op = (t: string, x: number, y: number, at: number) => (f < at ? null : <div style={{position: "absolute", left: x, top: y, ...dela(90, C.red, {WebkitTextStroke: `4px ${C.ink}`, paintOrder: "stroke fill"}), scale: String(1.5 - 0.5 * p(f, at, at + 8, EO))}}>{t}</div>);
  return (
    <>
      <Frame x={64} y={610} w={300} h={250} at={8} rot={-2}>
        <Img src={staticFile(d.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: d.imgPos ?? "60% 50%"}} />
      </Frame>
      <Tag x={70} y={880} at={14} bg="#fff" color={C.ink} size={48}>{d.picLabel}</Tag>
      {op("+", 384, 680, 24)}
      {f >= 30 ? (
        <div style={{position: "absolute", left: 452, top: 630, width: 250, height: 200, scale: String(1.4 - 0.4 * p(f, 30, 40, EO)), opacity: p(f, 30, 36)}}>
          <svg width={250} height={200} viewBox="0 0 250 200"><path d="M14,14 H236 V140 H96 L52,188 L60,140 H14 Z" fill="#fff" stroke={C.ink} strokeWidth={9} strokeLinejoin="round" /><rect x={44} y={52} width={160} height={16} fill={C.ink} /><rect x={44} y={86} width={100} height={16} fill={C.red} /></svg>
        </div>
      ) : null}
      <Tag x={470} y={880} at={36} bg="#fff" color={C.ink} size={48}>{d.phraseLabel}</Tag>
      {op("=", 718, 680, 50)}
      {f >= 58 ? (
        <>
          <Burst x={905} y={740} r={130} color={C.y} scale={0.3 + 0.7 * rs} rot={f * 0.3} seed="mem" />
          <div style={{position: "absolute", left: 905, top: 740, translate: "-50% -50%", scale: String(0.3 + 0.7 * rs), ...dela(110, C.ink)}}>✓</div>
          <Tag x={790} y={880} at={64} bg={C.y} color={C.ink} size={48}>{d.okLabel}</Tag>
        </>
      ) : null}
      {f >= 92 ? (
        <>
          <div style={{position: "absolute", left: 64, top: 1020, width: 600, height: 200, background: "#E6E3DA", border: `6px solid #8E8B83`, overflow: "hidden", padding: "18px 22px", opacity: p(f, 92, 100) * (1 - 0.75 * fade), filter: `blur(${(fade * 5).toFixed(1)}px)`}}>
            <div lang="ru" style={{fontFamily: FONT.golos, fontWeight: 600, fontSize: 20, lineHeight: 1.3, color: "#77746C", textAlign: "justify", hyphens: "auto"}}>{d.wall}</div>
          </div>
          <Tag x={84} y={1196} at={100} bg="#fff" color="#77746C" size={48}>{d.badLabel}</Tag>
          {op("=", 690, 1060, 108)}
          <Tag x={772} y={1076} at={118} bg={C.red} color="#fff" size={52}>{`✗ ${d.noLabel}`}</Tag>
        </>
      ) : null}
    </>
  );
};

const ArticleToEpisode: React.FC<{d: DemoArticle; dur: number}> = ({d, dur}) => {
  const f = useCurrentFrame();
  const W = 380, SW = W - 28, SH = Math.round((SW * 16) / 9);
  const sec = Math.min(d.timer, Math.floor(p(f, 70, Math.min(dur - 30, 200)) * d.timer));
  return (
    <>
      <Frame x={64} y={630} w={420} h={520} at={4} rot={-2}>
        <Img src={staticFile(d.article)} style={{width: "100%", height: 290, objectFit: "cover", objectPosition: d.articlePos ?? "50% 40%", display: "block"}} />
        <div style={{padding: "18px 24px"}}>
          {[0.92, 0.8, 0.95, 0.7, 0.88].map((w, i) => <div key={i} style={{height: 16, width: `${w * 100}%`, background: "#C9C5BA", marginBottom: 18}} />)}
        </div>
      </Frame>
      <Tag x={84} y={1110} at={14} bg="#fff" color={C.ink} size={50}>{d.articleLabel}</Tag>
      <HandArrow x={470} y={840} w={180} h={120} at={40} dur={14} d="M8,60 C60,20 110,24 160,58 M132,30 L164,60 L128,86" sw={12} />
      <div style={{position: "absolute", left: 640, top: 600, rotate: "3deg", opacity: p(f, 54, 60), translate: `${(1 - p(f, 54, 70, EO)) * 400}px 0`}}>
        <div style={{position: "relative", width: W, height: SH + 28, borderRadius: 50, background: "#0d0d12", padding: 14, boxShadow: `14px 16px 0 ${C.red}`}}>
          <div style={{position: "relative", width: SW, height: SH, borderRadius: 38, overflow: "hidden"}}>
            <Img src={staticFile(d.episode)} style={{width: SW, height: SH, objectFit: "cover"}} />
            <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 92, background: "rgba(21,21,29,.88)", display: "flex", alignItems: "center", justifyContent: "center", gap: 14}}>
              <svg width={44} height={44} viewBox="0 0 44 44"><circle cx={22} cy={22} r={21} fill={C.red} /><path d="M17,12 L33,22 L17,32 Z" fill="#fff" /></svg>
              <span style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 52, color: C.y}}>{`0:${String(sec).padStart(2, "0")}`}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Topics: React.FC<{d: DemoTopics; dur: number}> = ({d, dur}) => {
  const f = useCurrentFrame();
  return (
    <>
      <Frame x={40} y={600} w={1000} h={700} at={2}>
        <Img src={staticFile(d.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: d.imgPos ?? "50% 40%", scale: String(1.02 + 0.06 * p(f, 0, dur))}} />
      </Frame>
      {d.labels.map((l, i) => <Tag key={i} x={l.x} y={l.y} at={22 + i * 22} bg={i % 2 ? C.y : "#fff"} color={C.ink} rot={i % 2 ? 2 : -2} size={56}>{l.text}</Tag>)}
    </>
  );
};

const MONTHS = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];
const Daily: React.FC<{d: DemoDaily; dur: number}> = ({d}) => {
  const f = useCurrentFrame();
  const days: Date[] = [];
  const t = new Date(`${d.from}T12:00:00Z`), e = new Date(`${d.to}T12:00:00Z`);
  while (t <= e) { days.push(new Date(t)); t.setUTCDate(t.getUTCDate() + 1); }
  const pos = p(f, 16, 150) * (days.length - 1);
  const idx = Math.floor(pos), fr = pos - idx;
  const page = (dd: Date, extra: React.CSSProperties = {}) => (
    <div style={{position: "absolute", inset: 0, background: "#fff", border: `8px solid ${C.ink}`, ...extra}}>
      <div style={{height: 104, background: C.red, borderBottom: `8px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.oswald, fontSize: 50, letterSpacing: "0.12em", color: "#fff"}}>{MONTHS[dd.getUTCMonth()]}</div>
      <div style={{textAlign: "center", ...dela(250, C.ink), lineHeight: 1.12}}>{dd.getUTCDate()}</div>
    </div>
  );
  // часы: стрелки приходят к time (часовая на 9, минутная на 12)
  const [hh, mm] = d.time.split(":").map(Number);
  const k = p(f, 10, 70, EO);
  const hA = (hh % 12) * 30 + mm * 0.5, mA = mm * 6;
  const hand = (deg: number, len: number, w: number, col: string) => <line x1={150} y1={150} x2={150 + Math.sin((deg * Math.PI) / 180) * len} y2={150 - Math.cos((deg * Math.PI) / 180) * len} stroke={col} strokeWidth={w} strokeLinecap="round" />;
  return (
    <>
      <div style={{position: "absolute", left: 64, top: 640, width: 440, height: 450, rotate: "-3deg", boxShadow: `14px 14px 0 ${C.ink}`}}>
        {page(days[Math.min(days.length - 1, idx + 1)])}
        {idx < days.length - 1 ? page(days[idx], {translate: `${-fr * 600}px ${fr * 80}px`, rotate: `${-fr * 30}deg`, opacity: 1 - fr * 0.5}) : page(days[days.length - 1])}
        {Array.from({length: 4}).map((_, i) => <div key={i} style={{position: "absolute", top: -20, left: 56 + i * 100, width: 24, height: 44, borderRadius: 12, background: C.ink, border: "4px solid #fff"}} />)}
      </div>
      <div style={{position: "absolute", left: 600, top: 630, width: 400, height: 400, rotate: "3deg", opacity: p(f, 6, 14)}}>
        <svg width={400} height={400} viewBox="0 0 300 300">
          <circle cx={150} cy={150} r={136} fill="#fff" stroke={C.ink} strokeWidth={14} />
          {Array.from({length: 12}).map((_, i) => <line key={i} x1={150 + Math.sin((i * 30 * Math.PI) / 180) * 112} y1={150 - Math.cos((i * 30 * Math.PI) / 180) * 112} x2={150 + Math.sin((i * 30 * Math.PI) / 180) * 126} y2={150 - Math.cos((i * 30 * Math.PI) / 180) * 126} stroke={C.ink} strokeWidth={i % 3 ? 5 : 10} />)}
          {hand(hA * k + 360 * (1 - k) * 2, 70, 14, C.ink)}
          {hand(mA * k + 720 * (1 - k) * 3, 104, 9, C.red)}
          <circle cx={150} cy={150} r={12} fill={C.ink} />
        </svg>
      </div>
      <Tag x={630} y={1070} at={72} bg={C.y} color={C.ink} size={76}>{d.time}</Tag>
      <Tag x={846} y={1196} at={84} bg={C.ink} color="#fff" size={52}><span style={{fontFamily: BRUSH, fontSize: 56}}>{d.zh}</span></Tag>
    </>
  );
};

const ThreeLangs: React.FC<{d: DemoLangs; dur: number}> = ({d}) => {
  const f = useCurrentFrame();
  const W = 296, G = 32;
  return (
    <>
      {d.imgs.map((src, i) => {
        const at = 6 + i * 18;
        return (
          <React.Fragment key={i}>
            <Frame x={64 + i * (W + G)} y={690} w={W} h={540} at={at} rot={[-3, 0, 3][i]} sh={i === 2 ? C.red : C.ink}>
              <Img src={staticFile(src)} style={{width: "100%", height: "auto", display: "block"}} />
            </Frame>
            <Tag x={64 + i * (W + G) + 60} y={612} at={at + 6} bg={i === 2 ? C.red : C.ink} color={i === 2 ? "#fff" : C.y} size={58} rot={[-3, 0, 3][i]}>
              {d.tags[i] === "中文" ? <span style={{fontFamily: FONT.zcool}}>中文</span> : d.tags[i]}
            </Tag>
          </React.Fragment>
        );
      })}
      {d.caption ? <Tag x={330} y={1240} at={82} bg={C.y} color={C.ink} size={48} rot={0}>{d.caption}</Tag> : null}
    </>
  );
};

export const PointAct: React.FC<{s: OdxPoint; dur: number}> = ({s, dur}) => {
  const d = s.demo;
  const bg = s.bg ?? "paper";
  return (
    <AbsoluteFill>
      {bg === "yellow" ? <Halftone bg={C.y} dot="rgba(25,25,34,.14)" /> : <Halftone bg={bg === "bone" ? C.bone : C.paper} dot="rgba(25,25,34,.08)" />}
      <SpeedLines color={C.ink} opacity={0.06} cx={540} cy={920} inner={560} seed={`pt${s.n}`} />
      <PointHead n={s.n} total={s.total} title={s.title} size={s.titleSize ?? 84} />
      {d.type === "wallToPanel" ? <WallToPanel d={d} dur={dur} /> : d.type === "phoneHand" ? <PhoneHand d={d} dur={dur} /> : d.type === "memory" ? <Memory d={d} dur={dur} />
        : d.type === "articleToEpisode" ? <ArticleToEpisode d={d} dur={dur} /> : d.type === "topics" ? <Topics d={d} dur={dur} /> : d.type === "dailyClock" ? <Daily d={d} dur={dur} /> : <ThreeLangs d={d} dur={dur} />}
      <PointLine text={s.line} at={28} />
    </AbsoluteFill>
  );
};

// ── итог: пункты обложки галочками + призыв с обложки ───────────────────────────────────────────────────────────────
export const RecapAct: React.FC<{s: OdxRecap; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ph = spring({frame: f - 2, fps, config: {damping: 13, stiffness: 150, mass: 0.9}});
  const tC = 8 + s.points.length * 10 + 4;
  return (
    <AbsoluteFill>
      <SunBg />
      <Img src={staticFile(s.photo)} style={{position: "absolute", right: -100, bottom: 0, height: s.photoH ?? 760, filter: CUT, translate: `${(1 - ph) * 600}px 0`}} />
      {s.points.map((t, i) => {
        const at = 6 + i * 10;
        if (f < at) return null;
        const k = spring({frame: f - at, fps, config: {damping: 11, stiffness: 240, mass: 0.6}});
        return (
          <div key={i} style={{position: "absolute", left: 52 + (i % 2) * 22, top: 290 + i * 118, display: "flex", alignItems: "center", gap: 16, background: C.ink, color: "#fff", padding: "12px 26px 14px 16px", boxShadow: `9px 9px 0 ${C.red}`, translate: `${(1 - k) * -700}px 0`, fontFamily: FONT.golos, fontWeight: 900, fontSize: t.length > 22 ? 48 : 60, whiteSpace: "nowrap"}}>
            <span style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, background: C.y, color: C.ink, fontFamily: FONT.dela, fontSize: 46, border: `4px solid #fff`, scale: String(f >= at + 6 ? 1.4 - 0.4 * p(f, at + 6, at + 12, EO) : 0)}}>✓</span>
            {t.includes("中文") ? <>{t.split("中文")[0]}<span style={{fontFamily: FONT.zcool}}>中文</span>{t.split("中文")[1]}</> : t}
          </div>
        );
      })}
      {f >= tC ? (
        <div style={{position: "absolute", left: 60, top: 300 + s.points.length * 118 + 40, opacity: p(f, tC, tC + 8), translate: `0 ${(1 - p(f, tC, tC + 14, EO)) * 60}px`}}>
          {s.cta ? <div style={{...dela(s.cta.length > 22 ? 62 : 72, C.ink, {textShadow: "6px 6px 0 #fff", maxWidth: 960})}}><Duo text={s.cta} /></div> : null}
          <div style={{display: "inline-block", marginTop: 26, background: "#fff", border: `6px solid ${C.ink}`, boxShadow: `10px 10px 0 ${C.ink}`, padding: "14px 26px", fontFamily: FONT.mono, fontWeight: 700, fontSize: 56, color: C.ink}}>{s.url}</div>
          {s.handle ? <div><div style={{marginTop: 24, display: "inline-block", background: C.ink, color: C.y, fontFamily: FONT.golos, fontWeight: 800, fontSize: 52, padding: "8px 22px"}}>{s.handle}</div></div> : null}
        </div>
      ) : null}
      <Letterbox h={130 * p(f, dur - 20, dur, EIO)} />
    </AbsoluteFill>
  );
};
