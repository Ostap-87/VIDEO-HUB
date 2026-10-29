// «Экран в кадре» (референс dfcdojr 23.10.2026, пользователь: «Забери все эффекты, которые есть в ролике»): графика
// встаёт в настоящий экран в кадре — ноутбук, телефон, телевизор — по четырём углам (quad, точки кадра 1080×1920:
// слева сверху, справа сверху, справа снизу, слева снизу), в перспективе (matrix3d). Слой идёт вместе с наездами кадра;
// plane «behind» — между видео и вырезкой спикера, поэтому руки проходят поверх экрана.
// Что на экране (kind): text — крупный текст в две краски; chart — кривая рисуется, подписи точек появляются по очереди
// (curve: arc «арка истории», drop — спад, wave — пики, rise — рост); cards — карточки роликов; list — плашки списком;
// steps — шаги со стрелками; icon — картинка со свечением и подпись; media — своё фото или видео.
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {useBrand} from "../brand";

export type Quad = [number, number][]; // 4 точки: TL, TR, BR, BL
export type InScreenItem = {
  at: number;
  until: number;
  quad?: Quad;
  kind: "text" | "chart" | "cards" | "list" | "steps" | "icon" | "media";
  curve?: "arc" | "drop" | "wave" | "rise";
  text?: string; // text: строки через /; icon: подпись
  sub?: string;
  items?: string[]; // chart: подписи точек; list и steps: пункты («ВЫБРАЛ|структуру»)
  src?: string; // icon, media
  images?: string[]; // cards
  plane?: "behind" | "front";
  // light — светлый экран: белый фон, тёмный текст, синие рамки (решение пользователя 29.10.2026: «на светлом экране стрелкой»)
  tone?: "dark" | "light";
};
// ноутбук перед спикером, как в референсе
export const DEFAULT_QUAD: Quad = [
  [170, 1150],
  [910, 1150],
  [960, 1600],
  [120, 1600],
];
const W = 1000;
const H = 625;
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const url = (s: string) => (/^(https?:|blob:|data:)/.test(s) ? s : staticFile(s));
const isVideo = (s: string) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(s) || /^montazh-local\/.*\/v/.test(s);

// ------------------------------------------------------------------ перспектива: прямоугольник W×H → четыре точки
type M9 = number[];
const adj = (m: M9): M9 => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];
const mul = (a: M9, b: M9): M9 => {
  const c: M9 = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j];
  return c;
};
const mulv = (m: M9, v: number[]) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const basis = (p: number[]) => {
  const m = [p[0], p[2], p[4], p[1], p[3], p[5], 1, 1, 1];
  const v = mulv(adj(m), [p[6], p[7], 1]);
  return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
};
export function quadMatrix(q: Quad, w = W, h = H) {
  // порядок точек для расчёта: TL, TR, BL, BR
  const t = mul(basis([q[0][0], q[0][1], q[1][0], q[1][1], q[3][0], q[3][1], q[2][0], q[2][1]]), adj(basis([0, 0, w, 0, 0, h, w, h])));
  const n = t.map((x) => x / t[8]);
  return `matrix3d(${n[0]},${n[3]},0,${n[6]},${n[1]},${n[4]},0,${n[7]},0,0,1,0,${n[2]},${n[5]},0,${n[8]})`;
}

// ------------------------------------------------------------------ содержимое экрана
let BLUE = "#5B9DFF";
let LIME = "#C8F560";
let LABEL = "#CFE3FF";
const TONES = {
  dark: {blue: "#5B9DFF", lime: "#C8F560", label: "#CFE3FF", ink: "#FFFFFF", fill: "rgba(30,70,170,0.3)", sub: "#8FB4F0", bg: "radial-gradient(ellipse at 50% 40%, #0E1A3A 0%, #05070D 70%)"},
  light: {blue: "#1A73E8", lime: "#0F9D58", label: "#14315E", ink: "#0E1A33", fill: "rgba(26,115,232,0.08)", sub: "#3C5A8A", bg: "linear-gradient(160deg, #FFFFFF 0%, #EEF4FF 100%)"},
} as const;
const CURVE = {arc: "#FF4F7A", drop: "#C062FF", wave: "#7FC8FF", rise: "#5BE38A"} as const;
const DEF_LABELS = {arc: ["Завязка", "Развитие", "Кульминация", "Спад", "Развязка"], drop: ["1318", "427", "132", "100"], wave: ["20", "90", "100"], rise: ["Старт", "Рост", "Результат"]} as const;

