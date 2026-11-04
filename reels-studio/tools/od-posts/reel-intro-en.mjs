// Английская версия интро «официально» (04.11.2026) — копия reel-intro.mjs с переводом.
// Reels «Интро · официально» для личного профиля @ostap.dotsenko (02.11.2026: «использовать мои фото в костюме, где я в официальном
// формате… показать мои кейсы, когда я работал в Мегамаркете-Сбер и в Алибабе… проекты ГТТ — на тёмно-синем фоне»).
// Язык профиля (жёлтый · чернила · красный, Unbounded + кисть, печать 多), GTT — тёмно-синий, Aura — красный.
// Факты — только с ostapdotcenko.ru («Обо мне», «Карьера», «Результаты», «Проекты») и aura-robotics.ru. Фото — свои публикации
// пользователя (source-videos/фото-от-пользователя/остап/из-профиля/). Без голоса, музыка Inspiring Ambient Motivation (CC BY 3.0).
// Запуск: node reels-studio/tools/od-posts/reel-intro.mjs [--still 1.5,5,10] [--frames A-B] [--encode-only]
import { createRequire } from 'module'; import fs from 'fs'; import { execSync } from 'child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = '/home/user/VIDEO-HUB', SV = `file://${ROOT}/source-videos/`, F = `${ROOT}/презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/`;
const P = `${SV}фото-от-пользователя/остап/из-профиля/`;
const NAME = '2026-11-04-od-intro-en', FPS = 30;
const S = { hook: [0, 3.4], about: [3.4, 7.4], ali: [7.4, 13.4], mega: [13.4, 19.4], talk: [19.4, 23.4], gtt: [23.4, 28.4], aura: [28.4, 31.0], cta: [31.0, 34.5] };
const DUR = 34.5, N = Math.round(DUR * FPS), TMP = '/dev/shm/odintro-en', FR = `${TMP}/frames`;
const args = process.argv.slice(2), arg = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

