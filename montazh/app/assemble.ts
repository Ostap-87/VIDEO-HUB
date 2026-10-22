// Склейка нескольких роликов и чистка речи (решение пользователя 22.10.2026: «добавлять несколько роликов и потом на
// основе их склеивать видео и применять лучшие кадры… очищать ролик от пауз и эканий и мэканий, мусорных слов и цыканий»).
// Вход — ролики проекта по порядку, их слова (Whisper) и громкость звука по 10 мс; выход — монтажный лист (куски встык)
// и список всего вырезанного с причинами. Всё считается в браузере мгновенно, предпросмотр играет лист сразу.
// Тот же лист движок склеивает в готовый ролик кадр в кадр (montazh/engine/edl.py).
import type {AssembleOpts, Clip, Seg, Word} from "./types";

export const TRASH: {id: string; words: string[]; where: "any" | "start" | "end" | "edge"; on: boolean}[] = [
  {id: "как бы", words: ["как", "бы"], where: "any", on: true},
  {id: "типа", words: ["типа"], where: "any", on: true},
  {id: "короче", words: ["короче"], where: "any", on: true},
  {id: "это самое", words: ["это", "самое"], where: "any", on: true},
  {id: "так сказать", words: ["так", "сказать"], where: "any", on: true},
  {id: "ну", words: ["ну"], where: "start", on: true},
  {id: "в общем", words: ["в", "общем"], where: "edge", on: true},
  {id: "вот", words: ["вот"], where: "end", on: false},
  {id: "значит", words: ["значит"], where: "start", on: false},
  {id: "собственно", words: ["собственно"], where: "edge", on: false},
];

export const DEFAULT_OPTS: AssembleOpts = {
  pauses: true,
  minPause: 0.35,
  fillers: true,
  noise: true,
  trash: TRASH.filter((t) => t.on).map((t) => t.id),
  restarts: true,
  takes: true,
  jumpZoom: true,
  keep: [],
  pick: {},
};

const STEP = 0.01; // кадр громкости — 10 мс
const KEEP = 0.12; // запас тишины у края речи (как у npm run cut)
const TIGHT = 0.04; // запас, когда вырезается слово посреди фразы
const FILLER = /^(э+|э+м+|м+|мм+|а-?а+|аа+|хм+|ээ+|ммм+|эм+|мэ+|ы+)$/;
// после этих слов «как бы» / «это самое» — не мусор («как бы вы поступили», «это самое главное»)
const KAK_BY_OK = new Set(["вы", "ты", "мы", "он", "она", "они", "я", "это", "не"]);
const SAMOE_OK = new Set(["главное", "важное", "лучшее", "интересное", "сложное", "простое", "первое", "последнее"]);
const TIPA_OK = new Set(["этого", "такого", "какого", "нового", "другого", "того", "одного", "разного"]);

export const norm = (t: string) => t.toLowerCase().replace(/ё/g, "е").replace(/[^а-яa-z0-9-]/g, "").replace(/^-+|-+$/g, "");
const endsPhrase = (t: string) => /[.!?…]$/.test(t.trim());

export type CutWhy = "pause" | "filler" | "noise" | "trash" | "restart" | "take" | "edge";
export type Cut = {id: string; clip: string; from: number; to: number; why: CutWhy; text: string; kept: boolean};
export type Phrase = {key: string; clip: string; i0: number; i1: number; from: number; to: number; text: string; toks: string[]};
export type TakeGroup = {key: string; text: string; items: (Phrase & {score: number})[]; pick: string};
export type Result = {edl: Seg[]; cuts: Cut[]; groups: TakeGroup[]; before: number; after: number; dropped: Record<string, number[]>};

// ---------------------------------------------------------------- громкость
// звук ролика (моно, 16 кГц) → громкость по 10 мс в дБ
export function envelope(pcm: Float32Array, rate = 16000): Float32Array {
  const hop = Math.round(rate * STEP);
  const n = Math.floor(pcm.length / hop);
  const out = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let j = k * hop; j < (k + 1) * hop; j++) s += pcm[j] * pcm[j];
    out[k] = 10 * Math.log10(s / hop + 1e-10);
  }
  return out;
}

function percentile(a: Float32Array, q: number) {
  const s = Float32Array.from(a).sort();
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)))] ?? -100;
}

