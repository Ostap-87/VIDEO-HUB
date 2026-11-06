// Сцены манхуа-объяснялок личного бренда ostapdotcenko (06.11.2026: «по одному ролику для моего личного блога и сайта и объяснить
// в формате манхуа, почему я выбрал именно такой вариант изложения своих проектов… визуально показать преимущества… схематично
// показать в роликах по 30–45 секунд»). Каждая сцена — свой `kind` в props, тексты и картинки — из props; манхуа-набор и шрифты —
// те же, что у промо «Мой сайт» (site-manhua/fx.tsx) и «多 NEWS» (blog-news/kit.tsx).
import React from "react";
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {BRUSH} from "../../components/MontazhFx";
import {FONT} from "../site-manhua/fonts";
import {ActionLines, Bubble, Burst, C, EIO, EO, Flash, HandArrow, Halftone, Letterbox, Narration, Panel, Sfx, SpeedLines, Tape, p, sumShake, typed} from "../site-manhua/fx";
import {ChapterHead, Chip, dela} from "../blog-news/kit";

export type OdxHead = {zh: string; kicker: string; title: string};
export type OdxHook = {kind: "hook"; sec: number; wall: string; img: string; lines: string[]; stamp: {text: string; zh?: string}; shout: string[]; zh?: string};
export type OdxIdent = {kind: "ident"; sec: number; title: string[]; zh: string; tape: string; chip?: string; photo?: string};
export type OdxVersus = OdxHead & {kind: "versus"; sec: number; bad: {img?: string; wall?: string; label: string; stamp: string; sfx?: string}; good: {img: string; imgPos?: string; label: string; stamp: string; sfx?: string}; note: string};
export type OdxPhone = OdxHead & {kind: "phone"; sec: number; feed: string[]; badge: string; badgeSub?: string; chips: string[]; note: string};
export type OdxFormula = OdxHead & {kind: "formula"; sec: number; img: string; a: string; b: string; result: string; bad: string; note: string};
export type OdxStyle = OdxHead & {kind: "style"; sec: number; photo: string; polaroids: {src: string; cap: string}[]; seal: {zh: string; text: string; sub: string}; chips: string[]; note: string};
export type OdxGrid = OdxHead & {kind: "grid"; sec: number; items: {src: string; cap: string; pos?: string}[]; note?: string};
export type OdxFin = {kind: "fin"; sec: number; photo: string; title: string[]; zh?: string; url: string; handle?: string; button: string; done: string; follow: string};
export type OdxScene = OdxHook | OdxIdent | OdxVersus | OdxPhone | OdxFormula | OdxStyle | OdxGrid | OdxFin;

// вырезка с белой обводкой и жёсткой тенью (как фото автора в панчлайне «多 NEWS»)
const CUT = "drop-shadow(7px 0 0 #fff) drop-shadow(-7px 0 0 #fff) drop-shadow(0 7px 0 #fff) drop-shadow(0 -7px 0 #fff) drop-shadow(16px 16px 0 #15151D)";

// штамп: рамка, поворот, «шлёп» с перелётом; ok — жёлтый «✓», иначе красный «✗»
export const Stamp: React.FC<{x: number; y: number; at: number; text: string; ok?: boolean; zh?: string; size?: number; rot?: number}> = ({x, y, at, text, ok, zh, size = 92, rot = -12}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 8, stiffness: 320, mass: 0.6}});
  const col = ok ? C.ink : C.red;
  return (
    <div style={{position: "absolute", left: x, top: y, translate: "-50% -50%", rotate: `${rot}deg`, scale: String(2.4 - 1.4 * s), opacity: Math.min(1, s * 2), border: `12px solid ${col}`, padding: "6px 30px 10px", background: ok ? C.y : "rgba(255,255,255,.9)", boxShadow: `0 0 0 6px #fff, 14px 14px 0 6px ${ok ? C.red : C.ink}`, display: "flex", alignItems: "center", gap: 18, whiteSpace: "nowrap"}}>
      <span style={dela(size * 1.05, col)}>{ok ? "✓" : "✗"}</span>
      <span style={dela(size, col, {letterSpacing: "0.03em"})}>{text}</span>
      {zh ? <span style={{position: "absolute", right: -60, top: -66, fontFamily: BRUSH, fontSize: size, color: C.red, rotate: "14deg", textShadow: "4px 4px 0 #fff"}}>{zh}</span> : null}
    </div>
  );
};

