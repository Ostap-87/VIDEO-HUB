// «Робокитай» — карусели Instagram 1080×1350 (06.11.2026): «Карта Робокитая» (обложка-карта с 8 печатями, слайд на край, финал
// «Серия 0 → Серия 1») и «Команда Aura · 16 героев» (обложка — групповое фото AuraCast, слайд на героя, финал). Кадр N = слайд N.
// Правила каруселей: поля по бокам ≥ 72, сверху и снизу ≥ 64; заголовок обложки — в центральном квадрате (y 135–1215);
// кегль от 30 px; на каждом слайде знак, счётчик «n / N», сайт и «листай» (кроме последнего); до ~12 слов текста.
import React from "react";
import {AbsoluteFill, Freeze, Img, staticFile, useCurrentFrame} from "remotion";
import {useBrush} from "../../components/MontazhFx";
import {AuraBadge} from "../../components/AuraBadge";
import {BRUSH_CJK, INTER, MONO_CJK, Marked, Paper, RK, loadCjk} from "./kit";
import {MapLayer, MiniSeal, Portrait, scr, type View} from "./trailer";
import {CAST, CAST_ORDER, regionXY, type CarouselSlide, type Region, type RobokitaiCarouselProps} from "./trailerTypes";

const M = 72;
const Chrome: React.FC<{n: number; N: number; series: string; site: string; last: boolean}> = ({n, N, series, site, last}) => (
  <>
    <div style={{position: "absolute", left: M, top: 64, display: "flex", alignItems: "center", gap: 14, fontFamily: MONO_CJK, fontWeight: 700, fontSize: 30, letterSpacing: "0.1em", color: RK.ink}}>
      <span style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, background: RK.red, color: RK.paper, borderRadius: 8, fontFamily: BRUSH_CJK, fontSize: 34, letterSpacing: 0, rotate: "-4deg"}}>机</span>
      {series.toUpperCase()}
    </div>
    <div style={{position: "absolute", right: M, top: 64, fontFamily: MONO_CJK, fontWeight: 700, fontSize: 30, color: RK.ink, lineHeight: "46px"}}>
      {n} / {N}
    </div>
    <div style={{position: "absolute", left: M, bottom: 64, fontFamily: MONO_CJK, fontWeight: 700, fontSize: 30, color: RK.ink, lineHeight: "50px"}}>{site}</div>
    {!last ? (
      <div style={{position: "absolute", right: M, bottom: 64, display: "flex", alignItems: "center", gap: 12, height: 50, padding: "0 22px", background: RK.ink, color: RK.lemon, borderRadius: 25, fontFamily: INTER, fontWeight: 800, fontSize: 30}}>
        листай <span style={{fontSize: 34}}>→</span>
      </div>
    ) : null}
  </>
);

const Title: React.FC<{text: string; mark?: string; size: number; style?: React.CSSProperties}> = ({text, mark, size, style}) => {
  const body = mark && text.includes(mark) ? (
    <>
      {text.split(mark)[0]}
      <Marked p={1}>{mark}</Marked>
      {text.split(mark)[1]}
    </>
  ) : (
    text
  );
  return <div style={{fontFamily: INTER, fontWeight: 800, fontSize: size, letterSpacing: "-0.04em", lineHeight: 1.06, color: RK.ink, ...style}}>{body}</div>;
};

