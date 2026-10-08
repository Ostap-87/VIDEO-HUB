// Флаги (решение пользователя 08.10.2026, ролик «Интро»):
// - FlagArc — небольшие развевающиеся флаги стран полукругом над головой, от одного плеча до другого
//   (на словах про опыт в Юго-Восточной Азии); флаги выскакивают по очереди, ткань колышется волной;
// - WavingFlag3D — большой реальный флаг на ветру за спиной спикера (3D-ткань: волны, складки, свет и тени),
//   спикер вырезан и стоит перед ним (на словах «живу в Китае»).
// Картинки флагов — интернет-материалы/флаги/ (государственные флаги, общественное достояние, flagcdn.com / Wikimedia).
import React from "react";
import {continueRender, delayRender, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";

// ---------- маленький флаг: ткань из вертикальных полос, каждая сдвинута по волне ----------
const STRIPS = 18;
const SmallFlag: React.FC<{src: string; w: number; t: number; phase: number}> = ({src, w, t, phase}) => {
  const h = w * 0.66;
  return (
    <div style={{position: "relative", width: w + 8, height: h + 60}}>
      {/* древко */}
      <div style={{position: "absolute", left: 0, top: 0, width: 5, height: h + 60, borderRadius: 3, background: "linear-gradient(90deg,#D9D9D9,#8A8A8A)", boxShadow: "0 2px 6px rgba(0,0,0,0.4)"}} />
      <div style={{position: "absolute", left: 2, top: -5, width: 10, height: 10, borderRadius: 5, background: "#E8C76A"}} />
      {Array.from({length: STRIPS}, (_, i) => {
        const k = i / (STRIPS - 1); // 0 у древка → 1 на свободном краю
        const wave = Math.sin(t * 7 - k * 5.5 + phase);
        const dy = wave * 7 * k;
        const shade = Math.cos(t * 7 - k * 5.5 + phase) * 0.22 * (0.3 + k); // светлые и тёмные складки
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 5 + (i * w) / STRIPS,
              top: 4 + dy,
              width: w / STRIPS + 0.6,
              height: h,
              overflow: "hidden",
              boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
            }}
          >
            <Img src={staticFile(src)} style={{position: "absolute", left: (-i * w) / STRIPS, top: 0, width: w, height: h}} />
            <div style={{position: "absolute", inset: 0, background: shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`}} />
          </div>
        );
      })}
    </div>
  );
};

export const FlagArc: React.FC<{items: string[]; until: number; at: number; center: {x: number; y: number}}> = ({items, at, until, center}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps + at;
  const out = interpolate(t, [until - 0.35, until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  // эллипс от левого плеча через макушку к правому плечу
  const rx = 400;
  const ry = 600;
  const cx = center.x;
  const cy = center.y + 300;
  const n = items.length;
  const W = 96;
  return (
    <div style={{position: "absolute", inset: 0, opacity: out}}>
      {items.map((src, i) => {
        const a = Math.PI + (Math.PI * (i + 0.5)) / n; // 180°…360°
        const x = cx + rx * Math.cos(a);
        const y = cy + ry * Math.sin(a);
        const s = spring({frame: frame - Math.round(i * 0.12 * fps), fps, config: {damping: 11, stiffness: 170, mass: 0.7}});
        // каждый флаг чуть наклонён по касательной к дуге
        const tilt = ((a - 1.5 * Math.PI) * 180) / Math.PI * 0.35;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - W / 2,
              top: y - W * 0.66 - 30,
              opacity: Math.min(1, s * 1.5),
              scale: String(0.2 + 0.8 * s),
              rotate: `${tilt}deg`,
              translate: `0px ${(1 - s) * 60}px`,
              filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.35))",
            }}
          >
            <SmallFlag src={src} w={W} t={t} phase={i * 0.9} />
          </div>
        );
      })}
    </div>
  );
};

// ---------- большой флаг: 3D-ткань ----------
const Cloth: React.FC<{tex: THREE.Texture; t: number}> = ({tex, t}) => {
  const geo = React.useMemo(() => new THREE.PlaneGeometry(4.5, 3, 90, 60), []);
  const base = React.useMemo(() => Float32Array.from(geo.attributes.position.array as ArrayLike<number>), [geo]);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const k = 0.35 + 0.65 * ((x + 2.25) / 4.5); // у древка (слева) волна слабее, к свободному краю сильнее
    const z =
      (Math.sin(x * 2.2 - t * 4.2 + y * 0.6) * 0.16 + Math.sin(x * 4.1 - t * 6.3 - y * 1.1) * 0.06 + Math.sin(y * 2.0 - t * 2.4) * 0.04) * k;
    pos.setXYZ(i, x, y - k * k * 0.12 + Math.sin(x * 1.7 - t * 3.1) * 0.03 * k, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.75} metalness={0} />
    </mesh>
  );
};

const FlagScene: React.FC<{tex: THREE.Texture; t: number}> = ({tex, t}) => {
  const camera = useThree((s) => s.camera);
  React.useLayoutEffect(() => {
    camera.lookAt(-1.3, 0.15, 0);
  }, [camera]);
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[-2, 3, 4]} intensity={2.2} />
      <directionalLight position={[3, -1, 2]} intensity={0.5} color="#FFE9C4" />
      <Cloth tex={tex} t={t} />
    </>
  );
};

export const WavingFlag3D: React.FC<{src: string; at: number; until: number}> = ({src, at, until}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps + at;
  const p = Math.min(
    interpolate(t, [at, at + 0.45], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)}),
    interpolate(t, [until - 0.4, until], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
  );
  // текстуру ждём до кадра (delayRender), иначе первые кадры ушли бы без флага
  const [tex, setTex] = React.useState<THREE.Texture | null>(null);
  React.useEffect(() => {
    const h = delayRender("флаг: текстура");
    new THREE.TextureLoader().load(
      staticFile(src),
      (tx) => {
        tx.colorSpace = THREE.SRGBColorSpace;
        tx.anisotropy = 4;
        setTex(tx);
        continueRender(h);
      },
      undefined,
      () => continueRender(h),
    );
  }, [src]);
  return (
    <div style={{position: "absolute", inset: 0, opacity: p, background: "#7A0A0A"}}>
      <ThreeCanvas width={1080} height={1920} camera={{fov: 40, position: [-1.3, 0.15, 3.0], near: 0.1, far: 50}} gl={{antialias: true}}>
        {tex ? <FlagScene tex={tex} t={t} /> : null}
      </ThreeCanvas>
    </div>
  );
};
