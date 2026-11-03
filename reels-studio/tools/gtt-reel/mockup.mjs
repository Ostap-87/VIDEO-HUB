// Макет ролика «Global Tech Tour — глазами Остапа» (03.11.2026: «ролик про проект globaltechtour… взял видео из моих сторис…
// чередовал с моими фото на производствах, как вчера ролик обо мне, в таком же интересном стиле — можешь макет подготовить?»).
// Стиль вчерашнего интро (reel-intro.mjs): карточки-фото с жёсткой тенью, крупный Unbounded, растр точек — но в цветах GTT
// (тёмно-синий, голубой #7DD3FC, тень #2563EB), знак — кристалл GTT. Сторис — вертикальные селфи-видео пользователя с SANY
// (source-videos/2026-10-25-sany, HDR → обычные цвета), голос — его собственный из сторис IMG_5624.MOV.
// Факты: его слова; сайт globaltechtour.ru (SINOTECH tours.json, companies.json — 1011 компаний, 76 программ в 9 странах,
// состав программы includes); подписи каруселей Xingwang и YingKe (описание.md). Запуск: node reels-studio/tools/gtt-reel/mockup.mjs
import { createRequire } from 'module'; import fs from 'fs'; import { execSync } from 'child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = '/home/user/VIDEO-HUB', SV = `file://${ROOT}/source-videos/`, F = `${ROOT}/презентации/ostapdotcenko/2026-10-12-intro-ru/fonts/`;
const K = `${SV}2026-11-03-gtt-проект/кадры/`, SAN = `${SV}2026-10-25-sany/фото/`, XW = `${SV}2026-10-26-xingwang/фото/`, YK = `${SV}2026-10-26-yingke/фото/`;
const PR = `${SV}фото-от-пользователя/остап/из-профиля/`, CRY = `file://${ROOT}/finished-videos/обложки/gtt-бренд/instagram/gtt-аватар-1080.jpg`;
const AV = `${SV}фото-от-пользователя/остап/ostap-portret-sait.jpg`; // аватар в рамке сторис — его фото, как в профиле
const OUT = `${ROOT}/finished-videos/макеты/2026-11-03-gtt-проект`;
fs.mkdirSync(OUT, { recursive: true });

const card = (src, st, pos = 'center') => `<div class="card" style="${st}"><div class="kb" style="background-image:url('${src}');background-position:${pos}"></div></div>`;
// «сторис» — вертикальный кадр с полосками прогресса, аватаром и подписью, как в Instagram
const story = (src, st, place = 'SANY · Чанша', seg = 2, of = 5) => `<div class="story" style="${st}"><div class="kb" style="background-image:url('${src}')"></div>
  <div class="bars">${Array.from({ length: of }, (_, i) => `<i style="background:${i < seg ? '#fff' : 'rgba(255,255,255,.4)'}"></i>`).join('')}</div>
  <div class="who"><img src="${AV}"><b>ostap.dotsenko</b><span>${place}</span></div></div>`;
const sub = (t, y = 1470) => `<div class="sub" style="top:${y}px">${t}</div>`;
const pill = (t, st) => `<div class="pill" style="${st}">${t}</div>`;
const lab = (t, y = 270) => `<div class="lab" style="top:${y}px">${t}</div>`;
const stat = (n, l, x, y, w = 440) => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px"><div class="num">${n}</div><div class="slab">${l}</div></div>`;

