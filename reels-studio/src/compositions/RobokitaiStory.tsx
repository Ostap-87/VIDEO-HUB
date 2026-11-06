// «Робокитай» — серия из статьи блога Aura с драматургией v2 (06.11.2026, серии 2 · Сучжоу и 3 · Шэньчжэнь): шаги задаются списком
// `beats` в props (robokitai/story.tsx), 3D-миры — robokitai/cell3d.tsx. Таймер дедлайна, лицо клиента, шапка серии и музыка —
// как в RobokitaiDrama, но ключи — по `id` шагов. Props — props/robokitai/NNN-<город>.json.
import React from "react";
import {AbsoluteFill, Freeze, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {useBrush} from "../components/MontazhFx";
import {CL, Header, RK, ShiftIn, loadCjk} from "./robokitai/kit";
import {Countdown, ManagerInset, type Mood} from "./robokitai/drama2d";
import {BoardBeat, CliffStoryBeat, GuessStoryBeat, LetterBeat, MapStoryBeat, SceneBeat, S_X, rsFrames, rsScenes, type RobokitaiStoryProps, type SBeat} from "./robokitai/story";

export type {RobokitaiStoryProps} from "./robokitai/story";
export {rsFrames} from "./robokitai/story";

const KIND: Record<SBeat["kind"], React.FC<{P: RobokitaiStoryProps; B: SBeat}>> = {
  scene: SceneBeat,
  letter: LetterBeat,
  map: MapStoryBeat,
  guess: GuessStoryBeat,
  board: BoardBeat,
  cliff: CliffStoryBeat,
};

export const RobokitaiStory: React.FC<RobokitaiStoryProps> = (P) => {
  useBrush(true);
  loadCjk(`${P.series.zh}${P.city.zh}${P.city.zhFull ?? ""}苏州深圳沈阳杭`);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const S = rsScenes(P);
  const total = rsFrames(P);
  const cur = [...P.beats].reverse().find((b) => f >= S[b.id][0]) ?? P.beats[0];
  const at = (id: string, sec: number) => (S[id] ? S[id][0] : 0) + Math.round(sec * fps);
  // таймер дедлайна
  const keys = P.countdown.keys.map(([b, s, d]) => ({f: at(b, s), d})).sort((a, b) => a.f - b.f);
  const passed = keys.filter((k) => f >= k.f);
  const ck = passed[passed.length - 1] ?? keys[0];
  const doneF = at(P.countdown.doneAt[0], P.countdown.doneAt[1]);
  const first = P.beats[0];
  const flashF = first.flash ? at(first.id, first.flash.at) : total;
  const second = P.beats[1];
  const cdHidden = P.countdown.hide.includes(cur.id) || (f >= flashF && f < (second ? S[second.id][0] : total) + Math.round(0.8 * fps)) || f < 3;
  const cdState = f >= doneF ? "done" : ck.d === 0 ? "zero" : ck.d <= 1 && P.countdown.blink.includes(cur.id) ? "alarm" : ck.d <= 1 ? "red" : "normal";
  // лицо клиента
  const moods = P.manager.moods.map(([b, s, m]) => ({f: at(b, s), m})).sort((a, b) => a.f - b.f);
  const mp = moods.filter((m) => f >= m.f);
  const mood: Mood = (mp[mp.length - 1] ?? moods[0]).m;
  const moodKey = (mp[mp.length - 1] ?? moods[0]).f;
  const insetOn = P.manager.inset.includes(cur.id);
  const insetO = insetOn ? interpolate(f, [S[cur.id][0] + 4, S[cur.id][0] + 14], [0, 1], CL) : 0;
  // музыка: глушится в шагах с music:false, тише в `duck`; с шага `bAt` — заново с удара трека `bFrom`
  const vol = P.music.volume;
  const muteAt = (fr: number) => {
    const b = [...P.beats].reverse().find((x) => fr >= S[x.id][0]) ?? P.beats[0];
    if (b.music === false || (b.music === undefined && (b === first || b.kind === "scene" && b.id === "crisis"))) return 0;
    return P.music.duck?.includes(b.id) ? 0.15 : 1;
  };
  const bStart = P.music.bAt && S[P.music.bAt] ? S[P.music.bAt][0] : total;
  const aStart = S[P.beats[1]?.id ?? first.id][0];
  const env = (fr: number) => {
    // сглаживание: среднее по окну ±6 кадров
    let s = 0;
    for (let k = -6; k <= 6; k += 3) s += muteAt(Math.max(0, Math.min(total - 1, fr + k)));
    return s / 5;
  };
  const showHeader = cur.kind !== "cliff" && !(cur === first && f >= flashF) && cur.kind !== "letter";
  return (
    <AbsoluteFill style={{background: RK.paper, overflow: "hidden"}}>
      {P.beats.map((b) => {
        const B = KIND[b.kind];
        const [a, e] = S[b.id];
        return (
          <Sequence key={b.id} from={a} durationInFrames={e - a} premountFor={Math.round(0.4 * fps)}>
            {b.cut || b === first ? <B P={P} B={b} /> : <ShiftIn dur={S_X}>{<B P={P} B={b} />}</ShiftIn>}
          </Sequence>
        );
      })}
      {showHeader ? <Header series={P.series.name} zh="" ep={P.series.ep} city={cur.kind === "map" && f < at(cur.id, 2.2) ? undefined : P.city.name} /> : null}
      <Countdown label={P.countdown.label} days={ck.d} changedAt={ck.f} state={cdState} done={P.countdown.done} o={cdHidden ? 0 : 1} />
      <ManagerInset x={1080 - 64 - 150} y={372} size={150} mood={mood} label={P.manager.label} moodKey={moodKey} o={insetO} />
      <Sequence from={aStart} durationInFrames={Math.max(1, bStart - aStart)} layout="none">
        <Audio src={staticFile(P.music.src)} trimBefore={Math.round(P.music.aFrom * fps)} volume={(x) => vol * env(aStart + x) * interpolate(x, [0, 15, bStart - aStart - 4, bStart - aStart], [0, 1, 1, 0], CL)} />
      </Sequence>
      {bStart < total ? (
        <Sequence from={bStart} durationInFrames={total - bStart} layout="none">
          <Audio src={staticFile(P.music.src)} trimBefore={Math.round((P.music.bFrom ?? P.music.aFrom) * fps)} volume={(x) => vol * env(bStart + x) * interpolate(x, [0, 3, total - bStart - 30, total - bStart], [0.6, 1, 1, 0], CL)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

export const RobokitaiStoryPreview: React.FC<RobokitaiStoryProps & {frames?: number[]; step?: number; start?: number}> = ({frames, step = 30, start = 15, ...P}) => {
  const f = useCurrentFrame();
  const total = rsFrames(P);
  const at = frames ? frames[Math.min(f, frames.length - 1)] : start + f * step;
  return (
    <Freeze frame={Math.min(total - 1, at)}>
      <RobokitaiStory {...P} />
    </Freeze>
  );
};
