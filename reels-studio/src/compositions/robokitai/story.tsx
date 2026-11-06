// «Робокитай» — серия из статьи (06.11.2026, серии 2–3): та же драматургия v2, но шаги собираются из props по списку `beats`.
// Виды шагов: `scene` (3D-мир из cell3d.tsx + надписи, карточки, «!», лампочка, клиент), `letter` (SOS прошлой серии на телефоне,
// начальник цеха-скептик, письмо Ави), `map` (поезд до края), `guess` (стоп-кадр в ч/б и «Кого бы взяли вы?» A/B),
// `board` (флипчарт: критерии статьи с галочками), `cliff` (SOS следующего края, «Серия N · скоро», печать Aura).
// Факты, цифры и цитаты — только из статьи серии; рамка сюжета (дедлайн, начальник цеха) — вымысел без цифр.
import React from "react";
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {AuraMascot} from "../../components/AuraMascot";
import {AuraBadge} from "../../components/AuraBadge";
import {Stage} from "../../components/aura3d/kit";
import {Alert, CL, EO, INTER, MONO, MarkLine, NamePlate, PANEL, Paper, RK, ScenePanel, SpecCard, Title, p01, usePop, type CardLine} from "./kit";
import {MapBeat, Sounds, type Snd} from "./beats2d";
import {useT} from "./beats3d";
import {Bulb, FlashCard, Huh, Manager, SosPhone, Tint, type Arms, type Mood} from "./drama2d";
import {WORLD_CAM, World, worldState, type WorldId} from "./cell3d";
import type {RobokitaiProps} from "./types";

export type SCard = {at: number; out?: number; term?: string; sub?: string; lines: CardLine[]; note?: string; tone?: "paper" | "alert"};
export type SBeat = {
  id: string;
  kind: "scene" | "letter" | "map" | "guess" | "board" | "cliff";
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
  tint?: "red" | "night" | "warm";
  flash?: {text: string; at: number};
  manager?: {mood: Mood; arms?: Arms; at?: number};
  plates?: {name: string; role: string; at: number; x: number; y: number; ax?: number; ay?: number}[];
  scout?: {at: number; x: number; z: number; yaw: number};
  chalk?: [number, number]; // прорисовка мела вылета: [от, до] секунд шага
  sounds?: Snd[];
  // letter
  sos?: string;
  city?: string;
  hint?: "cobot" | "gripper" | "weld";
  lines?: CardLine[];
  host?: {name: string; role: string};
  // guess
  q?: string;
  a?: {letter: string; name: string; role: string};
  b?: {letter: string; name: string; role: string};
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
  manager: {label: string; moods: [string, number, Mood][]; inset: string[]};
  map: {route: string[]; dots: string[]; kicker: string; k: number};
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
export const SceneBeat: React.FC<BP & {forceT?: number; gray?: boolean}> = ({B, forceT, gray}) => {
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
        <Title x={64} y={CARD_Y + 14} w={B.manager ? 600 : 952} text={B.title.text} mark={B.title.mark} at={Math.round((B.title.at ?? 0.4) * fps)} size={56} color={B.title.red ? RK.red : RK.ink} out={Math.round((B.title.out ?? firstCard) * fps)} />
      ) : null}
      {(B.cards ?? []).map((c, i) => (
        <SpecCard key={i} x={64} y={CARD_Y} w={B.manager ? 600 : 952} at={Math.round(c.at * fps)} out={c.out !== undefined ? Math.round(c.out * fps) : undefined} term={c.term} sub={c.sub} lines={c.lines} note={c.note?.toUpperCase()} tone={c.tone} size={44} />
      ))}
      {B.manager ? <Manager x={660} y={1000} scale={0.86} mood={B.manager.mood} arms={B.manager.arms} at={Math.round((B.manager.at ?? 1.2) * fps)} from="right" /> : null}
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
      <Manager x={60} y={470} scale={1.02} mood="skeptic" arms="crossed" at={4} from="left" />
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

