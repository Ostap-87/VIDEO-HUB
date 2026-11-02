// Приёмы ролика о приложении v4 (решение пользователя 02.11.2026: «нет никаких зумов и хуков во время демонстрации
// телефона… интересные плашки и график, как мы делали для видео по программам обучения… увеличения, чтобы показать
// вблизи, как выглядит маршрут… хуки в процессе демонстрации фичей для бухгалтерии и майндмэпа»):
//  - zoomAt / ZoomLabel — «камера» наезжает в часть экрана телефона (box — доли экрана) или в точку кадра (pt),
//    может проехать к другой части (to); сверху — подпись того, что показываем крупно;
//  - Widgets — стеклянные плашки: trio (три цифры), ring (кольцо «15 из 18»), bars (столбики расходов, валюта меняется
//    вместе с отчётом);
//  - Hooks — slam (кадр синеет, огромные строки «врезаются» по словам, вокруг летят картинки) и stamp (штамп поверх);
//  - Countries — 76 программ по 9 странам (данные сайта, SINOTECH tours.json), столбики с флагами.
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {body, display, mono} from "../../fonts";
import {theme} from "../../theme";

const C = theme.colors;
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const parts = (s: string) => s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((x) => ({t: x.replace(/\*\*/g, ""), acc: x.startsWith("**")}));

export type Zoom = {at: number; until: number; box?: number[]; to?: number[]; pt?: number[]; scale?: number; label?: string; labelY?: number};
export type Widget = {kind: "trio" | "ring" | "bars"; at: number; until: number; keep?: boolean; items?: (string | number)[][]; value?: number; total?: number;
  label?: string; sub?: string; title?: string; x?: number; y?: number; w?: number};
export type Hook = {kind: "slam" | "stamp"; at: number; until: number; lines: string[]; lineAt?: number[]; images?: string[]; sub?: string; subAt?: number};

