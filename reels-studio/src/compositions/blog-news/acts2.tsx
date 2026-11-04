// Сцены второго сезона «多 NEWS» (04.11.2026: «давай делай следующие ролики, но я бы их чуть изменил — чтобы они чуть отличались
// по визуалу, наполнению и динамике, но сохраняли стиль манхуа»). Рубрика узнаётся по заставке 多 NEWS, бегущей строке,
// панчлайну и финалу, а внутри выпуска — новые виды сцен:
//   HookSplit — хук «полосами»: обложка статьи режется на три косые полосы, они влетают с разных сторон, на каждой слово-удар;
//   stat      — одна цифра на весь кадр: картинка во весь экран, счётчик во взрыве, «= сравнение» плашкой, факты сбоку;
//   dialog    — сценка из статьи: реплики облачками по очереди, у каждой — голова персонажа (чернильный силуэт), он «говорит»;
//   list      — «вставной номер»: номера-печати и полоски текста влетают по очереди, последний пункт — красный, с ударом;
//   page      — разворот манги: 2–3 панели с подписями рассказчика, камера едет от панели к панели и в конце отъезжает на всю
//               страницу, где шлёпается главная цифра.
// Тексты и цифры — только из статьи; мат — знаками.
import React from "react";
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {BRUSH} from "../../components/MontazhFx";
import {FONT} from "../site-manhua/fonts";
import {ActionLines, Bubble, Burst, C, EIO, EO, Flash, Halftone, Narration, Panel, Sfx, SpeedLines, p, sumShake} from "../site-manhua/fx";
import {Skeptic, type Emo} from "../site-manhua/skeptic";
import {BrandPlate, ChapterHead, Chip, countNum, dela, useAcc, type BNBrand, type BNFact} from "./kit";

type Head = {zh: string; kicker: string; title: string; sec: number};
export type BNStat = Head & {kind: "stat"; img: string; imgPos?: string; big: BNFact; equal?: string; chips?: string[]; note?: string};
export type BNWho = {name: string; emo?: Emo; fill?: string; glasses?: boolean; phone?: boolean; tie?: boolean};
export type BNDialog = Head & {kind: "dialog"; img?: string; imgPos?: string; a: BNWho; b: BNWho; lines: {who: "a" | "b"; text: string}[]; note?: string};
export type BNList = Head & {kind: "list"; img?: string; imgPos?: string; items: string[]; mark?: string; note?: string};
export type BNPage = Head & {kind: "page"; panels: {img: string; imgPos?: string; zoom?: number; cap: string; sfx?: string}[]; big?: BNFact; note?: string};
export type BNAct2 = BNStat | BNDialog | BNList | BNPage;
type Snd = [number, string, number];

const fitW = (t: string, max: number, w: number, em: number) => Math.min(max, Math.floor(w / (Math.max(1, t.length) * em)));
const factStr = (x: BNFact) => x.big ?? `${x.pre ?? ""}${x.num ?? ""}${x.suf ?? ""}`;

