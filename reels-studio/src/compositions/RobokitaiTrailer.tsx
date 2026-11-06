// «Робокитай» · Серия 0 — трейлер вселенной (06.11.2026, пользователь: «По ролику ок, делай»): чтобы новые зрители поняли мир и героев
// до приключений. Без голоса. Сцены — robokitai/trailer.tsx, props — props/robokitai/000-trailer.json. Карусели «Карта Робокитая»
// и «Команда Aura» — композиция RobokitaiCarousel (robokitai/carousel.tsx).
import React from "react";
import {AbsoluteFill, Freeze, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {useBrush} from "../components/MontazhFx";
import {CL, Header, RK, loadCjk} from "./robokitai/kit";
import {EndBeat, EpisodeBeat, FlightBeat, HookBeat, TeamGridBeat, TeamLeadBeat} from "./robokitai/trailer";
import {rtFrames, rtScenes, type RobokitaiTrailerProps} from "./robokitai/trailerTypes";

export type {RobokitaiTrailerProps} from "./robokitai/trailerTypes";
export {rtFrames} from "./robokitai/trailerTypes";

export const RobokitaiTrailer: React.FC<RobokitaiTrailerProps> = (P) => {
  useBrush(true);
  loadCjk(`${P.hook.zh}${P.regions.map((r) => r.seal + r.zh).join("")}机${P.end.seal}`);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const S = rtScenes(P);
  const total = rtFrames(P);
  const leadF = Math.round(P.team.leadSec * fps);
  const regF = Math.round(P.regionSec * fps);
  const inFlight = f >= S.flight[0] && f < S.flight[1];
  const region = inFlight ? P.regions[Math.min(P.regions.length - 1, Math.floor((f - S.flight[0]) / regF))] : undefined;
  const showHeader = f >= S.flight[0] && f < S.team[0] + leadF; // в сетке героев и кадрах серии — свой заголовок на этом месте
  const vol = P.music.volume;
  const fo = Math.round((P.music.fadeOut ?? 1.2) * fps);
  return (
    <AbsoluteFill style={{background: RK.paper, overflow: "hidden"}}>
      <Sequence from={S.hook[0]} durationInFrames={S.hook[1] - S.hook[0]}>
        <HookBeat P={P} />
      </Sequence>
      <Sequence from={S.flight[0]} durationInFrames={S.flight[1] - S.flight[0]}>
        <FlightBeat P={P} />
      </Sequence>
      <Sequence from={S.team[0]} durationInFrames={leadF} premountFor={15}>
        <TeamLeadBeat P={P} />
      </Sequence>
      <Sequence from={S.team[0] + leadF} durationInFrames={S.team[1] - S.team[0] - leadF}>
        <TeamGridBeat P={P} />
      </Sequence>
      <Sequence from={S.episode[0]} durationInFrames={S.episode[1] - S.episode[0]} premountFor={15}>
        <EpisodeBeat P={P} />
      </Sequence>
      <Sequence from={S.end[0]} durationInFrames={S.end[1] - S.end[0]}>
        <EndBeat P={P} />
      </Sequence>
      {showHeader ? <Header series={P.series.name} zh="" ep={P.series.ep} city={region?.name} /> : null}
      <Audio
        src={staticFile(P.music.src)}
        trimBefore={Math.round(P.music.from * fps)}
        volume={(x) => interpolate(x, [0, 20, total - fo, total], [0.25 * vol, vol, vol, 0], CL)}
      />
    </AbsoluteFill>
  );
};

// пробные кадры: кадр N = frames[N] ролика (длина композиции = длина ролика)
export const RobokitaiTrailerPreview: React.FC<RobokitaiTrailerProps & {frames?: number[]; step?: number; start?: number}> = ({frames, step = 30, start = 15, ...P}) => {
  const f = useCurrentFrame();
  const total = rtFrames(P);
  const at = frames ? frames[Math.min(f, frames.length - 1)] : start + f * step;
  return (
    <Freeze frame={Math.min(total - 1, at)}>
      <RobokitaiTrailer {...P} />
    </Freeze>
  );
};
