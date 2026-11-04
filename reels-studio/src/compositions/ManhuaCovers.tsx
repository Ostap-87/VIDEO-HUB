// Обложки трёх манхуа-роликов про сайты (04.11.2026: «а теперь обложки сделай под каждое из видео»): «Мой сайт»
// (SiteManhua), Aura Robotics (AuraSiteManhua), Global Tech Tour (GttSiteManhua) — по два варианта на ролик:
// A — по хуку ролика (первая сцена: персонажи, облачка, иероглиф-звук), B — по содержанию (главы, факты, первые лица).
// Тот же манхуа-набор, шрифты и герои, что в самих роликах (site-manhua/fx.tsx, скептик, 3D-маскот, робособака, гуманоид).
// 1080×1920, кадр N = обложка N (0–1 «Мой сайт», 2–3 Aura, 4–5 GTT); всё важное — в полосе сетки профиля 3:4 (y 240–1680).
// Мата на обложках нет. Факты — те же, что в роликах (с сайтов). Рендер всех шести:
// npx remotion render src/index.ts ManhuaCovers <папка> --sequence --image-format=png --frames=0-5
import React from "react";
import {AbsoluteFill, Freeze, Img, staticFile, useCurrentFrame} from "remotion";
import {body} from "../fonts";
import {AuraMascot} from "../components/AuraMascot";
import {AuraDog} from "../components/AuraDog";
import {AuraHumanoidSpot} from "../components/AuraHumanoidSpot";
import {AuraBadge} from "../components/AuraBadge";
import {FONT} from "./site-manhua/fonts";
import {Skeptic} from "./site-manhua/skeptic";
import {Bubble, Burst, C, Grain, Halftone, Narration, Phone, Sfx, SpeedLines, Tape, Vignette} from "./site-manhua/fx";
import {useBrush, BRUSH} from "../components/MontazhFx";

export const MANHUA_COVERS = 15;
// все анимации набора к этому кадру уже закончились; 3D-жесты считаются от T секунд
const F = 200;
const T = F / 30;
const INTER = body.fontFamily;
const A = {parch: "#F8F6F3", ink: "#262626", lemon: "#FFF65D", deep: "#1C1C1C", kraft: "#BE9A62"};
const G = {n1: "#4677EC", n2: "#2556CE", n3: "#1A43A8", deep: "#0B1D55", blue: "#2563EB", sky: "#7DD3FC", red: "#E8341C", ink: "#0A0F24"};
const OD_IMG = "source-videos/ostapdotcenko/site/2026-11-03-сайт/";
const CUT = "source-videos/фото-от-пользователя/остап/вырезки/";
const CRYSTAL = "finished-videos/обложки/gtt-бренд/instagram/gtt-аватар-мастер-2160.png";
const PH = "source-videos/2026-11-03-gtt-sait-manhua/фото/";

const dela = (size: number, color: string, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT.dela, fontSize: size, color, lineHeight: 1.02, ...extra});
const inter = (size: number, color: string, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: INTER, fontWeight: 700, fontSize: size, color, lineHeight: 1.2, letterSpacing: "-0.01em", ...extra});
const mono = (size: number, color: string, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT.mono, fontSize: size, color, letterSpacing: "0.14em", ...extra});
const abs = (left: number, top: number, extra: React.CSSProperties = {}): React.CSSProperties => ({position: "absolute", left, top, ...extra});

// полароид: фото в белой рамке, подпись от руки, скотч сверху
const Polaroid: React.FC<{x: number; y: number; w: number; h: number; src: string; pos?: string; rot: number; caption: string; tape?: string}> = ({x, y, w, h, src, pos = "50% 35%", rot, caption, tape = "rgba(255,246,93,.85)"}) => (
  <div style={abs(x, y, {width: w + 36, padding: "18px 18px 0", background: "#fff", rotate: `${rot}deg`, boxShadow: "14px 18px 0 rgba(10,15,36,.55)", border: `4px solid ${G.ink}`})}>
    <Img src={staticFile(src)} style={{width: w, height: h, objectFit: "cover", objectPosition: pos, display: "block", border: `3px solid ${G.ink}`}} />
    <div style={{fontFamily: FONT.hand, fontSize: 46, color: G.ink, textAlign: "center", padding: "8px 0 12px", lineHeight: 1.1}}>{caption}</div>
    <div style={abs(w / 2 - 50, -26, {width: 140, height: 44, background: tape, rotate: "-6deg", border: `3px solid ${G.ink}`})} />
  </div>
);

// ── «Мой сайт», A (правка пользователя 04.11.2026: «не У меня есть сайт — Заходи на мой сайт, Читай мой блог») — ударами на чернилах, снизу жёлтый растр: телефон с сайтом и портрет ─────────────
const OdHook: React.FC = () => (
  <AbsoluteFill style={{background: C.ink}}>
    <SpeedLines color="#fff" opacity={0.75} inner={400} cy={560} seed="oda" />
    <div style={abs(64, 286, mono(30, "#fff"))}>ОСТАП ДОЦЕНКО · 多增科</div>
    {[["ЗАХОДИ", 340, 124, "#fff"], ["НА МОЙ САЙТ,", 474, 98, "#fff"], ["ЧИТАЙ МОЙ БЛОГ!", 604, 78, C.y]].map(([t, y, s, c]) => (
      <div key={t as string} style={{position: "absolute", left: 0, right: 0, top: y as number, textAlign: "center", whiteSpace: "nowrap", ...dela(s as number, c as string, {textShadow: `12px 12px 0 ${C.red}`})}}>{t}</div>
    ))}
    <Sfx text="哇!" x={860} y={250} size={110} color={C.y} at={0} font={FONT.zcool} rot={12} />
    {/* жёлтая половина с косым срезом */}
    <AbsoluteFill style={{clipPath: "polygon(0 930px, 1080px 860px, 1080px 1920px, 0 1920px)"}}>
      <Halftone bg={C.y} dot="rgba(25,25,34,.16)" />
      <SpeedLines color={C.ink} opacity={0.55} inner={520} cx={300} cy={1300} seed="odb" />
    </AbsoluteFill>
    <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
      <line x1={0} y1={930} x2={1080} y2={860} stroke={C.ink} strokeWidth={14} />
      <line x1={0} y1={952} x2={1080} y2={882} stroke={C.red} strokeWidth={8} />
    </svg>
    <div style={abs(60, 1000, {fontFamily: FONT.zcool, fontSize: 120, color: C.ink, lineHeight: 1, textShadow: `8px 8px 0 ${C.red}`})}>我的网站</div>
    <AbsoluteFill style={{perspective: 1800}}>
      <div style={abs(70, 1150, {transform: "rotateY(18deg) rotateZ(-7deg)", transformStyle: "preserve-3d"})}>
        <Phone w={380} imgs={[`${OD_IMG}ru-00-top.jpg`]} mode="swap" />
      </div>
    </AbsoluteFill>
    <Img src={staticFile(`${CUT}финал-сайт-3.png`)} style={{position: "absolute", right: -90, bottom: -40, height: 1000, filter: `drop-shadow(8px 0 0 #fff) drop-shadow(-8px 0 0 #fff) drop-shadow(0 8px 0 #fff) drop-shadow(0 -8px 0 #fff) drop-shadow(18px 18px 0 ${C.ink})`}} />
    <Tape x={300} y={1560} at={0} rot={-4} font={FONT.mono} size={54}>ostapdotcenko.ru</Tape>
    <Grain opacity={0.12} />
  </AbsoluteFill>
);

