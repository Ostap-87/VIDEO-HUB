// Персонажи Aura — портреты «как фото» со списком, чтобы придумать имена (решение пользователя 05.11.2026: «как только
// определишься со всем набором маскотов — покажи их фото и списком, и давай придумаем им имена»).
// AuraCast — 1080×1350 (4:5), кадр N = портрет N: персонаж в героической позе на «фото» (белая карточка с сеткой Aura,
// мягкая тень), под ним плашка «Имя: ?», роль одной строкой и скин. Последний кадр — общий состав (групповое фото).
// Позы — те же планы моделей, что в роликах, в замороженный момент `t` (модели принимают время извне).
// Имена утверждены пользователем 05.11.2026: крупно имя, под ним моно-строкой английское и китайское имя, затем роль и скин;
// на групповом фото — плашки с именами у каждого персонажа (точка привязки в 3D проецируется в кадр).
// Рендер всех кадров: TMPDIR=/dev/shm/remotion-tmp npx remotion render src/index.ts AuraCast <папка> --sequence --image-format=png --bundle-cache=false
import React from "react";
import * as THREE from "three";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {STYLES, inter, loadCjk} from "./carousel/kit";
import {Accent, Box, RBox, Stage, Cyl, Glow, Graphite, Parchment, Ring, Shadow, Tag, type Cam, type V3} from "../components/aura3d/kit";
import {MascotModel} from "../components/AuraMascot";
import {DogModel} from "../components/aura3d/AuraDog";
import {HumanoidModel} from "../components/aura3d/AuraHumanoid";
import {WheelHumanoidModel} from "../components/aura3d/AuraWheelHumanoid";
import {ArmModel, type ArmSkin} from "../components/aura3d/AuraArm";
import {HandModel} from "../components/aura3d/AuraHand";
import {AgvModel} from "../components/aura3d/AuraAgv";
import {DroneModel} from "../components/aura3d/AuraDrone";

const S = STYLES.aura;
const INK = "#262626";
const LEMON = "#FFF65D";
export const CAST_CARD = {left: 56, top: 96, width: 968, height: 920};
// моно-строка имён: латиница — JetBrains Mono, иероглифы — Noto Sans SC (грузится кусками с нужными знаками)
const MONO_CJK = `"JetBrains Mono", "Noto Sans SC", monospace`;

export type CastName = {ru: string; en: string; zh: string};
type Portrait = {id: string; name: CastName; role: string; skin: string; cam: Cam; scene: () => React.ReactNode; dpr?: number};

// поза манипулятора: держит коробку поднятой, запястье вперёд
const armHero = (skin: ArmSkin) => (
  <ArmModel
    skin={skin}
    t={1}
    plan={{
      keys: [{at: 0, p: [1.35, 2.35, 0.6], tool: Math.PI * 0.55, j6: 0.2, grip: 0.36}],
      items: [{start: [0, 0, 0], carry: [[0, 10]]}],
    }}
  />
);
// роборука «статуей»: предплечье стоит вертикально на постаменте, кисть тыльной стороной к зрителю, пальцы чуть согнуты (как на референсе)
const HandPlinth: React.FC<{p: V3}> = ({p}) => (
  <group position={p}>
    <Shadow w={1.1} d={1.1} o={0.7} />
    <Cyl a={0.24} b={0.3} h={0.32} p={[0, 0.16, 0]}>
      <Graphite />
    </Cyl>
    <Cyl a={0.25} b={0.25} h={0.03} p={[0, 0.335, 0]}>
      <Parchment />
    </Cyl>
    <Ring r={0.255} tube={0.008} p={[0, 0.35, 0]} rot={[Math.PI / 2, 0, 0]}>
      <Glow k={1.6} />
    </Ring>
    <Tag p={[0, 0.16, 0.285]} rot={[-0.18, 0, 0]} w={0.16} h={0.07} />
  </group>
);
const handHero = (skin?: "chrome") => (
  <>
    <HandPlinth p={[0, 0, 0]} />
    <HandModel skin={skin} t={0} plan={{keys: [{at: 0, pose: "relaxed", p: [0, 1.06, 0], rot: [0, 0.55, 0]}]}} />
  </>
);