// голос / не голос по кадрам: порог — по шуму в паузах и по громкой речи; щелчки короче 60 мс — не голос,
// смычки внутри слов короче 120 мс — голос (как speech_runs у npm run cut)
export function voicedFrames(env: Float32Array): Uint8Array {
  const thr = Math.max(percentile(env, 0.2) + 6, percentile(env, 0.9) - 32);
  const v = new Uint8Array(env.length);
  for (let k = 0; k < env.length; k++) v[k] = env[k] > thr ? 1 : 0;
  const runs = () => {
    const out: [number, number, number][] = [];
    let st = 0;
    for (let i = 1; i <= v.length; i++) if (i === v.length || v[i] !== v[st]) (out.push([v[st], st, i]), (st = i));
    return out;
  };
  for (const [val, a, b] of runs()) if (val && b - a < 6) v.fill(0, a, b);
  for (const [val, a, b] of runs()) if (!val && b - a < 12 && a > 0 && b < v.length) v.fill(1, a, b);
  return v;
}

// ---------------------------------------------------------------- фразы и дубли
function lcs(a: string[], b: string[]) {
  const dp = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

const pkey = (clip: string, t: number) => `${clip}@${Math.round(t * 100)}`;

// слова ролика → фразы: граница — пауза больше 0,6 с или точка
export function phrasesOf(clip: string, words: Word[]): Phrase[] {
  const out: Phrase[] = [];
  let i0 = 0;
  for (let i = 0; i < words.length; i++) {
    const last = i === words.length - 1 || words[i + 1].start - words[i].end > 0.6 || endsPhrase(words[i].text);
    if (!last) continue;
    const ws = words.slice(i0, i + 1);
    const toks = ws.map((w) => norm(w.text)).filter((t) => t && !FILLER.test(t));
    out.push({key: pkey(clip, ws[0].start), clip, i0, i1: i, from: ws[0].start, to: ws[ws.length - 1].end, text: ws.map((w) => w.text).join(" "), toks});
    i0 = i + 1;
  }
  return out;
}

function phraseScore(ph: Phrase, words: Word[], maxLen: number, order: number, n: number) {
  const ws = words.slice(ph.i0, ph.i1 + 1);
  const fillers = ws.filter((w) => FILLER.test(norm(w.text))).length;
  let gaps = 0;
  let reps = 0;
  for (let i = 1; i < ws.length; i++) {
    if (ws[i].start - ws[i - 1].end > 0.45) gaps++;
    if (norm(ws[i].text) && norm(ws[i].text) === norm(ws[i - 1].text)) reps++;
  }
  return 3 * (ph.toks.length / Math.max(1, maxLen)) - 0.5 * fillers - 0.3 * gaps - 0.5 * reps + 0.25 * (n > 1 ? order / (n - 1) : 0);
}

// повторы одной фразы (дубли): в разных роликах — любые, в одном ролике — не дальше 40 с друг от друга
export function takeGroups(clips: Clip[], pick: Record<string, string>): TakeGroup[] {
  const all: Phrase[] = clips.flatMap((c) => phrasesOf(c.id, c.words ?? []));
  const parent = all.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i],
        b = all[j];
      if (a.clip === b.clip && b.from - a.to > 40) continue;
      if (Math.min(a.toks.length, b.toks.length) < 3) continue;
      if (lcs(a.toks, b.toks) / Math.max(a.toks.length, b.toks.length) >= 0.6) parent[find(j)] = find(i);
    }
  const groups = new Map<number, Phrase[]>();
  all.forEach((ph, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), ph]));
  const out: TakeGroup[] = [];
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    const maxLen = Math.max(...items.map((x) => x.toks.length));
    const scored = items.map((ph, k) => ({...ph, score: phraseScore(ph, clips.find((c) => c.id === ph.clip)?.words ?? [], maxLen, k, items.length)}));
    const best = scored.reduce((a, b) => (b.score >= a.score ? b : a));
    const key = items[0].key;
    const chosen = pick[key];
    out.push({key, text: best.text, items: scored, pick: chosen && (chosen === "*" || scored.some((x) => x.key === chosen)) ? chosen : best.key});
  }
  return out;
}

// ---------------------------------------------------------------- что вырезать в словах
type Drop = {i0: number; i1: number; why: CutWhy; text: string};

