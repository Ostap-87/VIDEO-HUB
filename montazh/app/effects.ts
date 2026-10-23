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
  kind?: "text" | "lines" | "image" | "select" | "range" | "color" | "media";
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
const captionsFx = (style: "plate" | "corner" | "quiet", title: string, desc: string, ref: string, y: string): Effect => ({
  id: `captions-${style}`,
  title,
  cat: "Титры",
  desc,
  len: 4,
  ref,
  fields: [{key: "y", label: "По вертикали", kind: "range", min: 700, max: 1500, step: 5, def: y}],
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
];

export const effectById = (id: string) => EFFECTS.find((e) => e.id === id);
