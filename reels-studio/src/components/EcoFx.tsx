// Приёмы под пометки ролика Xiaomi (решения пользователя 29.10.2026, Монтажный лист):
// windows — «4 картинки в ритм… отдельным окном над моей головой в плашках»: окно-плашка над головой, картинки сменяют
// друг друга на своих словах (въезд справа, щелчок), под окном — плашка-подпись. Слой поверх кадра. Поле props — `windows`.
// atoms — «логотип Xiaomi, и вокруг него как будто частицы атомов крутятся за моей спиной крупно»: логотип в центре,
// три наклонные орбиты, по ним бегут светящиеся частицы со шлейфом. Слой за спикером (нужна вырезка). Поле — `atoms`.
// dashboards — «много экранов, на которых графики и метрики продаж и как будто личные кабинеты разных маркетплейсов,
// и всё это интерактивно»: стеклянные экраны кабинетов продавца вокруг головы, линии и столбики дорисовываются,
// бегут точки заказов по карте. Без чисел и чужих логотипов — только подписи. За спикером. Поле — `dashboards`.
// ecos — «графиками экосистему… интерактивно»: центр-кольцо (например «360°») над головой, узлы-плашки появляются на
// своих словах, линии к ним рисуются, по линиям бегут импульсы. За спикером. Поле — `ecos`.
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {useBrand} from "../brand";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const src = (s: string) => (s.startsWith("http") ? s : staticFile(s));

// ——— windows: окно над головой ———
export type WindowItem = {at: number; until: number; x?: number; y?: number; w?: number; h?: number; items: {src: string; at: number; label?: string}[]};

