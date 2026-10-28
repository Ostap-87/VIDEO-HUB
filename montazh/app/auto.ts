// «Ритм» и «Автомонтаж» (решения пользователя 23.10.2026):
// - «кнопка, которая будет применять правило, что эффект и/или функция накладываются каждые 4 секунды» — rhythm();
// - «загружаю ролик и ты сам автоматически улучшаешь его — голос, звук, накладываешь спецэффекты по смыслу… отдельная
//   кнопка, чтобы быстро собирал» — autoEffects() (эффекты по словам речи) + шаги в App.tsx (речь, чистка, голос, картинки).
// Всё — приёмы библиотеки effects.ts: в окне сразу видно, руками любое можно поправить или убрать.
import {findEmoji, type Emoji} from "./emoji";
import {newId, type Brand, type EffectItem, type Word} from "./types";

// эффекты-«слои»: два одновременно не ставим (накладываются друг на друга); зумы с ними сочетаются
const OVERLAY = /^(hook|number|chip|checklist|list|stock|arrow|broll|speaker|panel|text3d|emoji|fx-bw|title|stamp|dots|ask|search|vote|drum|ring|outro|card|chat|floats|inscreen|split|mark|counter|widgets|docu|orbit|chart|neon|timeline|prompt)/;
const isZoom = (id: string) => id.startsWith("zoom");
const endOf = (e: EffectItem, len = 2) => e.until ?? e.at + len;

const clean = (t: string) => t.toLowerCase().replace(/ё/g, "е").replace(/[^а-яa-z0-9%+-]/g, "");

// ближайшее начало слова к секунде t (в пределах ±win), иначе сама t
export function snapToWord(words: Word[], t: number, win = 0.7): number {
  let best = t;
  let d = win;
  for (const w of words) {
    const x = Math.abs(w.start - t);
    if (x < d) (d = x), (best = w.start);
  }
  return +best.toFixed(2);
}

const freeAt = (effects: EffectItem[], a: number, b: number, zoom: boolean) =>
  !effects.some((e) => {
    const hit = a < endOf(e) + 0.3 && b > e.at - 0.3;
    if (!hit) return false;
    return zoom ? isZoom(e.effect) : OVERLAY.test(e.effect);
  });

// ---------------------------------------------------------------- ритм
export type RhythmKind = "zoom-punch" | "zoom-push" | "zoom-pull" | "emoji" | "broll" | string;
export const RHYTHM_SETS: {id: string; title: string; kinds: RhythmKind[]}[] = [
  {id: "mix", title: "Смесь: наезды, отдаления, эмодзи по смыслу", kinds: ["zoom-punch", "zoom-push", "emoji", "zoom-pull"]},
  {id: "zooms", title: "Только наезды и отдаления", kinds: ["zoom-punch", "zoom-push", "zoom-pull"]},
  {id: "punch", title: "Резкие наезды", kinds: ["zoom-punch"]},
  {id: "emoji", title: "Эмодзи по смыслу", kinds: ["emoji"]},
  {id: "broll", title: "Картинки по смыслу", kinds: ["broll"]},
];

// что ставить в слот: свой эффект из библиотеки или набор по кругу; «emoji» — эмодзи по словам рядом (нет подходящего —
// наезд), «broll» — место под картинку по смыслу (картинку подбирает App.tsx через поиск по каталогу)
export type RhythmOpts = {every: number; kinds: RhythmKind[]; from: number; to: number; skipBusy: boolean};
export type Slot = {at: number; kind: RhythmKind; emoji?: Emoji};

export function rhythmSlots(words: Word[], effects: EffectItem[], o: RhythmOpts): Slot[] {
  const out: Slot[] = [];
  const placed: EffectItem[] = [...effects];
  let k = 0;
  for (let t = Math.max(0.4, o.from); t < o.to - 0.8; t += o.every) {
    const at = snapToWord(words, t, Math.min(0.9, o.every / 3));
    // в этом окне уже что-то происходит — ритм не нарушен, слот пропускаем
    if (o.skipBusy && placed.some((e) => e.at > at - o.every / 2 && e.at < at + o.every / 2)) continue;
    let kind = o.kinds[k++ % o.kinds.length];
    let emoji: Emoji | undefined;
    if (kind === "emoji") {
      emoji = emojiNear(words, at, o.every / 2);
      if (!emoji) kind = "zoom-punch";
    }
    const zoom = isZoom(kind);
    if (!freeAt(placed, at, at + 1.6, zoom)) {
      if (zoom) continue;
      kind = "zoom-push"; // слой уже занят — хотя бы движение кадра
      if (!freeAt(placed, at, at + 1.6, true)) continue;
    }
    out.push({at, kind, emoji});
    placed.push({id: "", effect: kind === "emoji" ? "emoji-pop" : kind === "broll" ? "broll-zoom" : kind, at, until: at + 1.8, params: {}});
  }
  return out;
}

