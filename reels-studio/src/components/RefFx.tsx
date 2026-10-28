// Приёмы из референсов Монтажной 23.10.2026 (решение пользователя: «Забери все эффекты, которые есть в ролике»):
// xkzv9pa «Монтаж через нейросети» и d4ws46x «Монтируй через…». Поля TalkReelPro:
// splits — «до / после»: два экрана друг под другом на размытой копии кадра, пилюли-подписи, @ник в углу;
// titles — заголовок «шрифт с засечками / узкий гротеск + рукопись поверх», полоса-призыв («ПИШИ / летим»);
// captionsAt — другие субтитры на отрезке: бежевая плашка, угловые в 2 строки (вторая золотом), тихие слева;
// chats — окно чата: прикреплённый кадр, текст печатается, кнопка «отправить» нажимается;
// floats — картинки вылетают из-за головы и парят вокруг; cards — карточка (книга, тур, товар) парит у груди;
// outros — финал: кадр темнеет, иконка соцсети становится цветной, @ник; fx «leak» — тёплая вспышка света.
// Макро-наезд (zooms kind «macro») — в TalkReelPro, спикер на фоне приложения (speaker bg «app») — в MontazhFx.
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {loadFont as loadPrata} from "@remotion/google-fonts/Prata";
import {loadFont as loadVibes} from "@remotion/google-fonts/GreatVibes";
import {loadFont as loadCormorant} from "@remotion/google-fonts/CormorantGaramond";
import {loadFont as loadOswald} from "@remotion/google-fonts/Oswald";
import {SpeakerVideo} from "./EdlVideo";
import {amountAt} from "./MontazhFx";
import {useBrand} from "../brand";

const prata = loadPrata("normal", {weights: ["400"], subsets: ["cyrillic", "latin"]});
const vibes = loadVibes("normal", {weights: ["400"], subsets: ["cyrillic", "latin"]});
const cormorant = loadCormorant("normal", {weights: ["600"], subsets: ["cyrillic", "latin"]});
const oswald = loadOswald("normal", {weights: ["600", "700"], subsets: ["cyrillic", "latin"]});

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const url = (s: string) => (/^(https?:|blob:|data:)/.test(s) ? s : staticFile(s));
const isVideo = (s: string) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(s) || /^montazh-local\/.*\/v/.test(s);
const sec = (fps: number, s: number) => Math.max(1, Math.round(s * fps));
type Focus = {x: number; y: number};

// фото или видео (видео — без звука, с начала отрезка)
export const Media: React.FC<{src: string; style?: React.CSSProperties}> = ({src, style}) =>
  isVideo(src) ? <OffthreadVideo src={url(src)} muted style={{width: "100%", height: "100%", objectFit: "cover", ...style}} /> : <Img src={url(src)} style={{width: "100%", height: "100%", objectFit: "cover", ...style}} />;

// кадр спикера в окне w×h: глаза на доле eye высоты окна, k — во сколько раз крупнее «весь кадр по ширине»
export const FaceCrop: React.FC<{video: string; trim: number; focus: Focus; w: number; h: number; k: number; eye: number; filter?: string}> = ({video, trim, focus, w, h, k, eye, filter}) => {
  const vw = w * k;
  const vh = (vw * 1920) / 1080;
  const left = Math.min(0, Math.max(w - vw, w / 2 - focus.x * (vw / 1080)));
  const top = Math.min(0, Math.max(h - vh, h * eye - focus.y * (vh / 1920)));
  return <SpeakerVideo src={video} trimBefore={trim} style={{position: "absolute", width: vw, height: vh, maxWidth: "none", left, top, objectFit: "cover", filter}} />;
};

// ------------------------------------------------------------------ иконки соцсетей (свои контуры, без чужих файлов)
const IG_GRAD = "linear-gradient(45deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)";
export const NetIcon: React.FC<{net?: "instagram" | "telegram" | "site"; size: number; color?: number}> = ({net = "instagram", size, color = 1}) => {
  // color: 0 — белый контур, 1 — фирменный цвет сети
  const bg = net === "telegram" ? "#29A9EB" : net === "site" ? "#2563EB" : IG_GRAD;
  const s = size;
  return (
    <div style={{position: "relative", width: s, height: s}}>
      <div style={{position: "absolute", inset: 0, borderRadius: net === "instagram" ? s * 0.28 : "50%", background: bg, opacity: color}} />
      <svg width={s} height={s} viewBox="0 0 100 100" style={{position: "absolute", inset: 0}}>
        {net === "instagram" ? (
          <>
            <rect x={color > 0.5 ? 20 : 6} y={color > 0.5 ? 20 : 6} width={color > 0.5 ? 60 : 88} height={color > 0.5 ? 60 : 88} rx={color > 0.5 ? 17 : 25} fill="none" stroke="#FFF" strokeWidth={color > 0.5 ? 7 : 8} />
            <circle cx={50} cy={50} r={color > 0.5 ? 14 : 21} fill="none" stroke="#FFF" strokeWidth={color > 0.5 ? 7 : 8} />
            <circle cx={color > 0.5 ? 66 : 74} cy={color > 0.5 ? 34 : 26} r={color > 0.5 ? 4 : 6} fill="#FFF" />
          </>
        ) : net === "telegram" ? (
          <>
            {color < 0.5 ? <circle cx={50} cy={50} r={45} fill="none" stroke="#FFF" strokeWidth={7} /> : null}
            <path d="M24 49 L72 30 L64 72 L49 61 L41 69 L42 57 L64 38 L36 54 Z" fill="#FFF" />
          </>
        ) : (
          <>
            <circle cx={50} cy={50} r={color > 0.5 ? 30 : 44} fill="none" stroke="#FFF" strokeWidth={6} />
            <ellipse cx={50} cy={50} rx={color > 0.5 ? 13 : 19} ry={color > 0.5 ? 30 : 44} fill="none" stroke="#FFF" strokeWidth={5} />
            <line x1={color > 0.5 ? 20 : 6} y1={50} x2={color > 0.5 ? 80 : 94} y2={50} stroke="#FFF" strokeWidth={5} />
          </>
        )}
      </svg>
    </div>
  );
};

// ------------------------------------------------------------------ «до / после»: два экрана
export type SplitItem = {at: number; until: number; top?: string; bottom?: string; src?: string; handle?: string};
// карточки внутри безопасной зоны Reels (сверху 250, снизу 380): между ними — место под плашку субтитров (y ≈ 915)
export const SPLIT = {x: 48, w: 984, top: 330, h: 520, gap: 130};
export const SPLIT_PLATE_Y = SPLIT.top + SPLIT.h + SPLIT.gap / 2;

