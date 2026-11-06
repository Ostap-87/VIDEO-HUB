// Сцены ролика «Что такое 多 NEWS» (06.11.2026): блог пишет много и про разное → читать некогда → статья превращается в выпуск
// манхуа на 45 секунд → индустрии Азии → сезоны и ритм → где смотреть. Тексты и цифры — из props (только факты сайта и POST-HUB).
import React from "react";
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {BRUSH} from "../../components/MontazhFx";
import {FONT} from "../site-manhua/fonts";
import {Bubble, Burst, C, EIO, EO, Flash, Halftone, Letterbox, Narration, Panel, Sfx, SpeedLines, Tape, p, sumShake} from "../site-manhua/fx";
import {ChapterHead, Chip, dela, numStyle} from "../blog-news/kit";
import type {OdxHead} from "./scenes";

export type OdxHookCovers = {kind: "hookCovers"; sec: number; covers: string[]; lines: string[]; shout: string[]; zh?: string; sfx?: string};
export type OdxPile = OdxHead & {kind: "pile"; sec: number; from: string; to: string; count: number; countFrom?: number; // countFrom — номер статьи в первый день календаря (счётчик идёт по дням)
  countLabel: string; calNote: string; rubricsLabel: string; rubrics: string[]; tags: string[]; countries: string[]; langs: string};
export type OdxClock = OdxHead & {kind: "clock"; sec: number; img: string; imgPos?: string; num: number; unit: string; numLabel: string; chips: string[]; note: string; sfx?: string};
export type OdxPipeline = OdxHead & {kind: "pipeline"; sec: number; img: string; steps: {img?: string; pos?: string; timer?: number; label: string; sub: string}[]; note: string};
export type OdxTopics = OdxHead & {kind: "topics"; sec: number; img: string; imgPos?: string; labels: {text: string; x: number; y: number; rot?: number}[]; note: string};
export type OdxSeasons = OdxHead & {kind: "seasons"; sec: number; seasons: {zh: string; name: string}[]; covers: string[]; tape: string; chips: string[]};
export type OdxFinRows = {kind: "finRows"; sec: number; photo: string; title: string; zh?: string; rows: {icon: "instagram" | "book" | "telegram"; kicker: string; value: string; sub: string}[]; button: string; done: string; follow: string};
export type OdxScene2 = OdxHookCovers | OdxPile | OdxClock | OdxPipeline | OdxTopics | OdxSeasons | OdxFinRows;

const CUT = "drop-shadow(7px 0 0 #fff) drop-shadow(-7px 0 0 #fff) drop-shadow(0 7px 0 #fff) drop-shadow(0 -7px 0 #fff) drop-shadow(16px 16px 0 #15151D)";

