// «Робокитай» v2 — драматургия серии (05.11.2026, план одобрен пользователем: «давай этот вариант попробуем»).
// Плоские детали драмы: клиент — начальник склада (плоская манхуа-иллюстрация в графите и пергаменте, вымышленный человек без
// имени; его лицо — «шкала успеха» серии: skeptic 😒 → doubt 🤨 → ok 🙂 → happy 👍, ещё tense 😟 и despair 😫), кружок-лицо
// клиента в углу `ManagerInset`, таймер дедлайна `Countdown` («до 11.11: N дней», краснеет, мигает, в финале 00:00 → зелёный),
// шкала очереди заказов `QueueMeter`, лампочка-озарение `Bulb`, «?» манхуа, луна и солнце, силуэты рабочих, телефон с SOS,
// картинка-намёк следующей серии (человек и кобот у одной линии), заставка «4 дня назад…», тонировка кадра (красная — кризис,
// тёплая лимонная — развязка, синяя — ночь).
import React from "react";
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {CL, EIO, EO, INTER, MONO, MONO_CJK, RK, p01, usePop} from "./kit";

export type Mood = "skeptic" | "doubt" | "ok" | "tense" | "despair" | "happy";
export type Arms = "crossed" | "head" | "thumb" | "phone" | "none";
const SKIN = "#F1E2CF";
const SUIT = "#34373C";