const WindowOne: React.FC<{it: WindowItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const w = it.w ?? 520;
  const h = it.h ?? 400;
  const x = (it.x ?? 540) - w / 2;
  const y = it.y ?? 230;
  const rel = it.items.map((s) => s.at - it.at);
  const cur = Math.max(0, rel.filter((r) => t >= r - 0.02).length - 1);
  const inK = spring({frame, fps, config: {damping: 14, stiffness: 160}});
  const out = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: 36,
          overflow: "hidden",
          background: "#EEF1F6",
          border: "8px solid #FFFFFF",
          boxShadow: `0 24px 60px rgba(0,0,0,0.45), 0 0 0 3px ${B.accent}`,
          scale: String(0.6 + 0.4 * inK),
          translate: `0px ${(1 - inK) * -60}px`,
        }}
      >
        {it.items.map((s, i) => {
          if (i < cur - 1 || i > cur) return null;
          const k = interpolate(t, [rel[i] - 0.02, rel[i] + 0.22], [0, 1], {...clamp, easing: ease});
          const leave = i < cur ? interpolate(t, [rel[cur] - 0.02, rel[cur] + 0.22], [0, 1], {...clamp, easing: ease}) : 0;
          const tx = i === 0 && cur === 0 ? 0 : (1 - k) * w - leave * w * 0.6;
          return (
            <Img
              key={i}
              src={src(s.src)}
              style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", translate: `${tx}px 0px`, scale: String(1.04 + 0.04 * (t - rel[i]))}}
            />
          );
        })}
      </div>
      {/* подпись-плашка под окном */}
      {it.items[cur]?.label ? (
        <div style={{position: "absolute", left: 0, right: 0, top: y + h - 34, display: "flex", justifyContent: "center"}}>
          <div
            key={cur}
            style={{
              padding: "12px 34px",
              borderRadius: 999,
              background: B.accent,
              color: "#FFFFFF",
              fontFamily: B.captionFont,
              fontWeight: 800,
              fontSize: 44,
              textTransform: "uppercase",
              boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
              scale: String(0.8 + 0.2 * spring({frame: frame - Math.round(rel[cur] * fps), fps, config: {damping: 11, stiffness: 200}})),
            }}
          >
            {it.items[cur].label}
          </div>
        </div>
      ) : null}
      {/* точки ритма */}
      <div style={{position: "absolute", left: 0, right: 0, top: y - 44, display: "flex", justifyContent: "center", gap: 14}}>
        {it.items.map((_, i) => (
          <div key={i} style={{width: i === cur ? 40 : 14, height: 14, borderRadius: 7, background: i <= cur ? "#FFFFFF" : "rgba(255,255,255,0.35)", boxShadow: "0 2px 8px rgba(0,0,0,0.4)"}} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Windows: React.FC<{items?: WindowItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`win-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} layout="none" name="Окно над головой">
          <WindowOne it={it} />
        </Sequence>
      ))}
    </>
  );
};
export const windowSounds = (items?: WindowItem[]) => (items ?? []).flatMap((it) => it.items.map((x) => x.at));

// ——— atoms: логотип и частицы на орбитах ———
export type AtomItem = {at: number; until: number; src: string; x?: number; y?: number; size?: number};

const AtomOne: React.FC<{it: AtomItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const cx = it.x ?? 540;
  const cy = it.y ?? 440;
  const s = it.size ?? 300;
  const inK = spring({frame, fps, config: {damping: 13, stiffness: 120}});
  const out = interpolate(t, [dur - 0.35, dur], [1, 0], clamp);
  const R = 430;
  const orbits = [0, 60, -60];
  return (
    <AbsoluteFill style={{opacity: out}}>
      {/* мягкое свечение */}
      <div style={{position: "absolute", left: cx - 520, top: cy - 520, width: 1040, height: 1040, borderRadius: 520, background: `radial-gradient(circle, ${B.accent}55 0%, transparent 62%)`, scale: String(inK)}} />
      <svg width={1080} height={1920} style={{position: "absolute", left: 0, top: 0}}>
        <defs>
          <filter id="atom-glow">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {orbits.map((rot, k) => {
          const rx = R * inK;
          const ry = R * 0.3 * inK;
          // три частицы на орбите, у каждой своя фаза; шлейф — несколько точек позади
          const speed = 1.6 + k * 0.35;
          return (
            <g key={k} transform={`translate(${cx} ${cy}) rotate(${rot + t * 8})`}>
              <ellipse rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={4} />
              <ellipse rx={rx} ry={ry} fill="none" stroke={B.accent} strokeWidth={2} strokeDasharray="10 18" strokeDashoffset={-t * 120} />
              {[0, 2.1, 4.2].map((ph, j) =>
                [0, 1, 2, 3, 4].map((tail) => {
                  const a = t * speed * Math.PI + ph + k - tail * 0.09;
                  return (
                    <circle
                      key={`${j}-${tail}`}
                      cx={Math.cos(a) * rx}
                      cy={Math.sin(a) * ry}
                      r={(tail === 0 ? 18 : 14 - tail * 2.4) * inK}
                      fill={tail === 0 ? "#FFFFFF" : B.accent}
                      opacity={tail === 0 ? 1 : 0.7 - tail * 0.13}
                      filter="url(#atom-glow)"
                    />
                  );
                }),
              )}
            </g>
          );
        })}
      </svg>
      {/* логотип-ядро */}
      <Img
        src={src(it.src)}
        style={{
          position: "absolute",
          left: cx - s / 2,
          top: cy - s / 2,
          width: s,
          height: s,
          objectFit: "contain",
          scale: String(0.3 + 0.7 * inK + 0.03 * Math.sin(t * 5)),
          filter: `drop-shadow(0 0 30px ${B.accent}) drop-shadow(0 12px 30px rgba(0,0,0,0.5))`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Atoms: React.FC<{items?: AtomItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`at-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} layout="none" name="Логотип-атом">
          <AtomOne it={it} />
        </Sequence>
      ))}
    </>
  );
};
export const atomActive = (items: AtomItem[] | undefined, t: number) => (items ?? []).some((x) => t >= x.at - 0.05 && t <= x.until + 0.05);

// ——— dashboards: экраны кабинетов продавца ———
export type DashItem = {at: number; until: number; title?: string; screens?: string[]};

const SCREENS = [
  {x: 40, y: 150, w: 430, h: 300, kind: "line", ry: 16},
  {x: 610, y: 150, w: 430, h: 300, kind: "bars", ry: -16},
  {x: 300, y: 40, w: 480, h: 230, kind: "map", ry: 0},
  {x: 20, y: 500, w: 330, h: 360, kind: "orders", ry: 22},
  {x: 730, y: 500, w: 330, h: 360, kind: "ring", ry: -22},
  {x: 360, y: 300, w: 360, h: 210, kind: "area", ry: 0},
] as const;
const LABELS = ["Продажи", "Заказы по странам", "Доставка по миру", "Новые заказы", "Отзывы", "Реклама"];