// ── хук: стена настоящих обложек статей блога, три строки ударами, облачко-крик ──────────────────────────────────────────
export const HookCovers: React.FC<{s: OdxHookCovers; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tBub = Math.round(dur * 0.56);
  const bub = spring({frame: f - tBub, fps, config: {damping: 10, stiffness: 220, mass: 0.6}});
  const cols = ["#fff", C.y, "#fff"];
  const TW = 300, TH = 200;
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[0, 8, 16], [12, 6, 12], [20, 6, 12], [tBub, 12, 24]], "hc")}}>
      <AbsoluteFill style={{background: C.ink}} />
      <div style={{position: "absolute", left: -140, top: -160, width: 1400, rotate: "-7deg", translate: `0 ${(-f * 1.6).toFixed(1)}px`}}>
        {Array.from({length: 44}).map((_, i) => {
          const src = s.covers[i % s.covers.length];
          const at = (i % 11) * 1.2;
          const k = p(f, at, at + 8, EO);
          return (
            <div key={i} style={{position: "absolute", left: (i % 4) * (TW + 20) + (Math.floor(i / 4) % 2) * 120, top: Math.floor(i / 4) * (TH + 20), width: TW, height: TH, border: "5px solid #fff", overflow: "hidden", opacity: k, scale: String(1.3 - 0.3 * k)}}>
              <Img src={staticFile(src)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
            </div>
          );
        })}
      </div>
      <AbsoluteFill style={{background: "linear-gradient(180deg, rgba(21,21,29,.35) 0%, rgba(21,21,29,.72) 42%, rgba(21,21,29,.86) 100%)"}} />
      <SpeedLines color="#fff" opacity={0.12} cx={540} cy={1080} inner={460} seed="hcs" />
      {s.lines.map((t, i) => {
        const at = i === 0 ? -10 : 4 + 9 * i;
        if (f < at) return null;
        const k = spring({frame: f - at, fps, config: {damping: 9, stiffness: 300, mass: 0.6}});
        return <div key={i} style={{position: "absolute", left: 64, top: 860 + i * 160, ...dela(Math.min(150, Math.floor(950 / (t.length * 0.86))), cols[i % 3], {whiteSpace: "nowrap"}), scale: String(1.7 - 0.7 * k), transformOrigin: "0 50%", textShadow: `9px 9px 0 ${i === 1 ? C.ink : C.red}`, WebkitTextStroke: i === 1 ? `3px ${C.ink}` : undefined, paintOrder: "stroke fill"}}>{t}</div>;
      })}
      {s.sfx ? <Sfx text={s.sfx} x={760} y={1330} size={130} color={C.red} stroke="#fff" rot={12} at={30} font={BRUSH} /> : null}
      {f >= tBub ? (
        <Bubble x={110} y={280} w={860} h={430} shout tail={[620, 600]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
          {s.shout.map((t, i) => <div key={i} style={dela(i === s.shout.length - 1 ? Math.min(96, Math.floor(640 / (t.length * 0.7))) : 54, i === s.shout.length - 1 ? C.red : C.ink, {whiteSpace: "nowrap"})}>{t}</div>)}
          {s.zh ? <div style={{fontFamily: BRUSH, fontSize: 52, color: C.ink, marginTop: 4}}>{s.zh}</div> : null}
        </Bubble>
      ) : null}
      <Flash at={tBub} dur={6} max={0.5} />
    </AbsoluteFill>
  );
};