const card = (id, src, st, pos = 'center') => `<div class="card" id="${id}" style="${st}"><div class="kb" style="background-image:url('${src}');background-position:${pos}"></div></div>`;
const stat = (id, num, lab, x, y, w = 300, size = 104) => `<div class="a" id="${id}" style="left:${x}px;top:${y}px;width:${w}px"><div class="num" style="font-size:${size}px" data-n="${num}">${num}</div><div class="slab">${lab}</div></div>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Unbounded;font-weight:200 900;src:url('file://${F}Unbounded-variable.ttf')}
@font-face{font-family:Golos;font-weight:400 900;src:url('file://${F}GolosText-variable.ttf')}
@font-face{font-family:JB;font-weight:100 800;src:url('file://${F}JetBrainsMono-variable.ttf')}
@font-face{font-family:MSZ;src:url('file://${ROOT}/интернет-материалы/шрифты/ma-shan-zheng.woff2') format('woff2')}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:Golos,sans-serif;background:#15151D}
.a{position:absolute}.sc{position:absolute;inset:0;display:none;overflow:hidden}
.hy{position:absolute;inset:0;background:#FFD92E;background-image:radial-gradient(rgba(25,25,34,.16) 3.4px,transparent 4px);background-size:22px 22px}
.hk{position:absolute;inset:0;background:#15151D;background-image:radial-gradient(rgba(255,217,46,.12) 3.4px,transparent 4px);background-size:22px 22px}
.hr{position:absolute;inset:0;background:#E8341C;background-image:radial-gradient(rgba(25,25,34,.2) 3.4px,transparent 4px);background-size:22px 22px}
.hb{position:absolute;inset:0;background:radial-gradient(circle at 70% 25%,#1B3A8F 0,#0B1D55 55%,#081440 100%)}
.hb::after{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(125,211,252,.16) 3.4px,transparent 4px);background-size:22px 22px}
.seal{position:absolute;right:64px;top:262px;width:84px;height:84px;background:#C8102E;color:#fff;font:400 64px/84px MSZ;text-align:center;border-radius:10px;box-shadow:0 0 0 5px #fff;rotate:-4deg;z-index:50}
.lab{position:absolute;left:64px;top:270px;font:700 30px JB;letter-spacing:.16em;text-transform:uppercase;color:#FFD92E}
.ttl{position:absolute;left:60px;right:160px;top:320px;font:900 72px/1.04 Unbounded;color:#fff;letter-spacing:-.02em}
.card{position:absolute;overflow:hidden;border:8px solid #fff;box-shadow:16px 16px 0 #191922;background:#222}
.kb{position:absolute;inset:-4%;background-size:cover}
.num{font:900 104px/1 Unbounded;color:#FFD92E;letter-spacing:-.04em;white-space:nowrap}
.slab{margin-top:10px;font:600 30px/1.2 Golos;color:#ECEAE3}
.pill{position:absolute;left:64px;background:#fff;border:5px solid #191922;padding:14px 20px;font:700 32px/1.2 Golos;color:#191922;box-shadow:8px 8px 0 var(--sh,#FFD92E);transform-origin:0 50%}
.pill b{font-family:Unbounded;font-weight:900}
.wm{position:absolute;font:400 700px/1 MSZ}
.cut{position:absolute;object-fit:contain}
.wipe{position:absolute;inset:0;display:none;z-index:40}
</style></head><body><div class="seal">多</div>

<div class="sc" id="hook"><div class="hk"></div>
  <div class="a" id="hookPh" style="left:0;top:0;width:1080px;height:1330px;overflow:hidden"><div class="kb" id="hookKb" style="background-image:url('${P}2024-12-01-выступление.jpg');background-position:68% 0%;background-size:auto 1520px"></div></div>
  <div class="a" style="left:0;right:0;top:1000px;height:340px;background:linear-gradient(transparent,#15151D)"></div>
  <div class="lab" id="hookLab" style="top:1150px">Ostap Dotsenko · 多增科</div>
  <div class="a" id="hookT1" style="left:60px;top:1215px;font:900 84px/1 Unbounded;color:#fff">Ex Alibaba.</div>
  <div class="a" id="hookT2" style="left:60px;top:1307px;font:900 84px/1 Unbounded;color:#fff">Ex Sber.</div>
  <div class="a" id="hookT3" style="left:60px;top:1399px;font:900 72px/1.2 Unbounded;color:#FFD92E;white-space:nowrap">Now — Shanghai.</div>
</div>

<div class="sc" id="about"><div class="hk"></div><div class="wm" style="right:-60px;top:900px;color:rgba(255,217,46,.08)">我</div>
  <div class="lab" id="aboutLab">Russia ↔ China ↔ SE Asia</div>
  ${card('aboutCard', `${P}2026-10-22-чанша-ярмарка.jpg`, 'left:64px;top:330px;width:952px;height:700px;rotate:-1.5deg', 'center 38%')}
  ${stat('aboutS1', '13+', 'years of experience', 64, 1110)}${stat('aboutS2', '20+', 'countries', 400, 1110)}${stat('aboutS3', '5', 'languages', 736, 1110, 260)}
  <div class="a" id="aboutLang" style="left:64px;right:64px;top:1330px;font:600 34px/1.4 Golos;color:#ECEAE3">Русский · English · <span style="font:400 42px MSZ;color:#FFD92E">中文</span> · 한국어 · O'zbek</div>
</div>

<div class="sc" id="ali"><div class="hk"></div><div class="wm" style="right:-80px;top:880px;color:rgba(255,106,0,.10)">阿</div>
  <div class="lab" id="aliLab">Case · Alibaba Group · 2020–2022</div>
  <div class="ttl" id="aliTtl">O2O partnerships<br>AliExpress</div>
  ${card('aliC1', `${P}2018-06-14-alibaba-ханчжоу.jpg`, 'left:64px;top:560px;width:560px;height:420px;rotate:-3deg', 'center 40%')}
  ${card('aliC2', `${P}2022-06-23-aliexpress.jpg`, 'left:580px;top:600px;width:440px;height:540px;rotate:3deg', 'center 30%')}
  ${stat('aliS1', '$48M', 'GMV AliExpress<br>Russia &amp; CIS', 64, 1190, 320, 64)}${stat('aliS2', '+100%', 'GMV growth<br>in a year', 420, 1190, 320, 64)}${stat('aliS3', '×25', 'average<br>campaign ROI', 790, 1190, 230, 64)}
  <div class="a" id="aliPart" style="left:64px;right:64px;top:1420px;font:600 28px/1.35 Golos;color:#A9A7B4">Partners: Alfa-Bank · Tinkoff · MTS Bank · Megafon · Beeline · Rosneft and 120+ media</div>
</div>

<div class="sc" id="mega"><div class="hk"></div><div class="wm" style="right:-60px;top:880px;color:rgba(255,217,46,.08)">市</div>
  <div class="lab" id="megaLab">Case · Megamarket / Sber · 2023–2025</div>
  <div class="ttl" id="megaTtl">Head of<br>B2B Marketing</div>
  ${card('megaC1', `${P}2025-06-01-портрет-чб.jpg`, 'left:64px;top:560px;width:470px;height:590px;rotate:-3deg', 'center 20%')}
  ${card('megaC2', `${P}2024-10-26-мегасреда-спикер.jpg`, 'left:520px;top:640px;width:500px;height:360px;rotate:3deg', 'center 30%')}
  ${stat('megaS1', '+350%', 'seller growth<br>in a year', 64, 1190, 320, 64)}${stat('megaS2', '50 000', 'sellers<br>on the platform', 420, 1190, 320, 64)}${stat('megaS3', '86', 'regions<br>of Russia', 800, 1190, 220, 64)}
  <div class="pill" id="megaP1" style="top:1372px;font-size:27px">“Megasreda” · <b>20 cities</b></div>
  <div class="pill" id="megaP2" style="top:1456px;font-size:27px">“Made in Russia” · <b>0 → 2000</b></div>
</div>

<div class="sc" id="talk"><div class="hy"></div>
  <div class="lab" id="talkLab" style="color:#191922">Speaker · panels &amp; forums</div>
  ${card('talkC1', `${P}2025-06-28-russian-retail-week.jpg`, 'left:64px;top:340px;width:450px;height:560px;rotate:-3deg;border-color:#191922', 'center 20%')}
  ${card('talkC2', `${P}2025-09-07-шос.jpg`, 'left:560px;top:380px;width:460px;height:460px;rotate:3deg;border-color:#191922', 'center 30%')}
  ${card('talkC3', `${P}2024-06-28-amber-forum.jpg`, 'left:120px;top:880px;width:440px;height:400px;rotate:2deg;border-color:#191922', 'center 30%')}
  ${card('talkC4', `${P}2024-02-11-саммит-иркутск.jpg`, 'left:580px;top:860px;width:440px;height:345px;rotate:-2deg;border-color:#191922', 'center 30%')}
  <div class="a" id="talkNum" style="left:64px;top:1300px;font:900 150px/1 Unbounded;color:#191922;letter-spacing:-.04em">50+</div>
  <div class="a" id="talkTxt" style="left:440px;top:1330px;width:580px;font:800 44px/1.15 Unbounded;color:#191922">expos<br>and forums</div>
</div>

<div class="sc" id="gtt"><div class="hb"></div><div class="wm" style="right:-60px;top:860px;color:rgba(125,211,252,.10)">游</div>
  <div class="lab" id="gttLab" style="color:#7DD3FC">Now · Shanghai · 游</div>
  <div class="ttl" id="gttTtl">Global Tech Tour</div>
  ${card('gttC1', `${SV}2026-10-26-yingke/фото/3.jpg`, 'left:64px;top:470px;width:600px;height:420px;rotate:-2.5deg;border-color:#fff;box-shadow:16px 16px 0 #2563EB', 'center 30%')}
  ${card('gttC2', `${SV}2026-10-26-xingwang/фото/188.jpg`, 'left:470px;top:780px;width:550px;height:400px;rotate:2.5deg;border-color:#fff;box-shadow:16px 16px 0 #2563EB', 'center 40%')}
  <div class="pill" id="gttP0" style="top:1230px;--sh:#2563EB">Expeditions to <b>China &amp; SE Asia</b></div>
  <div class="pill" id="gttP1" style="top:1330px;--sh:#2563EB">BYD · Xiaomi · Baidu · Meituan</div>
  <div class="pill" id="gttP2" style="top:1430px;--sh:#2563EB">Megamarket forum for <b>1,200+</b> guests</div>
</div>

<div class="sc" id="aura"><div class="hr"></div>
  <div class="lab" id="auraLab" style="color:#191922">And robots · 机</div>
  <div class="ttl" id="auraTtl">Aura Robotics</div>
  ${card('auraC1', `${SV}ostapdotcenko/reels-кадры/34.jpg`, 'left:64px;top:470px;width:952px;height:720px;rotate:-1.5deg;border-color:#191922', 'center 25%')}
  <div class="pill" id="auraP0" style="top:1250px;--sh:#191922">Robots <b>straight from factories</b> in China</div>
  <div class="pill" id="auraP1" style="top:1350px;--sh:#191922"><b>100+</b> manufacturers · <b>17</b> cities</div>
</div>

<div class="sc" id="cta"><div class="hk"></div>
  <img class="cut" id="ctaCut" src="${SV}фото-от-пользователя/остап/вырезки/ostap-portret-sait.png" style="right:-190px;bottom:0;height:1250px">
  <div class="lab" id="ctaLab">Ostap Dotsenko · 多增科</div>
  <div class="a" id="ctaT" style="left:60px;top:330px;width:620px;font:900 88px/1.02 Unbounded;color:#fff">Follow<br>me</div>
  <div class="a" id="ctaS" style="left:64px;top:540px;width:560px;font:700 40px/1.25 Golos;color:#ECEAE3">China from the inside, robots and business — no gloss</div>
  <div class="a" id="ctaBox" style="left:64px;top:1330px;width:500px;background:#FFD92E;padding:26px 30px;box-shadow:12px 12px 0 #E8341C;display:grid;gap:12px;font:700 32px JB;color:#191922">
    <div>@ostap.dotsenko</div><div>ostapdotcenko.ru</div><div style="color:#1D4ED8">@globaltech_tour</div></div>
</div>

<div class="wipe" id="wipe"><div id="wipeBg"></div></div>
<script>
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), p=(t,a,b)=>cl((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3), eb=x=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
const S=${JSON.stringify(S)}, $=id=>document.getElementById(id), set=(id,st)=>{const e=$(id); if(e) Object.assign(e.style,st)};
const rise=(id,t,a,d=.45,dy=60)=>{const k=eo(p(t,a,a+d));set(id,{opacity:k,translate:'0 '+((1-k)*dy)+'px'})};
const left=(id,t,a,d=.4)=>{const k=eo(p(t,a,a+d));set(id,{opacity:k,translate:((1-k)*-120)+'px 0'})};
const pop=(id,t,a,d=.38)=>{const x=p(t,a,a+d);set(id,{opacity:x>0?1:0,scale:String(.4+.6*eb(x))})};
const drop=(id,t,a,rot)=>{const x=p(t,a,a+.5);set(id,{opacity:x>0?1:0,translate:'0 '+((1-eo(x))*-260)+'px',scale:String(1.25-.25*eo(x))})};
const kb=(id,t,len)=>{const e=$(id); if(e){const k=e.querySelector('.kb'); if(k) k.style.scale=String(1.0+0.08*cl(t/len))}};
// число набегает от нуля: «$48M», «+350%», «50 000», «×25», «13+»
function count(id,t,a,d=1.0){const e=$(id); if(!e) return; const n=e.querySelector('.num'); const full=n.dataset.n; const m=full.match(/([\\d\\s]+)/);
  rise(id,t,a,.4,40); if(!m) return; const target=parseInt(m[1].replace(/\\s/g,'')); const v=Math.round(target*eo(p(t,a,a+d)));
  const s=target>=10000?v.toLocaleString('en-US').replace(/\\u00a0/g,' '):String(v); n.textContent=full.replace(m[1].trim(),s)}
const WIPE={about:['hk','100% 100%'],ali:['hk','0% 100%'],mega:['hk','100% 0%'],talk:['hy','0% 0%'],gtt:['hb','100% 100%'],aura:['hr','0% 100%'],cta:['hk','100% 0%']};
function setT(t){
  for(const k in S){const [a,b]=S[k];$(k).style.display=(t>=a&&t<b)?'block':'none'}
  let l=t; $('hookKb').style.scale=String(1.14-0.12*eo(p(l,0,3.4)));
  // первый кадр — готовая обложка (Instagram берёт его по умолчанию): имя и «Ex Alibaba.» уже на месте
  left('hookLab',l,-.5); rise('hookT1',l,-.5,.4); rise('hookT2',l,.3,.4); rise('hookT3',l,.8,.45);
  l=t-S.about[0]; left('aboutLab',l,.05); drop('aboutCard',l,.1); kb('aboutCard',l,4); count('aboutS1',l,.7); count('aboutS2',l,1.0); count('aboutS3',l,1.3); rise('aboutLang',l,1.9,.4,30);
  l=t-S.ali[0]; left('aliLab',l,.05); rise('aliTtl',l,.2,.5,70); drop('aliC1',l,.5); drop('aliC2',l,.9); kb('aliC1',l,6); kb('aliC2',l,6);
  count('aliS1',l,1.6); count('aliS2',l,2.1); count('aliS3',l,2.6); rise('aliPart',l,3.3,.4,30);
  l=t-S.mega[0]; left('megaLab',l,.05); rise('megaTtl',l,.2,.5,70); drop('megaC1',l,.5); drop('megaC2',l,.9); kb('megaC1',l,6); kb('megaC2',l,6);
  count('megaS1',l,1.6); count('megaS2',l,2.1,1.1); count('megaS3',l,2.6); pop('megaP1',l,3.4); pop('megaP2',l,3.9);
  l=t-S.talk[0]; left('talkLab',l,.05); drop('talkC1',l,.2); drop('talkC2',l,.6); drop('talkC3',l,1.0); drop('talkC4',l,1.4); ['talkC1','talkC2','talkC3','talkC4'].forEach(i=>kb(i,l,4));
  pop('talkNum',l,2.0,.4); rise('talkTxt',l,2.3,.4,30);
  l=t-S.gtt[0]; left('gttLab',l,.05); rise('gttTtl',l,.2,.5,70); drop('gttC1',l,.5); drop('gttC2',l,.9); kb('gttC1',l,5); kb('gttC2',l,5); pop('gttP0',l,1.7); pop('gttP1',l,2.3); pop('gttP2',l,2.9);
  l=t-S.aura[0]; left('auraLab',l,.05); rise('auraTtl',l,.15,.45,70); drop('auraC1',l,.35); kb('auraC1',l,2.6); pop('auraP0',l,1.0); pop('auraP1',l,1.5);
  l=t-S.cta[0]; {const k=eo(p(l,0,.6)); set('ctaCut',{translate:((1-k)*500)+'px 0'})} left('ctaLab',l,.1); rise('ctaT',l,.25,.5,70); rise('ctaS',l,.6,.45,40); rise('ctaBox',l,1.1,.45,60);
  let w=null; for(const k in WIPE){const T=S[k][0]; if(t>=T-.35&&t<T) w=[k,p(t,T-.35,T)]}
  if(w){const [k,x]=w;$('wipe').style.display='block';$('wipeBg').className=WIPE[k][0];$('wipe').style.clipPath='circle('+(eo(x)*2300)+'px at '+WIPE[k][1]+')'} else $('wipe').style.display='none';
}
window.setT=setT;
</script></body></html>`;

