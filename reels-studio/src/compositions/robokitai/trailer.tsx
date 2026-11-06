// «Робокитай» · Серия 0 — трейлер вселенной (06.11.2026): хук (огни над картой Китая → титул), облёт восьми краёв (печать,
// название, кто живёт, местные герои-наклейки из портретов AuraCast), команда (Ави и Скаут в 3D, сетка 16 героев), «что здесь
// происходит» (три кадра серии 1 v2) и финал «Серия 1 · Ханчжоу». Плоское — на карте `chinaMap.ts`, 3D — только в сцене команды.
import React from "react";
import {AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Stage, type Cam} from "../../components/aura3d/kit";
import {MascotModel} from "../../components/AuraMascot";
import {DogModel, type DogPlan} from "../../components/aura3d/AuraDog";
import {AuraBadge} from "../../components/AuraBadge";
import {CHINA_PATHS} from "./chinaMap";
import {BRUSH_CJK, CL, EIO, EO, INTER, MONO_CJK, Marked, NamePlate, PANEL, Paper, RK, ScenePanel, Seal, p01} from "./kit";
import {Sounds, type Snd} from "./beats2d";
import {toScreen, useT} from "./beats3d";
import {LidarSweep, MockFloor} from "./scene3d";
import {CAST, CAST_ORDER, portraitSrc, regionXY, type Region, type RobokitaiTrailerProps} from "./trailerTypes";

// ===== портрет из AuraCast: кадрируем фото-карточку (без подписи) =====
const PCARD = {x: 64, y: 110, w: 950, h: 894};
export const Portrait: React.FC<{id: string; w: number; h: number; bias?: number; style?: React.CSSProperties}> = ({id, w, h, bias = 0.5, style}) => {
  const a = w / h;
  const cw = a >= PCARD.w / PCARD.h ? PCARD.w : PCARD.h * a;
  const ch = cw / a;
  const cx = PCARD.x + (PCARD.w - cw) / 2;
  const cy = PCARD.y + (PCARD.h - ch) * bias;
  const k = w / cw;
  return (
    <div style={{width: w, height: h, overflow: "hidden", position: "relative", background: "#F2EFEA", ...style}}>
      <Img src={staticFile(portraitSrc(id))} style={{position: "absolute", width: 1080 * k, height: 1350 * k, left: -cx * k, top: -cy * k, maxWidth: "none"}} />
    </div>
  );
};