// --- лицо по настроению (координаты головы: центр 200, 190) ---
const Face: React.FC<{mood: Mood; f: number}> = ({mood, f}) => {
  const ink = RK.ink;
  const blink = f % 97 < 3;
  const eye = (cx: number) => {
    if (mood === "happy") return <path d={`M${cx - 15},196 Q${cx},178 ${cx + 15},196`} fill="none" stroke={ink} strokeWidth={7} strokeLinecap="round" />;
    if (mood === "despair")
      return (
        <path d={cx < 200 ? `M${cx - 16},182 L${cx + 12},194 L${cx - 16},206` : `M${cx + 16},182 L${cx - 12},194 L${cx + 16},206`} fill="none" stroke={ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      );
    if (mood === "skeptic")
      return (
        <g>
          <ellipse cx={cx} cy={196} rx={12} ry={blink ? 1.5 : 7} fill={ink} />
          <path d={`M${cx - 18},190 L${cx + 18},190`} stroke={ink} strokeWidth={6} strokeLinecap="round" />
        </g>
      );
    const r = mood === "tense" ? 9 : 8;
    return <ellipse cx={cx} cy={194} rx={r} ry={blink ? 1.5 : r + 2} fill={ink} />;
  };
  const brows = () => {
    switch (mood) {
      case "skeptic":
        return <path d="M138,166 L182,172 M218,172 L262,166" stroke={ink} strokeWidth={8} strokeLinecap="round" />;
      case "doubt":
        return <path d="M138,158 Q160,140 184,156 M218,170 L262,170" fill="none" stroke={ink} strokeWidth={8} strokeLinecap="round" />;
      case "tense":
        return <path d="M140,172 L182,158 M218,158 L260,172" stroke={ink} strokeWidth={8} strokeLinecap="round" />;
      case "despair":
        return <path d="M138,176 L182,160 M218,160 L262,176" stroke={ink} strokeWidth={8} strokeLinecap="round" />;
      default:
        return <path d="M140,162 Q160,152 182,160 M218,160 Q240,152 260,162" fill="none" stroke={ink} strokeWidth={7} strokeLinecap="round" />;
    }
  };
  const mouth = () => {
    switch (mood) {
      case "skeptic":
        return <path d="M176,252 L230,246" stroke={ink} strokeWidth={7} strokeLinecap="round" />;
      case "doubt":
        return <path d="M178,250 Q200,256 226,244" fill="none" stroke={ink} strokeWidth={7} strokeLinecap="round" />;
      case "ok":
        return <path d="M172,244 Q200,270 228,244" fill="none" stroke={ink} strokeWidth={7} strokeLinecap="round" />;
      case "tense":
        return <path d="M178,254 Q186,246 194,254 Q202,262 210,254 Q218,246 226,254" fill="none" stroke={ink} strokeWidth={6} strokeLinecap="round" />;
      case "despair":
        return <path d="M172,262 Q200,226 228,262 Z" fill={ink} stroke={ink} strokeWidth={5} strokeLinejoin="round" />;
      case "happy":
        return (
          <g>
            <path d="M166,238 Q200,286 234,238 Z" fill={ink} stroke={ink} strokeWidth={5} strokeLinejoin="round" />
            <path d="M178,240 L222,240 L218,250 L182,250 Z" fill="#fff" />
          </g>
        );
    }
  };
  return (
    <g>
      {brows()}
      {eye(160)}
      {eye(240)}
      <path d="M200,204 Q194,222 204,226" fill="none" stroke={ink} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
      {mouth()}
      {mood === "tense" || mood === "despair" ? (
        // капля пота
        <path d={`M300,${126 + ((f * 1.5) % 30)} C288,${150 + ((f * 1.5) % 30)} 292,${168 + ((f * 1.5) % 30)} 306,${168 + ((f * 1.5) % 30)} C320,${168 + ((f * 1.5) % 30)} 322,${150 + ((f * 1.5) % 30)} 300,${126 + ((f * 1.5) % 30)} Z`} fill="#8EC5F0" stroke={ink} strokeWidth={4} />
      ) : null}
      {mood === "skeptic" || mood === "doubt" ? null : null}
    </g>
  );
};

const Head: React.FC<{mood: Mood; f: number}> = ({mood, f}) => (
  <g stroke={RK.ink} strokeWidth={6} strokeLinejoin="round">
    <ellipse cx={104} cy={202} rx={16} ry={28} fill={SKIN} />
    <ellipse cx={296} cy={202} rx={16} ry={28} fill={SKIN} />
    <path d="M108,186 C106,110 150,82 200,82 C252,82 296,110 292,186 C292,260 254,300 200,302 C146,300 108,260 108,186 Z" fill={SKIN} />
    {/* короткая стрижка */}
    <path d="M104,190 C94,120 134,72 196,70 C258,68 304,104 298,184 C290,150 270,124 236,116 C212,128 160,130 128,122 C116,140 108,162 104,190 Z" fill={RK.ink} />
    <g stroke="none">
      <Face mood={mood} f={f} />
    </g>
  </g>
);

// начальник склада по пояс: 400 × 520 при scale 1; x, y — левый верх
export const Manager: React.FC<{x: number; y: number; scale?: number; mood: Mood; arms?: Arms; flip?: boolean; at?: number; from?: "left" | "right" | "bottom"}> = ({x, y, scale = 1, mood, arms = "none", flip, at = 0, from = "bottom"}) => {
  const f = useCurrentFrame();
  const s = usePop(at, 14);
  if (s <= 0) return null;
  const bob = Math.sin(f / 10) * 3;
  const shake = mood === "despair" ? Math.sin(f * 1.9) * 2.5 : 0;
  const off = (1 - s) * 220;
  const tr = from === "left" ? `${-off}px 0` : from === "right" ? `${off}px 0` : `0 ${off}px`;
  const ink = RK.ink;
  return (
    <div style={{position: "absolute", left: x, top: y, width: 400 * scale, height: 520 * scale, translate: tr, opacity: Math.min(1, s * 2)}}>
      <svg viewBox="0 0 400 520" width={400 * scale} height={520 * scale} style={{overflow: "visible", scale: flip ? "-1 1" : undefined, translate: `${shake}px ${bob}px`}}>
        {/* «линии мрака» за спиной в отчаянии */}
        {mood === "despair" ? (
          <g stroke={ink} strokeWidth={4} opacity={0.35}>
            {[60, 90, 120, 280, 310, 340].map((xx, i) => (
              <line key={i} x1={xx} y1={40 + (i % 3) * 10} x2={xx} y2={150 + (i % 2) * 20} />
            ))}
          </g>
        ) : null}
        <g stroke={ink} strokeWidth={6} strokeLinejoin="round">
          {/* корпус: рубашка и жилет со светоотражающими полосами */}
          <path d="M30,520 C34,412 92,356 160,342 L240,342 C308,356 366,412 370,520 Z" fill={SUIT} />
          <path d="M162,342 L200,400 L238,342 Z" fill={RK.paper} />
          <path d="M74,430 L326,430 L330,452 L70,452 Z" fill={RK.lemon} strokeWidth={4} />
          <path d="M60,486 L340,486 L344,506 L56,506 Z" fill={RK.lemon} strokeWidth={4} />
          <path d="M168,342 L200,520 M232,342 L200,520" stroke={ink} strokeWidth={4} fill="none" />
          <path d="M172,300 L228,300 L234,350 L166,350 Z" fill={SKIN} />
          {/* бейдж на шнурке */}
          <path d="M184,352 L200,410 L216,352" fill="none" stroke={RK.red} strokeWidth={4} />
          <rect x={186} y={404} width={30} height={40} rx={4} fill={RK.paper} strokeWidth={4} />
        </g>
        <Head mood={mood} f={f} />
        {/* руки */}
        <g stroke={ink} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round">
          {arms === "crossed" ? (
            <g>
              <path d="M70,470 C90,420 150,404 250,420 L262,446 C170,440 120,452 96,492 Z" fill={SUIT} />
              <path d="M330,470 C310,420 250,404 150,420 L138,446 C230,440 280,452 304,492 Z" fill={SUIT} />
              <ellipse cx={262} cy={432} rx={20} ry={16} fill={SKIN} />
              <ellipse cx={138} cy={432} rx={20} ry={16} fill={SKIN} />
            </g>
          ) : null}
          {arms === "head" ? (
            <g>
              <path d="M44,430 C24,330 50,240 96,206 L116,230 C84,270 80,340 96,430 Z" fill={SUIT} />
              <path d="M356,430 C376,330 350,240 304,206 L284,230 C316,270 320,340 304,430 Z" fill={SUIT} />
              <ellipse cx={110} cy={196} rx={24} ry={30} fill={SKIN} />
              <ellipse cx={290} cy={196} rx={24} ry={30} fill={SKIN} />
            </g>
          ) : null}
          {arms === "thumb" ? (
            <g>
              <path d="M336,470 C356,410 350,340 318,300 L294,318 C318,356 320,410 306,470 Z" fill={SUIT} />
              <rect x={286} y={250} width={50} height={56} rx={14} fill={SKIN} />
              <rect x={300} y={208} width={20} height={52} rx={10} fill={SKIN} />
              <path d="M330,226 l10,-8 M334,244 l14,-2 M326,210 l4,-12" stroke={RK.lemon} strokeWidth={6} />
            </g>
          ) : null}
          {arms === "phone" ? (
            <g>
              <path d="M330,470 C320,430 300,410 262,404 L254,430 C284,440 296,452 304,492 Z" fill={SUIT} />
              <rect x={214} y={356} width={56} height={92} rx={10} fill={ink} />
              <rect x={221} y={366} width={42} height={70} rx={4} fill="#8EC5F0" stroke="none" />
              <ellipse cx={250} cy={430} rx={20} ry={16} fill={SKIN} />
            </g>
          ) : null}
        </g>
      </svg>
    </div>
  );
};

// лицо клиента в кружке (угол кадра): настроение — по ключам серии
export const ManagerInset: React.FC<{x: number; y: number; size?: number; mood: Mood; label?: string; moodKey: number; o?: number}> = ({x, y, size = 150, mood, label, moodKey, o = 1}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = f >= moodKey ? spring({frame: f - moodKey, fps, config: {damping: 9, stiffness: 260, mass: 0.6}}) : 1;
  if (o <= 0.01) return null;
  return (
    <div style={{position: "absolute", left: x, top: y, width: size, opacity: o}}>
      <div style={{width: size, height: size, borderRadius: 999, overflow: "hidden", background: mood === "despair" || mood === "tense" ? "#F6D7D2" : mood === "happy" ? "#FFF8B8" : RK.paper, border: `5px solid ${RK.ink}`, boxShadow: `6px 6px 0 ${RK.ink}`, scale: String(0.85 + 0.15 * pop), boxSizing: "border-box"}}>
        <svg viewBox="92 64 216 230" width={size - 10} height={size - 10} style={{display: "block"}}>
          <Head mood={mood} f={f} />
        </svg>
      </div>
      {label ? <div style={{marginTop: 8, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: "0.1em", color: RK.ink}}>{label.toUpperCase()}</div> : null}
    </div>
  );
};

// склонение «день / дня / дней»
export const daysWord = (n: number) => {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "день";
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return "дня";
  return "дней";
};

// таймер дедлайна: «ДО 11.11» + «N дней»; changedAt — кадр смены значения (переворот); state: normal | red | alarm (красный, мигает) |
// zero («00:00») | done (зелёный)
export const Countdown: React.FC<{label: string; days: number; changedAt: number; state: "normal" | "red" | "alarm" | "zero" | "done"; done: string; o?: number}> = ({label, days, changedAt, state, done, o = 1}) => {
  const f = useCurrentFrame();
  if (o <= 0.01) return null;
  const k = p01(f, changedAt, changedAt + 8, EO);
  const blink = state === "alarm" && Math.floor(f / 9) % 2 === 0;
  const col = state === "done" ? "#1F8A4C" : state === "normal" ? RK.ink : RK.red;
  const text = state === "done" ? done : state === "zero" ? "00:00" : `${days} ${daysWord(days)}`;
  return (
    <div
      style={{
        position: "absolute",
        right: 56,
        top: 250,
        minWidth: 250,
        padding: "8px 18px 10px",
        background: state === "done" ? "#E4F5E9" : RK.paper,
        border: `5px solid ${col}`,
        borderRadius: 18,
        boxShadow: `6px 6px 0 ${col}`,
        opacity: o * (blink ? 0.55 : 1),
        boxSizing: "border-box",
      }}
    >
      <div style={{display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: "0.12em", color: col}}>
        {/* часики */}
        <svg width={26} height={26} viewBox="0 0 26 26">
          <circle cx={13} cy={14} r={10} fill="none" stroke={col} strokeWidth={3} />
          <path d={`M13,14 L13,8 M13,14 L${(13 + Math.cos(f / 6) * 6).toFixed(1)},${(14 + Math.sin(f / 6) * 6).toFixed(1)}`} stroke={col} strokeWidth={3} strokeLinecap="round" />
        </svg>
        {label.toUpperCase()}
      </div>
      <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 52, letterSpacing: "-0.03em", lineHeight: 1.05, color: col, transform: `rotateX(${((1 - k) * 90).toFixed(1)}deg)`, transformOrigin: "50% 0%"}}>{text}</div>
    </div>
  );
};

