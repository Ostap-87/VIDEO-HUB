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
  logoSize: z.number().optional(), // во сколько раз выше плашки логотипов на фото (1 — 78 px); 1,3–1,8 при 4–8 логотипах, чтобы круглые знаки не мельчали
  facts: z.array(z.string()).optional(), // короткие плашки-факты (**акцент**)
  factsTop: z.number().optional(), // факты строкой с переносом под заголовком (верх, px), а не столбиком внизу поверх фото
  hero: z
    .object({
      src: z.string(), // PNG без фона, путь от корня репозитория
      height: z.number(), // высота на обложке, px
      x: z.number(), // центр по горизонтали, px
      bottom: z.number(), // низ героя от верха кадра, px
      shadow: z.boolean().optional(), // тень-эллипс под ногами
    })
    .optional(),
  layout: z.enum(["robot", "speaker", "card"]).default("speaker"),
  theme: z.enum(["brand", "light"]).optional(), // light — светлый фон GTT (ядро стиля «светлый framed»), тёмный текст, синие акценты
  photo: z
    .object({
      src: z.string(), // кадр ролика целиком (не вырезка), путь от корня репозитория
      top: z.number(), // верх карточки, px
      height: z.number(), // высота карточки, px
      focus: z.string().optional(), // object-position: что оставить в кадре
      zoom: z.number().optional(),
    })
    .optional(), // layout "card": фото в карточке со скруглением, логотипы — на белой плашке поверх низа фото
  background: z.object({src: z.string(), focus: z.string().optional()}).optional(), // фото на весь кадр вместо фона бренда
  titlePlate: z.boolean().optional(), // белая (у light) или синяя плашка под шапкой и заголовком — для фото на фоне
  photoFull: z.boolean().optional(), // photo — на весь кадр без карточки (кадр ролика целиком)
  avatar: z
    .object({src: z.string(), x: z.number(), y: z.number(), size: z.number(), focus: z.string().optional(), zoom: z.number().optional(), label: z.string().optional()})
    .optional(), // круглое фото спикера (центр x, y) с подписью — когда главное на обложке фон (город, завод)
  logosTop: z.number().optional(), // верх плашки логотипов без фото-карточки (layout card без photo), px
  headerTop: z.number().optional(), // верх шапки (по умолчанию 250 — безопасная зона Reels); не выше 224, иначе шапку срежет сетка 3:4
  guides: z.boolean().optional(), // зоны: сетка 3:4 и подпись Reels
});
export type ReelCoverProps = z.infer<typeof reelCoverSchema>;

// Светлая тема GTT — цвета ядра стиля (src/theme.ts): фон #EEEEF2, акцент #2563EB, текст #17171D, подписи #6B6B76.
const LIGHT: Style = {
  ...STYLES.gtt,
  bg: {background: "radial-gradient(ellipse 70% 40% at 85% 6%, rgba(37,99,235,0.10), rgba(37,99,235,0) 70%), linear-gradient(180deg, #F6F7FB 0%, #EEEEF2 100%)"},
  pattern: {backgroundImage: "radial-gradient(rgba(37,99,235,0.10) 2px, transparent 2px)", backgroundSize: "40px 40px"},
  ink: "#17171D",
  muted: "#6B6B76",
  accent: "#2563EB",
  bodyInk: "#3A3A44",
  pyramid: ["#93C5FD", "#2563EB", "#60A5FA"],
};

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

