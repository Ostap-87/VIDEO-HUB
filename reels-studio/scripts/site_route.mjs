// Скриншоты маршрута экспедиции по дням — для финальной сцены TalkReelPro (site.route).
//
//   node scripts/site_route.mjs /expeditions/china-auto-plants-expedition ../source-videos/папка/site/route av
//   → av-day1.png, av-day2.png … (столько дней, сколько на сайте, максимум 7)
//
// Открывает страницу экспедиции в мобильной версии, прокручивает к блоку «Маршрут», ставит автопрокрутку
// на паузу, возвращается к первому дню и снимает каждый день кнопкой «вперёд».
import {createRequire} from "node:module";
import {execSync} from "node:child_process";
import {existsSync, mkdirSync} from "node:fs";

const [path, dir, prefix = "day"] = process.argv.slice(2);
if (!path || !dir) {
  console.error("Использование: node scripts/site_route.mjs /expeditions/<slug> <папка> [префикс]");
  process.exit(1);
}
mkdirSync(dir, {recursive: true});
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require("playwright");
} catch {
  pw = require(execSync("npm root -g").toString().trim() + "/playwright");
}
const CLOUD_BROWSER = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const b = await pw.chromium.launch({
  executablePath: existsSync(CLOUD_BROWSER) ? CLOUD_BROWSER : undefined,
  proxy: process.env.HTTPS_PROXY ? {server: process.env.HTTPS_PROXY} : undefined,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const ctx = await b.newContext({viewport: {width: 430, height: 932}, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: "ru-RU"});
const pg = await ctx.newPage();
await pg.goto("https://globaltechtour.ru" + path, {waitUntil: "networkidle", timeout: 90000});
for (let yy = 0; yy < 3000; yy += 500) {
  await pg.evaluate((v) => window.scrollTo(0, v), yy);
  await pg.waitForTimeout(250);
}
const y = await pg.evaluate(() => {
  const h = [...document.querySelectorAll("h1,h2,h3,h4,div,span")].find((e) => e.childElementCount === 0 && e.textContent.trim() === "Маршрут");
  return h ? h.getBoundingClientRect().top + scrollY - 120 : 0;
});
await pg.evaluate((yy) => window.scrollTo(0, yy), y);
await pg.waitForTimeout(1500);
const pause = pg.getByText("ПАУЗА", {exact: true});
if (await pause.count()) await pause.first().click({force: true}).catch(() => {});
const prev = pg.locator('button[aria-label*="ред"], button[aria-label*="rev"], button[aria-label*="азад"]').first();
const next = pg.locator('button[aria-label*="лед"], button[aria-label*="ext"], button[aria-label*="перёд"], button[aria-label*="перед"]').first();
for (let i = 0; i < 8; i++) {
  if (await prev.count()) await prev.click({force: true}).catch(() => {});
  await pg.waitForTimeout(300);
}
await pg.waitForTimeout(3000);
let last = "";
for (let d = 0; d < 7; d++) {
  const cap = await pg.evaluate(() => [...document.querySelectorAll("*")].map((e) => (e.childElementCount === 0 ? e.textContent.trim() : "")).find((t) => /^ДЕНЬ \d/i.test(t)) || "");
  if (d > 0 && cap && cap === last) break; // маршрут закончился
  last = cap;
  await pg.screenshot({path: `${dir}/${prefix}-day${d + 1}.png`, animations: "allow", timeout: 60000});
  console.log(`${prefix}-day${d + 1}.png  ${cap}`);
  if (!(await next.count())) break;
  await next.click({force: true}).catch(() => {});
  await pg.waitForTimeout(3500);
}
await b.close();
