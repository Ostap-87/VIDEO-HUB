// Новые обложки для своих Reels личного профиля @ostap.dotsenko (02.11.2026: «для этих рилс надо обложки сделать в нашем новом
// стиле, только для ГТТ не нужно»). Язык вариантов 11/12: жёлтый · чернила · красный, Unbounded + кисть, печать 多 справа в зоне сетки.
// Рамки: D1 «Дело-фото» (кадр + тёмная полоса), D2 «Дело-цифра» (тёмная плитка, крупная цифра, кадр в рамке), D3 «Дело-вырезка»,
// M1 «Маньхуа-фото» (кадр карточкой на растре + облачко RU/кисть ZH + иероглиф-звук), M2 «Маньхуа-вырезка».
// Кадры — source-videos/ostapdotcenko/reels-кадры/<номер>.jpg|png (чистые кадры роликов из API Instagram; где видео не отдают — превью).
// Заголовки — только из подписей роликов и старых обложек. Запуск: node reels-studio/tools/od-posts/reel-covers.mjs [номер …]
import { createRequire } from 'module'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = '/home/user/VIDEO-HUB', F = `${ROOT}/презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/`;
const SRC = `file://${ROOT}/source-videos/ostapdotcenko/reels-кадры/`;
const OUT = `${ROOT}/finished-videos/обложки/ostap-reels-новые`;
const CSS = `
@font-face{font-family:Unbounded;font-weight:200 900;src:url('file://${F}Unbounded-variable.ttf')}
@font-face{font-family:Golos;font-weight:400 900;src:url('file://${F}GolosText-variable.ttf')}
@font-face{font-family:JB;font-weight:100 800;src:url('file://${F}JetBrainsMono-variable.ttf')}
@font-face{font-family:MSZ;src:url('file://${ROOT}/интернет-материалы/шрифты/ma-shan-zheng.woff2') format('woff2')}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:Golos,sans-serif;background:#15151D}
.a{position:absolute}
.hy{position:absolute;inset:0;background:#FFD92E;background-image:radial-gradient(rgba(25,25,34,.16) 3.4px,transparent 4px);background-size:22px 22px}
.hk{position:absolute;inset:0;background:#15151D;background-image:radial-gradient(rgba(255,217,46,.13) 3.4px,transparent 4px);background-size:22px 22px}
.hr{position:absolute;inset:0;background:#E8341C;background-image:radial-gradient(rgba(25,25,34,.2) 3.4px,transparent 4px);background-size:22px 22px}
.speed{position:absolute;inset:0;background:repeating-conic-gradient(from 0deg at var(--sx,60%) var(--sy,35%),rgba(25,25,34,.09) 0 2deg,transparent 2deg 9deg)}
.bub{position:absolute;background:#fff;border:7px solid #191922;padding:22px 28px 20px;font:900 54px/1.08 Unbounded;color:#191922;box-shadow:12px 12px 0 #191922;letter-spacing:-.01em}
.bub small{display:block;margin-top:10px;font:400 44px/1.1 MSZ;color:#E8341C;letter-spacing:0}
.bub::after{content:"";position:absolute;bottom:-40px;left:var(--tail,70px);border:18px solid transparent;border-top:28px solid #191922}
.sfx{position:absolute;font:400 190px/1 MSZ;color:#E8341C;-webkit-text-stroke:6px #191922;text-shadow:10px 10px 0 #191922;rotate:-10deg}
.seal{position:absolute;right:56px;top:1572px;width:84px;height:84px;background:#C8102E;color:#fff;font:400 64px/84px MSZ;text-align:center;border-radius:10px;box-shadow:0 0 0 5px #fff;rotate:-4deg}
.frm{position:absolute;inset:0;border:10px solid #191922}
.lab{font:700 30px JB;letter-spacing:.16em;text-transform:uppercase;color:#FFD92E}
.ph{position:absolute;background-size:cover;background-repeat:no-repeat}
.cut{position:absolute;object-fit:contain}
.wm{position:absolute;font:400 600px/1 MSZ;color:rgba(255,217,46,.10)}
.strip{position:absolute;left:0;right:0;bottom:0;height:240px;background:#191922}
.strip div{position:absolute;left:60px;right:60px;bottom:118px;font:900 46px/1.1 Unbounded;color:#FFD92E}
`;
const img = (n, ext = 'jpg') => `${SRC}${n}.${ext}`;
const seal = `<div class="seal">多</div>`;
const titleBlock = (label, title, zh, sub, top = 1236) => `<div class="a" style="left:60px;right:150px;top:${top}px;display:flex;flex-direction:column;gap:14px">
  <div class="lab">${label}</div><div style="font:900 82px/1.03 Unbounded;color:#fff;letter-spacing:-.02em">${title}</div>
  <div style="font:600 36px/1.25 Golos;color:#ECEAE3">${zh ? `<span style="font:400 46px MSZ;color:#FFD92E">${zh}</span>${sub ? ' · ' : ''}` : ''}${sub || ''}</div></div>`;
