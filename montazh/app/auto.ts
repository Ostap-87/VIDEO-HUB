// «Ритм» и «Автомонтаж» (решения пользователя 23.10.2026):
// - «кнопка, которая будет применять правило, что эффект и/или функция накладываются каждые 4 секунды» — rhythm();
// - «загружаю ролик и ты сам автоматически улучшаешь его — голос, звук, накладываешь спецэффекты по смыслу… отдельная
//   кнопка, чтобы быстро собирал» — autoEffects() (эффекты по словам речи) + шаги в App.tsx (речь, чистка, голос, картинки).
// Всё — приёмы библиотеки effects.ts: в окне сразу видно, руками любое можно поправить или убрать.
import {findEmoji, type Emoji} from "./emoji";
import {newId, type Brand, type EffectItem, type Word} from "./types";

// эффекты-«слои»: два одновременно не ставим (накладываются друг на друга); зумы с ними сочетаются
const OVERLAY = /^(hook|number|chip|checklist|list|stock|arrow|broll|speaker|panel|text3d|emoji|fx-bw)/;
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
const UNIT = /^(дн|лет|год|час|минут|секунд|компани|завод|город|стран|человек|раз|процент|%|тысяч|миллион|миллиард|доллар|рубл|юан|километр|метр|шаг|экспедиц|туров|программ|отрасл|партнер|клиент)/;
const STRONG = /^(никогда|всегда|главное|важно|самый|самая|самое|самые|лучший|лучшие|невероятн|огромн|впервые|секрет|никто|все|бесплатно|реально|честно)$/;
const LIST_START = /^(во-первых|первое|первый|первая|1\.)$/;

export type AutoOpts = {brand: Brand; duration: number; finale: boolean; format: string};
export type AutoPlan = {effects: EffectItem[]; report: string[]; brollSlots: {at: number; until: number; text: string}[]};

export function autoEffects(words: Word[], existing: EffectItem[], o: AutoOpts): AutoPlan {
  const tag = "auto";
  const out: EffectItem[] = [];
  const all = () => [...existing, ...out];
  const end = o.finale ? o.duration - 3.4 : o.duration - 0.6;
  const report: string[] = [];
  const add = (e: Omit<EffectItem, "id">) => {
    if (e.at < 0 || (e.until ?? e.at) > end + 0.5) return false;
    if (!freeAt(all(), e.at, e.until ?? e.at + 2, isZoom(e.effect))) return false;
    out.push({...e, id: newId("e"), params: {...e.params, [tag]: "1"}});
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

  // 5. ударные слова — резкий наезд; эмодзи по смыслу — не чаще раза в 7 с
  let lastEmoji = -99;
  toks.forEach((t, i) => {
    const at = words[i].start;
    if (STRONG.test(t)) add({effect: "zoom-punch", at, until: at + 0.9, params: {amount: "0.14"}});
    if (at - lastEmoji < 7 || EMOJI_SKIP.has(t)) return;
    const e = t ? findEmoji(t) : undefined;
    if (e && add({effect: "emoji-pop", at, until: at + 1.8, params: {emoji: e.file, spot: "tr"}})) {
      lastEmoji = at;
      report.push(`эмодзи ${e.char} на «${words[i].text}»`);
    }
  });

  // 6. «ссылка выше» в Stories — стрелка под стикер-ссылку
  toks.forEach((t, i) => {
    if (/^ссылк/.test(t) && /^(выше|наверху|сверху|закрепл)/.test(toks[i + 1] ?? toks[i + 2] ?? "")) {
      const at = words[i].start;
      if (add({effect: "arrow", at, until: at + 3, params: {}})) report.push("стрелка «Ссылка выше»");
    }
  });

  // 7. места под картинки по смыслу: фразы 2,5–4 с примерно раз в 9 с (картинку подберёт поиск по каталогу)
  const brollSlots: AutoPlan["brollSlots"] = [];
  let lastB = -5; // первая картинка — уже с 4-й секунды, дальше примерно раз в 9 с
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length >= 3) {
      const at = cur[0].start;
      const until = Math.min(at + 3.5, Math.max(at + 2.6, cur[cur.length - 1].end), end);
      if (at - lastB >= 9 && until - at >= 2.4 && freeAt([...all(), ...brollSlots.map((b) => ({id: "", effect: "broll", at: b.at, until: b.until, params: {}}))], at, until, false)) {
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
