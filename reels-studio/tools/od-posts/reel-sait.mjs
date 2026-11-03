// Reels «Мой сайт ostapdotcenko.ru» для личного профиля @ostap.dotsenko (03.11.2026: «красивый ролик про мой сайт, подробно рассказать
// о нём, показать, что он на нескольких языках и что я веду блог, не более 40 секунд»).
// Язык профиля (жёлтый · чернила · красный, растр, печать 多, Unbounded + Golos + JetBrains Mono, кисть для китайского).
// Экраны — настоящий сайт на телефоне (Playwright 390×844 × 2,5, 03.11.2026): source-videos/ostapdotcenko/site/2026-11-03-сайт/.
// Шапка сайта стоит на месте, страница под ней «прокручивается» от раздела к разделу. Факты — только с сайта (src/i18n/ru.ts
// репозитория Ostap-87/ostapdotcenko): разделы и их номера, 13+ лет, 5 языков, +350%, 8 кейсов, 3 формата консультаций, СМИ,
// 20+ стран, 45 статей в блоге (на 03.11.2026), статья каждый день, каждая — на RU / EN / 中文.
// Без голоса, музыка Inspiring Technology — Soundrider/Dope (CC BY 3.0, автор — в подписи).
// Запуск: node reels-studio/tools/od-posts/reel-sait.mjs [--still 1,5,16] [--frames A-B] [--encode-only]
import { createRequire } from 'module'; import fs from 'fs'; import { execSync } from 'child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = '/home/user/VIDEO-HUB', SV = `file://${ROOT}/source-videos/`, F = `${ROOT}/презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/`;
const IMG = `${SV}ostapdotcenko/site/2026-11-03-сайт/`;
const NAME = '2026-11-03-od-sait', FPS = 30;
const S = { hook: [0, 3.4], inside: [3.4, 9.8], more: [9.8, 14.4], langs: [14.4, 21.6], blog: [21.6, 27.8], art3: [27.8, 33.6], cta: [33.6, 38.0] };
const DUR = 38.0, N = Math.round(DUR * FPS), TMP = '/dev/shm/odsait', FR = `${TMP}/frames`;
const args = process.argv.slice(2), arg = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

// телефон: экран 420 px = 975 px снимка; шапка сайта (160 px снимка) стоит, тело страницы листается полосой
const SW = 420, K = SW / 975, SH = Math.round(2110 * K), HH = 160 * K, BH = 1950 * K, SB = 40; // SB — строка состояния телефона
const phone = (id, lang, imgs, st, sh = '#191922') => `<div class="phone" id="${id}" style="${st};box-shadow:18px 22px 0 ${sh}"><div class="scr">
  <div class="sb"></div><div class="strip" id="${id}St" style="top:${SB + HH}px">${imgs.map(f => `<div class="pg"><img src="${IMG}${f}.jpg" style="top:${-HH}px"></div>`).join('')}</div>
  <div class="hdr"><img src="${IMG}${lang}-00-top.jpg"></div><div class="url"><span>ostapdotcenko.ru</span></div></div><div class="isl"></div></div>`;
// телефон, где снимки сменяют друг друга целиком (смена языка)
const phoneX = (id, imgs, st, sh = '#191922') => `<div class="phone" id="${id}" style="${st};box-shadow:18px 22px 0 ${sh}"><div class="scr">
  <div class="sb"></div>${imgs.map((f, i) => `<img class="full" id="${id}I${i}" src="${IMG}${f}.jpg" style="opacity:${i ? 0 : 1}">`).join('')}
  <div class="url"><span>ostapdotcenko.ru</span></div><div class="tap" id="${id}Tap"></div></div><div class="isl"></div></div>`;
