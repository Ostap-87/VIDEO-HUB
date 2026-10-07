import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {theme} from "../theme";
import {body, display} from "../fonts";
import {SafeZone} from "../components/SafeZone";

// «Говорящая голова» в стиле референса пользователя (07.10.2026):
// видео на весь экран, сверху плашка ▲ GLOBAL TECH TOUR, крупные белые субтитры по центру
// с синим текущим словом, белые плашки-списки слева сверху (с зачёркиванием),
// карточки логотипов, крупные цифры, зумы на склейках, в финале — сайт и CTA.

const chip = z.object({text: z.string(), at: z.number(), strike: z.number().optional()});
export const talkReelProSchema = z.object({
  mediaSrc: z.string(), // склеенное видео из source-videos/…/_work/имя.cut.mp4 (звук из него же)
  words: z.array(z.object({text: z.string(), start: z.number(), end: z.number()})),
  accentWords: z.array(z.string()), // слова, которые всегда синие (бренды, цифры)
  cuts: z.array(z.number()), // моменты склеек (секунды) — на них чередуется зум
  chips: z.array(z.object({until: z.number(), wrap: z.boolean(), items: z.array(chip)})),
  logos: z.array(
    z.object({until: z.number(), items: z.array(z.object({src: z.string(), at: z.number()}))}),
  ),
  numbers: z.array(z.object({text: z.string(), sub: z.string(), at: z.number(), until: z.number()})),
  sfx: z.object({pop: z.string(), whoosh: z.string()}),
  speechSeconds: z.number(),
  site: z.object({src: z.string(), at: z.number()}),
  cta: z.string(),
  ctaSeconds: z.number(),
  showSafeZone: z.boolean(),
});
export type TalkReelProProps = z.infer<typeof talkReelProSchema>;

const BLUE = theme.colors.accent;
const shadow = "0 4px 18px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.5)";

// ▲ GLOBAL TECH TOUR — логотип как на сайте (грани пирамиды) + название
export const LogoBar: React.FC<{darkFrom?: number}> = ({darkFrom = Infinity}) => {
  const frame = useCurrentFrame();
  const dark = frame >= darkFrom + 8; // на белом сайте логотип становится тёмным
  return (
  <div
    style={{
      position: "absolute",
      top: 120,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 22,
    }}
  >
    <svg width="58" height="58" viewBox="0 0 64 64" style={{filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.35))"}}>
      <path d="M24 6 L58 46 L8 54 Z" fill="#5BB8F5" />
      <path d="M24 6 L58 46 L36 40 Z" fill="#2F8FE0" />
      <path d="M24 6 L36 40 L8 54 Z" fill="#8AD0FA" />
    </svg>
    <div
      style={{
        fontFamily: display.fontFamily,
        fontWeight: 700,
        fontSize: 44,
        letterSpacing: "0.02em",
        color: dark ? theme.colors.text : "#FFFFFF",
        textShadow: dark ? "none" : shadow,
      }}
    >
      GLOBAL TECH TOUR
    </div>
  </div>
  );
};

// Субтитры по 3 слова по центру кадра, текущее и акцентные слова — синие
const BigCaptions: React.FC<{words: TalkReelProProps["words"]; accent: string[]; until: number; darkFrom: number}> = ({
  words,
  accent,
  until,
  darkFrom,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (t >= until) return null;
  const pages: TalkReelProProps["words"][] = [];
  for (let i = 0; i < words.length; i += 3) pages.push(words.slice(i, i + 3));
  const page = [...pages].reverse().find((p) => p[0].start <= t);
  if (!page || t > page[page.length - 1].end + 0.5) return null;
  const pop = spring({frame: frame - Math.round(page[0].start * fps), fps, config: theme.motion.snappy, durationInFrames: 8});
  const clean = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}+]/gu, "");
  const dark = frame >= darkFrom + 10; // на белом сайте текст тёмный
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top: 1250,
        textAlign: "center",
        fontFamily: display.fontFamily,
        fontWeight: 700,
        fontSize: 66,
        lineHeight: 1.18,
        color: dark ? theme.colors.text : "#FFFFFF",
        textShadow: dark ? "none" : shadow,
        // на сайте — белая подложка, чтобы текст не сливался с кнопками страницы
        background: dark ? "rgba(255,255,255,0.94)" : undefined,
        borderRadius: dark ? 28 : undefined,
        padding: dark ? "18px 24px" : undefined,
        boxShadow: dark ? "0 16px 40px rgba(23,23,29,0.18)" : undefined,
        scale: String(0.85 + 0.15 * pop),
        opacity: pop,
      }}
    >
      {page.map((w, i) => {
        const current = w.start <= t && t < w.end + 0.05;
        const hot = current || accent.includes(clean(w.text));
        return (
          <span key={i} style={{color: hot ? (dark ? BLUE : "#3D7BFF") : dark ? theme.colors.text : "#FFFFFF"}}>
            {w.text}{" "}
          </span>
        );
      })}
    </div>
  );
};

