// Объёмный график и кольцо за спиной спикера (решение пользователя 29.10.2026 по ролику Alibaba: «график и кружок сделай
// красивыми и объёмными, и пусть они будут за спиной… сделай красиво по смыслу в Remotion»). Настоящая 3D-сцена
// (@remotion/three): слева глянцевые столбики растут по очереди на стеклянной подставке, справа кольцо заполняется дугой;
// студийное окружение для бликов, камера медленно облетает. Числа не показываем — только рост (факты не выдумываем).
// Слой рисуется между видео и вырезкой спикера (нужен cutoutSrc на этот отрезок). Поле props — `charts3d`.
import React, {useMemo} from "react";
import * as THREE from "three";
import {ThreeCanvas} from "@remotion/three";
import {RoundedBoxGeometry} from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig} from "remotion";
import {CameraLook} from "./AuraMascot";
import {useBrand} from "../brand";

export type Chart3DItem = {at: number; until: number; barsAt?: number; ringAt?: number; label?: string; ringLabel?: string; ring?: number};

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const TOP = 220;
const W = 1080;
const H = 660;
const HEIGHTS = [0.55, 0.85, 1.15, 1.5, 1.95];
const BAR_COLORS = ["#9CC3FF", "#74A9FF", "#4F8BFF", "#2F6BF0", "#38BDF8"];

const Bar: React.FC<{x: number; h: number; color: string; glow?: boolean}> = ({x, h, color, glow}) => {
  const hh = Math.max(0.02, h);
  const geo = useMemo(() => new RoundedBoxGeometry(0.38, hh, 0.38, 3, Math.min(0.06, hh / 2 - 0.001)), [hh]);
  return (
    <mesh geometry={geo} position={[x, hh / 2 + 0.06, 0]}>
      <meshPhysicalMaterial color={color} metalness={0.15} roughness={0.18} clearcoat={1} clearcoatRoughness={0.05} emissive={glow ? color : "#000000"} emissiveIntensity={glow ? 0.35 : 0} />
    </mesh>
  );
};

const Arc: React.FC<{p: number; r: number; tube: number}> = ({p, r, tube}) => {
  const a = Math.max(0.001, Math.round(p * 200) / 200) * Math.PI * 2;
  const geo = useMemo(() => new THREE.TorusGeometry(r, tube, 24, 120, a), [a, r, tube]);
  return (
    <mesh geometry={geo} rotation={[0, 0, Math.PI / 2]}>
      <meshPhysicalMaterial color="#38BDF8" metalness={0.2} roughness={0.15} clearcoat={1} clearcoatRoughness={0.04} emissive="#38BDF8" emissiveIntensity={0.45} />
    </mesh>
  );
};

