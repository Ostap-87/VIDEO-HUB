// Три бренда шаблона TalkReelPro (reels-studio/src/brand.ts) и что им нужно для предпросмотра:
// звуки, музыка, страницы сайта для финала. Файлы кладёт в сборку build.mjs (ASSETS) — пути от корня VIDEO-HUB.
import type {Brand} from "./types";

const SFX_DIR = "source-videos/2026-10-07-byt-tehnika/sfx/";
export const SFX = {pop: SFX_DIR + "switch.wav", whoosh: SFX_DIR + "whoosh.wav", whip: SFX_DIR + "whip.wav", click: SFX_DIR + "switch.wav"};

export const MUSIC: {id: string; title: string; src: string; volume: number}[] = [
  {id: "inspiring-corporate-soundrider", title: "Inspiring Corporate (по умолчанию)", src: "интернет-материалы/музыка/inspiring-corporate-soundrider.mp3", volume: 0.078},
  {id: "upbeat-corporate-soundrider", title: "Upbeat Corporate", src: "интернет-материалы/музыка/upbeat-corporate-soundrider.mp3", volume: 0.07},
  {id: "inspiring-ambient-motivation-soundrider", title: "Inspiring Ambient Motivation", src: "интернет-материалы/музыка/inspiring-ambient-motivation-soundrider.mp3", volume: 0.08},
];

export const BRANDS: Record<Brand, {title: string; site: string; cta: string; finale: {home: string; catalog: string; route: string[]}; captionTop: number; captionSize: number}> = {
  gtt: {
    title: "GlobalTechTour",
    site: "globaltechtour.ru",
    cta: "Экспедиции",
    finale: {home: "source-videos/2026-10-07-byt-tehnika/site/home-mobile-full.png", catalog: "source-videos/2026-10-07-byt-tehnika/site/expeditions-top.png", route: []},
    captionTop: 1250,
    captionSize: 66,
  },
  aura: {
    title: "Aura Robotics",
    site: "aura-robotics.ru",
    cta: "Роботы из Китая",
    finale: {home: "source-videos/aura-robotics/site/home-mobile-full.png", catalog: "source-videos/aura-robotics/site/catalog-humanoid.png", route: []},
    captionTop: 1250,
    captionSize: 66,
  },
  od: {
    title: "ostapdotcenko.ru",
    site: "ostapdotcenko.ru",
    cta: "Подробнее на сайте",
    finale: {home: "source-videos/ostapdotcenko/site/home-mobile-full.png", catalog: "source-videos/ostapdotcenko/site/career-mobile.png", route: []},
    captionTop: 1320,
    captionSize: 52,
  },
};

// всё, что шаблону нужно из репозитория (копируется в сборку: dist/assets/<путь>)
export const ASSETS = [
  ...Object.values(SFX),
  ...MUSIC.map((m) => m.src),
  ...Object.values(BRANDS).flatMap((b) => [b.finale.home, b.finale.catalog, ...b.finale.route]),
];
