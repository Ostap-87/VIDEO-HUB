// Скриншот сайта в мобильной версии во всю высоту — для финальной сцены TalkReel.
//
//   node scripts/site_shot.mjs https://globaltechtour.ru ../source-videos/папка/site/site.png
//
// Нужен Playwright (в облачной среде Claude он уже стоит глобально). Ширина 430 px при плотности 2.5
// даёт картинку ~1075 px — как раз под карточку 984 px.
import {createRequire} from "node:module";
import {execSync} from "node:child_process";
import {existsSync} from "node:fs";

const [url, out] = process.argv.slice(2);
if (!url || !out) {
  console.error("Использование: node scripts/site_shot.mjs <url> <файл.png>");
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
const page = await (
  await browser.newContext({viewport: {width: 430, height: 932}, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: "ru-RU"})
).newPage();
await page.goto(url, {waitUntil: "networkidle", timeout: 90000});
// Прокручиваем страницу, чтобы подгрузились ленивые картинки
const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 600) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(250);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1500);
await page.screenshot({path: out, fullPage: true});
console.log(`${await page.title()} → ${out}`);
await browser.close();
