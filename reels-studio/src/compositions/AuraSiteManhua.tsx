// Aura Robotics — «Робот с завода. Без посредников»: манхуа-ролик про сайт aura-robotics.ru (03.11.2026, сценарий пользователя
// в Claude Docs «Сценарии манхуа: Aura Robotics и Global Tech Tour», правки: звук удивления в хуке; на «Aura Robotics Tour» —
// собака танцует, рука машет и показывает «V»). 1080×1920, 30 к/с, 40 с. Стиль — манхуа «Моего сайта» (site-manhua/fx.tsx)
// в цветах Aura: пергамент, графит, лимонный маркер. Герои — наш 3D-арсенал: маскот (ведущий), робособака, гуманоид, AGV,
// роборука; скептик — чернильный силуэт (site-manhua/skeptic.tsx).
// Факты — только с сайта (экраны source-videos/aura-robotics/site/2026-11-03-сайт/): «Более половины всех промышленных роботов
// в мире устанавливается в Китае», «Более 100 производителей», «17 городов Китая», три принципа «Почему с нами дешевле», квиз
// «Подбор решения» (4 шага), Aura Robotics Tour, отзывы СоларТек, БелМол, «Просто Еда».
// clean — версия для Facebook и LinkedIn: мат знаками («нах#й», «бл@#ь»), решение пользователя «Ок, одобряю».
// Музыка Upbeat Corporate (Soundrider, CC BY 3.0) с 5 с трека: удар на 8,0 с трека приходится на 3,0 с ролика — «дроп».
import React from "react";
import {AbsoluteFill, Freeze, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {useBrush, BRUSH} from "../components/MontazhFx";
import {body} from "../fonts";
import {AuraMascot} from "../components/AuraMascot";
import {AuraDog} from "../components/AuraDog";
import {AuraHumanoidSpot} from "../components/AuraHumanoidSpot";
import {AuraBadge} from "../components/AuraBadge";
import {Stage} from "../components/aura3d/kit";
import {guestCam} from "../components/aura3d/Guests";
import {AgvModel} from "../components/aura3d/AuraAgv";
import {HandModel} from "../components/aura3d/AuraHand";
import {FONT} from "./site-manhua/fonts";
import {Skeptic} from "./site-manhua/skeptic";
import {
  Bubble, Burst, CL, CircleReveal, EIO, EO, Flash, GlitchReveal, Grain, Halftone, InkReveal, Letterbox, PageReveal, Panel, Phone, Sfx, Shot,
  SlashReveal, SpeedLines, Tape, Vignette, countText, p, sumShake, typed,
} from "./site-manhua/fx";

export const AURA_MANHUA_FRAMES = 1200;
const A = {parch: "#F8F6F3", ink: "#262626", lemon: "#FFF65D", fog: "#D9D7D5", deep: "#1C1C1C", kraft: "#BE9A62", rec: "#FF4D3D"};
const IMG = "source-videos/aura-robotics/site/2026-11-03-сайт/";
const im = (n: string) => `${IMG}${n}.jpg`;
const SFXP = "source-videos/2026-11-03-od-sait-manhua/sfx/";
// музыка v3 (выбор пользователя 04.11.2026, №78): Union Square [Edit] — Decktonic (Free Music Archive), CC BY 4.0;
// тихий брейк трека 79–82,5 с — сон маскота, удар 82,48 с = прыжок маскота (3,8 с ролика)
const MUSIC = "интернет-материалы/музыка/union-square-edit-decktonic.mp3";
// видео от пользователя (WeTransfer 03.11.2026): запуск серийного производства гуманоидов, стеллажи, роботы в цеху
const ROBOTS = "source-videos/2026-11-03-wt-hema-roboty/roboty-zavod.mp4";
const INTER = body.fontFamily;

// сцены (глобальные кадры): следующая открывается поверх предыдущей
// тайминг 03.11.2026 (v2): реплики хука держатся дольше (успеть прочитать), хвосты главы 4 и финала короче
const T = {hook: [0, 120], wake: [114, 210], fact: [204, 330], ch1: [318, 540], ch2: [528, 720], ch3: [708, 900], ch4: [888, 1068], fin: [1056, 1200]} as const;

// мат: в Instagram — как в сценарии, для Facebook и LinkedIn — знаками
const MAT: Record<string, string> = {нахуй: "нах#й", блять: "бл@#ь"};
const useMat = (clean?: boolean) => (w: keyof typeof MAT | string) => (clean ? MAT[w] ?? w : w);

const dela = (size: number, color = A.ink, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT.dela, fontSize: size, color, lineHeight: 1.04, ...extra});
const inter = (size: number, color = A.ink, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: INTER, fontWeight: 700, fontSize: size, color, lineHeight: 1.2, letterSpacing: "-0.01em", ...extra});
// лимонный маркер под словом, как «лучшие технологические решения» на сайте
const Mark: React.FC<{children: React.ReactNode; k?: number}> = ({children, k = 1}) => (
  <span style={{background: `linear-gradient(${A.lemon}, ${A.lemon}) no-repeat 0 88% / ${(k * 100).toFixed(1)}% 46%`, padding: "0 4px"}}>{children}</span>
);

const ChapterHead: React.FC<{zh: string; no: string; title: string; at?: number; dark?: boolean}> = ({zh, no, title, at = 2, dark}) => {
  const f = useCurrentFrame();
  const k = p(f, at, at + 10, EO);
  const brush = p(f, at + 6, at + 20, EO);
  return (
    <div style={{position: "absolute", left: 64, top: 262, display: "flex", alignItems: "center", gap: 24, opacity: k, translate: `${(1 - k) * -160}px 0`}}>
      <div style={{fontFamily: FONT.zcool, fontSize: 100, color: dark ? A.lemon : A.ink, lineHeight: 1}}>{zh}</div>
      <div>
        <div style={{fontFamily: FONT.mono, fontSize: 28, letterSpacing: "0.18em", color: dark ? A.parch : A.ink}}>
          <span style={{background: dark ? "transparent" : A.lemon, padding: "0 6px"}}>{no}</span>
        </div>
        <div style={dela(50, dark ? A.parch : A.ink)}>{title}</div>
      </div>
      <svg width={560} height={40} style={{position: "absolute", left: 0, top: 112, overflow: "visible"}}>
        <path d="M4,22 C120,6 260,34 420,14 C470,8 520,18 556,12" fill="none" stroke={dark ? A.parch : A.ink} strokeWidth={20} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - brush} />
        <path d="M4,22 C120,6 260,34 420,14 C470,8 520,18 556,12" fill="none" stroke={A.lemon} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - brush} />
      </svg>
    </div>
  );
};

