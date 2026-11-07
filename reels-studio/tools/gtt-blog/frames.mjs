// Стиль-кадры рубрики «Брифинг GTT · 简报» — ролики по статьям блога globaltechtour.ru/blog (07.11.2026, концепция на согласовании).
// Пять визуальных вариантов на одной статье (BOE, boe-display-supply-chain), у каждого: обложка + 4 кадра 1080×1920
// (хук, цифра, сравнение, финал с CTA). Всё в дизайн-коде текущей страницы GTT (тёмно-синие афиши, маршрут, пропуск, кристалл,
// #2563EB / #7DD3FC / тёмно-синий, Unbounded + Inter + JetBrains Mono); манхуа — дозированно, у каждого варианта своя мера.
// Лёгкий способ: HTML + Playwright, без Remotion.
//   node reels-studio/tools/gtt-blog/frames.mjs            — все кадры, листы вариантов, общий лист и макет сетки профиля
//   node reels-studio/tools/gtt-blog/frames.mjs v2 v4      — только эти варианты (листы — из того, что уже лежит в кадры/)
//   GUIDE=1 node …                                          — кадры с разметкой безопасной зоны Reels (кадры-разметка/, для проверки)
// Тексты и цифры — только из статьи (абзацы — reels-studio/scenarios/gtt-blog/2026-11-07-boe-display-supply-chain.md).
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const { chromium } = createRequire(path.join(ROOT, 'reels-studio/package.json'))('playwright');
const U = (p) => 'file://' + (p.startsWith('/') ? p : path.join(ROOT, p));
const OUT = path.join(ROOT, 'finished-videos/обложки/gtt-blog'), SRC = 'finished-videos/обложки/gtt-blog/исходники/';
const GUIDE = !!process.env.GUIDE, FR = path.join(OUT, GUIDE ? 'кадры-разметка' : 'кадры');
const S = (f) => U(SRC + f);
const FONTS = `
@font-face{font-family:Unb;font-weight:200 900;src:url('${U('презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/Unbounded-variable.ttf')}')}
@font-face{font-family:Mono;font-weight:100 800;src:url('${U('презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/JetBrainsMono-variable.ttf')}')}
@font-face{font-family:In;font-weight:100 900;src:url('${U('презентации/шаблон/fonts/Inter-normal-cyrillic.woff2')}');unicode-range:U+0400-045F,U+2116}
@font-face{font-family:In;font-weight:100 900;src:url('${U('презентации/шаблон/fonts/Inter-normal-latin.woff2')}');unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF,U+2248,U+2264-2265}
@font-face{font-family:Pf;font-style:italic;src:url('${U('reels-studio/tools/gtt-crystal/fonts/playfair-italic-cyr.woff2')}');unicode-range:U+0400-045F}
@font-face{font-family:Pf;font-style:italic;src:url('${U('reels-studio/tools/gtt-crystal/fonts/playfair-italic-lat.woff2')}');unicode-range:U+0000-00FF,U+2000-206F}`;
const BASE = `*{box-sizing:border-box;margin:0;padding:0}html,body{width:1080px;height:1920px;overflow:hidden}
.f{position:absolute;inset:0;overflow:hidden;font-family:In,sans-serif}
.sc{font-family:'Noto Sans SC';font-weight:900}.ab{position:absolute}
.mono{font-family:Mono;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.unb{font-family:Unb;font-weight:700}.pf{font-family:Pf;font-style:italic;font-weight:400}`;
const NAVY = '#06132f', DEEP = '#040816', BLUE = '#2563EB', SKY = '#7DD3FC', ICE = '#cfe2ff', BL2 = '#4f9bff';
const hl = (s, c = SKY) => s.replace(/\*\*(.+?)\*\*/g, `<span style="color:${c}">$1</span>`);

// ——— манхуа-детали (общие функции, у каждого варианта своя доза) ———
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// линии концентрации: тонкие клинья от края к центру (r0 — где кончаются у центра)
const speed = ({ cx = 540, cy = 960, r0 = 300, r1 = 1500, n = 90, color = BLUE, op = 0.5, w = 9, s = 7 } = {}) => {
  seed = s; let p = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.05, rr = r0 + rnd() * 140, ww = (0.4 + rnd()) * w / 600;
    const x1 = cx + Math.cos(a - ww) * r1, y1 = cy + Math.sin(a - ww) * r1, x2 = cx + Math.cos(a + ww) * r1, y2 = cy + Math.sin(a + ww) * r1;
    p += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}Z"/>`;
  }
  return `<svg class="ab" style="inset:0" width="1080" height="1920"><g fill="${color}" opacity="${op}">${p}</g></svg>`;
};
// линии движения (параллельные штрихи за предметом)
const streaks = ({ x, y, w = 360, h = 120, n = 9, color = SKY, op = 0.7, ang = 0, s = 3 } = {}) => {
  seed = s; let p = '';
  for (let i = 0; i < n; i++) { const yy = (i + 0.5) / n * h, l = w * (0.35 + rnd() * 0.65), t = 2 + rnd() * 5; p += `<rect x="${w - l}" y="${yy}" width="${l}" height="${t}" rx="${t / 2}"/>`; }
  return `<svg class="ab" style="left:${x}px;top:${y}px;rotate:${ang}deg;overflow:visible" width="${w}" height="${h}"><g fill="${color}" opacity="${op}">${p}</g></svg>`;
};
// взрыв-наклейка (рваная звезда)
const burst = ({ x, y, r = 200, n = 16, fill = BLUE, stroke = '#fff', sw = 8, rot = 0, inner = 0.74, s = 5, html = '' } = {}) => {
  seed = s; let d = '';
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r * (inner + rnd() * 0.08) : r * (0.94 + rnd() * 0.06); d += (i ? 'L' : 'M') + (r + Math.cos(a) * rr).toFixed(1) + ' ' + (r + Math.sin(a) * rr).toFixed(1); }
  return `<div class="ab" style="left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;rotate:${rot}deg"><svg width="${2 * r}" height="${2 * r}" style="position:absolute;inset:0;overflow:visible"><path d="${d}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/></svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center">${html}</div></div>`;
};
// облачко реплики: овал/скругление + хвост к точке (tx, ty)
const bubble = ({ x, y, w, h, tx, ty, fill = '#fff', stroke = NAVY, sw = 6, r = null, html = '', style = '' } = {}) => {
  const rr = r ?? h / 2, cx = x + w / 2, cy = y + h / 2, ang = Math.atan2(ty - cy, tx - cx), bx = cx + Math.cos(ang) * (w / 2 - 30), by = cy + Math.sin(ang) * (h / 2 - 22);
  const px = -Math.sin(ang) * 30, py = Math.cos(ang) * 30;
  return `<svg class="ab" style="inset:0;overflow:visible" width="1080" height="1920"><path d="M${bx + px} ${by + py} L${tx} ${ty} L${bx - px} ${by - py}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/></svg>
  <div class="ab" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${rr}px;background:${fill};border:${sw}px solid ${stroke};display:flex;align-items:center;justify-content:center;text-align:center;${style}">${html}</div>
  <svg class="ab" style="inset:0;overflow:visible" width="1080" height="1920"><path d="M${bx + px * 0.8} ${by + py * 0.8} L${tx + Math.cos(ang) * -10} ${ty + Math.sin(ang) * -10} L${bx - px * 0.8} ${by - py * 0.8}Z" fill="${fill}"/></svg>`;
};
// иероглиф-звук контуром (не кисть, как у 多 NEWS) + пиньинь моно
const sfx = ({ x, y, ch, py, size = 190, color = SKY, rot = -8, fill = 'transparent', sw = 7 } = {}) =>
  `<div class="ab" style="left:${x}px;top:${y}px;rotate:${rot}deg;text-align:center"><div class="sc" style="font-size:${size}px;line-height:1;color:${fill};-webkit-text-stroke:${sw}px ${color};paint-order:stroke">${ch}</div><div class="mono" style="font-size:28px;color:${color};margin-top:6px;letter-spacing:.2em">${py}</div></div>`;
// растр (точки) — только тень/заливка, не фон кадра
const dots = (color, size = 16, op = 0.45) => `background-image:radial-gradient(${color} ${size * 0.22}px,transparent ${size * 0.26}px);background-size:${size}px ${size}px;opacity:${op}`;
const logoCard = (f, { w = 300, h = 150, pad = 14, bg = '#fff', r = 22, shadow = '0 18px 40px #0008', extra = '' } = {}) =>
  `<div style="width:${w}px;height:${h}px;background:${bg};border-radius:${r}px;display:flex;align-items:center;justify-content:center;padding:${pad}px;box-shadow:${shadow};${extra}"><img src="${S(f)}" style="max-width:100%;max-height:100%;object-fit:contain"></div>`;
