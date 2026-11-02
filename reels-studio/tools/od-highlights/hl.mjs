// Хайлайты личного профиля @ostap.dotsenko — 3 набора по 6 обложек (1080×1920) + лист с кружками как в профиле
import { createRequire } from 'module'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = '/home/user/VIDEO-HUB/finished-videos/обложки/ostap-хайлайты';
const ITEMS = [['01', 'Китай', '中'], ['02', 'Роботы', '机'], ['03', 'Дело', '商'], ['04', 'Жизнь', '生'], ['05', 'Экспедиции', '游'], ['06', 'Связь', '多']];
const FONTS = `@font-face{font-family:MSZ;src:url('file:///home/user/VIDEO-HUB/интернет-материалы/шрифты/ma-shan-zheng.woff2') format('woff2')}`;
const dots = (c, a) => `radial-gradient(${c} ${a}px,transparent ${a + 0.6}px)`;
// набор A «Маньхуа»: жёлтый / красный / чернила с растром, иероглиф кистью с обводкой и тенью, лучи
const A = (i, ch) => {
  const bg = ['#FFD92E', '#E8341C', '#191922', '#FFD92E', '#E8341C', '#191922'][i];
  const fg = ['#191922', '#FFD92E', '#FFD92E', '#191922', '#FFD92E', '#FFD92E'][i];
  const dc = i % 3 === 2 ? 'rgba(255,217,46,.22)' : 'rgba(25,25,34,.18)';
  return `<div style="position:absolute;inset:0;background:${bg};background-image:${dots(dc, 4)};background-size:26px 26px"></div>
  <div style="position:absolute;inset:0;background:repeating-conic-gradient(from 0deg at 50% 50%,${i % 3 === 2 ? 'rgba(255,217,46,.08)' : 'rgba(25,25,34,.08)'} 0 3deg,transparent 3deg 12deg)"></div>
  <div style="position:absolute;left:0;right:0;top:960px;transform:translateY(-52%);text-align:center;font:400 560px/1 MSZ;color:${fg};-webkit-text-stroke:10px #191922;text-shadow:16px 16px 0 #191922">${ch}</div>`;
};
// набор B «Ночь и кисть»: чернила, тонкое золотое кольцо, жёлтый иероглиф, маленькая красная печать
const B = (i, ch) => `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#24243a 0,#12121A 62%)"></div>
  <div style="position:absolute;left:50%;top:960px;width:760px;height:760px;margin:-380px 0 0 -380px;border-radius:50%;border:6px solid rgba(255,217,46,.55);box-shadow:0 0 60px rgba(255,217,46,.18)"></div>
  <div style="position:absolute;left:0;right:0;top:960px;transform:translateY(-54%);text-align:center;font:400 470px/1 MSZ;color:#FFD92E">${ch}</div>
  <div style="position:absolute;left:50%;top:1240px;width:96px;height:96px;margin-left:150px;background:#C8102E;color:#fff;font:400 70px/96px MSZ;text-align:center;border-radius:8px;rotate:-6deg">多</div>`;
// набор C «Печать»: костяная бумага, красная квадратная печать с белым иероглифом (как китайская именная печать)
const C = (i, ch) => `<div style="position:absolute;inset:0;background:#EDEAE2;background-image:${dots('rgba(25,25,34,.12)', 3)};background-size:26px 26px"></div>
  <div style="position:absolute;left:50%;top:960px;width:640px;height:640px;margin:-320px 0 0 -320px;background:#C8102E;border-radius:36px;rotate:${[-4, 3, -2, 4, -3, 2][i]}deg;box-shadow:inset 0 0 0 22px #C8102E,inset 0 0 0 30px #EDEAE2;filter:url(#rough)"></div>
  <div style="position:absolute;left:0;right:0;top:960px;transform:translateY(-54%);text-align:center;font:400 470px/1 MSZ;color:#F7F4EC;rotate:${[-4, 3, -2, 4, -3, 2][i]}deg">${ch}</div>`;
const SETS = [['A-маньхуа', A], ['B-ночь-и-кисть', B], ['C-печать', C]];
const svg = `<svg width="0" height="0" style="position:absolute"><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="14"/></filter></svg>`;
const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [name, fn] of SETS) {
  fs.mkdirSync(`${OUT}/${name}`, { recursive: true });
  for (const [i, [n, ru, ch]] of ITEMS.entries()) {
    fs.writeFileSync('/tmp/od-hl-tmp.html', `<!doctype html><meta charset="utf-8"><style>${FONTS}*{margin:0}body{width:1080px;height:1920px;position:relative;overflow:hidden}</style>${svg}${fn(i, ch)}`); await pg.goto('file:///tmp/od-hl-tmp.html');
    await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(150);
    await pg.screenshot({ path: `${OUT}/${name}/${n}_${ru}.jpg`, type: 'jpeg', quality: 92 });
  }
  console.log('✓', name);
}
// лист: три строки кружков, как под шапкой профиля
const row = (name) => ITEMS.map(([n, ru]) => `<div style="text-align:center;width:150px"><div style="width:132px;height:132px;margin:0 auto 10px;border-radius:50%;padding:5px;border:3px solid #d6d6d6"><div style="width:100%;height:100%;border-radius:50%;background:url('file://${OUT}/${name}/${n}_${ru}.jpg') center 50%/180% auto"></div></div><div style="font:500 20px Golos,Inter,sans-serif;color:#222">${ru}</div></div>`).join('');
const titles = { 'A-маньхуа': 'A · «Маньхуа» — растр, кисть, жёлтый · красный · чернила', 'B-ночь-и-кисть': 'B · «Ночь и кисть» — чернила, жёлтый иероглиф, печать 多', 'C-печать': 'C · «Печать» — красная именная печать на бумаге' };
await pg.setViewportSize({ width: 1240, height: 900 });
fs.writeFileSync('/tmp/od-hl-sheet.html', `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;padding:30px 40px;font-family:Golos,Inter,sans-serif}h2{font:800 26px Unbounded,sans-serif;margin:26px 0 16px}</style>\n${SETS.map(([n]) => `<h2>${titles[n]}</h2><div style="display:flex;gap:26px">${row(n)}</div>`).join('')}`); await pg.goto('file:///tmp/od-hl-sheet.html');
await pg.waitForTimeout(500);
await pg.screenshot({ path: `${OUT}/_лист-кружки.jpg`, type: 'jpeg', quality: 88, fullPage: true });
await br.close(); console.log('done');