const Screen: React.FC<{i: number; t: number; label: string}> = ({i, t, label}) => {
  const B = useBrand();
  const sc = SCREENS[i];
  const k = interpolate(t, [i * 0.18, i * 0.18 + 0.45], [0, 1], {...clamp, easing: ease});
  const draw = interpolate(t, [i * 0.18 + 0.2, i * 0.18 + 1.6], [0, 1], {...clamp, easing: ease});
  const W = sc.w - 40;
  const H = sc.h - 90;
  const wave = (n: number, seed: number) => Array.from({length: n}, (_, j) => 0.25 + 0.6 * (j / (n - 1)) + 0.12 * Math.sin(j * 1.7 + seed));
  let body: React.ReactNode = null;
  if (sc.kind === "line" || sc.kind === "area") {
    const v = wave(14, i);
    const pts = v.map((p, j) => [(j / (v.length - 1)) * W, H - p * H] as const);
    const d = pts.map((p, j) => `${j ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const len = W * 1.6;
    body = (
      <svg width={W} height={H}>
        {sc.kind === "area" ? <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={`${B.accent}44`} opacity={draw} /> : null}
        <path d={d} fill="none" stroke="#5EEAD4" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        <circle cx={pts[Math.min(pts.length - 1, Math.floor(draw * (pts.length - 1)))][0]} cy={pts[Math.min(pts.length - 1, Math.floor(draw * (pts.length - 1)))][1]} r={10} fill="#FFFFFF" />
      </svg>
    );
  } else if (sc.kind === "bars") {
    const v = wave(7, i + 3);
    body = (
      <div style={{display: "flex", alignItems: "flex-end", gap: 14, width: W, height: H}}>
        {v.map((p, j) => (
          <div key={j} style={{flex: 1, height: `${100 * p * interpolate(draw, [j * 0.08, j * 0.08 + 0.4], [0, 1], clamp)}%`, borderRadius: 8, background: j === v.length - 1 ? "#5EEAD4" : B.accent}} />
        ))}
      </div>
    );
  } else if (sc.kind === "map") {
    // точки заказов разлетаются от центра по «карте мира» из точек
    const dots = Array.from({length: 9}, (_, j) => ({a: j * 0.7 + 0.3, r: 0.25 + 0.08 * (j % 4)}));
    body = (
      <svg width={W} height={H}>
        {Array.from({length: 60}, (_, j) => (
          <circle key={j} cx={((j * 37) % 100) * W * 0.01} cy={(((j * 53) % 70) / 70) * H} r={3} fill="rgba(255,255,255,0.25)" />
        ))}
        {dots.map((p, j) => {
          const q = ((t * 0.7 + j * 0.13) % 1) * draw;
          const x2 = W / 2 + Math.cos(p.a) * p.r * W * 1.4;
          const y2 = H / 2 + Math.sin(p.a) * p.r * H * 1.2;
          return (
            <g key={j}>
              <line x1={W / 2} y1={H / 2} x2={x2} y2={y2} stroke={`${B.accent}88`} strokeWidth={2} />
              <circle cx={W / 2 + (x2 - W / 2) * q} cy={H / 2 + (y2 - H / 2) * q} r={7} fill="#5EEAD4" />
            </g>
          );
        })}
        <circle cx={W / 2} cy={H / 2} r={12} fill="#FFFFFF" />
      </svg>
    );
  } else if (sc.kind === "orders") {
    body = (
      <div style={{display: "flex", flexDirection: "column", gap: 14}}>
        {[0, 1, 2, 3].map((j) => {
          const on = interpolate(draw, [j * 0.2, j * 0.2 + 0.25], [0, 1], clamp);
          return (
            <div key={j} style={{display: "flex", alignItems: "center", gap: 14, opacity: on, translate: `${(1 - on) * 40}px 0px`}}>
              <div style={{width: 46, height: 46, borderRadius: 12, background: j % 2 ? "#5EEAD4" : B.accent}} />
              <div style={{flex: 1}}>
                <div style={{height: 12, borderRadius: 6, background: "rgba(255,255,255,0.7)", width: `${70 - j * 9}%`}} />
                <div style={{height: 10, borderRadius: 5, marginTop: 8, background: "rgba(255,255,255,0.3)", width: `${45 + j * 7}%`}} />
              </div>
              <div style={{width: 30, height: 30, borderRadius: 15, background: "#22C55E"}} />
            </div>
          );
        })}
      </div>
    );
  } else if (sc.kind === "ring") {
    const r = Math.min(W, H) / 2 - 16;
    const c = 2 * Math.PI * r;
    body = (
      <svg width={W} height={H}>
        <circle cx={W / 2} cy={H / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={26} />
        <circle cx={W / 2} cy={H / 2} r={r} fill="none" stroke="#5EEAD4" strokeWidth={26} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - 0.78 * draw)} transform={`rotate(-90 ${W / 2} ${H / 2})`} />
        {[0, 1, 2, 3, 4].map((j) => (
          <polygon key={j} points="0,-14 4,-4 15,-4 6,3 9,14 0,7 -9,14 -6,3 -15,-4 -4,-4" transform={`translate(${W / 2 - 64 + j * 32} ${H / 2})`} fill={draw > 0.2 + j * 0.15 ? "#FACC15" : "rgba(255,255,255,0.25)"} />
        ))}
      </svg>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: sc.x,
        top: sc.y + 420,
        width: sc.w,
        height: sc.h,
        borderRadius: 26,
        padding: "18px 20px",
        boxSizing: "border-box",
        background: "linear-gradient(160deg, rgba(20,32,60,0.88), rgba(10,18,40,0.82))",
        border: "2px solid rgba(255,255,255,0.35)",
        boxShadow: `0 20px 50px rgba(0,0,0,0.45), inset 0 0 40px ${B.accent}22`,
        opacity: k,
        transform: `perspective(1400px) rotateY(${sc.ry}deg) translateZ(${(1 - k) * -300}px) translateY(${Math.sin(t * 1.6 + i) * 8}px)`,
      }}
    >
      <div style={{display: "flex", alignItems: "center", gap: 10, marginBottom: 14}}>
        {["#F87171", "#FACC15", "#4ADE80"].map((c) => (
          <div key={c} style={{width: 12, height: 12, borderRadius: 6, background: c}} />
        ))}
        <div style={{marginLeft: 8, fontFamily: B.captionFont, fontWeight: 800, fontSize: 26, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap"}}>{label}</div>
      </div>
      {body}
    </div>
  );
};

const DashOne: React.FC<{it: DashItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const out = interpolate(t, [dur - 0.35, dur], [1, 0], clamp);
  const labels = it.screens?.length ? it.screens : LABELS;
  return (
    <AbsoluteFill style={{opacity: out, background: `radial-gradient(ellipse at 50% 40%, rgba(10,20,50,${0.55 * interpolate(t, [0, 0.4], [0, 1], clamp)}) 0%, rgba(5,10,30,0.25) 70%)`}}>
      {SCREENS.map((_, i) => (
        <Screen key={i} i={i} t={t} label={labels[i % labels.length]} />
      ))}
      {it.title ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 270, textAlign: "center", fontFamily: B.monoFont, fontSize: 30, letterSpacing: "0.16em", color: "#FFFFFF", textTransform: "uppercase", textShadow: "0 2px 10px rgba(0,0,0,0.7)", opacity: interpolate(t, [0.2, 0.6], [0, 1], clamp)}}>
          {it.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Dashboards: React.FC<{items?: DashItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`db-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} layout="none" name="Экраны кабинетов">
          <DashOne it={it} />
        </Sequence>
      ))}
    </>
  );
};
export const dashActive = (items: DashItem[] | undefined, t: number) => (items ?? []).some((x) => t >= x.at - 0.05 && t <= x.until + 0.05);

