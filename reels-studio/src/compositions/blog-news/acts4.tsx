// Сцены четвёртого сезона «多 NEWS» — «Китайский ИИ 智能» (07.11.2026: «давай ещё ролики сделаем — для моего сайта 2… и сразу
// к ним обложки»; раньше — «в рамках актуальных статей, которые выходят»: в блоге каждый день выходит серия про китайский ИИ).
// Рубрику держат заставка 多 NEWS, бегущая строка, панчлайн и финал, а внутри сезона — «нейросетевые» сцены:
//   HookChip    — хук «чип»: обложка статьи сверху, огромный процессор-чип включается (дорожки платы загораются, по ним бегут
//                 импульсы, в кристалле — иероглиф выпуска), три слова хука «генерируются» на плашках-токенах с курсором ▌,
//                 на каждом ударе — молнии от чипа;
//   chat        — «окно чата»: вопрос печатается в строке ввода и уходит пузырём, модель «думает» (три точки) и отвечает словами
//                 по очереди, цифра из ответа — плашкой цвета сезона внутри пузыря; лента сообщений сама уезжает вверх;
//   pricewar    — «ценовая война»: ценники падают сверху лесенкой (две колонки), красная ломаная цены идёт вниз от ценника
//                 к ценнику, у последнего — «бесплатно», сверху шлёпается штамп;
//   weights     — «открытые веса»: ящик с моделью распахивается, кубики-веса разлетаются по ноутбукам, серверам и телефонам
//                 всего мира, экраны загораются, внизу набегает число скачиваний;
//   TokenReveal — переход «токены»: новая сцена проявляется плитками по диагонали, плитки на фронте вспыхивают цветом сезона.
// Тексты и цифры — только из статьи; мат — знаками.
import React from "react";
import {AbsoluteFill, Img, random, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {BRUSH} from "../../components/MontazhFx";
import {FONT} from "../site-manhua/fonts";
import {ActionLines, Bubble, C, EIO, EO, Flash, Halftone, Narration, Panel, Sfx, SpeedLines, p, sumShake} from "../site-manhua/fx";
import {BrandPlate, ChapterHead, countNum, dela, numStyle, useAcc, useLang, useLook, type BNBrand, type BNFact} from "./kit";

type Head = {zh: string; kicker: string; title: string; sec: number};
type Snd = [number, string, number];
export type BNChatMsg = {who: "user" | "bot"; text: string; big?: string; bigText?: string; quiet?: boolean};
export type BNChat = Head & {kind: "chat"; bot: {name: string; zh?: string}; user?: {name: string}; msgs: BNChatMsg[]; img?: string; imgPos?: string; note?: string};
export type BNTag = {name: string; logo?: string; icon?: number; when?: string; price: string; sub?: string; free?: boolean};
export type BNPriceWar = Head & {kind: "pricewar"; img?: string; imgPos?: string; unit?: string; tags: BNTag[]; stamp?: {text: string; sub?: string; zh?: string}; note?: string};
export type BNWeights = Head & {kind: "weights"; img?: string; imgPos?: string; box: string; boxZh?: string; boxSub?: string; big: BNFact; chips?: string[]; note?: string};
export type BNAct4 = BNChat | BNPriceWar | BNWeights;

const fitW = (t: string, max: number, w: number, em: number) => Math.min(max, Math.floor(w / (Math.max(1, t.length) * em)));
const UI = {
  ru: {typing: "печатает…", thinking: "думает…", online: "в сети", placeholder: "Сообщение…", free: "БЕСПЛАТНО"},
  en: {typing: "typing…", thinking: "thinking…", online: "online", placeholder: "Message…", free: "FREE"},
};

// ── хук «чип» ────────────────────────────────────────────────────────────────────────────────────────────────────────
const CHIP = {cx: 540, cy: 1300, half: 230, pins: 8, pinLen: 32};
type Trace = {d: string; phase: number};
// дорожки платы: от выводов чипа к краям кадра, с изломами под прямым углом (детерминированно)
const TRACES: Trace[] = (() => {
  const out: Trace[] = [];
  const {cx, cy, half, pins, pinLen} = CHIP;
  const step = (2 * half) / (pins + 1);
  for (let s = 0; s < 4; s++) {
    for (let i = 0; i < pins; i++) {
      if (random(`tr-skip${s}-${i}`) < 0.3) continue;
      const k = -half + step * (i + 1);
      const r = (n: string) => random(`tr${s}-${i}-${n}`);
      let pts: [number, number][] = [];
      if (s === 0) { // влево
        const x0 = cx - half - pinLen, y0 = cy + k, x1 = x0 - 40 - r("a") * 120, y1 = y0 + (r("b") - 0.5) * 220;
        pts = [[x0, y0], [x1, y0], [x1, y1], [-40, y1]];
      } else if (s === 1) { // вправо
        const x0 = cx + half + pinLen, y0 = cy + k, x1 = x0 + 40 + r("a") * 120, y1 = y0 + (r("b") - 0.5) * 220;
        pts = [[x0, y0], [x1, y0], [x1, y1], [1120, y1]];
      } else if (s === 2) { // вверх — до низа обложки, дальше вбок
        const x0 = cx + k, y0 = cy - half - pinLen, y1 = 660 + r("a") * 340, x1 = x0 + (r("b") - 0.5) * 420;
        pts = [[x0, y0], [x0, y1], [x1, y1], [x1 < 540 ? -40 : 1120, y1]];
      } else { // вниз
        const x0 = cx + k, y0 = cy + half + pinLen, y1 = y0 + 50 + r("a") * 90, x1 = x0 + (r("b") - 0.5) * 300;
        pts = [[x0, y0], [x0, y1], [x1, y1], [x1, 2000]];
      }
      out.push({d: pts.map(([x, y], j) => `${j ? "L" : "M"}${x.toFixed(0)},${y.toFixed(0)}`).join(" "), phase: random(`tr${s}-${i}-ph`)});
    }
  }
  return out;
})();

const Bolt: React.FC<{x: number; y: number; ang: number; len: number; seed: string; color: string}> = ({x, y, ang, len, seed, color}) => {
  const pts: string[] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = i === 0 || i === n ? 0 : (random(`${seed}${i}`) - 0.5) * 60;
    const px = x + Math.cos(ang) * len * t - Math.sin(ang) * off;
    const py = y + Math.sin(ang) * len * t + Math.cos(ang) * off;
    pts.push(`${px.toFixed(0)},${py.toFixed(0)}`);
  }
  return (
    <>
      <polyline points={pts.join(" ")} fill="none" stroke={C.ink} strokeWidth={16} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
    </>
  );
};