const MapCover: React.FC<{s: Extract<CarouselSlide, {kind: "mapCover"}>; regions: Region[]}> = ({s, regions}) => {
  const v: View = {mx: 500, my: 420, s: 0.9, ax: 540, ay: 720};
  return (
    <>
      <Title text={s.title} mark={s.mark} size={92} style={{position: "absolute", left: M, top: 160, width: 936}} />
      <div style={{position: "absolute", left: M, top: 272, fontFamily: BRUSH_CJK, fontSize: 64, color: RK.red, lineHeight: 1}}>{s.zh}</div>
      <MapLayer v={v} w={1080} h={1350} id="cov" />
      {regions.map((r, j) => {
        const [x, y] = scr(v, regionXY(r));
        const off = r.sealOff ?? [60, -60];
        return (
          <React.Fragment key={r.id}>
            <div style={{position: "absolute", left: x - 10, top: y - 10, width: 20, height: 20, borderRadius: 10, background: RK.lemon, boxShadow: `0 0 0 4px ${RK.ink}`}} />
            <MiniSeal ch={r.seal} size={74} x={x + off[0] * 0.75} y={y + off[1] * 0.75} rot={j % 2 ? 7 : -7} />
          </React.Fragment>
        );
      })}
      <div style={{position: "absolute", left: M, top: 1130, fontFamily: INTER, fontWeight: 700, fontSize: 44, letterSpacing: "-0.02em", color: RK.ink}}>{s.sub}</div>
    </>
  );
};

const MiniMap: React.FC<{regions: Region[]; cur: string}> = ({regions, cur}) => {
  const v: View = {mx: 500, my: 420, s: 0.25, ax: 125, ay: 105};
  return (
    <div style={{position: "absolute", right: M, top: 150, width: 250, height: 210, background: RK.paper, border: `4px solid ${RK.ink}`, borderRadius: 20, overflow: "hidden"}}>
      <MapLayer v={v} w={250} h={210} id={`mini-${cur}`} />
      {regions.map((r) => {
        const [x, y] = scr(v, regionXY(r));
        const on = r.id === cur;
        return <div key={r.id} style={{position: "absolute", left: x - (on ? 11 : 5), top: y - (on ? 11 : 5), width: on ? 22 : 10, height: on ? 22 : 10, borderRadius: 11, background: on ? RK.red : RK.ink, boxShadow: on ? `0 0 0 4px ${RK.paper}, 0 0 0 7px ${RK.red}` : "none"}} />;
      })}
    </div>
  );
};

const RegionSlide: React.FC<{s: Extract<CarouselSlide, {kind: "region"}>; regions: Region[]}> = ({s, regions}) => {
  const r = regions.find((q) => q.id === s.region)!;
  const n = r.heroes.length;
  const size = n >= 3 ? 284 : n === 2 ? 340 : 380;
  const gap = n >= 3 ? 26 : 44;
  const W = n * size + (n - 1) * gap;
  const titleSize = Math.min(54, Math.floor(936 / (r.title.length * 0.56)));
  return (
    <>
      <MiniSeal ch={r.seal} size={170} x={M + 85} y={150 + 85} rot={-6} />
      <div style={{position: "absolute", left: M + 200, top: 150, fontFamily: MONO_CJK, fontWeight: 700, fontSize: 30, letterSpacing: "0.1em", color: RK.red}}>
        КРАЙ {s.n} / {regions.length} · {r.zh}
      </div>
      <div style={{position: "absolute", left: M + 200, top: 196, fontFamily: INTER, fontWeight: 800, fontSize: r.name.length > 7 ? 76 : 88, letterSpacing: "-0.045em", lineHeight: 1.05, color: RK.ink}}>{r.name}</div>
      <MiniMap regions={regions} cur={r.id} />
      <Title text={r.title} mark={r.title} size={titleSize} style={{position: "absolute", left: M, top: 380, width: 936, whiteSpace: "nowrap"}} />
      <div style={{position: "absolute", left: M, top: 466, width: 936}}>
        <div style={{fontFamily: MONO_CJK, fontWeight: 700, fontSize: 30, letterSpacing: "0.08em", color: RK.muted}}>КТО ЗДЕСЬ ЖИВЁТ</div>
        <div style={{fontFamily: INTER, fontWeight: 700, fontSize: 44, letterSpacing: "-0.02em", lineHeight: 1.18, color: RK.ink, marginTop: 4}}>{r.who}</div>
      </div>
      {r.heroes.map((h, k) => (
        <div key={h} style={{position: "absolute", left: 540 - W / 2 + k * (size + gap), top: 640, width: size, rotate: `${[-2, 1.5, -1][k % 3]}deg`}}>
          <div style={{border: `5px solid ${RK.ink}`, borderRadius: 24, overflow: "hidden", boxShadow: `8px 8px 0 ${RK.ink}`}}>
            <Portrait id={h} w={size - 10} h={size - 10} />
          </div>
          <div style={{textAlign: "center", marginTop: 14}}>
            <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 38, color: RK.ink, background: RK.lemon, padding: "2px 14px", borderRadius: 10, boxShadow: `0 0 0 3px ${RK.ink}`}}>{CAST[h]?.name}</span>
          </div>
        </div>
      ))}
      <div style={{position: "absolute", left: M, top: 640 + size + 92, width: 936}}>
        <div style={{fontFamily: MONO_CJK, fontWeight: 700, fontSize: 30, letterSpacing: "0.08em", color: RK.muted}}>СЕРИИ</div>
        {r.episodes.map((e, k) => (
          <div key={k} style={{fontFamily: INTER, fontWeight: 600, fontSize: 36, lineHeight: 1.22, color: RK.ink, marginTop: 4}}>
            {s.doneEp && k === 0 ? <span style={{fontFamily: MONO_CJK, fontWeight: 700, fontSize: 30, color: RK.paper, background: RK.red, padding: "0 10px", borderRadius: 8, marginRight: 12}}>✓ СЕРИЯ {s.doneEp}</span> : <span style={{color: RK.red, marginRight: 12}}>●</span>}
            {e}
          </div>
        ))}
      </div>
    </>
  );
};

