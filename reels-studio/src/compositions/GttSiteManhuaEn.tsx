// Английская версия GTT-манхуа (04.11.2026) — копия GttSiteManhua.tsx с переводом и экранами globaltechtour.ru/en.
// Global Tech Tour — «Китай без экскурсий»: манхуа-ролик про сайт globaltechtour.ru, 60 с (03.11.2026, сценарий пользователя
// в Claude Docs «Сценарии манхуа: Aura Robotics и Global Tech Tour», с его правками: «Снова Китай? Да я всё и так знаю и в интернете
// посмотрел.» → «А на завод тебя интернет пустит?» · «Хер тебе! 进不去！»; «1000+ компаний»; «Ну и нах#я мне 76 программ?»; в главу
// «Первые лица» — фото основателя Hema; финал «Заебок. Бронируй.»). Директор-скептик в шести главах получает ответ на каждое «нахуя».
// Стиль — манхуа «Моего сайта» (site-manhua/fx.tsx) в цветах GTT: тёмно-синий, синий #2563EB, голубой #7DD3FC, белый, красные
// иероглифы-звуки, знак-кристалл GTT. Только настоящее: экраны сайта (source-videos/globaltechtour/site/2026-11-03-сайт/), фото визитов
// и кейсов (source-videos/2026-11-03-gtt-sait-manhua/фото/), кадры группы в Шэньчжэне (source-videos/2026-05-21-шэньчжэнь-с-группой/).
// Факты: 76 программ в 9 странах (tours.json), 1000+ компаний (решение пользователя), 18 отраслей, конструктор «2 дня · 4 компании /
// 5 дней · 8–14 компаний», консалтинг (доступ к первым лицам), обучение в 6 кампусах, кейсы и форум Мегамаркета 1200+ (ostapdotcenko.ru).
// clean — версия для Facebook и LinkedIn: мат знаками. hema — фото основателя Hema (пока нет — карточка с логотипом).
// Музыка Inspiring Corporate (Soundrider, CC BY 3.0) с 12 с трека: удар на 16,0 с трека — «дроп» на 4,0 с ролика.
import React from "react";
import {AbsoluteFill, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {useBrush, BRUSH} from "../components/MontazhFx";
import {body} from "../fonts";
import {FONT} from "./site-manhua/fonts";
import {Skeptic, type Emo} from "./site-manhua/skeptic";
import {
  Bubble, Burst, CL, CircleReveal, EIO, EO, Flash, GlitchReveal, Grain, Halftone, InkReveal, Letterbox, PageReveal, Panel, Phone, Sfx,
  SlashReveal, SpeedLines, Vignette, countText, p, sumShake, typed,
} from "./site-manhua/fx";

export const GTT_MANHUA_EN_FRAMES = 1770;
const G = {n1: "#4677EC", n2: "#2556CE", n3: "#1A43A8", deep: "#0B1D55", blue: "#2563EB", sky: "#7DD3FC", red: "#E8341C", ink: "#0A0F24", paper: "#F4F6FB"};
const IMG = "source-videos/globaltechtour/site/2026-11-03-сайт/";
const im = (n: string) => `${IMG}${n}.jpg`;
const PH = "source-videos/2026-11-03-gtt-sait-manhua/фото/";
const ph = (n: string) => `${PH}${n}.jpg`;
const CLIP = "source-videos/2026-05-21-шэньчжэнь-с-группой/";
// фото и видео от пользователя (WeTransfer 03.11.2026): встреча с основателем Hema, саммит в Вэйфане, Чанша, делегация, форум
const WT = "source-videos/2026-11-03-wt-hema-roboty/";
const LOGO = "source-videos/логотипы/";
const FLAG = "интернет-материалы/флаги/";
const CRYSTAL = "finished-videos/обложки/gtt-бренд/instagram/gtt-аватар-мастер-2160.png";
const SFXP = "source-videos/2026-11-03-od-sait-manhua/sfx/";
// музыка v3 (выбор пользователя 04.11.2026, №43): Neon Hyperdrive — Adiutorium (OpenGameArt), CC0;
// удар 41,23 с трека = влёт кристалла (5,2 с ролика); брейкдаун трека 62–82,5 с (главы 3–5) поднят по громкости,
// второй удар 82,57 с = 46,5 с ролика — вход в главу 6
const MUSIC = "интернет-материалы/музыка/neon-hyperdrive-adiutorium.mp3";
const INTER = body.fontFamily;

// тайминг 03.11.2026 (v2): каждая реплика держится столько, сколько нужно на чтение (~15 знаков в секунду + 0,6 с), без провалов
const T = {hook: [0, 168], drop: [156, 264], ch1: [252, 492], ch2: [480, 738], ch3: [726, 996], ch4: [984, 1194], ch5: [1182, 1398], ch6: [1386, 1590], fin: [1578, 1770]} as const;

const MAT: Record<string, string> = {Hell: "H#ll", Holy: "Holy sh#t", Fucking: "F#cking"};
const useMat = (clean?: boolean) => (w: string) => (clean ? MAT[w] ?? w : w);

const dela = (size: number, color = "#fff", extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT.dela, fontSize: size, color, lineHeight: 1.04, ...extra});
const inter = (size: number, color = "#fff", extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: INTER, fontWeight: 700, fontSize: size, color, lineHeight: 1.2, letterSpacing: "-0.01em", ...extra});