// шкала очереди заказов: растёт и краснеет (или зелёная «✓» в развязке)
export const QueueMeter: React.FC<{x: number; y: number; h?: number; fill: number; ok?: boolean; label: string}> = ({x, y, h = 360, fill, ok, label}) => {
  const f = useCurrentFrame();
  const col = ok ? "#1F8A4C" : fill > 0.75 ? RK.red : fill > 0.45 ? "#E89A2C" : RK.blue;
  const over = !ok && fill > 0.92;
  return (
    <div style={{position: "absolute", left: x, top: y, width: 92}}>
      <div style={{position: "relative", width: 92, height: h, border: `5px solid ${RK.ink}`, borderRadius: 16, background: RK.paper, overflow: "hidden", boxShadow: `6px 6px 0 ${RK.ink}`, boxSizing: "border-box", translate: over ? `${(random(`q${f}`) - 0.5) * 6}px 0` : undefined}}>
        <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: `${(Math.min(1, fill) * 100).toFixed(1)}%`, background: col}} />
        {[0.25, 0.5, 0.75].map((k) => (
          <div key={k} style={{position: "absolute", left: 0, width: 26, top: `${(1 - k) * 100}%`, height: 4, background: RK.ink}} />
        ))}
        {ok ? <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: INTER, fontWeight: 800, fontSize: 56, color: "#fff"}}>✓</div> : null}
      </div>
      <div style={{marginTop: 10, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: "0.08em", color: RK.ink}}>{label.toUpperCase()}</div>
      {over ? <div style={{position: "absolute", left: 18, top: -86, fontFamily: INTER, fontWeight: 800, fontSize: 80, color: RK.red, WebkitTextStroke: `4px ${RK.ink}`, paintOrder: "stroke fill"}}>!</div> : null}
    </div>
  );
};

