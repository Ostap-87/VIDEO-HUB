import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {theme} from "../theme";
import {Captions} from "../components/Captions";
import {Cta} from "../components/Cta";
import {Frame} from "../components/Frame";
import {Hook} from "../components/Hook";
import {SafeZone} from "../components/SafeZone";

// «Говорящая голова» после npm run cut: склеенное видео без пауз, субтитры,
// наезды экрана сверху/снизу на смене темы и финальная сцена с сайтом.
export const talkReelSchema = z.object({
  mediaSrc: z.string(), // склеенное видео из source-videos/…/_work/имя.cut.mp4 (звук берётся из него же)
  tone: z.enum(["light", "dark"]),
  kicker: z.string(),
  hook: z.string(), // **слова** будут синими
  hookSub: z.string(),
  hookSeconds: z.number().min(1).max(8),
  words: z.array(z.object({text: z.string(), start: z.number(), end: z.number()})),
  // Наезды экрана: в момент at (секунды) новый «экран» въезжает сверху или снизу
  slides: z.array(z.object({at: z.number(), from: z.enum(["top", "bottom"])})),
  slideSfx: z.string(), // звук наезда из source-videos/, пусто = без звука
  speechSeconds: z.number(), // длина склеенного видео
  site: z.object({
    src: z.string(), // скриншот сайта во всю высоту, из source-videos/
    at: z.number(), // когда сайт въезжает (обычно на словах «заходите на сайт»)
  }),
  ctaTitle: z.string(),
  cta: z.string(),
  ctaSeconds: z.number().min(1).max(8),
  showSafeZone: z.boolean(),
});
export type TalkReelProps = z.infer<typeof talkReelSchema>;

const SLIDE_FRAMES = 14;

// Один «экран»: кусок того же видео, въезжающий сверху или снизу.
// Время видео совпадает со временем ролика, поэтому звук и губы не расходятся.
const Screen: React.FC<{from: "top" | "bottom" | null; children: React.ReactNode}> = ({from, children}) => {
  const frame = useCurrentFrame();
  const p = from
    ? interpolate(frame, [0, SLIDE_FRAMES], [1, 0], {
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    : 0;
  const dir = from === "top" ? -1 : 1;
  return (
    <AbsoluteFill
      style={{
        transform: `translateY(${dir * p * 100}%)`,
        boxShadow: p > 0 ? "0 0 60px rgba(23,23,29,0.25)" : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Сайт в карточке: плавно прокручивается сверху вниз.
const SiteScroll: React.FC<{src: string; seconds: number}> = ({src, seconds}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cardW = 1080 - theme.frame.x * 2;
  const cardH = 1920 - theme.frame.top - theme.frame.bottom;
  const imgH = (cardW / 1075) * 3008; // пропорции скриншота
  const range = Math.max(0, imgH - cardH);
  const y = interpolate(frame, [fps * 0.8, fps * Math.max(1.5, seconds - 1)], [0, range * 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{background: theme.colors.surface}}>
      {/* отступ сверху, чтобы плашка сайта не закрывала шапку страницы */}
      <Img src={staticFile(src)} style={{width: "100%", marginTop: 110, transform: `translateY(${-y}px)`}} />
    </AbsoluteFill>
  );
};

export const TalkReel: React.FC<TalkReelProps> = (p) => {
  const {fps, durationInFrames} = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const cuts = [0, ...p.slides.map((s) => s.at)].map(f);
  const siteFrom = f(p.site.at);
  const ctaFrames = f(p.ctaSeconds);

  const media = (
    <AbsoluteFill>
      {cuts.map((start, i) => {
        if (start >= siteFrom) return null;
        const end = Math.min(i + 1 < cuts.length ? cuts[i + 1] : siteFrom, siteFrom);
        return (
          // Кусок живёт на SLIDE_FRAMES дольше, чтобы следующий экран наехал поверх него
          <Sequence key={i} from={start} durationInFrames={end - start + SLIDE_FRAMES}>
            <Screen from={i === 0 ? null : p.slides[i - 1].from}>
              <OffthreadVideo
                src={staticFile(p.mediaSrc)}
                muted
                trimBefore={start}
                style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%"}}
              />
            </Screen>
          </Sequence>
        );
      })}
      <Sequence from={siteFrom}>
        <Screen from="bottom">
          <SiteScroll src={p.site.src} seconds={(durationInFrames - siteFrom) / fps} />
        </Screen>
      </Sequence>
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill style={{backgroundColor: theme.colors.primary}}>
      <Audio src={staticFile(p.mediaSrc)} />
      {p.slideSfx
        ? [...p.slides.map((s) => s.at), p.site.at].map((at, i) => (
            <Sequence key={`sfx-${i}`} from={Math.max(0, f(at) - 3)} durationInFrames={fps}>
              <Audio src={staticFile(p.slideSfx)} volume={0.35} />
            </Sequence>
          ))
        : null}
      <Frame media={media} tone={p.tone}>
        <Sequence durationInFrames={f(p.hookSeconds)}>
          <Hook kicker={p.kicker} text={p.hook} sub={p.hookSub} seconds={p.hookSeconds} />
        </Sequence>
        <Captions words={p.words} from={p.hookSeconds} until={p.speechSeconds} />
        <Sequence from={durationInFrames - ctaFrames}>
          <Cta title={p.ctaTitle} text={p.cta} />
        </Sequence>
      </Frame>
      {p.showSafeZone ? <SafeZone /> : null}
    </AbsoluteFill>
  );
};