// ── «Мой сайт», B: страница манхуа — четыре главы ролика панелями ─────────────────────────────────────────────────────────
const PanelBox: React.FC<{x: number; y: number; w: number; h: number; bg: string; rot?: number; children: React.ReactNode}> = ({x, y, w, h, bg, rot = 0, children}) => (
  <div style={abs(x, y, {width: w, height: h, background: bg, border: `7px solid ${C.ink}`, boxShadow: `12px 12px 0 ${C.ink}`, overflow: "hidden", rotate: `${rot}deg`})}>{children}</div>
);
const ChapterTag: React.FC<{zh: string; ru: string; dark?: boolean}> = ({zh, ru, dark}) => (
  <div style={abs(0, 0, {display: "flex", alignItems: "baseline", gap: 10, zIndex: 2, background: dark ? C.ink : "transparent", padding: "10px 16px 8px", borderRight: dark ? `5px solid ${C.ink}` : undefined})}>
    <span style={{fontFamily: FONT.zcool, fontSize: 52, color: dark ? C.y : C.ink, lineHeight: 1}}>{zh}</span>
    <span style={{...inter(28, dark ? "#fff" : C.ink), background: dark ? "transparent" : C.y, padding: "0 6px"}}>{ru}</span>
  </div>
);
const OdPage: React.FC = () => (
  <AbsoluteFill style={{background: C.paper}}>
    <Halftone bg={C.paper} dot="rgba(25,25,34,.08)" size={18} r={2.6} />
    <div style={abs(64, 280, mono(30, C.ink))}>OSTAPDOTCENKO.RU · 我的网站</div>
    <div style={abs(58, 330, dela(132, C.ink, {textShadow: `10px 10px 0 ${C.red}`, whiteSpace: "nowrap"}))}>МОЙ САЙТ</div>
    <div style={abs(64, 500, dela(70, C.ink))}>
      <span style={{background: C.y, padding: "0 12px"}}>как манхуа</span>
    </div>
    <Sfx text="哇!" x={840} y={480} size={110} color={C.red} at={0} font={FONT.zcool} rot={10} />
    {/* 1. кто он — живое фото со сцены */}
    <PanelBox x={56} y={640} w={560} h={500} bg={C.ink}>
      <Img src={staticFile("source-videos/фото-от-пользователя/остап/2026-11-03-для-финала/foto-5.jpg")} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "78% 25%"}} />
      <ChapterTag zh="第一话" ru="Кто он" dark />
    </PanelBox>
    {/* 2. цифры */}
    <PanelBox x={650} y={640} w={374} h={500} bg={C.y}>
      <ChapterTag zh="第二话" ru="Цифры" />
      <div style={abs(0, 130, {width: 374, height: 300})}>
        <Burst x={187} y={150} r={170} color="#fff" stroke={C.ink} sw={7} seed="odn" points={18} />
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", ...dela(74, C.red, {WebkitTextStroke: `3px ${C.ink}`, paintOrder: "stroke fill"})}}>+350%</div>
      <div style={{position: "absolute", left: 0, right: 0, top: 340, textAlign: "center", ...inter(30, C.ink)}}>рост продавцов</div>
    </PanelBox>
    {/* 3. три языка — экран выбора как в игре */}
    <PanelBox x={56} y={1176} w={470} h={400} bg={C.ink}>
      <ChapterTag zh="第三话" ru="Три языка" dark />
      <div style={{fontFamily: FONT.pixel, fontSize: 26, color: C.y, position: "absolute", left: 24, top: 96}}>ВЫБЕРИ ЯЗЫК</div>
      {["RU", "EN", "中文"].map((l, i) => (
        <div key={l} style={abs(24 + i * 146, 160, {width: 128, height: 170, border: `5px solid ${i === 2 ? C.y : "#fff"}`, background: i === 2 ? C.red : "transparent", display: "flex", alignItems: "center", justifyContent: "center", ...(l === "中文" ? {fontFamily: FONT.zcool, fontSize: 52, color: "#fff"} : dela(52, "#fff"))})}>{l}</div>
      ))}
      <div style={{fontFamily: FONT.pixel, fontSize: 22, color: "#fff", position: "absolute", left: 24, top: 352}}>▶ 1P READY?</div>
    </PanelBox>
    {/* 4. блог — отрывной календарь */}
    <PanelBox x={560} y={1176} w={464} h={400} bg="#fff">
      <ChapterTag zh="第四话" ru="Блог" />
      <div style={abs(36, 100, {width: 200, height: 250, border: `5px solid ${C.ink}`, background: "#fff", boxShadow: `8px 8px 0 ${C.red}`})}>
        <div style={{height: 56, background: C.red, borderBottom: `5px solid ${C.ink}`, ...mono(26, "#fff", {textAlign: "center", lineHeight: "56px", letterSpacing: "0.1em"})}}>НОЯБРЬ</div>
        <div style={{textAlign: "center", ...dela(120, C.ink, {lineHeight: 1.4})}}>4</div>
      </div>
      <div style={abs(256, 112, {width: 190, ...inter(34, C.ink)})}>новая статья каждый день</div>
      <div style={abs(256, 290, {width: 190, ...inter(26, C.red)})}>RU · EN · 中文</div>
    </PanelBox>
    <Grain opacity={0.1} />
  </AbsoluteFill>
);

// деревянный ящик MADE IN CHINA (как в хуке ролика Aura)
const Crate: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => (
  <div style={abs(x, y, {width: w, height: h})}>
    <div style={{position: "absolute", left: 18, right: -18, top: -26, height: 30, background: "#D8B985", border: `4px solid ${A.ink}`, transform: "skewX(-34deg)", transformOrigin: "0 100%"}} />
    <div style={{position: "absolute", inset: 0, background: `repeating-linear-gradient(180deg, ${A.kraft} 0 74px, #A88550 74px 80px)`, border: `5px solid ${A.ink}`, boxShadow: "inset 0 -30px 60px rgba(0,0,0,.28)"}} />
    <div style={{position: "absolute", left: 0, right: 0, top: 58, textAlign: "center", fontFamily: FONT.oswald, fontSize: 56, letterSpacing: "0.12em", color: "rgba(38,38,38,.78)"}}>MADE IN CHINA</div>
    <div style={{position: "absolute", left: 0, right: 0, top: 134, textAlign: "center", fontFamily: FONT.zcool, fontSize: 64, color: "rgba(38,38,38,.72)"}}>中国制造</div>
  </div>
);
const Mark: React.FC<{children: React.ReactNode}> = ({children}) => (
  <span style={{background: `linear-gradient(${A.lemon}, ${A.lemon}) no-repeat 0 88% / 100% 46%`, padding: "0 6px"}}>{children}</span>
);
const AuraPill: React.FC<{x: number; y: number; children: React.ReactNode; dark?: boolean; size?: number; rot?: number}> = ({x, y, children, dark, size = 38, rot = 0}) => (
  <div style={abs(x, y, {display: "flex", alignItems: "center", gap: 14, background: dark ? A.ink : A.parch, border: `4px solid ${A.ink}`, borderRadius: 999, padding: "12px 28px 12px 16px", whiteSpace: "nowrap", boxShadow: `7px 7px 0 ${dark ? A.lemon : A.ink}`, rotate: `${rot}deg`})}>
    <span style={{width: size * 0.62, height: size * 0.62, borderRadius: 99, background: A.lemon, border: `4px solid ${dark ? A.parch : A.ink}`}} />
    <span style={inter(size, dark ? A.parch : A.ink)}>{children}</span>
  </div>
);