// даты от from до to включительно (ГГГГ-ММ-ДД)
const daysBetween = (from: string, to: string) => {
  const out: Date[] = [];
  const d = new Date(`${from}T12:00:00Z`), e = new Date(`${to}T12:00:00Z`);
  while (d <= e) { out.push(new Date(d)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
};
const MONTHS = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];

// ── «пишу много и про разное»: отрывной календарь каждый день, счётчик статей, рубрики, теги, страны, языки ──────────────
export const PileAct: React.FC<{s: OdxPile; dur: number}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const days = daysBetween(s.from, s.to);
  const T0 = 10, T1 = 70;
  const pos = p(f, T0, T1) * (days.length - 1);
  const idx = Math.floor(pos), fr = pos - idx;
  const page = (d: Date, extra: React.CSSProperties = {}) => (
    <div style={{position: "absolute", inset: 0, background: "#fff", border: `6px solid ${C.ink}`, ...extra}}>
      <div style={{height: 92, background: C.red, borderBottom: `6px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.oswald, fontSize: 44, letterSpacing: "0.12em", color: "#fff"}}>{MONTHS[d.getUTCMonth()]}</div>
      <div style={{textAlign: "center", ...dela(210, C.ink), lineHeight: 1.18}}>{d.getUTCDate()}</div>
    </div>
  );
  const cs = spring({frame: f - 6, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[T1, 12, 22]], "pl")}}>
      <Halftone bg={C.paper} dot="rgba(232,52,28,.12)" />
      <ChapterHead zh={s.zh} kicker={s.kicker} title={s.title} />
      <div style={{position: "absolute", left: 64, top: 440, width: 390, height: 380, rotate: "-3deg", boxShadow: `14px 14px 0 ${C.ink}`}}>
        {page(days[Math.min(days.length - 1, idx + 1)])}
        {idx < days.length - 1 ? page(days[idx], {translate: `${-fr * 640}px ${fr * 90}px`, rotate: `${-fr * 32}deg`, opacity: 1 - fr * 0.5}) : page(days[days.length - 1])}
        {Array.from({length: 4}).map((_, i) => <div key={i} style={{position: "absolute", top: -18, left: 50 + i * 90, width: 22, height: 40, borderRadius: 11, background: C.ink, border: "4px solid #fff"}} />)}
      </div>
      <Chip x={64} y={850} at={20} rot={-1.5} bg={C.ink} color={C.y} size={28}>{s.calNote}</Chip>
      {f >= 6 ? (
        <>
          <Burst x={790} y={620} r={190} color={C.y} scale={0.3 + 0.7 * cs} rot={f * 0.4} seed="plb" />
          <div style={{position: "absolute", left: 790, top: 600, translate: "-50% -50%", rotate: "-5deg", scale: String(0.3 + 0.7 * cs), background: "#fff", border: `6px solid ${C.ink}`, boxShadow: `10px 10px 0 ${C.red}`, padding: "0 22px 6px", ...numStyle(130, C.ink)}}>{s.countFrom !== undefined ? s.countFrom + Math.round(pos) : Math.round(s.count * p(f, T0, T1))}</div>
          <div style={{position: "absolute", left: 790, top: 730, translate: "-50% 0", rotate: "-5deg", background: C.ink, color: "#fff", fontFamily: FONT.golos, fontWeight: 800, fontSize: 30, padding: "4px 14px", whiteSpace: "nowrap", opacity: p(f, 12, 18)}}>{s.countLabel}</div>
        </>
      ) : null}
      <div style={{position: "absolute", left: 64, top: 930, fontFamily: FONT.oswald, fontSize: 32, letterSpacing: "0.16em", color: C.red, opacity: p(f, 76, 82)}}>{s.rubricsLabel}</div>
      {s.rubrics.map((t, i) => <Chip key={i} x={64 + i * 18} y={980 + i * 78} at={80 + i * 12} rot={i % 2 ? 1.2 : -1.2} bg={[ "#fff", C.y, C.red][i % 3]} color={i % 3 === 2 ? "#fff" : C.ink} size={30} maxW={940}>{t}</Chip>)}
      <div style={{position: "absolute", left: 64, right: 64, top: 1222, display: "flex", flexWrap: "wrap", gap: 12}}>
        {s.tags.map((t, i) => {
          const at = 122 + i * 6;
          const k = spring({frame: f - at, fps, config: {damping: 10, stiffness: 280, mass: 0.5}});
          return <div key={i} style={{background: C.ink, color: C.y, fontFamily: FONT.golos, fontWeight: 800, fontSize: 26, padding: "5px 14px", opacity: f < at ? 0 : Math.min(1, k * 2), scale: String(f < at ? 0 : 1.5 - 0.5 * k)}}>{`#${t}`}</div>;
        })}
      </div>
      {f >= 160 ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 1336, height: 62, background: C.red, borderTop: `5px solid ${C.ink}`, borderBottom: `5px solid ${C.ink}`, overflow: "hidden", translate: `${(1 - p(f, 160, 170, EO)) * -1100}px 0`}}>
          <div style={{position: "absolute", left: 40 - (f - 160) * 4, top: 6, whiteSpace: "nowrap", fontFamily: FONT.golos, fontWeight: 800, fontSize: 32, color: "#fff"}}>{[...s.countries, ...s.countries].join("  ·  ")}</div>
        </div>
      ) : null}
      <Chip x={64} y={1418} at={176} rot={-2} bg="#fff" size={30}>{s.langs.split("中文")[0]}<span style={{fontFamily: FONT.zcool}}>{s.langs.includes("中文") ? "中文" : ""}</span>{s.langs.split("中文")[1] ?? ""}</Chip>
    </AbsoluteFill>
  );
};