function wordDrops(words: Word[], o: AssembleOpts): Drop[] {
  const toks = words.map((w) => norm(w.text));
  const drops: Drop[] = [];
  const isStart = (i: number) => i === 0 || words[i].start - words[i - 1].end > 0.45 || endsPhrase(words[i - 1].text);
  const isEnd = (i: number) => i === words.length - 1 || words[i + 1].start - words[i].end > 0.45 || endsPhrase(words[i].text);
  for (let i = 0; i < words.length; i++) {
    const t = toks[i];
    if (!t) continue;
    if (o.fillers && FILLER.test(t)) {
      drops.push({i0: i, i1: i, why: "filler", text: words[i].text});
      continue;
    }
    for (const tr of TRASH) {
      if (!o.trash.includes(tr.id)) continue;
      const n = tr.words.length;
      if (tr.words.some((w, k) => toks[i + k] !== w)) continue;
      const next = toks[i + n] ?? "";
      const prev = toks[i - 1] ?? "";
      if (tr.id === "как бы" && KAK_BY_OK.has(next)) continue;
      if (tr.id === "это самое" && SAMOE_OK.has(next)) continue;
      if (tr.id === "типа" && TIPA_OK.has(prev)) continue;
      const okWhere =
        tr.where === "any" ||
        (tr.where === "start" && isStart(i)) ||
        (tr.where === "end" && isEnd(i + n - 1)) ||
        (tr.where === "edge" && (isStart(i) || isEnd(i + n - 1)));
      if (!okWhere) continue;
      drops.push({i0: i, i1: i + n - 1, why: "trash", text: words.slice(i, i + n).map((w) => w.text).join(" ")});
      i += n - 1;
      break;
    }
  }
  if (o.restarts) {
    // «я, я буду» / «у нас, у нас» — первое повторение лишнее
    for (let i = 0; i + 1 < words.length; i++) {
      for (const n of [3, 2, 1]) {
        if (i + 2 * n > words.length) continue;
        const a = toks.slice(i, i + n),
          b = toks.slice(i + n, i + 2 * n);
        if (a.every((x, k) => x && x === b[k]) && words[i + n].start - words[i + n - 1].end < 1.2) {
          drops.push({i0: i, i1: i + n - 1, why: "restart", text: words.slice(i, i + n).map((w) => w.text).join(" ")});
          i += n - 1;
          break;
        }
      }
    }
  }
  return drops;
}

// оборванное начало фразы: следующая фраза начинается так же, но длиннее — первая лишняя
function falseStarts(phrases: Phrase[]): Phrase[] {
  const out: Phrase[] = [];
  for (let k = 0; k + 1 < phrases.length; k++) {
    const a = phrases[k],
      b = phrases[k + 1];
    if (a.toks.length < 1 || a.toks.length >= b.toks.length || b.from - a.to > 3) continue;
    const head = b.toks.slice(0, a.toks.length + 1);
    if (lcs(a.toks, head) >= Math.max(1, Math.ceil(0.75 * a.toks.length)) && (a.toks.length >= 2 || a.toks[0] === b.toks[0])) out.push(a);
  }
  return out;
}

