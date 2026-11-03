// Reels GTT «Куда я вожу группы в Китае» (03.11.2026: «взять все истории и моменты, которые я ранее выкладывал в инсте, и собрать
// ролик, в котором показать, что я вожу разные группы — и на заводы, и к роботам, и на пищевые производства и т. д.»).
// Только реальные кадры: его публикации @ostap.dotsenko (Reels май–июнь 2026: AgiBot, Kepler, BYD, выставки, Drone World Congress —
// куски сохранены в source-videos/2026-11-03-gtt-проект/из-instagram/, список — README.json там же) и съёмка SANY / Xingwang / YingKe
// (октябрь 2026). Пищевых производств в его публикациях нет — они в сцене «И не только» списком программ сайта, без чужих кадров.
// Стиль — как интро «официально» (reel-intro.mjs): карточки с жёсткой тенью, Unbounded, растр; цвета GTT (тёмно-синий, #7DD3FC,
// тень #2563EB), знак — кристалл GTT. Видео в кадрах — рамки сторис (полоски, аватар). Без голоса, музыка Inspiring Corporate.
// Факты: подписи его постов (AgiBot — 10 000 роботов, Kepler — 30 кг на 2 руки, R&D-центр BYD, Шэньчжэнь), сайт globaltechtour.ru
// (1000+ компаний, 18 отраслей, 76 программ, 9 стран, названия программ), подписи каруселей Xingwang и YingKe.
// Запуск: node reels-studio/tools/gtt-reel/reel-gruppy.mjs [--still 0.5,6,14] [--frames A-B] [--encode-only]
import { createRequire } from 'module'; import fs from 'fs'; import { execSync } from 'child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = '/home/user/VIDEO-HUB', SV = `file://${ROOT}/source-videos/`, F = `${ROOT}/презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/`;
const IG = `${ROOT}/source-videos/2026-11-03-gtt-проект/из-instagram/`, SANY = `${ROOT}/source-videos/2026-10-25-sany/`;
const XW = `${SV}2026-10-26-xingwang/фото/`, YK = `${SV}2026-10-26-yingke/фото/`, PR = `${SV}фото-от-пользователя/остап/из-профиля/`;
const CRY = `file://${ROOT}/finished-videos/обложки/gtt-бренд/instagram/gtt-аватар-1080.jpg`, AV = `${SV}фото-от-пользователя/остап/ostap-portret-sait.jpg`;
const NAME = '2026-11-03-gtt-gruppy', FPS = 30;
const S = { hook: [0, 3.6], robots: [3.6, 11.4], plants: [11.4, 19.0], bosses: [19.0, 25.2], events: [25.2, 29.6], more: [29.6, 33.8], nums: [33.8, 37.6], cta: [37.6, 41.6] };
const DUR = 41.6, N = Math.round(DUR * FPS), TMP = '/dev/shm/gtr', FR = `${TMP}/frames`;
const args = process.argv.slice(2), arg = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