// ——— ecos: схема экосистемы ———
export type EcoItem = {at: number; until: number; center: string; x?: number; y?: number; items: {text: string; at: number}[]};

const ECO_POS = [
  [215, 300],
  [865, 300],
  [205, 700],
  [875, 700],
  [540, 130],
  [540, 1240],
] as const;

const EcoOne: React.FC<{it: EcoItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const cx = it.x ?? 540;
  const cy = it.y ?? 460;
  const inK = spring({frame, fps, config: {damping: 14, stiffness: 130}});
  const out = interpolate(t, [dur - 0.35, dur], [1, 0], clamp);
  const rel = it.items.map((s) => s.at - it.at);
  return (
    <AbsoluteFill style={{opacity: out}}>
      <svg width={1080} height={1920} style={{position: "absolute", left: 0, top: 0}}>
        {it.items.map((s, i) => {
          const [nx, ny] = ECO_POS[i % ECO_POS.length];
          const k = interpolate(t, [rel[i], rel[i] + 0.45], [0, 1], {...clamp, easing: ease});
          const q = ((t - rel[i]) * 0.9) % 1;
          return (
            <g key={i} opacity={k > 0 ? 1 : 0}>
              <line x1={cx} y1={cy} x2={cx + (nx - cx) * k} y2={cy + (ny - cy) * k} stroke="rgba(255,255,255,0.75)" strokeWidth={5} />
              <line x1={cx} y1={cy} x2={cx + (nx - cx) * k} y2={cy + (ny - cy) * k} stroke={B.accent} strokeWidth={5} strokeDasharray="14 16" strokeDashoffset={-t * 90} />
              {k >= 1 ? <circle cx={cx + (nx - cx) * q} cy={cy + (ny - cy) * q} r={11} fill="#FFFFFF" style={{filter: `drop-shadow(0 0 10px ${B.accent})`}} /> : null}
            </g>
          );
        })}
        {/* кольцо 360° вращается */}
        <g transform={`translate(${cx} ${cy}) scale(${inK})`}>
          <circle r={150} fill={`${B.accent}CC`} stroke="#FFFFFF" strokeWidth={8} />
          <circle r={190} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={5} strokeDasharray="30 22" transform={`rotate(${t * 60})`} />
          <circle r={225} fill="none" stroke={`${B.accent}`} strokeWidth={3} strokeDasharray="6 14" transform={`rotate(${-t * 40})`} />
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          left: cx - 150,
          top: cy - 150,
          width: 300,
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: B.numberFont,
          fontWeight: 900,
          fontSize: it.center.length > 4 ? 72 : 110,
          color: "#FFFFFF",
          textShadow: "0 4px 14px rgba(0,0,0,0.4)",
          scale: String(inK),
        }}
      >
        {it.center}
      </div>
      {it.items.map((s, i) => {
        const [nx, ny] = ECO_POS[i % ECO_POS.length];
        const pop = spring({frame: frame - Math.round((rel[i] + 0.3) * fps), fps, config: {damping: 11, stiffness: 190}});
        if (t < rel[i] + 0.25) return null;
        return (
          <div key={i} style={{position: "absolute", left: nx - 170, top: ny - 60, width: 340, height: 120, display: "flex", alignItems: "center", justifyContent: "center", scale: String(pop)}}>
            <div
              style={{
                padding: "16px 26px",
                borderRadius: 26,
                background: "#FFFFFF",
                color: "#0B1B3F",
                border: `5px solid ${B.accent}`,
                fontFamily: B.captionFont,
                fontWeight: 800,
                fontSize: s.text.length > 14 ? 32 : 38,
                lineHeight: 1.05,
                textAlign: "center",
                textTransform: "uppercase",
                boxShadow: `0 12px 30px rgba(0,0,0,0.4), 0 0 24px ${B.accent}88`,
              }}
            >
              {s.text}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Ecos: React.FC<{items?: EcoItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`eco-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} layout="none" name="Экосистема">
          <EcoOne it={it} />
        </Sequence>
      ))}
    </>
  );
};
export const ecoActive = (items: EcoItem[] | undefined, t: number) => (items ?? []).some((x) => t >= x.at - 0.05 && t <= x.until + 0.05);
export const ecoSounds = (items?: EcoItem[]) => (items ?? []).flatMap((it) => it.items.map((x) => x.at + 0.3));