// стопка коробок (2D): n коробок появляются по очереди до момента t (сек от начала сцены)
export const BoxPile: React.FC<{x: number; y: number; n: number; shown: number; cols?: number; w?: number}> = ({x, y, n, shown, cols = 4, w = 92}) => (
  <div style={{position: "absolute", left: x, top: y}}>
    {Array.from({length: n}, (_, i) => {
      const k = Math.max(0, Math.min(1, shown - i));
      if (k <= 0) return null;
      const c = i % cols;
      const r = Math.floor(i / cols);
      const off = r % 2 ? w * 0.5 : 0;
      return (
        <div key={i} style={{position: "absolute", left: c * w + off - (r % 2 ? 0 : 0), top: -(r + 1) * (w * 0.72) + (1 - k) * -120, width: w - 6, height: w * 0.72 - 6, background: "#BE9A62", border: `4px solid ${RK.ink}`, borderRadius: 6, opacity: k, boxSizing: "border-box"}}>
          <div style={{position: "absolute", left: "38%", top: 0, bottom: 0, width: "24%", background: "rgba(38,38,38,0.85)"}} />
          <div style={{position: "absolute", right: 8, bottom: 8, width: 18, height: 12, background: RK.lemon}} />
        </div>
      );
    })}
  </div>
);

