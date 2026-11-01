// Обложки Reels из каруселей GTT: «посадочный талон» (программа тура) и «пропуск» (кампус), 1080×1920 JPG.
//   node reels-studio/tools/nav-covers/render.mjs            — все из covers.json
//   node reels-studio/tools/nav-covers/render.mjs kampus-haier-reels …   — только эти
// Важное — в центральной зоне 3:4 (y 240–1680): так обложка целиком видна в сетке профиля.
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const { chromium } = createRequire(path.join(ROOT, 'reels-studio/package.json'))('playwright');
const U = (p) => 'file://' + (p.startsWith('/') ? p : path.join(ROOT, p));
const OUT = path.join(ROOT, 'finished-videos/обложки/reels-из-каруселей');
const FONTS = `@font-face{font-family:Golos;font-weight:400 900;src:url('${U('презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/GolosText-variable.ttf')}')}
@font-face{font-family:Sofia;font-weight:1 1000;src:url('${U('презентации/шаблон/fonts/SofiaSansExtraCondensed-normal-cyrillic.woff2')}');unicode-range:U+0400-045F}
@font-face{font-family:Sofia;font-weight:1 1000;src:url('${U('презентации/шаблон/fonts/SofiaSansExtraCondensed-normal-latin.woff2')}');unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:Hand;font-weight:500;src:url('${U('reels-studio/tools/nav-covers/fonts/caveat-cyr.woff2')}');unicode-range:U+0400-045F}
@font-face{font-family:Hand;font-weight:500;src:url('${U('reels-studio/tools/nav-covers/fonts/caveat-lat.woff2')}');unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:Inter;font-weight:100 900;src:url('${U('презентации/шаблон/fonts/Inter-normal-cyrillic.woff2')}');unicode-range:U+0400-045F}
@font-face{font-family:Inter;font-weight:100 900;src:url('${U('презентации/шаблон/fonts/Inter-normal-latin.woff2')}');unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF}`;
const CSS = `*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1920px;overflow:hidden;background:#06132f}.cv{position:absolute;inset:0;overflow:hidden;font-family:Golos,Inter,sans-serif}
.gtt{position:absolute;left:84px;top:290px;color:#cfe2ff;font:800 24px Inter;letter-spacing:.32em}.lab{font:800 19px Inter;letter-spacing:.16em;text-transform:uppercase;color:#7a8bb0}
.num{font:900 64px/1 Sofia;color:#1a73e8;margin-top:6px}.ttl{position:absolute;left:84px;right:84px;top:1335px;color:#fff;font:800 74px/1.03 Golos;text-wrap:balance}
.ft{position:absolute;left:84px;right:84px;top:1600px;display:flex;justify-content:space-between;font:700 24px Inter;letter-spacing:.14em;text-transform:uppercase;color:#9cc4ff}`;
const pl = (n, a, b, c) => { const m = n % 10, h = n % 100; return `${n} ${m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c}`; };
const hl = (s) => s.replace(/\*\*(.+?)\*\*/g, '<span style="color:#4f9bff">$1</span>');
const PLANE = (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>`;
const BG = (p) => `<div style="position:absolute;inset:-60px;background:url('${U(p)}') center/cover;filter:blur(22px) saturate(.9) brightness(.5)"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,#06132fb0 0%,#06132f30 30%,#06132f40 55%,#06132fe6 80%,#06132f 100%)"></div>`;
const city = (lab, c, right) => `<div style="${right ? 'text-align:right' : ''}"><div class="lab">${lab}</div><div style="font:900 ${c.length > 7 ? 78 : 96}px/0.9 Sofia;color:#0b2a6b;margin-top:8px">${c}</div></div>`;
const T = {
  talon: (o) => `<div class="cv">${BG(o.photo)}<div class="gtt">GLOBAL TECH TOUR</div>
    <div style="position:absolute;left:100px;top:370px;width:880px;rotate:-3deg;filter:drop-shadow(0 40px 60px #000a)">
      <div style="background:#fff;border-radius:34px 34px 0 0;overflow:hidden">
        <div style="background:#1a73e8;color:#fff;padding:28px 44px;display:flex;align-items:center;justify-content:space-between"><div><div style="font:800 24px Inter;letter-spacing:.2em">ПОСАДОЧНЫЙ ТАЛОН</div><div style="font:600 19px Inter;letter-spacing:.24em;opacity:.75;margin-top:6px">BOARDING PASS · БИЗНЕС-ЭКСПЕДИЦИЯ</div></div>${PLANE(54)}</div>
        <div style="padding:40px 44px 34px">
          ${o.to ? `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px">${city('Откуда', o.from)}
            <div style="flex:1;min-width:110px;height:4px;margin:0 6px 34px;background:repeating-linear-gradient(90deg,#1a73e8 0 14px,transparent 14px 24px);position:relative"><span style="position:absolute;left:50%;top:-24px;translate:-50% 0;color:#1a73e8;rotate:90deg">${PLANE(46)}</span></div>${city('Куда', o.to, 1)}</div>`
          : `<div style="display:flex;align-items:flex-end;gap:26px">${city('Город', o.from)}<span style="color:#1a73e8;margin-bottom:14px">${PLANE(56)}</span></div>`}
          <div style="font:600 24px Inter;color:#3c4f73;margin-top:12px">${o.via}</div>
          <div style="display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:16px;margin-top:34px;border-top:2px solid #e4e9f3;padding-top:26px">
            <div><div class="lab">Программа</div><div style="font:800 34px/1.08 Golos;color:#0b2a6b;margin-top:6px">${o.prog}</div></div>
            <div><div class="lab">Дней</div><div class="num">${o.days}</div></div><div><div class="lab">${o.cities === 1 ? 'Город' : 'Городов'}</div><div class="num">${o.cities}</div></div><div><div class="lab">Компаний</div><div class="num">${o.comp}</div></div></div>
          <div style="margin-top:26px;border-top:2px solid #e4e9f3;padding-top:22px"><div class="lab">Компании маршрута</div><div style="font:700 27px/1.4 Inter;color:#0b2a6b;margin-top:8px">${o.cos}</div></div></div></div>
      <div style="height:36px;background:radial-gradient(circle at 0 50%,transparent 22px,#fff 23px) left/51% 100% no-repeat,radial-gradient(circle at 100% 50%,transparent 22px,#fff 23px) right/51% 100% no-repeat;position:relative"><div style="position:absolute;left:40px;right:40px;top:17px;border-top:3px dashed #c9d3e6"></div></div>
      <div style="background:#fff;border-radius:0 0 34px 34px;padding:14px 44px 34px;display:flex;align-items:center;gap:30px"><div style="flex:1;height:78px;background:repeating-linear-gradient(90deg,#0b2a6b 0 5px,transparent 5px 9px,#0b2a6b 9px 11px,transparent 11px 18px,#0b2a6b 18px 21px,transparent 21px 25px)"></div><div style="font:800 22px Inter;color:#1a73e8;letter-spacing:.06em">globaltechtour.ru</div></div></div>
    <div class="ttl">${hl(o.t)}</div><div class="ft"><span>Маршрут и компании</span><span>смотри →</span></div></div>`,
  pass: (o) => `<div class="cv">${BG(o.photo)}<div class="gtt">GLOBAL TECH TOUR</div>
    <div style="position:absolute;left:530px;top:0;width:22px;height:430px;background:linear-gradient(90deg,#1a73e8,#4f9bff,#1a73e8)"></div>
    <div style="position:absolute;left:230px;top:400px;width:620px;height:860px;border-radius:36px;background:#fff;box-shadow:0 40px 90px #000a;rotate:-4deg;overflow:hidden">
      <div style="height:160px;background:#1a73e8;display:flex;align-items:center;justify-content:space-between;padding:0 44px;color:#fff;font:800 30px Inter;letter-spacing:.18em">ГОСТЬ КАМПУСА<span style="width:50px;height:16px;border-radius:8px;background:#06132f60"></span></div>
      <div style="height:250px;display:flex;align-items:center;justify-content:center;padding:30px 70px"><img src="${U(o.logo)}" style="max-width:100%;max-height:130px"></div>
      <div style="padding:0 48px;color:#0b2a6b"><div style="font:800 44px/1.12 Golos">${o.pass}</div><div style="font:600 28px Inter;margin-top:18px;color:#3c4f73">${o.line}</div>
      <div style="margin-top:60px;height:80px;background:repeating-linear-gradient(90deg,#0b2a6b 0 4px,transparent 4px 9px,#0b2a6b 9px 11px,transparent 11px 17px)"></div></div></div>
    <div class="ttl">${hl(o.t)}</div><div class="ft"><span>Обучение в кампусе</span><span>смотри →</span></div></div>`,
  // без городов (пользователь 01.11.2026: «не очень нравится такой формат, и не пиши там города») — три варианта для Reels из карусели программы
  logos: (o) => `<div class="cv">${BG(o.photo)}<div class="gtt">GLOBAL TECH TOUR</div>
    <div style="position:absolute;left:84px;right:84px;top:380px"><div style="display:inline-block;font:800 24px Inter;letter-spacing:.16em;text-transform:uppercase;padding:12px 24px;border-radius:40px;background:#ffffff1c;color:#dbe8ff;border:2px solid #ffffff38">К кому едем</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:20px;margin-top:34px">${o.logos.map(l => `<div style="width:${o.logos.length > 6 ? 284 : 436}px;height:${o.logos.length > 6 ? 170 : 200}px;background:#fff;border-radius:26px;display:flex;align-items:center;justify-content:center;padding:26px 30px;box-shadow:0 18px 40px #0007"><img src="${U(l)}" style="max-width:100%;max-height:100%;object-fit:contain"></div>`).join('')}</div></div>
    <div class="ttl">${hl(o.t)}</div><div class="ft"><span>${o.days} дней · ${o.comp} компаний</span><span>смотри →</span></div></div>`,
  stack: (o) => `<div class="cv">${BG(o.photo)}<div class="gtt">GLOBAL TECH TOUR</div>
    ${o.slides.slice(0, 3).reverse().map((sl, i, a) => { const k = a.length - 1 - i; return `<div style="position:absolute;left:${190 + k * 46}px;top:${400 + k * 26}px;width:620px;height:775px;border-radius:30px;background:url('${U(sl)}') center/cover;box-shadow:0 30px 70px #000a;rotate:${[-4, 5, 11][k]}deg;transform-origin:50% 100%"></div>`; }).join('')}
    <div style="position:absolute;left:84px;right:84px;top:1260px"><div style="display:inline-block;font:800 24px Inter;letter-spacing:.16em;text-transform:uppercase;padding:12px 24px;border-radius:40px;background:#1a73e8;color:#fff">Карусель за ${o.sec || 40} секунд</div></div>
    <div class="ttl" style="top:1350px">${hl(o.t)}</div><div class="ft"><span>${o.days} дней · ${o.comp} компаний</span><span>смотри →</span></div></div>`,
  stat: (o) => `<div class="cv">${BG(o.photo)}<div class="gtt">GLOBAL TECH TOUR</div>
    <div style="position:absolute;left:0;right:0;top:640px;text-align:center"><div style="font:900 ${o.value.length > 6 ? 250 : 330}px/0.9 Sofia;color:#fff;text-shadow:0 0 60px #3d8bffcc,0 0 140px #1a73e899">${o.value}</div>
      <div style="font:600 48px/1.25 Inter;color:#cfe2ff;margin:26px auto 0;max-width:820px;text-wrap:balance">${o.vt}</div></div>
    <div style="position:absolute;left:84px;right:84px;top:1240px"><div style="display:inline-block;font:800 24px Inter;letter-spacing:.16em;text-transform:uppercase;padding:12px 24px;border-radius:40px;background:#ffffff1c;color:#dbe8ff;border:2px solid #ffffff38">${o.prog}</div></div>
    <div class="ttl" style="top:1335px">${hl(o.t)}</div><div class="ft"><span>${o.days} дней · ${o.comp} компаний</span><span>смотри →</span></div></div>`,
  // «Маршрут из логотипов» (пользователь 01.11.2026: «первый вариант ок, но надо чуть креативней… чтобы потом и на другие обложки
  // можно было применять»): компании маршрута по порядку визитов — змейкой, пунктир маршрута, номера, самолёт в конце. Без городов. 4–10 логотипов.
  route: (o) => {
    const n = o.logos.length, per = n <= 4 ? 2 : 3, rows = Math.ceil(n / per), X0 = 84, W = 912, Y0 = 430, H = rows > 3 ? 820 : 780;
    const rh = H / rows, cw = per === 3 ? 252 : 360, ch = rows > 3 ? 132 : per === 3 ? 150 : 170;
    const pts = o.logos.map((l, i) => {
      const r = Math.floor(i / per), inRow = r === rows - 1 ? n - r * per : per; let c = i % per; if (r % 2) c = inRow - 1 - c;
      const step = W / per, off = (per - inRow) * step / 2;
      return { l, i, x: X0 + off + (c + 0.5) * step, y: Y0 + (r + 0.5) * rh, rot: [-2.5, 1.5, -1, 2, -1.8, 1.2][i % 6] };
    });
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < n; i++) {
      const a = pts[i - 1], b = pts[i];
      if (Math.abs(a.y - b.y) < 1) d += ` L ${b.x} ${b.y}`;
      else { const side = (Math.floor((i - 1) / per) % 2) ? -1 : 1, ex = side > 0 ? Math.max(a.x, b.x) + cw * 0.62 : Math.min(a.x, b.x) - cw * 0.62; d += ` C ${ex} ${a.y} ${ex} ${b.y} ${b.x} ${b.y}`; }
    }
    const last = pts[n - 1], prev = pts[n - 2] || { x: last.x - 1, y: last.y }, dir = Math.abs(prev.y - last.y) < 1 ? (last.x > prev.x ? 1 : -1) : (Math.floor((n - 1) / per) % 2 ? -1 : 1);
    const px = last.x + dir * (cw / 2 + 58), ang = dir > 0 ? 90 : -90;
    return `<div class="cv">${BG(o.photo)}
    <div style="position:absolute;inset:0;background-image:radial-gradient(#9cc4ff22 2px,transparent 2.5px);background-size:34px 34px;mask:linear-gradient(180deg,transparent 12%,#000 30%,#000 66%,transparent 80%)"></div>
    <div class="gtt">GLOBAL TECH TOUR</div>
    <div style="position:absolute;left:84px;top:336px;display:flex;align-items:center;gap:16px"><span style="display:inline-block;font:800 24px Inter;letter-spacing:.16em;text-transform:uppercase;padding:12px 24px;border-radius:40px;background:#1a73e8;color:#fff;box-shadow:0 0 30px #1a73e899">К кому едем</span><span style="font:700 24px Inter;letter-spacing:.12em;text-transform:uppercase;color:#9cc4ff">маршрут по компаниям</span></div>
    <svg width="1080" height="1920" style="position:absolute;inset:0"><defs><filter id="g"><feGaussianBlur stdDeviation="7"/></filter></defs>
      <path d="${d}" fill="none" stroke="#3d8bff" stroke-width="16" stroke-linecap="round" opacity=".55" filter="url(#g)"/>
      <path d="${d}" fill="none" stroke="#cfe2ff" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 22"/></svg>
    ${pts.map(p => `<div style="position:absolute;left:${p.x - cw / 2}px;top:${p.y - ch / 2}px;width:${cw}px;height:${ch}px;background:#fff;border-radius:24px;display:flex;align-items:center;justify-content:center;padding:22px 26px;box-shadow:0 22px 44px #000a,0 0 0 4px #ffffff22;rotate:${p.rot}deg">
      <img src="${U(p.l)}" style="max-width:100%;max-height:100%;object-fit:contain"><div style="position:absolute;left:-18px;top:-18px;width:52px;height:52px;border-radius:50%;background:#1a73e8;color:#fff;font:800 26px Inter;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px #06132f,0 0 24px #3d8bff">${p.i + 1}</div></div>`).join('')}
    <div style="position:absolute;left:${px - 34}px;top:${last.y - 34}px;width:68px;height:68px;color:#fff;rotate:${ang}deg;filter:drop-shadow(0 0 14px #3d8bff)">${PLANE(68)}</div>
    <div class="ttl">${hl(o.t)}</div><div class="ft"><span>${o.foot ? o.foot + ' · ' + pl(o.comp || n, 'компания', 'компании', 'компаний') : pl(o.days, 'день', 'дня', 'дней') + ' · ' + pl(o.comp || n, 'компания', 'компании', 'компаний')}</span><span>смотри →</span></div></div>`;
  },
  pola: (o) => `<div class="cv">${BG(o.photo)}<div class="gtt">GLOBAL TECH TOUR</div>
    <div style="position:absolute;left:120px;top:360px;width:840px;padding:32px 32px 140px;background:#fbfaf6;box-shadow:0 40px 90px #000b;rotate:3deg">
      <div style="height:${o.ph || 760}px;background:url('${U(o.photo)}') center ${o.py || '40%'}/cover"></div>
      <div style="position:absolute;left:44px;right:44px;bottom:30px;font:500 84px/1 Hand,cursive;color:#1b2b55">${o.hand}</div>
      <div style="position:absolute;left:330px;top:-30px;width:200px;height:60px;background:#ffffffb0;rotate:-6deg;box-shadow:0 4px 10px #0002"></div></div>
    <div style="position:absolute;left:84px;right:84px;top:1335px"><div style="display:inline-block;font:800 24px Inter;letter-spacing:.16em;text-transform:uppercase;padding:12px 24px;border-radius:40px;background:#ffc857;color:#06132f">${o.pill}</div>
      <div style="color:#fff;font:800 66px/1.05 Golos;margin-top:24px;text-wrap:balance">${hl(o.t)}</div></div>
    <div class="ft" style="top:1630px"><span>${o.foot || 'Визит Остапа Доценко'}</span><span>смотри →</span></div></div>`,
};
const { covers } = JSON.parse(fs.readFileSync(path.join(HERE, 'covers.json'), 'utf8'));
const only = process.argv.slice(2); const list = only.length ? covers.filter(c => only.includes(c.name)) : covers;
fs.mkdirSync(OUT, { recursive: true });
const tmp = path.join(process.env.TMPDIR || '/tmp', 'nav-cover.html');
const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1080, height: 1920 } });
for (const c of list) {
  fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>${FONTS}${CSS}</style>${T[c.kind](c)}`);
  await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => console.log('  (долго грузится — снимаю как есть)'));
  await p.screenshot({ path: path.join(OUT, c.name + '.jpg'), type: 'jpeg', quality: 90 }); console.log('✓', c.name);
}
await br.close();