// маленькая печать без анимации (посещённые края на карте, карусели)
export const MiniSeal: React.FC<{ch: string; size: number; x: number; y: number; rot?: number; o?: number}> = ({ch, size, x, y, rot = -6, o = 1}) => (
  <div style={{position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, rotate: `${rot}deg`, opacity: o, background: RK.red, borderRadius: size * 0.1, boxShadow: `inset 0 0 0 ${size * 0.05}px ${RK.red}, inset 0 0 0 ${size * 0.085}px rgba(248,246,243,0.85)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: BRUSH_CJK, fontSize: size * 0.7, lineHeight: 1, color: RK.paper, paddingBottom: size * 0.04, boxSizing: "border-box"}}>
    {ch}
  </div>
);

// ===== карта: вид = точка карты (mx, my) в точке кадра (ax, ay) при масштабе s =====
export type View = {mx: number; my: number; s: number; ax: number; ay: number};
export const scr = (v: View, q: [number, number]): [number, number] => [v.ax + (q[0] - v.mx) * v.s, v.ay + (q[1] - v.my) * v.s];
export const MapLayer: React.FC<{v: View; dark?: boolean; draw?: number; fill?: number; w?: number; h?: number; id?: string}> = ({v, dark, draw = 1, fill = 1, w = 1080, h = 1920, id = "m"}) => {
  const tx = v.ax - v.mx * v.s;
  const ty = v.ay - v.my * v.s;
  return (
    <svg width={w} height={h} style={{position: "absolute", inset: 0}}>
      <defs>
        <pattern id={`rt-hatch-${id}`} width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={14} stroke={dark ? "rgba(248,246,243,0.05)" : "rgba(38,38,38,0.07)"} strokeWidth={3} />
        </pattern>
      </defs>
      <g transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${v.s.toFixed(4)})`}>
        {CHINA_PATHS.map((d, i) => (
          <g key={i}>
            <path d={d} fill={dark ? "#202020" : "#EDE7DC"} opacity={fill} />
            <path d={d} fill={`url(#rt-hatch-${id})`} opacity={fill} />
            <path d={d} fill="none" stroke={dark ? "rgba(248,246,243,0.55)" : RK.ink} strokeWidth={(dark ? 3 : 4.5) / v.s} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          </g>
        ))}
      </g>
    </svg>
  );
};
// огонёк края: лимонная точка с ореолом (в темноте) или точка в графитовом ободке (на бумаге)
const Light: React.FC<{x: number; y: number; k: number; dark?: boolean; pulse?: number; red?: boolean}> = ({x, y, k, dark, pulse = 0, red}) => {
  if (k <= 0) return null;
  const r = 11 * k;
  return (
    <>
      {dark ? <div style={{position: "absolute", left: x - 46, top: y - 46, width: 92, height: 92, borderRadius: 46, background: "radial-gradient(circle, rgba(255,246,93,0.75) 0%, rgba(255,246,93,0.18) 45%, rgba(255,246,93,0) 70%)", opacity: k * (0.75 + 0.25 * Math.sin(pulse))}} /> : null}
      <div style={{position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, background: red ? RK.red : dark ? "#FFF9B0" : RK.lemon, boxShadow: dark ? "0 0 14px rgba(255,246,93,0.9)" : `0 0 0 ${4 * k}px ${RK.ink}`}} />
    </>
  );
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const V_FULL: View = {mx: 500, my: 420, s: 0.96, ax: 540, ay: 760};
const S_REGION = 2.25;
const regionView = (r: Region): View => {
  const [x, y] = regionXY(r);
  return {mx: x, my: y, s: S_REGION, ax: 540, ay: 640};
};
const fly = (a: View, b: View, e: number, dip: number): View => ({
  mx: lerp(a.mx, b.mx, e),
  my: lerp(a.my, b.my, e),
  s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), e)) * (1 - dip * Math.sin(Math.PI * e)),
  ax: lerp(a.ax, b.ax, e),
  ay: lerp(a.ay, b.ay, e),
});

// ===== 1. Хук: темнота → огни краёв над картой → «В Китае есть страна…» → вспышка → титул =====
export const HookBeat: React.FC<{P: RobokitaiTrailerProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const flashAt = P.hook.at - 0.12;
  const light = t >= flashAt;
  const words = P.hook.line.split(" ");
  const titleF = Math.round(P.hook.at * fps);
  const ts = spring({frame: f - titleF, fps, config: {damping: 14, stiffness: 170}});
  const flash = interpolate(t, [flashAt, flashAt + 0.05, flashAt + 0.3], [0, 1, 0], CL);
  const draw = p01(t, 0.15, 1.5, EO);
  return (
    <AbsoluteFill style={{background: light ? RK.paper : "#141414"}}>
      {light ? <Paper /> : null}
      <MapLayer v={V_FULL} dark={!light} draw={light ? 1 : draw} fill={light ? 1 : p01(t, 0.4, 1.6)} id="hook" />
      {P.regions.map((r, i) => {
        const [x, y] = scr(V_FULL, regionXY(r));
        const k = spring({frame: f - Math.round((0.55 + i * 0.13) * fps), fps, config: {damping: 11, stiffness: 200}});
        return <Light key={r.id} x={x} y={y} k={k} dark={!light} pulse={t * 5 + i} />;
      })}
      {!light ? (
        <div style={{position: "absolute", left: 90, right: 90, top: 1236, textAlign: "center", fontFamily: INTER, fontWeight: 800, fontSize: 66, lineHeight: 1.12, letterSpacing: "-0.03em", color: RK.paper}}>
          {words.map((w, i) => {
            const k = p01(t, 1.0 + i * 0.2, 1.0 + i * 0.2 + 0.3, EO);
            const isMark = w.startsWith("роботы");
            return (
              <span key={i} style={{display: "inline-block", marginRight: "0.26em", opacity: k, translate: `0 ${(1 - k) * 30}px`, color: isMark ? RK.lemon : RK.paper}}>
                {w}
              </span>
            );
          })}
        </div>
      ) : null}
      {light ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 1196, textAlign: "center", scale: String(0.7 + 0.3 * ts), opacity: Math.min(1, ts * 2) * (1 - p01(t, P.sec.hook - 0.3, P.sec.hook))}}>
          <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 150, letterSpacing: "-0.05em", lineHeight: 1, color: RK.ink}}>
            <Marked p={p01(t, P.hook.at + 0.15, P.hook.at + 0.55, EO)}>{P.hook.title}</Marked>
          </div>
          <div style={{fontFamily: BRUSH_CJK, fontSize: 92, color: RK.red, marginTop: 18, lineHeight: 1}}>{P.hook.zh}</div>
        </div>
      ) : null}
      <Seal ch="机" size={124} at={titleF + 8} x={890} y={1150} rot={8} id="hook-seal" />
      <AbsoluteFill style={{background: "#FFFFFF", opacity: flash}} />
      <Sounds list={[[0.1, "@riser-1", 0.3], [0.6, "@ding-3", 0.12], [1.0, "@sweep-1", 0.12], [flashAt, "@whoosh-3", 0.4], [P.hook.at, "@impact-2", 0.5], [P.hook.at + 0.27, "@stamp-1", 0.55]]} />
    </AbsoluteFill>
  );
};

