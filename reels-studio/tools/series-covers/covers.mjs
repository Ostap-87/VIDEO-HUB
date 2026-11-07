// Обложки Reels 1080×1920 для серий без голоса (06.11.2026: «сделай обложки для всех этих роликов, чтобы было сразу понятно,
// о чём речь»): «Робокитай» (Aura) — бумага в клетку, печать города, кадр-сцена серии, вопрос серии с лимонным маркером;
// манхуа-объяснялки ostapdotcenko — жёлтый растр, чернила, красный, печать 多 справа на y 1572, вырезка Остапа, облачко.
// Всё важное — в полосе сетки профиля 3:4 (y 240–1680).
//   node reels-studio/tools/series-covers/covers.mjs [имя …]   → finished-videos/обложки/<папка>/<имя>.jpg + лист _лист.jpg
import { createRequire } from 'module';
import fs from 'fs';
import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = '/home/user/VIDEO-HUB';
const F = `${ROOT}/презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/`;
const SRC = `${ROOT}/source-videos/обложки/robokitai/`;
const u = (p) => 'file://' + p;
const FONTS = `
@font-face{font-family:Unbounded;font-weight:200 900;src:url('${u(F + 'Unbounded-variable.ttf')}')}
@font-face{font-family:Golos;font-weight:400 900;src:url('${u(F + 'GolosText-variable.ttf')}')}
@font-face{font-family:JB;font-weight:100 800;src:url('${u(F + 'JetBrainsMono-variable.ttf')}')}
@font-face{font-family:MSZ;src:url('${u(ROOT + '/интернет-материалы/шрифты/ma-shan-zheng.woff2')}') format('woff2')}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1920px;overflow:hidden;position:relative}`;
const AR = fs.readFileSync(`${ROOT}/source-videos/aura-robotics/логотип/ar-monogram.svg`, 'utf8');

