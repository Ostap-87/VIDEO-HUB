// «Путь» — моушн-схема из шагов (решение пользователя 29.10.2026 по ролику Alibaba: «картинку где написано Путь сделай
// интерактивной и красивой, а не как сейчас… примени моушн-дизайн»). Светлая стеклянная карточка в верхней части кадра,
// три (до четырёх) узла зигзагом: иконка в объёмном синем «чипе» + заголовок и подпись. Узлы выскакивают на своих словах,
// между ними рисуется изогнутая дорога, по ней бежит светящаяся точка; пройденный узел получает зелёную галочку.
// Обычно вместе с `speaker` (вырезка по контуру внизу): спикер уменьшен под карточкой. Поле props — `paths`.
import React from "react";
import {AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {useBrand} from "../brand";

export type PathIcon = "model" | "channels" | "platform" | "tech" | "people" | "star";
// arrow — вместо светящейся точки по дороге бежит стрелка (Ping An 29.10.2026: «как от одного пункта к другому движется
// интерактивная стрелка»)
export type PathItem = {at: number; until: number; title?: string; kicker?: string; top?: number; arrow?: boolean; items: {text: string; sub?: string; at: number; icon?: PathIcon}[]};

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const INK = "#0E1A33";
const MUTED = "#5B6B88";
const GREEN = "#16A34A";

// простые свои иконки (линии белым): бизнес-модель — блоки, омниканальность — узел с лучами, платформа — слои
const Icon: React.FC<{kind: PathIcon; p: number}> = ({kind, p}) => {
  const s = {fill: "none", stroke: "#FFFFFF", strokeWidth: 7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const};
  const draw = (len: number) => ({strokeDasharray: len, strokeDashoffset: len * (1 - p)});
  if (kind === "model")
    return (
      <svg width={96} height={96} viewBox="0 0 96 96">
        <rect x={14} y={14} width={30} height={30} rx={7} {...s} style={draw(120)} />
        <rect x={52} y={14} width={30} height={30} rx={7} {...s} style={draw(120)} />
        <rect x={14} y={52} width={30} height={30} rx={7} {...s} style={draw(120)} />
        <rect x={52} y={52} width={30} height={30} rx={15} fill="#FFFFFF" opacity={p} />
      </svg>
    );
  if (kind === "channels")
    return (
      <svg width={96} height={96} viewBox="0 0 96 96">
        {[
          [48, 12],
          [84, 48],
          [48, 84],
          [12, 48],
        ].map(([x, y], i) => (
          <React.Fragment key={i}>
            <line x1={48} y1={48} x2={x} y2={y} {...s} strokeWidth={5} style={draw(40)} />
            <circle cx={x} cy={y} r={8} fill="#FFFFFF" opacity={p} />
          </React.Fragment>
        ))}
        <circle cx={48} cy={48} r={13} fill="#FFFFFF" />
      </svg>
    );
  if (kind === "platform")
    return (
      <svg width={96} height={96} viewBox="0 0 96 96">
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M48 ${16 + i * 20} L84 ${32 + i * 20} L48 ${48 + i * 20} L12 ${32 + i * 20} Z`} {...s} strokeWidth={6} fill={i === 0 ? "#FFFFFF" : "none"} fillOpacity={0.9 * p} style={draw(160)} />
        ))}
      </svg>
    );
  if (kind === "tech")
    return (
      <svg width={96} height={96} viewBox="0 0 96 96">
        <rect x={26} y={26} width={44} height={44} rx={8} {...s} style={draw(180)} />
        {[34, 48, 62].map((v) => (
          <React.Fragment key={v}>
            <line x1={v} y1={10} x2={v} y2={22} {...s} strokeWidth={5} />
            <line x1={v} y1={74} x2={v} y2={86} {...s} strokeWidth={5} />
            <line x1={10} y1={v} x2={22} y2={v} {...s} strokeWidth={5} />
            <line x1={74} y1={v} x2={86} y2={v} {...s} strokeWidth={5} />
          </React.Fragment>
        ))}
      </svg>
    );
  if (kind === "people")
    return (
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={32} r={14} {...s} style={draw(90)} />
        <path d="M18 84 C20 62 34 54 48 54 C62 54 76 62 78 84" {...s} style={draw(120)} />
      </svg>
    );
  return (
    <svg width={96} height={96} viewBox="0 0 96 96">
      <path d="M48 10 C52 36 60 44 86 48 C60 52 52 60 48 86 C44 60 36 52 10 48 C36 44 44 36 48 10 Z" fill="#FFFFFF" opacity={p} />
    </svg>
  );
};

// кубическая кривая Безье: точка и её доля длины (для бегущей точки)
type P = [number, number];
const bez = (a: P, b: P, c: P, d: P, u: number): P => {
  const m = 1 - u;
  return [m * m * m * a[0] + 3 * m * m * u * b[0] + 3 * m * u * u * c[0] + u * u * u * d[0], m * m * m * a[1] + 3 * m * m * u * b[1] + 3 * m * u * u * c[1] + u * u * u * d[1]];
};

const CARD = {x: 56, w: 968};

const PathOne: React.FC<{it: PathItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps; // от начала слоя
  const dur = it.until - it.at;
  const top = it.top ?? 270;
  const n = Math.min(4, it.items.length);
  const rowGap = n <= 3 ? 250 : 190;
  const headH = it.title ? 150 : 40;
  const h = headH + rowGap * (n - 1) + 240;
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 120}});
  const out = interpolate(t, [dur - 0.4, dur], [1, 0], {...clamp, easing: ease});
  const accent = B.accent;
  // узлы зигзагом: нечётные слева, чётные справа
  const nodes = it.items.slice(0, n).map((x, i) => {
    const left = i % 2 === 0;
    return {...x, left, cx: left ? 150 : CARD.w - 150, cy: headH + 110 + i * rowGap, rel: x.at - it.at};
  });
  const segs = nodes.slice(1).map((b, i) => {
    const a = nodes[i];
    const A: P = [a.cx, a.cy + 78];
    const D: P = [b.cx, b.cy - 78];
    const mid = (A[1] + D[1]) / 2;
    return {A, B1: [a.cx, mid + 20] as P, C1: [b.cx, mid - 20] as P, D, from: a.rel + 0.25, to: Math.max(a.rel + 0.6, b.rel)};
  });
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div
        style={{
          position: "absolute",
          left: CARD.x,
          top,
          width: CARD.w,
          height: h,
          borderRadius: B.square ? 0 : 46,
          background: "linear-gradient(160deg, rgba(255,255,255,0.97) 0%, rgba(240,246,255,0.95) 60%, rgba(228,238,255,0.94) 100%)",
          border: "2px solid rgba(37,99,235,0.18)",
          boxShadow: "0 40px 90px rgba(5,12,30,0.45), inset 0 2px 0 rgba(255,255,255,0.9)",
          overflow: "hidden",
          transformOrigin: "50% 0%",
          scale: String(0.9 + 0.1 * enter),
          translate: `0px ${(1 - enter) * 60}px`,
          rotate: `x ${(1 - enter) * 14}deg`,
        }}
      >
        {/* тонкая сетка точек на карточке */}
        <AbsoluteFill style={{backgroundImage: "radial-gradient(rgba(37,99,235,0.13) 2px, transparent 2.4px)", backgroundSize: "34px 34px", opacity: 0.8}} />
        {it.title ? (
          <div style={{position: "absolute", left: 56, top: 42}}>
            {it.kicker ? (
              <div style={{fontFamily: B.monoFont, fontSize: 26, letterSpacing: "0.16em", color: accent, textTransform: "uppercase", opacity: interpolate(t, [0.1, 0.4], [0, 1], clamp)}}>{it.kicker}</div>
            ) : null}
            <div style={{fontFamily: B.captionFont, fontWeight: 800, fontSize: Math.min(64, 840 / (Math.max(1, it.title.length) * 0.8)), lineHeight: 1.05, color: INK, textTransform: "uppercase", whiteSpace: "nowrap", marginTop: 6, clipPath: `inset(-20% ${100 - interpolate(t, [0.15, 0.6], [0, 100], {...clamp, easing: ease})}% -20% 0)`}}>
              {it.title}
            </div>
          </div>
        ) : null}
        {/* дорога между узлами: пунктир-основа, поверх — синяя линия рисуется к следующему слову; по ней бежит точка */}
        <svg width={CARD.w} height={h} style={{position: "absolute", inset: 0}}>
          <defs>
            <linearGradient id="mp-road" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={accent} />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>
          {segs.map((s, i) => {
            const d = `M${s.A[0]},${s.A[1]} C${s.B1[0]},${s.B1[1]} ${s.C1[0]},${s.C1[1]} ${s.D[0]},${s.D[1]}`;
            const u = interpolate(t, [s.from, s.to], [0, 1], {...clamp, easing: Easing.bezier(0.45, 0, 0.25, 1)});
            return (
              <g key={i}>
                <path d={d} fill="none" stroke="rgba(37,99,235,0.18)" strokeWidth={10} strokeDasharray="2 22" strokeLinecap="round" />
                <path d={d} fill="none" stroke="url(#mp-road)" strokeWidth={12} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - u} style={{filter: "drop-shadow(0 6px 10px rgba(37,99,235,0.35))"}} />
              </g>
            );
          })}
        </svg>
        {segs.map((s, i) => {
          const u = interpolate(t, [s.from, s.to], [0, 1], {...clamp, easing: Easing.bezier(0.45, 0, 0.25, 1)});
          if (u <= 0 || u >= 1) return null;
          const [x, y] = bez(s.A, s.B1, s.C1, s.D, u);
          if (it.arrow) {
            const [x2, y2] = bez(s.A, s.B1, s.C1, s.D, Math.min(1, u + 0.02));
            const ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
            return (
              <React.Fragment key={`dot-${i}`}>
                <div style={{position: "absolute", left: x - 40, top: y - 40, width: 80, height: 80, borderRadius: 40, background: "radial-gradient(circle, rgba(56,189,248,0.55) 0%, rgba(56,189,248,0) 70%)"}} />
                <svg width={84} height={84} viewBox="-42 -42 84 84" style={{position: "absolute", left: x - 42, top: y - 42, rotate: `${ang}deg`, filter: "drop-shadow(0 0 10px rgba(56,189,248,0.9))"}}>
                  <polygon points="30,0 -18,-22 -8,0 -18,22" fill="#FFFFFF" stroke={accent} strokeWidth={6} strokeLinejoin="round" />
                </svg>
              </React.Fragment>
            );
          }
          return (
            <React.Fragment key={`dot-${i}`}>
              <div style={{position: "absolute", left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: 30, background: "radial-gradient(circle, rgba(56,189,248,0.55) 0%, rgba(56,189,248,0) 70%)"}} />
              <div style={{position: "absolute", left: x - 12, top: y - 12, width: 24, height: 24, borderRadius: 12, background: "#FFFFFF", border: `6px solid ${accent}`, boxShadow: "0 0 18px rgba(56,189,248,0.9)"}} />
            </React.Fragment>
          );
        })}
        {nodes.map((nd, i) => {
          const k = spring({frame: frame - Math.round(nd.rel * fps), fps, config: {damping: 11, stiffness: 150}});
          const draw = interpolate(t, [nd.rel + 0.1, nd.rel + 0.7], [0, 1], {...clamp, easing: ease});
          const passed = i < n - 1 ? interpolate(t, [segs[i].to, segs[i].to + 0.25], [0, 1], clamp) : interpolate(t, [nd.rel + 1.0, nd.rel + 1.3], [0, 1], clamp);
          const active = t >= nd.rel && passed < 1;
          const pulse = active ? 0.5 + 0.5 * Math.sin((t - nd.rel) * 6) : 0;
          const textK = interpolate(t, [nd.rel + 0.12, nd.rel + 0.55], [0, 1], {...clamp, easing: ease});
          const textLeft = nd.left ? nd.cx + 106 : 56;
          const textRight = nd.left ? 40 : CARD.w - nd.cx + 106;
          return (
            <React.Fragment key={i}>
              {/* узел: объёмный синий чип с иконкой */}
              <div
                style={{
                  position: "absolute",
                  left: nd.cx - 78,
                  top: nd.cy - 78,
                  width: 156,
                  height: 156,
                  borderRadius: B.square ? 0 : 42,
                  background: `linear-gradient(145deg, #4F8BFF 0%, ${accent} 55%, #1D3FB8 100%)`,
                  boxShadow: `0 ${18 + pulse * 6}px ${36 + pulse * 20}px rgba(37,99,235,${0.45 + 0.25 * pulse}), inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -6px 0 rgba(0,0,40,0.25)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  scale: String(Math.max(0, k)),
                  rotate: `${(1 - k) * (nd.left ? -25 : 25)}deg`,
                }}
              >
                <Icon kind={nd.icon ?? (["model", "channels", "platform", "star"][i] as PathIcon)} p={draw} />
                <div style={{position: "absolute", right: -12, top: -12, width: 50, height: 50, borderRadius: 25, background: GREEN, border: "5px solid #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", scale: String(passed), boxShadow: "0 6px 14px rgba(0,0,0,0.25)"}}>
                  <svg width={26} height={26} viewBox="0 0 26 26">
                    <path d="M5 13 L11 19 L21 7" fill="none" stroke="#FFF" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {active ? <div style={{position: "absolute", inset: -14 - pulse * 10, borderRadius: B.square ? 0 : 54, border: `4px solid rgba(56,189,248,${0.6 - 0.4 * pulse})`}} /> : null}
              </div>
              {/* подпись узла */}
              <div style={{position: "absolute", left: textLeft, right: textRight, top: nd.cy - 70, height: 140, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: nd.left ? "flex-start" : "flex-end", textAlign: nd.left ? "left" : "right", opacity: textK, translate: `${(1 - textK) * (nd.left ? 50 : -50)}px 0px`}}>
                <div style={{fontFamily: B.monoFont, fontSize: 24, letterSpacing: "0.14em", color: accent, fontWeight: 600}}>{String(i + 1).padStart(2, "0")}</div>
                <div style={{fontFamily: B.captionFont, fontWeight: 800, fontSize: nd.text.length > 13 ? 46 : 56, lineHeight: 1.02, color: INK, textTransform: "uppercase"}}>{nd.text}</div>
                {nd.sub ? <div style={{fontFamily: B.bodyFont, fontWeight: 600, fontSize: 32, color: MUTED, marginTop: 6}}>{nd.sub}</div> : null}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const MotionPaths: React.FC<{items?: PathItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`path-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} premountFor={fps} name="Путь">
          <PathOne it={it} />
        </Sequence>
      ))}
    </>
  );
};

// щелчок на каждом узле
export const pathSounds = (items?: PathItem[]) => (items ?? []).flatMap((it) => it.items.map((x) => x.at));