// ── хук: стена настоящего текста из блога, спящий читатель, «СКУЧНО», облачко-крик «как в манхуа!» ──────────────────────
export const HookWall: React.FC<{s: OdxHook; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tStamp = 34, tBub = Math.round(dur * 0.56);
  const bub = spring({frame: f - tBub, fps, config: {damping: 10, stiffness: 220, mass: 0.6}});
  const cols = [C.ink, C.red, C.ink];
  const after = p(f, tBub - 2, tBub + 6);
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[0, 8, 14], [12, 6, 10], [20, 6, 10], [tStamp, 14, 30], [tBub, 12, 24]], "hk")}}>
      <AbsoluteFill style={{background: C.paper}} />
      <div style={{position: "absolute", left: 36, right: 36, top: 40 - f * 1.4, fontFamily: FONT.golos, fontWeight: 600, fontSize: 31, lineHeight: 1.36, color: "#A9A59A", textAlign: "justify", hyphens: "auto"}} lang="ru">
        {s.wall} {s.wall}
      </div>
      <AbsoluteFill style={{opacity: after}}>
        <Halftone bg={C.y} dot="rgba(25,25,34,.16)" />
        <SpeedLines color={C.ink} opacity={0.42} cx={540} cy={560} inner={420} seed="hkw" />
      </AbsoluteFill>
      <Panel x={64} y={300} w={952} h={560} at={-8} rot={-2} bg="#000">
        <Img src={staticFile(s.img)} style={{width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) contrast(1.05)", scale: String(1.1 - 0.08 * p(f, 0, dur))}} />
      </Panel>
      <Stamp x={540} y={600} at={tStamp} text={s.stamp.text} zh={s.stamp.zh} size={96} />
      {s.lines.map((t, i) => {
        const at = i === 0 ? -10 : 4 + 8 * i;
        if (f < at) return null;
        const k = spring({frame: f - at, fps, config: {damping: 9, stiffness: 300, mass: 0.6}});
        return <div key={i} style={{position: "absolute", left: 64, top: 920 + i * 150, ...dela(Math.min(128, Math.floor(950 / (t.length * 0.92))), cols[i % 3]), scale: String(1.7 - 0.7 * k), transformOrigin: "0 50%", textShadow: `8px 8px 0 ${i === 1 ? C.ink : C.y}`, WebkitTextStroke: i === 1 ? undefined : `2px ${C.ink}`}}>{t}</div>;
      })}
      {f >= tBub ? (
        <Bubble x={110} y={250} w={860} h={430} shout tail={[700, 590]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
          {s.shout.map((t, i) => <div key={i} style={dela(i === s.shout.length - 1 ? Math.min(78, Math.floor(640 / (t.length * 0.7))) : 50, i === s.shout.length - 1 ? C.red : C.ink, {whiteSpace: "nowrap"})}>{t}</div>)}
          {s.zh ? <div style={{fontFamily: BRUSH, fontSize: 52, color: C.ink, marginTop: 4}}>{s.zh}</div> : null}
        </Bubble>
      ) : null}
      <Flash at={tBub} dur={6} max={0.6} />
    </AbsoluteFill>
  );
};

