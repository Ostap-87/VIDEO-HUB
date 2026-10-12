// Фирменная заставка GlobalTechTour для начала и конца роликов (ПРИМЕРЫ на выбор, 12.10.2026).
// Светлая студия (#EEEEF2, мягкий свет, едва заметные точки, виньетка), за надписью крупно вращается стеклянная
// пирамида из логотипа сайта (настоящее стекло three.js: преломление задника, радужная кромка, блики студии),
// на первой секунде из элементов собирается надпись GLOBAL TECH TOUR (Unbounded 700, синий бренда, объём и тень).
//
// mode:
//  - "intro" (1,8 с): сборка → чистый кадр-логотип с бликом → выход «через пирамиду»: из центра раскрывается
//    треугольное окно со светлой кромкой, в нём уже идёт ролик, надпись улетает на камеру и тает;
//  - "outro" (1,5 с): обратное — треугольное окно с роликом сжимается в точку, логотип собирается и держится,
//    под ним плашка globaltechtour.ru.
// variant: "shards" — стеклянные осколки, "blocks" — синие 3D-кубики со щелчком, "light" — световая линия и налив.
// underlay / underlayFrom — только для просмотра примеров: какой ролик виден в «окне» (по умолчанию готовый ролик
// «ИИ»; "" — без ролика). При вставке в ролики окно открывается на сам ролик.
import React from "react";
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {apexOnScreen, GlassStage, type PyramidState} from "./gtt-intro/stage3d";
import {PYR_Y, useWordmarkLayout, type Layout} from "./gtt-intro/layout";
import {SitePill, WordmarkBody, WordmarkDefs} from "./gtt-intro/wordmark";
import {ShardsLayer} from "./gtt-intro/shards";
import {Blocks3D, BLOCKS_CLICK, BLOCKS_MERGE, makeCells} from "./gtt-intro/blocks";
import {LIGHT_DEPTH, LIGHT_DONE, LightFlash, LightLayer, lightPyramid, studioDim} from "./gtt-intro/light";
import {easeInCubic, easeInOutCubic, easeOutCubic, lerp, prog, smooth} from "./gtt-intro/util";

export const gttIntroSchema = z.object({
  variant: z.enum(["shards", "blocks", "light"]),
  mode: z.enum(["intro", "outro"]),
  underlay: z.string().optional(),
  underlayFrom: z.number().optional(),
  sound: z.boolean().optional(),
});
export type GttIntroProps = z.infer<typeof gttIntroSchema>;

// длительность: интро 1,8 с, аутро 1,5 с
export const gttIntroSeconds = (mode: "intro" | "outro") => (mode === "intro" ? 1.8 : 1.5);

const DEMO_REEL = "finished-videos/2026-10-07-ai.mp4";
const DEMO_REEL_END = 93.0;
const SFX = "source-videos/2026-10-07-byt-tehnika/sfx/";

