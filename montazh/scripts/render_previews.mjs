// Превью эффектов библиотеки (1–2 с каждое): все эффекты из app/effects.ts ставятся на образцовый ролик GTT
// через каждые ~3,6 с, ролик рендерится один раз (TalkReelPro, половинный размер), потом нарезается ffmpeg.
//   node montazh/scripts/render_previews.mjs [--only id1,id2] [--skip-render]
// Нужна вырезка спикера на отрезки хуков, графиков и перебивок — скрипт сам запускает npm run matte.
// Результат: montazh/library/previews/<id>.webm и .mp4 (360×640, без звука, обычный git — не LFS) и шоурил _all.mp4 в /tmp.
import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MZ = path.dirname(HERE);
const ROOT = path.dirname(MZ);
const RS = path.join(ROOT, "reels-studio");
const esbuild = createRequire(path.join(RS, "node_modules", "x.js"))("esbuild");
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;

const SAMPLE = "source-videos/2026-10-07-chai-kofe/_work/chai-kofe.cut.mp4";
const CUTOUT = "source-videos/2026-10-07-chai-kofe/_work/chai-kofe.cut.alpha.webm";
const words = JSON.parse(fs.readFileSync(path.join(ROOT, "source-videos/2026-10-07-chai-kofe/_work/chai-kofe.cut.words.json"), "utf8"));
const layout = JSON.parse(fs.readFileSync(path.join(ROOT, "source-videos/2026-10-07-chai-kofe/_work/chai-kofe.cut.layout.json"), "utf8"));
const base = JSON.parse(fs.readFileSync(path.join(RS, "props/2026-10-07-chai-kofe.json"), "utf8"));
const IMG = base.broll.map((b) => b.src);
const SCREEN = "250,1190 830,1190 870,1560 210,1560";

