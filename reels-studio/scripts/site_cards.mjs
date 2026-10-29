// Снимки карточек компаний на странице сайта — для телефона в финале ролика (Ping An 29.10.2026: в финале про Ping An
// телефон показывал карточку Huawei, потому что видео прокрутки /corporate-training кончается на Haier).
//
//   node scripts/site_cards.mjs <url> <папка> <Компания> [<Компания> …] [--hide "canvas"]
//
// Для каждой компании ищет на странице самый короткий блок с её названием (подпись карточки), прокручивает так, чтобы
// карточка стояла в верхней трети экрана, и снимает экран телефона 432×768 × 2.5 = 1080×1920 → <папка>/<компания>.png.
// Прокрутку ищет так же, как site_scroll.mjs: окно или самый высокий прокручиваемый блок.
import {createRequire} from "node:module";
import {execSync} from "node:child_process";
import {existsSync, mkdirSync} from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const [url, outDir, ...names] = pos;
if (!url || !outDir || !names.length) {
  console.error("Использование: node scripts/site_cards.mjs <url> <папка> <Компания> [...] [--hide canvas]");
  process.exit(1);
}
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require("playwright");
} catch {
  pw = require(execSync("npm root -g").toString().trim() + "/playwright");
}
const CLOUD_BROWSER = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const browser = await pw.chromium.launch({
  executablePath: existsSync(CLOUD_BROWSER) ? CLOUD_BROWSER : undefined,
  proxy: process.env.HTTPS_PROXY ? {server: process.env.HTTPS_PROXY} : undefined,
});
const page = await (await browser.newContext({viewport: {width: 432, height: 768}, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: "ru-RU"})).newPage();
for (let i = 1; ; i++) {
  const res = await page.goto(url, {waitUntil: "networkidle", timeout: 90000}).catch(() => null);
  const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
  if (res && res.ok() && text.length > 200) break;
  if (i >= 4) {
    console.error(`Страница не загрузилась: ${url}`);
    process.exit(2);
  }
  await page.waitForTimeout(i * 10000);
}
const hide = opt("hide", "");
if (hide) await page.addStyleTag({content: `${hide} { display: none !important; }`});
await page.evaluate(() => {
  const root = document.scrollingElement || document.documentElement;
  let best = root;
  if (root.scrollHeight < innerHeight * 1.5) {
    for (const el of document.querySelectorAll("*")) {
      const st = getComputedStyle(el);
      if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 50 && el.scrollHeight > (best.scrollHeight || 0)) best = el;
    }
  }
  window.__sc = best;
});
// прогреть ленивые картинки
const total = await page.evaluate(() => window.__sc.scrollHeight);
for (let y = 0; y < Math.min(total, 40000); y += 500) {
  await page.evaluate((v) => (window.__sc === document.scrollingElement ? window.scrollTo(0, v) : (window.__sc.scrollTop = v)), y);
  await page.waitForTimeout(120);
}
mkdirSync(outDir, {recursive: true});
for (const name of names) {
  const y = await page.evaluate((nm) => {
    const want = nm.toLowerCase();
    let best = null;
    for (const el of document.querySelectorAll("body *")) {
      const t = (el.innerText || "").trim().toLowerCase();
      if (t === want && el.getBoundingClientRect().height > 0) {
        best = el;
        break;
      }
    }
    if (!best) return null;
    // карточка — ближайший предок с картинкой
    let card = best;
    while (card.parentElement && !card.querySelector("img, svg")) card = card.parentElement;
    const sc = window.__sc;
    const top = card.getBoundingClientRect().top + (sc === document.scrollingElement ? scrollY : sc.scrollTop) - (sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top);
    return Math.max(0, top - 90);
  }, name);
  if (y === null) {
    console.error(`не нашёл карточку «${name}»`);
    continue;
  }
  await page.evaluate((v) => (window.__sc === document.scrollingElement ? window.scrollTo(0, v) : (window.__sc.scrollTop = v)), y);
  await page.waitForTimeout(700);
  const file = `${outDir}/${name.toLowerCase().replace(/\s+/g, "-")}.png`;
  await page.screenshot({path: file});
  console.log(`${name} → ${file}`);
}
await browser.close();
