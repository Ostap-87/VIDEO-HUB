// Библиотека эффектов Монтажной. Каждый эффект — готовый приём шаблона TalkReelPro (reels-studio): его можно
// поставить на любую секунду ролика, и предпросмотр сразу его показывает. У каждого эффекта — превью 1–2 с
// (library/previews/<id>.mp4, рендер scripts/render_previews.mjs). Новые приёмы из референсов дописываются сюда же.
import {EMOJI, emojiSrc} from "./emoji";
import {hfName} from "./images";
import type {EffectItem, Word} from "./types";

export type Props = Record<string, any>;
export type Field = {
  key: string;
  label: string;
  hint?: string;
  kind?: "text" | "lines" | "image" | "select" | "range" | "color" | "media" | "quad";
  options?: [string, string][];
  min?: number;
  max?: number;
  step?: number;
  def?: string; // значение по умолчанию (для range/color/select)
};
export type Ctx = {words: Word[]; image: (name: string) => string};
export type Effect = {
  id: string;
  title: string;
  cat: string;
  desc: string;
  len: number; // длительность по умолчанию, с
  fields: Field[];
  after?: string; // что появится только после обработки движком
  ref?: string; // id референса (montazh/references/<id>.json), из которого собран приём
  apply: (p: Props, e: EffectItem, ctx: Ctx) => void;
};

export const CATS = ["Движение", "Спикер", "Экраны", "Переходы", "Титры", "Эмодзи", "Списки", "Графика", "Перебивки", "Цвет"];

// слова речи в отрезке — текст эффекта по умолчанию
export const spoken = (words: Word[], at: number, until: number, max = 4) =>
  words
    .filter((w) => w.start >= at - 0.05 && w.start < until)
    .slice(0, max)
    .map((w) => w.text.replace(/[.,!?;:«»"]/g, ""))
    .join(" ");

const end = (e: EffectItem, len: number) => e.until ?? e.at + len;
const STRENGTH: [string, string][] = [["0.08", "чуть"], ["0.16", "обычно"], ["0.26", "сильно"]];
const strength = (e: EffectItem, def: number) => (e.params.amount ? +e.params.amount : def);
const num = (e: EffectItem, k: string, def: number) => (e.params[k] !== undefined && e.params[k] !== "" && Number.isFinite(+e.params[k]) ? +e.params[k] : def);
// картинка или видео эффекта: из каталога Higgsfield (hf), свой файл (image) — имя для шаблона
const mediaOf = (e: EffectItem, ctx: Ctx) => (e.params.hf ? hfName(e.params.hf) : e.params.image ? ctx.image(e.params.image) : "");
const CORNERS: [string, string][] = [["br", "справа снизу"], ["bl", "слева снизу"], ["tr", "справа сверху"], ["tl", "слева сверху"], ["top", "сверху по центру"], ["bottom", "снизу по центру"], ["left", "слева по центру"], ["right", "справа по центру"], ["center", "в центре"]];
const BGS: [string, string][] = [["blur", "размытый кадр"], ["brand", "фон бренда"], ["dark", "тёмный"], ["image", "картинка"]];

const speakerFx = (id: string, title: string, desc: string, style: "frame" | "round" | "contour", corner: string, scale: number): Effect => ({
  id,
  title,
  cat: "Спикер",
  desc,
  len: 3,
  fields: [
    {key: "corner", label: "Куда", kind: "select", options: CORNERS, def: corner},
    {key: "scale", label: "Размер", kind: "range", min: 0.25, max: 0.75, step: 0.01, def: String(scale)},
    {key: "style", label: "Вид", kind: "select", options: [["frame", "в рамке"], ["round", "в круге"], ["contour", "по контуру"]], def: style},
    {key: "bg", label: "Фон", kind: "select", options: BGS},
    {key: "tilt", label: "Поворот в 3D", kind: "range", min: -25, max: 25, step: 1, def: "0"},
    {key: "image", label: "Картинка фона", kind: "image"},
  ],
  after: style === "contour" ? "контур — после вырезки спикера из фона (в окне пока видна рамка)" : undefined,
  apply: (p, e, ctx) => {
    const st = (e.params.style || style) as "frame" | "round" | "contour";
    const bgImg = mediaOf(e, ctx);
    (p.speaker ??= []).push({
      at: e.at,
      until: end(e, 3),
      corner: e.params.corner || corner,
      scale: num(e, "scale", scale),
      style: st,
      bg: e.params.bg ? (e.params.bg === "image" && !bgImg ? "blur" : e.params.bg) : bgImg ? "image" : "blur",
      image: bgImg || undefined,
      tilt: num(e, "tilt", 0) || undefined,
    });
  },
});

const PANEL_FROM: [string, string][] = [["bottom", "снизу"], ["top", "сверху"], ["left", "слева"], ["right", "справа"], ["tl", "из угла слева сверху"], ["tr", "из угла справа сверху"], ["bl", "из угла слева снизу"], ["br", "из угла справа снизу"]];
const panelFx = (id: string, title: string, desc: string, from: string): Effect => ({
  id,
  title,
  cat: "Экраны",
  desc,
  len: 3.5,
  fields: [
    {key: "image", label: "Видео или фото", kind: "media"},
    {key: "from", label: "Откуда", kind: "select", options: PANEL_FROM, def: from},
    {key: "size", label: "Размер", kind: "range", min: 0.3, max: 0.7, step: 0.01, def: from.length === 2 ? "0.5" : from === "top" ? "0.42" : from === "bottom" ? "0.36" : "0.5"},
    {key: "title", label: "Подпись", hint: "необязательно"},
    {key: "push", label: "Спикер", kind: "select", options: [["1", "отодвигается"], ["0", "остаётся на месте"]]},
  ],
  apply: (p, e, ctx) => {
    const src = mediaOf(e, ctx);
    if (!src) return;
    (p.panels ??= []).push({at: e.at, until: end(e, 3.5), src, from: e.params.from || from, size: num(e, "size", from.length === 2 ? 0.5 : from === "top" ? 0.42 : from === "bottom" ? 0.36 : 0.5), title: e.params.title || undefined, push: e.params.push !== "0"});
  },
});

const FONTS3D: [string, string][] = [["grotesk", "узкий гротеск"], ["display", "жирный широкий"], ["serif", "курсив с засечками"], ["hand", "от руки"], ["mono", "моноширинный"], ["body", "простой"]];
const text3dFx = (id: string, title: string, desc: string, d: Record<string, string>): Effect => ({
  id,
  title,
  cat: "Титры",
  desc,
  len: 3,
  fields: [
    {key: "text", label: "Текст", hint: "пусто — слова речи; новая строка — через /"},
    {key: "font", label: "Шрифт", kind: "select", options: FONTS3D, def: d.font},
    {key: "size", label: "Размер", kind: "range", min: 50, max: 420, step: 2, def: d.size},
    {key: "x", label: "По горизонтали", kind: "range", min: 0, max: 1080, step: 5, def: d.x},
    {key: "y", label: "По вертикали", kind: "range", min: 250, max: 1550, step: 5, def: d.y},
    {key: "rx", label: "Наклон вперёд-назад", kind: "range", min: -80, max: 80, step: 1, def: d.rx},
    {key: "ry", label: "Поворот влево-вправо", kind: "range", min: -80, max: 80, step: 1, def: d.ry},
    {key: "rz", label: "Наклон в кадре", kind: "range", min: -45, max: 45, step: 1, def: d.rz},
    {key: "color", label: "Цвет", kind: "color", def: d.color},
    {key: "color2", label: "Цвет объёма", kind: "color", def: "#191922"},
    {key: "depth", label: "Объём", kind: "range", min: 0, max: 14, step: 1, def: d.depth ?? "6"},
    {key: "plane", label: "Где", kind: "select", options: [["behind", "за спикером"], ["front", "перед спикером"]], def: d.plane ?? "behind"},
    {key: "anim", label: "Появление", kind: "select", options: [["rise", "снизу"], ["fly", "из глубины"], ["swing", "поворотом"], ["type", "по буквам"], ["fade", "проявляется"]], def: d.anim},
  ],
  after: "«за спикером» — после вырезки спикера (в окне текст поверх)",
  apply: (p, e, ctx) => {
    const u = end(e, 3);
    const text = (e.params.text || spoken(ctx.words, e.at, u, 3) || "Китай").split(/\s*\/\s*/).join("\n");
    const g = (k: string) => num(e, k, +(d[k] ?? 0));
    (p.texts ??= []).push({
      at: e.at,
      until: u,
      text,
      x: g("x"),
      y: g("y"),
      size: g("size"),
      rx: g("rx"),
      ry: g("ry"),
      rz: g("rz"),
      color: e.params.color || d.color,
      color2: e.params.color2 || undefined,
      font: e.params.font || d.font,
      plane: e.params.plane || d.plane || "behind",
      anim: e.params.anim || d.anim,
      depth: g("depth") || (d.depth ? +d.depth : 6),
    });
  },
});

const listFx = (style: string, title: string, desc: string, len: number): Effect => ({
  id: `list-${style}`,
  title,
  cat: "Списки",
  desc,
  len,
  fields: [
    {key: "title", label: "Заголовок", hint: "необязательно"},
    {key: "items", label: "Пункты", hint: "через / или с новой строки", kind: "lines"},
  ],
  apply: (p, e) => {
    const u = end(e, len);
    const its = lines(e.params.items || "Первое / Второе / Третье");
    (p.lists ??= []).push({at: e.at, until: u, style, title: e.params.title || undefined, items: spread(its, e.at + 0.5, u - 0.9)});
  },
});
// где стоит эмодзи: не на лице (зона лица x 330–790, y 600–1150), не под субтитрами
export const EMOJI_SPOTS: Record<string, {x: number; y: number}> = {
  tr: {x: 820, y: 460},
  tl: {x: 260, y: 460},
  top: {x: 540, y: 360},
  br: {x: 860, y: 1500},
  bl: {x: 220, y: 1500},
};
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
    // своя картинка (файл из браузера) или из каталога Higgsfield (params.hf — номер, подбор по смыслу)
    const src = e.params.hf ? hfName(e.params.hf) : e.params.image ? ctx.image(e.params.image) : "";
    if (!src) return;
    p.broll.push({src, at: e.at, until: end(e, 2.8), transition, mode});
  },
});