// ── хук «полосами» ──────────────────────────────────────────────────────────────────────────────────────────────────
const BANDS = [
  {y: 262, h: 330, from: "left" as const, pos: "50% 18%", poly: [[0, 0.1], [1, 0], [1, 0.88], [0, 1]] as [number, number][]},
  {y: 592, h: 330, from: "right" as const, pos: "50% 50%", poly: [[0, 0], [1, 0.12], [1, 1], [0, 0.9]] as [number, number][]},
  {y: 922, h: 330, from: "left" as const, pos: "50% 84%", poly: [[0, 0.08], [1, 0], [1, 0.9], [0, 1]] as [number, number][]},
];
export const HookSplit: React.FC<{h: {lines: string[]; shout: string[]; sfx?: string}; cover: string; brand?: BNBrand}> = ({h, cover, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const bub = spring({frame: f - 56, fps, config: {damping: 10, stiffness: 220, mass: 0.6}});
  const ats = [-8, 8, 24];
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[0, 10, 18], [14, 8, 14], [30, 10, 18], [40, 14, 26]], "hs")}}>
      <AbsoluteFill style={{background: C.ink}} />
      <ActionLines color="#fff" opacity={0.1} angle={-16} seed="hs" />
      {BANDS.map((b, i) => (
        <Panel key={i} x={40} y={b.y} w={1000} h={b.h} at={ats[i]} from={b.from} poly={b.poly} bg="#000">
          <Img src={staticFile(cover)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.pos, scale: String(1.3 - 0.12 * p(f, ats[i], ats[i] + 90)), translate: `${(i % 2 ? -1 : 1) * 30 * p(f, ats[i], ats[i] + 90)}px 0`}} />
        </Panel>
      ))}
      {h.lines.slice(0, 3).map((t, i) => {
        const at = ats[i] + 8;
        if (f < at) return null;
        const s = spring({frame: f - at, fps, config: {damping: 9, stiffness: 320, mass: 0.6}});
        const size = fitW(t, 120, 880, 0.9);
        return (
          <div key={i} style={{position: "absolute", left: i % 2 ? undefined : 70, right: i % 2 ? 70 : undefined, top: BANDS[i].y + BANDS[i].h / 2 - size * 0.62, background: i === 1 ? acc : "#fff", border: `7px solid ${C.ink}`, boxShadow: `10px 10px 0 ${i === 2 ? C.red : C.ink}`, padding: "6px 22px", rotate: `${i % 2 ? 3 : -3}deg`, scale: String(1.8 - 0.8 * s), opacity: Math.min(1, s * 2), transformOrigin: i % 2 ? "100% 50%" : "0 50%", ...dela(size, i === 2 ? C.red : C.ink, {whiteSpace: "nowrap"})}}>{t}</div>
        );
      })}
      {h.sfx ? <Sfx text={h.sfx} x={850} y={1176} size={150} color={C.red} stroke="#fff" rot={14} at={40} font={BRUSH} /> : null}
      {f >= 56 ? (
        <Bubble x={40} y={1262} w={640} h={262} shout tail={[520, -60]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
          {h.shout.map((t, i) => <div key={i} style={dela(i ? 52 : 42, i ? C.red : C.ink, {whiteSpace: "nowrap"})}>{t}</div>)}
        </Bubble>
      ) : null}
      {brand ? <BrandPlate b={brand} at={44} x={630} y={1330} scale={0.8} rot={3} /> : null}
      <Flash at={40} dur={4} max={0.5} />
    </AbsoluteFill>
  );
};
export const SND_HOOK_SPLIT: Snd[] = [[-8, "@whoosh-3", 0.45], [0, "@impact-3", 0.5], [0, "@zvukitop/zt-slap", 0.35], [8, "@whoosh-2", 0.45], [16, "@impact-3", 0.45], [16, "@stamp-1", 0.4],
  [24, "@whoosh-3", 0.45], [32, "@impact-1", 0.5], [32, "@stamp-1", 0.45], [40, "@boom-1", 0.55], [40, "@zvukitop/zt-cinema-hit", 0.3], [44, "@pop-1", 0.35], [56, "@pop-2", 0.45], [58, "@impact-2", 0.4], [80, "@riser-2", 0.3]];

