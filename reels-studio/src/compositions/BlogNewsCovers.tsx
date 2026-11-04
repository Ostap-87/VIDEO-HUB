// Обложки выпусков «多 NEWS» (04.11.2026: «круто, а где для этих роликов обложки? креативные»).
// Три раскладки на выбор, одна серия — чтобы в сетке профиля выпуски узнавались подряд:
//   journal — обложка еженедельного журнала манги: шапка 多 NEWS, номер выпуска, картинка во весь низ, заголовок на жёлтой плашке,
//             «анонсы» цифрами во взрывах, штрихкод с адресом блога;
//   shout   — как хук ролика: чернила, линии концентрации, три слова ударами, облачко-крик, иероглиф-звук, цифра во взрыве;
//   page    — страница манги: заголовок на чернильной полосе, три панели с картинками актов, подписи рассказчика, цифра во взрыве.
// Кадр N = выпуск floor(N / 3) × раскладка N % 3. Важное — в зоне сетки профиля 3:4 (y 240–1680), по бокам ≥ 50 px.
// Тексты и цифры — из props выпуска (поле coverArt — самый сильный факт статьи и картинки для обложки).
import React from "react";
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from "remotion";
import {useBrush, BRUSH} from "../components/MontazhFx";
import {FONT} from "./site-manhua/fonts";
import {ActionLines, Bubble, Burst, C, Grain, Halftone, Panel, Sfx, SpeedLines, Vignette} from "./site-manhua/fx";
import type {BlogNewsProps} from "./BlogNews";
import ep1 from "../../props/blog-news/001-coffee-with-hint-audit.json";
import ep2 from "../../props/blog-news/002-teacher-who-went-into-retail.json";
import ep3 from "../../props/blog-news/003-this-is-my-last-startup-season-six.json";

export type BNCoverArt = {
  hero: string; heroPos?: string; // главная картинка (журнал, страница)
  alt?: string; altPos?: string; // картинка для «крика»
  big: string; bigText: string; // самая сильная цифра статьи
  blurbs?: {big: string; text: string}[]; // ещё две цифры-«анонса»
  tag?: string; // подзаголовок одной строкой
};
type Ep = BlogNewsProps & {coverArt?: BNCoverArt};
export const BN_COVER_EPS = [ep1, ep2, ep3] as unknown as Ep[];
export const BN_COVER_LAYOUTS = ["journal", "shout", "page"] as const;

const dela = (size: number, color: string = C.ink, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: FONT.dela, fontSize: size, color, lineHeight: 1.02, ...extra});
const abs = (x: number, y: number, s: React.CSSProperties = {}): React.CSSProperties => ({position: "absolute", left: x, top: y, ...s});
const fit = (t: string, max: number, w: number, em = 0.78) => Math.min(max, Math.floor(w / (Math.max(1, t.length) * em)));
const AT = -120; // все появления уже закончились: обложка — стоп-кадр

const art = (P: Ep): BNCoverArt => P.coverArt ?? {
  hero: (P.beats.find((b) => "img" in b && b.img) as {img: string} | undefined)?.img ?? P.cover,
  big: (P.beats[0] as {big?: {num?: number; suf?: string}}).big?.num !== undefined ? `${(P.beats[0] as {big: {num: number; suf?: string}}).big.num}${(P.beats[0] as {big: {suf?: string}}).big.suf ?? ""}` : "多",
  bigText: P.title,
};