// ------------------------------------------------------------------ приёмы из референсов 23.10.2026
// xkzv9pa «Монтаж через нейросети» (пользователь: «Забери все эффекты, которые есть в ролике») и d4ws46x «Монтируй через …»;
// шаблон — reels-studio/src/components/RefFx.tsx
const PLANE: [string, string][] = [["front", "перед спикером"], ["behind", "за спикером"]];
const titleFx = (id: string, title: string, desc: string, ref: string, d: {font: "serif" | "grotesk"; y: string; plane: string; band?: boolean; text: string; script: string}): Effect => ({
  id,
  title,
  cat: "Титры",
  desc,
  len: 2.6,
  ref,
  fields: [
    {key: "text", label: "Крупное слово", hint: "пусто — слово речи"},
    {key: "script", label: "Рукописью", hint: "две части через / — слева и справа снизу"},
    {key: "y", label: "По вертикали", hint: d.plane === "behind" ? "по умолчанию — у макушки" : id === "title-band" ? "по умолчанию — между экранами «до / после» или над головой" : undefined, kind: "range", min: 250, max: 1500, step: 5, def: d.y},
    {key: "plane", label: "Где", kind: "select", options: PLANE, def: d.plane},
    {key: "band", label: "Подложка", kind: "select", options: [["0", "без полосы"], ["1", "тёмная полоса"]], def: d.band ? "1" : "0"},
    {key: "color", label: "Цвет слова", kind: "color", def: "#FFFFFF"},
    {key: "scriptColor", label: "Цвет рукописи", kind: "color", def: "#FFFFFF"},
  ],
  after: d.plane === "behind" ? "«за спикером» — после вырезки спикера (в окне слово поверх)" : undefined,
  apply: (p, e, ctx) => {
    const u = end(e, 2.6);
    const said = spoken(ctx.words, e.at, u, 3).split(" ").filter(Boolean);
    (p.titles ??= []).push({
      at: e.at,
      until: u,
      text: e.params.text || said[0] || d.text,
      script: e.params.script ?? (e.params.text ? "" : said.slice(1).join(" ") || d.script),
      font: d.font,
      // без своего положения: «гротеск за головой» — у макушки (голова закрывает низ букв); призыв — между экранами
      // «до / после», если они идут в это время, иначе над головой
      y: num(e, "y", d.plane === "behind" && p.focus?.y ? Math.round(p.focus.y - 270) : id === "title-band" ? ((p.splits ?? []).some((x: Props) => e.at >= x.at && e.at < x.until) ? SPLIT_PLATE_Y : Math.max(420, Math.round((p.focus?.y ?? 700) - 330))) : +d.y),
      plane: e.params.plane || d.plane,
      color: e.params.color || undefined,
      scriptColor: e.params.scriptColor || undefined,
      band: (e.params.band ?? (d.band ? "1" : "0")) === "1" || undefined,
    });
  },
});
const captionsFx = (style: "plate" | "corner" | "quiet" | "mini" | "duo" | "ladder" | "marker" | "pill", title: string, desc: string, ref: string, y: string, after?: string): Effect => ({
  id: `captions-${style}`,
  title,
  cat: "Титры",
  desc,
  len: 4,
  ref: ref || undefined,
  fields: [{key: "y", label: "По вертикали", kind: "range", min: 700, max: 1500, step: 5, def: y}],
  after,
  apply: (p, e) => (p.captionsAt ??= []).push({at: e.at, until: end(e, 4), style, y: num(e, "y", +y)}),
});
// у плашки «до / после» субтитры встают бежевой плашкой между экранами
const SPLIT_PLATE_Y = 915;
const HANDLE: Record<string, [string, string]> = {od: ["ostap.dotsenko", "instagram"], aura: ["aura-robotics.ru", "site"], gtt: ["globaltechtour.ru", "site"]};

