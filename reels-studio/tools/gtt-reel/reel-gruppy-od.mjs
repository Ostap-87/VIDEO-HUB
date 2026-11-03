// Reels «Куда я вожу группы в Китае» — версия в стиле личного профиля @ostap.dotsenko (03.11.2026: «сделай этот ролик в моём стиле,
// а не в стиле ГТТ, можешь больше видео взять прям из самого инстаграм, там их много»). Прежняя версия в цветах GTT — reel-gruppy.mjs.
// Язык профиля: жёлтый #FFD92E · чернила #15151D/#191922 · красный #E8341C, растр точек, печать 多, Unbounded + Golos + JetBrains Mono,
// кисть Ma Shan Zheng (облачко с переводом, иероглиф-звук). Сцены по очереди на чернилах, жёлтом и красном.
// Кадры — только реальные: его Reels (куски в source-videos/2026-11-03-gtt-проект/из-instagram/, README.json) и съёмка SANY / Xingwang / YingKe.
// Факты: подписи его постов (AgiBot — 10 000 роботов, Kepler — 30 кг на 2 руки, R&D-центр BYD, Шанхай — Пекин, Шэньчжэнь), его слова в
// сторис SANY («приехал лично… чтобы показывать это вам»), сайт globaltechtour.ru (1000+ компаний, 18 отраслей, 76 программ, 9 стран,
// названия программ), подписи каруселей Xingwang и YingKe. В финале — фото в костюме, как в интро «официально» (решение пользователя 03.11.2026). Музыка Upbeat Corporate (Soundrider, CC BY 3.0 — автор в подписи поста).
// Запуск: node reels-studio/tools/gtt-reel/reel-gruppy-od.mjs [--still 0.5,6,14] [--frames A-B] [--encode-only]
import { createRequire } from 'module'; import fs from 'fs'; import { execSync } from 'child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = '/home/user/VIDEO-HUB', SV = `file://${ROOT}/source-videos/`, F = `${ROOT}/презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/`;
const IG = `${ROOT}/source-videos/2026-11-03-gtt-проект/из-instagram/`, SANY = `${ROOT}/source-videos/2026-10-25-sany/`;
const XW = `${SV}2026-10-26-xingwang/фото/`, YK = `${SV}2026-10-26-yingke/фото/`, AV = `${SV}фото-от-пользователя/остап/ostap-portret-sait.jpg`;
const NAME = '2026-11-03-od-gruppy', FPS = 30;
const S = { hook: [0, 3.6], self: [3.6, 9.6], robots: [9.6, 17.6], plants: [17.6, 25.2], bosses: [25.2, 31.0], events: [31.0, 35.8],
  road: [35.8, 39.8], more: [39.8, 44.0], nums: [44.0, 47.6], tiny: [47.6, 51.4], cta: [51.4, 55.4] };
const DUR = 55.4, N = Math.round(DUR * FPS), TMP = '/dev/shm/gtr-od', FR = `${TMP}/frames`;
const args = process.argv.slice(2), arg = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

