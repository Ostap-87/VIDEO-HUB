// Проверочная версия карусели (props "guides": true, npm run carousel -- <имя> --guides):
// - розовые полосы — поля безопасности (по бокам 72 px, сверху и снизу 64 px), туда не заходит ни один элемент;
// - голубые линии — квадрат 1:1 сетки профиля (по 135 px сверху и снизу срезаются), на обложке главное — между ними;
// - жёлтые линии — сетка 3:4 (видны центральные 1012 px);
// - красные рамки — найденные нарушения: элемент за полем, заголовок обложки вне квадрата, текст не влез;
// - внизу — итог проверки слайда.
import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
import {AbsoluteFill, continueRender, delayRender} from "remotion";
import {fitsPending, GRID, H, MIN_FONT, SAFE, W} from "./kit";

type Box = {x1: number; y1: number; x2: number; y2: number};
type Mark = Box & {label: string};

const PINK = "#FF2D55";
const CYAN = "#00C2FF";
const AMBER = "#FFB020";
const label: React.CSSProperties = {
  position: "absolute",
  fontFamily: "JetBrains Mono, monospace",
  fontWeight: 700,
  fontSize: 22,
  lineHeight: 1,
  padding: "6px 10px",
  borderRadius: 6,
  color: "#FFFFFF",
  whiteSpace: "nowrap",
};