const scenes = [
  // 1. Хук: сторис на весь кадр, его голос
  ['0:00–0:03', 'Хук — сторис, его голос', `${story(`${K}IMG_5624-start.jpg`, 'left:0;top:0;width:1080px;height:1920px;border-radius:0;border:0;box-shadow:none', 'SANY · Чанша', 1)}
    <div class="sticker" style="left:70px;top:330px;rotate:-4deg">Утро начинается<br>с <b>SANY</b></div>
    ${sub('Итак, утро начинается <span>с посещения</span>')}`],
  // 2. Фото SANY падают карточками
  ['0:03–0:07', 'Фото SANY карточками', `<div class="hb"></div>${lab('01 · SANY · Чанша')}
    <div class="ttl">Крупнейший производитель <em>строительной техники</em></div>
    ${card(`${SAN}IMG_5645.jpg`, 'left:60px;top:640px;width:520px;height:700px;rotate:-5deg', 'center 30%')}
    ${card(`${SAN}IMG_5674.jpg`, 'left:500px;top:720px;width:520px;height:690px;rotate:4deg', 'center 35%')}
    <img class="logo" src="${SV}логотипы/спецтехника/sany.png" style="left:64px;top:1400px">
    ${sub('это крупнейший <span>производитель</span> строительной техники')}`],
  // 3. Сторис-перебивка: цех
  ['0:07–0:09', 'Сторис: цех SANY', `${story(`${K}IMG_5653.jpg`, 'left:0;top:0;width:1080px;height:1920px;border-radius:0;border:0;box-shadow:none', 'SANY · цех', 2)}
    <div class="sticker" style="right:70px;top:420px;rotate:3deg">Сегодня —<br><b>встреча с менеджментом</b></div>
    ${sub('Сегодня встреча <span>с менеджментом</span>')}`],
  // 4. Снова лицо: «Приехал лично»
  ['0:09–0:13', 'Сторис: «Приехал лично»', `<div class="hb"></div>
    <div class="big" style="top:270px;right:120px">ЛИЧНО</div>
    ${story(`${K}IMG_5624-lichno.jpg`, 'left:160px;top:470px;width:760px;height:1000px;rotate:-2deg', 'SANY · Чанша', 3)}
    ${sub('Приехал лично <span>проинспектировать</span>')}`],
  // 5. Быстрые сторис: показать вам
  ['0:13–0:16', 'Три сторис подряд', `<div class="hb"></div>${lab('Сначала смотрю сам — потом показываю вам')}
    ${story(`${K}IMG_5658.jpg`, 'left:40px;top:430px;width:330px;height:590px;rotate:-6deg', 'SANY', 3)}
    ${story(`${K}IMG_5671.jpg`, 'left:375px;top:400px;width:330px;height:590px;rotate:1deg', 'SANY', 4)}
    ${story(`${K}IMG_5648.jpg`, 'left:710px;top:440px;width:330px;height:590px;rotate:6deg', 'SANY', 5)}
    ${sub('чтобы в дальнейшем <span>показывать это вам</span>', 1200)}`],
  // 6. С руководителями — Xingwang
  ['0:16–0:20', '«С руководителями» — Xingwang', `<div class="hb"></div>${lab('02 · Технопарк <span class="zh">兴旺</span> · Чанша')}
    <div class="ttl">Встречи <em>с руководителями</em></div>
    ${card(`${XW}koni.jpg`, 'left:64px;top:560px;width:952px;height:700px;rotate:-1.5deg', 'center 40%')}
    ${card(`${XW}188.jpg`, 'left:560px;top:1120px;width:440px;height:300px;rotate:4deg', 'center 40%')}
    ${pill('С председателем группы <b>Хоу Синваном</b> <span class="zh">侯兴旺</span>', 'top:1300px;rotate:-1deg')}
    ${sub('и помогать со встречами <span>с руководителями</span>')}`],
  // 7. С инженерами — цех
  ['0:20–0:22', '«С инженерами» — цех', `${story(`${K}IMG_5652.jpg`, 'left:0;top:0;width:1080px;height:1920px;border-radius:0;border:0;box-shadow:none', 'SANY · производство', 4)}
    <div class="sticker" style="left:70px;top:420px;rotate:-3deg">с <b>инженерами</b></div>
    ${sub('с <span>инженерами</span>')}`],
  // 8. С теми, кто решает — YingKe
  ['0:22–0:26', '«Кто решает вопросы» — YingKe', `<div class="hb"></div>${lab('03 · Юрфирма <span class="zh">盈科</span>')}
    <div class="ttl">И с теми, кто <em>решает вопросы</em></div>
    ${card(`${YK}6.jpg`, 'left:64px;top:560px;width:952px;height:560px;rotate:1deg', 'center 45%')}
    ${card(`${YK}3.jpg`, 'left:80px;top:1060px;width:420px;height:400px;rotate:-5deg', 'center 25%')}
    <div class="a" style="left:530px;top:1150px;width:500px"><div class="num" style="font-size:92px">19 200+</div><div class="slab">юристов — крупнейшая юрфирма мира по числу юристов</div></div>
    ${sub('кто действительно <span>решает вопросы</span>')}`],
  // 9. Цифры на сторис
  ['0:26–0:30', 'Цифры GTT (музыка)', `${story(`${K}IMG_5649.jpg`, 'left:0;top:0;width:1080px;height:1920px;border-radius:0;border:0;box-shadow:none', 'SANY', 5)}
    <div class="a" style="inset:0;background:linear-gradient(180deg,rgba(8,20,64,.25),rgba(8,20,64,.86) 45%)"></div>
    ${lab('Global Tech Tour — это', 640)}
    ${stat('1000+', 'компаний в базе', 64, 720)}${stat('18', 'отраслей', 620, 720)}
    ${stat('76', 'программ', 64, 1010)}${stat('9', 'стран', 620, 1010)}`],
  // 10. Что внутри
  ['0:30–0:35', 'Что внутри экспедиции', `<div class="hb"></div>${lab('Внутри экспедиции')}
    <div class="ttl" style="right:420px">Не экскурсия — <em>доступ</em></div>
    <div class="a" style="left:64px;top:620px;width:600px;display:grid;gap:22px">
      ${['Экскурсии по производствам', 'Переговоры с топ-менеджментом', 'Демонстрации технологий', 'Перевод и сопровождение', 'Контакты для сделок'].map((t) => `<div class="chk"><i>✓</i>${t}</div>`).join('')}
    </div>
    ${story(`${K}IMG_5650.jpg`, 'left:690px;top:600px;width:340px;height:610px;rotate:5deg', 'SANY', 5)}`],
  // 11. Финал
  ['0:35–0:39', 'Финал: Остап + сайт', `<div class="hb"></div>
    ${card(`${PR}2026-10-22-чанша-ярмарка.jpg`, 'left:240px;top:300px;width:600px;height:760px;rotate:-2deg', 'center 35%')}
    <img src="${CRY}" class="a" style="left:780px;top:960px;width:200px;height:200px;border-radius:50%;box-shadow:0 0 0 6px #fff">
    <div class="a" style="left:64px;right:64px;top:1150px;text-align:center;font:900 64px/1.08 Unbounded;color:#fff">Global Tech Tour</div>
    <div class="a" style="left:100px;right:100px;top:1240px;text-align:center;font:500 34px/1.35 Golos;color:#C9D7F5">Бенчмарк-туры и технологические экспедиции в Китай и Юго-Восточную Азию</div>
    <div class="a btn" style="left:250px;top:1390px">globaltechtour.ru</div>
    <div class="a" style="left:0;right:0;top:1510px;text-align:center;font:700 34px Golos;color:#7DD3FC">Пиши в директ — подберём программу →</div>`],
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Unbounded;font-weight:200 900;src:url('file://${F}Unbounded-variable.ttf')}
@font-face{font-family:Golos;font-weight:400 900;src:url('file://${F}GolosText-variable.ttf')}
@font-face{font-family:JB;font-weight:100 800;src:url('file://${F}JetBrainsMono-variable.ttf')}
@font-face{font-family:MSZ;src:url('file://${ROOT}/интернет-материалы/шрифты/ma-shan-zheng.woff2') format('woff2')}
*{box-sizing:border-box;margin:0}body{background:#000}
section{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:Golos,sans-serif;background:#081440}
.a{position:absolute}
.hb{position:absolute;inset:0;background:radial-gradient(circle at 70% 25%,#1B3A8F 0,#0B1D55 55%,#081440 100%)}
.hb::after{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(125,211,252,.16) 3.4px,transparent 4px);background-size:22px 22px}
.cry{position:absolute;right:64px;top:250px;width:92px;height:92px;border-radius:50%;box-shadow:0 0 0 5px #fff;z-index:50}
.lab{position:absolute;left:64px;right:180px;font:700 30px JB;letter-spacing:.14em;text-transform:uppercase;color:#7DD3FC}
.zh{font-family:MSZ;letter-spacing:0;text-transform:none;font-size:1.25em}
.ttl{position:absolute;left:60px;right:170px;top:320px;font:900 70px/1.05 Unbounded;color:#fff;letter-spacing:-.02em}
.ttl em{font-style:normal;color:#7DD3FC}
.card{position:absolute;overflow:hidden;border:9px solid #fff;box-shadow:18px 18px 0 #2563EB;background:#222}
.kb{position:absolute;inset:0;background-size:cover;background-position:center}
.story{position:absolute;overflow:hidden;border-radius:34px;border:6px solid #fff;box-shadow:16px 16px 0 #2563EB;background:#111}
.bars{position:absolute;left:24px;right:24px;top:22px;display:flex;gap:8px;z-index:2}.bars i{flex:1;height:6px;border-radius:3px}
.who{position:absolute;left:24px;top:46px;display:flex;align-items:center;gap:14px;z-index:2;color:#fff;font:700 28px Golos;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.who img{width:58px;height:58px;border-radius:50%;border:3px solid #fff}.who span{font-weight:500;opacity:.85}
.sticker{position:absolute;background:#fff;color:#081440;font:700 46px/1.15 Golos;padding:18px 28px;border-radius:18px;box-shadow:10px 10px 0 #2563EB}
.sticker b{font-family:Unbounded;font-weight:900;color:#2563EB}
.sub{position:absolute;left:60px;right:60px;text-align:center;font:900 52px/1.15 Unbounded;color:#fff;text-shadow:0 4px 14px rgba(0,0,0,.65),0 0 2px #000}
.sub span{color:#7DD3FC}
.pill{position:absolute;left:64px;background:#fff;border:5px solid #081440;padding:14px 22px;font:600 34px/1.2 Golos;color:#081440;box-shadow:8px 8px 0 #7DD3FC}
.pill b{font-family:Unbounded;font-weight:900}
.num{font:900 120px/1 Unbounded;color:#7DD3FC;letter-spacing:-.04em;white-space:nowrap}
.slab{margin-top:10px;font:600 34px/1.2 Golos;color:#EAF1FF}
.big{position:absolute;left:0;right:0;text-align:center;font:900 190px/1 Unbounded;color:transparent;-webkit-text-stroke:5px #7DD3FC;letter-spacing:-.03em}
.logo{position:absolute;height:110px;background:#fff;padding:18px 26px;border-radius:16px;box-shadow:8px 8px 0 #2563EB}
.chk{display:flex;align-items:center;gap:20px;background:#fff;color:#081440;font:700 36px/1.2 Golos;padding:20px 24px;border-radius:16px;box-shadow:8px 8px 0 #2563EB}
.chk i{font-style:normal;width:52px;height:52px;border-radius:50%;background:#16A34A;color:#fff;display:flex;align-items:center;justify-content:center;font:900 30px Golos;flex-shrink:0}
.btn{background:#2563EB;color:#fff;font:900 46px Unbounded;padding:26px 44px;border-radius:999px;box-shadow:0 0 0 6px #fff,0 20px 50px rgba(37,99,235,.6)}
</style></head><body>
${scenes.map(([, , body], i) => `<section id="s${i}">${body}<img class="cry" src="${CRY}"></section>`).join('\n')}
</body></html>`;
fs.writeFileSync('/dev/shm/gm/mockup.html', html);
const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto('file:///dev/shm/gm/mockup.html', { waitUntil: 'load' });
await pg.evaluate(() => document.fonts.ready);
await pg.waitForTimeout(500);
for (let i = 0; i < scenes.length; i++) await (await pg.$(`#s${i}`)).screenshot({ path: `${OUT}/${String(i + 1).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 86 });
await br.close();
// лист: 6 в ряд, подписи «№ · время · сцена»
const files = scenes.map((_, i) => `${OUT}/${String(i + 1).padStart(2, '0')}.jpg`);
const labels = scenes.map(([t, n], i) => `${i + 1} · ${t}\n${n}`);
fs.writeFileSync('/dev/shm/gm/sheet.py', `
from PIL import Image, ImageDraw, ImageFont
files=${JSON.stringify(files)}; labels=${JSON.stringify(labels)}
W,H=360,640; cols=6; rows=(len(files)+cols-1)//cols
font=ImageFont.truetype('${F}GolosText-variable.ttf', 20)
sheet=Image.new('RGB',(cols*W+(cols+1)*20, rows*(H+60)+(rows+1)*20),'#0B1230')
d=ImageDraw.Draw(sheet)
for i,(f,l) in enumerate(zip(files,labels)):
    x=20+(i%cols)*(W+20); y=20+(i//cols)*(H+80)
    im=Image.open(f).convert('RGB').resize((W,H),Image.LANCZOS); sheet.paste(im,(x,y))
    d.multiline_text((x,y+H+6),l,fill='#EAF1FF',font=font,spacing=4)
sheet.save('${OUT}/_лист.jpg',quality=88)
`);
execSync('python3 /dev/shm/gm/sheet.py');
console.log(`${scenes.length} кадров → ${OUT}`);