// ── заставка: печать 多, вопрос ударами, иероглифы кистью, скотч с именем, вырезка автора ──────────────────────────────────
export const Ident: React.FC<{s: OdxIdent}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seal = spring({frame: f - 2, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  const ph = spring({frame: f - 6, fps, config: {damping: 12, stiffness: 160, mass: 0.8}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[2, 12, 26], [10, 8, 16], [18, 8, 16]], "id")}}>
      <Halftone bg={C.y} dot="rgba(25,25,34,.16)" />
      <SpeedLines color={C.ink} opacity={0.5} cx={300} cy={560} inner={330} seed="idl" />
      {s.photo ? <Img src={staticFile(s.photo)} style={{position: "absolute", right: -120, bottom: -40, height: 1020, filter: CUT, translate: `${(1 - ph) * 600}px 0`}} /> : null}
      <div style={{position: "absolute", left: 64, top: 290, width: 250, height: 250, background: C.seal, borderRadius: 20, boxShadow: `0 0 0 10px #fff, 14px 14px 0 10px ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", rotate: `${-8 + 4 * seal}deg`, scale: String(2.2 - 1.2 * seal)}}>
        <span style={{fontFamily: BRUSH, fontSize: 210, color: "#fff", lineHeight: 1}}>多</span>
      </div>
      {s.title.map((t, i) => {
        const at = 8 + i * 8;
        if (f < at) return null;
        const k = spring({frame: f - at, fps, config: {damping: 9, stiffness: 300, mass: 0.6}});
        return <div key={i} style={{position: "absolute", left: 60, top: 600 + i * 170, ...dela(Math.min(176, Math.floor(980 / (t.length * 0.86))), i ? C.red : C.ink, {whiteSpace: "nowrap", WebkitTextStroke: i ? `4px ${C.ink}` : undefined, paintOrder: "stroke fill", textShadow: `10px 10px 0 #fff`}), scale: String(1.8 - 0.8 * k), transformOrigin: "0 50%"}}>{t.split("多").map((x, j) => (j ? <React.Fragment key={j}><span style={{fontFamily: BRUSH, color: C.seal, WebkitTextStroke: "0px", textShadow: "8px 8px 0 #fff"}}>多</span>{x}</React.Fragment> : x))}</div>;
      })}
      <div style={{position: "absolute", left: 70, top: 600 + s.title.length * 170 + 10, fontFamily: BRUSH, fontSize: 84, color: C.ink, textShadow: "5px 5px 0 #fff", opacity: p(f, 22, 28), translate: `${(1 - p(f, 22, 32, EO)) * -80}px 0`}}>{s.zh}</div>
      <Tape x={70} y={600 + s.title.length * 170 + 130} at={26} font={FONT.unb} size={36} rot={-3}>{s.tape}</Tape>
      {s.chip ? <Chip x={80} y={600 + s.title.length * 170 + 250} at={34} rot={2} bg={C.red} color="#fff" size={32}>{s.chip}</Chip> : null}
    </AbsoluteFill>
  );
};

// ── «было → стало»: стена текста (✗) против панели манхуа (✓) ────────────────────────────────────────────────────────────
export const Versus: React.FC<{s: OdxVersus; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const tB = Math.round(dur * 0.32);
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[30, 12, 24], [tB, 8, 14], [tB + 28, 12, 24]], "vs")}}>
      <Halftone bg={C.paper} dot="rgba(232,52,28,.12)" />
      <ChapterHead zh={s.zh} kicker={s.kicker} title={s.title} />
      <Panel x={64} y={430} w={952} h={420} at={4} from="left" rot={-1} bg="#000">
        {s.bad.img ? <Img src={staticFile(s.bad.img)} style={{width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) brightness(.92)", scale: String(1.04 + 0.06 * p(f, 0, dur))}} /> : (
          <div style={{position: "absolute", inset: 0, background: "#EFEDE6", padding: "84px 40px 0", overflow: "hidden"}}>
            <div lang="ru" style={{fontFamily: FONT.golos, fontWeight: 600, fontSize: 22, lineHeight: 1.32, color: "#8F8B80", textAlign: "justify", hyphens: "auto", translate: `0 ${(-f * 0.9).toFixed(1)}px`}}>{s.bad.wall}</div>
          </div>
        )}
      </Panel>
      <Chip x={92} y={452} at={10} rot={-2} bg="#fff" size={34}>{s.bad.label}</Chip>
      <Stamp x={560} y={680} at={30} text={s.bad.stamp} size={84} />
      {s.bad.sfx ? <Sfx text={s.bad.sfx} x={790} y={470} size={110} color="#fff" rot={10} at={36} font={BRUSH} /> : null}
      <HandArrow x={860} y={820} w={120} h={140} at={tB - 10} dur={10} d="M60,4 C90,40 30,80 64,128 M40,104 L64,132 L88,100" sw={10} />
      <Panel x={64} y={910} w={952} h={460} at={tB} from="right" rot={1} bg={C.y}>
        <Img src={staticFile(s.good.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: s.good.imgPos ?? "50% 30%", scale: String(1.04 + 0.06 * p(f, tB, dur))}} />
      </Panel>
      <Chip x={92} y={932} at={tB + 8} rot={2} bg={C.y} size={34}>{s.good.label}</Chip>
      <Stamp x={600} y={1250} at={tB + 28} text={s.good.stamp} ok size={84} rot={-8} />
      {s.good.sfx ? <Sfx text={s.good.sfx} x={800} y={950} size={130} color={C.y} rot={-10} at={tB + 32} font={BRUSH} /> : null}
      <Narration x={64} y={1392} w={952} at={Math.round(dur * 0.62)} font={FONT.golos} size={33} bg="#fff">{s.note}</Narration>
    </AbsoluteFill>
  );
};

