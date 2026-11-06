// «Робокитай» — серия из статьи (06.11.2026, серии 2–3): та же драматургия v2, но шаги собираются из props по списку `beats`.
// Виды шагов: `scene` (3D-мир из cell3d.tsx + надписи, карточки, «!», лампочка, клиент), `letter` (SOS прошлой серии на телефоне,
// начальник цеха-скептик, письмо Ави), `map` (поезд до края), `guess` (стоп-кадр в ч/б и «Кого бы взяли вы?» A/B),
// `board` (флипчарт: критерии статьи с галочками), `cliff` (SOS следующего края, «Серия N · скоро», печать Aura).
// Серии 4–8 (06.11.2026): `compare` (смена по часам: две полосы, когда «горит» работа), `calc` (расчёт на бумаге: строки, итог,
// вычёркивание строки и новый итог), у угадайки — стили cards (2–3 карточки) / yesno / poll / pins, у сцены — tag (вкладка
// «Попытка 1/3»), clock (часы), meter (шкала), counter (счётчик), stamps (штампы), у крючка — seals (печати пройденных краёв).
// Факты, цифры и цитаты — только из статьи серии; рамка сюжета (дедлайн, начальник цеха) — вымысел без цифр.
import React from "react";
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {AuraMascot} from "../../components/AuraMascot";
import {AuraBadge} from "../../components/AuraBadge";
import {Stage} from "../../components/aura3d/kit";
import {Alert, BRUSH_CJK, CL, EIO, EO, INTER, MONO, MONO_CJK, MarkLine, NamePlate, PANEL, Paper, RK, ScenePanel, Seal, SpecCard, Title, p01, usePop, type CardLine} from "./kit";
import {MapBeat, Sounds, type Snd} from "./beats2d";
import {useT} from "./beats3d";
import {Bulb, DayMark, FlashCard, Huh, Manager, SosPhone, Tint, type Arms, type Hint, type Look, type Mood} from "./drama2d";
import {WORLD_CAM, World, worldState, type WorldId} from "./cell3d";
import type {RobokitaiProps} from "./types";

export type SCard = {at: number; out?: number; term?: string; sub?: string; lines: CardLine[]; note?: string; tone?: "paper" | "alert"};
export type SBeat = {
  id: string;
  kind: "scene" | "letter" | "map" | "guess" | "board" | "cliff" | "compare" | "calc";
  sec: number;
  cut?: boolean;
  music?: boolean; // играет ли музыка (по умолчанию — да, кроме холодного открытия и кризиса)
  world?: WorldId;
  t0?: number; // смещение времени мира
  freeze?: number; // стоп-кадр мира (угадайка)
  tilt?: number; // наклон панели, градусы
  title?: {text: string; mark?: string; at?: number; out?: number; red?: boolean};
  cards?: SCard[];
  alerts?: number[];
  bulb?: number;
  huh?: number;
  tint?: "red" | "night" | "warm" | "dusk";
  flash?: {text: string; at: number};
  manager?: {mood: Mood; arms?: Arms; at?: number};
  plates?: {name: string; role: string; at: number; x: number; y: number; ax?: number; ay?: number}[];
  scout?: {at: number; x: number; z: number; yaw: number};
  chalk?: [number, number]; // прорисовка мела вылета: [от, до] секунд шага
  sounds?: Snd[];
  tag?: {text: string; at?: number; out?: number; icon?: "night" | "morning"};
  clock?: {text: string; at?: number};
  meter?: {label: string; at: number; from: number; to: number; dur?: number; text?: string; text2?: string; bad?: boolean};
  counter?: {label: string; at: number; from: number; to: number; dur: number};
  stamps?: {text: string; at: number; x: number; y: number; rot?: number; color?: string; size?: number}[];
  // letter
  sos?: string;
  city?: string;
  hint?: Hint;
  lines?: CardLine[];
  host?: {name: string; role: string};
  // guess
  q?: string;
  a?: {letter: string; name: string; role: string};
  b?: {letter: string; name: string; role: string};
  style?: "cards" | "yesno" | "poll" | "pins";
  opts?: {letter?: string; name: string; role?: string; x?: number; y?: number}[];
  // compare: полосы смены
  cmpTitle?: {text: string; mark?: string};
  rows?: {label: string; sub?: string; value: string; pct?: string; segs: [number, number][]; color?: string}[];
  hours?: string[];
  // calc: расчёт на бумаге
  calcRows?: {text: string; strike?: string; small?: boolean}[];
  result?: string;
  result2?: string;
  sub2?: string;
  strikeAt?: number;
  note?: string;
  // cliff: печати пройденных краёв
  seals?: string[];
  sealsTitle?: string;
  // board
  boardTitle?: string;
  criteria?: {title: string; text: string}[];
  // cliff
  next?: string;
  url?: string;
};

export type RobokitaiStoryProps = {
  series: {name: string; zh: string; ep: number};
  city: {name: string; zh: string; zhFull?: string; tagline: string};
  title: string;
  article?: string;
  music: {src: string; volume: number; aFrom: number; bFrom?: number; bAt?: string; duck?: string[]; credit?: string};
  countdown: {label: string; done: string; doneAt: [string, number]; keys: [string, number, number][]; blink: string[]; hide: string[]};
  manager: {label: string; moods: [string, number, Mood][]; inset: string[]; look?: Look};
  map: {route: string[]; dots: string[]; kicker: string; k: number; zoom?: number; fromOff?: [number, number]; toOff?: [number, number]; sealOff?: [number, number]};
  beats: SBeat[];
};

