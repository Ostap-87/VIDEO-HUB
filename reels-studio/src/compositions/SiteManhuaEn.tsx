// Английская версия «Мой сайт» (04.11.2026) — копия SiteManhua.tsx с переводом надписей и экранами сайта на английском.
// «Мой сайт» v2 — манхуа-трейлер ostapdotcenko.ru для личного профиля @ostap.dotsenko (03.11.2026: «более креативный вариант,
// чтобы отличался от того, что ты делал ранее… Remotion, больше спецэффектов и шрифтов, стиль маньхуа, моушн-дизайн, переходы
// и хуки, элементы графики… кинематографично и очень завлекающе»). 1080×1920, 30 к/с, 38,8 с.
// Сайт подан как манхуа с главами: 第一话 кто он, 第二话 цифры, 第三话 три языка (экран «выбери язык», как в игре),
// 第四话 блог — «новая глава каждый день» (календарь отрывается по дням с настоящими статьями), финал 未完待续.
// Экраны — настоящие снимки сайта (source-videos/ostapdotcenko/site/2026-11-03-сайт/), факты — только из src/i18n/*.ts сайта.
// Музыка Inspiring Technology (CC BY 3.0) с 12,6 с трека: «дроп» приходится на влёт телефона (2,2 с ролика).
import React from "react";
import {AbsoluteFill, Freeze, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {useBrush, BRUSH} from "../components/MontazhFx";
import {FONT} from "./site-manhua/fonts";
import {
  ActionLines, Bubble, Burst, C, CL, CircleReveal, EIO, EO, Flash, GlitchReveal, GlitchText, Grain, HandArrow, Halftone, InkReveal, Letterbox,
  Narration, PageReveal, Panel, Phone, Sfx, Shot, SlashReveal, SpeedLines, Tape, Vignette, countText, p, sumShake, typed,
} from "./site-manhua/fx";

export const SITE_MANHUA_EN_FRAMES = 1164;
const IMG = "source-videos/ostapdotcenko/site/2026-11-03-сайт/";
const SFXP = "source-videos/2026-11-03-od-sait-manhua/sfx/";
// музыка v3 (выбор пользователя 04.11.2026, №81): Magnetz — 1000 Handz (Free Music Archive), CC BY 4.0;
// удар на 65,70 с трека = влёт телефона (2,2 с); провал трека 94–98,5 с приходится на вход в финал, удар 98,47 с — 35,0 с ролика
const MUSIC = "интернет-материалы/музыка/magnetz-1000-handz.mp3";
const CUT = "source-videos/фото-от-пользователя/остап/вырезки/ostap-portret-sait.png";
const im = (n: string) => `${IMG}${n}.jpg`;

// сцены (глобальные кадры): каждая следующая открывается поверх предыдущей за 12–14 кадров
const T = {cold: [0, 120], ch1: [108, 318], ch2: [306, 501], ch3: [489, 753], ch4: [741, 996], fin: [984, 1164]} as const;

const dela = (size: number, color = C.ink, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT.dela, fontSize: size, color, lineHeight: 1.02, ...extra});

// заголовок главы манхуа: 第N话 + «ГЛАВА N» + название, под ним мазок кистью
const ChapterHead: React.FC<{zh: string; no: string; title: string; at?: number; dark?: boolean}> = ({zh, no, title, at = 2, dark}) => {
  const f = useCurrentFrame();
  const k = p(f, at, at + 10, EO);
  const brush = p(f, at + 6, at + 20, EO);
  return (
    <div style={{position: "absolute", left: 64, top: 270, display: "flex", alignItems: "center", gap: 26, opacity: k, translate: `${(1 - k) * -160}px 0`}}>
      <div style={{fontFamily: FONT.zcool, fontSize: 104, color: dark ? C.y : C.ink, lineHeight: 1}}>{zh}</div>
      <div>
        <div style={{fontFamily: FONT.oswald, fontSize: 32, letterSpacing: "0.18em", color: C.red}}>{no}</div>
        <div style={dela(52, dark ? "#fff" : C.ink)}>{title}</div>
      </div>
      <svg width={560} height={40} style={{position: "absolute", left: 0, top: 118, overflow: "visible"}}>
        <path d="M4,22 C120,6 260,34 420,14 C470,8 520,18 556,12" fill="none" stroke={C.red} strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - brush} />
      </svg>
    </div>
  );
};

const Chip: React.FC<{x: number; y: number; at: number; rot?: number; bg?: string; color?: string; children: React.ReactNode; size?: number}> = ({x, y, at, rot = 0, bg = "#fff", color = C.ink, children, size = 34}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
  return (
    <div style={{position: "absolute", left: x, top: y, background: bg, color, border: `5px solid ${C.ink}`, padding: "10px 20px", fontFamily: FONT.golos, fontWeight: 800, fontSize: size, whiteSpace: "nowrap", rotate: `${rot}deg`, scale: String(1.7 - 0.7 * s), opacity: Math.min(1, s * 2), boxShadow: `8px 8px 0 ${C.ink}`}}>
      {children}
    </div>
  );
};

