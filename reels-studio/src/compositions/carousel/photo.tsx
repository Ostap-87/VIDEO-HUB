// Фото-слайды карусели (решение пользователя 10.10.2026): фото главное, текст коротко.
// photoCover — обложка с крупным фото (в рамке — карточка сверху; frame: false или layout: full — фото на весь слайд);
// photoCard — фото-карточка + заголовок + текст; photoFull — фото на весь слайд, текст на плашке внизу;
// photoPair — два фото с подписями (compare — «обычно / с нами», story — два кадра одной истории; row или column);
// photoStat — фото + крупная цифра на плашке; photoCta — финал: коллаж из 2–3 фото, заголовок, кнопка сайта.
// Все размеры в пределах полей безопасности (kit.tsx: SAFE, CONTENT); текст подгоняется под место (FitBox).
import React from "react";
import {AbsoluteFill} from "remotion";
import {
  Body,
  Caption,
  Chip,
  CONTENT,
  CtaButton,
  FitBox,
  Kicker,
  logoList,
  LogoBadges,
  MIN_FONT,
  Photo,
  Pill,
  Plate,
  PlateFooter,
  SAFE,
  Source,
  Title,
  typo,
  useFit,
  type BrandId,
  type Style,
} from "./kit";
import type {Pic, Slide} from "./schema";

type P = {sl: Slide; s: Style; brand: BrandId; last: boolean; mascot: boolean};

const toPic = (p: string | Pic): Pic => (typeof p === "string" ? {src: p} : p);
const picsOf = (sl: Slide): Pic[] => (sl.images ?? []).map(toPic);
const mainPic = (sl: Slide): Pic | null => (sl.image ? {src: sl.image, focus: sl.focus, zoom: sl.zoom} : picsOf(sl)[0] ?? null);

// содержимое в пределах полей; FitBox уменьшает текст, если не влезает
const box: React.CSSProperties = {position: "absolute", ...CONTENT, display: "flex", flexDirection: "column"};
// место под робота Aura справа внизу (стоит на линии низа содержимого)
export const MASCOT_SPOT = {x: 880, y: 1350 - CONTENT.bottom, scale: 1.2, room: 270};

const Missing: React.FC<{s: Style; style?: React.CSSProperties}> = ({s, style}) => (
  <div style={{background: s.photo.empty, borderRadius: s.photo.radius, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: s.body, fontSize: MIN_FONT, color: s.muted, ...style}}>
    нет фото (image)
  </div>
);

// Подача фото (решение пользователя 10.10.2026): слайды «без рамки» (фото на весь слайд, плашка с текстом поверх)
// чередуются со слайдами «в рамке» (фото в карточке со скруглением на фоне бренда). Поле frame: true / false;
// по умолчанию без рамки — photoFull (и photoCover с layout: "full"), в рамке — остальные. photoPair и photoCta — всегда в рамке.
export const frameOf = (sl: Slide): boolean => {
  if (sl.kind === "photoFull") return sl.frame ?? false;
  if (sl.kind === "photoCover") return sl.frame ?? sl.layout !== "full";
  return sl.frame ?? true;
};