const TM = 'zscale=tin=arib-std-b67:min=bt2020nc:pin=bt2020:rin=tv:t=linear:npl=150,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0:peak=4,zscale=t=bt709:m=bt709:r=pc,format=rgb24,eq=saturation=1.25:contrast=1.08:brightness=0.03,colorbalance=rm=0.05:bm=-0.05:rs=0.02:bs=-0.03,';
// кусок: [файл, с какой секунды файла, сколько, HDR iPhone, ширина кадров]
const CL = {
  h1: [`${IG}2026-05-28_43_6-21.mp4`, 8.0, 1.0, 0, 720], h2: [`${SANY}IMG_5656.MOV`, 7.4, 0.9, 1, 720],
  h3: [`${IG}2026-05-28_44_13-33.mp4`, 1.0, 0.9, 0, 720], h4: [`${SANY}IMG_5657.MOV`, 1.0, 0.9, 1, 720],
  s1: [`${IG}2026-05-31_39_2-10.mp4`, 2.0, 5.8, 0, 720], s2: [`${IG}2026-05-31_42_50-70.mp4`, 2.0, 5.6, 0, 720],
  s3: [`${SANY}IMG_5671.MOV`, 2.0, 5.4, 1, 720], s4: [`${IG}2026-05-23_46_0-5.mp4`, 0.0, 4.9, 0, 720],
  r1: [`${IG}2026-05-28_44_13-33.mp4`, 7.0, 4.2, 0, 720], r2: [`${IG}2026-05-31_41_2-12.mp4`, 1.0, 4.2, 0, 720],
  r3: [`${IG}2026-05-31_39_46-55.mp4`, 0.4, 4.2, 0, 720], r4: [`${IG}2026-05-31_40_0-14.mp4`, 0.0, 4.2, 0, 720],
  r5: [`${IG}2026-05-20_48_56-70.mp4`, 2.0, 4.2, 0, 720], r6: [`${IG}2026-06-03_36_24-58.mp4`, 20.4, 3.6, 0, 720],
  p1: [`${SANY}IMG_5656.MOV`, 5.0, 7.6, 1, 720], p2: [`${IG}2026-05-24_45_38-48.mp4`, 2.0, 7.0, 0, 720],
  p3: [`${IG}2026-05-23_46_90-108.mp4`, 4.0, 6.6, 0, 720],
  b3: [`${IG}2026-06-03_36_24-58.mp4`, 27.0, 5.4, 0, 720],
  e1: [`${IG}2026-06-03_37_28-50.mp4`, 9.5, 4.6, 0, 720], e2: [`${IG}2026-06-03_37_28-50.mp4`, 0.4, 4.6, 0, 720],
  e3: [`${IG}2026-05-21_47_54-73.mp4`, 11.5, 4.6, 0, 720],
  w1: [`${IG}2026-06-03_36_5-21.mp4`, 1.0, 3.8, 0, 720], w2: [`${IG}2026-06-03_36_5-21.mp4`, 8.0, 3.8, 0, 720],
  w3: [`${IG}2026-05-20_49_0-6.mp4`, 1.0, 3.8, 0, 720],
  n1: [`${SANY}IMG_5653.MOV`, 19.0, 3.8, 1, 1080],
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

const bars = (n, seg) => `<div class="bars">${Array.from({ length: n }, (_, i) => `<i><b style="width:${i < seg ? 100 : 0}%"></b></i>`).join('')}</div>`;
const story = (id, k, st, place = '', seg = 2, of = 4, a = 0, pos = 'center') => `<div class="story" id="${id}" style="${st}"><img class="v" data-k="${k}" data-a="${a}" style="object-position:${pos}">
  ${bars(of, seg)}<div class="who"><img src="${AV}"><b>ostap.dotsenko</b><span>${place}</span></div></div>`;
const vcard = (id, k, st, a = 0, pos = 'center') => `<div class="card" id="${id}" style="${st}"><img class="v" data-k="${k}" data-a="${a}" style="object-position:${pos}"></div>`;
const card = (id, src, st, pos = 'center') => `<div class="card" id="${id}" style="${st}"><div class="kb" style="background-image:url('${src}');background-position:${pos}"></div></div>`;
const pill = (id, t, st) => `<div class="pill" id="${id}" style="${st}">${t}</div>`;
const stat = (id, num, lab, x, y, w = 440) => `<div class="a" id="${id}" style="left:${x}px;top:${y}px;width:${w}px"><div class="num" data-n="${num}">${num}</div><div class="slab">${lab}</div></div>`;
const head = (k, lab, ttl, wm) => `<div class="wm" id="${k}Wm">${wm}</div><div class="a lab" id="${k}Lab">${lab}</div><div class="a ttl" id="${k}Ttl">${ttl}</div>`;
const CHIPS = ['Пищевые производства', 'Молочные заводы', 'Кондитерка', 'Чай и кофе', 'Косметика', 'Автопром и электромобили', 'Бытовая техника', 'Техгиганты и ИИ', 'Логистика', 'Финтех', 'Нефтехимия', 'Переработка отходов'];
const TINY = ['r1', 'p1', 's2', 'e3', 'r4', 'h2', 'w2', 'r3', 's3', 'e1', 'r5', 'p2', 'b3', 'w1', 'r2', 's1', 'p3', 'e2', 'r6', 'w3'];
const FAN = ['left:40px;top:505px;width:330px;height:590px;rotate:-6deg', 'left:375px;top:475px;width:330px;height:590px;rotate:1deg', 'left:710px;top:515px;width:330px;height:590px;rotate:6deg'];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Unbounded;font-weight:200 900;src:url('file://${F}Unbounded-variable.ttf')}
@font-face{font-family:Golos;font-weight:400 900;src:url('file://${F}GolosText-variable.ttf')}
@font-face{font-family:JB;font-weight:100 800;src:url('file://${F}JetBrainsMono-variable.ttf')}
@font-face{font-family:MSZ;src:url('file://${ROOT}/интернет-материалы/шрифты/ma-shan-zheng.woff2') format('woff2')}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:Golos,sans-serif;background:#15151D}
.a{position:absolute}.sc{position:absolute;inset:0;display:none;overflow:hidden}
.hy{position:absolute;inset:0;background:#FFD92E;background-image:radial-gradient(rgba(25,25,34,.16) 3.4px,transparent 4px);background-size:22px 22px}
.hk{position:absolute;inset:0;background:#15151D;background-image:radial-gradient(rgba(255,217,46,.13) 3.4px,transparent 4px);background-size:22px 22px}
.hr{position:absolute;inset:0;background:#E8341C;background-image:radial-gradient(rgba(25,25,34,.2) 3.4px,transparent 4px);background-size:22px 22px}
.speed{position:absolute;inset:-300px;background:repeating-conic-gradient(from var(--r,0deg) at 50% 50%,rgba(25,25,34,.09) 0 2deg,transparent 2deg 9deg)}
.seal{position:absolute;right:64px;top:262px;width:84px;height:84px;background:#C8102E;color:#fff;font:400 64px/84px MSZ;text-align:center;border-radius:10px;box-shadow:0 0 0 5px #fff;rotate:-4deg;z-index:60}
.lab{left:64px;right:180px;top:270px;font:700 30px JB;letter-spacing:.16em;text-transform:uppercase;color:var(--lab)}
.lab .zh,.zh{font-family:MSZ;letter-spacing:0;text-transform:none;font-size:1.25em}
.ttl{left:60px;right:170px;top:322px;font:900 62px/1.04 Unbounded;letter-spacing:-.02em;color:var(--ttl)}
.ttl em{font-style:normal;color:var(--em)}
.wm{position:absolute;right:-90px;top:880px;font:400 760px/1 MSZ;color:var(--wm)}
.K{--lab:#FFD92E;--ttl:#fff;--em:#FFD92E;--wm:rgba(255,217,46,.07);--sh:#FFD92E;--ps:#FFD92E}
.Y{--lab:#191922;--ttl:#191922;--em:#E8341C;--wm:rgba(232,52,28,.11);--sh:#191922;--ps:#E8341C}
.R{--lab:#191922;--ttl:#fff;--em:#FFD92E;--wm:rgba(25,25,34,.12);--sh:#191922;--ps:#191922}
.card{position:absolute;overflow:hidden;border:8px solid #fff;box-shadow:16px 16px 0 var(--sh);background:#222}
.kb{position:absolute;inset:-4%;background-size:cover;background-position:center}
.v{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.story{position:absolute;overflow:hidden;border-radius:30px;border:6px solid #fff;box-shadow:14px 14px 0 var(--sh);background:#111}
.story::after{content:'';position:absolute;left:0;right:0;top:0;height:150px;background:linear-gradient(rgba(0,0,0,.45),transparent);z-index:1}
.bars{position:absolute;left:20px;right:20px;top:18px;display:flex;gap:7px;z-index:2}.bars i{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.4);overflow:hidden}
.bars b{display:block;height:100%;background:#fff}
.who{position:absolute;left:18px;right:14px;top:38px;display:flex;align-items:center;gap:9px;z-index:2;color:#fff;font:700 21px Golos;text-shadow:0 2px 8px rgba(0,0,0,.6);white-space:nowrap;overflow:hidden}
.who img{width:42px;height:42px;border-radius:50%;border:3px solid #fff;object-fit:cover;flex-shrink:0}.who span{font-weight:500;opacity:.9}
.full .bars{left:40px;right:40px;top:40px}.full .who{left:40px;top:68px;font-size:32px;gap:14px}.full .who img{width:70px;height:70px}
.pill{position:absolute;left:64px;background:#fff;border:5px solid #191922;padding:14px 22px;font:700 32px/1.2 Golos;color:#191922;box-shadow:8px 8px 0 var(--ps);transform-origin:0 50%;white-space:nowrap}
.pill b{font-family:Unbounded;font-weight:900}
.bub{position:absolute;background:#fff;border:7px solid #191922;padding:22px 28px 20px;font:900 60px/1.06 Unbounded;color:#191922;box-shadow:12px 12px 0 #191922;letter-spacing:-.01em;transform-origin:20% 100%}
.bub small{display:block;margin-top:10px;font:400 50px/1.1 MSZ;color:#E8341C;letter-spacing:0}
.bub::after{content:"";position:absolute;bottom:-40px;left:80px;border:18px solid transparent;border-top:28px solid #191922}
.bub.tr::after{left:auto;right:80px}
.sfx{position:absolute;font:400 200px/1 MSZ;color:#E8341C;-webkit-text-stroke:6px #191922;text-shadow:10px 10px 0 #191922;z-index:20}
.ink{position:absolute;background:#191922;color:#FFD92E;font:900 40px/1.2 Unbounded;padding:20px 28px;box-shadow:10px 10px 0 #E8341C;z-index:20}
.num{font:900 120px/1 Unbounded;color:#FFD92E;letter-spacing:-.04em;white-space:nowrap}
.slab{margin-top:10px;font:600 34px/1.2 Golos;color:#ECEAE3}
.chips{position:absolute;left:64px;right:64px;top:600px;display:flex;flex-wrap:wrap;gap:22px 18px}
.chip{background:#fff;color:#191922;font:700 36px/1.15 Golos;padding:18px 26px;border:5px solid #191922;box-shadow:8px 8px 0 #FFD92E;transform-origin:50% 50%}
.chip:nth-child(-n+3){background:#FFD92E;box-shadow:8px 8px 0 #E8341C}
.cut{position:absolute;object-fit:contain}
.wipe{position:absolute;inset:0;display:none;z-index:55}
</style></head><body><div class="seal">多</div>

<div class="sc Y" id="hook"><div class="hy"></div><div class="speed" id="hookSpeed"></div>
  <div class="a" id="hookChip" style="left:64px;top:262px;background:#191922;color:#FFD92E;font:700 30px JB;letter-spacing:.12em;padding:14px 20px">ОСТАП ДОЦЕНКО · 多增科</div>
  <div class="bub" id="hookBub" style="left:64px;top:370px;width:640px">Куда я вожу группы в&nbsp;Китае?<small>我带团去哪儿？</small></div>
  ${story('hookSt', 'h1', 'left:420px;top:700px;width:560px;height:830px;rotate:4deg', '', 1, 4, 0)}
  <div class="sfx" id="hookSfx" style="left:70px;top:930px">走!</div>
  <div class="ink" id="hookMore" style="left:64px;top:1330px;font-size:34px">Только реальные<br>кадры →</div>
</div>

<div class="sc K" id="self"><div class="hk"></div>${head('self', 'Шаг 1 · сначала еду сам', 'Сначала — <em>лично</em>', '自')}
  ${story('sC1', 's1', 'left:64px;top:480px;width:450px;height:500px;rotate:-3deg', 'AgiBot', 1, 4, 0.3, 'center 30%')}
  ${story('sC2', 's2', 'left:566px;top:465px;width:450px;height:500px;rotate:3deg', 'Kepler', 2, 4, 0.7, 'center 35%')}
  ${story('sC3', 's3', 'left:64px;top:1015px;width:450px;height:500px;rotate:2deg', 'SANY', 3, 4, 1.1, 'center 30%')}
  ${story('sC4', 's4', 'left:566px;top:1005px;width:450px;height:500px;rotate:-2deg', 'BYD', 4, 4, 1.5, 'center 30%')}
  <div class="ink" id="selfInk" style="left:130px;top:900px;rotate:-2deg">Смотрю сам —<br>потом показываю вам</div>
</div>

<div class="sc Y" id="robots"><div class="hy"></div>${head('robots', '01 · К роботам <span class="zh">机</span>', 'Роботы — <em>вживую</em>', '机')}
  ${story('rC1', 'r1', FAN[0], 'AgiBot', 1, 3, 0.4)}${story('rC2', 'r2', FAN[1], 'Kepler', 2, 3, 0.7)}${story('rC3', 'r3', FAN[2], 'AgiBot', 3, 3, 1.0)}
  ${story('rC4', 'r4', FAN[0], 'Kepler', 1, 3, 4.2)}${story('rC5', 'r5', FAN[1], '', 2, 3, 4.5)}${story('rC6', 'r6', FAN[2], 'Leju', 3, 3, 4.8)}
  <div class="sfx" id="robotsSfx" style="left:770px;top:990px;font-size:170px">哇!</div>
  ${pill('rP1', '<b>AgiBot</b> — 10 000 роботов уже в работе', 'top:1170px')}
  ${pill('rP2', '<b>Kepler</b> — 30 кг на две руки', 'top:1270px')}
  ${pill('rP3', 'Роботы на <b>линиях и складах</b>', 'top:1370px')}
</div>

<div class="sc R" id="plants"><div class="hr"></div>${head('plants', '02 · На заводы <span class="zh">造</span>', 'Заводы <em>изнутри</em>', '造')}
  ${vcard('pC1', 'p1', 'left:64px;top:450px;width:952px;height:560px;rotate:-1.5deg', 0.3, 'center 55%')}
  ${story('pC2', 'p2', 'left:64px;top:1060px;width:300px;height:470px;rotate:-4deg', 'BYD', 2, 3, 0.9)}
  ${story('pC3', 'p3', 'left:385px;top:1075px;width:300px;height:470px;rotate:3deg', 'BYD', 3, 3, 1.4)}
  ${pill('pP1', '<b>SANY</b> · Чанша', 'left:720px;top:1070px;width:300px;white-space:normal;--ps:#FFD92E')}
  ${pill('pP2', 'крупнейший производитель строительной техники', 'left:720px;top:1180px;width:300px;white-space:normal;font-size:27px;--ps:#FFD92E')}
  ${pill('pP3', '<b>BYD</b> · R&amp;D-центр', 'left:720px;top:1390px;width:300px;white-space:normal;--ps:#FFD92E')}
</div>

<div class="sc K" id="bosses"><div class="hk"></div>${head('bosses', '03 · К руководителям <span class="zh">人</span>', 'К тем, кто <em>решает</em>', '人')}
  ${pill('bP1', '<b>Xingwang</b> · с председателем <b>Хоу Синваном</b> <span class="zh">侯兴旺</span>', 'top:430px;font-size:29px')}
  ${pill('bP2', '<b>YingKe <span class="zh">盈科</span></b> · крупнейшая юрфирма мира', 'top:525px;font-size:29px')}
  ${card('bC1', `${XW}koni.jpg`, 'left:64px;top:650px;width:600px;height:430px;rotate:-2.5deg', 'center 40%')}
  ${card('bC2', `${YK}6.jpg`, 'left:440px;top:1010px;width:580px;height:390px;rotate:2.5deg', 'center 45%')}
  ${story('bC3', 'b3', 'left:64px;top:990px;width:300px;height:533px;rotate:-4deg', 'встреча', 2, 3, 1.3)}
</div>

<div class="sc Y" id="events"><div class="hy"></div>${head('events', '04 · На выставки <span class="zh">展</span>', 'Где показывают <em>будущее</em>', '展')}
  ${story('eC1', 'e1', FAN[0], 'Шанхай', 1, 3, 0.4)}${story('eC2', 'e2', FAN[1], 'Шанхай', 2, 3, 0.7)}${story('eC3', 'e3', FAN[2], 'Шэньчжэнь', 3, 3, 1.0)}
  ${pill('eP1', 'Выставка роботов · <b>Шанхай</b>', 'top:1180px')}
  ${pill('eP2', '<b>Drone World Congress</b> 2026', 'top:1280px')}
</div>

<div class="sc R" id="road"><div class="hr"></div>${head('road', '05 · В дороге <span class="zh">路</span>', 'Между <em>городами</em>', '路')}
  ${story('wC1', 'w1', FAN[0], '', 1, 3, 0.3)}${story('wC2', 'w2', FAN[1], 'Шанхай → Пекин', 2, 3, 0.6)}${story('wC3', 'w3', FAN[2], 'Шэньчжэнь', 3, 3, 0.9)}
  ${pill('wP1', 'Шанхай → Пекин · <b>Шэньчжэнь</b> · Чанша', 'top:1190px;--ps:#FFD92E')}
</div>

<div class="sc K" id="more"><div class="hk"></div>${head('more', 'И не только', 'Каждая отрасль — <em>своя программа</em>', '多')}
  <div class="chips">${CHIPS.map((c, i) => `<div class="chip" id="ch${i}">${c}</div>`).join('')}</div>
  <div class="a" id="moreS" style="left:64px;right:64px;top:1390px;font:900 48px/1.15 Unbounded;color:#fff">Туда, куда <span style="color:#FFD92E">с улицы не пускают</span></div>
</div>

<div class="sc K" id="nums">
  ${story('nSt', 'n1', 'left:0;top:0;width:1080px;height:1920px;border-radius:0;border:0;box-shadow:none', 'SANY · Чанша', 4, 4, 0).replace('class="story"', 'class="story full"')}
  <div class="a" style="inset:0;background:linear-gradient(180deg,rgba(21,21,29,.2),rgba(21,21,29,.9) 42%)"></div>
  <div class="a lab" id="numsLab" style="top:640px">Global Tech Tour — это</div>
  ${stat('nS1', '1000+', 'компаний в базе', 64, 720)}${stat('nS2', '18', 'отраслей', 620, 720)}
  ${stat('nS3', '76', 'программ', 64, 1010)}${stat('nS4', '9', 'стран', 620, 1010)}
</div>

<div class="sc Y" id="tiny"><div class="hy"></div>
  <div class="a" id="tinyGrid" style="left:-40px;top:250px;width:1160px;height:1700px;transform-origin:50% 40%">${TINY.map((k, i) => `<div class="story" id="tg${i}" style="left:${(i % 4) * 290}px;top:${Math.floor(i / 4) * 340}px;width:270px;height:320px;border-radius:20px;border-width:5px;box-shadow:8px 8px 0 #191922;rotate:${[-3, 2, -1, 3, 1, -2][i % 6]}deg"><img class="v" data-k="${k}" data-a="${0.1 + i * 0.05}"></div>`).join('')}</div>
  <div class="a" style="inset:0;background:rgba(255,217,46,.22)"></div>
  <div class="ink" id="tinyT1" style="left:64px;right:64px;top:640px;font-size:60px;line-height:1.08;padding:30px 34px;rotate:-1.5deg">Это только <span style="color:#fff">малая часть</span> того, что я делаю</div>
  <div class="bub" id="tinyT2" style="left:120px;right:64px;top:930px;font-size:50px;rotate:1deg;transform-origin:30% 0%">…и малая часть того, что можно показать<small>还有更多！</small></div>
</div>

<div class="sc K" id="cta"><div class="hk"></div>
  <img class="cut" id="ctaCut" src="${SV}фото-от-пользователя/остап/вырезки/ostap-portret-sait.png" style="right:-190px;bottom:0;height:1150px">
  <div class="bub tr" id="ctaBub" style="left:64px;top:380px;width:560px;font-size:58px;transform-origin:80% 100%">Поехали со&nbsp;мной?<small>一起去吧！</small></div>
  <div class="a" id="ctaBox" style="left:64px;top:672px;width:500px;background:#FFD92E;padding:28px 32px;box-shadow:12px 12px 0 #E8341C;display:grid;gap:14px;font:700 33px JB;color:#191922">
    <div>游 globaltechtour.ru</div><div>多 @ostap.dotsenko</div>
    <div id="ctaAsk" style="margin-top:8px;padding-top:16px;border-top:4px solid #191922;font:800 34px/1.25 Golos">Пиши в директ — подберём программу под вашу группу</div></div>
</div>

<div class="wipe" id="wipe"><div id="wipeBg"></div></div>
<script>
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), p=(t,a,b)=>cl((t-a)/(b-a));
const eo=x=>1-Math.pow(1-x,3), ei=x=>x*x*x, eb=x=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
const S=${JSON.stringify(S)}, NF=__NF__, TMP='${TMP}', $=id=>document.getElementById(id), set=(id,st)=>{const e=$(id); if(e) Object.assign(e.style,st)};
const rise=(id,t,a,d=.45,dy=60)=>{const k=eo(p(t,a,a+d));set(id,{opacity:k,translate:'0 '+((1-k)*dy)+'px'})};
const left=(id,t,a,d=.4)=>{const k=eo(p(t,a,a+d));set(id,{opacity:k,translate:((1-k)*-120)+'px 0'})};
const pop=(id,t,a,d=.38)=>{const x=p(t,a,a+d);set(id,{opacity:x>0?1:0,scale:String(.4+.6*eb(x))})};
const stamp=(id,t,a,rot=-10)=>{const x=p(t,a,a+.28);set(id,{opacity:x>0?1:0,scale:String(2.4-1.4*eo(x)),rotate:rot+(1-eo(x))*-14+'deg'})};
// карточка падает сверху (drop) и, если задано, улетает вверх (out) — так сменяются «волны» карточек
const drop=(id,t,a,o)=>{const x=p(t,a,a+.5), y=o?ei(p(t,o,o+.4)):0;
  set(id,{opacity:x>0&&y<1?1:0,translate:((y)*(id.charCodeAt(id.length-1)%2?-300:300))+'px '+((1-eo(x))*-260-y*1500)+'px',scale:String(1.25-.25*eo(x))})};
const kb=(id,t,len)=>{const e=$(id); if(e){const k=e.querySelector('.kb'); if(k) k.style.scale=String(1.0+0.08*cl(t/len))}};
function count(id,t,a,d=1.0){const e=$(id); if(!e) return; const n=e.querySelector('.num'); const full=n.dataset.n; const m=full.match(/(\\d+)/);
  rise(id,t,a,.4,40); if(!m) return; const target=parseInt(m[1]); n.textContent=full.replace(m[1],String(Math.round(target*eo(p(t,a,a+d)))))}
function vid(img,l,loads,key){const k=key||img.dataset.k, a=+img.dataset.a||0, n=NF[k]||1;
  const f=Math.min(n,1+Math.max(0,Math.floor((l-a)*30))), src='file://'+TMP+'/'+k+'/f'+String(f).padStart(4,'0')+'.jpg';
  if(img.getAttribute('src')!==src){img.setAttribute('src',src);loads.push(img.decode().catch(()=>{}))}}
const HOOK=[['h1',0,.9,''],['h2',.9,1.8,'SANY · Чанша'],['h3',1.8,2.7,'AgiBot · Шанхай'],['h4',2.7,3.6,'SANY · Чанша']];
const WIPE={tiny:['hy','0% 100%'],self:['hk','100% 100%'],robots:['hy','0% 100%'],plants:['hr','100% 0%'],bosses:['hk','0% 0%'],events:['hy','100% 100%'],road:['hr','0% 100%'],more:['hk','100% 0%'],nums:['hk','0% 0%'],cta:['hk','100% 100%']};
async function setT(t){
  const loads=[];
  for(const k in S){const [a,b]=S[k];$(k).style.display=(t>=a&&t<b)?'block':'none'}
  // хук: облачко, сторис с четырьмя моментами подряд, штамп 走; первый кадр — уже обложка
  let l=t; $('hookSpeed').style.setProperty('--r',(l*6)+'deg');
  if(l<S.hook[1]){const h=HOOK.find(x=>l>=x[1]&&l<x[2])||HOOK[3]; const img=$('hookSt').querySelector('.v');
    img.dataset.a=h[1]; vid(img,l,loads,h[0]); $('hookSt').querySelector('.who span').textContent=h[3];
    $('hookSt').querySelectorAll('.bars b').forEach((b,i)=>{const x=HOOK[i];b.style.width=(100*p(l,x[1],x[2]))+'%'});
    img.style.scale=String(1.06-0.06*p(l,h[1],h[2]))}
  left('hookChip',l,-.5); pop('hookBub',l,-.45); stamp('hookSfx',l,.6); rise('hookMore',l,1.4,.4,40);
  for(const k of Object.keys(S).slice(1)){
    l=t-S[k][0]; if(l<0||l>=S[k][1]-S[k][0]) continue;
    left(k+'Lab',l,.05); rise(k+'Ttl',l,.2,.5,70); set(k+'Wm',{translate:'0 '+(-l*14)+'px'});
    $(k).querySelectorAll('img.v').forEach(img=>vid(img,l,loads));
  }
  l=t-S.self[0]; drop('sC1',l,.3); drop('sC2',l,.7); drop('sC3',l,1.1); drop('sC4',l,1.5); stamp('selfInk',l,2.6,-2);
  l=t-S.robots[0]; drop('rC1',l,.4,3.8); drop('rC2',l,.7,3.9); drop('rC3',l,1.0,4.0); drop('rC4',l,4.2); drop('rC5',l,4.5); drop('rC6',l,4.8);
  stamp('robotsSfx',l,5.6,8); pop('rP1',l,1.6); pop('rP2',l,2.6); pop('rP3',l,5.2);
  l=t-S.plants[0]; drop('pC1',l,.3); drop('pC2',l,.9); drop('pC3',l,1.4); pop('pP1',l,2.0); pop('pP2',l,2.6); pop('pP3',l,3.6);
  l=t-S.bosses[0]; pop('bP1',l,.6); pop('bP2',l,1.0); drop('bC1',l,.5); drop('bC2',l,.9); drop('bC3',l,1.3); kb('bC1',l,6); kb('bC2',l,6);
  l=t-S.events[0]; drop('eC1',l,.4); drop('eC2',l,.7); drop('eC3',l,1.0); pop('eP1',l,1.8); pop('eP2',l,2.6);
  l=t-S.road[0]; drop('wC1',l,.3); drop('wC2',l,.6); drop('wC3',l,.9); pop('wP1',l,1.6);
  l=t-S.more[0]; for(let i=0;i<${CHIPS.length};i++) pop('ch'+i,l,.55+i*.16,.32); rise('moreS',l,2.9,.45,40);
  l=t-S.nums[0]; {const img=$('nSt').querySelector('.v'); img.style.scale=String(1+0.05*p(l,0,3.8))} left('numsLab',l,.1); count('nS1',l,.3); count('nS2',l,.6); count('nS3',l,.9); count('nS4',l,1.2);
  l=t-S.tiny[0]; {const z=eo(p(l,0,3.6)); set('tinyGrid',{scale:String(1.55-.55*z)})} for(let i=0;i<${TINY.length};i++) pop('tg'+i,l,.05+i*.04,.3);
  rise('tinyT1',l,.55,.45,70); pop('tinyT2',l,1.5,.4);
  l=t-S.cta[0]; {const k=eb(p(l,0,.55));set('ctaCut',{translate:((1-k)*600)+'px 0'})} pop('ctaBub',l,.35,.4); rise('ctaBox',l,1.0,.45,80); rise('ctaAsk',l,1.6,.4,40);
  // переход: круг цвета следующей сцены из угла за 0,35 с до стыка
  let w=null; for(const k in WIPE){const T=S[k][0]; if(t>=T-.35&&t<T) w=[k,p(t,T-.35,T)]}
  if(w){const [k,x]=w;$('wipe').style.display='block';$('wipeBg').className=WIPE[k][0];$('wipe').style.clipPath='circle('+(eo(x)*2300)+'px at '+WIPE[k][1]+')'} else $('wipe').style.display='none';
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
// звук: музыка + «вжух» на переходах + щелчки на плашках, штампах и цифрах
const SFX = `${ROOT}/source-videos/2026-10-07-byt-tehnika/sfx`;
const W = Object.values(S).slice(1).map(([a]) => a - 0.3);
const C = [0.6, S.self[0] + 2.6, S.robots[0] + 1.6, S.robots[0] + 2.6, S.robots[0] + 5.2, S.robots[0] + 5.6, S.plants[0] + 2.0, S.plants[0] + 2.6, S.plants[0] + 3.6,
  S.bosses[0] + .6, S.bosses[0] + 1.0, S.events[0] + 1.8, S.events[0] + 2.6, S.road[0] + 1.6, ...[0, 3, 6, 9].map(i => S.more[0] + .55 + i * .16),
  S.nums[0] + .3, S.nums[0] + .6, S.nums[0] + .9, S.nums[0] + 1.2, S.tiny[0] + .55, S.tiny[0] + 1.5, S.cta[0] + .35];
const ins = [`-i "${ROOT}/интернет-материалы/музыка/upbeat-corporate-soundrider.mp3"`, ...W.map(() => `-i ${SFX}/whoosh.wav`), ...C.map(() => `-i ${SFX}/switch.wav`)];
const fl = [`[1:a]atrim=0:${DUR},afade=t=in:d=0.3,afade=t=out:st=${DUR - 1.8}:d=1.8,volume=0.6[m]`,
  ...W.map((s, i) => `[${i + 2}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},volume=0.4[w${i}]`),
  ...C.map((s, i) => `[${i + 2 + W.length}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},volume=0.3[c${i}]`),
  `[m]${W.map((_, i) => `[w${i}]`).join('')}${C.map((_, i) => `[c${i}]`).join('')}amix=inputs=${1 + W.length + C.length}:normalize=0:duration=first,loudnorm=I=-15:TP=-1.5:LRA=11[a]`];
const out = `${ROOT}/finished-videos/${NAME}.mp4`;
execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${FR}/f%04d.jpg ${ins.join(' ')} -filter_complex "${fl.join(';')}" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -t ${DUR} -movflags +faststart "${out}"`, { stdio: 'inherit' });
console.log('✓', out);
