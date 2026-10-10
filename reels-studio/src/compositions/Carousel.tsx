// Карусель Instagram (решение пользователя 08.10.2026): 1080×1350 (4:5, лента), один кадр = один слайд.
// Два стиля: brand "gtt" — GlobalTechTour (тёмно-синий фон со свечением и сеткой точек, Unbounded, синий акцент,
// стеклянная пирамида), brand "aura" — Aura Robotics (пергамент с сеткой, Inter, лимонный маркер, печать AR, робот).
// Слайды описываются в props/carousels/<имя>.json, рендер всех слайдов в PNG: npm run carousel -- <имя>.
// Типы слайдов: cover, text, list, stat, photo, quote, steps, compare, logos, cta. **слова** — акцент.
// Фото-слайды (10.10.2026, carousel/photo.tsx): photoCover, photoCard, photoFull, photoPair, photoStat, photoCta.
// Поля безопасности: по бокам 72 px, сверху и снизу 64 px; кегль от 30 px; проверочная версия — "guides": true.
import React from "react";
import {AbsoluteFill, Freeze, Img, staticFile, useCurrentFrame} from "remotion";
import {AuraBadge} from "../components/AuraBadge";
import {AuraMascot, GESTURE_DUR, type GestureKind} from "../components/AuraMascot";
import {carouselSchema, type CarouselProps, type Slide} from "./carousel/schema";
import {BrandMark, Body, CtaButton, H, Kicker, MONO, MIN_FONT, Pill, ROW, Rich, SAFE, Site, STYLES, Swipe, Title, W, type BrandId, type Style} from "./carousel/kit";
import {isFullBleed, isPhotoKind, MASCOT_SPOT, PhotoSlide} from "./carousel/photo";
import {Guides} from "./carousel/guides";

export {carouselSchema};
export type {CarouselProps};

const Tick: React.FC<{s: Style; n?: number}> = ({s, n}) => (
  <div style={{width: 58, height: 58, borderRadius: 29, background: s.tick, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0}}>
    {n === undefined ? (
      <svg width={34} height={34} viewBox="0 0 34 34">
        <path d="M7 18 L14 25 L27 10" fill="none" stroke={s.tickInk} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <span style={{fontFamily: s.head, fontWeight: 700, fontSize: MIN_FONT, color: s.tickInk}}>{n}</span>
    )}
  </div>
);

const Card: React.FC<{s: Style; children: React.ReactNode; style?: React.CSSProperties}> = ({s, children, style}) => (
  <div
    style={{
      background: s.card,
      borderRadius: s.marker ? 10 : 28,
      border: s.marker ? "2px solid #D9D7D5" : "2px solid rgba(255,255,255,0.10)",
      boxShadow: s.marker ? "0 10px 30px rgba(38,38,38,0.08)" : "0 20px 50px rgba(0,0,0,0.35)",
      padding: "34px 38px",
      ...style,
    }}
  >
    {children}
  </div>
);

