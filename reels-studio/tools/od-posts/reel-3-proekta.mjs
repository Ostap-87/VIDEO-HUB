// Reels «Чем я занимаюсь: 3 проекта» для личного профиля @ostap.dotsenko — тот же язык, что у обложек и карусели od-posts
// (жёлтый · чернила · красный, Unbounded + кисть Ma Shan Zheng, печать 多). Без голоса: хук → GlobalTechTour → Aura Robotics →
// ostapdotcenko.ru → призыв; в телефоне — прокрутка настоящих сайтов (source-videos/сайты-прокрутка/), музыка Upbeat Corporate (CC BY).
// Кадры считаются в браузере покадрово (setT), затем ffmpeg. Запуск:
//   node reels-studio/tools/od-posts/reel-3-proekta.mjs [--frames 0-765] [--still 4.5,10,16]
// Кадры прокрутки сайтов готовит сам скрипт (ffmpeg → /dev/shm/od3/<сайт>/f0001.jpg…).
import { createRequire } from 'module'; import fs from 'fs'; import { execSync } from 'child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = '/home/user/VIDEO-HUB', SV = `file://${ROOT}/source-videos/`, F = `${ROOT}/презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/`;
const NAME = '2026-11-02-od-3-proekta', FPS = 30, DUR = 25.5, N = Math.round(DUR * FPS);
const TMP = '/dev/shm/od3', FR = `${TMP}/frames`;
const SITES = { gtt: 'globaltechtour-expeditions', aura: 'aura-robotics-home', od: 'ostapdotcenko-home-photo' };
const args = process.argv.slice(2), arg = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

for (const [k, f] of Object.entries(SITES)) if (!fs.existsSync(`${TMP}/${k}/f0192.jpg`)) {
  fs.mkdirSync(`${TMP}/${k}`, { recursive: true });
  execSync(`ffmpeg -v error -y -t 6.4 -i "${ROOT}/source-videos/сайты-прокрутка/${f}.mp4" -vf scale=540:960:flags=lanczos -q:v 3 ${TMP}/${k}/f%04d.jpg`);
}

