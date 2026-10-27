// Запись экранов приложения для рекламного ролика: Playwright открывает веб-сборку (телефон 390×844, ретина ×2;
// другой размер — export const viewport = {w, h, dsf} в файле клипов, например компьютер 1440×900 ×1.5),
// выполняет сценарий клипа (нажатия, прокрутка, ввод) и пишет экран через CDP screencast с метками времени каждого действия.
//
//   node scripts/app_record.mjs promo/2026-10-27-gtt-app.clips.mjs --base http://localhost:8790 [--only start,plan]
//
// Клипы и демо-данные — в файле *.clips.mjs (export const clips, seeds, name). Результат —
// source-videos/<name>/clips/<клип>.mp4 (30 к/с, H.264) и <клип>.json: {duration, marks: {имя: {t, x, y, box}}};
// t — секунды от начала клипа, x/y — точка нажатия (доли экрана), box — рамка элемента для наезда (доли экрана).
// Метки сводятся со словами диктора в scripts/promo_build.py: действие на экране совпадает со словом.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright-core'); }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(HERE, '..');
const REPO = path.resolve(STUDIO, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const spec = await import(pathToFileURL(path.resolve(STUDIO, argv[0])).href);
const { w: W, h: H, dsf: DSF } = spec.viewport || { w: 390, h: 844, dsf: 2 };
const base = opt('base', spec.base || 'http://localhost:8790');
const only = opt('only', '') ? opt('only').split(',') : null;
const outDir = path.join(REPO, 'source-videos', spec.name, 'clips');
fs.mkdirSync(outDir, { recursive: true });

// ретина через флаг: при deviceScaleFactor контекста screencast отдаёт кадры в половинном размере
const browser = await pw.chromium.launch({ args: [`--force-device-scale-factor=${DSF}`] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function record(id, clip) {
  // подготовка состояния до записи (например, загрузить демо-данные через API программы)
  if (clip.before) await clip.before({ base });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: 'ru-RU', timezoneId: spec.timezone || 'Asia/Shanghai', acceptDownloads: true });
  const state = Object.assign({}, ...(clip.seed || []).map((k) => spec.seeds[k]));
  await ctx.addInitScript(({ st, prefix }) => {
    if (sessionStorage.getItem('__seeded')) return;
    localStorage.clear();
    for (const [k, v] of Object.entries(st)) localStorage.setItem(prefix + k, typeof v === 'string' ? v : JSON.stringify(v));
    sessionStorage.setItem('__seeded', '1');
  }, { st: state, prefix: spec.storagePrefix ?? 'gtt:v1:' });
  if (spec.initScript) await ctx.addInitScript(spec.initScript);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  ! ошибка страницы', id, e.message.slice(0, 160)));
  await page.goto(base + clip.path, { waitUntil: 'networkidle' });
  if (spec.css) await page.addStyleTag({ content: spec.css });
  if (clip.setup) await clip.setup(page);
  await sleep(clip.settle ?? 2200);

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp, data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  const t0 = Date.now() / 1000;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * DSF, maxHeight: H * DSF, everyNthFrame: 1 });
  // одно заметное изменение страницы — чтобы первый кадр пришёл сразу
  await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01'; document.body.appendChild(d); setTimeout(() => d.remove(), 50); });

  const marks = {};
  const now = () => Date.now() / 1000 - t0;
  // цель: текст (первое видимое совпадение), {exact: 'текст'}, {css}, {role, name}; nth — какое по счёту из видимых
  const loc = (target) => {
    if (typeof target === 'string') return page.getByText(target, { exact: false });
    if (target.exact) return page.getByText(target.exact, { exact: true });
    if (target.css) return page.locator(target.css);
    return page.getByRole(target.role, { name: target.name });
  };
  const boxOf = async (target) => {
    const l = loc(target);
    for (let tries = 0; tries < 40; tries++) {
      const n = Math.min(await l.count(), 12);
      let seen = 0;
      for (let i = 0; i < n; i++) {
        const b = await l.nth(i).boundingBox({ timeout: 400 }).catch(() => null);
        if (b && b.width > 0 && b.height > 0 && b.y + b.height > 0 && b.y < H) {
          if (seen++ === (target.nth || 0)) return b;
        }
      }
      await sleep(150);
    }
    throw new Error(`${id}: не найден «${JSON.stringify(target)}»`);
  };
  const norm = (b) => ({ x: b.x / W, y: b.y / H, w: b.width / W, h: b.height / H });
  const ui = {
    page,
    wait: (ms) => sleep(ms),
    mark: async (name, extra = {}) => {
      const m = { t: now() };
      if (extra.focus) m.box = norm(await boxOf(extra.focus));
      marks[name] = m;
    },
    tap: async (name, target, { hold = 0, dx = 0.5, dy = 0.5 } = {}) => {
      const b = await boxOf(target);
      const x = b.x + b.width * dx, y = b.y + b.height * dy;
      await page.mouse.move(x, y);
      marks[name] = { t: now(), x: x / W, y: y / H, box: norm(b), ...(hold ? { hold: hold / 1000 } : {}) };
      await page.mouse.down();
      await sleep(hold || 90);
      await page.mouse.up();
    },
    type: async (text, delay = 55) => { await page.keyboard.type(text, { delay }); },
    // выбрать файлы в поле <input type=file> (имена латиницей: с кириллицей и иероглифами тестовый Chromium отменяет выбор)
    upload: async (css, files) => { await page.setInputFiles(css, files); },
    select: async (name, css, value) => {
      const b = await boxOf({ css });
      marks[name] = { t: now(), x: (b.x + b.width / 2) / W, y: (b.y + b.height / 2) / H, box: norm(b) };
      await page.selectOption(css, value);
    },
    // дождаться ответа сервера (например, распознавания или проверки) и поставить метку
    waitFor: async (name, urlPart, timeout = 240000) => {
      await page.waitForResponse((r) => r.url().includes(urlPart), { timeout });
      if (name) marks[name] = { t: now() };
    },
    // плавная прокрутка главного списка экрана на dy точек (или до элемента: его верх встаёт на y = to)
    scroll: async (name, { dy, toText, to = 150, ms = 900, page: whole = false } = {}) => {
      if (name) marks[name] = { t: now(), swipe: true };
      await page.evaluate(async ({ dy, toText, to, ms, page }) => {
        const els = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(d).overflowY) && d.getBoundingClientRect().height > 300);
        // главный список экрана (телефон); page — прокручивается сама страница (сайт, программа на компьютере)
        let el = page ? document.scrollingElement : els.sort((a, b) => b.clientHeight - a.clientHeight)[0] || document.scrollingElement;
        let delta = dy || 0;
        if (toText) {
          const t = toText.startsWith('#') || toText.startsWith('.') ? document.querySelector(toText)
            : [...document.querySelectorAll('div,span')].find((n) => n.childElementCount === 0 && n.textContent.includes(toText) && n.getBoundingClientRect().height > 0);
          if (t) {
            delta = t.getBoundingClientRect().top - to;
            // прокручивается ближайший к цели прокручиваемый блок, а не самый большой на странице
            let a = t.parentElement;
            while (a && !(a.scrollHeight > a.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(a).overflowY))) a = a.parentElement;
            el = a || document.scrollingElement;
          }
        }
        const from = el.scrollTop, target = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, from + delta));
        const t0 = performance.now();
        await new Promise((res) => {
          const step = (n) => {
            const k = Math.min(1, (n - t0) / ms);
            const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
            el.scrollTop = from + (target - from) * e;
            if (k < 1) requestAnimationFrame(step); else res();
          };
          requestAnimationFrame(step);
        });
      }, { dy, toText, to, ms, page: whole });
    },
  };

  try {
    await clip.run(ui);
  } catch (e) {
    console.log('  ! сценарий', id, e.message);
  }
  await sleep(clip.tail ?? 1200);
  const tEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await sleep(150);
  await ctx.close();

  // кадры → постоянные 30 к/с: каждый кадр держится до следующего
  const tmp = fs.mkdtempSync(path.join(outDir, `_${id}-`));
  const list = [];
  frames.sort((a, b) => a.t - b.t);
  if (!frames.length) throw new Error(`${id}: нет кадров`);
  frames.forEach((f, i) => {
    const file = path.join(tmp, `${String(i).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    const from = i === 0 ? t0 : f.t;
    const to = i + 1 < frames.length ? frames[i + 1].t : tEnd;
    list.push(`file '${file}'\nduration ${Math.max(0.001, to - from).toFixed(4)}`);
  });
  list.push(`file '${path.join(tmp, `${String(frames.length - 1).padStart(5, '0')}.jpg`)}'`);
  fs.writeFileSync(path.join(tmp, 'list.txt'), list.join('\n'));
  const mp4 = path.join(outDir, `${id}.mp4`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'),
    '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-movflags', '+faststart', mp4]);
  fs.rmSync(tmp, { recursive: true, force: true });
  const duration = tEnd - t0;
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify({ duration: +duration.toFixed(3), w: W, h: H, marks }, null, 1));
  const fps = frames.length / duration;
  console.log(`${id}: ${duration.toFixed(1)} с, ${frames.length} кадров (${fps.toFixed(0)}/с), метки: ${Object.keys(marks).join(', ')}`);
}

for (const [id, clip] of Object.entries(spec.clips)) {
  if (only && !only.includes(id)) continue;
  await record(id, clip);
}
await browser.close();