// ---------------------------------------------------------------- склейка
export function assemble(clips: Clip[], env: Record<string, Float32Array | undefined>, o: AssembleOpts): Result {
  const use = clips.filter((c) => c.kind === "video" && !c.off);
  const keep = new Set(o.keep);
  const groups = o.takes ? takeGroups(use, o.pick) : [];
  const dropTake = new Set<string>();
  for (const g of groups) if (g.pick !== "*") for (const it of g.items) if (it.key !== g.pick) dropTake.add(it.key);
  const edl: Seg[] = [];
  const cuts: Cut[] = [];
  const droppedWords: Record<string, number[]> = {};
  let before = 0;
  for (const c of use) {
    before += c.duration;
    const words = c.words ?? [];
    const n = Math.max(1, Math.ceil(c.duration / STEP));
    const e = env[c.id];
    const voiced = e ? voicedFrames(e) : null;
    // 0 — тишина, 1 — оставить, 2 — вырезать
    const lab = new Uint8Array(n);
    const fr = (t: number) => Math.max(0, Math.min(n, Math.round(t / STEP)));
    const mark = (a: number, b: number, v: number) => lab.fill(v, fr(a), Math.max(fr(a), fr(b)));
    if (!words.length) {
      edl.push({clip: c.id, from: 0, to: c.duration});
      continue;
    }
    // какие слова вырезаем
    const dropped = new Array<Drop | null>(words.length).fill(null);
    for (const d of wordDrops(words, o)) for (let i = d.i0; i <= d.i1; i++) dropped[i] ??= d;
    const phrases = phrasesOf(c.id, words);
    const fs = o.restarts ? falseStarts(phrases) : [];
    for (const ph of [...fs.map((p) => ({p, why: "restart" as CutWhy})), ...phrases.filter((p) => dropTake.has(p.key)).map((p) => ({p, why: "take" as CutWhy}))])
      for (let i = ph.p.i0; i <= ph.p.i1; i++) dropped[i] = {i0: ph.p.i0, i1: ph.p.i1, why: ph.why, text: ph.p.text};
    const dropId = (d: Drop) => `${d.why}:${c.id}:${d.i0}`;
    const seen = new Set<string>();
    for (const d of dropped) {
      if (!d || seen.has(dropId(d))) continue;
      seen.add(dropId(d));
      const kept = keep.has(dropId(d)) && d.why !== "take";
      cuts.push({id: dropId(d), clip: c.id, from: words[d.i0].start, to: words[d.i1].end, why: d.why, text: d.text, kept});
      if (kept) for (let i = d.i0; i <= d.i1; i++) dropped[i] = null;
    }
    droppedWords[c.id] = dropped.flatMap((d, i) => (d ? [i] : []));
    // где звучит речь: по громкости чистого звука (Whisper растягивает слова на паузы — по словам паузы не видны),
    // без громкости — по словам
    if (voiced) {
      for (let k = 0; k < n && k < voiced.length; k++) lab[k] = voiced[k];
      // кусок звука между паузами короче 1,2 с, на который не приходится ни одно слово, — «э», «мм», цыканье, вдох
      // (слово «приходится», если закрывает больше 30 % куска: Whisper растягивает слова, начало слова — не признак)
      let st = -1;
      for (let k = 0; k <= n; k++) {
        const v = k < n && lab[k] === 1;
        if (v && st < 0) st = k;
        if (!v && st >= 0) {
          const c0 = st * STEP,
            c1 = k * STEP;
          const covered = Math.max(0, ...words.map((w) => Math.min(c1, w.end) - Math.max(c0, w.start)));
          if (c1 - c0 < 1.2 && o.noise && covered < 0.3 * (c1 - c0)) {
            const id = `noise:${c.id}:${st}`;
            const kept = keep.has(id);
            cuts.push({id, clip: c.id, from: c0, to: c1, why: "noise", text: "звук без слов", kept});
            if (!kept) lab.fill(2, st, k);
          }
          st = -1;
        }
      }
    } else words.forEach((w, i) => !dropped[i] && mark(w.start, w.end, 1));
    // вырезанные слова: от конца предыдущего оставленного слова до начала следующего, края — в самое тихое место рядом
    const quiet = (t: number) => {
      if (!e) return fr(t);
      let best = fr(t);
      for (let k = Math.max(0, fr(t - 0.1)); k <= Math.min(e.length - 1, fr(t + 0.1)); k++) if (e[k] < e[best]) best = k;
      return best;
    };
    for (let i = 0; i < words.length; i++) {
      if (!dropped[i]) continue;
      let j = i;
      while (j + 1 < words.length && dropped[j + 1]) j++;
      const prevEnd = i > 0 ? words[i - 1].end : 0;
      const nextStart = j + 1 < words.length ? words[j + 1].start : c.duration;
      const a0 = quiet(Math.max(words[i].start, prevEnd));
      const b0 = quiet(Math.min(words[j].end, nextStart));
      if (b0 > a0) lab.fill(2, a0, b0);
      i = j;
    }
    // промежутки между оставленным: короткие паузы — оставить, длинные и с вырезанным словом — вырезать с запасом
    const runs: [number, number][] = [];
    let a = -1;
    for (let k = 0; k <= n; k++) {
      const on = k < n && lab[k] === 1;
      if (on && a < 0) a = k;
      if (!on && a >= 0) (runs.push([a, k]), (a = -1));
    }
    if (!runs.length) continue;
    const segs: [number, number][] = [];
    let cur: [number, number] = [Math.max(0, runs[0][0] - fr(KEEP)), runs[0][1]];
    if (runs[0][0] > fr(KEEP) + 10) cuts.push({id: `edge:${c.id}:0`, clip: c.id, from: 0, to: (runs[0][0] - fr(KEEP)) * STEP, why: "edge", text: "начало до речи", kept: false});
    for (let r = 1; r < runs.length; r++) {
      const g0 = runs[r - 1][1],
        g1 = runs[r][0];
      const len = (g1 - g0) * STEP;
      let hasDrop = false;
      for (let k = g0; k < g1; k++) if (lab[k] === 2) (hasDrop = true);
      const id = `pause:${c.id}:${g0}`;
      if (!hasDrop && (!o.pauses || len < o.minPause || keep.has(id))) {
        if (o.pauses && len >= o.minPause) cuts.push({id, clip: c.id, from: g0 * STEP, to: g1 * STEP, why: "pause", text: `пауза ${len.toFixed(1)} с`, kept: true});
        cur[1] = runs[r][1];
        continue;
      }
      // вырезаем: запас у края речи, но не заходя на вырезанное
      const m = hasDrop && len < o.minPause + 0.25 ? fr(TIGHT) : fr(KEEP);
      let l = g0;
      while (l < g1 && l < g0 + m && lab[l] !== 2) l++;
      let rr = g1;
      while (rr > l && rr > g1 - m && lab[rr - 1] !== 2) rr--;
      if (!hasDrop && (rr - l) * STEP < 0.08) {
        cur[1] = runs[r][1];
        continue;
      }
      if (!hasDrop) cuts.push({id, clip: c.id, from: g0 * STEP, to: g1 * STEP, why: "pause", text: `пауза ${len.toFixed(1)} с`, kept: false});
      cur[1] = l;
      segs.push(cur);
      cur = [rr, runs[r][1]];
    }
    cur[1] = Math.min(n, cur[1] + fr(KEEP) + 6); // в конце ролика — чуть больше воздуха
    segs.push(cur);
    for (const [s0, s1] of segs) if (s1 - s0 >= 8) edl.push({clip: c.id, from: +(s0 * STEP).toFixed(3), to: +(Math.min(c.duration, s1 * STEP)).toFixed(3)});
  }
  const placed = placeTakes(edl, groups, use.map((c) => c.id));
  const after = placed.reduce((x, s) => x + s.to - s.from, 0);
  return {edl: placed, cuts, groups, before, after, dropped: droppedWords};
}

