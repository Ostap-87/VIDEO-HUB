// «Робокитай» — плоские сцены серии: письмо клиента, карта Робокитая с поездом и печатью края, флипчарт Ави (критерии и
// расчёт парка), финал со ссылкой и анонсом следующей серии. Звуки — `Sounds` (секунды от начала сцены, библиотека
// интернет-материалы/звуки/: "@whoosh-2").
import React from "react";
import {AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {AuraMascot} from "../../components/AuraMascot";
import {AuraBadge} from "../../components/AuraBadge";
import {Stage} from "../../components/aura3d/kit";
import {ArmModel} from "../../components/aura3d/AuraArm";
import {CHINA_H, CHINA_PATHS, CITY_XY} from "./chinaMap";
import {BRUSH_CJK, CL, EIO, EO, INTER, MONO, MONO_CJK, MarkLine, Marked, NamePlate, Paper, RK, Seal, p01, usePop} from "./kit";
import type {RobokitaiProps} from "./types";

// --- звуки сцены: [секунда, "@файл", громкость] ---
export type Snd = [number, string, number];
const sfxSrc = (n: string) => (n.startsWith("@") ? `интернет-материалы/звуки/${n.slice(1)}.wav` : n);
export const Sounds: React.FC<{list: Snd[]}> = ({list}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {list.map(([at, name, vol], i) => (
        <Sequence key={i} from={Math.round(at * fps)} durationInFrames={Math.round(4.5 * fps)} layout="none">
          <Audio src={staticFile(sfxSrc(name))} volume={vol} />
        </Sequence>
      ))}
    </>
  );
};

const typed = (f: number, at: number, text: string, perChar = 1.1) => text.slice(0, Math.max(0, Math.min(text.length, Math.floor((f - at) / perChar) + 1)));

