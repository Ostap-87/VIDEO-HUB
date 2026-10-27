// Клипы экрана SibDoc для рекламного ролика (scripts/app_record.mjs). Программа запущена локально:
//   cd <SibDoc> && python3 -m uvicorn app.server:app --port 8000
//   node scripts/app_record.mjs promo/2026-10-27-sibdoc.clips.mjs [--only upload,scan]
// Данные — демо-набор SibDoc (data/demo, все номера и компании вымышленные). Состояние программы (загрузки, сканы,
// прогон) готовится до записи через её API (before), прокрутка к разделу — до записи (setup).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const name = '2026-10-27-sibdoc-promo';
export const base = 'http://localhost:8000';
export const viewport = { w: 1440, h: 900, dsf: 1.5 };
export const timezone = 'Europe/Moscow';
export const storagePrefix = '';
export const seeds = { ru: { lang: 'ru' } };
// служебная плашка прототипа в рекламе не нужна; имя учётной записи прототипа — как у настоящего пользователя
export const css = '#modeChip{display:none!important}';
export const initScript = `(() => {
  const swap = (root) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) if (n.nodeValue.includes('prototype')) n.nodeValue = n.nodeValue.replaceAll('prototype', 'a.petrova'); };
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((x) => swap(x.nodeType === 3 ? x.parentNode || document.body : x))))
    .observe(document, { childList: true, subtree: true });
})();`;

// клон SibDoc рядом с VIDEO-HUB (или путь в SIBDOC_DEMO)
const DEMO = process.env.SIBDOC_DEMO || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..', 'sibdoc', 'data', 'demo');
// имена файлов — латиницей (с иероглифами тестовый Chromium отменяет выбор файла)
const LATIN = path.join(os.tmpdir(), 'sibdoc-demo-latin');
fs.mkdirSync(LATIN, { recursive: true });
for (const f of fs.readdirSync(path.join(DEMO, 'cn_dec_xml'))) {
  fs.copyFileSync(path.join(DEMO, 'cn_dec_xml', f), path.join(LATIN, f.replace('报关单_', 'CN_')));
}
const FILES = {
  wide_table: [path.join(DEMO, 'wide_table_demo.xlsx')],
  purchase: [path.join(DEMO, 'purchase_demo.xlsx')],
  ru_dt: fs.readdirSync(path.join(DEMO, 'ru_dt')).sort().map((f) => path.join(DEMO, 'ru_dt', f)),
  cn_dec: fs.readdirSync(LATIN).filter((f) => f.endsWith('.xml')).sort().map((f) => path.join(LATIN, f)),
  sap_vs_cd: [path.join(DEMO, 'sap_vs_cd_demo.csv')],
};
const SCANS = fs.readdirSync(path.join(DEMO, 'scans')).sort().map((f) => path.join(DEMO, 'scans', f));

const del = (base, p) => fetch(base + p, { method: 'DELETE' });
async function clearAll(base) {
  for (const slot of Object.keys(FILES)) await del(base, '/api/upload/' + slot);
  await del(base, '/api/scans');
}
async function loadAll(base) {
  for (const [slot, files] of Object.entries(FILES)) {
    const fd = new FormData();
    for (const f of files) fd.append('files', new Blob([fs.readFileSync(f)]), path.basename(f));
    const r = await fetch(base + '/api/upload/' + slot, { method: 'POST', body: fd });
    if (!r.ok) throw new Error(`загрузка ${slot}: ${r.status} ${await r.text()}`);
  }
}
// раздел страницы — сразу под шапкой (шапка и меню закреплены сверху, 96 px)
const toSection = (sel, off = 104) => async (page) => {
  await page.evaluate(({ sel, off }) => { const el = document.querySelector(sel); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off); }, { sel, off });
  await page.waitForTimeout(500);
};
const runFirst = async (page) => {
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#c-run').getBoundingClientRect().top + window.scrollY - 104));
  await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/run')), page.click('#runBtn')]);
  await page.waitForTimeout(1200);
};

