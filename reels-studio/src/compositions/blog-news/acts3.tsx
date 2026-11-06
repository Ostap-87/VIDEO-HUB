// Сцены третьего сезона «多 NEWS» — «Напитки Азии 饮品» (06.11.2026: «сделай ролики под другие новости для моего сайта… штук 5…
// главное внимательно изучи те ролики, которые уже сняли, чтобы не повторяться»; ещё 04.11.2026: «чтобы они чуть отличались по
// визуалу, наполнению и динамике, но сохраняли стиль манхуа»). Рубрику держат заставка 多 NEWS, бегущая строка, панчлайн и финал,
// а внутри сезона — «напиточные» сцены:
//   HookCup     — хук «стакан»: обложка статьи сверху, огромный стакан бабл-ти наливается слоями (кофе → чай с молоком → пена цвета
//                 сезона), жемчужины тапиоки прыгают на дне, три слова хука — наклейками-поясами на стакане, брызги на каждом ударе;
//   race        — «гонка сетей»: дорожки со стаканчиками-бегунами, полосы растут до финишной клетки, числа набегают, у лидера — «№1»;
//                 `twist` — второй раунд другой меркой (например, выручка с точки), полосы перестраиваются, «№1» переезжает;
//   cupmeter    — «стакан-шкала»: стакан с делениями наливается до `pct` (или сливается через соломинку из `from` в `pct` — «утекает»),
//                 стрелка с подписью на уровне, справа — цифра на плашке цвета сезона, картинка и плашки;
//   menu        — «меню кофейни»: карточка меню качается на гвоздике, позиции дописываются по очереди с точками до цены, последняя —
//                 маркером и обведена красным, сверху шлёпается штамп;
//   PourReveal  — переход «налили»: новая сцена поднимается снизу волной кофе с пеной цвета сезона.
// Тексты и цифры — только из статьи; мат — знаками.
import React from "react";
import {AbsoluteFill, Img, random, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {BRUSH} from "../../components/MontazhFx";
import {FONT} from "../site-manhua/fonts";
import {ActionLines, Bubble, C, EIO, EO, Flash, Halftone, Narration, Panel, Sfx, SpeedLines, p, sumShake} from "../site-manhua/fx";
import {BrandPlate, ChapterHead, TX, countNum, dela, numStyle, useAcc, useLang, useLook, type BNBrand, type BNFact} from "./kit";

type Head = {zh: string; kicker: string; title: string; sec: number};
type Snd = [number, string, number];
export type BNLiquid = "coffee" | "milktea" | "matcha" | "thai" | "teh";
export type BNLane = {name: string; logo?: string; icon?: number; num?: number; dec?: number; pre?: string; suf?: string; big?: string; note?: string; text?: string};
export type BNRace = Head & {kind: "race"; img?: string; imgPos?: string; unit?: string; lanes: BNLane[]; twist?: {label: string; lanes: BNLane[]}; note?: string};
export type BNCup = Head & {kind: "cupmeter"; img?: string; imgPos?: string; pct: number; from?: number; pctLabel?: string; big: BNFact; marks?: number[]; markLabel?: string; out?: string; chips?: string[]; note?: string; liquid?: BNLiquid; pearls?: boolean};
export type BNMenu = Head & {kind: "menu"; img?: string; imgPos?: string; board?: string; boardZh?: string; items: {name: string; sub?: string; price?: string}[]; stamp?: {text: string; sub?: string; zh?: string}; note?: string};
export type BNAct3 = BNRace | BNCup | BNMenu;

const fitW = (t: string, max: number, w: number, em: number) => Math.min(max, Math.floor(w / (Math.max(1, t.length) * em)));
const factStr = (x: Omit<BNFact, "text">) => x.big ?? `${x.pre ?? ""}${x.num ?? ""}${x.suf ?? ""}`;
// слои напитка снизу вверх
const LIQ: Record<BNLiquid, [string, string, string]> = {
  coffee: ["#2E1B0F", "#5E3A20", "#B98454"],
  milktea: ["#6E4424", "#C08A55", "#EFD8B0"],
  matcha: ["#2F5A1F", "#62A03C", "#CDEBA8"],
  thai: ["#B33A0A", "#F2731B", "#FFC58A"],
  teh: ["#6A3210", "#C26B2A", "#F6D9A8"], // тэ тарик — «вытянутый» чай с пенкой
};

// ── стакан бабл-ти (общий для хука и шкалы): стекло, слои напитка с волной, пузырьки, жемчужины, деления, крышка-купол, соломинка ──
type CupG = {cx: number; top: number; bottom: number; wTop: number; wBot: number; strawH: number};
const edge = (g: CupG, y: number, side: -1 | 1) => g.cx + side * (g.wBot / 2 + ((g.wTop - g.wBot) / 2) * ((g.bottom - y) / (g.bottom - g.top)));
const CupSvg: React.FC<{g: CupG; level: number; liq: [string, string, string]; id: string; acc: string; pearls?: boolean; flow?: boolean; marks?: {y: number; label: string; hot?: boolean}[]}> = ({g, level, liq, id, acc, pearls, flow, marks = []}) => {
  const f = useCurrentFrame();
  const lt = edge(g, g.top, -1), rt = edge(g, g.top, 1), lb = edge(g, g.bottom, -1), rb = edge(g, g.bottom, 1);
  const glass = `${lt},${g.top} ${rt},${g.top} ${rb},${g.bottom} ${lb},${g.bottom}`;
  const has = level < g.bottom - 4;
  const amp = has ? 9 : 0;
  let wave = "";
  for (let x = lt - 30; x <= rt + 30; x += 18) wave += `${wave ? "L" : "M"}${x.toFixed(0)},${(level + amp * Math.sin(x / 62 + f * 0.32)).toFixed(1)}`;
  const liquidPath = `${wave} L${rt + 30},${g.bottom + 20} L${lt - 30},${g.bottom + 20} Z`;
  const sx0 = g.cx + g.wBot * 0.16, sy0 = g.bottom - 70, sx1 = g.cx + g.wTop * 0.32, sy1 = g.top - g.strawH;
  return (
    <svg width={1080} height={1920} style={{position: "absolute", left: 0, top: 0, overflow: "visible"}}>
      <defs>
        <clipPath id={`${id}c`}><polygon points={glass} /></clipPath>
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1={0} y1={g.bottom} x2={0} y2={g.top}>
          <stop offset="0" stopColor={liq[0]} />
          <stop offset="0.42" stopColor={liq[1]} />
          <stop offset="0.8" stopColor={liq[2]} />
          <stop offset="1" stopColor={liq[2]} />
        </linearGradient>
      </defs>
      <polygon points={glass} fill="rgba(255,255,255,.72)" />
      <g clipPath={`url(#${id}c)`}>
        {has ? <path d={liquidPath} fill={`url(#${id}g)`} /> : null}
        {has ? <path d={wave} fill="none" stroke={acc} strokeWidth={12} opacity={0.95} /> : null}
        {has ? <path d={wave} fill="none" stroke="#fff" strokeWidth={4} opacity={0.7} transform="translate(0,6)" /> : null}
        {has ? Array.from({length: 12}).map((_, i) => {
          const span = Math.max(1, g.bottom - level - 20);
          const y = g.bottom - 20 - ((f * (2.2 + random(`${id}v${i}`) * 2) + random(`${id}y${i}`) * span) % span);
          const x = g.cx + (random(`${id}x${i}`) - 0.5) * g.wBot * 0.86 + 6 * Math.sin(f / 9 + i);
          return <circle key={i} cx={x} cy={y} r={4 + random(`${id}r${i}`) * 7} fill="rgba(255,255,255,.4)" />;
        }) : null}
        {pearls ? Array.from({length: 18}).map((_, i) => {
          const row = Math.floor(i / 6), col = i % 6;
          const w = edge(g, g.bottom - 30, 1) - edge(g, g.bottom - 30, -1);
          const x = edge(g, g.bottom - 30, -1) + 34 + (col + (row % 2) * 0.5) * ((w - 68) / 6) + (random(`${id}px${i}`) - 0.5) * 14;
          const y = g.bottom - 30 - row * 40 + 5 * Math.sin(f * 0.28 + i * 1.7) * (has ? 1 : 0.2);
          return (
            <g key={`p${i}`}>
              <circle cx={x} cy={y} r={21} fill="#1B120C" stroke={C.ink} strokeWidth={3} />
              <circle cx={x - 7} cy={y - 7} r={6} fill="rgba(255,255,255,.55)" />
            </g>
          );
        }) : null}
      </g>
      {/* блик на стекле */}
      <polygon points={`${lt + 34},${g.top + 30} ${lt + 64},${g.top + 30} ${lb + 50},${g.bottom - 40} ${lb + 28},${g.bottom - 40}`} fill="#fff" opacity={0.55} />
      <polygon points={glass} fill="none" stroke={C.ink} strokeWidth={12} strokeLinejoin="round" />
      {/* соломинка: поверх стекла, с полосками; при «утекает» по ней бежит напиток */}
      <line x1={sx0} y1={sy0} x2={sx1} y2={sy1} stroke={C.ink} strokeWidth={50} strokeLinecap="round" />
      <line x1={sx0} y1={sy0} x2={sx1} y2={sy1} stroke={acc} strokeWidth={36} strokeLinecap="round" />
      <line x1={sx0} y1={sy0} x2={sx1} y2={sy1} stroke="#fff" strokeWidth={36} strokeDasharray="16 30" opacity={0.45} />
      {flow ? <line x1={sx0} y1={sy0} x2={sx1} y2={sy1} stroke={liq[1]} strokeWidth={20} strokeDasharray="34 22" strokeDashoffset={f * 14} strokeLinecap="round" /> : null}
      {/* деления на стекле, как шкала сладости на стакане */}
      {marks.map((m, i) => {
        const xl = edge(g, m.y, -1);
        return (
          <g key={`m${i}`}>
            <line x1={xl + 6} y1={m.y} x2={xl + (m.hot ? 90 : 56)} y2={m.y} stroke={m.hot ? C.red : C.ink} strokeWidth={m.hot ? 9 : 6} strokeLinecap="round" />
            <text x={xl + (m.hot ? 102 : 68)} y={m.y + 12} fontFamily={FONT.dela} fontSize={m.hot ? 40 : 32} fill={m.hot ? C.red : C.ink} stroke="#fff" strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">{m.label}</text>
          </g>
        );
      })}
      {/* крышка-купол */}
      <path d={`M${lt - 8},${g.top - 12} Q${g.cx},${g.top - g.wTop * 0.4} ${rt + 8},${g.top - 12} Z`} fill="rgba(255,255,255,.5)" stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
      <rect x={lt - 20} y={g.top - 18} width={rt - lt + 40} height={26} rx={10} fill="#fff" stroke={C.ink} strokeWidth={8} />
    </svg>
  );
};

// брызги из стакана на ударе
const Splash: React.FC<{x: number; y: number; at: number; seed: string; colors: string[]}> = ({x, y, at, seed, colors}) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0 || t > 22) return null;
  return (
    <svg width={1080} height={1920} style={{position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none"}}>
      {Array.from({length: 12}).map((_, i) => {
        const a = -Math.PI / 2 + (random(`${seed}a${i}`) - 0.5) * 2.4;
        const v = 16 + random(`${seed}v${i}`) * 18;
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t + 1.3 * t * t;
        return <circle key={i} cx={px} cy={py} r={(7 + random(`${seed}r${i}`) * 12) * (1 - t / 26)} fill={colors[i % colors.length]} stroke={C.ink} strokeWidth={3} />;
      })}
    </svg>
  );
};

// ── хук «стакан» ─────────────────────────────────────────────────────────────────────────────────────────────────────
export const HookCup: React.FC<{h: {lines: string[]; shout: string[]; sfx?: string; liquid?: BNLiquid}; cover: string; coverPos?: string; brand?: BNBrand}> = ({h, cover, coverPos, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const light = useLook() === "light";
  const g: CupG = {cx: 540, top: 770, bottom: 1420, wTop: 700, wBot: 520, strawH: 330};
  const liq = LIQ[h.liquid ?? "milktea"];
  const cs = spring({frame: f, fps, config: {damping: 12, stiffness: 160, mass: 0.8}});
  const level = g.bottom - (g.bottom - g.top - 60) * p(f, 4, 56, EO);
  const ats = [6, 16, 26];
  const ys = [880, 1060, 1240];
  const bub = spring({frame: f - 56, fps, config: {damping: 10, stiffness: 220, mass: 0.6}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[0, 8, 14], [ats[0] + 6, 9, 16], [ats[1] + 6, 9, 16], [ats[2] + 6, 12, 22], [40, 12, 24]], "hc")}}>
      {light ? <Halftone bg={C.paper} dot="rgba(25,25,34,.13)" /> : <AbsoluteFill style={{background: C.ink}} />}
      <SpeedLines color={acc} opacity={0.5} cx={540} cy={1080} inner={470} seed="hc" />
      <Panel x={40} y={262} w={1000} h={360} at={-8} from="top" poly={[[0, 0], [1, 0], [1, 0.86], [0, 1]]} bg="#000">
        <Img src={staticFile(cover)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: coverPos ?? "50% 55%", scale: String(1.14 - 0.1 * p(f, 0, 100))}} />
      </Panel>
      <div style={{position: "absolute", inset: 0, translate: `0 ${(1 - cs) * 620}px`, transformOrigin: "540px 1420px", scale: String(0.7 + 0.3 * cs)}}>
        <CupSvg g={g} level={level} liq={liq} id="hk" acc={acc} pearls />
      </div>
      {ats.map((a, i) => <Splash key={i} x={540} y={g.top + 20} at={a + 6} seed={`hs${i}`} colors={[liq[1], acc, "#fff"]} />)}
      {h.lines.slice(0, 3).map((t, i) => {
        const at = ats[i];
        if (f < at) return null;
        const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 300, mass: 0.6}});
        const size = fitW(t, 112, 860, 0.86);
        const fromL = i % 2 === 0;
        return (
          <div key={i} style={{position: "absolute", left: 540, top: ys[i], translate: `calc(-50% + ${(1 - s) * (fromL ? -900 : 900)}px) -50%`, rotate: `${fromL ? -3 : 3}deg`, background: i === 1 ? acc : "#fff", border: `8px solid ${C.ink}`, boxShadow: `12px 12px 0 ${i === 2 ? C.red : C.ink}`, padding: "8px 30px 12px", whiteSpace: "nowrap", ...dela(size, i === 2 ? C.red : C.ink)}}>{t}</div>
        );
      })}
      {h.sfx ? <Sfx text={h.sfx} x={880} y={1330} size={150} color={C.red} stroke="#fff" rot={14} at={40} font={BRUSH} /> : null}
      {f >= 56 ? (
        <Bubble x={430} y={280} w={620} h={290} shout tail={[120, 470]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
          {h.shout.map((t, i) => <div key={i} style={dela(Math.min(i ? 54 : 44, Math.floor(470 / (Math.max(1, t.length) * 0.6))), i ? C.red : C.ink, {whiteSpace: "nowrap"})}>{t}</div>)}
        </Bubble>
      ) : null}
      {brand ? <BrandPlate b={brand} at={44} x={64} y={1446} scale={0.74} rot={-3} /> : null}
      <Flash at={40} dur={4} max={0.45} />
    </AbsoluteFill>
  );
};
export const SND_HOOK_CUP: Snd[] = [[-6, "@whoosh-3", 0.45], [0, "@impact-3", 0.45], [0, "@zvukitop/zt-slap", 0.3], [2, "@zvukitop/zt-glass", 0.35], [4, "@sweep-1", 0.3],
  [6, "@whoosh-2", 0.4], [12, "@impact-3", 0.5], [12, "@stamp-1", 0.4], [13, "@boing-1", 0.25], [16, "@whoosh-3", 0.4], [22, "@impact-3", 0.5], [22, "@stamp-1", 0.4],
  [26, "@whoosh-2", 0.4], [32, "@impact-1", 0.55], [32, "@stamp-1", 0.45], [34, "@pop-1", 0.35], [40, "@boom-1", 0.5], [40, "@zvukitop/zt-cinema-hit", 0.3],
  [56, "@pop-2", 0.45], [58, "@impact-2", 0.4], [80, "@riser-2", 0.3]];