// текстовые слайды (первая версия шаблона, 08.10.2026)
const SlideBody: React.FC<{sl: Slide; s: Style; brand: BrandId; last: boolean}> = ({sl, s, brand}) => {
  switch (sl.kind) {
    case "cover":
      return (
        <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
          {sl.image ? (
            <div style={{height: 520, borderRadius: s.marker ? 10 : 36, overflow: "hidden", marginBottom: 46, boxShadow: "0 24px 60px rgba(0,0,0,0.35)"}}>
              <Img src={staticFile(sl.image)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
            </div>
          ) : (
            <div style={{flex: 1}} />
          )}
          <Kicker text={sl.kicker} s={s} />
          <Title text={sl.title} s={s} size={sl.image ? 76 : 96} />
          <div style={{height: 26}} />
          <Body text={sl.text} s={s} />
          {sl.image ? null : <div style={{flex: 0.6}} />}
        </div>
      );
    case "text":
      return (
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 34}}>
          <div>
            <Kicker text={sl.kicker} s={s} />
            <Title text={sl.title} s={s} size={68} />
          </div>
          <Body text={sl.text} s={s} size={40} />
        </div>
      );
    case "list":
    case "steps":
      return (
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 40}}>
          <div>
            <Kicker text={sl.kicker} s={s} />
            <Title text={sl.title} s={s} size={64} />
          </div>
          <div style={{display: "flex", flexDirection: "column", gap: 22}}>
            {(sl.items ?? []).map((it, i) => (
              <Card key={i} s={s} style={{display: "flex", alignItems: "center", gap: 28, padding: "24px 30px"}}>
                <Tick s={s} n={sl.kind === "steps" ? i + 1 : undefined} />
                <div style={{fontFamily: s.body, fontWeight: 600, fontSize: 36, lineHeight: 1.25, color: s.cardInk}}>
                  <Rich text={it} s={s} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    case "stat":
      return (
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center", height: "100%"}}>
          <Kicker text={sl.kicker} s={s} />
          <div
            style={{
              fontFamily: s.head,
              fontWeight: s.marker ? 800 : 700,
              fontSize: (sl.value ?? "").length > 5 ? 200 : 260,
              lineHeight: 1,
              letterSpacing: s.marker ? "-0.04em" : "0",
              color: s.marker ? s.ink : s.accent,
              textShadow: s.marker ? "none" : "0 0 60px rgba(61,123,255,0.7)",
              backgroundImage: s.marker ? `linear-gradient(${s.accent}, ${s.accent})` : undefined,
              backgroundSize: "100% 38%",
              backgroundPosition: "0 82%",
              backgroundRepeat: "no-repeat",
              alignSelf: "flex-start",
            }}
          >
            {sl.value}
          </div>
          <div style={{height: 30}} />
          <Title text={sl.title} s={s} size={56} />
          <div style={{height: 24}} />
          <Body text={sl.text} s={s} />
        </div>
      );
    case "photo":
      return (
        <div style={{display: "flex", flexDirection: "column", height: "100%", gap: 36}}>
          <div style={{flex: 1, borderRadius: s.marker ? 10 : 36, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.35)"}}>
            {sl.image ? <Img src={staticFile(sl.image)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: sl.focus ?? "50% 50%"}} /> : null}
          </div>
          <div>
            <Kicker text={sl.kicker} s={s} />
            <Title text={sl.title} s={s} size={54} />
            {sl.text ? <div style={{height: 14}} /> : null}
            <Body text={sl.text} s={s} size={34} />
          </div>
        </div>
      );
    case "quote":
      return (
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center", height: "100%"}}>
          <div style={{fontFamily: s.head, fontWeight: 800, fontSize: 220, lineHeight: 0.7, color: s.marker ? "#262626" : s.accent, opacity: s.marker ? 0.9 : 1}}>“</div>
          <div style={{fontFamily: s.head, fontWeight: s.headWeight, fontSize: 60, lineHeight: 1.18, letterSpacing: s.headTrack, color: s.ink, marginTop: 20}}>
            <Rich text={sl.text ?? ""} s={s} />
          </div>
          {sl.author ? <div style={{fontFamily: s.body, fontWeight: 600, fontSize: 32, color: s.muted, marginTop: 40}}>— {sl.author}</div> : null}
        </div>
      );
    case "compare":
      return (
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 40}}>
          <div>
            <Kicker text={sl.kicker} s={s} />
            <Title text={sl.title} s={s} size={60} />
          </div>
          <div style={{display: "flex", gap: 24}}>
            {[sl.left, sl.right].map((col, ci) =>
              col ? (
                <Card key={ci} s={s} style={{flex: 1, opacity: 1, background: ci === 1 ? (s.marker ? "#262626" : "rgba(61,123,255,0.18)") : s.card, border: ci === 1 && !s.marker ? `2px solid ${s.accent}` : undefined}}>
                  <div style={{fontFamily: s.head, fontWeight: 700, fontSize: 34, color: ci === 1 && s.marker ? s.accent : s.cardInk, marginBottom: 22}}>{col.title}</div>
                  {col.items.map((it, i) => (
                    <div key={i} style={{display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16}}>
                      <span style={{fontFamily: s.body, fontWeight: 800, fontSize: 30, color: ci === 0 ? "#E5484D" : s.marker ? s.accent : "#22C55E"}}>{ci === 0 ? "✕" : "✓"}</span>
                      <span style={{fontFamily: s.body, fontWeight: 500, fontSize: 30, lineHeight: 1.3, color: ci === 1 && s.marker ? "#F8F6F3" : s.cardInk}}>{it}</span>
                    </div>
                  ))}
                </Card>
              ) : null,
            )}
          </div>
        </div>
      );
    case "logos":
      return (
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 44}}>
          <div>
            <Kicker text={sl.kicker} s={s} />
            <Title text={sl.title} s={s} size={60} />
          </div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22}}>
            {(sl.logos ?? []).map((l, i) => (
              <div key={i} style={{background: "#FFFFFF", borderRadius: s.marker ? 10 : 24, height: 170, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 18, border: s.marker ? "2px solid #D9D7D5" : undefined}}>
                <Img src={staticFile(l.src)} style={{maxHeight: l.name ? 72 : 84, maxWidth: "88%", objectFit: "contain"}} />
                {l.name ? <div style={{fontFamily: s.body, fontWeight: 600, fontSize: MIN_FONT, lineHeight: 1.1, color: "#6B6B76"}}>{l.name}</div> : null}
              </div>
            ))}
          </div>
          <Body text={sl.text} s={s} size={34} />
        </div>
      );
    case "cta":
      return (
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center", height: "100%"}}>
          {brand === "aura" ? (
            <div style={{alignSelf: "flex-start", marginBottom: 40}}>
              {/* статичный кадр печати: кольцо прорисовано, монограмма ровно (без 3D-поворота) */}
              <Freeze frame={2}>
                <AuraBadge size={190} />
              </Freeze>
            </div>
          ) : null}
          <Kicker text={sl.kicker} s={s} />
          <Title text={sl.title} s={s} size={80} />
          <div style={{height: 28}} />
          <Body text={sl.text} s={s} />
          <CtaButton text={sl.button ?? s.site} s={s} style={{marginTop: 54}} />
        </div>
      );
    default:
      return null;
  }
};

