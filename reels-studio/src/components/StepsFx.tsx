// Вертикальные шаги слева и интерфейс приложения поверх кадра (решения пользователя 29.10.2026 по ролику ByteDance).
// vsteps — «показать, как стрелка движется за мной вертикально слева по пунктам»: столбик пунктов в свободной левой части
// кадра, светящаяся линия, стрелка съезжает к пункту на его слове, пройденные пункты горят, следующие — приглушены.
// Слой рисуется за спикером (нужна вырезка на отрезок). Поле props — `vsteps`.
// appui — «наложить на весь экран проекцию экрана TikTok»: интерфейс ленты коротких видео поверх кадра — вкладки сверху,
// справа значки (аватар, лайк, комментарии, закладка, «поделиться»), крутящаяся пластинка, снизу @ник и подпись.
// Своими значками, без логотипа и названия сервиса; чисел (лайков, просмотров) нет. Поле props — `appui`.
import React from "react";
import {AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {useBrand} from "../brand";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

export type VStepItem = {at: number; until: number; x?: number; top?: number; gap?: number; title?: string; items: {text: string; at: number}[]};

const VStepOne: React.FC<{it: VStepItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const x = it.x ?? 70;
  const top = it.top ?? 560;
  const n = it.items.length;
  const gap = it.gap ?? Math.min(250, 700 / Math.max(1, n - 1));
  const out = interpolate(t, [dur - 0.35, dur], [1, 0], clamp);
  const rel = it.items.map((s) => s.at - it.at);
  // где стрелка: съезжает к пункту за 0,5 с на его слове
  const cur = rel.filter((r) => t >= r - 0.05).length - 1;
  const ay =
    cur < 0
      ? top - 120
      : interpolate(t, [rel[cur] - 0.05, rel[cur] + 0.45], [cur === 0 ? top - 120 : top + (cur - 1) * gap, top + cur * gap], {...clamp, easing: ease});
  const lineK = interpolate(t, [0, 0.5], [0, 1], {...clamp, easing: ease});
  const glow = `0 0 18px ${B.accent}, 0 0 4px #FFFFFF`;
  return (
    <AbsoluteFill style={{opacity: out}}>
      {it.title ? (
        <div style={{position: "absolute", left: x - 10, top: top - 190, fontFamily: B.monoFont, fontSize: 28, letterSpacing: "0.16em", color: "#FFFFFF", textTransform: "uppercase", textShadow: "0 2px 10px rgba(0,0,0,0.6)", opacity: lineK}}>
          {it.title}
        </div>
      ) : null}
      {/* линия: тусклая основа и светящаяся часть до стрелки */}
      <div style={{position: "absolute", left: x - 3, top: top - 120, width: 6, height: (gap * (n - 1) + 160) * lineK, borderRadius: 3, background: "rgba(255,255,255,0.28)"}} />
      <div style={{position: "absolute", left: x - 3, top: top - 120, width: 6, height: Math.max(0, ay - top + 120), borderRadius: 3, background: `linear-gradient(${B.accent}, #7DD3FC)`, boxShadow: glow}} />
      {it.items.map((s, i) => {
        const on = interpolate(t, [rel[i], rel[i] + 0.35], [0, 1], clamp);
        const pop = spring({frame: frame - Math.round(rel[i] * fps), fps, config: {damping: 12, stiffness: 170}});
        const y = top + i * gap;
        return (
          <React.Fragment key={i}>
            <div style={{position: "absolute", left: x - 16, top: y - 16, width: 32, height: 32, borderRadius: 16, background: on > 0.5 ? "#FFFFFF" : "rgba(255,255,255,0.35)", border: `5px solid ${B.accent}`, boxShadow: on > 0.5 ? glow : undefined, scale: String(0.7 + 0.3 * Math.max(on, 0.001) + 0.15 * (pop - Math.min(1, pop)))}} />
            <div
              style={{
                position: "absolute",
                left: x + 36,
                width: 300,
                top: y - 40,
                fontFamily: B.captionFont,
                fontWeight: 800,
                fontSize: s.text.length > 16 ? 36 : 42,
                lineHeight: 1.05,
                color: "#FFFFFF",
                textTransform: "uppercase",
                textShadow: "0 3px 0 rgba(10,20,50,0.55), 0 8px 22px rgba(0,0,0,0.55)",
                opacity: 0.35 + 0.65 * on,
                translate: `${(1 - on) * -24}px 0px`,
              }}
            >
              {s.text}
            </div>
          </React.Fragment>
        );
      })}
      {/* стрелка */}
      <svg width={70} height={70} viewBox="-35 -35 70 70" style={{position: "absolute", left: x - 35, top: ay - 35, filter: `drop-shadow(0 0 12px ${B.accent})`, opacity: lineK}}>
        <polygon points="0,26 -22,-14 0,-4 22,-14" fill="#FFFFFF" stroke={B.accent} strokeWidth={5} strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};

export const VSteps: React.FC<{items?: VStepItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`vs-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} layout="none" name="Шаги слева">
          <VStepOne it={it} />
        </Sequence>
      ))}
    </>
  );
};
export const vstepActive = (items: VStepItem[] | undefined, t: number) => (items ?? []).some((x) => t >= x.at - 0.05 && t <= x.until + 0.05);
export const vstepSounds = (items?: VStepItem[]) => (items ?? []).flatMap((it) => it.items.map((x) => x.at));

// ------------------------------------------------------------------ интерфейс ленты коротких видео поверх кадра
export type AppUiItem = {at: number; until: number; handle?: string; caption?: string; music?: string};

const ICON = {fill: "none", stroke: "#FFFFFF", strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const};
const Heart = () => (
  <svg width={78} height={78} viewBox="0 0 64 64">
    <path d="M32 54 C14 40 6 31 6 21 C6 13 12 8 19 8 C25 8 29 12 32 16 C35 12 39 8 45 8 C52 8 58 13 58 21 C58 31 50 40 32 54 Z" fill="#FFFFFF" />
  </svg>
);
const Bubble = () => (
  <svg width={78} height={78} viewBox="0 0 64 64">
    <path d="M32 8 C17 8 6 17 6 29 C6 36 10 42 16 46 L14 56 L26 50 C28 50 30 51 32 51 C47 51 58 42 58 29 C58 17 47 8 32 8 Z" fill="#FFFFFF" />
    <circle cx={21} cy={29} r={3.5} fill="#2B2B33" />
    <circle cx={32} cy={29} r={3.5} fill="#2B2B33" />
    <circle cx={43} cy={29} r={3.5} fill="#2B2B33" />
  </svg>
);
const Mark = () => (
  <svg width={72} height={72} viewBox="0 0 64 64">
    <path d="M16 8 H48 V56 L32 44 L16 56 Z" fill="#FFFFFF" />
  </svg>
);
const Share = () => (
  <svg width={78} height={78} viewBox="0 0 64 64">
    <path d="M36 10 L58 30 L36 50 V38 C22 38 12 43 6 54 C8 36 18 24 36 22 Z" fill="#FFFFFF" />
  </svg>
);

const AppUiOne: React.FC<{it: AppUiItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const k = spring({frame, fps, config: {damping: 16, stiffness: 120}});
  const out = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
  const like = interpolate(t, [0.9, 1.1, 1.35], [1, 1.35, 1], clamp);
  const liked = t > 1.0;
  const rail = [
    {y: 1010, el: <Heart />, active: liked},
    {y: 1150, el: <Bubble />},
    {y: 1290, el: <Mark />},
    {y: 1420, el: <Share />},
  ];
  const shadow = "drop-shadow(0 3px 8px rgba(0,0,0,0.55))";
  return (
    <AbsoluteFill style={{opacity: out * Math.min(1, k * 1.6)}}>
      {/* затемнение сверху и снизу, как у ленты */}
      <AbsoluteFill style={{background: "linear-gradient(rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 16%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.55) 100%)"}} />
      <div style={{position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 46, fontFamily: B.bodyFont, fontWeight: 700, fontSize: 38, color: "#FFFFFF", textShadow: "0 2px 8px rgba(0,0,0,0.5)", translate: `0px ${(1 - k) * -40}px`}}>
        <span style={{opacity: 0.62}}>Подписки</span>
        <span style={{borderBottom: "5px solid #FFFFFF", paddingBottom: 8}}>Рекомендации</span>
      </div>
      {/* аватар с плюсом */}
      <div style={{position: "absolute", left: 930, top: 840, width: 104, height: 104, borderRadius: 52, border: "4px solid #FFFFFF", background: `radial-gradient(circle at 35% 30%, #8DB4FF, ${B.accent})`, filter: shadow, translate: `${(1 - k) * 120}px 0px`}}>
        <div style={{position: "absolute", left: 32, top: 82, width: 38, height: 38, borderRadius: 19, background: "#FE2C55", color: "#FFFFFF", fontSize: 34, fontWeight: 800, lineHeight: "36px", textAlign: "center", fontFamily: B.bodyFont}}>+</div>
      </div>
      {rail.map((r, i) => (
        <div key={i} style={{position: "absolute", left: 942, top: r.y, width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", filter: `${shadow}${r.active ? " drop-shadow(0 0 0 #FE2C55)" : ""}`, translate: `${(1 - spring({frame: frame - 4 * (i + 1), fps, config: {damping: 14, stiffness: 140}})) * 140}px 0px`, scale: i === 0 ? String(like) : undefined}}>
          {i === 0 && r.active ? (
            <svg width={78} height={78} viewBox="0 0 64 64">
              <path d="M32 54 C14 40 6 31 6 21 C6 13 12 8 19 8 C25 8 29 12 32 16 C35 12 39 8 45 8 C52 8 58 13 58 21 C58 31 50 40 32 54 Z" fill="#FE2C55" />
            </svg>
          ) : (
            r.el
          )}
        </div>
      ))}
      {/* пластинка */}
      <div style={{position: "absolute", left: 936, top: 1560, width: 92, height: 92, borderRadius: 46, background: "radial-gradient(circle, #555 0 18%, #111 19% 58%, #2A2A2A 59% 100%)", border: "8px solid #222", rotate: `${t * 160}deg`, filter: shadow}}>
        <div style={{position: "absolute", left: 26, top: 26, width: 24, height: 24, borderRadius: 12, background: `radial-gradient(circle at 35% 30%, #8DB4FF, ${B.accent})`}} />
      </div>
      {/* ник, подпись, звук */}
      <div style={{position: "absolute", left: 48, right: 200, top: 1440, fontFamily: B.bodyFont, color: "#FFFFFF", textShadow: "0 2px 8px rgba(0,0,0,0.6)", translate: `0px ${(1 - k) * 60}px`}}>
        <div style={{fontWeight: 800, fontSize: 40}}>{it.handle ?? "@globaltechtour"}</div>
        {it.caption ? <div style={{fontWeight: 500, fontSize: 34, marginTop: 10, lineHeight: 1.25}}>{it.caption}</div> : null}
        <div style={{fontWeight: 600, fontSize: 30, marginTop: 14, opacity: 0.92, whiteSpace: "nowrap", overflow: "hidden"}}>
          <span style={{display: "inline-block", translate: `${-((t * 70) % 260)}px 0px`}}>♫ {it.music ?? "оригинальный звук"} · ♫ {it.music ?? "оригинальный звук"}</span>
        </div>
      </div>
      {/* полоса просмотра */}
      <div style={{position: "absolute", left: 0, right: 0, bottom: 24, height: 5, background: "rgba(255,255,255,0.28)"}}>
        <div style={{width: `${interpolate(t, [0, dur], [8, 100], clamp)}%`, height: "100%", background: "#FFFFFF"}} />
      </div>
    </AbsoluteFill>
  );
};

export const AppUis: React.FC<{items?: AppUiItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`au-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} layout="none" name="Интерфейс ленты">
          <AppUiOne it={it} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ серебристый треугольник за спиной
// Huawei 29.10.2026: «показать треугольник за моей спиной серебристого цвета с подсвечивающимися вершинами» (железный
// треугольник). Контур рисуется линией с металлическим переливом, вершины загораются по очереди (`lights` — секунды),
// дальше мягко пульсируют. Подписей у вершин нет. Поле props — `triangles`; за спикером, нужна вырезка на отрезок.
export type TriangleItem = {at: number; until: number; x?: number; y?: number; size?: number; lights?: number[]};

const TriangleOne: React.FC<{it: TriangleItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const cx = it.x ?? 540;
  const cy = it.y ?? 400;
  const R = (it.size ?? 520) / 2;
  const pts = [0, 1, 2].map((i) => [cx + R * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 3), cy + R * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 3)] as [number, number]);
  const draw = interpolate(t, [0, 0.9], [0, 1], {...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1)});
  const out = interpolate(t, [dur - 0.35, dur], [1, 0], clamp);
  const lights = (it.lights ?? [0.4, 0.8, 1.2]).map((x) => x - it.at);
  const shine = (t * 0.6) % 1;
  return (
    <AbsoluteFill style={{opacity: out}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: "absolute", inset: 0}}>
        <defs>
          <linearGradient id="tri-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8A9099" />
            <stop offset={Math.max(0, shine - 0.15)} stopColor="#C9CED5" />
            <stop offset={shine} stopColor="#FFFFFF" />
            <stop offset={Math.min(1, shine + 0.15)} stopColor="#AEB4BC" />
            <stop offset="1" stopColor="#7D838C" />
          </linearGradient>
          <filter id="tri-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* объём: тёмная тень под контуром и сам металлический контур */}
        <polygon points={pts.map((p) => `${p[0] + 10},${p[1] + 12}`).join(" ")} fill="none" stroke="rgba(10,14,24,0.45)" strokeWidth={34} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        <polygon points={pts.map((p) => p.join(",")).join(" ")} fill="rgba(255,255,255,0.06)" stroke="url(#tri-metal)" strokeWidth={30} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        {pts.map((p, i) => {
          const on = interpolate(t, [lights[i], lights[i] + 0.3], [0, 1], clamp);
          const pulse = on > 0 ? 0.5 + 0.5 * Math.sin((t - lights[i]) * 5) : 0;
          return (
            <g key={i} filter="url(#tri-glow)" opacity={on}>
              <circle cx={p[0]} cy={p[1]} r={34 + 10 * pulse} fill={B.accent} opacity={0.35} />
              <circle cx={p[0]} cy={p[1]} r={22} fill="#FFFFFF" stroke="#7DD3FC" strokeWidth={6} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const Triangles: React.FC<{items?: TriangleItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`tri-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} layout="none" name="Треугольник">
          <TriangleOne it={it} />
        </Sequence>
      ))}
    </>
  );
};
export const triangleActive = (items: TriangleItem[] | undefined, t: number) => (items ?? []).some((x) => t >= x.at - 0.05 && t <= x.until + 0.05);
export const triangleSounds = (items?: TriangleItem[]) => (items ?? []).flatMap((it) => it.lights ?? []);