const ZIN = 0.38, ZOUT = 0.42, CHAIN = 0.9;
// наезд в момент t: a — текущий наезд, k — сила 0…1, pan — проезд к `to`; prev + mix — переезд камеры от предыдущего
// наезда, если между ними меньше CHAIN секунд (камера не отъезжает, а сразу едет к следующему месту)
export const zoomAt = (zooms: Zoom[], t: number): {a: Zoom; k: number; pan: number; prev?: Zoom; mix: number} | null => {
  const zs = [...zooms].sort((x, y) => x.at - y.at);
  let i = -1;
  zs.forEach((z, j) => { if (z.at - 0.05 <= t) i = j; });
  if (i < 0) return null;
  const A = zs[i], P = zs[i - 1], N = zs[i + 1];
  if (t > A.until) {
    if (N && N.at - A.until < CHAIN) return {a: A, k: 1, pan: 1, mix: 1};
    const k = 1 - interpolate(t, [A.until, A.until + ZOUT], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
    return k > 0 ? {a: A, k, pan: 1, mix: 1} : null;
  }
  const pan = interpolate(t, [A.at + ZIN, Math.max(A.at + ZIN + 0.1, A.until)], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const ramp = interpolate(t, [A.at - 0.05, A.at + ZIN], [0, 1], {...clamp, easing: Easing.bezier(0.3, 0, 0.1, 1)});
  if (P && A.at - P.until < CHAIN) return {a: A, prev: P, mix: ramp, k: 1, pan};
  return {a: A, k: ramp, pan, mix: 1};
};

// подпись того, что показываем крупно
export const ZoomLabel: React.FC<{text: string; k: number; at: number; t: number; W: number; y: number}> = ({text, k, at, t, W, y}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: Math.round((t - at) * fps), fps, config: {damping: 14, stiffness: 170, mass: 0.7}});
  const size = text.length > 26 ? 40 : text.length > 18 ? 46 : 52;
  return (
    <div style={{position: "absolute", left: 0, width: W, top: y, display: "flex", justifyContent: "center", opacity: Math.min(1, k * 1.6), translate: `0 ${(1 - s) * -40}px`, pointerEvents: "none"}}>
      <div style={{display: "flex", alignItems: "center", gap: 18, padding: "18px 34px 18px 22px", borderRadius: 28, background: "rgba(255,255,255,0.93)", backdropFilter: "blur(14px)",
        boxShadow: "0 22px 50px rgba(20,30,60,0.22)", border: "2px solid rgba(37,99,235,0.18)", maxWidth: W - 100, scale: String(0.85 + 0.15 * s)}}>
        <div style={{width: 54, height: 54, borderRadius: 16, background: `linear-gradient(145deg, #4F8BFF, ${C.accent} 60%, #1D3FB8)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          boxShadow: "0 8px 18px rgba(37,99,235,0.4)"}}>
          <svg width={30} height={30} viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="white" strokeWidth={2.6} /><path d="M15 15l5 5" stroke="white" strokeWidth={2.8} strokeLinecap="round" /></svg>
        </div>
        <span style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: size, lineHeight: 1.08, color: C.text, letterSpacing: "-0.01em"}}>{text}</span>
      </div>
    </div>
  );
};

// ---------- плашки-виджеты ----------
const Glass: React.FC<{style: React.CSSProperties; children: React.ReactNode}> = ({style, children}) => (
  <div style={{position: "absolute", borderRadius: 34, background: "linear-gradient(160deg, rgba(255,255,255,0.97), rgba(238,244,255,0.94))", border: "2px solid rgba(37,99,235,0.16)",
    boxShadow: "0 30px 70px rgba(20,30,60,0.22), inset 0 2px 0 rgba(255,255,255,0.9)", boxSizing: "border-box", ...style}}>{children}</div>
);

const FX = {"₽": 1, "$": 1 / 86.5, "€": 1 / 94.4, "₸": 5.68} as const;
const fmt = (v: number) => Math.round(v).toLocaleString("ru-RU").replace(/,/g, " ");

export const Widgets: React.FC<{items: Widget[]; t: number; W: number; cur?: string; zk?: number}> = ({items, t, W, cur = "₽", zk = 0}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {items.map((w, i) => {
        if (t < w.at - 0.05 || t > w.until + 0.45) return null;
        const f = Math.round((t - w.at) * fps);
        const s = spring({frame: f, fps, config: {damping: 13, stiffness: 160, mass: 0.8}});
        const out = interpolate(t, [w.until, w.until + 0.4], [1, 0], clamp) * (w.keep ? 1 : 1 - zk);
        if (w.kind === "trio") {
          const its = w.items || [];
          const tw = 300, gap = 22, x0 = (W - (tw * its.length + gap * (its.length - 1))) / 2;
          return (
            <React.Fragment key={i}>
              {its.map((it, j) => {
                const sj = spring({frame: f - j * 4, fps, config: {damping: 11, stiffness: 170, mass: 0.7}});
                const num = Number(it[0]);
                const shown = Number.isFinite(num) ? Math.round(num * interpolate(f - j * 4, [0, 16], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)})) : it[0];
                return (
                  <Glass key={j} style={{left: x0 + j * (tw + gap), top: w.y ?? 300, width: tw, height: 176, opacity: Math.min(1, sj * 1.4) * out, translate: `0 ${(1 - sj) * 60}px`, scale: String(0.7 + 0.3 * sj),
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
                    <div style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 92, lineHeight: 1, color: C.accent}}>{shown}</div>
                    <div style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: 34, color: C.text, marginTop: 8}}>{String(it[1])}</div>
                  </Glass>
                );
              })}
            </React.Fragment>
          );
        }
        if (w.kind === "ring") {
          const total = w.total || 1, value = w.value || 0;
          const p = interpolate(f, [4, 4 + Math.round(1.0 * fps)], [0, value / total], {...clamp, easing: Easing.out(Easing.cubic)});
          const R = 92, L2 = 2 * Math.PI * R;
          return (
            <Glass key={i} style={{left: w.x ?? 64, top: w.y ?? 600, width: 330, height: 380, opacity: Math.min(1, s * 1.4) * out, scale: String(0.7 + 0.3 * s), translate: `${(1 - s) * -60}px 0`,
              display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 34}}>
              <svg width={230} height={230} viewBox="0 0 230 230" style={{rotate: "-90deg"}}>
                <circle cx={115} cy={115} r={R} fill="none" stroke="rgba(37,99,235,0.12)" strokeWidth={22} />
                <circle cx={115} cy={115} r={R} fill="none" stroke="url(#v4ring)" strokeWidth={22} strokeLinecap="round" strokeDasharray={`${L2 * p} ${L2}`} />
                <defs><linearGradient id="v4ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#38BDF8" /><stop offset="100%" stopColor={C.accent} /></linearGradient></defs>
              </svg>
              <div style={{position: "absolute", top: 34, width: 230, height: 230, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display.fontFamily, fontWeight: 700, fontSize: 62, color: C.text}}>
                {Math.round(p * total)}<span style={{fontSize: 34, color: C.muted}}>/{total}</span>
              </div>
              <div style={{fontFamily: body.fontFamily, fontWeight: 700, fontSize: 34, color: C.text, marginTop: 10}}>{w.label}</div>
              {w.sub ? <div style={{fontFamily: body.fontFamily, fontSize: 26, color: C.muted, marginTop: 2}}>{w.sub}</div> : null}
            </Glass>
          );
        }
        // bars — столбики по категориям, суммы — в текущей валюте отчёта
        const its = (w.items || []) as [string, number][];
        const max = Math.max(...its.map((x) => x[1]));
        const rate = FX[cur as keyof typeof FX] ?? 1;
        const width = w.w ?? 650;
        return (
          <Glass key={i} style={{left: w.x ?? 64, top: w.y ?? 1180, width, padding: "24px 30px 26px", opacity: Math.min(1, s * 1.4) * out, translate: `0 ${(1 - s) * 50}px`}}>
            <div style={{fontFamily: mono.fontFamily, fontSize: 22, letterSpacing: "0.12em", color: C.accent, textTransform: "uppercase"}}>{w.title}</div>
            {its.map(([lab, v], j) => {
              const g = interpolate(f - 4 - j * 5, [0, 18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
              const top = j === its.indexOf(its.reduce((a, b) => (b[1] > a[1] ? b : a)));
              return (
                <div key={j} style={{display: "flex", alignItems: "center", gap: 16, marginTop: 16}}>
                  <div style={{width: 110, fontFamily: body.fontFamily, fontWeight: 700, fontSize: 28, color: C.text}}>{lab}</div>
                  <div style={{flex: 1, height: 34, borderRadius: 12, background: "rgba(37,99,235,0.08)", overflow: "hidden"}}>
                    <div style={{width: `${(v / max) * 100 * g}%`, height: "100%", borderRadius: 12, background: top ? `linear-gradient(90deg, #38BDF8, ${C.accent})` : "linear-gradient(90deg, #9CC3FF, #6EA2FF)",
                      boxShadow: top ? "0 6px 16px rgba(37,99,235,0.35)" : undefined}} />
                  </div>
                  <div style={{width: 150, textAlign: "right", fontFamily: display.fontFamily, fontWeight: 700, fontSize: 28, color: top ? C.accent : C.text}}>
                    {cur === "$" || cur === "€" ? `${cur}${fmt(v * rate * g)}` : `${fmt(v * rate * g)} ${cur}`}
                  </div>
                </div>
              );
            })}
          </Glass>
        );
      })}
    </>
  );
};

