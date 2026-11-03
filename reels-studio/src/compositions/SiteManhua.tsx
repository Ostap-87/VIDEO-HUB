// «Мой сайт» v2 — манхуа-трейлер ostapdotcenko.ru для личного профиля @ostap.dotsenko (03.11.2026: «более креативный вариант,
// чтобы отличался от того, что ты делал ранее… Remotion, больше спецэффектов и шрифтов, стиль маньхуа, моушн-дизайн, переходы
// и хуки, элементы графики… кинематографично и очень завлекающе»). 1080×1920, 30 к/с, 39 с.
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

export const SITE_MANHUA_FRAMES = 1170;
const IMG = "source-videos/ostapdotcenko/site/2026-11-03-сайт/";
const SFXP = "source-videos/2026-11-03-od-sait-manhua/sfx/";
const MUSIC = "интернет-материалы/музыка/inspiring-technology-soundrider.mp3";
const CUT = "source-videos/фото-от-пользователя/остап/вырезки/ostap-portret-sait.png";
const im = (n: string) => `${IMG}${n}.jpg`;

// сцены (глобальные кадры): каждая следующая открывается поверх предыдущей за 12–14 кадров
const T = {cold: [0, 120], ch1: [108, 330], ch2: [318, 495], ch3: [483, 735], ch4: [723, 990], fin: [978, 1170]} as const;

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