// ── «читать некогда»: бегущий человек, сумма минут чтения всех статей во взрыве ───────────────────────────────────────
export const ClockAct: React.FC<{s: OdxClock; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tB = 46;
  const bs = spring({frame: f - tB, fps, config: {damping: 9, stiffness: 240, mass: 0.7}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tB, 12, 24]], "cl")}}>
      <Halftone bg={C.red} dot="rgba(25,25,34,.2)" />
      <ChapterHead zh={s.zh} kicker={s.kicker} title={s.title} dark />
      <Panel x={64} y={430} w={952} h={560} at={4} from="right" rot={-1} bg="#000">
        <Img src={staticFile(s.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: s.imgPos ?? "50% 30%", scale: String(1.04 + 0.08 * p(f, 0, dur))}} />
      </Panel>
      {s.sfx ? <Sfx text={s.sfx} x={90} y={460} size={120} color={C.y} rot={-10} at={20} font={BRUSH} /> : null}
      {f >= tB ? (
        <>
          <Burst x={790} y={1100} r={180} color={C.y} scale={0.3 + 0.7 * bs} rot={f * 0.4} seed="clb" />
          <div style={{position: "absolute", left: 790, top: 1092, translate: "-50% -50%", rotate: "-5deg", scale: String(0.3 + 0.7 * bs), display: "flex", alignItems: "baseline", gap: 10, background: "#fff", border: `6px solid ${C.ink}`, boxShadow: `10px 10px 0 ${C.ink}`, padding: "0 20px 6px"}}>
            <span style={numStyle(110, C.red)}>{Math.round(s.num * p(f, tB, tB + 26, EO))}</span>
            <span style={dela(46, C.ink)}>{s.unit}</span>
          </div>
          <div style={{position: "absolute", left: 790, top: 1190, translate: "-50% 0", rotate: "-5deg", background: C.ink, color: "#fff", fontFamily: FONT.golos, fontWeight: 800, fontSize: 28, padding: "4px 14px", whiteSpace: "nowrap", opacity: p(f, tB + 8, tB + 14)}}>{s.numLabel}</div>
        </>
      ) : null}
      {s.chips.map((t, i) => <Chip key={i} x={64} y={1036 + i * 104} at={tB + 26 + i * 16} rot={i % 2 ? 1.5 : -1.5} bg={i === s.chips.length - 1 ? C.y : "#fff"} size={31} maxW={470}>{t}</Chip>)}
      <Narration x={64} y={1330} w={952} at={Math.round(dur * 0.6)} font={FONT.golos} size={34} bg="#fff" sh={C.ink}>{s.note}</Narration>
    </AbsoluteFill>
  );
};

