// Stories из готового Reels (решение пользователя 12.10.2026: «сделай сторис по ролику Аура, который сегодня запостили — я бы
// его публиковал и у себя в аккаунте как мой проект»). 1080×1920, 30 fps, длина = длина ролика (Stories до 60 с).
// Фон и шапка — как у Stories-анонса (StoryAnnounce: знак бренда, плашка-кикер), заголовок, ролик со звуком в карточке 9:16,
// внизу плашка-подсказка. Всё в безопасной зоне Stories (сверху 250, снизу 380, по бокам 64).
import React from "react";
import {AbsoluteFill, staticFile} from "remotion";
import {Video} from "@remotion/media";
import {z} from "zod";
import {BrandMark, Rich, STYLES, typo} from "./carousel/kit";
import {Badge, STORY} from "./StoryAnnounce";

export const storyReelSchema = z.object({
  brand: z.enum(["gtt", "aura"]),
  video: z.string(), // ролик 9:16, путь от корня репозитория
  seconds: z.number(), // длина ролика (с)
  kicker: z.string().optional(), // плашка справа сверху («Новый Reels», «Мой проект»; "" — без плашки)
  title: z.string().optional(), // заголовок над роликом, **слово** — акцент
  note: z.string().optional(), // плашка под роликом
});
export type StoryReelProps = z.infer<typeof storyReelSchema>;

const CARD = {h: 910, top: 505};
const CW = Math.round((CARD.h * 9) / 16);

export const StoryReel: React.FC<StoryReelProps> = ({brand, video, kicker, title, note}) => {
  const s = STYLES[brand];
  return (
    <AbsoluteFill style={{...s.bg}}>
      <AbsoluteFill style={{...s.pattern}} />
      <div style={{position: "absolute", top: STORY.top + 10, left: STORY.side, right: STORY.side, display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <BrandMark brand={brand} s={s} />
        {kicker === "" ? null : <Badge text={kicker ?? "Новый Reels"} s={s} />}
      </div>
      {title ? (
        <div style={{position: "absolute", top: STORY.top + 105, left: STORY.side, right: STORY.side, fontFamily: s.head, fontWeight: s.headWeight, letterSpacing: s.headTrack, fontSize: 54, lineHeight: 1.1, color: s.ink, textAlign: "center", whiteSpace: "pre-line"}}>
          <Rich text={title} s={s} />
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          top: CARD.top,
          left: (STORY.w - CW) / 2,
          width: CW,
          height: CARD.h,
          borderRadius: s.marker ? 18 : 32,
          overflow: "hidden",
          border: s.marker ? "3px solid #262626" : "6px solid #FFFFFF",
          boxShadow: "0 30px 70px rgba(38,38,38,0.25)",
        }}
      >
        <Video src={staticFile(video)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
      </div>
      {note ? (
        <div style={{position: "absolute", left: STORY.side, right: STORY.side, bottom: STORY.bottom - 6, display: "flex", justifyContent: "center"}}>
          <div style={{...s.button, fontFamily: s.body, fontWeight: 600, fontSize: 36, lineHeight: 1.2, padding: "20px 36px", borderRadius: 999, textAlign: "center"}}>{typo(note)}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
