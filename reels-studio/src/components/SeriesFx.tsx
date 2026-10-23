// Эффекты серии роликов ostapdotcenko (решение пользователя 15.10.2026: «распространим на все ролики этой серии… используй
// все эффекты, которые я сегодня подгрузил… все ролики по очереди, чтобы был цельный образ и контекст»).
// Из референсов (source-videos/референсы-эффекты/2026-10-15/):
//   wipe — заливка цветом из угла: круг цвета растёт из угла и закрывает кадр, затем уходит в противоположный угол;
//   bw   — ч/б → цвет: кадр спикера серый, в конце отрезка цвет «вспыхивает»;
//   финальная карточка (как Instagram-карточка в конце обоих референсов) — у нас «Дальше: часть N+1» для связки серии,
//   в последней части — все каналы и сайты.
// «Часть N/10» под печатью ОД (EpisodeTag) и номера частей в карточке убраны по решению пользователя 15.10.2026:
// «убрать плашки 1/10… оставь только надпись Остап Доценко» — порядок выкладки задают номера в именах файлов.
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {display, mono} from "../fonts";
import {OdStamp} from "./OdBadge";

const INK = "#191922";
const RED = "#FF4A1F";
const PAPER = "#F7F4EC";
const MARKER = "#FFD92E";
const ease = Easing.bezier(0.65, 0, 0.35, 1);

export type FxItem = {type: "wipe" | "bw" | "leak" | "whip" | "defocus"; at: number; until?: number; color?: string; corner?: "tl" | "tr" | "bl" | "br"};
export type Episode = {n: number; total: number; title: string; next?: string; nextN?: number};

// ч/б → цвет: 1 — полностью серый; после until цвет возвращается за 0,2 с со вспышкой яркости
export const bwFilter = (fx: FxItem[] | undefined, t: number) => {
  let g = 0;
  let flash = 0;
  for (const f of fx ?? []) {
    if (f.type !== "bw") continue;
    const until = f.until ?? f.at + 1;
    const k = Math.min(
      interpolate(t, [f.at - 0.12, f.at], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
      interpolate(t, [until, until + 0.2], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
    );
    g = Math.max(g, k);
    flash = Math.max(flash, interpolate(t, [until, until + 0.06, until + 0.35], [0, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}));
  }
  return g > 0.001 || flash > 0.001 ? `grayscale(${g}) contrast(${1 + 0.12 * g}) brightness(${1 + 0.3 * flash})` : undefined;
};

const CORNER = {tl: [0, 0], tr: [1080, 0], bl: [0, 1920], br: [1080, 1920]} as const;
const OPPOSITE = {tl: "br", tr: "bl", bl: "tr", br: "tl"} as const;

// заливка цветом из угла: 0…0,32 с круг растёт и закрывает кадр, 0,32…0,64 с уходит в противоположный угол
export const ColorWipes: React.FC<{fx?: FxItem[]}> = ({fx}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <>
      {(fx ?? [])
        .filter((f) => f.type === "wipe" && t >= f.at - 0.02 && t <= f.at + 0.66)
        .map((f, i) => {
          const corner = f.corner ?? "br";
          const grow = interpolate(t, [f.at, f.at + 0.32], [0, 2300], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
          const shrink = interpolate(t, [f.at + 0.32, f.at + 0.64], [2300, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
          const [x, y] = t < f.at + 0.32 ? CORNER[corner] : CORNER[OPPOSITE[corner]];
          const r = t < f.at + 0.32 ? grow : shrink;
          return <AbsoluteFill key={i} style={{background: f.color ?? MARKER, clipPath: `circle(${r}px at ${x}px ${y}px)`}} />;
        })}
    </>
  );
};

// «часть N/10 · тема» — бумажная плашка под печатью ОД
export const EpisodeTag: React.FC<{ep: Episode}> = ({ep}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 10, fps, config: {damping: 14, stiffness: 160}});
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        background: PAPER,
        border: `2px solid ${INK}`,
        boxShadow: `5px 5px 0 ${INK}`,
        padding: "8px 14px 9px",
        fontFamily: mono.fontFamily,
        fontWeight: 500,
        fontSize: 24,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: INK,
        translate: `${(1 - s) * -40}px 0px`,
        opacity: s,
      }}
    >
      <span style={{background: RED, color: "#FFFFFF", padding: "2px 8px"}}>
        {ep.n}/{ep.total}
      </span>
      <span>{ep.title}</span>
    </div>
  );
};

type LinkRow = {url: string; icon?: string};

// финальная карточка: кадр темнеет, снизу поднимается бумажная карточка «Дальше · часть N+1» (или все ссылки в последней части)
export const EpisodeOutro: React.FC<{ep: Episode; start: number; links?: LinkRow[]}> = ({ep, start, links}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (t < start) return null;
  const dim = interpolate(t, [start, start + 0.35], [0, 0.66], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const s = spring({frame: frame - Math.round((start + 0.12) * fps), fps, config: {damping: 13, stiffness: 150, mass: 0.8}});
  const mark = interpolate(t, [start + 0.45, start + 0.75], [0, 100], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  const last = !ep.next;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `rgba(11,13,20,${dim})`}} />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: last ? 520 : 690,
          background: PAPER,
          border: `4px solid ${INK}`,
          boxShadow: `16px 16px 0 ${MARKER}`,
          padding: "46px 48px 50px",
          translate: `0px ${(1 - s) * 900}px`,
          rotate: `${(1 - s) * 4}deg`,
        }}
      >
        <div style={{position: "absolute", right: -34, top: -58}}>
          <OdStamp size={150} />
        </div>
        <div style={{fontFamily: mono.fontFamily, fontWeight: 500, fontSize: 26, letterSpacing: "0.12em", textTransform: "uppercase", color: RED}}>
          Остап Доценко
        </div>
        <div style={{marginTop: 26, fontFamily: display.fontFamily, fontWeight: 700, fontSize: last ? 86 : 104, lineHeight: 1, color: INK, textTransform: "uppercase"}}>
          <span
            style={{
              backgroundImage: `linear-gradient(${MARKER}, ${MARKER})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${mark}% 82%`,
              backgroundPosition: "0% 70%",
              padding: "0 10px",
            }}
          >
            {last ? "Спасибо!" : "Дальше →"}
          </span>
        </div>
        {last ? (
          <>
            <div style={{marginTop: 26, fontFamily: display.fontFamily, fontWeight: 700, fontSize: 44, lineHeight: 1.15, color: INK}}>Все мои каналы и сайты:</div>
            <div style={{marginTop: 22, display: "flex", flexDirection: "column", gap: 14}}>
              {(links ?? []).map((l, i) => {
                const k = interpolate(t, [start + 0.55 + i * 0.12, start + 0.8 + i * 0.12], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
                return (
                  <div key={i} style={{display: "flex", alignItems: "center", gap: 16, opacity: k, translate: `${(1 - k) * 40}px 0px`}}>
                    {l.icon ? <Img src={staticFile(l.icon)} style={{width: 46, height: 46, objectFit: "contain", border: `2px solid ${INK}`, background: "#FFFFFF"}} /> : null}
                    <span style={{fontFamily: mono.fontFamily, fontWeight: 500, fontSize: 36, color: INK}}>{l.url}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div style={{marginTop: 30, fontFamily: display.fontFamily, fontWeight: 700, fontSize: 56, lineHeight: 1.12, color: INK}}>{ep.next}</div>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};
