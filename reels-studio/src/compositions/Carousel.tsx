// Карусель Instagram (решение пользователя 08.10.2026): 1080×1350 (4:5, лента), один кадр = один слайд.
// Два стиля: brand "gtt" — GlobalTechTour (тёмно-синий фон со свечением и сеткой точек, Unbounded, синий акцент,
// стеклянная пирамида), brand "aura" — Aura Robotics (пергамент с сеткой, Inter, лимонный маркер, печать AR, робот).
// Слайды описываются в props/carousels/<имя>.json, рендер всех слайдов в PNG: npm run carousel -- <имя>.
// Типы слайдов: cover, text, list, stat, photo, quote, steps, compare, logos, cta. **слова** — акцент.
import React from "react";
import {AbsoluteFill, Freeze, Img, staticFile, useCurrentFrame} from "remotion";
import {z} from "zod";
import {loadFont as loadInter} from "@remotion/google-fonts/Inter";
import {display} from "../fonts";
import {AuraBadge, ArMonogram} from "../components/AuraBadge";
import {AuraMascot, GESTURE_DUR, type GestureKind} from "../components/AuraMascot";

const inter = loadInter("normal", {weights: ["400", "500", "600", "700", "800"], subsets: ["cyrillic", "latin"]});

const slide = z.object({
  kind: z.enum(["cover", "text", "list", "stat", "photo", "quote", "steps", "compare", "logos", "cta"]),
  kicker: z.string().optional(), // надпись над заголовком (капсом, моно)
  title: z.string().optional(), // **слова** — акцент
  text: z.string().optional(),
  image: z.string().optional(), // путь от корня репозитория
  items: z.array(z.string()).optional(), // list, steps
  value: z.string().optional(), // stat: «1000+»
  author: z.string().optional(), // quote
  left: z.object({title: z.string(), items: z.array(z.string())}).optional(), // compare
  right: z.object({title: z.string(), items: z.array(z.string())}).optional(),
  logos: z.array(z.object({src: z.string(), name: z.string().optional()})).optional(),
  button: z.string().optional(), // cta: текст кнопки (по умолчанию сайт бренда)
  mascot: z.enum(["wave", "point", "pointUp", "present", "jump", "tick", "none"]).optional(), // только aura
});
export const carouselSchema = z.object({
  brand: z.enum(["gtt", "aura"]),
  slides: z.array(slide),
});
export type CarouselProps = z.infer<typeof carouselSchema>;
type Slide = z.infer<typeof slide>;

const W = 1080;
const H = 1350;

type Style = {
  bg: React.CSSProperties;
  pattern: React.CSSProperties;
  ink: string;
  muted: string;
  accent: string;
  head: string;
  headWeight: number;
  headTrack: string;
  body: string;
  card: string;
  cardInk: string;
  tick: string;
  tickInk: string;
  site: string;
  marker: boolean; // акцент маркером (aura) или цветом (gtt)
};

const STYLES: Record<"gtt" | "aura", Style> = {
  gtt: {
    bg: {background: "radial-gradient(ellipse 80% 55% at 20% 15%, rgba(37,99,235,0.45), rgba(37,99,235,0) 70%), radial-gradient(ellipse 60% 45% at 95% 100%, rgba(56,189,248,0.25), rgba(56,189,248,0) 70%), linear-gradient(180deg, #0A1022 0%, #050814 100%)"},
    pattern: {backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 2px, transparent 2px)", backgroundSize: "40px 40px"},
    ink: "#F4F7FF",
    muted: "#9AA8C7",
    accent: "#3D7BFF",
    head: display.fontFamily,
    headWeight: 700,
    headTrack: "0",
    body: inter.fontFamily,
    card: "rgba(255,255,255,0.06)",
    cardInk: "#F4F7FF",
    tick: "#16A34A",
    tickInk: "#FFFFFF",
    site: "globaltechtour.ru",
    marker: false,
  },
  aura: {
    bg: {background: "radial-gradient(ellipse 70% 50% at 85% 10%, rgba(255,246,93,0.35), rgba(255,246,93,0) 70%), linear-gradient(180deg, #F8F6F3 0%, #EFECE7 100%)"},
    pattern: {backgroundImage: "linear-gradient(rgba(38,38,38,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(38,38,38,0.06) 2px, transparent 2px)", backgroundSize: "90px 90px"},
    ink: "#262626",
    muted: "#727272",
    accent: "#FFF65D",
    head: inter.fontFamily,
    headWeight: 600,
    headTrack: "-0.03em",
    body: inter.fontFamily,
    card: "#FFFFFF",
    cardInk: "#262626",
    tick: "#262626",
    tickInk: "#FFF65D",
    site: "aura-robotics.ru",
    marker: true,
  },
};