fs.mkdirSync(FR, { recursive: true });
fs.writeFileSync(`${TMP}/reel.html`, html);
if (!args.includes('--encode-only')) {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.goto(`file://${TMP}/reel.html`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(600);
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
// звук: музыка + «вжух» на переходах + щелчки на появлениях
const SFX = `${ROOT}/source-videos/2026-10-07-byt-tehnika/sfx`;
const W = Object.values(S).slice(1).map(([a]) => a - 0.3);
const C = [S.about[0] + 0.7, S.about[0] + 1.0, S.about[0] + 1.3, S.ali[0] + 1.6, S.ali[0] + 2.1, S.ali[0] + 2.6, S.mega[0] + 1.6, S.mega[0] + 2.1, S.mega[0] + 2.6,
  S.mega[0] + 3.4, S.mega[0] + 3.9, S.talk[0] + 2.0, S.gtt[0] + 1.7, S.gtt[0] + 2.3, S.gtt[0] + 2.9, S.aura[0] + 1.0, S.aura[0] + 1.5];
const ins = [`-i "${ROOT}/интернет-материалы/музыка/inspiring-ambient-motivation-soundrider.mp3"`, ...W.map(() => `-i ${SFX}/whoosh.wav`), ...C.map(() => `-i ${SFX}/switch.wav`)];
const fl = [`[1:a]atrim=0:${DUR},afade=t=in:d=0.5,afade=t=out:st=${DUR - 1.8}:d=1.8,volume=0.6[m]`,
  ...W.map((s, i) => `[${i + 2}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},volume=0.4[w${i}]`),
  ...C.map((s, i) => `[${i + 2 + W.length}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},volume=0.3[c${i}]`),
  `[m]${W.map((_, i) => `[w${i}]`).join('')}${C.map((_, i) => `[c${i}]`).join('')}amix=inputs=${1 + W.length + C.length}:normalize=0:duration=first,loudnorm=I=-15:TP=-1.5:LRA=11[a]`];
const out = `${ROOT}/finished-videos/${NAME}.mp4`;
execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${FR}/f%04d.jpg ${ins.join(' ')} -filter_complex "${fl.join(';')}" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -t ${DUR} -movflags +faststart "${out}"`, { stdio: 'inherit' });
console.log('✓', out);