export const S_X = 12; // «сдвиг страницы» между шагами без резкой склейки
export const rsScenes = (P: RobokitaiStoryProps) => {
  const out: Record<string, [number, number]> = {};
  let t = 0;
  P.beats.forEach((b, i) => {
    const d = Math.round(b.sec * 30);
    const next = P.beats[i + 1];
    out[b.id] = [t, t + d];
    t += d - (next && !next.cut ? S_X : 0);
  });
  return out;
};
export const rsFrames = (P: RobokitaiStoryProps) => {
  const S = rsScenes(P);
  return Math.max(...Object.values(S).map((x) => x[1]));
};

const CARD_Y = PANEL.y + PANEL.h + 30;
type BP = {P: RobokitaiStoryProps; B: SBeat};

// ===== сцена с 3D-миром =====
export const SceneBeat: React.FC<BP & {forceT?: number; gray?: boolean}> = ({P, B, forceT, gray}) => {
  const {t, fps} = useT();
  const w = B.world ?? "pack";
  const wt = forceT ?? (B.freeze !== undefined ? B.freeze : (B.t0 ?? 0) + t);
  const st = worldState(w, wt);
  const chalk = B.chalk ? p01(t, B.chalk[0], B.chalk[1]) : 0;
  const firstCard = B.cards && B.cards.length ? B.cards[0].at : 999;
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", inset: 0, rotate: `${B.tilt ?? 0}deg`, filter: gray ? "grayscale(1) contrast(0.92)" : undefined}}>
        <ScenePanel>
          <Stage cam={WORLD_CAM[w]} left={0} top={0} width={PANEL.w} height={PANEL.h} dpr={1}>
            <World w={w} t={wt} scout={B.scout} chalk={B.chalk ? chalk : w === "reach" || w === "reachFixed" ? 1 : 0} />
          </Stage>
        </ScenePanel>
      </div>
      {B.tint ? <Tint kind={B.tint} o={B.tint === "red" ? 0.85 : 1} /> : null}
      {(B.alerts ?? []).map((a, i) => (
        <Alert key={i} x={880} y={520} at={Math.round(a * fps)} size={120} />
      ))}
      {st.alarm && !gray && (B.alerts ?? []).length === 0 && t > 0.3 ? <Alert x={880} y={520} at={0} size={96} /> : null}
      {B.bulb !== undefined ? <Bulb x={860} y={560} at={Math.round(B.bulb * fps)} /> : null}
      {B.huh !== undefined ? <Huh x={820} y={560} at={Math.round(B.huh * fps)} /> : null}
      {(B.plates ?? []).map((pl, i) => (
        <NamePlate key={i} x={pl.x} y={pl.y} name={pl.name} role={pl.role} at={Math.round(pl.at * fps)} ax={pl.ax} ay={pl.ay} scale={0.85} />
      ))}
      {B.title ? (
        <Title x={64} y={CARD_Y + 14} w={B.manager ? 600 : 952} text={B.title.text} mark={B.title.mark} at={Math.round((B.title.at ?? 0.4) * fps)} size={56} color={B.title.red ? RK.red : B.tint === "night" ? RK.paper : RK.ink} out={Math.round((B.title.out ?? firstCard) * fps)} />
      ) : null}
      {(B.cards ?? []).map((c, i) => (
        <SpecCard key={i} x={64} y={CARD_Y} w={B.manager ? 600 : 952} at={Math.round(c.at * fps)} out={c.out !== undefined ? Math.round(c.out * fps) : undefined} term={c.term} sub={c.sub} lines={c.lines} note={c.note?.toUpperCase()} tone={c.tone} size={44} />
      ))}
      {B.tag ? (
        B.tag.icon ? (
          <DayMark kind={B.tag.icon} label={B.tag.text} at={Math.round((B.tag.at ?? 0.1) * fps)} out={B.tag.out !== undefined ? Math.round(B.tag.out * fps) : undefined} />
        ) : (
          <TagPill text={B.tag.text} at={Math.round((B.tag.at ?? 0.1) * fps)} />
        )
      ) : null}
      {B.clock ? <Clock text={B.clock.text} at={Math.round((B.clock.at ?? 0.2) * fps)} /> : null}
      {B.meter && !gray ? <Meter {...B.meter} /> : null}
      {B.counter && !gray ? <Counter {...B.counter} /> : null}
      {(B.stamps ?? []).map((st2, i) => (gray ? null : <Stamp key={i} {...st2} />))}
      {B.manager ? <Manager x={660} y={1000} scale={0.86} mood={B.manager.mood} arms={B.manager.arms} at={Math.round((B.manager.at ?? 1.2) * fps)} from="right" look={P.manager.look} /> : null}
      {B.flash && t >= B.flash.at ? (
        <Sequence from={Math.round(B.flash.at * fps)} layout="none">
          <FlashCard text={B.flash.text} />
        </Sequence>
      ) : null}
      {B.sounds ? <Sounds list={B.sounds} /> : null}
    </AbsoluteFill>
  );
};