// ===== 2. Облёт краёв =====
const HeroSticker: React.FC<{id: string; x: number; y: number; size: number; at: number; k: number}> = ({id, x, y, size, at, k}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 190, mass: 0.8}});
  const tt = (f - at) / fps;
  // «действие» героя: прыжок у тех, кто ездит, бегает и летает; покачивание («машет») у остальных
  const jumper = ["scout", "zippy", "ginger", "falcon", "swift", "stork", "rolly", "carry"].includes(id);
  const hop = jumper ? -22 * Math.max(0, Math.sin(Math.PI * 2 * 0.9 * Math.max(0, tt - 0.45))) : 0;
  const wave = jumper ? 0 : 5 * Math.sin(Math.PI * 2 * 1.1 * Math.max(0, tt - 0.45)) * Math.min(1, Math.max(0, tt - 0.45) * 2);
  const rot = (k % 2 ? 3 : -3) + wave;
  return (
    <div style={{position: "absolute", left: x, top: y, width: size, translate: `0 ${(1 - s) * 180 + hop}px`, scale: String(0.6 + 0.4 * s), rotate: `${rot}deg`, opacity: Math.min(1, s * 2.5), transformOrigin: "50% 100%"}}>
      <div style={{border: `5px solid ${RK.ink}`, borderRadius: 26, overflow: "hidden", boxShadow: `8px 8px 0 ${RK.ink}`, background: RK.paper}}>
        <Portrait id={id} w={size - 10} h={size - 10} />
      </div>
      <div style={{textAlign: "center", marginTop: 12}}>
        <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 36, letterSpacing: "-0.02em", color: RK.ink, background: RK.lemon, padding: "2px 14px", borderRadius: 10, boxShadow: `0 0 0 3px ${RK.ink}`}}>{CAST[id]?.name ?? id}</span>
      </div>
    </div>
  );
};

const RegionCard: React.FC<{r: Region; i: number; n: number; len: number}> = ({r, i, n, len}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const kin = p01(t, 0.45, 0.85, EO);
  const kout = p01(t, len - 0.22, len, EIO);
  const titleSize = Math.min(48, Math.floor(880 / (r.title.length * 0.56)));
  return (
    <div style={{position: "absolute", left: 64, top: 1262, width: 952, boxSizing: "border-box", padding: "18px 34px 20px", background: RK.paper, border: `5px solid ${RK.ink}`, borderRadius: 30, boxShadow: `10px 10px 0 ${RK.ink}`, translate: `${(1 - kin) * 1100 - kout * 1100}px 0`}}>
      <div style={{fontFamily: MONO_CJK, fontWeight: 700, fontSize: 27, letterSpacing: "0.12em", color: RK.red}}>
        КРАЙ {i + 1} / {n} · {r.zh}
      </div>
      <div style={{display: "flex", alignItems: "baseline", gap: 20, marginTop: 2}}>
        <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 72, letterSpacing: "-0.04em", lineHeight: 1.06, color: RK.ink}}>{r.name}</span>
      </div>
      <div style={{fontFamily: INTER, fontWeight: 800, fontSize: titleSize, letterSpacing: "-0.03em", lineHeight: 1.15, color: RK.ink, whiteSpace: "nowrap"}}>
        <Marked p={p01(t, 0.9, 1.3, EO)}>{r.title}</Marked>
      </div>
      <div style={{fontFamily: INTER, fontWeight: 600, fontSize: 36, letterSpacing: "-0.01em", lineHeight: 1.2, color: RK.muted, marginTop: 8, opacity: p01(t, 1.15, 1.45)}}>{r.who}</div>
    </div>
  );
};