// куски видео: файл, с какой секунды файла, сколько, HDR iPhone → обычные цвета, размер кадров
const TM = 'zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:rin=tv:t=linear:npl=150,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0:peak=4,zscale=t=bt709:m=bt709:r=pc,format=rgb24,eq=saturation=1.25:contrast=1.08:brightness=0.03,colorbalance=rm=0.05:bm=-0.05:rs=0.02:bs=-0.03,';
const CL = {
  h1: [`${IG}2026-05-28_43_6-21.mp4`, 8.0, 1.2, 0, 1080], // толкает робота, рядом люди
  h2: [`${SANY}IMG_5656.MOV`, 7.4, 1.0, 1, 1080], // группа идёт по залу SANY
  h3: [`${IG}2026-05-28_44_13-33.mp4`, 1.0, 1.0, 0, 1080], // показывает робота AgiBot
  h4: [`${SANY}IMG_5657.MOV`, 1.0, 1.0, 1, 1080], // группа у стендов SANY
  r1: [`${IG}2026-05-28_44_13-33.mp4`, 7.0, 7.6, 0, 720], // робот берёт детали из ящика
  r2: [`${IG}2026-05-31_41_2-12.mp4`, 1.0, 7.6, 0, 720], // Kepler несёт ящик
  r3: [`${IG}2026-05-31_39_46-55.mp4`, 0.4, 7.6, 0, 720], // робот-бармен
  p1: [`${SANY}IMG_5656.MOV`, 5.0, 7.6, 1, 720], // группа в цехе SANY
  p2: [`${IG}2026-05-24_45_38-48.mp4`, 2.0, 7.4, 0, 720], // линия-макет в R&D-центре BYD
  e1: [`${IG}2026-06-03_37_28-50.mp4`, 9.5, 4.4, 0, 720], // роботы на выставке
  e2: [`${IG}2026-05-21_47_54-73.mp4`, 11.5, 4.4, 0, 720], // шоу дронов Drone World Congress
  n1: [`${SANY}IMG_5653.MOV`, 19.0, 3.8, 1, 1080], // люди в зале SANY
};
const NF = {};
function prep() {
  for (const [k, [src, ss, d, hdr, w]] of Object.entries(CL)) {
    const dir = `${TMP}/${k}`, h = Math.round(w * 16 / 9);
    if (!fs.existsSync(`${dir}/f0001.jpg`)) {
      fs.mkdirSync(dir, { recursive: true });
      execSync(`ffmpeg -v error -y -ss ${ss} -t ${d} -i "${src}" -vf "${hdr ? TM : ''}fps=${FPS},scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h}" -q:v 3 ${dir}/f%04d.jpg`);
    }
    NF[k] = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length;
  }
}

const card = (id, src, st, pos = 'center') => `<div class="card" id="${id}" style="${st}"><div class="kb" style="background-image:url('${src}');background-position:${pos}"></div></div>`;
const bars = (n, seg) => `<div class="bars">${Array.from({ length: n }, (_, i) => `<i><b style="width:${i < seg ? 100 : 0}%"></b></i>`).join('')}</div>`;
const story = (id, k, st, place = '', seg = 2, of = 4, a = 0, pos = 'center') => `<div class="story" id="${id}" style="${st}"><img class="v" data-k="${k}" data-a="${a}" style="object-position:${pos}">
  ${bars(of, seg)}<div class="who"><img src="${AV}"><b>ostap.dotsenko</b><span>${place}</span></div></div>`;
