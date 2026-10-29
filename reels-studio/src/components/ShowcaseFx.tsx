// Приёмы из референса 28.10.2026 «монтаж через Claude» (видео пользователя по ссылке WeTransfer; разбор —
// source-videos/референсы-эффекты/2026-10-28-ref-wetransfer/разбор.md). Поля TalkReelPro:
// widgets   — стеклянные виджеты вокруг головы: цифра, прогресс, профиль, график, плеер, кольцо, бейдж и плашка снизу;
// docus     — «документалка»: ч/б спикер на тёмном фоне со свечением за головой, узкий заголовок капсом,
//             плашка с именем, кнопка «Подписаться» нажимается курсором (фон — после вырезки спикера);
// orbits    — карточки (скриншоты, кадры) летают по орбите вокруг головы, задняя половина — за спикером;
// charts    — сверху столбики (свой подсвечен, линия «в среднем»), снизу спикер карточкой;
// timelines — сверху «монтажный стол»: строки с галочками, дорожки кадров, субтитров, цвета, звука, бегунок и %;
// neons     — неоновая вывеска над головой, кадр темнеет, спикер в луче прожектора;
// prompts   — команда печатается в чате на клавиатуре телефона, ответ, карточка с роликом раскрывается на весь кадр;
// watermark — @ник с иконкой соцсети в углу весь ролик (защита от перезаливов).
// Ещё из этого референса: lists style «progress» (MontazhFx) и финал outros с сеткой кадров и словом (RefFx).
// Акцент в текстах — **слово** (цвет бренда), строки — через « / ».
import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {loadFont as loadOswald} from "@remotion/google-fonts/Oswald";
import {loadFont as loadPlayfair} from "@remotion/google-fonts/PlayfairDisplay";
import {SpeakerVideo} from "./EdlVideo";
import {amountAt} from "./MontazhFx";
import {FaceCrop, Media, NetIcon} from "./RefFx";
import {useBrand, type Brand} from "../brand";

const oswald = loadOswald("normal", {weights: ["500", "700"], subsets: ["cyrillic", "latin"]});
const playfair = loadPlayfair("italic", {weights: ["700", "900"], subsets: ["cyrillic", "latin"]});

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const sec = (fps: number, s: number) => Math.max(1, Math.round(s * fps));
type Focus = {x: number; y: number};
type Span = {at: number; until: number};
const activeAt = <T extends Span>(items: T[] | undefined, t: number, pad = 0.05) => (items ?? []).find((x) => t >= x.at - pad && t <= x.until + pad);
const linesOf = (s: string) => s.split(/\s*(?:\n|\s\/\s)\s*/).filter(Boolean);
// «Один **клип**» → [["Один ", false], ["клип", true]]
const marked = (s: string): [string, boolean][] => s.split("**").map((x, i) => [x, i % 2 === 1] as [string, boolean]).filter(([x]) => x);
// цвет «неона», свечения и подсветки по бренду (поле color главнее)
const glowOf = (B: Brand) => (B.id === "od" ? "#FF4A1F" : B.id === "aura" ? "#FFE74A" : "#3D7BFF");
const panelBg = (B: Brand) => (B.id === "od" ? ["#25252E", "#15151B"] : B.id === "aura" ? ["#2E2E2E", "#191919"] : ["#1B2B6B", "#0C1435"]);

function Seqs<T extends Span>({items, name, render}: {items?: T[]; name: string; render: (it: T) => React.ReactNode}) {
  const {fps} = useVideoConfig();
  return (
    <>
      {(items ?? []).map((it, i) => (
        <Sequence key={`${name}-${i}`} from={Math.round(it.at * fps)} durationInFrames={sec(fps, it.until - it.at)} premountFor={fps} name={name}>
          {render(it)}
        </Sequence>
      ))}
    </>
  );
}

// ------------------------------------------------------------------ стеклянные виджеты вокруг головы
export type Widget = {kind: "stat" | "progress" | "profile" | "chart" | "player" | "ring" | "badge"; value?: string; label?: string; sub?: string; image?: string};
export type WidgetItem = Span & {items: Widget[]; caption?: string};

// у каждого вида своё место: левая колонка — цифра, график, бейдж; правая — прогресс, профиль, плеер, кольцо (лицо в центре свободно)
const W_SLOT: Record<Widget["kind"], {x: number; y: number; w: number; h: number}> = {
  stat: {x: 40, y: 270, w: 290, h: 250},
  chart: {x: 40, y: 550, w: 290, h: 300},
  badge: {x: 40, y: 880, w: 290, h: 190},
  progress: {x: 750, y: 270, w: 290, h: 140},
  profile: {x: 750, y: 432, w: 290, h: 140},
  player: {x: 750, y: 594, w: 290, h: 210},
  ring: {x: 750, y: 826, w: 290, h: 240},
};
const W_ORDER: Widget["kind"][] = ["stat", "progress", "profile", "chart", "player", "ring", "badge"];
const GREEN = "#34D27B";
const RED = "#E5484D";