// ---------- хуки ----------
export const Hooks: React.FC<{items: Hook[]; t: number; W: number; H: number; imgDir: string}> = ({items, t, W, H, imgDir}) => {
  const {fps} = useVideoConfig();
  const h = items.find((x) => t >= x.at - 0.05 && t <= x.until + 0.3);
  if (!h) return null;
  const f = Math.round((t - h.at) * fps);
  const inK = interpolate(t, [h.at - 0.05, h.at + 0.12], [0, 1], clamp);
  const out = interpolate(t, [h.until - 0.05, h.until + 0.25], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  if (h.kind === "stamp") {
    const s = spring({frame: f, fps, config: {damping: 10, stiffness: 210, mass: 0.8}});
    return (
      <AbsoluteFill style={{pointerEvents: "none"}}>
        <AbsoluteFill style={{background: "radial-gradient(circle at 50% 46%, rgba(10,20,60,0.25), rgba(10,20,60,0.55))", opacity: inK * (1 - out)}} />
        <div style={{position: "absolute", left: "50%", top: H * 0.44, translate: "-50% -50%", rotate: `${-7 + (1 - s) * 16}deg`, scale: String((2.3 - 1.3 * s) * (1 + 0.15 * out)),
          opacity: Math.min(1, s * 1.6) * (1 - out), border: `9px solid ${C.accent}`, borderRadius: 30, padding: "26px 48px", background: "rgba(255,255,255,0.95)",
          boxShadow: "0 30px 80px rgba(10,20,60,0.4)", textAlign: "center", whiteSpace: "nowrap"}}>
          {h.lines.map((ln, j) => (
            <div key={j} style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: Math.min(j === 0 ? 84 : 92, 800 / (Math.max(...h.lines.map((x) => x.length)) * 0.8)), lineHeight: 1.06,
              color: j === 0 ? C.text : C.accent, textTransform: "uppercase"}}>{ln}</div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }
  // slam
  const lineAt = h.lineAt || h.lines.map((_, j) => h.at + j * 0.45);
  let shakeK = 0;
  lineAt.forEach((a) => { const d = t - a; if (d >= 0 && d < 0.25) shakeK = Math.max(shakeK, 1 - d / 0.25); });
  const sx = Math.sin(f * 2.7) * 14 * shakeK, sy = Math.cos(f * 3.3) * 10 * shakeK;
  const imgs = h.images || [];
  return (
    <AbsoluteFill style={{pointerEvents: "none", opacity: 1 - out, scale: String(1 + 0.12 * out)}}>
      <AbsoluteFill style={{background: "radial-gradient(circle at 50% 42%, #2f5fe0 0%, #1e3a8a 45%, #0b1d55 100%)", opacity: inK}} />
      <AbsoluteFill style={{backgroundImage: "radial-gradient(rgba(125,211,252,0.18) 2px, transparent 2.4px)", backgroundSize: "40px 40px", opacity: inK * 0.8}} />
      {imgs.map((src, j) => {
        const a0 = h.at + 0.05 + j * 0.12;
        const k = spring({frame: Math.round((t - a0) * fps), fps, config: {damping: 13, stiffness: 120}});
        const P = [[W * 0.24, H * 0.25], [W * 0.78, H * 0.27], [W * 0.5, H * 0.66]][j % 3];
        const x = W / 2 + (P[0] - W / 2) * k, y = H * 0.43 + (P[1] - H * 0.43) * k;
        return (
          <Img key={j} src={staticFile(`${imgDir}/${src}`)} style={{position: "absolute", left: x, top: y, width: 230, translate: "-50% -50%", rotate: `${(j - 1) * 16 + Math.sin(t * 2 + j) * 4}deg`,
            opacity: inK * Math.min(1, k * 1.5), borderRadius: 10, boxShadow: "0 24px 50px rgba(0,0,0,0.45)", border: "6px solid white"}} />
        );
      })}
      <div style={{position: "absolute", left: 0, width: W, top: H * 0.43, translate: `${sx}px calc(-50% + ${sy}px)`, textAlign: "center", padding: "0 50px", boxSizing: "border-box"}}>
        {h.lines.map((ln, j) => {
          const a = lineAt[j] ?? h.at;
          if (t < a - 0.02) return null;
          const s = spring({frame: Math.round((t - a) * fps), fps, config: {damping: 12, stiffness: 220, mass: 0.7}});
          const n = ln.replace(/\*\*/g, "").length;
          const fs = Math.min(150, 940 / (n * 0.62));
          return (
            <div key={j} style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: fs, lineHeight: 1.08, color: "white", letterSpacing: "-0.02em", scale: String(1.7 - 0.7 * s),
              opacity: Math.min(1, s * 2), filter: s < 0.6 ? `blur(${(0.6 - s) * 14}px)` : undefined, textShadow: "0 10px 40px rgba(0,0,20,0.45)"}}>
              {parts(ln).map((p, q) => <span key={q} style={{color: p.acc ? "#7DD3FC" : "white"}}>{p.t}</span>)}
            </div>
          );
        })}
        {h.sub && h.subAt !== undefined && t >= h.subAt - 0.02 ? (() => {
          const s = spring({frame: Math.round((t - h.subAt!) * fps), fps, config: {damping: 12, stiffness: 180}});
          return (
            <div style={{display: "inline-block", marginTop: 30, padding: "16px 34px", borderRadius: 999, background: "white", color: C.accent, fontFamily: body.fontFamily, fontWeight: 700,
              fontSize: 46, opacity: s, scale: String(0.6 + 0.4 * s)}}>{h.sub}</div>
          );
        })() : null}
      </div>
    </AbsoluteFill>
  );
};
export const hookSounds = (items: Hook[]) => items.flatMap((h) => (h.kind === "stamp" ? [{at: h.at, kind: "ding"}] : (h.lineAt || [h.at]).map((a) => ({at: a, kind: "whoosh"}))));

// ---------- 76 программ по 9 странам ----------
export const Countries: React.FC<{c: {at: number; subAt: number; items: [string, string, number][]}; w0: number; W: number}> = ({c, w0, W}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps + w0;
  const total = c.items.reduce((a, x) => a + x[2], 0);
  const max = Math.max(...c.items.map((x) => x[2]));
  // график строится сразу со входа в сцену (без пустого кадра до слова), к слову «семидесяти» — уже почти целиком
  const a0 = Math.min(c.at, w0 + 0.3);
  const k = interpolate(t, [a0 - 0.1, c.at + 0.9], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const head = spring({frame: Math.round((t - a0 + 0.15) * fps), fps, config: {damping: 12, stiffness: 150}});
  const sub = spring({frame: Math.round((t - c.subAt + 0.05) * fps), fps, config: {damping: 12, stiffness: 180}});
  const top = 560, rowH = 96;
  return (
    <AbsoluteFill>
      <div style={{position: "absolute", left: 0, width: W, top: 250, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 26, opacity: Math.min(1, head * 1.5), scale: String(0.8 + 0.2 * head)}}>
        <span style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 210, lineHeight: 1, color: C.accent}}>{Math.round(total * k)}</span>
        <span style={{fontFamily: display.fontFamily, fontWeight: 700, fontSize: 64, color: C.text}}>программ</span>
      </div>
      <div style={{position: "absolute", left: 0, width: W, top: 470, display: "flex", justifyContent: "center"}}>
        <span style={{padding: "12px 30px", borderRadius: 999, background: C.text, color: "white", fontFamily: body.fontFamily, fontWeight: 700, fontSize: 38, opacity: sub, scale: String(0.6 + 0.4 * sub)}}>
          в {c.items.length} странах
        </span>
      </div>
      {c.items.map(([code, name, v], j) => {
        const a = a0 + j * 0.07;
        const s = spring({frame: Math.round((t - a) * fps), fps, config: {damping: 14, stiffness: 170}});
        const g = interpolate(t, [a, a + 0.7], [0, 1], {...clamp, easing: ease});
        return (
          <div key={code} style={{position: "absolute", left: 64, right: 64, top: top + j * rowH, height: rowH - 18, display: "flex", alignItems: "center", gap: 20, opacity: Math.min(1, s * 1.4), translate: `${(1 - s) * -60}px 0`}}>
            <Img src={staticFile(`интернет-материалы/флаги/${code}.png`)} style={{width: 84, height: 56, objectFit: "cover", borderRadius: 10, boxShadow: "0 6px 14px rgba(20,30,60,0.2)"}} />
            <div style={{width: 240, fontFamily: body.fontFamily, fontWeight: 700, fontSize: 36, color: C.text}}>{name}</div>
            <div style={{flex: 1, height: 44, borderRadius: 14, background: "rgba(37,99,235,0.08)", overflow: "hidden"}}>
              <div style={{width: `${(v / max) * 100 * g}%`, height: "100%", borderRadius: 14, background: j === 0 ? `linear-gradient(90deg, #38BDF8, ${C.accent})` : "linear-gradient(90deg, #A9CBFF, #6EA2FF)"}} />
            </div>
            <div style={{width: 70, textAlign: "right", fontFamily: display.fontFamily, fontWeight: 700, fontSize: 40, color: j === 0 ? C.accent : C.text}}>{Math.round(v * g)}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
