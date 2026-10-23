// Проект Монтажной: всё, что пользователь выбрал для одного ролика. Хранится в браузере (IndexedDB),
// в работу уходит как задание job.json (см. job.ts).

export type Brand = "gtt" | "aura" | "od";
// c, ci — из какого ролика склейки слово и его номер там (чтобы правка текста попала в слова ролика)
export type Word = {text: string; start: number; end: number; c?: string; ci?: number};

export type EffectItem = {
  id: string; // уникальный id вставки
  effect: string; // id эффекта из библиотеки (effects.ts)
  at: number; // секунда ролика
  until?: number;
  params: Record<string, string>;
};

export type Note = {id: string; at: number; text: string; done?: boolean; created: string};

export type SourceInfo = {
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  url?: string; // ссылка, если ролик пришёл по ссылке (Google Диск, Яндекс Диск, Dropbox, прямая)
  local: boolean; // файл лежит в браузере (IndexedDB) — можно смотреть и править без загрузки
};

// Ролик или фото в медиатеке проекта (решение пользователя 22.10.2026: «добавлять несколько роликов и потом на основе
// их склеивать видео… туда можно добавлять и фото»). Файл — в IndexedDB под clipKey(id); words — в секундах самого ролика.
export type Clip = {
  id: string;
  kind: "video" | "photo";
  name: string;
  size: number;
  duration: number; // у фото 0
  width: number;
  height: number;
  added: string;
  words?: Word[];
  cut?: number[]; // номера слов, вырезанных чисткой (эканья, мусорные слова, неудачные дубли) — в субтитры не идут
  off?: boolean; // ролик не идёт в склейку (например, запасной дубль)
};

// Кусок монтажного листа: [from, to] секунд ролика clip; куски идут встык в порядке массива
export type Seg = {clip: string; from: number; to: number};

// Настройки склейки и чистки (assemble.ts): что вырезать; keep — отдельные вырезы, которые пользователь вернул;
// takes — какой дубль выбран в группе повторов (ключ группы → ключ фразы)
export type AssembleOpts = {
  pauses: boolean;
  minPause: number;
  fillers: boolean;
  noise: boolean; // звук без слов (цыканья, вдохи, «мэ»), который Whisper не записал
  trash: string[]; // какие мусорные слова вырезать
  restarts: boolean; // оговорки: «я, я буду», оборванное начало фразы
  takes: boolean; // повторы фразы — оставить лучший дубль
  jumpZoom: boolean; // зум на склейках (джамп-каты: уровни 1.0 / 1.08 / 1.02 …)
  keep: string[];
  pick: Record<string, string>;
};

export type Project = {
  id: string;
  name: string;
  brand: Brand;
  format: "reels" | "stories" | "both"; // both — облако делает сразу Reels и Stories (решение пользователя 23.10.2026)
  created: string;
  updated: string;
  source?: SourceInfo;
  focus: {x: number; y: number}; // линия глаз — центр зумов (кадр 1080×1920)
  words: Word[];
  wordsFrom?: "browser" | "engine" | "file" | "manual";
  captions: {style: "flat" | "3d"; size: number; top: number};
  audio: {clean: boolean; music: string | null; musicVolume: number};
  grade: {preset: string; amount: number};
  palette?: {preset: string; text?: string; accent?: string; ink?: string}; // цвета текста (palettes.ts)
  finale: boolean; // финал с сайтом бренда
  effects: EffectItem[];
  notes: Note[];
  sentAt?: string;
  jobs?: {id: string; sentAt: string; cutPauses: boolean}[]; // отправленные в облако задания (новые сверху)
  clips?: Clip[]; // медиатека: ролики и фото (без неё — один исходник source)
  edl?: Seg[]; // монтажный лист; без него ролик = весь исходник
  assemble?: AssembleOpts;
  rhythm?: {every: number; set: string; effect?: string}; // «Ритм»: эффект каждые every секунд (auto.ts)
};

export const newId = (p = "") => p + Math.random().toString(36).slice(2, 9);
export const nowIso = () => new Date().toISOString().slice(0, 19).replace("T", " ");
