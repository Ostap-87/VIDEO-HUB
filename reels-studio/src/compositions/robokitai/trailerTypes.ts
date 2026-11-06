// «Робокитай» — Серия 0 (трейлер вселенной) и карусели «Карта Робокитая» / «Команда Aura» (06.11.2026, пользователь: «По ролику ок,
// делай»). Края и герои — по документу вселенной (Claude Docs «Робокитай: вселенная команды Aura», «Карта Робокитая (сезон 1)»):
// это рамка вселенной, а не факты о компаниях, цифр нет. Props — props/robokitai/000-trailer.json и carousel-*.json.
import {CITY_XY} from "./chinaMap";

// 16 героев: id → портрет `finished-videos/обложки/aura-персонажи/<file>.png` (AuraCast), имя, EN · ZH, тип робота
export const CAST: Record<string, {file: string; name: string; en: string; zh: string; type: string}> = {
  avi: {file: "01-mascot", name: "Ави", en: "Avi", zh: "阿维", type: "ведущий-инженер"},
  scout: {file: "02-dog", name: "Скаут", en: "Scout", zh: "斯考特", type: "робособака-разведчик"},
  leon: {file: "03-humanoid", name: "Леон", en: "Leon", zh: "莱昂", type: "гуманоид"},
  nova: {file: "04-humanoid-navy", name: "Нова", en: "Nova", zh: "诺娃", type: "гуманоид"},
  rolly: {file: "05-wheel-humanoid", name: "Роли", en: "Rolly", zh: "罗利", type: "гуманоид на колёсах"},
  carry: {file: "06-wheel-humanoid-navy", name: "Кэрри", en: "Carry", zh: "凯丽", type: "гуманоид на колёсах"},
  armie: {file: "07-arm", name: "Арми", en: "Armie", zh: "阿米", type: "промышленный манипулятор"},
  titan: {file: "08-arm-industrial", name: "Титан", en: "Titan", zh: "泰坦", type: "промышленный манипулятор"},
  tikhon: {file: "09-cobot", name: "Тихон", en: "Tikhon", zh: "吉洪", type: "кобот"},
  fiver: {file: "10-hand", name: "Пятёрка", en: "Fiver", zh: "小五", type: "роборука"},
  ruby: {file: "11-hand-chrome", name: "Рубин", en: "Ruby", zh: "鲁比", type: "роборука"},
  zippy: {file: "12-agv", name: "Шустрик", en: "Zippy", zh: "快快", type: "AGV-тележка"},
  ginger: {file: "13-agv-orange", name: "Рыжик", en: "Ginger", zh: "小橙", type: "AGV-тележка"},
  falcon: {file: "14-drone", name: "Сокол", en: "Falcon", zh: "猎鹰", type: "дрон-инспектор"},
  swift: {file: "15-drone-white", name: "Стриж", en: "Swift", zh: "雨燕", type: "дрон-инспектор"},
  stork: {file: "16-cargo-drone", name: "Аист", en: "Stork", zh: "白鹳", type: "грузовой дрон"},
};
export const CAST_ORDER = Object.keys(CAST);
export const portraitSrc = (id: string) => `finished-videos/обложки/aura-персонажи/${CAST[id]?.file ?? id}.png`;

// край: город на карте (`city` — ключ CITY_XY) или своя точка `xy` (Застава), печать, название, кто живёт, герои
export type Region = {
  id: string;
  city?: string;
  xy?: [number, number];
  seal: string;
  name: string; // «Сучжоу»
  zh: string; // «苏州»
  title: string; // «Край коботов»
  who: string; // ≤ 8 слов
  heroes: string[];
  episodes: string[]; // темы серий без дат
  sealOff?: [number, number]; // сдвиг маленькой печати на карте (px при масштабе 1), чтобы соседние не налезали
};
export const regionXY = (r: Region): [number, number] => r.xy ?? CITY_XY[r.city ?? r.name] ?? [500, 420];

export type TBeat = "hook" | "flight" | "team" | "episode" | "end";
export const T_BEATS: TBeat[] = ["hook", "flight", "team", "episode", "end"];

export type RobokitaiTrailerProps = {
  series: {name: string; zh: string; ep: number};
  sec: Record<TBeat, number>;
  regionSec: number; // длина одного края в облёте
  music: {src: string; from: number; volume: number; fadeOut?: number; credit?: string};
  hook: {line: string; title: string; mark: string; zh: string; at: number};
  regions: Region[];
  team: {
    lead: {id: string; role: string}[]; // Ави, Скаут — плашки в 3D
    leadTitle: string;
    leadSec: number; // сколько из `team` идёт 3D-сцена, остальное — сетка
    grid: string; // «16 героев · у каждого свой край»
    gridMark?: string;
  };
  episode: {title: string; mark?: string; video: string; clips: {from: number; dur: number; crop: [number, number, number, number]; label: string}[]};
  end: {kicker: string; title: string; sub: string; cta: string; mark?: string; url: string; seal: string};
};

export const rtScenes = (P: RobokitaiTrailerProps) => {
  const out = {} as Record<TBeat, [number, number]>;
  let t = 0;
  T_BEATS.forEach((id) => {
    const d = Math.round(P.sec[id] * 30);
    out[id] = [t, t + d];
    t += d;
  });
  return out;
};
export const rtFrames = (P: RobokitaiTrailerProps) => rtScenes(P).end[1];

// карусели: «Карта Робокитая» (обложка-карта, края, финал) и «Команда Aura» (обложка-фото, герои, финал)
export type CarouselSlide =
  | {kind: "mapCover"; title: string; mark?: string; zh: string; sub: string}
  | {kind: "region"; region: string; n: number; doneEp?: number}
  | {kind: "teamCover"; title: string; mark?: string; sub: string}
  | {kind: "hero"; id: string; type?: string; home: string; seal: string; trait: string}
  | {kind: "final"; kicker: string; title: string; mark?: string; lines: string[]; cta: string};
export type RobokitaiCarouselProps = {
  series: {name: string; zh: string};
  regions: Region[];
  slides: CarouselSlide[];
  site: string;
};