// ── Aura, A: хук — скептик «Робот? Из Китая?», маскот вскочил на ящик: «НАДО!» ────────────────────────────────────────────
const AuraHook: React.FC = () => (
  <AbsoluteFill style={{background: A.deep}}>
    <Halftone bg={A.deep} dot="rgba(255,246,93,.08)" size={20} r={3} />
    <AbsoluteFill style={{background: "radial-gradient(ellipse 560px 760px at 760px 1150px, rgba(255,246,93,.26), transparent 70%)"}} />
    <div style={abs(64, 282, mono(28, A.lemon))}>AURA ROBOTICS · AURA-ROBOTICS.RU</div>
    <div style={abs(60, 330, dela(104, A.parch))}>Робот с завода.</div>
    <div style={abs(60, 456, dela(84, A.ink, {background: A.lemon, padding: "4px 18px", boxShadow: `8px 8px 0 ${A.parch}`}))}>Без посредников</div>
    <Crate x={570} y={1420} w={440} h={320} />
    <AuraMascot plan={{stays: [{at: 0, x: 790, y: 1430, face: -0.35}], gestures: [{at: T - 0.8, kind: "pointUp"}]}} scale={2.25} dpr={1.5} />
    <Skeptic x={-90} y={1170} scale={1.2} emo="shock" rim={A.lemon} fill="#0E0E0E" accent={A.lemon} />
    <Bubble x={36} y={660} w={500} h={270} tail={[180, 540]} fill={A.parch} stroke={A.ink} scale={1} opacity={1}>
      <div style={dela(68, A.ink)}>Робот?</div>
      <div style={dela(52, A.ink)}>Из Китая?</div>
    </Bubble>
    <Bubble x={575} y={590} w={460} h={260} shout tail={[95, 345]} fill="#fff" stroke={A.ink} scale={1} opacity={1}>
      <div style={dela(120, A.ink)}>
        <Mark>НАДО!</Mark>
      </div>
    </Bubble>
    <Sfx text="嗯？" x={440} y={1060} size={120} color={A.lemon} stroke={A.ink} at={0} font={FONT.zcool} rot={-8} />
    <Grain opacity={0.1} />
  </AbsoluteFill>
);

// ── Aura, B: вся команда у печати Aura + факт с сайта во взрыве ─────────────────────────────────────────────────────────────
const AuraTeam: React.FC = () => (
  <AbsoluteFill style={{background: A.parch}}>
    <Halftone bg={A.parch} dot="rgba(38,38,38,.07)" size={20} r={2.6} />
    <SpeedLines color="rgba(38,38,38,.5)" inner={520} cy={1240} seed="aut" opacity={0.6} />
    <div style={abs(64, 282, mono(28, A.ink))}>AURA-ROBOTICS.RU · 第一话</div>
    <div style={abs(60, 330, dela(104, A.ink))}>Робот с завода.</div>
    <div style={abs(60, 456, dela(92, A.ink))}>
      <Mark>Без посредников</Mark>
    </div>
    <div style={abs(40, 640, {width: 1000, height: 420})}>
      <Burst x={500} y={250} r={265} color={A.lemon} stroke={A.ink} sw={8} seed="aub" points={22} />
    </div>
    <div style={{position: "absolute", left: 150, right: 150, top: 790, textAlign: "center"}}>
      <div style={dela(64, A.ink)}>Больше половины</div>
      <div style={inter(38, A.ink)}>промышленных роботов в мире</div>
      <div style={{...dela(58, A.parch), background: A.ink, display: "inline-block", padding: "6px 18px", marginTop: 10}}>ставят в Китае</div>
    </div>
    <div style={abs(540 - 260, 1050, {width: 520, height: 520, opacity: 0.9})}>
      <AuraBadge size={520} />
    </div>
    <AuraDog x={210} y={1600} scale={1.6} face={-0.6} stands={[{at: T - 1.2, dur: 4}]} />
    <AuraMascot plan={{stays: [{at: 0, x: 540, y: 1600, face: 0}], gestures: [{at: T - 0.9, kind: "wave"}]}} scale={1.9} dpr={1.5} />
    <AuraHumanoidSpot plan={{stays: [{at: 0, x: 860, face: -Math.PI / 2}], gestures: [{at: T - 0.8, kind: "wave"}]}} y={1600} scale={1.55} dpr={1.5} />
    <AuraPill x={64} y={1110} size={34} rot={-3}>100+ производителей</AuraPill>
    <AuraPill x={640} y={1190} size={34} rot={3} dark>17 городов Китая</AuraPill>
    <Grain opacity={0.08} />
  </AbsoluteFill>
);