const Scene: React.FC<{it: Chart3DItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const dur = it.until - it.at;
  const barsAt = (it.barsAt ?? it.at + 0.3) - it.at;
  const ringAt = (it.ringAt ?? it.at + dur * 0.5) - it.at;
  const yaw = interpolate(t, [0, dur], [-0.12, 0.12]);
  const grow = (i: number) => interpolate(t, [barsAt + i * 0.14, barsAt + i * 0.14 + 0.7], [0, 1], {...clamp, easing: Easing.bezier(0.2, 1.25, 0.4, 1)});
  const ringIn = interpolate(t, [ringAt - 0.1, ringAt + 0.45], [0, 1], {...clamp, easing: Easing.bezier(0.2, 1.3, 0.4, 1)});
  const ringP = interpolate(t, [ringAt + 0.1, ringAt + 1.3], [0, it.ring ?? 0.86], {...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1)});
  const baseIn = interpolate(t, [barsAt - 0.25, barsAt + 0.25], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <>
      <CameraLook target={[0, 0.95, 0]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 6, 6]} intensity={1.7} />
      <directionalLight position={[-5, 3, -3]} intensity={1.1} color="#7DD3FC" />
      <group rotation={[0, yaw, 0]}>
        {/* слева — столбики на стеклянной подставке */}
        <group position={[-2.1, 0, 0]} rotation={[0, 0.35, 0]}>
          <mesh position={[0, 0.03, 0]} scale={[baseIn, 1, baseIn]}>
            <boxGeometry args={[2.4, 0.06, 0.8]} />
            <meshPhysicalMaterial color="#FFFFFF" transparent opacity={0.55} roughness={0.05} metalness={0} clearcoat={1} />
          </mesh>
          {HEIGHTS.map((h, i) => (
            <Bar key={i} x={-0.9 + i * 0.45} h={h * grow(i)} color={BAR_COLORS[i]} glow={i === HEIGHTS.length - 1} />
          ))}
          {/* стрелка роста над последним столбиком */}
          <mesh position={[1.0, 0.06 + HEIGHTS[4] * grow(4) + 0.28, 0]} rotation={[0, 0, 0]} scale={grow(4)}>
            <coneGeometry args={[0.14, 0.3, 24]} />
            <meshPhysicalMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.6} clearcoat={1} roughness={0.1} />
          </mesh>
        </group>
        {/* справа — кольцо: прозрачная дорожка и заполняющаяся дуга */}
        <group position={[2.05, 1.15, 0]} rotation={[0.15, -0.45 + t * 0.12, 0]} scale={ringIn}>
          <mesh>
            <torusGeometry args={[0.82, 0.13, 24, 120]} />
            <meshPhysicalMaterial color="#FFFFFF" transparent opacity={0.28} roughness={0.1} clearcoat={1} />
          </mesh>
          <Arc p={ringP} r={0.82} tube={0.15} />
          <mesh>
            <sphereGeometry args={[0.24, 32, 32]} />
            <meshPhysicalMaterial color="#2F6BF0" metalness={0.3} roughness={0.12} clearcoat={1} emissive="#2563EB" emissiveIntensity={0.25} />
          </mesh>
        </group>
      </group>
    </>
  );
};

const Chart3DOne: React.FC<{it: Chart3DItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const out = interpolate(t, [dur - 0.35, dur], [1, 0], clamp);
  const lab = (at: number) => interpolate(t, [at - it.at + 0.3, at - it.at + 0.7], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const barsAt = it.barsAt ?? it.at + 0.3;
  const ringAt = it.ringAt ?? it.at + dur * 0.5;
  // подписи — над графиком: под столбиками их закрывала голова, когда спикер наклоняется (Alibaba v2, «ТЕХНОЛОГИ…»);
  // кегль по длине подписи, чтобы длинное слово не вылезало из колонки
  const fit = (s?: string) => Math.min(44, 300 / (Math.max(1, (s ?? "").length) * 0.8));
  const label: React.CSSProperties = {
    position: "absolute",
    top: TOP + 8,
    fontFamily: B.captionFont,
    fontWeight: 800,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    color: "#FFFFFF",
    textShadow: "0 4px 0 rgba(14,26,51,0.55), 0 10px 26px rgba(0,0,0,0.45)",
    whiteSpace: "nowrap",
  };
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: "absolute", left: 0, top: TOP, width: W, height: H}}>
        <ThreeCanvas width={W} height={H} gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}} camera={{fov: 30, position: [0, 1.25, 7.6], near: 0.05, far: 100}} style={{position: "absolute", inset: 0}}>
          <Scene it={it} />
        </ThreeCanvas>
      </div>
      {it.label ? <div style={{...label, fontSize: fit(it.label), left: 30, width: 320, textAlign: "center", opacity: lab(barsAt), translate: `0px ${(1 - lab(barsAt)) * 20}px`}}>{it.label}</div> : null}
      {it.ringLabel ? <div style={{...label, fontSize: fit(it.ringLabel), right: 30, width: 320, textAlign: "center", opacity: lab(ringAt), translate: `0px ${(1 - lab(ringAt)) * 20}px`}}>{it.ringLabel}</div> : null}
    </AbsoluteFill>
  );
};

export const Charts3D: React.FC<{items?: Chart3DItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`c3d-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} layout="none" name="3D-график">
          <Chart3DOne it={it} />
        </Sequence>
      ))}
    </>
  );
};
export const chart3dActive = (items: Chart3DItem[] | undefined, t: number) => (items ?? []).some((x) => t >= x.at - 0.05 && t <= x.until + 0.05);