// **слово** → акцент: GTT — синий цвет, Aura — лимонный маркер под словом
const Rich: React.FC<{text: string; s: Style}> = ({text, s}) => (
  <>
    {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") ? (
        <span
          key={i}
          style={
            s.marker
              ? {backgroundImage: `linear-gradient(${s.accent}, ${s.accent})`, backgroundSize: "100% 42%", backgroundPosition: "0 88%", backgroundRepeat: "no-repeat", padding: "0 4px"}
              : {color: s.accent}
          }
        >
          {part.slice(2, -2)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

const Logo: React.FC<{brand: "gtt" | "aura"; s: Style}> = ({brand, s}) =>
  brand === "aura" ? (
    <div style={{display: "flex", alignItems: "center", gap: 16}}>
      <ArMonogram width={64} color={s.ink} />
      <div style={{fontFamily: s.body, fontWeight: 600, fontSize: 24, letterSpacing: "0.16em", color: s.ink}}>AURA ROBOTICS</div>
    </div>
  ) : (
    <div style={{display: "flex", alignItems: "center", gap: 16}}>
      <svg width="46" height="46" viewBox="0 0 64 64">
        <path d="M24 6 L58 46 L8 54 Z" fill="#5BB8F5" />
        <path d="M24 6 L58 46 L36 40 Z" fill="#2F8FE0" />
        <path d="M24 6 L36 40 L8 54 Z" fill="#8AD0FA" />
      </svg>
      <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 26, color: s.ink, letterSpacing: "0.02em"}}>GLOBAL TECH TOUR</div>
    </div>
  );

const Kicker: React.FC<{text?: string; s: Style}> = ({text, s}) =>
  text ? (
    <div style={{fontFamily: "JetBrains Mono, monospace", fontWeight: 500, fontSize: 26, letterSpacing: "0.14em", textTransform: "uppercase", color: s.marker ? s.muted : s.accent, marginBottom: 22}}>
      {text}
    </div>
  ) : null;

const Title: React.FC<{text?: string; s: Style; size?: number}> = ({text, s, size = 76}) =>
  text ? (
    <div style={{fontFamily: s.head, fontWeight: s.headWeight, fontSize: size, lineHeight: 1.08, letterSpacing: s.headTrack, color: s.ink}}>
      <Rich text={text} s={s} />
    </div>
  ) : null;

const Body: React.FC<{text?: string; s: Style; size?: number}> = ({text, s, size = 38}) =>
  text ? (
    <div style={{fontFamily: s.body, fontWeight: 400, fontSize: size, lineHeight: 1.38, color: s.marker ? "#3D3D3D" : "#C9D3EA", whiteSpace: "pre-line"}}>
      <Rich text={text} s={s} />
    </div>
  ) : null;

const Tick: React.FC<{s: Style; n?: number}> = ({s, n}) => (
  <div style={{width: 58, height: 58, borderRadius: 29, background: s.tick, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0}}>
    {n === undefined ? (
      <svg width={34} height={34} viewBox="0 0 34 34">
        <path d="M7 18 L14 25 L27 10" fill="none" stroke={s.tickInk} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <span style={{fontFamily: s.head, fontWeight: 700, fontSize: 28, color: s.tickInk}}>{n}</span>
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

const SlideBody: React.FC<{sl: Slide; s: Style; brand: "gtt" | "aura"; last: boolean}> = ({sl, s, brand}) => {
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
            {sl.image ? <Img src={staticFile(sl.image)} style={{width: "100%", height: "100%", objectFit: "cover"}} /> : null}
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
              <div key={i} style={{background: "#FFFFFF", borderRadius: s.marker ? 10 : 24, height: 170, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 18, border: s.marker ? "2px solid #D9D7D5" : undefined}}>
                <Img src={staticFile(l.src)} style={{maxHeight: 84, maxWidth: "88%", objectFit: "contain"}} />
                {l.name ? <div style={{fontFamily: s.body, fontWeight: 600, fontSize: 20, color: "#6B6B76"}}>{l.name}</div> : null}
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
          <div
            style={{
              alignSelf: "flex-start",
              marginTop: 54,
              background: s.marker ? "#000000" : "#2563EB",
              color: "#FFFFFF",
              fontFamily: s.body,
              fontWeight: 600,
              fontSize: 40,
              padding: "28px 46px",
              borderRadius: 999,
              boxShadow: s.marker ? "0 0 50px rgba(255,246,93,0.7)" : "0 0 60px rgba(59,130,246,0.75)",
            }}
          >
            {sl.button ?? s.site} →
          </div>
        </div>
      );
  }
};

export const Carousel: React.FC<CarouselProps> = ({brand, slides}) => {
  const i = useCurrentFrame();
  const sl = slides[Math.min(i, slides.length - 1)];
  const s = STYLES[brand];
  const last = i === slides.length - 1;
  // робот Aura на обложке и последнем слайде (или где указан mascot)
  const gesture: GestureKind | null =
    brand !== "aura" || sl.mascot === "none" ? null : (sl.mascot as GestureKind | undefined) ?? (sl.kind === "cover" ? "wave" : sl.kind === "cta" ? "pointUp" : null);
  const t = i; // fps 1: кадр = секунда
  return (
    <AbsoluteFill style={s.bg}>
      <AbsoluteFill style={s.pattern} />
      {/* шапка: логотип и счётчик */}
      <div style={{position: "absolute", left: 72, right: 72, top: 64, display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <Logo brand={brand} s={s} />
        <div style={{fontFamily: "JetBrains Mono, monospace", fontWeight: 500, fontSize: 26, color: s.muted, letterSpacing: "0.08em"}}>
          {i + 1} / {slides.length}
        </div>
      </div>
      {/* содержимое */}
      <div style={{position: "absolute", left: 72, right: gesture && sl.kind !== "cta" ? 300 : 72, top: 170, bottom: 150}}>
        <SlideBody sl={sl} s={s} brand={brand} last={last} />
      </div>
      {/* подвал: сайт и стрелка «листай» */}
      <div style={{position: "absolute", left: 72, right: 72, bottom: 64, display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <div style={{fontFamily: "JetBrains Mono, monospace", fontSize: 26, color: s.muted}}>{s.site}</div>
        {last ? null : (
          <div style={{display: "flex", alignItems: "center", gap: 14, fontFamily: s.body, fontWeight: 600, fontSize: 26, color: s.ink}}>
            листай
            <div style={{width: 64, height: 64, borderRadius: 32, background: s.marker ? s.accent : s.accent, display: "flex", alignItems: "center", justifyContent: "center"}}>
              <svg width={30} height={30} viewBox="0 0 30 30">
                <path d="M6 15 H23 M16 8 L23 15 L16 22" fill="none" stroke={s.marker ? "#262626" : "#FFFFFF"} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}
      </div>
      {gesture ? (
        <AuraMascot
          scale={1.2}
          plan={{
            stays: [{at: -10, x: sl.kind === "cta" ? 830 : 900, y: sl.kind === "cta" ? 1170 : 1160, face: -0.35}],
            gestures: [{at: t - GESTURE_DUR[gesture] * 0.42, kind: gesture}],
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

export const CAROUSEL = {width: W, height: H};
