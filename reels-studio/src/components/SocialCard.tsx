// Карточка канала в соцсети и стрелка «ссылка выше» — для Stories, где спикер рассказывает о своих каналах
// (решение пользователя 14.10.2026: ролики ostapdotcenko «про соцсети» — «ссылочка будет выше», «переходите, подписывайтесь»).
// Стиль берётся из бренда: у od — бумага, рамка 3 px и жёсткая тень чернилами, маркер под названием, красный моно-кикер,
// чернильная квадратная кнопка; у GTT и Aura — белая карточка со скруглением.
import React from "react";
import {Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {useBrand} from "../brand";

export type Network = "telegram" | "youtube" | "vk" | "instagram" | "site";

const NET: Record<Network, {label: string; color: string; icon?: string}> = {
  telegram: {label: "Telegram-канал", color: "#26A5E4", icon: "source-videos/логотипы/общие/telegram.svg"},
  youtube: {label: "YouTube-канал", color: "#FF0000", icon: "source-videos/логотипы/общие/youtube.svg"},
  vk: {label: "ВКонтакте", color: "#0077FF", icon: "source-videos/логотипы/общие/vk.svg"},
  instagram: {label: "Instagram", color: "#E1306C", icon: "source-videos/логотипы/техгиганты/instagram.svg"},
  site: {label: "Сайт", color: "#191922"},
};

export const SocialCard: React.FC<{
  network: Network;
  name: string;
  handle?: string;
  note?: string;
  logo?: string;
  button?: string;
  pressAt?: number; // секунды от появления карточки: кнопка «нажимается»
  until: number; // длина показа, с
}> = ({network, name, handle, note, logo, button = "Подписаться", pressAt, until}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const od = B.id === "od";
  const n = NET[network];
  const s = spring({frame, fps, config: {damping: 13, stiffness: 150, mass: 0.8}});
  const out = interpolate(frame, [until * fps - 8, until * fps], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const mark = interpolate(frame, [10, 22], [0, 100], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1)});
  const btn = spring({frame: frame - 16, fps, config: {damping: 11, stiffness: 180}});
  const pf = pressAt === undefined ? -1 : frame - pressAt * fps;
  const press = pf < 0 ? 0 : interpolate(pf, [0, 3, 9], [0, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const pressed = pf >= 3;
  const ink = od ? "#191922" : "#17171D";
  return (
    <div
      style={{
        position: "relative",
        width: 660,
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "26px 30px",
        background: od ? "#F7F4EC" : "#FFFFFF",
        border: od ? `3px solid ${ink}` : undefined,
        borderRadius: od ? 0 : 28,
        boxShadow: od ? `10px 10px 0 ${ink}` : "0 18px 44px rgba(0,0,0,0.3)",
        opacity: s * out,
        translate: `${(1 - s) * -160}px 0px`,
        rotate: `${(1 - s) * -4}deg`,
        transformOrigin: "left center",
      }}
    >
      {/* значок сети; если есть логотип канала — он крупно, значок сети маленьким в углу */}
      <div style={{position: "relative", width: 132, height: 132, flexShrink: 0}}>
        <div
          style={{
            width: 132,
            height: 132,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: logo ? "#FFFFFF" : n.color,
            border: od ? `3px solid ${ink}` : undefined,
            borderRadius: od ? 0 : 30,
            overflow: "hidden",
          }}
        >
          {logo ? (
            <Img src={staticFile(logo)} style={{width: "78%", height: "78%", objectFit: "contain"}} />
          ) : n.icon ? (
            <div style={{width: 92, height: 92, borderRadius: 46, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center"}}>
              <Img src={staticFile(n.icon)} style={{width: 92, height: 92}} />
            </div>
          ) : null}
        </div>
        {logo && n.icon ? (
          <div style={{position: "absolute", right: -16, bottom: -16, width: 58, height: 58, borderRadius: 29, background: "#FFFFFF", border: `3px solid ${ink}`, display: "flex", alignItems: "center", justifyContent: "center", scale: String(btn)}}>
            <Img src={staticFile(n.icon)} style={{width: 46, height: 46}} />
          </div>
        ) : null}
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: 1}}>
        <div style={{fontFamily: B.monoFont, fontSize: 24, letterSpacing: "0.14em", textTransform: "uppercase", color: od ? "#FF4A1F" : n.color}}>
          {n.label}
        </div>
        <div style={{fontFamily: B.captionFont, fontWeight: 700, fontSize: name.length > 16 ? 38 : 46, lineHeight: 1.08, color: ink, letterSpacing: "-0.01em"}}>
          <span
            style={{
              backgroundImage: od ? `linear-gradient(${B.accent}, ${B.accent})` : undefined,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${mark}% 44%`,
              backgroundPosition: "0% 88%",
            }}
          >
            {name}
          </span>
        </div>
        {handle ? <div style={{fontFamily: B.monoFont, fontSize: 28, color: od ? "#6E6D66" : "#6B6B76"}}>{handle}</div> : null}
        {note ? <div style={{fontFamily: B.bodyFont, fontWeight: 600, fontSize: 28, color: ink}}>{note}</div> : null}
      </div>
      {/* кнопка: выскакивает, по pressAt «нажимается» и меняется на «✓ Вы подписаны» */}
      <div
        style={{
          position: "absolute",
          right: 22,
          bottom: -34,
          padding: "14px 22px",
          background: pressed ? (od ? B.accent : "#16A34A") : od ? ink : n.color,
          color: pressed && od ? ink : "#FFFFFF",
          border: od ? `3px solid ${ink}` : undefined,
          borderRadius: od ? 0 : 999,
          fontFamily: od ? B.monoFont : B.bodyFont,
          fontWeight: od ? 500 : 700,
          fontSize: 26,
          boxShadow: od ? `${6 - 5 * press}px ${6 - 5 * press}px 0 ${ink}` : "0 8px 20px rgba(0,0,0,0.25)",
          translate: `${5 * press}px ${5 * press}px`,
          scale: String(0.6 + 0.4 * btn),
          opacity: btn,
          whiteSpace: "nowrap",
        }}
      >
        {pressed ? "✓ Вы подписаны" : button}
      </div>
    </div>
  );
};

// Большая стрелка вверх «ссылка выше»: выскакивает, покачивается вверх-вниз, подпись на маркере.
export const LinkArrow: React.FC<{text: string; until: number}> = ({text, until}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const B = useBrand();
  const od = B.id === "od";
  const s = spring({frame, fps, config: {damping: 10, stiffness: 170, mass: 0.7}});
  const out = interpolate(frame, [until * fps - 8, until * fps], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const bob = Math.sin((frame / fps) * Math.PI * 2.4) * 14;
  const ink = od ? "#191922" : "#17171D";
  const fill = od ? B.accent : "#FFFFFF";
  return (
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: s * out, scale: String(0.5 + 0.5 * s)}}>
      <svg width={150} height={190} viewBox="0 0 150 190" style={{translate: `0px ${bob * s}px`, overflow: "visible"}}>
        {od ? <path d="M85 12 L148 86 L111 86 L111 188 L59 188 L59 86 L22 86 Z" fill={ink} /> : null}
        <path d="M75 2 L138 76 L101 76 L101 178 L49 178 L49 76 L12 76 Z" fill={fill} stroke={ink} strokeWidth={6} strokeLinejoin="miter" />
      </svg>
      <div
        style={{
          fontFamily: B.captionFont,
          fontWeight: 700,
          fontSize: 40,
          color: ink,
          background: fill,
          padding: "10px 20px",
          border: od ? `3px solid ${ink}` : undefined,
          borderRadius: od ? 0 : 16,
          boxShadow: od ? `8px 8px 0 ${ink}` : "0 10px 26px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};