// ── переход «налили» ─────────────────────────────────────────────────────────────────────────────────────────────────
export const PourReveal: React.FC<{children: React.ReactNode; dur: number; acc: string; color?: string}> = ({children, dur, acc, color = "#5E3A20"}) => {
  const f = useCurrentFrame();
  const k = p(f, 0, dur, EIO);
  if (k >= 1) return <>{children}</>;
  const L = 2010 - k * 2160;
  const pts = (off: number) => {
    const a: [number, number][] = [];
    for (let x = -40; x <= 1120; x += 40) a.push([x, L + off + 26 * Math.sin(x / 105 + f * 0.7)]);
    return a;
  };
  const w0 = pts(0), w1 = pts(-90);
  const line = (a: [number, number][]) => a.map(([x, y], i) => `${i ? "L" : "M"}${x},${y.toFixed(1)}`).join(" ");
  const band = `${line(w1)} ${[...w0].reverse().map(([x, y]) => `L${x},${y.toFixed(1)}`).join(" ")} Z`;
  return (
    <>
      <AbsoluteFill style={{clipPath: `path('${line(w0)} L1120,2000 L-40,2000 Z')`}}>{children}</AbsoluteFill>
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0, overflow: "visible"}}>
        <path d={band} fill={color} stroke={C.ink} strokeWidth={8} />
        <path d={line(w1)} fill="none" stroke={acc} strokeWidth={16} />
        {Array.from({length: 9}).map((_, i) => <circle key={i} cx={60 + i * 120 + 30 * Math.sin(i * 2.1)} cy={L - 45 + 18 * Math.sin(f * 0.5 + i)} r={10 + (i % 3) * 5} fill="#fff" opacity={0.45} />)}
      </svg>
    </>
  );
};