const TeamCover: React.FC<{s: Extract<CarouselSlide, {kind: "teamCover"}>}> = ({s}) => {
  const W = 920;
  const H = (W * 894) / 950;
  const k = W / 950;
  return (
    <>
      <Title text={s.title} mark={s.mark} size={100} style={{position: "absolute", left: M, top: 150, width: 936}} />
      <div style={{position: "absolute", left: M, top: 268, fontFamily: INTER, fontWeight: 700, fontSize: 44, letterSpacing: "-0.02em", color: RK.ink}}>{s.sub}</div>
      <div style={{position: "absolute", left: 80, top: 346, width: W, height: H, overflow: "hidden", border: `5px solid ${RK.ink}`, borderRadius: 28, boxShadow: `10px 10px 0 ${RK.ink}`, boxSizing: "border-box"}}>
        <Img src={staticFile("finished-videos/обложки/aura-персонажи/17-team.png")} style={{position: "absolute", width: 1080 * k, height: 1350 * k, left: -64 * k, top: -110 * k, maxWidth: "none"}} />
      </div>
    </>
  );
};

const HeroSlide: React.FC<{s: Extract<CarouselSlide, {kind: "hero"}>}> = ({s}) => {
  const c = CAST[s.id];
  return (
    <>
      <div style={{position: "absolute", left: M, top: 140, border: `5px solid ${RK.ink}`, borderRadius: 28, overflow: "hidden", boxShadow: `10px 10px 0 ${RK.ink}`}}>
        <Portrait id={s.id} w={926} h={640} bias={0.12} />
      </div>
      <MiniSeal ch={s.seal} size={124} x={1080 - M - 50} y={186} rot={8} />
      <div style={{position: "absolute", left: M, top: 822, display: "flex", alignItems: "baseline", gap: 24, width: 936}}>
        <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 104, letterSpacing: "-0.05em", lineHeight: 1, color: RK.ink}}>
          <Marked p={1}>{c.name}</Marked>
        </span>
        <span style={{fontFamily: MONO_CJK, fontWeight: 700, fontSize: 30, color: RK.muted}}>
          {c.en} · {c.zh}
        </span>
      </div>
      <div style={{position: "absolute", left: M, top: 952, width: 936, fontFamily: INTER, fontWeight: 700, fontSize: 40, lineHeight: 1.3, color: RK.ink}}>
        <div>
          <span style={{fontFamily: MONO_CJK, fontSize: 30, color: RK.muted, marginRight: 14}}>РОБОТ</span>
          {s.type ?? c.type}
        </div>
        <div>
          <span style={{fontFamily: MONO_CJK, fontSize: 30, color: RK.muted, marginRight: 14}}>КРАЙ</span>
          {s.home}
        </div>
      </div>
      <div style={{position: "absolute", left: M, top: 1078, width: 936, boxSizing: "border-box", padding: "14px 26px", background: RK.paper, border: `4px solid ${RK.ink}`, borderRadius: 20, fontFamily: INTER, fontWeight: 700, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1.22, color: RK.ink}}>
        <span style={{color: RK.red}}>«</span>
        {s.trait}
        <span style={{color: RK.red}}>»</span>
      </div>
    </>
  );
};

