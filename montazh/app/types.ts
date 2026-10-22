// Проект Монтажной: всё, что пользователь выбрал для одного ролика. Хранится в браузере (IndexedDB),
// в работу уходит как задание job.json (см. job.ts).

export type Brand = "gtt" | "aura" | "od";
export type Word = {text: string; start: number; end: number};

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

export type Project = {
  id: string;
  name: string;
  brand: Brand;
  format: "reels" | "stories";
  created: string;
  updated: string;
  source?: SourceInfo;
  focus: {x: number; y: number}; // линия глаз — центр зумов (кадр 1080×1920)
  words: Word[];
  wordsFrom?: "browser" | "engine" | "file" | "manual";
  captions: {style: "flat" | "3d"; size: number; top: number};
  audio: {clean: boolean; music: string | null; musicVolume: number};
  grade: {preset: string; amount: number};
  finale: boolean; // финал с сайтом бренда
  effects: EffectItem[];
  notes: Note[];
  sentAt?: string;
};

export const newId = (p = "") => p + Math.random().toString(36).slice(2, 9);
export const nowIso = () => new Date().toISOString().slice(0, 19).replace("T", " ");