export const PORTRAITS: Portrait[] = [
  {
    id: "mascot", name: {ru: "Ави", en: "Avi", zh: "阿维"},
    role: "ведущий-инженер",
    skin: "Aura",
    cam: {pos: [1.5, 2.3, 8.3], target: [0, 1.75, 0], fov: 30},
    scene: () => <MascotModel t={1.05} yaw={-0.25} gestures={[{at: 0, kind: "wave"}]} emotes={[{at: 0.2, kind: "happy", dur: 3}]} />,
  },
  {
    id: "dog", name: {ru: "Скаут", en: "Scout", zh: "斯考特"},
    role: "робособака-разведчик",
    skin: "Aura",
    cam: {pos: [1.35, 1.25, 3.7], target: [0, 0.42, 0], fov: 30},
    scene: () => <DogModel t={0.3} plan={{stays: [{at: -10, x: 0, z: 0, yaw: -0.75}]}} />,
  },
  {
    id: "humanoid", name: {ru: "Леон", en: "Leon", zh: "莱昂"},
    role: "гуманоид",
    skin: "Aura",
    cam: {pos: [1.5, 2.3, 8.2], target: [0, 1.95, 0], fov: 30},
    scene: () => <HumanoidModel t={1.0} plan={{stays: [{at: -10, x: 0, z: 0, yaw: -Math.PI / 2 + 0.25}], gestures: [{at: 0, kind: "wave"}]}} />,
  },
  {
    id: "humanoid-navy", name: {ru: "Нова", en: "Nova", zh: "诺娃"},
    role: "гуманоид",
    skin: "navy · белый, тёмно-синий, красный",
    cam: {pos: [1.5, 2.3, 8.2], target: [0, 1.95, 0], fov: 30},
    scene: () => <HumanoidModel skin="navy" t={0.95} plan={{stays: [{at: -10, x: 0, z: 0, yaw: -Math.PI / 2 + 0.25}], gestures: [{at: 0, kind: "present"}]}} />,
  },
  {
    id: "wheel-humanoid", name: {ru: "Роли", en: "Rolly", zh: "罗利"},
    role: "гуманоид на колёсах",
    skin: "Aura",
    cam: {pos: [1.8, 2.3, 8.0], target: [0, 1.85, 0], fov: 30},
    scene: () => <WheelHumanoidModel t={1.0} plan={{stays: [{at: -10, x: 0, z: 0, yaw: -Math.PI / 2 + 0.3}], lift: [[0, 0.55]], gestures: [{at: 0, kind: "wave"}]}} />,
  },
  {
    id: "wheel-humanoid-navy", name: {ru: "Кэрри", en: "Carry", zh: "凯丽"},
    role: "гуманоид на колёсах",
    skin: "navy · несёт коробку",
    cam: {pos: [2.1, 2.3, 7.4], target: [0, 1.6, 0], fov: 30},
    scene: () => (
      <WheelHumanoidModel
        skin="navy"
        t={3}
        plan={{stays: [{at: -10, x: 0, z: 0, yaw: -Math.PI / 2 + 0.35}], lift: [[0, 0.5]], carry: [{at: 0, from: [0, 1.6, 0.6], until: 99, to: [0, 0, 0]}]}}
      />
    ),
  },
  {id: "arm", name: {ru: "Арми", en: "Armie", zh: "阿米"}, role: "промышленный манипулятор", skin: "Aura", cam: {pos: [3.9, 2.4, 6.4], target: [0.75, 1.45, 0.2], fov: 30}, scene: () => armHero("aura")},
  {
    id: "arm-industrial", name: {ru: "Титан", en: "Titan", zh: "泰坦"},
    role: "промышленный манипулятор",
    skin: "industrial · белая эмаль",
    cam: {pos: [3.9, 2.4, 6.4], target: [0.75, 1.45, 0.2], fov: 30},
    scene: () => armHero("industrial"),
  },
  {id: "cobot", name: {ru: "Тихон", en: "Tikhon", zh: "吉洪"}, role: "кобот", skin: "cobot · белый с синим", cam: {pos: [3.9, 2.4, 6.4], target: [0.75, 1.45, 0.2], fov: 30}, scene: () => armHero("cobot")},
  {id: "hand", name: {ru: "Пятёрка", en: "Fiver", zh: "小五"}, role: "роборука", skin: "Aura", cam: {pos: [0.7, 1.55, 5.0], target: [0, 1.0, 0], fov: 30}, scene: () => handHero()},
  {id: "hand-chrome", name: {ru: "Рубин", en: "Ruby", zh: "鲁比"}, role: "роборука", skin: "chrome · чёрный хром, красные кольца", cam: {pos: [0.7, 1.55, 5.0], target: [0, 1.0, 0], fov: 30}, scene: () => handHero("chrome")},
  {
    id: "agv", name: {ru: "Шустрик", en: "Zippy", zh: "快快"},
    role: "AGV-тележка",
    skin: "Aura",
    cam: {pos: [3.8, 2.7, 4.9], target: [0, 0.62, 0], fov: 30},
    scene: () => <AgvModel t={2} plan={{stays: [{at: -10, x: 0, z: 0, yaw: -0.5}], boxes: 2, lift: [[0, 1]]}} />,
  },
  {
    id: "agv-orange", name: {ru: "Рыжик", en: "Ginger", zh: "小橙"},
    role: "AGV-тележка",
    skin: "orange · оранжевый с чёрным",
    cam: {pos: [3.6, 2.6, 4.6], target: [0, 0.55, 0], fov: 30},
    scene: () => <AgvModel skin="orange" t={2} plan={{stays: [{at: -10, x: 0, z: 0, yaw: -0.5}], boxes: 1, lift: [[0, 0]]}} />,
  },
  {
    id: "drone", name: {ru: "Сокол", en: "Falcon", zh: "猎鹰"},
    role: "дрон-инспектор",
    skin: "Aura",
    cam: {pos: [1.75, 2.25, 3.35], target: [0, 0.72, 0], fov: 30},
    scene: () => <DroneModel t={1.3} plan={{stays: [{at: 0, x: 0, y: 0.75, z: 0, yaw: -0.55}]}} />,
  },
  {
    id: "drone-white", name: {ru: "Стриж", en: "Swift", zh: "雨燕"},
    role: "дрон-инспектор",
    skin: "whiteOrange · белый с оранжевым",
    cam: {pos: [1.75, 2.25, 3.35], target: [0, 0.72, 0], fov: 30},
    scene: () => <DroneModel skin="whiteOrange" t={2.1} plan={{stays: [{at: 0, x: 0, y: 0.75, z: 0, yaw: -0.55}]}} />,
  },
  {
    id: "cargo-drone", name: {ru: "Аист", en: "Stork", zh: "白鹳"},
    role: "грузовой дрон",
    skin: "Aura",
    cam: {pos: [2.9, 3.0, 7.2], target: [0, 1.5, 0], fov: 30},
    scene: () => <DroneModel kind="cargo" t={1.7} plan={{stays: [{at: 0, x: 0, y: 1.6, z: 0, yaw: -0.5}], cargo: {attached: true}}} />,
  },
];