export const FlightBeat: React.FC<{P: RobokitaiTrailerProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const L = P.regionSec;
  const n = P.regions.length;
  const i = Math.min(n - 1, Math.floor(t / L));
  const u = t - i * L;
  const travel = i === 0 ? 0.9 : 0.72;
  const e = EIO(Math.min(1, u / travel));
  const from = i === 0 ? V_FULL : regionView(P.regions[i - 1]);
  const to = regionView(P.regions[i]);
  const dist = Math.hypot(from.mx - to.mx, from.my - to.my);
  const v = fly(from, to, e, i === 0 ? 0 : Math.min(0.5, dist / 520));
  const stampF = (j: number) => Math.round((j * L + (j === 0 ? 0.9 : 0.72)) * fps);
  const lenF = Math.round(L * fps);
  const snd: Snd[] = [];
  P.regions.forEach((r, j) => {
    snd.push([j * L, j % 2 ? "@whoosh-2" : "@whoosh-4", 0.32]);
    snd.push([stampF(j) / fps, "@stamp-1", 0.55]);
    r.heroes.forEach((_, k) => snd.push([j * L + 0.8 + k * 0.13, "@pop-1", 0.16]));
  });
  return (
    <AbsoluteFill>
      <Paper />
      <MapLayer v={v} id="flight" />
      {P.regions.map((r, j) => {
        const [x, y] = scr(v, regionXY(r));
        const off = r.sealOff ?? [60, -60];
        const k = v.s / S_REGION;
        const visited = f >= stampF(j) + (j === i ? lenF : 0) || j < i;
        return (
          <React.Fragment key={r.id}>
            <Light x={x} y={y} k={1} red={j === i && f >= stampF(j)} />
            {visited && j !== i ? <MiniSeal ch={r.seal} size={64 * Math.max(0.6, Math.min(1.1, k))} x={x + off[0] * k} y={y + off[1] * k} rot={j % 2 ? 7 : -7} /> : null}
          </React.Fragment>
        );
      })}
      {(() => {
        const r = P.regions[i];
        const [x, y] = scr(v, regionXY(r));
        const off = r.sealOff ?? [60, -60];
        return <Seal key={`s${i}`} ch={r.seal} size={150} at={stampF(i)} x={x + off[0] * 1.9} y={y + off[1] * 1.9} rot={i % 2 ? 7 : -7} id={`fl-${i}`} />;
      })()}
      {P.regions.map((r, j) => {
        const size = r.heroes.length >= 3 ? 214 : 230;
        const gap = 40;
        const W = r.heroes.length * size + (r.heroes.length - 1) * gap;
        return (
          <Sequence key={r.id} from={j * lenF} durationInFrames={lenF} layout="none">
            <AbsoluteFill style={{opacity: 1 - p01(f - j * lenF, lenF - 6, lenF)}}>
              {r.heroes.map((h, k) => (
                <HeroSticker key={h} id={h} x={540 - W / 2 + k * (size + gap)} y={1238 - size - 62} size={size} at={Math.round((0.75 + k * 0.13) * fps)} k={k} />
              ))}
            </AbsoluteFill>
            <RegionCard r={r} i={j} n={n} len={L} />
          </Sequence>
        );
      })}
      <Sounds list={snd} />
    </AbsoluteFill>
  );
};