// выбранный дубль встаёт на место первого: фразу пересняли во втором ролике — в готовом ролике она звучит там,
// где была сказана в первый раз (как сделал бы монтажёр), а не в конце склейки. Каждый кусок получает место
// «по сюжету» (номер ролика, секунда); кусок выбранного дубля — место первого дубля; куски сортируются по месту.
function placeTakes(edl0: Seg[], groups: TakeGroup[], order: string[]): Seg[] {
  type P = Seg & {kc: number; kt: number};
  let pieces: P[] = edl0.map((s) => ({...s, kc: order.indexOf(s.clip), kt: s.from}));
  for (const g of groups) {
    if (g.pick === "*") continue;
    const first = g.items[0];
    const pick = g.items.find((x) => x.key === g.pick);
    if (!pick || pick.key === first.key) continue;
    const a = pick.from - 0.15,
      b = pick.to + 0.2;
    const next: P[] = [];
    for (const s of pieces) {
      if (s.clip !== pick.clip || s.to <= a || s.from >= b) {
        next.push(s);
        continue;
      }
      if (s.from < a) next.push({...s, to: a});
      const f = Math.max(s.from, a);
      next.push({...s, from: f, to: Math.min(s.to, b), kc: order.indexOf(first.clip), kt: first.from + (f - a) * 1e-4});
      if (s.to > b) next.push({...s, from: b});
    }
    pieces = next;
  }
  return pieces
    .filter((s) => s.to - s.from >= 0.08)
    .sort((x, y) => x.kc - y.kc || x.kt - y.kt)
    .map(({clip, from, to}) => ({clip, from: +from.toFixed(3), to: +to.toFixed(3)}));
}

// ---------------------------------------------------------------- шкала ролика
export const edlSeconds = (edl: Seg[]) => edl.reduce((x, s) => x + Math.max(0, s.to - s.from), 0);