const NavyBg: React.FC<{cy?: number}> = ({cy = 35}) => (
  <>
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% ${cy}%, ${G.n1}, ${G.n2} 55%, ${G.n3})`}} />
    <Halftone bg="transparent" dot="rgba(125,211,252,.08)" size={22} r={3} />
  </>
);

const ChapterHead: React.FC<{zh: string; no: string; title: string; at?: number}> = ({zh, no, title, at = 2}) => {
  const f = useCurrentFrame();
  const k = p(f, at, at + 10, EO);
  const brush = p(f, at + 6, at + 20, EO);
  return (
    <div style={{position: "absolute", left: 64, top: 262, display: "flex", alignItems: "center", gap: 24, opacity: k, translate: `${(1 - k) * -160}px 0`}}>
      <div style={{fontFamily: FONT.zcool, fontSize: 100, color: "#fff", lineHeight: 1, textShadow: `6px 6px 0 ${G.ink}`}}>{zh}</div>
      <div>
        <div style={{fontFamily: FONT.oswald, fontSize: 30, letterSpacing: "0.18em", color: G.red}}>{no}</div>
        <div style={dela(50)}>{title}</div>
      </div>
      <svg width={560} height={40} style={{position: "absolute", left: 0, top: 112, overflow: "visible"}}>
        <path d="M4,22 C120,6 260,34 420,14 C470,8 520,18 556,12" fill="none" stroke={G.red} strokeWidth={13} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - brush} />
      </svg>
    </div>
  );
};

// синяя плашка ответа GTT: синий, белый текст, голубая тень
const Answer: React.FC<{x: number; y: number; w: number; at: number; size?: number; rot?: number; children: React.ReactNode; light?: boolean; until?: number}> = ({x, y, w, at, size = 34, rot = 0, children, light, until}) => {
  const f = useCurrentFrame();
  if (f < at || (until !== undefined && f > until)) return null;
  const k = p(f, at, at + 8, EO) * (until !== undefined ? 1 - p(f, until - 6, until) : 1);
  return (
    <div style={{position: "absolute", left: x, top: y, width: w, background: light ? "#fff" : G.deep, border: `4px solid ${G.ink}`, padding: "16px 22px", rotate: `${rot}deg`, boxShadow: `9px 9px 0 ${light ? G.blue : G.sky}`, opacity: k, translate: `0 ${(1 - k) * 40}px`, ...inter(size, light ? G.ink : "#fff")}}>
      {children}
    </div>
  );
};

const Chip: React.FC<{x: number; y: number; at: number; rot?: number; children: React.ReactNode; size?: number; bg?: string; color?: string}> = ({x, y, at, rot = 0, children, size = 32, bg = "#fff", color = G.ink}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
  return (
    <div style={{position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 12, background: bg, border: `4px solid ${G.ink}`, borderRadius: 16, padding: "8px 18px", whiteSpace: "nowrap", rotate: `${rot}deg`, scale: String(1.6 - 0.6 * s), opacity: Math.min(1, s * 2), boxShadow: `7px 7px 0 ${G.blue}`, ...inter(size, color)}}>
      {children}
    </div>
  );
};

// Директор: силуэт в галстуке; выезжает сбоку и уезжает
const Director: React.FC<{x: number; y: number; scale: number; emo: Emo; talk?: boolean; at?: number; until?: number; glasses?: boolean; phone?: boolean; from?: number}> = ({x, y, scale, emo, talk, at = 0, until, glasses, phone, from = -1}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at || (until !== undefined && f > until + 10)) return null;
  const s = spring({frame: f - at, fps, config: {damping: 13, stiffness: 190, mass: 0.7}});
  const out = until !== undefined ? p(f, until, until + 10, EIO) : 0;
  return (
    <div style={{position: "absolute", inset: 0, translate: `${((1 - s) + out) * from * 600}px 0`}}>
      <Skeptic x={x} y={y} scale={scale} emo={emo} talk={talk} tie glasses={glasses} phone={phone} fill={G.ink} rim={G.sky} accent={G.red} />
    </div>
  );
};

const Say: React.FC<{x: number; y: number; w: number; h: number; at: number; until?: number; tail: [number, number]; shout?: boolean; children: React.ReactNode}> = ({x, y, w, h, at, until, tail, shout, children}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at || (until !== undefined && f > until)) return null;
  const b = spring({frame: f - at, fps, config: {damping: 10, stiffness: 230, mass: 0.6}});
  const out = until !== undefined ? p(f, until - 5, until) : 0;
  return (
    <Bubble x={x} y={y} w={w} h={h} tail={tail} shout={shout} scale={(0.3 + 0.7 * b) * (1 - 0.3 * out)} opacity={Math.min(1, b * 2) * (1 - out)} fill="#fff" stroke={G.ink}>
      {children}
    </Bubble>
  );
};

// ── 1. Хук: Директор листает телефон — «Снова Китай?..» → стоп-кадр, трещина → «А на завод тебя интернет пустит?» · «Хер тебе! 进不去！» ──
const CRACK = "M640,1010 L560,930 L520,820 L470,760 M640,1010 L760,940 L840,960 L960,880 M640,1010 L700,1120 L690,1240 L760,1330 M640,1010 L520,1060 L400,1050 L300,1110 M560,930 L480,960 M760,940 L790,860 M700,1120 L800,1150";
const Hook: React.FC<{clean?: boolean}> = ({clean}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = useMat(clean);
  const frozen = f >= 92;
  const crack = p(f, 92, 98, EO);
  const her = spring({frame: f - 122, fps, config: {damping: 7, stiffness: 300, mass: 0.5}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[92, 14, 26], [122, 12, 22]], "hk")}}>
      <AbsoluteFill style={{filter: frozen ? "grayscale(.85) contrast(1.15)" : undefined}}>
        <NavyBg cy={60} />
        <SpeedLines color="rgba(125,211,252,.35)" cx={600} cy={1300} inner={500} opacity={frozen ? 0.9 : 0.4} seed="h0" />
        <Director x={330} y={1080} scale={1.45} emo={f < 92 ? "neutral" : f < 122 ? "shock" : "sweat"} talk={f >= 8 && f < 86} phone={f < 92} from={1} />
        <Say x={40} y={330} w={1000} h={400} at={6} until={94} tail={[560, 830]}>
          <div style={dela(62, G.ink)}>China again?</div>
          <div style={{...inter(44, G.ink), marginTop: 12}}>I already know it all</div>
          <div style={inter(44, G.ink)}>and I've seen it online.</div>
        </Say>
      </AbsoluteFill>
      {frozen ? (
        <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
          <path d={CRACK} fill="none" stroke="#fff" strokeWidth={7} strokeLinejoin="bevel" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - crack} style={{filter: "drop-shadow(0 0 8px rgba(125,211,252,.9))"}} />
        </svg>
      ) : null}
      <Answer x={60} y={420} w={960} at={98} size={56} rot={-2}>
        Will the internet <span style={{color: G.sky}}>get you into a factory?</span>
      </Answer>
      {f >= 122 ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", scale: String(1.8 - 0.8 * her)}}>
          <div style={dela(122, G.red, {WebkitTextStroke: `6px #fff`, paintOrder: "stroke fill", textShadow: `10px 10px 0 ${G.ink}`})}>{m("Hell")} no!</div>
          <div style={{fontFamily: FONT.zcool, fontSize: 130, color: "#fff", lineHeight: 1.1, textShadow: `8px 8px 0 ${G.red}`}}>进不去！</div>
          <div style={{fontFamily: FONT.mono, fontSize: 30, color: G.sky, letterSpacing: "0.12em"}}>(“NO ENTRY!”)</div>
        </div>
      ) : null}
      <Flash at={92} dur={4} />
      <Letterbox h={110} />
    </AbsoluteFill>
  );
};