const curveY = (curve: keyof typeof CURVE, x: number) => {
  if (curve === "arc") return Math.exp(-Math.pow((x - 0.55) / 0.2, 2));
  if (curve === "drop") return 0.06 + 0.94 * Math.exp(-x * 4.2);
  if (curve === "rise") return 0.04 + 0.96 * Math.pow(x, 2.2);
  return 0.5 + 0.42 * Math.sin(2 * Math.PI * 4 * x - Math.PI / 2) * Math.min(1, 0.4 + x);
};
const PX = (x: number) => 80 + x * 860;
const PY = (y: number) => 540 - y * 440;

const Pill: React.FC<{text: string; style?: React.CSSProperties; font: string}> = ({text, style, font}) => (
  <div
    style={{
      position: "absolute",
      padding: "6px 16px 7px",
      border: `2.5px solid ${BLUE}`,
      borderRadius: 10,
      background: "rgba(30,70,170,0.28)",
      color: LABEL,
      fontFamily: font,
      fontWeight: 800,
      fontSize: 28,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {text}
  </div>
);

const Content: React.FC<{it: InScreenItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const sp = (delay: number, cfg = {damping: 15, stiffness: 170}) => spring({frame: frame - Math.round(delay * fps), fps, config: cfg});
  const body = B.bodyFont;
  const head = B.captionFont;
  const T = TONES[it.tone ?? "dark"];
  BLUE = T.blue;
  LIME = T.lime;
  LABEL = T.label;
  if (it.kind === "media" && it.src) {
    return isVideo(it.src) ? <OffthreadVideo src={url(it.src)} muted style={{width: W, height: H, objectFit: "cover"}} /> : <Img src={url(it.src)} style={{width: W, height: H, objectFit: "cover"}} />;
  }
  if (it.kind === "text") {
    const lines = (it.text || "Не та / арка").split(/\s*\/\s*/).filter(Boolean);
    const longest = Math.max(...lines.map((l) => l.length), 3);
    const size = Math.min(170, 880 / (longest * 0.66));
    return (
      <AbsoluteFill style={{alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6}}>
        {lines.map((l, i) => {
          const k = sp(0.15 + i * 0.25);
          return (
            <div key={i} style={{fontFamily: head, fontWeight: 800, fontSize: size, lineHeight: 0.98, textTransform: "uppercase", color: i % 2 ? LIME : "#7FB2FF", textShadow: `0 0 30px ${i % 2 ? "rgba(200,245,96,0.45)" : "rgba(91,157,255,0.5)"}`, scale: String(0.6 + 0.4 * k), opacity: Math.min(1, k * 1.5)}}>
              {l}
            </div>
          );
        })}
        {it.sub ? <div style={{marginTop: 10, fontFamily: body, fontWeight: 700, fontSize: 34, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7E9CD0", opacity: sp(0.3 + lines.length * 0.25)}}>{it.sub}</div> : null}
      </AbsoluteFill>
    );
  }
  if (it.kind === "chart") {
    const curve = it.curve ?? "arc";
    const labels = it.items?.length ? it.items : [...DEF_LABELS[curve]];
    const draw = interpolate(t, [0.1, Math.max(1.1, dur * 0.35)], [0, 1], {...clamp, easing: Easing.bezier(0.4, 0, 0.2, 1)});
    const pts = Array.from({length: 121}, (_, i) => i / 120);
    const d = pts.map((x, i) => `${i ? "L" : "M"}${PX(x).toFixed(1)},${PY(curveY(curve, x)).toFixed(1)}`).join(" ");
    // где стоят подписи: у арки — на ключевых точках сюжета, у волны — на вершинах, иначе — равномерно
    const xs = labels.map((_, i) =>
      curve === "arc" ? [0.08, 0.36, 0.55, 0.74, 0.95][i] ?? 0.08 + (0.87 * i) / Math.max(1, labels.length - 1) : curve === "wave" ? 0.125 + 0.25 * i : 0.04 + (0.9 * i) / Math.max(1, labels.length - 1),
    );
    const color = CURVE[curve];
    return (
      <AbsoluteFill>
        <svg width={W} height={H} style={{position: "absolute", inset: 0}}>
          <line x1={80} y1={60} x2={80} y2={545} stroke="#3A5BA8" strokeWidth={3} />
          <line x1={75} y1={540} x2={950} y2={540} stroke="#3A5BA8" strokeWidth={3} />
          <path d={d} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{filter: `drop-shadow(0 0 10px ${color})`}} />
        </svg>
        {labels.map((lab, i) => {
          const at = Math.min(dur - 0.5, 0.35 * dur + ((0.55 * dur) * i) / Math.max(1, labels.length));
          const k = sp(at);
          const x = Math.min(0.97, Math.max(0, xs[i] ?? 0.5));
          const y = curveY(curve, x);
          const above = y < 0.75;
          return (
            <React.Fragment key={i}>
              <div style={{position: "absolute", left: PX(x) - 9, top: PY(y) - 9, width: 18, height: 18, borderRadius: "50%", background: "#E8F1FF", boxShadow: `0 0 14px ${color}`, scale: String(k)}} />
              <Pill
                text={lab}
                font={body}
                style={{left: Math.min(W - 40, Math.max(10, PX(x) - 90)), top: above ? PY(y) - 64 : PY(y) + 20, opacity: Math.min(1, k * 1.6), translate: `0px ${(1 - k) * 14}px`}}
              />
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
    );
  }
  if (it.kind === "cards") {
    const ims = (it.images ?? []).slice(0, 4);
    const n = Math.max(1, ims.length);
    const cw = 190;
    const gap = 26;
    const x0 = (W - (n * cw + (n - 1) * gap)) / 2;
    return (
      <AbsoluteFill>
        {ims.map((src, i) => {
          const k = sp(0.15 + i * 0.28);
          return (
            <div key={i} style={{position: "absolute", left: x0 + i * (cw + gap), top: 110, width: cw, height: 340, borderRadius: 20, overflow: "hidden", border: "3px solid rgba(255,255,255,0.85)", boxShadow: "0 16px 40px rgba(0,0,0,0.5)", translate: `0px ${(1 - k) * 420}px`, rotate: `${(1 - k) * (i % 2 ? 10 : -10)}deg`}}>
              {isVideo(src) ? <OffthreadVideo src={url(src)} muted style={{width: "100%", height: "100%", objectFit: "cover"}} /> : <Img src={url(src)} style={{width: "100%", height: "100%", objectFit: "cover"}} />}
            </div>
          );
        })}
        {it.text ? <div style={{position: "absolute", left: 0, right: 0, top: 490, textAlign: "center", fontFamily: head, fontWeight: 800, fontSize: 46, color: LIME, textTransform: "uppercase", opacity: sp(0.3 + n * 0.28)}}>{it.text}</div> : null}
      </AbsoluteFill>
    );
  }
  if (it.kind === "list") {
    const items = (it.items?.length ? it.items : ["Контраст", "Спорное заявление", "Цифра — глаза на лоб"]).slice(0, 5);
    const h = Math.min(86, 470 / items.length);
    return (
      <AbsoluteFill style={{justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 18}}>
        {items.map((x, i) => {
          const at = 0.2 + ((dur * 0.6) * i) / Math.max(1, items.length);
          const k = sp(at);
          return (
            <div key={i} style={{width: 700, height: h, display: "flex", alignItems: "center", paddingLeft: 26, border: `3px solid ${BLUE}`, borderRadius: 12, background: "rgba(30,70,170,0.28)", color: LABEL, fontFamily: body, fontWeight: 800, fontSize: Math.min(40, h * 0.5), textTransform: "uppercase", letterSpacing: "0.03em", opacity: Math.min(1, k * 1.5), translate: `${(1 - k) * -80}px 0px`}}>
              {x}
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  if (it.kind === "steps") {
    const items = (it.items?.length ? it.items : ["Выбрал|структуру", "Заполнил|шаги", "Текст|для съёмки"]).slice(0, 4);
    const n = items.length;
    const bw = Math.min(n <= 3 ? 280 : 260, (W - 120 - (n - 1) * 50) / n);
    const top = it.text ? 250 : 220; // text — заголовок над шагами
    const x0 = (W - (n * bw + (n - 1) * 50)) / 2;
    return (
      <AbsoluteFill>
        {it.text ? <div style={{position: "absolute", left: 0, right: 0, top: 96, textAlign: "center", fontFamily: head, fontWeight: 800, fontSize: 64, color: T.ink, textTransform: "uppercase", opacity: sp(0.05)}}>{it.text}</div> : null}
        {items.map((s, i) => {
          const [title, sub] = s.split("|");
          const at = 0.2 + ((dur * 0.6) * i) / Math.max(1, n);
          const k = sp(at);
          const last = i === n - 1;
          return (
            <React.Fragment key={i}>
              <div style={{position: "absolute", left: x0 + i * (bw + 50), top, width: bw, height: 210, border: `3px solid ${last ? LIME : BLUE}`, borderRadius: 14, background: last ? (it.tone === "light" ? "rgba(15,157,88,0.08)" : "rgba(200,245,96,0.12)") : T.fill, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, opacity: Math.min(1, k * 1.5), scale: String(0.7 + 0.3 * k)}}>
                <div style={{fontFamily: head, fontWeight: 800, fontSize: Math.min(46, bw / 6, (bw - 28) / (Math.max(4, title.length) * 0.95)), color: T.ink, textTransform: "uppercase", textAlign: "center"}}>{title}</div>
                {sub ? <div style={{fontFamily: body, fontWeight: 700, fontSize: 27, color: last ? LIME : T.sub, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center"}}>{sub}</div> : null}
              </div>
              {i < n - 1 ? <div style={{position: "absolute", left: x0 + i * (bw + 50) + bw + 6, top: top + 72, fontSize: 46, color: BLUE, fontFamily: body, fontWeight: 800, opacity: sp(at + 0.2)}}>→</div> : null}
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
    );
  }
  // icon: картинка со свечением и подпись («+ ДОФАМИН»)
  const k = sp(0.1, {damping: 11, stiffness: 140});
  const pulse = 1 + 0.04 * Math.sin(t * 5);
  return (
    <AbsoluteFill style={{alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24}}>
      {it.src ? (
        <div style={{width: 300, height: 300, scale: String(k * pulse), filter: "drop-shadow(0 0 40px rgba(176,92,255,0.9))"}}>
          <Img src={url(it.src)} style={{width: "100%", height: "100%", objectFit: "contain"}} />
        </div>
      ) : null}
      {it.text ? <div style={{fontFamily: head, fontWeight: 800, fontSize: 64, color: "#C47BFF", textTransform: "uppercase", textShadow: "0 0 28px rgba(176,92,255,0.8)", opacity: sp(0.35)}}>{it.text}</div> : null}
    </AbsoluteFill>
  );
};

const InScreenOne: React.FC<{it: InScreenItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const dur = it.until - it.at;
  // экран «включается»: проявляется с лёгкой вспышкой, в конце гаснет
  const on = Math.min(interpolate(t, [0, 0.25], [0, 1], {...clamp, easing: ease}), interpolate(t, [dur - 0.25, dur], [1, 0], clamp));
  const flash = interpolate(t, [0, 0.12, 0.35], [0, 0.35, 0], clamp);
  const q = it.quad && it.quad.length === 4 ? it.quad : DEFAULT_QUAD;
  return (
    <div style={{position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: quadMatrix(q), opacity: on, overflow: "hidden", background: it.kind === "media" ? "#000" : TONES[it.tone ?? "dark"].bg}}>
      <Content it={it} />
      {/* блик стекла и вспышка включения */}
      <AbsoluteFill style={{background: "linear-gradient(125deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 38%)"}} />
      <AbsoluteFill style={{background: `rgba(200,220,255,${flash})`}} />
    </div>
  );
};

export const InScreens: React.FC<{items?: InScreenItem[]; plane: "behind" | "front"}> = ({items, plane}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? [])
        .filter((it) => (it.plane ?? "behind") === plane)
        .map((it, i) => (
          <Sequence key={`ins-${i}`} from={Math.round(it.at * fps)} durationInFrames={Math.max(1, Math.round((it.until - it.at) * fps))} premountFor={fps} name="Экран в кадре">
            <InScreenOne it={it} />
          </Sequence>
        ))}
    </>
  );
};
export const inScreenActive = (items: InScreenItem[] | undefined, plane: "behind" | "front", t: number) =>
  (items ?? []).some((it) => (it.plane ?? "behind") === plane && t >= it.at - 0.05 && t <= it.until + 0.05);