// ── 0. Холодное открытие: «У МЕНЯ ЕСТЬ САЙТ.» ударами → облачко → дроп: телефон влетает в кадр ───────────────
const Cold: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const drop = f >= 66;
  const words: [string, number, number][] = [["У МЕНЯ", 0, 600], ["ЕСТЬ", 9, 780], ["САЙТ.", 18, 960]];
  const ph = spring({frame: f - 66, fps, config: {damping: 14, stiffness: 120, mass: 0.9}});
  const bub = spring({frame: f - 30, fps, config: {damping: 10, stiffness: 220, mass: 0.6}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[9, 8, 16], [18, 12, 30], [66, 12, 26], [84, 6, 10]], "cold")}}>
      {!drop ? (
        <>
          <AbsoluteFill style={{background: C.ink}} />
          <SpeedLines color="#fff" opacity={0.8} inner={430} cy={820} seed="c0" />
          {words.map(([t, at, y]) => {
            const s = at === 0 ? 1 : spring({frame: f - at, fps, config: {damping: 11, stiffness: 300, mass: 0.6}});
            return f >= at ? (
              <div key={t} style={{position: "absolute", left: 0, right: 0, top: y, textAlign: "center", ...dela(168, "#fff", {textShadow: `12px 12px 0 ${C.red}`}), scale: String(1.9 - 0.9 * s)}}>{t}</div>
            ) : null;
          })}
          <Sfx text="咚!" x={760} y={1120} size={120} color={C.y} at={18} font={FONT.zcool} rot={10} />
          {f >= 30 ? (
            <Bubble x={90} y={1200} w={900} h={330} shout tail={[700, -40]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
              <div style={dela(56)}>Сейчас покажу —</div>
              <div style={dela(56, C.red)}>как в манхуа!</div>
              <div style={{fontFamily: BRUSH, fontSize: 52, color: C.ink, marginTop: 6}}>像漫画一样</div>
            </Bubble>
          ) : null}
          <Sfx text="哇!" x={720} y={330} size={130} color={C.y} at={34} font={FONT.zcool} rot={-12} until={66} />
        </>
      ) : (
        <>
          <Halftone bg={C.y} dot="rgba(25,25,34,.16)" />
          <SpeedLines color={C.ink} opacity={0.85} inner={560} cy={1060} seed="c1" />
          <div style={{position: "absolute", left: 64, top: 270, fontFamily: FONT.mono, fontSize: 30, letterSpacing: "0.16em", color: C.ink}}>ОСТАП ДОЦЕНКО · 多增科</div>
          {[["МОЙ", 70, 320], ["САЙТ", 76, 470]].map(([t, at, y]) => {
            const s = spring({frame: f - (at as number), fps, config: {damping: 11, stiffness: 300, mass: 0.6}});
            return f >= (at as number) ? <div key={t as string} style={{position: "absolute", left: 60, top: y as number, ...dela(150, C.ink, {textShadow: `10px 10px 0 ${C.red}`}), scale: String(1.8 - 0.8 * s), transformOrigin: "0 50%"}}>{t}</div> : null;
          })}
          <AbsoluteFill style={{perspective: 1800}}>
            <div style={{position: "absolute", left: 470, top: 560, transformStyle: "preserve-3d", transform: `translateY(${(1 - ph) * 1300}px) rotateX(${(1 - ph) * 65 + 6}deg) rotateY(${-34 + ph * 22}deg) rotateZ(${(1 - ph) * -20 + 4}deg) scale(${0.75 + 0.25 * ph})`}}>
              <Phone w={470} imgs={[im("ru-00-top")]} mode="swap" glareAt={92} />
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
        <ChapterHead zh="第一话" no="ГЛАВА 1" title="Кто он такой" />
        <Panel x={48} y={470} w={984} h={330} poly={[[0, 0], [1, 0], [1, 0.86], [0, 1]]} at={18} from="left">
          <Shot src={im("ru-00-top")} crop={[0, 330, 975, 380]} w={984} h={330} zoom={z(18, 222)} />
        </Panel>
        <Narration x={600} y={492} at={28} font={FONT.oswald} size={30} rot={2}>РОССИЯ ↔ КИТАЙ ↔ ЮВА</Narration>
        <Panel x={48} y={826} w={500} h={500} poly={[[0, 0.1], [1, 0], [1, 1], [0, 1]]} at={48} from="bottom">
          <Shot src={im("ru-01-about")} crop={[90, 240, 800, 900]} w={500} h={500} zoom={z(48, 222)} />
        </Panel>
        {f >= 62 ? (
          <Bubble x={56} y={1170} w={500} h={200} tail={[300, -30]} scale={spring({frame: f - 62, fps: 30, config: {damping: 10, stiffness: 240}})}>
            <div style={dela(32)}>Стратег. Лидер.</div>
            <div style={dela(32, C.red)}>Строитель мостов.</div>
          </Bubble>
        ) : null}
        <Panel x={570} y={800} w={462} h={526} poly={[[0, 0.06], [1, 0], [1, 1], [0, 1]]} at={78} bg={C.ink}>
          <SpeedLines color="rgba(255,217,46,.35)" cx={231} cy={250} inner={150} n={70} seed="p3" />
          <Burst x={231} y={240} r={165} color={C.y} rot={f * 0.8} seed="b1" />
          <div style={{position: "absolute", left: 0, right: 0, top: 168, textAlign: "center", ...dela(140, C.ink, {WebkitTextStroke: "5px #fff", paintOrder: "stroke fill"})}}>{countText(f, 80, 22, 13, "", "+")}</div>
          <div style={{position: "absolute", left: 0, right: 0, top: 362, textAlign: "center", ...dela(30, "#fff")}}>лет между рынками</div>
          <Chip x={40} y={430} at={104} rot={-3} size={30}>20+ стран</Chip>
          <Chip x={250} y={440} at={116} rot={3} size={30} bg={C.y}>5 языков</Chip>
        </Panel>
        <Sfx text="咚!" x={850} y={760} size={110} color={C.red} stroke="#fff" at={86} font={FONT.zcool} rot={14} />
        <Panel x={48} y={1340} w={984} h={200} poly={[[0, 0], [1, 0.12], [1, 1], [0, 1]]} at={128} bg={C.red} from="right">
          <ActionLines color="rgba(25,25,34,.55)" speed={-90} seed="p4" />
          <div style={{position: "absolute", left: 40, top: 26, background: C.y, border: `4px solid ${C.ink}`, padding: "4px 12px", fontFamily: FONT.mono, fontSize: 22, color: C.ink}}>КАРЬЕРА</div>
          <div style={{position: "absolute", left: 40, top: 70, translate: `${(1 - p(f, 132, 146, EO)) * 500}px 0`, ...dela(44, "#fff", {WebkitTextStroke: `2px ${C.ink}`})}}>
            Alibaba → Сбер →<br />свои проекты
          </div>
        </Panel>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 2. Глава 2 «Цифры»: +350% во взрыве, $48M и 3 млрд ₽ панелями, «8 кейсов» с телефоном ─────────────────────
const Ch2: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bs = spring({frame: f - 8, fps, config: {damping: 10, stiffness: 160, mass: 0.8}});
  const hit = spring({frame: f - 38, fps, config: {damping: 9, stiffness: 300, mass: 0.5}});
  const counting = p(f, 10, 38);
  const out = p(f, 112, 120, EIO);
  const part3 = f >= 116;
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[38, 14, 30], [70, 6, 10], [80, 6, 10], [118, 8, 16]], "ch2")}}>
      <Halftone bg={C.red} dot="rgba(25,25,34,.22)" />
      <SpeedLines color={C.ink} opacity={0.55} cy={820} inner={420} seed="c2" />
      <div style={{position: "absolute", left: 64, top: 270, display: "flex", alignItems: "baseline", gap: 18, opacity: p(f, 2, 10), translate: `${(1 - p(f, 2, 12, EO)) * -140}px 0`}}>
        <span style={{fontFamily: FONT.zcool, fontSize: 70, color: C.y}}>第二话</span>
        <span style={dela(46, "#fff")}>{part3 ? "Кейсы" : "Цифры"}</span>
      </div>
      <AbsoluteFill style={{opacity: 1 - out, scale: String(1 - 0.2 * out)}}>
        <Burst x={540} y={800} r={390} color={C.y} rot={f * 0.5} scale={0.2 + 0.8 * bs} seed="b2" sw={12} />
        <div style={{position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", ...dela(176, C.ink, {WebkitTextStroke: "4px #fff", paintOrder: "stroke fill"}), filter: `blur(${(counting < 1 && counting > 0 ? 5 : 0).toFixed(0)}px)`, scale: String(f >= 38 ? 1.25 - 0.25 * hit : 1)}}>
          {countText(f, 10, 28, 350, "+", "%")}
        </div>
        <Narration x={150} y={1090} w={780} at={42} font={FONT.golos} size={36} sh={C.ink}>
          <span style={{fontWeight: 800}}>рост продавцов Мегамаркета за год</span>
        </Narration>
        <Sfx text="轰!" x={770} y={430} size={140} color="#fff" at={38} font={FONT.zcool} rot={12} />
        <Panel x={40} y={1240} w={490} h={250} poly={[[0, 0.1], [1, 0], [0.94, 1], [0, 1]]} at={70} bg={C.ink} from="left">
          <div style={{position: "absolute", left: 34, top: 40, ...dela(96, C.y)}}>$48M</div>
          <div style={{position: "absolute", left: 38, top: 150, fontFamily: FONT.golos, fontWeight: 800, fontSize: 30, lineHeight: 1.15, color: "#fff"}}>GMV AliExpress<br />Россия и СНГ</div>
        </Panel>
        <Panel x={540} y={1250} w={500} h={240} poly={[[0.06, 0], [1, 0.08], [1, 1], [0, 1]]} at={80} bg={C.paper} from="right">
          <div style={{position: "absolute", left: 60, top: 36, ...dela(84, C.ink)}}>3 млрд ₽</div>
          <div style={{position: "absolute", left: 64, top: 140, fontFamily: FONT.golos, fontWeight: 800, fontSize: 30, lineHeight: 1.15, color: C.ink}}>чистой прибыли<br />Q4 2023</div>
        </Panel>
      </AbsoluteFill>
      {part3 ? (
        <>
          <div style={{position: "absolute", left: 40, top: 430, ...dela(380, C.y, {WebkitTextStroke: `8px ${C.ink}`, paintOrder: "stroke fill", textShadow: `14px 14px 0 ${C.ink}`}), scale: String(1.6 - 0.6 * spring({frame: f - 118, fps, config: {damping: 10, stiffness: 260}}))}}>8</div>
          <div style={{position: "absolute", left: 64, top: 860, width: 470, ...dela(54, "#fff", {WebkitTextStroke: `2px ${C.ink}`}), opacity: p(f, 124, 132)}}>кейсов, которыми горжусь</div>
          <Narration x={64} y={1080} w={460} at={134} font={FONT.golos} size={28} sh={C.ink}>
            <b>Сбер × Минэкономразвития</b> · «Мегасреда» · <b>AliExpress O2O</b> · «Сделано в России»…
          </Narration>
          <div style={{position: "absolute", left: 580, top: 540, rotate: "5deg", translate: `${(1 - spring({frame: f - 120, fps, config: {damping: 14, stiffness: 140}})) * 700}px 0`}}>
            <Phone w={430} imgs={[im("ru-04-projects")]} header={im("ru-00-top")} glareAt={140} />
          </div>
        </>
      ) : null}
      <Flash at={116} dur={5} max={0.7} />
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
  const sel = f < 36 ? -1 : f < 56 ? 0 : f < 76 ? 1 : 2;
  const cardsOut = p(f, 108, 118, EIO);
  const phoneIn = spring({frame: f - 112, fps, config: {damping: 14, stiffness: 130}});
  const lang = f < 146 ? 0 : f < 178 ? 1 : 2;
  const gl = Math.max(f >= 146 && f < 156 ? 1 - (f - 146) / 10 : 0, f >= 178 && f < 188 ? 1 - (f - 178) / 10 : 0, f >= 112 && f < 120 ? 1 - (f - 112) / 8 : 0);
  const vs = f >= 204;
  return (
    <AbsoluteFill style={{background: C.ink, translate: sumShake(f, [[36, 5, 8], [56, 5, 8], [76, 5, 8], [146, 8, 14], [178, 8, 14], [204, 6, 12], [210, 6, 12], [216, 6, 12]], "ch3")}}>
      <AbsoluteFill style={{backgroundImage: "linear-gradient(rgba(255,217,46,.07) 2px, transparent 2px), linear-gradient(90deg, rgba(255,217,46,.07) 2px, transparent 2px)", backgroundSize: "60px 60px", backgroundPosition: `0 ${f * 2}px`}} />
      <div style={{position: "absolute", left: 64, top: 270, display: "flex", alignItems: "baseline", gap: 16}}>
        <span style={{fontFamily: FONT.zcool, fontSize: 58, color: C.y}}>第三话</span>
        <span style={{fontFamily: FONT.oswald, fontSize: 34, letterSpacing: "0.16em", color: "#fff"}}>ТРИ ЯЗЫКА</span>
      </div>
      {f < 120 ? (
        <AbsoluteFill style={{opacity: 1 - cardsOut, translate: `0 ${-cardsOut * 200}px`}}>
          <div style={{position: "absolute", left: 64, top: 370, fontFamily: FONT.pixel, fontSize: 50, color: C.y, opacity: f > 20 && Math.floor(f / 8) % 2 === 1 && sel < 0 ? 0.25 : 1}}>ВЫБЕРИ ЯЗЫК</div>
          <div style={{position: "absolute", left: 64, top: 448, fontFamily: FONT.zcool, fontSize: 52, color: C.red}}>选择语言</div>
          {LANGS.map((l, i) => {
            const s = spring({frame: f - (8 + i * 6), fps, config: {damping: 13, stiffness: 200}});
            const on = sel === i;
            return (
              <div key={l.code} style={{position: "absolute", left: 64 + i * 326, top: 570, width: 300, translate: `0 ${(1 - s) * 900}px`, scale: String(on ? 1.07 : 1), filter: sel >= 0 && !on ? "brightness(.5) grayscale(.6)" : "none"}}>
                <div style={{position: "relative", width: 300, height: 500, border: `6px solid ${on ? C.red : C.y}`, overflow: "hidden", background: C.bone, boxShadow: on ? `0 0 0 6px ${C.y}, 12px 12px 0 ${C.red}` : "10px 10px 0 rgba(0,0,0,.4)"}}>
                  <Shot src={im(`${l.img}-01-about`)} crop={[0, 200, 975, 1760]} w={288} h={488} />
                </div>
                <div style={{marginTop: 16, textAlign: "center", fontFamily: l.code === "中文" ? FONT.zcool : FONT.pixel, fontSize: l.code === "中文" ? 48 : 34, color: on ? C.y : "#fff"}}>{l.code}</div>
                {on ? <div style={{position: "absolute", left: 104, top: -66, fontFamily: FONT.pixel, fontSize: 24, color: C.ink, background: C.red, padding: "8px 10px", border: `4px solid ${C.ink}`}}>1P▼</div> : null}
              </div>
            );
          })}
          {f >= 90 ? (
            <div style={{position: "absolute", left: 0, right: 0, top: 1240, textAlign: "center", opacity: Math.floor(f / 4) % 2 ? 1 : 0.6}}>
              <span style={{fontFamily: FONT.pixel, fontSize: 60, color: "#fff"}}>READY?</span>
              <span style={{fontFamily: FONT.zcool, fontSize: 70, color: C.y, marginLeft: 22}}>准备！</span>
            </div>
          ) : null}
        </AbsoluteFill>
      ) : null}
      {f >= 112 && !vs ? (
        <>
          <div style={{position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", ...dela(560, "transparent", {WebkitTextStroke: `6px ${C.y}`}), opacity: 0.22}}>{lang === 2 ? "中" : LANGS[lang].code}</div>
          <GlitchText amount={gl} seed="hero" style={{position: "absolute", left: 40, right: 40, top: 372, textAlign: "center", ...(lang === 2 ? {fontFamily: FONT.zcool, fontSize: 104, color: "#fff"} : dela(84, "#fff")), lineHeight: 1.1}}>
            {LANGS[lang].hero}
          </GlitchText>
          <AbsoluteFill style={{perspective: 1800}}>
            <div style={{position: "absolute", left: 340, top: 600, transform: `translateY(${(1 - phoneIn) * 1200}px) rotateY(${-14 + 6 * Math.sin(f / 30)}deg) rotateX(6deg)`}}>
              <Phone w={400} imgs={[im("ru-00-top"), im("en-00-top"), im("zh-00-top")]} mode="swap" keys={[[0, 0], [146, 1], [178, 2]]} tapAt={[[140, 653, 85], [172, 746, 85]]} glitchAt={[146, 178]} />
            </div>
          </AbsoluteFill>
          <div style={{position: "absolute", left: 0, right: 0, top: 492, display: "flex", gap: 14, justifyContent: "center"}}>
            {LANGS.map((l, i) => (
              <div key={l.code} style={{padding: "10px 22px", border: `5px solid ${C.y}`, background: lang === i ? C.y : "transparent", color: lang === i ? C.ink : C.y, fontFamily: l.code === "中文" ? FONT.zcool : FONT.pixel, fontSize: l.code === "中文" ? 44 : 30}}>{l.code}</div>
            ))}
          </div>
        </>
      ) : null}
      {vs ? (
        <>
          <ActionLines color="rgba(255,217,46,.25)" angle={-60} speed={90} seed="vs" />
          {LANGS.map((l, i) => (
            <Panel key={l.code} x={-10 + i * 345} y={470} w={420} h={820} poly={[[0.12, 0], [1, 0], [0.88, 1], [0, 1]]} at={204 + i * 6} from={i === 1 ? "top" : "bottom"} bg={C.bone}>
              <Shot src={im(`${l.img}-00-top`)} crop={[0, 300, 540, 1050]} w={420} h={820} zoom={1 + 0.06 * p(f, 204, 252)} />
            </Panel>
          ))}
          {LANGS.map((l, i) => (
            <Chip key={l.code} x={120 + i * 345} y={1300} at={214 + i * 6} rot={i % 2 ? 3 : -3} bg={C.y} size={l.code === "中文" ? 40 : 38}>{l.code}</Chip>
          ))}
          <Narration x={64} y={1420} w={952} at={226} font={FONT.golos} size={32} sh={C.red}>
            <b>Весь сайт — по-русски, по-английски и по-китайски</b>
          </Narration>
          <Sfx text="啪!" x={770} y={1160} size={130} color={C.y} at={216} font={FONT.zcool} rot={-8} />
        </>
      ) : null}
      <AbsoluteFill style={{background: "repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 2px, transparent 2px 5px)", pointerEvents: "none"}} />
      <Flash at={112} dur={4} max={0.5} />
      <Flash at={204} dur={5} max={0.6} />
    </AbsoluteFill>
  );
};

// ── 4. Глава 4 «Блог»: отрывной календарь по дням с настоящими статьями, 45 статей, наклейки тем, статья на 3 языках ─
const DAYS: [string, string, string][] = [
  ["28", "ОКТЯБРЬ", "Город, где не носят кошелёк"],
  ["29", "ОКТЯБРЬ", "Хлеба и роботов"],
  ["30", "ОКТЯБРЬ", "Робот на душу населения"],
  ["31", "ОКТЯБРЬ", "Япония — родина гуманоидов"],
  ["1", "НОЯБРЬ", "Шеф, свободен?"],
  ["2", "НОЯБРЬ", "Ни ног, ни чаевых"],
  ["3", "НОЯБРЬ", "Кофе с привкусом протокола"],
];
const CalPage: React.FC<{d: [string, string, string]}> = ({d}) => (
  <div style={{position: "absolute", inset: 0, background: "#fff", border: `6px solid ${C.ink}`}}>
    <div style={{height: 78, background: C.red, color: "#fff", fontFamily: FONT.oswald, fontSize: 40, letterSpacing: "0.16em", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `6px solid ${C.ink}`}}>{d[1]}</div>
    <div style={{textAlign: "center", ...dela(200, C.ink), marginTop: 20}}>{d[0]}</div>
    <div style={{position: "absolute", left: 0, right: 0, bottom: 22, textAlign: "center", fontFamily: FONT.mono, fontSize: 22, color: C.red}}>НОВАЯ СТАТЬЯ</div>
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
      <ChapterHead zh="第四话" no="ГЛАВА 4" title="Блог" />
      <div style={{position: "absolute", left: 420, top: 410, fontFamily: FONT.hand, fontSize: 50, color: C.red, rotate: "-3deg", opacity: p(f, 10, 18)}}>новая глава — каждый день!</div>
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
            <div style={{fontFamily: FONT.mono, fontSize: 22, color: C.red, letterSpacing: "0.12em"}}>СТАТЬЯ ДНЯ</div>
            <div style={{marginTop: 8, background: "#fff", border: `5px solid ${C.ink}`, padding: "12px 16px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 32, color: C.ink, boxShadow: `8px 8px 0 ${C.y}`}}>{DAYS[idx][2]}</div>
          </div>
          <div style={{position: "absolute", left: 566, top: 520, rotate: "4deg", translate: `${(1 - spring({frame: f - 6, fps, config: {damping: 14, stiffness: 140}})) * 700}px 0`}}>
            <Phone w={450} imgs={[im("ru-blog-3"), im("ru-blog-4")]} header={im("ru-00-top")} keys={[[0, 0], [70, 1]]} />
          </div>
          {f >= 80 ? (
            <>
              <Burst x={250} y={1320} r={160} color={C.y} rot={f * 0.7} scale={spring({frame: f - 80, fps, config: {damping: 10, stiffness: 200}})} seed="b4" />
              <div style={{position: "absolute", left: 90, top: 1225, width: 320, textAlign: "center", ...dela(190, C.ink), scale: String(f >= 104 ? 1.2 - 0.2 * spring({frame: f - 104, fps, config: {damping: 8, stiffness: 300}}) : 1)}}>{countText(f, 80, 24, 45)}</div>
              <div style={{position: "absolute", left: 470, top: 1250, ...dela(60, C.ink), opacity: p(f, 90, 98)}}>статей</div>
              <div style={{position: "absolute", left: 474, top: 1330, fontFamily: FONT.hand, fontSize: 46, color: C.red, opacity: p(f, 100, 108)}}>и каждый день — новая</div>
              <HandArrow x={830} y={1250} w={160} h={90} at={104} d="M10,80 C50,60 90,40 140,10 M140,10 L100,14 M140,10 L128,48" />
            </>
          ) : null}
          <AbsoluteFill style={{opacity: 1 - stickersOut}}>
            <Chip x={90} y={600} at={130} rot={-9} bg={C.y}>Китай и ЮВА</Chip>
            <Chip x={590} y={680} at={140} rot={7}>B2B-маркетинг</Chip>
            <Chip x={130} y={860} at={150} rot={5} bg={C.red} color="#fff">Роботы и ИИ</Chip>
            <Chip x={620} y={940} at={160} rot={-6} bg={C.y}>Техтуризм</Chip>
            <Chip x={330} y={1060} at={170} rot={-3}>Жизнь <span style={{fontFamily: BRUSH, color: C.red}}>老外</span></Chip>
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
            И каждая — сразу <span style={{color: C.red}}>на трёх языках</span>
          </Narration>
          <Sfx text="啪!" x={790} y={1400} size={120} color={C.y} at={196} font={FONT.zcool} rot={10} />
        </>
      )}
      <Flash at={180} dur={5} max={0.7} />
    </AbsoluteFill>
  );
};

// ── 5. Финал: портрет-наклейка в линиях концентрации, «Заходи в гости!», адрес печатается, 未完待续 ─────────────
const Fin: React.FC = () => {
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
        src={staticFile(CUT)}
        style={{position: "absolute", right: -190, bottom: 0, height: 1180, scale: String(1.3 - 0.3 * ps), transformOrigin: "70% 100%", filter: "drop-shadow(7px 0 0 #fff) drop-shadow(-7px 0 0 #fff) drop-shadow(0 7px 0 #fff) drop-shadow(0 -7px 0 #fff) drop-shadow(16px 16px 0 #15151D)"}}
      />
      {f >= 16 ? (
        <Bubble x={44} y={300} w={660} h={340} shout tail={[620, 360]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)}>
          <div style={dela(70)}>Заходи</div>
          <div style={dela(70, C.red)}>в гости!</div>
          <div style={{fontFamily: BRUSH, fontSize: 52, color: C.ink, marginTop: 4}}>欢迎光临！</div>
        </Bubble>
      ) : null}
      {f >= 40 ? (
        <div style={{position: "absolute", left: 54, top: 700, rotate: "-4deg", background: C.ink, padding: "18px 30px", boxShadow: `12px 12px 0 ${C.red}`}}>
          <span style={{fontFamily: FONT.unb, fontSize: 50, color: C.y}}>{url}</span>
          <span style={{fontFamily: FONT.unb, fontSize: 50, color: C.y, opacity: Math.floor(f / 8) % 2 ? 1 : 0}}>▌</span>
        </div>
      ) : null}
      <Chip x={70} y={850} at={80} rot={2}>RU · EN · <span style={{fontFamily: FONT.zcool}}>中文</span></Chip>
      <Chip x={70} y={950} at={92} rot={-2} bg={C.red} color="#fff">Новая глава — каждый день</Chip>
      {f >= 120 ? (
        <>
          <div style={{position: "absolute", left: 60, top: 1290, fontFamily: FONT.zcool, fontSize: 116, color: C.ink, textShadow: `8px 8px 0 #fff`, scale: String(1.5 - 0.5 * spring({frame: f - 120, fps, config: {damping: 10, stiffness: 260}})), transformOrigin: "0 50%"}}>未完待续…</div>
          <div style={{position: "absolute", left: 66, top: 1440, fontFamily: FONT.hand, fontSize: 50, color: C.red, opacity: p(f, 130, 138)}}>продолжение — на сайте →</div>
        </>
      ) : null}
      <Letterbox h={130 * p(f, 150, 172, EIO)} />
    </AbsoluteFill>
  );
};