const REF_EFFECTS: Effect[] = [
  {
    id: "split-ba",
    title: "До / после: два экрана",
    cat: "Экраны",
    desc: "Сверху смонтированный кадр, снизу оригинал, фон — размытая сцена; подписи-пилюли, субтитры плашкой между экранами",
    len: 4,
    ref: "xkzv9pa",
    fields: [
      {key: "top", label: "Подпись сверху", hint: "«Монтаж»"},
      {key: "bottom", label: "Подпись снизу", hint: "«Оригинал»"},
      {key: "image", label: "Нижний экран", kind: "media", hint: "пусто — тот же кадр без цвета и наездов"},
      {key: "handle", label: "@ник в углу", hint: "необязательно"},
      {key: "plate", label: "Субтитры", kind: "select", options: [["1", "плашкой между экранами"], ["0", "как обычно"]]},
    ],
    apply: (p, e, ctx) => {
      const u = end(e, 4);
      (p.splits ??= []).push({at: e.at, until: u, top: e.params.top || "Монтаж", bottom: e.params.bottom || "Оригинал", src: mediaOf(e, ctx) || undefined, handle: e.params.handle || undefined});
      if (e.params.plate !== "0") (p.captionsAt ??= []).push({at: e.at, until: u, style: "plate", y: SPLIT_PLATE_Y});
    },
  },
  titleFx("title-serif", "Заголовок: засечки + рукопись", "Слово тонкими буквами с засечками, поверх — строка от руки («МОНТАЖ через нейросети»)", "xkzv9pa", {font: "serif", y: "300", plane: "front", text: "Монтаж", script: "через / нейросети"}),
  titleFx("title-grotesk", "Заголовок: гротеск + рукопись", "Огромное узкое слово за головой и рукописная строка поверх («МОНТИРУЙ через…»)", "d4ws46x", {font: "grotesk", y: "430", plane: "behind", text: "Монтируй", script: "через / нейросеть"}),
  titleFx("title-band", "Призыв: слово + рукопись", "Крупное жирное слово и рукопись под ним между экранами или по центру («ПИШИ летим»), можно на тёмной полосе", "xkzv9pa", {font: "grotesk", y: "925", plane: "front", text: "Пиши", script: "летим"}),
  captionsFx("plate", "Субтитры: бежевая плашка", "Фраза строчными тонкими буквами с засечками на бежевой плашке", "xkzv9pa", "1240"),
  captionsFx("corner", "Субтитры: угол, 2 строки", "Жирный узкий курсив капсом справа, слова выскакивают по одному, вторая строка — золотом", "xkzv9pa", "1330"),
  captionsFx("quiet", "Субтитры: тихие слева", "Небольшие белые строчные в две строки слева, без выделений", "d4ws46x", "1160"),
  {
    id: "zoom-macro",
    title: "Макро-наезд",
    cat: "Движение",
    desc: "Резкий наезд вплотную — на глаза или губы, со звуком «вжух»",
    len: 1.2,
    ref: "xkzv9pa",
    fields: [
      {key: "target", label: "Куда", kind: "select", options: [["eyes", "на глаза"], ["lips", "на губы"]]},
      {key: "amount", label: "Сила", kind: "select", options: [["1.1", "обычно"], ["0.7", "чуть"], ["1.6", "вплотную"]]},
    ],
    apply: (p, e) => p.zooms.push({at: e.at, kind: "macro", amount: strength(e, 1.1), hold: end(e, 1.2) - e.at, target: e.params.target || "eyes"}),
  },
  {
    id: "sticker",
    title: "Наклейка: логотип или картинка",
    cat: "Эмодзи",
    desc: "Своя картинка — логотип, значок — выскакивает наклейкой рядом с головой и покачивается",
    len: 1.8,
    ref: "xkzv9pa",
    fields: [
      {key: "image", label: "Картинка", kind: "image", hint: "лучше PNG без фона"},
      {key: "spot", label: "Где", kind: "select", options: [["tr", "справа сверху"], ["tl", "слева сверху"], ["top", "над головой"], ["br", "справа снизу"], ["bl", "слева снизу"]]},
      {key: "anim", label: "Движение", kind: "select", options: [["pop", "выскакивает"], ["shake", "трясётся"], ["float", "всплывает"]]},
    ],
    apply: (p, e, ctx) => {
      const src = mediaOf(e, ctx);
      if (!src) return;
      const spot = EMOJI_SPOTS[e.params.spot || "tr"] ?? EMOJI_SPOTS.tr;
      (p.emojis ??= []).push({at: e.at, until: end(e, 1.8), src, x: spot.x, y: spot.y, anim: e.params.anim || "pop", size: 220});
    },
  },
  {
    id: "fx-leak",
    title: "Вспышка света",
    cat: "Переходы",
    desc: "Тёплый засвет проходит по кадру — мягкий переход на склейке",
    len: 0.8,
    ref: "xkzv9pa",
    fields: [{key: "color", label: "Свет", kind: "select", options: [["255,150,70", "тёплый"], ["255,110,150", "розовый"], ["255,235,200", "белый"]]}],
    apply: (p, e) => (p.fx ??= []).push({type: "leak", at: e.at, until: end(e, 0.8), color: e.params.color || undefined}),
  },
  {
    id: "chat-card",
    title: "Окно чата",
    cat: "Графика",
    desc: "Выскакивает окно ввода: кадр ролика прикреплён, текст печатается, кнопка «отправить» нажимается",
    len: 3.5,
    ref: "d4ws46x",
    fields: [
      {key: "text", label: "Текст запроса", hint: "«смонтируй ролик»"},
      {key: "image", label: "Прикреплённый кадр", kind: "image", hint: "пусто — кадр ролика"},
      {key: "label", label: "Подпись справа", hint: "«Монтажная»"},
      {key: "y", label: "По вертикали", kind: "range", min: 350, max: 1300, step: 5, def: "1100"},
    ],
    apply: (p, e, ctx) => (p.chats ??= []).push({at: e.at, until: end(e, 3.5), text: e.params.text || "смонтируй ролик", image: mediaOf(e, ctx) || undefined, label: e.params.label || undefined, y: num(e, "y", 1100)}),
  },
  {
    id: "floats",
    title: "Картинки вокруг головы",
    cat: "Графика",
    desc: "2–3 картинки вылетают из-за головы и парят вокруг неё",
    len: 3.5,
    ref: "d4ws46x",
    fields: [
      {key: "image", label: "Картинка 1", kind: "media"},
      {key: "image2", label: "Картинка 2", kind: "media"},
      {key: "image3", label: "Картинка 3", kind: "media"},
      {key: "plane", label: "Где", kind: "select", options: [["behind", "из-за спикера"], ["front", "перед спикером"]]},
    ],
    after: "«из-за спикера» — после вырезки спикера (в окне картинки поверх)",
    apply: (p, e, ctx) => {
      const items = [mediaOf(e, ctx), e.params.image2 ? ctx.image(e.params.image2) : "", e.params.image3 ? ctx.image(e.params.image3) : ""].filter(Boolean);
      if (items.length) (p.floats ??= []).push({at: e.at, until: end(e, 3.5), items, plane: e.params.plane || "behind"});
    },
  },
  {
    id: "card-chest",
    title: "Карточка у груди",
    cat: "Графика",
    desc: "Карточка с картинкой и подписью поднимается снизу и парит у груди — книга, тур, продукт",
    len: 3.5,
    ref: "d4ws46x",
    fields: [
      {key: "title", label: "Заголовок", hint: "пусто — слова речи"},
      {key: "sub", label: "Подпись"},
      {key: "image", label: "Картинка", kind: "media"},
      {key: "y", label: "По вертикали", kind: "range", min: 900, max: 1300, step: 5, def: "1050"},
    ],
    apply: (p, e, ctx) => (p.cards ??= []).push({at: e.at, until: end(e, 3.5), title: e.params.title || spoken(ctx.words, e.at, end(e, 3.5), 4) || "Карточка", sub: e.params.sub || undefined, src: mediaOf(e, ctx) || undefined, y: num(e, "y", 1050)}),
  },
  {
    id: "speaker-app",
    title: "Спикер на фоне приложения",
    cat: "Спикер",
    desc: "Спикер вырезан в углу перед окном приложения: результат сначала грузится размытым, потом проявляется",
    len: 4,
    ref: "d4ws46x",
    fields: [
      {key: "title", label: "Задание в окне", hint: "«смонтируй ролик»"},
      {key: "image", label: "Результат в окне", kind: "media", hint: "пусто — сам ролик"},
      {key: "corner", label: "Куда", kind: "select", options: CORNERS, def: "br"},
      {key: "scale", label: "Размер", kind: "range", min: 0.35, max: 0.75, step: 0.01, def: "0.62"},
      {key: "windows", label: "Окна результата", kind: "select", options: [["1", "одно"], ["2", "два рядом, второе позже"]]},
    ],
    after: "контур — после вырезки спикера (в окне пока видна рамка)",
    apply: (p, e, ctx) =>
      (p.speaker ??= []).push({at: e.at, until: end(e, 4), corner: e.params.corner || "br", scale: num(e, "scale", 0.62), style: "contour", bg: "app", image: mediaOf(e, ctx) || undefined, title: e.params.title || undefined, windows: e.params.windows === "2" ? 2 : undefined}),
  },
  {
    id: "outro-handle",
    title: "Финал: иконка и @ник",
    cat: "Графика",
    desc: "Кадр темнеет, иконка соцсети выскакивает и становится цветной, под ней @ник",
    len: 2.6,
    ref: "xkzv9pa",
    fields: [
      {key: "handle", label: "@ник или адрес", hint: "пусто — канал бренда"},
      {key: "network", label: "Соцсеть", kind: "select", options: [["instagram", "Instagram"], ["telegram", "Telegram"], ["site", "сайт"]]},
      {key: "text", label: "Надпись от руки", hint: "«подписывайся», необязательно"},
    ],
    apply: (p, e) => {
      const [h, net] = HANDLE[p.brand ?? "gtt"] ?? HANDLE.gtt;
      (p.outros ??= []).push({at: e.at, until: end(e, 2.6), handle: e.params.handle || h, network: e.params.network || (e.params.handle ? "instagram" : net), text: e.params.text || undefined});
    },
  },
];