export function slotToEffect(s: Slot, tag: string): EffectItem | null {
  const base = {id: newId("e"), at: s.at, params: {[tag]: "1"} as Record<string, string>};
  if (s.kind === "emoji" && s.emoji) return {...base, effect: "emoji-pop", until: +(s.at + 1.8).toFixed(2), params: {...base.params, emoji: s.emoji.file, spot: "tr"}};
  if (s.kind === "zoom-punch") return {...base, effect: "zoom-punch", until: +(s.at + 0.9).toFixed(2), params: {...base.params, amount: "0.14"}};
  if (s.kind === "zoom-push") return {...base, effect: "zoom-push", until: +(s.at + 2).toFixed(2)};
  if (s.kind === "zoom-pull") return {...base, effect: "zoom-pull", until: +(s.at + 1.6).toFixed(2), params: {...base.params, amount: "0.16"}};
  if (s.kind === "broll") return null; // картинку подставляет App.tsx
  return {...base, effect: s.kind, until: +(s.at + 2).toFixed(2)};
}

// ---------------------------------------------------------------- эмодзи по смыслу
// слова, которые в обычной речи встречаются часто и смайл к ним не нужен
const EMOJI_SKIP = new Set(["точно", "думаю", "думать", "вопрос", "туда", "выше", "наверх", "вверх", "палец", "стиль", "сто", "очки", "мозг", "класс"]);
export function emojiNear(words: Word[], at: number, win: number): Emoji | undefined {
  for (const w of words) {
    if (w.start < at - win || w.start > at + win) continue;
    const t = clean(w.text);
    if (!t || EMOJI_SKIP.has(t)) continue;
    const e = findEmoji(t);
    if (e) return e;
  }
  return undefined;
}

// ---------------------------------------------------------------- эффекты по смыслу
const NUM_WORDS: Record<string, string> = {
  два: "2", две: "2", три: "3", четыре: "4", пять: "5", шесть: "6", семь: "7", восемь: "8", девять: "9", десять: "10",
  двадцать: "20", тридцать: "30", сорок: "40", пятьдесят: "50", сто: "100", двести: "200", триста: "300", пятьсот: "500",
  тысяча: "1000", тысячи: "1000", тысяч: "1000", миллион: "1 млн", миллиона: "1 млн", миллионов: "1 млн", миллиард: "1 млрд",
};
// «из десяти», «из пяти» — родительный падеж
const OF_WORDS: Record<string, string> = {двух: "2", трех: "3", четырех: "4", пяти: "5", шести: "6", семи: "7", восьми: "8", девяти: "9", десяти: "10", двадцати: "20", ста: "100"};
const UNIT = /^(дн|лет|год|час|минут|секунд|компани|завод|город|стран|человек|раз|процент|%|тысяч|миллион|миллиард|доллар|рубл|юан|километр|метр|шаг|экспедиц|туров|программ|отрасл|партнер|клиент)/;
const STRONG = /^(никогда|всегда|главное|важно|самый|самая|самое|самые|лучший|лучшие|невероятн|огромн|впервые|секрет|никто|все|бесплатно|реально|честно)$/;
const LIST_START = /^(во-первых|первое|первый|первая|1\.)$/;

// ---------------------------------------------------------------- ручки «Смелость» и «Темп» (5 положений)
// по образцу prompt-motion.com/customize (там Creativity / Pace / Polish): смелость — сколько ярких приёмов, темп — как
// часто что-то происходит и насколько плотно режутся паузы. Потолки против «монтажа нейросетью»: не больше N резких
// наездов в минуту, эмодзи не чаще раза в M секунд (из правил открытого набора yh-chatcut-skills, MIT)
export const DIAL_LABELS = {
  bold: ["спокойно", "сдержанно", "обычно", "ярко", "на максимум"],
  pace: ["медленно", "спокойно", "обычно", "быстро", "очень быстро"],
};
const lvl = (v: number | undefined) => Math.min(5, Math.max(1, Math.round(v ?? 3))) - 1;
export const paceEvery = (pace?: number) => [6, 5, 4, 3, 2.5][lvl(pace)]; // ритм, с
export const pacePause = (pace?: number) => [0.6, 0.45, 0.35, 0.28, 0.22][lvl(pace)]; // какие паузы вырезать, с
export const brollGap = (pace?: number) => [13, 11, 9, 7, 6][lvl(pace)]; // картинки по смыслу — раз в столько секунд
const PUNCH_PER_MIN = [2, 3, 4, 6, 8];
const EMOJI_GAP = [14, 10, 7, 5, 4];