// тексты превью (на образце говорят про чай и кофе Китая)
const PARAMS = {
  "hook-behind": {text: "Китай"},
  "hook-wall": {text: "Чай / и кофе"},
  "hook-mix": {text: "это / важно"},
  "hook-words": {text: "не / через / переводчиков"},
  number: {text: "1000+", sub: "кофеен", count: "1"},
  "number-down": {text: "−30%", sub: "продажи", count: "1"},
  chip: {text: "Без переводчиков"},
  "chip-strike": {text: "Переписки"},
  checklist: {title: "Как устроена поездка", items: "Заводы / Встречи / Дегустации"},
  "stock-up": {label: "CHAGEE"},
  "stock-down": {label: "STARBUCKS"},
  arrow: {text: "Ссылка выше"},
  "zoom-pull": {amount: "0.26"},
  "emoji-pop": {emoji: "огонь"},
  "emoji-float": {emoji: "сердце"},
  "emoji-shake": {emoji: "взрыв-мозга"},
  "emoji-burst": {emoji: "смех", spot: "top"},
  "speaker-frame": {bg: "blur"},
  "speaker-round": {bg: "blur"},
  "speaker-contour": {bg: "brand"},
  "panel-bottom": {title: "Чайная фабрика"},
  "panel-top": {},
  "panel-side": {from: "right"},
  "panel-corner": {from: "tr"},
  "text3d-wall": {text: "Китай"},
  "text3d-floor": {text: "5 дней"},
  "text3d-tilt": {text: "Чай / и кофе"},
  "text3d-hand": {text: "вкусно!"},
  "list-flip": {title: "Поездка", items: "Заводы / Встречи / Дегустации"},
  "list-cards": {items: "Заводы / Встречи / Дегустации"},
  "list-stickers": {items: "Заводы / Встречи / Дегустации"},
  "list-numbers": {title: "Поездка", items: "Заводы / Встречи / Дегустации"},
  "list-bubbles": {items: "Заводы / Встречи / Дегустации"},
  "list-typewriter": {title: "Поездка", items: "Заводы / Встречи / Дегустации"},
  "palette-at": {text: "#FFD92E", accent: "#FF4A1F", ink: "#FFFFFF"},
  // приёмы из референсов 23.10.2026 (image: "" — оставить кадр самого ролика)
  "split-ba": {top: "Монтаж", bottom: "Оригинал", image: ""},
  "title-serif": {text: "Китай", script: "чай / и кофе"},
  "title-grotesk": {text: "Чай", script: "из / Китая"},
  "title-band": {text: "Пиши", script: "летим"},
  "zoom-macro": {target: "eyes"},
  "chat-card": {text: "смонтируй ролик", image: ""},
  floats: {image2: IMG[3 % IMG.length], image3: IMG[4 % IMG.length]},
  "card-chest": {title: "Чайные плантации Китая", sub: "5 дней · 7 фабрик"},
  "speaker-app": {title: "смонтируй ролик", image: ""},
  "outro-handle": {handle: "ostap.dotsenko", network: "instagram", text: "подписывайся"},
  // «экран в кадре» (референс dfcdojr): на образце нет ноутбука — экран «держит» спикер у груди
  "inscreen-text": {quad: SCREEN, plane: "front", text: "Чай / и кофе", sub: "рынок Китая"},
  "inscreen-chart": {quad: SCREEN, plane: "front", curve: "arc", items: "Завязка / Развитие / Кульминация / Развязка"},
  "inscreen-cards": {quad: SCREEN, plane: "front", image2: IMG[5 % IMG.length], image3: IMG[6 % IMG.length], image4: IMG[7 % IMG.length]},
  "inscreen-list": {quad: SCREEN, plane: "front", items: "Заводы / Встречи / Дегустации"},
  "inscreen-steps": {quad: SCREEN, plane: "front", items: "Выбрал|программу / Прилетел|в Китай / Встречи|на заводах"},
  "inscreen-icon": {quad: SCREEN, plane: "front", image: "", emoji: "огонь", text: "+ 7 фабрик"},
  "inscreen-media": {quad: SCREEN, plane: "front"},
  "title-box": {text: "Чай и кофе Китая: / как открыть сеть"},
  // приёмы prompt-motion.com и skillry.dev
  mark: {kind: "circle", y: "1300", w: "520"},
  "title-takeover": {text: "Чай", sub: "рынок Китая", bg: "#1A73E8"},
  "title-strike": {text: "Дорого", script: "выгодно"},
  "title-echo": {text: "Кофе"},
  "bg-replace": {kind: "grid", outline: "1", image: ""},
  ask: {text: "А вы пьёте чай или кофе?", sub: "пишите в комментариях", emoji: "вау"},
  search: {text: "чай и кофе в Китае", items: "кофейни Китая / чайные бренды / рынок чая"},
  stamp: {text: "Факт", color: "#1FA35B"},
  dots: {value: "7", total: "10", label: "пример подписи"},
  chapter: {title: "Чай", bar: "1"},
  vote: {title: "Что выбираете?", items: "Чай / Кофе / Оба / Воду", image: ""},
  drum: {prefix: "Китай — это", items: "чай / кофе / заводы / будущее"},
  ring: {items: "Чай / Кофе / Китай / Рынок"},
  // приёмы референса 28.10.2026 «монтаж через Claude»
  "widgets-glass": {stat: "5 | дней в Китае", progress: "Монтаж | 97", profile: "Global Tech Tour | globaltechtour.ru", ring: "4K | рендер", badge: "7 | фабрик", caption: "Смонтировано в **Монтажной**"},
  docu: {title: "Чай **и кофе** / Китая", kicker: "Рынок Китая · изнутри", name: "Остап Доценко", handle: "ostap.dotsenko"},
  "orbit-cards": {image2: IMG[1 % IMG.length], image3: IMG[2 % IMG.length], image4: IMG[5 % IMG.length], image5: IMG[6 % IMG.length]},
  "chart-split": {},
  "neon-sign": {text: "Китай"},
  "timeline-editor": {},
  "prompt-chat": {text: "/наезд на слове чай", reply: "Монтирую: наезд на слове «чай»"},
  "outro-grid": {title: "Напиши «чай»", pill: "и получи программу поездки", frames: "12"},
  watermark: {handle: "ostap.dotsenko", network: "instagram"},
  "list-progress": {title: "Монтирую ролик", items: "Нашёл лицо | каждый кадр / Вырезал фон | маска / Текст за спиной | глубина / Цвет | тёплый / Рендер 4K | 2160p"},
};
const LEN = {"widgets-glass": 2.4, docu: 2.4, "orbit-cards": 2.4, "chart-split": 2.4, "neon-sign": 2.4, "timeline-editor": 2.4, "prompt-chat": 2.0, "outro-grid": 2.4, watermark: 2.0, "list-progress": 2.4, "counter-word": 3.2, vote: 2.4, drum: 2.4, ring: 2.4, search: 2.4, "title-takeover": 2.4, "inscreen-chart": 2.4, "inscreen-list": 2.4, "inscreen-steps": 2.4, "inscreen-cards": 2.2, "captions-mini": 2.4, "split-ba": 2.4, "captions-plate": 2.4, "captions-corner": 2.4, "captions-quiet": 2.4, "speaker-app": 2.4, "list-flip": 2.4, "list-cards": 2.4, "list-stickers": 2.4, "list-numbers": 2.4, "list-bubbles": 2.4, "list-typewriter": 2.4, checklist: 2.4, "stock-up": 2.4, "stock-down": 2.4, "hook-wall": 2.2, "hook-mix": 2.2, "hook-words": 2.2, chip: 2.2};
const SLOT = 3.6;
const PRE = 0.25; // превью начинается чуть раньше эффекта
const PRE_ID = {"prompt-chat": 0}; // чат раскрывается в самом конце — превью с начала эффекта
const DUR = 2.0;