// ------------------------------------------------------------------ «Экран в кадре» (референс dfcdojr 23.10.2026)
// графика в настоящем экране кадра (ноутбук, телефон, ТВ) по четырём углам; шаблон — reels-studio/src/components/ScreenInsert.tsx
export const DEFAULT_QUAD = "170,1150 910,1150 960,1600 120,1600";
export const parseQuad = (s?: string): [number, number][] | undefined => {
  const pts = (s || "").trim().split(/\s+/).map((p) => p.split(",").map(Number));
  return pts.length === 4 && pts.every((p) => p.length === 2 && p.every(Number.isFinite)) ? (pts as [number, number][]) : undefined;
};
const QUAD_FIELD: Field = {key: "quad", label: "Углы экрана", hint: "нажмите на кадре 4 угла экрана: слева сверху, справа сверху, справа снизу, слева снизу", kind: "quad"};
const SCREEN_PLANE: Field = {key: "plane", label: "Руки спикера", kind: "select", options: [["behind", "поверх экрана"], ["front", "под экраном"]]};
const inScreenFx = (id: string, title: string, desc: string, kind: string, fields: Field[], fill: (p: Props, e: EffectItem, ctx: Ctx, u: number) => Props, len = 4): Effect => ({
  id,
  title,
  cat: "Экраны",
  desc,
  len,
  ref: "dfcdojr",
  fields: [QUAD_FIELD, ...fields, SCREEN_PLANE],
  after: "руки поверх экрана — после вырезки спикера (в окне графика поверх рук)",
  apply: (p, e, ctx) => {
    const u = end(e, len);
    (p.inscreens ??= []).push({at: e.at, until: u, quad: parseQuad(e.params.quad) ?? parseQuad(DEFAULT_QUAD), kind, plane: e.params.plane || "behind", ...fill(p, e, ctx, u)});
  },
});
const SCREEN_EFFECTS: Effect[] = [
  inScreenFx("inscreen-text", "Экран в кадре: текст", "Крупный текст в две краски прямо в экране ноутбука или телефона в кадре («НЕ ТА / АРКА»)", "text", [
    {key: "text", label: "Текст", hint: "строки через /; пусто — слова речи", kind: "lines"},
    {key: "sub", label: "Подпись мелко"},
  ], (p, e, ctx, u) => ({text: e.params.text || spoken(ctx.words, e.at, u, 3) || "Не та / арка", sub: e.params.sub || undefined}), 3),
  inScreenFx("inscreen-chart", "Экран в кадре: кривая с подписями", "Кривая рисуется в экране, подписи точек появляются по очереди: арка истории, спад, пики, рост", "chart", [
    {key: "curve", label: "Кривая", kind: "select", options: [["arc", "арка (завязка → кульминация → развязка)"], ["drop", "спад"], ["wave", "пики волнами"], ["rise", "рост"]]},
    {key: "items", label: "Подписи точек", hint: "через / ; пусто — по виду кривой", kind: "lines"},
  ], (p, e) => ({curve: e.params.curve || "arc", items: e.params.items ? lines(e.params.items) : undefined}), 5),
  inScreenFx("inscreen-cards", "Экран в кадре: карточки роликов", "До четырёх вертикальных карточек (ролики, фото) въезжают в экран по очереди", "cards", [
    {key: "image", label: "Карточка 1", kind: "media"},
    {key: "image2", label: "Карточка 2", kind: "media"},
    {key: "image3", label: "Карточка 3", kind: "media"},
    {key: "image4", label: "Карточка 4", kind: "media"},
    {key: "text", label: "Подпись под карточками"},
  ], (p, e, ctx) => ({images: [mediaOf(e, ctx), ...["image2", "image3", "image4"].map((k) => (e.params[k] ? ctx.image(e.params[k]) : ""))].filter(Boolean), text: e.params.text || undefined})),
  inScreenFx("inscreen-list", "Экран в кадре: список-плашки", "Пункты в голубых рамках появляются в экране один за другим", "list", [
    {key: "items", label: "Пункты", hint: "через / или с новой строки", kind: "lines"},
  ], (p, e) => ({items: e.params.items ? lines(e.params.items) : undefined})),
  inScreenFx("inscreen-steps", "Экран в кадре: шаги", "Блоки со стрелками: «Выбрал → Заполнил → Текст», последний — цветом", "steps", [
    {key: "items", label: "Шаги", hint: "через / ; подпись мелко — после |: «Выбрал|структуру»", kind: "lines"},
  ], (p, e) => ({items: e.params.items ? lines(e.params.items) : undefined})),
  inScreenFx("inscreen-icon", "Экран в кадре: иконка и подпись", "Картинка со свечением и крупная подпись («+ ДОФАМИН»)", "icon", [
    {key: "image", label: "Картинка", kind: "image", hint: "лучше PNG без фона; пусто — эмодзи"},
    {key: "emoji", label: "Эмодзи", kind: "select", options: EMOJI.map((x) => [x.file, `${x.char} ${x.file}`] as [string, string])},
    {key: "text", label: "Подпись"},
  ], (p, e, ctx, u) => ({src: mediaOf(e, ctx) || emojiSrc(e.params.emoji || "взрыв-мозга"), text: e.params.text || spoken(ctx.words, e.at, u, 2) || undefined}), 3),
  inScreenFx("inscreen-media", "Экран в кадре: фото или видео", "Своё фото или видео встаёт в экран в кадре в перспективе", "media", [{key: "image", label: "Фото или видео", kind: "media"}], (p, e, ctx) => ({src: mediaOf(e, ctx) || undefined})),
  {
    id: "title-box",
    title: "Заголовок на белых плашках",
    cat: "Титры",
    desc: "Тема ролика чёрным жирным текстом на белых плашках, как текст TikTok («Дофаминовые пики: / как строить историю»)",
    len: 3,
    ref: "dfcdojr",
    fields: [
      {key: "text", label: "Текст", hint: "строки через /", kind: "lines"},
      {key: "y", label: "По вертикали", hint: "по умолчанию — над головой", kind: "range", min: 300, max: 1500, step: 5, def: "420"},
    ],
    apply: (p, e, ctx) => {
      const u = end(e, 3);
      (p.titles ??= []).push({at: e.at, until: u, font: "box", text: e.params.text || spoken(ctx.words, e.at, u, 6) || "Тема ролика", y: num(e, "y", Math.max(380, Math.round((p.focus?.y ?? 700) - 330)))});
    },
  },
  captionsFx("mini", "Субтитры: мелкие над экраном", "По 1–2 слова, жирные белые с тёмной обводкой — стоят над ноутбуком или телефоном в кадре", "dfcdojr", "1110"),
];

