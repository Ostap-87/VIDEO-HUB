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

// тексты превью (на образце говорят про чай и кофе Китая)
const PARAMS = {
  "hook-behind": {text: "Китай"},
  "hook-wall": {text: "Чай / и кофе"},
  "hook-mix": {text: "это / важно"},
  "hook-words": {text: "не / через / переводчиков"},
  number: {text: "5 дней", sub: "на фабриках"},
  "number-down": {text: "−30%", sub: "продажи"},
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
};
const LEN = {"list-flip": 2.4, "list-cards": 2.4, "list-stickers": 2.4, "list-numbers": 2.4, "list-bubbles": 2.4, "list-typewriter": 2.4, checklist: 2.4, "stock-up": 2.4, "stock-down": 2.4, "hook-wall": 2.2, "hook-mix": 2.2, "hook-words": 2.2, chip: 2.2};
const SLOT = 3.6;
const PRE = 0.25; // превью начинается чуть раньше эффекта
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
  if (e.fields.some((f) => f.kind === "image" || f.kind === "media")) item.params.image = IMG[img++ % IMG.length];
  e.apply(props, item, {words, image: (n) => n});
  slots.push({id: e.id, at: item.at, cutout: !!e.after});
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
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0, s.at - PRE)), "-t", String(DUR), "-i", all, "-an", "-vf", "scale=360:-2", "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
  // WebM рядом: его играет любой Chromium и Safari 15+, mp4 (H.264) — запасной
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", out, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-an", out.replace(/\.mp4$/, ".webm")]);
  console.log(`превью ${s.id}: ${(fs.statSync(out).size / 1024).toFixed(0)} КБ`);
}
fs.copyFileSync(all, path.join(os.tmpdir(), "montazh-showreel.mp4"));
console.log("PREVIEWS_OK", slots.length, "шоурил:", path.join(os.tmpdir(), "montazh-showreel.mp4"));
