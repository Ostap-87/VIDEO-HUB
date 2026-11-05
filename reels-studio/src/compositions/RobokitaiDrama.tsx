// «Робокитай» v2 — серия с драматургией (05.11.2026, план одобрен пользователем: «давай этот вариант попробуем»): те же
// факты статьи, но с интригой — холодное открытие (застрял у порога), таймер дедлайна «до 11.11», герои сначала ошибаются,
// клиент-скептик (лицо — шкала успеха), пауза-угадайка, тихий кризис (музыка обрывается), неожиданный поворот («переставить
// стеллаж»), крючок на следующую серию. Без голоса; тон серьёзный — без злодеев, аварий и травм; ставки — сроки, заказы, доверие.
// Серия 1 (v1) остаётся композицией RobokitaiEpisode. Props — props/robokitai/NNN-<город>-v2.json; сцены — robokitai/dramaBeats.tsx.
import React from "react";
import {AbsoluteFill, Freeze, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {useBrush} from "../components/MontazhFx";
import {CL, Header, RK, ShiftIn, loadCjk} from "./robokitai/kit";
import {Countdown, ManagerInset, type Mood} from "./robokitai/drama2d";
import {ColdBeat, CliffBeat, CrisisBeat, GuessBeat, InsightBeat, MapBeatD, PayoffBeat, StakesBeat, Try1Beat, Try2Beat, TwistBeat2} from "./robokitai/dramaBeats";
import {D_BEATS, D_CUT, D_X, rdFrames, rdScenes, type DBeat, type RobokitaiDramaProps} from "./robokitai/dramaTypes";

export type {RobokitaiDramaProps} from "./robokitai/dramaTypes";
export {rdFrames} from "./robokitai/dramaTypes";

const BEAT: Record<DBeat, React.FC<{P: RobokitaiDramaProps}>> = {
  cold: ColdBeat,
  stakes: StakesBeat,
  map: MapBeatD,
  try1: Try1Beat,
  guess: GuessBeat,
  try2: Try2Beat,
  crisis: CrisisBeat,
  insight: InsightBeat,
  twist: TwistBeat2,
  payoff: PayoffBeat,
  cliff: CliffBeat,
};

export const RobokitaiDrama: React.FC<RobokitaiDramaProps> = (P) => {
  useBrush(true);
  loadCjk(`${P.series.zh}${P.city.zh}${P.city.zhFull ?? ""}苏州家机`);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const S = rdScenes(P);
  const total = rdFrames(P);
  const cur = [...D_BEATS].reverse().find((id) => f >= S[id][0]) ?? "cold";
  const at = (b: DBeat, sec: number) => S[b][0] + Math.round(sec * fps);
  // таймер дедлайна
  const keys = P.countdown.keys.map(([b, s, d]) => ({f: at(b, s), d})).sort((a, b) => a.f - b.f);
  const passed = keys.filter((k) => f >= k.f);
  const ck = passed[passed.length - 1] ?? keys[0];
  const doneF = at("payoff", P.countdown.doneAt);
  const flashF = at("cold", P.cold.flashAt);
  const cdHidden = P.countdown.hide.includes(cur) || (f >= flashF && f < S.stakes[0] + Math.round(0.8 * fps)) || f < 3;
  const cdState = f >= doneF ? "done" : ck.d === 0 ? "zero" : ck.d <= 2 && P.countdown.blink.includes(cur) ? "alarm" : ck.d <= 2 ? "red" : "normal";
  // настроение клиента
  const moods = P.manager.moods.map(([b, s, m]) => ({f: at(b, s), m})).sort((a, b) => a.f - b.f);
  const mp = moods.filter((m) => f >= m.f);
  const mood: Mood = (mp[mp.length - 1] ?? moods[0]).m;
  const moodKey = (mp[mp.length - 1] ?? moods[0]).f;
  const insetOn = P.manager.inset.includes(cur);
  const insetO = insetOn ? interpolate(f, [S[cur][0] + 4, S[cur][0] + 14], [0, 1], CL) : 0;
  // музыка: A — от «ставок» до кризиса (на угадайке тише), B — с поворота от удара трека
  const vol = P.music.volume;
  const aStart = S.stakes[0];
  const aEnd = S.crisis[0];
  const bStart = S.twist[0];
  const bEnd = total;
  const duck = P.music.guessDuck ?? 0.15;
  const gA = S.guess[0] - aStart;
  const gB = S.guess[1] - aStart;
  return (
    <AbsoluteFill style={{background: RK.paper, overflow: "hidden"}}>
      {D_BEATS.map((id) => {
        const B = BEAT[id];
        const [a, b] = S[id];
        return (
          <Sequence key={id} from={a} durationInFrames={b - a} premountFor={Math.round(0.4 * fps)}>
            {D_CUT[id] ? <B P={P} /> : <ShiftIn dur={D_X}>{<B P={P} />}</ShiftIn>}
          </Sequence>
        );
      })}
      {cur !== "cliff" && !(cur === "cold" && f >= flashF) ? <Header series={P.series.name} zh="" ep={P.series.ep} city={f >= at("map", 2.2) ? P.city.name : undefined} /> : null}
      <Countdown label={P.countdown.label} days={ck.d} changedAt={ck.f} state={cdState} done={P.countdown.done} o={cdHidden ? 0 : 1} />
      <ManagerInset x={1080 - 64 - 150} y={372} size={150} mood={mood} label={P.manager.label} moodKey={moodKey} o={insetO} />
      <Sequence from={aStart} durationInFrames={aEnd - aStart} layout="none">
        <Audio
          src={staticFile(P.music.src)}
          trimBefore={Math.round((P.music.aFrom ?? 0) * fps)}
          volume={(x) => interpolate(x, [0, 15, gA - 4, gA + 6, gB - 4, gB + 8, aEnd - aStart - 3, aEnd - aStart], [0, vol, vol, vol * duck, vol * duck, vol, vol, 0], CL)}
        />
      </Sequence>
      <Sequence from={bStart} durationInFrames={bEnd - bStart} layout="none">
        <Audio
          src={staticFile(P.music.src)}
          trimBefore={Math.round(P.music.dropAt * fps)}
          volume={(x) => interpolate(x, [0, 3, S.cliff[0] - bStart + Math.round(3.2 * fps), S.cliff[0] - bStart + Math.round(3.6 * fps)], [vol * 0.6, vol, vol, 0], CL)}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// пробные кадры: кадр N = frames[N] ролика (длина композиции = длина ролика)
export const RobokitaiDramaPreview: React.FC<RobokitaiDramaProps & {frames?: number[]; step?: number; start?: number}> = ({frames, step = 30, start = 15, ...P}) => {
  const f = useCurrentFrame();
  const total = rdFrames(P);
  const at = frames ? frames[Math.min(f, frames.length - 1)] : start + f * step;
  return (
    <Freeze frame={Math.min(total - 1, at)}>
      <RobokitaiDrama {...P} />
    </Freeze>
  );
};