// ===== 1. Задание: письмо клиента =====
const Workshop: React.FC = () => (
  <svg width={1080} height={1920} style={{position: "absolute", inset: 0, opacity: 0.3}}>
    <g fill="none" stroke={RK.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
      {/* верстак */}
      <path d="M560 1352 L1046 1352 M582 1352 L582 1520 M1024 1352 L1024 1520 M582 1440 L1024 1440" />
      {/* чертёж тележки на стене */}
      <rect x={96} y={1000} width={260} height={170} rx={6} />
      <path d="M126 1110 L326 1110 L326 1070 L126 1070 Z M152 1110 m-13 0 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 M300 1110 m-13 0 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 M126 1034 L236 1034 M126 1050 L190 1050" />
    </g>
  </svg>
);

export const LetterBeat: React.FC<{P: RobokitaiProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const L = P.letter;
  const cardAt = Math.round(0.35 * fps);
  const s = usePop(cardAt, 14);
  const lineAt = [0.85, 1.75, 2.75].map((x) => Math.round(x * fps));
  return (
    <AbsoluteFill>
      <Paper />
      <Workshop />
      {/* письмо — облачко сообщения с хвостом к Ави */}
      <div style={{position: "absolute", left: 64, top: 430, width: 952, translate: `0 ${(1 - s) * 80}px`, opacity: Math.min(1, s * 1.6)}}>
        <svg width={952} height={600} style={{position: "absolute", left: 0, top: 0, overflow: "visible"}}>
          <path d="M640 400 L740 520 L560 400 Z" fill={RK.paper} stroke={RK.ink} strokeWidth={5} strokeLinejoin="round" />
        </svg>
        <div style={{position: "relative", background: RK.paper, border: `5px solid ${RK.ink}`, borderRadius: 36, boxShadow: `10px 10px 0 ${RK.ink}`, padding: "30px 42px 36px", minHeight: 360, boxSizing: "border-box"}}>
          <div style={{display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontWeight: 700, fontSize: 27, letterSpacing: "0.12em", color: RK.red, marginBottom: 18}}>
            <svg width={44} height={32} viewBox="0 0 44 32">
              <rect x={2} y={2} width={40} height={28} rx={4} fill="none" stroke={RK.red} strokeWidth={4} />
              <path d="M4 5 L22 18 L40 5" fill="none" stroke={RK.red} strokeWidth={4} strokeLinejoin="round" />
            </svg>
            {L.kicker.toUpperCase()}
          </div>
          {L.lines.map((l, i) => {
            const shown = f >= lineAt[i] ? typed(f, lineAt[i], l.text) : "";
            const full = shown.length === l.text.length;
            return (
              <div key={i} style={{fontFamily: INTER, fontWeight: 800, fontSize: 57, lineHeight: 1.18, letterSpacing: "-0.03em", color: i === L.lines.length - 1 ? RK.blue : RK.ink, minHeight: 67, whiteSpace: "nowrap"}}>
                {full ? <MarkLine text={l.text} mark={l.mark} p={p01(f, lineAt[i] + l.text.length * 1.1, lineAt[i] + l.text.length * 1.1 + 14, EO)} /> : shown}
                {!full && shown ? <span style={{opacity: Math.floor(f / 6) % 2 ? 0 : 1}}>▍</span> : null}
              </div>
            );
          })}
        </div>
      </div>
      <AuraMascot
        scale={1.75}
        dpr={1.25}
        plan={{
          stays: [{at: 0, x: 800, y: 1505, face: -0.35}],
          gestures: [{at: 0.15, kind: "wave"}, {at: 4.3, kind: "nod"}],
          emotes: [{at: 1.5, kind: "surprised", dur: 1.3}, {at: 3.2, kind: "thinking", dur: 2.2}],
        }}
      />
      <NamePlate x={80} y={1250} name={L.host.name} role={L.host.role} at={Math.round(0.2 * fps)} ax={700} ay={1190} />
      <Sounds list={[[0.35, "@ding-2", 0.35], [0.85, "@typing-1", 0.22], [1.75, "@typing-1", 0.2], [2.75, "@typing-1", 0.2], [1.5, "@boing-1", 0.12]]} />
    </AbsoluteFill>
  );
};

// ===== 2. Карта Робокитая: линия поезда до края, печать =====
const MAP = {s0: 0.96, x0: 60, y0: 410, s1: 2.15, cx: 560, cy: 820};
const catmull = (pts: [number, number][], seg = 10): [number, number][] => {
  if (pts.length < 3) return pts;
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < seg; k++) {
      const t = k / seg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};
// точка на ломаной по доле длины + направление
const along = (pts: [number, number][], k: number) => {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let d = total * Math.min(1, Math.max(0, k));
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const u = seg[i] ? Math.min(1, d / seg[i]) : 0;
      const a = pts[i];
      const b = pts[i + 1];
      return {x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), total, upto: [...pts.slice(0, i + 1), [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u] as [number, number]]};
    }
    d -= seg[i];
  }
  return {x: pts[0][0], y: pts[0][1], ang: 0, total, upto: [pts[0]]};
};
const poly = (pts: [number, number][]) => pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join("");

