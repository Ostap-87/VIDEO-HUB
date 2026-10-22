import React from "react";
import {AnimatedImage, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";

// Живые эмодзи поверх ролика (решение пользователя 22.10.2026: «вставлять смайлы»): анимированные Noto Emoji
// (Google, CC BY 4.0) из интернет-материалы/эмодзи/<название>.webp. Не на лицо: по умолчанию справа над головой.
// anim: pop — выскакивает с пружиной и покачивается; float — всплывает вверх и тает; shake — выскакивает и трясётся;
// burst — россыпь из 6 штук от точки во все стороны.
export type EmojiItem = {
  at: number;
  until: number;
  src: string;
  x?: number;
  y?: number;
  size?: number;
  anim?: "pop" | "float" | "shake" | "burst";
};

const url = (src: string) => (/^(https?:|blob:|data:)/.test(src) ? src : staticFile(src));
// в окне Монтажной без WebCodecs (старый Safari) — без анимации, просто картинка
const canAnimate = () => typeof window === "undefined" || "ImageDecoder" in window;

const Pic: React.FC<{src: string; size: number}> = ({src, size}) =>
  canAnimate() ? (
    <AnimatedImage src={url(src)} width={size} height={size} fit="contain" style={{width: size, height: size}} />
  ) : (
    <Img src={url(src)} style={{width: size, height: size, objectFit: "contain"}} />
  );

const One: React.FC<{e: EmojiItem}> = ({e}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const dur = Math.max(0.4, e.until - e.at);
  const size = e.size ?? 230;
  const x = e.x ?? 800;
  const y = e.y ?? 470;
  const anim = e.anim ?? "pop";
  const pop = spring({frame, fps, config: {damping: 9, stiffness: 160, mass: 0.7}});
  const out = interpolate(t, [dur - 0.25, dur], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  if (anim === "burst") {
    return (
      <>
        {Array.from({length: 6}, (_, i) => {
          const a = (i / 6) * Math.PI * 2 + 0.4;
          const k = interpolate(t, [0, Math.min(1.1, dur)], [0, 1], {extrapolateRight: "clamp"});
          const r = 60 + 300 * (1 - Math.pow(1 - k, 3));
          const s = size * (0.45 + 0.15 * (i % 3));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x + Math.cos(a) * r - s / 2,
                top: y + Math.sin(a) * r * 0.8 - s / 2 + 120 * k * k,
                opacity: Math.min(out, interpolate(t, [0, 0.08], [0, 1], {extrapolateRight: "clamp"})),
                scale: String(0.4 + 0.6 * pop),
                rotate: `${(i % 2 ? 1 : -1) * 18 * k}deg`,
              }}
            >
              <Pic src={e.src} size={s} />
            </div>
          );
        })}
      </>
    );
  }
  const rise = anim === "float" ? interpolate(t, [0, dur], [0, -260], {extrapolateRight: "clamp"}) : 0;
  const sway = anim === "float" ? Math.sin(t * 5) * 18 : 0;
  const rot = anim === "shake" ? Math.sin(t * 38) * 12 * interpolate(t, [0.15, 0.9], [1, 0.25], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}) : Math.sin(t * 6) * 5;
  const fade = anim === "float" ? Math.min(out, interpolate(t, [0, 0.15], [0, 1], {extrapolateRight: "clamp"})) : out;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2 + sway,
        top: y - size / 2 + rise,
        scale: String(anim === "float" ? 0.7 + 0.3 * pop : (0.2 + 0.8 * pop) * (0.6 + 0.4 * out)),
        rotate: `${rot}deg`,
        opacity: fade,
        filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.35))",
      }}
    >
      <Pic src={e.src} size={size} />
    </div>
  );
};

export const Emojis: React.FC<{items?: EmojiItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((e, i) => (
        <Sequence key={`emoji-${i}`} from={Math.round(e.at * fps)} durationInFrames={Math.max(1, Math.round((e.until - e.at) * fps))} layout="none">
          <One e={e} />
        </Sequence>
      ))}
    </>
  );
};