// сцены: [начало, конец, фон]
const S = { hook: [0, 3.0], gtt: [3.0, 9.0], aura: [9.0, 15.0], od: [15.0, 21.0], cta: [21.0, DUR] };
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Unbounded;font-weight:200 900;src:url('file://${F}Unbounded-variable.ttf')}
@font-face{font-family:Golos;font-weight:400 900;src:url('file://${F}GolosText-variable.ttf')}
@font-face{font-family:JB;font-weight:100 800;src:url('file://${F}JetBrainsMono-variable.ttf')}
@font-face{font-family:MSZ;src:url('file://${ROOT}/интернет-материалы/шрифты/ma-shan-zheng.woff2') format('woff2')}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:Golos,sans-serif;background:#15151D}
.a{position:absolute}.sc{position:absolute;inset:0;display:none;overflow:hidden}
.hy{position:absolute;inset:0;background:#FFD92E;background-image:radial-gradient(rgba(25,25,34,.16) 3.4px,transparent 4px);background-size:22px 22px}
.hk{position:absolute;inset:0;background:#15151D;background-image:radial-gradient(rgba(255,217,46,.13) 3.4px,transparent 4px);background-size:22px 22px}
/* GTT — тёмно-синий фирменный (решение пользователя 02.11.2026: «проекты ГТТ — не на чёрном, а на тёмно-синем») */
.hb{position:absolute;inset:0;background:radial-gradient(circle at 70% 25%,#1B3A8F 0,#0B1D55 55%,#081440 100%);}
.hb::after{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(125,211,252,.16) 3.4px,transparent 4px);background-size:22px 22px}
.hr{position:absolute;inset:0;background:#E8341C;background-image:radial-gradient(rgba(25,25,34,.2) 3.4px,transparent 4px);background-size:22px 22px}
.speed{position:absolute;inset:-300px;background:repeating-conic-gradient(from var(--r,0deg) at 50% 50%,rgba(25,25,34,.09) 0 2deg,transparent 2deg 9deg)}
.bub{position:absolute;background:#fff;border:7px solid #191922;padding:22px 28px 20px;font:900 58px/1.08 Unbounded;color:#191922;box-shadow:12px 12px 0 #191922;letter-spacing:-.01em;transform-origin:20% 100%}
.bub small{display:block;margin-top:10px;font:400 46px/1.1 MSZ;color:#E8341C;letter-spacing:0}
.bub::after{content:"";position:absolute;bottom:-40px;left:80px;border:18px solid transparent;border-top:28px solid #191922}
.sfx{position:absolute;font:400 190px/1 MSZ;color:#E8341C;-webkit-text-stroke:6px #191922;text-shadow:10px 10px 0 #191922}
.seal{position:absolute;right:64px;top:262px;width:84px;height:84px;background:#C8102E;color:#fff;font:400 64px/84px MSZ;text-align:center;border-radius:10px;box-shadow:0 0 0 5px #fff;rotate:-4deg;z-index:50}
.lab{font:700 30px JB;letter-spacing:.16em;text-transform:uppercase}
.ttl{font:900 92px/1 Unbounded;letter-spacing:-.02em}
.wm{position:absolute;font:400 760px/1 MSZ}
.phone{position:absolute;left:540px;top:500px;width:480px;height:985px;border-radius:62px;background:#0d0d12;padding:17px;box-shadow:18px 22px 0 #191922}
.phone .scr{width:100%;height:100%;border-radius:48px;overflow:hidden;background:#fff}.phone img{width:100%;display:block}
.phone .isl{position:absolute;left:50%;top:30px;width:134px;height:34px;margin-left:-67px;border-radius:99px;background:#0d0d12}
.pill{position:absolute;left:64px;width:440px;background:#fff;border:5px solid #191922;padding:16px 20px;font:700 33px/1.2 Golos;color:#191922;box-shadow:8px 8px 0 var(--sh,#FFD92E);transform-origin:0 50%}
.pill b{font-family:Unbounded;font-weight:900}
.link{position:absolute;left:64px;top:1440px;font:700 30px JB;letter-spacing:.04em}
.cut{position:absolute;object-fit:contain}
.wipe{position:absolute;inset:0;display:none;z-index:40}
</style></head><body>
<div class="seal">多</div>

<div class="sc" id="hook"><div class="hy"></div><div class="speed" id="hookSpeed"></div>
  <img class="cut" id="hookCut" src="${SV}фото-от-пользователя/остап/вырезки/ostap-fintech-kadr.png" style="right:-230px;bottom:-150px;height:1280px">
  <div class="a" id="hookChip" style="left:64px;top:262px;background:#191922;color:#FFD92E;font:700 30px JB;letter-spacing:.12em;padding:14px 20px">ОСТАП ДОЦЕНКО · 多增科</div>
  <div class="bub" id="hookBub" style="left:64px;top:370px;width:540px">Чем я занимаюсь в&nbsp;Китае?<small>我在中国做什么？</small></div>
  <div class="sfx" id="hookSfx" style="left:70px;top:900px">你好!</div>
  <div class="a" id="hookMore" style="left:64px;top:1330px;background:#191922;color:#FFD92E;font:900 46px Unbounded;padding:22px 30px;box-shadow:10px 10px 0 #E8341C">3 проекта →</div>
</div>

${['gtt', 'aura', 'od'].map((k) => {
  const c = { gtt: ['hb', '#7DD3FC', '#fff', '游', 'rgba(125,211,252,.10)', 'Проект 1 · 游 экспедиции', 'Global Tech Tour', 'globaltechtour.ru', '#7DD3FC'],
    aura: ['hr', '#FFD92E', '#fff', '机', 'rgba(25,25,34,.12)', 'Проект 2 · 机 роботы', 'Aura Robotics', 'aura-robotics.ru', '#191922'],
    od: ['hy', '#191922', '#191922', '多', 'rgba(232,52,28,.12)', 'Проект 3 · 多 личный сайт', 'ostapdotcenko<span style="color:#E8341C">.ru</span>', 'ссылка — в шапке профиля', '#E8341C'] }[k];
  const pills = { gtt: ['Экспедиции в <b>Китай и ЮВА</b>', 'Заводы и R&amp;D: <b>BYD, Xiaomi, Baidu</b>', '<b>Meituan, Poizon, Leju Robotics</b>', 'Форум Мегамаркета на <b>1200+</b> участников'],
    aura: ['Роботы <b>напрямую с заводов</b> Китая', 'Гуманоиды, коботы, AGV', '<b>100+</b> производителей · <b>17</b> городов', 'Закупочные поездки по заводам'],
    od: ['Карьера и кейсы — <b>в цифрах</b>', 'Консультации: <b>выход в Китай</b>', 'Блог: <b>статья каждый день</b>', 'RU · EN · <span style="font:400 40px MSZ;color:#E8341C">中文</span>'] }[k];
  return `<div class="sc" id="${k}"><div class="${c[0]}"></div><div class="wm" id="${k}Wm" style="left:-80px;top:780px;color:${c[4]}">${c[3]}</div>
  <div class="a lab" id="${k}Lab" style="left:64px;top:270px;color:${c[1]}">${c[5]}</div>
  <div class="a ttl" id="${k}Ttl" style="left:60px;right:160px;top:322px;color:${c[2]};font-size:${k === 'od' ? 72 : 92}px">${c[6]}</div>
  <div class="phone" id="${k}Phone"><div class="scr"><img id="${k}Img" src="${TMP}/${k}/f0001.jpg"></div><div class="isl"></div></div>
  ${pills.map((p, i) => `<div class="pill" id="${k}P${i}" style="top:${560 + i * 200}px;--sh:${k === 'aura' ? '#191922' : k === 'od' ? '#E8341C' : '#2563EB'}">${p}</div>`).join('')}
  <div class="link" id="${k}Link" style="color:${c[8]}">${c[7]}</div></div>`;
}).join('')}

<div class="sc" id="cta"><div class="hk"></div><div class="speed" id="ctaSpeed" style="opacity:.0"></div>
  <img class="cut" id="ctaCut" src="${SV}фото-от-пользователя/остап/вырезки/ostap-yingke-mikrofon.png" style="left:-200px;bottom:-60px;height:1120px">
  <div class="bub" id="ctaBub" style="right:64px;top:380px;width:620px;font-size:54px;transform-origin:30% 100%">Подпишись: Китай изнутри, роботы и бизнес без глянца<small>关注我！</small></div>
  <div class="a" id="ctaBox" style="right:64px;top:1010px;width:540px;background:#FFD92E;padding:28px 32px;box-shadow:12px 12px 0 #E8341C;display:grid;gap:14px;font:700 33px JB;color:#191922">
    <div>游 globaltechtour.ru</div><div>机 aura-robotics.ru</div><div>多 ostapdotcenko.ru</div>
    <div id="ctaAsk" style="margin-top:8px;padding-top:16px;border-top:4px solid #191922;font:800 34px/1.25 Golos">Есть вопрос про Китай — пиши в директ</div></div>
</div>

<div class="wipe" id="wipe"><div id="wipeBg"></div></div>
<script>
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), p=(t,a,b)=>cl((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3), eb=x=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
const S=${JSON.stringify(S)}, $=id=>document.getElementById(id);
const set=(id,st)=>Object.assign($(id).style,st);
// появление: снизу (rise), слева (left), «поп» (pop), «штамп» (stamp)
const rise=(id,t,a,d=.45,dy=60)=>{const k=eo(p(t,a,a+d));set(id,{opacity:k,translate:'0 '+((1-k)*dy)+'px'})};
const left=(id,t,a,d=.4)=>{const k=eo(p(t,a,a+d));set(id,{opacity:k,translate:((1-k)*-120)+'px 0'})};
const pop=(id,t,a,d=.38)=>{const x=p(t,a,a+d);set(id,{opacity:x>0?1:0,scale:String(.4+.6*eb(x))})};
const stamp=(id,t,a,rot=-10)=>{const x=p(t,a,a+.28);set(id,{opacity:x>0?1:0,scale:String(2.4-1.4*eo(x)),rotate:rot+(1-eo(x))*-14+'deg'})};
const WIPE={gtt:['hb','100% 100%'],aura:['hr','0% 100%'],od:['hy','100% 0%'],cta:['hk','0% 0%']};
async function setT(t){
  for(const k in S){const [a,b]=S[k];$(k).style.display=(t>=a&&t<b)?'block':'none'}
  // хук
  let l=t-S.hook[0];
  $('hookSpeed').style.setProperty('--r',(l*6)+'deg');
  // первый кадр — уже готовая обложка (Instagram берёт его по умолчанию): вырезка, плашка и облачко на месте с 0 с
  {const k=eb(p(l,-.6,-.05));set('hookCut',{translate:'0 '+((1-k)*700)+'px'})}
  left('hookChip',l,-.5); pop('hookBub',l,-.45); stamp('hookSfx',l,.5); pop('hookMore',l,1.3,.35);
  // проекты
  const loads=[];
  for(const k of ['gtt','aura','od']){
    l=t-S[k][0]; if(l<0||l>=S[k][1]-S[k][0]) continue;
    left(k+'Lab',l,.1); rise(k+'Ttl',l,.2,.5,80);
    {const x=eo(p(l,.25,.85));set(k+'Phone',{translate:((1-x)*640)+'px '+(Math.sin(l*1.3)*6)+'px',rotate:(3+(1-x)*12)+'deg'})}
    set(k+'Wm',{translate:'0 '+(-l*14)+'px'});
    for(let i=0;i<4;i++) pop(k+'P'+i,l,1.0+i*.8,.36);
    rise(k+'Link',l,4.4,.4,30);
    const f=Math.min(192,1+Math.max(0,Math.floor((l-.6)*30)));
    const img=$(k+'Img'), src='${TMP}/'+k+'/f'+String(f).padStart(4,'0')+'.jpg';
    if(!img.src.endsWith(src)){img.src=src;loads.push(img.decode().catch(()=>{}))}
  }
  // призыв
  l=t-S.cta[0];
  {const k=eb(p(l,0,.55));set('ctaCut',{translate:((1-k)*-600)+'px 0'})}
  pop('ctaBub',l,.35,.4); rise('ctaBox',l,1.1,.45,80); rise('ctaAsk',l,1.7,.4,40);
  // переход: круг цвета следующей сцены из угла за 0,35 с до стыка
  let w=null; for(const k of ['gtt','aura','od','cta']){const T=S[k][0]; if(t>=T-.35&&t<T) w=[k,p(t,T-.35,T)]}
  if(w){const [k,x]=w;$('wipe').style.display='block';$('wipeBg').className=WIPE[k][0];
    $('wipe').style.clipPath='circle('+(eo(x)*2300)+'px at '+WIPE[k][1]+')'} else $('wipe').style.display='none';
  await Promise.all(loads);
}
window.setT=setT;
</script></body></html>`;

fs.mkdirSync(FR, { recursive: true });
// usage: --encode-only пропускает браузер
fs.writeFileSync(`${TMP}/reel.html`, html);
const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto(`file://${TMP}/reel.html`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(400);
const still = arg('--still');
if (still) {
  for (const s of still.split(',')) { await pg.evaluate(t => window.setT(t), +s); await pg.screenshot({ path: `${TMP}/still-${s}.jpg`, type: 'jpeg', quality: 88 }); console.log('still', s); }
  await br.close(); process.exit(0);
}
// --encode-only — кадры уже посчитаны, только звук и склейка
const [f0, f1] = args.includes('--encode-only') ? [1, 0] : (arg('--frames') || `0-${N - 1}`).split('-').map(Number);
for (let f = f0; f <= f1; f++) {
  await pg.evaluate(t => window.setT(t), f / FPS);
  await pg.screenshot({ path: `${FR}/f${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  if (f % 90 === 0) console.log('frame', f, '/', N);
}
await br.close();

// звук: музыка Upbeat Corporate (CC BY 3.0, Soundrider/Dope) + «вжух» на переходах и щелчки на плашках
const SFX = `${ROOT}/source-videos/2026-10-07-byt-tehnika/sfx`;
const W = [2.7, 8.7, 14.7, 20.7], C = [0.5, 1.3, 3.4, 9.4, 15.4, 21.4];
for (const k of ['gtt', 'aura', 'od']) for (let i = 0; i < 4; i++) C.push(S[k][0] + 1.0 + i * 0.8);
const ins = [`-i "${ROOT}/интернет-материалы/музыка/upbeat-corporate-soundrider.mp3"`, ...W.map(() => `-i ${SFX}/whoosh.wav`), ...C.map(() => `-i ${SFX}/switch.wav`)];
const fl = [`[1:a]atrim=0:${DUR},afade=t=in:d=0.4,afade=t=out:st=${DUR - 1.6}:d=1.6,volume=0.55[m]`,
  ...W.map((s, i) => `[${i + 2}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},volume=0.45[w${i}]`),
  ...C.map((s, i) => `[${i + 2 + W.length}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},volume=0.35[c${i}]`),
  `[m]${W.map((_, i) => `[w${i}]`).join('')}${C.map((_, i) => `[c${i}]`).join('')}amix=inputs=${1 + W.length + C.length}:normalize=0:duration=first,loudnorm=I=-15:TP=-1.5:LRA=11[a]`];
const out = `${ROOT}/finished-videos/${NAME}.mp4`;
execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${FR}/f%04d.jpg ${ins.join(' ')} -filter_complex "${fl.join(';')}" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -t ${DUR} -movflags +faststart "${out}"`, { stdio: 'inherit' });
console.log('✓', out);
