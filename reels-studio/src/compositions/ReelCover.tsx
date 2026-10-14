// Обложка Reels (решение пользователя 14.10.2026: «под каждое видео делать обложку красивую, которая будет соответствовать
// видео… чтобы люди чётко понимали, о чём ролик… вставь в видео в самом начале на 1 секунду»).
// 1080×1920, один кадр. Стиль бренда — тот же, что у каруселей (carousel/kit.tsx, brand: gtt / aura).
// Сверху знак бренда и плашка-кикер, крупный заголовок с акцентом (**слово**), подзаголовок, логотипы компаний,
// факты-плашки и вырезка героя ролика (робот, спикер) без фона. Важное — внутри полосы сетки профиля 3:4 (y 240–1680)
// и выше подписи Reels в ленте (y < 1540); справа внизу — кнопки Instagram, текст туда не ставим.
// Рендер и вставка в начало ролика: npm run cover -- <имя> (props/covers/<имя>.json).
import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import {z} from "zod";
import {BrandMark, MONO, Rich, STYLES, resolveLogo, typo, type Style} from "./carousel/kit";
import {Badge} from "./StoryAnnounce";

export const reelCoverSchema = z.object({
  brand: z.enum(["gtt", "aura"]),
  kicker: z.string().optional(), // плашка справа сверху: «Модель дня», «Бизнес-экспедиция»
  title: z.string(), // **слово** — акцент; \n — перенос
  titleSize: z.number().optional(),
  subtitle: z.string().optional(),
  subtitleSize: z.number().optional(),
  logos: z.array(z.string()).optional(), // id из library/brands.json или путь от корня репозитория
  logosTitle: z.string().optional(), // подпись над логотипами
  logoColumns: z.number().optional(), // логотипы ровной сеткой: столько колонок, плашки одного размера
  facts: z.array(z.string()).optional(), // короткие плашки-факты (**акцент**)
  hero: z
    .object({
      src: z.string(), // PNG без фона, путь от корня репозитория
      height: z.number(), // высота на обложке, px
      x: z.number(), // центр по горизонтали, px
      bottom: z.number(), // низ героя от верха кадра, px
      shadow: z.boolean().optional(), // тень-эллипс под ногами
    })
    .optional(),
  layout: z.enum(["robot", "speaker"]).default("speaker"),
  guides: z.boolean().optional(), // зоны: сетка 3:4 и подпись Reels
});
export type ReelCoverProps = z.infer<typeof reelCoverSchema>;

export const COVER = {w: 1080, h: 1920, side: 64, top: 250, gridTop: 240, gridBottom: 1680, caption: 1540};