// телефон с лентой роликов 9:16: обложки листаются снизу вверх, как в Reels; таймер внизу экрана
const ReelPhone: React.FC<{feed: string[]; w: number; start: number; every: number; dur: number}> = ({feed, w, start, every, dur}) => {
  const f = useCurrentFrame();
  const SW = w - 30, SH = Math.round((SW * 16) / 9);
  let pos = 0;
  for (let i = 1; i < feed.length; i++) pos += p(f, start + i * every, start + i * every + 10, EIO);
  const sec = Math.min(45, Math.floor(p(f, start, dur - 10) * 45));
  return (
    <div style={{position: "relative", width: w, height: SH + 30, borderRadius: w * 0.12, background: "#0d0d12", padding: 15, boxShadow: `16px 18px 0 ${C.ink}`}}>
      <div style={{position: "relative", width: SW, height: SH, borderRadius: w * 0.09, overflow: "hidden", background: "#000"}}>
        <div style={{position: "absolute", left: 0, top: 0, width: SW, translate: `0 ${(-pos * SH).toFixed(1)}px`}}>
          {feed.map((src) => <Img key={src} src={staticFile(src)} style={{display: "block", width: SW, height: SH, objectFit: "cover"}} />)}
        </div>
        <div style={{position: "absolute", left: 18, right: 18, bottom: 20, display: "flex", alignItems: "center", gap: 12}}>
          <div style={{flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,.35)", overflow: "hidden"}}>
            <div style={{width: `${(sec / 45) * 100}%`, height: "100%", background: C.y}} />
          </div>
          <span style={{fontFamily: FONT.mono, fontSize: 24, color: "#fff", textShadow: "2px 2px 0 #000"}}>{`0:${String(sec).padStart(2, "0")}`}</span>
        </div>
      </div>
      <div style={{position: "absolute", left: "50%", top: 22, width: 96, height: 24, marginLeft: -48, borderRadius: 99, background: "#0d0d12"}} />
    </div>
  );
};

// ── «удобно с телефона»: лента выпусков в телефоне, «≤ 45 с» во взрыве, плашки-причины ───────────────────────────────────
export const PhoneAct: React.FC<{s: OdxPhone; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ph = spring({frame: f - 2, fps, config: {damping: 13, stiffness: 150, mass: 0.9}});
  const bs = spring({frame: f - 14, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[14, 10, 20]], "ph")}}>
      <Halftone bg={C.bone} dot="rgba(232,52,28,.14)" />
      <SpeedLines color={C.ink} opacity={0.16} cx={280} cy={800} inner={420} seed="phs" />
      <ChapterHead zh={s.zh} kicker={s.kicker} title={s.title} />
      <div style={{position: "absolute", left: 64, top: 430, rotate: "-4deg", scale: String(0.7 + 0.3 * ph), translate: `${(1 - ph) * -500}px 0`}}>
        <ReelPhone feed={s.feed} w={420} start={20} every={Math.max(26, Math.floor((dur - 40) / s.feed.length))} dur={dur} />
      </div>
      {f >= 14 ? (
        <>
          <Burst x={790} y={560} r={150} color={C.y} scale={0.3 + 0.7 * bs} rot={f * 0.5} seed="ph45" />
          <div style={{position: "absolute", left: 790, top: 560, translate: "-50% -50%", rotate: "-6deg", scale: String(0.3 + 0.7 * bs), textAlign: "center"}}>
            <div style={{background: "#fff", border: `6px solid ${C.ink}`, boxShadow: `8px 8px 0 ${C.red}`, padding: "2px 16px 6px", ...dela(76, C.ink, {whiteSpace: "nowrap"})}}>{s.badge}</div>
            {s.badgeSub ? <div style={{display: "inline-block", fontFamily: FONT.golos, fontWeight: 800, fontSize: 28, color: "#fff", background: C.ink, padding: "4px 14px", marginTop: 12, whiteSpace: "nowrap"}}>{s.badgeSub}</div> : null}
          </div>
        </>
      ) : null}
      {s.chips.map((t, i) => <Chip key={i} x={540} y={760 + i * 112} at={40 + i * 20} rot={i % 2 ? 1.5 : -1.5} bg={i === s.chips.length - 1 ? C.y : "#fff"} size={33} maxW={490}>{t}</Chip>)}
      <Sfx text="唰!" x={455} y={1180} size={100} color={C.red} stroke="#fff" rot={-12} at={46} font={BRUSH} />
      <Narration x={64} y={1290} w={952} at={Math.round(dur * 0.6)} font={FONT.golos} size={34} bg={C.y}>{s.note}</Narration>
    </AbsoluteFill>
  );
};