// ------------------------------------------------------------------ приёмы из каталогов prompt-motion.com и skillry.dev (23.10.2026)
// пользователь: «забери всё, что там есть, для нашей монтажки». Промпты и пакеты сайтов не копируем (у skillry это запрещено
// условиями) — только сами приёмы, своим кодом: reels-studio/src/components/TrendFx.tsx и RefFx.tsx
const COUNT_FIELD: Field = {key: "count", label: "Счёт", kind: "select", options: [["0", "сразу целиком"], ["1", "отсчётом от нуля"]]};
const MARKS: [string, string][] = [["circle", "обвести"], ["underline", "подчеркнуть"], ["check", "галочка"], ["cross", "крестик"], ["arrow", "стрелка"]];
const STAMP_COLORS: [string, string][] = [["#E5322D", "красный"], ["#1FA35B", "зелёный"], ["#1A73E8", "синий"], ["#191922", "чёрный"]];
const TREND_EFFECTS: Effect[] = [
  {
    id: "mark",
    title: "Пометка от руки",
    cat: "Графика",
    desc: "Маркер рисует на кадре: обводит слово или предмет, подчёркивает, ставит галочку, крестик или стрелку",
    len: 1.6,
    fields: [
      {key: "kind", label: "Что", kind: "select", options: MARKS},
      {key: "x", label: "По горизонтали", kind: "range", min: 80, max: 1000, step: 5, def: "540"},
      {key: "y", label: "По вертикали", hint: "по умолчанию — субтитры", kind: "range", min: 250, max: 1700, step: 5, def: "1300"},
      {key: "w", label: "Ширина", kind: "range", min: 120, max: 900, step: 10, def: "420"},
      {key: "color", label: "Цвет", kind: "color", def: "#E5322D"},
    ],
    apply: (p, e) =>
      (p.marks ??= []).push({at: e.at, until: end(e, 1.6), kind: e.params.kind || "circle", x: num(e, "x", 540), y: num(e, "y", 1300), w: num(e, "w", 420), h: Math.round(num(e, "w", 420) * 0.4), color: e.params.color || undefined}),
  },
  {
    id: "title-takeover",
    title: "Слово на весь кадр",
    cat: "Титры",
    desc: "Огромное слово сначала за головой, потом кадр заливается цветом — остаётся только слово и строка под ним",
    len: 2.4,
    fields: [
      {key: "text", label: "Слово", hint: "пусто — слово речи"},
      {key: "sub", label: "Строка под ним"},
      {key: "bg", label: "Заливка", kind: "color", def: "#1A73E8"},
      {key: "mode", label: "Как", kind: "select", options: [["takeover", "из-за головы → заливка"], ["flat", "сразу на заливке"]]},
    ],
    after: "часть «за головой» — после вырезки спикера",
    apply: (p, e, ctx) => {
      const u = end(e, 2.4);
      const text = e.params.text || spoken(ctx.words, e.at, u, 1) || "Стоп";
      const y = Math.round((p.focus?.y ?? 700) - 270);
      const bg = e.params.bg || "#1A73E8";
      const sub = e.params.sub || undefined;
      if (e.params.mode === "flat") return void (p.titles ??= []).push({at: e.at, until: u, text, font: "grotesk", y: 960, plane: "front", bg, sub});
      const mid = +(e.at + (u - e.at) * 0.45).toFixed(2);
      (p.titles ??= []).push({at: e.at, until: mid, text, font: "grotesk", y, plane: "behind"}, {at: mid, until: u, text, font: "grotesk", y, plane: "front", bg, sub, still: true});
    },
  },
  {
    id: "title-strike",
    title: "Слово зачёркивается",
    cat: "Титры",
    desc: "Крупное слово перечёркивается линией, рядом рукописью — правильное («дорого → выгодно»)",
    len: 2.6,
    fields: [
      {key: "text", label: "Слово", hint: "пусто — слово речи"},
      {key: "script", label: "Правильное рукописью"},
      {key: "strike", label: "Зачеркнуть через, с", kind: "range", min: 0.2, max: 2, step: 0.1, def: "0.8"},
      {key: "y", label: "По вертикали", kind: "range", min: 250, max: 1500, step: 5, def: "380"},
    ],
    apply: (p, e, ctx) =>
      (p.titles ??= []).push({at: e.at, until: end(e, 2.6), text: e.params.text || spoken(ctx.words, e.at, end(e, 2.6), 1) || "Дорого", script: e.params.script || undefined, font: "grotesk", y: num(e, "y", 380), plane: "front", strikeAt: num(e, "strike", 0.8)}),
  },
  {
    id: "title-echo",
    title: "Слово с эхом",
    cat: "Титры",
    desc: "Слово ударом появляется, за ним расходятся две затухающие копии — на главном слове фразы",
    len: 1.8,
    fields: [
      {key: "text", label: "Слово", hint: "пусто — слово речи"},
      {key: "y", label: "По вертикали", kind: "range", min: 250, max: 1500, step: 5, def: "380"},
      {key: "color", label: "Цвет", kind: "color", def: "#FFFFFF"},
    ],
    apply: (p, e, ctx) =>
      (p.titles ??= []).push({at: e.at, until: end(e, 1.8), text: e.params.text || spoken(ctx.words, e.at, end(e, 1.8), 1) || "Бум", font: "grotesk", y: num(e, "y", 380), plane: "front", echo: true, color: e.params.color || undefined}),
  },
  captionsFx("duo", "Субтитры: слово за головой", "Ключевое слово фразы огромным за головой, вся фраза мелко внизу", "", "1300", "огромное слово за головой — после вырезки спикера (в окне поверх)"),
  captionsFx("ladder", "Субтитры: лесенка", "Строки разного размера лесенкой, главное слово — крупнее и цветом", "", "1180"),
  captionsFx("marker", "Субтитры: маркер", "Звучащее слово выделяется полосой маркера слева направо", "", "1250"),
  captionsFx("pill", "Субтитры: пилюля", "Звучащее слово на цветной плашке, прошлая строка тускнеет сверху", "", "1250"),
  {
    id: "bg-replace",
    title: "Свой фон за спикером",
    cat: "Спикер",
    desc: "Фон за вырезанным спикером меняется: сетка, бумага, градиент или своя картинка; можно белую обводку-стикер",
    len: 4,
    fields: [
      {key: "kind", label: "Фон", kind: "select", options: [["grid", "сетка"], ["paper", "бумага"], ["gradient", "градиент бренда"], ["image", "картинка"]]},
      {key: "image", label: "Картинка", kind: "media", hint: "для фона «картинка»"},
      {key: "outline", label: "Обводка", kind: "select", options: [["0", "без обводки"], ["1", "белая обводка-стикер"]]},
    ],
    after: "фон меняется после вырезки спикера (в окне виден исходный кадр)",
    apply: (p, e, ctx) => {
      const src = mediaOf(e, ctx);
      (p.bgs ??= []).push({at: e.at, until: end(e, 4), kind: src ? "image" : e.params.kind === "image" ? "grid" : e.params.kind || "grid", src: src || undefined, outline: e.params.outline === "1" || undefined});
    },
  },
  {
    id: "fx-whip",
    title: "Хлёсткий переход",
    cat: "Переходы",
    desc: "Кадр смазывается рывком вбок со звуком «вжух» — смена мысли, склейка",
    len: 0.4,
    fields: [],
    apply: (p, e) => (p.fx ??= []).push({type: "whip", at: e.at, until: end(e, 0.4)}),
  },
  {
    id: "fx-defocus",
    title: "Расфокус",
    cat: "Переходы",
    desc: "Кадр уходит в размытие и возвращается в фокус — пауза, «представьте»",
    len: 0.9,
    fields: [],
    apply: (p, e) => (p.fx ??= []).push({type: "defocus", at: e.at, until: end(e, 0.9)}),
  },
  {
    id: "ask",
    title: "Вопрос зрителю",
    cat: "Графика",
    desc: "Пузырь-вопрос у головы («А вы бы поехали?») — зовёт в комментарии",
    len: 2.6,
    fields: [
      {key: "text", label: "Вопрос", hint: "пусто — слова речи"},
      {key: "sub", label: "Подпись", hint: "«пишите в комментариях»"},
      {key: "emoji", label: "Эмодзи", kind: "select", options: EMOJI.map((x) => [x.file, `${x.char} ${x.file}`] as [string, string])},
      {key: "side", label: "Сторона", kind: "select", options: [["right", "справа"], ["left", "слева"]]},
    ],
    apply: (p, e, ctx) =>
      (p.asks ??= []).push({at: e.at, until: end(e, 2.6), text: e.params.text || spoken(ctx.words, e.at, end(e, 2.6), 5) || "А вы бы поехали?", sub: e.params.sub || undefined, emoji: e.params.emoji ? emojiSrc(e.params.emoji) : undefined, side: e.params.side || undefined}),
  },
  {
    id: "counter-word",
    title: "Счётчик слова",
    cat: "Графика",
    desc: "Значок в углу считает, сколько раз прозвучало слово («короче ×13») — с этой секунды до конца отрезка",
    len: 20,
    fields: [
      {key: "word", label: "Слово", hint: "«Китай», «короче»"},
      {key: "label", label: "Подпись", hint: "необязательно"},
    ],
    apply: (p, e, ctx) => {
      const w = (e.params.word || spoken(ctx.words, e.at, e.at + 1, 1) || "").trim();
      if (w) (p.counters ??= []).push({word: w, label: e.params.label || undefined, from: e.at, until: end(e, 20)});
    },
  },
  {
    id: "search",
    title: "Строка поиска",
    cat: "Графика",
    desc: "Запрос печатается в строке поиска, выпадают подсказки",
    len: 3,
    fields: [
      {key: "text", label: "Запрос", hint: "пусто — слова речи"},
      {key: "items", label: "Подсказки", hint: "через /", kind: "lines"},
      {key: "y", label: "По вертикали", kind: "range", min: 300, max: 1400, step: 5, def: "420"},
    ],
    apply: (p, e, ctx) => (p.searches ??= []).push({at: e.at, until: end(e, 3), text: e.params.text || spoken(ctx.words, e.at, end(e, 3), 4) || "как поехать в Китай", items: e.params.items ? lines(e.params.items) : undefined, y: num(e, "y", 420)}),
  },
  {
    id: "stamp",
    title: "Штамп",
    cat: "Графика",
    desc: "Штамп падает с поворотом и оставляет отпечаток: «МИФ», «ПРОВЕРЕНО», «ФАКТ»",
    len: 1.8,
    fields: [
      {key: "text", label: "Надпись", hint: "«МИФ», «ФАКТ»"},
      {key: "color", label: "Цвет", kind: "select", options: STAMP_COLORS},
      {key: "y", label: "По вертикали", kind: "range", min: 300, max: 1500, step: 5, def: "480"},
    ],
    apply: (p, e) => (p.stamps ??= []).push({at: e.at, until: end(e, 1.8), text: (e.params.text || "Факт").toUpperCase(), color: e.params.color || undefined, y: num(e, "y", 480)}),
  },
  {
    id: "dots",
    title: "Точки «N из M»",
    cat: "Графика",
    desc: "Сетка точек закрашивается до нужного числа: «7 из 10», «73%»",
    len: 2.6,
    fields: [
      {key: "value", label: "Сколько", hint: "7"},
      {key: "total", label: "Из скольких", hint: "10 (для % — 100)"},
      {key: "label", label: "Подпись"},
    ],
    apply: (p, e) => (p.dots ??= []).push({at: e.at, until: end(e, 2.6), value: num(e, "value", 7), total: num(e, "total", 10), label: e.params.label || undefined}),
  },
  {
    id: "chapter",
    title: "Глава",
    cat: "Титры",
    desc: "Метка «Глава 2 · Заводы» и полоса прогресса по главам сверху — для длинных роликов",
    len: 2,
    fields: [
      {key: "title", label: "Название главы", hint: "пусто — слова речи"},
      {key: "bar", label: "Полоса глав сверху", kind: "select", options: [["1", "показывать"], ["0", "без полосы"]]},
    ],
    apply: (p, e, ctx) => {
      (p.chapters ??= []).push({at: e.at, title: e.params.title || spoken(ctx.words, e.at, e.at + 2, 3) || "Глава"});
      if (e.params.bar !== "0") p.chapterBar = true;
    },
  },
  {
    id: "vote",
    title: "Голосование: сетка вариантов",
    cat: "Графика",
    desc: "Кадр темнеет, варианты под номерами — «какой выбираете? пишите номер»",
    len: 3.5,
    fields: [
      {key: "title", label: "Вопрос", hint: "«Какой город?»"},
      {key: "items", label: "Варианты", hint: "через /", kind: "lines"},
      {key: "image", label: "Картинка 1", kind: "media"},
      {key: "image2", label: "Картинка 2", kind: "media"},
      {key: "image3", label: "Картинка 3", kind: "media"},
      {key: "image4", label: "Картинка 4", kind: "media"},
    ],
    apply: (p, e, ctx) => {
      const images = [mediaOf(e, ctx), ...["image2", "image3", "image4"].map((k) => (e.params[k] ? ctx.image(e.params[k]) : ""))].filter(Boolean);
      (p.votes ??= []).push({at: e.at, until: end(e, 3.5), title: e.params.title || undefined, items: lines(e.params.items || "Шэньчжэнь / Шанхай / Пекин / Гуанчжоу"), images: images.length ? images : undefined});
    },
  },
  {
    id: "drum",
    title: "Барабан слов",
    cat: "Титры",
    desc: "Слова прокручиваются, как барабан игрового автомата, и останавливаются на последнем",
    len: 2.4,
    fields: [
      {key: "prefix", label: "Начало фразы", hint: "«Китай — это»"},
      {key: "items", label: "Слова", hint: "через /; последнее — итог", kind: "lines"},
      {key: "y", label: "По вертикали", kind: "range", min: 300, max: 1500, step: 5, def: "420"},
    ],
    apply: (p, e) => (p.drums ??= []).push({at: e.at, until: end(e, 2.4), prefix: e.params.prefix || undefined, items: lines(e.params.items || "заводы / роботы / скорость / будущее"), y: num(e, "y", 420)}),
  },
  {
    id: "ring",
    title: "Кольцо слов вокруг головы",
    cat: "Графика",
    desc: "Слова летят по кругу вокруг головы: задняя половина кольца уходит за спикера",
    len: 3.5,
    fields: [{key: "items", label: "Слова", hint: "через /; пусто — слова речи", kind: "lines"}],
    after: "задняя половина за головой — после вырезки спикера",
    apply: (p, e, ctx) => {
      const u = end(e, 3.5);
      const said = spoken(ctx.words, e.at, u, 8).split(" ").filter((w) => w.length > 2).slice(0, 5);
      (p.rings ??= []).push({at: e.at, until: u, items: e.params.items ? lines(e.params.items) : said.length >= 3 ? said : ["Китай", "заводы", "роботы", "будущее"]});
    },
  },
];

