// Обложка Reels «Куда я вожу группы в Китае» для личного профиля @ostap.dotsenko (03.11.2026: «сделай обложку для этого ролика
// креативную и завлекающую»). Язык профиля: жёлтый #FFD92E · чернила #191922 · красный #E8341C, растр, печать 多 справа на y 1572,
// Unbounded 900 + Golos + кисть Ma Shan Zheng + рукописный Caveat. Кадры — настоящие (его Reels и съёмка SANY / Xingwang / YingKe),
// стоп-кадры — source-videos/2026-11-03-gtt-проект/обложка/. Важное — в зоне сетки профиля 3:4 (y 240–1680).
// Четыре варианта на выбор: A «Мозаика», B «Полароиды и костюм», C «Страница маньхуа», D «Оглавление».
// Выбран B (решение пользователя 03.11.2026), облачко повёрнуто на −6°, чтобы не заходило на лоб.
// Запуск: node reels-studio/tools/gtt-reel/cover-gruppy.mjs → finished-videos/обложки/ostap-gruppy/ (+ _лист.jpg с видом в сетке)
import { createRequire } from 'module'; import fs from 'fs'; import { execSync } from 'child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = '/home/user/VIDEO-HUB', SV = `file://${ROOT}/source-videos/`, F = `${ROOT}/презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/`;
const K = `${SV}2026-11-03-gtt-проект/обложка/`, XW = `${SV}2026-10-26-xingwang/фото/`, YK = `${SV}2026-10-26-yingke/фото/`;
const CUT = `${SV}фото-от-пользователя/остап/вырезки/ostap-portret-sait.png`, NF = `file://${ROOT}/reels-studio/tools/nav-covers/fonts/`;
const FON = process.argv.includes('fony');
// en — английская версия выбранной обложки B2 (04.11.2026, к ролику 2026-11-04-od-gruppy-en) → ostap-gruppy/en/
const EN = process.argv.includes('en');
const OUT = `${ROOT}/finished-videos/обложки/ostap-gruppy${FON ? '/фоны' : EN ? '/en' : ''}`;
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync('/dev/shm/cg', { recursive: true });

const tile = (src, st, pos = 'center 30%', cap = '') => `<div class="tile" style="${st}"><div class="ph" style="background-image:url('${src}');background-position:${pos}"></div>${cap ? `<i>${cap}</i>` : ''}</div>`;
const pola = (src, st, pos, cap) => `<div class="pola" style="${st}"><div class="ph" style="background-image:url('${src}');background-position:${pos}"></div><b>${cap}</b></div>`;
const panel = (src, st, pos = 'center') => `<div class="pan" style="${st}"><div class="ph" style="background-image:url('${src}');background-position:${pos}"></div></div>`;

// B на разных фонах (03.11.2026: «покажи ещё варианты с другим фоном, чтобы я сравнил») — `… cover-gruppy.mjs fony` → ostap-gruppy/фоны/
const BG = {
  ink: { bg: '<div class="hk"></div>', speed: 'rgba(255,217,46,.08)', sh: '#FFD92E', tag: 'background:#FFD92E;color:#191922;box-shadow:8px 8px 0 #E8341C', sfx: '' },
  yellow: { bg: '<div class="hy"></div>', speed: 'rgba(25,25,34,.10)', sh: '#191922', tag: 'background:#191922;color:#FFD92E;box-shadow:8px 8px 0 #E8341C', sfx: '' },
  red: { bg: '<div class="hr"></div>', speed: 'rgba(25,25,34,.12)', sh: '#191922', tag: 'background:#FFD92E;color:#191922;box-shadow:8px 8px 0 #191922', sfx: 'color:#FFD92E' },
  paper: { bg: '<div class="bone"></div>', speed: 'rgba(25,25,34,.06)', sh: '#191922', tag: 'background:#191922;color:#FFD92E;box-shadow:8px 8px 0 #E8341C', sfx: '' },
  navy: { bg: '<div class="hb"></div>', speed: 'rgba(125,211,252,.08)', sh: '#2563EB', tag: 'background:#7DD3FC;color:#081440;box-shadow:8px 8px 0 #2563EB', sfx: '' },
  photo: { bg: `<div class="phbg" style="background-image:url('${K}sany-group.jpg')"></div><div class="a" style="inset:0;background:rgba(21,21,29,.62)"></div><div class="dots"></div>`, speed: 'rgba(255,217,46,.06)', sh: '#FFD92E', tag: 'background:#FFD92E;color:#191922;box-shadow:8px 8px 0 #E8341C', sfx: '' },
};
const TXT = {
  ru: { q: 'Куда я вожу группы в&nbsp;Китае?', p1: 'к роботам', p2: 'на заводы', p3: 'к председателям', tag: 'только реальные кадры' },
  en: { q: 'Where do I take groups in&nbsp;China?', p1: 'to robots', p2: 'to factories', p3: 'to chairmen', tag: 'only real footage' },
};
const makeB = (k, lang = 'ru') => { const b = BG[k], L = TXT[lang]; return `${b.bg}<div class="speed" style="--sp:${b.speed}"></div>
    <img class="cut" src="${CUT}" style="right:-200px;bottom:240px;height:1180px;-webkit-mask-image:linear-gradient(#000 80%,transparent 99%);mask-image:linear-gradient(#000 80%,transparent 99%)">
    <div class="bub" style="left:44px;top:262px;width:690px;font-size:64px;rotate:-6deg;transform-origin:0 100%">${L.q}<small>我带团去哪儿？</small></div>
    ${pola(`${K}robot-push.jpg`, `left:50px;top:690px;rotate:-7deg;--psh:${b.sh}`, 'center 35%', L.p1)}
    ${pola(`${K}sany-group.jpg`, `left:120px;top:1010px;rotate:5deg;--psh:${b.sh}`, 'center 50%', L.p2)}
    ${pola(`${XW}koni.jpg`, `left:40px;top:1300px;rotate:-4deg;z-index:3;--psh:${b.sh}`, 'center 45%', L.p3)}
    <div class="sfx" style="right:56px;top:300px;font-size:170px;rotate:8deg;${b.sfx}">走!</div>
    <div class="tag" style="right:64px;top:1450px;rotate:2deg;${b.tag}">${L.tag}</div>`; };