export const HookChip: React.FC<{h: {lines: string[]; shout: string[]; sfx?: string; chipZh?: string}; cover: string; coverPos?: string; brand?: BNBrand}> = ({h, cover, coverPos, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const light = useLook() === "light";
  const {cx, cy, half, pins, pinLen} = CHIP;
  const cs = spring({frame: f, fps, config: {damping: 12, stiffness: 170, mass: 0.8}});
  const draw = p(f, 2, 26, EO);
  const on = p(f, 38, 46); // «включение» чипа
  const ats = [6, 16, 26];
  const ys = [790, 950, 1110];
  const bub = spring({frame: f - 56, fps, config: {damping: 10, stiffness: 220, mass: 0.6}});
  const step = (2 * half) / (pins + 1);
  const glow = on * (0.75 + 0.25 * Math.sin(f * 0.5));
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[0, 8, 14], [ats[0] + 6, 9, 16], [ats[1] + 6, 9, 16], [ats[2] + 6, 12, 22], [40, 12, 24]], "hch")}}>
      {light ? <Halftone bg={C.paper} dot="rgba(25,25,34,.13)" /> : <AbsoluteFill style={{background: C.ink}} />}
      <SpeedLines color={acc} opacity={0.45} cx={cx} cy={cy} inner={470} seed="hch" />
      {/* дорожки платы и импульсы по ним */}
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0, overflow: "visible"}}>
        {TRACES.map((t, i) => (
          <g key={i}>
            <path d={t.d} fill="none" stroke={C.ink} strokeWidth={12} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            <path d={t.d} fill="none" stroke={on > 0 ? acc : "#B9B6C8"} strokeWidth={5} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            {f > 8 ? <path d={t.d} fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="0.07 0.93" strokeDashoffset={-((f * (on > 0 ? 0.035 : 0.014) + t.phase) % 1)} opacity={0.95} /> : null}
          </g>
        ))}
      </svg>
      <Panel x={40} y={262} w={1000} h={360} at={-8} from="top" poly={[[0, 0], [1, 0], [1, 0.86], [0, 1]]} bg="#000">
        <Img src={staticFile(cover)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: coverPos ?? "50% 50%", scale: String(1.14 - 0.1 * p(f, 0, 100))}} />
      </Panel>
      {/* сам чип: корпус, выводы, кристалл с иероглифом */}
      <div style={{position: "absolute", inset: 0, translate: `0 ${(1 - cs) * 700}px`, scale: String(0.7 + 0.3 * cs), transformOrigin: `${cx}px ${cy}px`}}>
        <svg width={1080} height={1920} style={{position: "absolute", inset: 0, overflow: "visible"}}>
          <defs>
            <radialGradient id="hchDie" cx="50%" cy="50%" r="60%">
              <stop offset="0" stopColor="#fff" stopOpacity={0.5 * on + 0.1} />
              <stop offset="0.45" stopColor={acc} stopOpacity={0.35 + 0.65 * on} />
              <stop offset="1" stopColor="#2A2340" />
            </radialGradient>
          </defs>
          {Array.from({length: pins}).flatMap((_, i) => {
            const k = -half + step * (i + 1);
            const w = 22;
            return [
              <rect key={`l${i}`} x={cx - half - pinLen} y={cy + k - w / 2} width={pinLen + 6} height={w} fill="#D9D6E4" stroke={C.ink} strokeWidth={5} />,
              <rect key={`r${i}`} x={cx + half - 6} y={cy + k - w / 2} width={pinLen + 6} height={w} fill="#D9D6E4" stroke={C.ink} strokeWidth={5} />,
              <rect key={`t${i}`} x={cx + k - w / 2} y={cy - half - pinLen} width={w} height={pinLen + 6} fill="#D9D6E4" stroke={C.ink} strokeWidth={5} />,
              <rect key={`b${i}`} x={cx + k - w / 2} y={cy + half - 6} width={w} height={pinLen + 6} fill="#D9D6E4" stroke={C.ink} strokeWidth={5} />,
            ];
          })}
          {on > 0 ? <rect x={cx - half - 30} y={cy - half - 30} width={2 * half + 60} height={2 * half + 60} rx={60} fill={acc} opacity={0.35 * glow} /> : null}
          <rect x={cx - half} y={cy - half} width={2 * half} height={2 * half} rx={34} fill={C.ink} stroke={C.ink} strokeWidth={10} />
          <rect x={cx - half + 18} y={cy - half + 18} width={2 * half - 36} height={2 * half - 36} rx={22} fill="none" stroke={acc} strokeWidth={6} opacity={0.5 + 0.5 * on} />
          <circle cx={cx - half + 52} cy={cy - half + 52} r={14} fill={acc} opacity={0.4 + 0.6 * on} />
          <rect x={cx - 150} y={cy - 150} width={300} height={300} rx={14} fill="url(#hchDie)" stroke="#fff" strokeWidth={5} />
          {Array.from({length: 5}).map((_, i) => <line key={`g${i}`} x1={cx - 150 + 50 * (i + 1)} y1={cy - 150} x2={cx - 150 + 50 * (i + 1)} y2={cy + 150} stroke="#fff" strokeOpacity={0.14} strokeWidth={3} />)}
          {Array.from({length: 5}).map((_, i) => <line key={`h${i}`} x1={cx - 150} y1={cy - 150 + 50 * (i + 1)} x2={cx + 150} y2={cy - 150 + 50 * (i + 1)} stroke="#fff" strokeOpacity={0.14} strokeWidth={3} />)}
        </svg>
        {h.chipZh ? (
          <div style={{position: "absolute", left: cx - 150, top: cy - 150, width: 300, height: 300, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.zcool, fontSize: 220, lineHeight: 1, color: "#fff", WebkitTextStroke: `8px ${C.ink}`, paintOrder: "stroke fill", scale: String(0.85 + 0.15 * on + 0.04 * Math.sin(f * 0.4) * on), textShadow: on > 0 ? `0 0 ${30 * glow}px ${acc}` : undefined}}>{h.chipZh}</div>
        ) : null}
      </div>
      {/* молнии на каждом ударе */}
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none"}}>
        {[...ats.map((a) => a + 6), 40].flatMap((a, k) => (f >= a && f < a + 7 ? Array.from({length: 5}).map((_, i) => {
          const ang = (i / 5) * Math.PI * 2 + random(`bang${k}${i}`) * 0.8;
          return <Bolt key={`${k}-${i}`} x={cx + Math.cos(ang) * (half + 40)} y={cy + Math.sin(ang) * (half + 40)} ang={ang} len={120 + random(`blen${k}${i}`) * 90} seed={`bl${k}${i}${f}`} color={acc} />;
        }) : []))}
      </svg>
      {/* три слова — плашки-токены, текст «генерируется» с курсором */}
      {h.lines.slice(0, 3).map((t, i) => {
        const at = ats[i];
        if (f < at) return null;
        const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 300, mass: 0.6}});
        const size = fitW(t, 108, 860, 0.86);
        const fromL = i % 2 === 0;
        const n = Math.ceil(t.length * p(f, at + 1, at + 9));
        const cur = f < at + 14 && (n < t.length || Math.floor(f / 4) % 2 === 0);
        return (
          <div key={i} style={{position: "absolute", left: 540, top: ys[i], translate: `calc(-50% + ${(1 - s) * (fromL ? -900 : 900)}px) -50%`, rotate: `${fromL ? -2.5 : 2.5}deg`}}>
            <div style={{position: "relative", background: i === 1 ? acc : "#fff", border: `8px solid ${C.ink}`, borderRadius: 18, boxShadow: `12px 12px 0 ${i === 2 ? C.red : C.ink}`, padding: "8px 30px 12px", whiteSpace: "nowrap", ...dela(size, i === 2 ? C.red : C.ink)}}>
              <span>{t.slice(0, n)}</span>
              <span style={{position: "relative"}}>{cur ? <span style={{position: "absolute", left: 2, top: 0, color: C.ink, opacity: 0.75}}>▌</span> : null}</span>
              <span style={{opacity: 0}}>{t.slice(n)}</span>
            </div>
          </div>
        );
      })}
      {h.sfx ? <Sfx text={h.sfx} x={860} y={1250} size={150} color={C.red} stroke="#fff" rot={14} at={40} font={BRUSH} /> : null}
      {f >= 56 ? (
        <Bubble x={430} y={280} w={620} h={290} shout tail={[120, 470]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
          {h.shout.map((t, i) => <div key={i} style={dela(Math.min(i ? 54 : 44, Math.floor(470 / (Math.max(1, t.length) * 0.6))), i ? C.red : C.ink, {whiteSpace: "nowrap"})}>{t}</div>)}
        </Bubble>
      ) : null}
      {brand ? <BrandPlate b={brand} at={44} x={64} y={1446} scale={0.74} rot={-3} /> : null}
      <Flash at={40} dur={4} max={0.45} color={acc} />
    </AbsoluteFill>
  );
};
export const SND_HOOK_CHIP: Snd[] = [[-6, "@whoosh-3", 0.45], [0, "@impact-3", 0.45], [0, "@zvukitop/zt-slap", 0.3], [2, "@servo-1", 0.3], [4, "@sweep-1", 0.3],
  [6, "@whoosh-2", 0.4], [7, "@typing-1", 0.25], [12, "@impact-3", 0.5], [12, "@laser-1", 0.3], [16, "@whoosh-3", 0.4], [17, "@typing-1", 0.25], [22, "@impact-3", 0.5], [22, "@laser-2", 0.3],
  [26, "@whoosh-2", 0.4], [27, "@typing-1", 0.25], [32, "@impact-1", 0.55], [32, "@glitch-3", 0.35], [38, "@robot-1", 0.35], [40, "@boom-1", 0.5], [40, "@zvukitop/zt-cinema-hit", 0.3],
  [56, "@pop-2", 0.45], [58, "@impact-2", 0.4], [80, "@riser-2", 0.3]];