// ------------------------------------------------------------------ референс 28.10.2026 «монтаж через Claude» (WeTransfer)
// шаблон — reels-studio/src/components/ShowcaseFx.tsx; разбор — source-videos/референсы-эффекты/2026-10-28-ref-wetransfer/разбор.md
// «7 | эффектов один клип» → значение и подпись
const pair = (s?: string): [string, string] => {
  const [a, ...b] = (s || "").split("|");
  return [a.trim(), b.join("|").trim()];
};
const WIDGET_FIELDS: [string, string, string][] = [
  ["stat", "Цифра", "«7 | эффектов в ролике»"],
  ["progress", "Прогресс", "«Рендер | 97»"],
  ["profile", "Профиль", "«Остап | @ostap.dotsenko»"],
  ["chart", "Мини-график", "«Монтаж ролика | 3 мин»"],
  ["player", "Плеер", "«мягкие щелчки | sfx · 25 с»"],
  ["ring", "Кольцо", "«4K | рендер»"],
  ["badge", "Бейдж", "«26 | Выложить 2 ролика»"],
];
const SHOWCASE_EFFECTS: Effect[] = [
  {
    id: "widgets-glass",
    title: "Стеклянные виджеты",
    cat: "Графика",
    desc: "Вокруг головы всплывают стеклянные виджеты в стиле iPhone: цифра, прогресс рендера, профиль, мини-график, плеер, кольцо, бейдж; снизу плашка «Смонтировано в …»",
    len: 3,
    ref: "wt2810",
    fields: [
      ...WIDGET_FIELDS.map(([key, label, hint]) => ({key, label, hint: `${hint}; пусто — без него`})),
      {key: "caption", label: "Плашка снизу", hint: "«Смонтировано в **Монтажной**», ** — цвет бренда"},
    ],
    apply: (p, e) => {
      const set = WIDGET_FIELDS.filter(([k]) => e.params[k]);
      const items = (set.length ? set.map(([k]) => k) : ["stat", "progress", "profile", "ring", "badge"]).map((kind) => {
        const [value, label] = pair(e.params[kind] || {stat: "7 | эффектов в одном ролике", progress: "Рендер | 97", profile: p.brand === "od" ? "Остап | @ostap.dotsenko" : p.brand === "aura" ? "Aura Robotics | aura-robotics.ru" : "Global Tech Tour | globaltechtour.ru", ring: "4K | рендер", badge: "2 | ролика в день"}[kind]);
        if (kind === "progress") return {kind, label: value || "Рендер", value: label || "97", sub: "4K"};
        if (kind === "profile") return {kind, label: value, sub: label};
        if (kind === "chart") return {kind, label: value, value: label, sub: "stats"};
        if (kind === "player") return {kind, label: value, sub: label};
        return {kind, value, label};
      });
      (p.widgets ??= []).push({at: e.at, until: end(e, 3), items, caption: e.params.caption ?? (set.length ? undefined : "Смонтировано в **Монтажной**")});
    },
  },
  {
    id: "docu",
    title: "Документальный стиль",
    cat: "Спикер",
    desc: "Спикер ч/б на тёмном фоне со свечением за головой, узкий заголовок капсом, плашка с именем и кнопка «Подписаться», которую нажимает курсор",
    len: 3,
    ref: "wt2810",
    fields: [
      {key: "title", label: "Заголовок", hint: "строки через /, ** — цвет: «Один **ролик** / 7 эффектов»"},
      {key: "kicker", label: "Строка сверху", hint: "«ИИ простыми словами · ежедневно»"},
      {key: "name", label: "Имя на плашке"},
      {key: "handle", label: "@ник под именем"},
      {key: "button", label: "Кнопка", hint: "пусто — «Подписаться», «-» — без кнопки"},
      {key: "color", label: "Цвет свечения", hint: "пусто — цвет бренда", kind: "color", def: "#2F6BFF"},
    ],
    after: "тёмный фон и свечение — после вырезки спикера (в окне — ч/б кадр с виньеткой)",
    apply: (p, e, ctx) => {
      const u = end(e, 3);
      const [h] = HANDLE[p.brand ?? "gtt"] ?? HANDLE.gtt;
      (p.docus ??= []).push({
        at: e.at,
        until: u,
        title: e.params.title || spoken(ctx.words, e.at, u, 4) || "Один ролик",
        kicker: e.params.kicker || undefined,
        name: e.params.name || (p.brand === "od" ? "Остап Доценко" : undefined),
        handle: e.params.handle || (p.brand === "od" ? h : undefined),
        button: e.params.button === "-" ? "" : e.params.button || undefined,
        color: e.params.color || undefined,
      });
    },
  },
  {
    id: "orbit-cards",
    title: "Карточки по орбите",
    cat: "Графика",
    desc: "Скриншоты и кадры летают по орбите вокруг головы в 3D: спереди крупнее, сзади уходят за спикера",
    len: 3,
    ref: "wt2810",
    fields: [
      {key: "image", label: "Картинка 1", kind: "media"},
      {key: "image2", label: "Картинка 2", kind: "media"},
      {key: "image3", label: "Картинка 3", kind: "media"},
      {key: "image4", label: "Картинка 4", kind: "media"},
      {key: "image5", label: "Картинка 5", kind: "media"},
    ],
    after: "задняя половина орбиты за спикером — после вырезки (в окне все карточки поверх)",
    apply: (p, e, ctx) => {
      const items = [mediaOf(e, ctx), ...["image2", "image3", "image4", "image5"].map((k) => (e.params[k] ? ctx.image(e.params[k]) : ""))].filter(Boolean);
      if (items.length) (p.orbits ??= []).push({at: e.at, until: end(e, 3), items});
    },
  },
  {
    id: "chart-split",
    title: "График сверху, спикер снизу",
    cat: "Экраны",
    desc: "Сверху тёмная панель со столбиками: свой столбик подсвечен, пунктир «в среднем»; снизу спикер карточкой",
    len: 3.5,
    ref: "wt2810",
    fields: [
      {key: "title", label: "Заголовок", hint: "«Сколько роликов / в **неделю**»"},
      {key: "items", label: "Столбики", hint: "«Мы 14 / Агентство 5 / Сами 1» — подпись и число; первый подсвечен, или поставьте * у нужного", kind: "lines"},
      {key: "avg", label: "Линия «в среднем»", hint: "число, пусто — без линии"},
      {key: "color", label: "Цвет своего столбика", kind: "color", def: "#FFD23F"},
    ],
    apply: (p, e) => {
      const rows = lines(e.params.items || "Мы 14 / Агентство 5 / Сами 3 / Фриланс 2");
      const bars = rows.map((r) => {
        const m = r.match(/^(.*?)[\s:—-]*(-?\d+(?:[.,]\d+)?)\s*(\*)?$/);
        return m ? {label: m[1].replace(/\*/g, "").trim(), value: +m[2].replace(",", "."), hi: m[3] ? true : r.includes("*") || undefined} : {label: r.replace(/\*/g, ""), value: 0, hi: r.includes("*") || undefined};
      });
      const anyHi = bars.some((b) => b.hi);
      const fixed = bars.map((b, i) => ({...b, hi: anyHi ? !!b.hi : i === 0}));
      (p.charts ??= []).push({at: e.at, until: end(e, 3.5), title: e.params.title || "Сколько роликов / в **неделю**", bars: fixed, avg: e.params.avg !== undefined && e.params.avg !== "" && Number.isFinite(+e.params.avg) ? +e.params.avg : undefined, color: e.params.color || undefined});
    },
  },
  {
    id: "neon-sign",
    title: "Неоновая вывеска",
    cat: "Титры",
    desc: "Над головой загорается неоновая надпись с миганием, кадр темнеет — спикер в луче прожектора",
    len: 3,
    ref: "wt2810",
    fields: [
      {key: "text", label: "Надпись", hint: "пусто — слово речи"},
      {key: "color", label: "Цвет неона", hint: "пусто — цвет бренда", kind: "color", def: "#3D7BFF"},
      {key: "spot", label: "Прожектор", kind: "select", options: [["1", "фон темнеет"], ["0", "без прожектора"]]},
    ],
    after: "прожектор и вывеска за спикером — после вырезки",
    apply: (p, e, ctx) =>
      (p.neons ??= []).push({at: e.at, until: end(e, 3), text: e.params.text || spoken(ctx.words, e.at, end(e, 3), 1) || "Монтаж", color: e.params.color || undefined, spot: e.params.spot === "0" ? false : undefined}),
  },
  {
    id: "timeline-editor",
    title: "Монтажный стол сверху",
    cat: "Экраны",
    desc: "Сверху окно монтажки: строки отмечаются галочками, дорожки кадров, субтитров, цвета и звука, бежит бегунок и проценты рендера; снизу спикер",
    len: 3.5,
    ref: "wt2810",
    fields: [
      {key: "title", label: "Заголовок", hint: "«Ролик **рендерится**»"},
      {key: "items", label: "Строки", hint: "«склейки | паузы убраны / субтитры | слова в синхрон / цвет | тёплый»", kind: "lines"},
      {key: "progress", label: "Проценты", kind: "range", min: 10, max: 100, step: 1, def: "97"},
    ],
    apply: (p, e, ctx) => {
      const u = end(e, 3.5);
      const rows = lines(e.params.items || "склейки | паузы убраны / субтитры | слова в синхрон / цвет | тёплый · лицо / эффекты | 7 загружено / звук | мягкие щелчки").map((r) => {
        const [label, value] = pair(r);
        return {label, value: value || "готово"};
      });
      const ws = spoken(ctx.words, e.at - 2, u + 2, 6).split(" ").filter(Boolean);
      const clips = [ws.slice(0, 2).join(" "), ws.slice(2, 4).join(" "), ws.slice(4, 6).join(" ")].filter(Boolean);
      (p.timelines ??= []).push({at: e.at, until: u, title: e.params.title || "Ролик **рендерится**", rows, clips: clips.length ? clips : undefined, progress: num(e, "progress", 97)});
    },
  },
  {
    id: "prompt-chat",
    title: "Команда в чате → ролик",
    cat: "Переходы",
    desc: "Кадр становится чатом: команда печатается на клавиатуре телефона, приходит ответ, карточка с роликом раскрывается на весь кадр",
    len: 2.6,
    ref: "wt2810",
    fields: [
      {key: "text", label: "Команда", hint: "«/наезд на слове Китай»"},
      {key: "reply", label: "Ответ", hint: "пусто — «Монтирую…»"},
      {key: "hint", label: "Подсказка к команде", hint: "серой строкой под командой, необязательно"},
    ],
    apply: (p, e) => (p.prompts ??= []).push({at: e.at, until: end(e, 2.6), text: e.params.text || "/монтаж", reply: e.params.reply || undefined, hint: e.params.hint || undefined}),
  },
  {
    id: "outro-grid",
    title: "Финал: сетка кадров и слово",
    cat: "Графика",
    desc: "В конце — сетка превью из кадров ролика, сверху «Напиши «слово»» и пилюля; потом сетка гаснет, выскакивают иконка и @ник",
    len: 3.4,
    ref: "wt2810",
    fields: [
      {key: "title", label: "Заголовок", hint: "«Напиши «тур»»"},
      {key: "pill", label: "Пилюля", hint: "«и получи программу поездки»"},
      {key: "frames", label: "Кадров в сетке", kind: "range", min: 4, max: 16, step: 4, def: "12"},
      {key: "handle", label: "@ник или адрес", hint: "пусто — канал бренда"},
      {key: "network", label: "Соцсеть", kind: "select", options: [["instagram", "Instagram"], ["telegram", "Telegram"], ["site", "сайт"]]},
    ],
    apply: (p, e) => {
      const [h, net] = HANDLE[p.brand ?? "gtt"] ?? HANDLE.gtt;
      (p.outros ??= []).push({at: e.at, until: end(e, 3.4), handle: e.params.handle || h, network: e.params.network || (e.params.handle ? "instagram" : net), title: e.params.title || "Напиши «тур»", pill: e.params.pill || undefined, gridFrames: num(e, "frames", 12)});
    },
  },
  {
    id: "watermark",
    title: "@ник в углу",
    cat: "Графика",
    desc: "Иконка соцсети и @ник в правом верхнем углу на весь отрезок — защита от перезаливов",
    len: 30,
    ref: "wt2810",
    fields: [
      {key: "handle", label: "@ник", hint: "пусто — канал бренда"},
      {key: "network", label: "Соцсеть", kind: "select", options: [["instagram", "Instagram"], ["telegram", "Telegram"], ["site", "сайт"]]},
    ],
    apply: (p, e) => {
      const [h, net] = HANDLE[p.brand ?? "gtt"] ?? HANDLE.gtt;
      p.watermark = {handle: e.params.handle || h, network: e.params.network || (e.params.handle ? "instagram" : net), from: e.at, until: end(e, 30)};
    },
  },
];