// ===== 3. Команда: Ави и Скаут в 3D → сетка 16 героев =====
const LEAD_CAM: Cam = {pos: [0.1, 3.2, 8.6], target: [0.0, 1.5, 0.5], fov: 34};
const LEAD_CAM2: Cam = {pos: [0.4, 3.0, 7.6], target: [0.1, 1.45, 0.5], fov: 34};
const SCOUT_T: DogPlan = {stays: [{at: -1, x: 1.45, z: 1.3, yaw: -2.3}], actions: [{at: 1.2, kind: "hop"}, {at: 4.7, kind: "stand", dur: 2.3}]};
export const TeamLeadBeat: React.FC<{P: RobokitaiTrailerProps}> = ({P}) => {
  const {t, fps} = useT();
  const z = EIO(Math.min(1, t / P.team.leadSec));
  const cam: Cam = {
    pos: [lerp(LEAD_CAM.pos[0], LEAD_CAM2.pos[0], z), lerp(LEAD_CAM.pos[1], LEAD_CAM2.pos[1], z), lerp(LEAD_CAM.pos[2], LEAD_CAM2.pos[2], z)],
    target: [lerp(LEAD_CAM.target[0], LEAD_CAM2.target[0], z), lerp(LEAD_CAM.target[1], LEAD_CAM2.target[1], z), LEAD_CAM.target[2]],
    fov: 34,
  };
  const [lead1, lead2] = P.team.lead;
  const a1 = toScreen([-1.35, 3.3, 0.3], cam);
  const a2 = toScreen([1.45, 1.1, 1.3], cam);
  return (
    <AbsoluteFill>
      <Paper />
      <ScenePanel>
        <Stage cam={cam} left={0} top={0} width={PANEL.w} height={PANEL.h} dpr={1}>
          <MockFloor w={20} d={14} p={[0, 0, -1.4]} />
          <MascotModel t={t} p={[-1.35, 0, 0.3]} yaw={0.35} gestures={[{at: 0.3, kind: "wave"}, {at: 3.9, kind: "present"}]} emotes={[{at: 0.2, kind: "happy", dur: 2.4}]} />
          <DogModel t={t} plan={SCOUT_T} />
          <group position={[1.45, 0, 1.3]}>
            <LidarSweep t={t} range={4.2} y={0.45} o={p01(t, 2.0, 2.6) * (1 - p01(t, 4.5, 4.9))} />
          </group>
        </Stage>
      </ScenePanel>
      {lead1 ? <NamePlate x={80} y={460} name={CAST[lead1.id]?.name ?? lead1.id} role={lead1.role} at={Math.round(0.5 * fps)} ax={a1[0]} ay={a1[1]} /> : null}
      {lead2 ? <NamePlate x={470} y={1100} name={CAST[lead2.id]?.name ?? lead2.id} role={lead2.role} at={Math.round(2.0 * fps)} ax={a2[0]} ay={a2[1]} /> : null}
      <div style={{position: "absolute", left: 64, top: PANEL.y + PANEL.h + 44, width: 952, fontFamily: INTER, fontWeight: 800, fontSize: 62, letterSpacing: "-0.035em", lineHeight: 1.1, color: RK.ink, opacity: p01(t, 0.3, 0.7), translate: `0 ${(1 - p01(t, 0.3, 0.7, EO)) * 30}px`}}>
        <Marked p={p01(t, 0.7, 1.1, EO)}>{P.team.leadTitle}</Marked>
      </div>
      <Sounds list={[[0, "@swipe-1", 0.3], [0.3, "@robot-1", 0.22], [0.5, "@click-2", 0.3], [1.2, "@boing-1", 0.12], [2.0, "@click-2", 0.3], [2.1, "@laser-1", 0.12], [4.7, "@servo-1", 0.2]]} />
    </AbsoluteFill>
  );
};

