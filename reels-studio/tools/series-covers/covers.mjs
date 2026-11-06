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
  { name: 'robokitai-000-trailer', ep: 'СЕРИЯ 0', stamp: '机', img: 'ep0-komanda.jpg', pos: 'center 40%',
    title: 'Добро пожаловать в <mark>Робокитай</mark>', city: 'Знакомство', zh: '',
    tag: '16 героев · 8 краёв Китая', note: 'Каждая серия — задача настоящего клиента' },
  { name: 'robokitai-001-hangzhou', ep: 'СЕРИЯ 1', stamp: '杭', img: 'ep1-kadr.jpg', pos: 'center 74%',
    title: 'Склад <mark>не успевает</mark>.<br>AGV или AMR?', city: 'Ханчжоу', zh: '杭州',
    tag: 'край четвероногих и складских машин', note: 'Рыжик или Шустрик — кто довезёт?' },
  { name: 'robokitai-002-suzhou', ep: 'СЕРИЯ 2', stamp: '苏', img: 'ep2-kadr.jpg', pos: 'center 25%',
    title: 'Какой <mark>кобот</mark><br>нужен цеху?', city: 'Сучжоу', zh: '苏州',
    tag: 'край коботов', note: 'Деталь 4 кг → кобот на 8–10 кг' },
  { name: 'robokitai-003-shenzhen', ep: 'СЕРИЯ 3', stamp: '深', img: 'ep3-kadr.jpg', pos: 'center 25%',
    title: 'Чем робот<br>будет <mark>брать</mark>?', city: 'Шэньчжэнь', zh: '深圳',
    tag: 'город железа', note: 'Сначала захват — потом робот' },
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
.city .tag{font:600 36px Golos;color:#55545C;width:100%;margin-top:2px}
.note{max-width:950px;background:#16161C;color:#fff;font:700 40px/1.2 Golos;padding:18px 28px;border-radius:16px}
.note::before{content:"";display:inline-block;width:18px;height:18px;border-radius:50%;background:#F4E35B;margin-right:16px;vertical-align:4px}
.foot{position:absolute;top:1690px;left:64px;right:64px;display:flex;align-items:center;gap:18px;font:700 30px JB;color:#55545C}
.foot svg{width:58px;height:58px}
</style></head><body>
<div class="hdr"><div class="brand"><span class="seal">机</span>РОБОКИТАЙ <span class="zh">机器人中国</span></div><div class="ep">${c.ep}</div></div>
<h1>${c.title}</h1>
<div class="card"><img src="${u(SRC + c.img)}"></div>
<div class="stamp">${c.stamp}</div>
<div class="info"><div class="city"><b>${c.city}</b>${c.zh ? `<span class="zh">${c.zh}</span>` : ''}<span class="tag">${c.tag}</span></div>
<div class="note">${c.note}</div></div>
<div class="foot">${AR}<span>aura-robotics.ru/blog · без слов, по картинкам</span></div>
<script>window.fit=()=>{const h=document.querySelector('h1');let f=112;h.style.fontSize=f+'px';while(h.offsetHeight>2.2*f&&f>60){f-=4;h.style.fontSize=f+'px'}}</script>
</body></html>`;

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
  const jobs = [...RK.map((c) => ['robokitai', c, rkHtml(c)]), ...OD.map((c) => ['od-manhua', c, odHtml(c)])]
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