const Pill: React.FC<{text: string}> = ({text}) => {
  const B = useBrand();
  const od = B.id === "od";
  return (
    <div
      style={{
        position: "absolute",
        left: 26,
        bottom: 24,
        padding: "8px 22px 9px",
        borderRadius: B.square ? 0 : 40,
        background: od ? "#F7F4EC" : "rgba(244,236,226,0.94)",
        border: od ? "3px solid #191922" : undefined,
        color: "#2B2420",
        fontFamily: oswald.fontFamily,
        fontWeight: 600,
        fontSize: 30,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
};

const SplitOne: React.FC<{it: SplitItem; video: string; focus: Focus; grade?: string}> = ({it, video, focus, grade}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = it.at + frame / fps;
  const trim = Math.round(it.at * fps);
  const p = amountAt(t, it.at, it.until, 0.45, 0.4);
  const out = interpolate(t, [it.until - 0.4, it.until], [1, 0], {...clamp, easing: ease});
  const kTop = spring({frame, fps, config: {damping: 17, stiffness: 150}}) * out;
  const kBot = spring({frame: frame - 4, fps, config: {damping: 17, stiffness: 150}}) * out;
  // иконка соцсети в углу верхнего экрана то белая, то цветная (как в референсе)
  const glow = it.handle ? interpolate((t - it.at) % 2.4, [0.9, 1.2, 2.0, 2.3], [0, 1, 1, 0], clamp) : 0;
  const card = (y: number, slide: number): React.CSSProperties => ({
    position: "absolute",
    left: SPLIT.x,
    top: y,
    width: SPLIT.w,
    height: SPLIT.h,
    overflow: "hidden",
    borderRadius: B.square ? 0 : 44,
    border: B.id === "od" ? "4px solid #191922" : undefined,
    boxShadow: B.square ? "12px 12px 0 #191922" : "0 26px 60px rgba(0,0,0,0.38)",
    translate: `${slide}px 0px`,
    background: "#111",
  });
  return (
    <AbsoluteFill style={{opacity: Math.min(1, p * 1.6)}}>
      {/* фон — та же сцена, крупно и размыто */}
      <SpeakerVideo src={video} trimBefore={trim} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", scale: "1.35", filter: "blur(40px) brightness(0.78) saturate(1.2)"}} />
      <div style={card(SPLIT.top, (1 - kTop) * -1200)}>
        <FaceCrop video={video} trim={trim} focus={focus} w={SPLIT.w} h={SPLIT.h} k={1.35} eye={0.36} filter={[grade, "contrast(1.06) saturate(1.12)"].filter(Boolean).join(" ")} />
        {it.handle ? (
          <div style={{position: "absolute", right: 30, top: 26, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6}}>
            <NetIcon size={52} color={glow} />
            <div style={{fontFamily: oswald.fontFamily, fontWeight: 600, fontSize: 20, color: "#FFF", letterSpacing: "0.04em", textShadow: "0 2px 6px rgba(0,0,0,0.6)"}}>{it.handle.startsWith("@") ? it.handle : `@${it.handle}`}</div>
          </div>
        ) : null}
        <Pill text={it.top ?? "Монтаж"} />
      </div>
      <div style={card(SPLIT.top + SPLIT.h + SPLIT.gap, (1 - kBot) * 1200)}>
        {it.src ? <Media src={it.src} /> : <FaceCrop video={video} trim={trim} focus={focus} w={SPLIT.w} h={SPLIT.h} k={1} eye={0.3} />}
        <Pill text={it.bottom ?? "Оригинал"} />
      </div>
    </AbsoluteFill>
  );
};

export const Splits: React.FC<{items?: SplitItem[]; video: string; focus: Focus; grade?: string}> = ({items, video, focus, grade}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`split-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="До / после">
          <SplitOne it={it} video={video} focus={focus} grade={grade} />
        </Sequence>
      ))}
    </>
  );
};
export const splitActive = (items: SplitItem[] | undefined, t: number) => (items ?? []).some((x) => t >= x.at && t <= x.until);

// ------------------------------------------------------------------ заголовок «шрифт + рукопись»
export type TitleItem = {
  at: number;
  until: number;
  text: string;
  script?: string; // рукописная строка поверх; «через / нейросети» — две части: слева снизу и справа снизу
  font?: "serif" | "grotesk" | "box"; // box — строки на белых плашках, как текст TikTok (референс dfcdojr)
  y?: number; // центр строки
  color?: string;
  scriptColor?: string;
  band?: boolean; // тёмная полоса через весь кадр (призыв «ПИШИ»)
  plane?: "behind" | "front";
  // приёмы из каталога skillry (23.10.2026, своим кодом): bg — заголовок на чистом фоне (кадр спикера скрыт), sub — строка
  // под ним, still — без появления (продолжение того же заголовка), strikeAt — с какой секунды от начала слово зачёркивается,
  // echo — эхо-вспышка (две затухающие копии крупнее)
  bg?: string;
  sub?: string;
  still?: boolean;
  strikeAt?: number;
  echo?: boolean;
};

// заголовок на белых плашках: каждая строка — своя плашка, чёрный жирный текст (строки через /)
const BoxTitle: React.FC<{it: TitleItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const out = interpolate(t, [dur - 0.25, dur], [1, 0], clamp);
  const lines = it.text.split(/\s*\/\s*/).filter(Boolean);
  const longest = Math.max(...lines.map((l) => l.length), 6);
  const size = Math.min(58, 900 / (longest * 0.56));
  return (
    <div style={{position: "absolute", left: 40, right: 40, top: (it.y ?? 1000) - (lines.length * size * 1.25) / 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, opacity: out}}>
      {lines.map((l, i) => {
        const k = spring({frame: frame - i * 3, fps, config: {damping: 16, stiffness: 200}});
        return (
          <span
            key={i}
            style={{
              background: it.color ?? "#FFFFFF",
              color: "#111114",
              fontFamily: B.bodyFont,
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.18,
              padding: "2px 16px 4px",
              borderRadius: B.square ? 0 : i === 0 ? "14px 14px 0 0" : i === lines.length - 1 ? "0 0 14px 14px" : 0,
              marginTop: i ? -1 : 0,
              scale: String(0.85 + 0.15 * k),
              opacity: Math.min(1, k * 1.6),
            }}
          >
            {l}
          </span>
        );
      })}
    </div>
  );
};

const TitleOne: React.FC<{it: TitleItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const dur = it.until - it.at;
  if (it.font === "box") return <BoxTitle it={it} />;
  const serif = (it.font ?? "serif") === "serif";
  const text = it.text.toUpperCase();
  // кегль по длине: слово целиком в кадре (ширина буквы в долях кегля)
  const wk = serif ? 0.74 : 0.5;
  const size = Math.min(serif ? 160 : 300, 960 / (Math.max(3, text.length) * wk));
  const out = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
  const lift = interpolate(t, [dur - 0.3, dur], [0, -24], clamp);
  const parts = (it.script ?? "").split(/\s*\/\s*/).filter(Boolean);
  const sSize = Math.max(90, size * (serif ? 0.78 : 0.52));
  const write = (delay: number) => interpolate(t, [delay, delay + 0.6], [0, 100], {...clamp, easing: Easing.bezier(0.45, 0, 0.3, 1)});
  const band = it.band ? spring({frame, fps, config: {damping: 20, stiffness: 140}}) : 0;
  const strike = it.strikeAt !== undefined ? interpolate(t, [it.strikeAt, it.strikeAt + 0.22], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)}) : 0;
  const echo = it.echo ? interpolate(t, [0.05, 0.9], [1, 0], clamp) : 0;
  const sColor = it.scriptColor ?? "#FFFFFF";
  const script = (txt: string, i: number, pos: React.CSSProperties) => (
    <div
      key={i}
      style={{
        position: "absolute",
        whiteSpace: "nowrap",
        fontFamily: vibes.fontFamily,
        fontSize: sSize,
        lineHeight: 1,
        color: sColor,
        textShadow: "0 0 2px rgba(0,0,0,0.9), 0 2px 3px rgba(0,0,0,0.7), 0 0 18px rgba(0,0,0,0.45)",
        rotate: "-6deg",
        clipPath: `inset(-20% ${100 - write(0.25 + i * 0.3)}% -20% -5%)`,
        ...pos,
      }}
    >
      {txt}
    </div>
  );
  return (
    <AbsoluteFill style={{opacity: out, translate: `0px ${lift}px`}}>
      {it.bg ? <AbsoluteFill style={{background: it.bg, opacity: it.still ? 1 : interpolate(t, [0, 0.15], [0, 1], clamp)}} /> : null}
      {it.band ? (
        <div style={{position: "absolute", left: 0, right: 0, top: (it.y ?? 400) - size * 0.85, height: size * 1.7, background: "rgba(14,14,20,0.55)", scale: `${band} 1`}} />
      ) : null}
      <div style={{position: "absolute", left: 0, right: 0, top: (it.y ?? 400) - size * 0.55, display: "flex", justifyContent: "center"}}>
        <div style={{position: "relative"}}>
          <div style={{display: "flex", overflow: "hidden", paddingTop: size * 0.08, paddingBottom: size * 0.04}}>
            {[...text].map((ch, i) => {
              const k = it.still ? 1 : spring({frame: frame - i * 1.3, fps, config: {damping: 18, stiffness: 170}});
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    whiteSpace: "pre",
                    fontFamily: serif ? prata.fontFamily : oswald.fontFamily,
                    fontWeight: serif ? 400 : 700,
                    fontSize: size,
                    lineHeight: 0.95,
                    letterSpacing: serif ? "0.02em" : "-0.01em",
                    color: it.color ?? "#FFFFFF",
                    textShadow: serif ? "0 6px 26px rgba(0,0,0,0.35)" : "0 8px 30px rgba(0,0,0,0.45)",
                    translate: `0px ${(1 - k) * size * 0.9}px`,
                    opacity: Math.min(1, k * 1.5),
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          {echo > 0
            ? [1.14, 1.3].map((sc, j) => (
                <div key={`echo-${j}`} style={{position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", scale: String(1 + (sc - 1) * (1 - echo * 0.4)), opacity: echo * (j ? 0.18 : 0.34), pointerEvents: "none"}}>
                  <span style={{whiteSpace: "pre", fontFamily: serif ? prata.fontFamily : oswald.fontFamily, fontWeight: serif ? 400 : 700, fontSize: size, lineHeight: 0.95, color: it.color ?? "#FFFFFF"}}>{text}</span>
                </div>
              ))
            : null}
          {strike > 0 ? (
            <div style={{position: "absolute", left: "-3%", top: "50%", height: Math.max(10, size * 0.09), width: `${106 * strike}%`, background: "#FF3B30", borderRadius: 6, rotate: "-4deg", boxShadow: "0 4px 14px rgba(0,0,0,0.35)"}} />
          ) : null}
          {it.sub ? (
            <div style={{position: "absolute", left: 0, right: 0, top: "100%", marginTop: size * 0.12, textAlign: "center", whiteSpace: "nowrap", fontFamily: oswald.fontFamily, fontWeight: 600, fontSize: Math.max(40, size * 0.24), letterSpacing: "0.06em", textTransform: "uppercase", color: it.color ?? "#FFFFFF", opacity: interpolate(t, [0.25, 0.5], [0, 0.9], clamp)}}>
              {it.sub}
            </div>
          ) : null}
          {parts.length >= 2
            ? [script(parts[0], 0, {left: -size * 0.12, top: size * (serif ? 0.5 : 0.58)}), script(parts[1], 1, {right: -size * 0.1, top: size * (serif ? 0.5 : 0.58)})]
            : parts.length === 1
              ? [script(parts[0], 0, serif ? {right: -size * 0.3, top: size * 0.45} : {left: "50%", translate: "-40% 0px", top: size * 0.62})]
              : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Titles: React.FC<{items?: TitleItem[]; plane: "behind" | "front"}> = ({items, plane}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? [])
        .filter((it) => (it.plane ?? "front") === plane)
        .map((it, i) => (
          <Sequence key={`title-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Заголовок + рукопись">
            <TitleOne it={it} />
          </Sequence>
        ))}
    </>
  );
};
export const titleBehindActive = (items: TitleItem[] | undefined, t: number) => (items ?? []).some((it) => it.plane === "behind" && t >= it.at - 0.05 && t <= it.until + 0.05);