// ── «статья → выпуск → 45 секунд»: картинка-превращение и схема из трёх карточек со стрелками ─────────────────────────────
export const PipelineAct: React.FC<{s: OdxPipeline; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const X = [64, 400, 736], at = (i: number) => 36 + i * 34;
  return (
    <AbsoluteFill style={{translate: sumShake(f, s.steps.map((_, i) => [at(i), 8, 14] as [number, number, number]), "pp")}}>
      <Halftone bg={C.y} dot="rgba(25,25,34,.16)" />
      <SpeedLines color={C.ink} opacity={0.22} cx={540} cy={1060} inner={520} seed="pps" />
      <ChapterHead zh={s.zh} kicker={s.kicker} title={s.title} />
      <Panel x={64} y={430} w={952} h={400} at={4} from="scale" bg="#fff">
        <Img src={staticFile(s.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 45%", scale: String(1.02 + 0.08 * p(f, 0, dur))}} />
      </Panel>
      {s.steps.map((st, i) => {
        const a = at(i);
        if (f < a) return null;
        const k = spring({frame: f - a, fps, config: {damping: 10, stiffness: 240, mass: 0.6}});
        const sec = st.timer !== undefined ? Math.min(st.timer, Math.floor(st.timer * p(f, a + 8, a + 60))) : 0;
        return (
          <div key={i} style={{position: "absolute", left: X[i], top: 880, width: 280, height: 370, background: "#fff", border: `6px solid ${C.ink}`, boxShadow: `9px 9px 0 ${i === 2 ? C.red : C.ink}`, rotate: `${[-2, 1.5, -1][i]}deg`, scale: String(1.5 - 0.5 * k), opacity: Math.min(1, k * 2), overflow: "hidden"}}>
            <div style={{height: 228, borderBottom: `6px solid ${C.ink}`, position: "relative", overflow: "hidden", background: C.ink}}>
              {st.img ? <Img src={staticFile(st.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: st.pos ?? "50% 30%"}} /> : (
                <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8}}>
                  <svg width={70} height={70} viewBox="0 0 70 70"><circle cx={35} cy={35} r={32} fill={C.red} /><path d="M27,20 L52,35 L27,50 Z" fill="#fff" /></svg>
                  <div style={{...numStyle(76, C.y), fontFamily: FONT.mono}}>{`0:${String(sec).padStart(2, "0")}`}</div>
                </div>
              )}
            </div>
            <div style={{padding: "12px 16px"}}>
              <div style={dela(st.label.length > 7 ? 30 : 36, C.ink, {whiteSpace: "nowrap"})}>{st.label}</div>
              <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 25, color: C.red, marginTop: 6, lineHeight: 1.15}}>{st.sub}</div>
            </div>
          </div>
        );
      })}
      {[0, 1].map((i) => (f >= at(i + 1) - 6 ? <div key={i} style={{position: "absolute", left: X[i] + 270, top: 1010, ...dela(66, C.red, {WebkitTextStroke: `4px ${C.ink}`, paintOrder: "stroke fill"}), scale: String(1.6 - 0.6 * p(f, at(i + 1) - 6, at(i + 1), EO)), zIndex: 3}}>➜</div> : null))}
      <Narration x={64} y={1300} w={952} at={Math.round(dur * 0.6)} font={FONT.golos} size={34} bg="#fff">{s.note}</Narration>
    </AbsoluteFill>
  );
};

// ── «индустрии Азии»: манхуа-коллаж и наклейки тем блога ───────────────────────────────────────────────────────────────
export const TopicsAct: React.FC<{s: OdxTopics; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{translate: sumShake(f, s.labels.map((_, i) => [18 + i * 12, 6, 10] as [number, number, number]), "tp")}}>
      <AbsoluteFill style={{background: C.ink}} />
      <ChapterHead zh={s.zh} kicker={s.kicker} title={s.title} dark />
      <Panel x={40} y={420} w={1000} h={970} at={2} from="scale" bg="#000">
        <Img src={staticFile(s.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: s.imgPos ?? "50% 45%", scale: String(1.02 + 0.08 * p(f, 0, dur))}} />
      </Panel>
      {s.labels.map((l, i) => <Chip key={i} x={l.x} y={l.y} at={18 + i * 12} rot={l.rot ?? (i % 2 ? 2 : -2)} bg={i % 2 ? C.y : "#fff"} size={32}>{l.text}</Chip>)}
      <Narration x={64} y={1410} w={952} at={Math.round(dur * 0.55)} font={FONT.golos} size={31} bg={C.y} sh={C.red}>{s.note}</Narration>
    </AbsoluteFill>
  );
};