// пергаментная «пилюля» с лимонной точкой в графитовом ободке — плашка сайта Aura
const Pill: React.FC<{x: number; y: number; at: number; rot?: number; size?: number; children: React.ReactNode; dark?: boolean}> = ({x, y, at, rot = 0, size = 34, children, dark}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 260, mass: 0.6}});
  return (
    <div style={{position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 14, background: dark ? A.ink : A.parch, border: `4px solid ${A.ink}`, borderRadius: 999, padding: "10px 24px 10px 14px", whiteSpace: "nowrap", rotate: `${rot}deg`, scale: String(1.6 - 0.6 * s), opacity: Math.min(1, s * 2), boxShadow: `7px 7px 0 ${A.ink}`}}>
      <span style={{width: size * 0.62, height: size * 0.62, borderRadius: 99, background: A.lemon, border: `4px solid ${dark ? A.parch : A.ink}`, flexShrink: 0}} />
      <span style={inter(size, dark ? A.parch : A.ink)}>{children}</span>
    </div>
  );
};

// плашка рассказчика: графит, пергаментный текст, лимонная тень
const Plate: React.FC<{x: number; y: number; w: number; at: number; size?: number; rot?: number; children: React.ReactNode; light?: boolean}> = ({x, y, w, at, size = 34, rot = 0, children, light}) => {
  const f = useCurrentFrame();
  const k = p(f, at, at + 8, EO);
  if (f < at) return null;
  return (
    <div style={{position: "absolute", left: x, top: y, width: w, background: light ? A.parch : A.ink, border: `4px solid ${A.ink}`, padding: "16px 22px", rotate: `${rot}deg`, boxShadow: `9px 9px 0 ${light ? A.ink : A.lemon}`, opacity: k, translate: `0 ${(1 - k) * 40}px`, ...inter(size, light ? A.ink : A.parch)}}>
      {children}
    </div>
  );
};

// деревянный ящик MADE IN CHINA
const Crate: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => (
  <div style={{position: "absolute", left: x, top: y, width: w, height: h}}>
    <div style={{position: "absolute", left: 18, right: -18, top: -26, height: 30, background: "#D8B985", border: `4px solid ${A.ink}`, transform: "skewX(-34deg)", transformOrigin: "0 100%"}} />
    <div style={{position: "absolute", inset: 0, background: `repeating-linear-gradient(180deg, ${A.kraft} 0 74px, #A88550 74px 80px)`, border: `5px solid ${A.ink}`, boxShadow: "inset 0 -30px 60px rgba(0,0,0,.28)"}} />
    <div style={{position: "absolute", left: 0, top: 0, width: 34, bottom: 0, background: "#A88550", borderRight: `4px solid ${A.ink}`}} />
    <div style={{position: "absolute", right: 0, top: 0, width: 34, bottom: 0, background: "#A88550", borderLeft: `4px solid ${A.ink}`}} />
    <div style={{position: "absolute", left: 0, right: 0, top: 58, textAlign: "center", fontFamily: FONT.oswald, fontSize: 58, letterSpacing: "0.12em", color: "rgba(38,38,38,.78)"}}>MADE IN CHINA</div>
    <div style={{position: "absolute", left: 0, right: 0, top: 136, textAlign: "center", fontFamily: FONT.zcool, fontSize: 66, color: "rgba(38,38,38,.72)"}}>中国制造</div>
    <div style={{position: "absolute", left: 0, right: 0, top: 232, textAlign: "center", fontFamily: FONT.mono, fontSize: 26, letterSpacing: "0.2em", color: "rgba(38,38,38,.7)"}}>↑↑ THIS SIDE UP ↑↑</div>
  </div>
);

