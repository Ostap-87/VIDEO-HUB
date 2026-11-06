// Props серии «Робокитай» (reels-studio/props/robokitai/NNN-<город>.json). Все тексты и цифры — из статьи серии.
import type {CardLine} from "./kit";

export type RKBeatId = "letter" | "map" | "arrival" | "trial" | "twist" | "decide" | "client" | "next";
export const RK_BEATS: RKBeatId[] = ["letter", "map", "arrival", "trial", "twist", "decide", "client", "next"];
export const RK_TABS: Record<RKBeatId, string> = {
  letter: "задание",
  map: "карта",
  arrival: "прибытие",
  trial: "испытание",
  twist: "поворот",
  decide: "решение",
  client: "у клиента",
  next: "дальше",
};

export type RKHero = {id: "scout" | "zippy" | "ginger" | "avi"; name: string; role: string; home?: string; at: number};
export type RKTerm = {t: string; label?: string};

export type RobokitaiProps = {
  series: {name: string; zh: string; ep: number};
  city: {name: string; zh: string; zhFull?: string; tagline: string};
  title: string;
  article?: string;
  music: {src: string; from?: number; volume: number; credit?: string};
  sec: Record<RKBeatId, number>;
  letter: {kicker: string; lines: CardLine[]; host: {name: string; role: string}};
  map: {route: string[]; dots: string[]; kicker: string; fromOff?: [number, number]}; // fromOff — сдвиг подписи начального города (близкие города не налезают)
  arrival: {title: string; mark?: string; heroes: RKHero[]};
  trial: {a: {term: string; sub?: string; lines: CardLine[]}; b: {term: string; sub?: string; lines: CardLine[]}; map: string};
  twist: {stuck: string; insight: CardLine; labels: {threshold: string; gap: string}; spec: {title: string; threshold: string; gap: string}; note: string};
  decide: {
    criteria: {title: string; text: string}[];
    formula: {title: string; rows: RKTerm[][]; result: number; unit: string; note: string};
  };
  client: {robots: number; caption: CardLine; fixed: string; takeaway: CardLine};
  next: {cta: string; url: string; kicker: string; city: string; zh: string; tagline: string; hero: string; role: string};
};

export const RK_X = 12; // наложение соседних сцен (кадры перехода)
export const rkScenes = (P: RobokitaiProps) => {
  const out: Record<RKBeatId, [number, number]> = {} as Record<RKBeatId, [number, number]>;
  let t = 0;
  for (const id of RK_BEATS) {
    const d = Math.round(P.sec[id] * 30);
    out[id] = [t, t + d];
    t += d - RK_X;
  }
  return out;
};
export const rkFrames = (P: RobokitaiProps) => rkScenes(P).next[1];