// общий состав: задний ряд — высокие, передний — маленькие, дроны над ними
// общий состав — все 16: сзади манипуляторы и кобот, в середине гуманоиды и маскот, спереди AGV, собака и роборуки,
// сверху дроны. Плашки имён — по точкам привязки LINEUP_TAGS (над головой / у основания).
const LINEUP_CAM: Cam = {pos: [0, 5.4, 17.6], target: [0, 3.0, 0], fov: 30};
const POD = 1.7; // высота подиума заднего ряда
const LINEUP_TAGS: {id: string; p: V3}[] = [
  {id: "arm-industrial", p: [-4.45, POD + 1.25, -2.3]},
  {id: "cobot", p: [0.95, POD + 2.65, -3.2]},
  {id: "arm", p: [4.45, POD + 1.25, -2.3]},
  {id: "humanoid", p: [-2.75, 3.75, -1.0]},
  {id: "humanoid-navy", p: [-1.35, 3.75, -1.0]},
  {id: "mascot", p: [0.05, 3.65, -0.8]},
  {id: "wheel-humanoid", p: [1.4, 3.6, -1.0]},
  {id: "wheel-humanoid-navy", p: [2.8, 3.6, -1.0]},
  {id: "agv-orange", p: [-3.3, -0.25, 1.7]},
  {id: "dog", p: [-1.35, -0.25, 2.1]},
  {id: "hand", p: [-0.05, -0.25, 2.2]},
  {id: "hand-chrome", p: [1.1, -0.25, 2.2]},
  {id: "agv", p: [3.1, -0.25, 1.7]},
  {id: "drone", p: [-3.2, 6.45, -0.6]},
  {id: "drone-white", p: [3.2, 6.45, -0.6]},
  {id: "cargo-drone", p: [0.0, 7.55, -2.2]},
];
const handStatue = (p: V3, skin?: "chrome", k = 0.72) => (
  <group position={p} scale={k}>
    <HandPlinth p={[0, 0, 0]} />
    <HandModel skin={skin} t={0} plan={{keys: [{at: 0, pose: "relaxed", p: [0, 1.06, 0], rot: [0, 0.55, 0]}]}} />
  </group>
);
// подиум заднего ряда: пергамент, графитовый цоколь, лимонная кромка
const Podium: React.FC = () => (
  <group position={[0, 0, -3.3]}>
    <Shadow w={11} d={3} o={0.35} />
    <RBox s={[10.4, POD, 2.0]} r={0.06} p={[0, POD / 2, 0]}>
      <Parchment />
    </RBox>
    <Box s={[10.42, 0.06, 0.02]} p={[0, POD - 0.06, 1.002]}>
      <Accent />
    </Box>
    <Box s={[10.42, 0.08, 2.02]} p={[0, 0.04, 0]}>
      <Graphite />
    </Box>
  </group>
);
const Lineup: React.FC = () => (
  <>
    {/* задний ряд на подиуме: Титан, Тихон, Арми */}
    <Podium />
    <ArmModel skin="industrial" t={1} p={[-3.6, POD, -3.4]} plan={{keys: [{at: 0, p: [0.45, 2.45, 0.55], tool: Math.PI * 0.6, grip: 0.5}]}} />
    <ArmModel skin="cobot" t={1} p={[0.0, POD, -3.4]} plan={{keys: [{at: 0, p: [0.35, 2.35, 0.55], tool: Math.PI * 0.6, grip: 0.4}]}} />
    <ArmModel t={1} p={[3.6, POD, -3.4]} plan={{keys: [{at: 0, p: [-0.45, 2.45, 0.55], tool: Math.PI * 0.6, grip: 0.5}]}} />
    {/* средний ряд: Леон, Нова, Ави, Роли, Кэрри */}
    <HumanoidModel t={1.0} plan={{stays: [{at: -10, x: -2.75, z: -1.0, yaw: -Math.PI / 2 + 0.2}], gestures: [{at: 0, kind: "wave"}]}} />
    <HumanoidModel skin="navy" t={0.95} plan={{stays: [{at: -10, x: -1.35, z: -1.0, yaw: -Math.PI / 2 + 0.1}], gestures: [{at: 0, kind: "nod"}]}} />
    <MascotModel t={1.1} p={[0.05, 0, -0.8]} yaw={-0.05} gestures={[{at: 0, kind: "wave"}]} emotes={[{at: 0, kind: "happy", dur: 5}]} />
    <WheelHumanoidModel t={1.0} plan={{stays: [{at: -10, x: 1.4, z: -1.0, yaw: -Math.PI / 2 - 0.15}], lift: [[0, 0.4]], gestures: [{at: 0, kind: "point"}]}} />
    <WheelHumanoidModel
      skin="navy"
      t={3}
      plan={{stays: [{at: -10, x: 2.8, z: -1.0, yaw: -Math.PI / 2 - 0.3}], lift: [[0, 0.45]], carry: [{at: 0, from: [2.8, 1.6, -0.4], until: 99, to: [0, 0, 0]}]}}
    />
    {/* передний ряд: Рыжик, Скаут, Пятёрка, Рубин, Шустрик */}
    <AgvModel skin="orange" t={2} plan={{stays: [{at: -10, x: -3.3, z: 1.7, yaw: -0.3}], boxes: 1}} />
    <DogModel t={0.4} plan={{stays: [{at: -10, x: -1.35, z: 2.1, yaw: -1.1}]}} />
    {handStatue([-0.05, 0, 2.2])}
    {handStatue([1.1, 0, 2.2], "chrome")}
    <AgvModel t={2} plan={{stays: [{at: -10, x: 3.1, z: 1.7, yaw: Math.PI + 0.3}], boxes: 2, lift: [[0, 1]]}} />
    {/* дроны: Сокол, Стриж, Аист */}
    <DroneModel t={1.2} plan={{stays: [{at: 0, x: -3.2, y: 5.55, z: -0.6, yaw: -0.5}]}} shadow={false} />
    <DroneModel t={1.6} skin="whiteOrange" plan={{stays: [{at: 0, x: 3.2, y: 5.55, z: -0.6, yaw: -2.5}]}} shadow={false} />
    <DroneModel kind="cargo" t={1.7} plan={{stays: [{at: 0, x: 0.0, y: 6.3, z: -2.2, yaw: -0.45}], cargo: {attached: true}}} shadow={false} />
  </>
);
// точка сцены → пиксели карточки (та же камера, что у Stage)
const project = (p: V3, cam: Cam, w: number, h: number): [number, number] => {
  const c = new THREE.PerspectiveCamera(cam.fov ?? 30, w / h, 0.05, 200);
  c.position.set(...cam.pos);
  c.lookAt(...cam.target);
  c.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(c);
  return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
};
const NameTag: React.FC<{x: number; y: number; name: string}> = ({x, y, name}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      translate: "-50% -50%",
      fontFamily: inter.fontFamily,
      fontWeight: 700,
      fontSize: 23,
      letterSpacing: "-0.01em",
      color: INK,
      background: "rgba(255,255,255,0.94)",
      border: `2px solid ${INK}`,
      borderRadius: 999,
      padding: "2px 12px 3px",
      whiteSpace: "nowrap",
      boxShadow: `3px 3px 0 ${LEMON}`,
    }}
  >
    {name}
  </div>
);

