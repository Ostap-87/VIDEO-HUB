// Props серии «Робокитай» v2 — с драматургией (props/robokitai/NNN-<город>-v2.json). Факты — только из статьи серии;
// рамка сюжета (распродажа 11.11, дедлайн, начальник склада) — вымысел для интриги, цифр о ней нет.
import type {CardLine} from "./kit";
import type {Mood} from "./drama2d";

export type DBeat = "cold" | "stakes" | "map" | "try1" | "guess" | "try2" | "crisis" | "insight" | "twist" | "payoff" | "cliff";
export const D_BEATS: DBeat[] = ["cold", "stakes", "map", "try1", "guess", "try2", "crisis", "insight", "twist", "payoff", "cliff"];
// резкая склейка (без «сдвига страницы»): после заставки, на паузу-угадайку и обратно, на кризис
export const D_CUT: Record<DBeat, boolean> = {cold: true, stakes: true, map: false, try1: false, guess: true, try2: true, crisis: true, insight: false, twist: false, payoff: false, cliff: false};
export const D_X = 12;

export type RobokitaiDramaProps = {
  series: {name: string; zh: string; ep: number};
  city: {name: string; zh: string; zhFull?: string; tagline: string};
  title: string;
  article?: string;
  sec: Record<DBeat, number>;
  // музыка: часть A — от «ставок» до кризиса (на угадайке тише), часть B — с поворота (удар трека `dropAt` — на начало поворота)
  music: {src: string; volume: number; aFrom?: number; dropAt: number; guessDuck?: number; credit?: string};
  // таймер дедлайна: [сцена, секунда сцены, дней]; 0 — «00:00», после `doneAt` (сек сцены payoff) — зелёный `done`
  countdown: {label: string; done: string; doneAt: number; keys: [DBeat, number, number][]; blink: DBeat[]; hide: DBeat[]};
  // клиент — начальник склада: настроение по ключам [сцена, секунда, настроение], кружок-лицо в сценах `inset`
  manager: {name: string; role: string; label: string; moods: [DBeat, number, Mood][]; inset: DBeat[]};
  cold: {flash: string; flashAt: number};
  stakes: {letter: CardLine[]; queue: string; host: {name: string; role: string}};
  map: {route: string[]; dots: string[]; kicker: string; k: number};
  try1: {night: string; morning: string; card: CardLine[]; term: string; sub: string; lines: CardLine[]};
  guess: {q: string; a: {letter: string; name: string; role: string}; b: {letter: string; name: string; role: string}};
  try2: {card1: {term: string; lines: CardLine[]}; card2: {lines: CardLine[]; cyl: string; note?: string}; map: string};
  crisis: {caption: CardLine; door: string};
  insight: {threshold: string; gap: string; spec: string; note: string; quote: CardLine; scout: {name: string; role: string}};
  twist: {
    criteria: {title: string; text: string}[];
    title: string;
    before: {trip: number; result: number};
    after: {trip: number; result: number; approx: string};
    tripLabel: string;
    saved: string;
    shipping: string;
    card: CardLine;
    note: string;
  };
  payoff: {robots: number; caption: CardLine; fixed: string};
  cliff: {sos: string; city: string; next: string; url: string};
};

export const rdScenes = (P: RobokitaiDramaProps) => {
  const out = {} as Record<DBeat, [number, number]>;
  let t = 0;
  D_BEATS.forEach((id, i) => {
    const d = Math.round(P.sec[id] * 30);
    const next = D_BEATS[i + 1];
    out[id] = [t, t + d];
    t += d - (next && !D_CUT[next] ? D_X : 0);
  });
  return out;
};
export const rdFrames = (P: RobokitaiDramaProps) => rdScenes(P).cliff[1];