// ── 2. Дроп: кристалл GTT влетает, взрывы-счётчики ──────────────────────────────────────────────────────────────────────
const STATS: [number, string, string][] = [[9, "", "countries"], [76, "", "programs"], [1000, "+", "companies"], [18, "", "industries"]];
const Drop: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cr = spring({frame: f - 2, fps, config: {damping: 12, stiffness: 110, mass: 0.9}});
  const t1 = spring({frame: f - 12, fps, config: {damping: 11, stiffness: 260, mass: 0.6}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[0, 16, 30], [28, 6, 10], [38, 6, 10], [48, 6, 10], [58, 6, 10]], "dr")}}>
      <NavyBg cy={36} />
      <SpeedLines color="rgba(125,211,252,.6)" cx={540} cy={700} inner={380} opacity={0.8} seed="d1" />
      <Img src={staticFile(CRYSTAL)} style={{position: "absolute", left: 540 - 340, top: 380, width: 680, height: 680, borderRadius: "50%", mixBlendMode: "screen", scale: String(2.6 - 1.6 * cr), rotate: `${(1 - cr) * -120 + Math.sin(f / 20) * 3}deg`, opacity: Math.min(1, cr * 1.5)}} />
      <div style={{position: "absolute", left: 0, right: 0, top: 1060, textAlign: "center", scale: String(f >= 12 ? 1.7 - 0.7 * t1 : 0)}}>
        <div style={dela(70, "#fff", {textShadow: `7px 7px 0 ${G.blue}`})}>GLOBAL TECH TOUR</div>
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 1178, textAlign: "center", opacity: p(f, 18, 26), ...inter(42, G.sky)}}>Business expeditions to China and beyond</div>
      {STATS.map(([v, suf, label], i) => {
        const at = 28 + i * 10;
        if (f < at) return null;
        const s = spring({frame: f - at, fps, config: {damping: 9, stiffness: 300, mass: 0.5}});
        const x = 70 + (i % 2) * 500;
        const y = 1256 + Math.floor(i / 2) * 140;
        return (
          <div key={label} style={{position: "absolute", left: x, top: y, width: 440, height: 130, scale: String(1.6 - 0.6 * s), transformOrigin: "0 50%"}}>
            <Burst x={56} y={44} r={60} color={G.blue} stroke="#fff" sw={5} rot={f * 0.8 + i * 20} seed={`ds${i}`} points={14} />
            <div style={{position: "relative", ...dela(76, "#fff", {textShadow: `5px 5px 0 ${G.ink}`})}}>{countText(f, at, 12, v, "", suf)}</div>
            <div style={{position: "relative", ...inter(34, G.sky)}}>{label}</div>
          </div>
        );
      })}
      <Flash at={0} dur={6} />
    </AbsoluteFill>
  );
};

// ── 3. 第一话 «Готовые программы»: 9 стран загораются, каталог в телефоне, карточки программ веером ─────────────────────────
const COUNTRIES: [string, string][] = [["cn", "China"], ["jp", "Japan"], ["kr", "Korea"], ["th", "Thailand"], ["vn", "Vietnam"], ["id", "Indonesia"], ["my", "Malaysia"], ["in", "India"], ["ae", "UAE"]];
const PROGS: [string, string][] = [
  ["Robotics Expedition", "3 cities · 5 days · 12 companies"],
  ["China's Tech Parks & Innovation Zones", "3 cities · 6 days · 9 companies"],
  ["Japan Retail: Konbini & Discounters", "2 cities · 6 days · 10 companies"],
  ["UAE Fintech & Digital Banking", "2 cities · 5 days · 11 companies"],
  ["China's Top 10 Logistics Companies", "4 cities · 5 days · 10 companies"],
];
const Ch1: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <NavyBg />
      <AbsoluteFill style={{translate: sumShake(f, [[8, 8, 14], [66, 5, 8], [128, 6, 10]], "c1")}}>
        <ChapterHead zh="第一话" no="CHAPTER 1" title="Ready-made programs" />
        {COUNTRIES.map(([c, n], i) => {
          const at = 12 + i * 5;
          const on = p(f, at, at + 4);
          return (
            <div key={c} style={{position: "absolute", left: 48 + (i % 3) * 332, top: 440 + Math.floor(i / 3) * 96, width: 312, height: 80, display: "flex", alignItems: "center", gap: 14, background: on > 0.5 ? "#fff" : "rgba(255,255,255,.08)", border: `4px solid ${on > 0.5 ? G.ink : "rgba(125,211,252,.4)"}`, borderRadius: 14, padding: "0 14px", boxShadow: on > 0.5 ? `0 0 28px rgba(125,211,252,.7), 6px 6px 0 ${G.blue}` : "none", scale: String(1 + 0.15 * Math.sin(on * Math.PI))}}>
              <Img src={staticFile(`${FLAG}${c}.png`)} style={{width: 64, height: 44, objectFit: "cover", border: `2px solid ${G.ink}`, opacity: 0.3 + 0.7 * on}} />
              <span style={inter(30, on > 0.5 ? G.ink : "rgba(255,255,255,.5)")}>{n}</span>
            </div>
          );
        })}
        <Director x={-40} y={1230} scale={0.85} emo="angry" talk={f >= 8 && f < 56} at={2} until={64} />
        <Say x={330} y={1180} w={700} h={300} at={8} until={66} tail={[60, 200]} shout>
          <div style={dela(46, G.ink)}>What the h#ll do I</div>
          <div style={dela(64, G.red, {WebkitTextStroke: `2px ${G.ink}`, paintOrder: "stroke fill"})}>need 76 for?</div>
        </Say>
        <div style={{position: "absolute", left: 600, top: 760, rotate: "4deg", opacity: p(f, 66, 74), translate: `${(1 - p(f, 66, 78, EO)) * 500}px 0`}}>
          <Phone w={430} imgs={[im("en-expeditions-1"), im("en-expeditions-2")]} mode="swap" keys={[[0, 0], [118, 1]]} url="globaltechtour.ru" glareAt={90} />
        </div>
        {PROGS.map(([t, s], i) => {
          const at = 76 + i * 8;
          if (f < at) return null;
          const k = spring({frame: f - at, fps, config: {damping: 12, stiffness: 200, mass: 0.7}});
          return (
            <div key={t} style={{position: "absolute", left: 48, top: 790 + i * 92, width: 540, background: "#fff", border: `4px solid ${G.ink}`, borderRadius: 18, padding: "12px 18px", boxShadow: `7px 7px 0 ${G.blue}`, rotate: `${(i % 2 ? 2 : -2) * k}deg`, translate: `${(1 - k) * 700}px 0`}}>
              <div style={inter(26, G.ink)}>{t}</div>
              <div style={{fontFamily: FONT.mono, fontSize: 20, color: G.blue, marginTop: 4}}>{s}</div>
            </div>
          );
        })}
        <Answer x={48} y={1320} w={984} at={128} size={34}>
          Curated programs by niche: <span style={{color: G.sky}}>route, companies and logistics already assembled</span>
        </Answer>
        <Sfx text="啪!" x={830} y={600} size={110} color={G.red} stroke="#fff" at={76} font={FONT.zcool} rot={10} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 4. 第二话 «Собери сам»: конструктор — формат, курсор отмечает логотипы, из телефона вылетает PDF программы ─────────────