const WidgetBody: React.FC<{w: Widget; t: number; video: string; focus: Focus; trim: number}> = ({w, t, video, focus, trim}) => {
  const B = useBrand();
  const fill = interpolate(t, [0.25, 1.4], [0, 1], {...clamp, easing: ease});
  const pct = Math.max(0, Math.min(100, parseFloat(w.value ?? "") || 0));
  const head = (txt?: string) =>
    txt ? (
      <div style={{display: "flex", alignItems: "center", gap: 10, fontFamily: B.bodyFont, fontWeight: 600, fontSize: 25, opacity: 0.92}}>
        <span style={{width: 12, height: 12, borderRadius: 6, background: RED}} />
        {txt}
      </div>
    ) : null;
  if (w.kind === "stat")
    return (
      <div style={{padding: "22px 26px"}}>
        {head(w.sub)}
        <div style={{fontFamily: B.bodyFont, fontWeight: 800, fontSize: 132, lineHeight: 1, marginTop: 6}}>{w.value}</div>
        <div style={{fontFamily: B.bodyFont, fontWeight: 500, fontSize: 25, lineHeight: 1.2, opacity: 0.9, marginTop: 8}}>{w.label}</div>
      </div>
    );
  if (w.kind === "progress")
    return (
      <div style={{padding: "22px 26px"}}>
        {head(w.label ?? "Рендер")}
        <div style={{height: 12, borderRadius: 6, background: "rgba(255,255,255,0.25)", marginTop: 20, overflow: "hidden"}}>
          <div style={{width: `${pct * fill}%`, height: "100%", borderRadius: 6, background: "#FFF"}} />
        </div>
        <div style={{fontFamily: B.bodyFont, fontSize: 21, opacity: 0.8, marginTop: 12}}>{`${w.sub ? `${w.sub} · ` : ""}${Math.round(pct * fill)}%`}</div>
      </div>
    );
  if (w.kind === "profile")
    return (
      <div style={{padding: "0 22px 0 26px", height: "100%", display: "flex", alignItems: "center", gap: 14}}>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontFamily: B.bodyFont, fontWeight: 700, fontSize: 26, lineHeight: 1.05, overflow: "hidden", maxHeight: 56, overflowWrap: "anywhere"}}>{w.label}</div>
          <div style={{fontFamily: B.bodyFont, fontSize: 20, opacity: 0.75, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{w.sub}</div>
        </div>
        <div style={{width: 80, height: 80, borderRadius: 40, overflow: "hidden", position: "relative", border: "3px solid rgba(255,255,255,0.6)", flexShrink: 0}}>
          {w.image ? <Media src={w.image} /> : <FaceCrop video={video} trim={trim} focus={focus} w={80} h={80} k={2.6} eye={0.42} />}
        </div>
      </div>
    );
  if (w.kind === "chart") {
    const bars = [1, 0.62, 0.48, 0.34, 0.24, 0.16, 0.12];
    return (
      <div style={{position: "absolute", inset: 8, borderRadius: B.square ? 0 : 26, background: "rgba(16,14,14,0.86)", padding: "16px 20px"}}>
        <div style={{display: "flex", gap: 7}}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span key={c} style={{width: 11, height: 11, borderRadius: 6, background: c}} />
          ))}
          <span style={{marginLeft: 8, fontFamily: B.monoFont, fontSize: 15, opacity: 0.55}}>{w.sub ?? "stats"}</span>
        </div>
        <div style={{fontFamily: B.bodyFont, fontWeight: 700, fontSize: 25, marginTop: 12}}>{w.label}</div>
        <div style={{fontFamily: B.bodyFont, fontWeight: 800, fontSize: 46, color: RED, lineHeight: 1.05}}>{w.value}</div>
        <div style={{position: "absolute", left: 20, right: 20, bottom: 16, height: 84, display: "flex", alignItems: "flex-end", gap: 8}}>
          {bars.map((h, i) => (
            <div key={i} style={{flex: 1, height: `${h * 100 * interpolate(t, [0.3 + i * 0.06, 0.8 + i * 0.06], [0, 1], {...clamp, easing: ease})}%`, background: i ? RED : "#FFD23F", borderRadius: 3}} />
          ))}
        </div>
      </div>
    );
  }
  if (w.kind === "player")
    return (
      <div style={{padding: "20px 22px"}}>
        <div style={{display: "flex", gap: 14, alignItems: "center"}}>
          <div style={{width: 62, height: 62, borderRadius: B.square ? 0 : 14, background: B.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0}}>
            <svg width={36} height={36} viewBox="0 0 100 100">
              <path d="M50 4 C54 34 66 46 96 50 C66 54 54 66 50 96 C46 66 34 54 4 50 C34 46 46 34 50 4 Z" fill={B.accentInk} />
            </svg>
          </div>
          <div style={{minWidth: 0}}>
            <div style={{fontFamily: B.monoFont, fontSize: 14, letterSpacing: "0.1em", opacity: 0.6}}>СЕЙЧАС В МОНТАЖЕ</div>
            <div style={{fontFamily: B.bodyFont, fontWeight: 700, fontSize: 27, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{w.label}</div>
            <div style={{fontFamily: B.bodyFont, fontSize: 19, opacity: 0.65}}>{w.sub}</div>
          </div>
        </div>
        <div style={{height: 5, borderRadius: 3, background: "rgba(255,255,255,0.25)", marginTop: 18}}>
          <div style={{width: `${18 + 60 * Math.min(1, t / 4)}%`, height: "100%", background: "#FFF", borderRadius: 3}} />
        </div>
        <div style={{display: "flex", justifyContent: "center", gap: 46, marginTop: 14, fontSize: 30}}>
          <span>⏮</span>
          <span>▶</span>
          <span>⏭</span>
        </div>
      </div>
    );
  if (w.kind === "ring") {
    const r = 74;
    const c = 2 * Math.PI * r;
    return (
      <div style={{height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6}}>
        <div style={{position: "relative", width: 180, height: 180}}>
          <svg width={180} height={180} viewBox="0 0 180 180" style={{position: "absolute", inset: 0, rotate: "-90deg"}}>
            <circle cx={90} cy={90} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={14} />
            <circle cx={90} cy={90} r={r} fill="none" stroke={GREEN} strokeWidth={14} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - 0.86 * fill)} />
          </svg>
          <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: B.bodyFont, fontWeight: 800, fontSize: 56}}>{w.value}</div>
        </div>
        <div style={{fontFamily: B.bodyFont, fontSize: 24, opacity: 0.85}}>{w.label}</div>
      </div>
    );
  }
  // badge: крупная цифра и красная пилюля
  return (
    <div style={{padding: "18px 24px"}}>
      <div style={{fontFamily: B.bodyFont, fontWeight: 800, fontSize: 92, lineHeight: 1}}>{w.value}</div>
      {w.label ? <div style={{display: "inline-block", marginTop: 12, padding: "6px 14px", borderRadius: B.square ? 0 : 10, background: RED, fontFamily: B.bodyFont, fontWeight: 700, fontSize: 21}}>{w.label}</div> : null}
    </div>
  );
};

