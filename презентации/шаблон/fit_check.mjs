// Проверка «влезает ли текст»: открывает собранный HTML презентации и ищет вылезающие элементы.
// Запуск: node fit_check.mjs <deck.html>  → JSON-массив [{slide, field, why}] в stdout.
// field — путь к полю слайда в JSON (например "facts.2", "why", "items.1"), по нему from_site.py укорачивает текст.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) {
  try { pw = require(p); break; } catch (e) {}
}
if (!pw) { console.error('Не найден playwright'); process.exit(1); }
const [html] = process.argv.slice(2);
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + html, { waitUntil: 'load' });
await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
const issues = await page.evaluate(() => {
  const out = [];
  const BC_MAX = 240;
  const slides = [...document.querySelectorAll('section.slide')];
  slides.forEach((sl, si) => {
    const S = sl.getBoundingClientRect();
    const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - S.left, t: r.top - S.top, r: r.right - S.left, b: r.bottom - S.top, w: r.width, h: r.height }; };
    const add = (field, why) => out.push({ slide: si, field, why });
    const all = (sel) => [...sl.querySelectorAll(sel)];
    const one = (sel) => sl.querySelector(sel);
    // шрифт после подгонки data-fit не должен падать слишком сильно
    const shrunk = (el) => {
      const now = parseFloat(getComputedStyle(el).fontSize);
      const keep = el.style.fontSize; el.style.fontSize = '';
      const orig = parseFloat(getComputedStyle(el).fontSize); el.style.fontSize = keep;
      return now / orig;
    };
    // текст внутри блока (строки ниже нижнего края блока)
    const textBottom = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect().bottom - S.top; };
    const tag = one('.tag');
    const cls = sl.className;
    if (tag && R(tag).r > (cls.includes('s-cover') ? 1180 : 1500)) add('tag', 'tag too wide');
    if (cls.includes('s-cover')) {
      const box = one('.box');
      if (box) {
        const B = R(box);
        const l = one('.box .l'), r = one('.box .r');
        if (l && (R(l).h > B.h - 20 || R(l).r > R(r).l - 20)) add('box_text', 'box text overflow');
        if (r && R(r).h > B.h - 20) add('box_right', 'box right overflow');
      }
      const tr = one('.topright');
      if (tr && (R(tr).l < 1120 || tr.offsetHeight > 80)) add('topright', 'topright too big');
    }
    if (cls.includes('s-company')) {
      const f = all('.fact').map(R);
      const lim = [f[2] ? f[2].t - 6 : 545, f[3] ? f[3].t - 6 : 545, 788, 788];
      f.forEach((r, i) => { if (r.b > lim[i]) add(`facts.${i}`, `fact card bottom ${Math.round(r.b)} > ${lim[i]}`); });
      all('.fact .v').forEach((v, i) => { if (shrunk(v) < 0.62) add(`facts.${i}`, 'fact value shrunk'); });
      const why = one('.why .p'); if (why && R(why).b > 1062) add('why', 'why overflow');
      const learn = one('.learn'); if (learn && R(learn).b > 1060) add('learn', 'learn overflow');
      const cs = one('.csub'); if (cs && R(cs).b > 1000) add('subtitle', 'subtitle overflow');
      const t = one('.title'); if (t && shrunk(t) < 0.62) add('title', 'title shrunk');
      const cn = one('.cname span'); if (cn && shrunk(cn) < 0.6) add('short', 'short name shrunk');
    }
    if (cls.includes('s-days')) {
      all('.dcard').forEach((c, i) => {
        const p = c.querySelector('.p'), h = c.querySelector('.h');
        if (p && textBottom(p) > R(c).b - 18) add(`days.${i}`, 'day text overflow');
        if (h && R(h).w > R(c).w) add(`days.${i}`, 'day title too wide');
        if (h && h.offsetHeight > 140) add(`days.${i}`, 'day title 3+ lines');
      });
      const t = one('.title'); if (t && shrunk(t) < 0.62) add('title', 'title shrunk');
    }
    if (cls.includes('s-layers')) {
      all('.ly').forEach((c, i) => {
        const d = c.querySelector('.d'), n = c.querySelector('.n');
        if (d && textBottom(d) > R(c).b - 8) add(`items.${i}`, 'layer text overflow');
        if (n && R(n).r > R(c).r - 20) add(`items.${i}`, 'layer name too wide');
      });
    }
    if (cls.includes('s-why')) {
      const items = all('.item');
      items.forEach((it, i) => { const p = it.querySelector('.p'); const lim = i === 0 ? R(items[1]).t + 20 : 500; if (p && R(p).b > lim) add(`items.${i}`, 'why item overflow'); });
      all('.box').forEach((b, i) => { const p = b.querySelector('.p'); if (p && R(p).b > R(b).b - 10) add(`items.${i + 2}`, 'why box overflow'); });
    }
    if (cls.includes('s-benefits')) {
      all('.bc').forEach((c, i) => { if (c.offsetHeight > BC_MAX) add(`items.${i}`, `benefit card too tall ${c.offsetHeight}`); });
    }
    if (cls.includes('s-cond')) {
      const f = all('.fact').map(R);
      const lim = [f[2] ? f[2].t - 6 : 640, f[3] ? f[3].t - 6 : 640, 900, 900];
      f.forEach((r, i) => { if (r.b > lim[i]) add(`facts.${i}`, 'cond fact overflow'); });
      all('.fact .v').forEach((v, i) => { if (shrunk(v) < 0.62) add(`facts.${i}`, 'cond value shrunk'); });
      const inc = one('.inc'); if (inc && R(inc).b > 1000) add('includes', 'includes overflow');
      const arr = one('.arr'); if (arr && R(arr).b > 1065) add('footer', 'footer overflow');
    }
    if (cls.includes('s-route')) {
      all('.cc').forEach((c, i) => { if (R(c).b > 965) add(`cities.${i}`, 'route card overflow'); });
      all('.nm span').forEach((c, i) => { if (shrunk(c) < 0.6) add(`cities.${i}`, 'city name shrunk'); });
    }
  });
  return out;
});
console.log(JSON.stringify(issues));
await browser.close();