// ── «гонка сетей» ────────────────────────────────────────────────────────────────────────────────────────────────────
const Runner: React.FC<{x: number; y: number; acc: string; bob: number; s?: number}> = ({x, y, acc, bob, s = 0.7}) => (
  <svg width={70} height={92} viewBox="0 0 70 92" style={{position: "absolute", left: x, top: y, width: 70 * s, height: 92 * s, overflow: "visible", rotate: `${bob * 9}deg`, transformOrigin: "50% 100%"}}>
    <line x1={44} y1={30} x2={56} y2={-4} stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
    <line x1={44} y1={30} x2={56} y2={-4} stroke={acc} strokeWidth={8} strokeLinecap="round" />
    <path d="M8,22 Q35,0 62,22 Z" fill="#fff" stroke={C.ink} strokeWidth={5} />
    <polygon points="6,24 64,24 56,90 14,90" fill="#C08A55" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
    <rect x={4} y={18} width={62} height={10} rx={4} fill="#fff" stroke={C.ink} strokeWidth={4} />
    {[0, 1, 2, 3].map((i) => <circle key={i} cx={22 + (i % 2) * 22 + (i > 1 ? 4 : 0)} cy={i > 1 ? 66 : 78} r={7} fill="#1B120C" />)}
  </svg>
);
const LaneLabel: React.FC<{l: BNLane; x: number; y: number; at: number}> = ({l, x, y, at}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 12, stiffness: 260, mass: 0.6}});
  return (
    <div style={{position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 14, translate: `${(1 - s) * -500}px 0`, opacity: Math.min(1, s * 2)}}>
      <div style={{display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `4px solid ${C.ink}`, borderRadius: 10, padding: "4px 14px", boxShadow: `5px 5px 0 ${C.ink}`, rotate: "-1deg"}}>
        {l.logo ? (
          <div style={{height: 40, overflow: "hidden", width: l.icon ? 40 * l.icon * 3.64 : "auto", flexShrink: 0}}>
            <Img src={staticFile(l.logo)} style={{height: 40, width: "auto", display: "block"}} />
          </div>
        ) : null}
        <span style={{fontFamily: FONT.dela, fontSize: 30, color: C.ink, whiteSpace: "nowrap", lineHeight: 1.1}}>{l.name}</span>
      </div>
      {l.note ? <span style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 24, color: C.ink, opacity: 0.75, whiteSpace: "nowrap"}}>{l.note}</span> : null}
    </div>
  );
};
export const RaceAct: React.FC<{b: BNRace; dur: number; brand?: BNBrand}> = ({b, dur, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const lang = useLang();
  const n = b.lanes.length;
  const top = b.img ? 706 : 446;
  const bottom = b.note ? 1330 : 1452;
  const y0 = top + 70;
  const laneH = Math.min(200, Math.floor((bottom - y0) / n));
  const barH = Math.max(46, Math.min(76, laneH - 74));
  const G = Math.round(dur * (b.twist ? 0.24 : 0.34));
  const tTw = b.twist ? Math.round(dur * 0.52) : 1e9;
  const BARW = 690, X0 = 64, FIN = X0 + BARW + 18;
  const v = (l?: BNLane) => (l && l.num !== undefined ? l.num : 0);
  const max1 = Math.max(1e-6, ...b.lanes.map(v));
  const max2 = b.twist ? Math.max(1e-6, ...b.twist.lanes.map(v)) : 1;
  const arg = (a: BNLane[]) => a.reduce((m, l, i) => (v(l) > v(a[m]) ? i : m), 0);
  const lead1 = arg(b.lanes), lead2 = b.twist ? arg(b.twist.lanes) : lead1;
  const tLead1 = 14 + G + (n - 1) * 6 + 2, tLead2 = tTw + 34;
  const tw = f >= tTw;
  const us = spring({frame: f - (tw ? tTw : 4), fps, config: {damping: 10, stiffness: 280, mass: 0.6}});
  const lead = tw ? lead2 : lead1;
  const ls = spring({frame: f - (tw ? tLead2 : tLead1), fps, config: {damping: 8, stiffness: 300, mass: 0.6}});
  const widthOf = (i: number) => {
    const at = 14 + i * 6;
    const w1 = (BARW * v(b.lanes[i])) / max1;
    if (!tw || !b.twist) return w1 * p(f, at, at + G, EO);
    const k2 = p(f, tTw + 6 + i * 4, tTw + 28 + i * 4, EIO);
    return w1 + ((BARW * v(b.twist.lanes[i])) / max2 - w1) * k2;
  };
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tLead1, 12, 22], ...(b.twist ? [[tTw, 14, 24], [tLead2, 12, 22]] as [number, number, number][] : [])], b.title)}}>
      <Halftone bg={C.paper} dot="rgba(25,25,34,.12)" />
      <ActionLines color={C.ink} opacity={0.07} angle={0} seed={`${b.title}r`} />
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} />
      {b.img ? (
        <Panel x={64} y={438} w={952} h={244} at={4} from="top" poly={[[0, 0], [1, 0], [1, 0.88], [0, 1]]} bg="#000">
          <Img src={staticFile(b.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 40%", scale: String(1.05 + 0.06 * p(f, 0, dur))}} />
        </Panel>
      ) : null}
      {brand ? <BrandPlate b={brand} at={10} x={650} y={b.img ? 596 : 404} scale={0.56} rot={3} /> : null}
      {/* мерка гонки; во втором раунде — новая мерка красной плашкой */}
      {(b.unit || b.twist) && f >= 4 ? (
        <div style={{position: "absolute", left: X0, top: top, maxWidth: 952, background: tw ? C.red : C.ink, color: tw ? "#fff" : acc, border: `4px solid ${C.ink}`, padding: "6px 18px", fontFamily: FONT.oswald, fontSize: tw ? 30 : 28, letterSpacing: "0.08em", boxShadow: `6px 6px 0 ${tw ? C.ink : acc}`, rotate: tw ? "-1.5deg" : "-1deg", scale: String(1.5 - 0.5 * us), transformOrigin: "0 50%", opacity: Math.min(1, us * 2)}}>
          {tw && b.twist ? b.twist.label : b.unit}
        </div>
      ) : null}
      {/* финишная клетка */}
      <div style={{position: "absolute", left: FIN, top: y0 + 40, width: 26, height: n * laneH - 30, background: `repeating-conic-gradient(${C.ink} 0 25%, #fff 0 50%) 0 0 / 26px 26px`, border: `4px solid ${C.ink}`, opacity: p(f, 6, 12)}} />
      {b.lanes.map((l, i) => {
        const y = y0 + i * laneH;
        const at = 14 + i * 6;
        const w = widthOf(i);
        const t = tw && b.twist ? b.twist.lanes[i] : l;
        const isLead = i === lead && f >= (tw ? tLead2 : tLead1);
        const shown = tw && b.twist ? countNum(f, tTw + 6 + i * 4, 22, {text: "", ...t}, lang) : countNum(f, at, G, {text: "", ...l}, lang);
        const str = factStr(t);
        const running = tw ? f < tTw + 30 + i * 4 : f < at + G;
        return (
          <React.Fragment key={i}>
            <LaneLabel l={l} x={X0} y={y} at={at - 8} />
            <div style={{position: "absolute", left: X0, top: y + 58, width: BARW + 10, height: barH, background: "#fff", border: `5px solid ${C.ink}`, boxShadow: `6px 6px 0 rgba(25,25,34,.25)`, overflow: "hidden"}}>
              <div style={{position: "absolute", left: 0, right: 0, top: barH / 2 - 6, height: 4, background: `repeating-linear-gradient(90deg, rgba(25,25,34,.25) 0 26px, transparent 26px 48px)`}} />
              <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: Math.max(0, w), background: isLead ? acc : "#C08A55", borderRight: w > 2 ? `5px solid ${C.ink}` : undefined}}>
                <div style={{position: "absolute", inset: 0, background: "repeating-linear-gradient(-45deg, rgba(255,255,255,.22) 0 12px, transparent 12px 26px)", backgroundPosition: `${-f * 4}px 0`}} />
              </div>
            </div>
            {f >= at ? <Runner x={X0 + Math.max(0, w) - 24} y={y + 58 + barH + 4 - 92 * ((barH - 4) / 92)} s={(barH - 4) / 92} acc={acc} bob={running ? Math.sin(f * 0.9 + i) : 0} /> : null}
            {f >= at ? (
              <div style={{position: "absolute", left: FIN + 40, top: y + 50, width: 1016 - FIN - 40, height: barH + 18, display: "flex", alignItems: "center", justifyContent: "center", background: isLead ? acc : "#fff", border: `5px solid ${C.ink}`, boxShadow: `6px 6px 0 ${isLead ? C.red : C.ink}`, ...numStyle(fitW(str, 46, 190, 0.66), t.big && !t.num ? C.red : C.ink)}}>{shown}</div>
            ) : null}
            {l.text && !tw ? <div style={{position: "absolute", left: X0 + 14, top: y + 58 + barH + 8, fontFamily: FONT.golos, fontWeight: 700, fontSize: 22, color: C.ink, opacity: p(f, at + G, at + G + 6)}}>{l.text}</div> : null}
          </React.Fragment>
        );
      })}
      {/* «№1» у лидера */}
      {f >= tLead1 ? (
        <div style={{position: "absolute", left: X0 + widthOf(lead) - 70, top: y0 + lead * laneH + 30, width: 96, height: 96, borderRadius: "50%", background: C.red, border: `6px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", rotate: "-12deg", scale: String(0.3 + 0.7 * ls), ...dela(TX[lang].no.length > 1 ? 30 : 34, "#fff")}}>{`${TX[lang].no}1`}</div>
      ) : null}
      {b.note ? <Narration x={64} y={1352} w={952} at={Math.round(dur * 0.84)} font={FONT.golos} size={30} bg={acc}>{b.note}</Narration> : null}
      <Flash at={tLead1} dur={4} max={0.35} />
      {b.twist ? <Flash at={tTw} dur={5} max={0.5} /> : null}
    </AbsoluteFill>
  );
};
export const sndRace = (b: BNRace, d: number): Snd[] => {
  const n = b.lanes.length;
  const G = Math.round(d * (b.twist ? 0.24 : 0.34));
  const tLead1 = 14 + G + (n - 1) * 6 + 2;
  const tTw = Math.round(d * 0.52);
  return [[0, "@flip-1", 0.5], [0, "@zvukitop/zt-paper", 0.25], [4, "@beep-1", 0.4], [8, "@beep-1", 0.4], [12, "@beep-1", 0.5], [14, "@zvukitop/zt-horn", 0.25],
    ...b.lanes.flatMap((_, i) => [[14 + i * 6, i % 2 ? "@whoosh-3" : "@whoosh-2", 0.35], [14 + i * 6 + Math.round(G * 0.6), i % 2 ? "@coin-2" : "@coin-1", 0.3]] as Snd[]),
    [tLead1, "@stamp-1", 0.55], [tLead1, "@impact-3", 0.45], [tLead1 + 4, "@success-1", 0.3], [tLead1 + 6, "@cheer-1", 0.18],
    ...(b.twist ? [[tTw, "@glitch-2", 0.4], [tTw, "@riser-1", 0.3], [tTw + 6, "@impact-3", 0.45], [tTw + 10, "@zvukitop/zt-cash", 0.3], [tTw + 34, "@stamp-1", 0.55], [tTw + 34, "@zvukitop/zt-boom", 0.3], [tTw + 38, "@applause-1", 0.2]] as Snd[] : []),
    ...(b.note ? [[Math.round(d * 0.84), "@typewriter-1", 0.35]] as Snd[] : [])];
};

// ── «стакан-шкала» ───────────────────────────────────────────────────────────────────────────────────────────────────
export const CupMeterAct: React.FC<{b: BNCup; dur: number; brand?: BNBrand}> = ({b, dur, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const lang = useLang();
  const g: CupG = {cx: 300, top: 640, bottom: b.note ? 1300 : 1420, wTop: 430, wBot: 320, strawH: 170};
  const from = b.from ?? 0;
  const drain = from > b.pct;
  const tF0 = 12, tF1 = 12 + Math.round(dur * 0.36);
  const lv = (x: number) => g.bottom - (g.bottom - (g.top + 34)) * (x / 100);
  const cur = from + (b.pct - from) * p(f, tF0, tF1, EIO);
  // деления; уровень pct — красным после налива (подпись pctLabel, например «70–80%»)
  const marks = [...(b.marks ?? [50, 100]).filter((m) => m !== b.pct).map((m) => ({y: lv(m), label: `${m}%`, hot: false})),
    ...(f >= tF1 ? [{y: lv(b.pct), label: b.pctLabel ?? `${b.pct}%`, hot: true}] : [])];
  const hs = spring({frame: f - tF1, fps, config: {damping: 9, stiffness: 280, mass: 0.6}});
  const bs = spring({frame: f - tF0, fps, config: {damping: 10, stiffness: 220, mass: 0.7}});
  const cs = spring({frame: f, fps, config: {damping: 12, stiffness: 170, mass: 0.8}});
  const tC = tF1 + 16;
  const colY = b.img ? 880 : 470;
  const flowing = drain && f >= tF0 && f < tF1 + 4;
  const sx1 = g.cx + g.wTop * 0.32, sy1 = g.top - g.strawH;
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tF1, 12, 22], [tF0, 6, 10]], b.title)}}>
      <Halftone bg={C.paper} dot="rgba(25,25,34,.12)" />
      <SpeedLines color={acc} opacity={0.4} cx={g.cx} cy={(g.top + g.bottom) / 2} inner={330} seed={`${b.title}c`} />
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} />
      {b.img ? (
        <Panel x={580} y={440} w={436} h={410} at={4} from="right" poly={[[0.04, 0], [1, 0], [1, 1], [0, 0.94]]} bg="#000">
          <Img src={staticFile(b.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 40%", scale: String(1.05 + 0.08 * p(f, 0, dur))}} />
        </Panel>
      ) : null}
      {brand && !b.img ? <BrandPlate b={brand} at={10} x={600} y={404} scale={0.56} rot={3} /> : null}
      <div style={{position: "absolute", inset: 0, translate: `0 ${(1 - cs) * 700}px`}}>
        <CupSvg g={g} level={lv(cur)} liq={LIQ[b.liquid ?? "milktea"]} id={`cm${b.title.length}`} acc={acc} pearls={b.pearls} flow={flowing} marks={marks} />
      </div>
      {/* «утекает» через соломинку: монеты летят прочь, подпись куда */}
      {drain && f >= tF0 && f < tF1 + 20 ? Array.from({length: 7}).map((_, i) => {
        const t = ((f - tF0) * 1.4 + i * 9) % 60;
        const k = t / 60;
        return <div key={i} style={{position: "absolute", left: sx1 - 20 + k * 480, top: sy1 - 20 - k * 160 + 60 * k * k, width: 40, height: 40, borderRadius: "50%", background: C.y, border: `5px solid ${C.ink}`, opacity: 1 - k * 0.6, rotate: `${f * 12 + i * 40}deg`, ...dela(20, C.ink), display: "flex", alignItems: "center", justifyContent: "center"}}>¤</div>;
      }) : null}
      {drain && b.out && f >= tF0 + 4 ? (
        <div style={{position: "absolute", left: 64, top: 452, background: C.red, color: "#fff", border: `5px solid ${C.ink}`, padding: "6px 18px", fontFamily: FONT.golos, fontWeight: 900, fontSize: 32, boxShadow: `6px 6px 0 ${C.ink}`, rotate: "-3deg", whiteSpace: "nowrap", opacity: p(f, tF0 + 4, tF0 + 10)}}>{b.out}</div>
      ) : null}
      {/* стрелка-уровень и подпись */}
      {f >= tF1 && b.markLabel ? (
        <div style={{position: "absolute", left: edge(g, lv(b.pct) + 60, -1) + 18, top: lv(b.pct) + 18, maxWidth: edge(g, lv(b.pct) + 60, 1) - edge(g, lv(b.pct) + 60, -1) - 36, background: C.red, color: "#fff", border: `5px solid ${C.ink}`, padding: "4px 14px 6px", fontFamily: FONT.golos, fontWeight: 900, fontSize: fitW(b.markLabel, 30, 300, 0.56), lineHeight: 1.1, boxShadow: `5px 5px 0 ${C.ink}`, rotate: "-2deg", scale: String(0.4 + 0.6 * hs), transformOrigin: "0 0", opacity: Math.min(1, hs * 2)}}>{b.markLabel}</div>
      ) : null}
      {/* правая колонка: цифра на плашке цвета сезона, подпись, плашки */}
      <div style={{position: "absolute", left: 580, top: colY, width: 436, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 22}}>
        {f >= tF0 ? <div style={{background: acc, border: `8px solid ${C.ink}`, boxShadow: `12px 12px 0 ${C.ink}`, padding: "4px 24px 10px", rotate: "-3deg", scale: String(0.4 + 0.6 * bs), transformOrigin: "0 50%", ...numStyle(factStr(b.big).length > 5 ? fitW(factStr(b.big), 116, 340, 0.8) : fitW(factStr(b.big), 116, 380, 0.68), C.ink)}}>{countNum(f, tF0, tF1 - tF0, b.big, lang)}</div> : null}
        {f >= tF0 + 14 ? <div style={{background: "#fff", border: `5px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.ink}`, padding: "10px 18px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 32, lineHeight: 1.15, color: C.ink, opacity: p(f, tF0 + 14, tF0 + 22)}}>{b.big.text}</div> : null}
        {(b.chips ?? []).slice(0, 2).map((c, i) => {
          const at = tC + i * 16;
          if (f < at) return null;
          const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
          return <div key={i} style={{background: i ? acc : C.ink, color: i ? C.ink : "#fff", border: `5px solid ${C.ink}`, boxShadow: `6px 6px 0 ${i ? C.ink : C.red}`, padding: "8px 16px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 27, lineHeight: 1.15, rotate: `${i ? 1.5 : -1.5}deg`, scale: String(1.5 - 0.5 * s), opacity: Math.min(1, s * 2), transformOrigin: "0 50%"}}>{c}</div>;
        })}
      </div>
      {b.note ? <Narration x={64} y={1352} w={952} at={Math.round(dur * 0.84)} font={FONT.golos} size={30} bg={acc}>{b.note}</Narration> : null}
      <Flash at={tF1} dur={4} max={0.35} />
    </AbsoluteFill>
  );
};
export const sndCup = (b: BNCup, d: number): Snd[] => {
  const tF0 = 12, tF1 = 12 + Math.round(d * 0.36);
  const drain = (b.from ?? 0) > b.pct;
  return [[0, "@flip-1", 0.5], [0, "@whoosh-4", 0.35], [4, "@zvukitop/zt-glass", 0.3], [tF0, drain ? "@zvukitop/zt-suspense-2" : "@riser-1", 0.3], [tF0, "@sweep-1", 0.3],
    [tF0 + 8, "@pop-1", 0.3], [tF0 + 18, "@pop-2", 0.3], [tF0 + 28, "@pop-1", 0.3], [tF0 + 6, "@coin-1", 0.25], [tF0 + 20, "@coin-2", 0.25],
    ...(drain ? [[tF0 + 4, "@laser-2", 0.2], [tF0 + 14, "@cash-1", 0.3], [tF0 + 30, "@zvukitop/zt-cash", 0.3]] as Snd[] : []),
    [tF1, "@impact-3", 0.5], [tF1, drain ? "@zvukitop/zt-wrong" : "@ding-2", 0.35], [tF1 + 2, "@stamp-1", 0.4],
    ...(b.chips ?? []).slice(0, 2).map((_, i) => [tF1 + 16 + i * 16, i ? "@pop-2" : "@pop-1", 0.45] as Snd),
    ...(b.note ? [[Math.round(d * 0.84), "@typewriter-1", 0.35]] as Snd[] : [])];
};

// ── «меню кофейни» ───────────────────────────────────────────────────────────────────────────────────────────────────
export const MenuAct: React.FC<{b: BNMenu; dur: number; brand?: BNBrand}> = ({b, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const n = b.items.length;
  const top = 446, bottom = b.note ? 1318 : 1440;
  const headH = 104, imgH = b.img ? 236 : 0;
  const rows0 = top + 18 + headH + imgH + 22;
  const rowH = Math.min(170, Math.floor((bottom - 30 - rows0) / n));
  const step = Math.floor((dur * 0.62 - 16) / n);
  const tS = Math.round(dur * 0.74);
  const swing = 5 * Math.exp(-f / 16) * Math.cos(f / 4.2);
  const st = spring({frame: f - tS, fps, config: {damping: 8, stiffness: 320, mass: 0.6}});
  const nameSize = Math.min(40, Math.round(rowH * 0.3));
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tS, 14, 26], ...b.items.map((_, k) => [16 + k * step + 8, 4, 8] as [number, number, number])], b.title)}}>
      <Halftone bg={C.bone} dot="rgba(25,25,34,.12)" />
      <SpeedLines color={acc} opacity={0.3} cx={540} cy={960} inner={560} seed={`${b.title}m`} />
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} />
      {/* карточка меню на гвоздике */}
      <div style={{position: "absolute", left: 64, top, width: 952, height: bottom - top, rotate: `${swing}deg`, transformOrigin: "476px 0px", translate: `0 ${(1 - p(f, 0, 10, EO)) * 900}px`}}>
        <div style={{position: "absolute", inset: 0, background: "#FFFBEF", border: `8px solid ${C.ink}`, boxShadow: `14px 14px 0 ${C.ink}`}} />
        <div style={{position: "absolute", inset: 12, border: `3px solid ${C.ink}`, opacity: 0.5}} />
        <div style={{position: "absolute", left: 18, right: 18, top: 18, height: headH, background: acc, borderBottom: `6px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px"}}>
          <span style={dela(fitW(b.board ?? "MENU", 54, 620, 0.74), C.ink, {whiteSpace: "nowrap", letterSpacing: "0.04em"})}>{b.board ?? "MENU"}</span>
          <span style={{fontFamily: BRUSH, fontSize: 76, color: C.red, lineHeight: 1}}>{b.boardZh ?? "饮品"}</span>
        </div>
        {b.img ? (
          <div style={{position: "absolute", left: 18, right: 18, top: 18 + headH + 6, height: imgH - 6, overflow: "hidden", borderBottom: `6px solid ${C.ink}`}}>
            <Img src={staticFile(b.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 50%", scale: String(1.04 + 0.08 * p(f, 0, dur))}} />
          </div>
        ) : null}
        {/* гвоздик и шнурок */}
        <svg width={300} height={90} style={{position: "absolute", left: 476 - 150, top: -70, overflow: "visible"}}>
          <path d="M20,86 L150,10 L280,86" fill="none" stroke={C.ink} strokeWidth={6} />
          <circle cx={150} cy={10} r={14} fill={C.red} stroke={C.ink} strokeWidth={5} />
        </svg>
        {b.items.map((it, k) => {
          const at = 16 + k * step;
          if (f < at) return null;
          const last = k === n - 1;
          const y = rows0 - top + k * rowH;
          const wipe = p(f, at, at + 10, EO);
          const ps = spring({frame: f - at - 8, fps, config: {damping: 9, stiffness: 300, mass: 0.6}});
          const hl = p(f, at + 2, at + 12, EO);
          const circ = p(f, at + 14, at + 26, EO);
          const price = it.price ?? "";
          const pSize = fitW(price, 54, 290, 0.72);
          return (
            <div key={k} style={{position: "absolute", left: 50, right: 50, top: y, height: rowH - 10, display: "flex", alignItems: "center", gap: 18}}>
              <div style={{position: "relative", flexShrink: 1, minWidth: 0, clipPath: `inset(-20px ${(1 - wipe) * 100}% -20px -20px)`}}>
                <div style={{position: "relative", fontFamily: last ? FONT.dela : FONT.golos, fontWeight: 900, fontSize: last ? nameSize + 2 : nameSize, lineHeight: 1.16, color: last ? C.red : C.ink}}>
                  <span style={last ? {backgroundImage: `linear-gradient(${acc}, ${acc})`, backgroundRepeat: "no-repeat", backgroundSize: `${hl * 100}% 62%`, backgroundPosition: "0 85%", WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone", padding: "0 6px"} : undefined}>{it.name}</span>
                </div>
                {it.sub ? <div style={{position: "relative", fontFamily: FONT.golos, fontWeight: 700, fontSize: Math.round(nameSize * 0.66), lineHeight: 1.15, color: C.ink, opacity: 0.72, marginTop: 4}}>{it.sub}</div> : null}
              </div>
              {price ? <div style={{flex: 1, minWidth: 30, height: 0, borderBottom: `6px dotted ${C.ink}`, opacity: 0.6 * wipe, alignSelf: "center", marginTop: nameSize * 0.4}} /> : null}
              {price ? (
                <div style={{position: "relative", flexShrink: 0, scale: String(0.3 + 0.7 * ps), opacity: Math.min(1, ps * 2), ...numStyle(pSize, last ? C.red : C.ink)}}>
                  {price}
                  {last ? (
                    <svg style={{position: "absolute", left: -36, right: -36, top: -16, bottom: -14, width: "calc(100% + 72px)", height: "calc(100% + 30px)", overflow: "visible", rotate: "-4deg"}}>
                      <ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="none" stroke={C.red} strokeWidth={7} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - circ} />
                    </svg>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {b.stamp && f >= tS ? (
        <div style={{position: "absolute", left: b.img ? 760 : 700, top: b.img ? top + 18 + headH + imgH * 0.55 : bottom - 150, translate: "-50% -50%", rotate: "-11deg", scale: String(2.4 - 1.4 * st), opacity: Math.min(1, st * 2), border: `11px solid ${C.red}`, padding: "8px 30px", background: "rgba(255,255,255,.88)", textAlign: "center", boxShadow: "0 0 0 6px #fff", whiteSpace: "nowrap"}}>
          <div style={dela(fitW(b.stamp.text, 84, 520, 0.76), C.red, {letterSpacing: "0.03em"})}>{b.stamp.text}</div>
          {b.stamp.sub ? <div style={{fontFamily: FONT.mono, fontSize: 26, color: C.red}}>{b.stamp.sub}</div> : null}
          {b.stamp.zh ? <div style={{position: "absolute", right: -64, top: -62, fontFamily: BRUSH, fontSize: 92, color: C.red, rotate: "14deg"}}>{b.stamp.zh}</div> : null}
        </div>
      ) : null}
      {b.note ? <Narration x={64} y={1352} w={952} at={Math.round(dur * 0.86)} font={FONT.golos} size={30} bg={acc}>{b.note}</Narration> : null}
      <Flash at={tS} dur={4} max={0.35} />
    </AbsoluteFill>
  );
};
export const sndMenu = (b: BNMenu, d: number): Snd[] => {
  const n = b.items.length;
  const step = Math.floor((d * 0.62 - 16) / n);
  const tS = Math.round(d * 0.74);
  return [[0, "@whoosh-1", 0.45], [2, "@zvukitop/zt-paper", 0.35], [8, "@click-1", 0.35],
    ...b.items.flatMap((it, k) => {
      const at = 16 + k * step;
      const last = k === n - 1;
      return [[at, "@typing-1", 0.3], [at + 8, last ? "@zvukitop/zt-cash" : it.price ? "@coin-1" : "@pop-1", 0.4], ...(last ? [[at + 14, "@zvukitop/zt-ding", 0.35]] : [])] as Snd[];
    }),
    ...(b.stamp ? [[tS, "@stamp-1", 0.6], [tS, "@impact-4", 0.45], [tS + 2, "@zvukitop/zt-anvil", 0.3]] as Snd[] : []),
    ...(b.note ? [[Math.round(d * 0.86), "@typewriter-1", 0.35]] as Snd[] : [])];
};