// ── 1. Хук: маскот спит на ящике, скептик «Робот? Из Китая? Да нахуй надо!», у маскота загораются глаза — 嗯？ ────────────
const Hook: React.FC<{clean?: boolean}> = ({clean}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = useMat(clean);
  const b1 = spring({frame: f - 6, fps, config: {damping: 10, stiffness: 230, mass: 0.6}});
  const b2 = spring({frame: f - 40, fps, config: {damping: 8, stiffness: 300, mass: 0.5}});
  const nah = spring({frame: f - 46, fps, config: {damping: 7, stiffness: 320, mass: 0.5}});
  return (
    <AbsoluteFill style={{background: A.deep, translate: sumShake(f, [[40, 8, 16], [46, 12, 22], [86, 6, 10]], "hk")}}>
      <Halftone bg={A.deep} dot="rgba(255,246,93,.07)" size={20} r={3} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 520px 760px at 650px 1150px, rgba(255,246,93,${0.12 + 0.12 * p(f, 84, 94)}), transparent 70%)`}} />
      <Crate x={520} y={1290} w={460} h={330} />
      <AuraMascot plan={{stays: [{at: 0, x: 750, y: 1300, face: -0.3}], gestures: [{at: 0, kind: "sleep"}]}} scale={2.7} dpr={1.25} />
      {f < 86
        ? ["Z", "z", "z"].map((z, i) => {
            const t = (f + i * 14) % 42;
            return (
              <div key={i} style={{position: "absolute", left: 850 + t * 2.2 + i * 18, top: 560 - t * 4.2 - i * 40, fontFamily: FONT.hand, fontSize: 70 - i * 12, color: A.lemon, opacity: Math.min(1, t / 8) * (1 - t / 42)}}>
                {z}
              </div>
            );
          })
        : null}
      <Skeptic x={-80} y={1150} scale={1.25} emo={f < 40 ? "neutral" : "angry"} talk={(f >= 6 && f < 36) || (f >= 42 && f < 80)} rim={A.lemon} fill="#0E0E0E" accent={A.lemon} />
      {f >= 6 && f < 40 ? (
        <Bubble x={30} y={700} w={560} h={290} tail={[200, 540]} scale={0.3 + 0.7 * b1} opacity={Math.min(1, b1 * 2)} fill={A.parch} stroke={A.ink}>
          <div style={dela(70)}>Робот?</div>
          <div style={dela(56)}>Из Китая?</div>
        </Bubble>
      ) : null}
      {f >= 40 ? (
        <Bubble x={10} y={600} w={620} h={420} shout tail={[220, 650]} scale={0.3 + 0.7 * b2} opacity={Math.min(1, b2 * 2)} fill={A.parch} stroke={A.ink}>
          <div style={dela(70)}>Да</div>
          <div style={{...dela(92, A.ink), scale: String(f >= 46 ? 0.4 + 0.6 * nah : 0.4)}}>
            <Mark>{m("нахуй")}</Mark>
          </div>
          <div style={dela(70)}>надо!</div>
        </Bubble>
      ) : null}
      <Sfx text="嗯？" x={640} y={330} size={140} color={A.lemon} stroke={A.ink} at={86} font={FONT.zcool} rot={8} />
      <Letterbox h={110} />
    </AbsoluteFill>
  );
};

// ── 2. Маскот вскакивает: «Надо, блять! Ты людям за эту работу сколько платишь?» · собака подпрыгивает · дроп ─────────────
const Wake: React.FC<{clean?: boolean}> = ({clean}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = useMat(clean);
  const zoom = 1 + 0.14 * p(f, 0, 26, EO);
  const b = spring({frame: f - 8, fps, config: {damping: 8, stiffness: 300, mass: 0.5}});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[0, 14, 30], [8, 10, 18], [36, 6, 10]], "wk")}}>
      <AbsoluteFill style={{scale: String(zoom), transformOrigin: "540px 1200px"}}>
        <Halftone bg={A.lemon} dot="rgba(38,38,38,.14)" />
        <SpeedLines color={A.ink} cx={540} cy={1200} inner={440} opacity={0.9} seed="w1" />
        <Burst x={540} y={1240} r={430} color={A.parch} stroke={A.ink} rot={f * 0.6} seed="wb" points={20} />
        <AuraMascot plan={{stays: [{at: 0, x: 540, y: 1570, face: 0}], gestures: [{at: 0.05, kind: "jump"}, {at: 1.95, kind: "point"}]}} scale={2.0} dpr={1.5} />
        <AuraDog x={880} y={1590} scale={1.7} face={-2.5} hops={[0.25, 1.15, 2.05]} />
      </AbsoluteFill>
      {f >= 8 ? (
        <Bubble x={40} y={262} w={1000} h={560} shout tail={[500, 720]} scale={0.3 + 0.7 * b} opacity={Math.min(1, b * 2)} fill="#fff" stroke={A.ink}>
          <div style={dela(112)}>
            Надо, <Mark>{m("блять")}!</Mark>
          </div>
          <div style={{...inter(48), marginTop: 18, opacity: p(f, 32, 38)}}>Ты людям за эту работу</div>
          <div style={{...inter(48), opacity: p(f, 36, 42)}}>сколько платишь?</div>
        </Bubble>
      ) : null}
      <Sfx text="咚!" x={60} y={900} size={130} color={A.parch} stroke={A.ink} at={1} font={FONT.zcool} rot={-10} until={40} />
      <Sfx text="汪！" x={800} y={1250} size={110} color={A.parch} stroke={A.ink} at={12} font={FONT.zcool} rot={12} />
      <Flash at={0} dur={6} />
    </AbsoluteFill>
  );
};

// ── 3. Факт с сайта во взрыве-звезде, маскот показывает рукой ───────────────────────────────────────────────────────────
const Fact: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sl = (at: number) => spring({frame: f - at, fps, config: {damping: 11, stiffness: 300, mass: 0.6}});
  const pop = (at: number): React.CSSProperties => ({scale: String(f >= at ? 1.8 - 0.8 * sl(at) : 0), opacity: f >= at ? 1 : 0});
  return (
    <AbsoluteFill style={{translate: sumShake(f, [[4, 8, 14], [20, 12, 20], [44, 6, 10]], "fa")}}>
      <Halftone bg={A.parch} dot="rgba(38,38,38,.08)" />
      <SpeedLines color={A.ink} cx={540} cy={800} inner={540} opacity={0.5} seed="f1" />
      <Burst x={540} y={790} r={520 * (0.4 + 0.6 * sl(0))} color={A.lemon} stroke={A.ink} sw={10} rot={f * 0.3} points={22} seed="fb" />
      <div style={{position: "absolute", left: 0, right: 0, top: 520, textAlign: "center"}}>
        <div style={{...dela(84), ...pop(4)}}>Больше половины</div>
        <div style={{...inter(56), marginTop: 14, ...pop(10)}}>всех промышленных</div>
        <div style={{...inter(56), ...pop(14)}}>роботов в мире</div>
        <div style={{display: "inline-block", marginTop: 22, background: A.ink, padding: "10px 30px", rotate: "-3deg", boxShadow: `10px 10px 0 ${A.parch}`, ...pop(20)}}>
          <span style={dela(100, A.lemon)}>ставят в Китае</span>
        </div>
      </div>
      <Sfx text="轰!" x={60} y={300} size={130} color={A.parch} stroke={A.ink} at={20} font={FONT.zcool} rot={12} />
      {/* настоящий завод: стеллажи с гуманоидами → роботы идут по цеху (видео от пользователя) */}
      <Panel x={48} y={1150} w={984} h={384} at={40} from="bottom" bg={A.ink} rot={-1}>
        <Sequence from={40} layout="none">
          <OffthreadVideo src={staticFile(ROBOTS)} trimBefore={Math.round(5.9 * fps)} muted style={{position: "absolute", left: 0, top: -50, width: 984, height: 467, objectFit: "cover", scale: String(1 + 0.08 * p(f, 40, 126))}} />
        </Sequence>
        <div style={{position: "absolute", left: 18, bottom: 16, background: A.lemon, border: `3px solid ${A.ink}`, padding: "4px 14px", fontFamily: FONT.mono, fontSize: 24, color: A.ink}}>ЗАВОД ГУМАНОИДОВ · 工厂</div>
      </Panel>
      <Plate x={48} y={1080} w={700} at={58} size={34} rot={-1.5}>
        Мы работаем там, где их делают, — и привозим <span style={{color: A.lemon}}>по заводской цене</span>
      </Plate>
      <AuraMascot plan={{stays: [{at: 0, x: 900, y: 1580, face: -0.5}], gestures: [{at: 0.4, kind: "pointUp"}, {at: 2.5, kind: "nod"}]}} scale={1.2} dpr={1.5} />
    </AbsoluteFill>
  );
};

// ── 4. 第一话 «Почему дешевле»: три панели — завод без посредников, наценка рвётся, видео с серийным номером ──────────────
const STAMPS = ["СКЛАД", "ШОУРУМ", "ИМПОРТЁР"];
const Ch1: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tear = p(f, 104, 116, EO);
  const rec = Math.floor(f / 12) % 2 === 0;
  const r1 = {left: 0, top: 0, width: 984, height: 360, floor: 330, k: 110};
  const r3 = {left: 0, top: 0, width: 480, height: 360, floor: 352, k: 300};
  return (
    <AbsoluteFill style={{background: A.parch}}>
      <Halftone bg={A.parch} dot="rgba(38,38,38,.07)" size={18} r={2.6} />
      <AbsoluteFill style={{translate: sumShake(f, [[40, 6, 10], [50, 6, 10], [60, 6, 10], [104, 12, 20], [128, 6, 10]], "c1")}}>
        <ChapterHead zh="第一话" no="ГЛАВА 1" title="Почему дешевле" />
        {/* ① AGV выезжает из ворот завода, посредники перечёркнуты */}
        <Panel x={48} y={440} w={984} h={360} at={12} from="left" bg="#EDEBE7">
          <div style={{position: "absolute", left: 0, right: 0, top: 330, height: 30, background: A.fog, borderTop: `4px solid ${A.ink}`}} />
          <div style={{position: "absolute", left: 40, top: 40, width: 290, height: 290, border: `6px solid ${A.ink}`, borderBottom: "none", background: "repeating-linear-gradient(90deg, rgba(38,38,38,.08) 0 18px, transparent 18px 36px)"}} />
          <div style={{position: "absolute", left: 22, top: 12, width: 326, height: 56, background: A.ink, color: A.lemon, display: "flex", alignItems: "center", justifyContent: "center", gap: 18}}>
            <span style={{fontFamily: FONT.zcool, fontSize: 42}}>工厂</span>
            <span style={{fontFamily: FONT.mono, fontSize: 26, letterSpacing: "0.2em"}}>ЗАВОД</span>
          </div>
          <Sequence from={12} layout="none">
            <Stage cam={guestCam(r1, 0, 0.5)} left={0} top={0} width={r1.width} height={r1.height} dpr={1.5}>
              <AgvModel plan={{stays: [{at: 0, x: -2.9, z: 0, yaw: 0}, {at: 0.3, x: -2.9, z: 0, yaw: 0}, {at: 2.2, x: 0.6, z: 0, yaw: 0}], boxes: 1}} />
            </Stage>
          </Sequence>
          {/* передняя стойка ворот — поверх AGV */}
          <div style={{position: "absolute", left: 34, top: 40, width: 18, height: 290, background: A.ink}} />
          {STAMPS.map((s, i) => {
            const at = 40 + i * 10;
            if (f < at) return null;
            const k = spring({frame: f - at, fps, config: {damping: 9, stiffness: 320, mass: 0.5}});
            const cross = p(f, at + 14, at + 20, EO);
            return (
              <div key={s} style={{position: "absolute", left: 600 + (i % 2) * 70, top: 26 + i * 70, rotate: `${-8 + i * 6}deg`, scale: String(2 - k), opacity: Math.min(1, k * 2)}}>
                <div style={{border: `5px solid ${A.ink}`, padding: "4px 18px", fontFamily: FONT.oswald, fontSize: 44, letterSpacing: "0.1em", color: A.ink, background: "rgba(248,246,243,.85)"}}>{s}</div>
                <svg width={300} height={70} style={{position: "absolute", left: -20, top: -6, overflow: "visible"}}>
                  <path d="M0,62 L300,4" stroke={A.ink} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - cross} />
                  <path d="M0,62 L300,4" stroke={A.lemon} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - cross} />
                </svg>
              </div>
            );
          })}
        </Panel>
        <Plate x={48} y={818} w={984} at={30} size={36}>
          Закупаем <span style={{color: A.lemon}}>на заводе</span> — без склада, шоурума и импортёра
        </Plate>
        {/* ② печать НАЦЕНКА рвётся пополам */}
        <Panel x={48} y={958} w={480} h={340} at={84} from="bottom" bg={A.lemon}>
          <SpeedLines color="rgba(38,38,38,.35)" cx={240} cy={160} inner={140} n={60} seed="p2" />
          {[0, 1].map((half) => (
            <div key={half} style={{position: "absolute", left: 90, top: 30, width: 300, height: 300, clipPath: half ? "polygon(52% 0, 100% 0, 100% 100%, 46% 100%, 55% 78%, 44% 60%, 56% 42%, 45% 22%)" : "polygon(0 0, 52% 0, 45% 22%, 56% 42%, 44% 60%, 55% 78%, 46% 100%, 0 100%)", translate: `${(half ? 1 : -1) * 70 * tear}px ${30 * tear}px`, rotate: `${(half ? 1 : -1) * 16 * tear}deg`}}>
              <div style={{position: "absolute", inset: 0, borderRadius: "50%", border: `12px solid ${A.ink}`, background: A.parch, rotate: "-12deg", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
                <div style={dela(46)}>НАЦЕНКА</div>
                <div style={dela(96)}>+%</div>
              </div>
            </div>
          ))}
          <Sfx text="嘶啦!" x={260} y={18} size={84} color={A.parch} stroke={A.ink} at={104} font={FONT.zcool} rot={10} />
        </Panel>
        <Pill x={48} y={1456} at={122} size={23} rot={-2} dark>Нет опыта ВЭД — сопровождаем</Pill>
        {/* ③ роборука показывает на серийный номер, рамка REC */}
        <Panel x={552} y={958} w={480} h={340} at={128} from="right" bg={A.deep}>
          <div style={{position: "absolute", left: 40, top: 150, width: 200, height: 150, background: A.kraft, border: `5px solid ${A.ink}`}} />
          <div style={{position: "absolute", left: 58, top: 186, padding: "8px 12px", background: A.ink, border: `3px solid ${A.lemon}`, fontFamily: FONT.mono, fontSize: 24, color: A.lemon, lineHeight: 1.2}}>
            S/N
            <br />
            AR·0417
          </div>
          <Sequence from={128} layout="none">
            <Stage cam={guestCam(r3, 0, 0.3)} left={0} top={0} width={r3.width} height={r3.height} dpr={1.5}>
              <HandModel
                plan={{
                  keys: [
                    {at: 0, pose: "open", p: [-0.45, 0.05, 0], rot: [0, 0.4, 0]},
                    {at: 0.5, pose: "point", p: [-0.3, 0.08, 0.1], rot: [0.2, 0.3, -1.15]},
                  ],
                }}
              />
            </Stage>
          </Sequence>
          {/* видоискатель */}
          {[[16, 16, "0 0"], [404, 16, "1 0"], [16, 264, "0 1"], [404, 264, "1 1"]].map(([x, y, c], i) => (
            <div key={i} style={{position: "absolute", left: x as number, top: y as number, width: 60, height: 60, borderLeft: c.toString()[0] === "0" ? `6px solid ${A.lemon}` : "none", borderRight: c.toString()[0] === "1" ? `6px solid ${A.lemon}` : "none", borderTop: c.toString()[2] === "0" ? `6px solid ${A.lemon}` : "none", borderBottom: c.toString()[2] === "1" ? `6px solid ${A.lemon}` : "none"}} />
          ))}
          <div style={{position: "absolute", left: 40, top: 34, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.mono, fontSize: 26, color: A.parch}}>
            <span style={{width: 20, height: 20, borderRadius: 99, background: A.rec, opacity: rec ? 1 : 0.2}} />
            REC
          </div>
          <div style={{position: "absolute", right: 40, top: 34, fontFamily: FONT.mono, fontSize: 24, color: A.parch}}>
            00:0{Math.min(9, Math.floor(Math.max(0, f - 128) / 30))}:{String(Math.floor(Math.max(0, f - 128) % 30) * 3).padStart(2, "0")}
          </div>
        </Panel>
        <Plate x={48} y={1318} w={480} at={96} size={28}>
          Ввоз — <span style={{color: A.lemon}}>на вашу компанию</span>. Это и убирает наценку
        </Plate>
        <Plate x={552} y={1318} w={480} at={142} size={26}>
          <span style={{color: A.lemon}}>Доказательства вместо обещаний:</span> видео тестового прогона вашего экземпляра с серийным номером
        </Plate>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 5. 第二话 «Что на сайте»: каталог в телефоне, категории веером, гуманоид выходит из экрана, счётчики ─────────────────────
const CATS = ["Гуманоиды", "Робособаки", "AGV", "Коботы", "Сварочные", "Роботизированные кухни", "Фасовка", "Мойка"];
const Ch2: React.FC = () => {
  const f = useCurrentFrame();
  const out = p(f, 92, 108, EO);
  return (
    <AbsoluteFill style={{background: A.deep}}>
      <Halftone bg={A.deep} dot="rgba(255,246,93,.07)" size={20} r={3} />
      <SpeedLines color="rgba(255,246,93,.5)" cx={790} cy={900} inner={420} opacity={0.6} seed="c2" />
      <AbsoluteFill style={{translate: sumShake(f, [[96, 10, 18], [124, 6, 10], [140, 6, 10]], "c2s")}}>
        <ChapterHead zh="第二话" no="ГЛАВА 2" title="Что на сайте" dark />
        <AbsoluteFill style={{perspective: 1800}}>
          <div style={{position: "absolute", left: 540, top: 440, transform: `rotateY(-14deg) rotateZ(3deg) scale(${1 - 0.1 * out})`, transformOrigin: "50% 40%", opacity: 1 - 0.45 * out}}>
            <Phone w={490} imgs={[im("catalog-1"), im("catalog-2"), im("catalog-3")]} mode="swap" keys={[[0, 0], [54, 1], [84, 2]]} url="aura-robotics.ru" glareAt={20} />
          </div>
        </AbsoluteFill>
        {CATS.map((c, i) => (
          <Pill key={c} x={48 + (i % 2) * 26} y={450 + i * 80} at={14 + i * 7} rot={i % 2 ? 2 : -2} size={c.length > 12 ? 27 : 32}>
            {c}
          </Pill>
        ))}
        {/* гуманоид выходит из экрана и машет */}
        {f >= 92 ? (
          <div style={{position: "absolute", inset: 0, scale: String(0.35 + 0.65 * out), transformOrigin: "790px 1000px", opacity: Math.min(1, (f - 92) / 4)}}>
            <AuraHumanoidSpot plan={{stays: [{at: 0, x: 800, face: -Math.PI / 2}], gestures: [{at: 3.55, kind: "wave"}]}} y={1520} scale={2.0} dpr={1.5} />
          </div>
        ) : null}
        <Sfx text="唰!" x={580} y={560} size={120} color={A.lemon} stroke={A.ink} at={96} font={FONT.zcool} rot={-10} />
        {f >= 120 ? (
          <div style={{position: "absolute", left: 48, top: 1130}}>
            <div style={{position: "relative", ...dela(120, A.lemon), textShadow: `7px 7px 0 ${A.ink}, -2px -2px 0 ${A.ink}`}}>{countText(f, 120, 18, 100, "", "+")}</div>
            <div style={{position: "relative", marginTop: 16, ...inter(38, A.parch)}}>производителей</div>
          </div>
        ) : null}
        {f >= 138 ? (
          <div style={{position: "absolute", left: 60, top: 1380, display: "flex", alignItems: "baseline", gap: 18}}>
            <span style={dela(100, A.lemon)}>{countText(f, 138, 14, 17)}</span>
            <span style={inter(38, A.parch)}>городов Китая</span>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 6. 第三话 «Посчитай за минуту»: квиз — 4 шага, маскот отмечает, собака на задних лапах; «Срок окупаемости: ?» ────────────
const STEPS = ["Отрасль", "Задача", "Сколько людей", "Зарплата"];
const Ch3: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const gone = p(f, 130, 142, EIO);
  const sk = spring({frame: f - 138, fps, config: {damping: 12, stiffness: 200, mass: 0.7}});
  const bub = spring({frame: f - 146, fps, config: {damping: 10, stiffness: 230, mass: 0.6}});
  const q = spring({frame: f - 100, fps, config: {damping: 7, stiffness: 260, mass: 0.6}});
  return (
    <AbsoluteFill style={{background: A.parch}}>
      <Halftone bg={A.parch} dot="rgba(38,38,38,.07)" size={18} r={2.6} />
      <AbsoluteFill style={{translate: sumShake(f, [[30, 5, 8], [50, 5, 8], [70, 5, 8], [90, 5, 8], [100, 12, 20]], "c3")}}>
        <ChapterHead zh="第三话" no="ГЛАВА 3" title="Посчитай за минуту" />
        <div style={{position: "absolute", left: 60, top: 440, rotate: "-4deg", translate: `${-760 * gone}px 0`}}>
          <Phone w={400} imgs={[im("quiz-1")]} mode="swap" url="aura-robotics.ru" tapAt={[[26, 263, 740]]} />
        </div>
        {STEPS.map((s, i) => {
          const at = 30 + i * 20;
          const done = p(f, at, at + 6, EO);
          return (
            <div key={s} style={{position: "absolute", left: 500, top: 458 + i * 112, width: 380, height: 92, display: "flex", alignItems: "center", gap: 18, background: done > 0.5 ? A.ink : "#fff", border: `4px solid ${A.ink}`, borderRadius: 20, padding: "0 18px", boxShadow: `7px 7px 0 ${A.ink}`, opacity: p(f, 6 + i * 4, 14 + i * 4), translate: `${(1 - p(f, 6 + i * 4, 14 + i * 4, EO)) * 200}px 0`}}>
              <div style={{width: 58, height: 58, borderRadius: 99, border: `4px solid ${done > 0.5 ? A.lemon : A.ink}`, background: done > 0.5 ? A.lemon : A.parch, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0}}>
                {done > 0 ? (
                  <svg width={40} height={40} viewBox="0 0 40 40">
                    <path d="M6,21 L16,31 L34,9" fill="none" stroke={A.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - done} />
                  </svg>
                ) : (
                  <span style={inter(28)}>{i + 1}</span>
                )}
              </div>
              <span style={inter(36, done > 0.5 ? A.parch : A.ink)}>{s}</span>
              {i < 3 ? <span style={{position: "absolute", left: 40, top: 92, fontFamily: FONT.mono, fontSize: 22, color: A.ink}}>↓</span> : null}
            </div>
          );
        })}
        <AuraMascot plan={{stays: [{at: 0, x: 970, y: 900, face: -0.9}], gestures: [{at: 0.85, kind: "tick"}, {at: 1.52, kind: "tick"}, {at: 2.18, kind: "tick"}, {at: 2.85, kind: "tick"}, {at: 3.8, kind: "jump"}]}} scale={0.95} dpr={2} />
        {f >= 100 ? (
          <div style={{position: "absolute", left: 480, top: 940, width: 552, height: 240, background: A.ink, border: `5px solid ${A.ink}`, borderRadius: 26, boxShadow: `10px 10px 0 ${A.lemon}`, scale: String(1.3 - 0.3 * q), display: "flex", alignItems: "center", padding: "0 30px", gap: 16}}>
            <div style={inter(44, A.parch)}>
              Срок
              <br />
              окупаемости:
            </div>
            <div style={{...dela(170, A.lemon), rotate: `${Math.sin(f / 5) * 10}deg`, marginLeft: "auto"}}>?</div>
          </div>
        ) : null}
        <Plate x={60} y={1330} w={700} at={110} size={34} light>
          За минуту узнайте, <Mark>сколько стоит робот</Mark> под вашу задачу — и когда он окупится
        </Plate>
        <AuraDog x={920} y={1530} scale={1.45} face={-2.5} stands={[{at: 0.9, dur: 4.6}]} />
        {f >= 138 ? (
          <div style={{position: "absolute", inset: 0, translate: `${(1 - sk) * -500}px 0`}}>
            <Skeptic x={-40} y={860} scale={0.82} emo="sweat" talk={f >= 146 && f < 180} rim={A.parch} fill={A.ink} accent={A.lemon} />
          </div>
        ) : null}
        {f >= 146 ? (
          <Bubble x={30} y={450} w={440} h={330} tail={[190, 440]} scale={0.3 + 0.7 * bub} opacity={Math.min(1, bub * 2)} fill="#fff" stroke={A.ink}>
            <div style={dela(42)}>Ну окей…</div>
            <div style={{...dela(44), marginTop: 6}}>а вживую</div>
            <div style={dela(44)}>посмотреть?</div>
          </Bubble>
        ) : null}
        <Sfx text="叮!" x={880} y={760} size={100} color={A.lemon} stroke={A.ink} at={102} font={FONT.zcool} rot={10} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 7. 第四话 «Aura Robotics Tour»: полароиды-отзывы на скотче, собака танцует, рука машет и показывает «V» ───────────────────
const POLA: {x: number; y: number; w: number; rot: number; at: number; src: string; crop: [number, number, number, number]; cap: string}[] = [
  {x: 40, y: 540, w: 450, rot: -6, at: 20, src: "cases-1", crop: [114, 880, 748, 560], cap: "СоларТек: Leju, Robotera, AgiBot, Kepler — за 5 дней"},
  {x: 572, y: 640, w: 450, rot: 5, at: 46, src: "cases-2", crop: [112, 1096, 748, 560], cap: "БелМол: Kepler, автоматизация молочного производства"},
  {x: 110, y: 1010, w: 410, rot: -3, at: 72, src: "cases-3", crop: [112, 1460, 748, 556], cap: "Просто Еда: встреча с основателем завода"},
];
const Ch4: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rh = {left: 0, top: 0, width: 480, height: 440, floor: 430, k: 300};
  const wave = (t: number): [number, number, number] => [0, 0.25, Math.sin(t * 9) * 0.38];
  return (
    <AbsoluteFill style={{background: A.lemon}}>
      <Halftone bg={A.lemon} dot="rgba(38,38,38,.12)" />
      <SpeedLines color={A.ink} cx={540} cy={980} inner={560} opacity={0.35} seed="c4" />
      <AbsoluteFill style={{translate: sumShake(f, [[20, 6, 10], [46, 6, 10], [72, 6, 10], [126, 8, 12]], "c4s")}}>
        <ChapterHead zh="第四话" no="ГЛАВА 4" title="Aura Robotics Tour" />
        <Plate x={48} y={420} w={984} at={8} size={34}>
          <span style={{color: A.lemon}}>Закрытые визиты на заводы</span>, перевод, наши инженеры рядом
        </Plate>
        {POLA.map((P) => {
          if (f < P.at) return null;
          const s = spring({frame: f - P.at, fps, config: {damping: 12, stiffness: 200, mass: 0.7}});
          const pw = P.w - 36;
          const ph = Math.round(pw * 0.72);
          return (
            <div key={P.src} style={{position: "absolute", left: P.x, top: P.y, width: P.w, background: "#fff", padding: 18, paddingBottom: 14, boxShadow: "10px 14px 0 rgba(38,38,38,.35)", border: `3px solid ${A.ink}`, rotate: `${P.rot + (1 - s) * 18}deg`, scale: String(1.5 - 0.5 * s), translate: `0 ${(1 - s) * -300}px`}}>
              <div style={{width: pw, height: ph, overflow: "hidden", position: "relative", border: `2px solid ${A.ink}`}}>
                <Shot src={im(P.src)} crop={P.crop} w={pw} h={ph} zoom={1 + 0.05 * p(f, P.at, 192)} />
              </div>
              <div style={{marginTop: 10, fontFamily: FONT.hand, fontSize: 36, lineHeight: 1.05, color: A.ink}}>{P.cap}</div>
              <div style={{position: "absolute", left: "50%", top: -20, width: 150, height: 42, marginLeft: -75, background: "rgba(38,38,38,.82)", rotate: `${-P.rot * 0.8 + 4}deg`, clipPath: "polygon(3% 0, 97% 6%, 100% 50%, 96% 100%, 4% 94%, 0 50%)"}} />
            </div>
          );
        })}
        <AuraDog x={320} y={1545} scale={1.35} face={-0.6} dances={[{at: 1.1, dur: 4}]} />
        <Sequence from={0} layout="none">
          <Stage cam={guestCam(rh, 0, 0.2)} left={580} top={1100} width={rh.width} height={rh.height} dpr={1.5}>
            <HandModel
              plan={{
                keys: [
                  {at: 0, pose: "open", p: [0.05, 0.1, 0], rot: wave(0)},
                  ...Array.from({length: 12}, (_, i) => ({at: 0.8 + i * 0.18, pose: "open" as const, rot: wave(0.8 + i * 0.18 + 0.17)})),
                  {at: 3.2, pose: "peace", rot: [0, 0.25, 0.08]},
                  {at: 6, pose: "peace", rot: [0, 0.25, -0.04]},
                ],
              }}
            />
          </Stage>
        </Sequence>
        <Sfx text="耶!" x={600} y={1110} size={100} color={A.parch} stroke={A.ink} at={98} font={FONT.zcool} rot={-8} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 8. Финал: вся команда на линиях концентрации, печать Aura, «Ладно, блять. Убедили.», кнопка сайта, 下一站：工厂 ─────────────
const Fin: React.FC<{clean?: boolean}> = ({clean}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = useMat(clean);
  const b1 = spring({frame: f - 10, fps, config: {damping: 10, stiffness: 230, mass: 0.6}});
  const b2 = spring({frame: f - 40, fps, config: {damping: 10, stiffness: 230, mass: 0.6}});
  const btn = spring({frame: f - 70, fps, config: {damping: 9, stiffness: 260, mass: 0.6}});
  const tap = p(f, 100, 112);
  const ra = {left: 0, top: 0, width: 440, height: 280, floor: 268, k: 92};
  return (
    <AbsoluteFill style={{background: A.deep, translate: sumShake(f, [[4, 10, 18], [70, 8, 14], [130, 10, 16]], "fin")}}>
      {/* за командой — армия гуманоидов с запуска производства (видео от пользователя), приглушена */}
      <OffthreadVideo src={staticFile(ROBOTS)} muted style={{position: "absolute", left: -1000, top: 0, width: 3080, height: 1920, objectFit: "cover", filter: "grayscale(.55) brightness(.42) contrast(1.15)", scale: String(1.05 + 0.04 * p(f, 0, 156))}} />
      <AbsoluteFill style={{background: "linear-gradient(180deg, rgba(28,28,28,.55), rgba(28,28,28,.2) 45%, rgba(28,28,28,.85))"}} />
      <Halftone bg="transparent" dot="rgba(255,246,93,.10)" size={20} r={3} />
      <SpeedLines color={A.lemon} cx={540} cy={1250} inner={500} opacity={0.55} seed="fi" />
      <div style={{position: "absolute", left: 540 - 200, top: 1090, opacity: p(f, 6, 16)}}>
        <AuraBadge size={400} />
      </div>
      <Panel x={48} y={250} w={360} h={330} at={4} bg={A.parch}>
        <Skeptic x={-14} y={30} scale={0.82} emo="calm" talk={f >= 10 && f < 40} rim={A.ink} fill={A.ink} accent={A.lemon} />
      </Panel>
      {f >= 10 ? (
        <Bubble x={420} y={262} w={620} h={290} tail={[-20, 200]} scale={0.3 + 0.7 * b1} opacity={Math.min(1, b1 * 2)} fill="#fff" stroke={A.ink}>
          <div style={dela(60)}>
            Ладно, <Mark>{m("блять")}.</Mark>
          </div>
          <div style={dela(60)}>Убедили.</div>
        </Bubble>
      ) : null}
      {f >= 40 ? (
        <Bubble x={60} y={600} w={960} h={240} tail={[800, 300]} scale={0.3 + 0.7 * b2} opacity={Math.min(1, b2 * 2)} fill={A.parch} stroke={A.ink}>
          <div style={inter(46)}>Опиши задачу —</div>
          <div style={inter(46)}>
            <Mark>подберём завод и модель</Mark>
          </div>
        </Bubble>
      ) : null}
      {f >= 70 ? (
        <div style={{position: "absolute", left: 110, top: 868, width: 600, height: 98, borderRadius: 999, background: "#111", border: `4px solid ${A.parch}`, boxShadow: `0 0 ${30 + 20 * Math.sin(f / 6)}px rgba(255,246,93,.55), 9px 9px 0 ${A.lemon}`, display: "flex", alignItems: "center", justifyContent: "center", scale: String((1.4 - 0.4 * btn) * (1 - 0.06 * Math.sin(tap * Math.PI))), opacity: Math.min(1, btn * 2)}}>
          <span style={inter(52, A.parch)}>{typed(f, 74, "aura-robotics.ru", 2)}</span>
        </div>
      ) : null}
      {tap > 0 && tap < 1 ? <div style={{position: "absolute", left: 630 - 46, top: 917 - 46, width: 92, height: 92, borderRadius: 99, border: `7px solid ${A.lemon}`, scale: String(0.6 + tap), opacity: 1 - tap}} /> : null}
      <div style={{position: "absolute", left: 116, top: 990, opacity: p(f, 84, 94)}}>
        <span style={{fontFamily: BRUSH, fontSize: 58, color: A.lemon, textShadow: `4px 4px 0 ${A.ink}`}}>下一站：工厂</span>
        <span style={{marginLeft: 16, fontFamily: FONT.mono, fontSize: 24, color: A.parch}}>следующая остановка — завод</span>
      </div>
      <Stage cam={guestCam(ra, 0, 0.6)} left={-10} top={1262} width={ra.width} height={ra.height} dpr={1.5}>
        <AgvModel plan={{stays: [{at: 0, x: -4.2, z: 0, yaw: 0}, {at: 1.4, x: -0.6, z: 0, yaw: 0.25}], boxes: 2, lift: [[1.6, 0], [2.1, 1]]}} />
      </Stage>
      <AuraDog x={380} y={1530} scale={1.25} face={-0.6} hops={[0.6, 1.6, 3.4]} />
      <AuraMascot plan={{stays: [{at: 0, x: 580, y: 1530, face: 0}], gestures: [{at: 0.4, kind: "present"}, {at: 2.2, kind: "wave"}]}} scale={1.35} dpr={1.5} />
      <AuraHumanoidSpot plan={{stays: [{at: 0, x: 840, face: -Math.PI / 2}], gestures: [{at: 0.5, kind: "wave"}, {at: 3.2, kind: "pointUp"}]}} y={1530} scale={1.4} dpr={1.5} />
      <Letterbox h={140 * p(f, 118, 142, EIO)} />
    </AbsoluteFill>
  );
};

// звуки по сценам: [кадр сцены, файл, громкость]
// звуки v2 (03.11.2026: «больше разных звуков»): "@имя" — библиотека интернет-материалы/звуки/ (CC0 / CC BY), "@zvukitop/zt-…" — zvukitop.com
const SC: Record<keyof typeof T, [number, string, number][]> = {
  hook: [[6, "@pop-2", 0.45], [40, "@impact-3", 0.45], [40, "@zvukitop/zt-slap", 0.35], [46, "@zvukitop/zt-cinema-hit", 0.35], [84, "@robot-1", 0.5], [86, "anime-wow", 0.55], [86, "@beep-1", 0.35]],
  wake: [[0, "@impact-1", 0.7], [2, "@whoosh-4", 0.5], [8, "@pop-1", 0.45], [10, "@servo-1", 0.4], [12, "@boing-1", 0.35], [34, "@click-2", 0.3], [38, "@boing-1", 0.3], [62, "@boing-1", 0.3]],
  fact: [[0, "@whoosh-1", 0.5], [4, "@impact-4", 0.35], [20, "@boom-1", 0.5], [40, "@swipe-1", 0.45], [42, "@servo-2", 0.35], [58, "@whoosh-3", 0.4], [70, "@robot-1", 0.3]],
  ch1: [[0, "@flip-1", 0.6], [12, "@swipe-1", 0.45], [14, "@servo-1", 0.35], [40, "@stamp-1", 0.5], [50, "@stamp-1", 0.5], [60, "@stamp-1", 0.5], [54, "@whoosh-3", 0.3], [64, "@whoosh-3", 0.3], [74, "@whoosh-3", 0.3], [84, "@whoosh-2", 0.4], [104, "@tear-1", 0.8], [122, "@pop-1", 0.45], [128, "@whoosh-2", 0.4], [132, "@zvukitop/zt-shutter", 0.4], [134, "@beep-1", 0.3]],
  ch2: [[0, "@glitch-1", 0.55], ...Array.from({length: 8}, (_, i) => [14 + i * 7, i % 2 ? "@click-2" : "@pop-1", 0.33] as [number, string, number]), [54, "@click-1", 0.3], [84, "@click-1", 0.3], [92, "@whoosh-4", 0.55], [96, "@servo-2", 0.4], [120, "@coin-2", 0.4], [138, "@coin-1", 0.4]],
  ch3: [[0, "@flip-1", 0.6], [26, "@click-1", 0.5], [30, "@zvukitop/zt-click", 0.55], [50, "@zvukitop/zt-click", 0.55], [70, "@zvukitop/zt-click", 0.55], [90, "@zvukitop/zt-click", 0.55], [92, "@ding-2", 0.25], [100, "@cash-1", 0.5], [138, "@whoosh-2", 0.4], [146, "@pop-2", 0.4]],
  ch4: [[0, "@whoosh-1", 0.5], [8, "@whoosh-3", 0.35], [20, "@shutter-1", 0.45], [46, "@shutter-1", 0.45], [72, "@shutter-1", 0.45], [36, "@servo-2", 0.3], [96, "@success-1", 0.4], [98, "@cheer-1", 0.3]],
  fin: [[0, "@whoosh-4", 0.5], [6, "@impact-2", 0.55], [10, "@pop-2", 0.4], [40, "@pop-1", 0.4], [70, "@boom-1", 0.4], [74, "@typing-1", 0.35], [100, "@click-1", 0.5], [104, "@ding-1", 0.4], [122, "@impact-1", 0.5]],
};
// звук: "whoosh" — @remotion/sfx (source-videos/2026-11-03-od-sait-manhua/sfx/), "@whoosh-2" — библиотека интернет-материалы/звуки/ (CC0 / CC BY, авторы — АВТОРЫ.md)
const sfxSrc = (n: string) => (n.startsWith("@") ? `интернет-материалы/звуки/${n.slice(1)}.wav` : `${SFXP}${n}.wav`);
const SOUNDS: [number, string, number][] = (Object.keys(SC) as (keyof typeof T)[]).flatMap((k) => SC[k].map(([at, n, v]) => [T[k][0] + at, n, v] as [number, string, number]));

// мат знаками во всех версиях (решение пользователя 03.11.2026: «все слова матершинные в роликах надо сделать такими, как в роликах для Фейсбук»)
export const AuraSiteManhua: React.FC<{clean?: boolean}> = ({clean = true}) => {
  useBrush(true);
  const {fps} = useVideoConfig();
  const f = useCurrentFrame();
  const S = (k: keyof typeof T) => ({from: T[k][0], durationInFrames: T[k][1] - T[k][0], premountFor: fps});
  return (
    <AbsoluteFill style={{background: A.deep, overflow: "hidden"}}>
      <Sequence {...S("hook")}>
        <Hook clean={clean} />
      </Sequence>
      <Sequence {...S("wake")}>
        <Wake clean={clean} />
      </Sequence>
      <Sequence {...S("fact")}>
        <SlashReveal dur={12} color={A.lemon}>
          <Fact />
        </SlashReveal>
      </Sequence>
      <Sequence {...S("ch1")}>
        <InkReveal dur={12} id="au1" x={540} y={1000}>
          <Ch1 />
        </InkReveal>
      </Sequence>
      <Sequence {...S("ch2")}>
        <GlitchReveal dur={12}>
          <Ch2 />
        </GlitchReveal>
      </Sequence>
      <Sequence {...S("ch3")}>
        <PageReveal dur={14}>
          <Ch3 />
        </PageReveal>
      </Sequence>
      <Sequence {...S("ch4")}>
        <SlashReveal dur={12} color={A.ink}>
          <Ch4 />
        </SlashReveal>
      </Sequence>
      <Sequence {...S("fin")}>
        <CircleReveal dur={12} x={540} y={1200}>
          <Fin clean={clean} />
        </CircleReveal>
      </Sequence>
      {/* печать AR в углу — как знак Aura на роликах */}
      <div style={{position: "absolute", right: 60, top: 258, width: 86, height: 86, borderRadius: 99, background: A.parch, border: `5px solid ${A.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.unb, fontSize: 32, color: A.ink, boxShadow: `5px 5px 0 ${A.lemon}`, opacity: f < 92 || f >= T.fin[0] ? 0 : 1}}>AR</div>
      <Grain opacity={0.12} />
      <Vignette strength={0.3} />
      <Audio
        src={staticFile(MUSIC)}
        trimBefore={Math.round(78.68 * fps)}
        volume={(x) => interpolate(x, [0, 108, 114, AURA_MANHUA_FRAMES - 40, AURA_MANHUA_FRAMES - 1], [0.22, 0.22, 0.33, 0.33, 0], CL)}
      />
      {SOUNDS.map(([at, name, vol], i) => (
        <Sequence key={i} from={at} durationInFrames={Math.round(4.5 * fps)} premountFor={fps}>
          <Audio src={staticFile(sfxSrc(name))} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// проверка без полного рендера: кадр N = кадр start + N × step ролика
// frames — свой список кадров ролика (кадр N предпросмотра = frames[N])
export const AuraSiteManhuaPreview: React.FC<{step: number; start: number; clean?: boolean; frames?: number[]}> = ({step, start, clean, frames}) => {
  const f = useCurrentFrame();
  const at = frames ? frames[Math.min(f, frames.length - 1)] : start + f * step;
  return (
    <Freeze frame={Math.min(AURA_MANHUA_FRAMES - 1, at)}>
      <AuraSiteManhua clean={clean} />
    </Freeze>
  );
};