// «фото»: белая карточка с сеткой, рамка графит
const Photo: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      position: "absolute",
      ...CAST_CARD,
      borderRadius: 18,
      border: `3px solid ${INK}`,
      overflow: "hidden",
      background: "radial-gradient(ellipse 80% 60% at 50% 38%, #FFFFFF 0%, #FBFAF7 55%, #EEEBE5 100%)",
      boxShadow: "0 24px 60px rgba(38,38,38,0.16)",
    }}
  >
    <AbsoluteFill style={{backgroundImage: S.pattern.backgroundImage, backgroundSize: "60px 60px", opacity: 0.55}} />
    {/* «пол» — мягкий светлый градиент к низу */}
    <AbsoluteFill style={{background: "linear-gradient(180deg, rgba(255,255,255,0) 62%, rgba(232,228,221,0.7) 100%)"}} />
    {children}
  </div>
);

const Plate: React.FC<{n: number; total: number; name: CastName | null; title?: string; role: string; skin: string; chipLabel?: string}> = ({n, total, name, title, role, skin, chipLabel = "скин"}) => (
  <div style={{position: "absolute", left: 72, right: 72, top: 1034, display: "flex", flexDirection: "column", gap: 6}}>
    <div style={{display: "flex", alignItems: "baseline", justifyContent: "space-between"}}>
      <div style={{fontFamily: inter.fontFamily, fontWeight: 700, fontSize: 84, letterSpacing: "-0.03em", color: INK, lineHeight: 1.0}}>
        <span style={{background: `linear-gradient(transparent 58%, ${LEMON} 58%, ${LEMON} 92%, transparent 92%)`, padding: "0 6px"}}>{name ? name.ru : title}</span>
      </div>
      <div style={{fontFamily: MONO_CJK, fontSize: 28, color: "#6B6B76", letterSpacing: "0.08em"}}>
        № {String(n).padStart(2, "0")} / {total}
      </div>
    </div>
    {name ? (
      <div style={{fontFamily: MONO_CJK, fontSize: 30, color: "#4A4A52", letterSpacing: "0.06em", paddingLeft: 6}}>
        {name.en} · {name.zh}
      </div>
    ) : null}
    <div style={{fontFamily: inter.fontFamily, fontWeight: 600, fontSize: 40, color: "#3D3D3D", letterSpacing: "-0.02em", paddingLeft: 6, marginTop: 2}}>{role}</div>
    <div style={{display: "flex", paddingLeft: 6, marginTop: 4}}>
      <div style={{fontFamily: MONO_CJK, fontSize: 24, color: INK, border: `2px solid ${INK}`, borderRadius: 999, padding: "5px 16px", background: "#F8F6F3"}}>
        <span style={{display: "inline-block", width: 12, height: 12, borderRadius: 99, background: LEMON, border: `2px solid ${INK}`, marginRight: 12, verticalAlign: "middle"}} />
        {chipLabel}: {skin}
      </div>
    </div>
  </div>
);