// Фото + плашка с текстом поверх. Без рамки: фото на весь слайд, плашка доходит до нижнего поля (64 px), подвал
// (сайт, «листай») — внутри плашки. В рамке (photoFull с frame: true): фото в карточке, плашка внутри неё, подвал обычный.
// stat — на плашке крупная цифра (photoStat без рамки).
const Overlay: React.FC<P & {titleSize: number; top: number; framed?: boolean; stat?: boolean}> = ({sl, s, last, titleSize, top, framed, stat}) => {
  const pic = mainPic(sl);
  const logos = logoList(sl.logo);
  const extras =
    logos.length || sl.caption ? (
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginBottom: 20}}>
        <LogoBadges logos={logos} inline />
        {sl.caption ? (
          <Pill s={s} style={{fontFamily: "JetBrains Mono, monospace", fontWeight: 500, fontSize: MIN_FONT, color: s.ink, marginLeft: "auto", minWidth: 0}}>
            <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{sl.caption}</span>
          </Pill>
        ) : null}
      </div>
    ) : null;
  const plate = (
    <Plate s={s} style={{padding: framed ? "30px 36px" : "34px 40px 26px", flexShrink: 0, display: "flex", flexDirection: "column"}}>
      <Kicker text={sl.kicker} s={s} style={stat ? {marginBottom: 10} : undefined} />
      {stat ? <Value text={sl.value} s={s} /> : null}
      <Title text={sl.title} s={s} size={stat ? 46 : titleSize} lh={stat ? 1.14 : 1.06} isKey={sl.kind === "photoCover"} style={stat ? {marginTop: 14} : undefined} />
      <Body text={sl.text} s={s} size={stat ? 34 : 36} style={{marginTop: stat ? 12 : 16}} />
      <Source text={sl.source} s={s} style={{marginTop: 14}} />
      {framed ? null : <PlateFooter s={s} last={last} />}
    </Plate>
  );
  if (framed)
    return (
      <FitBox style={box}>
        {pic ? (
          <Photo pic={pic} s={s} style={{flex: "1 1 0", minHeight: 600}}>
            <div style={{position: "absolute", left: 24, right: 24, top: 24, bottom: 24, display: "flex", flexDirection: "column"}}>
              <div style={{marginTop: "auto"}} />
              {extras}
              {plate}
            </div>
          </Photo>
        ) : (
          <Missing s={s} style={{flex: "1 1 0", minHeight: 600}} />
        )}
      </FitBox>
    );
  return (
    <>
      <AbsoluteFill>{pic ? <Photo pic={pic} s={s} framed={false} style={{position: "absolute", inset: 0}} /> : <Missing s={s} style={{position: "absolute", inset: 0, borderRadius: 0}} />}</AbsoluteFill>
      <FitBox style={{position: "absolute", left: SAFE.side, right: SAFE.side, top, bottom: SAFE.bottom, display: "flex", flexDirection: "column"}}>
        <div style={{marginTop: "auto"}} />
        {extras}
        {plate}
      </FitBox>
    </>
  );
};

const PhotoCover: React.FC<P> = (p) => {
  const {sl, s, mascot} = p;
  if (!frameOf(sl)) return <Overlay {...p} titleSize={78} top={440} />;
  const pic = mainPic(sl);
  return (
    <FitBox style={box}>
      {pic ? (
        <Photo pic={pic} s={s} style={{flex: "1 1 0", minHeight: 500}}>
          <LogoBadges logos={logoList(sl.logo)} />
        </Photo>
      ) : (
        <Missing s={s} style={{flex: "1 1 0", minHeight: 500}} />
      )}
      <Caption text={sl.caption} s={s} style={{marginTop: 16}} />
      <div style={{marginTop: 36, paddingRight: mascot ? MASCOT_SPOT.room : 0}}>
        <Kicker text={sl.kicker} s={s} />
        <Title text={sl.title} s={s} size={84} lh={1.04} isKey />
        <Body text={sl.text} s={s} size={38} style={{marginTop: 18}} />
      </div>
    </FitBox>
  );
};

const PhotoCard: React.FC<P> = (p) => {
  const {sl, s, mascot} = p;
  if (!frameOf(sl)) return <Overlay {...p} titleSize={64} top={500} />;
  const pic = mainPic(sl);
  return (
    <FitBox style={box}>
      {pic ? (
        <Photo pic={pic} s={s} style={{flex: "1 1 0", minHeight: 440}}>
          <LogoBadges logos={logoList(sl.logo)} />
        </Photo>
      ) : (
        <Missing s={s} style={{flex: "1 1 0", minHeight: 440}} />
      )}
      <Caption text={sl.caption} s={s} style={{marginTop: 16}} />
      <div style={{marginTop: 34, paddingRight: mascot ? MASCOT_SPOT.room : 0}}>
        <Kicker text={sl.kicker} s={s} />
        <Title text={sl.title} s={s} size={62} />
        <Body text={sl.text} s={s} size={36} style={{marginTop: 16}} />
        <Source text={sl.source} s={s} style={{marginTop: 14}} />
      </div>
    </FitBox>
  );
};

const PhotoFull: React.FC<P> = (p) => <Overlay {...p} titleSize={64} top={500} framed={frameOf(p.sl)} />;

// значок между фото в сравнении
const Connector: React.FC<{s: Style}> = ({s}) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      translate: "-50% -50%",
      width: 84,
      height: 84,
      borderRadius: 42,
      background: s.marker ? s.accent : "#FFFFFF",
      border: s.marker ? "2px solid #262626" : "6px solid #1D50CD",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <svg width={36} height={36} viewBox="0 0 30 30">
      <path d="M6 15 H23 M16 8 L23 15 L16 22" fill="none" stroke={s.marker ? "#262626" : "#2563EB"} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

