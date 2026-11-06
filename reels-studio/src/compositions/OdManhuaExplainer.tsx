// Манхуа-объяснялки личного бренда ostapdotcenko (06.11.2026). Пользователь: «по одному ролику для моего личного блога и сайта
// и объяснить в формате манхуа, почему я выбрал именно такой вариант изложения своих проектов: это более легко и не занудно
// воспринимается… очень удобный формат изложения, подходит под мой стиль и лучше запоминается. Также надо визуально показать
// преимущества… облеки это в красивые слова и схематично покажи в роликах по 30–45 секунд в формате манхуа».
// Ролик собирается из props: список сцен `scenes` (kind: hook → ident → главы 第一话… → fin), длина сцены — `sec`, соседние
// сцены накладываются на 12 кадров (переходы по кругу: разрез, клякса, глитч, страница, круг). Удар музыки (`music.drop`,
// секунда трека) ставится на заставку. Манхуа-набор — site-manhua/fx.tsx, шрифты — site-manhua/fonts.ts, сцены — od-explainer/.
// Props: props/od/2026-11-06-why-manhua.json (для сайта: «Почему манхуа?»), props/od/2026-11-06-what-is-duo-news.json (для блога:
// «Что такое 多 NEWS»; сцены hookCovers / pile / clock / pipeline / topics / seasons / finRows — od-explainer/scenes2.tsx).
import React from "react";
import {AbsoluteFill, Freeze, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {useBrush, BRUSH} from "../components/MontazhFx";
import {C, CL, CircleReveal, GlitchReveal, Grain, InkReveal, PageReveal, SlashReveal, Vignette} from "./site-manhua/fx";
import {FinAct, FormulaAct, GridAct, HookWall, Ident, PhoneAct, StyleAct, Versus, type OdxScene as OdxScene1} from "./od-explainer/scenes";
import {ClockAct, FinRows, HookCovers, PileAct, PipelineAct, SeasonsAct, TopicsAct, type OdxScene2} from "./od-explainer/scenes2";

export type OdxScene = OdxScene1 | OdxScene2;
export type OdManhuaExplainerProps = {
  title?: string;
  scenes: OdxScene[];
  music: {src: string; drop: number; vol: number; credit?: string};
};

const X = 12; // наложение соседних сцен, кадры
export const odxScenes = (P: OdManhuaExplainerProps) => {
  const s: [number, number][] = [];
  let t = 0;
  for (const sc of P.scenes) { const d = Math.round(sc.sec * 30); s.push([t, t + d]); t += d - X; }
  return s;
};
export const odxFrames = (P: OdManhuaExplainerProps) => { const s = odxScenes(P); return s[s.length - 1][1]; };

// звуки: [кадр внутри сцены, файл, громкость]; "@имя" — интернет-материалы/звуки/ (CC0 / CC BY), "@zvukitop/…" — zvukitop.com
type Snd = [number, string, number];
const sndOf = (sc: OdxScene, d: number): Snd[] => {
  switch (sc.kind) {
    case "hook": {
      const b = Math.round(d * 0.56);
      return [[0, "@impact-3", 0.5], [0, "@typewriter-1", 0.3], [4, "@zvukitop/zt-paper", 0.3], [12, "@impact-3", 0.45], [12, "@whoosh-3", 0.25], [20, "@impact-3", 0.45],
        [28, "@zvukitop/zt-aww", 0.3], [34, "@stamp-1", 0.6], [34, "@impact-4", 0.45], [36, "@zvukitop/zt-wrong", 0.3], [b, "@pop-2", 0.5], [b, "@boom-1", 0.4], [b + 4, "@zvukitop/zt-slap", 0.3], [d - 22, "@riser-2", 0.3]];
    }
    case "ident":
      return [[0, "@whoosh-4", 0.5], [2, "@impact-1", 0.55], [2, "@zvukitop/zt-cinema-hit", 0.35], [8, "@boom-1", 0.4], [16, "@impact-3", 0.4], [22, "@swipe-1", 0.35], [26, "@zvukitop/zt-paper", 0.3], [34, "@pop-1", 0.4]];
    case "versus": {
      const b = Math.round(d * 0.32), n = Math.round(d * 0.62);
      return [[0, "@flip-1", 0.5], [4, "@whoosh-2", 0.3], [10, "@pop-1", 0.4], [30, "@stamp-1", 0.6], [30, "@zvukitop/zt-wrong", 0.35], [36, "@zvukitop/zt-aww", 0.3],
        [b - 10, "@sweep-1", 0.3], [b, "@whoosh-3", 0.4], [b, "@impact-3", 0.4], [b + 8, "@pop-2", 0.4], [b + 28, "@stamp-1", 0.6], [b + 28, "@success-1", 0.35], [b + 32, "@zvukitop/zt-kids-yay", 0.2], [n, "@typewriter-1", 0.35]];
    }
    case "phone": {
      const every = Math.max(26, Math.floor((d - 40) / sc.feed.length));
      return [[0, "@whoosh-1", 0.5], [2, "@swipe-1", 0.35], [14, "@impact-3", 0.45], [14, "@zvukitop/zt-boom", 0.3], ...sc.feed.slice(1).map((_, i) => [20 + (i + 1) * every, "@swipe-1", 0.3] as Snd),
        ...sc.chips.map((_, i) => [40 + i * 20, i % 2 ? "@pop-2" : "@pop-1", 0.4] as Snd), [46, "@whoosh-3", 0.3], [Math.round(d * 0.6), "@typewriter-1", 0.35]];
    }
    case "formula":
      return [[0, "@flip-1", 0.5], [4, "@shutter-1", 0.35], [34, "@pop-1", 0.45], [46, "@click-2", 0.4], [56, "@pop-2", 0.45], [70, "@click-2", 0.4], [84, "@impact-3", 0.5], [84, "@ding-2", 0.45], [88, "@success-1", 0.3],
        [112, "@whoosh-2", 0.3], [140, "@zvukitop/zt-wrong", 0.35], [140, "@sweep-1", 0.3], [Math.round(d * 0.64), "@typewriter-1", 0.35]];
    case "style":
      return [[0, "@whoosh-4", 0.45], [4, "@whoosh-2", 0.35], [14, "@shutter-1", 0.4], [26, "@shutter-1", 0.35], [38, "@shutter-1", 0.35], [66, "@stamp-1", 0.6], [66, "@impact-4", 0.45], [70, "@zvukitop/zt-cinema-hit", 0.3],
        [92, "@pop-1", 0.4], [102, "@pop-2", 0.4], [112, "@pop-1", 0.4], [Math.round(d * 0.62), "@typewriter-1", 0.35]];
    case "grid":
      return [[0, "@flip-1", 0.5], ...sc.items.flatMap((_, i) => [[6 + i * 12, "@impact-3", 0.4], [12 + i * 12, "@zvukitop/zt-paper", 0.25]] as Snd[]), [44, "@zvukitop/zt-slap", 0.35], [52, "@ding-3", 0.35]];
    case "hookCovers": {
      const b = Math.round(d * 0.56);
      return [[0, "@impact-3", 0.5], [0, "@shutter-1", 0.35], [4, "@zvukitop/zt-paper", 0.3], [8, "@whoosh-3", 0.3], [13, "@impact-3", 0.45], [22, "@impact-3", 0.45], [30, "@boom-1", 0.45], [32, "@zvukitop/zt-wrong", 0.3],
        [b, "@pop-2", 0.5], [b + 2, "@impact-2", 0.4], [b + 6, "@zvukitop/zt-aww", 0.25], [d - 22, "@riser-2", 0.3]];
    }
    case "pile":
      return [[0, "@flip-1", 0.5], [6, "@impact-3", 0.45], [6, "@zvukitop/zt-boom", 0.3], ...Array.from({length: 12}).map((_, i) => [10 + i * 5, "@zvukitop/zt-paper", 0.18] as Snd), [70, "@ding-2", 0.4], [70, "@coin-1", 0.35],
        [80, "@pop-1", 0.4], [92, "@pop-2", 0.4], [104, "@pop-1", 0.4], ...sc.tags.map((_, i) => [122 + i * 6, "@click-2", 0.3] as Snd), [160, "@whoosh-2", 0.35], [176, "@pop-2", 0.4]];
    case "clock":
      return [[0, "@whoosh-4", 0.45], [4, "@whoosh-2", 0.35], [10, "@zvukitop/zt-clock", 0.35], [20, "@zvukitop/zt-slap", 0.3], [46, "@impact-3", 0.5], [46, "@zvukitop/zt-boom", 0.35], [50, "@coin-1", 0.3],
        [72, "@pop-1", 0.4], [88, "@pop-2", 0.4], [Math.round(d * 0.6), "@typewriter-1", 0.35]];
    case "pipeline":
      return [[0, "@flip-1", 0.5], [4, "@zvukitop/zt-paper", 0.3], [8, "@sweep-1", 0.3], [36, "@impact-3", 0.45], [64, "@whoosh-3", 0.35], [70, "@impact-3", 0.45], [98, "@whoosh-3", 0.35], [104, "@impact-3", 0.45],
        [112, "@zvukitop/zt-clock", 0.3], [164, "@ding-3", 0.4], [Math.round(d * 0.6), "@typewriter-1", 0.35]];
    case "topics":
      return [[0, "@glitch-2", 0.4], [2, "@impact-3", 0.45], ...sc.labels.map((_, i) => [18 + i * 12, i % 2 ? "@pop-2" : "@pop-1", 0.4] as Snd), [Math.round(d * 0.55), "@typewriter-1", 0.35]];
    case "seasons":
      return [[0, "@flip-1", 0.5], ...sc.seasons.map((_, i) => [6 + i * 8, "@stamp-1", 0.35] as Snd), [48, "@whoosh-2", 0.3], ...sc.covers.map((_, i) => [48 + i * 5, "@zvukitop/zt-paper", 0.2] as Snd), [96, "@zvukitop/zt-slap", 0.35], [100, "@impact-3", 0.4],
        [118, "@pop-1", 0.4], [132, "@pop-2", 0.4], [134, "@zvukitop/zt-clock", 0.3]];
    case "finRows": {
      const t = Math.round(d * 0.55);
      return [[0, "@whoosh-1", 0.5], [10, "@zvukitop/zt-pop", 0.3], [14, "@whoosh-3", 0.3], [26, "@whoosh-3", 0.3], [38, "@whoosh-3", 0.3], [52, "@pop-1", 0.4], [t, "@click-1", 0.55], [t + 2, "@success-1", 0.4], [t + 4, "@zvukitop/zt-ding", 0.35],
        [t + 14, "@ding-3", 0.4], [t + 18, "@cheer-1", 0.2], [d - 20, "@zvukitop/zt-whoosh", 0.3]];
    }
    case "fin": {
      const t = Math.round(d * 0.52);
      return [[0, "@whoosh-1", 0.5], [4, "@swipe-1", 0.3], [22, "@typing-1", 0.35], [34, "@pop-1", 0.4], [40, "@impact-3", 0.4], [t, "@click-1", 0.55], [t + 2, "@success-1", 0.4], [t + 4, "@zvukitop/zt-ding", 0.35],
        [t + 16, "@ding-3", 0.4], [t + 20, "@cheer-1", 0.2], [d - 20, "@zvukitop/zt-whoosh", 0.3]];
    }
  }
  return [];
};
const sfxSrc = (n: string) => `интернет-материалы/звуки/${n.slice(1)}.wav`;

const node = (sc: OdxScene, d: number) => {
  switch (sc.kind) {
    case "hook": return <HookWall s={sc} dur={d} />;
    case "ident": return <Ident s={sc} />;
    case "versus": return <Versus s={sc} dur={d} />;
    case "phone": return <PhoneAct s={sc} dur={d} />;
    case "formula": return <FormulaAct s={sc} dur={d} />;
    case "style": return <StyleAct s={sc} dur={d} />;
    case "grid": return <GridAct s={sc} dur={d} />;
    case "fin": return <FinAct s={sc} dur={d} />;
    case "hookCovers": return <HookCovers s={sc} dur={d} />;
    case "pile": return <PileAct s={sc} dur={d} />;
    case "clock": return <ClockAct s={sc} dur={d} />;
    case "pipeline": return <PipelineAct s={sc} dur={d} />;
    case "topics": return <TopicsAct s={sc} dur={d} />;
    case "seasons": return <SeasonsAct s={sc} dur={d} />;
    case "finRows": return <FinRows s={sc} dur={d} />;
  }
  return null;
};

export const OdManhuaExplainer: React.FC<OdManhuaExplainerProps> = (P) => {
  useBrush(true);
  const {fps} = useVideoConfig();
  const f = useCurrentFrame();
  const S = odxScenes(P);
  const total = odxFrames(P);
  const identIdx = Math.max(0, P.scenes.findIndex((s) => s.kind === "ident"));
  const reveal = [
    (c: React.ReactNode) => <SlashReveal dur={12}>{c}</SlashReveal>,
    (c: React.ReactNode) => <InkReveal dur={12} id="x1" x={540} y={900}>{c}</InkReveal>,
    (c: React.ReactNode) => <GlitchReveal dur={12}>{c}</GlitchReveal>,
    (c: React.ReactNode) => <PageReveal dur={14}>{c}</PageReveal>,
    (c: React.ReactNode) => <CircleReveal dur={12} x={540} y={760}>{c}</CircleReveal>,
  ];
  const sounds: Snd[] = P.scenes.flatMap((sc, i) => sndOf(sc, S[i][1] - S[i][0]).map(([a, n, v]) => [Math.max(0, S[i][0] + a), n, v] as Snd));
  const drop = S[identIdx][0] + 2; // удар трека — на «шлёп» печати заставки
  return (
    <AbsoluteFill style={{background: C.ink, overflow: "hidden"}}>
      {P.scenes.map((sc, i) => {
        const d = S[i][1] - S[i][0];
        const inner = node(sc, d);
        const wrapped = i === 0 ? inner : sc.kind === "ident" ? <CircleReveal dur={12} x={190} y={420}>{inner}</CircleReveal> : (sc.kind === "fin" || sc.kind === "finRows") ? <InkReveal dur={12} id="fin" x={760} y={1100}>{inner}</InkReveal> : reveal[i % reveal.length](inner);
        return <Sequence key={i} from={S[i][0]} durationInFrames={d} premountFor={fps}>{wrapped}</Sequence>;
      })}
      {/* печать 多 — после заставки на всех сценах, как в «多 NEWS» */}
      <div style={{position: "absolute", right: 64, top: 262, width: 84, height: 84, background: C.seal, color: "#fff", fontFamily: BRUSH, fontSize: 64, lineHeight: "84px", textAlign: "center", borderRadius: 10, boxShadow: "0 0 0 5px #fff", rotate: "-4deg", opacity: f < S[Math.min(S.length - 1, identIdx + 1)][0] + 6 ? 0 : 1}}>多</div>
      <Grain opacity={0.12} />
      <Vignette strength={0.14} />
      <Audio
        src={staticFile(P.music.src)}
        trimBefore={Math.max(0, Math.round(P.music.drop * fps - drop))}
        volume={(x) => interpolate(x, [0, 6, total - 40, total - 1], [0, P.music.vol, P.music.vol, 0], CL)}
      />
      {sounds.map(([at, name, vol], i) => (
        <Sequence key={`s${i}`} from={at} durationInFrames={Math.round(3 * fps)} premountFor={fps}>
          <Audio src={staticFile(sfxSrc(name))} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// проверка без полного рендера: кадр N = frames[N] ролика (или start + N × step)
export const OdManhuaExplainerPreview: React.FC<OdManhuaExplainerProps & {step?: number; start?: number; frames?: number[]}> = ({step = 30, start = 15, frames, ...P}) => {
  const f = useCurrentFrame();
  const total = odxFrames(P);
  return (
    <Freeze frame={Math.min(total - 1, frames ? frames[Math.min(f, frames.length - 1)] : start + f * step)}>
      <OdManhuaExplainer {...P} />
    </Freeze>
  );
};