const FONY = { 'B1-чернила': 'ink', 'B2-жёлтый': 'yellow', 'B3-красный': 'red', 'B4-бумага': 'paper', 'B5-тёмно-синий-GTT': 'navy', 'B6-фото-цеха': 'photo' };

const V = {
  // A — мозаика из девяти моментов, поверх чернильная плашка с вопросом и штамп 走
  'A-мозаика': `<div class="hy"></div>
    ${tile(`${K}robot-push.jpg`, 'left:40px;top:250px;width:320px;height:420px;rotate:-3deg')}
    ${tile(`${K}kepler-line.jpg`, 'left:380px;top:236px;width:320px;height:420px;rotate:2deg')}
    ${tile(`${K}sany-group.jpg`, 'left:720px;top:256px;width:320px;height:420px;rotate:-2deg')}
    ${tile(`${XW}koni.jpg`, 'left:40px;top:1215px;width:320px;height:380px;rotate:2deg', 'center 45%')}
    ${tile(`${K}agibot-box.jpg`, 'left:380px;top:1235px;width:320px;height:380px;rotate:-2deg')}
    ${tile(`${YK}6.jpg`, 'left:720px;top:1210px;width:320px;height:380px;rotate:3deg', '40% 50%')}
    <div class="inkbox" style="left:50px;right:50px;top:690px;rotate:-2deg">
      <div class="t1">Куда я вожу</div><div class="t2">группы в&nbsp;Китае?</div>
      <div class="zh">我带团去哪儿？</div><div class="sub">роботы · заводы · председатели</div></div>
    <div class="sfx" style="right:30px;top:470px;font-size:200px;rotate:10deg">走!</div>`,

  // B — портрет в костюме справа, слева облачко и три полароида с подписями от руки
  'B-полароиды': makeB('yellow'), // выбран жёлтый фон (B2, решение пользователя 03.11.2026)

  // C — страница маньхуа: пять панелей в чернильных рамках, облачко и звук 哇
  'C-маньхуа': `<div class="paper"></div>
    ${panel(`${K}sany-group.jpg`, 'left:40px;top:250px;width:1000px;height:560px', 'center 42%')}
    ${panel(`${K}robot-push.jpg`, 'left:40px;top:830px;width:490px;height:420px', 'center 40%')}
    ${panel(`${K}kepler-line.jpg`, 'left:550px;top:830px;width:490px;height:420px', 'center 30%')}
    ${panel(`${XW}koni.jpg`, 'left:40px;top:1270px;width:600px;height:400px', 'center 45%')}
    ${panel(`${K}dwc.jpg`, 'left:660px;top:1270px;width:380px;height:400px', 'center 35%')}
    <div class="bub" style="left:70px;top:285px;width:560px;font-size:56px">Куда я вожу группы в&nbsp;Китае?<small>我带团去哪儿？</small></div>
    <div class="cap" style="left:58px;top:740px">заводы</div><div class="cap" style="left:58px;top:848px">роботы</div><div class="cap" style="left:568px;top:848px">производства</div>
    <div class="cap" style="left:58px;top:1288px">председатели</div><div class="cap" style="left:678px;top:1288px">конгрессы</div>
    <div class="sfx" style="left:720px;top:560px;font-size:180px;rotate:12deg">哇!</div>`,

  // D — оглавление ролика на чернилах: пять глав с кадрами, внизу «малая часть»
  'D-оглавление': `<div class="hk"></div>
    <div class="lab" style="left:64px;top:262px">Остап Доценко · 多增科</div>
    <div class="a" style="left:60px;right:150px;top:318px;font:900 82px/1.02 Unbounded;color:#fff;letter-spacing:-.02em">Куда я вожу <span style="color:#FFD92E">группы в&nbsp;Китае</span></div>
    ${[['01', 'К роботам', 'robot-push.jpg', 'center 35%'], ['02', 'На заводы', 'sany-group.jpg', 'center 50%'], ['03', 'К председателям', '', 'center 45%'],
      ['04', 'На конгрессы', 'dwc.jpg', 'center 35%'], ['05', 'Лично — к воротам', 'kepler-gate.jpg', 'center 25%']].map(([n, t, f, pos], i) => `
    <div class="row" style="top:${560 + i * 192}px"><b>${n}</b><span>${t}</span>
      <div class="th" style="background-image:url('${f ? K + f : XW + 'koni.jpg'}');background-position:${pos}"></div></div>`).join('')}
    <div class="tag" style="left:64px;top:1545px;rotate:-1.5deg;background:#E8341C;color:#fff;box-shadow:8px 8px 0 #FFD92E">и это только малая часть</div>`,
};

