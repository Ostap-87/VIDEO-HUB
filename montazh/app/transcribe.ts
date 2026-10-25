// Распознавание речи прямо в окне: Whisper (transformers.js, модель скачивается один раз и хранится в кэше).
// Откуда качать (сервер Mac с зеркалами или напрямую) — netload.ts. Слова с таймингами → субтитры сразу в предпросмотре.
// Точнее и быстрее делает движок (whisper.cpp в reels-studio) — его результат подставляется сам, когда ролик обработан.
import {decodeAudio} from "./media";
import {loadTransformers, netError} from "./netload";
import type {Word} from "./types";

export type AsrModel = "base" | "small";

// Модель загружается в память окна один раз на все ролики (раньше — заново на каждый ролик, и после 5–6 роликов память
// окна кончалась: «Can't create a session. failed to allocate a buffer», 25.10.2026). Другая модель — старая выгружается.
let cache: {model: AsrModel; asr: Promise<any>} | null = null;
const NO_MEMORY = /allocate|out of memory|can't create a session|memory access out of bounds|aborted\(/i;

async function drop() {
  const c = cache;
  cache = null;
  if (c) await c.asr.then((a) => a.dispose?.()).catch(() => undefined);
}

async function getAsr(model: AsrModel, onProgress: (k: number, what: string) => void) {
  if (cache?.model === model) return cache.asr;
  await drop();
  const T = await loadTransformers();
  const files: Record<string, {loaded: number; total: number}> = {};
  const asr = T.pipeline("automatic-speech-recognition", `Xenova/whisper-${model}`, {
    dtype: "q8",
    progress_callback: (e: {status: string; file?: string; loaded?: number; total?: number}) => {
      if (e.status === "progress" && e.file) {
        files[e.file] = {loaded: e.loaded ?? 0, total: e.total ?? 0};
        const all = Object.values(files);
        const k = all.reduce((a, f) => a + f.loaded, 0) / Math.max(1, all.reduce((a, f) => a + f.total, 0));
        onProgress(0.05 + 0.35 * k, `Скачиваю модель Whisper ${model} (один раз): ${Math.round(k * 100)}%`);
      }
    },
  });
  cache = {model, asr};
  asr.catch(() => cache?.asr === asr && (cache = null));
  return asr;
}

export async function transcribe(
  file: Blob,
  model: AsrModel,
  onProgress: (k: number, what: string) => void,
): Promise<Word[]> {
  onProgress(0, "Загружаю распознавание речи");
  let out: {chunks?: {text: string; timestamp: [number, number | null]}[]};
  try {
    const asr = await getAsr(model, onProgress);
    onProgress(0.42, "Читаю звук");
    const pcm = await decodeAudio(file, 16000);
    onProgress(0.48, `Распознаю речь (${Math.round(pcm.length / 16000)} с звука — это может занять пару минут)`);
    out = await asr(pcm, {
      language: "russian",
      task: "transcribe",
      return_timestamps: "word",
      chunk_length_s: 30,
      stride_length_s: 5,
    });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (!NO_MEMORY.test(msg)) throw new Error(netError(e));
    await drop();
    if (model === "small") {
      onProgress(0.02, "Для точной модели не хватило памяти окна — распознаю быстрой (Whisper base)");
      return transcribe(file, "base", onProgress);
    }
    throw new Error("не хватило памяти окна. Закройте и снова откройте Монтажную и нажмите «Распознать» ещё раз — " +
      "уже распознанные ролики останутся");
  }
  onProgress(1, "Готово");
  const chunks = out.chunks ?? [];
  return chunks
    .map((c) => ({text: c.text.trim(), start: c.timestamp[0] ?? 0, end: c.timestamp[1] ?? (c.timestamp[0] ?? 0) + 0.3}))
    .filter((w) => w.text);
}

// готовые субтитры из файла: words.json (как у reels-studio) или .srt (каждая реплика делится на слова поровну)
export function parseWordsFile(name: string, text: string): Word[] {
  if (name.toLowerCase().endsWith(".json")) {
    const d = JSON.parse(text);
    const arr = Array.isArray(d) ? d : d.words;
    return (arr as Word[]).map((w) => ({text: String(w.text).trim(), start: +w.start, end: +w.end})).filter((w) => w.text);
  }
  const ts = (s: string) => {
    const m = s.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000 : 0;
  };
  const words: Word[] = [];
  for (const block of text.replace(/\r/g, "").split(/\n\n+/)) {
    const lines = block.split("\n").filter(Boolean);
    const tl = lines.find((l) => l.includes("-->"));
    if (!tl) continue;
    const [a, b] = tl.split("-->").map(ts);
    const toks = lines.slice(lines.indexOf(tl) + 1).join(" ").split(/\s+/).filter(Boolean);
    toks.forEach((t, i) => words.push({text: t, start: a + ((b - a) * i) / toks.length, end: a + ((b - a) * (i + 1)) / toks.length}));
  }
  return words;
}