const NavyBg: React.FC<{cy?: number}> = ({cy = 35}) => (
  <>
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% ${cy}%, ${G.n1}, ${G.n2} 55%, ${G.n3})`}} />
    <Halftone bg="transparent" dot="rgba(125,211,252,.08)" size={22} r={3} />
  </>
);
const CRACK = "M640,1010 L560,930 L520,820 L470,760 M640,1010 L760,940 L840,960 L960,880 M640,1010 L700,1120 L690,1240 L760,1330 M640,1010 L520,1060 L400,1050 L300,1110 M560,930 L480,960 M760,940 L790,860 M700,1120 L800,1150";

// ── GTT, A: хук — «А на завод тебя интернет пустит?» · 进不去！ — и пропуск GTT: «А нас — пускают» ──────────────────────────
const GttHook: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{filter: "grayscale(.8) contrast(1.15)"}}>
      <NavyBg cy={60} />
      <SpeedLines color="rgba(125,211,252,.4)" cx={600} cy={1300} inner={500} opacity={0.9} seed="ga" />
      <Skeptic x={60} y={1150} scale={1.4} emo="sweat" tie fill={G.ink} rim={G.sky} accent={G.red} />
    </AbsoluteFill>
    <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
      <path d={CRACK} fill="none" stroke="#fff" strokeWidth={7} strokeLinejoin="bevel" style={{filter: "drop-shadow(0 0 8px rgba(125,211,252,.9))"}} />
    </svg>
    <div style={abs(60, 300, {width: 960, background: G.deep, border: `4px solid ${G.ink}`, padding: "18px 24px", rotate: "-2deg", boxShadow: `9px 9px 0 ${G.sky}`, ...inter(54, "#fff")})}>
      А на завод тебя <span style={{color: G.sky}}>интернет пустит?</span>
    </div>
    <div style={{position: "absolute", left: 0, right: 0, top: 560, textAlign: "center"}}>
      <div style={{fontFamily: FONT.zcool, fontSize: 210, color: "#fff", lineHeight: 1.05, textShadow: `10px 10px 0 ${G.red}`}}>进不去！</div>
      <div style={dela(82, G.red, {WebkitTextStroke: "6px #fff", paintOrder: "stroke fill", textShadow: `8px 8px 0 ${G.ink}`, whiteSpace: "nowrap"})}>НЕ ПУСТЯТ!</div>
    </div>
    {/* пропуск GTT: белая карта на ленте, справа снизу */}
    <div style={abs(600, 1250, {width: 420, background: "#fff", border: `5px solid ${G.ink}`, borderRadius: 22, boxShadow: `12px 12px 0 ${G.blue}`, rotate: "6deg", padding: "22px 26px", overflow: "hidden"})}>
      <div style={{display: "flex", alignItems: "center", gap: 14}}>
        <Img src={staticFile(CRYSTAL)} style={{width: 92, height: 92, borderRadius: "50%"}} />
        <div style={dela(36, G.ink)}>GLOBAL TECH TOUR</div>
      </div>
      <div style={{...mono(24, G.blue), marginTop: 14}}>ПРОПУСК · 通行证</div>
      <div style={{...dela(66, G.ink), marginTop: 8}}>А нас —</div>
      <div style={dela(66, G.blue)}>пускают.</div>
      <div style={{marginTop: 14, height: 46, background: `repeating-linear-gradient(90deg, ${G.ink} 0 6px, transparent 6px 10px, ${G.ink} 10px 13px, transparent 13px 19px)`}} />
    </div>
    <div style={abs(800, 1140, {width: 14, height: 130, background: G.red, rotate: "6deg", border: `3px solid ${G.ink}`})} />
    <Grain opacity={0.1} />
    <Vignette strength={0.3} />
  </AbsoluteFill>
);

// ── GTT, B: первые лица — полароиды настоящих встреч, «Туда, куда с улицы не пускают» ─────────────────────────────────────
const GttPeople: React.FC = () => (
  <AbsoluteFill>
    <NavyBg cy={40} />
    <SpeedLines color="rgba(125,211,252,.35)" cx={540} cy={1100} inner={560} opacity={0.6} seed="gb" />
    <div style={abs(64, 280, {display: "flex", alignItems: "center", gap: 16})}>
      <Img src={staticFile(CRYSTAL)} style={{width: 84, height: 84, borderRadius: "50%"}} />
      <div style={mono(30, G.sky)}>GLOBAL TECH TOUR · 第三话</div>
    </div>
    <div style={abs(60, 380, dela(88, "#fff", {textShadow: `8px 8px 0 ${G.ink}`, width: 980}))}>Туда, куда</div>
    <div style={abs(60, 476, dela(88, "#fff", {textShadow: `8px 8px 0 ${G.ink}`}))}>с улицы</div>
    <div style={abs(60, 572, dela(88, G.red, {WebkitTextStroke: "5px #fff", paintOrder: "stroke fill", textShadow: `8px 8px 0 ${G.ink}`}))}>не пускают</div>
    <Polaroid x={24} y={700} w={290} h={370} src={`${PH}yingke-rukovodstvo.jpg`} rot={-7} caption="YingKe 盈科" />
    <Polaroid x={730} y={690} w={290} h={370} src="source-videos/2026-10-25-sany/IMG_5645.jpg" pos="50% 30%" rot={6} caption="у ворот SANY" tape="rgba(125,211,252,.9)" />
    <Polaroid x={350} y={1040} w={360} h={440} src="source-videos/обложки/2026-11-03-manhua/hema-kadr.jpg" pos="50% 22%" rot={-2} caption="с основателем Hema" tape="rgba(232,52,28,.85)" />
    <Narration x={64} y={1612} at={0} font={FONT.oswald} size={34} rot={-2} bg="#fff" color={G.ink}>9 СТРАН · 76 ПРОГРАММ · 1000+ КОМПАНИЙ</Narration>
    <Sfx text="哇!" x={820} y={1260} size={120} color="#fff" stroke={G.ink} at={0} font={FONT.zcool} rot={12} />
    <Grain opacity={0.1} />
    <Vignette strength={0.28} />
  </AbsoluteFill>
);


const LOGO = "source-videos/логотипы/";
const FLAG = "интернет-материалы/флаги/";
const Title: React.FC<{y: number; lines: [string, string?][]; size?: number}> = ({y, lines, size = 88}) => (
  <>
    {lines.map(([s, c], i) => (
      <div key={s} style={abs(60, y + i * (size + 8), dela(size, c ?? "#fff", {textShadow: `8px 8px 0 ${G.ink}`, whiteSpace: "nowrap", ...(c === G.red ? {WebkitTextStroke: "5px #fff", paintOrder: "stroke fill"} : {})}))}>{s}</div>
    ))}
  </>
);
const GttHead: React.FC<{zh?: string; light?: boolean}> = ({zh = "全球科技之旅", light}) => (
  <div style={abs(64, 280, {display: "flex", alignItems: "center", gap: 16})}>
    <Img src={staticFile(CRYSTAL)} style={{width: 84, height: 84, borderRadius: "50%"}} />
    <div style={mono(30, light ? G.blue : G.sky)}>GLOBAL TECH TOUR · {zh}</div>
  </div>
);

// ── GTT, C: экран файтинга «VS» — Директор с телефоном («я всё посмотрел в интернете») против Остапа на переговорах ────────────
const GttVs: React.FC = () => (
  <AbsoluteFill style={{background: G.ink}}>
    {/* левая половина — серый «интернет» */}
    <AbsoluteFill style={{clipPath: "polygon(0 0, 640px 0, 440px 1920px, 0 1920px)", filter: "grayscale(1) contrast(1.1)"}}>
      <NavyBg cy={50} />
      <SpeedLines color="rgba(255,255,255,.35)" cx={260} cy={1100} inner={300} seed="gvl" />
      <Skeptic x={-150} y={1000} scale={1.3} emo="neutral" phone tie fill={G.ink} rim="#fff" accent={G.red} />
    </AbsoluteFill>
    {/* правая — синий GTT */}
    <AbsoluteFill style={{clipPath: "polygon(640px 0, 1080px 0, 1080px 1920px, 440px 1920px)"}}>
      <NavyBg cy={40} />
      <SpeedLines color="rgba(125,211,252,.6)" cx={820} cy={1100} inner={320} seed="gvr" />
      <Img src={staticFile(`${CUT}ostap-yingke-mikrofon.png`)} style={{position: "absolute", left: 420, top: 820, height: 900, filter: `drop-shadow(8px 0 0 #fff) drop-shadow(-8px 0 0 #fff) drop-shadow(0 -8px 0 #fff) drop-shadow(16px 16px 0 ${G.ink})`}} />
    </AbsoluteFill>
    <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
      <line x1={640} y1={0} x2={440} y2={1920} stroke="#fff" strokeWidth={18} />
      <line x1={652} y1={0} x2={452} y2={1920} stroke={G.red} strokeWidth={8} />
    </svg>
    <div style={{fontFamily: FONT.pixel, fontSize: 30, color: G.sky, position: "absolute", left: 0, right: 0, top: 290, textAlign: "center"}}>ROUND 1 · FIGHT!</div>
    <div style={abs(40, 360, {width: 520, background: "#fff", border: `5px solid ${G.ink}`, padding: "14px 20px", rotate: "-3deg", boxShadow: `8px 8px 0 ${G.ink}`, ...inter(40, G.ink)})}>
      «Я всё посмотрел <span style={{color: G.red}}>в интернете</span>»
    </div>
    <div style={abs(520, 560, {width: 520, background: G.deep, border: `5px solid ${G.ink}`, padding: "14px 20px", rotate: "3deg", boxShadow: `8px 8px 0 ${G.sky}`, ...inter(40, "#fff")})}>
      «А я был <span style={{color: G.sky}}>внутри</span>»
    </div>
    <div style={{position: "absolute", left: 0, right: 0, top: 760, textAlign: "center", ...dela(230, G.red, {WebkitTextStroke: "8px #fff", paintOrder: "stroke fill", textShadow: `14px 14px 0 ${G.ink}`, fontStyle: "italic"})}}>VS</div>
    <div style={abs(40, 1560, {display: "flex", gap: 14})}>
      <div style={{background: "#fff", border: `4px solid ${G.ink}`, padding: "8px 16px", ...mono(26, G.ink)}}>ИНТЕРНЕТ</div>
    </div>
    <div style={abs(640, 1560, {background: G.blue, border: `4px solid ${G.ink}`, padding: "8px 16px", ...mono(26, "#fff")})}>GLOBAL TECH TOUR</div>
    <Grain opacity={0.1} />
  </AbsoluteFill>
);