// значки для формулы: картинка (рамка с горами и солнцем) и фраза (облачко)
const IconPic: React.FC = () => (
  <svg width={110} height={84} viewBox="0 0 110 84">
    <rect x={4} y={4} width={102} height={76} fill="#fff" stroke={C.ink} strokeWidth={7} />
    <circle cx={80} cy={26} r={10} fill={C.red} />
    <path d="M8,74 L40,34 L60,58 L74,44 L102,74 Z" fill={C.ink} />
  </svg>
);
const IconBubble: React.FC = () => (
  <svg width={110} height={84} viewBox="0 0 110 84">
    <path d="M10,8 H100 V58 H44 L24,78 L28,58 H10 Z" fill="#fff" stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
    <rect x={24} y={24} width={62} height={8} fill={C.ink} />
    <rect x={24} y={40} width={40} height={8} fill={C.red} />
  </svg>
);

// ── «лучше запоминается»: картинка + короткая фраза = запомнилось; абзац = ? (зачёркнуто) ──────────────────────────────
export const FormulaAct: React.FC<{s: OdxFormula; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tR = 84;
  const rs = spring({frame: f - tR, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  const card = (x: number, at: number, icon: React.ReactNode, label: string) => {
    if (f < at) return null;
    const k = spring({frame: f - at, fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
    return (
      <div style={{position: "absolute", left: x, top: 990, width: 290, height: 190, background: "#fff", border: `6px solid ${C.ink}`, boxShadow: `9px 9px 0 ${C.ink}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, scale: String(1.5 - 0.5 * k), opacity: Math.min(1, k * 2), rotate: x < 300 ? "-2deg" : "2deg"}}>
        {icon}
        <div style={{...dela(label.length > 10 ? 28 : 34, C.ink), textAlign: "center", lineHeight: 1.05}}>{label}</div>
      </div>
    );
  };
  const op = (t: string, x: number, at: number) => (f < at ? null : <div style={{position: "absolute", left: x, top: 1040, ...dela(84, C.red, {WebkitTextStroke: `4px ${C.ink}`, paintOrder: "stroke fill"}), scale: String(1.6 - 0.6 * p(f, at, at + 6, EO))}}>{t}</div>);
  const strike = p(f, 140, 152, EO);
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tR, 12, 22]], "fm")}}>
      <Halftone bg={C.paper} dot="rgba(25,25,34,.1)" />
      <ChapterHead zh={s.zh} kicker={s.kicker} title={s.title} />
      <Panel x={64} y={430} w={952} h={500} at={4} from="scale" bg="#fff">
        <Img src={staticFile(s.img)} style={{width: "100%", height: "100%", objectFit: "cover", scale: String(1.02 + 0.08 * p(f, 0, dur))}} />
      </Panel>
      {card(64, 34, <IconPic />, s.a)}
      {op("+", 368, 46)}
      {card(420, 56, <IconBubble />, s.b)}
      {op("=", 726, 70)}
      {f >= tR ? (
        <>
          <Burst x={905} y={1085} r={140} color={C.y} scale={0.3 + 0.7 * rs} rot={f * 0.5} seed="fmr" />
          <div style={{position: "absolute", left: 900, top: 1085, translate: "-50% -50%", rotate: "-6deg", scale: String(0.3 + 0.7 * rs), textAlign: "center"}}>
            <div style={dela(70, C.ink)}>✓</div>
            <div style={{fontFamily: BRUSH, fontSize: 44, color: C.red, whiteSpace: "nowrap", lineHeight: 1.1, background: "#fff", border: `4px solid ${C.ink}`, padding: "0 10px", marginTop: 4}}>{s.result}</div>
          </div>
        </>
      ) : null}
      {f >= 112 ? (
        <div style={{position: "absolute", left: 64, top: 1215, display: "flex", alignItems: "center", gap: 22, opacity: p(f, 112, 118), translate: `${(1 - p(f, 112, 122, EO)) * -200}px 0`}}>
          <div style={{background: "#E4E1D8", border: `5px solid #8E8B83`, padding: "10px 22px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 32, color: "#6E6B63"}}>{s.bad}</div>
          <div style={dela(64, "#8E8B83")}>= ?</div>
          <div style={{position: "absolute", left: -12, right: -12, top: "50%", height: 12, background: C.red, transformOrigin: "0 50%", scale: `${strike} 1`, rotate: "-2deg"}} />
        </div>
      ) : null}
      <Narration x={64} y={1320} w={952} at={Math.round(dur * 0.64)} font={FONT.golos} size={33} bg="#fff">{s.note}</Narration>
    </AbsoluteFill>
  );
};

// ── «мой стиль»: вырезка автора, полароиды из его профиля, печать 多 = «много», цифры с сайта ─────────────────────────────
export const StyleAct: React.FC<{s: OdxStyle; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ph = spring({frame: f - 4, fps, config: {damping: 12, stiffness: 170, mass: 0.8}});
  const seal = spring({frame: f - 66, fps, config: {damping: 9, stiffness: 260, mass: 0.6}});
  const pos = [[40, 452, -8], [262, 432, 5], [120, 700, 7]];
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[66, 12, 24]], "st")}}>
      <Halftone bg={C.red} dot="rgba(25,25,34,.2)" />
      <ActionLines color="#fff" opacity={0.14} angle={-18} seed="sty" />
      <ChapterHead zh={s.zh} kicker={s.kicker} title={s.title} dark />
      {s.polaroids.map((x, i) => {
        const at = 14 + i * 12;
        if (f < at) return null;
        const k = spring({frame: f - at, fps, config: {damping: 11, stiffness: 220, mass: 0.6}});
        const [px, py, r] = pos[i % 3];
        return (
          <div key={i} style={{position: "absolute", left: px, top: py, width: 252, background: "#fff", padding: "12px 12px 48px", boxShadow: `10px 10px 0 ${C.ink}`, rotate: `${r}deg`, scale: String(1.5 - 0.5 * k), opacity: Math.min(1, k * 2)}}>
            <Img src={staticFile(x.src)} style={{width: "100%", height: 190, objectFit: "cover", display: "block"}} />
            <div style={{position: "absolute", left: 16, bottom: 6, fontFamily: FONT.hand, fontSize: 34, color: C.ink}}>{x.cap}</div>
          </div>
        );
      })}
      <Img src={staticFile(s.photo)} style={{position: "absolute", right: -70, top: 430, height: 1060, filter: CUT, translate: `${(1 - ph) * 700}px 0`}} />
      {f >= 66 ? (
        <div style={{position: "absolute", left: 64, top: 980, display: "flex", alignItems: "center", gap: 22}}>
          <div style={{width: 170, height: 170, background: C.seal, borderRadius: 14, boxShadow: `0 0 0 8px #fff, 12px 12px 0 8px ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", rotate: `${-10 + 6 * seal}deg`, scale: String(2 - seal)}}>
            <span style={{fontFamily: BRUSH, fontSize: 140, color: "#fff", lineHeight: 1}}>{s.seal.zh}</span>
          </div>
          <div style={{opacity: p(f, 72, 78), translate: `${(1 - p(f, 72, 82, EO)) * -60}px 0`}}>
            <div style={dela(50, C.y, {whiteSpace: "nowrap", WebkitTextStroke: `3px ${C.ink}`, paintOrder: "stroke fill", textShadow: `5px 5px 0 ${C.ink}`})}>{s.seal.text}</div>
            <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 30, color: "#fff", textShadow: `3px 3px 0 ${C.ink}`}}>{s.seal.sub}</div>
          </div>
        </div>
      ) : null}
      <div style={{position: "absolute", left: 64, top: 1196, display: "flex", gap: 14}}>
        {s.chips.map((t, i) => {
          const at = 92 + i * 10;
          if (f < at) return null;
          const k = spring({frame: f - at, fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
          return <div key={i} style={{background: i === 0 ? C.y : "#fff", border: `5px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.ink}`, padding: "8px 16px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 30, color: C.ink, whiteSpace: "nowrap", rotate: `${i % 2 ? 2 : -2}deg`, scale: String(1.6 - 0.6 * k)}}>{t}</div>;
        })}
      </div>
      <Narration x={64} y={1330} w={952} at={Math.round(dur * 0.62)} font={FONT.golos} size={34} bg={C.y} sh={C.ink}>{s.note}</Narration>
    </AbsoluteFill>
  );
};

// ── «уже в манхуа»: страница из четырёх панелей — кадры готовых роликов проектов ─────────────────────────────────────────
export const GridAct: React.FC<{s: OdxGrid; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const W = 462, H = 470, X = [64, 554], Y = [440, 950];
  return (
    <AbsoluteFill style={{translate: sumShake(f, s.items.map((_, i) => [6 + i * 12, 8, 14] as [number, number, number]), "gr")}}>
      <Halftone bg={C.y} dot="rgba(25,25,34,.16)" />
      <SpeedLines color={C.ink} opacity={0.3} cx={540} cy={940} inner={520} seed="grs" />
      <ChapterHead zh={s.zh} kicker={s.kicker} title={s.title} />
      {s.items.map((it, i) => (
        <React.Fragment key={i}>
          <Panel x={X[i % 2]} y={Y[Math.floor(i / 2)]} w={W} h={H} at={6 + i * 12} from={i % 2 ? "right" : "left"} rot={i % 2 ? 1.5 : -1.5} bg="#000">
            <Img src={staticFile(it.src)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: it.pos ?? "50% 30%", scale: String(1.04 + 0.06 * p(f, 0, dur))}} />
          </Panel>
          <Tape x={X[i % 2] + 10} y={Y[Math.floor(i / 2)] + H - 70} at={12 + i * 12} font={FONT.unb} size={28} rot={i % 2 ? 3 : -3} bg={i === 3 ? C.red : C.ink} color={i === 3 ? "#fff" : C.y}>{it.cap}</Tape>
        </React.Fragment>
      ))}
      <Sfx text="啪!" x={430} y={850} size={120} color={C.red} stroke="#fff" rot={-10} at={44} font={BRUSH} />
      {s.note ? <Narration x={64} y={1440} w={952} at={Math.round(dur * 0.55)} font={FONT.golos} size={30} bg="#fff">{s.note}</Narration> : null}
    </AbsoluteFill>
  );
};

// ── финал: вырезка автора, адрес печатается, кнопка «Подписаться» нажимается, 未完待续 ──────────────────────────────────
export const FinAct: React.FC<{s: OdxFin; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ph = spring({frame: f - 2, fps, config: {damping: 13, stiffness: 150, mass: 0.9}});
  const url = typed(f, 22, s.url, 2);
  const tPress = Math.round(dur * 0.52);
  const press = p(f, tPress - 4, tPress) - p(f, tPress, tPress + 6);
  const done = f >= tPress + 2;
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tPress, 8, 14]], "fin")}}>
      <Halftone bg={C.bone} dot="rgba(25,25,34,.12)" />
      <SpeedLines color={C.ink} opacity={0.12} cx={820} cy={900} inner={480} seed="fns" />
      <Img src={staticFile(s.photo)} style={{position: "absolute", right: -110, bottom: 0, height: 900, filter: CUT, translate: `${(1 - ph) * 600}px 0`}} />
      {s.title.map((t, i) => (
        <div key={i} style={{position: "absolute", left: 64, top: 296 + i * 96, opacity: p(f, 4 + i * 6, 10 + i * 6), translate: `${(1 - p(f, 4 + i * 6, 16 + i * 6, EO)) * -120}px 0`}}>
          <span style={{...dela(Math.min(80, Math.floor(900 / (t.length * 0.74))), C.ink, {whiteSpace: "nowrap"}), background: i === s.title.length - 1 ? C.y : undefined, padding: i === s.title.length - 1 ? "0 12px" : undefined}}>{t}</span>
        </div>
      ))}
      {s.zh ? <div style={{position: "absolute", left: 70, top: 296 + s.title.length * 96 + 6, fontFamily: BRUSH, fontSize: 60, color: C.red, opacity: p(f, 16, 22)}}>{s.zh}</div> : null}
      {f >= 22 ? (
        <div style={{position: "absolute", left: 64, top: 600, rotate: "-2deg", background: C.ink, padding: "14px 22px", boxShadow: `10px 10px 0 ${C.red}`}}>
          <span style={{fontFamily: FONT.unb, fontSize: 40, color: C.y}}>{url}</span>
          <span style={{fontFamily: FONT.unb, fontSize: 40, color: C.y, opacity: Math.floor(f / 8) % 2 ? 1 : 0}}>▌</span>
        </div>
      ) : null}
      {s.handle ? <Chip x={64} y={720} at={34} rot={2} size={30}>{s.handle}</Chip> : null}
      {f >= 40 ? (
        <div style={{position: "absolute", left: 64, top: 860, scale: String((1 - 0.12 * press) * (1.4 - 0.4 * p(f, 40, 50, EO))), opacity: p(f, 40, 46), background: done ? C.y : C.red, border: `6px solid ${C.ink}`, boxShadow: `${10 - 8 * press}px ${10 - 8 * press}px 0 ${C.ink}`, padding: "18px 36px", ...dela(48, done ? C.ink : "#fff", {whiteSpace: "nowrap"})}}>
          {done ? s.done : s.button}
        </div>
      ) : null}
      {f >= tPress - 8 && f < tPress + 14 ? (
        <div style={{position: "absolute", left: 300, top: 900, width: 90, height: 90, borderRadius: "50%", border: `7px solid ${C.ink}`, background: "rgba(255,217,46,.45)", opacity: 1 - p(f, tPress + 2, tPress + 14), scale: String(0.6 + 0.8 * p(f, tPress - 8, tPress + 14))}} />
      ) : null}
      {done ? <Sfx text="好!" x={470} y={800} size={100} color={C.red} stroke="#fff" rot={12} at={tPress + 2} font={BRUSH} /> : null}
      {f >= tPress + 16 ? (
        <>
          <div style={{position: "absolute", left: 60, top: 1010, fontFamily: FONT.zcool, fontSize: 104, color: C.ink, textShadow: "8px 8px 0 #fff", scale: String(1.5 - 0.5 * spring({frame: f - tPress - 16, fps, config: {damping: 10, stiffness: 260}})), transformOrigin: "0 50%"}}>未完待续…</div>
          <div style={{position: "absolute", left: 66, top: 1136, fontFamily: FONT.hand, fontSize: 44, color: C.red, opacity: p(f, tPress + 26, tPress + 34)}}>{s.follow}</div>
        </>
      ) : null}
      <Letterbox h={130 * p(f, dur - 22, dur, EIO)} />
    </AbsoluteFill>
  );
};
