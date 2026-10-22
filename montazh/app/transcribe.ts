// Распознавание речи прямо в браузере: Whisper (transformers.js, модель скачивается один раз и хранится в кэше
// браузера). Если huggingface.co закрыт — зеркало hf-mirror.com. Слова с таймингами → субтитры сразу в предпросмотре.
// Точнее и быстрее делает движок (whisper.cpp в reels-studio) — его результат подставляется сам, когда ролик обработан.
import {decodeAudio} from "./media";
import type {Word} from "./types";

const CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";
const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;

async function reachable(url: string) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 6000);
    const r = await fetch(url, {method: "HEAD", signal: c.signal});
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

export type AsrModel = "base" | "small";

export async function transcribe(
  file: Blob,
  model: AsrModel,
  onProgress: (k: number, what: string) => void,
): Promise<Word[]> {
  onProgress(0, "Загружаю распознавание речи");
  const T = await dynImport(CDN);
  T.env.allowLocalModels = false;
  const repo = `Xenova/whisper-${model}`;
  if (!(await reachable(`https://huggingface.co/${repo}/resolve/main/config.json`))) T.env.remoteHost = "https://hf-mirror.com/";
  const files: Record<string, {loaded: number; total: number}> = {};
  const asr = await T.pipeline("automatic-speech-recognition", repo, {
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
  onProgress(0.42, "Читаю звук");
  const pcm = await decodeAudio(file, 16000);
  onProgress(0.48, `Распознаю речь (${Math.round(pcm.length / 16000)} с звука — это может занять пару минут)`);
  const out = await asr(pcm, {
    language: "russian",
    task: "transcribe",
    return_timestamps: "word",
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  onProgress(1, "Готово");
  const chunks: {text: string; timestamp: [number, number | null]}[] = out.chunks ?? [];
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
