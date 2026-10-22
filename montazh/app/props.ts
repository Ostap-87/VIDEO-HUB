// Проект Монтажной → props шаблона TalkReelPro. Одни и те же props играет предпросмотр (Remotion Player в окне)
// и рендерит движок (reels-studio), поэтому «что видно в окне — то и в ролике».
import {bumperFrames} from "../../reels-studio/src/compositions/TalkReelPro";
import {BRANDS, MUSIC, SFX} from "./brands";
import {effectById, type Props} from "./effects";
import {gradeCss} from "./grades";
import {edlCuts, edlSeconds} from "./assemble";
import type {Project} from "./types";

// имена файлов, которые в предпросмотре подменяются файлами из браузера (window.remotion_staticFiles)
export const LOCAL = {
  video: "montazh-local/source",
  clean: "montazh-local/clean.wav",
  image: (pid: string, name: string) => `montazh-local/${pid}/${name}`,
  edl: "montazh-local/edl", // склейка: видео спикера играет монтажный лист (шаблон, components/EdlVideo.tsx)
  clip: (id: string) => `montazh-local/clip/${id}`,
  cleanClip: (id: string) => `montazh-local/clean/${id}.wav`,
};

// ключи файлов в IndexedDB: первый ролик проекта — прежний «source»
export const clipKey = (id: string) => (id === "source" ? "source" : `clip/${id}`);
export const cleanKey = (id: string) => (id === "source" ? "clean.wav" : `clean/${id}.wav`);

// длина ролика: склейка — по монтажному листу, иначе весь исходник
export const projSeconds = (p: Project) => (p.edl?.length ? edlSeconds(p.edl) : (p.source?.duration ?? 0));

export function buildProps(p: Project, opts: {cleanReady?: boolean; cleanClips?: Record<string, unknown>; source?: string} = {}): Props {
  const multi = !!p.edl?.length;
  const dur = projSeconds(p) || 10;
  const b = BRANDS[p.brand];
  const music = p.audio.music ? MUSIC.find((m) => m.id === p.audio.music) : null;
  const accent = [...new Set(p.words.map((w) => w.text).filter((t) => /\d/.test(t)))];
  const props: Props = {
    mediaSrc: multi ? LOCAL.edl : (opts.source ?? LOCAL.video),
    cutoutSrc: "",
    audioSrc: !multi && p.audio.clean && opts.cleanReady ? LOCAL.clean : undefined,
    edl: multi
      ? p.edl!.map((s) => ({src: LOCAL.clip(s.clip), from: s.from, to: s.to, audio: p.audio.clean && opts.cleanClips?.[s.clip] ? LOCAL.cleanClip(s.clip) : undefined}))
      : undefined,
    words: p.words,
    accentWords: accent,
    cuts: multi && (p.assemble?.jumpZoom ?? true) ? edlCuts(p.edl!) : [],
    chips: [],
    logos: [],
    numbers: [],
    broll: [],
    checklists: [],
    cities: [],
    zooms: [],
    sfx: SFX,
    music: music ? {src: music.src, volume: +(music.volume * p.audio.musicVolume).toFixed(3), outroVolume: +(music.volume * p.audio.musicVolume * 2.3).toFixed(3)} : undefined,
    speechSeconds: +dur.toFixed(3),
    site: {...b.finale, at: p.finale ? Math.max(0, dur - 3.2) : dur + 999},
    cta: b.cta,
    ctaSeconds: p.finale ? 2.4 : 0.3,
    showSafeZone: false,
    format: p.format,
    brand: p.brand,
    bumper: p.brand === "gtt" ? undefined : false,
    focus: p.focus,
    captionSize: p.captions.size,
    captionTop: p.captions.top,
    captionStyle: p.captions.style,
    grade: gradeCss(p.grade.preset, p.grade.amount) || undefined,
    palette: p.palette && p.palette.preset !== "brand" ? {text: p.palette.text, accent: p.palette.accent, ink: p.palette.ink} : undefined,
  };
  const ctx = {words: p.words, image: (name: string) => LOCAL.image(p.id, name)};
  for (const e of [...p.effects].sort((a, b) => a.at - b.at)) effectById(e.effect)?.apply(props, e, ctx);
  return props;
}

export function durationFrames(props: Props, fps = 30) {
  const bf = bumperFrames(props as never);
  return Math.max(1, Math.round((props.speechSeconds + props.ctaSeconds) * fps) + bf.lead + bf.tail);
}

// секунда ролика (шкала исходника) → кадр предпросмотра (у GTT ролик сдвинут на заставку)
export const leadFrames = (props: Props) => bumperFrames(props as never).lead;
