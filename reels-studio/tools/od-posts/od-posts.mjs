// Посты личного профиля @ostap.dotsenko в общем языке вариантов 11/12 (жёлтый · чернила · красный, гротеск + кисть, печать 多):
// обложки Reels первого ряда (YingKe, SANY — «Дело» и «Маньхуа»), 3 аватара, карусель «Кто я и чем занимаюсь» (7 слайдов 4:5)
// и лист-макет. Запуск: node reels-studio/tools/od-posts/od-posts.mjs [covers|avatar|carousel|sheet] (без аргумента — всё).
// Снимки сайтов для слайдов — node reels-studio/tools/od-posts/site-shots.mjs (кладёт в source-videos/ostapdotcenko/site/).
import { createRequire } from 'module'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = '/home/user/VIDEO-HUB';
const OUT = `${ROOT}/finished-videos/обложки/ostap-посты-2026-11-02`;
const SV = `file://${ROOT}/source-videos/`;
const F = `${ROOT}/презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/`;
const IMG = {
  mic: 'фото-от-пользователя/остап/вырезки/ostap-yingke-mikrofon.png', portrait: 'фото-от-пользователя/остап/вырезки/ostap-portret-sait.png',
  fin: 'фото-от-пользователя/остап/вырезки/ostap-fintech-kadr.png', portraitPhoto: 'фото-от-пользователя/остап/ostap-portret-sait.jpg',
  ykSpeech: '2026-10-26-yingke/фото/3.jpg', sanySelfie: '2026-10-25-sany/фото/IMG_5674.jpg', group: '2026-10-26-xingwang/фото/188.jpg',
  siteOd: 'ostapdotcenko/site/od-mobile-top.png', siteAura: 'aura-robotics/site/aura-mobile-top.png', siteGtt: 'ostapdotcenko/site/gtt-mobile-top.png',
};
const U = k => SV + IMG[k];
const only = process.argv[2];

