// Разбор исходника прямо в браузере: длина и размер, кадры для ленты и цветокоррекции, звук (моно) и волна.
import {ALL_FORMATS, AudioSampleSink, BlobSource, Input} from "mediabunny";

export type Probe = {duration: number; width: number; height: number};

const loadVideo = (url: string) =>
  new Promise<HTMLVideoElement>((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "auto";
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error("Видео не открывается в этом браузере: попробуйте Chrome или Safari на Mac"));
    v.src = url;
  });

export async function probe(url: string): Promise<Probe> {
  const v = await loadVideo(url);
  return {duration: v.duration, width: v.videoWidth, height: v.videoHeight};
}

const seek = (v: HTMLVideoElement, t: number) =>
  new Promise<void>((resolve) => {
    const done = () => {
      v.removeEventListener("seeked", done);
      resolve();
    };
    v.addEventListener("seeked", done);
    v.currentTime = Math.max(0, Math.min(t, v.duration - 0.05));
  });

// кадры в моменты times → картинки (dataURL) шириной w; filter — CSS-фильтр (цветокоррекция) или пусто
export async function frames(url: string, times: number[], w = 240, filter = ""): Promise<string[]> {
  const v = await loadVideo(url);
  const h = Math.round((w * v.videoHeight) / Math.max(1, v.videoWidth));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const out: string[] = [];
  for (const t of times) {
    await seek(v, t);
    ctx.filter = filter || "none";
    ctx.drawImage(v, 0, 0, w, h);
    out.push(c.toDataURL("image/jpeg", 0.82));
  }
  v.removeAttribute("src");
  v.load();
  return out;
}

// один кадр как canvas (для живой цветокоррекции: фильтр меняется без повторной перемотки)
export async function frameCanvas(url: string, t: number, w = 360): Promise<HTMLCanvasElement> {
  const v = await loadVideo(url);
  await seek(v, t);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = Math.round((w * v.videoHeight) / Math.max(1, v.videoWidth));
  c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
  return c;
}

// звук исходника → моно Float32 с частотой rate (16000 — для Whisper, 48000 — для шумодава)
export async function decodeAudio(file: Blob, rate: number): Promise<Float32Array> {
  try {
    const ctx = new OfflineAudioContext(1, 1, rate);
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    return toMono(buf, rate);
  } catch {
    return decodeWithMediabunny(file, rate); // MOV и редкие кодеки, которые decodeAudioData не берёт
  }
}

async function decodeWithMediabunny(file: Blob, rate: number): Promise<Float32Array> {
  const input = new Input({source: new BlobSource(file), formats: ALL_FORMATS});
  const track = await input.getPrimaryAudioTrack();
  if (!track) throw new Error("В ролике нет звуковой дорожки");
  const sink = new AudioSampleSink(track);
  const parts: AudioBuffer[] = [];
  for await (const s of sink.samples()) {
    parts.push(s.toAudioBuffer());
    s.close();
  }
  if (!parts.length) throw new Error("Звук не прочитался");
  const sr = parts[0].sampleRate;
  const total = parts.reduce((n, b) => n + b.length, 0);
  const joined = new AudioBuffer({length: total, sampleRate: sr, numberOfChannels: 1});
  const ch = joined.getChannelData(0);
  let o = 0;
  for (const b of parts) {
    const m = toMono(b, sr);
    ch.set(m, o);
    o += m.length;
  }
  return resample(ch, sr, rate);
}

function toMono(buf: AudioBuffer, rate: number): Float32Array {
  const n = buf.length;
  const out = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += d[i] / buf.numberOfChannels;
  }
  return buf.sampleRate === rate ? out : resample(out, buf.sampleRate, rate);
}

export function resample(x: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return x;
  const n = Math.round((x.length * to) / from);
  const out = new Float32Array(n);
  const k = from / to;
  for (let i = 0; i < n; i++) {
    const p = i * k;
    const j = Math.floor(p);
    const f = p - j;
    out[i] = (x[j] ?? 0) * (1 - f) + (x[j + 1] ?? 0) * f;
  }
  return out;
}

// волна: максимум по модулю в n столбиках (0…1)
export function peaks(x: Float32Array, n: number): number[] {
  const out: number[] = [];
  const step = Math.max(1, Math.floor(x.length / n));
  let top = 1e-6;
  for (let i = 0; i < n; i++) {
    let m = 0;
    const end = Math.min(x.length, (i + 1) * step);
    for (let j = i * step; j < end; j += 4) m = Math.max(m, Math.abs(x[j]));
    out.push(m);
    top = Math.max(top, m);
  }
  return out.map((v) => v / top);
}

export const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`;
};