const SET = EN ? { 'B2-жёлтый-en': makeB('yellow', 'en') } : FON ? Object.fromEntries(Object.entries(FONY).map(([n, k]) => [n, makeB(k)])) : V;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Unbounded;font-weight:200 900;src:url('file://${F}Unbounded-variable.ttf')}
@font-face{font-family:Golos;font-weight:400 900;src:url('file://${F}GolosText-variable.ttf')}
@font-face{font-family:JB;font-weight:100 800;src:url('file://${F}JetBrainsMono-variable.ttf')}
@font-face{font-family:MSZ;src:url('file://${ROOT}/интернет-материалы/шрифты/ma-shan-zheng.woff2') format('woff2')}
@font-face{font-family:Caveat;src:url('${NF}caveat-cyr.woff2') format('woff2');unicode-range:U+0400-04FF}
@font-face{font-family:Caveat;src:url('${NF}caveat-lat.woff2') format('woff2')}
*{box-sizing:border-box;margin:0}body{background:#000}
section{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:Golos,sans-serif;background:#15151D}
.a{position:absolute}
.hy{position:absolute;inset:0;background:#FFD92E;background-image:radial-gradient(rgba(25,25,34,.16) 3.4px,transparent 4px);background-size:22px 22px}
.hk{position:absolute;inset:0;background:#15151D;background-image:radial-gradient(rgba(255,217,46,.13) 3.4px,transparent 4px);background-size:22px 22px}
.paper{position:absolute;inset:0;background:#F7F4EC;background-image:radial-gradient(rgba(25,25,34,.08) 3px,transparent 3.6px);background-size:20px 20px}
.speed{position:absolute;inset:-300px;background:repeating-conic-gradient(from 0deg at 70% 45%,var(--sp,rgba(255,217,46,.08)) 0 2deg,transparent 2deg 9deg)}
.hr{position:absolute;inset:0;background:#E8341C;background-image:radial-gradient(rgba(25,25,34,.2) 3.4px,transparent 4px);background-size:22px 22px}
.bone{position:absolute;inset:0;background:#EDEAE2;background-image:radial-gradient(rgba(25,25,34,.12) 3.2px,transparent 3.8px);background-size:22px 22px}
.hb{position:absolute;inset:0;background:radial-gradient(circle at 70% 25%,#1B3A8F 0,#0B1D55 55%,#081440 100%)}
.hb::after{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(125,211,252,.16) 3.4px,transparent 4px);background-size:22px 22px}
.phbg{position:absolute;inset:-60px;background-size:cover;background-position:center 40%;filter:blur(14px) saturate(1.1)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,217,46,.12) 3.4px,transparent 4px);background-size:22px 22px}
.seal{position:absolute;right:64px;top:1572px;width:92px;height:92px;background:#C8102E;color:#fff;font:400 70px/92px MSZ;text-align:center;border-radius:10px;box-shadow:0 0 0 5px #fff;rotate:-4deg;z-index:60}
.ph{position:absolute;inset:0;background-size:cover}
.tile{position:absolute;overflow:hidden;border:8px solid #fff;box-shadow:12px 12px 0 #191922;background:#222}
.inkbox{position:absolute;background:#191922;padding:34px 40px 30px;box-shadow:16px 16px 0 #E8341C;z-index:10}
.inkbox .t1{font:900 104px/1 Unbounded;color:#fff;letter-spacing:-.03em}
.inkbox .t2{font:900 104px/1.04 Unbounded;color:#FFD92E;letter-spacing:-.03em}
.inkbox .sub{margin-top:18px;font:900 34px/1.2 Unbounded;color:#FFD92E;letter-spacing:.01em}
.inkbox .zh{margin-top:14px;font:400 64px/1 MSZ;color:#E8341C;background:#fff;display:inline-block;padding:6px 16px 2px}
.sfx{position:absolute;font:400 230px/1 MSZ;color:#E8341C;-webkit-text-stroke:7px #191922;text-shadow:12px 12px 0 #191922;z-index:20}
.tag{position:absolute;background:#191922;color:#FFD92E;font:900 38px/1.15 Unbounded;padding:18px 26px;box-shadow:8px 8px 0 #E8341C;z-index:12}
.bub{position:absolute;background:#fff;border:8px solid #191922;padding:26px 32px 22px;font:900 72px/1.04 Unbounded;color:#191922;box-shadow:14px 14px 0 #191922;letter-spacing:-.02em;z-index:12}
.bub small{display:block;margin-top:12px;font:400 56px/1.1 MSZ;color:#E8341C;letter-spacing:0}
.bub::after{content:"";position:absolute;bottom:-46px;left:90px;border:20px solid transparent;border-top:32px solid #191922}
.pola{position:absolute;width:400px;height:450px;background:#fff;padding:16px 16px 74px;box-shadow:12px 12px 0 var(--psh,#FFD92E);z-index:2}
.pola .ph{position:absolute;left:16px;right:16px;top:16px;bottom:74px}
.pola b{position:absolute;left:0;right:0;bottom:12px;text-align:center;font:700 50px/1 Caveat;color:#191922}
.cut{position:absolute;object-fit:contain;z-index:1}
.pan{position:absolute;overflow:hidden;border:9px solid #191922;background:#222}
.cap{position:absolute;background:#FFD92E;border:5px solid #191922;padding:8px 16px;font:900 32px/1 Unbounded;color:#191922;z-index:10}
.lab{position:absolute;font:700 30px JB;letter-spacing:.16em;text-transform:uppercase;color:#FFD92E}
.row{position:absolute;left:64px;right:64px;height:170px;display:flex;align-items:center;gap:24px;border-top:4px solid rgba(255,217,46,.35)}
.row b{font:900 64px/1 Unbounded;color:#FFD92E;width:110px}.row span{flex:1;font:800 44px/1.1 Golos;color:#fff}
.row .th{width:300px;height:150px;background-size:cover;border:6px solid #fff;box-shadow:8px 8px 0 #E8341C}
</style></head><body>
${Object.entries(SET).map(([k, body], i) => `<section id="s${i}">${body}<div class="seal">多</div></section>`).join('\n')}
</body></html>`;
fs.writeFileSync('/dev/shm/cg/cover.html', html);
const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto('file:///dev/shm/cg/cover.html', { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(600);
const names = Object.keys(SET);
for (let i = 0; i < names.length; i++) await (await pg.$(`#s${i}`)).screenshot({ path: `${OUT}/${names[i]}.jpg`, type: 'jpeg', quality: 90 });
await br.close();
// лист: целиком и как в сетке профиля (3:4, y 240–1680)
const files = names.map(n => `${OUT}/${n}.jpg`);
fs.writeFileSync('/dev/shm/cg/sheet.py', `
from PIL import Image, ImageDraw, ImageFont
files=${JSON.stringify(files)}; names=${JSON.stringify(names)}
f=ImageFont.truetype('${F}GolosText-variable.ttf',26)
W=360;H=640;G=270;GH=360
sh=Image.new('RGB',(len(files)*(W+30)+30, H+GH+140),'#111'); d=ImageDraw.Draw(sh)
for i,(p,n) in enumerate(zip(files,names)):
    im=Image.open(p).convert('RGB'); x=30+i*(W+30)
    sh.paste(im.resize((W,H),Image.LANCZOS),(x,20)); d.text((x,H+28),n,fill='#fff',font=f)
    g=im.crop((0,240,1080,1680)).resize((G,GH),Image.LANCZOS); sh.paste(g,(x+(W-G)//2,H+70))
sh.save('${OUT}/_лист.jpg',quality=88)
`);
execSync('python3 /dev/shm/cg/sheet.py');
console.log('✓', OUT);