// ── переход «токены» ─────────────────────────────────────────────────────────────────────────────────────────────────
const TW = 90, TH = 96, TC = 12, TR = 20;
const TILE_T = Array.from({length: TC * TR}).map((_, i) => {
  const c = i % TC, r = Math.floor(i / TC);
  return 0.78 * ((c + r * 0.62) / (TC - 1 + (TR - 1) * 0.62)) + 0.22 * random(`tok${i}`);
});
export const TokenReveal: React.FC<{children: React.ReactNode; dur: number; acc: string}> = ({children, dur, acc}) => {
  const f = useCurrentFrame();
  const k = p(f, 0, dur, EIO) * 1.18;
  if (k >= 1.18) return <>{children}</>;
  const shown: string[] = [];
  const front: React.ReactNode[] = [];
  TILE_T.forEach((t, i) => {
    const x = (i % TC) * TW, y = Math.floor(i / TC) * TH;
    if (k >= t + 0.1) shown.push(`M${x},${y}h${TW}v${TH}h${-TW}Z`);
    else if (k >= t) {
      const s = Math.sin(((k - t) / 0.1) * Math.PI);
      front.push(<rect key={i} x={x + (TW * (1 - s)) / 2 + 3} y={y + (TH * (1 - s)) / 2 + 3} width={Math.max(0, TW * s - 6)} height={Math.max(0, TH * s - 6)} rx={10} fill={i % 3 ? acc : C.ink} stroke={C.ink} strokeWidth={4} />);
    }
  });
  return (
    <>
      <AbsoluteFill style={{clipPath: shown.length ? `path('${shown.join(" ")}')` : "polygon(0 0, 0 0, 0 0)"}}>{children}</AbsoluteFill>
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0, overflow: "visible"}}>{front}</svg>
    </>
  );
};