export const Guides: React.FC<{index: number; mascot: Box | null}> = ({index, mascot}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Mark[] | null>(null);
  const [job] = useState(() => ({handle: delayRender("Проверка полей безопасности"), open: true}));
  useLayoutEffect(() => {
    let alive = true;
    const measure = () => {
      if (!alive) return;
      const root = ref.current?.parentElement;
      const imgs = root ? Array.from(root.querySelectorAll("img")) : [];
      if (!root || fitsPending() > 0 || imgs.some((im) => !im.complete)) {
        setTimeout(measure, 30);
        return;
      }
      requestAnimationFrame(() => {
        if (!alive) return;
        const rr = root.getBoundingClientRect();
        const k = rr.width / W;
        const rect = (el: Element): Box => {
          const r = el.getBoundingClientRect();
          return {x1: (r.left - rr.left) / k, y1: (r.top - rr.top) / k, x2: (r.right - rr.left) / k, y2: (r.bottom - rr.top) / k};
        };
        const out: Mark[] = [];
        const outside = (b: Box) => b.x1 < SAFE.side - 0.5 || b.x2 > W - SAFE.side + 0.5 || b.y1 < SAFE.top - 0.5 || b.y2 > H - SAFE.bottom + 0.5;
        root.querySelectorAll("[data-safe]").forEach((el) => {
          const b = rect(el);
          if (b.x2 - b.x1 < 1 || b.y2 - b.y1 < 1) return;
          if (outside(b)) out.push({...b, label: "за полем"});
        });
        if (mascot && outside(mascot)) out.push({...mascot, label: "робот за полем"});
        if (index === 0)
          root.querySelectorAll("[data-key]").forEach((el) => {
            const b = rect(el);
            if (b.y1 < GRID.squareTop || b.y2 > GRID.squareBottom) out.push({...b, label: "заголовок вне квадрата 1:1"});
          });
        root.querySelectorAll("[data-overflow]").forEach((el) => out.push({...rect(el), label: "текст не влезает"}));
        // кегль: любой видимый текст не мельче 30 px
        root.querySelectorAll("*").forEach((el) => {
          if (ref.current?.contains(el)) return;
          const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
          if (!own) return;
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < MIN_FONT - 0.5) out.push({...rect(el), label: `кегль ${Math.round(fs)} px`});
        });
        setMarks(out);
      });
    };
    measure();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (marks && job.open) {
      job.open = false;
      continueRender(job.handle);
    }
  }, [marks]);
  useEffect(
    () => () => {
      if (job.open) {
        job.open = false;
        continueRender(job.handle);
      }
    },
    [],
  );
  const cover = index === 0;
  return (
    <AbsoluteFill ref={ref} style={{pointerEvents: "none"}}>
      <svg width={W} height={H} style={{position: "absolute", inset: 0}}>
        {/* поля безопасности */}
        <path d={`M0 0 H${W} V${H} H0 Z M${SAFE.side} ${SAFE.top} V${H - SAFE.bottom} H${W - SAFE.side} V${SAFE.top} Z`} fill="rgba(255,45,85,0.22)" fillRule="evenodd" />
        <rect x={SAFE.side} y={SAFE.top} width={W - 2 * SAFE.side} height={H - SAFE.top - SAFE.bottom} fill="none" stroke={PINK} strokeWidth={3} strokeDasharray="16 10" />
        {/* обложка: что срежет квадрат сетки профиля */}
        {cover ? (
          <>
            <rect x={0} y={0} width={W} height={GRID.squareTop} fill="rgba(0,194,255,0.18)" />
            <rect x={0} y={GRID.squareBottom} width={W} height={H - GRID.squareBottom} fill="rgba(0,194,255,0.18)" />
          </>
        ) : null}
        <line x1={0} x2={W} y1={GRID.squareTop} y2={GRID.squareTop} stroke={CYAN} strokeWidth={3} strokeDasharray="22 10" />
        <line x1={0} x2={W} y1={GRID.squareBottom} y2={GRID.squareBottom} stroke={CYAN} strokeWidth={3} strokeDasharray="22 10" />
        <line x1={GRID.portraitSide} x2={GRID.portraitSide} y1={0} y2={H} stroke={AMBER} strokeWidth={3} strokeDasharray="8 8" />
        <line x1={W - GRID.portraitSide} x2={W - GRID.portraitSide} y1={0} y2={H} stroke={AMBER} strokeWidth={3} strokeDasharray="8 8" />
        {mascot ? <rect x={mascot.x1} y={mascot.y1} width={mascot.x2 - mascot.x1} height={mascot.y2 - mascot.y1} fill="none" stroke="#B05BFF" strokeWidth={3} strokeDasharray="10 6" /> : null}
        {(marks ?? []).map((m, i) => (
          <rect key={i} x={m.x1} y={m.y1} width={m.x2 - m.x1} height={m.y2 - m.y1} fill="rgba(255,0,51,0.12)" stroke="#FF0033" strokeWidth={5} />
        ))}
      </svg>
      <div style={{...label, left: SAFE.side + 8, top: GRID.squareTop + 6, background: CYAN}}>1:1 сетка профиля</div>
      <div style={{...label, left: SAFE.side + 8, top: GRID.squareBottom - 40, background: CYAN}}>1:1 сетка профиля</div>
      <div style={{...label, right: SAFE.side + 8, top: SAFE.top + 8 + 64 + 10, background: PINK}}>поля 72 / 64 px</div>
      {cover ? <div style={{...label, left: SAFE.side + 8, top: 20, background: "rgba(0,120,170,0.95)"}}>обложка: заголовок и главное — между голубыми линиями</div> : null}
      {mascot ? <div style={{...label, left: mascot.x1, top: mascot.y1 - 36, background: "#B05BFF"}}>робот</div> : null}
      {(marks ?? []).map((m, i) => (
        <div key={i} style={{...label, left: Math.min(m.x1, W - 360), top: Math.max(0, m.y1 - 36), background: "#FF0033"}}>
          ✕ {m.label}
        </div>
      ))}
      <div
        style={{
          ...label,
          left: "50%",
          translate: "-50% 0",
          bottom: 14,
          fontSize: 26,
          padding: "8px 16px",
          background: marks && marks.length ? "#FF0033" : "#16A34A",
        }}
      >
        {marks === null ? "проверка…" : marks.length ? `✕ нарушений: ${marks.length}` : "✓ поля, кегль и сетка в норме"}
      </div>
    </AbsoluteFill>
  );
};