// ── GTT, D: пропуска шести кампусов на лентах — учёба у Huawei, Alibaba, Xiaomi… ──────────────────────────────────────────────
const CAMPUS: [string, string][] = [["общие/huawei.svg", "Huawei"], ["общие/alibaba.svg", "Alibaba"], ["общие/xiaomi.svg", "Xiaomi"], ["бытовая-техника/haier.svg", "Haier"], ["общие/bytedance.png", "ByteDance"], ["финансы/ping-an.svg", "Ping An"]];
const GttCampus: React.FC = () => (
  <AbsoluteFill>
    <NavyBg cy={45} />
    <SpeedLines color="rgba(125,211,252,.35)" cx={540} cy={1150} inner={520} opacity={0.6} seed="gc" />
    <GttHead zh="第四话" />
    <Title y={380} lines={[["Пропуск"], ["в кампусы"], ["Huawei и Alibaba", G.sky]]} size={84} />
    {CAMPUS.map(([l, n], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return (
        <div key={n} style={abs(48 + col * 334, 820 + row * 380 + (col === 1 ? 40 : 0), {width: 300, rotate: `${(col - 1) * 6 + (row ? 3 : -3)}deg`})}>
          <div style={abs(133, -70, {width: 34, height: 80, background: G.blue, border: `3px solid ${G.ink}`})} />
          <div style={{background: "#fff", border: `4px solid ${G.ink}`, borderRadius: 18, overflow: "hidden", boxShadow: `9px 9px 0 ${G.blue}`}}>
            <div style={{background: G.blue, color: "#fff", padding: "8px 14px", ...mono(20, "#fff")}}>ГОСТЬ КАМПУСА</div>
            <div style={{height: 150, display: "flex", alignItems: "center", justifyContent: "center"}}>
              <Img src={staticFile(`${LOGO}${l}`)} style={{maxWidth: 220, maxHeight: 92, objectFit: "contain"}} />
            </div>
            <div style={{padding: "0 14px 12px", ...inter(30, G.ink)}}>{n}</div>
          </div>
        </div>
      );
    })}
    <Sfx text="学!" x={830} y={300} size={140} color={G.sky} stroke={G.ink} at={0} font={FONT.zcool} rot={-8} />
    <Narration x={64} y={1612} at={0} font={FONT.oswald} size={32} rot={-2} bg="#fff" color={G.ink}>ИНТЕНСИВЫ ИЗ ПЕРВЫХ РУК · С ПЕРЕВОДОМ</Narration>
    <Grain opacity={0.1} />
    <Vignette strength={0.28} />
  </AbsoluteFill>
);

// ── GTT, E: страница манхуа — «Интернет туда не пустит»: четыре панели с настоящими встречами и визитами ────────────────────────
const GttPage: React.FC = () => {
  const panel = (x: number, y: number, w: number, h: number, src: string, pos: string, tag: string, rot = 0) => (
    <div style={abs(x, y, {width: w, height: h, border: `7px solid ${G.ink}`, boxShadow: `12px 12px 0 ${G.ink}`, overflow: "hidden", rotate: `${rot}deg`, background: G.ink})}>
      <Img src={staticFile(src)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: pos}} />
      <div style={abs(0, 0, {background: G.ink, color: "#fff", padding: "8px 14px", ...inter(28, "#fff")})}>{tag}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{background: "#F4F6FB"}}>
      <Halftone bg="#F4F6FB" dot="rgba(37,99,235,.10)" size={18} r={2.6} />
      <GttHead zh="第三话" light />
      <div style={abs(60, 380, dela(90, G.ink, {textShadow: `8px 8px 0 ${G.sky}`, whiteSpace: "nowrap"}))}>Интернет</div>
      <div style={abs(60, 482, dela(80, G.blue, {textShadow: `8px 8px 0 ${G.ink}`, whiteSpace: "nowrap"}))}>туда не пустит</div>
      {panel(48, 640, 600, 470, "source-videos/обложки/2026-11-03-manhua/hema-kadr.jpg", "50% 18%", "С основателем Hema", -1)}
      {panel(676, 640, 356, 470, "source-videos/2026-10-25-sany/IMG_5645.jpg", "50% 30%", "SANY", 1)}
      {panel(48, 1140, 420, 440, `${PH}yingke-rukovodstvo.jpg`, "50% 30%", "YingKe 盈科", 1)}
      {panel(496, 1140, 536, 440, `${PH}xingwang-hou.jpg`, "50% 30%", "Xingwang", -1)}
      <Sfx text="进!" x={840} y={330} size={120} color={G.red} stroke="#fff" at={0} font={FONT.zcool} rot={10} />
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};