const row = (id, n, txt, y, x = 64, w = 440, fs = 40) => `<div class="row" id="${id}" style="left:${x}px;top:${y}px;width:${w}px;font-size:${fs}px"><span>${n}</span>${txt}</div>`;
const fact = (id, x, y, w, num, lab, data = '') => `<div class="a fact" id="${id}" style="left:${x}px;top:${y}px;width:${w}px"><div class="num" ${data}>${num}</div><div class="flab">${lab}</div></div>`;
const cnt = (n, pre = '', suf = '') => `data-n="${n}" data-pre="${pre}" data-suf="${suf}"`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Unbounded;font-weight:200 900;src:url('file://${F}Unbounded-variable.ttf')}
@font-face{font-family:Golos;font-weight:400 900;src:url('file://${F}GolosText-variable.ttf')}
@font-face{font-family:JB;font-weight:100 800;src:url('file://${F}JetBrainsMono-variable.ttf')}
@font-face{font-family:MSZ;src:url('file://${ROOT}/интернет-материалы/шрифты/ma-shan-zheng.woff2') format('woff2')}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:Golos,'WenQuanYi Zen Hei',sans-serif;background:#15151D}
.a{position:absolute}.sc{position:absolute;inset:0;display:none;overflow:hidden}
.hy{position:absolute;inset:0;background:#FFD92E;background-image:radial-gradient(rgba(25,25,34,.16) 3.4px,transparent 4px);background-size:22px 22px}
.hk{position:absolute;inset:0;background:#15151D;background-image:radial-gradient(rgba(255,217,46,.12) 3.4px,transparent 4px);background-size:22px 22px}
.hr{position:absolute;inset:0;background:#E8341C;background-image:radial-gradient(rgba(25,25,34,.2) 3.4px,transparent 4px);background-size:22px 22px}
.seal{position:absolute;right:64px;top:262px;width:84px;height:84px;background:#C8102E;color:#fff;font:400 64px/84px MSZ;text-align:center;border-radius:10px;box-shadow:0 0 0 5px #fff;rotate:-4deg;z-index:50}
.lab{position:absolute;left:64px;top:270px;font:700 30px JB;letter-spacing:.16em;text-transform:uppercase;color:#FFD92E}
.ttl{position:absolute;left:60px;right:170px;top:320px;font:900 72px/1.04 Unbounded;color:#fff;letter-spacing:-.02em}
.mk{background:linear-gradient(transparent 12%,#FFD92E 12%,#FFD92E 92%,transparent 92%);color:#191922;padding:0 8px}
.phone{position:absolute;width:${SW + 34}px;height:${SH + 34 + SB}px;border-radius:62px;background:#0d0d12;padding:17px;transform-origin:0 0}
.phone .scr{position:relative;width:100%;height:100%;border-radius:46px;overflow:hidden;background:#ECEAE3}
.phone .strip{position:absolute;left:0;width:100%}.phone .pg{position:relative;width:100%;height:${BH}px;overflow:hidden}
.phone .pg img{position:absolute;left:0;width:100%}
.phone .hdr{position:absolute;left:0;top:${SB}px;width:100%;height:${HH}px;overflow:hidden;z-index:2}.phone .hdr img{width:100%;display:block}
.phone .full{position:absolute;left:0;top:${SB}px;width:100%}
.phone .sb{position:absolute;left:0;top:0;width:100%;height:${SB}px;background:#ECEAE3;z-index:2}
.phone .url{position:absolute;left:0;right:0;bottom:0;height:62px;background:rgba(236,234,227,.94);border-top:1px solid #D5D2C8;z-index:3;display:flex;align-items:center;justify-content:center}
.phone .url span{background:#DEDBD1;border-radius:14px;padding:7px 22px;font:600 19px JB;color:#191922}
.phone .isl{position:absolute;left:50%;top:23px;width:104px;height:26px;margin-left:-52px;border-radius:99px;background:#0d0d12;z-index:3}
.tap{position:absolute;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;border:6px solid #E8341C;background:rgba(232,52,28,.22);opacity:0;z-index:4}
.row{position:absolute;display:flex;align-items:baseline;gap:18px;padding:12px 18px;font:800 40px/1.1 Unbounded;color:rgba(255,255,255,.42);transform-origin:0 50%}
.row span{font:700 26px JB;color:#FFD92E;min-width:48px}
.row.on{background:#FFD92E;color:#191922;box-shadow:8px 8px 0 #E8341C}.row.on span{color:#E8341C}
.dk .row{color:rgba(25,25,34,.45)}.dk .row span{color:#191922}.dk .row.on{background:#191922;color:#FFD92E;box-shadow:8px 8px 0 #fff}.dk .row.on span{color:#FFD92E}
.num{font:900 130px/1 Unbounded;color:#FFD92E;letter-spacing:-.04em;white-space:nowrap}
.flab{margin-top:14px;font:600 34px/1.25 Golos;color:#ECEAE3}
.dk .num{color:#191922}.dk .flab{color:#191922}
.pill{position:absolute;background:#fff;border:5px solid #191922;padding:14px 20px;font:700 32px/1.2 Golos;color:#191922;box-shadow:8px 8px 0 var(--sh,#FFD92E);transform-origin:0 50%}
.pill b{font-family:Unbounded;font-weight:900}
.chip{position:absolute;background:#F7F4EC;border:4px solid #191922;padding:10px 16px;font:700 27px/1.15 Golos;color:#191922;white-space:nowrap;transform-origin:0 50%}
.lc{position:absolute;left:64px;width:430px;height:150px;border:5px solid #191922;background:#F7F4EC;padding:16px 24px;transform-origin:0 50%}
.lc .code{font:900 56px/1 Unbounded;color:#191922}.lc .nm{margin-top:12px;font:700 32px/1.1 Golos;color:#191922;white-space:nowrap}
.lc.on{background:#191922;box-shadow:10px 10px 0 #E8341C}.lc.on .code{color:#FFD92E}.lc.on .nm{color:#fff}
.wm{position:absolute;font:400 700px/1 MSZ}
.cut{position:absolute;object-fit:contain}
.wipe{position:absolute;inset:0;display:none;z-index:40}
</style></head><body><div class="seal">多</div>

<div class="sc dk" id="hook"><div class="hy"></div><div class="wm" style="left:-80px;top:980px;color:rgba(25,25,34,.07)">网</div>
  <div class="lab" style="color:#191922">Остап Доценко · 多增科</div>
  <div class="ttl" id="hookTtl" style="color:#191922">Мой сайт:<br>всё обо мне<br>в одном месте</div>
  ${phoneX('hookPh', ['ru-00-top'], 'left:556px;top:575px;rotate:-4deg')}
  <div class="a" id="hookUrl" style="left:64px;top:640px;background:#191922;color:#FFD92E;padding:18px 24px;font:800 36px JB;box-shadow:10px 10px 0 #E8341C">ostapdotcenko.ru</div>
  <div class="chip" id="hookC1" style="left:64px;top:790px">RU · EN · 中文</div>
  <div class="chip" id="hookC2" style="left:64px;top:874px">Карьера и кейсы</div>
  <div class="chip" id="hookC3" style="left:64px;top:958px">Блог · <b>45</b> статей</div>
  <div class="a" id="hookZh" style="left:70px;top:1080px;font:400 92px/1 MSZ;color:#C8102E;rotate:-4deg">我的网站</div>
</div>

<div class="sc" id="inside"><div class="hk"></div><div class="wm" style="left:-60px;top:920px;color:rgba(255,217,46,.07)">我</div>
  <div class="lab" id="insLab">Что внутри · разделы 01–04</div>
  <div class="ttl" id="insTtl">Кто я<br>и что сделал</div>
  ${row('insR1', '01', 'Обо мне', 590)}${row('insR2', '02', 'Карьера', 676)}${row('insR3', '03', 'Результаты', 762)}${row('insR4', '04', 'Проекты', 848)}
  ${fact('insF0', 64, 1000, 460, '13+', 'лет строю бизнес<br>Россия ↔ Китай ↔ ЮВА', cnt(13, '', '+'))}
  ${fact('insF1', 64, 1000, 460, '5', 'языков: русский, English,<br>中文, 한국어, O‘zbek', cnt(5))}
  <div class="a fact" id="insF2" style="left:64px;top:1000px;width:460px"><div class="num" style="font-size:62px;line-height:1.12">Alibaba →<br>Сбер →</div><div class="flab">свои проекты: Global Tech Tour<br>и Aura Robotics</div></div>
  <div class="a fact" id="insF3" style="left:64px;top:1000px;width:460px"><div class="num" style="font-size:100px" ${cnt(350, '+', '%')}>+350%</div><div class="flab">рост продавцов<br>Мегамаркета за год</div></div>
  ${fact('insF4', 64, 1000, 460, '8', 'кейсов, которыми<br>горжусь', cnt(8))}
  ${phone('insPh', 'ru', ['ru-00-top', 'ru-01-about', 'ru-02-career', 'ru-03-results', 'ru-04-projects'], 'left:556px;top:540px;rotate:2deg', '#FFD92E')}
</div>

<div class="sc dk" id="more"><div class="hr"></div><div class="wm" style="right:-60px;top:940px;color:rgba(25,25,34,.08)">更</div>
  <div class="lab" id="morLab" style="color:#191922">И ещё · разделы 05–09</div>
  <div class="ttl" id="morTtl">Консультации,<br>СМИ и жизнь</div>
  ${phone('morPh', 'ru', ['ru-05-consulting', 'ru-07-media', 'ru-08-life-b'], 'left:64px;top:540px;rotate:-2deg')}
  ${row('morR1', '05', 'Консультации', 590, 560, 456, 33)}${row('morR2', '08', 'Медиа', 668, 560, 456, 33)}${row('morR3', '09', 'Жизнь', 746, 560, 456, 33)}
  ${fact('morF0', 576, 930, 440, '3', 'формата консультаций:<br>от экспресс-разбора<br>до Board Member', cnt(3))}
  <div class="a fact" id="morF1" style="left:576px;top:930px;width:440px"><div class="num" style="font-size:52px;line-height:1.12">Сбер Бизнес<br>· РБК</div><div class="flab">упоминания в СМИ</div></div>
  ${fact('morF2', 576, 930, 440, '20+', 'стран: путешествия<br>и увлечения', cnt(20, '', '+'))}
</div>

<div class="sc dk" id="langs"><div class="hy"></div><div class="wm" style="left:-60px;top:980px;color:rgba(25,25,34,.07)">语</div>
  <div class="lab" style="color:#191922">Языки · 语言</div>
  <div class="ttl" id="lanTtl" style="color:#191922">На трёх<br>языках</div>
  <div class="lc on" id="lanC0" style="top:600px"><div class="code">RU</div><div class="nm">Остап Доценко.</div></div>
  <div class="lc" id="lanC1" style="top:782px"><div class="code">EN</div><div class="nm">Ostap Dotsenko.</div></div>
  <div class="lc" id="lanC2" style="top:964px"><div class="code">中文</div><div class="nm" style="font:400 40px/1 MSZ">奥斯塔普 · 多增科</div></div>
  <div class="a" id="lanHint" style="left:64px;top:1160px;width:440px;font:700 32px/1.3 Golos;color:#191922">Переключатель — прямо в шапке сайта</div>
  ${phoneX('lanPh', ['ru-00-top', 'en-00-top', 'zh-00-top'], 'left:556px;top:540px;rotate:2deg')}
  ${phone('lanA0', 'ru', ['ru-01-about'], 'left:60px;top:650px;scale:.64;rotate:-5deg')}
  ${phone('lanA1', 'en', ['en-01-about'], 'left:390px;top:610px;scale:.64')}
  ${phone('lanA2', 'zh', ['zh-01-about'], 'left:720px;top:650px;scale:.64;rotate:5deg')}
  <div class="pill" id="lanP0" style="left:150px;top:1318px;--sh:#E8341C">RU</div>
  <div class="pill" id="lanP1" style="left:480px;top:1298px;--sh:#E8341C">EN</div>
  <div class="pill" id="lanP2" style="left:800px;top:1318px;--sh:#E8341C">中文</div>
  <div class="a" id="lanTxt" style="left:64px;right:64px;top:1420px;font:800 36px/1.25 Unbounded;color:#191922;text-align:center">Весь сайт — по-русски,<br>по-английски и по-китайски</div>
</div>

<div class="sc" id="blog"><div class="hk"></div><div class="wm" style="left:-80px;top:940px;color:rgba(255,217,46,.07)">博</div>
  <div class="lab" id="blgLab">06 · Блог · 博客</div>
  <div class="ttl" id="blgTtl">Веду <span class="mk">блог</span></div>
  <div class="a" id="blgN" style="left:64px;top:470px"><div class="num" style="font-size:220px" ${cnt(45)}>45</div></div>
  <div class="a" id="blgL" style="left:64px;top:710px;width:440px;font:700 38px/1.2 Unbounded;color:#fff">статей уже<br>на сайте</div>
  <div class="pill" id="blgP" style="left:64px;top:850px;font-size:30px;--sh:#E8341C">Новая статья —<br><b>каждый день</b></div>
  <div class="a" style="left:64px;top:1030px;width:460px;display:flex;flex-wrap:wrap;gap:14px 12px">
    <div class="chip" id="blgC0" style="position:relative">Китай и ЮВА</div><div class="chip" id="blgC1" style="position:relative">B2B-маркетинг</div>
    <div class="chip" id="blgC2" style="position:relative">Роботы и ИИ</div><div class="chip" id="blgC3" style="position:relative">Техтуризм</div>
    <div class="chip" id="blgC4" style="position:relative">Жизнь <span style="font:400 32px MSZ;color:#C8102E">老外</span></div></div>
  ${phone('blgPh', 'ru', ['ru-06-blog', 'ru-06-blog-b', 'ru-blog-3', 'ru-blog-4'], 'left:556px;top:540px;rotate:2deg', '#FFD92E')}
</div>

<div class="sc" id="art3"><div class="hr"></div>
  <div class="lab" id="a3Lab" style="color:#191922">Блог · RU · EN · 中文</div>
  <div class="ttl" id="a3Ttl" style="right:120px">Каждая статья —<br>на трёх языках</div>
  ${phone('a3P0', 'ru', ['ru-hum-1', 'ru-hum-2'], 'left:60px;top:640px;scale:.64;rotate:-5deg')}
  ${phone('a3P1', 'en', ['en-hum-1', 'en-hum-2'], 'left:390px;top:600px;scale:.64')}
  ${phone('a3P2', 'zh', ['zh-hum-1', 'zh-hum-2'], 'left:720px;top:640px;scale:.64;rotate:5deg')}
  <div class="pill" id="a3G0" style="left:150px;top:1300px;--sh:#191922">RU</div>
  <div class="pill" id="a3G1" style="left:480px;top:1280px;--sh:#191922">EN</div>
  <div class="pill" id="a3G2" style="left:800px;top:1300px;--sh:#191922">中文</div>
  <div class="a" id="a3Url" style="left:0;right:0;top:1420px;text-align:center"><span style="background:#191922;color:#FFD92E;padding:14px 22px;font:800 34px JB;box-shadow:8px 8px 0 #fff">ostapdotcenko.ru/blog</span></div>
</div>

<div class="sc dk" id="cta"><div class="hy"></div>
  <img class="cut" id="ctaCut" src="${SV}фото-от-пользователя/остап/вырезки/ostap-portret-sait.png" style="right:-250px;bottom:0;height:1110px">
  <div class="lab" style="color:#191922">Остап Доценко · 多增科</div>
  <div class="a" id="ctaT" style="left:60px;top:330px;width:640px;font:900 96px/1.02 Unbounded;color:#191922">Заходи<br>в гости</div>
  <div class="a" id="ctaZh" style="left:66px;top:560px;font:400 84px/1 MSZ;color:#C8102E;rotate:-4deg">欢迎！</div>
  <div class="a" id="ctaBox" style="left:64px;top:690px;width:540px;background:#191922;padding:26px 30px;box-shadow:12px 12px 0 #E8341C;display:grid;gap:14px;font:700 26px JB;color:#ECEAE3">
    <div style="font:900 36px Unbounded;color:#FFD92E;white-space:nowrap">ostapdotcenko.ru</div><div>RU · EN · 中文</div><div>Новая статья — каждый день</div><div>@ostap.dotsenko</div></div>
</div>

<div class="wipe" id="wipe"><div id="wipeBg"></div></div>
<script>
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), p=(t,a,b)=>cl((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3), eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2, eb=x=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
const S=${JSON.stringify(S)}, BH=${BH}, $=id=>document.getElementById(id), set=(id,st)=>{const e=$(id); if(e) Object.assign(e.style,st)};
const rise=(id,t,a,d=.45,dy=60)=>{const k=eo(p(t,a,a+d));set(id,{opacity:k,translate:'0 '+((1-k)*dy)+'px'})};
const left=(id,t,a,d=.4)=>{const k=eo(p(t,a,a+d));set(id,{opacity:k,translate:((1-k)*-120)+'px 0'})};
const pop=(id,t,a,d=.38)=>{const x=p(t,a,a+d);set(id,{opacity:x>0?1:0,scale:String(.4+.6*eb(x))})};
// телефон падает сверху; base — его собственный масштаб
const drop=(id,t,a,base=1)=>{const x=p(t,a,a+.5);set(id,{opacity:x>0?1:0,translate:'0 '+((1-eo(x))*-300)+'px',scale:String(base*(1.15-.15*eo(x)))})};
const away=(id,t,a,d=.35)=>{const x=eio(p(t,a,a+d)); if(x>0) set(id,{opacity:1-x,translate:'0 '+(-140*x)+'px'})};
// прокрутка: keys — [секунда, номер экрана]; переезд 0,5 с с разгоном и торможением
function scroll(id,t,keys){let y=0; for(let i=1;i<keys.length;i++){const [a,n]=keys[i],m=keys[i-1][1]; const x=eio(p(t,a,a+.5)); if(t>=a) y=m+(n-m)*x}
  set(id+'St',{translate:'0 '+(-y*BH)+'px'})}
// какой элемент сейчас «включён» (номер отрезка по ключам)
const seg=(t,ks)=>{let k=-1; ks.forEach((a,i)=>{if(t>=a) k=i}); return k};
function count(id,t,a,d=1.0){const e=$(id); if(!e) return; const n=e.querySelector('[data-n]'); if(!n) return; const v=Math.round(+n.dataset.n*eo(p(t,a,a+d)));
  n.textContent=n.dataset.pre+v+n.dataset.suf}
function facts(pre,t,ks){const k=seg(t,ks); ks.forEach((a,i)=>{const e=$(pre+i); if(!e) return; if(i!==k){e.style.opacity=0; return}
  rise(pre+i,t,a+.15,.4,50); count(pre+i,t,a+.15,.8)})}
function rows(pre,t,ks){const k=seg(t,ks); ks.forEach((a,i)=>{const e=$(pre+(i+1)); if(!e) return; e.classList.toggle('on',i===k);
  e.style.scale=i===k?String(1+.06*(1-eo(p(t,a,a+.3)))):'1'})}
function tap(id,t,times,pts){const e=$(id+'Tap'); e.style.opacity=0; times.forEach((a,i)=>{const x=p(t,a-.25,a+.35); if(x>0&&x<1){const [px,py]=pts[i];
  Object.assign(e.style,{left:px+'px',top:py+'px',opacity:String(x<.4?x/.4:1-(x-.4)/.6),scale:String(x<.4?1.25-.45*(x/.4):.8+.6*(x-.4))})}})}
function swap(id,t,times){const k=seg(t,times); times.forEach((a,i)=>{const e=$(id+'I'+(i+1)); if(e) e.style.opacity=String(i<k?1:(i===k?p(t,a,a+.12):0))})}
const WIPE={inside:['hk','100% 100%'],more:['hr','0% 100%'],langs:['hy','100% 0%'],blog:['hk','0% 0%'],art3:['hr','100% 100%'],cta:['hy','0% 100%']};
function setT(t){
  for(const k in S){const [a,b]=S[k];$(k).style.display=(t>=a&&t<b)?'block':'none'}
  // хук: первый кадр — готовая обложка (заголовок, телефон и адрес уже на месте)
  let l=t; {const k=1+.03*eo(p(l,0,3.4)); set('hookPh',{scale:String(k)})} pop('hookC1',l,.9); pop('hookC2',l,1.3); pop('hookC3',l,1.7); rise('hookZh',l,2.2,.4,40);
  l=t-S.inside[0]; left('insLab',l,.05); rise('insTtl',l,.15,.45,70); drop('insPh',l,.2);
  {const ks=[.6,1.3,2.5,3.7,4.9]; scroll('insPh',l,[[0,0],[1.3,1],[2.5,2],[3.7,3],[4.9,4]]); rows('insR',l,ks.slice(1)); ['insR1','insR2','insR3','insR4'].forEach((r,i)=>{if(l<.45+i*.08) set(r,{opacity:0}); else left(r,l,.45+i*.08,.35)}); facts('insF',l,ks)}
  l=t-S.more[0]; left('morLab',l,.05); rise('morTtl',l,.15,.45,70); drop('morPh',l,.2);
  {const ks=[.5,1.7,3.1]; scroll('morPh',l,[[0,0],[1.7,1],[3.1,2]]); ['morR1','morR2','morR3'].forEach((r,i)=>left(r,l,.4+i*.08,.35)); rows('morR',l,ks); facts('morF',l,ks)}
  l=t-S.langs[0]; rise('lanTtl',l,.15,.45,70); drop('lanPh',l,.2);
  {const T=[1.3,2.5]; swap('lanPh',l,T.map(a=>a+.1)); tap('lanPh',l,T,[[${Math.round(653 * K)},${Math.round(SB + 85 * K)}],[${Math.round(746 * K)},${Math.round(SB + 85 * K)}]]);
   const k=seg(l,[0,...T]); [0,1,2].forEach(i=>{$('lanC'+i).classList.toggle('on',i===k); left('lanC'+i,l,.35+i*.1,.35)}); rise('lanHint',l,.8,.4,30)}
  // вторая половина: три телефона «Обо мне» на трёх языках
  ['lanPh','lanC0','lanC1','lanC2','lanHint'].forEach(i=>away(i,l,3.55)); if(l>3.95) ['lanPh','lanC0','lanC1','lanC2','lanHint'].forEach(i=>set(i,{opacity:0}));
  ['lanA0','lanA1','lanA2'].forEach((i,n)=>{if(l<3.8+n*.2) set(i,{opacity:0}); else drop(i,l,3.8+n*.2,.64)}); ['lanP0','lanP1','lanP2'].forEach((i,n)=>{if(l<4.4+n*.15) set(i,{opacity:0}); else pop(i,l,4.4+n*.15)});
  if(l<5.0) set('lanTxt',{opacity:0}); else rise('lanTxt',l,5.0,.45,40);
  l=t-S.blog[0]; left('blgLab',l,.05); rise('blgTtl',l,.15,.45,70); drop('blgPh',l,.2); scroll('blgPh',l,[[0,0],[1.6,1],[3.0,2],[4.4,3]]);
  rise('blgN',l,.5,.4,40); count('blgN',l,.5,1.2); rise('blgL',l,.9,.4,30); pop('blgP',l,1.7); [0,1,2,3,4].forEach(i=>pop('blgC'+i,l,2.5+i*.2,.3));
  l=t-S.art3[0]; left('a3Lab',l,.05); rise('a3Ttl',l,.15,.45,70);
  ['a3P0','a3P1','a3P2'].forEach((i,n)=>{drop(i,l,.4+n*.25,.64); scroll(i,l,[[0,0],[3.2+n*.1,1]])}); ['a3G0','a3G1','a3G2'].forEach((i,n)=>pop(i,l,1.3+n*.15)); rise('a3Url',l,2.2,.4,40);
  l=t-S.cta[0]; {const k=eo(p(l,0,.6)); set('ctaCut',{translate:((1-k)*500)+'px 0'})} rise('ctaT',l,.2,.5,70); pop('ctaZh',l,.7,.4); rise('ctaBox',l,1.0,.45,60);
  let w=null; for(const k in WIPE){const T=S[k][0]; if(t>=T-.35&&t<T) w=[k,p(t,T-.35,T)]}
  if(w){const [k,x]=w;$('wipe').style.display='block';$('wipeBg').className=WIPE[k][0];$('wipe').style.clipPath='circle('+(eo(x)*2300)+'px at '+WIPE[k][1]+')'} else $('wipe').style.display='none';
}
window.setT=setT;
</script></body></html>`;

fs.mkdirSync(FR, { recursive: true });
fs.writeFileSync(`${TMP}/reel.html`, html);
if (!args.includes('--encode-only')) {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.goto(`file://${TMP}/reel.html`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(800);
  const still = arg('--still');
  if (still) {
    for (const s of still.split(',')) { await pg.evaluate(t => window.setT(t), +s); await pg.waitForTimeout(60); await pg.screenshot({ path: `${TMP}/still-${s}.jpg`, type: 'jpeg', quality: 88 }); console.log('still', s); }
    await br.close(); process.exit(0);
  }
  const [f0, f1] = (arg('--frames') || `0-${N - 1}`).split('-').map(Number);
  for (let f = f0; f <= f1; f++) {
    await pg.evaluate(t => window.setT(t), f / FPS);
    await pg.screenshot({ path: `${FR}/f${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
    if (f % 90 === 0) console.log('frame', f, '/', N);
  }
  await br.close();
}
// звук: музыка + «вжух» на переходах и падениях телефонов + щелчки на появлениях и нажатиях
const SFX = `${ROOT}/source-videos/2026-10-07-byt-tehnika/sfx`;
const W = [...Object.values(S).slice(1).map(([a]) => a - 0.3), S.langs[0] + 3.8, S.art3[0] + 0.4];
const C = [0.9, 1.3, 1.7, ...[1.3, 2.5, 3.7, 4.9].map(x => S.inside[0] + x), ...[1.7, 3.1].map(x => S.more[0] + x), ...[1.3, 2.5, 4.4, 4.55, 4.7].map(x => S.langs[0] + x),
  ...[1.7, 2.5, 2.7, 2.9, 3.1, 3.3].map(x => S.blog[0] + x), ...[1.3, 1.45, 1.6].map(x => S.art3[0] + x), S.cta[0] + 1.0];
const ins = [`-i "${ROOT}/интернет-материалы/музыка/inspiring-technology-soundrider.mp3"`, ...W.map(() => `-i ${SFX}/whoosh.wav`), ...C.map(() => `-i ${SFX}/switch.wav`)];
const fl = [`[1:a]atrim=0:${DUR},afade=t=in:d=0.4,afade=t=out:st=${DUR - 1.8}:d=1.8,volume=0.5[m]`,
  ...W.map((s, i) => `[${i + 2}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},volume=0.4[w${i}]`),
  ...C.map((s, i) => `[${i + 2 + W.length}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},volume=0.3[c${i}]`),
  `[m]${W.map((_, i) => `[w${i}]`).join('')}${C.map((_, i) => `[c${i}]`).join('')}amix=inputs=${1 + W.length + C.length}:normalize=0:duration=first,loudnorm=I=-15:TP=-1.5:LRA=11[a]`];
const out = `${ROOT}/finished-videos/${NAME}.mp4`;
execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${FR}/f%04d.jpg ${ins.join(' ')} -filter_complex "${fl.join(';')}" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -t ${DUR} -movflags +faststart "${out}"`, { stdio: 'inherit' });
console.log('✓', out);