// подпись под фото пары — это главный текст слайда, поэтому крупнее и темнее обычной подписи
const PairCaption: React.FC<{text?: string; s: Style; style?: React.CSSProperties}> = ({text, s, style}) => {
  const k = useFit();
  return text ? (
    <div data-safe="" style={{fontFamily: s.body, fontWeight: 500, fontSize: Math.max(MIN_FONT, Math.round(34 * k)), lineHeight: 1.3, color: s.ink, ...style}}>
      {typo(text)}
    </div>
  ) : null;
};

const PhotoPair: React.FC<P> = ({sl, s}) => {
  const pics = picsOf(sl).slice(0, 2);
  const compare = (sl.pair ?? "compare") === "compare";
  const tone = (i: number) => (compare ? (i === 0 ? "dim" : "accent") : "plain") as "dim" | "accent" | "plain";
  const head = (
    <div>
      <Kicker text={sl.kicker} s={s} />
      <Title text={sl.title} s={s} size={60} />
    </div>
  );
  if (sl.layout === "column") {
    // два фото друг под другом — для горизонтальных кадров (16:9)
    return (
      <FitBox style={box}>
        {head}
        {pics.map((p, i) => (
          <React.Fragment key={i}>
            <Photo pic={p} s={s} style={{flex: "1 1 0", minHeight: 250, marginTop: i === 0 ? 30 : 24}}>
              {p.label ? <Chip text={p.label} s={s} tone={tone(i)} style={{position: "absolute", left: 20, top: 20}} /> : null}
              <LogoBadges logos={logoList(p.logo)} />
            </Photo>
            <PairCaption text={p.caption} s={s} style={{marginTop: 12}} />
          </React.Fragment>
        ))}
        <Body text={sl.text} s={s} size={34} style={{marginTop: 20}} />
      </FitBox>
    );
  }
  return (
    <FitBox style={box}>
      {head}
      <div style={{flex: "1 1 0", minHeight: 400, display: "flex", gap: 24, marginTop: 34, position: "relative"}}>
        {pics.map((p, i) => (
          <Photo key={i} pic={p} s={s} style={{flex: 1}}>
            {p.label ? <Chip text={p.label} s={s} tone={tone(i)} style={{position: "absolute", left: 18, top: 18, maxWidth: "calc(100% - 36px)"}} /> : null}
            <LogoBadges logos={logoList(p.logo)} />
          </Photo>
        ))}
        {compare && pics.length === 2 ? <Connector s={s} /> : null}
      </div>
      {pics.some((p) => p.caption) ? (
        <div style={{display: "flex", gap: 24, marginTop: 18}}>
          {pics.map((p, i) => (
            <div key={i} style={{flex: 1, minWidth: 0}}>
              <PairCaption text={p.caption} s={s} />
            </div>
          ))}
        </div>
      ) : null}
      <Body text={sl.text} s={s} size={34} style={{marginTop: 20}} />
    </FitBox>
  );
};

// крупная цифра: GTT — синяя со свечением (Unbounded), Aura — графитовая с лимонным маркером (Inter 800)
const Value: React.FC<{text?: string; s: Style}> = ({text, s}) => {
  const k = useFit();
  if (!text) return null;
  const base = text.length > 6 ? 150 : text.length > 4 ? 180 : 210;
  return (
    <div
      data-safe=""
      style={{
        fontFamily: s.head,
        fontWeight: s.marker ? 800 : 700,
        fontSize: Math.round(base * k),
        lineHeight: 1,
        letterSpacing: s.marker ? "-0.04em" : "0",
        whiteSpace: "nowrap",
        color: s.marker ? s.ink : s.accent,
        textShadow: s.glow,
        backgroundImage: s.marker ? `linear-gradient(${s.accent}, ${s.accent})` : undefined,
        backgroundSize: "100% 38%",
        backgroundPosition: "0 82%",
        backgroundRepeat: "no-repeat",
        alignSelf: "flex-start",
        paddingRight: s.marker ? 8 : 0,
      }}
    >
      {text}
    </div>
  );
};