const FinalSlide: React.FC<{s: Extract<CarouselSlide, {kind: "final"}>}> = ({s}) => (
  <>
    <div style={{position: "absolute", left: M, top: 160, fontFamily: MONO_CJK, fontWeight: 700, fontSize: 30, letterSpacing: "0.12em", color: RK.red}}>{s.kicker}</div>
    <Title text={s.title} mark={s.mark} size={84} style={{position: "absolute", left: M, top: 210, width: 936}} />
    <div style={{position: "absolute", left: M, top: 440, width: 936}}>
      {s.lines.map((l, k) => (
        <div key={k} style={{fontFamily: INTER, fontWeight: 600, fontSize: 42, lineHeight: 1.25, color: RK.ink, marginTop: k ? 16 : 0, display: "flex", gap: 16}}>
          <span style={{color: RK.red}}>→</span>
          <span>{l}</span>
        </div>
      ))}
    </div>
    <div style={{position: "absolute", left: M, top: 690, display: "flex", flexWrap: "wrap", gap: 10, width: 936}}>
      {CAST_ORDER.map((id) => (
        <div key={id} style={{border: `3px solid ${RK.ink}`, borderRadius: 14, overflow: "hidden"}}>
          <Portrait id={id} w={102} h={102} />
        </div>
      ))}
    </div>
    <div style={{position: "absolute", right: M + 6, top: 940, width: 230, height: 230}}>
      <Freeze frame={60}>
        <AuraBadge size={230} />
      </Freeze>
    </div>
    <div style={{position: "absolute", left: M, top: 1150, height: 60, display: "flex", alignItems: "center", padding: "0 28px", background: RK.ink, color: RK.lemon, borderRadius: 30, fontFamily: INTER, fontWeight: 800, fontSize: 34}}>{s.cta}</div>
  </>
);

export const RobokitaiCarousel: React.FC<RobokitaiCarouselProps> = (P) => {
  useBrush(true);
  loadCjk(`机器人中国${P.regions.map((r) => r.seal + r.zh).join("")}${Object.values(CAST).map((c) => c.zh).join("")}`);
  const f = useCurrentFrame();
  const s = P.slides[Math.min(f, P.slides.length - 1)];
  const N = P.slides.length;
  const n = Math.min(f, N - 1) + 1;
  return (
    <AbsoluteFill style={{background: RK.paper, overflow: "hidden"}}>
      <Paper />
      {s.kind === "mapCover" ? <MapCover s={s} regions={P.regions} /> : null}
      {s.kind === "region" ? <RegionSlide s={s} regions={P.regions} /> : null}
      {s.kind === "teamCover" ? <TeamCover s={s} /> : null}
      {s.kind === "hero" ? <HeroSlide s={s} /> : null}
      {s.kind === "final" ? <FinalSlide s={s} /> : null}
      <Chrome n={n} N={N} series={P.series.name} site={P.site} last={n === N} />
    </AbsoluteFill>
  );
};
