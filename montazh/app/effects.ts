// Библиотека эффектов Монтажной. Каждый эффект — готовый приём шаблона TalkReelPro (reels-studio): его можно
// поставить на любую секунду ролика, и предпросмотр сразу его показывает. У каждого эффекта — превью 1–2 с
// (library/previews/<id>.mp4, рендер scripts/render_previews.mjs). Новые приёмы из референсов дописываются сюда же.
import type {EffectItem, Word} from "./types";

export type Props = Record<string, any>;
export type Field = {key: string; label: string; hint?: string; kind?: "text" | "lines" | "image" | "select"; options?: [string, string][]};
export type Ctx = {words: Word[]; image: (name: string) => string};
export type Effect = {
  id: string;
  title: string;
  cat: string;
  desc: string;
  len: number; // длительность по умолчанию, с
  fields: Field[];
  after?: string; // что появится только после обработки движком
  apply: (p: Props, e: EffectItem, ctx: Ctx) => void;
};

export const CATS = ["Движение", "Переходы", "Титры", "Графика", "Перебивки"];

// слова речи в отрезке — текст эффекта по умолчанию
export const spoken = (words: Word[], at: number, until: number, max = 4) =>
  words
    .filter((w) => w.start >= at - 0.05 && w.start < until)
    .slice(0, max)
    .map((w) => w.text.replace(/[.,!?;:«»"]/g, ""))
    .join(" ");

const end = (e: EffectItem, len: number) => e.until ?? e.at + len;
const lines = (s: string) => (s || "").split(/\s*(?:\n|\/)\s*/).filter(Boolean);
const spread = (arr: string[], at: number, until: number) => arr.map((text, i) => ({text, at: +(at + ((until - at) * i) / Math.max(1, arr.length)).toFixed(2)}));

const hook = (variant: "behind" | "wall" | "mix" | "words", title: string, desc: string, def: string): Effect => ({
  id: `hook-${variant}`,
  title,
  cat: "Титры",
  desc,
  len: variant === "behind" ? 1.6 : 3,
  fields: [{key: "text", label: "Текст", hint: "строки через / или с новой строки; пусто — слова речи", kind: "lines"}],
  after: "спикер встанет перед текстом после вырезки из фона",
  apply: (p, e, ctx) => {
    const u = end(e, variant === "behind" ? 1.6 : 3);
    let ls = lines(e.params.text || spoken(ctx.words, e.at, u, variant === "behind" ? 1 : 4) || def);
    if (variant === "behind") ls = ls.slice(0, 1);
    const items = spread(ls, e.at + 0.1, u - 0.4).map((l, i) => (variant === "mix" ? {...l, kind: i === 0 ? "italic" : "bold"} : l));
    (p.hooks ??= []).push({variant, at: e.at, until: u, lines: items});
  },
});

const broll = (id: string, title: string, desc: string, transition: string, mode = "cutout"): Effect => ({
  id,
  title,
  cat: "Перебивки",
  desc,
  len: 2.8,
  fields: [{key: "image", label: "Картинка", kind: "image"}],
  after: mode === "cutout" ? "до вырезки спикер показывается карточкой в углу" : undefined,
  apply: (p, e, ctx) => {
    if (!e.params.image) return;
    p.broll.push({src: ctx.image(e.params.image), at: e.at, until: end(e, 2.8), transition, mode});
  },
});

export const EFFECTS: Effect[] = [
  {
    id: "zoom-punch",
    title: "Резкий наезд",
    cat: "Движение",
    desc: "Наезд за 3 кадра со звуком «вжух» — на цифре, ударном слове",
    len: 0.9,
    fields: [],
    apply: (p, e) => p.zooms.push({at: e.at, kind: "punch", amount: 0.16, hold: end(e, 0.9) - e.at}),
  },
  {
    id: "zoom-push",
    title: "Плавный наезд",
    cat: "Движение",
    desc: "Медленное приближение на спокойной фразе",
    len: 2,
    fields: [],
    apply: (p, e) => p.zooms.push({at: e.at, kind: "push", amount: 0.08, hold: end(e, 2) - e.at}),
  },
  {
    id: "fx-wipe",
    title: "Заливка из угла",
    cat: "Переходы",
    desc: "Цвет бренда кругом закрывает кадр и уходит в другой угол — смена темы",
    len: 0.7,
    fields: [{key: "corner", label: "Угол", kind: "select", options: [["br", "справа снизу"], ["bl", "слева снизу"], ["tr", "справа сверху"], ["tl", "слева сверху"]]}],
    apply: (p, e) => (p.fx ??= []).push({type: "wipe", at: e.at, corner: e.params.corner || "br"}),
  },
  {
    id: "fx-bw",
    title: "Ч/б → цвет",
    cat: "Переходы",
    desc: "Кадр серый, потом цвет вспыхивает с хлопком — «как было / как стало»",
    len: 2,
    fields: [],
    apply: (p, e) => (p.fx ??= []).push({type: "bw", at: e.at, until: end(e, 2)}),
  },
  hook("behind", "Заголовок за головой", "Огромное слово над головой и за ней, «штамп» с пружиной", "Китай"),
  hook("wall", "Стена в 3D", "Строки капсом въезжают на стену в перспективе", "Опыт / 10 лет"),
  hook("mix", "Гротеск + курсив", "Тихая строка курсивом и громкое слово на маркере", "это / важно"),
  hook("words", "Слова по одному", "Слова выскакивают вокруг головы, последнее — цветом", "не / через / переводчиков"),
  {
    id: "number",
    title: "Крупная цифра",
    cat: "Графика",
    desc: "Цифра со свечением и подписью — главный факт ролика",
    len: 2.6,
    fields: [
      {key: "text", label: "Цифра", hint: "«5 дней», «1000+»"},
      {key: "sub", label: "Подпись"},
    ],
    apply: (p, e, ctx) => p.numbers.push({text: e.params.text || spoken(ctx.words, e.at, e.at + 1.2, 2) || "100%", sub: e.params.sub || "", at: e.at, until: end(e, 2.6)}),
  },
  {
    id: "number-down",
    title: "Красная цифра",
    cat: "Графика",
    desc: "Цифра падения: «−30%», «упали продажи»",
    len: 2.6,
    fields: [
      {key: "text", label: "Цифра"},
      {key: "sub", label: "Подпись"},
    ],
    apply: (p, e, ctx) => p.numbers.push({text: e.params.text || spoken(ctx.words, e.at, e.at + 1.2, 2) || "−30%", sub: e.params.sub || "", at: e.at, until: end(e, 2.6), tone: "down"}),
  },
  {
    id: "chip",
    title: "Плашка",
    cat: "Графика",
    desc: "Белая плашка слева сверху со щелчком",
    len: 3,
    fields: [{key: "text", label: "Текст", hint: "несколько плашек — через /", kind: "lines"}],
    apply: (p, e, ctx) => {
      const u = end(e, 3);
      const ls = lines(e.params.text || spoken(ctx.words, e.at, u, 3) || "Плашка");
      p.chips.push({until: u, wrap: false, items: spread(ls, e.at, Math.min(u - 0.8, e.at + 0.6 * ls.length))});
    },
  },
  {
    id: "chip-strike",
    title: "Плашка с зачёркиванием",
    cat: "Графика",
    desc: "«Никаких переписок» — плашка зачёркивается красной линией",
    len: 3,
    fields: [{key: "text", label: "Текст"}],
    apply: (p, e, ctx) => {
      const u = end(e, 3);
      p.chips.push({until: u, wrap: false, items: [{text: e.params.text || spoken(ctx.words, e.at, u, 3) || "Переписки", at: e.at, strike: +(e.at + (u - e.at) * 0.5).toFixed(2)}]});
    },
  },
  {
    id: "checklist",
    title: "Планшет с галочками",
    cat: "Графика",
    desc: "Спикер уходит вверх, внизу планшет, пункты с галочками и щелчками",
    len: 5,
    fields: [
      {key: "title", label: "Заголовок"},
      {key: "items", label: "Пункты", hint: "через / или с новой строки", kind: "lines"},
    ],
    apply: (p, e) => {
      const u = end(e, 5);
      const its = lines(e.params.items || "Первое / Второе / Третье");
      p.checklists.push({title: e.params.title || "Что важно", until: u, items: spread(its, e.at + 0.6, u - 0.8)});
    },
  },
  {
    id: "stock-up",
    title: "Растущий график",
    cat: "Графика",
    desc: "Зелёная линия со стрелкой вверх за спиной спикера",
    len: 3.5,
    fields: [{key: "label", label: "Подпись", hint: "тикер или название"}],
    after: "линия уйдёт за спину после вырезки спикера",
    apply: (p, e) => (p.stockDrop = {at: e.at, until: end(e, 3.5), label: e.params.label || "РОСТ", direction: "up"}),
  },
  {
    id: "stock-down",
    title: "Падающий график",
    cat: "Графика",
    desc: "Красная ломаная вниз — «рухнули продажи»",
    len: 3.5,
    fields: [{key: "label", label: "Подпись"}],
    after: "линия уйдёт за спину после вырезки спикера",
    apply: (p, e) => (p.stockDrop = {at: e.at, until: end(e, 3.5), label: e.params.label || "ПАДЕНИЕ", direction: "down"}),
  },
  {
    id: "arrow",
    title: "Стрелка «Ссылка выше»",
    cat: "Графика",
    desc: "Жёлтая стрелка вверх — под стикер-ссылку в Stories",
    len: 3,
    fields: [{key: "text", label: "Подпись"}],
    apply: (p, e) => (p.arrows ??= []).push({at: e.at, until: end(e, 3), text: e.params.text || "Ссылка выше"}),
  },
  broll("broll-circle", "Перебивка: круг", "Картинка раскрывается кругом от глаз спикера", "circle"),
  broll("broll-slide", "Перебивка: въезд сбоку", "Картинка въезжает из размытия", "slide"),
  broll("broll-zoom", "Перебивка: наезд", "Картинка наезжает из размытия", "zoom"),
  broll("broll-wipe", "Перебивка: шторка", "Диагональная шторка со светлой кромкой", "wipe"),
  broll("broll-pip", "Картинка, спикер в углу", "Картинка на весь кадр, спикер карточкой справа снизу", "fade", "pip"),
  broll("broll-screen", "Картинка, спикер в экране", "Спикер в большом экране с рамкой, картинка за ним", "fade", "screen"),
];

export const effectById = (id: string) => EFFECTS.find((e) => e.id === id);