export const clips = {
  upload: {
    path: '/', seed: ['ru'], settle: 1200,
    before: async ({ base }) => { await clearAll(base); },
    run: async (ui) => {
      await ui.mark('start');
      await ui.wait(700);
      for (const [slot, mark] of [['wide_table', 'wide'], ['purchase', 'purchase'], ['ru_dt', 'ru'], ['cn_dec', 'cn'], ['sap_vs_cd', 'sap']]) {
        await ui.upload('#f_' + slot, FILES[slot]);
        await ui.wait(350);
        await ui.tap(mark, { css: `button[onclick^="uploadFile('${slot}'"]` });
        await ui.waitFor(null, '/api/upload/' + slot);
        await ui.wait(900);
      }
    },
  },
  decl: {
    path: '/', seed: ['ru'], settle: 1000,
    before: async ({ base }) => { await clearAll(base); await loadAll(base); },
    setup: toSection('#c-decl'),
    run: async (ui) => {
      await ui.mark('open');
      await ui.wait(1500);
      await ui.tap('cn', { css: '#dt_cn' });
      await ui.wait(400);
      await ui.mark('card', { focus: { css: '#declBox > .decl' } });
      await ui.wait(1600);
      await ui.tap('search', { css: '#declSearch' });
      await ui.type('DEMU0001033', 70);
      await ui.wait(1200);
    },
  },
  scan: {
    path: '/', seed: ['ru'], settle: 1000,
    before: async ({ base }) => { await clearAll(base); await loadAll(base); },
    setup: toSection('#c-scan'),
    run: async (ui) => {
      await ui.upload('#scanInput', SCANS);
      await ui.wait(300);
      await ui.mark('pick');
      await ui.wait(1000);
      await ui.tap('rec', { exact: 'Распознать' });
      await ui.waitFor('done', '/api/scans/upload');
      await ui.wait(500);
      await ui.mark('fields', { focus: { css: '#scanList > div' } });
      await ui.wait(1800);
      await ui.tap('tosrc', { exact: 'В сверку' });
      await ui.wait(1200);
    },
  },
  rates: {
    path: '/', seed: ['ru'], settle: 1000,
    before: async ({ base }) => { await clearAll(base); await loadAll(base); },
    setup: toSection('#c-rates'),
    run: async (ui) => {
      await ui.mark('open');
      await ui.wait(1200);
      await ui.tap('cbr', { exact: 'Скачать курс ЦБ РФ' });
      await ui.waitFor(null, '/api/rates/refresh', 60000);
      await ui.wait(600);
      // строка CNY/RUB — в середину таблицы курсов
      await ui.page.evaluate(() => {
        const row = [...document.querySelectorAll('#rTbl tr')].find((tr) => tr.textContent.startsWith('CNY/RUB'));
        const wrap = row && row.closest('.tbl-wrap');
        if (wrap) wrap.scrollTo({ top: row.offsetTop - 120, behavior: 'smooth' });
      });
      await ui.wait(900);
      await ui.mark('cny', { focus: { css: '#rTbl tr:has(td:first-child:text-is("CNY/RUB"))' } }).catch(() => ui.mark('cny'));
      await ui.wait(1400);
      await ui.tap('mode', { exact: 'Скачать курс CFETS' });
      await ui.waitFor(null, '/api/rates/refresh', 60000);
      await ui.wait(1500);
    },
  },
  rules: {
    path: '/', seed: ['ru'], settle: 1000,
    setup: toSection('#c-rules'),
    run: async (ui) => {
      await ui.mark('open');
      await ui.wait(900);
      await ui.select('sel', '#ruleSel', 'price.yaml');
      await ui.wait(1200);
      // допуск в процентах: 0 → 0.5 (видно, как меняется значение)
      const ok = await ui.page.evaluate(() => {
        const ta = document.querySelector('#ruleText');
        const m = ta.value.match(/tolerance_pct:\s*([0-9.]+)/);
        if (!m) return false;
        const at = ta.value.indexOf(m[0]) + m[0].length;
        ta.focus(); ta.setSelectionRange(at - m[1].length, at);
        return true;
      });
      const b = await ui.page.locator('#ruleText').boundingBox();
      await ui.mark('edit');
      if (ok) await ui.type('0.5', 120);
      await ui.wait(900);
      await ui.tap('save', { css: 'button[onclick="saveRule()"]' });
      await ui.wait(1300);
      await ui.mark('hist', { focus: { css: '#ruleHist' } });
      await ui.wait(1500);
    },
  },
  run: {
    path: '/', seed: ['ru'], settle: 1000,
    before: async ({ base }) => { await clearAll(base); await loadAll(base); },
    setup: toSection('#c-run'),
    run: async (ui) => {
      await ui.mark('open');
      await ui.wait(1200);
      await ui.mark('btn', { focus: { css: '#runBtn' } });
      await ui.tap('run', { css: '#runBtn' });
      await ui.waitFor(null, '/api/run');
      await ui.wait(700);
      await ui.scroll('sum', { toText: '#sumCard', to: 110, ms: 900 });
      await ui.wait(1500);
    },
  },
  results: {
    path: '/', seed: ['ru'], settle: 800,
    before: async ({ base }) => { await clearAll(base); await loadAll(base); },
    setup: async (page) => { await runFirst(page); await toSection('#sumCard')(page); },
    run: async (ui) => {
      await ui.mark('sum');
      await ui.wait(1500);
      await ui.scroll('down', { toText: '#resCard', to: 110, ms: 900 });
      await ui.wait(500);
      await ui.tap('price', { css: '#tabs > *', nth: 1 });
      await ui.wait(900);
      await ui.select('filter', '#stFilter', 'ISSUE');
      await ui.wait(700);
      await ui.mark('issue');
      await ui.mark('row', { focus: { css: '#resTbl tr:has(.st-ISSUE)' } }).catch(() => {});
      await ui.wait(2000);
    },
  },
  reports: {
    path: '/', seed: ['ru'], settle: 800,
    before: async ({ base }) => { await clearAll(base); await loadAll(base); },
    setup: runFirst,
    run: async (ui) => {
      await ui.wait(1000);
      await ui.tap('excel', { css: '#dlExcel' });
      await ui.wait(1500);
      await ui.tap('pdf', { css: '#dlPdf' });
      await ui.wait(1500);
    },
  },
  journal: {
    path: '/', seed: ['ru'], settle: 1000,
    // журнал с чистого листа: обычный рабочий цикл — загрузки, сканы, прогон и отчёты
    before: async ({ base }) => {
      await clearAll(base);
      const jf = path.resolve(DEMO, '../../storage/journal.jsonl');
      if (fs.existsSync(jf)) fs.writeFileSync(jf, '');
      await loadAll(base);
      const fd = new FormData();
      for (const f of SCANS) fd.append('files', new Blob([fs.readFileSync(f)]), path.basename(f));
      await fetch(base + '/api/scans/upload', { method: 'POST', body: fd });
      await fetch(base + '/api/scans/to-source', { method: 'POST' });
      await fetch(base + '/api/run', { method: 'POST' });
    },
    setup: toSection('#c-journal'),
    run: async (ui) => {
      await ui.mark('open');
      await ui.wait(1500);
      await ui.mark('cal', { focus: { css: '#cal' } });
      await ui.tap('day', { css: '#cal .d:has(.cnt)', nth: 0 });
      await ui.wait(1800);
    },
  },
  conn: {
    path: '/', seed: ['ru'], settle: 1000,
    setup: toSection('#c-conn'),
    run: async (ui) => {
      await ui.mark('open');
      await ui.wait(1200);
      await ui.scroll('down', { dy: 520, ms: 4200, page: true });
      await ui.wait(800);
    },
  },
  lang: {
    path: '/', seed: ['ru'], settle: 1200,
    before: async ({ base }) => { await clearAll(base); await loadAll(base); },
    run: async (ui) => {
      await ui.mark('open');
      await ui.wait(1300);
      await ui.tap('en', { exact: 'EN' });
      await ui.wait(1500);
      await ui.tap('zh', { exact: '中文' });
      await ui.wait(1800);
    },
  },
};