export const ReelCover: React.FC<ReelCoverProps> = ({brand, kicker, title, titleSize, subtitle, subtitleSize, logos, logosTitle, logoColumns, logoSize, facts, factsTop, hero, layout, theme, photo, background, titlePlate, photoFull, avatar, logosTop, headerTop, guides}) => {
  const top = headerTop ?? COVER.top;
  const light = theme === "light" && brand === "gtt";
  const s = light ? LIGHT : STYLES[brand];
  const card = layout === "card";
  const logoSrc = (logos ?? []).map(resolveLogo).filter((x): x is string => Boolean(x));
  const robot = layout === "robot";
  return (
    <AbsoluteFill style={{...s.bg, overflow: "hidden"}}>
      <AbsoluteFill style={{...s.pattern}} />
      {background ? (
        <Img src={staticFile(background.src)} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: background.focus ?? "50% 50%"}} />
      ) : null}
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
      {/* фото в карточке: кадр ролика целиком, без вырезки (решение пользователя 14.10.2026 — вырезка выглядела «странно») */}
      {card && photo ? (
        <div
          style={{
            position: "absolute",
            left: photoFull ? 0 : COVER.side,
            right: photoFull ? 0 : COVER.side,
            top: photoFull ? 0 : photo.top,
            height: photoFull ? COVER.h : photo.height,
            borderRadius: photoFull ? 0 : 48,
            overflow: "hidden",
            // у Aura — графитовая рамка и мягкая тень, как карточки на aura-robotics.ru
            border: photoFull ? undefined : light ? "8px solid #FFFFFF" : s.marker ? "4px solid #262626" : "6px solid rgba(255,255,255,0.9)",
            boxShadow: photoFull ? undefined : light ? "0 30px 70px rgba(23,23,29,0.18), 0 0 0 2px #D5D5DD" : s.marker ? "0 30px 60px rgba(38,38,38,0.22)" : "0 30px 70px rgba(10,25,80,0.45)",
            background: "#D5D5DD",
          }}
        >
          <Img
            src={staticFile(photo.src)}
            style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: photo.focus ?? "50% 40%", scale: String(photo.zoom ?? 1), transformOrigin: photo.focus ?? "50% 40%"}}
          />
        </div>
      ) : null}
      {card && (photo || logosTop) && logoSrc.length ? (
        <div
          style={{
            position: "absolute",
            left: COVER.side + (photo ? 28 : 0),
            right: COVER.side + (photo ? 28 : 0),
            top: photo ? photo.top + photo.height - 36 : logosTop,
            translate: photo ? "0 -100%" : undefined,
            padding: 20,
            borderRadius: 32,
            background: "rgba(255,255,255,0.94)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 18px 40px rgba(23,23,29,0.18)",
            display: "grid",
            gridTemplateColumns: `repeat(${logoColumns ?? 3}, 1fr)`,
            gap: 12,
          }}
        >
          {logoSrc.map((src) => (
            <div key={src} style={{height: Math.round(78 * (logoSize ?? 1)), borderRadius: 18, background: "#F4F6FA", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 18px"}}>
              <Img src={staticFile(src)} style={{width: "100%", height: Math.round(52 * (logoSize ?? 1)), objectFit: "contain"}} />
            </div>
          ))}
        </div>
      ) : null}
      {titlePlate ? (
        <div
          style={{
            position: "absolute",
            left: COVER.side - 28,
            right: COVER.side - 28,
            top: top - 18,
            height:
              18 + 120 + title.split("\n").length * (titleSize ?? 88) * 1.08 + (subtitle ? 26 + (subtitleSize ?? 44) * 1.2 * Math.ceil(subtitle.length / 40) : 0) + 36,
            borderRadius: 40,
            background: light ? "rgba(255,255,255,0.93)" : s.marker ? "rgba(248,246,243,0.95)" : "rgba(20,49,140,0.84)",
            border: s.marker ? "3px solid #262626" : undefined,
            backdropFilter: "blur(18px)",
            boxShadow: light ? "0 24px 60px rgba(23,23,29,0.20)" : s.marker ? "0 24px 60px rgba(38,38,38,0.20)" : "0 24px 60px rgba(5,20,80,0.40)",
          }}
        />
      ) : null}
      {/* шапка */}
      <div style={{position: "absolute", top: top + 16, left: COVER.side, right: COVER.side, display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <BrandMark brand={brand} s={s} />
        {kicker ? (
          light ? (
            <div style={{height: 64, padding: "0 28px", display: "flex", alignItems: "center", borderRadius: 32, background: "#2563EB", color: "#FFFFFF", fontFamily: MONO, fontWeight: 500, fontSize: 30, letterSpacing: "0.12em", textTransform: "uppercase"}}>
              {kicker}
            </div>
          ) : (
            <Badge text={kicker} s={s} />
          )
        ) : null}
      </div>
      {/* заголовок и подзаголовок */}
      <div style={{position: "absolute", top: top + 120, left: COVER.side, right: COVER.side}}>
        <div
          style={{
            fontFamily: s.head,
            fontWeight: s.marker ? 700 : s.headWeight,
            letterSpacing: s.headTrack,
            fontSize: titleSize ?? (robot ? 168 : 88),
            lineHeight: robot ? 1.0 : 1.08,
            color: s.ink,
            whiteSpace: "pre-line",
            textShadow: s.marker || light ? undefined : "0 4px 30px rgba(5,20,80,0.35)",
          }}
        >
          <Rich text={title} s={s} />
        </div>
        {subtitle ? (
          <div style={{marginTop: robot ? 22 : 26, fontFamily: s.body, fontWeight: 600, fontSize: subtitleSize ?? (robot ? 50 : 44), lineHeight: 1.2, color: s.marker ? "#3D3D3D" : s.bodyInk, maxWidth: robot ? 620 : 952}}>
            <Rich text={subtitle} s={s} />
          </div>
        ) : null}
        {logoSrc.length && !robot && !card ? (
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
      {avatar ? (
        <div style={{position: "absolute", left: avatar.x - avatar.size / 2, top: avatar.y - avatar.size / 2, width: avatar.size, display: "flex", flexDirection: "column", alignItems: "center"}}>
          <div style={{width: avatar.size, height: avatar.size, borderRadius: "50%", overflow: "hidden", border: "10px solid #FFFFFF", boxShadow: "0 20px 50px rgba(23,23,29,0.30)", background: "#D5D5DD"}}>
            <Img src={staticFile(avatar.src)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: avatar.focus ?? "50% 40%", scale: String(avatar.zoom ?? 1), transformOrigin: avatar.focus ?? "50% 40%"}} />
          </div>
          {avatar.label ? (
            <div style={{marginTop: -26, padding: "12px 24px", borderRadius: 999, background: "#2563EB", color: "#FFFFFF", fontFamily: s.body, fontWeight: 700, fontSize: 30, whiteSpace: "nowrap", boxShadow: "0 10px 26px rgba(37,99,235,0.35)"}}>
              {typo(avatar.label)}
            </div>
          ) : null}
        </div>
      ) : null}
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
        <div
          style={
            factsTop !== undefined
              ? {position: "absolute", left: COVER.side, right: COVER.side, top: factsTop, display: "flex", flexWrap: "wrap", gap: 14}
              : {position: "absolute", left: COVER.side, bottom: COVER.h - COVER.caption + 20, display: "flex", flexDirection: "column", gap: 14}
          }
        >
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
