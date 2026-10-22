// «Чистый голос» для предпросмотра: нейросетевой шумодав RNNoise (WebAssembly, прямо в браузере) + мягкая студийная
// цепочка (срез < 70 Гц, −1 дБ «бубнение» 300 Гц, +3 дБ верх от 5 кГц, очень мягкий компрессор, громкость ~ −14 LUFS) —
// та же, что у движка (reels-studio/scripts/cut_pauses.py, AUDIO_CHAIN). Финальный звук делает движок: DeepFilterNet3.
// 22.10.2026 («голос глухой, как из трубы, и с каким-то эхо»), замер на уличном od-6:
//  - выход RNNoise задержан на 960 сэмплов (20 мс) — компенсируем, иначе голос отстаёт от губ;
//  - 100 % обработанного звука глушит согласные и хвосты слов — подмешиваем исходник: −15 дБ в речи, −24 дБ в паузах
//    (по оценке речи самой RNNoise), так шум остаётся задавленным, а голос живым;
//  - прежний компрессор (−20 дБ, 3:1) поднимал хвосты слов — отражения улицы — на 3 дБ: это и было «эхо».
import {decodeAudio} from "./media";

const RATE = 48000;
const FRAME = 480; // RNNoise: 10 мс при 48 кГц
const DELAY = 960; // задержка выхода RNNoise (замер: корреляция с исходником 0,99 при 960 сэмплах)
const DRY_SPEECH = Math.pow(10, -15 / 20); // доля исходника в речи
const DRY_PAUSE = Math.pow(10, -24 / 20); // и в паузах
const COMP_DELAY = 288; // компрессор WebAudio смотрит вперёд на 6 мс и на столько же задерживает звук — компенсируем

type RnnModule = {
  _rnnoise_create(): number;
  _rnnoise_destroy(st: number): void;
  _rnnoise_process_frame(st: number, out: number, inp: number): number;
  _malloc(n: number): number;
  _free(p: number): void;
  HEAPF32: Float32Array;
};

let rnn: Promise<RnnModule> | null = null;
function loadRnn(): Promise<RnnModule> {
  if (!rnn) {
    const url = new URL("vendor/rnnoise-sync.js", document.baseURI).href;
    // отдельный файл (1,9 МБ), грузится только при первом шумодаве
    rnn = (new Function("u", "return import(u)") as (u: string) => Promise<{default: () => RnnModule | Promise<RnnModule>}>)(url).then(async (m) => {
      const mod = await m.default();
      return mod;
    });
  }
  return rnn;
}

export async function denoise(x: Float32Array, onProgress?: (k: number) => void): Promise<Float32Array> {
  const m = await loadRnn();
  const st = m._rnnoise_create();
  const pin = m._malloc(FRAME * 4);
  const pout = m._malloc(FRAME * 4);
  const frames = Math.ceil((x.length + DELAY) / FRAME);
  const wet = new Float32Array(frames * FRAME);
  const vad = new Float32Array(frames);
  const buf = new Float32Array(FRAME);
  for (let k = 0; k < frames; k++) {
    const i = k * FRAME;
    buf.fill(0);
    if (i < x.length) buf.set(x.subarray(i, Math.min(x.length, i + FRAME)));
    for (let j = 0; j < FRAME; j++) buf[j] *= 32768;
    m.HEAPF32.set(buf, pin >> 2);
    vad[k] = m._rnnoise_process_frame(st, pout, pin);
    const res = m.HEAPF32.subarray(pout >> 2, (pout >> 2) + FRAME);
    for (let j = 0; j < FRAME; j++) wet[i + j] = res[j] / 32768;
    if (onProgress && k % 2000 === 0) onProgress(i / x.length);
  }
  m._free(pin);
  m._free(pout);
  m._rnnoise_destroy(st);
  // доля исходника по кадрам: речь (vad ≥ 0,7) — DRY_SPEECH, тишина (≤ 0,2) — DRY_PAUSE, сглажено ±30 мс
  const dry = new Float32Array(frames);
  for (let k = 0; k < frames; k++) {
    let v = 0;
    let n = 0;
    for (let d = -3; d <= 3; d++) {
      const q = k + d;
      if (q >= 0 && q < frames) {
        v += Math.min(1, Math.max(0, (vad[q] - 0.2) / 0.5));
        n++;
      }
    }
    dry[k] = DRY_PAUSE + (DRY_SPEECH - DRY_PAUSE) * (v / n);
  }
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = wet[i + DELAY] + x[i] * dry[Math.floor(i / FRAME)];
  return out;
}

async function studioChain(x: Float32Array): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, x.length + COMP_DELAY, RATE);
  const b = ctx.createBuffer(1, x.length, RATE);
  b.getChannelData(0).set(x);
  const src = ctx.createBufferSource();
  src.buffer = b;
  const hp = Object.assign(ctx.createBiquadFilter(), {type: "highpass"} as const);
  hp.frequency.value = 70;
  const mud = Object.assign(ctx.createBiquadFilter(), {type: "peaking"} as const);
  mud.frequency.value = 300;
  mud.Q.value = 1.4;
  mud.gain.value = -1;
  const air = Object.assign(ctx.createBiquadFilter(), {type: "highshelf"} as const);
  air.frequency.value = 5000;
  air.gain.value = 3;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 1.8;
  comp.attack.value = 0.02;
  comp.release.value = 0.3;
  comp.knee.value = 6;
  src.connect(hp).connect(mud).connect(air).connect(comp).connect(ctx.destination);
  src.start();
  const r = await ctx.startRendering();
  return r.getChannelData(0).slice(COMP_DELAY);
}

// громкость речи: по громким 400-мс окнам (грубая замена LUFS) → −14 дБ, пики не выше −1 дБ
function normalize(x: Float32Array): Float32Array {
  const win = Math.round(RATE * 0.4);
  const rms: number[] = [];
  for (let i = 0; i + win <= x.length; i += win) {
    let s = 0;
    for (let j = i; j < i + win; j += 2) s += x[j] * x[j];
    rms.push(Math.sqrt(s / (win / 2)));
  }
  rms.sort((a, b) => a - b);
  const loud = rms.slice(Math.floor(rms.length * 0.6)); // речь, без пауз
  const level = loud.length ? loud.reduce((a, b) => a + b, 0) / loud.length : 0.05;
  let gain = Math.pow(10, -14 / 20) / Math.max(level, 1e-4);
  let peak = 0;
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  gain = Math.min(gain, 0.89 / Math.max(peak, 1e-4));
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] * gain;
  return out;
}

export async function cleanVoice(file: Blob, onProgress?: (k: number, what: string) => void): Promise<Blob> {
  onProgress?.(0, "Читаю звук");
  const x = await decodeAudio(file, RATE);
  onProgress?.(0.15, "Шумодав RNNoise");
  const d = await denoise(x, (k) => onProgress?.(0.15 + 0.6 * k, "Шумодав RNNoise"));
  onProgress?.(0.8, "Эквалайзер и компрессор");
  const e = await studioChain(d);
  onProgress?.(0.95, "Громкость");
  return wav(normalize(e), RATE);
}

export function wav(x: Float32Array, rate: number): Blob {
  const n = x.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i])) * 0x7fff, true);
  return new Blob([buf], {type: "audio/wav"});
}