// Белая плашка-чип: выезжает слева с пружиной, может зачеркнуться красной линией
const Chip: React.FC<{text: string; delay: number; strike?: number}> = ({text, delay, strike}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 160, mass: 0.7}});
  const line =
    strike === undefined
      ? 0
      : interpolate(frame, [strike, strike + 8], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <div
      style={{
        position: "relative",
        alignSelf: "flex-start",
        background: "#FFFFFF",
        color: theme.colors.text,
        fontFamily: display.fontFamily,
        fontWeight: 700,
        fontSize: 32,
        padding: "14px 26px",
        borderRadius: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
        opacity: s,
        translate: `${(1 - s) * -140}px 0px`,
        scale: String(0.8 + 0.2 * s),
        transformOrigin: "left center",
      }}
    >
      <span style={{opacity: strike === undefined ? 1 : 1 - 0.45 * line}}>{text}</span>
      {strike !== undefined ? (
        <div
          style={{
            position: "absolute",
            left: 18,
            top: "50%",
            height: 5,
            width: `calc(${line * 100}% - 36px)`,
            background: "#E5484D",
            borderRadius: 3,
          }}
        />
      ) : null}
    </div>
  );
};

const ChipGroup: React.FC<{group: TalkReelProProps["chips"][number]; start: number}> = ({group, start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(frame, [(group.until - start) * fps - 8, (group.until - start) * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 230,
        left: 70,
        right: group.wrap ? 70 : undefined,
        display: "flex",
        flexDirection: group.wrap ? "row" : "column",
        flexWrap: group.wrap ? "wrap" : "nowrap",
        gap: 16,
        opacity: out,
      }}
    >
      {group.items.map((c, i) => (
        <Chip
          key={i}
          text={c.text}
          delay={Math.round((c.at - start) * fps)}
          strike={c.strike === undefined ? undefined : Math.round((c.strike - start) * fps)}
        />
      ))}
    </div>
  );
};

// Карточки логотипов вылетают по бокам от головы с лёгким поворотом
const LogoGroup: React.FC<{group: TalkReelProProps["logos"][number]; start: number}> = ({group, start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(frame, [(group.until - start) * fps - 8, (group.until - start) * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slots = [
    {left: 60, top: 430, rot: -6},
    {right: 60, top: 540, rot: 5},
    {left: 60, top: 680, rot: 4},
    {right: 60, top: 780, rot: -4},
  ];
  return (
    <AbsoluteFill style={{opacity: out}}>
      {group.items.map((l, i) => {
        const s = spring({frame: frame - Math.round((l.at - start) * fps), fps, config: {damping: 12, stiffness: 140}});
        const slot = slots[i % slots.length];
        const fromLeft = "left" in slot;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: fromLeft ? slot.left : undefined,
              right: fromLeft ? undefined : slot.right,
              top: slot.top,
              background: "#FFFFFF",
              borderRadius: 28,
              padding: "26px 34px",
              boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
              opacity: s,
              translate: `${(1 - s) * (fromLeft ? -400 : 400)}px 0px`,
              rotate: `${slot.rot * s}deg`,
              scale: String(0.6 + 0.4 * s),
            }}
          >
            <Img src={staticFile(l.src)} style={{height: 92, maxWidth: 380, objectFit: "contain", display: "block"}} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Крупная цифра с «попом» и синим свечением
const BigNumber: React.FC<{n: TalkReelProProps["numbers"][number]}> = ({n}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 9, stiffness: 160, mass: 0.8}});
  const out = interpolate(frame, [(n.until - n.at) * fps - 8, (n.until - n.at) * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{position: "absolute", left: 70, top: 380, opacity: out, scale: String(0.6 + 0.4 * s), transformOrigin: "left center"}}>
      <div
        style={{
          fontFamily: display.fontFamily,
          fontWeight: 700,
          fontSize: n.text.length > 3 ? 140 : 190,
          lineHeight: 1,
          color: "#3D7BFF",
          textShadow: "0 0 40px rgba(61,123,255,0.85), 0 6px 20px rgba(0,0,0,0.45)",
        }}
      >
        {n.text}
      </div>
      {n.sub ? (
        <div style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: 40, color: "#FFFFFF", textShadow: shadow, marginTop: 6}}>
          {n.sub}
        </div>
      ) : null}
    </div>
  );
};

// Зум на склейках: куски чередуют общий план и наезд, плюс лёгкий «дых» внутри куска
const ZoomedVideo: React.FC<{src: string; cuts: number[]; until: number}> = ({src, cuts, until}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const idx = cuts.filter((c) => c <= t).length;
  const segStart = cuts[idx - 1] ?? 0;
  const base = idx % 2 === 0 ? 1.0 : 1.14;
  const drift = interpolate(t - segStart, [0, 6], [0, 0.03], {extrapolateRight: "clamp"});
  // В финале кадр уменьшается («картинка в картинке») перед сайтом
  const shrink = interpolate(t, [until - 1.2, until - 0.2], [1, 0.82], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  return (
    <AbsoluteFill style={{background: "#0B0D14"}}>
      <AbsoluteFill
        style={{
          scale: String(shrink),
          borderRadius: shrink < 1 ? 48 : 0,
          overflow: "hidden",
          boxShadow: shrink < 1 ? "0 30px 80px rgba(0,0,0,0.6)" : undefined,
        }}
      >
        <OffthreadVideo
          src={staticFile(src)}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: String(base + drift),
            transformOrigin: "50% 32%",
          }}
        />
        {/* затемнение сверху и снизу для читаемости логотипа и субтитров */}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const HEADER_CUT = 150; // высота шапки сайта на скриншоте, px при ширине 1080

// Сайт въезжает снизу на весь экран и плавно прокручивается
const SiteScene: React.FC<{src: string; seconds: number}> = ({src, seconds}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inP = interpolate(frame, [0, 16], [1, 0], {extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1)});
  const imgH = (1080 / 1075) * 3008;
  const y = interpolate(frame, [fps * 1, fps * Math.max(2, seconds - 1)], [0, (imgH - 1920) * 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{translate: `0px ${inP * 100}%`, background: "#FFFFFF"}}>
      {/* шапку сайта (с его логотипом) срезаем: сверху уже стоит наша плашка GLOBAL TECH TOUR */}
      <Img src={staticFile(src)} style={{width: "100%", marginTop: 240 - HEADER_CUT, translate: `0px ${-y}px`}} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 250,
          background: "linear-gradient(to bottom, #FFFFFF 78%, rgba(255,255,255,0))",
        }}
      />
    </AbsoluteFill>
  );
};

