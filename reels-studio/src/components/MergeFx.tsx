// «Собрать воедино» — три понятия сходятся в одно (решение пользователя 29.10.2026 по ролику Haier: «интерактивно показать
// визуал соединение этих трёх принципов и как они собираются воедино через пункты: Жэнь 人 — сотрудник, Дань 单 — заказ,
// Хэи 合一 — объединение в одно целое»). Светлая стеклянная карточка сверху, как у «Пути»: на своих словах выскакивают три
// объёмных синих круга с иероглифом и подписью, между ними — «+», в момент `result.at` круги съезжаются к центру и сливаются
// в один большой светящийся круг с итогом. Обычно вместе с `speaker` (вырезка по контуру внизу). Поле props — `merges`.
import React from "react";
import {AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {useBrand} from "../brand";
import {BRUSH, useBrush} from "./MontazhFx";

export type MergeItem = {
  at: number;
  until: number;
  top?: number;
  kicker?: string;
  title?: string;
  items: {glyph: string; text: string; at: number}[];
  result: {glyph: string; text: string; at: number};
};

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const INK = "#0E1A33";
const W = 968;
const X = 56;

const MergeOne: React.FC<{it: MergeItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  useBrush(true);
  const t = frame / fps;
  const dur = it.until - it.at;
  const top = it.top ?? 262;
  const headH = it.title ? 150 : 40;
  const H = headH + 470;
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 120}});
  const out = interpolate(t, [dur - 0.4, dur], [1, 0], {...clamp, easing: ease});
  const accent = B.accent;
  const n = Math.min(3, it.items.length);
  const cy = headH + 170;
  const xs = n === 3 ? [175, W / 2, W - 175] : [W / 2 - 180, W / 2 + 180];
  const mRel = it.result.at - it.at;
  // слияние: круги едут к центру, уменьшаются и гаснут; большой круг вырастает с перелётом
  const m = interpolate(t, [mRel - 0.1, mRel + 0.5], [0, 1], {...clamp, easing: Easing.bezier(0.6, 0, 0.3, 1)});
  const big = spring({frame: frame - Math.round(mRel * fps), fps, config: {damping: 11, stiffness: 140}});
  const glow = t > mRel ? 0.5 + 0.5 * Math.sin((t - mRel) * 5) : 0;
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div
        style={{
          position: "absolute",
          left: X,
          top,
          width: W,
          height: H,
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
        <AbsoluteFill style={{backgroundImage: "radial-gradient(rgba(37,99,235,0.13) 2px, transparent 2.4px)", backgroundSize: "34px 34px", opacity: 0.8}} />
        {it.title ? (
          <div style={{position: "absolute", left: 56, top: 42}}>
            {it.kicker ? <div style={{fontFamily: B.monoFont, fontSize: 26, letterSpacing: "0.16em", color: accent, textTransform: "uppercase"}}>{it.kicker}</div> : null}
            <div style={{fontFamily: B.captionFont, fontWeight: 800, fontSize: Math.min(64, 840 / (Math.max(1, it.title.length) * 0.95)), lineHeight: 1.05, color: INK, textTransform: "uppercase", whiteSpace: "nowrap", marginTop: 6, clipPath: `inset(-20% ${100 - interpolate(t, [0.15, 0.6], [0, 100], {...clamp, easing: ease})}% -20% 0)`}}>
              {it.title}
            </div>
          </div>
        ) : null}
        {/* «+» между кругами */}
        {xs.slice(0, n - 1).map((x, i) => {
          const k = interpolate(t, [it.items[i + 1].at - it.at - 0.15, it.items[i + 1].at - it.at + 0.2], [0, 1], clamp) * (1 - m);
          return (
            <div key={`p${i}`} style={{position: "absolute", left: (x + xs[i + 1]) / 2 - 30, top: cy - 34, width: 60, height: 60, fontFamily: B.captionFont, fontWeight: 800, fontSize: 64, lineHeight: "60px", textAlign: "center", color: accent, opacity: k, scale: String(0.5 + 0.5 * k)}}>
              +
            </div>
          );
        })}
        {it.items.slice(0, n).map((x, i) => {
          const rel = x.at - it.at;
          const k = spring({frame: frame - Math.round(rel * fps), fps, config: {damping: 11, stiffness: 150}});
          const cx = xs[i] + (W / 2 - xs[i]) * m;
          const s = Math.max(0, k) * (1 - 0.5 * m);
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: "absolute",
                  left: cx - 95,
                  top: cy - 95,
                  width: 190,
                  height: 190,
                  borderRadius: B.square ? 0 : 95,
                  background: `radial-gradient(circle at 32% 28%, #8DB4FF 0%, #4F8BFF 30%, ${accent} 62%, #1D3FB8 100%)`,
                  boxShadow: "0 22px 44px rgba(37,99,235,0.45), inset 0 4px 0 rgba(255,255,255,0.45), inset 0 -8px 0 rgba(0,0,40,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  scale: String(s),
                  opacity: 1 - m,
                  rotate: `${(1 - k) * 30}deg`,
                  fontFamily: `"${BRUSH}", "Noto Serif SC", serif`,
                  fontSize: x.glyph.length > 1 ? 70 : 104,
                  whiteSpace: "nowrap",
                  color: "#FFFFFF",
                  textShadow: "0 4px 0 rgba(10,20,60,0.35)",
                }}
              >
                {x.glyph}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: cx - 150,
                  width: 300,
                  top: cy + 118,
                  textAlign: "center",
                  fontFamily: B.captionFont,
                  fontWeight: 800,
                  fontSize: x.text.length > 12 ? 30 : 36,
                  lineHeight: 1.08,
                  color: INK,
                  textTransform: "uppercase",
                  opacity: interpolate(t, [rel + 0.1, rel + 0.45], [0, 1], clamp) * (1 - m),
                }}
              >
                {x.text}
              </div>
            </React.Fragment>
          );
        })}
        {/* итог: один большой круг */}
        <div
          style={{
            position: "absolute",
            left: W / 2 - 150,
            top: cy - 150,
            width: 300,
            height: 300,
            borderRadius: B.square ? 0 : 150,
            background: `radial-gradient(circle at 32% 28%, #A5C6FF 0%, #4F8BFF 30%, ${accent} 60%, #142F96 100%)`,
            boxShadow: `0 0 ${40 + glow * 40}px rgba(56,189,248,${0.55 + 0.3 * glow}), 0 26px 50px rgba(37,99,235,0.5), inset 0 5px 0 rgba(255,255,255,0.45)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            scale: String(Math.max(0, big)),
            fontFamily: `"${BRUSH}", "Noto Serif SC", serif`,
            fontSize: Math.min(130, 250 / Math.max(1, it.result.glyph.length)),
            whiteSpace: "nowrap",
            color: "#FFFFFF",
            textShadow: "0 5px 0 rgba(10,20,60,0.35)",
          }}
        >
          {it.result.glyph}
          <div style={{position: "absolute", inset: -18 - glow * 14, borderRadius: B.square ? 0 : 170, border: `4px solid rgba(56,189,248,${0.55 - 0.35 * glow})`}} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: cy + 170,
            textAlign: "center",
            fontFamily: B.captionFont,
            fontWeight: 800,
            fontSize: 44,
            color: INK,
            textTransform: "uppercase",
            opacity: interpolate(t, [mRel + 0.25, mRel + 0.6], [0, 1], clamp),
            translate: `0px ${(1 - interpolate(t, [mRel + 0.25, mRel + 0.6], [0, 1], {...clamp, easing: ease})) * 24}px`,
          }}
        >
          {it.result.text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Merges: React.FC<{items?: MergeItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`merge-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} premountFor={fps} name="Собрать воедино">
          <MergeOne it={it} />
        </Sequence>
      ))}
    </>
  );
};

// щелчок на каждом круге, «вжух» на слиянии
export const mergeSounds = (items?: MergeItem[]): {at: number; kind: "click" | "whoosh"}[] =>
  (items ?? []).flatMap((it) => [...it.items.map((x) => ({at: x.at, kind: "click" as const})), {at: it.result.at, kind: "whoosh" as const}]);