const CSS = `
@font-face{font-family:Unbounded;font-weight:200 900;src:url('file://${F}Unbounded-variable.ttf')}
@font-face{font-family:Golos;font-weight:400 900;src:url('file://${F}GolosText-variable.ttf')}
@font-face{font-family:JB;font-weight:100 800;src:url('file://${F}JetBrainsMono-variable.ttf')}
@font-face{font-family:MSZ;src:url('file://${ROOT}/интернет-материалы/шрифты/ma-shan-zheng.woff2') format('woff2')}
*{box-sizing:border-box;margin:0}body{position:relative;overflow:hidden;font-family:Golos,sans-serif;color:#191922}
.a{position:absolute}
.hy{position:absolute;inset:0;background:#FFD92E;background-image:radial-gradient(rgba(25,25,34,.16) 3.4px,transparent 4px);background-size:22px 22px}
.hk{position:absolute;inset:0;background:#15151D;background-image:radial-gradient(rgba(255,217,46,.13) 3.4px,transparent 4px);background-size:22px 22px}
.hr{position:absolute;inset:0;background:#E8341C;background-image:radial-gradient(rgba(25,25,34,.2) 3.4px,transparent 4px);background-size:22px 22px}
.speed{position:absolute;inset:0;background:repeating-conic-gradient(from 0deg at var(--sx,70%) var(--sy,40%),rgba(25,25,34,.09) 0 2deg,transparent 2deg 9deg)}
.bub{position:absolute;background:#fff;border:7px solid #191922;padding:22px 28px 20px;font:900 52px/1.08 Unbounded;color:#191922;box-shadow:12px 12px 0 #191922;letter-spacing:-.01em}
.bub small{display:block;margin-top:10px;font:400 44px/1.1 MSZ;color:#E8341C;letter-spacing:0}
.bub::after{content:"";position:absolute;bottom:-40px;left:var(--tail,60px);border:18px solid transparent;border-top:28px solid #191922}
.sfx{position:absolute;font:400 200px/1 MSZ;color:#E8341C;-webkit-text-stroke:6px #191922;text-shadow:10px 10px 0 #191922;rotate:-10deg}
.seal{position:absolute;width:84px;height:84px;background:#C8102E;color:#fff;font:400 64px/84px MSZ;text-align:center;border-radius:10px;box-shadow:0 0 0 5px #fff;rotate:-4deg}
.frm{position:absolute;inset:0;border:10px solid #191922}
.lab{font:700 30px JB;letter-spacing:.16em;text-transform:uppercase}
.chip{display:inline-block;background:#191922;color:#FFD92E;font:700 28px JB;letter-spacing:.12em;padding:12px 18px}
.wm{position:absolute;font:400 620px/1 MSZ;color:rgba(255,217,46,.10)}
.cut{position:absolute;object-fit:contain}
.ph{position:absolute;background-size:cover;background-repeat:no-repeat}
mark{background:#FFD92E;color:#191922;padding:0 .1em}
`;
const page = (w, h, body) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}body{width:${w}px;height:${h}px}</style></head><body>${body}</body></html>`;
let br, pg;
async function shot(w, h, body, out, q = 93) {
  fs.mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true });
  await pg.setViewportSize({ width: w, height: h });
  fs.writeFileSync('/tmp/od-posts-tmp.html', page(w, h, body));
  await pg.goto('file:///tmp/od-posts-tmp.html'); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(250);
  await pg.screenshot({ path: out, type: 'jpeg', quality: q }); console.log('✓', out.replace(OUT + '/', ''));
}
const seal = (st) => `<div class="seal" style="${st}">多</div>`;
// телефон со снимком сайта (снимок 780 px шириной = 390 pt × 2)
const phone = (k, st, w = 430) => `<div class="a" style="${st};width:${w}px;height:${Math.round(w * 2.05)}px;border-radius:${w * 0.13}px;background:#0d0d12;padding:${w * 0.035}px;box-shadow:18px 22px 0 #191922">
  <div style="width:100%;height:100%;border-radius:${w * 0.1}px;overflow:hidden;background:#fff url('${U(k)}') top center/100% auto no-repeat"></div>
  <div class="a" style="left:50%;top:${w * 0.06}px;width:${w * 0.28}px;height:${w * 0.07}px;margin-left:-${w * 0.14}px;border-radius:99px;background:#0d0d12"></div></div>`;

// ───────── обложки Reels 1080×1920; в сетке профиля видна середина 3:4 (y 240…1680) — всё важное там ─────────
const coverDelo = ({ photo, pos, size = 'cover', label, title, sub, zh, wm, date }) => `
  <div class="ph" style="left:0;top:0;width:1080px;height:1290px;background-image:url('${photo}');background-position:${pos};background-size:${size}"></div>
  <div class="a" style="left:0;right:0;top:1060px;height:240px;background:linear-gradient(transparent,#12121A)"></div>
  <div class="a" style="left:0;right:0;top:1290px;bottom:0;background:#12121A"></div>
  <div class="wm" style="right:-40px;top:1150px">${wm}</div>
  <div class="a chip" style="left:56px;top:288px">${date}</div>
  <div class="a" style="left:60px;right:150px;top:1236px;display:flex;flex-direction:column;gap:14px">
    <div class="lab" style="color:#FFD92E">${label}</div>
    <div style="font:900 84px/1.03 Unbounded;color:#fff;letter-spacing:-.02em">${title}</div>
    <div style="font:600 36px/1.25 Golos;color:#ECEAE3"><span style="font:400 44px MSZ;color:#FFD92E">${zh}</span> · ${sub}</div></div>
  ${seal('right:56px;top:1572px')}`;
const coverManhua = ({ bg, body, bubble, zh, bubSt, tail, sfx, sfxSt }) => `
  <div class="${bg}"></div><div class="speed" style="--sx:68%;--sy:30%"></div>${body}
  <div class="bub" style="${bubSt};--tail:${tail}">${bubble}<small>${zh}</small></div>
  <div class="sfx" style="${sfxSt}">${sfx}</div>${seal('right:56px;top:1572px')}<div class="frm"></div>`;

const COVERS = [
  ['обложки-первый-ряд/yingke-дело.jpg', coverDelo({ photo: U('ykSpeech'), pos: '38% 30%', size: 'auto 1290px', label: 'Дело · визит', title: 'Крупнейшая<br>юрфирма мира', zh: '盈科', sub: 'YingKe, о чём договорились', wm: '法', date: '26.10 · ЧАНША' })],
  ['обложки-первый-ряд/sany-дело.jpg', coverDelo({ photo: U('sanySelfie'), pos: 'center 22%', label: 'Дело · завод', title: 'SANY изнутри', zh: '三一重工', sub: 'встреча с менеджментом и завод', wm: '工', date: '25.10 · ЧАНША' })],
  ['обложки-первый-ряд/yingke-маньхуа.jpg', coverManhua({ bg: 'hy', body: `<img class="cut" src="${U('mic')}" style="left:-60px;bottom:180px;height:1180px">`,
    bubble: 'Крупнейшая юрфирма мира!', zh: '全球最大律所 · 盈科', bubSt: 'right:48px;top:300px;width:600px', tail: '80px', sfx: '哇!', sfxSt: 'right:70px;top:1010px' })
    + `<div class="a" style="left:0;right:0;bottom:0;height:240px;background:#191922"></div><div class="a" style="left:60px;bottom:120px;font:900 56px Unbounded;color:#FFD92E">YingKe · Чанша</div>`],
  ['обложки-первый-ряд/sany-маньхуа.jpg', coverManhua({ bg: 'hr', body: `<div class="ph" style="left:40px;top:250px;width:1000px;height:1380px;background-image:url('${U('sanySelfie')}');background-position:center 30%;border:10px solid #191922;box-shadow:16px 16px 0 #191922;rotate:-1.5deg"></div>`,
    bubble: 'SANY изнутри!', zh: '三一重工', bubSt: 'left:56px;top:300px;width:470px', tail: '70px', sfx: '走!', sfxSt: 'right:60px;top:1330px;color:#FFD92E' })
    + `<div class="a" style="left:0;right:0;bottom:0;height:240px;background:#191922"></div><div class="a" style="left:60px;bottom:120px;font:900 56px Unbounded;color:#FFD92E">Завод · Чанша</div>`],
];

// ───────── аватар 1080×1080 (Instagram показывает круг) ─────────
const AVATARS = [
  ['аватар/A-маньхуа.jpg', `<div class="hy" style="background-size:26px 26px"></div><div class="speed" style="--sx:50%;--sy:36%"></div>
    <img class="cut" src="${U('portrait')}" style="left:50%;bottom:-40px;height:1060px;translate:-50% 0">${seal('left:760px;top:800px;width:96px;height:96px;font-size:72px;line-height:96px')}`],
  ['аватар/B-чернила.jpg', `<div class="hk" style="background-size:26px 26px"></div>
    <div class="a" style="left:40px;top:40px;width:1000px;height:1000px;border-radius:50%;border:16px solid #FFD92E"></div>
    <img class="cut" src="${U('portrait')}" style="left:50%;bottom:-40px;height:1060px;translate:-50% 0">${seal('left:760px;top:800px;width:96px;height:96px;font-size:72px;line-height:96px')}`],
  ['аватар/C-фото-и-печать.jpg', `<div class="ph" style="inset:0;background-image:url('${U('portraitPhoto')}');background-position:center 18%"></div>
    ${seal('left:770px;top:810px;width:96px;height:96px;font-size:72px;line-height:96px')}`],
];

// ───────── карусель «Кто я и чем занимаюсь» 1080×1350 ─────────
const N = 7, num = (i, c = '#FFD92E') => `<div class="a" style="right:56px;top:52px;font:700 28px JB;letter-spacing:.1em;color:${c}">${i}/${N}</div>`;
const stamp = seal('right:52px;bottom:52px');
const head = (lab, title, c = '#FFD92E', tc = '#fff', top = 120) => `<div class="a lab" style="left:64px;top:${top}px;color:${c}">${lab}</div>
  <div class="a" style="left:60px;right:60px;top:${top + 56}px;font:900 76px/1.05 Unbounded;color:${tc};letter-spacing:-.02em;text-wrap:balance">${title}</div>`;
const stat = (n, t, x, y, w = 300) => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px"><div style="font:900 96px/1 Unbounded;color:#FFD92E;letter-spacing:-.03em">${n}</div><div style="margin-top:12px;font:600 30px/1.25 Golos;color:#ECEAE3">${t}</div></div>`;
const li = (t, c = '#ECEAE3', m = '#FFD92E') => `<div style="display:flex;gap:18px;font:500 34px/1.3 Golos;color:${c}"><span style="flex:none;width:16px;height:16px;margin-top:14px;background:${m};rotate:45deg"></span><span>${t}</span></div>`;
const SLIDES = [
  // 1 — обложка, маньхуа
  `<div class="hy"></div><div class="speed" style="--sx:72%;--sy:46%"></div>
   <img class="cut" src="${U('fin')}" style="right:-200px;bottom:-30px;height:1000px">
   <div class="a chip" style="left:56px;top:56px">ОСТАП ДОЦЕНКО · 多增科</div>
   <div class="bub" style="left:56px;top:170px;width:560px;font-size:60px;--tail:90px">Кто я и чем занимаюсь в&nbsp;Китае<small>我在中国做什么？</small></div>
   <div class="sfx" style="left:60px;top:700px;font-size:150px">你好!</div>
   <div class="a" style="left:56px;bottom:56px;background:#191922;color:#FFD92E;font:900 40px Unbounded;padding:20px 26px;box-shadow:8px 8px 0 #E8341C">3 проекта · листай →</div>
   ${num(1, '#191922')}<div class="frm"></div>`,
  // 2 — обо мне
  `<div class="hk"></div><div class="wm" style="right:-60px;top:380px">我</div>${num(2)}
   ${head('Обо мне · 关于我', 'Живу в Шанхае. Строю бизнес между Россией, Китаем и ЮВА')}
   ${stat('13+', 'лет опыта', 64, 640)}${stat('20+', 'стран', 400, 640)}${stat('5', 'языков', 736, 640, 280)}
   <div class="a" style="left:64px;right:64px;top:880px;font:600 34px/1.4 Golos;color:#ECEAE3">Русский · English · <span style="font:400 40px MSZ;color:#FFD92E">中文</span> · 한국어 · O'zbek</div>
   <div class="a" style="left:64px;right:180px;top:990px;font:400 32px/1.4 Golos;color:#A9A7B4">Маркетинг открывает дверь, переговоры садятся за стол — я успеваю и туда, и туда.</div>${stamp}`,
  // 3 — карьера
  `<div class="hk"></div><div class="wm" style="right:-60px;top:420px">路</div>${num(3)}
   ${head('Карьера · 路', 'Ex Alibaba. Ex Сбер.')}
   <div class="a" style="left:56px;right:56px;top:330px;display:grid;gap:26px">
    <div style="background:#1F1F2B;border-left:10px solid #FFD92E;padding:30px 34px"><div style="font:900 110px/1 Unbounded;color:#FFD92E;letter-spacing:-.03em">$48M</div>
     <div style="margin-top:14px;font:600 34px/1.3 Golos;color:#fff">GMV AliExpress Россия и СНГ</div><div style="margin-top:6px;font:500 28px Golos;color:#A9A7B4">Alibaba Group · Head of O2O & New Business · 2020–2022</div></div>
    <div style="background:#1F1F2B;border-left:10px solid #E8341C;padding:30px 34px"><div style="font:900 110px/1 Unbounded;color:#FFD92E;letter-spacing:-.03em">+350%</div>
     <div style="margin-top:14px;font:600 34px/1.3 Golos;color:#fff">рост продавцов за год</div><div style="margin-top:6px;font:500 28px Golos;color:#A9A7B4">Мегамаркет (Сбер) · Head of B2B Marketing · 2023–2025</div></div></div>
   <div class="a" style="left:64px;right:180px;bottom:64px;font:500 30px/1.35 Golos;color:#A9A7B4">С 2025 — свои проекты. Их три →</div>${stamp}`,
  // 4 — GlobalTechTour
  `<div class="ph" style="left:0;top:0;width:1080px;height:640px;background-image:url('${U('group')}');background-position:center 40%"></div>
   <div class="a" style="left:0;right:0;top:500px;height:140px;background:linear-gradient(transparent,#0B1D55)"></div><div class="a" style="left:0;right:0;top:640px;bottom:0;background:radial-gradient(circle at 80% 30%,#1B3A8F 0,#0B1D55 60%,#081440 100%)"></div>
   <div class="wm" style="right:-40px;top:560px;font-size:520px;color:rgba(125,211,252,.10)">游</div>${num(4, '#fff')}
   <div class="a lab" style="left:64px;top:600px;color:#7DD3FC">Проект 1 · 游 экспедиции</div>
   <div class="a" style="left:60px;top:650px;font:900 80px/1 Unbounded;color:#fff;letter-spacing:-.02em">Global Tech Tour</div>
   <div class="a" style="left:64px;right:120px;top:770px;display:grid;gap:18px">
    ${li('Технологические экспедиции в Китай и ЮВА: заводы и R&D-центры BYD, Xiaomi, Baidu, Meituan, Poizon, Leju Robotics', '#ECEAE3', '#7DD3FC')}
    ${li('Корпоративный форум Мегамаркета в Шэньчжэне — 1200+ участников под ключ', '#ECEAE3', '#7DD3FC')}</div>
   <div class="a" style="left:64px;bottom:64px;font:700 30px JB;color:#7DD3FC;letter-spacing:.04em">@globaltech_tour · globaltechtour.ru</div>${stamp}`,
  // 5 — Aura Robotics
  `<div class="hk"></div><div class="wm" style="left:-60px;top:640px;color:rgba(232,52,28,.16)">机</div>${num(5)}
   <div class="a lab" style="left:64px;top:120px;color:#FFD92E">Проект 2 · 机 роботы</div>
   <div class="a" style="left:60px;top:176px;width:560px;font:900 80px/1.02 Unbounded;color:#fff;letter-spacing:-.02em">Aura Robotics</div>
   <div class="a" style="left:64px;top:390px;width:520px;display:grid;gap:22px">
    ${li('Роботы напрямую с заводов Китая: гуманоиды, коботы, AGV, промышленные')}
    ${li('Закупочные поездки по заводам: закрытые визиты, перевод, инженеры рядом')}</div>
   ${stat('100+', 'производителей', 64, 1000, 300)}${stat('17', 'городов Китая', 400, 1000, 220)}
   ${phone('siteAura', 'right:56px;top:190px;rotate:4deg', 380)}
   <div class="a" style="left:64px;bottom:64px;font:700 30px JB;color:#FFD92E;letter-spacing:.04em">aura-robotics.ru</div>${stamp}`,
  // 6 — личный сайт
  `<div class="hy"></div>${num(6, '#191922')}
   <div class="a lab" style="left:64px;top:120px;color:#191922">Проект 3 · 多 личный сайт</div>
   <div class="a" style="left:60px;right:60px;top:176px;font:900 76px/1.05 Unbounded;color:#191922;letter-spacing:-.02em">ostapdotcenko<span style="color:#E8341C">.ru</span></div>
   <div class="a" style="left:64px;top:340px;width:530px;display:grid;gap:24px">
    ${li('Карьера и кейсы — в цифрах', '#191922', '#E8341C')}${li('Консультации по выходу в Китай: WFOE или JV, налоги, банки для клиентов из РФ', '#191922', '#E8341C')}
    ${li('Блог: новая статья каждый день', '#191922', '#E8341C')}${li('Три языка: RU · EN · <span style="font:400 38px MSZ;color:#E8341C">中文</span>', '#191922', '#E8341C')}</div>
   ${phone('siteOd', 'right:56px;top:310px;rotate:-4deg', 380)}
   <div class="a" style="left:56px;bottom:56px;background:#191922;color:#FFD92E;font:900 34px Unbounded;padding:18px 24px;box-shadow:8px 8px 0 #E8341C">Ссылка — в шапке профиля</div>${stamp}<div class="frm"></div>`,
  // 7 — призыв
  `<div class="hr"></div><div class="speed" style="--sx:28%;--sy:60%"></div>${num(7, '#191922')}
   <img class="cut" src="${U('mic')}" style="left:-170px;bottom:-30px;height:860px">
   <div class="bub" style="right:56px;top:120px;width:620px;font-size:54px;--tail:120px">Подпишись: Китай изнутри, роботы и бизнес без глянца<small>关注我！</small></div>
   <div class="a" style="right:56px;top:720px;width:520px;background:#191922;padding:30px 34px;box-shadow:12px 12px 0 #FFD92E;display:grid;gap:16px;font:700 32px JB;color:#fff">
    <div><span style="color:#FFD92E">游</span> globaltechtour.ru</div><div><span style="color:#FFD92E">机</span> aura-robotics.ru</div><div><span style="color:#FFD92E">多</span> ostapdotcenko.ru</div></div>
   <div class="a" style="right:56px;top:1060px;width:520px;font:800 34px/1.25 Golos;color:#fff">Есть вопрос про Китай — пиши в директ</div>${stamp}<div class="frm"></div>`,
];

