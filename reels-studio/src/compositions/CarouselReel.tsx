// Reels из карусели (решение пользователя 12.10.2026: «сразу публиковать карусель в Рилс») — к карусели можно поставить
// музыку только так: API Instagram не добавляет музыку к каруселям. 1080×1920, 30 fps.
// Слайды — PNG видео-версии карусели (`video: true`, без стрелки «листай»), их рендерит scripts/carousel_reel.py.
// Слайд 4:5 шириной 952 px (поля 64 px) лежит в безопасной зоне Reels (сверху 250, снизу 380) и целиком в кадре ленты 4:5
// (y 285–1635). Смена слайдов — «пролистывание» влево, как в карусели: слайд чуть отъезжает назад и возвращается, тихий «вжух».
// Первый кадр — первый слайд целиком: он же обложка Reels.
import React from "react";
import {AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {STYLES} from "./carousel/kit";

export const carouselReelSchema = z.object({
  brand: z.enum(["gtt", "aura"]),
  slides: z.array(z.object({src: z.string(), seconds: z.number()})), // PNG 1080×1350 (путь от корня репозитория) и сколько секунд на экране
  music: z.object({src: z.string(), volume: z.number(), fadeOut: z.number().optional()}).optional(),
  swipeSfx: z.string().optional(), // звук пролистывания (whoosh из @remotion/sfx)
  guides: z.boolean().optional(), // показать безопасную зону Reels и кадр ленты 4:5
});
export type CarouselReelProps = z.infer<typeof carouselReelSchema>;

export const REEL_CARD = {w: 952, h: 1190, top: 300, gap: 96}; // gap: соседний слайд целиком за кадром, без полоски у края
const SWIPE = 0.5; // секунд на пролистывание (последние 0,5 с слайда)

export const reelSeconds = (p: CarouselReelProps) => p.slides.reduce((a, s) => a + s.seconds, 0);

export const CarouselReel: React.FC<CarouselReelProps> = ({brand, slides, music, swipeSfx, guides}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width} = useVideoConfig();
  const s = STYLES[brand];
  const t = frame / fps;
  // начало каждого слайда; пролистывание k → k+1 идёт в последние SWIPE секунд слайда k
  const starts = slides.reduce<number[]>((a, sl, i) => [...a, i === 0 ? 0 : a[i - 1] + slides[i - 1].seconds], []);
  const swipes = starts.slice(1);
  let pos = 0;
  let lift = 0;
  swipes.forEach((end) => {
    const k = interpolate(t, [end - SWIPE, end], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1)});
    pos += k;
    lift = Math.max(lift, Math.sin(Math.PI * k));
  });
  const step = REEL_CARD.w + REEL_CARD.gap;
  const left = (width - REEL_CARD.w) / 2;
  return (
    <AbsoluteFill style={s.bg}>
      <AbsoluteFill style={s.pattern} />
      {slides.map((sl, i) =>
        Math.abs(i - pos) < 1.5 ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left + (i - pos) * step,
              top: REEL_CARD.top,
              width: REEL_CARD.w,
              height: REEL_CARD.h,
              borderRadius: s.marker ? 18 : 28,
              overflow: "hidden",
              border: s.marker ? "2px solid #D9D7D5" : "2px solid rgba(255,255,255,0.16)",
              boxShadow: s.marker ? "0 24px 60px rgba(38,38,38,0.16)" : "0 30px 70px rgba(0,0,0,0.35)",
              scale: String(1 - 0.045 * lift),
            }}
          >
            <Img src={staticFile(sl.src)} style={{width: "100%", height: "100%", display: "block"}} />
          </div>
        ) : null,
      )}
      {music ? (
        <Audio
          src={staticFile(music.src)}
          volume={(f) =>
            interpolate(f, [0, 0.25 * fps, durationInFrames - (music.fadeOut ?? 1.6) * fps, durationInFrames - 1], [0, music.volume, music.volume, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
      {swipeSfx
        ? swipes.map((end, i) => (
            <Sequence key={i} from={Math.round((end - SWIPE - 0.05) * fps)} durationInFrames={fps} premountFor={fps}>
              <Audio src={staticFile(swipeSfx)} volume={0.28} />
            </Sequence>
          ))
        : null}
      {guides ? (
        <>
          <div style={{position: "absolute", left: 0, right: 0, top: 0, height: 250, background: "rgba(255,0,120,0.25)"}} />
          <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 380, background: "rgba(255,0,120,0.25)"}} />
          <div style={{position: "absolute", left: 0, right: 0, top: 285, height: 1350, border: "4px dashed #00B4FF"}} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
