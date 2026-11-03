// Скептик / Директор — чернильный силуэт по пояс с манга-эмоциями (манхуа-ролики про сайты Aura и GTT, 03.11.2026).
// Рисуется SVG: голова, причёска «ёжиком», плечи пиджака, воротник, по желанию галстук; глаза и рот — белые на силуэте.
// emo: neutral · angry (жилка злости + брови домиком) · shock (круглые глаза, линии ужаса) · sweat (капля пота) ·
// calm (глаза-дуги, «ладно, убедили») · wow (глаза-звёзды). talk — рот открыт и «дышит» каждые 4 кадра.
import React from "react";
import {useCurrentFrame} from "remotion";

export type Emo = "neutral" | "angry" | "shock" | "sweat" | "calm" | "wow";

export const Skeptic: React.FC<{
  x: number;
  y: number;
  scale?: number;
  emo?: Emo;
  talk?: boolean;
  tie?: boolean;
  fill?: string;
  rim?: string;
  accent?: string;
  flip?: boolean;
  glasses?: boolean;
  phone?: boolean;
}> = ({x, y, scale = 1, emo = "neutral", talk = false, tie = false, fill = "#15151D", rim = "#fff", accent = "#E8341C", flip = false, glasses = false, phone = false}) => {
  const f = useCurrentFrame();
  const open = talk && Math.floor(f / 4) % 2 === 0;
  const W = 420;
  const H = 560;
  // лёгкое дыхание и дрожь от злости
  const bob = Math.sin(f / 9) * 3;
  const jit = emo === "angry" ? Math.sin(f * 1.7) * 2.2 : 0;
  const eyeY = 214;
  const eyes = () => {
    if (glasses) {
      return (
        <g>
          <rect x={136} y={eyeY - 26} width={64} height={40} rx={10} fill="#0b0b10" stroke={rim} strokeWidth={5} />
          <rect x={218} y={eyeY - 26} width={64} height={40} rx={10} fill="#0b0b10" stroke={rim} strokeWidth={5} />
          <line x1={200} y1={eyeY - 10} x2={218} y2={eyeY - 10} stroke={rim} strokeWidth={5} />
          <line x1={146} y1={eyeY - 18} x2={164} y2={eyeY - 18} stroke="#fff" strokeWidth={4} opacity={0.6} />
          <line x1={228} y1={eyeY - 18} x2={246} y2={eyeY - 18} stroke="#fff" strokeWidth={4} opacity={0.6} />
        </g>
      );
    }
    if (emo === "shock") {
      return (
        <g fill="#fff">
          <circle cx={170} cy={eyeY} r={22} />
          <circle cx={250} cy={eyeY} r={22} />
          <circle cx={170} cy={eyeY} r={5} fill={fill} />
          <circle cx={250} cy={eyeY} r={5} fill={fill} />
        </g>
      );
    }
    if (emo === "calm") {
      return (
        <g fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round">
          <path d={`M148,${eyeY} Q170,${eyeY + 16} 192,${eyeY}`} />
          <path d={`M228,${eyeY} Q250,${eyeY + 16} 272,${eyeY}`} />
        </g>
      );
    }
    if (emo === "wow") {
      const star = (cx: number) => {
        const pts: string[] = [];
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + f * 0.08;
          const r = i % 2 ? 9 : 24;
          pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(eyeY + Math.sin(a) * r).toFixed(1)}`);
        }
        return <polygon points={pts.join(" ")} fill={accent} stroke="#fff" strokeWidth={3} />;
      };
      return (
        <g>
          {star(170)}
          {star(250)}
        </g>
      );
    }
    // neutral / angry / sweat: узкие манга-глаза, у злости — брови вниз к переносице
    const tilt = emo === "angry" ? 12 : emo === "sweat" ? -8 : 0;
    return (
      <g>
        <polygon points={`146,${eyeY - 6 + tilt * 0.3} 194,${eyeY - 6 - tilt * 0.6} 192,${eyeY + 10} 150,${eyeY + 10}`} fill="#fff" />
        <polygon points={`226,${eyeY - 6 - tilt * 0.6} 274,${eyeY - 6 + tilt * 0.3} 270,${eyeY + 10} 228,${eyeY + 10}`} fill="#fff" />
        <circle cx={176} cy={eyeY + 3} r={5} fill={fill} />
        <circle cx={244} cy={eyeY + 3} r={5} fill={fill} />
        <path d={`M140,${eyeY - 26 + tilt * 0.4} L198,${eyeY - 20 - tilt}`} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
        <path d={`M222,${eyeY - 20 - tilt} L280,${eyeY - 26 + tilt * 0.4}`} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
      </g>
    );
  };
  const mouth = () => {
    if (open) {
      return <path d="M176,292 Q210,252 244,292 Q210,322 176,292 Z" fill="#fff" stroke="#fff" strokeWidth={3} />;
    }
    if (emo === "calm") return <path d="M182,286 Q210,300 238,284" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" />;
    if (emo === "shock") return <ellipse cx={210} cy={294} rx={16} ry={20} fill="#fff" />;
    if (emo === "wow") return <path d="M178,280 Q210,318 242,280 Z" fill="#fff" />;
    return <path d="M184,292 L236,288" stroke="#fff" strokeWidth={6} strokeLinecap="round" />;
  };
  return (
    <div style={{position: "absolute", left: x, top: y, width: W * scale, height: H * scale, pointerEvents: "none", translate: `${jit}px ${bob}px`}}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W * scale} height={H * scale} style={{overflow: "visible", scale: flip ? "-1 1" : undefined}}>
        <g stroke={rim} strokeWidth={6} strokeLinejoin="round">
          {/* плечи и пиджак */}
          <path d="M20,560 C24,430 80,372 158,352 L262,352 C340,372 396,430 400,560 Z" fill={fill} />
          {/* шея */}
          <path d="M172,318 L248,318 L256,366 L164,366 Z" fill={fill} />
          {/* голова */}
          <path d="M110,190 C108,104 160,62 214,62 C272,62 316,104 312,190 C312,262 274,326 210,330 C148,326 110,262 110,190 Z" fill={fill} />
          {/* уши */}
          <ellipse cx={108} cy={212} rx={16} ry={30} fill={fill} />
          <ellipse cx={314} cy={212} rx={16} ry={30} fill={fill} />
          {/* причёска: густая, зачёсана набок (без «короны» из шипов) */}
          <path d="M100,184 C92,120 128,70 176,62 C190,44 222,40 240,54 C270,46 304,66 312,96 C330,114 330,150 316,186 C300,150 270,124 232,120 C204,138 150,140 126,128 C112,144 104,164 100,184 Z" fill={fill} />
        </g>
        {/* лацканы и рубашка */}
        <path d="M168,366 L210,446 L252,366 L236,356 L210,404 L184,356 Z" fill="#fff" opacity={0.95} />
        <path d="M150,360 L210,470 L176,560 L120,560 Z" fill={fill} stroke={rim} strokeWidth={4} />
        <path d="M270,360 L210,470 L244,560 L300,560 Z" fill={fill} stroke={rim} strokeWidth={4} />
        {tie ? <path d="M198,372 L222,372 L230,392 L222,470 L210,488 L198,470 L190,392 Z" fill={accent} stroke={rim} strokeWidth={3} /> : null}
        {eyes()}
        {mouth()}
        {emo === "angry" ? (
          // жилка злости 💢 у виска
          <g stroke={accent} strokeWidth={9} strokeLinecap="round" fill="none" transform={`translate(288 104) scale(${1 + Math.abs(Math.sin(f / 3)) * 0.18})`}>
            <path d="M-26,-8 Q-8,-8 -8,-26" />
            <path d="M8,-26 Q8,-8 26,-8" />
            <path d="M26,8 Q8,8 8,26" />
            <path d="M-8,26 Q-8,8 -26,8" />
          </g>
        ) : null}
        {emo === "sweat" || emo === "shock" ? (
          // капля пота
          <path d={`M322,${120 + ((f * 2) % 40)} C306,${150 + ((f * 2) % 40)} 312,${176 + ((f * 2) % 40)} 330,${176 + ((f * 2) % 40)} C348,${176 + ((f * 2) % 40)} 350,${150 + ((f * 2) % 40)} 322,${120 + ((f * 2) % 40)} Z`} fill="#7DD3FC" stroke="#fff" strokeWidth={4} />
        ) : null}
        {emo === "shock" ? (
          // вертикальные линии ужаса на лбу
          <g stroke="#fff" strokeWidth={5} opacity={0.85}>
            {[150, 172, 194, 216, 238, 260].map((xx) => (
              <line key={xx} x1={xx} y1={118} x2={xx} y2={168} />
            ))}
          </g>
        ) : null}
        {phone ? (
          // телефон в руке у груди (хук GTT: «листает телефон»)
          <g transform="translate(232 410) rotate(-12)">
            <rect x={0} y={0} width={86} height={150} rx={14} fill="#0b0b10" stroke={rim} strokeWidth={5} />
            <rect x={8} y={14} width={70} height={118} rx={6} fill="#7DD3FC" opacity={0.85} />
            <path d="M-30,150 C-10,110 20,120 30,150 L40,190 L-34,190 Z" fill={fill} stroke={rim} strokeWidth={4} />
          </g>
        ) : null}
      </svg>
    </div>
  );
};