// лампочка-озарение 💡
export const Bulb: React.FC<{x: number; y: number; at: number; size?: number}> = ({x, y, at, size = 120}) => {
  const f = useCurrentFrame();
  const s = usePop(at, 9);
  if (s <= 0) return null;
  const glow = 0.6 + 0.4 * Math.sin((f - at) / 4);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{position: "absolute", left: x - size / 2, top: y - size, overflow: "visible", scale: String(0.3 + 0.7 * s), transformOrigin: "50% 100%"}}>
      <g stroke={RK.ink} strokeWidth={5} strokeLinecap="round">
        {[-60, -30, 0, 30, 60].map((a) => (
          <line key={a} x1={50 + Math.sin((a * Math.PI) / 180) * 40} y1={44 - Math.cos((a * Math.PI) / 180) * 40} x2={50 + Math.sin((a * Math.PI) / 180) * (50 + glow * 6)} y2={44 - Math.cos((a * Math.PI) / 180) * (50 + glow * 6)} />
        ))}
      </g>
      <path d="M50 14 C30 14 22 30 24 42 C26 54 36 58 38 70 L62 70 C64 58 74 54 76 42 C78 30 70 14 50 14 Z" fill={RK.lemon} stroke={RK.ink} strokeWidth={5} strokeLinejoin="round" />
      <rect x={38} y={72} width={24} height={14} rx={3} fill={RK.fog} stroke={RK.ink} strokeWidth={5} />
      <path d="M44 56 L50 44 L56 56" fill="none" stroke={RK.ink} strokeWidth={4} strokeLinejoin="round" />
    </svg>
  );
};