// ── 0. Холодное открытие: «А ЕЩЁ / У МЕНЯ / ЕСТЬ / САЙТ.» ударами → облачко «Ну и НАХУЯ?» с наездом → дроп: телефон
// влетает в кадр, сверху 我的网站 (правки пользователя 03.11.2026 в «Монтажном листе»)
const Cold: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const drop = f >= 66;
  const words: [string, number, number][] = [["ALSO,", 0, 440], ["I'VE", 7, 600], ["GOT A", 13, 760], ["SITE.", 19, 920]];
  const ph = spring({frame: f - 66, fps, config: {damping: 14, stiffness: 120, mass: 0.9}});
  const bub = spring({frame: f - 28, fps, config: {damping: 10, stiffness: 220, mass: 0.6}});
  const wtf = spring({frame: f - 36, fps, config: {damping: 7, stiffness: 320, mass: 0.5}});
  // наезд камеры на «НАХУЯ» в облачке и обратно перед дропом
  const zoom = 1 + 0.22 * p(f, 34, 44, EO) - 0.22 * p(f, 58, 66, EIO);
  const zh = spring({frame: f - 70, fps, config: {damping: 11, stiffness: 300, mass: 0.6}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[7, 6, 12], [13, 6, 12], [19, 12, 30], [36, 14, 26], [66, 12, 26], [84, 6, 10]], "cold")}}>
      {!drop ? (
        <AbsoluteFill style={{scale: String(zoom), transformOrigin: "540px 1330px"}}>
          <AbsoluteFill style={{background: C.ink}} />
          <SpeedLines color="#fff" opacity={0.8} inner={430} cy={f < 34 ? 760 : 1330} seed="c0" />
          {words.map(([t, at, y]) => {
            const s = at === 0 ? 1 : spring({frame: f - at, fps, config: {damping: 11, stiffness: 300, mass: 0.6}});
            return f >= at ? (
              <div key={t} style={{position: "absolute", left: 0, right: 0, top: y, textAlign: "center", ...dela(150, "#fff", {textShadow: `12px 12px 0 ${C.red}`}), scale: String(1.9 - 0.9 * s)}}>{t}</div>
            ) : null;
          })}
          <Sfx text="咚!" x={820} y={930} size={110} color={C.y} at={19} font={FONT.zcool} rot={10} />
          {f >= 28 ? (
            <Bubble x={150} y={1150} w={780} h={360} shout tail={[620, -50]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
              <div style={dela(64)}>So…</div>
              <div style={{...dela(124, C.red, {WebkitTextStroke: `3px ${C.ink}`, paintOrder: "stroke fill"}), scale: String(f >= 36 ? 0.4 + 0.6 * wtf : 0.4), opacity: f >= 36 ? 1 : 0}}>WTF?</div>
            </Bubble>
          ) : null}
          <Sfx text="啥?!" x={700} y={300} size={130} color={C.y} at={40} font={FONT.zcool} rot={-12} until={66} />
        </AbsoluteFill>
      ) : (
        <>
          <Halftone bg={C.y} dot="rgba(25,25,34,.16)" />
          <SpeedLines color={C.ink} opacity={0.85} inner={560} cy={1060} seed="c1" />
          <div style={{position: "absolute", left: 64, top: 270, fontFamily: FONT.mono, fontSize: 30, letterSpacing: "0.16em", color: C.ink}}>OSTAP DOTSENKO · 多增科</div>
          {f >= 70 ? <div style={{position: "absolute", left: 56, top: 330, fontFamily: FONT.zcool, fontSize: 170, lineHeight: 1, color: C.ink, textShadow: `10px 10px 0 ${C.red}`, scale: String(1.8 - 0.8 * zh), transformOrigin: "0 50%"}}>我的网站</div> : null}
          <AbsoluteFill style={{perspective: 1800}}>
            <div style={{position: "absolute", left: 470, top: 560, transformStyle: "preserve-3d", transform: `translateY(${(1 - ph) * 1300}px) rotateX(${(1 - ph) * 65 + 6}deg) rotateY(${-34 + ph * 22}deg) rotateZ(${(1 - ph) * -20 + 4}deg) scale(${0.75 + 0.25 * ph})`}}>
              <Phone w={470} imgs={[im("en-00-top")]} mode="swap" glareAt={92} />
            </div>
          </AbsoluteFill>
          <Sfx text="唰!" x={70} y={700} size={150} color="#fff" at={68} font={FONT.zcool} rot={-10} />
          <Tape x={40} y={1300} at={84} rot={-6} font={FONT.mono} size={52}>ostapdotcenko.ru</Tape>
        </>
      )}
      <Flash at={66} dur={6} />
      <Letterbox h={f < 66 ? 110 : 110 * (1 - p(f, 66, 74, EO))} />
    </AbsoluteFill>
  );
};

