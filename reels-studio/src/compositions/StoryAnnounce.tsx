// Сторис-анонс карусели (решение пользователя 11.10.2026: «Пн — карусель, Вт — сторис-анонс, Ср — Reels по тому же туру»).
// 1080×1920, один кадр = одна сторис. Обложка карусели стопкой со следующими слайдами на фоне бренда (стили — carousel/kit.tsx),
// сверху знак бренда и «Новый пост», заголовок, внизу плашка-подсказка («Завтра в 19:00 — ролик об этом туре»).
// Безопасная зона Stories: сверху 250 px (полоски и аватар), снизу 380 px (строка ответа), по бокам 64 px.
// Рендер всех анонсов: npm run announce -- <имя> (props/announces/<имя>.json → finished-videos/анонсы/<имя>/01.png …).
import React from "react";
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from "remotion";
import {z} from "zod";
import {BrandMark, MONO, MIN_FONT, Rich, STYLES, typo, type Style} from "./carousel/kit";

export const storyAnnounceSchema = z.object({
  brand: z.enum(["gtt", "aura"]),
  stories: z.array(
    z.object({
      cover: z.string(), // обложка карусели (01.png), путь от корня репозитория
      back: z.array(z.string()).optional(), // 1–2 следующих слайда — «стопка» за обложкой, видно, что это карусель
      kicker: z.string().optional(), // плашка справа сверху, по умолчанию «Новый пост»
      title: z.string().optional(), // заголовок над обложкой, **слово** — акцент
      note: z.string().optional(), // плашка под обложкой
    }),
  ),
  guides: z.boolean().optional(), // показать безопасную зону Stories
});
export type StoryAnnounceProps = z.infer<typeof storyAnnounceSchema>;

export const STORY = {w: 1080, h: 1920, top: 250, bottom: 380, side: 64};
const CARD = {w: 680, h: 850}; // 4:5, как слайд карусели

const Badge: React.FC<{text: string; s: Style}> = ({text, s}) => (
  <div
    style={{
      height: 64,
      padding: "0 26px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      borderRadius: 32,
      background: s.marker ? "#262626" : "#FFFFFF",
      color: s.marker ? "#F8F6F3" : "#1D4ED8",
      fontFamily: MONO,
      fontWeight: 500,
      fontSize: MIN_FONT,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
    }}
  >
    <span style={{width: 14, height: 14, borderRadius: 7, background: s.marker ? s.accent : "#2563EB"}} />
    {text}
  </div>
);

const Slide: React.FC<{src: string; s: Style; style?: React.CSSProperties}> = ({src, s, style}) => (
  <div
    style={{
      position: "absolute",
      width: CARD.w,
      height: CARD.h,
      borderRadius: s.marker ? 12 : 32,
      overflow: "hidden",
      border: s.marker ? "3px solid #262626" : "6px solid #FFFFFF",
      boxShadow: s.marker ? "0 18px 40px rgba(38,38,38,0.18)" : "0 30px 70px rgba(10,25,80,0.45)",
      background: s.photo.empty,
      ...style,
    }}
  >
    <Img src={staticFile(src)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
  </div>
);

export const StoryAnnounce: React.FC<StoryAnnounceProps> = ({brand, stories, guides}) => {
  const i = useCurrentFrame();
  const st = stories[Math.min(i, stories.length - 1)];
  const s = STYLES[brand];
  const back = (st.back ?? []).slice(0, 2);
  const left = (STORY.w - CARD.w) / 2;
  return (
    <AbsoluteFill style={{...s.bg}}>
      <AbsoluteFill style={{...s.pattern}} />
      {/* шапка: знак бренда и плашка «Новый пост» */}
      <div style={{position: "absolute", top: STORY.top + 10, left: STORY.side, right: STORY.side, display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <BrandMark brand={brand} s={s} />
        <Badge text={st.kicker ?? "Новый пост"} s={s} />
      </div>
      {/* заголовок */}
      {st.title ? (
        <div style={{position: "absolute", top: STORY.top + 120, left: STORY.side, right: STORY.side, fontFamily: s.head, fontWeight: s.headWeight, letterSpacing: s.headTrack, fontSize: 60, lineHeight: 1.12, color: s.ink, textAlign: "center"}}>
          <Rich text={st.title} s={s} />
        </div>
      ) : null}
      {/* стопка слайдов: следующие слайды повёрнуты за обложкой */}
      <div style={{position: "absolute", top: 545, left: 0, width: STORY.w, height: CARD.h}}>
        {back[1] ? <Slide src={back[1]} s={s} style={{left: left + 120, top: 34, rotate: "9deg", scale: "0.9", opacity: 0.9}} /> : null}
        {back[0] ? <Slide src={back[0]} s={s} style={{left: left + 66, top: 16, rotate: "4.5deg", scale: "0.95"}} /> : null}
        <Slide src={st.cover} s={s} style={{left: left - 14, top: 0, rotate: "-1.5deg"}} />
      </div>
      {/* подсказка под обложкой */}
      {st.note ? (
        <div style={{position: "absolute", left: STORY.side, right: STORY.side, bottom: STORY.bottom - 6, display: "flex", justifyContent: "center"}}>
          <div style={{...s.button, fontFamily: s.body, fontWeight: 600, fontSize: 36, lineHeight: 1.2, padding: "20px 36px", borderRadius: 999, textAlign: "center"}}>
            {typo(st.note)}
          </div>
        </div>
      ) : null}
      {guides ? (
        <AbsoluteFill style={{pointerEvents: "none"}}>
          <div style={{position: "absolute", top: 0, left: 0, right: 0, height: STORY.top, background: "rgba(255,0,120,0.25)"}} />
          <div style={{position: "absolute", bottom: 0, left: 0, right: 0, height: STORY.bottom, background: "rgba(255,0,120,0.25)"}} />
          <div style={{position: "absolute", top: 0, bottom: 0, left: 0, width: STORY.side, background: "rgba(255,0,120,0.25)"}} />
          <div style={{position: "absolute", top: 0, bottom: 0, right: 0, width: STORY.side, background: "rgba(255,0,120,0.25)"}} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