// ── «сезоны и ритм»: печати сезонов, сетка готовых выпусков, «новый выпуск — каждый день» ─────────────────────────────────
export const SeasonsAct: React.FC<{s: OdxSeasons; dur: number}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const TW = 172, G = 23;
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[100, 10, 18]], "ss")}}>
      <Halftone bg={C.paper} dot="rgba(25,25,34,.1)" />
      <ChapterHead zh={s.zh} kicker={s.kicker} title={s.title} />
      <div style={{position: "absolute", left: 64, top: 548, width: 952 * p(f, 6, 46, EIO), height: 8, background: C.red}} />
      {s.seasons.map((x, i) => {
        const at = 6 + i * 8;
        if (f < at) return null;
        const k = spring({frame: f - at, fps, config: {damping: 9, stiffness: 280, mass: 0.6}});
        return (
          <div key={i} style={{position: "absolute", left: 64 + i * (TW + G), top: 440, width: TW, scale: String(1.6 - 0.6 * k), opacity: Math.min(1, k * 2), rotate: `${i % 2 ? 3 : -3}deg`}}>
            <div style={{height: 150, background: C.seal, border: `5px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.zcool, fontSize: 74, color: "#fff"}}>{x.zh}</div>
            <div style={{marginTop: 10, background: "#fff", border: `4px solid ${C.ink}`, padding: "4px 6px", textAlign: "center", fontFamily: FONT.golos, fontWeight: 800, fontSize: 22, lineHeight: 1.1, color: C.ink, minHeight: 58, display: "flex", alignItems: "center", justifyContent: "center"}}>{x.name}</div>
          </div>
        );
      })}
      {s.covers.map((src, i) => {
        const at = 48 + i * 5;
        if (f < at) return null;
        const k = spring({frame: f - at, fps, config: {damping: 11, stiffness: 260, mass: 0.6}});
        return (
          <div key={i} style={{position: "absolute", left: 64 + (i % 4) * 242, top: 730 + Math.floor(i / 4) * 300, width: 226, height: 286, border: `5px solid ${C.ink}`, overflow: "hidden", boxShadow: `6px 6px 0 ${C.ink}`, scale: String(1.4 - 0.4 * k), opacity: Math.min(1, k * 2), rotate: `${(i % 3) - 1}deg`}}>
            <Img src={staticFile(src)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%"}} />
          </div>
        );
      })}
      <Tape x={110} y={990} at={96} font={FONT.unb} size={34} rot={-4} bg={C.red} color="#fff">{s.tape}</Tape>
      {s.chips.map((t, i) => <Chip key={i} x={64 + i * 30} y={1350 + i * 80} at={118 + i * 14} rot={i % 2 ? 1.5 : -1.5} bg={i ? "#fff" : C.y} size={32} maxW={952}>{t}</Chip>)}
    </AbsoluteFill>
  );
};

const IconBox: React.FC<{icon: "instagram" | "book" | "telegram"}> = ({icon}) => (
  <div style={{width: 104, height: 104, flexShrink: 0, background: C.ink, border: `5px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.red}`, display: "flex", alignItems: "center", justifyContent: "center"}}>
    {icon === "instagram" ? (
      <svg width={64} height={64} viewBox="0 0 64 64"><rect x={6} y={6} width={52} height={52} rx={15} fill="none" stroke={C.y} strokeWidth={7} /><circle cx={32} cy={32} r={12} fill="none" stroke={C.y} strokeWidth={7} /><circle cx={47} cy={17} r={4} fill={C.y} /></svg>
    ) : icon === "telegram" ? (
      <svg width={64} height={64} viewBox="0 0 64 64"><path d="M6,30 L56,10 L46,56 L32,44 L24,52 L24,40 L46,20 L20,36 Z" fill={C.y} /></svg>
    ) : (
      <svg width={64} height={64} viewBox="0 0 64 64"><path d="M6,12 C16,8 26,9 32,15 C38,9 48,8 58,12 L58,54 C48,50 38,51 32,56 C26,51 16,50 6,54 Z" fill="none" stroke={C.y} strokeWidth={6} strokeLinejoin="round" /><path d="M32,15 L32,56" stroke={C.y} strokeWidth={5} /></svg>
    )}
  </div>
);

// ── финал «где смотреть»: три строки (Instagram, блог, Telegram), кнопка «Подписаться», 未完待续 ──────────────────────────
export const FinRows: React.FC<{s: OdxFinRows; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ph = spring({frame: f - 2, fps, config: {damping: 13, stiffness: 150, mass: 0.9}});
  const tPress = Math.round(dur * 0.55);
  const press = p(f, tPress - 4, tPress) - p(f, tPress, tPress + 6);
  const done = f >= tPress + 2;
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[tPress, 8, 14]], "fr")}}>
      <Halftone bg={C.bone} dot="rgba(25,25,34,.12)" />
      <SpeedLines color={C.ink} opacity={0.12} cx={820} cy={1300} inner={480} seed="frs" />
      <Img src={staticFile(s.photo)} style={{position: "absolute", right: -70, bottom: 0, height: 820, filter: CUT, translate: `${(1 - ph) * 600}px 0`}} />
      <div style={{position: "absolute", left: 64, top: 290, ...dela(92, C.ink, {whiteSpace: "nowrap"}), opacity: p(f, 2, 8), translate: `${(1 - p(f, 2, 14, EO)) * -120}px 0`}}><span style={{background: C.y, padding: "0 14px"}}>{s.title}</span></div>
      {s.zh ? <Sfx text={s.zh} x={70} y={404} size={60} color={C.red} stroke="#fff" rot={-3} at={10} font={BRUSH} /> : null}
      {s.rows.map((r, i) => {
        const at = 14 + i * 12;
        if (f < at) return null;
        const k = spring({frame: f - at, fps, config: {damping: 11, stiffness: 240, mass: 0.6}});
        return (
          <div key={i} style={{position: "absolute", left: 64, top: 520 + i * 160, display: "flex", alignItems: "center", gap: 24, translate: `${(1 - k) * -700}px 0`}}>
            <IconBox icon={r.icon} />
            <div>
              <div style={{fontFamily: FONT.oswald, fontSize: 28, letterSpacing: "0.14em", color: C.red}}>{r.kicker}</div>
              <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 40, color: C.ink, background: "#fff", border: `4px solid ${C.ink}`, padding: "2px 12px", whiteSpace: "nowrap", marginTop: 4}}>{r.value}</div>
              <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 24, color: C.ink, marginTop: 6}}>{r.sub.split("中文")[0]}{r.sub.includes("中文") ? <span style={{fontFamily: FONT.zcool}}>中文</span> : null}{r.sub.split("中文")[1] ?? ""}</div>
            </div>
          </div>
        );
      })}
      {f >= 52 ? (
        <div style={{position: "absolute", left: 64, top: 1010, scale: String((1 - 0.12 * press) * (1.4 - 0.4 * p(f, 52, 62, EO))), opacity: p(f, 52, 58), background: done ? C.y : C.red, border: `6px solid ${C.ink}`, boxShadow: `${10 - 8 * press}px ${10 - 8 * press}px 0 ${C.ink}`, padding: "16px 34px", ...dela(46, done ? C.ink : "#fff", {whiteSpace: "nowrap"})}}>
          {done ? s.done : s.button}
        </div>
      ) : null}
      {f >= tPress - 8 && f < tPress + 14 ? (
        <div style={{position: "absolute", left: 290, top: 1040, width: 86, height: 86, borderRadius: "50%", border: `7px solid ${C.ink}`, background: "rgba(255,217,46,.45)", opacity: 1 - p(f, tPress + 2, tPress + 14), scale: String(0.6 + 0.8 * p(f, tPress - 8, tPress + 14))}} />
      ) : null}
      {f >= tPress + 14 ? (
        <>
          <div style={{position: "absolute", left: 60, top: 1150, fontFamily: FONT.zcool, fontSize: 96, color: C.ink, textShadow: "8px 8px 0 #fff", scale: String(1.5 - 0.5 * spring({frame: f - tPress - 14, fps, config: {damping: 10, stiffness: 260}})), transformOrigin: "0 50%"}}>未完待续…</div>
          <div style={{position: "absolute", left: 66, top: 1270, fontFamily: FONT.hand, fontSize: 44, color: C.red, opacity: p(f, tPress + 24, tPress + 32)}}>{s.follow}</div>
        </>
      ) : null}
      <Letterbox h={130 * p(f, dur - 22, dur, EIO)} />
    </AbsoluteFill>
  );
};