// k — темп (1 — как в серии 1; 0,72 — короче, для драмы v2): все моменты сцены умножаются на k
export const MapBeat: React.FC<{P: RobokitaiProps; k?: number}> = ({P, k = 1}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = f / fps / k;
  const route = P.map.route.map((n) => CITY_XY[n]).filter(Boolean);
  const to = P.map.route[P.map.route.length - 1];
  const from = P.map.route[0];
  // фокус зума — середина маршрута
  const xs = route.map((q) => q[0]);
  const ys = route.map((q) => q[1]);
  const fx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const fy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const z = p01(sec, 0.8, 2.6, EIO);
  const s1 = P.map.zoom ?? MAP.s1;
  const s = MAP.s0 * Math.pow(s1 / MAP.s0, z);
  // масштаб — по логарифму, точка фокуса едет по прямой от своего места на общей карте к (cx, cy)
  const fsx = interpolate(z, [0, 1], [MAP.x0 + fx * MAP.s0, MAP.cx]);
  const fsy = interpolate(z, [0, 1], [MAP.y0 + fy * MAP.s0, MAP.cy]);
  const TX = fsx - fx * s;
  const TY = fsy - fy * s;
  const scr = (q: [number, number]): [number, number] => [TX + q[0] * s, TY + q[1] * s];
  const draw = p01(sec, 0, 0.9, EO);
  const fill = p01(sec, 0.3, 1.0);
  const lineK = p01(sec, 1.25, 2.85, EIO);
  const path = catmull(route.map(scr), 12);
  const head = along(path, lineK);
  const arrive = Math.round(2.9 * k * fps);
  const end = scr(CITY_XY[to]);
  const start = scr(CITY_XY[from]);
  const titleAt = Math.round(3.05 * k * fps);
  const ts = usePop(titleAt, 15);
  const shake = f >= arrive && f < arrive + 8 ? Math.sin((f - arrive) * 2.4) * (8 - (f - arrive)) : 0;
  return (
    <AbsoluteFill style={{translate: `${shake.toFixed(1)}px ${(shake * 0.6).toFixed(1)}px`}}>
      <Paper />
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
        <defs>
          <pattern id="rk-hatch" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={14} stroke="rgba(38,38,38,0.07)" strokeWidth={3} />
          </pattern>
        </defs>
        <g transform={`translate(${TX.toFixed(2)} ${TY.toFixed(2)}) scale(${s.toFixed(4)})`}>
          {CHINA_PATHS.map((d, i) => (
            <g key={i}>
              <path d={d} fill="#EDE7DC" opacity={fill} />
              <path d={d} fill="url(#rk-hatch)" opacity={fill} />
              <path d={d} fill="none" stroke={RK.ink} strokeWidth={4.5 / s} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            </g>
          ))}
        </g>
        {/* линия скоростного поезда: графит + пунктир по центру */}
        {lineK > 0 ? (
          <g>
            <path d={poly(head.upto)} fill="none" stroke={RK.ink} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
            <path d={poly(head.upto)} fill="none" stroke={RK.lemon} strokeWidth={5} strokeDasharray="14 12" strokeLinejoin="round" />
          </g>
        ) : null}
        {/* города */}
        {P.map.dots.map((n) => {
          const q = CITY_XY[n];
          if (!q) return null;
          const [x, y] = scr(q);
          const k = p01(sec, 0.5 + (q[1] / CHINA_H) * 0.4, 0.75 + (q[1] / CHINA_H) * 0.4, EO);
          const isTo = n === to && f >= arrive;
          return <circle key={n} cx={x} cy={y} r={(isTo ? 15 : 10) * k} fill={isTo ? RK.red : RK.paper} stroke={RK.ink} strokeWidth={5} />;
        })}
        {/* поезд — капсула по ходу линии */}
        {lineK > 0 && lineK < 1 ? (
          <g transform={`translate(${head.x.toFixed(1)} ${head.y.toFixed(1)}) rotate(${((head.ang * 180) / Math.PI).toFixed(1)}) scale(0.85)`}>
            {/* скоростной поезд сверху: головной вагон с носом-«пулей» и второй вагон */}
            <rect x={-118} y={-12} width={56} height={24} rx={8} fill={RK.paper} stroke={RK.ink} strokeWidth={4.5} />
            <rect x={-110} y={-4} width={40} height={8} rx={3} fill={RK.blue} />
            <rect x={-62} y={-4} width={8} height={8} fill={RK.ink} />
            <path d="M-54 -12 L4 -12 Q34 -12 46 0 Q34 12 4 12 L-54 12 Z" fill={RK.paper} stroke={RK.ink} strokeWidth={4.5} strokeLinejoin="round" />
            <rect x={-46} y={-4} width={38} height={8} rx={3} fill={RK.blue} />
            <path d="M8 -8 Q28 -8 36 0 L8 0 Z" fill={RK.ink} />
          </g>
        ) : null}
      </svg>
      {/* подписи начала и конца */}
      <div style={{position: "absolute", left: start[0] - 18 + (P.map.fromOff?.[0] ?? 0), top: start[1] - 74 + (P.map.fromOff?.[1] ?? 0), fontFamily: INTER, fontWeight: 800, fontSize: 40, color: RK.ink, opacity: p01(sec, 0.6, 1.0), whiteSpace: "nowrap", translate: "-50% 0"}}>{from}</div>
      <div style={{position: "absolute", left: end[0] - 30 + (P.map.toOff?.[0] ?? 0), top: end[1] + 22 + (P.map.toOff?.[1] ?? 0), fontFamily: INTER, fontWeight: 800, fontSize: 44, color: RK.red, opacity: p01(f, arrive, arrive + 8), whiteSpace: "nowrap", translate: "-100% 0"}}>{P.city.name}</div>
      <Seal ch={P.city.zh} size={150} at={arrive} x={end[0] + 112 + (P.map.sealOff?.[0] ?? 0)} y={end[1] - 92 + (P.map.sealOff?.[1] ?? 0)} rot={-7} id="city" />
      {/* титул серии */}
      {ts > 0 ? (
        <div style={{position: "absolute", left: 64, top: 1236, width: 952, boxSizing: "border-box", padding: "24px 40px 28px", background: RK.paper, border: `5px solid ${RK.ink}`, borderRadius: 34, boxShadow: `10px 10px 0 ${RK.ink}`, translate: `0 ${(1 - ts) * 90}px`, opacity: Math.min(1, ts * 1.5)}}>
          <div style={{fontFamily: MONO_CJK, fontWeight: 700, fontSize: 27, letterSpacing: "0.14em", color: RK.red}}>
            {P.map.kicker.toUpperCase()} · {P.series.zh}
          </div>
          <div style={{display: "flex", alignItems: "baseline", gap: 22, marginTop: 6}}>
            <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 100, letterSpacing: "-0.04em", lineHeight: 1.05, color: RK.ink}}>
              <Marked p={p01(f, titleAt + 8, titleAt + 24, EO)}>{P.city.name}</Marked>
            </span>
            <span style={{fontFamily: BRUSH_CJK, fontSize: 66, color: RK.red}}>{P.city.zhFull ?? P.city.zh}</span>
          </div>
          <div style={{fontFamily: INTER, fontWeight: 700, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1.15, color: RK.ink, marginTop: 4, whiteSpace: "nowrap"}}>{P.city.tagline}</div>
        </div>
      ) : null}
      <Sounds list={([[0.0, "@swipe-1", 0.35], [1.25, "@whoosh-2", 0.45], [1.6, "@sweep-1", 0.12], [2.9, "@stamp-1", 0.6], [3.05, "@pop-1", 0.3]] as Snd[]).map(([a, n, v]) => [a * k, n, v] as Snd)} />
    </AbsoluteFill>
  );
};