// ------------------------------------------------------------------ субтитры в стиле референсов
export type CapStyleItem = {at: number; until: number; style: "plate" | "corner" | "quiet" | "mini" | "duo" | "ladder" | "marker" | "pill" | "none"; y?: number};
type W = {text: string; start: number; end: number};
export const capStyleAt = (items: CapStyleItem[] | undefined, t: number) => (items ?? []).find((x) => t >= x.at && t < x.until);

// страницы субтитров: до max слов, новая страница после точки, запятой или паузы > 0,5 с
function pagesOf(words: W[], max: number) {
  const pages: W[][] = [];
  let cur: W[] = [];
  for (const w of words) {
    const prev = cur[cur.length - 1];
    if (cur.length >= max || (prev && (/[.,!?;:…]$/.test(prev.text) || w.start - prev.end > 0.5))) {
      pages.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) pages.push(cur);
  return pages;
}
const bare = (s: string) => s.replace(/[«»"“”]/g, "");

export const RefCaptions: React.FC<{words: W[]; items?: CapStyleItem[]; until: number; accent?: string[]; focus?: Focus}> = ({words, items, until, accent = [], focus = {x: 540, y: 700}}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const item = capStyleAt(items, t);
  const max = item?.style === "quiet" ? 5 : item?.style === "mini" ? 2 : item?.style === "duo" ? 5 : item?.style === "ladder" ? 4 : 4;
  const pages = React.useMemo(() => pagesOf(words, max), [words, max]);
  if (!item || t >= until || item.style === "none") return null; // none — субтитров на отрезке нет (планшет повторяет речь)
  const page = [...pages].reverse().find((pg) => pg[0].start <= t);
  if (!page || t > page[page.length - 1].end + 0.45) return null;
  const since = t - page[0].start;
  if (item.style === "plate") {
    // бежевая плашка с тонкими буквами с засечками, строчными (как «я нашла», «самый простой способ»)
    const k = interpolate(since, [0, 0.12], [0, 1], clamp);
    const od = B.id === "od";
    return (
      <div style={{position: "absolute", left: 60, right: 60, top: (item.y ?? 1240) - 40, display: "flex", justifyContent: "center", opacity: k, scale: String(0.96 + 0.04 * k)}}>
        <span
          style={{
            background: od ? "#F7F4EC" : "#E9DACA",
            border: od ? "3px solid #191922" : undefined,
            color: "#46382D",
            fontFamily: cormorant.fontFamily,
            fontWeight: 600,
            fontSize: 54,
            lineHeight: 1.1,
            padding: "4px 20px 8px",
            borderRadius: B.square ? 0 : 6,
            boxShadow: "0 8px 22px rgba(0,0,0,0.18)",
            textAlign: "center",
          }}
        >
          {page.map((w) => bare(w.text).toLowerCase()).join(" ")}
        </span>
      </div>
    );
  }
  if (item.style === "corner") {
    // жирный узкий курсив капсом справа, слова выскакивают по одному, вторая строка — золотом
    const half = Math.ceil(page.length / 2);
    const lines = [page.slice(0, half), page.slice(half)].filter((l) => l.length);
    const chars = Math.max(...lines.map((l) => l.reduce((n, w) => n + w.text.length + 1, 0)));
    const size = Math.round(Math.min(96, 640 / (chars * 0.5)));
    return (
      <div style={{position: "absolute", right: 70, bottom: 1920 - (item.y ?? 1330), textAlign: "right", fontFamily: oswald.fontFamily, fontWeight: 700, fontStyle: "italic", fontSize: size, lineHeight: 0.98, textTransform: "uppercase"}}>
        {lines.map((l, li) => (
          <div key={li} style={{color: li === 0 ? "#FFFFFF" : "#E8C170", textShadow: "0 4px 18px rgba(0,0,0,0.5), 0 2px 0 rgba(0,0,0,0.35)"}}>
            {l.map((w, i) => {
              const k = spring({frame: frame - Math.round(w.start * fps), fps, config: {damping: 14, stiffness: 220}});
              return (
                <span key={i} style={{display: "inline-block", whiteSpace: "pre", opacity: w.start <= t ? Math.min(1, k * 1.6) : 0, scale: String(1.35 - 0.35 * k)}}>
                  {bare(w.text)}
                  {i < l.length - 1 ? " " : ""}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
  const cleanW = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}+%]/gu, "");
  const curIdx = page.reduce((kk, x, j) => (x.start <= t ? j : kk), -1);
  const accentColor = B.id === "od" ? "#FFD92E" : B.id === "aura" ? "#FFF65D" : "#7FB2FF";
  if (item.style === "ladder") {
    // «лестница» сбоку от лица (prompt-motion №22): слово на строку со сдвигом, акцентное — крупнее и цветом
    // лицо слева — лестница справа (от лица вправо), лицо справа — слева (от лица влево); длинное слово уменьшается,
    // чтобы не уйти за край кадра (поле 48 px)
    const side = focus.x < 540 ? 1 : -1;
    const edge = side > 0 ? Math.min(640, focus.x + 200) : Math.max(440, focus.x - 200);
    const avail = side > 0 ? 1032 - edge : edge - 48;
    return (
      <div style={{position: "absolute", top: item.y ?? focus.y - 120, display: "flex", flexDirection: "column", alignItems: side > 0 ? "flex-start" : "flex-end", ...(side > 0 ? {left: edge} : {right: 1080 - edge})}}>
        {page.map((w, i) => {
          if (w.start > t) return null;
          const hot = accent.includes(cleanW(w.text)) || /\d/.test(w.text);
          const txt = bare(w.text).replace(/[.,!?;:…]+$/, "");
          const size = Math.min(hot ? 100 : 66, Math.floor((avail - i * 34) / (Math.max(2, txt.length) * 0.5)));
          const k = spring({frame: frame - Math.round(w.start * fps), fps, config: {damping: 14, stiffness: 220}});
          return (
            <div key={i} style={{[side > 0 ? "paddingLeft" : "paddingRight"]: i * 34, fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: size, lineHeight: 1, color: hot ? accentColor : "#FFFFFF", textTransform: "uppercase", textShadow: "0 5px 18px rgba(0,0,0,0.55)", opacity: Math.min(1, k * 1.6), translate: `${(1 - k) * side * -40}px 0px`, whiteSpace: "nowrap"}}>
              {txt}
            </div>
          );
        })}
      </div>
    );
  }
  if (item.style === "marker" || item.style === "pill") {
    // marker — текущее слово выделяется маркером слева направо; pill — текущее слово на плашке, прошлая страница тускнеет сверху
    const prev = item.style === "pill" ? pages[pages.indexOf(page) - 1] : undefined;
    const showPrev = prev && page[0].start - prev[prev.length - 1].end < 0.6;
    return (
      <div style={{position: "absolute", left: 70, right: 70, top: item.y ?? 1230, textAlign: "center", fontFamily: B.bodyFont, fontWeight: 800, fontSize: 60, lineHeight: 1.25}}>
        {showPrev ? <div style={{fontSize: 44, color: "rgba(255,255,255,0.45)", textShadow: "0 2px 10px rgba(0,0,0,0.5)", marginBottom: 6}}>{prev!.map((w) => bare(w.text)).join(" ")}</div> : null}
        <div>
          {page.map((w, i) => {
            const cur = i === curIdx && t < w.end + 0.3;
            const swipe = interpolate(t, [w.start, w.start + 0.12], [0, 100], clamp);
            const st: React.CSSProperties =
              item.style === "marker"
                ? cur || (accent.includes(cleanW(w.text)) && w.start <= t)
                  ? {backgroundImage: `linear-gradient(${accentColor}, ${accentColor})`, backgroundRepeat: "no-repeat", backgroundSize: `${swipe}% 70%`, backgroundPosition: "0% 70%", color: swipe > 50 ? "#15151B" : "#FFFFFF", padding: "0 8px", borderRadius: B.square ? 0 : 6}
                  : {}
                : cur
                  ? {background: accentColor, color: B.id === "gtt" ? "#FFFFFF" : "#15151B", padding: "0 14px", borderRadius: B.square ? 0 : 14, boxShadow: "0 6px 18px rgba(0,0,0,0.35)"}
                  : {};
            return (
              <span key={i} style={{color: w.start <= t ? "#FFFFFF" : "rgba(255,255,255,0.55)", textShadow: st.background || st.backgroundImage ? "none" : "0 3px 12px rgba(0,0,0,0.6)", ...st}}>
                {bare(w.text)}
                {i < page.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      </div>
    );
  }
  if (item.style === "duo") {
    // двухуровневые: вся фраза мелко сверху, ключевое слово гигантом за головой рисует DuoWord (между видео и вырезкой)
    const k = interpolate(since, [0, 0.12], [0, 1], clamp);
    return (
      <div style={{position: "absolute", left: 80, right: 80, top: item.y ?? 300, textAlign: "center", fontFamily: B.bodyFont, fontWeight: 600, fontSize: 40, lineHeight: 1.2, color: "#FFFFFF", textShadow: "0 2px 10px rgba(0,0,0,0.6)", opacity: k}}>
        {page.map((w) => bare(w.text)).join(" ")}
      </div>
    );
  }
  if (item.style === "mini") {
    // мелкие: по 1–2 слова, жирные белые строчные с тёмной обводкой, над экраном в кадре (референс dfcdojr)
    const k = interpolate(since, [0, 0.08], [0, 1], clamp);
    return (
      <div style={{position: "absolute", left: 60, right: 60, top: (item.y ?? 1110) - 30, textAlign: "center", fontFamily: B.bodyFont, fontWeight: 800, fontSize: 50, lineHeight: 1.1, color: "#FFFFFF", WebkitTextStroke: "8px rgba(10,10,14,0.85)", paintOrder: "stroke fill", opacity: k}}>
        {page.map((w) => bare(w.text).toLowerCase()).join(" ")}
      </div>
    );
  }
  // тихие: небольшие строчные слева, страница целиком, без выделений (как «загрузи в … своё видео»)
  const k = interpolate(since, [0, 0.15], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 110,
        width: 600,
        top: item.y ?? 1160,
        fontFamily: B.bodyFont,
        fontWeight: 400,
        fontSize: 46,
        lineHeight: 1.12,
        color: "#FFFFFF",
        textShadow: "0 2px 12px rgba(0,0,0,0.55)",
        opacity: k,
        translate: `0px ${(1 - k) * 10}px`,
      }}
    >
      {page.map((w) => bare(w.text).toLowerCase()).join(" ")}
    </div>
  );
};

// ключевое слово страницы (акцентное или самое длинное) — гигантом за головой спикера (каталог skillry, T4)
export const DuoWord: React.FC<{words: W[]; items?: CapStyleItem[]; accent: string[]; focus: Focus; faceTop?: number}> = ({words, items, accent, focus, faceTop}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const item = capStyleAt(items, t);
  const pages = React.useMemo(() => pagesOf(words, 5), [words]);
  if (!item || item.style !== "duo") return null;
  const page = [...pages].reverse().find((pg) => pg[0].start <= t);
  if (!page || t > page[page.length - 1].end + 0.45) return null;
  const clean = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}+%]/gu, "");
  const key = page.find((w) => accent.includes(clean(w.text))) ?? [...page].sort((a, b) => clean(b.text).length - clean(a.text).length)[0];
  const word = bare(key.text).replace(/[.,!?;:…]+$/, "").toUpperCase();
  const k = spring({frame: frame - Math.round(Math.max(page[0].start, key.start - 0.05) * fps), fps, config: {damping: 13, stiffness: 160}});
  const size = Math.min(340, 960 / (Math.max(3, word.length) * 0.62)); // буква Oswald капсом ≈ 0,6 кегля: слово во всю ширину без обрезки
  const top = (faceTop ?? focus.y - 230) - size * 0.55;
  return (
    <div style={{position: "absolute", left: 0, right: 0, top, textAlign: "center", fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: size, lineHeight: 1, color: "rgba(255,255,255,0.94)", textShadow: "0 10px 40px rgba(0,0,0,0.35)", opacity: Math.min(1, k * 1.5), scale: String(0.8 + 0.2 * k)}}>
      {word}
    </div>
  );
};

// ------------------------------------------------------------------ обвести, подчеркнуть, галочка, крестик, стрелка — «от руки»
export type MarkItem = {at: number; until: number; kind: "circle" | "underline" | "check" | "cross" | "arrow"; x: number; y: number; w?: number; h?: number; color?: string};

function markPaths(m: MarkItem): string[] {
  const w = m.w ?? 420;
  const h = m.h ?? 170;
  const {x, y} = m;
  if (m.kind === "circle") {
    // овал «от руки»: чуть больше оборота, начало и конец не сходятся
    const pts: string[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = -Math.PI * 0.62 + (i / 64) * Math.PI * 2.18;
      const r = 1 + 0.05 * Math.sin(i * 0.9) + 0.03 * Math.cos(i * 2.3);
      pts.push(`${i ? "L" : "M"}${(x + (w / 2) * r * Math.cos(a)).toFixed(1)},${(y + (h / 2) * r * Math.sin(a) + (i / 64) * h * 0.06).toFixed(1)}`);
    }
    return [pts.join(" ")];
  }
  if (m.kind === "underline") return [`M${x - w / 2},${y + 6} Q${x},${y - 10} ${x + w / 2},${y + 2} L${x + w / 2 - 24},${y + 18}`];
  if (m.kind === "check") return [`M${x - h * 0.45},${y} L${x - h * 0.1},${y + h * 0.38} L${x + h * 0.55},${y - h * 0.45}`];
  if (m.kind === "cross") return [`M${x - h * 0.4},${y - h * 0.4} L${x + h * 0.42},${y + h * 0.38}`, `M${x + h * 0.4},${y - h * 0.42} L${x - h * 0.38},${y + h * 0.4}`];
  // стрелка: дуга к точке (x, y) снизу справа и наконечник
  return [`M${x + w * 0.45},${y + h * 0.9} Q${x + w * 0.42},${y + h * 0.15} ${x + 18},${y + 14}`, `M${x + 58},${y + 4} L${x + 16},${y + 12} L${x + 34},${y + 52}`];
}

export const Marks: React.FC<{items?: MarkItem[]}> = ({items}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  return (
    <svg width={1080} height={1920} style={{position: "absolute", inset: 0, pointerEvents: "none"}}>
      {(items ?? [])
        .filter((m) => t >= m.at && t <= m.until)
        .map((m, i) => {
          const paths = markPaths(m);
          const out = interpolate(t, [m.until - 0.25, m.until], [1, 0], clamp);
          const color = m.color ?? (B.id === "od" ? "#FF4A1F" : B.id === "aura" ? "#FFF65D" : "#FF3B30");
          return (
            <g key={i} opacity={out} style={{filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.45))"}}>
              {paths.map((d, j) => {
                const p0 = m.at + j * 0.22;
                const draw = interpolate(t, [p0, p0 + (m.kind === "circle" ? 0.45 : 0.25)], [0, 1], {...clamp, easing: Easing.bezier(0.45, 0, 0.25, 1)});
                return <path key={j} d={d} fill="none" stroke={color} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />;
              })}
            </g>
          );
        })}
    </svg>
  );
};

// ------------------------------------------------------------------ вопрос зрителю: пузырь от головы с эмодзи
export type AskItem = {at: number; until: number; text: string; emoji?: string; sub?: string; side?: "left" | "right"};

const AskOne: React.FC<{it: AskItem; focus: Focus}> = ({it, focus}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const k = spring({frame, fps, config: {damping: 10, stiffness: 150}});
  const out = interpolate(t, [dur - 0.25, dur], [1, 0], clamp);
  const right = (it.side ?? "right") === "right";
  const wob = Math.sin(t * 3.2) * 1.5;
  const sq = B.square;
  return (
    <div style={{position: "absolute", [right ? "right" : "left"]: 60, top: Math.max(300, focus.y - 470), maxWidth: 600, transformOrigin: right ? "15% 100%" : "85% 100%", scale: String(k), rotate: `${(right ? 3 : -3) + wob}deg`, opacity: out}}>
      <div style={{background: "#FFFFFF", borderRadius: sq ? 0 : 38, border: sq ? "4px solid #191922" : undefined, boxShadow: sq ? "10px 10px 0 #191922" : "0 18px 44px rgba(0,0,0,0.35)", padding: "22px 30px", display: "flex", alignItems: "center", gap: 18}}>
        {it.emoji ? <Img src={url(it.emoji)} style={{width: 84, height: 84}} /> : null}
        <div>
          <div style={{fontFamily: B.bodyFont, fontWeight: 800, fontSize: 46, lineHeight: 1.1, color: "#15151B"}}>{it.text}</div>
          {it.sub ? <div style={{marginTop: 6, fontFamily: B.bodyFont, fontWeight: 600, fontSize: 28, color: "#6B6B76"}}>{it.sub}</div> : null}
        </div>
      </div>
      {/* хвостик к голове */}
      <div style={{position: "absolute", [right ? "left" : "right"]: 70, bottom: -26, width: 0, height: 0, borderLeft: "22px solid transparent", borderRight: "22px solid transparent", borderTop: `30px solid ${sq ? "#191922" : "#FFFFFF"}`, rotate: right ? "18deg" : "-18deg"}} />
    </div>
  );
};

export const Asks: React.FC<{items?: AskItem[]; focus: Focus}> = ({items, focus}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`ask-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Вопрос зрителю">
          <AskOne it={it} focus={focus} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ свой фон за спикером (нужна вырезка)
export type BgItem = {at: number; until: number; kind: "grid" | "paper" | "gradient" | "image"; src?: string; outline?: boolean};
export const bgActive = (items: BgItem[] | undefined, t: number) => (items ?? []).find((x) => t >= x.at - 0.05 && t <= x.until + 0.05);
export const SpeakerBg: React.FC<{it: BgItem; t: number}> = ({it, t}) => {
  const B = useBrand();
  const p = Math.min(interpolate(t, [it.at, it.at + 0.3], [0, 1], clamp), interpolate(t, [it.until - 0.3, it.until], [1, 0], clamp));
  const bg =
    it.kind === "paper"
      ? {background: B.id === "od" ? "#EDEAE2" : B.id === "aura" ? "#F8F6F3" : "#EEEEF2", backgroundImage: "radial-gradient(rgba(25,25,34,0.18) 2px, transparent 2.5px)", backgroundSize: "44px 44px"}
      : it.kind === "gradient"
        ? {background: B.id === "od" ? "linear-gradient(160deg, #FFD92E, #FF4A1F)" : B.id === "aura" ? "linear-gradient(160deg, #F8F6F3, #D9D7D5)" : "linear-gradient(160deg, #215BE2, #0B1530)"}
        : {background: "#0B1020", backgroundImage: "linear-gradient(rgba(91,157,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(91,157,255,0.16) 1px, transparent 1px)", backgroundSize: "60px 60px"};
  return (
    <AbsoluteFill style={{opacity: p, ...(it.kind === "image" ? {} : bg)}}>
      {it.kind === "image" && it.src ? <Media src={it.src} /> : null}
      {it.kind === "grid" ? <AbsoluteFill style={{background: "radial-gradient(ellipse at 50% 35%, rgba(91,157,255,0.28), rgba(0,0,0,0) 60%)"}} /> : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ резкий смаз (whip) и расфокус: фильтр кадра спикера
type FxLike = {type: string; at: number; until?: number; corner?: string};
export const whipAt = (fx: FxLike[] | undefined, t: number) => {
  for (const f of fx ?? []) {
    if (f.type !== "whip") continue;
    const len = f.until ? f.until - f.at : 0.4;
    if (t < f.at || t > f.at + len) continue;
    const q = (t - f.at) / len;
    const k = Math.sin(Math.PI * q);
    const dir = f.corner === "tl" || f.corner === "bl" ? -1 : 1;
    return {x: dir * (q < 0.5 ? k : -k) * 220, blur: k * 46};
  }
  return null;
};
export const defocusAt = (fx: FxLike[] | undefined, t: number) => {
  let b = 0;
  for (const f of fx ?? []) {
    if (f.type !== "defocus") continue;
    const until = f.until ?? f.at + 2;
    b = Math.max(b, Math.min(interpolate(t, [f.at, f.at + 0.35], [0, 1], clamp), interpolate(t, [until - 0.35, until], [1, 0], clamp)));
  }
  return b;
};
// направленное размытие для смаза (CSS blur одинаков во все стороны)
export const WhipFilter: React.FC<{blur: number}> = ({blur}) => (
  <svg width={0} height={0} style={{position: "absolute"}}>
    <filter id="whipblur" x="-20%" y="0%" width="140%" height="100%">
      <feGaussianBlur stdDeviation={`${blur} 0`} />
    </filter>
  </svg>
);

// ------------------------------------------------------------------ окно чата: печатается запрос, кнопка «отправить»
export type ChatItem = {at: number; until: number; text: string; image?: string; label?: string; y?: number};

const ChatOne: React.FC<{it: ChatItem; video: string; focus: Focus}> = ({it, video, focus}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const k = spring({frame, fps, config: {damping: 15, stiffness: 160}});
  const out = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
  const typeFrom = 0.45;
  const typeEnd = Math.min(dur - 0.7, typeFrom + 0.055 * it.text.length);
  const shown = Math.floor(interpolate(t, [typeFrom, typeEnd], [0, it.text.length], clamp));
  const sentAt = typeEnd + 0.2;
  const press = interpolate(t, [sentAt, sentAt + 0.08, sentAt + 0.2], [1, 0.82, 1], clamp);
  const sent = t >= sentAt;
  const attach = spring({frame: frame - 5, fps, config: {damping: 13, stiffness: 180}});
  const cursor = !sent && Math.floor(t * 2.4) % 2 === 0;
  const W0 = 660;
  const accent = B.id === "od" ? "#FF4A1F" : B.id === "aura" ? "#262626" : "#2563EB";
  const sq = B.square;
  return (
    <div
      style={{
        position: "absolute",
        left: (1080 - W0) / 2 + 30,
        top: it.y ?? 1100,
        width: W0,
        opacity: Math.min(1, k * 1.5) * out,
        scale: String(0.7 + 0.3 * k),
        translate: `0px ${(1 - k) * 60}px`,
        transformOrigin: "20% 100%",
      }}
    >
      <div style={{background: "#FFFFFF", borderRadius: sq ? 0 : 30, border: sq ? "3px solid #191922" : undefined, boxShadow: sq ? "10px 10px 0 #191922" : "0 24px 60px rgba(0,0,0,0.32)", padding: "18px 22px 14px"}}>
        <div style={{width: 112, height: 140, borderRadius: sq ? 0 : 14, overflow: "hidden", position: "relative", scale: String(attach), background: "#EEE"}}>
          {it.image ? <Media src={it.image} /> : <FaceCrop video={video} trim={Math.round(it.at * fps)} focus={focus} w={112} h={140} k={1.6} eye={0.42} />}
        </div>
        <div style={{marginTop: 12, minHeight: 44, fontFamily: B.bodyFont, fontWeight: 500, fontSize: 34, color: "#1E1E24", whiteSpace: "pre-wrap"}}>
          {it.text.slice(0, shown)}
          {cursor ? <span style={{color: accent}}>|</span> : null}
        </div>
        <div style={{marginTop: 10, display: "flex", alignItems: "center", gap: 18, color: "#8A8A94", fontFamily: B.bodyFont, fontSize: 26}}>
          <span style={{fontSize: 38, lineHeight: 1}}>+</span>
          <span style={{width: 26, height: 26, borderRadius: "50%", border: "3px solid #9A9AA4"}} />
          <span style={{width: 26, height: 20, borderTop: "3px solid #9A9AA4", borderBottom: "3px solid #9A9AA4"}} />
          <span style={{marginLeft: "auto"}}>{it.label ?? "Монтажная"} ▾</span>
          <div style={{width: 58, height: 58, borderRadius: sq ? 0 : 16, background: sent ? "#3CCF8E" : accent, scale: String(press), display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: 34, fontWeight: 700}}>
            {sent ? "✓" : "↑"}
          </div>
        </div>
      </div>
      {/* значок помощника слева у нижнего края: четырёхлучевая звёздочка в цвете бренда */}
      <div style={{position: "absolute", left: -56, bottom: 40, width: 84, height: 84, borderRadius: sq ? 0 : 22, background: accent, boxShadow: "0 12px 30px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", rotate: `${(1 - k) * -40}deg`}}>
        <svg width={50} height={50} viewBox="0 0 100 100">
          <path d="M50 4 C54 34 66 46 96 50 C66 54 54 66 50 96 C46 66 34 54 4 50 C34 46 46 34 50 4 Z" fill="#FFF" />
        </svg>
      </div>
    </div>
  );
};

export const Chats: React.FC<{items?: ChatItem[]; video: string; focus: Focus}> = ({items, video, focus}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`chat-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Окно чата">
          <ChatOne it={it} video={video} focus={focus} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ картинки вылетают из-за головы и парят вокруг
export type FloatItem = {at: number; until: number; items: string[]; plane?: "behind" | "front"};

const FloatOne: React.FC<{it: FloatItem; focus: Focus}> = ({it, focus}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const spots = [
    {dx: -330, dy: -140, r: -7},
    {dx: 330, dy: -170, r: 6},
    {dx: -320, dy: 330, r: 5},
    {dx: 320, dy: 310, r: -6},
  ];
  return (
    <>
      {it.items.slice(0, 4).map((src, i) => {
        const s = spots[i];
        const k = spring({frame: frame - Math.round(i * 0.18 * fps), fps, config: {damping: 14, stiffness: 120}});
        const outK = interpolate(t, [dur - 0.4 + i * 0.04, dur - 0.1 + i * 0.04], [1, 0], {...clamp, easing: ease});
        const x = Math.max(180, Math.min(900, focus.x + s.dx));
        const y = Math.max(420, Math.min(1420, focus.y + s.dy));
        const bob = Math.sin(t * 2.1 + i * 1.7) * 12;
        const cx = focus.x + (x - focus.x) * k;
        const cy = focus.y + (y - focus.y) * k + bob;
        const sc = (0.25 + 0.75 * k) * outK;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx - 150,
              top: cy - 185,
              width: 300,
              height: 370,
              overflow: "hidden",
              borderRadius: B.square ? 0 : 24,
              border: `6px solid ${B.id === "od" ? "#191922" : "#FFFFFF"}`,
              boxShadow: B.square ? "10px 10px 0 #191922" : "0 22px 50px rgba(0,0,0,0.4)",
              scale: String(Math.max(0, sc)),
              rotate: `${s.r * k + Math.sin(t * 1.3 + i) * 2}deg`,
              opacity: Math.min(1, k * 2) * outK,
            }}
          >
            <Media src={src} />
          </div>
        );
      })}
    </>
  );
};

export const Floats: React.FC<{items?: FloatItem[]; plane: "behind" | "front"; focus: Focus}> = ({items, plane, focus}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? [])
        .filter((it) => (it.plane ?? "behind") === plane)
        .map((it, i) => (
          <Sequence key={`float-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Картинки вокруг головы">
            <FloatOne it={it} focus={focus} />
          </Sequence>
        ))}
    </>
  );
};
export const floatBehindActive = (items: FloatItem[] | undefined, t: number) => (items ?? []).some((it) => (it.plane ?? "behind") === "behind" && t >= it.at - 0.05 && t <= it.until + 0.05);

// ------------------------------------------------------------------ карточка у груди (книга, тур, товар)
export type CardItem = {at: number; until: number; src?: string; title: string; sub?: string; y?: number};

const CardOne: React.FC<{it: CardItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const k = spring({frame, fps, config: {damping: 15, stiffness: 110}});
  const outK = interpolate(t, [dur - 0.4, dur], [1, 0], {...clamp, easing: ease});
  const sq = B.square;
  return (
    <div style={{position: "absolute", left: 0, right: 0, top: it.y ?? 1050, display: "flex", justifyContent: "center", perspective: 1300}}>
      <div
        style={{
          width: 480,
          background: "#FFFFFF",
          borderRadius: sq ? 0 : 28,
          border: sq ? "4px solid #191922" : undefined,
          padding: 18,
          boxShadow: sq ? "12px 12px 0 #191922" : "0 30px 70px rgba(0,0,0,0.42)",
          transform: `translateY(${(1 - k) * 520 + (1 - outK) * 520 + Math.sin(t * 2) * 8}px) rotateX(${8 + (1 - k) * 45}deg) rotateY(${Math.sin(t * 1.3) * 8}deg)`,
          opacity: Math.min(1, k * 2) * outK,
        }}
      >
        {it.src ? (
          <div style={{width: 444, height: 220, overflow: "hidden", borderRadius: sq ? 0 : 16}}>
            <Media src={it.src} />
          </div>
        ) : null}
        <div style={{marginTop: it.src ? 12 : 4, fontFamily: B.bodyFont, fontWeight: 700, fontSize: 32, lineHeight: 1.15, color: "#15151B"}}>{it.title}</div>
        {it.sub ? <div style={{marginTop: 4, fontFamily: B.bodyFont, fontWeight: 400, fontSize: 25, color: "#6B6B76"}}>{it.sub}</div> : null}
      </div>
    </div>
  );
};

export const Cards: React.FC<{items?: CardItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`card-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Карточка у груди">
          <CardOne it={it} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ финал: иконка соцсети и @ник
// grid / gridFrames (референс 28.10.2026) — сначала сетка превью (картинки или кадры самого ролика) с заголовком-словом
// («Напиши «тур»») и пилюлей, потом сетка гаснет и выскакивают иконка и @ник
export type OutroItem = {at: number; until: number; handle: string; network?: "instagram" | "telegram" | "site"; text?: string; title?: string; pill?: string; grid?: string[]; gridFrames?: number; labels?: string[]};

const OutroGrid: React.FC<{it: OutroItem; video?: string; total?: number; focus?: Focus; t: number; dim: number}> = ({it, video, total = 30, focus = {x: 540, y: 700}, t, dim}) => {
  const {fps} = useVideoConfig();
  const B = useBrand();
  const n = Math.min(16, it.grid?.length || it.gridFrames || 0);
  const cols = 4;
  const rows = Math.ceil(n / cols);
  const cw = 196;
  const chh = rows > 3 ? 248 : 262;
  const gap = 14;
  const x0 = (1080 - (cols * cw + (cols - 1) * gap)) / 2;
  const y0 = 470;
  const accent = B.id === "aura" ? "#FFE74A" : B.id === "od" ? "#FF4A1F" : "#E5484D";
  const k = interpolate(t, [0.1, 0.45], [0, 1], {...clamp, easing: ease});
  return (
    <AbsoluteFill style={{opacity: dim}}>
      <AbsoluteFill style={{background: "#0E0E12"}} />
      {it.title ? (
        <div style={{position: "absolute", left: 40, right: 40, top: 280, textAlign: "center", fontFamily: B.bodyFont, fontWeight: 800, fontSize: 70, lineHeight: 1.05, color: "#FFF", opacity: k, translate: `0px ${(1 - k) * 24}px`}}>{it.title}</div>
      ) : null}
      {it.pill ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", opacity: interpolate(t, [0.3, 0.55], [0, 1], clamp)}}>
          <div style={{padding: "8px 26px 10px", borderRadius: B.square ? 0 : 12, background: accent, color: B.id === "aura" ? "#262626" : "#FFF", fontFamily: B.bodyFont, fontWeight: 700, fontSize: 38}}>{it.pill}</div>
        </div>
      ) : null}
      {Array.from({length: n}, (_, i) => {
        const pop = spring({frame: Math.round((t - 0.2 - i * 0.035) * fps), fps, config: {damping: 14, stiffness: 170}});
        const src = it.grid?.[i];
        return (
          <div key={i} style={{position: "absolute", left: x0 + (i % cols) * (cw + gap), top: y0 + Math.floor(i / cols) * (chh + gap), width: cw, height: chh, borderRadius: B.square ? 0 : 14, overflow: "hidden", background: "#222", scale: String(0.7 + 0.3 * pop), opacity: pop}}>
            {src ? <Media src={src} /> : video ? <FaceCrop video={video} trim={Math.round(((i + 0.5) * total * fps) / n)} focus={focus} w={cw} h={chh} k={1.15} eye={0.34} /> : null}
            {it.labels?.[i] ? <div style={{position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 8px 8px", background: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.75))", color: "#FFF", fontFamily: B.bodyFont, fontWeight: 600, fontSize: 19, textAlign: "center"}}>{it.labels[i]}</div> : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const OutroOne: React.FC<{it: OutroItem; video?: string; total?: number; focus?: Focus}> = ({it, video, total, focus}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const dur = it.until - it.at;
  const hasGrid = !!(it.grid?.length || it.gridFrames);
  // с сеткой иконка и @ник появляются позже — когда сетка погасла
  const g = hasGrid || it.title ? Math.min(1.5, Math.max(0, dur - 1.3)) : 0;
  const dim = Math.min(interpolate(t, [0, 0.45], [0, 1], clamp), interpolate(t, [dur - 0.3, dur], [1, 0], clamp));
  const k = spring({frame: frame - 6 - Math.round(g * fps), fps, config: {damping: 12, stiffness: 140}});
  const color = interpolate(t - g, [0.75, 1.05], [0, 1], clamp);
  const h = spring({frame: frame - 14 - Math.round(g * fps), fps, config: {damping: 18, stiffness: 140}});
  const handle = it.network === "site" || it.handle.startsWith("@") ? it.handle : `@${it.handle}`;
  const icon = g ? interpolate(t, [g - 0.1, g + 0.2], [0, 1], clamp) : 1;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `rgba(8,8,12,${0.78 * dim})`}} />
      {hasGrid || it.title ? (
        <AbsoluteFill style={{opacity: 1 - 0.72 * icon}}>
          <OutroGrid it={it} video={video} total={total} focus={focus} t={t} dim={dim} />
        </AbsoluteFill>
      ) : null}
      <div style={{position: "absolute", left: 0, right: 0, top: 640, display: "flex", flexDirection: "column", alignItems: "center", gap: 34, opacity: dim * icon}}>
        {it.text ? <div style={{fontFamily: vibes.fontFamily, fontSize: 104, color: "#FFF", lineHeight: 1, clipPath: `inset(-20% ${100 - interpolate(t - g, [0.2, 0.8], [0, 100], clamp)}% -20% -5%)`}}>{it.text}</div> : null}
        <div style={{scale: String(k), rotate: `${(1 - k) * -14}deg`}}>
          <NetIcon net={it.network} size={230} color={color} />
        </div>
        <div style={{fontFamily: oswald.fontFamily, fontWeight: 600, fontSize: 64, letterSpacing: "0.02em", color: "#FFF", opacity: h, translate: `0px ${(1 - h) * 30}px`}}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Outros: React.FC<{items?: OutroItem[]; video?: string; total?: number; focus?: Focus}> = ({items, video, total, focus}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`outro-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Финал с @ником">
          <OutroOne it={it} video={video} total={total} focus={focus} />
        </Sequence>
      ))}
    </>
  );
};
// окно чата и карточка у груди занимают место субтитров — на это время субтитры встают под них
export const lowCaptions = (chats: ChatItem[] | undefined, cards: CardItem[] | undefined, t: number) =>
  [...(chats ?? []), ...(cards ?? [])].some((x) => t >= x.at - 0.1 && t <= x.until);
export const outroActive = (items: OutroItem[] | undefined, t: number) => (items ?? []).some((x) => t >= x.at + 0.3 && t <= x.until);

// ------------------------------------------------------------------ тёплая вспышка света (light leak)
export const LightLeaks: React.FC<{fx?: {type: string; at: number; until?: number; color?: string}[]}> = ({fx}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <>
      {(fx ?? [])
        .filter((f) => f.type === "leak" && t >= f.at - 0.02 && t <= f.at + (f.until ? f.until - f.at : 0.8))
        .map((f, i) => {
          const len = f.until ? f.until - f.at : 0.8;
          const q = (t - f.at) / len;
          const bell = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, q))), 0.7);
          const x1 = -40 + 180 * q;
          const x2 = 140 - 170 * q;
          const warm = f.color ?? "255,120,30";
          return (
            <AbsoluteFill key={i} style={{mixBlendMode: "screen", opacity: bell}}>
              <AbsoluteFill style={{background: `radial-gradient(ellipse 85% 60% at ${x1}% 40%, rgba(${warm},1), rgba(255,70,40,0.8) 30%, rgba(255,40,110,0.35) 55%, rgba(255,40,110,0) 75%)`}} />
              <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 50% at ${x2}% 70%, rgba(255,190,80,0.95), rgba(255,100,40,0.55) 40%, rgba(255,100,40,0) 75%)`}} />
              <AbsoluteFill style={{background: `linear-gradient(${100 + 40 * q}deg, rgba(255,0,0,0) ${20 + 50 * q}%, rgba(255,170,90,0.55) ${32 + 50 * q}%, rgba(255,0,0,0) ${44 + 50 * q}%)`}} />
              <AbsoluteFill style={{background: `rgba(255,236,210,${0.22 * bell * bell})`}} />
            </AbsoluteFill>
          );
        })}
    </>
  );
};
