// Картинки по смыслу: каталог генераций Higgsfield пользователя (library/images.json, 777 шт.) и смысловые векторы
// их описаний (library/images.emb, scripts/build_images.py). Фраза речи или запрос по-русски считается той же моделью
// прямо в окне (transformers.js, ~120 МБ один раз, дальше из кэша браузера) — ближайшие по смыслу картинки сверху.
// Уже стоявшие в роликах («одна картинка — один раз») и запрещённые (чужой бренд, кривая надпись) в подбор не идут.
import type {EffectItem, Word} from "./types";

export type Img = {n: number; id: string; prompt: string; url: string; aspect: string; used: boolean; blocked: boolean};

const CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";
const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;

export const thumb = (n: number) => `library/images/${n}.jpg`;
// имя файла картинки в props: предпросмотр подменяет его ссылкой (remotion_staticFiles), движок скачивает файл
export const hfName = (n: number | string) => `montazh-hf/${n}.png`;

let catalog: Promise<{items: Img[]; emb: Int8Array}> | null = null;
export function loadCatalog() {
  catalog ??= (async () => {
    const [items, emb] = await Promise.all([
      fetch("library/images.json").then((r) => r.json() as Promise<Img[]>),
      fetch("library/images.emb").then((r) => r.arrayBuffer()),
    ]);
    return {items, emb: new Int8Array(emb)};
  })();
  return catalog;
}

let extractor: Promise<any> | null = null;
export function loadModel(onProgress?: (k: number) => void) {
  extractor ??= (async () => {
    const T = await dynImport(CDN);
    T.env.allowLocalModels = false;
    try {
      const r = await fetch(`https://huggingface.co/${MODEL}/resolve/main/config.json`, {method: "HEAD"});
      if (!r.ok) throw new Error();
    } catch {
      T.env.remoteHost = "https://hf-mirror.com/";
    }
    const files: Record<string, {loaded: number; total: number}> = {};
    return T.pipeline("feature-extraction", MODEL, {
      dtype: "q8",
      progress_callback: (e: {status: string; file?: string; loaded?: number; total?: number}) => {
        if (e.status === "progress" && e.file) {
          files[e.file] = {loaded: e.loaded ?? 0, total: e.total ?? 0};
          const all = Object.values(files);
          onProgress?.(all.reduce((a, f) => a + f.loaded, 0) / Math.max(1, all.reduce((a, f) => a + f.total, 0)));
        }
      },
    });
  })();
  extractor.catch(() => (extractor = null));
  return extractor;
}

async function embed(texts: string[]): Promise<Float32Array[]> {
  const ex = await loadModel();
  const out = await ex(texts, {pooling: "mean", normalize: true});
  const dim = out.dims[1];
  return texts.map((_, i) => (out.data as Float32Array).slice(i * dim, (i + 1) * dim));
}

export type Found = Img & {score: number};

// k лучших картинок на каждый запрос; skip — номера, которые уже стоят в этом ролике
export async function search(queries: string[], skip: Set<number>, k = 3): Promise<Found[][]> {
  const {items, emb} = await loadCatalog();
  const qv = await embed(queries);
  const dim = qv[0]?.length ?? 384;
  return qv.map((q) => {
    const scored: Found[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.used || it.blocked || skip.has(it.n)) continue;
      let s = 0;
      for (let j = 0; j < dim; j++) s += emb[i * dim + j] * q[j];
      scored.push({...it, score: s / 127});
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, k);
  });
}

// фразы речи: по паузам > 0,45 с, концу предложения или 12 словам
export type Phrase = {at: number; until: number; text: string};
export function phrases(words: Word[]): Phrase[] {
  const out: Phrase[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({at: cur[0].start, until: cur[cur.length - 1].end, text: cur.map((w) => w.text).join(" ")});
    cur = [];
  };
  words.forEach((w, i) => {
    if (cur.length && (w.start - words[i - 1].end > 0.45 || cur.length >= 12)) flush();
    cur.push(w);
    if (/[.!?…]$/.test(w.text)) flush();
  });
  flush();
  return out;
}

// номера картинок, уже стоящих в ролике
export const usedInProject = (effects: EffectItem[]) => new Set(effects.filter((e) => e.params.hf).map((e) => +e.params.hf));

const TRANSITIONS = ["broll-circle", "broll-slide", "broll-zoom", "broll-wipe", "broll-pip", "broll-screen"];

// «Расставить сам»: перебивка примерно раз в 9 с на фразе 2,5–4 с, не в первые 2 с и не в финале, не поверх
// других перебивок, хуков и списков; картинка — лучшая по смыслу фразы, без повторов; переходы по кругу
export async function autoPlace(words: Word[], duration: number, effects: EffectItem[], every = 9): Promise<EffectItem[]> {
  const busy = effects.filter((e) => /^(broll|hook|checklist|stock)/.test(e.effect)).map((e) => [e.at - 0.8, (e.until ?? e.at + 3) + 0.8]);
  const free = (a: number, b: number) => !busy.some(([x, y]) => a < y && b > x);
  const cand = phrases(words).filter((p) => p.at >= 2 && p.at + 2.5 <= duration - 3.5 && p.text.split(" ").length >= 3);
  const picked: Phrase[] = [];
  let last = -every;
  for (const p of cand) {
    const until = Math.min(p.at + 4, Math.max(p.at + 2.5, p.until), duration - 3.5);
    if (p.at - last < every || !free(p.at, until)) continue;
    picked.push({...p, until});
    last = p.at;
  }
  if (!picked.length) return [];
  const skip = usedInProject(effects);
  const found = await search(
    picked.map((p) => p.text),
    skip,
    8,
  );
  const out: EffectItem[] = [];
  const brollBefore = effects.filter((e) => e.effect.startsWith("broll")).length;
  picked.forEach((p, i) => {
    const img = found[i].find((f) => !skip.has(f.n));
    if (!img) return;
    skip.add(img.n);
    out.push({
      id: Math.random().toString(36).slice(2, 9),
      effect: TRANSITIONS[(brollBefore + out.length) % TRANSITIONS.length],
      at: +p.at.toFixed(2),
      until: +p.until.toFixed(2),
      params: {hf: String(img.n), hfUrl: img.url, auto: "1"},
    });
  });
  return out;
}
