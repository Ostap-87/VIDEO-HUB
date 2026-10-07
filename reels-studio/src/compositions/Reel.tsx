import React from "react";
import {AbsoluteFill, Sequence, useVideoConfig} from "remotion";
import {z} from "zod";
import {theme} from "../theme";
import {Captions} from "../components/Captions";
import {Cta} from "../components/Cta";
import {Frame} from "../components/Frame";
import {Hook} from "../components/Hook";
import {Media} from "../components/Media";
import {SafeZone} from "../components/SafeZone";

export const reelSchema = z.object({
  mediaSrc: z.string(), // путь от корня репозитория (source-videos/...): видео (mp4, mov) или фото. Пусто = нейтральный фон
  tone: z.enum(["light", "dark"]), // цвет плашки сайта под фон
  counter: z.string(), // например "1 / 3". Пусто = скрыть
  kicker: z.string(),
  hook: z.string(), // **слова** будут синими
  hookSub: z.string(),
  hookSeconds: z.number().min(1).max(8),
  ctaTitle: z.string(),
  cta: z.string(),
  ctaSeconds: z.number().min(1).max(8),
  durationInSeconds: z.number().min(3).max(90),
  words: z.array(z.object({text: z.string(), start: z.number(), end: z.number()})),
  showSafeZone: z.boolean(),
});
export type ReelProps = z.infer<typeof reelSchema>;

export const Reel: React.FC<ReelProps> = (p) => {
  const {fps, durationInFrames} = useVideoConfig();
  const hookFrames = Math.round(p.hookSeconds * fps);
  const ctaFrames = Math.round(p.ctaSeconds * fps);
  const total = durationInFrames / fps;

  return (
    <AbsoluteFill style={{backgroundColor: theme.colors.primary}}>
      <Frame media={<Media src={p.mediaSrc} />} tone={p.tone} counter={p.counter}>
        <Sequence durationInFrames={hookFrames}>
          <Hook kicker={p.kicker} text={p.hook} sub={p.hookSub} seconds={p.hookSeconds} />
        </Sequence>

        <Captions words={p.words} from={p.hookSeconds} until={total - p.ctaSeconds} />

        <Sequence from={durationInFrames - ctaFrames}>
          <Cta title={p.ctaTitle} text={p.cta} />
        </Sequence>
      </Frame>
      {p.showSafeZone ? <SafeZone /> : null}
    </AbsoluteFill>
  );
};