// ── «окно чата» ──────────────────────────────────────────────────────────────────────────────────────────────────────
// расписание: вопрос печатается в строке ввода и уходит, ответ — три точки, потом слова по очереди, потом цифра
type ChatStep = {start: number; send: number; end: number; bigAt: number};
export const chatPlan = (b: BNChat, dur: number): ChatStep[] => {
  const nat = b.msgs.map((m) => {
    const words = m.text.split(/\s+/).length;
    if (m.who === "user") return {a: Math.min(22, Math.max(8, 6 + m.text.length * 0.32)), b: 0, c: 0, gap: 7};
    return {a: 10, b: Math.min(34, Math.max(10, 6 + words * 1.8)), c: m.big ? 14 : 0, gap: 9};
  });
  const total = nat.reduce((s, x) => s + x.a + x.b + x.c + x.gap, 0);
  const avail = dur * (b.note ? 0.84 : 0.92) - 10;
  const k = Math.min(1.45, Math.max(0.6, avail / total));
  let t = 10;
  return nat.map((x) => {
    const start = t;
    const send = start + x.a * k;
    const end = send + x.b * k;
    const bigAt = end;
    t = end + (x.c + x.gap) * k;
    return {start: Math.round(start), send: Math.round(send), end: Math.round(end), bigAt: Math.round(bigAt)};
  });
};
const Dots: React.FC<{f: number}> = ({f}) => (
  <div style={{display: "flex", gap: 10, padding: "8px 4px"}}>
    {[0, 1, 2].map((i) => <div key={i} style={{width: 16, height: 16, borderRadius: 8, background: C.ink, opacity: 0.35 + 0.65 * Math.max(0, Math.sin(f * 0.45 - i * 0.9)), translate: `0 ${-6 * Math.max(0, Math.sin(f * 0.45 - i * 0.9))}px`}} />)}
  </div>
);
export const ChatAct: React.FC<{b: BNChat; dur: number; brand?: BNBrand}> = ({b, dur, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const lang = useLang();
  const ui = UI[lang];
  const plan = chatPlan(b, dur);
  const WX = 64, WW = 952, WY = 440, WB = b.note ? 1318 : 1440;
  const HEAD = 96, INPUT = 108, imgH = b.img ? 210 : 0;
  const wy = spring({frame: f, fps, config: {damping: 13, stiffness: 170, mass: 0.8}});
  // кто сейчас «печатает»: вопрос — в строке ввода, ответ — в статусе шапки
  const typingUser = plan.findIndex((s, i) => b.msgs[i].who === "user" && f >= s.start && f < s.send);
  const botState = plan.reduce<string>((st, s, i) => (b.msgs[i].who === "bot" && f >= s.start ? (f < s.send ? ui.thinking : f < s.end ? ui.typing : ui.online) : st), ui.online);
  const draft = typingUser >= 0 ? b.msgs[typingUser].text.slice(0, Math.ceil(b.msgs[typingUser].text.length * p(f, plan[typingUser].start, plan[typingUser].send - 2))) : "";
  const lastSend = plan.reduce((m, s, i) => (b.msgs[i].who === "user" && f >= s.send ? s.send : m), -99);
  const sendPulse = f >= lastSend && f < lastSend + 8 ? 1 - (f - lastSend) / 8 : 0;
  const userInitial = (b.user?.name ?? (lang === "en" ? "Me" : "Я")).slice(0, 1).toUpperCase();
  const lastBig = plan.reduce((m, s, i) => (b.msgs[i].big && f >= s.bigAt ? s.bigAt : m), -99);
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[lastBig, 10, 18], [lastSend, 4, 8]], b.title)}}>
      <Halftone bg={C.paper} dot="rgba(25,25,34,.12)" />
      <SpeedLines color={acc} opacity={0.35} cx={540} cy={900} inner={560} seed={`${b.title}ch`} />
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} />
      <div style={{position: "absolute", left: WX, top: WY, width: WW, height: WB - WY, translate: `0 ${(1 - wy) * 1000}px`}}>
        <div style={{position: "absolute", inset: 0, background: "#FFFDF8", border: `8px solid ${C.ink}`, borderRadius: 30, boxShadow: `14px 14px 0 ${C.ink}`, overflow: "hidden"}}>
          {/* шапка окна */}
          <div style={{position: "absolute", left: 0, right: 0, top: 0, height: HEAD, background: acc, borderBottom: `6px solid ${C.ink}`, display: "flex", alignItems: "center", gap: 18, padding: "0 24px"}}>
            <div style={{display: "flex", gap: 10}}>
              {[C.red, C.ink, "#fff"].map((c, i) => <div key={i} style={{width: 20, height: 20, borderRadius: 10, background: c, border: `4px solid ${C.ink}`}} />)}
            </div>
            <div style={{width: 60, height: 60, borderRadius: 12, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.zcool, fontSize: 44, color: acc}}>{b.bot.zh ?? "智"}</div>
            <div style={{display: "flex", flexDirection: "column", minWidth: 0}}>
              <span style={{...dela(fitW(b.bot.name, 36, 470, 0.7), C.ink), whiteSpace: "nowrap"}}>{b.bot.name}</span>
              <span style={{fontFamily: FONT.mono, fontSize: 22, color: C.ink, opacity: 0.85}}>{`● ${botState}`}</span>
            </div>
          </div>
          {b.img ? (
            <div style={{position: "absolute", left: 0, right: 0, top: HEAD, height: imgH, overflow: "hidden", borderBottom: `6px solid ${C.ink}`}}>
              <Img src={staticFile(b.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 50%", scale: String(1.04 + 0.08 * p(f, 0, dur))}} />
            </div>
          ) : null}
          {/* лента сообщений: прижата к низу, старые уезжают вверх */}
          <div style={{position: "absolute", left: 26, right: 26, top: HEAD + imgH + 10, bottom: INPUT + 10, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 18, overflow: "hidden"}}>
            {b.msgs.map((m, i) => {
              const s = plan[i];
              const appear = m.who === "user" ? s.send : s.start;
              if (f < appear) return null;
              const grow = p(f, appear, appear + 7, EO);
              const pop = spring({frame: f - appear, fps, config: {damping: 11, stiffness: 280, mass: 0.6}});
              if (m.who === "user") {
                return (
                  <div key={i} style={{display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 14, maxHeight: 60 + 560 * grow, flexShrink: 0, overflow: "hidden", padding: "0 4px 8px 0"}}>
                    <div style={{maxWidth: 660, background: C.ink, color: m.quiet ? "rgba(255,255,255,.7)" : "#fff", borderRadius: "30px 30px 6px 30px", padding: "16px 26px 18px", fontFamily: FONT.golos, fontWeight: 800, fontStyle: m.quiet ? "italic" : "normal", fontSize: 34, lineHeight: 1.22, scale: String(0.7 + 0.3 * pop), transformOrigin: "100% 100%"}}>{m.text}</div>
                    <div style={{width: 58, height: 58, flexShrink: 0, borderRadius: 29, background: "#fff", border: `5px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", ...dela(28, C.ink)}}>{userInitial}</div>
                  </div>
                );
              }
              const words = m.text.split(/\s+/);
              const nW = f < s.send ? 0 : Math.ceil(words.length * p(f, s.send, s.end));
              const streaming = f >= s.send && f < s.end + 6;
              const bs = spring({frame: f - s.bigAt, fps, config: {damping: 9, stiffness: 280, mass: 0.6}});
              return (
                <div key={i} style={{display: "flex", justifyContent: "flex-start", alignItems: "flex-start", gap: 14, maxHeight: 60 + 560 * grow, flexShrink: 0, overflow: "hidden", padding: "0 10px 10px 0"}}>
                  <div style={{width: 58, height: 58, flexShrink: 0, borderRadius: 12, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.zcool, fontSize: 40, color: acc}}>{b.bot.zh ?? "智"}</div>
                  <div style={{maxWidth: 740, background: "#fff", border: `5px solid ${C.ink}`, borderRadius: "6px 30px 30px 30px", padding: "14px 24px 16px", boxShadow: `6px 6px 0 ${acc}`, scale: String(0.7 + 0.3 * pop), transformOrigin: "0 0"}}>
                    {f < s.send ? <Dots f={f} /> : (
                      <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 34, lineHeight: 1.22, color: C.ink}}>
                        {words.slice(0, nW).join(" ")}
                        {streaming ? <span style={{color: acc, WebkitTextStroke: `2px ${C.ink}`}}>{" ▌"}</span> : null}
                      </div>
                    )}
                    {m.big && f >= s.bigAt ? (
                      <div style={{display: "flex", alignItems: "center", gap: 18, marginTop: 14, maxHeight: 140 * Math.min(1, bs * 1.5), overflow: "visible"}}>
                        <div style={{background: acc, border: `6px solid ${C.ink}`, boxShadow: `8px 8px 0 ${C.red}`, padding: "2px 20px 8px", rotate: "-2deg", scale: String(0.4 + 0.6 * bs), transformOrigin: "0 50%", ...numStyle(fitW(m.big, 64, 380, 0.68), C.ink)}}>{m.big}</div>
                        {m.bigText ? <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 28, lineHeight: 1.15, color: C.ink, opacity: p(f, s.bigAt + 6, s.bigAt + 12)}}>{m.bigText}</div> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {/* строка ввода */}
          <div style={{position: "absolute", left: 22, right: 22, bottom: 18, height: INPUT - 26, display: "flex", alignItems: "center", gap: 16}}>
            <div style={{flex: 1, height: "100%", background: "#fff", border: `5px solid ${C.ink}`, borderRadius: 40, display: "flex", alignItems: "center", padding: "0 26px", overflow: "hidden", whiteSpace: "nowrap", fontFamily: FONT.golos, fontWeight: 700, fontSize: 30, color: draft ? C.ink : "rgba(21,21,29,.4)"}}>
              {draft || ui.placeholder}
              {draft ? <span style={{color: C.ink, opacity: Math.floor(f / 4) % 2 ? 1 : 0.2}}>|</span> : null}
            </div>
            <div style={{width: 76, height: 76, flexShrink: 0, borderRadius: 38, background: draft ? acc : "#E4E1EC", border: `5px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", ...dela(36, C.ink), scale: String(1 + 0.25 * sendPulse)}}>↑</div>
          </div>
        </div>
      </div>
      {brand ? <BrandPlate b={brand} at={10} x={650} y={376} scale={0.52} rot={3} /> : null}
      {b.note ? <Narration x={64} y={b.note.length > 90 ? 1336 : 1352} w={952} at={Math.round(dur * 0.86)} font={FONT.golos} size={b.note.length > 90 ? 28 : 30} bg={acc}>{b.note}</Narration> : null}
      {lastBig > 0 ? <Flash at={lastBig} dur={4} max={0.3} /> : null}
    </AbsoluteFill>
  );
};
export const sndChat = (b: BNChat, d: number): Snd[] => {
  const plan = chatPlan(b, d);
  return [[0, "@whoosh-4", 0.45], [2, "@zvukitop/zt-click", 0.3], [6, "@beep-1", 0.3],
    ...b.msgs.flatMap((m, i) => {
      const s = plan[i];
      if (m.who === "user") return [[s.start, "@typing-1", 0.32], [s.send, "@swipe-1", 0.35], [s.send + 1, "@pop-1", 0.4]] as Snd[];
      return [[s.start, "@pop-2", 0.3], [s.start + 2, "@beep-1", 0.25], [s.send, "@zvukitop/zt-typewriter", 0.28], [s.send + 1, "@click-2", 0.25],
        ...(m.big ? [[s.bigAt, "@impact-3", 0.45], [s.bigAt + 2, "@coin-1", 0.35], [s.bigAt + 8, "@zvukitop/zt-ding", 0.3]] as Snd[] : [])] as Snd[];
    }),
    ...(b.note ? [[Math.round(d * 0.86), "@typewriter-1", 0.35]] as Snd[] : [])];
};

// ── «ценовая война» ──────────────────────────────────────────────────────────────────────────────────────────────────
const TAG_W = 474, TAG_H = 168;
const pwLayout = (b: BNPriceWar, dur: number) => {
  const n = b.tags.length;
  const y0 = b.img ? 744 : 540;
  const bottom = b.note ? 1306 : 1446;
  const stepY = Math.max(90, Math.min(200, (bottom - y0 - TAG_H) / Math.max(1, n - 1)));
  const step = Math.floor((dur * 0.62 - 14) / n);
  const tS = Math.round(dur * 0.74);
  const pos = b.tags.map((_, i) => ({x: i % 2 ? 1016 - TAG_W : 64, y: y0 + i * stepY, at: 14 + i * step}));
  return {pos, step, tS, y0};
};
export const PriceWarAct: React.FC<{b: BNPriceWar; dur: number; brand?: BNBrand}> = ({b, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const lang = useLang();
  const {pos, tS, y0} = pwLayout(b, dur);
  const st = spring({frame: f - tS, fps, config: {damping: 8, stiffness: 320, mass: 0.6}});
  // ломаная цены — через центры ценников
  const pts = pos.map((q) => [q.x + TAG_W / 2, q.y + TAG_H / 2] as [number, number]);
  const segs = pts.slice(1).map((q, i) => {
    const a = pts[i];
    const k = p(f, pos[i + 1].at - 2, pos[i + 1].at + 10, EO);
    return {a, b: [a[0] + (q[0] - a[0]) * k, a[1] + (q[1] - a[1]) * k] as [number, number], k};
  });
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tS, 14, 26], ...pos.map((q) => [q.at + 6, 6, 10] as [number, number, number])], b.title)}}>
      <Halftone bg={C.paper} dot="rgba(232,52,28,.12)" />
      <ActionLines color={C.red} opacity={0.1} angle={-14} seed={`${b.title}pw`} />
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} />
      {b.img ? (
        <Panel x={64} y={438} w={952} h={226} at={4} from="top" poly={[[0, 0], [1, 0], [1, 0.86], [0, 1]]} bg="#000">
          <Img src={staticFile(b.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 40%", scale: String(1.05 + 0.06 * p(f, 0, dur))}} />
        </Panel>
      ) : null}
      {b.unit && f >= 6 ? (
        <div style={{position: "absolute", right: 64, top: y0 - 70, background: C.ink, color: acc, border: `4px solid ${C.ink}`, padding: "6px 18px", fontFamily: FONT.oswald, fontSize: 28, letterSpacing: "0.08em", boxShadow: `6px 6px 0 ${C.red}`, rotate: "1.5deg", whiteSpace: "nowrap", opacity: p(f, 6, 12)}}>{b.unit}</div>
      ) : null}
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0, overflow: "visible"}}>
        {segs.map((s, i) => (s.k > 0 ? (
          <g key={i}>
            <line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={C.ink} strokeWidth={30} strokeLinecap="round" />
            <line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={C.red} strokeWidth={16} strokeLinecap="round" />
          </g>
        ) : null))}
      </svg>
      {b.tags.map((t, i) => {
        const q = pos[i];
        if (f < q.at) return null;
        const s = spring({frame: f - q.at, fps, config: {damping: 9, stiffness: 200, mass: 0.8}});
        const swing = 6 * Math.exp(-(f - q.at) / 12) * Math.cos((f - q.at) / 3.2) * (i % 2 ? -1 : 1);
        const pSize = fitW(t.price, 62, 210, 0.68);
        const fr = t.free && f >= q.at + 12 ? spring({frame: f - q.at - 12, fps, config: {damping: 8, stiffness: 320, mass: 0.6}}) : 0;
        return (
          <div key={i} style={{position: "absolute", left: q.x, top: q.y, width: TAG_W, height: TAG_H, translate: `0 ${(1 - s) * -420}px`, rotate: `${(i % 2 ? 2 : -2) + swing}deg`, transformOrigin: "34px 74px"}}>
            {/* шнурок к гвоздику */}
            <svg width={TAG_W} height={TAG_H} style={{position: "absolute", inset: 0, overflow: "visible"}}>
              <path d={`M34,74 Q${i % 2 ? -30 : 10},10 ${i % 2 ? -18 : 40},-40`} fill="none" stroke={C.ink} strokeWidth={4} />
              <polygon points={`36,0 ${TAG_W},0 ${TAG_W},${TAG_H} 36,${TAG_H} 0,${TAG_H / 2}`} fill={t.free ? acc : "#FFFBEF"} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
              <circle cx={34} cy={TAG_H / 2} r={11} fill={C.paper} stroke={C.ink} strokeWidth={5} />
            </svg>
            <div style={{position: "absolute", left: 60, top: 14, right: 16, bottom: 12, display: "flex", alignItems: "center", gap: 12}}>
              <div style={{flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4}}>
                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                  {t.logo ? (
                    <div style={{height: 40, overflow: "hidden", width: t.icon ? 40 * t.icon * 3.64 : "auto", flexShrink: 0}}>
                      <Img src={staticFile(t.logo)} style={{height: 40, width: "auto", display: "block"}} />
                    </div>
                  ) : null}
                  <span style={{fontFamily: FONT.dela, fontSize: fitW(t.name, 30, t.logo ? 190 : 250, 0.66), color: C.ink, whiteSpace: "nowrap", lineHeight: 1.1}}>{t.name}</span>
                </div>
                {t.when ? <div style={{fontFamily: FONT.oswald, fontSize: 26, letterSpacing: "0.06em", color: C.red, lineHeight: 1.1}}>{t.when}</div> : null}
                {t.sub ? <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 25, lineHeight: 1.1, color: C.ink, opacity: 0.85}}>{t.sub}</div> : null}
              </div>
              <div style={{flexShrink: 0, ...numStyle(pSize, i === 0 ? C.ink : C.red), scale: String(0.4 + 0.6 * Math.min(1, s * 1.2))}}>{t.price}</div>
            </div>
            {t.free && fr > 0 ? (
              <div style={{position: "absolute", left: TAG_W + 24, top: TAG_H * 0.8, translate: "0 -50%", rotate: "-8deg", transformOrigin: "0 50%", scale: String(2.2 - 1.2 * fr), opacity: Math.min(1, fr * 2), border: `7px solid ${C.red}`, background: "rgba(255,255,255,.92)", padding: "0 18px 2px", ...dela(38, C.red, {letterSpacing: "0.04em", whiteSpace: "nowrap"})}}>{UI[lang].free}</div>
            ) : null}
          </div>
        );
      })}
      {b.stamp && f >= tS ? (
        <div style={{position: "absolute", left: 540, top: (y0 + (b.note ? 1318 : 1446)) / 2, translate: "-50% -50%", rotate: "-10deg", scale: String(2.4 - 1.4 * st), opacity: Math.min(1, st * 2), border: `12px solid ${C.red}`, padding: "8px 34px", background: "rgba(255,255,255,.9)", textAlign: "center", boxShadow: "0 0 0 6px #fff", whiteSpace: "nowrap"}}>
          <div style={dela(fitW(b.stamp.text, 84, 760, 0.74), C.red, {letterSpacing: "0.03em"})}>{b.stamp.text}</div>
          {b.stamp.sub ? <div style={{fontFamily: FONT.mono, fontSize: 28, color: C.red}}>{b.stamp.sub}</div> : null}
          {b.stamp.zh ? <div style={{position: "absolute", right: -66, top: -64, fontFamily: BRUSH, fontSize: 96, color: C.red, rotate: "14deg"}}>{b.stamp.zh}</div> : null}
        </div>
      ) : null}
      {b.note ? <Narration x={64} y={b.note.length > 90 ? 1336 : 1352} w={952} at={Math.round(dur * 0.86)} font={FONT.golos} size={b.note.length > 90 ? 28 : 30} bg={acc}>{b.note}</Narration> : null}
      <Flash at={tS} dur={4} max={0.35} />
    </AbsoluteFill>
  );
};
export const sndPriceWar = (b: BNPriceWar, d: number): Snd[] => {
  const {pos, tS} = pwLayout(b, d);
  return [[0, "@flip-1", 0.5], [0, "@zvukitop/zt-paper", 0.25], [6, "@click-1", 0.3],
    ...b.tags.flatMap((t, i) => [[pos[i].at - 4, i % 2 ? "@whoosh-3" : "@whoosh-2", 0.4], [pos[i].at + 4, "@impact-3", 0.4], [pos[i].at + 6, i ? "@zvukitop/zt-cash" : "@coin-1", 0.3],
      ...(i ? [[pos[i].at, "@sweep-1", 0.25]] : []), ...(t.free ? [[pos[i].at + 12, "@stamp-1", 0.5], [pos[i].at + 13, "@zvukitop/zt-wrong", 0.35], [pos[i].at + 14, "@glass-1", 0.3]] : [])] as Snd[]),
    ...(b.stamp ? [[tS, "@stamp-1", 0.6], [tS, "@impact-4", 0.45], [tS + 2, "@zvukitop/zt-anvil", 0.3]] as Snd[] : []),
    ...(b.note ? [[Math.round(d * 0.86), "@typewriter-1", 0.35]] as Snd[] : [])];
};