const r = await esbuild.build({entryPoints: [path.join(MZ, "app", "effects.ts")], bundle: true, write: false, format: "esm", platform: "node"});
const {EFFECTS} = await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"));
const list = EFFECTS.filter((e) => !only || only.includes(e.id));

const props = {
  ...base,
  mediaSrc: SAMPLE,
  cutoutSrc: CUTOUT,
  words,
  focus: {x: layout.eyeX ?? base.focus.x, y: layout.eyeY ?? base.focus.y},
  chips: [], logos: [], numbers: [], broll: [], checklists: [], cities: [], zooms: [], cuts: [],
  stockDrop: undefined, hooks: [], fx: [], arrows: [], emojis: [], speaker: [], panels: [], texts: [], lists: [], paletteAt: [],
  splits: [], titles: [], captionsAt: [], chats: [], floats: [], cards: [], outros: [], inscreens: [],
  marks: [], asks: [], bgs: [], counters: [], searches: [], stamps: [], dots: [], chapters: [], chapterBar: undefined, votes: [], drums: [], rings: [],
  widgets: [], docus: [], orbits: [], charts: [], timelines: [], neons: [], prompts: [], watermark: undefined,
  bumper: false,
  music: undefined,
  site: {...base.site, at: 999},
  ctaSeconds: 0.3,
  captionFixed: false,
};
const slots = [];
let t = 1.0;
let img = 0;
for (const e of list) {
  const item = {id: e.id, effect: e.id, at: +t.toFixed(2), until: +(t + (LEN[e.id] ?? Math.min(e.len, 2.0))).toFixed(2), params: {...(PARAMS[e.id] ?? {})}};
  if (e.fields.some((f) => f.kind === "image" || f.kind === "media") && !("image" in item.params)) item.params.image = IMG[img++ % IMG.length];
  // счётчик слова: самое частое слово образца в окне превью — чтобы счёт успел вырасти
  if (e.id === "counter-word") {
    const n = {};
    for (const w of words.filter((x) => x.start >= t - 1 && x.start < t + DUR)) {
      const k = w.text.toLowerCase().replace(/[^а-яё]/g, "");
      if (k.length > 1) n[k] = (n[k] ?? 0) + 1;
    }
    item.params.word = Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "чай";
    item.at = +(t - 1).toFixed(2);
  }
  e.apply(props, item, {words, image: (n) => n});
  slots.push({id: e.id, at: item.at, cutout: !!e.after, pre: PRE_ID[e.id] ?? PRE});
  t += SLOT;
}
props.speechSeconds = Math.min(base.speechSeconds, +(t + 0.5).toFixed(2));
if (t > base.speechSeconds) console.warn(`! эффектов больше, чем помещается в образец (${t.toFixed(1)} с > ${base.speechSeconds} с)`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "montazh-previews-"));
const propsFile = path.join(tmp, "props.json");
fs.writeFileSync(propsFile, JSON.stringify(props));
const all = path.join(tmp, "_all.mp4");

if (!args.includes("--skip-render")) {
  const ranges = slots.filter((s) => s.cutout).map((s) => `${Math.max(0, s.at - PRE - 0.2).toFixed(2)}-${(s.at + DUR + 0.4).toFixed(2)}`).join(",");
  if (ranges) {
    console.log("▶ вырезка спикера:", ranges);
    execFileSync("python3", ["scripts/matte.py", path.join(ROOT, SAMPLE), "--ranges", ranges], {cwd: RS, stdio: "inherit"});
  }
  const last = Math.round((t - SLOT + DUR + 0.5) * 30);
  console.log("▶ рендер образца с эффектами");
  execFileSync("./node_modules/.bin/remotion", ["render", "src/index.ts", "TalkReelPro", all, `--props=${propsFile}`, "--scale=0.5", "--crf=26", "--muted", `--frames=0-${last}`, "--concurrency=4"], {cwd: RS, stdio: "inherit"});
}

const outDir = path.join(MZ, "library", "previews");
fs.mkdirSync(outDir, {recursive: true});
for (const s of slots) {
  const out = path.join(outDir, `${s.id}.mp4`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0, s.at - s.pre)), "-t", String(DUR), "-i", all, "-an", "-vf", "scale=360:-2", "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
  // WebM рядом: его играет любой Chromium и Safari 15+, mp4 (H.264) — запасной
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", out, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-an", out.replace(/\.mp4$/, ".webm")]);
  console.log(`превью ${s.id}: ${(fs.statSync(out).size / 1024).toFixed(0)} КБ`);
}
fs.copyFileSync(all, path.join(os.tmpdir(), "montazh-showreel.mp4"));
console.log("PREVIEWS_OK", slots.length, "шоурил:", path.join(os.tmpdir(), "montazh-showreel.mp4"));