// «?» манхуа над героем
export const Huh: React.FC<{x: number; y: number; at: number; size?: number}> = ({x, y, at, size = 130}) => {
  const f = useCurrentFrame();
  const s = usePop(at, 8);
  if (s <= 0) return null;
  const wob = Math.sin((f - at) / 5) * 6;
  return (
    <div style={{position: "absolute", left: x, top: y - size, translate: "-50% 0", fontFamily: INTER, fontWeight: 800, fontSize: size, lineHeight: 1, color: RK.lemon, WebkitTextStroke: `6px ${RK.ink}`, paintOrder: "stroke fill", rotate: `${wob}deg`, scale: String(0.3 + 0.7 * s), transformOrigin: "50% 100%"}}>?</div>
  );
};

// значок ночи / утра + подпись
export const DayMark: React.FC<{kind: "night" | "morning"; label: string; at: number; out?: number}> = ({kind, label, at, out}) => {
  const f = useCurrentFrame();
  const s = usePop(at, 12);
  if (s <= 0) return null;
  const gone = out !== undefined ? p01(f, out - 8, out) : 0;
  const night = kind === "night";
  return (
    <div style={{position: "absolute", left: 90, top: 430, display: "flex", alignItems: "center", gap: 14, padding: "8px 20px 8px 10px", borderRadius: 999, background: night ? "#1F2A5A" : RK.paper, border: `4px solid ${RK.ink}`, opacity: Math.min(1, s * 2) * (1 - gone), scale: String(0.7 + 0.3 * s), transformOrigin: "0 50%"}}>
      <svg width={48} height={48} viewBox="0 0 48 48">
        {night ? (
          <path d="M30 6 A18 18 0 1 0 42 34 A14 14 0 1 1 30 6 Z" fill={RK.lemon} stroke={RK.ink} strokeWidth={3} />
        ) : (
          <g>
            <circle cx={24} cy={24} r={10} fill={RK.lemon} stroke={RK.ink} strokeWidth={3} />
            {Array.from({length: 8}, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return <line key={i} x1={24 + Math.cos(a) * 15} y1={24 + Math.sin(a) * 15} x2={24 + Math.cos(a) * 21} y2={24 + Math.sin(a) * 21} stroke={RK.ink} strokeWidth={3} strokeLinecap="round" />;
            })}
          </g>
        )}
      </svg>
      <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 28, letterSpacing: "0.14em", color: night ? RK.paper : RK.ink}}>{label.toUpperCase()}</span>
    </div>
  );
};

// силуэт рабочего (толкает стеллаж), чернилами; x, y — ступни
export const WorkerSil: React.FC<{x: number; y: number; h?: number; push?: number; flip?: boolean; o?: number}> = ({x, y, h = 150, push = 0, flip, o = 1}) => {
  const f = useCurrentFrame();
  const step = Math.sin(f / 4 + push) * 8;
  return (
    <svg width={h * 0.7} height={h} viewBox="0 0 70 100" style={{position: "absolute", left: x - h * 0.35, top: y - h, opacity: o, scale: flip ? "-1 1" : undefined}}>
      <g fill="#10131F">
        <circle cx={44} cy={14} r={9} />
        <path d="M30 26 L52 28 L58 56 L36 60 Z" />
        <path d={`M38 58 L${30 + step * 0.4} 98 L${38 + step * 0.4} 98 L46 62 Z`} />
        <path d={`M48 58 L${54 - step * 0.4} 98 L${62 - step * 0.4} 98 L56 58 Z`} />
        <path d="M50 32 L68 40 L66 46 L48 40 Z" />
      </g>
      <path d="M34 34 L56 37" stroke={RK.lemon} strokeWidth={3} />
    </svg>
  );
};