const PhotoStat: React.FC<P> = (p) => {
  const {sl, s, mascot} = p;
  if (!frameOf(sl)) return <Overlay {...p} titleSize={46} top={420} stat />;
  const pic = mainPic(sl);
  const OVERLAP = 96; // плашка с цифрой заходит на фото снизу
  return (
    <FitBox style={box}>
      {pic ? (
        <Photo pic={pic} s={s} style={{flex: "1 1 0", minHeight: 400}}>
          {sl.caption ? (
            <Pill s={s} style={{position: "absolute", left: 20, top: 20, maxWidth: "calc(100% - 40px)", fontFamily: "JetBrains Mono, monospace", fontWeight: 500, fontSize: MIN_FONT, color: s.ink}}>
              <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{sl.caption}</span>
            </Pill>
          ) : null}
          <LogoBadges logos={logoList(sl.logo)} style={{bottom: OVERLAP + 24}} />
        </Photo>
      ) : (
        <Missing s={s} style={{flex: "1 1 0", minHeight: 400}} />
      )}
      <Plate s={s} style={{marginTop: -OVERLAP, marginLeft: 32, marginRight: 32, position: "relative", display: "flex", flexDirection: "column", padding: `30px ${mascot ? MASCOT_SPOT.room - 32 : 40}px 32px 40px`, flexShrink: 0}}>
        <Kicker text={sl.kicker} s={s} style={{marginBottom: 10}} />
        <Value text={sl.value} s={s} />
        <Title text={sl.title} s={s} size={46} lh={1.14} style={{marginTop: 14}} />
        <Body text={sl.text} s={s} size={34} style={{marginTop: 12}} />
        <Source text={sl.source} s={s} style={{marginTop: 12}} />
      </Plate>
    </FitBox>
  );
};

// коллаж финала: 3 фото — большое слева и два справа, 2 фото — рядом
const Collage: React.FC<{pics: Pic[]; s: Style; style?: React.CSSProperties}> = ({pics, s, style}) => {
  const gap = 16;
  if (pics.length >= 3)
    return (
      <div style={{display: "flex", gap, ...style}}>
        <Photo pic={pics[0]} s={s} style={{flex: 1.3}} />
        <div style={{flex: 1, display: "flex", flexDirection: "column", gap}}>
          <Photo pic={pics[1]} s={s} style={{flex: 1}} />
          <Photo pic={pics[2]} s={s} style={{flex: 1}} />
        </div>
      </div>
    );
  return (
    <div style={{display: "flex", gap, ...style}}>
      {pics.slice(0, 2).map((p, i) => (
        <Photo key={i} pic={p} s={s} style={{flex: 1}} />
      ))}
    </div>
  );
};

const PhotoCta: React.FC<P> = ({sl, s, mascot}) => {
  const pics = picsOf(sl);
  if (!pics.length && sl.image) pics.push({src: sl.image, focus: sl.focus, zoom: sl.zoom});
  return (
    <FitBox style={box}>
      {pics.length ? <Collage pics={pics} s={s} style={{flex: "1 1 0", minHeight: 380, maxHeight: mascot ? 600 : undefined}} /> : null}
      <div style={{marginTop: "auto", paddingTop: 40, paddingRight: mascot ? MASCOT_SPOT.room : 0, display: "flex", flexDirection: "column"}}>
        <Kicker text={sl.kicker} s={s} />
        <Title text={sl.title} s={s} size={70} />
        <Body text={sl.text} s={s} size={36} style={{marginTop: 18}} />
        <CtaButton text={sl.button ?? s.site} s={s} style={{marginTop: 36}} />
      </div>
    </FitBox>
  );
};

export const PHOTO_KINDS = ["photoCover", "photoCard", "photoFull", "photoPair", "photoStat", "photoCta"] as const;
export const isPhotoKind = (k: string) => (PHOTO_KINDS as readonly string[]).includes(k);
// без рамки (фото на весь слайд): шапка на «пилюлях», подвал внутри плашки, робота нет
export const isFullBleed = (sl: Slide) => isPhotoKind(sl.kind) && !frameOf(sl);

export const PhotoSlide: React.FC<P> = (p) => {
  switch (p.sl.kind) {
    case "photoCover":
      return <PhotoCover {...p} />;
    case "photoCard":
      return <PhotoCard {...p} />;
    case "photoFull":
      return <PhotoFull {...p} />;
    case "photoPair":
      return <PhotoPair {...p} />;
    case "photoStat":
      return <PhotoStat {...p} />;
    case "photoCta":
      return <PhotoCta {...p} />;
    default:
      return null;
  }
};