const T = {
  // fit: 'blur' — кадр целиком по высоте (не режет голову и руки), по бокам — его размытая копия
  D1: c => (c.fit === 'blur'
    ? `<div class="ph" style="left:0;top:0;width:1080px;height:1300px;background-image:url('${img(c.n, c.ext)}');background-position:center;filter:blur(30px) brightness(.62);scale:1.15"></div>
    <div class="ph" style="left:0;top:0;width:1080px;height:${c.fh || 1300}px;background-image:url('${img(c.n, c.ext)}');background-position:center top;background-size:auto 100%"></div>`
    : `<div class="ph" style="left:0;top:0;width:1080px;height:1300px;background-image:url('${img(c.n, c.ext)}');background-position:${c.pos || 'center 30%'};background-size:${c.size || 'cover'}"></div>`) + `
    <div class="a" style="left:0;right:0;top:1060px;height:240px;background:linear-gradient(transparent,#12121A)"></div><div class="a" style="left:0;right:0;top:1290px;bottom:0;background:#12121A"></div>
    <div class="wm" style="right:-40px;top:1180px">${c.wm}</div>${titleBlock(c.label, c.title, c.zh, c.sub)}${seal}`,
  D2: c => `<div class="hk"></div><div class="wm" style="right:-60px;top:820px">${c.wm}</div>
    <div class="ph" style="left:60px;top:290px;width:960px;height:${c.ph || 620}px;background-image:url('${img(c.n, c.ext)}');background-position:${c.pos || 'center'};border:8px solid #FFD92E;box-shadow:14px 14px 0 #E8341C"></div>
    <div class="a lab" style="left:64px;top:${(c.ph || 620) + 350}px">${c.label}</div>
    <div class="a" style="left:56px;right:56px;top:${(c.ph || 620) + 396}px;font:900 ${c.ns || 200}px/1 Unbounded;color:#FFD92E;letter-spacing:-.04em;white-space:nowrap">${c.num}</div>
    <div class="a" style="left:64px;right:160px;top:${(c.ph || 620) + 420 + (c.ns || 200)}px;font:800 54px/1.12 Unbounded;color:#fff">${c.title}</div>
    <div class="a" style="left:64px;right:160px;top:${(c.ph || 620) + 440 + (c.ns || 200) + (c.title.includes('<br>') ? 124 : 64)}px;font:600 34px Golos;color:#ECEAE3"><span style="font:400 44px MSZ;color:#FFD92E">${c.zh}</span>${c.sub ? ' · ' + c.sub : ''}</div>${seal}`,
  D3: c => `<div class="hk"></div><div class="wm" style="left:-40px;top:700px;font-size:520px">${c.wm}</div>
    <img class="cut" src="${img(c.n, 'png')}" style="${c.cutSt}">
    ${titleBlock(c.label, c.title, c.zh, c.sub, 290)}${seal}`,
  M1: c => `<div class="${c.bg}"></div><div class="speed"></div>
    <div class="ph" style="left:${c.cx ?? 50}px;top:${c.cy ?? 250}px;width:${c.cw || 980}px;height:${c.ch || 1400}px;background-image:url('${img(c.n, c.ext)}');background-position:${c.pos || 'center'};background-size:${c.size || 'cover'};border:10px solid #191922;box-shadow:16px 16px 0 #191922;rotate:${c.rot ?? -1.5}deg"></div>
    <div class="bub" style="${c.bubSt};--tail:${c.tail || '70px'}">${c.bubble}${c.zh ? `<small>${c.zh}</small>` : ''}</div>
    ${c.sfx ? `<div class="sfx" style="${c.sfxSt}">${c.sfx}</div>` : ''}<div class="strip"><div>${c.strip}</div></div>${seal}<div class="frm"></div>`,
  M2: c => `<div class="${c.bg}"></div><div class="speed" style="--sx:55%;--sy:45%"></div>
    <img class="cut" src="${img(c.n, 'png')}" style="${c.cutSt}">
    <div class="bub" style="${c.bubSt};--tail:${c.tail || '70px'}">${c.bubble}<small>${c.zh}</small></div>
    ${c.sfx ? `<div class="sfx" style="${c.sfxSt}">${c.sfx}</div>` : ''}<div class="strip"><div>${c.strip}</div></div>${seal}<div class="frm"></div>`,
};
// порядок — как в сетке профиля (сверху вниз), views — для сверки с сеткой
export const COVERS = [
  { n: 38, slug: 'потолкать-робота', views: 2738, t: 'M1', bg: 'hy', pos: '42% center', bubble: 'Можно его потолкать?', zh: '可以推一下吗？', bubSt: 'left:56px;top:290px;width:560px', sfx: '哇!', sfxSt: 'right:70px;top:1180px', strip: 'Когда захотел потолкать робота' },
  { n: 18, slug: 'matrix-tesla', views: 352, t: 'D1', pos: 'center 25%', label: 'Роботы · Matrix', title: 'Китайский ответ<br>Tesla Optimus', zh: '人形机器人', sub: '1000+ предзаказов', wm: '人' },
  { n: 20, slug: 'стань-человеком', views: 454, t: 'M1', bg: 'hr', size: '180% auto', pos: '50% 100%', cy: 420, ch: 1180, bubble: 'Стань человеком!', zh: '变成人吧！', bubSt: 'left:56px;top:260px;width:520px', sfx: '哈!', sfxSt: 'right:70px;top:1260px;color:#FFD92E', strip: 'Нелегко обучать роботов' },
  { n: 21, slug: 'кибер-конь', views: 781, t: 'M1', bg: 'hy', pos: '50% 92%', size: 'cover', bubble: 'Кибер-конь уже есть!', zh: '机器马已经有了！', bubSt: 'right:56px;top:290px;width:540px', tail: '380px', sfx: '驾!', sfxSt: 'left:70px;top:1220px', strip: 'WAIC 2026 · Шанхай' },
  { n: 23, slug: 'робот-три-рабочих', views: 752, t: 'M2', bg: 'hy', cutSt: 'right:-140px;bottom:200px;height:1300px', bubble: 'Один робот = три рабочих?', zh: '一个机器人=三个工人？', bubSt: 'left:56px;top:290px;width:600px', sfx: '哇!', sfxSt: 'left:70px;top:1180px', strip: 'До 8 млн ₽ экономии в год' },
  { n: 25, slug: 'embodied-ai', views: 728, t: 'D1', fit: 'blur', fh: 1240, label: 'Роботы · тренд', title: 'Embodied AI —<br>новый виток', zh: '具身智能', sub: 'вы этого точно не знали', wm: '智' },
  { n: 26, slug: 'кибер-собака', views: 828, t: 'M2', bg: 'hr', cutSt: 'left:50%;bottom:150px;height:1350px;translate:-50% 0', bubble: 'Прокатились бы на такой?', zh: '你敢骑吗？', bubSt: 'left:56px;top:270px;width:600px', sfx: '汪!', sfxSt: 'right:60px;top:1080px;color:#FFD92E', strip: 'Робособака AgiBot' },
  { n: 31, slug: '20-часов-в-минуте', views: 712, t: 'M1', bg: 'hr', pos: 'center', cx: 130, cy: 300, cw: 820, ch: 1300, rot: 2, bubble: '20 часов в одной минуте', zh: '上海 → 北京', bubSt: 'left:56px;top:860px;width:760px', strip: 'Самоиронию никто не отменял' },
  { n: 32, slug: '90-процентов', views: 1018, t: 'D1', pos: 'center 40%', label: 'Будущее · роботы', title: '90% не знают,<br>что грядёт', zh: '自动化', sub: '60%+ ручного труда — роботам', wm: '机' },
  { n: 33, slug: 'agibot-посылка', views: 624, t: 'M1', bg: 'hy', pos: 'center 30%', bubble: 'Он собрал мне посылку!', zh: '它帮我打包了！', bubSt: 'right:56px;top:280px;width:560px', tail: '380px', sfx: '哇!', sfxSt: 'left:60px;top:1200px', strip: 'AgiBot · прикладной формат' },
  { n: 34, slug: 'agibot-10000', views: 496, t: 'D2', pos: 'center 30%', ph: 640, label: 'Роботы · AgiBot', num: '10 000', title: 'роботов AgiBot<br>уже в работе', zh: '智元' },
  { n: 35, slug: 'kepler-производство', views: 507, t: 'M1', bg: 'hr', pos: 'center 0%', size: '125% auto', bubble: 'Kepler уже на производстве!', zh: '开普勒在工厂！', bubSt: 'left:56px;top:270px;width:600px', sfx: '哇!', sfxSt: 'right:70px;top:1180px;color:#FFD92E', strip: 'Прикладное применение Kepler' },
  { n: 36, slug: 'kepler-30кг', views: 655, t: 'D2', pos: 'center 45%', ph: 640, label: 'Роботы · Kepler', num: '30 кг', title: 'нагрузка<br>на две руки', zh: '开普勒' },
  { n: 37, slug: 'kepler-зарядка', views: 635, t: 'D1', pos: 'center 30%', label: 'Роботы · Kepler', title: '1 час зарядки =<br>8 часов работы', zh: '开普勒', sub: 'новый уровень', wm: '电' },
  { n: 39, slug: 'будущее-здесь', views: 1106, t: 'M1', bg: 'hy', pos: '70% 0%', size: '125% auto', bubble: 'Будущее уже здесь!', zh: '未来已来！', bubSt: 'left:56px;top:280px;width:540px', sfx: '哇!', sfxSt: 'right:70px;top:1200px', strip: 'AgiBot · Шанхай' },
  { n: 40, slug: 'byd-часть-2', views: 522, t: 'D1', fit: 'blur', fh: 1440, label: 'Визит · BYD', title: 'R&D-центр BYD<br>часть 2', zh: '比亚迪', sub: 'Шэньчжэнь', wm: '车' },
  { n: 41, slug: 'byd-часть-1', views: 762, t: 'D1', pos: 'center 20%', label: 'Визит · BYD', title: 'R&D-центр BYD<br>часть 1', zh: '比亚迪', sub: 'Шэньчжэнь', wm: '车' },
  { n: 42, slug: 'шэньчжэнь-день-2', views: 704, t: 'M1', bg: 'hr', pos: 'center 0%', size: '125% auto', bubble: 'Сегодня: BYD, Baidu и дроны!', zh: '深圳，出发！', bubSt: 'left:56px;top:270px;width:620px', sfx: '走!', sfxSt: 'right:70px;top:1200px;color:#FFD92E', strip: 'Шэньчжэнь · день 2' },
  { n: 43, slug: 'ликбез-роботы', views: 552, t: 'M1', bg: 'hy', pos: 'center 35%', bubble: 'Ликбез про роботов!', zh: '机器人小课堂', bubSt: 'right:56px;top:280px;width:540px', tail: '380px', sfx: '哈哈', sfxSt: 'left:60px;top:1220px', strip: 'Ликбез продолжается' },
  { n: 44, slug: 'ввп-гуандун', views: 1120, t: 'D1', pos: 'center 8%', label: 'Экономика · Гуандун', title: 'ВВП одной провинции<br>как у целых стран', zh: '广东', sub: 'Шэньчжэнь', wm: '广' },
  { n: 45, slug: 'закрытые-заводы', views: 682, t: 'M1', bg: 'hr', pos: 'center 30%', bubble: 'Как показать закрытые заводы?', zh: '封闭工厂', bubSt: 'left:56px;top:270px;width:600px', sfx: '嘘!', sfxSt: 'right:70px;top:1200px;color:#FFD92E', strip: 'Чем я занимаюсь: роботизация' },
  { n: 46, slug: 'pov-козы', views: 738, t: 'M1', bg: 'hy', pos: 'center 80%', size: 'auto 150%', bubble: 'POV: опять ты со своими козами тусишь?', bubSt: 'left:56px;top:270px;width:640px', sfx: '哈哈!', sfxSt: 'right:60px;top:1240px', strip: 'Козы, свяжитесь со мной' },
];
const isMain = process.argv[1] && process.argv[1].endsWith('reel-covers.mjs');
if (isMain) {
  const only = process.argv.slice(2).map(Number);
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [i, c] of COVERS.entries()) {
    if (only.length && !only.includes(c.n)) continue;
    fs.writeFileSync('/tmp/od-rc-tmp.html', `<!doctype html><meta charset="utf-8"><style>${CSS}</style>${T[c.t](c)}`);
    await pg.goto('file:///tmp/od-rc-tmp.html'); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(200);
    const f = `${OUT}/${String(i + 1).padStart(2, '0')}_${c.views}_${c.slug}.jpg`;
    await pg.screenshot({ path: f, type: 'jpeg', quality: 92 }); console.log('✓', f.replace(OUT + '/', ''));
  }
  await br.close();
}