export const castFrames = () => PORTRAITS.length + 1;

loadCjk(PORTRAITS.map((p) => p.name.zh).join(""));

export const AuraCast: React.FC<{dpr?: number}> = ({dpr = 2}) => {
  const f = useCurrentFrame();
  const total = PORTRAITS.length;
  const P = PORTRAITS[f];
  const cam = P ? P.cam : LINEUP_CAM;
  return (
    <AbsoluteFill style={S.bg}>
      <AbsoluteFill style={S.pattern} />
      <div style={{position: "absolute", left: 72, top: 40, fontFamily: MONO_CJK, fontSize: 26, letterSpacing: "0.14em", color: "#6B6B76"}}>AURA ROBOTICS · ПЕРСОНАЖИ</div>
      <Photo>
        <Stage cam={cam} left={0} top={0} width={CAST_CARD.width} height={CAST_CARD.height} dpr={dpr}>
          {P ? P.scene() : <Lineup />}
        </Stage>
        {P
          ? null
          : LINEUP_TAGS.map((tg) => {
              const [x, y] = project(tg.p, LINEUP_CAM, CAST_CARD.width, CAST_CARD.height);
              const who = PORTRAITS.find((q) => q.id === tg.id);
              return who ? <NameTag key={tg.id} x={x} y={y} name={who.name.ru} /> : null;
            })}
      </Photo>
      {P ? (
        <Plate n={f + 1} total={total} name={P.name} role={P.role} skin={P.skin} />
      ) : (
        <Plate n={total + 1} total={total + 1} name={null} title="Команда Aura" role={`все ${total} персонажей вместе`} skin="утверждены 05.11.2026" chipLabel="имена" />
      )}
    </AbsoluteFill>
  );
};