// тонировка кадра поверх сцены: red — кризис, warm — развязка, night — ночь
export const Tint: React.FC<{kind: "red" | "warm" | "night"; o: number}> = ({kind, o}) => {
  if (o <= 0.01) return null;
  const bg = kind === "red" ? "rgba(229,56,59,0.16)" : kind === "warm" ? "rgba(255,246,93,0.10)" : "rgba(16,24,64,0.62)";
  return (
    <AbsoluteFill style={{pointerEvents: "none", opacity: o}}>
      <AbsoluteFill style={{background: bg, mixBlendMode: kind === "night" ? "multiply" : "normal"}} />
      {kind === "red" ? <AbsoluteFill style={{background: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 45%, rgba(120,10,10,0.35) 100%)"}} /> : null}
    </AbsoluteFill>
  );
};

// заставка «4 дня назад…»: чернильный экран, текст печатается
export const FlashCard: React.FC<{text: string}> = ({text}) => {
  const f = useCurrentFrame();
  const n = Math.min(text.length, Math.floor(f / 1.6) + 1);
  return (
    <AbsoluteFill style={{background: "#141416", alignItems: "center", justifyContent: "center"}}>
      <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 92, letterSpacing: "-0.03em", color: RK.paper}}>
        {text.slice(0, n)}
        <span style={{opacity: Math.floor(f / 8) % 2 ? 0 : 1, color: RK.lemon}}>▍</span>
      </div>
    </AbsoluteFill>
  );
};