// ===== письмо: SOS прошлой серии + начальник цеха-скептик =====
export const LetterBeat: React.FC<BP> = ({P, B}) => {
  const {f, fps} = useT();
  const bubble = usePop(Math.round(2.6 * fps), 14);
  const lines = B.lines ?? [];
  const lineAt = lines.map((_, i) => Math.round((2.9 + i * 0.75) * fps));
  return (
    <AbsoluteFill>
      <Paper />
      <Manager x={60} y={470} scale={1.02} mood="skeptic" arms="crossed" at={4} from="left" look={P.manager.look} />
      <NamePlate x={70} y={1010} name={P.manager.label} role="клиент" at={Math.round(0.6 * fps)} scale={0.92} />
      <div style={{position: "absolute", left: 0, top: 0, width: 1080, height: 1920, scale: "0.82", transformOrigin: "1000px 420px"}}>
        <SosPhone x={560} y={440} at={Math.round(0.2 * fps)} title={B.sos ?? "SOS"} city={B.city ?? ""} hint={B.hint} />
      </div>
      {bubble > 0 ? (
        <div style={{position: "absolute", left: 64, top: 1110, width: 700, translate: `0 ${(1 - bubble) * 60}px`, opacity: Math.min(1, bubble * 1.6)}}>
          <svg width={700} height={300} style={{position: "absolute", left: 0, top: 0, overflow: "visible"}}>
            <path d="M640 170 L790 250 L620 220 Z" fill={RK.paper} stroke={RK.ink} strokeWidth={5} strokeLinejoin="round" />
          </svg>
          <div style={{position: "relative", background: RK.paper, border: `5px solid ${RK.ink}`, borderRadius: 30, boxShadow: `8px 8px 0 ${RK.ink}`, padding: "20px 30px 24px"}}>
            {lines.map((l, i) => {
              const k = p01(f, lineAt[i], lineAt[i] + 8, EO);
              return (
                <div key={i} style={{fontFamily: INTER, fontWeight: 800, fontSize: 48, lineHeight: 1.16, letterSpacing: "-0.03em", color: i === lines.length - 1 ? RK.blue : RK.ink, opacity: k, translate: `${(1 - k) * 24}px 0`}}>
                  <MarkLine text={l.text} mark={l.mark} p={p01(f, lineAt[i] + 8, lineAt[i] + 22, EO)} />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <AuraMascot scale={1.15} dpr={1.25} plan={{stays: [{at: 0, x: 905, y: 1515, face: -0.4}], gestures: [{at: 2.5, kind: "wave"}], emotes: [{at: 0.3, kind: "alert", dur: 1.6}, {at: 3.6, kind: "thinking", dur: 2.0}]}} />
      {B.host ? <NamePlate x={640} y={1440} name={B.host.name} role={B.host.role} at={Math.round(2.6 * fps)} scale={0.78} /> : null}
      <Sounds list={[[0.2, "@vibrate-1", 0.5], [0.5, "@ding-2", 0.3], [2.6, "@pop-1", 0.25], [2.9, "@typing-1", 0.18], ...(B.sounds ?? [])]} />
    </AbsoluteFill>
  );
};

export const MapStoryBeat: React.FC<BP> = ({P}) => <MapBeat P={{series: P.series, city: P.city, map: P.map} as unknown as RobokitaiProps} k={P.map.k} />;

// ===== мелкие оверлеи сцены (серии 4–8) =====
// вкладка «ПОПЫТКА 1 / 3» в левом верхнем углу панели
const TagPill: React.FC<{text: string; at: number}> = ({text, at}) => {
  const s = usePop(at, 12);
  if (s <= 0) return null;
  return (
    <div style={{position: "absolute", left: 84, top: 428, display: "flex", alignItems: "center", gap: 12, padding: "8px 22px 8px 14px", borderRadius: 999, background: RK.ink, border: `4px solid ${RK.ink}`, scale: String(0.7 + 0.3 * s), opacity: Math.min(1, s * 2), transformOrigin: "0 50%"}}>
      <span style={{width: 18, height: 18, borderRadius: 99, background: RK.lemon}} />
      <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: "0.14em", color: RK.paper}}>{text.toUpperCase()}</span>
    </div>
  );
};
// большие часы (холодное открытие ночью): чернильная плашка, лимонные цифры, двоеточие мигает
const Clock: React.FC<{text: string; at: number}> = ({text, at}) => {
  const f = useCurrentFrame();
  const s = usePop(at, 12);
  if (s <= 0) return null;
  const [h, m] = text.split(":");
  return (
    <div style={{position: "absolute", left: 84, top: 1062, padding: "10px 30px 14px", borderRadius: 24, background: "#121214", border: `5px solid ${RK.ink}`, boxShadow: `8px 8px 0 ${RK.ink}`, scale: String(0.6 + 0.4 * s), opacity: Math.min(1, s * 2), transformOrigin: "0 100%", fontFamily: MONO, fontWeight: 700, fontSize: 118, lineHeight: 1, color: RK.lemon, letterSpacing: "0.02em"}}>
      {h}
      <span style={{opacity: Math.floor(f / 15) % 2 ? 0.25 : 1}}>:</span>
      {m}
    </div>
  );
};
// шкала внизу панели: подпись, полоса, значение (bad — красная)
const Meter: React.FC<NonNullable<SBeat["meter"]>> = ({label, at, from, to, dur = 1.2, text, text2, bad}) => {
  const {t} = useT();
  if (t < at) return null;
  const k = p01(t, at, at + dur, EO);
  const v = from + (to - from) * k;
  const col = bad ? RK.red : "#1F8A4C";
  const o = p01(t, at, at + 0.25);
  return (
    <div style={{position: "absolute", left: 84, top: 1150, width: 640, padding: "14px 22px 16px", background: RK.paper, border: `5px solid ${RK.ink}`, borderRadius: 22, boxShadow: `6px 6px 0 ${RK.ink}`, opacity: o, boxSizing: "border-box"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: MONO, fontWeight: 700, fontSize: 26, letterSpacing: "0.1em", color: RK.ink}}>
        <span>{label.toUpperCase()}</span>
        <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 44, letterSpacing: "-0.02em", color: col}}>{k >= 1 && text2 ? text2 : text}</span>
      </div>
      <div style={{position: "relative", marginTop: 8, height: 28, borderRadius: 14, border: `4px solid ${RK.ink}`, background: RK.paper2, overflow: "hidden"}}>
        <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: `${(v * 100).toFixed(1)}%`, background: col}} />
      </div>
    </div>
  );
};
// счётчик (шаги, дни): подпись и большое число
const Counter: React.FC<NonNullable<SBeat["counter"]>> = ({label, at, from, to, dur}) => {
  const {t} = useT();
  if (t < at) return null;
  const v = Math.round(from + (to - from) * p01(t, at, at + dur));
  return (
    <div style={{position: "absolute", right: 84, top: 1080, padding: "10px 26px 12px", background: RK.lemon, border: `5px solid ${RK.ink}`, borderRadius: 22, boxShadow: `7px 7px 0 ${RK.ink}`, textAlign: "center", opacity: p01(t, at, at + 0.2)}}>
      <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 26, letterSpacing: "0.14em", color: RK.ink}}>{label.toUpperCase()}</div>
      <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 96, lineHeight: 1, letterSpacing: "-0.04em", color: RK.ink}}>{v}</div>
    </div>
  );
};
// штамп: рамка с текстом, «шлёп» с пружиной
const Stamp: React.FC<NonNullable<SBeat["stamps"]>[number]> = ({text, at, x, y, rot = -8, color = RK.red, size = 44}) => {
  const {f, fps} = useT();
  const a = Math.round(at * fps);
  if (f < a) return null;
  const s = spring({frame: f - a, fps, config: {damping: 13, stiffness: 260, mass: 0.8}});
  return (
    <div style={{position: "absolute", left: x, top: y, rotate: `${rot}deg`, scale: String(2 - s), opacity: Math.min(1, s * 3), padding: "6px 20px 8px", border: `6px solid ${color}`, borderRadius: 12, fontFamily: MONO_CJK, fontWeight: 700, fontSize: size, letterSpacing: "0.08em", color, background: "rgba(248,246,243,0.82)", whiteSpace: "nowrap"}}>
      {text}
    </div>
  );
};

