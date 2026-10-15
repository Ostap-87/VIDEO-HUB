// Заголовок-хук по двум роликам-референсам пользователя (15.10.2026, source-videos/референсы-эффекты/2026-10-15/):
// «текст в 3D-перспективе на стене; заголовок за головой спикера; смешение жирного гротеска и курсива — покажи варианты».
// Три подачи (variant):
//   wall   — узкий гротеск (Oswald) крупно на «стене» в 3D-перспективе слева, строки въезжают снизу из глубины и медленно
//            прокручиваются вверх (эффект «3D scroller»); часть стены уходит за плечо спикера;
//   behind — заголовок крупно над головой и ЗА ней: первая строка — жирный гротеск (Unbounded 800) на жёлтом,
//            вторая — курсив с засечками (Playfair Display Italic); спикер (вырезка) стоит перед текстом;
//   mix    — смешение шрифтов по словам речи: тихая строка курсивом + громкое слово жирным гротеском, без перекрытия головы.
// Слой текста рисуется между видео спикера и его вырезкой (cutoutSrc) — так текст оказывается «за головой».
import React from "react";
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {loadFont as loadOswald} from "@remotion/google-fonts/Oswald";
import {loadFont as loadPlayfair} from "@remotion/google-fonts/PlayfairDisplay";
import {loadFont as loadUnbounded} from "@remotion/google-fonts/Unbounded";

