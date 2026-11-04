// Экраны статьи блога ostapdotcenko.ru для выпуска «多 NEWS» (манхуа-новости по статьям, 04.11.2026).
// node reels-studio/tools/blog-news/shots.mjs <slug> [--lang ru|en|zh] [--n 3]
// Снимает https://ostapdotcenko.ru/blog/<slug> с телефона: вьюпорт 390×844, масштаб 2,5 → кадры 975×2110 (как у ролика «Мой сайт»:
// верхние 160 px — шапка сайта, остальные 1950 px — полоса страницы; кадры идут встык через 780 CSS px, поэтому в телефоне
// `Phone mode="strip"` страница листается без шва). Мат на странице (рубрика «Все х#йня, давай по новой…») заменяется знаками
// до съёмки, как во всех роликах. Выход: source-videos/ostapdotcenko/blog-news/<slug>/<lang>-NN.jpg
import {createRequire} from "node:module";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const {chromium} = createRequire(import.meta.url)("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const slug = args[0];
if (!slug) throw new Error("нужен slug статьи");
const opt = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
const lang = opt("lang", "ru");
const n = Number(opt("n", "3"));
const out = path.join(ROOT, "source-videos/ostapdotcenko/blog-news", slug);
fs.mkdirSync(out, {recursive: true});

const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: lang === "zh" ? "zh-CN" : lang === "en" ? "en-US" : "ru-RU"});
await ctx.addInitScript((l) => { try { localStorage.setItem("lang", l); } catch {} }, lang);
const page = await ctx.newPage();
// страница могла не догрузиться (прокси, 04.11.2026: три белых кадра по 12 КБ у «Последнего стартапа») — проверяем, что текст
// статьи на месте, иначе повтор; после 4 попыток — ошибка, а не пустые кадры
for (let i = 0; i < 4; i++) {
  try {
    await page.goto(`https://ostapdotcenko.ru/blog/${slug}`, {waitUntil: "networkidle", timeout: 60000});
    await page.waitForFunction(() => document.body.innerText.length > 1500, null, {timeout: 20000});
    break;
  } catch (e) { if (i === 3) throw new Error(`статья не загрузилась: ${e.message}`); await page.waitForTimeout(3000); }
}
// плавная прокрутка вниз и обратно — чтобы сработали появления блоков и догрузились картинки
const H = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < Math.min(H, 780 * (n + 1)); y += 260) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(160); }
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
// мат — знаками (корни, как в MAT манхуа-роликов)
await page.evaluate(() => {
  const rx = [[/ху([йяеёию])/gi, "х#$1"], [/пизд/gi, "п#зд"], [/бля/gi, "бл#"], [/(^|[^а-яё])(е|ё)б([аи])/gi, "$1#б$3"]];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    let s = t.nodeValue;
    for (const [r, v] of rx) s = s.replace(r, v);
    if (s !== t.nodeValue) t.nodeValue = s;
  }
});
for (let i = 0; i < n; i++) {
  await page.evaluate((v) => window.scrollTo(0, v), i * 780);
  await page.waitForTimeout(700);
  const f = path.join(out, `${lang}-${String(i).padStart(2, "0")}.jpg`);
  await page.screenshot({path: f, type: "jpeg", quality: 90});
  console.log(f);
}
await browser.close();