// --- треугольное «окно» (силуэт пирамиды, как значок сайта) ---
const TRI: [number, number][] = [
  [0, -2 / 3],
  [0.56, 1 / 3],
  [-0.56, 1 / 3],
];
const triPts = (h: number, cx = 540, cy = PYR_Y) => TRI.map(([x, y]) => [cx + x * h, cy + y * h] as [number, number]);
const inTri = (h: number, p: [number, number]) => {
  const [a, b, c] = triPts(h);
  const s = (p1: number[], p2: number[], p3: number[]) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = s(p, a, b);
  const d2 = s(p, b, c);
  const d3 = s(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
// высота треугольника, при которой он накрывает весь кадр
const H_FULL = (() => {
  let h = 100;
  while (
    !(
      [
        [0, 0],
        [1080, 0],
        [0, 1920],
        [1080, 1920],
      ] as [number, number][]
    ).every((p) => inTri(h, p))
  )
    h += 20;
  return h + 60;
})();
const holeClip = (h: number) => {
  if (h <= 1) return undefined;
  const pts = triPts(h)
    .map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`)
    .join(", ");
  const [a] = triPts(h);
  return `polygon(evenodd, 0px 0px, 1080px 0px, 1080px 1920px, 0px 1920px, 0px 0px, ${pts}, ${a[0].toFixed(1)}px ${a[1].toFixed(1)}px)`;
};

const PortalRim: React.FC<{h: number; k: number}> = ({h, k}) => {
  if (h <= 1 || k <= 0.01) return null;
  const pts = triPts(h)
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  return (
    <svg width={1080} height={1920} style={{position: "absolute", inset: 0, overflow: "visible"}}>
      <defs>
        <filter id="gtt-rim" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <polygon points={pts} fill="none" stroke="#7DD3FC" strokeWidth={26} strokeLinejoin="round" opacity={0.85 * k} filter="url(#gtt-rim)" />
      <polygon points={pts} fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinejoin="round" opacity={k} />
    </svg>
  );
};

export const GttIntro: React.FC<GttIntroProps> = ({variant, mode, underlay, underlayFrom, sound = true}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames: N} = useVideoConfig();
  const L = useWordmarkLayout();
  const cells = React.useMemo(() => (L && variant === "blocks" ? makeCells(L) : []), [L, variant]);
  const t = frame / fps;
  const intro = mode === "intro";

  // время сборки (в аутро чуть быстрее и после начала закрытия окна)
  const tau = intro ? t : (t - 0.08) * 1.2;
  // момент, когда надпись становится «чистой», и блик по ней
  const solidAt = variant === "shards" ? 0.9 : variant === "blocks" ? BLOCKS_MERGE[0] - 0.02 : LIGHT_DEPTH[0] - 0.04;
  const solidK = smooth(prog(tau, solidAt, solidAt + 0.12));
  const shineT0 = intro ? 1.04 : 1.02;
  const shineP = prog(t, shineT0, shineT0 + 0.42);

  // наезд камеры и окно
  const exitP = intro ? prog(frame, N - 10, N - 1) : 0;
  const enterP = intro ? 1 : prog(frame, 0, 9);
  const zoom = intro
    ? 1 + 0.04 * easeOutCubic(prog(t, 0, 1.5)) + 0.55 * easeInCubic(exitP)
    : 1 + 0.24 * (1 - easeOutCubic(prog(t, 0, 0.5))) + 0.025 * prog(t, 0.5, 1.5);
  const hole = intro ? H_FULL * easeInCubic(exitP) : H_FULL * (1 - easeInOutCubic(enterP));
  const rimK = intro ? Math.min(1, exitP * 4) * (1 - prog(exitP, 0.8, 1)) : (1 - prog(enterP, 0.85, 1)) * Math.min(1, prog(enterP, 0, 0.15) * 4 + 0.3);

  // пирамида
  const lp = lightPyramid(tau);
  const pyr: PyramidState = {
    x: 540,
    y: PYR_Y,
    height: 640,
    yaw: 0.35 + 0.9 * t + 2.4 * (1 - Math.exp(-2.4 * t)) * (intro ? 1 : 0.6),
    pitch: 0.2 + 0.04 * Math.sin(1.2 * t),
    roll: 0.05 * Math.sin(1.4 * t + 0.3),
    scale: intro ? 0.8 + 0.2 * easeOutCubic(prog(t, 0, 1.1)) : 0.9 + 0.1 * easeOutCubic(prog(t, 0, 0.8)),
    glass: variant === "light" ? lp.glass : intro ? 0.25 + 0.75 * smooth(prog(t, 0, 0.35)) : 1,
    edges: variant === "light" ? lp.edges : 1,
    glow: variant === "light" ? lp.glow : 0,
    shine: variant === "light" ? lp.flash : 0,
  };

  // надпись улетает на камеру в конце интро
  const textOut = intro ? smooth(prog(frame, N - 9, N - 2)) : 0;
  const textScale = zoom * (1 + 0.3 * easeInCubic(exitP));
  const pill = intro ? 0 : smooth(prog(t, 0.92, 1.18));
  const id = `gtt-${variant}-${mode}`;
  const src = underlay === undefined ? DEMO_REEL : underlay;
  const from = underlayFrom ?? (intro ? 0 : DEMO_REEL_END - 10 / fps);

  return (
    <AbsoluteFill style={{background: src ? "#000" : "#EEEEF2"}}>
      {/* ролик под заставкой (виден в треугольном окне) */}
      {src ? (
        intro ? (
          <Sequence from={N - 11} premountFor={fps}>
            <OffthreadVideo src={staticFile(src)} muted trimBefore={Math.round(from * fps)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
          </Sequence>
        ) : (
          <Sequence durationInFrames={11} premountFor={fps}>
            <OffthreadVideo src={staticFile(src)} muted trimBefore={Math.round(from * fps)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
          </Sequence>
        )
      ) : null}

      {/* студия и пирамида; треугольное окно вырезано в этом слое */}
      <AbsoluteFill style={{clipPath: holeClip(hole), WebkitClipPath: holeClip(hole)}}>
        <GlassStage
          pyramid={pyr}
          zoom={zoom}
          bgZoom={1 + (zoom - 1) * 0.35}
          dim={variant === "light" ? studioDim(tau) : 0}
          shadow={pyr.glass}
          front={L && variant === "blocks" ? <Blocks3D cells={cells} tau={tau} box={L.box} zoom={zoom} fps={fps} /> : null}
        />
        {variant === "light" ? <LightFlash flash={lp.flash} apex={apexOnScreen(pyr, zoom)} /> : null}
      </AbsoluteFill>

      <PortalRim h={hole} k={rimK} />

      {/* надпись */}
      {L ? (
        <AbsoluteFill
          style={{
            scale: String(textScale),
            transformOrigin: "540px 960px",
            translate: `0px ${(-50 * textOut).toFixed(1)}px`,
            opacity: 1 - textOut,
            filter: textOut > 0.01 ? `blur(${(textOut * 10).toFixed(1)}px)` : undefined,
          }}
        >
          <svg width={1080} height={1920} style={{position: "absolute", inset: 0, overflow: "visible"}}>
            <WordmarkDefs id={id} shineX={lerp(L.box.l - 320, L.box.r + 320, easeInOutCubic(shineP))} />
            <Assembly L={L} variant={variant} tau={tau} id={id} fps={fps} solidK={solidK} shine={shineP > 0 && shineP < 1} />
          </svg>
          {pill > 0 ? <SitePill L={L} p={pill} /> : null}
        </AbsoluteFill>
      ) : null}

      {/* звук: вжух на сборке и на окне, щелчок на сборке */}
      {sound ? (
        <>
          <Sequence from={intro ? 0 : 2} durationInFrames={Math.round(fps * 1.2)}>
            <Audio src={staticFile(`${SFX}whoosh.wav`)} volume={0.3} />
          </Sequence>
          <Sequence
            from={Math.max(0, Math.round((intro ? 1 : 1 / 1.2) * fps * (variant === "blocks" ? BLOCKS_CLICK : variant === "light" ? LIGHT_DONE : 0.86) + (intro ? 0 : 0.08 * fps)))}
            durationInFrames={Math.round(fps * 0.8)}
          >
            <Audio src={staticFile(`${SFX}switch.wav`)} volume={0.35} />
          </Sequence>
          {intro ? (
            <Sequence from={N - 12} durationInFrames={12}>
              <Audio src={staticFile(`${SFX}whoosh.wav`)} volume={0.32} />
            </Sequence>
          ) : null}
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// сборка надписи по варианту + чистая надпись, которая проявляется после сборки
const Assembly: React.FC<{L: Layout; variant: GttIntroProps["variant"]; tau: number; id: string; fps: number; solidK: number; shine: boolean}> = ({
  L,
  variant,
  tau,
  id,
  fps,
  solidK,
  shine,
}) => {
  const depth = variant === "light" ? smooth(prog(tau, LIGHT_DEPTH[0], LIGHT_DEPTH[1])) : 1;
  const assemblyOn = variant === "shards" ? 1 - smooth(prog(tau, 0.98, 1.08)) : variant === "light" ? 1 - smooth(prog(tau, 1.0, 1.14)) : 0;
  return (
    <>
      {solidK > 0 ? (
        <g opacity={solidK}>
          <WordmarkBody L={L} id={id} depth={depth} shine={shine} rim={variant === "light" ? depth : 1} />
        </g>
      ) : null}
      {assemblyOn > 0.01 ? (
        <g opacity={assemblyOn}>
          {variant === "shards" ? <ShardsLayer L={L} tau={tau} id={id} fps={fps} /> : null}
          {variant === "light" ? <LightLayer L={L} tau={tau} id={id} /> : null}
        </g>
      ) : null}
    </>
  );
};