// шапка: знак бренда и счётчик «n / N»; на фото во весь слайд — на «пилюлях», чтобы читались на любом кадре
const Header: React.FC<{brand: BrandId; s: Style; n: number; total: number; glass: boolean}> = ({brand, s, n, total, glass}) => {
  const counter = (
    <div data-safe="" style={{fontFamily: MONO, fontWeight: 500, fontSize: MIN_FONT, color: glass ? s.ink : s.muted, letterSpacing: "0.08em"}}>
      {n} / {total}
    </div>
  );
  return (
    <div style={{position: "absolute", left: SAFE.side, right: SAFE.side, top: SAFE.top, height: ROW, display: "flex", justifyContent: "space-between", alignItems: "center"}}>
      {glass ? (
        <>
          <Pill s={s}>
            <BrandMark brand={brand} s={s} />
          </Pill>
          <Pill s={s}>{counter}</Pill>
        </>
      ) : (
        <>
          <BrandMark brand={brand} s={s} />
          {counter}
        </>
      )}
    </div>
  );
};

// подвал: сайт и стрелка «листай» (на последнем слайде стрелки нет)
const Footer: React.FC<{s: Style; last: boolean}> = ({s, last}) => (
  <div style={{position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom, height: ROW, display: "flex", justifyContent: "space-between", alignItems: "center"}}>
    <Site s={s} />
    {last ? null : <Swipe s={s} />}
  </div>
);

export const Carousel: React.FC<CarouselProps> = ({brand, slides, guides}) => {
  const i = useCurrentFrame();
  const sl = slides[Math.min(i, slides.length - 1)];
  const s = STYLES[brand];
  const last = i === slides.length - 1;
  const photo = isPhotoKind(sl.kind);
  const full = isFullBleed(sl);
  // робот Aura: на обложке и финале текстовых слайдов, на photoCta; на остальных — если указан mascot
  const auto: GestureKind | undefined = sl.kind === "cover" ? "wave" : sl.kind === "cta" || sl.kind === "photoCta" ? "pointUp" : undefined;
  const gesture: GestureKind | null = brand !== "aura" || sl.mascot === "none" || full ? null : (sl.mascot as GestureKind | undefined) ?? auto ?? null;
  const t = i; // fps 1: кадр = секунда
  const spot = photo ? {x: MASCOT_SPOT.x, y: MASCOT_SPOT.y} : {x: sl.kind === "cta" ? 830 : 900, y: sl.kind === "cta" ? 1170 : 1160};
  const scale = photo ? MASCOT_SPOT.scale : 1.2;
  // где виден робот (для проверки полей): от центра ступней влево ~85, вправо ~115, вверх ~325 px при масштабе 1.2
  const mascotBox = gesture ? {x1: spot.x - 72 * scale, x2: spot.x + 98 * scale, y1: spot.y - 272 * scale, y2: spot.y + 14 * scale} : null;
  return (
    <AbsoluteFill key={i} style={s.bg}>
      <AbsoluteFill style={s.pattern} />
      {photo ? (
        <PhotoSlide sl={sl} s={s} brand={brand} last={last} mascot={Boolean(gesture)} />
      ) : (
        <div style={{position: "absolute", left: SAFE.side, right: gesture && sl.kind !== "cta" ? 300 : SAFE.side, top: 170, bottom: 150}}>
          <SlideBody sl={sl} s={s} brand={brand} last={last} />
        </div>
      )}
      <Header brand={brand} s={s} n={i + 1} total={slides.length} glass={full} />
      {full ? null : <Footer s={s} last={last} />}
      {gesture ? (
        <AuraMascot
          scale={scale}
          plan={{
            stays: [{at: -10, x: spot.x, y: spot.y, face: -0.35}],
            gestures: [{at: t - GESTURE_DUR[gesture] * 0.42, kind: gesture}],
          }}
        />
      ) : null}
      {guides ? <Guides index={i} mascot={mascotBox} /> : null}
    </AbsoluteFill>
  );
};

export const CAROUSEL = {width: W, height: H};
