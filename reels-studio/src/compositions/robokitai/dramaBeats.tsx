// «Робокитай» v2 — сцены драмы (11 шагов): холодное открытие → ставки → карта → попытка 1 (провал) → пауза-угадайка →
// попытка 2 (напряжение, человек на пути) → кризис (порог) → озарение Скаута → поворот (флипчарт, «переставить стеллаж») →
// развязка 11.11 → крючок на следующую серию. Время в сценах — секунды от начала сцены; 3D-миры — drama3d.tsx.
import React from "react";
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {AuraMascot} from "../../components/AuraMascot";
import {AuraBadge} from "../../components/AuraBadge";
import {Stage, pathAt, type Cam} from "../../components/aura3d/kit";
import {SpeedLines} from "../site-manhua/fx";
import {Alert, CL, EIO, EO, INTER, MONO, MarkLine, Marked, NamePlate, PANEL, Paper, RK, ScenePanel, SpecCard, Title, p01, usePop} from "./kit";
import {Sounds, MapBeat, type Snd} from "./beats2d";
import {Callout, toScreen, useT} from "./beats3d";
import {camAt} from "./scene3d";
import {BoxPile, Bulb, DayMark, FlashCard, Huh, Manager, QueueMeter, SosPhone, Tint, WorkerSil} from "./drama2d";
import {CAMS, GAP2, GateWorld, MOBILE_RACK, PayoffWorld, ROUTE_FULL, OLD_ROUTE, THR2, TRY1, TRY2, Try1World, Try2World, ZIPPY_A, GINGER_PARK, fieldAlarm, gingerTry2, mobileRackAt, payoffRobots, qrPass1} from "./drama3d";
import type {RobokitaiDramaProps} from "./dramaTypes";
import type {RobokitaiProps} from "./types";

type BP = {P: RobokitaiDramaProps};
const CARD_Y = PANEL.y + PANEL.h + 30;
const Panel3D: React.FC<{cam: Cam; children: React.ReactNode; rot?: number; bg?: string}> = ({cam, children, rot = 0, bg}) => (
  <div style={{position: "absolute", inset: 0, rotate: `${rot}deg`}}>
    <ScenePanel bg={bg}>
      <Stage cam={cam} left={0} top={0} width={PANEL.w} height={PANEL.h} dpr={1}>
        {children}
      </Stage>
    </ScenePanel>
  </div>
);

// ===== 1. Холодное открытие: Рыжик застрял, коробки до потолка, «до 11.11: 2 дня» мигает → «4 дня назад…» =====
export const ColdBeat: React.FC<BP> = ({P}) => {
  const {t, f, fps} = useT();
  const flashAt = Math.round(P.cold.flashAt * fps);
  const cam = camAt(t, [
    [0, {pos: [3.6, 1.4, 2.6], target: [-1.2, 0.35, 0.3], fov: 37}],
    [P.cold.flashAt, {pos: [2.7, 1.05, 2.0], target: [-0.9, 0.3, 0.3], fov: 35}],
  ]);
  const robotTop = toScreen([-1.17, 1.05, 0.35], cam);
  return (
    <AbsoluteFill>
      <Paper />
      <SpeedLines cx={540} cy={830} color={RK.ink} n={90} inner={560} opacity={0.1} seed="cold" />
      <Panel3D cam={cam} rot={-2.5}>
        <GateWorld t={2.6 + t} stuck={1.3} />
      </Panel3D>
      <Tint kind="red" o={1} />
      <Alert x={robotTop[0]} y={robotTop[1]} at={4} size={140} />
      {f >= flashAt ? (
        <Sequence from={flashAt} layout="none">
          <FlashCard text={P.cold.flash} />
        </Sequence>
      ) : null}
      <Sounds list={[[0, "@riser-2", 0.28], [0.15, "@error-1", 0.3], [1.4, "@error-1", 0.22], [P.cold.flashAt, "@zvukitop/zt-clock", 0.45]]} />
    </AbsoluteFill>
  );
};