// ── GTT, F: 9 стран загораются флагами, во взрыве — 76 программ ─────────────────────────────────────────────────────────────
const COUNTRIES: [string, string][] = [["cn", "Китай"], ["jp", "Япония"], ["kr", "Корея"], ["th", "Таиланд"], ["vn", "Вьетнам"], ["id", "Индонезия"], ["my", "Малайзия"], ["in", "Индия"], ["ae", "ОАЭ"]];
const GttCountries: React.FC = () => (
  <AbsoluteFill>
    <NavyBg cy={55} />
    <SpeedLines color="rgba(125,211,252,.5)" cx={540} cy={1180} inner={420} opacity={0.75} seed="gf" />
    <GttHead />
    <Title y={380} lines={[["Бизнес-экспедиции"], ["в Китай"], ["и не только", G.sky]]} size={70} />
    {COUNTRIES.map(([c, n], i) => (
      <div key={c} style={abs(48 + (i % 3) * 332, 690 + Math.floor(i / 3) * 96, {width: 312, height: 80, display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `4px solid ${G.ink}`, borderRadius: 14, padding: "0 14px", boxShadow: `0 0 28px rgba(125,211,252,.6), 6px 6px 0 ${G.blue}`})}>
        <Img src={staticFile(`${FLAG}${c}.png`)} style={{width: 64, height: 44, objectFit: "cover", border: `2px solid ${G.ink}`}} />
        <span style={inter(30, G.ink)}>{n}</span>
      </div>
    ))}
    <div style={abs(40, 990, {width: 1000, height: 520})}>
      <Burst x={500} y={260} r={300} color={G.blue} stroke="#fff" sw={8} seed="gfb" points={22} />
    </div>
    <div style={{position: "absolute", left: 0, right: 0, top: 1120, textAlign: "center"}}>
      <div style={dela(170, "#fff", {textShadow: `10px 10px 0 ${G.ink}`, lineHeight: 1})}>76</div>
      <div style={inter(40, G.sky)}>готовых программ</div>
    </div>
    <Narration x={64} y={1612} at={0} font={FONT.oswald} size={34} rot={-2} bg="#fff" color={G.ink}>1000+ КОМПАНИЙ · 18 ОТРАСЛЕЙ</Narration>
    <Sfx text="轰!" x={830} y={1040} size={130} color="#fff" stroke={G.ink} at={0} font={FONT.zcool} rot={12} />
    <Grain opacity={0.1} />
    <Vignette strength={0.28} />
  </AbsoluteFill>
);

// ── вторая серия GTT (04.11.2026: «сделай ещё варианты для ГТТ — покреативнее») ────────────────────────────────────────────────

// G «Скважина»: стальная дверь завода «闲人免进», в замочной скважине — свет и настоящий завод (ворота SANY)
const KEYHOLE = "M 320 860 A 220 220 0 1 1 760 860 A 220 220 0 1 1 320 860 Z M 468 990 L 612 990 L 712 1400 L 368 1400 Z";
const GttKeyhole: React.FC = () => (
  <AbsoluteFill style={{background: "#0A1430"}}>
    {/* сталь: вертикальные листы, заклёпки, блик */}
    <AbsoluteFill style={{background: "repeating-linear-gradient(90deg, #13224D 0 268px, #0C1838 268px 274px, #1A2C5E 274px 276px)"}} />
    <AbsoluteFill style={{background: "radial-gradient(circle, rgba(125,211,252,.22) 0 5px, transparent 6px) 0 0 / 135px 120px", opacity: 0.7}} />
    <AbsoluteFill style={{background: "linear-gradient(115deg, transparent 30%, rgba(125,211,252,.10) 45%, transparent 60%)"}} />
    <SpeedLines color="rgba(125,211,252,.55)" cx={540} cy={1000} inner={420} opacity={0.85} seed="kh" />
    {/* табличка на двери */}
    <div style={abs(170, 270, {width: 740, background: "#F4F6FB", border: `6px solid ${G.ink}`, padding: "14px 20px", textAlign: "center", boxShadow: `10px 10px 0 ${G.red}`, rotate: "-1.5deg"})}>
      <div style={{fontFamily: FONT.zcool, fontSize: 78, color: G.red, lineHeight: 1}}>闲人免进</div>
      <div style={{...mono(28, G.ink), marginTop: 6}}>ПОСТОРОННИМ ВХОД ВОСПРЕЩЁН</div>
    </div>
    {/* скважина: внутри — настоящий завод */}
    <AbsoluteFill style={{clipPath: `path("${KEYHOLE}")`}}>
      <Img src={staticFile("source-videos/2026-10-25-sany/IMG_5645.jpg")} style={{position: "absolute", left: 240, top: 600, width: 600, height: 820, objectFit: "cover", objectPosition: "50% 35%"}} />
      <AbsoluteFill style={{background: "radial-gradient(ellipse 260px 420px at 540px 1000px, rgba(255,255,255,.0), rgba(125,211,252,.35))"}} />
    </AbsoluteFill>
    <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
      <path d={KEYHOLE} fill="none" stroke={G.ink} strokeWidth={30} />
      <path d={KEYHOLE} fill="none" stroke={G.sky} strokeWidth={8} style={{filter: "drop-shadow(0 0 18px rgba(125,211,252,.95))"}} />
    </svg>
    <Bubble x={560} y={560} w={470} h={210} tail={[60, 300]} fill="#fff" stroke={G.ink}>
      <div style={dela(52, G.ink)}>Что там</div>
      <div style={dela(52, G.blue)}>внутри?</div>
    </Bubble>
    <Sfx text="嘘…" x={70} y={600} size={120} color="#fff" stroke={G.ink} at={0} font={FONT.zcool} rot={-10} />
    <div style={abs(60, 1450, {display: "flex", alignItems: "center", gap: 18, background: "#fff", border: `5px solid ${G.ink}`, borderRadius: 20, padding: "14px 24px", boxShadow: `10px 10px 0 ${G.blue}`, rotate: "-2deg"})}>
      <Img src={staticFile(CRYSTAL)} style={{width: 84, height: 84, borderRadius: "50%"}} />
      <div>
        <div style={dela(44, G.ink)}>Ключ — у нас.</div>
        <div style={mono(24, G.blue)}>GLOBAL TECH TOUR · 全球科技之旅</div>
      </div>
    </div>
    <Grain opacity={0.12} />
    <Vignette strength={0.4} />
  </AbsoluteFill>
);