// звуки: [кадр, файл, громкость]
const SOUNDS: [number, string, number][] = [
  [0, "whip", 0.5], [9, "whip", 0.5], [18, "vine-boom", 0.45], [30, "whoosh", 0.4], [34, "anime-wow", 0.22], [64, "whoosh", 0.6], [70, "whip", 0.35], [76, "whip", 0.35], [84, "shutter-modern", 0.5], [92, "ding", 0.18],
  [108, "page-turn", 0.6], [126, "whip", 0.4], [156, "whoosh", 0.4], [186, "vine-boom", 0.3], [212, "mouse-click", 0.5], [224, "mouse-click", 0.5], [236, "whoosh", 0.45],
  [318, "whip", 0.5], [326, "whoosh", 0.4], [356, "vine-boom", 0.5], [388, "whoosh", 0.45], [398, "whoosh", 0.45], [434, "whip", 0.45], [436, "shutter-modern", 0.35],
  [483, "whip", 0.5], [519, "switch", 0.6], [539, "switch", 0.6], [559, "switch", 0.6], [573, "ding", 0.25], [595, "whoosh", 0.5], [623, "mouse-click", 0.5], [629, "whip", 0.4], [655, "mouse-click", 0.5], [661, "whip", 0.4],
  [687, "whoosh", 0.45], [693, "whoosh", 0.45], [699, "whoosh", 0.45],
  [723, "page-turn", 0.6], [750, "page-turn", 0.25], [757, "page-turn", 0.25], [764, "page-turn", 0.25], [771, "page-turn", 0.25], [778, "page-turn", 0.25], [785, "page-turn", 0.25],
  [803, "whoosh", 0.4], [827, "vine-boom", 0.35], [853, "shutter-modern", 0.35], [863, "shutter-modern", 0.35], [873, "shutter-modern", 0.35], [883, "shutter-modern", 0.35], [893, "shutter-modern", 0.35],
  [903, "whoosh", 0.5], [905, "whip", 0.4], [911, "whip", 0.4], [917, "whip", 0.4],
  [978, "whoosh", 0.5], [984, "vine-boom", 0.45], [994, "whip", 0.4], [1018, "mouse-click", 0.3], [1024, "mouse-click", 0.3], [1030, "mouse-click", 0.3], [1036, "mouse-click", 0.3], [1042, "mouse-click", 0.3], [1048, "mouse-click", 0.3],
  [1058, "switch", 0.5], [1070, "switch", 0.5], [1098, "ding", 0.3], [1128, "whoosh", 0.3],
];