// ===== угадайка =====
// стили: cards — 2–3 карточки A/B/C (по умолчанию); yesno — две большие кнопки «Да» / «Нет»; poll — опрос со строками и пустыми
// полосками «? %»; pins — номера-булавки прямо на стоп-кадре мира (x, y — точка в кадре)
const GUESS_COL = [RK.lemon, "#F26B1D", "#52ABFF"];
export const GuessStoryBeat: React.FC<BP> = ({P, B}) => {
  const {f, fps} = useT();
  const q = usePop(3, 14);
  const style = B.style ?? "cards";
  const opts = B.opts ?? ([B.a, B.b].filter(Boolean) as NonNullable<SBeat["opts"]>);
  const pop = (at: number) => (f < at ? 0 : spring({frame: f - at, fps, config: {damping: 12, stiffness: 190, mass: 0.7}}));
  const card = (c: NonNullable<SBeat["opts"]>[number], i: number, n: number) => {
    const at = 9 + i * 6;
    const s = pop(at);
    const w = n === 3 ? 300 : 420;
    const x = n === 3 ? [56, 390, 724][i] : [80, 580][i];
    const rot = n === 3 ? [-3, 1, 4][i] : [-3, 3][i];
    const col = GUESS_COL[i];
    return (
      <div key={i} style={{position: "absolute", left: x, top: 900, width: w, padding: "26px 24px 30px", boxSizing: "border-box", background: RK.paper, border: `6px solid ${RK.ink}`, borderRadius: 30, boxShadow: `10px 10px 0 ${col}`, rotate: `${rot}deg`, scale: String(0.6 + 0.4 * s), opacity: Math.min(1, s * 2)}}>
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: n === 3 ? 120 : 150, lineHeight: 0.9, color: col, WebkitTextStroke: `5px ${RK.ink}`, paintOrder: "stroke fill"}}>{c.letter}</div>
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: n === 3 ? 50 : 52, letterSpacing: "-0.03em", color: RK.ink, marginTop: 12, whiteSpace: "nowrap"}}>{c.name}</div>
        {c.role ? <div style={{fontFamily: MONO, fontWeight: 700, fontSize: n === 3 ? 28 : 32, color: RK.blue, marginTop: 2}}>{c.role}</div> : null}
      </div>
    );
  };
  const words = (B.q ?? "").split(" ");
  const qTop = style === "pins" ? 300 : 560;
  return (
    <AbsoluteFill>
      <SceneBeat P={P} B={{...B, title: undefined, cards: undefined, alerts: [], tint: undefined, manager: undefined, stamps: undefined, meter: undefined, counter: undefined, tag: undefined, clock: undefined}} gray />
      <AbsoluteFill style={{background: style === "pins" ? "rgba(20,20,22,0.34)" : "rgba(20,20,22,0.62)"}} />
      <div style={{position: "absolute", left: 40, right: 40, top: qTop, textAlign: "center", fontFamily: INTER, fontWeight: 800, fontSize: style === "pins" ? 76 : 88, letterSpacing: "-0.03em", lineHeight: 1.08, color: RK.paper, opacity: Math.min(1, q * 1.5), translate: `0 ${(1 - q) * 40}px`, textShadow: style === "pins" ? `4px 4px 0 ${RK.ink}` : undefined}}>
        {words.slice(0, -1).join(" ")} <span style={{color: RK.ink, background: RK.lemon, padding: "0 14px", borderRadius: 10, textShadow: "none"}}>{words.slice(-1)[0]}</span>
      </div>
      {style === "cards" ? opts.map((c, i) => card(c, i, opts.length)) : null}
      {style === "yesno"
        ? opts.slice(0, 2).map((c, i) => {
            const s = pop(9 + i * 7);
            const col = i === 0 ? "#F26B1D" : "#52ABFF";
            return (
              <div key={i} style={{position: "absolute", left: i === 0 ? 90 : 570, top: 880, width: 420, textAlign: "center", scale: String(0.5 + 0.5 * s), opacity: Math.min(1, s * 2)}}>
                <div style={{width: 360, height: 360, margin: "0 auto", borderRadius: 999, background: col, border: `8px solid ${RK.ink}`, boxShadow: `12px 12px 0 ${RK.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: INTER, fontWeight: 800, fontSize: 120, letterSpacing: "-0.04em", color: RK.ink, rotate: `${i === 0 ? -5 : 5}deg`}}>{c.name}</div>
                {c.role ? <div style={{marginTop: 30, fontFamily: INTER, fontWeight: 800, fontSize: 44, color: RK.paper, letterSpacing: "-0.02em"}}>{c.role}</div> : null}
              </div>
            );
          })
        : null}
      {style === "poll" ? (
        <div style={{position: "absolute", left: 90, top: 840, width: 900, padding: "30px 34px 22px", boxSizing: "border-box", background: RK.paper, border: `6px solid ${RK.ink}`, borderRadius: 34, boxShadow: `12px 12px 0 ${RK.lemon}`, scale: String(0.7 + 0.3 * pop(8)), opacity: Math.min(1, pop(8) * 2)}}>
          {opts.map((c, i) => {
            const k = p01(f, 12 + i * 6, 20 + i * 6, EO);
            return (
              <div key={i} style={{display: "flex", alignItems: "center", gap: 22, marginBottom: 22, opacity: k, translate: `${(1 - k) * 40}px 0`}}>
                <span style={{flexShrink: 0, width: 70, height: 70, borderRadius: 99, background: GUESS_COL[i], border: `5px solid ${RK.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: INTER, fontWeight: 800, fontSize: 40, color: RK.ink}}>{c.letter ?? i + 1}</span>
                <div style={{flex: 1}}>
                  <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 46, letterSpacing: "-0.03em", lineHeight: 1.1, color: RK.ink}}>{c.name}</div>
                  <div style={{marginTop: 8, height: 22, borderRadius: 12, border: `4px solid ${RK.ink}`, background: RK.paper2, position: "relative", overflow: "hidden"}}>
                    <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: `${(8 + 6 * Math.sin(f / 7 + i * 2)).toFixed(1)}%`, background: RK.fog}} />
                  </div>
                </div>
                <span style={{flexShrink: 0, fontFamily: MONO, fontWeight: 700, fontSize: 40, color: RK.muted}}>? %</span>
              </div>
            );
          })}
        </div>
      ) : null}
      {style === "pins"
        ? opts.map((c, i) => {
            const s = pop(8 + i * 6);
            const x = c.x ?? 200 + i * 300;
            const y = c.y ?? 800;
            return (
              <div key={i} style={{position: "absolute", left: x, top: y, translate: "-50% -100%", scale: String(0.4 + 0.6 * s), opacity: Math.min(1, s * 2), transformOrigin: "50% 100%", display: "flex", flexDirection: "column", alignItems: "center"}}>
                <div style={{display: "flex", alignItems: "center", gap: 12, padding: "10px 24px 12px 12px", background: RK.paper, border: `5px solid ${RK.ink}`, borderRadius: 999, boxShadow: `6px 6px 0 ${GUESS_COL[i]}`, whiteSpace: "nowrap"}}>
                  <span style={{width: 62, height: 62, borderRadius: 99, background: GUESS_COL[i], border: `4px solid ${RK.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: INTER, fontWeight: 800, fontSize: 38, color: RK.ink}}>{c.letter ?? i + 1}</span>
                  <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 46, letterSpacing: "-0.03em", color: RK.ink}}>{c.name}</span>
                </div>
                <div style={{width: 6, height: 70, background: RK.ink}} />
                <div style={{width: 26, height: 26, borderRadius: 99, background: GUESS_COL[i], border: `5px solid ${RK.ink}`, marginTop: -6}} />
              </div>
            );
          })
        : null}
      <Sounds list={[[0, "@zvukitop/zt-suspense-1", 0.3], [0.3, "@zvukitop/zt-clock", 0.5], [2.3, "@zvukitop/zt-clock", 0.45], [0.3, "@pop-1", 0.25], [0.5, "@pop-1", 0.25], ...(opts.length > 2 ? ([[0.7, "@pop-1", 0.25]] as Snd[]) : [])]} />
    </AbsoluteFill>
  );
};

// ===== флипчарт: критерии статьи =====
const Check: React.FC<{draw: number}> = ({draw}) => (
  <svg width={66} height={66} viewBox="0 0 58 58" style={{flexShrink: 0, overflow: "visible"}}>
    <rect x={6} y={6} width={46} height={46} rx={7} fill={RK.paper} stroke={RK.ink} strokeWidth={4.5} />
    <path d="M10 34 C 18 30, 24 40, 30 44 C 38 30, 48 16, 60 6" fill="none" stroke={RK.lemon} strokeWidth={15} strokeLinecap="round" strokeDasharray={90} strokeDashoffset={90 * (1 - draw)} />
    <path d="M12 30 L26 44 L56 8" fill="none" stroke={RK.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={66} strokeDashoffset={66 * (1 - draw)} />
  </svg>
);
export const BoardBeat: React.FC<BP> = ({B}) => {
  const {t, f, fps} = useT();
  const crit = B.criteria ?? [];
  const step = Math.min(0.9, (B.sec - 1.6) / Math.max(1, crit.length));
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", left: 64, top: 330, width: 952, height: 1150, background: RK.paper, border: `6px solid ${RK.ink}`, borderRadius: 26, boxShadow: `12px 12px 0 ${RK.ink}`}}>
        <div style={{position: "absolute", left: 300, top: -30, width: 352, height: 44, background: RK.ink, borderRadius: 14}} />
        <div style={{position: "absolute", left: 48, top: 56, right: 48, fontFamily: INTER, fontWeight: 800, fontSize: (B.boardTitle ?? "").length > 20 ? 52 : 66, letterSpacing: "-0.04em", color: RK.ink, opacity: p01(t, 0.1, 0.4)}}>{B.boardTitle}</div>
        {crit.map((c, i) => {
          const at = 0.6 + i * step;
          const k = p01(t, at, at + 0.25, EO);
          return (
            <div key={i} style={{position: "absolute", left: 48, right: 48, top: 200 + i * 220, display: "flex", gap: 26, alignItems: "flex-start", opacity: k, translate: `${(1 - k) * 40}px 0`}}>
              <Check draw={p01(t, at + 0.25, at + 0.6)} />
              <div>
                <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 50, letterSpacing: "-0.03em", lineHeight: 1.1, color: RK.ink}}>{c.title}</div>
                <div style={{fontFamily: INTER, fontWeight: 600, fontSize: 38, lineHeight: 1.2, color: RK.muted, marginTop: 6}}>{c.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <AuraMascot scale={1.0} dpr={1.25} plan={{stays: [{at: 0, x: 930, y: 1500, face: -0.4}], gestures: crit.map((_, i) => ({at: 0.6 + i * step, kind: "tick" as const}))}} />
      <Sounds list={[[0, "@swipe-1", 0.3], ...crit.map((_, i) => [0.85 + i * step, "@click-2", 0.35] as Snd), ...(B.sounds ?? [])]} />
      {f < 0 ? null : null}
    </AbsoluteFill>
  );
};

// ===== крючок: SOS следующего края =====
export const CliffStoryBeat: React.FC<BP> = ({B}) => {
  const {f, t, fps} = useT();
  // финал сезона: сначала печати всех пройденных краёв, потом телефон с SOS
  const seals = B.seals ?? [];
  const sh = seals.length ? 2.9 : 0;
  const blackAt = Math.round((3.5 + sh) * fps);
  const black = p01(f, blackAt, blackAt + 6);
  const up = seals.length ? p01(t, 2.5, 3.1, EIO) : 0;
  return (
    <AbsoluteFill>
      <Paper />
      <Tint kind="warm" o={1} />
      {seals.length ? (
        <>
          <div style={{position: "absolute", left: 0, right: 0, top: 360 - up * 80, textAlign: "center", fontFamily: INTER, fontWeight: 800, fontSize: 74, letterSpacing: "-0.03em", color: RK.ink, opacity: p01(t, 0.1, 0.4) * (1 - up)}}>
            <MarkLine text={B.sealsTitle ?? ""} mark={(B.sealsTitle ?? "").split(" · ").slice(-1)[0]} p={p01(t, 2.0, 2.4, EO)} />
          </div>
          {seals.map((ch, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const x0 = 190 + col * 233;
            const y0 = 640 + row * 250;
            const x1 = 110 + i * 123;
            const y1 = 300;
            const x = x0 + (x1 - x0) * up;
            const y = y0 + (y1 - y0) * up;
            return (
              <div key={i} style={{position: "absolute", left: 0, top: 0, scale: String(1 - up * 0.48), transformOrigin: `${x}px ${y}px`}}>
                <Seal ch={ch} size={190} at={Math.round((0.35 + i * 0.2) * fps)} x={x} y={y} rot={i % 2 ? 6 : -6} id={`season-${i}`} />
              </div>
            );
          })}
        </>
      ) : null}
      <AuraMascot scale={1.55} dpr={1.25} plan={{stays: [{at: 0, x: 300, y: 1500, face: 0.35}], gestures: [{at: 0.1 + sh * 0.6, kind: seals.length ? "jump" : "nod"}], emotes: [{at: 0, kind: "happy", dur: 0.8 + sh}, {at: 0.9 + sh, kind: "alert", dur: 1.6}]}} />
      <div style={{position: "absolute", left: 0, top: 0, width: 1080, height: 1920, scale: "1.14", transformOrigin: "1000px 440px", translate: seals.length ? "0 90px" : undefined}}>
        <SosPhone x={560} y={440} at={Math.round((0.7 + sh) * fps)} title={B.sos ?? "SOS"} city={B.city ?? ""} hint={B.hint} />
      </div>
      {black > 0 ? (
        <AbsoluteFill style={{background: "#121214", opacity: black, alignItems: "center", justifyContent: "center"}}>
          <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 44, letterSpacing: "0.14em", color: RK.lemon, opacity: p01(f, blackAt + 6, blackAt + 16)}}>{(B.next ?? "").toUpperCase()}</div>
          <div style={{position: "absolute", left: 0, right: 0, top: 1240, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: p01(f, blackAt + 14, blackAt + 26)}}>
            <Sequence from={blackAt + 12} layout="none">
              <AuraBadge size={130} />
            </Sequence>
            <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 34, color: RK.paper, letterSpacing: "0.04em"}}>{B.url}</div>
          </div>
        </AbsoluteFill>
      ) : null}
      <Sounds
        list={[
          ...seals.map((_, i) => [0.35 + i * 0.2, "@stamp-1", 0.35] as Snd),
          ...(seals.length ? ([[2.2, "@success-1", 0.3]] as Snd[]) : []),
          [0.7 + sh, "@vibrate-1", 0.5],
          [1.0 + sh, "@ding-2", 0.3],
          [3.5 + sh, "@zvukitop/zt-suspense-1", 0.4],
        ]}
      />
    </AbsoluteFill>
  );
};

// ===== смена по часам: две полосы (сварщик и ячейка), где «горит» работа; значения и карточка-вывод =====
export const CompareBeat: React.FC<BP> = ({B}) => {
  const {t, fps} = useT();
  const rows = B.rows ?? [];
  const sweep = (i: number) => p01(t, 0.7 + i * 1.3, 2.3 + i * 1.3, EIO);
  const X = 64;
  const W = 952;
  return (
    <AbsoluteFill>
      <Paper />
      {B.cmpTitle ? <Title x={64} y={372} w={952} text={B.cmpTitle.text} mark={B.cmpTitle.mark} at={Math.round(0.15 * fps)} size={64} /> : null}
      {rows.map((r, i) => {
        const y = 590 + i * 330;
        const k = sweep(i);
        const col = r.color ?? "#F2A93B";
        const done = k >= 1;
        const pop = p01(t, 2.3 + i * 1.3, 2.6 + i * 1.3, EO);
        return (
          <div key={i} style={{position: "absolute", left: X, top: y, width: W, opacity: p01(t, 0.3 + i * 1.3, 0.6 + i * 1.3)}}>
            <div style={{display: "flex", alignItems: "baseline", justifyContent: "space-between"}}>
              <div style={{display: "flex", alignItems: "baseline", gap: 16}}>
                <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 58, letterSpacing: "-0.03em", color: RK.ink}}>{r.label}</span>
                {r.sub ? <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 28, color: RK.muted}}>{r.sub}</span> : null}
              </div>
              <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 64, letterSpacing: "-0.03em", color: done ? RK.ink : "transparent", scale: String(0.7 + 0.3 * pop), display: "inline-block"}}>
                <MarkLine text={r.value} mark={r.value} p={pop} />
              </span>
            </div>
            <div style={{position: "relative", marginTop: 14, height: 110, border: `6px solid ${RK.ink}`, borderRadius: 20, background: RK.paper2, overflow: "hidden", boxShadow: `8px 8px 0 ${RK.ink}`}}>
              {r.segs.map(([a, b], j) => {
                const e = Math.min(b, k);
                if (e <= a) return null;
                return <div key={j} style={{position: "absolute", top: 0, bottom: 0, left: `${(a * 100).toFixed(2)}%`, width: `${((e - a) * 100).toFixed(2)}%`, background: col, boxShadow: `inset 0 0 0 3px rgba(38,38,38,0.25)`}} />;
              })}
              {/* часы смены */}
              {Array.from({length: 7}, (_, h) => (
                <div key={h} style={{position: "absolute", top: 0, bottom: 0, left: `${(((h + 1) / 8) * 100).toFixed(2)}%`, width: 3, background: "rgba(38,38,38,0.28)"}} />
              ))}
              {/* курсор */}
              {k > 0 && k < 1 ? <div style={{position: "absolute", top: -4, bottom: -4, left: `${(k * 100).toFixed(2)}%`, width: 6, background: RK.red}} /> : null}
            </div>
            {r.pct ? (
              <div style={{marginTop: 18, display: "inline-flex", padding: "6px 18px", borderRadius: 999, background: RK.ink, color: RK.lemon, fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: "0.06em", opacity: pop}}>{r.pct}</div>
            ) : null}
          </div>
        );
      })}
      {B.hours ? (
        <div style={{position: "absolute", left: X, top: 1250, width: W, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontWeight: 700, fontSize: 26, color: RK.muted, opacity: p01(t, 0.6, 0.9)}}>
          {B.hours.map((h, i) => (
            <span key={i}>{h}</span>
          ))}
        </div>
      ) : null}
      {(B.cards ?? []).map((c, i) => (
        <SpecCard key={i} x={64} y={1330} w={760} at={Math.round(c.at * fps)} out={c.out !== undefined ? Math.round(c.out * fps) : undefined} term={c.term} sub={c.sub} lines={c.lines} note={c.note?.toUpperCase()} tone={c.tone} size={44} />
      ))}
      <AuraMascot scale={0.95} dpr={1.25} plan={{stays: [{at: 0, x: 950, y: 1640, face: -0.4}], gestures: [{at: 0.6, kind: "point"}, {at: 3.4, kind: "nod"}], emotes: [{at: 2.4, kind: "surprised", dur: 1.0}, {at: 4.0, kind: "happy", dur: 1.2}]}} />
      <Sounds list={[[0.2, "@swipe-1", 0.3], [0.7, "@sweep-1", 0.15], [2.0, "@sweep-1", 0.15], [2.35, "@pop-1", 0.3], [3.65, "@ding-1", 0.35], ...(B.sounds ?? [])]} />
    </AbsoluteFill>
  );
};

// ===== расчёт на бумаге: строки формулы, итог; вычёркивание строки → новый итог (красный) =====
const Struck: React.FC<{text: string; part?: string; k: number}> = ({text, part, k}) => {
  if (!part || !text.includes(part)) return <>{text}</>;
  const i = text.indexOf(part);
  return (
    <>
      {text.slice(0, i)}
      <span style={{position: "relative", color: k > 0 ? RK.muted : undefined}}>
        {part}
        <span style={{position: "absolute", left: -6, top: "52%", height: 9, width: `calc(${(k * 100).toFixed(1)}% + 12px)`, background: RK.red, borderRadius: 5, rotate: "-3deg"}} />
      </span>
      {text.slice(i + part.length)}
    </>
  );
};
export const CalcBeat: React.FC<BP> = ({B}) => {
  const {t, f, fps} = useT();
  const rows = B.calcRows ?? [];
  const rowAt = (i: number) => 0.5 + i * 0.75;
  const resAt = rowAt(rows.length) + 0.1;
  const sAt = B.strikeAt;
  const sk = sAt !== undefined ? p01(t, sAt, sAt + 0.35, EO) : 0;
  const r2 = sAt !== undefined ? usePopT(f, Math.round((sAt + 0.6) * fps)) : 0;
  const rp = p01(t, resAt, resAt + 0.3, EO);
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", left: 64, top: 560, width: 952, padding: "34px 44px 34px", boxSizing: "border-box", background: RK.paper, border: `6px solid ${RK.ink}`, borderRadius: 30, boxShadow: `12px 12px 0 ${RK.ink}`}}>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: "0.12em", color: RK.red, opacity: p01(t, 0.1, 0.4)}}>{(B.boardTitle ?? "").toUpperCase()}</div>
        {rows.map((r, i) => {
          const k = p01(t, rowAt(i), rowAt(i) + 0.3, EO);
          return (
            <div key={i} style={{marginTop: r.small ? 10 : 18, fontFamily: r.small ? MONO : INTER, fontWeight: r.small ? 700 : 800, fontSize: r.small ? 28 : 56, lineHeight: 1.15, letterSpacing: r.small ? "0.02em" : "-0.03em", color: r.small ? RK.muted : RK.ink, opacity: k, translate: `${(1 - k) * 30}px 0`, whiteSpace: r.small ? "normal" : "nowrap"}}>
              <Struck text={r.text} part={r.strike} k={r.strike ? sk : 0} />
            </div>
          );
        })}
        <div style={{marginTop: 26, borderTop: `5px solid ${RK.ink}`, paddingTop: 18, display: "flex", alignItems: "baseline", gap: 26, flexWrap: "wrap"}}>
          <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 92, letterSpacing: "-0.04em", lineHeight: 1.05, color: sk > 0 ? RK.muted : RK.ink, opacity: rp, scale: String(0.7 + 0.3 * rp), transformOrigin: "0 50%", display: "inline-block"}}>
            <Struck text={B.result ?? ""} part={sk > 0 ? B.result : undefined} k={sk} />
          </span>
          {B.result2 && r2 > 0 ? (
            <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 104, letterSpacing: "-0.04em", lineHeight: 1.05, color: RK.red, scale: String(0.5 + 0.5 * r2), display: "inline-block", transformOrigin: "0 50%"}}>{B.result2}</span>
          ) : null}
        </div>
        {B.sub2 && r2 > 0 ? <div style={{marginTop: 8, fontFamily: INTER, fontWeight: 700, fontSize: 44, color: RK.red, opacity: Math.min(1, r2)}}>{B.sub2}</div> : null}
        {B.note ? <div style={{marginTop: 22, fontFamily: MONO, fontWeight: 700, fontSize: 26, letterSpacing: "0.08em", color: RK.red, opacity: rp}}>{B.note.toUpperCase()}</div> : null}
      </div>
      {(B.cards ?? []).map((c, i) => (
        <SpecCard key={i} x={64} y={1330} w={720} at={Math.round(c.at * fps)} out={c.out !== undefined ? Math.round(c.out * fps) : undefined} term={c.term} sub={c.sub} lines={c.lines} note={c.note?.toUpperCase()} tone={c.tone} size={42} />
      ))}
      <AuraMascot
        scale={1.0}
        dpr={1.25}
        plan={{
          stays: [{at: 0, x: 930, y: 1560, face: -0.4}],
          gestures: [{at: 0.4, kind: "point"}, ...(sAt !== undefined ? [{at: sAt + 0.2, kind: "shrug" as const}] : [{at: resAt + 0.2, kind: "nod" as const}])],
          emotes: [{at: 0.4, kind: "thinking", dur: 1.6}, ...(sAt !== undefined ? [{at: sAt + 0.1, kind: "surprised" as const, dur: 1.6}] : [{at: resAt + 0.2, kind: "happy" as const, dur: 1.2}])],
        }}
      />
      <Sounds
        list={[
          [0.2, "@swipe-1", 0.3],
          ...rows.map((_, i) => [rowAt(i), "@typing-1", 0.16] as Snd),
          [resAt, "@pop-1", 0.35],
          ...(sAt !== undefined ? ([[sAt, "@error-1", 0.4], [sAt + 0.6, "@impact-2", 0.35]] as Snd[]) : ([[resAt + 0.1, "@ding-1", 0.3]] as Snd[])),
          ...(B.sounds ?? []),
        ]}
      />
    </AbsoluteFill>
  );
};
const usePopT = (f: number, at: number) => (f < at ? 0 : Math.min(1.08, spring({frame: f - at, fps: 30, config: {damping: 11, stiffness: 200, mass: 0.7}})));

export const fadeVol = (x: number, a: number, b: number, vol: number, d = 12) => interpolate(x, [a, a + d, b - d, b], [0, vol, vol, 0], CL);