// H «Журнал манги»: обложка выпуска — огромное GTT, герой на линиях концентрации, анонсы глав в звёздах, штрихкод
const Blurb: React.FC<{x: number; y: number; r: number; color: string; rot?: number; children: React.ReactNode; seed: string; text?: string}> = ({x, y, r, color, rot = 0, children, seed, text = G.ink}) => (
  <div style={abs(x - r, y - r, {width: r * 2, height: r * 2, rotate: `${rot}deg`})}>
    <Burst x={r} y={r} r={r} color={color} stroke={G.ink} sw={6} seed={seed} points={16} />
    <div style={{position: "absolute", inset: r * 0.3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", ...inter(r * 0.18, text, {lineHeight: 1.08})}}>{children}</div>
  </div>
);
const GttMagazine: React.FC = () => (
  <AbsoluteFill style={{background: "#fff"}}>
    <AbsoluteFill style={{background: `radial-gradient(circle at 60% 62%, ${G.n1}, ${G.n2} 50%, ${G.n3})`, clipPath: "polygon(0 560px, 1080px 520px, 1080px 1920px, 0 1920px)"}} />
    <AbsoluteFill style={{clipPath: "polygon(0 560px, 1080px 520px, 1080px 1920px, 0 1920px)"}}>
      <SpeedLines color="rgba(255,255,255,.55)" cx={640} cy={1150} inner={330} opacity={0.9} seed="mg" />
    </AbsoluteFill>
    {/* шапка журнала */}
    <div style={abs(40, 250, {...mono(26, G.ink)})}>ВЫПУСК №1 · 第一话 · ЭКСПЕДИЦИИ В КИТАЙ</div>
    <div style={abs(30, 290, dela(240, G.blue, {letterSpacing: "-0.02em", textShadow: `8px 8px 0 ${G.red}, 16px 16px 0 ${G.ink}`, lineHeight: 1}))}>GTT</div>
    <div style={abs(722, 322, {width: 330, whiteSpace: "nowrap"})}>
      <div style={{fontFamily: FONT.zcool, fontSize: 52, color: G.ink, lineHeight: 1}}>全球科技之旅</div>
      <div style={{...inter(30, G.ink), marginTop: 10}}>GLOBAL TECH TOUR</div>
      <div style={{...inter(27, G.red), marginTop: 6}}>Всё о закрытом Китае</div>
    </div>
    {/* фото пользователя 04.11.2026 (выступление с микрофоном, закреп профиля); логотип площадки срезан вместе с низом кадра */}
    <Img src={staticFile(`${CUT}ostap-megamarket-mikrofon.png`)} style={{position: "absolute", left: 170, top: 720, height: 1220, filter: `drop-shadow(10px 0 0 #fff) drop-shadow(-10px 0 0 #fff) drop-shadow(0 -10px 0 #fff) drop-shadow(18px 18px 0 ${G.ink})`}} />
    <Blurb x={220} y={815} r={215} color="#fff" rot={-8} seed="b1"><span style={{fontSize: 27}}>ЭКСКЛЮЗИВНЫЙ</span><span style={dela(48, G.red, {lineHeight: 1.1})}>ДОСТУП</span></Blurb>
    <Blurb x={200} y={1195} r={175} color={G.sky} rot={6} seed="b2"><span style={{fontSize: 24}}>СПЕЦВЫПУСК</span><span>Кампусы</span><span>Huawei</span><span>Alibaba</span></Blurb>
    <Blurb x={215} y={1510} r={150} color="#FFD92E" rot={-5} seed="b3"><span style={{fontSize: 40}}>9 стран</span><span>76 программ</span></Blurb>
    <div style={abs(790, 1555, {background: "#fff", border: `4px solid ${G.ink}`, padding: "10px 12px", rotate: "3deg"})}>
      <div style={{width: 210, height: 70, background: `repeating-linear-gradient(90deg, ${G.ink} 0 5px, transparent 5px 9px, ${G.ink} 9px 11px, transparent 11px 16px, ${G.ink} 16px 20px, transparent 20px 23px)`}} />
      <div style={{...mono(20, G.ink), marginTop: 6, textAlign: "center"}}>globaltechtour.ru</div>
    </div>
    <Sfx text="轰!" x={860} y={620} size={130} color="#fff" stroke={G.ink} at={0} font={FONT.zcool} rot={12} />
    <Grain opacity={0.08} />
  </AbsoluteFill>
);

// I «403»: телефон Директора с трещиной — поиск «завод изнутри» → 403 · 进不去, рядом пропуск GTT
const CRACK2 = "M120,140 L210,260 L190,330 L260,420 M210,260 L330,240 L420,300 M190,330 L90,380 L40,470 M260,420 L250,560 M330,240 L360,150";
const GttForbidden: React.FC = () => (
  <AbsoluteFill>
    <NavyBg cy={45} />
    <SpeedLines color="rgba(125,211,252,.35)" cx={480} cy={1050} inner={480} opacity={0.6} seed="fb" />
    <div style={abs(60, 280, {width: 960, background: "#fff", border: `5px solid ${G.ink}`, padding: "16px 22px", rotate: "-2deg", boxShadow: `9px 9px 0 ${G.ink}`, ...inter(48, G.ink)})}>
      «Да я всё посмотрел <span style={{color: G.red}}>в интернете</span>»
    </div>
    {/* телефон */}
    <div style={abs(110, 480, {width: 520, height: 1040, background: G.ink, borderRadius: 64, padding: 18, rotate: "-7deg", boxShadow: `18px 18px 0 rgba(10,15,36,.6)`})}>
      <div style={{position: "relative", width: "100%", height: "100%", background: "#fff", borderRadius: 48, overflow: "hidden"}}>
        <div style={{margin: "60px 24px 0", border: `3px solid #C9D3EA`, borderRadius: 40, padding: "14px 22px", ...inter(28, "#5B6684")}}>🔍 завод SANY изнутри</div>
        <div style={{textAlign: "center", marginTop: 110, ...dela(170, G.ink, {lineHeight: 1})}}>403</div>
        <div style={{textAlign: "center", ...mono(30, G.ink)}}>FORBIDDEN</div>
        <div style={{textAlign: "center", marginTop: 40, fontFamily: FONT.zcool, fontSize: 92, color: G.red, lineHeight: 1}}>进不去！</div>
        <div style={{textAlign: "center", marginTop: 14, ...inter(32, "#5B6684")}}>Доступ запрещён</div>
        <svg width={484} height={1004} style={{position: "absolute", inset: 0}}>
          <path d={CRACK2} fill="none" stroke={G.ink} strokeWidth={4} opacity={0.75} />
          <path d={CRACK2} fill="none" stroke="#fff" strokeWidth={1.5} transform="translate(2 1)" />
        </svg>
      </div>
    </div>
    {/* пропуск GTT */}
    <div style={abs(630, 860, {width: 400, background: "#fff", border: `5px solid ${G.ink}`, borderRadius: 22, boxShadow: `12px 12px 0 ${G.blue}`, rotate: "8deg", padding: "22px 24px"})}>
      <div style={{display: "flex", alignItems: "center", gap: 12}}>
        <Img src={staticFile(CRYSTAL)} style={{width: 80, height: 80, borderRadius: "50%"}} />
        <div style={dela(32, G.ink)}>GLOBAL TECH TOUR</div>
      </div>
      <div style={{...mono(22, G.blue), marginTop: 12}}>ПРОПУСК · 通行证</div>
      <div style={{...dela(56, G.ink), marginTop: 10}}>200</div>
      <div style={inter(30, G.ink)}>Вход разрешён</div>
      <div style={{marginTop: 14, height: 40, background: `repeating-linear-gradient(90deg, ${G.ink} 0 6px, transparent 6px 10px, ${G.ink} 10px 13px, transparent 13px 19px)`}} />
    </div>
    <div style={abs(820, 760, {width: 14, height: 110, background: G.red, rotate: "8deg", border: `3px solid ${G.ink}`})} />
    <Sfx text="啪!" x={720} y={1300} size={130} color="#fff" stroke={G.ink} at={0} font={FONT.zcool} rot={10} />
    <Grain opacity={0.1} />
    <Vignette strength={0.3} />
  </AbsoluteFill>
);

// J «Чат»: переписка с заводом — «不行», «进不去！», в чат добавлен Global Tech Tour — «欢迎光临！»
const Msg: React.FC<{side: "l" | "r"; y: number; w?: number; children: React.ReactNode; avatar?: string; color?: string}> = ({side, y, w = 640, children, avatar, color}) => (
  <div style={abs(side === "l" ? 40 : 1080 - 40 - w - 100, y, {display: "flex", flexDirection: side === "l" ? "row" : "row-reverse", alignItems: "flex-start", gap: 18, width: w + 100})}>
    <div style={{width: 82, height: 82, borderRadius: 18, background: avatar ? "#fff" : side === "l" ? "#E7ECF7" : G.sky, border: `4px solid ${G.ink}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", ...dela(34, G.ink)}}>
      {avatar ? <Img src={staticFile(avatar)} style={{width: "100%", height: "100%"}} /> : side === "l" ? <span style={{fontFamily: FONT.zcool, fontSize: 50, lineHeight: 1}}>厂</span> : "Я"}
    </div>
    <div style={{background: color ?? (side === "l" ? "#fff" : "#95EC69"), border: `4px solid ${G.ink}`, borderRadius: 22, padding: "16px 22px", boxShadow: `7px 7px 0 ${G.ink}`, ...inter(40, G.ink)}}>{children}</div>
  </div>
);
const GttChat: React.FC = () => (
  <AbsoluteFill style={{background: "#EDF1FA"}}>
    <Halftone bg="#EDF1FA" dot="rgba(37,99,235,.07)" size={18} r={2.4} />
    <div style={abs(0, 250, {width: 1080, height: 110, background: G.deep, borderBottom: `5px solid ${G.ink}`, display: "flex", alignItems: "center", gap: 18, padding: "0 40px"})}>
      <div style={dela(40, "#fff")}>Завод · 工厂</div>
      <div style={mono(22, G.sky)}>в сети</div>
    </div>
    <Msg side="r" y={400} w={600}>Здравствуйте! Можно к вам на завод?</Msg>
    <Msg side="l" y={560} w={360}>
      <span style={{fontFamily: FONT.zcool, fontSize: 56, lineHeight: 1}}>不行。</span>
      <div style={inter(28, "#5B6684")}>Нельзя.</div>
    </Msg>
    <Msg side="r" y={740} w={460}>А если очень надо?</Msg>
    <Msg side="l" y={880} w={420}>
      <span style={{fontFamily: FONT.zcool, fontSize: 64, color: G.red, lineHeight: 1}}>进不去！</span>
    </Msg>
    <div style={abs(140, 1040, {width: 800, textAlign: "center", background: "rgba(10,15,36,.75)", borderRadius: 999, padding: "12px 20px", ...inter(30, "#fff")})}>Global Tech Tour добавлен в чат</div>
    <Msg side="l" y={1140} w={640} avatar={CRYSTAL} color="#fff">
      <div style={inter(26, G.blue)}>Global Tech Tour</div>
      Пропуск оформлен. Ждём у проходной ✓
    </Msg>
    <Msg side="l" y={1380} w={520}>
      <span style={{fontFamily: FONT.zcool, fontSize: 60, lineHeight: 1}}>欢迎光临！</span>
      <div style={inter(28, "#5B6684")}>Добро пожаловать!</div>
    </Msg>
    <Sfx text="哇!" x={820} y={1290} size={140} color={G.blue} stroke="#fff" at={0} font={FONT.zcool} rot={12} />
    <Grain opacity={0.06} />
  </AbsoluteFill>
);

// K «进»: огромный иероглиф кистью «войти» — как ворота, у основания группа входит внутрь, красная печать GTT
const Person: React.FC<{x: number; s: number; c: string}> = ({x, s, c}) => (
  <g transform={`translate(${x} 0) scale(${s})`}>
    <circle cx={0} cy={-118} r={16} fill={c} />
    <path d="M -20 -98 Q 0 -104 20 -98 L 24 -40 L 14 -40 L 12 0 L 2 0 L 0 -38 L -2 0 L -12 0 L -14 -40 L -24 -40 Z" fill={c} />
  </g>
);
const GttJin: React.FC = () => (
  <AbsoluteFill style={{background: G.deep}}>
    <AbsoluteFill style={{background: `radial-gradient(ellipse 600px 700px at 540px 1180px, rgba(125,211,252,.35), transparent 70%)`}} />
    <Halftone bg="transparent" dot="rgba(125,211,252,.07)" size={22} r={3} />
    <div style={abs(64, 280, mono(30, G.sky))}>GLOBAL TECH TOUR · 全球科技之旅</div>
    <div style={{position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", fontFamily: BRUSH, fontSize: 1000, lineHeight: 1, color: "#fff", textShadow: `16px 16px 0 ${G.blue}, 0 0 80px rgba(125,211,252,.55)`}}>进</div>
    <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}>
      <g transform="translate(0 1395)">
        {[[380, 0.9], [440, 1.05], [505, 0.95], [565, 1.1], [630, 0.9], [690, 1]].map(([x, s], i) => <Person key={i} x={x} s={s} c={G.ink} />)}
      </g>
    </svg>
    <div style={abs(64, 1440, {...dela(72, "#fff", {textShadow: `7px 7px 0 ${G.ink}`, whiteSpace: "nowrap"})})}>Войти туда,</div>
    <div style={abs(64, 1526, {...dela(72, G.sky, {textShadow: `7px 7px 0 ${G.ink}`, whiteSpace: "nowrap"})})}>куда не пускают</div>
    {/* пометка-перевод и печать */}
    <div style={abs(770, 420, {...inter(34, G.sky), rotate: "6deg"})}>jìn — «войти»</div>
    <div style={abs(840, 1420, {width: 180, height: 180, border: `8px solid ${G.red}`, borderRadius: 12, rotate: "-8deg", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: G.deep, boxShadow: "0 0 30px rgba(232,52,28,.45)"})}>
      <div style={dela(64, G.red, {lineHeight: 1})}>GTT</div>
      <div style={{fontFamily: FONT.zcool, fontSize: 36, color: G.red, lineHeight: 1.1}}>科技之旅</div>
    </div>
    <div style={abs(40, 360, {writingMode: "vertical-rl", fontFamily: FONT.zcool, fontSize: 44, color: "rgba(255,255,255,.75)", lineHeight: 1.1})}>别人进不去的地方，我们带你进去</div>
    <Grain opacity={0.12} />
    <Vignette strength={0.35} />
  </AbsoluteFill>
);

const COVERS = [OdHook, OdPage, AuraHook, AuraTeam, GttHook, GttPeople, GttVs, GttCampus, GttPage, GttCountries, GttKeyhole, GttMagazine, GttForbidden, GttChat, GttJin];
export const COVER_NAMES = ["od-A-hook", "od-B-glavy", "aura-A-hook", "aura-B-komanda", "gtt-A-hook", "gtt-B-pervye-lica", "gtt-C-vs", "gtt-D-kampusy", "gtt-E-stranica", "gtt-F-strany", "gtt-G-skvazhina", "gtt-H-zhurnal", "gtt-I-403", "gtt-J-chat", "gtt-K-jin"];

export const ManhuaCovers: React.FC = () => {
  const f = useCurrentFrame();
  useBrush(true);
  const Cover = COVERS[Math.min(COVERS.length - 1, f)];
  return (
    <Freeze frame={F}>
      <Cover />
    </Freeze>
  );
};
