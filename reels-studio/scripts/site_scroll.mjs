// Видео прокрутки сайта (или канала Telegram t.me/s/…) в формате Stories — для «экранов» в роликах
// (решение пользователя 14.10.2026: «предварительно сняв видео главных страниц со скролом» и показывать их в ролике).
//
//   node scripts/site_scroll.mjs <url> <out.mp4> [--from <css-селектор или px>] [--seconds 16] [--speed 170]
//        [--hide ".tgme_channel_info_counters"] [--w 432] [--h 768] [--dpr 2.5] [--wait 1500]
//
// Кадр 432×768 CSS px при плотности 2.5 = 1080×1920 (весь экран Stories). Каждый кадр — свой скриншот после прокрутки
// на нужную высоту (не запись экрана): прокрутка ровная, с плавным разгоном и торможением, 30 кадров в секунду.
// --from — откуда начать (селектор блока, например "#about", или пиксели), --hide — что спрятать (счётчик подписчиков и т.п.).
import {createRequire} from "node:module";
import {execSync, spawn} from "node:child_process";
import {existsSync} from "node:fs";

const args = process.argv.slice(2);
const [url, out] = args;
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
if (!url || !out) {
  console.error("Использование: node scripts/site_scroll.mjs <url> <out.mp4> [--from #about] [--seconds 16] [--speed 170]");
  process.exit(1);
}
const W = Number(opt("w", 432)), H = Number(opt("h", 768)), DPR = Number(opt("dpr", 2.5));
const SECONDS = Number(opt("seconds", 16)), SPEED = Number(opt("speed", 170)), FPS = 30;
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
const page = await (await browser.newContext({viewport: {width: W, height: H}, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, locale: "ru-RU"})).newPage();
await page.goto(url, {waitUntil: "networkidle", timeout: 90000});
const hide = opt("hide", "");
if (hide) await page.addStyleTag({content: `${hide} { display: none !important; }`});
// прогреть ленивые картинки и анимации появления: пройти страницу и вернуться
const total = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < Math.min(total, 40000); y += 500) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(120);
}
const from = opt("from", "0");
const startY = /^\d+$/.test(from)
  ? Number(from)
  : await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect().top + window.scrollY : 0;
    }, from);
await page.evaluate((yy) => window.scrollTo(0, yy), startY);
await page.waitForTimeout(Number(opt("wait", 1500)));

const frames = Math.round(SECONDS * FPS);
const maxY = Math.max(startY, total - H);
// путь прокрутки: 0,6 с стоим, разгон 0,8 с, ровно, торможение 0,8 с, в конце стоим
const hold = 0.6, ramp = 0.8, move = Math.max(0.1, SECONDS - 2 * hold);
const dist = Math.min(maxY - startY, SPEED * (move - ramp));
const posAt = (t) => {
  const u = Math.min(Math.max((t - hold) / move, 0), 1);
  const r = ramp / move;
  // сглаженная кривая: ускорение r, ровно, замедление r
  const v = 1 / (1 - r);
  let s;
  if (u < r) s = (v * u * u) / (2 * r);
  else if (u > 1 - r) s = 1 - (v * (1 - u) * (1 - u)) / (2 * r);
  else s = v * (u - r / 2);
  return startY + dist * Math.min(1, Math.max(0, s));
};
const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-vf", `scale=${Math.round(W * DPR / 2) * 2}:${Math.round(H * DPR / 2) * 2},format=yuv420p`, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-movflags", "+faststart", out], {stdio: ["pipe", "inherit", "inherit"]});
for (let i = 0; i < frames; i++) {
  await page.evaluate((yy) => window.scrollTo(0, yy), Math.round(posAt(i / FPS)));
  const buf = await page.screenshot({type: "jpeg", quality: 92});
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log(`${out}: ${frames} кадров, прокрутка ${Math.round(startY)} → ${Math.round(startY + dist)} px (страница ${total} px)`);