// ── цифра на весь кадр ───────────────────────────────────────────────────────────────────────────────────────────────
export const StatAct: React.FC<{b: BNStat; dur: number; brand?: BNBrand}> = ({b, dur, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const tN = 16, tE = Math.round(dur * 0.4), tC = Math.round(dur * 0.52), tNote = Math.round(dur * 0.66);
  const ns = spring({frame: f - tN, fps, config: {damping: 9, stiffness: 210, mass: 0.8}});
  const es = spring({frame: f - tE, fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
  const size = fitW(factStr(b.big), 170, 900, 0.8);
  const chips = (b.chips ?? []).slice(0, 2);
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tN + 28, 18, 30], [tE, 10, 18]], b.title)}}>
      <AbsoluteFill style={{background: "#000"}}>
        <Img src={staticFile(b.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 45%", scale: String(1.04 + 0.16 * p(f, 0, dur, EIO))}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: "linear-gradient(180deg, rgba(12,12,18,.94) 0px, rgba(12,12,18,.88) 410px, rgba(12,12,18,.3) 620px, rgba(12,12,18,.45) 1000px, rgba(12,12,18,.93) 1600px)"}} />
      <SpeedLines color="#fff" opacity={0.3 * p(f, tN, tN + 10)} cx={540} cy={800} inner={400} seed={`${b.title}s`} />
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} dark />
      {brand ? <BrandPlate b={brand} at={10} x={640} y={430} scale={0.6} rot={3} /> : null}
      {f >= tN ? (
        <>
          <Burst x={540} y={800} r={310} color={acc} stroke={C.ink} scale={0.3 + 0.7 * ns} rot={f * 0.25} seed={`${b.title}st`} points={22} />
          <div style={{position: "absolute", left: 0, right: 0, top: 800 - size * 0.56, textAlign: "center", scale: String(0.4 + 0.6 * ns), ...dela(size, C.ink, {whiteSpace: "nowrap", WebkitTextStroke: "12px #fff", paintOrder: "stroke fill", textShadow: `10px 10px 0 ${C.ink}`})}}>{countNum(f, tN, 30, b.big)}</div>
          <div style={{position: "absolute", left: 110, right: 110, top: 1000, textAlign: "center", fontFamily: FONT.golos, fontWeight: 800, fontSize: 38, lineHeight: 1.16, color: "#fff", textShadow: `4px 4px 0 ${C.ink}`, opacity: p(f, tN + 22, tN + 30)}}>{b.big.text}</div>
        </>
      ) : null}
      {b.equal && f >= tE ? (
        <div style={{position: "absolute", left: 540, top: 1128, translate: "-50% 0", rotate: "-3deg", scale: String(1.8 - 0.8 * es), opacity: Math.min(1, es * 2), background: C.ink, border: `6px solid ${acc}`, padding: "12px 26px", boxShadow: `10px 10px 0 ${C.red}`, whiteSpace: "nowrap", ...dela(fitW(`= ${b.equal}`, 56, 900, 0.66), acc)}}>{`= ${b.equal}`}</div>
      ) : null}
      {chips.map((c, i) => <Chip key={i} x={i ? 1016 - 600 : 64} y={1252 + i * 104} at={tC + i * 14} rot={i ? 2 : -2} bg={i ? acc : "#fff"} size={30} maxW={600}>{c}</Chip>)}
      {b.note && !chips.length ? <Narration x={64} y={1352} w={952} at={tNote} font={FONT.golos} size={32} bg={acc}>{b.note}</Narration> : null}
      <Flash at={tN + 28} dur={5} max={0.55} />
    </AbsoluteFill>
  );
};
export const sndStat = (b: BNStat, d: number): Snd[] => {
  const tN = 16, tE = Math.round(d * 0.4), tC = Math.round(d * 0.52);
  return [[0, "@whoosh-4", 0.5], [0, "@riser-1", 0.3], [8, "@stamp-1", 0.3], [tN, "@impact-3", 0.5], [tN + 2, "@zvukitop/zt-boom", 0.3], [tN + 6, "@coin-1", 0.3], [tN + 14, "@coin-2", 0.3],
    [tN + 28, "@boom-1", 0.6], [tN + 28, "@zvukitop/zt-cinema-hit", 0.35], [tN + 32, "@applause-1", 0.15],
    ...(b.equal ? [[tE, "@stamp-1", 0.55], [tE, "@impact-4", 0.4]] as Snd[] : []),
    ...(b.chips ?? []).slice(0, 2).map((_, i) => [tC + i * 14, i ? "@pop-2" : "@pop-1", 0.45] as Snd),
    ...(b.note ? [[Math.round(d * 0.66), "@typewriter-1", 0.35]] as Snd[] : [])];
};