export type AutoOpts = {brand: Brand; duration: number; finale: boolean; format: string; bold?: number; pace?: number};
export type AutoPlan = {effects: EffectItem[]; report: string[]; brollSlots: {at: number; until: number; text: string}[]};

export function autoEffects(words: Word[], existing: EffectItem[], o: AutoOpts): AutoPlan {
  const tag = "auto";
  const out: EffectItem[] = [];
  const all = () => [...existing, ...out];
  const end = o.finale ? o.duration - 3.4 : o.duration - 0.6;
  const report: string[] = [];
  const bold = lvl(o.bold);
  const punchGap = (60 / PUNCH_PER_MIN[bold]) * 0.6;
  const punches: number[] = existing.filter((e) => e.effect === "zoom-punch").map((e) => e.at);
  const add = (e: Omit<EffectItem, "id">) => {
    if (e.at < 0 || (e.until ?? e.at) > end + 0.5) return false;
    if (e.effect === "zoom-punch" && punches.some((x) => Math.abs(x - e.at) < punchGap)) return false;
    if (!freeAt(all(), e.at, e.until ?? e.at + 2, isZoom(e.effect))) return false;
    out.push({...e, id: newId("e"), params: {...e.params, [tag]: "1"}});
    if (e.effect === "zoom-punch") punches.push(e.at);
    return true;
  };
  const toks = words.map((w) => clean(w.text));
  const text = (i: number, n: number) => words.slice(i, i + n).map((w) => w.text.replace(/[.,!?;:«»"]/g, "")).join(" ");

  // 1. хук: главное слово первой фразы — огромным заголовком за головой (od) или словами вокруг головы
  const firstEnd = words.findIndex((w, i) => i > 0 && (w.start - words[i - 1].end > 0.5 || /[.!?]$/.test(words[i - 1].text)));
  const first = words.slice(0, firstEnd > 0 ? Math.min(firstEnd, 6) : Math.min(words.length, 5));
  if (first.length >= 2) {
    const at = Math.max(0.15, first[0].start);
    const until = Math.min(at + 2.6, end);
    if (o.brand === "od") {
      const key = [...first].sort((a, b) => clean(b.text).length - clean(a.text).length)[0];
      if (add({effect: "hook-behind", at, until: Math.min(at + 1.8, end), params: {text: key.text.replace(/[.,!?;:«»"]/g, "").toUpperCase()}})) report.push(`хук за головой «${key.text}»`);
    } else if (add({effect: "hook-words", at, until, params: {text: first.slice(0, 4).map((w) => w.text.replace(/[.,!?;:«»"]/g, "")).join(" / ")}}))
      report.push(`хук «${first.slice(0, 4).map((w) => w.text).join(" ")}»`);
  }

  // 2. цифры: первая — крупно со свечением, остальные — резкий наезд (цифра и так синим в субтитрах)
  let bigDone = false;
  let lastNum = -99;
  toks.forEach((t, i) => {
    const digits = /\d/.test(t) ? t.replace(/[^\d%+]/g, "") : NUM_WORDS[t];
    if (!digits) return;
    const next = toks[i + 1] ?? "";
    const isFact = /\d/.test(t) || UNIT.test(next);
    if (!isFact || words[i].start - lastNum < 5) return;
    const at = words[i].start;
    if (!bigDone && add({effect: "number", at, until: at + 2.6, params: {text: digits + (next.startsWith("%") ? "%" : ""), sub: text(i + 1, 2)}})) {
      bigDone = true;
      lastNum = at;
      report.push(`крупная цифра «${digits} ${text(i + 1, 2)}»`);
    } else if (add({effect: "zoom-punch", at, until: at + 0.9, params: {amount: "0.16"}})) lastNum = at;
  });

  // 3. перечисление «во-первых… во-вторых…» — стикеры по бокам от головы
  toks.forEach((t, i) => {
    if (!LIST_START.test(t)) return;
    const marks = [i];
    for (let j = i + 1; j < Math.min(toks.length, i + 60); j++) if (/^(во-вторых|второе|второй|вторая|в-третьих|третье|третий|третья)$/.test(toks[j])) marks.push(j);
    if (marks.length < 2) return;
    const items = marks.map((m) => text(m + 1, 2));
    const at = words[i].start;
    const until = Math.min(words[marks[marks.length - 1]].end + 2.5, end);
    if (add({effect: "list-stickers", at, until, params: {items: items.join(" / ")}})) report.push(`перечисление: ${items.join(", ")}`);
  });

  // 4. «никаких …» — плашка с зачёркиванием
  toks.forEach((t, i) => {
    if (!/^(никаких|без)$/.test(t) || !toks[i + 1]) return;
    const at = words[i].start;
    if (add({effect: "chip-strike", at, until: at + 2.6, params: {text: text(i, 2)}})) report.push(`зачёркивание «${text(i, 2)}»`);
  });

  // 5. приёмы по смыслу (каталоги prompt-motion.com и skillry.dev): «7 из 10» — точки, вопрос зрителю — пузырь, «миф» /
  // «это факт» — штамп, поворот мысли («но», «однако») — плавный наезд, вывод («итак», «поэтому») — резкий наезд,
  // «подписывайтесь» в конце — финал с @ником; на «ярко» и выше — главное слово с эхом
  // «напишите в комментариях слово «тур»» в конце (референс 28.10.2026) — финал с сеткой кадров и этим словом
  toks.forEach((t, i) => {
    if (!/^(напиши|напишите|пишите|пиши)$/.test(t) || words[i].start < o.duration - 25) return;
    const win = toks.slice(i + 1, i + 8);
    const ci = win.findIndex((x) => /^коммент/.test(x));
    if (ci < 0) return;
    const si = win.indexOf("слово");
    const kw = si >= 0 && win[si + 1] && !/^(в|и|а)$/.test(win[si + 1]) ? words[i + 2 + si] : ci === 2 && win[0] === "в" ? words[i + 1 + ci + 1] : ci === 1 ? undefined : words[i + 1];
    const word = kw?.text.replace(/[.,!?;:«»"“”]/g, "");
    if (!word || /^(в|комментари)/i.test(word)) return;
    const at = words[i].start;
    if (add({effect: "outro-grid", at, until: Math.min(Math.max(at + 3.4, words[Math.min(words.length - 1, i + 8)].end + 1), end + 0.4), params: {title: `Напиши «${word.toLowerCase()}»`}})) report.push(`финал с сеткой кадров: «Напиши «${word.toLowerCase()}»»`);
  });
  const isNum = (t: string) => /^\d+$/.test(t) || !!NUM_WORDS[t] || !!OF_WORDS[t];
  const numOf = (t: string) => (/^\d+$/.test(t) ? t : NUM_WORDS[t] ?? OF_WORDS[t]);
  const startsPhrase = (i: number) => i === 0 || words[i].start - words[i - 1].end > 0.3 || /[.,!?;:…]$/.test(words[i - 1].text);
  let lastDots = -99;
  let asks = 0;
  let stamps = 0;
  let lastTurn = -99;
  let echoDone = bold < 3;
  toks.forEach((t, i) => {
    const at = words[i].start;
    if (isNum(t) && toks[i + 1] === "из" && isNum(toks[i + 2] ?? "") && at - lastDots > 8) {
      const value = numOf(t);
      const total = numOf(toks[i + 2]);
      if (+value <= +total && +total <= 100 && add({effect: "dots", at, until: at + 2.6, params: {value, total, label: text(i + 3, 3)}})) {
        lastDots = at;
        report.push(`точки «${value} из ${total}»`);
      }
    }
    if (bold >= 1 && stamps < 2) {
      const stamp = t === "миф" ? "МИФ" : (t === "факт" || t === "правда") && toks[i - 1] === "это" ? (t === "факт" ? "ФАКТ" : "ПРАВДА") : "";
      if (stamp && add({effect: "stamp", at, until: at + 1.8, params: {text: stamp, color: stamp === "МИФ" ? "#E5322D" : "#1FA35B"}})) {
        stamps++;
        report.push(`штамп «${stamp}»`);
      }
    }
    if (o.pace !== 1 && startsPhrase(i) && /^(но|однако|зато|хотя)$/.test(t) && at - lastTurn > paceEvery(o.pace) * 1.5) {
      if (add({effect: "zoom-push", at, until: at + 2, params: {amount: "0.06"}})) lastTurn = at;
    }
    if (startsPhrase(i) && /^(итак|поэтому|итог|вывод|короче)$/.test(t)) add({effect: "zoom-punch", at, until: at + 0.9, params: {amount: "0.14"}});
    if (!echoDone && /^(секрет|впервые|никогда|никто)$/.test(t)) {
      if (add({effect: "title-echo", at, until: at + 1.8, params: {text: words[i].text.replace(/[.,!?;:«»"]/g, "").toUpperCase()}})) {
        echoDone = true;
        report.push(`слово с эхом «${words[i].text}»`);
      }
    }
    if (/^подпис/.test(t) && at > o.duration - 15) {
      if (add({effect: "outro-handle", at, until: Math.min(at + 2.6, end), params: {}})) report.push("финал с @ником на «подписывайтесь»");
    }
  });
  // вопрос зрителю: фраза с «вы / вам / ваш», которая кончается «?»
  if (bold >= 1) {
    let st = 0;
    words.forEach((w, i) => {
      if (!/[.!?…]$/.test(w.text)) return;
      const ph = words.slice(st, i + 1);
      st = i + 1;
      if (!/\?$/.test(w.text)) return;
      if (asks >= 2 || ph.length < 2 || ph.length > 9 || !ph.some((x) => /^(вы|вам|вас|ваш|ваша|ваше|ваши|вашей)$/.test(clean(x.text)))) return;
      const at = ph[0].start;
      const q = ph.map((x) => x.text).join(" ");
      if (add({effect: "ask", at, until: Math.max(at + 2.4, w.end + 0.8), params: {text: q}})) {
        asks++;
        report.push(`вопрос зрителю «${q}»`);
      }
    });
  }

  // 6. ударные слова — резкий наезд; эмодзи по смыслу — не чаще раза в 7 с
  let lastEmoji = -99;
  toks.forEach((t, i) => {
    const at = words[i].start;
    if (STRONG.test(t)) add({effect: "zoom-punch", at, until: at + 0.9, params: {amount: "0.14"}});
    if (at - lastEmoji < EMOJI_GAP[bold] || EMOJI_SKIP.has(t)) return;
    const e = t ? findEmoji(t) : undefined;
    if (e && add({effect: "emoji-pop", at, until: at + 1.8, params: {emoji: e.file, spot: "tr"}})) {
      lastEmoji = at;
      report.push(`эмодзи ${e.char} на «${words[i].text}»`);
    }
  });

  // 7. «ссылка выше» в Stories — стрелка под стикер-ссылку
  toks.forEach((t, i) => {
    if (/^ссылк/.test(t) && /^(выше|наверху|сверху|закрепл)/.test(toks[i + 1] ?? toks[i + 2] ?? "")) {
      const at = words[i].start;
      if (add({effect: "arrow", at, until: at + 3, params: {}})) report.push("стрелка «Ссылка выше»");
    }
  });

  // 8. места под картинки по смыслу: фразы 2,5–4 с примерно раз в 9 с (картинку подберёт поиск по каталогу; темп меняет шаг)
  const brollSlots: AutoPlan["brollSlots"] = [];
  const gapB = brollGap(o.pace);
  let lastB = 4 - gapB; // первая картинка — уже с 4-й секунды, дальше по шагу темпа
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length >= 3) {
      const at = cur[0].start;
      const until = Math.min(at + 3.5, Math.max(at + 2.6, cur[cur.length - 1].end), end);
      if (at - lastB >= gapB && until - at >= 2.4 && freeAt([...all(), ...brollSlots.map((b) => ({id: "", effect: "broll", at: b.at, until: b.until, params: {}}))], at, until, false)) {
        brollSlots.push({at, until, text: cur.map((w) => w.text).join(" ")});
        lastB = at;
      }
    }
    cur = [];
  };
  words.forEach((w, i) => {
    if (cur.length && w.start - words[i - 1].end > 0.45) flush();
    cur.push(w);
    if (/[.!?…]$/.test(w.text)) flush();
  });
  flush();

  return {effects: out, report, brollSlots};
}