// ── 1. Глава 1 «Кто он такой»: страница манги из четырёх панелей ─────────────────────────────────────────────
const Ch1: React.FC = () => {
  const f = useCurrentFrame();
  const z = (a: number, b: number) => 1 + 0.08 * p(f, a, b);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Halftone bg={C.paper} dot="rgba(25,25,34,.08)" size={18} r={2.6} />
      <AbsoluteFill style={{translate: sumShake(f, [[18, 7, 10], [48, 7, 10], [78, 10, 16], [128, 7, 10]], "ch1"), scale: String(1 + 0.03 * p(f, 0, 222))}}>
        <ChapterHead zh="第一话" no="CHAPTER 1" title="Who is this guy" />
        <Panel x={48} y={470} w={984} h={330} poly={[[0, 0], [1, 0], [1, 0.86], [0, 1]]} at={18} from="left">
          <Shot src={im("en-00-top")} crop={[0, 330, 975, 380]} w={984} h={330} zoom={z(18, 222)} />
        </Panel>
        <Narration x={600} y={492} at={28} font={FONT.oswald} size={30} rot={2}>RUSSIA ↔ CHINA ↔ SE ASIA</Narration>
        <Panel x={48} y={826} w={500} h={500} poly={[[0, 0.1], [1, 0], [1, 1], [0, 1]]} at={48} from="bottom">
          {/* живое фото со сцены (Мегамаркет), прислал пользователь 03.11.2026 — вместо куска экрана «Обо мне» */}
          <Img src={staticFile("source-videos/фото-от-пользователя/остап/2026-11-03-для-финала/foto-5.jpg")} style={{position: "absolute", left: 0, top: 0, width: 500, height: 500, objectFit: "cover", objectPosition: "78% 25%", scale: String(z(48, 222))}} />
        </Panel>
        {f >= 62 ? (
          <Bubble x={56} y={1170} w={500} h={200} tail={[300, -30]} scale={spring({frame: f - 62, fps: 30, config: {damping: 10, stiffness: 240}})}>
            <div style={dela(32)}>Strategist. Leader.</div>
            <div style={dela(32, C.red)}>Bridge builder.</div>
          </Bubble>
        ) : null}
        <Panel x={570} y={800} w={462} h={526} poly={[[0, 0.06], [1, 0], [1, 1], [0, 1]]} at={78} bg={C.ink}>
          <SpeedLines color="rgba(255,217,46,.35)" cx={231} cy={250} inner={150} n={70} seed="p3" />
          <Burst x={231} y={240} r={165} color={C.y} rot={f * 0.8} seed="b1" />
          <div style={{position: "absolute", left: 0, right: 0, top: 168, textAlign: "center", ...dela(140, C.ink, {WebkitTextStroke: "5px #fff", paintOrder: "stroke fill"})}}>{countText(f, 80, 22, 13, "", "+")}</div>
          <div style={{position: "absolute", left: 0, right: 0, top: 362, textAlign: "center", ...dela(30, "#fff")}}>years across markets</div>
          <Chip x={24} y={404} at={104} rot={-3} size={26}>20+ countries</Chip>
          <Chip x={226} y={458} at={116} rot={3} size={26} bg={C.y}>5 languages</Chip>
        </Panel>
        <Sfx text="咚!" x={850} y={760} size={110} color={C.red} stroke="#fff" at={86} font={FONT.zcool} rot={14} />
        <Panel x={48} y={1340} w={984} h={200} poly={[[0, 0], [1, 0.12], [1, 1], [0, 1]]} at={128} bg={C.red} from="right">
          <ActionLines color="rgba(25,25,34,.55)" speed={-90} seed="p4" />
          <div style={{position: "absolute", left: 40, top: 26, background: C.y, border: `4px solid ${C.ink}`, padding: "4px 12px", fontFamily: FONT.mono, fontSize: 22, color: C.ink}}>CAREER</div>
          <div style={{position: "absolute", left: 40, top: 70, translate: `${(1 - p(f, 132, 146, EO)) * 500}px 0`, ...dela(44, "#fff", {WebkitTextStroke: `2px ${C.ink}`})}}>
            Alibaba → Sber →<br />my own projects
          </div>
        </Panel>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 2. Глава 2 «Кейсы» (правка пользователя 03.11.2026: «блок с цифрами убрал бы, а проекты наоборот расписал — Мегасреда,
// Минэкономразвития — взрывными плашками»): «8 кейсов, которыми горжусь» и четыре проекта с сайта, каждый — плашка во взрыве
type Case = {at: number; x: number; y: number; rot: number; kicker: string; title: string; chips: [string, number?, string?][]; sfx: string; burst: string};
const CASES: Case[] = [
  {at: 24, x: 30, y: 470, rot: -2, kicker: "MEGAMARKET / SBER · 2023–2025", title: "MinEconDev × Megamarket", chips: [["regions", 86], ["sellers", 50000]], sfx: "轰!", burst: C.y},
  {at: 58, x: 270, y: 718, rot: 2, kicker: "MEGAMARKET / SBER · 2024", title: "Federal marathon “Megasreda”", chips: [["cities", 20], ["million+ views", 1]], sfx: "砰!", burst: "#fff"},
  {at: 92, x: 30, y: 966, rot: -2, kicker: "MEGAMARKET / SBER · 2024", title: "“Made in Russia”", chips: [["companies", 2000, "0 → "]], sfx: "咚!", burst: C.y},
  {at: 126, x: 270, y: 1214, rot: 2, kicker: "ALIBABA GROUP · 2020–2022", title: "O2O Partnerships — AliExpress", chips: [["media partners", 120, "+"]], sfx: "啪!", burst: "#fff"},
];
const CasePlate: React.FC<{c: Case}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < c.at) return null;
  const s = spring({frame: f - c.at, fps, config: {damping: 11, stiffness: 240, mass: 0.7}});
  const flash = 1 - p(f, c.at + 1, c.at + 6);
  return (
    <div style={{position: "absolute", left: c.x, top: c.y, width: 740, zIndex: 2, rotate: `${c.rot * (2 - s)}deg`, scale: String(1.5 - 0.5 * s), opacity: Math.min(1, s * 2), transformOrigin: "30% 50%"}}>
      <Burst x={40} y={105} r={105} color={c.burst} rot={f * 0.9} seed={c.title} sw={7} />
      <div style={{position: "relative", marginLeft: 50, background: "#fff", border: `6px solid ${C.ink}`, boxShadow: `12px 12px 0 ${C.ink}`, padding: "16px 24px 18px"}}>
        <div style={{fontFamily: FONT.mono, fontSize: 21, letterSpacing: "0.1em", color: C.red}}>{c.kicker}</div>
        <div style={{...dela(38, C.ink), marginTop: 6, lineHeight: 1.06}}>{c.title}</div>
        <div style={{display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap"}}>
          {c.chips.map(([lab, n, pre], i) => (
            <div key={lab} style={{background: i % 2 ? C.red : C.y, color: i % 2 ? "#fff" : C.ink, border: `4px solid ${C.ink}`, padding: "6px 14px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 30, whiteSpace: "nowrap"}}>
              <span style={{fontFamily: FONT.dela}}>{n !== undefined ? countText(f, c.at + 4 + i * 4, 16, n, pre === "+" ? "" : pre ?? "", pre === "+" ? "+" : "", "en-US") : ""}</span> {lab}
            </div>
          ))}
        </div>
        <div style={{position: "absolute", inset: 0, background: "#fff", opacity: flash * 0.9}} />
      </div>
      <Sfx text={c.sfx} x={660} y={96} size={96} color={C.y} at={c.at + 2} font={FONT.zcool} rot={12} />
    </div>
  );
};
const Ch2: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const h = spring({frame: f - 6, fps, config: {damping: 10, stiffness: 260}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[6, 8, 14], ...CASES.map((c) => [c.at, 10, 18] as [number, number, number])], "ch2"), scale: String(1 + 0.04 * p(f, 140, 195))}}>
      <Halftone bg={C.red} dot="rgba(25,25,34,.22)" />
      <SpeedLines color={C.ink} opacity={0.5} cy={f < 58 ? 640 : f < 92 ? 880 : f < 126 ? 1120 : 1350} inner={380} seed="c2" />
      <div style={{position: "absolute", left: 64, top: 270, display: "flex", alignItems: "baseline", gap: 18, opacity: p(f, 2, 10), translate: `${(1 - p(f, 2, 12, EO)) * -140}px 0`}}>
        <span style={{fontFamily: FONT.zcool, fontSize: 70, color: C.y}}>第二话</span>
        <span style={dela(46, "#fff")}>Cases</span>
      </div>
      {f >= 6 ? (
        <div style={{position: "absolute", left: 60, top: 336, display: "flex", alignItems: "center", gap: 22, scale: String(1.5 - 0.5 * h), transformOrigin: "0 50%"}}>
          <span style={dela(110, C.y, {WebkitTextStroke: `6px ${C.ink}`, paintOrder: "stroke fill", textShadow: `10px 10px 0 ${C.ink}`})}>8</span>
          <span style={dela(42, "#fff", {WebkitTextStroke: `2px ${C.ink}`})}>cases<br />I'm proud of</span>
        </div>
      ) : null}
      {CASES.map((c) => <CasePlate key={c.title} c={c} />)}
      {CASES.map((c) => <Flash key={c.title} at={c.at} dur={4} max={0.35} />)}
    </AbsoluteFill>
  );
};