const Seal: React.FC<{x: number; y: number; s: number; rot?: number}> = ({x, y, s, rot = -6}) => (
  <div style={abs(x, y, {width: s, height: s, background: C.seal, borderRadius: s * 0.08, boxShadow: `0 0 0 ${s * 0.04}px #fff, ${s * 0.06}px ${s * 0.06}px 0 ${s * 0.04}px ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", rotate: `${rot}deg`})}>
    <span style={{fontFamily: BRUSH, fontSize: s * 0.84, color: "#fff", lineHeight: 1}}>多</span>
  </div>
);

const Brand: React.FC<{P: Ep; x: number; y: number; scale?: number; rot?: number}> = ({P, x, y, scale = 1, rot = -3}) => (P.brand ? (
  <div style={abs(x, y, {display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `5px solid ${C.ink}`, borderRadius: 16, padding: "8px 20px", boxShadow: `8px 8px 0 ${C.ink}`, rotate: `${rot}deg`, scale: String(scale), transformOrigin: "0 50%"})}>
    {P.brand.logo ? <div style={{height: 60, overflow: "hidden", width: P.brand.icon ? 60 * P.brand.icon * 3.64 : "auto"}}><Img src={staticFile(P.brand.logo)} style={{height: 60, width: "auto", display: "block"}} /></div> : null}
    <div>
      <div style={dela(38, C.ink, {whiteSpace: "nowrap"})}>{P.brand.name}</div>
      {P.brand.zh ? <div style={{fontFamily: FONT.zcool, fontSize: 32, color: C.red, lineHeight: 1.1}}>{P.brand.zh}</div> : null}
    </div>
  </div>
) : null);

const BigBurst: React.FC<{x: number; y: number; r: number; big: string; text: string; color?: string; ink?: string; rot?: number; seed: string}> = ({x, y, r, big, text, color = C.y, ink = C.ink, rot = -6, seed}) => (
  <>
    <Burst x={x} y={y} r={r} color={color} stroke={C.ink} rot={rot * 3} seed={seed} />
    <div style={abs(x - r, y - r * 0.42, {width: r * 2, textAlign: "center", rotate: `${rot}deg`})}>
      <div style={dela(fit(big, r * 0.5, r * 1.4, 0.86), ink, {whiteSpace: "nowrap"})}>{big}</div>
      <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: Math.round(r * 0.15), lineHeight: 1.1, color: ink, marginTop: 6, padding: `0 ${r * 0.3}px`}}>{text}</div>
    </div>
  </>
);

const Barcode: React.FC<{x: number; y: number}> = ({x, y}) => (
  <div style={abs(x, y, {background: "#fff", border: `4px solid ${C.ink}`, padding: "10px 12px", rotate: "3deg"})}>
    <div style={{width: 230, height: 66, background: `repeating-linear-gradient(90deg, ${C.ink} 0 5px, transparent 5px 9px, ${C.ink} 9px 11px, transparent 11px 16px, ${C.ink} 16px 20px, transparent 20px 23px)`}} />
    <div style={{fontFamily: FONT.mono, fontSize: 20, color: C.ink, marginTop: 6, textAlign: "center"}}>ostapdotcenko.ru/blog</div>
  </div>
);

// ── A. журнал манги ───────────────────────────────────────────────────────────────────────────────────────────────────
const Journal: React.FC<{P: Ep}> = ({P}) => {
  const a = art(P);
  const clip = "polygon(0 560px, 1080px 505px, 1080px 1920px, 0 1920px)";
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Halftone bg={C.paper} dot="rgba(232,52,28,.12)" />
      <AbsoluteFill style={{clipPath: clip, background: "#000"}}>
        <Img src={staticFile(a.hero)} style={{position: "absolute", left: 0, top: 480, width: 1080, height: 1440, objectFit: "cover", objectPosition: a.heroPos ?? "50% 40%"}} />
        <SpeedLines color="rgba(255,255,255,.5)" cx={540} cy={1060} inner={520} opacity={0.55} seed={`j${P.ep}`} />
      </AbsoluteFill>
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0}}><polyline points="0,560 1080,505" fill="none" stroke={C.ink} strokeWidth={12} /></svg>
      {/* шапка */}
      <div style={abs(52, 252, {fontFamily: FONT.mono, fontSize: 25, color: C.ink, letterSpacing: "0.04em"})}>{`ВЫПУСК №${P.ep} · 第${P.ep}话 · СЕЗОН «${P.season.name.toUpperCase()}» ${P.season.n}/${P.season.total}`}</div>
      <Seal x={52} y={292} s={176} rot={-7} />
      <div style={abs(256, 280, dela(206, C.ink, {letterSpacing: "0.01em", textShadow: `8px 8px 0 ${C.red}`, lineHeight: 1}))}>NEWS</div>
      <div style={abs(262, 476, {fontFamily: FONT.golos, fontWeight: 800, fontSize: 25, color: C.ink})}>манхуа-новости по статьям блога</div>
      {/* иероглиф-звук и главная цифра */}
      <BigBurst x={850} y={760} r={176} big={a.big} text={a.bigText} seed={`jb${P.ep}`} rot={-5} />
      {P.hook.sfx ? <Sfx text={P.hook.sfx} x={70} y={640} size={150} color={C.red} stroke="#fff" rot={-10} at={AT} font={BRUSH} /> : null}
      {/* заголовок */}
      <div style={abs(50, 1150, {width: 980, background: C.y, border: `7px solid ${C.ink}`, boxShadow: `14px 14px 0 ${C.ink}`, padding: "20px 28px", rotate: "-2deg"})}>
        {a.tag ? <div style={{fontFamily: FONT.oswald, fontSize: 34, letterSpacing: "0.08em", color: C.red}}>{a.tag.toUpperCase()}</div> : null}
        <div style={dela(P.title.length > 28 ? 64 : 78, C.ink, {marginTop: 4})}>{P.title}</div>
      </div>
      {/* анонсы */}
      {(a.blurbs ?? []).slice(0, 2).map((b, i) => (
        <div key={i} style={abs(i ? 560 : 52, 1430, {width: 300, background: i ? "#fff" : C.ink, color: i ? C.ink : "#fff", border: `5px solid ${C.ink}`, boxShadow: `8px 8px 0 ${i ? C.red : C.y}`, padding: "12px 18px", rotate: `${i ? 2 : -2}deg`})}>
          <div style={dela(fit(b.big, 50, 260, 0.7), i ? C.red : C.y, {whiteSpace: "nowrap"})}>{b.big}</div>
          <div style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 25, lineHeight: 1.15, marginTop: 4}}>{b.text}</div>
        </div>
      ))}
      <Brand P={P} x={600} y={1012} scale={0.8} rot={3} />
      <Barcode x={790} y={1546} />
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};

// ── B. крик (как хук ролика) ──────────────────────────────────────────────────────────────────────────────────────────
const Shout: React.FC<{P: Ep}> = ({P}) => {
  const a = art(P);
  const cols = ["#fff", C.red, C.y];
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <SpeedLines color="#fff" opacity={0.16} cx={540} cy={640} inner={430} seed={`s${P.ep}`} />
      <ActionLines color="#fff" opacity={0.06} angle={-14} seed={`sa${P.ep}`} />
      <Seal x={56} y={250} s={96} rot={-6} />
      <div style={abs(172, 262, dela(66, "#fff", {letterSpacing: "0.02em"}))}>{`NEWS №${P.ep}`}</div>
      <div style={abs(170, 336, {fontFamily: FONT.golos, fontWeight: 800, fontSize: 26, color: C.y})}>{`сезон «${P.season.name}» · ${P.season.n}/${P.season.total}`}</div>
      <Panel x={60} y={400} w={960} h={560} at={AT} rot={-2} bg="#000">
        <Img src={staticFile(a.alt ?? a.hero)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: a.altPos ?? "50% 40%"}} />
      </Panel>
      <Bubble x={500} y={372} w={520} h={240} shout tail={[200, 360]} rot={3}>
        {P.hook.shout.map((t, i) => <div key={i} style={dela(i ? 52 : 40, i ? C.red : C.ink, {whiteSpace: "nowrap"})}>{t}</div>)}
      </Bubble>
      {P.hook.lines.map((t, i) => (
        <div key={i} style={abs(60, 1000 + i * 140, {...dela(Math.min(132, Math.floor(950 / (t.length * 0.92))), cols[i % 3]), textShadow: `9px 9px 0 ${i === 0 ? C.red : "#000"}`})}>{t}</div>
      ))}
      {P.hook.sfx ? <Sfx text={P.hook.sfx} x={80} y={800} size={170} color={C.red} stroke="#fff" rot={-12} at={AT} font={BRUSH} /> : null}
      <Brand P={P} x={60} y={1470} rot={-3} />
      <BigBurst x={850} y={1545} r={130} big={a.big} text={a.bigText} seed={`sb${P.ep}`} rot={6} />
      <Grain opacity={0.12} />
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};

// ── C. страница манги ────────────────────────────────────────────────────────────────────────────────────────────────
const Page: React.FC<{P: Ep}> = ({P}) => {
  const a = art(P);
  const imgs = P.beats.map((b) => ("img" in b ? b : null)).filter(Boolean) as {img: string; imgPos?: string; title: string; zh: string}[];
  const side = imgs.filter((b) => b.img !== a.hero);
  const s1 = side[0], s2 = side[side.length - 1];
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Halftone bg={C.paper} dot="rgba(25,25,34,.12)" />
      <div style={abs(40, 246, {width: 1000, background: C.ink, padding: "18px 26px", boxShadow: `10px 10px 0 ${C.red}`, rotate: "-1deg"})}>
        <div style={{display: "flex", alignItems: "center", gap: 16}}>
          <span style={{fontFamily: BRUSH, fontSize: 52, color: "#fff", background: C.seal, borderRadius: 8, padding: "0 10px", lineHeight: 1.2}}>多</span>
          <span style={dela(40, "#fff")}>NEWS</span>
          <span style={{fontFamily: FONT.zcool, fontSize: 44, color: C.y}}>{`第${P.ep}话`}</span>
          <span style={{fontFamily: FONT.golos, fontWeight: 800, fontSize: 26, color: "#fff", marginLeft: "auto"}}>{`«${P.season.name}» ${P.season.n}/${P.season.total}`}</span>
        </div>
        <div style={dela(P.title.length > 28 ? 42 : 50, C.y, {marginTop: 8})}>{P.title}</div>
      </div>
      <Panel x={40} y={470} w={1000} h={600} at={AT} poly={[[0, 0], [1, 0], [1, 0.9], [0, 1]]} bg="#000">
        <Img src={staticFile(a.hero)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: a.heroPos ?? "50% 40%"}} />
      </Panel>
      {s1 ? (
        <Panel x={40} y={1068} w={500} h={520} at={AT} poly={[[0, 0.02], [1, 0], [0.92, 1], [0, 1]]} bg="#000">
          <Img src={staticFile(s1.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: s1.imgPos ?? "50% 45%"}} />
        </Panel>
      ) : null}
      {s2 ? (
        <Panel x={512} y={1012} w={528} h={576} at={AT} poly={[[0.1, 0.1], [1, 0], [1, 1], [0, 1]]} bg="#000">
          <Img src={staticFile(s2.img)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: s2.imgPos ?? "50% 45%"}} />
        </Panel>
      ) : null}
      {s1 ? <div style={abs(60, 1500, {background: "#fff", border: `4px solid ${C.ink}`, padding: "6px 14px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 28, color: C.ink, boxShadow: `5px 5px 0 ${C.ink}`})}><span style={{fontFamily: FONT.zcool, color: C.red}}>{s1.zh}</span>{` ${s1.title}`}</div> : null}
      {s2 ? <div style={abs(620, 1500, {background: C.y, border: `4px solid ${C.ink}`, padding: "6px 14px", fontFamily: FONT.golos, fontWeight: 800, fontSize: 28, color: C.ink, boxShadow: `5px 5px 0 ${C.ink}`})}><span style={{fontFamily: FONT.zcool, color: C.red}}>{s2.zh}</span>{` ${s2.title}`}</div> : null}
      <Bubble x={60} y={500} w={520} h={230} shout tail={[400, 330]} rot={-3}>
        {P.hook.lines.map((t, i) => <div key={i} style={dela(i === P.hook.lines.length - 1 ? 46 : 36, i === P.hook.lines.length - 1 ? C.red : C.ink, {whiteSpace: "nowrap"})}>{t}</div>)}
      </Bubble>
      <BigBurst x={540} y={1080} r={150} big={a.big} text={a.bigText} seed={`pb${P.ep}`} rot={-6} color={C.y} />
      <Brand P={P} x={640} y={940} scale={0.72} rot={3} />
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};

export const BlogNewsCovers: React.FC<{eps?: Ep[]; layouts?: string[]}> = ({eps = BN_COVER_EPS, layouts = [...BN_COVER_LAYOUTS]}) => {
  useBrush(true);
  const f = useCurrentFrame();
  const P = eps[Math.min(eps.length - 1, Math.floor(f / layouts.length))];
  const L = layouts[f % layouts.length];
  return L === "journal" ? <Journal P={P} /> : L === "shout" ? <Shout P={P} /> : <Page P={P} />;
};