const textCard = (t, { w = 300, h = 150, bg = '#fff', r = 22, color = '#0b2a6b', size = 44, shadow = '0 18px 40px #0008', extra = '' } = {}) =>
  `<div style="width:${w}px;height:${h}px;background:${bg};border-radius:${r}px;display:flex;align-items:center;justify-content:center;box-shadow:${shadow};font:800 ${size}px In;color:${color};letter-spacing:.01em;${extra}">${t}</div>`;
const CRYSTAL = (size, extra = '') => `<div class="ab" style="width:${size}px;height:${size}px;background:url('${U('finished-videos/обложки/gtt-бренд/instagram/gtt-аватар-1080.jpg')}') center/cover;mix-blend-mode:screen;-webkit-mask:radial-gradient(circle,#000 58%,transparent 71%);${extra}"></div>`;
const PLANE = (s, c = '#fff') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="${c}"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>`;
const BGPHOTO = (f, b = 22, br = 0.5) => `<div class="ab" style="inset:-60px;background:url('${S(f)}') center/cover;filter:blur(${b}px) saturate(.9) brightness(${br})"></div><div class="ab" style="inset:0;background:linear-gradient(180deg,${NAVY}d0 0%,${NAVY}50 30%,${NAVY}60 60%,${NAVY}f0 88%)"></div>`;
const GTT_TOP = (y = 290, c = ICE) => `<div class="ab mono" style="left:0;right:0;top:${y}px;text-align:center;color:${c};font-size:26px;letter-spacing:.38em;font-weight:700">GLOBAL TECH TOUR</div>`;
const pill = (t, { bg = SKY, c = NAVY, size = 26, extra = '' } = {}) => `<span class="mono" style="display:inline-block;font-size:${size}px;font-weight:800;padding:12px 26px;border-radius:40px;background:${bg};color:${c};${extra}">${t}</span>`;

// ——— контент статьи (дословно / по абзацам статьи, источник — сценарий) ———
const A = {
  slug: 'boe-display-supply-chain', blog: 'globaltechtour.ru/blog', tour: '«Бытовая техника и умный дом Китая»',
  quote: 'Покупатель почти никогда не видит имя BOE на коробке',
};

// ——— варианты ———
const V = [];
// 1 · АФИША: тёмно-синяя студия, предмет со свечением, курсив Playfair (как обложки-афиши программ). Манхуа ≈10 %:
// только линии концентрации под главной цифрой и одна «вспышка» удара.
V.push({ id: 'v1', n: 1, name: 'Афиша', dose: 'манхуа ≈10 %', desc: 'Как обложки-афиши программ: тёмно-синяя студия, предмет со свечением, курсив. Манхуа — только линии концентрации под цифрой.',
  css: `.f{background:radial-gradient(120% 70% at 50% 62%,#0d2a6e 0%,${NAVY} 45%,${DEEP} 100%)}
  .q{position:absolute;left:40px;right:40px;text-align:center;font-family:Pf;font-style:italic;font-size:68px;line-height:1.1;white-space:nowrap;color:#fff;text-shadow:0 4px 30px #000}
  .plate{position:absolute;left:64px;right:64px;border-radius:40px;background:linear-gradient(180deg,#0b1d48e8,#06132ff2);border:2px solid #2d4f9a;padding:40px 44px;text-align:center;box-shadow:0 30px 80px #000a}
  .T{font-family:Unb;font-weight:700;text-transform:uppercase;color:#fff;font-size:64px;line-height:1.05;margin-top:22px}
  .sub{font:600 36px/1.3 In;color:${ICE};margin-top:16px}`,
  cover: () => `<div class="ab" style="left:0;right:0;top:150px;bottom:-150px;background:url('${S('hf-boe-panel.jpg')}') center 62%/cover"></div>
    <div class="ab" style="inset:0;background:linear-gradient(180deg,${DEEP}f0 0%,${DEEP}60 26%,transparent 44%,transparent 64%,${DEEP}c0 78%)"></div>
    ${GTT_TOP(300)}<div class="q" style="top:360px">«Экран почти в каждом<br>четвёртом устройстве —<br><span style="color:${SKY}">от одной компании»</span></div>
    <div class="plate" style="top:1250px">${pill('Брифинг GTT · 简报')}<div class="T">BOE 京东方</div><div class="sub">≈25% мирового рынка дисплеев</div></div>`,
  hook: () => `<div class="ab" style="left:0;right:0;top:150px;bottom:-150px;background:url('${S('hf-boe-panel.jpg')}') center 62%/cover"></div>
    <div class="ab" style="inset:0;background:linear-gradient(180deg,${DEEP}f0 0%,${DEEP}50 26%,transparent 44%,transparent 64%,${DEEP}c0 78%)"></div>
    ${GTT_TOP(300)}<div class="q" style="top:350px">Почти в каждом<br>четвёртом устройстве<br>мира — <span style="color:${SKY}">экран<br>одной компании</span></div>
    <div class="plate" style="top:1215px">${pill('Брифинг GTT · №1 · техника')}<div class="T" style="font-size:88px">Чей он?</div><div class="sub">Разбор статьи блога за 40 секунд</div></div>`,
  number: () => `${speed({ cx: 540, cy: 860, r0: 330, color: BL2, op: 0.42, n: 110, w: 10 })}
    <div class="ab" style="left:0;right:0;top:300px;display:flex;justify-content:center">${logoCard('logo-boe.png', { w: 300, h: 150 })}</div>
    <div class="ab unb" style="left:0;right:0;top:640px;text-align:center;font-size:250px;line-height:1;color:#fff;text-shadow:0 0 50px #3d8bffcc,0 0 140px #2563EB99">≈25%</div>
    <div class="ab" style="left:90px;right:90px;top:930px;text-align:center;font:700 52px/1.2 In;color:#fff">мирового рынка дисплеев —<br><span style="color:${SKY}">у BOE 京东方</span></div>
    <div class="plate" style="top:1200px;padding:34px 40px"><div class="mono" style="font-size:26px;color:${SKY}">ЖК + OLED · от смартфонов до телевизоров</div>
    <div style="font:700 44px/1.25 In;color:#fff;margin-top:18px">OLED: ~15% мировых поставок<br><span style="color:${ICE};font-weight:500;font-size:36px">4 кв. 2025 · прогноз 2026 — 14–15%</span></div></div>`,
  compare: () => `${GTT_TOP(290)}<div class="q" style="top:345px;font-size:64px">Рынок OLED: баланс сил<br><span style="color:${SKY}">сместился быстрее,<br>чем ожидали</span></div>
    <div class="ab" style="left:64px;right:64px;top:650px;display:flex;flex-direction:column;gap:34px">
      <div style="border-radius:36px;background:#0b1d48cc;border:2px solid #2d4f9a;padding:34px 40px">
        <div class="mono" style="font-size:26px;color:#9fb3da">Несколько лет назад</div>
        <div style="font:800 50px/1.15 In;color:#fff;margin-top:12px">почти полностью<br>корейский сегмент</div>
        <div style="display:flex;gap:22px;margin-top:26px">${logoCard('logo-samsung.svg', { w: 270, h: 110, pad: 18 })}${logoCard('logo-lg-display.png', { w: 270, h: 110, pad: 18 })}</div></div>
      <div style="border-radius:36px;background:linear-gradient(135deg,#1d4fd8,#0b2a6b);border:3px solid ${SKY};padding:34px 40px;box-shadow:0 0 60px #2563EB88">
        <div class="mono" style="font-size:26px;color:${SKY}">1-е полугодие 2025</div>
        <div style="font:800 50px/1.15 In;color:#fff;margin-top:12px">BOE + CSOT + Visionox —<br><span style="color:${SKY}">больше половины</span> выручки</div>
        <div style="font:500 34px/1.3 In;color:${ICE};margin-top:12px">OLED-панелей для смартфонов и IT</div>
        <div style="margin-top:26px;height:34px;border-radius:17px;background:#ffffff26;overflow:hidden"><div style="width:56%;height:100%;background:linear-gradient(90deg,${SKY},#fff);box-shadow:0 0 30px ${SKY}"></div></div>
        <div class="mono" style="font-size:24px;color:${ICE};margin-top:10px">&gt; 50% · 3 китайских производителя</div></div></div>`,
  final: () => `<div class="ab" style="inset:0;background:url('${S('hf-boe-panel.jpg')}') center 70%/cover;opacity:.45;filter:blur(6px)"></div>
    <div class="ab" style="inset:0;background:linear-gradient(180deg,${DEEP} 0%,${DEEP}80 40%,${DEEP}e0 100%)"></div>
    ${CRYSTAL(470, 'left:305px;top:250px')}
    <div class="q" style="top:740px;font-size:64px">«Покупатель почти никогда<br>не видит имя BOE<br>на коробке»</div>
    <div class="ab" style="left:0;right:0;top:1060px;text-align:center"><div style="font:600 38px In;color:${ICE}">Почему — разбираем в блоге</div>
      <div style="display:inline-block;margin-top:26px;padding:30px 54px;border-radius:60px;background:${BLUE};color:#fff;font:800 50px In;box-shadow:0 0 50px #3d8bff,0 0 120px #2563EB88">${A.blog} →</div>
      <div class="mono" style="font-size:24px;color:#9fb3da;margin-top:20px;letter-spacing:.06em;text-transform:none">/${A.slug}</div></div>
    <div class="ab" style="left:90px;right:90px;top:1380px;text-align:center;font:500 32px/1.35 In;color:${ICE}">Такие производства — в программе<br><b style="color:#fff">${A.tour}</b></div>`,
});

// 2 · ДОСЬЕ-ПРОПУСК: размытое фото статьи в тёмно-синем (как обложки «пропуск» и «маршрут»), белая карточка-досье на ленте.
// Манхуа ≈20 %: облачко реплики от карточки, наклейка-взрыв с цифрой, растр в тени карточки.
const CARD = (inner, { x = 150, y = 400, w = 780, h = 880, rot = -3, head = 'Досье · 简报 №1' } = {}) => `
  <div class="ab" style="left:${x + 26}px;top:${y + 34}px;width:${w}px;height:${h}px;border-radius:36px;rotate:${rot}deg;${dots('#7DD3FC', 18, 0.5)}"></div>
  <div class="ab" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:36px;background:#fff;box-shadow:0 40px 90px #000a;rotate:${rot}deg;overflow:hidden">
    <div class="mono" style="height:130px;background:${BLUE};display:flex;align-items:center;justify-content:space-between;padding:0 44px;color:#fff;font-size:30px;font-weight:800">${head}<span style="width:50px;height:16px;border-radius:8px;background:#ffffff88"></span></div>
    ${inner}</div>`;
const GTT_L = `<div class="ab mono" style="left:84px;top:290px;color:${ICE};font-size:24px;letter-spacing:.32em;font-weight:800">GLOBAL TECH TOUR</div>`;
const LANYARD = (x = 530, h = 420) => `<div class="ab" style="left:${x}px;top:0;width:22px;height:${h}px;background:linear-gradient(90deg,${BLUE},${BL2},${BLUE})"></div>`;
V.push({ id: 'v2', n: 2, name: 'Досье-пропуск', dose: 'манхуа ≈20 %', desc: 'Как обложки «пропуск» и «маршрут»: размытое фото статьи, белая карточка-досье на ленте. Манхуа — облачко, наклейка-взрыв, растр в тени.',
  css: `.f{background:${NAVY}}.ttl{position:absolute;left:84px;right:84px;color:#fff;font:800 70px/1.06 Unb;text-wrap:balance}
  .ft{position:absolute;left:84px;right:84px;display:flex;justify-content:space-between;font:700 24px In;letter-spacing:.14em;text-transform:uppercase;color:#9cc4ff}
  .row{display:flex;justify-content:space-between;align-items:baseline;border-top:2px solid #e4e9f3;padding:20px 0;font:600 32px In;color:#3c4f73}.row b{font:800 38px In;color:#0b2a6b}`,
  cover: () => `${BGPHOTO('boe-cover-статья.jpg')}${GTT_L}${LANYARD(700)}
    ${CARD(`<div style="height:300px;display:flex;align-items:center;justify-content:center;padding:30px 90px"><img src="${S('logo-boe.png')}" style="max-width:100%;max-height:200px"></div>
      <div style="padding:0 48px;color:#0b2a6b"><div style="font:800 46px/1.12 In">Поставщик экранов<br>для чужих брендов</div><div class="mono" style="font-size:24px;color:#6b7da3;margin-top:18px">Китай · ЖК и OLED</div>
      <div style="margin-top:34px;height:74px;background:repeating-linear-gradient(90deg,#0b2a6b 0 4px,transparent 4px 9px,#0b2a6b 9px 11px,transparent 11px 17px)"></div></div>`, { x: 200, y: 420, w: 680, h: 820, rot: -4, head: 'Досье · 简报' })}
    ${burst({ x: 860, y: 520, r: 150, n: 14, rot: 8, html: `<div style="font:800 54px/1 Unb;color:#fff">≈25%</div>` })}
    <div class="ttl" style="top:1335px">Невидимый поставщик <span style="color:${BL2}">экранов</span></div>
    <div class="ft" style="top:1600px"><span>Брифинг GTT · техника</span><span>смотри →</span></div>`,
  hook: () => `${BGPHOTO('hf-boe-devices.jpg', 14, 0.75)}${GTT_L}${LANYARD(700, 440)}
    ${CARD(`<div style="height:290px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px"><div class="mono" style="font-size:24px;color:#6b7da3">Производитель экрана</div><div style="width:480px;height:120px;background:#0b2a6b;border-radius:10px;display:flex;align-items:center;justify-content:center;font:800 70px Unb;color:#fff;letter-spacing:.3em">???</div></div>
      <div style="padding:0 48px;color:#0b2a6b"><div class="mono" style="font-size:24px;color:#6b7da3">Где стоят экраны</div><div style="font:800 44px/1.2 In;margin-top:10px">в чужих смартфонах,<br>ноутбуках и телевизорах</div>
      <div class="mono" style="display:inline-block;margin-top:30px;font-size:26px;font-weight:800;color:${BLUE};border:4px solid ${BLUE};border-radius:14px;padding:12px 20px;rotate:-4deg">почти в каждом 4-м устройстве</div></div>`, { x: 190, y: 430, w: 700, h: 760, rot: -4, head: 'Досье · 简报 №1' })}
    ${bubble({ x: 560, y: 300, w: 380, h: 170, tx: 560, ty: 560, sw: 6, html: `<b style="font:800 64px Unb;color:${NAVY}">Кто я?</b>` })}
    <div class="ttl" style="top:1290px;font-size:66px">Почти в каждом 4-м устройстве — <span style="color:${BL2}">экран одной компании</span></div>`,
  number: () => `${BGPHOTO('boe-cover-статья.jpg')}${GTT_L}
    ${CARD(`<div style="padding:34px 48px 0"><div style="display:flex;align-items:center;gap:26px"><img src="${S('logo-boe.png')}" style="height:110px"><div class="mono" style="font-size:24px;color:#6b7da3;line-height:1.5">BOE Technology<br>京东方 · Китай</div></div>
      <div style="margin-top:26px">
      <div class="row"><span>Мировой рынок дисплеев</span><b style="color:${BLUE}">≈25%</b></div>
      <div class="row"><span>OLED-поставки, 4 кв. 2025</span><b>~15%</b></div>
      <div class="row"><span>OLED, прогноз 2026</span><b>14–15%</b></div>
      <div class="row"><span>Цепочка</span><b style="font-size:32px">от стекла до панели</b></div></div></div>`, { x: 110, y: 400, w: 860, h: 820, rot: 2 })}
    ${burst({ x: 770, y: 1230, r: 210, n: 16, rot: -10, html: `<div><div style="font:800 96px/1 Unb;color:#fff">≈25%</div><div class="mono" style="font-size:22px;color:#fff;margin-top:8px">рынка дисплеев</div></div>` })}
    <div class="ttl" style="top:1300px;right:420px;font-size:56px">Крупнейшая доля в мире</div>`,
  compare: () => `${BGPHOTO('boe-cover-статья.jpg')}${GTT_L}
    <div class="ab" style="left:84px;right:84px;top:350px;color:#fff;font:800 58px/1.08 Unb">OLED для смартфонов и IT: <span style="color:${BL2}">перевес сместился</span></div>
    <div class="ab" style="left:60px;top:620px;width:470px;height:660px;border-radius:32px;background:#fff;rotate:-3deg;box-shadow:0 30px 70px #000a;padding:30px;overflow:hidden">
      <div class="mono" style="font-size:22px;color:#6b7da3">Несколько лет назад</div><div style="font:800 40px/1.15 In;color:#0b2a6b;margin-top:12px">Почти полностью корейский</div>
      <div style="display:flex;flex-direction:column;gap:16px;margin-top:26px;align-items:center">${logoCard('logo-samsung.svg', { w: 380, h: 120, shadow: 'none', extra: 'border:2px solid #e4e9f3' })}${logoCard('logo-lg-display.png', { w: 380, h: 120, shadow: 'none', extra: 'border:2px solid #e4e9f3' })}</div></div>
    <div class="ab" style="left:550px;top:660px;width:470px;height:660px;border-radius:32px;background:#fff;rotate:3deg;box-shadow:0 30px 70px #000a;padding:30px;overflow:hidden;border:6px solid ${BLUE}">
      <div class="mono" style="font-size:22px;color:${BLUE}">1-е полугодие 2025</div><div style="font:800 40px/1.15 In;color:#0b2a6b;margin-top:12px">Три китайских производителя</div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:22px;align-items:center">${logoCard('logo-boe.png', { w: 380, h: 104, shadow: 'none', extra: 'border:2px solid #e4e9f3' })}${logoCard('logo-csot.png', { w: 380, h: 90, shadow: 'none', extra: 'border:2px solid #e4e9f3' })}${textCard('Visionox', { w: 380, h: 80, shadow: 'none', size: 38, extra: 'border:2px solid #e4e9f3' })}</div></div>
    ${burst({ x: 820, y: 1330, r: 170, n: 14, rot: 10, html: `<div><div style="font:800 60px/1 Unb;color:#fff">&gt;50%</div><div class="mono" style="font-size:20px;color:#fff;margin-top:6px">выручки</div></div>` })}
    ${bubble({ x: 90, y: 1340, w: 520, h: 150, tx: 260, ty: 1260, sw: 6, r: 75, html: `<b style="font:800 40px/1.15 In;color:${NAVY}">Быстрее,<br>чем ожидалось</b>` })}`,
  final: () => `${BGPHOTO('boe-cover-статья.jpg', 26, 0.4)}${GTT_L}${LANYARD(700, 400)}
    ${CARD(`<div style="padding:40px 48px;color:#0b2a6b"><div class="mono" style="font-size:24px;color:#6b7da3">Почему его не знают</div>
      <div style="font:800 48px/1.18 In;margin-top:16px">«${A.quote}»</div>
      <div style="margin-top:34px;padding:26px 30px;border-radius:24px;background:${BLUE};color:#fff;font:800 40px In;text-align:center">Читать в блоге →</div>
      <div class="mono" style="font-size:24px;color:#6b7da3;margin-top:18px;text-transform:none;letter-spacing:.04em;text-align:center">${A.blog}/${A.slug}</div></div>`, { x: 140, y: 390, w: 800, h: 770, rot: -2, head: 'Досье · 简报 №1' })}
    <div class="ab" style="left:84px;right:84px;top:1250px;font:500 34px/1.35 In;color:${ICE}">Увидеть такие производства вживую —<br>программа <b style="color:#fff">${A.tour}</b></div>
    <div class="ft" style="top:1470px"><span>Следующее досье · Chery</span><span>globaltechtour.ru</span></div>`,
});

// 3 · СТРАНИЦА МАНГИ В СИНЕМ: кадр — разворот из панелей (тёмно-синие поля, белые рамки), фото в синем дуотоне, плашки рассказчика,
// облачка, иероглиф-звук контуром, линии концентрации. Манхуа ≈45 % — но только синий/белый, без жёлтого, красного, кисти и чернил.
const PANEL = (x, y, w, h, inner, { clip = '', border = '#fff', bw = 7, bg = '#0b1d48' } = {}) =>
  `<div class="ab" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${clip ? `clip-path:${clip};` : ''}background:${border}"><div style="position:absolute;inset:${bw}px;${clip ? `clip-path:${clip};` : ''}background:${bg};overflow:hidden">${inner}</div></div>`;
const IMG = (f, pos = 'center', size = 'cover', extra = '') => `<div style="position:absolute;inset:0;background:url('${S(f)}') ${pos}/${size};${extra}"></div>`;
const NARR = (t, x, y, { w = 'auto', size = 30 } = {}) => `<div class="ab mono" style="left:${x}px;top:${y}px;width:${w}${w === 'auto' ? '' : 'px'};background:#fff;color:${NAVY};font-size:${size}px;font-weight:700;letter-spacing:.06em;text-transform:none;padding:14px 20px;border:4px solid ${NAVY};box-shadow:6px 6px 0 ${BLUE}">${t}</div>`;
V.push({ id: 'v3', n: 3, name: 'Страница манги в синем', dose: 'манхуа ≈45 %', desc: 'Разворот из панелей: синий дуотон фото, плашки рассказчика, облачка, иероглиф-звук контуром, линии концентрации. Только синий и белый.',
  css: `.f{background:${NAVY};background-image:radial-gradient(#2563EB33 2px,transparent 2.5px);background-size:26px 26px}
  .hd{position:absolute;left:64px;right:64px;top:262px;display:flex;justify-content:space-between;align-items:center;color:${ICE}}`,
  head: (no) => `<div class="hd"><span class="mono" style="font-size:24px;font-weight:800">Брифинг GTT · 简报</span><span class="mono" style="font-size:24px;font-weight:800;color:${SKY}">${no}</span></div>`,
  cover: function () { return `${this.head('№1 · техника')}
    ${PANEL(64, 320, 952, 560, `${IMG('hf-boe-devices.jpg', 'center 72%')}${speed({ cx: 260, cy: 380, r0: 120, r1: 900, color: '#fff', op: 0.25, n: 70, w: 8 })}`)}
    ${PANEL(64, 900, 470, 520, `${IMG('boe-cover-синий.jpg', '40% center')}`, { clip: 'polygon(0 0,100% 0,88% 100%,0 100%)' })}
    ${PANEL(500, 900, 516, 520, `<div style="position:absolute;inset:0;background:#fff"></div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:40px 30px 40px 90px"><img src="${S('logo-boe.png')}" style="max-width:100%;max-height:200px"></div>`, { clip: 'polygon(12% 0,100% 0,100% 100%,0 100%)', bg: '#fff', border: NAVY })}
    ${sfx({ x: 330, y: 380, ch: '亮', py: 'LIÀNG!', size: 200 })}
    ${bubble({ x: 560, y: 360, w: 400, h: 170, tx: 520, ty: 600, sw: 6, html: `<b style="font:800 50px/1.05 Unb;color:${NAVY}">Чей экран?</b>` })}
    <div class="ab" style="left:64px;right:64px;top:1450px;color:#fff;font:800 66px/1.05 Unb">Невидимый поставщик <span style="color:${SKY}">экранов</span></div>`; },
  hook: function () { return `${this.head('№1 · техника')}
    ${PANEL(64, 320, 952, 470, `${IMG('hf-boe-devices.jpg', 'center 58%', '100% auto')}`)}
    ${NARR('Смартфон. Ноутбук. Телевизор.', 100, 345, { size: 30 })}
    ${PANEL(64, 810, 520, 560, `${IMG('hf-boe-devices.jpg', '21% 57%', '300% auto')}${speed({ cx: 230, cy: 280, r0: 150, r1: 900, color: '#fff', op: 0.3, n: 70, w: 9 })}`, { clip: 'polygon(0 0,100% 0,90% 100%,0 100%)' })}
    ${sfx({ x: 130, y: 860, ch: '亮', py: 'LIÀNG!', size: 170 })}
    ${PANEL(540, 810, 476, 560, `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#1d4fd8,#0b2a6b)"></div>`, { clip: 'polygon(10% 0,100% 0,100% 100%,0 100%)' })}
    ${bubble({ x: 610, y: 880, w: 380, h: 300, tx: 560, ty: 1290, sw: 6, r: 150, html: `<b style="font:800 50px/1.1 Unb;color:${NAVY}">Бренды<br>разные…</b>` })}
    <div class="ab" style="left:64px;right:64px;top:1385px;background:#fff;border:5px solid ${NAVY};box-shadow:10px 10px 0 ${BLUE};padding:22px 30px"><div style="font:800 52px/1.1 Unb;color:${NAVY}">…а поставщик экрана — <span style="color:${BLUE}">часто один</span></div></div>`; },
  number: function () { return `${this.head('1 / 3')}
    ${PANEL(64, 320, 952, 860, `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 46%,#2a63f0,#0b2a6b 70%)"></div><div style="position:absolute;left:-64px;top:-320px">${speed({ cx: 540, cy: 720, r0: 260, r1: 1400, color: '#fff', op: 0.35, n: 120, w: 10 })}</div>
      ${burst({ x: 476, y: 400, r: 300, n: 20, fill: '#fff', stroke: NAVY, sw: 10, s: 11, html: `<div style="font:800 118px/1 Unb;color:${BLUE}">≈25%</div>` })}`)}
    ${sfx({ x: 760, y: 340, ch: '嘭', py: 'PĒNG!', size: 150, rot: 10 })}
    ${NARR('BOE 京东方 — доля мирового рынка дисплеев', 100, 1100, { size: 28 })}
    ${PANEL(64, 1200, 560, 330, `${IMG('boe-cover-синий.jpg', '35% 60%')}`, { clip: 'polygon(0 0,100% 0,94% 100%,0 100%)' })}
    ${PANEL(600, 1200, 416, 330, `<div style="position:absolute;inset:0;background:#fff;padding:26px 26px 26px 50px;display:flex;flex-direction:column;justify-content:center"><div class="mono" style="font-size:22px;color:#6b7da3">OLED · 4 кв. 2025</div><div style="font:800 64px/1 Unb;color:${BLUE};margin-top:8px">~15%</div><div style="font:600 26px/1.25 In;color:${NAVY};margin-top:8px">мировых поставок</div></div>`, { clip: 'polygon(6% 0,100% 0,100% 100%,0 100%)', bg: '#fff', border: NAVY })}`; },
  compare: function () { return `${this.head('2 / 3')}
    ${PANEL(64, 320, 952, 600, `${IMG('boe-cover-синий.jpg', 'center 30%', 'cover', 'opacity:.35')}<div style="position:absolute;left:44px;top:40px"><div class="mono" style="font-size:26px;color:${SKY}">Несколько лет назад</div><div style="font:800 52px/1.1 Unb;color:#fff;margin-top:12px">OLED — почти<br>полностью корейский</div>
      <div style="display:flex;gap:18px;margin-top:30px">${logoCard('logo-samsung.svg', { w: 280, h: 110, pad: 18 })}${logoCard('logo-lg-display.png', { w: 280, h: 110, pad: 18 })}</div></div>`, { clip: 'polygon(0 0,100% 0,100% 82%,0 100%)' })}
    ${PANEL(64, 800, 952, 720, `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#2563EB,#0b2a6b)"></div><div style="position:absolute;left:0;top:-800px">${streaks({ x: 560, y: 1000, w: 420, h: 260, n: 12, color: '#fff', op: 0.35, s: 4 })}</div>
      <div style="position:absolute;left:44px;right:44px;top:200px"><div class="mono" style="font-size:26px;color:${SKY}">1-е полугодие 2025</div><div style="font:800 54px/1.1 Unb;color:#fff;margin-top:12px">BOE + CSOT + Visionox</div>
      <div style="font:700 42px/1.2 In;color:#fff;margin-top:16px">больше половины мировой выручки OLED для смартфонов и IT</div>
      <div style="display:flex;gap:16px;margin-top:28px">${logoCard('logo-boe.png', { w: 260, h: 104, pad: 14 })}${logoCard('logo-csot.png', { w: 220, h: 104, pad: 14 })}${textCard('Visionox', { w: 260, h: 104, size: 38 })}</div></div>`, { clip: 'polygon(0 18%,100% 0,100% 100%,0 100%)' })}
    ${sfx({ x: 760, y: 820, ch: '唰', py: 'SHUĀ!', size: 160, rot: 8, color: '#fff' })}`; },
  final: function () { return `${this.head('3 / 3')}
    ${PANEL(64, 320, 952, 640, `${IMG('hf-boe-panel.jpg', 'center 60%', '120%')}`)}
    ${bubble({ x: 120, y: 975, w: 840, h: 240, tx: 540, ty: 860, sw: 7, r: 125, html: `<b style="font:800 44px/1.2 In;color:${NAVY};padding:0 40px">«${A.quote}»</b>` })}
    ${PANEL(64, 1250, 952, 290, `<div style="position:absolute;inset:0;background:#fff"></div><div style="position:absolute;inset:0;display:flex;align-items:center;gap:26px;padding:0 34px">
      <div style="flex:1"><div class="mono" style="font-size:22px;color:#6b7da3">Почему — в блоге</div><div style="font:800 46px/1.1 Unb;color:${BLUE};margin-top:8px">${A.blog}</div>
      <div style="font:600 29px/1.3 In;color:${NAVY};margin-top:12px">Вживую — программа<br>${A.tour}</div></div>
      <div style="width:150px;height:150px;border-radius:50%;background:${BLUE};display:flex;align-items:center;justify-content:center;color:#fff;font:800 70px In">→</div></div>`, { bg: '#fff', border: NAVY })}`; },
});

// 4 · МАРШРУТ: пунктир маршрута со свечением, номера остановок, самолёт (как обложки «К кому едем · маршрут по компаниям»).
// Ролик — маршрут по статье: 3 остановки = 3 факта. Манхуа ≈15 %: линии движения за самолётом, иероглиф-звук 嗖, облачко на финише.
const ROUTEBG = () => `${BGPHOTO('hf-boe-devices.jpg', 26, 0.55)}<div class="ab" style="inset:0;background-image:radial-gradient(#9cc4ff22 2px,transparent 2.5px);background-size:34px 34px"></div>`;
const RPATH = (d, op = 1) => `<svg class="ab" style="inset:0" width="1080" height="1920"><defs><filter id="g"><feGaussianBlur stdDeviation="7"/></filter></defs><path d="${d}" fill="none" stroke="#3d8bff" stroke-width="16" stroke-linecap="round" opacity="${0.55 * op}" filter="url(#g)"/><path d="${d}" fill="none" stroke="${ICE}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 22" opacity="${op}"/></svg>`;
const STOP = (n, x, y, inner, { w = 420, h = 200, rot = 0, on = true } = {}) => `<div class="ab" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:#fff;border-radius:26px;box-shadow:0 22px 44px #000a;rotate:${rot}deg;${on ? '' : 'opacity:.55;'}"><div style="position:absolute;inset:0;padding:22px 26px;overflow:hidden">${inner}</div>
  <div style="position:absolute;left:-20px;top:-20px;width:58px;height:58px;border-radius:50%;background:${BLUE};color:#fff;font:800 28px In;display:flex;align-items:center;justify-content:center;border:4px solid #fff">${n}</div></div>`;
const PL = (x, y, ang, s = 76) => `<div class="ab" style="left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;rotate:${ang}deg;filter:drop-shadow(0 0 16px #3d8bff)">${PLANE(s)}</div>`;
V.push({ id: 'v4', n: 4, name: 'Маршрут по фактам', dose: 'манхуа ≈15 %', desc: 'Как обложки «К кому едем»: пунктир маршрута, номера, самолёт. Три факта статьи — три остановки. Манхуа — линии движения, иероглиф-звук 嗖, облачко.',
  css: `.f{background:${NAVY}}.ttl{position:absolute;left:84px;right:84px;color:#fff;font:800 66px/1.06 Unb;text-wrap:balance}
  .ft{position:absolute;left:84px;right:84px;display:flex;justify-content:space-between;font:700 24px In;letter-spacing:.14em;text-transform:uppercase;color:#9cc4ff}
  .k{font:800 22px Mono;letter-spacing:.12em;text-transform:uppercase;color:#6b7da3}.v{font:800 40px/1.12 In;color:#0b2a6b;margin-top:8px}`,
  top: (t) => `${GTT_TOP(290)}<div class="ab" style="left:84px;top:340px;display:flex;gap:14px;align-items:center">${pill('Брифинг GTT · 简报', { bg: BLUE, c: '#fff', size: 24 })}<span class="mono" style="font-size:24px;color:${ICE};font-weight:800">${t}</span></div>`,
  cover: function () {
    const d = 'M 230 520 L 540 520 L 850 520 C 1010 520 1010 790 850 790 L 540 790 L 230 790 C 70 790 70 1060 230 1060 L 540 1060';
    const L = [['logo-samsung.svg', 230, 520], ['logo-lg-display.png', 540, 520], ['logo-csot.png', 850, 520], [null, 850, 790], ['logo-boe.png', 540, 790]];
    return `${ROUTEBG()}${GTT_TOP(290)}<div class="ab" style="left:84px;top:336px">${pill('Игроки рынка экранов', { bg: BLUE, c: '#fff', size: 24 })}</div>${RPATH(d)}
    ${L.map(([f, x, y], i) => `<div class="ab" style="left:${x - 140}px;top:${y - 90}px;rotate:${[-2, 1.5, -1, 2, 0][i]}deg">${f ? logoCard(f, { w: 280, h: 180, extra: f === 'logo-boe.png' ? `outline:6px solid ${SKY};box-shadow:0 0 60px #3d8bff` : '' }) : textCard('Visionox', { w: 280, h: 180, size: 44 })}</div>`).join('')}
    <div class="ab" style="left:255px;top:715px;width:150px;height:150px"></div>
    ${streaks({ x: 300, y: 1000, w: 230, h: 110, n: 8, color: ICE, op: 0.7, s: 9 })}${PL(560, 1060, 90, 80)}
    <div class="ttl" style="top:1335px">Чей экран почти в каждом <span style="color:${BL2}">4-м устройстве</span></div>
    <div class="ft" style="top:1600px"><span>Брифинг GTT · техника</span><span>смотри →</span></div>`; },
  hook: function () {
    const d = 'M 150 820 C 400 740 520 900 760 840 S 900 1050 700 1120 S 330 1180 300 1330';
    return `${ROUTEBG()}${this.top('3 остановки')}
    <div class="ttl" style="top:430px;font-size:64px">Почти в каждом 4-м устройстве — <span style="color:${BL2}">экран одной компании.</span> Чьей?</div>${RPATH(d)}
    ${streaks({ x: -10, y: 760, w: 140, h: 110, n: 7, color: ICE, op: 0.8, s: 2 })}${PL(160, 815, 80)}${sfx({ x: 40, y: 870, ch: '嗖', py: 'SŌU', size: 120, rot: -6 })}
    ${STOP(1, 560, 760, `<div class="k">Остановка 1</div><div class="v">Доля рынка</div>`, { w: 380, h: 150, rot: 2 })}
    ${STOP(2, 560, 1040, `<div class="k">Остановка 2</div><div class="v">Гонка OLED</div>`, { w: 380, h: 150, rot: -2, on: false })}
    ${STOP(3, 120, 1280, `<div class="k">Остановка 3</div><div class="v">Почему имя не видно</div>`, { w: 520, h: 150, rot: 1, on: false })}`; },
  number: function () {
    const d = 'M 120 560 C 300 560 330 700 420 760 M 600 1290 C 700 1380 860 1360 960 1480';
    return `${ROUTEBG()}${this.top('Остановка 1 из 3')}${RPATH(d)}
    ${STOP(1, 120, 640, `<div style="display:flex;align-items:center;justify-content:space-between"><div class="k">BOE 京东方 · мир</div><img src="${S('logo-boe.png')}" style="height:80px"></div>
      <div class="unb" style="font-size:210px;line-height:1;color:${BLUE};margin-top:20px">≈25%</div><div style="font:800 46px/1.15 In;color:#0b2a6b;margin-top:14px">мирового рынка дисплеев</div>
      <div style="font:500 32px/1.3 In;color:#3c4f73;margin-top:14px">ЖК и OLED — от смартфонов до телевизоров</div>
      <div style="margin-top:26px;padding-top:22px;border-top:2px solid #e4e9f3;display:flex;gap:30px"><div><div class="k">OLED · 4 кв. 2025</div><div class="v" style="color:${BLUE}">~15% поставок</div></div><div><div class="k">Прогноз 2026</div><div class="v">14–15%</div></div></div>`, { w: 840, h: 680, rot: -1.5 })}
    ${STOP(2, 640, 1400, `<div class="k">Дальше</div><div class="v">Гонка OLED</div>`, { w: 330, h: 140, rot: 2, on: false })}`; },
  compare: function () {
    const d = 'M 280 900 C 420 980 640 980 800 900';
    return `${ROUTEBG()}${this.top('Остановка 2 из 3')}
    <div class="ttl" style="top:430px;font-size:58px">OLED для смартфонов и IT: <span style="color:${BL2}">перевес сместился</span></div>
    ${STOP('А', 64, 660, `<div class="k">Несколько лет назад</div><div class="v">почти полностью корейский</div><div style="display:flex;flex-direction:column;gap:14px;margin-top:20px">${logoCard('logo-samsung.svg', { w: 370, h: 110, pad: 10, shadow: 'none', extra: 'border:2px solid #e4e9f3' })}${logoCard('logo-lg-display.png', { w: 370, h: 110, pad: 10, shadow: 'none', extra: 'border:2px solid #e4e9f3' })}</div>`, { w: 430, h: 500, rot: -2 })}
    ${RPATH(d)}${streaks({ x: 470, y: 1010, w: 180, h: 70, n: 6, color: ICE, op: 0.8, s: 6 })}${PL(560, 1045, 90, 64)}
    ${STOP('Б', 560, 700, `<div class="k" style="color:${BLUE}">1-е полугодие 2025</div><div class="v">BOE + CSOT + Visionox</div><div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">${logoCard('logo-boe.png', { w: 400, h: 104, pad: 8, shadow: 'none', extra: 'border:2px solid #e4e9f3' })}${logoCard('logo-csot.png', { w: 400, h: 94, pad: 8, shadow: 'none', extra: 'border:2px solid #e4e9f3' })}${textCard('Visionox', { w: 400, h: 80, size: 40, shadow: 'none', extra: 'border:2px solid #e4e9f3' })}</div>`, { w: 460, h: 580, rot: 2 })}
    <div class="ab" style="left:84px;right:84px;top:1310px;text-align:center"><div class="unb" style="font-size:140px;line-height:1;color:#fff;text-shadow:0 0 50px #3d8bffcc">&gt;50%</div><div style="font:700 40px/1.25 In;color:${ICE};margin-top:10px">мировой выручки OLED —<br>у трёх китайских производителей</div></div>`; },
  final: function () {
    const d = 'M 150 520 C 300 700 160 820 330 900';
    return `${ROUTEBG()}${this.top('Остановка 3 · финиш')}${RPATH(d)}
    ${STOP(3, 120, 560, `<div class="k">Почему имя не видно</div><div style="font:800 50px/1.18 In;color:#0b2a6b;margin-top:12px">«${A.quote}»</div>`, { w: 840, h: 300, rot: -1 })}
    ${bubble({ x: 560, y: 960, w: 420, h: 150, tx: 700, ty: 880, sw: 6, html: `<b style="font:800 34px/1.15 In;color:${NAVY}">Модель — от стекла<br>до готовой панели</b>` })}
    <div class="ab" style="left:84px;right:84px;top:1160px;text-align:center"><div style="font:600 36px In;color:${ICE}">Разбор целиком — в блоге</div>
      <div style="display:inline-flex;align-items:center;gap:18px;margin-top:24px;padding:28px 46px;border-radius:60px;background:${BLUE};color:#fff;font:800 46px In;box-shadow:0 0 50px #3d8bff">${PLANE(46)} ${A.blog}</div>
      <div style="font:500 32px/1.35 In;color:${ICE};margin-top:30px">Вживую — программа<br><b style="color:#fff">${A.tour}</b></div></div>`; },
});

// 5 · СВЕТЛЫЙ БРИФ: ядро «светлый framed» (#EEEEF2, карточка со скруглением 64, плашка сайта слева сверху, счётчик справа),
// манхуа ≈25 % синей линией: линии концентрации, облачко с синей обводкой, косой срез фото-панели, иероглиф-звук контуром.
const SITE = `<div class="ab" style="left:64px;top:262px;display:flex;align-items:center;gap:14px;background:#ffffffd9;border:2px solid #D5D5DD;border-radius:40px;padding:12px 24px 12px 14px"><svg width="40" height="40" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#fff"/><path d="M16 6L26.5 26H5.5L16 6Z" fill="${BLUE}"/></svg><span class="mono" style="font-size:24px;color:#17171D;letter-spacing:.06em;text-transform:none;font-weight:700">globaltechtour.ru</span></div>`;
const CNT = (t) => `<div class="ab mono" style="right:64px;top:278px;font-size:26px;color:#6B6B76;font-weight:700">${t}</div>`;
const LCARD = (x, y, w, h, inner, extra = '') => `<div class="ab" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:64px;border:2px solid #D5D5DD;background:#fff;box-shadow:0 30px 60px #17171D1f;overflow:hidden;${extra}">${inner}</div>`;
V.push({ id: 'v5', n: 5, name: 'Светлый бриф', dose: 'манхуа ≈25 %', desc: 'Ядро «светлый framed» первых Reels: #EEEEF2, карточка со скруглением 64, плашка сайта и счётчик. Манхуа синей линией: лучи, облачко, срез панели, звук.',
  css: `.f{background:#EEEEF2;color:#17171D}.kick{position:absolute;left:84px;right:84px;font:600 30px Mono;letter-spacing:.14em;text-transform:uppercase;color:${BLUE}}
  .h{position:absolute;left:84px;right:84px;font:700 84px/1.04 Unb;color:#17171D;text-wrap:balance}.s{position:absolute;left:84px;right:84px;font:400 42px/1.3 In;color:#6B6B76}`,
  cover: () => `${speed({ cx: 540, cy: 760, r0: 420, color: BLUE, op: 0.13, n: 90, w: 8 })}${SITE}
    ${LCARD(110, 360, 860, 820, `<div style="position:absolute;inset:0;background:url('${S('hf-boe-panel.jpg')}') center 58%/cover;clip-path:polygon(0 0,100% 0,100% 84%,0 100%)"></div>`)}
    ${burst({ x: 820, y: 1090, r: 170, n: 16, fill: '#fff', stroke: BLUE, sw: 8, rot: -8, html: `<div style="font:800 66px/1 Unb;color:${BLUE}">≈25%</div>` })}
    <div class="kick" style="top:1230px">Брифинг GTT · 简报 · №1</div><div class="h" style="top:1285px">Невидимый поставщик <span style="color:${BLUE}">экранов</span></div>`,
  hook: () => `${SITE}${CNT('1 / 4')}
    ${LCARD(64, 340, 952, 780, `<div style="position:absolute;inset:0;background:url('${S('hf-boe-devices.jpg')}') center 70%/135%;clip-path:polygon(0 0,58% 0,46% 100%,0 100%)"></div><div style="position:absolute;inset:0;background:url('${S('hf-boe-devices.jpg')}') 23% 64%/380%;clip-path:polygon(61% 0,100% 0,100% 100%,49% 100%)"></div>`)}
    <div class="ab" style="left:64px;top:340px;width:952px;height:780px;pointer-events:none"><svg width="952" height="780"><path d="M552 0 L438 780" stroke="#EEEEF2" stroke-width="22"/></svg></div>
    ${bubble({ x: 620, y: 960, w: 340, h: 170, tx: 760, ty: 860, stroke: BLUE, sw: 6, html: `<b style="font:800 58px Unb;color:${BLUE}">Чей?</b>` })}
    <div class="kick" style="top:1190px">Брифинг GTT · 简报 · №1</div>
    <div class="h" style="top:1245px;font-size:76px">Почти в каждом <span style="color:${BLUE}">4-м</span> устройстве — экран одной компании</div>`,
  number: () => `${speed({ cx: 540, cy: 760, r0: 300, color: BLUE, op: 0.18, n: 110, w: 9 })}${SITE}${CNT('2 / 4')}
    <div class="ab" style="left:0;right:0;top:420px;display:flex;justify-content:center">${logoCard('logo-boe.png', { w: 290, h: 140, shadow: '0 14px 30px #17171D22', extra: 'border:2px solid #D5D5DD' })}</div>
    <div class="ab unb" style="left:0;right:0;top:620px;text-align:center;font-size:230px;line-height:1;color:${BLUE}">≈25%</div>
    ${sfx({ x: 800, y: 395, ch: '嘭', py: 'PĒNG!', size: 120, color: BLUE, rot: 12, sw: 6 })}
    <div class="ab" style="left:84px;right:84px;top:880px;text-align:center;font:700 52px/1.2 In;color:#17171D">мирового рынка дисплеев —<br><span style="color:${BLUE}">у BOE 京东方</span></div>
    ${LCARD(110, 1080, 860, 420, `<div style="position:absolute;left:0;top:0;bottom:0;width:46%;background:url('${S('boe-cover-статья.jpg')}') 38% center/cover;clip-path:polygon(0 0,100% 0,86% 100%,0 100%)"></div>
      <div style="position:absolute;left:46%;right:0;top:0;bottom:0;padding:40px 40px 40px 20px;display:flex;flex-direction:column;justify-content:center"><div class="mono" style="font-size:22px;color:#6B6B76">OLED · 4 кв. 2025</div><div class="unb" style="font-size:72px;color:${BLUE};margin-top:6px">~15%</div><div style="font:600 30px/1.25 In;color:#17171D;margin-top:8px">мировых поставок, прогноз 2026 — 14–15%</div></div>`)}`,
  compare: () => `${SITE}${CNT('3 / 4')}
    <div class="kick" style="top:370px">Рынок OLED · смартфоны и IT</div><div class="h" style="top:425px;font-size:72px">Перевес <span style="color:${BLUE}">сместился</span></div>
    ${LCARD(64, 640, 952, 330, `<div style="padding:34px 44px"><div class="mono" style="font-size:24px;color:#6B6B76">Несколько лет назад</div><div style="font:800 46px/1.15 In;color:#17171D;margin-top:10px">почти полностью корейский</div>
      <div style="display:flex;gap:20px;margin-top:22px">${logoCard('logo-samsung.svg', { w: 300, h: 100, shadow: 'none', extra: 'border:2px solid #E4E4EA' })}${logoCard('logo-lg-display.png', { w: 300, h: 100, shadow: 'none', extra: 'border:2px solid #E4E4EA' })}</div></div>`)}
    <div class="ab" style="left:0;right:0;top:985px;text-align:center;color:${BLUE};font:800 80px/1 In">↓</div>${streaks({ x: 380, y: 980, w: 120, h: 80, n: 6, color: BLUE, op: 0.35, s: 8 })}
    ${LCARD(64, 1080, 952, 450, `<div style="padding:34px 44px"><div class="mono" style="font-size:24px;color:${BLUE}">1-е полугодие 2025</div><div style="font:800 46px/1.15 In;color:#17171D;margin-top:10px">BOE + CSOT + Visionox — <span style="color:${BLUE}">больше половины</span> мировой выручки</div>
      <div style="display:flex;gap:16px;margin-top:22px">${logoCard('logo-boe.png', { w: 270, h: 96, shadow: 'none', extra: 'border:2px solid #E4E4EA' })}${logoCard('logo-csot.png', { w: 240, h: 96, shadow: 'none', extra: 'border:2px solid #E4E4EA' })}${textCard('Visionox', { w: 270, h: 96, size: 36, shadow: 'none', extra: 'border:2px solid #E4E4EA' })}</div>
      <div style="margin-top:24px;height:28px;border-radius:14px;background:#E4E4EA;overflow:hidden"><div style="width:56%;height:100%;background:${BLUE}"></div></div></div>`, `border:4px solid ${BLUE}`)}`,
  final: () => `${SITE}${CNT('4 / 4')}
    ${LCARD(64, 340, 952, 700, `<div style="position:absolute;inset:0;background:url('${S('hf-boe-panel.jpg')}') center 56%/cover"></div><div style="position:absolute;left:0;right:0;bottom:0;height:64%;background:linear-gradient(180deg,transparent,#ffffffa3 40%,#ffffffeb);backdrop-filter:blur(2px)"></div>
      <div style="position:absolute;left:44px;right:44px;bottom:40px"><div class="mono" style="font-size:26px;color:${BLUE}">Почему его не знают</div><div style="font:700 50px/1.18 Unb;color:#17171D;margin-top:12px">«${A.quote}»</div></div>`)}
    <div class="kick" style="top:1090px">Разбор целиком</div><div class="h" style="top:1145px;font-size:68px">В блоге <span style="color:${BLUE}">GTT</span></div>
    <div class="s" style="top:1240px;font-size:34px">Вживую — программа<br>${A.tour}</div>
    <div class="ab" style="right:64px;top:1405px;padding:26px 40px;border-radius:24px;background:${BLUE};color:#fff;font:700 40px In;box-shadow:0 18px 40px #2563EB55">Подробности на сайте →</div>`,
});

// ——— рендер ———
const only = process.argv.slice(2); const list = only.length ? V.filter(v => only.includes(v.id)) : V;
const GUIDE_HTML = `<div class="ab" style="inset:0;pointer-events:none;z-index:99"><div class="ab" style="left:0;right:0;top:0;height:250px;background:#ff00ff30;border-bottom:3px dashed #f0f"></div><div class="ab" style="left:0;right:0;bottom:0;height:380px;background:#ff00ff30;border-top:3px dashed #f0f"></div><div class="ab" style="left:0;top:0;bottom:0;width:64px;background:#ff00ff30"></div><div class="ab" style="right:0;top:0;bottom:0;width:64px;background:#ff00ff30"></div><div class="ab" style="left:0;right:0;top:240px;height:1440px;border:3px dashed #0f0"></div></div>`;
const FRAMES = [['cover', 'обложка'], ['hook', '1 · хук 0–3 с'], ['number', '2 · цифра'], ['compare', '3 · сравнение'], ['final', '4 · финал + CTA']];
fs.mkdirSync(FR, { recursive: true });
const tmp = path.join(process.env.TMPDIR || '/tmp', 'gtt-blog-frame.html');
const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
pg.on('pageerror', e => console.log('PAGEERR', e.message));
const shoot = async (html, out, vp = { width: 1080, height: 1920 }) => {
  html = html.replace(/(\d+-[а-яё]+)/g, '<span style="white-space:nowrap">$1</span>');
  await pg.setViewportSize(vp); fs.writeFileSync(tmp, html); await pg.goto('file://' + tmp);
  await pg.evaluate(() => document.fonts.ready); await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(150); await pg.screenshot({ path: out, type: 'jpeg', quality: 90 });
};
const HEAD = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><link rel="stylesheet" href="${U('презентации/шаблон/fonts/fonts-extra.css')}"><style>${FONTS}${BASE}`;
for (const v of list) for (const [k] of FRAMES) {
  const html = `${HEAD}${v.css}</style></head><body><div class="f">${v[k].call(v)}${GUIDE ? GUIDE_HTML : ''}</div></body></html>`;
  await shoot(html, path.join(FR, `${v.id}-${k}.jpg`)); console.log('✓', v.id, k);
}
if (!GUIDE) {
  // листы вариантов: номер и название крупно, описание, обложка + 4 кадра
  const SH = `*{box-sizing:border-box;margin:0}html,body{width:auto;height:auto;overflow:visible}body{background:#0a1530;font-family:In;color:#fff}.c{display:flex;gap:36px;padding:0 50px}.c figure{width:540px}.c img{width:540px;height:960px;border-radius:28px;display:block;box-shadow:0 20px 50px #0008}
    .c figcaption{font:700 30px Mono;letter-spacing:.06em;color:#9cc4ff;margin-top:18px;text-align:center}`;
  for (const v of V) {
    const fr = (k) => U(path.join(FR, `${v.id}-${k}.jpg`));
    if (!FRAMES.every(([k]) => fs.existsSync(path.join(FR, `${v.id}-${k}.jpg`)))) continue;
    await shoot(`${HEAD}${SH}</style></head><body><div style="padding:56px 50px 40px;display:flex;align-items:flex-end;gap:40px"><div class="unb" style="font-size:190px;line-height:.8;color:${BL2}">${v.n}</div>
      <div><div class="unb" style="font-size:84px;line-height:1">${v.name}</div><div class="mono" style="font-size:30px;color:${SKY};margin-top:16px">Брифинг GTT · 简报 · ${v.dose}</div><div style="font:500 32px/1.35 In;color:#cfe2ff;margin-top:12px;max-width:2300px">${v.desc}</div></div></div>
      <div class="c">${FRAMES.map(([k, t]) => `<figure><img src="${fr(k)}"><figcaption>${t}</figcaption></figure>`).join('')}</div></body></html>`,
    path.join(OUT, `вариант-${v.n}-${v.name.replace(/ /g, '-')}.jpg`), { width: 2930, height: 1370 });
    console.log('✓ лист', v.n);
  }
  // общий обзор: строки — варианты
  const rows = V.map(v => `<div style="display:flex;align-items:center;gap:22px;margin-bottom:34px"><div style="width:420px"><div class="unb" style="font-size:110px;line-height:.85;color:${BL2}">${v.n}</div><div class="unb" style="font-size:44px;line-height:1.05;margin-top:12px">${v.name}</div><div class="mono" style="font-size:22px;color:${SKY};margin-top:10px">${v.dose}</div></div>
    ${FRAMES.map(([k]) => `<img src="${U(path.join(FR, `${v.id}-${k}.jpg`))}" style="width:270px;height:480px;border-radius:16px">`).join('')}</div>`).join('');
  await shoot(`${HEAD}*{box-sizing:border-box;margin:0}body{background:#0a1530;font-family:In;color:#fff;padding:50px}html,body{width:auto;height:auto;overflow:visible}</style></head><body><div class="unb" style="font-size:66px">Брифинг GTT · 简报 — 5 вариантов</div>
    <div style="font:500 30px In;color:#cfe2ff;margin:12px 0 26px">Одна статья — «BOE: экран почти в каждом четвёртом устройстве». Столбцы: обложка · хук · цифра · сравнение · финал с CTA</div>
    <div style="display:flex;gap:22px;margin:0 0 14px 442px">${FRAMES.map(([, t]) => `<div class="mono" style="width:270px;font-size:20px;color:#9cc4ff;text-align:center">${t}</div>`).join('')}</div>${rows}</body></html>`,
  path.join(OUT, '_варианты-обзор.jpg'), { width: 1960, height: 2960 });
  console.log('✓ обзор');
  // макет сетки профиля: новые обложки рядом с вышедшими (3:4 — как в сетке, y 240–1680)
  const OLD = 'finished-videos/обложки/';
  const old = [['reels-из-каруселей/tur-china-appliances-reels.jpg', 'афиша/2026-10-29-haier.jpg'], ['reels-из-каруселей/kampus-alibaba-reels.jpg', 'афиша/2026-10-07-ai.jpg'],
    ['вышедшие-reels-формат5/14_30.10_Финтех-гиганты.jpg', 'reels-из-каруселей/tur-china-auto-plants-reels.jpg'], ['afisha', 'reels-из-каруселей/kampus-huawei-reels.jpg'],
    ['reels-из-каруселей/tur-china-global-brands-reels.jpg', 'вышедшие-reels-формат5/12_29.10_Технопарки-Китая.jpg']];
  const cell = (src, mark) => `<div style="position:relative;width:360px;height:480px;overflow:hidden;background:#000"><img src="${src}" style="position:absolute;left:0;top:-80px;width:360px;height:640px">${mark ? `<div style="position:absolute;inset:0;box-shadow:inset 0 0 0 7px ${BLUE}"></div>` : ''}</div>`;
  const afisha = fs.readdirSync(path.join(ROOT, OLD + 'афиша')).filter(f => f.endsWith('.jpg'));
  const grows = V.map((v, i) => { const o = old[i].map(f => f === 'afisha' ? 'афиша/' + afisha[3] : f);
    return `<div style="display:flex;align-items:center;gap:30px"><div style="width:250px;text-align:right"><div class="unb" style="font-size:80px;color:${BL2};line-height:.9">${v.n}</div><div style="font:700 26px/1.2 In;margin-top:8px">${v.name}</div><div class="mono" style="font-size:18px;color:${BLUE};margin-top:8px">новая — в рамке</div></div>
      <div style="display:flex;gap:4px">${cell(U(path.join(FR, `${v.id}-cover.jpg`)), 'новое')}${cell(U(OLD + o[0]))}${cell(U(OLD + o[1]))}</div></div>`; }).join('<div style="height:4px"></div>');
  await shoot(`${HEAD}*{box-sizing:border-box;margin:0}body{background:#fff;font-family:In;color:#17171D;padding:44px}html,body{width:auto;height:auto;overflow:visible}</style></head><body><div class="unb" style="font-size:52px">Сетка профиля GTT: обложка рубрики рядом с вышедшими</div>
    <div style="font:500 26px In;color:#6B6B76;margin:10px 0 30px">Каждая строка — вариант N: слева новая обложка «Брифинга» (3:4, как в профиле), справа — уже вышедшие обложки GTT</div>${grows.replace(/color:#fff;line/g, 'color:#17171D;line')}</body></html>`,
  path.join(OUT, '_сетка-профиля.jpg'), { width: 1460, height: 2770 });
  console.log('✓ сетка');
}
await br.close();
