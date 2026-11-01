// Карусели-меню для закрепа GTT (1080×1350): «Программы по отраслям» и «Кампусы Китая».
//   node reels-studio/tools/nav-covers/menus.mjs  → finished-videos/карусели/<name>/01.jpg …
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const { chromium } = createRequire(path.join(ROOT, 'reels-studio/package.json'))('playwright');
const U = (p) => 'file://' + path.join(ROOT, p);
const CR = U('finished-videos/обложки/gtt-бренд/instagram/gtt-аватар-1080.jpg');
const FONTS = `@font-face{font-family:Golos;font-weight:400 900;src:url('${U('презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/GolosText-variable.ttf')}')}
@font-face{font-family:Inter;font-weight:100 900;src:url('${U('презентации/шаблон/fonts/Inter-normal-cyrillic.woff2')}');unicode-range:U+0400-045F}
@font-face{font-family:Inter;font-weight:100 900;src:url('${U('презентации/шаблон/fonts/Inter-normal-latin.woff2')}');unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF}`;
const CSS = `*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1350px;overflow:hidden}.cv{position:absolute;inset:0;overflow:hidden;font-family:Golos,Inter,sans-serif;color:#fff;background:radial-gradient(120% 80% at 70% 15%,#1d55c4 0%,#0a2560 45%,#06132f 82%)}
.top{position:absolute;left:72px;right:72px;top:64px;display:flex;justify-content:space-between;font:800 22px Inter;letter-spacing:.32em;color:#9cc4ff}
.bot{position:absolute;left:72px;right:72px;bottom:64px;display:flex;justify-content:space-between;font:700 22px Inter;letter-spacing:.14em;text-transform:uppercase;color:#7fb6ff}
.pill{display:inline-block;font:800 22px Inter;letter-spacing:.16em;text-transform:uppercase;padding:12px 22px;border-radius:40px;background:#ffffff14;color:#cfe2ff;border:2px solid #ffffff30}
.chip{font:700 28px Inter;color:#dbe8ff;padding:12px 22px;border-radius:14px;background:#ffffff12;border:1.5px solid #ffffff26}
.crys{position:absolute;right:-170px;top:-130px;width:720px;height:720px;border-radius:50%;background:url('${CR}') center/cover;mask:radial-gradient(circle,#000 52%,transparent 70%)}`;
const hl = (s) => s.replace(/\*\*(.+?)\*\*/g, '<span style="color:#4f9bff">$1</span>');
const frame = (i, n, inner, foot = 'листай') => `<div class="cv">${inner}<div class="top"><span>GLOBAL TECH TOUR</span><span>${i} / ${n}</span></div><div class="bot"><span>${i < n ? foot + ' →' : ''}</span><span style="opacity:.7">globaltechtour.ru</span></div></div>`;
const cover = (c) => `<div class="crys"></div><div style="position:absolute;left:72px;right:72px;top:440px"><span class="pill">${c.k}</span>
  <div style="font:900 108px/0.98 Golos;text-transform:uppercase;margin-top:30px">${c.t}</div>
  <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:38px">${c.chips.map(x => `<span class="chip">${x}</span>`).join('')}</div>
  <div style="font:500 32px/1.35 Inter;color:#9cc4ff;margin-top:34px">${c.s}</div></div>`;
const group = (g) => `<div style="position:absolute;left:72px;right:72px;top:160px"><span class="pill">Отрасль</span><div style="font:900 74px/1.0 Golos;margin-top:26px;text-wrap:balance">${g.t}</div></div>
  <div style="position:absolute;left:72px;right:72px;top:${g.t.length > 20 ? 420 : 360}px;display:flex;flex-direction:column;gap:${g.items.length > 5 ? 16 : 22}px">${g.items.map(([a, b]) => `
    <div style="display:flex;gap:24px;align-items:center;background:#ffffff0f;border:1.5px solid #ffffff22;border-radius:22px;padding:${g.items.length > 5 ? 20 : 26}px 30px">
      <div style="width:14px;height:14px;border-radius:50%;background:#4f9bff;box-shadow:0 0 18px #4f9bff;flex:none"></div>
      <div><div style="font:800 ${g.items.length > 5 ? 34 : 38}px/1.15 Golos">${a}</div><div style="font:600 24px Inter;color:#9cc4ff;margin-top:6px">${b}</div></div></div>`).join('')}</div>`;
const campus = (c) => `<div style="position:absolute;left:530px;top:0;width:22px;height:250px;background:linear-gradient(90deg,#1a73e8,#4f9bff,#1a73e8)"></div>
  <div style="position:absolute;left:250px;top:220px;width:580px;height:700px;border-radius:34px;background:#fff;box-shadow:0 40px 90px #000a;rotate:-3deg;overflow:hidden">
    <div style="height:140px;background:#1a73e8;display:flex;align-items:center;justify-content:space-between;padding:0 40px;font:800 27px Inter;letter-spacing:.18em">ГОСТЬ КАМПУСА<span style="width:46px;height:14px;border-radius:8px;background:#06132f60"></span></div>
    <div style="height:220px;display:flex;align-items:center;justify-content:center;padding:30px 70px"><img src="${U(c.logo)}" style="max-width:100%;max-height:120px"></div>
    <div style="padding:0 44px;color:#0b2a6b"><div style="font:800 40px/1.12 Golos">${c.pass}</div><div style="font:600 26px Inter;margin-top:16px;color:#3c4f73">${c.line}</div>
    <div style="margin-top:50px;height:70px;background:repeating-linear-gradient(90deg,#0b2a6b 0 4px,transparent 4px 9px,#0b2a6b 9px 11px,transparent 11px 17px)"></div></div></div>
  <div style="position:absolute;left:72px;right:72px;top:1010px;font:800 60px/1.06 Golos;text-wrap:balance">${hl(c.t)}</div>`;
const cta = (c) => `<div class="crys" style="opacity:.6"></div><div style="position:absolute;left:72px;right:72px;top:470px"><div style="font:900 92px/1.0 Golos;text-wrap:balance">${c.t}</div>
  <div style="font:500 38px/1.4 Inter;color:#cfe2ff;margin-top:34px">${c.s}</div>
  <div style="display:inline-block;margin-top:46px;font:800 30px Inter;color:#06132f;background:#fff;border-radius:44px;padding:20px 36px">${c.foot}</div></div>`;
const { menus } = JSON.parse(fs.readFileSync(path.join(HERE, 'menus.json'), 'utf8'));
const tmp = path.join(process.env.TMPDIR || '/tmp', 'nav-menu.html');
const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1080, height: 1350 } });
for (const m of menus) {
  const parts = [cover(m.cover), ...(m.groups || []).map(group), ...(m.campus || []).map(campus), cta(m.cta)];
  const out = path.join(ROOT, 'finished-videos/карусели', m.name); fs.mkdirSync(out, { recursive: true });
  for (const [i, inner] of parts.entries()) {
    fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>${FONTS}${CSS}</style>${frame(i + 1, parts.length, inner)}`);
    await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForLoadState('networkidle');
    await p.screenshot({ path: path.join(out, `${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 90 });
  }
  console.log('✓', m.name, parts.length);
}
await br.close();
