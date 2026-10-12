// Рендер личного документа ostapdotcenko: PDF A4 и PNG каждой страницы (section.page) в 2,5×.
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
const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2.5 });
await page.goto('file://' + html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
const pages = await page.$$('section.page');
for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${pngDir}/${String(i + 1).padStart(2, '0')}.png` });
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: pdf, width: '210mm', height: '297mm', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`PNG ${pages.length}, PDF ${pdf}`);