// ===== 6. Решение: флипчарт Ави — критерии, затем расчёт парка =====
const BOARD = {x: 64, y: 440, w: 760, h: 840};
const Check: React.FC<{draw: number}> = ({draw}) => (
  <svg width={70} height={70} viewBox="0 0 58 58" style={{flexShrink: 0, overflow: "visible"}}>
    <rect x={6} y={6} width={46} height={46} rx={7} fill={RK.paper} stroke={RK.ink} strokeWidth={4.5} />
    <path d="M10 34 C 18 30, 24 40, 30 44 C 38 30, 48 16, 60 6" fill="none" stroke={RK.lemon} strokeWidth={15} strokeLinecap="round" strokeDasharray={90} strokeDashoffset={90 * (1 - draw)} />
    <path d="M12 30 L26 44 L56 8" fill="none" stroke={RK.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={66} strokeDashoffset={66 * (1 - draw)} />
  </svg>
);
export const DecideBeat: React.FC<{P: RobokitaiProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const D = P.decide;
  const ticks = [0.8, 2.0, 3.2];
  const flipAt = Math.round(5.5 * fps);
  const flip = p01(f, flipAt, flipAt + 16, EIO);
  const F = D.formula;
  const rowAt = [6.15, 7.05].map((x) => Math.round(x * fps));
  const resAt = Math.round(8.0 * fps);
  const stampAt = Math.round(8.85 * fps);
  const num = Math.round(F.result * p01(f, resAt, resAt + 22, EO));
  const rs = usePop(resAt, 10);
  const board = (children: React.ReactNode, z = 0) => (
    <div style={{position: "absolute", left: 18, top: 18, width: BOARD.w - 36, height: BOARD.h - 36, background: RK.paper, borderRadius: 8, padding: "40px 44px", boxSizing: "border-box", backgroundImage: "linear-gradient(rgba(38,38,38,0.06) 2px, transparent 2px)", backgroundSize: "100% 64px", zIndex: z}}>
      {children}
    </div>
  );
  return (
    <AbsoluteFill>
      <Paper />
      {/* тренога */}
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
        <g stroke={RK.ink} strokeWidth={13} strokeLinecap="round">
          <line x1={BOARD.x + 170} y1={BOARD.y + BOARD.h - 20} x2={BOARD.x + 90} y2={1530} />
          <line x1={BOARD.x + BOARD.w - 170} y1={BOARD.y + BOARD.h - 20} x2={BOARD.x + BOARD.w - 90} y2={1530} />
          <line x1={BOARD.x + BOARD.w / 2} y1={BOARD.y + BOARD.h - 20} x2={BOARD.x + BOARD.w / 2} y2={1490} stroke="#3D3D3D" />
        </g>
      </svg>
      <div style={{position: "absolute", left: BOARD.x, top: BOARD.y, width: BOARD.w, height: BOARD.h, background: RK.ink, borderRadius: 16, boxShadow: `12px 12px 0 rgba(38,38,38,0.25)`}}>
        <div style={{position: "absolute", left: BOARD.w / 2 - 130, top: -22, width: 260, height: 40, background: "#111", borderRadius: 10, zIndex: 3}} />
        {/* лист 1: три критерия */}
        {flip < 1
          ? board(
              <>
                {D.criteria.map((c, i) => {
                  const at = Math.round(ticks[i] * fps);
                  const k = p01(f, at - 10, at, EO);
                  const draw = p01(f, at + 2, at + 12);
                  return (
                    <div key={i} style={{display: "flex", gap: 26, alignItems: "flex-start", marginBottom: 48, opacity: 0.18 + 0.82 * k, translate: `${(1 - k) * 30}px 0`}}>
                      <Check draw={draw} />
                      <div>
                        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 54, letterSpacing: "-0.03em", lineHeight: 1.1, color: RK.ink}}>{c.title}</div>
                        <div style={{fontFamily: INTER, fontWeight: 600, fontSize: 40, letterSpacing: "-0.01em", lineHeight: 1.25, color: RK.ink, marginTop: 6}}>
                          {c.text.includes("ISO") ? (
                            <>
                              {c.text.split("ISO")[0]}
                              <span style={{fontFamily: MONO, fontWeight: 700, color: RK.blue}}>ISO{c.text.split("ISO")[1]}</span>
                            </>
                          ) : (
                            c.text
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>,
              1,
            )
          : null}
        {/* лист 2: расчёт — перелистывается сверху */}
        {flip > 0 ? (
          <div style={{position: "absolute", inset: 0, perspective: 2200, zIndex: 2}}>
            <div style={{position: "absolute", inset: 0, transformOrigin: "50% 0%", transform: `rotateX(${(-110 * (1 - flip)).toFixed(1)}deg)`, opacity: flip > 0.02 ? 1 : 0}}>
              {board(
                <>
                  <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 56, letterSpacing: "-0.03em", color: RK.ink, marginBottom: 34}}>{F.title}</div>
                  {F.rows.map((row, ri) => {
                    const k = p01(f, rowAt[ri], rowAt[ri] + 10, EO);
                    return (
                      <div key={ri} style={{display: "flex", alignItems: "flex-start", gap: 22, marginBottom: 26, opacity: k, translate: `${(1 - k) * 40}px 0`}}>
                        {row.map((term, ti) => (
                          <div key={ti} style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
                            <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 84, letterSpacing: "-0.03em", lineHeight: 1, color: term.label ? RK.ink : RK.muted, whiteSpace: "nowrap"}}>{term.t}</div>
                            {term.label ? <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 23, color: RK.blue, marginTop: 10, whiteSpace: "nowrap"}}>{term.label}</div> : null}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div style={{height: 6, background: RK.ink, borderRadius: 3, width: "100%", margin: "18px 0 22px", scale: `${p01(f, resAt - 8, resAt + 4, EO)} 1`, transformOrigin: "0 50%"}} />
                  {rs > 0 ? (
                    <div style={{display: "flex", alignItems: "baseline", gap: 24, scale: String(0.7 + 0.3 * rs), transformOrigin: "0 70%"}}>
                      <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 92, color: RK.muted}}>=</span>
                      <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 176, letterSpacing: "-0.04em", lineHeight: 0.9, color: RK.ink}}>
                        <Marked p={p01(f, resAt + 6, resAt + 20, EO)}>{num}</Marked>
                      </span>
                      <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 70, letterSpacing: "-0.03em", color: RK.ink}}>{F.unit}</span>
                    </div>
                  ) : null}
                </>,
              )}
            </div>
          </div>
        ) : null}
      </div>
      {/* штамп «пример из статьи» */}
      {f >= stampAt ? (
        <div
          style={{
            position: "absolute",
            left: 430,
            top: 1150,
            zIndex: 10,
            padding: "10px 22px",
            border: `6px solid ${RK.red}`,
            borderRadius: 12,
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: "0.1em",
            color: RK.red,
            background: "rgba(248,246,243,0.92)",
            rotate: "-8deg",
            scale: String(2 - spring({frame: f - stampAt, fps, config: {damping: 13, stiffness: 260}})),
            opacity: interpolate(f, [stampAt, stampAt + 4], [0, 1], CL),
            whiteSpace: "nowrap",
          }}
        >
          {F.note.toUpperCase()}
        </div>
      ) : null}
      <div style={{position: "absolute", inset: 0, zIndex: 8}}>
      <AuraMascot
        scale={1.6}
        dpr={1.25}
        plan={{
          stays: [{at: 0, x: 935, y: 1530, face: -0.55}],
          gestures: [...ticks.map((t) => ({at: t - 0.15, kind: "tick" as const})), {at: 6.1, kind: "point"}, {at: 8.2, kind: "present"}],
          emotes: [{at: 5.6, kind: "thinking", dur: 2.2}, {at: 8.3, kind: "happy", dur: 2.4}],
        }}
      />
      </div>
      <Sounds
        list={[
          [0.0, "@swipe-1", 0.3],
          ...ticks.map((t) => [t + 0.05, "@click-1", 0.45] as Snd),
          ...ticks.map((t) => [t + 0.1, "@pop-1", 0.2] as Snd),
          [5.5, "@flip-1", 0.55],
          [6.15, "@pop-1", 0.25],
          [7.05, "@pop-1", 0.25],
          [8.0, "@ding-3", 0.3],
          [8.85, "@stamp-1", 0.55],
        ]}
      />
    </AbsoluteFill>
  );
};