const vcard = (id, k, st, a = 0, pos = 'center') => `<div class="card" id="${id}" style="${st}"><img class="v" data-k="${k}" data-a="${a}" style="object-position:${pos}"></div>`;
const pill = (id, t, top, extra = '') => `<div class="pill" id="${id}" style="top:${top}px;${extra}">${t}</div>`;
const stat = (id, num, lab, x, y, w = 440) => `<div class="a" id="${id}" style="left:${x}px;top:${y}px;width:${w}px"><div class="num" data-n="${num}">${num}</div><div class="slab">${lab}</div></div>`;
const CHIPS = ['Пищевые производства', 'Молочные заводы', 'Кондитерка', 'Чай и кофе', 'Косметика', 'Автопром и электромобили', 'Бытовая техника', 'Техгиганты и ИИ', 'Логистика', 'Финтех', 'Нефтехимия', 'Переработка отходов'];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Unbounded;font-weight:200 900;src:url('file://${F}Unbounded-variable.ttf')}
@font-face{font-family:Golos;font-weight:400 900;src:url('file://${F}GolosText-variable.ttf')}
@font-face{font-family:JB;font-weight:100 800;src:url('file://${F}JetBrainsMono-variable.ttf')}
@font-face{font-family:MSZ;src:url('file://${ROOT}/интернет-материалы/шрифты/ma-shan-zheng.woff2') format('woff2')}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:Golos,sans-serif;background:#081440}
.a{position:absolute}.sc{position:absolute;inset:0;display:none;overflow:hidden}
.hb{position:absolute;inset:0;background:radial-gradient(circle at 70% 25%,#1B3A8F 0,#0B1D55 55%,#081440 100%)}
.hb::after{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(125,211,252,.16) 3.4px,transparent 4px);background-size:22px 22px}
.hbl{position:absolute;inset:0;background:#2563EB;background-image:radial-gradient(rgba(255,255,255,.18) 3.4px,transparent 4px);background-size:22px 22px}
.cry{position:absolute;right:64px;top:250px;width:92px;height:92px;border-radius:50%;box-shadow:0 0 0 5px #fff;z-index:60}
.lab{position:absolute;left:64px;right:180px;top:270px;font:700 30px JB;letter-spacing:.14em;text-transform:uppercase;color:#7DD3FC}
.zh{font-family:MSZ;letter-spacing:0;text-transform:none;font-size:1.25em}
.ttl{position:absolute;left:60px;right:170px;top:320px;font:900 70px/1.05 Unbounded;color:#fff;letter-spacing:-.02em}
.ttl em{font-style:normal;color:#7DD3FC}
.card{position:absolute;overflow:hidden;border:9px solid #fff;box-shadow:18px 18px 0 #2563EB;background:#222}
.kb{position:absolute;inset:-4%;background-size:cover;background-position:center}
.v{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.story{position:absolute;overflow:hidden;border-radius:34px;border:6px solid #fff;box-shadow:16px 16px 0 #2563EB;background:#111}
.story::after{content:'';position:absolute;left:0;right:0;top:0;height:160px;background:linear-gradient(rgba(0,0,0,.45),transparent);z-index:1}
.bars{position:absolute;left:22px;right:22px;top:20px;display:flex;gap:7px;z-index:2}.bars i{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.4);overflow:hidden}
.bars b{display:block;height:100%;background:#fff}
.who{position:absolute;left:20px;right:16px;top:40px;display:flex;align-items:center;gap:9px;z-index:2;color:#fff;font:700 21px Golos;overflow:hidden;text-shadow:0 2px 8px rgba(0,0,0,.6);white-space:nowrap}
.who img{width:42px;height:42px;flex-shrink:0;border-radius:50%;border:3px solid #fff;object-fit:cover}.who span{font-weight:500;opacity:.9}
.full .bars{left:40px;right:40px;top:40px}.full .who{left:40px;top:68px;font-size:32px;gap:14px}.full .who img{width:70px;height:70px}
.pill{position:absolute;left:64px;background:#fff;border:5px solid #081440;padding:14px 22px;font:600 32px/1.2 Golos;color:#081440;box-shadow:8px 8px 0 #7DD3FC;transform-origin:0 50%;white-space:nowrap}
.pill b{font-family:Unbounded;font-weight:900}
.num{font:900 120px/1 Unbounded;color:#7DD3FC;letter-spacing:-.04em;white-space:nowrap}
.slab{margin-top:10px;font:600 34px/1.2 Golos;color:#EAF1FF}
.chips{position:absolute;left:64px;right:64px;top:600px;display:flex;flex-wrap:wrap;gap:22px 18px}
.chip{background:#fff;color:#081440;font:700 36px/1.15 Golos;padding:18px 26px;border-radius:999px;box-shadow:8px 8px 0 #2563EB;transform-origin:50% 50%}
.chip:first-child,.chip:nth-child(2),.chip:nth-child(3){background:#7DD3FC}
.btn{background:#2563EB;color:#fff;font:900 46px Unbounded;padding:26px 44px;border-radius:999px;box-shadow:0 0 0 6px #fff,0 20px 50px rgba(37,99,235,.6)}
.wipe{position:absolute;inset:0;display:none;z-index:55}
</style></head><body><img class="cry" src="${CRY}">

<div class="sc" id="hook">
  ${story('hookSt', 'h1', 'left:0;top:0;width:1080px;height:1920px;border-radius:0;border:0;box-shadow:none', '', 1, 4, 0, 'center 40%').replace('class="story"', 'class="story full"')}
  <div class="a" style="left:0;right:0;top:980px;height:940px;background:linear-gradient(rgba(8,20,64,0),rgba(8,20,64,.9) 38%,#081440)"></div>
  <div class="lab" id="hookLab" style="top:1170px">Global Tech Tour · <span class="zh">游</span></div>
  <div class="a" id="hookT1" style="left:60px;top:1225px;font:900 86px/1 Unbounded;color:#fff">Куда я вожу</div>
  <div class="a" id="hookT2" style="left:60px;top:1320px;font:900 86px/1 Unbounded;color:#7DD3FC">группы в Китае?</div>
  <div class="a" id="hookS" style="left:64px;top:1440px;font:600 36px Golos;color:#EAF1FF">Только реальные кадры из поездок</div>
</div>

<div class="sc" id="robots"><div class="hb"></div>
  <div class="lab" id="robotsLab">01 · К роботам <span class="zh">机</span></div>
  <div class="ttl" id="robotsTtl">Роботы — <em>вживую</em></div>
  ${story('rC1', 'r1', 'left:40px;top:470px;width:330px;height:590px;rotate:-6deg', 'AgiBot', 1, 3, 0.5)}
  ${story('rC2', 'r2', 'left:375px;top:440px;width:330px;height:590px;rotate:1deg', 'Kepler', 2, 3, 0.9)}
  ${story('rC3', 'r3', 'left:710px;top:480px;width:330px;height:590px;rotate:6deg', 'AgiBot', 3, 3, 1.3)}
  ${pill('rP1', '<b>AgiBot</b> — 10 000 роботов уже в работе', 1150)}
  ${pill('rP2', '<b>Kepler</b> — 30 кг на две руки', 1250)}
  ${pill('rP3', 'Смотрим, как роботы <b>работают</b>', 1350)}
</div>

<div class="sc" id="plants"><div class="hb"></div>
  <div class="lab" id="plantsLab">02 · На заводы <span class="zh">造</span></div>
  <div class="ttl" id="plantsTtl">Заводы <em>изнутри</em></div>
  ${vcard('pC1', 'p1', 'left:64px;top:470px;width:952px;height:600px;rotate:-1.5deg', 0.4, 'center 55%')}
  ${story('pC2', 'p2', 'left:660px;top:930px;width:340px;height:604px;rotate:5deg', 'BYD', 2, 3, 0.9)}
  ${pill('pP1', '<b>SANY</b> · Чанша', 1150)}
  ${pill('pP2', 'крупнейший производитель<br>строительной техники', 1240, 'white-space:normal;font-size:30px')}
  ${pill('pP3', '<b>BYD</b> · R&amp;D-центр', 1400)}
</div>

<div class="sc" id="bosses"><div class="hb"></div>
  <div class="lab" id="bossesLab">03 · К руководителям</div>
  <div class="ttl" id="bossesTtl">К тем, кто <em>решает</em></div>
  ${card('bC1', `${XW}koni.jpg`, 'left:64px;top:470px;width:640px;height:470px;rotate:-2.5deg', 'center 40%')}
  ${card('bC2', `${YK}6.jpg`, 'left:400px;top:850px;width:620px;height:420px;rotate:2.5deg', 'center 45%')}
  ${pill('bP1', '<b>Xingwang</b> · с председателем <b>Хоу Синваном</b> <span class="zh">侯兴旺</span>', 1330, 'font-size:29px')}
  ${pill('bP2', '<b>YingKe <span class="zh">盈科</span></b> · крупнейшая юрфирма мира', 1430, 'font-size:29px')}
</div>

<div class="sc" id="events"><div class="hb"></div>
  <div class="lab" id="eventsLab">04 · На выставки и конгрессы</div>
  <div class="ttl" id="eventsTtl">Где показывают <em>будущее</em></div>
  ${story('eC1', 'e1', 'left:80px;top:480px;width:420px;height:746px;rotate:-4deg', 'Шанхай', 2, 3, 0.4)}
  ${story('eC2', 'e2', 'left:570px;top:520px;width:420px;height:746px;rotate:4deg', 'Шэньчжэнь', 3, 3, 0.8)}
  ${pill('eP1', 'Выставка роботов · <b>Шанхай</b>', 1330)}
  ${pill('eP2', '<b>Drone World Congress</b> 2026', 1430)}
</div>

<div class="sc" id="more"><div class="hb"></div>
  <div class="lab" id="moreLab">И не только</div>
  <div class="ttl" id="moreTtl">Каждая отрасль — <em>своя программа</em></div>
  <div class="chips">${CHIPS.map((c, i) => `<div class="chip" id="ch${i}">${c}</div>`).join('')}</div>
  <div class="a" id="moreS" style="left:64px;right:64px;top:1380px;font:900 48px/1.15 Unbounded;color:#fff">Туда, куда <span style="color:#7DD3FC">с улицы не пускают</span></div>
</div>

<div class="sc" id="nums">
  ${story('nSt', 'n1', 'left:0;top:0;width:1080px;height:1920px;border-radius:0;border:0;box-shadow:none', 'SANY · Чанша', 4, 4, 0).replace('class="story"', 'class="story full"')}
  <div class="a" style="inset:0;background:linear-gradient(180deg,rgba(8,20,64,.2),rgba(8,20,64,.88) 42%)"></div>
  <div class="lab" id="numsLab" style="top:640px">Global Tech Tour — это</div>
  ${stat('nS1', '1000+', 'компаний в базе', 64, 720)}${stat('nS2', '18', 'отраслей', 620, 720)}
  ${stat('nS3', '76', 'программ', 64, 1010)}${stat('nS4', '9', 'стран', 620, 1010)}
</div>

<div class="sc" id="cta"><div class="hb"></div>
  ${card('cC', `${PR}2026-10-22-чанша-ярмарка.jpg`, 'left:240px;top:300px;width:600px;height:760px;rotate:-2deg', 'center 35%')}
  <img id="cCry" src="${CRY}" class="a" style="left:780px;top:960px;width:200px;height:200px;border-radius:50%;box-shadow:0 0 0 6px #fff">
  <div class="a" id="cT" style="left:64px;right:64px;top:1150px;text-align:center;font:900 64px/1.08 Unbounded;color:#fff">Global Tech Tour</div>
  <div class="a" id="cS" style="left:100px;right:100px;top:1240px;text-align:center;font:500 34px/1.35 Golos;color:#C9D7F5">Бизнес-экспедиции на заводы и в технокомпании Китая и Азии</div>
  <div class="a btn" id="cB" style="left:250px;top:1390px">globaltechtour.ru</div>
  <div class="a" id="cD" style="left:0;right:0;top:1510px;text-align:center;font:700 34px Golos;color:#7DD3FC">Пиши в директ — подберём программу →</div>
</div>

<div class="wipe" id="wipe"><div class="hbl"></div></div>
<script>
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), p=(t,a,b)=>cl((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3), eb=x=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
const S=${JSON.stringify(S)}, NF=__NF__, TMP='${TMP}', $=id=>document.getElementById(id), set=(id,st)=>{const e=$(id); if(e) Object.assign(e.style,st)};
const rise=(id,t,a,d=.45,dy=60)=>{const k=eo(p(t,a,a+d));set(id,{opacity:k,translate:'0 '+((1-k)*dy)+'px'})};
const left=(id,t,a,d=.4)=>{const k=eo(p(t,a,a+d));set(id,{opacity:k,translate:((1-k)*-120)+'px 0'})};
const pop=(id,t,a,d=.38)=>{const x=p(t,a,a+d);set(id,{opacity:x>0?1:0,scale:String(.4+.6*eb(x))})};
const drop=(id,t,a)=>{const x=p(t,a,a+.5);set(id,{opacity:x>0?1:0,translate:'0 '+((1-eo(x))*-260)+'px',scale:String(1.25-.25*eo(x))})};
const kb=(id,t,len)=>{const e=$(id); if(e){const k=e.querySelector('.kb'); if(k) k.style.scale=String(1.0+0.08*cl(t/len))}};
function count(id,t,a,d=1.0){const e=$(id); if(!e) return; const n=e.querySelector('.num'); const full=n.dataset.n; const m=full.match(/(\\d+)/);
  rise(id,t,a,.4,40); if(!m) return; const target=parseInt(m[1]); n.textContent=full.replace(m[1],String(Math.round(target*eo(p(t,a,a+d)))))}
// кадр видео в карточке: data-k — кусок, data-a — с какой секунды сцены идёт (до — стоит первый кадр)
function vid(img,l,loads,key){const k=key||img.dataset.k, a=+img.dataset.a||0, n=NF[k]||1;
  const f=Math.min(n,1+Math.max(0,Math.floor((l-a)*30))), src='file://'+TMP+'/'+k+'/f'+String(f).padStart(4,'0')+'.jpg';
  if(img.getAttribute('src')!==src){img.setAttribute('src',src);loads.push(img.decode().catch(()=>{}))}}
const HOOK=[['h1',0,1.0,''],['h2',1.0,1.9,'SANY · Чанша'],['h3',1.9,2.75,'AgiBot · Шанхай'],['h4',2.75,3.6,'SANY · Чанша']];
const WIPE={robots:'100% 100%',plants:'0% 100%',bosses:'100% 0%',events:'0% 0%',more:'100% 100%',nums:'0% 100%',cta:'100% 0%'};
async function setT(t){
  const loads=[];
  for(const k in S){const [a,b]=S[k];$(k).style.display=(t>=a&&t<b)?'block':'none'}
  // хук: четыре момента подряд, полоски сторис заполняются; первый кадр — уже обложка с заголовком
  let l=t;
  if(l<S.hook[1]){const h=HOOK.find(x=>l>=x[1]&&l<x[2])||HOOK[3]; const img=$('hookSt').querySelector('.v');
    img.dataset.a=h[1]; vid(img,l,loads,h[0]); $('hookSt').querySelector('.who span').textContent=h[3];
    $('hookSt').querySelectorAll('.bars b').forEach((b,i)=>{const x=HOOK[i];b.style.width=(100*p(l,x[1],x[2]))+'%'});
    img.style.scale=String(1.06-0.06*p(l,h[1],h[2]))}
  rise('hookLab',l,-.5); rise('hookT1',l,-.5,.4); rise('hookT2',l,-.5,.4); rise('hookS',l,1.2,.45,30);
  for(const k of ['robots','plants','bosses','events','more','nums','cta']){
    l=t-S[k][0]; if(l<0||l>=S[k][1]-S[k][0]) continue;
    left(k+'Lab',l,.05); rise(k+'Ttl',l,.2,.5,70);
    $(k).querySelectorAll('img.v').forEach(img=>vid(img,l,loads));
  }
  l=t-S.robots[0]; drop('rC1',l,.5); drop('rC2',l,.9); drop('rC3',l,1.3); pop('rP1',l,2.4); pop('rP2',l,3.4); pop('rP3',l,4.6);
  l=t-S.plants[0]; drop('pC1',l,.4); drop('pC2',l,.9); pop('pP1',l,1.8); pop('pP2',l,2.5); pop('pP3',l,3.8);
  l=t-S.bosses[0]; drop('bC1',l,.4); drop('bC2',l,.9); kb('bC1',l,6); kb('bC2',l,6); pop('bP1',l,1.7); pop('bP2',l,2.8);
  l=t-S.events[0]; drop('eC1',l,.4); drop('eC2',l,.8); pop('eP1',l,1.5); pop('eP2',l,2.3);
  l=t-S.more[0]; for(let i=0;i<${CHIPS.length};i++) pop('ch'+i,l,.55+i*.16,.32); rise('moreS',l,2.9,.45,40);
  l=t-S.nums[0]; {const img=$('nSt').querySelector('.v'); img.style.scale=String(1+0.05*p(l,0,3.8))} left('numsLab',l,.1); count('nS1',l,.3); count('nS2',l,.6); count('nS3',l,.9); count('nS4',l,1.2);
  l=t-S.cta[0]; drop('cC',l,.1); kb('cC',l,4); pop('cCry',l,.6,.4); rise('cT',l,.9,.45,50); rise('cS',l,1.2,.45,40); pop('cB',l,1.6,.4); rise('cD',l,2.1,.4,30);
  // переход: синий круг с растром из угла за 0,35 с до стыка
  let w=null; for(const k in WIPE){const T=S[k][0]; if(t>=T-.35&&t<T+.12) w=[k,t<T?p(t,T-.35,T):1-p(t,T,T+.12)]}
  if(w){const [k,x]=w;$('wipe').style.display='block';$('wipe').style.opacity=t<S[k][0]?1:x;$('wipe').style.clipPath='circle('+(eo(Math.min(1,t<S[k][0]?x:1))*2300)+'px at '+WIPE[k]+')'} else $('wipe').style.display='none';
  await Promise.all(loads);
}
window.setT=setT;
</script></body></html>`;

fs.mkdirSync(FR, { recursive: true });
if (!args.includes('--encode-only')) {
  prep();
  fs.writeFileSync(`${TMP}/reel.html`, html.replace('__NF__', JSON.stringify(NF)));
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  await pg.goto(`file://${TMP}/reel.html`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(600);
  const still = arg('--still');
  if (still) {
    for (const s of still.split(',')) { await pg.evaluate(t => window.setT(t), +s); await pg.waitForTimeout(80); await pg.screenshot({ path: `${TMP}/still-${s}.jpg`, type: 'jpeg', quality: 88 }); console.log('still', s); }
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
// звук: музыка + «вжух» на переходах + щелчки на плашках и цифрах
const SFX = `${ROOT}/source-videos/2026-10-07-byt-tehnika/sfx`;
const W = Object.values(S).slice(1).map(([a]) => a - 0.3);
const C = [S.robots[0] + 2.4, S.robots[0] + 3.4, S.robots[0] + 4.6, S.plants[0] + 1.8, S.plants[0] + 2.5, S.plants[0] + 3.8, S.bosses[0] + 1.7, S.bosses[0] + 2.8,
  S.events[0] + 1.5, S.events[0] + 2.3, ...[0, 3, 6, 9].map(i => S.more[0] + .55 + i * .16), S.nums[0] + .3, S.nums[0] + .6, S.nums[0] + .9, S.nums[0] + 1.2, S.cta[0] + 1.6];
const ins = [`-i "${ROOT}/интернет-материалы/музыка/inspiring-corporate-soundrider.mp3"`, ...W.map(() => `-i ${SFX}/whoosh.wav`), ...C.map(() => `-i ${SFX}/switch.wav`)];
const fl = [`[1:a]atrim=0:${DUR},afade=t=in:d=0.4,afade=t=out:st=${DUR - 1.8}:d=1.8,volume=0.6[m]`,
  ...W.map((s, i) => `[${i + 2}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},volume=0.4[w${i}]`),
  ...C.map((s, i) => `[${i + 2 + W.length}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},volume=0.3[c${i}]`),
  `[m]${W.map((_, i) => `[w${i}]`).join('')}${C.map((_, i) => `[c${i}]`).join('')}amix=inputs=${1 + W.length + C.length}:normalize=0:duration=first,loudnorm=I=-15:TP=-1.5:LRA=11[a]`];
const out = `${ROOT}/finished-videos/${NAME}.mp4`;
execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${FR}/f%04d.jpg ${ins.join(' ')} -filter_complex "${fl.join(';')}" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -t ${DUR} -movflags +faststart "${out}"`, { stdio: 'inherit' });
console.log('✓', out);