// ── 3. Глава 3 «Три языка»: экран «выбери язык», как в игре → телефон меняет язык с глитчем → три полосы «VS» ───
const LANGS = [
  {code: "RU", name: "Русский", img: "ru", hero: "Остап Доценко."},
  {code: "EN", name: "English", img: "en", hero: "Ostap Dotsenko."},
  {code: "中文", name: "中文", img: "zh", hero: "奥斯塔普 · 多增科"},
];
const Ch3: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  // правки пользователя 03.11.2026: карточки крупнее; на выборе карточка приближается и возвращается на место; телефон крупнее
  const SEL = [28, 54, 80];
  const sel = f < SEL[0] ? -1 : f < SEL[1] ? 0 : f < SEL[2] ? 1 : 2;
  const cardsOut = p(f, 114, 124, EIO);
  const phoneIn = spring({frame: f - 116, fps, config: {damping: 14, stiffness: 130}});
  const lang = f < 150 ? 0 : f < 182 ? 1 : 2;
  const gl = Math.max(f >= 150 && f < 160 ? 1 - (f - 150) / 10 : 0, f >= 182 && f < 192 ? 1 - (f - 182) / 10 : 0, f >= 116 && f < 124 ? 1 - (f - 116) / 8 : 0);
  const vs = f >= 212;
  return (
    <AbsoluteFill style={{background: C.ink, translate: sumShake(f, [[28, 5, 8], [54, 5, 8], [80, 5, 8], [150, 8, 14], [182, 8, 14], [212, 6, 12], [218, 6, 12], [224, 6, 12]], "ch3")}}>
      <AbsoluteFill style={{backgroundImage: "linear-gradient(rgba(255,217,46,.07) 2px, transparent 2px), linear-gradient(90deg, rgba(255,217,46,.07) 2px, transparent 2px)", backgroundSize: "60px 60px", backgroundPosition: `0 ${f * 2}px`}} />
      <div style={{position: "absolute", left: 64, top: 270, display: "flex", alignItems: "baseline", gap: 16}}>
        <span style={{fontFamily: FONT.zcool, fontSize: 58, color: C.y}}>第三话</span>
        <span style={{fontFamily: FONT.oswald, fontSize: 34, letterSpacing: "0.16em", color: "#fff"}}>THREE LANGUAGES</span>
      </div>
      {f < 124 ? (
        <AbsoluteFill style={{opacity: 1 - cardsOut, translate: `0 ${-cardsOut * 200}px`}}>
          <div style={{position: "absolute", left: 64, top: 360, fontFamily: FONT.pixel, fontSize: 50, color: C.y, opacity: f > 20 && Math.floor(f / 8) % 2 === 1 && sel < 0 ? 0.25 : 1}}>SELECT LANGUAGE</div>
          <div style={{position: "absolute", left: 64, top: 436, fontFamily: FONT.zcool, fontSize: 52, color: C.red}}>选择语言</div>
          {LANGS.map((l, i) => {
            const s = spring({frame: f - (8 + i * 6), fps, config: {damping: 13, stiffness: 200}});
            const on = sel === i;
            const a = SEL[i];
            const k = p(f, a, a + 8, EO) - p(f, a + 16, a + 24, EIO); // приближение и возврат
            const x = 28 + i * 348, w = 330;
            return (
              <div key={l.code} style={{position: "absolute", left: x, top: 540, width: w, zIndex: k > 0 ? 5 : 1, translate: `${((540 - (x + w / 2)) * k).toFixed(1)}px ${((1 - s) * 900 - 30 * k).toFixed(1)}px`, scale: String(1 + 0.55 * k), filter: sel >= 0 && !on ? "brightness(.5) grayscale(.6)" : "none"}}>
                <div style={{position: "relative", width: w, height: 580, border: `7px solid ${on ? C.red : C.y}`, overflow: "hidden", background: C.bone, boxShadow: on ? `0 0 0 7px ${C.y}, 14px 14px 0 ${C.red}` : "10px 10px 0 rgba(0,0,0,.4)"}}>
                  <Shot src={im(`${l.img}-01-about`)} crop={[0, 200, 975, 1760]} w={w - 14} h={566} />
                </div>
                <div style={{marginTop: 16, textAlign: "center", fontFamily: l.code === "中文" ? FONT.zcool : FONT.pixel, fontSize: l.code === "中文" ? 54 : 40, color: on ? C.y : "#fff"}}>{l.code}</div>
                {on ? <div style={{position: "absolute", left: w / 2 - 50, top: -70, fontFamily: FONT.pixel, fontSize: 24, color: C.ink, background: C.red, padding: "8px 10px", border: `4px solid ${C.ink}`}}>1P▼</div> : null}
              </div>
            );
          })}
          {f >= 104 ? (
            <div style={{position: "absolute", left: 0, right: 0, top: 1260, textAlign: "center", opacity: Math.floor(f / 4) % 2 ? 1 : 0.6}}>
              <span style={{fontFamily: FONT.pixel, fontSize: 60, color: "#fff"}}>READY?</span>
              <span style={{fontFamily: FONT.zcool, fontSize: 70, color: C.y, marginLeft: 22}}>准备！</span>
            </div>
          ) : null}
        </AbsoluteFill>
      ) : null}
      {f >= 116 && !vs ? (
        <>
          <div style={{position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", ...dela(560, "transparent", {WebkitTextStroke: `6px ${C.y}`}), opacity: 0.22}}>{lang === 2 ? "中" : LANGS[lang].code}</div>
          <GlitchText amount={gl} seed="hero" style={{position: "absolute", left: 40, right: 40, top: 362, textAlign: "center", ...(lang === 2 ? {fontFamily: FONT.zcool, fontSize: 104, color: "#fff"} : dela(84, "#fff")), lineHeight: 1.1}}>
            {LANGS[lang].hero}
          </GlitchText>
          <AbsoluteFill style={{perspective: 2000}}>
            <div style={{position: "absolute", left: 210, top: 500, transformOrigin: "50% 0%", transform: `translateY(${(1 - phoneIn) * 1300}px) rotateY(${-6 + 3 * Math.sin(f / 30)}deg) rotateX(4deg) scale(${1 + 0.06 * p(f, 120, 210)})`}}>
              <Phone w={660} imgs={[im("ru-00-top"), im("en-00-top"), im("zh-00-top")]} mode="swap" keys={[[0, 0], [150, 1], [182, 2]]} tapAt={[[144, 653, 85], [176, 746, 85]]} glitchAt={[150, 182]} />
            </div>
          </AbsoluteFill>
        </>
      ) : null}
      {vs ? (
        <>
          <ActionLines color="rgba(255,217,46,.25)" angle={-60} speed={90} seed="vs" />
          {LANGS.map((l, i) => (
            <Panel key={l.code} x={-10 + i * 345} y={470} w={420} h={820} poly={[[0.12, 0], [1, 0], [0.88, 1], [0, 1]]} at={212 + i * 6} from={i === 1 ? "top" : "bottom"} bg={C.bone}>
              <Shot src={im(`${l.img}-00-top`)} crop={[0, 300, 540, 1050]} w={420} h={820} zoom={1 + 0.06 * p(f, 212, 264)} />
            </Panel>
          ))}
          {LANGS.map((l, i) => (
            <Chip key={l.code} x={120 + i * 345} y={1300} at={222 + i * 6} rot={i % 2 ? 3 : -3} bg={C.y} size={l.code === "中文" ? 40 : 38}>{l.code}</Chip>
          ))}
          <Narration x={64} y={1420} w={952} at={234} font={FONT.golos} size={32} sh={C.red}>
            <b>The whole site — in Russian, English and Chinese</b>
          </Narration>
          <Sfx text="啪!" x={770} y={1160} size={130} color={C.y} at={224} font={FONT.zcool} rot={-8} />
        </>
      ) : null}
      <AbsoluteFill style={{background: "repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 2px, transparent 2px 5px)", pointerEvents: "none"}} />
      <Flash at={116} dur={4} max={0.5} />
      <Flash at={212} dur={5} max={0.6} />
    </AbsoluteFill>
  );
};

// ── 4. Глава 4 «Блог»: отрывной календарь по дням с настоящими статьями, 45 статей, наклейки тем, статья на 3 языках ─
const DAYS: [string, string, string][] = [
  ["28", "OCTOBER", "The City Where Nobody Carries a Wallet"],
  ["29", "OCTOBER", "Bread and Circuits"],
  ["30", "OCTOBER", "More Robots Per Capita Than Anyone"],
  ["31", "OCTOBER", "The Birthplace of Humanoids"],
  ["1", "NOVEMBER", "Are You Free?"],
  ["2", "NOVEMBER", "No Legs, No Tips"],
  ["3", "NOVEMBER", "Coffee with a Hint of Audit"],
];
const CalPage: React.FC<{d: [string, string, string]}> = ({d}) => (
  <div style={{position: "absolute", inset: 0, background: "#fff", border: `6px solid ${C.ink}`}}>
    <div style={{height: 78, background: C.red, color: "#fff", fontFamily: FONT.oswald, fontSize: 40, letterSpacing: "0.16em", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `6px solid ${C.ink}`}}>{d[1]}</div>
    <div style={{textAlign: "center", ...dela(200, C.ink), marginTop: 20}}>{d[0]}</div>
    <div style={{position: "absolute", left: 0, right: 0, bottom: 22, textAlign: "center", fontFamily: FONT.mono, fontSize: 22, color: C.red}}>NEW POST</div>
  </div>
);
const Ch4: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const idx = Math.max(0, Math.min(6, Math.floor((f - 20) / 7)));
  const tearK = f >= 27 && f < 27 + 7 * 6 + 6 ? p((f - 20) % 7, 0, 6, EIO) : 1;
  const part3 = f >= 180;
  const stickersOut = p(f, 174, 182, EIO);
  return (
    <AbsoluteFill style={{background: C.paper, translate: sumShake(f, [[104, 12, 22], [130, 5, 8], [140, 5, 8], [150, 5, 8], [160, 5, 8], [170, 5, 8], [182, 6, 12], [188, 6, 12], [194, 6, 12]], "ch4")}}>
      <Halftone bg={C.paper} dot="rgba(25,25,34,.08)" size={18} r={2.6} />
      <ChapterHead zh="第四话" no="CHAPTER 4" title="Blog" />
      <div style={{position: "absolute", left: 420, top: 410, fontFamily: FONT.hand, fontSize: 50, color: C.red, rotate: "-3deg", opacity: p(f, 10, 18)}}>a new chapter every day!</div>
      {!part3 ? (
        <>
          <div style={{position: "absolute", left: 64, top: 520, width: 450, height: 430, perspective: 1400}}>
            <div style={{position: "absolute", left: 30, right: 30, top: -26, height: 40, display: "flex", justifyContent: "space-between", zIndex: 3}}>
              {Array.from({length: 6}).map((_, i) => <div key={i} style={{width: 18, height: 52, borderRadius: 9, background: C.ink}} />)}
            </div>
            <CalPage d={DAYS[idx]} />
            {f >= 27 && f < 27 + 7 * 6 && idx > 0 && tearK < 1 ? (
              <div style={{position: "absolute", inset: 0, transformOrigin: "50% 0%", transform: `rotateX(${(tearK * 110).toFixed(1)}deg) translateY(${(-tearK * 120).toFixed(1)}px) rotateZ(${(tearK * -10).toFixed(1)}deg)`, opacity: 1 - tearK}}>
                <CalPage d={DAYS[idx - 1]} />
              </div>
            ) : null}
          </div>
          <div style={{position: "absolute", left: 64, top: 980, width: 450}}>
            <div style={{fontFamily: FONT.mono, fontSize: 22, color: C.red, letterSpacing: "0.12em"}}>POST OF THE DAY</div>
            <div style={{marginTop: 8, background: "#fff", border: `5px solid ${C.ink}`, padding: "12px 16px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 32, color: C.ink, boxShadow: `8px 8px 0 ${C.y}`}}>{DAYS[idx][2]}</div>
          </div>
          <div style={{position: "absolute", left: 566, top: 520, rotate: "4deg", translate: `${(1 - spring({frame: f - 6, fps, config: {damping: 14, stiffness: 140}})) * 700}px 0`}}>
            <Phone w={450} imgs={[im("en-blog-3"), im("en-blog-4")]} header={im("en-00-top")} keys={[[0, 0], [70, 1]]} />
          </div>
          {f >= 80 ? (
            <>
              <Burst x={250} y={1320} r={160} color={C.y} rot={f * 0.7} scale={spring({frame: f - 80, fps, config: {damping: 10, stiffness: 200}})} seed="b4" />
              <div style={{position: "absolute", left: 90, top: 1225, width: 320, textAlign: "center", ...dela(190, C.ink), scale: String(f >= 104 ? 1.2 - 0.2 * spring({frame: f - 104, fps, config: {damping: 8, stiffness: 300}}) : 1)}}>{countText(f, 80, 24, 46)}</div>
              <div style={{position: "absolute", left: 470, top: 1250, ...dela(60, C.ink), background: "#fff", border: `4px solid ${C.ink}`, padding: "0 14px", boxShadow: `6px 6px 0 ${C.y}`, opacity: p(f, 90, 98)}}>posts</div>
              <div style={{position: "absolute", left: 474, top: 1330, fontFamily: FONT.hand, fontSize: 46, color: C.red, background: "#fff", padding: "0 12px", rotate: "-2deg", opacity: p(f, 100, 108)}}>plus a new one daily</div>
              <HandArrow x={830} y={1250} w={160} h={90} at={104} d="M10,80 C50,60 90,40 140,10 M140,10 L100,14 M140,10 L128,48" />
            </>
          ) : null}
          <AbsoluteFill style={{opacity: 1 - stickersOut}}>
            <Chip x={90} y={600} at={130} rot={-9} bg={C.y}>China &amp; SE Asia</Chip>
            <Chip x={590} y={680} at={140} rot={7}>B2B marketing</Chip>
            <Chip x={130} y={860} at={150} rot={5} bg={C.red} color="#fff">Robots &amp; AI</Chip>
            <Chip x={620} y={940} at={160} rot={-6} bg={C.y}>Tech tourism</Chip>
            <Chip x={330} y={1060} at={170} rot={-3}>Life as a <span style={{fontFamily: BRUSH, color: C.red}}>老外</span></Chip>
          </AbsoluteFill>
        </>
      ) : (
        <>
          <ActionLines color="rgba(25,25,34,.12)" angle={-35} speed={80} seed="a4" />
          {(["ru", "en", "zh"] as const).map((l, i) => (
            <Panel key={l} x={48 + i * 336} y={520} w={312} h={690} poly={[[0, 0.03], [1, 0], [1, 0.97], [0, 1]]} at={182 + i * 6} from={i === 0 ? "left" : i === 1 ? "top" : "right"} bg="#fff">
              <Shot src={im(`${l}-hum-1`)} crop={[40, 250, 900, 1960]} w={312} h={690} zoom={1 + 0.05 * p(f, 182, 267)} />
            </Panel>
          ))}
          {["RU", "EN", "中文"].map((c, i) => (
            <Chip key={c} x={130 + i * 336} y={1180} at={196 + i * 5} rot={i % 2 ? 3 : -3} bg={C.y} size={c === "中文" ? 40 : 38}>
              <span style={{fontFamily: c === "中文" ? FONT.zcool : FONT.dela}}>{c}</span>
            </Chip>
          ))}
          <Narration x={64} y={1310} w={952} at={206} font={FONT.dela} size={44} sh={C.red}>
            Each one — <span style={{color: C.red}}>in three languages</span>
          </Narration>
          <Sfx text="啪!" x={790} y={1400} size={120} color={C.y} at={196} font={FONT.zcool} rot={10} />
        </>
      )}
      <Flash at={180} dur={5} max={0.7} />
    </AbsoluteFill>
  );
};

// ── 5. Финал: портрет-наклейка в линиях концентрации, «Заходи в гости!», адрес печатается, 未完待续 ─────────────
// фото финала: выбор пользователя 03.11.2026 — вариант 3, белый костюм в зале ШОС с жестом «заходи» (`финал-сайт-3.png`);
// прежний портрет с сайта — `{src: CUT, h: 1090, right: -250}`; другие варианты — props `fin`
type FinPhoto = {src: string; h: number; right: number; bottom?: number; origin?: string};
const FIN_DEFAULT: FinPhoto = {src: "source-videos/фото-от-пользователя/остап/вырезки/финал-сайт-3.png", h: 1500, right: -89, bottom: -330};
const Fin: React.FC<{photo: FinPhoto}> = ({photo}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ps = spring({frame: f - 4, fps, config: {damping: 11, stiffness: 200, mass: 0.8}});
  const bub = spring({frame: f - 16, fps, config: {damping: 10, stiffness: 230, mass: 0.6}});
  const url = typed(f, 40, "ostapdotcenko.ru", 2);
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[6, 12, 24], [120, 8, 12]], "fin")}}>
      <Halftone bg={C.y} dot="rgba(25,25,34,.16)" />
      <SpeedLines color={C.ink} opacity={0.75} cx={780} cy={1150} inner={540} seed="c5" />
      <Img
        src={staticFile(photo.src)}
        style={{position: "absolute", right: photo.right, bottom: photo.bottom ?? 0, height: photo.h, scale: String(1.3 - 0.3 * ps), transformOrigin: photo.origin ?? "70% 100%", filter: "drop-shadow(7px 0 0 #fff) drop-shadow(-7px 0 0 #fff) drop-shadow(0 7px 0 #fff) drop-shadow(0 -7px 0 #fff) drop-shadow(16px 16px 0 #15151D)"}}
      />
      {f >= 16 ? (
        <Bubble x={44} y={286} w={640} h={300} shout tail={[600, 330]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
          <div style={dela(70)}>Come</div>
          <div style={dela(70, C.red)}>on in!</div>
          <div style={{fontFamily: BRUSH, fontSize: 52, color: C.ink, marginTop: 4}}>欢迎光临！</div>
        </Bubble>
      ) : null}
      {f >= 40 ? (
        <div style={{position: "absolute", left: 54, top: 618, rotate: "-4deg", background: C.ink, padding: "14px 26px", boxShadow: `12px 12px 0 ${C.red}`}}>
          <span style={{fontFamily: FONT.unb, fontSize: 42, color: C.y}}>{url}</span>
          <span style={{fontFamily: FONT.unb, fontSize: 42, color: C.y, opacity: Math.floor(f / 8) % 2 ? 1 : 0}}>▌</span>
        </div>
      ) : null}
      <Chip x={70} y={735} at={80} rot={2}>RU · EN · <span style={{fontFamily: FONT.zcool}}>中文</span></Chip>
      <Chip x={70} y={830} at={92} rot={-2} bg={C.red} color="#fff">A new chapter every day</Chip>
      {f >= 120 ? (
        <>
          <div style={{position: "absolute", left: 60, top: 1290, fontFamily: FONT.zcool, fontSize: 116, color: C.ink, textShadow: `8px 8px 0 #fff`, scale: String(1.5 - 0.5 * spring({frame: f - 120, fps, config: {damping: 10, stiffness: 260}})), transformOrigin: "0 50%"}}>未完待续…</div>
          <div style={{position: "absolute", left: 66, top: 1440, fontFamily: FONT.hand, fontSize: 50, color: C.red, opacity: p(f, 130, 138)}}>to be continued — on the site →</div>
        </>
      ) : null}
      <Letterbox h={130 * p(f, 150, 172, EIO)} />
    </AbsoluteFill>
  );
};