const LogoPlate: React.FC<{src: string; h: number; w?: number}> = ({src, h, w}) => (
  <div
    style={{
      height: h,
      width: w,
      boxSizing: "border-box",
      padding: `0 ${Math.round(h * 0.3)}px`,
      borderRadius: Math.round(h * 0.24),
      background: "rgba(255,255,255,0.97)",
      boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {/* в ровной сетке логотип вписывается в рамку плашки: широкие — по ширине, квадратные значки — по высоте 70 % */}
    <Img
      src={staticFile(src)}
      style={w ? {width: "100%", height: Math.round(h * 0.7), objectFit: "contain"} : {height: Math.round(h * 0.56), width: "auto", maxWidth: Math.round(h * 2.6), objectFit: "contain"}}
    />
  </div>
);

const Fact: React.FC<{text: string; s: Style}> = ({text, s}) => (
  <div
    style={{
      ...(s.marker
        ? {background: "#FFFFFF", border: "3px solid #262626", borderRadius: 14, color: "#262626"}
        : {background: "rgba(20,49,140,0.80)", border: "2px solid rgba(255,255,255,0.22)", borderRadius: 24, color: "#FFFFFF"}),
      padding: "18px 26px",
      fontFamily: s.body,
      fontWeight: 600,
      fontSize: 40,
      lineHeight: 1.15,
      alignSelf: "flex-start",
    }}
  >
    <Rich text={text} s={s} />
  </div>
);

export const ReelCover: React.FC<ReelCoverProps> = ({brand, kicker, title, titleSize, subtitle, subtitleSize, logos, logosTitle, logoColumns, facts, hero, layout, guides}) => {
  const s = STYLES[brand];
  const logoSrc = (logos ?? []).map(resolveLogo).filter((x): x is string => Boolean(x));
  const robot = layout === "robot";
  return (
    <AbsoluteFill style={{...s.bg, overflow: "hidden"}}>
      <AbsoluteFill style={{...s.pattern}} />
      {/* герой: под текстом, чтобы заголовок всегда читался */}
      {hero ? (
        <>
          {hero.shadow ? (
            <div
              style={{
                position: "absolute",
                left: hero.x - hero.height * 0.22,
                top: hero.bottom - 34,
                width: hero.height * 0.44,
                height: 60,
                borderRadius: "50%",
                background: s.marker ? "radial-gradient(closest-side, rgba(38,38,38,0.32), rgba(38,38,38,0))" : "radial-gradient(closest-side, rgba(0,10,50,0.45), rgba(0,10,50,0))",
              }}
            />
          ) : null}
          <Img
            src={staticFile(hero.src)}
            style={{position: "absolute", height: hero.height, left: hero.x, top: hero.bottom - hero.height, translate: "-50% 0", filter: s.marker ? "drop-shadow(0 18px 30px rgba(38,38,38,0.18))" : "drop-shadow(0 24px 50px rgba(5,20,80,0.45))"}}
          />
        </>
      ) : null}
      {/* шапка */}
      <div style={{position: "absolute", top: COVER.top + 16, left: COVER.side, right: COVER.side, display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <BrandMark brand={brand} s={s} />
        {kicker ? <Badge text={kicker} s={s} /> : null}
      </div>
      {/* заголовок и подзаголовок */}
      <div style={{position: "absolute", top: COVER.top + 120, left: COVER.side, right: COVER.side}}>
        <div
          style={{
            fontFamily: s.head,
            fontWeight: s.marker ? 700 : s.headWeight,
            letterSpacing: s.headTrack,
            fontSize: titleSize ?? (robot ? 168 : 88),
            lineHeight: robot ? 1.0 : 1.08,
            color: s.ink,
            whiteSpace: "pre-line",
            textShadow: s.marker ? undefined : "0 4px 30px rgba(5,20,80,0.35)",
          }}
        >
          <Rich text={title} s={s} />
        </div>
        {subtitle ? (
          <div style={{marginTop: robot ? 22 : 26, fontFamily: s.body, fontWeight: 600, fontSize: subtitleSize ?? (robot ? 50 : 44), lineHeight: 1.2, color: s.marker ? "#3D3D3D" : s.bodyInk, maxWidth: robot ? 620 : 952}}>
            <Rich text={subtitle} s={s} />
          </div>
        ) : null}
        {logoSrc.length && !robot ? (
          <div style={{marginTop: 34}}>
            {logosTitle ? (
              <div style={{fontFamily: MONO, fontWeight: 500, fontSize: 30, letterSpacing: "0.12em", textTransform: "uppercase", color: s.marker ? s.muted : s.accent, marginBottom: 18}}>
                {typo(logosTitle)}
              </div>
            ) : null}
            <div style={{display: "flex", flexWrap: "wrap", gap: 14}}>
              {logoSrc.map((src) => (
                <LogoPlate key={src} src={src} h={92} w={logoColumns ? Math.floor((COVER.w - 2 * COVER.side - 14 * (logoColumns - 1)) / logoColumns) : undefined} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {/* у робота — факты слева столбиком, логотип производителя под ними */}
      {robot && (facts?.length || logoSrc.length) ? (
        <div style={{position: "absolute", left: COVER.side, top: 860, width: 470, display: "flex", flexDirection: "column", gap: 18}}>
          {(facts ?? []).map((f) => (
            <Fact key={f} text={f} s={s} />
          ))}
          {logoSrc.length ? (
            <div style={{marginTop: 18, display: "flex", gap: 12}}>
              {logoSrc.map((src) => (
                <LogoPlate key={src} src={src} h={96} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {!robot && facts?.length ? (
        <div style={{position: "absolute", left: COVER.side, bottom: COVER.h - COVER.caption + 20, display: "flex", flexDirection: "column", gap: 14}}>
          {facts.map((f) => (
            <Fact key={f} text={f} s={s} />
          ))}
        </div>
      ) : null}
      {guides ? (
        <AbsoluteFill style={{pointerEvents: "none"}}>
          <div style={{position: "absolute", top: 0, left: 0, right: 0, height: COVER.gridTop, background: "rgba(255,0,120,0.22)"}} />
          <div style={{position: "absolute", top: COVER.gridBottom, left: 0, right: 0, bottom: 0, background: "rgba(255,0,120,0.22)"}} />
          <div style={{position: "absolute", top: COVER.caption, left: 0, right: 0, height: 3, background: "rgba(255,0,120,0.9)"}} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