// слова роликов → слова готового ролика (секунды склейки); c/ci — откуда слово. Слово идёт в тот кусок, где его
// больше всего (Whisper растягивает слова на паузы и неточно ставит короткие слова — середина слова может оказаться
// в вырезанной паузе); слово, которого в склейке почти нет, ставится к ближайшему месту своего ролика.
// Вырезанные чисткой слова (clip.cut) в субтитры не идут.
export function edlWords(edl: Seg[], clips: Clip[]): Word[] {
  const at: number[] = [];
  edl.reduce((x, s) => (at.push(x), x + s.to - s.from), 0);
  const out: Word[] = [];
  for (const c of clips) {
    const cut = new Set(c.cut ?? []);
    const mine = edl.map((s, k) => k).filter((k) => edl[k].clip === c.id);
    if (!mine.length) continue;
    (c.words ?? []).forEach((w, i) => {
      if (cut.has(i)) return;
      let best = -1;
      let ov = 0.06;
      for (const k of mine) {
        const o = Math.min(edl[k].to, w.end) - Math.max(edl[k].from, w.start);
        if (o >= ov) (ov = o), (best = k);
      }
      if (best >= 0) {
        const s = edl[best];
        out.push({text: w.text, start: at[best] + Math.max(s.from, w.start) - s.from, end: at[best] + Math.min(s.to, w.end) - s.from, c: c.id, ci: i});
        return;
      }
      // ближайший кусок; слово — в его край
      let k0 = mine[0];
      let dist = Infinity;
      for (const k of mine) {
        const d = Math.max(edl[k].from - w.end, w.start - edl[k].to, 0);
        if (d < dist) (dist = d), (k0 = k);
      }
      if (dist > 1.5) return; // слово из вырезанного куска (дубль, оборванная фраза)
      const s = edl[k0];
      const t = at[k0] + Math.min(s.to, Math.max(s.from, w.start)) - s.from;
      out.push({text: w.text, start: t, end: t + Math.min(0.25, Math.max(0.08, w.end - w.start)), c: c.id, ci: i});
    });
  }
  out.sort((a, b) => a.start - b.start);
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1],
      b = out[i];
    if (b.start < a.end) {
      a.end = Math.max(a.start + 0.04, b.start);
      if (b.start < a.end) b.start = a.end;
      b.end = Math.max(b.end, b.start + 0.04);
    }
  }
  return out.map((w) => ({...w, start: +w.start.toFixed(3), end: +w.end.toFixed(3)}));
}

// секунда готового ролика → ролик и секунда в нём
export function edlLocate(edl: Seg[], t: number): {clip: string; t: number; i: number} | null {
  let at = 0;
  for (let i = 0; i < edl.length; i++) {
    const len = edl[i].to - edl[i].from;
    if (t < at + len || i === edl.length - 1) return {clip: edl[i].clip, t: edl[i].from + Math.min(len, Math.max(0, t - at)), i};
    at += len;
  }
  return null;
}

// секунда ролика clip → секунда готового ролика (null — этот кусок вырезан)
export function edlFind(edl: Seg[], clip: string, t: number): number | null {
  let at = 0;
  for (const s of edl) {
    if (s.clip === clip && t >= s.from - 0.001 && t <= s.to + 0.001) return at + Math.min(s.to, Math.max(s.from, t)) - s.from;
    at += s.to - s.from;
  }
  return null;
}

// склейки, где картинка «прыгает» (другой ролик или вырезан кусок) — на них шаблон меняет зум (джамп-каты)
export function edlCuts(edl: Seg[]): number[] {
  const out: number[] = [];
  let at = 0;
  edl.forEach((s, i) => {
    if (i > 0 && (s.clip !== edl[i - 1].clip || Math.abs(s.from - edl[i - 1].to) > 0.05)) out.push(+at.toFixed(3));
    at += s.to - s.from;
  });
  return out;
}

// эффекты и заметки остаются на своих словах, когда монтажный лист меняется: секунда старого листа → новый
export function remapTime(oldEdl: Seg[], newEdl: Seg[], t: number): number {
  const loc = edlLocate(oldEdl, t);
  if (!loc) return t;
  const exact = edlFind(newEdl, loc.clip, loc.t);
  if (exact !== null) return +exact.toFixed(3);
  // кусок вырезан — ближайшее оставленное место того же ролика дальше по времени
  let at = 0;
  let best: number | null = null;
  for (const s of newEdl) {
    if (s.clip === loc.clip && s.from >= loc.t && best === null) best = at;
    at += s.to - s.from;
  }
  return +(best ?? Math.min(t, at)).toFixed(3);
}
