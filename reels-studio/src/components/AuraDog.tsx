// Робособака Aura Robotics (решение пользователя 12.10.2026: «рядом с роботом небольшая робособака») — спутник маскота
// в стиле AuraMascot: те же материалы (лак, шарниры, резина), палитра сайта (#F8F6F3 / #262626 / #FFF65D), визор и глаза-диоды.
// Покадрово: дышит, виляет хвостом-антенной, наклоняет голову; hops — моменты (с), когда она радостно подпрыгивает.
// x, y — где стоят лапы (px кадра), face — поворот (0 — боком, мордой вправо; −0.6 — вправо и к зрителю; −2.5 — влево и к зрителю).
import React from "react";
import {ThreeCanvas} from "@remotion/three";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {Box, C, CameraLook, Cyl, Joint, Metal, Paint, Plate, Rubber, Sph, env, type V3} from "./AuraMascot";

export const DOG = {W: 300, H: 240, FOOT: 172}; // холст при scale 1 и где на нём стоят лапы (px от верха)
const UP = 0.3; // длина бедра и голени
const HOP = 0.75; // длительность прыжка, с

type LegPose = {hip: number; knee: number};

const Leg: React.FC<{p: V3; pose: LegPose}> = ({p, pose}) => (
  <group position={p} rotation={[0, 0, pose.hip]}>
    <Sph r={0.075}>
      <Joint />
    </Sph>
    <Plate s={[0.13, UP, 0.12]} p={[0, -UP / 2, 0]} c={C.light} />
    <group position={[0, -UP, 0]} rotation={[0, 0, pose.knee]}>
      <Sph r={0.06}>
        <Joint />
      </Sph>
      <Plate s={[0.09, UP, 0.09]} p={[0, -UP / 2, 0]} c={C.dark} cc={0.85} />
      <Sph r={0.06} p={[0, -UP, 0]}>
        <Rubber />
      </Sph>
    </group>
  </group>
);

// высота шарнира бедра над землёй при данных углах (лапа ровно на земле)
const legH = (hip: number, knee: number) => UP * Math.cos(hip) + UP * Math.cos(hip + knee) + 0.06;