// ===== угадайка =====
export const GuessStoryBeat: React.FC<BP> = ({P, B}) => {
  const {f, fps} = useT();
  const q = usePop(3, 14);
  const card = (c: NonNullable<SBeat["a"]>, at: number, x: number, rot: number, col: string) => {
    const s = f < at ? 0 : spring({frame: f - at, fps, config: {damping: 12, stiffness: 190, mass: 0.7}});
    return (
      <div style={{position: "absolute", left: x, top: 900, width: 420, padding: "26px 28px 30px", background: RK.paper, border: `6px solid ${RK.ink}`, borderRadius: 30, boxShadow: `10px 10px 0 ${col}`, rotate: `${rot}deg`, scale: String(0.6 + 0.4 * s), opacity: Math.min(1, s * 2)}}>
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 150, lineHeight: 0.9, color: col, WebkitTextStroke: `5px ${RK.ink}`, paintOrder: "stroke fill"}}>{c.letter}</div>
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 52, letterSpacing: "-0.03em", color: RK.ink, marginTop: 12}}>{c.name}</div>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 32, color: RK.blue, marginTop: 2}}>{c.role}</div>
      </div>
    );
  };
  const words = (B.q ?? "").split(" ");
  return (
    <AbsoluteFill>
      <SceneBeat P={P} B={{...B, title: undefined, cards: undefined, alerts: [], tint: undefined}} gray />
      <AbsoluteFill style={{background: "rgba(20,20,22,0.62)"}} />
      <div style={{position: "absolute", left: 40, right: 40, top: 560, textAlign: "center", fontFamily: INTER, fontWeight: 800, fontSize: 88, letterSpacing: "-0.03em", lineHeight: 1.08, color: RK.paper, opacity: Math.min(1, q * 1.5), translate: `0 ${(1 - q) * 40}px`}}>
        {words.slice(0, -1).join(" ")} <span style={{color: RK.ink, background: RK.lemon, padding: "0 14px", borderRadius: 10}}>{words.slice(-1)[0]}</span>
      </div>
      {B.a ? card(B.a, 9, 80, -3, RK.lemon) : null}
      {B.b ? card(B.b, 15, 580, 3, "#F26B1D") : null}
      <Sounds list={[[0, "@zvukitop/zt-suspense-1", 0.3], [0.3, "@zvukitop/zt-clock", 0.5], [2.3, "@zvukitop/zt-clock", 0.45], [0.3, "@pop-1", 0.25], [0.5, "@pop-1", 0.25]]} />
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
        <div style={{position: "absolute", left: 48, top: 56, right: 48, fontFamily: INTER, fontWeight: 800, fontSize: 66, letterSpacing: "-0.04em", color: RK.ink, opacity: p01(t, 0.1, 0.4)}}>{B.boardTitle}</div>
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
  const {f, fps} = useT();
  const blackAt = Math.round(3.5 * fps);
  const black = p01(f, blackAt, blackAt + 6);
  return (
    <AbsoluteFill>
      <Paper />
      <Tint kind="warm" o={1} />
      <AuraMascot scale={1.55} dpr={1.25} plan={{stays: [{at: 0, x: 300, y: 1500, face: 0.35}], gestures: [{at: 0.1, kind: "nod"}], emotes: [{at: 0, kind: "happy", dur: 0.8}, {at: 0.9, kind: "alert", dur: 1.6}]}} />
      <div style={{position: "absolute", left: 0, top: 0, width: 1080, height: 1920, scale: "1.14", transformOrigin: "1000px 440px"}}>
        <SosPhone x={560} y={440} at={Math.round(0.7 * fps)} title={B.sos ?? "SOS"} city={B.city ?? ""} hint={B.hint} />
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
      <Sounds list={[[0.7, "@vibrate-1", 0.5], [1.0, "@ding-2", 0.3], [3.5, "@zvukitop/zt-suspense-1", 0.4]]} />
    </AbsoluteFill>
  );
};

export const fadeVol = (x: number, a: number, b: number, vol: number, d = 12) => interpolate(x, [a, a + d, b - d, b], [0, vol, vol, 0], CL);