export const TeamGridBeat: React.FC<{P: RobokitaiTrailerProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const cols = 4;
  const gap = 16;
  const cw = (952 - (cols - 1) * gap) / cols;
  const ih = 196;
  const chh = ih + 52;
  const top = 470;
  const ids = CAST_ORDER;
  const parts = P.team.grid.split("·").map((s) => s.trim());
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", left: 64, top: 290, width: 952, fontFamily: INTER, fontWeight: 800, fontSize: 64, letterSpacing: "-0.035em", lineHeight: 1.08, color: RK.ink}}>
        <div style={{opacity: p01(t, 0, 0.3), translate: `0 ${(1 - p01(t, 0, 0.3, EO)) * 30}px`}}>{parts[0]}</div>
        {parts[1] ? (
          <div style={{opacity: p01(t, 0.25, 0.55)}}>
            <Marked p={p01(t, 1.8, 2.2, EO)}>{parts[1]}</Marked>
          </div>
        ) : null}
      </div>
      {ids.map((id, k) => {
        const c = k % cols;
        const r = Math.floor(k / cols);
        const at = Math.round((0.3 + k * 0.09) * fps);
        const s = spring({frame: f - at, fps, config: {damping: 11, stiffness: 220, mass: 0.7}});
        const tt = (f - at) / fps;
        const hop = tt > 2.6 ? -14 * Math.max(0, Math.sin(Math.PI * 2 * 1.4 * (tt - 2.6) - k * 0.35)) : 0;
        return (
          <div key={id} style={{position: "absolute", left: 64 + c * (cw + gap), top: top + r * (chh + gap), width: cw, opacity: Math.min(1, s * 2.5), scale: String(0.5 + 0.5 * s), translate: `0 ${hop}px`}}>
            <div style={{border: `4px solid ${RK.ink}`, borderRadius: 20, overflow: "hidden", background: RK.paper}}>
              <Portrait id={id} w={cw - 8} h={ih} />
            </div>
            <div style={{textAlign: "center", fontFamily: INTER, fontWeight: 800, fontSize: 31, letterSpacing: "-0.02em", color: RK.ink, marginTop: 6, whiteSpace: "nowrap"}}>{CAST[id].name}</div>
          </div>
        );
      })}
      <Sounds list={[[0, "@whoosh-1", 0.3], [0.3, "@pop-1", 0.18], [0.66, "@pop-2", 0.16], [1.02, "@pop-1", 0.16], [1.38, "@pop-2", 0.16], [1.8, "@ding-2", 0.25], [2.9, "@boing-1", 0.1]]} />
    </AbsoluteFill>
  );
};

// ===== 4. Что здесь происходит: три кадра серии 1 =====
export const EpisodeBeat: React.FC<{P: RobokitaiTrailerProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const E = P.episode;
  const start = 0.6;
  let acc = start;
  const slots = E.clips.map((c) => {
    const a = acc;
    acc += c.dur;
    return {...c, a};
  });
  const cur = [...slots].reverse().find((s) => t >= s.a);
  const idx = cur ? slots.indexOf(cur) : -1;
  const flashK = slots.reduce((m, s) => Math.max(m, interpolate(t, [s.a, s.a + 0.03, s.a + 0.16], [0, 1, 0], CL)), 0);
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", left: 64, top: 286, width: 952, fontFamily: INTER, fontWeight: 800, fontSize: 60, letterSpacing: "-0.035em", lineHeight: 1.1, color: RK.ink, opacity: p01(t, 0, 0.3)}}>
        <MarkedText text={E.title} mark={E.mark} p={p01(t, 0.3, 0.7, EO)} />
      </div>
      {slots.map((s, k) => {
        const [x0, y0, x1, y1] = s.crop;
        const W = 952;
        const H = Math.min(840, (W * (y1 - y0)) / (x1 - x0));
        const kk = W / (x1 - x0);
        if (k !== idx) return null;
        const pop = spring({frame: f - Math.round(s.a * fps), fps, config: {damping: 14, stiffness: 240}});
        return (
          <React.Fragment key={k}>
            <div style={{position: "absolute", left: 64, top: 470, width: W, height: H, overflow: "hidden", border: `6px solid ${RK.ink}`, borderRadius: 26, boxShadow: `12px 12px 0 ${RK.ink}`, rotate: `${[-1.4, 1.2, -0.8][k % 3]}deg`, scale: String(0.94 + 0.06 * pop), background: RK.paper}}>
              <Sequence from={Math.round(s.a * fps)} layout="none">
                <div style={{position: "absolute", left: -x0 * kk, top: -y0 * kk - (H < (W * (y1 - y0)) / (x1 - x0) ? ((W * (y1 - y0)) / (x1 - x0) - H) / 2 : 0), width: 1080 * kk, height: 1920 * kk}}>
                  <OffthreadVideo src={staticFile(E.video)} trimBefore={Math.round(s.from * fps)} muted style={{width: "100%", height: "100%"}} />
                </div>
              </Sequence>
            </div>
            <div style={{position: "absolute", left: 64, top: 470 + H + 34, display: "flex", alignItems: "center", gap: 18, scale: String(0.8 + 0.2 * pop), transformOrigin: "0 50%"}}>
              <span style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 32, background: RK.red, color: RK.paper, fontFamily: INTER, fontWeight: 800, fontSize: 36}}>{k + 1}</span>
              <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 50, letterSpacing: "-0.03em", color: RK.ink, background: RK.lemon, padding: "0 16px", borderRadius: 10, boxShadow: `0 0 0 4px ${RK.ink}`}}>{s.label}</span>
            </div>
          </React.Fragment>
        );
      })}
      <AbsoluteFill style={{background: "#FFFFFF", opacity: flashK * 0.85, pointerEvents: "none"}} />
      <Sounds list={[[0, "@swipe-1", 0.3], ...slots.map((s, k) => [s.a, k === 2 ? "@coin-1" : "@shutter-1", 0.4] as Snd), [slots[0].a + 0.3, "@impact-4", 0.3], [slots[1].a + 0.5, "@beep-1", 0.25]]} />
    </AbsoluteFill>
  );
};
const MarkedText: React.FC<{text: string; mark?: string; p: number}> = ({text, mark, p}) => {
  if (!mark || !text.includes(mark)) return <>{text}</>;
  const [a, b] = text.split(mark);
  return (
    <>
      {a}
      <Marked p={p}>{mark}</Marked>
      {b}
    </>
  );
};

