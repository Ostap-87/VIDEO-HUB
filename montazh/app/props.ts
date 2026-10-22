// Проект Монтажной → props шаблона TalkReelPro. Одни и те же props играет предпросмотр (Remotion Player в окне)
// и рендерит движок (reels-studio), поэтому «что видно в окне — то и в ролике».
import {bumperFrames} from "../../reels-studio/src/compositions/TalkReelPro";
import {BRANDS, MUSIC, SFX} from "./brands";
import {effectById, type Props} from "./effects";
import {gradeCss} from "./grades";
import type {Project} from "./types";

// имена файлов, которые в предпросмотре подменяются файлами из браузера (window.remotion_staticFiles)
export const LOCAL = {video: "montazh-local/source", clean: "montazh-local/clean.wav", image: (pid: string, name: string) => `montazh-local/${pid}/${name}`};

export function buildProps(p: Project, opts: {cleanReady?: boolean; source?: string} = {}): Props {
  const dur = p.source?.duration ?? 10;
  const b = BRANDS[p.brand];
  const music = p.audio.music ? MUSIC.find((m) => m.id === p.audio.music) : null;
  const accent = [...new Set(p.words.map((w) => w.text).filter((t) => /\d/.test(t)))];
  const props: Props = {
    mediaSrc: opts.source ?? LOCAL.video,
    cutoutSrc: "",
    audioSrc: p.audio.clean && opts.cleanReady ? LOCAL.clean : undefined,
    words: p.words,
    accentWords: accent,
    cuts: [],
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