// звуки по сценам: [кадр сцены, файл, громкость] → глобальные кадры через T
// звуки v2 (03.11.2026: «больше разных звуков»): "@имя" — библиотека интернет-материалы/звуки/ (CC0 / CC BY), "@zvukitop/zt-…" — zvukitop.com
const SC: Record<keyof typeof T, [number, string, number][]> = {
  cold: [[0, "@impact-3", 0.5], [7, "@impact-3", 0.45], [13, "@impact-3", 0.45], [19, "@boom-1", 0.55], [28, "@pop-2", 0.45], [36, "@impact-2", 0.55], [36, "@zvukitop/zt-slap", 0.4], [40, "@zvukitop/zt-wrong", 0.25], [64, "@whoosh-4", 0.6], [66, "@impact-1", 0.5], [70, "@whoosh-3", 0.4], [84, "@shutter-1", 0.5], [92, "@ding-2", 0.25]],
  ch1: [[0, "@flip-1", 0.6], [18, "@swipe-1", 0.4], [48, "@whoosh-2", 0.4], [78, "@boom-1", 0.35], [104, "@click-1", 0.5], [116, "@click-2", 0.5], [128, "@whoosh-3", 0.45]],
  ch2: [[0, "@whoosh-1", 0.5], [6, "@sweep-1", 0.35], [24, "@impact-3", 0.45], [58, "@impact-4", 0.4], [92, "@impact-3", 0.4], [126, "@impact-1", 0.45], [30, "@coin-1", 0.3], [64, "@pop-1", 0.3], [98, "@coin-2", 0.3], [132, "@cash-1", 0.35]],
  ch3: [[0, "@glitch-1", 0.5], [28, "@beep-1", 0.5], [28, "@whoosh-3", 0.3], [54, "@beep-1", 0.5], [54, "@whoosh-3", 0.3], [80, "@beep-1", 0.5], [80, "@whoosh-3", 0.3], [104, "@success-1", 0.35], [116, "@whoosh-4", 0.5], [144, "@click-1", 0.5], [150, "@glitch-2", 0.45], [176, "@click-1", 0.5], [182, "@glitch-3", 0.45], [212, "@swipe-1", 0.45], [218, "@swipe-1", 0.4], [224, "@swipe-1", 0.4]],
  ch4: [[0, "@flip-1", 0.6], [27, "@flip-1", 0.28], [34, "@flip-1", 0.28], [41, "@flip-1", 0.28], [48, "@flip-1", 0.28], [55, "@flip-1", 0.28], [62, "@flip-1", 0.28], [80, "@whoosh-2", 0.4], [104, "@zvukitop/zt-cinema-hit", 0.4],
    [130, "@typing-1", 0.35], [150, "@shutter-1", 0.3], [170, "@shutter-1", 0.3], [180, "@whoosh-4", 0.5], [182, "@pop-1", 0.4], [188, "@pop-1", 0.4], [194, "@pop-2", 0.4]],
  fin: [[0, "@whoosh-4", 0.5], [6, "@impact-2", 0.5], [16, "@pop-2", 0.45], [40, "@typing-1", 0.4], [80, "@pop-1", 0.5], [92, "@pop-1", 0.5], [120, "@ding-3", 0.4], [124, "@cheer-1", 0.25], [150, "@whoosh-2", 0.3]],
};
const sfxSrc = (n: string) => (n.startsWith("@") ? `интернет-материалы/звуки/${n.slice(1)}.wav` : `${SFXP}${n}.wav`);
const SOUNDS: [number, string, number][] = (Object.keys(SC) as (keyof typeof T)[]).flatMap((k) => SC[k].map(([at, n, v]) => [T[k][0] + at, n, v] as [number, string, number]));

