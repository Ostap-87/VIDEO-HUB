// Приёмы из разбора prompt-motion.com и каталога skillry (23.10.2026, пользователь: «изучи этот сайт и забери всё, что
// там есть, для нашей монтажки»). Чужие промпты и ролики не копируем — только приёмы, сделанные своим кодом.
// Поля TalkReelPro: counters — сквозной счётчик слова в углу; searches — строка поиска с подсказками; stamps — штамп;
// dots — точечная матрица «N из M» / проценты; chapters — метка главы + полоса прогресса; votes — сетка-голосование;
// drums — барабан слов; rings — кольцо слов вокруг головы (задняя половина за спикером, передняя — перед ним).
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {loadFont as loadOswald} from "@remotion/google-fonts/Oswald";
import {useBrand} from "../brand";

const oswald = loadOswald("normal", {weights: ["600", "700"], subsets: ["cyrillic", "latin"]});
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const url = (s: string) => (/^(https?:|blob:|data:)/.test(s) ? s : staticFile(s));
const sec = (fps: number, s: number) => Math.max(1, Math.round(s * fps));
type W = {text: string; start: number; end: number};
type Focus = {x: number; y: number};
const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]/gu, "");

// ------------------------------------------------------------------ сквозной счётчик слова («сказал „короче“ 13 раз»)
export type CounterItem = {word: string; label?: string; from?: number; until?: number};