export const EFFECTS: Effect[] = [
  {
    id: "zoom-punch",
    title: "Резкий наезд",
    cat: "Движение",
    desc: "Наезд за 3 кадра со звуком «вжух» — на цифре, ударном слове",
    len: 0.9,
    fields: [{key: "amount", label: "Сила", kind: "select", options: [STRENGTH[1], STRENGTH[0], STRENGTH[2]]}],
    apply: (p, e) => p.zooms.push({at: e.at, kind: "punch", amount: strength(e, 0.16), hold: end(e, 0.9) - e.at}),
  },
  {
    id: "zoom-push",
    title: "Плавный наезд",
    cat: "Движение",
    desc: "Медленное приближение на спокойной фразе",
    len: 2,
    fields: [{key: "amount", label: "Сила", kind: "select", options: [["0.08", "обычно"], ["0.05", "чуть"], ["0.14", "сильно"]]}],
    apply: (p, e) => p.zooms.push({at: e.at, kind: "push", amount: strength(e, 0.08), hold: end(e, 2) - e.at}),
  },
  {
    id: "zoom-pull",
    title: "Отдаление",
    cat: "Движение",
    desc: "Кадр сразу крупно и плавно отъезжает к общему плану",
    len: 1.6,
    fields: [{key: "amount", label: "Сила", kind: "select", options: [["0.2", "обычно"], ["0.12", "чуть"], ["0.32", "сильно"]]}],
    apply: (p, e) => p.zooms.push({at: e.at, kind: "pull", amount: strength(e, 0.2), hold: end(e, 1.6) - e.at}),
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
  ...(["pop", "float", "shake", "burst"] as const).map(
    (anim): Effect => ({
      id: `emoji-${anim}`,
      title: {pop: "Эмодзи", float: "Эмодзи всплывает", shake: "Эмодзи трясётся", burst: "Россыпь эмодзи"}[anim],
      cat: "Эмодзи",
      desc: {
        pop: "Живой смайл выскакивает рядом с головой и покачивается",
        float: "Смайл всплывает вверх и тает",
        shake: "Смайл выскакивает и трясётся — на эмоциях",
        burst: "Шесть смайлов разлетаются во все стороны",
      }[anim],
      len: anim === "burst" ? 1.4 : 1.8,
      fields: [
        {key: "emoji", label: "Эмодзи", kind: "select", options: EMOJI.map((x) => [x.file, `${x.char} ${x.file}`] as [string, string])},
        {key: "spot", label: "Где", kind: "select", options: [["tr", "справа сверху"], ["tl", "слева сверху"], ["top", "над головой"], ["br", "справа снизу"], ["bl", "слева снизу"]]},
      ],
      apply: (p, e) => {
        const spot = EMOJI_SPOTS[e.params.spot || (anim === "burst" ? "top" : "tr")] ?? EMOJI_SPOTS.tr;
        (p.emojis ??= []).push({at: e.at, until: end(e, anim === "burst" ? 1.4 : 1.8), src: emojiSrc(e.params.emoji || "огонь"), x: spot.x, y: spot.y, anim, size: anim === "burst" ? 200 : 240});
      },
    }),
  ),
  {
    id: "number",
    title: "Крупная цифра",
    cat: "Графика",
    desc: "Цифра со свечением и подписью — главный факт ролика",
    len: 2.6,
    fields: [
      {key: "text", label: "Цифра", hint: "«5 дней», «1000+»"},
      {key: "sub", label: "Подпись"},
      COUNT_FIELD,
    ],
    apply: (p, e, ctx) => p.numbers.push({text: e.params.text || spoken(ctx.words, e.at, e.at + 1.2, 2) || "100%", sub: e.params.sub || "", at: e.at, until: end(e, 2.6), count: e.params.count === "1" || undefined}),
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
      COUNT_FIELD,
    ],
    apply: (p, e, ctx) => p.numbers.push({text: e.params.text || spoken(ctx.words, e.at, e.at + 1.2, 2) || "−30%", sub: e.params.sub || "", at: e.at, until: end(e, 2.6), tone: "down", count: e.params.count === "1" || undefined}),
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
    cat: "Списки",
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
  speakerFx("speaker-frame", "Спикер в угол", "Кадр уменьшается в рамку в выбранном углу, за ним — размытый фон", "frame", "br", 0.42),
  speakerFx("speaker-round", "Спикер в круге", "Лицо в круглом окошке, как в видеозвонке", "round", "tr", 0.38),
  speakerFx("speaker-contour", "Спикер по контуру", "Вырезанный спикер с белой обводкой, как стикер", "contour", "bl", 0.55),
  panelFx("panel-bottom", "Экран снизу", "Панель с видео или фото выезжает снизу, спикер поднимается", "bottom"),
  panelFx("panel-top", "Экран сверху", "Шторка с видео или фото опускается сверху, спикер уходит ниже", "top"),
  panelFx("panel-side", "Экран сбоку", "Экран въезжает слева или справа, спикер отходит в сторону", "right"),
  panelFx("panel-corner", "Экран из угла", "Карточка вылетает из угла с поворотом", "tr"),
  text3dFx("text3d-wall", "Текст на стене", "Крупный текст в перспективе за спикером", {font: "grotesk", size: "230", x: "380", y: "560", rx: "0", ry: "32", rz: "0", color: "#FFFFFF", anim: "swing"}),
  text3dFx("text3d-floor", "Текст лёжа", "Текст лежит в глубине кадра, как на полу или столе", {font: "display", size: "190", x: "540", y: "1470", rx: "56", ry: "0", rz: "0", color: "#FFD92E", anim: "fly", plane: "front"}),
  text3dFx("text3d-tilt", "Текст под углом", "Наклонная строка поверх кадра", {font: "display", size: "140", x: "540", y: "420", rx: "0", ry: "-12", rz: "-9", color: "#FFFFFF", anim: "rise", plane: "front"}),
  text3dFx("text3d-hand", "Надпись от руки", "Рукописная строка, печатается по буквам", {font: "hand", size: "190", x: "540", y: "430", rx: "0", ry: "0", rz: "-6", color: "#FFFFFF", anim: "type", plane: "front", depth: "0"}),
  listFx("flip", "Флипчарт", "Мольберт с листом: пункты пишутся маркером, квадратики отмечаются", 5.5),
  listFx("cards", "Карточки стопкой", "Карточки с номерами прилетают с переворотом и ложатся стопкой", 5),
  listFx("stickers", "Стикеры", "Цветные липучки по бокам от головы", 5),
  listFx("numbers", "Крупные номера", "Огромная цифра и пункт, следующий выталкивает предыдущий", 5),
  listFx("bubbles", "Пилюли вокруг головы", "Пункты всплывают пилюлями дугой над головой", 5),
  listFx("typewriter", "Печатная машинка", "Тёмная панель, пункты печатаются по буквам", 5.5),
  {...listFx("progress", "Прогресс «N из M»", "Тёмная стеклянная карточка «Монтирую ролик · 3 из 5»: пункты отмечаются зелёными галочками, справа метка («Нашёл лицо | каждый кадр»)", 4), ref: "wt2810"},
  {
    id: "palette-at",
    title: "Цвета текста на отрезке",
    cat: "Цвет",
    desc: "Субтитры и акцент другого цвета — с этой секунды до конца отрезка",
    len: 4,
    fields: [
      {key: "text", label: "Цвет субтитров", kind: "color", def: "#FFFFFF"},
      {key: "accent", label: "Цвет акцента", kind: "color", def: "#FFD92E"},
      {key: "ink", label: "Текст на акценте", kind: "color", def: "#191922"},
    ],
    apply: (p, e) => (p.paletteAt ??= []).push({at: e.at, until: end(e, 4), text: e.params.text || "#FFFFFF", accent: e.params.accent || "#FFD92E", ink: e.params.ink || undefined}),
  },
  ...REF_EFFECTS,
  ...SCREEN_EFFECTS,
  ...TREND_EFFECTS,
  ...SHOWCASE_EFFECTS,
];

export const effectById = (id: string) => EFFECTS.find((e) => e.id === id);