// ===== 5. Финал: вся карта с печатями, Ханчжоу горит, «Серия 1», подписка, печать Aura =====
export const EndBeat: React.FC<{P: RobokitaiTrailerProps}> = ({P}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const E = P.end;
  const v: View = {mx: 500, my: 420, s: 0.72, ax: 520, ay: 740};
  const first = P.regions[0];
  const [hx, hy] = scr(v, regionXY(first));
  const ring = (t * 1.2) % 1;
  return (
    <AbsoluteFill>
      <Paper />
      <MapLayer v={v} id="end" />
      {P.regions.map((r, j) => {
        const [x, y] = scr(v, regionXY(r));
        const off = r.sealOff ?? [60, -60];
        return (
          <React.Fragment key={r.id}>
            <Light x={x} y={y} k={0.8} red={j === 0} />
            {j ? <MiniSeal ch={r.seal} size={52} x={x + off[0] * 0.55} y={y + off[1] * 0.55} rot={j % 2 ? 7 : -7} o={0.92} /> : null}
          </React.Fragment>
        );
      })}
      <div style={{position: "absolute", left: hx - 70, top: hy - 70, width: 140, height: 140, borderRadius: 70, border: `6px solid ${RK.red}`, scale: String(0.3 + ring), opacity: 1 - ring}} />
      <Seal ch={E.seal} size={150} at={Math.round(0.35 * fps)} x={hx - 150} y={hy + 40} rot={-8} id="end-seal" />
      <div style={{position: "absolute", left: 70, top: 280, width: 190, height: 190, opacity: p01(t, 0.2, 0.5)}}>
        <AuraBadge size={190} />
      </div>
      <div style={{position: "absolute", left: 64, top: 1130, width: 952, boxSizing: "border-box", padding: "22px 36px 26px", background: RK.paper, border: `5px solid ${RK.ink}`, borderRadius: 32, boxShadow: `10px 10px 0 ${RK.ink}`, translate: `0 ${(1 - p01(t, 0.1, 0.5, EO)) * 120}px`, opacity: p01(t, 0.1, 0.35)}}>
        <div style={{fontFamily: MONO_CJK, fontWeight: 700, fontSize: 28, letterSpacing: "0.12em", color: RK.red}}>{E.kicker}</div>
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 62, letterSpacing: "-0.04em", lineHeight: 1.08, color: RK.ink, marginTop: 4}}>{E.title}</div>
        {E.sub ? <div style={{fontFamily: INTER, fontWeight: 600, fontSize: 36, color: RK.muted, marginTop: 6}}>{E.sub}</div> : null}
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 50, letterSpacing: "-0.03em", lineHeight: 1.15, color: RK.ink, marginTop: 18, opacity: p01(t, 1.1, 1.4)}}>
          <MarkedText text={E.cta} mark={E.mark} p={p01(t, 1.4, 1.9, EO)} />
        </div>
        <div style={{fontFamily: MONO_CJK, fontWeight: 700, fontSize: 30, color: RK.ink, marginTop: 12, opacity: p01(t, 1.8, 2.1)}}>{E.url}</div>
      </div>
      <Sounds list={[[0, "@impact-3", 0.45], [0.35, "@stamp-1", 0.55], [1.1, "@pop-1", 0.2], [1.4, "@sweep-1", 0.15], [2.4, "@success-1", 0.25]]} />
    </AbsoluteFill>
  );
};
