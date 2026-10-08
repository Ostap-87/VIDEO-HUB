// Рендер HTML-презентации в PDF (1440×810 pt) и PNG каждого слайда (1920×1080).
// Запуск: node render.mjs <deck.html> <out.pdf> <png-dir>
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) {
  try { pw = require(p); break; } catch (e) {}
}
if (!pw) { console.error('Не найден playwright (npm i -g playwright)'); process.exit(1); }
const [html, pdf, pngDir] = process.argv.slice(2);
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + html, { waitUntil: 'load' });
await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
await page.waitForTimeout(300);
if (pngDir) {
  const slides = await page.$$('section.slide');
  for (let i = 0; i < slides.length; i++) {
    await slides[i].screenshot({ path: `${pngDir}/${String(i + 1).padStart(2, '0')}.png` });
  }
  console.log(`PNG: ${slides.length}`);
}
if (pdf) {
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: pdf, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  console.log('PDF: ' + pdf);
}
await browser.close();