export const SiteManhua: React.FC = () => {
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
      <Sequence from={T.fin[0]} durationInFrames={T.fin[1] - T.fin[0]} premountFor={fps}><CircleReveal dur={12} x={780} y={1150}><Fin /></CircleReveal></Sequence>
      <div style={{position: "absolute", right: 64, top: 262, width: 84, height: 84, background: C.seal, color: "#fff", fontFamily: BRUSH, fontSize: 64, lineHeight: "84px", textAlign: "center", borderRadius: 10, boxShadow: "0 0 0 5px #fff", rotate: "-4deg", opacity: f < 66 ? 0 : 1}}>多</div>
      <Grain opacity={0.14} />
      <Vignette strength={0.35} />
      <Audio
        src={staticFile(MUSIC)}
        trimBefore={Math.round(12.6 * fps)}
        volume={(x) => interpolate(x, [0, 6, SITE_MANHUA_FRAMES - 45, SITE_MANHUA_FRAMES - 1], [0, 0.5, 0.5, 0], CL)}
      />
      {SOUNDS.map(([at, name, vol], i) => (
        <Sequence key={i} from={at} durationInFrames={Math.round(4.5 * fps)} premountFor={fps}>
          <Audio src={staticFile(`${SFXP}${name}.wav`)} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// проверка без полного рендера: кадр N предпросмотра = кадр start + N × step ролика
// (npx remotion render … SiteManhuaPreview <папка> --sequence --frames=0-38; длина та же, что у ролика, иначе Freeze упирается в конец)
export const SiteManhuaPreview: React.FC<{step: number; start: number}> = ({step, start}) => {
  const f = useCurrentFrame();
  return (
    <Freeze frame={Math.min(SITE_MANHUA_FRAMES - 1, start + f * step)}>
      <SiteManhua />
    </Freeze>
  );
};