export const WordCounters: React.FC<{items?: CounterItem[]; words: W[]; stories: boolean}> = ({items, words, stories}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  return (
    <>
      {(items ?? []).map((c, i) => {
        const w = norm(c.word);
        if (!w) return null;
        const hits = words.filter((x) => norm(x.text).startsWith(w) && x.start >= (c.from ?? 0) && x.start <= (c.until ?? 1e9));
        const done = hits.filter((x) => x.start <= t);
        if (!done.length || t > (c.until ?? 1e9) + 1.5) return null;
        const last = done[done.length - 1];
        const k = spring({frame: frame - Math.round(last.start * fps), fps, config: {damping: 10, stiffness: 220}});
        return (
          <div key={i} style={{position: "absolute", right: 56, top: (stories ? 330 : 210) + i * 120, display: "flex", alignItems: "center", gap: 14, background: B.square ? "#F7F4EC" : "rgba(15,17,26,0.78)", border: B.square ? "3px solid #191922" : "2px solid rgba(255,255,255,0.18)", borderRadius: B.square ? 0 : 20, padding: "10px 18px", boxShadow: B.square ? "8px 8px 0 #191922" : "0 10px 26px rgba(0,0,0,0.35)"}}>
            <div style={{fontFamily: B.bodyFont, fontWeight: 700, fontSize: 26, color: B.square ? "#191922" : "rgba(255,255,255,0.8)", maxWidth: 230, lineHeight: 1.1}}>{c.label ?? `«${c.word}»`}</div>
            <div style={{fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 64, lineHeight: 1, color: B.square ? "#FF4A1F" : "#FFD92E", scale: String(1 + 0.45 * (1 - k)), minWidth: 52, textAlign: "center"}}>{done.length}</div>
          </div>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------------ строка поиска: запрос печатается, выпадают подсказки
export type SearchItem = {at: number; until: number; text: string; items?: string[]; y?: number};

const SearchOne: React.FC<{it: SearchItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const k = spring({frame, fps, config: {damping: 16, stiffness: 170}});
  const out = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
  const typeEnd = Math.min(dur * 0.55, 0.3 + 0.06 * it.text.length);
  const shown = Math.floor(interpolate(t, [0.3, typeEnd], [0, it.text.length], clamp));
  const sugg = (it.items ?? []).slice(0, 4);
  const sq = B.square;
  return (
    <div style={{position: "absolute", left: 80, right: 80, top: it.y ?? 330, opacity: Math.min(1, k * 1.5) * out, translate: `0px ${(1 - k) * -40}px`}}>
      <div style={{background: "#FFFFFF", borderRadius: sq ? 0 : 44, border: sq ? "4px solid #191922" : undefined, boxShadow: sq ? "8px 8px 0 #191922" : "0 16px 40px rgba(0,0,0,0.35)", padding: "20px 30px", display: "flex", alignItems: "center", gap: 20}}>
        <svg width={44} height={44} viewBox="0 0 24 24">
          <circle cx={10.5} cy={10.5} r={6.5} fill="none" stroke="#5F6368" strokeWidth={2.4} />
          <line x1={15.5} y1={15.5} x2={21} y2={21} stroke="#5F6368" strokeWidth={2.4} strokeLinecap="round" />
        </svg>
        <div style={{fontFamily: B.bodyFont, fontWeight: 500, fontSize: 42, color: "#202124", whiteSpace: "nowrap", overflow: "hidden"}}>
          {it.text.slice(0, shown)}
          {Math.floor(t * 2.4) % 2 === 0 && t < typeEnd + 0.6 ? <span style={{color: "#1A73E8"}}>|</span> : null}
        </div>
      </div>
      {sugg.length ? (
        <div style={{marginTop: 10, background: "#FFFFFF", borderRadius: sq ? 0 : 28, border: sq ? "4px solid #191922" : undefined, overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.3)"}}>
          {sugg.map((s, i) => {
            const kk = interpolate(t, [typeEnd + 0.1 + i * 0.12, typeEnd + 0.3 + i * 0.12], [0, 1], {...clamp, easing: ease});
            return (
              <div key={i} style={{display: "flex", alignItems: "center", gap: 18, padding: "14px 30px", fontFamily: B.bodyFont, fontSize: 36, color: "#202124", opacity: kk, translate: `0px ${(1 - kk) * -14}px`, borderTop: i ? "1px solid #ECECEC" : undefined}}>
                <span style={{color: "#9AA0A6", fontSize: 30}}>⌕</span>
                <span>
                  {s.toLowerCase().startsWith(it.text.toLowerCase()) ? (
                    <>
                      {s.slice(0, it.text.length)}
                      <b>{s.slice(it.text.length)}</b>
                    </>
                  ) : (
                    s
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export const Searches: React.FC<{items?: SearchItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`search-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Строка поиска">
          <SearchOne it={it} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ штамп («ПРОВЕРЕНО», «МИФ»): падает с поворотом, отпечаток
export type StampItem = {at: number; until: number; text: string; color?: string; x?: number; y?: number; rot?: number};

const StampOne: React.FC<{it: StampItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const dur = it.until - it.at;
  // падение за 5 кадров с большого масштаба, удар, лёгкая отдача
  const drop = interpolate(frame, [0, 5], [2.6, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const recoil = frame >= 5 ? 1 + 0.06 * Math.exp(-(frame - 5) / 3) * Math.cos((frame - 5) * 1.3) : 1;
  const out = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
  const color = it.color ?? "#E5322D";
  const size = Math.min(140, 760 / (Math.max(3, it.text.length) * 0.62));
  return (
    <div style={{position: "absolute", left: (it.x ?? 540) - 450, width: 900, top: (it.y ?? 520) - 120, display: "flex", justifyContent: "center", opacity: interpolate(frame, [0, 2], [0, 1], clamp) * out}}>
      <div
        style={{
          scale: String(drop * recoil),
          rotate: `${it.rot ?? -12}deg`,
          border: `10px solid ${color}`,
          outline: `4px solid ${color}`,
          outlineOffset: 8,
          borderRadius: 18,
          padding: "10px 34px",
          fontFamily: oswald.fontFamily,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color,
          // «выщербленная» краска штампа
          maskImage: "radial-gradient(circle at 30% 40%, #000 60%, rgba(0,0,0,0.75) 61%, #000 66%), radial-gradient(circle at 70% 70%, #000 55%, rgba(0,0,0,0.8) 58%)",
          WebkitMaskImage: "radial-gradient(circle at 30% 40%, #000 60%, rgba(0,0,0,0.75) 61%, #000 66%)",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        {it.text}
      </div>
    </div>
  );
};

export const Stamps: React.FC<{items?: StampItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`stamp-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Штамп">
          <StampOne it={it} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ точечная матрица: «7 из 10», «73%» — точки закрашиваются
export type DotsItem = {at: number; until: number; value: number; total?: number; label?: string; y?: number};

const DotsOne: React.FC<{it: DotsItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const total = it.total ?? 100;
  const cols = total <= 10 ? total : total <= 20 ? 10 : 10;
  const rows = Math.ceil(total / cols);
  const cell = total <= 10 ? 76 : total <= 20 ? 62 : 44;
  const filled = Math.round(interpolate(t, [0.3, Math.min(dur * 0.6, 1.6)], [0, it.value], {...clamp, easing: Easing.out(Easing.cubic)}));
  const k = spring({frame, fps, config: {damping: 16, stiffness: 150}});
  const out = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
  const pct = total === 100 ? `${filled}%` : `${filled} из ${total}`;
  const on = B.id === "od" ? "#FFD92E" : B.id === "aura" ? "#FFF65D" : "#3D7BFF";
  return (
    <div style={{position: "absolute", left: 0, right: 0, top: it.y ?? 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: Math.min(1, k * 1.5) * out, scale: String(0.85 + 0.15 * k)}}>
      <div style={{background: B.square ? "#F7F4EC" : "rgba(12,14,22,0.72)", border: B.square ? "3px solid #191922" : undefined, borderRadius: B.square ? 0 : 28, padding: 26, display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: cell * 0.22}}>
        {Array.from({length: rows * cols}, (_, i) =>
          i < total ? (
            <div key={i} style={{width: cell, height: cell, borderRadius: "50%", background: i < filled ? on : B.square ? "rgba(25,25,34,0.15)" : "rgba(255,255,255,0.16)", boxShadow: i < filled && !B.square ? `0 0 12px ${on}` : undefined, scale: i === filled - 1 ? "1.15" : "1"}} />
          ) : (
            <div key={i} />
          ),
        )}
      </div>
      <div style={{fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 96, lineHeight: 1, color: "#FFFFFF", textShadow: "0 6px 22px rgba(0,0,0,0.5)"}}>{pct}</div>
      {it.label ? <div style={{fontFamily: B.bodyFont, fontWeight: 700, fontSize: 40, color: "#FFFFFF", textShadow: "0 4px 14px rgba(0,0,0,0.6)", textAlign: "center", maxWidth: 900}}>{it.label}</div> : null}
    </div>
  );
};

export const DotsGrid: React.FC<{items?: DotsItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`dots-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Точки «N из M»">
          <DotsOne it={it} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ главы: метка «Глава 2 · …» и полоса прогресса сверху
export type ChapterItem = {at: number; title: string};

export const Chapters: React.FC<{items?: ChapterItem[]; until: number; stories: boolean; progress?: boolean}> = ({items, until, stories, progress}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const list = [...(items ?? [])].sort((a, b) => a.at - b.at);
  if (!list.length || t > until) return null;
  const cur = [...list].reverse().find((c) => c.at <= t);
  const idx = cur ? list.indexOf(cur) : -1;
  const show = cur ? Math.min(interpolate(t, [cur.at, cur.at + 0.35], [0, 1], {...clamp, easing: ease}), interpolate(t, [cur.at + 2.4, cur.at + 2.8], [1, 0], clamp)) : 0;
  const accent = B.id === "od" ? "#FFD92E" : B.id === "aura" ? "#FFF65D" : "#3D7BFF";
  const top = stories ? 200 : 40;
  return (
    <>
      {progress !== false ? (
        <div style={{position: "absolute", left: 56, right: 56, top, height: 10, display: "flex", gap: 8}}>
          {list.map((c, i) => {
            const end = list[i + 1]?.at ?? until;
            const f = interpolate(t, [c.at, end], [0, 1], clamp);
            return (
              <div key={i} style={{flex: Math.max(0.5, end - c.at), height: "100%", borderRadius: 5, background: "rgba(255,255,255,0.25)", overflow: "hidden"}}>
                <div style={{width: `${f * 100}%`, height: "100%", background: accent}} />
              </div>
            );
          })}
        </div>
      ) : null}
      {cur && show > 0 ? (
        <div style={{position: "absolute", left: 56, top: top + 130, display: "flex", alignItems: "center", gap: 14, opacity: show, translate: `${(1 - show) * -40}px 0px`}}>
          <div style={{background: accent, color: B.id === "gtt" ? "#FFFFFF" : "#191922", fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 30, padding: "6px 14px", borderRadius: B.square ? 0 : 10, letterSpacing: "0.06em"}}>ГЛАВА {idx + 1}</div>
          <div style={{fontFamily: B.bodyFont, fontWeight: 800, fontSize: 36, color: "#FFFFFF", textShadow: "0 3px 12px rgba(0,0,0,0.6)"}}>{cur.title}</div>
        </div>
      ) : null}
    </>
  );
};

// ------------------------------------------------------------------ сетка-голосование: «какой вариант? пишите номер»
export type VoteItem = {at: number; until: number; title?: string; items: string[]; images?: string[]};

const VoteOne: React.FC<{it: VoteItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const n = Math.min(6, it.items.length);
  const cols = n <= 4 ? 2 : 3;
  const cw = cols === 2 ? 440 : 300;
  const out = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
  const accent = B.id === "od" ? "#FFD92E" : B.id === "aura" ? "#FFF65D" : "#3D7BFF";
  return (
    <AbsoluteFill style={{background: `rgba(8,10,16,${0.72 * Math.min(1, t / 0.3)})`, opacity: out, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 34}}>
      <div style={{fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 70, color: "#FFFFFF", textTransform: "uppercase", textAlign: "center", maxWidth: 960, lineHeight: 1.05}}>{it.title ?? "Какой вариант? Пишите номер"}</div>
      <div style={{display: "grid", gridTemplateColumns: `repeat(${cols}, ${cw}px)`, gap: 22}}>
        {it.items.slice(0, n).map((x, i) => {
          const k = spring({frame: frame - 6 - i * 4, fps, config: {damping: 14, stiffness: 170}});
          const img = it.images?.[i];
          return (
            <div key={i} style={{position: "relative", height: cols === 2 ? 300 : 260, borderRadius: B.square ? 0 : 24, overflow: "hidden", background: "rgba(255,255,255,0.08)", border: B.square ? "4px solid #F7F4EC" : "2px solid rgba(255,255,255,0.25)", scale: String(0.7 + 0.3 * k), opacity: Math.min(1, k * 1.6)}}>
              {img ? <Img src={url(img)} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"}} /> : null}
              <div style={{position: "absolute", left: 14, top: 14, width: 64, height: 64, borderRadius: B.square ? 0 : "50%", background: accent, color: B.id === "gtt" ? "#FFF" : "#191922", fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center"}}>{i + 1}</div>
              <div style={{position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 18px", background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))", fontFamily: B.bodyFont, fontWeight: 800, fontSize: 34, color: "#FFFFFF", lineHeight: 1.1}}>{x}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Votes: React.FC<{items?: VoteItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`vote-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Голосование">
          <VoteOne it={it} />
        </Sequence>
      ))}
    </>
  );
};
export const voteActive = (items: VoteItem[] | undefined, t: number) => (items ?? []).some((x) => t >= x.at + 0.2 && t <= x.until);

// ------------------------------------------------------------------ барабан слов: слова прокручиваются, как барабан слот-машины
export type DrumItem = {at: number; until: number; items: string[]; prefix?: string; y?: number};

const DrumOne: React.FC<{it: DrumItem}> = ({it}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const n = it.items.length;
  const step = (dur - 0.6) / Math.max(1, n);
  // позиция барабана: быстрый перескок к следующему слову (0,22 с) и пауза на нём
  let pos = 0;
  for (let i = 1; i < n; i++) pos += interpolate(t, [0.3 + i * step - 0.22, 0.3 + i * step], [0, 1], {...clamp, easing: Easing.bezier(0.6, 0, 0.2, 1.25)});
  const k = spring({frame, fps, config: {damping: 16, stiffness: 170}});
  const out = interpolate(t, [dur - 0.3, dur], [1, 0], clamp);
  const H = 130;
  const accent = B.id === "od" ? "#FFD92E" : B.id === "aura" ? "#FFF65D" : "#3D7BFF";
  return (
    <div style={{position: "absolute", left: 0, right: 0, top: it.y ?? 360, display: "flex", justifyContent: "center", alignItems: "center", gap: 20, opacity: Math.min(1, k * 1.5) * out}}>
      {it.prefix ? <div style={{fontFamily: oswald.fontFamily, fontWeight: 600, fontSize: 80, color: "#FFFFFF", textTransform: "uppercase", textShadow: "0 6px 20px rgba(0,0,0,0.5)"}}>{it.prefix}</div> : null}
      <div style={{position: "relative", height: H, overflow: "hidden", minWidth: 420, borderRadius: B.square ? 0 : 20, background: accent, boxShadow: B.square ? "8px 8px 0 #191922" : "0 12px 30px rgba(0,0,0,0.4)", padding: "0 30px"}}>
        <div style={{translate: `0px ${-pos * H}px`}}>
          {it.items.map((x, i) => (
            <div key={i} style={{height: H, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 92, color: B.id === "gtt" ? "#FFFFFF" : "#191922", textTransform: "uppercase", whiteSpace: "nowrap", filter: `blur(${Math.min(6, Math.abs(pos - i) < 0.5 ? Math.abs(pos - Math.round(pos)) * 12 : 0)}px)`}}>
              {x}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Drums: React.FC<{items?: DrumItem[]}> = ({items}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`drum-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Барабан слов">
          <DrumOne it={it} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ кольцо слов вокруг головы: задняя половина — за спикером
export type RingItem = {at: number; until: number; items: string[]};

const RingWords: React.FC<{it: RingItem; focus: Focus; faceTop?: number; half: "back" | "front"}> = ({it, focus, faceTop, half}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const k = Math.min(interpolate(t, [0, 0.4], [0, 1], {...clamp, easing: ease}), interpolate(t, [dur - 0.35, dur], [1, 0], clamp));
  const n = it.items.length;
  const cy = (faceTop ?? focus.y - 230) + 40;
  const rx = 420;
  const ry = 90;
  return (
    <>
      {it.items.map((w, i) => {
        const a = t * 1.1 + (i / n) * Math.PI * 2;
        const depth = Math.sin(a); // > 0 — ближе к зрителю
        if ((depth > 0) !== (half === "front")) return null;
        const x = focus.x + Math.cos(a) * rx;
        const y = cy + depth * ry;
        const sc = 0.75 + 0.35 * (depth + 1) / 2;
        return (
          <div key={i} style={{position: "absolute", left: x - 300, width: 600, top: y - 40, textAlign: "center", fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 64, color: i % 2 ? (B.id === "gtt" ? "#7FB2FF" : "#FFD92E") : "#FFFFFF", textTransform: "uppercase", scale: String(sc * k), opacity: k * (0.55 + 0.45 * (depth + 1) / 2), textShadow: "0 6px 18px rgba(0,0,0,0.5)", whiteSpace: "nowrap"}}>
            {w}
          </div>
        );
      })}
    </>
  );
};

export const Rings: React.FC<{items?: RingItem[]; focus: Focus; faceTop?: number; half: "back" | "front"}> = ({items, focus, faceTop, half}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`ring-${half}-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name="Кольцо слов">
          <RingWords it={it} focus={focus} faceTop={faceTop} half={half} />
        </Sequence>
      ))}
    </>
  );
};
export const ringActive = (items: RingItem[] | undefined, t: number) => (items ?? []).some((x) => t >= x.at - 0.05 && t <= x.until + 0.05);