const LOGOS = ["авто/byd.svg", "общие/xiaomi.svg", "общие/baidu.png", "ритейл/meituan.svg", "общие/huawei.svg", "общие/alibaba.svg", "бытовая-техника/haier.svg", "общие/bytedance.png", "финансы/ping-an.svg"];
const PICK = [0, 1, 4, 6];
const Ch2: React.FC<{clean?: boolean}> = ({clean}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = useMat(clean);
  const gone = p(f, 170, 182, EIO);
  const pdf = spring({frame: f - 136, fps, config: {damping: 12, stiffness: 140, mass: 0.8}});
  // курсор: от одного отмеченного логотипа к другому
  const cur = (() => {
    const pts = PICK.map((i) => [48 + (i % 3) * 160 + 120, 900 + Math.floor(i / 3) * 120 + 80]);
    let x = 560, y = 1300;
    PICK.forEach((_, j) => {
      const a = 80 + j * 14;
      const k = p(f, a, a + 8, EIO);
      if (f >= a) { x = x + (pts[j][0] - x) * k; y = y + (pts[j][1] - y) * k; }
    });
    return [x, y];
  })();
  return (
    <AbsoluteFill>
      <NavyBg />
      <AbsoluteFill style={{translate: sumShake(f, [[60, 6, 10], [72, 6, 10], [136, 8, 14], [200, 10, 18]], "c2")}}>
        <ChapterHead zh="第二话" no="CHAPTER 2" title="Build it yourself" />
        <Director x={-40} y={1180} scale={0.85} emo="neutral" talk={f >= 6 && f < 44} at={0} until={52} />
        <Say x={330} y={1130} w={680} h={260} at={6} until={54} tail={[60, 200]}>
          <div style={dela(50, G.ink)}>What if I need</div>
          <div style={dela(50, G.ink)}>my own?</div>
        </Say>
        <div style={{position: "absolute", left: 570, top: 430, rotate: "-3deg", opacity: p(f, 44, 52), translate: `${(1 - p(f, 44, 58, EO)) * 500}px 0`}}>
          <Phone w={440} imgs={[im("en-constructor-1"), im("en-constructor-2")]} mode="swap" keys={[[0, 0], [64, 1]]} url="globaltechtour.ru" tapAt={[[94, 480, 1190]]} />
        </div>
        <div style={{position: "absolute", inset: 0, translate: `${-700 * gone}px 0`}}>
          {[["2 days", "4 companies"], ["5 days", "8–14 companies"]].map(([a, b], i) => (
            <Chip key={a} x={48} y={440 + i * 100} at={60 + i * 12} rot={i ? 2 : -2} size={30}>
              <span style={dela(44, G.blue)}>{a}</span>
              <span>· {b}</span>
            </Chip>
          ))}
          {LOGOS.map((l, i) => {
            const at = 66 + i * 3;
            const ticked = PICK.indexOf(i);
            const tk = ticked >= 0 ? p(f, 80 + ticked * 14 + 7, 80 + ticked * 14 + 12, EO) : 0;
            return (
              <div key={l} style={{position: "absolute", left: 48 + (i % 3) * 172, top: 900 + Math.floor(i / 3) * 120, width: 156, height: 104, background: "#fff", border: `4px solid ${tk > 0.5 ? G.blue : G.ink}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", opacity: p(f, at, at + 4), scale: String(1 + 0.12 * Math.sin(tk * Math.PI)), boxShadow: tk > 0.5 ? `0 0 24px rgba(37,99,235,.8)` : "none"}}>
                <Img src={staticFile(`${LOGO}${l}`)} style={{maxWidth: 120, maxHeight: 64, objectFit: "contain"}} />
                {tk > 0 ? (
                  <div style={{position: "absolute", right: -12, top: -12, width: 44, height: 44, borderRadius: 99, background: G.blue, border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", scale: String(tk)}}>
                    <svg width={26} height={26} viewBox="0 0 26 26"><path d="M4,14 L10,20 L22,6" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" /></svg>
                  </div>
                ) : null}
              </div>
            );
          })}
          {f >= 76 && f < 170 ? (
            <svg width={60} height={70} style={{position: "absolute", left: cur[0], top: cur[1]}} viewBox="0 0 60 70">
              <path d="M4,4 L4,56 L18,44 L28,66 L38,62 L28,40 L48,40 Z" fill="#fff" stroke={G.ink} strokeWidth={4} strokeLinejoin="round" />
            </svg>
          ) : null}
        </div>
        <Answer x={48} y={1290} w={984} at={128} size={34} until={204}>
          Pick a format, mark the companies — <span style={{color: G.sky}}>we'll build the route</span>
        </Answer>
        {f >= 136 ? (
          // PDF программы вылетает из телефона
          <div style={{position: "absolute", left: 640 - 300 * pdf, top: 820 - 160 * pdf, width: 300, height: 400, background: "#fff", border: `4px solid ${G.ink}`, boxShadow: `10px 12px 0 ${G.blue}`, rotate: `${-16 * pdf}deg`, scale: String(0.4 + 0.6 * pdf), padding: 20}}>
            <div style={{fontFamily: FONT.mono, fontSize: 20, color: G.red}}>PROGRAM.pdf</div>
            <div style={{...dela(28, G.ink), marginTop: 10}}>5 days · 4 companies</div>
            {Array.from({length: 7}, (_, i) => (
              <div key={i} style={{height: 12, marginTop: 16, width: `${90 - (i % 3) * 18}%`, background: i % 3 ? "#D8DEEA" : G.sky, borderRadius: 4}} />
            ))}
            <div style={{position: "absolute", right: 16, bottom: 14, fontFamily: FONT.oswald, fontSize: 22, color: G.blue}}>GLOBAL TECH TOUR</div>
          </div>
        ) : null}
        <Sfx text="嘀!" x={760} y={1150} size={96} color={G.sky} stroke={G.ink} at={136} font={FONT.zcool} rot={-10} until={186} />
        <Director x={-30} y={1050} scale={0.92} emo="wow" talk={f >= 200 && f < 236} at={192} from={-1} />
        <Say x={360} y={1000} w={650} h={300} at={200} tail={[40, 200]} shout>
          <div style={dela(64, G.red, {WebkitTextStroke: `2px ${G.ink}`, paintOrder: "stroke fill"})}>{m("Holy")}.</div>
          <div style={dela(56, G.ink)}>Built it myself.</div>
        </Say>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 5. 第三话 «Первые лица»: Xingwang, YingKe, SANY, Hema — штамп «Туда, куда с улицы не пускают» ─────────────────────────────
const Photo: React.FC<{src: string; w: number; h: number; pos?: string; zoom?: number}> = ({src, w, h, pos = "50% 40%", zoom = 1}) => (
  <Img src={staticFile(src)} style={{position: "absolute", left: 0, top: 0, width: w, height: h, objectFit: "cover", objectPosition: pos, scale: String(zoom)}} />
);
const Cap: React.FC<{children: React.ReactNode; at: number; x?: number; y?: number}> = ({children, at, x = 14, y = 14}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  return <div style={{position: "absolute", left: x, top: y, background: G.ink, color: "#fff", padding: "6px 12px", ...inter(24), opacity: p(f, at, at + 6)}}>{children}</div>;
};
const Ch3: React.FC<{hema?: string}> = ({hema}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const st = spring({frame: f - 124, fps, config: {damping: 8, stiffness: 320, mass: 0.6}});
  const z = (a: number) => 1 + 0.07 * p(f, a, 270);
  return (
    <AbsoluteFill>
      <NavyBg />
      <AbsoluteFill style={{translate: sumShake(f, [[58, 6, 10], [70, 6, 10], [82, 6, 10], [94, 6, 10], [106, 6, 10], [124, 16, 28]], "c3")}}>
        <ChapterHead zh="第三话" no="CHAPTER 3" title="The people at the top" />
        <Director x={330} y={860} scale={1.15} emo="sweat" talk={f >= 6 && f < 50} at={0} until={56} from={1} />
        <Say x={60} y={430} w={960} h={330} at={6} until={58} tail={[560, 520]}>
          <div style={dela(56, G.ink)}>Who'd let me past</div>
          <div style={dela(56, G.ink)}>the front gate?</div>
        </Say>
        <Panel x={48} y={430} w={560} h={460} at={58} from="left" bg={G.ink}>
          <Photo src={ph("xingwang-hou")} w={560} h={460} pos="50% 30%" zoom={z(58)} />
          <Cap at={66} y={396}>Xingwang chairman Hou Xingwang</Cap>
        </Panel>
        <Panel x={630} y={430} w={402} h={460} at={70} from="right" bg={G.ink}>
          <Photo src={ph("yingke-rukovodstvo")} w={402} h={460} pos="50% 30%" zoom={z(70)} />
          <Cap at={78} y={396}>Negotiations at YingKe</Cap>
        </Panel>
        <Panel x={48} y={910} w={300} h={400} at={82} from="bottom" bg={G.ink}>
          <Photo src={"source-videos/2026-10-25-sany/IMG_5645.jpg"} w={300} h={400} pos="50% 45%" zoom={z(82)} />
          <Cap at={90} y={336}>SANY gates</Cap>
        </Panel>
        <Panel x={362} y={910} w={330} h={400} at={94} from="bottom" bg={G.ink}>
          {hema ? (
            <Photo src={hema} w={330} h={400} pos="50% 25%" zoom={z(94)} />
          ) : (
            <OffthreadVideo src={staticFile(`${WT}hema-osnovatel.mp4`)} muted style={{position: "absolute", left: 0, top: -60, width: 330, height: 587, objectFit: "cover"}} />
          )}
          <Img src={staticFile(`${LOGO}ритейл/hema.png`)} style={{position: "absolute", right: 10, top: 10, width: 110, height: 52, objectFit: "contain", background: "#fff", borderRadius: 8, padding: 4}} />
          <Cap at={102} y={336}>Hema founder</Cap>
        </Panel>
        <Panel x={706} y={910} w={326} h={400} at={106} from="right" bg={G.ink}>
          <Photo src={`${WT}vejfan-sammit.jpg`} w={326} h={400} pos="50% 55%" zoom={z(106)} />
          <Cap at={112} y={300}>Weifang
            <br />
            entrepreneurs summit</Cap>
        </Panel>
        {f >= 124 ? (
          <div style={{position: "absolute", left: 90, top: 760, width: 900, rotate: "-8deg", scale: String(2.2 - 1.2 * st), opacity: Math.min(1, st * 2), border: `10px solid ${G.red}`, padding: "18px 22px", background: "rgba(255,255,255,.88)", textAlign: "center", boxShadow: "0 0 0 6px rgba(232,52,28,.25)"}}>
            <div style={dela(60, G.red, {lineHeight: 1.1})}>WHERE OUTSIDERS</div>
            <div style={dela(60, G.red, {lineHeight: 1.1})}>DON'T GET IN</div>
          </div>
        ) : null}
        <Sfx text="啪!" x={860} y={1180} size={110} color={G.red} stroke="#fff" at={124} font={FONT.zcool} rot={12} />
        <Answer x={48} y={1334} w={740} at={150} size={30}>
          Face to face <span style={{color: G.sky}}>with owners, CEOs and top managers</span>
        </Answer>
        <Answer x={48} y={1448} w={620} at={172} size={28} light rot={-1}>
          + exclusive lectures by top executives
        </Answer>
        {f >= 160 ? (
          <div style={{position: "absolute", left: 812, top: 1330, width: 220, background: "#fff", padding: 10, paddingBottom: 4, border: `3px solid ${G.ink}`, rotate: "4deg", boxShadow: `7px 9px 0 rgba(10,15,36,.6)`, scale: String(1.5 - 0.5 * spring({frame: f - 160, fps, config: {damping: 12, stiffness: 220}}))}}>
            <div style={{position: "relative", width: 200, height: 136, overflow: "hidden", border: `2px solid ${G.ink}`}}>
              <Photo src={`${WT}konferenciya-delegaciya.jpg`} w={200} h={136} pos="50% 50%" />
            </div>
            <div style={{fontFamily: FONT.hand, fontSize: 30, color: G.ink, textAlign: "center"}}>in the hall with the delegation</div>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 6. 第四话 «Учёба в кампусах»: пропуска гостя падают стопкой, Директор в очках, 学 ─────────────────────────────────────────
const CAMPUS: [string, string][] = [["общие/huawei.svg", "Huawei"], ["общие/alibaba.svg", "Alibaba"], ["общие/xiaomi.svg", "Xiaomi"], ["бытовая-техника/haier.svg", "Haier"], ["общие/bytedance.png", "ByteDance"], ["финансы/ping-an.svg", "Ping An"]];
const Ch4: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <NavyBg />
      <div style={{position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: BRUSH, fontSize: 900, lineHeight: 1, color: "rgba(125,211,252,.10)", scale: String(1 + 0.05 * p(f, 0, 210))}}>学</div>
      <AbsoluteFill style={{translate: sumShake(f, CAMPUS.map((_, i) => [14 + i * 10, 5, 8] as [number, number, number]), "c4")}}>
        <ChapterHead zh="第四话" no="CHAPTER 4" title="Campus learning" />
        {CAMPUS.map(([l, n], i) => {
          const at = 14 + i * 10;
          if (f < at) return null;
          const s = spring({frame: f - at, fps, config: {damping: 13, stiffness: 180, mass: 0.8}});
          const col = i % 2;
          const row = Math.floor(i / 2);
          return (
            <div key={n} style={{position: "absolute", left: 60 + col * 300, top: 470 + row * 250, width: 270, translate: `0 ${(1 - s) * -900}px`, rotate: `${(i % 3 - 1) * 5 + (1 - s) * 30}deg`}}>
              <div style={{position: "absolute", left: 118, top: -60, width: 34, height: 70, background: G.blue, border: `3px solid ${G.ink}`}} />
              <div style={{background: "#fff", border: `4px solid ${G.ink}`, borderRadius: 18, overflow: "hidden", boxShadow: `8px 8px 0 ${G.blue}`}}>
                <div style={{background: G.blue, color: "#fff", padding: "6px 12px", fontFamily: FONT.mono, fontSize: 18, letterSpacing: "0.14em"}}>CAMPUS GUEST</div>
                <div style={{height: 120, display: "flex", alignItems: "center", justifyContent: "center"}}>
                  <Img src={staticFile(`${LOGO}${l}`)} style={{maxWidth: 190, maxHeight: 80, objectFit: "contain"}} />
                </div>
                <div style={{padding: "0 12px 10px", ...inter(26, G.ink)}}>{n}</div>
              </div>
            </div>
          );
        })}
        <Director x={640} y={1060} scale={0.95} emo="neutral" glasses at={4} from={1} />
        <Sfx text="学!" x={720} y={880} size={130} color={G.sky} stroke={G.ink} at={74} font={BRUSH} rot={-8} />
        <Answer x={48} y={1250} w={600} at={78} size={32}>
          <span style={{color: G.sky}}>Three-day intensives:</span> strategy, digitalization, management — first-hand, with interpreting
        </Answer>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 7. 第五话 «Под ключ»: чек-лист отрывается галочками, партнёр со штампом 已验证 ───────────────────────────────────────────
const LIST = ["Transfers", "Hotels", "Simultaneous interpreting", "Protocol", "Multi-city routes"];
const Ch5: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seal = spring({frame: f - 92, fps, config: {damping: 8, stiffness: 320, mass: 0.6}});
  const tear = 0;
  return (
    <AbsoluteFill>
      <NavyBg />
      <AbsoluteFill style={{translate: sumShake(f, [...LIST.map((_, i) => [16 + i * 12, 4, 6] as [number, number, number]), [92, 14, 24]], "c5")}}>
        <ChapterHead zh="第五话" no="CHAPTER 5" title="Turnkey" />
        {/* блокнот: верхний лист отрывается после всех галочек */}
        <div style={{position: "absolute", left: 60, top: 450, width: 600, height: 700, background: "#E3E8F4", border: `4px solid ${G.ink}`, borderRadius: 14, rotate: "-2deg"}} />
        <div style={{position: "absolute", left: 60, top: 450, width: 600, height: 700, background: G.paper, border: `4px solid ${G.ink}`, borderRadius: 14, rotate: `${-2 - 14 * tear}deg`, translate: `${-260 * tear}px ${160 * tear}px`, opacity: 1 - 0.4 * tear, transformOrigin: "0 0", backgroundImage: "repeating-linear-gradient(180deg, transparent 0 116px, rgba(37,99,235,.25) 116px 119px)", boxShadow: `10px 10px 0 ${G.blue}`}}>
          <div style={{position: "absolute", left: 0, right: 0, top: -26, height: 40, display: "flex", justifyContent: "space-around"}}>
            {Array.from({length: 9}, (_, i) => <div key={i} style={{width: 16, height: 40, borderRadius: 8, background: "#9AA6BF", border: `3px solid ${G.ink}`}} />)}
          </div>
          {LIST.map((t, i) => {
            const at = 16 + i * 12;
            const k = p(f, at, at + 6, EO);
            return (
              <div key={t} style={{position: "absolute", left: 30, top: 40 + i * 120, right: 20, display: "flex", alignItems: "center", gap: 18, opacity: p(f, at - 6, at)}}>
                <div style={{width: 62, height: 62, border: `5px solid ${G.ink}`, borderRadius: 10, background: "#fff", position: "relative", flexShrink: 0}}>
                  <svg width={70} height={70} viewBox="0 0 70 70" style={{position: "absolute", left: -2, top: -14, overflow: "visible"}}>
                    <path d="M8,38 L28,58 L66,8" fill="none" stroke={G.blue} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
                  </svg>
                </div>
                <span style={inter(i === 4 ? 32 : 38, G.ink)}>{t}</span>
              </div>
            );
          })}
        </div>
        {/* карточка партнёра со штампом «проверено» */}
        <div style={{position: "absolute", left: 640, top: 560, width: 390, background: "#fff", border: `4px solid ${G.ink}`, borderRadius: 16, overflow: "hidden", rotate: "3deg", boxShadow: `9px 9px 0 ${G.blue}`, opacity: p(f, 56, 64), translate: `${(1 - p(f, 56, 68, EO)) * 500}px 0`}}>
          <div style={{position: "relative", width: 390, height: 260, overflow: "hidden"}}>
            <Photo src={`${WT}forum-peregovory.jpg`} w={390} h={260} pos="50% 40%" />
          </div>
          <div style={{padding: "12px 16px"}}>
            <div style={{fontFamily: FONT.mono, fontSize: 20, color: G.blue}}>PARTNER · 合作伙伴</div>
            <div style={inter(28, G.ink)}>Negotiations with agenda and interpreting</div>
          </div>
        </div>
        {f >= 92 ? (
          <div style={{position: "absolute", left: 760, top: 760, width: 220, height: 220, borderRadius: "50%", border: `10px solid ${G.red}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", rotate: "-14deg", scale: String(2 - seal), opacity: Math.min(1, seal * 2), background: "rgba(255,255,255,.5)"}}>
            <div style={{fontFamily: FONT.zcool, fontSize: 64, color: G.red, lineHeight: 1}}>已验证</div>
            <div style={{fontFamily: FONT.oswald, fontSize: 26, color: G.red, letterSpacing: "0.1em"}}>VERIFIED</div>
          </div>
        ) : null}
        {[[`${WT}chansha-ostrov.jpg`, "Changsha", 640, -4, 116], [`${WT}delegaciya-saudity.jpg`, "delegation", 846, 5, 128]].map(([src, cap, x, rot, at]) => {
          const k = spring({frame: f - (at as number), fps, config: {damping: 12, stiffness: 220, mass: 0.7}});
          if (f < (at as number)) return null;
          return (
            <div key={cap as string} style={{position: "absolute", left: x as number, top: 1000, width: 190, background: "#fff", padding: 8, paddingBottom: 2, border: `3px solid ${G.ink}`, rotate: `${rot}deg`, boxShadow: `7px 9px 0 rgba(10,15,36,.6)`, scale: String(1.5 - 0.5 * k), opacity: Math.min(1, k * 2)}}>
              <div style={{position: "relative", width: 174, height: 120, overflow: "hidden", border: `2px solid ${G.ink}`}}>
                <Photo src={src as string} w={174} h={120} pos="50% 40%" />
              </div>
              <div style={{fontFamily: FONT.hand, fontSize: 28, color: G.ink, textAlign: "center"}}>{cap as string}</div>
            </div>
          );
        })}
        <Answer x={48} y={1190} w={984} at={108} size={34}>
          We find and vet partners — <span style={{color: G.sky}}>negotiations with agenda and interpreting</span>
        </Answer>
        <Director x={600} y={1290} scale={0.62} emo="calm" at={150} from={1} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 8. 第六话 «Кейсы»: кадры нашей группы в Шэньчжэне, полароиды визитов, форум Мегамаркета ─────────────────────────────────
const CASES: [string, string][] = [["kejs-byd", "BYD"], ["kejs-xiaomi", "Xiaomi"], ["kejs-baidu", "Baidu"], ["kejs-meituan", "Meituan"], ["kejs-poizon", "Poizon"], ["kejs-leju-robotics", "Leju"]];
const Ch6: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <NavyBg />
      <AbsoluteFill style={{translate: sumShake(f, [[6, 6, 10], [18, 6, 10], ...CASES.map((_, i) => [48 + i * 8, 4, 6] as [number, number, number])], "c6")}}>
        <ChapterHead zh="第六话" no="CHAPTER 6" title="Cases" />
        <Panel x={48} y={430} w={600} h={360} at={6} from="left" bg={G.ink}>
          <OffthreadVideo src={staticFile(`${CLIP}A0099.mp4`)} trimBefore={Math.round(9.4 * fps)} muted style={{position: "absolute", left: 0, top: -120, width: 600, height: 1067, objectFit: "cover"}} />
          <Cap at={14} y={310}>Our group · Shenzhen</Cap>
        </Panel>
        <Panel x={668} y={430} w={364} h={360} at={18} from="right" bg={G.ink}>
          <OffthreadVideo src={staticFile(`${CLIP}A0120.mp4`)} trimBefore={Math.round(1 * fps)} muted style={{position: "absolute", left: 0, top: -150, width: 364, height: 647, objectFit: "cover"}} />
        </Panel>
        {CASES.map(([src, name], i) => {
          const at = 48 + i * 8;
          if (f < at) return null;
          const s = spring({frame: f - at, fps, config: {damping: 12, stiffness: 210, mass: 0.7}});
          const col = i % 3;
          const row = Math.floor(i / 3);
          return (
            <div key={src} style={{position: "absolute", left: 40 + col * 340, top: 820 + row * 290, width: 320, background: "#fff", padding: 12, paddingBottom: 6, border: `3px solid ${G.ink}`, boxShadow: `8px 10px 0 rgba(10,15,36,.6)`, rotate: `${(i % 2 ? 3 : -3) + (1 - s) * 20}deg`, scale: String(1.5 - 0.5 * s), translate: `0 ${(1 - s) * -400}px`}}>
              <div style={{position: "relative", width: 296, height: 200, overflow: "hidden", border: `2px solid ${G.ink}`}}>
                <Photo src={ph(src)} w={296} h={200} pos="50% 40%" />
              </div>
              <div style={{fontFamily: FONT.hand, fontSize: 40, color: G.ink, lineHeight: 1.1, textAlign: "center"}}>{name}</div>
            </div>
          );
        })}
        <Answer x={48} y={1420} w={984} at={108} size={30} rot={-1}>
          <span style={{color: G.sky}}>Megamarket (Sber) forum in Shenzhen</span> — 1,200+ participants, turnkey
        </Answer>
        <Sfx text="哇!" x={860} y={360} size={100} color={G.sky} stroke={G.ink} at={100} font={FONT.zcool} rot={10} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 9. Финал: Директор рвёт «Китай на YouTube», «Заебок. Бронируй.», кристалл, кнопка сайта, 一路顺风 ───────────────────────────
const Fin: React.FC<{clean?: boolean}> = ({clean}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = useMat(clean);
  const tear = p(f, 26, 40, EO);
  const fly = p(f, 40, 62, EIO);
  const cr = spring({frame: f - 62, fps, config: {damping: 12, stiffness: 120, mass: 0.9}});
  const btn = spring({frame: f - 78, fps, config: {damping: 9, stiffness: 260, mass: 0.6}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[26, 12, 20], [62, 8, 14], [78, 8, 14]], "fin")}}>
      <NavyBg cy={45} />
      <SpeedLines color="rgba(125,211,252,.55)" cx={540} cy={900} inner={460} opacity={0.75} seed="fn" />
      <Director x={-60} y={700} scale={1.0} emo={f < 40 ? "angry" : "wow"} talk={f >= 40 && f < 76} at={0} />
      {f < 64
        ? [0, 1].map((half) => (
            <div key={half} style={{position: "absolute", left: 250, top: 1150, width: 580, height: 330, clipPath: half ? "polygon(50% 0, 100% 0, 100% 100%, 46% 100%, 54% 70%, 45% 45%, 55% 20%)" : "polygon(0 0, 50% 0, 55% 20%, 45% 45%, 54% 70%, 46% 100%, 0 100%)", translate: `${(half ? 1 : -1) * (60 * tear + 700 * fly)}px ${300 * fly}px`, rotate: `${(half ? 1 : -1) * (12 * tear + 40 * fly)}deg`}}>
              <div style={{position: "absolute", inset: 0, background: "#fff", border: `5px solid ${G.ink}`, padding: 24}}>
                <div style={{fontFamily: FONT.mono, fontSize: 24, color: "#888"}}>printout · 1 of 1</div>
                <div style={{...dela(50, G.ink), marginTop: 18}}>▶ China on YouTube:</div>
                <div style={{...inter(38, G.ink), marginTop: 10}}>“all of China in 10 minutes”</div>
                {[0, 1, 2].map((i) => <div key={i} style={{height: 12, marginTop: 18, width: `${88 - i * 16}%`, background: "#D8DEEA"}} />)}
              </div>
            </div>
          ))
        : null}
      <Sfx text="撕!" x={760} y={1080} size={110} color={G.red} stroke="#fff" at={26} font={FONT.zcool} rot={12} until={64} />
      <Say x={420} y={300} w={620} h={330} at={40} tail={[80, 400]} shout>
        <div style={dela(70, G.red, {WebkitTextStroke: `2px ${G.ink}`, paintOrder: "stroke fill"})}>{m("Fucking")} great.</div>
        <div style={dela(66, G.ink)}>Book it.</div>
      </Say>
      {f >= 62 ? <Img src={staticFile(CRYSTAL)} style={{position: "absolute", left: 600, top: 680, width: 420, height: 420, borderRadius: "50%", mixBlendMode: "screen", scale: String(1.8 - 0.8 * cr), rotate: `${(1 - cr) * 90}deg`, opacity: Math.min(1, cr * 1.5)}} /> : null}
      {f >= 78 ? (
        <div style={{position: "absolute", left: 170, top: 1150, width: 740, height: 104, borderRadius: 999, background: G.blue, border: "4px solid #fff", boxShadow: `0 0 ${36 + 20 * Math.sin(f / 6)}px rgba(125,211,252,.8), 9px 9px 0 ${G.ink}`, display: "flex", alignItems: "center", justifyContent: "center", scale: String(1.4 - 0.4 * btn), opacity: Math.min(1, btn * 2)}}>
          <span style={inter(54)}>{typed(f, 82, "globaltechtour.ru", 2)}</span>
        </div>
      ) : null}
      <Answer x={110} y={1286} w={860} at={112} size={32} light>
        DM us — <span style={{color: G.blue}}>we'll match a program to your industry</span>
      </Answer>
      <div style={{position: "absolute", left: 0, right: 0, top: 1412, textAlign: "center", opacity: p(f, 124, 134)}}>
        <span style={{fontFamily: BRUSH, fontSize: 64, color: "#fff", textShadow: `5px 5px 0 ${G.red}`}}>一路顺风</span>
        <span style={{marginLeft: 18, fontFamily: FONT.mono, fontSize: 26, color: G.sky}}>“bon voyage”</span>
      </div>
      <Letterbox h={140 * p(f, 164, 190, EIO)} />
    </AbsoluteFill>
  );
};

// звуки v2 (03.11.2026: «больше разных звуков»): "@имя" — библиотека интернет-материалы/звуки/ (CC0 / CC BY), "@zvukitop/zt-…" — zvukitop.com
const SC: Record<keyof typeof T, [number, string, number][]> = {
  hook: [[6, "@pop-2", 0.5], [10, "@vibrate-1", 0.45], [92, "@glass-1", 0.85], [92, "@impact-1", 0.55], [98, "@whoosh-3", 0.5], [122, "@impact-3", 0.6], [122, "@zvukitop/zt-slap", 0.45], [132, "@zvukitop/zt-wrong", 0.3]],
  drop: [[0, "@impact-2", 0.7], [2, "@whoosh-4", 0.5], [12, "@sweep-1", 0.4], [28, "@click-2", 0.45], [38, "@click-2", 0.45], [48, "@click-2", 0.45], [58, "@zvukitop/zt-cinema-hit", 0.45]],
  ch1: [[0, "@flip-1", 0.6], [8, "@impact-3", 0.4], ...COUNTRIES.map((_, i) => [12 + i * 5, i % 2 ? "@click-2" : "@beep-1", 0.3] as [number, string, number]), [66, "@swipe-1", 0.5], [76, "@zvukitop/zt-slap", 0.45], ...PROGS.map((_, i) => [76 + i * 8, "@pop-1", 0.32] as [number, string, number]), [118, "@click-1", 0.4], [128, "@whoosh-2", 0.4]],
  ch2: [[0, "@whoosh-1", 0.5], [6, "@pop-2", 0.5], [44, "@swipe-1", 0.45], [60, "@pop-1", 0.45], [72, "@pop-1", 0.45], ...PICK.map((_, j) => [80 + j * 14 + 8, "@click-1", 0.55] as [number, string, number]), [130, "@ding-2", 0.3], [94, "@click-2", 0.4], [128, "@whoosh-3", 0.4], [136, "@typewriter-1", 0.5], [138, "@whoosh-2", 0.4], [192, "@whoosh-4", 0.45], [200, "@impact-3", 0.5], [204, "@cheer-1", 0.3]],
  ch3: [[0, "@glitch-1", 0.5], [6, "@pop-2", 0.5], [10, "@heartbeat-1", 0.4], [58, "@shutter-1", 0.45], [70, "@shutter-1", 0.4], [82, "@shutter-1", 0.4], [94, "@shutter-1", 0.4], [106, "@shutter-1", 0.4], [124, "@stamp-1", 0.85], [124, "@impact-4", 0.4], [150, "@whoosh-2", 0.35], [160, "@pop-1", 0.35], [172, "@click-2", 0.35]],
  ch4: [[0, "@flip-1", 0.6], ...CAMPUS.map((_, i) => [14 + i * 10, i % 2 ? "@zvukitop/zt-slap" : "@whoosh-3", 0.32] as [number, string, number]), [74, "@ding-3", 0.5], [78, "@whoosh-2", 0.35]],
  ch5: [[0, "@whoosh-1", 0.5], ...LIST.map((_, i) => [16 + i * 12 + 2, "@zvukitop/zt-click", 0.5] as [number, string, number]), [66, "@ding-2", 0.25], [56, "@swipe-1", 0.45], [92, "@stamp-1", 0.85], [96, "@success-1", 0.35], [108, "@whoosh-3", 0.35], [116, "@shutter-1", 0.35], [128, "@shutter-1", 0.35], [150, "@pop-2", 0.3]],
  ch6: [[0, "@whoosh-4", 0.5], [6, "@shutter-1", 0.4], [18, "@whoosh-2", 0.35], ...CASES.map((_, i) => [48 + i * 8, i % 2 ? "@pop-1" : "@shutter-1", 0.32] as [number, string, number]), [100, "@applause-1", 0.3], [108, "@whoosh-3", 0.35]],
  fin: [[0, "@whoosh-4", 0.5], [26, "@tear-1", 0.85], [40, "@impact-3", 0.5], [44, "@cheer-1", 0.3], [62, "@impact-2", 0.55], [64, "@sweep-1", 0.35], [78, "@boom-1", 0.45], [82, "@typing-1", 0.4], [112, "@whoosh-2", 0.3], [124, "@ding-1", 0.4], [176, "@impact-1", 0.5]],
};
// звук: "whoosh" — @remotion/sfx (source-videos/2026-11-03-od-sait-manhua/sfx/), "@whoosh-2" — библиотека интернет-материалы/звуки/ (CC0 / CC BY, авторы — АВТОРЫ.md)
const sfxSrc = (n: string) => (n.startsWith("@") ? `интернет-материалы/звуки/${n.slice(1)}.wav` : `${SFXP}${n}.wav`);
const SOUNDS: [number, string, number][] = (Object.keys(SC) as (keyof typeof T)[]).flatMap((k) => SC[k].map(([at, n, v]) => [T[k][0] + at, n, v] as [number, string, number]));

// мат знаками во всех версиях (решение пользователя 03.11.2026)
export const GttSiteManhuaEn: React.FC<{clean?: boolean; hema?: string}> = ({clean = true, hema}) => {
  useBrush(true);
  const {fps} = useVideoConfig();
  const f = useCurrentFrame();
  const S = (k: keyof typeof T) => ({from: T[k][0], durationInFrames: T[k][1] - T[k][0], premountFor: fps});
  return (
    <AbsoluteFill style={{background: G.n3, overflow: "hidden"}}>
      <Sequence {...S("hook")}>
        <Hook clean={clean} />
      </Sequence>
      <Sequence {...S("drop")}>
        <CircleReveal dur={10} x={540} y={720}>
          <Drop />
        </CircleReveal>
      </Sequence>
      <Sequence {...S("ch1")}>
        <InkReveal dur={12} id="g1" x={540} y={900}>
          <Ch1 />
        </InkReveal>
      </Sequence>
      <Sequence {...S("ch2")}>
        <SlashReveal dur={12} color={G.blue}>
          <Ch2 clean={clean} />
        </SlashReveal>
      </Sequence>
      <Sequence {...S("ch3")}>
        <GlitchReveal dur={12}>
          <Ch3 hema={hema} />
        </GlitchReveal>
      </Sequence>
      <Sequence {...S("ch4")}>
        <PageReveal dur={14}>
          <Ch4 />
        </PageReveal>
      </Sequence>
      <Sequence {...S("ch5")}>
        <SlashReveal dur={12} color={G.sky}>
          <Ch5 />
        </SlashReveal>
      </Sequence>
      <Sequence {...S("ch6")}>
        <InkReveal dur={12} id="g6" x={540} y={1000}>
          <Ch6 />
        </InkReveal>
      </Sequence>
      <Sequence {...S("fin")}>
        <CircleReveal dur={12} x={540} y={900}>
          <Fin clean={clean} />
        </CircleReveal>
      </Sequence>
      <Grain opacity={0.12} />
      <Vignette strength={0.32} />
      <Audio
        src={staticFile(MUSIC)}
        trimBefore={Math.round(36.03 * fps)}
        volume={(x) => interpolate(x, [0, 150, 156, 774, 788, 1388, 1396, GTT_MANHUA_EN_FRAMES - 45, GTT_MANHUA_EN_FRAMES - 1], [0.55, 0.55, 0.335, 0.335, 0.9, 0.9, 0.5, 0.5, 0], CL)}
      />
      {SOUNDS.map(([at, name, vol], i) => (
        <Sequence key={i} from={at} durationInFrames={Math.round(4.5 * fps)} premountFor={fps}>
          <Audio src={staticFile(sfxSrc(name))} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// проверка без полного рендера: кадр N = кадр start + N × step ролика или frames[N]
export const GttSiteManhuaEnPreview: React.FC<{step: number; start: number; clean?: boolean; frames?: number[]; hema?: string}> = ({step, start, clean, frames, hema}) => {
  const f = useCurrentFrame();
  const at = frames ? frames[Math.min(f, frames.length - 1)] : start + f * step;
  return (
    <Freeze frame={Math.min(GTT_MANHUA_EN_FRAMES - 1, at)}>
      <GttSiteManhuaEn clean={clean} hema={hema} />
    </Freeze>
  );
};
