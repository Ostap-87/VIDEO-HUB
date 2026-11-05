// «Робокитай · 机器人中国» — сериал Aura Robotics (05.11.2026, пилот: «Приступай к созданию ролика, можно без голоса, но чтобы
// по картинкам было всё понятно»). Серия = статья блога aura-robotics.ru, 60–70 с, 1080×1920, без голоса: всё понятно по
// картинкам и коротким надписям (до ~12 слов в кадре, текст держится ≥ 3 с). Восемь шагов всегда в одном порядке:
// 1 задание (письмо клиента Ави) → 2 карта (поезд до края, печать-иероглиф края) → 3 прибытие (местные герои, плашки имён) →
// 4 испытание (претенденты на макете склада, карточки моделей) → 5 поворот (типичная ошибка, Скаут находит причину) →
// 6 решение (флипчарт Ави: критерии, расчёт) → 7 у клиента (роботы работают, итог одной фразой) → 8 дальше (ссылка на статью,
// анонс следующего края с силуэтом героя). Стиль — «чертёж-манхуа» Aura (robokitai/kit.tsx), 3D — арсенал Aura.
// Props — reels-studio/props/robokitai/NNN-<город>.json (тексты, цифры, длины шагов, музыка); сцены — robokitai/beats2d.tsx,
// robokitai/beats3d.tsx; карта — robokitai/chinaMap.ts (tools/robokitai/china_map.py).
import React from "react";
import {AbsoluteFill, Freeze, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {AuraBadge} from "../components/AuraBadge";
import {useBrush} from "../components/MontazhFx";
import {CL, Header, RK, ShiftIn, loadCjk} from "./robokitai/kit";
import {DecideBeat, LetterBeat, MapBeat, NextBeat} from "./robokitai/beats2d";
import {ArrivalBeat, ClientBeat, TrialBeat, TwistBeat} from "./robokitai/beats3d";
import {RK_BEATS, RK_TABS, RK_X, rkFrames, rkScenes, type RKBeatId, type RobokitaiProps} from "./robokitai/types";

export type {RobokitaiProps} from "./robokitai/types";
export {rkFrames} from "./robokitai/types";

const BEAT: Record<RKBeatId, React.FC<{P: RobokitaiProps}>> = {
  letter: LetterBeat,
  map: MapBeat,
  arrival: ArrivalBeat,
  trial: TrialBeat,
  twist: TwistBeat,
  decide: DecideBeat,
  client: ClientBeat,
  next: NextBeat,
};

export const RobokitaiEpisode: React.FC<RobokitaiProps> = (P) => {
  useBrush(true);
  loadCjk(`${P.series.zh}${P.city.zh}${P.city.zhFull ?? ""}${P.next.zh}家机`);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const S = rkScenes(P);
  const total = rkFrames(P);
  const cur = [...RK_BEATS].reverse().find((id) => f >= S[id][0]) ?? "letter";
  const cityOn = f >= S.map[0] + Math.round(2.9 * fps);
  const vol = P.music.volume;
  return (
    <AbsoluteFill style={{background: RK.paper, overflow: "hidden"}}>
      {RK_BEATS.map((id, i) => {
        const B = BEAT[id];
        const [a, b] = S[id];
        return (
          <Sequence key={id} from={a} durationInFrames={b - a} premountFor={Math.round(0.4 * fps)}>
            {i === 0 ? <B P={P} /> : <ShiftIn dur={RK_X}>{<B P={P} />}</ShiftIn>}
          </Sequence>
        );
      })}
      <Header series={P.series.name} zh={P.series.zh} ep={P.series.ep} city={cityOn ? P.city.name : undefined} tab={RK_TABS[cur]} tabKey={S[cur][0]} />
      {/* маленькая печать Aura в углу на всём выпуске (в финале — большая) */}
      <Sequence from={6} durationInFrames={S.next[0] + RK_X - 6} layout="none">
        <div style={{position: "absolute", right: 60, top: 252}}>
          <AuraBadge size={104} />
        </div>
      </Sequence>
      <Audio
        src={staticFile(P.music.src)}
        trimBefore={Math.round((P.music.from ?? 0) * fps)}
        volume={(x) => interpolate(x, [0, 12, total - 50, total - 2], [0, vol, vol, 0], CL)}
      />
    </AbsoluteFill>
  );
};

// пробные кадры без полного рендера: кадр N = frames[N] ролика (или start + N × step); длина композиции = длина ролика
// (Freeze не уходит за длину композиции), рендер — `--sequence --frames=0-<N-1>`
export const RobokitaiPreview: React.FC<RobokitaiProps & {frames?: number[]; step?: number; start?: number}> = ({frames, step = 30, start = 15, ...P}) => {
  const f = useCurrentFrame();
  const total = rkFrames(P);
  const at = frames ? frames[Math.min(f, frames.length - 1)] : start + f * step;
  return (
    <Freeze frame={Math.min(total - 1, at)}>
      <RobokitaiEpisode {...P} />
    </Freeze>
  );
};