// телефон Ави с уведомлением SOS и картинкой-намёком (человек и кобот у одной линии, силуэт героя с «?»)
// картинки-намёки следующей серии в телефоне Ави: роборука над тремя разными деталями; силуэт манипулятора с искрами сварки
const HINT_SVG = {display: "block", marginTop: 12, background: "#E9E5DD", borderRadius: 14, border: `3px solid ${RK.ink}`} as const;
const HintGripper: React.FC = () => (
  <svg viewBox="0 0 320 210" width="100%" style={HINT_SVG}>
    <rect x={0} y={160} width={320} height={50} fill="#D9D3C8" />
    <rect x={40} y={128} width={44} height={32} rx={4} fill="#BE9A62" stroke={RK.ink} strokeWidth={2} />
    <ellipse cx={160} cy={146} rx={24} ry={14} fill="#DADDE2" stroke={RK.ink} strokeWidth={2} />
    <path d="M222 160 Q236 120 262 136 Q282 150 268 160 Z" fill="#F2C14E" stroke={RK.ink} strokeWidth={2} />
    <g fill={RK.ink}>
      <rect x={150} y={0} width={20} height={44} />
      <rect x={136} y={40} width={48} height={18} rx={4} />
      <rect x={136} y={56} width={10} height={30} rx={3} />
      <rect x={174} y={56} width={10} height={30} rx={3} />
    </g>
    <text x={204} y={70} fontFamily={INTER} fontWeight={800} fontSize={58} fill={RK.lemon} stroke={RK.ink} strokeWidth={4} paintOrder="stroke fill">?</text>
  </svg>
);
const HintWeld: React.FC = () => (
  <svg viewBox="0 0 320 210" width="100%" style={HINT_SVG}>
    <rect x={0} y={160} width={320} height={50} fill="#D9D3C8" />
    <rect x={150} y={140} width={150} height={20} fill={RK.ink} />
    <g fill={RK.ink}>
      <rect x={40} y={130} width={60} height={30} rx={6} />
      <path d="M62 132 L86 60 L102 64 L80 136 Z" />
      <path d="M92 62 L170 96 L164 108 L86 76 Z" />
      <rect x={160} y={98} width={14} height={34} rx={3} />
    </g>
    {[[-30, -18], [-14, -30], [8, -26], [24, -12], [-26, 4], [20, 6]].map(([dx, dy], i) => (
      <line key={i} x1={168} y1={136} x2={168 + dx} y2={136 + dy} stroke="#F2A93B" strokeWidth={4} strokeLinecap="round" />
    ))}
    <circle cx={168} cy={136} r={8} fill="#FFF65D" />
    <text x={232} y={80} fontFamily={INTER} fontWeight={800} fontSize={58} fill={RK.lemon} stroke={RK.ink} strokeWidth={4} paintOrder="stroke fill">?</text>
  </svg>
);
export const SosPhone: React.FC<{x: number; y: number; at: number; title: string; city: string; hint?: "cobot" | "gripper" | "weld"}> = ({x, y, at, title, city, hint = "cobot"}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const s = spring({frame: f - at, fps, config: {damping: 13, stiffness: 160}});
  const buzz = f - at < 30 ? Math.sin((f - at) * 2.6) * 7 * (1 - (f - at) / 30) : 0;
  const card = p01(f, at + 10, at + 20, EO);
  return (
    <div style={{position: "absolute", left: x, top: y, width: 420, height: 760, translate: `${buzz}px ${(1 - s) * 900}px`, rotate: `${-4 + buzz * 0.3}deg`}}>
      <div style={{position: "absolute", inset: 0, background: RK.ink, borderRadius: 64, boxShadow: `14px 14px 0 rgba(38,38,38,0.25)`}} />
      <div style={{position: "absolute", left: 18, top: 18, right: 18, bottom: 18, background: RK.paper2, borderRadius: 48, overflow: "hidden"}}>
        <div style={{position: "absolute", left: "50%", top: 14, width: 110, height: 28, translate: "-50% 0", background: RK.ink, borderRadius: 20}} />
        {/* уведомление */}
        <div style={{position: "absolute", left: 18, right: 18, top: 70, padding: "16px 18px", background: RK.paper, border: `4px solid ${RK.red}`, borderRadius: 24, boxShadow: `5px 5px 0 ${RK.red}`, opacity: card, translate: `0 ${(1 - card) * -40}px`}}>
          <div style={{display: "flex", alignItems: "center", gap: 12}}>
            <span style={{width: 44, height: 44, borderRadius: 12, background: RK.red, color: RK.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: INTER, fontWeight: 800, fontSize: 30}}>!</span>
            <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 40, letterSpacing: "-0.02em", color: RK.red}}>{title}</span>
          </div>
          <div style={{fontFamily: MONO_CJK, fontWeight: 700, fontSize: 24, color: RK.ink, marginTop: 6, letterSpacing: "0.06em"}}>{city}</div>
          {/* картинка-намёк: человек и кобот у одной линии */}
          {hint === "gripper" ? <HintGripper /> : hint === "weld" ? <HintWeld /> : (
          <svg viewBox="0 0 320 210" width="100%" style={{display: "block", marginTop: 12, background: "#E9E5DD", borderRadius: 14, border: `3px solid ${RK.ink}`}}>
            <rect x={0} y={150} width={320} height={60} fill="#D9D3C8" />
            <rect x={20} y={118} width={280} height={18} rx={4} fill={RK.ink} />
            <rect x={30} y={136} width={10} height={40} fill={RK.ink} />
            <rect x={280} y={136} width={10} height={40} fill={RK.ink} />
            {[60, 120, 180].map((bx) => (
              <rect key={bx} x={bx} y={100} width={34} height={18} rx={2} fill="#BE9A62" stroke={RK.ink} strokeWidth={2} />
            ))}
            {/* человек */}
            <g fill={RK.ink}>
              <circle cx={78} cy={42} r={14} />
              <path d="M58 60 L98 60 L104 118 L52 118 Z" />
              <path d="M96 66 L130 92 L124 100 L92 78 Z" />
            </g>
            {/* кобот-силуэт с «?» */}
            <g fill={RK.ink}>
              <rect x={224} y={92} width={36} height={26} rx={6} />
              <path d="M236 92 L244 52 L254 54 L248 94 Z" />
              <path d="M244 56 L206 40 L202 50 L240 66 Z" />
              <circle cx={244} cy={56} r={8} fill={RK.blue} />
              <rect x={194} y={40} width={14} height={20} rx={3} />
            </g>
            <text x={278} y={54} fontFamily={INTER} fontWeight={800} fontSize={58} fill={RK.lemon} stroke={RK.ink} strokeWidth={4} paintOrder="stroke fill">?</text>
          </svg>)}
        </div>
      </div>
    </div>
  );
};

// плавная прозрачность [в, вне] для оверлеев
export const fadeWin = (f: number, a: number, b: number, d = 8) => Math.min(interpolate(f, [a, a + d], [0, 1], CL), interpolate(f, [b - d, b], [1, 0], CL));
export {EIO};
