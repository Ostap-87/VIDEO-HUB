// Команды словами: «на 12 секунде приблизь», «с 0:20 по 0:23 смайл огонь дождём», «хук «МОИ» за головой»,
// «отдали плавно на 3 секунды», «на словах «пять дней» цифра 5 дней», «картинка завод роботов в круге».
// Разбор без нейросети: время (секунда, отрезок, слова речи) + слова эффектов. Что не понято — заметка для Claude:
// её видно на монтажном столе и в задании, она выполняется руками при рендере.
import {EMOJI, findEmoji} from "./emoji";
import {effectById} from "./effects";
import {newId, type EffectItem, type Word} from "./types";

export type ImageAsk = {query: string; at: number; until: number; effect: string; params?: Record<string, string>};
export type Parsed = {
  items: EffectItem[]; // готовые эффекты — сразу в ролик
  images: ImageAsk[]; // картинки по смыслу — подбираются поиском (images.ts), потом становятся эффектами
  remove: {at: number; until: number}[]; // «убери эффекты на 12 секунде»
  note?: string; // не понято — заметка для Claude
  done: string[]; // что сделано, по-человечески
};

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");
const clean = (s: string) => norm(s).replace(/[.,!?;:«»"“”„()]/g, "").trim();

// время «12», «12,5», «0:12», «1:05.5» → секунды
const num = (s: string) => {
  const m = s.match(/^(\d+):(\d{1,2}(?:[.,]\d+)?)$/);
  return m ? +m[1] * 60 + +m[2].replace(",", ".") : +s.replace(",", ".");
};
const T = String.raw`(\d+:\d{1,2}(?:[.,]\d+)?|\d+(?:[.,]\d+)?)`;
const NB = "(?![а-яa-z])"; // конец слова: \b в JS не понимает кириллицу

// фраза речи → секунда её начала (ищем последовательность слов, без знаков и регистра)
export function findPhrase(words: Word[], phrase: string): {at: number; until: number} | null {
  const want = clean(phrase).split(/\s+/).filter(Boolean);
  if (!want.length) return null;
  const ws = words.map((w) => clean(w.text));
  for (let i = 0; i + want.length <= ws.length; i++) {
    let ok = true;
    for (let k = 0; k < want.length && ok; k++) ok = ws[i + k] === want[k] || (k === want.length - 1 && ws[i + k].startsWith(want[k]));
    if (ok) return {at: words[i].start, until: words[i + want.length - 1].end};
  }
  // одно слово по началу («роботах» → «робот»)
  if (want.length === 1 && want[0].length >= 4) {
    const i = ws.findIndex((w) => w.startsWith(want[0].slice(0, Math.max(4, want[0].length - 2))));
    if (i >= 0) return {at: words[i].start, until: words[i].end};
  }
  return null;
}

type When = {at: number; until?: number; dur?: number; said: string};

function when(text: string, sec: number, words: Word[]): When {
  const t = norm(text);
  let m = t.match(new RegExp(String.raw`(?:^|\s)(?:с|со|от)\s+${T}\s*(?:сек[а-я]*\.?|с${NB})?\s*(?:по|до|-|—)\s*${T}`));
  if (m) {
    const a = num(m[1]);
    const b = num(m[2]);
    return {at: a, until: Math.max(a + 0.3, b), said: `${a}–${b} с`};
  }
  m = t.match(new RegExp(String.raw`${T}\s*(?:-|—|–)\s*${T}\s*(?:сек|с${NB})`));
  if (m) {
    const a = num(m[1]);
    return {at: a, until: Math.max(a + 0.3, num(m[2])), said: `${a}–${num(m[2])} с`};
  }
  let dur: number | undefined;
  const d = t.match(new RegExp(String.raw`на\s+${T}\s*секунд(?:ы|у)?${NB}`)) || t.match(/на\s+(полсекунды|секунду|пару секунд)/);
  if (d) dur = d[1] === "полсекунды" ? 0.5 : d[1] === "секунду" ? 1 : d[1] === "пару секунд" ? 2 : num(d[1]);
  const q = text.match(/на\s+слов\S*\s+[«"“„']([^»"”']+)[»"”']/i) || text.match(/(?:когда|где)\s+(?:говорю|говорит|звучит)\s+[«"“„']([^»"”']+)[»"”']/i);
  if (q) {
    const f = findPhrase(words, q[1]);
    if (f) return {at: Math.max(0, f.at - 0.05), dur, said: `на словах «${q[1]}» (${f.at.toFixed(1)} с)`};
  }
  m =
    t.match(new RegExp(String.raw`(?:на|в|во|к)\s+${T}\s*(?:-?(?:й|ой|ей))?\s*(?:секунд[еау]|сек\.?|с)${NB}`)) ||
    t.match(new RegExp(String.raw`(?:на|в)\s+(\d+:\d{1,2}(?:[.,]\d+)?)`)) ||
    t.match(new RegExp(String.raw`^\s*(\d+:\d{1,2}(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*(?:сек[а-я]*\.?|с${NB})?\s*[—:-]?\s+\D`));
  if (m) return {at: num(m[1]), dur, said: `${num(m[1])} с`};
  return {at: sec, dur, said: `${sec.toFixed(1)} с (курсор)`};
}

const quoted = (text: string) => [...text.matchAll(/[«"“„']([^»"”']+)[»"”']/g)].map((m) => m[1].trim()).filter(Boolean);
// текст после ключевого слова: «цифра 5 дней» → «5 дней», «плашка: никаких переписок» → «никаких переписок»
function after(text: string, re: RegExp) {
  const m = text.match(re);
  if (!m) return "";
  return text
    .slice((m.index ?? 0) + m[0].length)
    .replace(/^[\s:—-]+/, "")
    .replace(/\s+(?:на|с|со|в|до|по)\s+\d.*$/i, "")
    .replace(/\s+на\s+(?:слов|полсекунды|секунду|пару).*$/i, "")
    .trim();
}

export function parseCommand(input: string, sec: number, words: Word[]): Parsed {
  const out: Parsed = {items: [], images: [], remove: [], done: []};
  const parts = input
    .split(/\n+|;\s*|\.\s+(?=\S)|,?\s+(?:потом|затем|а\s+ещё|а\s+еще)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown: string[] = [];
  for (const part of parts) {
    const n0 = out.items.length + out.images.length + out.remove.length;
    one(part, sec, words, out);
    if (out.items.length + out.images.length + out.remove.length === n0) unknown.push(part);
  }
  if (unknown.length) out.note = unknown.join("; ");
  return out;
}

function one(text: string, sec: number, words: Word[], out: Parsed) {
  const w = when(text, sec, words);
  text = text.replace(/(?:на\s+слов\S*|(?:когда|где)\s+(?:говорю|говорит|звучит))\s+[«"“„'][^»"”']+[»"”']/i, " ");
  const qs = quoted(text);
  const t = norm(text);
  const add = (effect: string, params: Record<string, string> = {}, len?: number) => {
    const ef = effectById(effect)!;
    const until = w.until ?? +(w.at + (w.dur ?? len ?? ef.len)).toFixed(2);
    out.items.push({id: newId("e"), effect, at: +w.at.toFixed(2), until: +until.toFixed(2), params});
    out.done.push(`${w.said} — ${ef.title}${params.emoji ? " " + (EMOJI.find((e) => e.file === params.emoji)?.char ?? "") : ""}${params.text && effect !== "palette-at" ? ` «${params.text}»` : ""}`);
  };
  const strong = /(сильн|мощн|очень|максимал|резче)/.test(t);
  const weak = /(чуть|слегка|немного|легк|немножко)/.test(t);

  // убрать
  if (/(убер|удали|сотри|убрать|удалить)/.test(t) && !/(картинк|фон)/.test(t)) {
    out.remove.push({at: w.at, until: w.until ?? w.at + 0.01});
    out.done.push(`${w.said} — убрал эффекты`);
    return;
  }

  // где: «справа снизу», «слева сверху», «сверху», «снизу», «по центру»
  const right = /(справа|правый|правом|вправо)/.test(t);
  const left = /(слева|левый|левом|влево)/.test(t);
  const up = /(сверху|верх|наверх)/.test(t);
  const down = /(снизу|низ(?![а-я]*к)|вниз|нижн)/.test(t);
  const corner = (def: string) => (up ? (left ? "tl" : right ? "tr" : "top") : down ? (left ? "bl" : right ? "br" : "bottom") : left ? "left" : right ? "right" : /(центр|середин)/.test(t) ? "center" : def);

  // приёмы референса 28.10.2026 «монтаж через Claude»: команда в чате → ролик, стеклянные виджеты, документалка,
  // карточки по орбите, столбики сверху, неон, монтажный стол, финал с сеткой кадров, @ник в углу
  if (/(команд\S*\s+в\s+чат|клавиатур|чат\S*\s+(?:на|во)\s+весь|печата\S*\s+команд)/.test(t)) {
    add("prompt-chat", {...(qs[0] ? {text: qs[0]} : {}), ...(qs[1] ? {reply: qs[1]} : {})});
    return;
  }
  if (/(прогресс-?спис|список\s+(?:с\s+)?прогресс|прогресс\s+(?:из|по\s+пункт))/.test(t)) {
    const body = qs.length > 1 ? qs.join(" / ") : (text.split(":").slice(1).join(":") || "").split(/,\s*|\s*\/\s*/).map((x) => x.trim()).filter(Boolean).join(" / ");
    add("list-progress", {...(body ? {items: body} : {}), ...(qs.length === 1 ? {title: qs[0]} : {})});
    return;
  }
  if (/виджет/.test(t)) {
    add("widgets-glass", qs[0] ? {caption: qs[0]} : {});
    return;
  }
  if (/(документальн|документалк|как\s+в\s+документ)/.test(t)) {
    const c = colorIn(t);
    add("docu", {...(qs[0] ? {title: qs[0]} : {}), ...(qs[1] ? {name: qs[1]} : {}), ...(/без\s+кнопк/.test(t) ? {button: "-"} : {}), ...(c ? {color: c} : {})});
    return;
  }
  if (/(орбит|по\s+кругу|вращают|кружат)/.test(t) && /(карточк|скрин|картинк|фото|кадр)/.test(t)) {
    const q = qs[0] || after(text, /(?:карточк|скрин\S*|картинк|фото|кадр)\S*(?:\s+(?:с|про|где))?/i).replace(/\s*(?:по\s+орбит|по\s+кругу|вокруг)\S*.*$/i, "").trim();
    const ef = effectById("orbit-cards")!;
    out.images.push({query: q, at: +w.at.toFixed(2), until: w.until ?? +(w.at + (w.dur ?? ef.len)).toFixed(2), effect: "orbit-cards"});
    out.done.push(`${w.said} — ${ef.title}: ${q ? `«${q}»` : "по словам речи"}, ещё четыре — в карточке эффекта`);
    return;
  }
  if (/(столбик|гистограм|диаграм)/.test(t)) {
    const body = (text.split(":").slice(1).join(":") || "").split(/,\s*|\s*\/\s*/).map((x) => x.trim()).filter(Boolean).join(" / ");
    const avg = t.match(/(?:в\s+среднем|средн\S*)\s+(\d+(?:[.,]\d+)?)/);
    add("chart-split", {...(qs[0] ? {title: qs[0]} : {}), ...(body ? {items: body} : {}), ...(avg ? {avg: avg[1].replace(",", ".")} : {})});
    return;
  }
  if (/(неон|вывеск)/.test(t)) {
    const c = colorIn(t);
    add("neon-sign", {...(qs[0] ? {text: qs[0]} : {}), ...(c ? {color: c} : {}), ...(/без\s+прожектор/.test(t) ? {spot: "0"} : {})});
    return;
  }
  if (/(монтажн\S*\s+стол|таймлайн|timeline|дорожк\S*\s+монтаж|окно\s+монтаж)/.test(t)) {
    add("timeline-editor", qs[0] ? {title: qs[0]} : {});
    return;
  }
  if (/(сетк\S*\s+(?:кадр|превью|роликов)|финал\S*\s+(?:с\s+)?сетк|слово\s+в\s+коммент|напиш\S*\s+в\s+коммент)/.test(t)) {
    const h = text.match(/@([\w.]+)/);
    add("outro-grid", {...(qs[0] ? {title: /^напиши/i.test(qs[0]) ? qs[0] : `Напиши «${qs[0]}»`} : {}), ...(qs[1] ? {pill: qs[1]} : {}), ...(h ? {handle: h[1]} : {})});
    return;
  }
  if (/(ник\S*\s+в\s+углу|водян\S*\s+знак|вотермарк|watermark|подпис\S*\s+в\s+углу)/.test(t)) {
    const h = text.match(/@([\w.]+)/);
    add("watermark", h ? {handle: h[1], network: /(телег|tg)/.test(t) ? "telegram" : "instagram"} : {});
    return;
  }

  // приёмы из референсов 23.10.2026: «до / после», спикер на фоне приложения, окно чата, картинки вокруг головы,
  // карточка у груди, финал с @ником, заголовок с рукописью, стили субтитров
  if (/(до\s+и\s+после|до\/после|было\s*[-—и/]?\s*стало|два\s+экрана|оригинал)/.test(t)) {
    const params: Record<string, string> = {};
    if (qs[0]) params.top = qs[0];
    if (qs[1]) params.bottom = qs[1];
    const h = text.match(/@([\w.]+)/);
    if (h) params.handle = h[1];
    add("split-ba", params);
    return;
  }
  if (/(приложени|интерфейс|программ\S*\s+на\s+фоне)/.test(t) && /(спикер|меня|себя|на\s+фоне|фон)/.test(t)) {
    add("speaker-app", qs[0] ? {title: qs[0]} : {});
    return;
  }
  if (/(окно\s+чата|(?:^|[^а-я])чат(?:а|е|ом)?(?![а-я])|запрос|промпт|строк\S*\s+ввода)/.test(t)) {
    add("chat-card", qs[0] ? {text: qs[0]} : {});
    return;
  }
  if (/(вокруг\s+голов|парят|парящ|из-за\s+голов)/.test(t) && /(картинк|фото|изображен)/.test(t)) {
    const q = qs[0] || after(text, /(?:картинк|фото|изображени)\S*(?:\s+(?:с|про|где))?/i).replace(/\s*(?:вокруг|из-за)\s+голов\S*.*$/i, "").trim();
    const ef = effectById("floats")!;
    out.images.push({query: q, at: +w.at.toFixed(2), until: w.until ?? +(w.at + (w.dur ?? ef.len)).toFixed(2), effect: "floats"});
    out.done.push(`${w.said} — ${ef.title}: ${q ? `«${q}»` : "по словам речи"}, ещё две — в карточке эффекта`);
    return;
  }
  if (/карточк\S*\s+(?:у|на)\s+груд|карточк\S*\s+(?:товар|книг|тур|продукт)/.test(t)) {
    add("card-chest", {...(qs[0] ? {title: qs[0]} : {}), ...(qs[1] ? {sub: qs[1]} : {})});
    return;
  }
  if (/(@\w|ник\S*\s+в\s+финал|финал\S*\s+с\s+(?:ник|иконк)|иконк\S*\s+(?:инст|телег|соцсет))/.test(t) || (/подписыва/.test(t) && /финал/.test(t))) {
    const h = text.match(/@([\w.]+)/);
    const network = /(телег|tg)/.test(t) ? "telegram" : /(сайт)/.test(t) ? "site" : "instagram";
    add("outro-handle", {...(h ? {handle: h[1], network} : {}), ...(/(подписыва)/.test(t) ? {text: "подписывайся"} : {})});
    return;
  }
  if (/(заголов|призыв|крупн\S*\s+слово)/.test(t) && /(рукопис|от\s+руки|прописью|засечк|на\s+полос)/.test(t)) {
    const id = /(призыв|на\s+полос)/.test(t) ? "title-band" : /(засечк|тонк|элегант)/.test(t) ? "title-serif" : "title-grotesk";
    add(id, {...(qs[0] ? {text: qs[0]} : {}), ...(qs[1] ? {script: qs[1]} : {}), ...(/(за\s+голов|за\s+спин|за\s+мной)/.test(t) ? {plane: "behind"} : /(перед|поверх)/.test(t) ? {plane: "front"} : {})});
    return;
  }
  // «экран в кадре» (референс dfcdojr): графика в ноутбуке, телефоне, телевизоре в кадре
  if (/(в\s+экран\S*\s+(ноутбук|телефон|планшет|телевизор|монитор)|на\s+(ноутбук|экран\S*\s+ноутбук|мониторе|телевизоре|планшете)|в\s+ноутбук|в\s+телефон\S*\s+в\s+кадре|экран\S*\s+в\s+кадре)/.test(t)) {
    const items = qs.length > 1 ? qs.join(" / ") : (text.split(":").slice(1).join(":") || "").split(/,\s*/).map((x) => x.trim()).filter(Boolean).join(" / ");
    const tk = norm(text.replace(/[«"“„'][^»"”']*[»"”']/g, " ")); // вид — по словам команды, не по тексту в кавычках
    if (/(арк|кривн|кривая|график|спад|пик|волн|рост)/.test(tk)) {
      add("inscreen-chart", {curve: /спад|падени/.test(tk) ? "drop" : /(пик|волн)/.test(tk) ? "wave" : /рост/.test(tk) ? "rise" : "arc", ...(items ? {items} : {})});
    } else if (/(шаг|этап)/.test(tk)) add("inscreen-steps", items ? {items} : {});
    else if (/(список|пункт|плашк)/.test(tk)) add("inscreen-list", items ? {items} : {});
    else if (/(карточк|ролик\S*\s+рядом)/.test(tk)) add("inscreen-cards", qs[0] ? {text: qs[0]} : {});
    else if (/(иконк|значок|эмодзи|смайл)/.test(tk)) add("inscreen-icon", {...(qs[0] ? {text: qs[0]} : {}), ...(findEmoji(text) ? {emoji: findEmoji(text)!.file} : {})});
    else if (/(фото|видео|картинк)/.test(tk)) add("inscreen-media");
    else add("inscreen-text", qs[0] ? {text: qs.join(" / ")} : {});
    return;
  }
  if (/(заголов|тем[аук]|титр)/.test(t) && /(бел\S*\s+плашк|плашк\S*\s+бел|как\s+в\s+тикток|tiktok)/.test(t)) {
    add("title-box", qs[0] ? {text: qs.join(" / ")} : {});
    return;
  }
  if (/субтитр/.test(t) && /(плашк|в\s+углу|углов|угол|тих|слева|мелк|курсив|золот|над\s+экран|над\s+ноутбук|лесенк|маркер|пилюл|за\s+голов|за\s+спин|за\s+мной)/.test(t)) {
    add(
      /(лесенк)/.test(t)
        ? "captions-ladder"
        : /(маркер)/.test(t)
          ? "captions-marker"
          : /(пилюл|цветн\S*\s+плашк)/.test(t)
            ? "captions-pill"
            : /(за\s+голов|за\s+спин|за\s+мной)/.test(t)
              ? "captions-duo"
              : /(плашк)/.test(t)
                ? "captions-plate"
                : /(над\s+экран|над\s+ноутбук|по\s+(одному|два)\s+слов)/.test(t)
                  ? "captions-mini"
                  : /(тих|слева|мелк)/.test(t)
                    ? "captions-quiet"
                    : "captions-corner",
    );
    return;
  }

  // приёмы из каталогов prompt-motion.com и skillry.dev (23.10.2026): пометки от руки, слово на весь кадр, зачёркивание,
  // эхо, свой фон, хлёсткий переход, расфокус, вопрос зрителю, счётчик слова, поиск, штамп, точки, главы, голосование,
  // барабан, кольцо слов
  const listed = qs.length > 1 ? qs.join(" / ") : (text.split(":").slice(1).join(":") || "").split(/,\s*/).map((x) => x.trim()).filter(Boolean).join(" / ");
  if (/(обвед|обвест|кружочк|подчеркн|галочк|крестик)/.test(t)) {
    const c = colorIn(t);
    add("mark", {kind: /подчеркн/.test(t) ? "underline" : /галочк/.test(t) ? "check" : /крестик/.test(t) ? "cross" : "circle", ...(right ? {x: "800"} : left ? {x: "280"} : {}), ...(up ? {y: "520"} : /(лиц|голов)/.test(t) ? {y: "760"} : {}), ...(c ? {color: c} : {})});
    return;
  }
  if (/(слово|текст|заголов|надпис)/.test(t) && /(на\s+весь\s+(кадр|экран)|во\s+весь\s+(кадр|экран)|на\s+заливк|на\s+цветн\S*\s+фон)/.test(t)) {
    const c = colorIn(t);
    add("title-takeover", {...(qs[0] ? {text: qs[0]} : {}), ...(qs[1] ? {sub: qs[1]} : {}), ...(c ? {bg: c} : {}), ...(/сразу/.test(t) ? {mode: "flat"} : {})});
    return;
  }
  if (/(слово|заголов|надпис)/.test(t) && /(зачерк|перечерк)/.test(t) && !/плашк/.test(t)) {
    add("title-strike", {...(qs[0] ? {text: qs[0]} : {}), ...(qs[1] ? {script: qs[1]} : {})});
    return;
  }
  if (/(?:^|[^а-я])эхо(?:м)?(?![а-я])/.test(t)) {
    add("title-echo", qs[0] ? {text: qs[0]} : {});
    return;
  }
  if (/фон/.test(t) && /(сетк|бумаг|тетрад|градиент|замени|поменя|смени)/.test(t) && !/(приложени|экран)/.test(t)) {
    const kind = /(бумаг|тетрад)/.test(t) ? "paper" : /градиент/.test(t) ? "gradient" : /сетк/.test(t) ? "grid" : "image";
    const params: Record<string, string> = {kind, ...(/(обводк|стикер)/.test(t) ? {outline: "1"} : {})};
    if (kind === "image") {
      const q = qs[0] || after(text, /фон\S*(?:\s+(?:на|с|из))?/i).replace(/\s*(?:с\s+)?(?:бел\S*\s+)?обводк\S*/i, "").trim();
      const ef = effectById("bg-replace")!;
      out.images.push({query: q, at: +w.at.toFixed(2), until: w.until ?? +(w.at + (w.dur ?? ef.len)).toFixed(2), effect: "bg-replace", params});
      out.done.push(`${w.said} — ${ef.title}: картинка ${q ? `«${q}»` : "по словам речи"}`);
      return;
    }
    add("bg-replace", params);
    return;
  }
  if (/(хлест|смаз|рывком|whip)/.test(t)) {
    add("fx-whip");
    return;
  }
  if (/(расфокус|в\s+размыти|размой\s+кадр|из\s+фокуса)/.test(t)) {
    add("fx-defocus");
    return;
  }
  if (/(вопрос\S*\s+(зрител|подписчик|аудитори)|спроси\s+(зрител|подписчик)|пузыр\S*\s+с\s+вопрос)/.test(t)) {
    add("ask", qs[0] ? {text: qs[0]} : {});
    return;
  }
  if (/(счетчик|сколько\s+раз)/.test(t)) {
    add("counter-word", qs[0] ? {word: qs[0]} : {});
    return;
  }
  if (/(строк\S*\s+поиск|поиск\S*\s+(в\s+)?(гугл|яндекс)|загугл|гуглит)/.test(t)) {
    add("search", {...(qs[0] ? {text: qs[0]} : {}), ...(qs.length > 1 ? {items: qs.slice(1).join(" / ")} : {})});
    return;
  }
  if (/(штамп|печать\s+[«"])/.test(t)) {
    const c = /(зелен)/.test(t) ? "#1FA35B" : /син/.test(t) ? "#1A73E8" : /черн/.test(t) ? "#191922" : "";
    add("stamp", {...(qs[0] ? {text: qs[0]} : {}), ...(c ? {color: c} : {})});
    return;
  }
  const nm = t.match(/(\d+)\s+из\s+(\d+)/);
  const pc = t.match(/(\d+)\s*(?:%|процент)/);
  if ((nm && !/цифр/.test(t)) || (pc && /точк/.test(t))) {
    add("dots", nm ? {value: nm[1], total: nm[2], ...(qs[0] ? {label: qs[0]} : {})} : {value: pc![1], total: "100", ...(qs[0] ? {label: qs[0]} : {})});
    return;
  }
  if (/(?:^|[^а-я])глав[аыуе](?![а-я])/.test(t)) {
    const title = qs[0] || after(text, /глав\S*(?:\s+\d+)?/i);
    add("chapter", {...(title ? {title} : {}), ...(/(без\s+полос)/.test(t) ? {bar: "0"} : {})});
    return;
  }
  if (/(голосован|опрос|пишите\s+номер|какой\s+вариант)/.test(t)) {
    add("vote", {...(listed ? {items: listed} : {}), ...(qs.length === 1 ? {title: qs[0]} : {})});
    return;
  }
  if (/(барабан|слот|игров\S*\s+автомат|прокрут\S*\s+слов)/.test(t)) {
    add("drum", listed ? {items: listed} : {});
    return;
  }
  if (/(кольц|по\s+кругу|орбит|вокруг\s+голов)/.test(t) && /(слов|текст|надпис)/.test(t)) {
    add("ring", listed ? {items: listed} : {});
    return;
  }

  // спикер: в угол, рамку, круг, по контуру
  if (/(спикер|себя|меня|говорящ|лицо|ведущ)/.test(t) && /(угол|угл|уменьш|рамк|круг|контур|выреж|вырез|окошк|маленьк|сбоку|в\s+сторону)/.test(t)) {
    const style = /(круг|окошк|кружок)/.test(t) ? "round" : /(контур|выреж|вырез|стикер)/.test(t) ? "contour" : "frame";
    const id = style === "round" ? "speaker-round" : style === "contour" ? "speaker-contour" : "speaker-frame";
    const scale = /(совсем\s+маленьк|очень\s+маленьк|крошечн)/.test(t) ? "0.28" : /маленьк/.test(t) ? "0.34" : /(крупн|побольше|больш)/.test(t) ? "0.6" : "";
    const bg = /(фон\s+бренд|фирменн)/.test(t) ? "brand" : /(темн|черн)/.test(t) ? "dark" : "";
    add(id, {corner: corner(style === "round" ? "tr" : style === "contour" ? "bl" : "br"), style, ...(scale ? {scale} : {}), ...(bg ? {bg} : {})});
    return;
  }

  // выдвижной экран с видео или фото
  if (/(экран|окно|панел|шторк\S*\s+с\s+(видео|фото))/.test(t) && !/(во\s+весь\s+экран|на\s+весь\s+экран)/.test(t)) {
    const from = /(из\s+угла|углов|из\s+\S+\s+угла)/.test(t) ? corner("tr").replace(/^(top|bottom|left|right|center)$/, "tr") : up ? "top" : down ? "bottom" : left ? "left" : right ? "right" : "bottom";
    const id = from.length === 2 ? "panel-corner" : from === "top" ? "panel-top" : from === "bottom" ? "panel-bottom" : "panel-side";
    const ef = effectById(id)!;
    const until = w.until ?? +(w.at + (w.dur ?? ef.len)).toFixed(2);
    const q = qs[0] || after(text, /(?:с\s+)?(?:картинк|фото|видео|изображени)\S*(?:\s+(?:с|про|где))?/i);
    if (/(картинк|фото|изображен)/.test(t) || qs.length) {
      out.images.push({query: q, at: +w.at.toFixed(2), until, effect: id, params: {from}});
      out.done.push(`${w.said} — ${ef.title}: картинка ${q ? `«${q}»` : "по словам речи"}`);
    } else {
      out.items.push({id: newId("e"), effect: id, at: +w.at.toFixed(2), until, params: {from}});
      out.done.push(`${w.said} — ${ef.title}: выберите видео или фото в карточке эффекта`);
    }
    return;
  }

  // текст в 3D: под углом, на стене, лёжа
  if (/(текст|надпис|слово|фраз)/.test(t) && /(угл|наклон|3d|3д|перспектив|лежа|лёжа|на\s+стене|на\s+полу|поверн|разверн|плоскост|за\s+спин|за\s+мной|от\s+руки|рукописн)/.test(norm(text))) {
    const id = /(от\s+руки|рукописн)/.test(t) ? "text3d-hand" : /(лежа|на\s+полу|на\s+столе|лежит)/.test(t) ? "text3d-floor" : /(стен|за\s+спин|за\s+мной|перспектив)/.test(t) ? "text3d-wall" : "text3d-tilt";
    const params: Record<string, string> = {};
    if (qs[0]) params.text = qs.join(" / ");
    const deg = t.match(/(-?\d+)\s*(?:градус|°)/);
    if (deg) params[/(наклон|в\s+кадре)/.test(t) ? "rz" : "ry"] = deg[1];
    const c = colorIn(t);
    if (c) params.color = c;
    if (/(крупн|огромн|больш)/.test(t)) params.size = "300";
    if (/(мелк|маленьк|небольш)/.test(t)) params.size = "100";
    if (/(перед|спереди|поверх)/.test(t)) params.plane = "front";
    add(id, params);
    return;
  }

  // цвет текста на отрезке: «субтитры жёлтые», «акцент красный», «цвет текста белый»
  if (/(цвет|покрась|покрас|сделай\s+\S+\s+(субтитр|текст|акцент))/.test(t) || (/(субтитр|акцент|выделен)/.test(t) && colorIn(t))) {
    const tc = colorNear(t, /(субтитр|текст|букв|шрифт)[а-я]*/) ?? (!/(акцент|выделен)/.test(t) ? colorIn(t) : undefined);
    const ac = colorNear(t, /(акцент|выделен|главн\S*\s+слов|важн\S*\s+слов)[а-я]*/);
    if (tc || ac) {
      const accent = ac ?? (tc === "#FFD92E" ? "#3D7BFF" : "#FFD92E");
      add("palette-at", {text: tc ?? "#FFFFFF", accent, ink: lightColor(accent) ? "#191922" : "#FFFFFF"});
      return;
    }
  }

  // картинка по смыслу
  const img = /(картинк|фон(?![а-я])|фоне|фото|изображен|перебивк|b-?roll)/.test(t);
  if (img) {
    const effect = /(в\s+угл|в\s+угол|уголк|карточк|pip)/.test(t)
      ? "broll-pip"
      : /(экран)/.test(t)
        ? "broll-screen"
        : /(сбоку|въезд|выезж|слайд)/.test(t)
          ? "broll-slide"
          : /(наезд|зум|приближ)/.test(t)
            ? "broll-zoom"
            : /(шторк|диагонал)/.test(t)
              ? "broll-wipe"
              : "broll-circle";
    const q =
      qs[0] ||
      after(text, /(?:картинк\S*|фон\S*|фото\S*|изображени\S*|перебивк\S*)(?:\s+(?:с|со|про|где|на\s+тему|по\s+теме|как))?/i)
        .replace(/\s+(?:в|на|кругом|сбоку|в\s+углу|экраном|шторкой|с\s+наездом)\s*(?:кругл\S*|круг\S*|угл\S*|экран\S*|шторк\S*|наезд\S*)?$/i, "")
        .trim();
    const ef = effectById(effect)!;
    const until = w.until ?? +(w.at + (w.dur ?? ef.len)).toFixed(2);
    out.images.push({query: q, at: +w.at.toFixed(2), until, effect});
    out.done.push(`${w.said} — ${ef.title}: ${q ? `«${q}»` : "по словам речи"}`);
    return;
  }

  // движение кадра
  if (/(макро|вплотную|на\s+глаза|на\s+губы|глаза\s+крупно|губы\s+крупно)/.test(t)) {
    add("zoom-macro", {target: /губ/.test(t) ? "lips" : "eyes", amount: strong ? "1.6" : weak ? "0.7" : "1.1"});
  } else if (/(отдал|отъезд|отъех|отодвин|zoom\s*out|шире|общий\s+план|уменьш)/.test(t)) {
    add("zoom-pull", {amount: strong ? "0.32" : weak ? "0.12" : "0.2"});
  } else if (/(приблиз|наезд|наед|зум|zoom|крупн|ближе|увелич|punch)/.test(t)) {
    if (/(плавн|медлен|мягк|потихоньку|постепенн)/.test(t)) add("zoom-push", {amount: strong ? "0.14" : weak ? "0.05" : "0.08"});
    else add("zoom-punch", {amount: strong ? "0.26" : weak ? "0.08" : "0.16"});
  }

  // эмодзи
  const emo = findEmoji(text.replace(/[«"“„'][^»"”']*[»"”']/g, ""));
  const hasChar = /\p{Extended_Pictographic}/u.test(text);
  if (/(смайл|эмодзи|эмоджи|emoji|смайлик)/.test(t) || hasChar) {
    const e = emo ?? EMOJI[0];
    const anim = /(дожд|много|россып|салют|взрыв|разлет)/.test(t) ? "burst" : /(тряс|дрож|колбас)/.test(t) ? "shake" : /(всплыв|улета|поднима|уплыва)/.test(t) ? "float" : "pop";
    const spot = /(над\s+голов|сверху\s+по\s+центру|по\s+центру)/.test(t)
      ? "top"
      : /слева/.test(t)
        ? /(снизу|внизу)/.test(t)
          ? "bl"
          : "tl"
        : /(снизу|внизу)/.test(t)
          ? "br"
          : "";
    add(`emoji-${anim}`, {emoji: e.file, ...(spot ? {spot} : {})});
  }

  // хуки и заголовки
  if (/(хук|заголов|титр|надпис|крупно\s+слово|крупный\s+текст)/.test(t)) {
    const txt = qs.join(" / ") || after(text, /(?:хук|заголовок|титр|надпись)\S*/i);
    const variant = /(за\s+голов|за\s+спин|позади|сзади|огромн)/.test(t)
      ? "behind"
      : /(стен|3d|3д|перспектив|объем)/.test(t)
        ? "wall"
        : /(курсив|микс|смеш)/.test(t)
          ? "mix"
          : /(по\s+одному|по\s+слову|вокруг)/.test(t)
            ? "words"
            : txt.split(/\s*\/\s*|\s+/).filter(Boolean).length <= 1
              ? "behind"
              : "wall";
    add(`hook-${variant}`, txt ? {text: txt} : {});
  }

  // графика
  if (/(цифр|число)/.test(t)) {
    const txt = qs[0] || after(text, /(?:цифр|число)\S*/i).replace(/\s*(?:красн|паден|минус|упал|рух|крупн)\S*/gi, "").trim();
    add(/(красн|паден|минус|упал|рух|снизил)/.test(t) || /^[−-]\d/.test(txt) ? "number-down" : "number", {...(txt ? {text: txt.replace(/\s*(?:с\s+)?(?:отсч[её]т|сч[её]т)\S*/i, "").trim()} : {}), ...(/(отсчет|счетом|считается|бежит)/.test(t) ? {count: "1"} : {})});
  }
  if (/(плашк|бирк)/.test(t)) {
    const txt = qs.join(" / ") || after(text, /(?:плашк|бирк)\S*/i).replace(/\s*(?:с\s+)?зачерк\S*/i, "");
    add(/(зачерк|перечерк)/.test(t) ? "chip-strike" : "chip", txt ? {text: txt} : {});
  }
  if (/(список|галочк|чек-?лист|пункт|планшет|перечисл|флипчарт|стикер|карточк|машинк)/.test(t)) {
    const body = qs.length > 1 ? qs.join(" / ") : (text.split(":").slice(1).join(":") || "").split(/,\s*|\s*\/\s*/).map((x) => x.trim()).filter(Boolean).join(" / ");
    const id = /флипчарт|мольберт|маркер/.test(t)
      ? "list-flip"
      : /карточк/.test(t)
        ? "list-cards"
        : /стикер|липучк/.test(t)
          ? "list-stickers"
          : /(номер|цифрам|по\s+одному)/.test(t)
            ? "list-numbers"
            : /(пилюл|пузыр|вокруг\s+голов)/.test(t)
              ? "list-bubbles"
              : /(машинк|печата|терминал)/.test(t)
                ? "list-typewriter"
                : /(прогресс|зелен\S*\s+галоч|из\s+пяти|по\s+одному\s+с\s+галоч)/.test(t)
                  ? "list-progress"
                  : "checklist";
    add(id, {...(body ? {items: body} : {}), ...(qs.length === 1 ? {title: qs[0]} : {})});
  }
  if (/график/.test(t)) add(/(паден|вниз|упал|рух|красн)/.test(t) ? "stock-down" : "stock-up", qs[0] ? {label: qs[0]} : {});
  if (/(стрелк|ссылка\s+выше)/.test(t)) add("arrow", qs[0] ? {text: qs[0]} : {});

  // переходы
  if (/(ч\/б|чб|черно-?бел|бесцвет|серым)/.test(t)) add("fx-bw");
  if (/(засвет|вспышк\S*\s+свет|лайт\s*лик|light\s*leak|блик)/.test(t)) {
    add("fx-leak", /(розов)/.test(t) ? {color: "255,110,150"} : /(бел)/.test(t) ? {color: "255,235,200"} : {});
  } else if (/(залив|переход|вспышк|смена\s+темы)/.test(t)) {
    const corner = /слева/.test(t) ? (/сверху/.test(t) ? "tl" : "bl") : /сверху/.test(t) ? "tr" : "br";
    add("fx-wipe", {corner});
  }
}

// цвета словами
const COLORS: [RegExp, string][] = [
  [/бел/, "#FFFFFF"],
  [/(черн|чернил)/, "#191922"],
  [/лимон/, "#FFF65D"],
  [/(желт|золот)/, "#FFD92E"],
  [/(голуб|бирюз)/, "#38BDF8"],
  [/син/, "#3D7BFF"],
  [/(коралл|алый)/, "#FF6B5E"],
  [/красн/, "#FF4A1F"],
  [/(мятн)/, "#3CCF8E"],
  [/зелен/, "#22C55E"],
  [/оранж/, "#FF8A00"],
  [/розов/, "#FF8FB1"],
  [/(фиолет|сиренев|лилов)/, "#A78BFA"],
  [/(кремов|бежев)/, "#FFF4E0"],
];
function colorIn(t: string): string | undefined {
  const hex = t.match(/#[0-9a-f]{6}/i);
  if (hex) return hex[0].toUpperCase();
  return COLORS.find(([re]) => re.test(t))?.[1];
}
// цвет рядом с ключевым словом: «субтитры жёлтые», «жёлтые субтитры», «акцент — красный»
function colorNear(t: string, key: RegExp): string | undefined {
  const m = t.match(new RegExp(String.raw`(?:(\S+)\s+)?(?:${key.source})(?:\s*[—:-]?\s*(\S+))?`));
  if (!m) return undefined;
  return (m[m.length - 1] && colorIn(m[m.length - 1])) || (m[1] && colorIn(m[1])) || undefined;
}
const lightColor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
};

// подсказки под строкой команд
export const EXAMPLES = [
  "приблизь резко",
  "отдали плавно на 2 секунды",
  "смайл огонь",
  "эмодзи 😂 дождём",
  "хук «МОИ» за головой",
  "на словах «пять дней» цифра «5 дней»",
  "с 0:20 по 0:24 картинка завод роботов кругом",
  "плашка «Никаких переписок» с зачёркиванием",
  "ч/б на 2 секунды",
  "список: Дорога, Отель, Заводы",
  "спикера в круг справа сверху",
  "вырежи меня по контуру и в левый нижний угол",
  "экран снизу с картинкой «завод роботов»",
  "текст «КИТАЙ» на стене под углом 30 градусов",
  "стикерами: Дорога, Отель, Заводы",
  "субтитры жёлтые, акцент красный",
  "до и после «Монтаж» «Оригинал»",
  "заголовок с засечками «МОНТАЖ» рукописью «через нейросети»",
  "субтитры бежевой плашкой",
  "макро на губы",
  "вспышка света",
  "окно чата «смонтируй ролик»",
  "картинки вокруг головы «роботы на заводе»",
  "финал @ostap.dotsenko подписывайся",
  "в экран ноутбука арка: завязка, развитие, кульминация, развязка",
  "в экран ноутбука текст «НЕ ТА / АРКА»",
  "заголовок на белых плашках «Дофаминовые пики: / как строить историю»",
  "обведи субтитр красным",
  "слово «СТОП» на весь кадр синим",
  "слово «дорого» зачеркнуть «выгодно»",
  "штамп «МИФ»",
  "7 из 10 «заводов работают круглосуточно»",
  "строка поиска «как поехать в Китай»",
  "глава «Заводы»",
  "голосование «Какой город?»: Шэньчжэнь, Шанхай, Пекин",
  "барабан: заводы, роботы, скорость, будущее",
  "кольцо слов вокруг головы: Китай, заводы, роботы",
  "замени фон на сетку с белой обводкой",
  "хлёсткий переход",
  "вопрос зрителю «А вы бы поехали?»",
  "цифра «1000+» отсчётом",
  "команда в чате «/наезд на слове Китай»",
  "стеклянные виджеты «Смонтировано в **Монтажной**»",
  "документальный стиль «Один **тур** / 7 заводов» «Остап Доценко»",
  "карточки по орбите «заводы роботов»",
  "столбики «Сколько заводов / за **день**»: Мы 7, Обычный тур 2, Сами 1",
  "неоновая вывеска «КИТАЙ»",
  "монтажный стол «Ролик **рендерится**»",
  "прогресс-список: Нашёл лицо | каждый кадр, Вырезал фон | маска, Цвет | тёплый",
  "финал с сеткой кадров «тур» «и получи программу»",
  "ник в углу @ostap.dotsenko",
];
