// Сцены применения Aura (05.11.2026) — демо-ролик и пробные кадры. Сцены — src/components/aura3d/Scenes.tsx:
// гуманоид на колёсах у конвейера → AGV, манипулятор → поддон, DarkScan (склад и пещера), дрон у стеллажа, доставка дроном.
// AuraScenes — 1080×1920, все сцены подряд с подписью-«пилюлей»; AuraScenesPreview — кадр N = сцена N в выбранный момент
// (`at`), для превью: npx remotion render src/index.ts AuraScenesPreview <папка> --sequence --image-format=png --bundle-cache=false
import React from "react";
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {STYLES, MONO} from "./carousel/kit";
import {Stage, type Cam} from "../components/aura3d/kit";
import {
  ArmPalletScene, CARRY_SECONDS, CargoDelivery, ConveyorCarryScene, DARK_SECONDS, DELIVERY_SECONDS, DRONE_SCAN_SECONDS, DarkScan, DroneRackScan,
  PALLET_SECONDS,
} from "../components/aura3d/Scenes";

const S = STYLES.aura;

type SceneDef = {id: string; kicker: string; title: string; dur: number; at: number; cam?: Cam; dark?: "warehouse" | "cave"; body?: (t?: number) => React.ReactNode};
export const SCENES: SceneDef[] = [
  {
    id: "conveyor-carry",
    kicker: "Гуманоид на колёсах",
    title: "Берёт коробку с конвейера",
    dur: CARRY_SECONDS,
    at: 8.6,
    cam: {pos: [4.6, 6.0, 10.5], target: [0.25, 0.95, -0.1], fov: 34},
    body: (t) => <ConveyorCarryScene t={t} />,
  },
  {
    id: "dark-scan",
    kicker: "Робособака-разведчик",
    title: "Сканирует тёмный склад",
    dur: DARK_SECONDS,
    at: 1.4,
    dark: "warehouse",
  },
  {
    id: "arm-pallet",
    kicker: "Промышленный манипулятор",
    title: "С конвейера — на поддон",
    dur: PALLET_SECONDS,
    at: 9.1,
    cam: {pos: [8.8, 6.4, 10.0], target: [0.25, 1.05, 0.15], fov: 33},
    body: (t) => <ArmPalletScene t={t} />,
  },
  {
    id: "drone-racks",
    kicker: "Дрон-инспектор",
    title: "Инвентаризация стеллажей",
    dur: DRONE_SCAN_SECONDS,
    at: 3.4,
    cam: {pos: [2.9, 2.1, 3.6], target: [-0.7, 1.55, -0.6], fov: 46},
    body: (t) => <DroneRackScan t={t} />,
  },
  {id: "dark-cave", kicker: "Робособака-разведчик", title: "Сканирует пещеру", dur: DARK_SECONDS, at: 1.4, dark: "cave"},
  {
    id: "cargo-delivery",
    kicker: "Грузовой дрон",
    title: "Доставка на площадку",
    dur: DELIVERY_SECONDS,
    at: 4.7,
    cam: {pos: [6.6, 4.0, 10.4], target: [0, 1.55, 0], fov: 36},
    body: (t) => <CargoDelivery t={t} />,
  },
];

const Label: React.FC<{kicker: string; title: string; dark?: boolean}> = ({kicker, title, dark}) => (
  <div style={{position: "absolute", top: 270, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 16}}>
    <div style={{fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em", color: dark ? "#D9D7D5" : "#4A4A52", textTransform: "uppercase", background: dark ? "rgba(14,15,17,0.7)" : "rgba(248,246,243,0.92)", padding: "4px 16px", borderRadius: 999}}>{kicker}</div>
    <div style={{fontFamily: S.head, fontWeight: 700, fontSize: 60, letterSpacing: "-0.02em", color: "#262626", background: "#FFF65D", padding: "6px 24px", borderRadius: 14}}>{title}</div>
  </div>
);

const SceneView: React.FC<{d: SceneDef; t?: number; dpr?: number}> = ({d, t, dpr = 1}) =>
  d.dark ? (
    <AbsoluteFill>
      <DarkScan kind={d.dark} t={t} dpr={dpr} />
      <Label kicker={d.kicker} title={d.title} dark />
    </AbsoluteFill>
  ) : (
    <AbsoluteFill style={S.bg}>
      <AbsoluteFill style={S.pattern} />
      <Stage cam={d.cam} dpr={dpr}>
        {d.body?.(t)}
      </Stage>
      <Label kicker={d.kicker} title={d.title} />
    </AbsoluteFill>
  );

const Fade: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const o = interpolate(f, [0, 0.3 * fps, (dur - 0.3) * fps, dur * fps], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const scenesSeconds = () => SCENES.reduce((a, d) => a + d.dur, 0);
export const AuraScenes: React.FC = () => {
  const {fps} = useVideoConfig();
  let from = 0;
  return (
    <AbsoluteFill style={{background: "#F8F6F3"}}>
      {SCENES.map((d) => {
        const seq = (
          <Sequence key={d.id} from={Math.round(from * fps)} durationInFrames={Math.round(d.dur * fps)} premountFor={fps}>
            <Fade dur={d.dur}>
              <SceneView d={d} />
            </Fade>
          </Sequence>
        );
        from += d.dur;
        return seq;
      })}
    </AbsoluteFill>
  );
};

// кадр N = сцена N в момент at (превью для листа персонажей)
export const AuraScenesPreview: React.FC<{dpr?: number}> = ({dpr = 2}) => {
  const f = useCurrentFrame();
  const d = SCENES[Math.min(f, SCENES.length - 1)];
  return <SceneView d={d} t={d.at} dpr={dpr} />;
};

// DarkScan отдельно (05.11.2026, «собаки на складе и в пещере — сделать максимально детализированно и реалистично»):
// AuraDarkClip — ролик 7 с (1080×1920, `kind`: склад / пещера) с переходом «как видим мы → как видит робот → обратно»;
// AuraDarkStills — кадры для превью: кадр N = DARK_STILLS[N] (склад a, b, c, пещера a, b, c)
export const AuraDarkClip: React.FC<{kind?: "warehouse" | "cave"; dpr?: number}> = ({kind = "warehouse", dpr = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = SCENES.find((x) => x.dark === kind)!;
  const black = interpolate(frame, [0, 0.4 * fps], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return (
    <AbsoluteFill style={{background: "#000"}}>
      <DarkScan kind={kind} t={frame / fps} dpr={dpr} />
      <Label kicker={d.kicker} title={d.title} dark />
      <AbsoluteFill style={{background: "#000", opacity: black}} />
    </AbsoluteFill>
  );
};
export const DARK_STILLS: {kind: "warehouse" | "cave"; t: number; look?: "lit" | "robot"}[] = [
  {kind: "warehouse", t: 1.4},
  {kind: "warehouse", t: 3.15},
  {kind: "warehouse", t: 6.5},
  {kind: "cave", t: 1.4},
  {kind: "cave", t: 3.15},
  {kind: "cave", t: 6.5},
];
export const AuraDarkStills: React.FC<{dpr?: number; only?: number}> = ({dpr = 2, only}) => {
  const f = useCurrentFrame();
  const st = DARK_STILLS[Math.min(only ?? f, DARK_STILLS.length - 1)];
  const d = SCENES.find((x) => x.dark === st.kind)!;
  return (
    <AbsoluteFill style={{background: "#000"}}>
      <DarkScan kind={st.kind} t={st.t} look={st.look} dpr={dpr} />
      <Label kicker={d.kicker} title={d.title} dark />
    </AbsoluteFill>
  );
};