const oswald = loadOswald("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]});
const playfair = loadPlayfair("italic", {weights: ["700"], subsets: ["cyrillic", "latin"]});
const unbounded = loadUnbounded("normal", {weights: ["800"], subsets: ["cyrillic", "latin"]});

export type HookLine = {text: string; at: number; kind?: "bold" | "italic"; size?: number; color?: string};
// столбик букв сверху вниз сбоку от спикера (решение пользователя 15.10.2026: «СОЦ» слева, «СЕТИ» справа, вертикально,
// по букве со щелчком, как будто за мной)
export type HookColumn = {text: string; at: number; side: "left" | "right"; step?: number; x?: number};
// x — от края кадра до середины столбика: 215 — столбик заходит за ухо и плечо, буквы частично прячутся за спикером
export type HookTitleProps = {variant: "wall" | "behind" | "mix"; lines: HookLine[]; until: number; ink?: string; accent?: string; stamp?: string; top?: number; columns?: HookColumn[]};

export const LETTER_STEP = 0.14; // с между буквами столбика
// моменты щелчков: по одному на каждую букву столбиков (звук ставит композиция)
export const hookClicks = (columns: HookColumn[] | undefined) =>
  (columns ?? []).flatMap((c) => [...c.text.replace(/\s/g, "")].map((_, i) => c.at + i * (c.step ?? LETTER_STEP)));

const ease = Easing.bezier(0.16, 1, 0.3, 1);

// 3D-стена: строки въезжают снизу из глубины, весь столбик медленно едет вверх
const Wall: React.FC<HookTitleProps> = ({lines, until}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const out = interpolate(t, [until - 0.35, until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <AbsoluteFill style={{perspective: 900, perspectiveOrigin: "0% 45%", opacity: out}}>
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 300,
          width: 1000,
          transformOrigin: "0% 50%",
          rotate: "y 24deg",
          translate: `0px ${interpolate(t, [0, until], [40, -90])}px`,
        }}
      >
        {lines.map((l, i) => {
          const k = interpolate(t, [l.at, l.at + 0.45], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
          return (
            <div
              key={i}
              style={{
                fontFamily: oswald.fontFamily,
                fontWeight: 700,
                fontSize: 330,
                lineHeight: 0.86,
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
                color: "#FFFFFF",
                textShadow: "0 6px 30px rgba(0,0,0,0.35)",
                opacity: k,
                translate: `0px ${(1 - k) * 160}px`,
                scale: String(0.85 + 0.15 * k),
                transformOrigin: "0% 100%",
                whiteSpace: "nowrap",
              }}
            >
              {l.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// заголовок за головой (вариант, выбранный пользователем 15.10.2026: «слово МОИ за мной крупными буквами, а соцсети тоже
// за мной, только горизонтально»): первая строка — огромный жирный гротеск жёлтым с чернильной жёсткой тенью, вторая —
// тот же гротеск белым, прямо (без курсива); обе строки за спикером — голова перекрывает низ букв. top — верх первой строки.
const Behind: React.FC<HookTitleProps> = ({lines, until, ink = "#191922", accent = "#FFD92E", top = 226, columns}) => {
  const colTop = top + 420; // столбики начинаются под «МОИ»
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const out = interpolate(t, [until - 0.35, until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: "absolute", left: -20, right: -20, top, display: "flex", flexDirection: "column", alignItems: "center"}}>
        {lines.map((l, i) => {
          const s = spring({frame: frame - Math.round(l.at * fps), fps, config: {damping: 12, stiffness: 150, mass: 0.9}});
          const big = i === 0;
          const size = l.size ?? (big ? 400 : 170);
          return (
            <div
              key={i}
              style={{
                // вторая строка ложится на низ первой — так голова закрывает только низ средних букв, слово читается
                marginTop: i === 0 ? 0 : -Math.round(size * 1.12),
                fontFamily: unbounded.fontFamily,
                fontWeight: 800,
                fontSize: size,
                lineHeight: 0.92,
                letterSpacing: "-0.04em",
                textTransform: "uppercase",
                color: l.color ?? (big ? accent : "#FFFFFF"),
                textShadow: `${big ? 14 : 9}px ${big ? 14 : 9}px 0 ${ink}`,
                opacity: Math.min(1, s * 1.4),
                scale: String(1.3 - 0.3 * s),
                translate: `0px ${(1 - s) * -40}px`,
                whiteSpace: "nowrap",
              }}
            >
              {l.text}
            </div>
          );
        })}
      </div>
      {(columns ?? []).map((c, ci) => {
        const letters = [...c.text.replace(/\s/g, "")];
        return (
          <div
            key={ci}
            style={{
              position: "absolute",
              top: colTop,
              [c.side]: (c.x ?? 215) - 115,
              width: 230,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {letters.map((ch, i) => {
              const at = c.at + i * (c.step ?? LETTER_STEP);
              const k = spring({frame: frame - Math.round(at * fps), fps, config: {damping: 11, stiffness: 260, mass: 0.6}});
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: unbounded.fontFamily,
                    fontWeight: 800,
                    fontSize: 190,
                    lineHeight: 0.9,
                    textTransform: "uppercase",
                    color: "#FFFFFF",
                    textShadow: `9px 9px 0 ${ink}`,
                    opacity: frame >= Math.round(at * fps) ? 1 : 0,
                    translate: `0px ${(1 - k) * -90}px`,
                    scale: String(0.6 + 0.4 * k),
                  }}
                >
                  {ch}
                </div>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// смешение шрифтов по словам: тихая строка курсивом, громкое слово — жирный гротеск с красным штампом-точкой
const Mix: React.FC<HookTitleProps> = ({lines, until, ink = "#191922", accent = "#FFD92E", stamp = "#FF4A1F"}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const out = interpolate(t, [until - 0.35, until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: "absolute", left: 64, right: 64, top: 262, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 18}}>
        {lines.map((l, i) => {
          const bold = (l.kind ?? (i % 2 ? "bold" : "italic")) === "bold";
          const s = spring({frame: frame - Math.round(l.at * fps), fps, config: {damping: 14, stiffness: 190, mass: 0.7}});
          const mark = interpolate(t, [l.at + 0.12, l.at + 0.4], [0, 100], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
          return (
            <div
              key={i}
              style={{
                fontFamily: bold ? unbounded.fontFamily : playfair.fontFamily,
                fontStyle: bold ? "normal" : "italic",
                fontWeight: bold ? 800 : 700,
                fontSize: bold ? 128 : 84,
                lineHeight: 1.05,
                letterSpacing: bold ? "-0.03em" : "0em",
                textTransform: bold ? "uppercase" : "none",
                color: bold ? ink : "#FFFFFF",
                textShadow: bold ? undefined : `4px 4px 0 ${ink}`,
                opacity: s,
                translate: `${(1 - s) * -60}px 0px`,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={
                  bold
                    ? {backgroundImage: `linear-gradient(${accent}, ${accent})`, backgroundRepeat: "no-repeat", backgroundSize: `${mark}% 100%`, padding: "0 18px 6px", boxShadow: mark > 99 ? `10px 10px 0 ${ink}` : undefined}
                    : undefined
                }
              >
                {l.text}
              </span>
              {bold ? <span style={{display: "inline-block", width: 26, height: 26, marginLeft: 16, background: stamp, opacity: mark > 99 ? 1 : 0}} /> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const HookTitle: React.FC<HookTitleProps> = (p) =>
  p.variant === "wall" ? <Wall {...p} /> : p.variant === "behind" ? <Behind {...p} /> : <Mix {...p} />;