const CtaPill: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: theme.motion.snappy});
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1300,
        display: "flex",
        justifyContent: "center",
        opacity: s,
        translate: `0px ${(1 - s) * 120}px`,
      }}
    >
      <div
        style={{
          background: BLUE,
          color: "#FFFFFF",
          fontFamily: body.fontFamily,
          fontWeight: 700,
          fontSize: 50,
          padding: "30px 54px",
          borderRadius: 999,
          boxShadow: "0 20px 50px rgba(37,99,235,0.45)",
        }}
      >
        {text} →
      </div>
    </div>
  );
};

export const TalkReelPro: React.FC<TalkReelProProps> = (p) => {
  const {fps, durationInFrames} = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const siteFrom = f(p.site.at);
  const sfxAt = [
    ...p.chips.flatMap((g) => g.items.map((c) => ({at: c.at, src: p.sfx.pop}))),
    ...p.logos.flatMap((g) => g.items.map((l) => ({at: l.at, src: p.sfx.whoosh}))),
    ...p.numbers.map((n) => ({at: n.at, src: p.sfx.whoosh})),
    {at: p.site.at, src: p.sfx.whoosh},
  ];

  return (
    <AbsoluteFill style={{backgroundColor: "#0B0D14"}}>
      <Audio src={staticFile(p.mediaSrc)} />
      {sfxAt.map((s, i) => (
        <Sequence key={`sfx-${i}`} from={Math.max(0, f(s.at) - 2)} durationInFrames={fps}>
          <Audio src={staticFile(s.src)} volume={0.28} />
        </Sequence>
      ))}

      <ZoomedVideo src={p.mediaSrc} cuts={p.cuts} until={p.site.at} />

      {p.chips.map((g, i) => {
        const start = g.items[0].at;
        return (
          <Sequence key={`chips-${i}`} from={f(start)} durationInFrames={f(g.until - start)}>
            <ChipGroup group={g} start={start} />
          </Sequence>
        );
      })}
      {p.logos.map((g, i) => {
        const start = g.items[0].at;
        return (
          <Sequence key={`logos-${i}`} from={f(start)} durationInFrames={f(g.until - start)}>
            <LogoGroup group={g} start={start} />
          </Sequence>
        );
      })}
      {p.numbers.map((n, i) => (
        <Sequence key={`num-${i}`} from={f(n.at)} durationInFrames={f(n.until - n.at)}>
          <BigNumber n={n} />
        </Sequence>
      ))}

      <Sequence from={siteFrom}>
        <SiteScene src={p.site.src} seconds={(durationInFrames - siteFrom) / fps} />
      </Sequence>

      <BigCaptions words={p.words} accent={p.accentWords} until={p.speechSeconds} darkFrom={siteFrom} />
      <LogoBar darkFrom={siteFrom} />

      <Sequence from={durationInFrames - f(p.ctaSeconds)}>
        <CtaPill text={p.cta} />
      </Sequence>
      {p.showSafeZone ? <SafeZone /> : null}
    </AbsoluteFill>
  );
};