// ── сценка-диалог ─────────────────────────────────────────────────────────────────────────────────────────────────────
const Avatar: React.FC<{w: BNWho; x: number; y: number; talk: boolean; flip?: boolean; bg: string}> = ({w, x, y, talk, flip, bg}) => (
  <div style={{position: "absolute", left: x, top: y, width: 150, height: 150}}>
    <div style={{position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", background: bg, border: `6px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.ink}`}}>
      <Skeptic x={-40} y={-56} scale={0.55} emo={w.emo ?? "neutral"} talk={talk} fill={w.fill ?? C.ink} flip={flip} glasses={w.glasses} phone={w.phone} tie={w.tie} />
    </div>
    <div style={{position: "absolute", left: -10, right: -10, top: 138, textAlign: "center"}}>
      <span style={{background: C.ink, color: "#fff", fontFamily: FONT.golos, fontWeight: 800, fontSize: 22, padding: "2px 10px", whiteSpace: "nowrap"}}>{w.name}</span>
    </div>
  </div>
);
export const DialogAct: React.FC<{b: BNDialog; dur: number; brand?: BNBrand}> = ({b, dur, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const n = b.lines.length;
  const y0 = b.img ? 700 : 440;
  const rowH = Math.min(158, Math.floor((1450 - y0) / n));
  const step = Math.floor((dur * 0.8 - 10) / n);
  const bw = (t: string) => Math.min(800, Math.max(380, 230 + t.length * 21)); // ширина облачка — по длине реплики
  return (
    <AbsoluteFill style={{translate: sumShake(f, b.lines.map((_, k) => [10 + k * step, 5, 10] as [number, number, number]), b.title)}}>
      <Halftone bg={C.paper} dot="rgba(25,25,34,.12)" />
      <SpeedLines color={C.ink} opacity={0.12} cx={540} cy={1100} inner={520} seed={`${b.title}d`} />
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} />
      {b.img ? (
        <Panel x={64} y={430} w={952} h={240} at={4} from="top" bg="#000" poly={[[0, 0], [1, 0], [1, 0.86], [0, 1]]}>
          <Img src={staticFile(b.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 40%", scale: String(1.05 + 0.08 * p(f, 0, dur))}} />
        </Panel>
      ) : null}
      {b.lines.map((l, k) => {
        const at = 10 + k * step;
        if (f < at) return null;
        const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
        const left = l.who === "a";
        const y = y0 + k * rowH;
        const bh = rowH - 16;
        const last = k === n - 1;
        const talk = f >= at && f < at + step;
        return (
          <React.Fragment key={k}>
            <div style={{opacity: Math.min(1, s * 2)}}>
              <Avatar w={left ? b.a : b.b} x={left ? 40 : 1080 - 40 - 150} y={y + bh / 2 - 82} talk={talk} flip={!left} bg={left ? "#fff" : acc} />
            </div>
            <Bubble x={left ? 214 : 1080 - 214 - bw(l.text)} y={y} w={bw(l.text)} h={bh} tail={left ? [-34, bh * 0.55] : [bw(l.text) + 34, bh * 0.55]} scale={0.4 + 0.6 * s} opacity={Math.min(1, s * 2)} fill={last ? C.y : "#fff"} sw={6}>
              <div style={{fontFamily: last ? FONT.dela : FONT.golos, fontWeight: 800, fontSize: last ? fitW(l.text, 40, 1400, 0.6) : fitW(l.text, 36, 1300, 0.52), lineHeight: 1.12, color: last ? C.red : C.ink}}>{l.text}</div>
            </Bubble>
          </React.Fragment>
        );
      })}
      {b.note ? <Narration x={64} y={1352} w={952} at={Math.round(dur * 0.84)} font={FONT.golos} size={30} bg={acc}>{b.note}</Narration> : null}
    </AbsoluteFill>
  );
};
export const sndDialog = (b: BNDialog, d: number): Snd[] => {
  const step = Math.floor((d * 0.8 - 10) / b.lines.length);
  return [[0, "@flip-1", 0.45], [0, "@zvukitop/zt-paper", 0.3], [4, "@whoosh-2", 0.3],
    ...b.lines.flatMap((l, k) => [[10 + k * step, k === b.lines.length - 1 ? "@impact-2" : l.who === "a" ? "@pop-1" : "@pop-2", 0.45], [12 + k * step, "@typing-1", 0.25]] as Snd[]),
    ...(b.note ? [[Math.round(d * 0.84), "@typewriter-1", 0.35]] as Snd[] : [])];
};

// ── «вставной номер»: список ──────────────────────────────────────────────────────────────────────────────────────────
export const ListAct: React.FC<{b: BNList; dur: number; brand?: BNBrand}> = ({b, dur, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const n = b.items.length;
  const y0 = 440;
  const rowH = Math.min(150, Math.floor((1440 - y0) / n));
  const step = Math.floor((dur * 0.82 - 12) / n);
  return (
    <AbsoluteFill style={{translate: sumShake(f, b.items.map((_, k) => [12 + k * step, k === n - 1 ? 16 : 6, k === n - 1 ? 26 : 10] as [number, number, number]), b.title)}}>
      <AbsoluteFill style={{background: C.ink}} />
      {b.img ? <Img src={staticFile(b.img)} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: b.imgPos ?? "50% 50%", opacity: 0.32, filter: "grayscale(0.4) contrast(1.1)", scale: String(1.08 + 0.06 * p(f, 0, dur))}} /> : null}
      <AbsoluteFill style={{background: "linear-gradient(180deg, rgba(21,21,29,.85), rgba(21,21,29,.55) 40%, rgba(21,21,29,.85))"}} />
      <ActionLines color="#fff" opacity={0.08} angle={-10} seed={`${b.title}l`} />
      {b.mark ? <div style={{position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontFamily: BRUSH, fontSize: 760, lineHeight: 1, color: acc, opacity: 0.16}}>{b.mark}</div> : null}
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} dark />
      {b.items.map((t, k) => {
        const at = 12 + k * step;
        if (f < at) return null;
        const s = spring({frame: f - at, fps, config: {damping: 11, stiffness: 280, mass: 0.6}});
        const last = k === n - 1;
        const fromL = k % 2 === 0;
        const y = y0 + k * rowH;
        const fs = Math.min(36, Math.floor(rowH * 0.3));
        return (
          <div key={k} style={{position: "absolute", left: 64, right: 64, top: y, height: rowH - 14, display: "flex", alignItems: "center", gap: 18, translate: `${(1 - s) * (fromL ? -1100 : 1100)}px 0`, rotate: `${fromL ? -1.2 : 1.2}deg`}}>
            <div style={{width: rowH - 30, height: rowH - 30, flexShrink: 0, borderRadius: "50%", background: last ? C.red : acc, border: `6px solid #fff`, boxShadow: `6px 6px 0 #000`, display: "flex", alignItems: "center", justifyContent: "center", ...dela(Math.round((rowH - 30) * 0.5), last ? "#fff" : C.ink)}}>{k + 1}</div>
            <div style={{flex: 1, background: last ? C.y : "#fff", border: `5px solid ${C.ink}`, boxShadow: `8px 8px 0 ${last ? C.red : "#000"}`, padding: "8px 20px", fontFamily: last ? FONT.dela : FONT.golos, fontWeight: 800, fontSize: last ? fs + 4 : fs, lineHeight: 1.12, color: last ? C.red : C.ink}}>{t}</div>
          </div>
        );
      })}
      {b.note ? <Narration x={64} y={1352} w={952} at={Math.round(dur * 0.86)} font={FONT.golos} size={30} bg={acc}>{b.note}</Narration> : null}
      <Flash at={12 + (n - 1) * step} dur={4} max={0.4} />
    </AbsoluteFill>
  );
};
export const sndList = (b: BNList, d: number): Snd[] => {
  const n = b.items.length;
  const step = Math.floor((d * 0.82 - 12) / n);
  return [[0, "@flip-1", 0.5], [0, "@zvukitop/zt-glitch-1", 0.25], [6, "@stamp-1", 0.3],
    ...b.items.flatMap((_, k) => (k === n - 1 ? [[12 + k * step, "@boom-1", 0.55], [12 + k * step, "@zvukitop/zt-wrong", 0.3]] : [[12 + k * step, k % 2 ? "@swipe-1" : "@whoosh-2", 0.35], [15 + k * step, "@stamp-1", 0.4]]) as Snd[]),
    ...(b.note ? [[Math.round(d * 0.86), "@typewriter-1", 0.35]] as Snd[] : [])];
};

// ── разворот манги с камерой ─────────────────────────────────────────────────────────────────────────────────────────
const PAGE3 = [
  {x: 40, y: 430, w: 1000, h: 540, poly: [[0, 0], [1, 0], [1, 0.92], [0, 1]] as [number, number][]},
  {x: 40, y: 990, w: 480, h: 470, poly: [[0, 0.04], [1, 0], [0.94, 1], [0, 1]] as [number, number][]},
  {x: 536, y: 974, w: 504, h: 486, poly: [[0.06, 0.03], [1, 0], [1, 1], [0, 1]] as [number, number][]},
];
// две панели — высокие, рядом: камере есть куда наезжать (две широкие одна под другой давали пустую страницу)
const PAGE2 = [
  {x: 40, y: 440, w: 500, h: 1010, poly: [[0, 0], [1, 0], [0.9, 1], [0, 1]] as [number, number][]},
  {x: 530, y: 440, w: 510, h: 1010, poly: [[0.1, 0], [1, 0], [1, 1], [0, 1]] as [number, number][]},
];
export const PageAct: React.FC<{b: BNPage; dur: number; brand?: BNBrand}> = ({b, dur, brand}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const acc = useAcc();
  const L = b.panels.length >= 3 ? PAGE3 : PAGE2;
  const panels = b.panels.slice(0, L.length);
  const zoomEnd = Math.round(dur * (b.big ? 0.66 : 0.8));
  const seg = (zoomEnd - 6) / panels.length;
  // камера: на каждой панели — наезд на её центр, в конце — вся страница
  const tall = L === PAGE2; // высокие панели: камера на верхней части панели, подпись — сверху (иначе уходит под бегущую строку)
  const keys = panels.map((_, i) => ({t: 6 + i * seg, x: L[i].x + L[i].w / 2, y: tall ? L[i].y + 390 : L[i].y + L[i].h / 2, s: tall ? 1.42 : Math.min(1.75, 980 / L[i].w * 0.98, 1500 / L[i].h)}));
  let cx = 540, cy = 960, sc = 1;
  const all = [{t: 0, x: keys[0].x, y: keys[0].y, s: keys[0].s}, ...keys, {t: zoomEnd, x: 540, y: 945, s: 1}];
  for (let i = 0; i < all.length - 1; i++) {
    const a = all[i], c = all[i + 1];
    if (f >= a.t) {
      const k = p(f, c.t - 12, c.t, EIO);
      cx = a.x + (c.x - a.x) * k; cy = a.y + (c.y - a.y) * k; sc = a.s + (c.s - a.s) * k;
    }
  }
  const bs = spring({frame: f - zoomEnd - 4, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <div style={{position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", translate: `${540 - cx * sc}px ${960 - cy * sc}px`, scale: String(sc)}}>
        <Halftone bg={C.paper} dot="rgba(25,25,34,.12)" />
        {panels.map((pn, i) => {
          const g = L[i];
          return (
            <Panel key={i} x={g.x} y={g.y} w={g.w} h={g.h} at={Math.round(keys[i].t) - 8} from={i === 0 ? "scale" : i === 1 ? "left" : "right"} poly={g.poly} bg="#000">
              <Img src={staticFile(pn.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: pn.imgPos ?? "50% 50%", scale: String((pn.zoom ?? 1) * (1.04 + 0.06 * p(f, keys[i].t, keys[i].t + seg)))}} />
            </Panel>
          );
        })}
        {panels.map((pn, i) => {
          const g = L[i];
          const at = Math.round(keys[i].t) + 6;
          return (
            <React.Fragment key={`c${i}`}>
              <Narration x={g.x + (tall && i === 1 ? 60 : 24)} y={tall ? g.y + 28 : g.y + g.h - (i === 0 ? 130 : 150)} w={g.w - (tall ? 90 : 48)} at={at} font={FONT.golos} size={i === 0 ? 34 : 30} bg={i % 2 ? acc : "#fff"}>{pn.cap}</Narration>
              {pn.sfx ? <Sfx text={pn.sfx} x={g.x + g.w - 200} y={tall ? g.y + 560 : g.y + 30} size={120} color={C.red} stroke="#fff" rot={12} at={at + 6} font={BRUSH} /> : null}
            </React.Fragment>
          );
        })}
      </div>
      {/* шапка страницы поверх камеры: заголовок главы не ложится на панели */}
      <div style={{position: "absolute", left: 0, right: 0, top: 0, height: 418, background: C.paper, borderBottom: `8px solid ${C.ink}`, boxShadow: `0 8px 0 ${acc}`}} />
      <ChapterHead zh={b.zh} kicker={b.kicker} title={b.title} />
      {b.big && f >= zoomEnd + 4 ? (
        <>
          <Burst x={540} y={960} r={250} color={acc} stroke={C.ink} scale={0.3 + 0.7 * bs} rot={f * 0.3} seed={`${b.title}pg`} />
          <div style={{position: "absolute", left: 0, right: 0, top: 960 - 90, textAlign: "center", scale: String(0.3 + 0.7 * bs)}}>
            <div style={dela(fitW(factStr(b.big), 110, 420, 0.8), C.ink, {whiteSpace: "nowrap", textShadow: "6px 6px 0 #fff"})}>{countNum(f, zoomEnd + 4, 22, b.big)}</div>
            <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 30, lineHeight: 1.15, color: C.ink, margin: "8px auto 0", width: 380}}>{b.big.text}</div>
          </div>
        </>
      ) : null}
      {b.note ? <Narration x={64} y={1352} w={952} at={Math.round(dur * 0.86)} font={FONT.golos} size={30} bg={acc}>{b.note}</Narration> : null}
    </AbsoluteFill>
  );
};
export const sndPage = (b: BNPage, d: number): Snd[] => {
  const zoomEnd = Math.round(d * (b.big ? 0.66 : 0.8));
  const n = Math.min(b.panels.length, 3);
  const seg = (zoomEnd - 6) / n;
  return [[0, "@flip-1", 0.5], [0, "@zvukitop/zt-paper", 0.3],
    ...Array.from({length: n}).flatMap((_, i) => [[Math.round(6 + i * seg) - 8, "@whoosh-3", 0.4], [Math.round(6 + i * seg) - 6, "@impact-1", 0.35], [Math.round(6 + i * seg) + 6, "@typewriter-1", 0.3]] as Snd[]),
    ...b.panels.slice(0, n).flatMap((pn, i) => (pn.sfx ? [[Math.round(6 + i * seg) + 12, "@zvukitop/zt-pop", 0.35]] as Snd[] : [])),
    [zoomEnd - 12, "@whoosh-4", 0.45],
    ...(b.big ? [[zoomEnd + 4, "@impact-3", 0.55], [zoomEnd + 4, "@zvukitop/zt-boom", 0.35], [zoomEnd + 10, "@coin-1", 0.35], [zoomEnd + 18, "@success-1", 0.3]] as Snd[] : []),
    ...(b.note ? [[Math.round(d * 0.86), "@typewriter-1", 0.35]] as Snd[] : [])];
};