// ===== 2. Ставки: склад клиента, очередь растёт, начальник склада скептичен; письмо Ави =====
export const StakesBeat: React.FC<BP> = ({P}) => {
  const {t, f, fps} = useT();
  const S = P.stakes;
  const bubble = usePop(Math.round(2.4 * fps), 14);
  const lineAt = [2.7, 3.5].map((x) => Math.round(x * fps));
  const fill = interpolate(t, [0.4, 2.6], [0.25, 0.97], {...CL, easing: EIO});
  return (
    <AbsoluteFill>
      <Paper />
      {/* панель склада */}
      <div style={{position: "absolute", left: 44, top: 396, width: 992, height: 600, borderRadius: 34, overflow: "hidden", background: "#EDE8DF", boxShadow: `10px 10px 0 ${RK.ink}`}}>
        <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 120, background: "#D9D3C8", borderTop: `5px solid ${RK.ink}`}} />
        <BoxPile x={560} y={485} n={22} shown={t * 9} cols={4} w={92} />
        <div style={{position: "absolute", inset: 0, borderRadius: 34, border: `6px solid ${RK.ink}`}} />
      </div>
      <QueueMeter x={930} y={430} h={300} fill={fill} label={S.queue} />
      <Manager x={60} y={470} scale={1.02} mood="skeptic" arms="crossed" at={4} from="left" />
      <NamePlate x={70} y={1010} name={P.manager.name} role={P.manager.role} at={Math.round(0.6 * fps)} scale={0.92} />
      {/* письмо Ави */}
      {bubble > 0 ? (
        <div style={{position: "absolute", left: 64, top: 1110, width: 700, translate: `0 ${(1 - bubble) * 60}px`, opacity: Math.min(1, bubble * 1.6)}}>
          <svg width={700} height={300} style={{position: "absolute", left: 0, top: 0, overflow: "visible"}}>
            <path d="M640 170 L790 250 L620 220 Z" fill={RK.paper} stroke={RK.ink} strokeWidth={5} strokeLinejoin="round" />
          </svg>
          <div style={{position: "relative", background: RK.paper, border: `5px solid ${RK.ink}`, borderRadius: 30, boxShadow: `8px 8px 0 ${RK.ink}`, padding: "20px 30px 24px"}}>
            {S.letter.map((l, i) => {
              const k = p01(f, lineAt[i], lineAt[i] + 8, EO);
              return (
                <div key={i} style={{fontFamily: INTER, fontWeight: 800, fontSize: 50, lineHeight: 1.16, letterSpacing: "-0.03em", color: i === S.letter.length - 1 ? RK.blue : RK.ink, opacity: k, translate: `${(1 - k) * 24}px 0`, whiteSpace: "nowrap"}}>
                  <MarkLine text={l.text} mark={l.mark} p={p01(f, lineAt[i] + 8, lineAt[i] + 22, EO)} />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <AuraMascot scale={1.15} dpr={1.25} plan={{stays: [{at: 0, x: 905, y: 1515, face: -0.4}], gestures: [{at: 2.3, kind: "wave"}], emotes: [{at: 2.6, kind: "surprised", dur: 1.4}, {at: 4.2, kind: "thinking", dur: 2.0}]}} />
      <NamePlate x={640} y={1440} name={S.host.name} role={S.host.role} at={Math.round(2.6 * fps)} scale={0.78} />
      <Sounds list={[[0.0, "@whoosh-2", 0.3], ...Array.from({length: 8}, (_, i) => [0.3 + i * 0.28, "@pop-2", 0.25] as Snd), [2.4, "@ding-2", 0.3], [2.7, "@typing-1", 0.18], [2.0, "@zvukitop/zt-wrong", 0.12]]} />
    </AbsoluteFill>
  );
};

// ===== 3. Карта (короче, чем в серии 1) =====
export const MapBeatD: React.FC<BP> = ({P}) => <MapBeat P={{...P, map: P.map} as unknown as RobokitaiProps} k={P.map.k} />;

// ===== 4. Попытка 1: AGV по QR → ночь, стеллаж поперёк → утро, «?» =====
export const Try1Beat: React.FC<BP & {freeze?: number}> = ({P, freeze}) => {
  const {t: tl, fps} = useT();
  const t = freeze ?? tl;
  const T = P.try1;
  const cam = CAMS.trial;
  const night = Math.min(p01(t, TRY1.night[0], TRY1.night[0] + 0.5), 1 - p01(t, TRY1.night[1] - 0.4, TRY1.night[1]));
  const zs = (s: [number, number]) => toScreen([s[0], 1.1, s[1]], cam);
  const zp = pathAt(ZIPPY_A.stays, t, 2.8, 0.7, true);
  const zippy = toScreen([zp.x, 1.0, zp.z], cam);
  const ginger = zs(GINGER_PARK);
  const [rx, rz] = mobileRackAt(t);
  const rackL = toScreen([rx, 0, rz + 2.4], cam);
  const rackR = toScreen([rx, 0, rz - 2.4], cam);
  const stuck = toScreen([-4.55, 1.2, TRY1.start[1]], cam);
  return (
    <AbsoluteFill>
      <Paper />
      <Panel3D cam={cam}>
        <Try1World t={t} />
      </Panel3D>
      {/* ночь: синяя тонировка панели, силуэты рабочих толкают стеллаж */}
      {night > 0.01 ? (
        <div style={{position: "absolute", left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, borderRadius: 34, overflow: "hidden", pointerEvents: "none"}}>
          <div style={{position: "absolute", inset: 0, background: "rgba(16,24,64,0.66)", opacity: night}} />
        </div>
      ) : null}
      {night > 0.3 && t > MOBILE_RACK.move[0] - 0.2 && t < MOBILE_RACK.move[1] + 0.3 ? (
        <>
          <WorkerSil x={rackL[0] + 30} y={rackL[1] + 10} h={130} push={0} o={night} />
          <WorkerSil x={rackR[0] + 40} y={rackR[1] + 10} h={110} push={2} o={night} />
        </>
      ) : null}
      <DayMark kind="night" label={T.night} at={Math.round(TRY1.night[0] * fps)} out={Math.round(TRY1.night[1] * fps)} />
      <DayMark kind="morning" label={T.morning} at={Math.round((TRY1.night[1] - 0.1) * fps)} out={Math.round(9.0 * fps)} />
      {freeze === undefined ? (
        <>
          <NamePlate x={90} y={1130} name="Шустрик" role="AGV" at={Math.round(0.3 * fps)} ax={zippy[0]} ay={zippy[1]} scale={0.85} />
          <NamePlate x={90} y={560} name="Рыжик" role="AMR" at={Math.round(0.6 * fps)} ax={ginger[0]} ay={ginger[1]} scale={0.85} />
        </>
      ) : null}
      <Huh x={stuck[0]} y={stuck[1]} at={Math.round((TRY1.stop + 0.15) * fps)} />
      {freeze === undefined ? (
        <>
          <SpecCard x={64} y={CARD_Y} w={952} at={Math.round(0.6 * fps)} term={T.term} sub={T.sub} lines={T.lines} size={44} out={Math.round(3.7 * fps)} />
          <SpecCard x={64} y={CARD_Y} w={952} at={Math.round(7.0 * fps)} lines={T.card} size={44} />
          <Sounds
            list={[
              [0, "@swipe-1", 0.3],
              [0.3, "@servo-1", 0.22],
              ...qrPass1.map((x) => [x, "@click-2", 0.13] as Snd),
              [3.4, "@success-1", 0.25],
              [TRY1.night[0], "@whoosh-1", 0.3],
              [MOBILE_RACK.move[0], "@zvukitop/zt-gear", 0.35],
              [TRY1.night[1], "@pop-1", 0.25],
              [TRY1.morning, "@servo-1", 0.22],
              [TRY1.stop, "@impact-3", 0.12],
              [TRY1.stop + 0.15, "@zvukitop/zt-wrong", 0.22],
              [7.0, "@pop-1", 0.25],
            ]}
          />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ===== 5. Пауза-угадайка: стоп-кадр, «Кого бы взяли вы?» =====
export const GuessBeat: React.FC<BP> = ({P}) => {
  const {f, fps} = useT();
  const G = P.guess;
  const q = usePop(3, 14);
  const card = (c: RobokitaiDramaProps["guess"]["a"], at: number, x: number, rot: number, col: string) => {
    const s = usePopRaw(f, at, fps);
    return (
      <div style={{position: "absolute", left: x, top: 900, width: 420, padding: "26px 28px 30px", background: RK.paper, border: `6px solid ${RK.ink}`, borderRadius: 30, boxShadow: `10px 10px 0 ${col}`, rotate: `${rot}deg`, scale: String(0.6 + 0.4 * s), opacity: Math.min(1, s * 2), boxSizing: "border-box"}}>
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 150, lineHeight: 0.9, color: col, WebkitTextStroke: `5px ${RK.ink}`, paintOrder: "stroke fill"}}>{c.letter}</div>
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 56, letterSpacing: "-0.03em", color: RK.ink, marginTop: 12}}>{c.name}</div>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 32, color: RK.blue, marginTop: 2}}>{c.role}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <div style={{position: "absolute", inset: 0, filter: "grayscale(1) contrast(0.9)"}}>
        <Try1Beat P={P} freeze={9.9} />
      </div>
      <AbsoluteFill style={{background: "rgba(20,20,22,0.62)"}} />
      <div style={{position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", fontFamily: INTER, fontWeight: 800, fontSize: 92, letterSpacing: "-0.03em", color: RK.paper, opacity: Math.min(1, q * 1.5), translate: `0 ${(1 - q) * 40}px`}}>
        {G.q.split(" ").slice(0, -1).join(" ")}{" "}
        <span style={{color: RK.ink, background: RK.lemon, padding: "0 14px", borderRadius: 10}}>{G.q.split(" ").slice(-1)[0]}</span>
      </div>
      {card(G.a, 9, 80, -3, RK.lemon)}
      {card(G.b, 15, 580, 3, "#F26B1D")}
      <Sounds list={[[0, "@zvukitop/zt-suspense-1", 0.3], [0.3, "@zvukitop/zt-clock", 0.5], [2.3, "@zvukitop/zt-clock", 0.45], [0.3, "@pop-1", 0.25], [0.5, "@pop-1", 0.25]]} />
    </AbsoluteFill>
  );
};
const usePopRaw = (f: number, at: number, fps: number) => (f < at ? 0 : spring({frame: f - at, fps, config: {damping: 12, stiffness: 190, mass: 0.7}}));

// ===== 6. Попытка 2: новый маршрут «в программе», человек на пути — робот встаёт до контакта =====
const PlanInset: React.FC<{t: number; label: string}> = ({t, label}) => {
  const W = 300;
  const H = 230;
  const map = (x: number, z: number): [number, number] => [((x + 8) / 16) * W, ((z + 6.6) / 13) * H];
  const draw = p01(t, 0.6, 1.4, EO);
  const cross = p01(t, 0.9, 1.1);
  const k = p01(t, 0.2, 0.6, EO);
  const out = 1 - p01(t, 4.6, 5.0);
  if (k * out <= 0.01) return null;
  const [rx, rz] = MOBILE_RACK.to;
  const r0 = map(rx - 0.45, rz - 2.25);
  const r1 = map(rx + 0.45, rz + 2.25);
  const old = OLD_ROUTE.map(([x, z]) => map(x, z));
  const nw = ROUTE_FULL.map(([x, z]) => map(x, z));
  const n = Math.max(2, Math.round(nw.length * draw));
  const pen = nw[n - 1];
  return (
    <div style={{position: "absolute", left: PANEL.x + 26, top: PANEL.y + 26, padding: 8, background: RK.paper, border: `4px solid ${RK.ink}`, borderRadius: 16, boxShadow: `6px 6px 0 ${RK.ink}`, opacity: k * out}}>
      <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: "0.12em", color: RK.ink, marginBottom: 6}}>
        <span style={{color: RK.red}}>●</span> {label.toUpperCase()}
      </div>
      <svg width={W} height={H} style={{display: "block", background: "#EDE8DF"}}>
        {/* стеллажи */}
        <rect x={map(-6.25, -5.85)[0]} y={map(-6.25, -5.85)[1]} width={map(4.25, 0)[0] - map(-6.25, 0)[0]} height={(0.9 / 13) * H} fill={RK.ink} />
        <rect x={r0[0]} y={r0[1]} width={r1[0] - r0[0]} height={r1[1] - r0[1]} fill={RK.ink} />
        {/* старый путь — перечёркнут */}
        <path d={`M${old[0][0]},${old[0][1]} L${old[1][0]},${old[1][1]}`} stroke={RK.red} strokeWidth={4} strokeDasharray="7 6" opacity={0.85} />
        {cross > 0 ? <path d={`M${r0[0] - 16},${(old[0][1] - 16).toFixed(1)} l${32 * cross},${32 * cross} M${r0[0] + 16},${(old[0][1] - 16).toFixed(1)} l${-32 * cross},${32 * cross}`} stroke={RK.red} strokeWidth={6} strokeLinecap="round" /> : null}
        {/* новый путь рисуется «в программе» */}
        <path d={nw.slice(0, n).map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join("")} fill="none" stroke={RK.blue} strokeWidth={4} />
        {draw < 1 ? (
          <g transform={`translate(${pen[0]} ${pen[1]}) rotate(-35)`}>
            <rect x={-4} y={-30} width={8} height={26} rx={2} fill={RK.lemon} stroke={RK.ink} strokeWidth={2} />
            <path d="M-4,-4 L0,4 L4,-4 Z" fill={RK.ink} />
          </g>
        ) : null}
      </svg>
    </div>
  );
};
// схема тестового тела: горизонтальный цилиндр на полу
const CylinderDiagram: React.FC<{label: string; at: number}> = ({label, at}) => {
  const s = usePop(at, 14);
  if (s <= 0) return null;
  return (
    <div style={{position: "absolute", right: 70, top: CARD_Y - 150, padding: "10px 16px 12px", background: RK.paper, border: `4px solid ${RK.ink}`, borderRadius: 16, boxShadow: `6px 6px 0 ${RK.ink}`, opacity: Math.min(1, s * 2), scale: String(0.7 + 0.3 * s)}}>
      <svg width={300} height={86} viewBox="0 0 300 86">
        <line x1={10} y1={70} x2={290} y2={70} stroke={RK.ink} strokeWidth={4} />
        <rect x={60} y={40} width={180} height={30} rx={0} fill={RK.lemon} stroke={RK.ink} strokeWidth={4} />
        <ellipse cx={60} cy={55} rx={8} ry={15} fill="#EDE38A" stroke={RK.ink} strokeWidth={4} />
        <ellipse cx={240} cy={55} rx={8} ry={15} fill={RK.lemon} stroke={RK.ink} strokeWidth={4} />
        <path d="M60,22 L240,22 M60,14 L60,30 M240,14 L240,30" stroke={RK.blue} strokeWidth={3} />
      </svg>
      <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 28, color: RK.blue, textAlign: "center"}}>{label}</div>
    </div>
  );
};
export const Try2Beat: React.FC<BP> = ({P}) => {
  const {t, fps} = useT();
  const T = P.try2;
  const cam = camAt(t, [
    [0, CAMS.trial],
    [4.2, {pos: [1.6, 9.6, 6.4], target: [1.0, 0, -0.6], fov: 40}],
    [7.8, {pos: [1.4, 9.0, 6.0], target: [1.2, 0, -0.6], fov: 40}],
    [11.4, {pos: [1.0, 11.6, 8.4], target: [0.8, 0, -1.0], fov: 42}],
  ]);
  const draw = p01(t, 0.4, 0.9);
  const replan = p01(t, 0.6, 1.4, EO);
  const g = gingerTry2(t);
  const alarm = fieldAlarm(t);
  const top = toScreen([g.x, 1.2, g.z], cam);
  return (
    <AbsoluteFill>
      <Paper />
      <Panel3D cam={cam}>
        <Try2World t={t} draw={draw} replan={replan} />
      </Panel3D>
      <PlanInset t={t} label={P.try2.map} />
      {alarm > 0.6 && t < TRY2.stopAt + 0.6 ? <Alert x={top[0]} y={top[1]} at={Math.round(5.0 * fps)} size={90} /> : null}
      <SpecCard x={64} y={CARD_Y} w={952} at={Math.round(0.5 * fps)} term={T.card1.term} lines={T.card1.lines} size={44} out={Math.round(5.6 * fps)} />
      <SpecCard x={64} y={CARD_Y} w={952} at={Math.round(6.4 * fps)} lines={T.card2.lines} size={44} note={T.card2.note} />
      <CylinderDiagram label={T.card2.cyl} at={Math.round(6.9 * fps)} />
      <Sounds
        list={[
          [0, "@sweep-1", 0.15],
          [0.6, "@laser-2", 0.14],
          [0.5, "@pop-1", 0.22],
          [TRY2.start, "@servo-1", 0.2],
          [TRY2.worker.crouch[0], "@pop-2", 0.2],
          [5.0, "@beep-1", 0.3],
          [5.1, "@zvukitop/zt-suspense-2", 0.28],
          [6.4, "@pop-1", 0.25],
          [TRY2.resume, "@servo-2", 0.18],
        ]}
      />
    </AbsoluteFill>
  );
};

// ===== 7. Кризис: въезд в зону отгрузки — порог; музыка обрывается, один сигнал; начальник за голову =====
export const CrisisBeat: React.FC<BP> = ({P}) => {
  const {t, fps} = useT();
  const C = P.crisis;
  const cam = camAt(t, [
    [0, CAMS.gateFar],
    [1.3, CAMS.gateFront],
    [7.0, {pos: [2.6, 1.0, 1.9], target: [-0.9, 0.3, 0.3], fov: 34}],
  ]);
  const robotTop = toScreen([-1.17, 1.05, 0.35], cam);
  const door = usePop(Math.round(3.4 * fps), 12);
  return (
    <AbsoluteFill>
      <Paper />
      <SpeedLines cx={540} cy={830} color={RK.ink} n={90} inner={560} opacity={0.1} seed="crisis" />
      <Panel3D cam={cam} rot={-2.5}>
        <GateWorld t={t} stuck={1.3} />
      </Panel3D>
      <Tint kind="red" o={p01(t, 1.3, 1.8)} />
      <Alert x={robotTop[0]} y={robotTop[1]} at={Math.round(1.35 * fps)} size={140} />
      {door > 0 ? (
        <div style={{position: "absolute", left: 650, top: 440, scale: String(0.6 + 0.4 * door), opacity: Math.min(1, door * 2), background: RK.paper, border: `4px solid ${RK.ink}`, borderRadius: 14, padding: "6px 16px", fontFamily: MONO, fontWeight: 700, fontSize: 30, color: RK.ink, boxShadow: `5px 5px 0 ${RK.ink}`, whiteSpace: "nowrap", rotate: "-2.5deg"}}>
          ✋ {C.door}
        </div>
      ) : null}
      <Title x={64} y={CARD_Y + 14} w={600} text={C.caption.text} mark={C.caption.mark} at={Math.round(1.6 * fps)} size={56} color={RK.red} />
      <Manager x={640} y={1010} scale={0.9} mood="despair" arms="head" at={Math.round(2.2 * fps)} from="right" />
      <Sounds list={[[0, "@riser-2", 0.22], [0.1, "@servo-1", 0.25], [1.3, "@impact-4", 0.3], [1.35, "@error-1", 0.5], [2.2, "@zvukitop/zt-suspense-2", 0.3], [3.4, "@pop-1", 0.22]]} />
    </AbsoluteFill>
  );
};

// ===== 8. Озарение: Скаут «ложится», смотрит на склад снизу, 💡; порог и щель — по спецификации из статьи =====
export const InsightBeat: React.FC<BP> = ({P}) => {
  const {t, fps} = useT();
  const I = P.insight;
  const cam = camAt(t, [
    [0, CAMS.gateHigh],
    [1.8, CAMS.gateHigh],
    [3.0, {pos: [3.9, 1.35, 3.2], target: [0.3, 0.1, -0.1], fov: 40}],
    [8.0, {pos: [3.4, 1.15, 2.8], target: [0.3, 0.1, -0.1], fov: 38}],
  ]);
  const scout = {plan: {speed: 2.6, stays: [{at: 0, x: 7.6, z: 1.2, yaw: Math.PI}, {at: 1.5, x: 1.75, z: 1.55, yaw: Math.PI}]}, crouchAt: 1.6, scan: [2.2, 7.8] as [number, number]};
  const glowT = p01(t, 2.6, 2.9) * (0.75 + 0.25 * Math.sin(t * 6));
  const glowG = p01(t, 3.0, 3.3) * (0.75 + 0.25 * Math.sin(t * 6 + 1));
  const head = toScreen([1.2, 0.85, 1.55], cam);
  const thrTop = toScreen([0.15, THR2.h, -1.0], cam);
  const thrBot = toScreen([0.15, 0, -1.0], cam);
  const gapPt = toScreen([GAP2.dx, 0, -1.25], cam);
  const callOut = Math.round(5.2 * fps);
  const co = 1 - p01(t, 5.0, 5.3);
  return (
    <AbsoluteFill>
      <Paper />
      <Panel3D cam={cam}>
        <GateWorld t={4.0 + t} stuck={1.3} glowT={glowT} glowG={glowG} scout={{...scout, plan: {...scout.plan, stays: scout.plan.stays.map((s) => ({...s, at: s.at + 4.0}))}, crouchAt: scout.crouchAt + 4.0, scan: [scout.scan[0] + 4.0, scout.scan[1] + 4.0]}} alarm={false} />
      </Panel3D>
      {t < 3.0 ? <NamePlate x={110} y={470} name={I.scout.name} role={I.scout.role} at={Math.round(1.3 * fps)} ax={toScreen([1.3, 0.9, 1.55], cam)[0]} ay={toScreen([1.3, 0.9, 1.55], cam)[1]} scale={0.85} /> : null}
      {t < 3.0 ? <Bulb x={head[0]} y={head[1]} at={Math.round(2.0 * fps)} /> : null}
      <div style={{opacity: co}}>
        <Callout a={thrTop} b={[Math.max(150, Math.min(930, thrTop[0] - 60)), Math.max(470, thrTop[1] - 170)]} tick={[thrTop[1], thrBot[1]]} label={I.threshold} at={Math.round(2.6 * fps)} />
        <Callout a={gapPt} b={[Math.max(150, Math.min(930, gapPt[0] + 40)), Math.min(1220, gapPt[1] + 150)]} label={I.gap} at={Math.round(3.0 * fps)} />
      </div>
      <SpecCard x={64} y={CARD_Y} w={952} at={Math.round(2.8 * fps)} out={callOut} lines={[{text: I.spec}]} note={I.note.toUpperCase()} size={44} />
      <SpecCard x={64} y={CARD_Y} w={952} at={callOut} lines={[I.quote]} size={46} />
      <Sounds list={[[0.3, "@robot-1", 0.25], [1.6, "@servo-2", 0.25], [2.0, "@ding-3", 0.35], [2.2, "@sweep-1", 0.16], [2.6, "@beep-1", 0.25], [3.0, "@beep-1", 0.22], [5.2, "@pop-1", 0.25]]} />
    </AbsoluteFill>
  );
};

// ===== 9. Поворот: флипчарт (критерии быстро) → формула = 8 → Ави двигает стеллаж на плане, рейс −1 мин → 7 =====
const BOARD2 = {x: 64, y: 430, w: 700, h: 590};
export const TwistBeat2: React.FC<BP> = ({P}) => {
  const {t, f, fps} = useT();
  const T = P.twist;
  const ticks = [0.35, 0.8, 1.25];
  const flip = p01(t, 2.2, 2.7, EIO);
  const res1 = Math.round(T.before.result * p01(t, 3.0, 3.6, EO));
  const swap = p01(t, 6.2, 6.6, EO);
  const roll = p01(t, 6.7, 7.2, EO);
  const shown = t < 6.7 ? res1 : roll < 0.5 ? T.before.result : T.after.result;
  const rackMove = p01(t, 4.9, 5.7, EIO);
  const reroute = p01(t, 5.7, 6.3, EO);
  const plan = usePop(Math.round(4.2 * fps), 14);
  const saved = usePop(Math.round(6.3 * fps), 10);
  // план: склад слева, отгрузка справа, стеллаж на пути
  const PW = 700;
  const PH = 300;
  const pathLong = "M110,150 L230,150 L230,250 L450,250 L450,150 L590,150";
  const pathShort = "M110,150 L590,150";
  const robotK = (t * 0.5) % 1;
  return (
    <AbsoluteFill>
      <Paper />
      {/* флипчарт */}
      <div style={{position: "absolute", left: BOARD2.x, top: BOARD2.y, width: BOARD2.w, height: BOARD2.h, background: RK.ink, borderRadius: 16, boxShadow: `12px 12px 0 rgba(38,38,38,0.25)`}}>
        <div style={{position: "absolute", left: BOARD2.w / 2 - 120, top: -20, width: 240, height: 36, background: "#111", borderRadius: 10, zIndex: 3}} />
        <div style={{position: "absolute", left: 16, top: 16, right: 16, bottom: 16, background: RK.paper, borderRadius: 8, padding: "30px 36px", boxSizing: "border-box", overflow: "hidden", backgroundImage: "linear-gradient(rgba(38,38,38,0.06) 2px, transparent 2px)", backgroundSize: "100% 56px"}}>
          {flip < 1
            ? T.criteria.map((c, i) => {
                const at = Math.round(ticks[i] * fps);
                const k = p01(f, at - 6, at, EO);
                const d = p01(f, at, at + 8);
                return (
                  <div key={i} style={{display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 30, opacity: (0.2 + 0.8 * k) * (1 - flip)}}>
                    <svg width={58} height={58} viewBox="0 0 58 58" style={{flexShrink: 0}}>
                      <rect x={6} y={6} width={46} height={46} rx={7} fill={RK.paper} stroke={RK.ink} strokeWidth={4.5} />
                      <path d="M12 30 L26 44 L56 8" fill="none" stroke={RK.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={66} strokeDashoffset={66 * (1 - d)} />
                    </svg>
                    <div>
                      <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 46, letterSpacing: "-0.03em", lineHeight: 1.08, color: RK.ink}}>{c.title}</div>
                      <div style={{fontFamily: INTER, fontWeight: 600, fontSize: 32, lineHeight: 1.2, color: RK.ink, marginTop: 4}}>{c.text}</div>
                    </div>
                  </div>
                );
              })
            : null}
          {flip > 0 ? (
            <div style={{position: "absolute", inset: 0, padding: "30px 36px", background: RK.paper, transformOrigin: "50% 0%", transform: `perspective(1600px) rotateX(${(-100 * (1 - flip)).toFixed(1)}deg)`, backgroundImage: "linear-gradient(rgba(38,38,38,0.06) 2px, transparent 2px)", backgroundSize: "100% 56px"}}>
              <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 46, letterSpacing: "-0.03em", color: RK.ink, marginBottom: 26}}>{T.title}</div>
              <div style={{display: "flex", alignItems: "flex-start", gap: 12, fontFamily: INTER, fontWeight: 800, fontSize: 54, letterSpacing: "-0.03em", color: RK.ink, whiteSpace: "nowrap"}}>
                <span>60 ×</span>
                <span style={{display: "inline-flex", flexDirection: "column", alignItems: "center", position: "relative"}}>
                  <span style={{position: "relative"}}>
                    <span style={{opacity: 1 - swap}}>{T.before.trip}</span>
                    <span style={{position: "absolute", left: 0, top: 0, opacity: swap, color: RK.blue}}>{T.after.trip}</span>
                  </span>
                  <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 22, color: RK.blue, marginTop: 6}}>{T.tripLabel}</span>
                </span>
                <span style={{color: RK.muted}}>÷ (60 × 0,75)</span>
              </div>
              <div style={{height: 6, background: RK.ink, borderRadius: 3, margin: "18px 0 10px", scale: `${p01(t, 2.8, 3.1, EO)} 1`, transformOrigin: "0 50%"}} />
              {t > 2.9 ? (
                <div style={{display: "flex", alignItems: "baseline", gap: 20}}>
                  <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 80, color: RK.muted}}>=</span>
                  <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 150, letterSpacing: "-0.04em", lineHeight: 0.95, color: RK.ink, translate: `0 ${t > 6.7 && t < 7.2 ? (roll < 0.5 ? -roll * 80 : (1 - roll) * 80) : 0}px`, opacity: t > 6.7 && t < 7.2 ? Math.abs(roll - 0.5) * 2 : 1}}>
                    <Marked p={p01(t, 3.4, 3.8, EO)} color={t > 7.0 ? "#B9F3C9" : RK.lemon}>
                      {shown}
                    </Marked>
                  </span>
                  <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 56, color: RK.ink}}>роботов</span>
                  {t > 7.2 ? <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 22, color: RK.muted, opacity: p01(t, 7.2, 7.5)}}>{T.after.approx}</span> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {/* план склада */}
      {plan > 0 ? (
        <div style={{position: "absolute", left: 64, top: 1045, width: PW, height: PH, background: "#EDE8DF", border: `5px solid ${RK.ink}`, borderRadius: 24, boxShadow: `8px 8px 0 ${RK.ink}`, overflow: "hidden", opacity: Math.min(1, plan * 1.6), translate: `0 ${(1 - plan) * 60}px`}}>
          <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} style={{position: "absolute", inset: 0}}>
            {/* склад слева, отгрузка справа */}
            {[40, 120, 200].map((y) => (
              <rect key={y} x={30} y={y - 20} width={60} height={40} fill={RK.ink} rx={4} />
            ))}
            <rect x={600} y={100} width={80} height={100} fill="none" stroke={RK.ink} strokeWidth={4} strokeDasharray="8 6" rx={8} />
            <text x={640} y={226} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={20} fill={RK.ink}>
              {T.shipping}
            </text>
            {/* стеллаж: стоит на прямом пути, Ави сдвигает его вниз */}
            <rect x={320} y={100 + rackMove * 120} width={70} height={110} fill={RK.ink} rx={6} />
            <rect x={326} y={106 + rackMove * 120} width={58} height={98} fill="none" stroke={RK.lemon} strokeWidth={3} rx={4} opacity={rackMove > 0 && rackMove < 1 ? 1 : 0} />
            {/* маршрут: длинный в объезд → короткий прямой */}
            <path d={pathLong} fill="none" stroke={RK.blue} strokeWidth={6} strokeDasharray="12 9" opacity={1 - reroute} />
            <path d={pathShort} fill="none" stroke={RK.blue} strokeWidth={6} strokeDasharray="12 9" pathLength={1} strokeDashoffset={0} opacity={reroute} />
            {/* робот-точка */}
            {(() => {
              const pts = reroute > 0.5 ? [[110, 150], [590, 150]] : [[110, 150], [230, 150], [230, 250], [450, 250], [450, 150], [590, 150]];
              const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
              let d = seg.reduce((a, b) => a + b, 0) * robotK;
              let x = pts[0][0];
              let y = pts[0][1];
              for (let i = 0; i < seg.length; i++) {
                if (d <= seg[i]) {
                  x = pts[i][0] + ((pts[i + 1][0] - pts[i][0]) * d) / seg[i];
                  y = pts[i][1] + ((pts[i + 1][1] - pts[i][1]) * d) / seg[i];
                  break;
                }
                d -= seg[i];
              }
              return <rect x={x - 16} y={y - 12} width={32} height={24} rx={6} fill="#F26B1D" stroke={RK.ink} strokeWidth={3} />;
            })()}
          </svg>
          {saved > 0 ? (
            <div style={{position: "absolute", left: 360, top: 34, translate: "-50% 0", scale: String(0.6 + 0.4 * saved), background: "#E4F5E9", border: `4px solid #1F8A4C`, borderRadius: 999, padding: "6px 20px", fontFamily: INTER, fontWeight: 800, fontSize: 34, color: "#1F8A4C", whiteSpace: "nowrap"}}>
              ⏱ {T.saved}
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{position: "absolute", inset: 0, zIndex: 6}}>
        <AuraMascot
          scale={1.35}
          dpr={1.25}
          plan={{
            stays: [{at: 0, x: 930, y: 1355, face: -0.6}],
            gestures: [...ticks.map((x) => ({at: x - 0.15, kind: "tick" as const})), {at: 3.2, kind: "point"}, {at: 4.9, kind: "push"}, {at: 7.3, kind: "jump"}],
            emotes: [{at: 3.6, kind: "thinking", dur: 1.3}, {at: 7.3, kind: "happy", dur: 3}],
          }}
        />
      </div>
      <SpecCard x={64} y={1365} w={952} at={Math.round(7.4 * fps)} lines={[T.card]} note={T.note.toUpperCase()} size={42} />
      <Sounds
        list={[
          [0, "@swipe-1", 0.3],
          ...ticks.map((x) => [x, "@click-1", 0.4] as Snd),
          [2.2, "@flip-1", 0.5],
          [3.0, "@pop-1", 0.25],
          [4.9, "@zvukitop/zt-gear", 0.4],
          [6.2, "@whoosh-3", 0.3],
          [6.75, "@coin-1", 0.35],
          [7.4, "@stamp-1", 0.4],
        ]}
      />
    </AbsoluteFill>
  );
};