export const SiteManhuaEn: React.FC<{fin?: FinPhoto}> = ({fin}) => {
  useBrush(true);
  const {fps} = useVideoConfig();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.ink, overflow: "hidden"}}>
      <Sequence from={T.cold[0]} durationInFrames={T.cold[1] - T.cold[0]} premountFor={fps}><Cold /></Sequence>
      <Sequence from={T.ch1[0]} durationInFrames={T.ch1[1] - T.ch1[0]} premountFor={fps}><InkReveal dur={12} id="a" x={540} y={1060}><Ch1 /></InkReveal></Sequence>
      <Sequence from={T.ch2[0]} durationInFrames={T.ch2[1] - T.ch2[0]} premountFor={fps}><SlashReveal dur={12}><Ch2 /></SlashReveal></Sequence>
      <Sequence from={T.ch3[0]} durationInFrames={T.ch3[1] - T.ch3[0]} premountFor={fps}><GlitchReveal dur={12}><Ch3 /></GlitchReveal></Sequence>
      <Sequence from={T.ch4[0]} durationInFrames={T.ch4[1] - T.ch4[0]} premountFor={fps}><PageReveal dur={14}><Ch4 /></PageReveal></Sequence>
      <Sequence from={T.fin[0]} durationInFrames={T.fin[1] - T.fin[0]} premountFor={fps}><CircleReveal dur={12} x={780} y={1150}><Fin photo={fin ?? FIN_DEFAULT} /></CircleReveal></Sequence>
      <div style={{position: "absolute", right: 64, top: 262, width: 84, height: 84, background: C.seal, color: "#fff", fontFamily: BRUSH, fontSize: 64, lineHeight: "84px", textAlign: "center", borderRadius: 10, boxShadow: "0 0 0 5px #fff", rotate: "-4deg", opacity: f < 66 ? 0 : 1}}>多</div>
      <Grain opacity={0.14} />
      <Vignette strength={0.35} />
      <Audio
        src={staticFile(MUSIC)}
        trimBefore={Math.round(63.5 * fps)}
        volume={(x) => interpolate(x, [0, 6, 905, 917, 1041, 1049, SITE_MANHUA_EN_FRAMES - 45, SITE_MANHUA_EN_FRAMES - 1], [0, 0.38, 0.38, 0.55, 0.55, 0.38, 0.38, 0], CL)}
      />
      {SOUNDS.map(([at, name, vol], i) => (
        <Sequence key={i} from={at} durationInFrames={Math.round(4.5 * fps)} premountFor={fps}>
          <Audio src={staticFile(sfxSrc(name))} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// проверка без полного рендера: кадр N предпросмотра = кадр start + N × step ролика
// (npx remotion render … SiteManhuaEnPreview <папка> --sequence --frames=0-38; длина та же, что у ролика, иначе Freeze упирается в конец)
export const SiteManhuaEnPreview: React.FC<{step: number; start: number; fin?: FinPhoto; fins?: FinPhoto[]}> = ({step, start, fin, fins}) => {
  const f = useCurrentFrame();
  // fins — варианты фото финала: кадр N = кадр `start` ролика с фото fins[N] (лист для выбора, 03.11.2026)
  const photo = fins ? fins[Math.min(f, fins.length - 1)] : fin;
  return (
    <Freeze frame={Math.min(SITE_MANHUA_EN_FRAMES - 1, fins ? start : start + f * step)}>
      <SiteManhuaEn fin={photo} />
    </Freeze>
  );
};