// ——— Робокитай ———
const RK = [
  // Серия 0 — своя раскладка (07.11.2026, пользователь: «не очень красивая… чтобы было понятно, что это Китай, и чтобы всех
  // персонажей было видно»): красная карта Китая, 16 героев целиком (вырезки из портретов AuraCast), ряд 8 печатей краёв
  { name: 'robokitai-000-trailer', kind: 'map', ep: 'СЕРИЯ 0', title: 'Добро пожаловать в <mark>Робокитай</mark>' },
  // Серии 1–3 — яркие (07.11.2026, пользователь: «и для других серий сделай более яркие обложки, чтобы интересно было»):
  // свой цвет фона серии, линии концентрации манхуа, герои серии крупно (вырезки), деталь сюжета, мини-карта Китая с точкой города
  { name: 'robokitai-001-hangzhou', kind: 'bright', theme: 'yellow', ep: 'СЕРИЯ 1', stamp: '杭', mapCity: 'Ханчжоу',
    title: 'Склад <mark>не успевает</mark>.<br>AGV или AMR?', city: 'Ханчжоу', zh: '杭州',
    tag: 'край складских машин', note: 'Рыжик или Шустрик — кто?',
    heroes: [['12-agv', 'Шустрик · AGV', 270, 1330, 400], ['13-agv-orange', 'Рыжик · AMR', 805, 1330, 300], ['02-dog', 'Скаут', 540, 1365, 215]],
    extra: '<div class="burst" style="left:395px;top:800px;width:290px;height:290px"><b>VS</b></div>' },
  { name: 'robokitai-001-hangzhou-v2', kind: 'bright', theme: 'red', ep: 'СЕРИЯ 1', stamp: '杭', sealAt: 'left', mapCity: 'Ханчжоу',
    title: 'Склад<br><mark>не успевает</mark>', city: 'Ханчжоу', zh: '杭州',
    tag: 'край складских машин', note: 'Рыжик застрял у порога!',
    heroes: [['13-agv-orange', 'Рыжик · AMR', 480, 1305, 430, '', -6]],
    extra: '<div class="hazard"><span>ПОРОГ</span></div><div class="timer"><i>ДО 11.11</i><b>2 дня</b></div><div class="alert" style="left:230px;top:700px">!</div>' },
  { name: 'robokitai-002-suzhou', kind: 'bright', theme: 'blue', ep: 'СЕРИЯ 2', stamp: '苏', mapCity: 'Сучжоу',
    title: 'Какой <mark>кобот</mark><br>нужен цеху?', city: 'Сучжоу', zh: '苏州',
    tag: 'край коботов', note: 'Деталь 4 кг → кобот на 8–10 кг',
    heroes: [['09-cobot', 'Тихон · кобот на 5 кг', 380, 1340, 640], ['07-arm', 'Арми', 860, 1340, 380]],
    extra: '<svg class="string" viewBox="0 0 1080 1920"><path d="M590 790 Q 640 820 668 846"/></svg><div class="weight" style="left:640px;top:830px">4 кг</div><div class="alert sm" style="left:120px;top:820px">!</div>' },
  { name: 'robokitai-003-shenzhen', kind: 'bright', theme: 'orange', ep: 'СЕРИЯ 3', stamp: '深', mapCity: 'Шэньчжэнь',
    title: 'Чем робот<br>будет <mark>брать</mark>?', city: 'Шэньчжэнь', zh: '深圳',
    tag: 'город железа', note: 'Сначала захват — потом робот',
    heroes: [['14-drone', 'Сокол', 545, 790, 115, 'fly'], ['10-hand', 'Пятёрка', 320, 1345, 600], ['11-hand-chrome', 'Рубин', 770, 1345, 600]],
    extra: '<div class="qmark" style="left:450px;top:850px">?</div>' },
  // Серии 4–8 (06.11.2026): свой цвет у каждой (не жёлтый/красный/синий/оранжевый), герои края, деталь сюжета
  { name: 'robokitai-004-shenyang', kind: 'bright', theme: 'violet', ep: 'СЕРИЯ 4', stamp: '沈', mapCity: 'Шэньян',
    title: 'Где сварочный<br>робот <mark>окупается</mark>?', city: 'Шэньян', zh: '沈阳',
    tag: 'северная кузница', note: 'Дуга горит 70–80 % смены',
    heroes: [['08-arm-industrial', 'Титан · сварка', 400, 1340, 640], ['02-dog', 'Скаут', 860, 1340, 210]],
    extra: '<div class="spark" style="left:560px;top:660px"></div><div class="gauge"><i>ДУГА ГОРИТ</i><b>70–80 %</b><span><s style="width:76%"></s></span></div>' },
  { name: 'robokitai-005-shanghai', kind: 'bright', theme: 'pink', ep: 'СЕРИЯ 5', stamp: '沪', mapCity: 'Шанхай',
    title: 'Окупится ли<br><mark>робот в отеле</mark>?', city: 'Шанхай', zh: '上海',
    tag: 'край сервисных роботов', note: 'Без лифта — робот одного этажа',
    heroes: [['06-wheel-humanoid-navy', 'Кэрри', 380, 1345, 560], ['05-wheel-humanoid', 'Роли', 790, 1345, 440]],
    extra: '<div class="clock">23:40</div><div class="door"><b>7</b></div>' },
  { name: 'robokitai-006-beijing', kind: 'bright', theme: 'mint', ep: 'СЕРИЯ 6', stamp: '京', mapCity: 'Пекин',
    title: 'Гуманоид<br>для <mark>кафедры</mark>', city: 'Пекин', zh: '北京',
    tag: 'край зрения', note: 'Его покупают, чтобы он падал',
    heroes: [['03-humanoid', 'Леон · 1,3 м', 360, 1345, 600], ['04-humanoid-navy', 'Нова · 1,2 м', 760, 1345, 545]],
    extra: '<div class="mat"></div><div class="steps"><i>ШАГ</i><b>30</b></div>' },
  { name: 'robokitai-007-zastava', kind: 'bright', theme: 'slate', ep: 'СЕРИЯ 7', stamp: '关', mapCity: 'Застава',
    title: 'Как робот<br>едет <mark>через границу</mark>?', city: 'Застава', zh: '边境',
    tag: 'граница: логистика и таможня', note: 'Батарея робота — опасный груз',
    heroes: [['16-cargo-drone', 'Аист', 330, 900, 230, 'fly'], ['12-agv', 'Шустрик', 700, 1345, 420]],
    extra: '<div class="barrier"></div><div class="crate"></div><div class="stampbox" style="left:110px;top:930px">UN 3481</div>' },
  { name: 'robokitai-008-guangdong', kind: 'bright', theme: 'lime', ep: 'СЕРИЯ 8 · ФИНАЛ', stamp: '粤', mapCity: 'Гуанчжоу',
    title: 'Пельмени<br><mark>на конвейере</mark>', city: 'Гуандун', zh: '广东',
    tag: 'кухонный край', note: 'Узкое место линии — заморозка',
    heroes: [['07-arm', 'Арми', 330, 1345, 560], ['06-wheel-humanoid-navy', 'Кэрри', 780, 1345, 470]],
    extra: '<div class="jiaozi" style="left:520px;top:1150px"></div><div class="jiaozi" style="left:610px;top:1185px;rotate:12deg"></div><div class="jiaozi" style="left:430px;top:1190px;rotate:-10deg"></div><div class="sticker">15 000 шт/ч?</div>' },
  // Сезон 2 (07.11.2026): бирюзовая плашка «СЕЗОН 2 · СЕРИЯ N» (season: 2), свои цвета — cyan (ночная подстанция) и teal (цвет сезона)
  { name: 'robokitai-009-hangzhou', kind: 'bright', theme: 'cyan', season: 2, ep: 'СЕЗОН 2 · СЕРИЯ 1', stamp: '杭', mapCity: 'Ханчжоу',
    title: 'Окупится ли<br><mark>робот-обходчик</mark>?', city: 'Ханчжоу', zh: '杭州',
    tag: 'край четвероногих', note: 'Цена обхода, которого не было',
    heroes: [['13-agv-orange', 'Рыжик', 255, 1350, 250], ['02-dog', 'Скаут · обходчик', 650, 1350, 360]],
    extra: '<div class="snow"></div><div class="thermo"><i>ТЕПЛОВИЗОР · 03:00</i><svg viewBox="0 0 400 200"><defs><radialGradient id="hg"><stop offset="0" stop-color="#FFFBD6"/><stop offset=".3" stop-color="#FFD84A"/><stop offset=".6" stop-color="#F5892B"/><stop offset="1" stop-color="#D63A3A" stop-opacity="0"/></radialGradient></defs><rect width="400" height="200" fill="#17114F"/><rect x="20" y="70" width="350" height="12" rx="6" fill="#8E1F8F"/><g fill="#5A1A8A"><rect x="72" y="80" width="14" height="120"/><rect x="193" y="80" width="14" height="120"/><rect x="314" y="80" width="14" height="120"/></g><circle cx="79" cy="76" r="22" fill="#8E1F8F"/><circle cx="321" cy="76" r="22" fill="#8E1F8F"/><circle cx="200" cy="76" r="64" fill="url(#hg)"/><path d="M164 76h20M216 76h20M200 40v20M200 92v20" stroke="#fff" stroke-width="4"/></svg><b>2</b></div>' },
  { name: 'robokitai-010-zastava', kind: 'bright', theme: 'teal', season: 2, ep: 'СЕЗОН 2 · СЕРИЯ 2', stamp: '关', mapCity: 'Застава',
    title: 'Робот приехал —<br><mark>а не работает</mark>', city: 'Застава', zh: '边境',
    tag: 'граница: логистика и таможня', note: 'Место готовят раньше робота',
    heroes: [['08-arm-industrial', 'Титан · в ящике', 470, 1330, 560], ['12-agv', 'Шустрик', 875, 1355, 190]],
    extra: '<div class="box2back"></div><div class="box2front"></div><div class="phone2" style="left:70px;top:820px;rotate:-12deg"><span></span></div><div class="phone2" style="left:820px;top:880px;rotate:10deg"><span></span></div><div class="say" style="left:70px;top:650px">Ну что, когда?</div>' },
];
const rkHtml = (c) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${FONTS}
body{background:#F3F0E8;background-image:linear-gradient(#E3DED2 1.5px,transparent 1.5px),linear-gradient(90deg,#E3DED2 1.5px,transparent 1.5px);background-size:54px 54px;font-family:Golos;color:#16161C}
.hdr{position:absolute;top:262px;left:64px;right:64px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:18px;font:700 30px JB;letter-spacing:.08em}
.seal{width:62px;height:62px;background:#D6262B;color:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;font:64px MSZ}
.brand .zh{color:#D6262B;font:38px MSZ;letter-spacing:0}
.ep{background:#16161C;color:#fff;font:800 32px JB;letter-spacing:.06em;padding:12px 22px;border-radius:12px}
h1{position:absolute;top:350px;left:64px;right:48px;font:900 112px/1.04 Golos;letter-spacing:-.02em}
mark{background:linear-gradient(transparent 52%,#F4E35B 52%,#F4E35B 92%,transparent 92%);color:inherit;padding:0 6px}
.card{position:absolute;top:640px;left:56px;right:56px;height:650px;border:8px solid #16161C;border-radius:34px;overflow:hidden;box-shadow:14px 14px 0 #16161C;background:#fff}
.card img{width:100%;height:100%;object-fit:cover;object-position:${c.pos};display:block}
.stamp{position:absolute;top:592px;right:34px;width:156px;height:156px;background:#D6262B;color:#fff;border-radius:20px;transform:rotate(7deg);display:flex;align-items:center;justify-content:center;font:150px/1 MSZ;box-shadow:0 8px 0 rgba(0,0,0,.18);border:5px solid #fff}
.info{position:absolute;top:1338px;left:64px;right:64px;display:flex;flex-direction:column;gap:16px;align-items:flex-start}
.city{display:flex;align-items:baseline;gap:22px;flex-wrap:wrap}
.city b{font:900 92px/1 Golos;text-transform:uppercase;letter-spacing:-.01em}
.city .zh{font:80px/1 MSZ;color:#D6262B}
.city .tag{font:700 46px Golos;color:#3E3D45;width:100%;margin-top:4px}
.note{max-width:960px;background:#16161C;color:#fff;font:800 52px/1.15 Golos;padding:20px 30px;border-radius:16px}
.note::before{content:"";display:inline-block;width:22px;height:22px;border-radius:50%;background:#F4E35B;margin-right:16px;vertical-align:4px}
.foot{position:absolute;top:1700px;left:64px;right:64px;display:flex;align-items:center;gap:18px;font:700 36px JB;color:#3E3D45}
.foot svg{width:58px;height:58px}
</style></head><body>
<div class="hdr"><div class="brand"><span class="seal">机</span>РОБОКИТАЙ <span class="zh">机器人中国</span></div><div class="ep">${c.ep}</div></div>
<h1>${c.title}</h1>
<div class="card"><img src="${u(SRC + c.img)}"></div>
<div class="stamp">${c.stamp}</div>
<div class="info"><div class="city"><b>${c.city}</b>${c.zh ? `<span class="zh">${c.zh}</span>` : ''}<span class="tag">${c.tag}</span></div>
<div class="note">${c.note}</div></div>
<div class="foot">${AR}<span>aura-robotics.ru/blog</span></div>
<script>window.fit=()=>{const h=document.querySelector('h1');let f=112;h.style.fontSize=f+'px';while(h.offsetHeight>2.2*f&&f>60){f-=4;h.style.fontSize=f+'px'}}</script>
</body></html>`;

// Серия 0: карта Китая из chinaMap.ts (Natural Earth, общественное достояние) + герои. Вырезки героев —
// source-videos/обложки/robokitai/герои/NN-*.png (scripts/cutout.py --crop 64,102,952,906 из портретов aura-персонажи/NN-*.png).
// Герой: [файл, имя, центр x, низ y, высота, флаги] — fly: летит (тень ниже), lead: плашка на лимонном маркере.
const HERO = `${ROOT}/source-videos/обложки/robokitai/герои/`;
const MAP_TS = fs.readFileSync(`${ROOT}/reels-studio/src/compositions/robokitai/chinaMap.ts`, 'utf8');
const CHINA = JSON.parse(MAP_TS.match(/CHINA_PATHS: string\[\] = (\[.*?\]);/s)[1]);
const CAST0 = [
  ['14-drone', 'Сокол', 215, 760, 118, 'fly'], ['16-cargo-drone', 'Аист', 470, 770, 150, 'fly'], ['15-drone-white', 'Стриж', 900, 790, 118, 'fly'],
  ['08-arm-industrial', 'Титан', 165, 1040, 235], ['07-arm', 'Арми', 385, 1040, 235], ['01-mascot', 'Ави', 610, 1028, 285, 'lead'],
  ['09-cobot', 'Тихон', 845, 1040, 235],
  ['03-humanoid', 'Леон', 105, 1290, 250], ['04-humanoid-navy', 'Нова', 255, 1290, 250], ['05-wheel-humanoid', 'Роли', 425, 1290, 250],
  ['06-wheel-humanoid-navy', 'Кэрри', 575, 1290, 222], ['10-hand', 'Пятёрка', 735, 1290, 230], ['11-hand-chrome', 'Рубин', 885, 1290, 230],
  ['02-dog', 'Скаут', 230, 1500, 200], ['12-agv', 'Шустрик', 535, 1500, 195], ['13-agv-orange', 'Рыжик', 835, 1500, 180],
];
const SEALS0 = ['杭', '苏', '沪', '京', '深', '粤', '沈', '关'];
const rk0Html = (c) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${FONTS}
body{background:#F3F0E8;background-image:linear-gradient(#E3DED2 1.5px,transparent 1.5px),linear-gradient(90deg,#E3DED2 1.5px,transparent 1.5px);background-size:54px 54px;font-family:Golos;color:#16161C}
.hdr{position:absolute;top:262px;left:64px;right:64px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:18px;font:700 30px JB;letter-spacing:.08em}
.seal{width:62px;height:62px;background:#D6262B;color:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;font:64px MSZ}
.brand .zh{color:#D6262B;font:38px MSZ;letter-spacing:0}
.ep{background:#16161C;color:#fff;font:800 32px JB;letter-spacing:.06em;padding:12px 22px;border-radius:12px}
h1{position:absolute;top:346px;left:64px;right:40px;font:900 108px/1.04 Golos;letter-spacing:-.02em}
mark{background:linear-gradient(transparent 52%,#F4E35B 52%,#F4E35B 92%,transparent 92%);color:inherit;padding:0 6px}
.map{position:absolute;left:22px;top:585px;width:1036px}
.map .sh{fill:#16161C;transform:translate(9px,9px)}
.map .land{fill:#D6262B;stroke:#16161C;stroke-width:3.2;stroke-linejoin:round}
.h{position:absolute;transform:translateX(-50%)}
.h img{display:block;height:100%;width:auto;margin:0 auto;position:relative;filter:drop-shadow(0 3px 0 rgba(22,22,28,.35))}
.h .gs{position:absolute;left:50%;bottom:-10px;width:78%;height:26px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(22,22,28,.55),rgba(22,22,28,0))}
.h.fly .gs{bottom:-46px;width:60%;opacity:.55}
.nm{position:absolute;transform:translateX(-50%);background:#fff;border:3px solid #16161C;border-radius:30px;padding:3px 16px 5px;font:800 31px Golos;white-space:nowrap;box-shadow:4px 4px 0 #16161C;z-index:5}
.nm.lead{background:#F4E35B;font-size:36px}
.seals{position:absolute;top:1560px;left:64px;right:64px;display:flex;align-items:center;justify-content:space-between}
.seals span{width:94px;height:94px;background:#D6262B;color:#fff;border-radius:14px;display:flex;align-items:center;justify-content:center;font:84px/1 MSZ;border:4px solid #fff;box-shadow:5px 5px 0 #16161C}
.seals span:nth-child(odd){transform:rotate(-5deg)}.seals span:nth-child(even){transform:rotate(4deg)}
.cap{position:absolute;top:1684px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:center;font:800 42px Golos;white-space:nowrap}
.cap i{font-style:normal;font:700 32px JB;color:#3E3D45;display:flex;align-items:center;gap:12px;white-space:nowrap}
.cap svg{width:50px;height:50px}
</style></head><body>
<div class="hdr"><div class="brand"><span class="seal">机</span>РОБОКИТАЙ <span class="zh">机器人中国</span></div><div class="ep">${c.ep}</div></div>
<h1>${c.title}</h1>
<svg class="map" viewBox="0 0 1000 839.1">${CHINA.map((d) => `<path class="sh" d="${d}"/>`).join('')}${CHINA.map((d) => `<path class="land" d="${d}"/>`).join('')}</svg>
${CAST0.map(([f, n, x, y, h, fl]) => `<div class="h ${fl || ''}" style="left:${x}px;top:${y - h}px;height:${h}px"><span class="gs"></span><img src="${u(HERO + f + '.png')}"></div>`).join('\n')}
${CAST0.map(([, n, x, y, h, fl]) => `<span class="nm ${fl || ''}" style="left:${x}px;top:${fl === 'fly' ? y - h - 30 : y - 26}px">${n}</span>`).join('')}
<div class="seals">${SEALS0.map((s) => `<span>${s}</span>`).join('')}</div>
<div class="cap"><span>16 героев · 8 краёв Китая</span><i>${AR}aura-robotics.ru</i></div>
<script>window.fit=()=>{const h=document.querySelector('h1');let f=108;h.style.fontSize=f+'px';while(h.offsetHeight>2.2*f&&f>60){f-=4;h.style.fontSize=f+'px'}}</script>
</body></html>`;

// Серии 1–3: яркий фон серии + линии концентрации + герои + деталь сюжета (`extra`) + мини-карта с точкой города (`CITY_XY`).
// Герой: [файл, подпись, центр x, низ y, высота, 'fly' | '', поворот°].
const CITY_XY = JSON.parse(MAP_TS.match(/CITY_XY: Record<string, \[number, number\]> = (\{.*?\});/s)[1]);
const THEMES = {
  yellow: { bg: '#FFD83A', ln: 'rgba(22,22,28,.13)', fg: '#16161C', sub: '#3E3D45', mk: '#fff', land: '#D6262B', dot: '#FFD83A' },
  red: { bg: '#E3312D', ln: 'rgba(255,255,255,.16)', fg: '#fff', sub: '#FFE3DF', mk: '#FFD83A', land: '#fff', dot: '#E3312D' },
  blue: { bg: '#52ABFF', ln: 'rgba(255,255,255,.22)', fg: '#16161C', sub: '#123056', mk: '#FFD83A', land: '#D6262B', dot: '#FFD83A' },
  orange: { bg: '#FF8B2C', ln: 'rgba(22,22,28,.12)', fg: '#16161C', sub: '#4A2508', mk: '#fff', land: '#D6262B', dot: '#FFD83A' },
  // серии 4–8
  violet: { bg: '#7B5CFF', ln: 'rgba(255,255,255,.18)', fg: '#fff', sub: '#EDE7FF', mk: '#FFD83A', land: '#fff', dot: '#FFD83A', dark: true },
  pink: { bg: '#FF7BB5', ln: 'rgba(22,22,28,.12)', fg: '#16161C', sub: '#5A1636', mk: '#fff', land: '#D6262B', dot: '#FFD83A' },
  mint: { bg: '#34C997', ln: 'rgba(22,22,28,.12)', fg: '#16161C', sub: '#0F4A36', mk: '#fff', land: '#D6262B', dot: '#FFD83A' },
  slate: { bg: '#26324A', ln: 'rgba(255,255,255,.12)', fg: '#fff', sub: '#C9D6EA', mk: '#FFD83A', land: '#fff', dot: '#E3312D', dark: true },
  lime: { bg: '#B8E04A', ln: 'rgba(22,22,28,.12)', fg: '#16161C', sub: '#3A4A10', mk: '#fff', land: '#D6262B', dot: '#E3312D' },
  // сезон 2
  cyan: { bg: '#22C3E6', ln: 'rgba(22,22,28,.12)', fg: '#16161C', sub: '#0B3A4A', mk: '#fff', land: '#D6262B', dot: '#FFD83A' },
  teal: { bg: '#0E9C8E', ln: 'rgba(255,255,255,.16)', fg: '#fff', sub: '#D6F5F0', mk: '#FFD83A', land: '#fff', dot: '#E3312D', dark: true },
};
const heroDivs = (list) => list.map(([f, , x, y, h, fl, rot]) => `<div class="h ${fl || ''}" style="left:${x}px;top:${y - h}px;height:${h}px;${rot ? `rotate:${rot}deg;` : ''}"><span class="gs"></span><img src="${u(HERO + f + '.png')}"></div>`).join('\n')
  + list.map(([, n, x, y, h, fl]) => `<span class="nm" style="left:${x}px;top:${fl === 'fly' ? y - h - 30 : y - 26}px">${n}</span>`).join('');
const rkBright = (c) => {
  const t = THEMES[c.theme];
  const [mx, my] = CITY_XY[c.mapCity];
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${FONTS}
body{background:${t.bg};font-family:Golos;color:${t.fg}}
.rays{position:absolute;inset:0;background:repeating-conic-gradient(from 0deg at 50% 54%,${t.ln} 0 2.4deg,transparent 2.4deg 7.5deg);-webkit-mask-image:radial-gradient(circle at 50% 54%,transparent 22%,#000 52%)}
.dots{position:absolute;inset:0;background-image:radial-gradient(${t.ln} 2.4px,transparent 2.8px);background-size:20px 20px;-webkit-mask-image:linear-gradient(180deg,#000 0,transparent 30%,transparent 70%,#000 100%)}
.hdr{position:absolute;top:262px;left:56px;right:64px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:16px;font:700 30px JB;letter-spacing:.08em;background:#fff;color:#16161C;padding:8px 20px 8px 8px;border-radius:14px;border:3px solid #16161C;box-shadow:5px 5px 0 #16161C}
.seal{width:56px;height:56px;background:#D6262B;color:#fff;border-radius:9px;display:flex;align-items:center;justify-content:center;font:58px MSZ}
.brand .zh{color:#D6262B;font:36px MSZ;letter-spacing:0}
.ep{background:${c.season ? (c.theme === 'teal' ? '#fff' : '#0E9C8E') : '#16161C'};color:${c.season && c.theme === 'teal' ? '#0E7A6F' : '#fff'};font:800 32px JB;letter-spacing:.06em;padding:12px 22px;border-radius:12px;box-shadow:5px 5px 0 ${c.season ? '#16161C' : 'rgba(0,0,0,.25)'};${c.season ? 'border:3px solid #16161C;rotate:-2deg;' : ''}}
h1{position:absolute;top:350px;left:60px;right:44px;font:900 112px/1.04 Golos;letter-spacing:-.02em;${c.theme === 'red' || t.dark ? 'text-shadow:6px 6px 0 #16161C;' : ''}}
mark{background:${t.mk};color:#16161C;padding:0 14px;border-radius:12px;box-shadow:6px 6px 0 #16161C;text-shadow:none;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.stamp{position:absolute;top:600px;${c.sealAt === 'left' ? 'left:44px;rotate:-7deg' : 'right:40px;rotate:7deg'};width:150px;height:150px;background:#D6262B;color:#fff;border-radius:20px;display:flex;align-items:center;justify-content:center;font:144px/1 MSZ;box-shadow:8px 8px 0 #16161C;border:5px solid #fff;z-index:6}
.h{position:absolute;translate:-50% 0}
.h img{display:block;height:100%;width:auto;margin:0 auto;position:relative;filter:drop-shadow(5px 6px 0 rgba(22,22,28,.45))}
.h .gs{position:absolute;left:50%;bottom:-12px;width:80%;height:30px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(22,22,28,.5),rgba(22,22,28,0))}
.h.fly .gs{bottom:-50px;width:60%;opacity:.5}
.nm{position:absolute;transform:translateX(-50%);background:#fff;color:#16161C;border:3px solid #16161C;border-radius:30px;padding:4px 18px 6px;font:800 34px Golos;white-space:nowrap;box-shadow:5px 5px 0 #16161C;z-index:7}
.burst{position:absolute;display:flex;align-items:center;justify-content:center;background:#E3312D;clip-path:polygon(50% 0,61% 22%,85% 8%,78% 34%,100% 42%,80% 56%,95% 80%,68% 74%,60% 100%,47% 78%,25% 96%,25% 70%,0 66%,18% 48%,4% 24%,30% 28%);z-index:5}
.burst b{font:900 120px/1 Golos;color:#fff;-webkit-text-stroke:5px #16161C;paint-order:stroke;letter-spacing:-.04em;rotate:-8deg}
.alert{position:absolute;width:170px;height:150px;background:#FFD83A;clip-path:polygon(50% 0,100% 100%,0 100%);display:flex;align-items:flex-end;justify-content:center;font:900 112px/1.1 Golos;color:#16161C;z-index:5;filter:drop-shadow(0 0 0 #16161C)}
.alert.sm{width:120px;height:106px;font-size:80px}
.timer{position:absolute;left:650px;top:640px;width:360px;background:#fff;border:6px solid #16161C;border-radius:22px;box-shadow:10px 10px 0 #16161C;rotate:4deg;text-align:center;padding:16px 0 18px;z-index:6}
.timer i{display:block;font:700 36px JB;font-style:normal;color:#3E3D45;letter-spacing:.06em}
.timer b{display:block;font:900 118px/1 Golos;color:#E3312D}
.hazard{position:absolute;left:-30px;right:-30px;top:1262px;height:70px;background:repeating-linear-gradient(-45deg,#FFD83A 0 40px,#16161C 40px 80px);border-top:5px solid #16161C;border-bottom:5px solid #16161C;rotate:-2deg}
.hazard span{position:absolute;right:120px;top:-62px;background:#16161C;color:#FFD83A;font:800 34px JB;padding:6px 16px;border-radius:10px;letter-spacing:.08em}
.weight{position:absolute;width:190px;height:150px;background:#fff;border:6px solid #16161C;border-radius:14px 14px 30px 30px;box-shadow:8px 8px 0 #16161C;display:flex;align-items:center;justify-content:center;font:900 68px/1 Golos;color:#E3312D;rotate:8deg;z-index:6}
.weight::before{content:"";position:absolute;top:14px;left:50%;width:22px;height:22px;margin-left:-11px;border-radius:50%;border:5px solid #16161C}
.string{position:absolute;inset:0;z-index:5}.string path{fill:none;stroke:#16161C;stroke-width:5}
.qmark{position:absolute;font:900 300px/1 Golos;color:#fff;-webkit-text-stroke:9px #16161C;paint-order:stroke;text-shadow:12px 12px 0 #16161C;rotate:10deg;z-index:5}
.row{position:absolute;top:1400px;left:56px;right:56px;display:flex;align-items:center;gap:26px}
.mini{width:236px;flex:none}
.mini .sh{fill:#16161C;transform:translate(14px,14px)}
.mini .land{fill:${t.land};stroke:#16161C;stroke-width:9;stroke-linejoin:round}
.mini .dt{fill:${t.dot};stroke:#16161C;stroke-width:9}
.city{display:flex;flex-direction:column;gap:6px;min-width:0}
.city b{font:900 86px/1 Golos;text-transform:uppercase;letter-spacing:-.01em;white-space:nowrap}
.city b span{font:76px/1 MSZ;color:${c.theme === 'red' || t.dark ? '#FFD83A' : '#D6262B'};text-transform:none;margin-left:16px}
.city i{font:700 44px Golos;font-style:normal;color:${t.sub}}
.note{position:absolute;top:1590px;left:56px;max-width:968px;background:#16161C;color:#fff;font:800 52px/1.15 Golos;padding:18px 30px 20px;border-radius:16px;box-shadow:7px 7px 0 ${c.theme === 'red' || t.dark ? '#FFD83A' : '#fff'}}
/* детали серий 4–8 */
.spark{position:absolute;width:250px;height:250px;background:radial-gradient(circle,#fff 0 9%,#FFE7A3 14%,rgba(255,154,60,.75) 30%,rgba(255,154,60,0) 62%);z-index:6}
.spark::before{content:"";position:absolute;inset:-40px;background:repeating-conic-gradient(from 8deg,#FFD27A 0 3deg,transparent 3deg 22deg);-webkit-mask-image:radial-gradient(circle,transparent 18%,#000 24%,transparent 62%)}
.gauge{position:absolute;left:600px;top:820px;width:430px;background:#fff;color:#16161C;border:6px solid #16161C;border-radius:22px;box-shadow:9px 9px 0 #16161C;padding:14px 22px 18px;rotate:4deg;z-index:7}
.gauge i{display:block;font:700 30px JB;font-style:normal;letter-spacing:.06em;color:#3E3D45}
.gauge b{display:block;font:900 78px/1.05 Golos;color:#1F8A4C;white-space:nowrap}
.gauge span{display:block;height:26px;border:5px solid #16161C;border-radius:14px;overflow:hidden;background:#EEE}
.gauge s{display:block;height:100%;background:#1F8A4C}
.clock{position:absolute;left:600px;top:790px;background:#121214;color:#FFD83A;font:800 120px/1 JB;padding:14px 28px 18px;border-radius:24px;border:6px solid #fff;box-shadow:10px 10px 0 #16161C;rotate:5deg;z-index:6}
.door{position:absolute;left:96px;top:700px;width:200px;height:300px;background:#8B6A4E;border:7px solid #16161C;border-radius:10px;box-shadow:9px 9px 0 #16161C;rotate:-5deg;z-index:2}
.door b{position:absolute;right:20px;top:26px;background:#FFD83A;border:4px solid #16161C;border-radius:8px;font:900 54px/1 Golos;color:#16161C;padding:4px 14px}
.mat{position:absolute;left:-20px;right:-20px;top:1255px;height:110px;background:#2B6CB0;border-top:6px solid #16161C;border-bottom:6px solid #16161C;rotate:-1.5deg}
.steps{position:absolute;left:868px;top:840px;background:#FFD83A;color:#16161C;border:6px solid #16161C;border-radius:22px;box-shadow:9px 9px 0 #16161C;padding:8px 26px 14px;text-align:center;rotate:6deg;z-index:7}
.steps i{display:block;font:700 30px JB;font-style:normal;letter-spacing:.12em}
.steps b{display:block;font:900 120px/1 Golos}
.barrier{position:absolute;left:-40px;right:120px;top:1150px;height:56px;background:repeating-linear-gradient(90deg,#E3312D 0 90px,#fff 90px 180px);border:6px solid #16161C;rotate:-7deg;box-shadow:8px 8px 0 #16161C}
.crate{position:absolute;left:80px;top:1000px;width:360px;height:260px;background:repeating-linear-gradient(0deg,#C9A46A 0 50px,rgba(0,0,0,.28) 50px 72px);border:9px solid #8A6A3A;border-radius:8px;box-shadow:10px 10px 0 #16161C;z-index:0}
.stampbox{position:absolute;white-space:nowrap;border:7px solid #FFD83A;color:#FFD83A;font:800 58px JB;padding:4px 20px;border-radius:12px;rotate:-10deg;z-index:8;background:rgba(22,22,28,.55)}
.jiaozi{position:absolute;width:150px;height:84px;background:#F6EEDC;border:6px solid #16161C;border-radius:80px 80px 14px 14px;box-shadow:6px 6px 0 #16161C;z-index:8}
.jiaozi::after{content:"";position:absolute;left:24px;right:24px;top:10px;height:22px;background:repeating-linear-gradient(90deg,#16161C 0 5px,transparent 5px 22px);opacity:.5;border-radius:10px}
.sticker{position:absolute;left:560px;top:790px;white-space:nowrap;background:#fff;color:#E3312D;border:6px solid #16161C;border-radius:18px;box-shadow:9px 9px 0 #16161C;font:900 58px/1 Golos;padding:16px 24px;rotate:6deg;z-index:7}
/* сезон 2: снег, снимок тепловизора, ящик, телефоны со вспышкой, реплика */
.snow{position:absolute;inset:0;background-image:radial-gradient(#fff 0 5px,transparent 6px),radial-gradient(#fff 0 3.5px,transparent 4.5px);background-size:150px 170px,90px 110px;background-position:20px 40px,60px 10px;opacity:.75;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 30%,#000 66%,transparent 74%)}
.thermo{position:absolute;left:66px;top:700px;width:430px;background:#16161C;border:7px solid #16161C;border-radius:20px;box-shadow:10px 10px 0 #fff;rotate:-5deg;overflow:hidden;z-index:6}
.thermo i{display:block;font:700 26px JB;font-style:normal;color:#fff;letter-spacing:.08em;padding:6px 12px 8px}
.thermo svg{display:block;width:100%}
.thermo b{position:absolute;left:186px;top:52px;width:52px;height:52px;border-radius:50%;background:#fff;border:5px solid #16161C;font:900 36px/42px Golos;text-align:center;color:#16161C}
.box2back{position:absolute;left:190px;top:900px;width:560px;height:430px;background:repeating-linear-gradient(0deg,#C9A46A 0 58px,#8A6A3A 58px 74px);border:9px solid #6E5230;border-radius:8px;box-shadow:10px 10px 0 #16161C;z-index:0}
.box2front{position:absolute;left:150px;top:1180px;width:640px;height:180px;background:repeating-linear-gradient(0deg,#D8B47A 0 52px,#8A6A3A 52px 66px);border:9px solid #6E5230;border-radius:8px;box-shadow:10px 10px 0 #16161C;z-index:6}
.phone2{position:absolute;width:150px;height:250px;background:#16161C;border-radius:26px;border:6px solid #fff;box-shadow:8px 8px 0 #16161C;z-index:7}
.phone2 span{position:absolute;left:50%;top:-70px;width:150px;height:150px;margin-left:-75px;background:radial-gradient(circle,#fff 0 18%,rgba(255,246,170,.9) 30%,rgba(255,246,170,0) 62%)}
.phone2 span::before{content:"";position:absolute;inset:-20px;background:repeating-conic-gradient(#FFF6AA 0 4deg,transparent 4deg 24deg);-webkit-mask-image:radial-gradient(circle,transparent 20%,#000 26%,transparent 66%)}
.say{position:absolute;white-space:nowrap;background:#fff;color:#16161C;border:6px solid #16161C;border-radius:30px;box-shadow:8px 8px 0 #16161C;font:900 56px/1 Golos;padding:16px 28px 20px;rotate:-4deg;z-index:8}
.say::after{content:"";position:absolute;left:60px;bottom:-40px;border:20px solid transparent;border-top:24px solid #16161C}
.note::before{content:"";display:inline-block;width:22px;height:22px;border-radius:50%;background:#FFD83A;margin-right:16px;vertical-align:4px}
.foot{position:absolute;top:1740px;left:60px;display:flex;align-items:center;gap:16px;font:700 34px JB;color:${t.fg}}
.foot svg{width:54px;height:54px}.foot svg *{fill:currentColor}
</style></head><body>
<div class="rays"></div><div class="dots"></div>
<div class="hdr"><div class="brand"><span class="seal">机</span>РОБОКИТАЙ <span class="zh">机器人中国</span></div><div class="ep">${c.ep}</div></div>
<h1>${c.title}</h1>
<div class="stamp">${c.stamp}</div>
${c.extra || ''}
${heroDivs(c.heroes)}
<div class="row"><svg class="mini" viewBox="-20 -20 1050 880">${CHINA.map((d) => `<path class="sh" d="${d}"/>`).join('')}${CHINA.map((d) => `<path class="land" d="${d}"/>`).join('')}<circle class="dt" cx="${mx}" cy="${my}" r="46"/></svg>
<div class="city"><b>${c.city}<span>${c.zh}</span></b><i>${c.tag}</i></div></div>
<div class="note">${c.note}</div>
<div class="foot">${AR}<span>aura-robotics.ru/blog</span></div>
<script>window.fit=()=>{const h=document.querySelector('h1');let f=112;h.style.fontSize=f+'px';while(h.offsetHeight>2.25*f&&f>60){f-=4;h.style.fontSize=f+'px'}
const b=document.querySelector('.city b');let g=86;while(b.scrollWidth>b.parentElement.parentElement.clientWidth-262&&g>50){g-=4;b.style.fontSize=g+'px'}}</script>
</body></html>`;
};

// ——— манхуа ostapdotcenko ———
const OST = `${ROOT}/source-videos/фото-от-пользователя/остап/`;
const ART = `${ROOT}/source-videos/2026-11-06-od-manhua-explainer/обложки-статей/`;
const OD = [
  { name: '2026-11-06-od-why-manhua', kick: 'OSTAPDOTCENKO.RU · 为什么是漫画？', t1: 'Почему', t2: 'манхуа?',
    bubble: 'Мои проекты<br><b>как в комиксе</b>', bubbleZh: '像漫画一样！',
    cut: OST + 'ostap-portret-vyrezka.png', cutR: -215, cutB: 230, cutH: 930, chips: ['Легко', 'С телефона', 'Запоминается'], wall: false,
    foot: 'ostapdotcenko.ru' },
  { name: '2026-11-06-od-what-is-duo-news', kick: 'БЛОГ OSTAPDOTCENKO.RU · 这是什么？', t1: 'Что такое', t2: '多 NEWS?',
    bubble: 'Статья →<br><b>манхуа</b><br>за 45 секунд', bubbleZh: '',
    cut: OST + 'вырезки/ostap-megamarket-mikrofon.png', cutR: -150, cutB: 250, cutH: 900, chips: ['Новости Азии', 'Каждый день', 'RU · EN · 中文'], wall: true,
    foot: 'ostapdotcenko.ru/blog' },
];
const odHtml = (c) => {
  const covers = fs.readdirSync(ART).filter((f) => f.endsWith('.jpg')).sort().slice(0, 20);
  const wall = c.wall ? `<div class="wall">${covers.map((f) => `<img src="${u(ART + f)}">`).join('')}</div>` : '';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${FONTS}
body{background:#FFD92E;font-family:Golos;color:#191922}
.dots{position:absolute;inset:0;background-image:radial-gradient(#191922 2.2px,transparent 2.6px);background-size:22px 22px;opacity:.13}
.rays{position:absolute;inset:0;background:repeating-conic-gradient(from 0deg at 72% 62%,rgba(255,255,255,.28) 0 4deg,transparent 4deg 11deg)}
.wall{position:absolute;top:900px;left:-60px;right:-60px;height:1100px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;transform:rotate(-4deg);opacity:.9;overflow:hidden}
.wall img{width:100%;aspect-ratio:9/16;object-fit:cover;filter:grayscale(1) contrast(1.1)}
.wallfade{position:absolute;top:860px;left:0;right:0;height:400px;background:linear-gradient(180deg,#FFD92E 18%,rgba(255,217,46,0))}
.kick{position:absolute;top:262px;left:56px;background:#191922;color:#FFD92E;font:700 30px JB;letter-spacing:.06em;padding:12px 22px;transform:rotate(-1.5deg)}
.kick span{font-family:MSZ;letter-spacing:0;font-size:34px}
h1{position:absolute;top:340px;left:52px;right:30px;font:900 150px/.98 Unbounded;text-transform:uppercase;letter-spacing:-.02em;-webkit-text-stroke:0}
h1 .a,h1 .b{display:block;white-space:nowrap;width:max-content}
h1 .a{color:#191922}
h1 .b{display:block;color:#E8341C;text-shadow:6px 6px 0 #191922}
.bubble{position:absolute;top:690px;left:40px;width:560px;background:#fff;border:7px solid #191922;border-radius:50px;padding:30px 36px;font:800 64px/1.1 Golos;box-shadow:10px 10px 0 #191922}
.bubble b{font-weight:900;background:linear-gradient(transparent 55%,#FFD92E 55%)}
.bubble .zh{display:block;font:62px MSZ;color:#E8341C;margin-top:8px}
.bubble .zh:empty{display:none}
.bubble::after{content:"";position:absolute;right:-44px;top:110px;border:22px solid transparent;border-left:40px solid #191922}
.cut{position:absolute;right:${c.cutR ?? -150}px;bottom:${c.cutB ?? 240}px;height:${c.cutH ?? 940}px}
.chips{position:absolute;top:1080px;left:40px;display:flex;flex-direction:column;gap:22px}
.chip{background:#191922;color:#fff;font:900 58px Golos;padding:14px 30px;border-radius:14px;width:max-content;transform:rotate(-1deg);box-shadow:6px 6px 0 #E8341C}
.chip:nth-child(2){transform:rotate(1deg);margin-left:24px}.chip:nth-child(3){transform:rotate(-.5deg)}
.seal{position:absolute;top:1530px;right:60px;width:132px;height:132px;background:#C8102E;color:#fff;border-radius:14px;display:flex;align-items:center;justify-content:center;font:120px/1 MSZ;transform:rotate(-6deg);border:5px solid #fff;box-shadow:0 6px 0 rgba(0,0,0,.25)}
.foot{position:absolute;top:1560px;left:40px;background:#fff;border:6px solid #191922;font:800 44px JB;padding:12px 24px;border-radius:12px}
</style></head><body>
<div class="dots"></div><div class="rays"></div>${wall}${c.wall ? '<div class="wallfade"></div>' : ''}
<div class="kick">${c.kick.replace(/([一-鿿？]+)/g, '<span>$1</span>')}</div>
<h1><span class="a">${c.t1}</span><span class="b">${c.t2}</span></h1>
<img class="cut" src="${u(c.cut)}">
<div class="bubble">${c.bubble}<span class="zh">${c.bubbleZh}</span></div>
<div class="chips">${c.chips.map((x) => `<div class="chip">${x}</div>`).join('')}</div>
<div class="seal">多</div>
<div class="foot">${c.foot}</div>
<script>window.fit=()=>{for(const el of document.querySelectorAll('h1 span')){let f=150;el.style.fontSize=f+'px';while(el.offsetWidth>990&&f>70){f-=4;el.style.fontSize=f+'px'}}}</script>
</body></html>`;
};

(async () => {
  const only = process.argv.slice(2);
  const jobs = [...RK.map((c) => ['robokitai', c, c.kind === 'map' ? rk0Html(c) : c.kind === 'bright' ? rkBright(c) : rkHtml(c)]), ...OD.map((c) => ['od-manhua', c, odHtml(c)])]
    .filter(([, c]) => !only.length || only.includes(c.name));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const made = {};
  for (const [dir, c, html] of jobs) {
    const outDir = `${ROOT}/finished-videos/обложки/${dir}`;
    fs.mkdirSync(outDir, { recursive: true });
    const tmp = `/dev/shm/series-cover-${c.name}.html`;
    fs.writeFileSync(tmp, html);
    await pg.goto('file://' + tmp);
    await pg.evaluate(() => document.fonts.ready);
    await pg.evaluate(() => window.fit && window.fit());
    await pg.waitForTimeout(250);
    const out = `${outDir}/${c.name}.jpg`;
    await pg.screenshot({ path: out, type: 'jpeg', quality: 90 });
    (made[dir] = made[dir] || []).push(out);
    console.log(out);
  }
  await b.close();
  // лист: обложка + вид в сетке профиля (3:4)
  for (const [dir, files] of Object.entries(made)) {
    const py = `
import sys
from PIL import Image, ImageDraw
fs=sys.argv[2:]; W=360; H=640
s=Image.new('RGB',(len(fs)*(W+20)+20, H+40+int(W*4/3)+40),'#2a2a30')
for i,f in enumerate(fs):
    im=Image.open(f).convert('RGB'); x=20+i*(W+20)
    s.paste(im.resize((W,H)),(x,20))
    g=im.crop((0,240,1080,1680)).resize((W,int(W*4/3))); s.paste(g,(x,H+60))
s.save(sys.argv[1],quality=86)`;
    execFileSync('python3', ['-c', py, `${ROOT}/finished-videos/обложки/${dir}/_лист.jpg`, ...files]);
  }
})();