const WidgetsOne: React.FC<{it: WidgetItem; video: string; focus: Focus; stories: boolean}> = ({it, video, focus, stories}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const shift = stories ? 130 : 0;
  const items = W_ORDER.flatMap((k) => it.items.filter((w) => w.kind === k).slice(0, 1));
  const out = interpolate(t, [dur - 0.35, dur], [1, 0], {...clamp, easing: ease});
  const trim = Math.round(it.at * fps);
  return (
    <AbsoluteFill>
      {items.map((w, i) => {
        const s = W_SLOT[w.kind];
        const k = spring({frame: frame - Math.round(i * 0.07 * fps), fps, config: {damping: 14, stiffness: 170}});
        const bob = Math.sin(t * 1.6 + i * 1.3) * 5;
        return (
          <div
            key={w.kind}
            style={{
              position: "absolute",
              left: s.x,
              top: s.y + shift,
              width: s.w,
              height: s.h,
              borderRadius: B.square ? 0 : 34,
              overflow: "hidden",
              background: "rgba(48,40,36,0.42)",
              backdropFilter: "blur(22px) saturate(1.35)",
              border: B.square ? "3px solid #191922" : "1.5px solid rgba(255,255,255,0.3)",
              boxShadow: B.square ? "8px 8px 0 #191922" : "0 18px 44px rgba(0,0,0,0.28)",
              color: "#FFF",
              opacity: Math.min(1, k * 1.6) * out,
              scale: String((0.6 + 0.4 * k) * (0.85 + 0.15 * out)),
              translate: `0px ${(1 - k) * 34 + bob}px`,
            }}
          >
            <WidgetBody w={w} t={t - i * 0.07} video={video} focus={focus} trim={trim} />
          </div>
        );
      })}
      {it.caption ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 1460, display: "flex", justifyContent: "center"}}>
          <div
            style={{
              padding: "16px 34px 18px",
              borderRadius: B.square ? 0 : 60,
              background: "rgba(48,40,36,0.5)",
              backdropFilter: "blur(20px)",
              border: B.square ? "3px solid #191922" : "1.5px solid rgba(255,255,255,0.3)",
              color: "#FFF",
              fontFamily: B.bodyFont,
              fontWeight: 600,
              fontSize: 40,
              opacity: interpolate(t, [0.45, 0.75], [0, 1], clamp) * out,
              translate: `0px ${interpolate(t, [0.45, 0.8], [40, 0], {...clamp, easing: ease})}px`,
            }}
          >
            {marked(it.caption).map(([s, a], i) => (
              <span key={i} style={a ? {color: B.id === "aura" ? "#FFE74A" : B.accent, fontWeight: 800} : undefined}>
                {s}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Widgets: React.FC<{items?: WidgetItem[]; video: string; focus: Focus; stories: boolean}> = ({items, video, focus, stories}) => (
  <Seqs items={items} name="Стеклянные виджеты" render={(it) => <WidgetsOne it={it} video={video} focus={focus} stories={stories} />} />
);
export const widgetsActive = (items: WidgetItem[] | undefined, t: number) => !!activeAt(items, t, 0);

// ------------------------------------------------------------------ «документалка»
export type DocuItem = Span & {title: string; kicker?: string; name?: string; handle?: string; button?: string; color?: string};
export const docuActive = (items: DocuItem[] | undefined, t: number) => activeAt(items, t);

// задний план (внутри кадра спикера, между видео и вырезкой): тёмный фон, свечение за головой, тонкое кольцо;
// спикер ч/б. Без вырезки — ч/б кадр с виньеткой и мягким свечением поверх.
export const DocuBack: React.FC<{items?: DocuItem[]; focus: Focus; video: string; cutout: string; videoStyle: React.CSSProperties}> = ({items, focus, video, cutout, videoStyle}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const it = docuActive(items, t);
  if (!it) return null;
  const a = amountAt(t, it.at, it.until, 0.35, 0.35);
  const c = it.color ?? (B.id === "gtt" ? "#2F6BFF" : glowOf(B));
  const hx = focus.x;
  const hy = focus.y - 30;
  const pulse = 1 + 0.03 * Math.sin((t - it.at) * 2.2);
  const bw = "grayscale(1) contrast(1.18) brightness(1.03)";
  return (
    <AbsoluteFill style={{opacity: a}}>
      {cutout ? (
        <>
          <AbsoluteFill style={{background: "#09090B"}} />
          <AbsoluteFill style={{background: `radial-gradient(circle ${430 * pulse}px at ${hx}px ${hy}px, ${c} 0%, ${c}AA 28%, ${c}33 55%, rgba(0,0,0,0) 75%)`}} />
          <div style={{position: "absolute", left: hx + 60 - 430, top: hy - 60 - 430, width: 860, height: 860, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.16)"}} />
          <OffthreadVideo src={staticFile(cutout)} transparent muted style={{...videoStyle, filter: bw}} />
        </>
      ) : (
        <>
          <SpeakerVideo src={video} style={{...videoStyle, filter: bw}} />
          <AbsoluteFill style={{background: `radial-gradient(ellipse 55% 42% at ${hx}px ${hy + 160}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)`}} />
          <AbsoluteFill style={{mixBlendMode: "screen", background: `radial-gradient(circle 420px at ${hx}px ${hy}px, ${c}55, rgba(0,0,0,0) 70%)`}} />
        </>
      )}
    </AbsoluteFill>
  );
};

const DocuFront: React.FC<{it: DocuItem; stories: boolean}> = ({it, stories}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const out = interpolate(t, [dur - 0.35, dur], [1, 0], clamp);
  const shift = stories ? 130 : 0;
  const c = it.color ?? (B.id === "gtt" ? "#4D8BFF" : glowOf(B));
  const rows = linesOf(it.title);
  const plate = spring({frame: frame - Math.round(0.45 * fps), fps, config: {damping: 18, stiffness: 150}});
  // кнопка: курсор подъезжает и нажимает
  const pressAt = Math.min(1.55, dur - 0.6);
  const btn = spring({frame: frame - Math.round(0.3 * fps), fps, config: {damping: 13, stiffness: 160}});
  const press = interpolate(t, [pressAt - 0.05, pressAt + 0.05, pressAt + 0.2], [1, 0.9, 1], clamp);
  const done = t >= pressAt + 0.08;
  const bx = 720;
  const by = 1110;
  const cur = interpolate(t, [pressAt - 0.75, pressAt - 0.05], [0, 1], {...clamp, easing: ease});
  return (
    <AbsoluteFill style={{opacity: out}}>
      {it.kicker ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 268 + shift, textAlign: "center", fontFamily: B.monoFont, fontSize: 24, letterSpacing: "0.2em", color: "rgba(255,255,255,0.85)", opacity: interpolate(t, [0.1, 0.4], [0, 1], clamp)}}>
          {it.kicker.toUpperCase()}
        </div>
      ) : null}
      <div style={{position: "absolute", left: 64, top: 330 + shift, width: 700}}>
        {rows.map((r, i) => {
          const k = interpolate(t, [0.15 + i * 0.12, 0.5 + i * 0.12], [0, 1], {...clamp, easing: ease});
          return (
            <div key={i} style={{fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 100, lineHeight: 1.0, textTransform: "uppercase", color: "#FFF", textShadow: "0 6px 26px rgba(0,0,0,0.55)", clipPath: `inset(-10% ${100 - 100 * k}% -10% 0)`, translate: `${(1 - k) * -40}px 0px`}}>
              {marked(r).map(([s, a], j) => (
                <span key={j} style={a ? {color: c} : undefined}>
                  {s}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      {it.name ? (
        <div style={{position: "absolute", left: 0, top: 1430, translate: `${(1 - plate) * -700}px 0px`}}>
          <div style={{background: c, padding: "12px 36px 14px 64px", fontFamily: oswald.fontFamily, fontWeight: 700, fontSize: 50, letterSpacing: "0.03em", textTransform: "uppercase", color: B.id === "aura" ? "#262626" : "#FFF", display: "inline-block"}}>{it.name}</div>
          {it.handle ? <div style={{marginLeft: 64, marginTop: 8, fontFamily: B.bodyFont, fontSize: 30, color: "rgba(255,255,255,0.88)"}}>{it.handle.startsWith("@") ? it.handle : `@${it.handle}`}</div> : null}
        </div>
      ) : null}
      {it.button !== "" ? (
        <>
          <div
            style={{
              position: "absolute",
              left: bx - 170,
              top: by - 44,
              width: 340,
              height: 88,
              borderRadius: B.square ? 0 : 18,
              background: done ? "#3A3A42" : "#2D7FF9",
              color: "#FFF",
              fontFamily: B.bodyFont,
              fontWeight: 700,
              fontSize: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 14px 34px rgba(0,0,0,0.4)",
              scale: String(btn * press),
            }}
          >
            {done ? "Вы подписаны ✓" : (it.button ?? "Подписаться")}
          </div>
          <svg width={64} height={64} viewBox="0 0 24 24" style={{position: "absolute", left: interpolate(cur, [0, 1], [1060, bx + 40]), top: interpolate(cur, [0, 1], [1500, by + 4]), opacity: interpolate(t, [pressAt - 0.8, pressAt - 0.6], [0, 1], clamp), scale: String(press)}}>
            <path d="M3 2 L3 19 L8 14.5 L11.2 21.5 L14 20.3 L10.9 13.4 L17.5 13.4 Z" fill="#FFF" stroke="#111" strokeWidth={1.4} strokeLinejoin="round" />
          </svg>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

export const Docus: React.FC<{items?: DocuItem[]; stories: boolean}> = ({items, stories}) => <Seqs items={items} name="Документалка" render={(it) => <DocuFront it={it} stories={stories} />} />;

// ------------------------------------------------------------------ карточки по орбите вокруг головы
// bare — предметы без фона (PNG с прозрачностью) летают без рамки карточки и сами покачиваются-вращаются (Haier 29.10.2026:
// «вокруг интерактивно крутятся стиральные машинки, холодильник, электрочайник, тостер, пылесос — настоящие»)
export type OrbitItem = Span & {items: string[]; bare?: boolean};
export const orbitActive = (items: OrbitItem[] | undefined, t: number) => !!activeAt(items, t);

export const Orbits: React.FC<{items?: OrbitItem[]; focus: Focus; half: "back" | "front"}> = ({items, focus, half}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const it = activeAt(items, t, 0);
  if (!it || !it.items.length) return null;
  const local = t - it.at;
  const dur = it.until - it.at;
  const n = Math.min(7, it.items.length);
  const grow = spring({frame: Math.round(local * fps), fps, config: {damping: 16, stiffness: 90}});
  const shrink = interpolate(local, [dur - 0.45, dur], [1, 0], {...clamp, easing: ease});
  const r = grow * shrink;
  const cx = focus.x;
  const cy = focus.y + 200;
  const cards = it.items.slice(0, n).map((src, i) => {
    const th = (2 * Math.PI * i) / n + local * 0.85 - Math.PI / 2;
    const depth = Math.sin(th);
    return {src, i, th, depth};
  });
  return (
    <AbsoluteFill>
      {cards
        .filter((c) => (half === "front" ? c.depth >= 0 : c.depth < 0))
        .sort((a, b) => a.depth - b.depth)
        .map((c) => {
          const x = cx + 470 * r * Math.cos(c.th);
          const y = cy + 140 * r * c.depth - 40 * Math.cos(c.th);
          const s = (0.72 + 0.3 * c.depth) * (0.4 + 0.6 * r);
          if (it.bare)
            return (
              <div key={c.i} style={{position: "absolute", left: x - 150, top: y - 190, width: 300, height: 380, perspective: 900, opacity: Math.min(1, r * 2)}}>
                <Img
                  src={staticFile(c.src)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    scale: String(s),
                    transform: `rotateY(${Math.sin(local * 1.6 + c.i * 1.3) * 32 - Math.cos(c.th) * 20}deg) rotateZ(${Math.sin(local * 1.1 + c.i) * 7}deg)`,
                    filter: `drop-shadow(0 22px 26px rgba(0,0,0,0.45))${c.depth < 0 ? ` brightness(${0.78 + 0.22 * (1 + c.depth)})` : ""}`,
                  }}
                />
              </div>
            );
          return (
            <div key={c.i} style={{position: "absolute", left: x - 115, top: y - 205, width: 230, height: 410, perspective: 900, opacity: Math.min(1, r * 2) * (half === "back" ? 0.92 : 1)}}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: B.square ? 0 : 26,
                  overflow: "hidden",
                  border: `5px solid ${B.id === "od" ? "#191922" : "#FFF"}`,
                  boxShadow: B.square ? "8px 8px 0 #191922" : "0 24px 50px rgba(0,0,0,0.42)",
                  background: "#111",
                  scale: String(s),
                  transform: `rotateY(${-Math.cos(c.th) * 38}deg)`,
                  filter: c.depth < 0 ? `brightness(${0.75 + 0.25 * (1 + c.depth)})` : undefined,
                }}
              >
                <Media src={c.src} />
              </div>
            </div>
          );
        })}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ сверху панель, снизу спикер карточкой
export const PANEL_CARD_TOP = 960;
const PanelSplit: React.FC<{it: Span; video: string; focus: Focus; grade?: string; stories: boolean; children: (box: {top: number; height: number}, t: number) => React.ReactNode}> = ({it, video, focus, grade, stories, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const a = Math.min(interpolate(t, [0, 0.3], [0, 1], clamp), interpolate(t, [dur - 0.3, dur], [1, 0], clamp));
  const k = spring({frame, fps, config: {damping: 17, stiffness: 130}});
  const outK = interpolate(t, [dur - 0.35, dur], [0, 1], {...clamp, easing: ease});
  const top = 250 + (stories ? 130 : 0);
  const cardTop = PANEL_CARD_TOP + (stories ? 40 : 0);
  return (
    <AbsoluteFill style={{opacity: a}}>
      <AbsoluteFill style={{background: B.id === "od" ? "#17171C" : "#141416"}} />
      <div style={{position: "absolute", left: 0, right: 0, top, height: cardTop - top - 30, translate: `0px ${(1 - k) * -60}px`}}>{children({top, height: cardTop - top - 30}, t)}</div>
      <div
        style={{
          position: "absolute",
          left: 40,
          width: 1000,
          top: cardTop + (1 - k) * 700 + outK * 700,
          height: 1920 - cardTop + 40,
          overflow: "hidden",
          borderRadius: B.square ? 0 : 46,
          border: B.square ? "4px solid #191922" : undefined,
          boxShadow: "0 -10px 50px rgba(0,0,0,0.5)",
          background: "#111",
        }}
      >
        <FaceCrop video={video} trim={Math.round(it.at * fps)} focus={focus} w={1000} h={1920 - cardTop + 40} k={1.12} eye={0.27} filter={grade} />
      </div>
    </AbsoluteFill>
  );
};

const PanelTitle: React.FC<{text: string; t: number}> = ({text, t}) => {
  const B = useBrand();
  const k = interpolate(t, [0.1, 0.45], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{textAlign: "center", color: "#FFF", fontFamily: B.bodyFont, fontWeight: 800, fontSize: 58, lineHeight: 1.12, opacity: k, translate: `0px ${(1 - k) * 20}px`}}>
      {linesOf(text).map((row, i) => (
        <div key={i}>
          {marked(row).map(([s, a], j) =>
            a ? (
              <span key={j} style={{fontFamily: playfair.fontFamily, fontStyle: "italic", fontWeight: 700, color: B.id === "aura" ? "#FFE74A" : B.accent, borderBottom: `4px solid ${B.id === "aura" ? "#FFE74A" : B.accent}`}}>
                {s}
              </span>
            ) : (
              <span key={j}>{s}</span>
            ),
          )}
        </div>
      ))}
    </div>
  );
};

// ------------------------------------------------------------------ график сверху
export type ChartItem = Span & {title: string; bars: {label: string; value: number; hi?: boolean}[]; avg?: number; color?: string};

const ChartBody: React.FC<{it: ChartItem; t: number; height: number}> = ({it, t, height}) => {
  const B = useBrand();
  const {fps} = useVideoConfig();
  const bars = it.bars.slice(0, 8);
  const max = Math.max(1, ...bars.map((b) => b.value), it.avg ?? 0);
  const step = max <= 5 ? 1 : max <= 20 ? 5 : max <= 50 ? 10 : max <= 200 ? 50 : Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const H = Math.max(200, height - 230);
  const X0 = 110;
  const X1 = 1020;
  const hi = it.color ?? "#FFD23F";
  const bw = (X1 - X0) / bars.length;
  const yOf = (v: number) => H - (v / top) * H;
  const ticks = Array.from({length: Math.round(top / step) + 1}, (_, i) => i * step);
  return (
    <div style={{position: "absolute", left: 0, right: 0, top: 160, height: H + 60}}>
      {ticks.map((v) => (
        <div key={v} style={{position: "absolute", left: X0 - 60, right: 60, top: yOf(v), display: "flex", alignItems: "center", gap: 14}}>
          <span style={{width: 44, textAlign: "right", fontFamily: B.monoFont, fontSize: 20, color: "rgba(255,255,255,0.5)"}}>{v}</span>
          <span style={{flex: 1, height: 1, background: "rgba(255,255,255,0.12)"}} />
        </div>
      ))}
      {bars.map((b, i) => {
        const k = spring({frame: Math.round((t - 0.3 - i * 0.08) * fps), fps, config: {damping: 15, stiffness: 120}});
        const h = (b.value / top) * H * k;
        const isHi = b.hi ?? i === 0;
        return (
          <div key={i} style={{position: "absolute", left: X0 + bw * i + bw * 0.16, width: bw * 0.68, top: 0, height: H + 50}}>
            <div style={{position: "absolute", left: 0, right: 0, top: H - h - 48, textAlign: "center", fontFamily: B.bodyFont, fontWeight: 800, fontSize: 38, color: "#FFF", opacity: k}}>{Math.round(b.value * Math.min(1, k))}</div>
            <div style={{position: "absolute", left: 0, right: 0, top: H - h, height: h, background: isHi ? hi : B.id === "aura" ? "#8A8A8A" : B.accent, borderRadius: B.square ? 0 : "6px 6px 0 0", boxShadow: isHi ? `0 0 30px ${hi}88` : undefined}} />
            <div style={{position: "absolute", left: -20, right: -20, top: H + 12, textAlign: "center", fontFamily: B.bodyFont, fontWeight: 600, fontSize: 25, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap"}}>{b.label}</div>
          </div>
        );
      })}
      {it.avg !== undefined ? (
        <div style={{position: "absolute", left: X0, right: 60, top: yOf(it.avg), borderTop: `3px dashed ${RED}`, opacity: interpolate(t, [0.9, 1.2], [0, 1], clamp)}}>
          <span style={{position: "absolute", right: 0, top: -34, fontFamily: B.monoFont, fontSize: 22, color: RED}}>в среднем {it.avg}</span>
        </div>
      ) : null}
    </div>
  );
};

export const Charts: React.FC<{items?: ChartItem[]; video: string; focus: Focus; grade?: string; stories: boolean}> = ({items, video, focus, grade, stories}) => (
  <Seqs
    items={items}
    name="График сверху"
    render={(it) => (
      <PanelSplit it={it} video={video} focus={focus} grade={grade} stories={stories}>
        {(box, t) => (
          <>
            <PanelTitle text={it.title} t={t} />
            <ChartBody it={it} t={t} height={box.height} />
          </>
        )}
      </PanelSplit>
    )}
  />
);

// ------------------------------------------------------------------ монтажный стол сверху
export type TimelineItem = Span & {title: string; rows?: {label: string; value: string}[]; clips?: string[]; grades?: string[]; progress?: number; label?: string};

const TimelineBody: React.FC<{it: TimelineItem; t: number; video: string; focus: Focus; height: number}> = ({it, t, video, focus, height}) => {
  const B = useBrand();
  const {fps} = useVideoConfig();
  const [g1, g2] = panelBg(B);
  const dur = it.until - it.at;
  const prog = it.progress ?? 97;
  const run = interpolate(t, [0.3, Math.max(0.6, dur - 0.5)], [0, 1], clamp);
  const trim = Math.round(it.at * fps);
  const rows = (it.rows ?? []).slice(0, 5);
  const clips = (it.clips ?? []).slice(0, 3);
  const grades = (it.grades ?? ["тёплый", "лицо +"]).slice(0, 2);
  const mono: React.CSSProperties = {fontFamily: B.monoFont, fontSize: 17, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em"};
  const track = (label: string, y: number, body: React.ReactNode) => (
    <div style={{position: "absolute", left: 22, right: 22, top: y, height: 46, display: "flex", alignItems: "center", gap: 12}}>
      <span style={{...mono, width: 110}}>{label}</span>
      <div style={{flex: 1, height: "100%", position: "relative", display: "flex", alignItems: "center", gap: 8}}>{body}</div>
    </div>
  );
  const H = Math.min(height - 120, 560);
  const tracksTop = H - 268;
  return (
    <div style={{position: "absolute", left: 50, right: 50, top: 112, height: H, borderRadius: B.square ? 0 : 26, background: `linear-gradient(160deg, ${g1}, ${g2})`, border: "1.5px solid rgba(255,255,255,0.14)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", overflow: "hidden", color: "#FFF"}}>
      <div style={{position: "absolute", left: 22, right: 22, top: 16, display: "flex", alignItems: "center", gap: 8}}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <span key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />
        ))}
        <span style={{...mono, marginLeft: 12}}>{(it.label ?? "Монтажная · рендер").toUpperCase()}</span>
        <span style={{...mono, marginLeft: "auto"}}>4K · 30FPS</span>
      </div>
      <div style={{position: "absolute", left: 22, top: 56, width: 120, height: tracksTop - 72, borderRadius: B.square ? 0 : 12, overflow: "hidden"}}>
        <FaceCrop video={video} trim={trim} focus={focus} w={120} h={tracksTop - 72} k={1.5} eye={0.36} />
      </div>
      <div style={{position: "absolute", left: 160, right: 22, top: 56, display: "flex", flexDirection: "column", gap: 6}}>
        {rows.map((r, i) => {
          const k = interpolate(t, [0.35 + i * 0.22, 0.55 + i * 0.22], [0, 1], clamp);
          return (
            <div key={i} style={{height: Math.min(34, (tracksTop - 80) / Math.max(1, rows.length) - 6), display: "flex", alignItems: "center", padding: "0 14px", borderRadius: B.square ? 0 : 8, background: "rgba(255,255,255,0.06)", opacity: 0.35 + 0.65 * k}}>
              <span style={mono}>{r.label}</span>
              <span style={{marginLeft: "auto", fontFamily: B.bodyFont, fontSize: 20, color: k > 0.5 ? "#FFF" : "rgba(255,255,255,0.4)"}}>{k > 0.5 ? `✓ ${r.value}` : "…"}</span>
            </div>
          );
        })}
      </div>
      {track(
        "V1 дубль",
        tracksTop,
        Array.from({length: 7}, (_, i) => (
          <div key={i} style={{flex: 1, height: 46, borderRadius: 4, overflow: "hidden", position: "relative"}}>
            <FaceCrop video={video} trim={trim} focus={focus} w={98} h={46} k={1.0} eye={0.38} />
          </div>
        )),
      )}
      {track(
        "субтитры",
        tracksTop + 56,
        clips.map((c, i) => (
          <div key={i} style={{flex: 1, height: 34, borderRadius: 6, background: B.id === "aura" ? "#FFE74A" : B.accent, color: B.id === "aura" ? "#262626" : B.accentInk, fontFamily: B.bodyFont, fontWeight: 600, fontSize: 18, display: "flex", alignItems: "center", padding: "0 10px", whiteSpace: "nowrap", overflow: "hidden", opacity: interpolate(t, [0.4 + i * 0.15, 0.6 + i * 0.15], [0, 1], clamp)}}>
            {c}
          </div>
        )),
      )}
      {track(
        "цвет",
        tracksTop + 112,
        grades.map((g, i) => (
          <div key={i} style={{flex: i ? 1 : 1.6, height: 30, borderRadius: 6, background: i ? "linear-gradient(90deg, #E8A04B, #F06A5D)" : "linear-gradient(90deg, #6B4BC4, #E0569B)", fontFamily: B.bodyFont, fontSize: 17, display: "flex", alignItems: "center", padding: "0 10px"}}>
            {g}
          </div>
        )),
      )}
      {track(
        "sfx",
        tracksTop + 168,
        <div style={{flex: 1, height: 40, display: "flex", alignItems: "center", gap: 3}}>
          {Array.from({length: 70}, (_, i) => (
            <span key={i} style={{flex: 1, height: `${18 + 78 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43))}%`, background: "rgba(255,255,255,0.75)", borderRadius: 1}} />
          ))}
        </div>,
      )}
      {/* бегунок по дорожкам */}
      <div style={{position: "absolute", top: tracksTop - 6, height: 230, left: 144 + (958 - 144) * run, width: 3, background: "#FF5FA2", boxShadow: "0 0 10px #FF5FA2"}} />
      <div style={{position: "absolute", left: 22, right: 110, bottom: 22, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.15)"}}>
        <div style={{width: `${prog * run}%`, height: "100%", borderRadius: 5, background: `linear-gradient(90deg, ${B.id === "aura" ? "#FFE74A" : B.accent}, #FF7A59)`}} />
      </div>
      <div style={{position: "absolute", right: 22, bottom: 8, fontFamily: B.bodyFont, fontWeight: 800, fontSize: 38, color: "#FF8FB8"}}>{Math.round(prog * run)}%</div>
    </div>
  );
};

export const Timelines: React.FC<{items?: TimelineItem[]; video: string; focus: Focus; grade?: string; stories: boolean}> = ({items, video, focus, grade, stories}) => (
  <Seqs
    items={items}
    name="Монтажный стол"
    render={(it) => (
      <PanelSplit it={it} video={video} focus={focus} grade={grade} stories={stories}>
        {(box, t) => (
          <>
            <PanelTitle text={it.title} t={t} />
            <TimelineBody it={it} t={t} video={video} focus={focus} height={box.height} />
          </>
        )}
      </PanelSplit>
    )}
  />
);
// панели сверху занимают место субтитров над лицом — субтитры на это время ниже, под подбородком
export const panelSplitActive = (charts: ChartItem[] | undefined, timelines: TimelineItem[] | undefined, t: number) => !!activeAt(charts, t, 0) || !!activeAt(timelines, t, 0);

// ------------------------------------------------------------------ неон и прожектор
export type NeonItem = Span & {text: string; color?: string; spot?: boolean};
export const neonActive = (items: NeonItem[] | undefined, t: number) => activeAt(items, t);

// part «spot» — прожектор (за вырезкой: фон темнеет, спикер в свете); «sign» — вывеска над головой
export const Neons: React.FC<{items?: NeonItem[]; focus: Focus; faceTop?: number; part: "spot" | "sign"; stories?: boolean}> = ({items, focus, faceTop, part, stories}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const it = neonActive(items, t);
  if (!it) return null;
  const a = amountAt(t, it.at, it.until, 0.3, 0.35);
  const local = t - it.at;
  if (part === "spot") {
    if (it.spot === false) return null;
    return (
      <AbsoluteFill style={{opacity: a}}>
        <AbsoluteFill style={{background: `radial-gradient(ellipse 44% 38% at ${focus.x}px ${focus.y + 240}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 58%, rgba(0,0,0,0.86) 100%)`}} />
        <AbsoluteFill style={{mixBlendMode: "screen", background: `radial-gradient(circle 380px at ${focus.x}px ${focus.y - 40}px, rgba(255,150,90,0.5), rgba(255,150,90,0) 70%)`}} />
      </AbsoluteFill>
    );
  }
  const c = it.color ?? glowOf(B);
  // включение с миганием, потом лёгкое дрожание
  const flick = interpolate(local, [0, 0.07, 0.12, 0.2, 0.26, 0.36, 0.42], [0, 1, 0.15, 1, 0.45, 0.5, 1], clamp);
  const hum = 0.94 + 0.06 * Math.sin(local * 37) * Math.sin(local * 5.3);
  const size = Math.min(150, Math.round(1700 / Math.max(4, it.text.length)));
  const head = faceTop ?? focus.y - 230;
  const top = Math.max(270 + (stories ? 130 : 0), head - 120 - size);
  const cx = Math.max(330, Math.min(750, focus.x));
  return (
    <div style={{position: "absolute", left: cx - 540, width: 1080, top, textAlign: "center", opacity: a * flick * hum}}>
      <span
        style={{
          fontFamily: playfair.fontFamily,
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: size,
          letterSpacing: "0.02em",
          color: "#FFF1EE",
          textShadow: `0 0 4px #FFF, 0 0 14px ${c}, 0 0 30px ${c}, 0 0 60px ${c}, 0 0 110px ${c}`,
          textTransform: "uppercase",
        }}
      >
        {it.text}
      </span>
    </div>
  );
};

// ------------------------------------------------------------------ команда в чате → ролик раскрывается на весь кадр
export type PromptItem = Span & {text: string; reply?: string; hint?: string};
export const promptActive = (items: PromptItem[] | undefined, t: number) => !!activeAt(items, t, 0);

const KB_EN = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const KB_RU = ["йцукенгшщзхъ", "фывапролджэ", "ячсмитьбю"];

const Keyboard: React.FC<{active: string; ru: boolean}> = ({active, ru}) => {
  const B = useBrand();
  const rows = ru ? KB_RU : KB_EN;
  const keyW = ru ? 80 : 98;
  const key = (ch: string, w = keyW, label = ch) => {
    const on = active === ch;
    return (
      <div key={label + w} style={{position: "relative", width: w, height: 104, borderRadius: 10, background: on ? "#6A6A70" : "#4A4A4E", color: "#FFF", fontFamily: B.bodyFont, fontSize: label.length > 1 ? 30 : 44, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 0 rgba(0,0,0,0.45)"}}>
        {label}
        {on && label.length === 1 ? (
          <div style={{position: "absolute", left: -10, right: -10, bottom: 70, height: 140, borderRadius: 14, background: "#6A6A70", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 14, fontSize: 64, boxShadow: "0 8px 20px rgba(0,0,0,0.4)"}}>{label}</div>
        ) : null}
      </div>
    );
  };
  return (
    <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 620, background: "#2C2C2E", padding: "40px 8px 0", display: "flex", flexDirection: "column", gap: 22, alignItems: "center"}}>
      {rows.map((r, i) => (
        <div key={i} style={{display: "flex", gap: 8}}>
          {i === 2 ? key("⇧", 120) : null}
          {r.split("").map((ch) => key(ch))}
          {i === 2 ? key("⌫", 120) : null}
        </div>
      ))}
      <div style={{display: "flex", gap: 8}}>
        {key("123", 150)}
        {key(" ", 560, ru ? "пробел" : "space")}
        {key("/", 150)}
      </div>
    </div>
  );
};

const PromptOne: React.FC<{it: PromptItem; video: string; focus: Focus; grade?: string}> = ({it, video, grade}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const t = frame / fps;
  const dur = it.until - it.at;
  const text = it.text;
  const ru = /[а-яё]/i.test(text);
  const typeFrom = 0.3;
  const typeEnd = Math.min(dur * 0.42, typeFrom + 0.06 * text.length);
  const shown = Math.floor(interpolate(t, [typeFrom, typeEnd], [0, text.length], clamp));
  const sentAt = typeEnd + 0.15;
  const sent = t >= sentAt;
  const ch = !sent && shown > 0 && t < typeEnd + 0.05 ? text[shown - 1].toLowerCase() : "";
  const kbDown = interpolate(t, [sentAt, sentAt + 0.3], [0, 700], {...clamp, easing: ease});
  const replyAt = sentAt + 0.25;
  const reply = it.reply ?? "Монтирую…";
  const replyShown = Math.floor(interpolate(t, [replyAt, replyAt + 0.025 * reply.length + 0.1], [0, reply.length], clamp));
  const cardIn = spring({frame: frame - Math.round((replyAt + 0.2) * fps), fps, config: {damping: 15, stiffness: 150}});
  const exp = interpolate(t, [dur - 0.55, dur], [0, 1], {...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1)});
  const enter = interpolate(t, [0, 0.25], [0, 1], {...clamp, easing: ease});
  const accent = B.id === "aura" ? "#262626" : B.id === "od" ? "#FF4A1F" : "#D97757";
  // карточка ролика в ответе → весь кадр
  const c0 = {x: 150, y: 820, w: 380, h: 676};
  const cx = interpolate(exp, [0, 1], [c0.x, 0]);
  const cy = interpolate(exp, [0, 1], [c0.y, 0]);
  const cw = interpolate(exp, [0, 1], [c0.w, 1080]);
  const ch2 = interpolate(exp, [0, 1], [c0.h, 1920]);
  const ui = 1 - exp;
  return (
    <AbsoluteFill style={{translate: `0px ${(1 - enter) * 300}px`, opacity: enter}}>
      <AbsoluteFill style={{background: "#262624", opacity: ui}} />
      <div style={{opacity: ui}}>
        {/* шапка: меню, переключатель «Чат · Монтаж», новая заметка */}
        <div style={{position: "absolute", left: 50, right: 50, top: 110, display: "flex", alignItems: "center"}}>
          <div style={{width: 76, height: 76, borderRadius: 38, background: "#3A3A38", color: "#DDD", fontSize: 36, display: "flex", alignItems: "center", justifyContent: "center"}}>≡</div>
          <div style={{margin: "0 auto", display: "flex", background: "#3A3A38", borderRadius: 40, padding: 6, fontFamily: B.bodyFont, fontSize: 34}}>
            <span style={{padding: "12px 34px", color: "#9A9A96"}}>Чат</span>
            <span style={{padding: "12px 34px", color: "#FFF", background: "#52524E", borderRadius: 34}}>Монтаж</span>
          </div>
          <div style={{width: 76, height: 76, borderRadius: 38, background: "#3A3A38", color: "#DDD", fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center"}}>✎</div>
        </div>
        {/* подсказка команды, пока печатается */}
        {!sent && it.hint ? (
          <div style={{position: "absolute", left: 40, right: 40, top: 640, padding: "26px 34px", borderRadius: 30, background: "#30302E", opacity: interpolate(t, [typeFrom, typeFrom + 0.2], [0, 1], clamp)}}>
            <div style={{fontFamily: B.bodyFont, fontWeight: 600, fontSize: 40, color: "#FFF"}}>{text.split(/\s/)[0]}</div>
            <div style={{fontFamily: B.bodyFont, fontSize: 28, color: "#9A9A96", marginTop: 4}}>{it.hint}</div>
          </div>
        ) : null}
        {/* отправленное сообщение и ответ */}
        {sent ? (
          <>
            <div style={{position: "absolute", right: 40, top: 300 + (1 - Math.min(1, (t - sentAt) / 0.25)) * 500, maxWidth: 760, padding: "22px 32px", borderRadius: 34, background: "#3A3A38", color: "#FFF", fontFamily: B.bodyFont, fontSize: 40}}>{text}</div>
            <div style={{position: "absolute", left: 50, top: 450, right: 60, display: "flex", gap: 18, alignItems: "flex-start", opacity: t >= replyAt ? 1 : 0}}>
              <svg width={52} height={52} viewBox="0 0 100 100" style={{flexShrink: 0, rotate: `${(t - replyAt) * 90}deg`}}>
                <path d="M50 4 C54 34 66 46 96 50 C66 54 54 66 50 96 C46 66 34 54 4 50 C34 46 46 34 50 4 Z" fill={accent} />
              </svg>
              <div style={{fontFamily: B.bodyFont, fontSize: 40, color: "#EDEDEA", lineHeight: 1.3}}>{reply.slice(0, replyShown)}</div>
            </div>
          </>
        ) : null}
        {/* строка ввода с прикреплённым кадром */}
        <div style={{position: "absolute", left: 30, right: 30, top: 1010 + kbDown * 0.85, height: 270, borderRadius: 34, background: "#30302E", padding: "22px 28px"}}>
          <div style={{width: 92, height: 116, borderRadius: 14, overflow: "hidden", position: "relative", opacity: sent ? 0 : 1}}>
            <SpeakerVideo src={video} trimBefore={Math.round(it.at * fps)} style={{position: "absolute", width: 92 * 1.6, height: (92 * 1.6 * 1920) / 1080, left: -27, top: -40, maxWidth: "none", objectFit: "cover"}} />
          </div>
          <div style={{position: "absolute", left: 140, top: 52, right: 30, fontFamily: B.bodyFont, fontSize: 42, color: "#FFF"}}>
            {sent ? "" : text.slice(0, shown)}
            {!sent && Math.floor(t * 2.5) % 2 === 0 ? <span style={{color: accent}}>|</span> : null}
          </div>
          <div style={{position: "absolute", left: 30, bottom: 20, color: "#9A9A96", fontSize: 40}}>+</div>
          <div style={{position: "absolute", right: 24, bottom: 18, width: 70, height: 70, borderRadius: B.square ? 0 : 18, background: accent, color: "#FFF", fontSize: 40, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", scale: String(interpolate(t, [sentAt - 0.08, sentAt, sentAt + 0.12], [1, 0.82, 1], clamp))}}>↑</div>
        </div>
        <AbsoluteFill style={{translate: `0px ${kbDown}px`}}>
          <Keyboard active={ch === " " ? " " : ch} ru={ru} />
        </AbsoluteFill>
      </div>
      {/* карточка с роликом: появляется в ответе и раскрывается на весь кадр */}
      {t >= replyAt + 0.2 ? (
        <div style={{position: "absolute", left: cx, top: cy, width: cw, height: ch2, borderRadius: 28 * ui, overflow: "hidden", scale: String(0.6 + 0.4 * Math.min(1, cardIn)), opacity: Math.min(1, cardIn * 1.5), boxShadow: ui > 0.05 ? "0 24px 60px rgba(0,0,0,0.5)" : undefined, border: ui > 0.05 ? "2px solid #3A3A38" : undefined}}>
          <SpeakerVideo src={video} trimBefore={Math.round(it.at * fps)} style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: grade}} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Prompts: React.FC<{items?: PromptItem[]; video: string; focus: Focus; grade?: string}> = ({items, video, focus, grade}) => (
  <Seqs items={items} name="Команда в чате" render={(it) => <PromptOne it={it} video={video} focus={focus} grade={grade} />} />
);

// ------------------------------------------------------------------ @ник в углу весь ролик
export type Watermark = {handle: string; network?: "instagram" | "telegram" | "site"; from?: number; until?: number};

export const WatermarkCorner: React.FC<{wm?: Watermark; stories: boolean; hidden?: boolean}> = ({wm, stories, hidden}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (!wm || hidden || t < (wm.from ?? 0) || t > (wm.until ?? Infinity)) return null;
  const a = interpolate(t, [wm.from ?? 0, (wm.from ?? 0) + 0.4], [0, 0.95], clamp);
  const handle = wm.network === "site" || wm.handle.startsWith("@") ? wm.handle : `@${wm.handle}`;
  return (
    <div style={{position: "absolute", right: 44, top: 290 + (stories ? 130 : 0), display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, opacity: a, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55))"}}>
      <NetIcon net={wm.network} size={72} color={0} />
      <div style={{fontFamily: oswald.fontFamily, fontWeight: 500, fontSize: 30, letterSpacing: "0.03em", color: "#FFF", textTransform: "uppercase"}}>{handle}</div>
    </div>
  );
};