// ── «открытые веса» ──────────────────────────────────────────────────────────────────────────────────────────────────
const DEV = {x0: 556, y0: 780, cols: 5, rows: 4, dx: 92, dy: 92};
const Device: React.FC<{kind: number; lit: number; acc: string}> = ({kind, lit, acc}) => {
  const scr = lit > 0 ? acc : "#D9D6E4";
  if (kind === 0) return ( // ноутбук
    <svg width={74} height={60} viewBox="0 0 74 60" style={{overflow: "visible"}}>
      <rect x={10} y={4} width={54} height={38} rx={4} fill={scr} stroke={C.ink} strokeWidth={5} />
      <polygon points="2,46 72,46 66,56 8,56" fill="#fff" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
    </svg>
  );
  if (kind === 1) return ( // сервер
    <svg width={74} height={60} viewBox="0 0 74 60" style={{overflow: "visible"}}>
      {[0, 1, 2].map((r) => <g key={r}><rect x={12} y={4 + r * 18} width={50} height={16} rx={3} fill="#fff" stroke={C.ink} strokeWidth={4} /><circle cx={52} cy={12 + r * 18} r={4} fill={lit > 0 ? acc : "#B9B6C8"} stroke={C.ink} strokeWidth={2} /></g>)}
    </svg>
  );
  return ( // телефон
    <svg width={74} height={60} viewBox="0 0 74 60" style={{overflow: "visible"}}>
      <rect x={22} y={0} width={30} height={58} rx={7} fill="#fff" stroke={C.ink} strokeWidth={5} />
      <rect x={27} y={7} width={20} height={40} rx={2} fill={scr} />
    </svg>
  );
};
const Cube: React.FC<{x: number; y: number; s: number; acc: string; rot: number}> = ({x, y, s, acc, rot}) => (
  <svg width={s * 2} height={s * 2} viewBox="-26 -26 52 52" style={{position: "absolute", left: x - s, top: y - s, overflow: "visible", rotate: `${rot}deg`}}>
    <polygon points="0,-22 20,-11 0,0 -20,-11" fill="#fff" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
    <polygon points="-20,-11 0,0 0,22 -20,11" fill={acc} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
    <polygon points="20,-11 0,0 0,22 20,11" fill="#7A63D6" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
  </svg>
);
const wTimes = (dur: number) => {
  const tOpen = 14;
  const nD = DEV.cols * DEV.rows;
  const fly = 14;
  const gap = Math.max(1.6, Math.min(3, (dur * 0.42 - tOpen - fly) / nD));
  const tBig = Math.round(dur * 0.52);
  return {tOpen, nD, fly, gap, tBig, tC: tBig + 30};
};
export const WeightsAct: React.FC<{b: BNWeights; dur: number; brand?: BNBrand}> = ({b, dur, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const lang = useLang();
  const {tOpen, nD, fly, gap, tBig, tC} = wTimes(dur);
  const bx = 300, by = 930, BW = 340, BH = 230; // ящик: центр и размер
  const lid = p(f, tOpen, tOpen + 8, EO);
  const bs = spring({frame: f - tBig, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  const boxIn = spring({frame: f - 2, fps, config: {damping: 11, stiffness: 220, mass: 0.7}});
  const bigStr = `${b.big.pre ?? ""}${b.big.num ?? ""}${b.big.suf ?? ""}`;
  const multiply = p(f, tOpen + nD * gap + fly, tOpen + nD * gap + fly + 16, EO); // экраны «размножаются» — весь мир
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tOpen, 10, 18], [tBig, 12, 22]], b.title)}}>
      <Halftone bg={C.paper} dot="rgba(25,25,34,.12)" />
      <SpeedLines color={acc} opacity={0.4} cx={bx} cy={by} inner={300} seed={`${b.title}w`} />
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} />
      {b.img ? (
        <Panel x={64} y={438} w={952} h={300} at={4} from="top" poly={[[0, 0], [1, 0], [1, 0.88], [0, 1]]} bg="#000">
          <Img src={staticFile(b.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 40%", scale: String(1.05 + 0.06 * p(f, 0, dur))}} />
        </Panel>
      ) : null}
      {brand ? <BrandPlate b={brand} at={10} x={650} y={b.img ? 664 : 404} scale={0.56} rot={3} /> : null}
      {/* мир получателей: ноутбуки, серверы, телефоны; за ними — поле из тысяч точек */}
      {multiply > 0 ? (
        <div style={{position: "absolute", left: DEV.x0 - 20, top: DEV.y0 - 24, width: DEV.cols * DEV.dx + 40, height: DEV.rows * DEV.dy + 16, opacity: multiply * 0.9, backgroundImage: `radial-gradient(${acc} 3.2px, transparent 3.8px)`, backgroundSize: "14px 14px", border: `5px solid ${C.ink}`, borderRadius: 16, boxShadow: `8px 8px 0 ${C.ink}`, scale: String(0.9 + 0.1 * multiply)}} />
      ) : null}
      {Array.from({length: nD}).map((_, i) => {
        const c = i % DEV.cols, r = Math.floor(i / DEV.cols);
        const land = tOpen + i * gap + fly;
        const lit = f >= land ? 1 : 0;
        const ap = p(f, 4 + i * 0.6, 10 + i * 0.6, EO);
        const pop = f >= land && f < land + 6 ? 1 + 0.25 * (1 - (f - land) / 6) : 1;
        return (
          <div key={i} style={{position: "absolute", left: DEV.x0 + c * DEV.dx, top: DEV.y0 + r * DEV.dy, opacity: ap * (1 - 0.65 * multiply), scale: String(ap * pop)}}>
            <Device kind={(c + r) % 3} lit={lit} acc={acc} />
          </div>
        );
      })}
      {/* кубики-веса летят из ящика к получателям */}
      {Array.from({length: nD}).map((_, i) => {
        const t0 = tOpen + i * gap;
        if (f < t0 || f > t0 + fly) return null;
        const k = (f - t0) / fly;
        const c = i % DEV.cols, r = Math.floor(i / DEV.cols);
        const tx = DEV.x0 + c * DEV.dx + 37, ty = DEV.y0 + r * DEV.dy + 26;
        const sx = bx + (random(`wx${i}`) - 0.5) * 120, sy = by - BH / 2;
        const x = sx + (tx - sx) * k, y = sy + (ty - sy) * k - Math.sin(k * Math.PI) * (160 + random(`wh${i}`) * 120);
        return <Cube key={`c${i}`} x={x} y={y} s={22} acc={acc} rot={f * 9 + i * 30} />;
      })}
      {/* ящик с моделью */}
      <div style={{position: "absolute", left: bx - BW / 2, top: by - BH / 2, width: BW, height: BH, translate: `${(1 - boxIn) * -700}px 0`}}>
        {f >= tOpen ? (
          <svg width={BW} height={BH} style={{position: "absolute", inset: 0, overflow: "visible"}}>
            {Array.from({length: 7}).map((_, i) => {
              const a = -Math.PI / 2 + (i - 3) * 0.32;
              const L = 170 * lid;
              return <polygon key={i} points={`${BW / 2},4 ${BW / 2 + Math.cos(a - 0.08) * L},${4 + Math.sin(a - 0.08) * L} ${BW / 2 + Math.cos(a + 0.08) * L},${4 + Math.sin(a + 0.08) * L}`} fill={acc} opacity={0.55 * (1 - 0.3 * Math.sin(f * 0.3 + i))} />;
            })}
          </svg>
        ) : null}
        <div style={{position: "absolute", inset: 0, background: "#C9A26B", border: `8px solid ${C.ink}`, boxShadow: `10px 10px 0 ${C.ink}`, backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,.08) 0 4px, transparent 4px 46px)"}} />
        <div style={{position: "absolute", left: 0, right: 0, top: BH * 0.32, height: 70, background: acc, borderTop: `6px solid ${C.ink}`, borderBottom: `6px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", ...dela(fitW(b.box, 44, BW - 50, 0.7), C.ink, {whiteSpace: "nowrap"})}}>{b.box}</div>
        {b.boxZh ? <div style={{position: "absolute", right: 14, bottom: 8, fontFamily: BRUSH, fontSize: 56, color: C.red, lineHeight: 1}}>{b.boxZh}</div> : null}
        {/* крышка: откидывается назад */}
        <div style={{position: "absolute", left: -12, top: -34, width: BW + 24, height: 42, background: "#B88D55", border: `7px solid ${C.ink}`, transformOrigin: "100% 100%", rotate: `${lid * 64}deg`, translate: `${lid * 30}px ${-lid * 40}px`}} />
      </div>
      {b.boxSub && f >= 8 ? (
        <div style={{position: "absolute", left: bx - 230, top: by + BH / 2 + 26, width: 460, textAlign: "center", fontFamily: FONT.golos, fontWeight: 800, fontSize: 26, lineHeight: 1.15, color: C.ink, opacity: p(f, 8, 14)}}>{b.boxSub}</div>
      ) : null}
      {/* число и плашки */}
      {f >= tBig ? (
        <div style={{position: "absolute", left: 64, top: 1150, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12}}>
          <div style={{background: acc, border: `8px solid ${C.ink}`, boxShadow: `12px 12px 0 ${C.ink}`, padding: "2px 24px 8px", rotate: "-3deg", scale: String(0.4 + 0.6 * bs), transformOrigin: "0 50%", ...numStyle(fitW(bigStr, 96, 420, 0.68), C.ink)}}>{countNum(f, tBig, 26, b.big, lang)}</div>
          <div style={{maxWidth: 470, background: "#fff", border: `5px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.ink}`, padding: "6px 14px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 26, lineHeight: 1.15, color: C.ink, opacity: p(f, tBig + 10, tBig + 16)}}>{b.big.text}</div>
        </div>
      ) : null}
      {(b.chips ?? []).slice(0, 2).map((c, i) => {
        const at = tC + i * 16;
        if (f < at) return null;
        const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
        return <div key={i} style={{position: "absolute", left: 556, top: 1170 + i * 76, maxWidth: 460, background: i ? acc : C.ink, color: i ? C.ink : "#fff", border: `5px solid ${C.ink}`, boxShadow: `6px 6px 0 ${i ? C.ink : C.red}`, padding: "6px 16px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 28, lineHeight: 1.15, whiteSpace: "nowrap", rotate: `${i ? 1.5 : -1.5}deg`, scale: String(1.5 - 0.5 * s), opacity: Math.min(1, s * 2), transformOrigin: "0 50%"}}>{c}</div>;
      })}
      {b.note ? <Narration x={64} y={b.note.length > 90 ? 1336 : 1352} w={952} at={Math.round(dur * 0.84)} font={FONT.golos} size={b.note.length > 90 ? 28 : 30} bg={acc}>{b.note}</Narration> : null}
      <Flash at={tOpen} dur={5} max={0.4} color={acc} />
      <Flash at={tBig} dur={4} max={0.3} />
    </AbsoluteFill>
  );
};
export const sndWeights = (b: BNWeights, d: number): Snd[] => {
  const {tOpen, nD, fly, gap, tBig, tC} = wTimes(d);
  return [[0, "@whoosh-4", 0.45], [2, "@zvukitop/zt-slap", 0.3], [8, "@zvukitop/zt-paper", 0.25], [tOpen - 2, "@servo-2", 0.35], [tOpen, "@impact-2", 0.45], [tOpen + 1, "@riser-1", 0.3],
    ...Array.from({length: Math.ceil(nD / 4)}).flatMap((_, k) => [[Math.round(tOpen + k * 4 * gap), k % 2 ? "@laser-2" : "@laser-1", 0.2], [Math.round(tOpen + k * 4 * gap + fly), k % 2 ? "@pop-2" : "@pop-1", 0.3]] as Snd[]),
    [Math.round(tOpen + nD * gap + fly), "@success-1", 0.3], [Math.round(tOpen + nD * gap + fly) + 2, "@zvukitop/zt-kids-yay", 0.12],
    [tBig, "@impact-3", 0.5], [tBig + 2, "@zvukitop/zt-boom", 0.3], [tBig + 8, "@coin-1", 0.3], [tBig + 18, "@coin-2", 0.3],
    ...(b.chips ?? []).slice(0, 2).map((_, i) => [tC + i * 16, i ? "@pop-2" : "@pop-1", 0.45] as Snd),
    ...(b.note ? [[Math.round(d * 0.84), "@typewriter-1", 0.35]] as Snd[] : [])];
};