br = await chromium.launch(); pg = await br.newPage();
if (!only || only === 'covers') for (const [f, b] of COVERS) await shot(1080, 1920, b, `${OUT}/${f}`);
if (!only || only === 'avatar') for (const [f, b] of AVATARS) await shot(1080, 1080, b, `${OUT}/${f}`, 95);
if (!only || only === 'carousel') for (const [i, b] of SLIDES.entries()) await shot(1080, 1350, b, `${OUT}/карусель-кто-я/${String(i + 1).padStart(2, '0')}.jpg`);
if (!only || only === 'sheet') {
  // лист-макет: аватары кругом + первый ряд сетки (3:4) в двух вариантах рамки рядом с живым фото из Чанши
  const T = (src) => `<div style="width:300px;height:400px;background:url('${src}') center/cover"></div>`;
  const F3 = (f) => `file://${OUT}/обложки-первый-ряд/${f}`;
  const row = (name, a, b) => `<div style="margin-top:34px"><div style="font:800 26px Unbounded;margin-bottom:14px">${name}</div><div style="display:flex;gap:4px">${T(F3(a))}${T(F3(b))}${T(SV + 'фото-от-пользователя/остап/из-профиля/2026-10-22-чанша-ярмарка.jpg')}</div></div>`;
  const av = (f, l) => `<div style="text-align:center;font:600 22px Golos"><div style="width:220px;height:220px;border-radius:50%;background:url('file://${OUT}/аватар/${f}') center/cover;box-shadow:0 0 0 4px #fff,0 0 0 7px #d9d9d9;margin-bottom:12px"></div>${l}</div>`;
  await shot(1000, 1500, `<div style="position:absolute;inset:0;background:#EDEAE3;padding:40px 46px">
    <div style="font:900 34px Unbounded">Аватар</div><div style="display:flex;gap:44px;margin-top:20px">${av('A-маньхуа.jpg', 'A · жёлтый растр')}${av('B-чернила.jpg', 'B · чернила + кольцо')}${av('C-фото-и-печать.jpg', 'C · фото + печать')}</div>
    <div style="font:900 34px Unbounded;margin-top:46px">Первый ряд профиля</div>
    ${row('«Дело» — тёмная полоса, как у деловых постов', 'yingke-дело.jpg', 'sany-дело.jpg')}${row('«Маньхуа» — растр, облачко, иероглиф-звук', 'yingke-маньхуа.jpg', 'sany-маньхуа.jpg')}
    <div style="margin-top:22px;font:500 22px/1.4 Golos;color:#55545c">Третья плитка — ваше фото с ярмарки в Чанше: его не меняем (у фото-постов картинку после публикации заменить нельзя).</div></div>`, `${OUT}/_лист-первый-ряд-и-аватар.jpg`, 88);
}
await br.close();