export const AuraDog: React.FC<{x: number; y: number; scale?: number; face?: number; hops?: number[]; dpr?: number}> = ({
  x,
  y,
  scale = 1,
  face = -0.6,
  hops = [],
  dpr = 2,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const h = hops.find((a) => t >= a && t < a + HOP);
  const p = h === undefined ? -1 : (t - h) / HOP;
  // прыжок: присесть (0–0,25) → в воздухе (0,25–0,8) → мягко приземлиться
  const crouch = p < 0 ? 0 : p < 0.25 ? env(p / 0.5) : p > 0.8 ? env((p - 0.8) / 0.4) * 0.7 : 0;
  const air = p > 0.25 && p < 0.8 ? Math.sin(((p - 0.25) / 0.55) * Math.PI) : 0;
  const breathe = Math.sin(t * 3.1) * 0.012;
  // передние лапы: бедро вперёд-вниз, колено назад; задние — наоборот; при приседании сгибаются сильнее
  const fHip = 0.28 + crouch * 0.35;
  const fKnee = -0.56 - crouch * 0.7;
  const rHip = -0.28 - crouch * 0.35;
  const rKnee = 0.56 + crouch * 0.7;
  const tuck = air * 0.5; // в воздухе лапы поджаты
  const hipY = legH(fHip, fKnee);
  const bodyY = hipY + 0.08 + breathe + air * 0.32; // шарнир бедра на 0,08 ниже центра корпуса
  const wag = Math.sin(t * (h === undefined ? 9 : 16)) * (h === undefined ? 0.55 : 0.8);
  const tilt = Math.sin(t * 0.9) * 0.16 + (p >= 0 ? -0.1 * env(p) : 0);
  const look = Math.sin(t * 0.55 + 1) * 0.18;
  const pitch = (p > 0.25 && p < 0.8 ? -0.12 * Math.cos(((p - 0.25) / 0.55) * Math.PI) : 0) + crouch * 0.05;
  const shadowK = 1 - air * 0.45;
  const blink = (t % 4.3) < 0.12 || ((t + 2.1) % 6.7) < 0.1;
  const glow = 2.6 + Math.sin(t * 2.4) * 0.6;
  return (
    <div style={{position: "absolute", left: x - (DOG.W * scale) / 2, top: y - DOG.FOOT * scale, width: DOG.W * scale, height: DOG.H * scale, pointerEvents: "none"}}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: DOG.FOOT * scale - 8 * scale,
          width: 190 * scale * shadowK,
          height: 22 * scale * shadowK,
          translate: "-50% 0",
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(0,0,0,0.42), rgba(0,0,0,0))",
        }}
      />
      <ThreeCanvas
        width={Math.round(DOG.W * scale)}
        height={Math.round(DOG.H * scale)}
        dpr={dpr}
        gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}}
        camera={{fov: 30, position: [0.5, 1.15, 4.6], near: 0.1, far: 100}}
        style={{position: "absolute", inset: 0}}
      >
        <CameraLook target={[0, 0.52, 0]} />
        <hemisphereLight args={["#C8D8E8", "#20262C", 0.35]} />
        <directionalLight position={[4, 7, 5]} intensity={1.6} />
        <directionalLight position={[-3, 3.5, -4.5]} intensity={1.0} color={C.accent} />
        <group rotation={[0, face, 0]}>
          <group position={[0, bodyY, 0]} rotation={[0, 0, pitch]}>
            {/* корпус */}
            <Plate s={[0.92, 0.3, 0.44]} p={[0, 0, 0]} c={C.light} />
            <Plate s={[0.7, 0.16, 0.03]} p={[0, -0.02, 0.225]} c={C.dark} cc={0.85} />
            <Plate s={[0.7, 0.16, 0.03]} p={[0, -0.02, -0.225]} c={C.dark} cc={0.85} />
            <Box s={[0.34, 0.035, 0.2]} p={[0.04, 0.165, 0]}>
              <Paint c={C.accent} cc={0.9} />
            </Box>
            <Sph r={0.035} p={[0.24, -0.02, 0.245]}>
              <meshStandardMaterial color={C.glow} emissive={C.glow} emissiveIntensity={glow} />
            </Sph>
            {/* хвост-антенна */}
            <group position={[-0.46, 0.08, 0]} rotation={[wag * 0.6, wag, 0.75]}>
              <Cyl a={0.022} b={0.022} h={0.3} p={[0, 0.15, 0]}>
                <Metal />
              </Cyl>
              <Sph r={0.045} p={[0, 0.31, 0]}>
                <meshStandardMaterial color={C.glow} emissive={C.glow} emissiveIntensity={glow * 0.8} />
              </Sph>
            </group>
            {/* шея и голова */}
            <Cyl a={0.07} b={0.08} h={0.14} p={[0.44, 0.13, 0]} r={[0, 0, -0.6]}>
              <Joint />
            </Cyl>
            <group position={[0.56, 0.24, 0]} rotation={[tilt, look, 0.05]}>
              <Plate s={[0.32, 0.24, 0.3]} p={[0, 0, 0]} c={C.light} />
              <Box s={[0.05, 0.15, 0.25]} p={[0.165, -0.01, 0]}>
                <meshPhysicalMaterial color="#05070A" metalness={0.4} roughness={0.05} clearcoat={1} clearcoatRoughness={0.02} />
              </Box>
              {[-0.06, 0.06].map((z) => (
                <mesh key={z} position={[0.195, 0.0, z]} scale={[1, blink ? 0.15 : 1, 1]}>
                  <sphereGeometry args={[0.03, 14, 10]} />
                  <meshStandardMaterial color={C.glow} emissive={C.glow} emissiveIntensity={glow} />
                </mesh>
              ))}
              <Box s={[0.12, 0.05, 0.22]} p={[0.08, -0.13, 0]}>
                <Paint c={C.dark} />
              </Box>
              {[-0.1, 0.1].map((z) => (
                <Box key={z} s={[0.06, 0.12, 0.05]} p={[-0.06, 0.17, z]} r={[z > 0 ? -0.25 : 0.25, 0, 0.2 + Math.max(0, tilt) * 0.5]}>
                  <Paint c={C.dark} />
                </Box>
              ))}
            </group>
            {/* лапы */}
            <Leg p={[0.33, -0.08, 0.17]} pose={{hip: fHip + tuck, knee: fKnee - tuck}} />
            <Leg p={[0.33, -0.08, -0.17]} pose={{hip: fHip + tuck, knee: fKnee - tuck}} />
            <Leg p={[-0.33, -0.08, 0.17]} pose={{hip: rHip - tuck, knee: rKnee + tuck}} />
            <Leg p={[-0.33, -0.08, -0.17]} pose={{hip: rHip - tuck, knee: rKnee + tuck}} />
          </group>
        </group>
      </ThreeCanvas>
    </div>
  );
};

