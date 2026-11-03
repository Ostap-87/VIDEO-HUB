// Рендер презентации SibDoc: PDF 1920×1080 и PNG каждого слайда (section.slide).
// Запуск: node render.mjs <index.html> <out.pdf> <png-dir>
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) {
  try { pw = require(p); break; } catch (e) {}
}
if (!pw) { console.error('Не найден playwright'); process.exit(1); }
const [html, pdf, pngDir] = process.argv.slice(2);
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
const slides = await page.$$('section.slide');
for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: `${pngDir}/${String(i + 1).padStart(2, '0')}.png` });
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: pdf, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`PNG ${slides.length}, PDF ${pdf}`);