// ===== 8. Дальше: ссылка на статью и анонс следующей серии =====
export const NextBeat: React.FC<{P: RobokitaiProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const N = P.next;
  const cta = usePop(Math.round(0.6 * fps), 14);
  const pill = usePop(Math.round(0.95 * fps), 12);
  const card = usePop(Math.round(1.8 * fps), 14);
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", left: 540 - 150, top: 395}}>
        <Sequence from={Math.round(0.15 * fps)} layout="none">
          <AuraBadge size={300} />
        </Sequence>
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 735, textAlign: "center", fontFamily: INTER, fontWeight: 800, fontSize: 60, letterSpacing: "-0.03em", color: RK.ink, opacity: Math.min(1, cta * 1.5), translate: `0 ${(1 - cta) * 30}px`}}>
        {N.cta}
      </div>
      <div style={{position: "absolute", left: 540, top: 830, translate: `-50% ${(1 - pill) * 30}px`, scale: String(0.8 + 0.2 * pill), opacity: Math.min(1, pill * 1.5), background: RK.ink, color: RK.paper, borderRadius: 999, padding: "22px 46px", fontFamily: INTER, fontWeight: 700, fontSize: 46, letterSpacing: "-0.01em", whiteSpace: "nowrap", boxShadow: `8px 8px 0 ${RK.lemon}, 8px 8px 0 4px ${RK.ink}`}}>
        {N.url}
      </div>
      {card > 0 ? (
        <div style={{position: "absolute", left: 64, top: 1010, width: 952, height: 500, boxSizing: "border-box", background: RK.paper, border: `5px solid ${RK.ink}`, borderRadius: 36, boxShadow: `10px 10px 0 ${RK.ink}`, overflow: "hidden", translate: `0 ${(1 - card) * 120}px`, opacity: Math.min(1, card * 1.5)}}>
          {/* силуэт следующего героя */}
          <div style={{position: "absolute", left: 0, top: 0, width: 380, height: 490, filter: `brightness(0) drop-shadow(8px 8px 0 ${RK.lemon})`}}>
            <Stage left={0} top={10} width={380} height={480} dpr={1} cam={{pos: [3.0, 2.2, 5.3], target: [0.5, 1.45, 0.15], fov: 36}}>
              <ArmModel
                skin="cobot"
                plan={{
                  keys: [
                    {at: 0, p: [0.45, 2.3, 0.55], tool: Math.PI * 0.6, grip: 0.4},
                    {at: 3.2, p: [0.95, 2.05, 0.75], tool: Math.PI * 0.55, grip: 0.3},
                    {at: 6.5, p: [0.5, 2.35, 0.5], tool: Math.PI * 0.6, grip: 0.4},
                  ],
                }}
              />
            </Stage>
          </div>
          <div style={{position: "absolute", left: 300, top: 300, fontFamily: INTER, fontWeight: 800, fontSize: 150, color: RK.lemon, WebkitTextStroke: `5px ${RK.ink}`, paintOrder: "stroke fill", opacity: p01(f, 3.2 * fps, 3.5 * fps), rotate: "8deg"}}>?</div>
          <div style={{position: "absolute", left: 400, top: 44, right: 30}}>
            <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 27, letterSpacing: "0.12em", color: RK.red}}>{N.kicker.toUpperCase()}</div>
            <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 84, letterSpacing: "-0.04em", lineHeight: 1.05, color: RK.ink, marginTop: 14}}>{N.city}</div>
            <div style={{fontFamily: INTER, fontWeight: 700, fontSize: 44, letterSpacing: "-0.02em", color: RK.ink, marginTop: 6}}>{N.tagline}</div>
          </div>
          <Seal ch={N.zh} size={104} at={Math.round(2.3 * fps)} x={835} y={170} rot={6} id="next" />
          <div style={{position: "absolute", left: 400, top: 380}}>
            <NamePlate x={0} y={0} name={N.hero} role={N.role} at={Math.round(2.8 * fps)} scale={0.95} />
          </div>
        </div>
      ) : null}
      <Sounds list={[[0.0, "@whoosh-2", 0.35], [0.2, "@stamp-1", 0.4], [0.95, "@pop-1", 0.3], [1.8, "@swipe-1", 0.35], [2.3, "@stamp-1", 0.45], [2.8, "@pop-1", 0.25], [3.2, "@boing-1", 0.12]]} />
    </AbsoluteFill>
  );
};