// ===== 10. Развязка: 11.11, таймер зелёный, 7 роботов, порог убрали, начальник 👍 =====
export const PayoffBeat: React.FC<BP> = ({P}) => {
  const {t, fps} = useT();
  const C = P.payoff;
  const cam = camAt(t, [
    [0, CAMS.client],
    [6.4, {pos: [2.0, 14.8, 13.4], target: [0, 0, 0.8], fov: 42}],
  ]);
  const robots = payoffRobots(t, C.robots);
  const fixedPt = toScreen([2.6, 0.05, 4.5], cam);
  const fixedS = usePop(Math.round(1.4 * fps), 12);
  return (
    <AbsoluteFill>
      <Paper />
      <Panel3D cam={cam}>
        <PayoffWorld t={t} n={C.robots} />
      </Panel3D>
      <Tint kind="warm" o={1} />
      {robots.map((s, i) => {
        const [x, y] = toScreen([s.x, 1.55, s.z], cam);
        const at = 0.3 + i * 0.13;
        const k = t < at ? 0 : Math.min(1, (t - at) / 0.25);
        if (k <= 0) return null;
        return (
          <div key={i} style={{position: "absolute", left: x, top: y, translate: "-50% -50%", width: 50, height: 50, borderRadius: 99, background: RK.lemon, border: `4px solid ${RK.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 28, color: RK.ink, scale: String(k), boxShadow: `3px 3px 0 ${RK.ink}`}}>
            {i + 1}
          </div>
        );
      })}
      {fixedS > 0 ? (
        <div style={{position: "absolute", left: fixedPt[0] - 330, top: fixedPt[1] + 34, scale: String(0.6 + 0.4 * fixedS), opacity: Math.min(1, fixedS * 2), background: RK.paper, border: `4px solid ${RK.blue}`, borderRadius: 14, padding: "6px 16px", fontFamily: INTER, fontWeight: 800, fontSize: 34, color: RK.blue, boxShadow: `5px 5px 0 ${RK.blue}`, whiteSpace: "nowrap"}}>
          ✓ {C.fixed}
        </div>
      ) : null}
      <Title x={64} y={CARD_Y + 14} w={600} text={C.caption.text} mark={C.caption.mark} at={Math.round(1.0 * fps)} size={62} />
      <Manager x={660} y={980} scale={0.86} mood="happy" arms="thumb" at={Math.round(1.2 * fps)} from="right" />
      <Sounds list={[[0, "@swipe-1", 0.3], [0.3, "@zvukitop/zt-clock", 0.35], ...robots.map((_, i) => [0.3 + i * 0.13, "@click-2", 0.16] as Snd), [1.0, "@success-1", 0.3], [1.2, "@pop-1", 0.25], [1.4, "@ding-2", 0.2]]} />
    </AbsoluteFill>
  );
};

// ===== 11. Крючок: телефон Ави — «SOS · Сучжоу», намёк на кобота; затемнение, «Серия 2 · скоро», печать Aura и адрес =====
export const CliffBeat: React.FC<BP> = ({P}) => {
  const {f, fps} = useT();
  const C = P.cliff;
  const blackAt = Math.round(3.5 * fps);
  const black = p01(f, blackAt, blackAt + 6);
  return (
    <AbsoluteFill>
      <Paper />
      <Tint kind="warm" o={1} />
      <AuraMascot scale={1.55} dpr={1.25} plan={{stays: [{at: 0, x: 300, y: 1500, face: 0.35}], gestures: [{at: 0.1, kind: "nod"}], emotes: [{at: 0, kind: "happy", dur: 0.8}, {at: 0.9, kind: "alert", dur: 1.6}]}} />
      <div style={{position: "absolute", left: 0, top: 0, width: 1080, height: 1920, scale: "1.14", transformOrigin: "1000px 440px"}}>
        <SosPhone x={560} y={440} at={Math.round(0.7 * fps)} title={C.sos} city={C.city} />
      </div>
      {black > 0 ? (
        <AbsoluteFill style={{background: "#121214", opacity: black, alignItems: "center", justifyContent: "center"}}>
          <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 44, letterSpacing: "0.14em", color: RK.lemon, opacity: p01(f, blackAt + 6, blackAt + 16)}}>{C.next.toUpperCase()}</div>
          <div style={{position: "absolute", left: 0, right: 0, top: 1240, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: p01(f, blackAt + 14, blackAt + 26)}}>
            <Sequence from={blackAt + 12} layout="none">
              <AuraBadge size={130} />
            </Sequence>
            <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 34, color: RK.paper, letterSpacing: "0.04em"}}>{C.url}</div>
          </div>
        </AbsoluteFill>
      ) : null}
      <Sounds list={[[0.7, "@vibrate-1", 0.5], [1.0, "@ding-2", 0.3], [3.5, "@zvukitop/zt-suspense-1", 0.4]]} />
    </AbsoluteFill>
  );
};
